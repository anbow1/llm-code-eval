Implementation: sorted list of intervals with bisect. add: find overlaps, merge. Using bisect on list of tuples (lo, hi).

Key issue: adding intervals in random order — add needs to insert and merge neighbors. Using a plain list with bisect: each add does O(log n) search plus O(n) insert shift. With 60,000 adds of small disjoint intervals in random order, insertion into a Python list of ~60k tuples: list.insert is memmove, very fast (60k * 60k/2 * small constant... actually 60000 inserts into list of avg 30k elements = 1.8e9 element moves via memmove — that's ~ seconds? memmove of 30k pointers = 240KB per insert, 60k inserts = 14.4 GB moved... that might be ~2-3 seconds. Hmm. Actually memmove is very fast, ~10 GB/s, so ~1.5s. Plus bisect etc. "well under 5 seconds" — probably fine, but list.insert of tuples... Let's think: 60000 inserts × 30000 average elements × 8 bytes = 14.4 GB. At ~10GB/s that's 1.4s. Should be OK. But careful: also removal/splice operations.

contains: binary search on los. Use bisect with key? Python 3.10+ bisect supports key. Store list of tuples; bisect on tuples compares tuples — fine.

Let me design:

self._starts = sorted list of lo values
self._ends = parallel list of hi values

add(lo, hi):
  i = bisect_left(_starts, hi) — first interval with start >= hi... Actually intervals overlapping/touching [lo,hi): those with end >= lo and start <= hi. We want to find range of intervals to merge: intervals with end >= lo (they may merge) and start <= hi.

Use bisect: idx = bisect_left(_ends, lo) gives first interval with end >= lo. These intervals could overlap or touch [lo,hi). Then iterate while _starts[j] <= hi: they touch. But iterating is O(k). Since adds are small disjoint intervals, k is small. But worst case: adding a huge interval over many small ones — merging k intervals, removal cost. Fine, amortized.

Simpler approach: 
- Find first interval index i such that interval end >= lo: i = bisect_left(ends, lo).
- Find last interval index j such that start <= hi: intervals with start <= hi merge (touching merges since [a,b)+[b,c)->[a,c)). j = bisect_right(starts, hi).
- If i >= j: no overlap/touch; insert at position i (or bisect on starts for lo)... insert lo at bisect_left(starts, lo), hi at same index.
- Else: new_lo = min(lo, starts[i]); new_hi = max(hi, ends[j-1]); replace slice [i:j] with single interval.

Wait careful with bisect_left(ends, lo): intervals with end == lo touch [lo,...)? [a, lo) and [lo, hi): touching, should merge into [a, hi). end == lo means interval [a, lo). Since half-open intervals at integer boundaries — merging touching is required. But is [a,lo) ∪ [lo,hi) the same set as [a,hi) for reals? Yes, empty gap. So end == lo merges. bisect_left(ends, lo) gives first index where ends[idx] >= lo. Correct.

Similarly starts <= hi merges: [hi, c) touches [lo, hi). bisect_right(starts, hi) gives last index+1 where starts <= hi. Correct.

Edge: lo >= hi ignored; also hi == lo means empty.

But careful: if i < j, we merge. new_lo = min(lo, starts[i]), new_hi = max(hi, ends[j-1]). If the interval at i has start < lo... starts[i] could be >= lo? If starts[i] = lo... fine, min. new_hi = max(hi, ends[j-1]).

Slice assignment: starts[i:j] = [new_lo], similarly ends. List slice assignment with insert: if i==j, insertion.

For contains(x): i = bisect_right(starts, x) - 1; return i >= 0 and ends[i] > x.

Total length: sum(hi - lo) — maintain incrementally or compute; compute on demand O(n) fine, but maintain a running total for efficiency. Maintain self._total.

remove(lo, hi):
- Overlapping intervals: those with end > lo and start < hi. i = bisect_right(ends, lo) — wait end > lo: bisect_right(ends, lo) gives first index with end > lo. Hmm: interval with end == lo is [a, lo), removal of [lo,hi) doesn't affect it. So first affected index: bisect_right(ends, lo).
- Last affected: start < hi: bisect_left(starts, hi).
- Handle partial overlaps at boundaries:
  if i < j:
    left piece: if starts[i] < lo: piece [starts[i], lo)
    right piece: if ends[j-1] > hi: piece [hi, ends[j-1])
    Replace starts[i:j] and ends[i:j] with pieces.

Build new pieces list:
pieces = []
if i < j:
  if starts[i] < lo: pieces.append((starts[i], lo))
  if ends[j-1] > hi: pieces.append((hi, ends[j-1]))
else: no-op.
Replace: starts[i:j] = [p[0] for p in pieces], ends[i:j] similarly. Update total.

Careful: after computing pieces from old arrays before modification. Do computation first, then slice assign.

Also careful in remove: starts/ends values must be original, no rounding — fine.

Total maintenance in add:
removed length = sum(ends[i:j] - starts[i:j]) over merged region when merging... For add with i<j: region [i:j] removed and replaced with one. Compute old_sum = sum(ends[k]-starts[k] for k in range(i,j)); new contribution = new_hi - new_lo; total += new_hi - new_lo - old_sum. For insertion case (i==j): total += hi - lo.

Hmm but if i == j in add — is it insertion? i==j means no intervals with end>=lo and start<=hi overlap... Actually if i==j, no merging intervals; but is insertion position i correct? Position i = bisect_left(ends, lo) — first interval with end >= lo. All intervals before i have end < lo. The new interval [lo,hi) must come after all intervals with end < lo... but intervals before i could still have end < lo and start >= lo? Not possible since sorted disjoint: start < end, and disjointness means starts increasing, ends increasing too (disjoint non-touching means ends[i] <= starts[i+1]). Actually ends are also sorted (since disjoint sorted intervals have ends[i] <= starts[i+1] < ends[i+1]). So bisect_left(ends, lo) is correct insertion point by lo too? Interval before i has end < lo, so its end <= lo < hi. Interval at position i has end >= lo. If insertion at i, new interval's end = hi, need hi <= starts[i]? Since no merge, i==j means bisect_right(starts, hi) == i, so starts[i] > hi (if i < len). So ends sorted maintained. Good.

But wait — do ends remain sorted after merge operations? Merged intervals disjoint after operations, so yes.

Actually simpler: store list of tuples and bisect with key... bisect with key on list of tuples: bisect_right(intervals, x, key=lambda t: t[0])? key applies to list elements. In Python 3.10+, bisect supports key which is applied to list elements and the x? No — key applied to x too? Let me recall: bisect functions with key: "key specifies a key function of one argument that is used to extract a comparison key from each element in the array". The x is also passed through key? Actually per docs: "The key argument... is applied to the value being searched for as well as to the elements"? Hmm. Let me recall: In bisect, if key is provided, it's applied to each element of a, and to x. Checking: from bisect docs: "key specifies a key function of one argument that is used to extract a comparison key from each element in the array. ... To support searching complex records, the key function is applied to the x as well"? Actually the docs say the key is applied to x too? Let me recall: bisect_left(a, x, key=...) — "The key argument... is applied to each element in the array, not to x"? No: from CPython docs: "key specifies a key function of one argument that is used to extract a comparison key from each element in the array (and the value being searched for)". Hmm, actually the searched value is NOT passed through key in bisect? Let me think — in the example docs they show: `bisect.bisect_left(events, ('remove', 9, ''), key=lambda e: e[2])` — comparing element[2] with 9 directly, and x = 9? Wait, x there is ('remove', 9, '') and key applied to x gives ''. Hmm the example: bisect(events, ('remove', 9, ''), key=lambda e: e[2]) — key applied to elements extracts time, and applied to x extracts ''? That doesn't compare with 9. Hmm, actually docs say: "The key function is applied to the middle element" — the comparison is key(a[mid]) < x, not key(x). Yes! In bisect, key is applied only to array elements, and x is compared directly. That's how the example works: key(events[mid]) = time compared with ('remove', 9, '')... no wait they compare with ('remove', 9, '')... Actually the example inserts based on time only... The tuple ('remove', 9, '') compared with a number? No.

Hmm. Let me just not rely on that ambiguity — using parallel lists avoids it entirely. Two lists: starts, ends. Or one list of tuples and bisect directly on tuples works since tuple comparison: bisect_right(ivals, (x, inf))? For floats, math.inf exists, tuples compare lexicographically — but "keep original values" — comparison-only is fine. bisect on list of tuples with x as tuple works. But parallel lists are clearer and faster. I'll use parallel lists.

Actually simpler to keep a single sorted list of [lo, hi] lists or tuples, and for contains use bisect on lo values via a separate starts list... maintaining one structure is cleaner. I'll keep two parallel lists: self._lo, self._hi.

Implementation:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(his, lo)
        j = bisect_right(los, hi)
        if i < j:
            if los[i] < lo:
                lo = los[i]
            if his[j-1] > hi:
                hi = his[j-1]
            old = 0
            # compute sum of removed lengths
            ...
```

Computing old sum O(j-i). For 60k disjoint adds each j-i is small (1 or so). Fine.

Alternatively maintain total incrementally: total -= each removed, then += final. Use loop.

add:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    los, his = self._lo, self._hi
    i = bisect_left(his, lo)
    j = bisect_right(los, hi)
    delta = hi - lo
    if i < j:
        delta -= sum(his[k] - los[k] for k in range(i, j))
        if los[i] < lo:
            lo = los[i]
        if his[j-1] > hi:
            hi = his[j-1]
        los[i:j] = [lo]
        his[i:j] = [hi]
    else:
        los.insert(i, lo)
        his.insert(i, hi)
    self._total += delta
```

Wait delta when merging: new interval length (hi-lo) minus sum of merged lengths. But careful: merged interval length is max(hi, his[j-1]) - min(lo, los[i]) which equals new computed hi - lo. delta = (hi - lo) initial? No — initial delta = hi - lo is the inserted interval length; we must subtract existing intervals being merged/overlapped. The sum over k in range(i,j) of his[k]-los[k] is exactly the total length of intervals that intersect [lo,hi)... hmm, do all intervals in [i, j) intersect/touch [lo, hi) wholly? Interval k in [i,j): his[k] >= lo (since k>=i) and los[k] <= hi. If it merely touches at lo (his[k] == lo, los[k] <= hi): its length should be subtracted since merged. Yes. If it touches at hi (los[k] == hi): included, subtract, correct since merged interval covers union = union = new merged. But is merged region contiguous covering everything? The union of [lo,hi) and intervals [i,j) — each interval k in [i,j) has his[k] >= lo and los[k] <= hi. Are they contiguous with [lo,hi)? Interval with his[k] in (lo, hi) overlaps. Interval with his[k] == lo: touches. Interval with los[k] == hi: touches. So union is [min(lo,los[i]), max(hi,his[j-1])). And that union's length = new hi - new lo (after updates). delta = new_len - sum(removed). Correct.

But subtlety: could interval in [i,j) be entirely left of lo touching? his[k] >= lo, so no. Entirely right of hi touching: los[k] <= hi, so touching at hi, fine.

remove:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    los, his = self._lo, self._hi
    i = bisect_right(his, lo)   # first interval with hi > lo
    j = bisect_left(los, hi)    # first interval with start >= hi
    if i >= j:
        return
    new = []
    if los[i] < lo:
        new.append((los[i], lo))
    if his[j-1] > hi:
        new.append((hi, his[j-1]))
    delta = 0
    for k in range(i, j):
        delta += his[k] - los[k]
    # replacement pieces
    los[i:j] = [p[0] for p in new]
    his[i:j] = [p[1] for p in new]
    self._total -= delta
```

delta = sum of removed portions? Removed portion from interval k is its intersection with [lo,hi). Sum of intersections = hi - lo (since union of intersections of a contiguous run... intervals i..j-1 intersect [lo,hi), and their intersections within [lo,hi) tile it? Interval i partially cut on left, j-1 partially on right, middle fully covered — yes union of intersections = [lo, hi), and they're disjoint, so total removed = hi - lo). So delta = hi - lo. 

Total removed length = hi - lo. So self._total -= (hi - lo). No loop needed.

contains(x):
```python
def contains(self, x):
    los, his = self._lo, self._hi
    i = bisect_right(los, x) - 1
    return i >= 0 and x < his[i]
```
O(log n)? bisect on ints/floats comparisons — yes logarithmic... but wait: bisect on list compares tuples pairwise? bisect_right(los, x) compares floats — each comparison O(1). Good.

But wait: is los sorted strictly? Yes disjoint nonempty intervals have strictly increasing starts.

intervals():
```python
def intervals(self):
    return list(zip(self._lo, self._hi))
```
Returns tuples. zip gives tuples. Good.

__len__: return len(self._lo).

total_length(): return self._total.

Edge: floats and ints mixed fine.

Check add merging with the i,j logic once more with example: empty set, add (1,3), then add (3,5).
his=[], los=[] → i=0, j=0, i<j false → insert at 0: los=[1], his=[3]. total=2.
add (3,5): i = bisect_left([3], 3) = 0 (3>=3, bisect_left finds first index where value >= 3 → index 0). j = bisect_right([1], 5) = 1. i<j: delta = 5-3=2; sum over k in [0,1): his[0]-los[0]=2 → delta=0. los[0]=1 < 3 → lo=1. his[0]=3 > 5? no. Replace: los=[1], his=[5]. total = 2+0=2. intervals: [(1,5)]. ✓

add (6,8) after: i = bisect_left([5],6)=1, j = bisect_right([1],8)=1 → insert at 1. ✓

remove (2,4) from [(1,5)]: i = bisect_right([5], 2) = 0? bisect_right([5],2): values <= 2 go left; 5>2 → index 0. j = bisect_left([1],4)=1. i<j: los[0]=1<2 → piece (1,2); his[0]=5>4 → piece (4,5). total -= 4-2=2. ✓

contains: x=4? in [(1,2),(4,5)]: bisect_right([1,4],4)=2, i=1, his[1]=5, 4<5 → True ✓. x=2: bisect_right → 1, i=0, his[0]=2, 2<2 False ✓.

One concern about performance of remove slice assignment creating small lists — fine.

Another concern: bisect_left(his, ...) with mixed types int/float — comparisons work.

Also should intervals() return copies — zip creates new tuples, fine.

Handle potential negative? Fine.

Note: total_length should reflect floating sums; incremental is fine.

Also add: when i==j insertion — but could there be intervals that overlap but bisect indices say otherwise? Interval overlapping [lo,hi) has his[k] > lo and los[k] < hi strictly. bisect_left(his, lo) — first with his >= lo; overlapping intervals have his > lo so index >= i. bisect_right(los, hi) — overlapping have los < hi, so index < j. Touching at left: his == lo → included at i (we want merge). Touching at right: los == hi → included (index < j since bisect_right includes equal). But bisect_left on his includes his == lo → interval [a, lo) included in merge range, merged if j > i. If interval [a,lo) exists and nothing else: i = index of that interval (his=[lo])... los=[a], his=[lo]. add(lo2, hi2) with lo2 == lo. i = bisect_left(his, lo) = 0. j = bisect_right(los, hi2) = 1 (a < lo < hi2? a < lo, lo <= hi2, so a <= hi2, bisect_right gives index where all elements <= hi2... bisect_right([a], hi2) = 1 since a < hi2). i<j: merge. Check contiguity: his[i] = lo == new lo, touching → merged union [a, hi2). Our computation: lo = min(lo2, los[0]) = a. hi = max(hi2, his[j-1]=lo) = hi2. ✓ delta = hi2 - lo2 - (lo - a) = (hi2 - a) - (lo - a) = hi2 - lo ✓.

All good. Final code.