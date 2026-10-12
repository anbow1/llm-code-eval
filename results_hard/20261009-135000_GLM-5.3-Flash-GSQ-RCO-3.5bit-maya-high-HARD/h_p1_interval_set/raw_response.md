```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_los", "_his", "_total")

    def __init__(self):
        self._los = []   # sorted lower bounds
        self._his = []   # sorted upper bounds; his[k] <= los[k+1]
        self._total = 0  # sum of (hi - lo) over all intervals

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        # First interval whose hi >= lo (touching or overlapping), and
        # first interval whose lo > hi (strictly beyond, no merge).
        i = bisect_left(his, lo)
        j = bisect_right(los, hi)
        if i == j:
            los.insert(i, lo)
            his.insert(i, hi)
            self._total += hi - lo
            return
        # Merge all intervals in [i, j) together with [lo, hi).
        removed = 0
        for k in range(i, j):
            removed += his[k] - los[k]
        new_lo = los[i] if los[i] < lo else lo
        new_hi = his[j - 1] if his[j - 1] > hi else hi
        los[i:j] = [new_lo]
        his[i:j] = [new_hi]
        self._total += (new_hi - new_lo) - removed

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        # Strictly overlapping intervals: his > lo and lo < hi.
        i = bisect_right(his, lo)
        j = bisect_left(los, hi)
        if i >= j:
            return
        removed = 0
        for k in range(i, j):
            removed += his[k] - los[k]
        new_los = []
        new_his = []
        if los[i] < lo:      # keep a left remainder [los[i], lo)
            new_los.append(los[i])
            new_his.append(lo)
        if his[j - 1] > hi:  # keep a right remainder [hi, his[j-1])
            new_los.append(hi)
            new_his.append(his[j - 1])
        los[i:j] = new_los
        his[i:j] = new_his
        self._total -= removed

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        idx = bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return self._total

    def intervals(self):
        """All intervals as sorted, disjoint (lo, hi) tuples, touching merged."""
        return list(zip(self._los, self._his))

    def __len__(self):
        """Number of intervals currently stored."""
        return len(self._los)
```