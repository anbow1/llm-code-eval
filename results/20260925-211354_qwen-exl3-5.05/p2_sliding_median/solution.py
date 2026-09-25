def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    nan = float("nan")
    inf = float("inf")
    neg_inf = -inf

    # Exclude NaNs from coordinate compression. If a window contains a NaN,
    # its median is reported as NaN.
    finite = [x for x in nums if x == x]
    if not finite:
        return [nan] * (n - k + 1)

    vals = sorted(set(finite))
    rank = {v: i + 1 for i, v in enumerate(vals)}
    m = len(vals)

    has_nan = len(finite) != n
    if has_nan:
        ranks = [0 if x != x else rank[x] for x in nums]
    else:
        ranks = [rank[x] for x in nums]

    del finite, rank

    bit = [0] * (m + 1)
    nan_count = 0

    for i in range(k):
        idx = ranks[i]
        if idx:
            while idx <= m:
                bit[idx] += 1
                idx += idx & -idx
        else:
            nan_count += 1

    bitmask = 1 << (m.bit_length() - 1)

    def kth(target, bit=bit, m=m, bitmask=bitmask):
        idx = 0
        step = bitmask
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < target:
                idx = nxt
                target -= bit[nxt]
            step >>= 1
        return idx + 1

    def mean_pair(lo, hi, inf=inf, neg_inf=neg_inf, nan=nan):
        if lo == hi:
            return float(lo)
        if lo == neg_inf:
            return nan if hi == inf else neg_inf
        if hi == inf:
            return inf
        if lo < 0.0 <= hi:
            return lo / 2.0 + hi / 2.0
        return lo + (hi - lo) / 2.0

    res = []
    append = res.append
    windows = n - k + 1

    if k & 1:
        target = (k + 1) // 2

        if nan_count == 0:
            r = kth(target)
            append(float(vals[r - 1]))
        else:
            append(nan)

        for start in range(1, windows):
            out = ranks[start - 1]
            if out:
                idx = out
                while idx <= m:
                    bit[idx] -= 1
                    idx += idx & -idx
            else:
                nan_count -= 1

            inn = ranks[start + k - 1]
            if inn:
                idx = inn
                while idx <= m:
                    bit[idx] += 1
                    idx += idx & -idx
            else:
                nan_count += 1

            if nan_count:
                append(nan)
            else:
                r = kth(target)
                append(float(vals[r - 1]))
    else:
        left = k // 2
        right = left + 1

        if nan_count == 0:
            l = kth(left)
            r = kth(right)
            append(mean_pair(vals[l - 1], vals[r - 1]))
        else:
            append(nan)

        for start in range(1, windows):
            out = ranks[start - 1]
            if out:
                idx = out
                while idx <= m:
                    bit[idx] -= 1
                    idx += idx & -idx
            else:
                nan_count -= 1

            inn = ranks[start + k - 1]
            if inn:
                idx = inn
                while idx <= m:
                    bit[idx] += 1
                    idx += idx & -idx
            else:
                nan_count += 1

            if nan_count:
                append(nan)
            else:
                l = kth(left)
                r = kth(right)
                append(mean_pair(vals[l - 1], vals[r - 1]))

    return res
