Implement IntervalSet with sorted list of disjoint merged intervals, using bisect for O(log n) operations (amortized due to list insertion).

Key: add merges touching intervals: adjacent if hi == next.lo. Half-open [lo, hi): [1,3) and [3,5) merge since 3==3.

Maintain sorted list self._ivs of (lo, hi).

add(lo, hi): if lo >= hi return. Find affected range: use bisect on lo values. Need to find intervals that overlap or touch [lo, hi): intervals with hi >= lo and lo <= hi (touching means next.lo == hi or prev.hi == lo).

Standard approach: i = bisect_left over list of los to find first interval with lo > hi (candidates start where lo <= hi... actually first interval possibly overlapping: those with hi >= lo). Since intervals sorted by lo and disjoint/non-touching, hi increases too. Overlap condition: interval [a,b) touches [lo,hi) if a <= hi and b >= lo. Touching merge: if a == hi or b == lo, merge.

Find left index: first interval with hi >= lo. Since his increasing, use bisect on a parallel list of his? Maintaining two lists (los, his) makes bisect easier. Let's keep self._lo and self._hi lists.

add:
- if lo >= hi: return
- # find start: first interval with hi > lo (strictly? if hi == lo, touching, merge — so hi >= lo)
  Actually interval with hi == lo touches [lo, hi)? Interval ends at lo (exclusive), new starts at lo — they're adjacent, merge. Condition b >= lo → yes.
- left = bisect_left(self._hi, lo) — first index with _hi[i] >= lo.
- right: last interval with lo <= hi (touching: a == hi merges). a <= hi. right = bisect_right(self._lo, hi) — first index with lo > hi; intervals in [left, right) are candidates. But need lo <= hi condition: bisect_right gives lo <= hi inclusive (lo == hi merged). Good.
- If left >= right: no overlap. Insert (lo, hi) at position left. But check touching with neighbors: neighbor before left has hi < lo (strictly less, since bisect_left on hi gives hi[i] < lo for i < left). Neighbor at right has lo > hi strictly. So no merge needed. Actually wait — bisect_left(self._hi, lo): entries with hi < lo are before. If hi[i] == lo for some i, left points to it, which is included in candidates since a <= hi? Need a <= hi for that interval: lo_i <= hi? We don't know yet, but since intervals disjoint sorted, if hi_i == lo then interval is [x, lo), and lo_i < lo ≤ hi so yes a <= hi → included. Good.
- Else: new_lo = min(lo, self._lo[left]), new_hi = max(hi, self._hi[right-1]). Replace slice [left:right] with single interval.

