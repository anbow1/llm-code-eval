Need efficient add: bisect to find overlapping intervals, merge. Store sorted list of intervals (list of [lo,hi] pairs). add: find first interval with hi >= lo... Let's design.

Maintain self.ivs: sorted list of [lo, hi].

add(lo, hi):
- if lo >= hi: return
- Use bisect to find range of intervals overlapping [lo, hi): intervals with hi > lo and lo < hi. Since half-open, [a,b) overlaps [lo,hi) iff a < hi and b > lo.
- Find left index: first interval with b > lo. Since sorted by lo and intervals disjoint non-touching (we merge touching), can use bisect on lo values: idx = bisect_right(self.lo_list, lo)? Let's think.

Simpler: use a list of tuples sorted by lo, plus a parallel list of lo values for bisect.

Find i = bisect_right(self.los, lo) - 1: candidate interval starting <= lo. If that interval's hi >= lo (touching or overlapping), it overlaps. Then find j: first index with lo >= hi (bisect_left(self.los, hi)). Intervals i..j-1 overlap. But touching ones should merge too.

add:
- i = bisect_right(los, lo) - 1
- if i >= 0 and ivs[i][1] >= lo: start = min(lo, ivs[i][0]); start_idx = i; else start = lo; start_idx = i+1
- j = bisect_left(los, hi)
- end = max(hi, ivs[j-1][1]) if j-1 >= start_idx else hi... careful: intervals from start_idx to j-1 overlap/touch. new interval = (start, max(hi, last hi among those)). Replace ivs[start_idx:j] with [(start, end)].

Handle case j-1 < start_idx: no overlapping, end = hi.

Edge: if i >= 0 and ivs[i][1] >= lo — but intervals are disjoint and non-touching, so ivs[i][1] < ivs[i+1][0]. If ivs[i][1] > lo strictly, overlap; if == lo, touching, merge. Fine with >=.

But careful: ivs[i][1] >= lo includes touching. Good.

remove(lo, hi):
- i = bisect_right(los, lo) - 1
- If i >= 0 and ivs[i][1] > lo: interval i straddles lo. If ivs[i][1] > hi: split into (ivs[i][0], lo) and (hi, ivs[i][1]). If ivs[i][1] <= hi: truncate to (ivs[i][0], lo). start_idx = i+1 for removal range; handle accordingly.
- Find j = bisect_left(los, hi): intervals with lo < hi get truncated or removed. Intervals with start_idx <= idx < j and hi of those... intervals fully inside [lo,hi) removed. But interval at j-1: its lo < hi; if its hi > hi, truncate to (hi, ivs[j-1][1]).

Let me implement remove:
```
def remove(self, lo, hi):
    if lo >= hi: return
    los = self._los
    i = bisect_right(los, lo) - 1
    # left piece
    if i >= 0 and self._ivs[i][1] > lo:
        if self._ivs[i][1] > hi:
            self._ivs[i] = [self._ivs[i][0], lo]
            self._ivs.insert(i+1, [hi, ...old hi])
            update los
            return
        else:
            self._ivs[i] = [self._ivs[i][0], lo]
            if lo == ivs[i][0]: remove it? interval [a, lo) with a==lo is empty; remove.
            Actually if ivs[i][0] == lo, truncated interval empty → delete.
```
Simpler approach: compute new list of pieces.

remove:
```
i = bisect_right(los, lo) - 1
j = bisect_left(los, hi)
# overlapping (strict) intervals: those with hi > lo and lo < hi.
# interval i (if lo of it <= lo and hi > lo) overlaps
pieces = []
if i >= 0 and ivs[i][1] > lo:
    if ivs[i][0] < lo:
        pieces.append([ivs[i][0], lo])
if i >= 0 and ivs[i][1] > hi:
    pieces.append([hi, ivs[i][1]])
# middle intervals i+1..j-1: fully inside → removed. But wait, interval with lo in (lo, hi) and hi > hi? That would be interval j-1 if its hi > hi. bisect_left(los, hi) gives first lo >= hi; interval j-1 has lo < hi. If ivs[j-1][1] > hi and ivs[j-1][0] > lo, then it's partially covered: piece [hi, ivs[j-1][1]]. But we handled ivs[i][1] > hi case only for i. Need general: for k in i+1..j-1: if ivs[k][1] > hi: piece [hi, ivs[k][1]]. Since disjoint, only the last one can have hi > hi.
```
Actually with disjointness, at most one interval has hi > hi among overlapping ones, and it's the last overlapping one (index j-1 possibly). So:

