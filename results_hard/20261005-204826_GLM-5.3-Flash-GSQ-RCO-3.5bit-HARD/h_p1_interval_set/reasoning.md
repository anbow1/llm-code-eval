Implement IntervalSet with bisect on sorted list of starts. Add/remove with merging. Use bisect to find position; for performance with 60k adds of disjoint intervals in random order... inserting into a Python list is O(n) per insert, 60k inserts → 60k²/2 = 1.8e9 element moves... Actually list.insert memmove is fast in C (~1.8e9 * small constant... memmove of pointers, 8 bytes each, 1.8GB moved total, ~ maybe 0.5-1s). Actually average shift is n/2, total shift = 60000²/2 = 1.8e9 pointer moves — memmove at ~10GB/s → ~0.15s? memmove of 1.8e9 bytes*8... wait each element is 8 bytes; average shift 30000 elements * 8 bytes = 240KB per insert, 60k inserts = 14.4GB moved. At ~10 GB/s → ~1.4s. Hmm, borderline but "well under 5 seconds" — should be fine. Plus contains 200k bisect calls trivial.

But careful: random order disjoint small intervals — insertion position random. Alternative: use two parallel lists (starts, ends) or a flat list alternating? Simplest: store list of [lo, hi] pairs. Each insert shifts pointers. Should be OK.

Implementation:

- _lo: list of interval starts, _hi: list of ends. Or list of tuples? bisect on list of pairs compares tuples — fine if starts unique (disjoint intervals have unique starts). Use lists of starts and ends separately to avoid tuple comparison overhead? bisect needs key. Use bisect_right on _lo with x.

add(lo, hi):
- if lo >= hi: return
- Find overlapping range: left = bisect_right(_lo, lo) - 1 → candidate interval ending that might cover lo. Check if left >= 0 and _hi[left] >= lo (interval contains lo or touches). Since half-open touching merges: [a,b) + [b,c) → merge if _hi[left] >= lo? For merging touching intervals, we merge when hi == lo. So condition: left >= 0 and _hi[left] >= lo.

