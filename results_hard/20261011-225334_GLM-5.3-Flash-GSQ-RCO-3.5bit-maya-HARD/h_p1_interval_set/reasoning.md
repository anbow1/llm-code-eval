Need bisect-based sorted list with O(n) insertion but 60k adds of disjoint intervals... insertions into a Python list are O(n) each, 60k * 60k/2 = 1.8e9 ops — too slow? Actually list.insert is memmove, fast in C. 60k insertions each moving ~30k pointers average = 1.8e9 pointer moves... that's maybe a few seconds. Hmm, memmove of 8-byte pointers: 60000 inserts, average shift 30000*8 = 240KB per insert, total 14.4 GB memory movement — that's roughly... memmove bandwidth ~10GB/s, so ~1.5-3 seconds. Risky but might be ok "well under 5 seconds"? Better to use a skip or sortedcontainers not available. Use bisect + list; probably acceptable. Alternative: use a sorted list and accept it.

Implement:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._lo = []  # parallel lists? or single list of [lo,hi] pairs
        self._starts = []
        self._ends = []
```

Keep list of intervals sorted by lo; maintain a parallel list of starts for bisect.

add: find insertion point. Use bisect on starts. Merge overlaps and touching.

Let me write with single list `self._ivs` of [lo, hi] lists, plus `self._starts`.

add(lo, hi):
- if lo >= hi: return
- i = bisect_right(starts, lo) - 1... need to check intervals that overlap. An interval j overlaps if j.start < hi and j.end > lo (half-open touching merges: [1,3)+[3,5) merge, so condition is j.start <= hi and j.end >= lo). Since disjoint and sorted: find first interval with end >= lo... careful with touching: end == lo means touching, merge.

Simpler: idx = bisect_left(starts, lo) - 1; but also interval at idx may have end >= lo (touch/overlap). Then iterate forward while starts[k] <= hi (touching allowed), collecting. Compute new_lo = min(lo, first.end), new_hi = max(hi, last.end). Replace slice.

Handle floating equality with touching — exact equality fine since "no rounding".

remove(lo, hi):
- if lo >= hi: return
- find first interval k with end > lo and start < hi... Actually removal: intervals fully inside [lo,hi) removed; partial splits.
- idx: find first interval with start >= ... iterate overlapping ones (start < hi and end > lo, no merging needed).
- For each overlapping interval: possibly truncate.

Implementation:

```python
i = bisect.bisect_right(self._starts, lo) - 1
if i >= 0 and self._ivs[i][1] < lo: i += 1
```
Hmm, use bisect_left on starts: find leftmost candidate = index of last interval with start <= lo; if its end <= lo (no touch? end == lo touches but removal of [lo,hi) with interval ending at lo: no overlap since half-open; interval [a, lo) is untouched). Overlap condition: start < hi and end > lo.

Leftmost candidate index: j = bisect_right(starts, lo) - 1? If ivs[j].end <= lo, no overlap, start from j+1. Actually intervals with start > lo but < hi also overlap — they're after j. And intervals with start >= hi don't overlap. So candidates: k from (j+1 if end<=lo else j... wait if end > lo then j overlaps) while starts[k] < hi.

For add with merging: touching allowed: overlap condition start <= hi and end >= lo.

Code:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    starts = self._starts
    j = bisect.bisect_right(starts, lo) - 1
    # check if interval j touches/overlaps [lo, hi)
    first = j + 1
    if j >= 0 and self._ivs[j][1] >= lo:
        first = j
    # find last interval overlapping: while start <= hi
    k = first
    n = len(starts)
    while k < n and starts[k] <= hi:
        k += 1
    # ivs[first..k-1] merge with [lo,hi)
    if k == first:
        # no overlaps; but check touching with predecessor already handled
        new_lo, new_hi = lo, hi
    else:
        new_lo = min(lo, self._ivs[first][0])
        new_hi = max(hi, self._ivs[k-1][1])
    self._ivs[first:k] = [[new_lo, new_hi]]
    self._starts[first:k] = [new_lo]
```

Wait touching with predecessor: if ivs[j].end == lo, that's touching — merge. Condition `>= lo` covers end==lo. Good. But touching with successor: interval after with start == hi — covered by `starts[k] <= hi`. Good.

But subtle: what if j >= 0 and ivs[j][1] >= lo but ivs[j][0] > lo? Can't happen since starts sorted, ivs[j][0] <= lo when j = bisect_right(starts, lo)-1. But if ivs[j][1] < lo, first = j+1 which is correct.

Hmm but there's an edge: what about an interval with start exactly lo? bisect_right(starts, lo)-1 gives that interval. Good.

But wait: what if ivs[j][1] >= lo but the interval doesn't touch because... it always touches or overlaps if end >= lo and start <= lo. Since intervals disjoint sorted, ivs[j][1] <= ivs[j+1][0] etc. Fine.

Edge: bisect_right returns 0 when lo < all starts → j = -1, first = 0. Fine.

