```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    result: list[float] = []

    # lo: max-heap (stored as negatives) for the lower half
    # hi: min-heap for the upper half
    lo: list[float] = []
    hi: list[float] = []
    delayed: dict[float, int] = defaultdict(int)
    lo_size = 0  # logical (live) count in lo
    hi_size = 0  # logical (live) count in hi

    def prune(heap: list[float], is_max: bool) -> None:
        """Remove delayed elements from the top of *heap*."""
        while heap:
            top = -heap[0] if is_max else heap[0]
            cnt = delayed.get(top, 0)
            if cnt > 0:
                delayed[top] = cnt - 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break

    def rebalance() -> None:
        nonlocal lo_size, hi_size
        # lo holds ceil(k/2), hi holds floor(k/2) live elements
        while lo_size > hi_size + 1:
            prune(lo, True)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            prune(hi, False)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1

    # --- build the first window ---
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        rebalance()

    # --- emit median for first window ---
    prune(lo, True)
    prune(hi, False)
    if k & 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)

    # --- slide ---
    for i in range(k, n):
        # remove the element that slides out
        old = nums[i - k]
        prune(lo, True)
        if old <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[old] += 1

        # insert the new element
        prune(lo, True)
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1

        rebalance()

        # read median
        prune(lo, True)
        prune(hi, False)
        if k & 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)

    return result
```