```
def remove(self, lo, hi):
    if lo >= hi: return
    los = self._los
    i = bisect_right(los, lo) - 1
    j = bisect_left(los, hi)
    pieces = []
    # handle interval i (starts <= lo)
    if i >= 0 and self._ivs[i][1] > lo:
        if self._ivs[i][0] < lo:
            pieces.append((self._ivs[i][0], lo))
        if self._ivs[i][1] > hi:
            pieces.append((hi, self._ivs[i][1]))
    # intervals i+1 .. j-1 (lo in (lo,hi) strictly? lo values > lo and < hi... actually bisect_right gives first lo > lo? bisect_right(los, lo) returns insertion point after equal entries, so i is last with lo <= lo. Intervals i+1..j-1 have lo > lo and lo < hi.)
```
Wait, interval at i+1..j-1: lo > lo (since i is last with lo <= lo), and lo < hi (j is first with lo >= hi). Those intervals are strictly inside [lo, hi) on the left side. Their hi could exceed hi. Only the last such could exceed hi (disjointness). So:
```
    if j - 1 >= i + 1 and self._ivs[j-1][1] > hi:
        pieces.append((hi, self._ivs[j-1][1]))
```
Hmm but careful: if ivs[i] overlapped and ivs[i][1] > hi, then j-1's hi <= ivs[i][1]... no, j-1 has lo >= ivs[i][1]... Actually intervals disjoint: ivs[i][1] <= ivs[i+1][0]. If ivs[i][1] > hi then all intervals after i have lo >= ivs[i][1] > hi, so j = i+1, and j-1 = i. So the condition `self._ivs[j-1][1] > hi` with j-1 > i covers the case where ivs[i] doesn't extend past hi. But also j-1 could equal i if ivs[i+1]... if j-1 == i, that's handled in first block. Let me handle uniformly:

Overlap check: interval k overlaps [lo,hi) iff ivs[k][1] > lo and ivs[k][0] < hi. With i last index lo<=lo: if ivs[i][1] > lo, then ivs[i][0] <= lo < hi, overlaps. Intervals i+1..j-1: lo in (lo, hi), so they overlap (hi > lo ≥ ... their hi > lo since nonempty and hi_interval > lo_interval > lo... yes hi_interval > lo_interval > lo). So overlapping set = {i} if condition, plus i+1..j-1.

For pieces: left pieces from any interval with ivs[k][0] < lo: only possible for k = i (since ivs[k][0] > lo for k > i). Right pieces from any interval with ivs[k][1] > hi: at most one, and it's the max index overlapping, i.e., j-1 (if that overlaps). But also if j-1 == i with ivs[i][1] > hi. Combined:

```
if i >= 0 and self._ivs[i][1] > lo:
    if self._ivs[i][0] < lo:
        pieces.append((self._ivs[i][0], lo))
last = j - 1
if last >= 0 and (last > i or (last == i and self._ivs[i][1] > lo)) and last < len and self._ivs[last][0] < hi and self._ivs[last][1] > hi:
    pieces.append((hi, self._ivs[last][1]))
```
Hmm getting messy. Simpler: since j-1 overlaps iff j-1 > i or (j-1 == i and ivs[i][1] > lo)... if j-1 == i and ivs[i][1] > lo, but bisect_left(los, hi): ivs[i][0] <= lo < hi so j > i, j-1 >= i. If j-1 == i, then ivs[i+1][0] >= hi, and ivs[i] overlaps iff ivs[i][1] > lo. So:

