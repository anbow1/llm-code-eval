Implement with sorted list of intervals and binary search. Use `bisect` on a list of (lo, hi). Since 60,000 adds of disjoint intervals — but adds may be in random order; insertion into a Python list is O(n) per insert, so worst-case 60,000*60,000/2 = 1.8e9... but list.insert is memmove, fast; 60000 inserts at random positions — memmove cost ~ 60000*60000*8 bytes = 28.8 GB moved... actually that's too slow? memmove of 60000 pointers ≈ 240KB per insert... wait 60000 pointers * 8 bytes = 480KB, total ~ 60000 * 240KB avg = 14.4 GB moved. At ~10 GB/s that's ~1.4 s. Borderline but probably acceptable; "well under 5 seconds". Hmm, could be risky. Alternative: use the fact intervals are disjoint — merge logic with bisect and list.insert. 14 GB memmove at maybe 20-30 GB/s (L2/L3) → maybe 0.5-1.5s. Probably fine.

Alternative: maintain sorted list lazily, rebuild on intervals()/len? But add needs merging for correctness... Actually we could delay merging: add appends raw interval to a pending list, and compacts when pending exceeds size. But remove needs sorted structure too; can flush pending first. Contains can check pending linearly? That's O(pending) — 60000 adds then 200000 contains... contains with pending linear scan: 200000 * pending. If we compact before contains... contains is O(log n) requirement. Simpler: just do direct sorted list with insort. The bisect.insort on list of tuples works since disjoint intervals in random order... insort compares (lo,hi) tuples; lo values distinct mostly. Fine.

But careful: tuples with ints/floats comparable. Use keys = separate list of los? Simpler: maintain `self._starts` (list of lo) and `self._ends`? Two lists double memmove cost but each smaller... same total. Just keep single list of [lo, hi] lists; insertion uses list.insert with bisect on lo list. Actually to avoid tuple comparison issues, keep two parallel lists: los and his, bisect on los. Then insert into both lists. That's 2 memmoves but each list is simple; total same data.

Merging: find position using bisect_right(los, hi) ... let me think.

Set: disjoint half-open intervals. Add [lo,hi):

Let i = bisect_left(los, lo) — first interval with start >= lo. Actually intervals overlapping [lo,hi) are those with start < hi and end > lo.

