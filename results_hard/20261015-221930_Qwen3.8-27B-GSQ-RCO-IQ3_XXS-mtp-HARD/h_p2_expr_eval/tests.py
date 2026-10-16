
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

S_mod = S
import random
from fractions import Fraction as F
E = S_mod.evaluate
CASES = [("1+2*3", 7), ("(1+2)*3", 9), ("2^3^2", 512), ("-2^2", -4), ("(-2)^2", 4), ("2^-1", F(1, 2)),
         ("10/4", F(5, 2)), ("7 - 2 - 1", 4), ("64/4/2", 8), ("--3", 3), ("-+-3", 3), (".5+7.", F(15, 2)),
         ("3.25*4", 13), ("max(1, 5, 3) - min(4, 2)", 3), ("abs(-7/2)", F(7, 2)), ("2*x^2 + y", 21),
         ("  ( ( 1 ) ) ", 1), ("0.1+0.2", F(3, 10)), ("2^0", 1), ("(1/3)^-2", 9), ("-x", -3), ("max(-1)", -1),
         ("1-2^2^0", -1), ("-(2+3)*2", -10), ("2^(1+1)^2", 16)]
for s, want in CASES:
    def t(s=s, want=want):
        got = E(s, {"x": 3, "y": F(3)})
        assert isinstance(got, F), f"{s!r}: returned {type(got).__name__}, not Fraction"
        assert got == want, f"{s!r}: got {got}, want {want}"
    TESTS.append((f"value {s!r}", t))
ERRORS = [("", ValueError), ("1 +", ValueError), ("* 2", ValueError), ("(1", ValueError), ("1)", ValueError),
          ("2 3", ValueError), ("1..2", ValueError), ("abs 3", ValueError), ("3 $ 4", ValueError),
          ("abs(1, 2)", ValueError), ("min()", ValueError), ("foo(1)", ValueError), ("2^(1/2)", ValueError),
          ("1/0", ZeroDivisionError), ("0^-1", ZeroDivisionError), ("q + 1", NameError), ("max(1,)", ValueError)]
for s, exc in ERRORS:
    def t(s=s, exc=exc):
        try:
            got = E(s, {"x": 3})
        except exc:
            return
        except Exception as e:
            raise AssertionError(f"{s!r}: raised {type(e).__name__}, want {exc.__name__}")
        raise AssertionError(f"{s!r}: returned {got!r}, want {exc.__name__}")
    TESTS.append((f"error {s!r}", t))
PREC = {"+": 1, "-": 1, "*": 2, "/": 2, "neg": 3, "^": 4, "atom": 9}
def gen(rnd, d):
    if d == 0 or rnd.random() < 0.25:
        return ("num", rnd.choice([rnd.randint(0, 9), rnd.randint(10, 99), F(rnd.randint(1, 99), 10)]))
    r = rnd.random()
    if r < 0.12: return ("neg", gen(rnd, d - 1))
    if r < 0.25: return ("^", gen(rnd, d - 1), ("num", rnd.randint(0, 3)) if rnd.random() < .7 else ("neg", ("num", rnd.randint(1, 2))))
    return (rnd.choice("+-*/"), gen(rnd, d - 1), gen(rnd, d - 1))
def val(n):
    k = n[0]
    if k == "num": return F(n[1])
    if k == "neg": return -val(n[1])
    a, b = val(n[1]), val(n[2])
    if k == "+": return a + b
    if k == "-": return a - b
    if k == "*": return a * b
    if k == "/": return a / b
    return a ** int(b)
def prec(n): return PREC["atom"] if n[0] == "num" else PREC[n[0]]
def show(n):
    k = n[0]
    if k == "num":
        v = n[1]
        return str(v) if not isinstance(v, F) or v.denominator == 1 else f"{v.numerator / 10:.1f}" if v.denominator == 10 else str(float(v))
    if k == "neg":
        s = show(n[1]); return "-" + (f"({s})" if prec(n[1]) < 3 else s)
    l, r = show(n[1]), show(n[2])
    p = PREC[k]
    if k == "^":
        l = f"({l})" if prec(n[1]) <= p else l
        r = f"({r})" if prec(n[2]) < 3 else r
    else:
        l = f"({l})" if prec(n[1]) < p else l
        r = f"({r})" if prec(n[2]) <= p else r
    return f"{l} {k} {r}"
def t():
    rnd = random.Random(11); n_ok = 0
    while n_ok < 400:
        tree = gen(rnd, 4)
        try:
            want = val(tree)
        except ZeroDivisionError:
            continue
        if abs(want.numerator) > 10**40 or want.denominator > 10**40: continue
        s = show(tree)
        got = E(s)
        assert got == want, f"{s!r}: got {got}, want {want}"
        n_ok += 1
TESTS.append(("400 random expressions", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
