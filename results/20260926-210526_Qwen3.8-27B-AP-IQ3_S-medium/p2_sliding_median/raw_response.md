```python
import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    lo: list[float] = []  # max-heap (values stored negated)
    hi: list[float] = []  # min-heap
    lo_size = 0
    hi_size = 0
    lo_del: dict[float, int] = {}  # actual value -> pending deletion count
    hi_del: dict[float, int] = {}

    def _clean_lo() -> None:
        while lo:
            actual = -lo[0]
            if actual in lo_del:
                lo_del[actual] -= 1
                if lo_del[actual] == 0:
                    del lo_del[actual]
                heapq.heappop(lo)
            else:
                break

    def _clean_hi() -> None:
        while hi:
            if hi[0] in hi_del:
                hi_del[hi[0]] -= 1
                if hi_del[hi[0]] == 0:
                    del hi_del[hi[0]]
                heapq.heappop(hi)
            else:
                break

    def _rebalance() -> None:
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            _clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            _clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        _clean_lo()
        _clean_hi()

    def _add(x: float) -> None:
        nonlocal lo_size, hi_size
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        _rebalance()

    def _remove(x: float) -> None:
        nonlocal lo_size, hi_size
        _clean_lo()
        _clean_hi()
        if x <= -lo[0]:
            lo_del[x] = lo_del.get(x, 0) + 1
            lo_size -= 1
        else:
            hi_del[x] = hi_del.get(x, 0) + 1
            hi_size -= 1
        _rebalance()

    def _median() -> float:
        _clean_lo()
        _clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        return float((-lo[0] + hi[0]) / 2.0)

    result: list[float] = []
    for i in range(k):
        _add(nums[i])
    result.append(_median())

    for i in range(1, len(nums) - k + 1):
        _remove(nums[i - 1])
        _add(nums[i + k - 1])
        result.append(_median())

    return result
```