
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
import random, time, threading
D = S_mod.diff_lines
def timed(fn, limit):
    """Run fn in a daemon thread; fail (instead of hanging) if it is too slow."""
    box = {}
    def run():
        try: box["r"] = fn()
        except BaseException as e: box["e"] = e
    th = threading.Thread(target=run, daemon=True); th.start(); th.join(limit)
    if th.is_alive(): raise AssertionError(f"too slow: not finished after {limit:.0f} s")
    if "e" in box: raise box["e"]
    return box["r"]
def lcs(a, b):
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[j]))
        prev = cur
    return prev[-1]
def valid(a, b, s):
    assert all(isinstance(t, tuple) and len(t) == 2 and t[0] in "=-+" for t in s), "bad item format"
    assert [l for o, l in s if o in "=-"] == a, "script does not rebuild a"
    assert [l for o, l in s if o in "=+"] == b, "script does not rebuild b"
    return sum(1 for o, _ in s if o == "=")
def t():
    assert D([], []) == []
    assert valid(["x"], [], D(["x"], [])) == 0
    assert valid([], ["y"], D([], ["y"])) == 0
TESTS.append(("empty", t))
def t():
    a = "a b c a b b a".split(); b = "c b a b a c".split()
    assert valid(a, b, D(a, b)) == lcs(a, b) == 4
TESTS.append(("classic example", t))
def t():
    rnd = random.Random(5)
    for _ in range(300):
        a = [rnd.choice("abc") for _ in range(rnd.randint(0, 14))]
        b = [rnd.choice("abc") for _ in range(rnd.randint(0, 14))]
        assert valid(a, b, D(a, b)) == lcs(a, b), (a, b)
TESTS.append(("random small, repeated lines", t))
def t():
    rnd = random.Random(6)
    for _ in range(20):
        a = [rnd.choice("abcdefgh") for _ in range(rnd.randint(100, 200))]
        b = list(a)
        for _ in range(rnd.randint(1, 30)):
            i = rnd.randrange(len(b) + 1)
            if rnd.random() < 0.5 and b: b.pop(min(i, len(b) - 1))
            else: b.insert(i, rnd.choice("abcdefghxyz"))
        assert valid(a, b, D(a, b)) == lcs(a, b)
TESTS.append(("random medium vs LCS", t))
def t():
    rnd = random.Random(9)
    a = [f"line {i}" for i in range(20000)]
    b = list(a)
    dels = sorted(rnd.sample(range(20000), 25), reverse=True)
    for i in dels: b.pop(i)
    for k in range(25): b.insert(rnd.randrange(len(b) + 1), f"new {k}")
    s = timed(lambda: D(a, b), 4.0)
    assert valid(a, b, s) == 20000 - 25
TESTS.append(("performance 20k lines, 50 changes", t))
def t():
    a = [f"a{i}" for i in range(1000)]; b = [f"b{i}" for i in range(1000)]
    s = timed(lambda: D(a, b), 12.0)
    assert valid(a, b, s) == 0
TESTS.append(("performance 1000 vs 1000 all different", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
