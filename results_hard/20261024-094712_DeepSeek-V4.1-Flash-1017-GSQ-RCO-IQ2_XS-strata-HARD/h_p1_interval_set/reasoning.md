We need answer code block only. Need design IntervalSet standard library. Need implement efficient add/remove, contains O(log n), intervals merged, len.

Need careful semantics: store disjoint half-open intervals. add [lo,hi). remove splits. Values ints/floats, keep original values. Need handle touching merge: if [1,3), [3,5) merge. Since half-open, touching at endpoint. add should merge overlapping or touching. remove can split. Need invariants sorted disjoint non-touching? Actually intervals() merges touching, so internal can store merged (non-touching with strict hi < next lo). Add merges if overlap or touching: intervals overlap if hi >= next_lo? For half-open [lo, hi), [a,b): if hi == a they touch but no overlap, merge. If hi > a overlap. So merge when new_hi >= next_lo? Wait new interval [lo,hi) and existing [a,b) with a < lo? To merge if hi >= a (touching if hi==a), yes if existing a <= hi. If new is [a,b) existing [lo,hi), merge if existing_hi >= a. General intervals adjacent sorted: merge if current_hi >= next_lo. But if intervals truly disjoint and non-touching invariant, current_hi < next_lo.

contains O(log n): Need find interval with lo <= x < hi. Use bisect_right on starts then check index-1, or bisect_left on ends? Starts list. bisect_right(starts, x)-1 gives last interval with lo <= x. Check hi > x. If x equals hi? No, half-open. If x equals lo of interval, bisect_right includes starts<=x, last could be x's interval if there are later? Suppose intervals [1,2), [5,6), x=1: bisect_right([1,5],1)=1 index0, hi=2 >1 true. x=5: index1. Good. If x exactly hi of previous and lo of next after merging touching never separate. If not touching and x=2, bisect_right starts: if next lo >2, index0, check 2<2 false. Good.

Need data structure. Could maintain list of tuples and use bisect module. Add 60k random small disjoint intervals: naive insertion O(n) each gives 60k*60k? If intervals are small disjoint in random order, add needs merge? Each add inserts into list via bisect and list insertion O(n), for 60k ~ 1.8e9 maybe too slow in Python. Need performance well under 5 seconds. Need more efficient add. 60 000 add calls small disjoint intervals random order. Could use balanced BST? Python stdlib no. Could use sorted list with bisect and insertion: 60k * average size 30k => 1.8 billion C-level list moves? list insertion shifts pointers in C memmove, maybe 1.8e9 pointer moves ~ 14GB? Could be maybe several seconds. But repeated insertion O(n^2) could be too slow. Need better.

Could use an interval tree? Or use dict with sweep? Need dynamic operations.

Performance target 60k add, 200k contains. Need add perhaps O(log n + k) where k merges? But inserting sorted list O(n). 60k insertions random into list O(n^2) ~ 1.8e9 moves. In Python C list insert maybe 0.1 sec per 100k? Let's estimate. list.insert(0, x) for n=60k repeated 60k yields 1.8e9 pointer shifts. memmove ~ 8 bytes * 1.8e9 =14GB memory, could be 0.2-1 sec? Actually 14GB / 10GB/s ~1.4s. Plus binary search. Could be under 5? But maybe worst random insertion average half n =30k, 1.8e9, 14GB. In CPython, list insert implemented memmove, can handle maybe 15GB/s, ~1 sec. Overhead 60k not bad. But also merging logic might O(k). However requirement well under 5 sec. Probably okay? But need robust.

Could implement more efficient using treap/AVL from scratch? Standard library only. We can use sorted list. But 60k insertion O(n^2) may be acceptable? Let's consider 60k insert, 200k contains. Contains O(log n) via bisect. Add insertion into list. 60k * average 30k =1.8e9 pointer shifts; Python int object references. On modern CPU memmove 8 bytes, 14.4 GB. Could be ~1 sec. But Python list insert uses memmove and increments refcount only new item, not moved? It may use memmove. Likely under 5 sec. But "well under 5 seconds" perhaps.

However if intervals are "small disjoint intervals in random order", adding may not merge much. We need keep list sorted. We can use list of tuples. add using bisect. Need handle merging and removal.

Alternative use `bisect.insort` with tuple; but need merging. We can do add efficiently:
Given intervals list sorted non-touching. Need find intervals merging with [lo,hi). Because internal intervals non-touching, merge condition with neighbors.

Use starts list and intervals list? To do contains bisect starts. Could keep starts separate and intervals list parallel. Updating both. But insertion into starts and intervals. Add may remove multiple intervals. Need maintain.

Could use `sortedcontainers` not stdlib. Can't.

Could use dict keyed by starts? Need sorted order for contains. Could use `bisect` on list.

Could build custom balanced binary search tree using treap with interval endpoints. But more code. Need only 60k, list may be fine.

Let's design robust IntervalSet with list of intervals (lo,hi) sorted, non-overlapping and non-touching (hi < next_lo). We need add merges touching/overlapping so invariant.

add(lo,hi):
if lo >= hi return.
Need find position where intervals may overlap/touch.
Use bisect on starts? Let's store intervals sorted by lo. Need find index i of first interval whose hi >= lo? Since if existing hi >= lo, then overlap or touch with new [lo,hi). But if existing starts > lo, we also need include intervals with lo_start <= hi (touching/overlap). Simpler:
- Find i = bisect_right(starts, lo) - 1 (last interval with start <= lo). If i>=0 and intervals[i].hi >= lo (touch/overlap), the new interval intersects/touches interval i. Start merging from i. Else start at i+1 insertion position.
- Find j = bisect_left(starts, hi) maybe first interval with start >= hi? Wait intervals with start < hi and start > lo can overlap/touch new if start <= new_hi? Because if existing starts at hi, touch (hi == start) should merge. So need include intervals with start <= hi. Use bisect_right(starts, hi) gives first start > hi; intervals indices up to that-1. But only those after start. Also intervals with start exactly hi should merge (touch). So j = bisect_right(starts, hi). Need consider interval with start <= hi. But if existing interval starts at hi, it touches new and merge. Yes.

Alternative determine affected range:
- First affected possible: i = bisect_left(starts, lo) - 1? The interval with start <= lo. Check if its hi >= lo. If so affected. If not, no earlier affected.
- Last affected: k = bisect_right(starts, hi) - 1? Intervals with start < hi definitely if start >= lo and start <= hi? Need start <= hi to touch. So k = bisect_right(starts, hi) - 1 gives last start <= hi. But if intervals start before lo already not affected beyond first. Then if k >= i affected. However if no earlier touching but an interval starts exactly lo, bisect_left? Let's handle via lower_bound on hi.

Maybe simpler: Determine merge range:
1. i = bisect_left(starts, lo). This gives first interval with start >= lo. But an interval before i may have hi >= lo (overlap/touch). So if i>0 and intervals[i-1].hi >= lo, then start index = i-1, else start = i.
2. j = bisect_right(starts, hi). This gives first interval with start > hi. Intervals before j have start <= hi. But we only want intervals with start <= hi and that are in range. The last possible affected interval index is j-1, provided its start <= hi. Intervals with start <= hi might touch/overlap if their start <= new_hi and also their start >= new_lo? Since if interval start < lo and wasn't earlier? start i? Actually intervals with start between lo and hi overlap/touch. start==hi touches. So all intervals from start index to j-1 if start index <= j-1. But what about intervals with start < lo but interval before i? already handled as previous if hi >= lo. Could there be interval with start < lo and hi < lo not affected; interval before i not affected. Good.
3. If start_idx <= j-1, we merge intervals[start_idx:j] plus new. But need consider if no start_idx? Let's define:
   - `pos = bisect_left(starts, lo)`
   - if pos > 0 and intervals[pos-1][1] >= lo: start = pos-1 else start=pos
   - `end_excl = bisect_right(starts, hi)` (first start > hi). Intervals with start <= hi up to end_excl-1.
   - If start < end_excl, affected = intervals[start:end_excl]; merge into new_lo=min(new lo, affected[0].lo?) Actually start could be pos-1 with lo_old < lo, so merged lo = old.lo. merged hi = max(new_hi, affected hies). Since intervals sorted and non-touching, hi of last affected may extend beyond new_hi, so need max.
   - Replace intervals[start:end_excl] with merged interval.
   - If start == end_excl? Wait if no affected, start=pos and end_excl=bisect_right(starts,hi). If lo<=hi and no intervals with start<=hi? Suppose lo=5,hi=6, existing intervals starts [1,10]. pos=bisect_left(starts,5)=1. pos>0, intervals[0].hi=3 >=5? no. start=1. end_excl=bisect_right(starts,6)=1 (since start10>6). start==end_excl=1, insert at 1. Good.
   - If an existing interval starts exactly hi: start=pos maybe pos? Existing start hi >? bisect_left(starts,lo) if lo < hi, pos maybe before. end_excl=bisect_right(starts,hi) includes start==hi. Suppose new [1,3), existing [3,5). pos=bisect_left([3],1)=0, start=0. end_excl=bisect_right([3],3)=1. start<end_excl affected existing [3,5), merged [1,5). Good.
   - Suppose existing [1,2), new [3,4). pos=bisect_left([1],3)=1. pos>0, intervals[0].hi=2 >=3 false, start=1. end_excl=bisect_right([1],4)=1. start==end_excl insert at1.
   - Suppose existing [1,5), new [2,3). pos=bisect_left([1],2)=1. pos>0, intervals[0].hi=5>=2 true, start=0. end_excl=bisect_right([1],3)=1. affected [1,5), merged [1,5). replace. Good.
   - Suppose existing intervals [1,2),[4,5), new [2,4). pos=bisect_left([1,4],2)=1. pos>0 intervals[0].hi=2>=2 true start=0. end_excl=bisect_right([1,4],4)=2 (starts <=4 includes [4,5)). affected [1,2) and [4,5), merged lo=1 hi=max(4,5)=5 => [1,5). That merges via touching at 2 and 4? New [2,4) touches [1,2) at 2 and [4,5) at 4, yes [1,5). Good.
   - Suppose existing [4,5), new [1,3): pos=bisect_left([4],1)=0, start=0 (no prev). end_excl=bisect_right([4],3)=0. start==end_excl=0 insert at 0. Good. No touch because hi=3 < start4.
   - Suppose existing [3,4), new [1,3): pos=bisect_left([3],1)=0, start=0. end_excl=bisect_right([3],3)=1. affected [3,4) touch at 3. merged [1,4). Good.
   - Suppose existing interval with start > hi but its lo? no touch if start>hi.
