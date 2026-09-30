```python
import bisect


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[0])
        if idx > 0 and self._intervals[idx - 1][1] >= lo:
            idx -= 1
        merge_lo = lo
        merge_hi = hi
        end_idx = idx
        while end_idx < len(self._intervals) and self._intervals[end_idx][0] <= hi:
            if self._intervals[end_idx][0] < merge_lo:
                merge_lo = self._intervals[end_idx][0]
            if self._intervals[end_idx][1] > merge_hi:
                merge_hi = self._intervals[end_idx][1]
            end_idx += 1
        if end_idx > idx:
            self._intervals[idx:end_idx] = [(merge_lo, merge_hi)]
        else:
            self._intervals.insert(idx, (merge_lo, merge_hi))

    def remove(self, lo, hi):
        if lo >= hi:
            return
        start_idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[1])
        end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])
        if start_idx >= end_idx:
            return
        new_parts: list[tuple] = []
        for i in range(start_idx, end_idx):
            a, b = self._intervals[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        self._intervals[start_idx:end_idx] = new_parts

    def contains(self, x):
        idx = bisect.bisect_right(self._intervals, x, key=lambda t: t[0])
        if idx == 0:
            return False
        return x < self._intervals[idx - 1][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```