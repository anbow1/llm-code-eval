```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi).

    Internal representation: a sorted list of boundary points `pts` with even
    length; the set is the union of [pts[0], pts[1]), [pts[2], pts[3]), ...
    Membership of x is decided by the parity of the number of boundaries <= x.
    add/remove run in O(n) worst case (fast memmove-based list edits) and
    contains() runs in O(log n).
    """

    __slots__ = ("_pts",)

    def __init__(self):
        self._pts = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        pts = self._pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j % 2 == 0:
                # hi is a start boundary: interval starting at hi merges with [lo, hi)
                del pts[i:j + 1]
                if i % 2 == 0:
                    pts.insert(i, lo)
            else:
                # hi is an end boundary: it remains the end of the merged interval
                del pts[i:j]
                if i % 2 == 0:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i % 2 == 0:
                pts.insert(i, lo)
                if j % 2 == 0:
                    pts.insert(i + 1, hi)
            elif j % 2 == 0:
                pts.insert(i, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        pts = self._pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j % 2 == 1:
                # hi is an end boundary: the interval ending at hi is cut short
                del pts[i:j + 1]
                if i % 2 == 1:
                    pts.insert(i, lo)
            else:
                # hi is a start boundary: interval starting at hi is untouched
                del pts[i:j]
                if i % 2 == 1:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i % 2 == 1:
                pts.insert(i, lo)
                if j % 2 == 1:
                    pts.insert(i + 1, hi)
            elif j % 2 == 1:
                pts.insert(i, hi)

    def contains(self, x):
        # x is in the set iff an odd number of boundaries are <= x.
        return bisect_right(self._pts, x) % 2 == 1

    __contains__ = contains

    def total_length(self):
        pts = self._pts
        s = 0
        for k in range(0, len(pts), 2):
            s += pts[k + 1] - pts[k]
        return s

    def intervals(self):
        pts = self._pts
        return [(pts[k], pts[k + 1]) for k in range(0, len(pts), 2)]

    def __len__(self):
        return len(self._pts) // 2
```