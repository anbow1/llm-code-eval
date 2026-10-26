We need answer code only. Need design IntervalSet. Need standard lib. Need efficient add/remove, contains O(log n), intervals merging touching. Bounds ints/floats original.

Need implement robust. Could use sorted list of intervals and bisect with key. Add/remove worst O(n) due list insertion/deletion but 60k adds small disjoint intervals random order; list insertion O(n) per add => 60k^2/2 ~1.8B maybe too slow in Python if naive? Need optimize or use better structure. Need contains O(log n). 60k add + 200k contains under 5 sec. Need performance.

Options: balanced BST unavailable. Could use interval tree? Since intervals remain disjoint. Need efficient add/remove. Could use sorted list with bisect and list operations. 60k adds random order small intervals. Each insertion may shift list. 60k * average 30k = 1.8B pointers; could be ~0.3-1 sec? Actually list.insert shifts elements via memmove in C, 60k times average 30k -> 1.8 billion pointer moves ~ maybe 0.5-2 sec. 5 sec likely okay? But remove could split and insert. Need contains 200k bisect on list O(logn) fast. The requirements explicit add 60k small disjoint random followed 200k contains under 5s. Simple sorted list likely under 5s? Let's estimate 60k insertions each shifts average 30k -> 1.8e9 pointer moves = ~14GB memory movement, C memmove ~10GB/s maybe 1.4 sec. Python list insert C does memmove. Should be okay. But add may need merge intervals; if small disjoint random, insertion into sorted list. total O(n^2). Fine. Remove could be similar.

Could use bisect over list of intervals sorted. Need handle merging touching intervals. Need ensure intervals() merges touching. We can maintain invariant disjoint non-touching? If we merge touching intervals at add/remove, then intervals sorted disjoint and separated (lo_i < hi_i < lo_{i+1}). But intervals() requirement merge touching. We can maintain no touching by merging any overlap/touch. For contains, bisect by hi? Since intervals non-touching sorted by lo. Need find interval with lo <= x < hi. Could use bisect_right on starts or hi. We'll maintain list of [lo, hi] (mutable maybe tuple). contains: index = bisect_right(starts?).

If storing list of (lo, hi), use bisect on lo list impossible without separate. Could use bisect with key? Python 3.10 bisect supports key but slower. Or custom bisect on list comparing tuple: bisect_right(intervals, (x, inf)) yields index of first lo > x? Let's define intervals sorted by lo. To find candidate: i = bisect_right(intervals, (x, math.inf)) - 1. Then candidate intervals[i] if i>=0 and x < hi. But if x equals lo of interval, bisect_right((x,inf)) includes interval (x,hi) since (x,hi) < (x,inf), so index after it. Good. If x equals hi of previous and lo of next? We maintain touching merged so not both; if x=hi previous and no next starts at x because merged? If previous ends x, next cannot start x. So candidate previous but x<hi false. Next lo > x? Actually if next lo > x, bisect_right returns? Let's see intervals [(1,3),(5,7)], x=3. bisect_right(intervals,(3,inf)) returns index of first tuple > (3,inf). (1,3)<, (5,7) has lo 5 >3, tuple (5,7) > (3,inf), so i=0. candidate (1,3), x<3 false. correct. x=4: bisect_right returns 1? (1,3)<(4,inf), (5,7)>(4,inf) so i=0? Wait bisect_right returns insertion point after all <=. (1,3) <= (4,inf), so insertion point 1. i=0 candidate (1,3) false. correct. x=5: bisect_right((5,inf)): (1,3)<, (5,7)< (5,inf)? Compare (5,7) vs (5,inf): 5==5, 7<inf => True. So index=2, i=1 candidate (5,7) true. Good. If x exactly lo, candidate is that interval. If x equal hi of interval and next starts >x, false. Good.

Need add [lo,hi). We need merge overlapping/touching with existing intervals. Since invariant merged non-touching. Add may overlap multiple intervals. Need find range of intervals that intersect or touch [lo,hi]. Two intervals [a,b), [c,d) should merge if c <= b and a <= d? Since half-open and touching at endpoints: [1,3) and [3,5) merge because no gap and union [1,5). Condition overlap or touch if lo <= existing_hi and existing_lo <= hi. But if lo==existing_hi (touch at right) merge; if existing_lo==hi (touch at left) merge. For interval add exactly adjacent. If add [3,5) and existing [1,3), merge. Condition existing_lo <= hi and lo <= existing_hi. Note if lo = hi ignored. If hi == existing_lo, merge. Need avoid merging if only point at endpoint? Because half-open, union of [1,3) and [3,5) is [1,5), so yes merge. If intervals are [1,3) and [5,7), add [3,5), condition with first: existing_lo=1 <= hi=5, lo=3 <= existing_hi=3 true; second: existing_lo=5 <=5 true, lo=3<=7 true. So merges both, result [1,7). Correct union includes all.

Need find intervals intersecting/touching. Sorted by lo. We can find first index where existing_hi >= lo? Since intervals sorted and non-touching, existing_hi increasing? Since non-touching, hi_i < lo_{i+1} and lo increasing, so hi increasing. Yes. Need find first interval with hi >= lo (touches/overlap) because existing intervals before have hi < lo. Use bisect on ends? We don't have separate ends list. Could use bisect_left over intervals by lo for potential first? Need find first with hi >= lo. Since hi increasing, could binary search custom. But list small-ish. Use bisect_right? We can use bisect on intervals with tuple (lo, hi). Need first interval whose hi >= lo. Since sorted by lo, and hi increasing, can binary search manually or bisect on starts then check previous. Because if an existing interval could contain lo: find rightmost interval with start <= lo, then candidate. But intervals before candidate may end < lo. Since intervals sorted and non-touching, if candidate starts <= lo, its hi maybe >= lo? If candidate's hi < lo, no later interval can touch? Later starts > candidate hi >=? Since non-touching, later lo > candidate hi. If candidate hi < lo, all later lo > hi_candidate but could later lo <= lo? Wait candidate is rightmost start <= lo. Later start > lo. So if candidate hi < lo, no later can have lo <= existing_hi? Later start > lo, so existing_lo > lo, condition existing_lo <= hi maybe if hi>=later start. But for overlap add [lo,hi), it might start after gap and overlap later interval even if candidate ended before lo. Example intervals [(1,2),(5,6)], add [3,5). Candidate start <=3: (1,2) hi <3. Later (5,6) starts 5 > lo=3; condition lo<=existing_hi true (3<=6) and existing_lo<=hi (5<=5 true) touch. So need find first interval whose hi >= lo, not start <=. Since hi increasing, can binary search by hi. Could maintain separate list of hi or custom bisect by comparing second element. But intervals as tuples and hi monotonic. We can use bisect with key on hi? Python 3.10 has bisect_left(a, x, key=lambda t:t[1]) but only when x compares to key result? Actually bisect_left(a, x, key=...) treats key. For bisect on hi values, `bisect_left(intervals, lo, key=lambda iv: iv[1])` returns first interval with hi >= lo. But key function called for each element, O(log n) calls. Fine, Python 3.11. Could also maintain ends list for O(log n) and update. But simple.

