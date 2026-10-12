from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_iv",)

    def __init__(self):
        # Sorted list of (lo, hi) tuples, pairwise disjoint and non-touching.
        self._iv = []

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignore if lo >= hi."""
        if lo >= hi:
            return
        iv = self._iv
        # First interval that touches or overlaps: hi >= lo.
        start = bisect_left(iv, lo, key=lambda t: t[1])
        # First interval strictly beyond: lo > hi.
        end = bisect_right(iv, hi, key=lambda t: t[0])
        if start < end:
            if iv[start][0] < lo:
                lo = iv[start][0]
            if iv[end - 1][1] > hi:
                hi = iv[end - 1][1]
        # Replace all merged intervals with the single merged interval
        # (or insert into the empty gap if start == end).
        iv[start:end] = [(lo, hi)]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignore if lo >= hi."""
        if lo >= hi:
            return
        iv = self._iv
        start = bisect_left(iv, lo, key=lambda t: t[1])
        end = bisect_right(iv, hi, key=lambda t: t[0])
        if start >= end:
            return
        pieces = []
        first = iv[start]
        if first[0] < lo:
            pieces.append((first[0], lo))
        last = iv[end - 1]
        if last[1] > hi:
            pieces.append((hi, last[1]))
        iv[start:end] = pieces

    def contains(self, x):
        """Return True iff x is in the set. O(log n)."""
        iv = self._iv
        idx = bisect_right(iv, x, key=lambda t: t[0]) - 1
        return idx >= 0 and iv[idx][1] > x

    def total_length(self):
        """Sum of all interval lengths."""
        return sum(hi - lo for lo, hi in self._iv)

    def intervals(self):
        """All intervals as (lo, hi) tuples: sorted, disjoint, touching merged."""
        return list(self._iv)

    def __len__(self):
        return len(self._iv)
