"""Practical suite (--suite practical): everyday coding work rather than writing from scratch.

w_edit       change an existing module without touching the rest of it
w_bugfix     fix a bug from a failing test and its traceback
w_refactor   split a long function into helpers, behaviour unchanged
w_sql        SQLite queries, checked on hidden data
w_json       structured output: extract records into JSON that matches a schema
w_longctx    find and fix a bug in a ~20k-token module (long context)

All are graded by hidden Python tests, like the Python tasks of the other suites.
"""
import random
import textwrap

SYSTEM = """You are an expert Python developer working on an existing codebase.
Follow the instructions exactly. Reply with one fenced code block in the language asked for, and nothing else after it."""

# ---------------------------------------------------------------- w_edit
INVENTORY_PY = '''"""Warehouse inventory helpers."""
import csv
from dataclasses import dataclass


@dataclass
class Item:
    sku: str
    name: str
    category: str
    qty: int
    unit_price: float


def load_items(path):
    """Read items from a CSV file with columns sku,name,category,qty,unit_price."""
    items = []
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            items.append(Item(row["sku"], row["name"], row["category"], int(row["qty"]),
                              float(row["unit_price"])))
    return items


def total_value(items):
    """Value of the whole stock."""
    return round(sum(i.qty * i.unit_price for i in items), 2)


def low_stock(items, threshold=5):
    """SKUs whose quantity is below the threshold, sorted."""
    return sorted(i.sku for i in items if i.qty < threshold)


def format_report(items):
    """One line per item: SKU, name, quantity."""
    lines = [f"{i.sku:<8} {i.name:<20} {i.qty:>5}" for i in items]
    lines.append(f"TOTAL VALUE: {total_value(items):.2f}")
    return "\\n".join(lines)
'''

EDIT_TESTS = r'''
import ast
ORIGINAL = __ORIGINAL__
def _src_of(tree, name):
    for n in tree.body:
        if isinstance(n, (ast.FunctionDef, ast.ClassDef)) and n.name == name:
            return ast.dump(n)
orig = ast.parse(ORIGINAL)
new = ast.parse(open("solution.py", encoding="utf-8").read())
I = S.Item
items = [I("A1", "Bolt", "hardware", 3, 0.5), I("A2", "Nut", "hardware", 10, 0.2),
         I("B1", "Glue", "chemicals", 1, 7.0), I("B2", "Paint", "chemicals", 8, 25.0), I("C1", "Rope", "outdoor", 4, 12.5)]
def t(): assert S.low_stock(items) == ["A1", "B1", "C1"]
TESTS.append(("low_stock default unchanged", t))
def t(): assert S.low_stock(items, 9, category="chemicals") == ["B1", "B2"]
TESTS.append(("low_stock category filter", t))
def t(): assert S.low_stock(items, category="toys") == []
TESTS.append(("low_stock unknown category", t))
def t(): assert S.low_stock(items, 5, None) == ["A1", "B1", "C1"]
TESTS.append(("low_stock category=None means all", t))
def t():
    v = S.value_by_category(items)
    assert v == {"hardware": 3.5, "chemicals": 207.0, "outdoor": 50.0}, v
TESTS.append(("value_by_category", t))
def t(): assert S.value_by_category([]) == {}
TESTS.append(("value_by_category empty", t))
for name in ("Item", "load_items", "total_value", "format_report"):
    def t(name=name): assert _src_of(new, name) == _src_of(orig, name), f"{name} was changed"
    TESTS.append((f"{name} untouched", t))
def t():
    import os, tempfile
    p = os.path.join(tempfile.mkdtemp(), "i.csv")
    open(p, "w", encoding="utf-8").write("sku,name,category,qty,unit_price\nX1,Tape,office,2,3.5\n")
    assert S.load_items(p) == [I("X1", "Tape", "office", 2, 3.5)]
TESTS.append(("load_items still works", t))
'''.replace("__ORIGINAL__", repr(INVENTORY_PY))

