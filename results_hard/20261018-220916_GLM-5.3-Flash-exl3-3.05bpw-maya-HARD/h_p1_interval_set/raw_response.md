```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []      # sorted list of interval start points
        self._hi = []      # parallel list of interval end points
        self._total = 0    # cached total length

    # ------------------------------------------------------------------ #
    def add(self, lo, hi):
        """Add [lo, hi) to the set. Ignored if lo >= hi."""
        if lo >= hi:
            return
        # Intervals that overlap or touch [lo, hi):
        #   i = first index with self._hi[i] >= lo   (touching counts as merging)
        #   j = first index with self._lo[j] > hi
        i = bisect_left(self._hi, lo)
        j = bisect_right(self._lo, hi)

        if i == j:
            # No overlap: insert a new interval at position i.
            self._lo.insert(i, lo)
            self._hi.insert(i, hi)
            self._total += hi - lo
        else:
            # Merge intervals i .. j-1 together with [lo, hi).
            new_lo = lo if self._lo[i] >= lo else self._lo[i]
            new_hi = hi if self._hi[j - 1] <= hi else self._hi[j - 1]
            self._total += (new_hi - new_lo) - self._slice_length(i, j)
            self._lo[i:j] = [new_lo]
            self._hi[i:j] = [new_hi]

    # ------------------------------------------------------------------ #
    def remove(self, lo, hi):
        """Remove [lo, hi) from the set (may split intervals). Ignored if lo >= hi."""
        if lo >= hi:
            return
        # Intervals strictly overlapping [lo, hi):
        #   i = first index with self._hi[i] > lo   (an interval ending exactly
        #       at lo is untouched by the removal)
        #   j = first index with self._lo[j] >= hi  (an interval starting exactly
        #       at hi is untouched as well)
        i = bisect_right(self._hi, lo)
        j = bisect_left(self._lo, hi)

        if i >= j:
            return

        removed = self._slice_length(i, j)
        kept_lo = []
        kept_hi = []
        if self._lo[i] < lo:
            kept_lo.append(self._lo[i])
            kept_hi.append(lo)
        if self._hi[j - 1] > hi:
            kept_lo.append(hi)
            kept_hi.append(self._hi[j - 1])

        self._lo[i:j] = kept_lo
        self._hi[i:j] = kept_hi
        self._total -= removed - sum(kept_hi[k] - kept_lo[k] for k in range(len(kept_lo)))

    # ------------------------------------------------------------------ #
    def contains(self, x):
        """Return True if x is in the set. O(log n)."""
        i = bisect_right(self._hi, x)  # first interval with hi > x
        return i < len(self._lo) and self._lo[i] <= x

    # ------------------------------------------------------------------ #
    def total_length(self):
        """Sum of the lengths of all intervals."""
        return self._total

    # ------------------------------------------------------------------ #
    def intervals(self):
        """All intervals as sorted, disjoint, non-touching (lo, hi) tuples."""
        return list(zip(self._lo, self._hi))

    # ------------------------------------------------------------------ #
    def __len__(self):
        """Number of intervals currently stored."""
        return len(self._lo)

    # ------------------------------------------------------------------ #
    def _slice_length(self, i, j):
        """Total length of intervals self._lo[i:j] / self._hi[i:j]."""
        total = 0
        for k in range(i, j):
            total += self._hi[k] - self._lo[k]
        return total
```