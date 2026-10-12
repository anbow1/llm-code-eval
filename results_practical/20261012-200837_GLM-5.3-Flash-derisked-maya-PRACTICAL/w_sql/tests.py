
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

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
