```python
import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    # Max-heap for lower half (store negated values)
    lo: list[tuple[float, int]] = []
    # Min-heap for upper half
    hi: list[tuple[float, int]] = []
    lo_size = 0
    hi_size = 0
    lo_del: set[int] = set()
    hi_del: set[int] = set()
    heap_id = [0] * n  # 0 means element is in lo, 1 means in hi

    result: list[float] = []

    def add(i: int) -> None:
        nonlocal lo_size, hi_size
        val = nums[i]
        if not lo or val <= -lo[0][0]:
            heapq.heappush(lo, (-val, i))
            lo_size += 1
            heap_id[i] = 0
        else:
            heapq.heappush(hi, (val, i))
            hi_size += 1
            heap_id[i] = 1

    def remove(i: int) -> None:
        nonlocal lo_size, hi_size
        if heap_id[i] == 0:
            lo_del.add(i)
            lo_size -= 1
        else:
            hi_del.add(i)
            hi_size -= 1

    def rebalance() -> None:
        nonlocal lo_size, hi_size
        # Move from lo to hi if lo is too large
        while lo_size > hi_size + 1:
            val, idx = heapq.heappop(lo)
            if idx in lo_del:
                lo_del.discard(idx)
                continue
            lo_size -= 1
            heap_id[idx] = 1
            heapq.heappush(hi, (val, idx))
            hi_size += 1
        # Move from hi to lo if hi is too large
        while lo_size < hi_size:
            val, idx = heapq.heappop(hi)
            if idx in hi_del:
                hi_del.discard(idx)
                continue
            hi_size -= 1
            heap_id[idx] = 0
            heapq.heappush(lo, (-val, idx))
            lo_size += 1
        # Prune stale tops so median computation is correct
        while lo and lo[0][1] in lo_del:
            lo_del.discard(lo[0][1])
            heapq.heappop(lo)
        while hi and hi[0][1] in hi_del:
            hi_del.discard(hi[0][1])
            heapq.heappop(hi)

    for i in range(n):
        add(i)
        if i >= k:
            remove(i - k)
        rebalance()
        if i >= k - 1:
            if k % 2 == 1:
                result.append(float(-lo[0][0]))
            else:
                result.append(float((-lo[0][0] + hi[0][0]) / 2.0))

    return result
```

**How it works:**

- **Two-heap invariant:** `lo` (max-heap) holds the lower half and `hi` (min-heap) holds the upper half, with `lo_size == hi_size` or `lo_size == hi_size + 1`. The median is always at the top of `lo` (odd k) or the average of both tops (even k).

- **Lazy deletion:** When an element leaves the window, instead of physically removing it from the middle of a heap (O(k) operation), we mark its index in a deletion set. The element is only removed when it surfaces to the top during pruning.

- **Index tracking:** Each element is stored as `(value, index)` and we record which heap each index lives in (`heap_id`). This correctly handles duplicate values by tracking membership per-insertion rather than per-value.

- **Complexity:** O(n log k) time, O(n) space — handles n=200,000, k=1,000 well within the time budget.