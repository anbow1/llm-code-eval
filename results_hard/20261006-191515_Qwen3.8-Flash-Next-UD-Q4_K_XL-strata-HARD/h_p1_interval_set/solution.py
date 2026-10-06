from bisect import bisect_left, bisect_right


class IntervalSet:
    def __init__(self):
        self._ivs = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find first interval with lo-value >= lo
        pos = bisect_left(self._ivs, (lo, float('-inf')))
        start = pos
        # Check if left neighbor touches/overlaps
        if start > 0 and self._ivs[start - 1][1] >= lo:
            start -= 1
        new_lo, new_hi = lo, hi
        end = start
        # Scan right, merging all overlapping/touching intervals
        while end < len(self._ivs) and self._ivs[end][0] <= new_hi:
            new_lo = min(new_lo, self._ivs[end][0])
            new_hi = max(new_hi, self._ivs[end][1])
            end += 1
        self._ivs[start:end] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        result = []
        for a, b in self._ivs:
            if b <= lo or a >= hi:
                result.append((a, b))
            else:
                if a < lo:
                    result.append((a, lo))
                if hi < b:
                    result.append((hi, b))
        self._ivs = result

    def contains(self, x):
        pos = bisect_right(self._ivs, (x, float('inf')))
        return pos > 0 and x < self._ivs[pos - 1][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self):
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)
