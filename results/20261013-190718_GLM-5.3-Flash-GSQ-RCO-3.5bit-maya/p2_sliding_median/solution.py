import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    # Dual-heap (median heap) with lazy deletion.
    small: list[float] = []  # max-heap via negated values (lower half)
    large: list[float] = []  # min-heap (upper half)
    delayed: dict[float, int] = defaultdict(int)
    small_size = 0
    large_size = 0

    def prune(heap: list[float], sign: int) -> None:
        # Pop invalid (delayed) elements from the heap top.
        while heap:
            num = heap[0] * sign
            if num in delayed:
                delayed[num] -= 1
                if not delayed[num]:
                    del delayed[num]
                heapq.heappop(heap)
            else:
                break

    def make_balance() -> None:
        nonlocal small_size, large_size
        if small_size > large_size + 1:
            heapq.heappush(large, -small[0])
            heapq.heappop(small)
            small_size -= 1
            large_size += 1
            prune(small, -1)
        elif small_size < large_size:
            heapq.heappush(small, -large[0])
            heapq.heappop(large)
            small_size += 1
            large_size -= 1
            prune(large, 1)

    def insert(num: float) -> None:
        nonlocal small_size, large_size
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
            small_size += 1
        else:
            heapq.heappush(large, num)
            large_size += 1
        make_balance()

    def erase(num: float) -> None:
        nonlocal small_size, large_size
        delayed[num] += 1
        if num <= -small[0]:
            small_size -= 1
            if num == -small[0]:
                prune(small, -1)
        else:
            large_size -= 1
            if num == large[0]:
                prune(large, 1)
        make_balance()

    def get_median() -> float:
        if k % 2 == 1:
            return float(-small[0])
        return (-small[0] + large[0]) / 2.0

    result: list[float] = []
    for i in range(k):
        insert(nums[i])
    result.append(get_median())

    for i in range(k, n):
        insert(nums[i])
        erase(nums[i - k])
        result.append(get_median())

    return result
