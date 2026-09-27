import bisect


class IntervalSet:
    def __init__(self):
        self._los = []
        self._his = []

    def _find_range(self, lo, hi):
        """Return (left, right) indices of intervals overlapping or touching [lo, hi)."""
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi) - 1
        if left <= right:
            return left, right
        return None

    def add(self, lo, hi):
        if lo >= hi:
            return
        r = self._find_range(lo, hi)
        if r is None:
            idx = bisect.bisect_left(self._los, lo)
            self._los.insert(idx, lo)
            self._his.insert(idx, hi)
        else:
            left, right = r
            new_lo = lo if lo < self._los[left] else self._los[left]
            new_hi = hi if hi > self._his[right] else self._his[right]
            self._los[left:right + 1] = [new_lo]
            self._his[left:right + 1] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        r = self._find_range(lo, hi)
        if r is None:
            return
        left, right = r
        new_intervals = []
        if self._los[left] < lo:
            new_intervals.append((self._los[left], lo))
        if self._his[right] > hi:
            new_intervals.append((hi, self._his[right]))
        if new_intervals:
            self._los[left:right + 1] = [x[0] for x in new_intervals]
            self._his[left:right + 1] = [x[1] for x in new_intervals]
        else:
            del self._los[left:right + 1]
            del self._his[left:right + 1]

    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]

    def total_length(self):
        return sum(h - l for l, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)
