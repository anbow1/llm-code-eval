Half-open intervals [lo, hi). Adding [1,3) and [3,5) merges to [1,5). So merging happens when hi == next lo. With floats, equality comparison still applies.

Implementation: sorted list of intervals with bisect. add: find overlapping/touching intervals, merge. remove: cut.

Use `bisect` on a list of (lo, hi) tuples sorted by lo. For merging: an interval [lo,hi) touches/overlaps existing [a,b) if lo <= b and hi >= a... Actually touching means hi == a or lo == b. Overlap condition for merging: not (hi < a or lo > b) i.e. hi >= a and lo <= b. But touching: [1,3) and [3,5): lo=3, b=3 → lo <= b yes, hi >= a yes → merge. Good.

add(lo,hi):
- if lo >= hi: return
- find first interval with b >= lo - epsilon? Careful with float precision; just use exact comparisons. Find leftmost interval whose hi >= lo (i.e., touching or overlapping). Since intervals sorted by lo and disjoint (with touching merged, so gaps exist), find index via bisect on lo values.

Let intervals list L of [lo, hi] pairs. Sorted by lo. Merged condition: for consecutive intervals, prev.hi < next.lo strictly.

To find all intervals that intersect-or-touch [lo, hi): they satisfy interval.hi >= lo and interval.lo <= hi. Use bisect to find the range: intervals with lo <= hi: right bound = bisect_right on lo key. Intervals with hi >= lo: since disjoint and sorted, hi is also increasing? Not necessarily monotonic? For disjoint sorted intervals, hi_i < lo_{i+1} <= hi_{i+1}, so hi is strictly increasing. Yes, hi is strictly increasing. So use a separate list of his for bisect, or just linear scan from found index. Better: maintain two lists, los and his, or a list of tuples and use key-based bisect (Python 3.10+ supports key= in bisect).

Plan:
- self._iv: list of [lo, hi] sorted.
- add: idx = bisect_left(self._iv, lo, key=lambda x: x[0])? Need intervals with lo <= hi for merging. Find start: first interval with hi >= lo. Since his strictly increasing, use bisect_left on his for value lo: start = bisect_left(his_list, lo). Intervals at index >= start have hi >= lo (touch/overlap). Then among these, take while lo_i <= hi. End index: bisect_right(los_list, hi) gives first index with lo > hi.

If start >= end: no merge; insert [lo,hi] at position start (which equals... hmm need consistent position). Insert at bisect_right of los by lo? Insert position should keep sorted: position = bisect_right(los_list, lo). If no overlaps, that should equal start? start = first index with hi >= lo. If no interval overlaps/touches, then intervals before start have hi < lo, intervals at start have lo > hi... Actually if start < len and interval start has hi >= lo but also lo > hi (no overlap), contradiction? interval.start has lo <= hi needed for overlap. If interval[start].lo > hi then no merge, insert at index start? Is start the correct sorted position? intervals before start have hi < lo ≤ ... their lo < hi < lo so lo < lo → yes lo < new lo. intervals from start onward: hi >= lo, and lo > hi ≥ lo, so lo > lo. So inserting at start keeps sorted. And start == bisect_right(los, lo)? intervals before start have lo < lo... wait their lo < their hi < lo so lo < lo strictly. intervals at start have lo > lo. So bisect_right(los_list, lo) == start. Good, consistent.

Merge case: new_lo = min(lo, iv[start][0]) — but iv[start].lo <= hi and hi >= lo; merged interval = [min(lo, iv[start].lo), max(hi, iv[end-1].hi)]. Replace slice [start:end] with merged.

Maintain parallel lists for bisect speed? Using key= in bisect on list of tuples works but key computed each call is O(log n) fine. Actually simpler: store two lists self._los and self._his plus count. Or store list of tuples and use key. bisect with key creates no issues. Performance: 60k adds, each O(log n) + slice ops. Fine.

Actually simpler to keep list of tuples and use bisect with key=lambda t: t[0] for los, and for his... bisect on hi requires key on second element: bisect_left(self._iv, lo, key=lambda t: t[1]). That works in Python 3.10+.

