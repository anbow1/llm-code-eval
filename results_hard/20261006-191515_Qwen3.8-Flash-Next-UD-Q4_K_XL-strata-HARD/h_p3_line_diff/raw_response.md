```python
from array import array


def _backtrack(trace: list[array], a: list[str], b: list[str], D: int) -> list[tuple[str, str]]:
    ops_rev: list[tuple[str, str]] = []
    append = ops_rev.append

    x = len(a)
    y = len(b)

    for d in range(D, 0, -1):
        prev = trace[d - 1]
        k = x - y
        j = (k + d) // 2

        if j == 0:
            prev_k = k + 1
            prev_x = prev[0]
        elif j == d:
            prev_k = k - 1
            prev_x = prev[d - 1]
        else:
            left = prev[j - 1]
            right = prev[j]
            if left < right:
                prev_k = k + 1
                prev_x = right
            else:
                prev_k = k - 1
                prev_x = left

        prev_y = prev_x - prev_k

        while x > prev_x and y > prev_y:
            x -= 1
            y -= 1
            append(("=", a[x]))

        if prev_k == k + 1:
            append(("+", b[y - 1]))
        else:
            append(("-", a[x - 1]))

        x = prev_x
        y = x - prev_k

    while x > 0 and y > 0:
        x -= 1
        y -= 1
        append(("=", a[x]))

    ops_rev.reverse()
    return ops_rev


def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Intern only lines present in a.  Lines absent from a all share id -1;
    # they can never match an a-line because all a-line ids are non-negative.
    id_map: dict[str, int] = {}
    get_id = id_map.get

    a_ids: list[int] = []
    append_a = a_ids.append
    for line in a:
        ident = get_id(line)
        if ident is None:
            ident = len(id_map)
            id_map[line] = ident
        append_a(ident)

    b_ids: list[int] = []
    append_b = b_ids.append
    common = False
    for line in b:
        ident = get_id(line)
        if ident is None:
            ident = -1
        else:
            common = True
        append_b(ident)

    if not common:
        result = [("-", line) for line in a]
        result.extend(("+", line) for line in b)
        return result

    trace: list[array] = []

    x = 0
    y = 0
    while x < n and y < m and a_ids[x] == b_ids[y]:
        x += 1
        y += 1

    if x >= n and y >= m:
        return [("=", line) for line in a]

    trace.append(array("i", [x]))

    aa = a_ids
    bb = b_ids
    nn = n
    mm = m

    # Compact representation: for edit distance d, store only diagonals
    # k = -d, -d+2, ..., d in array positions 0..d.
    for d in range(1, nn + mm + 1):
        prev = trace[-1]
        cur = array("i", [0]) * (d + 1)

        # j = 0 corresponds to k = -d, only reachable by an insertion.
        x = prev[0]
        y = x + d
        if y >= 0:
            while x < nn and y < mm and aa[x] == bb[y]:
                x += 1
                y += 1
        cur[0] = x
        if x >= nn and y >= mm:
            return _backtrack(trace, a, b, d)

        # Interior diagonals.
        for j in range(1, d):
            left = prev[j - 1]   # V[k - 1]
            right = prev[j]      # V[k + 1]

            if left < right:
                x = right        # insertion
            else:
                x = left + 1     # deletion

            y = x + d - 2 * j

            if y >= 0:
                while x < nn and y < mm and aa[x] == bb[y]:
                    x += 1
                    y += 1

            cur[j] = x
            if x >= nn and y >= mm:
                return _backtrack(trace, a, b, d)

        # j = d corresponds to k = d, only reachable by a deletion.
        x = prev[d - 1] + 1
        y = x - d
        if y >= 0:
            while x < nn and y < mm and aa[x] == bb[y]:
                x += 1
                y += 1
        cur[d] = x
        if x >= nn and y >= mm:
            return _backtrack(trace, a, b, d)

        trace.append(cur)

    # Should be unreachable, but preserves correctness if used as a fallback.
    result = [("-", line) for line in a]
    result.extend(("+", line) for line in b)
    return result


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Trim common prefix.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1

    # Trim common suffix without overlapping the prefix.
    s = 0
    max_s = min(n - p, m - p)
    while s < max_s and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    if p or s:
        result: list[tuple[str, str]] = [("=", line) for line in a[:p]]
        result.extend(_myers_diff(a[p:n - s], b[p:m - s]))
        result.extend(("=", line) for line in b[m - s:])
        return result

    return _myers_diff(a, b)
```