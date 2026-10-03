We need a sorted interval list with bisect for O(log n) contains, and add/remove that merge touching intervals. Key detail: touching intervals must merge, but half-open [1,3) and [3,5) merge into [1,5). However, values are ints or floats — merging [1,2) and [2,3) gives [1,3). But what about [1,2) and [2.0, 3)? lo==hi comparison, merge if next.lo <= prev.hi. For floats, [1.5, 2.5) and [2.5, 3.5) merge. That's fine.

But wait — for integers, merging touching is required. For floats merging touching could be considered fine too since continuous. Requirement says touching intervals merged, so merge whenever a.lo == prev.hi (or < for overlap). Since half-open, [lo,hi) union [hi, hi2) = [lo, hi2).

Implementation: keep list of [lo, hi] sorted. Use bisect on list of lo's. Python's bisect works on lists; we need a key. We can keep parallel lists: los and his. Or use bisect with key on list of tuples (Python 3.10+ supports key). Store intervals as list of [lo, hi], and use bisect_left(intervals, lo, key=lambda iv: iv[0])? For contains, we need largest interval with lo <= x. bisect_right(los, x) - 1 using a separate los list. Keeping a separate los list adds overhead. Alternative: use key param with bisect on the intervals list: bisect_right(intervals, x, key=lambda iv: iv[0]) gives index of first interval with lo > x; then i-1 is candidate; check intervals[i-1][1] > x... but careful: if x equals a lo? x in [lo,hi) means lo <= x < hi. So find i = bisect_right(intervals, x, key=first) -> intervals[:i] have lo <= x. Candidate i-1: check hi > x.

But wait: is key-based bisect O(log n)? Yes, but key function is called O(log n) times, each cheap. Actually bisect with key calls key on midpoint elements — fine.

However for add/remove, using the key on tuples list works too. But maintaining separate los list may be faster. Let's just use a single list with key — 60,000 adds, each add involves a few bisects and list slicing operations. Should be fast enough.

Add algorithm:
- if lo >= hi: return
- i = bisect_left(intervals, lo, key=lambda iv: iv[0]) — first interval with lo_i >= lo.
- Then merge with all intervals overlapping/touching: intervals from i-1 possibly (if intervals[i-1][1] >= lo) through intervals j where lo_j <= hi (touching: lo_j == hi merges). Actually merge condition: interval [a,b) merges with [lo,hi) if a <= hi and b >= lo (touching counts since half-open). Since sorted, find range: start = first index k such that intervals[k][1] >= lo (i.e., b >= lo). Since intervals sorted and disjoint-with-merge, b values strictly increasing and lo_{k+1} >= b_k. Find k via bisect on b values? Or simpler:

Use lo-bisect: i = bisect_left(intervals, lo, key=lo). Candidate overlap start: if i > 0 and intervals[i-1][1] >= lo: start = i-1 else start = i. End: first index j >= start such that intervals[j][0] > hi (i.e., lo_j > hi; note if lo_j == hi, it touches and merges). So j = bisect_right(intervals, hi, key=lo).

Then merged interval: new_lo = min(lo, intervals[start][0]) if start < j else lo; new_hi = max(hi, intervals[j-1][1]) if j > start else hi. Replace intervals[start:j] with [new_lo, new_hi].

Careful: j computed with bisect_right over whole list — but intervals[j][0] > hi for all j' >= j always (sorted), so fine; but we should limit search? bisect_right on whole list is fine O(log n).

Edge: when start == j (no overlapping intervals), insert [lo, hi] at start. But also check: could intervals[start][0] touch? Only if start < len and lo == intervals[start][0]... no, that's covered by j: if intervals[start][0] == hi then bisect_right(...,hi,key=lo) would include it, so j > start. Good.

Also new_hi: intervals[j-1][1] might be > hi — take max. Similarly new_lo min with intervals[start][0].

Remove:
- i = bisect_left(intervals, lo, key=lo): first interval with lo_i >= lo. Start of affected: if i>0 and intervals[i-1][1] > lo (overlap, note touching doesn't matter for removal — touching boundary means removal of [hi,...) doesn't affect [lo,hi) set... removal [lo,hi) intersects [a,b) iff lo < b and a < hi). Actually if intervals[i-1][1] > lo and intervals[i-1][0] < hi... hmm let's define affected range similarly but with strict overlap: removal affects interval [a,b) if a < hi and b > lo. Find start = first k with intervals[k][1] > lo: k = bisect_right(his, lo) — but we don't have his list. Alternative: candidates begin at i-1 or i as before: if i > 0 and intervals[i-1][1] > lo: start = i-1 else start = i. End: first j with intervals[j][0] >= hi (lo_j >= hi means no overlap since need a < hi). j = bisect_left(intervals, hi, key=lo).

