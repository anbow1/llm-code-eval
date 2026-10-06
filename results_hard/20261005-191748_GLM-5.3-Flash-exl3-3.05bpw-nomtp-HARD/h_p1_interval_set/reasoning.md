Classic interval set with sorted list and bisect. 60,000 disjoint intervals adds — must be efficient. Use a sorted list with bisect.insort or maintain list of intervals. With disjoint intervals inserted randomly, inserting into a Python list with `list.insert` is O(n) per insert but with small constant; 60k inserts → ~60k²/2 = 1.8e9 element moves... that's too slow? Actually list insert memmove is fast, ~1.8e9 * few bytes... memmove of 60k pointers average 30k moves = 1.8e9 pointer copies — that's roughly 1-2 seconds in C. Probably acceptable ("well under 5 seconds"). But to be safe, use a B-tree-ish approach or `sortedcontainers` (not stdlib). Could use bisect on lo list plus insert into lists — same cost.

Alternative: keep list of intervals sorted; on add, find affected range via bisect, then slice-assign: `self._ivs[i:j] = merged` — slice assignment also O(n) memmove but same.

Could implement a simple skip structure... Simpler: since 60k disjoint intervals random order, average insert position shift is n/2 memmove of pointers (8 bytes each) — 60000²/2*8 bytes = 14.4 GB memmoved? No wait, 60000²/2 = 1.8e9 moves, each 8 bytes = 14.4GB... that's ~1-4 seconds depending on hardware. Hmm, "well under 5 seconds" — risky.

Better: use a lazy "merge later" approach? But contains must be O(log n) — needs sorted structure at query time. Could defer normalization: accumulate adds in a dict/list, rebuild lazily when queried (dirty flag). But 200k contains interleaved with... The problem says 60k adds then 200k contains. If contains don't trigger rebuild between adds (only when dirty), we rebuild once before first contains, remove, intervals(), etc. But rebuilding between each add would be bad. Lazy rebuild: keep a list of pending intervals; when a query happens and dirty, sort and merge (O(k log k)), then the set is normalized. With queries only after all adds, that's two rebuilds? Actually dirty triggers rebuild at first contains, once. Then contains use bisect O(log n). That's very fast.

But worst case alternating add/remove/contains each triggers full rebuild O(n log n) → 60k * 60k log = too slow. The spec only demands the described workload, but generality matters. Compromise: hybrid — maintain sorted list incrementally, but batch pending changes. Actually simplest robust: maintain sorted list with insertion via bisect + insert. Risk of slowness.

Alternative: implement a balanced structure like a B-tree via "list of lists" (two-level). Two-level skip list: keep chunks of max size ~512, each chunk sorted. Insert into chunk O(chunk), occasionally split. Bisect: find chunk via bisect on chunk first elements (O(log chunks)), then bisect within chunk. Total for 60k inserts: 60000 * 512 ops worst → 30M Python ops... hmm 30M python-level operations is ~10s. Actually per insert: bisect (C) + list.insert within chunk (C, 512 elements memmove — fast). Splits: each element move between chunks is C-level. So Python-level work per insert is ~constant (a few operations calling C functions). That's fine.

Simpler: a two-level sorted list of intervals. Let me design:

Each element is an interval (lo, hi). Store `self._chunks: list[list[tuple]]`, each chunk sorted by lo. Maintain `self._chunk_mins: list[lo of first interval in chunk]` for bisect. Also maintain total count and... total_length maintained incrementally? total_length could just sum over all intervals — O(n). Fine, it's not required to be fast.

But complexity: maintaining chunk mins after merges/splits etc. Adds can merge/split intervals — with intervals stored as elements, add(lo,hi) may remove several intervals and add one; remove may remove/add. Operations: find position(s), delete a slice, insert 1-2 elements. Deletions across chunks complicate chunk management.

Chunk deletion across chunks: delete range covering whole chunks (splice chunk list) plus partial chunks at ends. Doable but fiddly. Chunk mins update: after modifying a chunk at its start, update mins.

Hmm. Alternative simpler batching approach: pending buffer of raw operations. When pending count exceeds threshold (e.g., 32), rebuild? No — rebuild O(n) each 32 ops → 60k/32 * 60k = too much.

Better hybrid: pending operations list; on query, if pending nonempty, sort pending (O(p log p)) and merge into main struct incrementally by inserting each pending interval into main sorted list (each insert O(n) memmove + merging). With one big batch of 60k pending, merging: process pending sorted; each merged interval inserted via slice assignment. Since pending sorted, inserts are in increasing order — random positions though. Each insert is list.insert / slice assign: memmove average n/2 → total 1.8e9 * 8 bytes again ~ 1-2s. Hmm same as before but only once.

Actually wait — the direct approach: 60k inserts into a Python list of 60k tuples. Average memmove per insert ~30k pointers*8 bytes = 240KB; total ~ 60000 * 240KB avg = 14.4 GB memmove. memmove bandwidth ~10-20 GB/s → ~1 second. Plus Python overhead 60k * ~1µs = negligible. So plain sorted list with insert is actually fine, ~1s. "Well under 5 seconds" — plausible but borderline. But the 200k contains with bisect is trivial.

To be safer, use the two-level chunked list. It complicates interval merging logic. Alternative: keep the main list but rebuild lazily with dirty flag only for the add-batch scenario, and handle incremental updates otherwise?

Let me reconsider: maybe simple flat sorted list with bisect insort is fine. Common accepted solutions use `bisect.insort`. 60k disjoint random inserts: measured Python list insert cost — inserting into list of size n costs roughly 10ns per element moved? Empirically list.insert at middle of 100k list ~ 1-2 µs? Let me estimate: memmove of 50k * 8 = 400KB at ~20GB/s = 20µs... hmm that seems high. Actually list.insert of 60k-element list: benchmarks show ~ 5-10 µs at n=100k? Then 60k inserts * (avg 30k elements) — 30k elements * 8 bytes = 240KB per insert; memmove ~ 240KB/15GB/s = 16µs; total 60k * 16µs ≈ 1 second. Plus per-insert Python overhead. So ~1s total, OK "well under 5s". But hardware variance... Also merging touches adjacent intervals requiring O(log n) search + slice deletion.

