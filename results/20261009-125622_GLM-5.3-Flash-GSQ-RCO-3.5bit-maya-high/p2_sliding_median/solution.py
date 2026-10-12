from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    """
    Return the median of every contiguous window of size k.

    For even k the median is the mean of the two middle values.
    Raises ValueError if k < 1 or k > len(nums).

    Strategy: maintain a sorted list of the current window. Each slide
    removes the outgoing element and inserts the incoming element using
    binary search. The removal/insertion shifts are C-level memmove
    operations, so this comfortably handles n = 200_000, k = 1_000.
    """
    if k < 1 or k > len(nums):
        raise ValueError(
            f"k must satisfy 1 <= k <= len(nums), got k={k}, len={len(nums)}"
        )

    half = k // 2
    window = sorted(nums[:k])
    medians: list[float] = []

    if k % 2 == 1:
        medians.append(float(window[half]))
        for i in range(k, len(nums)):
            old = nums[i - k]
            new = nums[i]
            if old == new:
                medians.append(float(window[half]))
                continue
            idx = bisect_left(window, old)
            window.pop(idx)
            insort(window, new)
            medians.append(float(window[half]))
    else:
        def _even_median() -> float:
            return (window[half - 1] + window[half]) / 2

        medians.append(_even_median())
        for i in range(k, len(nums)):
            old = nums[i - k]
            new = nums[i]
            if old == new:
                medians.append(_even_median())
                continue
            idx = bisect_left(window, old)
            window.pop(idx)
            insort(window, new)
            medians.append(_even_median())

    return medians