Need compute merged_hi max over affected intervals and new hi. Since affected intervals sorted and non-touching, last affected hi could be max. But if start=pos-1 due overlap, affected intervals start from previous; there might be intervals between pos and end_excl. Since intervals non-touching internally, hies increasing? Not necessarily if intervals disjoint sorted, hi increases? If intervals non-touching, next.lo > prev.hi, so next.hi > next.lo > prev.hi, so hies increasing. Thus last affected hi max. But if affected none etc. Use max for safety.

After replacing start:end_excl with (merged_lo, merged_hi), need maintain non-touching with neighbors. Is it possible merged interval now touches next or previous? We included intervals up to start <= hi (touch), and previous overlap. Need consider next interval start maybe <= merged_hi? end_excl = first start > original hi, but merged_hi may be > original hi due affected interval extending. Could it touch/overlap next interval after end_excl? If affected interval extends beyond new hi, then its hi is already < next start due original invariant. So merged_hi = affected last hi < next_lo (since no touching). If new hi extends beyond affected last hi, end_excl first start > new_hi, so next start > new_hi. Thus no touching next. Previous interval before start: if start was pos-1 due prev hi>=lo, included. If start=pos no affected previous, previous interval index pos-1 has hi < lo (because if hi>=lo we would start pos-1). Thus merged_lo=lo > prev_hi. Good.
But if merged_lo = old.lo from affected previous, previous before start has hi < old.lo (invariant). Good.
Thus invariants maintained.

remove(lo,hi):
if lo>=hi return.
Need subtract [lo,hi) from existing intervals. For each interval overlapping [lo,hi), remove overlap, possibly split into left [a, lo) if a<lo, and right [hi, b) if hi<b. Because intervals half-open. Need process all affected. Could do via bisect range similar.

We can find affected intervals that overlap removal. Since half-open, overlap if interval.hi > lo and interval.lo < hi. Touching endpoints? If interval [1,2), remove [2,3) no overlap (hi=2 >? no, hi > lo? 2>2 false). So no remove. If interval [1,3), remove [2,4) overlap [2,3), left [1,2). Good. If remove [1,2) from [1,3): interval.hi=3>1, lo=1<2 yes; left? a=1 < lo=1 false; right if hi=2 < b=3 => [2,3). Good. If remove [1,3) from [1,3), both no left/right. If remove [0,1) from [1,2), interval.hi=2>0 true, lo=1<1? no (lo<hi=1? 1<1 false) no overlap. Good. Condition interval.lo < hi and interval.hi > lo.

Affected range indices:
- First interval with hi > lo. Since starts sorted but hies increasing. Could use bisect? We can maintain hies? Or use starts. Need efficient remove. Number of intervals maybe up to many. Remove can scan affected intervals. We need find first interval that might overlap: last interval with start < hi? Actually any overlap requires interval.lo < hi. So first possible interval with start < hi. Use `j = bisect_left(starts, hi)` gives first start >= hi. Intervals with start < hi are before j. But also need interval.hi > lo. Could find first among those with hi > lo. Since hies increasing, could binary search on hies if maintained. But starts and hies parallel. We can use bisect_left on ends list? There is no `ends`? We can maintain `ends` parallel. For contains starts enough, but for remove need find first with end>lo. Since intervals invariant and hies increasing. Could maintain `ends = [hi]` alongside. Or use bisect on starts? The first interval whose hi > lo: use bisect_right(ends, lo) gives first end > lo? bisect_right(ends, lo) returns index after all ends <= lo. Yes. Since ends sorted increasing. So first_idx = bisect_right(ends, lo). Need ensure first_idx may be interval whose start >= hi? We also need start < hi. Last_idx = bisect_left(starts, hi) (first start >= hi). Affected are indices from first_idx to last_idx-1. But note if first_idx<len and intervals[first_idx].hi > lo by definition, and starts before hi. If first_idx <= last_idx-1, process.

Could implement remove by building new list for affected slice. For each interval in affected slice:
 a,b = intervals[k]
 left = None
 right = None
 if a < lo: left=(a, min(b, lo))? But interval overlaps removal if b>lo and a<hi. Since a may < lo. The part left is [a, lo) if a<lo. But need ensure lo < b? Overlap condition yes. Use left=(a,lo).
 if b > hi: right=(hi,b).
 But what if lo <= a and b <= hi entire removed no pieces.
 If a < lo and b > hi, interval splits into left [a,lo) and right [hi,b).
 Need if a<lo but b <= lo? Not overlap. affected ensures hi>lo. If a<lo and b>lo, left valid a<lo. But if b <= lo impossible. Need clamp? left_hi = min(b, lo). But if b <= lo, left zero not affected. For affected b>lo, `lo < b`, so left=(a,lo) if a<lo. However if b < lo? no.
 right if b > hi: (hi,b). Need hi < b. If hi <= a? Could remove before interval; affected condition interval.lo < hi, so a<hi. If b>hi then hi between a and b. right valid hi<b. Also if hi <= a, interval.lo < hi false? no. So okay.
 But if a < lo and b > hi, both.
 If a < lo and b <= hi, left [a,lo) (since b > lo, a<lo)
 If a >= lo and b <= hi, none
 If a >= lo and b > hi, right [hi,b) (since a<hi)
 If a == lo and b > hi, right [hi,b) (removes [lo,hi), leaves [hi,b)); no left because a<lo false.

Need replace affected slice with pieces. Could construct new intervals list by slicing: intervals[:first] + pieces + intervals[last:]. But remove may happen many times. Remove likely fewer? Spec doesn't state remove perf but could. Need efficient enough. Using list slicing for remove O(n) each. Could be okay maybe. But if many removals, O(n^2). Not specified. Maybe acceptable? We can implement more efficient? Use list rebuild each remove. 60k adds + maybe remove calls. Not known. Need robust.

Could use data structure more sophisticated? We can implement interval set using two sorted lists and modifications. But add already list insert O(n); remove list slicing O(n + affected). Fine for likely tests.

Need keep `starts`, `ends` parallel or derive from intervals. For contains O(log n), need starts list. For add, use starts. For remove, could use ends and starts. If we maintain intervals list, starts and ends lists. But updating all three is tricky. Could just maintain intervals and for contains use bisect on a separate starts list. Add/remove update starts, ends. Or contains use list of intervals and custom? `bisect_right` on intervals? If intervals list tuples sorted by lo, bisect_right(intervals, (x, float('inf'))) maybe O(log n) using tuple compare; we can avoid starts. For contains: index = bisect_right(intervals, (x, inf)) -1? But if x equals lo, tuple (x,inf) greater than (x,hi), so bisect_right returns after all intervals with lo<=x. The last interval with lo<=x. If interval lo=x, it includes it; if previous lo<x. Then check intervals[index][1]>x. But using `bisect_right(intervals, (x, math.inf))` with floats? Need x may be float, inf okay. But tuple comparison works. However `math.inf` standard. Or use `bisect_right(starts,x)`. Maintaining starts is easy but after modifications need update. Could maintain only intervals and use `bisect` with key? Python 3.11 bisect supports key (since 3.10). We can do `bisect_right(intervals, x, key=lambda iv: iv[0])`. But for bisect key need key param. Python 3.11 yes. Then no starts list. But for add/remove need starts. Could use bisect_left(intervals, lo, key=lambda iv: iv[0]) etc. However key parameter with list of tuples and target value x: `bisect_left(intervals, lo, key=lambda iv: iv[0])` works? It compares key(item) to x. Yes. For remove need ends too. Could use custom key? `bisect_right(intervals, lo, key=lambda iv: iv[1])` to find first end > lo. Because ends sorted increasing. bisect_right with key=end and target lo returns first index where key > lo? Let's verify: bisect_right(a, x, key) returns insertion point after all key <= x. So first with key > x. Yes. Could use same intervals list for both. But using lambda repeatedly in bisect O(log n), fine. This avoids parallel lists. But key lambda overhead maybe okay for 200k contains ~ 200k*log 60k ~ 3e6 lambda calls; okay. Add 60k * bisect ~ fine. However contains must O(log n): bisect_right(intervals, x, key=lambda iv: iv[0]) then check. Since key calls inside binary search. Good.

