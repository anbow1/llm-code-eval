```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return list(nums)

    target_lo = (k + 1) // 2
    target_hi = k // 2

    # Initialize with sorted first window
    first = sorted(nums[:k])
    lo = [-x for x in first[:target_lo]]
    heapq.heapify(lo)
    hi = list(first[target_lo:])
    heapq.heapify(hi)

    lo_size = target_lo
    hi_size = target_hi
    delayed: dict[float, int] = defaultdict(int)

    def clean(heap: list[float]) -> None:
        while heap:
            val = -heap[0] if heap is lo else heap[0]
            if delayed[val]:
                heapq.heappop(heap)
                delayed[val] -= 1
            else:
                break

    def add(val: float) -> None:
        nonlocal lo_size, hi_size
        clean(lo)
        if val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1

    def remove(val: float) -> None:
        nonlocal lo_size, hi_size
        clean(lo)
        if val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1

    def rebalance() -> None:
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
        while hi_size > target_hi:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while lo_size < target_lo:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while hi_size < target_hi:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)

    def get_median() -> float:
        clean(lo)
        clean(hi)
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    results: list[float] = [get_median()]

    for i in range(1, n - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        rebalance()
        results.append(get_median())

    return results
```