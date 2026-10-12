```python
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
```

Wait — let me clean up a leftover artifact in `add` and double-check edge cases.

```python
import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._los = []  # sorted list of interval lower bounds
        self._his = []  # corresponding upper bounds (parallel to _los)

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        # An interval [a, b) merges with [lo, hi) iff a <= hi and b >= lo
        # (touching counts as merging: [1,3) + [3,5) -> [1,5)).

        # start: first interval that merges (b >= lo), i.e. last with b >= lo.
        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] >= lo:
            pass  # [start] overlaps or touches [lo, hi) from the left
        else:
            start += 1

        # end: first interval with lo > hi, but intervals with lo == hi
        # touch [lo, hi) and must merge too.
        end = bisect.bisect_right(los, hi)
        while end < len(los) and los[end] == hi:
            end += 1

        if start < end:
            new_lo = min(lo, los[start])
            new_hi = max(hi, his[end - 1])
        else:
            new_lo, new_hi = lo, hi

        los[start:end] = [new_lo]
        his[start:end] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        # start: first interval overlapping [lo, hi) (b > lo).
        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] > lo:
            pass
        else:
            start += 1

        # end: first interval with lo > hi (untouched).
        end = bisect.bisect_right(los, hi)

        if start >= end:
            return

        pieces_lo = []
        pieces_hi = []
        if los[start] < lo:
            pieces_lo.append(los[start])
            pieces_hi.append(lo)
        if his[end - 1] > hi:
            pieces_lo.append(hi)
            pieces_hi.append(his[end - 1])

        los[start:end] = pieces_lo
        his[start:end] = pieces_hi

    def contains(self, x):
        i = bisect.bisect_right(self._los, x) - 1
        return i >= 0 and self._his[i] > x

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)
```

Hmm, the `while end < len(los) and los[end] == hi` loop can run at most once since intervals are disjoint (no two intervals share the same lo). Actually since disjoint, at most one interval has lo == hi. So the while loop runs at most once — fine, and simpler as an `if`. Also note: `bisect_right(los, hi)` already places past all `lo <= hi`, so intervals with `lo == hi` are just before `end`; the check `los[end] == hi` catches them. But since los are strictly increasing, `los[end] == hi` can hold for at most one index. Correct.

One more check in `add`: when `start < end` but interval at `start` doesn't actually overlap? By construction, `start` is either the interval containing/touching from left (his[start] >= lo) or the first interval with los > lo. If start == end (no merging intervals), we just insert. If start < end, all intervals in [start, end) have lo <= hi and his >= lo... wait, intervals between start and end-1: they have lo <= hi (since end is first with lo > hi) and their lo >= lo (they come after the bisect point or... no). Hmm, actually intervals in (start, end) have lo > lo? Not necessarily — `start` was set to `bisect_right(los, lo) - 1` or +1. If we took the +1 branch, start is the first index with los[start] > lo. All intervals in [start, end) then have lo in (lo, hi]... and their hi > lo (since disjoint sorted: his[start] > los[start] > lo... actually his[start] > los[start] > lo, yes since lo < los[start]). And for the branch where start is the bisect result with his[start] >= lo: that interval has los[start] <= lo, his >= lo, so merges. Intervals after it in [start, end): their lo > los[start] but could be <= lo? No: bisect_right means all subsequent have los > lo. So all intervals in [start, end) merge with [lo, hi). Good. new_lo = min correct, new_hi = max of last hi and hi: last interval [start, end-1] has largest lo, and since disjoint sorted, largest hi. Correct.

`remove` when start points to interval with los[start] < lo < his[start]: partial left piece kept. When los[start] >= lo: fully or partially removed; right piece if his[end-1] > hi. Middle pieces: intervals strictly inside are fully removed. Correct.

Edge: `remove` where start interval has los[start] < lo but his[start] <= lo — can't happen since we required his[start] > lo in that branch.

Also `add` with hi touching next: covered by the los[end] == hi check. And add where new interval is adjacent to previous (his[start] == lo): covered by `his[start] >= lo`.

I'm confident. Final answer is the cleaned version.</think>```python
import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._los = []  # sorted list of interval lower bounds
        self._his = []  # corresponding upper bounds (parallel to _los)

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        # An interval [a, b) merges with [lo, hi) iff a <= hi and b >= lo
        # (touching counts as merging: [1,3) + [3,5) -> [1,5)).

        # start: candidate first merging interval (last one with lo <= lo).
        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] >= lo:
            pass  # [start] overlaps or touches [lo, hi) from the left
        else:
            start += 1

        # end: first interval with lo > hi, but intervals with lo == hi
        # touch [lo, hi) and must merge too.
        end = bisect.bisect_right(los, hi)
        if end < len(los) and los[end] == hi:
            end += 1

        if start < end:
            new_lo = min(lo, los[start])
            new_hi = max(hi, his[end - 1])
        else:
            new_lo, new_hi = lo, hi

        los[start:end] = [new_lo]
        his[start:end] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his

        # start: first interval overlapping [lo, hi) (its hi > lo).
        start = bisect.bisect_right(los, lo) - 1
        if start >= 0 and his[start] > lo:
            pass
        else:
            start += 1

        # end: first interval with lo > hi (completely untouched).
        end = bisect.bisect_right(los, hi)

        if start >= end:
            return

        pieces_lo = []
        pieces_hi = []
        if los[start] < lo:
            pieces_lo.append(los[start])
            pieces_hi.append(lo)
        if his[end - 1] > hi:
            pieces_lo.append(hi)
            pieces_hi.append(his[end - 1])

        los[start:end] = pieces_lo
        his[start:end] = pieces_hi

    def contains(self, x):
        i = bisect.bisect_right(self._los, x) - 1
        return i >= 0 and self._his[i] > x

    def total_length(self):
        return sum(h - lo for lo, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)

    def __contains__(self, x):
        return self.contains(x)
```