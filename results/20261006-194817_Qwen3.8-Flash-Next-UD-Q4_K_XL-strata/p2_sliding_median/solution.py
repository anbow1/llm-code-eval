import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]

    # lo: max-heap (negated values), holds the smaller half (size = ceil(k/2))
    # hi: min-heap, holds the larger half (size = floor(k/2))
    lo: list[float] = []
    hi: list[float] = []
    delayed: dict[float, int] = defaultdict(int)
    lo_size = 0
    hi_size = 0

    def prune_top(heap: list[float], is_max: bool) -> None:
        while heap:
            top = -heap[0] if is_max else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break

    def make_balance() -> None:
        nonlocal lo_size, hi_size
        total = lo_size + hi_size
        t_lo = (total + 1) // 2
        t_hi = total // 2
        while lo_size > t_lo:
            prune_top(lo, True)
            x = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
            prune_top(lo, True)
        while hi_size > t_hi:
            prune_top(hi, False)
            x = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
            prune_top(hi, False)

    def add(num: float) -> None:
        nonlocal lo_size, hi_size
        prune_top(lo, True)
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
            lo_size += 1
        else:
            heapq.heappush(hi, num)
            hi_size += 1
        make_balance()

    def remove(num: float) -> None:
        nonlocal lo_size, hi_size
        prune_top(lo, True)
        if lo and num <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[num] += 1
        make_balance()

    def get_median() -> float:
        prune_top(lo, True)
        prune_top(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    result: list[float] = []
    for i in range(n):
        add(nums[i])
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            result.append(get_median())

    return result
