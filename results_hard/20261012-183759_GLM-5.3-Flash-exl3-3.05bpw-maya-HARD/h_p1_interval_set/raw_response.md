```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi)."""

    __slots__ = ("_ivs", "_total")

    def __init__(self):
        # Sorted list of (lo, hi) tuples. Invariants:
        #   - strictly increasing by lo
        #   - disjoint and non-touching: ivs[k][1] < ivs[k+1][0]
        self._ivs = []
        self._total = 0

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval whose lo > lo_value; the one before it may overlap/touch.
        i = bisect_right(ivs, lo, key=lambda iv: iv[0])
        start = i - 1 if i > 0 and ivs[i - 1][1] >= lo else i
        # First interval whose lo > hi_value; intervals with lo == hi touch and merge.
        j = bisect_right(ivs, hi, key=lambda iv: iv[0])
        if start < j:
            new_lo = lo if ivs[start][0] > lo else ivs[start][0]
            new_hi = hi if ivs[j - 1][1] < hi else ivs[j - 1][1]
            for old_lo, old_hi in ivs[start:j]:
                self._total -= old_hi - old_lo
        else:
            new_lo, new_hi = lo, hi
        self._total += new_hi - new_lo
        ivs[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignored if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval whose lo > lo_value; the one before it may extend past lo.
        i = bisect_right(ivs, lo, key=lambda iv: iv[0])
        start = i - 1 if i > 0 and ivs[i - 1][1] > lo else i
        # First interval whose lo >= hi_value.
        j = bisect_left(ivs, hi, key=lambda iv: iv[0])
        if start >= j:
            return
        pieces = []
        s_lo, s_hi = ivs[start]
        if s_lo < lo:
            pieces.append((s_lo, lo))
        e_lo, e_hi = ivs[j - 1]
        if e_hi > hi:
            pieces.append((hi, e_hi))
        for old_lo, old_hi in ivs[start:j]:
            self._total -= old_hi - old_lo
        for new_lo, new_hi in pieces:
            self._total += new_hi - new_lo
        ivs[start:j] = pieces

    def contains(self, x):
        """Return True iff x is in the set. O(log n)."""
        ivs = self._ivs
        i = bisect_right(ivs, x, key=lambda iv: iv[0])
        return i > 0 and ivs[i - 1][1] > x

    def total_length(self):
        """Sum of all interval lengths."""
        return self._total

    def intervals(self):
        """All intervals as a sorted list of (lo, hi) tuples."""
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)
```