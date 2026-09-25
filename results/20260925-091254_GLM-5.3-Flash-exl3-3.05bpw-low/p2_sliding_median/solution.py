import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    lower: list[float] = []  # max-heap (negated values)
    upper: list[float] = []  # min-heap
    delayed = defaultdict(int)
    lower_size = 0  # sizes excluding deleted elements
    upper_size = 0
    to_delete_lower = 0
    to_delete_upper = 0

    result: list[float] = []

    def prune(heaps, flag):
        nonlocal to_delete_lower, to_delete_upper
        heap, neg = (lower, True) if flag == 0 else (upper, False)
        while heap:
            top = -heap[0] if neg else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
                if neg:
                    to_delete_lower -= 1
                else:
                    to_delete_upper -= 1
            else:
                break

    def rebalance():
        nonlocal lower_size, upper_size, to_delete_lower, to_delete_upper
        if lower_size > upper_size + 1:
            prune(lower, 0)
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_size -= 1
            upper_size += 1
            if delayed[v] == 0:
                delayed.pop(v, None) if False else None
        elif lower_size < upper_size:
            prune(upper, 1)
            heapq.heappush(lower, -heapq.heappop(upper))
            upper_size -= 1
            lower_size += 1

    def add(x: float):
        nonlocal lower_size, upper_size
        if lower and -lower[0] >= x:
            heapq.heappush(lower, -x)
            lower_size += 1
        else:
            heapq.heappush(upper, x)
            upper_size += 1
        rebalance()

    def remove(x: float):
        nonlocal lower_size, upper_size, to_delete_lower, to_delete_upper
        delayed[x] += 1
        if lower and -lower[0] >= x:
            lower_size -= 1
            to_delete_lower += 1
            prune(lower, 0)
        else:
            upper_size -= 1
            to_delete_upper += 1
            prune(upper, 1)
        rebalance()

    for i, x in enumerate(nums):
        add(x)
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            prune(lower, 0)
            prune(upper, 1)
            if k % 2 == 1:
                result.append(float(-lower[0]))
            else:
                result.append((-lower[0] + upper[0]) / 2)

    return result
