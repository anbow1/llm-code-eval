Design: sorted list of disjoint merged intervals [lo, hi). Use bisect on list of los, but removals/additions in middle are O(n) shifts — 60k adds of disjoint intervals in random order: inserting into list is O(n) each, 60k^2/2 = 1.8e9 shifts... too slow? List insert shifts are memmove, fast C-level; 60k inserts average shift 30k elements each → 1.8e9 element moves but memmove is very fast, maybe ~1-2 seconds. Actually memmove of pointers: 30000*8 bytes = 240KB per insert average, 60k inserts → ~14 GB of memory copying. That's maybe 1-2 seconds. Hmm, risky but likely acceptable "well under 5 seconds". Alternatively use a skip structure or keep gaps... Simpler: use bisect with a sorted list; merging intervals where add merges with neighbors.

Alternative: store intervals in a list sorted by lo; for add, find range of intervals overlapping or touching [lo,hi): those with hi >= lo and lo <= hi (touching merge). Use bisect on los to find left candidate: last interval with lo <= hi could touch if its hi >= lo. We need intervals with hi >= lo; since intervals are disjoint and sorted, hi is also increasing. Use bisect on los: find idx of first interval with hi >= lo. Since hi sorted increasing too, we can bisect on los to find position where lo would go, then check neighbor before.

Implementation:

self._starts = list of lo, self._ends = list of hi, parallel. Use bisect_right(_starts, lo) etc. For add(lo,hi): find i = bisect_right(starts, lo) - 1... Let's just work with list of [lo, hi] pairs and bisect using a key. Python 3.11 bisect doesn't support key? Actually bisect supports key since 3.10. Yes, bisect functions accept key parameter from 3.10. So self._ivs list of [lo,hi], key=lambda iv: iv[0].

add(lo,hi):
- if lo>=hi: return
- i = bisect_left(starts, lo, key=first) — first interval with start >= lo. Check interval i-1: if its end >= lo, it overlaps/touches → include from i-1. Actually touching merge: interval with end == lo touches. Also intervals with start <= hi and end >= lo overlap. So range: j = index of first interval with start > hi (bisect_right(starts, hi)). Then overlapping/touching intervals are indices [i0, j) where i0 = j-left... compute: i0 = bisect_left(starts, lo) ; if i0>0 and ends[i0-1] >= lo: i0 -= 1. Then j = bisect_right(starts, hi, key) but careful: intervals with start == hi touch? Interval [a, hi) and adding [lo, hi) — [a,hi) end==hi, new hi==hi: merged [a, hi)? merged is [min lo, max hi) = [lo, hi). They touch since a's end == hi == new... wait touching means end == start of next. New interval [lo, hi); interval [a, hi) has end hi. Does [hi, ...) exist? Not relevant. Merging [a,hi) with [lo,hi): union is [a, hi) if lo >= a... if lo < a: union [lo, hi) if lo..a covered? [lo,hi) covers [lo,a) and [a,hi) covers [a,hi), together [lo,hi), contiguous. Yes merge. So j should include intervals with start <= hi (touching at hi means start == hi merges since interval [hi, x) and new end hi: new interval covers up to hi, [hi,x) starts at hi — union [lo, x). Yes merge). So j = bisect_right(starts, hi). Then merged lo = min(lo, starts[i0]) if i0<j else lo; merged hi = max(hi, ends[j-1]) if j>i0 else hi. Replace slice.

But also need hi > merged candidates: new interval with start==hi merges with interval starting at hi. Yes.

Edge: also interval i0-1 with end >= lo — but what if ends[i0-1] < lo and starts[i0] ... fine.

Wait also touching on the left: interval with end == lo merges (end >= lo includes ==). Good.

remove(lo,hi):
- if lo>=hi return
- i0 = bisect_left(starts, lo) ; j = bisect_left(starts, hi) — intervals with start < hi overlap partially. Overlapping intervals: those with end > lo and start < hi. First: i0-1 if ends[i0-1] > lo. Last: j-1 if starts[j-1] < hi (always since start < hi). Handle:
  - left partial: if i0>0 and ends[i0-1] > lo: that interval [s, e) with s < lo (since start < lo by bisect_left... starts[i0-1] < lo) becomes [s, lo).
  - right partial: interval with start < hi but end > hi becomes [hi, end).
  Remove fully covered intervals between.

