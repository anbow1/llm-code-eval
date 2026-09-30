```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    MAXD = N + M
    OFFSET = MAXD

    trace: list[list[int]] = []
    V = [0] * (2 * MAXD + 1)

    found_d = -1

    # Forward pass – Myers O((N+M)·D)
    for d in range(MAXD + 1):
        trace.append(V[:])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[k - 1 + OFFSET] < V[k + 1 + OFFSET]):
                x = V[k + 1 + OFFSET]          # came from diagonal k+1 via down (insert)
            else:
                x = V[k - 1 + OFFSET] + 1      # came from diagonal k-1 via right (delete)

            y = x - k

            # extend along diagonal (matching lines)
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            V[k + OFFSET] = x

            if x >= N and y >= M:
                found_d = d
                break

        if found_d >= 0:
            break

    # Backtrack to build the edit script
    result: list[tuple[str, str]] = []
    x, y = N, M

    for d in range(found_d, 0, -1):
        k = x - y
        V_prev = trace[d]

        if k == -d or (k != d and V_prev[k - 1 + OFFSET] < V_prev[k + 1 + OFFSET]):
            # predecessor on diagonal k+1, down move → insert
            prev_x = V_prev[k + 1 + OFFSET]
            prev_y = prev_x - (k + 1)
            # matches on diagonal k from (prev_x, prev_x - k) .. (x-1, y-1)
            for i in range(x - 1, prev_x - 1, -1):
                result.append(("=", a[i]))
            result.append(("+", b[prev_y]))
            x, y = prev_x, prev_y
        else:
            # predecessor on diagonal k-1, right move → delete
            prev_x = V_prev[k - 1 + OFFSET]
            prev_y = prev_x - (k - 1)
            # matches on diagonal k from (prev_x+1, prev_y) .. (x-1, y-1)
            for i in range(x - 1, prev_x, -1):
                result.append(("=", a[i]))
            result.append(("-", a[prev_x]))
            x, y = prev_x, prev_y

    # remaining diagonal-0 matches from the start
    for i in range(x - 1, -1, -1):
        result.append(("=", a[i]))

    result.reverse()
    return result
```