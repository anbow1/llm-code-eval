from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi). Touching intervals ([1,3) and [3,5)) are merged
    into one ([1,5)).

    Invariants:
      - self._los and self._his are parallel lists of interval bounds,
        strictly increasing and pairwise non-touching:
          los[0] < his[0] < los[1] < his[1] < ...
      - self._total is the cached sum of (hi - lo) over all intervals.
    """

    __slots__ = ("_los", "_his", "_total")

    def __init__(self):
        self._los = []
        self._his = []
        self._total = 0

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        # Intervals overlapping or touching [lo, hi):
        #   his[i] >= lo and los[i] <= hi
        left = bisect_left(his, lo)        # first index with his[i] >= lo
        right = bisect_right(los, hi)      # first index with los[i] > hi

        if left < right:
            # All intervals in [left, right) overlap/touch [lo, hi), and any
            # gap between consecutive ones lies inside [lo, hi), so they all
            # merge with the new interval into a single interval.
            first_lo = los[left]
            last_hi = his[right - 1]
            if first_lo < lo:
                lo = first_lo
            if last_hi > hi:
                hi = last_hi
            self._total -= sum(
                h - l for l, h in zip(los[left:right], his[left:right])
            )
            del los[left:right]
            del his[left:right]
        # Insert at index `left` (valid for both lists: everything before
        # has his < lo, everything from `left` on has los > hi).
        los.insert(left, lo)
        his.insert(left, hi)
        self._total += hi - lo

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split intervals).
        Ignored if lo >= hi."""
        if lo >= hi:
            return
        los, his = self._los, self._his

        # Intervals strictly overlapping [lo, hi):
        #   his[i] > lo and los[i] < hi
        left = bisect_right(his, lo)       # first index with his[i] > lo
        right = bisect_left(los, hi)       # first index with los[i] >= hi

        if left >= right:
            return

        self._total -= sum(
            h - l for l, h in zip(los[left:right], his[left:right])
        )

        new_lo = []
        new_hi = []
        # Keep the part of the first overlapping interval left of `lo`.
        if los[left] < lo:
            new_lo.append(los[left])
            new_hi.append(lo)
            self._total += lo - los[left]
        # Keep the part of the last overlapping interval right of `hi`.
        if his[right - 1] > hi:
            new_lo.append(hi)
            new_hi.append(his[right - 1])
            self._total += his[right - 1] - hi

        los[left:right] = new_lo
        his[left:right] = new_hi

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._his, x)     # first index with his[i] > x
        return i < len(self._los) and self._los[i] <= x

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return self._total

    def intervals(self):
        """All intervals as sorted, disjoint, non-touching (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    def __len__(self):
        """Number of intervals."""
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)

    def __iter__(self):
        return iter(zip(self._los, self._his))
