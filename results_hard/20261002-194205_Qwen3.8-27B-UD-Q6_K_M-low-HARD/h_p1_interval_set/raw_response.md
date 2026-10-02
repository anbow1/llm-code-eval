```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """Stores a set of real numbers as disjoint, non-touching half-open intervals [lo, hi)."""

    def __init__(self):
        self._intervals: list[tuple] = []  # sorted by lo, disjoint, non-touching

    def add(self, lo, hi) -> None:
        """Add [lo, hi). Merges with overlapping or touching intervals. No-op if lo >= hi."""
        if lo >= hi:
            return

        # Find all intervals that overlap or touch [lo, hi)
        # Overlap or touch condition: a <= hi and b >= lo
        right = bisect_right(self._intervals, hi, key=lambda t: t[0])

        left = right
        while left > 0 and self._intervals[left - 1][1] >= lo:
            left -= 1

        if left < right:
            new_lo = self._intervals[left][0] if self._intervals[left][0] < lo else lo
            new_hi = self._intervals[right - 1][1] if self._intervals[right - 1][1] > hi else hi
        else:
            new_lo = lo
            new_hi = hi

        self._intervals[left:right] = [(new_lo, new_hi)]

    def remove(self, lo, hi) -> None:
        """Remove [lo, hi) from the set. May split intervals. No-op if lo >= hi."""
        if lo >= hi:
            return

        # Find all intervals that strictly overlap [lo, hi)
        # Strict overlap condition: a < hi and b > lo
        right = bisect_left(self._intervals, hi, key=lambda t: t[0])

        left = right
        while left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1

        new_parts: list[tuple] = []
        for i in range(left, right):
            a, b = self._intervals[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))

        self._intervals[left:right] = new_parts

    def contains(self, x) -> bool:
        """Return True if x belongs to any interval in the set. O(log n)."""
        idx = bisect_right(self._intervals, x, key=lambda t: t[0]) - 1
        if idx >= 0:
            _, hi = self._intervals[idx]
            return x < hi
        return False

    def total_length(self):
        """Return the total length of all intervals."""
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        """Return all intervals as sorted (lo, hi) tuples, disjoint and non-touching."""
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
```