def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' algorithm."""
    # Map lines to small integers so comparisons are cheap even with repeats.
    enc: dict[str, int] = {}
    uniq: list[str] = []

    def _encode(lines: list[str]) -> list[int]:
        out = []
        push = out.append
        get = enc.get
        for ln in lines:
            i = get(ln)
            if i is None:
                i = len(uniq)
                enc[ln] = i
                uniq.append(ln)
            push(i)
        return out

    ia = _encode(a)
    ib = _encode(b)
    n = len(ia)
    m = len(ib)

    # Trim common prefix and suffix (preserves minimality, speeds things up).
    p = 0
    while p < n and p < m and ia[p] == ib[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and ia[n - 1 - s] == ib[m - 1 - s]:
        s += 1

    result: list[tuple[str, str]] = [("=", ln) for ln in a[:p]]

    ca = ia[p:n - s]
    cb = ib[p:m - s]
    if ca or cb:
        la = a[p:n - s]
        lb = b[p:m - s]
        result.extend(_diff_core(ca, cb, la, lb))

    result.extend(("=", ln) for ln in a[n - s:])
    return result


def _diff_core(ca: list[int], cb: list[int], la: list[str], lb: list[str]) -> list[tuple[str, str]]:
    """Myers' O((N+M)*D) diff on integer-encoded cores, with path reconstruction."""
    n = len(ca)
    m = len(cb)
    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)
    trace = []  # trace[d-1] holds the furthest-reaching x for diagonals -(d-1)..(d-1)
    D = 0

    for d in range(max_d + 1):
        found = False
        for k in range(-d, d + 1, 2):
            km = k - 1 + off
            kp = k + 1 + off
            if k == -d or (k != d and v[km] < v[kp]):
                x = v[kp]        # down move (from diagonal k+1)
            else:
                x = v[km] + 1    # right move (from diagonal k-1)
            y = x - k
            while x < n and y < m and ca[x] == cb[y]:
                x += 1
                y += 1
            v[k + off] = x
            if x >= n and y >= m:
                found = True
                break
        if found:
            D = d
            break
        trace.append(v[off - d: off + d + 1])

    # Backtrack from (n, m) to (0, 0), emitting script items in reverse.
    script: list[tuple[str, str]] = []
    x = n
    y = m
    for d in range(D, 0, -1):
        prev = trace[d - 1]
        k = x - y
        if k == -d or (k != d and prev[k + d] < prev[k + d - 2]):
            # Came by a down move from diagonal k+1 at depth d-1.
            px = prev[k + d]
            i = x - 1
            while i >= px:               # snake equals: a[px .. x-1]
                script.append(("=", la[i]))
                i -= 1
            script.append(("+", lb[px - k - 1]))
            x = px
            y = px - k - 1
        else:
            # Came by a right move from diagonal k-1 at depth d-1.
            px = prev[k + d - 2]
            i = x - 1
            while i > px:                # snake equals: a[px+1 .. x-1]
                script.append(("=", la[i]))
                i -= 1
            script.append(("-", la[px]))
            x = px
            y = px - k + 1
    # Remaining snake on diagonal 0 back to the origin.
    while x > 0 and y > 0:
        script.append(("=", la[x - 1]))
        x -= 1
        y -= 1
    script.reverse()
    return script
