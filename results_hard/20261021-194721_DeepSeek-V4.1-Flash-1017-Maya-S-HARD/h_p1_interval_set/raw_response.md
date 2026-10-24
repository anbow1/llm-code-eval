```python
import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_intervals",)

    def __init__(self):
        # Sorted list of (lo, hi) tuples. Invariants:
        #   * los strictly increasing, his strictly increasing
        #   * every interval has lo < hi
        #   * intervals are disjoint AND non-touching
        #     (i.e. next_lo > prev_hi for consecutive intervals)
        self._intervals = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals

        # First index whose lo >= lo.
        i = bisect.bisect_left(a, (lo,))
        # Left neighbour may overlap or touch (its hi >= lo).
        start = i - 1 if (i > 0 and a[i - 1][1] >= lo) else i

        # First index whose lo >= hi; extend by 1 if it touches at hi.
        j = bisect.bisect_left(a, (hi,))
        if j < len(a) and a[j][0] == hi:
            j += 1

        if start >= j:
            a.insert(start, (lo, hi))
            return

        new_lo = lo if lo < a[start][0] else a[start][0]
        new_hi = hi if hi > a[j - 1][1] else a[j - 1][1]
        a[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals

        # First index whose hi > lo (the only interval that can contain lo).
        i = bisect.bisect_left(a, (lo,))
        if i > 0 and a[i - 1][1] > lo:
            i -= 1

        # First index whose lo >= hi (intervals before it overlap).
        j = bisect.bisect_left(a, (hi,))
        if i >= j:
            return

        pieces = []
        if a[i][0] < lo:
            pieces.append((a[i][0], lo))
        if a[j - 1][1] > hi:
            pieces.append((hi, a[j - 1][1]))
        a[i:j] = pieces

    def contains(self, x):
        a = self._intervals
        # First index whose lo >= x; candidate is the previous interval,
        # or the interval starting exactly at x.
        i = bisect.bisect_left(a, (x,))
        if i > 0 and a[i - 1][1] > x:
            return True
        return i < len(a) and a[i][0] == x

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)

    def __contains__(self, x):
        return self.contains(x)

    def __iter__(self):
        return iter(list(self._intervals))

    def __repr__(self):
        return "IntervalSet(%r)" % (self._intervals,)
```