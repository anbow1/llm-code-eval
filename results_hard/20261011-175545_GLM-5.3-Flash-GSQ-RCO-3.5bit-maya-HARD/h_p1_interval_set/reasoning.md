Standard interval set with bisect on sorted list of intervals. Keep a sorted list of (lo, hi). For add: find overlapping intervals via bisect, merge. For remove: split. Maintain cached total length, invalidate or update.

Implementation: keep list `ivs` sorted by lo. Use bisect on lo values. Because merging can touch adjacent intervals ([1,3)+[3,5) merge), when adding we need to consider intervals whose hi >= lo (touching). So find first interval with hi >= lo, i.e., bisect by hi? Simpler: find range of intervals [lo, hi] overlapping-or-touching: start = first index with hi >= lo; since sorted by lo, hi not sorted necessarily... but intervals are disjoint so hi sorted too. Disjoint intervals sorted by lo => hi sorted. So we can bisect on lo, and use the fact hi_i < lo_{i+1}.

add(lo, hi): i = bisect_right(ivs, lo) using lo keys... Let me keep parallel: store as list of [lo, hi]. To find intervals intersecting/touching [lo, hi): interval j overlaps if lo_j < hi and hi_j > lo. Touching (hi_j == lo or lo_j == hi) should merge too. So merge condition: lo_j <= hi and hi_j >= lo (with touching allowed: hi_j >= lo and lo_j <= hi). Actually merge if intervals touch or overlap: hi_j >= lo AND lo_j <= hi.

Find start: leftmost j with hi_j >= lo. Since hi sorted: use bisect on hi values. Keep a separate keys list? We could maintain a list of lo values for bisect, but mutating list frequently. Using `bisect` with key on list of lists: bisect_left(ivs, lo, key=lambda r: r[0]) — Python 3.10+ supports key. For hi, bisect on r[1] with key.

Approach:
- start = bisect_left(ivs, lo, key=lambda r: r[1]) — first interval with hi >= lo (touching or overlapping from left).
- end = bisect_right(ivs, hi, key=lambda r: r[0]) — first interval with lo > hi. All intervals in [start, end) have lo <= hi (touching or overlap on right).
- New merged interval: nlo = min(lo, ivs[start][0]) if start < end else lo; nhi = max(hi, ivs[end-1][1]) if start < end else hi. Wait — need max over touched intervals' hi, but the last one has the largest hi. Yes since hi sorted.
- Replace ivs[start:end] with [nlo, nhi].

