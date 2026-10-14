Implement IntervalSet with sorted list of intervals and bisect. For performance with 60k adds: each add does bisect insertion O(log n) find, but merging may be O(n) per add due to list insert/delete. Worst case 60k insertions into list of size up to 60k — list.insert is O(n) memmove, but that's fast C-level (~60k*60k/2 * small... actually 1.8e9 element moves, might be ~ seconds). Hmm. "small disjoint intervals in random order" — inserting into a Python list of 60k elements, each insert shifts average 30k pointers = 240KB memmove, that's fast (~microseconds). 60k * that = fine, well under 5s. Deleting similar. So list-based approach with bisect is fine.

Design: keep `self._starts` list and `self._ends` list parallel? Simpler: keep list of [lo, hi] tuples sorted. Use bisect on a separate list of los to find positions quickly? bisect.bisect requires list of comparable; tuples list works with bisect on (lo,) — bisect_right(self._ivs, (lo,)) finds insertion point comparing tuples; but comparing (a,) with (a,b): (a,) < (a,b) since shorter. That's fine.

Implementation for add(lo, hi):
- i = bisect_left(self._ivs, (lo,)) — first interval with start >= lo? Actually bisect_left(ivs, (lo,)) returns first index where ivs[i] >= (lo,) i.e., ivs[i][0] >= lo (and if start == lo, tuple (lo, x) > (lo,)? (lo, x) vs (lo,): longer tuple is greater, so (lo,x) >= (lo,). Yes, so bisect_left gives first index with start >= lo).
- Then check neighbors: intervals with start < lo might touch/overlap if their end > lo. Check ivs[i-1] end.
- Merge all overlapping/touching: [lo,hi) overlapping with [a,b) if a < hi and lo < b. Touching: a == hi or b == lo (adjacent, mergeable since union [1,3)∪[3,5)=[1,5)).

Algorithm:
```python
def add(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    # find first interval that could overlap: start < hi and end > lo... 
    i = bisect_left(ivs, (lo,))  # first with lo' >= lo
    if i > 0 and ivs[i-1][1] >= lo:
        i -= 1
        lo = min? actually lo = ivs[i][0]? not needed since ivs[i-1][1] >= lo, and ivs[i-1][0] < lo, so new lo' = ivs[i-1][0].
```
Standard approach:

```python
i = bisect_right(ivs, (lo,))  # first index with start > lo? bisect_right with (lo,) means keys <= (lo,) go left. (lo, x) > (lo,), so intervals with start == lo go to the right. So i = first index with ivs[i][0] > lo, or start==lo handled? Hmm, (lo,5) vs (lo,): compare (lo,) < (lo,5) so bisect_right on (lo,) places after anything equal to (lo,) but (lo,5) > (lo,) so bisect_right returns index of first element > (lo,), which is... elements with start==lo compare greater. So i = first index with start > lo... no wait bisect_right(a, x) = insertion point after existing entries equal to x. Entries (lo, e) for e>0: none equal to (lo,), comparison (lo,e) vs (lo,) → (lo,) is prefix, shorter → (lo,) < (lo,e). So all (lo,e) are > (lo,), they're to the right of insertion point. So i = leftmost index with ivs[i] >= (lo,) i.e. start >= lo. Good: i = bisect_left(ivs, (lo,)) gives leftmost with start >= lo.
```

Then:
```python
i = bisect_left(ivs, (lo,))
j = i
if i > 0 and ivs[i-1][1] >= lo:  # touching/overlapping predecessor, since start < lo and end >= lo means overlap or touch
    # actually condition for touch: ivs[i-1][1] >= lo (touch at lo) or overlap ivs[i-1][1] > lo. Touch counts as mergeable.
```
Wait, does touching count as merged in the set? [1,3)+[3,5) merged into [1,5). Yes. But ivs[i-1][1] == lo means touch, ivs[i-1][1] > lo means overlap. Both merge. ivs[i-1][1] < lo: gap, no merge.

