Standard interval set with sorted list + bisect. add: find overlapping/touching intervals, merge. remove: split.

Implementation: keep a sorted list of [lo, hi] lists. Use bisect to find insertion points.

add(lo, hi): if lo >= hi return. Find start index: last interval with hi < lo... Let me use a key list approach: store intervals in a sorted list `ivs` of [lo, hi]. To find where lo falls: idx = bisect_right over starts. Touching intervals (hi == lo of next) must merge.

Simpler: find range of intervals to merge: all intervals i such that i.hi >= lo and i.lo <= hi... but with half-open touching: [1,3) and [3,5) merge. So merge condition: existing.hi >= lo and existing.lo <= hi (touching counts). Since disjoint and sorted with gaps, we can do:

i = bisect_left on starts for lo... Let me think. Let starts = [iv[0] for iv in ivs]. Find first interval that could touch: first index j where ivs[j].hi >= lo. Since intervals sorted and disjoint (non-touching merged), ivs[j].hi >= lo. Use bisect on hi values? Keep separate array of his for bisect? his is sorted too. idx = bisect_left(his, lo) gives first interval with hi >= lo. Then end: find last interval with lo <= hi. k = bisect_right(starts, hi) - 1... starts sorted; first interval with lo > hi is at bisect_right(starts, hi). So intervals [idx, k) overlap/touch. Then new merged interval: lo' = min(lo, ivs[idx][0]) if idx < k else lo; hi' = max(hi, ivs[k-1][1]) if k > idx else hi. Replace slice.

Actually careful: if no intervals touch (idx == k), we insert [lo, hi] at position idx? Position: idx = bisect_left(his, lo) — his sorted. Insertion point in sorted order by lo. Since intervals between... hmm, insertion by lo: pos = bisect_left(starts, lo). Is idx == pos when no overlap? If no interval touches, then all intervals with hi < lo come before, all with lo > hi after. idx = first with hi >= lo. Those with hi < lo have lo < lo, so they're before insertion point. Intervals with hi >= lo but lo > hi (no touch means existing.lo > hi) — since no touch, all intervals with hi >= lo have lo > hi. So insertion point = idx. Good.

But wait: touching — existing.hi == lo counts as touch (merge [1,3)+[3,5)). existing.lo == hi also touch. Condition existing.hi >= lo and existing.lo <= hi covers both. Good.

Edge: numeric types — ints/floats comparison fine. Mixed int/float equality: 3 == 3.0, fine for merging.

