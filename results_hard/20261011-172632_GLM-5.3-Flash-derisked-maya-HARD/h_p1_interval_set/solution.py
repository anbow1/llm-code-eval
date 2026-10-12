import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._los = []  # sorted list of interval lower bounds
        self._his = []  # corresponding upper bounds (parallel to _los)

    def _find_index(self, x):
        """Return index of the interval that could contain x.

        Result i satisfies: _los[i] <= x < _his[i] iff x is contained.
        If x is in a gap, no interval contains it.
        """
        los = self._los
        # Rightmost interval whose lo <= x.
        i = bisect.bisect_right(los, x) - 1
        return i

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        # Find range of intervals overlapping or touching [lo, hi).
        # An interval [a, b) merges with [lo, hi) iff a <= hi and b >= lo
        # (touching counts: [1,3) + [3,5) -> [1,5)).
        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] >= lo:
            pass  # overlaps or touches from the left
        else:
            start += 1

        end = bisect.bisect_right(los, hi)  # first interval with lo > hi
        # Check if interval at index `end` touches [lo, hi) from the right:
        # [end].lo == hi means touching, but bisect_right gives first lo > hi,
        # so no interval at `end` has lo == hi; intervals with lo == hi are
        # before `end`. They're already merged via `end` boundary? No:
        # an interval with lo == hi merges (touching at hi).
        # bisect_right(los, hi) points past any lo == hi, so include them:
        while end < len(los) and los[end] == hi:
            end += 1

        # Compute merged bounds.
        new_lo = lo
        if start < end and his[start - 1 + 0] if False else False:
            pass
        if start < end:
            new_lo = min(lo, los[start])
            new_hi = max(hi, his[end - 1])
        else:
            new_lo = lo
            new_hi = hi

        # Replace intervals[start:end] with the merged interval.
        los[start:end] = [new_lo]
        his[start:end] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] > lo:
            pass  # [start] overlaps [lo, hi)
        else:
            start += 1

        end = bisect.bisect_right(los, hi)  # first interval with lo >= hi... actually lo > hi-? first lo > all <= hi
        # intervals with lo <= hi may be partially cut; those with lo > hi untouched.
        # bisect_right(los, hi) gives first index with los[i] > hi. Correct.

        if start >= end:
            return

        # Left partial piece.
        pieces_lo = []
        pieces_hi = []
        if los[start] < lo:
            pieces_lo.append(los[start])
            pieces_hi.append(lo)
        # Right partial piece.
        j = end - 1
        if his[j] > hi:
            pieces_lo.append(hi)
            pieces_hi.append(his[j])

        # Replace intervals[start:end] with the leftover pieces.
        los[start:end] = pieces_lo
        his[start:end] = pieces_hi

    def contains(self, x):
        i = self._find_index(x)
        return i >= 0 and self._his[i] > x

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)
