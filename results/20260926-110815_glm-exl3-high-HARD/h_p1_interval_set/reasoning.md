Implement IntervalSet using a sorted list of intervals. With 60,000 adds, naive bisect insert with O(n) list insert is 60000 * list shifts — list.insert is fast C-level, fine. 60k inserts into a list, each shifting up to 60k elements is ~ 1.8e9 element moves worst case but memmove is fast; typically OK. But to be safe, could use a SkipList or just bisect+list. memmove of 60k pointers ~ fast enough (each insert ~ up to 60k*8 bytes = 480KB move; 60k inserts → up to ~29GB moved worst case... too slow?). Actually memmove at ~10GB/s → 3 seconds worst case. Random order insertion shifts average n/2 = 30k elements, 60000*30000*8 bytes = 14.4 GB → ~1.5-3s. Risky. Better to keep the list but note that each add's merge typically reduces count. Hmm.

Alternative: use a simple sorted list with bisect. The performance requirement: "well under 5 seconds". Let's estimate: inserting into Python list via list.insert(i, item) — C memmove. 60k inserts at 300k avg shift... 60000 * 30000 elements * 8 bytes = 14.4 GB of memcpy. At ~20GB/s, <1s. Probably fine. But bisect and merging in Python take 60000 * small ops. Actually total ops ~ 60k * (log n + memmove). Probably ~1 second. Acceptable.

But could be safer: since we might do many merges, intervals list length stays smaller. Random small disjoint intervals won't merge. Worst case is fine.

Implementation:

Use bisect on a list of intervals. Store as parallel lists? Simpler: keep list of [lo, hi] lists, and a separate keys list for bisect? bisect works with list of tuples comparing tuples, but inserting merged... Use bisect with key: Python 3.10+ bisect supports key parameter. Use bisect_right(self.los, hi) style with parallel lists? Parallel lists require two inserts. Simpler: keep list of tuples, bisect on tuple (lo,) ... tuples compare lexicographically fine since intervals are disjoint and sorted, (lo, hi) tuples sorted by lo primarily; bisect with tuples: to find positions, use bisect_right(intervals, (lo, ...)) — need care because (lo, hi) with arbitrary hi. Use key-less approach: maintain separate list `starts` and `ends`, bisect on starts (plain list of numbers).

Methods:

add(lo, hi):
- if lo >= hi: return
- Use bisect to find range of intervals overlapping or touching [lo, hi). Touching: interval with start == hi or end == lo should merge. Find leftmost index where interval's end >= lo (i.e., end >= lo means touching/overlap → merge), and rightmost where start <= hi (start <= hi means overlap or start==hi touching). Since intervals sorted and disjoint, we can use bisect on sorted ends? Ends also sorted? For disjoint sorted intervals with gap>0, ends are sorted too (end_i < start_{i+1} <= end_{i+1}... actually end_i <= start_{i+1} < end_{i+1}, yes ends increasing). But we only keep starts list? Keep both lists: starts[], ends[] parallel.

i = bisect_left(ends, lo) — first interval with end >= lo. But touching: interval with end == lo should merge → merge condition end >= lo. So first idx with end >= lo: bisect_left(ends, lo).
j = first index with start > hi: bisect_right(starts, hi)? touching interval with start == hi merges; start > hi doesn't. j = bisect_right(starts, hi).
If i < j? Intervals i..j-1 overlap or touch. New merged interval: (min(lo, starts[i]) if i<j else lo, max(hi, ends[j-1]) if j>i else hi).
If i == j: no interval touches; insert starts.insert(i, lo), ends.insert(i, hi). Wait if i==j, then interval i has end < lo and start > hi. Insert at position i.
Else: new_lo = min(lo, starts[i]), new_hi = max(hi, ends[j-1]). Delete starts[i:j], ends[i:j], insert new. Then starts.insert(i, new_lo), ends.insert(i, new_hi). Also need check intervals between i and j but adjacent? Since intervals sorted and disjoint with gaps >=0... wait gap could be 0? No — merged intervals never touch: after add, we merge touching. But could ends be unsorted? ends[i] < starts[i+1]? Not guaranteed—intervals within list are disjoint and sorted by start, and never touching: for disjoint half-open intervals, if end_i >= start_{i+1}, they'd overlap, impossible since we merge on add/remove... Actually remove can create intervals ending exactly where removed region begins and starting where it ends: removing [3,5) from [1,10) gives [1,3) and [5,10). start of second = 5 = hi of removed. No touching between stored intervals: [1,3) and [5,10) have gap. Could stored intervals ever touch (end_i == start_{i+1})? Only if we created them that way. Remove creates end_i = removal.lo and start_{i+1} = removal.hi with removal.lo < removal.hi, so gap. So ends strictly sorted as long as intervals disjoint and sorted with end_i <= start_{i+1}: ends increasing? end_i <= start_{i+1} <= end_{i+1}, and end_{i+1} > start_{i+1} >= end_i if interval nonempty. So ends strictly increasing. Good for bisect.

