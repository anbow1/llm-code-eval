Classic interval set with sorted list, bisect. For 60,000 disjoint adds in random order: naive insert into a Python list is O(n) per insert → 60,000 * 30,000 average shifts... list insert shifts elements but it's fast memmove; 60k inserts each shifting ~30k tuples ≈ 1.8e9 element moves — actually memmove is fast, maybe ~1-2 seconds. Hmm, could be risky. Alternative: use bisect.insort and accept it. memmove of pointers: 30k pointers * 8 bytes = 240KB per insert, 60k inserts → 14 GB moved... that's ~2-3 s maybe. Risky but probably okay within 5 s. Better approach: since intervals are disjoint, we can use bisect on a separate list of los (parallel arrays), insert with insort. Or use a skip list / sortedcontainers — not allowed (stdlib only).

Alternative: keep intervals in a dict keyed by lo plus a sorted list of los. Still need sorted insertion.

Actually a common trick: bisect.insort on list of los, and maintain dict lo->hi. Insertion into list of 60k ints: same memmove cost. ~14 GB memory movement at ~10 GB/s → ~1.4s. Acceptable. Actually list insert of element shifts via memmove which is very fast (~20 GB/s), so ~0.7s. Fine.

But merging: when adding, need to merge with neighbors. With only los list and hi dict, merging means removing merged keys from dict — O(1) dict deletion, but list deletion of los is also memmove, fine.

Implementation:

```python
import bisect

class IntervalSet:
    __slots__ = ("_los", "_his")
    def __init__(self):
        self._los = []  # sorted list of lo values
        self._his = []  # parallel list of hi values
```

Parallel lists: deleting from both requires two memmoves; fine.

add(lo, hi):
- if lo >= hi: return
- i = bisect_left(_los, lo) — first interval with lo >= query lo... careful with touching: intervals [a,b) and [b,c) merge. Use bisect_left on los.

Find the range of existing intervals that overlap or touch [lo, hi). An interval [l, h) overlaps/touches if l <= hi and h >= lo (touching at endpoints counts: l == hi or h == lo).

Let i = bisect_left(_los, lo). Then interval at index i-1 may have h > lo? It touches if its hi >= lo (since half-open, [l,h) with h == lo touches [lo,hi) and merges). Actually merge condition: existing [l,h) and new [lo,hi) merge iff l <= hi and h >= lo. Since intervals are disjoint and sorted, if h < lo they're separate even if h == lo? h == lo means touching → should merge ([1,3)+[3,5)→[(1,5)]). So merge iff h >= lo and l <= hi.

Start: check index j0 = i-1 if i>0 and _his[i-1] >= lo → include. Then extend forward while k < len and _los[k] <= hi.

Compute new_lo = min(lo, first merged lo), new_hi = max(hi, last merged hi). Remove merged slice, insert new interval.

Handle case: no merge → insert at position i (or i-1 replaced).

