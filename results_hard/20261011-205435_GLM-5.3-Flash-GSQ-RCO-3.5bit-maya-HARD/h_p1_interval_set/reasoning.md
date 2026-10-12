Key design: keep a sorted list of intervals. Use bisect on lo values. For add: find overlapping range and merge. For remove: split.

Implementation: maintain `self._ivs` list of [lo, hi] sorted by lo. Use bisect module with a key... Python 3.11 bisect doesn't support key (key added in 3.10 actually — bisect supports key since 3.10). Yes, bisect key parameter added in 3.10. So use bisect with key=lambda i: i[0] — but key functions with bisect: `bisect.bisect_left(a, x, key=...)` where key is applied to elements of a. Actually key is applied to elements of the sequence; x must already be transformed? For bisect_left with key: "key specifies a key function of one argument that is used to extract a comparison key from each element in the array". And x should be compared against keys — x must be the key value already? Per docs: x is compared with keys? Actually docs say: "key ... applied to each element in array; x is not transformed". Hmm, let me recall: In bisect with key, the elements of a are transformed via key, but x is used as-is. Wait no — checking: `bisect.bisect_left(a, x, key=f)` — the key is applied to elements of a, and x must be comparable to the key values. Actually the docs say "x is inserted so that... key function applied to a... x is not transformed by key"? Let me check: from CPython docs: "key specifies a key function of one argument that is used to extract a comparison key from each element in the array. To support searching complex records in an array, the key function is not applied to the x value." Yes, key is applied to array elements only; x is used raw. So bisect_left(ivs, lo, key=lambda t: t[0]) gives insertion index for lo among lo-values.

Alternatively, maintain a separate list of lo values to avoid key overhead. Simpler: store intervals as flat parallel lists? Or just store list of [lo, hi] and use key. Performance: 60,000 adds each with bisect O(log n) — fine.

Add algorithm:
- i = bisect_left(lo among los), j = bisect_right(hi among los)? We need intervals that overlap [lo, hi): intervals with hi > lo... careful with touching merge: [1,3) and [3,5) should merge when adding. Half-open touching intervals merge.

For add [lo, hi): affected intervals are those with lo < hi and hi > lo — but also touching: interval with hi == lo touches, and interval with lo == hi touches. Since merging [1,3)+[3,5)→[1,5), touching intervals merge. So when adding [lo, hi), we merge with intervals that overlap OR touch: intervals where interval.hi >= lo and interval.lo <= hi.

Wait: [3,5) added then add [1,3): interval [3,5) has lo=3 <= hi=3, hi=5 >= lo=1 → merge → [1,5). Good. What about add [1,3) then add [3,5): existing [1,3): hi=3 >= lo=3 → yes touching. lo=1 <= hi=5. Merge.

Hmm but does touching merge always? "touching intervals merged ([1,3) + [3,5) gives [(1,5)])" — yes, so merge when adjacent.

But careful: if interval [5,6) exists and we add [3,5): hi of existing =6, lo=5 >= hi=5? condition: existing.lo <= hi (5<=5 yes) and existing.hi >= lo (6>=3 yes) → merge → [3,6). That's touching — correct per spec.

But what about gap? If add [1,2) then add [4,5): no merge, separate. Fine.

However there's subtlety: merging touching intervals is required, but do we want to merge an interval only touching at endpoint even if it came from separate adds? Spec says intervals() output should have touching merged, so yes, always merge.

Actually wait — does [1,3)+[3,5) merging imply [3,5)+[5,6) merges too? Yes, touching. And with floats, touching means exact equality. Fine.

Edge: zero-length intervals never stored (lo>=hi ignored; merged intervals always lo<hi since add ensures lo<hi and merge extends).

