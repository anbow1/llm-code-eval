```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_los", "_his", "_total")

    def __init__(self):
        self._los = []   # sorted interval starts
        self._his = []   # sorted interval ends (parallel to _los)
        self._total = 0

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        # First interval whose end reaches lo (touching on the left merges),
        # and first interval whose start is beyond hi (touching on the right merges).
        i = bisect_left(his, lo)
        j = bisect_right(los, hi)
        nlo, nhi = lo, hi
        absorbed = 0
        for k in range(i, j):
            a = los[k]
            b = his[k]
            if a < nlo:
                nlo = a
            if b > nhi:
                nhi = b
            absorbed += b - a
        # Replace all absorbed/touching intervals with the merged one
        # (plain insertion when i == j).
        los[i:j] = [nlo]
        his[i:j] = [nhi]
        self._total += (nhi - nlo) - absorbed

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his
        # First interval with end strictly greater than lo, and first interval
        # with start at or beyond hi. Everything in between overlaps [lo, hi).
        i = bisect_right(his, lo)
        j = bisect_left(los, hi)
        if i == j:
            return
        removed = 0
        for k in range(i, j):
            removed += his[k] - los[k]
        new_lo = []
        new_hi = []
        added = 0
        if los[i] < lo:  # keep the left remainder of the first hit interval
            new_lo.append(los[i])
            new_hi.append(lo)
            added += lo - los[i]
        if his[j - 1] > hi:  # keep the right remainder of the last hit interval
            new_lo.append(hi)
            new_hi.append(his[j - 1])
            added += his[j - 1] - hi
        los[i:j] = new_lo
        his[i:j] = new_hi
        self._total += added - removed

    def contains(self, x):
        """Return True iff x belongs to the set. O(log n)."""
        i = bisect_right(self._los, x) - 1
        if i < 0:
            return False
        return x < self._his[i]

    def total_length(self):
        """Total length covered by the set."""
        return self._total

    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)
```