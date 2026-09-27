```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    low: list[float] = []  # max-heap (values negated)
    high: list[float] = []  # min-heap
    removed_low: dict = defaultdict(int)
    removed_high: dict = defaultdict(int)
    size_low = 0
    size_high = 0

    target_low = (k + 1) // 2
    target_high = k - target_low

    def clean_low():
        while low and removed_low[-low[0]] > 0:
            val = -heapq.heappop(low)
            removed_low[val] -= 1

    def clean_high():
        while high and removed_high[high[0]] > 0:
            val = heapq.heappop(high)
            removed_high[val] -= 1

    def get_median() -> float:
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return float(-low[0] + high[0]) / 2.0

    # Initialize with the first k elements
    for i in range(k):
        x = nums[i]
        if size_low == 0 or x <= -low[0]:
            heapq.heappush(low, -x)
            size_low += 1
        else:
            heapq.heappush(high, x)
            size_high += 1
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1

    result = [get_median()]

    for i in range(k, n):
        out = nums[i - k]
        new = nums[i]

        # Remove 'out' from the appropriate heap
        clean_low()
        if size_low > 0 and out <= -low[0]:
            removed_low[out] += 1
            size_low -= 1
        else:
            removed_high[out] += 1
            size_high -= 1

        # Add 'new' to the appropriate heap
        clean_low()
        if size_low == 0 or new <= -low[0]:
            heapq.heappush(low, -new)
            size_low += 1
        else:
            heapq.heappush(high, new)
            size_high += 1

        # Rebalance
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1

        result.append(get_median())

    return result
```

This uses a **two-heap (multi-set) approach with lazy deletion** for O(n log k) time complexity:

- **`low`**: a max-heap (stored as negated values) holding the smaller half of the window.
- **`high`**: a min-heap holding the larger half.
- **Lazy deletion**: `removed_low`/`removed_high` counters track elements logically removed but not yet physically popped from the heaps. `clean_low()`/`clean_high()` pop the stale top elements before any read.
- **Rebalancing**: after each slide (one removal + one insertion), at most one element is moved between heaps to maintain `size_low = target_low` and `size_high = target_high`.

For n = 200 000 and k = 1 000, each of the ~200 000 window steps performs a constant number of O(log k) heap operations, giving roughly 10–20 million primitive operations — comfortably under 2 seconds in CPython.