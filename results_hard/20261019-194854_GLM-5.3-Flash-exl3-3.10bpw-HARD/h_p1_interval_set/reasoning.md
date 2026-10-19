Need efficient add: bisect to find overlapping intervals, merge. Store sorted list of intervals, use list with insort-ish operations. 60,000 adds of disjoint intervals — merging keeps list small if disjoint. Each add is O(n) worst due to list insertion but fine.

Implementation: maintain self._ivs sorted list of (lo, hi) tuples.

add(lo, hi): if lo >= hi return. Use bisect on lo values. Find first interval with hi >= lo... Actually intervals sorted by lo. Find index of first interval whose lo > lo (bisect_right on lo keys). Also need previous interval that might overlap: prev interval with hi > lo. Since intervals disjoint and sorted, overlapping intervals with [lo,hi) are those with lo < hi and hi > lo. Use bisect_left on list of lo's to find start candidate = idx-1 possibly.

Extract all intervals intersecting [lo,hi): those with i.lo < hi and i.hi > lo. Merge: new_lo = min(lo, first.hi... ) etc.

Standard approach:

lo_list = [x[0] for ...] — maintaining a parallel list of los for bisect is faster. Use key list.

Code:

import bisect

class IntervalSet:
    def __init__(self):
        self._lo = []  # sorted starts
        self._hi = []  # ends, parallel

    def add(self, lo, hi):
        if lo >= hi: return
        i = bisect.bisect_right(self._lo, lo) - 1
        if i >= 0 and self._hi[i] > lo:
            # overlaps or touches previous
            start = i
        else:
            start = i + 1
        # find end: first interval with lo >= hi
        j = bisect.bisect_left(self._lo, hi)
        # intervals start..j-1 have lo < hi; need hi > lo to overlap; start chosen so all from start have hi > lo? intervals between start and j all have lo >= lo... hmm check: intervals with index >= start have lo >= lo (since start = i+1 means lo[i+1] >= lo? bisect_right gives first index with lo > lo, so i+1 has lo > lo yes). And their hi > lo? Not necessarily: an interval with lo > lo could have hi <= lo — impossible since hi > lo for valid intervals and lo_i > lo means hi_i > lo_i > lo. So all intervals from start to j-1 overlap [lo,hi)? They overlap if their lo < hi, which holds since lo_i < ... bisect_left gives first with lo >= hi, so indices < j have lo < hi. Yes all overlap.

        new_lo = lo; new_hi = hi
        if start < j:
            new_lo = min(lo, self._lo[start])
            new_hi = max(hi, self._hi[j-1])
        self._lo[start:j] = [new_lo]
        self._hi[start:j] = [new_hi]

