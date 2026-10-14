```python
from bisect import bisect_left
from typing import Iterable


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi)."""

    __slots__ = ("_ivs", "_total")

    def __init__(self, intervals: Iterable[tuple[float, float]] = ()) -> None:
        self._ivs: list[tuple[float, float]] = []
        self._total = 0
        for lo, hi in intervals:
            self.add(lo, hi)

    def add(self, lo: float, hi: float) -> None:
        """Add [lo, hi) to the set, merging overlapping and touching intervals."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval with start >= lo.
        i = bisect_left(ivs, (lo,))
        # If the previous interval overlaps or touches (end >= lo), absorb it.
        if i > 0 and ivs[i - 1][1] >= lo:
            i -= 1
            lo = ivs[i][0]
        # Absorb all following intervals that overlap or touch (start <= hi).
        j = i
        removed = 0
        while j < len(ivs) and ivs[j][0] <= hi:
            s, e = ivs[j]
            removed += e - s
            if e > hi:
                hi = e
            j += 1
        if j > i:
            ivs[i:j] = [(lo, hi)]
        else:
            ivs.insert(i, (lo, hi))
        self._total += hi - lo - removed

    def remove(self, lo: float, hi: float) -> None:
        """Remove [lo, hi) from the set (may split intervals)."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval with start >= lo.
        i = bisect_left(ivs, (lo,))
        # If the previous interval strictly overlaps (end > lo), include it.
        if i > 0 and ivs[i - 1][1] > lo:
            i -= 1
        # All intervals with start < hi overlap.
        j = i
        removed = 0
        while j < len(ivs) and ivs[j][0] < hi:
            removed += ivs[j][1] - ivs[j][0]
            j += 1
        if j == i:
            return
        first, last = ivs[i], ivs[j - 1]
        replacement = []
        if first[0] < lo:
            replacement.append((first[0], lo))
        if last[1] > hi:
            replacement.append((hi, last[1]))
        ivs[i:j] = replacement
        self._total -= removed

    def contains(self, x: float) -> bool:
        """Return True if x is in the set. O(log n)."""
        ivs = self._ivs
        i = bisect_left(ivs, (x,))
        if i > 0 and ivs[i - 1][1] > x:
            return True
        return i < len(ivs) and ivs[i][0] == x and ivs[i][1] > x

    def total_length(self) -> float:
        """Sum of all interval lengths."""
        return self._total

    def intervals(self) -> list[tuple[float, float]]:
        """All intervals as sorted, disjoint, merged (lo, hi) tuples."""
        return list(self._ivs)

    def __len__(self) -> int:
        return len(self._ivs)

    def __contains__(self, x: float) -> bool:
        return self.contains(x)
```