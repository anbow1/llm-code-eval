import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > len(nums):
        raise ValueError("k must not exceed the length of nums")

    window = sorted(nums[:k])
    half = k // 2
    odd = k % 2 == 1
    result: list[float] = []

    def median() -> float:
        if odd:
            return float(window[half])
        return (window[half - 1] + window[half]) / 2.0

    result.append(median())

    for i in range(k, len(nums)):
        outgoing = nums[i - k]
        pos = bisect.bisect_left(window, outgoing)
        del window[pos]
        bisect.insort(window, nums[i])
        result.append(median())

    return result
