```python
from bisect import bisect_right, insort


class IntervalSet:
    def __init__(self):
        self._lo = []      # sorted list of interval left bounds
        self._hi = []      # parallel list of right bounds

    def add(self, lo, hi):
        if lo >= hi:
            return
        start = bisect_right(self._lo, lo) - 1
        if start >= 0 and self._hi[start] >= lo:
            pass
        else:
            start += 1
        end = start
        new_lo, new_hi = lo, hi
        n = len(self._lo)
        while end < n and self._lo[end] <= new_hi:
            if self._lo[end] < new_lo:
                new_lo = self._lo[end]
            if self._hi[end] > new_hi:
                new_hi = self._hi[end]
            end += 1
        self._lo[start:end] = [new_lo]
        self._hi[start:end] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        start = bisect_right(self._lo, lo) - 1
        if start >= 0 and self._hi[start] > lo:
            pass
        else:
            start += 1
        end = start
        n = len(self._lo)
        new_lo = None
        new_hi = None
        while end < n and self._lo[end] < hi:
            if new_lo is None and self._hi[end] > hi:
                new_lo, new_hi = hi, self._hi[end]
            end += 1
        pieces_lo = []
        pieces_hi = []
        if start > 0 or (start < n and self._hi[start] > lo):
            # truncate first affected interval partially below lo
            j = start
            while j < end:
                l, h = self._lo[j], self._hi[j]
                if l < lo:
                    pieces_lo.append(l)
                    pieces_hi.append(lo)
                if h > hi:
                    pieces_lo.append(hi)
                    pieces_hi.append(h)
                j += 1
            # intervals fully inside [lo, hi) are dropped
        else:
            j = start
            while j < end:
                l, h = self._lo[j], self._hi[j]
                if l < lo:
                    pieces_lo.append(l)
                    pieces_hi.append(lo)
                if h > hi:
                    pieces_lo.append(hi)
                    pieces_hi.append(h)
                j += 1
        self._lo[start:end] = pieces_lo
        self._hi[start:end] = pieces_hi

    def contains(self, x):
        idx = bisect_right(self._lo, x) - 1
        return idx >= 0 and x < self._hi[idx]

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Wait — the spec asked for no example usage; the code above is the solution, but note that `add`/`remove` splice `self._lo`/`self._hi` in parallel, so `bisect_right` on `_lo` stays valid, and `contains` is O(log n). Merging of touching intervals happens in `add` via the `<=` comparison in the merge loop. Removal never merges, which preserves disjointness.