Wait, touching: [1,3) + [3,5) should merge. Condition for merging with previous: self._hi[i] >= lo (touching counts). I wrote > lo. For [3,5) added after [1,3): i where lo=3, bisect_right([1,3],3)-1 = 1, hi[1]=5 > 3 yes overlaps anyway. Touching case: existing [1,3), add [3,5): lo=3, bisect_right([1],... los=[1,3]. bisect_right(los,3)=2, i=1, hi[1]=5>3 yes. Existing [3,5), add [1,3): lo=1, bisect_right([3],1)-1 = -1... los=[3], bisect_right=0, i=-1, start=0. j = bisect_left([3], 3) = 0. start=0, j=0 → insert [1,3]. Result [[1,3),[3,5)] — touching but not merged. Need merging of touching.

Handle: use >= for previous: if i>=0 and self._hi[i] >= lo: start = i. But careful: if hi[i] == lo (touching), intervals from start..j-1: interval i has hi == lo, lo_i < lo, that's fine for merging (min). And overlap condition check for j-1: intervals between start and j-1 all have lo < hi_new? Interval i has lo < lo < hi. Fine.

But also after merge, adjacent results might touch? E.g., existing [1,3) and [5,7), add [3,5). lo=3: los=[1,5], bisect_right(los,3)=1, i=0, hi[0]=3>=3 → start=0. j = bisect_left(los,5)=1. Merge intervals 0..0 with [3,5): new_lo=1, new_hi=max(5,3)=5. Result [[1,5)] — good, and it touches [5,7)? hi new =5, next interval lo=5 → touching not merged. Need to extend j: while j < len and self._lo[j] <= new_hi: merge. Actually intervals with lo == new_hi touch. So after computing, extend: while j < len and self._lo[j] <= new_hi: new_hi = max(new_hi, self._hi[j]); j += 1.

Hmm but intervals with lo == new_hi and beyond? Disjoint sorted so only immediate. The while loop handles one at a time.

Also start side: previous interval touching with hi == lo: included via >=. But what about interval before that touching? Can't be, disjoint.

Edge: after extending j, also should we merge more? While loop continues while lo[j] <= new_hi, and new_hi grows. Good.

remove(lo, hi): if lo>=hi return. i = bisect_right(self._lo, lo) - 1. If i>=0 and self._hi[i] > lo: split that interval: if self._hi[i] <= hi: remove entirely (slice from i). else: keep [lo_i, lo) and [hi, hi_i): replace with lo_i, lo and hi, hi_i... Actually replace interval i with [lo_i, lo) and [hi, hi_i) if hi < hi_i. Then j = bisect_left(self._lo, hi) (recompute after modification?) Simpler: compute j first, then handle.

Let me do:

j = bisect.bisect_left(self._lo, hi)  # first interval with lo >= hi
i = bisect.bisect_right(self._lo, lo) - 1
if i >= 0 and self._hi[i] > lo and i < j:
    if self._lo[i] == lo... handle:
    if self._hi[i] <= hi:
        # fully covered
        if self._lo[i] < lo: truncate: self._hi[i] = lo; start_del = i+1
        else: start_del = i
    else:
        # hi[i] > hi, split
        if self._lo[i] < lo:
            self._hi[i] = lo
            insert (hi, hi_i) at i+1; start_del = i+2
        else:
            self._lo[i] = hi; start_del = i+1
else:
    start_del = max(i+1, ...)? Hmm need first interval with lo >= lo? Intervals fully inside [lo,hi): those with lo >= lo and lo < hi. Index of first with lo >= lo: bisect_left(self._lo, lo). But interval i (if overlapping partially) handled above. start_del = bisect_left(self._lo, lo) if not handled... Actually simpler: let k = bisect_left(self._lo, lo). Intervals k..j-1 have lo in [lo, hi) so fully removed (their hi <= lo_k... their hi > lo and lo >= lo, and lo < hi so hi <= hi? hi_k > lo_k >= lo, and hi_k <= ... hi_k could exceed hi? No: hi_k <= lo_{k+1}? Not necessarily bounded by hi. Wait interval with lo in [lo,hi): its hi > lo, but could hi > hi? Yes! E.g., interval [2, 10), remove [3,5): interval lo=2 < 3 handled by i case. But interval with lo_k >= lo: e.g. [4, 10), remove [3,5): lo=4 < 5=hi, hi=10 > hi. This interval is partially covered, not fully. Oops — my disjointness assumption: intervals are disjoint but a later interval can extend beyond hi.

So removal: intervals intersecting [lo,hi): those with lo_i < hi and hi_i > lo. First such: could be i (with lo_i < lo, hi_i > lo) or first with lo >= lo and lo < hi and hi > lo — but hi > lo always true. Hmm but an interval with lo >= lo but hi <= lo impossible. So intersecting intervals: index range [s, j) where s = first index with hi > lo (could be i or i+1), j = first index with lo >= hi.

s: if i >= 0 and self._hi[i] > lo: s = i else s = i+1. But also touching at left doesn't count for removal (hi_i == lo means no overlap). Good.

Then for the range s..j-1:
- leftmost: if _lo[s] < lo: keep left part [ _lo[s], lo ). 
- rightmost (j-1): if _hi[j-1] > hi: keep right part [hi, _hi[j-1]).
- remove all s..j-1, then insert kept parts.

Implementation:

if s < j:
    left = (self._lo[s], lo) if self._lo[s] < lo else None
    right = (hi, self._hi[j-1]) if self._hi[j-1] > hi else None
    self._lo[s:j] = [x[0] for x in (left, right) if x]  # careful with None filtering
    self._hi[s:j] = ...
    pieces = [p for p in (left, right) if p is not None]
    self._lo[s:j] = [p[0] for p in pieces]
    self._hi[s:j] = [p[1] for p in pieces]

contains(x): i = bisect_right(self._lo, x) - 1; return i >= 0 and self._hi[i] > x.

total_length: sum(h-l for ...).

intervals(): list(zip(self._lo, self._hi)).

__len__: len(self._lo).

Wait merging in add: does the while-extension handle case where merged hi touches next? Let me re-verify add with touching on left using >= condition. Existing [3,5), add [1,3): los=[3], bisect_right([3],1)=0, i=-1, s=0. j = bisect_left([3],3)=0. s==j → no overlap. Insert [1,3] at 0: but touching [1,3) and [3,5) should merge into [1,5). My basic add doesn't merge touching when no overlap. Need to handle.

Better: use touching-aware bounds. For add, treat overlap condition with >= on both sides:

For add: find s = first index such that interval touches/overlaps: i = bisect_right(los, lo) - 1; if i>=0 and hi[i] >= lo: s=i else s=i+1. j = first index with lo > hi... intervals with lo == hi touch. j = bisect_right(los, hi)? Intervals with lo <= hi touch/overlap at right. j = bisect_right(los, hi) gives first with lo > hi. But intervals with lo == hi: e.g. add [1,3) to existing [3,5): los=[3], bisect_right(los,3)=1, j=1, s: i=0, hi[0]=5>=3 → s=0. Merge: new_lo=min(1,3)=1, new_hi=max(3,5)=5. Result [1,5). 

But careful: with j = bisect_right(los, hi), interval at j-1 has lo == hi possibly, its hi > hi, fine, max handles.

However using >= for left: interval with hi == lo gets merged (touching) — desired. Interval with hi > lo obviously. But interval before i? Can't touch since disjoint: hi[i-1] <= lo[i] and if hi[i] >= lo... fine.

Edge: what if s computed as i but hi[i] == lo (touching only) and interval i-... no issue.

Then also right-extension not needed since j via bisect_right(los, hi) includes lo == hi. But wait: after merging, new_hi = max(hi, hi[j-1]). Interval j has lo > hi but could lo_j <= new_hi? lo_j > hi, new_hi >= hi; if hi[j-1] big, new_hi could exceed lo_j? hi[j-1] <= lo_j (disjoint, sorted, and actually hi[j-1] <= lo_j since disjoint & sorted; could be equal only if... intervals disjoint half-open, hi[j-1] <= lo_j allowed touching — but touching intervals would have been merged already by invariant). Invariant: stored intervals are disjoint and non-touching (hi[k] < lo[k+1]). So hi[j-1] < lo_j... then new_hi = max(hi, hi[j-1]). Could new_hi >= lo_j? Only if hi >= lo_j, but lo_j > hi. No. Good, so no extension needed, but to be safe keep invariant maintained: add merges touching, remove keeps as-is (remove could create touching? No, remove only shrinks/splits; split parts [lo_s, lo) and [hi, hi_{j-1}) — the right part starts at hi, next interval lo_j >= hi... lo_j > hi? bisect... For remove I used j = bisect_left(los, hi): intervals before j have lo < hi, so after removal next remaining interval has lo >= hi, touching possible if lo_j == hi with right piece [hi, ...). Hmm! E.g. existing [1,5) and [5,7)? Not possible by invariant (they'd be merged). Existing [1,5), [7,9), remove [3,7): s: i: bisect_right([1,7],3)-1=0, hi[0]=5>3 → s=0. j = bisect_left(los,7)=1. left=(1,3), right: hi[0]=5 > 7? No. So result [1,3),[7,9). Fine. Another: existing [1,5), remove [3,5): j=bisect_left([1],5)=1, s=0, left=(1,3), right: hi[0]=5>5? No. Result [1,3). Next interval none. What about existing [1,5), [6,8), remove [3,6): j = bisect_left([1,6],6)=1, left=(1,3), right: hi[0]=5>6 no. Remaining [6,8). Touching [1,3) and [6,8)? No gap. OK. Can removal create touching? Right piece ends at hi_{j-1} which is < lo_j already (invariant). Left piece [lo_s, lo) followed by remaining interval at index j with lo_j >= hi > lo. Fine. So invariant preserved.

Actually for remove, j should be bisect_left(los, hi)? Intervals with lo == hi: [hi, x) doesn't intersect [lo,hi) (half-open), correct to exclude. And intervals with lo < hi but hi_i <= lo excluded by s computation. Good.

But wait s in remove: touching not included (need strict >). i = bisect_right(los, lo)-1; if hi[i] > lo: s=i else s=i+1. Correct.

One more subtlety in add s: i = bisect_right(los, lo) - 1. Interval i has lo_i <= lo. If hi_i >= lo, touching/overlap → s=i. If hi_i < lo, s = i+1. But could interval i-1 touch? hi[i-1] <= lo_i < lo, no.

Also in add, j = bisect_right(los, hi): first index with lo > hi. Intervals s..j-1: lo <= hi (touch or overlap). But interval at index s could have... all good. But is it possible an interval between s and j-1 doesn't actually touch/overlap? All intervals with lo_i <= hi and lo_i >= previous... interval with lo_i in (lo_prev_hi, ...). Since s..j-1 all have lo <= hi and their lo >= ... they all have hi > lo_their own, and lo <= hi means they intersect [lo,hi] at least at point... touch condition: interval [a,b) touches [lo,hi) iff a < hi and b > lo... with touching merged: a <= hi and b >= lo. All s..j-1: lo <= hi ✓, hi > lo (since hi > lo always) ✓. Good.

new_lo = min(lo, lo[s]) if s<j else lo; new_hi = max(hi, hi[j-1]) if s<j else hi.

Performance: 60k adds with list insert O(n) each → 60k * avg n/2... if intervals mostly disjoint, n grows to 60k, insertions cost O(n) memmove — 60k*60k/2 = 1.8e9 element moves? That's slice assignment memmove of pointers, ~fast in C but 1.8e9 pointer moves might be ~1-2s. Hmm. Actually inserting into middle of list of 60k: memmove of ~60k*8 bytes = 480KB per op, 60k ops = 28 GB memory traffic — too slow? ~ maybe 3-10s. Risky.

Hmm, "60 000 add() calls of small disjoint intervals in random order" — random order means many inserts in middle. Worst case heavy. Alternative: use a sorted structure with O(log n) insert. Options: use `sortedcontainers` — not stdlib. Implement with a list but batch? Or use bisect and accept O(n) inserts — 60k inserts into list averaging 30k elements: total elements moved ≈ sum over i of i/2 ≈ 9e8 pointer moves ≈ 7.2 GB memmove — memmove is very fast (~10 GB/s+), so ~1s. Probably OK "well under 5 seconds". contains: bisect O(log n) — 200k trivial.

Actually also each add does slice assignment deleting/inserting — similar cost. Should be fine. Python-level overhead per add is small.

Alternatively could use SkipList or a B-tree... overkill. Go with list.

One optimization: maintain los and his as two parallel lists to avoid tuple comparisons; bisect on list of numbers works directly.

Note: bisect on ints/floats mixed fine.

Also handle add where merged interval could equal existing (idempotent). Fine.

Edge in add: lo/hi could be equal to existing boundaries — covered.

Write final code.

class IntervalSet:
    __slots__ = ("_lo", "_hi")
    def __init__(self): self._lo=[]; self._hi=[]
    def add(self, lo, hi):
        if lo >= hi: return
        los, his = self._lo, self._hi
        i = bisect.bisect_right(los, lo) - 1
        s = i if i >= 0 and his[i] >= lo else i + 1
        j = bisect.bisect_right(los, hi)
        if s < j:
            if los[s] < lo: lo = los[s]
            if his[j-1] > hi: hi = his[j-1]
        los[s:j] = [lo]
        his[s:j] = [hi]

Wait: careful — his[j-1] > hi vs >=: touching intervals merge, hi[j-1] could be < hi obviously; if hi[j-1] == hi then max is hi anyway, fine.

But subtlety: j = bisect_right(los, hi) includes interval with lo == hi. If s < j and only interval at j-1 has lo == hi and hi[j-1] < ... e.g., add [1,3), existing [3,4). i = bisect_right([3],1)-1 = -1, s=0. j = bisect_right([3],3)=1. merge: lo=min(1,3)=1, hi=max(3,4)=4 → [1,4). Correct.

But case where interval at j-1 has lo == hi but s == j? s <= j always? s could exceed j? s = i+1 where i = index of last lo <= lo. j = first index lo > hi. Since lo < hi, i+1 <= position of first lo > lo <= first lo > hi, so s <= j. OK.

Hmm, but one more: what if s<j but interval s doesn't touch because his[s]... his[s] > lo always when s = i+1? los[s] > lo (or s=0), his[s] > los[s] > lo? los[s] > lo since i is last with lo <= lo... bisect_right gives first index with lo > lo, so los[s] > lo when s=i+1>0. his[s] > los[s] > lo ✓. When s=i: his[i] >= lo ✓. Good.

contains:
    def contains(self, x):
        i = bisect.bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

remove:
    def remove(self, lo, hi):
        if lo >= hi: return
        los, his = self._lo, self._hi
        j = bisect.bisect_left(los, hi)
        i = bisect.bisect_right(los, lo) - 1
        s = i if i >= 0 and his[i] > lo else i + 1
        if s >= j: return
        pieces_lo, pieces_hi = [], []
        if los[s] < lo:
            pieces_lo.append(los[s]); pieces_hi.append(lo)
        if his[j-1] > hi:
            pieces_lo.append(hi); pieces_hi.append(his[j-1])
        los[s:j] = pieces_lo
        his[s:j] = pieces_hi

total_length, intervals, __len__, __contains__ maybe (bonus, harmless). Spec says contains() method; add __contains__ too? Keep it minimal but __contains__ is fine. I'll add it delegating to contains.

Also maybe __repr__ — optional, skip or include small. Keep clean.

intervals(): return list of tuples: list(zip(los, his)) — zip gives tuples ✓.

Double-check remove split when interval contains [lo,hi) strictly inside: los[s] < lo and his[j-1] > hi with s == j-1: pieces = [(los[s], lo), (hi, his[j-1])] — replaces correctly ✓.

Check remove where interval starts exactly at lo and ends beyond hi: los[s]==lo → no left piece; right piece (hi, his[j-1]) ✓.

Check invariant after remove creating touching: left piece ends at lo; remaining interval at j has los[j] >= hi > lo — but is los[j] > lo? yes since hi > lo and los[j] >= hi. Gap unless los[j]==... los[j] >= hi, left piece ends lo < hi ≤ los[j]: gap or touch? left ends at lo, next starts los[j] ≥ hi > lo → gap. Right piece starts at hi, previous... fine. But what if s==j-1 with both pieces: left [lo_s, lo), right [hi, hi_s): gap between lo and hi ✓.

Edge: remove entire middle from multiple intervals e.g. [1,3),[4,6) remove [2,5): j = bisect_left([1,4],5)=2; i = bisect_right([1,4],2)-1=0; his[0]=3>2 → s=0. left: los[0]=1<2 → (1,2). right: his[1]=6>5 → (5,6). los[0:2]=[(1),(5)] ✓.

Performance of contains: bisect_right on list of floats/ints O(log n) ✓.

Done. Write final.