# ---------------------------------------------------------------- w_bugfix
DATES_PY = '''from datetime import date, timedelta


def business_days_between(start: date, end: date, holidays=()) -> int:
    """Number of business days (Mon-Fri, not in holidays) from start to end.

    start is included, end is excluded. If end <= start the result is 0.
    """
    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5 and current not in holidays:
            days += 1
        current += timedelta(days=1)
    return days


def add_business_days(start: date, n: int, holidays=()) -> date:
    """The date n business days after start (n >= 0). Weekends and holidays are skipped."""
    current = start
    while n > 0:
        current += timedelta(days=1)
        if current.weekday() < 5:
            n -= 1
    return current
'''
BUGFIX_PROMPT = f"""This module has bugs. Our CI shows this failure:

```
FAIL: test_week (test_dates.DatesTest)
    self.assertEqual(business_days_between(date(2026, 10, 5), date(2026, 10, 12)), 5)
AssertionError: 6 != 5

FAIL: test_add_skips_holiday (test_dates.DatesTest)
    self.assertEqual(add_business_days(date(2026, 11, 10), 1, holidays={{date(2026, 11, 11)}}), date(2026, 11, 12))
AssertionError: datetime.date(2026, 11, 11) != datetime.date(2026, 11, 12)
```

Fix the code so that it matches the docstrings. Return the complete corrected module in one ```python block.

```python
{DATES_PY}```"""
BUGFIX_TESTS = r'''
from datetime import date as D
def t(): assert S.business_days_between(D(2026, 10, 5), D(2026, 10, 12)) == 5
TESTS.append(("test_week (shown)", t))
def t(): assert S.add_business_days(D(2026, 11, 10), 1, holidays={D(2026, 11, 11)}) == D(2026, 11, 12)
TESTS.append(("test_add_skips_holiday (shown)", t))
def t(): assert S.business_days_between(D(2026, 10, 9), D(2026, 10, 12)) == 1
TESTS.append(("friday to monday", t))
def t(): assert S.business_days_between(D(2026, 10, 12), D(2026, 10, 12)) == 0
TESTS.append(("same day", t))
def t(): assert S.business_days_between(D(2026, 10, 12), D(2026, 10, 5)) == 0
TESTS.append(("end before start", t))
def t(): assert S.business_days_between(D(2026, 12, 21), D(2026, 12, 28), holidays={D(2026, 12, 24), D(2026, 12, 25)}) == 3
TESTS.append(("holidays", t))
def t(): assert S.add_business_days(D(2026, 10, 9), 1) == D(2026, 10, 12)
TESTS.append(("add over weekend", t))
def t(): assert S.add_business_days(D(2026, 10, 9), 0) == D(2026, 10, 9)
TESTS.append(("add zero", t))
def t(): assert S.add_business_days(D(2026, 12, 23), 2, holidays={D(2026, 12, 24), D(2026, 12, 25)}) == D(2026, 12, 29)
TESTS.append(("add over holidays and weekend", t))
'''

# ---------------------------------------------------------------- w_refactor
REPORT_PY = '''def process_orders(lines):
    """lines: CSV-like strings 'order_id;customer;amount;currency;status'.

    Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}.
    Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.
    Only status 'paid' counts; 'refunded' subtracts the amount; anything else is rejected.
    Blank lines and lines starting with '#' are skipped (not rejected). Line numbers start at 1.
    """
    total = 0.0
    by_customer = {}
    rejected = []
    for n, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split(";")]
        if len(parts) != 5:
            rejected.append(n)
            continue
        order_id, customer, amount, currency, status = parts
        try:
            value = float(amount.replace(",", "."))
        except ValueError:
            rejected.append(n)
            continue
        if value < 0 or not customer or not order_id:
            rejected.append(n)
            continue
        if currency == "EUR":
            value = value * 4.27
        elif currency == "USD":
            value = value * 3.94
        elif currency == "PLN":
            pass
        else:
            rejected.append(n)
            continue
        if status == "paid":
            sign = 1
        elif status == "refunded":
            sign = -1
        else:
            rejected.append(n)
            continue
        total += sign * value
        by_customer[customer] = by_customer.get(customer, 0.0) + sign * value
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": rejected}
'''
REFACTOR_PROMPT = f"""Refactor this function. Split it into three helper functions:
- `parse_line(raw)` returns a tuple (order_id, customer, amount_pln, status) for a valid line, None for a blank or comment line, and raises ValueError for an invalid line;
- `to_pln(amount, currency)` converts to PLN and raises ValueError for an unknown currency;
- `summarize(records)` builds the result dict from a list of (customer, signed_amount_pln) pairs.
`process_orders(lines)` must keep exactly the same behaviour (same results, same rejected line numbers) and become a short function (at most 15 lines) that uses the helpers.
Return the complete module in one ```python block.

```python
{REPORT_PY}```"""
REFACTOR_TESTS = r'''
import ast, inspect, random
REF = {}
exec(__ORIGINAL__, REF)
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
    n = len([l for l in inspect.getsource(S.process_orders).splitlines() if l.strip() and not l.strip().startswith('#')])
    assert n <= 15 + 8, f"process_orders has {n} non-blank lines"  # +8 for signature and docstring
TESTS.append(("process_orders is short", t))
'''.replace("__ORIGINAL__", repr(REPORT_PY))

