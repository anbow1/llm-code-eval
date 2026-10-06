from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    result: list[float] = []

    window = sorted(nums[:k])
    even = k % 2 == 0
    half = k // 2

    def median(w: list[float]) -> float:
        if even:
            return (w[half - 1] + w[half]) / 2.0
        return float(w[half])

    result.append(median(window))

    for i in range(k, n):
        old = nums[i - k]
        new = nums[i]
        pos = bisect_left(window, old)
        del window[pos]
        insort(window, new)
        result.append(median(window))

    return result
