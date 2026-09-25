```python
from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k in nums.

    Yields len(nums) - k + 1 medians in order. For even k, the median is
    the mean of the two middle values. All results are floats.

    Raises:
        ValueError: if k < 1 or k > len(nums).

    Strategy: maintain a sorted window. Each slide removes the outgoing
    element and inserts the incoming one (bisect search is O(log k); the
    list shift on del/insort is a fast C-level memmove). Overall cost is
    roughly O(n log k) comparisons plus O(n * k) cheap C-level moves,
    which easily handles n = 200_000, k = 1_000 well under 2 seconds.
    """
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    win = sorted(nums[:k])
    medians: list[float] = []
    emit = medians.append  # local aliases: avoid attribute lookups in the hot loop

    half = k >> 1
    if k & 1:  # odd window: single middle element
        emit(float(win[half]))
        # zip(nums, nums[k:]) yields exactly the (outgoing, incoming) pairs
        for old, new in zip(nums, nums[k:]):
            if old != new:  # multiset unchanged otherwise -> median unchanged
                del win[bisect_left(win, old)]
                insort(win, new)
            emit(float(win[half]))
    else:  # even window: mean of the two middle elements
        lo = half - 1
        emit((win[lo] + win[half]) / 2)
        for old, new in zip(nums, nums[k:]):
            if old != new:
                del win[bisect_left(win, old)]
                insort(win, new)
            emit((win[lo] + win[half]) / 2)

    return medians
```