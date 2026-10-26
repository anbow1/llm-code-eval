from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_intervals", "_starts")

    def __init__(self):
        self._intervals = []
        self._starts = []

    def add(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        starts = self._starts
        n = len(intervals)

        i = bisect_left(starts, lo)
        start = i

        if i > 0 and intervals[i - 1][1] >= lo:
            start = i - 1

        new_lo = lo
        new_hi = hi

        j = start
        while j < n and intervals[j][0] <= new_hi:
            a, b = intervals[j]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b
            j += 1

        intervals[start:j] = [(new_lo, new_hi)]
        starts[start:j] = [new_lo]

    def remove(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        starts = self._starts

        if not intervals:
            return

        n = len(intervals)
        i = bisect_left(starts, lo)
        start = i

        if i > 0 and intervals[i - 1][1] > lo:
            start = i - 1

        j = start
        pieces = []

        while j < n and intervals[j][0] < hi and intervals[j][1] > lo:
            a, b = intervals[j]

            if a < lo:
                pieces.append((a, lo))

            if b > hi:
                pieces.append((hi, b))

            j += 1

        if j > start:
            intervals[start:j] = pieces
            starts[start:j] = [piece[0] for piece in pieces]

    def contains(self, x):
        i = bisect_right(self._starts, x) - 1
        return i >= 0 and x < self._intervals[i][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
