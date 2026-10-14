from array import array


def _diff_core(a, b):
    n = len(a)
    m = len(b)

    if n == 0:
        return [('+', line) for line in b]
    if m == 0:
        return [('-', line) for line in a]

    # Fast path for disjoint contents: the optimal script has no '=' items.
    if n <= m:
        small, large = a, b
    else:
        small, large = b, a
    try:
        if set(small).isdisjoint(large):
            out = [('-', line) for line in a]
            out.extend(('+', line) for line in b)
            return out
    except TypeError:
        pass

    maxd = n + m
    off = maxd
    v = [0] * (2 * maxd + 1)

    # Flat storage for Myers V tables: level d is stored at trace_offsets[d].
    trace = array('I')
    trace_offsets = []

    aa = a
    bb = b

    for d in range(maxd + 1):
        for k in range(-d, d + 1, 2):
            idx = off + k

            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1

            y = x - k

            while x < n and y < m and aa[x] == bb[y]:
                x += 1
                y += 1

            v[idx] = x

            if x >= n and y >= m:
                if d == 0:
                    return [('=', line) for line in aa]
                return _build_edits(aa, bb, trace, trace_offsets, d)

        trace_offsets.append(len(trace))
        trace.extend(v[off - d: off + d + 1])

    # The Myers loop should always find a path; this is only a safety fallback.
    out = [('-', line) for line in a]
    out.extend(('+', line) for line in b)
    return out


def _build_edits(a, b, trace, trace_offsets, D):
    x = len(a)
    y = len(b)
    out = []

    for d in range(D, 0, -1):
        k = x - y
        prev_d = d - 1
        base = trace_offsets[prev_d]

        # Must match the tie-breaking rule used in the forward pass.
        if k == -d or (k != d and trace[base + k + d - 2] < trace[base + k + d]):
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = trace[base + prev_k + prev_d]
        prev_y = prev_x - prev_k

        # Undo the diagonal snake.
        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
            out.append(('=', a[x]))

        # Undo the single edit that preceded the snake.
        if prev_k == k + 1:
            y -= 1
            out.append(('+', b[y]))
        else:
            x -= 1
            out.append(('-', a[x]))

        x = prev_x
        y = prev_y

    # Initial common prefix, if any.
    while x > 0 and y > 0:
        x -= 1
        y -= 1
        out.append(('=', a[x]))

    out.reverse()
    return out


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Common prefix is always safe to keep unchanged.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1

    if p == n and p == m:
        return [('=', line) for line in a]

    # Non-overlapping common suffix is also safe to keep unchanged.
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    if p == 0 and s == 0:
        return _diff_core(a, b)

    mid_a = a[p:n - s] if s else a[p:]
    mid_b = b[p:m - s] if s else b[p:]
    mid = _diff_core(mid_a, mid_b)

    out = []
    for i in range(p):
        out.append(('=', a[i]))
    out.extend(mid)
    if s:
        for i in range(n - s, n):
            out.append(('=', a[i]))
    return out
