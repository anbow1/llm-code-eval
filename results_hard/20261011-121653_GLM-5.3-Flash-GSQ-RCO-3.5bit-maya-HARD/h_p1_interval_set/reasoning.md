Standard interval set with bisect on sorted list of lo values. Use two lists (los, his) or a list of intervals. For add/remove, find affected range via bisect, merge, splice. contains via bisect_right on los.

Let me implement:

State: self._los list, self._his list, sorted by lo, disjoint, non-touching (hi < next lo strictly... actually merged means next.lo > current.hi; touching merged means we require gap: next_lo > hi).

Wait, half-open intervals [1,3) and [3,5) touch — merged. [3,5) and [3.1, ...) disjoint. So merging condition: intervals kept disjoint with strictly positive gap? Actually [1,3) and [3,5): union [1,5). We merge if next_lo <= hi. For floats, exact equality merges too.

add(lo, hi):
- i = bisect_left(self._los, lo) — first interval with lo >= lo... hmm need to handle interval starting before lo.

Standard approach: find left index: idx of intervals overlapping [lo, hi). An interval [a,b) overlaps if a < hi and b > lo.

l = bisect_left(self._los, lo) — candidate; if l > 0 and self._his[l-1] > lo (i.e., his[l-1] > lo), then interval l-1 overlaps, start = l-1, else start = l. Wait but for merging touching intervals: if his[l-1] == lo, they touch, so also merge. But careful: merging touching is required for output, so we should merge during add. Condition: his[l-1] >= lo → merge (since [a, lo) + [lo, hi) = [a, hi)). Edge: his[l-1] >= lo means overlap or touch. But if his[l-1] == lo and interval is degenerate? We never store degenerate intervals (lo >= hi ignored), so his > los always. Good.

Also right side: r = bisect_right(self._los, hi) — first interval with lo > hi... intervals with lo <= hi could overlap: interval [a,b) overlaps if a < hi. Interval with a == hi: [hi, b) touches [lo, hi) — merge into [lo, b). So r = bisect_right(self._los, hi) gives first index with los > hi. But if los == hi exactly, bisect_right places after it, so we'd miss merging. Use r = bisect_right(self._los, hi); then if r < len and los[r] == hi: include it (merge touching). Actually simpler: r = bisect_right(self._los, hi), then extend: while r < len and los[r] <= hi: r += 1 — but los sorted so only need check los[r] == hi after bisect_right? bisect_right returns first index where los[i] > hi. If los[r] == hi... no, los[r] > hi strictly by bisect_right. So touching at right with los[r] == hi would be included in bisect_left part? bisect_right(los, hi) — elements equal to hi go before. So los[r] > hi. Elements with los == hi are at index < r. So r as computed includes intervals with los == hi. Then overlap condition for those: a == hi < hi? a < hi false, but touching merge: [lo,hi) + [hi,b) = [lo,b). So we want to include interval with los == hi. r = bisect_right includes it (index of that interval is before r? bisect_right returns insertion point after equal elements, so interval with los==hi has index r-1 < r... wait if los[r-1] == hi then r-1 included in range [l, r). Yes.)

Hmm but wait: what about interval [a, b) with a == hi but we then new interval end becomes b. That's included. Good. So:

start = l if (l == 0 or self._his[l-1] < lo) else l-1 — condition his[l-1] < lo means no overlap and no touch (strict gap). Since we merge touches, merge if his[l-1] >= lo. But careful: if his[l-1] == lo exactly (touching), merge. So start = l-1 if l > 0 and his[l-1] >= lo else l.

Hmm but there's subtlety: his[l-1] could be < lo but interval [l-1] ends before lo with gap — fine.

end: r = bisect_right(self._los, hi). All intervals in [start, r) overlap or touch. New merged interval: new_lo = min(lo, self._los[start] if start < r else lo)... Actually if start < r, new_lo = min(lo, los[start]), new_hi = max(hi, his[r-1]). If start == r (no overlapping intervals), insert [lo, hi) at position start.

Then splice: self._los[start:r] = [new_lo], self._his[start:r] = [new_hi].

Wait check the touching-on-right case: interval [hi, b) with los == hi: r includes index of that interval (since bisect_right(los, hi) puts after equals, index of los==hi is r-1). his[r-1] = b. new_hi = max(hi, b) = b. Good.

Check overlap where interval fully contains [lo,hi): l = bisect_left(los, lo): interval [a,b) with a < lo < b. bisect_left finds first los >= lo; that interval has los < lo so l points past it, l >= 1, his[l-1] = b > lo → start = l-1. r = bisect_right(los, hi): if hi < b, all los in (l-1, r) region... intervals after l-1 have los > lo; those with los < hi overlap. bisect_right gives first los > hi. If b > hi, then interval l-1's los < hi so it's before r? bisect_right considers entire list; los[l-1] = a < hi so r > l-1. r = first index with los > hi; since b could be > hi but los values after l-1 are > a... interval l-1 itself has los = a < hi, so r >= l. Intervals between l and r-1 have lo < hi... those overlap or are inside. his[r-1] = largest hi among those; could be b. new_hi = max(hi, his[r-1]) = b. Good.

