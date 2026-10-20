def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Trim common prefix
    lo = 0
    while lo < n and lo < m and a[lo] == b[lo]:
        lo += 1

    # Trim common suffix
    hi_a = n
    hi_b = m
    while hi_a > lo and hi_b > lo and a[hi_a - 1] == b[hi_b - 1]:
        hi_a -= 1
        hi_b -= 1

    # Prefix and suffix are all "="
    prefix = [("=", a[i]) for i in range(lo)]
    suffix = [("=", a[i]) for i in range(hi_a, n)]

    # Diff the middle section
    a_mid = a[lo:hi_a]
    b_mid = b[lo:hi_b]
    nm = len(a_mid)
    mm = len(b_mid)

    if nm == 0 and mm == 0:
        mid_edits: list[tuple[str, str]] = []
    elif nm == 0:
        mid_edits = [("+", line) for line in b_mid]
    elif mm == 0:
        mid_edits = [("-", line) for line in a_mid]
    else:
        mid_edits = _myers(a_mid, b_mid, nm, mm)

    return prefix + mid_edits + suffix


def _myers(a: list[str], b: list[str], n: int, m: int) -> list[tuple[str, str]]:
    max_d = n + m
    offset = max_d
    size = 2 * max_d + 1

    # Forward pass: compute furthest-reaching x on each diagonal k for each D
    V = [0] * size
    vs: list[list[int]] = []
    final_d = -1

    for d in range(max_d + 1):
        V_new = V[:]
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[k - 1 + offset] < V[k + 1 + offset]):
                x = V[k + 1 + offset]
            else:
                x = V[k - 1 + offset] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            V_new[k + offset] = x
            if x >= n and y >= m:
                final_d = d
                break
        vs.append(V_new)
        V = V_new
        if final_d >= 0:
            break

    # Backtrack to recover the edit script
    x = n
    y = m
    edits: list[tuple[str, str]] = []

    for d in range(final_d, 0, -1):
        V_prev = vs[d - 1]
        k = x - y

        if k == -d or (k != d and V_prev[k - 1 + offset] < V_prev[k + 1 + offset]):
            k_prev = k + 1  # came via insert (moved down)
        else:
            k_prev = k - 1  # came via delete (moved right)

        x_prev = V_prev[k_prev + offset]
        y_prev = x_prev - k_prev

        # Start of the diagonal snake after the edit move
        if k_prev == k + 1:
            x_start = x_prev  # insert: (x_prev, y_prev) -> (x_prev, y_prev+1)
        else:
            x_start = x_prev + 1  # delete: (x_prev, y_prev) -> (x_prev+1, y_prev)

        # Record snake matches in reverse order (will be reversed at the end)
        for i in range(x - 1, x_start - 1, -1):
            edits.append(("=", a[i]))

        # Record the edit operation
        if k_prev == k + 1:
            edits.append(("+", b[y_prev]))
        else:
            edits.append(("-", a[x_prev]))

        x = x_prev
        y = y_prev

    # Initial snake at D=0 (diagonal from (0,0))
    for i in range(x - 1, -1, -1):
        edits.append(("=", a[i]))

    edits.reverse()
    return edits
