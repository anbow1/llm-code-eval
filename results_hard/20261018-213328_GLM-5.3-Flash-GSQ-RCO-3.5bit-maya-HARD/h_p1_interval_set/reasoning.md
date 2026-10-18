Design: sorted list of disjoint intervals. add: find overlaps with bisect, merge. remove: subtract. Use bisect on list of lo values.

Store intervals as list of [lo, hi] sorted by lo. To keep merge of touching intervals ([1,3)+[3,5) -> (1,5)), we merge when hi >= next lo (i.e., touching counts as merge). For add: merge intervals where existing.hi >= new.lo and existing.lo <= new.hi — touching counts.

Implementation:

Maintain self._starts (list of lo) and self._ends (list of hi) parallel, or list of pairs. Pairs are simpler; bisect on list of tuples works using lo since tuples compare lexicographically — need care. Use bisect with key on lo: bisect_left(starts, x) where starts = list of los. Keep parallel lists for efficiency.

add(lo, hi):
- if lo >= hi: return
- i = bisect_left(starts, lo) — first interval with start >= lo. Actually intervals overlapping [lo,hi): interval [a,b) overlaps if a < hi and b > lo. Touching merge: if b == lo we merge (touching), if a == hi merge. So merge condition: a <= hi and b >= lo. With half-open and touching merge, we union when a <= hi and b >= lo.

Find leftmost interval with b >= lo: since ends are sorted too (disjoint, sorted intervals have sorted ends), we can find first start with... hmm. Intervals sorted by start; ends sorted as well. Overlapping/touching range: indices j..k-1 where starts[j] <= hi (for merging, a <= hi) and ends[j] >= lo.

Use bisect to find:
- left = index of first interval whose end >= lo. Since ends sorted, bisect_left(ends, lo). But we don't keep ends list separately... keep both lists.

Actually simpler: find j = bisect_right(starts, lo) - 1? Hmm, let's use ends.

Let me keep self._los and self._his parallel lists.

add(lo, hi):
- left = bisect_left(self._his, lo)  # first interval with hi >= lo (touching or overlapping)
- right = bisect_right(self._los, hi) # first interval with lo > hi (touching at hi: lo == hi merges, so include those with lo <= hi)
- If left == right: no overlap/touch — but wait, could left < right always when there's overlap? Intervals between left..right-1 satisfy his >= lo and los <= hi. Each such interval overlaps or touches [lo,hi). But we need the merged set also to be contiguous: intervals in between overlap/touch each other and the new one? Interval j with his[j] >= lo and los[j] <= hi touches/overlaps [lo,hi)? Touch requires... interval [a,b) with b >= lo and a <= hi: they intersect or touch iff not (b < lo or a > hi). b >= lo and a <= hi means they intersect or touch. Yes.

But careful: left..right-1 intervals — are they all overlapping/touching new interval? Yes by construction. But also we need to check: if left < right, the new merged interval is [min(lo, los[left]), max(hi, his[right-1])]. Also intervals adjacent outside range: interval left-1 might touch the merged result? Its hi < lo (since bisect_left(his, lo) = left means his[left-1] < lo), so hi_merged could equal los[left-1]? merged lo = min(lo, los[left]) ≥ ... los[left-1] < his[left-1] < lo... los[left-1] < lo? his[left-1] < lo and los[left-1] < his[left-1], so los[left-1] < lo ≤ merged lo. And los[left-1] != merged lo since strict. Fine. Similarly right interval: los[right] > hi, merged hi ≤ max(hi, his[right-1]) < ... his[right-1] < los[right]? Not necessarily strict — disjoint means his[right-1] <= los[right]. Could his[right-1] == hi and los[right] == hi? merged hi = hi, next interval starts at los[right] > hi. Fine, no touching.

