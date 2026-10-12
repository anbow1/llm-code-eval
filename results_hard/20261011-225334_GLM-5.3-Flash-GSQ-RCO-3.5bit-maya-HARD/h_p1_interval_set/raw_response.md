```python
import bisect

_INF = float("inf")


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_ivs",)

    def __init__(self):
        # Sorted list of (lo, hi) tuples, pairwise disjoint, non-touching.
        self._ivs = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # j: last interval with start <= lo
        j = bisect.bisect_right(ivs, (lo, _INF)) - 1
        first = j + 1
        if j >= 0 and ivs[j][1] >= lo:  # touches or overlaps [lo, hi)
            first = j
        k = first
        n = len(ivs)
        while k < n and ivs[k][0] <= hi:  # touching intervals merge
            k += 1
        if k > first:
            lo = min(lo, ivs[first][0])
            hi = max(hi, ivs[k - 1][1])
        # Replace all merged intervals with the single merged one
        # (or insert at the correct sorted position if nothing was merged).
        ivs[first:k] = ((lo, hi),)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # j: last interval with start <= lo
        j = bisect.bisect_right(ivs, (lo, _INF)) - 1
        first = j + 1
        if j >= 0 and ivs[j][1] > lo:  # strictly overlaps [lo, hi)
            first = j
        k = first
        n = len(ivs)
        while k < n and ivs[k][0] < hi:
            k += 1
        if first == k:
            return
        pieces = []
        f = ivs[first]
        if f[0] < lo:
            pieces.append((f[0], lo))
        l = ivs[k - 1]
        if l[1] > hi:
            pieces.append((hi, l[1]))
        ivs[first:k] = pieces

    def contains(self, x):
        ivs = self._ivs
        j = bisect.bisect_right(ivs, (x, _INF)) - 1
        return j >= 0 and ivs[j][1] > x

    def total_length(self):
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self):
        return [(lo, hi) for lo, hi in self._ivs]

    def __len__(self):
        return len(self._ivs)
```