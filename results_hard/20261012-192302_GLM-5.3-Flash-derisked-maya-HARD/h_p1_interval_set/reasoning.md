Write a sorted list of disjoint intervals with bisect-based insertion. Use a sorted list of [lo, hi]. add: find range of overlapping/touching intervals and merge. remove: similar, possibly split.

Implementation:

- self._intervals: list of [lo, hi] sorted, disjoint, non-touching.
- Use bisect with key? In Python 3.11, bisect doesn't support key until 3.10 actually key param added in 3.10. But simpler: store two parallel lists? Or store tuples and use bisect on list of tuples — bisect works with tuples comparing lexicographically. We need to find where lo fits. Use bisect_right(self._intervals, (lo,)) ... hmm tuples: (lo, hi) vs (lo, inf). To find intervals possibly overlapping [lo, hi):

intervals are [a,b). Overlap/touch if a < hi and b > lo (touching: b == lo or a == hi counts as touching for merge).

Find index i = bisect_left(intervals, (lo, ...))? Let's think: intervals sorted by lo. Find first interval with hi >= lo (could touch). Since intervals sorted by lo and disjoint, hi's also sorted? Disjoint non-touching intervals sorted by lo: yes, hi values are strictly increasing. So we can use bisect on (lo, hi) pairs.

Approach: use bisect_right(self._intervals, (lo, float('inf'))) to find the first interval whose (lo,hi) > (lo, inf), i.e., all intervals with lo <= lo... hmm.

Simpler: maintain parallel approach — store list of tuples. Define:

def _find(self, lo): return index of first interval with hi > lo? Not directly bisectable unless we use bisect with (lo, inf): bisect_right(intervals, (lo, inf)) gives first index where interval tuple > (lo, inf), i.e., lo' > lo or (lo'==lo and hi'... > inf impossible) — so it's first interval with lo' > lo. Hmm that gives count of intervals with lo <= lo.

Alternative common approach: find start = bisect_right(intervals, (lo, hi))? Let's just carefully design add:

add(lo, hi):
- if lo >= hi: return
- Find left index: first interval that could merge, i.e., with hi >= lo (touching or overlapping). Intervals before it have hi < lo (strictly, since non-touching means hi < lo for gap; touching hi == lo would have been merged... actually touching intervals are merged so hi < lo for previous intervals). Since his are increasing, first interval with hi >= lo: bisect on second element? Can't bisect directly on second element with tuples unless we use key. Python 3.11 bisect supports key parameter! bisect.bisect_right(list, x, key=...) exists in 3.10+. So use key=lambda iv: iv[1]... but bisect with key requires x to be the key value: bisect_left(a, x, key=f) compares f(element) with x. Yes.

So:
start = bisect_left(self._iv, lo, key=lambda iv: iv[1])  # first interval with hi >= lo
end = bisect_right(self._iv, hi, key=lambda iv: iv[0])   # first interval with lo > hi

Intervals[start:end] overlap or touch [lo, hi). Then:
- new_lo = min(lo, intervals[start][0]) if start < end else lo
- new_hi = max(hi, intervals[end-1][1]) if start < end else hi
- replace slice with [new_lo, new_hi].

For remove:
start = bisect_left(...) same (first hi >= lo), end = bisect_right(...) (first lo > hi).
Intervals in [start:end] intersect. Edge cases:
- If interval at start partially overlaps: its hi > lo and its lo < lo. After removal, if its lo < lo, keep [iv_lo, lo). Then if its hi > hi... etc.

Handle:
if start < end:
  left_piece = intervals[start][0] < lo ? (intervals[start][0], lo) : None
  right_piece = intervals[end-1][1] > hi ? (hi, intervals[end-1][1]) : None
  Replace slice with pieces (filtering None), careful: if start==end-1 (single interval), left piece ends at lo, right starts at hi — fine since lo<hi. If multiple intervals, left comes from first, right from last — left lo < lo < hi < right, ordering fine.

Wait, but for remove, "touching" intervals: first interval with hi >= lo — if hi == lo, it doesn't intersect (half-open [a, lo) doesn't contain lo). Including it in the slice is fine for remove as long as we compute pieces correctly: left_piece condition intervals[start][0] < lo — if hi==lo and lo' < lo... interval [a, lo) with a < lo: it's entirely before the removal range? [a, lo) intersect [lo, hi) is empty. left_piece = (a, lo) — that's the same interval, keeping it unchanged. And end: bisect_right with lo > hi — intervals with lo == hi don't exist (lo<hi always). An interval with lo == hi doesn't intersect and lo == hi is not > hi, so it'd be included in slice — but lo == hi impossible. An interval [hi, b): lo == hi, doesn't intersect [lo,hi)? [hi, b) intersect [lo, hi) = empty since hi not included. bisect_right gives first lo > hi, so [hi, b) is included in slice. right_piece = hi > hi? No, condition intervals[end-1][1] > hi — b > hi could be true, giving right_piece = (hi, b) — same interval, unchanged. But wait, left_piece and right_piece: if the slice includes [a, lo) (touching at lo, no intersection) and [hi, b), we'd keep them but might split incorrectly? Let's check: slice = intervals[start:end]. Suppose intervals: [1,3), [5,7), remove [3,5). start = first hi >= 3: [1,3) has hi=3>=3, start=0. end = first lo > 5: [5,7) lo=5 not >5, included; next maybe none. end=2. left_piece = (1,3) since 1<3. right_piece: last interval [5,7), hi=7>5 → (5,7). Replace slice with [(1,3),(5,7)] — same. Fine.

