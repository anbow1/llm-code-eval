Standard implementation with sorted list and bisect. Merge on add, split on remove. Use bisect on list of lo values.

For contains in O(log n): find rightmost interval with lo <= x; check x < hi. Use bisect_right on los.

add: find position, merge overlapping/touching intervals. Use bisect to find start; walk forward merging. For 60k adds of disjoint intervals, each add touches few intervals if merging is done properly — but worst case merging could be O(n) per add if intervals chain... use bisect to find the end of range too, then slice-merge: compute new_hi = max(hi, hi of last merged interval), find affected range via bisect on los with hi as key.

Let's maintain self._los = [lo, ...] and self._his = [hi, ...] parallel lists.

add(lo, hi):
- if lo >= hi: return
- i = bisect_right(_los, lo) - 1  # candidate interval starting before lo
- if i >= 0 and _his[i] >= lo: start = i else start = i+1

Wait careful: interval i covers [los[i], his[i]) touches if his[i] >= lo. If his[i] >= lo, merge starts at i. Actually if his[i] < lo, no overlap. Also touching: his[i] == lo → merge (touching merges). Yes.

- j = bisect_left(_los, hi)  # first interval with los[j] >= hi — those don't overlap since overlap needs los < hi. Interval j has los[j] >= hi, so no overlap. Interval j-1: los[j-1] < hi and if j-1 >= start... Actually we want all intervals overlapping or containing: intervals with los < hi and hi > lo. j = bisect_left(_los, hi): intervals k < j have los[k] < hi → overlap (given his[k] > lo, i.e., k >= start... need also intervals between start and j-1 overlap? Interval k with k >= start means his[k] > lo. And k < j means los[k] < hi. Yes overlap.

Hmm but what about interval with los[k] == hi? Touching at right end: [hi, ...) — not merged since [lo,hi) and [hi,...) merge only if hi equals... wait [1,3)+[3,5) merge. That's interval k with los[k]=3=hi=lo of new? No — merging [lo,hi) with interval [hi, x): touching. bisect_left(_los, hi) gives first los >= hi, so interval with los == hi is excluded. Need to include it for merging.

Use j = bisect_right(_los, hi): intervals k < j have los[k] <= hi → overlap or touch. But interval with los[k] == hi and we merge: new_hi = max(hi, his[j-1]). Yes.

So:
- start: i = bisect_right(_los, lo) - 1. If i >= 0 and _his[i] >= lo: start = i else start = i + 1.
- end: j = bisect_right(_los, hi)  # exclusive index: intervals start..j-1 merge
- if j > start... Actually careful: intervals strictly after i whose los <= hi but don't overlap? e.g., intervals [0,1), [2,3), add [0,4). i: bisect_right(los,0)-1 = 0, his[0]=1 >= 0 → start=0. j = bisect_right(los, 4) = 2 (los=[0,2]). Merge 0..1: new_hi = max(4, 3) = 4. Good.

But case: interval [2,3), add [0,1). i = bisect_right([2],0)-1 = -1 → start=0. j = bisect_right([2], 1) = 0. end = max(j, start) = start = 0. No merge, insert interval at 0. new_lo = lo, new_hi = hi (no merged intervals since j <= start).

Merged new_lo = min(lo, _los[start]) if start < j and start < len... define: if start < j (there are overlapping intervals): first = start, last = j-1; new_lo = min(lo, _los[first])... wait los[first] could be > lo? If start == i+1 (candidate doesn't reach), then _los[start] > lo? Actually intervals after i have los > lo... not necessarily: bisect_right ensures los[i] <= lo, los[i+1] > lo. So los[start=i+1] > lo. Then overlap requires los < hi and his > lo. Interval i+1: los > lo but overlap possible if lo < his[i+1]... wait overlap needs intervals intersecting [lo,hi): interval [a,b) overlaps if a < hi and b > lo. los[i+1] could be < hi. So j computed independently: intervals k in [0, j) with los[k] <= hi... hmm bisect_right gives los[k] <= hi. Overlap condition for k > i: los[k] > lo (so b=his[k]... no). Let me re-derive.

Intervals sorted disjoint: los increasing, his = los of next effectively (after merging adjacent, his[k] <= los[k+1]). Interval [lo, hi) overlaps/touches interval k if los[k] <= hi and his[k] >= lo (touching counts). Since his[k] <= los[k+1] <= ... hmm simpler: find j = first index with los[j] > hi (bisect_right on los gives first index with los > hi? bisect_right returns insertion point after equal elements → first index with los[j] > hi). Intervals k < j have los[k] <= hi. Among these, those with his[k] >= lo overlap. Since intervals are disjoint and sorted, his[k] <= los[k+1]... For k < j: could his[k] < lo for small k? his is also increasing (disjoint, his[k] <= los[k+1] <= his[k+1]). So there's a threshold: find start = first index with his[start] >= lo. Since his sorted, start = bisect_left(_his, lo). Then intervals start..j-1 overlap-or-touch. Hmm but touching at left: interval with his == lo — merge yes (touching merge per spec). And touching at right: los == hi — merge. bisect_right(los, hi) includes los == hi. Good.

So: start = bisect_left(_his, lo), end = bisect_right(_los, hi). Intervals [start, end) overlap or touch [lo,hi). Check: his increasing? Yes since disjoint sorted: his[k] <= los[k+1] <= his[k+1]. Wait his[k] <= los[k+1]? Disjoint half-open: [0,3) and [3,5): his[0]=3 <= los[1]=3 ✓. [0,3) and [5,6): his[0]=3 <= 5 ✓. Can't have [0,5) and [3,6) since not disjoint (after merging they'd be one). So yes his sorted non-decreasing.

