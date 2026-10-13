```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi).

    Invariants:
      - self._lo is sorted strictly increasing.
      - self._hi is sorted strictly increasing.
      - Consecutive intervals never touch: _hi[k] < _lo[k+1] for all k.
      - Each stored interval is non-empty: _lo[k] < _hi[k].
    """

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # First interval whose hi >= lo (touching/overlapping from the left).
        i = bisect_left(his, lo)
        # One past the last interval whose lo <= hi (touching/overlapping on the right).
        j = bisect_right(los, hi)
        if i >= j:
            # No overlap or touch: plain insertion at the sorted position.
            los.insert(i, lo)
            his.insert(i, hi)
        else:
            # Merge everything in [i, j) together with [lo, hi) into one interval.
            nlo = los[i] if los[i] < lo else lo
            nhi = his[j - 1] if his[j - 1] > hi else hi
            los[i:j] = [nlo]
            his[i:j] = [nhi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        # First interval whose hi > lo (strict: the point lo itself is not removed).
        i = bisect_right(his, lo)
        # First interval whose lo >= hi (strict on the right: hi is not removed).
        j = bisect_left(los, hi)
        if i >= j:
            return
        new_lo = []
        new_hi = []
        # Leftover piece of the first overlapping interval, if it starts before lo.
        if los[i] < lo:
            new_lo.append(los[i])
            new_hi.append(lo)
        # Leftover piece of the last overlapping interval, if it ends after hi.
        if his[j - 1] > hi:
            new_lo.append(hi)
            new_hi.append(his[j - 1])
        # Replace all overlapping intervals with the leftover pieces
        # (this may split one interval into two, or remove several entirely).
        los[i:j] = new_lo
        his[i:j] = new_hi

    def contains(self, x):
        # Candidate interval is the first one whose hi > x (half-open: hi == x excluded).
        i = bisect_right(self._hi, x)
        return i < len(self._lo) and self._lo[i] <= x

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __repr__(self):
        return f"IntervalSet({self.intervals()!r})"
```