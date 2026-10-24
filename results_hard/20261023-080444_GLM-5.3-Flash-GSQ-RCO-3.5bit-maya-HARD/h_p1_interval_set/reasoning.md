Use bisect on a sorted list of interval starts, plus parallel list of ends. Maintain invariants: disjoint, non-adjacent merged. For merging "touching" intervals: [1,3) + [3,5) → [1,5). For floats, touching means lo == hi of previous. But careful with floats: equality check works since we keep original values.

Implementation: keep lists `starts`, `ends` sorted. add(lo, hi):
- find i = bisect_right(starts, lo) - 1... Actually standard merge approach:
  - i = bisect_left(starts, lo): first interval with start >= lo.
  - Check interval before: j = i-1; if j >= 0 and ends[j] >= lo → overlap/touch. Start merge from j.
  Actually touching: ends[j] == lo counts as merge (for adjacency). If ends[j] > lo it overlaps. Both merge. If ends[j] < lo, no merge.
  - k = first index with start > hi → bisect_right(starts, hi). But intervals with start == hi and touching should merge: interval [hi, x) touches [lo, hi) merged → start index with start == hi merges too. Since merged invariant means ends[j] < starts[j+1] strictly... wait after merging, we merge touching: ends == next start merged. So invariant: ends[i] < starts[i+1] (strict, since touching merged). So merge range: from first interval whose end >= lo (which could overlap or touch), to last interval whose start <= hi (touching start == hi merges).

