```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi).  Intervals are kept sorted by their lower bound.
    """

    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []      # sorted list of interval lower bounds
        self._hi = []      # self._hi[k] is the upper bound of self._lo[k]
        self._total = 0    # sum of (hi - lo) over all intervals

    # ------------------------------------------------------------------ add

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(los, lo)
        nlo, nhi = lo, hi

        # Absorb a preceding interval that overlaps or touches at lo.
        if i and his[i - 1] >= lo:
            nlo = los[i - 1]
            i -= 1

        # Absorb all intervals whose start is <= hi (overlapping or touching).
        j = bisect_right(los, hi)          # first index with los[k] > hi
        if j > i:
            e = his[j - 1]
            nhi = e if e > hi else hi
            old = 0
            for k in range(i, j):
                old += his[k] - los[k]
            los[i:j] = [nlo]
            his[i:j] = [nhi]
            self._total += (nhi - nlo) - old
        else:
            # No interval to the right to absorb: plain insertion.
            los.insert(i, nlo)
            his.insert(i, nhi)
            self._total += nhi - nlo

    # --------------------------------------------------------------- remove

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(los, lo)           # first interval with lo >= lo
        j = bisect_left(los, hi)           # first interval with lo >= hi

        frags = []                          # surviving fragments, in order
        start = i

        # Interval that straddles lo from the left.
        if i and his[i - 1] > lo:
            start = i - 1
            frags.append((los[i - 1], lo))
            if his[i - 1] > hi:
                # This single interval spans the whole removed range.
                frags.append((hi, his[i - 1]))

        # Interval whose start lies inside [lo, hi) but which spills past hi.
        if j > i and his[j - 1] > hi:
            frags.append((hi, his[j - 1]))

        if start == j and not frags:
            return                          # nothing to remove

        old = 0
        for k in range(start, j):
            old += his[k] - los[k]
        new = 0
        for a, b in frags:
            new += b - a
        self._total += new - old

        los[start:j] = [a for a, _ in frags]
        his[start:j] = [b for _, b in frags]

    # ------------------------------------------------------------- queries

    def contains(self, x):
        los, his = self._lo, self._hi
        i = bisect_right(los, x) - 1        # last interval starting <= x
        return i >= 0 and his[i] > x

    def total_length(self):
        return self._total

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __bool__(self):
        return bool(self._lo)

    def __repr__(self):
        return f"IntervalSet({self.intervals()!r})"
```