Actually the merge/delete operations: when adding [lo,hi), we find overlapping/touching intervals and replace them with one merged interval. Use `ivs[i:j] = [merged]` — slice assignment memmove similar.

I'll go with the flat sorted list — simpler and correct. Let me estimate more carefully with worst-case: it's ~1-2s. Risky but likely fine. Alternatively reduce constant by using array of lo's... no.

Hmm, let me think about a two-level implementation more concretely; it's not that bad and gives safety.

Design: intervals stored as list of (lo, hi) tuples sorted. Split into chunks of ≤ L (e.g., 256). Operations need:

- `_locate(lo)`: find index of first interval with hi > lo... For add, we need: all intervals that intersect or touch [lo,hi): those with hi >= lo and lo <= hi (touching merge) and lo < hi_bound... Since intervals disjoint and sorted, overlapping set = contiguous range.

With chunks: for searching, I need a flat-ish view for bisect: keep `self._los` flat list of all los? That defeats purpose. Instead bisect over chunk mins to find candidate chunk, then bisect within chunk; but an operation may span multiple chunks.

This is getting complex. Given constraints, complexity risk of bugs vs performance risk. Let me think about what operations do with flat list first:

Add(lo, hi):
- if lo >= hi: return
- i = bisect_right of (lo, inf)? We need first interval with hi > lo, i.e., first interval whose hi > lo ⟺ whose lo >= lo (since if lo < lo, hi <= lo... no: interval (a,b) with a < lo, its hi could be > lo? No — disjoint touching merged means intervals don't even touch: gaps exist? Not necessarily: [1,3) and [3,5) are merged into one. So in the canonical set, consecutive intervals satisfy prev.hi < next.lo strictly? If prev.hi == next.lo they'd be merged. So intervals are disjoint AND non-touching: prev.hi < next.lo, and there's a gap (prev.hi, next.lo) that is either empty-open... wait gap = (prev_hi, next_lo) which contains reals if prev_hi < next_lo; if equal they touch, merged. So yes strict.

Canonical invariant: sorted intervals, strictly separated: a_j.hi < a_{j+1}.lo? No wait: [1,3),[3,5): touching → merged to [1,5). So stored invariant: prev.hi < next.lo OR prev.hi == next.lo never happens. Hmm but what about floats: "touching intervals merged ([1,3) + [3,5) gives [(1,5)])" — so equality merges. So invariant: intervals non-overlapping and non-adjacent: a.hi < b.lo (strict) for consecutive.

Wait but that's about equality: if a.hi == b.lo, merge. If a.hi < b.lo, gap. OK.

Add [lo,hi):
- Find first interval with hi >= lo... intervals with a.hi >= lo? An interval [a,b) overlaps or touches [lo,hi) iff a <= hi and b >= lo. The set of such intervals is contiguous.

Using key lo values: intervals sorted by lo. Let i = first index with lo_i > hi? No—: intervals to merge = those with lo <= hi... Let me define: j = bisect_left on lo key for value... Standard approach:

- left = first interval index where interval.hi >= lo → interval may intersect since lo_i <= ... Let i = bisect_left(ivs, (lo,)) using tuples: find first interval with lo >= lo. Then check ivs[i-1]: if i>0 and ivs[i-1][1] >= lo, include i-1. Hmm but ivs[i-1][1] >= lo includes touching (hi == lo) which merges. Good.
- right = first interval with lo > hi: j = bisect_right(ivs, (hi, ...)). Using tuples (lo, hi), bisect_right(ivs, (hi, inf)) gives first index with lo > hi (or lo == hi and hi >= inf...). Simpler: j = first index with lo_j > hi OR (lo_j == hi and ...). Since lo_j == hi means interval starts exactly at hi — [hi, b) touches [lo,hi) at point hi which is excluded from [lo,hi) but... adding [lo,hi) then merging with [hi,b) → [lo, max(hi,b)) = [lo,b). Do touching at the right end merge? [lo,hi) + [hi,b): they're adjacent: union = [lo, b). Yes should merge ([1,3)+[3,5)=[1,5)). So intervals with lo_j == hi also merge. So right cutoff: first interval with lo > hi: j = bisect_right(keys, hi) where keys are los. Since no duplicate los? Could there be an interval with lo == hi? No, ignored. Two intervals same lo impossible.

So: j = bisect_right(loss, hi) → first interval with lo > hi. Wait tuple comparison: intervals as (lo,hi); bisect on first component only — use separate... can't have separate array cheaply. Use bisect with key (Python 3.10+ bisect supports key!). Python 3.11 has `key` parameter in bisect. 

- j = bisect_right(ivs, hi, key=lambda iv: iv[0]) → first index where lo > hi.
- i: leftmost interval that merges: interval with lo >= lo and (previous interval hi >= lo). Actually all intervals in [i0, j) merge where i0 = first with lo >= lo, but ivs[i0-1] also merges if its hi >= lo (touching or overlapping). So:
  - j = bisect_right over los with value hi.
  - i = j; then while... no, use bisect: k = bisect_left(ivs, lo, key=lo) → first index with lo >= lo. i = k-1 if k>0 and ivs[k-1][1] >= lo else k.
- new interval: (lo, hi) if i==j else (min(lo, ivs[i][0]), max(hi, ivs[j-1][1])).
- ivs[i:j] = [new] (if i<j) else insert.

Remove(lo,hi):
- intervals intersecting (lo,hi): [a,b) with b > lo and a < hi.
- j = bisect_right(ivs, hi, key=lo)? Intervals with a < hi: first index with lo >= hi → j = bisect_left(ivs, hi, key=lo). Intervals with lo < hi... all intervals before j have lo <= hi? bisect_left gives first with lo >= hi; those with lo == hi: interval [hi, ...) doesn't intersect (lo,hi) removal since removal is [lo,hi) — half-open, hi excluded. Interval [hi,b) unaffected. Correct: intersecting iff a < hi and b > lo.
- i: first interval with b > lo: left = bisect_left(ivs, lo, key= first index lo >= lo) → k. Then if k>0 and ivs[k-1][1] > lo: include k-1 (its intersection with removal: [lo, b)). i = k-1 if k>0 and ivs[k-1][1] > lo else k. j = k' = bisect_left(ivs, hi, key=lo) → first with lo >= hi. Hmm but interval with lo in [lo... let me check: intervals fully removed: those with a >= lo and b <= hi. Partial: first (if b > lo, a < lo) → replaced by [a, lo); last (if b > hi and a < hi) → replaced by [hi, b).

  Set j = bisect_left(ivs, hi, key lo) → first index with lo >= hi. Replacement pieces: left piece if i<j-1? Let me code:

```
k = bisect_left(ivs, lo, key=lambda t: t[0])
pieces = []
i = k
if k > 0 and ivs[k-1][1] > lo:
    pieces.append((ivs[k-1][0], lo))  # wait, only if ivs[k-1][0] < lo which is true since sorted and ivs[k-1][0] < lo? ivs[k-1].lo < lo yes.
    i = k - 1
j = bisect_left(ivs, hi, key=lo)  # first with lo >= hi
if j > i and ivs[j-1][1] > hi:
    pieces.append((hi, ivs[j-1][1]))
ivs[i:j] = pieces
```

Check: interval [lo, x) with lo == some interval's lo... Consider ivs[k-1] = [0, 10), remove [5,7): k = first lo >= 5 = that one? lo=0 <5 so k points past it; ivs[k-1]=[0,10), hi=10 > 5 → pieces [(0,5)], i=k-1. j: first lo >= 7 — that same interval lo=0<7, next interval lo >= 10 presumably... j = index after [0,10) (assuming next lo >= 10 >= 7... next lo > 10 since non-touching? next lo > 10). ivs[j-1] = [0,10), hi=10 > 7 → append (7,10). ivs[i:j] = [(0,5),(7,10)]. Correct.

Edge: pieces order — left piece lo, right piece hi >= left lo. If both pieces and i==j-1 (single interval straddling): (a, lo), (hi, b) — need lo <= hi? If lo > hi, remove is ignored... we already require lo < hi... but wait if lo<hi then (a,lo),(hi,b) sorted fine. But left piece only added if ivs[k-1][1] > lo; right piece if ivs[j-1][1] > hi where j-1 could be k-1 (same interval). Fine.

But there's subtlety: interval entirely inside removal with lo < its lo... all intervals with index in [i, j) are removed, and pieces replace them. Also need i <= j always? i = k-1 possibly; j = bisect_left(...,hi) >= k? Since lo < hi, bisect_left for hi >= bisect_left for lo = k. So j >= k, and i is k or k-1, i <= j. If i == k-1 and j == k-1? Possible? j >= k > k-1 = i, so j > i when i=k-1. If i=k, j>=k. OK, slice assignment valid.

Also for remove with hi == lo ignored, handled.

Add correctness with touching: ivs[i][1] >= lo merges left touch (hi == lo case: interval [0,5), add [5,7): k = first lo >= 5 → index of [5,7)? no [0,10)... let's test add [5,7) with ivs=[[0,5],[8,9]]: k = bisect_left(los, 5) → first lo >= 5 → index 1 ([8,9]). ivs[0][1]=5 >= 5 → i=0, merged new lo = min(5, 0)=0. j = bisect_right(los, 7) → first lo > 7 → index 1. ivs[0:1] replaced by (0,7)? wait new = (min(lo, ivs[i][0]), max(hi, ivs[j-1][1])) = (0, max(7,5)=7). Result [0,7),[8,9]. Correct — merged touching [0,5)+[5,7).

Add new = (min(lo, ivs[i][0]), max(hi, ivs[j-1][1])). Check overlapping interval [0,10], add [5,7): k = 1 (first lo >= 5? [0,10) lo=0 <5 → k=1), ivs[0][1]=10>=5 → i=0. j: first lo > 7 → index 1. new = (0, 10). ivs[0:1] = [(0,10)]. Good.

Add inside: ivs=[[0,10]], add [2,3): k = bisect_left los 2 → first lo >= 2 → index 1 (since 0 < 2)... wait only interval [0,10) lo=0 < 2 so k=1. ivs[0][1]=10 > 2 → i=0. j = bisect_right(los, 3) → 1. new = (0, 10). ivs[0:1]=[(0,10)] — unchanged, correct.

Add [2,3) to empty: k=0, i=0 (k>0 false), j=0, i==j → insert (2,3) at 0... ivs[0:0] = [(2,3)] works.

contains(x): binary search: idx = bisect_right(ivs, x, key=lambda t: t[0]) - 1; return idx >= 0 and ivs[idx][1] > x. Check: x in [a,b) iff a <= x < b. bisect_right by lo gives first index with lo > x; idx = that -1: lo <= x. Then b > x. Correct.

total_length: sum(hi-lo).

__len__ = len(ivs).

intervals() returns list(ivs) (copy). "as (lo,hi) tuples" — store tuples already.

Now performance: 60k adds of small disjoint intervals in random order. Each add: two bisects O(log n) C-speed, plus slice assignment/insert with memmove. As computed, memmove total ~ 60k inserts * avg 30k elements... wait actually avg shift is n/2 where n grows to 60000; average over all inserts ~ 15000 elements * 8 bytes = 120KB per insert; total ~7.2GB / ~10GB/s ≈ 0.7-1.5s. Plus 200k contains bisect: 200k * ~0.5µs = 0.1s. Python-level per add ~ 2-3 µs → 0.2s. Total ~1-2s. "Well under 5 seconds" — probably acceptable. Hmm, but I'm not 100% sure about the memmove speed. Alternatively reduce risk with the two-level chunked structure to make adds O(sqrt n) or use... 

Actually alternative for safety: chunked structure but handle complexity. Let me consider effort/bug risk. The chunked approach: I'd need to reimplement bisect across chunks. Every add/remove must locate position possibly spanning chunks, delete across chunks, insert. It's doable but error-prone.

Middle ground: flat list, but the merge operations use slice assignment which is one memmove — already minimal for flat list. I think flat is fine. Many reference solutions accept insort here.

Actually, wait — could also consider that memmove for list insert is extremely fast (memcpy-like, ~30+ GB/s on modern hw for large blocks due to cache... 240KB doesn't fit L2, so memory bandwidth ~20GB/s). 7.2GB/20GB/s = 0.36s. Fine.

I'll go flat, but add a micro-optimization: maintain a separate plain list of los? For bisect with key, Python creates temp... `bisect_left(a, x, key=...)` calls key function per probe — O(log n) Python lambda calls per bisect ≈ 17 calls * ~0.1µs = 1.7µs per bisect; 3 bisects per add → 5µs; 60k adds → 0.3s. Acceptable. Or store parallel array of los and bisect that (no key) then it's pure C. Parallel los array adds maintenance cost (another insert/delete per op, doubling memmove). Key lambdas probably fine and simpler. Actually I can use tuples comparison directly: bisect_left(ivs, (lo,)) — compares tuple (lo,) vs (lo, hi): tuple comparison compares lo first, and if equal... (lo,) vs (lo,hi): (lo,) < (lo, hi) since shorter and equal prefix. So bisect_left(ivs, (lo,)) gives... we want first index where iv.lo >= lo. Comparison (a, b) < (lo,): if a < lo → less → before; if a == lo: (a,b) vs (lo,): (lo, b) vs (lo,) → (lo,) is smaller (prefix shorter) → (a,b) > (lo,) → not less → index at or after → first with lo >= lo is correct? bisect_left finds first element not less than (lo,). Element (a,b) with a == lo: (a,b) > (lo,) since longer → considered >= — included in right side. Good: bisect_left(ivs, (lo,)) = first index with lo_a >= lo. And bisect_right(ivs, (lo,)) = first index with... element (a,b) vs (x,): for bisect_right(ivs, (hi,)) → first index with element > (hi,): element (a,b) > (hi,) iff a > hi or (a == hi and b > nothing → b > missing → tuple longer → greater). So (hi, anything) > (hi,) → bisect_right((hi,)) skips all lo == hi elements, returns first with lo > hi. 

So:
- add: j = bisect_right(ivs, (hi,)) → first with lo > hi. k = bisect_left(ivs, (lo,)) → first with lo >= lo. i = k-1 if k and ivs[k-1][1] >= lo else k. Hmm for add merging left touch we need ivs[k-1].hi >= lo. Good.
  new = (min(lo, ivs[i][0]) if i<j... careful when i==j: new = (lo, hi) but also check ivs[i]? When i == j == k... if i==j then no intervals merge except possibly ivs[i]... no: i==j means no intervals in [i, j) and the left neighbor check failed (hi_left < lo), and no interval with lo <= hi... but could ivs[i] (== ivs[j]) have lo <= hi and hi... wait j = first with lo > hi, so ivs[j-1] (if j>0) has lo <= hi and merged. If i == j, then j-1 < i means either j==0 or the interval before j is before i. If i == j == k and ivs[k-1].hi < lo (left check failed), then no merge with left. new = (lo, hi), insert at i. But wait: could ivs[j-1] exist with j-1 >= i? Only if j > i. When i==j, new = (lo,hi) placed at i. But is that right — could there be an interval entirely inside [lo,hi) when i==j? No, because intervals inside have lo in (lo, hi) so k would be <= that index <= j, meaning i <= that. Actually intervals strictly inside: their lo > lo... they'd be in [k, j) ⊂ [i, j) — i==j means empty. But hmm: an interval [lo, b) with b < hi? Its lo == lo → k = its index, included in [i,j) if i <= it. i = k-1 or k; if left neighbor doesn't merge, i = k = that interval's index... wait no: if ivs = [[5,6]] and add [0,10): k = bisect_left((0,)) → first lo >= 0 → index 0. ivs[k-1] none → i=0. j = bisect_right((10,)) → 1. i<j: merge interval [5,6] → new (0,10). Good.

  So general new computation: if i < j: lo2 = min(lo, ivs[i][0]), hi2 = max(hi, ivs[j-1][1]) else (lo, hi). Then ivs[i:j] = [new]; when i==j this is insertion ivs[i:i]=[new]. 

- remove: as designed: k = bisect_left(ivs, (lo,)); j = bisect_left(ivs, (hi,)); pieces as above. Wait: I earlier used j = bisect_left(ivs, hi, key lo) = bisect_left(ivs, (hi,)). Check semantics: first element not < (hi,) → element (a,b) < (hi,) iff a < hi or (a==hi and ... (a,b) vs (hi,): a==hi → (hi,b) vs (hi,) → (hi,) < (hi,b)?? (hi,) is prefix of (hi,b), prefix is smaller → (hi,b) > (hi,) → not less → bisect_left stops → first index with a >= hi... element with a == hi: is it < (hi,)? (hi, b) vs (hi,): (hi,) < (hi, b) because shorter prefix → so (hi,b) is not < (hi,) → bisect_left returns first index where element >= (hi,), which includes a == hi. So j = first index with lo >= hi. Correct as designed (interval [hi,..) not removed).

  But hold on: for removal, intervals with lo == hi (i.e., lo_j == hi): do they intersect [lo,hi)? [hi,b) ∩ [lo,hi) — half-open, contains points x with lo <= x < hi and hi <= x < b → empty since x < hi and x >= hi impossible. Correct to exclude. But j = first with lo >= hi — interval with lo == hi excluded. Good.

  Wait but what about interval with lo in (lo, hi) but its position... j covers through those (they're < (hi,) since lo < hi... element (a,b) with a < hi: (a,b) < (hi,)? a < hi → yes less → included in removal range). Good.

  Left piece: i = k-1 if k>0 and ivs[k-1][1] > lo (strict, since removing [lo,hi): interval [a, lo) doesn't intersect). Note difference from add: >= vs >.

  Right piece: if j > i and ivs[j-1][1] > hi: append (hi, ivs[j-1][1]). But careful: ivs[j-1] must be an interval that we're removing, i.e., j-1 >= i. If j-1 < i (j == i == k and left didn't... e.g. i == j but ivs[j-1] == ivs[i-1] = the left neighbor with hi... if left neighbor hi > lo but <= hi and not merged? Let's see: ivs = [[0, 5]], remove [3, 4): k = bisect_left((3,)) → first lo >= 3 → index 1. ivs[0][1]=5 > 3 → i=0, left piece (0,3). j = bisect_left((4,)) → first lo >= 4 → index 1. j > i=0, ivs[0][1]=5 > 4 → right piece (4,5). ivs[0:1] = [(0,3),(4,5)]. Correct — split!

  Edge case where j == i: remove [3,4) with ivs=[[0,3],[4,10]]: k = first lo >= 3 → index 1 ([4,10]). ivs[0].hi=3 > 3? No (3 > 3 false) → i = 1. j = first lo >= 4 → index 1. i == j == 1. ivs[1:1] = [] — nothing removed. Correct: [3,4) ∩ set: [0,3) doesn't contain 3..4? [3,4): points 3 <= x < 4; [0,3) contains x<3 → no overlap. [4,10): x >= 4, but 4 not < 4... x < 4 required → no overlap. Correct, nothing removed. 

  Another: ivs=[[0,3]], remove [2,5): k = first lo >= 2 → 1. ivs[0].hi=3 > 2 → i=0, piece (0,2). j = first lo >= 5 → 1. ivs[0].hi = 3 > 5? No → no right piece. ivs[0:1] = [(0,2)]. Correct.

  Another: ivs=[[0,3],[2,...]] impossible (disjoint).

  Potential issue: i == j == some index, and pieces empty → ivs[i:j] = [] → no-op. Fine.

  One more subtle: right piece condition — must ensure ivs[j-1] is being removed (j-1 >= i). If j > i, yes j-1 >= i. Condition written as `if j > i and ivs[j-1][1] > hi`. If j == i, ivs[j-1] is not removed — but could ivs[j-1].hi > hi with j==i? ivs[j-1] with j == i: its lo < ... j = first lo >= hi, so ivs[j-1].lo < hi. If j == i and i == k-1 case: ivs[k-1].lo < lo (since k-1 < k=bisect_left(lo) → lo_{k-1} < lo). Left neighbor with lo < lo and hi > hi → it contains [lo,hi) entirely... then left piece (lo_neighbor, lo) added and i = k-1 = j-1... then j > i? j >= k = i+1 > i. Hmm: if i = k-1 then j >= k > i so j > i holds. If i == k == j: no left neighbor merge; ivs[j-1] = ivs[k-1] has hi < lo... wait ivs[k-1].lo < lo and we didn't merge → ivs[k-1].hi <= lo. Then ivs[j-1][1] > hi? hi_{k-1} <= lo < hi → false. So condition safe without explicit i<=j-1 check, but I'll keep `j > i` guard for clarity/safety. Actually if j == i and ivs[j-1][1] > hi → then that interval overlaps [lo,hi) at its right part but wasn't counted... can't happen as shown. Keep guard anyway.

- add left merge uses >= (touching merges), remove left uses > (touching doesn't matter for removal since removal [lo,hi) removing point lo... interval [a, lo) is not affected by removing [lo, hi)). Right: add j uses bisect_right with (hi,) → includes lo == hi in merge (touching at right merges). remove j uses bisect_left → lo == hi excluded. Consistent.

Add example verify touching right: ivs=[[5,8]], add [0,5): k = bisect_left((0,)) → 0. i=0 (k==0 no left check). j = bisect_right((5,)): elements (5,8) vs (5,): (5,8) > (5,) → bisect_right returns first index > → j = 0? bisect_right(a, x) returns insertion point after existing entries equal to x. (5,8) != (5,) but is it > x → yes → so j=0. Hmm: j = 0 means first with lo > 5... (5,8): lo=5 not > 5. But tuple comparison says (5,8) > (5,) → bisect_right treats it as "greater", placing j before it. j = 0 → ivs[j-1] doesn't exist. Then merge range [i,j) = [0,0] empty, i==j → new = (0,5)?? But it should merge with [5,8) → (0,8)! Bug!

Because tuple comparison (5,8) vs (5,): (5,8) > (5,) — right. So bisect_right(ivs, (hi,)) does NOT give first lo > hi; it gives first index where (lo,h) > (hi,) i.e. lo > hi OR (lo == hi and h > anything)=true → so elements with lo == hi ARE counted as greater → j = first index with lo >= hi when lo==hi elements exist... element (5,8): lo == hi → treated as greater → j includes it in the "greater" side, so j = index of (5,8) = 0. That's wrong for add: we want (5,8) to merge with [0,5).

Fix: use j = bisect_right(ivs, (hi, -inf))? Compare (a,b) > (hi, -inf): a > hi → yes side; a == hi: (hi, b) vs (hi, -inf): second components b vs -inf → b > -inf → greater → j after it. a < hi → not greater. And a == hi with... any b real > -inf. But b could be... -inf doesn't occur. So j = bisect_right(ivs, (hi,)) is wrong; use bisect_right(ivs, (hi, NEG_INF))... hmm float('-inf') vs int comparisons fine (int vs float comparable). But bounds may be arbitrary numbers? "ints or floats" — fine, -inf works. But what if hi is itself -inf? Edge, ignore-ish; -inf vs -inf equal → (hi,-inf) == (hi,-inf) fine-ish.

Hmm wait, let me redo: for add, j should be first index with lo > hi (merge intervals starting at hi). Element with lo == hi should be included in merge range [i, j), i.e., not >= j. Using bisect: j = number of elements less than or equal to... we want j = first index with lo_j > hi. Elements with lo == hi must be < j. Compare element (a,b) with key (hi, +inf): (a,b) < (hi, inf)? a < hi → yes... a == hi: (hi,b) vs (hi,inf): b < inf → yes less (assuming b < inf always... if b == inf? intervals can't have lo==hi; hi == +inf possible? Real numbers — maybe allow inf bounds. If b = inf and key (hi, inf): equal → bisect_right places j after → excluded from merge. Interval [hi, inf) merging with [lo,hi): [lo,hi) ∪ [hi,inf) = [lo, inf) — should merge. With b=inf it's treated as not-less, excluded → bug only when hi=+inf or b=+inf. Ignore infinite-bound corner? The problem says "real numbers"; inf unlikely tested. I could instead avoid sentinel comparisons entirely by using key= functions or plain lo bisect on... 

  Cleaner: do j via manual: j = bisect_right(ivs, (hi, ...)) hmm. Alternative: since los are sorted, but duplicates impossible (two intervals same lo impossible — disjoint non-touching → distinct los). So los strictly increasing! Therefore first index with lo > hi = bisect_right over los alone. Element (a,b): a strictly increasing list. So I can bisect on ivs with a 2-tuple key where second element only matters on ties, and ties in lo never occur among elements, but the key (hi, x): comparison element vs key compares a vs hi first; a == hi → needs second comparison → b vs x. Since only ONE element can have lo == hi (strictly increasing los), the tie-break matters for exactly that element. To include it in merge range (j after it): need (hi, b) < key → key second > b → key = (hi, +inf) → j = bisect_right(ivs, (hi, inf))... bisect_right returns insertion after elements equal to key; elements less than key are before. j = first element NOT less than... no: bisect_right(a,x) = insertion point such that all a[:j] <= x... Actually bisect_right: all elements a[:j] <= x, a[j:] > x. We want elements with lo == hi to satisfy <= x i.e. (hi,b) <= (hi, inf): b <= inf → true (unless b > inf impossible; b == inf → equal → <= true). So key = (hi, inf) with bisect_right: j = first index with element > (hi,inf) → element > key iff a > hi or (a==hi and b > inf) → a > hi. 

  So add: j = bisect_right(ivs, (hi, _INF)) where _INF = float('inf'). For remove: j = first with lo >= hi = bisect_left(ivs, (hi, _inf)): element < key? a < hi... a==hi: (hi,b) < (hi,inf) true → included left side → j = first with element not < key → a >= hi... element with a==hi is < key → before j → so j = first with lo >= hi? Wait bisect_left: a[:j] < x, a[j:] >= x. Element (hi, b) < (hi, inf) → in left part → j after it → j = first index with element >= key → element >= (hi, inf) iff a > hi or (a==hi and b >= inf → b==inf). Hmm that gives j = first index with a > hi OR (a==hi and b==inf)?? No wait I'm confusing myself.

  bisect_left(a, x): returns first i such that a[i] >= x.
  - For remove, want first i with lo_i >= hi.
  - Element (a,b) >= x = (hi, _inf)? Compare: if a > hi → (a,b) > (hi,_inf)? a > hi → yes greater → counts as >= → included in right side. Good (a > hi should be at/after j). If a == hi: (hi, b) vs (hi, inf): b < inf → (hi,b) < (hi,inf) → NOT >= → placed before j. But we want first with lo >= hi → element with lo == hi should be AT j (i.e., >=). Contradiction → key (hi, inf) with bisect_left is wrong. Use key (hi, -inf) with bisect_left: element (a,b) >= (hi,-inf): a > hi → yes. a == hi: (hi,b) vs (hi,-inf): b > -inf → yes >= → element at j. a < hi → not. So j_remove = bisect_left(ivs, (hi, -inf)) → first with lo >= hi. 

  Similarly add: j_add = first with lo > hi = bisect_right(ivs, (hi, -inf)): bisect_right: a[:j] <= x. Element (hi, b) <= (hi, -inf)? b > -inf → (hi,b) > key → not <= → after j → j = first with lo > hi... element a > hi: > key → yes after. So j_add = bisect_right(ivs, (hi,-inf)) → first with lo > hi. 

  And k_add = bisect_left(ivs, (lo, -inf)) → first with lo >= lo? Element (a,b) >= (lo,-inf): a > lo → yes; a == lo: (lo,b) vs (lo,-inf) → b > -inf → yes. So bisect_right((lo,-inf)) would give first with lo > lo... I want first with lo >= lo = bisect_left(ivs, (lo, -inf)): element >= key iff a > lo or (a==lo and b >= -inf → true). Yes: bisect_left(ivs, (lo,-inf)) = first index with lo_a >= lo. Wait check a==lo, b=-inf? impossible. Good.

  Alternatively simpler: use bisect with key parameter to extract lo: bisect_left(ivs, lo, key=lambda t: t[0]) → first with lo >= lo — no sentinel issues, pure and clear. And bisect_right(ivs, hi, key=...) → first with lo > hi. bisect_left(ivs, hi, key=...) → first with lo >= hi. These are exact and clean. Cost: key lambda called ~log2(n) times per call in C? The key is applied to element each probe via C calling Python function → ~17 Python calls per bisect... measure ~1-2µs per bisect. For 60k adds × 2 bisects = 120k bisects × 1.5µs = 0.2s. Fine. contains 200k × 1.5µs = 0.3s. Acceptable.

  But without key, sentinel tuples are faster (raw tuple comparisons in C, ~0.3µs). Both fine. Actually simplest & fastest: keep a parallel... no. I'll use sentinel-tuple bisects — no Python-level key calls.

  Actually cleaner alternative avoiding sentinels in code readability: define helper functions with explicit tuples. Let me just write it carefully with comments.

Hmm wait, actually there's subtlety with mixed int/float and equality: (lo, -inf): second comparison only when first equal. Fine.

But hmm, what about comparing tuple (5, float('inf')) as an interval vs key (5, -inf)? Not needed since we bisect with keys (hi,-inf), not raw.

Also alternative: since los are strictly increasing, I could do pure-integer bisect with a maintained parallel list of los (floats/ints). Insert/delete in two lists doubles memmove but bisects become pure C on a list of numbers without tuple construction cost... sentinel tuples also constructed in C? Constructing (hi,-inf) tuple per call: cheap. I'll use single-list + sentinel keys.

Let me also double check add's left condition: ivs[k-1][1] >= lo merges touching ([a,lo) touching [lo,hi) → merge to [a, max(lo,hi)=hi... new lo = min(lo, a) = a). Yes for add we merge touching on both sides. Condition: k > 0 and ivs[k-1][1] >= lo → i = k-1. Note ivs[k-1][1] >= lo with lo_{k-1} < lo... hi_{k-1} could be > lo (overlap) or == lo (touch) → both merge. Right.

Now also `intervals()`: return list of tuples sorted disjoint merged — our invariant guarantees. Copy to list: `list(self._ivs)` — tuples immutable, sharing fine.

Contains with sentinel: idx = bisect_right(ivs, (x, +inf))?? We want idx = last interval with lo <= x → number of intervals with lo <= x = bisect_right(ivs, (x, inf))? Element <= (x, inf): lo_a <= x with tie a == x: (x,b) <= (x,inf) always true → yes. a > x → false. So count = bisect_right(ivs, (x, inf)) hmm element with lo == x: (x, b) <= (x, inf) since b <= inf → included → count includes it → idx = count-1 has lo == x → contains → check hi > x. Correct. Or simpler: idx = bisect_right(ivs, (x,)) - 1? Element (x, b) vs (x,): (x,b) > (x,) → not counted → count = number with lo < x... then idx could have lo < x... but interval with lo == x exists? los strictly increasing so at most one; if it exists, bisect_right((x,)) excludes it → idx points to previous interval whose lo < x, hi <= ... hi_{idx} <= lo of the (x,·) interval = x → hi > x false → returns False incorrectly! Because x is in [x, b). So must use (x, inf) sentinel: then interval [x,b) counted, idx = its index, b > x → True. Correct: use bisect_right(ivs, (x, _INF))? Check no interval at lo==x case: x between intervals: count = # lo <= x → idx = last with lo <= x; check hi > x. Interval [a,b), a <= x < b... need hi > x: condition ivs[idx][1] > x. Correct.

Hmm, wait: what if hi == x for that interval and lo <= x → not contained, returns False correctly.

Alternatively with key: bisect_right(ivs, x, key=lambda t: t[0]) - 1 → first lo > x minus 1 = last lo <= x. Equivalent, cleaner. I'll use key= for clarity? Mixed styles... Let me just use key lambdas everywhere for clarity; performance is fine (200k contains × ~17 λ calls... λ call ~50-80ns → 17 × 80ns = 1.4µs → 200k × 1.4µs = 0.28s; plus bisect overhead. OK).

Hmm, but 60k adds × 2 bisects × 1.4µs = 0.17s — fine.

Actually with key, Python's bisect wraps: it computes key(a[mid]) each iteration → yes.

Total est: adds ~ 60k × (2 bisects + slice assign memmove + overhead) ≈ 60k × (3µs + memmove avg). As computed memmove total under ~1s. contains ~0.3s. Total well under 2s. Good enough — skip chunking.

Edge: bisect key with empty list: fine.

Now write code:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_ivs",)

    def __init__(self):
        self._ivs = []          # sorted list of (lo, hi), disjoint & non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        k = bisect_left(ivs, lo, key=_lo)
        i = k - 1 if k and ivs[k - 1][1] >= lo else k
        j = bisect_right(ivs, hi, key=_lo)
        if i < j:
            new_lo = min(lo, ivs[i][0])
            new_hi = max(hi, ivs[j - 1][1])
        else:
            new_lo, new_hi = lo, hi
        ivs[i:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        k = bisect_left(ivs, lo, key=_lo)
        i = k
        pieces = []
        if k and ivs[k - 1][1] > lo:
            i = k - 1
            pieces.append((ivs[k - 1][0], lo))
        j = bisect_left(ivs, hi, key=_lo)
        if j > i and ivs[j - 1][1] > hi:
            pieces.append((hi, ivs[j - 1][1]))
        ivs[i:j] = pieces
```

Wait remove: pieces order: left piece (lo small) then right piece (hi) — left piece's hi = lo <= right's lo = hi → sorted. But careful: what if left piece and right piece come from the same interval with lo < hi? pieces = [(a, lo), (hi, b)] sorted fine. What if lo == hi? excluded.

But another subtle remove issue: what if there are intervals within [i, j) that shouldn't be removed? All intervals with index in [i, j) intersect the removal range: i is either k-1 (intersects since hi_{k-1} > lo) or k; j = first with lo >= hi; intervals k..j-1 have lo < hi and lo >= lo_{k}... each has lo... intervals in [k, j): lo >= (lo of...) they have lo < hi? bisect_left with hi → indices < j have lo < hi (strictly? element with lo == hi: with key-based bisect_left: element lo == hi → is a[mid] < hi for placement? key lo == hi not < hi → placed at/right of j → indices < j have lo < hi strict. Yes since bisect_left(key) puts equal elements on the right side. Good, intervals in [k,j) have lo < hi and lo >= lo... also lo >= lo? intervals in [k, ...) have lo >= lo... they have lo >= lo? k = first with lo >= lo → yes all indices >= k have lo >= lo → interval [a,b) with a >= lo, b > ... wait need them to be removed: removal [lo, hi) removes points in them: interval [a,b) with a >= lo and a < hi → overlap with [lo,hi) = [a, min(b, hi)) → removed, correct to delete. Combined with pieces. And interval i = k-1: overlap [lo, b). Right piece from ivs[j-1]: overlap of ivs[j-1] with removal: [max(a,lo), min(b, hi))... if ivs[j-1][1] > hi → its right part [hi, b) survives → piece (hi, b). If ivs[j-1][1] <= hi → fully removed (need b > lo: b > lo? b > a ≥ ... b >= hi... b >= a+? hmm b > lo since b > a... b > a and a = lo_{j-1} >= lo? If j-1 >= k then b > a >= lo → interval entirely within [lo,hi)? a >= lo and b <= hi → fully removed, and piece condition b > hi false → no piece. Correct.

But wait: is it possible that j-1 < k-1... i.e., right piece condition triggers with j-1 == i == k-1 (left neighbor merged into removal): ivs[k-1] with lo < lo? no: k-1 < k → lo_{k-1} < lo. hi_{k-1} > lo (i set to k-1) and possibly hi_{k-1} > hi → both pieces: (lo_{k-1}, lo) and (hi, hi_{k-1}) — requires hi < hi_{k-1} and lo_{k-1} < lo with lo < hi → pieces sorted: (lo_{k-1}, lo) then (hi, hi_{k-1}), need lo <= hi → yes lo < hi. Good.

And j >= k? j = bisect_left(hi) ≥ bisect_left(lo) = k since lo < hi. If i == k-1, j >= k = i+1 → j > i → slice ivs[i:j] nonempty... fine even if empty.

Another remove check: ivs = [[0,10],[20,30]], remove [5, 25): k = first lo >= 5 → 1 ([20,30]). ivs[0].hi=10 > 5 → i=0, piece (0,5). j = first lo >= 25 → index 2? los: 0, 20 → first >= 25 → 2. j > i: ivs[1].hi = 30 > 25 → piece (25,30). ivs[0:2] = [(0,5),(25,30)]. Correct.

contains:
```
def contains(self, x):
    ivs = self._ivs
    idx = bisect_right(ivs, x, key=_lo) - 1
    return idx >= 0 and ivs[idx][1] > x
```
bisect_right(key) → first with lo > x; minus 1 → last with lo <= x. Check hi > x.

total_length: sum(h - lo for lo, h in self._ivs).

__len__: len(self._ivs).

intervals: list(self._ivs) — but should return list of tuples; stored as tuples. But note: add stores tuples; remove pieces tuples. Good.

Module-level `_lo = operator.itemgetter(0)` for speed — itemgetter is C-implemented, faster than lambda. bisect with key requires a callable taking element → itemgetter(0) works.

Hmm one more check of add when merging with right touching where interval starts at hi: ivs=[[5,8]], add [0,5): k = first lo >= 0 → 0. i = 0 (k==0 → i=k=0? k>0 false → i = k = 0). j = first lo > 5 → 1. i<j: new = (min(0,5)=0, max(5,8)=8) → [0,8). Correct.

Add [0,5) with ivs=[[5,8]] where 5 == hi — merged. Invariant "non-touching" maintained by merging both sides. 

Add overlapping multiple: ivs=[[0,2],[4,6],[8,10]], add [1,9): k = first lo >= 1 → 1 ([4,6]). ivs[0].hi=2 >= 1 → i=0. j = first lo > 9 → 3. new = (0, 10). correct.

add with i<j but i==k-1 and the previous interval only touches: covered.

Also potential issue: add where lo falls inside interval i and left condition: ivs=[[0,10]], add [3, 4): k = first lo >= 3 → 1. ivs[0].hi=10 >= 3 → i=0. j = first lo > 4 → 1. new = (0, 10). ivs[0:1] = [(0,10)]. fine.

Now think about whether merged invariant could break: new_hi = max(hi, ivs[j-1][1]); next interval after j-1 has lo > ... lo_j > hi? j = first lo > hi → lo_j > hi... but could lo_j == new_hi where new_hi = ivs[j-1][1] > hi? E.g., ivs=[[0,5],[5,9]]: can that exist in our invariant? No — add would have merged them. Since invariant maintained inductively: before add, strict separation; after add, new_hi = max(hi, b_{j-1}); next interval lo_j > b_{j-1}? Before: lo_j > b_{j-1} (strict separation from previous interval j-1... unless j-1 == i == k-1 and... invariant holds pairwise). lo_j > b_{j-1} ≥? new_hi = max(hi, b_{j-1}) — if new_hi = hi, need lo_j > hi: yes by j definition. If new_hi = b_{j-1}, need lo_j > b_{j-1}: yes. But wait could interval j-1 not be part... j-1 >= i always when i<j, or j == i (no merge, new=(lo,hi)): then need separation with ivs[j-1] (if j>0): hi_{j-1} < lo? ivs[j-1] is the interval before insertion point... j = first lo > hi; if i == j, then ivs[j-1] (j>0) is not merged → not ivs[k-1] merged case... Let me verify: i == j. If j > 0: ivs[j-1] = ivs[i-1]. Cases: i == k (left check failed → hi_{k-1} < lo ✓). Or i == k-1... then j = i = k-1 < k → contradiction (j >= k). So i==j implies i==k, left check failed → hi_{i-1} < lo... wait left check: ivs[k-1][1] >= lo false → hi_{k-1} < lo ✓. And right: lo_j = lo_i > hi ✓. But also touching on right: new_hi = hi, next interval lo_i > hi → strict ✓. And could lo_i == hi? j = first lo > hi excludes lo == hi from... wait i == j: ivs[i] has lo > hi (since i == j = first lo > hi, and ivs[i] is that element) → lo_i > hi strict ✓.

Hmm, but wait — in add when i == j, we set ivs[i:j] = [new] which inserts. But what if actually there IS an interval with lo == hi (touching right) that should merge — j is defined as first lo > hi, and lo == hi element would be at index j... no wait first lo > hi: element with lo == hi is NOT > hi → it's before j. So ivs[j... if element with lo == hi exists, then j > its index. Is our i <= that index? Element with lo == hi: its index m: bisect: m >= k? lo == hi > lo → yes m >= k. If left check failed → i = k <= m... then i <= m < ... m < j → i < j → merge branch covers it. If left check succeeded, i = k-1 < m. So touching-right interval is always inside [i, j) → merged. But then new_hi = max(hi, ivs[j-1][1]) — ivs[m] = (hi, b) → b > hi → new_hi = b ✓. My earlier i==j analysis assumed ivs[i] lo > hi — consistent.

Everything holds. But wait, the touch-right merge case: ivs=[[5,8]], add [0,5): element (5,8) has lo == hi=5 → m = 0. k = first lo >= 0 → 0. left check: k==0 → i = 0. j = first lo > 5 → 1. i=0 < j=1 → new = (min(0,5), max(5,8)) = (0,8) ✓. Earlier I miscomputed using sentinel reasoning; key-based is straightforward.

remove check touching: ivs=[[0,5]], remove [5,8): k = first lo >= 5 → 1. ivs[0].hi = 5 > 5? No → i = 1. j = first lo >= 8 → 1. i==j → nothing. Correct ([5,8) doesn't remove [0,5)).

remove touching at left: ivs=[[5,8]], remove [0,5): k = first lo >= 0 → 0. i=0 (no left neighbor). j = first lo >= 5 → 0. i==j=0 → no pieces, no removal. Correct.

Great. Now performance of `ivs[i:j] = pieces` — one memmove. Good.

One more consideration: key=itemgetter(0). bisect signature: bisect_left(a, x, lo=0, hi=len(a), *, key=None). So call bisect_left(ivs, lo, key=_lo). Yes.

Define `_lo = itemgetter(0)` at module level.

Also `__init__` might accept optional iterable? Not required. Keep simple, maybe allow no args.

Should intervals() return copies? Tuples immutable → list(self._ivs) is fine.

Also maybe implement __iter__, __repr__ — optional, can add repr lightly. Keep minimal but __len__ required.

Let me also double check bisect_right(ivs, x, key=_lo) - 1 in contains when lo values equal... can't happen strictly increasing.

total_length returns number, ints when all ints: sum of integers stays int. Good.

Final code with docstrings.