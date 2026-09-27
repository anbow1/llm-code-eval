def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    vals = sorted(set(nums))
    m = len(vals)

    rank = {v: i + 1 for i, v in enumerate(vals)}
    ranks = [rank[x] for x in nums]

    bit = [0] * (m + 1)
    top = 1 << (m.bit_length() - 1)

    def add(idx, delta, bit=bit, m=m):
        while idx <= m:
            bit[idx] += delta
            idx += idx & -idx

    def kth(order, bit=bit, m=m, top=top):
        idx = 0
        step = top
        while step:
            nxt = idx + step
            if nxt <= m:
                b = bit[nxt]
                if b < order:
                    idx = nxt
                    order -= b
            step >>= 1
        return idx

    size = n - k + 1
    out = [0.0] * size

    for i in range(k):
        add(ranks[i], 1)

    if k & 1:
        order = k // 2 + 1
        out[0] = float(vals[kth(order)])

        for i in range(1, size):
            old = ranks[i - 1]
            new = ranks[i + k - 1]

            if old != new:
                add(old, -1)
                add(new, 1)
                out[i] = float(vals[kth(order)])
            else:
                out[i] = out[i - 1]
    else:
        o1 = k // 2
        o2 = o1 + 1
        out[0] = (vals[kth(o1)] + vals[kth(o2)]) / 2.0

        for i in range(1, size):
            old = ranks[i - 1]
            new = ranks[i + k - 1]

            if old != new:
                add(old, -1)
                add(new, 1)
                out[i] = (vals[kth(o1)] + vals[kth(o2)]) / 2.0
            else:
                out[i] = out[i - 1]

    return out
