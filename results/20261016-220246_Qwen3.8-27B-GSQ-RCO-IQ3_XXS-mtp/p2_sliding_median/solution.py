import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    window = sorted(nums[:k])
    result: list[float] = []

    for i in range(n - k + 1):
        if k % 2 == 1:
            result.append(float(window[k // 2]))
        else:
            result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)

        if i < n - k:
            out_val = nums[i]
            in_val = nums[i + k]
            pos = bisect.bisect_left(window, out_val)
            window.pop(pos)
            bisect.insort(window, in_val)

    return result
