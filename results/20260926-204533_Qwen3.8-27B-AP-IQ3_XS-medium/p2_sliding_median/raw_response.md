```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    lo = []  # max-heap (negated values)
    hi = []  # min-heap
    lazy = defaultdict(int)

    lo_size = (k + 1) // 2
    hi_size = k // 2

    # Build initial window by sorting and splitting
    first = sorted(nums[:k])
    for val in first[:lo_size]:
        heapq.heappush(lo, -val)
    for val in first[lo_size:]:
        heapq.heappush(hi, val)

    def clean_lo():
        while lo:
            val = -lo[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(lo)
            else:
                break

    def clean_hi():
        while hi:
            val = hi[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(hi)
            else:
                break

    def rebalance():
        nonlocal lo_size, hi_size
        if lo_size < hi_size:
            heapq.heappush(lo, -heapq.heappop(hi))
            hi_size -= 1
            lo_size += 1
        elif lo_size > hi_size + 1:
            heapq.heappush(hi, -heapq.heappop(lo))
            lo_size -= 1
            hi_size += 1
        if lo and hi and -lo[0] > hi[0]:
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)

    def median():
        if k & 1:
            return float(-lo[0])
        return float((-lo[0] + hi[0]) / 2.0)

    result = [median()]

    for i in range(k, n):
        leaving = nums[i - k]

        clean_lo()

        if lo and leaving <= -lo[0]:
            lo_size -= 1
            lazy[leaving] += 1
        else:
            hi_size -= 1
            lazy[leaving] += 1

        clean_lo()
        clean_hi()

        entering = nums[i]
        if not lo or entering <= -lo[0]:
            heapq.heappush(lo, -entering)
            lo_size += 1
        else:
            heapq.heappush(hi, entering)
            hi_size += 1

        rebalance()
        result.append(median())

    return result
```