remove:
- if lo >= hi: return
- left = bisect_right(self._lo, lo) - 1 — candidate intervals that could contain lo... more careful: intervals overlapping [lo,hi) with actual overlap (not touching, since removing touching doesn't split... removing [lo,hi) affects intervals with a < hi and b > lo).
- first candidate: index where hi > lo: left = bisect_right(self._hi, lo) — first i with hi[i] > lo.
- last: last i with lo[i] < hi: right = bisect_left(self._lo, hi) — first i with lo >= hi; candidates [left, right).
- For each affected, truncate. Handle first: if lo > _lo[left]: left piece [lo_l, lo) remains. Handle last: if hi < _hi[right-1]: right piece [hi, hi_r) remains. Middle ones removed entirely.

Implementation: 
left = bisect_right(self._hi, lo)
right = bisect_left(self._lo, hi)
if left >= right: return
# but careful: left could exceed right? left found via hi list, right via lo list; consistent since intervals sorted. Actually if left >= right no interval satisfies hi>lo and lo<hi... intervals satisfying both are those in [left, right). If left >= right, none. But could left > right? hi>lo and lo<hi conditions — the set of intervals with hi > lo is a suffix (bisect_right on hi, since hi sorted), set with lo < hi is a prefix (bisect_left on lo). Both nonempty suffix/prefix... hmm, intervals with lo < hi is prefix? lo sorted ascending; lo[i] < hi — as i increases lo increases, so lo[i] < hi holds for a prefix. Yes. So overlap candidates = intersection of suffix and prefix, which is [left, right) possibly empty. Fine.

Edge: left piece and right piece both exist for same interval when [lo,hi) strictly inside one interval → split into two: replace with [lo_l, lo) and [hi, hi_r).

Handle: if right - left == 1 and _lo[left] < lo and _hi[left] > hi: split. Otherwise:
- build remaining pieces: before part of left interval if lo > _lo[left]? Wait _hi[left] > lo guaranteed (bisect_right gives hi > lo... bisect_right(self._hi, lo) returns first index with _hi[i] > lo). So left interval has hi > lo. Left piece: if _lo[left] < lo: piece [_lo[left], lo). Last interval index right-1 has lo < hi. Right piece: if _hi[right-1] > hi: piece [hi, _hi[right-1]).
- Middle intervals [left+1, right-1] fully removed (their lo >= lo and hi <= hi... they satisfy lo < hi and hi > lo so overlap fully within? Interval i (left < i < right-1... hmm need lo[i] >= lo and hi[i] <= hi). lo[i] >= lo? Since left = first with hi>lo, and i>left means hi[i-1]... intervals disjoint non-touching: hi[i] <= lo[i+1]. For i > left: hi[i-1] > lo doesn't directly give lo[i] >= lo. Hmm. Actually left = bisect_right(hi, lo): for i < left, hi[i] <= lo. For i >= left, hi[i] > lo. Interval left has hi > lo; does it have lo < hi? It's candidate only if lo[left] < hi — i.e., left < right. For intervals between left and right-1 exclusive: they have hi > lo (since i >= left) and lo < hi (since i < right). Do they lie fully inside [lo, hi)? lo[i] >= lo: since i > left, lo[i] >= hi[left-1] >... intervals disjoint: lo[i] >= hi[i-1] > lo (since i-1 >= left, hi[i-1] > lo). Yes lo[i] > lo. And hi[i] <= lo[i+1] < hi? i+1 <= right-1, lo[i+1] < hi (since i+1 < right). So hi[i] < hi... wait hi[i] <= lo[i+1] and lo[i+1] < hi → hi[i] < hi. Yes fully inside. Good.

So removal: new intervals list = pieces from left interval's left part, right interval's right part, plus keep intervals before left and from right onward.

Code:
if _lo[left] < lo and (left == right-1 and _hi[left] > hi):
    split: self._lo[left:right] = [ _lo[left], hi ]; self._hi[left:right] = [lo, _hi[left]]
    Hmm but that's same as general: pieces = []
    if _lo[left] < lo: pieces append left part [_lo[left], lo)
    if _hi[right-1] > hi: pieces append [hi, _hi[right-1])
    but if left < right-1, middle removed.
    Also need: if left == right-1 and _lo[left] < lo and _hi[left] > hi → two pieces, correct.
    General: pieces = []
    if _lo[left] < lo: pieces.append((_lo[left], lo))
    if _hi[right-1] > hi: pieces.append((hi, _hi[right-1]))
    self._lo[left:right] = [p[0] for p in pieces]
    self._hi[left:right] = [p[1] for p in pieces]

Wait: if left == right-1 and interval contains [lo,hi) strictly inside: left piece [_lo, lo), right piece [hi, _hi). Both appended. Correct.
If interval partially overlaps on left only: _lo[left] < lo, _hi[left] <= hi (could equal hi). Then left piece appended, no right piece. Correct.
If _lo[left] == lo: no left piece, interval trimmed from left... if _hi[left] > hi: right piece [hi, _hi). Correct.
If _lo[left] > lo? Can't happen since left is first with hi > lo, but lo[left] could be... lo[left] could be < lo? e.g. interval [0,10), remove [5,7): left = first hi>5 → hi=10, index 0. lo[left]=0 < 5, left piece [0,5). Good. Could lo[left] > lo with hi[left] > lo? Then interval [a,b) with a > lo, b > lo, a < hi (since left<right needed). e.g. intervals [0,2),[3,5), remove [1,4): left = first hi>1 → index 0 (hi=2). Hmm lo[left]=0. Another: intervals [0,2),[3,5), remove [2.5, 3.5): left = first hi > 2.5 → index 1 (hi=5), lo=3 > 2.5. right = first lo >= 3.5 → index 2. left=1 < right=2. Candidate interval [3,5): lo=3 > lo_param. That's fine — it has no left piece since _lo[left] > lo... but wait, does [3,5) overlap [2.5,3.5)? Yes, [3, 3.5) removed. Left piece condition _lo[left] < lo → 3 < 2.5 false. Right piece: _hi[right-1] = 5 > 3.5 → piece [3.5, 5). Replace slice [1:2] with [(3.5,5)]. Correct.

But careful: pieces could be empty list → slice assignment with empty lists removes. Fine.

contains(x): i = bisect_right(self._lo, x) - 1; return i >= 0 and x < self._hi[i]. Since intervals disjoint sorted, x in interval i iff _lo[i] <= x < _hi[i]. But careful: bisect_right on lo gives first index with lo > x; i = that-1 has lo <= x. Check x < hi[i]. Good. Half-open: x == hi excluded since x < hi false; also next interval has lo == hi? No—merged, touching merged means hi[i] < lo[i+1] strictly after merging? Actually merging combines [1,3)+[3,5) into [1,5), so stored intervals never touch: hi[i] < lo[i+1]. Wait, can hi[i] == lo[i+1] in stored state? add merges touching, remove: could removal create touching intervals? Remove splits [0,10) with [5,7) → [0,5),[7,10) — not touching. Remove can't create touching. Add merges. So stored invariants: lo[i] < hi[i], hi[i] < lo[i+1] (strictly). Wait could hi[i] == lo[i+1] ever remain? Add: when inserting without overlap, neighbors don't touch (checked bisect conditions: neighbor before has hi < lo strictly since bisect_left; neighbor after has lo > hi strictly). Merge combines all touching. So invariant holds. Good.

total_length: sum cached? Just compute sum(hi-lo) — but 60000 adds each O(n) if recomputing... just compute on demand: sum(b-a for a,b in zip). That's O(n) per call, fine. Or maintain running total. Maintain self._total incrementally? Removal complicates but easy: subtract removed lengths. Simpler: compute lazily. Let's just compute in method; performance requirement only mentions add and contains. Fine.

intervals(): return list(zip(self._lo, self._hi)).

__len__: len(self._lo).

Performance: 60000 adds of small disjoint intervals in random order. Each add without overlap does insertions into lists — O(n) memmove but fast (C-level). 60000 inserts ~ fine. bisect O(log n). contains O(log n) — 200k calls fine.

One subtlety in add merge: new_lo = min(lo, _lo[left]) but left interval's lo could be > lo? If left < right, candidate intervals overlap/touch. The leftmost candidate may start after lo (e.g., inserting [2.5,3.5) with [3,5) existing... but [3,5) touches? 3 < 3.5 overlap yes). new_lo = min is correct. Also candidates include those touching at right: last candidate has lo <= hi (touching merged when lo == hi).

Also check: in add, candidates condition — interval [a,b) merges with [lo,hi) iff a <= hi and b >= lo. left = bisect_left(_hi, lo): first with b >= lo. right = bisect_right(_lo, hi): first with a > hi; candidates [left,right) have a <= hi. Correct.

But what if left >= right but intervals between still... no, condition a <= hi and b >= lo defines exactly candidates; left..right as computed. If left >= right, insert at index left — but must verify insertion position keeps sorted: intervals before left have b < lo, intervals from left have a > hi... intervals at index >= right have a > hi. Since left <= right? If left > right, insert at left — but intervals between right and left have a > hi and b < lo → a > hi >= ... they lie strictly right of [lo,hi) hmm: a > hi and b < lo means b < lo <= hi < a, interval entirely after [lo,hi)? a > hi means starts after new interval ends. And there are intervals with b < lo (before left). Can left > right happen? Suffix b>=lo starts at left, prefix a<=hi ends at right. If left > right, there's index i in [right, left): a[i] > hi and b[i] < lo → a > hi and b < lo. But invariant intervals non-touching and sorted: a > hi_param means... compare with neighbors. Example: intervals [(0,1),(3,4)], add [1.5, 2.5): left = bisect_left(hi=[1,4], 1.5) → hi values 1,4; first >= 1.5 → index 1. right = bisect_right(lo=[0,3], 2.5) → first lo > 2.5 → index 2. left=1 <= right=2. Insert at 1: [(0,1),(1.5,2.5),(3,4)]. Good. Can left > right? Need interval with b < lo at position ≥ where a > hi... b < lo and a > hi: interval strictly after [lo,hi)? a > hi means starts after hi. For it to have b < lo with sorted order impossible unless... Suppose intervals [(0,5)] and add [2,3)? left = bisect_left([5], 2)=0, right = bisect_right([0],3)=1, candidates [0,1). merged. Suppose add [2,3) to set {(0,1),(4,5)}: computed above left<=right. Hmm, left > right would require some interval i with a_i > hi and b_i < lo, meaning interval starts after hi and ends before lo, but a <= b < lo <= hi < a contradiction. So impossible. left <= right always. Good — actually left > right implies interval [right] has a>hi, b<lo → a>b, contradiction. So fine.

Also add: after computing merged range, replace slice:
self._lo[left:right] = [new_lo]; self._hi[left:right] = [new_hi].

But wait: is new_hi = max(hi, _hi[right-1])? Last candidate b could exceed hi. Yes.

Also must consider touching merge chain: e.g., intervals [(1,3)], add [3,5): left = bisect_left([3], 3) = 0, right = bisect_right([1],5) = 1, merge → (1,5). Good.

remove check touching: intervals [(0,1)] remove [1,2): left = bisect_right([1], 1) = 1 (first hi > 1 → none, index 1). right = bisect_left([0], 2) = 1. left >= right → return. Good, [1,2) doesn't remove [0,1).

Now write code.

import bisect

class IntervalSet:
    __slots__ = ("_lo", "_hi")
    def __init__(self):
        self._lo = []
        self._hi = []
    def add(self, lo, hi):
        if lo >= hi: return
        los, his = self._lo, self._hi
        left = bisect.bisect_left(his, lo)
        right = bisect.bisect_right(los, hi)
        if left == right:
            los.insert(left, lo)
            his.insert(left, hi)
        else:
            nlo = los[left] if los[left] < lo else lo
            nhi = his[right-1] if his[right-1] > hi else hi
            los[left:right] = [nlo]
            his[left:right] = [nhi]
    def remove(self, lo, hi):
        if lo >= hi: return
        los, his = self._lo, self._hi
        left = bisect.bisect_right(his, lo)
        right = bisect.bisect_left(los, hi)
        if left >= right: return
        pieces_lo, pieces_hi = [], []
        if los[left] < lo:
            pieces_lo.append(los[left]); pieces_hi.append(lo)
        if his[right-1] > hi:
            pieces_lo.append(hi); pieces_hi.append(his[right-1])
        los[left:right] = pieces_lo
        his[left:right] = pieces_hi
    def contains(self, x):
        i = bisect.bisect_right(self._lo, x) - 1
        return i >= 0 and x < self._hi[i]
    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))
    def intervals(self):
        return list(zip(self._lo, self._hi))
    def __len__(self):
        return len(self._lo)

