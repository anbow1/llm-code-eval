
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
import random, time
def brute_check(S, ops):
    grid = [False] * 60
    for op, lo, hi in ops:
        (S.add if op == "a" else S.remove)(lo, hi)
        for x in range(max(lo, 0), min(hi, 60)):
            grid[x] = op == "a"
    want, i = [], 0
    while i < 60:
        if grid[i]:
            j = i
            while j < 60 and grid[j]: j += 1
            want.append((i, j)); i = j
        else: i += 1
    return want
def t():
    S = S_mod.IntervalSet()
    S.add(1, 3); S.add(3, 5)
    assert S.intervals() == [(1, 5)], S.intervals()
    assert len(S) == 1 and S.total_length() == 4
TESTS.append(("merge touching", t))
def t():
    S = S_mod.IntervalSet(); S.add(0, 10); S.remove(3, 5)
    assert S.intervals() == [(0, 3), (5, 10)], S.intervals()
    assert S.contains(2.999) and not S.contains(3) and not S.contains(4.5) and S.contains(5) and not S.contains(10)
TESTS.append(("split + half-open", t))
def t():
    S = S_mod.IntervalSet(); S.add(5, 5); S.add(7, 2); S.remove(4, 4)
    assert S.intervals() == [] and len(S) == 0 and S.total_length() == 0
TESTS.append(("empty ranges ignored", t))
def t():
    S = S_mod.IntervalSet(); S.add(0.5, 1.25); S.add(2, 2.5); S.add(1.25, 2)
    assert S.intervals() == [(0.5, 2.5)] and abs(S.total_length() - 2.0) < 1e-12
TESTS.append(("floats", t))
def t():
    S = S_mod.IntervalSet()
    for lo in range(0, 20, 2): S.add(lo, lo + 1)
    S.add(-5, 30)
    assert S.intervals() == [(-5, 30)] and len(S) == 1
    S.remove(-10, 100)
    assert S.intervals() == []
TESTS.append(("swallow many", t))
def t():
    rnd = random.Random(7)
    for _ in range(300):
        S = S_mod.IntervalSet()
        ops = [(rnd.choice("aar"), *sorted((rnd.randint(0, 60), rnd.randint(0, 60)))) for _ in range(rnd.randint(1, 25))]
        want = brute_check(S, ops)
        assert S.intervals() == want, (ops, S.intervals(), want)
        assert S.total_length() == sum(h - l for l, h in want)
        for x in range(0, 60):
            assert S.contains(x) == any(l <= x < h for l, h in want)
TESTS.append(("random vs brute force", t))
def t():
    rnd = random.Random(8)
    starts = list(range(0, 60000 * 3, 3)); rnd.shuffle(starts)
    S = S_mod.IntervalSet()
    t0 = time.perf_counter()
    for n, s in enumerate(starts):
        S.add(s, s + 1)
        if n % 1000 == 0 and time.perf_counter() - t0 > 8.0:
            raise AssertionError(f"too slow: only {n} of 60000 add() calls in 8 s")
    hits = 0
    for n in range(200000):
        hits += S.contains(rnd.random() * 180000)
        if n % 5000 == 0 and time.perf_counter() - t0 > 8.0:
            raise AssertionError(f"too slow: only {n} of 200000 contains() calls in time")
    dt = time.perf_counter() - t0
    assert len(S) == 60000 and 55000 < hits < 78000, (len(S), hits)
    assert dt < 8.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 60k/200k", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
