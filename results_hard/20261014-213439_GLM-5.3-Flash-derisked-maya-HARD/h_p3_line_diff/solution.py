def diff_lines(a, b):
    out = []

    if a and b and set(a).isdisjoint(b):
        for s in a:
            out.append(("-", s))
        for s in b:
            out.append(("+", s))
        return out

    stack = [("d", 0, len(a), 0, len(b))]
    while stack:
        task = stack.pop()
        if len(task) == 2:
            out.append(task)
            continue
        a0, a1, b0, b1 = task[1], task[2], task[3], task[4]

        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0]))
            a0 += 1
            b0 += 1

        tail = []
        while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
            a1 -= 1
            b1 -= 1
            tail.append(("=", a[a1]))

        if a0 == a1:
            out.extend(("+", s) for s in b[b0:b1])
            out.extend(tail)
        elif b0 == b1:
            out.extend(("-", s) for s in a[a0:a1])
            out.extend(tail)
        else:
            snake = _middle_snake(a, b, a0, a1, b0, b1)
            if snake is None:
                out.extend(("-", s) for s in a[a0:a1])
                out.extend(("+", s) for s in b[b0:b1])
                out.extend(tail)
            else:
                x1, y1, x2, y2 = snake
                for i in range(len(tail) - 1, -1, -1):
                    stack.append(tail[i])
                stack.append(("d", x2, a1, y2, b1))
                for i in range(x2 - 1, x1 - 1, -1):
                    stack.append(("=", a[i]))
                stack.append(("d", a0, x1, b0, y1))
    return out


def _middle_snake(a, b, a0, a1, b0, b1):
    n = a1 - a0
    m = b1 - b0
    size = n + m
    delta = n - m
    odd = delta & 1
    off = size + (size >> 1) + 12
    vf = [-1] * (3 * size + 24)
    vr = [size + 1] * (3 * size + 24)
    vf[off + 1] = 0
    vr[off + delta - 1] = n
    d = 0
    limit = (size >> 1) + 2
    while d <= limit:
        if odd:
            flo = delta - d + 1
            fhi = delta + d - 1
        else:
            flo = 1
            fhi = 0
        for k in range(-d, d + 1, 2):
            ki = off + k
            if k == -d or (k != d and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            ax = a0 + x
            by = b0 + x - k
            while ax < a1 and by < b1 and a[ax] == b[by]:
                ax += 1
                by += 1
            x = ax - a0
            vf[ki] = x
            if flo <= k <= fhi and vr[ki] <= x:
                x1 = vr[ki]
                t = x1
                tk = t - k
                while t < x:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x:
                    return (a0 + x1, b0 + x1 - k, a0 + x, b0 + x - k)
        rlo = delta - d
        rhi = delta + d
        if odd:
            clo = 1
            chi = 0
        else:
            clo = -d
            chi = d
        for k in range(rlo, rhi + 1, 2):
            ki = off + k
            if k == rhi or (k != rlo and vr[ki + 1] > vr[ki - 1]):
                x = vr[ki - 1]
            else:
                x = vr[ki + 1] - 1
            ax = a0 + x
            by = b0 + x - k
            while ax > a0 and by > b0 and a[ax - 1] == b[by - 1]:
                ax -= 1
                by -= 1
            x = ax - a0
            vr[ki] = x
            if clo <= k <= chi and vr[ki] <= vf[ki]:
                x2 = vf[ki]
                t = x
                tk = t - k
                while t < x2:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x2:
                    return (a0 + x, b0 + x - k, a0 + x2, b0 + x2 - k)
        d += 1
    return None