remove(lo, hi): if lo >= hi return. idx = bisect_left(his, lo) (first interval with hi >= lo; intervals with hi < lo can't contain anything >= lo... actually intervals with hi <= lo: for removal of [lo,hi), intervals with hi <= lo don't matter; hi == lo means interval ends at lo, doesn't contain [lo,...). So bisect_left on his with lo works: first hi >= lo). Then iterate from idx while ivs[i][0] < hi: handle overlap.

For each overlapping interval [a,b) with a < hi and b > lo (overlap requires b > lo and a < hi):
- if a < lo: keep [a, lo]
- if b > hi: keep [hi, b]
Handle by rebuilding the affected region.

Implementation for remove:
```
i = bisect_left(self._his, lo)
# collect
j = i
while j < len(self._ivs) and self._ivs[j][0] < hi:
    j += 1
# intervals i..j-1 overlap (since ivs[i].hi >= lo and ivs[j-1].lo < hi)
```
Wait need overlap check: ivs[i].hi >= lo yes; but could ivs[i].lo >= hi? Only if j == i, then loop doesn't run... if j == i, ivs[i][0] >= hi, no overlap. If j > i, then ivs[i][0] < hi (since loop ran at least once for i). And ivs[j-1].hi > lo? ivs[i].hi >= lo; if ivs[i].hi == lo, then ivs[i] = [a, lo] with a < hi? overlap is empty ([a,lo) ∩ [lo,hi) = ∅). Touching doesn't matter for removal. Hmm, ivs[i].hi == lo means no actual overlap. Then we shouldn't remove it, but also shouldn't merge. Let's just check: pieces.

Better to handle explicitly:
```
new = []
if i < j:
    a, b = self._ivs[i]
    if a < lo:
        new.append([a, lo])  # careful if b <= lo? can't be, b >= lo and if b == lo then a<lo gives [a,lo] unchanged — fine, keep it
    ...
```
Wait if ivs[i].hi == lo exactly: then interval [a, lo] doesn't overlap. If a < lo, keeping [a, lo] is correct (unchanged). But then also need [hi, b] from... b == lo < hi, so no right piece. Fine. But the slice replacement: we replace ivs[i:j] with new pieces. Let me write:

```
pieces = []
for k in range(i, j):
    a, b = self._ivs[k]
    if a < lo: pieces.append([a, min(lo, b)])  # b > lo guaranteed? not necessarily
```
Hmm, getting messy. Cleaner:

For each interval in [i, j):
- a, b
- left part if a < lo: [a, lo]
- right part if b > hi: [hi, b]
But if b <= lo (i.e., b == lo), no overlap; left part [a, lo] would be [a, b] — same interval, keep as is. If a < lo and b == lo: appending [a, lo] = [a, b] — correct. If a >= lo (a in [lo, hi)): no left part. If b <= lo: right part b > hi? no. So pieces = [[a, lo]] which equals original. Good, that works generally.

Edge: a < lo but b < lo? Can't happen since b >= lo for intervals in range... ivs[i].hi >= lo by bisect, and intervals in [i,j) — only i has hi possibly == lo; others have hi > lo (disjoint, hi < lo of next... actually intervals sorted with gaps, so for k > i, ivs[k].lo >= ivs[i].hi... anyway ivs[k].hi > ivs[k].lo >= previous hi >= lo). Fine.

But also case where a < lo and b > lo but b < hi... standard.

Also need: if a < lo and b > hi → split into [a, lo] and [hi, b]. Covered.

So:
```
def remove(self, lo, hi):
    if lo >= hi: return
    i = bisect_left(self._his, lo)
    j = i
    n = len(self._ivs)
    while j < n and self._ivs[j][0] < hi:
        j += 1
    if i == j:
        return
    pieces = []
    a0, b0 = self._ivs[i][0], self._ivs[j-1][1]
    if self._ivs[i][0] < lo:
        pieces.append([self._ivs[i][0], lo])
    if b0 > hi:
        pieces.append([hi, b0])
    self._ivs[i:j] = pieces
    rebuild _his
```
Wait but if ivs[i].hi == lo and ivs[i].lo < lo: piece [a, lo] — but the interval was [a, lo] originally, unchanged. Correct but we must also check: could ivs[i].hi == lo and lo... also then should we NOT remove anything from it — correct.

Hmm but subtle: if ivs[i] = [a, lo] (hi == lo), and ivs[i+1] exists with lo' < hi — but ivs[i+1].lo >= ivs[i].hi = lo, and ivs[i+1].lo < hi, so it's in range and gets processed. But could ivs[i+1].hi... fine, all handled per-interval.

Also case ivs[i].lo < lo but ivs[i].hi == lo: piece [a, lo]. But wait — if the removed range starts at lo and this interval ends at lo, no overlap. We keep it unchanged. Good.

But another subtlety: what if lo is inside ivs[i] strictly (a < lo < b)? Then piece [a, lo] correct, and if b > hi also [hi, b].

But what if ivs[i].lo >= lo (interval starts inside removal range)? Then no left piece. And if b > hi: [hi, b]. But what if b <= hi? Whole interval removed. Good.

Edge: what if i < j but ivs[i].hi == lo and ivs[i].lo... hmm what if the FIRST interval in range has hi == lo and lo... then pieces: left [a, lo] (if a < lo, which is always true). Right piece from b0 = last interval's hi if > hi. But wait — if ivs[i].hi == lo, is [hi, b0] correct? b0 is last overlapping interval's hi. Yes.

Hmm, but there's an issue: if ivs[i].hi == lo and there is no other overlap and a < lo: pieces = [[a, lo]] — but we replace ivs[i:j] = ivs[i:i+1] with [a, lo] — same. Fine.

But wait, one more edge: what if ivs[i].hi > lo but ivs[i].lo >= hi? Then j == i (loop condition fails immediately), handled.

After modification, rebuild self._his = [iv[0] for iv in self._ivs] — O(n). For 60k adds of disjoint intervals, each add is O(n) due to slice assignment / list rebuild... slice assignment ivs[i:j] = pieces is O(n) per op → 60k * O(n) worst = but n grows to 60k, so 60k*60k = 3.6e9 — too slow? Hmm.

Actually list slice assignment with equal-length or different length: it's O(size of list) because elements shift. 60000 adds each causing O(n) shift → O(n²) = 1.8e9 element moves. In CPython, list shifts are memmove (C speed), ~ 3.6e9... memmove of pointers, 8 bytes each. Average shift 30k elements * 8 bytes = 240KB per op, 60k ops → ~14.4 GB moved. memmove throughput ~10 GB/s → ~1.5-3 seconds. Hmm, borderline "well under 5 seconds". Also building _his list each time is O(n) pure Python — 60k * average 30k = 1.8e9 iterations in Python — way too slow!

Need better. Options:
- Use bisect on the ivs list directly with key? Python 3.11 bisect supports key parameter. bisect with key computes key per comparison, but the list itself is sorted by lo. So bisect_right(self._ivs, lo, key=lambda iv: iv[0]) — key is called on list elements during search (and on the needle). That avoids maintaining separate _his list. Still O(n) for slice assignment.

Alternative: for random-order disjoint intervals, each add touches O(1) intervals but insertion into a Python list is O(n) memmove. 60k inserts with average shift 30k → total memmove ~ 60k*30k*8 bytes ≈ 14.4 GB. At ~20GB/s for memmove of contiguous pointer arrays... actually list insertion uses memmove, very fast. Probably ~1-2s. Hmm risky but probably OK? "well under 5 seconds".

Alternative: maintain two parallel lists (starts and ends) — insertion into two lists doubles memmove. Still memmove-fast.

Better alternative: don't rebuild _his; instead, since intervals are disjoint and sorted, we can bisect on ivs directly using key. Python 3.11's bisect supports key. So:

idx = bisect_right(self._ivs, lo, key=lambda iv: iv[0])? Hmm, bisect with key: the key function is applied to the needle (lo) — but lo is a number, and key would be applied... Actually in bisect with key, key is applied to elements of a, and also to x? Let me recall: "key specifies a key function... The key function is applied to each element in the array, and to the searched value." Yes, applied to x too. So if key = lambda iv: iv[0], then key(lo) = lo[0] — fails since lo is a number. So instead use key = operator.itemgetter? Same issue.

Trick: use key with x being a dummy? Common trick: bisect(a, x, key=f) where key applied to x too. We could pass a tuple? Alternatively maintain parallel list of starts — simpler and memmove-fast.

Actually simplest: maintain self._lo (list of starts) and self._hi (list of ends). Insertions: two list slice assignments, each O(n) memmove. 60k * 2 memmoves of avg 30k*8=240KB → ~29GB... hmm, ~2-4s? Risky.

Alternative structure: since adds are of small disjoint intervals in random order, could the list insertion dominate? Let's estimate more carefully: 60,000 adds, final n=60,000 intervals. Each insertion position uniform → average shift = n/2 average over time = 15,000 elements per insertion, times 60,000 = 9e8 element moves = 7.2 GB per list, 14.4 GB for two lists. list.insert memmove speed: roughly 1-10 GB/s depending. Hmm, CPython's list.insert specialized... memmove is typically >5 GB/s. So ~2-3s. "Well under 5 seconds" — cutting close.

Alternative: use a different data structure. Maybe keep a single list of intervals and accept O(n) but with fewer operations? Or use sortedcontainers — not stdlib.

Alternative: could use a list of intervals and bisect with key on tuples where we search using a sentinel. Actually there's a known trick: since intervals are [lo, hi) disjoint sorted, searching for where x falls: we want last interval with lo <= x... For contains: idx = bisect_right(starts, x) - 1; check x < ends[idx]. Parallel lists needed anyway or use key.

Hmm, but the key trick: bisect(ivs, (lo,), key=...) no.

Another idea: store intervals as flat flat list? Same.

Alternatively: accept O(n) but note the test: 60k adds of small disjoint intervals in random order. If we use two parallel lists, per-add cost: bisect O(log n) + 2 slice inserts O(n) memmove. I think it's fine actually. Let me estimate memmove throughput in CPython list.insert: CPython uses memmove which on modern hardware does ~10-30 GB/s for large blocks. 14.4 GB / 10 GB/s = 1.4s. Plus per-op overhead of 60k iterations — negligible. So total ~1.5-2s. "Well under 5s" — acceptable, but let's think if there's something smarter with pure Python...

Actually, we could reduce to ONE list insertion by storing intervals as flat numbers in a single list: [lo1, hi1, lo2, hi2, ...]. Then insertion = one slice assignment of 2 elements → one memmove of n elements. Halves the work. But indexing gets more complex. Probably not needed.

Actually, better: only one list self._ivs of [lo, hi] pairs, and bisect with key... The key problem: bisect applies key to x as well. Workaround: pass key that handles both? key = lambda iv: iv[0] if isinstance(iv, list) else iv. Then for contains(x): bisect_right(self._ivs, x, key=K) where K(iv) = iv[0], K(x) = x. That works but key is called O(log n) times per query with Python-level lambda → 200k * ~17 calls = 3.4M lambda calls, ~1-2s. Parallel lists with C-level bisect on floats/ints is faster: bisect on list of numbers, comparisons in C. 200k * 17 C comparisons — fast, ~0.2s.

I'll go with parallel lists self._los and self._his.

contains(x): i = bisect_right(self._los, x) - 1; return i >= 0 and x < self._his[i].

add(lo, hi): if lo >= hi: return. Find range to merge:
- i = bisect_left(self._his, lo) → first interval with hi >= lo (touching on left merges).
- j = bisect_right(self._los, hi) → first interval with lo > hi (touching on right: interval with lo == hi touches → merge, so we want intervals with lo <= hi, i.e., bisect_right gives first > hi; intervals [i, j) all have lo <= hi... wait need ivs[k].lo <= hi for touching/overlap; bisect_right(_los, hi) gives first index with los[idx] > hi. So k in [i, j) have los[k] <= hi. And his[k] >= his[i] >= lo. Good.)

But careful: could i > j ever? If i <= j always? i is first hi >= lo; j is first lo > hi. Since lo <= hi. Suppose interval sets: intervals before i have hi < lo → their lo < lo <= hi → los < hi → they're before j too. So j >= i? Intervals between i and j-1... Actually any interval with index < i has hi < lo ≤ hi so lo < hi... wait lo < lo? its hi < lo (the add's lo) ≤ hi (add's hi), and its lo < its hi ≤ hi, so its lo < hi → index < j. Hence j ≥ i. Good.

New merged: nlo = min(lo, self._los[i]) if i < j else lo; nhi = max(hi, self._his[j-1]) if j > i else hi.

Wait but when i == j (no overlap/touch), insertion point should be... i is first hi >= lo. Insert [lo,hi] at position? In sorted by lo order, since all intervals before i have hi < lo → lo' < lo, they come before. All intervals from i on have lo' > hi (since no touch, and los[i] could be... if no overlap, intervals from i have los > hi... actually los[i] > hi or his[i] could be >= lo but lo' > hi means no touch). Insert at position i? Hmm, need position by lo: insertion index = number of intervals with lo' < lo... Intervals before i have lo' < lo. Intervals at i have lo' ≥ ... los[i] > hi ≥ lo. So insert at i. But is i == j here? j = first lo > hi = first index with los > hi. Since los[i] > hi, j = i. Consistent. 

When i < j: replace slice [i:j] with single merged interval. nlo = min(lo, los[i]) — but actually since his[i] >= lo, and intervals sorted: is los[i] possibly > lo? Yes if lo falls in a gap but touches on right. min works. nhi = max(hi, his[j-1]).

But also check: all intervals in [i, j) get absorbed — they overlap or touch: interval k in [i,j): his[k] >= his[i] >= lo, los[k] <= hi. Overlap or touching. Merged into one. Good.

Slice assignment: self._los[i:j] = [nlo]; self._his[i:j] = [nhi]. Or when i==j: insert at i.

Handle i==j via: self._los[i:i] = [lo]... actually unified: self._los[i:j] = [nlo] works for i==j too (insertion). 

But wait — when i < j, nlo = min(lo, los[i]). But is nlo necessarily ≤ los[i]... yes by min. And ordering: los[i-1] < nlo? Interval i-1 has hi < lo and los[i-1] < his[i-1] < lo... and nlo = min(lo, los[i]) > his[i-1]? his[i-1] < lo, and los[i] > his[i-1]. nlo = min(lo, los[i]) — could nlo == his[i-1]? his[i-1] < lo and his[i-1] < los[i], so his[i-1] < min(lo, los[i]) = nlo. Strictly less? his[i-1] < lo yes, his[i-1] < los[i] yes → his[i-1] < nlo. Good, disjoint maintained (gap ≥ 0... gap = nlo - his[i-1] > 0). Good.

remove(lo, hi): if lo >= hi return.
- i = bisect_left(self._his, lo) → first interval with hi >= lo. Intervals with hi == lo don't overlap ([.., lo) ends before lo) but they might need to be kept as-is; including them in the range is fine (left piece [a, lo] = original).

Hmm wait, but if his[i] == lo, interval i doesn't overlap but including it: pieces would be [los[i], lo] if los[i] < lo — same interval. But it also might absorb... no, remove doesn't merge. But problem: if we include interval i (with his[i]==lo) in the replaced range and the "last interval" j-1 has his > hi, we emit [hi, his[j-1]] — fine. And left piece [los[i], lo] — but wait, what if los[i] < lo and his[i] == lo and interval i+1 also overlaps: pieces = [[los[i], lo]] then right piece from last: [hi, his[j-1]] if his[j-1] > hi. But interval i+1 between them fully removed. Correct? The removed range [lo, hi): interval i = [a, lo) untouched — but we replaced it with [a, lo], identical. Interval i+1..j-1 removed. Right piece. Correct.

But there's a subtle bug: if his[i] == lo, then interval i has no overlap. But what if his[i] == lo AND we should keep it exactly — we do. However: what if los[i] == lo too? Impossible for valid interval (lo < hi within interval). los[i] < his[i] = lo, so los[i] < lo, left piece emitted. Fine.

Alternatively use bisect_right(self._his, lo) to skip intervals with hi == lo — cleaner? bisect_right gives first hi > lo. Intervals with hi == lo excluded. Then all intervals in [i, j) have his > lo → genuine overlap if los < hi. Let me use bisect_right for i. Then:

- i = bisect_right(self._his, lo): first interval with hi > lo.
- j = bisect_left(self._los, hi): first interval with lo >= hi. Intervals in [i, j) have hi > lo and lo < hi → genuine overlap.

Wait, interval with los == hi: not overlapped (starts at hi, removed range ends at hi). Exclude. Good.

For k in [i, j): his[k] > lo, los[k] < hi → overlap. 

Pieces: left: if los[i] < lo: [los[i], lo]. Right: if his[j-1] > hi: [hi, his[j-1]]. But careful: middle intervals (fully covered) removed. But what if i == j (no overlap): nothing to do, return.

Edge check: what if interval i has los[i] < lo and his[i] < hi but > lo: left piece [los[i], lo]; right piece: his[j-1] where j-1 might be i itself if only one overlapping interval. If his[i] <= hi, no right piece from i. Correct.

But wait: what if i < j and j-1 > i and his[j-1] > hi: [hi, his[j-1]]. And los[j-1] < hi (guaranteed since j-1 < j). Good.

But bug: what if i < j but the last overlapping interval j-1 has his[j-1] > hi AND los[j-1] >= lo... it's fully/partially covered; right piece [hi, his[j-1]] correct.

Another edge: left piece condition los[i] < lo — but if los[i] >= lo, interval i starts within [lo, hi) region... its overlap handled: fully removed unless it's also the last with his > hi. Correct.

So:
```
if i == j: return
left = []
if self._los[i] < lo: left = [self._los[i], lo]... 
```
Represent pieces as pairs for the two parallel lists:
```
new_lo = []
new_hi = []
if self._los[i] < lo:
    new_lo.append(self._los[i]); new_hi.append(lo)
if self._his[j-1] > hi:
    new_lo.append(hi); new_hi.append(self._his[j-1])
self._los[i:j] = new_lo
self._his[i:j] = new_hi
```
Wait — but what if i < j and also interval i's hi == lo... we used bisect_right so his[i] > lo strictly. OK.

Hmm, one more: what if j-1 == i and interval i contains [lo, hi) entirely: los[i] < lo, his[i] > hi → two pieces, split into two. Correct.

total_length: sum(hi - lo for...) — maintain incrementally? Could compute on demand O(n) — but calls might be frequent? Spec doesn't say. Maintain a running total: on add, add merged length; on remove, subtract. Let's maintain self._total. On add: total += nhi - nlo - (sum of absorbed lengths)? Simpler: compute absorbed = sum of (his[k]-los[k]) for k in [i,j) — O(k) but k is typically small... could be large in adversarial cases but fine. Actually for add of a big interval absorbing many, it's O(k) anyway due to slice. Maintain:

add: absorbed = sum(self._his[k] - self._los[k] for k in range(i, j)); total += (nhi - nlo) - absorbed.
remove: removed = sum(self._his[k] - self._los[k] for k in range(i, j)); total -= removed; plus pieces added back: total += (lo - los[i] if left) + (his[j-1] - hi if right). Alternatively total += sum(new pieces lengths) - removed.

Simpler: compute total lazily with caching invalidation. Or just maintain incrementally as above.

Actually, even simpler and robust: keep self._total updated:
- add: after computing pieces, delta = (nhi - nlo) - absorbed.
- remove: delta = sum(new_hi[x] - new_lo[x]) - removed_sum.

Let me just compute lengths of pieces.

intervals(): return list(zip(self._los, self._his))? Need list of tuples: list(zip(...)) gives tuples. Good.

__len__: len(self._los).

Values: "Keep the original values (no rounding)" — we store lo/hi as given; merged endpoints: min/max of originals — fine.

One concern: mixed int/float, e.g., add(1, 3) and add(3.0, 5): los/his comparisons fine, merge gives min/max → (1,5). bisect on mixed int/float lists works (comparisons defined). Good.

Also NaN? Ignore.

Also: the bisect functions need `from bisect import bisect_left, bisect_right, insort`.

Let me now also double check add's i/j computation once more with concrete example.

Set: {[1,3)}, add [3,5): los=[1], his=[3]. lo=3, hi=5. i = bisect_left(his, 3) = bisect_left([3],3) = 0. j = bisect_right(los, 5) = 1. Range [0,1): absorbed [1,3). nlo=min(3,1)=1, nhi=max(5,3)=5 → [1,5]. Correct (touching merged).

Set {[1,3)}, add [5,7): i = bisect_left([3],5)=1, j = bisect_right([1],5)=1. i==j → insert at 1: los=[1,5]. Correct.

Set {[1,3),[5,7)}, add [2,6): los=[1,5], his=[3,7]. i=bisect_left([3,7],2)=0, j=bisect_right([1,5],6)=2. nlo=min(2,1)=1, nhi=max(6,7)=7 → [1,7]. Correct.

Set {[1,3),[5,7)}, add [0,1): i=bisect_left([3,7],0)=0, j=bisect_right([1,5],1)=1. range [0,1): interval [1,3) — los[0]=1 <= hi=1 → touching, merged. nlo=min(0,1)=0, nhi=max(1,3)=3 → [0,3). Correct.

remove tests: Set {[1,5)}, remove [2,3): los=[1], his=[5]. i=bisect_right([5],2)=0, j=bisect_left([1],3)=0?? bisect_left([1],3) = 1 (first index where los[idx] >= 3 → los[0]=1 < 3, so index 1). j=1. Range [0,1). left: los[0]=1<2 → [1,2]. right: his[0]=5>3 → [3,5]. Result {[1,2),[3,5)}. Correct.

remove [0,2) from {[1,5)}: i=bisect_right([5],0)=0, j=bisect_left([1],2)=1. left: los[0]=1 < 0? No. right: 5>2 → [2,5]. Result {[2,5)}. Correct.

remove touching-only: {[1,5)}, remove [5,7): i=bisect_right([5],5)=1, j=bisect_left([1],7)=1. i==j → nothing. Correct.

remove [0,1) from {[1,5)}: i=bisect_right([5],0)=0, j=bisect_left([1],1)=0. Nothing. Correct.

Now incremental total:
add: absorbed_sum over [i,j); new length nhi-nlo; total += (nhi-nlo) - absorbed_sum.
remove: removed_sum over [i,j); pieces sum; total += pieces_sum - removed_sum.

Implementation:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_los", "_his", "_total")

    def __init__(self):
        self._los = []
        self._his = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect_left(his, lo)
        j = bisect_right(los, hi)
        nlo = lo
        nhi = hi
        absorbed = 0
        for k in range(i, j):
            a = los[k]
            if a < nlo: nlo = a
            b = his[k]
            if b > nhi: nhi = b
            absorbed += b - a
        los[i:j] = [nlo]
        his[i:j] = [nhi]
        self._total += (nhi - nlo) - absorbed
```

Hmm wait — absorbed uses b - a per interval; but nhi - nlo - absorbed: correct since merged region covers [nlo, nhi) and absorbed is the part already present.

Wait but there's an issue with the loop: intervals in [i,j) — but do all of them actually overlap/touch [lo,hi)? i = first his >= lo; j = first los > hi. Interval k in [i,j): his[k] >= his[i] >= lo, los[k] <= hi. Touch or overlap — yes all absorbed. Good.

But subtle: what if i == j? Then loop empty, los[i:i] = [nlo] inserts. But wait — is insertion at index i correct when i == j? Shown earlier yes.

Hmm, but one more subtlety for add when i == j: is position i correct? i = bisect_left(his, lo): first interval with his >= lo. All intervals before have his < lo. All intervals from i have his >= lo and (no overlap) los > hi ≥ lo. So their los > lo... los[i] > hi ≥ lo → los[i] > lo? los[i] > hi and hi >= lo → los[i] could equal... los[i] > hi >= lo → los[i] > lo or los[i] == hi? los[i] > hi means los[i] > hi >= lo so los[i] > lo strictly when hi >= lo... if hi == lo? No, lo < hi guaranteed. los[i] > hi > lo. So insert at i correct ordering-wise. 

remove:
```
    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect_right(his, lo)
        j = bisect_left(los, hi)
        if i == j:
            # no interval overlaps [lo, hi)
            # but wait: could there be an interval with his > lo and los < hi that... no, i==j means none.
            return
        removed = 0
        for k in range(i, j):
            removed += his[k] - los[k]
        new_lo = []
        new_hi = []
        if los[i] < lo:
            new_lo.append(los[i]); new_hi.append(lo)
        if his[j-1] > hi:
            new_lo.append(hi); new_hi.append(his[j-1])
        los[i:j] = new_lo
        his[i:j] = new_hi
        self._total += sum(new_hi) - sum(new_lo)... 
```
Hmm pieces lengths: (lo - los[i]) if left + (his[j-1] - hi) if right. total += that - removed.

Wait, but careful: when i == j we return — but is it possible that i == j while an interval overlaps? i = first his > lo; j = first los >= hi. If interval m overlaps: his[m] > lo → m >= i; los[m] < hi → m < j. So overlap implies i <= m < j, i < j. So i == j → no overlap. Good.

But another subtlety in remove: when i < j, is los[i] < lo check right? What if interval i doesn't start before lo, e.g., interval i = [2, 8), remove [3, 5): los[i]=2 < 3 → left piece [2,3]. Correct. If interval i = [3,8), remove [1,5): los[i]=3 >= 1 → no left piece; right: his=8 > 5 → [5,8]. Middle removed. Correct.

Edge: what if i < j and interval i has his... all fine.

But one more: what if los[i] < lo but interval i is NOT actually overlapping... i is first his > lo, and j > i means los[i] < hi... wait j > i means los[i] < hi (since j = first los >= hi, intervals before j have los < hi). And his[i] > lo. So interval i overlaps. But if los[i] < lo and his[i] == lo? Can't: bisect_right gives his[i] > lo. Good.

Hmm wait, actually recheck: bisect_right(his, lo) — first index where his[idx] > lo. Yes.

contains:
```
    def contains(self, x):
        i = bisect_right(self._los, x) - 1
        if i < 0:
            return False
        return x < self._his[i]
```
Since intervals disjoint, x in exactly the interval whose lo is the greatest ≤ x. Correct.

Edge: x equals a lo: bisect_right(los, x) includes index of lo → i points to it, x < his[i] if interval nonempty. Good. x equals a hi: interval with that hi has los < x... i = index of interval with greatest los <= x. If x == his of that interval: x < his[i] false → False. But could x also equal next interval's lo? E.g., {[1,3),[3,5)} — impossible, merged. So gaps only. If x == 3 and intervals [1,3),[5,7): i = bisect_right([1,5],3)-1 = 1-1=0 → his[0]=3, 3<3 false → False. Correct.

total_length: return self._total.

intervals: return list(zip(self._los, self._his)) — zip yields tuples. But "sorted, disjoint, and with touching intervals merged" — invariant maintained. But hmm: could merged intervals contain values like int/float mixing? Fine.

__len__: return len(self._los).

Wait, one concern about `intervals()` returning tuples of the stored values — "Keep the original values (no rounding)" — we do. But in add with merge, endpoints are min/max of originals — that's expected.

One more potential issue: bisect on list of mixed int/float — comparisons fine. bisect_left(his, lo) where his contains ints and lo is float — fine.

Performance concern: the loop `for k in range(i, j)` in add is O(k) Python — for the test (small disjoint intervals), k is tiny. Slice assignment O(n) memmove. Total ~ fine.

Actually, let me reconsider the add inner loop: I compute nlo/nhi and absorbed in one pass — good.

Also micro-opt: avoid range loop when i==j. Fine as is.

One more correctness check on add merging with touching on both sides: set {[1,3),[5,7)}, add [3,5): i = bisect_left([3,7],3)=0, j = bisect_right([1,5],5)=2. absorbed = (3-1)+(7-5)=4. nlo=1,nhi=7, len 6, total += 2. Result [1,7). Correct.

Also duplicate add: {[1,5)} add [2,3): i=bisect_left([5],2)=0, j=bisect_right([1],3)=1. absorbed=4, nlo=1,nhi=5, total += 0. Correct.

I think the solution is solid. Also add __init__ with optional... no, keep minimal. Maybe support IntervalSet() only.

Also should `contains` handle x being non-number? Not required.

Edge: floats like inf — works.

Write final code with docstrings minimal.