Need be careful with bisect and key in Python 3.11: signature `bisect_right(a, x, lo=0, hi=None, *, key=None)`. Yes.

But if using intervals list tuples sorted by starts and non-touching, ends also increasing. Need in add find `pos = bisect_left(intervals, lo, key=lambda iv: iv[0])`. If pos>0 and intervals[pos-1][1] >= lo start=pos-1 else start=pos. End_excl = bisect_right(intervals, hi, key=lambda iv: iv[0]) (first start > hi). affected intervals[start:end_excl]. But wait if start=pos-1 and pos = bisect_left starts lo. There could be intervals between pos and end_excl. We include. Good.

Need compute merged_lo. If affected, `merged_lo = min(lo, intervals[start][0])`? Since start may be pos-1 with lo_old < lo, and all others starts >= lo. If no affected, merged_lo=lo. `merged_hi = max(hi, intervals[end_excl-1][1])`? If affected. But if end_excl==start? no affected. If affected, last interval has highest hi due sorted and non-touching, so max with hi. Could compute max over slice to be safe. The affected slice could include intervals but last hi max. Use `merged_hi = max(hi, intervals[end_excl-1][1])` if start<end_excl. If start is pos-1 and there is affected previous, end_excl might be less than or equal start? If affected previous due hi>=lo but no intervals with start<=new_hi? Wait if previous hi>=lo. Since new hi > lo. end_excl = first start > new_hi. Previous start < lo < new_hi, so start (previous) < end_excl. Affected yes. But what if no interval from pos to end_excl but previous is affected. start=pos-1, end_excl = bisect_right starts hi. Since previous start < hi, end_excl at least start+1? If there are intervals with start <= hi includes previous? Wait end_excl is first start > hi. All intervals with start <= hi are before. start is previous index. Its start < lo < hi, so start < end_excl. Thus affected slice includes previous. Good.

But wait add merging condition with previous uses `intervals[pos-1][1] >= lo`. For half-open merge touching at hi==lo. Correct. If previous hi < lo no overlap/touch. Good.

Now remove using intervals and bisect keys:
- first = bisect_right(intervals, lo, key=lambda iv: iv[1]) gives first interval with hi > lo.
- last = bisect_left(intervals, hi, key=lambda iv: iv[0]) gives first interval with lo >= hi. Intervals with lo < hi are before last. Affected indices first..last-1 if first<last.
But is there possibility interval before first has lo < hi and hi > lo? first exactly first hi>lo. Good. last exactly first lo>=hi. All intervals with lo<hi. If first<last, process slice first:last.
Need build pieces. But list slicing and insertion. Could process in place:
`left = intervals[:first]`, `mid`, `right = intervals[last:]`; `new = left + pieces + right`. This O(n). Or use `intervals[first:last] = pieces` in place, which shifts remaining list O(n-last). In Python list slice assignment can be efficient. But building pieces list. Then `intervals[first:last] = pieces`. This mutates and shifts. If pieces count maybe same. For remove, if multiple removals, O(n^2). Fine.

But need ensure if pieces maybe touch adjacent intervals? Removal from [1,5) remove [2,4) leaves [1,2),[4,5). They are non-touching (2<4). It does not need merge with neighboring intervals? Suppose intervals [1,10), [10,20) not possible because stored merged. But removal [0,1) from [1,2) no piece. Removal [1,2) from [1,3) leaves [2,3). It may touch next interval [3,4)? Actually stored intervals non-touching, next lo > current hi=3, could be 3? Non-touching means hi < next_lo, so if current [1,3), next lo >3, not =3. But after removal [1,2), right piece [2,3) hi=3; next lo >3, so no touch. If remove [1,2) from [1,4) and next lo=4? But stored invariant hi<next_lo, current hi=4, next lo>4, not 4. However [1,4) could not be next touching. So pieces won't touch neighbors? What about left piece [a,lo) and previous interval hi? previous hi < a (because original interval start a and previous hi < a), so no touch. Right piece [hi,b) next lo > b (original interval hi b and next lo > b), so no. Within mid, pieces may be disjoint from each other as original intervals non-touching. However if removal spans multiple intervals, pieces from different original intervals could be adjacent/touch? Example intervals [1,3), [4,6) (non-touching hi=3 < next_lo=4). Remove [2,5). First interval leaves [1,2), second leaves [5,6). gap. No touch. Remove [2,4): first leaves [1,2), second fully? [4,6) remove [2,4) no overlap since lo=4 not <hi=4? condition interval.lo < hi false (4<4 false), so second unaffected. There is gap [2,4). No touch. Remove [3,4): intervals [1,3) unaffected (hi=3 > lo=3 false), [4,6) unaffected (lo=4 < hi=4 false); removal just gap. No pieces. Remove [2,5) from [1,6) one interval. Fine.
Could pieces touch each other if removal leaves right of one and left of next? Suppose original intervals [1,3), [3,5) would be merged stored. So no. Good.

However removal can create intervals that touch future additions? Invariant no internal touching. Pieces from mid won't touch due gaps. But consider removing a portion that makes two remaining pieces from same interval? They have gap [lo,hi). If lo==hi ignore. No touch. So pieces non-touching. If a piece hi equals next piece lo? Could happen if removal interval ends at same as next original start? But next original unaffected start >= hi. If start==hi, next original interval starts at hi. In stored invariant, previous original hi < next_start. Here previous original interval after removal right piece might end at its original hi < next_start. If next start==hi (removal end), next interval was affected? Condition lo_of_next < hi? If next lo=hi, not affected by remove (half-open). So right piece could end at original hi which is < next lo. If original interval extends beyond hi, right piece start=hi, next lo=hi? Wait next interval start=hi would mean original previous interval hi_old > hi and next_start=hi. But stored intervals: original current interval [a,b), next [c,d) with c > b. c cannot equal hi if hi < b? Wait if removal cutoff hi is inside current interval (a<hi<b), then b>hi. next start c > b > hi, so not equal. If removal cutoff hi <= a? not affected. If removal cutoff hi=next_start c, then current interval b < c=hi (since non-touching), so current interval b<hi; removal [lo,hi) might overlap current if b>lo. If b<hi, current fully left? For current interval [a,b), with lo <= a < hi? If remove [lo,hi) where hi=next_start, current interval might be affected if b>lo. It will be fully removed if b<=hi; no right piece. Next interval start=hi unaffected. Left pieces no touch. If current b > hi impossible because b<c? Wait next start c=hi, invariant b<c=hi => b<hi. So no right piece. Good.
Thus remove pieces maintain invariant.

Need `intervals()` returns list tuples. Since internal already sorted, disjoint, non-touching and merged. Return `list(self._intervals)` or copy. `__len__` length. total_length sum(hi-lo) could be computed each time O(n). Spec no complexity. Could maintain total length attribute to be O(1). But updates add/remove need adjust. Simpler sum each call. Could be O(n). Fine. But maybe many calls? Not specified. We can maintain `_total` for efficiency. Need careful.

