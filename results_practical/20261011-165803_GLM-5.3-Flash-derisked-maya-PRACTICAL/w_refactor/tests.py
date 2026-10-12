
import json, sys, traceback
sys.path.insert(0, ".")
TESTS = []
try:
    import solution as S
except Exception as e:
    S = None
    IMPORT_ERR = f"{type(e).__name__}: {e}"
else:
    IMPORT_ERR = None

import ast, inspect, random, textwrap
REF = {}
exec('def process_orders(lines):\n    """lines: CSV-like strings \'order_id;customer;amount;currency;status\'.\n\n    Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}.\n    Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.\n    Only status \'paid\' counts; \'refunded\' subtracts the amount; anything else is rejected.\n    Blank lines and lines starting with \'#\' are skipped (not rejected). Line numbers start at 1.\n    """\n    total = 0.0\n    by_customer = {}\n    rejected = []\n    for n, raw in enumerate(lines, 1):\n        line = raw.strip()\n        if not line or line.startswith("#"):\n            continue\n        parts = [p.strip() for p in line.split(";")]\n        if len(parts) != 5:\n            rejected.append(n)\n            continue\n        order_id, customer, amount, currency, status = parts\n        try:\n            value = float(amount.replace(",", "."))\n        except ValueError:\n            rejected.append(n)\n            continue\n        if value < 0 or not customer or not order_id:\n            rejected.append(n)\n            continue\n        if currency == "EUR":\n            value = value * 4.27\n        elif currency == "USD":\n            value = value * 3.94\n        elif currency == "PLN":\n            pass\n        else:\n            rejected.append(n)\n            continue\n        if status == "paid":\n            sign = 1\n        elif status == "refunded":\n            sign = -1\n        else:\n            rejected.append(n)\n            continue\n        total += sign * value\n        by_customer[customer] = by_customer.get(customer, 0.0) + sign * value\n    return {"total_pln": round(total, 2),\n            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},\n            "rejected": rejected}\n', REF)
ref = REF["process_orders"]
cases = [
    ["A1;Ola;100;PLN;paid", "A2;Ola;10;EUR;paid", "A3;Tom;5;USD;refunded"],
    ["", "# header", "A1;Ola;1,5;PLN;paid", "bad line", "A2;;5;PLN;paid", "A3;Tom;-1;PLN;paid", "A4;Tom;3;GBP;paid",
     "A5;Tom;3;PLN;pending", "A6;Tom;x;PLN;paid", " A7 ; Tom ; 2 ; EUR ; paid "],
    [],
]
rnd = random.Random(7)
for _ in range(40):
    rows = []
    for i in range(rnd.randint(0, 12)):
        rows.append(";".join([rnd.choice(["A%d" % i, "", "B%d" % i]), rnd.choice(["Ola", "Tom", "", "Iza"]),
                              rnd.choice(["10", "2,5", "-3", "abc", "0", "99.99"]), rnd.choice(["PLN", "EUR", "USD", "CHF"]),
                              rnd.choice(["paid", "refunded", "void"])]) if rnd.random() > .15 else rnd.choice(["", "#x", "a;b"]))
    cases.append(rows)
def t():
    for c in cases:
        assert S.process_orders(c) == ref(c), (c, S.process_orders(c), ref(c))
TESTS.append(("same results on 43 inputs", t))
for name in ("parse_line", "to_pln", "summarize"):
    def t(name=name): assert callable(getattr(S, name, None)), f"missing {name}"
    TESTS.append((f"has {name}", t))
def t():
    assert S.to_pln(10, "EUR") == 42.7 or abs(S.to_pln(10, "EUR") - 42.7) < 1e-9
    try:
        S.to_pln(1, "GBP")
    except ValueError:
        return
    raise AssertionError("to_pln did not raise for GBP")
TESTS.append(("to_pln", t))
def t():
    assert S.parse_line("   ") is None and S.parse_line("# c") is None
    try:
        S.parse_line("only;three;parts")
    except ValueError:
        return
    raise AssertionError("parse_line did not raise for a bad line")
TESTS.append(("parse_line", t))
def t():
    # count the body only: no signature, no docstring, no blank or comment lines
    src = inspect.getsource(S.process_orders)
    fn = ast.parse(textwrap.dedent(src)).body[0]
    body = fn.body[1:] if isinstance(fn.body[0], ast.Expr) and isinstance(fn.body[0].value, ast.Constant) else fn.body
    lines = textwrap.dedent(src).splitlines()[body[0].lineno - 1:fn.end_lineno] if body else []
    n = len([l for l in lines if l.strip() and not l.strip().startswith("#")])
    assert n <= 15, f"process_orders body has {n} lines (max 15)"
TESTS.append(("process_orders is short", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