remove(lo, hi):
- start = bisect_right(ivs, lo, key=lambda r: r[0]) — first interval with lo > lo... Hmm. Intervals to affect: those overlapping [lo,hi) strictly (touching doesn't matter for removal). Interval j overlaps removal region if lo_j < hi and hi_j > lo.
- start = bisect_right(ivs, lo, key=lo-key) gives first j with lo_j > lo. But interval before that might have hi_j > lo (straddles lo). Check ivs[start-1]: if hi > lo, it straddles.
- Handle: let s = bisect_left(ivs, hi, key=lambda r: r[0]) — first with lo >= hi. Intervals with lo in [?, s) intersect. Also possibly previous interval straddling lo.

Simpler removal:
- idx = bisect_right(ivs, lo, key=lambda r: r[0]) - 1... careful.

Let me do: 
start = bisect_left(ivs, lo, key=lambda r: r[0])? Interval with lo_j < lo could still overlap if hi_j > lo. That's ivs[start-1] if hi > lo. Intervals with lo_j >= lo and lo_j < hi overlap.

Plan:
- i0 = bisect_right(lo-keys, lo) → first index with lo > lo. The interval at i0-1 has lo <= lo; overlaps if hi > lo.
- Collect affected segments: before = None, middle list, after = None.
- If i0 > 0 and ivs[i0-1][1] > lo: it overlaps. Its prefix [lo_j, lo) stays, its suffix beyond min(hi, hi_j) stays if hi < hi_j.
- Then intervals i0..? with lo < hi overlap fully or partially (their hi may exceed hi). Find i1 = bisect_left(lo-keys, hi) → first with lo >= hi. Intervals i0..i1-1 have lo < hi (they overlap or touch? lo_j < hi means overlap since lo_j >= lo... wait intervals between i0 and i1-1 have lo_j >= lo? i0 is first with lo > lo, so intervals i0.. have lo >= lo. Actually lo_j > lo at i0, intervals before have lo <= lo). Intervals i0..i1-1 have lo_j > lo (since i0 onwards) hmm lo_j > lo and lo_j < hi → overlap. Last one may have hi > hi: keep suffix [hi, hi_j).
- Also need to check interval i1-1... covered. And check whether interval at i0-1 handles lo side. But what if interval at i0-1 has lo == lo? bisect_right gives first lo > lo, so lo == lo interval is at i0-1; hi > lo always true (disjoint nonempty), overlaps. Good.

Replacement: build new segment list:
- If straddle-left interval exists (index j = i0-1, hi_j > lo): keep [lo_j, lo] as prefix; if hi_j > hi, also suffix [hi, hi_j] and then intervals j+1..i1-1 removed... wait if hi_j > hi, that single interval covers beyond hi, so i1 <= j+1? i1 = first lo >= hi; interval j has lo_j <= lo < hi so i1 > j; intervals j+1..i1-1 have lo in [lo_j... they have lo > lo_j? They have lo_j' > hi_j? No — disjoint: intervals after j have lo >= hi_j > hi, so i1 = j+1. Consistent.
- Else, prefix none; intervals i0..i1-1 removed, last one may extend past hi → suffix.

Code:

```python
def remove(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    i0 = bisect_right(ivs, lo, key=itemgetter(0) or lambda)
    i1 = bisect_left(ivs, hi, key=lo-key)
    new = []
    if i0 > 0 and ivs[i0-1][1] > lo:
        j = i0-1
        new.append([ivs[j][0], lo])
        if ivs[j][1] > hi:
            new.append([hi, ivs[j][1]])
    else:
        if i1 > i0 and ivs[i1-1][1] > hi:
            new.append([hi, ivs[i1-1][1]])
    ivs[i0-? : i1] ... slice boundaries: remove indices max(i0,?) Actually when straddle exists, indices j+1 .. i1-1 removed; when not, indices i0..i1-1 removed. In both cases, we can do ivs[i0:i1] = new after handling. Wait when straddle exists j = i0-1, we modify nothing at index j except we keep prefix; index j itself is replaced by possibly two entries. So do ivs[i0-1:i1] = new in straddle case? But careful: ivs[i0-1][1] > lo condition. Let's unify:

    Determine left index L: if i0 > 0 and ivs[i0-1][1] > lo: L = i0-1 else L = i0.
    Determine right index R: if i1 > L and i1 > 0 and ivs[i1-1][1] > hi and i1-1 >= L: R includes suffix from last interval. Actually check the last affected interval ivs[i1-1] (if i1 > L): if hi > hi? if ivs[i1-1][1] > hi, keep suffix [hi, hi_j].
    Build new pieces:
    pieces = []
    if L < i0: pieces.append([ivs[L][0], lo])  # prefix of straddling-left interval
    if i1 > 0 and i1-1 >= L and ivs[i1-1][1] > hi: pieces.append([hi, ivs[i1-1][1]])
    Note both conditions could hold for same interval (i0-1 == i1-1, interval containing [lo,hi) entirely): pieces = [[lo_j, lo], [hi, hi_j]]. Good.
    ivs[L:i1] = pieces.
```

Edge: when straddle-left exists, i1 could equal i0? i1 = first lo >= hi. Straddle interval has lo_j <= lo < hi, so lo_j < hi → i1 > j = i0-1, so i1 >= i0. When not straddle, i1 >= i0 by definition. ivs[L:i1] with L=i0 works. When straddle, L=i0-1. Good.

But wait: in non-straddle case, need last interval check: ivs[i1-1] where i1-1 >= i0 = L. If i1 == L (no removed intervals), no suffix. If i1 > L, check ivs[i1-1][1] > hi → suffix. Correct.

Also total_length maintenance: compute delta. For add: delta = nhi - nlo - sum(len removed). For remove: delta = -(removed total). Removed total = sum of hi_j - lo_j for j in [L, i1) minus pieces lengths... easier: compute removed = sum(ivs[k][1]-ivs[k][0] for k in range(L, i1)) minus sum(p - q for [p,q] in pieces). Then total += removed_removed... total -= removed; plus pieces add back: total += removed - sum(pieces lengths). Let me: old = sum over range; new = sum pieces; self._total += new - old. For add similarly: old = sum range [start,end), new = len of merged. Fine; ranges are small typically. Worst-case add merging everything each time is O(n) per op but acceptable given perf constraints (60k adds of small disjoint intervals — each add touches few intervals).

contains(x): i = bisect_right(ivs, x, key=lambda r: r[0]) - 1... wait: interval containing x: lo_j <= x < hi_j. i = bisect_right(lo-keys, x) - 1? bisect_right gives first with lo > x; i-1 has lo <= x. Check hi > x. But careful with touching: [1,3),[3,5): x=3 → bisect_right(lo,3)=2, ivs[1] lo=3 <= 3, hi=5>3 → True. x=2.999 fine. But also check i-1: lo<=x and need hi>x. Good. Also handle i==0 → False.

Wait bisect_right with key on list of lists: key=lambda r: r[0]. Fine. But bisect requires the key sequence sorted — lo values sorted. Good.

intervals(): return [tuple(r) for r in ivs] — already merged by construction? Does add merge touching? Yes: condition hi_j >= lo and lo_j <= hi includes touching. remove splits may create touching? No — removal creates gap. Removal never creates touching intervals. Add merges touching. So invariant maintained.

__len__: len(self._ivs).

Performance for 60k adds: each add does O(log n) bisect plus slice assignment O(n) worst-case list shifting. 60k slice assigns on list of ~60k → each shifting ~30k elements average → 60k * 30k = 1.8e9 element moves... too slow? Python list slice assignment uses memmove, very fast (~ns per element). 1.8e9 * ~1ns = ~2s? Hmm, memmove of pointers is fast; 60,000 ops each moving average 30,000 pointers = 1.8e9 pointer moves ≈ 1-2 seconds maybe. Actually memmove speed ~ several GB/s, 8 bytes per pointer → 14GB → ~2-3 s. Risky. But typical: random order insertion, average shift is n/2 only if inserting at random positions — yes random order gives average shift ~n/2. 60k adds → total ~9e8 pointer moves... wait sum over insertions of current length: average length 30k, so 60000*30000 = 1.8e9. memmove at maybe 5-10 GB/s → ~1.5-3 s. "well under 5 seconds" — probably fine, but could improve.

Alternative: use `sortedcontainers`? Not stdlib. Could batch? Alternative: keep list and accept. Or use a different structure: since adds are random order small disjoint intervals, one could collect and sort at intervals()? But contains must work incrementally... contains after adds; 200k contains O(log n) via bisect on the list — fine.

Could reduce shifting by using list insertion only (insert one element, then remove others)? Same cost.

Alternatively store two parallel lists? Same.

I think it's acceptable: memmove is very fast. Let me estimate more carefully: list slice assignment ivs[i:j] = [x] does memmove for (len - j + 1) pointers... For insertion at random position in list of size n: shift (n - pos) elements. Average n/2. Total 60k * 30k = 1.8e9 pointer moves, each 8 bytes = 14.4 GB memmove. At ~10GB/s (L2/L3 cache partial), ~1.5 s worst. Hmm "well under 5 s" — should be OK. Plus bisect overhead negligible.

But each add also merges touched intervals — small disjoint intervals means few merges typically. Random order of disjoint intervals: each new interval touches ~0 or 1 existing. Fine.

Alternatively, I could avoid slice assign and instead do: if only replacing equal-length count, fine. Just keep simple.

Actually there's a subtlety: `bisect_right` with `key` — signature bisect_right(a, x, lo=0, hi=len(a), *, key=None). Key applied to elements. Good, Python 3.10+.

Use a small local key function; define module-level `_lo_key = lambda r: r[0]`? Use operator.itemgetter? itemgetter(0) works as key. Use `from operator import itemgetter`? Fine, stdlib.

Let me write:

```python
from bisect import bisect_left, bisect_right
from operator import itemgetter

_lo = itemgetter(0)
_hi = itemgetter(1)


class IntervalSet:
    __slots__ = ("_ivs", "_total")

    def __init__(self):
        self._ivs = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        start = bisect_left(ivs, lo, key=_hi)   # first with hi >= lo
        end = bisect_right(ivs, hi, key=_lo)    # first with lo > hi
        if start < end:
            lo = min(lo, ivs[start][0])
            hi = max(hi, ivs[end - 1][1])
            old = sum(r[1] - r[0] for r in ivs[start:end])
        else:
            old = 0
        ivs[start:end] = [(lo, hi)]
        self._total += (hi - lo) - old

    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        i0 = bisect_right(ivs, lo, key=_lo)  # first with lo > lo
        i1 = bisect_left(ivs, hi, key=_lo)   # first with lo >= hi
        L = i0 - 1 if i0 > 0 and ivs[i0 - 1][1] > lo else i0
        pieces = []
        if L < i0:
            pieces.append((ivs[L][0], lo))
        if i1 > max(L, i0 - ... hmm
```

Wait check suffix: last removed interval index i1-1; condition i1 > L and ivs[i1-1][1] > hi. But if L = i0-1 (straddle) and i1-1 == L (interval containing whole [lo,hi)), then i1 > L means i1 >= i0 > L — true. ivs[i1-1] == ivs[L]. hi_j > hi? If interval contains [lo,hi) fully, hi_j >= ... hi_j > hi possible, yes then suffix. Correct.

But careful: if L = i0 (no straddle) and i1 == i0 (nothing removed), no suffix, pieces empty, ivs[i0:i1] = [] no-op. Fine.

```python
        if i1 > L and ivs[i1 - 1][1] > hi:
            pieces.append((hi, ivs[i1 - 1][1]))
        old = sum(r[1] - r[0] for r in ivs[L:i1])
        ivs[L:i1] = pieces
        self._total += sum(p[1] - p[0] for p in pieces) - old
```

Hmm but wait — suffix condition when straddle case: ivs[i1-1][1] > hi where i1-1 might be > L (a different interval extending past hi). Fine.

One issue: in straddle case, could there also be intervals between i0 and i1 whose last extends past hi? Yes handled.

Another subtlety in add: interval with hi == lo (touching left) at start, and interval with lo == hi touching right included since bisect_right(lo-keys, hi) includes lo == hi? bisect_right gives first lo > hi, so lo == hi included in range [start, end). Yes touching right merges. Good. Also intervals inside range with lo <= hi and hi >= lo — all merge. Merged lo = min of first's lo (start's lo could be < lo), merged hi = max of last's hi. Since hi sorted, last has max hi. Good.

contains:

```python
    def contains(self, x):
        ivs = self._ivs
        i = bisect_right(ivs, x, key=_lo)
        return i > 0 and ivs[i - 1][1] > x
```

total_length: return self._total.
intervals: return [(r[0], r[1]) for r in self._ivs]. Return list of tuples.
__len__: len(self._ivs).

Verify remove touching: remove [3,5) from {[1,3),[3,5)}... wait set merges touching so it'd be [1,5). remove(3,5): i0 = first lo > 3 → index 1 ([1,5) lo=1 at 0). i0=1, ivs[0][1]=5 > 3 → L=0. i1 = first lo >= 5 → 1. i1 > L (1>0) and ivs[0][1]=5 > 5? No. pieces=[(1,3)]. ivs[0:1] = [(1,3)]. Correct.

Remove middle of interval: {[1,10)}, remove(3,5): i0 = first lo>3 → 1. ivs[0][1]=10>3 → L=0. i1 = first lo>=5 → 1. i1>L, ivs[0][1]=10>5 → pieces=[(1,3),(5,10)]. old=9, new=2+5=7, total -= 2. Correct.

Add inside gap creating merge: {[1,3),[5,6)}, add(3,5): start = first hi>=3 → index 0 (hi=3>=3). end = first lo > 5 → 2. lo=min(3,1)=1, hi=max(5,6)=6. ivs[0:2]=[(1,6)]. Correct — merges touching both sides.

contains boundary: x exactly lo of interval: bisect_right(lo, x) gives first lo > x, so interval with lo == x is at i-1 → included, hi > x (nonempty) → True. x == hi: interval with lo == hi at i-1, hi > x false → correct unless next interval contains.

Also total_length with floats keeps precision — just sums, fine.

Edge in add when start < end but also need min over first: ivs[start][0] could be > lo? start = first hi >= lo; that interval has lo >= ? could be lo_j >= lo or lo_j < lo. If lo_j < lo, min gives lo_j. Correct.

Potential issue: add where start < end but ivs[start] hi >= lo and lo_j could be > hi? No—end = first lo > hi, start < end means ivs[start].lo <= hi. OK.

Type of stored intervals: tuples for immutability; slice assign replaces list of tuples fine.

Performance check of remove/add slice assignment — fine.

One more: `intervals()` should return merged sorted disjoint — invariant holds.

Also maybe provide `__contains__` delegating? Not required but harmless. Keep minimal.

Write final code.