Let's maintain total_length O(1). On add, compute affected total length subtract, add merged length. On remove, subtract removed total. But simple. Could compute total in add/remove. Use `_total`.
- add: if affected slice start:end, old_total=sum(intervals[k].hi - intervals[k].lo for k in start:end). merged_len=merged_hi-merged_lo. `_total += merged_len - old_total`. If no affected, `_total += hi-lo`.
- remove: affected slice first:last. The removed amount? We can compute pieces total and subtract old total of affected slice, add sum pieces. Or maintain total by subtracting overlap length? For each affected interval [a,b), removed portion = max(0,min(b,hi)-max(a,lo))? But intervals disjoint. Sum. Easier old_total = sum lengths affected; pieces total = sum(piece lengths); `_total += pieces_total - old_total`. Use loop.
Need update intervals list. In add: if start<end, replace slice with [merged] using `self._intervals[start:end] = [(merged_lo, merged_hi)]`. This shifts list. Could optimize if start==end insert via `insert(start, tuple)`. But slice assignment works. For no affected, `insert(start, (lo,hi))`. But start could equal end and might be > len? `insert` handles. For add with affected, use slice assignment. Note if start<end, `start` may be pos-1, `end_excl` could be start? no. Good.
Could combine: if start < end: old affected etc; intervals[start:end] = [(merged_lo,merged_hi)]; total update. Else insert at start.
Need consider if merged interval touches previous interval before start? We argued no. But after removing slice, if previous hi == merged_lo? We included previous if hi >= lo. If no previous affected, prev.hi < lo. If affected start includes previous, merged_lo = min(lo, prev.lo)=prev.lo, so previous before start (start-1) hi < prev.lo = merged_lo. Good. If start=pos, prev at pos-1 hi < lo (because pos>0 and prev.hi>=lo false). merged_lo=lo. prev.hi < lo. Good.
Could merged interval touch next after end? end = first start > hi (original hi), but if affected last hi > hi, next start > affected last hi (invariant) = merged_hi. If new hi > affected last hi, next start > new hi. So no touch. Good.

Potential issue with floats NaN? Not specified. Ignore.

Need Python 3.11. Need only code block. No tests. Could include import bisect. Need class.

Let's think about performance if using `bisect_left(intervals, lo, key=lambda iv: iv[0])`. The key parameter for bisect in Python 3.11: Actually `bisect_left(a, x, lo=0, hi=None, *, key=None)`. It compares key(a[mid]) < x. So lambda called. Fine. But for `bisect_right(intervals, lo, key=lambda iv: iv[1])`, it compares key(a[mid]) <= x. Returns insertion after all ends <= lo. Correct.

However for add `end_excl = bisect_right(intervals, hi, key=lambda iv: iv[0])`, returns first start > hi? Let's verify bisect_right on starts with target hi: after all starts <= hi. So index first start > hi. Yes. Affected intervals with start <= hi. But consider affected interval start exactly hi (touch). Included before end_excl (since start==hi <= hi). Good.

What about add where lo < hi but existing interval with start < lo and hi_old >= lo. pos=bisect_left starts lo gives first start >= lo. start=pos-1. end_excl=bisect_right starts hi. What if previous hi_old >= lo but hi < previous start? impossible hi>lo>start. So end_excl at least start+1? Since previous start < lo < hi, previous start <= hi, so end_excl > start. Good.

Now remove:
first = bisect_right(intervals, lo, key=lambda iv: iv[1]) -> first interval with hi > lo. Suppose interval [1,2), remove [2,3). first=bisect_right(ends,2) after ends <=2, first index1. last=bisect_left(starts,3) first start>=3 index1. first==last no affected. Good.
Suppose remove [1,2) from [1,3): first=bisect_right(ends,1) ends[1]=3 >1, first=0 (since ends<=1 none). last=bisect_left(starts,2) starts[1]=1 <2, first start>=2 index1 (none). first<last process [1,3). pieces left if a<lo? a=1<1 false. right if b>hi 3>2 -> (2,3). Replace slice [0:1] with [(2,3)]. Good.
Suppose remove [2,4) from [1,3): first=bisect_right(ends,2) ends[3]? first=0 because 3>2. last=bisect_left(starts,4) all starts<4 last=1. process [1,3). a<lo 1<2 left (1,2). b>hi 3>4 false. replace [1:1?] with [(1,2)]. Wait originally intervals [1,3) index0. First=0 last=1. pieces [(1,2)]. intervals[0:1]=[(1,2)] good. Removed [2,4) overlap [2,3) leaving [1,2).
Suppose remove [3,5) from [1,3). first=bisect_right(ends,3) ends=3 <=3 => first=1. last=bisect_left(starts,5) all starts<5 => last=1. no affected. Good because [3,5) touches [1,3) at 3 but no overlap. If next interval [3,5) exists, stored would have merged [1,5), but if not. Removing [3,5) doesn't affect [1,3). Good.
Suppose remove [1,3) from intervals [1,3), [5,6). first=bisect_right(ends,1) ends [3,6] first=0. last=bisect_left(starts,3) starts [1,5], first>=3 index1. process index0 [1,3). pieces none because a<lo? 1<1 false; b>hi? 3>3 false. intervals[0:1]=[] good. total decrease 2.
Suppose remove [0,10) from all. first=bisect_right(ends,0) first=0 if ends>0. last=bisect_left(starts,10) all starts<10 last=n. process all pieces none (a<lo? a >=0 so no; b>hi? b<=10 likely yes if b>10? If interval extends beyond 10 then right piece. E.g [1,20), remove [0,10) leaves [10,20), right). Good.

Need ensure total update with pieces. In remove, if first<last:
`old_len = sum(b-a for a,b in affected)` while constructing pieces maybe compute. `pieces_len=sum(b-a for a,b in pieces)`. `_total += pieces_len - old_len`.
Then slice assignment.
If no affected, nothing.

Potential nuance: `intervals()` should return all intervals sorted, disjoint, and with touching merged. Internal invariant non-touching, so okay. But if user calls add with lo/hi ints/floats, tuple values original. In merging, merged_lo = min(lo, intervals[start][0]) and merged_hi = max(hi, intervals[end-1][1]) preserving original values. If new hi equals old lo, merged uses old lo etc. If merging due equality, merged boundaries are original endpoint values. Good. For floats, exact comparisons.

Need decide on returning list of tuples. `return list(self._intervals)`. `__len__` returns len.

Could have `add` and `remove` ignore if lo >= hi. Need also handle weird types? no.

Let's think if using bisect key with tuple list and target `lo` comparing to key values. If lo can be float and starts ints okay. If lo is int and starts float okay. Fine.

Need code style.

Let's consider alternative data structure to improve add performance. Could use `bisect` + list insertion. 60k random insertions into list. We may worry O(n^2) but likely under 5? Let's estimate more accurately. Python list insert at position i shifts n-i elements via memmove. Random order add small disjoint intervals; interval insertion position random with respect to current size? If intervals are random order and positions, average shift ~ n/2. 60,000 inserts average current size 30,000 -> 1.8e9 elements (8 bytes each) =14.4GB. Memory bandwidth ~ 10-20 GB/s. memmove optimized maybe 0.5-1.5 sec. But Python also must handle tuple, slice etc. For each add, if no merging, `insert` uses `list.insert` C. 60k calls. Should be well under 5. If intervals in random order but small disjoint, there may be many touching/overlap? "small disjoint intervals in random order" means intervals themselves disjoint, but if e.g. intervals all of length 1 at integer starts random order 0..60000, adding them in random order. They don't touch if length 1 and starts integers? [0,1), [1,2) touch, so they would merge! Hmm "small disjoint intervals in random order" maybe intervals like [i, i+0.5) not touching. Or small disjoint intervals at random non-overlapping. If they are adjacent integer intervals [i,i+1), adding all will merge into one big interval, and insertions may not O(n). But if truly disjoint and non-touching, list size grows to 60k. Random insertion O(n^2). Under 5 likely.

But if add many intervals that merge, operations can become O(n) each due slice? Let's examine worst case for add merging many intervals. If adding a large interval that covers all, end_excl n, slice assignment intervals[start:end] = [(...)] removes all. O(n). Repeated can O(n^2). But 60k small disjoint intervals random order: each add size small; may merge with neighbors if adjacent. If they are disjoint but many adjacent? "disjoint" in math can include touching? They said intervals stored disjoint half-open, touching merged. "small disjoint intervals" likely non-overlapping and maybe not touching. If adjacent in random order, add merges, reducing list size; could still be okay. Worst if add first all non-touching then one huge interval, O(n) once. Fine.

Need maybe use `bisect_left` with key lambda each call. If list length large, okay.

Could optimize add merging slice total. We need calculate old_len for affected slice. We already have affected slice `intervals[start:end]`. Could sum over it. If large, O(k). That's okay; total affected elements maybe many over all adds? In worst case adding big interval after 60k inserts, O(n). Fine.

