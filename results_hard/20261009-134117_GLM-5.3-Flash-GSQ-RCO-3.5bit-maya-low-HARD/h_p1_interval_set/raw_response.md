```python
from bisect import bisect_left


class IntervalSet:
    """Set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._lo = []  # sorted list of interval starts
        self._hi = []  # corresponding ends

    def add(self, lo, hi):
        if lo >= hi:
            return
        i = bisect_left(self._lo, lo)
        # merge with touching/overlapping predecessors
        if i > 0 and self._hi[i - 1] >= lo:
            i -= 1
            lo = self._lo[i]
            hi = max(hi, self._hi[i])
        # absorb successors that start <= hi
        j = i
        while j < len(self._lo) and self._lo[j] <= hi:
            hi = max(hi, self._hi[j])
            j += 1
        self._lo[i:j] = [lo]
        self._hi[i:j] = [hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        i = bisect_left(self._lo, lo)
        if i > 0 and self._hi[i - 1] > lo:
            i -= 1
        j = i
        # find last interval overlapping [lo, hi)
        while j < len(self._lo) and self._lo[j] < hi:
            j += 1
        # keep left overhang from interval i
        if i < j and self._lo[i] < lo:
            left = (self._lo[i], lo)
        else:
            left = None
        # keep right overhang from interval j-1
        if j > i and self._hi[j - 1] > hi:
            right = (hi, self._hi[j - 1])
        else:
            right = None
        replacement = [r for r in (left, right) if r]
        self._lo[i:j] = [r[0] for r in replacement]
        self._hi[i:j] = [r[1] for r in replacement]

    def contains(self, x):
        i = bisect_left(self._lo, x)
        if i < len(self._lo) and self._lo[i] == x:
            return True
        return i > 0 and self._hi[i - 1] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Note: `add` merges touching intervals (e.g. [1,3) + [3,5) → [1,5)), `remove` may split an interval in two, `contains` uses binary search on the sorted start list (O(log n)), and all stored values keep their original int/float type with no rounding.