Compute:
- left: check interval at index i-1 (if i>0): if his[i-1] > lo (i.e., >= lo since disjoint... touching allowed? If his[i-1]==lo it's touching [lo, hi) — merge). We merge touching intervals per intervals() spec: touching merged anyway. Since we merge on add, stored intervals never touch. So if his[i-1] > lo → overlaps. new_lo = min(lo, los[i-1]).
- right: j = i; while j < len and los[j] < hi: extend. But careful with touching: if los[j] == hi exactly → touches but doesn't overlap; merging touching is fine and spec says merged. So condition los[j] <= hi? If los[j] == hi, interval [los[j], his[j]) touches [lo,hi) at hi; merge into [lo, his[j]). Since stored intervals are already coalesced touching, merging is consistent. So j = bisect_right(los, hi)... hmm need to also handle: use j = first index with los[j] > hi. Then intervals i..j-1 have los[j-1] <= hi. If los[j-1] == hi, it touches, absorb. new_hi = max(hi, his[j-1]) if j>i else hi. But need j>i check: if no interval with start <= hi, new_hi = hi. But careful: interval i-1 might have start < lo but end > hi.

Wait the i-1 check: his[i-1] > lo means overlap (since los[i-1] < lo because bisect_left(los, lo) gives first los >= lo... if los[i-1] == lo then bisect_left would be i-1? bisect_left returns first index where los[index] >= lo, so los[i-1] < lo). Yes.

So:
```
i = bisect_left(los, lo)
new_lo, new_hi = lo, hi
if i > 0 and his[i-1] >= lo:  # touching or overlapping (his[i-1] > lo means overlap; == lo touching)
    new_lo = los[i-1]
    i -= 1
j = bisect_right(los, hi)  # first index with los[j] > hi
if j > i:
    new_hi = max(new_hi, his[j-1])
else:
    new_hi = hi  # but wait if j==i and i was decremented...
```

Hmm, careful with the decrement: after decrementing i, j computed relative. Let me not decrement: let i0 = bisect_left(los, lo). Overlap/touch on left if i0>0 and his[i0-1] >= lo → new_lo = los[i0-1], start removal at i0-1.

Right side: intervals with los[k] < hi overlap; los[k] == hi touches. bisect_right(los, hi) gives first index with los > hi. Indices i0..j-1 have los <= hi. Those with los == hi touch only. Absorb all i0..j-1 (and possibly i0-1 if overlapping). Wait, intervals between i0-1 and i0: only one candidate on the left. Intervals strictly inside [lo, hi): those with los in [lo, hi) plus handled left one. All intervals with los in [i0, j) where los < hi overlap fully? An interval [los[k], his[k]) with los[k] < hi — does it overlap [lo,hi)? It overlaps if his[k] > lo. Since stored intervals disjoint and sorted and the left case handled: for k >= i0 with los[k] < hi, his[k] > los[k] >= lo? los[k] >= lo since i0 is first los >= lo. his[k] > los[k] (nonempty intervals) so his[k] > lo... los[k] >= lo, his[k] > los[k] >= lo, so his[k] > lo → overlap. Good. For los[k] == hi: touching → absorb (extends via his[k] > hi... actually new_hi = max(hi, his[j-1])).

Also left touching case: his[i0-1] == lo → interval [a, lo) touches [lo, hi) → should merge. And his[i0-1] > lo → overlap. So condition his[i0-1] >= lo covers both. Then new_lo = los[i0-1].

Edge: i0-1 exists with his[i0-1] >= lo. But wait, what if los[i0-1] < lo but his[i0-1] == lo: touch; merge fine.

So:
```
start = i0
if start > 0 and his[start-1] >= lo:
    start -= 1
    new_lo = los[start]
```
Hmm careful: if start>0 and his[start-1] >= lo, then also need to include index start-1 in removal range; then continue checking start-1? No — disjointness means no further merging left since previous intervals end before los[start-1]... his[start-2] <= los[start-1] <= new_lo... touching again possible? his[start-2] <= los[start-1]; if his[start-2] == los[start-1] == new_lo then intervals were touching and should already have been merged. Since we maintain merge invariant, stored intervals are pairwise non-touching: his[k] < los[k+1]. OK so single left check fine.

j = bisect_right(los, hi) — first with los > hi.
if j > i0:
    new_hi = max(hi, his[j-1])
    end = j
else:
    end = i0
    # but left check already handled: if his[i0-1] >= lo then start=i0-1
Then remove los[start:end], his[start:end] and insert new_lo/new_hi at start.

Wait but when j > i0 and no left overlap: start = i0. Removal covers all intervals with los in [lo, hi] — those overlapping plus touching ones. Good.

But subtlety: when j == i0 (no intervals with los <= hi within [i0..)), and his[i0-1] <= lo (no overlap), nothing merged. Good.

Hmm, but also: if left interval has his[i0-1] > hi? Can't happen if disjoint... his[i0-1] <= los[i0] but that doesn't bound vs hi. his[i0-1] could exceed hi: e.g., stored [0, 10), add [3,5). Then i0 = bisect_left(los=[0], lo=3) = 1. his[0]=10 >= 3 → start=0, new_lo=0. j = bisect_right(los, 5) = 1 > i0(=... wait j>i0? i0=1 here, start=0). Need end computed with start: end = max(j, start)? Let's recompute: after start decrement, j must be >= start. j = bisect_right(los, hi) = 1, start = 0, so range [0,1) removed, new_hi = max(hi=5, his[0]=10) = 10. Good. But what if j < start? Can j be less than start after decrement? start = i0-1 only when his[i0-1] >= lo, and then j >= i0 = start+1? j = bisect_right(los, hi), hi <= lo... lo < hi always (we ignore lo>=hi). hi > lo → bisect_right(los, hi) >= bisect_left(los, lo)... hmm bisect_right(los, hi) >= bisect_left(los, lo) since hi > lo. Actually bisect_right for larger key >= bisect_left for smaller. So j >= i0. And j >= i0 >= start. If i0-1 == start case, j >= i0 = start+1 > start. But is j > start guaranteed? j >= i0 >= start+1 when decremented; when not decremented j could equal i0 (then no right merge, new_hi = hi). And when j == i0 == start (not decremented), range empty — but then we still insert new interval. Need to handle: if start < end → replace slice; else → insert.

Wait when j == i0 and not decremented: start = end = i0, insert [lo, hi) at position i0. Correct.

When j == i0 and decremented (his[i0-1] >= lo): start = i0-1, end = j = i0 > start. new_hi: intervals in [start, end) = [i0-1, i0): his[i0-1] >= lo but is it >= hi? new_hi = max(hi, his[j-1]=his[i0-1]). Since his[i0-1] > lo and... could his[i0-1] > hi? his[i0-1] <= los[i0] and los[i0] >= lo... hmm los[i0] >= lo doesn't constrain. E.g., stored [0,5), [7,9); add [3, 4)? i0 = bisect_left([0,7], 3) = 1. his[0]=5 >= 3 → start=0, new_lo=0. j = bisect_right([0,7], 4) = 1. end=1. Removed [0,5). new_hi = max(4, 5) = 5. Result [0,5), [7,9). Correct.

Remove [lo, hi): stored invariant. Find overlapping intervals: those with his[k] > lo and los[k] < hi. i0 = bisect_left(los, lo)
Left partial: i0-1 with his[i0-1] > lo → keep [los[i0-1], lo], then possibly tail [hi, his[i0-1]] if his[i0-1] > hi.
Middle: k with los[k] >= lo and los[k] < hi → fully removed (his[k] > los[k] >= lo? overlap needs his[k] > lo; since los[k] < hi and his[k] > los[k]... does interval with los[k] < hi overlap [lo,hi)? need his[k] > lo. los[k] could be < lo with his[k] > lo — those overlap. Intervals with los in [lo, hi): all have his > los >= lo, so overlap, fully covered since his could exceed hi → partial right. Handle right partial: j = bisect_left(los, hi)? First index with los >= hi. Intervals with los[j]... hmm.

Let me define for remove:
- iL = bisect_left(los, lo): first los >= lo.
- Left split candidate: k = iL-1 if his[iL-1] > lo (strict, since touching at lo doesn't get removed: [a, lo) ∩ [lo, hi) empty... wait [a, lo) vs remove [lo,hi): half-open, point lo belongs to [lo,hi), but [a,lo) excludes lo. Disjoint. So need his[i0-1] > lo).
- iR = bisect_left(los, hi)? Intervals with los < hi and los >= lo: indices [iL, iR) where iR = bisect_left(los, hi) gives first los >= hi. All these overlap [lo, hi) (los < hi, his > los >= lo ≥... his > los and los >= lo → his > lo ✓). Among them, the last (iR-1) may have his > hi → right fragment [hi, his[iR-1]].
  But also iL-1 case may have his > hi → right fragment too.
- Right split candidate: interval with los[k] < hi but his[k] > hi: that's k = iR-1 (since los[iR-1] < hi). If his[iR-1] > hi → fragment.
  Also the left candidate iL-1 could be the same as iR-1 (when iL-1 = iR-1, i.e., one interval spanning both) — handle carefully.

Implementation for remove:
```
i = bisect_left(los, lo)
j = bisect_left(los, hi)   # first los >= hi
# overlap removal range: indices k where interval overlaps [lo,hi):
#   los[k] < hi and his[k] > lo
# candidates: k in [i, j) fully inside (los in [lo,hi))... plus k = i-1 if his[i-1] > lo.
new = []
start = i
if i > 0 and his[i-1] > lo:
    start = i - 1
    if his[i-1] > hi:
        new.append((los[i-1], lo))
        new.append((hi, his[i-1]))
    else:
        new.append((los[i-1], lo))
# right fragment from j-1 (if j-1 >= i):
if j > i and his[j-1] > hi:
    new.append((hi, his[j-1]))
```
Hmm but left candidate and the [i,j) middle: if his[i-1] > hi then i-1 spans everything; then j would be... if his[i-1] > hi and intervals disjoint sorted, los[i] >= his[i-1] > hi, so j <= i... j = bisect_left(los, hi) <= i since los[i] > hi → first los >= hi could be i or earlier? los[i-1] < lo < hi so j >= i. los[i] >= his[i-1] > hi, so los[i] > hi → bisect_left(los, hi) = i (if los[i] is first > hi and los[i-1] < hi). Can j-1 >= i here? j = i so j > i false. And his[j-1] = his[i-1] > hi → would append duplicate fragment! But condition `j > i` guards it: j == i so no. But then right fragment only from the left-branch which I handle. Good.

Also careful: what if his[i-1] > lo but i-1 == j-1... j >= i always (lo < hi → bisect_left(lo) <= bisect_left(hi)). If his[i-1] > hi case, j == i handled. If his[i-1] <= hi (and > lo): append (los[i-1], lo) and interval [i-1] fully consumed? [los[i-1], his[i-1]) minus [lo, hi): since his[i-1] <= hi → remainder [los[i-1], lo). Yes handled. But then right fragment from j-1: j-1 >= i, distinct index. OK.

Then replace los[start:j] with new fragment items. Fragments: each fragment is a (lo2, hi2); maintain parallel lists. Use del los[start:j], del his[start:j], then insert fragments at start in order.

Note: fragments count 0, 1, or 2. And when his[i-1] > hi: appended left fragment (los[i-1], lo) and right (hi, his[i-1]). But wait, could there also be intervals in [i, j) overlapping? If his[i-1] > hi, los[i] >= his[i-1] > hi... hmm los[i] >= his[i-1] because non-touching invariant: his[k] < los[k+1]. So los[i] > hi → j <= i, and j >= i, so j == i. Consistent — no middle intervals. But if invariant has touching merged, his[k] < los[k+1] strictly? Touching merged means his[k] != los[k+1]; since intervals disjoint and sorted, los[k+1] >= his[k]; merged means los[k+1] != his[k] → los[k+1] > his[k]. Can los[k+1] < his[k]? No, disjoint. Actually can los[k+1] == his[k]? Then touching — our merge on add absorbs touching. But do all operations maintain it? Remove: fragments (los[i-1], lo) and (hi, his[i-1]) — the fragment ends exactly at removed boundaries, could create touching with neighbors? E.g., stored [0,5),[8,10); remove [5,8) → no-op removal (no overlap with... [5,8) vs [0,5): disjoint; vs [8,10): disjoint) → intervals remain [0,5), [8,10) touching? They don't touch (gap). Stored intervals could touch after remove? [0,5), [8,10), remove [5,8) which isn't in set... removal only removes overlaps; it never creates new adjacency between previously separated intervals... Remove [0,10) from {[0,5)... wait stored [5,10) only, remove [0,10) → removes it. Could remove produce [a, lo) fragment adjacent... fragments end at lo or start at hi. Existing kept intervals: those with his <= lo (end before lo... his[i-1] <= lo → strictly < lo? his[i-1] > lo case handled; == lo means interval [a, lo) kept, and fragment? No fragment created when his[i-1] <= lo... in the "else" branch we append (los[i-1], lo) only when his[i-1] > lo. When his[i-1] == lo, no overlap, interval kept as-is, and it's outside removed range [start=j..)? i = bisect_left(los, lo), his[i-1] == lo... interval [los[i-1], lo) kept. Any fragment adjacent? Fragment (hi, ...) starts at hi > lo. Left fragments (los[i-1], lo) only when overlap. So after removal, kept [a, lo) and fragments end at lo... could a kept interval [a, lo) coexist with fragment (something, lo)? No: fragment left only from overlap which requires his[i-1] > lo, and that interval is i-1, removed/replaced. Hmm, intervals before i-1 end before los[i-1]. So no new touching created among kept fragments? Kept intervals are: all k < i-1 possibly (their his < los[i-1]), maybe [los[i-1], lo) fragment, then fragments (hi, his[j-1]) possibly, then k >= j (los[k] >= hi). Touching between fragment (los[i-1], lo) and next kept/f fragment: next is either fragment (hi, ...) — hi > lo, gap — or los[j] >= hi. Fine. Right fragment (hi, his[j-1]): next kept interval k >= j has los[k] >= hi; could los[j] == hi? j = bisect_left(los, hi), los[j] could be == hi! Then kept interval [hi, ...) and fragment [hi, his[j-1]) → touching! But wait: if los[j] == hi then interval [hi, his[j]) doesn't overlap removed region? Remove [lo, hi): [hi, x) doesn't overlap [lo,hi) (half-open: hi not in [lo,hi)). Correct, not removed, but it touches fragment [hi, his[j-1]). That violates "touching merged" invariant!

Does that matter? Invariant is used in add logic (I claimed stored intervals strictly non-touching). If remove can create [0,3), [3,5) touching... then add's bisect logic may mis-handle? Let's check: does add handle touching stored intervals correctly? The invariant matters in remove's left check "his[i-1] > lo": with touching intervals, there might be chains. E.g., stored [0,3), [3,5) (touching — shouldn't happen if invariant kept). If we ensure remove merges, fine. Let's make remove merge touching fragments: when fragment (hi, his[j-1]) and los[j] == hi → instead of keeping separate, extend fragment to (hi, ...)? Hmm, but los[j] == hi case: interval [hi, his[j]) — could just absorb into fragment: (hi, his[j])? But then his[j] == los[j+1]? Chain again. Simpler: since los[j] == hi means j' = bisect... Actually if los[j] == hi, does it matter for removal? [hi, his[j]) not removed. But fragment adjacency → merge: change fragment to (hi, max(his[j-1], his[j]))? But interval [hi, his[j]) would then be removed from list and fragment covers it. Chain: his[j] == los[j+1]? Then los[j+1] == his[j]... but if invariant holds before removal, los[j+1] > his[j]. So only one step needed... but if los[j] == hi exists it means pre-existing touching [something before? no—] hmm. If invariant held before remove, then can los[j] == hi with fragment at hi arise? Fragment at hi arises only if his[j-1] > hi. Then los[j] >= his[j-1] > hi, so los[j] > hi. So j = bisect_left(los, hi), if los[j] == hi then his[j-1] <= hi; fragment requires his[j-1] > hi → contradiction. So fragment at hi and kept interval starting at hi can't both... wait fragment requires his[j-1] > hi; kept interval at index j has los[j] == hi; disjointness: los[j] >= his[j-1] → hi >= his[j-1], contradiction with his[j-1] > hi. So no touching arises if invariant holds. 

But does the invariant strictly hold before? Only if add and remove maintain "no touching". Add merges touching (absorbs los[k] == hi and his[i-1] == lo cases). Remove: shown left fragment (los[i-1], lo): previous kept interval k' < i-1... wait left fragment exists when his[i-1] > lo; is los[i-1] adjacent to interval i-2? los[i-1] > his[i-2] by invariant. Fragment starts at los[i-1], previous interval ends his[i-2] < los[i-1] → gap. OK. And kept right intervals: k >= j with los[k] >= hi; fragment ends his[j-1] vs los[j]: los[j] >= his[j-1] (could be ==? los[j] >= his[j-1]; == means los[j] == his[j-1] = end of removed-tail fragment... hmm: los[j] == his[j-1] would mean pre-existing touching, impossible). If fragment exists (his[j-1] > hi) then los[j] > his[j-1] > hi → gap... wait los[j] > his[j-1] by invariant. So fragment ends his[j-1], next starts los[j] > his[j-1]: gap. But fragment ends at his[j-1], and next interval starts strictly after → fine.

Middle intervals between: intervals in [i, j) removed entirely. Adjacency between kept i-1 (or fragment) and kept j (or fragment): left side ends at min(his[i-1], lo)... if kept as [los[i-1], lo) fragment or full interval [los[i-1], his[i-1]) with his[i-1] <= lo... then next kept starts at los[j] >= hi >= ... hi > lo. Gap ≥ hi - lo > 0. Fine.

Wait, but is his[i-1] == lo possible together with fragment? his[i-1] == lo → condition his[i-1] > lo false → interval kept whole. And los[i] ... middle removal from i to j: fine, gap created. OK so invariant preserved: after remove, no touching intervals. 

Actually also need: does add's absorption of touching preserve... yes. But actually, do we even need the strict invariant? The remove left-check uses his[i-1] > lo with only single interval i-1 — with touching chains it could need to check i-2 as well. But since invariant holds, single check suffices. To be safe, could loop, but keep as-is given invariant argument. Hmm, let me double check add maintains no-touching: add inserts merged interval [new_lo, new_hi) where new_lo = min(lo, los[start]) and new_hi = max(hi, his[end-1]) — covers all overlapping+touching. After insertion, neighbors: los[start-1] ... his[start-1] < new_lo? his[start-1] < los[start] (invariant), and new_lo = los[start] if left absorbed else lo >= ... if not absorbed, his[start-1] < los[start] <= ... hmm new_lo = lo when not absorbed; los[start] > lo (since i0 = bisect_left and absorbed only if his >= lo... if not absorbed then his[start_old] < lo... hmm los[start] >= lo; new_lo = lo; previous interval ends his[start-1] < los[start]... need his[start-1] < lo? If his[start-1] == lo then touching → absorbed branch triggers (>= lo). If not absorbed, his[start-1] < lo. And his[start-1] <= los[start-1]... wait his[start-1] < lo = new_lo → gap. ✓. Right: new_hi = hi if no absorption on right (j == i0, no interval touching at hi... if los[j0... hmm if some interval with los == hi existed, j = bisect_right(los, hi) > i0 → absorbed. If not absorbed, los[j] > hi = new_hi → gap ✓.

Wait, in my add code above I used `j = bisect_right(los, hi)` (first los > hi, absorbing los == hi) which merges touching. Let me redo add indices properly:

```
def add(self, lo, hi):
    if lo >= hi: return
    los, his = self._lo, self._hi
    i = bisect_left(los, lo)
    new_lo, new_hi = lo, hi
    if i > 0 and his[i-1] >= lo:
        new_lo = los[i-1]
        i -= 1
    j = bisect_right(los, hi)
    if j > i:
        new_hi = max(new_hi, his[j-1])
    else:
        # j == i; but if we decremented i, then j == old i? Let's see.
```

Hmm problem: after decrementing i, condition `j > i` uses new i. Case: stored [0,5), add [0,3): i = bisect_left([0], 0) = 0. No decrement. j = bisect_right([0], 3) = 1 > 0 → new_hi = max(3, 5) = 5. Replace [0:1] with (0,5). ✓.

Case stored [3,5), add [0,3): i = bisect_left([3], 0) = 0. his[-1]... i==0 so no left check. j = bisect_right([3], 3) = 1 > 0 → new_hi = max(3,5)=5. Replace: (0,5). ✓ (touch absorbed).

Case stored [0,3), add [3,5): i = bisect_left([0], 3) = 1. his[0] = 3 >= 3 → new_lo = 0, i = 0. j = bisect_right([0], 5) = 1 > 0 → new_hi = max(5, 3) = 5. Replace [0:1] → (0,5) ✓.

Case stored [0,3), add [5,8): i = 1, his[0]=3 >= 5? No. j = bisect_right([0], 5) = 1 == i → insert at 1: (5,8). ✓.

Case stored [0,3), add [3,5) again covered. Case: stored nothing. ✓.

Case: stored [3,5),( wait.

Case: stored [0,5), [8,9); add [6,7): i = bisect_left([0,8], 6) = 1. his[0]=5 >= 6? No. j = bisect_right([0,8], 7) = 1 == i → insert at 1. ✓.

Case: stored [0,5), [8,9); add [6,8): i = 1 (los[1]=8 >= 6), his[0]=5 >= 6? no. j = bisect_right(los, 8) = 2 > 1 → new_hi = max(8, his[1]=9) = 9. Replace [1:2] with (6,9). Result [0,5), [6,9) ✓ (touching at 8 absorbed).

Case: stored [0,5), [8,9); add [4,8): i = bisect_left(los, 4) = 0. j = bisect_right(los, 8) = 2. new_lo=4, new_hi = max(8, 9) = 9. Replace [0:2] → (4,9). Result [4,9) — wait, but [0,4) was covered... removing [0,5) and [8,9), replacing with [4,9): but original covered [0,5) ∪ [8,9); new coverage should be [0,5) ∪ [8,9) ∪ [4,8) = [0,9)... [4,8) ∪ [8,9) = [4,9), plus [0,5) → [0,5) ∪ [4,9) = [0,9). ✓.

Case: stored [5,8); add [0,10): i = bisect_left([5], 0) = 0. j = bisect_right([5], 10) = 1 > 0 → new_hi = max(10, 8) = 10, replace → (0,10) ✓.

Case where left decrement and j == i? After decrement i_new = i_old - 1. j >= bisect_right... j = bisect_right(los, hi) >= bisect_right(los, lo)?? hi > lo. bisect_right(los, hi) vs i_old = bisect_left(los, lo): bisect_right(los, hi) >= bisect_left(los, lo)? Since hi > lo: bisect_right(los, hi) >= bisect_right(los, lo)... hmm not quite; bisect_right(los, hi) counts los <= hi... bisect_right returns insertion point after equal elements: first index with los[i] > hi. Since hi > lo, {k: los[k] <= hi} ⊇ {k: los[k] < ...} hmm. bisect_left(los, lo) = first los >= lo. Since los values at positions >= bisect_right(los, lo) are > lo > ... Let me just argue: bisect_right(los, hi) >= bisect_left(los, lo) always when hi >= lo: elements los[0..bisect_left(los,lo)-1] are < lo <= hi, so bisect_right(los, hi) >= bisect_left(los, lo)? bisect_right(los, hi) = first index with los > hi. All indices < bisect_left(los, lo) have los < lo <= hi → not > hi → bisect_right(los, hi) >= bisect_left(los, lo) = i_old >= i_new + 1 = ... i_new = i_old - 1 → j >= i_old > i_new → j > i_new ✓. So when left absorbed, j > i always, and new_hi = max(hi, his[j-1]) — correct since his[i_old-1] (the absorbed left interval) <= his[j-1] as j-1 >= i_old-1. ✓. When left not absorbed (i unchanged): if j > i, fine; else insert. But wait: when left not absorbed and j > i: range [i, j) removed, but what about interval i-1 with his[i-1] < lo — fine, kept. ✓.

Also new_hi = max(hi, his[j-1]) — his[j-1] could be < hi when los[j-1] == hi (touching absorb where his[j-1] < hi — e.g., stored [3,4) and [6,8), add [0,6): i = bisect_left([3,6], 0) = 0; his[0]=4 >= 0 → absorb left, new_lo=0, i=-... i=0- wait i=0 so no decrement... i > 0 fails, left check skipped! Hmm: stored [3,4), [6,8): are these stored touching-invariant-ok? los[1]=6 > his[0]=4 fine. add [0,6): i = 0. No left. j = bisect_right([3,6], 6) = 2 > 0 → new_hi = max(6, 8) = 8, new_lo = 0. Replace [0:2] → (0,8). Result: [0,8). But correct: [0,6) ∪ {[3,4),[6,8)} = [0,6) ∪ [3,4) ∪ [6,8) = [0,4)∪... [0,6) ∪ [6,8) = [0,8) ✓.

Another: his[j-1] < hi case matters: stored [6,7), add [0,6): i = bisect_left([6], 0) = 0, no left check. j = bisect_right([6], 6) = 1 > 0 → new_hi = max(6, 7) = 7, replace → (0,7). ✓.

Edge: left absorb with j computed but j-1 might be < decremented i? decremented i = i_old-1 = start. j >= i_old = start+1 → j-1 >= start ✓. And new_hi = max(hi, his[j-1]) but also need his[start] (the left absorbed interval) included in new_hi? his[start] vs hi: if his[start] > hi, then... does j cover? j = bisect_right(los, hi) — if his[start] > hi, los[start+1] >= his[start] > hi → j <= start+1, and j >= start+1 → j = start+1 → j-1 = start, new_hi = max(hi, his[start]) ✓. If his[start] <= hi, interval [los[start], his[start]) ⊂ [.., hi) region... los[start] < lo < hi so overlapping, must be absorbed: j >= start+1 ✓, and his[j-1] >= his[start], max ✓.

Good. Similarly remove:

```
def remove(self, lo, hi):
    if lo >= hi: return
    los, his = self._lo, self._hi
    i = bisect_left(los, lo)
    j = bisect_left(los, hi)   # first los >= hi
    frags = []
    start = i
    if i > 0 and his[i-1] > lo:
        start = i - 1
        frags.append((los[i-1], lo))
        if his[i-1] > hi:
            frags.append((hi, his[i-1]))
    if j > i and his[j-1] > hi:
        frags.append((hi, his[j-1]))
    end = j
    # remove [start:end), insert frags at start
```

Check: if his[i-1] > hi case → j == i as argued, so second branch not triggered. ✓ But wait, in that case end = j = i, start = i-1: removes [i-1, i). And frags = [(los[i-1], lo), (hi, his[i-1])]. ✓.

Hmm wait, in case his[i-1] > hi but j... let me re-verify j == i: his[i-1] > hi; los[i] >= his[i-1] (invariant los[k] > his[k-1] for k >= 1 — from non-touching) → los[i] > hi → j <= i. Also los[i-1] < lo < hi → j >= i. So j == i ✓.

Case: stored [0,10); remove [3,5): i = bisect_left([0],3)=1. his[0]=10 > 3 → start=0, frags [(0,3),(5,10)]. j = bisect_left([0],5) = 1. j > i? j=1 > i=1 no ✓. end = 1. Replace [0:1] with frags. Result [0,3), [5,10) ✓.

Case: stored [0,10); remove [3,10): i = 1, his[0] > 3 → start=0, frags [(0,3)]; his[0] > hi? 10 > 10 no. j = bisect_left([0], 10) = 1. j > i=1? no. end=1. Replace [0,1] → [(0,3)] ✓.

Case: stored [0,3), [7,9); remove [5, 8): i = bisect_left([0,7],5) = 1. his[0]=3 > 5? no. j = bisect_left([0,7], 8) = 2. j > i → his[1] = 9 > 8 → frags [(8,9)]. start=1, end=2. Replace → [0,3), (8,9) ✓.

Case: stored [0,3), remove [5,8): i = bisect_left([0], 5) = 1, his[0]=3 > 5 no. j = bisect_left([0], 8) = 1. j > i? no. frags empty. Remove [1:1] = nothing ✓.

Case: stored [0,3), remove [0,3): i = bisect_left([0],0)=0. j = bisect_left([0],3)=1 > 0. his[0]=3 > 3? no. frags empty. Remove [0:1] ✓.

Case: stored [0,3), remove [2,5): i = bisect_left([0],2)=1. his[0]=3 > 2 → start=0, frags [(0,2)]. his[0]>5? no. j = bisect_left([0],5)=1. j > i(=1)? no. end=1. Replace [0:1] → [(0,2)] ✓.

Case: stored [2,5), remove [0,3): i = bisect_left([2],0)=0. no left. j = bisect_left([2],3)=1 > 0 → his[0]=5 > 3 → frags [(3,5)]. end=1. Replace [0:1] ✓.

Case: stored [2,5), remove [0,10): i = bisect_left([2],0) = 0. j = bisect_left([2],10) = 1 > 0. his[0] = 5 > 10? no. frags empty. Remove [0:1] ✓.

Case: stored [0,2), [4,6); remove [1,5): i = bisect_left(los=[0,4],1)=1. his[0]=2 > 1 → start=0, frags [(0,1)], his[0]=2 > 5? no. j = bisect_left(los,5)=1 (los[0]=0, los[1]=4 <5 → j=2). Wait bisect_left([0,4], 5) = 2. j=2 > i=1 → his[1]=6 > 5 → frags append (5,6). frags = [(0,1),(5,6)]. Remove [0:2], insert frags ✓. Result [0,1),(5,6) ✓.

Hmm, but edge: his[i-1] in (lo, hi] with the interval extending... covered above.

Tricky: his[i-1] > lo but los[j-1]... when j-1 == i-1 (i.e., j == i, the spanning interval): handled by branch 1 (his[i-1] > hi → two frags). If his[i-1] <= hi: only frag (los[i-1], lo), and second branch j>i false. ✓. If his[i-1] > lo and j > i (so j-1 >= i > i-1): second branch checks his[j-1] > hi — different interval than i-1. Could both branch 1 right-frag and branch 2 apply? Branch1 right-frag needs his[i-1] > hi → j == i → branch2 needs j > i → contradiction. ✓.

Remove with touching-invariant: also remove should preserve it — argued above.

Now also remove needs `j > i` where i may have been decremented — in the code above I decrement `start` but keep `i` for the `j > i` comparison. In case of spanning interval (his[i-1] > hi): branch2 guarded by j>i and j==i there. But careful: if start decremented and j > i, could j-1 == ... no issue.

Wait, one more remove case: what if j > i but the interval at j-1 has los[j-1] == ... los[j-1] < hi by definition of bisect_left. his[j-1] > hi → fragment. his[j-1] <= hi → interval [los[j-1], his[j-1]) with los[j-1] >= lo? j-1 >= i means los[j-1] >= lo → fully covered by [lo, hi)? his[j-1] <= hi and los[j-1] >= lo → yes inside. ✓.

Implementation of slice replace with parallel lists: 
```
del los[start:end]; del his[start:end]
for k, (a, b) in enumerate(frags): los.insert(start+k, a); his.insert(start+k, b)
```
Frags at most 2. Or when frags empty just delete.

Actually simpler: keep list of tuples `self._ivs` plus parallel lo list for bisect? Two parallel lists of scalars: bisect on los fine. Insertion into two lists. Alternatively store tuples and use insort with key... For add, we insert merged interval — position start. Using parallel scalar lists is straightforward.

total_length: sum maintained incrementally? Or compute sum(hi-lo) O(n). len() called how often? Requirements only for contains O(log n). total_length can be O(n) sum — fine, but len() must be number of intervals — O(1) via len(los). Let's maintain length incrementally anyway — trivial: track self._total, adjust on add/remove. Actually simpler to compute on demand O(n); but "Performance" only mentions contains. I'll maintain incrementally for O(1).

Actually simpler to compute on demand... wait — I wrote that. Use math for sums? Fine.

contains(x): any interval with los[k] <= x < his[k]. i = bisect_right(los, x) - 1 → candidate k with los[k] <= x (largest). Check k >= 0 and his[k] > x. Since intervals sorted & disjoint, if x >= los[k] and x < his[k] then in; else not. Correct: intervals to left of k end before los[k]... his[k-1] < los[k] <= x, and intervals right start > x. Hmm: is it possible x < his[k-1] and los[k-1] > x...? Los sorted; k = bisect_right gives last index with los <= x. his[k-1] <= los[k]? Not necessarily... his[k-1] < los[k] (invariant, gap or not — actually disjointness gives his[k-1] <= los[k]; even without strict invariant: his[k-1] <= los[k]). If x < his[k-1] then x < los[k] → contradiction los[k] <= x. So checking only k suffices regardless. Also need his[k] > x... could x be in interval k-1 with x >= los[k]? los[k] <= x but x < his[k-1] <= los[k] ≤ x — contradiction. So only candidate k. ✓ Even without strict merge invariant: his[k-1] <= los[k] holds because intervals disjoint & sorted, and x >= los[k] and x < his[k-1] would imply overlap... los[k] <= x < his[k-1] <= los[k] → contradiction. ✓ So invariant not even needed for contains. But merge matters for intervals() output merging [1,3)+[3,5) → our add absorbs touching, so fine.

intervals(): list(zip(los, his)) — build tuples.

__len__ → len(los).

Data structures: two lists. 60000 adds → list.insert memmove. Each add does bisect O(log n) + insert O(n) memmove. Average insert position shifts... total memmove ~ n²/4 element copies = 60000²/4 = 9e8 pointer copies × 8 bytes... no wait, memmove moves bytes = remaining elements × 8 bytes; total across ops ~ sum ≈ n²/2 × 8 = 14.4 GB for two lists → ~29 GB?? Hmm: for each insert at random position, moves (n - pos) elements ≈ n/2 avg = 30000 elements × 8 bytes = 240 KB per insert per list. 60000 inserts × 2 lists × 240KB ≈ 28.8 GB moved. At ~10–20 GB/s → 1.5–3 s. That's cutting it close for "well under 5 seconds" but each insert is fast memmove... Modern memmove ~ 10-30 GB/s. Risky.

Alternative: use a "batch then rebuild" strategy: since add operations are cheap individually only when batched, we could maintain pending unsorted additions and periodically rebuild sorted. But contains must be O(log n) — we could flush pending before contains batch? Not reliable.

Better: store intervals in a list sorted only lazily... Hmm.

Alternative approach: use insertion into a list but insertions happen at ends often? Random order random positions — worst case.

Alternative: keep the sorted list but implement add as: binary search + del + insert — del also moves. Still ~same cost.

Another idea: maintain a dict/heap for pending, and flush periodically with O(n) rebuild: For 60000 adds of small disjoint random-order intervals: batch adds into a list `pending` (just append — O(1)). When pending grows beyond max(len(sorted_set), threshold) e.g. 1000, sort pending (O(p log p)) and merge with sorted list (O(n + p)), producing new sorted list. Total rebuild cost: each rebuild O(n + p log p); elements added per rebuild = p; amortized: each element participates in O(log) rebuilds? Like vector doubling: rebuild when pending size >= max(64, len)... Each add triggers at most... amortized cost per add: when pending = m and sorted size = n, rebuild costs n + m; but m >= max(64, n/2)? If we rebuild when len(pending) >= len(sorted), then n <= m at rebuild → cost O(m log m) ≤ sorting; total across adds: each add belongs to rebuilds where it's in pending once (O(m log m) total per epoch ≤ m log m across adds... it's O(m log m + n)) — amortized O(log n) per add for sorting? Hmm, the sort of pending each time: pending sorted each rebuild — pending is fresh items only, so sorting them each rebuild is fine. Total: like doubling, total work O(N log N) worst? Each epoch with total adds M: rebuilds happen when pending >= max(sorted_len, K); cost of rebuild ~ sorted_len + pending. Sum of rebuild costs over epoch ≤ 2 × total adds + ... it's amortized O(1)-ish per add plus sort log factor. Actually classic: rebuilding when pending >= half of total size gives amortized O(log n) per op. Details:

- self._sorted: sorted list of interval tuples (merged? no — just sorted, possibly overlapping? Adds are disjoint small intervals per the perf scenario, but in general adds can overlap existing). For correctness of remove/contains, we need fully merged set. So flush must merge pending into sorted: merge two sorted disjoint...? pending itself may contain overlaps/touches among themselves. Merging properly requires combining both lists sorted by lo and reducing. 

Simplest correct approach for flush: collect all intervals (sorted list + pending), sort by lo, then linear merge (standard sweep merging overlapping/touching). Cost O((n + p) + (n+p) log(n+p))... sort each flush O((n+p) log(n+p)) — total across epoch could be O(m*n)... if pending small relative to sorted but we only flush when pending >= sorted or >= K... With threshold max(64, n): flush cost O((n+p) log(n+p)) with p >= n → O(p log p) since n <= p; each element re-sorted O(log) times per epoch... Each add is in exactly one flush's pending? No — elements already in sorted get re-sorted each flush. Flush cost includes sorting n_old + p elements. Number of flushes per epoch: pending grows by p each flush to reach n; with doubling n each flush, flushes per epoch O(log) but each flush sorts everything → total O(N log N) per epoch of N adds? Epoch = sequence between rebuilds where sorted doubles... Amortized: flush cost c_k, sorted size s_k. s_{k+1} >= s_k + p_k with p_k >= max(64, s_k)? Hmm that forces sorted to double each flush → flushes are O(log N) total per epoch with geometric costs summing to O(N log N)... that's O(log N) per add amortized — fine: 60000 × log ≈ 60000 × 16 × (sort constant?) Actually sorting (n+p) each flush where sizes double: costs 64 + 128 + ... + N ~ 2N comparisons... wait if flushes happen when p >= s: sizes: s, p=s → new s' = s + p = 2s (minus merges reduce count...). Cost of flush k: sorting s_k + p_k ≈ 2 s_k elements ≈ 2 s_k log. Sum over doubling: s doubles each time → sum s_k ≈ 2N... wait total elements added N=60000; sorted size grows to N; flushes: each flush sorted doubles until reaching N: costs 2·c·(64·log + 128·log + ...) sum of s_k over doubling = O(N)? s_0=64, s_1=128, ..., sum < 2N... but only if flushes exactly double. p_k >= s_k, and p_k could be huge (all remaining adds flushed at once). Total flush cost = sum (s_k + p_k) log ≤ sum (s_k + p_k) · log N; sum of p_k = N; sum of s_k over flushes: s_k ≤ 2 p_k (since s_{k+1} = s_k + p_k... s_k <= 2p_k... s_k + p_k = s_{k+1}); sum over k of s_k with doubling ≤ 2N_final... hmm with geometric series total ≈ 2·N. So total ≈ O(N log N) comparisons using Timsort (fast, C). For N = 60000: trivial, milliseconds. Plus final intervals sorted merge in Python loop O(N) — fine.

But also contains must be O(log n) — during a batch of contains with large pending, flush first (O(n log n))... flushing on contains could cost. But requirement: 200000 contains after 60000 adds. Flush before contains: sort pending... if pending large, one flush O(N log N) fine. But adversarial alternating contains/adds: each contains flushes O(n log n) → bad. Requirement only specifies performance scenario; contains "must be O(log n)". Hmm. To be safe: contains does bisect on sorted list and linear scan of pending — pending small if flush threshold... but if many contains without adds, pending stays whatever it was — bounded by threshold at time of last add? Pending could be up to threshold (>= sorted len) — contains checks pending via linear scan O(p). Hmm.

Compromise: maintain invariant len(pending) <= 64 or <= sqrt? If flush threshold is max(64, ...), contains scans pending O(64) → constant-ish but technically not O(log n). Eh.

Alternatively: keep fully merged sorted list always (simple approach) and accept memmove cost. Let me reconsider: 60000 inserts. Actually list.insert average moves n/2 elements. Total element-moves = sum over k of k/2 ≈ 60000²/4 = 9e8 element moves × 8 bytes = 7.2 GB per list... two lists (lo & hi) → 14.4 GB? Hmm wait: 9e8 elements × 8 bytes = 7.2 GB per list; two lists = 14.4 GB total memmove. memmove at ~20 GB/s → 0.7s. Plus Python overhead 60000 × ~1µs = negligible. Probably ~1s worst case. "Well under 5 seconds" — cutting close but likely OK? Benchmarks: list.insert of 60000-element list: inserting 60000 times into growing list ~ measure: I recall inserting 10^5 elements randomly into list takes ~ a few seconds? Let me estimate better: sum moves = n²/4 = 9e8 pointers = 7.2GB; memmove throughput for large blocks ~ 10-30 GB/s → ~0.4–0.7 s. Random insert positions mean average half the list — yes. So ~1 s for both lists. Acceptable.

Alternatively reduce copying: store single list of tuples → same element count, same moves. Two separate scalar lists same total bytes. One list of tuples: same 8 bytes/pointer moves. So similar.

But can we do better with a smarter structure? Given "60 000 add() calls of small disjoint intervals in random order" — the simple sorted-list with bisect+insert is the intended solution presumably. I'll go with plain sorted list of parallel arrays. Actually — alternative: append everything unsorted; but add must keep disjoint/merged for correctness of remove... Not necessarily: we could keep unsorted raw list and normalize lazily (on demand for intervals/len/contains/remove?). contains O(log n) requires sorted structure; can compute on the fly by sorting — no.

Lazy approach: pending list; flush sorts and merges. contains: flush if pending non-empty? That'd be O(n log n) per contains when alternating add/contains — bad worst case. The performance spec only requires the given scenario (many adds then many contains). contains with empty pending is O(log n). If pending non-empty, contains triggers flush first — cost amortized... not strictly O(log n) worst-case though. Hmm.

Given the spec explicitly says contains must be O(log n), I think flush-on-contains keeps contains O(log n) except for flush cost... The flush is amortized against adds. I think an honest design: keep merged sorted list always (eager). add = O(n) due to insert but that's fine; contains O(log n) strictly. This satisfies all stated requirements cleanly. 7.2GB memmove ~ fine.

Hmm, but let me reconsider using tuples + bisect.insort-style: we can't easily use insort on tuples with merged values anyway since we need custom merge. I'll write with two parallel lists `self._los`, `self._his`.

Wait — one more consideration for add performance: after merging computation, we may do del slice + insert. del + insert = 2 memmoves; fine.

Let me now also double check performance claim: "60 000 add() calls of small disjoint intervals in random order" — random order means insert positions random → average memmove half list. OK.

Could also use `sortedcontainers` — not stdlib. Skip.

Alternative micro-optimization: store as single list of (lo, hi) tuples; use bisect with key... bisect on tuples compares tuples — lo unique (disjoint) so lexicographic order = order by lo. For contains(x): bisect_right(ivs, (x, inf))... float infinity vs int fine but x could be... bisect_right((x, oo)) hmm tuples compare lo then hi: (x, inf) > (x, hi) always? inf > hi yes → bisect_right gives index after any tuple starting with x. candidate = ivs[k-1], check lo <= x... Actually simpler with key param: bisect_right(ivs, x, key=lambda t: t[0]) — Python 3.10+ supports key in bisect. Python 3.11 fine. But key function call per comparison adds overhead in Python loop (bisect with key calls key once per element? It calls key on list elements lazily). Using parallel scalar list avoids tuple-construct overhead and is faster for bisect. I'll use two parallel lists `self._lo`, `self._hi`.

Actually, for insert: inserting tuple into list of tuples: one memmove; parallel lists: two memmoves. Either fine.

Let me write:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(los, lo)
        nlo, nhi = lo, hi
        if i and his[i-1] >= lo:
            nlo = los[i-1]
            i -= 1
        j = bisect_right(los, hi)
        if j > i:
            nhi = his[j-1] if his[j-1] > hi else hi  # max
        else:
            nhi = hi
        ...
```

Hmm wait: when j > i, nhi = max(hi, his[j-1]). But could there be intervals beyond j-1 absorbed? No: los[j] > hi → [los[j],...) disjoint from [lo,hi)? [los[j], his[j]) with los[j] > hi → disjoint ✓. And nhi = max(hi, his[j-1]) only accounts last; intermediate intervals all within? Intermediate intervals [i..j-1) have his <= los of next... all contained in [nlo?..]. Since their starts < hi and merged interval covers [nlo, nhi) with nhi >= his[j-1] >= ... hmm is nhi >= all absorbed ends? his[j-1] is the largest? Absorbed intervals i..j-1: ends his[i]..his[j-1]; is his[j-1] the max? Los sorted, disjoint → his[k] <= los[k+1] < ... his[k] <= los[k+1] <= his[k+1]? No: his[k] <= los[k+1] < his[k+1]? los[k+1] < his[k+1] (nonempty) → his[k] < his[k+1]. Yes ends increasing → max is his[j-1] ✓. Similarly los[i] is min start among absorbed ✓ (starts increasing).

But if j == i (no absorption right) and left was absorbed: nhi = hi; removed range [i, i) empty? Wait start index: i decremented → range [i, j) = [i-1_orig, i)... j == i here? After decrement i_new = i_old - 1. j >= i_old (shown). If j == i_old: range [i_old - 1, i_old) = left interval replaced by [nlo, hi). his left interval = his[i_new] >= lo, and nhi = max(hi, his[j-1]=his[i_new])? j == i_old → j > i_new → max taken with his[j-1] = his[i_old - 1] = his[i_new] ✓. Wait j == i_old > i_new so `j > i` true → nhi = max(hi, his[j-1]) where j-1 == i_new → his[i_new] = the left interval's end ✓. 

But hold on: condition branch: `if j > i: nhi = max(...)` — with i = i_new. Shown j > i_new whenever left absorbed. ✓.

Now replace:
```
los[i:j] = [nlo] if j - i == 1 else ... 
```
Cases: 
- j > i: slice replace: los[i:j] = [nlo]; his[i:j] = [nhi].
- j == i and i decremented? impossible (shown j > i when decremented).
- j == i and not decremented: insert at i: los.insert(i, nlo); his.insert(i, nhi).

Actually with j == i and decremented impossible, so:
```
if j > i:
    los[i:j] = [nlo]
    his[i:j] = [nhi]
else:
    los.insert(i, nlo)
    his.insert(i, nhi)
```
total adjust: old covered length = sum(his[i:j]) if j>i else 0; new = nhi - nlo. Compute delta = (nhi - nlo) - sum(his[k]-los[k] for k in range(i,j)). Could track via... O(j-i) fine? Sum of removed lengths — computing per add O(merged span) — worst add covering all → O(n); total fine. But simpler: adjust total as: removed_len = sum(his[i:j]) - sum(los[i:j])... just compute loop. For the perf scenario, merged spans small. Alternatively maintain total lazily compute on demand: total_length O(n) — allowed. I'll compute incrementally with a small loop; fine.

Hmm but worst-case an add merging everything costs O(n) — acceptable.

Actually let me just compute delta quickly: if j > i: removed = his[j-1] - los[i]?? Since ends increasing and starts increasing with coverage contiguous between? Intervals i..j-1 are consecutive disjoint — but gaps between them! e.g. stored [0,1),[5,6); add [0,10): removed span = 1 + 1 = 2, not his[j-1]-los[i] = 6. Can that happen? Add [0,10) → i = 0 (los[0]=0 >= 0), left check no; j = bisect_right([0,5],10) = 2; absorbed intervals [0,1),[5,6) with gaps — but the merged result covers gaps too (they're just... the merged interval [0,10) covers gaps — total length = full nhi - nlo regardless). The delta = (nhi - nlo) - (existing coverage of absorbed). Existing coverage = sum(his[k]-los[k]) — must compute each. So loop needed. Or maintain total via recompute... simplest: keep incremental with loop over slice: `old = sum(h - l for l, h in zip(los[i:j], his[i:j]))`. Fine.

Hmm, but wait — actually there's subtlety: gaps inside merged region: absorbed intervals had gaps between them which were NOT covered before; merged interval covers them. That's correct since add [lo,hi) covers everything in between. ✓.

remove similar: delta = -old coverage of removed slice. Removed slice [i:j] coverage = sum. Plus fragments. Let me write remove:

```
def remove(self, lo, hi):
    if lo >= hi: return
    los, his = self._lo, self._hi
    i = bisect_left(los, lo)
    j = bisect_left(los, hi)
    frags = []
    start = i
    if i and his[i-1] > lo:
        start = i - 1
        frags.append((los[i-1], lo))
        if his[i-1] > hi:
            frags.append((hi, his[i-1]))
    if j > i and his[j-1] > hi:
        frags.append((hi, his[j-1]))
    if start == end and not frags: return
    old = sum(h - l for l, h in zip(los[start:j], his[start:j]))
    new = sum(b - a for a, b in frags)
    ...
```

Hmm wait, spanning case: his[i-1] > hi → i-1 spans [lo,hi) entirely (its los < lo? los[i-1] < lo yes since i = bisect_left → los[i-1] < lo). frags [(los[i-1], lo), (hi, his[i-1])] and removed slice [i-1 : j] with j == i → [i-1:i). old = his[i-1]-los[i-1] ✓. new = (lo - los[i-1]) + (his[i-1] - hi) ✓.

Case his[i-1] > lo but <= hi: frags [(los[i-1], lo)], removed [i-1 : j]. But j might > i (other intervals inside also removed) ✓. Second branch may add (hi, his[j-1]) if his[j-1] > hi ✓ (j-1 >= i ≠ i-1 ✓).

Wait check `j > i` when start decremented: j vs original i. Suppose stored [0, 2), [3, 10); remove [1, 5): i = bisect_left([0,3], 1) = 1. his[0] = 2 > 1 → start = 0, frag (0,1); his[0]=2 > 5? no. j = bisect_left([0,3], 5) = 2. j > i (2 > 1) ✓ → his[1] = 10 > 5 → frag (5,10). Removed slice [0:2]. New: [(0,1),(5,10)] ✓. Coverage old = 2 + 7 = 9; new = 1 + 5 = 6; delta = 2-5 removed → total decreases by 3 ✓ ([1,5) length 4 removed from coverage: [0,2)∪[3,10) minus [1,5)∩... removed coverage = 1 (from [0,2)) + 2 (from [3,5)) = 3 ✓).

Then apply: 
```
los[start:j] = [f[0] for f in frags]
his[start:j] = [f[1] for f in frags]
```
Slice assignment handles del+insert at once ✓. But careful: if start == j (nothing removed, frags empty) → skip. When could start == j with frags empty? start == i (no left) and j == i and frags empty → nothing overlaps → no-op. Could also start == j with frags non-empty? start = i-1 only when frags non-empty. If start == i == j: frags empty → return early.

Wait: if i decremented → start = i-1 < j always (j >= i > start) so slice non-empty ✓ contains i-1. ✓.

contains:
```
def contains(self, x):
    los, his = self._lo, self._hi
    i = bisect_right(los, x) - 1
    return i >= 0 and his[i] > x
```

intervals():
```
def intervals(self):
    return list(zip(self._lo, self._hi))
```
Returns list of tuples ✓.

total_length(): return self._total.

__len__: len(self._lo).

Also maybe __repr__ — not required; skip (or include harmlessly? Keep minimal, maybe include anyway — spec says only those methods; extra methods fine but keep clean).

Initialize _total = 0.

Type note: values int/float, keep original — we never transform (max/min via comparisons preserve originals) ✓. Careful: `nhi = his[j-1] if his[j-1] > hi else hi` — if equal returns hi; fine.

Edge in add: mixed int/float comparisons fine.

One more add check: `if i and his[i-1] >= lo` — after this branch, if j == i case can't happen? shown j > i_new when decremented → but if i wasn't decremented and j == i → insert. But wait — what if not decremented, j == i, but there's an interval exactly at los[i] == ... no overlap since los[i] >= lo... los[i] >= lo and if los[i] == lo? bisect_left → i points to first los >= lo; if los[i] == lo, do we need merging? Interval [lo, his[i]) overlaps [lo, hi) fully (add interval ⊆ it or extends). j = bisect_right(los, hi): los[i] == lo <= hi → j > i → absorbed via slice replace ✓. Good.

What about los[i] == hi? bisect_right(los, hi) skips equals → los[i] == hi would be excluded from j (bisect_right returns first > hi... los[i] == hi not > hi → j > i includes it → touching absorbed ✓ per spec merge [1,3)+[3,5)). ✓.

Double-check the earlier weird case in add: "Case: stored [3,4), [6,8), add [0,6)" — result [0,8): touching at 6 absorbed via bisect_right ✓.

Now, another subtle add case: left interval end == lo (touching) with hi < ... stored [0,3), add [3, 4): i = bisect_left([0],3) = 1; his[0] = 3 >= 3 → nlo = 0, i = 0. j = bisect_right([0], 4) = 1 > 0 → nhi = max(4, 3) = 4. Replace [0:1] → (0,4) ✓.

Also potential issue: after decrement, `j = bisect_right` computed BEFORE decrement — I compute j after checking left; order in code: compute i, maybe decrement, then compute j. Computation of j independent of i ✓.

Also `nhi = max(hi, his[j-1])` — use builtin max fine.

remove: uses `end = j`; slice assign.

Let me also handle remove when j < ... j >= i always (hi > lo, bisect_left monotonic in key) ✓. start <= i <= j ✓... start = i-1 could equal j? j >= i > i-1 = start → start < j ✓.

total update remove: self._total += new - old.

add total update: if j > i: old coverage = sum over slice; else 0; total += (nhi-nlo) - old.

Let me write final code.

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    """Set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_lo", "_hi", "_total")

    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(los, lo)
        nlo, nhi = lo, hi
        if i and his[i - 1] >= lo:
            nlo = los[i - 1]
            i -= 1
        j = bisect_right(los, hi)
        if j > i:
            e = his[j - 1]
            nhi = e if e > hi else hi
            old = 0.0 ...
```

Hmm total computation: old coverage of slice [i:j] — need loop: 

```
        if j > i:
            e = his[j - 1]
            nhi = e if e > hi else hi
            delta = nhi - nlo - sum(his[k] - los[k] for k in range(i, j))
            los[i:j] = (nlo,)
            his[i:j] = (nhi,)
        else:
            delta = hi - lo
            los.insert(i, nlo)
            his.insert(i, nhi)
        self._total += delta
```

Wait but in left-absorbed case, slice [i:j] includes the left interval ✓ (i decremented). And old coverage = sum over [i:j) ✓ since removed intervals exactly those.

Hmm — check: not decremented, j > i: slice [i:j) = intervals with los in [lo... bisect semantics: los[i:j] — los[i] >= lo, los[j-1] <= hi. But could interval at index i have los[i] > hi? j > i means at least one absorbed... los[i:j] = all with los <= hi (since j first > hi) — includes los values in [lo, hi]. Overlap ✓ all absorbed correctly.

If j == i: slice empty; insert ✓ but wait — what if not decremented and j == i but interval i-1 has his == lo (touching) → handled by left branch (>= lo) → decremented ✓.

Edge: add where left absorbed with his[i-1] == lo and j == i... shown impossible (j >= i_old). ✓.

remove:

```
    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._lo, self._hi
        i = bisect_left(los, lo)
        j = bisect_left(los, hi)
        frags = []
        start = i
        if i and his[i - 1] > lo:
            start = i - 1
            frags.append((los[i - 1], lo))
            if his[i - 1] > hi:
                frags.append((hi, his[i - 1]))
        if j > i and his[j - 1] > hi:
            frags.append((hi, his[j - 1]))
        if start == j and not frags:
            return
        old = sum(his[k] - los[k] for k in range(start, j))
        new = sum(b - a for a, b in frags)
        self._total += new - old
        los[start:j] = [a for a, _ in frags]
        his[start:j] = [b for _, b in frags]
```

Wait `if start == j and not frags: return` — if no overlap, start == i == j, frags empty → return before modifying total ✓. Actually slice assignment with empty both sides harmless anyway, but early return skips total calc. But if start < j, slice non-empty or frags non-empty... if start == j and frags non-empty → impossible (frags imply start < j). OK.

Hold on, potential issue in remove: `if j > i and his[j-1] > hi` — when left branch triggered with his[i-1] <= hi, j-1 could equal i-1? j > i and j-1 >= i > i-1 → no ✓.

But another case: his[i-1] > hi triggered branch 1 second frag; then j == i (proved) so branch 2 skipped ✓.

Hmm wait, I need to double check the proof "j == i when his[i-1] > hi": j = bisect_left(los, hi) = first index los >= hi. los[i] >= his[i-1] > hi → los[i] > hi → j <= i. Also j >= i since los[i-1] < lo < hi → los[i-1] < hi → j >= i... wait j is first index with los >= hi; los[i-1] < hi so j >= i? j > i-1, i.e., j >= i ✓. So j == i ✓. But this used invariant los[i] >= his[i-1], i.e., los[k] >= his[k-1] — from disjointness ✓ (interval k-1 ends his[k-1], interval k starts los[k]; disjoint → los[k] >= his[k-1]). This holds regardless of touching-merge invariant. And touching-merge invariant needed elsewhere? In remove, if los[k] == his[k-1] (touching stored — shouldn't occur but let's check robustness): left check `his[i-1] > lo` single interval assumption — with touching intervals, the true overlap chain could extend to i-2 etc. But if our operations maintain no-touching, fine. Does any operation create touching? Analyzed: add creates merged interval with neighbors strictly separated? add merged [nlo, nhi): left neighbor his[i-1] < nlo? Case left absorbed: new_lo = los[i_old-1], left neighbor i_old-2: his[i_old-2] < los[i_old-1] = nlo? invariant strict non-touch before: his[k] < los[k+1]? Before invariant we need... let's just assert operations preserve "his[k] < los[k+1] or (both... )". Initial empty ✓. Add: new interval vs left neighbor (index i_old-2 after removal): his[i_old-2] vs nlo. Sub-case left absorbed (his[i_old-1] >= lo): nlo = los[i_old-1]; previous invariant: his[i_old-2] < los[i_old-1] (strict? if previously touching-free, los[i_old-1] > his[i_old-2]) ✓ strict. New right boundary nhi vs los[j] (interval at j): nhi = max(hi, his[j-1]); los[j] > his[j-1] (strict by induction) and los[j] > hi (bisect_right) → los[j] > nhi? los[j] > hi and los[j] > his[j-1] → los[j] > max(hi, his[j-1]) = nhi ✓ strict. Left: nlo = los[i_old-1] = min(los[i_old-1], ...) nlo = min(lo, los[i_old-1])? nlo = los[i_old-1] when absorbed — but los[i_old-1] < lo (bisect_left) → nlo = los[i_old-1] < lo; previous left neighbor ends < los[i_old-1] ✓. Sub-case not absorbed: his[i_old-1] < lo; but absorbed-right could make nhi = hi or his[j-1]... nlo = lo: left neighbor his[i_old-1] < lo = nlo ✓ strict. Insert case (j == i, not absorbed either side): interval (lo, hi) placed between i-1 (ends < lo... his[i-1] < lo since not absorbed means his[i-1] < lo? Not absorbed condition: his[i-1] < lo — because absorbed if >= lo; if his[i-1] == lo absorbed. So not absorbed → his[i-1] < lo ✓) and i (los[i] > hi? j = bisect_right(los, hi) == i means los[i] > hi ✓ strict). ✓ So add preserves strict separation.

Remove: fragments: left frag (los[i-1], lo) — left neighbor i-2: ends his[i-2] < los[i-1] ✓ strict; right neighbor: next kept is frag (hi, ...) or los[j]: frag ends at lo < hi <= los[j] ✓ gap. Right frag (hi, his[j-1]): right neighbor los[j] > his[j-1] ✓ strict (induction), and > hi ✓; left neighbor: interval i-1 case... if right frag exists and left frag also (spanning handled — can't both), general: left side after removal is interval i-1 kept whole (if his[i-1] <= lo) or frag (los[i-1], lo); then right frag (hi, ...) — gap between lo and hi ✓. Or no left frag: kept interval ends his[i-1] <= lo < hi ✓. ✓ So strict non-touching preserved. So single-interval checks in add/remove are sound.

Also `contains` correctness independent ✓. `intervals()` merged ✓ (invariant strict means disjoint & non-touching = merged ✓).

total_length: int/float precision — sum of (hi - lo) increments; incremental float accumulation could drift vs computing sum? e.g., floats: total maintained incrementally: total += delta where delta derived from same values. Drift possible vs "exact" sum but spec just wants sum of lengths; incremental is fine. But maybe safer to compute on demand: `sum(h - l for l, h in zip(...))` O(n). Spec doesn't require O(1). Incremental with floats: adding deltas may accumulate rounding differently, but each delta is exact-ish... I'll keep incremental but compute delta as `(nhi - nlo) - sum(...)` — that's a specific arithmetic; fine. Actually to be safest, compute total_length() on demand as sum — hmm but then it's O(n) each call, acceptable, and returns "sum of all interval lengths" exactly as defined. Both fine. I'll maintain incrementally (O(1)) — matches definition closely enough. Actually, hmm — "Keep the original values (no rounding)" refers to bounds. Incremental total fine.

Edge: `add` delta uses sum over range — generator with range indexing okay.

Also should intervals() return list of tuples ✓, sorted ✓.

__len__ returns number of intervals ✓.

Also handle lo >= hi ignore in both ✓.

One more: bisect on ints/floats mixed fine.

Let me also double-check add when set empty: los empty → i=0, j = bisect_right([], hi) = 0 == i → insert ✓.

Test mentally: add(1,3), add(3,5): add(1,3): insert (1,3). add(3,5): i = bisect_left([1], 3) = 1; his[0]=3 >= 3 → nlo=1, i=0. j = bisect_right([1], 5) = 1 > 0 → nhi = max(5,3)=5. Replace [0:1] → [(1,5)] ✓ matches spec.

contains for [1,5): contains(1) → bisect_right([1],1)=1 → i=0, his[0]=5 > 1 ✓ True. contains(5) → bisect_right = 1 → i=0, his=5 > 5? no → False ✓. contains(0.5) → bisect_right([1],0.5)=0 → i=-1 → False ✓.

remove splitting: add(1,5), remove(2,3): i = bisect_left([1],2)=1; his[0]=5 > 2 → start=0, frags [(1,2)]; his[0] > 3 → frags [(1,2),(3,5)]. j = bisect_left([1],3)=1. j>i? 1>1 no. Replace [0:1] with both frags ✓ → [(1,3)?? wait frags (1,2) and (3,5)] → intervals (1,2),(3,5) ✓. total: old 4, new 1+2=3 → 3 ✓.

Now performance: add does two bisects + slice ops. Good.

Write final code. Also add `__repr__`? optional; skip or include. I'll include a simple one? Spec says no printing/examples; a __repr__ is harmless. I'll skip to keep minimal... I'll include it—no, keep clean, skip.

Also consider: intervals() returns fresh list each call ✓.

Final code below.