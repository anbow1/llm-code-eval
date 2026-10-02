import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    """
    Return the median of every contiguous window of size k in nums.

    For even k, the median is the mean of the two middle values.
    All returned values are floats.

    Raises:
        ValueError: if k < 1 or k > len(nums).

    Strategy:
        Maintain a fully sorted window of size k. Between consecutive windows,
        exactly one element leaves and one element enters. Removing via index
        deletion and inserting via bisect.insort both cost O(k) as a single
        C-level memmove, which makes this far faster than re-sorting each
        window, and comfortably fast enough for n = 200_000, k = 1_000.
    """
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    bisect_left = bisect.bisect_left
    insort = bisect.insort

    window = sorted(nums[:k])
    medians: list[float] = []
    append = medians.append

    half = k >> 1
    even = (k & 1) == 0

    for i in range(k - 1, n):
        if even:
            append((window[half - 1] + window[half]) / 2)
        else:
            append(float(window[half]))

        nxt = i + 1
        if nxt < n:
            pos = bisect_left(window, nums[i - k + 1])
            del window[pos]
            insort(window, nums[nxt])

    return medians
