Half-open intervals [lo, hi). Key subtlety: merging touching intervals [1,3) + [3,5) → [1,5). But removal: removing [3,5) from [1,5)? Should split into [1,3). But if we merged [1,3)+[3,5) into [1,5), removing [3,5) gives [1,3) — fine. But what about removing a point? remove(3,3) is ignored (lo>=hi). contains on half-open: contains(3) with [1,3)? No. So merging touching is safe because contains uses strict lo <= x < hi.

Use sorted list of intervals. For performance with 60,000 adds: naive insert into list with bisect and merging — each add could be O(n) due to list insertion; 60,000 adds each O(n) is 60,000^2/2 = 1.8e9 — too slow? Actually list insertion is memmove, fast in C, but merging requires scanning neighbors. With bisect, finding position is O(log n), insertion O(n) memmove which is fast (60k * avg 30k elements * 8 bytes... that's ~1.8e9 bytes moved total = fine, ~seconds? memmove of 240KB per insert * 60k = 14GB moved... hmm, that's maybe 1-2 seconds). Actually average insert position mid → move ~30k pointers = 240KB per insert, 60k inserts → 14.4 GB memmove. memmove bandwidth ~10GB/s → ~1.5s. Plus merging neighbors. Borderline. Better to use a different structure.

Alternative: use a list but batch? Simpler: use `sortedcontainers`? Not stdlib. 

Option: use a skip-list or a balanced BST. Or use bisect on two parallel arrays (los, his) and do insertions... same cost.

Alternative approach: keep intervals in a list sorted by lo; for add, use bisect to find overlapping range, then slice-merge. The insertion into list is the O(n) part. 60,000 small disjoint intervals in random order — insertion at random positions. memmove cost: total elements moved ≈ n²/4 = 9e8 pointers = 7.2GB. ~1s in C. Probably acceptable "well under 5 seconds". contains 200,000 with bisect: trivial.

Actually let's think: list.insert uses memmove of pointers (8 bytes each). 60k inserts, avg 15k... wait random position → avg half the list = 30k elements? For random insertion into growing list, average shift is n/2 at time of insert, sum over n = n²/4 = 9e8 element moves = 7.2 GB. At ~20GB/s memmove, ~0.36s. Fine.

But merging logic: for add(lo,hi), find all intervals overlapping-or-touching [lo,hi): intervals where start <= hi and end >= lo. Touching (end == lo or start == hi) should merge. Use bisect on los.

Let me maintain a single list `self._ivs` of [lo, hi] lists sorted by lo. 

add(lo, hi):
- if lo >= hi: return
- i = bisect_left on los for lo... we need intervals with hi >= lo (touching). Since intervals are disjoint and sorted, and his are also increasing (disjoint sorted intervals have increasing hi). Find first interval with hi >= lo: bisect on his. And last interval with lo <= hi: bisect_left on los for hi.

Using bisect with a key: Python 3.10+ bisect supports key. bisect.bisect_right(self._his, lo) gives first index with his[j] > lo — intervals with hi > lo overlap or touch. Actually interval with hi == lo touches and should merge. So start index = bisect_left(self._his, lo) gives first hi >= lo. Hmm, intervals with hi == lo: can that happen? Disjoint sorted intervals: [1,3),[3,5) would be merged, so hi of one never equals lo of next. So hi values strictly increasing and no touching. So start = bisect_left(his, lo): first index with hi >= lo; since no equality, hi > lo, meaning overlap. But wait, after add we merge touching, so invariant: consecutive intervals never touch (hi < next lo strictly). Good.

End index: last interval with lo <= hi: j = bisect_right(los, hi). Intervals [start, j) all overlap/touch [lo,hi)? Check: interval k with start <= k < j has lo <= hi... wait bisect_right(los, hi) gives first index with los > hi. Intervals before that have lo <= hi. Combined with hi > lo (from start index), they overlap or touch. Hmm, interval with lo == hi? Can't happen (lo < hi enforced). Interval with lo == hi means empty — never stored. So intervals with lo == hi touching... interval [a,b) and new [b, hi): merged. Interval with lo == hi exactly: new interval [lo,hi), old [x, lo)? hi of old == lo, handled by start index. Old [lo, y): lo == lo, overlap.

