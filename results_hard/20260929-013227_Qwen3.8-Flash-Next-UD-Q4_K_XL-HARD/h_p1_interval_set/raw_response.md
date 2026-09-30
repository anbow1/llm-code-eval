```python
import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi)."""

    __slots__ = ('_iv',)

    def __init__(self):
        self._iv = []  # sorted list of (lo, hi) tuples, disjoint, non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        iv = self._iv

        # Find first interval that could touch/overlap: needs hi_existing >= lo
        start = bisect.bisect_left(iv, (lo, float('-inf')))
        if start > 0 and iv[start - 1][1] >= lo:
            start -= 1

        # Find first interval strictly after: lo_existing > hi
        end = bisect.bisect_right(iv, (hi, float('inf')))

        # Compute merged bounds
        new_lo = lo
        new_hi = hi
        for i in range(start, end):
            a, b = iv[i]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b

        iv[start:end] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        iv = self._iv

        # First interval with hi_existing > lo (extends past lo)
        start = bisect.bisect_left(iv, (lo, float('-inf')))
        if start > 0 and iv[start - 1][1] > lo:
            start -= 1

        # First interval with lo_existing >= hi (starts at or after hi)
        end = bisect.bisect_left(iv, (hi, float('-inf')))

        if start == end:
            return

        # Build replacement intervals (right-to-left logic not needed;
        # we collect left parts and right parts for the affected range)
        replacements = []
        for i in range(start, end):
            a, b = iv[i]
            if a < lo:
                replacements.append((a, lo))
            if b > hi:
                replacements.append((hi, b))

        iv[start:end] = replacements

    def contains(self, x):
        iv = self._iv
        idx = bisect.bisect_right(iv, (x, float('inf')))
        if idx == 0:
            return False
        _, hi = iv[idx - 1]
        return x < hi

    def total_length(self):
        total = 0
        for lo, hi in self._iv:
            total += hi - lo
        return total

    def intervals(self):
        return list(self._iv)

    def __len__(self):
        return len(self._iv)

    def __contains__(self, x):
        return self.contains(x)
```