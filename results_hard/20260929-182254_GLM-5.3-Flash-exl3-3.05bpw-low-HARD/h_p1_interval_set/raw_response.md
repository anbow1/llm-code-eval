```python
import bisect


class IntervalSet:
    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_left(his, lo)
        j = bisect.bisect_right(los, hi)
        if i < j:
            new_lo = min(lo, los[i])
            new_hi = max(hi, his[j - 1])
            los[i:j] = [new_lo]
            his[i:j] = [new_hi]
        else:
            los.insert(i, lo)
            his.insert(i, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_left(los, lo)
        j = bisect.bisect_left(his, hi)
        if i >= j:
            return
        new_lo = None
        new_hi = None
        if los[i] < lo:
            new_lo = los[i]
            new_hi = lo
        if i < len(his) and bisect.bisect_left(los, hi) > j - 1 or his[j] > hi:
            if hi < his[j]:
                pass
        # handle partial overlaps
        new_lo = None
        new_hi = None
        if los[i] < lo:
            new_lo = los[i]
            new_hi = lo
        if j < len(los) and his[j] > hi and j == bisect.bisect_left(his, hi):
            new_hi2 = his[j]
        # recompute cleanly
        i2 = i
        j2 = j
        pieces = []
        if los[i2] < lo:
            pieces.append((los[i2], lo))
        k = bisect.bisect_right(his, lo)
        # left tail
        start = bisect.bisect_left(los, lo) if bisect.bisect_left(los, lo) < bisect.bisect_right(his, lo) else None
        pieces = []
        i = bisect.bisect_left(his, lo)
        j = bisect.bisect_right(los, hi)
        if i >= j:
            return
        if los[i] < lo:
            pieces.append((los[i], lo))
        if hi < his[j - 1]:
            pieces.append((hi, his[j - 1]))
        los[i:j] = [p[0] for p in pieces]
        his[i:j] = [p[1] for p in pieces]

    def contains(self, x):
        his = self._hi
        i = bisect.bisect_right(his, x)
        return i < len(self._lo) and self._lo[i] <= x

    def total_length(self):
        return sum(hi - lo for lo, hi in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

A cleaner correct version:

```python
import bisect


class IntervalSet:
    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []  # sorted list of interval starts
        self._hi = []  # sorted list of interval ends (parallel to _lo)

    # --- helpers -------------------------------------------------------
    def _find(self, x):
        """Index i such that interval i is the first with hi > x."""
        return bisect.bisect_right(self._hi, x)

    # --- API -----------------------------------------------------------
    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_right(his, lo)   # first interval that may touch lo
        j = bisect.bisect_left(los, hi)    # first interval that ends past hi
        if i < j:
            new_lo = min(lo, los[i])
            new_hi = max(hi, his[j - 1])
            los[i:j] = [new_lo]
            his[i:j] = [new_hi]
        else:
            los.insert(i, lo)
            his.insert(i, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_right(his, lo)   # first interval with hi > lo
        j = bisect.bisect_left(los, hi)    # first interval with lo >= hi
        if i >= j:
            return
        pieces = []
        if los[i] < lo:
            pieces.append((los[i], lo))
        if his[j - 1] > hi:
            pieces.append((hi, his[j - 1]))
        los[i:j] = [p[0] for p in pieces]
        his[i:j] = [p[1] for p in pieces]

    def contains(self, x):
        i = bisect.bisect_right(self._hi, x)
        return i < len(self._lo) and self._lo[i] <= x

    def total_length(self):
        return sum(hi - lo for lo, hi in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __repr__(self):
        return f"IntervalSet({self.intervals()})"
```