Algorithm for add:
- left = bisect_left(starts, lo) - 1... hmm let me define:
  - i = bisect_left(starts, lo): first index with starts[i] >= lo. The interval i-1 might have ends[i-1] >= lo (overlap or touch). Start = min(lo, starts[i-1] if merging) else lo.
  - j = bisect_right(starts, hi): first index with starts[j] > hi. Intervals i..j-1 all have starts <= hi... wait starts in [lo-ish, hi]. Interval j-1 has starts[j-1] <= hi; it merges if starts[j-1] <= hi — touching if equal. So merge interval i-1 (if applicable) through j-1.
  - new_lo = lo if i-1 not applicable else starts[i-1]; but also if i-1 applicable, ends[i-1] >= lo so merged start = starts[i-1] < lo? Actually starts[i-1] < lo (since bisect_left means starts[i-1] < lo). new_lo = starts[i-1].
  - new_hi: if j-1 >= i-1 applicable: new_hi = max(hi, ends[j-1]).
  - Replace slice: starts[i-1... careful: remove indices from (i-1 if merge_left else i) through j-1, insert merged.
  Handle case merge_left false: left bound index = i; but then new interval [lo, max(hi, ends[j-1] if any)]. If j == i (no intervals inside), new interval [lo, hi].

Remove:
- Similar: find affected range. left index: i = bisect_left(starts, lo); i-1 may overlap if ends[i-1] > lo (strict overlap; touching ends==lo doesn't matter for removal... actually ends[i-1] == lo means interval ends exactly at lo, removal [lo,hi) doesn't affect it). j = bisect_right(starts, hi) — intervals with start < hi are affected (starts[j-1] < hi? bisect_right gives starts[j-1] <= hi; if starts[j-1] == hi, interval [hi, ...) unaffected). So affected: indices i..j-1 where starts < hi... Let me use j = bisect_left(starts, hi): first index with starts >= hi. Intervals i..j-1 have lo <= starts < hi → fully/partially covered.
- If i-1 exists and ends[i-1] > lo: split it: ends[i-1] = lo; keep.
- For indices i..j-1: remove all; but last one j-1: if ends[j-1] > hi, insert [hi, ends[j-1]] after.
- Implementation: new ends[i-1] = lo if overlap; then del starts[i:j], ends[i:j]; then if j-1 >= i and ends_removed[j-1] > hi: insert (hi, that end). Need to capture end of j-1 before deletion.

contains(x): i = bisect_right(starts, x) - 1; return i >= 0 and ends[i] > x.

total_length: sum cached or compute; maintain running total for O(1)? Simple: compute sum each time O(n) — fine, but could cache. Just compute; or maintain total incrementally. I'll maintain a running total for cleanliness — actually simpler to just compute in total_length; performance spec only concerns add/contains. But add is O(n) due to list slicing anyway. 60k adds with small disjoint intervals in random order: each add inserts one element into lists of growing size → O(n) slice each → 60k * 60k/2 = 1.8e9 element moves... too slow? Actually list.insert / slice assignment are memmove-based, very fast in C: 60k ops each moving ~60k pointers = 3.6e9 pointer moves ~ a few seconds? memmove of 8 bytes * 60000 = 480KB per op, 60k ops = 28.8 GB memory traffic — probably ~3-5 seconds. Hmm, risky. "well under 5 seconds". Alternative: use `sortedcontainers`? Not standard library.

Better: use a list of intervals and bisect on a separate keys list. Insertion into Python list is memmove — for 60k inserts into average 30k-length list: each memmove ~ 30k*8 bytes = 240KB, total 60k*240KB ≈ 14.4 GB moved. At ~10 GB/s that's ~1.5s per list, two lists (starts and ends) → ~3s. Plus 200k contains trivial. Cutting close.

Optimization: store intervals as a single list of tuples? Then bisect on list of tuples with key... bisect with key parameter (Python 3.10+) works: bisect_left(intervals, lo, key=lambda iv: iv[0]). One list, one memmove per add. That halves work: ~1.5s. Also tuple insertion. Alternatively store two arrays but combine the two slice ops into... still two memmoves.

Alternative approach: batch? No, must handle each add.

Another approach: keep intervals in a single flat list of floats [s0, e0, s1, e1, ...] — one memmove of 2*n floats per insert. Same as two lists roughly.

Single list of tuples with bisect key: bisect with key creates key objects per comparison — O(log n) key calls, fine.

Actually, could we reduce memmove cost? 60k adds, random order, intervals disjoint — final n = 60k intervals. Average insert position ~ middle → average shift 30k elements. List of tuples: each element is a pointer (8 bytes) → 30k*8=240KB per insert, ×60k = 14.4GB. Hmm.

Alternative: use array-based approach with a skip? Or use a different data structure: since adds are of small disjoint intervals, maybe most adds append near end? No — random order.

Alternative: store two `array('d')` arrays? memmove on array('d') moves raw doubles: 30k*8 bytes = same. Same cost.

Hmm, but actually 14.4GB at realistic memmove speeds (memcpy ~ 10-20 GB/s for L2/L3-resident? 240KB doesn't fit in L2 but list of 60k pointers = 480KB fits in L3) — L3 bandwidth ~50-100 GB/s. So 14.4GB / 50GB/s ≈ 0.3s. That's fine actually. list insert of 240KB into a 240KB list is quite fast. Modern machines do memcpy at >10GB/s even to RAM. So ~1-1.5s total worst case for two lists, ~0.5s for one. Should be fine "well under 5 seconds".

I'll go with two parallel lists (starts as list, ends as list) — bisect on starts directly without key overhead. Or one list of tuples. Let me do two lists; it's cleaner for logic.

Actually merging during add: slice assignment `starts[i:j] = [new_lo]` — one memmove. Good.

Edge cases:
- add where lo==hi: ignored.
- touching merge: ends[j-1] == hi counts (interval [hi, x) merges). And ends[i-1] == lo merges ([..., lo) + [lo,...)).
- floats: comparisons exact, fine.

add implementation:
```python
def add(self, lo, hi):
    if lo >= hi: return
    starts, ends = self._starts, self._ends
    i = bisect_left(starts, lo)
    # check left neighbor
    if i > 0 and ends[i-1] >= lo:
        lo = starts[i-1]
        i -= 1
    j = bisect_right(starts, hi)
    # intervals i..j-1 have starts in [lo, hi] — all merge (touch or overlap? starts <= hi and starts >= lo... starts[i] could be < lo? No, i is bisect_left so starts[i] >= lo after decrement? Wait we decremented i possibly. After decrement, starts[i] < lo possibly? No: if we decremented, starts[i] < lo (old i-1), and ends[i] >= lo, so it overlaps/touches — merges.
    if j > i:
        hi = max(hi, ends[j-1])
    starts[i:j] = [lo]
    ends[i:j] = [hi]
```
Check: j = bisect_right(starts, hi): intervals with start <= hi. An interval with start == hi merges (touching). Interval with start > hi does not. Correct. But what about interval starting before lo not caught by left-neighbor check? i = bisect_left(starts, lo) → starts[i] >= lo; only i-1 can start < lo. Correct.

But wait: after possible decrement of i, the intervals between i and j: all have starts >= lo (original lo) or the decremented one with end >= lo. All get merged. And new_hi = max(hi, ends[j-1]). But could ends[j-1]... ends[j-1] > starts[j-1], and intervals are disjoint non-touching so ends[j-1] < starts[j] anyway. Fine.

Also need j computed with respect to which list? starts unchanged, fine. But if i was decremented, j should still be bisect_right(starts, hi) — fine.

Edge: what if after decrement, i-1 also touches? Can't happen since invariant ensures ends[i-1] < starts[i] (strict, non-touching), so only one left neighbor can reach lo... Actually ends[i-2] < starts[i-1] <= lo region — ends[i-2] < starts[i-1] < lo (since starts[i-1] < lo when decremented? No: we decremented only if ends[i-1] >= lo, and starts[i-1] < lo always since i was bisect_left. If not decremented, ends[i-1] < lo.) Either way ends[i-2] < starts[i-1] < ... hmm if decremented, new i has starts[i] < lo; then check i-2? ends[i-2] < starts[i-1]? No wait, invariant is ends[k] < starts[k+1]... actually ends[k] <= starts[k+1]? After merging touching intervals, ends[k] < starts[k+1] strictly. And starts[i-1] (old, = new starts[i]) < lo. So ends[i-2] < starts[i-1] < lo → no further merge. Good, single-step decrement suffices.

remove:
```python
def remove(self, lo, hi):
    if lo >= hi: return
    starts, ends = self._starts, self._ends
    i = bisect_left(starts, lo)  # first start >= lo
    # left neighbor overlapping (end > lo strictly; end == lo unaffected)
    j = bisect_left(starts, hi)  # first start >= hi
    # intervals i..j-1 covered partially/fully
    # left neighbor split:
    if i > 0 and ends[i-1] > lo:
        ends[i-1] = lo
    # right partial: if j > i and ends[j-1] > hi → keep tail
    tail = ends[j-1] if j > i and ends[j-1] > hi else None
    del starts[i:j]
    del ends[i:j]
    if tail is not None:
        starts.insert(i, hi)
        ends.insert(i, tail)
```
Wait: careful when left neighbor split and i == j? If i > 0 and ends[i-1] > lo, and j == i (no starts in [lo, hi))? j = bisect_left(starts, hi) >= i since hi > lo. If j == i, means starts[i] >= hi and starts[i-1] < lo. Then ends[i-1] could be > lo (overlap) — split: ends[i-1] = lo, and tail: ends[j-1] = ends[i-1]... but we already modified ends[i-1]! Bug. Handle order: compute tail first from original ends, then split left neighbor, then delete.

Also tail should be original ends[j-1] when ends[j-1] > hi. If left neighbor split happened with j == i, ends[i-1] original > hi possibly → tail = hi..orig_end. Let me compute tail = ends[j-1] if (j > i and ends[j-1] > hi) else... but if j == i and left neighbor overlaps: j-1 == i-1. Condition should be: if j > 0 and j-1 >= i? Hmm.

Restructure: affected interval left boundary: let a = i if not (i > 0 and ends[i-1] > lo) else i-1. Then intervals a..j-1 are affected (j = bisect_left(starts, hi), starts[j-1] < hi when j > a... if j-1 == i-1 == a with ends > lo, then starts[a] < lo < hi and ends > lo — affected). Actually if ends[i-1] > lo and starts[i-1] < lo < hi: yes affected regardless of whether ends[i-1] < hi or >= hi.

Cleaner:
```python
i = bisect_left(starts, lo)
if i > 0 and ends[i-1] > lo:
    i -= 1  # this interval is affected (it contains lo... starts[i] < lo < ends[i])
j = bisect_left(starts, hi)
tail = ends[j-1] if j > i and ends[j-1] > hi else None
```
Hmm but if j == i after decrement... e.g., left neighbor [0, 10), remove [5, 7): i = bisect_left(starts,5) → points past [0,10)? starts=[0], bisect_left([0],5)=1, ends[0]=10>5 → i=0. j = bisect_left(starts, 7) = 1. j > i, tail: ends[0]=10 > 7 → tail=10. Then we need: left part [0,5) kept, tail [7,10). With my code: set ends[i-1]... but now i=0 so no "left neighbor" separate. Deletion: del starts[i:j] = del starts[0:1] → removes whole interval, then insert tail. But we lose [0,5)! Need to handle: if the affected-left interval starts before lo, keep [starts[i], lo).

Rewrite properly:
```python
i = bisect_left(starts, lo)   # first start >= lo
j = bisect_left(starts, hi)   # first start >= hi
# left partial interval:
left_piece = None
if i > 0 and ends[i-1] > lo:
    left_piece = (starts[i-1], lo)  # replaces interval i-1
# right partial:
right_piece = None
if j > 0 and ends[j-1] > hi and (j-1 >= i or ...):
```
Hmm, if left partial interval is i-1 and also j-1 == i-1 (interval spans [lo,hi) entirely inside it), then right piece tail = original end. But left_piece already truncates it. Then right piece should be (hi, orig_end) and left piece (starts[i-1], lo). Both from same interval, and it gets fully deleted, replaced by two pieces.

Let me capture: if j-1 == i-1 and that interval spans: orig = ends[i-1]. pieces: (starts[i-1], lo) if starts[i-1] < lo, and (hi, orig) if orig > hi.

General clean solution:
```python
i = bisect_left(starts, lo)
j = bisect_left(starts, hi)
new_pieces = []
if i > 0 and ends[i-1] > lo:
    new_pieces.append((starts[i-1], lo))
    i -= 1   # include in deletion range
if j > i and ends[j-1] > hi:
    new_pieces.append((hi, ends[j-1]))
elif j == i and i > 0 and ends[i-1] > hi:  # hmm
```
Wait after decrementing i, if j == i (old j == old i), the interval i-1 (old) spans beyond hi possibly. ends[j-1] where j == i (new) refers to the same interval we already added left piece for. Its original end: but I appended left piece before checking tail; ends[j-1] still original (not yet modified). So: after i decrement, check `if ends[j-1] > hi` with j-1 possibly == i-1: tail = (hi, ends[j-1]). Since j = bisect_left(starts, hi) and starts[j-1] < hi (if j>0). If j == i (new), starts[i-1]... the interval containing both lo and hi. ends[j-1] > hi → append (hi, ends[j-1]).

But careful: if j == i and interval i-1 has lo <= ends... e.g. [0,10), remove [5,7): i: bisect_left([0],5)=1, ends[0]=10>5 → left piece (0,5), i=0. j = bisect_left([0],7)=1. Now j(1) > i(0): ends[0]=10 > 7 → append (7,10). Deletion: del starts[0:1], ends[0:1]. Insert pieces [(0,5),(7,10)] at position 0. Correct!

Another: [0,10), remove [0,5): i = bisect_left([0],0)=0. no left piece. j = bisect_left([0],5)=1 > i=0, ends[0]=10>5 → tail (5,10). del starts[0:1]; insert (5,10) at 0. Correct.

Remove middle of three: starts=[0,5,10], ends=[3,8,12], remove [6,7): i=bisect_left(starts,6)=1; ends[0]=3>6? No. j=bisect_left(starts,7)=2. j>i: ends[1]=8>7 → tail (7,8). del starts[1:2], ends[1:2]. insert (7,8) at 1. Result [0,3),[7,8),[10,12). Correct.

Remove [4,9): i=1, ends[0]=3>4? no. j=bisect_left(starts,9)=2. ends[1]=8>9? no. del starts[1:2]. → [0,3),[10,12). Correct.

Remove spanning multiple: starts=[0,5,10], ends=[3,8,12], remove [1,11): i=bisect_left(,1)=1; ends[0]=3>1 → left piece (0,1), i=0. j=bisect_left(,11)=3. ends[2]=12>11 → tail (11,12). del starts[0:3], ends[0:3]; insert pieces at 0 → [(0,1),(11,12)]. Correct.

Insert position: after del starts[i:j], position i. new_pieces list: starts[i:j] = ... better: starts[i:j] = [p[0] for p in pieces]; ends[i:j] = [p[1] for p in pieces]. Handles 0,1,2 pieces.

Also touching edge in remove: ends[i-1] == lo → no left piece (correct, interval ends at lo, removal doesn't cut it). starts[j] == hi → j = bisect_left gives that index, not included (correct, interval starts at hi unaffected). ends[j-1] == hi → no tail (correct).

One more subtlety in remove: after decrementing i for left piece, j could be < i? j = bisect_left(starts, hi) computed before decrement with old i; j >= old i >= new i + 1 > new i. So j > i always when left piece exists. Fine. And if left piece exists and j == old i: then j(new comparison) — j > i since i decremented. Then tail check `j > i and ends[j-1] > hi`: j-1 == old i - 1 == i (new) which is the spanning interval — ends[j-1] original. But wait, if j == old i, then starts[old i] >= hi, and interval old i-1 has starts < lo, ends > lo. Is ends[old i -1] > hi possible? That means interval spans [lo, hi). Then tail = (hi, ends). Yes as in example. And condition j > i holds. Good. But note ends[j-1] might have been... we haven't modified ends, fine.

Hmm wait, one issue: in the case left piece appended and j == old i, tail condition uses ends[j-1] where j-1 == i (new) — that's the same interval as left piece source. Correct behavior: append (hi, orig_end). Then deletion del starts[i:j] where i(new)=old_i-1, j=old_i → deletes exactly that one interval. pieces = [(start, lo), (hi, orig_end)]. 

Also possible: no left piece, j == i: nothing deleted, nothing appended. Fine.

contains: i = bisect_right(starts, x) - 1; return i >= 0 and x < ends[i].

total_length: maintain running sum? Adds/removes modify slices; easier to compute sum(hi-lo for ...) on demand. That's O(n) but fine. Or maintain self._total updated in add/remove: in add, removed intervals sum then add new. Let me just maintain total for O(1). In add: total += (hi - lo) - sum(ends[i:j] - starts... need old sum: sum(ends[k]-starts[k] for k in range(i,j)). Fine. Actually simpler: compute total lazily with caching flag. I'll maintain incrementally — straightforward.

Actually simpler and safe: cache with dirty flag. But incremental is easy enough. Let me do incremental:

add: old = sum of removed range; total += (hi_new - lo_new) - old.
remove: total -= sum of removed pieces' coverage. Removed range i..j-1 replaced by pieces; total -= (sum ends[i:j]-starts[i:j]) - sum(pieces lengths).

I'll implement with helper.

len: len(self._starts).

intervals(): list(zip(starts, ends)) → list of tuples.

Also `add` merging: could add produce touching with next interval beyond j? Next interval j has starts[j] > hi... wait j = bisect_right(starts, hi) → starts[j] > hi strictly? bisect_right returns first index with starts[k] > hi. So starts[j] > hi. But ends[j-1] could... new_hi = max(hi, ends[j-1]) and ends[j-1] < starts[j] hmm actually is ends[j-1] < starts[j]? Invariant non-touching: yes ends[j-1] < starts[j]. And new_hi <= max(hi, ends[j-1]). Could ends[j-1] == starts[j]? No by invariant. Could hi == starts[j]? No, starts[j] > hi. So new interval's end < starts[j] strictly. Good, invariant preserved. Left: new_lo = starts[i-1] (if decremented) or lo; ends[i-1] before... after merge, the previous interval i-2 has ends[i-2] < starts[i-1] = new_lo. If not decremented: previous ends[i-1] < lo = new_lo (since we checked ends[i-1] >= lo fails → ends[i-1] < lo). Good.

Wait, in add: `if i > 0 and ends[i-1] >= lo` — this includes touching (ends == lo) → merge. Good.

j in add: bisect_right(starts, hi) — merges interval with start == hi (touching). Good.

Verify invariant initial: empty.

Total maintenance in add:
```python
old = 0
for k in range(i, j): old += ends[k] - starts[k]
```
Could use zip sum: `sum(map(...))`. Use `sum(e - s for s, e in zip(starts[i:j], ends[i:j]))`. O(j-i), fine.

Let me also double check add when decrementing i: after `lo = starts[i-1]; i -= 1`, j computed after — order matters? j = bisect_right(starts, hi) independent of i. Compute j after. Fine.

But careful: in add, after decrement, could ends[i-1] (new) >= lo_new = starts[i]? No: ends[i-1] < starts[i] invariant (strict non-touch). Actually invariant: could ends[i-1] == starts[i]? No — touching intervals are merged, so ends[i-1] < starts[i]. But wait — is that guaranteed? add merges touching. remove: does remove create touching intervals? Remove deletes; pieces: left piece (starts[i-1], lo) — could it touch next remaining interval? Next remaining after deletion: original starts[j] >= hi... left piece end = lo < hi <= ... pieces: right piece starts at hi. Could left piece end lo == right piece start? lo < hi so no. Could left piece touch interval at j (starts[j])? starts[j] >= hi > lo. Left piece end lo < starts[j]. Right piece end = ends[j-1] orig < starts[j] (invariant). So no touching created. Invariant holds: all stored intervals strictly non-touching and disjoint. But note: intervals() must merge touching — they're already merged internally, so just zip.

Hmm, but what about intervals that touch in stored data — invariant says no. Good.

Edge: add with lo being float and existing int comparisons fine.

Type hints: use numbers (int/float). Use `from bisect import bisect_left, bisect_right`.

Also for add total update: new interval length = hi - lo (updated values).

Write code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint, non-touching half-open
    intervals [lo, hi)."""

    def __init__(self):
        self._starts = []  # sorted interval start points
        self._ends = []    # self._ends[k] is the end of interval starting at self._starts[k]
        self._total = 0.0  # hmm, keep as number; sum of lengths
```

_total: if all ints, sum should be int? total_length returns number; mixing float 0.0 start makes int sets return float. Better compute lazily: keep `self._total = 0` and update with hi-lo which preserves int if ints. Start with 0 (int). If all int bounds, total stays int. Good.

Methods:

```python
    def add(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        i = bisect_left(starts, lo)
        if i > 0 and ends[i - 1] >= lo:
            lo = starts[i - 1]
            i -= 1
        j = bisect_right(starts, hi)
        if j > i:
            removed = sum(e - s for s, e in zip(starts[i:j], ends[i:j]))
            if ends[j - 1] > hi:
                hi = ends[j - 1]
            self._total -= removed
        starts[i:j] = [lo]
        ends[i:j] = [hi]
        self._total += hi - lo
```

Wait: also when j == i but left decremented, no removed range — but the decremented interval i is not removed... In add, when we decrement i (left overlap/touch), the interval i (new) is fully absorbed into merged? Its range [starts[i], ends[i]) with ends[i] >= lo — the merged interval [new_lo, new_hi) covers it since new_lo = starts[i] and new_hi >= hi > lo... hmm new_hi could be less than ends[i]? ends[i] >= lo(old) and new_hi >= hi > lo(old). Is new_hi >= ends[i]? ends[i] could exceed hi! E.g., intervals [0, 10); add [2, 5). i = bisect_left([0], 2) = 1; ends[0] = 10 >= 2 → lo = 0, i = 0. j = bisect_right([0], 5) = 1 > i=0. removed = 10. ends[0] = 10 > 5 → hi = 10. merged [0,10). Correct. In general the interval containing lo has ends >= lo; if ends > hi, j = bisect_right(starts, hi): that interval's start < lo <= hi so it's included in j range (start <= hi → included in bisect_right). So ends[j-1] >= its end >= hi possibly → hi updated. Good — any interval overlapping [lo, hi) has start < ... intervals overlapping must have start <= hi? An interval [s,e) overlaps [lo,hi) iff s < hi and e > lo. s < hi → included by bisect_right (s <= hi). And the touch-merge s == hi handled. So j covers all overlapped. And after left-decrement, interval i (new) is within [i, j) since its start < lo <= hi → j > i always in that case? j = bisect_right(starts, hi) ≥ index of any start ≤ hi; starts[i] < lo < hi → j > i. Yes. Good.

But subtle: `if j > i: removed...` — when j == i (no overlapping/touching intervals inside), nothing removed, but could ends[j-1]... skip. But what about interval i-1 not merged (ends[i-1] < lo): untouched. Fine.

Hmm wait, another case: j > i but ends[j-1] <= hi — fine, hi stays.

Also touching merge on the right when j == i? Interval j has starts[j] > hi (bisect_right), so no interval starts exactly at hi is excluded... bisect_right includes starts == hi. So start == hi is at index < j. Good.

remove:

```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        i = bisect_left(starts, lo)
        if i > 0 and ends[i - 1] > lo:
            i -= 1
        j = bisect_left(starts, hi)
        pieces = []
        if ends[j - 1] > hi if j > 0 else False:
            ...
```
Careful ordering. Let me write:

```python
        i = bisect_left(starts, lo)
        left = i > 0 and ends[i - 1] > lo
        if left:
            i -= 1
        j = bisect_left(starts, hi)
        pieces = []
        if left:
            pieces.append((starts[i], lo))
        if j > i and ends[j - 1] > hi:
            pieces.append((hi, ends[j - 1]))
        removed = sum(e - s for s, e in zip(starts[i:j], ends[i:j]))
        self._total += sum(e - s for s, e in pieces) - removed
        starts[i:j] = [p[0] for p in pieces]
        ends[i:j] = [p[1] for p in pieces]
```

Check case left and j == old i (spanning interval): after i decrement, j > i (since j = old i = i+1 new... wait old i, then i_new = old i - 1, j = old... j computed after decrement but from same starts: j = bisect_left(starts, hi). If interval spans [lo,hi) fully inside: old i = bisect_left(starts, lo) = index after that interval (its start < lo). j = bisect_left(starts, hi): that interval's start < hi → j >= old i? bisect_left(starts, hi) > index of start < hi... j >= old i. And starts[old i] >= lo... could starts[old i] < hi → j > old i. Either way j >= old i > i_new. So `j > i` holds, and j-1 could be i (the spanning interval) or later. If j-1 == i and ends[j-1] > hi → append (hi, ends). But pieces would be [(start, lo), (hi, end)] — two pieces from one interval, deletion range i:j removes it. Correct.

If left and j-1 == i and ends[j-1] <= hi: interval partially cut on left only, right part within [.., hi]? ends <= hi means interval ends before hi → but ends > lo (left condition). Then it's fully covered on right? Interval [starts[i], ends[i]) with ends <= hi: piece (starts[i], lo) only; rest [lo, ends) removed. Correct.

Check case left false, j > i, ends[j-1] > hi: tail piece. Correct.

Edge: left true and j == i? Impossible as shown (j >= old i = i+1).

But wait: left condition uses ends[i-1] > lo with old i. If ends[i-1] == lo exactly, not affected — correct.

One more check for remove: touching removal creating merged output? Removal never creates touching. Fine.

contains:

```python
    def contains(self, x):
        i = bisect_right(self._starts, x) - 1
        return i >= 0 and x < self._ends[i]
```

total_length: return self._total.

intervals: `return list(zip(self._starts, self._ends))` — zip yields tuples. Good.

__len__: return len(self._starts).

Double-check add's total when j > i but we didn't decrement... covered. When j > i and decrement happened: removed includes interval i (decremented one) — correct, it's absorbed.

One more add check: add [3,5) to existing [1,3): i = bisect_left([1],3)=1; ends[0]=3 >= 3 → touching merge: lo=1, i=0. j = bisect_right([1],5)=1 > 0: removed=2; ends[0]=3 > 5? no. starts[0:1]=[1], ends=[5]. total = 2 + 4 - 2 = 4. intervals [(1,5)]. ✓.

add [1,3) then [3,5): second: i=bisect_left([1],3)=1, ends[0]=3>=3 → merge → (1,5). ✓ (spec: touching merged).

add disjoint: [1,2),[5,6): add [5,6): starts empty→ insert. add [1,2): i=0... starts=[5]; bisect_left([5],1)=0; i>0 false; j=bisect_right([5],2)=0; j>i false. starts[0:0]=[1], ends[0:0]=[2]. → starts=[1,5]. ✓.

contains at boundary: x=2 in [1,2)? bisect_right([1],2)-1=0; 2 < ends[0]=2? No → False ✓ (half-open).

contains x=1: bisect_right([1],1)-1 = 1-1 = 0; 1 < 2 → True ✓.

contains x=3 in [1,2),[5,6): bisect_right([1,5],3)-1 = 1-1... bisect_right: 1<3, 5>3 → returns 1; i=0; 3 < 2? False ✓.

Now performance: 60k adds. Each add: bisect O(log n), slice sum O(k) where k = number of merged intervals. For disjoint random adds, k is typically 0 or small — sum over empty/1 slices cheap. Slice assignment starts[i:j] = [lo]: memmove. Total ~O(n²/2) pointer moves = ~1.8e9 * 8 bytes... wait 60k² /2 = 1.8e9 pointer moves = 14.4 GB per list, two lists = 28.8 GB. Hmm earlier I estimated with average 30k elements: 60k * 30k = 1.8e9 elements * 8 bytes = 14.4 GB per list. Two lists: ~29 GB. At ~10GB/s ≈ 3s; at 20GB/s ≈ 1.5s. Risky-ish but probably OK on modern hardware (memmove within a few hundred KB is fast, L3-resident, ~50+ GB/s effective). Actually 60k pointers = 480KB, likely L3 resident, bandwidth 100+ GB/s → <0.5s total. Fine.

Could reduce by storing a single list of tuples: one memmove instead of two → halves. But then bisect needs key= (3.10+, ok for 3.11). key=lambda adds overhead per comparison but log n. Hmm, also slice assignment on list of tuples single memmove. That's better: ~7GB moved. But zip-based intervals() returns the tuples directly. And logic indexes intervals[k][0], [k[1]] — slightly more clutter. Alternatively store flat: one list alternating [s0,e0,s1,e1,...] and bisect with key=lambda k: list[k]... key computed as list[2*idx]... messy.

Alternative trick to avoid memmove: two lists but... I think two lists is fine. Actually let me reconsider: maybe use a single list of tuples with key. In add/remove we do slice assignment once instead of twice, halving memory traffic. And bisect with key: bisect module supports key since 3.10. For contains 200k calls: each does bisect with key → key function called O(log n) times → 200k * ~16 lambda calls = 3.2M lambda calls, ~0.3s. Acceptable. Hmm, but lambda call overhead per comparison... fine.

Alternatively keep starts list only for bisect plus one intervals list? Then add does two memmoves again. 

Or: maintain starts list and ends list — the standard. I'll estimate: is it "well under 5 seconds"? Two memmoves per add, average 240KB each → per add ~0.5MB traffic; 60k adds → 30GB... hmm let me recompute: average list length during process ~ n/2 average = 30k intervals → 30k pointers = 240KB. Two lists → 480KB per add. ×60k = 28.8 GB. Python list slicing also allocates new list for the extracted slice? starts[i:j] creates a temp list of j-i elements (allocation + copy), then assignment memmoves. Extra ~same traffic. So maybe ~60-80GB traffic → 1-3 s. Hmm, borderline "well under 5 s".

Single tuple list: temp slice + memmove per add: average 30k tuples * 8 bytes = 240KB, ×2 (temp + shift) = 480KB per add → 28.8GB → ~1s. Better.

Alternative: avoid temp slice by using `del lst[i:j]; lst.insert(i, item)`? del slice also does memmove + no temp allocation? del lst[i:j] — internally memmove; I believe list del slice doesn't create temp. insert likewise memmove without temp. So `del` + `insert` avoids the temp copy: per add, two memmoves of avg 240KB (del shifts right half left, insert shifts it right again!). That's actually double shifting: del moves elements after j left, insert moves them right again. If j-i small (typical disjoint case, j == i), del+insert = shift right part left by 0? del lst[i:i] is no-op, insert shifts right part right by 1: one memmove of ~240KB. Slice assignment starts[i:i] = [lo] also one memmove without temp (slice assignment with equal length? For i:j empty and inserting 1 element, list.__setitem__ with slice: it computes and resizes — I think it does memmove without temp list when replacing... Actually slice assignment creates the new combined? CPython list_ass_slice: it copies the inserted sequence items... for a list [lo], it uses the items directly? It calls list_extend-ish? It does: if inserting, memmove existing items then copy new items pointer-by-pointer (small). I believe no big temp. When j > i (removing), it does one memmove. So slice assignment is roughly one memmove + small copy. Good.

So per add with two lists: two memmoves (~240KB each avg) → 28.8GB total. Tuple-list: one memmove → 14.4GB. Either fine.

Actually wait — maybe there's a subtlety: when j > i and removing via slice assignment starts[i:j] = [lo], CPython's list_ass_slice: it first makes a temp copy of the replacement sequence? For a list argument, it may use it directly... In CPython, list_ass_slice with a list slice target: `if PyList_Check(v)` it uses v's items directly (with incref). So no temp. OK.

I'll go with two parallel lists (simpler code, faster bisect without key). 28.8GB / ~15GB/s ≈ 2s worst... hmm. Let me think about whether the test really is random order of 60k disjoint intervals — yes stated. Final size 60k. Average shift for insert at random position in growing list: expected shift = (position) average ~ k/2 where k current size → sum over k of k/2 = 60k²/4 = 9e8 pointer moves = 7.2GB per memmove-op... wait per add there are two lists so 14.4GB total shifting. Plus slice reads in `starts[i:j]` temp — slice with j-i ~ 0 typically! For disjoint adds in random order, overlaps rare → j-i usually 0 → no temp. So total ~14.4GB memmove traffic. Modern DDR4 + L3: memmove of 240KB (fits in L3 partly) — effective maybe 30-60 GB/s → 0.3-0.5s. Great, well under.

Also 200k contains: trivial.

Also total_length maintained incrementally with sums over tiny ranges — fine.

Let me also consider `sum(e - s for s, e in zip(starts[i:j], ends[i:j]))` creates slice temps of size j-i — small typically. Fine.

Now write final code with type hints and docstrings.

```python
from bisect import bisect_left, bisect_right
from typing import List, Tuple


class IntervalSet:
    def __init__(self) -> None:
        self._starts: List[float] = []
        self._ends: List[float] = []
        self._total = 0

    def add(self, lo, hi) -> None:
        if lo >= hi:
            return
        starts = self._starts
        ends = self._ends
        i = bisect_left(starts, lo)
        if i and ends[i - 1] >= lo:
            lo = starts[i - 1]
            i -= 1
        j = bisect_right(starts, hi)
        if j > i:
            self._total -= sum(map(lambda s, e: e - s, starts[i:j], ends[i:j]))
            if ends[j - 1] > hi:
                hi = ends[j - 1]
        starts[i:j] = [lo]
        ends[i:j] = [hi]
        self._total += hi - lo
```

Hmm `sum(map(lambda...))` — use zip comprehension; fine.

remove as designed.

Also `__len__`, `intervals`, `contains`, `total_length`.

Maybe also `__contains__` alias and `__bool__`? Not required; add `__contains__ = contains`? Optional; harmless. I'll add __contains__ delegating.

Edge: remove where left piece and right piece both from same interval, ends[j-1] > hi and j-1 == i: pieces order [(start,lo),(hi,end)] — sorted correctly. Deletion range starts[i:j] where j > i. Good.

Edge: remove touching exactly covering an interval: [1,2) remove [1,2): i=bisect_left([1],1)=0; left false (i==0). j=bisect_left([1],2)=1. j>i: ends[0]=2>2? no. del starts[0:1]. ✓.

Edge: remove [0.5, 1.5) from [1,2): i=bisect_left([1],0.5)=0; left false. j=bisect_left([1],1.5)=1. ends[0]=2>1.5 → piece (1.5,2). del starts[0:1] → insert (1.5,2) at 0. ✓.

Edge: remove [1.5,2.5) from [1,2): i=bisect_left([1],1.5)=1; left: ends[0]=2>1.5 → piece (1,1.5), i=0. j=bisect_left([1],2.5)=1. j>i: ends[0]=2>2.5? no. del starts[0:1]; insert (1,1.5). ✓.

Verify total in that case: removed=1, pieces len 0.5, total += 0.5 - 1. ✓.

Also consider `intervals()` return type: list of tuples — zip gives tuples ✓.

Write final answer.