remove:

```python
def remove(self, lo, hi):
    if lo >= hi: return
    starts = self._starts
    j = bisect.bisect_right(starts, lo) - 1
    first = j + 1
    if j >= 0 and self._ivs[j][1] > lo:
        first = j
    k = first
    n = len(starts)
    while k < n and starts[k] < hi:
        k += 1
    # overlapping intervals: first..k-1
    if first == k: return
    pieces = []
    f = self._ivs[first]
    if f[0] < lo:
        pieces.append([f[0], lo])
    l = self._ivs[k-1]
    if l[1] > hi:
        if k - 1 == first:
            # same interval; need piece [hi, l[1]] maybe combined
            pieces.append([hi, l[1]])
        else:
            pieces.append([hi, l[1]])
    # middle intervals removed
    self._ivs[first:k] = pieces
    self._starts[first:k] = [p[0] for p in pieces]
```

Careful: if first == k-1 and interval straddles: [f0, lo] and [hi, l1] both pieces — correct, splits into two. If f[0] < lo and l[1] > hi and first==k-1, two pieces. Good. If piece has f[0] >= lo... e.g., interval [5,10), remove [3,6): f[0]=5 < 6? lo=3, f[0]=5 >= lo? f[0]=5 > lo=3, so no left piece; hi=6, l[1]=10 > 6 → piece [6,10]. Correct. But what if f[0] < lo but interval is [2,5) and remove [3,4): left piece [2,3], right piece [4,5). k: starts[k] < 4 → next interval start >= 5? k-1 = first. Right piece [4,5). Correct.

Edge: piece with hi > l[1] impossible since l[1] > hi condition. Also need piece only when l[1] > hi, and left piece when f[0] < lo. But if f[0] < lo and l[1] > hi and first < k-1: multiple intervals; left piece from first interval, right from last. Fine.

Also careful: left piece when f[0] < lo — but what if f[0] < lo but also f[1] <= lo? Not overlapping, excluded by first selection (end > lo). Good.

contains(x): bisect_right(starts, x) - 1; check end > x.

```python
def contains(self, x):
    j = bisect.bisect_right(self._starts, x) - 1
    return j >= 0 and self._ivs[j][1] > x
```

total_length: sum(hi-lo).

intervals: return [(lo, hi) for ...].

__len__: len(self._starts).

Also `remove` needs to handle when first piece's start used for _starts: pieces' [0] elements are the starts. Fine.

One more edge in add: when merging, new_lo uses ivs[first][0] which is <= lo. new_hi uses ivs[k-1][1] which is >= ... ivs[k-1][1] > starts[k-1], and starts[k-1] <= hi. ivs[k-1][1] could be <= hi? If ivs[k-1] overlaps [lo,hi): end > lo. It's included because starts[k-1] <= hi. Its end could be < hi (contained). Then max(hi, end) = hi. Good.

Performance: the while loops scan merged intervals — for 60k disjoint adds in random order, each add's while loop is O(1) amortized (disjoint, no merging chains typically). The slice assignment is the main cost. Should be fine.

Actually wait — there's an issue with slice assignment shifting: `self._ivs[first:k] = [[new_lo, new_hi]]` — when no overlap, this inserts one element, shifting. 60k inserts, average shift 30k → 1.8e9 pointer moves via memmove... ~2-5 seconds? memmove is very fast, ~10+ GB/s; 60k*30k*8 bytes = 14.4GB / 1e10 = 1.4s for each of two lists → ~3s. Hmm, "well under 5 seconds" — cutting close. 

Alternative: could I use a different structure? Options: keep the sorted structure lazily? Or use a skip-list? Or... Could batch? The spec says 60k adds of small disjoint intervals in random order. Hmm.

Could use `array` module? Still same shifting. Could use a list of chunks? Complexity increases.

Actually list.insert of a single element: CPython uses memmove for pointers. Average shift 30000 pointers * 8 bytes = 240KB. 60000 * 240KB = 14.4 GB total. Modern memmove ~20-50 GB/s for L1-resident... data in L1/L2 since it's being touched constantly? The array is 480KB max, fits in L2/L3. memmove on cached data can be very fast, ~50 GB/s. So ~0.3s. Probably fine. Also two lists → double. Still likely under 1s.

Alternatively maintain a single list of pairs and bisect using a key... bisect on list of tuples compares tuples — fine, `bisect_right(self._ivs, [lo, inf])`... comparing [lo, inf] with tuples works. But float('inf') comparisons fine. Single list halves the shifting. But bisect with list comparison: `bisect_right(self._ivs, (lo, float('inf'))) - 1` — works with mixed list/tuple comparison. Then insertion one list. I'll keep two parallel lists for clarity but... two lists doubles memmove. Single list of [lo,hi] with bisect by tuple comparison is better. But then intervals() returns tuples — need to convert anyway.

