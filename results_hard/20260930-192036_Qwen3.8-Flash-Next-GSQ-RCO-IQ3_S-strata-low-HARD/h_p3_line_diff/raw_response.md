```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)

    # Strip common prefix
    lo = 0
    while lo < n and lo < m and a[lo] == b[lo]:
        lo += 1

    # Strip common suffix
    hi_a, hi_b = n, m
    while hi_a > lo and hi_b > lo and a[hi_a - 1] == b[hi_b - 1]:
        hi_a -= 1
        hi_b -= 1

    # Myers on the core
    ca = a[lo:hi_a]
    cb = b[lo:hi_b]
    core = _myers_diff(ca, cb, len(ca), len(cb))

    out = [('=', a[i]) for i in range(lo)]
    out.extend(core)
    out.extend([('=', a[i]) for i in range(hi_a, n)])
    return out


def _myers_diff(a, b, n, m):
    if n == 0 and m == 0:
        return []
    if n == 0:
        return [('+', ln) for ln in b]
    if m == 0:
        return [('-', ln) for ln in a]

    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)

    trace: list[list[int]] = []
    fd = -1

    for d in range(max_d + 1):
        for k in range(-d, d + 1, 2):
            ki = k + off
            if k == -d or (k != d and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]
            else:
                x = v[ki - 1] + 1
            y = x - k
            while x < n and 0 <= y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                fd = d
                break
        if fd >= 0:
            break
        trace.append(v[-d + off: d + 1 + off])

    # Backtrace
    path: list[tuple[str, str]] = []
    x, y = n, m

    for d in range(fd, 0, -1):
        t = trace[d - 1]
        t_off = -(d - 1)
        k = x - y

        i1 = k - 1 - t_off
        i2 = k + 1 - t_off
        vm1 = t[i1] if 0 <= i1 < len(t) else -1
        vp1 = t[i2] if 0 <= i2 < len(t) else -1

        if k == -(d - 1) or (k != (d - 1) and vm1 < vp1):
            pk = k + 1
        else:
            pk = k - 1

        ip = pk - t_off
        px = t[ip]
        py = px - pk

        if pk == k + 1:
            sx, sy = px, py + 1
        else:
            sx, sy = px + 1, py

        while x > sx:
            x -= 1
            y -= 1
            path.append(('=', a[x]))

        if pk == k + 1:
            path.append(('+', b[py]))
        else:
            path.append(('-', a[px]))

        x, y = px, py

    # Initial snake
    while x > 0:
        x -= 1
        y -= 1
        path.append(('=', a[x]))

    path.reverse()
    return path
```