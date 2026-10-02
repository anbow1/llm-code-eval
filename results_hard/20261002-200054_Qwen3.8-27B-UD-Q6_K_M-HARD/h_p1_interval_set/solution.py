import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint, merged half-open intervals [lo, hi)."""

    def __init__(self):
        self._intervals: list[tuple] = []  # sorted by lo, disjoint, non-touching

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignores if lo >= hi."""
        if lo >= hi:
            return

        # First interval with lo_i >= lo
        pos = bisect.bisect_left(self._intervals, (lo, float("-inf")))

        new_lo = lo
        new_hi = hi

        # Merge with the previous interval if it overlaps or touches
        start = pos
        if start > 0 and self._intervals[start - 1][1] >= lo:
            new_lo = self._intervals[start - 1][0]
            start -= 1

        # Merge with subsequent intervals that overlap or touch
        end = pos
        while end < len(self._intervals) and self._intervals[end][0] <= new_hi:
            if self._intervals[end][1] > new_hi:
                new_hi = self._intervals[end][1]
            end += 1

        self._intervals[start:end] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set. Ignores if lo >= hi."""
        if lo >= hi:
            return

        pos = bisect.bisect_left(self._intervals, (lo, float("-inf")))

        # Include the previous interval if it overlaps [lo, hi)
        start = pos
        if start > 0 and self._intervals[start - 1][1] > lo:
            start -= 1

        # End is the first interval with lo_i >= hi (no overlap)
        end = bisect.bisect_left(self._intervals, (hi, float("-inf")))

        new_intervals = []
        for i in range(start, end):
            a, b = self._intervals[i]
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))

        self._intervals[start:end] = new_intervals

    def contains(self, x) -> bool:
        """Return True if x is in the set. O(log n)."""
        # Rightmost interval with lo <= x
        pos = bisect.bisect_right(self._intervals, (x, float("inf")))
        if pos > 0:
            lo, hi = self._intervals[pos - 1]
            return lo <= x < hi
        return False

    def total_length(self):
        """Return the total length of all intervals."""
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        """Return all intervals as sorted (lo, hi) tuples, disjoint and merged."""
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
