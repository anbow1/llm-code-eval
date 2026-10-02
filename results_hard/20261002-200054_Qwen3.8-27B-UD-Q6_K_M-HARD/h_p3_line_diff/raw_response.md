```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    # Myers' O((N+M)*D) diff algorithm
    offset = N + M + 1
    size = 2 * (N + M) + 3

    V = [0] * size
    V[1 + offset] = 0  # standard initialization

    snapshots: list[list[int]] = []
    D_star = -1
    end_x, end_y = N, M

    for D in range(N + M + 1):
        snapshots.append(V[:])

        for k in range(-D, D + 1, 2):
            if k == -D:
                x = V[k + 1 + offset]
            elif k == D:
                x = V[k - 1 + offset] + 1
            else:
                # from k+1 (insertion): x stays
                # from k-1 (deletion): x increases by 1
                vi = V[k + 1 + offset]
                vd = V[k - 1 + offset] + 1
                x = vi if vi > vd else vd

            y = x - k

            # Diagonal advance
            while x < N and y < M and y >= 0 and a[x] == b[y]:
                x += 1
                y += 1

            V[k + offset] = x

            if x == N and y == M:
                D_star = D
                end_x, end_y = x, y
                break

        if D_star >= 0:
            break

    # Traceback
    result: list[tuple[str, str]] = []
    x, y = end_x, end_y

    for d in range(D_star, -1, -1):
        k = x - y
        V_prev = snapshots[d]

        if d == 0:
            # Pure diagonal from origin
            for i in range(x - 1, -1, -1):
                result.append(("=", a[i]))
            x, y = 0, 0
        elif k == -d:
            # Insertion from diagonal k+1
            x_start = V_prev[k + 1 + offset]
            y_start = x_start - k
            for i in range(x - 1, x_start - 1, -1):
                result.append(("=", a[i]))
            result.append(("+", b[y_start - 1]))
            x, y = x_start, y_start - 1
        elif k == d:
            # Deletion from diagonal k-1
            x_start = V_prev[k - 1 + offset] + 1
            y_start = x_start - k
            for i in range(x - 1, x_start - 1, -1):
                result.append(("=", a[i]))
            result.append(("-", a[x_start - 1]))
            x, y = x_start - 1, y_start
        else:
            vi = V_prev[k + 1 + offset]       # x if from insertion (k+1)
            vd = V_prev[k - 1 + offset] + 1   # x if from deletion (k-1)
            if vi > vd:
                x_start = vi
                y_start = x_start - k
                for i in range(x - 1, x_start - 1, -1):
                    result.append(("=", a[i]))
                result.append(("+", b[y_start - 1]))
                x, y = x_start, y_start - 1
            else:
                x_start = vd
                y_start = x_start - k
                for i in range(x - 1, x_start - 1, -1):
                    result.append(("=", a[i]))
                result.append(("-", a[x_start - 1]))
                x, y = x_start - 1, y_start

    result.reverse()
    return result
```