```python
from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must be between 1 and len(nums)={n}, got {k}")

    window = sorted(nums[:k])
    medians: list[float] = []
    append = medians.append
    half = k // 2
    odd = k % 2 == 1

    w_pop = window.pop
    w_insort = insort

    append(float(window[half]) if odd else (window[half - 1] + window[half]) / 2.0)

    for i in range(k, n):
        out_val = nums[i - k]
        # The outgoing element is guaranteed to be present in window.
        idx = bisect_left(window, out_val)
        # Adjust for duplicates: bisect_left finds the first occurrence,
        # which is fine since all occurrences are identical values.
        w_pop(idx)
        w_insort(window, nums[i])
        append(float(window[half]) if odd else (window[half - 1] + window[half]) / 2.0)

    return medians
```