Add:
```
def add(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    # find first interval with hi >= lo  (i.e., could touch/overlap)
    # intervals sorted by lo; but touching depends on hi too.
```
Since intervals are disjoint and sorted, and merged (no touching between stored intervals — invariant: after operations, stored intervals are pairwise disjoint AND non-touching? Hmm — can two stored intervals touch? If add merges touching ones, remove could create touching? Remove splits: [1,5) remove [2,3) → [1,2), [3,5). Those don't touch. Remove never creates touching intervals? Remove [1,3) from... hmm, stored intervals are disjoint and non-touching? Actually invariant: stored intervals have gaps > 0 between them? Consider stored [1,2) and [3,4) — gap. Remove can't make them touch. Add merges touching. So invariant: consecutive intervals have lo_next > hi_prev strictly... Actually can lo_next == hi_prev ever? Add merges when touching, so no. So invariant holds: gaps positive (well, lo_next > hi_prev).

Hmm, but wait: is that desirable? If user adds [1,3) and [5,6), gap between 3 and 5. Then adds [3,5): merges all → [1,6). Fine.

So stored intervals sorted by lo, and hi_i < lo_{i+1} strictly (gap). Actually hi_i <= lo_{i+1} with equality impossible; hi_i < lo_{i+1}.

Because of this invariant, intervals overlapping/touching [lo,hi) form a contiguous range. Find:
- leftmost index i: first interval with hi >= lo. Since sorted by lo and disjoint, we can search by lo: candidates are intervals with lo <= hi... hmm. An interval [a,b) touches [lo,hi) iff b > lo and a < hi (with touching: a <= hi and b >= lo — since touching merges, condition a <= hi and b >= lo). Wait touching: interval [a,b) and [lo,hi) touch/overlap iff a <= hi and b >= lo. (If a == hi, they touch at hi; merge. If b == lo, touch.)

Find left index: smallest i such that ivs[i].hi >= lo. Since hi values also sorted (disjoint sorted intervals → hi increasing too), we can binary search on hi. Store parallel list of his? Or use bisect on lo list: first interval with lo... Since invariant hi_i < lo_{i+1}, interval i overlaps/touches iff lo_i <= hi and hi_i >= lo.

Range of affected indices: i = first index with hi_i >= lo. Since hi increasing, binary search hi list for lo. j = last index with lo_j <= hi → j = bisect_right(los, hi) - 1. Affected = [i, j]. If i > j: no overlap; insert [lo,hi] at position i (bisect_left of lo? position where lo fits). Actually if no overlap, insertion point is any index between; use bisect_right on lo list for lo? Since interval with lo_j <= hi... insertion position: i computed via hi search gives first interval with hi >= lo; all intervals before i have hi < lo, so new interval goes after them. Insert at i.

Merged interval: new_lo = min(lo, ivs[i][0]) if i<=j, new_hi = max(hi, ivs[j][1]). Replace slice ivs[i:j+1] with single interval.

For maintaining parallel los/his lists: use two lists `self._lo` and `self._hi`. Binary search on self._hi for lo (bisect_left(hi_list, lo) gives first hi >= lo). And bisect_right(lo_list, hi) gives first index with lo > hi; j = that - 1.

Wait careful: bisect_right(lo_list, hi) — but lo values: we want last index with lo_j <= hi. bisect_right returns insertion point after equal elements, so index of first element > hi. j = bisect_right(lo_list, hi) - 1. But careful with floats equality — fine.

Then:
- if i > j: insert lo, hi at position... i (from bisect_left(hi_list, lo))? Hmm, insertion position must keep lo_list sorted. All intervals with index < i have hi < lo... wait no: bisect_left(hi_list, lo) gives first index with hi >= lo. Intervals before that have hi < lo, so their lo < lo (since lo_i <= hi_i < lo... lo_i <= hi_i, and hi_i < lo means lo_i < lo). So inserting at position i keeps lo sorted. Also intervals at i.. have lo... the new interval [lo,hi] must satisfy lo < lo_i for i.. hmm not necessarily lo < lo_{i}? If i <= j case handled separately. If i > j (no affected), intervals from i onward have lo > hi? Since j < i means all intervals with lo <= hi are before i... intervals at index >= i have lo > hi (because bisect_right(lo_list, hi) = j+1 <= i). Yes so lo < lo_i. Good.

- else: new_lo = min(lo, lo_list[i]), new_hi = max(hi, hi_list[j]). Replace: del lo_list[i:j+1], hi_list[i:j+1], then insert at i.

Remove [lo, hi):
Affected intervals: those with lo < hi and hi > lo — strict overlap (touching doesn't matter for removal; removing [3,5) from [1,3)... nothing removed since [3,5) ∩ [1,3) empty). Overlap iff a < hi and b > lo. i = first index with hi_i > lo → bisect_right(hi_list, lo). j = last index with lo_j < hi → bisect_left(lo_list, hi) - 1... first index with lo >= hi is bisect_left(lo_list, hi); intervals before that have lo < hi; j = bisect_left(lo_list, hi) - 1.

If i > j: nothing.
Else: handle boundaries:
- left partial: if lo_list[i] < lo: interval i is cut: keep [lo_i, lo). 
- right partial: if hi_list[j] > hi: interval j cut: keep [hi, hi_j).
- middle intervals i+1..j-1 fully removed (well, between the cuts).

Implementation:
```
if i > j: return
# left cut
if lo_list[i] < lo:
    lo_list[i] ... keep [lo_i, lo); middle starts at i+1
else:
    interval i starts at/before lo → will be removed or cut on right
```
Let me write: 
```
new_lo_part = None; new_hi_part = None
start = i
if lo_list[i] < lo:
    # partial left: [lo_i, lo) remains
    end_left = i  # keep interval i trimmed
    lo_list[i] stays lo_i, hi_list[i] = lo
    start = i+1
...
```
Simpler approach:
```
if lo_list[i] < lo:
    hi_list[i] = lo
    i += 1  # interval i handled
if i <= j and hi_list[j] > hi:
    lo_list[j] = hi
    j -= 1
# now remove intervals i..j entirely
if i <= j:
    del lo_list[i:j+1]; del hi_list[i:j+1]
```
Check: interval i with lo_i < lo: trimmed to [lo_i, lo). Then i increments. If interval i (original) had lo_i >= lo, it's either fully inside or cut on right; handled by right logic if j still >= i. Edge: single interval affected where lo_i < lo and hi_j > hi with i==j: after left trim hi_list[i]=lo, i+=1 → i = j+1 > j. Then right check `if i <= j` fails — but we need to keep right part [hi, hi_j)! Bug. Need to handle: original interval [a,b) with a<lo and b>hi: result is [a,lo) and [hi,b) — two intervals.

Handle: after left trim, if original interval also extends beyond hi (hi_list[i_orig] > hi), we set lo_list of that same slot... but we've already used the slot for left part. Better approach: collect pieces.

Alternative cleaner: handle i==j special case, or do:
```
# left
if lo_list[i] < lo:
    if hi_list[i] > hi:  # split into two
        # keep [lo_i, lo) at slot i, and [hi, hi_i) — need to insert a new interval
        # insert after i
        lo_list[i] = ... hmm
```
Simplest: 
```
left_keep = None
right_keep = None
a, b = lo_list[i], hi_list[i]  # only if needed
```
Let me just write it straightforwardly:

```
def remove(self, lo, hi):
    if lo >= hi: return
    lo_list, hi_list = self._lo, self._hi
    i = bisect_right(hi_list, lo)   # first hi > lo
    j = bisect_left(lo_list, hi) - 1  # last lo < hi
    if i > j: return
    # gather replacement pieces
    pieces = []
    if lo_list[i] < lo:
        pieces.append((lo_list[i], lo))
    if hi_list[j] > hi:
        pieces.append((hi, hi_list[j]))
    # middle: strictly between the trimmed edges
    # full intervals fully removed: indices k with lo_k >= lo and hi_k <= hi
    ...
```
Hmm, need indices: left-trim index li = i if lo_list[i] < lo else None... Actually fully-removed intervals are those from start..end where:
start = i+1 if lo_list[i] < lo else i
end = j-1 if hi_list[j] > hi else j
If start <= end: delete slice, then insert pieces.

But careful about i==j with both cuts: pieces = [(lo_i, lo), (hi, hi_i)], start=i+1, end=j-1=i-1 → no deletion; we need to modify slot i to first piece and insert second piece at i+1.

Implementation:
```
start = i + (1 if lo_list[i] < lo else 0)
end = j - (1 if hi_list[j] > hi else 0)
if lo_list[i] < lo:
    hi_list[i] = lo
if hi_list[j] > hi:
    lo_list[j] = hi
if start <= end:
    del lo_list[start:end+1]
    del hi_list[start:end+1]
    # pieces insertion position: start
    if pieces:
        lo_list[start:start] = [pieces[0][0]]
        hi_list[start:start] = [pieces[0][1]]
        if len(pieces) == 2:
            lo_list.insert(start+1, pieces[1][0])
            hi_list.insert(start+1, pieces[1][1])
```
Check single interval fully removed: i==j, lo_i >= lo, hi_j <= hi → start=i, end=j=i → delete slot i, no pieces. Good.
Check split: i==j, lo_i < lo, hi_i > hi: start=i+1, end=i → start>end no deletion; hi_list[i]=lo (slot becomes [lo_i, lo)); lo_list[j]=hi (same slot i becomes [hi, hi_i))? Conflict! Both modifications hit slot i. Bug.

Fix: when i==j and both cuts: slot i becomes [lo_i, lo), insert [hi, hi_i) at i+1. pieces = [(lo_i,lo),(hi,hi_i)]. The modifications hi_list[i]=lo and lo_list[j]=hi where j==i conflict.

Handle by order: do left trim (hi_list[i]=lo), then right trim — but if j==i and we already trimmed left, the right piece needs a new slot. Adjust: after left trim and i+=... Let me restructure: 

```
has_left = lo_list[i] < lo
has_right = hi_list[j] > hi
if has_left: hi_list[i] = lo
if has_right: lo_list[j] = hi
if has_left and has_right and i == j:
    # slot i now holds garbage mixture; fix: slot i should be [lo_i, lo), insert [hi, hi_j) at i+1
    lo_list.insert(i+1, hi); hi_list.insert(i+1, hi_list[j]...) 
```
Messy since hi_list[j] was overwritten? No—left trim overwrote hi_list[i] (== hi_list[j]); but we saved original hi in hi_list[j]... we need original value. Save before: 

Cleaner: compute pieces with original values first:
```
a_lo, a_hi = lo_list[i], hi_list[i]  # actually need for pieces
```
Let me just do:
```
left_piece = (lo_list[i], lo) if lo_list[i] < lo else None
right_piece = (hi, hi_list[j]) if hi_list[j] > hi else None
start = i if left_piece is None else i + 1
end = j if right_piece is None else j - 1
# remove fully covered [start..end]
if start <= end:
    del lo_list[start:end+1]; del hi_list[start:end+1]
pos = start
if left_piece:
    lo_list[i] = left_piece[0]  # unchanged actually
    hi_list[i] = left_piece[1]
    pos = i + 1
if right_piece:
    if left_piece and i == j:
        lo_list.insert(pos, right_piece[0]); hi_list.insert(pos, right_piece[1])
    else:
        lo_list[j] = right_piece[0]; hi_list[j] = right_piece[1]
```
Check cases:
- i==j, both cuts: left_piece set slot i = [lo_i, lo). right_piece inserted at pos=i+1. Good.
- i==j, only right cut: left_piece None, start=i, end=j=i → delete slot i. right_piece: not (left and i==j), so lo_list[j]=hi, hi_list[j]=hi_j. But slot j==i was deleted! Index error / wrong. Hmm: deletion removed slot i, then we set lo_list[j] where j==i — now out of range or wrong element. Bug.

Fix: when deleting includes slot j (i.e., only-right-cut and j not protected)... Reorder: apply right trim before deletion, or handle indices carefully.

Better approach: build everything via slice assignment. Compute:
- head = intervals before i (unchanged)
- tail = intervals after j (unchanged)
- middle pieces from cuts.

Result = lo_list[:i] + pieces + lo_list[j+1:]. This is O(n) per op though — 60,000 adds with average n growing to 60,000 → O(n^2) = 1.8e9, too slow. Need O(log n) + O(k) splice where k = affected range size.

Alternative: keep modifications but order carefully. Let's think again with careful ordering:

Case analysis for remove on affected range [i..j]:
1. lo_list[i] < lo (left cut on slot i) and hi_list[j] > hi (right cut on slot j), i < j: slot i → [lo_i, lo); slot j → [hi, hi_j); delete slots i+1..j-1.
2. i == j:
   a. lo_i < lo and hi_i > hi: slot i → [lo_i, lo), insert [hi, hi_i) after.
   b. lo_i < lo, hi_i <= hi: slot i → [lo_i, lo).
   c. lo_i >= lo, hi_i > hi: slot i → [hi, hi_i).
   d. fully covered: delete slot i.
3. i < j, only left cut: slot i → [lo_i, lo), delete i+1..j.
4. i < j, only right cut: slot j → [hi, hi_j), delete i..j-1.
5. i < j, no cuts: delete i..j.
6. i < j, both cuts: as case 1.

Code:
```
if lo_list[i] < lo:  # left cut exists (slot i survives at least partially)
    hi_list[i] = lo
    if i == j:
        if hi_list_orig > hi... 
```
Handle i==j first:

```
if i == j:
    a, b = lo_list[i], hi_list[i]
    if a >= lo and b <= hi:
        del lo_list[i]; del hi_list[i]
    elif a < lo and b > hi:
        hi_list[i] = lo
        lo_list.insert(i+1, hi); hi_list.insert(i+1, b)
    elif a < lo:
        hi_list[i] = lo
    else:
        lo_list[i] = hi
    return
# i < j
start = i + 1 if lo_list[i] < lo else i
end = j - 1 if hi_list[j] > hi else j
if lo_list[i] < lo:
    hi_list[i] = lo
if hi_list[j] > hi:
    lo_list[j] = hi
if start <= end:
    del lo_list[start:end+1]
    del hi_list[start:end+1]
```
Check case 4 (i<j, only right cut): start=i (lo_i >= lo), end=j-1. lo_list[i] < lo false → no left trim. hi_list[j] > hi → lo_list[j]=hi. Delete i..j-1. Slot j survives as [hi, hi_j). Good.
Case 3: start=i+1, end=j. hi_list[i]=lo. Delete i+1..j. Good.
Case 1: start=i+1, end=j-1; both trims; delete middle. Good.
Case 5: start=i,end=j, delete all. Good.

For i==j case b (a<lo, b<=hi): hi_list[i]=lo → [a, lo). Good. Case c: lo_list[i]=hi → [hi, b). Good.

Add method:
```
def add(self, lo, hi):
    if lo >= hi: return
    lo_list, hi_list = self._lo, self._hi
    i = bisect_left(hi_list, lo)      # first hi >= lo (touch/overlap)
    j = bisect_right(lo_list, hi) - 1 # last lo <= hi
    if i > j:
        lo_list.insert(i, lo); hi_list.insert(i, hi)
        return
    new_lo = lo_list[i] if lo_list[i] < lo else lo
    new_hi = hi_list[j] if hi_list[j] > hi else hi
    lo_list[i:j+1] = [new_lo]
    hi_list[i:j+1] = [new_hi]
```
Wait — bisect_left(hi_list, lo): first index with hi_list[idx] >= lo. Since hi list sorted? Is it? Intervals sorted by lo and disjoint non-touching with gaps → hi also strictly increasing. Yes invariant ensures hi_list sorted. But we must maintain invariant: after add, merged interval must not touch neighbors. Since we merged all touching/overlapping (i..j covers all with hi>=lo and lo<=hi), remaining neighbors: slot i-1 has hi_{i-1} < lo_new (hi_{i-1} < lo <= new_lo... hmm hi_{i-1} < lo and new_lo = min(lo, lo_i). If new_lo = lo_i > hi_{i-1} fine; if new_lo = lo then hi_{i-1} < lo = new_lo. Good gap strictly.) Slot after: lo_{j+1} > hi. new_hi = max(hi, hi_j); if new_hi = hi_j then lo_{j+1} > hi_j; if new_hi = hi then lo_{j+1} > hi. Good.

But wait: is bisect_left(hi_list, lo) correct for finding first touching interval? We want smallest i with hi_i >= lo. bisect_left on hi_list finds leftmost position where lo could be inserted keeping order — first index with hi_list[idx] >= lo. Yes.

And j = last with lo_j <= hi: bisect_right(lo_list, hi) gives first index with lo > hi; j = that - 1. Correct.

Also insertion position when i > j: position i — check sorted: lo_list[i-1] < lo (since hi_{i-1} < lo... wait i-1 has hi < lo, and lo_{i-1} <= hi_{i-1} < lo). And lo_list[i] (now the element at index i, first with hi >= lo): we need lo < lo_i? The new interval [lo,hi] doesn't touch interval i (hi_i >= lo but... no overlap means... hmm i > j means all intervals with lo <= hi are before i, so lo_i > hi). Need lo <= lo_i for sorted: interval i-1... actually need lo <= lo_i? Sorted by lo requires lo <= lo_i? Strictly lo < lo_i would be needed for non-touching? Not touching: hi_new=hi < lo_i, so gap; but lo vs lo_i ordering: lo could be > lo_i? If lo_i > hi and lo < hi < lo_i then lo < lo_i. Yes lo < hi < lo_i. And lo_list[i-1] <= hi_{i-1} < lo. So insert at i keeps sorted. 

But wait: could insertion position i not equal bisect position in lo_list? We insert into lo_list at index i. Since lo_list[i-1] < lo < lo_list[i], index i is correct bisect position. Good.

contains(x): need to check if any interval contains x: exists i with lo_i <= x < hi_i. bisect_right(lo_list, x) - 1 = candidate index; check hi_list[idx] > x. O(log n). Edge: idx = -1 → not contained.

total_length: sum(hi - lo for ...) — could cache, but recomputing on 60k calls... total_length not in perf requirement. Compute on demand, or maintain running sum. Maintain self._total updated in ops — adds complexity; just compute sum each call (fine).

intervals(): list(zip(lo_list, hi_list)).

__len__: len(lo_list).

One concern: bisect on lists of floats with 60k elements — each op O(log n) plus splice O(k). Adds of small disjoint intervals in random order: each add touches ≤1 interval (disjoint, no merging mostly), splice cost O(1)-ish (list insert/delete memmove, fine). 60k adds trivial. 200k contains: bisect_right on list — C-implemented, fast. Total well under 5s.

Wait, "small disjoint intervals in random order" — disjoint means no merging, insertions at random positions → list.insert O(n) memmove but that's C memcpy, 60k * avg 30k * 8 bytes... memmove is fast, ~ fine.

Also floats and ints mixed comparisons fine.

Edge: add where i <= j but check bounds: lo_list[i] could be > ... fine.

Another subtlety in add: what if hi_list[i] ... i is first with hi_i >= lo. But could interval i have lo_i > hi (no overlap, just... hi_i >= lo and lo_i > hi)? Then it doesn't overlap but j would be < i, so we'd insert. Correct — no merge, but insertion position i as computed. But then touching? interval i has lo_i > hi, gap. interval i-1: hi_{i-1} < lo. Good.

Hmm, one more check on add's merge condition: touching means hi_i >= lo OR lo_i <= hi? An interval [a,b) touches [lo,hi) iff a == hi or b == lo (or overlap). We merge if b >= lo (covers b==lo) and a <= hi (covers a==hi). i..j covers exactly intervals with hi_i >= lo and lo_i <= hi? i = first with hi >= lo → all idx >= i have hi >= lo? hi increasing → yes. j = last with lo <= hi → all idx <= j have lo <= hi. So range i..j = intervals satisfying both (since conditions monotone). Good.

Wait — but should touching intervals merge in add? Spec example [1,3)+[3,5) → [(1,5)]. Yes.

Hmm, but consider: set has [1,3), [5,6). Add [3,5): interval [1,3): hi=3 >= lo=3 ✓, lo=1 <= hi=5 ✓ → in range. [5,6): hi=6>=3 ✓, lo=5<=5 ✓ → in range. Merge → [1,6). Correct per touching rule.

Now remove when result pieces might touch adjacent intervals? Remove only shrinks, creates gaps. Fine.

One more: add invariant "no touching between stored intervals" — could remove create touching? No.

But initial state: empty.

Also, what about add [lo,hi) where merge creates interval touching... covered.

Type of total_length: sum of (hi-lo). Return number.

Let me also double check bisect usage without key — we use parallel lists so plain bisect on floats. 

contains:
```
def contains(self, x):
    idx = bisect_right(self._lo, x) - 1
    return idx >= 0 and self._hi[idx] > x
```

Write final code.

Also __len__ returns len(self._lo).

Maybe also implement __contains__ for convenience — not required; skip or add (harmless). Keep minimal but adding __contains__ calling contains is fine. Spec doesn't ask; I'll add it anyway? "No example usage" — extra dunder is fine. I'll include __contains__ for polish. Actually keep strictly to spec plus maybe __iter__? Not needed. I'll add __contains__ and __repr__? Keep it simple: just required methods. I'll add __contains__ since it's natural. Eh, minimal is safer. I'll include just required + __contains__ trivial.

Final code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi
        i = bisect_left(hi_list, lo)        # first interval with hi >= lo
        j = bisect_right(lo_list, hi) - 1   # last interval with lo <= hi
        if i > j:
            lo_list.insert(i, lo)
            hi_list.insert(i, hi)
            return
        new_lo = lo_list[i] if lo_list[i] < lo else lo
        new_hi = hi_list[j] if hi_list[j] > hi else hi
        lo_list[i:j + 1] = [new_lo]
        hi_list[i:j + 1] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        lo_list, hi_list = self._lo, self._hi
        i = bisect_right(hi_list, lo)       # first interval with hi > lo
        j = bisect_left(lo_list, hi) - 1    # last interval with lo < hi
        if i > j:
            return
        if i == j:
            a, b = lo_list[i], hi_list[i]
            if a >= lo and b <= hi:
                del lo_list[i]
                del hi_list[i]
            elif a < lo and b > hi:
                hi_list[i] = lo
                lo_list.insert(i + 1, hi)
                hi_list.insert(i + 1, b)
            elif a < lo:
                hi_list[i] = lo
            else:
                lo_list[i] = hi
            return
        start = i + 1 if lo_list[i] < lo else i
        end = j - 1 if hi_list[j] > hi else j
        if lo_list[i] < lo:
            hi_list[i] = lo
        if hi_list[j] > hi:
            lo_list[j] = hi
        if start <= end:
            del lo_list[start:end + 1]
            del hi_list[start:end + 1]

    def contains(self, x):
        idx = bisect_right(self._lo, x) - 1
        return idx >= 0 and self._hi[idx] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)

    def __contains__(self, x):
        return self.contains(x)
```

Double-check remove i==j case c: a >= lo, b > hi → lo_list[i] = hi → [hi, b). But condition order: `elif a < lo and b > hi` — for case c, a>=lo and b>hi falls to `elif a < lo` false → else lo_list[i]=hi. Good. Case where a>=lo and b<=hi → delete. What about a < lo and b <= hi → `elif a < lo` → hi_list[i]=lo. Good.

Wait, in i==j case c: what if a >= lo but a... also need a < b still after trim: [hi, b) with hi < b since b > hi. Good. Case a<lo: [a, lo), lo < b since b > lo? b > lo because interval overlaps: b > lo (i is first with hi > lo, so hi_i > lo). Good.

Also check remove's j computation: bisect_left(lo_list, hi) - 1 — last lo < hi. bisect_left gives first lo >= hi; index-1 is last lo < hi. If that's -1 → j=-1 < i → return. Good.

Check add's j: bisect_right(lo_list, hi) - 1 → last lo <= hi. If -1 → i>... i >= 0 > -1 → insert at i. But insertion index: i from bisect_left(hi_list, lo). If no interval has hi >= lo... i = len. Insert at end. lo_list[i-1]... fine.

Potential issue: bisect_right(hi_list, lo) in remove: first index with hi > lo. bisect_right returns insertion after equal elements → first element > lo. Correct: we want hi_i > lo (strict, since touching at lo means no removal).

bisect_left(hi_list, lo) in add: first hi >= lo (touching counts). Correct.

Verify example: add(1,3): lists empty, i=0, j=-1 → insert at 0: lo=[1], hi=[3]. add(3,5): i = bisect_left([3], 3) = 0. j = bisect_right([1], 5)-1 = 1-1=0. i<=j. new_lo = min(1,3)=1, new_hi = max(3,5)=5 → [1,5]. ✓.

remove(2,3) from [1,5): i = bisect_right([5], 2)=0, j = bisect_left([1], 3)-1 = 1-1 = 0. i==j. a=1,b=5. a<lo and b>hi → hi_list[0]=2, insert (3,5) at 1 → lo=[1,3], hi=[2,5]. ✓

contains checks out.

Performance concern: add uses list slice assignment lo_list[i:j+1] = [new_lo] — when j+1 > i this shrinks; fine.

One more possible issue: mixing int and float, equality — fine.

Done.