However bisect key available. But for contains O(log n) we can use bisect_right(intervals, (x, inf)) no key.

Alternative: use bisect_left on list of hi if separate. We can maintain intervals as list of [lo,hi] and ends list parallel? On modifications need update both. Simpler use bisect with key for add? Add 60k only. Key lambda overhead okay. But bisect key on `intervals` with x=lo and key hi returns first hi >= lo. Need confirm if intervals non-touching so hi increasing. Yes.

Then scan from i while intervals[j][0] <= hi and intervals[j][1]? Actually merger condition existing_lo <= hi and existing_hi >= lo. Since i is first hi >= lo, for j>=i, existing_hi >= lo automatically? hi increasing so yes. Condition existing_lo <= hi: intervals sorted, as j increases lo increases, so once lo > hi, stop. So merge intervals from i while intervals[j][0] <= hi. This may merge touching/overlap. But what about intervals before i with existing_hi < lo but existing_lo <= hi and lo <= existing_hi? No, existing_hi < lo so no. What about gap zero? i first hi >= lo. If existing_hi == lo (touch), merge. Good. What about an interval with existing_hi < lo but existing_lo == hi? impossible because hi > lo and existing_hi < lo < hi, existing_lo<=existing_hi<lo<hi so existing_lo <= hi true but not touch because existing_hi<lo. Should not merge; gap between existing_hi and lo positive. correct.

So add: if lo>=hi return. Find i = bisect_left(intervals, lo, key=lambda iv: iv[1])? Need returns first interval with hi >= lo. If i==len, no interval touch/overlap. But there may be intervals with lo <= hi? If i==len means all hi < lo. Then no merge; insert at position based on starts. We can insert at bisect_right(intervals, (lo, hi?))? Since intervals sorted by lo. If no overlap/touch, insertion position = bisect_left(intervals, (lo, -inf))? We can find pos = bisect_left(intervals, lo, key=lambda iv: iv[0])? But tuples. Could use bisect_left(intervals, (lo,))? tuples comparison? (lo,?) tricky. Use custom `bisect_right(intervals, (lo, float('-inf')))`? Intervals with same lo? We maintain disjoint non-touching, no same lo maybe. Need insertion position by start. `bisect_right(intervals, (lo, float('inf')))` gives after intervals with lo<=lo. But no existing with lo=lo if no overlap? Could have interval starting lo but then overlap merge. If no overlap, no start=lo. Use `bisect_left` on starts. We can use `bisect_left(intervals, lo, key=lambda iv: iv[0])` returns first start >= lo. But if intervals start < lo? Insert after all starts < lo => first start >= lo. So pos = bisect_left(intervals, lo, key=lambda iv: iv[0]). But if an interval has start < lo and hi < lo (i==len), pos should be after those. Example intervals [(1,2),(5,6)], add [3,4), first hi>=3? intervals hi 2<3,6>=3 so i=1 not len. Wait hi of second 6>=3 but start 5 > hi=4, no merge. Condition intervals[i][0] <= hi? 5<=4 false. So no merge. Need insert at position 1 (before (5,6)) not i? i=1 already position first hi>=lo, which is also start >=? In this case i=1 and start 5 > hi, no merge, insert at 1. That's correct. If i==len, insert at end. General when candidate interval i has start > hi, no merge, insert at i? Let's see add [3,4), intervals [(1,2),(5,6)], i = first hi>=3 = (5,6) index1. start=5 > hi=4, no merge. Insert at index1, before (5,6). Good. But what if intervals before i all hi<lo, and i start > hi; inserting at i is correct by starts? There could be interval at i start > hi but maybe starts less? i is first hi>=lo. Since hi increasing, all before hi<lo thus their starts<hi<lo. So start before i < lo < hi. Good. So insert at i. If merging, remove j..k-1 and replace with merged at i.

Algorithm:
def add(lo,hi):
 if lo>=hi: return
 intervals = self._intervals
 i = bisect_left(intervals, lo, key=lambda p: p[1])  # first hi >= lo
 # If i==len: no merge, pos = len
 if i == len:
   pos = len
   intervals.append((lo,hi)) # but maybe lo already > all hi, so append sorted
   return
 # Check if intervals[i][0] <= hi (touch/overlap)
 if intervals[i][0] > hi:
   # no merge; insert at i
   intervals.insert(i,(lo,hi))
   return
 # merge starting i
 new_lo = min(lo, intervals[i][0])? Since i first hi>=lo but intervals[i][0] may be > lo (overlap if start<=hi but start>lo). If no interval contains lo but interval starts between lo and hi, new_lo should lo (because add starts before). If interval contains lo (start<=lo), new_lo = intervals[i][0] maybe earlier. But intervals before i have hi<lo, not touch. Since i first hi>=lo. If intervals[i][0] <= lo, then new_lo = intervals[i][0] (could be less than lo). If intervals[i][0] > lo, new_lo = lo. So min.
 new_hi = max(hi, intervals[i][1])
 j=i+1
 while j<len and intervals[j][0] <= new_hi: # condition start <= current end, touching merges. But what if intervals[j][0] <= hi originally but after extend? Since new_hi grows. Need merge chain. We need also ensure intervals[j][1] >= lo; i first hi>=lo, later hi >= intervals[i][1] >= lo (because non-touching hi increasing). So start condition enough.
   new_hi = max(new_hi, intervals[j][1])
   j++
 intervals[i:j] = [(new_lo,new_hi)]  # slice assignment
But if i==len append. If intervals[i][0] > hi, insert. Wait what if intervals[i][0] <= hi but intervals[i][0] > new_lo? new_lo min(lo,start) = lo. fine. What if i first hi>=lo but intervals[i][0] <= hi and lo > intervals[i][1]? i hi>=lo, so lo<=hi_i, overlapping. If lo == hi_i touch. Good. Need if intervals[i][0] <= hi, merge; but if hi < intervals[i][0]? no. Condition covers interval starting up to hi. Since intervals sorted, intervals[i][0] could be > hi no merge. Good.

However if intervals[i][0] <= hi but lo is much less, new_lo min. Example add [3,5), intervals [(1,10)]. i first hi>=3 is 0. start1<=5 merge; new_lo=min(3,1)=1, new_hi=max(5,10)=10. Good.

