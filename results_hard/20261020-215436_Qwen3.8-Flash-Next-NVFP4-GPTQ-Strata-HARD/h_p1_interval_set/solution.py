import bisect


class IntervalSet:
    __slots__ = ('_ivs',)

    def __init__(self):
        self._ivs = []  # list of (lo, hi), sorted by lo, disjoint & merged

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # Right boundary (exclusive): first interval with lo > hi
        # bisect_right with (hi, inf) → includes intervals where lo == hi (touching)
        r = bisect.bisect_right(ivs, (hi, float('inf')))
        # Left boundary: first interval with hi >= lo (overlapping or touching)
        l = r
        while l > 0 and ivs[l - 1][1] >= lo:
            l -= 1
        if l < r:
            new_lo = min(lo, ivs[l][0])
            new_hi = max(hi, ivs[r - 1][1])
            ivs[l:r] = [(new_lo, new_hi)]
        else:
            ivs.insert(r, (lo, hi))

    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # Right boundary (exclusive): first interval with lo >= hi (strictly no overlap)
        r = bisect.bisect_left(ivs, (hi,))
        # Left boundary: first interval with hi > lo (strict overlap, not touching)
        l = r
        while l > 0 and ivs[l - 1][1] > lo:
            l -= 1
        if l >= r:
            return
        replacement = []
        for i in range(l, r):
            a, b = ivs[i]
            if a < lo:
                replacement.append((a, lo))
            if b > hi:
                replacement.append((hi, b))
        ivs[l:r] = replacement

    def contains(self, x):
        ivs = self._ivs
        if not ivs:
            return False
        # Find last interval whose lo <= x
        pos = bisect.bisect_right(ivs, (x, float('inf')))
        if pos > 0:
            return x < ivs[pos - 1][1]
        return False

    def total_length(self):
        total = 0
        for lo, hi in self._ivs:
            total += hi - lo
        return total

    def intervals(self):
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)