So: overlapping range is [i, j) where i = bisect_left(his, lo), j = bisect_right(los, hi). Hmm wait, need to double check i vs j consistency: intervals in [i, j) satisfy his[k] >= lo (i.e., > lo) and los[k] <= hi. But is every interval in [i,j) actually overlapping? Interval k in [i,j): his[k] > lo and los[k] <= hi... but also need los[k] < his[k] fine and his[k] > los[k]. Overlap/touch condition: los[k] < hi... wait los[k] <= hi with lo==hi impossible... los[k] < hi? If los[k] == hi, interval [hi, y) touches new [lo, hi) at hi. Merging [lo,hi) with [hi,y) → [lo,y). Touching should merge per spec. And his[k] >= lo i.e. his[k] > lo (equality impossible): interval ending at lo would touch. So range [i,j) — but actually is it contiguous that all these overlap the new interval? Interval k: needs max(los[k], lo) < min(his[k], hi) OR touch. his[k] > lo means interval extends past lo. los[k] <= hi means interval starts at or before hi. If los[k] < hi: overlap or touch on left... interval [x, y) with x <= hi and y > lo: they intersect as sets unless x == hi... x <= hi and y > lo. Interval intersects (lo, hi) region? The intersection [max(x,lo), min(y,hi)) is non-empty iff max(x,lo) < min(y,hi). x <= hi, y > lo. If x < hi and y > lo then max(x,lo) < hi... hmm if x < hi and y > lo: max(x,lo): if x >= lo then max = x < hi, min(y,hi) >= y > lo... need max < min: max(x,lo) < min(y,hi). If x >= lo: x < hi and min(y,hi) > lo ≥ ... y > lo and hi > lo so min > lo, and x < hi, x < y? x < hi <= y? no, y could be < hi. min(y,hi): x < hi but x vs y unknown. Hmm, but since sorted disjoint: x < y, and previous intervals... Let me trust: intervals between i and j in sorted order — the set of intervals overlapping [lo,hi) is contiguous in sorted order. i is first interval with y > lo (extends past lo, so overlaps or touches if x < hi... but also x could be > hi? If x > hi then interval entirely after hi, but x <= hi required by j bound). j is one past last interval with x <= hi. So intervals in [i,j) have y > lo and x <= hi → they overlap [lo,hi) (touch counts). Intervals with index < i have y < lo (strictly, since y == lo impossible? y == lo means touching — hmm, y == lo: interval [a, lo) touches [lo, hi) at point lo, but point lo not in either (half-open)... [a,lo) and [lo,hi): union as sets of points: {x: a<=x<lo} ∪ {x: lo<=x<hi} = {x: a<=x<hi} since lo belongs to second. So merging is correct and y == lo can occur? After merging we'd combine, so invariant maintained. But during computation, could stored intervals have y == lo for the new lo? Only if previous merge left them — no, invariant: no stored interval's hi equals another's lo. But a stored interval's hi could equal the new lo only if it equals... invariant says his are strictly increasing and gap between consecutive: hi[k] < lo[k+1]. Could hi[k] == lo (new)? Yes possible: [1,3) stored, add [3,5). Then his[k] == 3 == lo. Should merge. So i should be bisect_left(his, lo) → first index with his >= lo, capturing his == lo. Good, that's what I had. And intervals with index < i have his < lo, no overlap. Intervals with index >= j have los > hi... los == hi possible? [5,7) stored, add [3,5): los == 5 == hi. Touch → merge. bisect_right(los, hi) includes los == hi. Good. Intervals at index >= j have los > hi, no overlap (their hi > lo > ... their los > hi means entirely right).

Then merged interval: new_lo = min(lo, los[i]) if i < j else lo; new_hi = max(hi, his[j-1]) if j > i else hi. Replace slice [i:j] with one interval.

But careful with i > j? Could i > j happen? i = first with his >= lo; j = first with los > hi. Interval k in [j, ...): los[k] > hi >= lo... his[k] > los[k] > hi >= lo so his[k] > lo... wait his[k] > hi >= lo → his[k] >= lo → k >= i. So j <= i. So range [i, j) is empty when j < i? If j < i: intervals in [i, ...) have his >= lo; intervals in [..., j) have los <= hi. If j < i, then interval j: los[j] <= hi and j >= ... hmm interval j has los[j] <= hi, and index j < i so his[j] < lo. So interval j is entirely left of lo: los[j] <= his[j] < lo <= hi. Fine, no overlap. And interval i: his[i] >= lo, los[i] > hi? los[i] > hi since i >= j... if i > j then los[i] > hi, entirely right. If i == j... then no overlap? i == j: interval i has his[i] >= lo and los[i] > hi → los[i] > hi >= lo... wait if los[i] > hi and his[i] >= lo — interval entirely to the right of hi (since los[i] > hi). But his[i] >= lo trivially. Hmm, and intervals before i have his < lo → entirely left. So i == j means no overlap. But wait, what if interval i has los[i] > hi but his[i] >= lo — contradiction with los[i] < his[i]? los[i] > hi >= lo, and his[i] > los[i] > hi. OK consistent. So overlapping range is [i, j) where possibly j < i, treat as empty: overlap only if i < j. Let me define: if j > i: merge slice. Actually hmm, when j > i, are all in [i,j) overlapping? Interval k in [i,j): his[k] >= lo (since k >= i) and los[k] <= hi (since k < j). los[k] <= hi and his[k] >= lo, with los[k] < his[k]: overlap or touch. Yes.

Hmm wait, but touch: los[k] == hi → touch, merge. his[k] == lo → touch, merge. But is "touch" always desired for add? Spec says touching intervals merged. Yes.

Edge: i could equal len, j could equal 0 etc.

Implementation with two parallel lists `self._los`, `self._his` for bisect speed, or one list of tuples with key. bisect with key parameter: bisect_left(self._ivs, lo, key=lambda iv: iv[1]) — key function call overhead per comparison ~ fine for 60k*17 comparisons. But simpler: parallel arrays.

Let me use two lists self._lo, self._hi.

add(lo, hi):
```
if lo >= hi: return
i = bisect_left(self._hi, lo)
j = bisect_right(self._lo, hi)
if i >= j:
    self._lo.insert(i, lo); self._hi.insert(i, hi)
else:
    nlo = min(lo, self._lo[i])
    nhi = max(hi, self._hi[j-1])
    self._lo[i:j] = [nlo]
    self._hi[i:j] = [nhi]
```

Wait — need i >= j check: if i >= j no overlap, insert at position... where? Position should be i (first interval with hi >= lo → insert before it). But also must be >= j? If j > i we merge. If i >= j, insert at index i. Check: all intervals before i have hi < lo → they're left. All intervals from i have hi >= lo... and since no overlap, interval i has lo > hi (as shown when i >= j, los[i] > hi... wait when i == j, los[i] > hi; when i > j, los[i] > hi too since i >= j and intervals from j onward have los > hi). So inserting at i is correct sorted position (new lo < los[i] since hi < los[i] and lo <= hi). Good.

remove(lo, hi):
```
if lo >= hi: return
i = bisect_right(self._hi, lo)   # first interval with hi > lo (strict, since point lo excluded... interval with hi == lo touches but removing [lo,hi) doesn't affect [a, lo) — half-open, [a,lo) doesn't contain lo. But hi == lo can't happen by invariant anyway. Use bisect_right(hi, lo): first with hi > lo. Since invariant no equality, bisect_left same.
j = bisect_left(self._lo, hi)    # first interval with lo >= hi; interval with lo == hi impossible. Intervals [i, j) overlap (lo, hi)? Need actual overlap (not touch): his[k] > lo and los[k] < hi.
```
Hmm: intervals overlapping the open region being removed: need los[k] < hi and his[k] > lo. i = bisect_right(self._hi, lo): first with hi > lo. j = bisect_left(self._lo, hi): first with lo >= hi. Intervals in [i, j): his > lo, los < hi → genuine overlap. For k in [i,j):
- if los[k] < lo and his[k] > hi: split into [los[k], lo] and [hi, his[k]].
- elif los[k] < lo: truncate to [los[k], lo].
- elif his[k] > hi: truncate to [hi, his[k]].
- else: remove entirely.

Implementation:
```
if i >= j: return
# handle split of first interval if it spans
pieces_lo, pieces_hi = [], []
if self._lo[i] < lo < self._hi[i] and self._hi[i] > hi:
    # spans: but lo < hi <= ... check los[i] < lo and his[i] > hi
```
Simpler: build replacement list.
```
new_lo = []
new_hi = []
if self._lo[i] < lo:
    new_lo.append(self._lo[i]); new_hi.append(lo)
if self._hi[j-1] > hi:
    new_lo.append(hi); new_hi.append(self._hi[j-1])
self._lo[i:j] = new_lo
self._hi[i:j] = new_hi
```
Wait: first interval in [i,j) may have los[i] < lo → keep left part [los[i], lo). Last interval may have his[j-1] > hi → keep right part [hi, his[j-1]). Middle intervals removed entirely. But if only one interval in range and it spans: both conditions → two pieces. Correct. But careful: middle intervals: those strictly between i and j-1... intervals k with i < k < j-1: los[k] >= lo? Since sorted and los[k] > los[k-1]... hmm los[i] < lo possible, then los[i+1] > los[i]; is los[i+1] >= lo? his[i] <= lo (since interval i truncated at lo, his[i]... wait his[i] could be > lo obviously; los[i+1] >= his[i] > los[i]... need los[i+1] >= lo: los[i+1] >= his[i] > ... his[i] >= lo? Interval i overlaps removal region: his[i] > lo. So los[i+1] >= his[i] > lo... his[i] > los[i], and invariant his[i] <= los[i+1] (no touching, strict). his[i] > lo → los[i+1] > lo. So middle intervals have los > lo, and los < hi (in range), his <= hi? his[k] for k < j-1: his[k] < los[k+1] <= ... los[j-1] < hi? Interval j-1 overlaps: los[j-1] < hi. So his[k] < los[j-1]... his[k] <= los[k+1] <= his[k+1] < ... < los[j-1] < hi. So middle intervals fully inside removal. Good, removal correct.

Edge: if i == j-1 (single interval) and it spans: both pieces appended, slice replaced with two. Good.

contains(x): i = bisect_right(self._hi, x) - 1... find interval with hi > x and lo <= x: idx = bisect_left(self._hi, x) → first with hi >= x; invariant no equality so hi > x. Then check idx < len and self._lo[idx] <= x. Return 0 <= idx < len and self._lo[idx] <= x. O(log n). 

Actually bisect_left(self._hi, x): first index with _hi[idx] >= x. Since no stored hi equals... hi could equal x! Stored interval [1,3), contains(3) → False (half-open). bisect_left gives index of interval with hi == 3 = interval [1,3) at some index; check _lo <= 3 → True → wrong! Need hi > x. Use bisect_right(self._hi, x): first with hi > x. Then check lo <= x. Good.

total_length: maintain running sum incrementally, or sum(hi-lo) each call. Maintain incrementally: on add, add (nhi - nlo - sum of removed lengths)... simpler: compute delta = (new coverage) - (old coverage of [i,j)). Let me just recompute: when merging, old_len = sum(his[i:j]) - sum(los[i:j])? That's O(k). Fine — or track self._total: total += (nhi - nlo) - (sum of old removed lengths). To avoid O(k) sum... it's fine, but simpler: keep total and update: removed_len = sum(self._hi[i:j]) - sum(self._lo[i:j]) — O(k) per op, worst case O(n) → 60k adds each merging... but 60k small disjoint intervals — merges rare. Worst case adversarial fine anyway. Actually sum over slice is C-speed. OK.

For add with no overlap: total += hi - lo. With overlap: total += (nhi - nlo) - (old total of slice).

remove: removed_len = sum(his[i:j]) - sum(los[i:j]); then add back pieces lengths. Simpler: compute before = sum over slice, after = sum of new pieces; total += after - before.

intervals(): list(zip(self._lo, self._hi)).

__len__: len(self._lo).

Performance of inserts: list.insert / slice assignment — memmove, fast.

One more consideration: floats and ints mixed — comparisons fine. Keep original values: yes, we store as given.

Invariant check "no touching": after add merging, could result touch a neighbor? New merged [nlo, nhi] where nhi = max(hi, his[j-1]); next interval at index j has los[j] > hi (since j = bisect_right(los, hi), los[j] > hi) and los[j] > his[j-1] (invariant). Could los[j] == nhi? nhi = max(hi, his[j-1]); los[j] > hi and los[j] > his[j-1] → los[j] > nhi. Good. Previous interval i-1: his[i-1] < lo (bisect_left(his, lo) → his[i-1] < lo) and his[i-1] < los[i] invariant. nlo = min(lo, los[i]) > his[i-1]. Good. Similarly for remove: pieces [los[i], lo): his = lo; next... interval i's piece ends at lo; previous interval i-1: his[i-1] < ... his[i-1] <= los[i]... need his[i-1] < lo. Since i-1 < i = bisect_right(his, lo) → his[i-1] <= lo. Equality? his[i-1] == lo possible? Invariant says his[i-1] < los[i], and los[i] < his[i]... his[i-1] == lo: then interval i-1 = [a, lo) and we remove starting at lo — [a,lo) unaffected, and piece [los[i], lo) — touching at lo! [a,lo) and [los[i], lo) touch at point lo — but as sets, [a,lo) ∪ [los[i],lo) = [a, lo) (since lo not in either). They're "touching" intervals that should be merged per spec! Hmm. Can his[i-1] == lo occur? Invariant: consecutive intervals don't touch: his[i-1] < los[i]. But his[i-1] == lo where lo is the removal start, not los[i]. los[i] < lo possible (interval i starts before removal). his[i-1] < los[i] < lo → his[i-1] < lo. OK since interval i overlaps removal: los[i] < hi and his[i] > lo... los[i] could be >= lo. If los[i] >= lo: piece left not created; then his[i-1] < los[i] but could his[i-1] == lo? los[i] > his[i-1] = lo → los[i] > lo, fine, no touch issue. If his[i-1] == lo and los[i] > lo: intervals [a,lo) and [los[i],...) — gap (lo, los[i]) non-empty? los[i] > lo, so there's a gap... unless los[i] == lo... los[i] > his[i-1] = lo strictly. Gap exists. Fine, no touch.

But wait — can his[i-1] == lo even happen given invariant? Invariant is about consecutive pairs: his[i-1] < los[i]. his[i-1] == lo is fine as long as los[i] > lo. And bisect_right(self._hi, lo) → i is first with his > lo, so his[i-1] <= lo, could equal. Then interval i has los[i] > lo (since los[i] > his[i-1] = lo). Then no left piece (los[i] >= lo check: los[i] < lo false). And no touch created. Good.

Right side of remove: piece [hi, his[j-1]) if his[j-1] > hi. Interval j (next): los[j] >= hi (bisect_left(los, hi) → los[j] >= hi). Could los[j] == hi and his[j-1] > hi? los[j] > his[j-1] invariant → los[j] > his[j-1] > hi → los[j] > hi. So no touching. If los[j] == hi then his[j-1] < hi... wait his[j-1] < los[j] = hi, and interval j-1 in removal range has his[j-1] > lo, los[j-1] < hi. Piece right created only if his[j-1] > hi — contradiction. So fine. And piece [hi, his[j-1]) vs interval j: los[j] > his[j-1] → gap. Good.

Also add: could new merged interval touch neighbor at distance via i >= j insert case: inserted [lo,hi) at position i; previous his[i-1] < lo (strict? bisect_left(his, lo): his[i-1] < lo). If his[i-1] == lo — bisect_left returns index of first >=, so his[i-1] < lo strictly. But his[i-1] == lo would be touching and should merge! Can his[i-1] == lo with i = bisect_left(his, lo)? No — bisect_left puts equality at i, so his[i-1] < lo strictly. But touch requires merge — his[i-1] == lo means interval [a, lo) touches [lo, hi) and per spec should merge into [a, hi). But bisect_left(his, lo) gives first index with his >= lo → his[i-1] < lo strictly means the touching interval [a, lo) would be at index i (his == lo captured). Then j = bisect_right(los, hi) — interval at i has los[i]... los[i] < his[i] = lo < hi, and is i < j? los[i] = a < lo < hi so los[i] <= hi → i < j. So merge includes it. 

Also new inserted interval vs next: los[i] > hi (since no overlap i >= j case... shown los[i] > hi). Inserted before it: hi < los[i]. Good. vs prev: his[i-1] < lo... wait in i >= j case, i = bisect_left(his, lo), his[i-1] < lo strict. Good. But hold on — in merge case (i < j), after merging, is position correct? Merged interval replaces slice starting at i; intervals before i have his < lo <= nlo... his[i-1] < lo, nlo = min(lo, los[i]) >= lo > his[i-1]. Good. Next at index j (after replacement): los[j] > hi shown, nhi = max(hi, his[j-1]); los[j] > his[j-1] and > hi → los[j] > nhi. Good.

One more: in add merge case, could los[i] < lo but interval i's hi... irrelevant.

Also total_length maintenance in add no-overlap case: total += hi - lo.

Remove: total update: old = sum(self._hi[i:j]) - sum(self._lo[i:j]); pieces: left piece len (lo - los[i]) if los[i] < lo; right (his[j-1] - hi) if his[j-1] > hi. total += (left + right) - old.

Hmm, but note: los[i] < lo check and his[j-1] > hi check — when i == j-1 both can hold (span). When i < j-1: first interval may have los[i] < lo (or not), last may have his > hi (or not). Conditions independent — correct.

Edge: bisect on empty lists → returns 0, fine.

Now contains with ints/floats: bisect works.

Let me also double check remove when removal covers everything: i=0, j=len, pieces empty → lists cleared.

Also: `total_length` should be maintained; but floats accumulate error. Acceptable? "sum of all interval lengths" — incremental float addition vs summing could differ slightly. Maybe compute on demand: sum(h - l for l, h in zip(...)) — O(n) per call, no constraint given on total_length. Safer for correctness. But calls could be frequent... no perf requirement stated. I'll maintain incrementally for O(1)... hmm, risk of drift either way. I'll compute on demand to guarantee exactness relative to stored intervals: `return sum(hi - lo for lo, hi in self._ivs)`. Actually let me maintain incrementally — 200k contains + 60k adds; total_length not in perf spec. I'll do on-demand for accuracy. Actually either is fine; I'll do incremental since it's cheap and exact for ints; for floats drift negligible. Hmm — "Keep the original values (no rounding)" refers to bounds. I'll compute on demand — simplest and always consistent with intervals(). Fine.

Write the class:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(his, lo)
        j = bisect_right(los, hi)
        if i >= j:
            los.insert(i, lo)
            his.insert(i, hi)
        else:
            nlo = los[i] if los[i] < lo else lo
            nhi = his[j - 1] if his[j - 1] > hi else hi
            los[i:j] = [nlo]
            his[i:j] = [nhi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_right(his, lo)
        j = bisect_left(los, hi)
        if i >= j:
            return
        new_lo, new_hi = [], []
        if los[i] < lo:
            new_lo.append(los[i]); new_hi.append(lo)
        if his[j - 1] > hi:
            new_lo.append(hi); new_hi.append(his[j - 1])
        los[i:j] = new_lo
        his[i:j] = new_hi

    def contains(self, x):
        i = bisect_right(self._hi, x)
        return i < len(self._lo) and self._lo[i] <= x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Double-check remove touch handling: removing [3,5) from set {[1,3),[5,7)}: i = bisect_right(his=[3,7], 3) → his values: bisect_right([3,7],3)=1. j = bisect_left(los=[1,5],5)=1. i>=j → return. Correct: [1,3) and [5,7) unaffected (point 3 and 5 not in removed open region... removed set {x: 3<=x<5}; [1,3) contains no x>=3; fine).

Removing [3,5) from {[1,4)}: i = bisect_right([4],3)=0; j = bisect_left([1],5)=1; los[0]=1<3 → piece [1,3); his[0]=4>5? No. Result [1,3). Correct.

Removing [3,5) from {[2,6)}: i=bisect_right([6],3)=0; j=bisect_left([2],5)=1; los[0]=2<3 → [2,3); his[0]=6>5 → [5,6). Result [2,3),[5,6). Correct.

Add [1,3) then [3,5): first insert at 0. Second: i=bisect_left([3],3)=0; j=bisect_right([1],5)=1; 0<1 merge: nlo=min(1,1)=1, nhi=max(5,3)=5 → [1,5). Correct.

Add [3,5) then [1,3): i=bisect_left([5],1)=0; j=bisect_right([3],3)=1; merge → [1,5). Correct.

contains edge: empty set → bisect 0, 0 < 0 false. Good.

contains(x) where x equals hi of an interval: bisect_right(his, x) skips intervals with hi == x → points at interval with hi > x; check lo <= x. E.g. {[1,3)}, contains(3): bisect_right([3],3)=1 → 1<1 false → False. Correct. contains(2.5): bisect_right([3],2.5)=0, lo[0]=1<=2.5 → True.

contains(1): bisect_right([3],1)=0, 1<=1 True. Good.

Performance: 60k adds — bisect O(log n), inserts memmove. Fine.

One subtle thing in add merge: slice assignment `los[i:j] = [nlo]` — when i==j? handled by branch. Fine.

Also mixed int/float comparisons fine.

Done.