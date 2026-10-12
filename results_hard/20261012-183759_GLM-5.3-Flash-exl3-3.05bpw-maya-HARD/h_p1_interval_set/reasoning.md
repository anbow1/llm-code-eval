Classic interval set with sorted list of disjoint intervals. Use bisect on a list of lo values, maintain parallel list of (lo, hi). For add: find overlapping intervals and merge. For remove: split.

Implementation: store intervals in a list `self._ivs` sorted by lo, plus `self._los` list of lo values for bisect.

add(lo, hi):
- if lo >= hi: return
- Find first interval that could overlap: interval with hi > lo? Since intervals are half-open and touching merges, we need to merge touching ones. Find all intervals i where iv.lo < hi and iv.hi > lo... but merging touching: [1,3) and [3,5) should merge. So overlap condition: iv.lo <= hi and iv.hi >= lo. Since half-open, if iv.hi == lo (interval ends where new begins) they touch -> merge. If iv.lo == hi, new ends where interval begins -> merge.

Use bisect to find range. Since los are sorted, use bisect on los: find leftmost interval index where lo can extend. We need start index: the first interval with hi >= lo. Since intervals are disjoint and non-touching after merge (hi < next.lo), we have sorted los. Use bisect_right on los with value lo? Let's think.

Maintain invariant: for consecutive intervals, prev.hi < next.lo (strictly, since touching merged).

To add [lo,hi):
- idx_left = index of first interval with iv.hi >= lo. Hmm, can't bisect on his directly unless we keep them. Alternatively bisect on los: intervals before insertion point... Simpler: keep list of tuples and do linear scan? No — 60,000 adds, each could touch few intervals, but scan could be O(n). Actually random small disjoint intervals in random order: each add overlaps at most a couple intervals typically, but finding them requires search. bisect on los:

Let i = bisect_right(los, lo) — intervals with lo <= lo_value at indices < i. The interval at i-1 might have hi > lo (overlap or touch). Check: if i > 0 and ivs[i-1].hi >= lo: start = i-1 else start = i.

Wait, touching: iv.hi == lo means they touch and merge. So condition ivs[i-1].hi >= lo → include.

Then end: first interval with lo > hi. j = bisect_right(los, hi)? Intervals with lo <= hi at indices < j. But interval with lo == hi touches, merge. So extend: while j < n and ivs[j].lo == hi: include? Actually bisect_right(los, hi) gives first index with lo > hi. Intervals with lo == hi are included in indices < j, and they touch → merge. Good.

So overlapping/touching range is [start, j). New merged interval: new_lo = min(lo, ivs[start].lo if start < j else lo), new_hi = max(hi, ivs[j-1].hi if j > start else hi). But careful: if start == i-1 case, ivs[start].lo could be < lo. And ivs[j-1].hi could be > hi.

Then replace ivs[start:j] with [(new_lo, new_hi)], update los similarly.

remove(lo, hi):
- if lo >= hi: return
- i = bisect_right(los, lo). If i>0 and ivs[i-1].hi > lo: start = i-1 else start = i. (Strict >, since touching means interval ends at lo — the part [lo, iv.hi) is empty, no removal needed; ivs[i-1].hi == lo contributes nothing.)
- j = first index with lo >= hi: bisect_left(los, hi). Intervals with lo < hi at indices < j may be partially removed.

Process: keep left remainder of ivs[start] if ivs[start].lo < lo: (ivs[start].lo, lo). Keep right remainder of last overlapping interval if its hi > hi: (hi, ivs[j-1].hi).

Actually handle: 
- left_piece = (ivs[start].lo, lo) if start < j and ivs[start].lo < lo
- right_piece = (hi, ivs[j-1].hi) if j > start and ivs[j-1].hi > hi... wait but if start == j-1, both pieces from same interval, fine.

But careful: right_piece condition should use the last interval in range [start, j): ivs[j-1]. Its hi > hi → keep (hi, ivs[j-1].hi). But also need ivs[j-1].hi > hi implies it extends beyond. Also if start == j-1 and ivs[start].lo < lo and hi < ivs[start].hi, both pieces — correct split.

