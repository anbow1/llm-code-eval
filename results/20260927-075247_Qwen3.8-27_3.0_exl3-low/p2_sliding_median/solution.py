import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    window = sorted(nums[:k])

    result: list[float] = []
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)

    for i in range(k, n):
        val_out = nums[i - k]
        idx = bisect.bisect_left(window, val_out)
        window.pop(idx)

        val_in = nums[i]
        bisect.insort(window, val_in)

        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)

    return result
