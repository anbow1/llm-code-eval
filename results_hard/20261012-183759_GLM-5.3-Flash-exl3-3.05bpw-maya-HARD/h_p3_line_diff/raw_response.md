```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' O((N+M)*D) algorithm."""
    n0, m0 = len(a), len(b)

    # ---- trivial cases ---------------------------------------------------
    if n0 == 0:
        return [("+", line) for line in b]
    if m0 == 0:
        return [("-", line) for line in a]

    # ---- map lines to small ints (fast equality) -------------------------
    ids: dict = {}

    def _ids(lines):
        return [ids.setdefault(line, len(ids)) for line in lines]

    a_ids = _ids(a)
    b_ids = _ids(b)

    # ---- trim common prefix / suffix -------------------------------------
    pre = 0
    while pre < n0 and pre < m0 and a_ids[pre] == b_ids[pre]:
        pre += 1
    suf = 0
    while (suf < n0 - pre and suf < m0 - pre
           and a_ids[n0 - 1 - suf] == b_ids[m0 - 1 - suf]):
        suf += 1

    mid_script = []
    n = n0 - pre - suf
    m = m0 - pre - suf
    if n == 0:
        mid_script = [("+", b_ids and None) for _ in ()]  # placeholder, replaced below
        mid_script = [("+", b[pre + i]) for i in range(m)]
    elif m == 0:
        mid_script = [("-", a[pre + i]) for i in range(n)]
    elif not (set(a_ids[pre:pre + n]) & set(b_ids[pre:pre + m])):
        # no common lines at all -> LCS length 0 -> D = n + m
        mid_script = [("-", a[pre + i]) for i in range(n)]
        mid_script += [("+", b[pre + i]) for i in range(m)]
    else:
        mid_script = _myers(a, b, a_ids, b_ids, pre, n, m)

    result = [("=", a[i]) for i in range(pre)]
    result.extend(mid_script)
    result.extend(("=", a[n0 - 1 - i]) for i in range(suf - 1, -1, -1))
    return result


def _myers(a, b, a_ids, b_ids, pre, n, m):
    """Myers' greedy algorithm on a[pre:pre+n] vs b[pre:pre+m].

    Trace layout: flat[d*d : d*d + 2*d + 1] holds, for step d, the
    furthest-reaching x for diagonals k in [-d, d] at index d*d + (k + d).
    Total trace size is (D+1)^2 entries.
    """
    ai = a_ids
    bi = b_ids
    off = pre  # ids lists are indexed from 0; slices taken below

    # work on slices to keep local-variable lookups fast
    av = ai[pre:pre + n]
    bv = bi[pre:pre + m]

    flat: list = [0] * ((n + m + 2) * 2)  # will grow; generous start is unnecessary
    flat = []                             # use append/extend growth instead
    max_d = n + m

    D = -1
    # d = 0
    x, y = 0, 0
    while x < n and y < m and av[x] == bv[y]:
        x += 1
        y += 1
    flat.append(x)
    if x == n and y == m:
        D = 0

    if D < 0:
        found = False
        for d in range(1, max_d + 1):
            wb = d * (d + 1)          # write base: index = wb + k
            rb = d * (d - 1)          # read base (window d-1): index = rb + k'
            lo = max(-d, d - m)       # keep y = x - k within [0, m] as x >= 0
            hi = min(d, n + d)        # keep x = ... within bounds (k <= n)
            if lo > -d:
                lo = -d if lo > -d else lo
            # clamp to the meaningful diagonal range [-(m - 0) .. n] via x,y bounds:
            lo = -d if -d > -(m) else -m
            hi = d if d < n else n
            if lo < -d:
                lo = -d
            if hi > d:
                hi = d
            for k in range(lo, hi + 1, 2):
                if k == -d:
                    x = flat[rb + k + 1]
                elif k == d:
                    x = flat[rb + k - 1] + 1
                else:
                    xm = flat[rb + k - 1]
                    xp = flat[rb + k + 1]
                    x = xp if xm < xp else xm + 1
                y = x - k
                while x < n and y < m and av[x] == bv[y]:
                    x += 1
                    y += 1
                flat[wb + k] = x
                if x == n and y == m:
                    D = d
                    found = True
                    break
            if found:
                break

    # ---- backtrack --------------------------------------------------------
    script: list = []
    x, y = n, m
    for d in range(D, 0, -1):
        k = x - y
        rb = d * (d - 1)
        if k == -d:
            down = True
        elif k == d:
            down = False
        else:
            down = flat[rb + k - 1] < flat[rb + k + 1]
        if down:
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = flat[rb + prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", a[pre + x - 1]))
            x -= 1
            y -= 1
        if down:
            script.append(("+", b[pre + y - 1]))
            y -= 1
        else:
            script.append(("-", a[pre + x - 1]))
            x -= 1

    script.reverse()
    return script
```