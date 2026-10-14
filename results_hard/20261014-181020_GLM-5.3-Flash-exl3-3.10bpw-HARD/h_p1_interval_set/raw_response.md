```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_los", "_his")

    def __init__(self):
        self._los = []  # sorted lower bounds
        self._his = []  # upper bounds (parallel to _los; disjoint & non-touching)

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        # Intervals overlapping or touching [lo, hi): indices [start, end)
        # start: first interval whose hi >= lo
        # end:   first interval whose lo > hi
        start = bisect_left(his, lo)
        end = bisect_right(los, hi)
        if start < end:
            new_lo = lo if los[start] >= lo else los[start]
            new_hi = hi if his[end - 1] <= hi else his[end - 1]
            los[start:end] = [new_lo]
            his[start:end] = [new_hi]
        else:
            los.insert(start, lo)
            his.insert(start, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        # Intervals overlapping [lo, hi): indices [start, end)
        start = bisect_left(his, lo)
        end = bisect_right(los, hi)
        if start >= end:
            return
        left = los[start] < lo
        right = his[end - 1] > hi
        new_los = []
        new_his = []
        if left:
            new_los.append(los[start])
            new_his.append(lo)
        if right:
            new_los.append(hi)
            new_his.append(his[end - 1])
        los[start:end] = new_los
        his[start:end] = new_his

    def contains(self, x):
        los, his = self._los, self._his
        i = bisect_right(los, x) - 1
        return i >= 0 and his[i] > x

    __contains__ = contains

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)

    def __bool__(self):
        return bool(self._los)

    def __iter__(self):
        return iter(zip(self._los, self._his))

    def __repr__(self):
        return f"IntervalSet({self.intervals()!r})"
```