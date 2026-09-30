We need answer user wants code block only. Need design algorithm efficient O(n log k) probably using two heaps or sorted list? Python stdlib only, n=200k k=1000. O(n log k) with heaps and lazy deletion should work. Need median of sliding window even k average. Need careful duplicate handling. Let's think robust implementation.

Standard approach: maintain two heaps: max_heap (low) contains smaller half (negated values), min_heap (high) contains larger half. Want sizes: len(max_heap) == len(min_heap) or len(max_heap) == len(min_heap)+1 for odd. Median: if low size > high size => -low[0]; else avg. Need remove old elements lazily using delayed dict counts. Also rebalance counts: valid_low = low_size - delayed_low, valid_high = high_size - delayed_high. Need ensure invariant low_size >= high_size and low_size <= high_size+1. But with lazy counts, sizes include invalid. Common: maintain actual size counts low_count, high_count (non-delayed counts?) Maybe easier use `heappush`/`heappop` and delayed, with `low_size`/`high_size` as actual valid counts? We can update on push/remove. Or maintain heap lengths minus delayed? Need avoid O(1).

Alternative: Sorted list via `bisect.insort` on list of k=1000, n=200k: O(n*k) insertion/delete shifting ~200M maybe could pass? k=1000 n=200k -> 200 million element shifts; Python list memmove of pointers fast maybe okay? 200k*1000 ~ 200 million, could be under 2 sec maybe borderline. Heaps O(n log k) more robust.

Implement efficient sliding median with two heaps and delayed deletion. Need handle floats exactly. Need avoid heap top invalid: prune function.

Detailed algorithm:

Given nums list floats. If k < 1 or k > len(nums): raise ValueError. If n==0 and k>0? raise because k > len nums. If len nums maybe 0 and k=0? k<1 raise.

Initialize low: max heap via negative; high min heap. delayed = defaultdict(int) for removals? Actually need remove elements not necessarily top; lazy deletion uses counts keyed by values. But with negative for low, key should be raw value? Standard: delayed dict maps values to counts, but low stores -value, high stores value. To check top invalid: if low top is -x and delayed[x]>0, pop low and decrement delayed[x]. For high top x similarly. Need ensure we know whether top belongs to low or high by sign. Could store delayed by actual numeric value. But if x=-0.0? Fine. If duplicate values, lazy deletion by value can remove any occurrence. Need when invalidating a number, just delayed[num]+=1. Need know which heap valid counts to rebalance? If we track low_size and high_size as actual valid counts, updating on push and remove? But if removal invalidates top or non-top, we don't immediately know which heap contains the number. We can adjust actual counts based on heap membership: to know if removed num belongs to low or high? We can decide via compare with current median boundaries? Standard trick: use two heaps and `small_size`/`large_size` as actual number of elements in each heap (including delayed?) Let's derive.

