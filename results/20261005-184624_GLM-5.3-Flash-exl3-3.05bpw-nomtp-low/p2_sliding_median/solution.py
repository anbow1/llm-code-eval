from bisect import insort, bisect_left


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > n:
        raise ValueError("k must not exceed the length of nums")

    window = sorted(nums[:k])
    medians: list[float] = []
    half = k // 2

    if k % 2 == 1:
        for right in range(k, n + 1):
            medians.append(float(window[half]))
            if right < n:
                out = nums[right - k]
                i = bisect_left(window, out)
                window.pop(i)
                insort(window, nums[right])
    else:
        for right in range(k, n + 1):
            medians.append((window[half - 1] + window[half]) / 2)
            if right < n:
                out = nums[right - k]
                i = bisect_left(window, out)
                window.pop(i)
                insort(window, nums[right])
    return medians
