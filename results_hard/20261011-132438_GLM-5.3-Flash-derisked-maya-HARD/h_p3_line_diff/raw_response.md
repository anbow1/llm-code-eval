Here is an implementation of Myers' O((N+M)·D) algorithm with linear-space trace-based backtracking:

```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Map every distinct line to a small int id so equality checks are
    # cheap integer comparisons.
    ids = {}
    ea = []
    for line in a:
        i = ids.get(line)
        if i is None:
            i = len(ids)
            ids[line] = i
        ea.append(i)
    eb = []
    for line in b:
        i = ids.get(line)
        if i is None:
            i = len(ids)
            ids[line] = i
        eb.append(i)

    la, lb = len(ea), len(eb)
    lm = la if la < lb else lb

    # Trim the common prefix and suffix.
    p = 0
    while p < lm and ea[p] == eb[p]:
        p += 1
    s = 0
    while s < lm - p and ea[la - 1 - s] == eb[lb - 1 - s]:
        s += 1

    A = ea[p:la - s]
    B = eb[p:lb - s]
    n, m = len(A), len(B)

    out = []
    for i in range(p):
        out.append(("=", a[i]))

    if n or m:
        sa = set(A)
        if sa.isdisjoint(B):
            # No common lines at all: LCS is empty, delete everything
            # from a and insert everything from b.
            for i in range(n):
                out.append(("-", a[p + i]))
            for j in range(m):
                out.append(("+", b[p + j]))
        else:
            # Myers' O((N+M)*D) algorithm.
            maxD = n + m
            off = maxD  # V is indexed by k + off
            V = [0] * (2 * maxD + 1)
            trace = []
            d = 0
            while True:
                lo = off - d
                hi = off + d
                found = False
                for idx in range(lo, hi + 1, 2):
                    if idx == lo or (idx != hi and V[idx - 1] < V[idx + 1]):
                        x = V[idx + 1]
                    else:
                        x = V[idx - 1] + 1
                    y = x - idx + off
                    while x < n and y < m and A[x] == B[y]:
                        x += 1
                        y += 1
                    V[idx] = x
                    if x == n and y == m:
                        found = True
                        break
                # Store the frontier of step d (compactly) for backtracking.
                trace.append(array('i', V[lo:hi + 1]))
                if found:
                    dmax = d
                    break
                d += 1

            # Backtrack through the recorded frontiers, producing the edit
            # script in reverse order.
            mid = []
            d = dmax
            x, y = n, m
            while d > 0:
                Vprev = trace[d - 1]
                base = d - 1
                k = x - y
                if k == -d or (k != d and Vprev[k + base - 1] < Vprev[k + base + 1]):
                    pk = k + 1   # arrived via a "down" move (insertion)
                else:
                    pk = k - 1   # arrived via a "right" move (deletion)
                px = Vprev[pk + base]
                py = px - pk
                # Walk back over the diagonal (the snake): matched lines.
                while x > px and y > py:
                    x -= 1
                    y -= 1
                    mid.append(("=", a[p + x]))
                if pk == k + 1:
                    mid.append(("+", b[p + py]))
                else:
                    mid.append(("-", a[p + px]))
                x = px
                y = py
                d -= 1
            out.extend(reversed(mid))

    for i in range(la - s, la):
        out.append(("=", a[i]))
    return out
```

Key points:

- **Interning** lines to ints makes the inner snake comparison `A[x] == B[y]` an integer comparison even when equal lines are distinct string objects.
- **Prefix/suffix trimming** removes the trivial matched ends before running Myers.
- **Myers' algorithm** expands the edit-distance frontier one `d` at a time; the loop is guaranteed to stop by `d = n + m`. Each stored frontier is kept in a compact `array('i')` so memory stays at O(D²) words ≈ a few MB even for D ≈ 2000.
- **Backtracking** mirrors the forward decision exactly (including the strict `<` tie-breaking), emitting snake matches as `"="`, down moves as `"+"`, and right moves as `"-"`, then reverses the result.
- The **disjoint fast path** handles completely unrelated inputs in O(N+M) (LCS = 0, so delete-all/insert-all is minimal).
- The number of `"="` items equals `(N + M − D) / 2`, i.e. exactly the LCS length, so the script is minimal.