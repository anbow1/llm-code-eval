import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    window: list[float] = []
    result: list[float] = []
    insort = bisect.insort
    bisect_left = bisect.bisect_left

    for i in range(n):
        insort(window, nums[i])

        if i >= k:
            idx = bisect_left(window, nums[i - k])
            window.pop(idx)

        if len(window) == k:
            if k & 1:
                result.append(float(window[k >> 1]))
            else:
                mid = k >> 1
                result.append((window[mid - 1] + window[mid]) / 2.0)

    return result
