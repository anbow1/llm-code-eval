import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)

    # Two-heap with lazy deletion for O(n log k) total time.
    lo = []       # max-heap (negated values) – lower half
    hi = []       # min-heap – upper half
    delayed: dict[float, int] = {}
    lo_size = 0   # effective (non-deleted) count in lo
    hi_size = 0   # effective (non-deleted) count in hi

    def prune(heap: list, is_lo: bool) -> None:
        while heap:
            val = -heap[0] if is_lo else heap[0]
            cnt = delayed.get(val, 0)
            if cnt > 0:
                heapq.heappop(heap)
                if cnt == 1:
                    del delayed[val]
                else:
                    delayed[val] = cnt - 1
            else:
                break

    def make_balance() -> None:
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
            prune(lo, True)
        elif lo_size < hi_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
            prune(hi, False)

    def add(num: float) -> None:
        nonlocal lo_size, hi_size
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
            lo_size += 1
        else:
            heapq.heappush(hi, num)
            hi_size += 1
        make_balance()

    def remove(num: float) -> None:
        nonlocal lo_size, hi_size
        if num <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[num] = delayed.get(num, 0) + 1
        if lo and num == -lo[0]:
            prune(lo, True)
        if hi and num == hi[0]:
            prune(hi, False)
        make_balance()

    def get_median() -> float:
        prune(lo, True)
        prune(hi, False)
        if k & 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) * 0.5

    # Build the first window
    for i in range(k):
        add(nums[i])

    result: list[float] = [get_median()]

    # Slide the window
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())

    return result
