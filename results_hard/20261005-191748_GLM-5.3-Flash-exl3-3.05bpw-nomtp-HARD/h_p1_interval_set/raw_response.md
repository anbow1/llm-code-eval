```python
from bisect import bisect_left, bisect_right
from operator import itemgetter


_lo = itemgetter(0)


class IntervalSet:
    """A set of real numbers stored as disjoint, non-adjacent half-open
    intervals [lo, hi), kept in a list sorted by lo.

    Invariants:
      * self._ivs is sorted by lo.
      * Intervals are pairwise disjoint and non-touching
        (consecutive intervals satisfy prev_hi < next_lo, since
        touching intervals such as [1,3) and [3,5) are merged to [1,5)).
      * Every interval satisfies lo < hi.
    """

    __slots__ = ("_ivs",)

    def __init__(self, iterable=()):
        self._ivs = []
        for lo, hi in iterable:
            self.add(lo, hi)

    # ------------------------------------------------------------------ #
    # Modifying operations                                               #
    # ------------------------------------------------------------------ #

    def add(self, lo, hi):
        """Add the half-open interval [lo, hi).  No-op if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs

        # k: first interval whose lo >= lo.  Its predecessor may still
        # overlap/touch [lo, hi) from the left (predecessor's hi >= lo).
        k = bisect_left(ivs, lo, key=_lo)
        i = k - 1 if k and ivs[k - 1][1] >= lo else k

        # j: first interval whose lo > hi.  Every interval in [i, j)
        # overlaps or touches [lo, hi) and is absorbed into one interval.
        j = bisect_right(ivs, hi, key=_lo)

        if i < j:
            new = (min(lo, ivs[i][0]), max(hi, ivs[j - 1][1]))
        else:
            new = (lo, hi)
        ivs[i:j] = [new]

    def remove(self, lo, hi):
        """Remove the half-open interval [lo, hi).  No-op if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs

        # k: first interval whose lo >= lo.  Its predecessor may straddle
        # the left edge (predecessor's hi > lo) and must be truncated.
        k = bisect_left(ivs, lo, key=_lo)
        i = k
        pieces = []
        if k and ivs[k - 1][1] > lo:
            i = k - 1
            pieces.append((ivs[k - 1][0], lo))

        # j: first interval whose lo >= hi (intervals starting exactly at
        # hi are untouched, because hi is excluded from [lo, hi)).
        j = bisect_left(ivs, hi, key=_lo)
        if j > i and ivs[j - 1][1] > hi:
            pieces.append((hi, ivs[j - 1][1]))

        ivs[i:j] = pieces

    # ------------------------------------------------------------------ #
    # Query operations                                                   #
    # ------------------------------------------------------------------ #

    def contains(self, x):
        """Return True iff the point x belongs to the set.  O(log n)."""
        ivs = self._ivs
        idx = bisect_right(ivs, x, key=_lo) - 1
        return idx >= 0 and ivs[idx][1] > x

    __contains__ = contains

    def total_length(self):
        """Total length of all stored points (sum of interval lengths)."""
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self):
        """Return the intervals as a sorted list of disjoint (lo, hi) pairs."""
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)

    def __iter__(self):
        return iter(self._ivs)

    def __repr__(self):
        return f"IntervalSet({self._ivs!r})"
```