Then merged interval: new_lo = min(lo, _los[start]) if start < end else lo; new_hi = max(hi, _his[end-1]) if end > start else hi.

Replace: _los[start:end] = [new_lo]; _his[start:end] = [new_hi].

But if no overlap (start >= end)... e.g., add [0,1) to {[2,3)}: start = bisect_left(his=[3], 0) = 0; end = bisect_right(los=[2], 1) = 0. start=0, end=0. No intervals consumed; insert position = start? Insert at position... where? New interval lo < all los, insert at index start=0? Hmm insertion index should be such that sorted. Actually insertion index = bisect_right(_los, lo)? But start works? When start >= end, no overlap. New interval goes where? Its neighbors: intervals before start have his < lo, intervals at/after end have los >= hi... hmm end <= start means intervals 0..start-1 have his[.] < lo, and intervals end.. have los >= hi... but end <= start, interval at index end could have both? No — if end < start, interval end has los[end] >= hi and his[end] < lo — impossible since his >= los... his[end] >= los[end] >= hi > lo contradiction (hi > lo). So end >= start - ? If end < start, then interval start-1 has his < lo and intervals >= end have los >= hi; interval start-1 >= end so los[start-1] >= hi > lo but start-1 < start means his[start-1] < lo... possible? los[start-1] >= hi and his[start-1] >= los[start-1] >= hi > lo contradicts his[start-1] < lo. So end >= start? Not quite—need consistency but insert at index `start` works: hmm let's just compute insert position as start (since intervals before start have his < lo → their los <= his < lo... yes los <= his so los < lo, fine). But also could insert at end. Use pos = start if start... Actually when no overlap, start might not equal ideal insertion? If start > end (shown impossible). If start == end, insert at start: previous intervals have his < lo (los < lo ✓); following intervals index >= end: los >= hi > lo ✓ (los[end] >= hi? end = bisect_right(los, hi) means los[end] > hi). Hmm but following interval could have los between? Fine.

Also verify: when overlapping, new_lo = min(lo, los[start]). If start's his >= lo but los[start] could be > lo? bisect_left on his: first his >= lo. Interval start-1 has his < lo, and los[start] >= his[start-1]... los[start] could be > lo (gap). e.g., {[2,3)}, add [0,1): start = bisect_left([3], 0) = 0, end = bisect_right([2],1)=0 → no overlap. Good. {[1,5)}, add [2,3): start = bisect_left([5],2)=0, end = bisect_right([1],3)=1. Merge: new_lo = min(2,1)=1, new_hi = max(3,5)=5. ✓.

remove(lo, hi):
- if lo >= hi: return
- start = bisect_left(_his, lo), end = bisect_right(_los, hi)
- if start >= end: return
- Build replacement: left piece if _los[start] < lo: (los[start], lo). right piece if _his[end-1] > hi: (hi, his[end-1]).
- _los[start:end] = [], _his[start:end] = [], insert pieces at start in order. But left piece and right piece could be same interval split — both present: left (los[start], lo) and right (hi, his[end-1]) — insert left then right. Correct since start..end-1 removed.

But careful: right piece needs to come after left in sorted order: left's hi = lo <= hi < right's hi, and if left and right from same interval, los differ appropriately. If from different intervals, still sorted. ✓

contains(x): i = bisect_right(_los, x) - 1; return i >= 0 and _his[i] > x.

total_length: sum(hi-lo).

intervals: list(zip(los, his)).

len: len(los).

Performance: 60k adds of disjoint intervals, each add O(log n + k) where k = number of merged intervals. Random order small disjoint intervals — merging may chain? Disjoint intervals in random order: each add merges at most a few intervals typically (amortized fine, worst-case chain but random order → expected small). List insert/delete O(n) per op → 60k * 60k/2 element shifts = 1.8e9... that's too slow? Python list insert of a slice shift is memmove — fast (C level). 60000 inserts averaging 30000 element shifts each = 1.8e9 pointer moves via memmove ≈ under a second actually? memmove of 30k pointers (240KB) is ~fast (~10µs each?), 60k * 10µs = 0.6s. Under 5s. Probably fine. Could use gap but fine.

Actually each add of an interval does: possibly one removal of merged range (shift) and one insertion (shift). Two memmoves per add. Fine.

Write code.