remove(lo, hi):
- if lo >= hi return
- find intervals overlapping strictly: interval intersects [lo,hi) if interval.lo < hi and interval.hi > lo.
- start = bisect_right(his, lo): first interval with hi > lo.
- end = bisect_left(los, hi): first interval with lo >= hi.
- For slice [start:end], handle boundaries: left piece if iv[start].lo < lo: [iv.lo, lo]; right piece if iv[end-1].hi > hi: [hi, iv.hi]. Replace slice with these pieces.

contains(x): idx = bisect_right(los, x) - 1; check idx >= 0 and his[idx] > x. Since intervals half-open, x in [lo, hi) iff lo <= x < hi.

total_length: sum(hi - lo), maintain cached? Just compute sum each call or maintain running total. Maintain running total for O(1). But floats: "keep original values" — sum of lengths fine. Maintain self._total.

intervals(): return [tuple(i) for i in self._iv] — but must merge touching. Since add merges touching, list is already merged. But remove can't create touching intervals. OK. However: could remove produce [a,b) and [b,c) adjacent? Remove splits one interval into two separated by gap. No.

But careful: add merging condition — I require lo <= b (touch/overlap) i.e. new interval's lo <= existing hi. And existing lo <= new hi. That merges touching on either side. Good.

Edge: merging [1,3) and [2,5): merged [1,5). Yes.

Implementation with tuples:

def add(self, lo, hi):
    if lo >= hi: return
    iv = self._iv
    start = bisect_left(iv, lo, key=lambda t: t[1])  # first hi >= lo
    end = bisect_right(iv, hi, key=lambda t: t[0])   # first lo > hi
    if start >= end:
        iv.insert(start, (lo, hi))
    else:
        nlo = min(lo, iv[start][0])
        nhi = max(hi, iv[end-1][1])
        # subtract removed lengths, add merged
        self._total -= sum(h - l for l, h in iv[start:end])
        iv[start:end] = [(nlo, nhi)]
        self._total += nhi - nlo
    else-branch insert: self._total += hi - lo

Wait for insert position correctness when start >= end: shown above insert at start works. But check: start = first index with hi >= lo. end = first index with lo > hi. If start >= end... end <= start means intervals in [end, start) have lo > hi? Hmm, actually when no overlap, end could be < start? Intervals between end and start: lo > hi (since idx < end → lo <= hi... wait end is first with lo > hi, so indices < end have lo <= hi) and hi < lo (indices < start have hi < lo). For idx in [end, start): lo <= hi and hi < lo → lo <= hi < lo contradiction, so that range is empty, end >= start... hmm, end >= start? Not necessarily: consider intervals [(0,1)], add (2,3): start = first hi >= 2 → none, start=1. end = first lo > 3 → 1. start==end=1, insert at 1. Good. Consider intervals [(0,10)], add (2,3): start = first hi >= 2 → 0. end = first lo > 3 → 1. start<end, merge. Consider [(0,1),(5,6)], add (2,3): start = first hi>=2 → idx1 (hi=6). end = first lo > 3 → idx1 (lo=5). start==end=1, insert at 1. Sorted: (0,1),(2,3),(5,6). Correct. Consider [(0,1)], add (0.5, 2)? overlap merge. Fine.

Edge: insert at start when start==end: verified above correct sorted position? In example [(0,1),(5,6)] add (2,3): start=1 which is bisect_right(los,2)? los=[0,5], bisect_right for 2 → 1. Yes.

Another edge: touching on the left only: [(0,3)], add (3,5): start = first hi >= 3 → 0 (hi=3). end = first lo > 5 → 1. merge → (0,5). Good. Touching right: [(3,5)], add (0,3): start = first hi >= 0 → 0. end = first lo > 3 → 0. start >= end → insert at 0. But they touch! (0,3) and (3,5) should merge to (0,5). Oops: end = bisect_right(iv, hi=3, key lo) → los=[3], first lo > 3 → index 1? bisect_right([3],3) = 1. Wait key: bisect_right(iv, 3, key=lambda t: t[0]) with iv=[(3,5)] → returns 1. So end=1 > start=0. Merge: nlo=min(0,3)=0, nhi=max(3,5)=5 → (0,5). Good, I miscomputed. Right.

