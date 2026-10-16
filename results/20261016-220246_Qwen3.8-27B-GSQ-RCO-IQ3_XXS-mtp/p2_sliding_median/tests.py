
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

import random, time, statistics
def brute(a, k):
    return [float(statistics.median(a[i:i+k])) for i in range(len(a)-k+1)]
def close(x, y):
    return len(x) == len(y) and all(abs(p-q) < 1e-9 for p, q in zip(x, y))
def t():
    got = S.sliding_median([1,3,-1,-3,5,3,6,7], 3)
    assert close(got, [1,-1,-1,3,5,6]), got
TESTS.append(("example odd k", t))
def t():
    got = S.sliding_median([1,2,3,4], 2)
    assert close(got, [1.5,2.5,3.5]), got
TESTS.append(("even k", t))
def t():
    assert close(S.sliding_median([5,1,4], 1), [5,1,4])
    assert close(S.sliding_median([5,1,4,2], 4), [3.0])
TESTS.append(("k=1 and k=n", t))
def t():
    a = [2,2,2,1,1,3,3,3,2]
    assert close(S.sliding_median(a, 4), brute(a, 4))
TESTS.append(("duplicates", t))
def t():
    rnd = random.Random(1)
    for _ in range(40):
        n = rnd.randint(1, 60); k = rnd.randint(1, n)
        a = [rnd.randint(-20, 20) for _ in range(n)]
        assert close(S.sliding_median(a, k), brute(a, k)), (a, k)
TESTS.append(("random vs brute force", t))
def t():
    for k in (0, 5):
        try:
            S.sliding_median([1,2,3], k)
        except ValueError:
            continue
        raise AssertionError(f"k={k}: expected ValueError")
TESTS.append(("invalid k", t))
def t():
    rnd = random.Random(2)
    a = [rnd.random() for _ in range(200_000)]
    t0 = time.perf_counter()
    out = S.sliding_median(a, 1000)
    dt = time.perf_counter() - t0
    assert len(out) == 199_001
    assert dt < 5.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 200k/1000", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
