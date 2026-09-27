```python
import bisect


class IntervalSet:
    __slots__ = ('_lo', '_hi', '_total')

    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return

        if not self._lo:
            self._lo.append(lo)
            self._hi.append(hi)
            self._total += hi - lo
            return

        # First interval with hi >= lo (bisect on sorted _hi)
        i_start = bisect.bisect_left(self._hi, lo)
        # Last interval with lo <= hi (bisect on sorted _lo)
        i_end = bisect.bisect_right(self._lo, hi) - 1

        if i_start > i_end:
            pos = bisect.bisect_right(self._lo, lo)
            self._lo.insert(pos, lo)
            self._hi.insert(pos, hi)
            self._total += hi - lo
        else:
            new_lo = lo if lo < self._lo[i_start] else self._lo[i_start]
            new_hi = hi if hi > self._hi[i_end] else self._hi[i_end]

            old_total = 0
            for i in range(i_start, i_end + 1):
                old_total += self._hi[i] - self._lo[i]

            self._total += (new_hi - new_lo) - old_total
            self._lo[i_start:i_end + 1] = [new_lo]
            self._hi[i_start:i_end + 1] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi or not self._lo:
            return

        # First interval with hi > lo
        i_start = bisect.bisect_right(self._hi, lo)
        # Last interval with lo < hi
        i_end = bisect.bisect_left(self._lo, hi) - 1

        if i_start > i_end:
            return

        new_los = []
        new_his = []
        old_total = 0
        for i in range(i_start, i_end + 1):
            a = self._lo[i]
            b = self._hi[i]
            old_total += b - a
            if a < lo:
                new_los.append(a)
                new_his.append(lo)
            if b > hi:
                new_los.append(hi)
                new_his.append(b)

        new_total = 0
        for i in range(len(new_los)):
            new_total += new_his[i] - new_los[i]

        self._total += new_total - old_total
        self._lo[i_start:i_end + 1] = new_los
        self._hi[i_start:i_end + 1] = new_his

    def contains(self, x):
        if not self._lo:
            return False
        i = bisect.bisect_right(self._lo, x) - 1
        if i < 0:
            return False
        return x < self._hi[i]

    def total_length(self):
        return self._total

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```