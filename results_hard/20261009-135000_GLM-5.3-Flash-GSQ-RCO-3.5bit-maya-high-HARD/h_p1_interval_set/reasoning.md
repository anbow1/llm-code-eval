Design: sorted list of disjoint intervals, bisect on lo. add: find overlapping intervals and merge. remove: similar.

Implementation with a list of [lo, hi] kept sorted. Use bisect on lo values. Maintain parallel structure? Simpler: keep list of tuples, use bisect with key... Python 3.10+ bisect supports key. Use a list of tuples and bisect_right(intervals, lo, key=lambda iv: iv[0])? Actually key parameter supported in 3.10. But to keep fast, we can keep separate list of lo values and list of tuples.

Simplest: list `ivs` of (lo, hi) sorted by lo. bisect on ivs using key=lambda t: t[0] works but key computation per comparison adds overhead; fine.

add(lo, hi): if lo >= hi return. i = bisect_left for lo... Let's think.

We want to find first interval that could overlap: intervals with hi >= lo, i.e., intervals with lo < hi_new... hmm. All intervals have lo < hi. An interval [a,b) overlaps/touches [lo,hi) if a < hi and b > lo (touching: b == lo or a == hi count for merging). We merge touching intervals.

Find leftmost interval with b >= lo: since sorted by a and a<b, intervals with b >= lo... not monotonic directly, but since a < b and sorted by a, if b < lo then a < lo. Intervals to the right have a >= a_left. Hmm, an interval with small a could have large b. Actually intervals are disjoint so b of interval k <= a of interval k+1. So b values are also increasing. So we can bisect on b: find first interval with b >= lo. Similarly first interval with a > hi is the first non-overlapping.

Use separate arrays: los, his. Or keep tuples and use key.

Let me maintain a single list of tuples. To find start: use bisect_left on list of (lo, hi) with key hi? Mixed keys complicated. Better: keep two parallel lists `los` and `his`, and a list? Actually intervals fully determined by los/his arrays. Keep `self._los` and `self._his` as lists. bisect_right(self._his, lo) gives first index with hi > lo. bisect_right(self._los, hi) gives first index with lo > hi — that's the first interval entirely after (lo > hi means no touch). Overlapping/touching range: indices [i_start, i_end) where i_start = bisect_right(his, lo), i_end = bisect_right(los, hi).

Wait check: interval j touches/overlaps [lo,hi) iff his[j] >= lo and los[j] <= hi. Since his[j] <= los[j+1], indices with his >= lo form a suffix: i_start = bisect_right(his, lo)? bisect_right returns first index where his[idx] > lo. Interval touching requires his[j] >= lo; his[j] == lo counts as touching ([a, lo) + [lo, hi) merge). bisect_left(his, lo) gives first index with his[j] >= lo. Use bisect_left.

i_end: first j with los[j] > hi. Interval with los[j] == hi touches and merges. So i_end = bisect_right(los, hi).

If i_start >= i_end: no overlap. For add: insert (lo,hi) at position i_start. But wait — check merging with neighbors: if i_start == i_end and previous interval's hi == lo? That's covered: if prev his == lo, bisect_left(his, lo) would include prev? bisect_left finds first index with value >= lo; prev his == lo >= lo, so i_start would point to prev or earlier. Hmm, bisect_left gives first such; if prev has his == lo and intervals before have his < lo, i_start = prev index. Good. Similarly next interval with los == hi: bisect_right(los, hi) gives first > hi, includes next. Good.

But there's a subtlety: what if no interval overlaps but lo falls exactly at a boundary—handled above.

Add with overlap range [i_start, i_end):
- new_lo = min(lo, los[i_start]) if i_start < i_end else lo
- new_hi = max(hi, his[i_end-1]) if i_end > i_start else hi
- Replace slice with single interval: los[i_start:i_end] = [new_lo]; his[i_start:i_end] = [new_hi].

Remove: overlap range [i_start, i_end) where i_start = bisect_right(his, lo) (first with his > lo — strictly overlapping, touching doesn't matter for removal), i_end = bisect_left(los, hi) (first with los >= hi — touching at hi doesn't matter). Actually interval overlaps [lo,hi) iff his[j] > lo and los[j] < hi. So i_start = bisect_right(his, lo), i_end = bisect_left(los, hi).

For removal, replacement pieces:
- left part: if los[i_start] < lo: keep (los[i_start], lo)
- right part: if his[i_end-1] > hi: keep (hi, his[i_end-1])
Replace slice accordingly.

contains(x): j = bisect_right(los, x) - 1; return j >= 0 and x < his[j]. O(log n).

total_length: sum(hi-lo) each call — fine, or maintain incrementally. Calls may be frequent; 60000 adds — computing sum each time O(n) each → 60000 * up to 60000/2... could be 1.8e9 ops worst case if all disjoint? Actually 60000 disjoint intervals, sum each add → total ~ 60000*60000/2*... = 1.8e9 — too slow potentially. Better maintain total incrementally. Let's keep self._total updated in add/remove.

add: removed length = sum of his[i]-los[i] for overlap range; new length = new_hi-new_lo. Use loops; overlap ranges are small typically (merging). Fine.

Actually to compute removed length quickly: use itertools.islice/zip? For small ranges fine.

__len__: len(self._los).

intervals(): list(zip(self._los, self._his)).