right piece: if j-1 >= 0 and self._ivs[j-1][1] > hi: but need j-1 to overlap. ivs[j-1][1] > hi implies ivs[j-1][1] > lo, and ivs[j-1][0] < ivs[j-1][1]... does ivs[j-1][0] < hi? If ivs[j-1][1] > hi, then since ivs[j-1][0] < ivs[j-1][1], could ivs[j-1][0] >= hi? Then lo of it >= hi means j-1 >= j, contradiction (bisect_left gives first lo >= hi, so j-1 has lo < hi). So ivs[j-1][0] < hi. Good. And does ivs[j-1][1] > hi imply overlap with [lo,hi)? Need ivs[j-1][1] > lo: yes since > hi > lo. So the right-piece condition is just: j-1 >= 0 and ivs[j-1][1] > hi. But wait — if j-1 == i and ivs[i][1] > hi — fine, included. If j-1 < i? Can't happen since j > i as shown (ivs[i][0] <= lo < hi implies j >= i+1). Actually if i == -1, j >= 0 fine.

But careful: what if j-1 == i and ivs[i][1] > hi but ivs[i][1] <= lo? Impossible since hi > lo.

Left piece: need ivs[k][0] < lo and overlap: only k = i with ivs[i][1] > lo and ivs[i][0] < lo.

Then replace ivs[i+1 : j] with pieces? The intervals fully covered: i+1..j-1 removed. ivs[i] partially: handled. So:

new = ivs[:start] + pieces + ivs[j:], where start = i+1 if (i >= 0 and ivs[i][1] > lo) else i+1... hmm. If ivs[i] overlaps, it's modified (left piece) — so ivs[i] must be removed too and replaced by pieces. If ivs[i] doesn't overlap (ivs[i][1] <= lo), it stays. So:

start = i+1 if not (i >= 0 and ivs[i][1] > lo) else i. Wait if i >= 0 and ivs[i][1] > lo: ivs[i] is replaced by pieces (left piece and/or right piece). So start = i. Else start = i+1.

```
if i >= 0 and self._ivs[i][1] > lo:
    start = i
    if self._ivs[i][0] < lo:
        pieces.append((self._ivs[i][0], lo))
else:
    start = i + 1
if j - 1 >= start and self._ivs[j-1][1] > hi:  # hmm j-1 >= start check
    pieces.append((hi, self._ivs[j-1][1]))
```
Wait, need j-1 >= start for the right piece to make sense? If j-1 == i-1 (i.e., j == i), impossible since j >= i+1. If j-1 == i and start == i+1 (ivs[i] not overlapping): then ivs[i][1] <= lo < hi, so ivs[j-1][1] > hi is false. So the check ivs[j-1][1] > hi implicitly ensures overlap. So just:

```
if j - 1 >= 0 and self._ivs[j-1][1] > hi:
    pieces.append((hi, self._ivs[j-1][1]))
```
But order of pieces: left piece comes before right piece. If left piece from ivs[i] and right piece from ivs[j-1]: j-1 could be... if ivs[i][1] > hi then j = i+1, j-1 = i. Left piece condition: ivs[i][0] < lo → left piece; right piece: ivs[i][1] > hi → append after left. Order correct: left piece (ivs[i][0], lo) then right (hi, ivs[i][1]). Good.

Then self._ivs = ivs[:start] + pieces + ivs[j:] and rebuild los. But rebuilding los list each time is O(n). For performance with 60k disjoint adds: add is O(n) per op due to list insert → O(n²) = 3.6e9... too slow? 60k² = 3.6e9 ops — too slow in Python. Hmm. "60 000 add() calls of small disjoint intervals in random order" — list.insert into a list of 60k is memmove, fast in C (~microseconds?). list.insert of one element into 60k-element list: memmove of 60k pointers ≈ 480KB, ~ tens of microseconds. 60k inserts → maybe 1-3 seconds. Rebuilding parallel los list each add is O(n) Python-level? Could avoid by using bisect with key on list of tuples (Python 3.10+ bisect supports key). Use bisect with key=lambda iv: iv[0] — but key extraction is O(log n) per bisect call only (bisect with key computes key lazily per comparison? Actually it computes key for elements it inspects, O(log n) calls). That avoids parallel list.

But merging overlapping intervals in add requires slicing lists — O(n) memmove, fine in C.

