```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must be between 1 and {n}, got {k}")

    if k == 1:
        return [float(x) for x in nums]

    window = sorted(nums[:k])
    result: list[float] = []

    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
        for i in range(k, n):
            pos = bisect.bisect_left(window, nums[i - k])
            window.pop(pos)
            bisect.insort(window, nums[i])
            result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
        for i in range(k, n):
            pos = bisect.bisect_left(window, nums[i - k])
            window.pop(pos)
            bisect.insort(window, nums[i])
            result.append((window[mid - 1] + window[mid]) / 2.0)

    return result
```