Remove [lo,hi): remove subset from intervals. Need handle splitting. If lo>=hi return. We need remove [lo,hi) from set. Since intervals disjoint non-touching. Need find intervals overlapping [lo,hi). Removed region may intersect multiple intervals, split one into up to two. We can use similar find first interval with hi > lo? For removal, intervals with existing_hi <= lo not affected. Need first with existing_hi > lo (strict because if hi=lo, no overlap; point at endpoint not included). Use bisect_right on hi? `bisect_right(intervals, lo, key=lambda p:p[1])` returns first hi > lo. Then process while interval start < hi (strict; if start >= hi no overlap). Because removal [lo,hi). If interval end <= lo no overlap. We need consider interval that starts < hi and ends > lo. Since first hi>lo. Loop j from i while j<len and intervals[j][0] < hi. For each interval (a,b):
 - It overlaps [lo,hi) if a<hi and b>lo. By starting i and loop condition a<hi, yes b>lo? j>=i so b>=? hi? Wait i first interval with b>lo. Later b increasing >lo. So yes.
 Need compute segments of intersection removal. We can either reconstruct result. Since intervals may be many. For each affected interval:
   if a < lo and b > hi: split into (a,lo) and (hi,b).
   elif a < lo <= b <= hi: keep (a,lo)
   elif lo <= a < hi < b: keep (hi,b)
   else fully covered: remove.
 But if lo <=a and b<=hi removed.
 Need also intervals touching at endpoints? Removal of [lo,hi) should not merge remaining intervals? The set after removal could have adjacent intervals [a,lo) and [hi,b) separated if hi>lo, no touch. But if remove exactly [lo,hi) and existing [a,b] with a<lo, b>hi, splitting into (a,lo) and (hi,b). If lo==hi? ignored. They are separated by gap hi-lo. If remove adjacent intervals, e.g intervals [(1,3),(3,5)] merged invariant so no touching. But removal [2,3) from (1,5) gives (1,2),(3,5) gap. Good. What if remove [2,3) from (1,3) gives (1,2), no touching. What if remove [3,5) from (1,5) gives (1,3). Good. What if remove [1,2) from (1,5) gives (2,5). Good. If removal spans gap and touches intervals, remaining intervals may become touch? Example intervals [(1,3),(5,7)], remove [3,5). Result [(1,3),(5,7)] still separated gap (3,5) removed? Actually removed [3,5), but set originally had [1,3) and [5,7); removing empty region does nothing. It remains separated by gap [3,5). Since [3,5) wasn't in set. No merge. If remove [2,6), from [1,3) keep (1,2), from [5,7) keep (6,7). Gap. Good. If intervals after removal could touch because removed region exactly between? They were already non-touching separated by at least gap, removal can only increase gaps or shrink intervals at edges. So no merging needed after removal. But be careful if an interval (a,b) and removal covers middle, splitting into left and right; they are separated by removed [lo,hi) with hi>lo, so not touching. If removal partially covers right edge of interval and left edge of next? Since intervals non-touching gap >0; removal could remove gap and parts, leaving right part of first and left part of next? Example intervals [(1,3),(5,7)], remove [2,6). Leaves (1,2) and (6,7). Gap (2,6) includes removed and original gap (3,5), not touching. Fine. So no merge.

Need efficient remove. Could use scan over affected intervals and rebuild slice. Number affected may large but okay. For each affected interval compute replacement list (0,1,2 intervals). But if we process and modify via slice. Need maintain sorted. Algorithm:
if lo>=hi return.
intervals = self._intervals
i = bisect_right(intervals, lo, key=lambda p:p[1])  # first hi > lo
if i == len: return
# Find end j where intervals[j][0] < hi
j = i
while j<len and intervals[j][0] < hi:
    j += 1
if j == i: return
# Replace intervals[i:j] with resulting pieces
new_pieces = []
for k in range(i,j):
    a,b = intervals[k]
    # overlap with [lo,hi)
    # left piece if a < lo: (a, min(b,lo)) but lo<hi. Since a<lo. If b<=lo no overlap but i starts b>lo and loop a<hi. Actually if b<=lo wouldn't be in i? Could be? j>=i intervals b>lo. For k>=i, b>lo, so if a<lo, left piece (a,lo). If lo <= a, no left piece.
    if a < lo:
        new_pieces.append((a, lo))  # since b>lo, lo within interval. If a<lo. lo could be less than a? no.
    if b > hi:
        # right piece starts max(a,hi)? If b>hi, and interval overlaps. Need if hi > a? Since a<hi due loop condition. But k=j-1 maybe a<hi. So right piece (hi,b). If a>=hi not loop. If a could be <hi. So (hi,b). But if hi < a? no. 
        new_pieces.append((hi,b))
    # If b > hi and a<lo, both left and right pieces separated by removed region.
    # If interval fully inside removal nothing.
But need account for interval with a<lo and b<=hi: left piece (a,lo). Condition b>hi false. Good.
If a>=lo and b>hi: right piece (hi,b). Condition a<lo false. Good.
If a<lo and b>hi: both.
If a>=lo and b<=hi: none.
Need ensure left piece length >0: a<lo. right length >0: hi<b. Good.
Since intervals non-touching, new_pieces sorted? For a given interval, left then right. Across intervals, all pieces sorted. Could there be duplicate/touching pieces? Example interval1 right piece ends b1, interval2 left piece starts a2. Since original gap a2 > b1 (non-touching b1 < a2). After removal, b1? left? Actually right piece of interval1 is (hi,b1) if b1>hi. interval2 left piece if a2<lo then (a2,lo). Ordering: interval1 right piece (hi,b1) then interval2 left piece (a2,lo). Since b1 < a2. But could hi > a2? Wait if interval1 b1 > hi and interval2 a2<lo. For both to overlap removal, interval1 b1>lo, interval2 a2<hi. Since intervals ordered b1 < a2. We have hi maybe > a2? If interval2 a2 < hi, and b1 < a2. So b1 < a2 < hi. But interval1 b1>hi? Contradiction b1<hi. So cannot have right piece interval1 and left piece interval2 both? Let's analyze. If b1 > hi then hi < b1 < a2. But interval2 left piece requires a2 < lo. Also loop interval2 start a2 < hi for overlap. Contradiction a2 < hi and a2 > b1 > hi. So not both with b1>hi and a2<lo? Actually if interval1 right piece b1>hi, then interval2 start a2 > b1>hi, so a2<hi false, not in removal. Thus only one edge pieces. But multiple fully covered. New pieces sorted likely. Need maybe merge touching? Suppose two intervals affected and both yield pieces that touch? Original non-touch gap; removal can't create touching as argued. But let's verify if removal [lo,hi) removes middle, could leave left piece from interval1 (a1,lo) and right piece from same interval (hi,b1). Not touch. Across intervals no. So no merge.

Then assign `intervals[i:j] = new_pieces`. But new_pieces length may differ. Good.

Need contains O(log n). As above:
if not intervals: return False
i = bisect_right(intervals, (x, float('inf'))) - 1? Using float inf; if x float, comparison with inf. But if hi could be inf? Bounds real numbers maybe no inf. Using math.inf. Need preserve original values; using inf only in search. However if x is int and inf float okay. But if x greater than all intervals, i last, check x < hi false; if x exactly? Good.

