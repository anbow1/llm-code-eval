from bisect import bisect_left, bisect_right


class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples, disjoint & non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        new_lo, new_hi = lo, hi

        # Locate insertion point: first interval with start >= lo
        pos = bisect_left(intervals, (lo,))

        # Check left neighbour for overlap/touching
        if pos > 0 and intervals[pos - 1][1] >= new_lo:
            new_lo = intervals[pos - 1][0]
            pos -= 1

        # Merge forward all intervals whose start <= new_hi
        end = pos
        while end < len(intervals) and intervals[end][0] <= new_hi:
            if intervals[end][1] > new_hi:
                new_hi = intervals[end][1]
            end += 1

        intervals[pos:end] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals

        pos = bisect_left(intervals, (lo,))
        # Include a left neighbour that actually overlaps (half-open: need strict >)
        if pos > 0 and intervals[pos - 1][1] > lo:
            pos -= 1

        end = pos
        while end < len(intervals) and intervals[end][0] < hi:
            end += 1

        # Rebuild the affected slice: keep only the parts outside [lo, hi)
        new_parts = []
        for j in range(pos, end):
            a, b = intervals[j]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))

        intervals[pos:end] = new_parts

    def contains(self, x):
        # O(log n): binary-search for the rightmost interval with start <= x
        intervals = self._intervals
        idx = bisect_right(intervals, (x, float('inf'))) - 1
        if idx < 0:
            return False
        return x < intervals[idx][1]

    def total_length(self):
        total = 0
        for lo, hi in self._intervals:
            total += hi - lo
        return total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
