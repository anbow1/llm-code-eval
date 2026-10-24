```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, half-open intervals [lo, hi)."""

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        # Parallel sorted lists: self._lo[i] / self._hi[i] form interval i.
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        s, e = self._lo, self._hi
        i = bisect_left(s, lo)
        start = i
        if i > 0 and e[i - 1] >= lo:
            # Previous interval overlaps or touches [lo, hi) -> merge it.
            start = i - 1
            lo = s[i - 1]
        j = bisect_right(s, hi)
        if j > start and e[j - 1] > hi:
            # Last merged interval extends beyond hi.
            hi = e[j - 1]
        s[start:j] = [lo]
        e[start:j] = [hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        s, e = self._lo, self._hi
        i = bisect_left(s, lo)   # first interval with start >= lo
        k = bisect_left(s, hi)   # first interval with start >= hi
        start = i
        pieces_lo = []
        pieces_hi = []
        if i > 0 and e[i - 1] > lo:
            # Left neighbour is cut by lo.
            start = i - 1
            pieces_lo.append(s[i - 1])
            pieces_hi.append(lo)
            if e[i - 1] > hi:
                # It also survives past hi -> split in two.
                pieces_lo.append(hi)
                pieces_hi.append(e[i - 1])
        if k > i:
            # Intervals i..k-1 are covered; only the last can stick out past hi.
            if e[k - 1] > hi:
                pieces_lo.append(hi)
                pieces_hi.append(e[k - 1])
        s[start:k] = pieces_lo
        e[start:k] = pieces_hi

    def contains(self, x):
        s, e = self._lo, self._hi
        i = bisect_right(s, x) - 1
        return i >= 0 and e[i] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```