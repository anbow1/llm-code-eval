```python
from bisect import bisect_right
from typing import List, Tuple


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi).

    Internally keeps a sorted list of interval starts (`_lo`) paired with the
    corresponding ends (`_hi`). Intervals are disjoint, non-touching, and
    sorted by their lower bound.

    add/remove: O(n) worst case (due to list splicing), contains: O(log n).
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo: list = []  # sorted interval start points
        self._hi: list = []  # interval end points, aligned with _lo

    # ------------------------------------------------------------------ #
    # public API
    # ------------------------------------------------------------------ #

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi
        n = len(lo_list)

        # Find the last interval whose start is <= lo.
        idx = bisect_right(lo_list, lo) - 1

        # Candidate merge boundaries: we must merge any interval that either
        # contains `lo` or starts before `hi`. Touching intervals merge too.
        # Walk leftwards while intervals overlap/touch [lo, hi).
        start = idx
        while start >= 0 and hi_list[start] >= lo and lo_list[start] < hi:
            # interval [lo_s, hi_s) intersects [lo, hi) or touches it
            if hi_list[start] < lo or lo_list[start] > hi:
                break
            start -= 1
        start += 1  # first interval to merge (inclusive)

        end = idx  # one-past-last interval to merge (exclusive)
        while end < n and lo_list[end] <= hi and hi_list[end] > lo:
            if lo_list[end] >= hi or hi_list[end] <= lo:
                break
            end += 1

        if start == end:
            # No overlap: insert a new interval between `start-1` and `start`.
            lo_list.insert(start, lo)
            hi_list.insert(start, hi)
            return

        new_lo = lo if lo < lo_list[start] else lo_list[start]
        new_hi = hi
        if hi_list[end - 1] > new_hi:
            new_hi = hi_list[end - 1]

        # Replace [start, end) with the merged interval.
        lo_list[start:end] = [new_lo]
        hi_list[start:end] = [new_hi]

    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi

        idx = bisect_right(lo_list, lo) - 1

        start = idx
        while start >= 0 and hi_list[start] > lo:
            start -= 1
        start += 1

        end = idx
        n = len(lo_list)
        while end < n and lo_list[end] < hi:
            end += 1

        if start >= end:
            return

        # Left partial cut: interval starting before lo.
        pieces_lo = []
        pieces_hi = []
        if lo_list[start] < lo:
            pieces_lo.append(lo_list[start])
            pieces_hi.append(lo)
        # Right partial cut: interval ending after hi.
        if hi_list[end - 1] > hi:
            pieces_lo.append(hi)
            pieces_hi.append(hi_list[end - 1])

        lo_list[start:end] = pieces_lo
        hi_list[start:end] = pieces_hi

    def contains(self, x) -> bool:
        lo_list, hi_list = self._lo, self._hi
        idx = bisect_right(lo_list, x) - 1
        return idx >= 0 and hi_list[idx] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self) -> List[Tuple]:
        return list(zip(self._lo, self._hi))

    def __len__(self) -> int:
        return len(self._lo)

    def __contains__(self, x) -> bool:
        return self.contains(x)
```