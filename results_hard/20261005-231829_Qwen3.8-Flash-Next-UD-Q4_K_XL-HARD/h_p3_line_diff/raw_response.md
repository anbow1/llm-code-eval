```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N = len(a)
    M = len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    max_d = N + M
    size = 2 * max_d + 1
    off = max_d

    # Myers' O((N+M)*D) greedy forward pass
    trace: list[array] = []
    V = array('i', [-1]) * size
    V[off + 1] = 0  # sentinel for k=0 at d=0

    found = False
    for d in range(max_d + 1):
        trace.append(V[:])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[off + k - 1] < V[off + k + 1]):
                x = V[off + k + 1]       # move down (insertion)
            else:
                x = V[off + k - 1] + 1   # move right (deletion)
            y = x - k
            # extend along the diagonal (matches)
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[off + k] = x
            if x >= N and y >= M:
                found = True
                break
        if found:
            break

    # Backtrack through saved V snapshots to build the edit script
    result: list[tuple[str, str]] = []
    x, y = N, M

    for d in range(len(trace) - 1, 0, -1):
        V_prev = trace[d - 1]
        k = x - y
        if k == -d or (k != d and V_prev[off + k - 1] < V_prev[off + k + 1]):
            # arrived via a down-move from diagonal k+1 → insertion
            prev_x = V_prev[off + k + 1]
            prev_y = prev_x - (k + 1)
            snake_start = prev_x
            # matches at the end of the snake (collect reversed)
            for i in range(x - 1, snake_start - 1, -1):
                result.append(("=", a[i]))
            result.append(("+", b[prev_y]))
            x, y = prev_x, prev_y
        else:
            # arrived via a right-move from diagonal k-1 → deletion
            prev_x = V_prev[off + k - 1]
            prev_y = prev_x - (k - 1)
            snake_start = prev_x + 1
            for i in range(x - 1, snake_start - 1, -1):
                result.append(("=", a[i]))
            result.append(("-", a[prev_x]))
            x, y = prev_x, prev_y

    # initial matches on diagonal 0 before any edit operations
    for i in range(x - 1, -1, -1):
        result.append(("=", a[i]))

    result.reverse()
    return result
```