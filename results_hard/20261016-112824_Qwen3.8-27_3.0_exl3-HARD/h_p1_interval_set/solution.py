import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._intervals: list[tuple] = []  # sorted by lo, disjoint, non-touching

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        # Find the range of intervals that overlap or touch [lo, hi)
        # right_idx: first interval with lo > hi
        right_idx = bisect.bisect_right(self._intervals, (hi, float('inf')))
        # Go left while intervals overlap or touch (hi >= lo)
        left_idx = right_idx - 1
        while left_idx >= 0 and self._intervals[left_idx][1] >= lo:
            left_idx -= 1
        left_idx += 1

        # Merge all intervals in [left_idx, right_idx) with [lo, hi)
        new_lo = lo
        new_hi = hi
        for i in range(left_idx, right_idx):
            a, b = self._intervals[i]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b

        self._intervals[left_idx:right_idx] = [(new_lo, new_hi)]

    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        # Find the range of intervals that overlap [lo, hi)
        # right_idx: first interval with lo >= hi
        right_idx = bisect.bisect_left(self._intervals, (hi, float('-inf')))
        # Go left while intervals overlap (hi > lo)
        left_idx = right_idx - 1
        while left_idx >= 0 and self._intervals[left_idx][1] > lo:
            left_idx -= 1
        left_idx += 1

        if left_idx >= right_idx:
            return

        result = []
        a, b = self._intervals[left_idx]
        if a < lo:
            result.append((a, lo))

        a, b = self._intervals[right_idx - 1]
        if b > hi:
            result.append((hi, b))

        self._intervals[left_idx:right_idx] = result

    def contains(self, x) -> bool:
        # Find the last interval with lo <= x
        idx = bisect.bisect_right(self._intervals, (x, float('inf'))) - 1
        if idx >= 0:
            lo, hi = self._intervals[idx]
            return lo <= x < hi
        return False

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)
