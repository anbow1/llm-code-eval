```python
def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d

    # v stores furthest-reaching x on each diagonal k = x - y.
    # Index in v is offset + k.
    v = [0] * (2 * max_d + 1)

    # trace[d] stores v from after d-1 edits, i.e. the state needed to
    # backtrack the d-th edit. trace[0] is unused.
    trace: list[list[int] | None] = [None]

    target_k = n - m
    found = False
    d = 0

    for d in range(max_d + 1):
        if d:
            lo = offset - d + 1
            hi = offset + d - 1
            trace.append(v[lo:hi + 1])

        for k in range(-d, d + 1, 2):
            idx = offset + k

            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1

            y = x - k

            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1

            v[idx] = x

            if k == target_k and x == n and y == m:
                found = True
                break

        if found:
            break

    if not found:
        # Should not happen for the Myers algorithm above, but keeps the
        # function total and returns a valid edit script.
        return [("-", line) for line in a] + [("+", line) for line in b]

    ops_rev: list[tuple[str, str]] = []
    x, y = n, m

    for d in range(d, 0, -1):
        k = x - y
        low = -d + 1
        snap = trace[d]

        if snap is None:
            break

        if k == -d or (k != d and snap[k + 1 - low] < snap[k - 1 - low]):
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = snap[prev_k - low]
        prev_y = prev_x - prev_k

        if prev_k == k + 1:
            start_x = prev_x
            start_y = prev_x - k
        else:
            start_x = prev_x + 1
            start_y = prev_x - prev_k

        while x > start_x and y > start_y:
            ops_rev.append(("=", a[x - 1]))
            x -= 1
            y -= 1

        if prev_k == k + 1:
            ops_rev.append(("+", b[prev_y]))
        else:
            ops_rev.append(("-", a[prev_x]))

        x, y = prev_x, prev_y

    # Undo any initial equal run, if present.
    while x > 0 or y > 0:
        if x > 0 and y > 0 and a[x - 1] == b[y - 1]:
            ops_rev.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        elif x > 0:
            ops_rev.append(("-", a[x - 1]))
            x -= 1
        else:
            ops_rev.append(("+", b[y - 1]))
            y -= 1

    ops_rev.reverse()
    return ops_rev


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n0 = len(a)
    m0 = len(b)

    # Safe fast path for trivial common prefix/suffix.
    p = 0
    while p < n0 and p < m0 and a[p] == b[p]:
        p += 1

    s = 0
    while p + s < n0 and p + s < m0 and a[n0 - 1 - s] == b[m0 - 1 - s]:
        s += 1

    if p == 0 and s == 0:
        return _myers_diff(a, b)

    result: list[tuple[str, str]] = []

    for i in range(p):
        result.append(("=", a[i]))

    mid_a = a[p:n0 - s]
    mid_b = b[p:m0 - s]
    result.extend(_myers_diff(mid_a, mid_b))

    for i in range(n0 - s, n0):
        result.append(("=", a[i]))

    return result
```