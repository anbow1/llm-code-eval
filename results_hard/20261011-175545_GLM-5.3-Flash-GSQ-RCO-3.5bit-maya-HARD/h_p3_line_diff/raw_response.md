```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Shortest edit script between two lists of lines.

    Uses Myers' O((N+M)D) algorithm. Returns a list of ("=", line),
    ("-", line), ("+", line) tuples; "=" count equals the LCS length.
    """
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1          # diagonal k is stored at array index offset + k
    v = [0] * (2 * max_d + 3)   # zero-init provides Myers' v[1] = 0 sentinel
    trace = []                  # trace[d] = snapshot of v taken before iteration d
    found_d = -1

    # Forward pass: furthest-reaching D-path search.
    for d in range(max_d + 1):
        # Snapshot only the window of diagonals the backtrace will read.
        trace.append(v[offset - d - 1: offset + d + 2])
        lo = offset - d
        hi = offset + d
        for ki in range(lo, hi + 1, 2):
            if ki == lo or (ki != hi and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]           # "down" move: insertion from b
            else:
                x = v[ki - 1] + 1       # "right" move: deletion from a
            y = x - ki + offset
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break

    if found_d < 0:  # unreachable (trivial script always found at d = n + m)
        return [("-", line) for line in a] + [("+", line) for line in b]

    # Backtrack from (n, m) through the trace to build the script.
    script: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(found_d, 0, -1):
        t = trace[d]        # state of v after iteration d-1; window starts at k = -d-1
        k = x - y
        if k == -d or (k != d and t[k + d] < t[k + d + 2]):
            prev_k = k + 1  # the move into (x, y) was a "down" (insertion)
            down = True
        else:
            prev_k = k - 1  # the move into (x, y) was a "right" (deletion)
            down = False
        prev_x = t[prev_k + d + 1]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:    # walk the snake (kept lines) backwards
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if down:
            script.append(("+", b[y - 1]))
            y -= 1
        else:
            script.append(("-", a[x - 1]))
            x -= 1
    while x > 0 and y > 0:                  # remainder of the d = 0 snake
        script.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    script.reverse()
    return script
```