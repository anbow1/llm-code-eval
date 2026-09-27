

```python
import bisect


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []
        self._total_length = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect.bisect_right(intervals, (lo, float("inf")))
        if i > 0 and intervals[i - 1][1] >= lo:
            i -= 1
        j = i
        while j < len(intervals) and intervals[j][0] <= hi:
            j += 1

        new_lo = lo
        new_hi = hi
        old_length = 0
        for k in range(i, j):
            a, b = intervals[k]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b
            old_length += b - a

        new_length = new_hi - new_lo
        intervals[i:j] = [(new_lo, new_hi)]
        self._total_length += new_length - old_length

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect.bisect_right(intervals, (lo, float("inf")))
        if i > 0 and intervals[i - 1][1] > lo:
            i -= 1
        j = i
        while j < len(intervals) and intervals[j][0] < hi:
            j += 1

        old_length = 0
        new_intervals = []
        for k in range(i, j):
            a, b = intervals[k]
            old_length += b - a
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))

        new_length = sum(b - a for a, b in new_intervals)
        intervals[i:j] = new_intervals
        self._total_length += new_length - old_length

    def contains(self, x) -> bool:
        i = bisect.bisect_right(self._intervals, (x, float("inf")))
        if i > 0:
            return x < self._intervals[i - 1][1]
        return False

    def total_length(self):
        return self._total_length

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
```