But we can use key instead maybe:
i = bisect_right(intervals, x, key=lambda p:p[0]) - 1
This returns last interval with lo <= x. Then check x < intervals[i][1]. This is O(log n) with key. Better avoids inf and tuple compare. `bisect_right(intervals, x, key=lambda p: p[0])` returns insertion point after last start <= x. If i==0 and no start <= x? Actually if all starts > x, i=0, minus1=-1. If intervals empty. Then candidate i-1. This works. If x less than first start, candidate none. If x equals start, returns after that interval, candidate that. If intervals non-touching. Check x < hi. Good. This key requires bisect_right keyed on p[0]. Python 3.11. It calls lambda O(log n). 200k*log ~3.6M calls, fine under 5s? Each lambda overhead maybe 0.2s. Could optimize by storing starts separately? But no need. Could use tuple bisect no key:
i = bisect_right(intervals, (x, math.inf)) - 1
This compares tuples. 200k*log ~ fast C? bisect does Python comparisons but tuple rich compare. Key may be similar. To be safe performance, maintain separate list? Let's evaluate.

Need total_length sum. Could maintain total length variable updated on add/remove. Or compute sum. Requirements likely total_length called maybe. We can maintain `_total`. Add merge with new length compute. Remove subtract removed length. Since intervals may be split, update total. But simpler compute sum over intervals each call? Could be O(n). Not specified performance for total_length. But maintain total for efficiency.

Need __len__ number intervals. Use len(self._intervals).

Need intervals() return list[tuple] sorted disjoint and touching merged. Our invariant merges touching, but after remove no merging; however could removal cause touching? argued no. But to ensure requirement, intervals() should merge touching intervals just in case, especially if add didn't merge? Our add merges touching. remove never creates touching between different intervals? Let's double-check edge case: remove [lo,hi) where lo equals hi? ignored. If removal cuts gap and shrinks intervals, could one interval's right endpoint equal next interval's left endpoint? Originally next.start > previous.end (strict). Removing cannot increase endpoints inward? Actually removing a prefix from an interval moves its lo right; removing suffix moves hi left. It can only make intervals smaller. If previous interval loses prefix? Its lo increases; hi unchanged. Next loses suffix? hi decreases; lo unchanged. For touching to occur, previous.hi == next.lo. Originally previous.hi < next.lo. Removing pieces cannot increase previous.hi or decrease next.lo, so equality impossible. If removal removes entire previous interval? no. So no. Good.

Need bounds may be ints/floats. Keep original values no rounding. Merge min/max returns original endpoints. total_length number sum. If int, total length int? Sum lengths. Fine.

Potential issue with bisect key and list of tuples: in add, `bisect_left(intervals, lo, key=lambda p: p[1])` returns first with hi >= lo. But `bisect_left` with key: docs: bisect_left(a, x, key=...) returns insertion point in a for x based on key. It finds first element whose key >= x. Yes. If no element hi>=lo, returns len. Good. Need if intervals non-touching hi strictly increasing? Since intervals sorted and non-touching: b_i < a_{i+1} and a_{i+1} < b_{i+1}, so b_i < b_{i+1}. Strict. Good.

In remove, `bisect_right(intervals, lo, key=lambda p:p[1])` returns first hi > lo. Since hi strictly increasing, yes. Need if lo equals some hi, that interval ends at lo; no overlap, skip. Good.

Let's test add logic with intervals list and merging chained. Suppose intervals [(1,3),(5,7)], add [2,6): lo=2 hi=6. i = first hi>=2 -> interval0 hi3>=2 i=0. intervals[0][0]=1<=6 merge. new_lo=min(2,1)=1, new_hi=max(6,3)=6. j=1. intervals[1][0]=5 <= new_hi6 -> merge new_hi=max(6,7)=7 j=2. replace [0:2] with (1,7). Correct.
Add [3,5): intervals [(1,3),(5,7)]. i = first hi>=3 -> interval0 hi3>=3 (bisect_left key hi >=3 includes equal hi=3 at index0). intervals0.start1<=5 merge. new_lo=min(3,1)=1. new_hi=max(5,3)=5. j=1: start5<=new_hi5 -> merge new_hi=max(5,7)=7. Result (1,7). Correct (touching both).
Add [3,4): intervals [(1,3),(5,7)]. i first hi>=3: interval0 hi3>=3 i=0. start1<=4 merge. new_lo=min(3,1)=1, new_hi=max(4,3)=4. j=1: start5<=4 false. replace [0:1] with (1,4). Result [(1,4),(5,7)]. But original [1,3) ∪ [3,4) = [1,4). Correct. Note add starts at endpoint of previous, merge.
Add [4,5): intervals [(1,3),(5,7)]. i first hi>=4? interval0 hi3<4, interval1 hi7>=4 -> i=1. intervals1.start5 > hi5? condition start<=hi: 5<=5 true (touch). new_lo=min(4,5)=4, new_hi=max(5,7)=7. j=2. replace [1:2] with (4,7). Result [(1,3),(4,7)]. But union [1,3) and [4,5) and [5,7) = [4,7) plus [1,3) gap. Wait add [4,5) touches next at 5, but not previous at 3. Result [(1,3),(4,7)]. Correct. But what about adding [3,5) earlier would merge both into (1,7). Fine.
Add [3,4) to intervals [(1,3),(5,7)] we got [(1,4),(5,7)]. Gap [4,5). Correct.
Add [2,5) to [(1,3),(5,7)]: i first hi>=2 interval0 hi3. start1<=5 merge new_lo1 new_hi=max(5,3)=5. j=1 start5<=5 merge new_hi7. result (1,7). Union [1,3) and [2,5) -> [1,5), touches [5,7) -> [1,7). Correct.

Remove logic test:
intervals [(1,5)] remove [2,3): lo2 hi3. i=bisect_right hi>2 -> index0 hi5>2. j loop start1<3 yes j=1. k interval a=1,b=5. a<lo -> append (1,2). b>hi -> append (3,5). replace [0:1] with [(1,2),(3,5)]. Correct.
remove [1,2) from (1,5): i=bisect_right hi>1 -> interval0 hi5>1. j start1<2 yes. a=1<lo? 1<1 false. b5>2 -> append (2,5). Correct.
remove [2,5) from (1,5): i hi>2 index0. j start1<5. a=1<2 append (1,2). b>5? 5>5 false. result (1,2). Correct.
remove [0,10) from (1,5): i hi>0 index0. j start1<10. a=1<0 false. b5>10 false. result empty. Correct.
intervals [(1,3),(5,7)] remove [2,6): i hi>2: interval0 hi3>2 index0. j: start1<6 yes j1; start5<6 yes j2. k0 a1 b3: a<lo true append (1,2); b>hi? 3>6 false. k1 a5 b7: a<lo?5<2 false; b>hi?7>6 append (6,7). new_pieces [(1,2),(6,7)]. replace [0:2]. Correct.
remove [3,5): intervals [(1,3),(5,7)]. i=bisect_right hi>3: interval0 hi3 not >3, interval1 hi7>3 i=1. j loop intervals[1].start5<5? false. j=i return. No change. Correct because [3,5) not in set.
remove [2,4): intervals [(1,3),(5,7)]. i hi>2 interval0. j start1<4 yes j1; start5<4 false j=1. k0 a1 b3: a<lo append (1,2); b>hi?3>4 false. replace [0:1] with (1,2). Result [(1,2),(5,7)]. Removed [2,4) only overlapped first partially. correct.

