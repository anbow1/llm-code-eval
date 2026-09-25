```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    window: list[float] = []
    result: list[float] = []
    insort = bisect.insort
    bisect_left = bisect.bisect_left

    for i in range(n):
        insort(window, nums[i])

        if i >= k:
            idx = bisect_left(window, nums[i - k])
            window.pop(idx)

        if len(window) == k:
            if k & 1:
                result.append(float(window[k >> 1]))
            else:
                mid = k >> 1
                result.append((window[mid - 1] + window[mid]) / 2.0)

    return result
```

**How it works:**

- Maintains a sorted list (`window`) of the current k elements using `bisect.insort` for O(log k) search + O(k) memmove insertion.
- When the window slides, the departing element is located via `bisect_left` (O(log k)) and removed via `pop` (O(k) memmove).
- The median is read directly from the sorted list in O(1).

**Complexity:** O(n·k) total, dominated by the O(k) list shift on each insert/delete. For n = 200 000 and k = 1 000, this is ~200 M pointer moves (≈1.6 GB of 8-byte pointer shuffling done in C-level `memmove`), which completes well under 2 seconds.