Known LeetCode 480 solution:
- maxheap (low) negative, minheap (high) positive, delayed dict.
- low_size = k/2, high_size = k - k/2 (number of "logical" elements in each heap excluding delayed? Actually they maintain low_size = number of valid elements in maxheap, high_size = valid in minheap.)
- On insert: if low empty or num <= -low[0]: heappush(low,-num), low_size++; else heappush(high,num), high_size++.
- On remove: delayed[num] += 1; if num <= -low[0]: low_size-- else high_size--; then rebalance.
- prune: while low and delayed[-low[0]]>0: delayed[-low[0]]--; heappop(low); etc.
- rebalance: while low_size > high_size: move valid top from low to high, adjust sizes, prune after moves? while high_size > low_size: move top high to low.
Need ensure `num <= -low[0]` works if low top invalid? We prune before using top? In remove old num before rebalance, we may need top valid? They often use if num <= -low[0] but low top might be delayed; but if it's delayed top, compare maybe not meaningful. Better call prune on low before using? But if delayed top invalid, -low[0] is invalid boundary. However delayed top invalid means valid boundary may be lower? Actually if top invalid, valid max in low could be below; `num` to remove might be equal to invalid top's value? We can use <= but if invalid top value maybe larger than actual valid max. For remove, using this test to adjust sizes can be wrong if num belongs to high but <= invalid low top? Example invalid top 100, valid max 10, removing 50 from high; 50 <=100 so wrongly low_size--. But maybe we can maintain actual low_size via another mechanism. Alternative use Fenwick/coordinate compression: all nums values sorted, sliding window counts frequencies, find median via Fenwick. This is simpler and robust, O(n log n), n=200k log 18 => 3.6M operations in Python loops maybe okay. But standard library only. Fenwick with coordinate compression can get median efficiently. Need compute every window median: maintain freq BIT over sorted unique values. Need sum frequencies and find kth order statistic O(log m) per query. For even k average two k/2 and k/2+1 (1-indexed). That is straightforward. Complexity: n=200k, build sorted unique O(n log n). Then update each window: two updates + two find_kth O(log n), ~200k* (2+2)*18 = 14.4M loop iterations plus Python overhead. Could be okay under 2 seconds? Fenwick find_kth with while bit loops maybe 18 iterations. 200k* (2 removals+2 add? initial k updates + 2*(n-k) updates = ~4n updates =800k updates each 18 =>14.4M; queries 2 per output ~400k*18=7.2M; total ~21.6M while iterations, maybe maybe around 2 sec? Could optimize. Use bisect insort list maybe simpler but O(n*k). Fenwick maybe safe but need be careful performance.

Alternative two heaps likely fastest. Let's design correctly. Need handle lazy deletion sizes robustly.

Two heaps with logical size counts can work if we ensure before using -low[0] in insert/remove, we prune invalid tops. But when removing, we need know which side old element should be counted as belonging. Standard uses old num compared to -low[0] after pruning? Actually if both heaps have no invalid tops, boundaries valid. If low top invalid not possible after prune. We'll prune low/high at start of each step? But for removal, if old num belongs to low or high? Since old num may not be top but belongs to one heap. If we compare to valid low top, if num <= valid low max, could still be in high if duplicate equal boundary? Need count duplicates: equal values can be split between heaps. Lazy deletion by value not distinguishing occurrence. Adjusting low_size vs high_size based on value boundary could be wrong for duplicates equal to max of low while some equal values in high. But does it matter? Let's examine.

Suppose low max=5, high min=5 (equal boundary). old num=5 belongs to high but comparison num <=5 -> low_size-- incorrectly. Then sizes drift. But because equal values indistinguishable, maybe we can conceptually move an equal value from high to low? However low_size-- means low valid count reduced though invalid element in high. It might still preserve multiset of valid elements? Need check.

Known LeetCode solution with delayed and using `num <= -low[0]` works despite duplicates? Let's recall. It uses delayed by value; low_size and high_size are counts of elements in each heap not removed? It compares num to -low[0] to decrement small or large. Duplicates equal to top: if removing equal but from high, it decrements small; but it could also be thought as removing from low and moving some duplicate from high to low later? Need see. Standard solution accepted.

Let's prove: We don't need track exact physical heap membership for lazy counts as long as logical partition invariant based on values. If num <= median boundary, we count it as belonging to small. For duplicates at boundary, choosing either side okay as long as logical sizes correspond to valid counts? But physical heaps may have invalid count in high while we decremented low_size. That may cause logical low_size < actual valid low? Could cause imbalance and rebalancing may move values. Need careful.

Maybe simpler: Use Fenwick coordinate compression. It avoids heaps complexity and likely performance okay. Need maybe optimize Fenwick with arrays and local variables. But user asked efficient n=200k k=1000 well under 2 sec. Fenwick likely okay in Python if optimized? Let's estimate. 200k values -> unique maybe 200k. Initial k 1000 updates: 18k iterations. Slide 199000: remove old and add new (2 updates * 18 = 36 each => 7.16M), queries: if k=1000 even, 2 find_kth each 18 => 3.58M, total 10.7M find loops, plus 7.2M update loops = 18M. Python loop ~50M simple ops/sec? Could be around 1.5-2.5 sec. Need optimize. Could query only one kth for odd, two for even. 18M while iterations; each has indexing and addition. Should pass maybe under 2s if optimized. But maybe slower. Could optimize Fenwick find using bit_length and binary lifting; standard. Maybe precompute bit masks? Let's see.

Alternative: Use two heaps with lazy deletion likely faster ~n log k but with heap operations log k ~10 and pruning, maybe ~2M heap ops? Each heap op Python C-coded, faster. Need implement correct.

Let's thoroughly design heaps. Another approach: Use `sortedcontainers` not stdlib not allowed. Use heap but without lazy maybe remove via `heap.remove` O(k) and rebuild? no.

Use two multisets implemented as heaps with delayed. Need guarantee. Let's examine standard algorithm deeply and possible duplicate issue.

Known LeetCode 480 C++/Java solution:
```
priority_queue<int> lo; // max
priority_queue<int, vector<int>, greater<int>> hi; // min
map<int,int> delayed;
int lo_size=0, hi_size=0;

int findMedian() {
  prune(lo); prune(hi);
  while (lo_size > hi_size) { move lo top to hi; ... }
  while (hi_size > lo_size) { move hi top to lo; ... }
  if (lo_size > hi_size) return -lo.top(); else return (-lo.top()+hi.top())/2.0;
}
```
For remove number n:
```
delayed[n]++;
if (n <= lo.top()) { lo_size--; if (n == hi.top()) hi_size--; } // weird?
```
Some do if n <= lo.top(): lo_size--; else hi_size--;
Add:
```
if (lo.empty() || n <= lo.top()) { lo.push(-n); lo_size++; } else { hi.push(n); hi_size++; }
rebalance();
```
prune: while heap not empty and delayed[heap_top] >0: delayed[top]--; heap.pop();
```
```
Does duplicate issue accepted? I think yes. But we should verify with tricky duplicates.

Consider k=2. Insert 5,5: add 5 to lo (lo_size=1, hi=0); rebalance moves? if lo_size>hi_size+1? no. median (lo top=5, hi empty? even? lo_size=1 hi_size=0 for k=2? That invariant wrong; need lo_size >= hi_size but not lo_size>hi_size+1? For even k, should lo_size=hi_size maybe. Standard uses lo_size >= hi_size and lo_size <= hi_size+1; for k=2 with both in lo? after adding second: if n<=lo.top -> lo_size=2; rebalance while lo_size>hi_size: move one to hi. So lo=5 hi=5 sizes 1/1. OK.

Slide: remove 5, add 5.
remove: delayed[5]=1; if 5<=lo.top (5) -> lo_size-- => low=0 high=1. Add 5: if low empty -> lo.push(-5); lo_size=1. Now sizes low=1 high=1. But physically: low heap has one valid 5? high has one valid 5 plus delayed invalid? Wait physical heaps initially low[-5], high[5]. Remove 5: delayed[5]=1; conceptually which 5 removed? Could remove low's 5 or high's 5. If remove low, low invalid top=5 with delayed. high valid=5. Then add new 5 to low. Physical: low top invalid old 5 plus valid new 5; high valid old 5. delayed[5]=1. Sizes low=1 high=1. findMedian: prune low top? low top = 5 (old invalid? but heap has both -5, delayed=1) prune pops one 5 and decrements delayed, leaving valid new 5. top valid. OK.
If remove should have been high's 5: low valid=5, high invalid+valid? delayed=1 but we decremented low_size, adding to low -> sizes low 2? Actually if remove high but decrement low, then sizes after add: low=1? Let's recalc: start lo valid1 hi valid1. Remove high but delayed[5], lo_size-- => lo0 hi1. Add low=>lo1 hi1. Physical lo valid, hi has two 5 one delayed. Prune hi top? hi top=5 delayed>0: pop one 5 from hi, delayed=0. hi valid one. OK.

Tricky: values split equal? Suppose lo [2], hi [2]. delayed? remove 2 but we decrement lo always; can work because lazy deletion will eventually remove one physical 2. Logical sizes maybe low decreased but physical high contains extra? But when pruning high, delayed may remove high's physical 2, leaving low_size too low? Then rebalancing will move from low to high? Need find actual.

Let's simulate:
Start window [2,2] lo:2 hi:2 sizes 1/1. Remove 2 (should remove high) and add 3: remove: delayed[2]=1; 2<=lo.top 2 -> lo_size=0, hi_size=1. add 3: compare 3<=2 false -> hi push 3, hi_size=2. Rebalance: while hi_size>lo_size: prune hi? hi has 2 (delayed),3. prune top 2: pop delayed-- -> hi has 3, delayed0. Move hi top 3 to lo: lo_size=1, hi_size=1. Physical: lo [2,3? wait move from hi to lo push -3, lo already has physical 2 valid]. So lo has [2,3] with lo_size=1? It has two physical but logical? We moved hi top to lo; but low_size was 0, after move low_size=1. But physical lo contains valid old 2 and moved 3. That's two valid, but lo_size=1. That is bad. Then hi empty. median with even? Need sizes low=1 high=1 but high physically has moved 3? Wait when moving: standard move high top to low: x=hi.pop(); heappush(lo,-x); hi_size--; lo_size++. If physical lo had valid old 2, now has old 2 and 3, size logical 1, invalid? Then median? findMedian: prune low? low top maybe 3. It may pop 3? delayed none. lo top 3 valid but size 1. high empty. But window should [2,3], median 2.5; need high 3. Algorithm broken. But did standard rebalancing conditions include while lo_size > hi_size not hi_size > lo_size? Yes after remove/add hi_size=2 lo_size=0 => hi>lo move one. But the physical low contained a valid element though lo_size=0 because removal decremented low though physically removed high. This suggests the simple comparison can break with equal duplicates if remove high but low_size adjusted. Yet perhaps due to ordering of insert and remove in sliding median (remove old before add) and equal duplicates? Is LeetCode using compare `if (num <= lo.top()) lo_size--; else hi_size--;` and accepted? Maybe there's subtle: if duplicates equal top and remove, any choice of side works because logical partition can be reinterpreted. But my physical sizes got inconsistent because logical low_size didn't correspond to physical valid count after moving? Let's examine logical interpretation: If remove high's 2 but we count it as removing low's 2, then we conceptually keep low's 2 and remove high's 2. The element low's 2 becomes delayed (invalid physical) while high's 2 remains valid? We then add 3 to high. Window logical: low valid: high's 2? high valid: 3? low_size? We decremented low_size to 0, hi_size=1, then add to hi_size=2. Then rebalance hi_size>lo_size move top from hi to low. But hi has physical valid 2? Wait if we conceptually removed high's 2, physical high still has 2 valid? We need physical high's valid count hi_size? Let's reinterpret: Initially physical lo valid old_lo2, physical hi valid old_hi2. Remove operation delayed[2]=1 and lo_size--. Which valid is marked invalid? Since delayed keyed by 2, could be low's 2. Then physical low valid count becomes 0 (old lo2 invalid), high valid count hi_size=1 (old hi2 valid). Add 3 to hi: hi physical 2 valid, 3 valid hi_size=2. Rebalance: move high top 2 to low. But high top 2 is old_hi2 valid. Moving to low makes low_size=1 (old_hi2), high_size=1 (3). Physical: low contains invalid old_lo2 and valid moved old_hi2; high contains valid 3. lo_size=1, physical valid low=1. OK! My earlier move popped hi top 3? No, I erroneously pruned hi top 2 due delayed? But delayed[2]=1. If we conceptually remove low's 2, delayed[2]=1, and prune will pop a 2 from any heap top. In rebalance before move, if we call prune(hi), hi top=2, delayed>0, it will pop hi's 2 even though we intended it valid. Then bad. Standard `prune` doesn't know which heap. If delayed top exists in hi, it deletes it. In this case delayed[2] should apply to low, but because top invalid in high (due equal) it may prune high's valid one. Does standard solution call prune before moving? Yes. This can fail? But maybe when sizes say lo_size=0 hi_size=2, and low has invalid top too. `prune(lo)` before `prune(hi)`? Let's simulate standard find_median/rebalance maybe they don't prune hi unless moving? Known functions:
```
rebalance():
 if lo_size > hi_size: move top from lo to hi
 elif hi_size > lo_size: move top from hi to lo
Then prune both? 
```
Or median first prune both. Need inspect accepted solutions. There is another approach with `low_size` and `high_size` representing total physical sizes including invalid? Hmm.

Need robust implementation. Let's seek alternative: two heaps with exact valid counts by tracking side using object identity or heap membership? Because floats can duplicate. Could use unique IDs and store (value,id) in heaps. Then removal can know which side by storing side map? For sliding window, when removing old element, we know its ID (index) and can know which heap it's currently in by a dictionary `location`? But elements can move during rebalancing. We can move valid elements and update location. Then lazy deletion can mark invalid by ID; top validity checks by ID. Sizes actual valid counts can be maintained correctly. That may be robust. Need efficient.

Use two heaps of (value, id) but max heap store (-value, id). Need store mapping from id to heap membership? If we move top from low to high during rebalancing, only one element moved, update loc. For lazy deletion, old element may not be top; we can mark deleted. But to know old element side to decrement valid size, we need know its current side. We can store `in_low` or `location` dictionary for active window ids. However when element is marked delayed but not yet popped from heap, it is no longer active but may still be physically in a heap. When moving top, if top is invalid, skip (don't move active). When moving valid top, update location. For removal, look up location[id] to decrement size and mark deleted/location maybe deleted. That solves duplicate ambiguity.

Algorithm:
- Each number in window has id (e.g. index i). Heaps contain entries (value, id) but low uses (-value, id). We maintain `loc` dict for active elements: id -> 0 for low, 1 for high? Or maybe also deleted? For removal of old index i, it should be active (unless window size? yes). Get side = loc.pop(i). low_count -= 1 if side==0 else high_count -= 1. Mark `deleted.add(i)` or set loc to None? But we need prune top if deleted id. Could use `deleted` set or dict. Since each id removed once, set okay. But if top invalid id, pop heap; since deleted set. No need delayed value counts. Good.
- Insert new id: Need decide side based on current valid boundaries. Before comparing, prune tops (pop invalid) to ensure top valid (if counts >0). If low_count ==0: push to low; loc[id]=0; low_count++. Else if value <= -low[0][0]: low. Else high. After insert, rebalance.
- Rebalance: Need while low_count > high_count + 1? For median: low_count >= high_count and low_count <= high_count +1. Since total k, if k even low_count=high_count, if odd low_count=high_count+1. We can enforce:
```
while low_count > high_count + 1:
  prune_low(); x,id=heappop(low); loc[id]=1; heappush(high,(x,id)); low_count--; high_count++
while high_count > low_count:
  prune_high(); x,id=heappop(high); loc[id]=0; heappush(low,(-x,id)); high_count--; low_count++
```
Need ensure prune before top valid; if top invalid, pop and continue until valid. We do not count invalid. When moving, element active so loc update.
- Median: Need prune low/high before reading top if counts >0. For even: -low[0][0] + high[0][0] /2. For odd: -low[0][0].
- Initialization: Could add first k with insert/rebalance after each insert. Simpler. O(k log k). Then for i from 0 to n-k: output median; if i == n-k break; remove index i, add index i+k.

Need ensure heaps contain invalid entries and may grow; but n up to 200k, heaps max O(n) due lazy; fine. Need loc dict size k active plus maybe not for invalid. Use sets for deleted. But if use loc dict and pop on removal, for invalid top we need know id deleted. Could have `removed_ids = set()` and check id in set. But if id removed, not in loc. We can check `if id in removed_set`. After popped from heap, can discard id from removed_set? Since id will appear only once in each heap? Wait element can move between heaps, so there is exactly one physical heap entry per active/deleted element? We move by popping from one and pushing to other, so one physical entry total for an element. If it is removed (lazy) before moved, it may be in one heap. If later moved? We only move valid top: top id not in removed_set. So invalid entries never moved. Good. So id appears once physically. After popping invalid, can remove from removed_set to keep set small. However, if id removed and not in loc, but physical entry remains, removed_set contains id. When invalid popped, `removed_set.remove(id)`. Need handle if id already not in removed_set? We'll only pop top and if id in removed_set, discard. But top could be active with loc set; if loc has id but id in removed_set? No.

Potential issue: when removing id that was previously invalid? All removals occur for active elements. If an element is invalid but not yet popped, then removed_set has it, loc doesn't. But window contains only active k; we remove each element exactly when it leaves window, before or after it could have been invalid? It becomes invalid only when we remove it. So no double removal. OK.

Memory: removed_set may hold up to number of invalid entries not yet popped, can be O(n) worst if many invalid buried? In lazy heap, invalid elements can accumulate below top and not popped until they become top; removed_set holds all pending deletions. Up to O(n) ~200k okay. But checking id in removed_set for prune top. `set` okay. Alternatively dict side. Could use loc with side or deleted marker. For removal, need know active side. Use `side = {id: 0/1}`. On removal, `side = loc.pop(i)`; if side==0 low_count--; else high_count--; loc[i]=2? But then id no longer active. For prune, check if id not in loc? But active elements have loc; invalid popped entries not in loc. However if id active and loc present. So we can do if id not in loc: pop invalid. But if id removed from loc, yes. But what about id that has moved and loc updated? fine. For invalid top, id not in loc. But after pop, no need removed_set. Need be careful: if id removed but loc missing; if there are duplicate entries due moving? Moving removes old and pushes new, so no duplicates except perhaps if invalid entries not moved. Could there be duplicate physical entries for same id because when top invalid and we move? We never move invalid. But what if we push new entry for active element when moving while old entry still exists? We pop old entry first. So no duplicate active. For deleted id, only one entry. So using `id not in loc` is enough to detect deleted top. But when loc has active ids and we compare top, if top id active. Good. Need ensure loc only active. On removal: loc.pop(i). So top id not in loc means deleted. Great. This avoids delayed dict and set. However if id was never inserted? no.

But one subtlety: Python heap entries contain value/id. If id is removed, we do not change its heap entry. It remains. If later active element with same value but different id top, loc contains id. OK.

Need rebalancing with counts. But moving top from low to high: Need prune_low first. But `prune_low()` pops while top id not in loc. After prune, if low_count>0 top valid. But what if low_count>0 but top invalid and all valid low are buried below invalid? prune will pop invalid until top valid or heap empty. If low_count>0 but heap top active? OK. If heap top invalid and buried valid? heap ordering ensures after popping invalid, next might invalid/valid. Eventually top valid if count>0. Good.

Insert decision with `low_count == 0` else `value <= -low[0][0]`. Need prune_low before compare to ensure top valid. If low_count==0 no low top. Also if high_count maybe? For even/odd. If low empty but high nonempty? In invariant, if total >0 low_count>=1? With rebalance high_count > low_count, move to low. So low empty only total zero. But during insert before rebalance after removing? If window k>0. remove may make low_count=0 high_count=k-1? Then add new; if low_count=0, add to low then rebalance moves high if needed. OK.

Need output median after first initialization and after each slide. Rebalance after remove before add? We can remove old, rebalance? Then add, rebalance. Standard: remove then add; maybe rebalance after remove to maintain? But if after remove total k-1, invariant low_count >= high_count? We can rebalance too, but not necessary before add. Could just add then rebalance with total k. However insert decision uses current low top after removal; if counts imbalanced? For k even, after remove from high, low_count could be > high_count? Example k=4 low=2 high=2; remove high => low=2 high=1; if insert large, compare to low top, may go low making low=3 high=1, then rebalance moves. OK. If insert small goes low low=3 high=1 then rebalance moves to high? final low=2 high=2? Actually total 4, low should 2 high 2. If low=3 high=1, while low>high+1 move one. OK. If remove low => low=1 high=2; insert large goes high => high=3 low=1; rebalance high>low move two? high>low (3>1) move one => high=2 low=2 OK. If insert small low=2 high=2. Works. Rebalance after add enough. But if low top invalid after removal, insert compare might need valid boundary. We'll call `prune_low()` before compare. If low_count>0. If low_count==0 due removal but high_count may >0, top invalid? compare not.

Need ensure median after initialization and after each add/rebalance. Also after remove but before add? For slide, if we output before remove, okay. At end no need.

Let's test mentally with duplicate case:
nums [2,2,3], k=2
Init:
add id0 2 -> low_count1 loc{0:0} low[-(2,0)]
add id1 2: prune low top id0 active, val2 <=2 -> low push id1 loc1 low_count2; rebalance low>high+1 -> prune low top? low heap top by -val,id? Python compares second if tie. Entries (-2,0),(-2,1); top (-2,0) (smaller id). move id0 to high: pop low -> loc0=1 push (2,0) high; low_count1 high_count1. low top id1 valid val2; high top id0 val2.
Output 2.
Slide remove id0: loc.pop(0)=1 -> high_count0. Add id2 3: prune low top id1 active val2. 3<=2 false -> high push id2 high_count1. Rebalance: high_count>low_count? 1>1 false. Median low id1 val2, high top? high has id2 val3 (id0 invalid removed? loc missing, not top if 2<3? high heap top (2,0) id0 not in loc, invalid). For even median we need prune high before output. find_median prunes high: top id0 invalid pop; top id2. median (2+3)/2=2.5. Good.

Tricky earlier [2,2] k=2 slide remove high id1 add 3. Suppose init with tie moved id0 to high, low id1? Actually above high id0. If remove id1 (low) remove loc0? Wait for [2,2] window indices 0,1, high maybe id0, low id1. Remove id0 high -> high_count0 low_count1. Add 3 high_count1. Rebalance no. Median prunes high top id0 invalid -> high top id1? high only id2. Good.
Remove id1 low -> low_count0 high_count1; Add 3 low_count1; Rebalance high>low move high top id0? high top id0 val2 active? yes; move to low, high id2. Physical low has invalid id1 val2 and moved id0 val2; low_count=1. high_count=1. Median prune low top: heap low has (-2,0),(-2,1). Top (-2,0) id0 active, valid. median (2+3)/2. Good. So side tracking works.

Need consider heap ordering with IDs when moving equal values: If moving from low to high, which duplicate moves? Any is fine because side tracking updates. Could median change? No values same.

Potential problem with `loc` using ints indices as dict keys and checking membership in prune. We need loc contain active ids. In `prune_low`, we need to pop while heap and low[0][1] not in loc. But if id is not in loc due removed, pop. If id is active but loc side maybe high? Could an active id have loc side high but still entry in low? No because moving updates loc and pushes new entry, pops old entry. If not active no loc. If somehow duplicate active entry due moving? no.

Need maintain low_count and high_count as number of active elements in each heap. When insert: increment. When remove: decrement. When move: decrement/increment. But if we pop invalid in prune, counts unchanged. If heap empty but count>0 bug.

Need output float: for even: (low_val + high_val)/2.0. If values are floats, return floats always. For odd, cast float? nums list[float] maybe ints. Return float. Use `float(low_val)` or `/2` produces float in Python 3 but if values float already. For consistency: `return float(-low[0][0])`. If k=1 median value.

ValueError conditions. If len(nums)==0 and k=0? k<1 raise. if k>len(nums) raise. If len nums < k but len nums 0? yes.

Complexity O(n log n) because heap size grows due invalid entries to O(n). Heap operations O(log heap_size) up to log n, still okay. Each index inserted once, moved maybe multiple times? An active element can move many times? In rebalancing, each slide at most a few moves. But total moves O(n). Invalid entries popped once. Heap size up to O(n), each push/pop O(log n) ~18. With n=200k, fine. However active element can move multiple times causing pushes/pops. Standard rebalancing moves at most 1 per insertion? Let's see: After removing one and adding one total k. The size difference after add can be at most 2? Since before add after remove sizes could differ by at most? We don't rebalance after remove, difference maybe up to k-1? Wait if remove from high, low_count=high_count+? For k=1000 even low=high. Remove high -> low=high+1. Add high -> equal. Remove high -> low=high+1; add low -> low=high+2; rebalance one move. Remove low -> high=low+1; add low -> equal; add high -> high=low+2; rebalance one move. If not rebalance after remove, max difference after add 2. So at most one move per slide. Initialization moves O(k). So total heap pushes: initial k inserts + move up to n, plus invalid pops up to pushes. Good.

But initialization with insert/rebalance after each element could move O(k) times? Inserting sorted ascending: add to high, when high>low move to low? Actually for ascending and k building, moves every 2? O(k). fine.

Could optimize initialization by bulk building? Not necessary.

Potential edge case: When removing old index, what if it is not in loc? Could happen if the index was moved? loc contains active all indices in window. Yes. But in Python, if duplicate id? no. Need perhaps use `old_side = loc.pop(old_id)`; if not found bug. But okay.

Need be careful with heap tuple ordering: For low, entries `(-num, idx)`. For high, `(num, idx)`. `prune_low`: top = low[0]; idx = top[1]; if idx not in loc: heappop(low). Since idx ints; if active id equal? Good. For max heap using negative values, if values are floats and `float('-inf')`? Negative inf? If num = inf, -inf; heap ordering okay? For high inf. Median with inf? If two inf, (inf+inf)/2 inf; if inf and -inf? Could yield nan? Standard median of infinities maybe nan. Not specified. But with floats including nan? Hmm. If `nums` contains nan, comparisons weird. We probably ignore; standard heap algorithms assume total order. Could handle NaN? Not required. But if float('inf') negative? -inf. Python heap ordering with nan? NaN comparisons false may break. Not required.

Need verify `loc` membership for active ids after rebalance. When moving:
```
if low_count > high_count + 1:
    prune_low()
    val_neg, idx = heappop(low)
    loc[idx] = 1
    heappush(high, (val_neg? no need, but value positive = -val_neg, idx))
    low_count -=1; high_count +=1
```
Need store positive value. If entry is (-val, idx), value = -entry[0]. Use `heappush(high, (-val_neg, idx))`. Similarly move high to low: value positive entry[0]; push `(-value, idx)`.

When removing:
```
try:
    side = loc.pop(old)
except KeyError:
    # Should not happen, but if lazy entry? maybe no.
```
But maybe due to initialization? Let's test k=1. Init add to low low_count=1 high=0; output median. Slide remove old: loc pop side0 low_count=0. Add new: low_count0 -> low push. Rebalance none. Median. Heaps contain invalid old not pruned until top. If new smaller: old invalid maybe top? For low heap entries (-10,0), (-20,1)? top (-20,1) new if larger? Let's check max heap: value 20 -> -20 top (most negative) = max 20. If old 10 removed, new 5: low has (-10,0) invalid top, (-5,1) valid. low_count=1. Median calls prune_low: top id0 not in loc -> pop; top id1. Good. Insert compare after remove: low_count=0 before add, so no issue. If add new before remove? We remove first.

Potential problem: `prune_low` before insert when low_count>0 but low heap top invalid. It will pop invalid. But what if invalid top belongs to a value that should have been in high side? Doesn't matter. `low_count` active count not changed.

Need ensure median function prunes before reading both tops. It may pop invalid entries from top and thus heap becomes empty even if count>0? If count>0, there must be active entries somewhere. But because heap top might be invalid and active entries lower, after popping all invalid, active top appears. Could heap empty while count>0? No. Unless loc missing active due bug.

Let's test with random brute force mentally or maybe derive. Could we use `loc` dict membership in `prune_high`: top idx not in loc. But active id in high loc=1; active low loc=0. Good. But if id was active but not yet in loc? Insert sets loc before? In insert, we push and loc set, count inc. Fine.

Performance considerations:
- Python dict membership for prune. Heaps store tuples of (float, int). Could use list of tuples. For speed, assign local functions.
- loc dict with int keys. Use `loc = {}`.
- `in loc` each prune; if many invalid top, total pops O(pushes).
- Use `heappush`, `heappop` local.

Alternative Fenwick simpler? Heaps with ID robust and likely faster due C heap. Need maybe less operations. Let's benchmark mentally: each slide remove dict pop, add push, rebalance maybe move one pop+push, prune maybe pops invalid. Each heap op O(log n) C but tuple compare Python. n=200k, maybe <1s.

Need be careful about heap top tie and moving: when moving equal values, choose one. Good.

Could further optimize by using `array`? no.

Now let's consider potential issue with using `not loc` vs `low_count == 0` in insert. If low_count >0 but `low` heap top invalid and active entries lower, prune. If after prune low heap empty but low_count>0? That shouldn't happen. But if low_count==0, no valid low, insert to low. What if total before insert >0 but low_count==0 and high_count>0? This can occur after removal (remove low from k=2? low_count0 high_count1). We choose to insert new to low, then rebalance may move high to low. Is that correct for median partition? Example k=2 window [10,20], low 20 high 10? Let's track invariant: For even, low_count=high_count, and max low <= min high? Need ensure. With [10,20] maybe low 20, high10 violates? Insert order could produce? Let's test init [10,20] k=2:
add10 low [10] low_count1. add20 compare 20<=10 false -> high [20] high_count1. rebalance? high_count>low? equal. Now low max10, high min20, OK. Median15. Slide remove 10 (low) => low_count0 high_count1 (20). Add new 5: low_count0 -> low [5] low_count1. Rebalance high_count>low_count? 1>1 no. But partition should low [5] high [20], OK. Add new 25: low [5], high [20,25]? compare 25<=5 false high, rebalance high_count=2 low=1 => move high top20 to low => low [20,5], high [25]. median22.5 window [20,25] correct. What if remove high instead: window [10,20] remove 20 high, low_count1 high0, add 5 low_count2, rebalance low>high+1 move low top20 to high => low5 high20 median12.5 correct. OK.

Invariant max(low)<=min(high) after operations with compare to low top. But if low_count=0 high_count>0, we insert to low regardless, then if high_count>low_count move smallest high to low. This may maintain. Need prove. Suppose low_count=0, high_count=m>0. Insert x to low. If x large > all high? Then low max=x, high min<=x, partition OK? Since low size1 high m maybe total m+1? But total before insert =k-1, after k. If m may be >1. Rebalance while high_count > low_count: move high min to low. After moving some, low has elements smaller than high? Suppose x large, high [1,2], insert x=100 low_count1 high2. high_count>low_count (2>1) move high top1 to low -> low max100? low heap [100,1] max100, high min2, violates 100 >2. But can this situation occur with actual values and invariant before insert? If low_count=0 before insert, high contains active elements from window that previously satisfied partition with low empty? That means previous window size odd? For k? Let's check: low_count=0 high_count=k-1 before adding when total k-1. But invariant for window of size k-1? We don't rebalance after removal maybe. If previous total was k and invariant low ~ half. After removal, if remove low, low_count could be high_count-1? For k=3? Let's examine. Could low_count=0 high_count>1 occur? If k=3 even? k=3 total after remove 2. Starting k=3: low_count=2 high=1. Remove low => low1 high1. Remove? only one removal. If k=4: start low2 high2. Remove low => low1 high2, not 0. For low_count=0 high_count>1 after one removal from balanced partition? Start low=ceil(k/2), high=floor(k/2). Remove low => low=ceil(k/2)-1. For k=2 low1 high1 -> low0 high1. For k=3 low2 high1 -> low1 high1. For k=4 low2 high2 -> low1 high2. So only k=2 can low0 high1. No high_count>1. Good if rebalance maintained half. Initialization also. So fine.

But after initialization maybe for k=1 low0? no. So no low0 high>1.

What if we remove after not rebalancing? We always rebalance after add, so before remove invariant holds. OK.

Need maintain max(low)<=min(high) even with lazy invalid. Prune ensures active top valid. But physical heaps may contain invalid entries with values violating partition? They don't affect median/prune. However insert compare uses low top valid. Good.

Let's test scenario where invalid entry in low has larger value than valid high top; when moving from high to low, high top valid; low invalid not issue. When moving from low to high, prune low removes invalid top if any. Good.

Potential issue with `loc.pop(idx)` for old index that is not in loc because it was invalid? Could an index be invalid (not in loc) while still in current window? No. But what if same id appears twice due to moving? We pop and push; loc updated. No duplicate. But heap might contain an old stale entry for same id from a previous move? We popped old entry when moving. Unless moving invalid? We don't move invalid. OK.

Need think about initial insertion and rebalancing: Suppose k=2, insert 20 then 10. add20 low low_count1. add10 compare 10<=20 low_count2; rebalance move low top 20 to high. low max10 high min20 OK.

Now median for even: Need low_count == high_count? Rebalance after insert enforces low_count >= high_count and low_count <= high_count+1. For total k even, if low_count and high_count difference cannot be other: if total even, low=high or low=high+? low>high+1 no; high>low no; so equal. For odd low=high+1.

Need ensure after removing old and adding new, total k, rebalance. But remove could break partition? Not until after add? We add using current low top. If remove high and low top maybe larger than some high values? Partition of active elements after removal still valid (subset of partition). Add based on low top. If insert value <= low top -> low else high. This maintains order except when equal boundary duplicates? If value <= max low goes low, if > max low goes high. If high has invalid with smaller values, high active min >= low max before; if value > low max, goes high. OK. If low_count=0, insert to low. As above.

But what about remove low and high active min maybe less than low max? Before removal partition active low<=high. Removing low can't violate. OK.

Now performance of ID heaps vs delayed value. We need ensure we can use int index as id, but if nums has duplicate values no problem. Use original indices for sliding; loc maps index -> side. For initialization, use enumerate nums[:k]. For slide, old=i, new=i+k. Good.

Need produce only code block. Could include imports. Use `import heapq` and `from typing import List`? no need. Python 3.11+; list[float]. Code:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    low = []  # max heap entries: (-value, index)
    high = [] # min heap entries: (value, index)
    loc = {} # index -> 0 low, 1 high
    low_count = 0
    high_count = 0
    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_low():
        while low and low[0][1] not in loc:
            heappop(low)
    def prune_high():
        while high and high[0][1] not in loc:
            heappop(high)

    def rebalance():
        nonlocal low_count, high_count # if nested, but modifying counts. Could not use nonlocal if define inside function? Yes counts in enclosing function, rebalance inside. Need nonlocal low_count high_count.
        while low_count > high_count + 1:
            prune_low()
            neg_val, idx = heappop(low)
            loc[idx] = 1
            heappush(high, (-neg_val, idx))
            low_count -= 1
            high_count += 1
        while high_count > low_count:
            prune_high()
            val, idx = heappop(high)
            loc[idx] = 0
            heappush(low, (-val, idx))
            high_count -= 1
            low_count += 1
```
But using nonlocal and inner functions might add overhead. For speed, maybe avoid nested rebalance? Could inline loops. But n=200k, inner function overhead per slide maybe OK but can optimize by not using functions? Need performance. Could define helper functions but call each slide: remove, add, rebalance. Function call overhead 200k* few maybe okay but we want under 2 sec. Could inline inside loop for speed. But code readability. Maybe use local helper functions with nonlocal; overhead maybe moderate. 200k* (prune functions maybe call multiple). Could be okay. Need ensure no UnboundLocal.

Alternatively implement as closure with lists/integer mutable? Could use low_count/high_count as list [0,0] to avoid nonlocal? nonlocal fine. Function call overhead: `rebalance` called n times, prune calls maybe. 200k function calls fine (<0.1s?). Python function call ~100 ns? Actually ~80 ns? maybe 0.02? More like 0.2 micro? 200k negligible. But inner `prune_low` called many times; can inline while in rebalance. Median maybe function call. OK.

But nonlocal in rebalance: Python 3.11 fine.

Potential problem with `low[0][1] not in loc`: if loc is dict of active IDs. If id removed and not loc, but id could be in high entry not in loc? yes. `not in loc` true. Good.

Need if we use `loc.pop(old_index)` after old_index may have loc side. If we output initial median then slide. For `remove` maybe old_index not in loc if it was moved? loc updated. OK. But if `loc.pop(old)` returns side. Could use `side = loc.pop(old)`.

Let's write initialization:
```
    for i, value in enumerate(nums[:k]):
        if low_count == 0 or value <= -low[0][0]:
            heappush(low, (-value, i))
            loc[i] = 0
            low_count += 1
        else:
            heappush(high, (value, i))
            loc[i] = 1
            high_count += 1
        # prune? top invalid none during init
        while low_count > high_count + 1:
            prune_low() # no invalid
            neg, idx=heappop(low)
            loc[idx]=1
            heappush(high, (-neg, idx))
            low_count-=1; high_count+=1
        while high_count > low_count:
            prune_high()
            val, idx=heappop(high)
            loc[idx]=0
            heappush(low, (-val, idx))
            high_count-=1; low_count+=1
```
Need if low_count == 0 but `low[0]` invalid? no. But if low_count > 0, `low[0][1] not in loc` not possible during init. OK.

But after moving, we set loc idx. However if idx not in loc? move top valid so yes. Need update loc for moved element to new side. The entry is removed from old heap, but `loc` had side old. Set new side.

After init median. Define `get_median()` or inline.
```
    res=[]
    # initial median
    prune_low(); prune_high()
    if k %2:
       res.append(float(-low[0][0]))
    else:
       res.append((float(-low[0][0]) + float(high[0][0]))/2)
```
For k=1 high empty. OK.

Loop:
```
    for i in range(n - k):
       old = i
       side = loc.pop(old)
       if side ==0: low_count -=1
       else: high_count -=1
       # optional if loc missing? no
       j = i + k
       value = nums[j]
       if low_count ==0 or value <= -low[0][0]:
           heappush(low, (-value, j)); loc[j]=0; low_count+=1
       else:
           heappush(high, (value, j)); loc[j]=1; high_count+=1
       # rebalance
       while low_count > high_count +1: ...
       while high_count > low_count: ...
       prune_low(); prune_high()
       if k&1: ... else ...
```
Need before insert compare if low_count >0. But `low[0][0]` could be invalid if low top invalid and low_count>0? Invariant: low_count counts valid elements in low. There might be invalid top. Need prune_low before comparing. If after prune low_count==0? Could active low elements be buried below invalid? prune will pop until valid. If no active top but low_count>0, after pruning all invalid heap may become valid top. If low_count==0, heap may contain invalid entries, top invalid; prune_low will remove invalid top(s) until heap empty. But calling prune_low if low_count==0 to remove invalid top? Not necessary but good? Could clean. But in insertion compare, if low_count==0, we don't look. But after previous median prune likely top valid. However after removing low, low_count may be 0 but low heap has invalid top. Insert new into low; low_count becomes 1. Then rebalance or median prune will remove old invalid if top invalid. Good.

But what if low_count>0 and `low[0]` invalid; comparing value to invalid top could route incorrectly. Need call `prune_low()` before compare. This may pop invalid low entries. If after prune low_count >0 but low empty? shouldn't. Use:
```
if low_count > 0:
    prune_low()
    if low_count == 0: # should not, but maybe if heap corruption? use low
       push low
    elif value <= -low[0][0]: ...
else push low
```
But calling prune_low when low_count==0 might remove invalid heap top but not necessary. Could be beneficial to prevent heap growing? invalid removed anyway when top. Could call always before compare:
```
prune_low()
if not loc or low_count == 0: # if no active low
```
But if low_count==0 and low heap contains invalid entries, `low[0][1] not in loc` prune until empty. Then compare not. OK. But if high_count >0 and low_count==0 (only k=2 after remove low), insert new to low. Fine. But what if low_count==0 and high_count==0? initial? no.

After add, rebalance. During rebalance move high to low; before moving, prune_high. If high_count>0 but high top invalid, prune. OK. But if high top valid but high_count > low_count and low_count maybe 0, move. OK.

Need median after rebalance: `prune_low(); prune_high()`. For even, ensure low_count and high_count equal and both >0? k>=2 for even, so yes. For odd low_count >=1.

Could there be high empty for even due bug? If k even and total k, invariant equal. If high empty and low_count=k, low_count>high+1 triggers rebalance until high nonzero. OK.

Need consider side tracking when moving element: If we move element to high but its value maybe > high top? heappush OK. loc update. If later removal of that element, loc tells high.

Let's test with simple brute mentally using random. Need perhaps use `loc` membership to identify invalid, but when loc updated on move, if there is an old heap entry for same id not popped? We pop in same rebalance loop. But what if we move an element, then later rebalance moves it back. There is exactly one entry. Good.

Potential issue with dictionary loc used for active side but if an element is removed (loc.pop), and later top id not in loc => invalid. But after we pop invalid entry, if the same id appears in the other heap due to duplicate physical entry bug, it might be popped later. But no duplicate. Let's prove moving: In rebalance, `heappop(old_heap)` removes one entry for idx. If the same idx also had stale entry in old_heap from previous move? It shouldn't because previous move popped. But could it have stale entry in old_heap that was not top when moved? When an element moves from low to high, we pop it from low and push to high. If later it moves back high to low, we pop from high and push to low. At all times exactly one entry in current heap. No duplicates. Invalid element never moved, so one entry. OK.

Potential bug: In `rebalance`, when moving low->high, if low top is invalid, `prune_low` pops it. But if low_count> high+1, low_count active counts; prune_low doesn't change counts. If all low entries invalid and low_count>0, prune_low pops until active top. Good. If heap empty while low_count>0, heappop will error. Could assert but no. Maybe due to `loc` not containing active ids? no.

Need think about using value compare with low top when low top active. If low top is active but high contains invalid entry with smaller value than high active? Invalid not relevant. OK.

Let's run some manual tricky sequences.

k=3, nums [1,2,3]. Init:
1 low c1
2 high c1 rebal? high>low? 1>1 no. But low_count=1 high=1 total2; for k building not final.
3: compare to low top1 -> high c2; rebalance high>low (2>1): move high top2 to low. low has 2,1; high 3; counts2,1. median2.
Slide remove 1 (low) -> low1 high1; add4: low_count1, prune low top? low max2. 4<=2 false high c2. Rebalance high>low (2>1) move high top3 to low -> low max3 (2,3), high4; counts2,1. median3 correct.
If add0: remove1 low -> low1 (2) high1 (3). add0 <=2 -> low c2 high1. Rebalance low>high+1? 2>2 no. Partition low max2, high min3 OK. median2. Window [2,3,0] sorted 0,2,3 median2. OK.

k=4, [1,2,3,4]. Init should low max2 high min3. Insertion sequence:
1 low1
2 high1
3 low (3<=1 false high c2 rebal high>low -> move2 low; low max2? low has2,1; high3)
4 compare 4<=2 false high c2; rebalance no. median2.5.
Slide remove1 low -> low1 high2; add5 high c3; rebal high>low (3>1): move high top3 low -> low2 high2; rebal? low_count2 high2. partition low max5? low has2,3,1? Wait removed 1 invalid? Physical low: after removal, low has 1 invalid,2 valid? Actually initial low entries: value2 idx1? value1 idx0? remove idx0 low_count1. low heap top (-2) valid. high entries 3,4. add5 high. high_count3 low1. Move high top3 to low: low has invalid1, valid2,3; low_count2. high 4,5. But partition max low=3 <= min high=4. Median (3+4)/2=3.5 window [2,3,4,5]. Good. Invalid 1 later pruned if top? low top is -3 not -1, no.

Now if high top invalid? Remove high, add small. k=4 [1,2,3,4], remove idx2? Actually slide removes 1 low. To remove high? In sliding remove first low maybe because 1 in low. Later maybe high. Let's sequence [3,4,2,1] init? Need not.

Need consider values negative: low entry -value. If value negative, -value positive. Max heap works. Median float.

What about int vs float: `float(-low[0][0])`. If low[0][0] is int negative, - int; float. Good.

Potential performance of `not in loc` where loc is dict of active IDs. If loc size k=1000, membership O(1). Heaps may contain O(n). But heap top often invalid? prune pops total O(pushes). Good.

But there's one subtle bug: When we remove old element, we pop it from loc. But if that old element is currently invalid (shouldn't) loc missing and `loc.pop(old)` returns None and decrements neither? Could crash or wrong. Could this happen if the old element was moved lazily? No. But maybe we remove an element that was already invalid due to being removed from window in a previous slide? We remove each index once; if it's invalid it means it was removed earlier. Not possible. Good.

Need maybe ensure `loc.pop(old, None)`? If bug, side None; but we can assume. For safety, if `side is None`: pass? But then counts wrong. Not needed.

Now compare to Fenwick. Heaps with loc ID robust. Let's think if `loc` membership for invalid detection fails when ID is removed but there is an active ID with same integer? IDs unique by index. Good.

Potential issue: Python heap with tuple (-value, idx). For floats `NaN`, tuple ordering might compare idx if value NaN equal? Comparisons with NaN: In tuple comparison, it first compares values: `NaN < NaN` false and `NaN > NaN` false? Python tuple comparison uses `==` first? It checks if first elements equal: `NaN == NaN` false, so proceeds to compare idx. So NaN entries ordered by idx? It may break heap invariants because value NaN not comparable consistently? But not required.

Could there be issue if values are huge and `-value` overflows? float inf? Negating inf yields inf. OK.

Need maybe use `k & 1` for odd. For even average: `(low_val + high_val) / 2.0`. Use local variables. Could avoid float conversion for average? If low_val/high_val are floats/ints. `(a+b)/2` returns float. For odd, `float(a)`. For even, if a+b overflow? no. Could do `(a + b) * 0.5`. OK.

Let's refine code for performance with nested functions and nonlocal. Maybe write as one function.

```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    loc = {}
    low_count = 0
    high_count = 0
    push = heapq.heappush
    pop = heapq.heappop

    def prune_low():
        while low and low[0][1] not in loc:
            pop(low)

    def prune_high():
        while high and high[0][1] not in loc:
            pop(high)

    def add(idx, value):
        nonlocal low_count, high_count
        if low_count:
            prune_low()
            # if after prune low_count still 0? low_count not changed; could be inconsistent. But use loc membership?
            if value <= -low[0][0]:
                push(low, (-value, idx))
                loc[idx] = 0
                low_count += 1
            else:
                push(high, (value, idx))
                loc[idx] = 1
                high_count += 1
        else:
            push(low, (-value, idx))
            loc[idx] = 0
            low_count += 1
        # rebalance inline maybe in add
        while low_count > high_count + 1:
            prune_low()
            neg_val, idx2 = pop(low)
            loc[idx2] = 1
            push(high, (-neg_val, idx2))
            low_count -= 1
            high_count += 1
        while high_count > low_count:
            prune_high()
            val, idx2 = pop(high)
            loc[idx2] = 0
            push(low, (-val, idx2))
            high_count -= 1
            low_count += 1
```

`nonlocal low_count, high_count` inside add. In loops assigning. Fine. But `idx2` may shadow? OK. Need in move low->high after prune_low, if low empty? no. But if low_count>high+1 and prune_low pops invalid entries, low_count remains >; eventually top valid. If heap empty due all invalid but low_count>0 impossible. But to be safe, if not low: break? Not needed.

However, if `low_count` >0 but `prune_low` makes `low` empty due all entries invalid but low_count not updated, then `low[0]` error in compare. Could happen if low_count variable out of sync. To be robust, we can derive low_count from loc? No. We can assert. But not needed.

Maybe avoid inner `add` function overhead for n by inlining? Let's consider final code readability vs performance. Could define `add` called n times (200k). Function call overhead maybe okay. But rebalance inside add loops. `prune_low` called inside add before insert, plus rebalance. That's many function calls (maybe 3*200k=600k). Still OK. For 2 sec, 600k Python function calls might be ~0.1-0.2 sec? Actually Python function call ~80 ns? No, ~100 ns is C? Python function call ~100-200 ns? Let's recall: 10 million function calls maybe ~0.7s? 600k trivial. Could be ~0.1s. Fine.

But `add` uses `idx` param and then reuses `idx2`; okay.

Need `remove` maybe inline. Could define:
```
    def remove(idx):
        nonlocal low_count, high_count
        side = loc.pop(idx)
        if side == 0: low_count -= 1
        else: high_count -= 1
```
Function call n times. Fine. But if loc.pop missing error. OK.

Then main:
```
    for i in range(k): add(i, nums[i])
    res = []
    def median():
       prune_low(); prune_high()
       if k & 1:
          return float(-low[0][0])
       return (-low[0][0] + high[0][0]) / 2.0
    res.append(median())
    for i in range(n-k):
       remove(i)
       add(i+k, nums[i+k])
       res.append(median())
    return res
```
This is clear. But `median` function called n times? Actually n-k+1 ~200k. Another 200k calls. Fine. But for speed can inline. I think acceptable. Need avoid recursion.

Let's test initialization with add rebalancing after each element: For k maybe large, after each add total <k, invariant enforced for total current: low_size >= high_size and low <= high+1. This is fine. For current odd, low=high+1; even equal. But when final k not reached, if k even and current total odd, low=high+1, OK. At final, after k adds, if k even, total even invariant equal. If k odd, low=high+1. OK.

Potential issue: In `add`, after moving, if we push to high, there might be an invalid entry with idx already? no. But when moving an active element from low to high, we set loc[idx]=1. However that idx might have stale invalid entry in high? It shouldn't because active not in high. But what if element moved previously and stale entry? no.

Let's test with duplicate equal and ID side tracking using random conceptual. Should be fine.

Need consider if loc membership for prune can misidentify an active element as invalid after its loc side changed? loc contains ID, regardless side. So active top in low has loc entry; in high loc entry. OK.

Now, maybe a simpler Fenwick is more obviously correct but less performant? Let's compare. Heaps with IDs is less standard but robust. Need ensure no hidden flaw due to using loc membership to detect invalid: When element is moved from low to high, we pop low entry and push high entry. But there might be another copy of same id in low that was invalid from earlier? Could an active element have an invalid duplicate? Suppose element removed (loc popped) but not popped from heap. Later before it becomes top, could we create a new active element with same index? no. So no duplicate for same id. If element active, no removed copy. Good.

Need think about side tracking with lazy invalid entries and rebalance moving only valid top. What if there is an invalid entry in low with value smaller than valid top, so not pruned. Fine. But when moving low->high, if low top valid, move it. Invalid lower entries remain. Could this violate `max low <= min high` because invalid entries not considered. Active max low valid is top. Good. When median prunes, if top invalid, pop. But if invalid lower entries with values larger than active top? In max heap, if invalid value larger, it would be top, so pruned. If invalid value smaller than active top, doesn't affect max. For high min heap, if invalid value smaller than active min, top invalid pruned; if larger, doesn't affect min. OK.

Need ensure high/low counts not become negative. Removal side from loc. OK.

Potential issue with `low_count > high_count + 1` after initialization for total=1? low1 high0 not >1; total2 low1 high1; total3 low2 high1. OK.

Now, let's consider memory of loc dict. When moving, loc updated. When removing, loc.pop. At any time loc size k. Good. Heaps may contain up to total inserted + moves? Actually active elements also move by push/pop, so total pushes = initial k + each rebalance move + each slide insert? Wait rebalance move uses heappush, but that's a new heap entry for existing element. The old entry popped. So each move counts one push and one pop. Slides add push for new element (k per slide? n inserts total). Invalid entries from removed elements remain until popped. Moves of active elements don't create stale entries because old entry popped. Thus heap sizes at most active + removed not yet popped. Removed entries are from elements removed but not yet popped. They don't include stale moved entries. Good. Total push operations: n insertions + number of moves (<= n+k). Pop operations: moves + invalid pops + maybe move pops. O(n). Good.

Need maybe use `heapq.heapify` for init? Could insert and rebalance; O(k log k). k=1000, trivial.

Let's think about possible integer overflow? no.

Let's maybe write code without inner functions for maximum speed, but still readable. Since user wants complete solution, code block. Could include comments? fine.

Potential hidden issue: Python's tuple comparison when values equal but negative zero. `-0.0` equals 0.0; low entry `(-value, idx)`. If value=-0.0? `-value` maybe 0.0. Tuple compare okay. If value `float('nan')` as noted not required. If value `Decimal`? list[float], no.

Let's compare to a Fenwick implementation maybe simpler to reason and no heap weirdness. But heaps likely pass. Need ensure output floats. If `nums` empty and k=0? k<1 raise. If `nums` length 0 and k > 0, k>n raise. If n=0, k maybe 0, raise. Good.

Now, I want to formally verify two heaps with ID lazy deletion.

Invariant:
- loc: active elements and their heap. low_count = number loc with side 0, high_count side 1.
- low heap contains exactly one entry for every active low and for every removed element not pruned that was in low at removal time (or removed elements not pruned); high similarly. No active element has entries in both heaps, because when moving we pop from old and push to new updating loc. For removed element, it may be in heap where loc had side; loc popped. Could a removed element later be moved? No, rebalance only moves top if active? We don't explicitly check loc when popping in move; we call prune first to remove invalid top, then pop top. But what if top after prune is invalid? prune loops until top active or heap empty. So move active. Good.
- For active elements, max value in low <= min value in high after pruning top? Need invariant: top valid if counts>0. Insert: if total active before maybe empty or partition holds. Choose side based on value relative to current max active low (after prune). If value <= max_low, push low, then rebalance by moving max_low to high if low too large; moving max_low preserves partition because moved value is >= all low after move? Wait moving max low to high: after removing max from low, new max low <= moved value; high's min was >= old max low; after adding moved value to high, high's min could be moved value or old high min, both >= new max low. So partition holds. If high too large, move min high to low: after removing min high, new high min >= moved value; old low max <= moved value; after adding to low, low max may be moved value, <= new high min. OK. With lazy invalid, top valid ensures active tops. Remove: deleting arbitrary active element preserves partition. Rebalance after add ensures. So median correct.

But in `add`, we do rebalance inside immediately after insert, not after remove. Before add, partition active set after removal holds because subset of valid partition. Good.

Now potential issue with initialization: We add one by one and rebalance, same invariant.

Need decide if remove old before add in slide. Could also add then remove? But ID side? If we remove before add, active window k-1 partition holds. Good. If k=1, after remove total 0, add. Rebalance while high>low? no.

Now let's consider if `loc.pop(idx)` for old element that was active but has loc side 0 or 1. But due to lazy invalid entries from previous removals, `low_count`/`high_count` counts active only. Good.

Could there be an active element not in loc because of moving bug? In move, loc update. In insert loc set. Remove only when leaving window. OK.

Potential problem: Using `idx` in move loops shadows add parameter? In nested add, `idx` is new element. In rebalance while loops, if we use `idx2` avoid conflict. Good.

Now, if using nested functions, `nonlocal` only in `add` and `remove`, not in `prune`. `median` doesn't modify counts. Good.

Let's write robust code:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    where = {}
    low_count = 0
    high_count = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_low():
        while low and low[0][1] not in where:
            heappop(low)

    def prune_high():
        while high and high[0][1] not in where:
            heappop(high)

    def add(index, value):
        nonlocal low_count, high_count
        if low_count:
            prune_low()
            if value <= -low[0][0]:
                heappush(low, (-value, index))
                where[index] = 0
                low_count += 1
            else:
                heappush(high, (value, index))
                where[index] = 1
                high_count += 1
        else:
            heappush(low, (-value, index))
            where[index] = 0
            low_count += 1

        while low_count > high_count + 1:
            prune_low()
            neg_val, old = heappop(low)
            where[old] = 1
            heappush(high, (-neg_val, old))
            low_count -= 1
            high_count += 1

        while high_count > low_count:
            prune_high()
            val, old = heappop(high)
            where[old] = 0
            heappush(low, (-val, old))
            high_count -= 1
            low_count += 1

    def remove(index):
        nonlocal low_count, high_count
        side = where.pop(index)
        if side == 0:
            low_count -= 1
        else:
            high_count -= 1

    def median():
        prune_low()
        prune_high()
        if k & 1:
            return float(-low[0][0])
        return (-low[0][0] + high[0][0]) / 2.0

    for i in range(k):
        add(i, nums[i])

    result = [median()]
    for i in range(n - k):
        remove(i)
        add(i + k, nums[i + k])
        result.append(median())
    return result
```

Need check if in `add`, `if low_count:` but if `low_count` >0 and `low` empty due invalid entries? `prune_low` after if; if low empty and low_count>0 impossible. But to be safe, maybe:
```
if low_count and (low or high):
  prune_low()
  if low and value <= -low[0][0]: ... else high? 
```
If low empty but low_count>0, pushing to high would worsen. But no.

Potential bug in `add`: after removing old element (remove before add), if low_count=0 but high_count>0 and low heap has invalid top. We push new to low without pruning low. Then rebalance may move high to low if needed. But new low might have invalid top (old) and valid new. In `add` rebalance while low_count > high+1 or high>low. It calls prune_high or prune_low. If high_count > low_count, prune_high. If not, median later prune_low. OK. But what if after pushing new to low, low_count=1 high_count=1, no rebalance. Partition? New low value could be > high min. Example k=2 [1,100], low max1 high min100. Remove low 1 => low_count0 high1. Add new 200 (low_count0 -> push low). low_count1 high1 no rebalance. Partition fails: low max200 high min100. Median would (200+100)/2=150 which is correct? Window [100,200], median 150. But invariant max low <= min high fails. Is that a problem? Let's see. For k=2 after removing low and adding a large new value to low, both heaps have one element but low has larger than high. The median average still correct because for k=2, median is average of the two elements independent of which heap they're in if sizes equal. But future operations? Need partition invariant for future insert/remove and rebalancing. Example next slide remove one element, maybe side tracking leads wrong median? Let's test.
Window [100,200], with low 200, high 100 (violates). Next median correct. Next add/remove to get [200,300]? Slide remove old 100 (high), low_count remains1 high0, add300: low_count1, prune_low top 200 valid, 300<=200 false -> high. low200 high300 partition OK. median250. Good. Next slide remove200 (low), add? Suppose next value 50? Window [300,50], after remove low high300 low0, add50 to low because low_count0 -> low50 high300 partition OK. median175. OK.
But can violation cause incorrect insert compare? If low max > high min, then `value <= -low[0][0]` uses low max too high, may send value that should go high to low, but rebalance by moving? Need find failure.
Scenario k=3? Let's find if low_count=0 high>0 and add to low can cause violation but maybe median correct and future rebalances fix. For k=3, after remove low from [small, small, high]? Starting k=3 invariant low2 high1. Remove low => low1 high1, not low0. So only k=2 can cause violation with low_count0. For k=2, partition not strictly needed? But could affect when moving due to rebalance? With total2, if sizes equal but inverted, rebalance won't move. So inversion can persist until remove one. Does any operation fail when sizes equal inverted? If we insert after removal? For k=2, remove from inverted: If remove from low (larger), low0 high1 (smaller); add new. If new small -> low, sizes equal partition ok. If new large -> low, inversion maybe persists. Median average correct. Remove from high (smaller), low1 high0 (larger); add new: low_count1, compare new <= low_max (larger). If new large > low_max? false -> high, partition ok. If new smaller -> low, sizes low2 high1? wait total after add 2, low2 high0, rebalance move low max to high -> partition ok. So maybe works.
But for general if partition violation with sizes equal, rebalance doesn't fix. Could arise beyond k=2? Let's see if low_count=0 high_count>0 only when previous total 1. For k>2, after one removal low_count not zero. So violation not. However could violation arise from moving? We proved rebalancing fixes if sizes differ. But if sizes equal and partition violated due to low_count=0 insertion, for k=2. Is there any other source? In `add`, if low_count >0 but `low` top invalid? We prune. If low_count=0, we always insert to low, possibly causing inversion for k=2. For k=1, after remove total0 add, sizes equal? high0. OK. For k=2 inversion possible. Is it problematic for median even? average independent if sizes equal and each heap has one element? Yes median formula low top + high top /2 regardless which is max/min? For two elements, average of tops correct if each heap has one valid element, even if inverted. But for future, as tested likely OK. But to maintain invariant fully, we could handle insertion when low_count==0 but high_count>0 differently: if high top exists, compare value to high top? For k=2 after low_count=0 high_count=1, active high has the only remaining element. We want after insertion low max <= high min. To ensure, if new value <= high_min, put it in low; if new value > high_min, we could put it in high then rebalance high>low move high min to low? That would result low gets smaller (old high min), high gets new large, partition correct. Or put new to low and if low max > high min, manually move larger? Simpler: after insertion and rebalancing, if low_count == high_count >0 and -low[0][0] > high[0][0], then swap/move? Could fix. But maybe not needed. For correctness invariant desired. Let's implement a fix to avoid violation.

How to fix general partition after rebalance? We can, after rebalancing sizes, if low and high nonempty and after prune low max > high min, then we need to swap tops or move? This can happen only sizes equal and inverted. We can swap the top elements between heaps. But with loc update. Or if low max > high min, move high min to low and low max to high? Since sizes equal, we can pop low max and high min, push cross. But maybe easier: when low_count == high_count and low top value > high top value, swap them:
```
prune_low(); prune_high()
if low and high and -low[0][0] > high[0][0]:
   neg_lo, idx_lo = heappop(low); val_hi, idx_hi = heappop(high)
   where[idx_lo] = 1; where[idx_hi] = 0
   heappush(low, (-val_hi, idx_hi)); heappush(high, (-neg_lo, idx_lo))
```
But this changes heaps and loc, counts unchanged. Would restore. But should be unnecessary if insertion logic correct. To be robust, include at end of rebalance? Need be careful not to create duplicates? We pop one from each, active. Counts unchanged. If there are invalid tops, prune first. Good. This can fix inversion in k=2 case.

Alternatively improve insertion when low_count == 0 but high_count >0: we can put new value into high then rebalance if high_count > low_count. Since after removal total k-1, if high_count=1 low=0, total 2. If insert to high high_count=2 low=0, rebalance high>low: prune_high, pop min high to low. Suppose old high=100, new=200. Insert to high: high has 100,200; move 100 to low => low100 high200 partition correct. If new=50, insert high -> high min50 moved to low, high100 -> correct. This seems better! In general if low_count==0 and high_count>0, inserting into high and rebalancing ensures partition. But if high_count maybe >1? In our invariants only high_count=1, but safe. If insert into high, after rebalance high_count > low_count, moves min to low. If value very small, min is new, low new, high old; OK. If value large, low old min, high new; OK. So we should change insertion rule when low_count==0: if high_count > 0: insert to high? But what if total active before insert =0? high_count=0; insert low. If low_count==0 and high_count>0, insert high to keep partition. But is it always correct? Suppose active set before insert all in high because low empty. This only occurs if total=0? For k=2 after remove low, active high one. Inserting to high and rebalancing fixes. For k=1 after remove, high=0. Good. But what about initialization? low_count initially0 high_count0 => low.

So modify `add`:
```
if low_count == 0 and high_count == 0: push low
elif low_count == 0: push high  # because all existing valid in high, rebalance will balance
elif value <= -low[0][0]: push low else high
```
Need ensure if high_count>0 but high top invalid? Before insert, after removal there may be invalid top in high. We need prune_high before maybe? If inserting to high and then rebalance, prune_high called before moving. Good. If high_count=1 but high top invalid? Can that happen? If active high element loc present; invalid top would be removed element with value smaller; active high exists. Inserting to high then rebalance high_count? high_count includes valid count only. If high top invalid, prune_high will pop invalid before moving. Good.

But what if low_count=0 high_count>0 and we insert to high, high_count becomes 2, low_count=0. Rebalance while high_count > low_count: moves one. This can loop if high_count large; but O(high_count) maybe large? Could it happen with high_count large? If invariant broken, maybe. But normally high_count <=1. But to be robust, if high_count large and low_count 0, inserting to high could cause many moves O(k) in one add. But this state shouldn't happen. Could instead if low_count==0 and high_count>0: move one high to low before inserting? Or insert high and rebalance. If high_count large, moving all? high_count>low_count loop moves until high<=low. If high_count=m, low after moving m? Let's see high=m, low=0, insert high -> high=m+1, loop moves ceil? condition high>low: each move high--, low++. Stops when high<=low, after ceil((m+1)/2) moves? Because high-low decreases by 2 per move. For m large, O(m) moves in one step; but this state not reached. If want robust O(log) per step, we could avoid state. But state low_count=0 high_count>1 only if invariant broken; not.

Alternative after remove, rebalance before add to ensure low_count >= high? For k=2 remove low -> low0 high1; if rebalance before add, would move high to low (low1 high0), then insert compare. That avoids low_count=0. Could rebalance after removal every slide. For window k-1, target sizes based on total k-1, not k. If k=2, total1: low1 high0. Move high to low. Then add. This adds a rebalance after removal; more operations but maybe robust. If total k-1 even/odd, maintain low=ceil(total/2), high=floor. Then after add and rebalance, OK. Does this avoid low0 high1. Yes. But rebalancing after removal could move elements unnecessarily, maybe additional O(n) but at most one move. Could be fine. Let's consider performance: each slide remove then rebalance to k-1 sizes, then add and rebalance. Could cause extra moves. Example k large: remove low: low_count=high_count-1? For even k: before remove low=high. Remove low -> low=high-1. For total k-1 (odd), target low=high? Actually total 3? k=4 remove low -> low1 high2, total3 target low2 high1 (ceil(3/2)=2). So rebalance after removal must move high to low (one move). Then add and rebalance maybe move again. Extra moves. But total still O(n). Could be okay. But may increase moves up to 2 per slide. Still fine. But if we can fix insertion low0 case simpler.

Maybe keep insertion low_count=0 insert high to fix partition without rebalancing after removal. Let's ensure no invariant violation in other cases.

Case after remove low for k=2: high_count=1, low0, insert new to high, rebalance moves min to low. Good. For k=2 if high top invalid? Example previous median may have invalid high top smaller than active high. Suppose window after removal high_count=1 but high heap top invalid with smaller value, active high value larger. Insert to high, high_count2. Rebalance prune_high pops invalid top. Then moves active min. Good. If active high smaller than invalid? invalid popped. OK.

What if low_count=0 high_count=0 but high heap contains invalid entries. Insert to low. Later median prune high may empty. OK.

Need adjust `add` accordingly. But if low_count==0 and high_count>0, we do not need to prune low (empty maybe). Insert to high. Then rebalance. Good.

But if low_count==0 high_count>0 and new value <= existing high min, insert high then move new to low. If new > high min, move old to low. Correct. So partition fixed.

What if high_count>0 but high empty due invalid entries, active high entries lower in heap. Rebalance will prune before moving. Good.

Let's test inversion example: [1,100] init low1 high100. Remove 1 low -> low0 high1. Add 200: low0 high>0 => high push 200 high_count2. Rebalance high>low: prune_high: high top 100 active, pop move to low (low1 high1). Partition low100 high200. Good. Add 50 next? Remove 100 (low) -> low0 high1 (200). Add50 high push high_count2; rebalance move 50 to low; high200. Correct. If add 300 -> move200 to low. correct.

Now, what if low_count>0 but low top invalid? We call prune_low. If after prune_low heap empty but low_count>0 impossible. If low_count=0 high_count>0, insert high. But what if low heap has invalid entries but high_count=0? insert low. OK.

Could there be state low_count=0 high_count>1? Not if invariants. But if it occurs due to bug, insert high rebalance moves multiple but correct eventually.

Need include final partition fix? Maybe not if insertion logic and rebalancing proof holds. But proof assumed before insert partition holds. If low_count=0 and high_count>0, the partition condition for active set before insert is vacuously true (max of empty low <= min high). Inserting to high then rebalance high>low: moves high min to low. Since old max low undefined (-inf). The moved min <= remaining high min and <= new high? yes. If new value inserted to high, moved min is min of old high and new. Low gets that min, high gets rest. Partition holds. For other low_count>0, insertion based on max low. If new <= max low to low; if new > max low to high. Then rebalance preserves partition. Remove preserves. So invariant holds if before insert partition holds. Base holds. Good. So no final fix needed.

Need make sure after remove, partition for active subset holds. Removing element from one heap can't violate max low <= min high because remaining low values <= removed? If remove high, remaining high values >= old min? If remove min high, new min high could be larger, still >= max low. If remove larger high, min unchanged. Remove low, max low could decrease or if not max unchanged, still <= min high. So partition holds. If we remove an element that is active but not at top, partition holds. Good.

But after remove, sizes may be unbalanced; partition still holds. Insertion based on current max low (if low nonempty). If low empty, insert high as above. If low nonempty but high empty? This can happen after remove high when k=2? Start k=2 low1 high1. Remove high -> low1 high0. Insertion: low nonempty; if new <= low max -> low, else high. Then rebalance. If new <= low max to low => low2 high0 -> move max low to high. If low has two values (old and new) move max to high, partition? If new <= old, low after move contains new (max new) high old, OK. If new > old but inserted high (not low) no rebalance? sizes equal old low <= new high, OK. If new > old inserted high, high1 low1 partition OK. Good. If new <= old inserted low, rebalance moves max (old) to high, low new <= high old. OK.

What if low nonempty high empty with total k-1 and new > low max inserted high -> sizes equal partition OK. Good.

Thus invariant holds.

Need check `add` branch when low_count=0 and high_count>0: If new value inserted high, what if high_count == 0 but low_count>0? no branch. If low_count=0 high_count=0: low.

Now, potential bug: In `add`, if low_count>0 we call prune_low, then compare. But what if high is empty and low_count>0. Branch based on low max. If new <= low max -> low; else high. If new > low max -> high, sizes low1 high1 partition OK. If new <= low max -> low2 high0; rebalance move low max to high. If there are two values, move larger (max) to high, leaving smaller low. OK.

Now, if low_count>0 but after prune_low, low top active. But if low heap has invalid entries that are not top, no issue. If high_count=0 but high heap has invalid entries; partition of active vacuous. Insert maybe to low or high. Rebalance may move. Median later prune high removes invalid if top. OK.

Let's test another sequence with removal causing low top invalid due to removed element being top. For compare after remove, if low top invalid but low_count>0, `prune_low` called. Good. If low_count=0 but low heap top invalid, we don't prune before deciding. Branch low_count==0 high_count maybe >0: insert to high. Low invalid remains. Later median or rebalance moving low->high maybe prune_low. Could invalid low with large value block? low_count maybe becomes >0 after moving high to low. In rebalance after insert high, we only move high to low; low invalid remains. If low invalid top value large but low_count=1 after moving active high to low? Wait low heap had invalid old element value 1000; we moved active high 10 to low; low_count=1, high_count=1. Physical low heap top maybe invalid 1000. Then median calls prune_low: top id removed not in loc -> pop; then top valid 10. But during rebalance after insert, condition high_count > low_count? After moving one, equal. It did not prune low. So if after rebalance partition check would need prune low but we don't check. Invariant active max low valid 10, but physical top invalid 1000. We don't compare physical top. Median prunes. Insert future will prune low. OK. But when moving high to low, we pop high and push active to low. Could high min be smaller than invalid low top? active partition fine. Good.

Potential issue: If invalid low top is smaller than active low top, it's not top? For max heap invalid smaller than active top, no block. If invalid larger, it is top and pruned before use. Good.

Now, maybe `where` dictionary membership for invalid top uses active IDs. If an active element has been moved, its old heap entry popped, new entry pushed. The new entry has same ID and where side updated. But what about old heap entry if it wasn't top? We always pop the entry being moved; if moving top, yes. If element not top, we don't move. So no stale active entries. Good.

Need consider moving in rebalance while loops: Suppose low_count > high+1, we prune_low. If low top valid, pop it. But after popping, there could be invalid entry below; not issue. Set where. high push. Good. Suppose high_count > low_count, similar.

Now, could a valid element be in low but `where[idx]` is 1? That would mean loc updated but heap entry in low stale. This could happen if we moved element to high but failed to pop low entry? We pop low top before pushing high. But what if the entry in low is not top? We don't move non-top. OK. What if we inserted new into low but `where` incorrectly set 1? no.

Now let's consider an alternative robust multiset using Fenwick. But heaps code with ID is acceptable. Need maybe include docstring? Code only. User says no tests, example, printing. Docstring okay. Could include comments.

Potential performance issue due to `where` dict and checking `where[0] not in where` but if many invalid entries with IDs removed, `not in` for IDs not in dict. Dict size k=1000, good. But if `nums` length 200k, `where` small. Good.

Potential performance issue: `add` rebalance while loops call `prune_low` and `prune_high` functions; those functions access closures, nonlocal? No. But could be fine. Maybe final code can be optimized by avoiding `add` function? Let's evaluate. The requirement: must finish under 2 sec. We need be confident. n=200k, k=1000. Heaps approach with Python function calls and closures: maybe 200k adds + median calls + remove calls = 600k calls. Heap operations ~ n insert + moves ~400k, each log ~ maybe 18 comparisons of tuples. Tuple comparisons in Python C? Tuple compare calls float compare C, int compare C. Should be fast. Invalid pops ~ n? total pops maybe ~800k. Total heap ops ~1.6M. heapq operations in Python with while loops in C? heapq is Python implementation? In CPython, heapq is Python code with C imports? Actually heapq.py pure Python but `_heapq` C implementations for heappush/heappop. `heapq.heappush` from C? In CPython, `heapq` imports `_heapq` functions, so heappush/heappop are built-in C. Good. So heap ops fast. Dict membership 1M. Function calls maybe OK. Should pass well under 2s. Fenwick Python loops 20M maybe risk. Heaps better.

Need ensure `heapq` functions are C: yes.

Potential hidden overhead: `where[index] = 0` and `where.pop` for each. OK.

Let's consider if using tuple with negative float and int can cause comparisons of int if values equal; no big.

Now let's test algorithm more systematically with brute small manually maybe.

Case nums = [1], k=1. init add index0 low_count1. median prune low, high empty. odd return 1.0. loop range0 none.

Case k=n. loop range0. Init all. Output one. Good.

Case nums length 0, k=1 -> ValueError.

Case all duplicates [5]*200k k=1000. Insert: compare <= low top true, so all go low, rebalance moves to high alternating? Let's see with tuple ties moving smaller id from low to high. For each insertion, low_count maybe high+1. Move low top (smallest id due tuple? Low entries (-5, idx); tuple compares idx, so top is smaller idx) to high. This moves active elements. Works. `where` updated. Median returns 5. Heaps may contain moves but active. In duplicates, moving top with smallest id not necessarily value same; OK. Insert new value equal low top -> low. Then rebalance moves min id low to high. This keeps partition arbitrary. Side tracking robust.

Potential issue: When duplicates equal, moving low top to high may move an element that was recently inserted with small id. No matter. If remove by index, loc side tells where. Good.

Let's simulate duplicate moving many to ensure no stale active entries. Start low empty. Add idx0 low. Add idx1 low (tie), rebalance move top low (-5,0) to high. where0=1. low has (-5,1). Add idx2: low top (-5,1) active, value <=5 => push low (-5,2). low entries (-5,1),(-5,2), top idx1. low_count2 high1. rebalance move top (-5,1) to high. where1=1. low has (-5,2), high has (5,0),(5,1). Add idx3 push low, move idx2 to high, etc. Each active moved at most once? In this sequence, element idx1 moved once; idx0 remains high. For duplicates all values equal, final low highest IDs, high lower IDs. Removing old idx0 high: loc side high. Good. Later median prune may see high top (5,0) removed loc missing, pop. high top (5,1) removed? maybe if removed too? But loc. OK.

Now, one subtlety with moving by low top with tie: In max heap, top is most negative, then smallest id. Moving smallest id among equal values to high. Later when sliding remove smallest ids first (because they are oldest). They may be in high due tie, often high. Good. But not relevant.

Let's test with all duplicates and removal from high invalid top. Suppose high top removed idx0 invalid; active high idx1 valid but same value. Median prunes high top invalid pop, then top idx1. low_count/high_count? If remove idx0 high, high_count--. If high physical still contains invalid idx0 top and valid idx1. Counts reflect valid high count. When median prunes, count not changed. Good. If later insert, branch low_count>0 prune_low, not prune_high. Then rebalance if high_count > low_count: prune_high before moving. Good.

Could invalid top in high with same value as active high cause moving active? prune_high will pop invalid top, then top active. OK.

Potential issue: `where.pop(index)` when removing index whose physical entry has already been popped as invalid? Can that happen? If entry popped as invalid, index not in `where`, meaning it was considered removed. But we only remove active indices. Could an active entry be popped as invalid because its ID not in `where` due to side bug? No. If active index was not in where due to moving without update? We update. So active entry never popped. Good.

Now, what about when an element is moved from low to high, then later removed while it is high. loc side high, high_count--. It leaves high heap entry. That entry may be invalid if not top; if top, later pruned. Good.

Need maybe handle `k` larger than `n`: ValueError. If `k` is bool? bool subclass int; if k=True -> 1. OK.

Let's consider if `nums` is a generator? list[float] type, len works. OK.

Could there be memory blow due to `result` storing 200k floats: ~1.6MB, fine. Heaps maybe up to 200k entries tuples: each tuple ~56 bytes -> 11MB, OK. `where` 1000. Fine.

Let's think if using `list[float]` but values may be int; float output. Good.

Potential bug in median when k even but high_count ==0? Should not. But if k even and n? If k=0 not allowed. For k=2 after add with insertion branch? Let's test weird: init [1,2]: add1 low, add2 high -> low1 high1. Slide remove1 low -> low0 high1. add100 branch low_count0 high_count1 -> high. Rebalance high>low move high top? high has values 2,100 top2 active, move to low. low1 high1. Good. If invalid high top smaller? Suppose before slide window [100,200] with low100 high200. Remove 100 low -> low0 high1 (200). Add50 branch high -> high values 200,50. Rebalance high>low: prune_high top50 active, move50 low. low50 high200. Good.

Now, if after remove low0 high1 and high top invalid with smaller value, active high maybe larger. high_count1. Insert new to high high_count2. Rebalance prune_high: top invalid smaller popped, then top active maybe min of active high and new. Move that to low. Good.

What if after remove low0 high1 and active high entry is buried below invalid entries that are larger? For min heap, invalid larger than active won't be top if active smaller? If active larger and invalid smaller? invalid top pruned; if invalid larger, top active? Since min heap, active smaller? Need scenario: high has invalid entry with value -100 (smaller) top, active high value 100. high_count1. Insert new 200 to high: high_count2. Rebalance high>low, prune_high pops invalid -100, then top active 100, move. Good. If invalid entries with value larger than active not top, no effect. Good.

Need maybe consider after remove, we don't call prune before branch if low_count>0. We call prune_low inside add. Good. If low_count>0 and low top invalid but there are active low entries, prune. If low_count>0 but low heap top invalid and high top? OK.

Now, if high_count > low_count in rebalance, prune_high may pop invalid top. But high_count might be zero? while high_count > low_count ensures >. Good. If high heap empty but high_count>0 impossible. If after prune high empty due all invalid but high_count>0 impossible. But if due loc bug, pop error. Not.

Could `low_count` and `high_count` become out of sync due to rebalancing moving an element that is invalid? We prune before moving. But prune only removes invalid top. If top valid after prune, moving valid. OK.

Now, let's think about using index as ID with `nums` values floats. If `nums` length > recursion? no.

Potential alternative: use a Fenwick with coordinate compression simpler but performance maybe OK. Let's consider if two heaps with loc might have hidden issue with `where` membership causing invalid top not popped if ID was removed and then inserted with same index? Not possible. If input has negative indices? indices from range nonnegative. Good.

Now let's consider a proof for insertion branch low_count=0 high_count>0. We set all existing valid in high. The partition property for low empty is vacuously true. Insert into high. Then rebalance while high_count > low_count. Because total = high_count after insertion, low_count 0. It moves min high to low until sizes balanced. Moving min high to low with low empty: after first move, low contains that min, high contains rest with min >= moved value. So partition holds. If multiple moves? If high_count was large (not expected), moving min repeatedly could add smaller values to low and larger remain high; if low had previous moved min, after second move new min from high is >= old max low (which was previous min? Actually if low has several smallest values, max low is last moved, <= remaining high min). Partition holds. Good.

Now, could there be a state low_count>0 high_count>0 but partition broken due to previous low_count0 branch? We fixed. Could partition break due to lazy invalid entries? Active partition not physical. Our compare uses valid top after prune. Rebalance moves valid tops. We don't maintain physical top relation for invalid entries. Active partition holds by proof. Good.

Now let's think about median with even k and values `float('inf')`, `-inf`. If low top inf high top -inf due inversion? Partition should prevent. But if input includes NaN, no. Not necessary. Could return nan if inf + -inf. Standard maybe not specified. We can leave.

Could use `math.inf`? no need.

Potential speed improvement: Avoid `add` and `remove` closures by inlining in loop. But final answer maybe okay. Let's estimate CPython performance: 200k slides, each add with heappush/pop C. Function call overhead: `add` call 200k, `remove` 199k, `median` 200k, `prune_low/high` maybe 1-2M calls. Function call overhead in Python maybe ~0.1 micro? Actually 1 million Python function calls ~0.07-0.1 seconds? Let's recall: Python can do ~10-20 million simple function calls per second? Maybe ~50 ns? No, Python bytecode. A simple function call maybe 70 ns? Let's not rely. Even if 5 million calls * 0.2 us =1s? Actually 5M calls * 0.1 us=0.5s. Still okay. Heap ops dominate maybe. Under 2s likely.

But if time critical, can inline prune and median. Let's consider writing optimized version without inner `add`/`remove`/`median` functions? Could be more verbose but still okay. Need maintain counts. Since user just wants solution, performance important. We can provide reasonably optimized code with helper functions. Let's maybe inline median inside loop to reduce calls, but keep helpers for prune. Could still pass. Let's design final code optimized but clear:

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    low = []
    high = []
    side = {}
    low_size = 0
    high_size = 0
    push = heapq.heappush
    pop = heapq.heappop

    def clean_low():
        while low and low[0][1] not in side:
            pop(low)

    def clean_high():
        while high and high[0][1] not in side:
            pop(high)

    result = []
    # initialize
    for i in range(k):
        value = nums[i]
        if low_size == 0 and high_size == 0:
            push(low, (-value, i)); side[i] = 0; low_size += 1
        elif low_size == 0:
            push(high, (value, i)); side[i] = 1; high_size += 1
        else:
            clean_low()
            if value <= -low[0][0]:
                push(low, (-value, i)); side[i] = 0; low_size += 1
            else:
                push(high, (value, i)); side[i] = 1; high_size += 1
        # rebalance
        while low_size > high_size + 1:
            clean_low()
            negv, idx = pop(low)
            side[idx] = 1
            push(high, (-negv, idx))
            low_size -= 1; high_size += 1
        while high_size > low_size:
            clean_high()
            v, idx = pop(high)
            side[idx] = 0
            push(low, (-v, idx))
            high_size -= 1; low_size += 1

    def append_median():
       clean_low(); clean_high()
       if k & 1: result.append(float(-low[0][0]))
       else: result.append((-low[0][0] + high[0][0]) * 0.5)
    append_median()
    for i in range(n-k):
       idx_remove = i
       s = side.pop(idx_remove)
       if s: high_size -= 1 else low_size -=1
       idx_add = i+k
       value = nums[idx_add]
       if low_size == 0 and high_size == 0:
          push low ...
       elif low_size == 0:
          push high ...
       else:
          clean_low()
          if value <= -low[0][0]: push low ... else push high ...
       rebalance loops
       append_median()
    return result
```

This duplicates add/rebalance code. Could define local `add` to avoid duplication. Performance vs duplication. Maybe duplication faster because no function call but longer. Need avoid bugs. Could use nested functions for clarity. I think nested functions acceptable. But if user specifically performance n=200k k=1000, nested closures okay. Let's maybe choose a balanced approach: define `add` closure to avoid duplicate and maintain counts. It's clear. But for speed, maybe we can define `add` and use it for init and slides. 200k calls, fine.

Let's micro-optimizations:
- Use `side` dict with values 0/1. `s = side.pop(idx_remove)`; if s == 0 else.
- In `add`, branch: `if not low_size and not high_size` then low; `elif not low_size` high; else `clean_low()`.
- After clean_low, if low heap empty but low_size>0? Should not. But if low_size>0 and clean_low makes low empty due all invalid, then accessing low[0] error. Could guard:
```
if low_size:
    clean_low()
    if low and value <= -low[0][0]: ...
    else: push high
else: push high if high_size else low
```
But if low_size>0 and low empty, we should maybe push low? But impossible. If `low` empty due all entries invalid but low_size>0, that means active low entries not in heap, bug. Guard not fix. Could use `if low:`.

- In rebalance move low->high, after clean_low, if not low? Could error. Maybe add `if not low: break` but would hide bug. Keep as is.

Need maybe call `clean_low()` and `clean_high()` in median only, not in add? We call in add. Good.

Let's consider if after remove, low_size>0 but low heap top invalid. In add branch `clean_low()` pops invalid. If low heap becomes empty but low_size>0 impossible. If high_size > low_size and high top invalid, clean_high. OK.

Now, can we use `side` dict for active side but not remove invalid IDs from dict? We pop on removal. If top invalid, `id not in side`. Good. What about invalid IDs that were never inserted? no.

Potential bug with `side.pop(idx_remove)` if element to remove has been moved and `side` side updated, but there is an invalid physical entry for same index in another heap due to previous move? No. But when an element moves, we set side to new. There is only one physical entry. If we remove, side.pop returns current side. Good.

Let's maybe write small pseudo-random validation in head? Could generate all small arrays and compare? Not executing. But proof sufficient.

Now, perhaps there is an even simpler robust method using `heapq` with two heaps and delayed value counts but no ID, accepted. But ID approach is solid.

Need ensure no use of `input()` or printing. Code block only. The final answer should only be Python code. The system says no tests, example, printing. So final should be:
```python
import heapq

def sliding_median(...):
    ...
```

Need mention raise ValueError. Done.

Let's think about edge case `k > len(nums)`, if len(nums)=0 and k=0, `k<1` raise. Good. If `nums` length < k but k=1 n=0 raise. OK.

Potential issue with type hint list[float] if user uses Python 3.9? They specify 3.11. OK.

Now, let's scrutinize the two heaps side algorithm with lazy deletion and loc dictionary. Are we missing the fact that when we remove an element, if it is currently at the top of its heap and then we insert a new element that goes to the same heap, we may leave invalid entry below new? For max heap, old top invalid maybe larger than new, remains top until pruned. Insert compare after remove will call clean_low if low_size >0. But if we removed from high and low_size=0? If removed from low and low_size becomes 0 but low heap top invalid (the removed element). Then branch low_size=0; if high_size maybe >0, insert to high. So no compare. If low_size >0 after removal? That means removed element was not the only active low; low heap top might be invalid (removed) if it was the max. We call clean_low before insert. So invalid removed max is popped. Good. If removed element was not top, top valid; no invalid top. OK.

When remove from high and high top invalid? We don't clean high before add. But add branch only compares low top; not high. Inserting to high based on low top. Rebalance if needed cleans high. If no rebalance, median cleans high. OK.

Now, one possible issue: Insert decision uses `value <= -low[0][0]` after `clean_low()`. If low top valid but high active min is smaller due partition violation? We argued no violation. But due lazy invalid entries, high active min could be invalid smaller not pruned? high top invalid with value smaller than active high; `clean_high` not called. Partition active min high could be larger. Insert value <= low max goes low, else high. If new value is between low max and active high min, goes high. OK. If new value less than low max, goes low. If low max <= active high min. OK. If high invalid smaller than new but active high min larger, does it matter? No. Rebalance may clean high if moving. Good.

Now, consider median function: It calls clean_low then clean_high. What if clean_low moves invalid low entries and reveals low top active, but high top invalid? clean_high after. Good. What if low or high heap empty but corresponding size >0? Not. But if high_size==0 for odd, median won't access high. For even, high_size>0. But high heap might have invalid entries only and active high buried? clean_high pops invalid top until active or heap empty. If active buried below invalid with smaller values, it will pop all invalid smaller until active. If invalid larger not top, active top? For min heap, if invalid larger than active, active top, OK. If invalid smaller, popped. Eventually active top if high_size>0. Good.

Now, possible performance issue with `side` dict and `low[0][1] not in side` in while loops. For invalid top, we pop and do not remove from `side` (already absent). Good. But if we have a huge number of invalid IDs that are not in `side`, membership test O(1). Good.

Could we use an integer array for side to speed? Since IDs are indices 0..n-1, we could use `bytearray(n)` with 0 unknown/removed, 1 low, 2 high. That avoids dict overhead and loc size. But for n=200k, bytearray small. Then active side check `side_arr[idx] != 0`. Remove: set 0. Insert: set 1/2. Move: set new. This may be faster and simpler? We need know side on removal: `s = where[old]`; if s==1 low_size-- elif s==2 high_size--. For invalid top: `where[low[0][1]] == 0`. This avoids dict operations and hash. Since IDs are contiguous from 0 to n-1, we can allocate bytearray n. For n=200k, easy. This is more performant and robust? Need if nums length maybe 200k, OK. If n huge? list. Use `array('B')`? `bytearray(n)`. Values 0,1,2. This might be better. Let's consider.

Implementation with bytearray:
```
where = bytearray(n)
# 0: removed/not active, 1: low, 2: high
...
if low and where[low[0][1]] == 0: pop
...
if low_count >0: clean_low(); if value <= -low[0][0]: where[idx]=1; low_count++ ...
# high where=2
# remove: s=where[old]; if s==1: low_count-=1 else: high_count-=1; where[old]=0
# move: where[idx]=2/1
```
This avoids dict `not in` membership and side pop. It assumes IDs correspond to indices 0..n-1. Yes. It also automatically marks removed invalid. But need be careful: When moving active element from low to high, there might be an old heap entry for idx in low? We pop it, set where=2, push high. Good. If invalid entries for removed indices have where=0. Great. This may be faster and memory small. Need consider if n=0 and k? k<1 raise before allocate? if n=0, raise. If k=1 n=1 allocate. Good.

Potential issue: If there are invalid entries whose indices have not been removed? `where` active nonzero. Good. For initialization, before adding idx, where[idx]=0. Set when active. Remove set to 0. This means if an active element somehow not in where? bug.

Bytearray values are ints. For n up to 200k, fine. If n larger >255? bytearray length can be >255, values stored 0-255 per position. OK.

Using bytearray may be less flexible if indices not contiguous? We use enumerate index. Good.

Performance: `where[idx]` indexing bytearray C, faster than dict. Removal no dict pop but assignment to 0. We need know side of old for counts: `s = where[old]`; if s == 1 low_count -=1; elif s ==2 high_count -=1; where[old]=0. If s==0 would indicate bug. Could if s == 0? maybe skip? But should not. We can do if s ==1 else; if s==2 else. If s==0, neither decrement -> counts wrong. Could guard:
```
if s == 1: low_count -=1
elif s ==2: high_count -=1
where[old] = 0
```
If s==0, maybe due element invalid? But active old should not be invalid. Could this happen if element was moved but where not updated? no. But to be safe, maybe if s==0 continue? That would hide bug. I'd rather assume. Could use `if s == 0: pass`? no.

`where` bytearray also tells invalid top: `where[idx] == 0`. Since active IDs have 1/2. But what about index 0 active? where[0] nonzero. Good.

Need allocate `where = bytearray(n)` after validating k. If n can be huge maybe memory but fine. If n=200000, 200KB. Heaps hold tuples of (float,int). Good.

Let's rewrite with bytearray. This is a nice optimization. Need ensure `bytearray(n)` values set to 0. Set low=1 high=2.

Pseudo:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    low = []
    high = []
    where = bytearray(n)
    low_count = 0
    high_count = 0
    push = heapq.heappush
    pop = heapq.heappop

    def clean_low():
        while low and where[low[0][1]] == 0:
            pop(low)

    def clean_high():
        while high and where[high[0][1]] == 0:
            pop(high)

    def add(idx, value):
        nonlocal low_count, high_count
        if low_count == 0 and high_count == 0:
            push(low, (-value, idx)); where[idx] = 1; low_count += 1
        elif low_count == 0:
            push(high, (value, idx)); where[idx] = 2; high_count += 1
        else:
            clean_low()
            if value <= -low[0][0]:
                push(low, (-value, idx)); where[idx] = 1; low_count += 1
            else:
                push(high, (value, idx)); where[idx] = 2; high_count += 1

        while low_count > high_count + 1:
            clean_low()
            neg_val, old_idx = pop(low)
            where[old_idx] = 2
            push(high, (-neg_val, old_idx))
            low_count -= 1
            high_count += 1
        while high_count > low_count:
            clean_high()
            val, old_idx = pop(high)
            where[old_idx] = 1
            push(low, (-val, old_idx))
            high_count -= 1
            low_count += 1

    def remove(idx):
        nonlocal low_count, high_count
        s = where[idx]
        if s == 1:
            low_count -= 1
        elif s == 2:
            high_count -= 1
        where[idx] = 0

    def median(): ...

```

Need in `clean_low`, if `low[0][1]` is idx active but where=1/2. If where value maybe 1 or 2. Good. But for an active high element, could its id appear in low? no. If it did, where=2, `where !=0` so not popped as invalid; but stale high entry in low would be treated active and could be moved? But no duplicates. If due bug, bad. OK.

Potential issue: When an element is moved from low to high, we set where to 2, but there may still be an entry for it in high? It was not active in high, but there could be an invalid entry with same idx? No duplicate. Good. If an element was removed (where=0) and then somehow reinserted with same idx? No. Bytearray reuse could treat an old invalid entry for idx as active if idx reused? IDs not reused. Good.

But if n > 255 and we use bytearray values only 0/1/2, indexing by idx up to n-1. Good. Bytearray length n. OK.

Using `where[old_idx] = 0` for removal means if an element has been moved, where updated. OK.

Need careful with `bytearray(n)` if n huge? OK. If `n` is 0, raise before because k<1 or k>n. If n=0, k<1 raise. Good.

Potential issue with `where` for indices that are not active but not removed? All indices not active before inserted have where=0. If an index inserted then removed where=0. Good. But when checking invalid top, if top id is an index not yet inserted? Could there be a heap entry with future index? no. So where=0 invalid.

This bytearray approach is efficient and simpler than dict. Need maybe mention in comments. Code only.

Let's test bytearray with earlier duplicate tie. Init idx0 where=1; move idx0 to high where=2. high top idx0. Slide remove idx0: s=2 high_count-- where[0]=0. median clean_high sees idx0 where0 pop. Good. If high top invalid with where0 and active high idx1 where2. Good.

Potential issue: If active element is moved from high to low, we set where to 1. But the high heap entry is popped. There might be an invalid entry for same idx in high if idx had been removed? Active no. OK.

Now, median function:
```
        clean_low()
        clean_high()
        if k & 1:
            return float(-low[0][0])
        return (-low[0][0] + high[0][0]) * 0.5
```
Need if high empty for k even? not. But `clean_high` may pop invalid and high could be empty if high_count=0. For even high_count>0. Good. But if k=1, clean_high while high maybe empty. OK.

Could return float for even: If both values are int, `*0.5` returns float. If low/high top values are float. Good.

Potential issue: `-low[0][0]` where low[0][0] might be `-0.0`; - gives 0.0. OK.

Now, performance of nested functions with nonlocal. `clean_low` accesses `where`, `low`, `pop` closure. Could inline clean loops for speed. But okay.

If we use `add` function and `remove`, each slide two calls. For n=200k, 400k calls, fine. `median` 200k. Total maybe <1 sec. If want extra speed, we can avoid median function by inline. But final code with functions easier.

Let's think about possible recursion limit? none.

Now, can we improve initialization by using for loop and add. Good.

Potential hidden issue: The median of even k is mean of two middle values. In our invariant, low contains the lower half and high the upper half. If k even, low_count=high_count=k/2, low top is k/2-th smallest? For max heap low top is largest in low = k/2-th. high top is smallest in upper = k/2+1-th. If partition holds. Average. For odd low top median. Good.

Now, let's consider if using `value <= -low[0][0]` when low top invalid but low_count>0 and clean_low called. If `clean_low` pops invalid top but there are still invalid entries below and valid top after. OK. If there are invalid entries with same value and same id? no.

Potential issue with `where` bytearray if `idx` from `heappop(low)` is an active element but `where[idx]` might be 2 (high side) due to a stale duplicate active entry in low. Then clean_low would not pop it (since where !=0), and rebalance might move it to high, causing duplicate active high. But no stale active duplicates. Let's prove no stale active duplicates more formally: Initially no entries. Insert active: push one entry, set where side. Move: we only move top entry. That entry corresponds to active element (clean ensures where side equals heap? We don't verify side matches heap but if no stale duplicates, side matches). We pop that entry from heap, so no entry for idx remains in old heap. Then push one entry in new heap, set where new side. Thus active element always exactly one entry. Remove: active element entry remains in heap but where=0, so invalid. It is never moved because clean pops where=0 top before moving. If it is not top, stays. No new entry for same idx. Thus exactly one entry for every inserted index, invalid if removed. Good.

But clean ensures if top where !=0 it is active. It doesn't check that the top's where side matches current heap. But given no stale duplicates, it should. What about a high active entry in high and a low active entry in low. No cross stale. OK.

Could an active element's `where` side not match its heap due to setting where when pushing but not popping old? We always pop before push in move. Insert only one push. OK.

Now, consider a case where an element is moved but is not the only entry for its id due to previous invalid? An active element cannot have invalid entry of same id because id inserted once and if it had been removed, not active. No reinsert. Good.

Thus correct.

Now, perhaps using bytearray for `where` with active side but no dict can fail if we want to know side of moved element after popping from heap? Not needed; when moving, we pop and set new side. When removing, we use `where[idx]`. If active element is buried, where gives side. OK.

Potential issue: In rebalance move high->low, after `clean_high()`, the top `val, idx` is active (where=2). We set where=1 and push low. What if the same element had an invalid entry in low from before it was active? IDs unique, no.

Now, let's compare final code length. Fine.

Let's test some manual cases with bytearray algorithm.

Case nums=[2,1], k=2.
init:
idx0 val2 low_count0 high0 -> low (-2,0), where0=1, lowc1.
idx1 val1 lowc1: clean_low top idx0 active; 1 <=2 -> low push (-1,1), where1=1, lowc2. rebal low>high+1: clean_low top (-2,0) active, pop idx0, where0=2, push high (2,0), lowc1 highc1. high top idx0. low top (-1,1). median (1+2)/2=1.5.
slide i=0 remove old0: s=where0=2 -> highc0, where0=0. add idx2? if n>2. But if n=2 loop none. OK.

Case nums=[1,2], k=2 init: idx0 low, idx1 compare 2<=1 false high, rebal no. high top2. median1.5. Slide remove idx0: s=1 lowc0 highc1 where0=0. add idx2 val100: lowc0 highc1 -> high push (100,2) highc2. rebal high>low: clean_high: high top (2,1) active (where1=2) pop, where1=1 push low(-2,1), highc1 lowc1. median (2+100)/2=51 correct. Physical high has invalid (2? wait popped high top 2 active moved; high still (100,2). No invalid except removed idx0 not in high. Good.)

Case [2,1] slide if n=3 add 3. Init low1 high2. Remove old0 high? idx0 value2 high, highc0 where0=0. Add idx2 val3: lowc1 (value1 low top), compare 3<=1 false -> high push3 highc1. Rebalance no. median (1+3)/2=2 correct. Physical high top invalid (2,0) where0=0, active 3. median clean_high pops invalid, top3. Good.

Now, case where low top invalid after remove but low_count>0 and insert compares. nums [5,1,2], k=2. Init [5,1]: add5 low; add1 low -> rebal move 5 high; low1 high5. Slide remove5 high: highc0, where5=0. low1. Add2: lowc1 clean_low top1 active; 2<=1 false -> high2. Rebal high>low? 1>1 no. median (1+2)/2=1.5 correct. Physical high top invalid5, active2; median clean high pops 5. Good.

Now case remove low where top invalid: nums [5,4,3], k=2. Init [5,4]: low4 high5? add5 low; add4 low rebal move5 high. Slide remove5 high actually not low. Need low invalid top: maybe [1,5] init low1 high5; slide remove1 low -> lowc0 highc1; add0 branch low0 high1 -> high0; rebal high>low move 0 low? high has 5,0 top0 move to low; low0 high5. No invalid low top. If remove low and low_count remains >0 for k=3. nums [5,4,3], k=3 init: add5 low; add4 low move5 high; add3 compare3<=4 low low2 high1. low top4 high5. Slide remove5 high, not low. Need remove low top: window [1,5,10]? init low5? Let's construct: [10,1,5] k=3: add10 low; add1 low rebal move10 high; add5 compare5<=1 false high high2 low1 rebal move high top5? high min5 to low -> low5,10? low has 10 invalid? Wait low physical: after move10 to high, low has (-1,idx1). Add5 to high. high has 10,5. rebal high>low move high top5 to low. low (-5,2),(-1,1); high (10,0). low top5. Slide remove old0 high. Not low. Need remove low top old. In sliding remove first index which may be low top. Example k=3 [1,10,5]: add1 low; add10 high; add5 high high2 low1 rebal move high top5 low. low entries 1,5 top5; high10. Old index0 is value1 low not top. Remove low non-top, top valid. Remove low top if old is max low: e.g. [5,1,10]? add5 low; add1 low rebal move5 high; add10 high high2 low1 rebal move high top5 low. low entries (-1 idx1), (-5 idx0) top5 (old0). high10. Slide remove5 (low top) -> lowc1 (value1), low heap top invalid (-5,0). Add new 7: add branch lowc1 clean_low pops invalid idx0, top active (-1), compare 7<=1 false -> high. Good. If we didn't clean, invalid top 5 would route 7? still false; but if new 3? 3<=5 true low incorrectly (should high? window after remove [1,10], add3 sorted1,3,10 median3. If low top invalid5, new3 goes low: low has 1,3; high10; median3 actually correct because low max3 <= high10. If new4? goes low, low max4 <= high10 correct. If new2? goes low correct. If new0 correct. If new6? 6<=5 false high, correct. Invalid low top only larger than active max. Any value <= invalid but > active max would be wrongly low. Example active max1, invalid top5, new3: if no clean, 3<=5 low, but active max1, new3 should maybe low anyway because lower half for k=3: window [1,10,3] sorted1,3,10; low size2 should contain1,3. So low correct. New4 also low. New5 (equal invalid) low? sorted1,5,10 low1,5. correct. New6 high. So routing based on invalid larger may still be correct? If invalid larger than active max, low boundary should be active max? For lower half of size low_count+1 after insert maybe includes values up to something not necessarily active max. If new value between active max and invalid, it likely belongs to lower half anyway if lower half capacity. In this example low after removal size1, total before add k-1=2, after insert k=3, low size should 2. With active low size1 (1), adding any of three values; median lower half includes the two smallest. Active high 10; new x: if x <=10, lower half will be 1 and x (if x <=10) unless x>10 then 1 and10. Compare invalid5 sends x<=5 to low, x>5 to high. For x=7, compare 7>5 -> high. But window [1,10,7], low size should 2 containing 1,7; high10. Our branch high would result low1 high10,7 sizes low1 high2, rebal high>low moves high min7 to low -> low1,7. So correct. If x=4 branch low low2 high10, correct. So even without prune maybe OK? But in general compare to valid max low is standard. We prune anyway.

Now, maybe `clean_low` after remove low top invalid could pop invalid entry and thus reduce heap size but low_count remains. If after popping all invalid, there is valid top. Good.

Now, if there are many invalid entries and clean_low called often, total pops bounded.

Potential issue with `where` bytearray: It marks removed indices as 0. But what about indices that are active in heap but not yet assigned? We assign before push? In add, we push then set where. If clean_low called immediately after push? Not. But if push fails? no. In rebalance move: pop old, set where new, push new. There is a moment after pop where old heap entry gone, where new? set before push. If some signal? no. If clean_low called before push? no. OK. In insert, if push then set where. If heap entry top and clean_low called in same add before where set? no. But if we set where after push, and then rebalance moves, where set. Good.

If push to low with value NaN? no.

Let's think about if input list is very large and `bytearray(n)` memory okay. If n=200000 yes. If n maybe 10^7, memory 10MB, still maybe but heap bigger. Not required.

Now, is there any requirement to not use additional large memory? no.

Let's maybe include a docstring and comments? Code block only. Comments okay. But final answer should be just code. Could include docstring concise.

Now, potential issue: The median function with even k uses `(-low[0][0] + high[0][0]) * 0.5`. If `low[0][0]` is negative of a very large negative float? Let's not overthink. If values `float('inf')`, low top entry maybe -inf? Example max value inf in low: entry `(-inf, idx)`. `-low[0][0]` = inf. If high top inf too. OK. If `-inf` in high, entry (-inf), top; `-low[0][0]` maybe -low of -inf? If low has value -inf, entry 0? Wait max heap for value -inf: -value = inf; tuple (inf, idx). In max heap, entry (inf) is large and will be at bottom, not top unless all are -inf? For median, if low top -inf, entry value is inf; `-low[0][0]` = -inf. OK. If low heap top entry `(inf, idx)`, `-low[0][0]` = -inf. If high top -inf value entry -inf. Median average -inf + something. OK.

Now, one hidden problem: Python's `heapq` min-heap on low entries `(-value, idx)`. For max value, we want smallest negative. If value is positive infinity, -inf smallest -> top. If value is negative infinity, -value = inf largest -> bottom. Good. If value is NaN, -NaN NaN. Not.

Now, let's think if coordinate Fenwick would return exactly mean of two middle values but heaps with floats maybe ordering exact. OK.

Now, let's consider if there are many duplicate floats like 0.1 and 0.2; comparisons fine.

Potential issue with using `bytearray(n)` and assigning `where[idx] = 1/2`. Bytearray assignment requires 0<=value<=255. OK. If n large, index out of range? idx from 0 to n-1. OK.

Could use `list[int]` for side maybe but bytearray faster. Need if `n` maybe 0? after validation, if k>=1, n>=1. So bytearray(n) OK. If n=0 and k=0 raises before? Yes code first computes n, then if k<1 or k>n raise. So return/raise before bytearray.

Potential issue: If k = True (bool) and n >=1, `k & 1` works. If k float? type int but could float; `range(k)` would fail. Not required.

Now, maybe we can remove nested `add` and use inline to reduce nonlocal overhead. But nested with nonlocal maybe okay. But for maximum performance, let's consider writing an inner `add` function with local variables? It modifies nonlocal, which in Python uses cell variable access slower than local. Could implement add code in a local inline block for initialization and loop duplicated? That avoids nonlocal cells for low_count/high_count? If we keep low_count local in main and duplicate code, low_count access local fast. But code longer. Given performance constraint, maybe inline is better. Need weigh risk of bugs. Let's attempt an optimized final code with helper functions for clean only, but add/rebalance duplicated? Could use `while` loops in initialization and slide. Duplicating rebalance code twice? Actually initialization loop and slide loop both add+rebalance. We can define `add` closure; nonlocal cell access maybe minor. 200k operations, okay.

But if using nested add, `clean_low` closure accesses `where`, `low`, `pop`; nonlocal? It modifies low list but not rebinding; no nonlocal needed. It reads where from closure. Access to closure variables maybe slightly slower. If inline, local. But not critical.

Let's maybe keep `add` and `remove` for correctness and clarity. The user didn't require extreme micro optimization, just efficient. 200k/1000 well under 2 sec likely. Need ensure Python implementation not too slow due to `nonlocal` and bytearray. Should be fine.

Let's estimate with function calls: 200k slides. Add: clean_low maybe while top valid no loop; heappush; rebalance while maybe 0/1 moves. Remove: bytearray. Median: clean_low/high and append. Heap push/pop each ~log heap size in C. 200k heappush insert + maybe 200k move push + pops. ~1.2M heap ops. C heapq each maybe ~0.5 us? 1.2M ~0.6s. Function calls ~ maybe 0.2s. Under 2s. Good.

Now, let's test algorithm with a sequence that causes many moves due to low0 high1 branch. For k=2 alternating small/large, each slide remove low or high and insert may rebalance one move. Good.

Potential bug: In `add`, branch `elif low_count == 0:` insert high. But what if high_count == 0 too? handled first. Good. What if low_count == 0, high_count >0 but high heap has no active top (where all 0) while high_count>0 impossible. But if high_count>0 and high top invalid, we don't clean before push. Rebalance while high_count > low_count (since low0, high>=1) will clean_high and move active. Good. If high_count==1, after push high_count=2. loop runs maybe multiple until high<=low. If high top invalid and after clean high empty? impossible. OK.

Now, in initialization, if `low_count == 0` but `high_count > 0` can happen? With sequential adds and rebalance, no, because after each add low_count >= high_count? Let's check: after total1 low1; total2 low1 high1; total3 low2 high1. So low never 0 after total>0. So branch mostly unused init. In slides, after remove from low in k=2 low0 high1. For k>2 not. But robust.

Now, median result appending: Could preallocate result list size n-k+1? We can use list append. OK. Prealloc maybe faster:
```
res = [0.0]*(n-k+1)
idx=0
...
res[idx]=median; idx+=1
```
Could be slightly faster. But append fine. If using median function, return float. Could preallocate. Maybe implement prealloc to be efficient. But not necessary. Let's decide final code readability vs speed. Use append; 200k append fine.

Need if `k` even and high_count maybe zero after clean? Should not. But if input contains only invalid? no. Could defensive:
```
if k & 1: ...
else: return (float(-low[0][0]) + float(high[0][0])) / 2.0
```
No.

Potential issue: Bytearray `where` marks side for active, but when we move active low to high, we set where to 2 and push high. The low entry popped. But what about if the low entry popped was not top valid but after clean_low top active; where=1. Good. If top invalid where=0, popped; if many invalid, low_count remains. If low heap becomes empty but low_count>0, `pop(low)` in move would error. Could this occur if active low entries were all marked invalid erroneously? no. But for safety, maybe in rebalance while loops, after clean_low, if not low: break. But then invariant wrong. Not needed.

Now, if we use `bytearray` for n maybe > 2^31? memory impossible. OK.

Let's think about using `heapq` and tuple of floats. If nums values are integers, `-value` is int for low? If value int, low entry int, high entry int. Median returns float. Good. If value bool? bool as int. OK.

Now, can we simplify further with `bisect` sorted list of k=1000? O(n*k) but perhaps passes? But need well under 2s; heaps safer.

Let's think about proof with bytearray for final maybe no need in code.

Now, maybe a hidden requirement: Return median of every contiguous window of size k, len(nums)-k+1 values, in order. For even k mean of two middle values. Return floats. Our result length correct: 1 + (n-k) = n-k+1. Good.

Now, let's consider if there are NaNs and we might want to use `math.isnan`? Not required. Could handle NaNs by placing them consistently? Median with NaN ambiguous. We can ignore. But if tests include NaN? Usually not. If they do, expected maybe `nan` if window contains NaN? Python's sorted places NaN? Comparisons weird. Our heap ordering with NaN not reliable. Could we make algorithm handle NaN by using a key that sorts NaNs consistently? Could use `math.nan` and custom key? But median with NaNs could be expected? Not specified. For floats, likely not include NaN. But robust to infinities.

If we wanted to handle NaNs, we could sort using total order key: map NaN to infinity? But median of NaN undefined. Not needed.

Potential issue: For values `-0.0` and `0.0`, tuple compare treats -0.0 equal to 0.0? In Python, -0.0 == 0.0 True. So tie by id. Good. Median of -0.0 and 0.0 maybe 0.0? (-0.0 +0.0)/2 = 0.0. OK.

Now, one subtle bug with bytearray side: When an element is removed, we set where[idx]=0. But there may be invalid entries for that idx in both heaps if it was moved and an old entry somehow remains? We argued no. But let's test moving with duplicate values and stale invalid? Suppose idx0 value5 in low, move to high: pop low, push high. There is no low entry. Remove idx0: where0=0; high entry invalid. Good. No low entry. If idx0 had an invalid low entry from earlier? It couldn't because if it had been removed earlier, not active. Good.

Now, if we move an element multiple times, there is exactly one entry. Good.

Let's maybe add comments explaining side values. Code:
```
# side[idx]: 0 = removed, 1 = low, 2 = high
```

Now, should we use `nonlocal` in `add` and `remove`? Yes. `median` no.

Potential issue: Python's `nonlocal` cannot refer to variables defined in a comprehension? no.

Let's write final code:

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    side = bytearray(n)
    low_count = 0
    high_count = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_low():
        while low and side[low[0][1]] == 0:
            heappop(low)

    def prune_high():
        while high and side[high[0][1]] == 0:
            heappop(high)

    def add(idx, value):
        nonlocal low_count, high_count
        if low_count == 0 and high_count == 0:
            heappush(low, (-value, idx))
            side[idx] = 1
            low_count += 1
        elif low_count == 0:
            heappush(high, (value, idx))
            side[idx] = 2
            high_count += 1
        else:
            prune_low()
            if value <= -low[0][0]:
                heappush(low, (-value, idx))
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, (value, idx))
                side[idx] = 2
                high_count += 1

        while low_count > high_count + 1:
            prune_low()
            neg_val, old_idx = heappop(low)
            side[old_idx] = 2
            heappush(high, (-neg_val, old_idx))
            low_count -= 1
            high_count += 1

        while high_count > low_count:
            prune_high()
            val, old_idx = heappop(high)
            side[old_idx] = 1
            heappush(low, (-val, old_idx))
            high_count -= 1
            low_count += 1

    def remove(idx):
        nonlocal low_count, high_count
        s = side[idx]
        if s == 1:
            low_count -= 1
        elif s == 2:
            high_count -= 1
        side[idx] = 0

    def median():
        prune_low()
        prune_high()
        if k & 1:
            return float(-low[0][0])
        return (-low[0][0] + high[0][0]) * 0.5

    result = []
    for i in range(k):
        add(i, nums[i])
    result.append(median())

    for i in range(n - k):
        remove(i)
        add(i + k, nums[i + k])
        result.append(median())

    return result
```

Need ensure `side[idx] = 2` before or after heappush? If heappush triggers any prune? no. But if heap entry pushed and then side set, no external. In rebalance move: we pop old heap, then set side before push. If push raises? no. If side set before push, and then median? no. Good.

But there is a potential race in add: In branch low_count ==0 and high_count>0, we push to high and set side after push. Then before side set? No code between. But if `heappush` somehow triggers prune? no. OK.

Now, if remove idx with s=0 (shouldn't), neither count decremented. Could we have an old invalid entry for an index that hasn't been removed? side=0. For remove active, s nonzero. Good.

Let's consider if `remove(i)` can be called on an index that has already been popped as invalid from heap but still considered active? That would require side=0 before removal, which would mean we marked it removed earlier. Not. But what if an active element's side is 0 because its index was overwritten by another active? Bytearray index unique. OK.

Now, one concern: In `median()`, for even k, after `prune_low()` and `prune_high()`, if `high` is empty but `k` even, this would mean high_count=0 due counts wrong. But for k even and total k, high_count=low_count=k/2 >0. OK.

Now, let's think if using bytearray length n and values 1/2; when we move old_idx from low to high, we set side[old_idx] = 2. But what if old_idx was removed (side=0) and prune_low failed to pop because side value not 0 due to side stale? prune_low pops side==0. If side stale nonzero for removed idx, invalid. But remove sets side0. OK.

Now, can there be active index with side 0 due to not yet inserted? If its index appears in heap? no. Good.

Potential issue: For values that compare equal but different signs, tuple tie by id can cause heap top with same value but side not matching? side matches entry. OK.

Now, maybe we can optimize `add` by not cleaning low if low_count == high_count? No need.

Let's check if median output for k even when low/high contain values equal but due invalid top? We clean. Good.

Now, possible problem with using `low[0][0]` after `prune_low()` when `low_count > 0` but low heap contains only invalid entries because valid low entries are in high? That would mean side counts mismatched. Could this happen due to remove branch s=0? Not if bug. But for safety, we could adjust if `not low` after prune and low_count > 0: push to high? Not correct. Better to keep invariant.

Let's think about rebalance loop conditions. We use `while high_count > low_count`. This will move until high_count <= low_count. For odd total, we want low_count = high_count +1, so high_count > low_count false. For even equal false. For after insertion with total current not necessarily k during init, it also enforces low_count >= high_count. Good. For total even, high_count cannot > low_count. For total odd, after insertion maybe low_count = high_count? while high>low moves one to low, resulting low=high+1. Good.

Now, with low_count > high_count +1 loop. Could both loops run in same add? Suppose before add total k-1 maybe low_count > high_count? Add to low could make low > high+1, move to high, then high maybe > low? No, moving one from low to high reduces difference by 2. If difference before move was d >1. After move difference d-2. If d=3, diff becomes1, high not > low. If d=2, diff0, not >. If d=1, not move. So only one loop. Similarly high loop only one. Good.

But during initialization, total current small, after add could high_count > low_count by maybe 1 (if inserted to high). Move one. Good.

Now, let's test with a random small brute mentally maybe one more complex. nums=[4,2,7,5], k=3.
Init:
idx0 4: low(4) L1
idx1 2: value<=4 low L2; move top4 to high (idx0) L1 H1. low2 high4.
idx2 7: low top2, 7>2 high H2; rebal H>L: move high top4 to low. low top4? low entries 2,4; high7. counts L2 H1. median4.
Slide i=0 remove idx0 value4 side low (where idx0 after move? yes moved to low during rebal? Wait idx0 4 moved to high after idx1, then when idx2 added high had 4,7, move high top4 idx0 to low. side idx0=1 low. Remove: L1 (idx1 val2), H1 (idx2 val7), where0=0. Add idx3 5: low top2 valid, 5>2 high H2. Rebal H>L (2>1): prune_high top? high entries (5,3),(7,2), top5 active, move idx3 to low. L2 (2,5), H1(7). median5. Sorted [2,7,5] median5. OK.
Slide remove idx1 2 side low: L1 (5), H1(7). if n>4 add? none. Good.

Now, consider if remove idx3 side high later: high invalid, median clean. Good.

Now, let's consider if in add branch low_count >0 but `prune_low()` pops all invalid low top entries and reveals low heap empty while low_count>0 due low active entries in high? impossible.

Now, maybe using `bytearray(n)` and indexing by tuple element `low[0][1]` which is int. If n huge, index within. OK.

Potential issue with `side` name shadows built-in? no.

Now, perhaps final answer should not include comments? Comments okay. But if code only, comments fine. Ensure no example. Good.

Let's think if there is a simpler method using `statistics.median` per window? O(nk) too slow. no.

Could we implement two heaps with lazy deletion by value and accepted? But ID bytearray is nice.

Now, let's consider if moving element updates side but there may be an old invalid entry with same idx because the element was removed and then reinserted with same index? no.

Now, possible hidden test: `nums` length 200000, k=1000, values random floats. Our algorithm O(n log n) with heap size grows due invalid entries not pruned immediately. Heap size can approach n? Let's analyze heap size worst-case. Each insert adds one entry. Moves pop one and push one, net no size increase for moves (push and pop). Removed entries remain until popped. At most n inserted entries. So heap size <= n + maybe? Insertions n, moves push n but pop moves too, net not increase beyond insertions plus initial? If a move push for active element, it pops existing entry, net 0. So total heap entries ever = n; current heap size = active k + invalid not popped <= n. Good. O(n). For k=1000, n=200k. Good.

Now, potential time from bytearray `side[low[0][1]] == 0` if many invalid entries below top never cleaned, but heap operations log heap size with many invalid entries; heap size up to n, log18. OK. If many invalid entries accumulate, heappush/pop cost slightly higher but still.

Now, is there any possibility that the top of a heap is invalid but `side` value nonzero because side was updated for a move? No, removed sets 0. Active entries only one. Good.

Let's think about using `side` bytearray for active side. For invalid top, side==0. For an active element in low, side==1; in high, side==2. If an invalid element removed and later its index appears in the other heap as stale due to previous move? no. If it did and side==0, prune would pop when top in that heap. But if stale invalid entry not top, remains. no.

Potential issue: When we remove old index, if it is currently not top and later we move elements, could we move an invalid entry with same index? It remains side0, but if it's not top, no. If it becomes top, prune pops. OK.

Now, maybe we should prune low and high after removal before add? Not needed. But if we don't, `add` branch low_count==0 high_count>0 may not clean low invalid; but insert high and rebalance. If high top invalid, prune_high. Good. If low invalid and low_count becomes >0 via moving high to low? Suppose low_count=0 high_count=1, low heap invalid top large. Add to high, rebalance moves high min to low, low_count=1. Now low heap top invalid large, low_count1. Median calls prune_low and pops invalid. But if no median before next add? There is median appended after rebalance. So prune. If we didn't output until after next add? We do. But even if multiple slides without median? no.

Could invalid low top affect insert decision in next slide before median? There is median before next slide; it cleans. Good. If result append median maybe expensive but needed. If n-k loop, yes median each window. So top invalid cleaned.

Now, could invalid high top affect insert decision? Add decision uses low top only. But partition active maybe high invalid smaller than new, and insert value goes high. Rebalance if high too large cleans high. If no rebalance and no median? median cleans. OK.

Now, let's check if result append after median uses `k & 1` closure; k int. Good.

Now, if k = len(nums) and n-k = 0, loop skip. Good.

Now, let's consider if `ValueError` message. fine.

Potential issue with type hint and `list[float]` if user passes tuple? type hint not enforced. len and indexing works if sequence but bytearray n. If `nums` not list but sequence with indices, ok. Not needed.

Now, let's think about if `nums` values include `complex`? no.

Now, maybe use `math.fsum` for average? Not needed. `(a+b)/2` may have rounding; standard mean of two floats maybe expected exact? If values large with cancellation, e.g. a=1e308, b=-1e308, sum 0 but actual median 0; OK. If a=1e308, b=1e308, sum inf due overflow; using `(a+b)*0.5` overflows to inf even though mean 1e308 finite? In Python float: 1e308 + 1e308 = inf, *0.5 = inf. The mathematical mean 1e308 is finite. To avoid overflow, compute `a/2 + b/2`? If both 1e308, a/2+b/2 = 1e308. If a=1e308,b=1e308. If a=1e308,b=-1e308, half sum = 0. But `a/2 + b/2` may avoid overflow for large same sign, but can underflow? We can use `(a / 2) + (b / 2)`. For typical tests, not critical, but to be robust with large floats, use `a / 2.0 + b / 2.0` or `0.5 * a + 0.5 * b`. If a=1e308, b=1e308, 0.5*a =5e307 +5e307=1e308 finite. If a=1.7e308,b=1.7e308 near max? 1.7e308/2=8.5e307+8.5e307=1.7e308 finite. If a=max float, b=max float, sum overflow; half sum avoids. For average of opposite signs, half sum can still overflow? no. Use `low_val / 2.0 + high_val / 2.0`. That is more robust. Need ensure if one inf: inf/2 + inf/2 = inf; inf/2 + -inf/2 = nan. If low_val=inf, high_val=inf, mathematical median inf; half sum inf. If both max finite, good. If one max, other -max, half sum 0. Good. Let's use:
```
return -low[0][0] / 2.0 + high[0][0] / 2.0
```
But operator precedence: `(-low[0][0]) / 2.0 + high[0][0] / 2.0`. Use variables for clarity:
```
left = -low[0][0]
right = high[0][0]
return left / 2.0 + right / 2.0
```
For median of even large floats. Return float. If values ints, float. Good. For odd return float. Could also use `statistics.mean` but not.

But if left and right are huge opposite and one is inf? inf/2 + -inf/2 = nan; standard (inf + -inf)/2 = nan. OK.

Now, consider if values are `Decimal`? type float, no.

Let's include in median:
```
        if k & 1:
            return float(-low[0][0])
        left = -low[0][0]
        right = high[0][0]
        return left / 2.0 + right / 2.0
```
If low/high are floats, division yields float. If ints, float. Good.

Now, potential micro-optimization: In median, `low[0][0]` accessed multiple; use `low_val = -low[0][0]`. OK.

Now, let's consider if using bytearray side and `prune_low` inside median for odd k where high not needed? We prune high unnecessarily maybe overhead. Could optimize:
```
if k & 1:
  prune_low()
  return float(-low[0][0])
prune_low(); prune_high(); ...
```
But if k odd, high invalid top doesn't affect median. However not pruning high might let invalid high top accumulate and affect future insert/rebalance? Future rebalance may prune high when moving. Insert decision uses low. If high invalid top never pruned until needed. Could reduce overhead. But for even windows we need high. If k fixed odd, median won't call prune_high. But high invalid top could accumulate; when rebalance needs move high, prune_high pops. If never rebalance? e.g. k=1, high always 0. OK. If k=3, high_count 1, high invalid top maybe; when sliding remove/add, rebalance may sometimes move high to low or low to high. It will prune when moving. If no rebalance and median only low, high invalid top might grow but heap size O(n). Not issue. We can optimize median to only prune needed heaps. But be careful: If k odd and high heap top invalid but high_count>0, and later insert decision? uses low top. If low top valid. Rebalance if high_count > low_count uses prune_high. OK. So we can only prune low for odd, and prune low+high for even. But if k odd, after removal/add, high_count and low_count invariant; median low top valid. Good. This reduces operations. But code simplicity maybe prune both. Performance not issue. Could implement efficient:
```
    def median():
        if k & 1:
            prune_low()
            return float(-low[0][0])
        prune_low(); prune_high()
        return (-low[0][0]) / 2.0 + high[0][0] / 2.0
```
For even need high top valid. But if high top invalid and high_count>0, prune. Good.
Should we prune high for odd to prevent heap top invalid blocking? Not necessary. But if high top invalid and later we need high top for rebalance, then prune. Fine. For even we do.

However, for even k, after median prunes high top. For odd, high invalid top might remain. Suppose future slide add branch low_count>0 uses low top only. Rebalance if high_count > low_count: prune_high. If no high move, invalid high top remains. Could it affect `add` when low_count==0 and high_count>0? This branch inserts to high without pruning; then rebalance high>low calls prune_high. OK. So fine.

Could odd median leave low invalid top? It prunes low. Good.

For even, if high top invalid but high_count=0? not for even. Good.

Maybe use conditional median for speed.

Now, initialization and slide rebalance: Should we prune low/high at start of remove? Not needed. But if low_count >0 and low top invalid from previous odd window (if k odd and median didn't prune high only, but low was pruned). For even median prunes both. For odd median prunes low. So low top valid after median. After remove, if we remove low top, low top invalid. Add branch clean_low. Good.

If k odd, high top invalid after median remains. If after removal/add high_count > low_count, rebalance prune_high. If high top invalid and not moved? If no rebalance, high invalid remains. Next median odd doesn't prune high, but high invalid doesn't affect median. Could high invalid top affect future rebalance? Yes prune_high then. OK.

Now, if k odd and after many slides high invalid top grows, heap size high O(n), but heap operations log n. Could it affect median if k becomes even? k fixed. If k odd, high not used. But high heap operations still when insert maybe push high. If high top invalid and never moved, heappush still O(log n) with invalid top. Not problem. But could invalid high top with very small value prevent active high from being top when rebalance needs min high; then prune_high pops all invalid smaller at that time. Total pops bounded. OK.

Now, let's think about using `side` bytearray to detect invalid top; if high invalid top has side=0. OK.

Now, maybe `median()` should be `result.append(...)` not function? Could inline. Fine.

Let's consider final code with conditional median and add closure. Should we include `if not nums and k == 0`? k<1 raise. Good.

Potential issue with `ValueError` if `k` not int and comparison with len? not.

Now, let's maybe test final algorithm with a case where k odd and high invalid top not pruned, then later k odd but add branch uses low top. Suppose high invalid top very small, active high large. Add large value to high, rebalance? For k=3, after remove low? Let's simulate. nums [1,2,3] k=3 init low2 high3. Slide remove1 low -> low_count1 (2) high1 (3). Add4 high_count2. Rebalance high>low: prune_high top3 active move to low. low_count2 high1 (4). median2? Window [2,3,4] median3? Wait low entries after move: low had 2, moved 3, top3; high4. median3. Good. No invalid high.

Need high invalid top from removing high. Example [1,3,2]? init [1,3,2]: add1 low; add3 high; add2 compare2<=1 false high, high2 low1 rebal move high top2 low. low entries 1,2; high3. Slide remove1 low -> low1 (2) high1 (3). Add4 high -> high2 low1 rebal move high top3 low -> low3,2 high4. Remove high? next slide remove index1? Suppose nums [1,3,2,5,4]? After first slide window [3,2,4], low entries 2(idx1? value2) and3(idx3?) high4. Remove old idx1 value2 low non-top? low top3. no invalid top. Need high invalid top: after median, high top active. Remove high element, then high top invalid. In sliding, remove old index which may be in high and be high top. Example after some window high top is oldest index. For [1,2,3] k=3 init low2 high3; slide remove1 low not high. Add4 rebal move3 low? Actually high becomes4, low2,3. Next slide remove2 low (idx1) not high. Next remove3 low? high4 not top? high top4. To remove high top, need old index in high. For k=3, high size1 may contain oldest high maybe removed eventually. Suppose [1,3,4]? init add1 low, add3 high, add4 high rebal move3 low; high4. Slide remove1 low, add5 high high2 low2 rebal move high top4 low; high5. Remove3 low? idx1 value3 low. Remove4 low? idx2 value4 low. So high top oldest may be removed later after moved to low? With tie moving lower ids to high, maybe high contains old ids and removed from high. For all duplicates, high contains old ids; remove old high top invalid. For odd k, median prunes low not high, so high invalid top could remain. Example all duplicates k=3. Init: add idx0 low, idx1 low rebal move idx0 high, idx2 low? Let's simulate: idx0 L; idx1 L->move idx0 H, L idx1. idx2 value equal <= low top idx1? low top (-5,1), push idx2 L, low_count2 high1 rebal low>high+1: move low top idx1 to H. Low idx2, high idx0, idx1. median low idx2. Slide remove idx0 high top invalid; low_count1 high_count2? remove high_count-- => high1? Wait high_count before 2, after 1. Add idx3 equal: low_count1, low top idx2 valid, equal -> low low_count2 high1. Rebalance low>high+1? 2>2 no. median low top? low heap top idx2 (id smaller than idx3) value. high top invalid idx0 where0=0, high active idx1. Median odd prunes low only, returns value. high invalid top remains. Next slide remove idx1? window indices 1,2,3? Remove old idx1 high active? where idx1=2, high_count-- (now high_count? Before remove after previous add: low_count2 (idx2,idx3), high_count1 (idx1), plus invalid idx0 top. remove idx1 high -> high_count0, where idx1=0. Add idx4 equal: low_count2, value<=low top? low top idx2, -> low low_count3. Rebalance low>high+1: prune_low top idx2 active, move idx2 to high. low_count2 high_count1. high heap has invalid idx0, invalid idx1? and active idx2. high top invalid idx0. Median odd prunes low only. Next slide remove idx2? where idx2=1 low, low_count1. Add idx5 equal: low_count1, value<=low top? low top idx3? (low entries idx3,idx5? after moves) compare equal <= low top, low_count2. Rebalance low>high+1? 2>2? high_count1, low2, not >2. No prune high. high invalid top remains. Eventually when high_count > low_count? For odd k, after remove/add, high_count can become > low_count? Let's see all duplicates with tie moves lower ids to high, high invalid top remains. Rebalance may move high to low if high_count>low_count. For k=3, after remove high and add low, sizes low? remove high: low2 high0; add low -> low3 high0, rebalance low>2 move one to high. So high gets active maybe after high top invalid prune_low? no. High invalid top remains. If high_count becomes >low_count, then prune_high. Could happen if remove low and add high. Example low_count1 high2 after remove low? For k=3 remove low -> low1 high1, add high -> low1 high2, rebalance high>low: prune_high pops invalid idx0, idx1 maybe invalid, then active min high to low. This cleans high invalids. OK. So invalid high entries eventually cleaned when needed. Heap size O(n). Good.

But one concern: high invalid top remains and high heap top invalid can make heappush operations O(log high_size). high_size could be O(n). Still fine. But if k odd, many invalid high entries accumulate and never popped if no high moves? For all duplicates above, high_count remains 1 but high heap has many invalid entries; high_size grows O(n). Insert to low mostly, rebalance low>high+1 moves low to high, not prune high? Wait when moving low to high, we `heappush(high, ...)`, not clean high. If high top invalid, push new high maybe value equal, tuple id larger, top invalid remains. high_size grows with moves. For all duplicates odd k, many active moves to high, but high active count only 1, invalid entries accumulate. Heap size high O(n). Heappush O(log n). OK. Could total heap size high O(n) and low O(n). Memory still O(n). Fine.

But could invalid high top affect partition if high active min is buried below invalids? When we need to move high to low or compute even median, prune_high pops invalids until active. Total pops O(n). OK.

Now, maybe using `bytearray(n)` and not dict has one downside: if we use `side[idx] == 0` to detect invalid, but for indices not yet inserted side=0. Could an inserted active entry with idx have side=0 due to bytearray initial if we forgot set? We set. Good.

Now, let's think about if `nums` has length > 255 and bytearray values 1/2. OK.

Potential issue: In remove, if s == 0 (bug) we set 0 and counts unchanged, causing total count mismatch. Could we guard and maybe recover by looking at heaps? Not needed. But maybe there is a legitimate case where remove index side=0 because the index was moved? No, move sets side to 1/2. If index in window and not removed, active. The only way side=0 is if index was already removed or not inserted. Sliding removes each index exactly once before it leaves window. Since we inserted all first k indices and then each new, when i from 0 to n-k-1, index i is in current window before removal. It was inserted and not removed before. It could have been moved, side nonzero. So s !=0. Good.

Now, let's consider if `nums` length n and k=n. We insert indices 0..n-1. No removals. side active. OK.

Now, maybe there is a simpler invariant: maintain low_count = (k+1)//2 and high_count = k//2 exactly after rebalance. We don't need while counts relative to total? Our loops do. Good.

Now, one possible hidden issue: Python's `heapq` tuple compare for high entries `(value, idx)` if value is NaN. For all duplicate values, tie id. OK.

Now, let's consider if there are values that compare equal but one is `float('nan')` and another value: In tuple compare, if first elements not equal (NaN == value false, and not `==`? Tuple comparison uses `PyObject_RichComparePyBool` with Py_EQ? Let's recall: For tuple compare, it iterates and checks `cmp = PyObject_RichCompareBool(item1, item2, Py_EQ); if cmp == -1 error; if cmp != 1: return cmp < 0?` Actually if not equal, it compares with `<`. For NaN, `NaN < value` false, `value < NaN` false, order maybe based on second if first equality? If first not equal (NaN != value), then it compares `<`. Since both `<` false? It may return false for NaN<value, then order? Could break heap but no.

Not required.

Now, maybe code should import `heapq` only. Good.

Let's think if using `list[float]` type and returning `list[float]`. Good.

Now, final answer should not include analysis. Just code block. Good.

Let's maybe consider adding type ignore? no.

Now, let's verify with another possible tricky sequence where side counts and heap entries maybe inconsistent due to moving an element that was removed but not cleaned because where nonzero? no.

Let's run a small sequence manually where high invalid top accumulates and then even? k fixed even so median prunes high each time. For k=2 duplicates: high invalid top removed, median prunes high each window, so clean. For k odd, median doesn't prune high, but even not. OK.

Now, if k=1, high always empty. `add` branch low_count? After first init low1. Slide remove low_count0 high0; add branch both0 push low. Rebalance none. median odd prune low. high clean not called. Good. Heaps low size grows by n due invalid entries not pruned? median prune_low pops invalid top each time? For k=1, low heap contains all inserted entries because no moves and high empty. Remove sets side0. median prune_low pops top invalid if it is top. For descending values? Let's see max heap. Values decreasing: insert 100, remove, insert90. Low entries (-100,0),(-90,1); top -100 invalid? Actually max heap entry most negative: -100 (for 100) vs -90; -100 smaller top. removed 100 top, prune pops, top 90. Good. If increasing: insert1, remove, insert2. Low entries (-1,0),(-2,1); top -2 (value2) active, invalid 1 below. median returns 2, invalid not popped. heap size grows n with invalid buried. k=1, each median prune_low sees top active if new max; invalid below never popped. heap size n. Heappush O(log n) ~18, OK. Memory n. Could we clean buried invalid? no. But heap size n. For k=1 n=200k, low heap 200k entries, fine. Time heap ops log n ~18. Good. If values decreasing, invalid top popped each time, heap size stays 1. If increasing, invalid buried, heap size n. OK.

Now, potential issue with `where` bytearray for k=1 increasing: low top active where=1, invalid lower entries where=0 not pruned. Heappush with invalid entries in heap: heap property with invalid values below active. Since active max is top, invalid smaller. OK. If later active removed and new smaller becomes top? Example increasing then new smaller: heap contains invalids and new maybe not max? Let's simulate k=1 values 1,2,0. After 1 remove, heap (-1,0) invalid. Insert2 top (-2,1) active. Insert0 after remove2: top active? Before insert median pruned low top active 2. Remove2 side0 low_count0. Insert0 branch push low (-0,2). Low heap top (-2,1) invalid (value2) now top? Entry -2 (for value2) vs 0 (for value0): -2 smaller top invalid. low_count1. median prune_low pops invalid, then top 0? Actually entry (0,2) corresponds value -0? value0 => -0=0. Top? Also invalid -1? (-1) smaller than 0, so after pop -2, top (-1,0) invalid, pop, then (0,2). OK. Total pops bounded. Good.

Now, if values large and negative? For max heap low entries negative. Similar.

Now, let's think about if moving active entries can increase heap invalid count? Moves pop active and push active; if old heap had invalid below, not. OK.

Now, maybe in `add`, after `prune_low()`, if low heap becomes empty and low_count == 0? But branch low_count >0, so low_count not zero. If low heap empty but low_count>0 impossible. If due to k=1 decreasing? low_count after removal? Before add low_count=0 because remove set 0. Branch low_count==0 high_count==0 push low. So no.

Now, potential hidden bug: `where` bytearray initialized with zeros. When an element is moved from low to high, we set `where[old_idx] = 2`. But what about if `old_idx` was previously removed and popped invalid? Then it wouldn't be top because prune_low removes where0. OK.

Now, let's consider if the same index can be inserted more than once? No.

Now, maybe the median of even k should return float even if both ints. Our formula returns float because division by 2.0. Odd returns float. Good.

Now, let's consider if values are `int` and `-low[0][0]` int, dividing by 2.0 float. Good.

Now, final code can include `# side: 0 = deleted, 1 = lower heap, 2 = upper heap`. Good.

Now, one more possible approach: using `heapq.merge`? no.

Now, let's think if there is any issue with using `while high_count > low_count` after insertion for total current less than k during initialization. For total current 1, low1 high0; for 2, if insert high low1 high1; for 3, insert high maybe low1 high2 -> move to low low2 high1. Good. For total 4, low2 high2. Good.

Now, if during initialization we insert a very small value repeatedly: low grows, rebalance moves max to high. For values [100,1,2] k=3: add100 low; add1 low move100 high; add2 low? low top1, 2>1 -> high (high 100,2) high2 low1 rebal move high top2 low => low2,1 high100. median2. Sorted [100,1,2] median2. Good.

Now, if inserting values causes moving high top invalid? During init no invalid. Good.

Now, maybe we can remove the `low_count == 0 and high_count == 0` special case and just use `elif low_count == 0: push high if high_count else low`. Already. If both zero, high_count==0 so low. Code:
```
if low_count == 0:
    if high_count:
        push high...
    else:
        push low...
else: ...
```
Simpler. Let's write:
```
        if low_count == 0:
            if high_count == 0:
                heappush(low, ...)
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, ...)
                side[idx] = 2
                high_count += 1
        else:
            ...
```
This avoids condition and branch. Good.

Potential speed: `if not low_count:`. OK.

Now, maybe we need to prune low after `low_count == 0` before push high? If low heap has invalid top, we ignore. Fine. If high heap top invalid, rebalance will clean. If no rebalance? Suppose low_count=0 high_count=1, insert high -> high_count=2, rebalance high>low moves min to low. clean_high called. Good. If high_count=0, push low. OK.

Now, let's test case after remove high low_count>0 high_count=0, low top invalid? Can that happen? If low top removed? If we removed high, low top still active (unless low top invalid from prior but median cleaned if even/odd? For odd, median cleaned low; even cleaned low). Remove high doesn't remove low, so low top active. clean_low in add maybe pops if stale. OK.

Now, maybe after odd median not pruning high, high top invalid could be in high, and then remove high active? If high top invalid but active high elsewhere. When removing old index, if old index active and maybe not top, side works. If remove active high that is below invalid top, high_count--. High top invalid remains. Add branch maybe low_count>0. Insert decision uses low. If rebalance needs high min, prune high. OK.

Now, potential issue with heap `where` side when an active element in high but there are invalid entries with same value and smaller IDs; when median even prunes high, it pops invalid entries. If active high element has value equal to invalid, tuple comparison will put smaller invalid ID before active. clean_high pops invalid, then active. Good. If invalid value smaller than active, top invalid; popped. If invalid value larger, active top; not popped. OK.

Now, final code should use no `typing` imports. Good.

Let's consider adding `__slots__`? no.

Now, maybe need to handle `k` larger than `len(nums)` but if `nums` is not list, len maybe not. type says list.

Now, could there be issue with `side = bytearray(n)` when n > sys.maxsize? no.

Now, let's think about correctness proof for side bytearray if tests inspect? Not needed.

Now, maybe final answer should include only code, no explanation. Yes.

Double-check syntax:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    side = bytearray(n)
    low_count = 0
    high_count = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_low():
        while low and side[low[0][1]] == 0:
            heappop(low)

    def prune_high():
        while high and side[high[0][1]] == 0:
            heappop(high)

    def add(idx: int, value: float) -> None:
        nonlocal low_count, high_count
        if low_count == 0:
            if high_count == 0:
                heappush(low, (-value, idx))
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, (value, idx))
                side[idx] = 2
                high_count += 1
        else:
            prune_low()
            if value <= -low[0][0]:
                heappush(low, (-value, idx))
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, (value, idx))
                side[idx] = 2
                high_count += 1

        while low_count > high_count + 1:
            prune_low()
            neg_val, moved = heappop(low)
            side[moved] = 2
            heappush(high, (-neg_val, moved))
            low_count -= 1
            high_count += 1

        while high_count > low_count:
            prune_high()
            val, moved = heappop(high)
            side[moved] = 1
            heappush(low, (-val, moved))
            high_count -= 1
            low_count += 1

    def remove(idx: int) -> None:
        nonlocal low_count, high_count
        s = side[idx]
        if s == 1:
            low_count -= 1
        elif s == 2:
            high_count -= 1
        side[idx] = 0

    def median() -> float:
        if k & 1:
            prune_low()
            return float(-low[0][0])
        prune_low()
        prune_high()
        left = -low[0][0]
        right = high[0][0]
        return left / 2.0 + right / 2.0

    result: list[float] = []
    for i in range(k):
        add(i, nums[i])

    result.append(median())
    for i in range(n - k):
        remove(i)
        add(i + k, nums[i + k])
        result.append(median())

    return result
