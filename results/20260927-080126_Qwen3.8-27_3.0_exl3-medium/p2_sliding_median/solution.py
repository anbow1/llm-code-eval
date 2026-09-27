import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    lo: list[float] = []   # max-heap via negation
    hi: list[float] = []   # min-heap
    to_remove: dict[float, int] = {}
    lo_size = 0
    hi_size = 0

    def clean_lo() -> None:
        nonlocal lo_size
        while lo and -lo[0] in to_remove and to_remove[-lo[0]] > 0:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
            lo_size -= 1

    def clean_hi() -> None:
        nonlocal hi_size
        while hi and hi[0] in to_remove and to_remove[hi[0]] > 0:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
            hi_size -= 1

    def rebalance() -> None:
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1

    def add(x: float) -> None:
        nonlocal lo_size, hi_size
        clean_lo()
        clean_hi()
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()

    def remove(x: float) -> None:
        nonlocal lo_size, hi_size
        to_remove[x] = to_remove.get(x, 0) + 1
        clean_lo()
        if lo_size > 0 and x <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        clean_lo()
        clean_hi()
        rebalance()

    def get_median() -> float:
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    # Build initial window
    for i in range(k):
        add(nums[i])

    results: list[float] = [get_median()]

    # Slide the window
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        results.append(get_median())

    return results