So:
new_lo = min(lo, self._los[left]) if left < right else lo
new_hi = max(hi, self._his[right-1]) if left < right else hi
Replace slice [left:right] with single interval. But wait: if left < right, is it guaranteed that the intervals left..right-1 plus new form one contiguous merged interval? Interval left-1... within range, intervals are disjoint and sorted; consecutive intervals in range may have gaps? If gaps exist between intervals left..right-1, merging them all into one would be wrong! E.g., intervals [0,1), [5,6), add [2, 10): left = bisect_left(his=[1,6], 2) = 1; right = bisect_right(los=[0,5], 10) = 2. Range [1,2): interval [5,6). Merged with [2,10): [2,10) since his[1]=6 < 10 → max(10,6)=10, min(2,5)=2. Result [2,10). Correct — only interval in range merged. Good, but consider intervals [0,1),[5,6) and add [0, 6): left = bisect_left(his, 0) = 0, right = bisect_right(los, 6) = 2. Range covers both intervals, both overlap [0,6). Merged [0,6). Fine. Gaps only matter when an interval in the range doesn't overlap — impossible since all in range satisfy hi>=lo and lo<=hi w.r.t. new. But gap between interval j and j+1 both in range: interval j overlaps/touches new, interval j+1 overlaps/touches new, but the gap between them (his[j] < los[j+1]) — merging into one interval would swallow the gap? No: new interval [lo,hi) covers the gap since his[j] <= los[j+1], and both overlap [lo,hi): his[j] >= lo... hmm wait, if his[j] < los[j+1], and interval j+1 has los[j+1] <= hi and his[j] >= lo. Does [lo,hi) cover the gap? Gap is [his[j], los[j+1]). Since his[j] >= lo? Not necessarily — his[j] could be... his[j] >= lo yes (left condition). los[j+1] <= hi yes (right condition). So gap ⊆ [lo, hi)? Gap endpoints within [lo, hi): his[j] >= lo and los[j+1] <= hi, so gap [his[j], los[j+1]) ⊆ [lo, hi). Yes! So merging is correct. But wait, is that true for all consecutive pairs in the range? Each interval in range overlaps/touches new, so yes, gap between consecutive in-range intervals lies inside [lo,hi)... Actually gap between j and j+1: his[j] could be < lo? No — his[j] >= lo by left condition (left = bisect_left(his, lo), so all indices ≥ left have his >= lo). Hmm, bisect_left(his, lo) gives first index with his[index] >= lo. Yes. And los[j+1] <= hi since j+1 < right = bisect_right(los, hi), so all indices < right have los <= hi. Yes. So merged interval = [min(lo, los[left]), max(hi, his[right-1])]. Correct.

Edge: empty set, left==right==0: just insert.

remove(lo, hi):
- overlapping intervals: [a,b) with a < hi and b > lo (strict, no touching merge for removal).
- left = bisect_right(self._his, lo) → first index with his > lo. (bisect_right gives first index where his[i] > lo.) Yes bisect_right returns insertion point after equal elements: all indices < left have his <= lo → not overlapping.
- right = bisect_left(self._los, hi) → first index with los >= hi; all indices ≥ right have los >= hi → not overlapping (a < hi required).
- Range [left, right): intervals with his > lo and los < hi → strictly overlap.
- Handle: pieces = []
  - if left < right:
    - if self._los[left] < lo: pieces.append([los[left], lo])
    - if self._his[right-1] > hi: pieces.append([hi, his[right-1]])
  - replace slice [left:right] with pieces.

contains(x):
- i = bisect_right(self._his, x) → first index with his > x; check i < len and self._los[i] <= x. O(log n).

total_length: maintain cached sum, update on modifications. Or compute sum(hi-lo) on call — 60k intervals sum is fine, but caching is easy. Just compute on demand; it's O(n) but fine. Actually cache for speed: maintain self._total. Let's cache.

intervals(): return list(zip(los, his)) as tuples. But merging touching on output — we already merge touching during add. Wait: do we? In add, touching intervals get merged (condition his >= lo includes equality). Yes, so intervals invariantly disjoint and non-touching. Good.

Hmm, but what about floats and the "touching" merge — [1,3)+[3,5) → [(1,5)] as required.

__len__: len(self._los).

Insertion performance: 60,000 adds of small disjoint intervals in random order — list insert/delete O(n) each, 60k * 60k/2 = 1.8e9 element moves... that's too slow in pure Python? List insert is C-level memmove, ~1.8e9 pointer moves might take a few seconds. Hmm. 60000 adds, average shift 30000 elements → 1.8e9 memmove bytes... memmove of 8-byte pointers, 60000 inserts each moving avg 30000*8 bytes = 240KB → total ~14GB of memmove — memmove is ~10GB/s, so ~1.5 seconds. Plus bisect O(log n) trivial. Should be OK under 5s. Actually list.insert memmove is very fast; 1.4GB... total bytes moved = 60000 * 30000 * 8 ≈ 14.4 GB → ~2-3s worst case. Hmm, "well under 5 seconds". Could be borderline. Alternative: use a skip-list or sortedcontainers (not stdlib). Could batch? Alternatively maintain a B-tree-ish structure. Simpler optimization: since lists are of floats/ints, keep two parallel lists; insert into both. Could use array-based? Alternatively store as a single sorted list of endpoints (2n endpoints)? Same issue.

Alternative: use `list` but reduce shifts by using slice assignment (same cost). Could use a different data structure: since 60000 disjoint intervals in random order — we could collect all first, then... but the spec wants incremental. I think plain list is acceptable; 14GB memmove at ~20GB/s for L3-resident? The list will be 60k*8*2 = ~1MB, fits in L2/L3 cache, memmove on cached data is ~30-100 GB/s. So ~0.2-0.5s. Fine.

Actually careful: bisect on list of numbers, keep self._los and self._his as parallel lists.

Also handle ints/floats mixed fine.

