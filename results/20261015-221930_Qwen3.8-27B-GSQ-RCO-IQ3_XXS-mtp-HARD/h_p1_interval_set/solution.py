import bisect


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []
        self._los: list = []
        self._his: list = []
        self._total: float = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi)

        if left == right:
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._his.insert(left, hi)
            self._total += hi - lo
            return

        new_lo = lo
        if self._intervals[left][0] < new_lo:
            new_lo = self._intervals[left][0]
        new_hi = hi
        if self._intervals[right - 1][1] > new_hi:
            new_hi = self._intervals[right - 1][1]

        removed = sum(self._his[i] - self._los[i] for i in range(left, right))
        self._intervals[left:right] = [(new_lo, new_hi)]
        self._los[left:right] = [new_lo]
        self._his[left:right] = [new_hi]
        self._total += (new_hi - new_lo) - removed

    def remove(self, lo, hi):
        if lo >= hi:
            return
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi)

        if left == right:
            return

        new_segments = []
        for i in range(left, right):
            a, b = self._intervals[i]
            if a < lo:
                new_segments.append((a, lo))
            if b > hi:
                new_segments.append((hi, b))

        removed = sum(self._his[i] - self._los[i] for i in range(left, right))
        added = sum(b - a for a, b in new_segments)

        self._intervals[left:right] = new_segments
        self._los[left:right] = [a for a, _ in new_segments]
        self._his[left:right] = [b for _, b in new_segments]
        self._total += added - removed

    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
