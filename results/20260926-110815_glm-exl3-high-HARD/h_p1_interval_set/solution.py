from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, sorted half-open intervals [lo, hi).

    Internally kept as two parallel lists (starts and ends) so that all
    lookups can use `bisect` on plain numeric lists.
    """

    __slots__ = ("_starts", "_ends")

    def __init__(self):
        self._starts = []  # sorted lower bounds
        self._ends = []    # sorted upper bounds, ends[i] > starts[i]

    # ------------------------------------------------------------------ #
    def add(self, lo, hi):
        """Add [lo, hi).  Intervals that overlap or touch are merged."""
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends

        # First interval whose end >= lo   (end == lo  ->  touching, merge)
        i = bisect_left(ends, lo)
        # First interval whose start > hi  (start == hi ->  touching, merge)
        j = bisect_right(starts, hi)

        if i == j:
            # No overlap/touch: plain insertion at position i.
            starts.insert(i, lo)
            ends.insert(i, hi)
            return

        # Merge everything in [i, j) together with [lo, hi).
        new_lo = lo if lo < starts[i] else starts[i]
        new_hi = hi if hi > ends[j - 1] else ends[j - 1]

        del starts[i:j]
        del ends[i:j]
        starts.insert(i, new_lo)
        ends.insert(i, new_hi)

    # ------------------------------------------------------------------ #
    def remove(self, lo, hi):
        """Remove [lo, hi).  May split an existing interval in two."""
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends

        # First interval that extends past lo (end > lo => overlaps/remnant).
        i = bisect_right(ends, lo)
        # First interval that starts at or beyond hi (unaffected).
        j = bisect_left(starts, hi)

        if i >= j:
            return  # nothing intersects [lo, hi)

        pieces = []
        # A leftover piece on the left: at most the first interval
        # in the range can start strictly before lo (disjointness).
        if starts[i] < lo:
            pieces.append((starts[i], lo))
        # A leftover piece on the right: at most the last interval
        # in the range can end strictly after hi.
        if ends[j - 1] > hi:
            pieces.append((hi, ends[j - 1]))

        del starts[i:j]
        del ends[i:j]
        for k, (a, b) in enumerate(pieces):
            starts.insert(i + k, a)
            ends.insert(i + k, b)

    # ------------------------------------------------------------------ #
    def contains(self, x):
        """Return True iff x is in the set.  O(log n)."""
        idx = bisect_right(self._starts, x) - 1
        return idx >= 0 and self._ends[idx] > x

    # ------------------------------------------------------------------ #
    def total_length(self):
        """Sum of all interval lengths."""
        return sum(b - a for a, b in zip(self._starts, self._ends))

    # ------------------------------------------------------------------ #
    def intervals(self):
        """All intervals as a sorted list of (lo, hi) tuples."""
        return list(zip(self._starts, self._ends))

    # ------------------------------------------------------------------ #
    def __len__(self):
        return len(self._starts)
