```python
import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted half-open intervals [lo, hi)."""

    __slots__ = ("_starts", "_ends", "_total")

    def __init__(self):
        self._starts = []  # sorted list of interval starts
        self._ends = []    # corresponding ends; also sorted since intervals are disjoint
        self._total = 0    # cached sum of (hi - lo)

    def add(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        # Intervals that overlap or touch [lo, hi):
        #   end >= lo  (touching at lo via end == lo merges: [a,lo) + [lo,hi) -> [a,hi))
        lo_idx = bisect.bisect_left(ends, lo)
        #   start <= hi  (touching at hi via start == hi merges: [lo,hi) + [hi,b) -> [lo,b))
        hi_idx = bisect.bisect_right(starts, hi)

        if lo_idx >= hi_idx:
            # No overlap; possibly touch the right neighbour exactly at hi.
            if lo_idx < len(starts) and starts[lo_idx] == hi:
                starts[lo_idx] = lo
            else:
                starts.insert(lo_idx, lo)
                ends.insert(lo_idx, hi)
            self._total += hi - lo
            return

        # Merge all intervals in [lo_idx, hi_idx) together with [lo, hi).
        new_lo = starts[lo_idx] if starts[lo_idx] < lo else lo
        new_hi = ends[hi_idx - 1] if ends[hi_idx - 1] > hi else hi
        removed = 0
        for i in range(lo_idx, hi_idx):
            removed += ends[i] - starts[i]
        self._total += (hi - lo) - removed
        starts[lo_idx:hi_idx] = [new_lo]
        ends[lo_idx:hi_idx] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        # Intervals strictly overlapping (lo, hi)-crossing region:
        #   end > lo  (an interval ending exactly at lo is untouched)
        lo_idx = bisect.bisect_right(ends, lo)
        #   start < hi  (an interval starting exactly at hi is untouched)
        hi_idx = bisect.bisect_left(starts, hi)
        if lo_idx >= hi_idx:
            return

        removed = 0
        new_starts = []
        new_ends = []
        for i in range(lo_idx, hi_idx):
            s, e = starts[i], ends[i]
            removed += e - s
            if s < lo:
                new_starts.append(s)
                new_ends.append(lo)
            if e > hi:
                new_starts.append(hi)
                new_ends.append(e)
        self._total -= removed
        starts[lo_idx:hi_idx] = new_starts
        ends[lo_idx:hi_idx] = new_ends

    def contains(self, x):
        # Candidate interval is the last one with start <= x.
        i = bisect.bisect_right(self._starts, x) - 1
        return i >= 0 and self._ends[i] > x

    def total_length(self):
        return self._total

    def intervals(self):
        return list(zip(self._starts, self._ends))

    def __len__(self):
        return len(self._starts)
```