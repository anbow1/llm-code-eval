
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

import ast
ORIGINAL = '"""Warehouse inventory helpers."""\nimport csv\nfrom dataclasses import dataclass\n\n\n@dataclass\nclass Item:\n    sku: str\n    name: str\n    category: str\n    qty: int\n    unit_price: float\n\n\ndef load_items(path):\n    """Read items from a CSV file with columns sku,name,category,qty,unit_price."""\n    items = []\n    with open(path, newline="", encoding="utf-8") as fh:\n        for row in csv.DictReader(fh):\n            items.append(Item(row["sku"], row["name"], row["category"], int(row["qty"]),\n                              float(row["unit_price"])))\n    return items\n\n\ndef total_value(items):\n    """Value of the whole stock."""\n    return round(sum(i.qty * i.unit_price for i in items), 2)\n\n\ndef low_stock(items, threshold=5):\n    """SKUs whose quantity is below the threshold, sorted."""\n    return sorted(i.sku for i in items if i.qty < threshold)\n\n\ndef format_report(items):\n    """One line per item: SKU, name, quantity."""\n    lines = [f"{i.sku:<8} {i.name:<20} {i.qty:>5}" for i in items]\n    lines.append(f"TOTAL VALUE: {total_value(items):.2f}")\n    return "\\n".join(lines)\n'
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

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
