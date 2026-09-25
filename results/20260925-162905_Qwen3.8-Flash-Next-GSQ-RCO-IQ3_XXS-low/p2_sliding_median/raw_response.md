```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    values = sorted({x for x in nums if x == x})
    m = len(values)
    windows = n - k + 1

    if m == 0:
        return [float("nan")] * windows

    rank = {v: i + 1 for i, v in enumerate(values, 1)}
    comp = [0 if x != x else rank[x] for x in nums]

    bit = [0] * (m + 1)
    nan_count = 0

    for i in range(k):
        idx = comp[i]
        if idx:
            while idx <= m:
                bit[idx] += 1
                idx += idx & -idx
        else:
            nan_count += 1

    top = 1 << (m.bit_length() - 1)

    def kth(order, bit=bit, m=m, top=top):
        idx = 0
        step = top
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < order:
                idx = nxt
                order -= bit[nxt]
            step >>= 1
        return idx + 1

    res = [0.0] * windows
    nan = float("nan")
    out = 0

    if k & 1:
        need = (k >> 1) + 1

        if nan_count:
            res[0] = nan
        else:
            res[0] = float(values[kth(need) - 1])
        out = 1

        for i in range(k, n):
            idx = comp[i - k]
            if idx:
                while idx <= m:
                    bit[idx] -= 1
                    idx += idx & -idx
            else:
                nan_count -= 1

            idx = comp[i]
            if