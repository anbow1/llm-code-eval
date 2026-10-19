from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi), kept in two parallel sorted lists."""

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []  # sorted interval starts
        self._hi = []  # corresponding interval ends (self._hi[k] > self._lo[k],
                       # and self._hi[k] < self._lo[k + 1]  ->  no touching)

    def add(self, lo, hi):
        """Add [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # Last interval whose start <= lo.
        i = bisect_right(los, lo) - 1
        if i >= 0 and his[i] >= lo:
            s = i          # touches/overlaps previous interval
        else:
            s = i + 1
        # First interval whose start > hi (an interval starting exactly at hi
        # touches us and must be merged).
        j = bisect_right(los, hi)
        if s < j:
            if los[s] < lo:
                lo = los[s]
            if his[j - 1] > hi:
                hi = his[j - 1]
        # Replace all overlapped/touched intervals with the merged one.
        los[s:j] = [lo]
        his[s:j] = [hi]

    def remove(self, lo, hi):
        """Remove [lo, hi); may split intervals. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # First interval whose start >= hi (start == hi does not intersect).
        j = bisect_left(los, hi)
        # Last interval whose start <= lo.
        i = bisect_right(los, lo) - 1
        if i >= 0 and his[i] > lo:
            s = i          # strictly overlaps previous interval
        else:
            s = i + 1
        if s >= j:
            return
        pieces_lo = []
        pieces_hi = []
        if los[s] < lo:            # keep a left remainder of the first hit
            pieces_lo.append(los[s])
            pieces_hi.append(lo)
        if his[j - 1] > hi:        # keep a right remainder of the last hit
            pieces_lo.append(hi)
            pieces_hi.append(his[j - 1])
        los[s:j] = pieces_lo
        his[s:j] = pieces_hi

    def contains(self, x):
        """Return True iff x is in the set. O(log n)."""
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        """Sum of all interval lengths."""
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __contains__(self, x):
        return self.contains(x)
