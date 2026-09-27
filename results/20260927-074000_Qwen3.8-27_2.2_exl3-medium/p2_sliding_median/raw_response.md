

```python
import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    lower: list[float] = []   # max-heap (store negated values)
    upper: list[float] = []   # min-heap
    lower_count = 0
    upper_count = 0
    removed_lower: set[float] = set()
    removed_upper: set[float] = set()

    target_lower = (k + 1) // 2

    def clean_lower() -> None:
        while lower:
            val = -lower[0]
            if val in removed_lower:
                heapq.heappop(lower)
                removed_lower.remove(val)
            else:
                break

    def clean_upper() -> None:
        while upper:
            val = upper[0]
            if val in removed_upper:
                heapq.heappop(upper)
                removed_upper.remove(val)
            else:
                break

    def rebalance() -> None:
        # Ensure lower has exactly target_lower valid elements
        while lower_count > target_lower:
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
        while lower_count < target_lower:
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        # Restore invariant: max(lower) <= min(upper)
        clean_lower()
        clean_upper()
        while lower and upper and -lower[0] > upper[0]:
            a = -heapq.heappop(lower)
            lower_count -= 1
            b = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -b)
            heapq.heappush(upper, a)

    result: list[float] = []

    # Build the initial window
    for i in range(k):
        heapq.heappush(upper, nums[i])
        upper_count += 1
        rebalance()

    clean_lower()
    clean_upper()
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append(float((-lower[0] + upper[0]) / 2.0))

    # Slide the window
    for i in range(k, n):
        # Remove the element leaving the window
        old_val = nums[i - k]
        clean_lower()
        clean_upper()
        if lower_count > 0 and old_val <= -lower[0]:
            removed_lower.add(old_val)
            lower_count -= 1
        else:
            removed_upper.add(old_val)
            upper_count -= 1

        # Add the new element (always push to upper, rebalance fixes the split)
        heapq.heappush(upper, nums[i])
        upper_count += 1

        rebalance()

        clean_lower()
        clean_upper()
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append(float((-lower[0] + upper[0]) / 2.0))

    return result
```