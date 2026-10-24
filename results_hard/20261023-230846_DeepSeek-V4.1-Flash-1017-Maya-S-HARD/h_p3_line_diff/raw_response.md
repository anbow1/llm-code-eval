```python
def _myers(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1
    v = [0] * (2 * max_d + 3)
    trace: list[list[int]] = []
    found = -1

    for d in range(max_d + 1):
        trace.append(v.copy())

        k = -d
        while k <= d:
            idx = offset + k

            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1

            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1

            v[idx] = x

            if x >= n and y >= m:
                found = d
                break

            k += 2

        if found != -1:
            break

    edits: list[tuple[str, str]] = []
    x = n
    y = m

    for d in range(found, 0, -1):
        k = x - y
        idx = offset + k
        prev_v = trace[d]

        if k == -d or (k != d and prev_v[idx - 1] < prev_v[idx + 1]):
            prev_k = k + 1
            prev_x = prev_v[offset + prev_k]
            prev_y = prev_x - prev_k

            while x > prev_x:
                edits.append(("=", a[x - 1]))
                x -= 1
                y -= 1

            edits.append(("+", b[prev_y]))
            y -= 1
        else:
            prev_k = k - 1
            prev_x = prev_v[offset + prev_k]

            while x > prev_x + 1:
                edits.append(("=", a[x - 1]))
                x -= 1
                y -= 1

            edits.append(("-", a[x - 1]))
            x -= 1

    while x > 0:
        edits.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    edits.reverse()
    return edits


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    prefix = 0
    limit = min(n, m)
    while prefix < limit and a[prefix] == b[prefix]:
        prefix += 1

    if prefix == n and prefix == m:
        return [("=", line) for line in a]

    suffix = 0
    while (
        suffix < n - prefix
        and suffix < m - prefix
        and a[n - 1 - suffix] == b[m - 1 - suffix]
    ):
        suffix += 1

    mid_a = a[prefix:n - suffix]
    mid_b = b[prefix:m - suffix]

    result = [("=", a[i]) for i in range(prefix)]
    result.extend(_myers(mid_a, mid_b))

    if suffix:
        result.extend(("=", a[i]) for i in range(n - suffix, n))

    return result
```