# ---------------------------------------------------------------- w_sql
SQL_PROMPT = """SQLite database with this schema:

```sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id),
                     ordered_at TEXT NOT NULL,          -- ISO date 'YYYY-MM-DD'
                     status TEXT NOT NULL);             -- 'paid', 'cancelled' or 'refunded'
CREATE TABLE order_items (order_id INTEGER NOT NULL REFERENCES orders(id), product TEXT NOT NULL,
                          qty INTEGER NOT NULL, unit_price REAL NOT NULL);
```

An order's value is the sum of qty * unit_price of its items. Only 'paid' orders count as revenue.

Write a Python module that defines a dict `QUERIES` with these SQL query strings:
- "top_customers": the 3 customers with the highest revenue in 2026; columns name, revenue (rounded to 2 decimals); highest first, ties by name.
- "monthly_revenue": revenue per month in 2026; columns month ('YYYY-MM'), revenue (rounded to 2 decimals); only months with revenue; by month.
- "never_paid": names of customers who have no paid order at all (including customers with no orders); one column name; sorted by name.
- "avg_items_per_order": the average number of items (sum of qty) per paid order, per country; columns country, avg_items (rounded to 2 decimals); by country.

Return the module in one ```python block. The queries will be run on a different, larger data set than you can see."""
SQL_TESTS = r'''
import sqlite3, random
from collections import defaultdict
SCHEMA = """CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, ordered_at TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INTEGER NOT NULL, product TEXT NOT NULL, qty INTEGER NOT NULL, unit_price REAL NOT NULL);"""
rnd = random.Random(42)
db = sqlite3.connect(":memory:")
db.executescript(SCHEMA)
names = ["Ada", "Bob", "Cyd", "Dan", "Eva", "Fay", "Gus", "Hal", "Ivy", "Jon"]
custs = [(i + 1, n, rnd.choice(["PL", "DE", "CZ"])) for i, n in enumerate(names)]
db.executemany("INSERT INTO customers VALUES (?,?,?)", custs)
orders, items = [], []
for oid in range(1, 121):
    cid = rnd.choice([c[0] for c in custs[:8]])          # Ivy and Jon never order
    y = rnd.choice([2025, 2026, 2026, 2026])
    d = f"{y}-{rnd.randint(1, 12):02d}-{rnd.randint(1, 28):02d}"
    st = rnd.choice(["paid", "paid", "paid", "cancelled", "refunded"])
    if cid == 8: st = "cancelled"                         # Hal has orders but none paid
    orders.append((oid, cid, d, st))
    for _ in range(rnd.randint(1, 4)):
        items.append((oid, rnd.choice(["pen", "ink", "pad"]), rnd.randint(1, 5), round(rnd.uniform(1, 60), 2)))
db.executemany("INSERT INTO orders VALUES (?,?,?,?)", orders)
db.executemany("INSERT INTO order_items VALUES (?,?,?,?)", items)
val = defaultdict(float); cnt = defaultdict(int)
for o, p, q, u in items:
    val[o] += q * u; cnt[o] += q
cname = {c[0]: c[1] for c in custs}; ccountry = {c[0]: c[2] for c in custs}
paid = [o for o in orders if o[3] == "paid"]
rev = defaultdict(float)
for o in paid:
    if o[2].startswith("2026"): rev[cname[o[1]]] += val[o[0]]
exp_top = sorted(((n, round(v, 2)) for n, v in rev.items()), key=lambda x: (-x[1], x[0]))[:3]
mon = defaultdict(float)
for o in paid:
    if o[2].startswith("2026"): mon[o[2][:7]] += val[o[0]]
exp_mon = [(m, round(v, 2)) for m, v in sorted(mon.items())]
paid_c = {cname[o[1]] for o in paid}
exp_never = sorted((n,) for n in names if n not in paid_c)
per = defaultdict(list)
for o in paid: per[ccountry[o[1]]].append(cnt[o[0]])
exp_avg = [(c, round(sum(v) / len(v), 2)) for c, v in sorted(per.items())]
def q(key):
    return [tuple(round(x, 2) if isinstance(x, float) else x for x in r) for r in db.execute(S.QUERIES[key]).fetchall()]
for key, exp in [("top_customers", exp_top), ("monthly_revenue", exp_mon), ("never_paid", exp_never),
                 ("avg_items_per_order", exp_avg)]:
    def t(key=key, exp=exp):
        got = q(key)
        assert got == exp, f"{key}: got {got[:4]}..., want {exp[:4]}..."
    TESTS.append((key, t))
'''

