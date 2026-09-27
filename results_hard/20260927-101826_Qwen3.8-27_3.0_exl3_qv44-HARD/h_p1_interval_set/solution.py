import bisect


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        i = bisect.bisect_left(self._intervals, (lo, float("-inf")))
        new_lo = lo
        new_hi = hi
        start = i
        if i > 0:
            prev_lo, prev_hi = self._intervals[i - 1]
            if prev_hi >= lo:
                new_lo = min(new_lo, prev_lo)
                new_hi = max(new_hi, prev_hi)
                start = i - 1
        j = i
        while j < len(self._intervals) and self._intervals[j][0] <= new_hi:
            _, cur_hi = self._intervals[j]
            new_hi = max(new_hi, cur_hi)
            j += 1
        self._intervals[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        i = bisect.bisect_left(self._intervals, (lo, float("-inf")))
        start = i
        if i > 0 and self._intervals[i - 1][1] > lo:
            start = i - 1
        end = i
        while end < len(self._intervals) and self._intervals[end][0] < hi:
            end += 1
        remainders: list[tuple] = []
        for j in range(start, end):
            a, b = self._intervals[j]
            if a < lo:
                remainders.append((a, lo))
            if b > hi:
                remainders.append((hi, b))
        self._intervals[start:end] = remainders

    def contains(self, x) -> bool:
        i = bisect.bisect_right(self._intervals, (x, float("inf"))) - 1
        if i < 0:
            return False
        return x < self._intervals[i][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
