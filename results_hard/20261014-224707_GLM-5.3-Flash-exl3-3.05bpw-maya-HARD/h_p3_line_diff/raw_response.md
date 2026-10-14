```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script between line lists a and b.

    Uses Myers' O((N+M)D) algorithm with compact trace storage
    (O(D^2) integers, 4 bytes each), giving a minimal script:
    the number of "=" items equals the LCS length.
    """
    out: list[tuple[str, str]] = []
    _diff(a, 0, len(a), b, 0, len(b), out)
    return out


def _diff(a, a0, an, b, b0, bn, out):
    # Trim common prefix / suffix (huge win for nearly identical inputs).
    while a0 < an and b0 < bn and a[a0] == b[b0]:
        out.append(("=", a[a0]))
        a0 += 1
        b0 += 1
    while an > a0 and bn > b0 and a[an - 1] == b[bn - 1]:
        an -= 1
        bn -= 1
    n = an - a0
    m = bn - b0
    if n == 0:
        for i in range(b0, bn):
            out.append(("+", b[i]))
        return
    if m == 0:
        for i in range(a0, an):
            out.append(("-", a[i]))
        return
    # Fast path: no common lines at all -> LCS = 0.
    if not (set(a[a0:an]) & set(b[b0:bn])):
        for i in range(a0, an):
            out.append(("-", a[i]))
        for i in range(b0, bn):
            out.append(("+", b[i]))
        return
    _myers(a, a0, an, b, b0, bn, out)


def _myers(a, a0, an, b, b0, bn, out):
    n = an - a0
    m = bn - b0
    offset = n + m
    size = 2 * offset + 1
    v = [0] * size          # v[offset + k] = furthest x on diagonal k
    store = array("i")      # flat trace: snapshot d at index d*d, length 2d+1
    d_final = -1
    k_final = 0
    max_d = n + m
    for d in range(max_d + 1):
        # snapshot of state before step d (window [-d, d])
        store.extend(v[offset - d : offset + d + 1])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[offset + k - 1] < v[offset + k + 1]):
                x = v[offset + k + 1]        # vertical move (insertion)
            else:
                x = v[offset + k - 1] + 1    # horizontal move (deletion)
            y = x - k
            xa = x
            ya = y
            while x < n and y < m and a[a0 + x] == b[b0 + y]:
                x += 1
                y += 1
            v[offset + k] = x
            if x >= n and y >= m:
                d_final = d
                k_final = k
                break
        if d_final >= 0:
            break
    # Backtrack from (n, m) at depth d_final.
    snake_starts = []  # (x_arrival, y_arrival, x_end, y_end) per depth, forward order
    x, y = n, m
    k = k_final
    d = d_final
    while d > 0:
        base = (d - 1) * (d - 1)
        w = d - 1
        sk = k + w  # index into snapshot window for diagonal k
        if k == -d or (k != d and store[base + sk - 1] < store[base + sk + 1]):
            pk = k + 1
        else:
            pk = k - 1
        px = store[base + pk + w]
        py = px - pk
        if pk == k + 1:
            ax, ay = px, py + 1
        else:
            ax, ay = px + 1, py
        snake_starts.append((ax, ay, x, y))
        x, y = px, py
        k = pk
        d -= 1
    snake_starts.reverse()
    # Emit: snake_starts[0] begins at (0,0).
    prev_x = 0
    prev_y = 0
    for ax, ay, ex, ey in snake_starts:
        for i in range(prev_x, ax):
            out.append(("-", a[a0 + i]))
        for j in range(prev_y, ay):
            out.append(("+", b[b0 + j]))
        for i in range(ax, ex):
            out.append(("=", a[a0 + i]))
        prev_x = ex
        prev_y = ey
    for i in range(prev_x, n):
        out.append(("-", a[a0 + i]))
    for j in range(prev_y, m):
        out.append(("+", b[b0 + j]))
```