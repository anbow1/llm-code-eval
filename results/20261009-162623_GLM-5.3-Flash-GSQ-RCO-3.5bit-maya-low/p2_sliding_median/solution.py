import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    lo: list[float] = []  # max-heap (negated) for lower half
    hi: list[float] = []  # min-heap for upper half
    delayed_lo: dict[float, int] = {}
    delayed_hi: dict[float, int] = {}

    lo_size = 0  # effective sizes after lazy deletions
    hi_size = 0

    def prune(heap: list[float], delayed: dict[float, int]) -> None:
        while heap:
            v = heap[0] if heap is hi else -heap[0]
            c = delayed.get(v, 0)
            if c == 0:
                return
            delayed[v] = c - 1
            if delayed[v] == 0:
                del delayed[v]
            heapq.heappop(heap)

    def rebalance() -> None:
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            prune(lo, delayed_lo)
            v = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, v)
            hi_size += 1
        elif lo_size < hi_size:
            prune(hi, delayed_hi)
            v = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -v)
            lo_size += 1

    def add(x: float) -> None:
        nonlocal lo_size, hi_size
        if lo and -lo[0] >= x:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()

    def remove(x: float) -> None:
        nonlocal lo_size, hi_size
        if lo and -lo[0] >= x:
            delayed_lo[x] = delayed_lo.get(x, 0) + 1
            lo_size -= 1
            if x == -lo[0]:
                prune(lo, delayed_lo)
        else:
            delayed_hi[x] = delayed_hi.get(x, 0) + 1
            hi_size -= 1
            if hi and x == hi[0]:
                prune(hi, delayed_hi)
        rebalance()

    result: list[float] = []

    for i, x in enumerate(nums):
        add(x)
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            prune(lo, delayed_lo)
            prune(hi, delayed_hi)
            if k % 2 == 1:
                result.append(float(-lo[0]))
            else:
                result.append((-lo[0] + hi[0]) / 2)

    return result
