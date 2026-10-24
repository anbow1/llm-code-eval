```python
from bisect import bisect_left, bisect_right
from typing import List, Tuple


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi), kept sorted by start point.

    Invariants:
      * self._starts is strictly increasing.
      * For consecutive intervals, ends[k] < starts[k + 1] (touching
        intervals are merged, so the gap is always strictly positive).
      * self._total is the sum of all interval lengths.
    """

    def __init__(self) -> None:
        self._starts: List[float] = []
        self._ends: List[float] = []
        self._total = 0

    def add(self, lo: float, hi: float) -> None:
        """Add [lo, hi) to the set, merging overlapping/touching intervals."""
        if lo >= hi:
            return
        starts = self._starts
        ends = self._ends

        i = bisect_left(starts, lo)
        # The interval just before lo either overlaps [lo, hi) or touches it
        # (ends[i-1] >= lo); absorb it into the merged interval.
        if i > 0 and ends[i - 1] >= lo:
            lo = starts[i - 1]
            i -= 1

        # All intervals with start <= hi overlap or touch [lo, hi).
        j = bisect_right(starts, hi)
        if j > i:
            self._total -= sum(e - s for s, e in zip(starts[i:j], ends[i:j]))
            if ends[j - 1] > hi:
                hi = ends[j - 1]

        starts[i:j] = [lo]
        ends[i:j] = [hi]
        self._total += hi - lo

    def remove(self, lo: float, hi: float) -> None:
        """Remove [lo, hi) from the set, splitting intervals as needed."""
        if lo >= hi:
            return
        starts = self._starts
        ends = self._ends

        i = bisect_left(starts, lo)
        left_partial = i > 0 and ends[i - 1] > lo
        if left_partial:
            i -= 1  # this interval straddles lo; include it in the cut range

        j = bisect_left(starts, hi)  # intervals with start < hi are affected

        pieces: List[Tuple[float, float]] = []
        if left_partial:
            pieces.append((starts[i], lo))
        if j > i and ends[j - 1] > hi:
            pieces.append((hi, ends[j - 1]))

        removed = sum(e - s for s, e in zip(starts[i:j], ends[i:j]))
        kept = sum(e - s for s, e in pieces)
        self._total += kept - removed

        starts[i:j] = [p[0] for p in pieces]
        ends[i:j] = [p[1] for p in pieces]

    def contains(self, x: float) -> bool:
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._starts, x) - 1
        return i >= 0 and x < self._ends[i]

    def __contains__(self, x: float) -> bool:
        return self.contains(x)

    def total_length(self) -> float:
        """Sum of the lengths of all intervals. O(1)."""
        return self._total

    def intervals(self) -> List[Tuple[float, float]]:
        """All intervals as (lo, hi) tuples: sorted, disjoint, touching merged."""
        return list(zip(self._starts, self._ends))

    def __len__(self) -> int:
        return len(self._starts)

    def __repr__(self) -> str:
        return f"IntervalSet({self.intervals()!r})"
```