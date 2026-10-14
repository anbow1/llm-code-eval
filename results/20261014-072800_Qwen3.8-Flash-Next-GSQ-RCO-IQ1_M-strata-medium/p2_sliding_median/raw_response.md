```python
```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")

    n = len(nums)

    small: list[int | float] = []  # max-heap (stored negated), lower half
    large: list[int | float] = []  # min-heap, upper half
    delayed: dict[int | float, int] = {}
    small_size = 0
    large_size = 0
    balance = 0  # small_size - large_size, target 0 or 1

    def prune_small() -> None:
        while small and -small[0] in delayed:
            val = -heap.heappop(small)
            delayed[val] -= 1
            if delayed[val] == 0:
                del delayed[val]

    def prune_large() -> None:
        while large and large[0] in delayed:
            val = heap.heappop(large)
            delayed[val] -= 1
            if delayed[val] == 0:
                del delayed[val]

    def make_balance() -> None:
        nonlocal small_size, large_size, balance
        if balance > 1:  # move top of small -> large
            prune_small()
            v = -heap.heappop(small)
            heap.heappush(large, v)
            small_size -= 1
            large_size += 1
            balance -= 2
            prune_small()
        elif balance < 0:  # move top of large -> small
            prune_large()
            v = heap.heappop(large)
            heap.heappush(small, -v)
            small_size += 1
            large_size -= 1
            balance += 2
            prune_large()

    def add(num: float) -> None:
        nonlocal small_size, large_size, balance
        if large_size == 0 or num <= -small[0]:
            heap.heappush(small, -num)
            small_size += 1
            balance += 1
        else:
            heap.heappush(large, num)
            large_size += 1
            balance -= 1
        make_balance()

    def remove(num: float) -> None:
        nonlocal small_size, large_size, balance
        if num <= -small[0]:
            small_size -= 1
            balance -= 1
        else:
            large_size -= 1
            balance += 1
        delayed[num] = delayed.get(num, 0) + 1
        if small and num == -small[0]:
            prune_small()
        if large and num == large[0]:
            prune_large()
        make_balance()

    for i in range(k):
        add(nums[i])

    result: list[float] = []
    if small_size > large_size:
        result.append(float(-small[0]))
    else:
        result.append((-small[0] + large[0]) / 2.0)

    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        if small_size > large_size:
            result.append(float(-small[0]))
        else:
            result.append((-small[0] + large[0]) / 2.0)

    return result
```
```