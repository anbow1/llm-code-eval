```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)

    if n == 0 and m == 0:
        return []
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m

    # --- First pass: determine edit distance D ---
    off1 = max_d
    v = [0] * (2 * max_d + 1)
    D = max_d

    for d in range(max_d + 1):
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + off1] < v[k + 1 + off1]):
                x = v[k + 1 + off1]
            else:
                x = v[k - 1 + off1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k + off1] = x
            if x >= n and y >= m:
                D = d
                break
        else:
            continue
        break

    if D == 0:
        return [("=", line) for line in a]

    # --- Second pass: rebuild with trace stored for backtracking ---
    off = D
    vsize = 2 * D + 1
    v = [0] * vsize
    trace: list[array] = []

    for d in range(D + 1):
        trace.append(array('i', v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + off] < v[k + 1 + off]):
                x = v[k + 1 + off]
            else:
                x = v[k - 1 + off] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k + off] = x

    # --- Backtrack to recover the shortest edit script ---
    x, y = n, m
    edits: list[tuple[str, str]] = []

    for d in range(D, 0, -1):
        vd = trace[d]
        k = x - y

        if k == -d or (k != d and vd[k - 1 + off] < vd[k + 1 + off]):
            prev_k = k + 1
        else:
            prev_k = k - 1

        prev_x = vd[prev_k + off]
        prev_y = prev_x - prev_k

        if prev_k == k + 1:
            # came via down (insert from b)
            mid_x, mid_y = prev_x, prev_y + 1
        else:
            # came via right (delete from a)
            mid_x, mid_y = prev_x + 1, prev_y

        # backtrack the snake
        while x > mid_x and y > mid_y:
            x -= 1
            y -= 1
            edits.append(("=", a[x]))

        # record the edit operation
        if prev_k == k + 1:
            edits.append(("+", b[prev_y]))
        else:
            edits.append(("-", a[prev_x]))

        x, y = prev_x, prev_y

    # initial snake from (0, 0) at d = 0
    while x > 0 and y > 0:
        x -= 1
        y -= 1
        edits.append(("=", a[x]))

    edits.reverse()
    return edits
```