Performance check: 60000 adds, each O(log n + k) with list insert cost O(n) due to slice assignment — slice assignment on list of 60000, memmove ~ fast, 60000 * 60000 * (element size) — memmove of pointers, ~60000^2/2 * 8 bytes = 14 GB memmove worst case? Actually average insert position middle → 60000 adds each moving average 30000 pointers = 1.8e9 pointer moves ≈ several seconds? memmove is fast (~10 GB/s), 14.4 GB → ~1.5s. Under 5s probably fine. But "well under 5 seconds" — could optimize with a more clever structure, but slice-based is typical and acceptable. Actually average shift is ~n/2 only if random insertion positions; random order disjoint intervals → positions uniform → average 30000 shifts, each shift is a memmove of 8*30000 bytes = 240KB → 60000 * 240KB = 14.4GB memmove ≈ 1-2s. Plus contains 200000 O(log n) trivial. Acceptable.

Alternatively use a list of tuples with bisect key — similar. I'll go with parallel lists for speed of bisect (no key lambda).

Edge: floats/ints mixed, half-open semantics fine.

Also handle remove producing zero-length pieces correctly (we guard with strict inequalities).

Let me write code.

def add(self, lo, hi):
    if lo >= hi: return
    los, his = self._los, self._his
    i = bisect_left(his, lo)
    j = bisect_right(los, hi)
    if i == j:
        # no overlap; insert
        los.insert(i, lo); his.insert(i, hi)
        self._total += hi - lo
        return
    # merge
    removed = 0.0? careful about int vs float: sum of his[k]-los[k] — keep numeric exactness: just compute total delta as (new_hi - new_lo) - sum(...). Mixing ints fine.
    new_lo = lo if lo <= los[i] else los[i]  → min(lo, los[i])
    new_hi = hi if hi >= his[j-1] else his[j-1] → max
    removed_len = sum of (his[k]-los[k] for k in range(i,j)) — could be large range? Overlap range length could be many intervals (e.g., adding huge interval covering all). sum via loop fine; or use math: could compute in loop.
    Actually to avoid Python loop for huge ranges, could use sum with islice — still loop. Fine.
    delta = (new_hi - new_lo) - (old total of slice). Compute old via loop: t = 0; for k in range(i,j): t += his[k]-los[k].
    los[i:j] = [new_lo]; his[i:j] = [new_hi]
    self._total += (new_hi - new_lo) - t

Hmm, but careful: for ints, total stays int if all ints. Good.

remove:
    if lo >= hi: return
    i = bisect_right(his, lo)
    j = bisect_left(los, hi)
    if i >= j: return
    t = 0; for k in range(i,j): t += his[k]-los[k]
    replacement pieces:
    pieces_lo, pieces_hi = [], []
    if los[i] < lo: append lo_left piece (los[i], lo)
    if his[j-1] > hi: append (hi, his[j-1])
    los[i:j] = pieces_lo; his[i:j] = pieces_hi
    self._total -= t

Wait remove overlap condition: interval [a,b) overlaps removal [lo,hi) iff a < hi and b > lo. i = first index with his > lo → bisect_right(his, lo). But intervals before i have his <= lo → no overlap (b <= lo). Intervals from i onward could overlap but also need a < hi: first with los >= hi is j = bisect_left(los, hi). Intervals with los >= hi don't overlap (a >= hi). But is every interval in [i, j) overlapping? Need both b > lo and a < hi. Interval k in [i,j): his[k] > lo? Since his increasing, k >= i → his[k] >= his[i] > lo ✓. los[k] < hi? los increasing, k < j → los[k] < los[j]... wait bisect_left(los, hi) gives first index with los >= hi; k < j → los[k] < hi ✓. Good.

For add: touch condition a <= hi and b >= lo (touching merges). i = bisect_left(his, lo): first with his >= lo ✓. j = bisect_right(los, hi): first with los > hi; indices < j have los <= hi ✓. Intervals in [i,j): his[k] >= his[i] >= lo ✓, los[k] <= hi ✓. Good.

contains: idx = bisect_right(los, x) - 1; if idx >= 0 and x < his[idx]: True.

Also merging: note new interval could also touch neighbor beyond j? No—j is first with los > hi, so los[j] > hi, no touch. And intervals before i have his < lo, no touch. Good.

intervals returns list of tuples.

Also need `__len__`.

One concern: bisect_left(his, lo) with mixed int/float comparisons fine.

Write the class with __slots__ maybe.

Also total_length returns self._total.

Edge case in add when i==j insertion position: i = bisect_left(his, lo), j = bisect_right(los, hi). Is i == j correct insert position ordering? If no overlap, intervals before have his < lo (since i = first his >= lo... wait if i==j, does i = bisect_left(his,lo) and j = bisect_right(los,hi) equal? If no intervals touch, then all intervals have his < lo or los > hi. Since los/his increasing: intervals split into prefix with his < lo... hmm, actually his[k] < lo and los[k] > hi can't both... Let k1 = number of intervals with his < lo... Actually if i==j, insert at index i. Check consistency: intervals [0,i) have his < lo... bisect_left gives first his >= lo; those before have his < lo. bisect_right(los, hi) first los > hi; those from j have los > hi. If i == j, then intervals before i: his < lo; intervals from i: los > hi? Only if j == i. But do intervals from i onward all have los > hi? bisect_right gives first index with los > hi, but some between could have los <= hi? No—if any interval k in [i,j) existed it would overlap; i==j means empty. And intervals >= j have los > hi. So insert at i keeps sorted: los[i] > hi > lo, los[i-1] < ... his[i-1] < lo so los[i-1] <= his[i-1] < lo ✓. Good.

Also handle add when i==j but touching handled earlier (touching means i<j). Good.

Code it.