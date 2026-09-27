

```python
from bisect import insort, bisect_left


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    window: list[float] = []
    result: list[float] = []
    mid_hi = k // 2
    mid_lo = mid_hi - 1 if k % 2 == 0 else mid_hi

    for i in range(len(nums)):
        insort(window, nums[i])
        if len(window) > k:
            pos = bisect_left(window, nums[i - k])
            del window[pos]
        if len(window) == k:
            if k % 2 == 1:
                result.append(window[mid_hi])
            else:
                result.append((window[mid_lo] + window[mid_hi]) / 2.0)

    return result
```