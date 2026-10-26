def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    max_d = n + m
    offset = max_d + 1
    v = [0] * (2 * max_d + 3)

    trace: list[list[int]] = []
    d_final = 0
    found = False

    for d in range(max_d + 1):
        row: list[int] = []

        for k in range(-d, d + 1, 2):
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
            row.append(x)

            if x >= n and y >= m:
                d_final = d
                found = True
                break

        if found:
            break

        trace.append(row)

    result_reversed: list[tuple[str, str]] = []

    x = n
    y = m

    for d in range(d_final, 0, -1):
        k = x - y
        prev_row = trace[d - 1]

        if k == -d:
            prev_k = k + 1
        elif k != d and prev_row[((k - 1) + (d - 1)) // 2] < prev_row[((k + 1) + (d - 1)) // 2]:
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = prev_row[(prev_k + (d - 1)) // 2]
        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            result_reversed.append(("=", a[x - 1]))
            x -= 1
            y -= 1

        if x == prev_x:
            result_reversed.append(("+", b[y - 1]))
            y -= 1
        else:
            result_reversed.append(("-", a[x - 1]))
            x -= 1

    while x > 0 and y > 0:
        result_reversed.append(("=", a[x - 1]))
        x -= 1
        y -= 1

    result_reversed.reverse()
    return result_reversed
