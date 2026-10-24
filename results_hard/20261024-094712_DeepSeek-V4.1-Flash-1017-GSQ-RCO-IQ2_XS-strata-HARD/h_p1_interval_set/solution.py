from bisect import bisect_left, bisect_right
from operator import itemgetter

_START = itemgetter(0)
_END = itemgetter(1)


class IntervalSet:
    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals
        pos = bisect_left(intervals, lo, key=_START)

        start = pos
        if pos > 0 and intervals[pos - 1][1] >= lo:
            start = pos - 1

        end = bisect_right(intervals, hi, key=_START)

        if start < end:
            merged_lo = min(lo, intervals[start][0])
            merged_hi = max(hi, intervals[end - 1][1])

            old_len = sum(
                intervals[i][1] - intervals[i][0]
                for i in range(start, end)
            )

            intervals[start:end] = [(merged_lo, merged_hi)]
            self._total += (merged_hi - merged_lo) - old_len
        else:
            intervals.insert(start, (lo, hi))
            self._total += hi - lo

    def remove(self, lo, hi):
        if lo >= hi:
            return

        intervals = self._intervals

        first = bisect_right(intervals, lo, key=_END)
        last = bisect_left(intervals, hi, key=_START)

        if first >= last:
            return

        pieces = []
        old_len = 0

        for i in range(first, last):
            a, b = intervals[i]
            old_len += b - a

            if a < lo:
                pieces.append((a, lo))
            if b > hi:
                pieces.append((hi, b))

        pieces_len = sum(b - a for a, b in pieces)

        intervals[first:last] = pieces
        self._total += pieces_len - old_len

    def contains(self, x):
        intervals = self._intervals
        idx = bisect_right(intervals, x, key=_START) - 1

        if idx >= 0:
            lo, hi = intervals[idx]
            return lo <= x < hi

        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