Hmm edge: what if j-1 interval has lo >= hi? No, j = bisect_left(los, hi) means los[j-1] < hi for j>start... wait bisect_left returns first index where los[idx] >= hi. So indices < j have los < hi. Good.

But also need start < j check: if i (computed) > j? start could be i-1 where i-1 >= j? i = bisect_right(los, lo) ≤ ... hmm, los[i-1] <= lo < hi, and j = bisect_left(los, hi) — since los[i-1] <= lo < hi, i-1 < j. So start < j always. Good.

Replacement: new = []; if left_piece: append; if right_piece: append. Replace ivs[start:j] with new, update los.

contains(x): i = bisect_right(los, x); return i > 0 and ivs[i-1].hi > x.

total_length: maintain running sum or compute on demand. Compute incrementally: track self._total; update in add/remove. Simpler: sum on call — but could be O(n) per call; fine, but better maintain. I'll maintain incrementally.

intervals(): return list of tuples (copy). Should it return copies? Return list(map(tuple-ish)) — they're already tuples; return list(self._ivs) — but mutable internal? Return a shallow copy list.

__len__: len(self._ivs).

Performance: list insert/delete is O(n) per op — 60,000 adds → O(n²) = 60k * 30k avg = 1.8e9? That's too slow! Hmm. Actually list.pop/insert memmove is fast in C: 60000 inserts each moving ~30k pointers = 1.8e9 pointer moves ≈ maybe 2-4 seconds... risky. "well under 5 seconds". Hmm.

Alternative: use a different structure. But typical solutions accept this. Let's estimate better: memmove of 240KB (30k * 8 bytes) per op, 60k ops → 14.4 GB moved. Memory bandwidth ~10-20 GB/s → ~1-1.5 seconds. Plus bisect overhead. Probably ok, ~2s total for two lists. "Well under 5 seconds" — borderline but likely fine. Actually random small disjoint intervals in random order: average insert position is middle, so ~30k shift average. Two lists → double. Hmm, ~3s? Risky.

Alternative: use `sortedcontainers`? Not stdlib. Could store intervals in a single list and use bisect with key... Python 3.11 doesn't have bisect key (3.10 added key param actually — bisect supports key since 3.10). Still same list shifting.

Better: use a Skip list or a balanced BST? Complex. Alternatively use a "SortedList"-like bucket approach? Overkill.

Alternative trick: collect all intervals, but adds must reflect removals... Since only add calls (and contains), we could batch? No, must be general.

Hmm, actually could use a different representation: keep two parallel lists. Instead, keep one list of tuples and bisect with key=lambda iv: iv[0] (key extraction on each bisect is O(log n) key calls — fine). One list instead of two halves the memmove. bisect with key: bisect_right(self._ivs, lo, key=lambda iv: iv[0]). That's clean.

Estimated: 60k ops * ~15k elements avg shift * 8 bytes * (insert + occasionally delete) ≈ 60k * 15k * 8 = 7.2 GB per list op... hmm with tuples list, insert moves pointers only. 7.2 GB ≈ 0.5-1s. Fine.

Actually average position: intervals added in random order, sizes small — the position in sorted order of the k-th added interval is uniform-ish random among k positions, so average shift ~ k/2, total sum k/2 for k=1..60000 ≈ 9e8 pointer moves * 8 bytes = 7.2GB. ~1s. OK.

Also could micro-optimize using list slicing assignment.

Let me write it:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_ivs", "_total")

    def __init__(self):
        self._ivs = []  # sorted list of (lo, hi) tuples, disjoint & non-touching
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        i = bisect_right(ivs, lo, key=lambda iv: iv[0])
        start = i - 1 if i > 0 and ivs[i-1][1] >= lo else i
        j = bisect_right(ivs, hi, key=lambda iv: iv[0])
        # intervals [start, j) overlap or touch [lo, hi)
        if start < j:
            new_lo = min(lo, ivs[start][0])
            new_hi = max(hi, ivs[j-1][1])
        else:
            new_lo, new_hi = lo, hi
        removed = sum(h - l for l, h in ivs[start:j])
        self._total += (new_hi - new_lo) - removed
        ivs[start:j] = [(new_lo, new_hi)]
