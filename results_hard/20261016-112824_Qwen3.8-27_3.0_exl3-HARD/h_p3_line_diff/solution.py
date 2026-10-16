def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    offset = N + M
    size = 2 * offset + 1
    V = [0] * size

    trace: list[list[int]] = []

    for D in range(N + M + 1):
        for k in range(-D, D + 1, 2):
            ki = k + offset
            if k == -D or (k != D and V[ki - 1] < V[ki + 1]):
                x = V[ki + 1]
            else:
                x = V[ki - 1] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[ki] = x
            if x >= N and y >= M:
                trace.append(V[:])
                # Backtrack to build the edit script
                x, y = N, M
                k = N - M
                result: list[tuple[str, str]] = []
                for d in range(D, 0, -1):
                    prev = trace[d - 1]
                    if k == -d or (k != d and prev[k - 1 + offset] < prev[k + 1 + offset]):
                        # Came from diagonal k+1: insertion
                        result.append(("+", b[y - 1]))
                        y -= 1
                    else:
                        # Came from diagonal k-1: deletion
                        result.append(("-", a[x - 1]))
                        x -= 1
                    # Follow the diagonal backwards (matches)
                    while x > 0 and y > 0 and a[x - 1] == b[y - 1]:
                        result.append(("=", a[x - 1]))
                        x -= 1
                        y -= 1
                    k = x - y
                # Remaining matches (handles D == 0 case)
                while x > 0 and y > 0 and a[x - 1] == b[y - 1]:
                    result.append(("=", a[x - 1]))
                    x -= 1
                    y -= 1
                result.reverse()
                return result
        trace.append(V[:])

    # Unreachable: D is always found within N+M steps
    return []
