

```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    window = sorted(nums[:k])
    result = []

    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)

    for i in range(k, n):
        old = nums[i - k]
        idx = bisect.bisect_left(window, old)
        window.pop(idx)
        new = nums[i]
        bisect.insort(window, new)

        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)

    return result
```