But problem: if left_piece interval is actually unchanged and there's a middle... e.g., intervals [1,3),[4,6), remove [3,5): start=0 ([1,3) hi=3>=3), end= first lo>5 → [4,6) lo=4, included. Slice = both. left_piece = (1,3) (1<3). right_piece = (5,6) (6>5). Result [(1,3),(5,6)]. Correct.

Another: intervals [2,4), remove [1,3): start=0, end= first lo>3 = none... slice=[(2,4)]. left_piece: 2<1? No. right_piece: 4>3 → (3,4). Result [(3,4)]. Correct.

Single interval fully covering: [1,10), remove [3,5): left (1,3), right (5,10). Correct.

Now potential issue with touching in add: add merges touching intervals, so kept list has no touching. In remove, we might create touching? No—remove only removes. But left_piece (a, lo) and the slice replacement: intervals before start have hi < lo... wait start is first with hi >= lo; previous has hi < lo, so gap. Good.

But careful: in add, start via bisect_left on hi >= lo includes touching at lo (hi == lo), which merge correctly. end via bisect_right on lo > hi includes touching at hi (lo == hi), merges correctly. 

Edge: in add, slice [start:end] where start could be > end? No, start <= end always? start = first index with iv[1] >= lo; end = first index with iv[0] > hi. Since lo < hi, and... could start > end? That would mean interval(s) with hi >= lo all come after intervals with lo > hi — impossible for a common index? Hmm, consider empty list: start=0, end=0. Consider intervals=[(5,6)], add(1,2): start = bisect_left(key=hi): 6>=1 → 0. end = bisect_right(key=lo): 5>2 → 1. start<end, fine. Could start > end ever? Need first hi>=lo index > first lo>hi index. If index j has lo_j > hi, then for that interval hi_j > lo_j > hi > lo, so hi_j >= lo, meaning start <= j. So start <= end always... actually start <= j where j is first with lo>hi? We need start <= end: at index end (if exists), hi_end > lo_end... hi_end > lo_end > hi > lo, so hi_end >= lo, so start <= end. Yes.

So add: 
```python
start = bisect_left(iv, lo, key=lambda t: t[1])
end = bisect_right(iv, hi, key=lambda t: t[0])
if start < end:
    lo = min(lo, iv[start][0])
    hi = max(hi, iv[end-1][1])
iv[start:end] = [(lo, hi)]
```
Wait if start==end, we insert at start. Good.

remove:
```python
if lo >= hi: return
start = bisect_left(iv, lo, key=lambda t: t[1])
end = bisect_right(iv, hi, key=lambda t: t[0])
if start >= end: return
pieces = []
if iv[start][0] < lo:
    pieces.append((iv[start][0], lo))
if iv[end-1][1] > hi:
    pieces.append((hi, iv[end-1][1]))
iv[start:end] = pieces
```
Check overlapping left/right when single interval and pieces both exist: (a, lo) and (hi, b) with a<lo<hi<b. Good.

contains(x): O(log n). Find candidate: interval with lo <= x. Use bisect_right(iv, x, key=lambda t: t[0]) - 1; check that interval's hi > x. Wait: intervals with lo <= x — the last such interval. idx = bisect_right(iv, (x, inf))? With key: bisect_right(iv, x, key=lambda t: t[0]) gives first index with lo > x. idx = that - 1. If idx >= 0 and iv[idx][1] > x: True. But careful: touching intervals merged, so an interval [a,b) with a <= x: since intervals are half-open, x in it iff b > x. But could the interval with lo <= x have hi <= x and the next interval contain x? Next has lo > x, so no. Correct. Edge: float equality with ints — fine since exact values.

Actually simpler without key: bisect_right(iv, (x, float('inf'))) — comparing tuple (x, inf) with (lo, hi): (lo,hi) <= (x,inf) iff lo < x or (lo==x and hi <= inf always true). So bisect_right with (x, inf) gives first index with lo > x. Same as key version. Either works. Use key version (3.11 fine). Actually tuple comparison: (lo, hi) > (x, inf) iff lo > x or (lo == x and hi > inf → never). So bisect_right((x, inf)) = count of lo <= x. Same. I'll use key to avoid inf issues with... inf works for floats and ints comparison fine. Either way. Use key.

