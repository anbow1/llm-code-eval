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

    max_d = N + M
    offset = max_d
    v_size = 2 * max_d + 1

    trace: list[list[int]] = []
    v = [0] * v_size
    v[offset + 1] = 0

    final_d = 0
    for d in range(max_d + 1):
        trace.append(v[:])
        found = False
        for k in range(-d, d + 1, 2):
            ko = offset + k
            if k == -d or (k != d and v[ko - 1] < v[ko + 1]):
                x = v[ko + 1]
            else:
                x = v[ko - 1] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            v[ko] = x
            if x >= N and y >= M:
                found = True
                final_d = d
                break
        if found:
            break

    # Backtrack to produce the edit script
    x, y = N, M
    edits: list[tuple[str, str]] = []

    for d in range(final_d, 0, -1):
        v_prev = trace[d]
        k = x - y
        ko = offset + k
        if k == -d or (k != d and v_prev[ko - 1] < v_prev[ko + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[offset + prev_k]
        prev_y = prev_x - prev_k

        # Diagonal (matching) moves
        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
            edits.append(("=", a[x]))

        # The single edit move
        if x == prev_x:
            # Came from above: insertion from b
            y -= 1
            edits.append(("+", b[y]))
        else:
            # Came from left: deletion from a
            x -= 1
            edits.append(("-", a[x]))

    # Remaining common prefix (diagonal at d=0)
    while x > 0 and y > 0:
        x -= 1
        y -= 1
        edits.append(("=", a[x]))

    edits.reverse()
    return edits
```