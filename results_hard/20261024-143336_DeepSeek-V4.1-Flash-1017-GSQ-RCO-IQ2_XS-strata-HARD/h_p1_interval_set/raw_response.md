```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_intervals", "_total")

    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        i = bisect_left(intervals, lo, key=lambda p: p[1])

        if i == len(intervals):
            intervals.append((lo, hi))
            self._total += hi - lo
            return

        if intervals[i][0] > hi:
            intervals.insert(i, (lo, hi))
            self._total += hi - lo
            return

        j = i + 1
        new_lo = min(lo, intervals[i][0])
        new_hi = max(hi, intervals[i][1])

        while j < len(intervals) and intervals[j][0] <= new_hi:
            if intervals[j][1] > new_hi:
                new_hi = intervals[j][1]
            j += 1

        old_len = sum(b - a for a, b in intervals[i:j])
        intervals[i:j] = [(new_lo, new_hi)]
        self._total += (new_hi - new_lo) - old_len

    def remove(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        i = bisect_right(intervals, lo, key=lambda p: p[1])

        if i == len(intervals):
            return

        j = i
        while j < len(intervals) and intervals[j][0] < hi:
            j += 1

        if j == i:
            return

        new_pieces = []
        removed = 0

        for k in range(i, j):
            a, b = intervals[k]

            left = max(a, lo)
            right = min(b, hi)
            if left < right:
                removed += right - left

            if a < lo:
                new_pieces.append((a, lo))
            if b > hi:
                new_pieces.append((hi, b))

        intervals[i:j] = new_pieces
        self._total -= removed

    def contains(self, x):
        intervals = self._intervals
        i = bisect_right(intervals, x, key=lambda p: p[0]) - 1

        if i >= 0:
            return intervals[i][0] <= x < intervals[i][1]
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```