Potential bug: In add, when start<end, we use `end_excl` from starts <= hi. But affected range may include an interval before start? We start at previous if hi_prev>=lo. What if there is an interval before that also touches new due chain? Suppose intervals are non-touching stored. If prev at pos-1 overlaps new, can an earlier interval also need merge? Since intervals non-touching, earlier hi < prev.lo. New lo <= prev.lo? Actually if new lo > prev.lo, earlier hi < prev.lo < new lo, so no. If new lo <= prev.lo, earlier hi < prev.lo but could earlier hi >= new lo? Wait if new lo <= prev.lo, earlier hi < prev.lo. Could earlier hi >= new lo? If new lo is much smaller, e.g intervals [1,2), [3,4), new [0,3.5). pos=bisect_left(starts,0)=0, prev none start=0. end includes [1,2),[3,4), merged [0,4). Good. If new lo=2.5, intervals [1,2), [3,4). pos=bisect_left([1,3],2.5)=1. prev index0 hi=2 >=2.5? false, start=1. end_excl=bisect_right(starts,hi=3.5)=2 includes [3,4). affected [3,4) merged [2.5,4). Does [1,2) touch new? new lo=2.5 >2 no. Good. Suppose intervals [1,3), [4,5), new [3.5,4.5). pos=bisect_left([1,4],3.5)=1. prev [1,3) hi=3 >=3.5? false start=1. end_excl=bisect_right(starts,4.5)=2 includes [4,5). affected [4,5) merged [3.5,5). Does [1,3) touch new? hi=3 < lo3.5 no. What if new lo=3, intervals [1,3), [4,5). pos=bisect_left starts 3 =1. prev hi=3 >=3 true start=0. end_excl=bisect_right(starts,hi=4)=2 includes start4. affected [1,3) and [4,5) merged lo=1 hi=max(4,5)=5 => [1,5). New [3,4) touches [1,3) at3 and [4,5) at4, so [1,5). Good. Can an earlier interval beyond prev need include? start=pos-1 includes prev. Earlier intervals before prev have hi < prev.lo. Since new lo could be <= prev.lo? If new lo <= prev.lo, as in new [0,3.5) pos=0 no prev. If pos-1 exists, pos means first start >= lo. Thus prev.lo < lo (strict? bisect_left finds first start >= lo; prev start < lo). So new lo > prev.lo. Earlier hi < prev.lo < new lo. So no earlier overlap. Good.

What if prev start == lo? pos would be that index, not prev. start=pos. Then intervals with start=lo included; earlier hi < lo. Good.

Need remove pieces and total. Let's write.

Potential issue with `bisect_right(intervals, lo, key=lambda iv: iv[1])`: If intervals list empty, returns 0. Good. `bisect_left(intervals, hi, key=lambda iv: iv[0])`: returns 0. first=0,last=0 none.

Potential issue using `lambda iv: iv[0]` with `bisect_left` and `x` target; if x is float and iv[0] int, okay. If iv[0] is nan? no.

Could use local alias `_iv = self._intervals` inside methods? Maybe.

Let's implement:

import bisect

class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple[float|int, float|int]] = []  # maybe avoid annotations? Python 3.11.
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect.bisect_left(intervals, lo, key=lambda iv: iv[0])
        start = pos
        if pos > 0 and intervals[pos-1][1] >= lo:
            start = pos - 1
        end = bisect.bisect_right(intervals, hi, key=lambda iv: iv[0])
        if start < end:
            merged_lo = min(lo, intervals[start][0])
            # affected slice
            # merged hi max of hi and intervals[end-1][1] but if end-1 < start? start<end
            merged_hi = max(hi, intervals[end - 1][1])
            old_len = 0
            for a,b in intervals[start:end]:
                old_len += b - a
            intervals[start:end] = [(merged_lo, merged_hi)]
            self._total += (merged_hi - merged_lo) - old_len
        else:
            intervals.insert(start, (lo, hi))
            self._total += hi - lo

But wait if start<end, `merged_hi = max(hi, intervals[end-1][1])`. Is it sufficient? Since intervals slice may include previous interval start < lo and maybe multiple. If affected due previous hi >= lo but new hi is small, end might include intervals with start <= hi. The last affected hi is max because hies increasing. But if start=pos-1 and there are no intervals between pos and end? Actually end may be pos? Let's test new [3,4), existing [1,3), [4,5). pos=bisect_left starts3 =1. start=0 because prev hi=3>=3. end=bisect_right starts4: starts <=4 includes index1 start4, so end=2. affected [1,3), [4,5), merged_hi max(4,5)=5. okay. If existing [1,3), [10,20), new [3,4): pos=1, start=0, end=bisect_right starts4: first start>4? starts [1,10], end=1 (because start1 <=4; start10>4). affected only [1,3), merged_hi=max(4,3)=4, merged [1,4). Good.
If start=pos-1 and end could equal start? If previous hi >= lo, previous start < lo < hi. end first start>hi. Previous start <= hi, so end > start. Good.
Need old_len sum over slice. Could compute sum with generator. Fine.

But there's a subtle issue: `merged_lo = min(lo, intervals[start][0])`. If start is pos (no previous affected), intervals[start].lo >= lo, so min=lo. If start=pos-1 previous lo < lo, min=prev.lo. Good.
`merged_hi = max(hi, intervals[end-1][1])`. If affected last might have hi less than earlier? Internal hies increasing, yes. But if start=pos-1 and there are intervals after? all sorted. okay.

Now remove:
    def remove(self, lo, hi):
        if lo >= hi: return
        intervals = self._intervals
        first = bisect.bisect_right(intervals, lo, key=lambda iv: iv[1])
        last = bisect.bisect_left(intervals, hi, key=lambda iv: iv[0])
        if first >= last:
            return
        pieces = []
        old_len = 0
        for a,b in intervals[first:last]:
            old_len += b - a
            if a < lo:
                pieces.append((a, lo))
            if b > hi:
                pieces.append((hi, b))
        # But wait: if a<lo and b>hi, pieces left and right. If a<lo but b<=lo? not affected. first ensures b>lo, but if a<lo, lo< b due b>lo. left [a,lo) length positive. if a==lo no left.
        # if b>hi, need a<hi? affected by last ensures a<hi. right [hi,b). positive if b>hi.
        # Could there be pieces with a<lo and lo >= b? no because b>lo by first. Good.
        pieces_len = sum(b-a for a,b in pieces)  # pieces sorted? For each interval left before right; across intervals sorted. yes. But if both pieces from same interval, left then right. Across intervals, right of previous < next start? pieces sorted. Good.
        intervals[first:last] = pieces
        self._total += pieces_len - old_len

Need verify piece order. For affected intervals sorted, pieces generated per interval: left then right. Since intervals non-touching, previous right end (or original b) < next original a. Previous piece if right might end at original b, which < next a. Next left starts at next a. So sorted. If previous interval fully removed no piece. Good.

Potential issue if a<lo and b>hi, pieces `(a,lo)` and `(hi,b)`. If lo==hi? already ignore. If lo<hi, gap. Sorted. Good.

Could there be duplicate/overlap pieces from multiple intervals? Suppose interval1 [1,5) and interval2 [3,7) cannot stored. So no.

Need total for remove: pieces_len sum lengths. old_len sum lengths of affected intervals. Difference is removed length. Good.

Contains:
    def contains(self, x):
        intervals = self._intervals
        idx = bisect.bisect_right(intervals, x, key=lambda iv: iv[0]) - 1
        if idx >= 0:
            lo, hi = intervals[idx]
            return lo <= x < hi
        return False

