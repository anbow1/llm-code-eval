from bisect import bisect_left, bisect_right


class IntervalSet:
    """
    A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi), kept sorted by start.

    Invariants:
      - _lo is sorted ascending, len(_lo) == len(_hi)
      - for consecutive intervals: _hi[i] < _lo[i + 1]  (strict gap,
        touching intervals are always merged)
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        """Add [lo, hi). Ignored if lo >= hi."""
        if lo >= hi:
            return
        _lo, _hi = self._lo, self._hi

        # Interval that may already cover/touch `lo` from the left.
        i0 = bisect_right(_lo, lo) - 1
        if i0 >= 0 and _hi[i0] >= lo:
            first = i0
            new_lo = _lo[i0]
        else:
            first = i0 + 1  # first interval with _lo > lo
            new_lo = lo

        # Last interval with start <= hi (touching at hi counts as merge).
        last = bisect_right(_lo, hi) - 1
        if last >= first:
            end = _hi[last]
            new_hi = end if end > hi else hi
            # Replace the swallowed/merged block in one shift.
            _lo[first:last + 1] = [new_lo]
            _hi[first:last + 1] = [new_hi]
        else:
            _lo.insert(first, new_lo)
            _hi.insert(first, hi)

    def remove(self, lo, hi):
        """Remove [lo, hi); may split an interval in two. Ignored if lo >= hi."""
        if lo >= hi:
            return
        _lo, _hi = self._lo, self._hi

        i0 = bisect_right(_lo, lo) - 1
        if i0 >= 0 and _hi[i0] > lo:
            first = i0  # interval straddling or starting at lo
        else:
            first = i0 + 1

        # First interval with start >= hi: these do not intersect [lo, hi).
        j = bisect_left(_lo, hi)
        if j <= first:
            return  # nothing intersects [lo, hi)

        pieces_lo = []
        pieces_hi = []
        if first == i0 and _lo[first] < lo:
            # Keep the left remainder of the straddling interval.
            pieces_lo.append(_lo[first])
            pieces_hi.append(lo)
        if _hi[j - 1] > hi:
            # Keep the right remainder of the last intersecting interval.
            pieces_lo.append(hi)
            pieces_hi.append(_hi[j - 1])

        _lo[first:j] = pieces_lo
        _hi[first:j] = pieces_hi

    def contains(self, x):
        """Return True iff x is in the set. O(log n)."""
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        """All intervals as sorted (lo, hi) tuples, disjoint and merged."""
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __contains__(self, x):
        return self.contains(x)