```

Wait check j: bisect_right(ivs, hi, key) gives first index where iv[0] > hi. Intervals with lo == hi touch → merge, included. Good. But wait — also intervals with lo > hi excluded, correct since [hi, ...) doesn't overlap [lo,hi). But careful: an interval with lo == hi? Our invariant says non-touching: ivs[k][1] < ivs[k+1][0]. lo == hi means ivs[k][1]... no, iv.lo == hi is possible: interval [hi, x). Touching [lo,hi) at point hi — for half-open sets union [lo,hi)∪[hi,x) = [lo,x), merged. So including iv with lo == hi in merge is correct: new_hi = max(hi, iv.hi) = iv.hi if iv.hi > hi. Good.

Edge: after merging touching chain, e.g., existing [1,3), add [3,5): i = bisect_right(los,3) → los=[1], lo=3: bisect_right gives 1. start: ivs[0][1]=3 >= 3 → start=0. j = bisect_right with hi=5: 1. merge → (1,5). ✓.

Edge: add [0,1) then [1,2): i for lo=1: los=[0] → bisect_right=1. ivs[0][1]=1>=1 → start=0. j = bisect_right(hi=2)=1 → merge (0,2). ✓.

Edge: add [2,3) existing [0,1): i=bisect_right(1... lo=2): ivs[0][0]=0<=2 → i=1. ivs[0][1]=1 >= 2? No → start=1. j=bisect_right(hi=3)=1. start==j → insert (2,3) at 1. ✓.

Edge: existing [0,5), add [2,3): i=bisect_right(los,2)=1 (los=[0]) → start: ivs[0][1]=5>=2 → start=0. j=bisect_right(hi=3)=1. merge → new_lo=0, new_hi=5, replaces [0,5). ✓.

Edge: existing [0,2), add [1,4): i=bisect_right(los,1): los=[0], key lo values... bisect_right on list of tuples with key lo: values [0], lo=1 → i=1. start=0 (hi=2>=1). j=bisect_right(hi=4)=1. merge new_lo=0,new_hi=4 → (0,4). ✓.

But wait — what about interval with lo > lo but hi covering? e.g., existing [3,5), add [0,4): i = bisect_right(los,0)=0 → start=0. j = bisect_right(los,4): los=[3], 3<=4 → j=1. merge new_lo=min(0,3)=0, new_hi=max(4,5)=5 → (0,5). ✓.

Edge: existing [3,5), add [0,3): touches. i=bisect_right(los,0)=0, start=0. j=bisect_right(los,3): los=[3], bisect_right→1 (3<=3). merge: new_hi=max(3,5)=5 → (0,5). ✓.

Edge: existing [3,5), add [0,3) — wait bisect_right with key: list [(3,5)], key value 3, bisect_right returns index after equal elements → 1. Yes.

Hmm, but what about the case where start uses ivs[i-1][1] >= lo but ivs[i-1] might not be within... fine.

One subtle issue: bisect_right with key on lo: i = first index with iv[0] > lo. Intervals with lo == lo are before i. The interval at i-1 has lo <= lo, may cover lo if hi > lo... but condition ivs[i-1][1] >= lo: could ivs[i-1][1] < ivs[i-1][0] <= lo? then no overlap, condition false → start=i. But ivs[i-1][1] >= lo with lo <= ivs[i-1][0]? means hi >= lo >= iv.lo, and since hi > iv.lo, interval covers [iv.lo, hi) ∋ lo (if iv.hi > lo). Overlap → correct.

Wait, condition should be ivs[i-1][1] > lo strictly? Touching ivs[i-1][1] == lo → merge. But can ivs[i-1][1] == lo when ivs[i-1][0] <= lo? Yes, iv = [a, lo), touching [lo, hi) → merge. Condition >= handles. But careful: what if ivs[i-1][1] == lo but ivs[i-1][0]... fine.

Hmm, actually if ivs[i-1][1] >= lo and ivs[i-1] is at index i-1 where ivs[i-1][0] <= lo: overlap condition for merging is iv.lo <= hi and iv.hi >= lo. iv.hi >= lo ✓, iv.lo <= lo <= hi ✓. Good.

remove:

```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        i = bisect_right(ivs, lo, key=lambda iv: iv[0])
        start = i - 1 if i > 0 and ivs[i-1][1] > lo else i
        j = bisect_left(ivs, hi, key=lambda iv: iv[0])
        if start >= j:
            return
        pieces = []
        s_lo, s_hi = ivs[start]
        if s_lo < lo:
            pieces.append((s_lo, lo))
        e_lo, e_hi = ivs[j-1]
        if e_hi > hi:
            pieces.append((hi, e_hi))
        removed = sum(h - l for l, h in ivs[start:j])
        self._total -= removed
        self._total += sum(h - l for l, h in pieces)
        ivs[start:j] = pieces
