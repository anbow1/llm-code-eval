import heapq
from collections import Counter


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must satisfy 1 <= k <= len(nums), got k={k}, len(nums)={n}")

    lo: list[float] = []   # max-heap (values negated)
    hi: list[float] = []   # min-heap
    to_remove: Counter[float] = Counter()
    lo_size = 0
    hi_size = 0

    result: list[float] = []

    def _clean_lo() -> None:
        nonlocal lo_size
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            lo_size -= 1
            heapq.heappop(lo)

    def _clean_hi() -> None:
        nonlocal hi_size
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            hi_size -= 1
            heapq.heappop(hi)

    for i in range(n):
        current_size = i + 1 if i + 1 < k else k
        lo_target = (current_size + 1) // 2
        hi_target = current_size // 2

        # --- Add nums[i] ---
        val = nums[i]
        if lo_size > 0:
            _clean_lo()
            if val <= -lo[0]:
                heapq.heappush(lo, -val)
                lo_size += 1
            else:
                heapq.heappush(hi, val)
                hi_size += 1
        else:
            heapq.heappush(lo, -val)
            lo_size += 1

        # --- Remove nums[i-k] if window has overflowed ---
        if i >= k:
            old = nums[i - k]
            _clean_lo()
            if lo_size > 0 and old <= -lo[0]:
                to_remove[old] += 1
                lo_size -= 1
            else:
                to_remove[old] += 1
                hi_size -= 1

        # --- Rebalance (at most one element out of place) ---
        if lo_size > lo_target:
            _clean_lo()
            v = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, v)
            hi_size += 1
        elif hi_size > hi_target:
            _clean_hi()
            v = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -v)
            lo_size += 1

        # --- Record median for full windows ---
        if i >= k - 1:
            _clean_lo()
            _clean_hi()
            if k % 2 == 1:
                result.append(float(-lo[0]))
            else:
                result.append((-lo[0] + hi[0]) / 2.0)

    return result
