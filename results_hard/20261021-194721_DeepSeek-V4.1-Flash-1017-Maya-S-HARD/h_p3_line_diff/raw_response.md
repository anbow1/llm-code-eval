```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Fast path: if there are no common lines, the minimal script is trivial.
    if set(a).isdisjoint(b):
        result = [("-", line) for line in a]
        result.extend(("+", line) for line in b)
        return result

    # d = 0: consume the common prefix.
    x = y = 0
    while x < n and y < m and a[x] == b[y]:
        x += 1
        y += 1

    states: list[array] = [array("i", (x,))]
    if x >= n and y >= m:
        return [("=", line) for line in a]

    max_d = n + m
    D = 0

    # Forward phase: Myers' O((N + M) * D) algorithm.
    for d in range(1, max_d + 1):
        prev = states[d - 1]
        cur = array("i")
        found = False

        for i in range(d + 1):
            k = -d + 2 * i

            if k == -d or (k != d and prev[i - 1] < prev[i]):
                x = prev[i]
            else:
                x = prev[i - 1] + 1

            y = x - k

            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1

            cur.append(x)

            if x >= n and y >= m:
                D = d
                found = True
                break

        if found:
            break

        states.append(cur)
    else:
        D = max_d

    # Backward phase: reconstruct the shortest edit script.
    result: list[tuple[str, str]] = []
    x, y = n, m

    for d in range(D, 0, -1):
        prev = states[d - 1]
        k = x - y
        i = (k + d) // 2

        if k == -d or (k != d and prev[i - 1] < prev[i]):
            prev_k = k + 1
        else:
            prev_k = k - 1

        j = (prev_k + d - 1) // 2
        prev_x = prev[j]
        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
            result.append(("=", a[x]))

        if x == prev_x:
            y -= 1
            result.append(("+", b[y]))
        else:
            x -= 1
            result.append(("-", a[x]))

    # Remaining common prefix.
    while x > 0 and y > 0:
        x -= 1
        y -= 1
        result.append(("=", a[x]))

    result.reverse()
    return result
```