Affected = intervals[start:j]. For each, carve:
- left part: [a, b) with a < lo < b possibly: if a < lo: keep [a, lo]. Only the first affected interval can have a < lo.
- right part: if b > hi: keep [hi, b]; only last affected interval can have b > hi... but also middle intervals fully removed.

So: build replacement list. If j == start: nothing to do. Else:
first = intervals[start]; last = intervals[j-1].
new = []
if first[0] < lo: new.append([first[0], lo])
if last[1] > hi: new.append([hi, last[1]])
But careful when start == j-1 (single interval): both conditions apply — could produce two pieces [a, lo) and [hi, b). Good. When j-1 > start, middle intervals fully covered. But check last interval: is last[0] >= lo? Since affected requires a < hi and b > lo, and intervals between start and j-1 have a >= intervals[start].hi... fine. Also need last[0] < hi guaranteed by j = bisect_left(..., hi): intervals[j-1][0] < hi. Yes.

Also middle intervals: are they fully covered by removal (b <= hi)? intervals[j-1][1] is largest b among affected? Not necessarily—b values increasing: his are increasing since disjoint merged sorted intervals with gap: b_k <= a_{k+1} < b_{k+1}? Actually a_{k+1} >= b_k (no overlap), so b increasing. So last[1] is max. Middle intervals have b <= last[1], but need b <= hi for full removal: middle interval k < j-1 has b_k <= a_{k+1} < hi? a_{k+1} <= intervals[j-1][0] < hi... b_k <= a_{k+1} < hi. Yes fully removed. Good.

Similarly for add, new_hi = max(hi, intervals[j-1][1]) — but since j = bisect_right(...,hi), intervals[j-1][0] <= hi; intervals[j-1][1] could be > hi (containing). Fine.

