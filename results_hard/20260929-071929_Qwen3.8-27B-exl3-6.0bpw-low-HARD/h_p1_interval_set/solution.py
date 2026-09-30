from bisect import bisect_left, bisect_right


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted, disjoint, non-touching

    def contains(self, x) -> bool:
        """Return True if x is in the set. O(log n)."""
        intervals = self._intervals
        pos = bisect_right(intervals, (x, float('inf')))
        if pos > 0:
            lo, hi = intervals[pos - 1]
            return lo <= x < hi
        return False

    def add(self, lo, hi):
        """Add the half-open interval [lo, hi). No-op if lo >= hi."""
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, (lo, float('-inf')))

        new_lo, new_hi = lo, hi
        start = i

        # Check left neighbor for overlap/touch
        if i > 0 and intervals[i - 1][1] >= lo:
            new_lo = intervals[i - 1][0]
            if intervals[i - 1][1] > new_hi:
                new_hi = intervals[i - 1][1]
            start = i - 1

        # Check right neighbors for overlap/touch
        j = i
        while j < len(intervals) and intervals[j][0] <= new_hi:
            if intervals[j][1] > new_hi:
                new_hi = intervals[j][1]
            j += 1

        intervals[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        """Remove the half-open interval [lo, hi). No-op if lo >= hi."""
        if lo >= hi:
            return
        intervals = self._intervals

        # Find end: first interval with start >= hi
        end = bisect_left(intervals, (hi, float('-inf')))

        # Find start: first interval with end > lo
        # End values are strictly increasing (disjoint, sorted intervals)
        lo_bound, hi_bound = 0, end
        while lo_bound < hi_bound:
            mid = (lo_bound + hi_bound) // 2
            if intervals[mid][1] <= lo:
                lo_bound = mid + 1
            else:
                hi_bound = mid
        start = lo_bound

        if start >= end:
            return

        # Build replacement intervals
        new_parts = []
        for k in range(start, end):
            a, b = intervals[k]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))

        intervals[start:end] = new_parts

    def total_length(self):
        """Return the total length of all intervals."""
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        """Return all intervals as sorted (lo, hi) tuples, disjoint and merged."""
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
