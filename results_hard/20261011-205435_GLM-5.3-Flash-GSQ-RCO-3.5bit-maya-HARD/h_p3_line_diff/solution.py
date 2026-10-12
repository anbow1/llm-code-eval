def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between two lists of lines.

    Uses Myers' O((N+M)D) algorithm, so the number of "=" items equals the
    length of the longest common subsequence (the script is minimal).
    """
    n = len(a)
    m = len(b)

    # Trim the common prefix and suffix: they are always part of some LCS,
    # so trimming preserves both correctness and minimality, and it keeps the
    # Myers search small for large, nearly identical inputs.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    script: list[tuple[str, str]] = [("=", line) for line in a[:p]]
    script.extend(_myers_script(a[p:n - s], b[p:m - s]))
    script.extend(("=", line) for line in a[n - s:])
    return script


def _myers_script(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' O((N+M)D) diff for the core (non-empty) parts of two lists."""
    n = len(a)
    m = len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)
    trace: list[list[int]] = []
    d_final = -1

    # Forward pass: record the furthest-reaching x per diagonal for each d.
    for d in range(max_d + 1):
        trace.append(v[off - d:off + d + 1])
        for k in range(-d, d + 1, 2):
            ki = k + off
            if k == -d or (k != d and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]          # arrived via a down move ("+")
            else:
                x = v[ki - 1] + 1      # arrived via a right move ("-")
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                d_final = d
                break
        if d_final >= 0:
            break

    # Backtrack from the goal to the origin, emitting the script in reverse.
    script: list[tuple[str, str]] = []
    x = n
    y = m
    for d in range(d_final, 0, -1):
        vp = trace[d]  # v-state before step d; vp[j] is diagonal (j - d)
        k = x - y
        if k == -d or (k != d and vp[k - 1 + d] < vp[k + 1 + d]):
            pk = k + 1
        else:
            pk = k - 1
        px = vp[pk + d]
        py = px - pk
        while x > px and y > py:       # retrace the diagonal snake
            x -= 1
            y -= 1
            script.append(("=", a[x]))
        if x == px:                    # the non-diagonal move was a down move
            script.append(("+", b[y - 1]))
            y = py
        else:                          # the non-diagonal move was a right move
            script.append(("-", a[x - 1]))
            x = px
    while x > 0 and y > 0:             # remainder of the d = 0 snake
        x -= 1
        y -= 1
        script.append(("=", a[x]))
    script.reverse()
    return script