Implementation: 
j = bisect_right? Let's compute: intervals fully inside [lo,hi): start >= lo and end <= hi → remove. Partial on left: end > lo, start < lo. Partial on right: start < hi, end > hi, start >= lo possibly.

Simpler approach:
i = bisect_left(starts, lo) — first start >= lo.
k = bisect_left(starts, hi) — first start >= hi. Intervals i..k-1 have start < hi, start >= lo, so they overlap [lo,hi) (since end > start >= lo... end > lo yes). Their ends may be <= hi (fully removed) or > hi (trim to [hi, end)).

Left neighbor i-1: if i>0 and ends[i-1] > lo: trim to [starts[i-1], lo). Then if also ends[i-1] > hi? Can't: ends[i-1] <= starts[i]... starts[i] >= lo, but ends[i-1] could exceed hi if starts[i] > hi? ends[i-1] <= starts[i]. If ends[i-1] > hi then starts[i] > hi, so k == i, and interval i-1 spans whole [lo,hi): becomes [starts[i-1], lo) and [hi, ends[i-1]).

Build new pieces:
pieces = []
if i>0 and ends[i-1] > lo:
    pieces.append([starts[i-1], lo])
    if ends[i-1] > hi: pieces.append([hi, ends[i-1]])
elif i>0 and ends[i-1] > hi:  # can't happen without end>lo... ends[i-1] > hi implies > lo. covered above.
Right side: for interval k-1 (last with start < hi): if it's not i-1 and ends[k-1] > hi: pieces.append([hi, ends[k-1]]). Actually intervals i..k-1 with end > hi: only possibly the last one (ends increasing). So:
if k > i and ends[k-1] > hi: pieces.append([hi, ends[k-1]]) — but careful if i-1 == k-1 handled above; when k>i, k-1 >= i, distinct from i-1. But also the interval k-1 might have end <= hi → fully removed, no piece.
Wait if k == i: intervals i..k-1 empty; the interval i-1 handles everything.

