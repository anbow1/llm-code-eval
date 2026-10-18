def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between two line lists.

    Each item is ("=", line) for lines kept from both, ("-", line) for a line
    only in `a`, ("+", line) for a line only in `b`.  The number of "=" items
    equals the length of the longest common subsequence, so the script is
    minimal.  Uses Myers' O((N+M)D) algorithm.
    """
    n = len(a)
    m = len(b)

    # Strip the common prefix and suffix; those lines are always kept
    # verbatim, and trimming never changes an optimal script.  This makes
    # large, nearly identical inputs fast.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    out = [("=", line) for line in a[:p]]

    mid_a = a[p:n - s]
    mid_b = b[p:m - s]
    if not mid_a:
        out.extend(("+", line) for line in mid_b)
    elif not mid_b:
        out.extend(("-", line) for line in mid_a)
    else:
        out.extend(_edit_script(mid_a, mid_b))

    out.extend(("=", line) for line in a[n - s:])
    return out


def _edit_script(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Myers' algorithm on the (non-empty) trimmed middles."""
    n = len(a)
    m = len(b)
    max_d = n + m
    off = max_d                     # index of diagonal k in v is k + off
    v = [0] * (2 * max_d + 1)
    trace = []                      # trace[d] = furthest points at depth d-1
    target = off + n - m

    for d in range(max_d + 1):
        # Snapshot the entries that can still matter (k in [-(d-1), d-1]).
        trace.append(v[off - d + 1:off + d])
        for k in range(-d, d + 1, 2):
            kk = k + off
            if k == -d or (k != d and v[kk - 1] < v[kk + 1]):
                x = v[kk + 1]       # move down (insertion from b)
            else:
                x = v[kk - 1] + 1   # move right (deletion from a)
            y = x - k
            # Follow the diagonal as far as possible.
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[kk] = x
            if kk == target and x == n:
                return _backtrack(a, b, trace)
    return _backtrack(a, b, trace)  # unreachable in theory


def _backtrack(a: list[str], b: list[str], trace: list[list[int]]) -> list[tuple[str, str]]:
    """Reconstruct the edit script from the Myers trace.  Output is built
    backwards and reversed at the end."""
    x = len(a)
    y = len(b)
    out: list[tuple[str, str]] = []

    for d in range(len(trace) - 1, 0, -1):
        snap = trace[d]             # furthest points at depth d-1
        base = d - 1                # diagonal k is stored at index k + base
        k = x - y
        if k == -d or (k != d and snap[k - 1 + base] < snap[k + 1 + base]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = snap[prev_k + base]
        prev_y = prev_x - prev_k

        # Unwind the diagonal run (kept lines).
        while x > prev_x and y > prev_y:
            out.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        # The single non-diagonal step taken at depth d.
        if x == prev_x:             # came from above: insertion
            out.append(("+", b[y - 1]))
            y -= 1
        else:                       # came from the left: deletion
            out.append(("-", a[x - 1]))
            x -= 1

    # Depth 0: whatever remains lies on diagonal 0.
    while x > 0:
        out.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    out.reverse()
    return out
