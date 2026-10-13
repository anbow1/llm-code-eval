```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k.

    Uses one maintained sorted list: each slide removes the outgoing
    element (found via bisect) and inserts the incoming one (binary
    insertion).  Both operations cost O(k) memmove but run entirely in
    C, so n = 200_000 with k = 1_000 finishes in a fraction of a second.
    Median lookup is O(1) via index into the sorted window.
    """
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    window = sorted(nums[:k])
    half = k >> 1
    odd = k & 1  # 1 for odd k, 0 for even k

    if odd:
        result = [float(window[half])]
    else:
        result = [(window[half - 1] + window[half]) / 2.0]

    bisect_left = bisect.bisect_left
    insort = bisect.insort
    pop = window.pop
    append = result.append

    for i in range(k, n):
        new = nums[i]
        old = nums[i - k]
        if new != old:
            # `old` is guaranteed present; bisect_left lands on a copy of it.
            pop(bisect_left(window, old))
            insort(window, new)
        if odd:
            append(float(window[half]))
        else:
            append((window[half - 1] + window[half]) / 2.0)

    return result
```