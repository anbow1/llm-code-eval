import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    if k % 2 == 1:
        lo_target = (k + 1) // 2
        hi_target = k // 2
    else:
        lo_target = k // 2
        hi_target = k // 2

    lo: list[float] = []   # max-heap (values negated)
    hi: list[float] = []   # min-heap
    to_remove: dict[float, int] = {}

    def clean(heap: list[float], is_lo: bool) -> None:
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if val in to_remove:
                heapq.heappop(heap)
                to_remove[val] -= 1
                if to_remove[val] == 0:
                    del to_remove[val]
            else:
                break

    def add(val: float) -> None:
        if not lo:
            heapq.heappush(lo, -val)
        elif val <= -lo[0]:
            heapq.heappush(lo, -val)
        else:
            heapq.heappush(hi, val)

    def remove(val: float) -> None:
        clean(lo, True)
        clean(hi, False)
        if lo and val <= -lo[0]:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(lo, True)
        else:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(hi, False)

    def rebalance() -> None:
        while len(lo) > lo_target:
            heapq.heappush(hi, -heapq.heappop(lo))
        while len(hi) > hi_target:
            heapq.heappush(lo, -heapq.heappop(hi))
        # Restore partition invariant: max(lo) <= min(hi)
        if lo and hi and -lo[0] > hi[0]:
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)

    def get_median() -> float:
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (float(-lo[0]) + float(hi[0])) / 2.0

    # Build initial window
    for i in range(k):
        add(nums[i])
    rebalance()

    result = [get_median()]

    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        result.append(get_median())

    return result
