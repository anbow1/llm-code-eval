import bisect


class IntervalSet:
    __slots__ = ('_intervals',)

    def __init__(self):
        self._intervals: list[tuple] = []

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect.bisect_left(intervals, (lo,))

        # Merge with previous interval if touching or overlapping
        if pos > 0 and intervals[pos - 1][1] >= lo:
            pos -= 1
            lo = intervals[pos][0]
            hi = max(hi, intervals[pos][1])

        # Merge with subsequent overlapping/touching intervals
        end = pos + 1
        n = len(intervals)
        while end < n and intervals[end][0] <= hi:
            hi = max(hi, intervals[end][1])
            end += 1

        if end - pos == 1:
            intervals[pos] = (lo, hi)
        else:
            intervals[pos:end] = [(lo, hi)]

    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        intervals = self._intervals
        n = len(intervals)

        # Find first interval that could overlap [lo, hi)
        pos = bisect.bisect_left(intervals, (lo,))
        if pos > 0 and intervals[pos - 1][1] > lo:
            pos -= 1

        # Walk through overlapping intervals and build replacement pieces
        new_pieces: list[tuple] = []
        end = pos
        while end < n and intervals[end][0] < hi:
            ilo, ihi = intervals[end]
            if ilo < lo:
                new_pieces.append((ilo, lo))
            if ihi > hi:
                new_pieces.append((hi, ihi))
            end += 1

        if new_pieces:
            intervals[pos:end] = new_pieces
        else:
            del intervals[pos:end]

    def contains(self, x) -> bool:
        intervals = self._intervals
        pos = bisect.bisect_right(intervals, (x, float('inf')))
        if pos == 0:
            return False
        lo, hi = intervals[pos - 1]
        return lo <= x < hi

    def total_length(self) -> int | float:
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
