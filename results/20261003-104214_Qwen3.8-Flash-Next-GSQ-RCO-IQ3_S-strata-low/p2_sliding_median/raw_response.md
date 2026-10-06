```python
from bisect import insort, bisect_left


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("Invalid k")

    # Maintain a sorted list for the current window using bisect.
    # Removal: bisect_left to locate + list.pop (O(k) shift, but C-level).
    # Insertion: insort (O(log k) search + O(k) shift, C-level).
    # Total: O(n * k) with tiny constants due to C-implemented list ops.

    window: list[float] = sorted(nums[:k])
    result: list[float] = []
    mid = k // 2

    def _median() -> float:
        if k & 1:
            return float(window[mid])
        return (window[mid - 1] + window[mid]) / 2.0

    result.append(_median())

    for i in range(k, n):
        # Remove the element leaving the window
        out_idx = bisect_left(window, nums[i - k])
        window.pop(out_idx)

        # Insert the new element
        insort(window, nums[i])

        result.append(_median())

    return result
```