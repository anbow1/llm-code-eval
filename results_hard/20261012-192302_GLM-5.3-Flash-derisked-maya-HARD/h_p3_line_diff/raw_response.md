```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Strip common prefix.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1

    # Strip common suffix.
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    result = [('=', line) for line in a[:p]]

    ta = a[p:n - s]
    tb = b[p:m - s]
    if ta:
        if tb:
            result.extend(_myers_script(ta, tb))
        else:
            result.extend(('-', line) for line in ta)
    else:
        result.extend(('+', line) for line in tb)

    result.extend(('=', line) for line in a[n - s:])
    return result


def _myers_script(a, b):
    # Myers' O((N+M)*D) algorithm on two non-empty, already prefix/suffix
    # stripped sequences.  Returns a minimal edit script for them.
    n = len(a)
    m = len(b)

    # Intern lines as small integers for fast equality tests in the snake loop.
    codes = {}
    ia = []
    ib = []
    for seq, out in ((a, ia), (b, ib)):
        for line in seq:
            c = codes.get(line)
            if c is None:
                c = len(codes)
                codes[line] = c
            out.append(c)

    off = n + m
    v = [0] * (2 * off + 1)
    trace = []
    D = None
    for d in range(off + 1):
        # Snapshot the state after step d-1 (valid diagonals: |k| <= d-1).
        trace.append(v[off - d + 1: off + d + 1])
        for k in range(-d, d + 1, 2):
            idx = k + off
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]          # arrived from diagonal k+1 (insertion)
            else:
                x = v[idx - 1] + 1      # arrived from diagonal k-1 (deletion)
            y = x - k
            while x < n and y < m and ia[x] == ib[y]:
                x += 1
                y += 1
            v[idx] = x
        if v[off + n - m] == n:
            D = d
            break

    # Backtrack through the snapshots, building the script in reverse.
    moves = []
    x, y = n, m
    for d in range(D, 0, -1):
        vs = trace[d]                   # state after step d-1
        k = x - y
        if k == -d or (k != d and vs[k + d - 2] < vs[k + d]):
            # Came from diagonal k+1 via an insertion of b line py.
            prev_x = vs[k + d]
            py = prev_x - (k + 1)
            i = x - 1
            while i >= prev_x:          # snake: a[i] == b[i - k]
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('+', b[py]))
            x, y = prev_x, py
        else:
            # Came from diagonal k-1 via a deletion of a line prev_x.
            prev_x = vs[k + d - 2]
            py = prev_x - (k - 1)
            i = x - 1
            while i > prev_x:           # snake: a[i] == b[i - k]
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('-', a[prev_x]))
            x, y = prev_x, py
    # Whatever remains is the initial snake on diagonal 0 (all matches).
    while x > 0 and y > 0:
        moves.append(('=', a[x - 1]))
        x -= 1
        y -= 1
    moves.reverse()
    return moves
```