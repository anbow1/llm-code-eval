We need answer code only, single python code block. Need design IntervalSet. Need contains O(log n), adds possibly O(n) per insertion? 60k add small disjoint random order followed by 200k contains under 5s. If list sorted and bisect insertion O(n) per add shifting ~ 60k^2/2 = 1.8B? Actually list insert shifts pointers in C memmove, 1.8b maybe okay? 60k^2/2=1.8 billion elements shifts ~ 14GB memory move? Could be maybe 1 sec? But need robust.

Need implement. Requirements intervals merged touching. Need add/remove. Need contains O(log n). Could maintain sorted list of [lo,hi], use bisect. For 60k random disjoint small adds, each insert into sorted list O(n) shifting in C, 60k * average 30k = 1.8e9 pointers ~14GB memmove; likely < 5 sec maybe borderline but okay in C. But Python object shifting? list stores references, memmove. However 60k random add then 200k contains: contains bisect O(log n). Good.

Could use more advanced data structure balanced tree to keep add O(log n)? Standard library no sorted list. Could implement treap with merge split, or segment tree coordinate? Bounds real, no. Need preserve original no rounding. Could use skip list, treap. Simpler: sorted list with list insertion probably meets. But need careful remove splits etc. 60k add only; 200k contains. 1.8e9 operations in C okay? Memory move 14.4 GB, at 10-20GB/s <1s. With allocations, 60k, okay. The 200k contains with bisect fast.

But hidden tests may stress adds? Prompt performance only 60k adds. Need robust.

Need implement intervals() with merged touching intervals. If always maintain merged, intervals easy. Need methods.

Represent intervals list sorted by lo, disjoint non-touching? "with touching intervals merged ([1,3)+[3,5) gives [(1,5)])" after intervals. We should maintain merged so no touching. add [lo,hi), ignore lo>=hi. Need merge overlapping/touching. Find start index of intervals with hi < lo? Since touching should merge if hi >= lo? If existing interval ends exactly lo, they touch, merge. Need new [lo,hi) combine with intervals where interval.hi >= lo and interval.lo <= hi. But careful no overlap if hi == interval.lo? touch, merge. So find first interval whose hi >= lo (not strictly >; because touching). Actually if existing [1,3), add [3,5), first hi>=3 at index0, merge to [1,5). If add [5,6) no. To find first potentially connected: intervals with hi < lo are strictly before (not touching); skip hi < lo. Since sorted and non-touching, can bisect on hi list? Need efficient search. Could binary search using starts maybe find insertion point by lo and check prev. Add can use bisect on starts. To merge, we can scan from insertion index. But if interval before starts earlier and touches lo, need adjust start to index-1. Approach:

Use starts list? We can bisect intervals() with custom key? Python 3.10 bisect supports key? Could maintain separate lo list? Simpler use bisect with tuple list? Intervals as list of pairs sorted. Need find index position by lo. Use bisect_left(self.intervals, (lo,))? But tuples compare; (lo,) < (x,y) if lo <=? For bisect_left of tuple (lo,) returns first interval with lo >=? Need locate interval whose start maybe. Then check prev.

