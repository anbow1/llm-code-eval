```python
from bisect import bisect_left, bisect_right

_INF = float("inf")


class IntervalSet:
    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return

        los = self._lo
        his = self._hi
        n = len(los)

        pos = bisect_left(los, lo)
        start = pos
        end = pos
        old_len = 0

        if pos > 0 and his[pos - 1] >= lo:
            start = pos - 1
            if his[pos - 1] > hi:
                hi = his[pos - 1]
            lo = los[pos - 1]
            old_len += his[pos - 1] - los[pos - 1]

        while end < n and los[end] <= hi:
            if his[end] > hi:
                hi = his[end]
            old_len += his[end] - los[end]
            end += 1

        new_len = hi - lo

        if end == start:
            los.insert(start, lo)
            his.insert(start, hi)
        elif start + 1 == end:
            los[start] = lo
            his[start] = hi
        else:
            los[start:end] = [lo]
            his[start:end] = [hi]

        if old_len == _INF or new_len == _INF:
            self._total = self._sum_total()
        else:
            self._total += new_len - old_len

    def remove(self, lo, hi):
        if lo >= hi:
            return

        los = self._lo
        his = self._hi
        n = len(los)

        pos = bisect_left(los, lo)
        first = pos
        if pos > 0 and his[pos - 1] > lo:
            first = pos - 1

        end = first
        while end < n and los[end] < hi:
            end += 1

        if first == end:
            return

        new_lo = []
        new_hi = []
        old_len = 0
        new_len = 0

        for i in range(first, end):
            a = los[i]
            b = his[i]
            old_len += b - a

            if a < lo:
                new_lo.append(a)
                new_hi.append(lo)
                new_len += lo - a

            if b > hi:
                new_lo.append(hi)
                new_hi.append(b)
                new_len += b - hi

        los[first:end] = new_lo
        his[first:end] = new_hi

        if old_len == _INF or new_len == _INF:
            self._total = self._sum_total()
        else:
            self._total += new_len - old_len

    def contains(self, x):
        idx = bisect_right(self._lo, x)
        if idx == 0:
            return False
        return x < self._hi[idx - 1]

    def total_length(self):
        return self._total

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def _sum_total(self):
        total = 0
        for a, b in zip(self._lo, self._hi):
            total += b - a
        return total
```