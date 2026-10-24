def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a minimal (Myers) edit script between two line lists."""
    n, m = len(a), len(b)

    # Strip the common prefix (this never reduces the LCS length).
    start = 0
    limit = n if n < m else m
    while start < limit and a[start] == b[start]:
        start += 1

    # Strip the common suffix, but never overlap the stripped prefix.
    end_a, end_b = n, m
    while end_a > start and end_b > start and a[end_a - 1] == b[end_b - 1]:
        end_a -= 1
        end_b -= 1

    result: list[tuple[str, str]] = [("=", line) for line in a[:start]]
    result.extend(_middle_diff(a[start:end_a], b[start:end_b]))
    result.extend(("=", line) for line in a[end_a:])
    return result


def _middle_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' O((N+M)*D) shortest edit script for the middle segments."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Intern lines as small integers so the inner loops compare ints.
    ids: dict[str, int] = {}
    setdefault = ids.setdefault
    a_ids = [setdefault(line, len(ids)) for line in a]
    b_ids = [setdefault(line, len(ids)) for line in b]

    max_d = n + m
    off = max_d                      # offset so k in [-max_d, max_d] >= 0
    v = [0] * (2 * max_d + 1)        # furthest-reaching x per diagonal k
    trace: list[list[int]] = []      # snapshot of v before each round d
    d_final = -1

    # Forward pass: find the smallest D with a D-path reaching (n, m).
    for d in range(max_d + 1):
        trace.append(v[:])
        for k in range(-d, d + 1, 2):
            idx = off + k
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]       # down move (insertion from b)
            else:
                x = v[idx - 1] + 1   # right move (deletion from a)
            y = x - k
            while x < n and y < m and a_ids[x] == b_ids[y]:
                x += 1
                y += 1
            v[idx] = x
            if x >= n and y >= m:
                d_final = d
                break
        if d_final >= 0:
            break

    # Backtrack through the snapshots to rebuild the script (in reverse).
    script: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(d_final, 0, -1):
        vd = trace[d]
        k = x - y
        if k == -d or (k != d and vd[off + k - 1] < vd[off + k + 1]):
            pk = k + 1               # arrived via an insertion from b
        else:
            pk = k - 1               # arrived via a deletion from a
        px = vd[off + pk]
        py = px - pk
        while x > px and y > py:     # unwind the diagonal snake
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if y > py:                   # vertical step: a line of b
            script.append(("+", b[y - 1]))
            y -= 1
        else:                        # horizontal step: a line of a
            script.append(("-", a[x - 1]))
            x -= 1
    while x > 0 and y > 0:           # snake of the d == 0 round
        script.append(("=", a[x - 1]))
        x -= 1
        y -= 1
    script.reverse()
    return script
