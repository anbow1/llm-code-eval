Implement with sorted list of intervals and binary search. Use `bisect` on a list of los. Merging touching intervals: half-open [1,3) and [3,5) merge into [1,5). Need equality check: lo <= existing.hi means merge (touching counts as merge). But for floats, merging touching is fine.

Performance: 60k add calls of disjoint intervals; naive insertion into list is O(n) each → 60k^2/2 comparisons = 1.8e9... too slow? Actually list insertion is memmove, fast in C. 60k inserts into list of up to 60k elements: memmove of pointers, ~60k*60k = 3.6e9 pointer moves worst case but memmove is very fast (~10 GB/s → 8 bytes each → 3.6e9*8 = 29GB → ~3s). Hmm, borderline. Random order small intervals — each insert shifts half the list on average. Actually bisect.insort does that. 60k inserts of ~60k-element list: average shift 30k elements * 60k inserts = 1.8e9 pointer copies = 14.4 GB memmove → ~1-2 seconds. Should be OK "well under 5 seconds". But we also need merging logic which may require merging neighbors — that's O(1) per insertion besides shifting.

Alternatively use a `sortedcontainers`? Not stdlib. Keep list-based.

Implementation: maintain `self._lo` (sorted list of los) and `self._hi` (corresponding his), plus a parallel list of tuples? Keep two parallel lists or one list of tuples with bisect on key... bisect on list of tuples compares tuples — works since intervals disjoint sorted, (lo, hi) sorted. Use list of [lo, hi] lists? Comparisons fine. Simpler: keep `self._ivs` list of [lo, hi] and use bisect with key function (Python 3.10+ bisect supports key). Python 3.11 → bisect.bisect_left(a, x, key=...) available.

add(lo, hi):
- if lo >= hi: return
- find position: use bisect to find range of intervals that could overlap/touch: intervals i with lo_i <= hi and hi_i >= lo... touching merge means interval [a,b) merges with [lo,hi) if a <= hi and b >= lo (i.e., b >= lo and a <= hi). Actually merge condition for half-open touching: they should be merged if they intersect or touch, i.e., a <= hi and b >= lo. Since disjoint sorted, find first interval with hi >= lo and last with lo <= hi.

Using list of tuples (lo, hi):
- i = bisect_left with key? With tuples, we can search: find idx of first interval whose hi >= lo. Hard with tuple key directly. Use two parallel arrays? Or use bisect with key=lambda iv: iv[0] for los and separate logic.

Let me use two lists: `self._lo`, `self._hi`. Sorted by lo; disjoint so also sorted by hi (since disjoint: interval i hi <= interval i+1 lo... not strictly: [1,3),[3,5): hi 3 <= lo 3 ok; equality possible but hi_i <= lo_{i+1} <= hi_{i+1}). So his are non-decreasing.

