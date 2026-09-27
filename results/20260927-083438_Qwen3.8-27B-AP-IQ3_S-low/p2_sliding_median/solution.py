import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    lower = []          # max-heap (negated values) – smaller half
    upper = []          # min-heap – larger half
    delayed = defaultdict(int)
    lower_size = 0
    upper_size = 0

    def sift_lower():
        while lower and delayed[-lower[0]] > 0:
            delayed[-lower[0]] -= 1
            heapq.heappop(lower)
            nonlocal lower_size
            lower_size -= 1

    def sift_upper():
        while upper and delayed[upper[0]] > 0:
            delayed[upper[0]] -= 1
            heapq.heappop(upper)
            nonlocal upper_size
            upper_size -= 1

    def balance():
        nonlocal lower_size, upper_size
        while lower_size > upper_size + 1:
            val = -heapq.heappop(lower)
            lower_size -= 1
            heapq.heappush(upper, val)
            upper_size += 1
        while upper_size > lower_size:
            val = heapq.heappop(upper)
            upper_size -= 1
            heapq.heappush(lower, -val)
            lower_size += 1

    def add(x: float):
        nonlocal lower_size, upper_size
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_size += 1
        else:
            heapq.heappush(upper, x)
            upper_size += 1
        balance()

    def remove(x: float):
        nonlocal lower_size, upper_size
        if lower and x <= -lower[0]:
            lower_size -= 1
            delayed[x] += 1
            sift_lower()
        else:
            upper_size -= 1
            delayed[x] += 1
            sift_upper()
        balance()

    def get_median() -> float:
        if k % 2 == 1:
            return float(-lower[0])
        return (-lower[0] + upper[0]) / 2.0

    # Build initial window
    for i in range(k):
        add(nums[i])

    result = [get_median()]

    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())

    return result
