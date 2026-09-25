
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

import random, time, itertools
def smallest(n, edges):
    for p in itertools.permutations(range(n)):
        pos = {v: i for i, v in enumerate(p)}
        if all(pos[a] < pos[b] for a, b in edges):
            return list(p)
    return None
def t():
    assert S.topo_order(0, []) == []
    assert S.topo_order(3, []) == [0, 1, 2]
TESTS.append(("empty / no edges", t))
def t():
    assert S.topo_order(4, [(3, 0)]) == [1, 2, 3, 0]
TESTS.append(("lexicographic", t))
def t():
    assert S.topo_order(3, [(2, 1), (2, 1), (1, 0)]) == [2, 1, 0]
TESTS.append(("duplicate edges", t))
def t():
    for n, e in [(1, [(0, 0)]), (3, [(0, 1), (1, 2), (2, 0)]), (4, [(0, 1), (2, 3), (3, 2)])]:
        try:
            S.topo_order(n, e)
        except ValueError:
            continue
        raise AssertionError(f"no ValueError for {e}")
TESTS.append(("cycles", t))
def t():
    rnd = random.Random(3)
    for _ in range(60):
        n = rnd.randint(1, 6)
        perm = list(range(n)); rnd.shuffle(perm)
        edges = []
        for _ in range(rnd.randint(0, 8)):
            i, j = sorted(rnd.sample(range(n), 2)) if n > 1 else (0, 0)
            if i != j:
                edges.append((perm[i], perm[j]))
        assert S.topo_order(n, edges) == smallest(n, edges), (n, edges)
TESTS.append(("random vs brute force", t))
def t():
    rnd = random.Random(4)
    n = 200_000
    perm = list(range(n)); rnd.shuffle(perm)
    edges = []
    for _ in range(400_000):
        i = rnd.randrange(n - 1); j = rnd.randrange(i + 1, min(n, i + 50))
        edges.append((perm[i], perm[j]))
    t0 = time.perf_counter()
    out = S.topo_order(n, edges)
    dt = time.perf_counter() - t0
    pos = [0] * n
    for idx, v in enumerate(out):
        pos[v] = idx
    assert len(out) == n and all(pos[a] < pos[b] for a, b in edges)
    assert dt < 5.0, f"too slow: {dt:.1f}s"
TESTS.append(("performance 200k/400k", t))

res = []
for name, fn in TESTS:
    try:
        fn(); res.append([name, True, ""])
    except Exception as e:
        msg = IMPORT_ERR if S is None else f"{type(e).__name__}: {e}"
        res.append([name, False, str(msg)[:300]])
print("@@RESULT@@" + json.dumps(res))
