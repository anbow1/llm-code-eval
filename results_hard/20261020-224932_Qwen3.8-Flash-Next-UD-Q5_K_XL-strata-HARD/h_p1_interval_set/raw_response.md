```python
import bisect


class IntervalSet:
    __slots__ = ('_ivs',)

    def __init__(self):
        self._ivs: list[tuple] = []  # sorted by lo, disjoint, non-touching

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        ivs = self._ivs
        # left boundary: first interval that touches/overlaps [lo, hi)
        pos = bisect.bisect_right(ivs, (lo, float('inf')))
        if pos > 0 and ivs[pos - 1][1] >= lo:
            start = pos - 1
        else:
            start = pos
        # right boundary: first interval with lo > hi (tuples with lo==hi are included)
        end = bisect.bisect_right(ivs, (hi, float('inf')))

        if start < end:
            new_lo = lo if lo < ivs[start][0] else ivs[start][0]
            new_hi = hi if hi > ivs[end - 1][1] else ivs[end - 1][1]
            ivs[start:end] = [(new_lo, new_hi)]
        else:
            ivs.insert(start, (lo, hi))

    def remove(self, lo, hi) -> None:
        if lo >= hi:
            return
        ivs = self._ivs
        # find intervals strictly overlapping [lo, hi): a < hi AND b > lo
        pos = bisect.bisect_right(ivs, (lo, float('inf')))
        if pos > 0 and ivs[pos - 1][1] > lo:
            start = pos - 1
        else:
            start = pos
        # first interval with lo >= hi (doesn't overlap since lo is not < hi)
        end = bisect.bisect_left(ivs, (hi,))

        if start >= end:
            return

        # build the surviving fragments
        replacement: list[tuple] = []
        if ivs[start][0] < lo:
            replacement.append((ivs[start][0], lo))
        if ivs[end - 1][1] > hi:
            replacement.append((hi, ivs[end - 1][1]))

        ivs[start:end] = replacement

    def contains(self, x) -> bool:
        ivs = self._ivs
        pos = bisect.bisect_right(ivs, (x, float('inf')))
        if pos == 0:
            return False
        return ivs[pos - 1][1] > x

    def total_length(self) -> float:
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self) -> list[tuple]:
        return list(self._ivs)

    def __len__(self) -> int:
        return len(self._ivs)
```