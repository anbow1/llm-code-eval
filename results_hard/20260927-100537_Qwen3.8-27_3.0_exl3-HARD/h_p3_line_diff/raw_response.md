

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N = len(a)
    M = len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    # Myers' O((N+M)*D) algorithm
    # V[k] = furthest x reachable on diagonal k (x - y = k)
    Vs: list[dict[int, int]] = []

    # d = 0: start at (0,0), follow the diagonal
    V: dict[int, int] = {0: 0}
    x = 0
    y = 0
    while x < N and y < M and a[x] == b[y]:
        x += 1
        y += 1
    V[0] = x
    Vs.append(V)

    if x == N and y == M:
        return [("+", line) for line in a]

    D: int | None = None
    for d in range(1, N + M + 1):
        new_V: dict[int, int] = {}
        for k in range(-d, d + 1, 2):
            if k == -d:
                x = V[k + 1]
            elif k == d:
                x = V[k - 1] + 1
            else:
                if V[k - 1] > V[k + 1]:
                    x = V[k - 1] + 1
                else:
                    x = V[k + 1]

            y = x - k

            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            new_V[k] = x
            if x == N and y == M:
                D = d
                break

        if D is not None:
            break
        Vs.append(new_V)
        V = new_V

    # Backtrack to reconstruct the edit script
    script: list[tuple[str, str]] = []
    x, y = N, M
    k = N - M

    for d in range(D, 0, -1):
        if k == -d:
            # Came from diagonal k+1 via a down move (insert)
            prev_k = k + 1
            prev_x = Vs[d - 1][prev_k]
            prev_y = prev_x - prev_k
            # Diagonal from (prev_x, prev_y+1) to (x, y)
            for i in range(x - 1, prev_x - 1, -1):
                script.append(("=", a[i]))
            script.append(("+", b[prev_y]))
            x, y = prev_x, prev_y
            k = prev_k
        elif k == d:
            # Came from diagonal k-1 via a right move (delete)
            prev_k = k - 1
            prev_x = Vs[d - 1][prev_k]
            prev_y = prev_x - prev_k
            # Diagonal from (prev_x+1, prev_y) to (x, y)
            for i in range(x - 1, prev_x, -1):
                script.append(("=", a[i]))
            script.append(("-", a[prev_x]))
            x, y = prev_x, prev_y
            k = prev_k
        else:
            if Vs[d - 1][k - 1] > Vs[d - 1][k + 1]:
                # Came from diagonal k-1 via a right move (delete)
                prev_k = k - 1
                prev_x = Vs[d - 1][prev_k]
                prev_y = prev_x - prev_k
                for i in range(x - 1, prev_x, -1):
                    script.append(("=", a[i]))
                script.append(("-", a[prev_x]))
            else:
                # Came from diagonal k+1 via a down move (insert)
                prev_k = k + 1
                prev_x = Vs[d - 1][prev_k]
                prev_y = prev_x - prev_k
                for i in range(x - 1, prev_x - 1, -1):
                    script.append(("=", a[i]))
                script.append(("+", b[prev_y]))
            x, y = prev_x, prev_y
            k = prev_k

    # Initial diagonal from d=0
    for i in range(x - 1, -1, -1):
        script.append(("=", a[i]))

    script.reverse()
    return script
```