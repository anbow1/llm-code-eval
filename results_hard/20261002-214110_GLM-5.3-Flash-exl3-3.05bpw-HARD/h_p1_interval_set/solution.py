import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []      # sorted list of interval lower bounds
        self._hi = []      # sorted list of interval upper bounds (parallel to _lo)
        self._total = 0    # cached sum of (hi - lo)

    def add(self, lo, hi):
        """Add [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # First interval that could touch/overlap: hi >= lo
        i = bisect.bisect_left(his, lo)
        # One past the last interval that could touch/overlap: lo <= hi
        j = bisect.bisect_right(los, hi)
        if i == j:
            self._total += hi - lo
            los.insert(i, lo)
            his.insert(i, hi)
            return
        self._total += (hi - lo) - sum(his[k] - los[k] for k in range(i, j))
        new_lo = min(lo, los[i])
        new_hi = max(hi, his[j - 1])
        los[i:j] = [new_lo]
        his[i:j] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # First interval strictly overlapping: hi > lo
        i = bisect.bisect_right(his, lo)
        # One past the last overlapping interval: lo < hi
        j = bisect.bisect_left(los, hi)
        if i >= j:
            return
        self._total -= sum(min(hi, his[k]) - max(lo, los[k]) for k in range(i, j))
        pieces_lo = []
        pieces_hi = []
        l0 = los[i]
        if l0 < lo:
            pieces_lo.append(l0)
            pieces_hi.append(lo)
        h1 = his[j - 1]
        if h1 > hi:
            pieces_lo.append(hi)
            pieces_hi.append(h1)
        los[i:j] = pieces_lo
        his[i:j] = pieces_hi

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect.bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        """Sum of all interval lengths."""
        return self._total

    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __contains__(self, x):
        return self.contains(x)

    def __repr__(self):
        return f"IntervalSet({self.intervals()})"
