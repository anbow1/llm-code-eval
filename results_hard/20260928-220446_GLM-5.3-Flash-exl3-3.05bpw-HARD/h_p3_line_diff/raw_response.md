```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b as (tag, line) tuples."""
    n, m = len(a), len(b)

    # Trim the common prefix and suffix (this preserves optimality).
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    out = []
    for i in range(p):
        out.append(("=", a[i]))
    out.extend(_myers(a[p:n - s], b[p:m - s]))
    out.extend(("=", a[i]) for i in range(n - s, n))
    return out


def _myers(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' O((N+M)*D) diff on the (already prefix/suffix-trimmed) middle."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", x) for x in b]
    if m == 0:
        return [("-", x) for x in a]

    # Forward pass, recording one snapshot of the frontier per d.
    v = {1: 0}
    trace = []
    d_final = None
    for d in range(n + m + 1):
        trace.append(v.copy())
        done = False
        for k in range(-d, d + 1, 2):
            if k == -d or v.get(k - 1, -1) < v.get(k + 1, -1):
                x = v[k + 1]
            else:
                x = v[k - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k] = x
            if x >= n and y >= m:
                done = True
                break
        if done:
            d_final = d
            break

    # Backtrack through the recorded frontiers to recover the script.
    res: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(d_final, 0, -1):
        v = trace[d]
        k = x - y
        if k == -d or v.get(k - 1, -1) < v.get(k + 1, -1):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k]
        prev_y = prev_x - prev_k
        # Undo the diagonal snake of this round.
        while x > prev_x and y > prev_y:
            res.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if prev_k == k + 1:
            # One y-only step: insertion.
            res.append(("+", b[prev_y]))
            y -= 1
        else:
            # One x-only step: deletion.
            res.append(("-", a[x - 1]))
            x -= 1
    # Level d == 0 consists only of diagonal steps.
    while x > 0 and y > 0:
        res.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    res.reverse()
    return res
```