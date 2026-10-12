```python
from heapq import heappush, heappop


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    half = (k + 1) >> 1  # target size for lo

    lo: list[tuple[float, int]] = []   # max-heap via (-val, idx)
    hi: list[tuple[float, int]] = []   # min-heap via (val, idx)
    gone = bytearray(n)                # 1 if index removed from window
    hof = bytearray(n)                 # 0 = in lo, 1 = in hi
    ls = 0                             # effective size of lo
    hs = 0                             # effective size of hi

    result: list[float] = []
    res_append = result.append

    # Build initial window
    for i in range(k):
        v = nums[i]
        if ls == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, i))
            ls += 1
            hof[i] = 0
        else:
            heappush(hi, (v, i))
            hs += 1
            hof[i] = 1
        # rebalance
        while ls > half:
            while lo and gone[lo[0][1]]:
                heappop(lo)
            nv, idx = heappop(lo)
            ls -= 1
            heappush(hi, (-nv, idx))
            hs += 1
            hof[idx] = 1
        while ls < half and hs > 0:
            while hi and gone[hi[0][1]]:
                heappop(hi)
            v2, idx = heappop(hi)
            hs -= 1
            heappush(lo, (-v2, idx))
            ls += 1
            hof[idx] = 0

    # First median
    while lo and gone[lo[0][1]]:
        heappop(lo)
    while hi and gone[hi[0][1]]:
        heappop(hi)
    if k & 1:
        res_append(float(-lo[0][0]))
    else:
        res_append((-lo[0][0] + hi[0][0]) * 0.5)

    # Slide window
    for i in range(1, n - k + 1):
        # Remove leftmost element of previous window
        old = i - 1
        if hof[old] == 0:
            ls -= 1
        else:
            hs -= 1
        gone[old] = 1

        # Add new rightmost element
        ni = i + k - 1
        v = nums[ni]
        while lo and gone[lo[0][1]]:
            heappop(lo)
        if ls == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, ni))
            ls += 1
            hof[ni] = 0
        else:
            heappush(hi, (v, ni))
            hs += 1
            hof[ni] = 1

        # Rebalance
        while ls > half:
            while lo and gone[lo[0][1]]:
                heappop(lo)
            nv, idx = heappop(lo)
            ls -= 1
            heappush(hi, (-nv, idx))
            hs += 1
            hof[idx] = 1
        while ls < half and hs > 0:
            while hi and gone[hi[0][1]]:
                heappop(hi)
            v2, idx = heappop(hi)
            hs -= 1
            heappush(lo, (-v2, idx))
            ls += 1
            hof[idx] = 0

        # Compute median
        while lo and gone[lo[0][1]]:
            heappop(lo)
        while hi and gone[hi[0][1]]:
            heappop(hi)
        if k & 1:
            res_append(float(-lo[0][0]))
        else:
            res_append((-lo[0][0] + hi[0][0]) * 0.5)

    return result
```