Key design: keep intervals sorted by lo. Use a list with bisect for contains. But add operations: 60,000 add calls of small disjoint intervals in random order — using a plain list with insert is O(n) per add → 60k * 30k average = 1.8e9 ops, too slow. Need a balanced structure or use a sorted list with faster insertion... Standard library only. Options:

1. Use `sortedcontainers` — not stdlib.
2. Use a list but batch: random order adds, insert via `list.insert` — list.insert is O(n) memmove but memmove is fast C-level; 60k inserts into a list of ~60k elements: average shift 30k elements each = 1.8e9 element moves but memmove is very fast (~1-10 GB/s... actually memmove of 8-byte pointers, 30k*8 = 240KB per insert, 60k inserts → 14.4 GB moved → ~3-10 seconds). Risky. Could be borderline.

Better: implement a balanced BST or use a skip list, or use bisect on a list with insert — same thing.

Alternative: a treap/AVL storing interval endpoints. Merging touching intervals complicates but doable. Simpler approach: maintain a sorted list of interval boundaries but store intervals as pairs in a balanced tree keyed by lo.

Actually a simpler robust approach: use a "SortedList"-like structure via bisect and chunked lists (like sortedcontainers' approach): a list of sublists. Implement small custom: list of blocks each ~1000 elements. Insert into a block O(block size), find block via bisect on block mins. That gives good performance.

But merging logic: when adding [lo,hi), we need to find overlapping/touching intervals and merge them, potentially removing several and inserting one. With chunked structure, removals across blocks get messy.

Alternative: since 60k adds of disjoint intervals in random order — total final intervals ~60k. Perhaps implement a treap keyed by lo, with each node storing (lo, hi). Operations:

- add(lo, hi): find all intervals intersecting or touching [lo,hi), remove them, insert merged. With a treap, split/merge operations: split by lo < lo, split by lo <= hi (touching means lo <= hi of new). Actually intervals [a,b) and [lo,hi) overlap/touch iff a <= hi and b >= lo... touching: [1,3) and [3,5) merge. Condition: a <= hi and lo <= b. So split treap: T1 with lo < ... hmm need intervals with a <= hi (i.e., lo_key <= hi) — those are candidates; among them those with b >= lo. Since intervals are disjoint and sorted, the candidates form a contiguous range. Split treap by key lo (key = interval lo): left with lo < new_lo... careful.

Simpler: use a treap where split by key uses lo, then in the middle part extract intervals with b >= lo? Since disjoint sorted, middle part intervals all have lo <= hi_new; among them, those with b < lo_new don't touch. They form a prefix of the middle part. So:

split(t, hi) → left (lo <= hi... use lo <= hi? keys: interval lo; we want intervals with lo <= hi_new, i.e., key <= hi_new) and right (key > hi_new). From left, split by key < lo_new: A (key < lo_new), B (lo_new <= key <= hi_new). B fully consists of intervals with lo >= lo_new and lo <= hi_new — all overlap or touch [lo_new, hi_new)? Interval [a,b) with a in [lo_new, hi_new]: a < hi_new... a <= hi_new means it overlaps/touches? If a == hi_new: [hi_new, b) touches [lo,hi) — yes merge. If a < hi_new, overlaps. So all of B merges. But also the last interval of A might touch/overlap: its b could be > lo_new. Check A's max (last interval). Similarly, B's intervals merge into [min(lo_new, B.first.lo), max(hi_new, B.last.hi)). Also possibly last interval of A with b > lo_new merges (extends lo down to a). Also could A's intervals chain-merge? No—A's intervals have key < lo_new, disjoint, only the last one can have b > lo_new.

Wait also intervals in B: since disjoint and sorted, merging B entirely with [lo,hi) gives one interval? B intervals are disjoint but non-touching among themselves (they're stored merged). So B merged with [lo,hi): the union is [min(lo, B0.lo), max(hi, Blast.hi)) — contiguous since B0.lo <= hi and each subsequent... actually B intervals are disjoint and could have gaps between them, but [lo,hi) covers from lo to hi, and B0.lo >= lo, Blast.hi... hmm B intervals all start within [lo, hi], but their ends can exceed hi. Since they're disjoint and sorted, union of [lo,hi) with B: B0 = [a0,b0), a0 >= lo. [lo,hi) ∪ [a0,b0): if b0 >= lo (yes since a0 <= hi... b0 > a0 >= lo? b0 > a0, a0 >= lo, so b0 > lo) — they overlap/touch. Union contiguous [lo, max(hi,b0)). Next interval [a1,b1), a1 >= b0. Does it connect? a1 could be > max(hi,b0) — gap. Then union isn't contiguous!

Hmm wait — but if a1 > hi, then [a1,b1) doesn't touch [lo,hi). But a1 <= hi? B defined by key <= hi_new, so a1 <= hi. And a1 >= b0. If b0 <= hi then a1 <= hi means a1... a1 >= b0 and a1 <= hi, then [a1,b1) starts within [lo,hi), connects. If b0 > hi, then a1 >= b0 > hi — but a1 <= hi required by B. Contradiction, so a1 not in B... wait B = keys in [lo_new, hi_new]. a1 <= hi_new iff a1 in B. If b0 > hi then a1 >= b0 > hi so a1 ∉ B. Good, so B intervals chain-connect: b_i >= a_{i+1}? Actually a_{i+1} <= hi and a_{i+1} >= b_i, and if b_i <= hi then chain continues; if b_i > hi, next interval a_{i+1} >= b_i > hi ∉ B. So B is a contiguous chain and merges with [lo,hi) into single interval. 

And A's last interval [a,b): if b >= lo_new, merges (b > lo or b == lo touching). Since A intervals have key < lo_new and disjoint from B... A's last b: could be anything <= a_next where a_next >= lo_new... Actually intervals are disjoint merged so b <= next interval's lo, and gaps possible. If last A interval b > lo_new, merge into combined lo = a_last.

So add(lo,hi):
- split treap into A (key < lo), B (key in [lo, hi]), C (key > hi).
- combined = [lo, hi]; if B nonempty: combined.lo = min(lo, B.first.lo) = B.first.lo (since B keys >= lo); combined.hi = max(hi, B.last.hi). Check A's last interval b >= combined.lo → merge, combined.lo = A.last.lo.
- Insert combined into A (as new max if A's last doesn't merge, or update A's last... easier: if merged with A's last, pop A's last and insert combined; else insert combined). Actually insert combined into treap A∪C: combined.hi <= ... A's last has key < lo <= combined.lo, and A's last b <= combined.lo after check. C's intervals have key > hi; combined.hi could be >= C's first key? No: C keys > hi, combined.hi = max(hi, B_last.hi). B_last.hi vs C first key: C first key a_c > hi; is a_c >= B_last.hi? Since intervals disjoint merged: B_last followed by C_first in sorted order, so B_last.hi <= C_first.lo? They're merged stored intervals, disjoint and non-touching, so B_last.hi < C_first.lo? Could be touching? No — intervals() merges touching, so stored intervals are non-touching: B_last.hi < C_first.lo. Wait but is that guaranteed? We maintain invariant that stored intervals never touch. Yes, add/remove maintain merging. But actually could B_last.hi == C_first.lo? Only if touching, which invariant forbids. Hmm, but what if C_first.lo == B_last.hi and they became touching through... no, invariant maintained. Actually wait — is invariant guaranteed initially? Empty set yes. add merges touching. remove: removing [lo,hi) from [a,b) splits into [a,lo) and [hi,b) — these don't touch. OK invariant holds.

Hmm, but actually wait: do we even need strict non-touching, or just non-overlapping? The merge-on-touch requirement: intervals() must merge touching. If we maintain the invariant "no touching" always, intervals() is just traversal. Fine.

So insert combined into A, then merge treaps A+combined? Simpler: treap merge requires all keys of left < all keys of right. Insert combined into A via normal treap insert (by key combined.lo). Then result = merge(A', C)? But combined.hi might be... A' keys all < combined.lo? No — A keys < lo <= combined.lo, but A's last popped if merged, else A's last key < lo = combined.lo possibly (combined.lo = lo). Actually if A's last not merged, A keys all < lo <= combined.lo? combined.lo = lo in that case (B empty or B.first.lo... if B nonempty combined.lo = B.first.lo >= lo; A keys < lo <= combined.lo ✓). So all A keys < combined.lo ✓. Then merge A' with C: A' max key = combined.lo... need A' keys < C keys: C keys > hi. combined... A' contains combined with key combined.lo <= hi < C keys? combined.lo could be B.first.lo which is <= hi. And combined.hi = max(hi, B_last.hi) < C_first.lo. So keys fine: merge(A', C) valid.

Edge: also need to check A's last merging when B empty: A last [a,b), if b >= lo merge. Combined = [a, hi) then... and C first key > hi, combined.hi = hi < C_first.lo ✓.

remove(lo, hi):
- split into A (key < lo), B (key in [lo, hi)), i.e., key < hi... intervals with lo_key in [lo, hi): those overlap [lo,hi). Plus possibly A's last with b > lo. Hmm careful: interval [a,b) overlaps [lo,hi) iff a < hi and b > lo. Intervals with key a in [lo, hi): a < hi ✓ and b > lo ✓ (b > a >= lo). Overlap. Intervals with key < lo: only the last one can have b > lo → overlap. Intervals with key >= hi: a >= hi → no overlap (a == hi: [hi,b) vs [lo,hi) — disjoint, no touching needed for remove).

So: split by key < lo → A, rest. Split rest by key < hi → B, C.
- Process B: each interval [a,b) in B: a in [lo,hi), b > a. Remove [lo,hi) from it: leaves [a, lo) if a < lo — impossible since a >= lo. Leaves [hi, b) if b > hi. So each B interval contributes [hi, b) if b > hi. Only the last B interval can have b > hi? No — B intervals disjoint: b_i <= a_{i+1} < hi... a_{i+1} < hi (in B), so b_i <= a_{i+1} < hi, so b_i <= hi, only b_i == hi possible? Then contributes nothing. Actually b_i < a_{i+1} (non-touching) so b_i < hi strictly except last: last B interval b could be > hi → contributes [hi, b_last). Hmm wait but could multiple B intervals have b > hi? b_i <= a_{i+1} and a_{i+1} < hi means b_i < hi. So only last.
- A's last [a,b): b > lo → contributes [a, lo) (if a < lo always true). Actually removal from [a,b) of [lo,hi): a < lo (key < lo), leaves [a, min(b, lo)) = [a, lo) if b >= lo. If b <= lo, unaffected.

So remove: result = A (possibly with last truncated to [a,lo)) + [hi, b_last) if last B interval has b > hi + C. Also if A's last truncated to empty (b == lo, i.e., [a,lo) empty? b > lo required; if b <= lo, keep as is). Wait if A's last has b > lo, replace with [a, lo). If b <= lo, keep unchanged.

Also B's intervals other than last fully consumed. B's last [a,b): if b > hi, keep [hi, b) with key hi. Insert into... position: after A, before C. Key hi, A keys < lo <= hi ✓ (A's last key a < lo, and truncated to [a, lo) with key a < lo <= hi). C keys >= hi? C keys >= hi... C = keys >= hi. Hmm key hi could equal C's first key? C first key >= hi. If C first key == hi: that interval [hi, ...) and we add [hi, b_last) — touching! Merge. But can that happen? C first key a_c >= hi, and B's last b <= ... B last key a_B < hi, next interval a_c >= b_B... invariant non-touching: b_B < a_c... wait if b_B > hi then a_c >= b_B > hi, so a_c ≠ hi when b_B > hi. If b_B <= hi no contribution. So if contribution [hi, b) exists, C keys > hi strictly? a_c > b_B > hi ✓. And A keys < lo <= hi, contribution key hi > A keys ✓. Good.

Hmm wait, but there's subtlety: what about B's last when b_B > hi — but also could there be an interval in C that we should merge with [hi, b_B)? No, C first key > b_B as shown... a_c >= b_B and non-touching gives a_c > b_B. Fine.

Actually hold on — C = keys >= hi (split by key < hi gives B, key >= hi gives C). C first key could equal hi (interval starting exactly at hi). As shown, if b_B > hi then a_c > b_B > hi. If b_B <= hi, no contribution, fine.

Also A's last truncation: [a, lo) with key a. Fine.

Implementation: treap with split by key and merge. Keys are lo values; all keys distinct (disjoint intervals). Need max of A (last interval) — treap doesn't give O(log n) max easily... actually treap: rightmost node. We can traverse rightmost — O(depth) which is O(log n) expected. Fine.

For split operations: standard treap split by key (key < k goes left). Need three-way: split(t, lo) → (A, D); split(D, hi) → (B, C).

Then for add: need last of A and last of B, first of B. Getting last: rightmost node descent. But we destroy the treap structure during split? Split produces valid treaps; rightmost descent O(log n). OK.

Node: store lo, hi, priority, left, right. Also maybe subtree for len? __len__ = number of intervals — maintain count via subtree size? Or just track a counter for number of intervals. add: net change computable: we remove B (size_b intervals) and possibly A's last... Let me just track count with subtree sizes to be safe, or a simple counter:

add: count += 1 (new merged interval) - (1 if merged with A's last else 0) - len(B)... but if B nonempty, combined replaces all of B → count += 1 - len(B) - (1 if A-merge). If B empty: count += 1 - (1 if A-merge). Actually combined always inserted (could it be empty? lo < hi given, combined [lo,hi) at minimum). So:

count += 1 - size(B) - (1 if A_last merged else 0).

remove: count -= size(B) ... B intervals: all fully removed except last may leave [hi,b). A's last: either kept (truncated, still one interval) or kept unchanged. So count -= size(B) - (1 if B_last contributes else 0). Hmm B_last contributes [hi, b) — still one interval. So count -= (size_B - 1 if contribution else size_B)? Let's see: B had k intervals; after removal, remaining from B: 1 if last contributes else 0. count += (1 if contrib else 0) - k.

contains(x): treap search by key: find node with largest lo <= x; check x < hi. O(log n) — descend: standard BST search: at node, if x < node.lo go left, elif x >= node.hi go right, else True. Wait if x >= node.lo and x < node.hi → True. If x >= node.hi → could be in a later interval → go right. Correct.

total_length: maintain sum of (hi-lo) per subtree, update on merges/rotations. Or maintain a running total counter. Simpler: maintain total as instance attribute updated in add/remove. add: total += combined length - sum of removed... we need lengths of B intervals and A last. During split we can sum. Alternatively maintain subtree length sums — cleaner and robust. Let's maintain subtree aggregates: size and length_sum. Split/merge recomputes.

Actually simpler: since splits disassemble and reassemble everything, recompute aggregates in split/merge bottom-up as we return. Standard.

Let me write treap:

```python
import random

class _Node:
    __slots__ = ("lo", "hi", "prio", "left", "right", "cnt", "total")
    def __init__(self, lo, hi):
        self.lo = lo; self.hi = hi
        self.prio = random.random()
        self.left = None; self.right = None
        self.cnt = 1; self.total = hi - lo
```

Use random.getrandbits for speed. Use recursion for split/merge — depth O(log n) expected, 60k nodes, recursion fine but function call overhead. Python recursion for 60k adds × ~2 splits × depth ~ 2*17 ≈ 40 calls per split → 60k * 3 * 40 ≈ 7M calls — fine, well under 5s? Each split does O(log n) recursive calls with tuple packing. Should be ~1-2 seconds maybe. Let's estimate: split with recursion: per level: one function call, comparisons, node assignments, tuple return. ~17 levels per split, 2-3 splits per add, plus merge, plus insert. ~100-200 node operations per add × 60k = ~10M ops → maybe 3-5 seconds in Python. Hmm, borderline. Could be risky against "well under 5 seconds".

Alternative: iterative split/merge? Treap split is naturally recursive but can be done iteratively collecting nodes then rebuilding. Or use a different structure.

Alternative approach: sorted list of endpoints with chunking. Or... actually, another classic approach for interval sets: maintain sorted list of boundaries (the "staircase"): represent set as sorted list of points p0 < p1 < p2 < ... where [p0,p1) ∪ [p2,p3) ∪ ... Actually store boundaries array b where set = union of [b[0],b[1]), [b[2],b[3]), ... — even index starts, odd index ends. Then:

- add(lo,hi): find positions via bisect, manipulate the flat boundary array: This is elegant. Points: i = bisect_left(pts, lo), j = bisect_left(pts, hi). Then determine which of lo, hi already present as boundaries... Actually with the boundary representation: x in set iff index of first boundary > x is odd... hmm contains: k = bisect_right(pts, x); x in set iff (k-1) is odd? Let me define: pts sorted boundaries, set = ∪ [pts[2m], pts[2m+1]). x in set iff number of boundaries <= x is odd... If x in [pts[2m], pts[2m+1]), boundaries <= x among sorted: pts[0..2m] → 2m+1 boundaries ≤ x (if x < pts[2m+1]; if x == pts[2m+1], boundaries <= x includes it → even count, and x not in set since half-open). x == pts[2m]: count = 2m+1 odd ✓ in set. So contains: count = bisect_right(pts, x); return count % 2 == 1. 

add(lo,hi): lo' = parity handling. Let i = bisect_left(pts, lo), j = bisect_left(pts, hi). Case analysis: number of boundaries strictly less than lo determines whether lo is inside an interval. Let cl = bisect_right(pts, lo) - but easier: 

Standard algorithm: 
- i = bisect_left(pts, lo): pts[i] >= lo. Whether lo is inside: if i is... hmm depends on parity of i? Boundaries pts[0..i-1] are < lo (bisect_left). lo inside an interval iff pts[i-1]... iff the boundary immediately before lo is a start (even index). i.e., (i-1) even and i-1 >= 0 → i odd → lo inside. Wait if i == 0, lo before everything, not inside. lo inside iff i is odd? pts[0..i-1] count = i. If i odd → lo inside an interval (the interval starting at pts[i-1], even index i-1). Yes: lo inside iff i odd (given pts[i] != lo or pts[i] == lo? If pts[i] == lo, then boundaries <= lo = i+1... hmm let me redo with bisect_left semantics carefully.

Let me use: i = bisect_left(pts, lo) — number of pts strictly < lo. lo is "in set" iff i is odd. Check: pts = [1,3] (set [1,3)). lo=2: i = 1 (only 1 < 2), odd → inside ✓. lo=1: i=0, even → 1 not "inside"? But 1 IS in set ([1,3) includes 1). Hmm. lo=1 in set. i = bisect_left = 0, even → says not inside. Wrong.

The subtlety: boundary points themselves are in set iff they're start boundaries. x in set iff bisect_right(pts,x) is odd? pts=[1,3]: x=1: bisect_right = 1, odd ✓. x=2: 1, odd ✓. x=3: 2, even ✓. x=0: 0 even ✓. x=4: 2 even ✓. 

So contains: bisect_right(pts, x) & 1.

add(lo, hi): we want the resulting boundary array. Compute:
- i = bisect_left(pts, lo), j = bisect_left(pts, hi).
- lo should become a start boundary in the result unless it's inside... The new set includes [lo,hi). After union, boundaries between: we remove boundaries in (lo, hi) interior... Standard: delete pts[i:j], then fix endpoints:

After deleting pts[i:j], consider pts[i] (old pts[j] if anything deleted... careful). Let's think: the union's boundary array = keep pts[0:i], insert lo maybe, keep pts[j:], insert hi maybe.

lo insertion: lo should be a boundary iff lo is not already "covered from the left", i.e., iff the point just before position... After union, lo is a boundary iff interval containing/starting at lo starts at lo, i.e., iff lo is not strictly inside an existing interval extending from left, i.e., iff (number of pts < lo, i.e., i) is even? If i odd, there's a boundary pts[i-1] < lo with odd count before → lo strictly inside interval [pts[i-1], ...) → lo not a boundary. If i even, lo is not inside from left → lo becomes start boundary. But wait if i even and pts[i] == lo already? bisect_left gives first index with pts >= lo; pts[i] == lo possible. If pts[i] == lo and i even: pts[i] is at even index → it's a start boundary already = lo. Then we don't insert duplicate... but we deleted pts[i:j]? Hmm.

Let me restructure. Cases on parity:

Whether lo is "entering from inside": lo_inside = (i is odd)? No wait: lo strictly inside an interval iff the count of pts < lo is odd AND that interval extends past lo... pts[i-1] < lo, if i odd then pts[i-1] is at odd... index i-1 even → start boundary, interval [pts[i-1], pts[i]) hmm but pts[i] >= lo; interval [pts[i-1], pts[i]) contains lo iff lo < pts[i]. If pts[i] == lo... then pts[i-1] and lo... wait can pts[i] == lo with i odd? pts[i] == lo, i = count of pts < lo. Interval [pts[i-1], pts[i]) = [pts[i-1], lo) — doesn't contain lo. Hmm so parity of i alone isn't enough when pts[i]==lo.

Use this cleaner method:

j = bisect_left(pts, hi) — pts strictly < hi count. hi strictly inside an interval iff ... hi is a boundary in result iff hi not covered from left, i.e., count of pts < hi is even, or hi == pts[j] (hi is already a boundary at even index j → start, meaning hi... if pts[j] == hi and j even, hi is a start boundary; the new union: [.., hi) then [hi, ..) merge → hi not a boundary). Ugh.

Standard clean approach: 

i = bisect_left(pts, lo)
j = bisect_left(pts, hi)

Now: the segment of pts strictly between lo and hi gets removed: pts[i:j]... but pts[j] could equal hi — pts[j] == hi is a boundary at hi; since set is half-open, hi is "exiting": if pts[j] == hi, whether j even (start) or odd (end). We remove pts in (lo, hi) exclusive plus handle ends.

Algorithm:
- If i < j: delete pts[i:j]. Now check lo: lo becomes boundary iff lo is not inside the interval ending... Let me think about what remains: left part pts[0:i], right part pts[j:].
  - lo boundary condition: lo should be a start iff the element before insertion point (pts[i-1] if i>0) does not already "cover" lo from left with an open interval reaching to >= lo... In left part pts[0:i], all < lo... wait not necessarily: pts[i-1] < lo by bisect_left ✓ (all pts[0:i] < lo). The last interval of left part: if i is odd (i-1 even index = start), interval [pts[i-1], pts[i]) but pts[i] was deleted or i == len... Hmm after deletion indices shift. Left part has i elements; left part is valid boundary array iff i is even (starts and ends paired). If i is odd, left part ends with a start boundary pts[i-1] whose interval end was pts[i] (deleted, since i < j means pts[i] deleted, pts[i] <= ... pts[i] < hi? pts[i] >= lo and i<j → pts[i] < hi ✓). So the interval [pts[i-1], pts[i]) covered up to pts[i] <= ... and lo in (pts[i-1], ...]? lo > pts[i-1], lo <= pts[i]... lo <= pts[i] since pts[i] >= lo. Interval [pts[i-1], pts[i]) contains lo iff lo < pts[i]. If pts[i] == lo: interval ends at lo, doesn't contain lo → left part... hmm then deleting pts[i] (= lo) and the interval [pts[i-1], lo) remains, left part i elements odd count = unbalanced.

This is getting case-heavy but manageable. Alternative known-clean formulation:

For add(lo, hi):
```
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
# remove interior boundaries pts[i:j]
del pts[i:j]
# now fix endpoints:
# lo: if the boundary count before lo position... 
```
After deletion, position i is where lo would go. Elements before: pts[0:i] all < lo. lo should be inserted iff i is odd (meaning we're "inside" — the interval from left needs closing at... no wait).

Hmm, think of it as: after deleting pts[i:j], we have boundary list L = pts[0:i] + pts[j_orig:]. Total length parity: original even; deleted j-i elements. 

Desired result: boundaries = pts[0:i] + optional(lo) + optional(hi) + pts[j_orig:], where:
- lo inserted iff i is even? Let's test: pts=[1,3] (set [1,3)), add [2,4): i = bisect_left([1,3],2)=1, j = bisect_left([1,3],4)=2. Delete pts[1:2] → pts=[1]. Insert lo iff? Result should be [1,4): boundaries [1,4]. lo=2: 2 is inside [1,3) → lo not boundary. i=1 odd → not inserted ✓ if rule "insert iff even". hi=4: j=2 even → hi is a boundary (end boundary at index... after operations result [1,4): hi is end). Rule: insert hi iff j odd? j=2 even → hmm result needs hi inserted. 

Let me think again with the "covered from left" idea: 
- lo is boundary in result iff lo is NOT strictly covered from the left, i.e., iff there's no interval [a,b) with a < lo < b... wait half-open: lo not boundary iff lo strictly inside an interval, i.e., ∃ interval [a,b), a < lo < b? No: lo not boundary iff lo ∈ set and lo not the start... boundary definition: lo is a boundary iff membership differs across lo (x→lo⁻ vs lo). Membership at lo⁻: count of pts < ... hmm.

Membership function: m(x) = bisect_right(pts, x) odd. 
- Just left of lo: m(lo⁻) = number of pts <= ... pts strictly < lo... m(lo⁻) = (count of pts <= lo⁻) = i (bisect_left count) → parity of i... wait pts < lo count = i; as x→lo⁻, bisect_right(pts,x) → i. So m(lo⁻) = i & 1.
- m(lo) = bisect_right(pts, lo) & 1 = (i + (1 if pts[i]==lo... no: bisect_right counts pts <= lo = i + (number of pts == lo) = i + (1 if pts[i] == lo else 0)). Hmm but only one pt can equal lo (distinct). So m(lo) = (i + (pts[i]==lo)) & 1.

lo is a boundary in result iff m(lo) changes due to add... no — lo is boundary in RESULT iff final membership differs on either side: final m(lo⁻) vs final m(lo). final m(lo) = 1 (lo in set after add). final m(lo⁻) = i & 1 (unchanged left side... unless left interval extended — but left side membership at lo⁻ unchanged? The add only affects [lo, hi), and lo⁻ < lo, membership at lo⁻ unchanged ✓). So lo is final boundary iff m(lo⁻) ≠ m_final(lo) i.e. iff (i&1) != 1, i.e., i even. And if i odd, lo already... m(lo⁻)=1 means covered from left → lo not boundary. So: insert lo iff i even. But careful: if pts[i] == lo and i even — pts[i] is currently... we deleted pts[i:j]; if pts[i] == lo was deleted (i < j always true when? j >= i always; pts[i] deleted iff i < j). If pts[i] == lo and i even: it was a start boundary at lo (index even = start). After add [lo,hi), lo remains a start boundary — but we deleted it! Then rule says "insert lo iff i even" → reinsert. ✓ consistent. If pts[i]==lo and i odd: it was an end boundary at lo (interval ending at lo); i odd → covered from left → lo not boundary → deleted, not reinserted ✓. 

Similarly hi: final m(hi) = 0 (half-open, hi not in set unless covered from right? m(hi) could be 1 if interval starts at hi... interval [hi, b) exists → m(hi) = 1! After add, is hi in set? If there was interval [hi, b) and we add [lo,hi): union contains [hi,b) → yes hi ∈ set. Hmm! So final m(hi) = m(hi⁺)... membership just right of hi: m(hi⁺) = count pts <= hi parity = (j + (pts[j]==hi)) & 1. And m(hi⁻) = j & 1. hi is boundary in result iff m(hi⁻) ≠ m(hi⁺)?? Boundary iff membership differs between hi⁻ and hi⁺... no: boundary iff m(hi⁻) ≠ m(hi) = m(hi⁺) (they're equal since no boundary strictly between... pts at hi exactly: single point hi, m(hi) = m(hi⁺)). So hi is boundary iff j&1 != (j + (pts[j]==hi))&1 → iff pts[j] == hi and... that gives hi boundary iff pts[j]==hi XOR parity differs — (j vs j+1 parity always differ) → hi boundary iff pts[j] == hi. Hmm wait: if pts[j] == hi: m(hi⁻) = j&1, m(hi⁺) = (j+1)&1, differ → hi boundary ✓. If pts[j] != hi (pts[j] > hi or j==len): m(hi⁻) = m(hi⁺) = j&1 → hi not boundary.

But which side? If pts[j] == hi and j even: hi was a start boundary [hi, ...) — after add, interval from left covers up to hi and [hi,...) continues → merge → hi NOT boundary?! But formula says boundary. Contradiction? Let's check: pts=[3,5], set [3,5). add [1,3): i = bisect_left([3,5],1)=0, j = bisect_left([3,5],3)=0. pts[j]=pts[0]=3==hi, j=0 even. Formula: hi is boundary iff pts[j]==hi → yes. But result should be [1,5): boundaries [1,5], hi=3 NOT boundary. Formula wrong!

Recheck: m(hi⁻) for hi=3: pts < 3: none → 0 even → m(3⁻) = 0? But [1,3) added means just-left-of-3 membership... m(hi⁻) after the add = membership just left of 3 = in [1,3) → should be 1. I incorrectly said m(hi⁻) = j&1 unchanged — but j = count of pts < hi = 0; the add inserted boundary lo=1 below hi! So m(hi⁻) changes due to insertion of lo. Right — the insertion of lo at position i <= j shifts parities.

OK so do it sequentially: first handle lo (insert or not), then hi with updated array. Or compute both knowing whether lo inserted shifts hi's parity by 1.

Sequential algorithm:
```
pts = self.pts
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
del pts[i:j]
# lo: insert iff i even? (as derived: covered-from-left iff i odd)
if i % 2 == 0: insert lo at i... 
```
Wait but derived "insert lo iff i even" — check example: pts=[1,3], add [2,4): i=1 odd → don't insert lo. j=2: delete pts[1:2] → pts=[1]. Then hi: now array [1]; k = bisect_left([1], 4) = 1; insert hi iff? m(hi⁻) = 1 (inside [1,...)) → hi not... m(hi⁻)=1 means covered from left; final m(hi) = 0 (nothing starts at 4) → boundary → insert hi iff NOT covered from left... hmm: hi boundary iff m(hi⁻) ≠ m(hi⁺). m(hi⁺) = m(hi) = 0 unless interval starts exactly at hi (pts contains hi). After our deletions/insertions... if pts currently contains hi at even index (start boundary) then m(hi⁺)=1 ≠ m(hi⁻) → boundary stays. Rule: insert hi iff (count of pts < hi is even) AND (pts at that position != hi)? Let's verify: count pts < hi = k (bisect_left). m(hi⁻) = k&1. pts[k]==hi → hi is existing boundary; if k even it's a start → m(hi⁺)=1, boundary iff k&1 != 1 → k even → boundary... wait k even, m(hi⁻)=0, m(hi⁺)=1 → boundary (it's a start, stays). If k odd, pts[k]==hi is an end boundary → m(hi⁻)=1, m(hi⁺)=0 → boundary (stays as end)! Hmm so if pts[k]==hi, hi is already a boundary, keep it → don't insert (it's already there) but also don't delete. If pts[k] != hi: boundary iff m(hi⁻) ≠ 0 (final m(hi)=0 since hi not present and nothing at hi... m(hi⁺)=m(hi⁻)? no: pts[k]!=hi means no boundary at hi, m(hi)=m(hi⁻)=k&1... but final m(hi) should be 0? Is hi in final set? Only if covered from left, i.e., m(hi⁻)=1 — but then hi would be interior (interval extends past hi? interval [a,b) with a<hi<b: but then b > hi means boundary b > hi exists... pts[k] > hi could be that b! If k odd, pts[k-1] is start, interval [pts[k-1], pts[k]) with pts[k] > hi → covers hi... but wait we might have deleted... after deletion of pts[i:j_orig], remaining pts all < lo or >= hi_orig. Hmm this is getting confusing because deletion happened before.

Let me just carefully derive sequential algorithm operating on live array:

```
def add(self, lo, hi):
    pts = self.pts
    i = bisect_left(pts, lo)
    j = bisect_left(pts, hi)
    if i == j:
        # no boundaries strictly between lo and hi... pts[i] might equal lo or hi
        # check if already covered: lo covered from left and hi... if both parities...
        # covered iff count of pts < lo is odd → i odd → whole [lo,hi) already inside → return
        if i % 2 == 1 and not (pts and i < len(pts) and pts[i] == ... 
```
Hmm. Simpler: handle uniformly:

```
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
# remove boundaries in [i, j) — these are strictly inside (lo, hi)... 
```
Wait pts[i:j]: pts[i] >= lo, pts[j-1] < hi. pts[i] could == lo. Boundaries at lo: if pts[i] == lo and i even (start) — keep (re-add as start). If i odd (end at lo) — the interval [.., lo) stays as is, and lo not needed. Either way deleting then possibly reinserting works.

pts[j] could == hi (then not in deletion range pts[i:j] since pts[j] >= hi... pts[j]==hi is at index j, deletion range is [i,j) so pts[j] NOT deleted ✓ good — boundaries at hi preserved automatically... but do we want to preserve? If pts[j]==hi and j even (start at hi): interval [hi, ...) — union [lo,hi) ∪ [hi,..) → merge → hi should NOT be boundary → we must DELETE pts[j]. If j odd (end at hi): interval [.., hi) — union [lo,hi) ∪ [..,hi) → merged → hi not boundary → delete pts[j]. Wait both cases delete?! If interval ends at hi and we add [lo,hi): merged interval [min(lo,a), hi)... hi is the end → hi IS a boundary! Hold on: [a, hi) ∪ [lo, hi) = [min(a,lo), hi) → boundary at hi (end) ✓ keep. If interval starts at hi: [hi,b) ∪ [lo,hi) = [lo, b) if lo<=hi... = [min(lo, ...) hmm [lo,hi) ∪ [hi,b) = [lo,b) contiguous → hi not boundary → delete.

And pts[i]==lo: i even (start at lo): [lo,b) ∪ [lo,hi)... already handled — lo stays start boundary → keep. i odd (end at lo): [a, lo) ∪ [lo, hi) → merge → lo not boundary → delete.

So deletion rules: delete pts[i] iff pts[i]==lo and i odd... and delete pts[j] iff pts[j]==hi and j even. And delete all strictly-interior ones.

But note i==j possible with pts[i]... if pts[i]==lo==hi impossible (lo<hi). If i==j: no interior boundaries. pts[i] could == lo (index i, even→keep/odd→delete... if i odd and pts[i]==lo: delete it; but then also is lo covered from left? i odd means m(lo⁻)=1 → lo inside interval [pts[i-1], lo)?? pts[i]==lo means interval ends at lo; combined with add [lo,hi): merge → interval becomes [pts[i-1], max(hi, pts[i+1]...)). Hmm deleting pts[i] (end at lo) then inserting hi appropriately — but then the array might have odd length issues... Let's think invariants: the boundary array always has even length. Operations:

Let me define the algorithm concretely:

```
i = bisect_left(pts, lo)   # first index with pts[idx] >= lo
j = bisect_left(pts, hi)   # first index with pts[idx] >= hi
```

Step 1: determine lo_end: whether lo currently ends an interval: pts[i]==lo and i odd? Actually simpler: lo "covered from left" iff i odd?? Check: pts<lo count = i. If i odd: pts[i-1] exists, even index → start boundary. Its interval [pts[i-1], pts[i]) — contains lo iff lo < pts[i]; if pts[i] == lo, interval is [pts[i-1], lo), lo NOT inside. Hmm! So i odd + pts[i]==lo → lo is boundary (end) not interior. So "covered from left" iff i odd AND pts[i] != lo. If pts[i]==lo and i odd → lo is an end boundary.

Hmm wait, but actually if pts[i]==lo and i odd: m(lo⁻)=1, m(lo)=0 → lo boundary ✓ (end). If pts[i]==lo and i even: m(lo⁻)=0, m(lo)=1 → boundary (start). If pts[i]!=lo: m(lo)=m(lo⁻)=i&1 → boundary iff i odd (interior point of interval [pts[i-1],pts[i]))... wait boundary iff m differs across lo: m(lo⁻)=i&1, m(lo)=i&1 → NOT a boundary, and if i odd, lo is strictly interior.

So lo is a boundary iff (pts[i]==lo) or i odd is FALSE... lo boundary iff pts[i]==lo OR i even? No: pts[i]==lo → boundary (either parity). pts[i]!=lo → boundary iff... m(lo⁻)=m(lo) → not boundary regardless of parity?? If i odd, lo interior to [pts[i-1], pts[i]) → not boundary ✓. If i even, lo in a gap → not boundary ✓. So lo is currently a boundary iff pts[i]==lo. Interesting. Similarly hi is currently a boundary iff (j < len and pts[j]==hi).

Now the add operation result boundaries: 
- final lo boundary? lo is boundary in result iff m_final(lo⁻) ≠ m_final(lo). m_final(lo) = 1 (added). m_final(lo⁻) = m(lo⁻) unchanged = i&1. So final boundary at lo iff i even. → if i even, lo must be a start boundary in result; if i odd, lo must NOT be a boundary (it's interior of merged interval).
- final hi boundary? m_final(hi⁺) = m(hi⁺) unchanged?? Membership just right of hi: affected only by boundaries at hi itself. m(hi⁺) = (j + (pts[j]==hi)) & 1... this is parity after boundary at hi. Hmm m(hi⁺) counts pts <= hi: = j + (pts[j]==hi ? 1 : 0). Final m(hi⁻): could change due to new boundaries inserted below hi (lo). m_final(hi⁻) = 1 (hi covered from left after add — [lo,hi) means just-left-of-hi is in set) — yes always 1? Just left of hi: in [lo,hi) → in set ✓ (hi > lo, points just below hi are in the added interval). So m_final(hi⁻) = 1.
  m_final(hi⁺) = m(hi⁺) original? Boundaries above hi unchanged, boundary at hi: if pts[j]==hi kept or deleted... m(hi⁺) original = (j+1)&1 if pts[j]==hi else j&1. Is m(hi⁺) changed by add? Points just right of hi: their membership determined by boundaries <= hi⁺ = boundaries < hi plus any boundary at hi. The add doesn't add/remove boundaries at hi except... the interval [lo,hi) has no boundary at hi⁺ side... adding [lo,hi) doesn't create boundary at hi unless merging requires. m(hi⁺) is unchanged by the add (the added interval's boundaries are lo (below hi) and possibly hi (end)). Hmm — if the add results in an end boundary at hi, then m(hi⁺) changes from m(hi⁻)... 

Let's think: final m(hi) = m_final(hi⁻) adjusted for boundary at hi... circular. Let's just directly construct: final boundary array = pts[0:i] + S + E + pts[j:], where S = [lo] if i even else [], E = [hi] if ??? , and deletions: pts[i] if pts[i]==lo and i odd (it's an end at lo that must be removed since lo no longer boundary)... wait but if pts[i]==lo and i odd, lo is an end boundary currently; after add lo must NOT be boundary → the interval [pts[i-1], lo) must merge with [lo,hi) → delete pts[i] and don't insert lo. But "S = [lo] if i even" — i odd → no insert ✓, and we need deletion of pts[i]. But pts[i] is within pts[i:j] deletion range ✓ (i < j? If pts[i]==lo < hi, then pts[i] < hi so i < j ✓). 

And pts[j]==hi: j even → start at hi → must delete (merge). j odd → end at hi → keep. Is pts[j] in deletion range? Deletion pts[i:j] excludes pts[j]. So handle specially: if j < len(pts) and pts[j]==hi and j even → delete it (index j after earlier deletions shifts... careful with indices).

Hmm wait, if pts[j]==hi and j even, deleting it: then E = [hi] if ...? After deletion, final m(hi⁺) = j&1 (the boundary at hi removed → m(hi⁺) = parity of pts <= hi = j... pts[j] was hi; after removal, pts <= hi count = j → m(hi⁺) = j&1 = 0 (j even) → hi not in set just right ✓ consistent with merged interval ending... no wait merged interval [min(lo,...), max(hi, pts[j+1])) — interval extends past hi! Then m(hi⁺) = 1. Hmm, pts[j+1] is the end of interval [hi, pts[j+1]). After merging [lo,hi) + [hi, pts[j+1]) = [lo', pts[j+1]). Boundaries: lo' (start) and pts[j+1] (end). hi is interior → not boundary ✓. m(hi⁺) = membership just right of hi = in [lo', pts[j+1]) = 1. Count of pts <= hi in final array: final array = pts[0:i] + [lo] + pts[j+1:] (hi not boundary). pts <= hi: pts[0:i] (all < lo <= ... < hi? pts[0:i] < lo < hi ✓, i elements) + lo (1) = i+1 elements <= hi... plus lo... wait is lo <= hi ✓ counted. So count = i + 1. m(hi⁺) = (i+1)&1. And m(hi⁻) = count pts < hi = i (pts[0:i] < lo < hi; lo is not < hi... lo < hi ✓ lo IS < hi! So pts < hi includes lo → count = i + 1?? Hmm m(hi⁻) = count of pts strictly < hi: final array pts < hi: pts[0:i] (i of them) + lo = i+1. m(hi⁻) = (i+1)&1 = 1 requires i even ✓ (we inserted lo because i even). Good consistent: m(hi⁻)=1 ✓.

So general construction: final = pts[0:i] + ([lo] if i even) + ([hi] if hi_needed) + pts[j_d:], where pts[j_d:] is pts[j:] possibly with pts[j] removed if pts[j]==hi and j even.

hi_needed: final hi boundary iff m_final(hi⁻) ≠ m_final(hi⁺).
m_final(hi⁻) = 1 always (shown above... wait is it? Just left of hi is in [lo,hi) ⊆ set → yes m(hi⁻)=1 always after add).
m_final(hi⁺) = membership just right of hi = determined by whether hi is start boundary of remaining intervals: if pts[j]==hi and j even → there's interval starting at hi → after merge considerations: the interval [hi, ...) merges with added [lo,hi) → hi interior → m(hi⁺)=1... hmm but m(hi⁺) as "just right of hi" = 1 since interval [hi,...) covers → and m(hi⁻)=1 → hi NOT boundary. If pts[j]==hi and j odd → interval ends at hi → just right of hi is gap (or next interval later) → m(hi⁺) = 0 → hi IS boundary (end). If pts[j] != hi (pts[j] > hi): just right of hi: membership = count pts <= hi parity... no boundaries at hi; pts <= hi = pts[0:i] + maybe lo + maybe hi(if inserted). Ugh.

Alternative cleaner: compute via parity formula. m_final(hi⁺) = m_orig(hi⁺)? Membership just right of hi is unaffected by adding [lo,hi) — points just right of hi were unaffected... TRUE: the add changes membership only on [lo, hi). Points in (hi, ∞) unchanged; point hi itself: could change (from gap to covered-from-left? m(hi) = membership at exactly hi: before: m(hi) = (j + (pts[j]==hi))&1; after: hi ∈ set iff covered from left (m(hi⁻)=1) or interval starts at hi... after add: if pts[j]==hi & j even → interval [hi,...) exists → hi ∈ set → m_final(hi) = 1. Otherwise m_final(hi) = m_final(hi⁻) = 1 if ... hmm if interval [hi, b) doesn't exist, hi ∈ set iff [lo,hi) covers hi — half-open, no → m_final(hi) = 0?? But wait if pts[j]==hi & j odd: interval [a, hi) existed and [lo,hi) added → hi still not in set (end boundary) → m_final(hi) = 0. If pts[j] != hi: m_final(hi) = 0 unless... just m_final(hi) = 0? But what if hi covered... no, half-open: hi ∉ [lo,hi). And no interval starts at hi (pts[j] != hi... pts[j] > hi or j == len). But could there be interval starting at hi that... pts[j]==hi check covers it. So m_final(hi) = 1 iff (j < len and pts[j] == hi and j even), else 0.

Boundary at hi in final iff m_final(hi⁻) ≠ m_final(hi): m_final(hi⁻)=1. So hi is final boundary iff NOT (pts[j]==hi and j even). I.e., insert/keep hi unless it's currently a start boundary at hi (which must merge away).

Similarly lo: boundary iff m_final(lo⁻) ≠ m_final(lo) = 1 → boundary iff m(lo⁻) = 0 → iff i even ✓ (m(lo⁻) = i & 1 — wait m(lo⁻) = count pts < lo = i, parity i&1... m(lo⁻) means limit as x→lo⁻ of bisect_right(pts,x) = count of pts <= x for x just below lo = count pts < lo = i. So m(lo⁻) = i&1.) But careful: if pts[i]==lo, m(lo⁻)=i&1 still ✓ (pts < lo = i).

Great, so:

add(lo, hi):
```
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
# delete interior + end-at-lo + start-at-hi:
```
Deletions: indices i..j-1 (all), plus pts[j] if pts[j]==hi and j even. Wait should pts[i] be deleted when pts[i]==lo and i even? It's a start at lo, we keep lo as boundary → equivalent to delete-and-reinsert, or just keep. To keep code simple: delete pts[i:j] entirely, then reinsert lo iff i even, reinsert hi iff not(start-at-hi case)... but start-at-hi case: pts[j]==hi, j even — that element was NOT deleted (index j). Need extra deletion. Also if pts[j]==hi and j even, we delete it and then... do we insert hi? hi not boundary → no. If pts[j]==hi and j odd: keep (end boundary at hi) → don't insert. If pts[j]!=hi: insert hi iff? hi boundary iff not(pts[j]==hi and j even) → pts[j]!=hi → insert hi. Wait but also need m_final(hi⁺) consistency: inserting hi as end boundary; m_final(hi⁺) = m_orig(hi⁺) = j&1 (pts[j]!=hi) → m_final(hi⁺) = j&1... and boundary iff differs from m_final(hi⁻)=1 → boundary iff j even. Hmm! Conflict: rule "insert hi iff pts[j] != hi" says always insert when pts[j]!=hi, but parity says insert iff j even?

Let me test: pts=[1,3] (set [1,3)). add [5,7): i = bisect_left([1,3],5) = 2, j = 2. Delete pts[2:2] = nothing. i even → insert lo=5 → pts=[1,3,5]. hi=7: pts[j]=pts[2]=3 != 7 → by "always insert" rule insert 7 → [1,3,5,7] ✓ correct (set [1,3) ∪ [5,7)). Parity rule "insert iff j even": j=2 even → insert ✓. Both agree here. Now: pts=[1,3], add [2,10): i=1, j=2. Delete pts[1:2] → [1]. i odd → no lo insert. hi=10: pts[j]=pts[2]... after deletion indices shifted! j=2 refers to original array. Original pts[2] doesn't exist (len=2) → pts[j]!=hi → insert → [1,10] ✓. Parity: j=2 even → insert ✓.

Test where they differ: pts=[1,5] (set [1,5)), add [2,3): i = bisect_left([1,5],2)=1, j = bisect_left([1,5],3)=1. i==j. Delete nothing. i odd → no lo insert ✓ (2,3 interior). hi: pts[1]=5 != 3 → "always insert" → insert 3?? Result [1,5,3] — unsorted, wrong! Parity rule: j=1 odd → no insert ✓. Result [1,5] ✓ (already covered).

Ah I see my error: when pts[j] != hi and j odd: hi is interior of interval [pts[j-1], pts[j]) with pts[j] > hi → hi already covered from left, m(hi⁺) = m(hi⁻) = 1 → not boundary → no insert ✓. And m_final(hi⁻)=1, m_final(hi⁺) = m_orig(hi⁺)?? m_orig(hi⁺) = membership just right of hi = 1 (interior). ✓ boundary iff differ → no boundary ✓. So correct rule: insert hi iff NOT(pts[j]==hi and j even) AND NOT(pts[j]!=hi and j odd) → insert hi iff j even and pts[j] != hi?? Check pts[j]==hi & j even → no insert ✓ (merge). pts[j]==hi & j odd → no insert ✓ (end boundary kept). pts[j]!=hi & j even → insert ✓ (gap at hi). pts[j]!=hi & j odd → no insert ✓ (interior). But wait pts[j]==hi & j odd: hi is currently an END boundary (kept). But is it? The interval ending at hi merges with [lo,hi) → still ends at hi ✓ keep ✓.

Hmm wait, one more check: pts[j]==hi & j even means interval starts at hi; merged interval continues past hi; hi not boundary → must DELETE pts[j]. But then the end pts[j+1] remains ✓.

But subtle: when j even and pts[j]==hi, we delete pts[j] — but ALSO what if i == j? E.g., pts=[3,5], add [1,3): i = bisect_left([3,5],1)=0, j = bisect_left([3,5],3)=0. i==j=0. Delete pts[0:0] nothing. i even → insert lo=1 → [1,3,5]?? But wait pts[0]==3==hi, j=0 even → delete pts[j]=3 → [1,5] ✓. Then insert hi? Rule: j even and pts[j]==hi → no insert ✓. Final [1,5] ✓.

Another: pts=[3,5], add [1,4): i=0, j=0 (3<4? bisect_left([3,5],4)=1). Hmm bisect_left([3,5],4) = 1 since 3<4. j=1. Delete pts[0:1] → [5]. i=0 even → insert lo=1 → [1,5]. hi=4: pts[1]=5 != 4, j=1 odd → no insert ✓. Result [1,5] ✓ ([1,4)∪[3,5)=[1,5)).

Another: pts=[1,4], add [4,6): i = bisect_left([1,4],4) = 1, j = bisect_left([1,4],6) = 2. Delete pts[1:2] → [1]. i=1 odd → no lo. hi=6: j=2 even, pts[2] doesn't exist → insert → [1,6] ✓.

Another: add to empty: pts=[], i=j=0, delete nothing, i even → insert lo; j even, pts[j] doesn't exist (pts[j]!=hi trivially) → insert hi → [lo,hi] ✓.

Another: pts=[1,3],[5,7] → [1,3,5,7]; add [3,5): i = bisect_left(...,3) = 1, j = bisect_left(...,5) = 2. Delete pts[1:2] → [1,5,7]. i=1 odd → no lo insert?? But result should be [1,7]: boundaries [1,7]. Hmm: [1,3) ∪ [3,5) ∪ [5,7) = [1,7). lo=3: covered from left? [1,3) ends at 3; 3 interior of merged ✓ not boundary ✓. hi=5: j=2 even, pts[2]==5==hi → start at 5 → delete pts[2] → [1,7]?? Wait after deletion array is [1,5,7]; delete pts[j]=pts[2]=5 → [1,7]. Then no hi insert ✓. Result [1,7] ✓.

But wait — indices: after deleting pts[i:j], positions shift. pts[j] in original array = index j; after deletion of (j - i) elements before it, it's at index i... I should compute deletion before referencing. Let me restructure:

```
def add(self, lo, hi):
    pts = self.pts
    i = bisect_left(pts, lo)
    j = bisect_left(pts, hi)
    # boundaries strictly between lo and hi, plus possibly an end at lo:
    # delete pts[i:j]
    # additionally, if pts[j] == hi and j is even (start boundary at hi), delete it too.
    # Then insert lo at position i if i is even... 
```
Careful: if pts[j]==hi and j even and i==j: delete pts[i:j] (nothing) then delete pts[j] → then insert lo iff i even → i == j even → insert lo at i ✓. Then hi not inserted ✓. Result: pts[0:i] + [lo] + pts[j+1:]. Check example above ✓.

If pts[j]==hi and j even and i < j: delete pts[i:j+1]? No wait — delete pts[i:j] AND pts[j] → delete pts[i:j+1]. Then insert lo iff i even, no hi. But hold on — if pts[j]==hi, j even, but also should we double check lo insertion parity unaffected ✓.

Hmm, but one more subtlety: when pts[j]==hi and j even and we delete it, could the merged interval's end now touch the next start? pts[j+1] is end of interval [hi, pts[j+1])... wait no: pts[j]==hi at even index j → start; pts[j+1] = its end (odd index). After deleting pts[j], array = ... pts[j+1] now at even index → becomes a start?? That's wrong unless lo-insertion rebalances. Let's recount parities: final array = pts[0:i] + [lo if i even] + pts[j+1:]. For validity, need even total. Original even length n. Deleted (j - i) + 1 elements, inserted (i even ? 1 : 0). Total = n - (j-i) - 1 + (i&1==0 ? 1 : 0). j even → j - i parity = i parity... j even: if i even: j-i even; total = n - even - 1 + 1 = n ✓ even. If i odd: j-i odd; total = n - odd - 1 + 0 = n - even ✓ even. Good, always balanced.

And the element pts[j+1] (originally odd index → end boundary) lands at index: i + (lo inserted?1:0). If i even: index i+1 odd → end ✓. If i odd: index i → even → start?! Problem? Let's check with example: pts=[1,3,5,7]? Hmm need case pts[j]==hi, j even, i odd. pts = [1,3,5,7] (set [1,3)∪[5,7)). Add [2,5): lo=2: i = bisect_left(pts,2) = 1. hi=5: j = bisect_left(pts,5) = 2. pts[2]==5==hi, j even → delete pts[j]. Delete pts[1:3] → [1,7]. i=1 odd → no lo insert. Result [1,7] ✓ ([1,3)∪[2,5)∪[5,7) = [1,7)). Here pts[j+1]=pts[3]=7 originally end; final array [1,7]: 7 at index 1 (odd) → end ✓. My parity worry: final index of pts[j+1] = i + (i even ? 1 : 0) = i when i odd = 1 → odd ✓ end. When i even: index i+1 odd ✓ end. OK fine — since if i even, lo inserted before it. Good, no issue.

Hmm wait, but when i odd and pts[j]==hi j even: deleted j-i+1 = odd+1 = even elements, inserted 0 → parity preserved ✓, and pts[j+1] at index i (odd) ✓. Good.

Now also verify m_final(hi⁻) = 1 in all branches: if i even, lo inserted → pts < hi includes lo → fine. If i odd → covered from left by [pts[i-1], ...] which after merge extends to at least hi ✓.

Edge: pts[j]==hi, j even, and j == len(pts)? pts[j] doesn't exist → no special deletion; j even → insert hi ✓. Fine.

Also: what if pts[i]==lo and i even and i == j? E.g., pts=[2,5], add [2,3): i = bisect_left([2,5],2) = 0, j = bisect_left([2,5],3) = 1. Not equal. Delete pts[0:1] → [5]. i even → insert 2 → [2,5]. hi=3: j=1 odd, pts[1]=5≠3 → no insert. Result [2,5] ✓ (already contained).

Edge: pts=[2,5], add [2,5): i=0, j=1? bisect_left([2,5],5)=1. delete pts[0:1] → [5]. insert lo=2 → [2,5]. hi=5: pts[1]=5==hi, j=1 odd → keep, no insert ✓. Result [2,5] ✓.

Edge: add [1,2) where pts=[2,3): i=0, j=0. i==j. delete nothing. i even → insert lo=1 → [1,2,3]. hi=2: pts[1]... j=0, pts[0]==2==hi, j even → delete pts[0]?? Wait pts[j] is pts[0]=2, j=0 even → delete → [1,3]. Then insert hi? Rule: pts[j]==hi & j even → no insert ✓. Result [1,3] ✓ ([1,2)∪[2,3)).

But careful about ORDER of operations: we delete pts[j] (which after pts[i:j] deletion may have shifted). Let's implement carefully:

```
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
# delete range [i, j) and possibly pts[j]:
if j < len(pts) and pts[j] == hi and (j % 2 == 0):
    del pts[i:j+1]
    insert_hi = False
else:
    del pts[i:j]
    insert_hi = (j % 2 == 0) and not (j < len(pts) and pts[j] == hi)
    # wait: pts[j]==hi and j odd → no insert; pts[j]==hi and j even handled above; pts[j]!=hi and j even → insert; pts[j]!=hi and j odd → no.
    # So insert_hi = (j even) and pts[j] != hi — but pts[j]==hi&even handled above. In else branch: insert_hi = (j % 2 == 0). Hmm but if pts[j]==hi and j even we're in the if branch. So else: insert_hi = (j%2==0)?? But pts[j] might == hi with j even? No, excluded. But what if pts[j]==hi... can't with j even here. So insert_hi = j%2==0. Wait but need pts[j]!=hi check? In else branch, either pts[j]!=hi or j odd. If j even then pts[j]!=hi (else if-branch). So insert_hi = (j % 2 == 0). Hmm but actually if j == len(pts): pts[j] doesn't exist; insert iff j even ✓ consistent.
# insert lo:
if i % 2 == 0:
    pts.insert(i, lo)
```
Wait — insertion of lo at position i: after deletion, position i is correct (elements before i untouched). And insert_hi at position... after lo insertion, hi goes at index: position after all elements < hi. Elements: pts[0:i] < lo < hi... plus lo inserted at i. Then remaining elements from old j onward are all >= hi... old pts[j] >= hi. So hi inserts at index i + (i even?1:0)... = position k where k = i + (1 if lo inserted else 0). Hmm but if not lo inserted and remaining elements start at old pts[j]... all >= hi? old pts[j] >= hi ✓ (bisect_left). But old pts[j] == hi possible with j odd (end boundary at hi, kept) → then hi insert would create duplicate at... insert_hi = j%2==0 → false when j odd → no insert ✓. When j even and pts[j]==hi → if-branch, no insert ✓. When insert_hi true (j even, pts[j] != hi or j == len): all remaining elements > hi? old pts[j] > hi ✓ (since != hi and >= hi). So insert at end of "left+lo" section: index = i + (lo_inserted). Let me verify with example: pts=[1,3], add [5,7): i=2, j=2, del pts[2:2] nothing, insert_hi: j even, pts[2] doesn't exist → but code: `j < len(pts) and pts[j]==hi` false → else branch, insert_hi = j%2==0 = True. lo: i even → insert at 2 → [1,3,5]. hi at index 2+1 = 3 → [1,3,5,7] ✓.

Another: pts=[1,3,5,7], add [0,2): i=0, j = bisect_left(pts,2)=1. pts[1]=3≠2 → else. del pts[0:1] → [3,5,7]. insert_hi = j%2==0 = True?? j=1 odd → False ✓. lo: i=0 even → insert at 0 → [0,3,5,7]?? Expected: [0,2) ∪ [1,3) ∪ [5,7) = [0,3) ∪ [5,7) → [0,3,5,7] ✓. 

Another: pts=[1,3,5,7], add [2,6): i=1, j = bisect_left(pts,6)=3. pts[3]=7≠6 → else. del pts[1:3] → [1,7]. insert_hi = 3%2==0? False ✓. lo: i=1 odd → no. Result [1,7] ✓ ([1,3)∪[2,6)∪[5,7)=[1,7)).

Another: pts=[1,3,5,7], add [4,6): i = bisect_left(...,4)=2, j = bisect_left(...,6)=3. pts[3]=7≠6 → else, del pts[2:3] → [1,3,7]. insert_hi = 3 even? False ✓. lo: i=2 even → insert at 2 → [1,3,4,7]. Result [1,7] ✓ ([1,3)∪[4,6)∪[5,7) = [1,3)∪[5,7)... wait [4,6) ∪ [5,7) = [4,7). So [1,3)∪[4,7) → [1,3,4,7] ✓.

Great, algorithm works. remove(lo, hi):
Symmetric. Remove [lo,hi): 
- m_final(lo⁻) = m(lo⁻) = i&1 unchanged. m_final(lo) = 0 (removed; unless covered... lo ∉ [lo,hi) removed; could lo be in another interval? No others overlap [lo,hi) region... intervals containing lo: only ones covering from left [a,b) b>lo — but b <= ... such interval overlaps [lo,hi) → partially removed → after removal lo ∉ set... unless b... interval [a,b) with a<lo<b: removal of [lo,hi) leaves [a,lo) → lo not in it. So m_final(lo)=0.) → lo boundary iff m(lo⁻)=1 → iff i odd → insert lo as END boundary if i odd.
- hi: m_final(hi⁻) = 0 (just-left-of-hi removed). m_final(hi⁺) = m_orig(hi⁺) unchanged? Points just right of hi unaffected ✓, and boundary at hi: m(hi⁺) = (j + (pts[j]==hi))&1. hi boundary iff m_final(hi⁻) ≠ m_final(hi⁺)?? Boundary iff membership differs at hi: m(hi⁻) vs m(hi⁺). m_final(hi⁻)=0. m_final(hi⁺) = (j + (pts[j]==hi?1:0)) & 1... hmm wait is m(hi⁺) really unchanged? Original m(hi⁺) counts pts <= hi: j + (pts[j]==hi). After removal: boundaries <= hi: pts[0:i]... this is getting complicated with deletions. Let's construct directly like before.

Final array = pts[0:i] + [lo if i odd] + [hi if needed] + pts[j'] where deletions...

Current boundaries: pts[i] could == lo (start at lo, index i even → interval [lo, ...) → removal chops its start → becomes [hi, ...) → delete pts[i] (=lo) and insert hi at its place. If pts[i]==lo and i odd → end at lo → interval [a, lo) untouched by removal → KEEP pts[i], don't insert lo (lo not boundary ✓ since m(lo⁻)=1, m(lo)=0... wait m_final(lo⁻): interval [a,lo) still there → m(lo⁻) = 1 = i&1 odd ✓; boundary iff differ: m(lo)=0 ≠ 1 → lo IS a boundary (end at lo)! Hmm contradiction with earlier claim.

Wait: m_final(lo) = 0? lo ∉ set after removal? Interval [a, lo) — lo is its end, half-open → lo ∉ set ✓. m_final(lo⁻) = 1 (in [a,lo)). Boundary iff m(lo⁻) ≠ m(lo) → 1 ≠ 0 → boundary ✓. So lo IS an end boundary in this case. And earlier I said "m_final(lo)=0 → boundary iff m(lo⁻)=1 → iff i odd". Here i odd (pts[i]==lo at odd index = end) → boundary ✓ consistent. So rule: insert lo (as boundary) iff i odd. But if pts[i]==lo and i odd, lo already present as end boundary — deleting range pts[i:j]? pts[i]==lo is at index i; deletion range pts[i:j] would delete it. Hmm. So similar special handling: 

Uniform approach: delete pts[i:j], then reinsert lo iff i odd, reinsert hi iff condition.

Check pts[i]==lo, i odd: deleted (in range since i<j — pts[i]==lo<hi → i<j ✓), then reinserted at i ✓ same position. Good.

pts[i]==lo, i even: start boundary at lo deleted, then i even → not reinserted ✓ (start chopped → hi becomes new start).

Now hi: current boundary at hi iff pts[j]==hi. Cases:
- pts[j]==hi, j odd: end boundary at hi → interval [a, hi) with a >= ... a > lo? The interval containing hi⁻ side... after removal, this interval [a,hi): was it affected? Its start a: a >= hi? No — it ends at hi so a < hi. a could be < hi and... the interval [a, hi) overlaps [lo,hi) (a < hi, hi > lo) → its part [max(a,lo), hi) removed → remaining [a, lo) if a < lo. Hmm so this interval gets chopped to [a, lo) → its end hi must be REMOVED (becomes end lo). But wait we also handle lo insertion... i odd → insert lo as end ✓. So delete pts[j] (end at hi) and insert lo. Then hi not boundary → don't insert hi. But hold on — could this interval be entirely within [lo,hi)? a >= lo → a in [lo, hi) → a = pts[j-1]... then whole interval removed, and pts[j] deletion + pts[j-1] deletion (in range) ✓ balanced.
- pts[j]==hi, j even: start boundary at hi → interval [hi, b) untouched by removal (hi ∉ [lo,hi)) → keep → hi remains boundary → don't insert, don't delete ✓ (pts[j] not in deletion range ✓).
- pts[j] != hi: hi currently interior or gap. After removal, hi boundary iff m_final(hi⁺) ≠ 0 → m_final(hi⁺) = m_orig(hi⁺) = membership just right of hi = (j + (pts[j]==hi?1:0))&1 = j&1 (pts[j]!=hi) → hi boundary iff j odd → insert hi iff j odd.

Hmm wait, also need to double check m_orig(hi⁺) = j&1 when pts[j] != hi: pts <= hi = j elements (pts[0..j-1] < hi... bisect_left gives pts[j] >= hi, pts[j] != hi → pts[j] > hi → pts <= hi = j) → m(hi⁺) = j&1. Just right of hi membership = j&1? m(hi⁺) means at points just above hi — membership there = parity of count of boundaries <= those points = j (until next boundary) → j&1 ✓.

So remove:
```
i = bisect_left(pts, lo)
j = bisect_left(pts, hi)
# deletion: pts[i:j], plus special: pts[j] if pts[j]==hi and j odd (end at hi must go)
```
Wait pts[j]==hi & j odd: delete it. But it's at index j, outside pts[i:j]. So:

```
if j < len(pts) and pts[j] == hi and j % 2 == 1:
    del pts[i:j+1]
    insert_hi = False
else:
    del pts[i:j]
    insert_hi = (j % 2 == 1) and not (j < len(pts) and pts[j] == hi)
    # pts[j]==hi & j odd → if-branch; so else: insert_hi = j odd? pts[j]!=hi&j odd → insert; pts[j]!=hi & j even → no.
    # → insert_hi = (j % 2 == 1)?? if j odd and pts[j]==hi → if-branch. So else + j odd → pts[j] != hi → insert ✓. insert_hi = (j % 2 == 1) — but wait also j == len(pts) case: j odd & no pts[j] → insert ✓ (hi becomes end boundary).
```
Hmm wait, check: j odd, pts[j]==hi, j == len? can't (pts[j] exists check). If j == len(pts): insert_hi = j odd → insert ✓.

Then insert lo iff i odd at position i (after deletions, position i still correct since pts[0:i] untouched).

Then insert hi at position: after lo section. hi position: index = i + (1 if lo inserted else 0). All remaining elements from old j' onward are >= hi... old pts[j] >= hi; if pts[j]==hi & j even (kept, not deleted): it's a start boundary at hi; inserting another hi?? insert_hi = j odd → false in that case ✓. If insert_hi true: remaining elements all > hi ✓ (pts[j] > hi or none). So insert hi at index i + (lo_inserted?1:0). But wait — need remaining elements at that point to be > hi: old pts[j] > hi ✓.

Hmm, but careful: when insert_lo and old pts[j]==hi & j odd deleted... fine.

Let me test remove cases:

pts=[1,5], remove [2,3): i = bisect_left([1,5],2)=1, j = bisect_left([1,5],3)=1. i==j. pts[1]=5≠3 → else, del pts[1:1] nothing. insert_hi = j odd = True. lo: i odd → insert lo=2 at 1 → [1,2,5]. hi at index 1+1=2 → [1,2,3,5] ✓ ([1,5) minus [2,3) = [1,2)∪[3,5)) ✓.

pts=[1,5], remove [1,3): i = bisect_left([1,5],1)=0, j = bisect_left([1,5],3)=1. pts[1]=5≠3 → else, del pts[0:1] → [5]. insert_hi = 1 odd → True. lo: i=0 even → no. hi at index 0 → [3,5] ✓.

pts=[1,5], remove [3,7): i=1, j=2. pts[2] doesn't exist → else, del pts[1:2] → [1]. insert_hi = 2 odd? False. lo: i odd → insert 3 at 1 → [1,3] ✓ ([1,5) minus [3,7) = [1,3)) ✓.

pts=[1,3,5,7], remove [2,6): i=1, j=3. pts[3]=7≠6 → else, del pts[1:3] → [1,7]. insert_hi = 3 odd → True. lo: i odd → insert 2 at 1 → [1,2,7]. hi at 2 → [1,2,6,7] ✓ ([1,3)∪[5,7) minus [2,6) = [1,2)∪[6,7)) ✓.

pts=[1,3,5,7], remove [3,5): i = bisect_left(...,3)=1, j = bisect_left(...,5)=2. pts[2]=5==hi, j=2 even → else branch (j odd required for if). del pts[1:2] → [1,5,7]. insert_hi = j odd? False ✓ (start at 5 kept). lo: i=1 odd → insert 3 at 1 → [1,3,5,7]?? Expected: [1,3)∪[5,7) minus [3,5) = [1,3)∪[5,7) unchanged → [1,3,5,7] ✓. And lo=3 is end boundary of [1,3) ✓ kept. 

pts=[1,3,5,7], remove [2,4): i=1, j = bisect_left(...,4)=2. pts[2]=5≠4 → else. del pts[1:2] → [1,5,7]. insert_hi = 2 odd? False?? Hmm: hi=4, after removal: [1,3)∪[5,7) minus [2,4) = [1,2)∪[5,7). Boundaries should be [1,2,5,7]. But algorithm gave insert_hi=False → [1,5,7] — missing end 2! Wait lo insertion: i=1 odd → insert lo=2 → [1,2,5,7] ✓. Oh right — lo inserted as end at 2 ✓. insert_hi: j=2 even, pts[2]=5≠4 → no insert ✓ correct (4 is gap... [2,?) hmm interval [2,4) removed; was there interval covering 4? m(4⁻): was 4 in [1,3)? No, 4 in gap... wait original set [1,3)∪[5,7): 4 ∉ set. Removing [2,4) affects [1,3) → [1,2). hi=4: m_final(hi⁻) = 0 ✓, m(hi⁺) = 0 (gap until 5) → no boundary ✓. Result [1,2,5,7] ✓.

pts=[3,5], remove [1,3): i=0, j=0. pts[0]=3==hi, j even → else. del pts[0:0] nothing. insert_hi = 0 odd? False ✓ (start at 3 kept). lo: 0 even → no. Result [3,5] ✓.

pts=[3,5], remove [1,4): i=0, j=1. pts[1]=5≠4 → else. del pts[0:1] → [5]. insert_hi = 1 odd → True. lo: even → no. hi at 0 → [4,5] ✓.

pts=[3,5], remove [1,5): i=0, j=1. pts[1]=5==hi, j odd → if-branch: del pts[0:2] → []. insert_hi False. lo: even → no. Result [] ✓.

pts=[1,3], remove [1,3): i=0,j=1. pts[1]=3==hi, j odd → del pts[0:2] → [] ✓.

pts=[1,3], remove [0,1): i = bisect_left([1,3],0)=0, j = bisect_left([1,3],1)=0. pts[0]=1==hi, j=0 even → else. del nothing. insert_hi = 0 odd → False ✓. lo: no. Result [1,3] ✓.

pts=[1,3], remove [3,5): i = bisect_left([1,3],3) = 1, j = bisect_left([1,3],5) = 2. pts[2] n/a → else. del pts[1:2] → [1]. insert_hi = 2 odd → False. lo: i odd → insert 3 at 1 → [1,3] ✓ unchanged.

pts=[1,3], remove [2,4): i=1, j=2. pts[2] n/a → else. del pts[1:2] → [1]. insert_hi False. lo: i=1 odd → insert 2 → [1,2] ✓ ([1,3) minus [2,4) = [1,2)).

pts=[1,3], remove [0,2): i=0, j=1. pts[1]=3≠2 → else. del pts[0:1] → [3]. insert_hi = 1 odd → True. lo: even → no. hi at 0 → [2,3] ✓.

Excellent. Now performance: bisect is O(log n) C-speed; del pts[i:j] and insert are O(n) memmove. 60k adds, each potentially shifting ~30k pointers → 60k × 30k × 8 bytes ≈ 14 GB memmove. Hmm, at ~10 GB/s that's ~1.4-3s. Risky but "well under 5 seconds"... Actually list.insert/del memmove is quite fast (can exceed 10 GB/s for pointer arrays? memmove typically ~5-20 GB/s). But average shift might be less: random order disjoint intervals — each add shifts on average half the current array. Total moves ≈ Σ n/2 ≈ 60k²/4 = 9×10⁸ pointer moves = 7.2 GB. Probably ~1s. Plus 200k contains × O(log n) bisect — trivial. Probably OK, but "small disjoint intervals in random order" — the intervals are disjoint, so adds never merge (well, "small disjoint intervals" — disjoint from each other). Each add does one insert of 2 elements... wait actually each add inserts lo and hi → possibly 2 inserts + one del. Actually for disjoint adds: i==j typically? If interval falls in a gap: i == j (no boundaries between lo and hi)... then del nothing, insert lo (maybe), insert hi (maybe) → 2 inserts of single elements. Each insert memmoves half the array on average. 60k × 30k avg = 1.8e9 pointer moves ≈ 14GB?? No: average array length during buildup ~30k, shift average ~15k elements = 120KB per insert, × 120k inserts = 14 GB. Hmm ~2-4 seconds maybe. Risky.

Hmm. Alternative: chunked list (list of sublists, like sortedcontainers). More code but safe. Or... since intervals are disjoint and added in random order, another approach: keep two parallel sorted lists? Same cost.

Alternative: batch structure — use a balanced BST after all? Or use the boundary-array approach but store boundaries in a structure with fast insert: e.g., a two-level list: blocks of size ~500-1000. Implement:

- `blocks`: list of lists, each sorted; maintain `block_mins` maybe. Insert: bisect over block boundaries (list of first elements or use bisect over a "mins" list), then bisect within block, insert into block (O(block) memmove, cheap), occasionally split block when > 2× target. Deletion across blocks: for remove, del range may span blocks — trickier but doable.

contains: global bisect: bisect over mins to find block, bisect within block. O(log n).

Hmm, complexity of implementing chunked deletions correctly... Alternatively implement a treap with iterative operations? Or accept the flat-list risk?

Let me reconsider: is the memmove really that slow? Python list insert of one element into list of size n: it memmoves (n - i) * 8 bytes. For n=60k, average shift 30k → 240KB per op. 120k ops → 28.8 GB?? Wait 240KB × 120k = 28.8 GB. At 10 GB/s → ~3 s. At 20 GB/s → 1.4s. Hmm L2/L3-resident? 60k pointers = 480KB array — fits in L2/L3! memmove from L3 cache can be 30-100 GB/s. Actually the array is ~480KB max, fits in L3 easily. So memmove at L3 speeds ~50 GB/s → 28.8GB / 50 = 0.6s. Probably fine! Actually modern memmove on cached data: ~100+ GB/s possible. So flat list is likely ~1s or less. I think flat boundary list is fine and much simpler/safer to get correct.

Also `intervals()`: pts paired: [(pts[k], pts[k+1]) for k in range(0, len, 2)] — touching merged by invariant ✓ (invariant: no two stored intervals touch — maintained by add/remove logic since we always merge on touch... do we? add merges touching ✓; remove: could remove create touching? [a,b) remove [lo,hi) interior → [a,lo) & [hi,b): don't touch ✓. Invariants hold).

But wait — one more check on invariant "no touching" for the boundary representation: boundary array pts with intervals [pts[0],pts[1]), [pts[2],pts[3])... Two consecutive stored intervals [pts[1]... no—stored intervals are (pts[2k], pts[2k+1]) and (pts[2k+2], pts[2k+3]); touching iff pts[2k+1] == pts[2k+2]. Our operations never leave equal adjacent... add: when inserting lo at i even — could pts[i-1]... hmm pts[i-1] < lo... wait could pts[i-1] == lo? No, bisect_left → pts[i-1] < lo ✓. Insert hi: elements after are > hi ✓ (when inserting). When keeping pts[j]==hi & j odd (end at hi) and next element pts[j+1] > hi? They're a start... pts[j] odd index = end; pts[j+1] even index = start of next; invariant pts[j] < pts[j+1] ✓ maintained. OK.

Hmm, wait: actually do we need strict non-touching invariant? For intervals() output correctness yes, and contains correctness relies on parity logic which needs... contains: bisect_right(pts,x) & 1 — works with the boundary representation regardless. The parity derivations assumed distinct boundaries; touching intervals would mean duplicate boundary values → break. We maintain non-touching, fine.

Also need: lo, hi may be ints or floats — mixed comparisons fine.

Now __len__: number of intervals = len(pts) // 2. O(1) ✓.

total_length: sum(pts[1::2][k] - pts[0::2][k])... O(n) — is that acceptable? Spec doesn't state complexity for total_length. 60k intervals → O(n) fine. But maybe called often... no constraint given. Could maintain incrementally but O(n) sum is simple; use `sum(b - a for a, b in zip(pts[::2], pts[1::2]))`. Hmm, or maintain a running total updated in add/remove: adds/removes change lengths in computable ways? add: net change = hi - lo minus... not trivially (overlap). O(n) is fine and safe. Actually let's just compute O(n).

intervals(): O(n) ✓.

contains(x): 
```
k = bisect_right(pts, x)
return k % 2 == 1
```
Wait verify: pts=[1,3]: x=1 → bisect_right = 1 → odd ✓. x=2 → 1 ✓. x=3 → 2 even ✓. x=0.5 → 0 ✓. x=0 → 0 ✓. x=5 → 2 ✓. pts=[] → 0 ✓. 

Hmm wait — but with mixed int/float, bisect works fine.

add edge: lo >= hi ignore ✓.

Let me now also double-check the add special-branch condition once more, especially `insert_hi` computation and hi insertion index.

Refine add:

```
def add(self, lo, hi):
    if lo >= hi: return
    pts = self.pts
    i = bisect_left(pts, lo)
    j = bisect_left(pts, hi)
    # handle boundary at hi
    if j < len(pts) and pts[j] == hi:
        if j % 2 == 0:
            # start boundary at hi: merge → delete it along with interior
            del pts[i:j+1]
            # insert lo if i even
            if i % 2 == 0:
                pts.insert(i, lo)
            # hi not inserted
            return
        else:
            # end boundary at hi: keep it; delete interior pts[i:j]
            del pts[i:j]
            if i % 2 == 0:
                pts.insert(i, lo)
            # hmm wait: lo insertion position i — but if pts[i]==lo... fine
            return
    else:
        del pts[i:j]
        if i % 2 == 0:
            pts.insert(i, lo)
        if j % 2 == 0:
            pts.insert(i + 1, hi)  # after lo insert, hi at i+1? 
        return
```

Wait, hi insertion index: after deleting pts[i:j], array = pts[0:i] + pts[j_orig:]. If lo inserted at i: array = pts[0:i] + [lo] + pts[j_orig:], lo at index i. hi should be inserted right after lo? All of pts[j_orig:] >= hi... but when insert_hi (j even, pts[j_orig] != hi or out of range) → pts[j_orig] > hi ✓, so hi at index i+1 ✓. If lo not inserted (i odd): hi at index i. And j even with i odd: j - i odd... elements... array after del: pts[0:i] + pts[j:]; hi at index i ✓ (pts[j:] all > hi ✓). Correct.

But wait — in the "end boundary at hi kept" branch (pts[j]==hi, j odd): after del pts[i:j] and possible lo insert at i, is everything consistent? pts[j]==hi remains at index i + (lo?1:0)... it's the end boundary at hi ✓. Elements after: pts[j+1:] ✓. Check balance: deleted j-i, inserted (i even?1:0). j odd → j-i parity = 1-i parity... j odd: j-i ≡ 1-i ≡ i+1 (mod 2). If i even: deleted odd, inserted 1 → net 0 ✓. If i odd: deleted even, inserted 0 ✓. Balanced ✓.

Check "start at hi deleted" branch: deleted j-i+1, inserted (i even?1:0). j even → j-i ≡ i mod 2, deleted ≡ i+1 mod 2. i even: deleted odd, +1 → even net... n - odd + 1 = n ✓. i odd: deleted even, +0 ✓. Balanced ✓.

Else branch: deleted j-i, inserted (i even) + (j even). j even → j-i even... j even: j-i ≡ i (mod 2): i even → deleted even, inserted 2 ✓; i odd → deleted odd, inserted 0+1=1 ✓. j odd: j-i ≡ i+1: i even → deleted odd, inserted 1+0=1 ✓; i odd → deleted even, inserted 0 ✓. Balanced ✓.

Hmm wait, else branch with j odd: insert_hi = j%2==0 → False. Inserted only lo if i even: i even & j odd → deleted odd, inserted 1 ✓. i odd & j odd → deleted even, inserted 0 ✓. But hold on — else branch insert_hi condition: I earlier derived insert hi iff j even (and pts[j] != hi, which holds in else when j even). In else branch pts[j] != hi or j >= len. So insert_hi = (j % 2 == 0). ✓ as coded.

But one more check on else branch: j even, pts[j] != hi, i odd: array after del = pts[0:i] + pts[j:], insert hi at index i. pts[0:i] all < lo < hi ✓, pts[j:] all > hi ✓. ✓.

Now also: the special branches could be merged: 

```
hit = j < len(pts) and pts[j] == hi
del pts[i:j+1 if (hit and j%2==0) else j]
```
Keep it explicit for clarity.

Similarly remove:

```
def remove(self, lo, hi):
    if lo >= hi: return
    pts = self.pts
    i = bisect_left(pts, lo)
    j = bisect_left(pts, hi)
    if j < len(pts) and pts[j] == hi:
        if j % 2 == 1:
            # end boundary at hi: interval ending at hi overlaps → its end must go
            del pts[i:j+1]
            # insert lo iff i odd (end boundary at lo)
            if i % 2 == 1:
                pts.insert(i, lo)
            return
        else:
            # start boundary at hi: interval [hi,...) untouched → keep pts[j]
            del pts[i:j]
            if i % 2 == 1:
                pts.insert(i, lo)
            # hi kept as start boundary; don't insert
            return
    else:
        del pts[i:j]
        if i % 2 == 1:
            pts.insert(i, lo)
        if j % 2 == 1:
            pts.insert(i + 1, hi)  # wait: lo inserted at i → hi at i+1; if lo not inserted, hi at i
        return
```

Check hi insertion index in remove else: del pts[i:j]; array = pts[0:i] + pts[j:]; pts[j:] all > hi (else branch, pts[j]!=hi or out of range, and >= hi → > hi) ✓. If lo inserted at i → hi at i+1 ✓. Else hi at i ✓.

Balance checks remove:
- if-branch (pts[j]==hi, j odd): deleted j-i+1, inserted (i odd?1:0). j odd → j-i ≡ 1-i... j-i+1 ≡ j-i+1 ≡ (1 - i) + 1 = 2 - i ≡ i (mod 2). i odd: deleted odd, +1 → even ✓. i even: deleted even, +0 ✓.
- else branch pts[j]==hi j even (kept): deleted j-i, inserted (i odd?1:0). j even: j-i ≡ i. i odd → deleted odd, +1 ✓. i even → deleted even ✓.
- else pts[j] != hi: deleted j-i, inserted (i odd) + (j odd). j even → j-i ≡ i: i odd → deleted odd +1 ✓; i even → deleted even + (0 + 0) ✓. j odd → j-i ≡ i+1: i odd → deleted even + 1 + 1 = +2 ✓ even; i even → deleted odd + 0 + 1 ✓. Balanced ✓.

Wait — else branch remove, insert_hi = j%2==1: check case j odd, pts[j] != hi, i even: deleted j-i odd, inserted hi only (1) ✓ balanced. Example: pts=[1,5], remove [2,3): i=1 odd though. Example with i even, j odd: pts=[1,3,5,7]? remove [4,6): i = bisect_left(pts,4)=2, j = bisect_left(pts,6)=3. pts[3]=7≠6 → else. del pts[2:3] → [1,3,7]. insert lo? i=2 even → no. insert_hi = 3 odd → True → insert at index 2 → [1,3,6,7]. Expected: [1,3)∪[5,7) minus [4,6) = [1,3)∪[6,7) → [1,3,6,7] ✓.

Another: pts=[1,3,5,7], remove [0,2): i=0, j=1. pts[1]=3≠2 → else. del pts[0:1] → [3,5,7]. lo: i even → no. hi: j odd → insert at 0 → [2,3,5,7] ✓ ([1,3)∪[5,7) minus [0,2) = [2,3)∪[5,7)) ✓.

Another: pts=[1,3,5,7], remove [2,4): i=1, j=2. pts[2]=5≠4 → else. del pts[1:2] → [1,5,7]. lo: i odd → insert 2 → [1,2,5,7]. hi: j even → no. Result [1,2,5,7] ✓.

Another: pts=[1,3,5,7], remove [6,8): i = bisect_left(...,6)=3, j = bisect_left(...,8)=4. pts[4] n/a → else. del pts[3:4] → [1,3,5]. lo: i=3 odd → insert 6 → [1,3,5,6]. hi: j=4 even → no. Result [1,3,5,6] ✓ ([5,7) minus [6,8) = [5,6)) ✓.

Another: pts=[1,3,5,7], remove [4,8): i=2, j=4. else. del pts[2:4] → [1,3]. lo: i even no. hi: j=4 even no. Result [1,3] ✓.

Another: pts=[1,3,5,7], remove [2,8): i=1, j=4. del pts[1:4] → [1]. lo: odd → insert 2 → [1,2]. hi: no. ✓ ([1,2)).

Another: pts=[1,3,5,7], remove [0,8): i=0,j=4. del all → []. lo: even no. hi: even no. ✓.

Another remove with pts[j]==hi j odd: pts=[1,3,5,7], remove [4,5): i=2, j = bisect_left(...,5)=2. pts[2]==5==hi, j=2 even → else branch (j even). del pts[2:2] nothing. lo: i=2 even → no. hi: j even → no. Result unchanged ✓ ([4,5) doesn't intersect).

remove [4,7): i=2, j = bisect_left(...,7)=3. pts[3]==7==hi, j odd → if-branch: del pts[2:4] → [1,3]. lo: i=2 even → no. Result [1,3] ✓ ([5,7) removed entirely, gap at [3,5) untouched).

remove [4,3)? ignored (lo>=hi) ✓.

remove [5,7) exact: pts=[1,3,5,7]: i = bisect_left(...,5)=2, j = bisect_left(...,7)=3. pts[3]==7, j odd → del pts[2:4] → [1,3]. lo: even no. ✓.

remove [4,5) where interval is [5,7): covered ✓ above.

Now add tests with touching merges:

pts=[1,3], add [3,5): i = bisect_left([1,3],3)=1, j = bisect_left([1,3],5)=2. pts[2] n/a → else. del pts[1:2] → [1]. lo: i=1 odd → no. hi: j=2 even → insert at index i=1 → [1,5] ✓.

pts=[1,3], add [0,1): i=0, j=0 (1... bisect_left([1,3],1)=0). pts[0]==1==hi, j=0 even → if-branch(add): del pts[0:1] → []. lo: i=0 even → insert 0 → [0]. hi: not inserted. Result [0]... wait that's boundaries [0] — odd length?! Balance check: if-branch: deleted j-i+1 = 1, inserted (i even?1:0)=1 → net 0, length stays 2?? Wait original length 2, deleted 1 → 1, inserted 1 → 2. Array after del pts[0:1]: [3]. Then insert lo=0 at 0 → [0,3]. Result [0,3] ✓ ([0,1)∪[1,3) = [0,3)) ✓. I miscomputed. ✓.

pts=[1,3], add [2,3): i=1, j=1. pts[1]==3==hi, j=1 odd → else... wait add's if-branch is j%2==0. j=1 odd → else branch: del pts[1:1] nothing. lo: i=1 odd → no. hi: j odd → no insert. Result [1,3] ✓ (already contains [2,3)).

pts=[1,3], add [1,2): i=0, j=0. pts[0]==1==hi? hi=2. pts[0]=1 != 2 → else. del pts[0:0] nothing. lo: i=0 even → insert 1 at 0 → [1,1,3]?? Wait insert lo=1... pts already has 1 at index 0! Duplicate! Hmm: bisect_left(pts, 1) = 0, pts[0]==1. i=0 even → insert lo → but pts[0] == lo already. Problem!

Recheck derivation: "lo is currently a boundary iff pts[i]==lo." If pts[i]==lo and i even → start boundary at lo → lo remains start boundary after add → we should KEEP pts[i], not insert duplicate. My rule "insert lo iff i even" assumed deletion of pts[i] first (pts[i] deleted when i < j). Here i == j (add [1,2) inside [1,3): no boundaries strictly between... wait pts[i]=1=lo < hi=2, j = bisect_left(pts, 2) = 1! Not 0. Let me recompute: pts=[1,3], add [1,2): i = bisect_left([1,3], 1) = 0; j = bisect_left([1,3], 2) = 1. i=0, j=1. del pts[0:1] → [3]. lo: i even → insert 1 at 0 → [1,3]. hi=2: pts[j]=pts[1]=3 ≠ 2 → else ✓ (already in else). j=1 odd → no insert. Result [1,3] ✓. Phew — since lo < hi, pts[i]==lo implies pts[i] < hi → i < j always. So pts[i] is always in deletion range ✓. Good — no duplicate possible for lo. Similarly pts[j]==hi: pts[j]==hi > lo → pts[j] >= ... j >= i? pts[j] = hi >= lo... could pts[j] == hi and j < i? No: pts sorted, lo < hi → bisect indexes i <= j ✓. And pts[j] is outside del range pts[i:j] ✓ handled specially.

What about hi insertion when pts contains hi... in else branch pts[j] != hi so no duplicate ✓. In kept-end branch (add: pts[j]==hi, j odd): we don't insert hi ✓, and pts[j] retained ✓ no duplicate. Deleted-start branch: pts[j] removed, no insert ✓.

But hmm — add else branch: what if j even and pts[j] != hi but pts[j] < ... no, pts[j] >= hi and != hi → > hi ✓.

One more subtle case for add: pts[j]==hi, j even, and i == j: del pts[i:j+1] = del pts[i:i+1] → deletes pts[j] (=hi, start boundary). Then insert lo iff i even → i == j even → insert lo at i. Result: pts[0:i] + [lo] + pts[j+1:]. Verify: pts=[3,5], add [3,4): i = bisect_left([3,5],3)=0, j = bisect_left([3,5],4)=0. pts[0]==3==hi, j even → del pts[0:1] → [5]. insert lo=3 → [3,5]. Result [3,5] ✓ (added [3,4) ⊂ [3,5), unchanged) ✓.

And remove: pts[j]==hi, j even, kept — but wait: is the interval [hi, ...) really untouched? [lo,hi) removal — interval [hi,b) starts at hi, half-open → not touched ✓. But what about the interval just before: could there be an interval ending at... the region [lo,hi): boundaries pts[i:j] deleted — these are starts/ends of intervals overlapping [lo,hi) ✓.

Hmm, wait — remove: what about interval [a,b) with a < lo < b < ... covered by pts[i:j] deletion + lo insert (i odd → interval ending... pts[i-1] start, delete pts[i] which is its end if pts[i] <= ... pts[i] in [lo, hi) or... pts[i] >= lo, pts[i] < hi (since i < j) → pts[i] is boundary strictly inside... pts[i] could == lo. If pts[i]==lo and i odd → end boundary at lo → interval [pts[i-1], lo) → doesn't overlap [lo,hi) (ends at lo) → but deletion removes its end → then reinsert lo (i odd) at same position → restored ✓ net no change ✓. If pts[i]==lo, i even → start at lo → interval [lo, ...) overlaps → delete start, and the rest of that interval beyond hi? pts[i+1] = its end; pts[i+1] < hi? If pts[i+1] <= hi... pts[i+1] < hi → in deletion range ✓ fully removed if pts[i+1] < hi... wait if pts[i+1] < hi then entire interval [lo, pts[i+1]) ⊆ [lo,hi) → removed ✓ (both boundaries deleted). If pts[i+1] == hi → j == i+1, pts[j]==hi... handled: j even? i even → j = i+1 odd → remove's if-branch: del pts[i:j+1] → deletes pts[i] (start at lo) and pts[j] (end at hi) → interval [lo,hi) exactly removed ✓, insert lo? i even → no ✓, insert hi? no (handled in if-branch) ✓. If pts[i+1] > hi → interval extends beyond hi → removal chops → should become [hi, pts[i+1]) → need hi as start boundary. j = bisect_left(pts, hi) = i+1 (pts[i+1] > hi → first >= hi is i+1) → pts[j] = pts[i+1] > hi → else branch → del pts[i:j] = pts[i:i+1] → deletes pts[i] (start at lo) ✓; insert lo? i even → no ✓; insert hi? j = i+1 parity: i even → j odd → insert hi at index i → array: pts[0:i] + [hi] + pts[j:] → interval [hi, pts[i+1]) ✓. 

Now — contains at exact boundary: x == pts value: bisect_right → counts it → for start boundary (even index... k = position after it): x == pts[2m] (start): bisect_right = 2m+1 odd ✓ in set ✓. x == pts[2m+1] (end): bisect_right = 2m+2 even ✓ not in set ✓.

Performance of intervals(), total_length: O(n) fine.

Also `remove` when pts empty: i=j=0, else branch, del nothing, no inserts ✓.

Now, hmm, one concern: the derivation for add assumed m_final(hi⁻) = 1 always, giving "lo boundary iff i even". Double-check with add where lo fills a gap partially overlapping... pts=[1,3,5,7], add [3,4): i = bisect_left(...,3)=1, j = bisect_left(...,4)=2. pts[2]=5≠4 → else. del pts[1:2] → [1,5,7]. lo: i=1 odd → no insert. hi: j=2 even → insert at index i=1 → [1,4,5,7]. Expected: [1,3)∪[5,7) ∪ [3,4) = [1,4)∪[5,7) → [1,4,5,7] ✓. 

add [3,5): i=1, j = bisect_left(...,5)=2. pts[2]==5==hi, j=2 even → if-branch: del pts[1:3] → [1,7]. lo: i odd → no. Result [1,7] ✓.

add [4,5): i=2, j=2. pts[2]==5==hi, j even → if-branch: del pts[2:3] → [1,3,7]. lo: i=2 even → insert 4 at 2 → [1,3,4,7]. hi: no. Result [1,3,4,7] ✓ ([1,3)∪[4,5)∪[5,7)) ✓ — hmm but [4,5) and [5,7) touch → should merge to [4,7)! The invariant says stored intervals must not touch. Result boundaries [1,3,4,7] → intervals [1,3),[4,7) ✓ merged ✓ good.

add [3,4) then: covered above.

add partial overlap from left: pts=[5,7], add [3,6): i = bisect_left([5,7],3)=0, j = bisect_left([5,7],6)=1. pts[1]=7≠6 → else. del pts[0:1] → [7]. lo: i even → insert 3 → [3,7]. hi: j=1 odd → no. ✓ [3,7) ✓.

add [6,8): pts=[5,7]: i = bisect_left(...,6)=1, j = bisect_left(...,8)=2. pts[2] n/a → else. del pts[1:2] → [5]. lo: i=1 odd → no. hi: j even → insert at 1 → [5,8] ✓.

Great. Now also think about floats/ints mixed: e.g., add(1.5, 2.5) with pts containing ints — bisect handles ✓.

Now, one more potential invariant issue: could add produce adjacent equal boundaries through the kept-end path? pts=[1,3], add [3,5): shown → [1,5] merged ✓. pts=[1,3], add [0,3): i=0, j = bisect_left([1,3],3)=1. pts[1]==3==hi, j=1 odd → add's kept-end branch: del pts[0:1] → [3]. lo: i=0 even → insert 0 → [0,3]. Result [0,3] ✓ merged ✓.

remove creating touch? remove splits never touch ✓.

Now performance concern again: add in the "small disjoint intervals random order" benchmark: each add: 2 bisects (fast), one del (empty range typically since disjoint → i==j? If gap: i == j only if no boundaries strictly between lo and hi — for disjoint small interval in a gap, yes i==j), then possibly 2 inserts. Actually if i==j: del pts[i:i] no-op; inserts: i even → insert lo; j even → insert hi at i or i+1. Both i and j equal → both even or both odd. If gap (not covered): i even (gap → count of pts < lo even? In a gap: lo between pts[2m+1] and pts[2m+2] → pts < lo = 2m+2 → even ✓) → both inserts happen: 2 insert calls each shifting ~half array. Plus for covered (i odd): no inserts. Random disjoint → half in gaps? All disjoint adds in random order: each new interval either falls in existing gap (no overlap, not touching) → 2 inserts, or touches/overlaps existing → merge path (1 del + 1-2 inserts). Random order of 60k disjoint intervals: most will be in gaps (since they're disjoint, previous ones don't overlap it) except touching neighbors. So ~120k insert operations, average shift ~n/2. Total pointer moves ≈ Σ over ops of (len - pos) ≈ 2 × 60k × 30k avg... ≈ 1.8e9 moves × 8 bytes = 14.4 GB memmove... but cached (array ≤ 480KB... at end 120k boundaries = 960KB — still L2/L3-ish, ~1MB, fits L3 100%). L3 bandwidth ~50-200 GB/s → 0.1-0.3s. Fine. Plus Python overhead: 60k × (few function calls + bisect) ≈ trivial. contains 200k × bisect ≈ trivial. Total well under 1s. 

Hmm wait, but worst case adversarial? The spec only requires that specific benchmark. Flat list is fine.

But actually, let me reconsider: could add's del + 2 inserts each be O(n) → 3 O(n) ops per add → 180k O(n) ops... as computed fine.

Alternatively simplify: combine del+inserts? Not needed.

Now write the class:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("pts",)

    def __init__(self):
        self.pts = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        pts = self.pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j & 1 == 0:
                # start boundary at hi: it merges with the new interval
                del pts[i:j + 1]
                if i & 1 == 0:
                    pts.insert(i, lo)
            else:
                # end boundary at hi: keep it
                del pts[i:j]
                if i & 1 == 0:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i & 1 == 0:
                pts.insert(i, lo)
                if j & 1 == 0:
                    pts.insert(i + 1, hi)
            elif j & 1 == 0:
                pts.insert(i, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        pts = self.pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j & 1 == 1:
                # end boundary at hi: the interval ending at hi overlaps
                del pts[i:j + 1]
                if i & 1 == 1:
                    pts.insert(i, lo)
            else:
                # start boundary at hi: untouched, keep
                del pts[i:j]
                if i & 1 == 1:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i & 1 == 1:
                pts.insert(i, lo)
                if j & 1 == 1:
                    pts.insert(i + 1, hi)
            elif j & 1 == 1:
                pts.insert(i, hi)

    def contains(self, x):
        return bisect_right(self.pts, x) & 1 == 1

    __contains__ = contains  # maybe add

    def total_length(self):
        pts = self.pts
        return sum(pts[k + 1] - pts[k] for k in range(0, len(pts), 2))

    def intervals(self):
        pts = self.pts
        return [(pts[k], pts[k + 1]) for k in range(0, len(pts), 2)]

    def __len__(self):
        return len(self.pts) // 2
```

Wait — in add's else branch, hi insertion position: if lo inserted (i even): hi at i+1 ✓. If lo not inserted (i odd): hi at i. But j even & i odd: array after del = pts[0:i] + pts[j:]; pts[0:i] all < lo... hmm pts[0:i] < lo < hi ✓ and pts[j:] > hi ✓ → hi at index i ✓. Coded: `elif j & 1 == 0: pts.insert(i, hi)` ✓.

In remove else branch similarly.

Hold on — add else branch, hi insert position when lo inserted: is i+1 correct? Array: pts[0:i] + [lo] + pts[j_orig:]. hi must come after lo and before pts[j_orig:] (all > hi ✓). Index i+1 ✓.

But wait, add else-branch when j odd and i even: only lo inserted. Deleted j - i elements: j odd, i even → j-i odd. n - odd + 1 → even ✓. And kept structure: pts[0:i] + [lo] + pts[j:]: pts[j:] — pts[j] > hi... its parity in new array: index i + 1 = odd → end boundary? pts[j] originally at even j?? j odd here. Original pts[j] at odd index → end boundary of interval ending... pts[j] > hi. New index i+1 odd → still end ✓ consistent (relative order preserved, prefix length i+1 odd... hmm parity of an element = parity of its index; index shifts by (inserted - deleted before it) = 1 - (j - i)... new index = j + 1 - (j-i) = i+1. Original parity j odd; new parity i+1: i even → odd ✓ same parity ✓ good.)

Everything consistent because total balance maintained and relative order preserved with correct pairing — actually pairing is determined by parity from array start; since array length even and structure valid, fine.

Let me also sanity-check a tricky remove: interval spanning multiple stored intervals with boundaries at both lo and hi.

pts=[1,3,5,7] ( [1,3)∪[5,7) ), remove [3,5): i = bisect_left(pts,3)=1, j = bisect_left(pts,5)=2. pts[2]==5==hi, j even → remove's else (kept-start branch): del pts[1:2] → [1,5,7]. insert lo? i=1 odd → insert 3 at 1 → [1,3,5,7] ✓ unchanged ✓.

remove [1,7): i=0, j=3. pts[3]==7==hi, j odd → if-branch: del pts[0:4] → []. lo: i even → no. ✓.

remove [2,6): i=1, j=3. pts[3]==7≠6 → else. del pts[1:3] → [1,7]. lo: i odd → insert 2 → [1,2,7]. hi: j odd → insert at i+1=2 → [1,2,6,7] ✓.

remove [3,7): i=1, j=3. pts[3]==7==hi, j odd → del pts[1:4] → [1]. lo: i odd → insert 3 → [1,3] ✓ ([1,3)∪[5,7) minus [3,7) = [1,3)) ✓.

remove [1,3): i=0, j=1. pts[1]==3==hi, j odd → del pts[0:2] → [5,7]. lo: even no. ✓.

remove [1,4): i=0, j = bisect_left(...,4)=2. pts[2]=5≠4 → else. del pts[0:2] → [5,7]. lo: even no. hi: j even → no. Result [5,7] ✓.

remove [0,4): i=0, j=2. pts[2]=5≠4 → else. del pts[0:2] → [5,7]. lo no, hi: j even → no. ✓.

remove [4,4)? lo>=hi ignore ✓.

remove [4,5): i=2, j=2. pts[2]==5==hi? hi=5 ✓, j=2 even → kept-start branch: del pts[2:2] nothing; lo: i even no. Result unchanged ✓.

remove [4,6): i=2, j=3. pts[3]=7≠6 → else. del pts[2:3] → [1,3,7]. lo: even no. hi: j odd → insert at i=2 → [1,3,6,7] ✓.

remove [2,3): i=1, j=1. pts[1]==3==hi? hi=3 ✓ pts[1]=3, j=1 odd → if-branch: del pts[1:2] → [1,5,7]. lo: i=1 odd → insert 2 → [1,2,5,7] ✓ ([1,3) minus [2,3) = [1,2)) ✓.

remove [2,2): ignored.

remove [3,3): ignored.

remove [0,1): i=0, j=0. pts[0]==1==hi, j=0 even → kept-start: del nothing, lo: even no. ✓ unchanged.

remove [1,2): i=0, j=0? bisect_left([1,3,5,7],2)=1. j=1. pts[1]=3≠2 → else. del pts[0:1] → [3,5,7]. lo: even no. hi: j odd → insert at 0 → [2,3,5,7] ✓.

Solid. Also add on empty: pts=[], i=j=0 → else, del nothing, i even → insert lo at 0; j even → insert hi at 1 ✓.

Add identical: pts=[1,3], add [1,3): i=0, j=1. pts[1]==3==hi, j odd → kept-end: del pts[0:1] → [3]; lo: i even → insert 1 → [1,3] ✓.

Add [1,3) to pts=[1,3,5,7]?? That overlaps [1,3) exactly and touches [5,... no gap at 3-5. i=0, j=1, pts[1]==3, j odd → del pts[0:1] → [3,5,7]; insert lo=1 → [1,3,5,7] ✓.

Add [0,4) to [1,3,5,7]: i=0, j=2. pts[2]=5≠4 → else. del pts[0:2] → [5,7]. lo: even → insert 0 → [0,5,7]. hi: j even → insert at 1 → [0,4,5,7] ✓ ([0,4)∪[1,3)∪[5,7) = [0,4)∪[5,7)) ✓.

Add [2,4): i=1, j=2. pts[2]=5≠4 → else. del pts[1:2] → [1,5,7]. lo: odd no. hi: even → insert at 1 → [1,4,5,7] ✓.

Add [2,6): i=1, j=3. pts[3]=7≠6 → else. del pts[1:3] → [1,7]. lo: odd no. hi: odd no. Result [1,7] ✓.

Add [0,8): i=0, j=4. pts[4] n/a → else. del all → []. lo: even → insert 0. hi: even → insert at 1 → [0,8] ✓.

Add [4,8): i=2, j=4 → else. del pts[2:4] → [1,3]. lo: even → insert 4 at 2 → [1,3,4]. hi: even → insert at 3 → [1,3,4,8] ✓ ([1,3)∪[4,8)) ✓.

Add [0,6): i=0, j=3. pts[3]=7≠6 → else. del pts[0:3] → [7]. lo: even → insert 0 → [0,7]. hi: j odd → no. ✓ [0,7) ✓.

All good.

Now also think about `intervals()` returning list of tuples with original values ✓ (we store originals).

`total_length` — sum of (hi - lo); int or float naturally.

One more consideration: the problem says "stores a set of real numbers as disjoint half-open intervals". Our representation ✓.

Should I worry about `contains` for the benchmark: 200k contains × bisect_right over ~120k-element list: ~17 comparisons C-level → ~200k × ~0.5μs ≈ 0.1s ✓.

Edge: `remove` fully covering multiple intervals where pts[j]==hi and j odd and i==j? pts[j]==hi, i==j: means no boundaries in [lo, hi)... pts[j]==hi is boundary at hi; i = j means pts[i] >= lo... could pts[i]==lo? If pts[i]==lo==? lo < hi so pts[i]==lo ≠ hi=pts[j] but i==j → contradiction, so pts[i] < lo?? No: bisect_left(pts,lo)=i means pts[i] >= lo; if pts[i]==lo then pts[i] < hi → j > i. So i==j with pts[j]==hi → pts[i] > lo... pts[i] >= lo and pts[i] == hi > lo → pts[i] > lo → actually pts[i] = hi exactly (first >= lo is... hmm if i == j = bisect results, pts[i] >= lo and pts[i] >= hi... bisect_left(pts,lo)=i → pts[i] >= lo; i == j → same index; pts[i] == hi? We're in branch pts[j]==hi ✓. So pts[i]==hi, meaning no boundaries in [lo, hi) and hi is a boundary. Case j odd (end at hi): interval [a, hi) with a... where's its start? pts[i-1] < lo? pts[i-1] < lo ✓ (i = bisect_left(pts,lo) → pts[i-1] < lo). So interval [pts[i-1], hi) spans across lo! Wait but that interval contains [lo... it overlaps [lo,hi). Removal: del pts[i:j+1] = del pts[i:i+1] → deletes pts[i] (end at hi). Then insert lo (i odd) → pts[0:i] + [lo] + pts[j+1:] → interval [pts[i-1], lo) ✓ correct: [a, hi) minus [lo, hi) = [a, lo) ✓. 

Case j even (start at hi, kept), i == j: pts[i]==hi, pts[i-1] < lo → interval [pts[i-1], pts[i]) = [a, hi) spans lo... removal [lo,hi) → leaves [a, lo) → need end boundary lo, and start boundary hi stays (interval [hi, ...) untouched ✓. Code: kept-start branch: del pts[i:j] = nothing; insert lo (i odd? i == j even → i even → NO lo insert!). WRONG! Example: pts=[1,5,7,9]?? Let's construct: interval [a,hi) with a < lo: pts = [2, 6, 8, 10]? Set [2,6)∪[8,10). remove [4,6): lo=4, hi=6. i = bisect_left([2,6,8,10],4) = 1. j = bisect_left([2,6,8,10],6) = 1. i == j = 1. pts[1] == 6 == hi, j=1 odd → if-branch ✓ (end at hi) → del pts[1:2] → [2,8,10]; insert lo (i odd ✓) → [2,4,8,10] ✓ ([2,6) minus [4,6) = [2,4)) ✓. OK that was j odd.

Now j even, i==j, pts[j]==hi: pts=[2,6,8,10], remove [4,8): hi=8. i = bisect_left(pts,4)=1, j = bisect_left(pts,8)=2. i≠j. Hmm need i==j with pts[j]==hi and j even: i = bisect_left(pts, lo) == j = bisect_left(pts, hi) → no boundaries in [lo,hi) → and pts[j]==hi at even index → start boundary. Interval before: [pts[j-1], pts[j]) = [a, hi) with a = pts[j-1] < lo (since j = bisect_left(pts,lo) → pts[j-1] < lo ✓). So removing [lo, hi) from [a, hi) leaves [a, lo) → lo must become end boundary. But code kept-start branch inserts lo iff i odd — i == j even → no insert! Bug!

Example: pts=[2,6,10,12]? Set [2,6)∪[10,12). remove [4,6): lo=4, hi=6. i = bisect_left([2,6,10,12],4)=1, j = bisect_left(...,6)=1. i==j=1, pts[1]==6==hi, j odd → fine as before. Need j even: pts=[2,4,6,8, ...] hmm: want hi at even index with interval [a,hi) where a < lo and no boundary in [lo,hi). pts = [1, 5, 5?]... Let's do: set [1,5)∪[5,... no—touching not allowed. Set [1,4) ∪ [4?... Let me think: intervals [a, hi) and [hi, b): can't touch. So pts[j]==hi even (start of interval [hi,b)), and pts[j-1] = end of previous interval = a < lo. Previous interval [a', a) where a = pts[j-1]... wait pts[j-1] odd index → end boundary → interval [pts[j-2], pts[j-1]). Hmm! pts[j]==hi at even index j → pts[j-1] is an END boundary (odd index) → interval [pts[j-2], pts[j-1]) ends at pts[j-1] < lo... wait pts[j-1] < pts[j] = hi, and j-1... is pts[j-1] < lo? j = bisect_left(pts, lo) → all pts[k] for k < j are < lo ✓ so pts[j-1] < lo. So the interval ending at pts[j-1] is entirely < lo → untouched. And interval [hi, b) untouched. Region [lo, hi): contains no boundaries... but wait — is [lo,hi) covered by anything? Between pts[j-1] (end, < lo) and pts[j] = hi (start): the gap (pts[j-1], hi) contains [lo, hi) portion... [lo, hi) ⊆ (pts[j-1], hi)? lo > pts[j-1] ✓ and hi = pts[j] → [lo, hi) ⊆ (pts[j-1], pts[j]) which is a GAP (between end pts[j-1] and start pts[j]) → [lo, hi) entirely in gap → removal no-op! ✓ Code: kept-start branch: del pts[i:j] = nothing, no lo insert (i even), hi kept ✓ → unchanged ✓ CORRECT. Phew.

Let me re-examine my earlier worry: "interval [a, hi) with a < lo" — for pts[j]==hi at EVEN index, pts[j] is a START → interval [hi, b) — there is no interval ending at hi. The interval ending near is [pts[j-2], pts[j-1]) with pts[j-1] < lo. So [lo,hi) is in the gap ✓ no-op ✓. And when pts[j]==hi at ODD index (end boundary): interval [pts[j-1]... wait odd index = end → interval [pts[j-1], pts[j]) = [a, hi) with a = pts[j-1] < lo (since j == i) → spans [lo,hi) → removal leaves [a, lo) → handled by if-branch with i odd ✓ (j odd → i odd ✓). ✓.

Similarly check add's branches for i==j cases: add, pts[j]==hi, j odd (kept-end), i==j: pts[i]==hi, no boundaries in [lo,hi), pts[j-1] < lo → interval [pts[j-1], hi) spans... contains [lo,hi)? [pts[j-1], hi) ⊇ [lo, hi) ✓ (pts[j-1] < lo). Add [lo,hi) ⊆ existing → union unchanged. Code: kept-end: del pts[i:j] = nothing; insert lo iff i even — i == j odd → no ✓ unchanged ✓.

add, pts[j]==hi, j even, i==j: shown earlier → [3,5] add [3,4) example ✓ (del pts[j], insert lo) — there interval [hi, b) starts at hi, add [lo,hi) extends from lo: union [min(lo, ...), max(hi, b))... wait also could interval before (ending pts[j-1] < lo... gap between) — union = [lo, b) ∪ gap... = [lo, b): boundaries lo (start) and b (end) ✓ code gives pts[0:i] + [lo] + pts[j+1:] ✓ correct.

And i < j with pts[j]==hi, j even (add, delete-start branch): del pts[i:j+1]: deletes boundaries i..j. Interval starting at hi merged ✓. Also check: interval [pts[j], b) — its end pts[j+1] kept ✓ becomes end of merged ✓. Balanced ✓ shown.

Also i<j, pts[j]==hi, j odd (add kept-end): del pts[i:j], keep pts[j] (end at hi): the interval [a', hi) where a' = pts[j-1]: pts[j-1] < hi, in deletion range (j-1 >= i? pts[j-1] >= lo? pts[j-1] could be < lo if j-1 < i — but j-1 >= i iff... if j == i+1... hmm pts[j-1] is in range [i, j) iff j-1 >= i. If j = i... covered (i==j case). If j > i: j-1 >= i ✓ so pts[j-1] deleted. pts[j-1] was end boundary of interval [pts[j-2], pts[j-1]) — that interval: does it overlap [lo,hi)? Its end pts[j-1] < hi, start pts[j-2] < pts[j-1]... could be < lo → overlaps → after add [lo,hi): merged... but kept-end branch keeps pts[j] as END at hi and inserts nothing at hi — but merged interval [min(pts[j-2], lo), hi) → end at hi ✓ pts[j] kept ✓ and its start: pts[j-2] deleted?? If j-2 >= i: deleted → then who is the start of merged interval? lo inserted (i even?) — i even & j odd → deleted j-i = odd count... hmm let's verify with example: pts=[1,3,5,7] add [2,3): i = bisect_left(...,2)=1, j = bisect_left(...,3)=1. i==j → handled above (no-op) ✓ ([2,3) ⊆ [1,3)).

pts=[1,3,5,7], add [2,5): i=1, j=2. pts[2]==5==hi, j even → delete-start: del pts[1:3] → [1,7]; lo: i odd → no. Result [1,7] ✓ ([1,3)∪[2,5)∪[5,7) = [1,7)) ✓.

pts=[1,3,5,7], add [2,4): i=1, j = bisect_left(...,4)=2. pts[2]=5≠4 → else. del pts[1:2] → [1,5,7]. lo: odd no. hi: j even → insert at 1 → [1,4,5,7] ✓ ([1,3)∪[2,4) = [1,4)) ✓.

pts=[1,3,5,7], add [0,2): i=0, j=1. pts[1]=3≠2 → else. del pts[0:1] → [3,5,7]. lo: even → insert 0 → [0,3,5,7]. hi: j odd → no. ✓ [0,3)∪[5,7) ✓.

pts=[1,3,5,7], add [6,9): i=3, j=4. else. del pts[3:4] → [1,3,5]. lo: i=3 odd → no. hi: j=4 even → insert at 3 → [1,3,5,9] ✓ ([5,7)∪[6,9) = [5,9)) ✓.

pts=[1,3,5,7], add [4,9): i=2, j=4. else. del pts[2:4] → [1,3]. lo: even → insert 4 → [1,3,4]. hi: even → insert at 3 → [1,3,4,9] ✓.

pts=[1,3,5,7], add [0,9): i=0,j=4 → else, del all, insert 0, insert 9 → [0,9] ✓.

I'm fairly confident now. Let me also double check add's else-branch hi insert position when lo NOT inserted and j even: hi at index i. Elements pts[j:] now at indices i, i+1, ...; pts[j] > hi ✓ so hi at i ✓ sorted ✓.

And in kept-end branch (add, j odd): after del pts[i:j] and optional lo insert at i, array = pts[0:i] + [lo?] + pts[j_orig:]. Sorted: pts[j_orig] == hi > lo ✓. ✓.

Kept-start branch (add, j even): array = pts[0:i] + [lo?] + pts[j+1:]. pts[j+1] > hi > lo ✓ sorted ✓.

Remove kept-start branch: array = pts[0:i] + [lo?] + pts[j_orig:] where pts[j]==hi kept: sorted ✓ (lo < hi ✓).

Remove if-branch: array = pts[0:i] + [lo?] + pts[j+1:]: pts[j+1] > hi > lo ✓.

Now, complexity of contains is O(log n) ✓.

One more: the problem says "intervals() -> list[tuple]: all intervals as (lo, hi) tuples, sorted, disjoint, and with touching intervals merged". Our invariant ensures non-touching stored ✓.

Should __init__ accept initial intervals? Not specified; keep simple, maybe optional iterable? Spec doesn't ask. Keep no-arg (maybe allow optional pairs for convenience? Keep minimal — no).

Also implement `__contains__ = contains` and maybe `__repr__`? Not required; harmless to add __contains__? The spec lists methods; adding extra dunder is fine but keep minimal-ish. I'll add __contains__ since it's natural, and __repr__ maybe. Actually instructions: "No tests, no example usage". A repr is fine but let's keep just required + __contains__? I'll include __contains__ alias and __iter__? Keep it lean: required methods only, plus __contains__ alias is harmless. Actually to be safe & minimal, I'll include just the required ones (plus maybe __contains__ — fine).

Let me also double-check `total_length` for empty → 0 ✓ (sum of empty).

Potential issue: `bisect_right(self.pts, x) & 1 == 1` — precedence: `&` binds tighter than `==`? In Python, comparison (`==`) binds LOWER than bitwise `&`? Actually precedence: `&` is higher than comparisons? Order (low to high): `or`, `and`, `not`, comparisons (`==`, `<`, etc.), `|`, `^`, `&`, shifts, arithmetic. So `&` binds TIGHTER than `==` → `bisect_right(...) & 1 == 1` parses as `(bisect_right(...) & 1) == 1` ✓. But clearer: `return bisect_right(self.pts, x) % 2 == 1`.

Final code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi).

    Internally keeps a sorted list of boundary points; the set is the union of
    [pts[0], pts[1]), [pts[2], pts[3]), ...  Stored intervals never touch.
    """

    __slots__ = ("_pts",)

    def __init__(self):
        self._pts = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        pts = self._pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j % 2 == 0:
                # hi is a start boundary: the interval starting at hi merges
                del pts[i:j + 1]
                if i % 2 == 0:
                    pts.insert(i, lo)
            else:
                # hi is an end boundary: it stays the end of the merged interval
                del pts[i:j]
                if i % 2 == 0:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i % 2 == 0:
                pts.insert(i, lo)
                if j % 2 == 0:
                    pts.insert(i + 1, hi)
            elif j % 2 == 0:
                pts.insert(i, hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        pts = self._pts
        i = bisect_left(pts, lo)
        j = bisect_left(pts, hi)
        if j < len(pts) and pts[j] == hi:
            if j % 2 == 1:
                # hi is an end boundary: the interval ending at hi is cut
                del pts[i:j + 1]
                if i % 2 == 1:
                    pts.insert(i, lo)
            else:
                # hi is a start boundary: interval starting at hi untouched
                del pts[i:j]
                if i % 2 == 1:
                    pts.insert(i, lo)
        else:
            del pts[i:j]
            if i % 2 == 1:
                pts.insert(i, lo)
                if j % 2 == 1:
                    pts.insert(i + 1, hi)
            elif j % 2 == 1:
                pts.insert(i, hi)

    def contains(self, x):
        return bisect_right(self._pts, x) % 2 == 1

    __contains__ = contains

    def total_length(self):
        pts = self._pts
        s = 0
        for k in range(0, len(pts), 2):
            s += pts[k + 1] - pts[k]
        return s

    def intervals(self):
        pts = self._pts
        return [(pts[k], pts[k + 1]) for k in range(0, len(pts), 2)]

    def __len__(self):
        return len(self._pts) // 2
```

Wait — one thing to double-check in remove else branch: hi insertion position when lo not inserted: hi at index i — but need all elements from index i onward (post-del: old pts[j:]) to be > hi ✓ (else branch pts[j] != hi and pts[j] >= hi → > hi). ✓. And when lo inserted: hi at i+1 ✓.

Add else branch when lo not inserted and j even: hi at i; elements from old j: pts[j] > hi ✓.

Also, remove else branch when j odd and pts[j]==hi?? Excluded (if-branch). j odd & pts[j] != hi: insert hi ✓.

Hmm, remove: one more scenario — remove range that starts inside interval and ends exactly at a kept start boundary, with lo needing insertion and position: e.g. pts=[1,3,5,7], remove [2,5): i=1, j=2, pts[2]==5==hi, j even → kept-start: del pts[1:2] → [1,5,7]; lo: i odd → insert 2 at 1 → [1,2,5,7] ✓ ([1,3) minus [2,5) = [1,2); [5,7) untouched) ✓.

remove [2,7): i=1, j=3, pts[3]==7==hi, j odd → if-branch: del pts[1:4] → [1]; lo: i odd → insert 2 → [1,2] ✓.

remove [2,8): i=1, j=4, pts[4] n/a → else: del pts[1:4] → [1]; lo: i odd → insert 2 at 1 → [1,2]; hi: j even → no. ✓.

remove [0,2): i=0, j=1, pts[1]=3≠2 → else: del pts[0:1] → [3,5,7]; lo: even no; hi: j odd → insert at 0 → [2,3,5,7] ✓.

All good. I'm confident.

One micro-concern: `if i % 2 == 0` etc. fine.

Also for the benchmark "60 000 add() calls of small disjoint intervals in random order" — disjoint means no merging mostly; each add does up to 2 inserts. Fine.

Should `intervals` return tuples with original types ✓.

Write final answer with brief comments.