remove(lo, hi):
- if lo >= hi return
- i = first interval with end > lo (bisect_right(ends, lo)) — intervals with end <= lo unaffected... actually interval with end == lo: overlap requires end > lo. i = bisect_right(ends, lo).
- j = first interval with start >= hi (bisect_left(starts, hi)) — intervals with start >= hi unaffected.
- For k in i..j-1: they overlap. Split: left piece if starts[k] < lo; right piece if ends[k] > hi.
- Replace range i..j-1 with pieces: lefts = [starts[k], lo) for those k where starts[k] < lo; rights = [hi, ends[k]) where ends[k] > hi. Since intervals in range are sorted, lefts come before rights. But lefts from k=i..j-1: only the first k can have starts[k] < lo? No—starts of consecutive overlapping intervals could multiple be < lo. E.g., intervals [1,2),[2,3) can't exist (merged/touching). So at most one interval contains lo in its interior? Interval containing lo: at most one k with starts[k] <= lo < ends[k]. Multiple intervals in [i, j) could have starts < lo? starts sorted, ends sorted, disjoint: interval i-1 ends <= starts[i]. If lo is inside interval i's span, starts[i] <= lo < ends[i]. Another interval k in range with starts[k] < lo: starts[k] <= lo means lo in [starts[k], ends[k])? Not necessarily; but disjointness: only one interval contains lo (if lo < ends[k] for one). So at most one interval with lo within; intervals before it have end <= lo... wait intervals in range i..j-1 have end > lo (from bisect_right on ends) and start < hi. Multiple intervals could have start < lo but then lo would... interval with start < lo and end > lo contains lo. Only one such interval per disjoint set. So exactly at most one interval in range has starts < lo. Hmm but intervals in range with start < lo: interval i (first with end > lo). Could interval i+1 also have start < lo? Then lo in [starts[i+1], ends[i+1])? lo >= ... starts[i+1] < lo, need ends[i+1] > lo — yes since i+1 in range means ends[i+1] > lo. And starts[i+1] <= lo → lo in [starts[i+1], ends[i+1]) contains lo. Also interval i: ends[i] > lo and ends[i] <= starts[i+1] < lo contradiction since starts[i+1] < lo and ends[i] > lo with ends[i] <= starts[i+1] gives ends[i] <= starts[i+1] < lo, contradicting ends[i] > lo. So starts[i+1] >= lo. Hence at most interval i has starts < lo. Good.

So: pieces = []
if i < j:
  if starts[i] < lo: pieces.append((starts[i], lo))
  if ends[j-1] > hi: pieces.append((hi, ends[j-1]))
  del starts[i:j]; del ends[i:j]
  insert pieces at i.

Careful: pieces order: left piece then right piece — left has lo < right's hi. Fine.

contains(x):
- idx = bisect_right(starts, x) - 1 → interval index with largest start <= x... then need ends[idx] > x. But careful: bisect_right(starts, x) gives first index with start > x; idx = that -1; if idx >= 0 and ends[idx] > x: True.

Wait: is that correct with touching merged? If x == ends[idx], not contained. Good.

total_length: sum(hi - lo) — maintain cached total or recompute. Recompute O(n) fine; calls count small. Just compute.

__len__: len(starts).

intervals(): return list of tuples.

Also maintain consistency: after add merging, ensure no touching intervals. Add merges touching intervals correctly: i = bisect_left(ends, lo) — first end >= lo, e.g., end == lo → merge (touching). j = bisect_right(starts, hi) — first start > hi; start == hi merges. Correct.

But wait in add, intervals in range [i, j): they overlap or touch [lo,hi). Merging all into one: new_lo = min(lo, starts[i]), new_hi = max(hi, ends[j-1]). Correct.

Edge in add when i == j: insert at i. Correct.

Also handle floats/ints mixed — fine.

Code:

from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_starts", "_ends")

    def __init__(self):
        self._starts = []
        self._ends = []

    def add(self, lo, hi):
        if lo >= hi: return
        starts, ends = self._starts, self._ends
        i = bisect_left(ends, lo)
        j = bisect_right(starts, hi)
        if i == j:
            starts.insert(i, lo); ends.insert(i, hi); return
        new_lo = lo if lo < starts[i] else starts[i]
        new_hi = hi if hi > ends[j-1] else ends[j-1]
        del starts[i:j]; del ends[i:j]
        starts.insert(i, new_lo); ends.insert(i, new_hi)

    def remove(self, lo, hi):
        if lo >= hi: return
        starts, ends = self._starts, self._ends
        i = bisect_right(ends, lo)
        j = bisect_left(starts, hi)
        if i >= j: return
        pieces = []
        if starts[i] < lo: pieces.append((starts[i], lo))
        if ends[j-1] > hi: pieces.append((hi, ends[j-1]))
        del starts[i:j]; del ends[i:j]
        for k, (a, b) in enumerate(pieces):
            starts.insert(i+k, a); ends.insert(i+k, b)

    def contains(self, x):
        idx = bisect_right(self._starts, x) - 1
        return idx >= 0 and self._ends[idx] > x

    def total_length(self):
        return sum(hi - lo for lo, hi in zip(self._starts, self._ends))

    def intervals(self):
        return list(zip(self._starts, self._ends))

    def __len__(self):
        return len(self._starts)

intervals returns list of tuples — zip gives tuples; fine. Should return fresh list each call? "list[tuple]" — ok.

One subtlety: remove pieces order — left then right — left (starts,lo), right (hi,end): left's lo < right's hi since lo < hi. Sorted fine.

total_length each time O(n) — spec only says contains O(log n). Fine.