Then replace slice i-1..k (or i..k) with pieces. The removed region indices: from max(i, i-1 if trimmed) ... Let me define: remove indices i..k-1 always (they're fully or partially covered: they have start >= lo... wait do intervals i..k-1 necessarily overlap? start >= lo and start < hi, end > start >= lo, so end > lo, yes overlaps [lo, hi)). Plus possibly trim i-1. So:

lo_idx = i
pieces pre = []
if i > 0 and ends[i-1] > lo:
    lo_idx = i - 1
    pieces.append([starts[i-1], lo])
mid removal: indices lo_idx..k-1 replaced.
pieces post: if k > i and ends[k-1] > hi: pieces.append([hi, ends[k-1]])
Hmm but if lo_idx == i-1 (trimmed left neighbor) and k-1 == i-1 too (k==i), then pieces has left part, and right part condition k>i false; need right part from ends[i-1] > hi: handled: if ends[i-1] > hi add [hi, ends[i-1]]. In my code above I added it inside the if. But if k > i and also i-1 trimmed with ends[i-1] > hi? ends[i-1] <= starts[i], and k>i means starts[i] <= hi (since bisect_left(starts,hi) > i means starts[i] < hi). So ends[i-1] <= starts[i] < hi, can't exceed hi. Fine.

So:
```
def remove(self, lo, hi):
    if lo >= hi: return
    s, e = self._s, self._e
    i = bisect_left(s, lo)
    k = bisect_left(s, hi)
    pieces = []
    lo_idx = i
    if i > 0 and e[i-1] > lo:
        lo_idx = i - 1
        pieces.append([s[i-1], lo])
    if k > lo_idx and k > i and e[k-1] > hi:
        pieces.append([hi, e[k-1]])
    elif k == i and lo_idx == i-1 and e[i-1] > hi:
        pieces.append([hi, e[i-1]])
```
Hmm getting messy; combine: right piece needed if there exists a covered interval with end > hi. Covered intervals are indices max(i, lo_idx)..k-1. The max end among them is e[k-1] if k-1 >= max(i, lo_idx). If k == i and lo_idx == i-1, the covered one is i-1 with e[i-1]. So:

if k - 1 >= lo_idx and k - 1 >= i:
    last = k-1; if e[last] > hi: pieces.append([hi, e[last]])
But when k == i and lo_idx == i-1: k-1 = i-1 = lo_idx < i? k-1 >= i fails (k-1 = i-1 < i). So handle separately. Let me just write:

if k > i:
    # covered intervals i..k-1
    if e[k-1] > hi: pieces.append([hi, e[k-1]])
elif lo_idx == i-1 and e[i-1] > hi:
    pieces.append([hi, e[i-1]])

And when k == i and lo_idx == i (no left trim): nothing.

Then s[lo_idx:k] = [p[0] for p in pieces]; e[lo_idx:k] = [p[1] for p in pieces]. Using parallel arrays avoids key bisect overhead and tuple creation.

Actually simpler: store two parallel lists _lo, _hi and use bisect on _lo directly. contains(x): i = bisect_right(_lo, x) - 1; return i >= 0 and _hi[i] > x. O(log n). 

total_length: sum(h - l for ...) O(n). Fine, or maintain incrementally. Keep simple: compute; but 60k adds each triggering... total_length only when called. Fine.

add: 
```
def add(self, lo, hi):
    if lo >= hi: return
    s, e = self._lo, self._hi
    i = bisect_left(s, lo)
    # left touching/overlap: interval i-1 with e[i-1] >= lo
    start = i
    new_lo, new_hi = lo, hi
    if i > 0 and e[i-1] >= lo:
        start = i - 1
        new_lo = s[i-1]
    j = bisect_right(s, hi)
    if j > start:
        if e[j-1] > new_hi: new_hi = e[j-1]
    s[start:j] = [new_lo]
    e[start:j] = [new_hi]
```
Check j: intervals with start <= hi merge (touching at hi: [hi, x) merges). bisect_right(s, hi) gives first index with s > hi, so indices start..j-1 have s <= hi. They overlap since their e > s >= ... e >= s, and e > lo? If interval index start = i (s[i] >= lo): does it overlap [lo,hi)? s[i] <= hi and e[i] > s[i] >= lo → yes overlaps. If start = i-1: e[i-1] >= lo → overlaps/touches. Good. And j > start guaranteed? If start = i-1, j >= i > start. If start = i and no intervals merged: j could equal i → s[i:i] insert. Fine. Also need new_hi = max(hi, e[j-1]) — but if j == start (only when start==i==j), no e. Handled by j > start check.

Edge: merged new interval might now touch next interval after j? e[j-1] vs s[j]: since set was disjoint non-touching (we merge on add), s[j] > e[j-1] and also s[j] > hi (by bisect_right). New hi = max(hi, e[j-1]) < s[j]. Good. Similarly left: new_lo could equal... e[start-1] < s[start] = new_lo? If start = i-1, e[start-1] <= s[start] and disjoint → e[start-1] < s[start] = new_lo unless equal... we ensure merging touching, so e[start-1] < new_lo strictly? e[i-2] < s[i-1] = new_lo yes since non-touching invariant. Good, invariant maintained.

But wait: initial check for i-1 uses e[i-1] >= lo (touching merge). And j uses s <= hi (touching). So intervals() with touching merged. Good.

contains: i = bisect_right(s, x) - 1; return i >= 0 and e[i] > x. For x == s of some interval: bisect_right gives index after it, i points to it, e[i] > x true (nonempty). Good. Half-open: x == e[i] → false. Good.

Performance concern: 60k add of small disjoint intervals in random order → insertions at random positions in lists of growing size up to 60k. Each insert shifts ~30k elements avg = 240KB memmove ×2 lists ×60k = ~29 GB copying... that might be ~3-5 s? Hmm. memmove speed ~10 GB/s → ~3 s. Risky. Also bisect calls cheap. Plus slice assignment for single-element replace: same shift cost.

Alternative: only shift when inserting in middle; random order means average shift n/2. 60000 adds: total shifts = sum ~ n/2 over n=0..60k = 9e8 elements ×2 lists ×8 bytes = 14.4 GB. At ~20GB/s memmove maybe 0.7-1.5s. Contains 200k × O(log n) trivial. Should be well under 5s. Probably fine.

Could reduce with storing single list of tuples and one bisect with key — one memmove instead of two, but tuple objects; shifting pointers same size. Actually one list of [lo,hi] lists: shift 2 pointers per element vs 2 lists 1 pointer each — same total. Using key in bisect adds per-call overhead but fine.

I'll use parallel lists of floats/ints — simplest and fast.

Also consider using `array` module? Values may be ints or floats mixed; array('d') would convert ints to float — "keep original values". So use plain lists.

Write final code:

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
        s, e = self._lo, self._hi
        i = bisect_left(s, lo)
        start = i
        if i > 0 and e[i - 1] >= lo:
            start = i - 1
            lo = s[i - 1]
        j = bisect_right(s, hi)
        if j > start and e[j - 1] > hi:
            hi = e[j - 1]
        s[start:j] = [lo]
        e[start:j] = [hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        s, e = self._lo, self._hi
        i = bisect_left(s, lo)
        k = bisect_left(s, hi)
        start = i
        pieces_lo = []
        pieces_hi = []
        if i > 0 and e[i - 1] > lo:
            start = i - 1
            pieces_lo.append(s[i - 1])
            pieces_hi.append(lo)
            if e[i - 1] > hi:
                pieces_lo.append(hi)
                pieces_hi.append(e[i - 1])
        if k > i:
            if e[k - 1] > hi:
                pieces_lo.append(hi)
                pieces_hi.append(e[k - 1])
        s[start:k] = pieces_lo
        e[start:k] = pieces_hi

    def contains(self, x):
        s, e = self._lo, self._hi
        i = bisect_right(s, x) - 1
        return i >= 0 and e[i] > x

    def total_length(self):
        return sum(h - l for l, h in zip(self._lo, self._hi))

    def intervals(self):
        return list(zip(self._lo, self._hi))

    def __len__(self):
        return len(self._lo)
```

Check remove edge: k == i and no left trim → nothing removed, correct (removal range inside gap or exactly matching... e.g., remove [5,6) when intervals [1,3),[7,9): i = bisect_left(s,5)=1, k = bisect_left(s,6)=1, i-1: e[0]=3 > 5? no → nothing. Good.

Remove exactly an interval [3,5) with set {[3,5)}: i = bisect_left([3],3)=0, k = bisect_left([3],5)=1. i>0 false. k>i: e[0]=5 > 5? no. s[0:1]=[] removed. Good.

Remove [3,5) from [1,7): i = bisect_left([1],3)=1, k= bisect_left([1],5)=1. i>0, e[0]=7>3 → pieces [1,3],[5,7] (e>hi). s[1:1] = pieces → inserted at position 1. Result [1,3),[5,7). Good.

Remove [0,4) from [1,3),[5,7): i=bisect_left([1,5],0)=0, k=bisect_left([1,5],4)=1. k>i: e[0]=3>4? no. s[0:1]=[] → removes [1,3). Good.

Remove [4,6) from [1,3),[5,7): i = bisect_left(...,4)=1, k=bisect_left(...,6)=2. i>0: e[0]=3>4? no. k>i: e[1]=7>6 → piece [6,7]. s[1:2]=[6], e=[7]. Result [1,3),[6,7). Good.

Remove [0,10) from [1,3),[5,7): i=0,k=2, no pieces, removes both. Good.

Add touching left: set {[1,3)}, add [3,5): i = bisect_left([1],3)=1; e[0]=3>=3 → start=0, lo=1. j = bisect_right([1],5)=1. j>start(0): e[0]=3>5? no. s[0:1]=[1], e=[5]. → (1,5). Good.

Add [0,1) to {[1,3)}: i=bisect_left([1],0)=0; i>0 false. j=bisect_right([1],1)=1. j>0: e[0]=3>1 → hi=3. s[0:1]=[0], e=[3] → [0,3). Good.

Add inside: {[1,5)} add [2,3): i=bisect_left([1],2)=1; e[0]=5>=2 → start=0, lo=1. j=bisect_right([1],3)=1; e[0]=5>3 → hi=5. Replace [0:1] with [1],[5]. Good.

Add overlapping two: {[1,3),[5,7)} add [2,6): i=bisect_left([1,5],2)=1; e[0]=3>=2 → start=0, lo=1. j=bisect_right([1,5],6)=2; e[1]=7>6 → hi=7. s[0:2]=[1], e=[7]. Good.

contains boundary x==hi of interval: e[i] > x false. Good. x equal to lo of next: bisect_right puts i at that interval, e[i] > x true. Good.

intervals returns tuples via zip — list of tuples. Good.

total_length returns number. Fine.

One more remove edge: remove [2,4) from {[3,5)}: i=bisect_left([3],2)=0; i>0 false. k=bisect_left([3],4)=1. k>i: e[0]=5>4 → piece [4,5]. s[0:1]=[4]. Result [4,5). Correct.

Remove [2,3) from {[3,5)}: i=0, k=bisect_left([3],3)=0. k==i, no left trim (i>0 false). Nothing. Correct.

Done.