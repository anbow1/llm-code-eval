def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' O((N+M)D) algorithm."""
    n, m = len(a), len(b)

    # Trim common prefix / suffix (keeps the script minimal, speeds up typical inputs).
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    out: list[tuple[str, str]] = []
    for i in range(p):
        out.append(("=", a[i]))

    # Intern lines as small ints so the hot loops compare ints, not strings.
    table: dict[str, int] = {}
    ids = table.setdefault

    def encode(seq: list[str]) -> list[int]:
        res = []
        get = table.get
        nxt = len(table)
        for line in seq:
            v = get(line)
            if v is None:
                v = nxt
                table[line] = v
                nxt += 1
            res.append(v)
        return res

    core_a = encode(a[p:n - s])
    core_b = encode(b[p:m - s])

    ops: list[tuple] = []
    _diff(core_a, core_b, 0, 0, ops)

    for op in ops:
        tag = op[0]
        if tag == "=":
            out.append(("=", a[op[1]]))
        elif tag == "-":
            out.append(("-", a[op[1]]))
        else:
            out.append(("+", b[op[2]]))

    for i in range(n - s, n):
        out.append(("=", a[i]))
    return out


def _diff(ai: list[int], bi: list[int], abase: int, bbase: int,
          out: list[tuple]) -> None:
    """Emit index-based ops ('=', i, j) / ('-', i) / ('+', j) for the edit script."""
    # Work stack of tasks; task = ('d', a, b, abase, bbase) or ('e', op, ...).
    stack = [("d", ai, bi, abase, bbase)]
    pop = stack.pop
    push = stack.append
    while stack:
        task = pop()
        if task[0] == "e":
            out.append(task[1])
            continue
        _, a, b, ab, bb = task
        n = len(a)
        m = len(b)
        if n == 0:
            for j in range(m):
                out.append(("+", -1, bb + j))
            continue
        if m == 0:
            for i in range(n):
                out.append(("-", ab + i, -1))
            continue
        # Trim common prefix / suffix of this subproblem.
        p = 0
        while p < n and p < m and a[p] == b[p]:
            out.append(("=", ab + p, bb + p))
            p += 1
        s = 0
        while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
            s += 1
        if p:
            a = a[p:]
            b = b[p:]
            ab += p
            bb += p
            n -= p
            m -= p
        if s:
            a = a[:n - s]
            b = b[:m - s]
            n -= s
            m -= s
        if n == 0:
            for j in range(m):
                out.append(("+", -1, bb + j))
            continue
        if m == 0:
            for i in range(n):
                out.append(("-", ab + i, -1))
            continue

        found = _middle_snake(a, b, n, m)
        if found is None:  # defensive fallback; should not trigger
            for i in range(n):
                out.append(("-", ab + i, -1))
            for j in range(m):
                out.append(("+", -1, bb + j))
            continue
        d, x0, y0, x1, y1 = found
        if d > 1:
            mid = [("=", ab + i, bb + y0 + i) for i in range(x1 - x0)]
            push(("d", a[x1:], b[y1:], ab + x1, bb + y1))
            push(("e", mid))
            push(("d", a[:x0], b[:y0], ab, bb))
        elif d == 1:
            if n < m:
                ptr = 0
                for j in range(m):
                    if ptr < n and b[j] == a[ptr]:
                        out.append(("=", ab + ptr, bb + j))
                        ptr += 1
                    else:
                        out.append(("+", -1, bb + j))
            else:
                ptr = 0
                for i in range(n):
                    if ptr < m and a[i] == b[ptr]:
                        out.append(("=", ab + i, bb + ptr))
                        ptr += 1
                    else:
                        out.append(("-", ab + i, -1))
        else:  # d == 0: identical
            for i in range(n):
                out.append(("=", ab + i, bb + i))


def _middle_snake(a: list[int], b: list[int], n: int, m: int):
    """Find the middle snake. Returns (D, x0, y0, x1, y1) or None.

    The snake runs from (x0, y0) to (x1, y1); a[x0:x1] == b[y0:y1].
    """
    delta = n - m
    odd = delta & 1
    max_d = (n + m + 1) // 2
    off = max_d + 1
    size = 2 * max_d + 3
    vf = [0] * size
    vr = [0] * size

    for d in range(max_d + 1):
        # Forward pass on diagonal k (x - y = k).
        klo = -d
        khi = d
        lo = delta - d + 1
        hi = delta + d - 1
        for k in range(klo, khi + 1, 2):
            ki = k + off
            if k == klo or (k != khi and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            y = x - k
            sx = x
            sy = y
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            vf[ki] = x
            if lo <= k <= hi and x + vr[delta - k + off] >= n:
                return (2 * d - 1, sx, sy, x, y)
        # Reverse pass on diagonal kr (in reversed coordinates).
        lo = delta - d
        hi = delta + d
        for k in range(klo, khi + 1, 2):
            ki = k + off
            if k == klo or (k != khi and vr[ki - 1] < vr[ki + 1]):
                xr = vr[ki + 1]
            else:
                xr = vr[ki - 1] + 1
            yr = xr - k
            px = xr
            py = yr
            nmr = n - 1
            mmr = m - 1
            while xr < n and yr < m and a[nmr - xr] == b[mmr - yr]:
                xr += 1
                yr += 1
            vr[ki] = xr
            if lo <= k <= hi and xr + vf[delta - k + off] >= n:
                return (2 * d, n - xr, m - yr, n - px, m - py)
    return None
