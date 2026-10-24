def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a minimal edit script between lines a and b using Myers' algorithm."""
    out = []
    stack = [(0, len(a), 0, len(b))]  # regions to diff (DFS: pop order = output order)
    while stack:
        lo_a, hi_a, lo_b, hi_b = stack.pop()
        # Common prefix -> "=" items emitted immediately (they precede this region's rest).
        while lo_a < hi_a and lo_b < hi_b and a[lo_a] == b[lo_b]:
            out.append(("=", a[lo_a]))
            lo_a += 1
            lo_b += 1
        # Common suffix -> "=" items that must come after the middle part.
        end_a = hi_a
        while lo_a < hi_a and lo_b < hi_b and a[hi_a - 1] == b[hi_b - 1]:
            hi_a -= 1
            hi_b -= 1
        tail_eq = ("=", hi_a, end_a) if hi_a != end_a else None
        if lo_a == hi_a:
            for i in range(lo_b, hi_b):
                out.append(("+", b[i]))
        elif lo_b == hi_b:
            for i in range(lo_a, hi_a):
                out.append(("-", a[i]))
        elif hi_a - lo_a == 1 and hi_b - lo_b == 1:
            out.append(("-", a[lo_a]))
            out.append(("+", b[lo_b]))
        else:
            sx, sy, xe, ye = _middle_snake(a, lo_a, hi_a, b, lo_b, hi_b)
            # Push in reverse pop order: tail, right, middle "=" snake, left.
            if tail_eq is not None:
                stack.append(tail_eq)
            stack.append((xe, hi_a, ye, hi_b))
            stack.append(("=", sx, xe))
            stack.append((lo_a, sx, lo_b, sy))
        if tail_eq is not None and (lo_a == hi_a or lo_b == hi_b):
            out.append((tail_eq[0], a[tail_eq[1]]))
        elif tail_eq is not None:
            for i in range(tail_eq[1], tail_eq[2]):
                out.append(("=", a[i]))
    return out


def _middle_snake(a, lo_a, hi_a, b, lo_b, hi_b):
    """Myers' middle-snake search on a[lo_a:hi_a] vs b[lo_b:hi_b].

    Returns absolute coordinates (sx, sy, xe, ye) of a snake lying on an
    optimal edit path: forward snake when N-M is odd, backward snake when even.
    """
    N = hi_a - lo_a
    M = hi_b - lo_b
    delta = N - M
    odd = delta % 2 == 1
    vf = {1: 0}             # forward furthest-reaching x per diagonal (relative coords)
    vb = {delta - 1: N}     # backward furthest-reaching x per diagonal
    # Guarantee termination: overlap must occur by d = (N + M + 1) // 2.
    for d in range((N + M + 1) // 2 + 1):
        # Forward step.
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vf[k - 1] < vf[k + 1]):
                x = vf[k + 1]
            else:
                x = vf[k - 1] + 1
            y = x - k
            sx = x
            sy = y
            while x < N and y < M and a[lo_a + x] == b[lo_b + y]:
                x += 1
                y += 1
            vf[k] = x
            if odd and k in vb and x >= vb[k]:
                return lo_a + sx, lo_b + sy, lo_a + x, lo_b + y
        # Backward step.
        for k in range(delta + d, delta - d - 1, -2):
            if k == delta + d or (k != delta - d and vb[k - 1] > vb[k + 1]):
                x = vb[k - 1]
            else:
                x = vb[k + 1] - 1
            y = x - k
            while x > 0 and y > 0 and a[lo_a + x - 1] == b[lo_b + y - 1]:
                x -= 1
                y -= 1
            vb[k] = x
            if not odd and k in vf and x <= vf[k]:
                # Backward snake: from (x, y) up to (x0, y0).
                x0 = vb_start_x
                y0 = x0 - k
                return lo_a + x, lo_b + y, lo_a + x0, lo_b + y0
    # Unreachable for valid inputs; fall back to a trivial one-line split.
    return lo_a, lo_b, lo_a + 1, lo_b
