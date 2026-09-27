

```python
import heapq
from collections import deque


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    target_lower = (k + 1) // 2
    target_upper = k // 2

    lower: list[float] = []   # max-heap (store negated values)
    upper: list[float] = []   # min-heap
    removed_counts: dict[float, int] = {}
    assignments: deque[tuple[float, str]] = deque()
    lower_size = 0
    upper_size = 0

    def _add(x: float) -> None:
        nonlocal lower_size, upper_size
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_size += 1
            assignments.append((x, "lower"))
        else:
            heapq.heappush(upper, x)
            upper_size += 1
            assignments.append((x, "upper"))

    def _remove(x: float) -> None:
        nonlocal lower_size, upper_size
        _val, heap_name = assignments.popleft()
        removed_counts[x] = removed_counts.get(x, 0) + 1
        if heap_name == "lower":
            lower_size -= 1
        else:
            upper_size -= 1

    def _clean(heap: list[float], is_lower: bool) -> None:
        nonlocal lower_size, upper_size
        while heap:
            val = -heap[0] if is_lower else heap[0]
            if val in removed_counts:
                heapq.heappop(heap)
                removed_counts[val] -= 1
                if removed_counts[val] == 0:
                    del removed_counts[val]
                if is_lower:
                    lower_size -= 1
                else:
                    upper_size -= 1
            else:
                break

    def _rebalance() -> None:
        _clean(lower, True)
        _clean(upper, False)
        while lower_size > target_lower:
            val = -heapq.heappop(lower)
            lower_size -= 1
            heapq.heappush(upper, val)
            upper_size += 1
        while upper_size > target_upper:
            val = heapq.heappop(upper)
            upper_size -= 1
            heapq.heappush(lower, -val)
            lower_size += 1

    # Build the initial window
    for i in range(k):
        _add(nums[i])
    _rebalance()

    result: list[float] = []
    _clean(lower, True)
    _clean(upper, False)
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append((-lower[0] + upper[0]) / 2.0)

    # Slide the window
    for i in range(k, n):
        _remove(nums[i - k])
        _add(nums[i])
        _rebalance()

        _clean(lower, True)
        _clean(upper, False)
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append((-lower[0] + upper[0]) / 2.0)

    return result
```