

```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    lower = []  # max-heap (stored negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0

    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2

    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1

    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1

    def add(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1

    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1

    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1

    # Initialise the first window
    for i in range(k):
        heapq.heappush(lower, -nums[i])
        lower_count += 1
    while lower_count > target_lower:
        v = -heapq.heappop(lower)
        heapq.heappush(upper, v)
        lower_count -= 1
        upper_count += 1

    result: list[float] = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])

    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()

        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])

    return result
```