To merge an add:
- Use bisect_left to find i for lo among interval starts. We can use custom binary search manually to remain clear. Because list of tuples, bisect_left(self._intervals, (lo, -inf?))? Python cannot -inf maybe. `bisect_left(self._intervals, (lo,))` compares (lo,) < (hi? Wait tuple compare: (lo,) is shorter; if first equal, shorter is less. So first interval with start >= lo? For interval (a,b): (lo,) < (a,b) iff lo < a or lo == a and shorter -> true. Thus bisect_left returns first interval with start >= lo (since if start == lo, (lo,) < (lo,b) true, so left of it). Actually if start equal lo, returns index of that interval because tuple less. If start > lo also. Good. But we need include previous interval if its hi >= lo. Set start = i-1 if i>0 and intervals[i-1][1] >= lo else i. If no prev touching, start=i. But what if current interval start < lo and overlaps? bisect_left by lo gives first start >= lo; previous is only possible existing interval with start<lo. Since intervals disjoint, only previous can overlap/touch. Good.

Then end = start. Need merge forward while end < n and intervals[end][0] <= hi? We also need merge touching at hi. Since start maybe i where start >=lo. If existing interval start <= hi, overlap or touch (if start == hi). If start > hi stop, new interval before it. But if merging with previous, lo should min(existing.lo, lo), hi max(existing.hi,hi). We can scan from start, update lo=min(lo, int.lo), hi=max(hi,int.hi), end++. Stop when next interval.lo > hi? But if current merged hi grows. Need condition next start <= hi (touch at hi merges). For first, start may be i where first start could > hi, no merge. Then insert at i? Actually if no merge, start = i; end=start. We insert [lo,hi] at i. If previous touched we set start=i-1 and will merge previous. Update lo to min (prev.lo < lo typically), hi max. Then continue scanning from start+? We can simply scan from start while end<n and intervals[end][0] <= hi. Since start includes prev, condition true for prev? If prev start < lo and hi prev >= lo, intervals[start][0] <= hi true. Good. After consuming prev, hi may increase, continue. For i current if current.start <= hi (new hi maybe), consume. Good. But because intervals list non-touching, any later intervals start > previous hi >=? We only consume if start <= hi. Fine.

But subtle if i is first start >= lo and previous doesn't touch/overlap (`prev.hi < lo`), start=i. Insert without merge even if i interval.start <= hi? If start= i, condition while intervals[end][0] <= hi: if first start < hi, overlap; consume. If first start==hi, touch; consume merge. Good.

Then replace slice intervals[start:end] with merged interval. Since we ensure non-touching, insertion position start appropriate. If previous.hi < lo, and merging first at start with new, lo remains min (new lo <= first.start? Since first.start >= lo due bisect, so lo <= first.start; min lo = lo; hi max). Good.
If previous touches, start=i-1, lo gets min with prev.lo (prev.lo < lo maybe =? could equal? if prev.start == lo impossible unless duplicate, but if previous interval contains lo then bisect_left returns? Wait if lo inside previous interval [a,b), bisect_left returns index after previous, because previous start < lo. i points first start >= lo. prev is that interval. start=i-1. prev.hi >= lo true. Merge. Good.)

Need remove(lo,hi). Ignore lo>=hi. Need subtract [lo,hi). Maintain merged intervals. Need efficient? Remove could O(k + n) due slice, but not perf specified for remove. We can implement robust.

Given intervals sorted disjoint. Remove range may split one or more. We can find affected intervals and rebuild segment. Need preserve intervals outside. Since intervals merged and non-touching. Could use bisect.

Affected intervals are those with hi > lo and lo < hi, and touching? Removal [lo,hi). For interval [a,b):
- If b <= lo or a >= hi: unaffected. If a==hi, unaffected, no need merge; touching remains? If removing [lo,hi), existing [a,b)=[hi,...] leaves gap at hi? Actually [lo,hi) removed, interval [hi,...) remains. It is not touching with any preceding because removed. Fine.
- If b <= lo unaffected; if b == lo? Existing ends at lo, after removal, previous interval ends at lo and next starts hi, no touch. unaffected.
- For intersection:
   if a < lo and b > hi: split into [a,lo) and [hi,b). Note if hi==b, right empty. If lo==a no left.
   if a < lo <= b? left piece [a,lo) if lo>a and b>lo. If b>hi, right piece [hi,b) and maybe gap? Actually if interval spans both, split.
   For fully inside or overlaps start/end:
    [a,b) with a<lo<b<=hi -> left [a,lo)
    with lo<=a<hi<b -> right [hi,b)
    fully covered a>=lo and b<=hi -> remove.

Could implement by iterating from first affected. Find start index = first interval with hi > lo. Since intervals sorted/non-touching. Could use bisect on starts to find interval containing lo then check prev. Easier scan from max(0, bisect_left(starts, lo)-1) but if many? Need not performance. We can find with manual binary search on lo starts: `i = bisect_left(self._intervals, (lo,))`; then possible affected are i-1 and onwards. Need include interval whose start < lo and hi > lo. Since non-touching, i-1 only. But for removing range spanning many, we'll scan until interval.start >= hi (except if start==hi, not affected). Starting index = i-1 if i>0 and intervals[i-1][1] > lo else i. Because if prev ends exactly lo, not affected. If prev contains lo (hi > lo), include. At i, start >= lo. If start < hi, affected (unless start==hi? not affected). If start==hi, no. Use condition for affected intervals: interval[1] > lo and interval[0] < hi. With start adjusted.

Could rebuild affected slice. Iterate pos from start while pos < n and intervals[pos][0] < hi and intervals[pos][1] > lo? Actually from start it may include unaffected? start ensures at start maybe affected. Then while intervals[pos][0] < hi. Because intervals sorted; once start >= hi stop. For each, compute intersection. But if interval.start < hi and interval.hi > lo. Since start adjusted to first with hi>lo, all from start with start<hi are affected? There could be gap? Since list non-touching. If start is prev containing lo or first start>=lo. If first start>=lo but start >= hi, stop. If start<hi, hi of interval>lo? For first start>=lo, interval.end>start>=lo, so >lo unless empty invalid; yes. Later similarly. So while pos<n and intervals[pos][0] < hi (and interval.hi>lo automatically maybe if first). Need gather pieces.
We can replace slice from start to end with pieces:
- left piece if interval.lo < lo: retains [interval.lo, min(interval.hi, lo))? But if interval extends beyond hi (span), left [a,lo), right [hi,b) added separately. More generally for each affected, subtract intersection. Could collect all pieces:
For each affected [a,b):
  if a < lo: add (a, min(b, lo))? If b may be >lo. left = (a, lo) if a<lo and lo>a. But if b <= lo shouldn't be affected; not. Since affected, b>lo, so [a,lo) valid and not intersect removed. Add if lo>a.
  if b > hi: add (max(a,hi), b). If b>hi and hi < b. But if a >= hi, whole interval after remove? Actually if a >= hi, interval not affected by removal and start condition start<hi would exclude. But if interval spans (a<lo and b>hi) both pieces. If interval starts inside removed (a>=lo) and b>hi, right piece [hi,b). max(a,hi)=hi (since a>=lo but a could <hi? yes affected start a<hi; if a maybe <hi; if a could >=hi then not affected). If a<lo, right starts hi if b>hi. Good.
But what if hi within [a,b) and a<lo? add right (hi,b). left (a,lo).
For intervals fully to right? Not in affected.

Need ensure pieces sorted and non-touching. Could have adjacent pieces? Suppose interval [a,b) spans removal and removed inside: left [a,lo), right [hi,b); gap lo-hi >0, fine. Across intervals removal range can cause resulting left piece and right piece from other? But no new touching with unaffected outside? Example intervals [0,10), remove [3,5): pieces [0,3),[5,10) sorted non-touching. Good.
But with multiple intervals, remove can merge? Removing never causes intervals to touch (it creates gaps). So pieces from affected sorted and non-touching. Need insert pieces in place of removed slice. Since left pieces before right pieces but per interval. Iterate affected in order. For each interval:
 if a < lo: add (a, lo) (but if b <= lo not affected; no)
 if b > hi: add (hi, b) (but only if a<hi? affected ensures start<hi; but if a>=hi not in affected)
But consider interval [a,b) where a < lo and b > hi: add left then right. Good.
Consider interval partially left only [a,b) with b<=hi and a<lo: add (a,lo) only. Since b>lo, lo<b<=hi. left valid.
Consider interval partially right only a>=lo, b>hi: add (hi,b). Good.
Consider interval covered: none.
Now if interval has a<lo and b>hi, left/right. If interval starts before lo but b maybe equals lo? Not affected. Good.

Replace slice affected with pieces. Need not merge with unaffected because removal creates gaps at boundaries. But what about unaffected interval before affected ending at lo? Removal lo..hi, if previous interval ends at lo, unaffected remains [a,lo), first affected maybe starts at lo? If remove [lo,hi), affected intervals with b>lo. An interval starting at lo [lo,b) would be affected or fully removed. Previous ending at lo unaffected, but after removal, previous [a,lo) and new right piece maybe starts at hi > lo, no touching. If interval starts inside after removal, gap from lo to its start? hi removed. Fine.
What about unaffected after affected starting at hi? We don't include intervals with a>=hi. If an affected interval ends at hi fully covered, and next unaffected starts at hi. Removal removes [lo,hi), gap before hi? previous remaining piece might end at lo; next starts hi, gap lo-hi. Not touching. Good.
But consider removing [lo,hi) only part of interval [a,b) with a<lo and b>hi. We add [a,lo) and [hi,b). They are separated by removed gap, non-touching. Good.
What if removal range touches multiple intervals with gaps, pieces sorted. Need preserve sorted positions around unaffected. Replacing affected slice with pieces in order. The piece from first interval left may start before original start? It is same a as affected interval, so before removed slice start? We replace starting at start, but unaffected before ends before a (non-touching). Fine. But when we replace, the left piece belongs in same position as affected interval, which may be after some unaffected before start. OK.

We must be careful start index includes previous containing lo. If remove [lo,hi) and there is previous unaffected ending exactly lo, start should next. Condition prev.hi > lo (strict), so not.

Could implement binary search for find start affected. Use `i = bisect_left(self._intervals, (lo,))`. But if lo inside previous, i points first start >= lo (after previous). start = i-1 if i>0 and intervals[i-1][1] > lo else i. But what if i interval start == lo? With bisect_left tuple (lo,) returns index of interval with start==lo because shorter less. Suppose interval [lo,b) affected. i that interval. prev if hi>lo maybe? Intervals non-touch, prev.end < lo (since non-touching, cannot equal? If merged touching, prev.end < interval.start=lo; may equal? Touching would merge, so prev.end < lo strictly if gaps? Could be prev.end =? If prev.end == lo they'd touch and would merge, so not maintained. Thus prev.hi < lo. start=i. Good.
If lo inside interval [a,b), bisect_left starts returns index of next interval (a<lo), so start=i-1. prev.hi=b>lo include. Good.
If lo equals hi ignore.
If lo before all, i=0, start=0.
If lo after last, i=len, prev maybe last. If prev.hi > lo false if lo beyond end (or inside last? Wait if lo inside last and i=len? Actually if lo < last.hi, bisect_left over starts could still be len if lo > last.start? Example intervals [(0,100)]. lo=50. bisect_left(self._intervals,(50,)): compare (50,) with (0,100). (50,)<(0,100)? false; only one, returns len=1. start=i-1 if prev.hi>lo (100>50) yes. Good. If lo >= last.hi, false start=len, no affected. Good.

Need `contains(x)` O(log n). Since intervals disjoint sorted. Find rightmost interval with lo <= x. Use bisect_right on starts? `bisect_right(self._intervals, (x, float('inf'))?)` Tuple comparisons may issue with inf. Since interval tuple (lo,hi). We need idx = bisect_right on list of pairs by start. Using `bisect_right(self._intervals, (x,))`? Compare interval tuple (a,b) with (x,). For bisect_right, it inserts after any element equal. If x? Need find first start > x. Let's test: intervals [(0,5),(10,15)], x=5. `bisect_right(intervals,(5,))`: compare intervals[0]=(0,5) <= (5,)? (0,5) < (5,) true; intervals[1]=(10,15) <= (5,)? false -> idx1. idx-1 interval0, contains 5? 0<=5<5 false. Good. x=4 -> (4,) compare (0,5) <=? (0,5)< (4,) true because 0<4, so idx? compare second (10,15)< (4,) false -> idx1, interval0 contains 4 true. x=0 -> bisect_right with (0,): (0,5) <= (0,)? Compare (0,5) vs (0,): first equal, then tuple longer? (0,5) < (0,) is false? Python: compare first equal, then shorter tuple is less; so (0,5) > (0,). Thus (0,5) <= (0,) false, idx=0. idx-1=-1 -> false. Bug! Need find interval with lo <= x. bisect_right on starts using tuple (x, float('inf')) or use custom starts list.

Alternative maintain separate `_starts` list parallel. But add/remove need update both. Could use custom binary search over intervals by lo. Write O(log n) function manually.

`contains(x)`:
lo_idx = 0, hi_idx = len(intervals)
while lo_idx < hi_idx:
  mid=(lo+hi)//2
  if intervals[mid][0] <= x:
     lo=mid+1
  else hi=mid
idx=lo-1; if idx>=0 and intervals[idx][0] <= x < intervals[idx][1].
Since intervals sorted by lo. Good.

Could use bisect on lo starts with custom list to speed. Manual binary search 200k*log 60k ~ 3.2M, fine.

Potential improve by maintain `_los` list for bisect, but removal/add complexity. Not needed. Manual in Python loops maybe fine. 200k*16 comparisons ~3.2M trivial.

Need add performance: use bisect for lo. `bisect_left(self._intervals, (lo,))` works for first start >= lo? Need verify cases:
Intervals [(0,5),(10,15)], search lo=5. For each: compare (5,) < (0,5)? false; so i=1? Let's compute bisect_left(list, (lo,)):
i=0; mid=? list len2 mid1 (10,15). Is (5,) < (10,15)? true -> hi=1; mid0 (0,5). (5,) < (0,5)? false -> lo=1. returns1. First start >=5 is (10) index1. Good. lo=0: mid1 (10,15): (0,)<(10,...) true hi=1; mid0 (0,5): (0,) < (0,5)? true (shorter) -> lo=1. returns1? Wait first start >=0 should index0 because start=0, but we want first start >= lo. Actually if equal, we might want index of that interval not after? Let's clarify. For add with lo=0, if existing interval starts at 0 maybe overlapping; if gap? Since intervals non-touching, no duplicate start with new? If adding [0,2) while existing interval [0,5), lo inside existing: i should be 1, previous contains. It's okay. If adding [0,2) and existing starts at 0 but previous? i=1, prev index0, prev.hi=5>=0, start=0, merge. Good. If no existing starts at 0 and first start >0, returns0. Good.
But if existing interval starts > lo, returns its index. If existing starts ==lo, returns index after? With tuple (lo,) shorter, bisect_left returns after all intervals with start == lo? There cannot be more than one start equal due disjoint. But interval with start lo should be considered current, yet i points after it. Prev contains lo (since interval [lo,b), hi>lo unless invalid), so start=i-1, merge. Good. For add, using i and prev check works.
If existing interval ends exactly lo, e.g. existing [(0,5)], adding [5,7). Search lo=5. Compare (5,) with (0,5): first 5>0 so false. returns1 (len), prev index0 hi=5 >=lo true, start=0, merge touching. Good.
If existing interval ends <lo, prev.hi>=lo false, start=i. If i=len append. Good.
If adding [lo,hi) with lo inside previous and also maybe overlaps next? Since intervals non-touching and lo inside prev, hi could extend beyond prev into next. start=i-1. while next.start <= hi consumes overlapping/touching. Good.

For add `i=bisect_left(self._intervals, (lo,))`. start = i-1 if i>0 and self._intervals[i-1][1] >= lo else i. But wait if i points after interval with start==lo (because bisect_left returns after exact start due tuple shorter). If previous is that interval, condition hi>=lo true, start=i-1. Good. If i points first interval with start > lo, i-1 could be interval containing or ending. Condition hi>=lo catches touching/containing. Good.

Now merge scan:
```
end = start
while end < len and self._intervals[end][0] <= hi:
   a,b = self._intervals[end]
   if a < lo: lo = a? Actually lo=min(lo,a); hi=max(hi,b)
   else hi=max...
   end +=1
```
But condition `intervals[end][0] <= hi` for end=start if previous ends at lo and start prev: prev.start <= hi true, merge. Update hi=max(hi,prev.hi)=max(hi,lo)=hi maybe. Then next interval start? Since previous end>=lo; if new range doesn't overlap next (`next.start > hi old/new`), loop stops. But if prev ends at 100 and new hi=50 and lo=50? Wait adding [50,60) when prev ends 100 and starts 0: i? lo=50 inside prev, i after prev, start prev. prev.end=100>=lo. `hi` initially60. Condition prev.start(0)<=60 true merge prev, update hi=max(60,100)=100. Now next.start maybe >100; loop continues. Good. Need update hi after merging prev to 100 then condition next. Fine.
But what if start=i (no prev) and first interval start <= hi but maybe existing interval starts before lo? Could that happen if no prev because prev.hi<lo, start=i points first start>=lo. So not before lo. Fine.
Need update lo too. For prev containing lo, lo=min(lo,prev.start), hi=max. Use:
```
a,b = intervals[end]
lo = min(lo,a)
hi = max(hi,b)
end +=1
```
But mutating lo while loop condition uses new hi? Important: condition checks current interval.start <= current hi *before merge. After merging prev hi may increase, enabling merge next. In loop code while uses evaluated each iteration. If we set hi before next iteration, okay. But current iteration condition for next interval uses updated hi. Good.
However if hi initially small and start prev, condition true due prev.start <= small, merge prev expands hi; then next. okay.

Replace `self._intervals[start:end] = [(lo,hi)]`. Since lo could become prev.start. Sorted. Need perhaps ensure no merge with interval before start? start chosen includes any touching previous. What about after replacement new hi extends to touch an interval after end? Loop consumed all intervals with start <= hi. Since intervals non-touching, the next interval start > final hi (because loop stopped when next.start > hi at that moment; but final hi is from last consumed. Could merging a consumed interval expand hi further but loop will check subsequent; yes). So no touching. What about previous before start? If start=i and previous.hi < lo; after merging current first maybe lo remains min? It could be previous? No start excludes prev. No touch. If start=i-1, includes prev; interval before start has end < prev.start? non-touching, no touch. Good.

Intervals total length: maintain `_total`? Requirements total_length; could sum each time O(n). 200k contains only no total. Fine. But add/remove perhaps update total. Easier maintain total maybe. Need robust when add merge. Could compute total_length O(n). Not performance specified. But use sum. Or maintain to be O(n) for intervals anyway. Use sum `sum(hi-lo for lo,hi)`. __len__ len list.

Remove implementation details.

Let's design remove:
```
def remove(self, lo, hi):
    if lo >= hi: return
    intervals=self._intervals
    n=len(intervals)
    i=bisect_left(intervals,(lo,))
    start=i
    if start>0 and intervals[start-1][1] > lo:
        start-=1
    # find end affected: first interval with start >= hi? Need include intervals whose start < hi and hi_int > lo.
    end=start
    pieces=[]
    while end < n and intervals[end][0] < hi:
         a,b=intervals[end]
         # since start chosen first with b>lo or start>=lo; but there may be interval whose b<=lo? For later, since non-touching and intervals before? End scan from start, all intervals with start<hi. Could an interval within start.. with b<=lo? start chosen first affected, but if start=i and first start>=lo, b>start>=lo (for non-degenerate), so b>lo. For start=i-1 containing lo, b>lo. Then later intervals: if previous b>lo and non-touching, later start>previous b? Actually non-touching means previous.end < next.start (strict with gaps, or could equal? merged would merge, so strictly < if not touching? Wait maintained merged touching, so previous.end < next.start. If previous interval starts before hi and maybe ends before lo? start is first relevant. Later start > previous.end. Could later start<hi but possibly previous end? Still later interval might have b>lo? Since later start > start interval start. If start interval spans lo maybe later start could be > lo? It will satisfy b>start>lo. If start=i first start>=lo, then later start>prev.end>=start>=lo, so b>lo. Good. So all intervals from start with start<hi are affected (b>lo). What if start chosen i-1 because prev.hi>lo, but there is a gap and later intervals start maybe <hi; they are affected if b>lo of course start>prev.end>lo? prev.end>lo, so later start>prev.end>lo, b>lo. yes.
         if a < lo:
             pieces.append((a, lo))
         if b > hi:
             pieces.append((hi, b))
         end +=1
    intervals[start:end]=pieces
```
But issue: for interval that entirely contains removal? [a,b), a<lo, b>hi: pieces appends (a,lo), (hi,b). Good. For interval [a,b), a<lo, b<=hi: appends (a,lo). For interval [a,b), a>=lo, b>hi: appends (hi,b). But if a>=hi? We only include start<hi, so a<hi. If a>hi? not included. If a==hi: interval starts exactly at hi, not affected (because remove [lo,hi) does not affect it, and it should stay). Our while condition `intervals[end][0] < hi` excludes a==hi, so stays. Good. But what about interval starts < hi, but lies fully before lo? Cannot because start chosen after prev.hi>lo condition; if i start>=lo. However if start=i-1 containing lo, then next intervals start > prev.end > lo. So none fully before lo. Good.
What about an affected interval where a < lo and b == lo? Not relevant start i would not include previous (hi > lo false if equal, start=i). It remains unaffected [a,lo). Good.
What about interval where a==lo and b>lo. `a < lo` false, if b>hi append (hi,b), if b<=hi remove fully. Good.

Need ensure pieces are sorted and non-touching after replacement. Let's test tricky: intervals [(0,10),(20,30)], remove [5,25). bisect_left (5): interval starts: (0,10) < (5,) true, (20,30) < (5,) false => i=1. start: intervals[0].hi=10 >5 yes start=0. while end0 start0<25: a=0<b>? add (0,5), b=10 >25 false end1. end1 start20<25: a=20<lo? false; b=30>25 add (25,30). pieces [(0,5),(25,30)]. replace [0:2]. Good.
remove [10,20) with [(0,10),(20,30)]: lo=10 hi=20. bisect_left (10): compare (0,10) < (10,)? 0<10 true =>? Let's compute returns1. start=i=1? prev.hi=10 > lo? false. start=1. while end1 intervals[1][0]=20<20 false. no affected. Good, removal gap no intervals exactly at boundaries; actually [10,20) contains nothing (half open intervals end at 10 and start at20). Good.
remove [0,5) on [(0,10)]: bisect_left((0,)): (0,) < (0,10) true? Because shorter at equal first: yes (0,) < (0,10), so returns1 (len). start: i>0 prev.hi=10>lo=0 yes start=0. while end0 start0<5: a=0<lo? false (0<0 no), b=10>5 add (5,10). Good. If using bisect_left returns after exact start, start prev catches. Good.
remove [10,15) on [(0,10),(10,20)] but wait touching intervals should be merged, so not possible. Could be [(0,10),(11,20)]. remove [10,15): start? bisect_left (10): (0,10) < (10,) true? 0<10 yes; (11,20)<(10,) false => i=1. prev.hi=10 >10 false, start=1. while intervals[1].start=11<15: a=11<lo? false; b=20>15 add (15,20). replace index1 -> [(15,20)]. [(0,10),(15,20)] gap 10-15 removed? Actually removed [10,15), so [0,10) remains; [11,20) intersection [11,15) removed leaving [15,20). Yes.
remove [5,7) on [(0,10)]: i? bisect_left (5) len1; start0. while start0<7: a=0<5 add (0,5); b=10>7 add (7,10). good.

Now `intervals()` returns list copy. Since already merged sorted disjoint. Could return `list(self._intervals)`. Requirement touching merged. We maintain non-touching due add merging touch. Remove never creates touching? Let's check remove can create touching? Removing interval can leave left piece ending lo and right piece starting hi, gap. Could it cause an unaffected interval and a piece to touch? Removing only deletes; if before removal, intervals non-touching, after removal, two remaining pieces from different original intervals might become closer but cannot touch because removed range is a gap between lo and hi. Suppose original intervals [(0,100),(100,200)] would have been merged, not possible. Suppose remove [50,60] inside [0,100] leaves [0,50),[60,100) gap. No merge.
But scenario: remove an entire interval that exactly bridged? Intervals don't touch originally, so no bridge. Removing cannot cause left neighbor end equal right neighbor start? Left neighbor end < first affected start <=? Right neighbor start maybe = hi; gap from lo to hi removed. Left neighbor could end at lo and right neighbor start at hi? But if original first affected started at lo? left neighbor end < lo (strict due non-touching), so gap. If first affected starts before lo and only right piece starts hi, there was an affected interval spanning lo-hi; left piece ends lo. No other left neighbor. Right piece start hi. No touch with unaffected after? Affected interval may end b and next unaffected starts > b (strict), so right piece ends b, next start > b. Good.
Could removal range exactly covers gap between two intervals? Like intervals [(0,5),(10,15)], remove [5,10). No affected? bisect_left(5): (0,5)<(5,) true; (10,15)<(5,) false => i=1. start prev.hi=5>5 false => start=1. while intervals[1].start=10<10 false. No change. Intervals not touching originally; gap [5,10) removed but set unchanged. Fine.

Maybe requirement intervals() sorted disjoint touching merged. We can maintain. But `add` merging condition uses `intervals[end][0] <= hi`, but if we choose start via prev.hi >= lo, we merge touching. Suppose existing interval with start exactly hi and no previous overlap, loop will consume because start<=hi. Good. Suppose existing interval with hi exactly lo, start prev via hi>=lo, consume. Good.

Need preserve original values no rounding. Use numeric comparisons. For ints/floats. `lo >= hi`. Use `min` `max`. Fine. Could have NaN? not required.

Potential issue bisect on mixed tuple with ints/floats. Fine.

Need class maybe with `__slots__` for performance. Implement `_intervals`.

Potential performance with add random 60k disjoint. If intervals are "small disjoint intervals in random order", add with bisect and while start maybe O(1), slice replace? We use `intervals[start:end]=[(lo,hi)]`, where start is insertion position. This assignment deletes/inserts at position. For no existing affected, `intervals[start:start]=[(lo,hi)]` inserts via list slice assignment. Does list insert in C shifting O(n). Using slice assignment with one element also shifts. Maybe `intervals.insert(start,(lo,hi))` faster. Need handle if merge consumes k; if no merge use insert; if merge use slice assignment. In add:
```
if end == start:
    intervals.insert(start,(lo,hi))
else:
    intervals[start:end] = [(lo,hi)]
```
But note if start=i and first intervals[end][0] <= hi, end may be >start; merge. If start prev etc. Good. For random disjoint small intervals, no overlap and mostly one interval insertion. If adding adjacent to existing, merge. Use insert.

Potential optimization: `bisect_left` on tuples. 60k inserts with list shift. Good.

Could implement balanced tree to avoid O(n), but hidden performance likely okay. Let's estimate. 60k random inserts into list of 60k average shift 30k references = 1.8B refs. Each ref 8 bytes =>14.4GB memmove. Memory bandwidth maybe 20GB/s, ~0.7s plus Python overhead. 60k bisect ~1M comparisons. Under 5 sec. On typical judge maybe 1-2s. Fine.

But if intervals small disjoint random and add order, slice insert each. Should be under.

Need consider 200k contains O(log n) manual Python loop = maybe 0.3s. Good.

Could use `bisect` for contains via separate starts for speed O(log n) in C. Maintaining `_los` would complicate but could improve. Manual binary ~3.2M loops, 0.3s. Fine.

Could use `bisect_right` with a custom sentinel? Simpler manual.

Let's think of contains implementation exact:
```
def contains(self,x):
    intervals=self._intervals
    l=0; r=len(intervals)
    while l<r:
        m=(l+r)//2
        if intervals[m][0] <= x:
            l=m+1
        else:
            r=m
    idx=l-1
    return idx>=0 and intervals[idx][0] <= x < intervals[idx][1]
```
Since l-1 rightmost start<=x. If x less than first start, idx=-1 false. If x equals hi of previous, idx previous, x<hi false. If x equals lo of next, rightmost start<=x is next, contains true (since half-open). Good.

`total_length`: sum maybe float; if all ints returns int? Requirement number. Sum of lengths ints returns int. Fine. If intervals empty 0. Could maintain `_total` but not needed. However if sum each call many calls maybe not. Not specified. But trivial.

Should `__len__` count intervals after merged; yes.

Potential issue `add` merge loop condition with updates and `end`:
```
start = i - 1 if i > 0 and intervals[i-1][1] >= lo else i
j = start
new_lo, new_hi = lo, hi
while j < len(intervals) and intervals[j][0] <= new_hi:
    a,b = intervals[j]
    if a < new_lo: new_lo = a   # though a maybe >? use min
    if b > new_hi: new_hi = b
    j += 1
if j == start:
    intervals.insert(start, (lo,hi))
else:
    intervals[start:j] = [(new_lo,new_hi)]
```
Wait condition uses `new_hi` updated only after entering. For j=start, if intervals[start].start <= initial hi. If start prev, yes maybe. After merging prev expands new_hi. The while condition for next uses updated new_hi. Good.
But what if j=start and intervals[start].start > initial hi, no merge. But start could be i where first start>lo and >hi. No merge insert. Good. However if start chosen as i-1 due prev.hi >= lo, then intervals[start].start <= lo <= initial hi (because lo<hi), so condition true. Good.
Could there be a case start=i (no prev) but first interval start <= hi, merge. yes.
Need update new_lo maybe if a<new_lo. Since start prev a < lo. For start i, a>=lo, no need but min. new_hi max.
`new_lo` initialized lo. When merging prev containing lo, new_lo=prev.start. For later intervals, starts increasing, min no change.
When merging first current with start >=lo and start maybe hi? If start==hi, new_lo remains lo, new_hi max. The merged interval should be [lo, max(hi,b)) if touching at hi. But if lo < interval.start == hi, union of [lo,hi) and [hi,b) is [lo,b), not [lo,hi?]. new_lo=lo, new_hi=b. Good. If start < hi overlap, same.

Potential issue if existing interval starts before lo but doesn't contain? start prev only if prev.hi >= lo. Since prev.start < lo, hi>=lo => overlap/touch at lo. Merge new_lo=min(lo,prev.start)=prev.start. Good.

Now remove start calculation using bisect_left with tuple. Let's ensure start if lo exactly at interval end and next interval start >lo: `i` maybe points after interval with start? Example intervals [(0,5),(10,15)], lo=5. bisect_left((5,)): (0,5) < (5,) true? Compare 0<5 true. (10,15)< (5,) false => i=1. start=i-1 if prev.hi>lo? 5>5 false. start=1. Good. The interval ending at lo unaffected. The next start10 maybe affected if hi>10. while start< hi. Good.
If lo exactly at start of interval [10,15): bisect_left((10,)): (0,5)< yes; (10,15) < (10,)? compare first equal, (10,15) vs (10,) longer, so (10,15) < (10,) false => i=1? Wait list length2, let's simulate bisect_left manually with lo=10:
lo_idx0 hi2 mid1 (10,15). Is (10,) < (10,15)? True (shorter) so hi=1. mid0 (0,5). Is (10,) < (0,5)? false -> lo=1. returns1. Yes i=1 index of interval with start equal? It did not return after index1 because mid1 was compared: (10,)<(10,15) true, set hi=1, final lo=1. Wait bisect_left returns insertion point before equal elements. Since (10,) < (10,15) true, it thinks target less than element, so returns index1. Correct. It points to interval with start==lo. start prev check prev.hi=5>10 false, start=1. while intervals[1].start=10 < hi if hi>10. affected. Good.
For lo inside previous [0,100], lo=50. only one interval. bisect_left((50,)): mid0 (0,100); is (50,)<(0,100)? 50<0 false -> lo=1. returns1. prev.hi=100>50 true start=0. Good.

Need `end` in remove. We use while end<n and intervals[end][0] < hi. But if first interval at start has end <= lo? start ensures hi>lo if start prev or i? If start=i and i could be len; no. If i interval starts >=lo, its end > start >= lo, so >lo. If start=i with i interval start could be <lo? No bisect_left returns first start >=lo because target (lo,) and equal returns before equal, so start>=lo. So affected if start<hi. If start prev due hi>lo, affected. Good.
However when start=i and first interval start < hi but what if interval start==lo and bisect_left returned index of that interval; affected. Good.
What if start=i and i points to interval start == lo, but there was previous interval ending exactly lo? Non-touching would not allow? Previous end < next.start =lo. Could be prev.end<lo. no.

Now pieces generation can append invalid e.g., `(a, lo)` where a<lo but b may be <=lo? Not affected (b>lo due start). But if start=0 and lo maybe > interval end? start should skip unaffected with b<=lo? Let's revisit start computation if lo after several intervals: `i=bisect_left(intervals,(lo,))` returns upper bound of starts < lo? Actually first start >= lo. start=i maybe, but previous interval might end <=lo. If previous ends <=lo no affected. But intervals before start (i) are all with start < lo. We only check immediate previous `if start>0 and intervals[start-1][1] > lo`. Since intervals non-touching sorted, if previous ends <=lo, none before can have hi>lo because prior end < prev.start? There could be prior interval not touching but prior end < prev.end? Non-touching sorted means prior.hi < prev.lo (strict if gaps or could? touching merged, so prior.hi < prev.lo). If prev.end <=lo, prior.end < prev.start < prev.end <=lo, so no. Good.
If start=i and first start >=lo. If start interval start maybe >=lo. If start<hi affected. Fine.
But suppose lo lies in a gap after interval A and before B. i points B. start=i if A.end <= lo. If B.start may be >lo. Good.
Remove [lo,hi) where lo < first interval start, start0. While intervals[0].start < hi. Suppose intervals [10,15), remove [0,12). start0, loop 10<12: a=10<lo0? no, b=15>hi12 add (12,15). good.
Suppose remove [0,5) before all intervals, no affected because while intervals[0].start=10<5 false. Replace none. Good.

Potential issue pieces from multiple intervals may not be sorted due adding right piece before next interval's left piece? Example intervals [(0,10),(20,30)], remove [5,25): first piece (0,5), second interval right (25,30) sorted. If first interval right piece? For first interval if b>hi (hi=8, b=10) with a<lo: pieces (a,lo), then (hi,b) = (0,5),(8,10). Next interval start maybe 9? But intervals non-touching: next start > previous b=10, so next piece after 10. Sorted. If first interval fully right? etc. Per interval appends left then right. For a spanning interval, left (a,lo), right (hi,b) sorted. Good.
If interval starts before lo and ends <=hi, only left. If starts after lo and b>hi only right. Across: first affected interval might end <=hi, left piece ends lo. Next affected starts <hi maybe but after first end (strict) could be >? But removal continues, next affected could be partially right and produce right piece hi,b. There might be gap lo to hi (removed), and next starts some > first.end. Since first.end could be >lo and <=hi. But we removed all up to hi. What about first interval left piece ends at lo, then next affected interval starts <hi. If next starts before hi, it's entirely within removed part at start? It may produce right if extends past hi; if not fully removed. There is no piece from next if fully removed. If next extends, right starts hi. Sorted with left end lo (lo<hi). Good.
But consider a spanning interval [a,b) with a<lo and b>hi, we append left (a,lo) and right (hi,b). Then we also scan later intervals with start<hi? Wait b>hi, so interval extends beyond hi. Because intervals non-touching, next interval start > b > hi. So loop stops after this interval because next.start > hi. Good. No interleaving.

Now if remove exactly covers interval and pieces empty, assignment removes. Good.

Should we merge pieces with adjacent unaffected due half-open? We argued no. But consider remove that does not actually touch a boundary because affected interval starts at lo? If removing [lo,hi) from interval [a,b) with a<lo, b maybe =hi. We add left (a,lo), remove [lo,hi). No right. Previous unaffected before a ends < a. Left piece ends lo. Next unaffected after b? There might be interval starting at hi (touching removed range) and unaffected because start==hi. Since original interval [a,hi) and next [hi,...) would have touched and been merged originally! So impossible if set maintained merged. If there's a gap, next start>hi. No touch. If the affected interval b==hi and next start>previous b, next start>hi. Good.
What about remove [lo,hi) where no affected intervals but there are surrounding intervals with gap; no merge needed. They may be touching? No.
Thus maintained.

Potential issue floats and tuple bisect with `(lo,)`. Mixed int/float comparisons fine.

Now, perhaps performance: 60k add calls of small disjoint intervals in random order. If "disjoint" means no overlap and perhaps no touching? Random order, add never merges. Each add uses `bisect_left` and insert. Good.

Could we improve insertion O(n) by using a tree? Not necessary. But "must take well under 5 seconds" maybe on slower environment with Python list insertion 1.8B pointer moves ~ maybe 2 seconds. Let's benchmark mentally. 60k list inserts random at avg 30k: 1.8 billion moves. memmove on modern CPU 8 bytes*1.8e9=14.4GB. 5 sec => need 2.9GB/s. Most memory can 20GB/s, but list insertion also refcount? Inserting one object no INCREF? list insert shifts pointers and sets one, no reference count per shifted element. Memmove is optimized. 14GB could be ~0.5-1 sec. On PyPy? But Python standard CPython. Fine.

But if environment slow and memory bandwidth 5GB/s, ~3s. Plus overhead. Under 5? likely. Could implement balanced tree to guarantee. Let's consider implementing Treap or sorted list with blocks. We can build a treap storing intervals and support add/remove/contains/length/interval list in O(log n + k). But complexity and risk. We have ample tokens. Should we implement robust balanced BST to be safe? Standard library only. Need maintain merged intervals. Could use treap with intervals as nodes sorted by lo, with merge/split. Add range merging maybe need find overlapping intervals and delete them. Since we maintain disjoint non-touching and add can merge with neighbors, we need find all intervals overlapping [lo,hi] plus touching. Number of merged intervals per add could be many if adding large range, but total deletions amortized? Across arbitrary adds, merging can delete intervals; total O((adds + deletes) log n). For 60k small disjoint no merges. Treap would give O(log n) insert, no list shifts. But code more complex. Contains O(log n). Remove could split and delete many. Intervals sorted traversal O(n). total_length could maintain.

We need decide. The prompt performance specifically 60k adds + 200k contains under 5s. List approach likely accepted. But maybe hidden judge does worst-case insert at front 60k times: 60k^2/2=1.8B moves. Still.

Could use `bisect.insort` on list of tuples; same.

Let's contemplate a skip list or treap. Writing treap with deterministic priority (random via xorshift) standard library. Need support add with merging overlapping intervals. Need remove possibly split. Need total length maintain. `intervals()` inorder. `__len__`. `contains`.

Since intervals are non-overlapping, non-touching. Add(lo,hi):
- Find intervals that intersect or touch [lo,hi]. Because merging. Need find all existing intervals with hi >= lo and lo <= hi (touching). We could:
  - Find predecessor by lo start. The predecessor could be overlapping/touch if pred.hi >= lo.
  - Find all intervals with start <= hi starting from something. Since treap supports lower_bound by start.
  - Collect intervals range [start_lower, upper] sorted order. For add, start candidate = first interval with maybe hi >= lo. Need predecessor.
Could use split by key start. Treap keyed by interval.lo. Find nodes with starts in range around.
Because intervals sorted and no overlap, overlapping with new range form contiguous block. We can find `a = lower_bound(lo)` (first start >= lo), and check predecessor. The affected block starts at pred if pred.hi >= lo else a. Affected block ends at last interval with start <= hi (touch if start == hi) because all intervals whose start <= hi and after start candidate overlap? Need if new_hi may extend, but any interval with start <= current new_hi overlaps/touches. Initially affected condition existing.start <= hi and existing.hi >= lo. Starting at first with hi>=lo. Since intervals non-touching, once start > hi no more. So block is intervals with start <= hi from start. We can traverse from start until start>hi, collecting. But if starts earlier? Use lower_bound to find start_idx maybe. We need predecessor with hi>=lo. Affected block may begin at pred. If pred overlaps/touches, include pred; then all intervals with start <= hi after pred. Number k. We can split treap to isolate block:
  - find key boundaries based on starts. We want split at start key of pred (or lo?).
 Could traverse from pred and delete; but treap deletion each O(log n) and k maybe total amortized. For small disjoint no k. Finding first node and successor can be O(log n) each if not careful. We can use treap split by key.

Alternative maintain intervals in a randomized treap with split/merge by lo key. To add:
1. Find first affected interval's lo key. Need check predecessor. Query `find_le(lo)` returns node with max start <= lo. If node and node.hi >= lo, affected_start_key = node.lo. Else find successor start (first start >= lo). Let start_key maybe that successor.lo, or lo itself.
2. Need consume intervals with start <= hi starting from affected_start. Let end_key? We need split all intervals with keys <= hi that are affected. But if no predecessor overlapping and successor start > hi, insert directly. If successor start <= hi, consume.
We can split treap into A, B by key = affected_start_key - epsilon? Since keys can ints/floats, no epsilon for reals. Instead split by start_key inclusive. We can implement split_by_key(root, key) returns (< key, >= key). To isolate starting at affected node and ending <=hi, need know its key. If affected includes predecessor, start_key=pred.lo. Use split at start_key to get left (<start_key), C (>=start_key). Then split C by hi+? Need include intervals with start <= hi. No epsilon. Implement split_le(root, key) returns (<=key, >key). Then affected = first part. But if start_key maybe lo if no pred. We can just split C into affected by `split_le(C, hi)`, get M and right. This M includes all intervals with start >= start_key and start <= hi. But what if start_key=lo and there is interval with start < lo but not overlapping (pred.hi<lo) and another interval start <lo? None. Good.
But if affected_start_key = pred.lo and pred overlaps/touches, M includes pred and all starts <=hi. This could include intervals after pred that do not overlap new [lo,hi)? Suppose pred overlaps lo and hi is small less than pred.end. Then M includes pred because start pred.lo <=hi? Wait pred.lo < lo. hi could be < pred.lo? No hi>lo, pred.lo<lo<hi, so pred.lo<=hi. M includes pred and all intervals with starts between pred.lo and hi. But if pred extends past hi, intervals after pred start > pred.end > hi (non-touching), so none extra. If pred does not extend past hi, intervals after pred may have starts <=hi and should be consumed if overlap/touch. Because intervals non-touching, any interval after pred with start <=hi: if start > pred.end? Could be gap. New range [lo,hi) and pred overlaps at lo. Suppose pred [0,5), add [3,100). Pred overlaps. There might be interval [10,20). Is it affected by new? New extends to 100, yes should merge. start<=hi. Good. Suppose add [3,7) hi=7, interval [10,20) start>7 not consumed. Good.
What if pred overlaps and new hi is less than pred.end, M split_le(hi) includes pred (start<hi), and any intervals start<=hi. But intervals after pred start > pred.end > hi? Since pred.end > hi (if hi<pred.end), next start > pred.end > hi, so none. Good.
What if no pred overlap, affected_start_key = first start >=lo. If that start <=hi, it touches/overlaps. M split at start_key? We need not include unaffected pred. We can set start_key=that interval.lo. M includes it and all starts <=hi. But if there is an interval with start between lo and that? none because it's first start>=lo. If we split by start_key, left excludes all starts<start_key. Good. But if start_key maybe not actual? If no affected at all, don't do.
Could simply use lower_bound(lo) to get first start >=lo. Let succ. Determine affected_start_key:
- pred = predecessor of lo? Find interval with max start < lo (or <= lo). Need if pred.hi >= lo. Note if interval start == lo, lower_bound returns it, not pred? We can define pred as rightmost start < lo, and succ lower_bound(lo) includes start==lo.
- If pred exists and pred.hi >= lo: affected_start_key=pred.lo.
- Else: if succ exists and succ.lo <= hi: affected_start_key=succ.lo (this interval starts >=lo and <=hi, affected because its end > start >=lo; if start==hi, touching, merge; if start<hi, overlap/touch). Else no affected, insert new interval.
Then use split by key `affected_start_key` to isolate from that key onwards. But if affected_start_key=pred.lo, there may be intervals with start between lo? no. Need split root at key < affected_start_key. We'll implement split(root, key) where left keys < key, right >= key. left, right = split(root, start_key). Then affected, rest = split_le(right, hi) (keys <= hi). Consume all in affected. But does this include intervals with start < start_key? no. Could there be an interval before pred also affected? pred is immediate before lo, earlier intervals end < pred.start? Non-touching, earlier end < pred.start < lo, so no.
Then compute new_lo = min(lo, min lo in affected) = min(lo, affected_min_lo). Since affected sorted; first node's lo. new_hi = max(hi, max hi among affected). Need max hi. Since no overlap/touch and starts sorted, max hi is rightmost interval's hi? Are intervals by start increasing and non-overlapping, their hi also increasing? Non-touching and disjoint sorted: next.start > prev.hi (strict) if merged touching, so next.hi > next.start > prev.hi. Thus hi strictly increasing. Rightmost affected has max hi. Could compute by traversing affected or maintain subtree max_hi. Easier use max_hi in subtree or traverse k. Since merging may delete many; total amortized, traversing okay. But for add small disjoint k=0. For correctness/performance if many merges, O(k) total deletions amortized but one add could merge O(n); traversing to get hi O(k) acceptable. Need also insert merged interval. But if affected block has multiple intervals and we don't traverse? We need new_hi maybe from rightmost. We can get max hi via treap subtree max_hi O(1), and min lo via leftmost O(log n) or subtree min? Since keys sorted, first in affected is leftmost. We can get `_min_node` or have subtree min_hi? Not needed: new_lo = min(lo, affected_min_lo). affected_min_lo can be determined: if pred overlap, pred.lo; else start_key. If affected block includes multiple, min is start_key. Since split by affected_start_key, and it's actual node, min lo=start_key. But if affected_start_key=lo? We won't insert key lo maybe. We only use actual interval start. If no pred and succ start<=hi, affected_start_key=succ.lo, min=that. If pred overlap, min=pred.lo. So new_lo=min(lo, affected_start_key) (pred.lo<lo => pred.lo; succ.lo>=lo => lo). Actually if succ.lo==lo, min lo same. So new_lo = lo if affected_start_key>=lo else affected_start_key.
new_hi = max(hi, max_hi(affected)). Need max_hi. Could compute max_hi subtree. Or since intervals hi increasing, rightmost node in affected has max hi. Implement `_rightmost` O(log n) or traverse. O(log n). New_hi = max(hi, rightmost(affected).hi). If affected empty no merge. For simplicity maintain `max_hi` in nodes? Treap split/merge updates. But we can also iterate affected inorder to get rightmost. Since affected could be large; but if we need free/delete, traverse anyway to maybe not. We don't need free in Python. To compute rightmost repeatedly O(log n). Fine.
Then merged interval = Node(new_lo,new_hi). root = merge(left, merge(newnode, rest)). Need preserve non-touching. We split affected by start<=hi. But what about an interval in rest with start == new_hi? Wait affected consumed all starts <= old hi. If new_hi expands due merging, there could be intervals with start <= new_hi but > old hi. But because intervals non-touching and affected intervals, any consumed interval's end? Consider new range initially hi. We consume intervals with start <= hi. The merged hi can become larger from these intervals (their end). There might be next interval with start <= new_hi (e.g., affected interval ends at 100, old hi=10, next interval start=100 touching). We only split up to old hi, so next interval start maybe 100 >10 in rest. But after merging we should also merge touching/overlapping at expanded hi. Example existing intervals [(0,5),(5,10)] would have been merged though. Need non-touching; next.start > affected.hi. If affected rightmost hi=100, next.start >100 strict (because non-touching). new_hi=max(hi,100)=100. Next.start >100, not <=, so no need merge. If next.start == affected.hi they'd touch and already merged in existing set, impossible. But old hi could be smaller, affected intervals non-touching. So consuming all intervals with start <= old hi and taking max hi; the next interval start > max_hi of affected? Since sorted non-touching, next.start > rightmost.hi. new_hi = max(hi, rightmost.hi). Could new_hi be old hi larger than rightmost.hi, but what about intervals further with start <= hi consumed; rightmost among consumed has start <= old hi and hi maybe less than old hi? Wait if new range [lo,hi) spans over gaps, there can be intervals with start <= hi but their end < old hi (inside new range) and next interval after them maybe start > old hi? Example existing [(0,2),(100,102)], add [0,200) hi=200. We split by hi=200, consume both. rightmost hi=102, max(200,102)=200. rest starts >200. Good.
Example existing [(0,200)], add [0,50) hi=50. pred? lo=0 no pred, succ start=0<=50, affected includes interval [0,200] because start0<=50. rightmost hi=200, new_hi=max(50,200)=200. rest next start>200. Good.
Example existing [(0,5),(10,15)], add [3,12) hi=12. pred [0,5] overlaps lo=3, affected_start=0. split_le hi=12 includes [0,5] and [10,15] (start10<=12). rightmost hi=15, new_hi=max(12,15)=15. next start>15. Good.
Could there be interval in rest with start <= new_hi because new_hi came from old hi > rightmost affected hi? If old hi > rightmost affected hi, then any interval starting <=old hi should have been included in affected (split_le up to old hi), so none in rest start<=old hi. Thus next start > old hi >=? If rightmost affected hi could be > old hi, then next start > rightmost.hi due non-touching. So no interval with start <= new_hi. Good.
Thus add treap robust.

Remove(lo,hi):
Need subtract range. Since intervals non-touching. Affected block may be similar: intervals with hi > lo and start < hi. Remove can split at most one interval into two (because intervals non-touching and removal range contiguous; actually if range covers gaps, it can affect many intervals and leave right piece from last, left from first). Using treap:
- Find intervals overlapping removed range. Need include predecessor that may overlap lo, and all with start < hi. Existing intervals touching range? For removal half-open, if interval ends exactly lo, it's unaffected; if starts exactly hi unaffected. So condition overlapping: interval.hi > lo and interval.lo < hi. Touch at boundaries not affected. Affected block starts at pred if pred.hi > lo. Need first start >=lo maybe if start<hi. Could find pred start<lo, if pred.hi>lo include. Then affected includes intervals with start < hi starting from that key. But if pred doesn't overlap, first affected is lower_bound(lo); if its start < hi. Use affected_start_key as pred.lo if overlap else first start>=lo if start<hi. Use split at start_key, then split C by key < hi? Need isolate intervals with start < hi, not <=, because interval starting exactly hi unaffected. Our split functions can split at key hi with left keys < hi, right >=hi. Great. If affected_start_key determined. Then affected, rest = split(right, hi) where left keys < hi. Right includes start>=hi. Need include intervals starting in [start_key, hi). However if pred start<lo<hi and pred.lo <lo, split at pred.lo and split C <hi includes pred and intervals with starts <hi. Since intervals after pred may start <hi and overlap removal (all should be affected because start<hi and since sorted after pred, their start >? If pred.hi>lo, next start>pred.hi>lo, so their hi>start>lo; yes affected). If pred not overlap, affected_start_key = first start >=lo. split C <hi includes intervals starting >=lo and <hi. All affected because hi>lo and interval.end>start>=lo; for first start maybe lo? If start==lo then end>lo yes. If start>lo, end>start>lo. Good. If no pred and first start>=hi, no affected.
Then replace affected with up to two pieces:
 - left piece from first affected if first.lo < lo: (first.lo, lo). Since affected because first.hi>lo. If first starts before lo.
 - right piece from last affected if last.hi > hi: (hi, last.hi). Since affected includes intervals with start < hi; last could extend past hi. Could there also be a gap where middle fully removed. Need only first left and last right? Because all affected intervals lie within removal range at start but may have ends. Since intervals non-touching, affected block may consist multiple intervals between lo and hi. Only first interval can extend left of lo, only last can extend right of hi. All middle are fully covered (their start >=? Could first fully contained? If first.lo >=lo no left. Last fully inside if last.hi<=hi no right). So only up to two remaining pieces. Good.

Need compute first and last of affected. With treap, after split isolate `affected`. If affected is empty no change.
`first = _leftmost(affected)`, `last = _rightmost(affected)`. left piece if first.lo < lo: Node(first.lo, lo). Because first.hi>lo (affected). right piece if last.hi > hi: Node(hi, last.hi). Could first and last be same interval spanning both; left.lo<lo and last.hi>hi, produce [a,lo), [hi,b). Need insert in order and ensure not touch. Gap lo-hi >0 (since lo<hi), no.
But careful: if first.lo < lo and last.hi > hi but first is last, okay. If first.lo < lo only from one interval that maybe extends into right if same. Add left and right. If left piece end lo and right piece start hi; hi>lo gap. Fine.
What if there is an unaffected interval immediately before affected with end == first.lo? non-touching strict? first is affected, previous start before first, previous.hi < first.lo (strict if merged). left piece start same first.lo, so prev end < first.lo. No touch.
What if right piece ends at last.hi, next unaffected start > last.hi. no touch.
Need update root = merge(left_root, merge(pieces_root, rest)) where split:
`left, rest1 = split(root, start_key)` keys < start_key.
`affected, right = split(rest1, hi)` keys < hi. Note right keys >= hi.
Then pieces sorted. If left piece and right piece both, merge in order. If one, merge. `root = merge(left, merge(piece_root, right))`.
But what if no affected (start_key None): do nothing. Need determine affected efficiently.

Treap structure:
Node with lo, hi, priority, left, right. No parent. Implement split(root, key): left keys < key, right keys >= key.
```
def _split(root,key):
    if root is None: return None,None
    if root.lo < key:
       a,b = _split(root.right,key)
       root.right=a
       return root,b
    else:
       a,b = _split(root.left,key)
       root.left=b
       return a,root
```
Check: if root.lo < key, root and left go left; split right. `root.right = a` where a part of right with keys<key; return root as left, b keys>=key. Yes.
If root.lo >= key, split left into a (<key), b(>=key); `root.left=b`; return a,root. Good.

Merge:
```
def _merge(left,right):
 if not left or not right:return left or right
 if left.priority > right.priority:
   left.right = _merge(left.right,right)
   return left
 else:
   right.left = _merge(left,right.left)
   return right
```
Max heap priority.

Need find predecessor / lower_bound. Could use split? For add, easier use search:
```
def _lower_bound(root,key):
   res=None
   while root:
     if root.lo >= key:
        res=root; root=root.left
     else:
        root=root.right
   return res
```
Pred with start < lo:
```
def _lower_bound(root, lo) returns first start >=lo
pred = _predecessor(root, lo) maybe max start < lo.
```
We can find both in one traversal? Need pred and succ. `succ = lower_bound(lo)`. Predecessor can be found while searching:
```
pred = None; node=root
while node:
   if node.lo < lo:
       pred=node; node=node.right
   else:
       node=node.left
```
But if there is interval start == lo, lower_bound returns it. Predecessor start<lo might also exist (previous gap), but if interval starts ==lo, pred.hi cannot >=lo? Previous interval end < lo due non-touching, so no. We can check pred.hi>=lo. If interval start ==lo affected via succ. Good.
Could also find pred <=? We'll use pred start < lo. For add, if there is interval containing lo, its start<lo, pred found. If interval starts exactly lo, succ points. If pred exists and pred.hi>=lo, affected_start=pred.lo. Else if succ and succ.lo <= hi, affected_start=succ.lo. Need careful if pred is None and succ might start <lo? no succ lower_bound(lo).
If pred exists but pred.hi<lo, no pred. succ maybe first start>=lo.
If affected_start_key found:
```
left, rest = _split(root, affected_start_key)
affected, right = _split_le? 
```
Our split(root,key) gives right keys >=key. We need isolate keys <=hi. `_split(rest, hi)` gives affected keys < hi, not include start==hi. But add should merge touching at hi (start==hi). Need split by `hi`? To include keys <=hi, need split with key > hi impossible for arbitrary real. Could implement split_le(root,key) returning (<=key, >key):
```
if root.lo <= key:
   a,b = split_le(root.right,key)
   root.right=a
   return root,b
else:
   a,b=split_le(root.left,key)
   root.left=b
   return a,root
```
Or use `_split(root, hi_next)` no next. Implement `_split_le`. For add: `affected, right = _split_le(rest, hi)`. This includes intervals starting exactly hi and touches merge. Good.
For remove: need split by <hi, use `_split(rest, hi)`. Good.

Need `affected_node` may not exist? We found based on pred/succ. If affected_start set as succ.lo, split(root, start_key) will put succ and following in rest. `affected` should include at least succ because succ.lo<=hi (add) or <hi (remove). For add if succ.lo maybe hi? include due <=. Good. If start_key pred.lo and pred exists, split root by pred.lo: intervals with key < pred.lo left. `rest` starts at pred (keys>=pred.lo). affected split_le hi includes pred since pred.lo <=? pred.lo < lo < hi, yes. Good.
For remove if pred.hi>lo, start_key=pred.lo, split at pred.lo; rest includes pred. affected split(rest,hi) with keys<hi includes pred because pred.lo<lo<hi. If no pred and succ start<hi, start_key=succ.lo; split root at succ.lo, rest includes; split(rest,hi) keys<hi includes succ and all before hi. If succ start maybe >=lo and <hi.
Need find first/last of affected:
```
def _leftmost(root):
 while root.left: root=root.left
```
For last.
For add new_lo:
```
new_lo=lo
if affected_start_key < lo: new_lo=affected_start_key
# But if affected_start_key == lo and affected first lo maybe lo; same.
```
Actually if affected_start_key is succ.lo >=lo, new_lo=lo (new span may cover gap from lo to succ.start). If affected includes first with lo=succ.lo >lo, union [lo,hi) with [succ.lo,...] should be [lo, maxhi), so new_lo=lo. Correct. If pred.lo<lo, new_lo=pred.lo. If there are multiple affected including pred, min=pred.lo. So `new_lo = min(lo, affected_start_key)` works because affected_start_key is min lo of affected (since split at start_key and start_key is pred.lo or succ.lo). Yes.
`last=_rightmost(affected); new_hi=max(hi,last.hi)`. Since last has max hi. If affected not empty.
Then piece_root = Node(new_lo,new_hi)
root = merge(left, merge(piece_root, right))
```
Potential issue: if affected includes intervals with starts <=hi and we computed new_hi max last.hi, but there could be an interval in right with start == new_hi? For add, right keys > hi. If right first start <= new_hi due affected interval extending past hi? Wait if last (rightmost affected) extends past hi, new_hi=last.hi. Because set non-touching, next interval start > last.hi = new_hi (strict, because no touching in existing set). So right first start > new_hi, no touch. If new_hi=old hi (larger than last.hi), then right keys > old hi=hi, so first start >=? Split_le hi returns right >hi strictly because _split_le puts keys<=hi left; right keys>hi. If hi maybe float, start could be hi+ε; >. So no touch. Good.
If adding [lo,hi) where affected includes interval start==hi (touching) consumed, right >hi. new_hi may include its hi, next start>new_hi. Good.

Now remove with treap:
```
def remove(self, lo, hi):
 if lo>=hi: return
 root=self._root
 # find pred start<lo and succ lower_bound(lo)
 pred=None; node=root
 while node:
    if node.lo < lo:
       pred=node; node=node.right
    else:
       node=node.left
 succ = lower_bound(root, lo) maybe along same search? We can compute succ separately.
 start_key=None
 if pred is not None and pred.hi > lo:
    start_key=pred.lo
 else:
    # first interval with start >= lo
    succ = _lower_bound(root, lo)
    if succ is not None and succ.lo < hi:
       start_key=succ.lo
    else:
       return  # no affected
 # split
 left, rest = _split(root, start_key)
 affected, right = _split(rest, hi) # keys < hi
 if affected is None: return? Shouldn't if start_key found? Check if start_key succ.lo<hi yes; pred yes. pred.lo<hi yes.
 first=_leftmost(affected); last=_rightmost(affected)
 pieces=None
 if first.lo < lo:
    pieces=Node(first.lo, lo)
 # But what if first.lo < lo and we also need right piece from same first if last? handle after.
 if last.hi > hi:
    rightpiece=Node(hi,last.hi)
    if pieces:
       pieces=_merge(pieces, rightpiece)  # ordered lo<hi? Need ensure; if same interval spanning, left piece lo? left [a,lo), right [hi,b), lo<hi so merge.
    else:
       pieces=rightpiece
 root = _merge(left, _merge(pieces, right))
```
But subtle: `_split(rest, hi)` isolates intervals with keys < hi. Affected should include intervals whose start < hi. However first affected interval may be pred with start < lo, yes; includes intervals starting between lo and hi. All affected because removal range overlaps: For intervals after pred, start > pred.hi > lo? If pred overlaps lo, pred.hi>lo, non-touching means next.start > pred.hi > lo, and start<hi, so they overlap removed range at start (end>start). Yes. If no pred and first start>=lo and <hi, end>start>=lo; if start=lo, end>lo, overlaps. Good.
If start_key=succ.lo and succ.lo maybe ==lo, split by key=lo gives left keys <lo, rest includes start==lo. split(rest,hi) includes intervals with start<hi. Good.
If pred exists but pred.hi == lo (touching boundary), not affected. succ lower_bound(lo) may find interval starting at lo or after. If interval starting at lo, start=lo<hi affected. If none start<hi, return. The pred ending at lo remains in left (<start_key? if start_key maybe succ.lo >lo; left split by succ.lo includes pred since pred.lo<succ.lo. Good. If no affected return unchanged. If affected, pred remains unaffected in left. Removal [lo,hi) and pred ends lo, no merge. After replacing affected, left contains pred end lo, pieces maybe right start hi or none, gap. Good.
If pred.hi > lo, start_key=pred.lo. We split left at pred.lo, so intervals before pred remain; pred affected. Good.

Need ensure affected includes all intervals with start < hi even if start_key pred.lo and there are intervals before lo after pred? pred is immediate prior to lo, and if pred.hi>lo, intervals between pred and lo? none. pred overlaps. Intervals after pred with start<hi may include those whose start >? yes.
What about if pred overlaps, but hi is less than pred.lo? impossible hi>lo>pred.lo. So pred.lo<hi included. Good.

Compute pieces left if `first.lo < lo`. Since first could be pred start<lo. If first starts exactly lo, no left. Need if first.lo < lo but first.hi maybe <=? It's affected, hi>lo, so left piece [first.lo, lo) valid (lo>first.lo). Good.
Right if `last.hi > hi`. Last affected may start <hi but end >hi. Right piece [hi,last.hi). Need hi<last.hi. valid.
What if `first.lo < lo` and `last.hi > hi` and first==last. We create left and right, merge order. Gap. Good.
What if first has lo<lo and last is a later interval, first.hi might >hi? Then last would be first? Actually if first.hi>hi, because non-touching, no later interval start<first.hi and start<hi? If hi<first.hi, any later interval start>first.hi>hi, so not in affected by start<hi. So last=first. Good.
What if first.lo<lo but first.hi<=hi, left piece. Last may later extend past hi, right piece. Between first and last, removed. Pieces left [first.lo,lo), right [hi,last.hi). Sorted because lo<hi. Good.
What if first.lo>=lo, no left; last.hi<=hi, no pieces (affected fully inside removed) -> pieces None, root merge left,right. Good.
Need maybe need merge left piece with previous unaffected if previous.hi == first.lo? They were non-touching with first.lo? previous.hi < first.lo strict. No.
Need merge right piece with next unaffected if next.lo == last.hi? non-touching strict next.lo > last.hi. no.
If no pieces, merge left and right. But could left's last and right's first become touching after removing affected? Example intervals [(0,2),(3,5)], remove [2,3)? No affected because ends at2, starts3; lo=2,hi=3. pred [0,2] hi>lo?2>2 false. succ start3<hi3 false. return unchanged. They didn't touch originally. After removing gap, set unchanged [0,2),(3,5), still gap (2,3). If remove [2,4) affects [3,5)? succ start3<4, affected [3,5], right piece [4,5). left contains [0,2), gap 2-4, no touch.
Could removal ever make left and right pieces touch? Removing an interval from between cannot bridge. If affected interval completely removed between two intervals, left neighbor and right neighbor had a gap including affected interval. After removal, they might become closer but gap is original gap plus removed interval. Could they become touching if affected interval started exactly at previous end and ended exactly at next start? But original intervals would have touched and merged, impossible. So no.

Treap priorities. Need random deterministic. Use simple xorshift global or per node random module. Import random maybe allowed standard library, but deterministic for performance? Use `random.random()` each node; 60k okay. But random module overhead slight. Could implement xorshift:
```
_seed=2463534242
def _next_rand():
   global _seed
   _seed ^= (_seed << 13) & 0xFFFFFFFF
   _seed ^= _seed >> 17
   _seed ^= (_seed << 5) & 0xFFFFFFFF
   return _seed
```
Or use a counter hash. Need balance. Treap with random priorities from xorshift. For keys inserted sorted random order? Priorities independent, treap expected balanced. Use global class variable.

Node `__slots__=('lo','hi','priority','left','right')`.
In `__init__`, priority = _rand().

Could also use `random.getrandbits(64)`; standard library. But deterministic maybe not needed. Xorshift simple.

Need total_length. Treap can maintain total length per subtree to compute O(1), but intervals() needs traversal. Requirement total_length maybe called often. Implement maintain `_length` and `_size`? `__len__` number intervals. We can maintain `length` in node and size? Since every split/merge updates. Or compute O(n) each call. Performance only add/contains. But maintain is straightforward. Need ensure root updates after split/merge. Node attributes `length`, `size`, maybe. In merge/split update node. But we don't want bug. Could compute total_length by sum traversal if rarely called. `__len__` could compute recursively O(n), but len expected O(1) maybe. The prompt does not specify performance for len/total/intervals. But nice.

Maintain `total_len` property: root.len (sum interval lengths). `__len__`: root.size. Node update:
```
def _update(node):
   if node:
      node.size = 1 + (node.left.size if node.left else 0) + ...
      node.total = (node.hi-node.lo) + ...
```
Need when split/merge modifies children call update. In `_split`:
```
if root.lo < key:
   a,b = _split(root.right,key)
   root.right=a
   _update(root)
   return root,b
else:
   a,b=_split(root.left,key)
   root.left=b
   _update(root)
   return a,root
```
In `_merge` after recursive set child, `_update(root)`. Good.
In add/remove after split/merge, root updated. Node constructor sets size=1,total=hi-lo, children None.
`total_length`: return root.total if root else 0.
`__len__`: root.size if root else 0.
`intervals`: inorder traversal iterative or recursive. n 60k, recursion depth treap height ~ log; recursive generator okay. But inorder recursion on balanced depth O(log n) if using traversal recursion? Actually in-order recursion stack depth tree height, balanced. Could just recursive:
```
def _inorder(node,res):
 if node:
   _inorder(node.left,res)
   res.append((node.lo,node.hi))
   _inorder(node.right,res)
```
Depth expected ~40. Fine. But if priorities unlucky maybe 60k recursion fail. Use iterative to be safe:
```
stack=[]; node=root
while stack or node:
  while node: stack.append(node); node=node.left
  node=stack.pop()
  res.append((node.lo,node.hi))
  node=node.right
```
Return list sorted. Since maintained merged non-touching. Good.

Contains O(log n) using treap search:
```
node=root
while node:
 if x < node.lo:
    node=node.left
 elif x >= node.hi:
    node=node.right
 else:
    return True
return False
```
Wait if x < lo, go left. If x >= hi, go right. If x between lo and hi (lo<=x<hi) true. This works for sorted intervals by lo and disjoint. If x >= hi, next intervals have greater lo, could be to right. If x < lo, could be left. Good. If x equals hi, go right; there could be interval starting at hi (touch merged, so no; next start>hi), but correct not contained. If x equals lo, not < lo, x<hi true if valid. Good.

Need lower_bound and pred in add. Implement `_lower_bound(root,key)` iterative returns node or None:
```
res=None
while root:
 if root.lo >= key:
    res=root; root=root.left
 else:
    root=root.right
return res
```
Predecessor for remove can be found similarly; combine with lower_bound maybe. In add need pred start<lo and succ start>=lo. We can find both in one traversal:
```
pred=None; succ=None; node=root
while node:
  if node.lo < lo:
     pred=node; node=node.right
  else:
     succ=node; node=node.left
```
At end pred max start<lo, succ min start>=lo. Nice. Use for add and remove.
But note if there is interval with start == lo, it goes to else succ=node; node=node.left; could find smaller? Since no other start>=lo smaller than lo; eventually succ remains that node. Good.
For remove pred start<lo, succ start>=lo.

Add implementation with treap:
```
def add(self, lo, hi):
    if lo >= hi: return
    pred=None; succ=None; node=self._root
    while node:
        if node.lo < lo:
            pred=node; node=node.right
        else:
            succ=node; node=node.left
    start_key=None
    if pred is not None and pred.hi >= lo:
        start_key = pred.lo
    elif succ is not None and succ.lo <= hi:
        start_key = succ.lo
    else:
        # insert new node
        new=Node(lo,hi)
        # need split root by lo to maintain sorted. We can use _split(root, lo), but if existing interval with start==lo? In this case no affected? Wait if succ start==lo and succ.lo<=hi (hi>lo) would be affected, so no. If no affected, there cannot be any interval start<=hi overlapping/touching. Could there be interval start==lo? That would have succ.lo=lo<=hi affected. So no. Could be interval start between lo and hi? succ would be first >=lo; if its start<=hi affected. So no. Use _split(root, lo); left keys<lo, right keys>=lo, new lo; root=merge(left, merge(new,right)).
```
But if pred exists and pred.hi >= lo, start pred; if pred.lo could equal lo? no pred start<lo. Good.
If pred.hi == lo, touching, affected start pred.lo. Add should merge touching, yes. Condition >=.

If start_key found:
```
left, rest = _split(self._root, start_key)
affected, right = _split_le(rest, hi)
# affected nonempty
last=_rightmost(affected)
new_lo = start_key if start_key < lo else lo  # min(lo,start_key)
new_hi = hi if hi > last.hi else last.hi
new_node=Node(new_lo,new_hi)
self._root = _merge(left, _merge(new_node, right))
```
Wait `affected` via `_split_le(rest, hi)` includes all intervals with start <= hi. But if pred overlaps lo and hi could be less than pred.end, affected includes pred. It may also include intervals with start <= hi. As argued none after pred if pred extends >hi, because next.start>pred.hi>hi, so only pred. Good.
But need consider if start_key=pred.lo and there is an interval with start between pred.lo and lo? pred immediate before lo, none start in (pred.lo,lo)? Could there be intervals after pred but start<lo? pred was rightmost start<lo, so none. Good.
If start_key=succ.lo where succ.lo>=lo, `new_lo=min(lo,start_key)=lo`. affected split_le hi includes maybe intervals start==hi touching. last.hi max. new_hi=max(hi,last.hi). If succ.lo==hi (touch), its hi > hi so new_hi=succ.hi. Union [lo,hi) and [hi,succ.hi) = [lo,succ.hi). Good.
Need `_split_le` returns left keys <= key. Implementation:
```
def _split_le(root,key):
   if root is None: return None,None
   if root.lo <= key:
      a,b = _split_le(root.right,key)
      root.right = a
      _update(root)
      return root,b
   else:
      a,b = _split_le(root.left,key)
      root.left = b
      _update(root)
      return a,root
```
Check similar. If root.lo<=key, root and left keys <=? left all < root.lo <=key, so left part includes root with right split a <=key; b >key. `root.right=a`. Return root as left, b as right. If root.lo>key, root is >key; split left; a <=key, b >? b keys >=key but <root.lo? For _split_le, if root.lo>key, we recursively split left into a(<=key), b(>key). Set root.left=b (keys > key but <root.lo), return a,root. Right includes root and b all >key. Good.

Remove treap:
```
def remove(self, lo, hi):
    if lo >= hi: return
    pred=None; succ=None; node=self._root
    while node:
       if node.lo < lo:
          pred=node; node=node.right
       else:
          succ=node; node=node.left
    start_key=None
    if pred is not None and pred.hi > lo:
       start_key=pred.lo
    elif succ is not None and succ.lo < hi:
       start_key=succ.lo
    else:
       return
    left, rest = _split(self._root, start_key)
    affected, right = _split(rest, hi)  # keys < hi
    # affected nonempty?
    if affected is None: # maybe if start_key=pred.lo and hi<=pred.lo impossible; if startkey succ<hi yes.
       self._root = _merge(left, right) but shouldn't
    first=_leftmost(affected); last=_rightmost(affected)
    pieces=None
    if first.lo < lo:
       pieces=Node(first.lo, lo)
    if last.hi > hi:
       rp=Node(hi,last.hi)
       if pieces is None: pieces=rp
       else: pieces=_merge(pieces,rp)
    self._root = _merge(left, _merge(pieces, right))
```
Need think: `_split(rest, hi)` isolates keys < hi. If there is an affected interval extending past hi (last.hi>hi), its start < hi so in affected. Right has keys >=hi. But what about other interval with start exactly hi touching right piece? Since intervals non-touching strict, if last.hi>hi, next.start>last.hi>hi; if last.hi==hi? right piece not created; next.start > last.hi =hi? If next.start == hi would have touched last interval and merged originally, impossible. So right start >hi. If no right piece (last.hi<=hi), next.start > last.hi, could be equal hi? If last.hi<hi, next.start could be hi? But affected includes intervals with start < hi, next with start==hi is in right. Since removal [lo,hi) doesn't affect interval [hi,...), it remains. Gap hi? Left side after removal ends lo or none; right starts hi. If there is an affected interval last ending <=hi, it is removed/partially left. The next unaffected start could equal hi (if gap before hi). Example original [0,5)(10,20), remove [5,10): no affected due boundaries. Suppose remove [4,10): affected [0,5), left [0,4), right unaffected starts10==hi. Result [0,4) and [10,20), gap. Good. If first lo? no touch.
What about original [0,10), next [10,15) impossible merged. So right start ==hi can happen only if previous affected ended <hi. Then left piece maybe ends lo or none. No touch.

Need ensure after remove, pieces themselves sorted relative to left/right. Suppose left piece [first.lo,lo). Could left tree's max start be less than first.lo. left split at start_key. If start_key=succ.lo and first=succ, left contains intervals with lo<start_key, possibly last affected predecessor not affected ending at lo? Could there be an unaffected interval before first with hi == first.lo? Non-touching, previous.hi < first.lo. If first.lo maybe >lo. left piece starts first.lo. Previous.hi<first.lo. fine.
If start_key=pred.lo, left contains intervals before pred. first=pred; left piece starts pred.lo. Previous.hi < pred.lo. fine.
Right piece [hi,last.hi). Right tree keys >=hi. If right piece end last.hi. Could right tree have interval start < last.hi? We split affected by start<hi; all intervals up to hi; right keys>=hi. If there is an interval starting between hi and last.hi? Because last.hi>hi and intervals non-touching, next.start > last.hi, so none. If last.hi<=hi no right piece. Good.
If right piece start hi and right tree first start maybe == hi? Could that happen if last.hi>hi? Then next.start>last.hi>hi, so no. If last.hi<=hi, no right piece, only left. But if first.lo <lo and last.hi<=hi, result left [first.lo,lo), right tree first may start >=hi. Sorted. If no pieces, left and right. The removed range includes gap between left end and right start, so no touching. Good.

Treap `__len__` using size. Need update size/total on split_le too.

Potential issue `_split_le` update and recursion. Need define functions at class level or instance. Could make static methods or module functions. Single code block can include module-level functions and Node class. But user requested class IntervalSet. We can include helper classes/functions. Fine.

Need deterministic random priorities. Use class-level `_rand_state` or module-level. Since only one class maybe. Let's implement module-level `_SEED = 0x12345678` and function `_next_priority()`. But code block can have class IntervalSet and Node with methods. Need no printing/tests.

Potential concern: Treap add with merging all affected intervals: We split and create new node. The old affected node objects remain unreachable but okay. total length of new interval = new_hi-new_lo. Does it correctly cover union of new [lo,hi) and affected intervals? It may include gaps between lo and affected intervals, but since new interval is contiguous [lo,hi), and we merge with any intervals that touch/overlap. If affected intervals do not cover entire [lo,hi] because there are gaps inside new range? Wait new interval itself fills [lo,hi), so even if gaps between existing intervals in that range, the union with [lo,hi) is contiguous from min lo to max hi if at least one affected interval touches new range and extends. Since new spans [lo,hi), any affected interval lies connected via [lo,hi)? Let's see pred overlaps lo and extends beyond hi? New interval [lo,hi) plus pred [a,b) with a<lo, b<hi maybe union [a,hi) (because pred overlaps at [lo,b), new covers [lo,hi)). If there is gap between b and next? Affected split includes intervals start<=hi. If pred ends b<hi, new covers up to hi, so it bridges gap to any next interval that starts <=hi (even if next.start> b): union [a,hi) plus next [c,d) where c<=hi. If c<=hi, since new extends to hi, it touches next at [c,hi) if c<hi, or touches at hi if c=hi. So union contiguous. new_hi = max(hi, rightmost.hi). new_lo=min(lo, first.lo). The merged interval from new_lo to new_hi is correct even if there are internal gaps because new interval [lo,hi) bridges. If no affected interval overlaps/touches, no merge. If succ.start > hi, gap remains. Good.
What if pred overlaps lo, and we include intervals with start<=hi even if there is gap between pred and first included? New interval covers [lo,hi), so if first included start c<=hi, the union of pred [a,b) and new [lo,hi) is [a,hi) if b>lo (pred extends past lo), regardless b maybe < or >. Actually pred [a,b) with b>=lo. New [lo,hi). Union contiguous from a to hi because pred intersects new at [lo,min(b,hi)) if b>lo. Yes. Then any interval with start<=hi touches/overlaps [a,hi) at point start<=hi? If start==hi touches. If start<hi, overlaps at [start,hi) (because interval extends beyond start) with [a,hi). Good. So consume all start<=hi. If there is interval start<lo before pred? none. Good.

What if pred.hi>=lo but pred.lo maybe much <lo; split by pred.lo and split_le hi includes pred and all starts<=hi. What about an interval with start <pred.lo that also touches pred? Non-touching, previous.hi < pred.lo, and pred.lo<lo, so not affected by new [lo,hi) because previous ends <pred.lo<lo. Good.

What if no pred overlap, succ.lo<=hi; split by succ.lo. There might be an interval before succ (pred) with hi==lo, touching new at lo? If pred.hi == lo, then condition pred.hi>=lo in add true! Because add merges touching at lo. So start pred.lo. Good. For add, condition >= includes pred ending at lo. If pred.hi < lo, not include. Good.

For remove, condition pred.hi > lo strict, because interval ending at lo should not be removed. Good.
For remove, if succ.lo == hi, not affected, condition succ.lo < hi strict. Good.

Need check add when pred exists and pred.hi == lo but there is also interval with start==lo? Since non-touching maintenance prevents pred.hi == next.start (would merge), so no. But if code maintains, no. If pred.hi==lo, pred ends at lo, new starts lo; merge touching to [pred.lo, max(hi,pred.hi))? Since pred ends at lo, new [lo,hi). Union is [pred.lo,hi) because pred [pred.lo,lo) touches new at lo. start_key=pred.lo. Split_le hi includes pred (start pred.lo<=hi) and also any intervals with start<=hi. new_lo=min(lo,pred.lo)=pred.lo. new_hi=max(hi,last.hi maybe pred.hi=lo). If no other, new_hi=hi. Good merged [pred.lo,hi). Nice.

Treap priorities and split/merge. Need test with examples mentally.

Let's simulate add [3,5):
root none -> pred succ none start none. Split root at 3 none; insert new. root [3,5).
Add [1,2): pred? node lo3<1 false succ=node3, node.left none. pred none succ.lo3 <=hi2? false. insert split root at1: left none, right [3,5). merge new [1,2), right. intervals [1,2),[3,5). non-touching gap.
Add [2,3): lo2 hi3. pred: start1<2 pred[1,2], go right none? root [3,5) maybe in right? Let's traverse tree maybe. succ start3>=2. pred.hi=2 >=lo2 true start_key=1. left,rest split root at1: left none? interval [1,2) start1 < key? start_key=1, split key1 gives left keys<1 none, rest includes [1,2) and [3,5). split_le(rest,hi=3): includes starts <=3: [1,2), [3,5) (start3==hi touching). affected last [3,5] hi5. new_lo=min(lo2,start_key1)=1, new_hi=max(3,5)=5. node [1,5). root merge left none, node, right none. Merges [1,2)+[2,3)+[3,5) = [1,5). Good.

Add [4,6) when existing [1,5): pred? start1<4 pred node. succ none. pred.hi=5>=lo4 start=1. split root at1: left none, rest [1,5). split_le hi6 includes [1,5). last hi5. new_lo=min(4,1)=1, new_hi=max(6,5)=6 => [1,6). Good.
Add [0,1) to [1,6): pred? start1<0 false succ [1,6]. pred none, succ.lo1<=hi1 true start=1. split root at1: left none? key1, interval start1 >=1 so rest. split_le hi1 includes start<=1 includes [1,6). last hi6. new_lo=min(0,1)=0, new_hi=max(1,6)=6 => [0,6). Correct (touch at 1? Existing [1,6), new [0,1) touch at1, merge [0,6)).
Add [6,8) to [0,6): pred? start0<6 pred [0,6], succ none. pred.hi6>=lo6 true start0. split at0 left none; split_le hi8 includes [0,6); new [0,8) merges touching. Good.

Remove [2,4) from [0,10): pred start0<2 pred hi10>2 start0. split root at0 left none rest [0,10). split(rest,hi4): root.lo0<4 -> split right none, affected [0,10)? Wait _split(root,key=4) returns keys <4 left, keys >=4 right. With node lo0<4, recursively split right None => a=None,b=None? Code:
```
if root.lo < key:
   a,b=_split(root.right,key)
   root.right=a
   _update(root)
   return root,b
```
root.lo0<4, root.right None -> a=None,b=None; root.right=None; return root,None. So affected=[0,10), right none. first lo0<2 pieces Node(0,2). last hi10>4 rp(4,10). merge pieces => [0,2), [4,10). root. Good.
Remove [2,4) from [0,2),[4,10): pred? lo2. pred start0<2 hi2>2 false. succ lower >=2: start4? Need also interval [0,2) is only before. succ [4,10] lo4<hi4 false -> return. Unchanged. Good because removed range is gap.
Remove [2,5) from [0,2),[4,10): pred [0,2] hi2>2 false; succ [4,10] lo4<hi5 true start4. split root at4: left includes [0,2), rest [4,10). affected split rest with key hi5: node lo4<5 affected [4,10), right none. first lo4<lo2? false. last hi10>5 rightpiece [5,10). root merge left [0,2), piece [5,10). Good. Removal [2,5) removes [4,5), leaves [5,10). [0,2) gap. Good.
Remove [0,2) from [0,2),[4,10): pred? lo0 no pred, succ [0,2] lo0<2 start0. split at0 left none rest both. affected split(rest,hi2): keys<2 includes [0,2]; right [4,10] key4>=2. first.lo0<0 false. last.hi2>2 false. pieces none. root merge left none,right [4,10]. Removed. Good.
Remove [0,5) from [0,2),[4,10): pred none succ start0<5 start0. split rest with hi5: affected keys<5 includes [0,2],[4,10] because start4<5, despite its interval end10 >hi. first.lo0<0 false, last.hi10>5 rightpiece [5,10). root right none, pieces [5,10). Result correct (remove [0,5) leaves [5,10) from second interval).
Remove [3,4) from [4,10): pred? no start<3? none. succ [4,10] lo4<hi4 false return. Correct.
Remove [3,5) from [4,10): succ lo4<5 start4. split at4 left none rest [4,10]. split(rest,hi5): affected [4,10), right none. first.lo4<3 false; last.hi10>5 right [5,10]. correct.
Remove [4,5) from [4,10): pred? lo4 no pred, succ start4<5 start4. split at4 left none rest [4,10]. split(rest,5): affected [4,10)? root.lo4<5 yes, affected. first.lo4<4 false; last.hi10>5 right [5,10]. correct.
Remove [4,4) ignore.

Edge case remove range covering all intervals with gaps: should remove all covered parts. Our affected start could be pred if overlaps lo or succ. It split by hi and includes all intervals with start<hi after start. If lo before first start and hi huge, start first start (succ) because pred none and succ.lo<hi. split at succ.lo might exclude intervals with start<succ.lo? succ is first start>=lo. Since lo before first maybe succ first. If lo in gap after some interval: pred ends<=lo not overlap, succ first start>=lo. If hi beyond several, start_key=succ.lo. split at succ.lo leaves earlier intervals in left (including pred ending before lo). affected split <hi includes from succ onward. All intervals after succ with start<hi affected. Intervals with start>=hi remain. Correct. But what about interval pred ending exactly lo? Not affected, left. Good.
What if lo in gap but pred ends >lo? Then pred is affected, start pred. Good.
What if lo is inside an interval and hi also inside same interval: pred contains lo start pred. split at pred.lo, split <hi. Since hi could be < pred.hi but >pred.lo? Wait hi>lo>pred.lo. split(rest,hi): node pred.lo<hi so affected includes pred (and because pred.hi>hi, next intervals start>pred.hi>hi, right keys>=hi but none with start<hi). first.lo maybe <lo -> left. last=pred; last.hi>hi -> right. pieces [pred.lo,lo), [hi,pred.hi). Good.

Now maintain total length and size with treap. Need recompute when split. But when we use split, it destructively modifies nodes. For add, we discard affected; split_le updates affected and right. New merged interval length computed. left/right sizes updated. Good.
For remove, affected discarded; pieces new. left/right updated. Good.

One subtle issue: In `_split_le(rest, hi)`, it splits by lo<=hi. But if there is an interval with lo less than start_key? no. Good.

Now code structure. Need reply only code block with complete solution. Should not include tests/printing/input. We can include module-level helper functions. Need ensure no name conflicts.

Let's write:

```
class _Node:
    __slots__ = ('lo','hi','prio','left','right','size','total')
    def __init__(self, lo, hi):
       self.lo=lo; self.hi=hi; self.prio=_next_priority()
...
```
Use global seed function. Need be thread? no.

Priority generation: xorshift 32-bit. Avoid priority collisions? Treap can handle equal priorities by one branch. Fine. Use 64-bit to reduce. Implement:
```
_PRIO_STATE = 0x9E3779B97F4A7C15
def _next_priority():
    global _PRIO_STATE
    x = _PRIO_STATE
    x ^= (x << 7) & 0xFFFFFFFFFFFFFFFF
    x ^= x >> 9
    x ^= (x << 8) & 0xFFFFFFFFFFFFFFFF
    _PRIO_STATE = x
    return x
```
Maybe xorshift64. Need mask after shifts. Good. But if state not updated with &? Use.
```
def _next_priority():
    global _PRIO_STATE
    x = _PRIO_STATE
    x ^= (x << 13) & 0xFFFFFFFFFFFFFFFF
    x ^= x >> 7
    x ^= (x << 17) & 0xFFFFFFFFFFFFFFFF
    _PRIO_STATE = x
    return x
```
Seeds. Fine. Priorities random enough.

Alternatively use `random.getrandbits` and import random. Simpler and reliable. `from random import getrandbits`. But random overhead. 60k nodes plus merges, maybe 60k calls. Fine. But deterministic not required. Use xorshift.

Need `_update(node)`:
```
def _update(node):
    size=1; total=node.hi-node.lo
    l=node.left; r=node.right
    if l:
       size += l.size; total += l.total
    if r:
       size += r.size; total += r.total
    node.size=size; node.total=total
```
Node constructor size=1,total=hi-lo. Should we allow hi-lo int/float. If hi<lo invalid not created.

`_split` and `_split_le` and `_merge`. Use iterative? Recursive depth expected log; priorities random. Recursion in split/merge per operation depth tree height ~ O(log n), fine. If worst random unlikely. Could use max recursion default 1000. 60k balanced height ~40. Good.

Potential issue with treap priorities and sorted insertion if xorshift deterministic and keys inserted sorted? Priorities pseudo-random, balanced. Good.

`_rightmost` and `_leftmost`:
```
def _leftmost(node):
    if node is None: return None
    while node.left: node=node.left
    return node
```
No parent.

IntervalSet class:
```
class IntervalSet:
    __slots__ = ('_root',)
    def __init__(self):
        self._root=None
```

Methods.

`add` insertion no affected:
Using split at lo. But what if there is an interval with start equal lo yet we determined no affected? That would require succ.lo == lo and succ.lo <= hi, but hi>lo, so affected. So none. Splitting at lo places all keys>=lo (none equal? could be >hi but start>lo). new interval [lo,hi) and right start>hi? Since no affected, if succ exists then succ.lo>hi (because if <=hi would affected? Wait condition elif succ and succ.lo <= hi. If succ.lo>hi, no affected. Also pred.hi<lo. So right first start >hi. new interval doesn't touch. Good.
Use `left, right = _split(self._root, lo)`, then `self._root = _merge(left, _merge(_Node(lo,hi), right))`.
But if there is an interval with start<lo and hi? pred.hi<lo, no overlap. Split at lo leaves pred in left, right includes intervals start>=lo. Good.
No need split_le.

If affected: after `left, rest = _split(self._root, start_key)`, `affected, right = _split_le(rest, hi)`. Suppose start_key=pred.lo but there is an interval before pred? left keys<start_key. Good.
`last = _rightmost(affected)`; affected should not None. Could assert but no. If None due bug, handle:
```
if affected is None:
    # shouldn't; maybe start_key interval not in tree? 
```
Could structure start_key from node in tree, so nonempty. `_split_le` includes key start_key because start_key <=hi? For add if start_key=pred.lo. pred.lo<lo<hi, yes. If start_key=succ.lo<=hi, yes. So affected has at least first. However, `_split(self._root,start_key)` puts keys >= start_key in rest. If there are intervals with same start? No. Includes start_key. Good.
`new_lo = min(lo, start_key)` or `start_key if start_key < lo else lo`. Since start_key could equal lo. Use `new_lo = lo if lo < start_key else start_key`. Actually min. `new_hi = hi if hi > last.hi else last.hi`.
new node. `self._root = _merge(left, _merge(new_node, right))`.

Potential issue: affected split_le by hi includes intervals starting <=hi. But what if an affected interval starts much less than lo and there is a gap before another affected interval with start<=hi but that interval does not overlap new? New [lo,hi) covers gap; as argued union contiguous if pred connected. What if start_key=succ.lo (no pred overlap), new_lo=lo, new interval starts at lo. It covers up to hi. Any interval with start <=hi touches/overlaps [lo,hi) at start. If start<lo? none from start_key. Good. New merged [lo,maxhi). Correct.
What if pred overlaps lo but new hi is less than pred.hi; affected split_le hi includes pred and also intervals with start <=hi. Could there be interval after pred with start <= hi but not overlapping pred? Since pred.hi > hi (because pred extends past hi), next.start > pred.hi > hi, none. So only pred. new_hi=pred.hi. new_lo=pred.lo. New node [pred.lo,pred.hi] same as pred. But new interval [lo,hi) with hi<pred.hi is contained in pred, add no change. We replace pred with same, okay.
What if pred.hi > lo but pred.hi <=hi, affected split_le hi includes pred and later intervals start<=hi. new_hi=max(hi,last.hi). If later interval extends past hi, new_hi extends. New interval [pred.lo,new_hi). This merges all intervals start<=hi, but what about a later interval with start between pred.hi and hi but doesn't overlap new [lo,hi)? It starts maybe >lo, but new interval covers [lo,hi), so if start<=hi, it touches/overlaps new at [start,hi) if start<hi or at hi if start==hi. Union of pred [a,b) with new [lo,hi) is [a,hi) if b>=lo. Actually pred overlaps new because b=pred.hi>lo. So pred+new is [a,hi). Later interval start c<=hi touches/overlaps [a,hi); if c<hi overlap, if c=hi touch. So include. Good.

Remove pieces construction with treap. Need if both pieces, merge them. But merging two nodes with `_merge(pieces, rightpiece)` assumes all keys in pieces < keys in rightpiece. Left piece lo=first.lo < lo; right piece lo=hi. Since lo<hi, yes. But what if first.lo maybe equal hi? No. Sorted. `_merge` will maintain treap and update. Good. If `pieces` only left, merge with right tree later. If only right.

Could there be a situation where left piece and right piece from same interval but first.lo < lo and last.hi > hi, and there are also middle affected intervals? If first interval extends right past hi, no middle. If last extends, right piece. If first.lo<lo from first and last.hi>hi from last, pieces sorted. Good.

Need ensure if `first.lo < lo` but `lo` equals first.hi? Not affected because first.hi>lo. So left piece nonempty.

Potential issue remove start_key selection using pred and succ computed with `pred start<lo`, `succ start>=lo`. If lo exactly equals an interval start, pred may be interval before; succ that interval. If pred.hi > lo? Non-touching: pred.hi < succ.lo = lo (strict if gap? Could pred.hi==lo? If pred ended at lo and succ starts at lo, intervals would touch and be merged. So impossible. Thus pred.hi<lo. So start_key uses succ if start<hi. Good.
If lo inside an interval, succ is first interval start>=lo (after current, because current start<lo). pred that current, pred.hi>lo true. start pred. Good.

`contains`: use root search.

`intervals`: iterative inorder. It should return all intervals as tuples. Since treap stores intervals merged. Need if empty returns [].

`total_length`: return root.total if root else 0.

`__len__`: return root.size if root else 0.

Need maybe `__bool__` not required.

Now validate total/size updates after add no affected:
```
left,right=_split(root,lo)
new=_Node(lo,hi)
root=_merge(left,_merge(new,right))
```
_split updates left/right; merge updates. Good.
After affected add: left/rest split updates rest; split_le(rest,hi) updates affected/right. New node; merge. affected discarded. Good.
Remove: split etc. Pieces nodes total correct; merge updates.

Potential treap bug split_le update. Let's write carefully:

```
def _split(root, key):
    if root is None:
        return None, None
    if root.lo < key:
        a, b = _split(root.right, key)
        root.right = a
        _update(root)
        return root, b
    else:
        a, b = _split(root.left, key)
        root.left = b
        _update(root)
        return a, root
```
Check when root.lo >= key: split left into a (<key), b (>=key and <root.lo). Set root.left=b. root goes right. Return a, root. Good.
`_split_le`:
```
def _split_le(root, key):
    if root is None: return None,None
    if root.lo <= key:
        a,b = _split_le(root.right, key)
        root.right=a
        _update(root)
        return root,b
    else:
        a,b=_split_le(root.left,key)
        root.left=b
        _update(root)
        return a,root
```
Check root.lo>key: split left into a(<=key), b(>key). Set root.left=b. root goes right. But b may contain keys >key but <root.lo, all should be in right. root includes b and right. Return a,root. Good.
Merge:
```
def _merge(a,b):
    if a is None: return b
    if b is None: return a
    if a.prio > b.prio:
        a.right = _merge(a.right,b)
        _update(a)
        return a
    else:
        b.left=_merge(a,b.left)
        _update(b)
        return b
```
Priorities 64-bit. Equal negligible; goes b. Good.

Could recursion hit if priorities monotonic due xorshift maybe if inserted in sorted order? Xorshift pseudo-random, no.

Need maybe reset seed per class? not needed. Random priorities independent across nodes. For multiple IntervalSet instances, global sequence fine.

Now performance. Treap 60k add random: each add does search O(log n), split/merge at lo O(log n), no affected? Actually add small disjoint in random order. There may be no overlaps/touches. Each add:
- search pred/succ O(log n)
- pred.hi>=lo? likely false; succ.lo<=hi? likely false (disjoint with gaps? If intervals are disjoint but may be adjacent? "small disjoint intervals in random order" perhaps no merging. If intervals non-touching)
- no affected: split(root, lo) O(log n) and merge twice O(log n). So ~4*log operations per add. 60k*16*constant, fine.
- contains 200k*~16 = 3.2M node loops.

List approach simpler, treap robust. Need ensure code not too long but okay.

Potential issue "Bounds may be ints or floats. Keep original values (no rounding)." Treap stores originals. When merging intervals touching, new_lo/new_hi are from existing/new values, no arithmetic except comparisons and hi-lo for length. If new interval [lo,hi) overlapping existing [a,b), union [min(lo,a), max(hi,b)] using exact bounds. Good. When adding [1.0,3.0) to [3,5), new_lo=1.0, new_hi=5; original 3 lost? Requirement "Keep original values (no rounding)" likely means don't round bounds to integers, not preserve every original boundary after merge. Merged interval [1.0,5) uses max hi original 5. Fine. For remove splits at lo,hi exactly.

Treap add affected computes new_lo = min(lo,start_key). If start_key is from affected first; but if affected includes multiple intervals, min lo is start_key. Good. new_hi = max(hi,last.hi). If affected includes intervals with rightmost last. Since intervals hi increasing in sorted set? Need prove with non-touching intervals: intervals sorted by lo, and maintained merged so for consecutive I_i=[a_i,b_i], I_{i+1}=[a_{i+1},b_{i+1}], we have b_i < a_{i+1} (strict, because if equal touch would merge). Thus b_i < a_{i+1} < b_{i+1} (assuming valid). So hi strictly increasing. Yes.
After treap operations and merges, do we always maintain b_i < a_{i+1}? Add merges all intervals with start<=hi when connected. If no affected, pred.hi<lo and succ.lo>hi. New [lo,hi). Consecutive: pred.hi<lo; new.hi=hi<succ.lo. Good. Affected add: left keys before start_key. We need left's last.hi < new_lo? start_key = first affected's lo (pred.lo or succ.lo). left contains intervals with lo<start_key. But could previous interval touch new interval? If start_key=pred.lo, previous before pred has hi < pred.lo = new_lo? new_lo=min(lo,pred.lo)=pred.lo. Previous.hi < pred.lo (non-touching). Good. If start_key=succ.lo>=lo, new_lo=lo. left contains intervals with lo<succ.lo, including pred if not overlap. pred.hi<lo (condition pred.hi>=lo false for add; but add condition is >=, if pred.hi==lo we would start pred, so no. Thus pred.hi<lo). So previous.hi<lo=new_lo. Good.
Right: new_hi=max(hi,last.hi). Right contains intervals with lo>hi (split_le hi consumed <=hi). Need new_hi < first_right.lo. If new_hi = old hi (>=last.hi), right keys >hi (strict because split_le <=hi consumed), so first_right.lo>hi=new_hi? If new_hi=hi, yes >hi. If new_hi=last.hi > hi, due non-touching after last (which was consumed because start<=hi), next start > last.hi. But wait if last was consumed because start<=hi but last extends past hi, no next start<=hi. Right keys >hi. Could there be right first start between hi and last.hi? Since intervals non-touching and last is in affected, next start > last.hi > new_hi. However our split_le only split by start<=hi, so right contains all intervals start>hi. Could there be an interval with start between hi and last.hi that is not in affected but should be merged? But if last.hi > hi, and it's in affected, any later interval start > last.hi, so no. What if affected last is not the one with max hi? hi increasing, last max. Good. Thus right first start > last.hi = new_hi. Good. If last.hi <= hi, new_hi=hi, right starts>hi. Good.
Remove pieces need maintain b_i < a_{i+1}. We reasoned.

Potential issue using `_split_le(rest, hi)` when hi is float NaN? not required.

Now total length with floats: sum via tree. `node.hi-node.lo` may be int/float. Adding int and float works. total maybe float. Fine. If total length for empty returns 0 int.

Now output. Need single ```python code block. Should we include comments? Fine. No tests/examples/input/printing. Complete solution with class. It says "Write a class IntervalSet..." We can include helper code. Ensure no `if __name__`. No prints. Good.

Let's write final code.

Double-check no syntax errors. We'll define global `_PRIO_STATE`. In `_Node.__init__`, call `_next_priority()`. The function defined before class? We need `_next_priority` before `_Node.__init__` executed. In Python function definitions can call later global at runtime. Define seed and function before Node to be safe.

Code:

```
_PRIO_STATE = 0x9E3779B97F4A7C15

def _next_priority():
    global _PRIO_STATE
    x = _PRIO_STATE
    x ^= (x << 13) & 0xFFFFFFFFFFFFFFFF
    x ^= x >> 7
    x ^= (x << 17) & 0xFFFFFFFFFFFFFFFF
    _PRIO_STATE = x & 0xFFFFFFFFFFFFFFFF
    return _PRIO_STATE
```
Mask final. `x ^= x >> 7` no mask but x under 64 bits after first? Start <2^64. `(x<<13)&mask` may be <2^64; XOR <2^64. Right shift. third masked. final. Good. `_PRIO_STATE` assigned masked.

Node total attribute. `size` and `total`.

`_update` if node None just return. We'll call only non-none.
```
def _update(n):
    if n is None: return
    ...
```

Now IntervalSet. `__slots__ = ('_root',)`.

Implement `add`.
Potential typo with `_split_le` function.

Let's trace add no affected with existing interval start equal lo? Not possible as discussed. But if hi maybe equals lo? ignored. Good.

In add affected, `last = _rightmost(affected)`. Because affected could include intervals whose starts <=hi but after a gap. new_hi = max(hi,last.hi). Is it always correct to merge all affected into one interval spanning from new_lo to new_hi, even if there was no overlap between new [lo,hi) and some affected intervals? New [lo,hi) itself is contiguous. Suppose start_key=pred.lo due pred.hi>=lo. Pred overlaps/touches lo. The union pred + new is contiguous if pred.hi>=lo. But if pred.hi==lo (touch), union [pred.lo,hi) yes because touch at lo. So new bridges from pred.lo to hi. Then any interval with start<=hi is connected to this union? If start<hi, it overlaps [pred.lo,hi) at [start,hi)? Wait union [pred.lo,hi) includes all points from pred.lo to hi, but only if pred and new cover? pred [pred.lo,min(pred.hi,...)] plus new [lo,hi). If pred.hi>=lo, union covers from pred.lo to max(pred.hi,hi). Specifically if pred.hi may be >lo. It is continuous from pred.lo to max(pred.hi,hi). Yes, because pred ends >=lo, new starts lo, overlap/touch. So union covers [pred.lo,max(pred.hi,hi)). If an interval starts at c<=hi, it intersects/ touches this covered range at c (since c<=hi and c< pred.lo? no, c > pred.lo maybe). If c>hi? not consumed. If c<=hi, c is within [pred.lo,hi) if c<=hi and c>=pred.lo. New interval starts at lo, covers [lo,hi); if c<lo? Could c between pred.lo and lo? There are no intervals after pred start<lo, because pred rightmost start<lo. If c is pred? start_key. If c>lo or c=lo, point c in [lo,hi) if c<hi, or c=hi at boundary. So connected. Good.
If start_key=succ.lo with no pred overlap, new starts lo. Union initial new [lo,hi). For any affected interval start c between lo and hi (c=succ or later), c in [lo,hi), so connected. If c==hi, touches. Good.
new_hi should be max of hi and last.hi. But what about pred.hi if pred was affected and pred extends beyond last? pred is first, and intervals hi increasing, last is rightmost. If only pred, last=pred. Good.
Thus new interval [new_lo,new_hi) represents union including internal gaps covered by new [lo,hi). Yes.

Remove pieces: Could removed range, while deleting affected intervals, need to merge left piece with previous interval if removal range starts exactly previous.hi? For removal, previous interval ending at lo is unaffected. Left piece from affected first if first.lo<lo starts at first.lo. If previous interval ends at first.lo? Non-touching strict, previous.hi < first.lo. So no. If first.lo==lo (no left), previous interval could end at lo? If previous.hi==lo and first starts lo, they would be touching originally and merged, impossible. So previous.hi <lo? Actually if first starts lo, previous.hi<first.lo=lo. So gap. After removal, previous remains, first affected removed/right. No touch. If first.lo<lo, left piece starts same first.lo; previous hi < first.lo. fine.
Right piece start hi. Right unaffected first start could be hi? If last.hi>hi, then next start >last.hi>hi. If last.hi<=hi and no right piece, next start>=hi. Could next start==hi. But left piece may end lo (<hi). No touch. If no left piece and previous unaffected ends at lo? There is gap hi-lo >0 before right starts hi. fine.
What if removal range does not affect any interval but removes gap, no merging. fine.
Thus no touching.

One nuance: remove `_split(rest, hi)` includes intervals with start < hi. But if `last.hi > hi`, we create right piece [hi,last.hi). What about if there is an interval in affected before last that extends beyond hi? Because hi increasing, last is rightmost, so only last can extend beyond hi. If it extends, earlier hi < last.start? Non-touching earlier hi < last.lo. Could earlier hi > hi? If last.lo < hi (affected), earlier hi < last.lo < hi, so earlier don't extend beyond hi. Good.
First piece: only first can start before lo because intervals sorted and after first start > first.hi? Could second start <lo? No sorted. So first only.

Total size if `pieces` both and merge: `_merge(pieces, rp)` updates size. If left piece and right piece are from same original interval, there is gap. Good.

Now, what about removal range spanning multiple intervals but `first.lo < lo` and `last.hi > hi`. We create left and right pieces. The new total length should be original total - (hi-lo) (since removed range fully within set? If affected cover all [lo,hi)? In this case first spans lo, last spans hi, and intervals between plus gaps. But gaps inside [lo,hi) are not in set, so subtracting (hi-lo) from total would be wrong. Wait remove(lo,hi): remove intersection of set with [lo,hi), not subtract entire range. Our pieces approach removes affected intervals wholly/partially, but what about gaps within [lo,hi) that were not in set? They remain absent. The total length should decrease by length of set inside [lo,hi), not necessarily hi-lo. We replace affected intervals with left/right pieces. Let's test intervals [0,2),[5,10), remove [1,9). Affected start pred [5? Wait lo=1. pred [0,2] hi2>1 start0. split<hi9 includes [0,2) and [5,10) (start5<9). first=0, lo1 left (0,1). last hi10>9 right (9,10). We replace both with [(0,1),(9,10)]. Total decrease: original lengths 2+5=7; new 1+1=2; decrease5. Removed set intersection: [0,2)∩[1,9)=[1,2) length1; [5,10)∩[1,9)=[5,9) length4; total5. Correct. We also removed gap (2,5) from consideration but it was not in set; replacing affected intervals removes their entire lengths and adds left/right outside removed range. Correct.
If affected had gap, only affected intervals removed; gap remains absent, no intervals. Good.

Add with gap bridged by new interval correctly merges all affected including gaps because new interval fills gap. Good.

Now performance of `intervals()`: iterative. Code:
```
def intervals(self):
    res=[]
    stack=[]
    node=self._root
    while stack or node is not None:
        while node is not None:
            stack.append(node)
            node=node.left
        node=stack.pop()
        res.append((node.lo,node.hi))
        node=node.right
    return res
```
Good.

Now final answer code block.

Let's maybe include type hints? Not necessary. Python 3.11. Use no imports? We don't need imports. Great.

Potential issue with `_PRIO_STATE` global and multiple classes. fine.

Let's write final.