Potential issue if new_pieces includes pieces that should merge with neighboring intervals? Consider interval before i with end <= lo, and left piece of first affected starts at a<lo ends lo. If previous interval ends exactly lo? Original non-touching means previous.end < a? Wait first affected a may be > previous.end. Left piece a? Actually left piece uses a (original start) < lo. Could previous interval end equal a? Original non-touching, no. So not merge. What if removal lo equals previous.end and first affected a > lo? Then previous unaffected end=lo. First affected maybe a<hi and b>lo. If a>lo, no left piece, right piece etc. Previous end=lo, and if first affected start a>lo, gap. No touch. If first affected a<lo? then a < previous.end? Original non-touching previous.end < a, so previous.end < a < lo. Previous.end < lo. No touch. Good.

Need __len__ returns number intervals. Could define.

Maybe need support merging touching in intervals() if invariant has touching due to weird? We maintain. But to satisfy method maybe return list(self._intervals) as tuples. We store tuples. Good.

Need not print tests.

Need code single block. But let's consider performance under 5 sec for 60k add random disjoint small intervals plus 200k contains. Simple list insert may be okay. However worst random order inserts: each insertion with bisect and list.insert. 60k intervals. Total shifts ~ n^2/2 = 1.8e9 pointer moves. List insert memmove. 1.8e9*8=14.4GB. memmove speed ~10-20 GB/s, plus overhead. Maybe <1s. But Python list insert uses `memmove` C, yes. 60k calls overhead negligible. However list length grows; average shift at insertion random ~ n/2 if intervals sorted random; after 60k, total shifts sum positions? Inserting in random order into sorted list: Each insertion position uniform average current length/2. Sum current length/2 = n(n-1)/4 = 60k*60k/4=900M pointer moves? Wait sum current length from 0 to n-1 = n(n-1)/2, average position half length => n(n-1)/4 = 60k*59999/4 ≈ 900 million. 7.2 GB. Good. Add merging may reduce list? Small disjoint random intervals maybe if overlap? "small disjoint intervals in random order" They may be disjoint intervals but random order; add intervals disjoint so no merging except touching? If disjoint with gaps, no merge. Insert only. Under 5s likely.

But if intervals are all non-overlapping and random, contains uses bisect_right key with lambda, 200k*~16=3.2M calls. Good.

Could optimize contains by using tuple bisect. Let's decide. Use `i = bisect_right(self._intervals, x, key=lambda p: p[0]) - 1`. Python 3.11 supports key. In performance, lambda called ~log n. 200k*17=3.4M, fine. But if total time under 5, okay.

Could maintain starts list to avoid lambda and speed. But then need update starts on add/remove along with intervals. Could be more complex but manageable. Maybe simplest code with key. Need ensure Python 3.11+ okay.

Could avoid key in add/remove by custom binary search functions using list and endpoint index. But code longer. Key is fine.

Potential issue `bisect_left(intervals, lo, key=lambda p: p[1])` in add: If intervals empty, bisect_left returns 0. Good. If lo negative etc.

Implement class:

from bisect import bisect_left, bisect_right
from typing import List, Tuple maybe not needed.

class IntervalSet:
    __slots__ = ("_intervals","_total")
    def __init__(self):
        self._intervals: list[tuple[float,float]] = [] # But ints can be int. type not enforced
        self._total = 0

But bounds may int/float. Type annotate `list[tuple[float, float]]` perhaps int accepted. Use `object`? We can omit or use `list[tuple]`. Python 3.11.

Add updates total. Need calculate delta. Could compute old merged length vs new merged length. Simpler:
old_total = self._total
Before modification, determine intervals affected and their sum? We can compute delta by new interval length? Actually add [lo,hi) union may add length hi-lo minus overlap with existing intervals that becomes unified. If merging removes gaps? Since merging only overlapping/touching, no gaps included. The increase in total = length(new interval) - length of overlap with existing intervals? More precisely after union, total length increase = (hi-lo) - total length of [lo,hi) ∩ existing set. Existing intervals affected may overlap. We can compute removed overlap sum. But easier after modification compute new_total from intervals? Could update by old slice lengths.
We can compute:
In add, if no merge insert => total += hi-lo.
If merge from i to j-1 old intervals sum lengths. New merged interval length. Delta = new_len - old_len_sum. Add delta.
But if i==len append: delta hi-lo.
If intervals[i][0] > hi insert: delta hi-lo.
If merge: sum old lengths for intervals[i:j], new_len = new_hi-new_lo. self._total += new_len - old_sum.
Need j variable. We can use sum(b-a for ...). Number merged maybe small. Or maintain total by after computing. Use `old_len = sum(b-a for a,b in intervals[i:j])` and `new_len = new_hi-new_lo`. Delta. This includes overlapping/touching. Example add [3,4) to [(1,3)]: old_len 2, new_len3, delta1 = added length1. Good. Add [2,5) to [(1,3),(5,7)] old_len2+2=4, new_len6, delta2 = added length3 - overlap1? add [2,5) length3 overlaps [2,3) length1 touches 5 not overlap but merges gap? Wait [1,3) and [2,5) union [1,5): increase from [1,3) is [3,5) length2. Then touch [5,7) no length added? Actually [2,5) includes [2,3) overlap and [3,5) new, does not include 5. It touches [5,7), union (1,7). old total4, new6, delta2. add length3, overlap1 =>2. correct. Merging with [5,7) at touch adds no length. Good.
For remove: need update total by subtracting removed length from existing set. Could compute overlap length removed. Or update using old slice lengths vs new pieces lengths. We know old intervals[i:j], new_pieces. Delta total = sum(new_pieces lengths) - sum(old affected lengths). Since new_pieces are leftovers; difference negative. self._total += new_sum - old_sum.
Need compute old_sum and new_sum. Or compute removed length directly: for each affected interval intersection length with [lo,hi) = max(0, min(b,hi)-max(a,lo)). Sum. Then subtract. That is straightforward. Use total -= removed. Need ensure intervals affected. We have i,j. Loop k i..j-1: removed_len += min(b,hi)-max(a,lo). Since affected overlap positive. Could use. Then build new_pieces. self._total -= removed_len. Simpler.
Alternatively after rebuilding, compute new pieces sum and old sum. Let's use removed_len.

Need be careful with float comparisons and equality. Fine.

Add: compute old_sum and new sum. We can compute `delta = (new_hi - new_lo) - sum(b-a for a,b in intervals[i:j])`. But intervals slice after we modified? We need before assignment. Use `old_len = sum(...)`. If no merge. For insert, total += hi-lo. For merge, total += new_hi-new_lo - old_len.