Also new_lo: min(lo, intervals[start][0]) where intervals[start][0] >= lo? bisect_left gives intervals[start][0] >= lo when start == i and no left overlap. If start == i-1 with overlap, its lo < lo. So new_lo = intervals[start][0] if start < len and start<j... simpler: new_lo = min(lo, intervals[start][0]) if j > start else lo. Actually when start < j, intervals[start] exists; new_lo = intervals[start][0] (could be < lo or == lo or... could it be > lo? If start == i and intervals[i][0] <= hi (since j > start). intervals[i][0] could be > lo? No: i = bisect_left means intervals[i][0] >= lo. Could be == lo or... it's >= lo, so min(lo, ...) = min correctly, but min could be lo if intervals[start][0] > lo? intervals[start][0] >= lo always, so min = lo unless equal... wait min(lo, a) where a >= lo gives lo. Hmm that's wrong — we want merged lo = min which is lo or intervals[start][0] whichever smaller. Since a >= lo, min = lo. So new_lo = lo always when start<j? No wait — if start == i-1 (overlap case), intervals[start][0] < lo... actually intervals[i-1][0] could be anything < intervals[i][0]. intervals[i-1][0] < lo? We know intervals[i-1][1] >= lo (overlap condition). intervals[i-1][0] < intervals[i-1][1], could be >= lo? If intervals[i-1] = [lo, hi') with lo' >= lo... bisect_left(intervals, lo) = i means intervals[i-1][0] < lo. Yes, bisect_left finds first >= lo, so intervals[i-1][0] < lo. So in overlap case new_lo = intervals[start][0] < lo; else new_lo = lo. So new_lo = intervals[start][0] if start == i-1 else lo. Simplest: new_lo = min(lo, intervals[start][0]) — but as shown intervals[start][0] >= lo in non-overlap case and < lo in overlap case; min works... in non-overlap case a >= lo so min = lo. Correct. Use min/max to be safe.

Also careful: in overlap case for add, condition intervals[i-1][1] >= lo (touching merges). For remove, use > lo (touching doesn't matter, but using >= would include an interval whose b == lo, and then first[0] < lo? intervals[i-1] = [a, lo) with a < lo: first[0] < lo, we'd append [a, lo) — same as original, fine but wasteful. Using > lo avoids it.)

Wait for remove start condition: intervals[i-1][1] > lo means actual overlap (b > lo needed for intersection). Use strict.

contains(x): i = bisect_right(intervals, x, key=lambda iv: iv[0]) - 1... hmm wait bisect_right with key: finds insertion point after entries with key <= x. So intervals[:i] have lo <= x. Candidate idx = i-1; return idx >= 0 and intervals[idx][1] > x. But careful: bisect_right on list with key requires the list elements compared via key only. Yes, in 3.10+, bisect_right(a, x, key=f) uses f(a[mid]) compared with x. Good.

Performance concern: 60,000 add calls, each with list slice replacement — average O(n) shifting? Inserting into middle of list is O(n) memmove which is C-fast; 60k * 60k/2 element moves worst case = 1.8e9... but memmove of pointers is fast (~1e9/s). Small disjoint intervals in random order: each add typically merges with 0 or few intervals, replacing a small slice, but list.pop/insert shifting is O(n) memmove. Average shift ~ n/2 = 30k pointer moves per op, 60k ops → 1.8e9 pointer moves... could be ~2-4 seconds. Hmm, "well under 5 seconds". Might be borderline. Alternative: use `list[start:j] = [new]` — that's a slice assignment, which does one memmove. Same cost.

Could we do better? Options: use a skip list / balanced tree — more complex. Or accept memmove cost. 1.8e9 pointer moves at ~maybe 0.3-1 GB/s effective... memmove of 240KB (60k*8 bytes *... actually shifting half of 60k entries = 30k*16 bytes per tuple pointer? list stores pointers, 8 bytes each. 30k*8 = 240KB per op, 60k ops = 14.4 GB moved. At ~10 GB/s memcpy, ~1.4s. Plus Python overhead per op is small. Probably acceptable — "well under 5 seconds". Actually average shift: if we replace slice [start:j] with one element, list shrinks/shifts. Random insertion positions: average shift ~ n/3? For slice assignment replacing 1..few elements with 1, the shift is (j - start - 1) deletions plus insertions... Actually slice assignment computes resize and shifts tail. Average tail ~ n/2. So similar.

Hmm, but actually adds of "small disjoint intervals in random order" — each add creates a new interval somewhere among existing, shifting tail. Total ~ 60k * avg_tail(30k) = 1.8e9 pointer moves = 14GB. Modern machines: memcpy ~20 GB/s for L2/L3 resident... 240KB might exceed cache. Let's estimate ~1-2s. Fine.

But also 200,000 contains calls with bisect with key — key lambda called ~16 times per call → 3.2M lambda calls, ~0.3s. Fine.

Alternatively maintain parallel arrays los/his to avoid key overhead: bisect on los directly (no key), faster. And slice ops on both lists. Let's do parallel lists for speed. Implementation with two lists los, his:

add(lo, hi):
  if lo >= hi: return
  i = bisect_left(los, lo)
  start = i-1 if i > 0 and his[i-1] >= lo else i
  j = bisect_right(los, hi)
  if j > start:
    new_lo = min(lo, los[start]) if start < len... = lo if start==i else los[start] — just compute min(lo, los[start]) since los[start] >= lo when start==i? Wait if start == i, los[start] >= lo, min = lo. If start == i-1, los[start] < lo. So new_lo = min works.
    Actually simpler: new_lo = los[start] if start == i-1 else lo. But min is safe.
    new_hi = max(hi, his[j-1])
    los[start:j] = [new_lo]; his[start:j] = [new_hi]
  else:
    los.insert(start, lo)... but wait if j == start, no overlap; insert at start. Hmm but careful: could there be touching with interval at start (los[start] == hi)? bisect_right(los, hi) includes los[start] == hi, so j > start then. Good.

remove(lo, hi):
  if lo >= hi: return
  i = bisect_left(los, lo)
  start = i-1 if i>0 and his[i-1] > lo else i
  j = bisect_left(los, hi)
  if j == start: return
  replacement for los/his slices:
  pieces_lo, pieces_hi = [], []
  if los[start] < lo: append (los[start], lo)
  if his[j-1] > hi: append (hi, his[j-1])
  los[start:j] = pieces_lo; his[start:j] = pieces_hi

contains(x):
  i = bisect_right(los, x) - 1  # wait: bisect_right(los, x) gives first index with los[idx] > x. i-1 has los <= x. Check his[i-1] > x.
  Hmm but need largest lo <= x; bisect_right gives rightmost entry with lo <= x at index i-1. But is the containing interval necessarily the rightmost with lo <= x? Intervals are disjoint sorted; if some interval with lo <= x contains x, then no later interval has lo <= x (later los >= previous hi > x). So yes, idx = bisect_right(los, x) - 1; return idx >= 0 and x < his[idx].

intervals(): return list of tuples zip.
__len__: len(los).

Edge: could new interval in add be adjacent-merge producing touching duplicates? Handled.

Also floats like NaN? Ignore.

One subtlety: merging touching intervals like [1,3) + [3,5) → [1,5): in add, j = bisect_right(los, hi) — interval [3,5) has los=3 == hi, included → merged. Good. And left touching: interval [a,b) with b == lo, his[i-1] >= lo includes equality → merged. Good.

total_length: sum(h - lo for lo, h in zip). O(n) — fine, or maintain incrementally. Keep O(n) simple, or maintain running total. Requirement doesn't state complexity; maintain running sum for robustness? Updates change total; compute delta each time. Simpler to just compute on demand. I'll compute on demand.

Also remove when the whole interval list... fine.

One more check for add: what if i > 0 but his[i-1] < lo (gap), start = i. Also what about j: could j-1 < start but there's still... no.

Also careful in add: interval at index start==i-1 with his[i-1] == lo: touching merge; new interval = [los[i-1], max(hi, his[j-1])]. Good.

Also add case where existing interval fully contains [lo,hi): i-1 with his[i-1] >= hi; j = bisect_right(los, hi): los[i-1] < lo... hmm los[i-1] < lo < hi so bisect_right(los,hi) > i-1, includes it if los[i-1] <= hi — yes. j >= i. start = i-1. j-1 >= i-1. his[j-1] >= his[i-1] >= hi. new_hi = his[j-1]. Good.

Also the case lo >= hi ignored. Also lo could equal hi → ignore.

Negative indices guard in contains: idx >= 0 check.

Write class with __slots__ maybe.

Also remove: pieces — if start == j-1 single interval [a,b), a < lo, b > hi: both pieces → [a,lo), [hi,b). Correct split.

Also remove: j = bisect_left(los, hi): first lo >= hi. intervals from start..j-1 have los < hi (overlap) and his > lo. Correct.

Edge: remove where first affected interval has los[start] >= lo? Then no left remainder. Handled by `if los[start] < lo`.

Final code:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_los", "_his")

    def __init__(self):
        self._los = []
        self._his = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect_left(los, lo)
        if i > 0 and his[i - 1] >= lo:
            start = i - 1
        else:
            start = i
        j = bisect_right(los, hi)
        if j > start:
            new_lo = los[start] if start == i - 1 else lo
            new_hi = his[j - 1] if his[j - 1] > hi else hi
            los[start:j] = [new_lo]
            his[start:j] = [new_hi]
        else:
            los.insert(start, lo)
            his.insert(start, hi)

Wait: new_lo when start == i-1: los[start] < lo. When start == i: los[start] >= lo, so use lo. Correct. new_hi: max(hi, his[j-1]).

Hmm, but careful when start == i-1, j could equal start (j = bisect_right(los, hi) >= i > start always since los[i-1] < lo < hi ≤ hi? bisect_right(los, hi): los[i-1] < lo < hi so los[i-1] < hi → j > i-1). So in the j > start branch when start == i-1, fine.

remove:
        if lo >= hi: return
        los, his = ...
        i = bisect_left(los, lo)
        start = i - 1 if i > 0 and his[i-1] > lo else i
        j = bisect_left(los, hi)
        if j == start: return
        new_lo, new_hi = [], []
        if los[start] < lo:
            new_lo.append(los[start]); new_hi.append(lo)
        if his[j-1] > hi:
            new_lo.append(hi); new_hi.append(his[j-1])
        los[start:j] = new_lo
        his[start:j] = new_hi

contains:
        i = bisect_right(self._los, x) - 1
        return i >= 0 and x < self._his[i]

Hmm wait: bisect_right returns first index where los[idx] > x. i-1 = largest index with los <= x. Correct.

total_length: return sum(hi - lo for lo, hi in zip(...))

intervals: return list(zip(self._los, self._his))

__len__: return len(self._los)

One more subtlety: mixing ints and floats — comparisons fine. Merging [1,3) and [3.0,5.0) → [1, 5.0): keeps original values where possible; new_hi = 5.0 (original). Fine.

Also should add handle lo/hi where merging yields touching chain? Yes handled by j sweep.

Check remove when start interval begins before lo and ends exactly at... fine.

Also potential issue: remove with pieces where start==j-1 and both conditions → two pieces appended, correct order [a,lo) then [hi,b). Good.

Also remove where last affected interval has his[j-1] > hi but los[j-1] could be < lo too (single interval case) — handled. If j-1 > start, los[j-1] >= lo? los[start+1] >= his[start] > lo... his values: interval at start has his > lo, and los[start+1] >= his[start] > lo. So middle/last have los > lo, no left remainder needed except first. Good.

Done. Write final code.