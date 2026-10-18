def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' O((N+M)*D) algorithm."""
    n, m = len(a), len(b)

    # Trim the common prefix and suffix.  Matching equal first/last lines
    # never reduces the LCS length, so this keeps the script minimal while
    # shrinking the problem for Myers.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    core_ops = _myers_diff(a[p:n - s], b[p:m - s])

    head = [("=", line) for line in a[:p]]
    tail = [("=", line) for line in a[n - s:]]
    return head + core_ops + tail


def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' greedy diff on the (already prefix/suffix-trimmed) cores."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    off = max_d  # offset so diagonal k lives at index off + k
    V = [0] * (2 * max_d + 1)
    history = []  # history[d] = furthest-reaching x for k = -d, -d+2, ..., d
    final_d = -1

    for d in range(max_d + 1):
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[off + k - 1] < V[off + k + 1]):
                x = V[off + k + 1]          # down move (insertion from b)
            else:
                x = V[off + k - 1] + 1      # right move (deletion from a)
            y = x - k
            while x < n and y < m and a[x] == b[y]:  # follow the snake
                x += 1
                y += 1
            V[off + k] = x
            if x >= n and y >= m:
                final_d = d
                break
        if final_d >= 0:
            break
        history.append(V[off - d:off + d + 1:2])

    # Backtrack through the stored V-arrays to recover the edit path.
    ops: list[tuple[str, str]] = []
    x, y = n, m
    d = final_d
    while d > 0:
        prev = history[d - 1]
        half = d - 1  # prev holds diagonals -(d-1), -(d-1)+2, ..., d-1
        k = x - y
        if k == -d or (k != d and prev[(k - 1 + half) // 2] < prev[(k + 1 + half) // 2]):
            # Came from diagonal k+1 via a down move: insertion of b[py].
            px = prev[(k + 1 + half) // 2]
            py = px - (k + 1)
            ops.append(("+", b[py]))
            for i in range(py + 1, y):  # the snake after the edit
                ops.append(("=", b[i]))
        else:
            # Came from diagonal k-1 via a right move: deletion of a[px].
            px = prev[(k - 1 + half) // 2]
            py = px - (k - 1)
            ops.append(("-", a[px]))
            for i in range(px + 1, x):  # the snake after the edit
                ops.append(("=", a[i]))
        x, y = px, py
        d -= 1

    # Remaining snake from (0, 0) at depth 0.
    for i in range(x - 1, -1, -1):
        ops.append(("=", a[i]))

    ops.reverse()
    return ops