Potential issue if old intervals affected and new interval overlaps but we merge touching; new_hi-new_lo includes gaps? No gaps because merge condition ensures intervals start <= current end and intervals sorted. When merging intervals with start <= new_hi, if there is a gap? Since condition start <= new_hi means no gap at merge time. But consider intervals [(1,2),(4,5)], add [2,4): i first hi>=2? interval0 hi2>=2 i=0. start1<=4 merge new_hi=max(4,2)=4. j=1 start4<=new_hi4 merge new_hi5. Result (1,5). This includes gap (2,4) which is added by [2,4), so no gap. Good. Add [2,3): intervals [(1,2),(4,5)]. i first hi>=2 -> interval0 hi2>=2 i=0. start1<=3 merge new_hi=max(3,2)=3. j=1 start4<=3 false. Result (1,3),(4,5). Added [2,3), no gap. Correct.
Add [2,4) to [(1,2),(4,5)]: merges both through new interval filling gap [2,4). Result (1,5). The merged interval includes [2,4) added, so total delta = new_len4 - old_len2 =2, which equals add length2 - overlaps0. Correct.

Wait intervals [(1,2),(4,5)] add [2,4): i first hi>=2 includes interval0 hi=2 (touch at start). intervals0.start1<=4 merge new_lo=min(2,1)=1 new_hi=max(4,2)=4. j=1 start4<=4 -> merge new_hi5. result (1,5). Total old lengths 1+1=2, new len4, delta2 add length2. Good.

Now remove total: Remove [2,4) from (1,5) old total4. i first hi>2 index0. j start1<4. k a1 b5 removed=min(5,4)-max(1,2)=4-2=2. new pieces (1,2),(4,5). total=2. correct.

Need __len__: `return len(self._intervals)`.

Method intervals returns list of tuples: `return list(self._intervals)`. Since stored tuples. If stored maybe list? Use tuples.

Should we use `__slots__`? Fine.

Potential issue with bisect key and lambda capturing `p[1]`; in add, if intervals contains tuples. Good.

Let's test contains with key:
intervals [(1,3),(5,7)], x=3:
bisect_right key start <=3: returns index2? Starts [1,5]; bisect_right([1,5],3) -> insertion point 1 (after 1 before5). Actually with key, bisect_right(intervals, x, key=lambda p:p[0]) returns index where key > x? Let's recall: bisect_right returns insertion point to right of x; for keys [1,5], x=3 returns 1 (before 5). i=1-1=0. Candidate (1,3). x <3 false. Good.
x=5: bisect_right keys [1,5], x=5 returns 2 (after 5). i=1. Candidate (5,7). true.
x=0: bisect_right returns0, i=-1 false. good.
x=7: bisect_right returns2, i=1, x<7 false. good.
x=4: bisect_right keys [1,5], x=4 returns1, i=0, x<3 false. good.
If intervals [(5,7)], x=5: bisect_right returns1, i=0, true. x=1: returns0, i=-1 false.

Could combine if i>=0 and intervals[i][0] <= x < intervals[i][1]. Since key ensures start<=x. Need check x<hi. If x maybe float nan? Real numbers maybe no nan. Not worry. If x is inf? no.

Potential issue with bounds ints and floats, `min(lo, intervals[i][0])` returns original. For add if lo is int and interval start float, min returns whichever. Good.

Now consider if `add` called with lo>=hi ignore. If lo/hi are floats and NaN? lo>=hi false for nan, then bad. Not spec.

Need perhaps no type imports. Code:

from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_intervals", "_total")

    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, lo, key=lambda p: p[1])
        if i == len(intervals):
            intervals.append((lo, hi))
            self._total += hi - lo
            return
        if intervals[i][0] > hi:
            intervals.insert(i, (lo, hi))
            self._total += hi - lo
            return
        j = i + 1
        new_lo = min(lo, intervals[i][0])
        new_hi = max(hi, intervals[i][1])
        while j < len(intervals) and intervals[j][0] <= new_hi:
            if intervals[j][1] > new_hi:
                new_hi = intervals[j][1]
            j += 1
        old_len = sum(b - a for a, b in intervals[i:j])
        intervals[i:j] = [(new_lo, new_hi)]
        self._total += (new_hi - new_lo) - old_len

Need note in while, if intervals[j][0] <= new_hi. But what if new_hi is less than intervals[j][1], update. Also what if intervals[j][0] <= new_hi but intervals[j][1] < current new_hi? Then interval contained; merge. old_len includes it. Good.

Potential bug: In add, if intervals[i][0] > hi, no merge and insert at i. But what if i==len? handled. What if intervals[i][0] <= hi but there is an interval before i that touches added at left? i is first hi >= lo. Intervals before i have hi < lo (strict due bisect_left hi>=lo returns first with hi >=lo; before have hi < lo). For interval before with hi < lo, could it touch added at lo if hi == lo? No hi < lo. Could it have start <= hi and lo <= hi? Condition lo <= existing_hi is false because existing_hi<lo. So not merge. Good.

But what if intervals[i][0] > hi, but there is an interval before i that overlaps because its hi >= lo? No i is first hi>=lo, so before hi<lo. no.

Remove:
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_right(intervals, lo, key=lambda p: p[1])
        if i == len(intervals):
            return
        j = i
        while j < len(intervals) and intervals[j][0] < hi:
            j += 1
        if j == i:
            return
        new_pieces = []
        removed = 0
        for k in range(i, j):
            a, b = intervals[k]
            # intersection length with [lo,hi)
            left = max(a, lo)
            right = min(b, hi)
            if left < right:
                removed += right - left
            if a < lo:
                new_pieces.append((a, lo))
            if b > hi:
                new_pieces.append((hi, b))
        intervals[i:j] = new_pieces
        self._total -= removed

Need be careful: for affected interval where a<lo and b>hi, we append (a,lo) and (hi,b). But if lo < a? no. If a<lo but b maybe <=lo? Not affected because i ensures b>lo and j loop a<hi. Could b<=lo? i first b>lo, so b>lo. Good. If b>hi append (hi,b) but what if a>hi? not affected j loop a<hi. Good. If a<lo but lo might be greater than b? no. If b>hi but hi might be less than a? no. Good.

Potential issue if `remove` intersects interval where `a < lo` and `b > hi`, but `lo` could be less than `a`? no. If a<lo. If b>hi. New pieces (a,lo),(hi,b). If lo could equal a? no. If hi could equal b? no. Length positive. Good.

