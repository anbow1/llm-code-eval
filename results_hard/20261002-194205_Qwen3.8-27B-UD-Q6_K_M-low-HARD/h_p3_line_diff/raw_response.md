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
    size = 2 * MAX + 1
    offset = MAX

    V = [0] * size
    V[1 + offset] = 0

    trace: list[list[int]] = []

    found_d = -1
    for d in range(0, MAX + 1):
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
                found_d = d
                break
        if found_d >= 0:
            break

    # Backtrack to build the edit script
    x, y = N, M
    # ops in reverse order:
    #   ('=', start, end)  -> matches a[start:end]
    #   ('-', idx)         -> delete a[idx]
    #   ('+', idx)         -> insert b[idx]
    ops: list[tuple] = []

    for d in range(found_d, 0, -1):
        k = x - y
        prev_V = trace[d]

        if k == -d or (k != d and prev_V[k - 1 + offset] < prev_V[k + 1 + offset]):
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = prev_V[prev_k + offset]
        prev_y = prev_x - prev_k

        if prev_k == k + 1:
            # Down move: insertion of b[prev_y]
            ops.append(('+', prev_y))
            # Snake: matches a[prev_x : x]
            if x > prev_x:
                ops.append(('=', prev_x, x))
        else:
            # Right move: deletion of a[prev_x]
            ops.append(('-', prev_x))
            # Snake: matches a[prev_x+1 : x]
            if x > prev_x + 1:
                ops.append(('=', prev_x + 1, x))

        x, y = prev_x, prev_y

    # Initial snake from (0, 0) to (x, y)
    if x > 0:
        ops.append(('=', 0, x))

    # Build the result in forward order
    result: list[tuple[str, str]] = []
    for op in reversed(ops):
        if op[0] == '=':
            for i in range(op[1], op[2]):
                result.append(("=", a[i]))
        elif op[0] == '-':
            result.append(("-", a[op[1]]))
        else:
            result.append(("+", b[op[1]]))

    return result
```