# ---------------------------------------------------------------- w_json
JSON_PROMPT = """Extract one record per message from these customer messages into a JSON array.
Each record: {"customer": string, "order_id": string like "A-1234" or null, "issue": one of "damaged", "late", "wrong_item", "refund_request", "other", "urgent": boolean}.
"urgent" is true only if the customer says it is urgent or gives a deadline within 48 hours. Keep the messages' order.
Reply with the JSON array only, in one ```json block, no comments.

1) From: Piotr Zieliński — Hi, order A-2231 came with a cracked screen. Please sort it out.
2) From: Maria Lewandowska — Where is my parcel? It was supposed to arrive last Tuesday (order A-2240). I need it for a trip tomorrow morning!
3) From: "K. Wójcik" — I ordered a blue kettle and got a red toaster. Order number A2252, sorry, it's A-2252.
4) From: Tomasz Kamiński — I'd like my money back for order A-2261, I changed my mind. No rush.
5) From: Agnieszka Dąbrowska — Do you ship to Norway? Just asking, no order yet.
6) From: Paweł Szymański — URGENT: order A-2270 is a week late and the box that finally came was crushed, the lamp inside is broken."""
JSON_TESTS = r'''
EXP = [("Piotr Zieliński", "A-2231", "damaged", False), ("Maria Lewandowska", "A-2240", "late", True),
       ("K. Wójcik", "A-2252", "wrong_item", False), ("Tomasz Kamiński", "A-2261", "refund_request", False),
       ("Agnieszka Dąbrowska", None, "other", False), ("Paweł Szymański", "A-2270", "damaged", True)]
D = S.DATA
def t(): assert isinstance(D, list) and len(D) == 6, f"got {type(D).__name__} of length {len(D) if hasattr(D, '__len__') else '?'}"
TESTS.append(("array of 6 records", t))
def t():
    for r in D:
        assert set(r) == {"customer", "order_id", "issue", "urgent"}, f"keys {sorted(r)}"
        assert isinstance(r["customer"], str) and (r["order_id"] is None or isinstance(r["order_id"], str))
        assert r["issue"] in ("damaged", "late", "wrong_item", "refund_request", "other") and isinstance(r["urgent"], bool)
TESTS.append(("every record matches the schema", t))
for i, (cust, oid, issue, urg) in enumerate(EXP):
    def t(i=i, oid=oid): assert D[i]["order_id"] == oid, D[i]["order_id"]
    TESTS.append((f"#{i + 1} order_id", t))
    def t(i=i, issue=issue): assert D[i]["issue"] == issue, D[i]["issue"]
    TESTS.append((f"#{i + 1} issue", t))
    def t(i=i, urg=urg): assert D[i]["urgent"] is urg, D[i]["urgent"]
    TESTS.append((f"#{i + 1} urgent", t))
def t():
    for (cust, *_), r in zip(EXP, D):
        assert cust.split()[-1].strip('"') in r["customer"], r["customer"]
TESTS.append(("customer names", t))
'''

