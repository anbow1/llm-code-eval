```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]
    if a == b:
        return [("=", line) for line in a]

    # If no line is shared, the LCS length is 0.
    try:
        if n <= m:
            if set(a).isdisjoint(b):
                return [("-", line) for line in a] + [("+", line) for line in b]
        else:
            if set(b).isdisjoint(a):
                return [("-", line) for line in a] + [("+", line) for line in b]
    except TypeError:
        pass

    # Myers O((N+M) * D) algorithm, with a compact trace for reconstruction.
    off = max(n, m)
    mn = -m
    mx = n

    v = [-1] * (2 * off + 1)
    v[off + 1] = 0

    trace = []
    aa = a
    bb = b

    def get_val(snap, k):
        low, high, vals = snap
        if k < low or k > high or ((k - low) & 1):
            return -1
        return vals[(k - low) // 2]

    def reconstruct(d):
        ops = []
        app = ops.append
        x, y = n, m

        for step in range(d, -1, -1):
            k = x - y

            if step == 0:
                while x > 0 and y > 0:
                    app(("=", aa[x - 1]))
                    x -= 1
                    y -= 1
                break

            prev = trace[step - 1]

            if k == mn:
                down = True
            elif k == mx:
                down = False
            else:
                down = get_val(prev, k - 1) < get_val(prev, k + 1)

            if down:
                ex = get_val(prev, k + 1)
                ey = ex - k

                while x > ex and y > ey:
                    app(("=", aa[x - 1]))
                    x -= 1
                    y -= 1

                app(("+", bb[ey - 1]))
                x, y = ex, ey - 1
            else:
                ex = get_val(prev, k - 1) + 1
                ey = ex - k

                while x > ex and y > ey:
                    app(("=", aa[x - 1]))
                    x -= 1
                    y -= 1

                app(("-", aa[ex - 1]))
                x, y = ex - 1, ey

        ops.reverse()
        return ops

    for d in range(n + m + 1):
        low = -d
        if low < mn:
            low = mn

        high = d
        if high > mx:
            high = mx

        if (low - d) & 1:
            low += 1

        if low <= high:
            for k in range(low, high + 1, 2):
                if k == mn:
                    x = v[off + k + 1]
                elif k == mx:
                    x = v[off + k - 1] + 1
                elif v[off + k - 1] < v[off + k + 1]:
                    x = v[off + k + 1]
                else:
                    x = v[off + k - 1] + 1

                y = x - k

                while x < n and y < m and aa[x] == bb[y]:
                    x += 1
                    y += 1

                v[off + k] = x

                if x >= n and y >= m:
                    return reconstruct(d)

            vals = [v[off + k] for k in range(low, high + 1, 2)]
        else:
            low, high, vals = 0, -1, []

        trace.append((low, high, vals))

    return [("-", line) for line in a] + [("+", line) for line in b]
```