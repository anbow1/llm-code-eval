def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Strip common prefix
    prefix = 0
    while prefix < n and prefix < m and a[prefix] == b[prefix]:
        prefix += 1

    # Strip common suffix
    suffix = 0
    while suffix < n - prefix and suffix < m - prefix and a[n - 1 - suffix] == b[m - 1 - suffix]:
        suffix += 1

    mid_a = a[prefix: n - suffix]
    mid_b = b[prefix: m - suffix]
    mid_n = len(mid_a)
    mid_m = len(mid_b)

    if mid_n == 0 and mid_m == 0:
        return [("=" , line) for line in a]

    if mid_n == 0:
        result = [("=" , a[i]) for i in range(prefix)]
        for j in range(mid_m):
            result.append(("+", mid_b[j]))
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        return result

    if mid_m == 0:
        result = [("=" , a[i]) for i in range(prefix)]
        for i in range(mid_n):
            result.append(("-", mid_a[i]))
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        return result

    # Myers' O((N+M)·D) longest common subsequence algorithm
    d_hist: list[dict[int, int]] = []
    d: dict[int, int] = {0: 0}

    k_final = -1
    for k in range(mid_n + mid_m + 1):
        new_d: dict[int, int] = {}
        for x in range(k, -k - 1, -2):
            if x == k:
                y = d[x - 1]
            elif x == -k:
                y = d[x + 1] + 1
                if y > mid_m:
                    y = mid_m
            else:
                y1 = d[x - 1]
                y2 = d[x + 1] + 1
                if y2 > mid_m:
                    y = y1
                else:
                    y = max(y1, y2)

            # Follow the diagonal (matches)
            while x + y < mid_n and y < mid_m and mid_a[x + y] == mid_b[y]:
                x += 1
                y += 1

            new_d[x] = y

        d = new_d
        d_hist.append(d)

        if d.get(0, -1) >= mid_m:
            k_final = k
            break

    # Backtrack to recover the edit path
    path: list[tuple[int, int, int]] = []
    x = 0
    y = d_hist[k_final][0]

    for k in range(k_final, -1, -1):
        path.append((k, x, y))
        if k == 0:
            break
        prev_d = d_hist[k - 1]
        if x == k:
            x -= 1          # deletion
        elif x == -k:
            x += 1          # insertion
            y -= 1
        else:
            if prev_d[x - 1] == y:
                x -= 1      # deletion
            else:
                x += 1      # insertion
                y -= 1

    # Build the edit script
    result: list[tuple[str, str]] = []

    # Common prefix
    for i in range(prefix):
        result.append(("=", a[i]))

    i = 0
    j = 0

    # Initial diagonal matches (up to path[0])
    x0, y0 = path[0][1], path[0][2]
    while i < x0 + y0:
        result.append(("=", mid_a[i]))
        i += 1
        j += 1

    # Edit steps
    for k in range(1, k_final + 1):
        x_prev, y_prev = path[k - 1][1], path[k - 1][2]
        x_curr, y_curr = path[k][1], path[k][2]

        if x_curr == x_prev - 1:
            result.append(("-", mid_a[i]))
            i += 1
        elif x_curr == x_prev + 1:
            result.append(("+", mid_b[j]))
            j += 1

        # Diagonal matches up to path[k]
        while i < x_curr + y_curr and j < y_curr:
            result.append(("=", mid_a[i]))
            i += 1
            j += 1

    # Common suffix
    for i in range(n - suffix, n):
        result.append(("=", a[i]))

    return result