# ---------------------------------------------------------------- w_longctx
ENTITIES = ["customer", "order", "invoice", "product", "warehouse", "supplier", "shipment", "payment",
            "return", "coupon", "basket", "review", "employee", "store", "pallet", "carrier",
            "contract", "voucher", "batch", "location", "route", "vehicle", "driver", "parcel",
            "category", "brand", "promotion", "budget", "account", "ledger"]
TEMPLATES = [
    '''def validate_{e}_id(value: str) -> bool:
    """True if value is a valid {e} id: '{p}-' followed by 6 digits."""
    if not isinstance(value, str) or not value.startswith("{p}-"):
        return False
    digits = value[len("{p}-"):]
    return len(digits) == 6 and digits.isdigit()
''',
    '''def format_{e}_label(name: str, number: int) -> str:
    """Human-readable label for a {e}, e.g. '{P} #000042: Name'."""
    clean = " ".join(name.split())
    return f"{P} #{{number:06d}}: {{clean}}"
''',
    '''def {e}_age_days(created: str, today: str) -> int:
    """Days between two ISO dates for a {e}; never negative."""
    from datetime import date
    a, b = date.fromisoformat(created), date.fromisoformat(today)
    return max(0, (b - a).days)
''',
    '''def merge_{e}_tags(old: list, new: list) -> list:
    """Union of {e} tags, lower-case, order of first appearance kept."""
    seen, out = set(), []
    for tag in list(old) + list(new):
        t = tag.strip().lower()
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return out
''',
    '''def {e}_page(rows: list, page: int, size: int = 20) -> list:
    """Rows of one page of the {e} list; pages start at 1."""
    if page < 1 or size < 1:
        raise ValueError("page and size must be >= 1")
    start = (page - 1) * size
    return rows[start:start + size]
''',
    '''def parse_{e}_amount(text: str) -> float:
    """Parse an amount like '1 234,50 zł' or '1234.50' from a {e} record."""
    t = text.replace("zł", "").replace("PLN", "").replace(" ", "").replace("\\u00a0", "")
    if "," in t and "." not in t:
        t = t.replace(",", ".")
    return round(float(t.replace(",", "")), 2)
''',
    '''def {e}_checksum(fields: dict) -> str:
    """Stable short hash of a {e} record, independent of key order."""
    import hashlib, json
    blob = json.dumps(fields, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha1(blob).hexdigest()[:12]
''',
    '''def {e}_is_active(record: dict, today: str) -> bool:
    """A {e} is active if it is not archived and today is inside [valid_from, valid_to] (missing = open)."""
    if record.get("archived"):
        return False
    start, end = record.get("valid_from") or "0000-01-01", record.get("valid_to") or "9999-12-31"
    return start <= today <= end
''',
    '''def summarize_{e}_counts(rows: list, field: str = "status") -> dict:
    """Count {e} rows per value of one field, most common first, ties alphabetically."""
    counts = {{}}
    for r in rows:
        v = str(r.get(field, "unknown"))
        counts[v] = counts.get(v, 0) + 1
    return dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])))
''',
    '''def group_{e}s_by(rows: list, key: str) -> dict:
    """Group {e} rows (dicts) by one field; rows missing the field go under None."""
    out = {{}}
    for r in rows:
        out.setdefault(r.get(key), []).append(r)
    return out
''',
]
TARGET = '''def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines) removed; dashes are kept.
    ' ab-12 x ' -> 'AB-12X'."""
    return raw.strip().upper().replace(" ", "")


def normalize_sku_legacy(raw: str) -> str:
    """Old format kept for the archive importer: upper-case, spaces turned into dashes."""
    return "-".join(raw.upper().split())


def find_product(catalog: dict, raw_sku: str):
    """Look a product up by any spelling of its SKU; catalog keys are canonical SKUs. None if missing."""
    return catalog.get(normalize_sku(raw_sku))
'''


