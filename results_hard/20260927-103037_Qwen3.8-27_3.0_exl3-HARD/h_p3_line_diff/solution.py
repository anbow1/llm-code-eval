def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    MAX = N + M
    offset = MAX
    V = [0] * (2 * MAX + 1)
    V[1 + offset] = 0  # V[1] = 0, virtual start on diagonal 1

    trace: list[list[int]] = []

    for D in range(MAX + 1):
        row = [0] * (D + 1)
        for i in range(D + 1):
            k = -D + 2 * i
            if k == -D or (k != D and V[k - 1 + offset] < V[k + 1 + offset]):
                x = V[k + 1 + offset]
            else:
                x = V[k - 1 + offset] + 1

            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            V[k + offset] = x
            row[i] = x

            if x == N and y == M:
                trace.append(row)
                break
        else:
            trace.append(row)
            continue
        break

    # Reconstruct the edit script by walking the traceback backwards
    result: list[tuple[str, str]] = []
    x, y = N, M
    k = N - M

    for d in range(D, 0, -1):
        idx_k_minus_1 = (k + d - 2) // 2
        idx_k_plus_1 = (k + d) // 2

        if k == -d or (k != d and trace[d - 1][idx_k_minus_1] < trace[d - 1][idx_k_plus_1]):
            # Came from diagonal k+1: a down-move (insertion)
            prev_x = trace[d - 1][idx_k_plus_1]
            while x > prev_x:
                x -= 1
                y -= 1
                result.append(("=", a[x]))
            y -= 1
            result.append(("+", b[y]))
            k += 1
        else:
            # Came from diagonal k-1: a right-move (deletion)
            prev_x = trace[d - 1][idx_k_minus_1]
            while x > prev_x + 1:
                x -= 1
                y -= 1
                result.append(("=", a[x]))
            x -= 1
            result.append(("-", a[x]))
            k -= 1

    # Remaining snake at the beginning
    while x > 0:
        x -= 1
        y -= 1
        result.append(("=", a[x]))

    result.reverse()
    return result
