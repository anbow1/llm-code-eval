```python
from bisect import insort, bisect_left


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > len(nums):
        raise ValueError("k must not exceed the length of nums")

    n = len(nums)
    half = k // 2
    odd = k % 2 == 1

    # Sorted window maintained with binary-search insertion/removal.
    window = sorted(nums[:k])

    medians: list[float] = []
    for i in range(n - k + 1):
        if odd:
            medians.append(float(window[half]))
        else:
            medians.append((window[half - 1] + window[half]) / 2.0)

        # Slide the window forward (if there is a next window).
        if i + k < n:
            insort(window, nums[i + k])
            # Remove the element leaving the window.
            del window[bisect_left(window, nums[i])]

    return medians
```