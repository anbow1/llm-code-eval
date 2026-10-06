import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi)."""

    __slots__ = ('_ivs', '_los')

    def __init__(self):
        # _ivs: list of [lo, hi], sorted by lo, disjoint, non-touching
        # _los: parallel list of lo values for fast bisect lookups
        self._ivs = []
        self._los = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los = self._los
        ivs = self._ivs

        # Merge condition: existing [a,b) touches/overlaps new [lo,hi)
        # iff a <= hi AND b >= lo (non-strict captures touching)

        # Left boundary: find if interval just left of insertion point touches
        pos = bisect.bisect_right(los, lo)
        start = pos
        if pos > 0 and ivs[pos - 1][1] >= lo:
            start = pos - 1

        # Right boundary: first index where a > hi  (all a <= hi included)
        end = bisect.bisect_right(los, hi)

        if start == end:
            ivs.insert(pos, [lo, hi])
            los.insert(pos, lo)
            return

        new_lo = min(lo, ivs[start][0])
        new_hi = max(hi, ivs[end - 1][1])

        ivs[start:end] = [[new_lo, new_hi]]
        los[start:end] = [new_lo]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los = self._los
        ivs = self._ivs

        # Overlap condition: a < hi AND b > lo (strict for half-open)

        # Right boundary: first index where a >= hi → those can't overlap
        right = bisect.bisect_left(los, hi)

        # Among a < lo (indices < pos), at most the last one can have b > lo
        pos = bisect.bisect_left(los, lo)
        left = pos
        if pos > 0 and ivs[pos - 1][1] > lo:
            left = pos - 1

        if left >= right:
            return

        # Build replacement intervals for the affected range
        new_ivs = []
        new_los = []
        for i in range(left, right):
            a, b = ivs[i][0], ivs[i][1]
            if a < lo:
                new_ivs.append([a, lo])
                new_los.append(a)
            if hi < b:
                new_ivs.append([hi, b])
                new_los.append(hi)

        ivs[left:right] = new_ivs
        los[left:right] = new_los

    def contains(self, x):
        if not self._los:
            return False
        pos = bisect.bisect_right(self._los, x)
        if pos == 0:
            return False
        return x < self._ivs[pos - 1][1]

    def total_length(self):
        total = 0
        for iv in self._ivs:
            total += iv[1] - iv[0]
        return total

    def intervals(self):
        return [(iv[0], iv[1]) for iv in self._ivs]

    def __len__(self):
        return len(self._ivs)
