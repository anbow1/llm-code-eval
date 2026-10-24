We need answer with code only, single python code block. Need implement IntervalSet robust performance. Need think.

We need class storing disjoint half-open intervals sorted merged if touch. Operations add/remove O(n) perhaps. 60000 add small disjoint intervals random order with merging? "small disjoint intervals in random order" maybe each add interval tiny disjoint, not overlapping. But if random order, list insertion O(n) each = O(n^2) 3.6B maybe bad. Need efficient. contains O(log n). Need total_length update. Need intervals merged and sorted. For 60k adds random order, naive sorted list insertion with bisect and merging is O(n) due shifting list, 60k^2=3.6B pointer moves in C maybe 1.8B average? Actually list.insert shifts in C memmove, 60k*30k ~1.8B elements ~ maybe 1-2 seconds? Could be okay but under 5? Need design better.

Could use balanced BST? Standard library has no sortedcontainers. Use segment? Need support arbitrary real intervals with additions/removals. 60k adds only then contains. Could collect? The methods need general.

We can implement using a sorted list plus lazy? Need contains O(log n). Need add/remove. Performance requirements specifically for 60000 add small disjoint intervals random order. O(n^2) may still pass under 5 due C memmove, but need ensure. Could optimize add for non-overlapping by insertion using bisect and list.insert. 60k random insert into list of 30k tuples: each insert moves ~? Python list of tuple references memmove fast. 60k*30k*8 bytes = 14.4 GB memory moved. Could be ~1s-3s. Adds also need merging. But requirement "well under 5 seconds" all operations + 200k contains. Likely okay maybe. But we can do better.

Need support remove may split and intervals merge. Could use sorted list. Contains via bisect. For add, find insertion point and merge overlapping/touching. List length at most ~60k for disjoint. For random insertion O(n^2) but memmove.

Alternative: use two structures? For batch adds then contains, maybe use a treap implemented in Python to get O(log n) operations. But remove and intervals ordered. Implement randomized treap keyed by lo, node interval [lo,hi), max hi? For add/remove interval operations need range deletion/merging. Could use treap with split/merge by lo, or ordered nodes and predecessor/successor loops deleting overlaps. Since total overlapping deletions amortized? Add can merge with many intervals but those nodes deleted, number of intervals decreases, so amortized O(?) Need careful.

Implement treap ordered by lo with each node a disjoint interval. Operations:
- add(lo, hi): ignore. Find all intervals overlapping or touching [lo,hi). Need merge if interval.hi >= lo and interval.lo <= hi? Touching merge: [a,b) + [b,c) merge if b == c.lo, and also overlap. Condition interval.hi >= lo and interval.lo <= hi (using inclusive endpoints) because [0,1) and [1,2): previous.hi=1 >= lo=0; next.lo=1 <= hi=2 -> touching. But if a gap, not. For merging range, find first interval with hi >= lo? Need find overlapping/touching by lo <= hi. Since intervals sorted, nodes with start <= hi and end >= lo. Because no overlapping existing intervals. To get candidates, start at predecessor of lo and scan while node.lo <= hi. If node.hi >= lo, merge. If node.hi < lo, skip (no merge, due gap). But need insertion if no merge.

Treap:
Node(left,right,prio, lo,hi, size).
Need find predecessor (max lo < key?) and lower_bound (min lo >= key). Contains via lower_bound(lo <= x?) Specifically intervals sorted disjoint. To test x, find last interval with lo <= x; if hi > x true else false. Use floor node by lo <= x. Or lower_bound x and predecessor. O(log n).

Add:
- If lo >= hi return.
- Need find first potentially mergeable. Since only need intervals where hi >= lo and lo <= hi. Due sorted disjoint. We can find lower_bound(lo) maybe and predecessor. Simpler: Use an ordered treap and repeatedly find predecessors/successors? Add interval [lo,hi):
  - Find node p = maximum lo <= lo? Actually touching with previous if prev.hi >= lo (overlap or touch). If prev.hi < lo, no. But there could be interval with lo < lo and hi >= lo. Exactly predecessor by start. Check.
  - Find next interval with start <= hi (lower_bound). Could be at or after. Need iterate all intervals overlapping/touching new merged range. Start candidate = max(prev.lo, ...). Since merging can expand hi to right if interval starts <= current hi and hi expands to max. We can scan successors with interval.lo <= current_hi, merge, update lo=min, hi=max, remove them. This could be implemented by repeatedly find node with lo <= current_hi? We can find lower_bound original lo, predecessor.

