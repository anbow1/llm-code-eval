```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """
    A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi).

    Invariants:
      - self._lo is sorted ascending.
      - Intervals are pairwise disjoint and non-touching:
        for consecutive stored intervals, _hi[i] < _lo[i + 1].
      - Hence self._hi is also sorted ascending.
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self, intervals=()):
        self._lo = []
        self._hi = []
        for lo, hi in intervals:
            self.add(lo, hi)

    def add(self, lo, hi):
        """Add [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los = self._lo
        his = self._hi
        # First interval whose hi >= lo  (>= so touching intervals merge).
        j = bisect_left(his, lo)
        # Last interval whose lo <= hi  (<= so touching intervals merge).
        k = bisect_right(los, hi) - 1
        if j > k:
            # No overlap: plain insertion at position j.
            los.insert(j, lo)
            his.insert(j, hi)
        else:
            # Merge all intervals j..k together with [lo, hi).
            nlo = lo if lo < los[j] else los[j]
            nhi = hi if hi > his[k] else his[k]
            los[j:k + 1] = [nlo]
            his[j:k + 1] = [nhi]

    def remove(self, lo, hi):
        """Remove [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los = self._lo
        his = self._hi
        # First interval strictly intersecting: hi > lo (touching does not count).
        j = bisect_right(his, lo)
        # Last interval strictly intersecting: lo < hi.
        k = bisect_left(los, hi) - 1
        if j > k:
            return
        pieces = []
        if los[j] < lo:
            pieces.append((los[j], lo))
        if his[k] > hi:
            pieces.append((hi, his[k]))
        del los[j:k + 1]
        del his[j:k + 1]
        for offset, (a, b) in enumerate(pieces):
            los.insert(j + offset, a)
            his.insert(j + offset, b)

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        """All intervals as (lo, hi) tuples, sorted, disjoint, touching merged."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __iter__(self):
        return zip(self._lo, self._hi)

    def __repr__(self):
        return f"IntervalSet({self.intervals()!r})"
```