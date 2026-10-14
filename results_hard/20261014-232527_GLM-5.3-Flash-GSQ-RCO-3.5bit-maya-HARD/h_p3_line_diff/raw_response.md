```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between two lists of lines.

    Each item is ("=", line), ("-", line) or ("+", line) such that:
      - "=" and "-" items in order reproduce `a`,
      - "=" and "+" items in order reproduce `b`,
      - the number of "=" items equals the LCS length (minimal script).
    """
    n0, m0 = len(a), len(b)

    # Trim the common prefix and suffix; the Myers search then runs only
    # on the (typically small) differing middle part.
    p = 0
    while p < n0 and p < m0 and a[p] == b[p]:
        p += 1
    s = 0
    while s < n0 - p and s < m0 - p and a[n0 - 1 - s] == b[m0 - 1 - s]:
        s += 1

    core_a = a[p:n0 - s]
    core_b = b[p:m0 - s]

    script: list[tuple[str, str]] = [("", a[i]) for i in range(p)]
    script.extend(_myers_diff(core_a, core_b))
    script.extend(("", a[n0 - s + i]) for i in range(s))
    return script


def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' O((N+M)*D) shortest edit script for two non-empty-able lists."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Forward pass: record a snapshot of the frontier before each step d.
    v = {1: 0}  # v[k] = furthest x reachable on diagonal k
    trace: list[dict[int, int]] = []
    found_d = -1
    for d in range(n + m + 1):
        trace.append(dict(v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1] < v[k + 1]):
                x = v[k + 1]          # vertical move: consumes a line of b
            else:
                x = v[k - 1] + 1      # horizontal move: consumes a line of a
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break

    # Backward pass: reconstruct the edit script.
    script: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(found_d, 0, -1):
        vd = trace[d]  # frontier state before step d (i.e., after step d-1)
        k = x - y
        if k == -d or (k != d and vd[k - 1] < vd[k + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = vd[prev_k]
        prev_y = prev_x - prev_k
        # Walk back along the diagonal snake.
        while x > prev_x and y > prev_y:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        # The single non-diagonal step used to enter this diagonal.
        if x == prev_x:
            script.append(("+", b[y - 1]))
            y -= 1
        else:
            script.append(("-", a[x - 1]))
            x -= 1
    # Remaining common prefix of the trimmed cores (the d = 0 snake).
    while x > 0 and y > 0:
        script.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    script.reverse()
    return script
```