But careful: we shouldn't merge on touch during add if... actually yes we should: intervals() must return merged. If we merge eagerly on add, fine.

Then extend hi: scan forward from i while ivs[k][0] <= hi and ivs[k][1] >... merge condition: ivs[k][0] <= hi (start <= hi means overlap or touch since end > start and hi > lo... need ivs[k][0] <= hi and ivs[k][0] >= lo automatically). Actually overlap if ivs[k][0] < hi OR (ivs[k][0] == hi — touch). So while k < len and ivs[k][0] <= hi: merge, hi = max(hi, ivs[k][1]), also lo = min via predecessor handling. Then replace ivs[i:k] wait indices: after handling predecessor, set lo = min(lo, ivs[i-1][0]) etc.

Cleaner:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    ivs = self._ivs
    i = bisect_left(ivs, (lo,))
    if i > 0 and ivs[i-1][1] >= lo:
        lo = ivs[i-1][0]
        i -= 1
    j = i
    while j < len(ivs) and ivs[j][0] <= hi:
        hi = max(hi, ivs[j][1])
        j += 1
    if j > i:
        ivs[i:j] = [(lo, hi)]
    else:
        ivs.insert(i, (lo, hi))
```

Wait: touching case ivs[j][0] == hi: end of new interval = hi, interval starts at hi — they touch, merge. But condition `ivs[j][0] <= hi` includes == hi which is a touch — merge. Good. But careful when the new interval's hi equals start of next which is exactly hi — merged hi becomes max. But if ivs[j][0] == hi and ivs[j][1]... fine.

But subtle: if lo==hi boundary... lo < hi guaranteed.

Hmm, one subtlety with floats: merge only when adjacent exactly. Fine.

Edge case: after predecessor merge, `ivs[j][0] <= hi` — but we need interval with start == hi to be merged: yes touch.

Wait, but is touching merged correctly in all cases per spec: "touching intervals merged". Since removal creates gaps but intervals never touch after add-merge. On remove, [1,5) minus [3,5) → [1,3). Then adding [3,5) merges back to [1,5). Good.

remove(lo, hi):
- Overlap condition with (a,b): a < hi and lo < b (strict, touching doesn't matter for removal).
- i = first index with end > lo? Intervals sorted by start; also ends sorted (disjoint). Find range of intervals overlapping [lo,hi).
- Use bisect on starts: left = first index with start such that interval overlaps: start >= lo... plus check predecessor with end > lo.

```python
def remove(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    i = bisect_left(ivs, (lo,))
    if i > 0 and ivs[i-1][1] > lo:
        i -= 1
    j = i
    while j < len(ivs) and ivs[j][0] < hi:
        j += 1
    if j == i: return
    left = []
    right = []
    if ivs[i][0] < lo:
        left.append((ivs[i][0], lo))
    if ivs[j-1][1] > hi:
        right.append((hi, ivs[j-1][1]))
    ivs[i:j] = left + right
```

Check: intervals i..j-1 overlap [lo,hi). Since disjoint and sorted, first start < lo possibly (the predecessor with end > lo), last may extend beyond hi. Replacement pieces: left piece from first interval if it starts before lo; right piece from last if ends after hi. Since disjoint, only the first can start < lo and only the last can end > hi. Correct.

contains(x): O(log n) — bisect on starts: find rightmost interval with start <= x, check end > x.

```python
def contains(self, x):
    ivs = self._ivs
    i = bisect_right(ivs, (x,))  # hmm, want starts
```
Better: keep separate lists self._lo and self._hi? Using tuples with bisect: bisect_right(ivs, (x, INF))? For x a float that's fine. Simpler: i = bisect_right(ivs, (x, _INF)) where _INF = math.inf — but x could be... comparing tuples (x, inf) with (a, b): fine. But bounds may be ints and floats; comparisons work. But if x itself is compared... (x, inf) vs (x, y) with y finite: inf > y, so (x, inf) > (x, y). bisect_right gives leftmost index with start > x. Then check ivs[i-1]: start <= x and end > x. But we need leftmost with start > x: bisect_right(ivs, (x, inf))? Entries with start == x: (x, y) < (x, inf) always. Entries with start > x: (a, b) vs (x, inf): a > x → greater. a == x already handled. So bisect_right(ivs, (x, inf)) = first index with start > x. 

```python
i = bisect_right(ivs, (x, _INF)) - 1
return i >= 0 and ivs[i][1] > x
```
where _INF = float('inf'). Edge: what if interval end is inf and y = inf, then (x, inf) == (x,inf), bisect_right places after — fine.

But wait: if ivs[i-1] has start == x, tuple comparison (x, b) vs (x, inf): b < inf, so it's < (x,inf), placed left. Good.

Using bisect_left with (x,) alternative: bisect_left(ivs, (x,)) gives first index with start >= x. Then check ivs[i-1] end > x and ivs[i] start == x and... if ivs[i][0] == x then x in [x, end) since end > x. So:

```python
i = bisect_left(ivs, (x,))
if i < len(ivs) and ivs[i][0] == x and ivs[i][1] > x:
    return True
if i > 0 and ivs[i-1][1] > x:
    return True
return False
```

Simpler: since intervals are disjoint with end > start, if ivs[i-1][1] > x... but ivs[i-1][1] > x and start <=... For the bisect_left approach: i = first with start >= x. Intervals before have start < x. x is in the set iff ivs[i-1].end > x (start of predecessor < x, end > x → x in [start,end)), or ivs[i] starts exactly at x (start == x). So:

```python
i = bisect_left(ivs, (x,))
return (i > 0 and ivs[i-1][1] > x) or (i < len(ivs) and ivs[i][0] == x)
```

That works with tuple bisect, no inf needed. Good.

total_length: sum(hi - lo). Cache? Just compute; or maintain incrementally. Maintain incrementally is easy but must track in add/remove. Let's maintain self._total updated in add/remove. In add, changes: old lengths of merged intervals replaced. Compute delta. Or just compute total lazily with caching invalidated on mutation. Simplest correct: maintain counter.

add: removed intervals ivs[i:j] contribute sum(e-s); new contributes hi-lo. delta = (hi - lo) - sum(...). Or track.

Let me just compute delta in add/remove.

Actually with while loop computing hi = max(hi, ivs[j][1]) I can accumulate removed length. Let me write:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    ivs = self._ivs
    i = bisect_left(ivs, (lo,))
    if i > 0 and ivs[i-1][1] >= lo:
        i -= 1
        lo = ivs[i][0]  # since ivs[i-1][0] < old lo? Actually ivs sorted by start, start of i-1 could equal lo? If ivs[i-1][1] >= lo and bisect_left placed at i meaning ivs[i-1][0] < lo. Since (lo,) comparison: bisect_left(ivs, (lo,)) = first with start >= lo... wait earlier I established bisect_left returns leftmost index with ivs[i] >= (lo,). For start == lo: (lo, e) > (lo,) so start==lo is at index >= i... yes i = first with start >= lo, so ivs[i-1][0] < lo strictly. So lo = ivs[i-1][0] correct. But careful: ivs[i-1][1] >= lo is the merge condition (touch at end==lo).
```

Hmm wait, if ivs[i-1][1] == lo, touching → merge. Condition `>= lo` correct. But note overlap condition for set semantics: touching intervals are merged so [1,3) and [3,5) never coexist. Good.

Then forward loop:
```python
    j = i
    removed = 0
    while j < len(ivs) and ivs[j][0] <= hi:
        removed += ivs[j][1] - ivs[j][0]
        if ivs[j][1] > hi:
            hi = ivs[j][1]
        j += 1
    if j > i:
        ivs[i:j] = [(lo, hi)]
    else:
        ivs.insert(i, (lo, hi))
    self._total += hi - lo - removed
```

Wait condition ivs[j][0] <= hi: includes touch (start == hi). Merge. Good. But hold on: should touching forward only if interval actually starts at hi exactly → merged. Yes.

But subtle bug: when j > i but the new interval doesn't overlap i (only touch predecessor case handled). Actually if j == i after the while (no forward overlaps), do we still place at i? If predecessor merged (i decremented), we replace ivs[i:j] with new merged interval — but j > i because we decremented i, so j > i and we replace ivs[i:i+1]... wait j starts at i, loop runs at least once (ivs[i][0] <= hi? ivs[i] after decrement is the predecessor, its start < lo < hi so ivs[i][0] < hi ✓). Hmm but what if we decremented i and then loop: ivs[i] = predecessor, included, removed += its length, then ivs[i:j] replaced including it. Good.

If no predecessor merge: i points to first interval with start >= lo. Loop: ivs[i][0] <= hi? If ivs[i][0] <= hi overlapping/touching → merge. If not, j == i, insert at i. But wait — is insertion position i correct with respect to sorting? i = first with start >= lo, so inserting (lo, hi) at i keeps sorted. ✓.

Hmm, but one more subtlety: when j > i but only via touch... all fine.

Edge: what if there was no predecessor merge and ivs[i][0] == lo exactly (equal starts)? bisect_left gives first index with start >= lo, so ivs[i][0] could == lo, loop merges it. ✓.

remove:

```python
def remove(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    i = bisect_left(ivs, (lo,))
    if i > 0 and ivs[i-1][1] > lo:
        i -= 1
    j = i
    removed = 0
    while j < len(ivs) and ivs[j][0] < hi:
        removed += ivs[j][1] - ivs[j][0]
        j += 1
    if j == i:
        return
    first, last = ivs[i], ivs[j-1]
    repl = []
    if first[0] < lo:
        repl.append((first[0], lo))
    if last[1] > hi:
        repl.append((hi, last[1]))
    ivs[i:j] = repl
    self._total -= removed
```

Wait: bisect_left(ivs, (lo,)) = first with start >= lo. Predecessor check: ivs[i-1][1] > lo (strict overlap; touch at lo means no removal). ✓.

But subtle in remove with equal starts: ivs[i][0] == lo and ivs[i][1] > lo: overlap (lo < ivs[i].hi? need ivs[j][0] < hi and start >= lo < hi, and end > start... interval [lo2, e2) with lo2 >= lo and lo2 < hi: overlaps since lo < e2 (e2 > lo2 ≥ lo? e2 > lo2 >= lo, so e2 > lo). ✓.

last[1] > hi: keep right part. But could ivs[j-1] also be the one providing left part with first? If j-1 == i, only one interval; first[0] < lo and last[1] > hi can both hold → split into two. ✓ (removal splits an interval in two).

contains as above.

len: len(self._ivs).

intervals(): return list of tuples sorted disjoint merged — it's already stored that way; return list(self._ivs). But careful about merging invariant "with touching intervals merged" — maintained by add. But what if user adds [1,3) then [3,5) with floats — merged in add via touch conditions. ✓.

One concern: bisect with tuples — comparing float with int fine.

Performance of bisect with tuple comparisons: fine.

Also handle x in contains when x is float and intervals int — comparisons fine.

Maintain _total as number; initial 0.

Potential issue: in add, condition `ivs[i-1][1] >= lo` merges touching predecessor — but what if that merge is undesired? Spec says touching merged. Fine.

Also should I handle `lo == hi` ignored ✓.

One more: in add forward loop condition `ivs[j][0] <= hi` — merge touching at right end ✓. But careful: what if new hi == ivs[j][0] and also equals... fine.

Write the class with __init__, __len__, __iter__ maybe, __contains__ delegating to contains.

Let me also add __contains__, __repr__ optionally — keep minimal but __contains__ is nice. Spec says only those methods; extra harmless. I'll add __contains__ and __repr__ lightly? Just __contains__ delegating.

Type hint: bounds int | float → float. Fine.