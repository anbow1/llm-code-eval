from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi).

    Internally, interval starts and ends are kept in two parallel sorted lists
    (`_lo` and `_hi`). Since all intervals are disjoint and sorted, the ends
    are also sorted, which lets both boundaries be searched with bisect.
    """

    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []    # sorted list of interval starts
        self._hi = []    # parallel sorted list of interval ends
        self._total = 0  # cached sum of (hi - lo)

    # ------------------------------------------------------------------ #
    def add(self, lo, hi):
        """Add the half-open interval [lo, hi). No-op if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi

        # First interval whose end reaches at least up to `lo`
        # (it either overlaps or touches [lo, hi) on the left).
        i = bisect_left(his, lo)
        # One past the last interval starting at or before `hi`
        # (it either overlaps or touches [lo, hi) on the right).
        j = bisect_right(los, hi)

        if i < j:
            # Merge [lo, hi) with all intervals in positions [i, j).
            removed = sum(his[k] - los[k] for k in range(i, j))
            if los[i] < lo:
                lo = los[i]
            if his[j - 1] > hi:
                hi = his[j - 1]
            los[i:j] = [lo]
            his[i:j] = [hi]
            self._total += (hi - lo) - removed
        else:
            # No neighbours to merge with: plain insertion.
            los.insert(i, lo)
            his.insert(i, hi)
            self._total += hi - lo

    # ------------------------------------------------------------------ #
    def remove(self, lo, hi):
        """Remove the half-open interval [lo, hi). No-op if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._lo, self._hi

        # Intervals truly intersecting [lo, hi):
        #   end > lo  (an interval ending exactly at `lo` is untouched)
        #   start < hi (an interval starting exactly at `hi` is untouched)
        i = bisect_right(his, lo)   # first index with end > lo
        j = bisect_left(los, hi)    # first index with start >= hi
        if i >= j:
            return

        # Possible survivors at the cut edges (computed before mutation).
        left_piece = los[i] < lo
        right_piece = his[j - 1] > hi

        self._total -= (hi - lo)

        if left_piece and right_piece:
            los[i:j] = [los[i], hi]
            his[i:j] = [lo, his[j - 1]]
        elif left_piece:
            los[i:j] = [los[i]]
            his[i:j] = [lo]
        elif right_piece:
            los[i:j] = [hi]
            his[i:j] = [his[j - 1]]
        else:
            del los[i:j]
            del his[i:j]

    # ------------------------------------------------------------------ #
    def contains(self, x):
        """Return True iff x lies inside one of the intervals. O(log n)."""
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and x < self._hi[i]

    # ------------------------------------------------------------------ #
    def total_length(self):
        """Total measure of the stored set."""
        return self._total

    # ------------------------------------------------------------------ #
    def intervals(self):
        """Return all intervals as a sorted list of (lo, hi) tuples."""
        return list(zip(self._lo, self._hi))

    # ------------------------------------------------------------------ #
    def __len__(self):
        return len(self._lo)