Could `new_pieces` order be wrong if interval has both pieces and there are multiple intervals? We append left then right for each. For next interval, its pieces are after previous interval's right? Let's examine scenario where affected intervals multiple and first yields both pieces. If first interval a<lo, b>hi, then it fully covers removal [lo,hi) because a<lo and b>hi. Then since intervals disjoint, no other intervals can overlap [lo,hi)? Actually [lo,hi) is entirely inside first interval. So j=i+1. Good. If first yields left only and second yields right only, order: first left (a,lo), second right (hi,b). Are they sorted? Since first interval ends b1<=hi? If first yields left only because b1>hi? Wait left only condition a<lo, b>hi? If b>hi would also append right, so left only if b<=hi. Then first interval ends b1<=hi. Second interval starts a2<hi (to be affected). But second interval right only if a2>=lo and b2>hi. Since intervals non-touch, b1 < a2. Need compare left piece (a1,lo) and right piece (hi,b2). lo <= hi. b1<=hi. a2? Could a2 < lo? right only if a2>=lo. So second start >=lo. Since b1<a2 and b1<=hi, a2 could be <hi or >? affected if a2<hi. Then a2 between lo and hi. But second interval right piece is (hi,b2), not (a2,b2), because removal covers [lo,hi) and a2>=lo. Wait if a2>=lo and a2<hi, removal removes prefix from a2 to hi, so right piece starts hi. So pieces: first (a1,lo), second (hi,b2). Sorted. Good.
What if first yields no left but right (a1>=lo, b1>hi). Then interval start >=lo and removal covers prefix; second cannot be affected after because first b1>hi, and intervals non-touch next start>b1>hi, so j=i+1. Good.
What if first yields left (a1<lo,b1<=hi), second yields left (a2<lo,b2<=hi)? Can two intervals both have a<lo? Since intervals sorted and non-touch, if first a<lo and b1<=hi, second a2 > b1. Could a2<lo if b1<lo? But first a<lo and b1 maybe <lo? However first affected requires b1>lo (because i first hi>lo). So b1>lo. Then a2 > b1>lo, so a2<lo false. Thus only first can have left. Similarly only last can have right. New pieces sorted. Good.

Need maybe maintain total as number; if floats, `_total` may float. Fine.

Should we expose intervals as method name same as attribute? If attribute `_intervals`, method `intervals`. Good.

Need maybe public class only. No tests.

Let's consider if interval list insertion with merged intervals and total update when `i` first hi>=lo but intervals[i][0] <= hi. What if intervals[i][0] > hi but there is an interval before i ending == hi? For merge condition existing_lo <= hi and lo <= existing_hi. Before i existing_hi<lo (since first hi>=lo; before hi<lo) so no. What if no interval before i? good.

Potential edge: add [lo,hi) where lo equals existing interval end at index i? `bisect_left(hi >= lo)` includes interval with hi == lo. So merge touch. Good. Then new_lo min(lo, start). If interval ends lo, its start <= lo. new_lo start. new_hi max(hi, lo)=hi. This merges [start,lo) and [lo,hi) into [start,hi). Correct. If there is next interval start == hi, while merges. Good.

Potential performance: add uses `bisect_left` with key lambda `p[1]`. Since hi increasing invariant. After remove, intervals non-touching, hi still strictly increasing? yes. After add merging, still. Good.

Potential if total length with int and float, sum. Fine.

Let's maybe include docstrings? Code only. Desired oververbosity 5. Just code.

Need ensure no `typing` needed. Use Python 3.11. Could add type hints but not necessary. The problem says Python 3.11+. Use standard library.

Let's think if `bisect_left(intervals, lo, key=lambda p: p[1])` is correct with tuples where hi might equal lo. It returns first hi >= lo. Yes. However `bisect_left` key argument only available Python 3.10. 3.11 yes.

Potential issue: When intervals contains ints and floats, lambda p[1] returns value. x lo. Comparison okay.

Now let's revisit performance under 5 seconds. 60k add small disjoint intervals random order. If intervals are disjoint, no merging. Insertion O(n) each. Contains O(log n). The list insertion shifts memory. 60k*30k average = 1.8B? Wait earlier I computed average current length/2, sum current lengths = n(n-1)/2 = 1.8B; divide by 2 = 0.9B moves. Actually for each insert at random position, average position ~ current length/2, sum over lengths 0..n-1 length/2 = (n-1)n/4 = 900M. 900M pointer moves = 7.2GB. Plus list insertion overhead. Under 5s. But if intervals random order and "small disjoint intervals" maybe all inserted not sorted, positions may be random uniform. Yes.

Could there be remove? Not in performance scenario. Good.

But what if 60k add calls of small disjoint intervals in random order but intervals may touch? They might be adjacent, and merging reduces number intervals. But if disjoint maybe with gaps. Either way. If they touch and merge, insertion may still scan/merge small. Not issue.

200k contains with bisect on list length up to 60k. bisect with key lambda called ~16 times. 3.2M lambda calls. Should be under 0.5s maybe. Total under 5.

Potential issue with `contains` using `bisect_right(intervals, x, key=lambda p:p[0])` - if x is float nan? no.

Let's consider if intervals list contains tuples with endpoints as ints, and x float. key comparisons start <= x. Fine.

Now maybe the problem expects `intervals()` to merge touching intervals even if not maintained invariant. We maintain after add, and after remove no touching. But let's prove remove cannot create touching as above. It can, however, if removing interval [lo,hi) that covers gap between two intervals and cuts their ends, could leave endpoints that touch? Example intervals [(1,4),(5,8)], remove [3,6). Left from first (1,3), right from second (6,8). Not touching. If remove [3,5) touches: first (1,3), second (5,8) unchanged? Actually remove [3,5): first overlap [3,4) -> left (1,3), second overlap [5,5)? start5<hi5 false due strict. Result [(1,3),(5,8)]. They are separated by gap [3,5) which was outside set originally? Original gap (4,5) plus removed [3,4) and endpoint 5? Result gap [3,5). Not touching. If remove [4,5): first unchanged (1,4), second start5<5 false. Result [(1,4),(5,8)] separated by (4,5). Not touching. Original intervals were non-touching. So yes.

But what if original intervals are touching because add didn't merge due bug? no.

Maybe intervals() should merge if any touching due to edge floating? no.

Let's think if add merge condition should be `intervals[j][0] <= new_hi` but what if new_hi grows to exactly next start and next interval start equals new_hi, merges. Good. But if new_hi grows past next interval and includes it. Good.

Potential issue in add: `new_lo = min(lo, intervals[i][0])`, but if intervals[i][0] > lo, then new_lo = lo. If intervals[i][0] <= lo, new_lo = start. What if intervals[i][0] <= hi but intervals[i][0] > lo and start between lo and hi. Then new interval [lo,hi) overlaps interval starting at start; union should start lo. new_lo min = lo. Good. What if i first hi>=lo and interval start > hi? no merge. Already handled. What if interval start <= hi but its hi < lo? impossible i first hi>=lo. Good.

Now total_length: Return self._total. Need ensure total not negative due float rounding? Use math. no.

Let's write final code with methods. Include `__len__`.