remove(lo, hi):
- if lo >= hi: return
- Find overlapping intervals (strict overlap: l < hi and h > lo; touching doesn't matter).
- i = bisect_left(_los, lo). Check i-1: if _his[i-1] > lo → it overlaps partially; truncate its hi to lo. Then forward: while k < len and _los[k] < hi: intervals fully inside get removed; last one with hi > hi gets lo set to hi.

Implementation details for remove:
```
i = bisect_left(_los, lo)
# left partial
if i > 0 and _his[i-1] > lo:
    _his[i-1] = lo
    # if that interval also extends beyond hi? No—disjoint intervals: if _his[i-1] > lo, its lo < lo, and next intervals have lo >= lo. If _his[i-1] > hi, then interval [l, h) covers [lo,hi) entirely; we need to split: set _his[i-1] = lo and insert [hi, h) at i.
```

So:
```
if i > 0 and _his[i-1] > lo:
    old_hi = _his[i-1]
    _his[i-1] = lo
    if old_hi > hi:
        # split
        _los.insert(i, hi); _his.insert(i, old_hi)
        return
# now remove intervals fully covered: those with lo < hi... 
j = i
while j < len and _los[j] < hi:
    if _his[j] <= hi: j += 1
    else:
        _los[j] = hi  # partial right
        j += 1? Actually truncate lo to hi, done.
        break
del _los[i:j]; del _his[i:j]
```
Wait careful: interval with _los[j] < hi and _his[j] > hi → truncate to [hi, _his[j]) — replace lo with hi, keep it. So set _los[j] = hi and break (keep it in place, it stays sorted since hi > lo >= _los[j-1]... hmm need hi >= _los[j-1]? previous intervals removed, fine, hi > lo ≥ previous los). Then delete _los[i:j] where j is index of that interval exclusive... Let me restructure:

```
j = i
n = len(_los)
while j < n and _los[j] < hi:
    if _his[j] > hi:
        _los[j] = hi
        j += 1
        break
    j += 1
del _los[i:j]; del _his[i:j]
```
But if we set _los[j]=hi then j+=1 then del [i:j] removes it! Need to del [i:j-1]. Let me handle: if truncation happened, don't increment j.

```
j = i
while j < n and _los[j] < hi:
    if _his[j] > hi:
        _los[j] = hi
        break
    j += 1
del _los[i:j]
del _his[i:j]
```
Hmm but if break happens, interval j kept with lo=hi — but is position sorted? _los[j]=hi; previous kept element is _los[i-1] = original lo of left partial or before, < lo ≤ ... need _los[j-1] < hi. _los[j-1] < hi by loop condition (if j == i, _los[j-1] is the left partial's lo which is < lo < hi, or something < lo ≤ hi... actually _los[i-1] < lo? bisect_left gives first index with _los[i] >= lo, so _los[i-1] < lo < hi ✓). And next element _los[j+1] >= _los[j] old ≥ lo... need _los[j+1] >= hi: since intervals disjoint and sorted, _los[j+1] >= _his[j]_old > hi ✓. Good.

Edge: after left partial truncation with split insert, we returned already — but wait, if old_hi > hi we split and return; the intervals after also get covered? If _his[i-1] > hi, then since disjoint, next interval _los[i] >= old_hi > hi, so nothing else overlaps. ✓ Return correct.

But if left partial exists with old_hi <= hi, we continue to the loop. But then intervals starting at i: _los[i] >= lo? bisect_left gives _los[i] >= lo. Loop condition _los[j] < hi handles.

Hmm, one subtlety: left partial with _his[i-1] > lo — but what if _his[i-1] == lo? Then it's touching, no removal needed. Condition > lo correct for strict overlap.

Edge case: what about interval where _los[i-1] < lo but also covers... handled.

add implementation:

```
def add(self, lo, hi):
    if lo >= hi: return
    los, his = self._los, self._his
    i = bisect.bisect_left(los, lo)
    # left touching/overlap
    start = i
    if i > 0 and his[i-1] >= lo:
        start = i - 1
        lo = los[i-1]  # min
    end = i
    n = len(los)
    while end < n and los[end] <= hi:
        end += 1
    if end > start:
        hi = max(hi, his[end-1])
        del los[start:end]
        del his[start:end]
    los.insert(start, lo)
    his.insert(start, hi)
```

Wait: los[end-1] <= hi means touching → merge, so new_hi = his[end-1] if it extends beyond. max(hi, his[end-1]) — his[end-1] could be > hi ✓. But careful: if end-1 interval has los[end-1] <= hi but its hi < hi — max handles.

Also new lo: if left merge, lo = los[i-1] which is < original lo ✓.

contains(x): O(log n):
```
i = bisect.bisect_right(self._los, x) - 1
return i >= 0 and x < self._his[i]
```

total_length: sum(hi - lo).

intervals(): list(zip(los, his)).

__len__: len(self._los).

__init__ maybe accepts optional iterable? Not required. Just empty init.

Performance concern: 60k insort into lists — fine.

Also consider mixing: add with float/int mixing fine since comparisons work.

One more subtlety in add: bisect_left with lo equal to existing lo values — can't happen for disjoint existing intervals with different los unless... intervals disjoint, los unique. Fine.

Also `intervals()` should merge touching — our add already merges touching.

Should __init__ accept an iterable of intervals? Spec doesn't say. Keep simple, maybe accept optional pairs for convenience. I'll add optional iterable.

Write final code.