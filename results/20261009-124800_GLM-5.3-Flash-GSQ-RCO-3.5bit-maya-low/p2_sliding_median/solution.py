import heapq
from collections import Counter
from typing import List


def sliding_median(nums: List[float], k: int) -> List[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    lo: List[float] = []  # max-heap (negated)
    hi: List[float] = []  # min-heap
    lo_count = 0
    hi_count = 0
    pending_out = Counter()
    lo_set: Counter = Counter()
    hi_set: Counter = Counter()
    result: List[float] = []

    def prune(heap: List[float], is_lo: bool) -> None:
        nonlocal lo_count, hi_count
        while heap:
            top = heap[0]
            val = -top if is_lo else top
            if pending_out[val] > 0:
                heapq.heappop(heap)
                pending_out[val] -= 1
                if is_lo:
                    lo_count -= 1
                else:
                    hi_count -= 1
            else:
                break

    def rebalance() -> None:
        nonlocal lo_count, hi_count
        # sizes differ by at most 1, lo_count >= hi_count
        if lo_count > hi_count + 1:
            prune(lo, True)
            val = -heapq.heappop(lo)
            lo_count -= 1
            lo_set[val] -= 1
            if lo_set[val] == 0:
                del lo_set[val]
            heapq.heappush(hi, val)
            hi_count += 1
            hi_set[val] += 1
            prune(lo, True)
        elif hi_count > lo_count:
            prune(hi, False)
            val = heapq.heappop(hi)
            hi_count -= 1
            hi_set[val] -= 1
            if hi_set[val] == 0:
                del hi_set[val]
            heapq.heappush(lo, -val)
            lo_count += 1
            lo_set[val] += 1
            prune(hi, False)

    def add(x: float) -> None:
        nonlocal lo_count, hi_count
        if lo_count and lo_set:
            prune(lo, True)
            largest_lo = -lo[0]
            if x <= largest_lo:
                heapq.heappush(lo, -x)
                lo_count += 1
                lo_set[x] += 1
                rebalance()
                return
        if hi_count and hi_set:
            prune(hi, False)
            smallest_hi = hi[0]
            if x >= smallest_hi:
                heapq.heappush(hi, x)
                hi_count += 1
                hi_set[x] += 1
                rebalance()
                return
        # default: add to lo side
        heapq.heappush(lo, -x)
        lo_count += 1
        lo_set[x] += 1
        rebalance()

    def remove(x: float) -> None:
        pending_out[x] += 1
        if lo_set.get(x, 0) > 0:
            lo_count -= 1
            lo_set[x] -= 1
            if lo_set[x] == 0:
                del lo_set[x]
        else:
            hi_count -= 1
            hi_set[x] -= 1
            if hi_set[x] == 0:
                del hi_set[x]
        prune(lo, True)
        prune(hi, False)
        rebalance()

    def median() -> float:
        prune(lo, True)
        prune(hi, False)
        if lo_count > hi_count:
            return float(-lo[0])
        else:
            return (-(lo[0]) + hi[0]) / 2.0

    for i in range(k):
        add(nums[i])
    result.append(median())

    for i in range(k, n):
        add(nums[i])
        remove(nums[i - k])
        result.append(median())

    return result
