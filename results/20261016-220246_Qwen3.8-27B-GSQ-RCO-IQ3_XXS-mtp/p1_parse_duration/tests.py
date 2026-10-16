
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

VALID = [("1h30m", 5400), ("2d", 172800), ("45s", 45), ("1d 2h 3m 4s", 93784),
         ("0s", 0), ("90m", 5400), ("  1h  ", 3600), ("1d4s", 86404), ("1h   30m", 5400),
         ("10d23h59m59s", 950399)]
INVALID = ["", "   ", "1x", "30m1h", "1h1h", "h", "1.5h", "-1h", "+1h", "1H",
           "1h30", "1 h", "1h,30m", "abc", "1d2d", "5", "1s2m"]
for s, want in VALID:
    def t(s=s, want=want):
        got = S.parse_duration(s)
        assert got == want, f"{s!r}: got {got!r}, want {want}"
    TESTS.append((f"valid {s!r}", t))
for s in INVALID:
    def t(s=s):
        try:
            got = S.parse_duration(s)
        except ValueError:
            return
        raise AssertionError(f"{s!r}: expected ValueError, got {got!r}")
    TESTS.append((f"invalid {s!r}", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