```

Check if in median odd, if k=1 and low heap contains invalid top? prune_low pops. Good. If high invalid not pruned but high not used. OK. If after many odd medians low top valid. Good.

One subtle issue: For odd k, median doesn't prune high, but what if low top valid but high top invalid affects future partition? Partition active high min might be buried. When inserting a value, we compare to low max; if value > low max, we insert to high. But if active high min is smaller than value but buried below invalid smaller entries, we insert to high anyway because value > low max. That's correct for partition: any value > low max belongs to upper half, regardless of high min (which should be >= low max). If high active min maybe < low max due invalid? active partition should hold. If active high min < low max due previous issue, inserting could worsen. But active partition maintained independent of high top. Invalid high smaller entries don't indicate active high. OK.

What if active high min < low max due previous odd not pruning high? Could that happen? Rebalance moves preserve active partition. Insert branch based on low max. If low_count=0 and high_count>0, we insert high then rebalance; active partition. If low_count>0 and insert value <= low max to low or > to high. Suppose active partition held. Remove preserves. So active partition holds. Invalid high entries don't matter. OK.

Now, potential issue with side bytearray: if `idx` is negative? range i+k nonnegative. OK.

Now, consider if `nums` values are `int` and `value <= -low[0][0]` where `-low[0][0]` could be `bool`? no.

Now, if k is 0 and n=0, raise. Good.

Now, maybe final code should not use `list[float]` annotation for result inside function? It's fine. If Python 3.11, no issue.

Now, let's consider if there is any problem with closures and `nonlocal` in nested functions with type annotations? fine.

Potential performance issue: `result.append(median())` calls median which prunes. For k odd, not prune high. For even, prune both. Good.

Could we preallocate result to avoid append? Not necessary. But if using append with type list, fine.

Now, let's think if `heapq` functions from C might not be used if `heapq.heappush` Python? In CPython, `_heapq` overrides. Good.

Now, any problem with `bytearray(n)` if n maybe 200000 but k maybe 200000. `side` entries for all inserted active. OK.

Now, let's see if we can remove `side[idx] = 0` after popping invalid entries in prune? Already side is 0; no need.

Now, one edge: When moving `moved` from low to high, we set `side[moved] = 2` and push high. But if the `moved` element had been removed? clean_low would pop where0, so not. If the `moved` element's side is 2 already (stale), then moving would not happen because in low? If stale active high entry in low side2, prune_low would not pop, and move would set side2 again push high. That would be bad. But no stale.

Now, maybe there is an issue if we use index as heap tie-breaker and move lower IDs. When moving from high to low, high top with min value and smallest id. If there are duplicates, side updates. OK.

Now, let's consider a possible hidden bug in `remove`: We set `side[idx] = 0` even if `s == 0` (bug). If `s == 0`, counts not changed but set0. Could lead to total counts mismatch and later errors. But impossible. To be defensive, maybe if `s == 0: return`? But that hides. Could assert? no. We can leave.

Now, let's reason about active counts invariant with `side`: At any time after rebalance and before median, low_count + high_count = current window size (k after init/slide; during add after remove k-1 before add; but counts updated accordingly). Remove decrements, add increments. Moves swap. Good. If `s==0` impossible. Good.

Now, maybe after initialization, `side` has active entries for all indices <k. Some may be in high. Good.

Now, could the heap top have side 1 but the entry is in high? That would mean stale. no. If it did, median high? For high heap top side 1, prune_high only checks side==0, so would treat it active high. But high_count counts based on side=2. If stale high entry side1, counts mismatch. But no.

Now, let's think if using `bytearray` for side with value 1 for low and 2 for high might conflict with active index whose side should be 0 but bytearray uninitialized? no.

Now, perhaps we can improve `prune_low`/`high` by binding `side` local? It is closure. Good.

Now, final answer. Need ensure no print. Good.

Before final, let's maybe explore alternative Fenwick in case heaps have subtle NaN or duplicates? ID heaps robust. Could there be a bug with moving only one in rebalance when total not target k and branch low_count=0 high_count>0 causing multiple moves if high_count large? As argued state not reached. But even if high_count large, multiple moves total could be O(k) in one add if invariant broken. Could that happen due to low_count=0 high_count>0 after remove from k=2 only high_count1. So safe. For k even? k=2 only. For k odd, after remove low_count at least1. For k=1, high_count0. Good.

Now, let's verify with k=2 and branch low_count=0 high_count=1 insertion high. Rebalance while high_count > low_count. If high_count after insertion 2, low_count0. It moves one; after move high_count1 low_count1. Stop. Good. Not multiple.

Now, if during initialization low_count==0 high_count>0? Not. If it did with high_count large due some weird order? Insertions start low, then low always >= high after rebalance, so low_count0 only before any insert. OK.

Now, possible issue in median even: We call prune_low then prune_high. What if pruning low moves invalid entries and then low heap top valid, but pruning high could pop high invalid top that is also in low? IDs unique, no. OK.

Now, if k even and high heap has invalid top and active high buried below invalid top. prune_high pops until active. Good. What if active high is buried below invalid entries with larger values? For min heap, invalid larger values won't block smaller active. If invalid smaller, popped. Good.

Now, maybe with tuple tie, invalid entry with same value but larger id could be below active smaller id? For high min, active might have larger id, invalid same value smaller id top? Then prune pops invalid, active top. Good.

Now, let's consider memory of tuple entries with `bytearray` side. Good.

Now, final answer code. Ensure code block language python. No tests. Good.
