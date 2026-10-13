```python
from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    window = sorted(nums[:k])
    half = k // 2
    odd = k % 2 == 1
    result: list[float] = []

    def current_median() -> float:
        if odd:
            return float(window[half])
        return (window[half - 1] + window[half]) / 2.0

    result.append(current_median())

    for i in range(k, len(nums)):
        outgoing = nums[i - k]
        idx = bisect_left(window, outgoing)
        del window[idx]
        insort(window, nums[i])
        result.append(current_median())

    return result
```