Actually with single list, contains: j = bisect_right(self._ivs, (x, inf)) - 1; return j >= 0 and self._ivs[j][1] > x. Comparison of (x, inf) with [a, b]: tuple vs list comparison in Python compares elementwise? Comparing tuple to list: in CPython, list vs tuple comparison returns False for ==, but < between tuple and list? Actually `() < []` → False? Let me recall: tuple.__lt__ with non-tuple returns NotImplemented; list.__gt__... For `(1,2) < [1,3]`, Python does tuple < list → NotImplemented from tuple, then list compares with tuple reflected: list.__gt__(tuple)? list comparison with different type: list.__lt__ requires other be list? Actually CPython's list_richcompare handles any sequence? I think `(1,2) < [1,2]` raises TypeError? No — I believe it works: comparisons between list and tuple work element-wise since they're both sequences. Yes, `(1, 2) < [1, 3]` → True in CPython. Hmm, actually I recall `==` between tuple and list is False, but `<` works. Yes: `(1,2) < [1,2]` returns True. OK but to be safe, store intervals as tuples internally, and bisect with (lo, inf) tuple. Then intervals() returns list(self._ivs) — already tuples. But then in add I create new tuples. Fine.

Hmm, but mutating: slice assignment with tuples fine.

I'll go with single list of tuples.

Rewrite add:

```python
import bisect

class IntervalSet:
    __slots__ = ("_ivs",)

    def __init__(self):
        self._ivs = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        j = bisect.bisect_right(ivs, (lo, _INF)) - 1
        first = j + 1
        if j >= 0 and ivs[j][1] >= lo:
            first = j
        k = first
        n = len(ivs)
        while k < n and ivs[k][0] <= hi:
            k += 1
        if k > first:
            lo = min(lo, ivs[first][0])
            hi = max(hi, ivs[k-1][1])
        ivs[first:k] = ((lo, hi),)
```

Wait — bisect on tuples: (lo, inf) — need ivs entries comparable; tuples of numbers compare fine. But (lo, inf) vs (a, b): compares lo vs a; if equal, inf vs b. bisect_right places after any interval with start == lo? We want, for finding j = last interval with start <= lo. bisect_right(ivs, (lo, inf)) gives insertion after all entries <= (lo, inf), i.e., all with start < lo, and start == lo with second <= inf (all). So yes, j is last interval with start <= lo. Good.

Hmm but inf vs int comparisons fine.

remove:

```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        j = bisect.bisect_right(ivs, (lo, _INF)) - 1
        first = j + 1
        if j >= 0 and ivs[j][1] > lo:
            first = j
        k = first
        n = len(ivs)
        while k < n and ivs[k][0] < hi:
            k += 1
        if first == k:
            return
        pieces = []
        f = ivs[first]
        if f[0] < lo:
            pieces.append((f[0], lo))
        l = ivs[k-1]
        if l[1] > hi:
            pieces.append((hi, l[1]))
        ivs[first:k] = pieces
```

Wait bug: if first == k-1 (single interval straddling), f and l same. pieces has (f0, lo) and (hi, l1) — correct. If first < k-1, f is first, l is last. Correct.

But subtle bug: if f[0] < lo but the interval [f0, f1] with f1 > lo... pieces left part. If also l[1] > hi but first == k-1: both pieces. Good. But what if f[0] < lo is false (interval starts at or after lo)? Then only right piece if l[1] > hi; but l might be a later interval; if first == k-1 and f[0] >= lo and l[1] > hi: piece (hi, l[1]) — correct truncation.

But there's an issue: what if l[1] > hi but the interval l is not the one we think... k-1 is last with start < hi, its end could extend beyond hi. Correct.

Edge: piece left when f[0] < lo — but what if first interval's end is exactly... fine.

contains, total_length, intervals, __len__ as above.

_INF = float('inf').

One concern in add: after computing merged lo/hi, if there was an interval j with end >= lo, we included it, and new_lo = min including ivs[first][0] — but only when k > first. When k > first but no left-touch (first = j+1), ivs[first][0] might be > lo → min fine. When first = j (touched), ivs[first][0] <= lo, min gives it. Good.

Also in add, when k == first (no merge), we insert at position `first`. Is that correct sorted position? first = j+1 where j is last with start <= lo; if ivs[j][1] < lo then inserting at j+1 sorted. Yes. But wait: could there be an interval with start == lo at index j (start <= lo) that doesn't overlap? If ivs[j][0] == lo and ivs[j][1] < lo impossible. ivs[j][1] > ivs[j][0] = lo always (valid intervals). So if start == lo, end > lo, so it touches/overlaps → first = j. So k == first case has ivs[j][1] < lo strictly, insertion at j+1 correct.

intervals(): return list of tuples — internal are tuples already: `return list(self._ivs)` but requirement says list[tuple] — internal tuples fine, but they're the same objects; return copies? `[(a, b) for a, b in self._ivs]` to be safe.

total_length: `return sum(hi - lo for lo, hi in self._ivs)`.

len: len(self._ivs).

Done.