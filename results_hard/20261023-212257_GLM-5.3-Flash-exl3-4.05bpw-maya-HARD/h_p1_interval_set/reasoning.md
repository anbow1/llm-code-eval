Need bisect-based sorted list of intervals. add: merge overlapping/touching. remove: split.

Implementation: keep two parallel lists `starts` and `ends`, or list of [lo,hi]. Use bisect on starts.

add(lo, hi): find all intervals overlapping or touching: those with end >= lo and start <= hi. Use bisect to find left index: first interval with end >= lo. Since ends sorted too (disjoint sorted intervals), ends is sorted. Find lo_idx = bisect_left(ends, lo); hi_idx = bisect_right(starts, hi). New merged interval: (min(lo, starts[lo_idx] if lo_idx < len else inf), max(hi, ends[hi_idx-1])). Replace range.

Wait touching merge: interval [1,3) and add [3,5): starts[?] <= hi → interval with start 3 <= 5 included, end 3 >= lo=3? bisect_left(ends, 3) gives index of end 3, yes included. Merged end = max(5, 3) = 5. Good.

But careful: bisect_left(ends, lo) — if end == lo exactly, that interval touches at lo... interval [a, lo) and add [lo, hi): merged to [a, hi). bisect_left(ends, lo) finds end == lo at index i, included. Good. If end < lo, excluded. Good.

