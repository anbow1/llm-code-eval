```python
from bisect import bisect_left, bisect_right, insort


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi).

    Intervals are kept in two parallel lists sorted by lo.  Touching
    intervals ([1,3) and [3,5)) are merged into a single one.
    """

    __slots__ = ("_los", "_his")

    def __init__(self, intervals=()):
        self._los = []   # sorted list of interval start points
        self._his = []   # parallel list of interval end points
        for lo, hi in intervals:
            self.add(lo, hi)

    # ------------------------------------------------------------------ add
    def add(self, lo, hi):
        """Add the interval [lo, hi).  Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect_left(los, lo)

        start = i
        # The interval ending at i-1 merges if it touches or overlaps [lo, hi).
        if i > 0 and his[i - 1] >= lo:
            start = i - 1
            lo = los[i - 1]

        # Absorb every following interval whose start touches or lies
        # inside the new interval.
        end = i
        n = len(los)
        while end < n and los[end] <= hi:
            end += 1

        if end > start:
            if his[end - 1] > hi:
                hi = his[end - 1]
            del los[start:end]
            del his[start:end]

        los.insert(start, lo)
        his.insert(start, hi)

    # --------------------------------------------------------------- remove
    def remove(self, lo, hi):
        """Remove the interval [lo, hi).  Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect_left(los, lo)

        # Left neighbour may partially overlap: truncate its end to lo,
        # and if it extends past hi it must be split in two.
        if i > 0 and his[i - 1] > lo:
            old_hi = his[i - 1]
            his[i - 1] = lo
            if old_hi > hi:
                los.insert(i, hi)
                his.insert(i, old_hi)
                return  # nothing beyond can overlap (intervals are disjoint)

        # Remove/shrink all fully or partially covered intervals.
        n = len(los)
        j = i
        while j < n and los[j] < hi:
            if his[j] > hi:
                los[j] = hi        # truncate the tail interval's start
                break
            j += 1
        if j > i:
            del los[i:j]
            del his[i:j]

    # ------------------------------------------------------------- contains
    def contains(self, x):
        """Return True if x is in the set.  O(log n)."""
        i = bisect_right(self._los, x) - 1
        return i >= 0 and x < self._his[i]

    __contains__ = contains

    # --------------------------------------------------------- total_length
    def total_length(self):
        """Total length covered by the set (sum of interval lengths)."""
        return sum(h - l for l, h in zip(self._los, self._his))

    # ------------------------------------------------------------ intervals
    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    # ---------------------------------------------------------------- dunder
    def __len__(self):
        return len(self._los)

    def __iter__(self):
        return zip(self._los, self._his)

    def __repr__(self):
        return f"IntervalSet({self.intervals()!r})"

    def __eq__(self, other):
        if not isinstance(other, IntervalSet):
            return NotImplemented
        return self._los == other._los and self._his == other._his

    def clear(self):
        self._los.clear()
        self._his.clear()
```