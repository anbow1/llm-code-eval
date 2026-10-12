"""Minimal (LDS/LCS-optimal) line diff based on Myers' O((N+M)·D) algorithm."""

from array import array


def diff_lines(a, b):
    """Return a shortest edit script between the lists of lines `a` and `b`.

    Items are ("=", line) kept from both, ("-", line) deleted from `a`,
    ("+", line) inserted from `b`.  The number of "=" items equals the
    length of a longest common subsequence, so the script is minimal.
    """
    n = len(a)
    m = len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    # Strip the common prefix (always safe for LCS optimality).
    lim = n if n < m else m
    p = 0
    while p < lim and a[p] == b[p]:
        p += 1
    # Strip the common suffix (without overlapping the prefix).
    s = 0
    tail = lim - p
    while s < tail and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    ca = a[p:n - s]
    cb = b[p:m - s]
    N = len(ca)
    M = len(cb)

    result = [("=", line) for line in a[:p]]

    if N == 0:
        result.extend([("+", line) for line in cb])
    elif M == 0:
        result.extend([("-", line) for line in ca])
    elif not set(ca) & set(cb):
        # No line is shared at all: the LCS is empty, D = N + M.
        result.extend([("-", line) for line in ca])
        result.extend([("+", line) for line in cb])
    else:
        result.extend(_myers(ca, cb))

    result.extend(("=", line) for line in a[n - s:])
    return result


def _myers(ca, cb):
    """Myers' O((N+M)·D) algorithm on the (already prefix/suffix-trimmed,
    non-disjoint) cores `ca` and `cb`.  Returns the middle edit script."""
    N = len(ca)
    M = len(cb)

    # Map lines to small integers so snake comparisons are O(1).
    table = {}
    ta = [table.setdefault(line, len(table)) for line in ca]
    tb = [table.setdefault(line, len(table)) for line in cb]

    off = N + M                      # index of diagonal k in V is k + off
    V = [0] * (2 * off + 2)
    trace = []                       # trace[d-1] = snapshot of V after step d
    D = -1

    # d = 0: the only diagonal is k = 0 (x = V[off + 1] is the implicit 0).
    x = 0
    y = 0
    while x < N and y < M and ta[x] == tb[y]:
        x += 1
        y += 1
    V[off] = x
    if x >= N and y >= M:
        D = 0

    if D < 0:
        for d in range(1, off + 1):
            found = False
            # k = -d: only an insert (down move) can start this diagonal.
            idx = off - d
            x = V[idx + 1]
            y = x + d
            while x < N and y < M and ta[x] == tb[y]:
                x += 1
                y += 1
            V[idx] = x
            if x >= N and y >= M:
                found = True
            if not found:
                for k in range(-d + 2, d, 2):
                    idx = k + off
                    lft = V[idx - 1]
                    rgt = V[idx + 1]
                    if lft < rgt:
                        x = rgt      # arrived via insert from diagonal k+1
                    else:
                        x = lft + 1  # arrived via delete from diagonal k-1
                    y = x - k
                    while x < N and y < M and ta[x] == tb[y]:
                        x += 1
                        y += 1
                    V[idx] = x
                    if x >= N and y >= M:
                        found = True
                        break
            if not found:
                # k = d: only a delete (right move) can start this diagonal.
                idx = off + d
                x = V[idx - 1] + 1
                y = x - d
                while x < N and y < M and ta[x] == tb[y]:
                    x += 1
                    y += 1
                V[idx] = x
                if x >= N and y >= M:
                    found = True
            trace.append(array('i', V[off - d:off + d + 1]))
            if found:
                D = d
                break

    # Backtrack from (N, M) to (0, 0), emitting the script from the end
    # backwards; reverse it at the end.
    out = []
    x = N
    y = M
    for d in range(D, 0, -1):
        Vd = trace[d - 1]
        k = x - y
        kd = k + d
        if k == -d or (k != d and Vd[kd - 1] < Vd[kd + 1]):
            # Arrived via insert of cb[y0]; snake covered ca[x0 .. x-1].
            x0 = Vd[kd + 1]
            y0 = x0 - k - 1
            for i in range(x - 1, x0 - 1, -1):
                out.append(("=", ca[i]))
            out.append(("+", cb[y0]))
            x = x0
            y = y0
        else:
            # Arrived via delete of ca[x0]; snake covered ca[x0+1 .. x-1].
            x0 = Vd[kd - 1]
            for i in range(x - 1, x0, -1):
                out.append(("=", ca[i]))
            out.append(("-", ca[x0]))
            x = x0
            y = x0 - k + 1
    # What remains is the initial snake along diagonal 0.
    for i in range(x - 1, -1, -1):
        out.append(("=", ca[i]))
    out.reverse()
    return out
