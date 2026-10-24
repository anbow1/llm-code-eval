```python
from bisect import bisect_left


class IntervalSet:
    __slots__ = ("_intervals", "_length")

    def __init__(self):
        self._intervals: list[tuple] = []
        self._length = 0

    def add(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        i = bisect_left(intervals, (lo,))

        if i > 0 and intervals[i - 1][1] >= lo:
            start = i - 1
            new_lo = intervals[i - 1][0]
            new_hi = max(hi, intervals[i - 1][1])
        else:
            start = i
            new_lo = lo
            new_hi = hi

        idx = i
        n = len(intervals)
        while idx < n and intervals[idx][0] <= new_hi:
            end = intervals[idx][1]
            if end > new_hi:
                new_hi = end
            idx += 1

        removed_length = 0
        for j in range(start, idx):
            a, b = intervals[j]
            removed_length += b - a

        self._length += (new_hi - new_lo) - removed_length

        piece = (new_lo, new_hi)
        if start == idx:
            intervals.insert(start, piece)
        else:
            intervals[start:idx] = [piece]

    def remove(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        i = bisect_left(intervals, (lo,))

        if i > 0 and intervals[i - 1][1] > lo:
            start = i - 1
        else:
            start = i

        end = bisect_left(intervals, (hi,))
        if start >= end:
            return

        removed_length = 0
        for j in range(start, end):
            a, b = intervals[j]
            removed_length += b - a

        pieces = []

        first = intervals[start]
        if first[0] < lo:
            pieces.append((first[0], lo))

        last = intervals[end - 1]
        if last[1] > hi:
            pieces.append((hi, last[1]))

        new_length = 0
        for a, b in pieces:
            new_length += b - a

        self._length += new_length - removed_length
        intervals[start:end] = pieces

    def contains(self, x) -> bool:
        intervals = self._intervals
        left, right = 0, len(intervals)

        while left < right:
            mid = (left + right) // 2
            if intervals[mid][0] <= x:
                left = mid + 1
            else:
                right = mid

        idx = left - 1
        return idx >= 0 and intervals[idx][1] > x

    def total_length(self):
        return self._length

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```