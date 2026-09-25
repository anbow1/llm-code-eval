import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    result: list[float] = []

    # lo: max-heap (negated values), effective size (k+1)//2
    # hi: min-heap, effective size k//2
    lo: list[float] = []
    hi: list[float] = []
    delayed: dict[float, int] = defaultdict(int)
    lo_size = 0
    hi_size = 0

    def clean_top_lo() -> None:
        while lo:
            top = -lo[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(lo)
            else:
                break

    def clean_top_hi() -> None:
        while hi:
            top = hi[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(hi)
            else:
                break

    def prune(val: float) -> None:
        nonlocal lo_size, hi_size
        delayed[val] += 1
        if lo and val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1

    def make_balance() -> None:
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2

        while lo_size > target_lo:
            clean_top_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1

        while lo_size < target_lo:
            clean_top_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1

        clean_top_lo()
        clean_top_hi()

    def insert(val: float) -> None:
        nonlocal lo_size, hi_size
        if not lo or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
        make_balance()

    def remove(val: float) -> None:
        prune(val)
        make_balance()

    def get_median() -> float:
        clean_top_lo()
        clean_top_hi()
        if k & 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    # Build first window
    for i in range(k):
        insert(nums[i])

    result.append(get_median())

    # Slide window
    for i in range(k, n):
        remove(nums[i - k])
        insert(nums[i])
        result.append(get_median())

    return result
