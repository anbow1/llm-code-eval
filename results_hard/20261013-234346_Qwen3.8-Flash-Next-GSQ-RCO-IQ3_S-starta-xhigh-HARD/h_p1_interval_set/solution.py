from bisect import bisect_left as _bisect_left, bisect_right as _bisect_right

_NEG_INF = float("-inf")
_INF = float("inf")


class IntervalSet:
    __slots__ = ("_ivs", "_total")

    def __init__(self):
        self._ivs = []
        self._total = 0

    def add(self, lo, hi, _bl=_bisect_left, _ninf=_NEG_INF):
        if lo >= hi:
            return

        ivs = self._ivs
        add_lo, add_hi = lo, hi
        new_lo, new_hi = add_lo, add_hi

        i = _bl(ivs, (add_lo, _ninf))
        n = len(ivs)

        if i and ivs[i - 1][1] >= add_lo:
            i -= 1
            new_lo = ivs[i][0]

        j = i
        delta = add_hi - add_lo

        while j < n and ivs[j][0] <= new_hi:
            a, b = ivs[j]

            start = a if a > add_lo else add_lo
            end = b if b < add_hi else add_hi
            if end > start:
                delta -= end - start

            if b > new_hi:
                new_hi = b

            j += 1

        if delta < 0:
            delta = 0

        if j == i:
            ivs.insert(i, (add_lo, add_hi))
            self._total += delta
            return

        if j == i + 1 and ivs[i][0] == new_lo and ivs[i][1] == new_hi:
            return

        self._total += delta
        ivs[i:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi, _bl=_bisect_left, _ninf=_NEG_INF):
        if lo >= hi:
            return

        ivs = self._ivs
        n = len(ivs)

        i = _bl(ivs, (lo, _ninf))
        if i and ivs[i - 1][1] > lo:
            i -= 1

        j = i
        new_intervals = []
        removed = 0

        while j < n and ivs[j][0] < hi:
            a, b = ivs[j]

            start = a if a > lo else lo
            end = b if b < hi else hi
            if end > start:
                removed += end - start

            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))

            j += 1

        if j == i:
            return

        self._total -= removed
        ivs[i:j] = new_intervals

    def contains(self, x, _br=_bisect_right, _inf=_INF):
        ivs = self._ivs
        i = _br(ivs, (x, _inf)) - 1
        return i >= 0 and ivs[i][1] > x

    def total_length(self):
        return self._total

    def intervals(self):
        return self._ivs.copy()

    def __len__(self):
        return len(self._ivs)

    def __contains__(self, x):
        return self.contains(x)
