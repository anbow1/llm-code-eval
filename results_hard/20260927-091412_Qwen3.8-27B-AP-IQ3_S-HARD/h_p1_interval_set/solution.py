from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers represented as a collection of disjoint half-open intervals [lo, hi)."""

    def __init__(self) -> None:
        self._intervals: list[tuple] = []  # sorted list of (lo, hi)
        self._los: list = []                # sorted list of lo values for O(log n) bisect
        self._total: float = 0

    # ------------------------------------------------------------------ contains
    def contains(self, x) -> bool:
        """Return True if x belongs to the set. O(log n)."""
        idx = bisect_right(self._los, x) - 1
        if idx >= 0:
            return x < self._intervals[idx][1]
        return False

    # ------------------------------------------------------------------ total_length
    def total_length(self):
        """Return the total length of all intervals."""
        return self._total

    # ------------------------------------------------------------------ intervals
    def intervals(self) -> list[tuple]:
        """Return all intervals as a sorted list of (lo, hi) tuples (disjoint, touching merged)."""
        return list(self._intervals)

    # ------------------------------------------------------------------ __len__
    def __len__(self) -> int:
        return len(self._intervals)

    # ------------------------------------------------------------------ add
    def add(self, lo, hi) -> None:
        """Add [lo, hi) to the set, merging with any overlapping or touching intervals."""
        if lo >= hi:
            return

        # right: last interval with a <= hi  (can touch or overlap on the right)
        right = bisect_right(self._los, hi) - 1

        # left: first interval with b >= lo  (can touch or overlap on the left)
        mid = bisect_right(self._los, lo)  # first index where a > lo
        left = mid
        if left > 0 and self._intervals[left - 1][1] >= lo:
            left -= 1

        if left > right:
            # No overlap or touching: simple insertion
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._total += hi - lo
            return

        # Merge all intervals [left .. right] with [lo, hi)
        new_lo = lo if lo < self._intervals[left][0] else self._intervals[left][0]
        new_hi = hi if hi > self._intervals[right][1] else self._intervals[right][1]

        removed_length = 0.0
        for i in range(left, right + 1):
            removed_length += self._intervals[i][1] - self._intervals[i][0]

        del self._intervals[left:right + 1]
        del self._los[left:right + 1]

        self._total += (new_hi - new_lo) - removed_length

        self._intervals.insert(left, (new_lo, new_hi))
        self._los.insert(left, new_lo)

    # ------------------------------------------------------------------ remove
    def remove(self, lo, hi) -> None:
        """Remove [lo, hi) from the set. May split intervals."""
        if lo >= hi:
            return

        # Find intervals [a, b) with a < hi AND b > lo  (actual overlap)
        right = bisect_left(self._los, hi) - 1  # last index with a < hi

        mid = bisect_right(self._los, lo)  # first index with a > lo
        left = mid
        if left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1

        if left > right:
            return  # nothing to remove

        new_pieces: list[tuple] = []
        removed_total = 0.0
        for i in range(left, right + 1):
            a, b = self._intervals[i]
            removed_total += b - a
            if a < lo:
                new_pieces.append((a, lo))
            if hi < b:
                new_pieces.append((hi, b))

        added_total = 0.0
        for a, b in new_pieces:
            added_total += b - a

        del self._intervals[left:right + 1]
        del self._los[left:right + 1]

        self._total += added_total - removed_total

        for i, piece in enumerate(new_pieces):
            self._intervals.insert(left + i, piece)
            self._los.insert(left + i, piece[0])
