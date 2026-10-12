
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

EXP = [("Piotr Zieliński", "A-2231", "damaged", False), ("Maria Lewandowska", "A-2240", "late", True),
       ("K. Wójcik", "A-2252", "wrong_item", False), ("Tomasz Kamiński", "A-2261", "refund_request", False),
       ("Agnieszka Dąbrowska", None, "other", False), ("Paweł Szymański", "A-2270", ("damaged", "late"), True)]
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
    def t(i=i, issue=issue):  # message 6 is both late and damaged: either label is right
        assert D[i]["issue"] in (issue if isinstance(issue, tuple) else (issue,)), D[i]["issue"]
    TESTS.append((f"#{i + 1} issue", t))
    def t(i=i, urg=urg): assert D[i]["urgent"] is urg, D[i]["urgent"]
    TESTS.append((f"#{i + 1} urgent", t))
def t():
    for (cust, *_), r in zip(EXP, D):
        assert cust.split()[-1].strip('"') in r["customer"], r["customer"]
TESTS.append(("customer names", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