Add [lo,hi):
- Find leftmost interval index j such that hi_j >= lo. Since his non-decreasing, bisect_left(self._hi, lo) gives first index with hi >= lo.
- Find rightmost interval index k such that lo_k <= hi: bisect_right(self._lo, hi) - 1.
- If j > k: no overlap → insert [lo,hi) at position j (since lo > hi_j >= ... insertion index: intervals before j have hi < lo, and interval at j has hi >= lo and lo_j > hi (since k < j means lo_k... hmm need lo_j > hi). Insert at index j.
Wait check: intervals before j: hi < lo → no overlap. Interval at j..k: overlap/touch. If j > k, no overlapping intervals. Insert position: all intervals < j have hi_i < lo... but wait, we need lo ordering. Since lo sorted and interval j-1 has hi < lo, and hi_{j-1} <= lo_j... fine, insert at j. Actually insert position should be bisect_right(self._lo, lo)? Since interval at j-1 has lo <= hi_{j-1} < lo, so lo_{j-1} < lo → bisect gives j. And interval j has lo_j... if j <= k then lo_j <= hi. If j > k... k = bisect_right(lo, hi) - 1 < j means all lo_i for i >= j: lo_i > hi, so lo_j > hi > ... lo_j > hi >= nothing. Insert at min(j, len). OK.

- If j <= k: merged region: new interval [min(lo, lo_j), max(hi, hi_k)). Replace slices lo[j:k+1] = [new_lo], hi[j:k+1] = [new_hi].

Wait touching: interval [a,b) with b == lo: merging touching intervals required ([1,3)+[3,5)→[(1,5)]). Condition hi_j >= lo includes b == lo → merge. Good. Also interval with lo == hi_? interval [a,b) where a == hi: lo_a = hi <= hi. Condition lo_k <= hi includes equality → merge. Good. But careful: [1,3) and [3,5) as separate sets — the spec says touching intervals merged. But what about [1,2)∪[2,3) with remove... yes always merge on touch.

Hmm, but does "touching merge" apply to floats? [1.0, 3.0) + [3.0, 5.0) → merged. Yes, keep consistent.

remove(lo, hi):
- if lo >= hi: return
- j = bisect_left(self._hi, lo): first interval with hi >= lo → first that intersects (hi > lo means intersect; hi == lo means touching, no removal needed since [lo,hi) removal of touching doesn't matter... wait interval [a, lo): does removing [lo,hi) affect it? No. hi_j >= lo: if hi_j == lo, the interval is [a, lo), which doesn't intersect [lo,hi) (touching). Removal should NOT merge; removal doesn't merge anything. Condition for actual intersection in removal: interval intersects [lo,hi) iff lo_i < hi and hi_i > lo. So j = first i with hi_i > lo → bisect_right(self._hi, lo). k = last i with lo_i < hi → bisect_left(self._lo, hi) - 1... bisect_left gives first i with lo_i >= hi; k = that - 1.
- If j > k: nothing to remove.
- Else: process intervals j..k:
  - if lo_j < lo: the interval j overlaps on left: split → keep [lo_j, lo). Similarly if hi_k > hi: keep [hi, hi_k).
  - Simplest: handle via slices:
    - left piece: if self._hi[j] > lo... wait if j in range and lo_j < lo: replace interval j with [lo_j, lo).
    - right piece: if self._lo[k] < hi... hmm hi_k > hi: replace k with [hi, hi_k).
    - If j == k and both conditions: replace with two pieces? But j==k interval: lo_j < lo and hi_k > hi → interval contains [lo,hi) strictly → split into two. So delete interval j, insert [lo_j, lo) and [hi, hi_k)? That gives two intervals but they must be adjacent in list: order [lo_j, lo), [hi, hi_k). Insert both at position j.

    General approach: gather remaining pieces from j..k:
    pieces = []
    if self._lo[j] < lo: pieces.append((self._lo[j], lo))
    if self._hi[k] > hi: pieces.append((hi, self._hi[k]))
    del self._lo[j:k+1]; del self._hi[j:k+1]
    then insert pieces at j, with special case if pieces are two and j==k... Actually pieces at most 2, and if 2 pieces they must be the split case where left piece lo < right piece hi? left piece ends at lo, right starts at hi, lo < hi, so left < right in lo-order. But in sorted order at position j, left piece then right piece — but between them nothing else (they were one interval or adjacent ones). Order in list: positions j..k removed; left piece derived from interval j, right from k. If j < k: left piece belongs at position j (its lo = lo_j < lo <= all removed los... ), right piece at position k's slot. Pieces sorted: left (lo_j, lo) then right (hi, hi_k). Since lo < hi, left.first < right.first. But wait, are there intervals between left piece and right piece that were removed? Yes, all j..k removed. But right piece's lo = hi; intervals after k have lo > hi (lo_k... k was last with lo < hi, so lo_{k+1} >= hi; could lo_{k+1} == hi? bisect_left(lo, hi) gives first with lo >= hi, so lo_{k+1} could equal hi. But if lo_{k+1} == hi, then interval [hi, ...) touches [lo,hi) at hi — but for remove, touching doesn't matter. However inserting right piece [hi, hi_k) right after [lo_j...) at j: subsequent intervals start at lo_{j+1}... hmm, wait after deletion, position j in list is old k+1. Inserting [hi, hi_k) at j+1 (after left piece): the next existing interval has lo >= hi. If lo == hi, touching — but intervals must be disjoint and merged... [hi, hi_k) and [hi, x)? If original set was disjoint with touching merged, hi_k < lo_{k+1}? Actually hi_k <= lo_{k+1}, and merging means hi_k < lo_{k+1} unless... wait can hi_k == lo_{k+1} in a merged set? If [a,b) and [b,c) both existed they'd have been merged to [a,c). So in stored set, hi_i < lo_{i+1} strictly? Hmm: merge condition hi >= lo means when adding [2,5) to set containing [1,2)... they merge. So stored intervals satisfy hi_i < lo_{i+1}? No wait: [1,3) then remove nothing... Add [1,3), add [3,5) → merged [1,5). So stored: hi_i <= lo_{i+1}, with equality only possible... could equality arise? Add [1,3), add [2,5) → [1,5). Hmm, could [1,3) and [3,5) coexist? Only if... no, touching always merges in add. So actually hi_i < lo_{i+1} always? Consider add [1,3), add [3,5): merged. So stored intervals have hi_i < lo_{i+1} strictly. Hmm but wait — what about remove creating [1,2) and [3,5)? Fine, gap.

Actually can equality persist? Only add and remove. Add merges touches. Remove creates pieces strictly inside gaps. Split pieces: [lo_j, lo) and [hi, hi_k) — between them gap [lo, hi). Stored property: hi_i < lo_{i+1}? Let me verify: initially empty. Add always merges touching intervals, so any two adjacent stored intervals have a real gap between them... Do they? Merging condition in add: merge if intervals intersect or touch. After add, adjacent intervals are non-touching (gap > 0, i.e., hi < lo). So invariant: hi_i < lo_{i+1} strictly. Hmm, but is that required? The spec says intervals() merges touching. So yes invariant: strictly separated.

So actually with strict separation, bisect on hi with condition hi_j >= lo vs > doesn't matter? For add: touching must merge, so use hi_j >= lo (bisect_left). For remove: touching should not split — interval [a, lo) when removing [lo, hi): with strict separation invariant, can't have stored adjacent touching anyway... but interval [a,b) with b == lo can exist only if invariant says no. Wait invariant ensures no touching pairs among stored intervals, but a single interval's hi could equal the removed range's lo — that's not a pair issue. E.g., stored [1, 5), remove [5, 7): no effect. bisect: first hi > 5: hi=5 not > 5 → j = index after. With bisect_left(hi, 5): first hi >= 5 is the 5 itself → j points to [1,5) — wrong for removal (we'd need intersection, and [1,5) doesn't intersect [5,7)). So remove uses bisect_right(hi, lo) for j. Similarly k: last lo < hi → bisect_left(lo, hi) - 1. Interval [5,9) removing [3,5): lo=5, not < 5 → excluded. Good.

For add j: first interval with hi >= lo... wait must include those where hi == lo for merging: bisect_left(self._hi, lo). Hmm bisect_left returns first index where hi_i >= lo. Yes.

For add k: last interval with lo <= hi: bisect_right(self._lo, hi) - 1. Includes lo == hi (touching → merge). Good.

Add pieces when j > k: insert (lo, hi) at index j. But careful: with touching merge, could j > k but still valid insertion point conflicts? Insert index j: intervals before j have hi_i < lo... wait bisect_left(hi, lo): all i < j have hi_i < lo. And insertion at j keeps lo sorted: lo_{j-1} < ... need lo_{j-1} <= lo: hi_{j-1} < lo... lo_{j-1} < hi_{j-1} < lo? hi_{j-1} < lo and lo_{j-1} < hi_{j-1} → lo_{j-1} < lo. Good. And interval at j has lo_j... need lo <= lo_j: from k < j, bisect_right(lo, hi) - 1 < j → lo_j > hi ≥ lo... lo_j > hi. Good, insert at j.

When j <= k: new_lo = min(lo, lo_j) = lo_j (since lo_j <= hi_k... hmm lo_j vs lo: lo_j could be > lo? If j <= k then lo_j <= hi and hi_j >= lo. min(lo, lo_j) — yes need min since lo_j could be > lo (interval inside) or < lo. Use min. new_hi = max(hi, hi_k). Replace slice j..k inclusive.

Now check the invariant after add: previous interval j-1 has hi_{j-1} < lo_j <= new_lo? new_lo = min(lo, lo_j). hi_{j-1} < lo (from bisect). hi_{j-1} < lo_j (invariant). If new_lo == lo: fine. If new_lo == lo_j < lo: then hi_{j-1} < lo_j fine. Next interval k+1: lo_{k+1} > hi_k (invariant) and lo_{k+1} > hi (from bisect_right definition: k+1 = bisect_right(lo,hi) → lo_{k+1} > hi). new_hi = max(hi, hi_k) ≤ ... if new_hi == hi < lo_{k+1}... need lo_{k+1} > new_hi: lo_{k+1} > hi and lo_{k+1} > hi_k? invariant: lo_{k+1} > hi_k. Hmm invariant is strict hi_k < lo_{k+1}. Yes. So lo_{k+1} > max(hi... wait lo_{k+1} > hi (strict, from bisect_right) and lo_{k+1} > hi_k (invariant) → lo_{k+1} > max? No: lo_{k+1} > hi and lo_{k+1} > hi_k → lo_{k+1} > max(hi, hi_k) = new_hi. Good.

Remove: pieces left [lo_j, lo) and right [hi, hi_k) with strict gaps: left hi = lo; next stored interval after deletion... after deleting j..k, left piece at position j followed by right piece (if any) or old k+1: lo_{k+1} > hi > lo... lo of right piece = hi; left.hi = lo < hi = right.lo. Strict. And left piece preceded by j-1: hi_{j-1} < lo... need hi_{j-1} < lo_j = left.lo: invariant gives hi_{j-1} < lo_j. Wait but left piece exists only if lo_j < lo, so left.lo = lo_j, and hi_{j-1} < lo_j by invariant. Good. Right piece followed by old k+1: right.hi = hi_k < lo_{k+1}. Good.

contains(x): find i = bisect_right(self._lo, x) - 1; return i >= 0 and self._hi[i] > x. Since disjoint sorted with gaps, one lookup suffices. O(log n). ✓.

Wait — is hi_i > x correct? x in [lo_i, hi_i) iff lo_i <= x < hi_i. bisect_right(lo, x) - 1 gives last i with lo_i <= x. Return hi_i > x. But careful with invariant: intervals strictly separated so no other interval contains x. ✓.

total_length: sum(hi - lo for ...) — compute cached? Maintain running sum, updated in add/remove. Or compute on demand O(n). Fine to compute on demand, but caching is nicer; compute lazily with dirty flag or just maintain. I'll maintain `self._total` incrementally? Simpler: compute in intervals()-like manner each call — total_length may be called often? Spec doesn't demand O(1). Just compute sum each time; O(n) acceptable. Actually let me just compute.

But there's a subtlety: invariant of strict separation — the bisect on self._hi for add assumes his non-decreasing, which holds from sortedness by lo plus strict gaps (hi_i < lo_{i+1} < hi_{i+1}). ✓

Alternative simpler add implementation using merge condition with bisect over combined... the above is fine.

Edge: add when j <= k, need lo_j, hi_j, lo_k, hi_k before replacement — compute new_lo = min(lo, self._lo[j]), new_hi = max(hi, self._hi[k]).

Implement:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_lo", "_hi")

    def __init__(self, intervals=()):
        self._lo = []
        self._hi = []
        for lo, hi in intervals:
            self.add(lo, hi)

    def add(self, lo, hi):
        if lo >= hi:
            return
        los = self._lo
        his = self._hi
        j = bisect_left(his, lo)
        k = bisect_right(los, hi) - 1
        if j > k:
            los.insert(j, lo)
            his.insert(j, hi)
        else:
            nlo = lo if lo < los[j] else los[j]
            nhi = hi if hi > his[k] else his[k]
            los[j:k+1] = [nlo]
            his[j:k+1] = [nhi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los = self._lo
        his = self._hi
        j = bisect_right(his, lo)
        k = bisect_left(los, hi) - 1
        if j > k:
            return
        pieces = []
        if los[j] < lo:
            pieces.append((los[j], lo))
        if his[k] > hi:
            pieces.append((hi, his[k]))
        los[j:k+1] = []
        his[j:k+1] = []
        for idx, (a, b) in enumerate(pieces):
            los.insert(j + idx, a)
            his.insert(j + idx, b)

    def contains(self, x):
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Wait — remove when j == k and pieces has two entries: pieces = [(lo_j, lo), (hi, hi_k)] with lo_j < lo < hi < hi_k. Insert at j, j+1 → order correct. When j < k with two pieces: left from j, right from k; positions j and k differ but after deletion both inserted adjacent at j, j+1 — correct since everything between removed. ✓ Order (left, right): left.lo = lo_j, right.lo = hi; lo_j < lo < hi so ordering fine. But wait: bisect_right on his uses hi comparisons — mixed int/float comparisons fine.

Hmm, one more check on remove with pieces containing two tuples: inserting via insert() twice is O(n) each, fine.

Also `__init__` with optional param — spec doesn't forbid; keep simple no-arg, or accept iterable. I'll keep no-arg plus maybe accept iterable. Simpler: just no-arg with default.

Check add touching from left only: set has [3,5), add [1,3). j = bisect_left(his, 1) → first hi >= 1 → index 0 (hi=5). k = bisect_right(los, 3)-1 → los=[3], bisect_right → 1, k=0. Merge: nlo=min(1,3)=1, nhi=max(3,5)=5 → [1,5). ✓

Add disjoint: set {[1,2)}, add [5,6). j = bisect_left(his=[2], 5) → 1. k = bisect_right(los=[1],6)-1 = 0. j > k → insert at 1. ✓

Add inside: {[1,5)}, add [2,3): j: bisect_left([5],2)=0; k: bisect_right([1],3)-1=0. merge: nlo=min(1,2)=1, nhi=max(3,5)=5 → unchanged [1,5). ✓

Add spanning: {[2,3)}, add [1,5): j=bisect_left([3],1)=0, k=bisect_right([2],5)-1=0 → merge [1,5). ✓

Remove middle: {[1,10)}, remove [4,6): j=bisect_right(his=[10],4)=0; k=bisect_left(los=[1],6)-1=0. pieces: los[0]=1<4 → (1,4); his[0]=10>6 → (6,10). Delete, insert → [(1,4),(6,10)]. ✓

Remove covering: {[2,3)}, remove [1,5): j=bisect_right([3],1)=1; k=bisect_left([2],5)-1=0. j>k → nothing. ✓

Remove exact touch-left: {[1,3)}, remove [3,5): j=bisect_right([3],3)=1, k=bisect_left([1],5)-1=0 → j>k, nothing. ✓ Good.

contains on boundary: {[1,3)}: contains(3): bisect_right([1],3)-1=0, hi=3 > 3 false. ✓ contains(1): i=0, 3>1 true. ✓

Also should total_length handle empty: sum of empty = 0. ✓

Performance: 60k adds disjoint random order: each add O(log n) + list insert O(n) memmove → fine. 200k contains O(log n). Well under 5s. ✓

Maybe also maintain cached length... not needed.

I'll also add type-tolerant handling (ints/floats mixed) — comparisons work naturally.

Final code.