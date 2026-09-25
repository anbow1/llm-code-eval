```python
from __future__ import annotations

import heapq


class _DualHeap:
    """Two heaps with lazy deletion, maintaining the median of a sliding window.

    ``small`` is a max-heap (values negated), ``large`` is a min-heap.
    Invariant: every element of the current window is valid; elements that
    were logically removed but still sit inside a heap are tracked in
    ``delayed`` and discarded lazily when they reach the top.
    """

    __slots__ = ("small", "large", "delayed", "k", "small_size", "large_size")

    def __init__(self, k: int) -> None:
        self.small: list[float] = []  # max-heap via negation
        self.large: list[float] = []  # min-heap
        self.delayed: dict[float, int] = {}
        self.k = k
        self.small_size = 0  # number of *valid* elements attributed to small
        self.large_size = 0  # number of *valid* elements attributed to large

    def _value_at_top(self, heap: list[float]) -> float:
        return -heap[0] if heap is self.small else heap[0]

    def _prune(self, heap: list[float]) -> None:
        # Pop delayed (logically deleted) entries sitting at the top.
        while heap:
            num = self._value_at_top(heap)
            count = self.delayed.get(num)
            if count:
                if count == 1:
                    del self.delayed[num]
                else:
                    self.delayed[num] = count - 1
                heapq.heappop(heap)
            else:
                break

    def _balance(self) -> None:
        # Keep: small_size == large_size + 1 (odd k) or small_size == large_size.
        if self.small_size > self.large_size + 1:
            val = -self.small[0]
            heapq.heappop(self.small)
            heapq.heappush(self.large, val)
            self.small_size -= 1
            self.large_size += 1
            self._prune(self.small)
        elif self.small_size < self.large_size:
            val = self.large[0]
            heapq.heappop(self.large)
            heapq.heappush(self.small, -val)
            self.small_size += 1
            self.large_size -= 1
            self._prune(self.large)

    def insert(self, num: float) -> None:
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.small_size += 1
        else:
            heapq.heappush(self.large, num)
            self.large_size += 1
        self._balance()

    def erase(self, num: float) -> None:
        self.delayed[num] = self.delayed.get(num, 0) + 1
        if num <= -self.small[0]:
            self.small_size -= 1
            if num == -self.small[0]:
                self._prune(self.small)
        else:
            self.large_size -= 1
            if num == self.large[0]:
                self._prune(self.large)
        self._balance()

    def median(self) -> float:
        if self.k & 1:
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must satisfy 1 <= k <= len(nums) ({n}); got {k}")

    dh = _DualHeap(k)
    for i in range(k):
        dh.insert(nums[i])

    result = [dh.median()]
    for i in range(k, n):
        dh.insert(nums[i])
        dh.erase(nums[i - k])
        result.append(dh.median())
    return result
```