add implementation with key bisect:
```
ivs = self._ivs
i = bisect_right(ivs, lo, key=lambda iv: iv[0]) - 1
```
Hmm, but for finding j, we need first interval with lo >= hi: bisect_left(ivs, hi, key=...). But for i, we want last interval with lo <= lo. However intervals disjoint non-touching: sorted by lo. Fine.

Actually alternative: since intervals non-touching, could bisect on hi values? Not sorted necessarily... hi sorted too since disjoint and sorted by lo: hi_k <= lo_{k+1} < hi_{k+1}. So both lo and hi sorted.

For add:
```
def add(self, lo, hi):
    if lo >= hi: return
    ivs = self._ivs
    if not ivs:
        ivs.append((lo, hi)); return
    i = bisect_right(ivs, lo, key=_first) - 1
    if i >= 0 and ivs[i][1] >= lo:
        start = i
        start_lo = min(lo, ivs[i][0])
    else:
        start = i + 1
        start_lo = lo
    j = bisect_left(ivs, hi, key=_first)
    end = hi
    if j - 1 >= start:
        end = max(hi, ivs[j-1][1])
```
Wait if start == i (ivs[i] touches/overlaps), j-1 >= start includes ivs[i]. end = max(hi, ivs[j-1][1]). But if j-1 == start-? If start = i+1 and j-1 = i, then ivs[i] doesn't touch (ivs[i][1] < lo... actually ivs[i][1] <= lo since not >= lo, could be == lo? No: condition was ivs[i][1] >= lo false, so ivs[i][1] < lo). And ivs[i][0] < hi? ivs[i][0] < ivs[i][1] < lo < hi. Hmm, bisect_left(los, hi): ivs[i][0] < lo < hi so j > i, j-1 >= i. If j-1 == i and start == i+1: ivs[i] doesn't overlap, don't include. So end should consider only intervals from start to j-1:

```
if j > start:
    end = max(hi, ivs[j-1][1])
else:
    end = hi
```
Hmm but also ivs[i] when start == i: ivs[i][1] >= lo; ivs[i][1] could exceed hi → end = ivs[i][1]. Covered by j-1 = i >= start. But wait, if ivs[i][1] > hi, then j: bisect_left for lo >= hi — ivs[i+1][0] >= ivs[i][1] > hi so j = i+1, j-1 = i = start. Good.

New merged interval (start_lo, end). Replace ivs[start:j] with [(start_lo, end)]:
```
ivs[start:j] = [(start_lo, end)]
```
List slice assignment — O(n) memmove, fine.

But wait: merging touching: ivs[i][1] == lo merges (>= condition). ivs[j-1][1] == hi? bisect_left: first lo >= hi. If ivs[j-1][0] < hi, it overlaps (hi_interval > lo_interval, and lo_interval < hi). If ivs[j-1][1] < hi but lo < hi, it's strictly inside → absorbed. If ivs[j][0] == hi (touching next): should we merge [lo,hi) with [hi, next)? The spec says touching intervals merged in intervals() output — but we can also merge at add time to keep canonical form. Hmm, j = bisect_left(los, hi) — interval at j has lo >= hi. If lo == hi, touching. Should we merge? If we don't merge at add, then intervals() could return touching intervals. To keep invariant "non-touching", we should extend end: if j < len and ivs[j][0] == hi: end = ivs[j][1], j += 1. Similarly left side: ivs[i][1] == lo handled. Let's extend:

```
if j < len(ivs) and ivs[j][0] == end:
    end = ivs[j][1]
    j += 1
```
Hmm, but end might have been extended beyond hi via ivs[j-1][1]. Then ivs[j][0] >= old hi... could ivs[j][0] == end? end = max(hi, ivs[j-1][1]); ivs[j][0] >= ivs[j-1][1] (non-touching: strictly >? we maintain non-touching so ivs[j][0] > ivs[j-1][1]) and ivs[j][0] >= hi. If end = ivs[j-1][1] and ivs[j][0] == ivs[j-1][1] — can't since non-touching invariant. If end = hi > ivs[j-1][1], and ivs[j][0] == hi — possible → merge. So check with end after computing. Fine:

```
end = hi if j <= start else max(hi, ivs[j-1][1])
# merge touching right
while j < len(ivs) and ivs[j][0] == end:
    end = ivs[j][1]
    j += 1
```
Actually at most one iteration due to invariant. Similarly left: handled by i condition (ivs[i][1] >= lo includes ==).

