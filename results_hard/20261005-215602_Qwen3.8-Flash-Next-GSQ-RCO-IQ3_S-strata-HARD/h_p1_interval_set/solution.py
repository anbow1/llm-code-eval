from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_starts", "_ends", "_total_cache")

    def __init__(self):
        self._starts = []
        self._ends = []
        self._total_cache = None

    def add(self, lo, hi):
        if not (lo < hi):
            return

        starts = self._starts
        ends = self._ends

        i = bisect_left(starts, lo)
        new_lo = lo
        new_hi = hi
        a = i

        # Merge with the previous interval if it touches or overlaps.
        if i > 0 and ends[i - 1] >= lo:
            a = i - 1
            new_lo = starts[a]
            if ends[a] > new_hi:
                new_hi = ends[a]

        # Merge with following intervals whose start is <= current right end.
        j = i
        n = len(starts)
        while j < n and starts[j] <= new_hi:
            if ends[j] > new_hi:
                new_hi = ends[j]
            j += 1

        if j == a:
            starts.insert(a, new_lo)
            ends.insert(a, new_hi)
        else:
            starts[a:j] = [new_lo]
            ends[a:j] = [new_hi]

        self._total_cache = None

    def remove(self, lo, hi):
        if not (lo < hi):
            return

        starts = self._starts
        ends = self._ends

        if not starts:
            return

        pos = bisect_left(starts, lo)
        a = pos

        # Include a previous interval only if it actually intersects [lo, hi).
        if a > 0 and ends[a - 1] > lo:
            a -= 1

        # Affected intervals have index in [a, b).
        b = bisect_left(starts, hi, a)

        repl_starts = []
        repl_ends = []

        # Handle an interval starting before lo.
        if a < pos:
            l = starts[a]
            r = ends[a]

            if l < lo:
                repl_starts.append(l)
                repl_ends.append(lo)

            if r > hi:
                repl_starts.append(hi)
                repl_ends.append(r)

        # Handle intervals starting inside [lo, hi).
        first = pos if a < pos else a
        if b > first:
            r = ends[b - 1]
            if r > hi:
                if repl_starts and repl_starts[-1] == hi:
                    if r > repl_ends[-1]:
                        repl_ends[-1] = r
                else:
                    repl_starts.append(hi)
                    repl_ends.append(r)

        if not repl_starts and a == b:
            return

        if repl_starts:
            starts[a:b] = repl_starts
            ends[a:b] = repl_ends
        else:
            del starts[a:b]
            del ends[a:b]

        self._total_cache = None

    def contains(self, x):
        starts = self._starts
        if not starts:
            return False

        i = bisect_right(starts, x) - 1
        return i >= 0 and x < self._ends[i]

    def total_length(self):
        cached = self._total_cache
        if cached is not None:
            return cached

        total = 0
        first = True
        cur_lo = cur_hi = None

        for lo, hi in zip(self._starts, self._ends):
            if first:
                cur_lo, cur_hi = lo, hi
                first = False
            elif lo > cur_hi:
                total += cur_hi - cur_lo
                cur_lo, cur_hi = lo, hi
            elif hi > cur_hi:
                cur_hi = hi

        if not first:
            total += cur_hi - cur_lo

        self._total_cache = total
        return total

    def intervals(self):
        result = []

        for lo, hi in zip(self._starts, self._ends):
            if result and lo <= result[-1][1]:
                if hi > result[-1][1]:
                    result[-1] = (result[-1][0], hi)
            else:
                result.append((lo, hi))

        return result

    def __len__(self):
        return len(self._starts)