Check add when left==right insert position: is left correct sorted position? intervals before left have hi < lo → lo < lo_new? their lo could be anything < their hi < lo. So lo < lo_new yes. Intervals at right.. have lo > hi >= lo_new? lo > hi strictly (bisect_right) and lo_new <= hi. So lo_new < lo[right]. Insertion at left keeps sorted. But if left != right... merged case replaces slice, positions before/after unchanged, new interval [nlo, nhi] where nlo <= lo <= hi... nlo <= los[left]... wait nlo = min(los[left], lo). Predecessor (left-1) has hi < lo (bisect_left on his with lo) hmm bisect_left(his, lo): for i<left, his[i] < lo. nlo >= ... nlo could be < lo if los[left] < lo. Predecessor hi < lo but is hi < nlo? nlo = min(los[left], lo). Is predecessor hi < los[left]? Yes by invariant (hi[i] < lo[i+1]). And hi < lo. So hi < min = nlo. Good. Successor at index right: lo[right] > hi (bisect_right on los with hi) and > los[right-1]? Successor lo > nhi: nhi = max(hi, his[right-1]); lo[right] > hi and lo[right] > his[right-1] (invariant). Good.

Edge: left==right==0 or len. Fine.

remove split check: los[left] < lo and his[right-1] > hi with left==right-1 → two pieces. Correct.

One more remove edge: what if left < right but interval left has los[left] > lo and its hi... his[left] > lo by definition of bisect_right (first hi > lo). Could his[left] > hi and los[left] >= lo? Then interval overlaps [lo,hi) at its beginning: piece [hi, his[left]). Condition los[left] < lo false → no left piece. Correct: e.g. set {(3,5)}, remove [2,4): left = bisect_right([5],2)=0, right = bisect_left([3],4)=1. los[0]=3 < 2? no. his[0]=5 > 4 → piece [4,5). Replace → {(4,5)}. Correct.

Also remove where interval ends exactly at lo... handled by bisect_right(his, lo) excluding hi == lo. Good.

total_length type: sum of numbers; empty → 0 (int). Fine.

Also maybe support __contains__? Not required. Could add anyway — spec says only those methods; adding __contains__ harmless but keep minimal. I'll add __contains__ delegating to contains? Not required; skip or add. I'll add it, harmless. Actually "No tests, no example usage" — just class. I'll include __contains__ for convenience? Keep minimal, skip.