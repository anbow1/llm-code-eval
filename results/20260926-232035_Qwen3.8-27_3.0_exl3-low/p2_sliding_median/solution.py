import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return list(nums)

    low: list[float] = []   # max-heap via negation
    high: list[float] = []  # min-heap
    remove_low: dict[float, int] = defaultdict(int)
    remove_high: dict[float, int] = defaultdict(int)
    low_size = 0
    high_size = 0

    def clean_low() -> None:
        while low and remove_low[-low[0]] > 0:
            remove_low[-low[0]] -= 1
            heapq.heappop(low)

    def clean_high() -> None:
        while high and remove_high[high[0]] > 0:
            remove_high[high[0]] -= 1
            heapq.heappop(high)

    def rebalance() -> None:
        nonlocal low_size, high_size
        if k % 2 == 1:
            target_low = (k + 1) // 2
            target_high = k // 2
        else:
            target_low = k // 2
            target_high = k // 2

        while low_size > target_low:
            clean_low()
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1

        while high_size > target_high:
            clean_high()
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1

    # --- initialise first window ---
    for i in range(k):
        heapq.heappush(low, -nums[i])
        low_size += 1

    for _ in range(k // 2):
        clean_low()
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1

    results: list[float] = []

    clean_low()
    clean_high()
    if k % 2 == 1:
        results.append(float(-low[0]))
    else:
        results.append((-low[0] + high[0]) / 2.0)

    # --- slide the window ---
    for i in range(1, n - k + 1):
        out_val = nums[i - 1]
        in_val = nums[i + k - 1]

        clean_low()
        clean_high()

        # logical removal
        if out_val <= -low[0]:
            remove_low[out_val] += 1
            low_size -= 1
        else:
            remove_high[out_val] += 1
            high_size -= 1

        clean_low()
        clean_high()

        # logical insertion
        if in_val <= -low[0]:
            heapq.heappush(low, -in_val)
            low_size += 1
        else:
            heapq.heappush(high, in_val)
            high_size += 1

        rebalance()

        clean_low()
        clean_high()

        if k % 2 == 1:
            results.append(float(-low[0]))
        else:
            results.append((-low[0] + high[0]) / 2.0)

    return results
