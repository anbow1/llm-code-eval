```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    if k == 1:
        return list(nums)

    lo: list[float] = []  # max-heap (negated values), lower half
    hi: list[float] = []  # min-heap, upper half
    delayed_lo: dict[float, int] = defaultdict(int)
    delayed_hi: dict[float, int] = defaultdict(int)
    lo_size = 0
    hi_size = 0

    def lo_clean():
        nonlocal lo_size
        while lo and -lo[0] in delayed_lo:
            delayed_lo[-lo[0]] -= 1
            if delayed_lo[-lo[0]] == 0:
                del delayed_lo[-lo[0]]
            heapq.heappop(lo)
            lo_size -= 1

    def hi_clean():
        nonlocal hi_size
        while hi and hi[0] in delayed_hi:
            delayed_hi[hi[0]] -= 1
            if delayed_hi[hi[0]] == 0:
                del delayed_hi[hi[0]]
            heapq.heappop(hi)
            hi_size -= 1

    def lo_balance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1

    def hi_balance():
        nonlocal lo_size, hi_size
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1

    def add(val: float):
        nonlocal lo_size, hi_size
        if lo_size == 0 or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1

    def remove(val: float):
        nonlocal lo_size, hi_size
        if lo_size > 0 and val <= -lo[0]:
            lo_size -= 1
            delayed_lo[val] += 1
        else:
            hi_size -= 1
            delayed_hi[val] += 1

    # Build the first window
    for i in range(k):
        add(nums[i])
    lo_balance()
    hi_balance()

    result: list[float] = []
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)

    for i in range(k, n):
        lo_clean()
        hi_clean()
        remove(nums[i - k])
        lo_balance()
        hi_balance()
        add(nums[i])
        lo_balance()
        hi_balance()
        lo_clean()
        hi_clean()

        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)

    return result
```