But wait `bisect_right(intervals, x, key=lambda iv: iv[0])` returns first index with start > x. idx is last with start <= x. If there is later interval with same start? internal no duplicate starts. Good.
Check x exactly equals start of interval: bisect_right includes it, idx that interval. `lo <= x < hi` true if hi>x. If interval [x,x)? no. Good.
If x equals hi of previous and lo of next (would be merged if touching, but if gap? x=hi previous, next lo>hi. idx previous if bisect_right start x? Previous start < x; next start > x; idx previous. `lo<=x<hi` false. Good.
If x equals hi of interval and next start also x, internal would not have touching intervals because merged; no next. If gap exactly? no.
O(log n). Good.

`intervals` method:
    def intervals(self):
        return list(self._intervals)

`total_length`:
    def total_length(self):
        return self._total

`__len__`:
    return len(self._intervals)

Need perhaps allow bounds ints or floats. Annotations not necessary.

Should we add `from bisect import bisect_left, bisect_right` for speed. Use functions. Code:

from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect_left(intervals, lo, key=lambda iv: iv[0])
        start = pos
        if pos and intervals[pos - 1][1] >= lo:
            start = pos - 1
        end = bisect_right(intervals, hi, key=lambda iv: iv[0])
        if start < end:
            merged_lo = min(lo, intervals[start][0])
            merged_hi = max(hi, intervals[end - 1][1])
            old_len = sum(b - a for a, b in intervals[start:end])
            intervals[start:end] = [(merged_lo, merged_hi)]
            self._total += (merged_hi - merged_lo) - old_len
        else:
            intervals.insert(start, (lo, hi))
            self._total += hi - lo

Potential bug: `intervals[start:end]` if start can be > end? In else only start==end? Wait if start < end then slice. If start not < end, we assumed start==end. Could start > end? Let's check. pos=bisect_left starts lo. start either pos or pos-1. end=bisect_right starts hi. Since lo<hi. Generally end >= pos? Because all intervals with start < lo are before pos. end first start>hi. Since hi>lo, end >= pos? pos is first start>=lo. If no intervals, pos=0, end=0. If intervals, some starts between lo and hi. end >= pos. If start=pos-1, end could be pos-1? Is that possible? We argued if previous hi>=lo then previous start < lo < hi, so previous start <= hi and end includes previous index at least pos? end is first start>hi, previous index pos-1 start<lo<hi => end>=pos. So end>start. If start=pos, end>=pos. Could end<pos? no. Could end==pos (no intervals with start<=hi and >=lo). Then start=end=pos if no prev affected. If prev affected, end>=pos > start. So start>end impossible. Good.

Remove:
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        first = bisect_right(intervals, lo, key=lambda iv: iv[1])
        last = bisect_left(intervals, hi, key=lambda iv: iv[0])
        if first >= last:
            return
        pieces = []
        old_len = 0
        for a, b in intervals[first:last]:
            old_len += b - a
            if a < lo:
                pieces.append((a, lo))
            if b > hi:
                pieces.append((hi, b))
        pieces_len = sum(b - a for a, b in pieces)
        intervals[first:last] = pieces
        self._total += pieces_len - old_len

Potential bug: `first` could be less than `last`, but affected intervals maybe include one where hi<=lo? No first is first hi>lo. Since hies increasing, all from first have hi>lo. `last` first lo>=hi; all before last have lo<hi. So overlap. Good.

Potential bug with `pieces` if an interval is entirely removed: no pieces. If interval overlaps removal but a<lo and b>hi, pieces both. Could left and right pieces have zero length if a==lo? condition a<lo false. if b==hi? b>hi false. Good.

Need maybe total_length type number. If no intervals returns 0 int. Good.

Let's test mentally with examples:
s.add(1,3); add(3,5). First intervals[(1,3)], total2. add(3,5): pos=bisect_left starts3: starts [1], pos=1. start=1. pos>0 and intervals[0].hi=3 >=3 true -> start=0. end=bisect_right starts5: starts <=5 includes index0, end=1. start<end. merged_lo=min(3,1)=1. merged_hi=max(5,3)=5. old_len=2. slice [0:1]=[(1,5)]. total +=4-2=2 ->4. intervals [(1,5)]. intervals() [(1,5)]. Good.
remove(2,4): first=bisect_right ends lo2: ends[5] >2 ->0. last=bisect_left starts hi4: starts[1]<4, last=1. pieces: a=1<2 left(1,2); b=5>4 right(4,5). old_len=4. pieces_len=1+1=2. total +=2-4=-2 ->2. intervals [(1,2),(4,5)]. Good.
contains(2): bisect_right starts2: starts [1,4], starts<=2 includes index0, idx0 lo1 hi2, 1<=2<2 false. Good. contains(1.5)=true. contains(4)=x=4, bisect_right starts4 includes index1 (start4), idx1 lo4 hi5 true. Good. contains(3)= bisect_right starts3 includes index0, lo1 hi2: 3<2 false. Good.

Remove entire interval [1,2): first=bisect_right ends1: ends [2,5], ends<=1 none first0. last=bisect_left starts2: starts [1,4], first>=2 index1. pieces: a=1<1 false; b=2>2 false. pieces empty. old_len1. intervals[0:1]=[]; total +=0-1. Good.

Remove [1,1.5) from [1,2), [4,5): first=bisect_right ends1: ends [2,5] >1 first0. last=bisect_left starts1.5: starts [1,4], first>=1.5 index1. process [1,2). a=1<1.5 left(1,1.5); b=2>1.5? hi=1.5, b=2>1.5 right(1.5,2). So intervals [(1,1.5),(1.5,2),(4,5)]. Wait [1,2) remove [1,1.5) should leave [1.5,2), not left [1,1.5)! Let's recalc: remove [lo=1, hi=1.5) from interval [a=1,b=2). The removed part is [1,1.5). Remaining should be [1.5,2). Our piece logic: if a < lo: a=1<1 false, no left. if b > hi: 2>1.5 true, right (hi=1.5,b=2). pieces [(1.5,2)]. My earlier wrote left if a<lo false. Good. I mistakenly wrote a<1.5; actually a=1<1.5 true? Wait condition `a < lo` where lo=1, so 1<1 false. Correct. So pieces only right. Good.

Remove [1.2,1.5) from [1,2): a=1<1.2 left(1,1.2); b=2>1.5 right(1.5,2). Good.

Now consider add with interval that touches next but not previous. Example intervals [(1,2),(4,5)], new [2,4). pos=bisect_left starts2: starts [1,4], pos=1. pos>0 prev hi=2 >= lo2 true start=0. end=bisect_right starts hi4: starts<=4 includes index1 start4, end=2. merged_lo=min(2,1)=1. merged_hi=max(4,5)=5. old_len (1+1)=2. merged len4. total +=2. intervals [(1,5)]. Good. Note new [2,4) touches prev [1,2) at2 and next [4,5) at4, so merged [1,5). Good.

Add [3,4) to intervals [(1,2),(5,6)]: pos=bisect_left starts3: starts [1,5], pos=1. prev hi2 >=3? false start=1. end=bisect_right starts4: starts<=4 includes index0 start1, end=1. start=end=1 insert (3,4). intervals [(1,2),(3,4),(5,6)]. Contains etc. Note [3,4) and [5,6) gap 1. Good.

Add [2,3) to intervals [(1,2),(3,4),(5,6)]: pos=bisect_left starts2: starts [1,3,5], pos=1. prev hi2 >=2 true start=0. end=bisect_right starts3: starts<=3 includes index1 start3, end=2. affected [(1,2),(3,4)], merged lo=min(2,1)=1, hi=max(3,4)=4 -> [1,4). This is correct: [1,2) touch new [2,3), touch existing [3,4) at3, merge [1,4). Good.

Add [1,4) to intervals [(1,2),(4,5)]: pos=bisect_left starts1: pos=0. start=0. end=bisect_right starts4: starts<=4 includes index1 start4, end=2. affected both, merged lo=min(1,1)=1, hi=max(4,5)=5 -> [1,5). New [1,4) touches existing [4,5) at4, merge [1,5). Also overlaps [1,2). Good.

Remove can cause intervals to touch? Example intervals [(1,5)] remove [2,4) -> [(1,2),(4,5)] gap. fine.

Need consider `intervals()` merging touching after remove? We said pieces can't touch. But let's test a scenario where remove splits an interval and leaves two pieces that touch each other? Impossible gap [lo,hi) non-empty. If lo<hi, gap length >0. If lo==hi ignored. So not touch.

What if remove removes a gap between two intervals, causing them to touch? Example intervals [(1,2),(3,4)], remove [2,3). Does remove [2,3) affect intervals? first=bisect_right ends lo2: ends [2,4], ends<=2 includes index0 end2 -> first=1. last=bisect_left starts hi3: starts [1,3], first>=3 index1. first=1, last=1 no affected. So intervals remain [(1,2),(3,4)], gap [2,3). Removing [2,3) from set (which wasn't in set) does nothing. They remain not touching? They touch at? [1,2) and [3,4) no. If intervals [(1,2),(2,3)] would have been merged. If remove [2,2)? ignored. What if intervals [(1,2),(4,5)], remove [2,4) (gap). first=bisect_right ends lo2: ends [2,5], ends<=2 includes index0 -> first=1. last=bisect_left starts hi4: starts [1,4], first>=4 index1. first=last=1 no affected. Nothing. intervals still gap. Good.
What if remove [1,2) from interval [1,5) leaves [2,5). Another interval? none. It might touch a previous interval? Previous interval before [1,5) has hi <1, so no. Next interval after [1,5) has lo >5, so no. Piece [2,5) not touching next if next lo>5. Good.
What if remove [0,2) from intervals [(2,3),(4,5)]? Does it affect first? first=bisect_right ends0: ends [3,5] >0 first0. last=bisect_left starts2: starts [2,4], first>=2 index0. first=last=0 no affected. Wait remove [0,2) should not affect [2,3) because half-open [2,3) starts at 2, removal ends at2. No overlap. Good. If remove [0,3) affects [2,3) fully removes. first=bisect_right ends0 ->0. last=bisect_left starts3: starts [2,4], first>=3 index1. first=0,last=1. process [2,3]: a=2<0 false; b=3>3 false, pieces none. intervals[0:1]=[] -> leaves [(4,5)]. Good. Does removal [0,3) also remove gap? no. Good.

Now performance. Could maybe improve add by not summing old_len via slice generator? If affected slice large, generator. Fine.

Potential issue: use `bisect_left(intervals, lo, key=...)` with `lo` and `intervals` list of tuples. The key is `iv[0]`. It works but in Python 3.11, `bisect_left` with key calls `key(a[mid])`. But it also might require target type comparable to key values. Good.

Need mention Python 3.11+? Code okay.

Let's consider if we can implement custom treap to be safer for performance. But code complexity. The problem likely from coding challenge expects sorted list with bisect. They mention 60,000 add and 200,000 contains under 5 seconds. Sorted list O(n) insert 60k maybe okay? Let's benchmark mentally more. 60,000 random inserts into list of up to 60,000. Average shift 30,000. Total shifts 1.8 billion. In C memmove, copying 8 bytes *1.8e9 =14.4 GB. Modern memory ~20 GB/s, so 0.72s. But list insert also decrements/increments refcounts? Python list insert uses `memmove` for pointers and adjusts list length; it does not refcount moved pointers? It might do `memmove` then set item. Refcount only for inserted object. So okay. The Python-level loop 60k; negligible. Bisect with key maybe 60k*log60k ~ 1e6 lambda calls. Under 5. Contains 200k * log60k ~3.2M lambda calls. Under 5. Good.

But there is a catch: `bisect` with key in Python calls lambda per comparison, each lambda is Python function, maybe 3.2M calls ~0.3s? Actually 3M Python function calls ~0.1-0.3s. Fine.

Remove could be many but not spec. If remove 60k times with list slice assignment O(n) each, 60k*30k=1.8e9 again. okay.

Need maybe avoid `lambda` repeated allocation in methods. Could define helper? Not necessary. But lambda created on each call to bisect; 60k+200k lambdas. Fine. Could store `key_start=lambda iv: iv[0]` as class? But lambda as instance attribute maybe. Could use operator.itemgetter(0) and itemgetter(1) standard library. But key parameter expects callable; `itemgetter(0)` is C-level faster. We can import itemgetter. That may improve. Use `from operator import itemgetter`; `START = itemgetter(0); END=itemgetter(1)`. Then `bisect_left(intervals, lo, key=START)`. This is standard library. Good. However itemgetter for tuple indexing returns C-level. Use in code.

Need ensure itemgetter target: `bisect_right(intervals, lo, key=END)` compares END(item) <= lo. Good.

Let's write with `from bisect import bisect_left, bisect_right` and `from operator import itemgetter`.

class IntervalSet:
    _start = itemgetter(0)
    _end = itemgetter(1)
But itemgetter class-level. Or module constants. Simpler define module-level `_first = itemgetter(0)`, `_second = itemgetter(1)`.

Need no tests, no printing. Only code block.

Let's ensure no type hints requiring imports? Could include no type hints.

Potential issue with `__len__` name conflict? fine.

Let's think about handling `-0.0` etc. no.

Let's maybe include docstrings? Not necessary.

Potential issue with total_length if merged interval length and old_len, `_total` could become floating rounding? It subtracts old and adds new. Since values exact, maybe small floating error. It should be okay. Could recompute total_length as sum if exactness matters. But user says keep original values, no rounding. If using floats, subtraction/addition may have floating error due operations. But total_length computed by sum could also have floating error. Maintaining `_total` with add/subtract may accumulate more error. If they expect exact? Maybe tests compare numeric with tolerance. But "Keep original values (no rounding)" refers interval endpoints. `total_length()` sum of lengths. With floats, arithmetic is inherently approximate. Maintaining total via updates could drift. Could instead compute total_length on demand `sum(b-a for a,b in self._intervals)` to avoid drift? But still sums. It might be more stable? Same. If many add/remove, _total may accumulate rounding errors larger. Tests might use ints mostly. Could use `math.fsum`? But standard. Spec doesn't mention. Could keep `_total` but when adding/removing use exact? For ints exact. For floats, small drift. Could recompute on total_length to be safe; O(n). Not performance-critical. But if 200k contains and maybe total_length calls? Not spec. Simpler maintain. But "Keep original values (no rounding)" maybe they check intervals() only. total_length could be expected sum. I'd lean maintain `_total` for efficiency. Most tests use ints. If floats, tolerance.

Could recompute total_length from intervals to avoid cumulative error but O(n). The spec doesn't require O(1). But if they call total_length many times after operations, recompute O(n) maybe. But no performance requirement. Maintaining is okay.

Let's consider if add merging with previous hi >= lo but intervals before start? We already.

Potential subtle bug: In add, `end = bisect_right(intervals, hi, key=_start)` finds first interval with start > hi. But if an interval before start has start <= hi and was not affected because its hi < lo? Wait start=pos (no previous affected). `end` includes intervals with start <= hi, potentially intervals with start < lo? But those are before pos? Since start=pos, intervals before pos have start < lo. They are not in slice. Good.
If start=pos-1 due previous affected, `end` includes intervals with start <= hi; we slice from start. It includes previous and any intervals with start between lo and hi. Good.
But what if there is an interval with start < start? not included. Previous before start has hi < intervals[start].lo. Could it touch new due new lo? If start=pos-1 (prev affected), previous before start may have hi >= lo? We argued no because prev.lo < lo and earlier hi < prev.lo < lo. If start=pos, previous before start has hi < lo. So no.

What if new interval overlaps an interval that starts before lo but its hi >= lo, and there are intervals between lo and hi. We start at pos-1, include all. Good.

Now `merged_hi = max(hi, intervals[end - 1][1])`. Suppose affected slice includes previous interval with hi huge and new hi small, and end includes intervals up to start<=new_hi. But previous hi huge may be greater than next interval? Wait internal non-touching: previous interval [a,b) with b >= lo. There may be intervals after previous? If b >= lo, then next interval start > b (since non-touching). But new lo maybe less than b. We start at previous. `end` includes intervals with start <= new_hi. Since next interval start > b >= lo. If new_hi < next start, end includes previous only. merged_hi = max(new_hi, b) = b. That extends merged to b. It might now overlap next interval? Next start > b (non-touching), so no. Good. If new_hi >= next start, end includes next and so on. The last affected hi is max. Good.

Now remove pieces: Suppose affected slice includes intervals that are fully removed, and pieces from subsequent intervals. We construct pieces in order. But what if an interval has both left and right pieces, and a later interval starts before right piece? Impossible because later interval start > current b, and right piece ends at b. So right piece before later interval. Good. If current interval right piece starts at hi and ends b; next interval start > b, so sorted. If current interval left piece ends at lo, right piece starts at hi>lo; gap. Good.

Need maybe if `pieces` empty, `intervals[first:last] = []` removes slice. Good.

Let's consider use of `remove` with `first`/`last` and `intervals[first:last]` if first<last. But if first==0, last=len, `intervals[0:len]=pieces`. Good.

Potential issue: `bisect_right(intervals, lo, key=_end)` uses ends sorted increasing. Are ends strictly increasing? Internal intervals non-touching: next.lo > prev.hi, so next.hi > next.lo > prev.hi. So yes strictly increasing. Good.

`bisect_left(intervals, hi, key=_start)` uses starts strictly increasing. Yes.

Now maybe we can add `add` and `remove` accept `lo`, `hi` and if `lo >= hi`. If lo/hi are non-numeric? no.

Let's think if total_length with `_total` after add merging: old_len sum affected. merged_len. If affected slice includes intervals whose total length old_len; merged interval length maybe smaller than sum if intervals had gaps? But affected intervals only overlap/touch new, and internal non-touching. However if affected slice includes intervals separated by gaps that are less than or equal hi? Let's examine affected slice from start to end includes intervals with start <= hi and previous. Could there be gaps between affected intervals that are not covered by new interval? Example existing intervals [1,2), [5,6), new [2,5). pos=1 (first start>=2 is [5,6) index1? starts [1,5], pos=1). prev hi=2>=2 true start=0. end=bisect_right starts hi5 includes start5 <=5 -> end=2. affected both. merged_lo=1, merged_hi=max(5,6)=6 -> [1,6). But new [2,5) touches [1,2) at2 and [5,6) at5, so union is [1,6) indeed gaps [2,5) filled by new, so merged length 5. old_len=2, total increase 3? Actually add [2,5) to [1,2),[5,6) gives [1,6) length5; old total2, increase3 (new length 3). Merged_len-old_len=5-2=3. Correct.
What if new [2,4), existing [1,2), [5,6). pos=1, prev hi=2>=2 start=0. end=bisect_right starts hi4: starts<=4 includes start1, end=1 (since start5>4). affected only [1,2). merged [1,4). old_len2? Wait old affected length [1,2)=1. merged len3. total increase2 (new length2). intervals [(1,4),(5,6)]. Correct, [1,2) touches new at2, merged [1,4). It does not include [5,6). Good.
What if new [2,5) existing [1,2), [5,6): affected both as above. Good.

Now consider add interval that covers gap between existing intervals but does not touch? e.g new [3,4), existing [1,2), [5,6). start=1 (after prev no touch), end=1 (first start>4? starts [1,5], start5>4, end=1). insert at1 -> [(1,2),(3,4),(5,6)]. Good.

Potential issue with add merging intervals that are not directly touched by new but become touching due new bridge? Example existing [1,2), [4,5), new [2,4). It touches both at2 and4, so merged [1,5). Affected start0, end2. Good.
What if new [2.5,3.5), existing [1,2), [4,5). It doesn't touch either. start=1 (pos? bisect_left starts2.5=1, prev hi2>=2.5 false). end=bisect_right starts3.5: starts<=3.5 includes index0 start1? Wait starts [1,4], bisect_right target3.5 returns 1 (first start>3.5 is index1 start4? Actually starts<=3.5 includes index0 only, so end=1). start=1, end=1 insert at1 -> [(1,2),(2.5,3.5),(4,5)]. Good. No merging.

Need maybe test contains with multiple intervals sorted. Already.

Now should we include `from bisect import bisect_left, bisect_right` and `from operator import itemgetter` at top. Yes.

Let's consider code block no extra text. Use ```python.

Potential issue: The problem says "Write Python 3.11+ code using only the standard library. Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing." So only code.

Let's maybe include `class IntervalSet:` with methods. Fine.

Could use `list[tuple[float|int, float|int]]` annotations? Python 3.11 supports. But if bounds can ints or floats, annotation `object`? Could omit.

Let's write final code.

Before final, let's think if maintaining `_total` after remove with pieces length uses `pieces_len = sum(b - a for a,b in pieces)`. If pieces empty sum returns 0. Good.

Potential issue: When remove affects intervals but leaves pieces that might touch each other or neighboring intervals due removal of gap? We argued no. But let's test a tricky: intervals [(1,10)] remove [2,8) -> pieces [(1,2),(8,10)]. They don't touch. If next interval [(10,20)]? Stored non-touching requires current hi=10 < next lo? If next lo=10, would have merged. So next lo>10. pieces right ends10. next lo>10. no touch. If previous interval [0,1]? current start1, previous hi <1. piece left starts1. previous hi<1. no touch.
What if intervals [(1,5),(6,10)] and remove [4,7). First interval affected? Remove [4,7): first=bisect_right ends lo4: ends [5,10], ends<=4 none first0. last=bisect_left starts hi7: starts [1,6], first>=7 none last2. process both. interval1 [1,5): a=1<4 left(1,4); b=5>7 false -> (1,4). interval2 [6,10): a=6<4 false; b=10>7 right(7,10). pieces [(1,4),(7,10)]. Original intervals had gap [5,6] not in set. Removing [4,7) removes [4,5) from first and [6,7) from second, leaves [1,4) and [7,10); gap [4,7). No touch. Good.
What if intervals [(1,5),(6,10)] and remove [5,6). first=bisect_right ends lo5: ends [5,10], ends<=5 includes index0 end5 -> first=1. last=bisect_left starts hi6: starts [1,6], first>=6 index1. first=last=1 no affected. Does remove [5,6) affect? [1,5) ends at5 not overlap because hi=5 > lo=5? condition interval.hi > lo false equal. [6,10) starts at6, lo<hi? 6<6 false. Gap [5,6) not in set. No effect. Intervals remain [1,5),[6,10). They don't touch. Good.
What if intervals [(1,5)] remove [5,6) no effect. Good.

Now think about contains if x is exactly at boundary between intervals that touch but internal merged. Fine.

Potential issue with `__len__` returning number of intervals. Since internal merged non-touching, count correct.

Need maybe make `intervals` method name not conflict with attribute. `_intervals` attribute. Good.

Let's write final.

Wait, there is a potential performance concern: In add, if `start < end`, we compute `intervals[start:end]` creates a new list slice to iterate. For large affected, okay. Then slice assignment. Could avoid slice copy by loop range. But fine.

Could compute old_len with `sum(b - a for a,b in intervals[start:end])`. This creates slice list then generator. Use `sum(intervals[i][1]-intervals[i][0] for i in range(start,end))` avoids slice. Minor. Let's use range to avoid extra allocation:
`old_len = sum(intervals[i][1] - intervals[i][0] for i in range(start, end))`.
Similarly remove loop over `range(first,last)` and access. Or slice is okay. Use range for efficiency.

Remove:
`for i in range(first,last): a,b = intervals[i] ...`
Then `intervals[first:last] = pieces`. This is fine.

Add:
`old_len = sum(intervals[i][1] - intervals[i][0] for i in range(start, end))`.
`merged_hi = max(hi, intervals[end - 1][1])`.

Now final code:

```python
from bisect import bisect_left, bisect_right
from operator import itemgetter

_START = itemgetter(0)
_END = itemgetter(1)

class IntervalSet:
    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect_left(intervals, lo, key=_START)
        start = pos
        if pos > 0 and intervals[pos - 1][1] >= lo:
            start = pos - 1
        end = bisect_right(intervals, hi, key=_START)
        if start < end:
            merged_lo = min(lo, intervals[start][0])
            merged_hi = max(hi, intervals[end - 1][1])
            old_len = sum(intervals[i][1] - intervals[i][0] for i in range(start, end))
            intervals[start:end] = [(merged_lo, merged_hi)]
            self._total += (merged_hi - merged_lo) - old_len
        else:
            intervals.insert(start, (lo, hi))
            self._total += hi - lo

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        first = bisect_right(intervals, lo, key=_END)
        last = bisect_left(intervals, hi, key=_START)
        if first >= last:
            return
        pieces = []
        old_len = 0
        for i in range(first, last):
            a, b = intervals[i]
            old_len += b - a
            if a < lo:
                pieces.append((a, lo))
            if b > hi:
                pieces.append((hi, b))
        pieces_len = sum(b - a for a, b in pieces)
        intervals[first:last] = pieces
        self._total += pieces_len - old_len

    def contains(self, x):
        intervals = self._intervals
        idx = bisect_right(intervals, x, key=_START) - 1
        if idx >= 0:
            lo, hi = intervals[idx]
            return lo <= x < hi
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Let's double-check remove `first = bisect_right(intervals, lo, key=_END)` returns first interval with end > lo. Yes. Suppose end equal lo: not overlap. Good.
`last = bisect_left(intervals, hi, key=_START)` returns first interval with start >= hi. Intervals before have start < hi. For overlap, need start < hi. If start == hi, no overlap. So last exclusive correct.
If first<last, intervals from first to last-1 have end>lo and start<hi. Good.

Potential bug: In remove, if an interval has `a < lo` and `b > hi`, pieces `(a,lo)` and `(hi,b)`. But what if `a < lo` and `b <= lo`? first ensures b>lo so no. What if `b > hi` but `a >= hi`? last ensures a<hi. Good.

Potential bug: In remove, if interval `a < lo` but `lo` could be > b? no.

Now, could remove produce pieces that should be merged with neighboring intervals that touch due to removal? Example intervals [(1,5)] remove [5,5)? ignored. Remove [4,5) leaves [1,4). It might touch a next interval starting at4? But original interval [1,5) and next interval start at4 would overlap originally (not possible). Next start >5. So no.
What if interval [(1,5),(6,7)] remove [5,6) no effect; intervals remain [1,5),(6,7). They don't touch. If remove [4,7): pieces from first (1,4), from second none? second [6,7) fully removed because a=6<7, b=7>7 false, a<lo? 6<4 false. pieces [(1,4)]. It removed [4,5) and [6,7], leaving [1,4). Gap [4,?]. No touch.
What if remove [1,6) from [(1,5),(6,7)]: first=bisect_right ends lo1: ends [5,7] >1 first0. last=bisect_left starts hi6: starts [1,6], first>=6 index1. first=0,last=1. process first [1,5): a<1 false; b>6 false; pieces none. intervals[0:1]=[]; second [6,7) unaffected? Wait remove [1,6) half-open excludes 6, so [6,7) not affected. last=1, slice only index0. Leaves [(6,7)]. Good. Does [6,7) touch removed? no. Good.
What if remove [1,6.5) from [(1,5),(6,7)]: first=bisect_right ends1: ends [5,7] >1 first0. last=bisect_left starts6.5: starts [1,6], first>=6.5 none last2. process both. first [1,5): a<1 false; b=5>6.5 false -> none. second [6,7): a=6<1 false; b=7>6.5 true -> right (6.5,7). pieces [(6.5,7)]. intervals[0:2]=[(6.5,7)]. Because removal [1,6.5) covers [1,5) and [6,6.5) from second, leaves [6.5,7). Good. Does it leave gap from? yes.

Now consider total_length after remove with pieces. For above old_len first interval 4 + second 1 =5. pieces_len 0.5. total decreases 4.5. Original total5. Remove [1,6.5) removed length 5.5 but only parts in set: [1,5) length4 + [6,6.5) length0.5 =4.5. New total0.5. Correct.

Now, one more subtlety: When adding an interval that touches previous and next, merged_hi computed as max(hi, intervals[end-1][1]). But what if the last affected interval's hi is not the max because intervals have decreasing hi? In sorted disjoint non-touching, hi increases strictly. Let's prove: interval i [a_i,b_i], i+1 [a_{i+1},b_{i+1}], non-touching: b_i < a_{i+1}. Also a_{i+1} < b_{i+1}. So b_i < b_{i+1}. Yes. So max is last. Good.

What if `end-1` < `start`? start<end ensures end-1>=start. Good.

Now final answer. Only code block. No explanation.