from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi).

    Touching intervals are merged automatically: adding [1,3) then [3,5)
    yields the single interval [1,5).
    """

    __slots__ = ("_los", "_his")

    def __init__(self):
        self._los = []  # sorted lower bounds
        self._his = []  # corresponding upper bounds (strictly increasing)

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        i = bisect_left(los, lo)
        # Possibly merge with the interval just left of `lo` (touching counts).
        if i > 0 and his[i - 1] >= lo:
            start = i - 1
        else:
            start = i

        # First interval whose lower bound is strictly above `hi`
        # (an interval with lo == hi touches and must be merged).
        j = bisect_right(los, hi)

        if j > start:
            # Merge [lo, hi) with intervals[start:j].
            new_lo = los[start] if start == i - 1 else lo
            new_hi = his[j - 1] if his[j - 1] > hi else hi
            los[start:j] = [new_lo]
            his[start:j] = [new_hi]
        else:
            # No overlap or touching: insert a brand-new interval.
            los.insert(start, lo)
            his.insert(start, hi)

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        i = bisect_left(los, lo)
        # Only intervals strictly overlapping [lo, hi) matter
        # (an interval ending exactly at `lo` is untouched).
        if i > 0 and his[i - 1] > lo:
            start = i - 1
        else:
            start = i

        # First interval whose lower bound is >= hi (no overlap with the removal).
        j = bisect_left(los, hi)

        if j == start:
            return

        new_lo = []
        new_hi = []
        # Left remainder of the first affected interval.
        if los[start] < lo:
            new_lo.append(los[start])
            new_hi.append(lo)
        # Right remainder of the last affected interval.
        if his[j - 1] > hi:
            new_lo.append(hi)
            new_hi.append(his[j - 1])

        los[start:j] = new_lo
        his[start:j] = new_hi

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        los = self._los
        i = bisect_right(los, x) - 1
        return i >= 0 and x < self._his[i]

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return sum(hi - lo for lo, hi in zip(self._los, self._his))

    def intervals(self):
        """Return all intervals as a sorted list of disjoint (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    def __len__(self):
        """Number of intervals currently stored."""
        return len(self._los)
