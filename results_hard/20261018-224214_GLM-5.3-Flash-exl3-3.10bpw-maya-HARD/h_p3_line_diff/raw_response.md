```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between a and b using Myers' algorithm."""
    n, m = len(a), len(b)

    # Trim common prefix and suffix (speeds up the common cases a lot).
    pre = 0
    while pre < n and pre < m and a[pre] == b[pre]:
        pre += 1
    suf = 0
    while suf < n - pre and suf < m - pre and a[n - 1 - suf] == b[m - 1 - suf]:
        suf += 1

    core_a = a[pre:n - suf]
    core_b = b[pre:m - suf]

    out: list[tuple[str, str]] = []
    if pre:
        out.extend(("=", a[i]) for i in range(pre))
    _diff_core(core_a, core_b, out)
    if suf:
        out.extend(("=", a[n - suf + i]) for i in range(suf))
    return out


def _diff_core(a: list[str], b: list[str], out: list[tuple[str, str]]) -> None:
    """Myers' O((N+M)*D) algorithm with divide-and-conquer (linear space)."""
    n, m = len(a), len(b)

    if n == 0:
        out.extend(("+", line) for line in b)
        return
    if m == 0:
        out.extend(("-", line) for line in a)
        return

    x_s, y_s, x_e, y_e = _middle_snake(a, b)
    if x_s == x_e:  # empty middle snake
        _diff_core(a[:x_s], b[:y_s], out)
        _diff_core(a[x_e:], b[y_e:], out)
    else:
        _diff_core(a[:x_s], b[:y_s], out)
        out.extend(("=", a[x_s + i]) for i in range(x_e - x_s))
        _diff_core(a[x_e:], b[y_e:], out)


def _middle_snake(a: list[str], b: list[str]) -> tuple[int, int, int, int]:
    """Find the middle snake of the edit path between a and b.

    Returns (x_s, y_s, x_e, y_e): the snake's start and end points, such that
    x_e - x_s == y_e - y_s and a[x_s:x_e] == b[y_s:y_e].  The snake may be
    empty (x_s == x_e), in which case the split point is (x_s, y_s).
    """
    n, m = len(a), len(b)
    delta = n - m
    odd = (delta % 2) != 0
    max_d = (n + m + 1) // 2
    off = max_d + 1

    vf = [0] * (2 * max_d + 3)   # forward furthest reach, indexed by k + off
    vr = [0] * (2 * max_d + 3)   # reverse reach measured from the end

    for d in range(max_d + 1):
        # ---- forward step ----
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vf[off + k - 1] < vf[off + k + 1]):
                x = vf[off + k + 1]
            else:
                x = vf[off + k - 1] + 1
            y = x - k
            x, y = _extend(a, b, x, y, n, m)
            vf[off + k] = x
            if (
                odd
                and delta - (d - 1) <= k <= delta + (d - 1)
                and vf[off + k] + vr[off + delta - k] >= n
            ):
                # Overlap with a reverse path of d-1 edits: snake ends here.
                return x, y, x, y

        # ---- reverse step ----
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vr[off + k - 1] < vr[off + k + 1]):
                xr = vr[off + k + 1]
            else:
                xr = vr[off + k - 1] + 1
            yr = xr - k
            # extend in mirrored coordinates (comparing from the ends)
            while xr < n and yr < m and a[n - 1 - xr] == b[m - 1 - yr]:
                xr += 1
                yr += 1
            vr[off + k] = xr
            if (
                not odd
                and delta - d <= k <= delta + d
                and vf[off + delta - k] + vr[off + k] >= n
            ):
                # Overlap between a forward path of d edits and this reverse
                # path of d edits: the snake runs from the reverse path's
                # deepest point back to the forward path's furthest point.
                xe = n - xr
                ye = m - yr
                xs = vf[off + delta - k]
                ys = xs - (delta - k)
                return xs, ys, xe, ye

    # Unreachable for valid inputs.
    return 0, 0, 0, 0


def _extend(a: list[str], b: list[str], x: int, y: int, n: int, m: int) -> tuple[int, int]:
    """Extend a diagonal move as far as possible (with fast chunk skipping)."""
    while x < n and y < m and a[x] == b[y]:
        # Skip over long runs of equal lines using C-speed slice comparison.
        if x + 32 <= n and y + 32 <= m and a[x:x + 32] == b[y:y + 32]:
            x += 32
            y += 32
            continue
        x += 1
        y += 1
    return x, y
```