Right side: bisect_right(starts, hi) — interval [hi, b): start == hi, excluded (touching at hi from outside: [lo,hi) added, existing [hi,b) — they touch but shouldn't merge? [lo,hi)+[hi,b) → merged? Touching intervals merge per spec ([1,3)+[3,5) → [(1,5)]). So [lo,hi) and [hi,b) should merge to [lo,b). Hmm, but the added interval [lo,hi) doesn't include hi. The merge criterion: intervals whose union is a single interval. [lo,hi) ∪ [hi,b) = [lo,b) — yes that's contiguous, should merge. But with bisect_right(starts, hi), start == hi is excluded. Then result would be [lo,hi) and [hi,b) as separate — but intervals() requires touching merged. However add is the only way they'd get adjacent... Actually add([3,5]) then add([5,7]) — spec says touching merged. So need to include start == hi: use bisect_right(starts, hi) but check if interval starts exactly at hi... hmm.

Wait but if start == hi and we include it, merged end = max(hi, b) = b. Correct: [lo, b). But does including start == hi wrongly merge when...? If start == hi, the existing interval [hi, b) and added [lo, hi) — union [lo, b) since [lo,hi) contains points approaching hi. Actually is [lo,hi) ∪ [hi,b) = [lo,b)? Yes, every x in [lo,b) is in one of them. So merge. So use bisect_right for start <= hi? No: interval with start == hi should be merged. So condition start <= hi means include start == hi → bisect_right(starts, hi). But wait, what about added [lo,hi) and existing [hi,b)? bisect_right includes start==hi. Merged end = max(hi, b) = b, merged start = min(lo, ...). Correct.

But hmm, is that always correct? If added interval is [lo,hi) and existing starts at hi: union is [lo, b) — yes since [lo,hi) covers up to but not including hi, and [hi,b) covers hi onward. Together [lo,b). Correct.

So: lo_idx = bisect_left(ends, lo); hi_idx = bisect_right(starts, hi). If lo_idx >= hi_idx: no overlap, insert [lo,hi] at position lo_idx. Else merged = [min(lo, starts[lo_idx]), max(hi, ends[hi_idx-1])], replace slice [lo_idx:hi_idx] with merged.

Wait: does slice [lo_idx:hi_idx] capture all overlapping? Ends sorted, starts sorted. Intervals with end >= lo start at lo_idx. Intervals with start <= hi are indices < hi_idx. Overlapping/touching ones are those satisfying both, and since sorted disjoint, they form contiguous range [lo_idx, hi_idx). Check: any interval in [lo_idx, hi_idx) overlaps/touches? It has end >= lo and start <= hi. With disjoint sorted intervals, end >= lo and start <= hi means they intersect or touch. Yes. And intervals outside: index < lo_idx has end < lo (no overlap, no touch since end < lo means gap). Index >= hi_idx has start > hi — gap or touch? start > hi means gap (since added excludes hi). Good.

But wait — end < lo means interval [a, b) with b < lo... b <= lo, but b < lo strictly (bisect_left excludes end == lo). end == lo is touching and included. Good. Start > hi: gap (hi, start). Fine.

Hmm, but wait: should [1,3) and add [3,5) merge? ends bisect_left(ends, 3) → finds end 3 at index 0. starts bisect_right(starts, 5) → start 3 <= 5, included. Merged [1,5). Matches spec.

Edge: add [3,5) when [5,7) exists: lo_idx = bisect_left(ends,3) → index of [5,7) end=7 → 1. hi_idx = bisect_right(starts,5) → starts [5], start 5 <= 5 → index 1. lo_idx=1 >= hi_idx=1 → insert at 1. Result [[3,5],[5,7]] — touching but not merged! Bug. Need: if lo_idx == hi_idx, check neighbors: if lo_idx > 0 and ends[lo_idx-1] == lo → merge left; if lo_idx < len and starts[lo_idx] == hi → merge right. But ends[lo_idx-1] < lo always (bisect_left), so ends[lo_idx-1] == lo possible when end == lo? No — bisect_left(ends, lo) gives first index with end >= lo; end == lo would be included in overlap case... wait if end == lo then bisect_left returns that index, and start of that interval < end = lo <= hi, so start <= hi, so hi_idx > lo_idx. So it's in overlap case. So lo_idx == hi_idx implies ends[lo_idx-1] < lo strictly. Only right neighbor can touch: starts[lo_idx] == hi. Then merge with it: replace with [lo, ends[lo_idx]].

Actually can both happen simultaneously when no overlap? lo_idx==hi_idx, ends[lo_idx-1] < lo and starts[hi_idx]... starts[hi_idx] > hi or == hi. If == hi, merge right. Can't merge left. So just:

```
if lo_idx >= hi_idx:
    if lo_idx < n and starts[lo_idx] == hi:
        starts[lo_idx] = lo  # extend left; end stays
    else:
        insert
```

Wait merging [lo,hi) with [hi,b) → [lo,b): set starts[i] = lo. Yes.

remove(lo, hi): find intervals overlapping: lo_idx = bisect_right(ends, lo) → first end > lo (end == lo: [a, lo) doesn't overlap [lo,hi)). Use bisect_right(ends, lo). hi_idx = bisect_left(starts, hi) → intervals with start < hi. Overlapping: [lo_idx, hi_idx). For each: pieces. Left piece if starts[i] < lo: [starts[i], lo). Right piece if ends[i] > hi: [hi, ends[i]). Replace slice with collected pieces.

Wait bisect_right(ends, lo): end == lo excluded — correct, [a,lo) ∩ [lo,hi) = ∅. start < hi: bisect_left(starts, hi) — start == hi excluded, correct since [hi,b) ∩ [lo,hi)=∅.

contains(x): i = bisect_right(starts, x) - 1; return i >= 0 and ends[i] > x. Check: start <= x, end > x. Correct for half-open.

Use two lists starts, ends for bisect performance. For __len__, track count.

intervals(): list(zip(starts, ends)).

total_length(): maintain running sum, update on add/remove. Or compute sum on demand — with 60k intervals fine, but keep incremental.

Insertion into Python list is O(n) but 60k inserts fine.

Implementation:

```python
import bisect

class IntervalSet:
    __slots__ = ("_starts", "_ends", "_length")

    def __init__(self):
        self._starts = []
        self._ends = []
        self._length = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        lo_idx = bisect.bisect_left(ends, lo)
        hi_idx = bisect.bisect_right(starts, hi)
        if lo_idx >= hi_idx:
            if lo_idx < len(starts) and starts[lo_idx] == hi:
                self._length += hi - lo
                starts[lo_idx] = lo
            else:
                self._length += hi - lo
                starts.insert(lo_idx, lo)
                ends.insert(lo_idx, hi)
            return
        new_lo = starts[lo_idx] if starts[lo_idx] < lo else lo
        new_hi = ends[hi_idx - 1] if ends[hi_idx - 1] > hi else hi
        self._length += (hi - lo) - (sum(ends[i]-starts[i] for i in range(lo_idx, hi_idx)))
        starts[lo_idx:hi_idx] = [new_lo]
        ends[lo_idx:hi_idx] = [new_hi]
```

Simpler for length: recompute removed lengths via sum, or just recompute total? Keep incremental with sum over removed slice (fine).

remove:

```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        starts, ends = self._starts, self._ends
        lo_idx = bisect.bisect_right(ends, lo)
        hi_idx = bisect.bisect_left(starts, hi)
        if lo_idx >= hi_idx:
            return
        removed = 0
        pieces = []
        for i in range(lo_idx, hi_idx):
            s, e = starts[i], ends[i]
            removed += e - s
            if s < lo:
                pieces.append((s, lo))
            if e > hi:
                pieces.append((hi, e))
        self._length -= removed
        starts[lo_idx:hi_idx] = [p[0] for p in pieces]
        ends[lo_idx:hi_idx] = [p[1] for p in pieces]
```

contains, total_length, intervals, __len__ straightforward.

Edge in add overlap-length computation: self._length += (hi-lo) - sum of existing overlapping lengths. Fine.

One more check for add when lo_idx==hi_idx and touching-left: ends[lo_idx-1] == lo — impossible as argued since bisect_left would have included it. Actually could lo_idx==hi_idx and ends[lo_idx-1]==lo? ends[lo_idx-1] < lo by bisect_left (strictly). Right. And starts[hi_idx] == hi handled. Good.

Check add where new interval sits between two touching? e.g. existing [1,3) and [5,7), add [3,5): lo_idx = bisect_left(ends,3): ends=[3,7] → 0. hi_idx = bisect_right(starts,5): starts=[1,5] → 2. Overlap range [0,2): merged [1,7). Good.

add [0,1) with existing [1,3): lo_idx = bisect_left([3],0)=0, hi_idx=bisect_right([1],1)=1. Overlap: [0,1) merged with [1,3) → [0,3). Correct per touching-merge rule? [0,1)∪[1,3)=[0,3). Yes.

Done. Write final code.