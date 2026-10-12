```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi).

    Touching intervals are merged automatically (e.g. [1,3) + [3,5) -> [1,5)).
    """

    def __init__(self):
        self._los = []  # sorted start points, strictly increasing
        self._his = []  # corresponding end points; _his[i] < _los[i+1] (no touching)

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        # First interval that could overlap or touch on the left.
        l = bisect_left(los, lo)
        if l > 0 and his[l - 1] >= lo:
            start = l - 1  # overlaps or touches [lo, hi) -> merge
        else:
            start = l

        # One past the last interval that overlaps or touches on the right.
        # bisect_right includes intervals whose lo == hi (touching on the right).
        r = bisect_right(los, hi)

        if start < r:
            new_lo = lo if lo < los[start] else los[start]
            new_hi = hi if hi > his[r - 1] else his[r - 1]
        else:
            new_lo, new_hi = lo, hi

        los[start:r] = [new_lo]
        his[start:r] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        # First interval strictly overlapping (his > lo means real overlap, not touch).
        l = bisect_left(los, lo)
        if l > 0 and his[l - 1] > lo:
            start = l - 1
        else:
            start = l

        # One past the last interval with lo < hi.
        r = bisect_left(los, hi)

        if start >= r:
            return  # nothing to remove

        new_los = []
        new_his = []
        if los[start] < lo:  # keep a left remainder [los[start], lo)
            new_los.append(los[start])
            new_his.append(lo)
        if his[r - 1] > hi:  # keep a right remainder [hi, his[r-1])
            new_los.append(hi)
            new_his.append(his[r - 1])

        los[start:r] = new_los
        his[start:r] = new_his

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._los, x) - 1
        return i >= 0 and self._his[i] > x

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)
```