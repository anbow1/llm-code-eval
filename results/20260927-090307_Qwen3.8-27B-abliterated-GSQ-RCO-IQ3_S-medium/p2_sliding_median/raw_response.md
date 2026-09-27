```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return list(nums)

    low = []   # max-heap (negated) for the lower half
    high = []  # min-heap for the upper half
    delayed = defaultdict(int)
    low_size = 0
    high_size = 0

    target_low = (k + 1) // 2
    target_high = k // 2

    def clean(heap):
        while heap:
            top = -heap[0] if heap is low else heap[0]
            if delayed[top]:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break

    def add_to_low(val):
        nonlocal low_size
        heapq.heappush(low, -val)
        low_size += 1

    def add_to_high(val):
        nonlocal high_size
        heapq.heappush(high, val)
        high_size += 1

    def rebalance():
        nonlocal low_size, high_size
        while low_size > target_low:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        while high_size > target_high:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while low_size < target_low:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while high_size < target_high:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1

    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return -low[0]
        else:
            return (-low[0] + high[0]) / 2.0

    # Build initial window
    for i in range(k):
        if not low or nums[i] <= -low[0]:
            add_to_low(nums[i])
        else:
            add_to_high(nums[i])

    rebalance()
    result = [get_median()]

    # Slide the window
    for i in range(k, n):
        out = nums[i - k]
        in_val = nums[i]

        clean(low)
        clean(high)

        # Lazy-delete the outgoing element
        if out <= -low[0]:
            delayed[out] += 1
            low_size -= 1
        else:
            delayed[out] += 1
            high_size -= 1

        clean(low)
        clean(high)

        # Insert the incoming element
        if low_size == 0 or in_val <= -low[0]:
            add_to_low(in_val)
        else:
            add_to_high(in_val)

        rebalance()
        result.append(get_median())

    return result
```