def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a minimal (Myers) edit script between two lists of lines."""
    out: list[tuple[str, str]] = []
    n, m = len(a), len(b)

    # Trim common prefix.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        out.append(("=", a[p]))
        p += 1

    # Trim common suffix (without overlapping the prefix).
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    out.extend(_myers_middle(a[p:n - s], b[p:m - s]))

    for i in range(n - s, n):
        out.append(("=", a[i]))
    return out


def _myers_middle(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers O((N+M)*D) diff for two non-equal-at-the-ends sequences."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Fast path: no common line at all -> LCS is empty, script is trivial.
    if not (set(a) & set(b)):
        return [("-", line) for line in a] + [("+", line) for line in b]

    max_d = n + m
    off = max_d + 1
    v = [0] * (2 * max_d + 3)
    trace: list[list[int]] = []
    D = -1

    # Forward pass, recording the V array at the start of every d-round.
    for d in range(max_d + 1):
        trace.append(v[:])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + off] < v[k + 1 + off]):
                x = v[k + 1 + off]      # came from diagonal k+1 (insertion)
            else:
                x = v[k - 1 + off] + 1  # came from diagonal k-1 (deletion)
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k + off] = x
            if x >= n and y >= m:
                D = d
                break
        if D >= 0:
            break

    # Backtrack from (n, m) to (0, 0), emitting the script in reverse.
    script: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(D, 0, -1):
        vprev = trace[d]
        k = x - y
        if k == -d or (k != d and vprev[k - 1 + off] < vprev[k + 1 + off]):
            pk = k + 1
        else:
            pk = k - 1
        px = vprev[pk + off]
        py = px - pk
        while x > px and y > py:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if pk == k + 1:
            script.append(("+", b[y - 1]))
            y -= 1
        else:
            script.append(("-", a[x - 1]))
            x -= 1
    while x > 0 and y > 0:
        script.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    script.reverse()
    return script