Check remove:

def remove(self, lo, hi):
    if lo >= hi: return
    iv = self._iv
    start = bisect_right(iv, lo, key=lambda t: t[1])  # first hi > lo
    end = bisect_left(iv, hi, key=lambda t: t[0])    # first lo >= hi
    if start >= end: return
    pieces = []
    first = iv[start]; last = iv[end-1]
    if first[0] < lo: pieces.append((first[0], lo))
    if last[1] > hi: pieces.append((hi, last[1]))
    self._total -= sum(h - l for l, h in iv[start:end])
    iv[start:end] = pieces
    self._total += sum(h - l for l, h in pieces)

contains(x):
    idx = bisect_right(self._iv, x, key=lambda t: t[0]) - 1
    return idx >= 0 and self._iv[idx][1] > x

Wait, bisect_right by lo: gives first index with lo > x. idx-1 has lo <= x. Need hi > x. Correct.

__len__: return len(self._iv).

intervals(): return [(l, h) for l, h in self._iv].

total_length: return self._total.

Performance with key lambdas: bisect with key calls key per comparison — O(log n) key calls, fine. 60k adds each doing bisects + slice operations. Slice replacement iv[start:end] = [...] is O(n) worst case per add for list shifting, but with random disjoint small intervals over what range? "small disjoint intervals in random order" — 60k intervals, each add O(log n) search + O(n) memmove potentially. 60k * 60k memmove worst = too slow, but memmove of pointers is fast; 60k inserts average shift 30k pointers = 60k*30k = 1.8e9 pointer moves... that's too slow actually? memmove of 30k*8 bytes = 240KB per insert, 60k inserts = 14GB memory traffic — a few seconds maybe. Hmm. Well, CPython list insert uses memmove which is ~10GB/s, so ~1.4s. Borderline. But "random order disjoint" — insertion position random, average shift half. Could be ~1-2s for adds plus 200k contains O(log n) trivial. Under 5s total, likely OK. To be safer, could use a more clever structure but sorted list is standard. Alternatively reduce constant: keep list of tuples; that's what we do.

Actually merging touching: also consider floats where hi==lo comparison exact — fine.

One subtlety: merging condition uses touching (hi == lo). With disjoint intervals guaranteed, after merges the invariant lo_i < hi_i < lo_{i+1}... wait merged touching: hi == next lo allowed? No—we merge touching, so invariant is hi_i < lo_{i+1} strictly (hi_i <= lo_{i+1} would have been merged, and hi_i can't exceed lo_{i+1}). Hmm, but could hi_i == lo_{i+1} remain after removal? Remove creates pieces (first.lo, lo) and (hi, last.hi) with gap lo..hi > 0. No touching created. So invariant hi_i < lo_{i+1}? Wait touching merge: [1,3)+[3,5) → [1,5), so no adjacent touching pairs remain. But what about add that doesn't merge because... every touching pair gets merged in add. So invariant: hi_i <= lo_{i+1}? If hi_i == lo_{i+1} they'd be merged already. So strictly hi_i < lo_{i+1}. Hmm, but bisect correctness: for contains, using bisect on los only — if x falls in gap, idx gives interval with lo <= x and hi <= lo... hi > x check fails. Good.

But strictly the "his strictly increasing" assumption used? Only in analysis of insert position; the code with start==end insert — I should double-check insert position is bisect_right by lo to be safe. Let me just insert at end (they're equal in non-overlap case... start==end). Actually in non-overlap case I argued start == bisect_right(los, lo). But is that always true? Intervals before start have hi < lo, and lo_i <= hi_i < lo so lo_i < lo → bisect_right > those. Intervals at start