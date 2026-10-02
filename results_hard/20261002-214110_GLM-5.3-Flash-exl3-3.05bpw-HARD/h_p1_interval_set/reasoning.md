Implement IntervalSet with bisect on lo values. Merge on add. Handle floats.

add: keep list of disjoint intervals sorted by lo. Use bisect to find insert position. Standard implementation: find all intervals overlapping/touching, replace with merged.

Use bisect with a key? Python 3.11 bisect doesn't support key for... actually bisect supports key since 3.10. Yes, bisect.bisect_left supports key parameter since Python 3.10.

Store lo list separately (parallel arrays) for O(log n) contains without key overhead. Let's keep two lists: _lo and _hi.

contains(x): find interval where lo <= x < hi. bisect_right(_lo, x) - 1 gives rightmost interval with lo <= x; check x < _hi[i].

add(lo, hi): if lo >= hi return. Find range to merge: any interval i with hi_i >= lo and lo_i <= hi... touching: interval [a,b) touches [lo,hi) if a <= hi and b >= lo (since half-open, touching at endpoint merges: [1,3) and [3,5) merge to [1,5)). So merge condition: b >= lo and a <= hi.

Find leftmost interval to merge: first interval with hi >= lo. Since intervals are disjoint and sorted, hi is also sorted. Binary search over hi. Then merge all with lo <= hi.

Implementation using bisect on _hi list: pos = bisect_left(_hi, lo) gives first interval with hi >= lo. Then extend right while _lo[j] <= hi for intervals j starting from pos. Since lo sorted, we can bisect on _lo for upper bound: idx_hi = bisect_right(_lo, hi) gives first index with lo > hi... but careful: interval with lo == hi touches? [3,5) and [5,x)? condition a <= hi with a == hi: [5,7) vs [lo,hi) with hi=5: a=5 <= hi=5, b=7 >= lo=5 → merge. So merge if lo_j <= hi. But bisect_right(_lo, hi) gives first index with lo > hi, so intervals up to that index-1 have lo <= hi. Merge range: pos..bisect_right(_lo, hi) - 1. But careful with bisect_right on _lo returning insertion point after equal elements — since we want indices with lo <= hi, bisect_right gives position after all lo == hi, so slice end = bisect_right(_lo, hi). Intervals with lo <= hi are indices < bisect_right(_lo, hi). Correct.

new_lo = min(lo, _lo[pos]) if pos < end else lo; new_hi = max(hi, _hi[end-1]) if end > pos else hi.

Then replace _lo[pos:end] = [new_lo], similarly _hi.

Actually simpler with slices.

Edge: what if pos == end and pos < len — insert. Use:
i = bisect_left(_hi, lo)
j = bisect_right(_lo, hi)
if i == j: insert at i. Wait check: if no intervals overlap, j should equal i? If i == j, none to merge — j >= i always? bisect_right on _lo vs bisect_left on _hi... Not obviously. Consider interval [5,7), add [1,hi)? Hmm, if merge candidates are empty, then either no interval has hi >= lo (i == len) or first interval with hi >= lo has lo > hi (meaning lo_j > hi). Let's verify generally: intervals to merge are those k with hi_k >= lo and lo_k <= hi. i = first k with hi_k >= lo. j = first k with lo_k > hi. Merge candidates = [i, j). Since hi sorted and lo sorted correspondingly (disjoint: lo_k < hi_k <= lo_{k+1}), if k has hi_k >= lo then k has... hmm need consistency: is j >= i? Interval i has hi_i >= lo. hi > lo. So lo_i < hi_i, and hi_i could be <= hi or > hi. If lo_i <= hi then i < j (since lo_i <= hi, not > hi). If lo_i > hi then... is that possible with hi_i >= lo and hi_i > lo_i? lo_i > hi >= lo → hi_i > lo_i, fine. So i could be >= j? Example: intervals: [0,1). add [2,3). i = first with hi >= 2: hi_0 = 1 < 2, so i = 1 == len. j = bisect_right([0], 3) = 1. So j >= i here. Another: [5,7), add [2,3): i = first hi >= 2: hi_0=7>=2, i=0. j = first lo > 3: lo_0=5>3, j=0. i==j, insert. Another: [5,7),[10,12), add [2,3): i: hi_0=7>=2 → i=0. j: lo_0=5>3 → j=0. equal, insert at 0. Good—insert between.

