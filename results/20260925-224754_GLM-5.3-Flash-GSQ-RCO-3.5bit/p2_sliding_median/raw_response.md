```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k.

    Uses the classic dual-heap technique with lazy deletion, so each
    window update costs O(log k) amortized. Total O(n log k).
    """
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    out: list[float] = []

    small: list[float] = []  # max-heap via negation: lower half
    large: list[float] = []  # min-heap: upper half
    delayed: defaultdict[float, int] = defaultdict(int)  # pending deletions

    size_small = 0  # logical sizes (excluding lazily deleted entries)
    size_large = 0

    def prune(heap: list[float], is_small: bool) -> None:
        # Pop stale (marked-for-deletion) elements off the heap top.
        while heap:
            num = -heap[0] if is_small else heap[0]
            if delayed[num]:
                delayed[num] -= 1
                if not delayed[num]:
                    del delayed[num]
                heapq.heappop(heap)
            else:
                break

    def rebalance() -> None:
        nonlocal size_small, size_large
        if size_small > size_large + 1:
            heapq.heappush(large, -heapq.heappop(small))
            size_small -= 1
            size_large += 1
            prune(small, True)
        elif size_small < size_large:
            heapq.heappush(small, -heapq.heappop(large))
            size_large -= 1
            size_small += 1
            prune(large, False)

    def add(num: float) -> None:
        nonlocal size_small, size_large
        if small and num < -small[0]:
            heapq.heappush(small, -num)
            size_small += 1
        else:
            heapq.heappush(large, num)
            size_large += 1
        rebalance()

    def remove(num: float) -> None:
        nonlocal size_small, size_large
        delayed[num] += 1
        if small and num <= -small[0]:
            size_small -= 1
            prune(small, True)
        else:
            size_large -= 1
            prune(large, False)
        rebalance()

    def current_median() -> float:
        if k % 2:
            return float(-small[0])
        return (-small[0] + large[0]) / 2.0

    for i in range(k):
        add(nums[i])
    out.append(current_median())

    for i in range(k, n):
        add(nums[i])
        remove(nums[i - k])
        out.append(current_median())

    return out
```