```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d
    size = 2 * max_d + 1

    trace: list[list[int]] = []
    V = [0] * size
    found_d = -1

    for d in range(max_d + 1):
        trace.append(V[:])
        for k in range(-d, d + 1, 2):
            ko = k + offset
            if k == -d or (k != d and V[ko - 1] < V[ko + 1]):
                x = V[ko + 1]
            else:
                x = V[ko - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            V[ko] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break

    # Backtrack
    path: list[tuple[str, str]] = []
    x = n
    y = m

    for d in range(found_d, 0, -1):
        V_prev = trace[d]
        k = x - y
        ko = k + offset
        if k == -d or (k != d and V_prev[ko - 1] < V_prev[ko + 1]):
            x_start = V_prev[ko + 1]
            y_start = x_start - k
            while x > x_start and y > y_start:
                x -= 1
                y -= 1
                path.append(("=", a[x]))
            y -= 1
            path.append(("+", b[y]))
        else:
            x_start = V_prev[ko - 1] + 1
            y_start = x_start - k
            while x > x_start and y > y_start:
                x -= 1
                y -= 1
                path.append(("=", a[x]))
            x -= 1
            path.append(("-", a[x]))

    while x > 0:
        x -= 1
        y -= 1
        path.append(("=", a[x]))

    path.reverse()
    return path
```