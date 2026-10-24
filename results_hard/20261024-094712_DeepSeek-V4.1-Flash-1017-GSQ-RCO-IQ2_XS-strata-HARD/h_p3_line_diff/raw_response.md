```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1
    size = 2 * max_d + 3

    v = [0] * size
    trace = []

    edit_distance = 0

    for d in range(max_d + 1):
        found = False

        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[offset + k - 1] < v[offset + k + 1]):
                x = v[offset + k + 1]
            else:
                x = v[offset + k - 1] + 1

            y = x - k

            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1

            v[offset + k] = x

            if x == n and y == m:
                edit_distance = d
                found = True
                break

        if found:
            break

        trace.append(
            array("i", [v[offset + k] for k in range(-d, d + 1, 2)])
        )

    result: list[tuple[str, str]] = []
    x = n
    y = m

    for d in range(edit_distance, 0, -1):
        k = x - y
        prev_arr = trace[d - 1]
        prev_d = d - 1

        if k == -d:
            prev_k = k + 1
        elif k == d:
            prev_k = k - 1
        else:
            idx_left = (k - 1 + prev_d) // 2
            idx_right = (k + 1 + prev_d) // 2

            if prev_arr[idx_left] < prev_arr[idx_right]:
                prev_k = k + 1
            else:
                prev_k = k - 1

        idx_prev = (prev_k + prev_d) // 2
        prev_x = prev_arr[idx_prev]
        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            result.append(("=", a[x - 1]))
            x -= 1
            y -= 1

        if x == prev_x:
            result.append(("+", b[y - 1]))
            y -= 1
        else:
            result.append(("-", a[x - 1]))
            x -= 1

    while x > 0 and y > 0:
        result.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    result.reverse()
    return result
```