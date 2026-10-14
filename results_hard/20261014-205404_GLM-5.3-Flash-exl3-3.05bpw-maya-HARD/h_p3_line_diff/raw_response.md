```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' O((N+M)D) algorithm."""
    n = len(a)
    m = len(b)

    # Trim common prefix and suffix first (huge win when lists differ in few places).
    pre = 0
    while pre < n and pre < m and a[pre] == b[pre]:
        pre += 1
    suf = 0
    while suf < n - pre and suf < m - pre and a[n - 1 - suf] == b[m - 1 - suf]:
        suf += 1

    ca = a[pre:n - suf]
    cb = b[pre:m - suf]

    out = []
    for _ in range(pre):
        out.append(("=", a[len(out)]))
    # index bookkeeping: prefix "=" lines come from a[0:pre]
    out = [("=", a[i]) for i in range(pre)]
    out.extend(_myers_script(ca, cb))
    out.extend(("=", a[n - suf + i]) for i in range(suf))
    return out


def _myers_script(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Minimal edit script for a and b (after prefix/suffix trimming, a[0]!=b[0]
    and a[-1]!=b[-1] when both non-empty, but that is not required here)."""
    n = len(a)
    m = len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Fast path: no common lines at all -> LCS is empty, script is trivially minimal.
    if not (set(a) & set(b)):
        return [("-", line) for line in a] + [("+", line) for line in b]

    # Myers' O((N+M)D) forward algorithm with a trace for backtracking.
    # V is indexed by diagonal k + m, so all indices stay in [0, n+m].
    size = n + m + 1
    V = [0] * size
    trace = []  # trace[d] = copy of V after processing depth d
    delta = n - m

    # Initialisation: V[1] = 0 means the d=0, k=0 step starts at x=0.
    V[m + 1] = 0
    # d = 0: the initial snake on diagonal 0.
    x, y = 0, 0
    while x < n and y < m and a[x] == b[y]:
        x += 1
        y += 1
    V[m] = x
    trace.append(V[:])

    D = -1
    if x == n and y == m:
        D = 0

    d = 0
    while D < 0:
        d += 1
        # Clamp diagonals to the reachable range [-m, n] (keeps indices valid
        # and halves the work once d exceeds min(n, m)).
        lo = -d if d <= m else -m
        hi = d if d <= n else n
        if (lo + d) & 1:  # keep k == d (mod 2)
            lo += 1
        for k in range(lo, hi + 1, 2):
            if k <= -m:
                # cannot arrive horizontally into diagonal -m
                x = V[k + 1 + m]
            elif k >= n or k == d:
                # cannot arrive vertically (diagonal k+1 unreachable)
                x = V[k - 1 + m] + 1
            elif k == -d or V[k - 1 + m] < V[k + 1 + m]:
                x = V[k + 1 + m]
            else:
                x = V[k - 1 + m] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            V[k + m] = x
            if k == delta and x == n:
                # y == m automatically on diagonal delta; path complete.
                D = d
                trace.append(V[:])
                break
        else:
            trace.append(V[:])

    # Backtrack from (n, m) to (0, 0), collecting operations in reverse.
    ops = []
    x, y = n, m
    for dd in range(D, 0, -1):
        prev = trace[dd - 1]
        k = x - y
        if k <= -m:
            vertical = True
            x0 = prev[k + 1 + m]
        elif k >= n or k == dd:
            vertical = False
            x0 = prev[k - 1 + m] + 1
        elif k == -dd or prev[k - 1 + m] < prev[k + 1 + m]:
            vertical = True
            x0 = prev[k + 1 + m]
        else:
            vertical = False
            x0 = prev[k - 1 + m] + 1
        y0 = x0 - k
        # The diagonal slide from (x0, y0) to (x, y): "=" lines.
        for i in range(x - 1, x0 - 1, -1):
            ops.append(("=", a[i]))
        if vertical:
            ops.append(("+", b[y0 - 1]))
            x, y = x0, y0 - 1
        else:
            ops.append(("-", a[x0 - 1]))
            x, y = x0 - 1, y0

    # Depth 0: the initial snake from (0, 0) to (x, x).
    for i in range(x - 1, -1, -1):
        ops.append(("=", a[i]))

    ops.reverse()
    return ops
```