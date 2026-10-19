```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script transforming a into b.

    Uses Myers' O((N+M)*D) algorithm. Each item is ("=", line), ("-", line)
    or ("+", line); the number of "=" items equals the LCS length.
    """
    # Encode lines as small ints so the hot comparison loops run on ints.
    ids: dict[str, int] = {}
    ai = [ids.setdefault(line, len(ids)) for line in a]
    bi = [ids.setdefault(line, len(ids)) for line in b]

    an, bn = len(ai), len(bi)

    # Strip the common prefix and suffix; they can always be matched as "=".
    p = 0
    while p < an and p < bn and ai[p] == bi[p]:
        p += 1
    s = 0
    while s < an - p and s < bn - p and ai[an - 1 - s] == bi[bn - 1 - s]:
        s += 1

    A = ai[p:an - s]
    B = bi[p:bn - s]
    As = a[p:an - s]
    Bs = b[p:bn - s]
    n, m = len(A), len(B)

    if n == 0:
        mid = [("+", line) for line in Bs]
    elif m == 0:
        mid = [("-", line) for line in As]
    else:
        max_d = n + m
        off = max_d + 1                # v[off + k] = furthest x on diagonal k
        v = [0] * (2 * max_d + 3)
        trace = []                     # trace[d] = snapshot of v before step d
        d = 0
        while True:
            trace.append(v[off - d - 1: off + d + 2])
            found = False
            for k in range(-d, d + 1, 2):
                if k == -d or (k != d and v[off + k - 1] < v[off + k + 1]):
                    x = v[off + k + 1]          # move down (insert from b)
                else:
                    x = v[off + k - 1] + 1      # move right (delete from a)
                y = x - k
                while x < n and y < m and A[x] == B[y]:
                    x += 1
                    y += 1
                v[off + k] = x
                if x >= n and y >= m:
                    found = True
                    break
            if found:
                break
            d += 1

        # Backtrack through the snapshots to recover the edit script
        # (built in reverse order).
        mid_rev: list[tuple[str, str]] = []
        x, y = n, m
        for d in range(len(trace) - 1, -1, -1):
            row = trace[d]                 # row[j] corresponds to k = j - (d + 1)
            k = x - y
            j = k + d + 1
            if k == -d or (k != d and row[j - 1] < row[j + 1]):
                pk = k + 1
            else:
                pk = k - 1
            px = row[pk + d + 1]           # furthest x on diagonal pk at step d-1
            py = px - pk
            while x > px and y > py:       # the diagonal snake of this step
                mid_rev.append(("=", As[x - 1]))
                x -= 1
                y -= 1
            if d:
                if x == px:                # came via a down move: insertion
                    mid_rev.append(("+", Bs[y - 1]))
                else:                      # came via a right move: deletion
                    mid_rev.append(("-", As[x - 1]))
                x, y = px, py
        mid_rev.reverse()
        mid = mid_rev

    out = [("=", a[i]) for i in range(p)]
    out += mid
    out += [("=", a[an - s + i]) for i in range(s)]
    return out
```