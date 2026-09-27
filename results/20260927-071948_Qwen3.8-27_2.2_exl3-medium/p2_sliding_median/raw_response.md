

```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    window: list[float] = []
    result: list[float] = []

    half = k // 2
    k_even = k % 2 == 0

    for i in range(n):
        bisect.insort(window, nums[i])

        if i >= k:
            out = nums[i - k]
            idx = bisect.bisect_left(window, out)
            window.pop(idx)

        if len(window) == k:
            if k_even:
                result.append((window[half - 1] + window[half]) / 2.0)
            else:
                result.append(window[half])

    return result
```