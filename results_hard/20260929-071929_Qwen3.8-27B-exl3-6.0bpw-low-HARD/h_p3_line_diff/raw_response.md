

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    # Myers' O((N+M)*D) algorithm
    # trace[d] has length d+1; trace[d][i] = furthest x on diagonal k = -d + 2*i
    # direction[d][i] = 0 (deletion, came from left) or 1 (insertion, came from above)

    trace: list[list[int]] = []
    direction: list[list[int]] = []

    for d in range(N + M + 1):
        v = [0] * (d + 1)
        dir_v = [0] * (d + 1)
        for i in range(d + 1):
            k = -d + 2 * i

            if k == -d:
                if d == 0:
                    x = 0
                else:
                    x = trace[d - 1][i]
                dir_v[i] = 1
            elif k == d:
                x = trace[d - 1][i - 1] + 1
                dir_v[i] = 0
            else:
                x_left = trace[d - 1][i - 1] + 1
                x_above = trace[d - 1][i]
                if x_left > x_above:
                    x = x_left
                    dir_v[i] = 0
                else:
                    x = x_above
                    dir_v[i] = 1

            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            v[i] = x

            if x >= N and y >= M:
                trace.append(v)
                direction.append(dir_v)
                # Backtrack to reconstruct the edit script
                result: list[tuple[str, str]] = []
                cx, cy = N, M
                cd = d
                while cd > 0:
                    ck = cx - cy
                    ci = (ck + cd) // 2
                    if direction[cd][ci] == 0:
                        x_start = trace[cd - 1][ci - 1] + 1
                    else:
                        x_start = trace[cd - 1][ci]
                    y_start = x_start - ck
                    # Diagonal (matching) moves
                    while cx > x_start:
                        cx -= 1
                        cy -= 1
                        result.append(("=", a[cx]))
                    # The single non-diagonal edit
                    if direction[cd][ci] == 0:
                        cx -= 1
                        result.append(("-", a[cx]))
                    else:
                        cy -= 1
                        result.append(("+", b[cy]))
                    cd -= 1
                # Remaining diagonal moves at d = 0
                while cx > 0:
                    cx -= 1
                    cy -= 1
                    result.append(("=", a[cx]))
                result.reverse()
                return result

        trace.append(v)
        direction.append(dir_v)

    raise RuntimeError("Algorithm should have terminated")
```