Could j < i? j = first lo > hi. i = first hi >= lo. If j < i: interval j has lo_j > hi. Interval i-1 has hi_{i-1} < lo. Since j < i, j <= i-1, so lo_j > hi and hi_j < lo. But lo_j < hi_j... hi_j > lo_j > hi, and hi_j < lo → lo > hi, contradiction with lo < hi... wait lo_j >= hi_j needed since lo_j > hi and hi_j < lo but intervals disjoint sorted: lo_j < hi_j. hi_j < lo < hi < lo_j < hi_j contradiction. So j >= i always. Good.

remove(lo, hi): find intervals intersecting [lo,hi): interval k overlaps if lo_k < hi and hi_k > lo. i = first with hi > lo → bisect_right(_hi, lo). j = first with lo >= hi → bisect_left(_lo, hi). Candidates [i, j). For these: piece could extend left (hi_k > lo but lo_k < lo... wait lo_k < hi required... candidates have hi_k > lo and lo_k < hi). Left piece: lo_k < lo → keep [lo_k, lo). Right piece: hi_k > hi → keep [hi, hi_k). Hmm careful: candidate has hi_k > lo, lo_k < hi. Left fragment exists if lo_k < lo (strictly, since if lo_k >= lo then lo >= lo_k... if lo_k == lo, no left fragment). Right fragment if hi_k > hi.

Implementation: 
i = bisect_right(_hi, lo)
j = bisect_left(_lo, hi)
if i >= j: return
Handle left: lo0, hi0 = _lo[i], _hi[i]. Actually process first and last candidates separately, middle fully removed.

left_lo = _lo[i]; piece1 = (left_lo, lo) if left_lo < lo.
right_hi = _hi[j-1]; piece2 = (hi, right_hi) if right_hi > hi.
Replace slice [i:j] with pieces.

For contains with bisect: idx = bisect_right(_lo, x) - 1; if idx >= 0 and _lo[idx] <= x < _hi[idx]: True. That's O(log n).

total_length: cached sum, maintain incrementally or compute O(n) — fine to compute O(n) each call, but cache sum updated in add/remove for O(1). Simpler: keep a running total. Update in add/remove.

total_length may return float; compute sum of hi-lo values cached.

intervals(): list(zip(_lo, _hi)).

__len__: len(_lo).

Performance: 60000 adds with slicing — slice replacement is O(n) worst but average fine with random order. Python list slice assignment O(n) but 60000 * avg small... random order inserts: each add inserts possibly contiguous slice; slice assignment of empty into middle is O(n) shift. 60000 * ~30000/2 * constant... 60000*30000 = 1.8e9 element moves, but list insert uses memmove, very fast (~1e9 ops/sec). ~2-4 seconds? Hmm risky. Actually memmove of 30000 pointers ≈ 240KB, memmove speed ~10 GB/s, so ~24 µs per op, 60000 ops → 1.4s. "Well under 5 seconds" — 1.4s plus overhead acceptable but let's think. Actually average shift size: inserting randomly into growing list, expected shift = n/2 where n grows to 60000, average ~30000 pointers = 240KB per insert, memmove at ~20GB/s → 12µs → total 0.72s. Fine.

Alternatively could use sorted list with more clever structure but standard library only. This is fine.

Note bisect on separate arrays: contains bisect_right(_lo, x) — O(log n). Good.

Also merge in add touches slices; use slice assignment.

Write code:

