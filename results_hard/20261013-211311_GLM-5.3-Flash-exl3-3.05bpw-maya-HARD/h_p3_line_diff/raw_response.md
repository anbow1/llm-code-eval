```python
def diff_lines(a, b):
    """Return a minimal (LCS-maximal) edit script between two line lists."""
    out = []
    _diff(a, 0, len(a), b, 0, len(b), out)
    return out


def _diff(a, a0, a1, b, b0, b1, out):
    # Strip common prefix, emitting "=" immediately.
    while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
        out.append(("=", a[a0]))
        a0 += 1
        b0 += 1
    # Strip common suffix; emit after the middle part.
    suf = []
    while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
        suf.append(("=", a[a1 - 1]))
        a1 -= 1
        b1 -= 1
    n = a1 - a0
    m = b1 - b0
    if n == 0:
        for i in range(b0, b1):
            out.append(("+", b[i]))
    elif m == 0:
        for i in range(a0, a1):
            out.append(("-", a[i]))
    elif not _have_common(a, a0, a1, b, b0, b1):
        # No line occurs in both windows: pure replace, minimal by construction.
        for i in range(a0, a1):
            out.append(("-", a[i]))
        for i in range(b0, b1):
            out.append(("+", b[i]))
    else:
        _middle(a, a0, a1, b, b0, b1, out)
    suf.reverse()
    out.extend(suf)


def _have_common(a, a0, a1, b, b0, b1):
    sb = set(b[b0:b1])
    for i in range(a0, a1):
        if a[i] in sb:
            return True
    return False


def _middle(a, a0, aend, b, b0, bend, out):
    """Myers' linear-space refinement: find the middle snake of the window
    a[a0:aend] vs b[b0:bend], recurse on both halves (assumes both windows
    non-empty and their first/last lines differ)."""
    n = aend - a0
    m = bend - b0
    delta = n - m
    odd = delta & 1
    max_d = (n + m + 1) // 2
    off = max_d + 1
    size = 2 * max_d + 3
    vf = [0] * size
    vb = [0] * size
    vf[off + 1] = 0
    vb[off + 1] = 0
    d = 0
    while True:
        # Forward pass.
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d or (k != d and vf[i - 1] < vf[i + 1]):
                x = vf[i + 1]
            else:
                x = vf[i - 1] + 1
            xs = x
            ys = x - k
            xa = a0 + x
            xb = b0 + ys
            while xa < aend and xb < bend and a[xa] == b[xb]:
                xa += 1
                xb += 1
            x2 = xa - a0
            vf[i] = x2
            if odd:
                kt = k - delta
                if -d < kt < d and x2 + vb[off + delta - k] >= n:
                    # Middle snake found; total edit distance = 2*d - 1.
                    _diff(a, a0, a0 + xs, b, b0, b0 + ys, out)
                    for t in range(a0 + xs, xa):
                        out.append(("=", a[t]))
                    _diff(a, xa, aend, b, xb, bend, out)
                    return
        # Backward pass.
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d or (k != d and vb[i - 1] < vb[i + 1]):
                x = vb[i + 1]
            else:
                x = vb[i - 1] + 1
            xs = x
            ys = x - k
            xa = aend - x
            xb = bend - ys
            while xa > a0 and xb > b0 and a[xa - 1] == b[xb - 1]:
                xa -= 1
                xb -= 1
            x2 = aend - xa
            vb[i] = x2
            if not odd:
                kt = k - delta
                if -d <= kt <= d and x2 + vf[off + delta - k] >= n:
                    # Middle snake found; total edit distance = 2*d.
                    _diff(a, a0, xa, b, b0, xb, out)
                    for t in range(xa, aend - xs):
                        out.append(("=", a[t]))
                    _diff(a, aend - xs, aend, b, bend - ys, bend, out)
                    return
        d += 1
```