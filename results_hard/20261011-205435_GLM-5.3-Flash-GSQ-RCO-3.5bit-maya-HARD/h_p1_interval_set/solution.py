from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi), kept sorted by lo.

    Invariant: intervals are pairwise disjoint and strictly separated
    (hi_i < lo_{i+1}), because touching intervals are merged on add and
    remove can only shrink intervals (creating gaps, never touching).
    Hence both the lo-list and the hi-list are strictly increasing,
    which allows plain binary search on either list.
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []  # sorted lower bounds
        self._hi = []  # corresponding upper bounds (also sorted)

    def add(self, lo, hi):
        """Add [lo, hi), merging with all overlapping/touching intervals."""
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi
        # First interval whose hi >= lo (touching or overlapping from the left).
        i = bisect_left(hi_list, lo)
        # Last interval whose lo <= hi (touching or overlapping from the right).
        j = bisect_right(lo_list, hi) - 1
        if i > j:
            # No contact: insert at position i (kept sorted, gaps preserved).
            lo_list.insert(i, lo)
            hi_list.insert(i, hi)
            return
        new_lo = lo_list[i] if lo_list[i] < lo else lo
        new_hi = hi_list[j] if hi_list[j] > hi else hi
        lo_list[i:j + 1] = [new_lo]
        hi_list[i:j + 1] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi), splitting an interval in two if needed."""
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi
        # First interval with hi > lo (strictly overlaps from the left).
        i = bisect_right(hi_list, lo)
        # Last interval with lo < hi (strictly overlaps from the right).
        j = bisect_left(lo_list, hi) - 1
        if i > j:
            return
        if i == j:
            a, b = lo_list[i], hi_list[i]
            if a >= lo and b <= hi:
                # Fully covered: drop it.
                del lo_list[i]
                del hi_list[i]
            elif a < lo and b > hi:
                # Split into [a, lo) and [hi, b).
                hi_list[i] = lo
                lo_list.insert(i + 1, hi)
                hi_list.insert(i + 1, b)
            elif a < lo:
                # Keep left remainder [a, lo).
                hi_list[i] = lo
            else:
                # Keep right remainder [hi, b).
                lo_list[i] = hi
            return
        # Multiple intervals affected (i < j).
        start = i + 1 if lo_list[i] < lo else i
        end = j - 1 if hi_list[j] > hi else j
        if lo_list[i] < lo:
            # Trim leftmost to [lo_i, lo).
            hi_list[i] = lo
        if hi_list[j] > hi:
            # Trim rightmost to [hi, hi_j).
            lo_list[j] = hi
        if start <= end:
            # Delete fully covered middle intervals.
            del lo_list[start:end + 1]
            del hi_list[start:end + 1]

    def contains(self, x):
        """Return True if x lies in some [lo, hi): lo <= x < hi. O(log n)."""
        idx = bisect_right(self._lo, x) - 1
        return idx >= 0 and self._hi[idx] > x

    def total_length(self):
        """Sum of all interval lengths."""
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        """All intervals as sorted, disjoint (lo, hi) tuples, touching merged."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        """Number of intervals."""
        return len(self._lo)

    def __contains__(self, x):
        return self.contains(x)
