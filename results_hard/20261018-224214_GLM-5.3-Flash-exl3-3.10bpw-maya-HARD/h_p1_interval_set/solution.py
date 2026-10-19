from bisect import bisect_left, bisect_right


def _lo(iv):
    return iv[0]


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted, non-touching
    half-open intervals [lo, hi)."""

    __slots__ = ("_ivs",)

    def __init__(self):
        self._ivs = []  # sorted list of (lo, hi) tuples, disjoint and non-touching

    def add(self, lo, hi):
        """Add [lo, hi), merging with any overlapping or touching intervals."""
        if lo >= hi:
            return
        ivs = self._ivs
        if not ivs:
            ivs.append((lo, hi))
            return

        # Last interval whose lo <= lo.
        i = bisect_right(ivs, lo, key=_lo) - 1
        if i >= 0 and ivs[i][1] >= lo:
            start = i
            start_lo = ivs[i][0]  # ivs[i][0] <= lo here
        else:
            start = i + 1
            start_lo = lo

        # First interval whose lo >= hi.
        j = bisect_left(ivs, hi, key=_lo)

        # Absorb all intervals that overlap [lo, hi).
        if j > start:
            end = ivs[j - 1][1]
            if hi > end:
                end = hi
        else:
            end = hi

        # Merge with a touching interval on the right (keeps canonical form).
        while j < len(ivs) and ivs[j][0] == end:
            end = ivs[j][1]
            j += 1

        ivs[start:j] = [(start_lo, end)]

    def remove(self, lo, hi):
        """Remove [lo, hi), possibly splitting an interval in two."""
        if lo >= hi:
            return
        ivs = self._ivs
        if not ivs:
            return

        # Last interval whose lo <= lo.
        i = bisect_right(ivs, lo, key=_lo) - 1
        if i >= 0 and ivs[i][1] > lo:
            start = i
            pieces = []
            if ivs[i][0] < lo:
                pieces.append((ivs[i][0], lo))
        else:
            start = i + 1
            pieces = []

        # First interval whose lo >= hi.
        j = bisect_left(ivs, hi, key=_lo)

        # The last overlapping interval may extend past hi.
        if j - 1 >= 0 and ivs[j - 1][1] > hi:
            pieces.append((hi, ivs[j - 1][1]))
            # Re-merge with a touching interval on the right if one exists.
            if j < len(ivs) and ivs[j][0] == ivs[j - 1][1]:
                pieces[-1] = (pieces[-1][0], ivs[j][1])
                j += 1

        # Intervals start..j-1 were fully or partially consumed.
        ivs[start:j] = pieces

    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._ivs, x, key=_lo) - 1
        return i >= 0 and self._ivs[i][1] > x

    def total_length(self):
        """Total measure of the set."""
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self):
        """All intervals as (lo, hi) tuples, sorted, disjoint, touching merged."""
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)