remove(lo, hi):
- find overlapping intervals: those with a < hi and b > lo. l: start = l-1 if l>0 and his[l-1] > lo else l (strict overlap only, not touching — touching doesn't matter for removal; but if his[l-1] == lo, no removal needed from it... actually removing [lo,hi) from [a, lo) does nothing). Use his[l-1] > lo.
- r: intervals with los < hi: r = bisect_left(los, hi)? intervals with los < hi overlap potentially. r = bisect_left(self._los, hi) gives first los >= hi; intervals [start, r) have los < hi, overlap if their hi > lo — start handled. But the interval at start=l-1 has los < lo < hi so it's within [start, r). Good.

Then: pieces. If start < r:
- left piece: if los[start] < lo: [los[start], lo). Keep.
- right piece: if his[r-1] > hi: [hi, his[r-1]). Keep.
- middle intervals start+1..r-1: removed entirely? Wait intervals between start and r-1: interval k for start < k < r has los[k] >= lo? los[k] >= los[start]... hmm los[k] > los[start] but could be < lo? No: if k > start = l-1, then k >= l, so los[k] >= lo (by def of l = bisect_left(los, lo)). And los[k] < hi (since k < r = bisect_left(los, hi)). So [los[k], his[k]) ⊆ ... his[k] > los[k], and los[k] >= lo, his[k] <= ? his[k] could exceed hi? If k < r and k > start, his[k] > los[k] but his could be > hi only if k == r-1 and it's the right piece case. Actually his[k] can be anything > los[k]; if los[k] < hi and his[k] > hi then it's the last overlapping interval, handled by right piece. For middle intervals fully inside [lo, hi): removed.

Splice: new pieces list. left piece = (los[start], lo) if los[start] < lo; right piece = (hi, his[r-1]) if his[r-1] > hi.

self._los[start:r] = ([los[start]] if left else []) + ([hi] if right else [])... careful building.

Code:

```
if start < r:
    new_los = []
    new_his = []
    if self._los[start] < lo:
        new_los.append(self._los[start]); new_his.append(lo)
    if self._his[r-1] > hi:
        new_los.append(hi); new_his.append(self._his[r-1])
    self._los[start:r] = new_los
    self._his[start:r] = new_his
```

Edge: left and right piece could be same interval split — that's fine, two pieces.

But wait: if start == r-1 and interval contains [lo,hi) strictly: left [a, lo), right [hi, b). Two pieces. Good.

Edge: touching case for remove: interval [a,b) with b == lo: no change, start = l (since his[l-1] == lo not > lo). Good.

contains(x): i = bisect_right(self._los, x) - 1; return i >= 0 and self._his[i] > x. Since los sorted, interval i has los <= x; check x < his[i]. But is it guaranteed that if x in some interval, it's interval i? Intervals disjoint and sorted, his[i] <= los[i+1]. If x in interval j < i, then x < his[j] <= los[j+1] <= ... <= los[i] <= x — contradiction. So yes.

But careful with merging invariant: we merge touching, so his[i] < los[i+1] strictly (or <=? merged means strictly less... after merging [1,3)+[3,5) → [1,5), so stored intervals satisfy his[i] <= los[i+1], and since we merge when touching, his[i] < los[i+1]... actually if his[i] == los[i+1] they'd be merged, so strictly his[i] < los[i+1]. Hmm, but with floats equality is exact; fine either way for contains correctness: if his[i] == los[i+1] == x, contains check: i gives his[i] > x false; interval i+1: bisect_right gives i+2-1... contains would check interval with los <= x, which is i+1, his[i+1] > x → true if x < his[i+1]. So even without merging invariant contains works. Good.

total_length: sum(hi-lo), cache? Just compute each time, or maintain cached sum. Maintain incremental: but splice updates — recompute delta. Simpler: compute on demand sum; 60k intervals, sum is fine. But could be called often. Keep it simple: compute sum each call. Or maintain self._total updated in add/remove. Let's maintain total for O(1). In add: new total adds (new_hi - new_lo) minus removed spans... easier: track sum of lengths by recomputing deltas. Actually simplest: maintain _total; in add: before splice compute removed length sum(his[start:r]) - sum(los[start:r]) — that's O(k). Fine. Or just recompute in total_length. I'll maintain _total incrementally with O(k) updates which is amortized fine (each interval touched O(1) times amortized? Not exactly with random adds but fine).

Simpler: total_length returns sum(h - l for l, h in zip(...)). O(n). That's fine for the perf requirements (only contains needs O(log n)). I'll do incremental anyway? Keep simple: O(n) sum. Fine.

__len__: len(self._los).

Also handle lo >= hi ignore in add/remove.

Also ints/floats preserved. Fine.

Write code.