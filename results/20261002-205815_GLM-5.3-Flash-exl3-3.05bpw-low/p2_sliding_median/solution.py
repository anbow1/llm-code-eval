from bisect import bisect_left, insort

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    window = sorted(nums[:k])
    result = []
    half = k // 2
    if k % 2:
        med = float(window[half])
    else:
        med = (window[half - 1] + window[half]) / 2.0
    result.append(med)
    for i in range(k, n):
        out = nums[i - k]
        idx = bisect_left(window, out)
        del window[idx]
        insort(window, nums[i])
        if k % 2:
            result.append(float(window[half]))
        else:
            result.append((window[half - 1] + window[half]) / 2.0)
    return result
