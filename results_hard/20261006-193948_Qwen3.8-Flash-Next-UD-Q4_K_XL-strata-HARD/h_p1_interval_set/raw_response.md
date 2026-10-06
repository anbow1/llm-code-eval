```python
import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint, merged half-open intervals [lo, hi)."""

    __slots__ = ('_intervals',)

    def __init__(self):
        self._intervals: list[tuple] = []

    # ------------------------------------------------------------------ add
    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        intervals = self._intervals

        # Position where lo would be inserted (by first element of tuple)
        pos = bisect.bisect_left(intervals, (lo,))

        # Check whether the interval just left of pos touches/overlaps
        left = pos - 1 if (pos > 0 and intervals[pos - 1][1] >= lo) else pos

        # Right boundary: first index whose lo > hi  →  [0, right) have lo <= hi
        right = bisect.bisect_right(intervals, (hi, float('inf')))

        if left >= right:
            # No overlap or touching – pure insertion
            intervals.insert(left, (lo, hi))
        else:
            merged_lo = min(lo, intervals[left][0])
            merged_hi = max(hi, intervals[right - 1][1])
            intervals[left:right] = [(merged_lo, merged_hi)]

    # ------------------------------------------------------------------ remove
    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        intervals = self._intervals

        # First index whose lo >= lo_val
        pos = bisect.bisect_left(intervals, (lo,))

        # Overlap requires hi_val > lo (strict for half-open)
        left = pos - 1 if (pos > 0 and intervals[pos - 1][1] > lo) else pos

        # Overlap requires lo_val < hi (strict), so exclude lo >= hi
        right = bisect.bisect_left(intervals, (hi,))

        if left >= right:
            return

        new_parts: list[tuple] = []
        for i in range(left, right):
            a, b = intervals[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        intervals[left:right] = new_parts

    # ------------------------------------------------------------------ contains
    def contains(self, x) -> bool:
        intervals = self._intervals
        # Rightmost index with lo <= x  →  pos is first index with lo > x
        pos = bisect.bisect_right(intervals, (x, float('inf')))
        return pos > 0 and x < intervals[pos - 1][1]

    # ------------------------------------------------------------------ total_length
    def total_length(self):
        total = 0
        for lo, hi in self._intervals:
            total += hi - lo
        return total

    # ------------------------------------------------------------------ intervals
    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    # ------------------------------------------------------------------ __len__
    def __len__(self) -> int:
        return len(self._intervals)
```