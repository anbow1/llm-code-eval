
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

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
