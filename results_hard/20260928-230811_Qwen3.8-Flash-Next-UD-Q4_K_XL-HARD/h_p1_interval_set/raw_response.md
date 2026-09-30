```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ('_intervals',)

    def __init__(self):
        self._intervals = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        iv = self._intervals
        right = bisect_left(iv, (hi, float('-inf')))
        left = bisect_left(iv, (lo, float('-inf')))
        while left > 0 and iv[left - 1][1] >= lo:
            left -= 1
        new_lo = lo
        new_hi = hi
        for i in range(left, right):
            a, b = iv[i]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b
        iv[left:right] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        iv = self._intervals
        right = bisect_left(iv, (hi, float('-inf')))
        left = bisect_left(iv, (lo, float('-inf')))
        while left > 0 and iv[left - 1][1] > lo:
            left -= 1
        new_parts = []
        for i in range(left, right):
            a, b = iv[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        iv[left:right] = new_parts

    def contains(self, x):
        iv = self._intervals
        i = bisect_right(iv, (x, float('inf')))
        if i == 0:
            return False
        return iv[i - 1][0] <= x < iv[i - 1][1]

    def total_length(self):
        return sum(b - a for a, b in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```