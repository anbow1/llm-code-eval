"""Tool-calling suite (--suite tools): 7 tasks against a small fake shop backend.

The model gets OpenAI-style `tools`; run_eval.py executes every call it makes against the Env below
(no network, no real side effects) and sends the result back, until the model answers without
calling a tool or runs out of turns. Each task's grade() checks which tools were called, with what
arguments, and what the final answer says.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

SYSTEM = """You are a customer-support assistant for an online shop. You can call tools to look things up and to act.
Use a tool only when you need data or need to change something; never guess data a tool can give you.
When you have what you need, answer the user briefly in plain text."""

# ---------------------------------------------------------------- fake data
CUSTOMERS = [
    {"id": 207, "name": "Jan Nowak", "email": "jan.nowak@example.com", "city": "Poznań"},
    {"id": 314, "name": "Anna Kowalska", "email": "anna.kowalska@example.com", "city": "Kraków"},
    {"id": 512, "name": "Jan Nowakowski", "email": "jan.nowakowski@example.com", "city": "Gdańsk"},
    {"id": 618, "name": "Ewa Wiśniewska", "email": "ewa.w@example.com", "city": "Wrocław"},
]
ORDERS = [
    {"id": "A-1001", "customer_id": 207, "date": "2026-08-14", "total": 129.99, "status": "delivered"},
    {"id": "A-1002", "customer_id": 314, "date": "2026-09-30", "total": 74.50, "status": "shipped"},
    {"id": "A-1003", "customer_id": 618, "date": "2026-10-03", "total": 212.00, "status": "shipped"},
    {"id": "A-1038", "customer_id": 207, "date": "2026-09-20", "total": 59.00, "status": "delivered"},
    {"id": "A-1042", "customer_id": 207, "date": "2026-10-02", "total": 349.50, "status": "delivered"},
    {"id": "A-1051", "customer_id": 512, "date": "2026-10-05", "total": 89.00, "status": "delivered"},
]
SHIPPING = {
    "A-1001": "delivered on 2026-08-16",
    "A-1002": "in transit, at the Warsaw sorting hub",
    "A-1003": "waiting for pickup in parcel locker KRA-12",
    "A-1038": "delivered on 2026-09-22",
    "A-1042": "delivered on 2026-10-04",
    "A-1051": "delivered on 2026-10-07",
}

# ---------------------------------------------------------------- tool schemas
def _fn(name, desc, props, required=()):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": props, "required": list(required), "additionalProperties": False}}}


SHOP_TOOLS = [
    _fn("search_customers", "Find customers by (part of) name or by exact email address.",
        {"query": {"type": "string", "description": "name fragment or email"}}, ["query"]),
    _fn("get_customer", "Get one customer by id.", {"customer_id": {"type": "integer"}}, ["customer_id"]),
    _fn("search_orders", "List the orders of a customer, newest first.",
        {"customer_id": {"type": "integer"},
         "status": {"type": "string", "enum": ["shipped", "delivered", "cancelled"]}}, ["customer_id"]),
    _fn("get_order", "Get one order by its id, e.g. A-1001.", {"order_id": {"type": "string"}}, ["order_id"]),
    _fn("get_shipping_status", "Current delivery status of an order.",
        {"order_id": {"type": "string", "pattern": "^A-[0-9]{4}$"}}, ["order_id"]),
    _fn("refund_order", "Refund an order (fully or partly). Irreversible.",
        {"order_id": {"type": "string", "pattern": "^A-[0-9]{4}$"},
         "amount": {"type": "number", "description": "amount in PLN"},
         "reason": {"type": "string", "enum": ["damaged", "not_delivered", "wrong_item", "other"]}},
        ["order_id", "amount", "reason"]),
    _fn("create_ticket", "Open a support ticket.",
        {"title": {"type": "string", "maxLength": 80},
         "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
         "due_date": {"type": "string", "description": "YYYY-MM-DD", "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"},
         "customer_id": {"type": "integer"},
         "tags": {"type": "array", "items": {"type": "string", "enum": [
             "mobile", "web", "payments", "shipping", "account", "returns"]}}},
        ["title", "priority", "customer_id"]),
    _fn("send_email", "Send an email to a customer.",
        {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}},
        ["to", "subject", "body"]),
    _fn("get_exchange_rate", "Exchange rate between two currencies (ISO 4217 codes, e.g. EUR, PLN).",
        {"base": {"type": "string", "pattern": "^[A-Z]{3}$"}, "quote": {"type": "string", "pattern": "^[A-Z]{3}$"}},
        ["base", "quote"]),
    _fn("list_products", "List products, optionally in one category.",
        {"category": {"type": "string", "enum": ["phones", "laptops", "accessories"]}}),
]
WRITE_TOOLS = {"refund_order", "create_ticket", "send_email"}


def validate(schema, value, path="$"):
    """Tiny JSON-schema check (the subset used above). Returns a list of problems."""
    errs = []
    t = schema.get("type")
    types = {"object": dict, "string": str, "array": list, "boolean": bool}
    if t == "integer":
        if not (isinstance(value, int) and not isinstance(value, bool)):
            return [f"{path}: expected integer, got {value!r}"]
    elif t == "number":
        if not (isinstance(value, (int, float)) and not isinstance(value, bool)):
            return [f"{path}: expected number, got {value!r}"]
    elif t in types and not isinstance(value, types[t]):
        return [f"{path}: expected {t}, got {value!r}"]
    if "enum" in schema and value not in schema["enum"]:
        errs.append(f"{path}: {value!r} not in {schema['enum']}")
    if "pattern" in schema and isinstance(value, str) and not re.search(schema["pattern"], value):
        errs.append(f"{path}: {value!r} does not match {schema['pattern']}")
    if "maxLength" in schema and isinstance(value, str) and len(value) > schema["maxLength"]:
        errs.append(f"{path}: longer than {schema['maxLength']}")
    if t == "object":
        props = schema.get("properties", {})
        for k in schema.get("required", []):
            if k not in value:
                errs.append(f"{path}: missing {k}")
        for k, v in value.items():
            if k not in props:
                if schema.get("additionalProperties") is False:
                    errs.append(f"{path}: unexpected field {k}")
            else:
                errs += validate(props[k], v, f"{path}.{k}")
    if t == "array":
        for i, v in enumerate(value):
            errs += validate(schema.get("items", {}), v, f"{path}[{i}]")
    return errs


# ---------------------------------------------------------------- environment
class Env:
    """Executes tool calls and records them. Tasks subclass it to inject errors or a file system."""
    tools = SHOP_TOOLS

    def __init__(self, workdir):
        self.workdir = Path(workdir)
        self.calls = []        # dicts: turn, name, args, schema_errors, result
        self.schema = {t["function"]["name"]: t["function"]["parameters"] for t in self.tools}

    def call(self, turn, name, args):
        errs = validate(self.schema[name], args) if name in self.schema else [f"unknown tool {name}"]
        if name not in self.schema:
            result = {"error": f"unknown tool {name!r}"}
        else:
            try:
                result = getattr(self, "t_" + name)(**args)
            except TypeError as e:
                result = {"error": f"bad arguments: {e}"}
        self.calls.append({"turn": turn, "name": name, "args": args, "schema_errors": errs, "result": result})
        return result

    def named(self, name):
        return [c for c in self.calls if c["name"] == name]

    # shop tools
    def t_search_customers(self, query):
        q = str(query).strip().lower()
        return [c for c in CUSTOMERS if q == c["email"] or q in c["name"].lower()]

    def t_get_customer(self, customer_id):
        c = [c for c in CUSTOMERS if c["id"] == customer_id]
        return c[0] if c else {"error": "customer not found"}

    def t_search_orders(self, customer_id, status=None):
        os_ = [o for o in ORDERS if o["customer_id"] == customer_id and (status is None or o["status"] == status)]
        return sorted(os_, key=lambda o: o["date"], reverse=True)

    def t_get_order(self, order_id):
        o = [o for o in ORDERS if o["id"] == order_id]
        return o[0] if o else {"error": f"order {order_id} not found"}

    def t_get_shipping_status(self, order_id):
        return {"order_id": order_id, "status": SHIPPING[order_id]} if order_id in SHIPPING \
            else {"error": f"order {order_id} not found"}

    def t_refund_order(self, order_id, amount, reason):
        return {"refund_id": "R-88017", "order_id": order_id, "amount": amount, "status": "refunded"}

    def t_create_ticket(self, title, priority, customer_id, due_date=None, tags=None):
        return {"ticket_id": "T-5521", "status": "open"}

    def t_send_email(self, to, subject, body):
        return {"sent": True}

    def t_get_exchange_rate(self, base, quote):
        if not re.fullmatch(r"[A-Z]{3}", str(base)) or not re.fullmatch(r"[A-Z]{3}", str(quote)):
            return {"error": "base and quote must be 3-letter ISO 4217 codes, e.g. EUR"}
        rates = {("EUR", "PLN"): 4.27, ("USD", "PLN"): 3.94}
        return {"base": base, "quote": quote, "rate": rates.get((base, quote), 1.0)}

    def t_list_products(self, category=None):
        return [{"sku": "PH-1", "name": "Phone X", "category": "phones", "price": 2499.0}]


# ---------------------------------------------------------------- helpers for grading
def numbers(text):
    """All numbers in a text, tolerant of '1 067,50' / '1,067.50' / '1067.5'."""
    out = []
    for m in re.finditer(r"\d[\d\s.,]*\d|\d", text):
        s = re.sub(r"\s", "", m.group(0))
        if "," in s and "." in s:
            s = s.replace(",", "") if s.rfind(".") > s.rfind(",") else s.replace(".", "").replace(",", ".")
        elif "," in s:
            s = s.replace(",", ".") if len(s.split(",")[-1]) <= 2 else s.replace(",", "")
        try:
            out.append(float(s))
        except ValueError:
            pass
    return out


def common_checks(env, log):
    """Checks every task gets: well-formed calls, valid arguments."""
    return {
        "tool_calls_well_formed": not log["bad_json"] and not log["text_tool_calls"],
        "arguments_match_schema": all(not c["schema_errors"] for c in env.calls),
    }


def no_writes(env, allowed=()):
    return not any(c["name"] in WRITE_TOOLS - set(allowed) for c in env.calls)


# ---------------------------------------------------------------- tasks
def grade_select(env, log, answer):
    c = env.named("get_shipping_status")
    return {
        **common_checks(env, log),
        "used_get_shipping_status": any(x["args"].get("order_id") == "A-1003" for x in c),
        "no_write_tools": no_writes(env),
        "at_most_2_calls": len(env.calls) <= 2,
        "answer_has_status": "kra-12" in answer.lower(),
    }


def grade_args(env, log, answer):
    t = env.named("create_ticket")
    a = t[0]["args"] if len(t) == 1 else {}
    return {
        **common_checks(env, log),
        "exactly_one_ticket": len(t) == 1,
        "priority_urgent": a.get("priority") == "urgent",
        "due_date_2026_10_16": a.get("due_date") == "2026-10-16",
        "customer_id_int_314": a.get("customer_id") == 314 and isinstance(a.get("customer_id"), int),
        "tags_mobile_payments": sorted(a.get("tags") or []) == ["mobile", "payments"],
        "short_relevant_title": 0 < len(a.get("title", "")) <= 80
        and bool(re.search(r"ios|checkout|crash|card|payment", a.get("title", ""), re.I)),
        "no_other_writes": no_writes(env, allowed={"create_ticket"}),
        "answer_has_ticket_id": "T-5521" in answer,
    }


def grade_chain(env, log, answer):
    r = env.named("refund_order")
    a = r[0]["args"] if len(r) == 1 else {}
    return {
        **common_checks(env, log),
        "looked_up_customer_207": any(c["args"].get("customer_id") == 207 for c in env.named("search_orders")),
        "exactly_one_refund": len(r) == 1,
        "refunded_latest_order": a.get("order_id") == "A-1042",
        "full_amount": isinstance(a.get("amount"), (int, float)) and abs(a.get("amount", 0) - 349.50) < 0.01,
        "reason_damaged": a.get("reason") == "damaged",
        "answer_has_refund_id": "R-88017" in answer,
    }


def grade_parallel(env, log, answer):
    asked = {c["args"].get("order_id") for c in env.named("get_shipping_status")}
    low = answer.lower()
    return {
        **common_checks(env, log),
        "fetched_all_three": {"A-1001", "A-1002", "A-1003"} <= asked,
        "parallel_calls": any(n >= 2 for n in log["calls_per_turn"]),
        "at_most_3_model_turns": log["turns"] <= 3,
        "no_write_tools": no_writes(env),
        "answer_covers_all": "delivered" in low and "warsaw" in low and "kra-12" in low,
    }


class ErrorEnv(Env):
    """The exchange-rate service fails once with a 503; order A-9999 does not exist."""
    def __init__(self, workdir):
        super().__init__(workdir)
        self.rate_calls = 0

    def t_get_exchange_rate(self, base, quote):
        self.rate_calls += 1
        if self.rate_calls == 1:
            return {"error": "503 Service Unavailable: rate service temporarily down, try again"}
        return super().t_get_exchange_rate(base, quote)


def grade_error(env, log, answer):
    rate = env.named("get_exchange_rate")
    ok_rate = [c for c in rate if "rate" in (c["result"] or {})]
    low = answer.lower()
    return {
        **common_checks(env, log),
        "retried_after_503": len(rate) >= 2 and bool(ok_rate),
        "at_most_4_rate_calls": len(rate) <= 4,
        "correct_amount_1067_50": any(abs(x - 1067.5) < 0.01 for x in numbers(answer)),
        "says_order_not_found": "a-9999" in low and bool(re.search(
            r"not found|no order|does(?: not|n't) exist|could(?: not|n't) find|unable to find|no record", low)),
        "no_invented_status": not re.search(r"\bdelivered\b|in transit|sorting hub|parcel locker", low),
        "no_write_tools": no_writes(env),
    }


def grade_no_tool(env, log, answer):
    return {
        **common_checks(env, log),
        "no_tool_calls": not env.calls,
        "correct_391": "391" in answer,
        "short_answer": len(answer.strip()) <= 20,
    }


# ---------------------------------------------------------------- agent task: fix a bug in a tiny repo
CART_PY = '''"""Shopping cart maths."""


def line_total(price, qty, discount=0.0):
    """Price of one cart line. discount is a fraction: 0.1 means 10% off."""
    if qty < 0:
        raise ValueError("qty must be >= 0")
    return round(price * qty * (1 - discount / 100), 2)


def shipping_fee(subtotal):
    """Shipping is free for orders of 200 PLN or more, otherwise 14.99."""
    return 0.0 if subtotal > 200 else 14.99


def cart_total(items):
    """items: list of dicts with price, qty and optional discount. Returns subtotal + shipping."""
    subtotal = round(sum(line_total(i["price"], i["qty"], i.get("discount", 0.0)) for i in items), 2)
    return round(subtotal + shipping_fee(subtotal), 2)
'''
TEST_CART_PY = '''import unittest
from cart import line_total, shipping_fee, cart_total


class CartTest(unittest.TestCase):
    def test_line_total_plain(self):
        self.assertEqual(line_total(10.0, 3), 30.0)

    def test_line_total_discount(self):
        self.assertEqual(line_total(100.0, 2, 0.25), 150.0)

    def test_negative_qty(self):
        with self.assertRaises(ValueError):
            line_total(5.0, -1)

    def test_free_shipping_threshold(self):
        self.assertEqual(shipping_fee(200.0), 0.0)
        self.assertEqual(shipping_fee(199.99), 14.99)

    def test_cart_total(self):
        self.assertEqual(cart_total([{"price": 50.0, "qty": 2}, {"price": 40.0, "qty": 1, "discount": 0.5}]), 134.99)


if __name__ == "__main__":
    unittest.main()
'''
HIDDEN_CART_TESTS = r'''
import cart
assert cart.line_total(19.99, 1) == 19.99
assert cart.line_total(80.0, 1, 0.1) == 72.0
assert cart.line_total(10.0, 0) == 0.0
assert cart.shipping_fee(250.0) == 0.0 and cart.shipping_fee(0.0) == 14.99
assert cart.cart_total([{"price": 100.0, "qty": 2}]) == 200.0
assert cart.cart_total([{"price": 250.0, "qty": 1, "discount": 0.2}]) == 200.0
assert cart.cart_total([]) == 14.99
print("HIDDEN_OK")
'''

FILE_TOOLS = [
    _fn("list_files", "List the files in the repository.", {}),
    _fn("read_file", "Read a file from the repository.", {"path": {"type": "string"}}, ["path"]),
    _fn("write_file", "Overwrite (or create) a file in the repository with the given content.",
        {"path": {"type": "string"}, "content": {"type": "string"}}, ["path", "content"]),
    _fn("run_tests", "Run the repository's unit tests and return the output.", {}),
]
AGENT_SYSTEM = """You are a coding agent working in a small Python repository through tools.
Read files, change them with write_file, and use run_tests to check your work. Do not change the tests.
When the tests pass, reply with a short summary of what you fixed."""


class RepoEnv(Env):
    tools = FILE_TOOLS

    def __init__(self, workdir):
        super().__init__(workdir)
        self.repo = self.workdir / "repo"
        self.repo.mkdir(parents=True, exist_ok=True)
        (self.repo / "cart.py").write_text(CART_PY, encoding="utf-8")
        (self.repo / "test_cart.py").write_text(TEST_CART_PY, encoding="utf-8")
        self.test_hash = hashlib.sha256(TEST_CART_PY.encode()).hexdigest()
        self.writes_before_tests = False

    def _path(self, path):
        p = (self.repo / str(path).lstrip("/\\")).resolve()
        if self.repo.resolve() not in p.parents and p != self.repo.resolve():
            raise ValueError("path outside the repository")
        return p

    def t_list_files(self):
        return sorted(p.name for p in self.repo.iterdir() if p.is_file())

    def t_read_file(self, path):
        try:
            p = self._path(path)
            return p.read_text(encoding="utf-8") if p.is_file() else {"error": f"no such file: {path}"}
        except ValueError as e:
            return {"error": str(e)}

    def t_write_file(self, path, content):
        try:
            p = self._path(path)
        except ValueError as e:
            return {"error": str(e)}
        p.write_text(content, encoding="utf-8")
        return {"written": p.name, "bytes": len(content.encode())}

    def t_run_tests(self):
        try:
            r = subprocess.run([sys.executable, "-m", "unittest", "-q"], cwd=self.repo, capture_output=True,
                               text=True, timeout=60)
            out = (r.stdout + r.stderr)[-2000:]
        except subprocess.TimeoutExpired:
            out = "tests timed out after 60 s"
        return {"output": out}


def run_repo_tests(repo, code):
    try:
        r = subprocess.run([sys.executable, "-c", code], cwd=repo, capture_output=True, text=True, timeout=60)
        return r.returncode == 0 and ("HIDDEN_OK" in r.stdout or "OK" in r.stderr), (r.stdout + r.stderr)[-500:]
    except subprocess.TimeoutExpired:
        return False, "timed out"


def grade_agent(env, log, answer):
    repo = env.repo
    tests_ok, out1 = run_repo_tests(repo, "import unittest, sys; r = unittest.main(module='test_cart', exit=False)."
                                          "result; sys.exit(0 if r.wasSuccessful() else 1)")
    hidden_ok, out2 = run_repo_tests(repo, HIDDEN_CART_TESTS)
    tf = repo / "test_cart.py"
    unchanged = tf.is_file() and hashlib.sha256(tf.read_bytes()).hexdigest() == env.test_hash
    writes = [i for i, c in enumerate(env.calls) if c["name"] == "write_file"]
    tests_after = writes and any(c["name"] == "run_tests" for c in env.calls[writes[-1] + 1:])
    if not tests_ok:
        log["notes"].append(f"visible tests: {out1}")
    if not hidden_ok:
        log["notes"].append(f"hidden tests: {out2}")
    return {
        **common_checks(env, log),
        "visible_tests_pass": tests_ok,
        "hidden_tests_pass": hidden_ok,
        "tests_not_modified": unchanged,
        "ran_tests_after_last_edit": bool(tests_after),
        "at_most_12_tool_calls": len(env.calls) <= 12,
    }


TASKS = [
    {"id": "t_select", "env": Env, "max_turns": 4,
     "prompt": "Where is my order A-1003 right now?", "grade": grade_select},
    {"id": "t_args", "env": Env, "max_turns": 4,
     "prompt": "Please open a support ticket for customer 314: the checkout page crashes on iOS when they pay by "
               "card. It's urgent and has to be solved by 2026-10-16. Tag it mobile and payments, and keep the "
               "title short. Tell me the ticket number.",
     "grade": grade_args},
    {"id": "t_chain", "env": Env, "max_turns": 8,
     "prompt": "Jan Nowak (jan.nowak@example.com) says his most recent order arrived damaged. Refund it in full "
               "and tell me the refund number.",
     "grade": grade_chain},
    {"id": "t_parallel", "env": Env, "max_turns": 4,
     "prompt": "Check the shipping status of orders A-1001, A-1002 and A-1003 and give me a one-line summary "
               "for each.",
     "grade": grade_parallel},
    {"id": "t_error", "env": ErrorEnv, "max_turns": 8,
     "prompt": "How much is 250 EUR in PLN at today's rate? Also, what is the status of order A-9999?",
     "grade": grade_error},
    {"id": "t_no_tool", "env": Env, "max_turns": 2,
     "prompt": "Quick one, nothing to look up: what is 17 × 23? Reply with the number only.",
     "grade": grade_no_tool},
    {"id": "t_agent_fix", "env": RepoEnv, "max_turns": 20, "system": AGENT_SYSTEM,
     "prompt": "The unit tests in this repository fail. Find and fix the bugs in the code so that all tests pass.",
     "grade": grade_agent},
]
for _t in TASKS:
    _t.setdefault("system", SYSTEM)
    _t["kind"] = "tools"
