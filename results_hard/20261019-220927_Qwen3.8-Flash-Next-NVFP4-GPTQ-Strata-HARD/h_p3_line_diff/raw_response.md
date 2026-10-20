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

    # Myers O((N+M)*D) algorithm
    # V[k] = furthest reaching x-coordinate on diagonal k (where k = x - y)
    # Initial condition: "virtual" point at diagonal 1 with x=0 so that k=0, d=0
    # takes x=0 via the k+1=1 branch.
    V: dict[int, int] = {1: 0}
    trace: list[dict[int, int]] = []

    found_d = -1
    for d in range(N + M + 1):
        trace.append(V)
        new_V: dict[int, int] = {}
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V.get(k - 1, -1) < V.get(k + 1, -1)):
                x = V.get(k + 1, 0)  # came from above (down/insert move)
            else:
                x = V.get(k - 1, 0) + 1  # came from left (right/delete move)

            y = x - k
            # Follow the diagonal (snake): extend while characters match
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            new_V[k] = x
            if x >= N and y >= M:
                found_d = d
                break

        V = new_V
        if found_d >= 0:
            break

    # Backtrack through the trace to recover the path of edit operations
    # path[i] = (prev_x, prev_y, cur_x, cur_y) meaning:
    #   from (prev_x, prev_y) we make ONE edit, then follow a snake to (cur_x, cur_y)
    path: list[tuple[int, int, int, int]] = []
    x, y = N, M
    for d in range(found_d, 0, -1):
        k = x - y
        prev_V = trace[d]
        if k == -d or (k != d and prev_V.get(k - 1, -1) < prev_V.get(k + 1, -1)):
            # Down (insert): previous position was on diagonal k+1
            prev_k = k + 1
            prev_x = prev_V.get(prev_k, 0)
            prev_y = prev_x - prev_k
        else:
            # Right (delete): previous position was on diagonal k-1
            prev_k = k - 1
            prev_x = prev_V.get(prev_k, 0)
            prev_y = prev_x - prev_k

        path.append((prev_x, prev_y, x, y))
        x, y = prev_x, prev_y

    # After backtracking, (x, y) is the end of the initial snake from (0,0).
    # The initial snake is always on diagonal 0, so x == y.
    initial_snake = x

    # Build the shortest edit script
    result: list[tuple[str, str]] = []
    ai = 0
    bi = 0

    # Emit the initial snake (leading matches before any edit)
    for _ in range(initial_snake):
        result.append(('=', a[ai]))
        ai += 1
        bi += 1

    # Emit each edit step: the single edit first, then the snake that follows
    for prev_x, prev_y, cur_x, cur_y in reversed(path):
        dx = cur_x - prev_x
        dy = cur_y - prev_y
        if dx == dy + 1:
            # Right move: delete a[prev_x], then diagonal snake of length dy
            result.append(('-', a[ai]))
            ai += 1
            for _ in range(dy):
                result.append(('=', a[ai]))
                ai += 1
                bi += 1
        else:
            # Down move: insert b[prev_y], then diagonal snake of length dx
            result.append(('+', b[bi]))
            bi += 1
            for _ in range(dx):
                result.append(('=', a[ai]))
                ai += 1
                bi += 1

    return result
```