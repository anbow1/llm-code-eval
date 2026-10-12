```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Trim common prefix.
    pre = 0
    while pre < len(a) and pre < len(b) and a[pre] == b[pre]:
        pre += 1
    # Trim common suffix.
    suf = 0
    while (suf < len(a) - pre and suf < len(b) - pre
           and a[len(a) - 1 - suf] == b[len(b) - 1 - suf]):
        suf += 1

    sa = a[pre:len(a) - suf]
    sb = b[pre:len(b) - suf]
    n, m = len(sa), len(sb)

    result: list[tuple[str, str]] = [("=", x) for x in a[:pre]]

    if n == 0 and m == 0:
        result.extend(("=", x) for x in a[len(a) - suf:])
        return result
    if n == 0:
        result.extend(("+", x) for x in sb)
        result.extend(("=", x) for x in a[len(a) - suf:])
        return result
    if m == 0:
        result.extend(("-", x) for x in sa)
        result.extend(("=", x) for x in a[len(a) - suf:])
        return result

    # Map lines to ints for fast comparison.
    ids: dict[str, int] = {}
    ia = [ids.setdefault(line, len(ids)) for line in sa]
    ib = [ids.setdefault(line, len(ids)) for line in sb]

    max_d = n + m
    off = max_d
    size = 2 * max_d + 1
    v = [0] * size
    trace: list[array] = []

    found = False
    for d in range(max_d + 1):
        trace.append(array('i', v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + off] < v[k + 1 + off]):
                x = v[k + 1 + off]
            else:
                x = v[k - 1 + off] + 1
            y = x - k
            while x < n and y < m and ia[x] == ib[y]:
                x += 1
                y += 1
            v[k + off] = x
            if x >= n and y >= m:
                found = True
                break
        if found:
            break

    # Backtrack.
    script: list[tuple[str, str]] = []
    x, y = n, m
    for d in range(len(trace) - 1, 0, -1):
        k = x - y
        prev = trace[d - 1]
        if k == -d or (k != d and prev[k - 1 + off] < prev[k + 1 + off]):
            prevk = k + 1
        else:
            prevk = k - 1
        prevx = prev[prevk + off]
        prevy = prevx - prevk
        while x > prevx and y > prevy:
            script.append(("=", sa[x - 1]))
            x -= 1
            y -= 1
        if prevk == k + 1:
            script.append(("+", sb[y - 1]))
            y -= 1
        else:
            script.append(("-", sa[x - 1]))
            x -= 1
    while x > 0 and y > 0:
        script.append(("=", sa[x - 1]))
        x -= 1
        y -= 1

    script.reverse()
    result.extend(script)
    result.extend(("=", line) for line in a[len(a) - suf:])
    return result
```