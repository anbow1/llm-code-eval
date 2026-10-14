```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Trim the common prefix (cheap, and keeps Myers' problem small).
    pre = 0
    limit = n if n < m else m
    while pre < limit and a[pre] == b[pre]:
        pre += 1

    # Trim the common suffix.
    suf = 0
    limit2 = n - pre
    if m - pre < limit2:
        limit2 = m - pre
    while suf < limit2 and a[n - 1 - suf] == b[m - 1 - suf]:
        suf += 1

    a_mid = a[pre:n - suf]
    b_mid = b[pre:m - suf]

    # Replace lines by small integers so all comparisons inside Myers are
    # comparisons of (cached) ints, which is very fast in CPython.
    pool: dict[str, int] = {}
    ids_a = [pool.setdefault(line, len(pool)) for line in a_mid]
    ids_b = [pool.setdefault(line, len(pool)) for line in b_mid]

    result = [("=", line) for line in a[:pre]]
    result.extend(_myers(ids_a, ids_b, a_mid, b_mid))
    result.extend(("=", line) for line in a[n - suf:])
    return result


def _myers(a, b, alines, blines):
    """Myers' O((N+M)*D) shortest-edit-script algorithm.

    a, b are lists of ints (canonical ids); alines, blines the original
    line strings used for building the output. Returns the edit script
    for the two lists as a list of ('=', x) / ('-', x) / ('+', x) tuples.
    """
    n = len(a)
    m = len(b)
    if n == 0:
        return [("+", x) for x in blines]
    if m == 0:
        return [("-", x) for x in alines]

    max_d = n + m
    off = max_d                      # k + off is always a valid index
    v = [0] * (2 * max_d + 1)        # v[k] = furthest x reached on diagonal k
    trace = []                       # snapshot of v before each step d

    for d in range(max_d + 1):
        trace.append(v[off - d: off + d + 1])
        for k in range(-d, d + 1, 2):
            idx = k + off
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]       # move down: insertion
            else:
                x = v[idx - 1] + 1   # move right: deletion
            y = x - k
            # Follow the diagonal ("snake") as far as possible.
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[idx] = x
            if x == n and y == m:
                return _backtrack(trace, d, alines, blines, n, m)
    return []  # unreachable


def _backtrack(trace, d_final, alines, blines, n, m):
    script = []
    x = n
    y = m
    for d in range(d_final, 0, -1):
        v_prev = trace[d]            # local index of diagonal k is k + d
        k = x - y
        if k == -d or (k != d and v_prev[k - 1 + d] < v_prev[k + 1 + d]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[prev_k + d]
        prev_y = prev_x - prev_k

        # Undo the diagonal ("=") moves of this step.
        while x > prev_x and y > prev_y:
            script.append(("=", alines[x - 1]))
            x -= 1
            y -= 1

        # Exactly one non-diagonal move remains.
        if x == prev_x:
            script.append(("+", blines[y - 1]))
            y -= 1
        else:
            script.append(("-", alines[x - 1]))
            x -= 1

    # Diagonal moves belonging to step 0 (starting from (0, 0)).
    while x > 0 and y > 0:
        script.append(("=", alines[x - 1]))
        x -= 1
        y -= 1

    script.reverse()
    return script
```