Maybe use `_intervals: list[tuple]` but no type. Code:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    __slots__ = ("_intervals", "_total")

    def __init__(self):
        self._intervals = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, lo, key=lambda p: p[1])
        if i == len(intervals):
            intervals.append((lo, hi))
            self._total += hi - lo
            return
        if intervals[i][0] > hi:
            intervals.insert(i, (lo, hi))
            self._total += hi - lo
            return

        j = i + 1
        new_lo = min(lo, intervals[i][0])
        new_hi = max(hi, intervals[i][1])
        while j < len(intervals) and intervals[j][0] <= new_hi:
            if intervals[j][1] > new_hi:
                new_hi = intervals[j][1]
            j += 1

        old_len = sum(b - a for a, b in intervals[i:j])
        intervals[i:j] = [(new_lo, new_hi)]
        self._total += (new_hi - new_lo) - old_len

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_right(intervals, lo, key=lambda p: p[1])
        if i == len(intervals):
            return

        j = i
        while j < len(intervals) and intervals[j][0] < hi:
            j += 1
        if j == i:
            return

        new_pieces = []
        removed = 0
        for k in range(i, j):
            a, b = intervals[k]
            left = max(a, lo)
            right = min(b, hi)
            if left < right:
                removed += right - left
            if a < lo:
                new_pieces.append((a, lo))
            if b > hi:
                new_pieces.append((hi, b))

        intervals[i:j] = new_pieces
        self._total -= removed

    def contains(self, x):
        intervals = self._intervals
        i = bisect_right(intervals, x, key=lambda p: p[0]) - 1
        if i >= 0:
            return intervals[i][0] <= x < intervals[i][1]
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Need inspect remove: `bisect_right(intervals, lo, key=lambda p:p[1])` returns first hi > lo. Suppose lo is -inf? fine. If interval hi exactly lo, skip. If i len, no interval hi > lo. But what if intervals start < hi and hi could overlap an interval with hi==lo? no overlap at endpoint only; half-open removal [lo,hi), interval ending at lo doesn't include lo. correct.

Wait removal if an interval starts exactly at lo and ends > lo: i first hi>lo includes it. j loop start < hi. For interval a=lo, b>hi: a<lo false, b>hi append (hi,b). That removes [lo,hi) from interval [lo,b) leaving [hi,b). Correct. If b<=hi: no pieces, fully removed. If a=lo and b>hi, right piece (hi,b). Good. If interval a<lo,b=lo: i first hi>lo? b=lo not >lo, skip. No overlap. correct.

Potential if remove lo lies inside interval with b>lo and hi extends beyond many. The loop j condition start < hi. If interval start exactly hi, no overlap because removal [lo,hi) doesn't include hi. It should not affect interval starting at hi. j stops at start == hi. Good.

New pieces for affected interval where b > hi and a < lo: appends (a,lo) and (hi,b). But if a<lo and b>hi, `left = max(a,lo)=lo`, `right=min(b,hi)=hi` removed=hi-lo. But interval may extend beyond both, removed length hi-lo. New total subtract hi-lo. Old interval length b-a, new lengths (lo-a)+(b-hi) = b-a - (hi-lo). Correct.

Now if a<lo and b<=hi: new (a,lo). removed = b-lo? Wait interval [a,b) overlaps removal [lo,hi): since a<lo<b<=hi, removed length b-lo. We subtract b-lo. New length lo-a. Original b-a. Difference b-a - (lo-a)=b-lo. correct. Code removed: left=max(a,lo)=lo, right=min(b,hi)=b, removed=b-lo. Good.
If a>=lo and b>hi: new (hi,b). removed hi-a. Code left=a, right=hi. Good.
If a>=lo and b<=hi: no pieces, removed b-a. Code left=a right=b. Good.
If a<lo and b>hi: removed hi-lo. Code left=lo right=hi. Good.

Need maybe `intervals()` requirement merge touching. We don't merge in intervals method. But invariant. Could assert? no.

Let's consider if `add` merges intervals but total old_len sum and new len. Suppose add [lo,hi) covers gap that includes intervals? We merge only intervals whose start <= new_hi, and new_hi includes added hi. If there is a gap between intervals not covered by add but new_hi reaches next start? Wait if new_hi reaches next start, that means add interval or merged intervals extend to next start. The union includes all points from new_lo to new_hi because:
- Initial new interval [lo,hi) plus first interval overlapping. If first start > lo, new_lo=lo. The union of [lo,hi) and [start,b) where start<=hi is contiguous from lo to max(hi,b) because start<=hi. If first start <= lo, then [start,b) overlaps [lo,hi) if b>=lo (yes), union contiguous from start to max. When merging next interval with start <= new_hi, there is no gap because next start <= current union end. Thus merged interval length new_hi-new_lo equals union length. old_len sum of existing intervals lengths. Delta new_len-old_len equals added length minus overlap. Correct.

Potential issue if first interval start > hi? no merge insert at i. But what if i first hi >= lo and start > hi, then inserting at i. There may be previous interval with hi < lo, gap. Insert before i. Sorted. Good.

What if `i` first hi >= lo but intervals[i][0] <= hi; merge. However there may be intervals before i with hi < lo but their end maybe equals lo? Since i first hi>=lo includes hi==lo. If there is interval with hi==lo, i would be that interval (bisect_left first >=). So not before. Good. Merge at touch. If interval hi<lo before, no.

Now possible issue with `bisect_left(intervals, lo, key=lambda p: p[1])` when there are intervals with hi equal lo and hi increasing. Returns first hi >= lo. Good.

Let's maybe test random via mental. But no tests.

Need answer as single ```python code block. Should we include only code. Yes.

Double-check use of `__slots__` and methods. Fine.

Potential problem: The class name might conflict with method `intervals` and attribute `_intervals`. Fine.

Now, should we consider using `float('inf')` in contains if key not allowed? We use key. Good.

One subtlety: `bisect_right(intervals, x, key=lambda p: p[0])` with key returns insertion point after last start <= x. But if there are intervals with same start? invariant prevents overlapping and non-touching, so no same start. If there are zero? fine.
Then `intervals[i][0] <= x < intervals[i][1]`. Since i is last start <=x, if x equals start of candidate. If x less than candidate start impossible. If x exactly hi of candidate, false. Good.
If x lies in gap after candidate, false. If x greater than all starts, i last, check x<hi false if beyond. Good.

Now total_length returns int or float. Fine.

Let's maybe add comments? Not necessary.

Need no input, no printing. Code block.

Potential performance improvement: In add, `old_len = sum(...)` over affected intervals. If many intervals merged, at most 60k total over all adds? Could be high but okay. Remove loop over affected. Worst remove huge O(n). Not performance scenario. Good.

Could maintain total without old_len sum? Fine.

Let's think about using list slice assignment `intervals[i:j] = [(new_lo,new_hi)]`. This reduces length by j-i-1. It uses C memmove. Good.

Now final.

Wait: The requirement "Bounds may be ints or floats. Keep the original values (no rounding)." In our add merge, new_lo = min(lo, intervals[i][0]), new_hi = max(hi, intervals[i][1]), retains original endpoints. When merging next intervals, `if intervals[j][1] > new_hi: new_hi = intervals[j][1]`, retains original. Remove uses `(a,lo)`, `(hi,b)`, retains lo/hi passed. Good. If lo is int, hi int, etc. total_length sum maybe int. Good.

What about if add lo==hi ignored. If lo>hi ignored. If intervals with lo>hi invalid. Good.

Maybe `__len__` returns number of intervals after merging touching. Good.

Let's final code.