def build_long_module():
    rnd = random.Random(2026)
    funcs = []
    for e in ENTITIES:
        for tpl in TEMPLATES:
            funcs.append(tpl.format(e=e, p=e[:3].upper(), P=e.capitalize()))
    rnd.shuffle(funcs)
    mid = len(funcs) * 3 // 5
    body = funcs[:mid] + [TARGET] + funcs[mid:]
    return '"""Back-office helper functions (generated from many small modules)."""\n\n\n' + "\n\n".join(body)


LONG_PY = build_long_module()
LONGCTX_PROMPT = f"""Below is a large module from our back office. Bug report from the warehouse team:

"When a SKU is pasted from a spreadsheet, e.g. 'ab-12\\tx' (with a tab inside) or 'ab-12x\\n', find_product returns None, although the catalog contains 'AB-12X'. Typing ' ab-12 x ' works."

Find the cause and fix it. Reply with only the corrected function(s), complete, in one ```python block. Do not repeat the rest of the module.

```python
{LONG_PY}
```"""
LONGCTX_TESTS = r'''
import ast
ORIGINAL = __ORIGINAL__
answer = ast.parse(open("solution.py", encoding="utf-8").read())
fixed = {n.name: n for n in answer.body if isinstance(n, ast.FunctionDef)}
mod = ast.parse(ORIGINAL)
mod.body = [fixed.get(getattr(n, "name", None), n) for n in mod.body]
NS = {}
exec(compile(mod, "module", "exec"), NS)
cat = {"AB-12X": "kettle", "ZZ-1": "lamp"}
def t(): assert fixed, "no function in the answer"
TESTS.append(("answer has a function", t))
def t(): assert set(fixed) <= {n.name for n in ast.parse(ORIGINAL).body if isinstance(n, ast.FunctionDef)}, f"unknown functions: {set(fixed)}"
TESTS.append(("only existing functions returned", t))
for s in ["ab-12\tx", "ab-12x\n", " ab-12 x ", "AB-12X", "a b-1 2\t\tx", "zz-1\r\n"]:
    def t(s=s): assert NS["find_product"](cat, s) is not None, repr(s)
    TESTS.append((f"find_product({s!r})", t))
def t(): assert NS["find_product"](cat, "ab-13x") is None
TESTS.append(("missing SKU still None", t))
def t(): assert NS["normalize_sku"]("  ab-12\t x\n") == "AB-12X"
TESTS.append(("normalize_sku spec", t))
def t(): assert NS["normalize_sku_legacy"]("ab 12 x") == "AB-12-X"
TESTS.append(("legacy function unchanged", t))
'''.replace("__ORIGINAL__", repr(LONG_PY))

# ---------------------------------------------------------------- task list
PY_TASKS = [
    {"id": "w_edit", "tests": EDIT_TESTS, "prompt": f"""Change this module:
1. `low_stock` gets an optional keyword parameter `category=None`. When it is given, only items of that category are considered; None means all categories.
2. Add a function `value_by_category(items) -> dict[str, float]` that returns the stock value (qty * unit_price, rounded to 2 decimals) per category.
Do not change anything else in the file. Return the complete module in one ```python block.

```python
{INVENTORY_PY}```"""},
    {"id": "w_bugfix", "tests": BUGFIX_TESTS, "prompt": BUGFIX_PROMPT},
    {"id": "w_refactor", "tests": REFACTOR_TESTS, "prompt": REFACTOR_PROMPT},
    {"id": "w_sql", "tests": SQL_TESTS, "prompt": SQL_PROMPT},
    {"id": "w_json", "tests": JSON_TESTS, "prompt": JSON_PROMPT, "answer": "json"},
    {"id": "w_longctx", "tests": LONGCTX_TESTS, "prompt": LONGCTX_PROMPT, "timeout_min": 10},
]
THREE_TASKS = []
for _t in PY_TASKS:
    _t["system"] = SYSTEM
