import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > n:
        raise ValueError("k must not exceed the length of nums")

    heappush = heapq.heappush
    heappop = heapq.heappop

    # Two heaps over window values.
    # `low` is a max-heap simulated with negated values (lower half),
    # `high` is a min-heap (upper half).
    # Invariant on valid element counts: low_size == high_size or low_size == high_size + 1.
    low: list[float] = []
    high: list[float] = []
    delayed: dict[float, int] = {}  # pending deletions by value
    low_size = 0
    high_size = 0

    def prune(heap: list[float], sign: int) -> None:
        # sign = -1 for `low` (stored negated), +1 for `high`.
        # Pop elements off the top that are marked as deleted.
        while heap:
            v = heap[0] * sign
            c = delayed.get(v, 0)
            if c == 0:
                break
            delayed[v] = c - 1
            heappop(heap)

    def rebalance() -> None:
        nonlocal low_size, high_size
        if low_size > high_size + 1:
            prune(low, -1)
            heappush(high, -heappop(low))
            low_size -= 1
            high_size += 1
        elif high_size > low_size:
            prune(high, 1)
            heappush(low, -heappop(high))
            high_size -= 1
            low_size += 1

    def add(v: float) -> None:
        nonlocal low_size, high_size
        prune(low, -1)
        prune(high, 1)
        if not low or v <= -low[0]:
            heappush(low, -v)
            low_size += 1
        else:
            heappush(high, v)
            high_size += 1
        rebalance()

    def remove(v: float) -> None:
        nonlocal low_size, high_size
        prune(low, -1)
        prune(high, 1)
        if low and v <= -low[0]:
            low_size -= 1
            delayed[v] = delayed.get(v, 0) + 1
            prune(low, -1)
        else:
            high_size -= 1
            delayed[v] = delayed.get(v, 0) + 1
            prune(high, 1)
        rebalance()

    def median() -> float:
        prune(low, -1)
        prune(high, 1)
        if k & 1:
            return -low[0]
        return (-low[0] + high[0]) / 2

    out: list[float] = []
    append = out.append
    for i in range(n):
        add(nums[i])
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            append(median())
    return out