Hmm careful: intervals are disjoint and non-touching (after normalization, _hi[left] < _lo[left+1] strictly? No — we merge touching, so between stored intervals there's a gap: _hi[i] < _lo[i+1]). So _hi[left] <= lo is... if _hi[left] >= lo then overlap or touch. Also right side: first interval with _lo >= lo is at index left+1... intervals with start < hi: j = bisect_left(_lo, hi)? Intervals [s,e) with s < hi overlap/touch. Since touching merges, any interval with s <= hi and _hi >= ... Let's compute:

i = index of first interval with start >= lo... Actually:

start = bisect_right(_lo, lo) - 1. If start >= 0 and _hi[start] >= lo, then interval start overlaps/touches [lo,hi). Otherwise new_lo = lo, else new_lo = _lo[start] (min). Wait if _hi[start] >= lo, the interval could begin before lo: new_lo = min(lo, _lo[start]) = _lo[start] since _lo[start] <= lo? bisect_right(_lo, lo)-1 gives _lo <= lo. Yes _lo[start] <= lo, so new_lo = _lo[start].

end side: k = bisect_right(_lo, hi) - 1? Last interval with start <= hi... Hmm, intervals with start <= hi: those are potential merge (touching: [hi, e) touches). Actually interval [s,e) with s == hi touches [lo,hi) at hi. And s < hi overlaps. Intervals with s > hi don't. So last relevant index = bisect_left(_lo, hi)? Hmm: we want intervals with _lo <= hi. That's indices < bisect_right(_lo, hi). But also need _hi >= lo — all intervals after `start` (inclusive) have _hi > _lo >= lo... wait if interval start index s where _lo[s] >= lo? Intervals between: those with _lo in (lo, hi] — do they all need merging? An interval with _lo >= lo and _lo <= hi and _hi... interval [s,e) with lo <= s <= hi: it overlaps or touches [lo,hi) iff s <= hi. Since s <= hi yes it touches/overlaps (they share point or s==hi touching). Actually if s <= hi and interval contains s... interval is [s, e), e > s. Union [lo,hi) ∪ [s,e): if lo <= s <= hi, they're connected (touching counts). So merge all intervals with _lo <= hi and index >= start-ish.

So:
- i0 = bisect_right(_lo, lo) - 1
- if i0 >= 0 and _hi[i0] >= lo: first = i0 else first = i0 + 1 (i.e., bisect_right(_lo, lo)).
  Actually bisect_right(_lo, lo) gives first interval with _lo > lo. So first candidate index = that, minus possible i0.
- last = bisect_right(_lo, hi) - 1  (last index with _lo <= hi). But also need _hi[last]... if _lo[last] <= hi, merged. But what if _lo[last] <= hi but interval entirely... [s,e) with s <= hi < e overlaps; s <= hi, e > s. Union connected. But wait need s <= hi and also the union region must connect: interval [lo,hi) plus [s,e) where lo<=s<=hi — connected. But if s < lo? Then i0 covers. Fine.

Hmm but also: intervals with _lo <= hi but index < first are irrelevant (they end before lo due to gap).

- merged interval: if first > last: no existing intervals merged; new_lo, new_hi = lo, hi; insert at position first (which equals bisect_right(_lo, lo)). Wait if first > last, then no interval has _lo <= hi beyond... hmm, need insert index. first = bisect_right(_lo, lo) when i0 invalid. Then insert at first.

  If first <= last: new_lo = lo if i0 < first... Let's unify: if i0 >= 0 and _hi[i0] >= lo: first = i0, new_lo = _lo[i0], else first = bisect_right(_lo, lo), new_lo = lo.
  last = bisect_right(_lo, hi) - 1; if last >= first: new_hi = max(hi, _hi[last]) else new_hi = hi.
  
  Hmm but new_hi: last interval with _lo <= hi. Its _hi may be > hi or < hi. If _hi[last] > hi, extends. But careful: what about intervals whose _lo <= hi but whose end < lo? Only i0 could (gap property). Since intervals after first have _lo >= ... if first = i0+1, then _lo[first] > lo, fine.

  Also after merging, must the merged interval not touch the next interval? new_hi = _hi[last]; next interval index last+1 has _lo > _hi[last] strictly? Gap property holds among old intervals: _lo[last+1] > _hi[last]. And new_hi = max(hi, _hi[last]). Could hi touch interval last+1? If _lo[last+1] == hi... but then _lo[last+1] <= hi, so last+1 <= last contradiction since bisect_right(_lo, hi) includes elements with _lo <= hi. So no. Good — gap property maintained.

- Delete intervals first..last (if last >= first): del _lo[first:last+1]; del _hi[first:last+1]. Then insert new interval at first: _lo.insert(first, new_lo); _hi.insert(first, new_hi).

  Wait but when last >= first, insert position first. When no merging (last < first), insert at position first = bisect_right(_lo, lo). Correct ordering: new_lo = lo < _lo[first]? bisect_right gives first index with _lo > lo, yes. And _hi[first-1]... previous interval ends < lo? Since i0 invalid means _hi[i0] < lo, i.e., previous interval ends strictly before lo — gap maintained. Good.

remove(lo, hi):
- if lo >= hi: return
- i0 = bisect_right(_lo, lo) - 1; first = i0+1 if i0 < 0 or _hi[i0] <= lo else i0. Wait: interval i0 overlaps [lo,hi) iff _hi[i0] > lo (since half-open: interval [s,e) intersects [lo,hi) iff s < hi and e > lo). If _hi[i0] > lo, we need to trim it possibly. If _hi[i0] <= lo, no effect.
  Overlapping intervals: those with _lo < hi and _hi > lo.
  first overlapping index: if i0 valid and _hi[i0] > lo: first = i0 else first = bisect_right(_lo, lo) — hmm intervals with _lo == lo and _hi > lo: bisect_right(_lo, lo) skips _lo == lo? bisect_right returns index after all _lo <= lo, so intervals with _lo == lo are at index bisect_right-1... Let me just do: first = index of first interval with _hi > lo. Since _hi isn't sorted necessarily? _hi is increasing? Intervals disjoint sorted: _hi[i] <= _lo[i+1] < _hi[i+1], yes _hi is strictly increasing. But easier to search on _lo: first interval with _lo >= ... hmm.

  Simple: use i0 approach. Let j = bisect_left(_lo, hi) → first index with _lo >= hi. Intervals overlapping/touching [lo,hi): indices from max(bisect_right(_lo, lo)-1, ...) ... Overlap requires _lo < hi and _hi > lo. Intervals with index < j have _lo < hi. Among those, which have _hi > lo? i0 and possibly i0..j-1. Since gaps: for i >= first_overlap, _hi[i] > _lo[i] > lo? If interval i has _lo[i] > lo then _hi[i] > _lo[i] > lo, so overlaps (given _lo < hi). So overlapping indices: from first = (i0 if _hi[i0] > lo else i0+1) through j-1. Note intervals with _lo == lo: index of them is bisect_left... they have _lo == lo < hi and _hi > lo, they overlap. bisect_right(_lo, lo) - 1 would be the last one with _lo == lo; but disjoint intervals can't both have _lo == lo unless empty... can't. So at most one interval starts at lo, it's at bisect_right(_lo,lo)-1 = i0 possibly. Hmm, if interval starts exactly at lo, i0 = that index (bisect_right gives index after it), and _hi[i0] > lo (nonempty), so first = i0. Good.

  Edge: what about interval with _lo == hi? Not overlapping (_lo < hi required), excluded — correct since [hi, e) doesn't intersect [lo,hi). But does removing need to touch-merge? No, remove just deletes; gap property: remaining intervals still fine.

  Overlap range: first..j-1 where j = bisect_left(_lo, hi)? Wait intervals with _lo < hi: indices < bisect_right? bisect_left(_lo, hi) gives first with _lo >= hi. So overlapping candidates indices: first .. j-1. But is every interval in first..j-1 overlapping? For i in (first, j-1], _lo[i] > _lo[first... ] hmm: _lo[i] >= _lo[first+1] > lo? If first = i0 (overlapping via _hi > lo), then intervals i0+1..j-1 have _lo > lo? _lo[i0+1] > _hi[i0] > lo yes. So all overlap. If first = i0+1 = bisect_right(_lo, lo)... _lo[first] > lo? bisect_right(_lo,lo) gives first _lo > lo? bisect_right returns insertion point after equal elements, so _lo[first] > lo. Yes. And _lo < hi for indices < j, so overlaps (nonempty interval, _hi > _lo > lo and _lo < hi). 

  Now the trimming: 
  - If i0 valid and _hi[i0] > lo (first == i0): left piece [ _lo[i0], lo ) if _lo[i0] < lo. Since i0 = bisect_right(_lo, lo)-1... wait could i0 have _lo[i0] == lo? Then no left piece. Left piece when _lo[i0] < lo: replace interval i0 with [_lo[i0], lo). And right piece: last overlapping interval k = j-1 (if j-1 >= first): if _hi[k] > hi, right piece [hi, _hi[k]).
  - Also handle: what if j-1 < first? Then no intervals fully... still left piece and right piece from i0 possibly: if first == i0 and j-1 < first means i0 not < j, i.e., _lo[i0] >= hi. But _hi[i0] > _lo[i0] >= hi and _hi[i0] > lo — interval spans? No: _lo[i0] >= hi means interval [s,e) with s >= hi, but then overlap requires s < hi — contradiction. Hmm wait j = bisect_left(_lo, hi), i0 has _lo[i0] <= lo (bisect_right(_lo,lo)-1). _lo[i0] <= lo < hi, so _lo[i0] < hi always, so i0 < j always when i0 exists. OK so if first == i0, j-1 >= i0 = first. Fine.

  Cases:
  - left piece: if first == i0 and _lo[i0] < lo: left = (_lo[i0], lo).
  - right piece: if j-1 >= first and _hi[j-1] > hi: right = (hi, _hi[j-1]).
  - Also if first == i0 and _lo[i0] == lo: no left piece, interval i0 just gets trimmed/deleted as part of range.
  
  Deletion: delete indices first..j-1. But careful: if first == i0 and we keep a left piece, we should replace i0's entry rather than delete then insert. Approach: 
  - Collect pieces.
  - Replace slice _lo[first:j], _hi[first:j] with the pieces (left piece then right piece — left only at beginning, right only at end).
  
  Using slice assignment: _lo[first:j] = [new entries]. If left piece: _lo[first] stays as _lo[i0] with _hi changed to lo. Simpler:

  if first == i0 and _lo[i0] < lo: keep left piece → the replacement slice starts with (_lo[i0], lo). Else replacement starts possibly with right piece.
  
  Implementation:
  pieces_lo, pieces_hi = [], []
  if first < j:
      if first == i0 and _lo[first] < lo:
          pieces: (_lo[first], lo)
      if j-1 >= first and _hi[j-1] > hi:
          pieces: (hi, _hi[j-1])
      _lo[first:j] = pieces_lo; _hi[first:j] = pieces_hi
  else:
      # no overlapping intervals in [first, j)? Can that happen? first = i0+1, j >= first? Intervals with _lo in (lo, hi): could be none; j could equal first. Then nothing to do.
      pass

  Wait check: when first = i0 + 1 and no intervals with lo < _lo < hi... j = bisect_left(_lo, hi) = first, nothing deleted. But what about interval i0 partially covered? _hi[i0] <= lo in that case (since first = i0+1 when i0 invalid or _hi[i0] <= lo). If _hi[i0] == lo, touching, no intersection. Fine.

  Hmm one more: when first == i0 and _lo[i0] == lo (interval starts exactly at lo): left piece condition _lo[first] < lo fails, so interval i0 is deleted (it's in range first..j-1 since i0 < j). Good, fully or partially covered: right piece handles partial.

  Also the case first == i0, _lo[i0] < lo, and _hi[i0] > hi (interval spans entire [lo,hi)): j-1: j = bisect_left(_lo, hi); _lo[i0] < lo < hi so j > i0, j-1 >= i0. Is j-1 == i0? Only if _lo[i0+1] >= hi. _hi[j-1] = _hi[i0] > hi → right piece. Left piece too. Result: [_lo, lo), [hi, _hi). Correct.

contains(x): i = bisect_right(_lo, x) - 1; return i >= 0 and _hi[i] > x.

intervals(): list(zip(_lo, _hi)).

total_length: sum(h - l for ...). Could maintain incrementally but summing 60k is fine; total_length called rarely.

__len__: len(_lo).

Gap invariant: after add, ensure no touching merge — verified above. But initial invariant: intervals stored must satisfy _hi[i] < _lo[i+1]? Wait — after add merging, new_hi = max(hi, _hi[last]); check vs next interval _lo[last+1]: old gap _hi[last] < _lo[last+1], and hi < _lo[last+1]? Since j = bisect_right(_lo, hi) for add... in add I defined last = bisect_right(_lo, hi) - 1, i.e., last index with _lo <= hi. Interval last+1 has _lo[last+1] > hi. Good, so hi < _lo[last+1], gap holds.

Also in add: check `first` when i0 invalid: first = bisect_right(_lo, lo)? Hmm I said first = i0+1 which equals bisect_right(_lo,lo). Then last could be >= first. new_lo = lo, new_hi = max(hi, _hi[last]) if last >= first. And insert at position... after deleting first..last, insert at first. Correct since new_lo = lo < _lo[first]... wait after deletion, elements shift; _lo[first] after deletion was _lo[last+1] originally, which > hi >= lo. Good.

Edge in add: what if last < first but there's an interval with _lo == hi? last = bisect_right(_lo, hi) - 1 — with _lo == hi it's included, so last >= index of that interval. If interval [_lo==hi, e) exists and no other overlap: first = bisect_right(_lo, lo) — is first <= last? _lo[first] > lo; interval at last has _lo == hi > lo, so its index >= first. Actually bisect_right(_lo, lo) <= index of any interval with _lo > lo, and last is the last with _lo <= hi; interval with _lo == hi is the last such (unique). So first <= last. Merged: new_hi = max(hi, _hi[last]) = _hi[last]. Touching merge achieved. Good.

In remove: touching intervals [.., lo) removed? No — removal shouldn't merge. But invariant is gaps strictly (never touching), and removal preserves: we delete whole intervals or split with pieces [_lo, lo) and [hi, _hi). Piece left ends at lo, next remaining interval starts at... after deletion, interval after j-1 has _lo >= hi... wait _lo[j] >= hi (bisect_left). Left piece [_lo, lo) followed by remaining interval starting >= hi > lo... gap fine. Right piece starts at hi, previous remaining interval ends <= lo... The interval before first: i0 with _hi[i0] <= lo (if first != i0). Gap fine. If first == i0 and left piece kept, no issue. Between left piece end lo and right piece start hi — gap. Good.

But wait, one more remove edge: what if first == i0, _lo[i0] < lo, left piece; AND j-1 > i0, _hi[j-1] > hi right piece. Slice replacement _lo[i0:j] = [ _lo[i0], hi ]; _hi[i0:j] = [ lo, _hi[j-1] ]. Good.

What if j-1 == i0 but _hi[i0] <= hi (interval partially covered on left only): pieces = [ (_lo[i0], lo) ] only; slice _lo[i0:j] where j = i0+1: replaced by single piece. Correct.

Hmm, one subtle remove bug: when first == i0 condition. I determine first: i0 = bisect_right(_lo, lo) - 1. If i0 >= 0 and _hi[i0] > lo: first = i0 else first = i0 + 1 = bisect_right(_lo, lo). But careful: interval with _lo == lo? bisect_right(_lo, lo) - 1 gives last index with _lo <= lo. Since at most one interval can start at lo (disjoint), and any interval with _lo == lo would be at exactly bisect_right-1. Yes.

But could there be an interval with _lo < lo and _hi > lo other than i0? No — i0 is the only interval whose range could contain lo from the left (previous ones end before _lo[i0]... gap). Intervals with index < i0 have _hi < _lo[i0] <= lo. Right.

Also possible: interval with _lo == lo but i0 points to interval with _lo < lo? If interval starts exactly at lo, _lo == lo <= lo, bisect_right(_lo, lo) - 1 = its index (since previous intervals have _lo < lo). So i0 is that interval. Good.

Now add: also check — after add, could first computed as i0 miss an interval that touches [lo,hi) from left with _lo... no, done.

Also what about interval where _hi[i0] >= lo in add includes touching: _hi[i0] == lo → merge (touching merge desired). Yes add merges touching, condition _hi[i0] >= lo correct. And intervals after: _lo[s] <= hi merges touching at right. Correct per spec ([1,3)+[3,5) → [(1,5)]).

Performance of add: list del slice + two inserts. Each O(n) memmove. 60k adds → acceptable.

Could optimize using single flat list or array module? Floats/ints mixed... Keep simple lists.

One micro-optimization for contains: local binding. Fine.

Also handle lo >= hi ignore — includes equal.

Let me also double check add when i0 >= 0 and _hi[i0] >= lo but _hi[i0] could be... also last might be < i0? last = bisect_right(_lo, hi) - 1 >= i0 since _lo[i0] <= lo <= ... wait _lo[i0] <= lo < hi (hi > lo), so bisect_right(_lo, hi) > i0... _lo[i0] <= lo < hi means _lo[i0] <= hi, so i0 <= last. Good.

Write code:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_lo", "_hi")

    def __init__(self):
        self._lo = []
        self._hi = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        _lo, _hi = self._lo, self._hi
        i0 = bisect_right(_lo, lo) - 1
        if i0 >= 0 and _hi[i0] >= lo:
            first = i0
            new_lo = _lo[i0]
        else:
            first = i0 + 1
            new_lo = lo
        last = bisect_right(_lo, hi) - 1
        if last >= first:
            new_hi = hi if _hi[last] < hi else _hi[last]
            del _lo[first:last + 1]
            del _hi[first:last + 1]
        else:
            new_hi = hi
        _lo.insert(first, new_lo)
        _hi.insert(first, new_hi)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        _lo, _hi = self._lo, self._hi
        i0 = bisect_right(_lo, lo) - 1
        if i0 >= 0 and _hi[i0] > lo:
            first = i0
        else:
            first = i0 + 1
        j = bisect_left(_lo, hi)
        if j <= first:
            return
        pieces_l, pieces_h = [], []
        if first == i0 and _lo[first] < lo:
            pieces_l.append(_lo[first]); pieces_h.append(lo)
        if _hi[j - 1] > hi:
            pieces_l.append(hi); pieces_h.append(_hi[j - 1])
        _lo[first:j] = pieces_l
        _hi[first:j] = pieces_h

    def contains(self, x):
        i = bisect_right(self._lo, x) - 1
        return i >= 0 and self._hi[i] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Check remove early-return when j <= first: could j < first? first = i0 possibly, j > i0 always (shown). first = i0+1: j could be == first or less? j = bisect_left(_lo, hi); i0+1 = bisect_right(_lo, lo) <= ... elements with lo < _lo < hi exist? If none, j = bisect_left... hmm. first = i0+1 means either i0 < 0 or _hi[i0] <= lo. j: first index _lo >= hi. Is j >= first? Intervals with _lo <= lo: indices <= i0. first = i0+1 is first with _lo > lo. j >= first iff no interval with _lo in... intervals with index in [first, j) have lo < _lo < hi. j < first would mean _lo[first] >= hi, i.e., no interval starts in (lo, hi). Then j <= first → return... but wait, if j == first exactly: fine, return (nothing overlaps). Can j < first? j >= first? _lo[first] > lo; if _lo[first] >= hi then j <= first. j is first index with _lo >= hi; first is first index with _lo > lo. If _lo[first] >= hi, then indices >= first all have _lo >= hi? _lo sorted, yes, so j <= first. And j >= first? j >= first iff... j could be < first only if _lo[first-1] >= hi, but _lo[first-1] = _lo[i0] <= lo < hi (if i0 >= 0). If i0 < 0, first = 0, j >= 0 = first. So j >= first always. So j <= first → j == first → no overlap, return. Correct.

Hmm, remove edge: first == i0 but _hi[i0] > lo and interval [s,e) with s < lo < hi < e? covered. With s <= lo... covered.

But wait: remove case first == i0, _lo[i0] < lo, left piece appended. Also j-1 could be > i0 and _hi[j-1] > hi: right piece. Slice replace length j-first replaced by 2 pieces. Good. But what if j-1 == i0 and _hi[i0] > hi: pieces = [(_lo, lo), (hi, _hi[j-1])] both appended — but wait, is _hi[j-1] == _hi[i0] here? j-1 == i0 means j == i0+1, j = bisect_left(_lo,hi) = i0+1 means _lo[i0] < hi <= _lo[i0+1] (or i0 last). _hi[j-1] = _hi[i0]. Right piece (hi, _hi[i0]) valid since _hi[i0] > hi. But the original interval is [s, e) with s < lo and e > hi: it fully contains [lo,hi). Result: [s, lo) and [hi, e). Correct.

Remove also: could there be intervals overlapping that start >= hi? No, excluded correctly (they don't intersect [lo,hi))... but touching: an interval [hi, e) — removing [lo,hi) shouldn't affect it; j = bisect_left skips _lo == hi. Good. Interval ending exactly at lo: _hi == lo, first = i0+1 skips (condition _hi[i0] > lo strict). Good — removal doesn't merge, [a,lo) stays, gap invariant fine since next intervals start >= hi > lo... wait after removal, interval before gap ends at lo? Left piece ends at lo, and the previous interval i0 has _hi[i0] > lo originally... hmm, scenario: intervals [1,2), [5,6), remove [2,5): i0 = index of [1,2), _hi = 2 > lo=2? No, 2 > 2 false → first = i0+1. j = bisect_left(_lo, 5) = 1. j == first → return. [1,2) and [5,6) remain. Good.

Scenario: [1,3), [3.5,5), remove [2,4): i0 = 0, _hi=3 > 2 → first=0. j = bisect_left(_lo, 4) = 1. pieces: first==i0, _lo[0]=1 < 2 → left (1,2). _hi[j-1]=_hi[0]=3 > 4? No. Replace slice [0:1] with (1,2). Result [1,2), [3.5,5). Correct.

Add merge test: [1,3), [3,5) added separately: add(1,3): empty, insert (1,3). add(3,5): i0 = index of (1,3) (bisect_right([1],3)-1=0), _hi=3 >= 3 → first=0, new_lo=1. last = bisect_right([1],5)-1 = 0. new_hi = max(5, 3) = 5. del [0:1], insert (1,5). 

Add gap test: [1,2), add [3,5): i0=0, _hi=2 >= 3? No → first=1. last = bisect_right([1],5)-1 = 0 < 1 → new_hi=5, insert at 1. Correct.

contains on boundary: contains(3) with [1,3): i=0, _hi=3 > 3 false → False. Correct half-open.

total_length with floats fine.

Performance: 60k random disjoint inserts — each add does bisect (O(log n)) + del slice + insert (O(n) memmove). ~60k * avg 30k*8 bytes... total ~14GB memmove worst case (random order, avg shift n/2). Hmm 60k adds, at step k shift k/2 elements → total sum k/2 ≈ 60k*30k = 1.8e9 elements = 14.4 GB memmove. memmove speed ~ maybe 5-20 GB/s → 0.7-3s. Plus contains trivial. "well under 5 seconds" — probably OK, but could optimize by storing in a single list alternating lo,hi? Same shift amount. Alternative: could reduce by using two lists (already doing). Or store intervals as flat array... same.

Alternative optimization: insert both lo and hi with one combined operation? Two inserts = two memmoves. Could interleave into one list of pairs? Tuples in one list: one memmove but tuple allocation. Or store in one flat list with pairs adjacent: insert needs two insert ops anyway (insert lo at pos 2i, hi at 2i+1)... slice assignment on flat list: _flat[first2:last2] = [new_lo, new_hi] — one memmove. And bisect needs a key or we bisect on a separate starts view... can't view. Could use bisect with a custom class? Use bisect_left with key= requires building generator — costly.

Simplest reliable: two parallel lists. Fine.

Actually could reduce memmove by noting del+insert: when last >= first, del then insert does two memmoves; could combine with slice assignment: _lo[first:last+1] = [new_lo] — one memmove! Similarly _hi. Let's do that:

if last >= first:
    _lo[first:last+1] = [new_lo]
    _hi[first:last+1] = [new_hi]
else:
    _lo.insert(first, new_lo)
    _hi.insert(first, new_hi)

Wait but slice assignment replacing 1+ elements with 1 element: yes one memmove (shrinks/shifts tail left then... actually list slice assignment does a single memmove adjusting). Better.

Hmm, but careful: when last >= first, insert position after replacement is first — the assignment puts new_lo at index first, shifting subsequent left. Correct.

Also remove: slice assignment already.

Edge: floats and ints mixed fine. NaN? Ignore.

Also `total_length` — sum of hi-lo. For ints returns int; fine.

Also need `__len__`. Also maybe `__contains__`? Not required but harmless to add? Spec lists methods; I'll add __contains__ delegating to contains for convenience — optional. Keep it.

Double-check add when set empty: i0 = -1, first = 0, last = -1 → insert at 0. Good.

One more check in add: `new_hi = hi if _hi[last] < hi else _hi[last]` — but also if last >= first but the last interval's _hi < hi and... fine.

Wait, subtle: in add, `last = bisect_right(_lo, hi) - 1` — last index with _lo <= hi. But should merging include an interval with _lo == hi? Yes (touching). bisect_right includes equality. Good. But what about interval with _lo <= hi but entirely before lo and not overlapping i0? Only possible for indices <= i0; if first == i0 then included via i0. If first == i0+1, indices <= i0 have _hi <= lo... _hi[i0] < lo (strict since condition failed... condition `_hi[i0] >= lo` failed → _hi[i0] < lo). And earlier intervals end even earlier. So none merges. Good.

Also add: what if there's an interval [lo equal to some _hi touching from right side] — handled.

I think done. Also ensure merging chain: e.g., intervals [1,2),[4,5), add [2,4): i0=0,_hi=2>=2 → first=0,new_lo=1. last = bisect_right([1,4],4)-1 = 1. new_hi = max(4,_hi[1]=5)=5. Replace slice [0:2] with (1,5). Correct.

Add [2.5, 3.5) into [1,2),[4,5): i0=0, _hi=2 >= 2.5? No → first=1, new_lo=2.5. last = bisect_right([1,4],3.5)-1 = 0 < 1 → insert at 1: (2.5,3.5). Good.

contains O(log n). Good.

Final code.