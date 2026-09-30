import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi).

    Internal representation: two parallel lists `_lo` and `_hi` kept sorted,
    with the invariant that stored intervals are disjoint and non-touching
    (i.e. `_hi[i] < _lo[i + 1]` strictly, since adjacent intervals are merged
    on insertion).
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # Candidates for merging: intervals [a, b) with a <= hi and b >= lo.
        # Since intervals are sorted and non-touching, both `los` and `his`
        # are increasing, so the candidates form the contiguous slice
        # [left, right).
        left = bisect.bisect_left(his, lo)    # first interval with hi >= lo
        right = bisect.bisect_right(los, hi)  # first interval with lo > hi
        if left == right:
            # No overlap or touching: plain insertion at position `left`
            # (neighbors are verified non-touching by the bisect bounds).
            los.insert(left, lo)
            his.insert(left, hi)
        else:
            # Merge all touching/overlapping intervals into one.
            new_lo = los[left] if los[left] < lo else lo
            new_hi = his[right - 1] if his[right - 1] > hi else hi
            los[left:right] = [new_lo]
            his[left:right] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # Intervals that actually overlap [lo, hi) (not merely touch):
        # those with hi > lo and lo < hi, forming the slice [left, right).
        left = bisect.bisect_right(his, lo)  # first interval with hi > lo
        right = bisect.bisect_left(los, hi)  # first interval with lo >= hi
        if left >= right:
            return
        pieces_lo = []
        pieces_hi = []
        if los[left] < lo:
            # Keep the left remainder of the first affected interval.
            pieces_lo.append(los[left])
            pieces_hi.append(lo)
        if his[right - 1] > hi:
            # Keep the right remainder of the last affected interval.
            pieces_lo.append(hi)
            pieces_hi.append(his[right - 1])
        # Replace all affected intervals by the surviving pieces; intervals
        # strictly between `left` and `right - 1` were fully covered and vanish.
        los[left:right] = pieces_lo
        his[left:right] = pieces_hi

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect.bisect_right(self._lo, x) - 1
        return i >= 0 and x < self._hi[i]

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        """All intervals as sorted, disjoint (lo, hi) tuples, touching merged."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        """Number of intervals currently stored."""
        return len(self._lo)
