from bisect import insort, bisect_left


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > len(nums):
        raise ValueError("k must not exceed the length of nums")

    # Sorted multiset of the current window; insert/delete are O(k) but use
    # fast C-level list shifting, so this comfortably handles n=200k, k=1000.
    window = sorted(nums[:k])
    half = k // 2
    odd = k % 2 == 1

    result: list[float] = []
    if odd:
        result.append(float(window[half]))
    else:
        result.append((window[half - 1] + window[half]) / 2.0)

    insort_local = insort
    bisect_left_local = bisect_left

    for i in range(k, len(nums)):
        # Remove the element leaving the window.
        outgoing = nums[i - k]
        idx = bisect_left_local(window, outgoing)
        del window[idx]

        # Add the element entering the window.
        incoming = nums[i]
        insort_local(window, incoming)

        if odd:
            result.append(float(window[half]))
        else:
            result.append((window[half - 1] + window[half]) / 2.0)

    return result
