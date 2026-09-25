```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    if k == n:
        s = sorted(nums)
        half = n // 2
        if n & 1:
            return [float(s[half])]
        return [s[half - 1] * 0.5 + s[half] * 0.5]

    vals = sorted(set(nums))
    m = len(vals)
    idx_of = {v: i + 1 for i, v in enumerate(vals)}
    compressed = [idx_of[x] for x in nums]

    tree = [0] * (m + 1)

    for i in range(k):
        p = compressed[i]
        while p <= m:
            tree[p] += 1
            p += p & -p

    steps = tuple(1 << b for b in range(m.bit_length() - 1, -1, -1))

    def kth(order: int, tree=tree, m=m, steps=steps) -> int:
        idx = 0
        for step in steps:
            nxt = idx + step
            if nxt <= m and tree[nxt] < order:
                order -= tree[nxt]
                idx = nxt
        return idx

    out_count = n - k + 1
    res = [0.0] * out_count
    half = k // 2

    if k & 1:
        order = half + 1
        res[0] = float(vals[kth(order)])

        for start in range(1, out_count):
            p = compressed[start - 1]
            while p <= m:
                tree[p] -= 1
                p += p & -p

            p = compressed[start + k - 1]
            while p <= m:
                tree[p] += 1
                p += p & -p

            res[start] = float(vals[kth(order)])
    else:
        low_order = half
        high_order = half + 1

        a = vals[kth(low_order)]
        b = vals[kth(high_order)]
        res[0] = a * 0.5 + b * 0.5

        for start in range(1, out_count):
            p = compressed[start - 1]
            while p <= m:
                tree[p] -= 1
                p += p & -p

            p = compressed[start + k - 1]
            while p <= m:
                tree[p] += 1
                p += p & -p

            a = vals[kth(low_order)]
            b = vals[kth(high_order)]
            res[start] = a * 0.5 + b * 0.5

    return res
```