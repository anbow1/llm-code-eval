from bisect import bisect_left, bisect_right
from operator import itemgetter

_lo = itemgetter(0)
_hi = itemgetter(1)


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted half-open intervals [lo, hi)."""

    __slots__ = ("_ivs", "_total")

    def __init__(self):
        self._ivs = []   # sorted list of (lo, hi) tuples, disjoint, non-touching
        self._total = 0  # cached sum of interval lengths

    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval whose hi >= lo (touching or overlapping from the left).
        start = bisect_left(ivs, lo, key=_hi)
        # First interval whose lo > hi (touching intervals on the right are merged too).
        end = bisect_right(ivs, hi, key=_lo)
        old = 0
        if start < end:
            lo = min(lo, ivs[start][0])
            hi = max(hi, ivs[end - 1][1])
            old = sum(r[1] - r[0] for r in ivs[start:end])
        ivs[start:end] = [(lo, hi)]
        self._total += (hi - lo) - old

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split an interval). Ignored if lo >= hi."""
        if lo >= hi:
            return
        ivs = self._ivs
        # First interval whose lo > lo.
        i0 = bisect_right(ivs, lo, key=_lo)
        # First interval whose lo >= hi.
        i1 = bisect_left(ivs, hi, key=_lo)
        # An interval ending at index i0-1 may still straddle lo.
        if i0 > 0 and ivs[i0 - 1][1] > lo:
            left = i0 - 1
        else:
            left = i0
        pieces = []
        if left < i0:
            # Keep the prefix of the straddling interval below lo.
            pieces.append((ivs[left][0], lo))
        if i1 > left and ivs[i1 - 1][1] > hi:
            # Keep the suffix of the last affected interval above hi.
            pieces.append((hi, ivs[i1 - 1][1]))
        old = sum(r[1] - r[0] for r in ivs[left:i1])
        ivs[left:i1] = pieces
        self._total += sum(p[1] - p[0] for p in pieces) - old

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        ivs = self._ivs
        i = bisect_right(ivs, x, key=_lo)
        return i > 0 and ivs[i - 1][1] > x

    def total_length(self):
        """Sum of the lengths of all intervals."""
        return self._total

    def intervals(self):
        """All intervals as a sorted list of disjoint (lo, hi) tuples."""
        return [(r[0], r[1]) for r in self._ivs]

    def __len__(self):
        return len(self._ivs)

    def __contains__(self, x):
        return self.contains(x)
