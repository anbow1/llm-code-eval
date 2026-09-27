```python
import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    n = len(nums)
    if n == 0:
        return []

    target_lo = k // 2
    target_hi = k - target_lo

    lo: list[float] = []   # max-heap (negated values)
    hi: list[float] = []   # min-heap
    lo_del: dict[float, int] = {}
    hi_del: dict[float, int] = {}
    lo_size = 0
    hi_size = 0

    def clean_lo() -> None:
        while lo and lo_del.get(-lo[0], 0) > 0:
            v = -lo[0]
            lo_del[v] -= 1
            if lo_del[v] == 0:
                del lo_del[v]
            heapq.heappop(lo)

    def clean_hi() -> None:
        while hi and hi_del.get(hi[0], 0) > 0:
            v = hi[0]
            hi_del[v] -= 1
            if hi_del[v] == 0:
                del hi_del[v]
            heapq.heappop(hi)

    def move_hi_to_lo() -> None:
        nonlocal hi_size, lo_size
        clean_hi()
        v = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -v)
        lo_size += 1

    def move_lo_to_hi() -> None:
        nonlocal hi_size, lo_size
        clean_lo()
        v = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, v)
        hi_size += 1

    def add(x: float) -> None:
        nonlocal hi_size, lo_size
        heapq.heappush(hi, x)
        hi_size += 1
        if lo_size < target_lo:
            move_hi_to_lo()
        elif hi_size > target_hi:
            move_hi_to_lo()
        if lo_size > target_lo:
            move_lo_to_hi()

    def remove(x: float) -> None:
        nonlocal lo_size, hi_size
        clean_lo()
        if lo and x <= -lo[0]:
            lo_del[x] = lo_del.get(x, 0) + 1
            lo_size -= 1
        else:
            hi_del[x] = hi_del.get(x, 0) + 1
            hi_size -= 1
        if lo_size < target_lo:
            move_hi_to_lo()
        elif hi_size > target_hi:
            move_hi_to_lo()
        if lo_size > target_lo:
            move_lo_to_hi()

    def get_median() -> float:
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(hi[0])
        else:
            return (-lo[0] + hi[0]) / 2.0

    result: list[float] = []
    for i in range(k):
        add(nums[i])
    result.append(get_median())

    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())

    return result
```