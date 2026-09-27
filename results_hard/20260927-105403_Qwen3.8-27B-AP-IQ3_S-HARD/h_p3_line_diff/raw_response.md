```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)
    if N == 0 and M == 0:
        return []
    if N == 0:
        return [('+', line) for line in b]
    if M == 0:
        return [('-', line) for line in a]

    # Myers' O((N+M)*D) diff algorithm
    # trace[k] maps diagonal d -> furthest x reached on that diagonal at step k
    trace: list[dict[int, int]] = []

    # Step 0: extend diagonally from the origin
    x0 = 0
    while x0 < N and x0 < M and a[x0] == b[x0]:
        x0 += 1
    V: dict[int, int] = {0: x0}
    trace.append(V)

    if x0 == N and x0 == M:
        return [('=', line) for line in a]

    D = 0
    max_D = N + M

    while D < max_D:
        D += 1
        new_V: dict[int, int] = {}
        for d in range(-D, D + 1):
            if d < -M or d > N:
                continue
            best_x = -1
            # Deletion: came from diagonal d-1
            if d - 1 in V and V[d - 1] < N:
                best_x = max(best_x, V[d - 1] + 1)
            # Insertion: came from diagonal d+1
            if d + 1 in V and V[d + 1] - (d + 1) < M:
                best_x = max(best_x, V[d + 1])
            if best_x < 0:
                continue
            # Extend diagonally (the "snake")
            xx = best_x
            yy = xx - d
            while xx < N and yy < M and a[xx] == b[yy]:
                xx += 1
                yy += 1
            new_V[d] = xx
        V = new_V
        trace.append(V)

        if (N - M) in V and V[N - M] == N:
            break

    # Backtrack through the trace to reconstruct the edit script
    ops: list[tuple[str, str]] = []
    d = N - M
    x = N
    y = M

    for step in range(D, 0, -1):
        cur_V = trace[step]
        prev_V = trace[step - 1]

        # Walk back along the diagonal to find where the snake started
        xs = x
        ys = y
        while xs > 0 and ys > 0 and a[xs - 1] == b[ys - 1]:
            xs -= 1
            ys -= 1

        # Record '=' operations for the snake (in reverse)
        for i in range(x - 1, xs - 1, -1):
            ops.append(('=', a[i]))

        # Determine the edit that led into the snake
        if d - 1 in prev_V and prev_V[d - 1] + 1 == xs:
            # Deletion
            ops.append(('-', a[xs - 1]))
            d -= 1
            x = xs - 1
            y = ys
        elif d + 1 in prev_V and prev_V[d + 1] == xs:
            # Insertion
            ops.append(('+', b[ys - 1]))
            d += 1
            x = xs
            y = ys - 1
        else:
            raise RuntimeError("Internal backtracking error")

    # Step 0: the initial diagonal match from the origin
    for i in range(x - 1, -1, -1):
        ops.append(('=', a[i]))

    ops.reverse()
    return ops
```