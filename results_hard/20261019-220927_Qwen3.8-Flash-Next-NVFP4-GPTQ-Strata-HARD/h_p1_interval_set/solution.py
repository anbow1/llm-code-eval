import bisect


class IntervalSet:
    def __init__(self):
        self._ivl = []  # sorted list of (lo, hi) tuples, disjoint and non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivl = self._ivl
        # Find all intervals that overlap or touch [lo, hi).
        # Touch/overlap condition: existing_lo <= hi AND existing_hi >= lo
        # Right bound: first interval with existing_lo > hi (excludes touching)
        right = bisect.bisect_right(ivl, (hi, float('inf')))
        # Left bound: scan left for first interval with existing_hi < lo
        left = right - 1
        while left >= 0 and ivl[left][1] >= lo:
            left -= 1
        left += 1

        if left < right:
            new_lo = min(lo, ivl[left][0])
            new_hi = max(hi, ivl[right - 1][1])
            ivl[left:right] = [(new_lo, new_hi)]
        else:
            ivl.insert(left, (lo, hi))

    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivl = self._ivl
        # Strict overlap: existing_lo < hi AND existing_hi > lo
        right = bisect.bisect_left(ivl, (hi, float('-inf')))
        left = right - 1
        while left >= 0 and ivl[left][1] > lo:
            left -= 1
        left += 1

        if left >= right:
            return

        new_parts = []
        for i in range(left, right):
            a, b = ivl[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        ivl[left:right] = new_parts

    def contains(self, x):
        ivl = self._ivl
        idx = bisect.bisect_right(ivl, (x, float('inf')))
        if idx == 0:
            return False
        lo, hi = ivl[idx - 1]
        return lo <= x < hi

    def total_length(self):
        return sum(hi - lo for lo, hi in self._ivl)

    def intervals(self):
        return list(self._ivl)

    def __len__(self):
        return len(self._ivl)
