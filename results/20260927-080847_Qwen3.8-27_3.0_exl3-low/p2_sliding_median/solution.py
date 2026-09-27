import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    window = sorted(nums[:k])
    results: list[float] = []

    for i in range(n - k + 1):
        if i > 0:
            out_val = nums[i - 1]
            idx = bisect.bisect_left(window, out_val)
            window.pop(idx)
            bisect.insort(window, nums[i + k - 1])

        if k % 2 == 1:
            results.append(float(window[k // 2]))
        else:
            results.append((window[k // 2 - 1] + window[k // 2]) / 2.0)

    return results