But wait: invariant "non-touching" — is it maintained by remove? remove can produce pieces [ivs[i][0], lo) and (hi, ivs[i][1]) — these don't touch since lo < hi. And pieces vs neighbors: left piece ends at lo; previous interval ivs[i-1][1] < ivs[i][0] <= lo, ok strict. Right piece starts at hi; next interval ivs[j][0] >= hi; if == hi, touching! E.g., set {[1,3),[3,5)}, remove [2,3): pieces: ivs[i] = [1,3): i=0, ivs[0][1]=3 > lo=2, left piece (1,2). j = bisect_left(los=1,3, 3) = 1. ivs[j-1]=ivs[0][1]=3 > hi=3? No, 3 > 3 false. So pieces = [(1,2)], new list [(1,2),(3,5)] — touching! Hmm. Then intervals() would show touching intervals. Need to handle: after remove, check right piece against next interval: if ivs[j][0] == hi, merge right piece with it. Or more simply, relax invariant and merge in intervals() — but then bisect assumptions... Actually the algorithms work with touching intervals too? Let's check: with touching intervals, sorted by lo still, disjoint (non-overlapping). bisect logic still fine? For add: i = last lo <= lo; ivs[i][1] >= lo — if touching neighbor [a,b) with b == lo, condition true → merge. Good. j-1 handling: if ivs[j-1][1]... Suppose touching [1,3),[3,5), add [3,4): i = bisect_right(los=[1,3], 3)-1 = 1. ivs[1][1]=5 >= 3 → start=1, start_lo=min(3,3)=3. j = bisect_left(los, 4) = 2. end = max(4, ivs[1][1]=5)=5. Replace ivs[1:2] with (3,5). Result [(1,3),(3,5)] — still touching, correct (adding [3,4) inside [3,5)). Fine.

For remove with touching intervals: consider [(1,2),(3,5)] (touching at... no, 2≠3, not touching). Consider [(1,3),(3,5)], remove [2,3): i = bisect_right(los,2)-1 = 0. ivs[0][1]=3 > 2 → start=0, left piece (1,2). j = bisect_left(los=[1,3], 3) = 1. j-1=0, ivs[0][1]=3 > hi=3? No. pieces=[(1,2)]. Result [(1,2),(3,5)]. Touching? 2 < 3, gap. Fine, no touching created. Another: [(1,3),(3,5)], remove [0,2): i = bisect_right(los=[1,3], 0)-1 = -1. start = 0. j = bisect_left(los, 2) = 1. j-1 = 0 >= start=0, ivs[0][1]=3 > 2 → right piece (2,3). Result [(2,3),(3,5)] — touching! So remove can create touching. To maintain invariant, after remove, if pieces' last end == ivs[j][0], merge. Or just allow touching invariant to break and normalize in intervals(). But contains/add/remove logic with touching intervals: does it stay correct? Touching intervals are still disjoint and sorted; the bisect logic handles them correctly as shown. The only issue is intervals() must merge touching. And total_length unaffected.

But could repeated operations accumulate many touching fragments? E.g., alternating. It's bounded by ops count. But to be safe and clean, merge after remove: after constructing pieces, if pieces and j < len(ivs) and pieces[-1][1] == ivs[j][0]: pieces[-1] = (pieces[-1][0], ivs[j][1]); j += 1. That maintains canonical non-touching invariant. Similarly left side: left piece (ivs[i][0], lo) — previous interval ivs[i-1][1] < ivs[i][0] ≤ ... strict since non-touching before? If ivs[i-1][1] == ivs[i][0] — invariant says no. But if invariant broken (touching present), left piece start = ivs[i][0] could equal ivs[i-1][1]. To be fully safe, handle both sides. Alternatively normalize: merge left piece with ivs[i-1] if touching. Since we might not have perfect invariant, let's just handle both merges in remove, and also in add the left condition ivs[i][1] >= lo already merges touching-left; right: after computing end, merge with ivs[j] while ivs[j][0] == end. But wait, in add, if ivs[j-1] doesn't reach and ivs[j][0] == hi: merge. Covered.