```python
import bisect

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
        i = bisect.bisect_left(his, lo)
        j = bisect.bisect_right(los, hi)
        if i == j:
            self._total += hi - lo
            los.insert(i, lo)
            his.insert(i, hi)
            return
        self._total += hi - lo - sum(his[k] - los[k] for k in range(i, j))
        new_lo = min(lo, los[i])
        new_hi = max(hi, his[j-1])
        los[i:j] = [new_lo]
        his[i:j] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_right(his, lo)
        j = bisect.bisect_left(los, hi)
        if i == j:
            return
        self._total -= sum(his[k] - los[k] for k in range(i, j))
        pieces_lo, pieces_hi = [], []
        l0, h0 = los[i], his[i]
        if l0 < lo:
            self._total += lo - l0
            pieces_lo.append(l0); pieces_hi.append(lo)
        h1 = his[j-1]
        if h1 > hi:
            self._total += h1 - hi
            pieces_lo.append(hi); pieces_hi.append(h1)
        los[i:j] = pieces_lo
        his[i:j] = pieces_hi
```

remove total: removed length = sum of overlaps with [lo,hi). For candidates: overlap = min(hi_k, hi) - max(lo_k, lo). I computed via pieces: original total of candidates minus pieces. Let me recompute: removal reduces total by overlap amount. For left piece: interval [l0, h0) overlaps with removed [max(l0,lo), min(h0,hi)) = [lo, min(h0,hi)) since h0 > lo and l0 < hi. Overlap = min(h0,hi) - lo = h0 - lo if h0 <= hi... hmm my piece computation: left piece [l0, lo) kept, amount lost = h0 - lo if h0 < hi? No—h0 could exceed hi. Let me just do: total lost = sum over k in [i,j) of min(hi, h_k) - max(lo, l_k). Simpler to compute directly:

self._total -= sum(min(hi, his[k]) - max(lo, los[k]) for k in range(i,j))

But candidates: i = bisect_right(his, lo) → first k with h_k > lo, so h_k > lo and overlap with lo side: max(lo, l_k). j = first with l_k >= hi, so candidates have l_k < hi. Overlap = min(hi, h_k) - max(lo, l_k), positive since h_k > lo and l_k < hi... need min > max: min(hi,h_k) > max(lo,l_k)? h_k > lo and hi > l_k (since l_k < hi). min(hi, h_k) - max(lo, l_k) > 0. Yes.

So:

```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect.bisect_right(his, lo)
        j = bisect.bisect_left(los, hi)
        if i >= j:
            return
        self._total -= sum(min(hi, his[k]) - max(lo, los[k]) for k in range(i, j))
        pieces = []
        l0, h0 = los[i], his[i]
        if l0 < lo:
            pieces.append((l0, lo))
        h1 = his[j-1]
        if h1 > hi:
            pieces.append((hi, h1))
        los[i:j] = [p[0] for p in pieces]
        his[i:j] = [p[1] for p in pieces]
```

contains:

```python
    def contains(self, x):
        i = bisect.bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x
```

Wait bisect_right(_lo, x) - 1 gives largest index with lo <= x. Check hi > x.

total_length returns self._total. Initially it's 0 int; adding lengths gives int or float appropriately. Fine.

Also `__init__` with optional nothing.

Check add merge count correctness with total: subtracting removed intervals' lengths and adding hi-lo, net = hi-lo - overlaps. Correct.

Edge in add: i == j insertion — verified j >= i, and insert index i correct? Interval at i (if exists) has... if i == j, no merge candidates. Insertion point: interval i (pre-insertion) has either hi_i < lo (if i == i.e., i beyond... hmm). Insert should keep sorted: interval i-1 must have hi <= lo, interval i must have lo >= hi. Case i == len: insert at end, fine. If i < len: his[i] >= lo (definition of i)... wait i = bisect_left(his, lo) → his[i] >= lo. If i == j < len: los[i] > hi and los[i] >= his[i]... no, los[i] < his[i], so los[i] > hi doesn't follow. Hmm: i == j means interval i has l_i > hi (from j definition: los[i] > hi) OR i == len. Also his[i] >= lo. Insert at i: previous interval i-1 has hi_{i-1} < lo ✓ (since i is bisect_left on his, his[i-1] < lo). Next interval i has lo_i > hi ✓. Sorted maintained. Good.

Check bisect behavior with mixed int/float comparisons — fine.

Done. Write final code.