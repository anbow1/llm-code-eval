from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k in nums.

    For even k the median is the mean of the two middle values.
    Raises ValueError if k < 1 or k > len(nums).
    """
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    window = sorted(nums[:k])
    half = k // 2
    odd = k & 1

    result: list[float] = []
    append = result.append

    # Median of the first window.
    if odd:
        append(float(window[half]))
    else:
        append((window[half - 1] + window[half]) / 2.0)

    for i in range(k, n):
        incoming = nums[i]
        outgoing = nums[i - k]

        if incoming != outgoing:
            # Remove outgoing value (it is guaranteed present in window).
            window.pop(bisect_left(window, outgoing))
            # Insert incoming value keeping the window sorted.
            insort(window, incoming)

            if odd:
                append(float(window[half]))
            else:
                append((window[half - 1] + window[half]) / 2.0)
        else:
            # Window contents unchanged -> median unchanged.
            append(result[-1])

    return result
