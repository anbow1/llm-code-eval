```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    def backtrack(trace, d_final, n, m, a_orig, b_orig):
        res: list[tuple[str, str]] = []
        x, y = n, m

        for d in range(d_final, 0, -1):
            k = x - y
            prev = trace[d - 1]
            j = (k + d) // 2

            if j == 0:
                prev_x = prev[0]
                prev_k = k + 1
                edit_type = "+"
                edit_line = b_orig[prev_x - prev_k]
                x_start = prev_x
            elif j == d:
                prev_x = prev[d - 1]
                prev_k = k - 1
                edit_type = "-"
                edit_line = a_orig[prev_x]
                x_start = prev_x + 1
            else:
                if prev[j - 1] < prev[j]:
                    prev_x = prev[j]
                    prev_k = k + 1
                    edit_type = "+"
                    edit_line = b_orig[prev_x - prev_k]
                    x_start = prev_x
                else:
                    prev_x = prev[j - 1]
                    prev_k = k - 1
                    edit_type = "-"
                    edit_line = a_orig[prev_x]
                    x_start = prev_x + 1

            eq = x - x_start
            while eq > 0:
                x -= 1
                y -= 1
                res.append(("=", a_orig[x]))
                eq -= 1

            res.append((edit_type, edit_line))
            x = prev_x
            y = prev_x - prev_k

        while x > 0 and y > 0:
            x -= 1
            y -= 1
            res.append(("=", a_orig[x]))

        res.reverse()
        return res

    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    ids: dict[str, int] = {}
    a_ids: list[int] = []
    for line in a:
        value = ids.get(line)
        if value is None:
            value = len(ids)
            ids[line] = value
        a_ids.append(value)

    b_ids: list[int] = []
    for line in b:
        value = ids.get(line)
        if value is None:
            value = len(ids)
            ids[line] = value
        b_ids.append(value)

    trace: list[list[int]] = []
    prev = [0]

    for d in range(n + m + 1):
        curr = [0] * (d + 1)

        for j in range(d + 1):
            k = -d + 2 * j

            if j == 0:
                x = prev[0]
            elif j == d:
                x = prev[d - 1] + 1
            else:
                if prev[j - 1] < prev[j]:
                    x = prev[j]
                else:
                    x = prev[j - 1] + 1

            y = x - k

            while x < n and y < m and a_ids[x] == b_ids[y]:
                x += 1
                y += 1

            curr[j] = x

            if x >= n and y >= m:
                return backtrack(trace, d, n, m, a, b)

        trace.append(curr)
        prev = curr

    return []
```