Write the code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_los", "_his", "_total")

    def __init__(self, intervals=None):
        self._los = []
        self._his = []
        self._total = 0.0  # hmm, keep original values; total could be int if all ints
```

total: sum of hi-lo. If ints, sum is int. Keep _total as number; start with 0 (int) and add hi-lo. But when replacing slices, recompute delta: subtract removed lengths, add new lengths.

Actually simpler: compute total lazily as sum(h - l for ...) — 60k intervals sum each call is fine (total_length not in perf requirement). But caching is trivial; I'll cache carefully.

Let me write add:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    los, his = self._los, self._his
    left = bisect_left(his, lo)
    right = bisect_right(los, hi)
    if left < right:
        lo = lo if lo <= los[left] else los[left]  # min
        hi = hi if hi >= his[right-1] else his[right-1]
        removed = sum(h - l for l, h in zip(los[left:right], his[left:right]))
        self._total -= removed
        del los[left:right]
        del his[left:right]
    else:
        # check touching neighbors? No — if left == right, no interval touches/overlaps.
        ...
```

Wait: if left == right, no merging, insert at position left. But position: insert so list stays sorted — left is first index with his >= lo... hmm, insertion index should be based on los. If left == right: intervals before left have his < lo (from bisect_left(his,lo)=left). Intervals at ≥ left have los > hi (bisect_right(los, hi) = left means los[left] > hi). So insert at index left works for both lists? los[left] > hi > lo so inserting lo at index left keeps los sorted? los[left-1] < lo? los[left-1] < his[left-1] < lo ✓. And his: his[left-1] < lo < hi ✓, his[left] > hi ✓ (los[left] > hi and his[left] > los[left]... his[left] > los[left] > hi ✓). Good.

Insert:
```python
    los.insert(left, lo)
    his.insert(left, hi)
    self._total += hi - lo
```

remove:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    los, his = self._los, self._his
    left = bisect_right(his, lo)
    right = bisect_left(los, hi)
    if left >= right:
        return
    self._total -= sum(h - l for l, h in zip(los[left:right], his[left:right]))
    pieces_lo = []
    pieces_hi = []
    if los[left] < lo:
        pieces_lo.append(los[left]); pieces_hi.append(lo)
        self._total += lo - los[left]
    if his[right-1] > hi:
        pieces_lo.append(hi); pieces_hi.append(his[right-1])
        self._total += his[right-1] - hi
    los[left:right] = pieces_lo
    his[left:right] = pieces_hi
```

contains:
```python
def contains(self, x):
    i = bisect_right(self._his, x)
    return i < len(self._los) and self._los[i] <= x
```

Wait: bisect_right(his, x) gives first index with his[i] > x. Interval i contains x iff los[i] <= x < his[i]. his[i] > x ✓ and los[i] <= x. But could an earlier interval contain x? his[i-1] <= x so no. ✓.

total_length: return self._total. Note: total as number; adding int keeps int; mixing keeps whatever. Initialize self._total = 0.

intervals: return list of tuples: `list(zip(self._los, self._his))` — zip gives tuples ✓.

__len__: return len(self._los).

__init__ maybe accept optional iterable of intervals? Not required. Keep simple: `def __init__(self): ...`. Could support optional initial pairs; not needed.

One more consideration: total_length caching — but `intervals()` doesn't modify. Fine.

Edge: `add` when left < right — merging: new lo = min(lo, los[left]) — but should also consider that los[left] might be < lo but the interval [los[left], his[left]) touches or overlaps; merged correctly. Also could interval left-1 now touch new merged? his[left-1] < lo (strict, bisect_left) ≤ new lo... his[left-1] < lo ≤ min(...). Could his[left-1] == new_lo? new_lo = min(lo, los[left]); his[left-1] < lo and los[left] > his[left-1] so los[left] != his[left-1]... los[left] > his[left-1]? Since intervals disjoint and sorted: los[left] >= his[left-1], and could equal if touching — but touching intervals are merged invariantly, so los[left] > his[left-1] strictly. And his[left-1] < lo strictly. So his[left-1] < new_lo strictly ✓. Similarly his[right-1] vs los[right]: los[right] > hi and los[right] > his[right-1]... los[right] >= his[right-1], strict by invariant. new_hi = max(hi, his[right-1]) < los[right]? his[right-1] < los[right] ✓; hi < los[right] ✓ (bisect_right(los, hi)=right means los[right] > hi). ✓ invariant maintained.

For floats: "touching" for floats like 0.1+0.2 — not an issue; exact equality semantics as required.

Check bisect with mixed int/float fine.

Total perf check on remove slice assignment: fine.

Also maybe implement __contains__ and __iter__? Not required but harmless. Keep minimal-ish; add __contains__ delegating to contains, __iter__ over intervals. Optional. I'll add them lightly.

Also `__repr__`? Not needed; skip to keep clean. I'll skip.

Write final code.