total_length: sum(hi - lo).

intervals(): return list of tuples (already stored as tuples).

__len__: len(self._iv).

Performance: add with slice assignment — 60k adds each O(n) worst for slice shifts but slice assignment shifting is O(n) memmove, fine. bisect O(log n). Total well under 5s.

One concern: bisect with key has some overhead but fine.

Note: bisect_left(iv, lo, key=lambda t: t[1]) — bisect with key: x is compared against key(element). bisect_left finds first index where key(iv[idx]) >= lo. Yes.

Write final code.

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ("_iv",)

    def __init__(self):
        self._iv = []  # sorted list of (lo, hi) tuples, disjoint, non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        iv = self._iv
        start = bisect_left(iv, lo, key=lambda t: t[1])
        end = bisect_right(iv, hi, key=lambda t: t[0])
        if start < end:
            if iv[start][0] < lo:
                lo = iv[start][0]
            if iv[end - 1][1] > hi:
                hi = iv[end - 1][1]
        iv[start:end] = [(lo, hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        iv = self._iv
        start = bisect_left(iv, lo, key=lambda t: t[1])
        end = bisect_right(iv, hi, key=lambda t: t[0])
        if start >= end:
            return
        pieces = []
        first = iv[start]
        if first[0] < lo:
            pieces.append((first[0], lo))
        last = iv[end - 1]
        if last[1] > hi:
            pieces.append((hi, last[1]))
        iv[start:end] = pieces

    def contains(self, x):
        iv = self._iv
        idx = bisect_right(iv, x, key=lambda t: t[0]) - 1
        return idx >= 0 and iv[idx][1] > x

    def total_length(self):
        return sum(hi - lo for lo, hi in self._iv)

    def intervals(self):
        return list(self._iv)

    def __len__(self):
        return len(self._iv)
```

Check contains correctness: bisect_right with key lo: first index with lo > x. idx points to interval with lo <= x (largest lo <= x). If that interval's hi > x, x in it. Correct since intervals disjoint.

Wait — in add, one subtlety: start computed with hi >= lo includes intervals touching at lo, e.g., existing [1,3), add [3,5): start = first with hi >= 3 → [1,3) index 0; merges to [1,5). Good. Existing [5,7), add [3,5): end = first lo > 5 → index 1 (past [5,7)? lo=5 not > 5, so included; end = 1+len). Slice includes [5,7), merge → [3,7). Good.

Also check remove when interval exactly matches: [3,5) remove [3,5): start: first hi>=3 → that interval; end: first lo>5 → past it. pieces: first[0]<3? no. last[1]>5? no. Empty slice → removed. Good.

Empty set contains: idx=-1 → False. Good.

One more: remove where start interval is entirely inside and touching-at-lo case: intervals [1,3), remove [3,4)? start = first hi >= 3 → [1,3). end = first lo > 4 → past. pieces: 1<3 → (1,3). last=iv[end-1]=[1,3), last[1]=3 > 4? No. Result [(1,3)]. Correct — [1,3) untouched.

Hmm, but what if slice includes an interval [a, lo) (touching, hi == lo) plus more intervals, and last piece: last[1] > hi where last is [hi, b) — right_piece (hi, b) same interval. But what if last interval is [hi, b) and also there are intervals in between fully removed — fine.

Tricky: left piece when first interval in slice is touching at lo but last piece comes from a different interval — order: pieces = [(a, lo), (hi, b)] with a < lo < hi < b... but if first interval is [a, lo) touching, then remaining intervals have lo >= lo... anyway a < lo always for left piece. Ordering fine since left piece lo <= right piece start hi. And left piece (a,lo): a < lo <= hi < ... fine.

Wait, potential issue in remove: left piece end = lo, but what if first interval in slice is [a, lo) (touching) AND the removal doesn't actually intersect it — we keep it as-is, but then the second piece might come from last interval which could also be touching at hi. Both kept unchanged. Fine.

But subtle bug: if first interval in slice is [a, lo) touching at lo, and there are intervals after it that get fully removed — left piece (a, lo) correct. OK.

Also potential issue: in remove, first interval [a,b) with b >= lo but the interval could be entirely before, i.e., b == lo exactly (touching) — kept as left piece only if a < lo, which is true (a < b = lo). So (a, lo) — unchanged. Good.

Also: what if first interval is [a,b) with a >= lo? Then it's fully within or starts inside. a < lo false → no left piece. Good.

Done. Maybe implement __contains__ too? Not required but harmless — skip, keep minimal. Add __iter__? Not required. Keep it.