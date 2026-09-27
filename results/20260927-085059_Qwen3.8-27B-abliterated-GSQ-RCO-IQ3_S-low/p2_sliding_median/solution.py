import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    result = []
    lo = []  # min-heap of negated values (acts as max-heap)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0

    def clean(heap: list, negate: bool) -> None:
        while heap:
            val = -heap[0] if negate else heap[0]
            if to_remove[val] > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
            else:
                break

    def rebalance() -> None:
        nonlocal lo_sz, hi_sz
        while lo_sz > hi_sz + 1:
            clean(lo, True)
            val = -heapq.heappop(lo)
            lo_sz -= 1
            heapq.heappush(hi, val)
            hi_sz += 1
        while hi_sz > lo_sz:
            clean(hi, False)
            val = heapq.heappop(hi)
            hi_sz -= 1
            heapq.heappush(lo, -val)
            lo_sz += 1

    def get_median() -> float:
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    # Initial fill
    for i in range(k):
        clean(hi, False)
        if hi_sz > 0 and nums[i] >= hi[0]:
            heapq.heappush(hi, nums[i])
            hi_sz += 1
        else:
            heapq.heappush(lo, -nums[i])
            lo_sz += 1
        rebalance()

    result.append(get_median())

    # Slide the window
    for i in range(k, n):
        # Remove the element leaving the window
        old = nums[i - k]
        to_remove[old] += 1
        clean(lo, True)
        if lo_sz > 0 and (not lo or old <= -lo[0]):
            lo_sz -= 1
        else:
            hi_sz -= 1

        # Add the new element
        x = nums[i]
        clean(hi, False)
        if hi_sz > 0 and x >= hi[0]:
            heapq.heappush(hi, x)
            hi_sz += 1
        else:
            heapq.heappush(lo, -x)
            lo_sz += 1

        rebalance()
        result.append(get_median())

    return result
