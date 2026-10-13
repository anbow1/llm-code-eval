from bisect import bisect_right, insort


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._los = []  # sorted starts
        self._his = []  # corresponding ends; _his[i] > _los[i], disjoint & non-adjacent

    def _overlap_range(self, lo, hi):
        """Return (start, end): indices of intervals overlapping [lo, hi).
        Intervals[start:end] are exactly those with interval.lo < hi and interval.hi > lo."""
        i = bisect_right(self._los, lo) - 1
        if i >= 0 and self._his[i] > lo:
            start = i
        else:
            start = i + 1
        end = start
        n = len(self._los)
        while end < n and self._los[end] < hi:
            end += 1
        return start, end

    def add(self, lo, hi):
        """Add [lo, hi). Ignored if lo >= hi. Touching intervals are merged."""
        if lo >= hi:
            return
        start, end = self._overlap_range(lo, hi)
        if start == end:
            self._los.insert(start, lo)
            self._his.insert(start, hi)
        else:
            new_lo = min(lo, self._los[start])
            new_hi = max(hi, self._his[end - 1])
            self._los[start:end] = [new_lo]
            self._his[start:end] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi). May split an interval in two. Ignored if lo >= hi."""
        if lo >= hi:
            return
        start, end = self._overlap_range(lo, hi)
        if start == end:
            return
        pieces = []
        if self._los[start] < lo:
            pieces.append((self._los[start], lo))
        if self._his[end - 1] > hi:
            pieces.append((hi, self._his[end - 1]))
        self._los[start:end] = [p[0] for p in pieces]
        self._his[start:end] = [p[1] for p in pieces]

    def contains(self, x):
        """Return True iff x is in the set. O(log n)."""
        i = bisect_right(self._los, x) - 1
        return i >= 0 and self._his[i] > x

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        """All intervals as sorted, disjoint (lo, hi) tuples with touching ones merged."""
        return list(zip(self._los, self._his))

    def __len__(self):
        """Number of intervals."""
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)