Hmm, actually with the invariant maintained everywhere (add merges touching on both sides; remove merges right piece with next if touching; remove left piece: could it touch ivs[i-1]? left piece starts at ivs[i][0]; ivs[i-1][1] <= ivs[i][0]; if ==, touching. When could ivs[i-1][1] == ivs[i][0]? Only if invariant already broken. With invariant maintained in add and remove-right, can remove-left create touching with previous? ivs[i-1][1] vs ivs[i][0]: unchanged from before, and invariant held before → strict. So only need right-side merge in remove. And in add, right-side merge needed? After add, end could equal ivs[j][0] — merge. Left side in add: start_lo = min(lo, ivs[i][0]) — could equal ivs[i-1][1]? ivs[i-1][1] < ivs[i][0] <= start_lo (invariant held), strict. Good.)

Wait — one more: add with start = i+1 (no left touch) and new interval (lo, ...) — could lo == ivs[i][1]? Condition ivs[i][1] >= lo was false, so ivs[i][1] < lo. Strict. Good.

Also remove where ivs[i] straddles and produces split: pieces (ivs[i][0], lo) and (hi, ivs[i][1]). Right piece vs ivs[j]: j = bisect_left(los, hi). ivs[i][1] > hi → ivs[i+1][0] >= ivs[i][1] > hi → j = i+1, ivs[j][0] > hi, no merge needed. Fine — merge check handles generally.

Also remove where hi falls exactly at boundary: covered.

Edge: remove when pieces empty and start==j: just delete slice.

Let me also handle: in remove, j-1 right-piece check needs j-1 >= start? Consider ivs = [(5,10)], remove [1,2): i = bisect_right([5],1)-1 = -1, start=0, j = bisect_left([5], 2) = 0. j-1 = -1 → no right piece, no slice. pieces empty. Result unchanged. Good. Remove [1,6): i=-1, start=0, j=0 (bisect_left([5],6)=1? los=[5], hi=6: bisect_left → 1 since 5 < 6). j=1. j-1=0 >= start=0, ivs[0][1]=10 > 6 → right piece (6,10). Result [(6,10)]. Correct.

Remove [6,7) from [(5,10)]: i = bisect_right([5],6)-1 = 0. ivs[0][1]=10 > 6 → start=0, left piece (5,6). j = bisect_left([5],7)=1. j-1=0, ivs[0][1]=10>7 → right piece (7,10). Result [(5,6),(7,10)]. Correct.

Remove [5,10): i=0, ivs[0][1]=10>5, start=0, ivs[0][0]=5 < lo=5? No left piece. j = bisect_left([5],10)=1. j-1=0: ivs[0][1]=10>10? No. pieces empty. Result []. Correct.

Now contains(x): bisect_right(los, x) - 1, check ivs[i][1] > x. With key bisect: i = bisect_right(ivs, x, key=first)-1; return i >= 0 and ivs[i][1] > x. With touching invariant maintained, correct. Even without, still correct (touching intervals: x at boundary belongs to the one starting there — bisect_right finds last lo <= x; if touching [1,3),[3,5), x=3: i=1, ivs[1][1]=5>3 → True. Correct since [3,5) contains 3).

total_length: sum(hi-lo) — O(n). Could cache but fine; maybe compute on the fly each call — spec doesn't require O(1). Keep simple: sum at call time, or maintain incrementally. Simple: compute in intervals order. Actually maintain a running total for O(1)? total_length maybe called often. I'll compute sum each call — fine, or maintain self._total. Let's maintain incremental total to be nice: on add: delta = end - start_lo - sum of removed lengths; on remove similar. Simpler: compute total_length() as sum(hi-lo for lo,hi in ivs). O(n) per call. Acceptable. But cheap to maintain; I'll just compute on demand.

__len__: len(self._ivs).