```

Check remove cases: existing [0,5), remove [2,3): i=bisect_right(los,2)=1 → start=0 (5>2). j=bisect_left(los,3)=1 (los=[0], 0<3 → j=1). s_lo=0<2 → piece (0,2). e=ivs[0], e_hi=5>3 → piece (3,5). Result [(0,2),(3,5)]. ✓.

Existing [0,5), remove [0,2): i=bisect_right(los,0)=1 → ivs[0][1]=5>0 → start=0. j=bisect_left(los,2)=1. pieces: s_lo=0<0? no. e_hi=5>2 → (2,5). ✓.

Existing [0,5), remove [3,5): j=bisect_left(los,5): los=[0], 0<5 → j=1. e_hi=5>5? no. s_lo=0<3 → (0,3). ✓ removes [3,5).

Existing [0,5), remove [0,5): pieces none → []. ✓.

Existing [0,2) and [3,5), remove [2,3): i=bisect_right(los,2): los=[0,3], value 2 → index 1. ivs[0][1]=2 > 2? no → start=1. j=bisect_left(los,3): 3>=3 → j=1. start>=j → return. ✓.

Existing [0,3), remove [2,4): i=bisect_right(los,2)=1, start=0 (3>2). j=bisect_left(los,4)=1. s_lo=0<2 → (0,2). e_hi=3>4? no. → [(0,2)]. ✓.

Existing [2,5), remove [0,3): i=bisect_right(los,0)=0 → start=0. j=bisect_left(los,3): los=[2], 2<3 → j=1. s_lo=2<0? no. e_hi=5>3 → (3,5). ✓.

Existing [2,4), remove [0,6): i=0? bisect_right(los,0): los=[2], → 0. start=0. j=bisect_left(los,6)=1. pieces: s_lo<0 no; e_hi>6 no → []. ✓.

Split middle of same interval: [0,5) remove [1,4): pieces (0,1),(4,5). ✓.

contains:

```python
    def contains(self, x):
        ivs = self._ivs
        i = bisect_right(ivs, x, key=lambda iv: iv[0])
        return i > 0 and ivs[i-1][1] > x
```

Check: x in [0,5): i=bisect_right(los,0)=1, ivs[0][1]=5>0 ✓. x=5: bisect_right→1, 5>5 false ✓. x=-1: i=0 → false ✓. x=6: i=1, 5>6 false ✓. Existing [0,2),[3,5), x=2: i=bisect_right(los=[0,3],2)=1, ivs[0][1]=2>2 false ✓. x=3: i=2, ivs[1][1]=5>3 ✓.

intervals(): return list(self._ivs). Tuples immutable, fine.

total_length: return self._total. But floats: incremental sum may drift? Keep original values — lengths computed by subtraction, fine. Alternatively compute sum each call to be exact-ish. Incremental is fine.

__len__: len(self._ivs).

One concern: bisect with key creates lambda call per comparison — O(log n) calls per op, ~17 calls, negligible.

Also could avoid lambda by keeping parallel los list, but tuple list is simpler. Actually parallel los list doubles memmove cost. Tuple list better for perf? Insert into list of tuples shifts pointers either way; parallel list does two shifts. Keep tuple list.

Also merging removal sum: for add, removed sum over [start:j] — typically 1-2 intervals, cheap. Could optimize: if start == j (pure insert) skip. Fine.

Total maintained: use self._total. But floats and ints mixed — fine.

Write final code with docstrings minimal.