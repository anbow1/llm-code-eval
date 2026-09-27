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
    offset = M
    size = N + M + 1

    V_prev = [-1] * size
    V_prev[offset] = 0

    trace = []
    D_found = 0

    for D in range(N + M + 1):
        V_curr = [-1] * size

        for k in range(-D, D + 1, 2):
            if k < -M or k > N:
                continue

            if k == -D:
                x = V_prev[k + 1 + offset]
            elif k == D:
                x = V_prev[k - 1 + offset] + 1
            else:
                x_del = V_prev[k - 1 + offset] + 1
                x_ins = V_prev[k + 1 + offset]
                x = x_del if x_del >= x_ins else x_ins

            if x < 0:
                continue

            # Extend along diagonal (matches)
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1

            V_curr[k + offset] = x

        trace.append(V_curr)

        if V_curr[N - M + offset] >= N:
            D_found = D
            break

        V_prev = V_curr

    # Backtrack to reconstruct the edit script
    ops: list[tuple] = []  # stored in reverse order

    k = N - M
    D = D_found

    while D > 0:
        V_curr = trace[D]
        V_prev_step = trace[D - 1]

        if k == -D:
            from_ins = True
        elif k == D:
            from_ins = False
        else:
            x_del = V_prev_step[k - 1 + offset] + 1
            x_ins = V_prev_step[k + 1 + offset]
            from_ins = x_ins > x_del

        if not from_ins:
            # Deletion from diagonal k-1
            x_e = V_prev_step[k - 1 + offset] + 1
            y_e = x_e - k
            ops.append(("del", x_e - 1))
            ops.append(("match", x_e, V_curr[k + offset]))
            k -= 1
        else:
            # Insertion from diagonal k+1
            x_e = V_prev_step[k + 1 + offset]
            y_e = x_e - (k + 1)
            ops.append(("ins", y_e))
            ops.append(("match", x_e, V_curr[k + offset]))
            k += 1

        D -= 1

    # D=0: initial diagonal
    end_x = trace[0][offset]
    ops.append(("match", 0, end_x))

    # Reverse and convert to output format
    ops.reverse()

    result: list[tuple[str, str]] = []
    for op in ops:
        tag = op[0]
        if tag == "match":
            for i in range(op[1], op[2]):
                result.append(("=", a[i]))
        elif tag == "del":
            result.append(("-", a[op[1]]))
        else:  # "ins"
            result.append(("+", b[op[1]]))

    return result
```