Using treap with split? To delete range overlapping and get aggregate, easiest:
- Determine all nodes with interval.lo < =? We can repeatedly:
  - Find pred = predecessor floor (lo). If pred and pred.hi >= lo: merge, remove pred, update lo=min, hi=max, repeat? Since removing pred may reveal earlier pred; earlier interval could also overlap if expanded lo left (no expansion left except lo = pred.lo, then earlier can't overlap because disjoint and gap? If pred overlapped, pred.lo < lo, update lo = pred.lo; earlier interval might touch pred? If gap? Since intervals disjoint and not touching (merged), earlier.hi < pred.lo (strict gap). New lo=pred.lo, earlier.hi < lo so no overlap. No need repeat left. But if overlapping pred extends, hi max. Also intervals between? none.
  - Then find intervals with start <= current_hi (touching). Iterate successor with smallest lo >= original lo? Need start from lower_bound(lo) (first start >= lo). While node and node.lo <= hi (current merged hi), merge: if node.hi >= lo (always because node.lo >= lo? For first start >= lo, yes if start >= lo, but there may be gap if node.lo > hi? condition stop. For overlapping/touch, node.lo <= hi and since node.lo >= original lo, node.hi > node.lo >? The condition for overlap with current [lo,hi) is node.hi >= lo and node.lo <= hi. Since node.lo >= lo, node.hi > node.lo >= lo, so second condition node.lo <= hi suffices. Merge update hi=max(hi,node.hi). Delete node. Continue with next. However if a node starts <= old hi and extends, next maybe starts <= new hi. Repeat.
  - Need not scan gaps: We only scan successors after first. But what about an interval whose start < lo and hi < lo (gap) then not merge. We check predecessor once. Good.
  - Then insert merged interval [new_lo,new_hi).

But with treap, finding successor and deleting repeatedly. To find intervals with start <= current_hi after current position, use lower_bound(lo) initially then after deletion lower_bound(lo) again? New interval not inserted yet. We can get lower_bound(lo) each time; but if first successor has lo <= hi, delete and merge; then find lower_bound(lo) again. Since earlier candidate deleted, repeated lower_bound O(log n) each, total maybe many but each deletion reduces nodes, but over adds could a node be merged then later? Number of merges O(adds) because each add inserts one and deletes intervals. Deletion count can be up to total inserts plus? Each add can delete many, total deletes ≤ total inserts. But repeated lower_bound calls for scanning even non-overlap? For each add, lower_bound once after left check, then while overlapping; if no overlap, one lower_bound. So O(adds log n + deletes log n). Good.

We also need predecessor search. Then add insert via treap insert O(log n). Random priorities to keep balanced. Need avoid recursion depth? Treap height expected O(log n), recursion for insert/delete okay for 60k random ~ maybe 40. But random priorities could be high? Use deterministic random? Python random overhead okay. Could use random.getrandbits. Recur insertion/delete.

However removal [lo, hi): need remove from intervals, may split. Need efficiently find overlapping intervals and delete, fragments. Naive scan by repeated lower_bound and checking. Since remove can split, and each remove may inspect intervals. Worst-case 60k remove maybe O(n^2) if scanning many non-overlapping? Need design with range deletion. But performance requirement specifically adds + contains. But implement decent.

Could use treap range operations. Remove needs iterate all intervals with lo < hi and hi > lo. Since sorted disjoint, find first interval with hi? Need start from predecessor/lower_bound lo. Need visit overlapping intervals. We can use lower_bound(lo) and predecessor. Then process until node.lo >= hi. Similar to add. For each overlapping interval:
- If interval fully covered (a >= lo and b <= hi): delete.
- If partial left: interval [a,b), a<lo, b>lo. It becomes [a,lo) plus maybe covered remainder. If b<=hi, delete interval and insert [a,lo). If b>hi, replace interval with [a,lo) and [hi,b) (split). But because remove range can overlap multiple intervals; with disjoint intervals, at most first/last partial, middle full. Need collect/delete. Could use treap split by lo and merge? Or iterative remove. Number of intervals removed could be large but total over removals? Could be O(R*N) if repeated full range delete then re-add? But maybe okay. We can implement efficient range delete using treap splits by key to delete all starts in range, but partial intervals at boundaries.

Potential simpler: Use sorted list of tuples; contains O(log n). But add performance maybe okay. Need decide. Code complexity tradeoff. The judge may evaluate hidden performance. Need robust under 5 seconds. 60k adds random disjoint. List insertion O(n^2) might pass? Let's estimate. 60k inserts random into list length average 30k. Each insertion shifts average 30k references = 240KB. 60k*240KB = 14.4GB memmove. Memory bandwidth maybe 10GB/s -> 1.4s, plus Python overhead bisect, tuple creation, list resize copies (amortized). 14GB maybe 2s. 200k contains via bisect ~0.05s. Under 5 likely. But if "small disjoint intervals random order" all non-overlap and interval list grows to 60k. Adds with bisect and no merge. 14.4GB memory move; actual Python list insert uses memmove on PyObject* 8 bytes. 14.4GB, maybe 0.2s per GB? Could be 1s. But also list overalloc realloc copies occasionally. Fine. "well under 5" perhaps list acceptable.

But remove can be O(n) due list deletion/insertion; not specified many removes. Simplicity.

However there's a hidden challenge: "touching intervals merged" and remove splitting. Need sorted disjoint. Using list.

Implement IntervalSet with self._intervals list sorted, self._length total length. The intervals as list of tuples (lo,hi), no touching (hi < next.lo strictly with gap; if hi == next.lo they would be merged). Actually if intervals are disjoint half-open and touching merged, condition next.lo > prev.hi strictly. But can there be adjacent with prev.hi == next.lo? Should merge. So invariant iv[i][1] < iv[i+1][0] (strict) if real values. Wait half-open intervals [1,2) and [3,4): gap (2,3), so prev.hi=2 < next.lo=3. If prev.hi=3, next.lo=3 they touch and should be merged. So strict less. But if floats, use <.

Add:
if lo >= hi return.
Use bisect on starts. Need find first interval with hi >= lo? Since intervals may touch? We can use bisect_left on list by start. Let i = bisect_right? We need predecessor. Because intervals sorted disjoint, find first interval with start <= hi? Let's design with bisect on starts list maybe maintain separate starts? To keep O(log n), can use bisect with key? Python 3.11 bisect supports key? Actually Python 3.10 bisect module key parameter for functions? yes 3.10. But could use list of tuples and bisect. bisect_left(list, (lo,))? Comparing tuples. For start positions, we can use list of tuples. bisect_left(self._intervals, (lo, -inf)) but hi types maybe. Simpler maintain separate list of starts? Updates need sync. Could use bisect_left(self._intervals, (lo,)) works tuples compare: tuple (lo,) is shorter; if first element equal, shorter tuple sorts before nonempty tuple? Python tuple comparison: (1,) < (1,2) True because runs out. Thus bisect_left with (lo,) returns first interval start >= lo? Let's check existing (1,5). Compare (lo,) with (1,5): if lo=1, (1,) < (1,5), so bisect_left returns index of (1,5) because item < key? Wait bisect_left(a,x) returns first position where a[i] >= x. For a=(1,5), x=(1,), a[i] >= x? (1,5) >= (1,) True, so returns index. Good. For lo=0, (0,) < (1,5), index 0. For lo=2, x=(2,), (1,5) < x True, move. Good. Could use.

We need find merge range. Use index i = bisect_left(intervals, (lo,)). This is first with start >= lo. Candidate previous i-1 may overlap/touch if prev.hi >= lo. Also intervals starting at lo? i points to start >= lo; if start == lo included. Good.

Could scan:
start = i
end = i
new_lo, new_hi = lo, hi
# check previous:
if i >0 and intervals[i-1][1] >= lo:  # overlap/touch since previous start < lo (unless start==lo impossible because i first >= lo; previous start < lo)
    new_lo = min(lo, intervals[i-1][0]) = intervals[i-1][0]
    new_hi = max(hi, intervals[i-1][1])
    start = i-1
    end = i
else:
    start = i
    end = i
# Now scan forward while idx < len and intervals[idx][0] <= new_hi (touch/overlap). But careful if previous overlapped, new_hi maybe extends. idx starts i. However if i interval start <= new_hi. It may not overlap if new_hi < lo? no. Condition interval.start <= new_hi means possible touch. But need also interval.hi > new_lo? Since start >= previous start? For current after previous, if new_lo is prev.lo, and interval.start >= lo? Actually if previous overlapped, new_lo <= lo. An interval with start <= new_hi but maybe its hi <= new_lo? Could there be interval wholly before new_lo? No intervals sorted after previous. Since new_lo = prev.lo and previous interval was immediately before i, next interval start > prev.hi (strict gap) originally. If prev.hi >= lo, and new_hi=max(...). The next interval start > prev.hi. Could it be <= new_lo? new_lo=prev.lo < next.start > prev.hi >= prev.lo, so no. For non-prev case, i is first start >= lo. Condition start <= new_hi=hi ensures interval start within/merge. It always overlaps/touches? Need check interval.hi >= lo: interval.start >= lo, so interval.hi > interval.start >= lo. Yes. So condition sufficient.
# For new_lo maybe lo; no issue.
idx = i
while idx < len and intervals[idx][0] <= new_hi:
    new_hi = max(new_hi, intervals[idx][1])
    # since intervals are merged invariant, new_hi can extend causing next start <= new_hi.
    idx +=1
# The range [start, idx) gets removed/replaced. But note if no previous overlap and i interval start > hi, idx=i, no intervals removed; insert at i with [lo,hi].
# If previous overlap, start=i-1; idx at least i? The while may consume intervals starting <= new_hi. But what if previous interval hi > lo, new_hi=prev.hi or hi, and there is a gap before i; if i.start <= new_hi, merge. If i.start > new_hi, stop. Good.
# Need also if previous interval touches at prev.hi == lo, condition >= merges. That's intended.

# Update length: subtract length of removed intervals [start:idx], add new interval length. Or compute total delta. We need original intervals before removal.
old_len = sum(intervals[j][1]-intervals[j][0] for j in range(start,idx)) if small? Could scan range. But idx-start may large. Add operations merging many; total removed scanned same. We can sum during. However previous interval included. Need length update = new_hi - new_lo - (sum removed lengths). If no removed, just hi-lo. Use loop or maintain. Better:
removed_len = 0
for j in range(start, idx): removed_len += intervals[j][1]-intervals[j][0]
self._length += (new_hi-new_lo) - removed_len
self._intervals[start:idx] = [(new_lo,new_hi)]
# But wait if no overlap and insertion index i; start=end=i. list slice assignment inserts. Good.
# Need consider intervals with start == hi exactly: merge. Yes.

Need complexity add: bisect O(logn), while scanning overlapping intervals, slice assignment potentially O(n) shifting. For random disjoint small intervals, each add no merge, start=end=i, assigns slice inserting one at i. List insertion O(n). Fine. But we also compute loop none. For merging, scanning removed intervals, total deletions? Could still O(n^2) worst if repeated add merges with huge interval? Let's examine list approach: Could be okay.

But there is a subtle bug: `bisect_left(intervals, (lo,))` with tuple (lo,) and interval (lo,hi). It returns first start >= lo. If previous interval start < lo but hi >= lo can be prev. However what if there are multiple intervals starting < lo? Sorted, only immediate predecessor can overlap because no overlaps among intervals, but could previous prev have hi >= lo and immediate predecessor after it? Invariant strict gap prev2.hi < prev1.lo < lo. So only immediate predecessor. Good.
If previous touches lo, merge. Good.

What about if lo falls within an interval whose start < lo and hi > lo: previous overlaps. start=i-1. The while idx=i handles intervals with start >= lo. But there could be intervals after the overlapping previous? Because invariant previous.hi < next.start originally. If previous.hi > lo but less than hi, and next.start maybe <= hi, merge. If previous.hi >= hi, new_hi remains prev.hi maybe. Next.start > prev.hi (strict), so condition next.start <= new_hi false if next.start > prev.hi == new_hi. Fine.
But if previous end exactly lo, touch. Merges. Good.

One concern: If i is first start >= lo, but previous hi == lo (touch), and there is interval at i start == lo? Can't because previous hi == lo and invariant previous.hi < next.start, so next.start > lo, so i maybe start > lo. Wait if previous hi == lo, no interval can start at lo because would touch/overlap previous; invariant says previous.hi < next.start, so next.start > prev.hi=lo. Thus no i start == lo. bisect_left returns next start > lo. Fine.

Remove:
Need remove [lo,hi). Ignore if lo>=hi.
Need update length and intervals with possible splits. We can use bisect to find possible first interval with hi > lo. Since intervals sorted by start, any interval overlapping must have start < hi and end > lo. We can find first interval with start < hi? Use i = bisect_left(intervals, (hi,)) returns first start >= hi. Candidate previous i-1 may overlap if prev.start < hi and prev.hi > lo. There might be interval starting >= lo less than hi. Actually i-1 is last start < hi. Intervals before i with start < hi. The first that overlaps may be much earlier if range covers many. Need scan from first with hi > lo. We can find j = bisect_left(intervals, (lo,))? Let's find first interval with start < lo? Overlap could be previous to lower_bound lo. Approach:
i = bisect_left(intervals, (lo,))  # first start >= lo
if i >0 and intervals[i-1][1] > lo:
    start = i-1
else:
    start = i
Then scan idx from start while idx<len and intervals[idx][0] < hi: because possible overlap. But also need interval.hi > lo. For start if previous overlaps. For start=i first start >= lo < hi, hi > lo automatically? If interval start >= lo, it overlaps if start < hi, yes because end > start >= lo? If start == lo, end > lo. If start > lo, end > lo. So yes.
But if previous interval end <= lo, start=i. Intervals with start >= lo and < hi overlap. Good.
For each overlapping interval from start to idx where start < hi:
- interval [a,b)
- If b <= lo: not overlap, but if start=i and start>=lo none. If previous selected, b>lo. During scan, could encounter interval with a < hi but b <= lo? Since sorted start increases, once previous end > lo, subsequent starts > previous start, but could subsequent interval start >= lo > b? If start increases, not. If first selected i with start>=lo, all have start>=lo, b>lo. If start previous, then idx from start includes previous (a<lo,b>lo), next intervals have start > previous.hi (strict gap). If previous.hi might be <=lo? We only selected if b>lo. Next start > b > lo, so no b<=lo. Fine.
- If interval start >= hi stop. condition a < hi.
- Since intervals disjoint sorted, process.

Removal algorithm using slice rebuild maybe simpler:
Find impacted range start to end (first start < hi? include intervals with start < hi and end > lo). We can find and build new intervals. Since remove may split only first and last. But list slicing to replace range with 0-2 intervals. Need compute removed length properly including partial.

Let's design:

def remove(self, lo, hi):
    if lo >= hi: return
    intervals = self._intervals
    # Find i = first interval with start >= lo? Use bisect_left((lo,))
    i = bisect_left(intervals, (lo,))
    # The first possibly overlapping interval is i-1 if intervals[i-1][1] > lo else i
    start = i
    if i > 0 and intervals[i-1][1] > lo:
        start = i - 1
    # Find end = first index >= start with interval.start >= hi (no overlap with removal beyond) OR first with start >= hi. Since intervals with start < hi can overlap; first with start >= hi ends range. Use bisect_left(intervals, (hi,)) gives first start >= hi.
    end = bisect_left(intervals, (hi,), lo=start?) We can just use bisect_left(intervals, (hi,)) but this global may be < start? hi>lo, start <= i. Since hi>lo, first start>=hi >= first start>=lo = i, so end >= i. start could i-1, so end >= start. Good.
    # But need include interval with start == hi? It touches but removing [lo,hi) does not affect it. So end first start >= hi correct. What about interval starting < hi but extends beyond hi; it's at end-1 and partial right. Include. Good.
    # However what if start = i and i >= end? No intervals overlap. Need check intervals[start] start < hi and (if start prev) end? Let's process using range [start:end), and maybe previous? Let's reason.
    # i first start >= lo.
    # start = i-1 if prev.hi > lo else i.
    # end = first start >= hi.
    # If start==i and start==end (i is first start>=hi because no starts in [lo,hi)), no overlap. If start=i-1 due prev overlaps, start < end? end first start>=hi. i is first start>=lo. Since lo<hi, i <= end. start=i-1 < end. yes.
    # The affected intervals are intervals[start:end].
    affected = intervals[start:end]
    # But if start=i and i < end, first interval starts in [lo,hi), overlaps. If start=i-1, prev overlaps, and intervals i...end-1 start between lo and hi (if any), overlap.
    # Build replacements: 
    new_pieces = []
    # left remnant from first affected if its lo < lo and its hi > lo:
    first = intervals[start] if start < end else None
    if first and first[0] < lo:
        left_hi = min(first[1], lo?) Actually if first.hi > lo, remnant [first.lo, lo) if first.lo < lo. But if first.hi <= lo shouldn't be affected; not included. So first.lo < lo and first.hi > lo. If remove hi < first.hi, first interval becomes [first.lo,lo) and [hi, first.hi). If hi >= first.hi, only [first.lo,lo).
        new_pieces.append((first[0], lo))
    # right remnant from last affected if last.hi > hi:
    last = intervals[end-1] if start < end else None
    if last and last[1] > hi:
        right_lo = max(last[0], hi)? If interval starts < hi and end > hi. If last[0] >= hi? end first start>=hi excludes, so last start < hi. Right remnant [hi,last.hi) if hi > last.lo. Since interval overlaps remove, last.hi > hi and last.lo < hi. If last.lo < hi. right = (hi,last.hi). But what if last is same as first and first.lo < lo? If removing smaller than interval, first = last; then we append both left and right. Good. Need order: left then right. But if hi <= last.lo? not possible because last.start < hi. Good.
    # However if first has lo < lo and remove entirely covers first (hi>=first.hi), left only [a,lo). If remove starts within an interval and ends beyond, only left. If remove splits, both.
    # Need also intervals fully or partially inside; any interval whose start >= lo and end <= hi removed. If interval starts >=lo and extends >hi, last right remnant as above.
    # Update length: old affected total = sum(b-a). new_total = sum(piece lengths). length += new_total - old_total.
    # But left/right maybe touching with adjacent intervals outside affected? Need maintain merged invariant. Removing never causes adjacent intervals to become touching because gap can only increase. But splitting an interval creates gap, no touching with outside. Left remnant [a,lo) and previous outside before start? There is no gap change; if first was previous selected, outside before start has hi < first.lo? invariant. Fine. Right remnant [hi,b) and next outside after end has start > b? invariant. Fine. No merging needed. But what if lo coincides with start of first? no left. If hi equals last.hi? no right. Touching with outside? Removed range [lo,hi). Suppose outside interval ends exactly lo, and first affected has start? To be affected and have left remnant? If outside ends exactly lo and first affected starts? The set before had outside.hi < first.lo (strict), but lo could be within first. Outside ends at lo, no new touch with left remnant [first.lo,lo) because outside ends lo and left remnant ends lo: they would touch! Wait, outside interval before start may end at lo, and first affected interval starts < lo? If outside exists and ends == lo, and first affected starts < lo? But invariant before removal: outside.hi < next.lo. If outside ends at lo, next.lo > lo. So no affected interval starts < lo. First affected start >= lo. If we remove inside first starting at lo? left remnant none. If remove starts lo and first start > lo, gap remains. If first start < lo, then outside cannot end at lo because first start < lo < outside? Actually sorted: outside before first. invariant outside.hi < first.lo. If first.lo < lo, then outside.hi < first.lo < lo, so not equal lo. Thus no touch. Similarly right.
    # So replacements left/right only.

But need process affected efficiently. We have start and end via bisect. Need check if any affected intervals. We can compute old_total by summing intervals[start:end], then new pieces. But if range large, summing O(k). Removal over many intervals total maybe. Could update length more directly:
removed_length = 0; replacement_length = ...
For affected list:
old_total = sum(b-a for a,b in intervals[start:end])
new_total = sum...
self._length += new_total - old_total
self._intervals[start:end] = new_pieces

But careful: If no affected intervals (start==end), return. When start=i, end maybe i if no start < hi. Since i first start>=lo. If i==end (first start>=hi) and previous doesn't overlap, no affected. But what if start=i-1 and i==end? Then start<end (i-1 < i), affected includes prev. Good.
Need ensure end computed with bisect_left((hi,)) returns first start >= hi. Suppose there is affected interval whose start == hi? It doesn't overlap [lo,hi) because half-open; should remain. It is first start >= hi, not included. Good. But if previous interval extends past hi, it is at end-1? Wait end = first start >= hi. The interval that contains hi has start < hi, so its index < end. Yes included. Good.

However, possible issue when start=i-1 due prev overlap, but end computed first start>=hi could be i (if next start >= hi). Affected intervals[start:end] includes prev only. Fine. If next start < hi, end>i, includes next intervals starting in range. Good.

Build left remnant based on first affected if first.lo < lo. But is first affected guaranteed to overlap? start=i-1 if prev.hi > lo so yes. If start=i, i may equal end no affected; else interval start >= lo < hi so overlaps. Good.
Left remnant: if first[0] < lo, but what if first[1] <= lo? Shouldn't, because affected overlaps. However if start=i and first[0] >= lo, no left. If start=i-1 prev.hi > lo. So okay.
Right remnant: if last[1] > hi. But last.start < hi. Good. If last[0] > lo maybe. Right remnant [hi,last[1]). If last also first and first.lo < lo, we append left then right. If remove range is entirely within interval, yes split. Need ensure left_hi < right_lo (lo < hi) yes.

Potential need merge new_pieces with outside if lo == first.lo and left absent and previous outside touches lo? No as argued. But after removal, an interval may become [first.lo, lo) and previous outside ends exactly first.lo? invariant previous.hi < first.lo, not equal. So no.

Contains:
Use bisect_left(intervals, (x,))? We need find last interval with lo <= x. Let i = bisect_right(intervals, (x, inf?))? Use bisect_right with (x, float('inf')) problematic with floats. Simpler i = bisect_right(intervals, (x,))? Need compare tuples. For x, want first start > x. Because tuple (x,) compare with intervals start. bisect_right(a, (x,)) returns insertion point after intervals with first < x? Let's test. bisect_right with key (x,) will consider interval (start,hi) <= (x,) iff start < x or (start==x and hi <= empty? (start,hi) <= (x,) false if start==x because (start,hi) > (x,) since first equal and longer). So bisect_right returns index after starts <= x? Let's test a=[(1,5),(3,4)], x=1. bisect_right(a,(1,)): compare key (1,). Need find rightmost where a[i] <= key. (1,5) <= (1,)? False (longer greater), so returns 0. But we want i = last start <= x -> interval index 0. Hmm.

Use bisect_right with key (x, float('inf')) gives after intervals start <= x including equal? If interval start==x, (x,hi) <= (x, inf) if hi <= inf yes. Then i = count starts <= x. predecessor index i-1. Need inf type comparable with ints/floats. float('inf') okay. But if hi maybe Decimal? Bounds may ints or floats only. Good. However if x can be +inf? contains(inf) maybe false. Using inf with inf: (inf,hi) <= (inf, inf) true if hi <= inf. predecessor. But intervals finite. If x=inf, last start <= inf true. Check interval.hi > inf false. okay. If x=-inf, (x,inf)=(-inf,inf), starts <= -inf none unless bound -inf. Fine maybe.
Alternatively use custom binary search on starts with tuple start only. We can implement:
i = bisect_left(intervals, (x,))? first start >= x. Then predecessor = i-1 if start < x? But if interval start == x, i points to it. If start == x, should check it too. Need find last start <= x. Could do i = bisect_right(intervals, (x, float('inf'))) as above. Use math.inf. Import math. Or implement binary search manually with `intervals[mid][0] <= x`, O(logn), robust. Simpler and avoid tuple quirks. We already use bisect. For contains:
lo=0; hi=len(iv)
while lo<hi:
 mid=(lo+hi)//2
 if iv[mid][0] <= x: lo=mid+1
 else: hi=mid
i=lo-1
return i>=0 and iv[i][1] > x
This O(log n). Could use bisect with `bisect_right(intervals, (x, math.inf))`; manual okay.

Need use bisect for add/remove. Could optimize by maintaining starts list? Not necessary. But list tuples; bisect_left with (lo,) works as above? Need ensure for lo less than all, etc. Let's verify add bisect_left intervals, (lo,). We want first start >= lo. `bisect_left(a, x)` returns first a[i] >= x. For interval with start == lo, a[i]=(lo, hi). Compare (lo,hi) >= (lo,)? Python tuple: first equal, then (lo,hi) has additional elements so greater than (lo,), yes. So a[i] >= x true, returns that index. For start < lo, a[i] < x because first element < lo. For start > lo, a[i] > x. Good.
For remove end = bisect_left(intervals, (hi,)) first start >= hi. Good.
For i lower_bound lo. Good.

Performance list slice assignment `intervals[start:end] = new_pieces` if start=end inserts, fine. For add no overlap start=end=i, inserts. For add merging, slice replace. For remove, replace.

Potential issue with float NaN? Real numbers, ignore NaN maybe lo>=hi false with NaN weird. Not required.

Need `intervals()` method returns list. Careful method name same as `_intervals`. It should return sorted disjoint merged. Return list(self._intervals) or copy. Requirement "intervals() -> list[tuple]: all intervals". Could return a copy to prevent mutation. Use list.

`__len__`: len.

Need maintain _length. For add:
intervals = self._intervals
if lo >= hi: return
i = bisect_left(intervals, (lo,))
start = i
new_lo, new_hi = lo, hi
if i>0 and intervals[i-1][1] >= lo:
    prev = intervals[i-1]
    start = i-1
    new_lo = prev[0]  # since prev start < lo? Could prev start == lo? i first start >= lo, previous start < lo. yes. new_lo=prev.lo.
    new_hi = max(hi, prev[1]) # prev.hi >= lo
    idx = i
else:
    idx = i
# Actually if no prev, start=i. If prev, start=i-1 and idx should be i. We can unify:
if i >0 and intervals[i-1][1] >= lo:
    start=i-1
    new_lo=intervals[i-1][0]
    new_hi=max(hi, intervals[i-1][1])
    idx=i
else:
    start=i
    new_lo=lo; new_hi=hi
    idx=i

# While idx<len and intervals[idx][0] <= new_hi:
while idx<len and intervals[idx][0] <= new_hi:
    # Since if idx==i and there is previous overlap, could interval idx start <= new_hi but its end maybe less? It will overlap/touch current? current new_lo=prev.lo <= lo. If idx.start > prev.hi. If idx.start <= new_hi, then it touches/overlaps expanded range? Need also idx.hi > new_lo. idx.start > prev.hi >=? new_lo=prev.lo. Prev.hi could be less than new_lo? no. idx.start > prev.hi >= prev.lo=new_lo, so idx.hi > idx.start > new_lo. Good. If no prev, idx.start >= lo = new_lo. Good.
    new_hi = max(new_hi, intervals[idx][1])
    idx += 1
# Need if prev selected and new_hi maybe hi smaller than prev.hi. fine.
old_length = 0
for j in range(start, idx): old_length += intervals[j][1] - intervals[j][0]
# But if no prev and no forward overlap, start=idx=i, old_length=0.
self._length += (new_hi - new_lo) - old_length
intervals[start:idx] = [(new_lo,new_hi)]

Wait, there's a potential bug: `while idx < len and intervals[idx][0] <= new_hi` with `<=` merges touching. Suppose existing intervals [1,2) and [4,5). Add [2,3). i=0? lo=2, bisect_left on starts (2,) finds first start >=2: index1 (4,5). Prev [1,2), prev.hi=2 >=2, start=0, new_lo=1, new_hi=max(3,2)=3. idx=1. Check intervals[1].lo=4 <= new_hi=3? false. Replace intervals[0:1] with [(1,3)]. Result [1,3), [4,5) good. Does not merge with [4,5) because gap (3,4). If add [3,4): prev [1,3) touches at prev.hi=3 >=3, new_lo=1, new_hi=4. idx=1 [4,5). intervals[1].lo=4 <= new_hi=4, merge; new_hi=max(4,5)=5. Result [1,5). Good.
Add [0,1): i=0, no prev. idx=0 intervals[0].lo=1<=new_hi=1 -> merge touching? It would merge [0,1)+[1,2) indeed yes. new_hi=max(1,2)=2. result [0,2). Good. Touching. Add [0,0.5) to [1,2): i=0, idx=0 intervals[0].lo=1 <= new_hi=0.5 false. Insert at 0 [(0,0.5)], no merge. Good.

But wait: If no prev, `start=i`, but the while can merge forward including interval at i if its start <= new_hi. But if interval at i starts exactly at hi, touching merges. Good. If interval at i starts < lo? Can't because i first start >= lo, so no. If i interval starts == lo, it overlaps. new_hi grows. Good.

Potential issue: If previous overlaps and extends far beyond hi, we set new_hi=max(hi, prev.hi). Then while idx=i; intervals[idx].lo <= new_hi. Could merge intervals that start before prev.hi? Invariant prev.hi < next.start (strict). So if prev.hi == new_hi, next.start > new_hi no merge. If hi > prev.hi, next can be <=hi merge. Fine.

Need compute old_length by loop. Could use sum, but okay.

Now remove implementation using bisect. Need handle if no affected. Let's write carefully.

def remove(self, lo, hi):
    if lo >= hi: return
    intervals = self._intervals
    i = bisect_left(intervals, (lo,))
    # First affected index
    if i > 0 and intervals[i - 1][1] > lo:
        start = i - 1
    else:
        start = i
    # first interval with start >= hi
    end = bisect_left(intervals, (hi,))
    # But if start > end? start could i, end >= i? Since hi > lo, first start >= hi index >= first start >= lo i. end >= i. start is i or i-1, so start < end unless no affected. If start==i and end==i no affected. If start=i-1 and i maybe end, start<end. Good.
    if start >= end:
        return
    affected = intervals[start:end]
    old_len = 0
    for a,b in affected:
        old_len += b-a
    new_pieces = []
    first = intervals[start]
    if first[0] < lo:
        # It was partially on left
        # Could its end <= lo? But affected condition ensures overlap if start selected; however if start = i (no prev), first[0]>=lo so false. If start=i-1, prev.hi>lo. yes.
        new_pieces.append((first[0], lo))
    last = intervals[end - 1]
    if last[1] > hi:
        # partial on right. Need ensure last[0] < hi (yes, end first start>=hi)
        new_pieces.append((hi, last[1]))
    new_len = 0
    for a,b in new_pieces:
        new_len += b-a
    self._length += new_len - old_len
    intervals[start:end] = new_pieces

Wait consider if remove range covers multiple intervals and first also last? If first has first[0] < lo and last[1] > hi with first=last, append left and right. Good.
Consider if first[0] < lo but first[1] <= hi, append left; if last[1] > hi possibly last different. Good.
Consider if remove starts exactly at first[0] (first[0] == lo) no left. If remove ends exactly last[1] no right. Good.

But there is a subtle issue: `end = bisect_left(intervals, (hi,))` excludes interval with start == hi. Suppose remove [lo,hi) and an affected interval starts <hi but extends beyond hi. end points after all starts <hi. The interval with start == hi is not affected. Good.
Now suppose previous interval overlaps and end = i? Then affected [i-1:i]. last=prev. If prev[0] < lo and prev[1] > hi, split. Else if prev extends beyond hi, right remnant [hi,prev.hi). If prev end <= hi, left remnant only; but prev.hi > lo. If remove [lo,hi) extends beyond prev.hi, remove [lo,prev.hi) portion: result [prev.lo,lo). Correct. Does removing tail from prev create touching with next interval? Next.start > prev.hi. After removal, right absent. Left ends at lo < prev.hi. Could next.start equal lo? next.start > prev.hi > lo, no. Gap. Good.
What if remove covers prev entirely and next interval starts at hi? Example intervals [0,5), [6,7). remove [5,6): i=bisect_left starts >=5 -> index1 start6. prev[0,5), prev.hi=5 > lo=5? false. start=i=1. end=bisect_left(hi=6) first start>=6 -> index1. start==end no affected. Remove [5,6) leaves intervals unchanged. Correct, [5,6) not in set. If using >= for overlap would incorrectly? We use > lo correct half-open.
Remove [4,6): i first start>=4 index1 start6. prev [0,5), prev.hi=5 >4 true start=0. end first start>=6 index1. affected [0:1] prev. first[0]<lo yes append [0,4). last[1]=5 > hi=6 false. Remove [4,5) portion, result [0,4). Next [6,7) remains. Gap [4,6). Good.
Remove [1,6): affected prev [0,5), and maybe next start6? end first start>=6 index1, so excludes next. Append left [0,1). last[1]=5 >6 false. Result [0,1), [6,7). Correct; remove [1,6) includes [1,5) from prev, [5,6) gap, excludes 6. next [6,7) remains. Good.
Remove [1,7): i first start>=1 index1 start6? prev[0,5) hi5>1 start=0. end first start>=7 index2. affected [0:2] both. first[0]<lo append [0,1). last [6,7): last[1]=7 > hi=7 false. Remove all. Result [0,1). Correct.
Remove [2,3) within [0,5): i first start>=2 index1 (next maybe [6,7) index1? Wait intervals [0,5),[6,7). bisect_left((2,)) returns index1 because start0<2, start6>=2. prev index0 hi5>2 start=0. end=bisect_left((3,)) returns index1 (start6>=3). affected intervals[0:1]. first [0,5], left [0,2), last same, last[1]=5>3 right [3,5). Result [0,2),[3,5),[6,7). Correct. `new_pieces` order left then right. Good.

No merging after removal required.

Now performance. Add with list insertion O(n). Could improve by using treap for guaranteed O(logn). But list simpler. Need possibly hidden stress "60 000 add calls small disjoint intervals in random order followed by 200000 contains under 5 seconds". Let's benchmark mentally. Python list insertion 60k random insertions into list. Each insert shifts on average 30k refs. 1.8e9 refs. Memory move 8 bytes => 14.4GB. But number of list operations also causes overallocation and copying entire list during resize. List starts capacity small, doubles; total copy about n log? Actually list append with resizing copies n, n/2, etc = O(n), negligible. Slice assignment insertion may also shift and maybe resize. Each insertion at random index. 1.8 billion pointer moves. In C, memmove 14GB. At 20GB/s ~0.7s. But Python function overhead 60k add calls minimal. However each memmove for 240KB with 60k calls; overhead of memmove 60k ~ maybe 0.1s. Should be under 5. But if intervals are random disjoint and each add includes bisect O(log n) ~ 16 C tuple comparisons, ~1M comparisons. Fine. 200k contains manual binary search ~3.2M tuple accesses in Python. 0.1-0.3s. Under 5 easily. Maybe list approach okay.

But what if they benchmark with many removals? Not specified. Need implement reasonable.

Potential issue: `bisect_left(intervals, (lo,))` where lo int/float. Tuple comparison with mixed int/float works. Fine.

 Could there be a desire to avoid O(n) add if overlapping causes scanning all? Worst-case add alternating huge intervals? But performance requirement only small disjoint random. Still okay.

Need maybe optimize contains using bisect to avoid Python loop? Manual binary search 200k * log2(60k)=~3.2M loops, fine. Could use `bisect_right` with `(x, math.inf)` faster C. But need import math. We can do manual robust. 3.2M is fine.

Need maybe return intervals as list of tuples. We maintain list of tuples. Good.

Let's test some edge cases mentally.

Example:
s=IntervalSet()
s.add(1,3)
intervals [(1,3)], length2
s.add(3,5):
i=bisect_left([(1,3)],(3,)): start0? Compare (1,3) < (3,) yes, bisect returns 1 (len). prev index0 hi=3 >= lo=3 true. start=0 new_lo=1 new_hi=max(5,3)=5. idx=1. while idx<1 no. old_len=2. new=(1,5) len4. length=4. replace [(1,5)]. intervals [(1,5)]. Good.

s.add(2,4) to [(1,5)]: i=bisect_left([(1,5)],(2,)): (1,5)<(2,) yes, returns1. prev hi5>=2 true start0 newlo1 newhi=max(4,5)=5. idx=1 none. old_len=4 new_len4 delta0 replace same. Good.

s.remove(2,4) from [(1,5)]: i=bisect_left([(1,5)],(2,)) ->1. prev hi5>2 start0. end=bisect_left([(1,5)],(4,)): (1,5)<(4,) yes ->1. start0<end1. affected [(1,5)], old4. first[0]=1<2 append (1,2). last[1]=5>4 append (4,5). new pieces len1+1=2. length 4-4+2=2. intervals [(1,2),(4,5)]. Correct total length2.
Remove [0,10] from [(1,2),(4,5)]: i=bisect_left((0,)) ->0. prev none start0. end=bisect_left((10,)) ->2. affected both old2. first[0]=1<0 false. last[1]=5>10 false. new pieces empty. length 0. Correct.
Remove [1.5,2.5] from [(1,2),(4,5)]: i=bisect_left((1.5,)) ->1 (start4>=1.5). prev interval0 hi2>1.5 start0. end=bisect_left((2.5,)) ->1 (start4>=2.5). affected [0:1] [(1,2)]. first[0]<1.5 append (1,1.5). last[1]=2>2.5 false. length old1 new0.5. intervals [(1,1.5),(4,5)]. Correct remove [1.5,2) (2,2.5 gap not in set).

Contains:
[(1,2)], x=1.5 -> manual last start<=1.5 index0, hi2>1.5 true. x=2 -> last start<=2 index0 hi2>2 false. x=1 -> hi2>1 true (half-open includes 1). x=0.5 false.

Touching merged in add but what about if remove creates intervals that touch? Removal can't make intervals touch, only increase gap. Suppose [0,2), [3,4), remove [1,3) affects first? remove overlaps first, does not include second because start==hi=3 excluded. Result [0,1), [3,4). Gap (1,3) bigger. If remove [1,2), result [0,1), [3,4). No touch.
What about remove [1,3.5) includes second. Result [0,1). Good.

One subtle issue: Add merges with `intervals[idx][0] <= new_hi`, regardless of whether idx interval's end <=? Because existing intervals are disjoint. If interval starts <= new_hi but there is gap after previous? For no prev start=i first start >= lo. If new_hi=hi. Condition interval.lo <= hi. Since interval.lo >= lo, and interval is [a,b) with a<=hi. It overlaps if a<hi, touches if a==hi. Yes merge. Good.
If previous selected and new_lo=prev.lo, new_hi maybe hi. Suppose prev.hi < lo (not selected) so no. If prev selected prev.hi >= lo. idx=i. Existing intervals after prev have start > prev.hi (strict). But new_hi could be prev.hi if hi<prev.hi. Then interval idx start > prev.hi == new_hi, condition start <= new_hi false. Good. If hi > prev.hi, interval idx start may be <= new_hi. It touches/overlaps new interval [prev.lo,hi) because start > prev.hi but <= hi. If start==hi, touches. Good. If start > hi, gap. Good.

Wait invariant uses strict gap: prev.hi < next.lo. Thus if interval idx start == hi, merging touching with new interval. Good.

After add merging range [start:idx] and replace, could new interval touch with interval before start? start is i-1 if prev selected; before start has hi < new_lo? new_lo=prev.lo. Before prev.hi < prev.lo = new_lo due strict, so no. If start=i (no prev selected), before start is i-1 with hi < lo? We checked prev.hi < lo or no prev. If prev.hi == lo, would have selected. So prev.hi < lo = new_lo. no touch. Could new interval touch interval after idx? idx is first with start > new_hi? We loop while start <= new_hi. After loop, interval idx start > new_hi if exists. So gap. Good.

Need maybe type hints. Standard library. Could import bisect. Class.

Potential improve performance with __slots__ to reduce. Use `__slots__ = ("_intervals", "_length")`.

Need method name `add`, `remove`, `contains`, `total_length`, `intervals`, `__len__`.

Need no printing.

Let's consider if floats and inf. Not required.

Potential issue `bisect_left(intervals, (lo,))` with tuple length one works but if lo is int and interval lo float equal okay. Fine.

Let's perhaps micro-optimize add scanning old_length. We can compute old_length in while to avoid second loop. But left prev included. Could do:
removed = 0
if prev selected: removed += prev.hi-prev.lo
while ...:
    removed += b-a
...
This avoids range loop. But code clarity. For 60k disjoint no overlap, old_length loop none. For merges, extra scanning okay. Use direct.

Similarly remove, compute old_len in loop over affected slice. Slicing `affected = intervals[start:end]` creates list copy. Could avoid for performance but removals not benchmark. Or process directly and compute sum over range. For clarity. But list slice assignment also copies? We can compute old_len via loop range. Build pieces. Use intervals[start] and intervals[end-1]. No need affected copy. Let's optimize.

def remove:
...
if start >= end: return
old_len = 0
for j in range(start, end):
    a,b = intervals[j]
    old_len += b-a
new_pieces=[]
first = intervals[start]
if first[0] < lo: ...
last = intervals[end-1]
if last[1] > hi: ...
new_len = sum...
self._length += new_len - old_len
intervals[start:end] = new_pieces

But if first and last same and both remnants, new_pieces [left,right]. Good.
Need if first[0]<lo but first[1] <= lo? impossible. If first[0]<lo and remove range starts before first? lo may be less than first[0]? first[0]<lo false. If remove [lo,hi) starts before first? Example remove [0,3) from [(1,2)]. i=bisect_left((0,)) ->0, prev none start0. first[0]=1<0 false. right last[1]=2>3 false. Old removed [1,2) entire. Result empty. Correct. If remove [0,1.5) from [(1,2)], first[0]=1<0 false, last[1]=2>1.5 true append (1.5,2). Correct: [1,1.5) removed, [1.5,2) remains.
If remove [0,0.5) from [(1,2)]: i=0 start0. end=bisect_left((0.5,)): first start1>=0.5 index0. start>=end (0>=0) return. Correct.

Potential bug: `end = bisect_left(intervals, (hi,))` uses start? Suppose lo>hi? guard. Suppose hi less than all, end=0. start could? i=bisect_left((lo,)). If lo<hi and lo less than all, i=0; prev none start=0; start>=end (0>=0) return. Correct no intervals overlap because remove before all.
Suppose lo within first, hi before first? impossible hi>lo. end maybe 0 if hi <= first.start. If lo < first.start but hi maybe > first.start? end index0? Actually first.start >= hi? If hi > first.start then end at least1. Fine.
Suppose lo=0, hi=0.5, intervals [(0.1,0.2)]. i=0, start0. end=bisect_left((0.5,)): first start0.1 <0.5 so end=1. start<end. Affected first. first[0]=0.1<lo=0 false; last[1]=0.2>hi=0.5 false. Remove entire interval? But remove [0,0.5) does cover [0.1,0.2), yes. Good.

Now consider adding interval already contained. add [2,3) to [(1,4)]:
i=bisect_left((2,)) ->1 (since start1<2). prev index0 hi4>=2 start0 newlo1 newhi=max(3,4)=4. idx=1 none. old_len=3 new_len=3 delta0 replace [(1,4)]. Good.

Add [0,10) to [(1,2),(4,5)]:
i=0 start0 newlo0 newhi10 idx0. while intervals[0].lo1<=10 merge newhi=max(10,2)=10 idx1; interval1.lo4<=10 merge newhi=max(10,5)=10 idx2. old_len sum1+1=2. newlen10. length 10. replace [(0,10)]. Good.

Potential performance memory: list of tuples. Good.

But the task says "Performance: contains() must be O(log n); 60 000 add() calls of small disjoint intervals in random order followed by 200 000 contains() calls must take well under 5 seconds." Our add is O(n) due list insertion. Overall 60k adds O(n^2) but memmove. Would it pass "well under 5 seconds"? Let's maybe test rough by actual benchmark mentally. 14.4 GB memmove could be high if CPU cache. Python list insertion in C loops? Let's examine CPython list insert implementation: `list_insert_in_works_on_ints` maybe uses memmove. For list of PyObject*, insertion shifts via `memmove(&items[i+1], &items[i], (size-i)*sizeof(PyObject*))`. For 60k random insertions average i = size/2 (because insertion indices random? If intervals random order but small disjoint maybe inserted index random among current; average length/2? Actually final list sorted by value; random insertion order positions are uniformly random among existing? For random permutation, rank of new element among inserted final values is uniform 0..k, so average k/2. Sum k/2 ~ n^2/4=900M refs. Wait n=60k, n^2/4=900M, not 1.8B. Because average list length k/2. 900M refs *8=7.2GB. Even better. If intervals random order and all disjoint, yes rank uniform. 7.2GB memmove. Very fine.

If they use 60k add calls of small disjoint intervals in random order: Could be intervals themselves non-overlapping but random coordinates. Each add insertion shifts. 7.2GB. At memory bandwidth 10GB/s =>0.7s. Actual maybe 1s. Well under 5.

If intervals overlap? "small disjoint intervals" suggests no overlap. Good.

Could optimize further using block list but not needed. Need answer code. But let's think if hidden evaluator imports class and calls methods; no main. Good.

Let's consider correctness of length after add with previous selected and forward merge. We compute old_len for intervals[start:idx], then length += new_len - old. This includes previous interval length which is replaced by new merged interval. Good. For no prev but forward merges, includes intervals starting at i..idx-1. Good. If no merges, old_len 0; length += hi-lo. Since start=idx=i, slice inserts. Good.

Potential issue when no previous selected but the interval at i starts less than lo? Can't because i first start>=lo. If previous selected, start=i-1. What if i=0, previous none. Good.

Potential issue when previous selected and i maybe len. start=i-1, idx=i=len. while none. old_len prev. new interval [prev.lo,max(hi,prev.hi)]. Suppose add [prev.hi+?] actually prev selected requires prev.hi>=lo. If lo <= prev.hi. New interval maybe extends prev. Good.
Example [(1,5)], add [0,2). i=bisect_left((0,)) ->0 (start1>=0). prev none. start0 newlo0 newhi2 idx0. while intervals[0].lo=1<=2 merge newhi=max(2,5)=5 idx1. old_len4 new_len5 length delta1 (add [0,1) portion). replace [(0,5)]. Correct. Here new interval overlaps interval at i though i=0 start1>=lo0. Good.
Example [(1,5)], add [0,1). i=0, newlo0 newhi1 idx0. while intervals[0].lo=1<=1 merge newhi=max(1,5)=5. old_len4 new_len5 delta1. Merges touching [0,1) + [1,5) -> [0,5). Correct.
Example [(1,5)], add [0,0.5). i=0, idx0, intervals[0].lo=1<=0.5 false. old_len0 new_len0.5 insert [(0,0.5)]. Correct.

Potential issue in while condition for merging when no prev and interval starts much later but <= new_hi? If hi less than lo? guard. Good.

Now remove with `bisect_left(intervals, (hi,))`. If an interval's start equals hi, it's excluded. If previous interval contains hi and extends beyond, it has start < hi, included. Good. Suppose previous interval ends exactly hi, and remove [lo,hi). It will be included if start < hi. We remove [lo,hi) portion. For previous interval [a,hi), if a >= lo, affected last=it, last[1]=hi > hi false, no right. It is fully removed if a>=lo. Correct, because remove includes up to hi excluding hi; [a,hi) is subset. If a<lo, append left [a,lo). Good. If next interval starts exactly hi, excluded remains. No touching merge? Removed previous ended hi, next starts hi before removal they would have been touching and should have been merged! Invariant prevents this: if previous ended exactly hi and next starts hi, they would be merged already. So not possible. If previous removed fully and next starts exactly hi, no interval to touch. Fine.

Remove touching adjacent? Since invariant strict, no.

Do we need to merge after removal if left remnant touches previous outside? Argued no. But let's re-evaluate a scenario: intervals [(1,3), (5,7)], remove [2,6). i=bisect_left((2,)): first start>=2? start1<2, start5>=2 => i=1. prev index0 hi3>2 start0. end=bisect_left((6,)): start1<6, start5<6, so end=2. affected both. first[0]=1<2 append (1,2). last[1]=7>6 append (6,7). Result [(1,2),(6,7)]. Correct. No touch. Remove [1,5): i=bisect_left((1,)): start1>=1 -> i=0 (interval0 start==1). prev none start0. end=bisect_left((5,)): start5>=5 -> i=1 (interval1 start==5). affected [0:1] interval0. first[0]=1<1 false. last[1]=3>5 false. Result remove interval0 entirely, interval1 remains [(5,7)]. We removed [1,5) includes [1,3) and gap [3,5), excludes 5. Correct. If interval0 was [0,3), remove [1,5): i=bisect_left((1,)): start0<1, start5>=1 i=1. prev hi3>1 start0. end=bisect_left((5,)): start5>=5 index1. affected interval0. first[0]=0<1 append (0,1). last[1]=3>5 false. Result [(0,1),(5,7)]. Gap (1,5). Correct. No touch with next at 5 because left ends1.

Could removal cause intervals that were separated by gap to become touching if removed entire middle? Removing cannot increase intervals; if middle removed, endpoints gap bigger. No merging.

Thus correct.

Now maybe use `bisect_left(intervals, (hi,))` when hi is float and tuple (hi,) okay.

Need no import of typing maybe not. Use `from bisect import bisect_left`. Code block.

Potential issue method named `intervals` and local variable `intervals` in methods; okay.

Let's write final code with docstrings? Single code block. No tests, no printing.

We should include `__slots__`. Type hints? Could include but not necessary. Use standard library only. Maybe from bisect import bisect_left.

Let's craft final:

```python
from bisect import bisect_left

class IntervalSet:
    __slots__ = ("_intervals", "_length")
    def __init__(self):
        self._intervals: list[tuple] = []
        self._length = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, (lo,))
        if i > 0 and intervals[i - 1][1] >= lo:
            start = i - 1
            new_lo = intervals[i - 1][0]
            new_hi = max(hi, intervals[i - 1][1])
        else:
            start = i
            new_lo = lo
            new_hi = hi
        idx = i
        while idx < len(intervals) and intervals[idx][0] <= new_hi:
            h = intervals[idx][1]
            if h > new_hi:
                new_hi = h
            idx += 1

        removed = 0
        for j in range(start, idx):
            a, b = intervals[j]
            removed += b - a
        self._length += (new_hi - new_lo) - removed
        intervals[start:idx] = [(new_lo, new_hi)]
```

Wait in add, if previous selected, idx should be i. But what if i=0 no prev. Good. But consider previous selected, and `new_hi` updated. We start while idx=i. But what about the previous interval itself is included in removed via start; new_hi already max with prev hi. Good. What if there are intervals between previous and i? There are none by i definition. Good.

One subtle bug: In add, if previous selected, and `new_hi` after previous is e.g. prev.hi > hi. We leave idx=i and while idx<len and intervals[idx][0] <= new_hi. But next interval start > prev.hi by invariant, so false. Good. If prev.hi == lo? selected because >=. new_hi=max(hi,prev.hi). If hi larger than prev.hi, next could merge. Good.

In add, if no previous selected, we start at i. But if i<len and intervals[i][0] <= new_hi, merge. What about interval before i with hi == lo? That would have been previous selected (>=), so no. Good.

Need if while merges, the first interval at i may be fully or partially overlapped. We include its length in removed. Good.

Now remove:
```
    def remove(self, lo, hi):
        if lo >= hi: return
        intervals=self._intervals
        i=bisect_left(intervals,(lo,))
        if i>0 and intervals[i-1][1] > lo:
            start=i-1
        else:
            start=i
        end=bisect_left(intervals,(hi,))
        if start >= end:
            return
        old_len=0
        for j in range(start,end):
            a,b=intervals[j]
            old_len += b-a
        pieces=[]
        first=intervals[start]
        if first[0] < lo:
            pieces.append((first[0], lo))
        last=intervals[end-1]
        if last[1] > hi:
            pieces.append((hi, last[1]))
        new_len=0
        for a,b in pieces:
            new_len += b-a
        self._length += new_len - old_len
        intervals[start:end] = pieces
```
Need consider when first[0] < lo but first[1] <= lo? Shouldn't if start selected. But if start=i and first[0]>=lo, false. If start=i-1, intervals[i-1][1] > lo, so first[0] < lo and first[1] > lo. Good.
When last[1] > hi, but last[0] could be >= hi? end excludes start>=hi; last start < hi. Good. If first and last same and first[0] < lo and last[1] > hi, pieces left then right. What if left remnant (first[0],lo) and right remnant (hi,last[1]) overlap? Need lo<hi, so disjoint. If first=last, first[0]<lo<hi<last[1]. Good.
But what if remove range starts before first and ends inside last: first[0]<lo false; last right appended. Good.
What if remove range starts inside first and ends after last: left appended; right false. Good.
What if remove range starts before first and ends after last: no pieces. Good.
What if remove range exactly covers first partly right only? Example first [0,5), remove [-1,3): i=bisect_left((-1,)) ->0. prev none start=0. end=bisect_left((3,)) ->1. first[0]=0<lo=-1? false (0<-1 false). last[1]=5>3 true append (3,5). Correct remove [-1,3) leaves [3,5). If lo negative, first[0]<lo false. Good.
What if remove [2,10) from first [0,5): first[0]=0<2 true append (0,2); last[1]=5>10 false. Correct.
What if remove [2,4) from [0,5): append left (0,2), right (4,5). `pieces.append((first[0], lo))`; if lo==first[0]? no append; if hi==last[1]? no append. Good.
What if remove [0,5) from [0,5): i=bisect_left((0,)) ->0. start=0. end=bisect_left((5,)) ->1 (start5>=5) start<end. first[0]=0<0 false; last[1]=5>5 false; pieces empty. Remove. Good.

Contains manual:
```
    def contains(self,x):
        intervals=self._intervals
        left=0; right=len(intervals)
        while left<right:
            mid=(left+right)//2
            if intervals[mid][0] <= x:
                left=mid+1
            else:
                right=mid
        idx=left-1
        return idx>=0 and intervals[idx][1] > x
```
Need if x is less than first start, left0 idx-1 false. If x equals interval start, binary finds start<=x, idx maybe interval. hi>x? Since hi>lo=x, true. Good. If x equals hi, last start<=x includes interval, hi>x? hi>hi false. If there is next interval start==x? Invariant merged? If previous hi==x and next start==x would be merged, so no. If interval start==x, true. If x equals hi of current but also start of next impossible unless merged. Good.

`total_length`: return self._length.

`intervals`: return list(self._intervals).

`__len__`: return len(self._intervals).

Now performance: Using list slice assignment `intervals[start:idx] = [(new_lo,new_hi)]`. For insertion no merge, start=idx=i, slice assignment with empty range. Does `intervals[i:i] = [tuple]` resize and insert. It may be a bit slower than `list.insert`. But fine. Could use if start==idx: intervals.insert(start, tuple) else slice. Slice assignment with start=end is insert; CPython handles. But maybe `insert` faster. Not necessary. Could optimize:
```
piece=(new_lo,new_hi)
if start == idx:
    intervals.insert(start,piece)
else:
    intervals[start:idx] = [piece]
```
But slice assignment works. For remove, slice replace. Add no merge 60k calls, slice assignment maybe okay. Is `intervals[i:i] = [piece]` equivalent to insert but creates list and invokes slice assignment. Slightly slower but okay. Could use insert for no merge to improve performance. But need length update before? no.

Potential bug in add when previous selected: `start=i-1`, `idx=i`. If `new_hi` expands and while merges forward. But what if `i == 0`? previous cannot selected. Fine.
What if previous selected and `i` > start. We compute removed including prev and forward. Replace range start:idx. But `idx` starts i. If while none, idx=i. Replaced prev only. Good.
What if no previous selected and i<len, while merges interval at i. start=i, idx after merges. Replaces interval i etc. Good.
What if no previous selected and i=len, no while; insert at end. start=idx=len. length add. Good.

Potential need to merge with previous if previous.hi == lo but i=0? no previous. If previous.hi==lo, selected. Good.

Now let's consider if add interval exactly inside existing? previous selected? Example existing [(0,10)], add [3,4): i=bisect_left((3,)): start0<3, returns1. prev hi10>=3 selected start0 newlo0 newhi=max(4,10)=10. idx=1. while none. removed old10. new len10. delta0. replace same. Good. Notice we didn't need to scan inside interval separate because previous is the interval containing lo. If lo falls inside an interval, previous selected; start=prev. If lo exactly at start of interval, i points to interval, no prev (unless previous hi >= lo? previous hi < current start <= lo; if previous hi == lo and current start==lo, they would have merged, so no). No prev, while at i interval start==lo <= new_hi, merges. Good.
What if add [3,4) to [(0,10),(20,30)]: i=bisect_left((3,)): start0<3, start20>=3 -> i=1. prev index0 hi10>=3 selected start0 newlo0 newhi=max(4,10)=10 idx=1. while intervals[1].lo20<=10 false. removed prev old10, new10. Good. It replaces prev only, leaves next. Good.

Now maybe length type int/float. `_length` can be int initially. Adding float works. No issue.

Should we use `bisect_left(intervals, (hi,))` if interval list maybe huge and hi type? okay.

Let's maybe improve add performance by avoiding `len(intervals)` in while each iteration? Use n = len(intervals). But if not modifying until after, len stable. Use n. Minor.

```
n = len(intervals)
while idx < n and intervals[idx][0] <= new_hi:
...
```
Good.

For remove end computed before modifications. n.

Now final code only.

But let's revisit whether requirement "contains() must be O(log n)" Our manual binary search O(log n), yes. But `n` is intervals count. Good.

Should `add` merge touching intervals after insertion? We do.

One more edge: Adding [lo, hi) where lo/hi are floats and equality uses direct. That's expected.

Potential hidden tests with no intervals. __len__ zero, intervals empty, total_length 0, contains false. Good.

Potential hidden tests call `intervals()` and mutate returned list; since we return list copy, underlying safe. Good.

Potential hidden tests call `len(obj)`. Good.

Let's see if class name and method signatures match. Yes.

Now consider using `bisect_left(intervals, (lo,))` can be wrong if interval tuple (lo, hi) and key (lo,) because Python tuple comparison: `(lo, hi) < (lo,)`? It compares first equal, then second element? For tuple comparison, if one sequence is prefix, shorter is less. `(lo,)` is prefix of `(lo,hi)`? Yes, first equal then shorter ends, so `(lo,hi) > (lo,)`. Therefore `bisect_left` with key `(lo,)` treats interval with start==lo as > key, so returns index. Good.

But wait bisect_left returns insertion point to left of equal elements according to comparison. Since no element exactly equals `(lo,)` (unless tuple length 1? intervals always len2), key is less than interval start equal. It sees interval >= key? In bisect logic, if a[mid] < x then lo=mid+1 else hi=mid. For interval (lo,hi), a[mid] < (lo,)? Compare (lo,hi) < (lo,): first equal, then right tuple has no second, left has second => left is greater, so false. So hi=mid, returns index. Good.

For remove end first start >= hi. Key `(hi,)`. Interval with start==hi: (hi, b) < (hi,)? false, so bisect_left returns index of that interval. Good.

Now maybe `bisect_left(intervals, (lo,))` for lo less than previous start, returns first interval whose start >= lo. Yes.

Let's consider if lo is negative and interval start negative. okay.

Now final. We might include `from typing import Optional`? no.

Let's produce code block.