intervals(): return [tuple] — with invariant non-touching, just return list of tuples. But to be extra safe against touching (shouldn't happen), could merge defensively — but O(n) merge loop each call. Since invariant maintained, just return [(lo, hi) for ...]. Actually let me double check the add right-touching merge: after computing end, loop:
```
while j < len(ivs) and ivs[j][0] == end:  # wait, need to compare with end after potential extension
```
Hmm, actually if end was extended to ivs[j-1][1], then ivs[j][0] > ivs[j-1][1] = end (invariant), loop doesn't run. If end == hi and ivs[j][0] == hi: merge → end = ivs[j][1], j += 1; then check again: ivs[j+1... next][0] == new end? invariant says no. One iteration max. Use while for safety.

Use tuples in the list for immutability; slice assignment with tuples fine.

bisect with key: `from bisect import bisect_right, bisect_left`. key=lambda iv: iv[0] — bisect supports key since 3.10. Define module-level function `_lo_key(iv): return iv[0]` for speed.

Performance: 60k adds: each add does 2 bisects (O(log n) with key — key computed per comparison, fine) plus one slice assignment O(n) memmove — C speed. 200k contains: O(log n) each. Total well under 5s.

Note: bisect with key on list of tuples: comparisons use key values. lo/hi may be int/float mixed — comparisons work.

One subtlety in add: computing start_lo and the case i >= 0 and ivs[i][1] >= lo. Also need start index: if ivs[i] overlaps/touches, start = i else start = i+1. But careful: what if ivs[i][1] >= lo but ivs[i][0]... always ivs[i][0] <= lo (by bisect_right). start_lo = ivs[i][0] (min with lo, but ivs[i][0] <= lo so just ivs[i][0]). Actually ivs[i][0] <= lo always here, so start_lo = ivs[i][0].

Also in add: j could be <= start? j >= i+1 always (since ivs[i][0] <= lo < hi). If start = i+1, j >= i+1 = start. If start = i, j >= i+1 > i = start... wait j >= i+1 because bisect_left(los, hi): ivs[i][0] <= lo < hi so los[i] < hi → j > i. So j > i >= start-? if start = i, j >= i+1 > start. So j > start always? If start = i+1, j >= i+1 = start, could be j == start (no overlapping intervals). So:

```
if j > start:
    end = max(hi, ivs[j-1][1])
else:
    end = hi
```
Then right-touch merge loop. Then ivs[start:j] = [new]. Hmm but if we merged right-touch (j incremented), slice ivs[start:j] includes merged interval. Good.

Wait, but if j > start, ivs[j-1] overlaps [lo,hi)? ivs[j-1][0] < hi (by j def) and ivs[j-1][1] > ivs[j-1][0]... need ivs[j-1][1] > lo: for j-1 > i, lo of it > lo... its hi > its lo > lo. For j-1 == i (start == i case), ivs[i][1] >= lo. OK.

Also, must handle i when ivs[i][1] >= lo but... ivs[i][1] could be > hi — end = max handles.

remove full code:

```
def remove(self, lo, hi):
    if lo >= hi:
        return
    ivs = self._ivs
    i = bisect_right(ivs, lo, key=_lo) - 1
    if i >= 0 and ivs[i][1] > lo:
        start = i
        pieces = []
        if ivs[i][0] < lo:
            pieces.append((ivs[i][0], lo))
    else:
        start = i + 1
        pieces = []
    j = bisect_left(ivs, hi, key=_lo)
    if j - 1 >= start and ivs[j-1][1] > hi:
        pieces.append((hi, ivs[j-1][1]))
    # merge right piece with following touching interval
    if pieces and j < len(ivs) and pieces[-1][1] == ivs[j][0]:
        pieces[-1] = (pieces[-1][0], ivs[j][1])
        j += 1
    ivs[start:j] = pieces
```
Hmm wait, condition `j - 1 >= start and ivs[j-1][1] > hi` — earlier I argued just `j-1 >= 0 and ivs[j-1][1] > hi` suffices since ivs[j-1][1] > hi implies overlap and j-1 >= start. If j-1 == i and start == i+1 (ivs[i][1] <= lo): ivs[j-1][1] = ivs[i][1] <= lo < hi, condition false anyway. So `j-1 >= 0 and ivs[j-1][1] > hi` — but j-1 could be < start only when j-1 == i and start == i+1, which fails the hi check. So just use the hi check with j-1 >= 0. But also j-1 might equal i with ivs[i][1] > hi and start == i: covered.

Wait one more subtle: if j-1 >= start is false but ivs[j-1][1] > hi... shown impossible. Fine, I'll include `j > start and ivs[j-1][1] > hi` — hmm if j-1 == i-1? j >= i+1 shown? j >= i+1 requires ivs[i][0] < hi: ivs[i][0] <= lo < hi yes. So j >= i+1, j-1 >= i. If start == i+1, j-1 == i possible with ivs[i][1] > hi? ivs[i][1] > hi > lo contradicts ivs[i][1] <= lo. OK safe with either guard. Use `if j - 1 >= 0 and self._ivs[j-1][1] > hi`.

Hmm, but there's still a correctness check: ivs[j-1][1] > hi but is ivs[j-1][0] < hi? Yes by bisect_left definition (los[j-1] < hi). And overlap requires ivs[j-1][1] > lo: yes. Good.

Also left piece touching previous: pieces[0] = (ivs[i][0], lo); ivs[i-1][1] vs ivs[i][0]: invariant non-touching → strict. But if invariant somehow broken... we maintain it, fine. Actually to be extra safe add merge-left too? Let's keep code clean; invariant is maintained by our ops.

Verify invariant maintenance in remove when pieces empty and start < j: slice deleted; ivs[start-1] and ivs[j] adjacency: ivs[start-1][1] <= lo (if start-1 == i, ivs[i][1] <= lo) < hi <= ivs[j][0]. If ivs[j][0] == hi and ivs[start-1][1] == lo → touching across the gap! E.g., ivs = [(1,3),(3,5)], remove [3,3)? lo>=hi ignored. Remove [2,3): i: bisect_right(los=[1,3], 2)-1 = 0. ivs[0][1]=3 > 2 → start=0, left piece (1,2). j = bisect_left(los, 3) = 1. j-1=0: ivs[0][1]=3 > 3? No. pieces=[(1,2)]. Right-merge: pieces[-1][1]=2 == ivs[1][0]=3? No. Result [(1,2),(3,5)]. Not touching. Good.

Remove [3,4) from [(1,3),(3,5)]: i = bisect_right(los=[1,3],3)-1 = 1. ivs[1][1]=5 > 3 → start=1, left piece: ivs[1][0]=3 < 3? No. pieces=[]. j = bisect_left(los,4)=2. j-1=1: ivs[1][1]=5 > 4 → right piece (4,5). Right-merge: pieces[-1][1]=5, j=2 >= len → no. Result [(1,3),(4,5)]. Good, non-touching.

Remove [1,4) from [(1,3),(3,5)]: i=0, ivs[0][1]=3>1, start=0, ivs[0][0]=1 < 1? No left piece. j=bisect_left(los,4)=2. j-1=1: ivs[1][1]=5>4 → right piece (4,5). Result [(4,5)]. Good.

Remove [1,5) from [(1,3),(3,5)]: i=0, start=0, no left piece. j = bisect_left([1,3],5)=2. j-1=1: ivs[1][1]=5>5? No. pieces=[]. Result []. Good.

Add touching-merge test: [(1,3)], add [3,5): i = bisect_right([1],3)-1 = 0. ivs[0][1]=3 >= 3 → start=0, start_lo=1. j = bisect_left([1],5)=1. j>start → end=max(5, ivs[0][1]=3)=5. right-touch: j=1 >= len → no. ivs[0:1] = [(1,5)]. 

Add [(1,5)], add [0,1): i = bisect_right([1],0)-1 = -1. start=0, start_lo=0. j = bisect_left([1],1)=0. j==start → end=1. right-touch: ivs[0][0]=1 == end=1 → merge: end=5, j=1. Result [(0,5)]. 

contains: implement.

intervals(): return [(lo, hi) for lo, hi in self._ivs]. Since stored as tuples already, could return list(self._ivs) — but stored tuples, list of tuples; fine. Return a new list.

total_length(): return sum(hi - lo for lo, hi in self._ivs).

Store as list of tuples. Slice assignment on list of tuples fine.

_lo helper: `def _lo(iv): return iv[0]`.

Edge: empty set — bisect on empty list returns 0; i = -1; handled.

Write final code.