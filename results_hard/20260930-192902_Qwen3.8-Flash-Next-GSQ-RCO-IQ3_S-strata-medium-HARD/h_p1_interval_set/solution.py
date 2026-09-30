from bisect import bisect_left, bisect_right


class IntervalSet:
    """
    Stores a set of disjoint half-open intervals [lo, hi).

    Internal representation:
        self._starts: sorted list of interval lower bounds
        self._ends:   corresponding upper bounds
    """

    __slots__ = ("_starts", "_ends")

    def __init__(self):
        self._starts = []
        self._ends = []

    def add(self, lo, hi):
        if lo >= hi:
            return

        starts = self._starts
        ends = self._ends

        # Find first interval whose start is >= lo.
        i = bisect_left(starts, lo)

        # The only interval before i that can touch/overlap is i - 1.
        if i > 0 and ends[i - 1] >= lo:
            i -= 1
            lo = starts[i]
            if ends[i] > hi:
                hi = ends[i]

        # Merge every following interval that touches or overlaps [lo, hi).
        j = i
        n = len(starts)
        while j < n and starts[j] <= hi:
            if ends[j] > hi:
                hi = ends[j]
            j += 1

        if i == j:
            starts.insert(i, lo)
            ends.insert(i, hi)
        else:
            starts[i:j] = [lo]
            ends[i:j] = [hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return

        starts = self._starts
        ends = self._ends

        if not starts:
            return

        # First possibly affected interval is either:
        # - an interval starting before lo whose end is > lo, or
        # - an interval starting in [lo, hi).
        i = bisect_left(starts, lo)
        if i > 0 and ends[i - 1] > lo:
            i -= 1

        # Intervals in [i, j) start before hi and therefore overlap [lo, hi).
        j = bisect_left(starts, hi, i)

        if i >= j:
            return

        new_starts = []
        new_ends = []

        # Keep a left remainder from the first affected interval, if any.
        first_lo = starts[i]
        if first_lo < lo:
            new_starts.append(first_lo)
            new_ends.append(lo)

        # Keep a right remainder from the last affected interval, if any.
        last_hi = ends[j - 1]
        if last_hi > hi:
            new_starts.append(hi)
            new_ends.append(last_hi)

        starts[i:j] = new_starts
        ends[i:j] = new_ends

    def contains(self, x):
        starts = self._starts
        if not starts:
            return False

        # Last interval whose lower bound is <= x.
        i = bisect_right(starts, x) - 1
        return i >= 0 and x < self._ends[i]

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._starts, self._ends))

    def intervals(self):
        result = []

        # Defensive merge pass. The internal lists should already be disjoint,
        # but this guarantees the documented contract.
        for lo, hi in zip(self._starts, self._ends):
            if hi <= lo:
                continue

            if result and lo <= result[-1][1]:
                if hi > result[-1][1]:
                    result[-1][1] = hi
            else:
                result.append([lo, hi])

        return [(lo, hi) for lo, hi in result]

    def __len__(self):
        return len(self._starts)
