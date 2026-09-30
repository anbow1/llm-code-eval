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

    MAX = N + M
    offset = MAX

    trace: list[list[int]] = []
    V = [0] * (2 * MAX + 1)

    found = False
    for d in range(MAX + 1):
        trace.append(V[:])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[k - 1 + offset] < V[k + 1 + offset]):
                x = V[k + 1 + offset]
            else:
                x = V[k - 1 + offset] + 1

            y = x - k

            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            V[k + offset] = x

            if x >= N and y >= M:
                found = True
                break
        if found:
            break

    # Backtrack through saved V arrays to reconstruct the edit script
    x, y = N, M
    result: list[tuple[str, str]] = []

    for d in range(len(trace) - 1, 0, -1):
        k = x - y
        V_prev = trace[d]

        if k == -d or (k != d and V_prev[k - 1 + offset] < V_prev[k + 1 + offset]):
            prev_k = k + 1  # came via right-move (insertion from b)
        else:
            prev_k = k - 1  # came via down-move (deletion from a)

        prev_x = V_prev[prev_k + offset]
        prev_y = prev_x - prev_k

        if prev_k < k:  # deletion
            start_x = prev_x + 1
            start_y = prev_y
        else:  # insertion
            start_x = prev_x
            start_y = prev_y + 1

        # Diagonal matches (greedy extension portion)
        while x > start_x:
            x -= 1
            y -= 1
            result.append(("=", a[x]))

        # The single edit step
        if prev_k < k:
            x -= 1
            result.append(("-", a[x]))
        else:
            y -= 1
            result.append(("+", b[y]))

    # Initial greedy diagonal at d=0 (common prefix)
    while x > 0:
        x -= 1
        y -= 1
        result.append(("=", a[x]))

    result.reverse()
    return result
```