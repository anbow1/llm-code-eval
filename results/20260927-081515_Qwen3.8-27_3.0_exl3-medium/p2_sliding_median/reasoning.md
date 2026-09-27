We need answer with single python code block. Need solve sliding median efficient for n=200k, k=1000. Need standard library only. Python 3.11+. Need likely implement O(n log k) using two heaps (maxheap for lower half, minheap for upper half) with lazy deletion, or sorted list? SortedList not stdlib. Heaps with lazy deletion can be O(n log k). Need be careful for even/odd median. Need floats.

We need write code only, no tests, no print, no input.

Let's design robust efficient sliding window median.

Approach: maintain two heaps: max_heap lower (store -x), min_heap upper (x). Need sizes balanced: len(lower) >= len(upper), and len(lower) - len(upper) <= 1. Total valid elements = k. For odd k (or current valid count odd), lower has one more, median = -lower[0]. For even, median = (-lower[0] + upper[0]) / 2.

Need handle sliding: for i from 0 to n-1: add nums[i]. Remove nums[i-k] when i >= k. But removal from heaps is O(log n) if we can remove arbitrary? Python heap doesn't support efficient arbitrary removal. Use lazy deletion: maintain dict counts of pending removals, clean top when stale. However for size balancing, we need track logical sizes. Could use valid_size? But to know lower/upper counts need logical sizes adjusted on removals. If we lazy delete, physical heap sizes include stale. We can maintain `lower_size`, `upper_size` logical counts. When add, push to appropriate heap and increment logical size. When remove value x, we need know which heap it belongs to logically? We can decide based on comparing to current medians? That can be tricky with duplicates. Alternative maintain counts of elements in each heap? For arbitrary removal we can just decrement `pending[x]`, and when clean top we pop stale and decrement logical size? But then logical size may not reflect removal immediately. Another way: Maintain two heaps and a `delayed` dict. Also maintain `lower_size`, `upper_size` as counts of valid elements currently in each heap (including stale? Actually if we increment at add and decrement when we actually pop stale, then sizes include stale until cleanup, causing imbalance issues. Need logical sizes that reflect valid elements only. For removal, we need to decrement the logical size of whichever heap the element belongs to. Need identify if x belongs to lower or upper.

Common approach: maintain max-heap `maxHeap` (negative) and min-heap `minHeap`, `maxSize`, `minSize` as logical counts. For removal, compare x to top? Not sufficient with duplicates. Use counts per heap? We can store for each value count in lower and upper? But values are floats; dictionary keys okay. On add, we can push to lower/upper and increment corresponding count dict and logical size. On remove, look up counts_lower[x] and counts_upper[x] to decide which heap the removed occurrence belongs to? But if duplicate values across heaps, counts tell how many in each. When removing x, if counts_lower[x] > 0 then it belongs to lower, decrement counts_lower, lower_size--; else counts_upper. Then add to delayed[x]++. This keeps logical sizes correct. Then rebalance heaps and clean tops before using median.

But rebalancing needs move elements between heaps; when moving, we need update counts dicts and logical sizes. We can clean top before moving. Let's design functions:

- `max_heap`: list of -value.
- `min_heap`: list of value.
- `lower_counts`: dict float -> int, number of valid elements assigned to lower (not yet lazily removed). `upper_counts`: same.
- `lower_size`, `upper_size`: logical valid counts.
- `delayed`: dict float -> int pending removals (values to ignore when encountered in heaps). But if we use counts dicts, delayed can be keyed by value. Need cleanup: while heap nonempty and delayed[value] > 0: pop, decrement delayed[value], and also? If the stale element was still counted in counts? Wait if we decrement counts at removal time, then stale element is no longer in counts. When popping stale, we should not decrement counts again. So counts represent valid elements only; delayed just number of stale entries in heap to ignore. At removal, we decrement counts and logical size, increment delayed. When popping stale, just decrement delayed; no counts change. Good.

But when moving valid top from one heap to other: need pop top, clean if stale? We can clean top first. Then pop value from source heap. Since it's valid (not stale), decrement source_counts[value], source_size--; push to dest heap, increment dest_counts[value], dest_size++. But if value duplicates, counts handle. Need be careful with negative representation.

Alternative: Instead of counts per heap, we can use `delayed` and maintain logical sizes as counts of valid elements in heaps but update at removal without knowing heap? Need know which heap for rebalancing. Could use a Fenwick/order statistics? No.

Counts per heap is okay.

Need add algorithm:

Add x:
1. Decide initial heap: If lower_size == 0 or x <= -max_heap[0] (after cleaning top?) Then push -x to max_heap, lower_size++, lower_counts[x]++.
   Else push x to min_heap, upper_size++, upper_counts[x]++.
But if max_heap top stale, need clean before comparing. So call `clean(max_heap, max_key, lower_counts?)`? Let's define `clean(heap, key)` removes stale tops based on delayed. Need no counts update.

Rebalance after add:
We want lower_size == upper_size or lower_size == upper_size + 1 (lower at least upper). If lower_size < upper_size: move one from upper to lower. If lower_size > upper_size + 1: move one from lower to upper.
Move requires cleaning source top then pop valid, update counts. For source=upper: `v = pop_valid(min_heap)` returns v; decrement upper_counts, upper_size; push to max_heap (-v), increment lower_counts, lower_size. For source=lower: v = -pop_valid(max_heap); decrement lower_counts; push to min_heap; increment upper_counts.

Then removal algorithm for value x leaving window:
1. Determine which heap has x logically: if lower_counts.get(x,0) > 0: remove from lower: lower_counts[x]-=1; lower_size--; else remove from upper. But what if x is present in both due to duplicates? It can be in both, and we choose lower first. Is that okay? For a multiset, any assignment of duplicate equal values across heaps is fine as long as order property holds. If we remove from lower when it exists, okay. Need increment delayed[x] by 1. But if x is in lower, we don't know if the specific heap entry is at top or not; lazy deletion will remove when encountered. But if there are multiple same values in lower, delayed count will ignore one. Good.
2. Rebalance as above.

But there is a subtle issue: after removal from lower, lower_size decreases. If lower was top and stale, delayed. If we later move elements, we clean tops. If the stale element is not top, counts have already been decremented, so logical sizes correct. The heap physical contains stale entries. The order property with logical elements still holds? We removed a logical element from lower (decrement count) but physical stale entry remains. The lower heap top may be stale with value maybe not the true maximum among valid lower elements. Clean will remove it when it reaches top. But if stale entry has high value and remains top, cleaning will pop it. If stale entry has low value buried, doesn't affect top. The property of max heap among valid elements? Since stale entries may violate (e.g., stale value larger than valid elements but not popped until top; when it's top, clean pops). The top after cleaning is valid maximum among all physical non-stale entries? Because heap includes stale entries; if a stale entry with high value is not top? In a max heap, max physical value is top. If stale high value, it will be top. Clean pops until top valid. Then top is max among valid physical entries? Yes because any valid entry with greater value would be above? Need proof: Heap property over all entries. After removing stale tops, top is max among remaining physical entries. Any stale non-top may have value greater than top? In a heap, if a node has greater value than root, impossible; root is max physical. But after popping stale roots, new root is max among remaining physical. If there is stale with value greater than valid top, it would be root. So cleaned top is max among valid entries. Good.

For min heap similar.

Potential issue: When comparing x <= -max_heap[0] during add, we need top valid. Clean first. But if max_heap empty, lower_size should be 0; if lower_size >0, there must be a valid top after cleaning. Unless all entries stale? If lower_size >0, there are valid entries in lower physical; top after cleaning valid.

Potential issue: counts with floats: -0.0? Floats may have -0.0 equal 0.0; dict keys treat equal, okay. NaN? nums list[float] maybe no NaN. If NaN, comparisons weird. We can ignore.

Need initial window building efficiently. We can either call add for first k elements then process medians. Or build by adding. O(k log k). n=200k, k=1000 fine. Need output length n-k+1.

But need ensure efficient enough in Python. n=200k, k=1000: operations ~400k heap pushes/pops, log 1000 ~10, dictionaries. Should be <2s likely. Need optimize local variables, avoid function call overhead? Could implement inside function with nested helpers maybe okay. 200k operations, maybe okay. But Python nested functions with dict lookups may be okay. We can optimize by using local variables and inline rebalance. Need be careful.

Alternative approach: use two heaps with delayed but not counts per heap? Could use two `heapq` and `collections.Counter`? We need know which heap for removal. Maybe compare to median? Let's think if counts per heap necessary. There is known algorithm: keep maxHeap lower, minHeap upper, `delete` set/counter. On remove x, we don't need know heap? We can do: if x <= -maxHeap[0] (after clean) then it belongs to maxHeap else minHeap. But with duplicates and stale, may misclassify? Example lower has [5,5], upper [5], remove 5. x <= top 5 true, remove from lower. Fine. If lower top stale? clean. But if x equal top and exists in both, choosing lower maybe okay. If x > top, must be upper? In valid invariant, all lower <= all upper. If x > lower top, x cannot be in lower (unless stale lower top less? But valid lower elements <= upper; if x > lower top, no valid lower element can be x? Actually if lower top is max lower. If x > max lower, x not in lower. So classification by x <= max lower works. But if lower top stale? clean. If lower is empty? Then x in upper. Could avoid counts per heap. However after lazy removals, logical sizes not updated? Need sizes. If we classify removal by comparing to current lower top, then decrement corresponding logical size. Does this work with duplicates if x == lower top but some copies in upper? If x == lower top, choosing lower is fine if lower has at least one x. But what if lower doesn't have x but x == lower top? That cannot happen if lower top is x; it has x. Unless top stale x but no valid x in lower? Clean removes stale top; if lower top after cleaning is x, then valid x in lower. If after cleaning lower top < x, choose upper. Good.

But issue: lower may have no valid elements? If lower_size=0, choose upper. If x <= top when lower_size>0. Need clean lower top. But if the x to remove is in lower but not max? If x < lower top, choose lower. Good. If x == lower top, choose lower. If x > lower top, choose upper. This classification seems valid under invariant lower values <= upper values. But with lazy stale entries, lower top after cleaning is max valid lower. If x is in lower but x > lower top? impossible. If x is in upper but x <= lower top? possible if duplicates across boundary. Choosing lower when lower has some x may remove a lower x instead of upper x. That is okay? Need maintain counts/invariant. If we remove a lower x instead of the specific upper x, multiset of logical elements remains same (just different occurrence). Since values equal, heap logical sets differ by moving one x from upper to lower? Actually if we decrement lower_size but the actual leaving element was in upper, the logical multiset of remaining valid elements is same as before (because duplicate). The physical heaps: we increment delayed[x] for upper? But we don't know which heap to mark stale. We just increment delayed[x] globally. Suppose we classify as lower, lower_size--, delayed[x]++. But the stale entry that will be popped might be in upper if the leaving element was upper. Then lower logical size decremented but no stale lower entry popped; lower physical still has a valid x, but logical lower count is one less. Invariant broken: lower_size no longer equals number of valid lower entries. Eventually cleaning upper stale will not adjust lower_size. So classification must correspond to a heap in which there is a physical valid entry to be considered stale. If duplicates across heaps, choosing lower when there is lower x is okay if the leaving element could be considered that lower x. The actual multiset doesn't distinguish, so we can conceptually remove the lower x; then the stale entry should be in lower. But delayed[x] is global; when we later encounter x in lower, we'll pop it; if we encounter x in upper first, we'd decrement delayed and remove a valid upper x erroneously? This is the classic problem: delayed count per value globally can misassign stale entries across heaps when duplicates. We need per-heap delayed or counts to avoid this. Example: lower has x, upper has x. Remove x classified lower, delayed[x]=1. Upper top x is valid, but clean sees delayed[x]>0 and pops upper x, reducing physical upper, but logical upper_size wasn't decremented. Now lower has stale x not popped, upper lost valid x. Broken. So global delayed with classification by value is unsafe. Need per-heap pending deletion or counts. Thus counts per heap + delayed per heap? Or delayed dict per heap. We can maintain `lower_delayed` and `upper_delayed` separately. Then when remove from lower, lower_delayed[x]++; when clean lower, uses lower_delayed. That avoids cross contamination. We also may not need counts per heap if we can classify safely? But need know if lower has x to classify. Could use counts per heap to decide, or compare to top? But with global/per-heap delayed, classification by top might be safe? Need if x in lower but lower top stale? clean. If x in lower, x <= lower_top (valid max). If x > lower_top, not in lower. If x == lower_top, lower has x. So classification by x <= lower_top works if lower_size>0. But if lower_size=0, upper. However if lower has stale top that is larger than valid lower top, clean before compare. If lower top valid less than x, then x not in lower. Good. But if lower_size >0 and all lower entries stale? Then lower_size would be 0 logically if we update removals. So not.

Could maintain logical sizes and per-heap delayed only, no counts. On removal: clean lower top (maybe upper too?). If lower_size == 0 or x > -lower[0] (strict?) then remove from upper: upper_size--, upper_delayed[x]++. Else remove from lower: lower_size--, lower_delayed[x]++. But what if x == lower_top and lower has no valid x? lower_top after cleaning is valid x, so has x. Good. What if x < lower_top but lower has no x, and upper has x? Invariant says all lower <= all upper. If x < lower_top, x could be in upper? Yes if duplicates/gaps? Example lower [1,4], upper [4,5]. Remove x=4. x <= lower_top 4 -> choose lower. lower has 4, okay. If lower [1,3], upper [4,5], remove x=4, x > 3 -> upper. If lower [1,3], upper [3,5], remove x=3: x <= 3 choose lower, lower has 3? yes top=3. If lower [1,2], upper [3,3], remove x=3: x >2 upper. Good. If lower [1,3], upper [3,4], remove x=3 choose lower. Fine.

But if lower top is stale and not cleaned, comparison wrong. We can clean lower before removal. But cleaning lower may pop stale entries and not adjust logical sizes (already adjusted). Good. Need also ensure upper top valid when using median. We can clean both before median.

Do we need counts per heap to move elements? When moving from upper to lower, we pop valid top from upper (after cleaning upper), push to lower. No counts needed. When removing, we don't know exact heap entry, but per-heap delayed handles stale. However if we classify by top, we must be sure the value exists in chosen heap logically. The invariant should guarantee. But due to per-heap delayed and logical sizes, is it possible that chosen heap logical size >0 but the heap physical doesn't contain that value? For x <= lower_top, lower top is x or greater. If lower_top > x, x could be in lower? It could be, but if not, then x must be in upper? Wait invariant: lower contains smallest half, upper largest half. If x < lower_top, x might be in lower or could be absent and in upper? Example lower [1,5], upper [5,6]? But invariant requires all lower <= all upper, 5<=5 okay. If remove x=4 (not in window) impossible; we only remove values in window. If x=5, lower_top=5 choose lower, lower has 5. If x=2, lower_top=5, choose lower, lower has 2? lower [1,2,5] upper [5,6], yes. Could x be in upper but less than lower_top? Invariant says no valid upper element < lower_top. Since lower_top is max lower. Upper elements >= lower_top. If x < lower_top, x cannot be in upper. So must be in lower. Good. If x == lower_top, could be in upper only if lower has no x? But lower_top is x, so lower has x. Good. Thus classification by top is valid.

But one more issue: What if lower_size > 0 but lower heap top is stale with value larger than true lower max; we clean it. If after cleaning lower top maybe empty? But lower_size >0 means valid lower entries exist; physical heap must contain them. Cleaning only pops stale entries; won't pop valid. So not empty.

Need maintain logical sizes. For add, classification can use lower top if lower_size>0 else lower. But if lower top stale, clean first. For add x: if lower_size == 0 or x <= -lower[0] (after clean lower) push lower else upper. But if lower_size=0, lower heap may contain stale entries? If lower_size=0, there might be stale entries not cleaned. We should clean lower? Or just push to lower? If lower_size=0 but lower heap has stale entries, pushing new valid lower below/above stale? Need clean before push? For max heap, if stale entries remain, pushing new valid can be affected. But we can clean lower when lower_size==0 to remove stale, then push. Or we can allow stale and later clean; but rebalancing may need move. Simpler: before any operation involving heap top, clean that heap. We can define `clean_lower()` and `clean_upper()`.

But if lower_size=0 and lower heap has stale entries, adding to lower without cleaning may result in stale top larger than new valid; later median clean will pop stale. Logical size says lower has 1. Rebalance maybe uses lower top. We can clean before compare/move. So okay.

Need rebalancing with per-heap delayed and logical sizes. We need move valid elements. Functions:

```
def clean_lower():
    while lower and lower_delayed.get(-lower[0], 0) > 0:
        heapq.heappop(lower)
        lower_delayed[-lower[0]] -= 1
```
But key is positive value. Since lower stores -x. If x = -0.0? -(-0.0)=0.0? Actually -(-0.0) = 0.0? Let's not worry. Need use `val = -lower[0]`; check `lower_delayed.get(val,0)`. Decrement. For upper: val = upper[0].

`pop_lower_valid()`:
```
clean_lower()
val = -heapq.heappop(lower)
lower_size -= 1
# do not decrement delayed
return val
```
But if moving, we also need push to other and increment size. Could inline.

Add:
```
if lower_size == 0:
   clean_lower() # maybe
   heappush(lower, -x); lower_size +=1
else:
   clean_lower()
   if x <= -lower[0]: heappush(lower, -x); lower_size +=1
   else: heappush(upper, x); upper_size +=1
# rebalance
if lower_size < upper_size:
   clean_upper(); v = heappop(upper); upper_size -=1; heappush(lower, -v); lower_size +=1
elif lower_size > upper_size + 1:
   clean_lower(); v = -heappop(lower); lower_size -=1; heappush(upper, v); upper_size +=1
```
But wait: when moving from upper to lower, we pop valid top from upper. We don't need delayed. But upper might have stale entries not at top; no issue. We must ensure we don't pop stale: clean_upper first. Good.

Remove:
```
# need classify. Clean lower? If lower_size > 0: clean_lower(); if x <= -lower[0]: lower_size -=1; lower_delayed[x] = lower_delayed.get(x,0)+1 else upper_size -=1; upper_delayed[x]...
else: upper_size -=1; upper_delayed[x]...
# rebalance as above
```
But is classification by lower top sufficient if lower top stale? We clean lower. If lower_size >0, after clean lower top valid. Good. What if lower_size >0 but lower heap is empty? Shouldn't happen. But due to stale all? lower_size would be 0 if all removed logically. Stale remain but logical 0. So if lower_size>0, valid entries exist.

Potential issue: When lower_size == 0 but lower heap has stale entries, and we remove x from upper. We don't clean lower. Rebalance might need move upper to lower; moving will push to lower with stale entries. Later lower top may be stale with high value; clean_lower will pop. But logical lower_size after move is 1. If stale top value > valid new lower, clean pops stale, then top valid. Fine. If stale top value < valid new lower, heap top could be valid new lower? In max heap, root is max physical. If stale root less than valid, then valid would be root? Heap property ensures root max; so stale root cannot be less than a child valid with greater value. So if stale low, it won't be root if valid greater; but after pushing valid, heap root becomes valid if greater. Good.

Need median after each window. After initial k adds, for i from k-1 to n-1:
- compute median: clean_lower(); clean_upper(); if lower_size == upper_size: median = (-lower[0] + upper[0]) / 2.0 else median = float(-lower[0]) (lower has one more). But ensure if k even, lower_size == upper_size = k/2. If k odd, lower_size = upper_size+1. After add/remove rebalance, yes.
- append.
- if i < n-1: remove nums[i-k]. But we can loop from 0 to n-1 and after adding if i>=k-1 compute and then remove if i < n-1. Or initialize first k then loop. Simpler:
```
res=[]
for i, x in enumerate(nums):
    add(x)
    if i >= k:
        remove(nums[i-k])
    if i >= k-1:
        median...
        res.append(median)
```
Need order: For window ending at i, should include nums[i-k+1..i]. If we add x then remove i-k before median, window correct. For i=k-1, i>=k false, median first. For i=k, add nums[k], remove nums[0], median second. Good.

Need validate k: if k < 1 or k > len(nums): raise ValueError. If nums empty and k? k>len -> ValueError. If k=0 -> ValueError.

Need return list[float]. For odd median, return float (maybe int if x int? nums float but could be int; use float(-lower[0]) to ensure float). For even, division yields float. In Python 3, / returns float. If values are large, okay.

Performance: Need optimize. We can inline cleaning and rebalancing inside loop to reduce function calls? But code clarity okay. n=200k, each add/remove calls clean maybe multiple times. Need under 2s. Python may be close but likely okay with k=1000. Let's estimate: 200k iterations, each add push, maybe rebalance pop/push, remove delayed, median clean. Heap operations ~ 2-4 per iteration => 800k heap ops. log 1000 ~10, 8 million comparisons, okay maybe 0.5-1s. Dict operations. Need use local variables for speed: `heappush = heapq.heappush`, `heappop = heapq.heappop`, `get`? But nested closures maybe. Could implement all in function with local variables.

Need be careful with cleaning loops: delayed dict lookup each time. Could store delayed as dict and use `while lower and lower_delayed.get(-lower[0], 0): ...`. Since delayed counts are small. For speed, maybe use `pop` and `setdefault`? Let's design efficient but correct.

Alternative data structure: Use `heapq` plus two `Counter`? Could maintain sorted two multisets with lazy deletion. The per-heap delayed approach with classification by top and no counts seems simpler and faster (no per-heap counts). Need prove it's correct with duplicates and per-heap delayed. Let's test mentally.

Invariant: At any time (after rebalancing and logical sizes updated), the multiset of valid entries in lower heap (size lower_size) and upper heap (size upper_size) represents the window, with all lower <= all upper, and sizes balanced. Physical heaps may contain stale entries marked in corresponding delayed. Logical sizes count valid entries only. `clean_lower` removes stale entries from top until top not marked. It does not change logical sizes.

Add x:
- clean lower if lower_size>0 (or always). Determine side by comparing to lower max valid. If lower_size=0, side lower. If x <= lower_max, push lower and lower_size++; else push upper and upper_size++.
Does this preserve all lower <= all upper? If push lower with x <= old lower_max, need x <= all upper? Since old lower_max <= all upper (invariant), x <= lower_max <= upper, okay. If push upper with x > lower_max, need lower <= x, yes lower_max < x; and x <= old upper_min? Not necessarily! If we push arbitrary x to upper, it may be smaller than some upper elements? Wait invariant requires all lower <= all upper, but upper can be any order; no requirement x <= existing upper min? Actually all lower <= all upper. For upper elements, no constraint among themselves. If x > lower_max, then all lower <= lower_max < x, so x is >= all lower. It can be less than some upper elements; that's fine, upper contains largest half but not necessarily sorted. The heap min will handle. So okay.
- Rebalance sizes. Move top from larger to smaller. Need preserve partition. If lower_size < upper_size, move min upper to lower. Since upper min >= all lower (invariant), moving it to lower preserves lower <= upper? The moved value is >= old lower max, so new lower max = moved value. Remaining upper elements are >= moved value (since it was min upper). So invariant holds. If lower_size > upper_size+1, move max lower to upper. Moved value <= all upper (invariant), new upper min maybe moved value, lower remaining <= moved value. Invariant holds.

Remove x:
- Need choose heap such that x is logically in that heap. If lower_size == 0, x in upper. Else clean lower; let Lmax = -lower[0]. If x <= Lmax, choose lower; else upper. Need prove x is in lower if x <= Lmax. Since all lower <= all upper, any x in upper must be >= Lmax. If x < Lmax, x cannot be in upper. If x == Lmax, x could be in upper or lower, but lower has at least one Lmax (the top), so choosing lower is valid. Thus there is a valid x in chosen heap. We decrement logical size and mark delayed in that heap. The multiset of valid entries after removing one x from chosen heap is the desired remaining window (since values equal). Partition invariant? Removing an element from lower: remaining lower <= upper? The removed x could be max lower or not. Remaining lower max <= old Lmax <= upper, so yes. Removing from upper: remaining upper still >= lower; yes. Sizes unbalanced; rebalance moves top from larger to smaller preserving invariant as above.

Lazy deletion: We mark delayed in chosen heap. Later when that stale entry reaches top, clean pops it. Since logical size already excludes it, counts remain consistent. But what if there are multiple identical x in chosen heap and delayed count decremented when one stale x popped; it might pop a different identical x, but identical so fine. What if stale x not at top and a valid x at top; delayed count remains. When top valid x, clean sees delayed[x]>0 and would incorrectly pop valid x? Wait this is crucial. Suppose lower heap has two valid x entries, and we mark one delayed. The heap top is x (valid). `clean_lower` checks `lower_delayed.get(x,0) > 0`, sees true, and pops the top, treating it as stale. But it may pop a valid x, leaving the actually stale x buried. Does this matter? Since entries identical, popping one x and decrementing delayed is okay: we remove one x from physical heap, which corresponds to the stale entry? But we didn't know which. The physical heap now has one fewer x. Logical lower_size already decremented by 1. The remaining physical x count equals logical count? Initially physical x count = logical x count + 1 (stale). After popping one x, physical count = logical x count. It doesn't matter which copy. So correct. If the top valid x is popped, the stale x remains but delayed now 0, so it will be treated as valid. But since values identical, the multiset of physical valid entries is still correct: we just relabeled stale as valid. The count of x in physical equals logical count. So okay. Thus per-heap delayed by value works even without unique IDs, because duplicates indistinguishable. Good.

But wait: If stale x is not top and valid x is top, popping valid x and leaving stale x with delayed=0 means the stale x is now considered valid. The physical heap has same multiset as logical. Since values equal, no issue. If values are floats with same numeric value but maybe -0.0 and 0.0? Dict keys treat equal? -0.0 == 0.0, hash same? I think hash(-0.0)==hash(0.0). Could be okay. NaN no.

Thus no counts per heap needed. Great.

But classification by top with delayed duplicates: Need ensure lower_size >0 implies lower heap has at least one valid entry. If delayed misassignment? We argued physical multiset equals logical multiset after cleaning? Actually physical may have stale entries; logical multiset is physical multiset minus delayed entries (by value counts). But because duplicates, delayed count can be considered assigned to any physical entries of that value. The number of valid entries of value x = physical_count[x] - delayed[x]. If lower_size>0, total valid >0. The heap top after cleaning? `clean_lower` pops while delayed[top value] >0. But as noted, it may pop a valid copy and leave stale copy, but after decrement delayed, the condition for that value may become false. It ensures top value has delayed count 0. But does that guarantee top entry is "valid"? In terms of count, yes: physical_count[value] - delayed[value] > 0 if delayed was decremented below physical_count? Let's examine. If physical_count[x]=1, delayed[x]=1. Top x, clean pops it, delayed=0, physical_count=0. Good. If physical_count[x]=2, delayed[x]=1. Top x, clean pops one, delayed=0, physical_count=1. Now top may be x (the other). delayed=0, considered valid. There is indeed one valid x (logical count=1). Good. If physical_count[x]=2, delayed[x]=2 (two stale). Top x, clean pops one, delayed=1, physical_count=1; top still x (same physical), clean pops, delayed=0, physical_count=0. Good. So clean works.

Need maintain delayed dict cleanup to avoid unbounded memory? Over n=200k, distinct values maybe 200k. Delayed counts eventually zero. We can leave; at most number of distinct values. Fine. But when decrement to zero, we can `del` to save memory? Might cost. Could set to 0 or delete. For speed, maybe if new_count: else del. But dict size okay. However if many distinct, delayed keys remain. At most n. 200k okay. Could leave zero values? If we check truthiness, zero is false. But dict grows. Acceptable. Could delete to keep memory low. `d[val] -= 1; if not d[val]: del d[val]`. This is extra overhead. Maybe okay. For speed, leave zero? `get` returns 0 false. But memory 200k entries okay (~10MB). Could delete to be neat. Let's consider performance: 200k deletions maybe okay. We can use `pop`? We'll decide.

Potential issue with using `x <= -lower[0]` when lower top is stale but delayed count for top value zero? Actually if top value has delayed zero, it's valid. If top value has delayed >0, clean pops. Good.

Need handle even/odd median. After each median, clean both. But if lower_size == upper_size, both nonempty (k even >=2). If k=1, lower_size=1, upper=0.

Let's test with small examples manually.

nums=[1,3,2], k=2.
Init i=0 add 1: lower_size0 -> lower [1], ls=1, us=0. i<k-1 no median.
i=1 add 3: clean lower top1, 3>1 -> upper [3], us=1. ls=1 us=1. median: clean, even -> (1+3)/2=2. remove? i<k? i=1 <2 no.
i=2 add 2: clean lower top1, 2>1 -> upper push2 (heap [2,3]), us=2. rebalance ls<us: clean upper top2, pop2, us=1, push lower -2 (lower [-2,-1]? max heap values 2,1), ls=2. median: lower_size2 upper1 -> odd median = -lower[0]=2. remove nums[0]=1: clean lower top2, x=1 <=2 -> lower delayed[1]=1, ls=1. rebalance ls<us? 1<1 no. median for window [3,2]: clean lower: top2 delayed[2]?0, top valid. upper top3. even -> (2+3)/2=2.5. Correct.

Check duplicate issue:
nums=[5,5,5], k=2.
i0 add5 lower [5] ls1
i1 add5: clean lower top5, x<=5 -> lower push5 ls2. rebalance ls>us+1: clean lower top5, pop5 (valid) ls1, push upper5 us1. median (5+5)/2=5.
i2 add5: clean lower top5, x<=5 -> lower push5 ls2. rebalance ls>us+1? 2>2 no. median lower_size2 upper1 -> median lower top5. remove first 5: clean lower top5, x<=5 -> lower delayed[5]=1, ls1. median: clean lower: top5 delayed[5]=1 -> pop, delayed0. Now lower top? physical lower had two 5? Initially after i2 lower physical: first 5 (stale? no, we removed first? Wait lower physical had 5 (from i0?) and 5 (from i2). Upper physical 5. Remove i0 lower delayed=1. clean lower pops top 5 (could be i0 or i2), delayed0. lower physical one 5. upper one 5. median even (5+5)/2=5. Correct.

Check removing upper duplicate:
nums=[1,2,2,3], k=3.
Windows: [1,2,2] median2, [2,2,3] median2.
i0 add1 lower1 ls1
i1 add2 upper2 us1 median? no (i=1<2)
i2 add2: clean lower top1, 2>1 -> upper push2 us2. rebalance ls<us: pop upper min2, us1, push lower2 ls2. median lower_size2 upper1 => median lower top2. upper has 2. remove? i=2<3 no.
i3 add3: clean lower top2, 3>2 -> upper push3 us2. rebalance ls<us? 2<2 no. median lower top2. remove nums0=1: clean lower top2, x=1<=2 -> lower delayed1=1, ls1. rebalance ls<us (1<2): clean upper top2? upper physical [2,3], delayed upper? none. pop2 us1, push lower2 ls2. median lower_size2 upper1? upper now 3. lower physical: stale1, valid2, moved2. clean lower for median: top2? heap max: values 2,2,1. top2 delayed2?0. median=2. Correct. Window [2,2,3].

Check remove x equal lower top but actually upper? Example lower [1,3], upper [3,4], remove 3. k=4. If lower has 3, choose lower. Window after remove [1,4,3]? Multiset same. Rebalance. Should be fine.

Need ensure when adding, if lower_size>0 but lower heap top has delayed >0, clean. If lower heap contains only stale entries but lower_size>0? Shouldn't, but if due to duplicate misassignment? Let's test if lower_size>0 but all physical lower entries delayed? Then logical valid count would be 0, contradiction. Unless delayed assigned to wrong heap? We use per-heap, so no. Good.

Potential issue: Rebalance move after removal can move stale top if we forget clean. We'll clean source before pop.

Potential issue: If source heap top stale and delayed count >0, clean pops. But if source logical size >0, after cleaning top valid. If source logical size ==0, we shouldn't move from it. Rebalance conditions based on logical sizes. If lower_size < upper_size, source upper logical size >0. clean upper valid. If lower_size > upper_size+1, source lower logical size >0. Good.

Now, can we simplify further by using two heaps and a single `to_remove` dict with counts per heap? We have per-heap delayed. Need implement clean lower/upper efficiently.

Pseudo:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    max_lower = []  # store negatives
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    heappush = heapq.heappush
    heappop = heapq.heappop
    result = []

    def clean_lower():
        while max_lower:
            v = -max_lower[0]
            c = lower_delayed.get(v, 0)
            if c:
                heappop(max_lower)
                if c == 1:
                    del lower_delayed[v]
                else:
                    lower_delayed[v] = c - 1
            else:
                break
    ...
```
But nested functions accessing local variables with nonlocal sizes? Clean doesn't modify sizes. But Python closure variable lookup slower. Could inline cleaning in loops? For performance, maybe define local nested functions but bind local variables? In Python, closure cell access is slower than local. But 200k, maybe okay. To optimize, we can implement as inner while repeated code. But code longer. Could use local variables and define functions with default arguments? e.g. `def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, heappop=heappop):` but it modifies list/dict. It doesn't need nonlocal. Default args make them local in function. But calling function overhead. We can inline to be safe.

Need consider Python 3.11 standard library. Type hints list[float] okay.

Let's think about alternative: Use `heapq` with lazy deletion and two heaps, but use `dict` for delayed per heap. The algorithm above should be correct. Need maybe use `float` conversion for median. If nums are Decimal? Type says float. Okay.

Let's test more complex with random mentally? Could write proof in mind. But need final code only.

Potential edge cases:
- k=1: result each number as float. Algorithm: add, if i>=1 remove previous, median. Let's simulate: i0 add lower1 ls1, median lower=1. i1 add x: clean lower top prev, if x <= prev push lower ls2 else upper us1. Rebalance: if push lower ls2 us0 -> move max lower to upper: pop lower (maybe x or prev), push upper. If push upper ls1 us1 -> no move. Then remove previous nums[0]. Need classification: if lower_size>0 clean lower. Suppose after add x>prev, lower prev, upper x. Remove prev: x_remove=prev <= lower_top prev -> lower delayed, ls0. Rebalance ls<us: move upper x to lower: clean upper pop x, us0, push lower x, ls1. Median lower x. Good. Suppose x<prev, add to lower ls2, rebalance move max lower prev to upper: lower x, upper prev. Remove prev: clean lower top x, x_remove=prev > x -> upper delayed, us0. Rebalance ls>us+1? ls1 >1? no. Median lower x. Good.
- n=k: loop i 0..k-1, no removals, one median.
- nums empty: k > 0 > len -> ValueError. If k=0 -> ValueError.
- large values, floats.

Now performance details.

Can we do better with `heapq` and `bisect` maintaining sorted window? k=1000, n=200k: O(n*k) too slow (200M). Need heap.

Could use two heaps with lazy deletion but no counts. Need ensure delayed dict keys are floats; comparing with `v = -max_lower[0]` for negative zero? If x = -0.0, -x = 0.0; delayed key 0.0; okay. If x = inf? -inf? Heap with -inf? For max heap, storing -inf for x=inf? If x=inf, -x=-inf, max heap root smallest? Wait max heap implemented as min heap of negatives. For x=inf, -x=-inf. In min heap, -inf is smallest, so it will be root, representing largest x. Good. For x=-inf, -x=inf, root? It may be largest in min heap, not root, correct as smallest value. Comparisons with inf okay. Median with inf: (inf + something)/2 = inf? Python inf + finite = inf, /2 inf. If (-inf + inf) = nan. But median of [-inf, inf] mathematically? Not specified. Assume finite.

Potential issue: Cleaning lower: `v = -max_lower[0]`. If max_lower[0] is -inf (x=inf), v=inf. delayed get inf. Fine. If max_lower[0] is inf (x=-inf), v=-inf. Fine.

Now, can rebalancing be wrong if we move stale element because clean source doesn't clean all stale, only top. Suppose source heap has stale top, clean pops until top valid. Then pop valid. Good. Stale buried remain. Destination heap may have stale entries; pushing valid okay.

But what about size balancing when source heap logical size is positive but physical top is stale with value that is not in logical set. clean pops stale, but does not change logical size. Then pop valid decreases logical size. Good.

Now, need decide when to clean median. After removal and rebalance, we compute median. Could clean lower and upper. But if sizes balanced, lower and upper tops valid? Need clean. We can maybe clean only heaps used for median. For even, both. For odd, lower only. But for future removal classification needs lower top clean. Could clean lower at start of each iteration? Let's structure for speed:

Loop i, x:
1. Add x:
   - If lower_size:
       clean lower (while ...)
       if x <= -lower[0]: push lower, lower_size +=1
       else: push upper, upper_size +=1
     else:
       # lower may have stale; maybe clean lower? If lower_size 0, push lower. But if lower has stale entries, pushing without cleaning may leave stale root. Later clean. But for rebalance, if lower_size 1, upper_size maybe? Could move from lower? If lower_size 1, upper_size 0, no move. If later add more, clean lower will pop stale. Okay. But if lower_size 0 and upper_size >0? Can that happen? Balanced sizes with lower_size >= upper_size? If lower_size 0, upper_size must 0 (since lower not less than upper? Rebalance ensures lower_size >= upper_size, and if upper_size>0 lower_size at least? For k window, lower_size could be 0 only if total valid 0. During sliding, after removals, lower_size could be 0 while upper_size? Rebalance will move upper to lower if lower_size < upper_size. So after each operation, lower_size >= upper_size. If lower_size 0, upper_size 0. But during add before rebalance, if lower_size 0, upper_size maybe 0. Good.
   - Rebalance:
       if lower_size < upper_size:
           clean upper; v=heappop(upper); upper_size-=1; heappush(lower, -v); lower_size+=1
       elif lower_size > upper_size + 1:
           clean lower; v=-heappop(lower); lower_size-=1; heappush(upper, v); upper_size+=1
2. If i >= k: remove nums[i-k]
   - y = nums[i-k]
   - if lower_size:
       clean lower
       if y <= -lower[0]:
           lower_size -=1
           lower_delayed[y] = lower_delayed.get(y,0)+1
       else:
           upper_size -=1
           upper_delayed[y] = upper_delayed.get(y,0)+1
     else:
       upper_size -=1
       upper_delayed[y] = upper_delayed.get(y,0)+1
   - Rebalance same.
3. If i >= k-1:
   - clean lower (and upper if even)
   - if lower_size == upper_size: res.append((-lower[0] + upper[0]) / 2.0)
   else: res.append(float(-lower[0]))

This calls clean lower multiple times (add, remove, median). Could optimize by cleaning as needed. Since k small, okay. But maybe 200k * multiple while loops. Most clean loops do one check (while condition and get). Fine.

Need be careful: In add, if lower_size >0, clean lower. If x <= -lower[0], push lower. But what if lower heap is empty because lower_size>0 but all valid entries stale? impossible. If lower_size>0 and lower empty due to bug, -lower[0] error. Could guard `while lower and ...`; if lower empty, treat as push lower? But logical inconsistency. For safety, if lower empty, push lower. But lower_size>0 and lower empty would mean stale entries all popped? clean only pops stale, logical size not changed. If all physical entries stale, logical valid count 0, so lower_size should be 0. So not happen. But for robustness, can check `if lower_size and max_lower:` else. Maybe not necessary.

However, consider when lower_size=0 but max_lower has stale entries. In add, we push to lower without cleaning. Then lower_size=1. Rebalance maybe if upper_size? If upper_size=0, no. Median clean lower will pop stale top if any. If stale top value > new valid, pop. If stale top value < new valid, heap root may be new valid; stale remains. Later delayed for stale value? It was delayed from previous removals. But if stale top not root, clean lower later won't remove it until it becomes root. But delayed count remains. Could this cause misclassification? Suppose stale low value buried, delayed count for that value >0. Later a valid low value of same value appears? If delayed count remains, clean may pop valid when it reaches top. But as argued, if physical count of that value includes stale and valid, delayed count represents number of stale; popping any copies until delayed zero is okay. But if stale low value never reaches top, delayed count stays. Memory okay. But if later we remove a value y, classification uses lower top (valid max). Stale buried doesn't affect. Good.

But if lower_size=0 and max_lower has stale entries, and we push new valid lower, logical lower_size=1. The physical lower may have stale entries with delayed counts. The total physical count for some value may be > logical count. Cleaning top only removes if top value delayed. If stale top has delayed >0, pop. If stale top has delayed 0? Can that happen? Stale entries always have delayed count in their heap when created. If delayed count decremented by popping other identical valid entries, the stale entry may remain with delayed 0 and be considered valid. But physical count equals logical count? Let's examine: lower_size=0 means logical valid count 0. Physical may have stale entries. For a value v, physical_count - delayed_count should equal 0. If delayed_count was decremented too much due to popping valid copies, then physical_count - delayed_count could be >0, meaning a stale entry is now counted as valid despite logical size 0. Is that possible? Suppose physical_count=1, delayed=1 (stale). If clean pops it, physical=0, delayed=0. Fine. If physical_count=2, delayed=1 (one stale, one valid) but logical size would be 1, not 0. So lower_size 0 implies for each value physical_count = delayed_count. If we pop a valid copy instead of stale, physical_count decreases and delayed decreases, difference remains 0. So no stale becomes valid. Good.

Now, one subtle issue: We use per-heap delayed counts by value. When removing x from lower, we do `lower_delayed[x] += 1`. But if x is not actually in lower physical? We proved there is valid x in lower if x <= lower_top. But what if lower_top = x, lower has valid x, but the physical x entries are all already marked delayed? Then logical valid count of x in lower would be 0, but lower_top x after cleaning? clean would pop delayed x until no delayed x at top. If all x entries delayed, they would be popped if at top. But lower_top x with delayed[x]>0 would be popped. So after clean, if top x, delayed[x]=0, and physical_count[x] > 0, logical valid x >0. Good.

Potential issue with rebalancing and delayed: Suppose lower_size > upper_size+1, move max lower to upper. We clean lower, pop valid max. But what if the popped valid max has delayed count >0 for that value? clean ensures delayed[top value] == 0 before pop. But there may be delayed count for same value >0 for other entries? If delayed[value] ==0, no pending removals for that value in lower. So popped is valid. Good. If there are multiple same value and one delayed, clean would have popped delayed copies until delayed zero. If physical count > delayed original, after popping delayed count zero, remaining copies valid. Good.

Now, can we reduce memory by not storing nums? We need nums for removal. Input list available. Good.

Let's think about an alternative using `heapq` and `bisect` with sorted list of size k. k=1000, n=200k, O(n*k) worst 200M, maybe too slow in Python. Heap better.

Let's consider using `array`? Not needed.

Need final code in single ```python block. No tests. Could include docstring? Fine. No printing.

Let's refine code for speed and correctness.

Option 1: Nested helper functions for clean and rebalance. But rebalance needs modify sizes; could use `nonlocal lower_size, upper_size`. Function call overhead for each add/remove (200k*2) maybe okay but could be ~0.1s. But closure nonlocal slower. Inline maybe faster.

Let's design inline with small local functions for clean only? Clean called many times. Function call overhead maybe 500k calls, could be significant (~0.05-0.1s). But okay. However while loop inside function with closure may be slower. We can inline clean as a local while repeated. Code longer but performant.

Maybe define local variables and use a helper `clean_lower` with default args to avoid closure? It can access `max_lower`, `lower_delayed`, `heappop` as local default. It doesn't need to modify sizes. Function call overhead still. But we can call clean only when necessary. I think fine for 2s. But to be safe, inline critical cleaning? Let's estimate: 200k iterations, each maybe 3 clean calls (add, remove, median) = 600k function calls. Python function call ~80ns? Actually ~100ns? More like 100-200 ns? 600k ~0.1s. Closure maybe 0.2s. Acceptable. Heap ops dominate.

But nested functions modifying `lower_size` if rebalance helper would need nonlocal. Could avoid rebalance helper by writing twice (after add and after remove). Or define `rebalance()` with nonlocal sizes. 400k calls. Could be okay. But for performance, inline rebalance after add and remove.

Let's write code with nested `clean_lower` and `clean_upper` for readability. Then inline rebalance. Need ensure `clean_lower` uses local variables efficiently. Example:
```
def clean_lower():
    while max_lower:
        v = -max_lower[0]
        c = lower_delayed.get(v)
        if c is None:
            break
        heappop(max_lower)
        if c == 1:
            del lower_delayed[v]
        else:
            lower_delayed[v] = c - 1
```
Using `get(v)` returns None if absent. But if count 0 and we delete zeros, never zero. If we leave zeros, `get` returns 0; need truthiness. Let's delete zeros to keep `get` None/positive. Then `c = lower_delayed.get(v)`; if c: ... else break. If count can be 0? We delete. Good.

But if count is large, decrement. `del` and assignment. Could use `lower_delayed[v] = c - 1` even if zero? Then get returns 0, truth false. But dict retains key. To avoid delete overhead, maybe leave zero. Then `c = lower_delayed.get(v, 0)`; if c: ...; lower_delayed[v] = c - 1. Dict grows. 200k keys okay. Delete overhead maybe similar. Which is faster? Deleting each time stale popped (up to n) could be costly. Leaving zero means `get` returns 0 for previously seen values, no memory cleanup. Dict size up to distinct values (200k), okay. But if values all distinct, delayed keys for removed values remain. 200k dict entries maybe ~10MB, okay. Could leave zeros for speed? `if c:` with c=0 false. We don't need `del`. But when adding delayed: `lower_delayed[y] = lower_delayed.get(y, 0) + 1`. If existing 0, becomes 1. Good. This avoids delete branch. Let's do that. Dict memory okay. But if n=200k, two delayed dicts maybe up to 200k each? Actually each removal marks in one heap; over n, distinct values could be 200k, total keys across both maybe 200k, not 400k if values distinct and each removed once. Fine.

Clean:
```
def clean_lower():
    while max_lower:
        v = -max_lower[0]
        c = lower_delayed.get(v, 0)
        if c:
            heappop(max_lower)
            lower_delayed[v] = c - 1
        else:
            break
```
If c becomes 0, key remains. Good.

Potential issue: If c is negative? Shouldn't. If delayed count for value greater than physical count due to misassignment? Could become negative? Let's see. We increment delayed when removing logical element. We decrement when popping a top of that value. Could we pop more copies of that value than delayed? clean only pops while c>0. It might pop valid copies, but physical count of that value is at least c? Is it always? We need ensure delayed_count <= physical_count. When we increment delayed for a removal, physical_count still includes the element (stale), so physical_count >= delayed_count. When we pop a copy of that value, physical_count--, delayed_count--. Difference remains. So never negative. Good.

Rebalance inline:
```
if lower_size < upper_size:
    while min_upper:
        v = min_upper[0]
        c = upper_delayed.get(v, 0)
        if c:
            heappop(min_upper)
            upper_delayed[v] = c - 1
        else:
            break
    v = heappop(min_upper)
    upper_size -= 1
    heappush(max_lower, -v)
    lower_size += 1
elif lower_size > upper_size + 1:
    while max_lower:
        v = -max_lower[0]
        c = lower_delayed.get(v, 0)
        if c:
            heappop(max_lower)
            lower_delayed[v] = c - 1
        else:
            break
    v = -heappop(max_lower)
    lower_size -= 1
    heappush(min_upper, v)
    upper_size += 1
```
But note: In the second rebalance, after cleaning, `v = -max_lower[0]`? If we use `v = -heappop(max_lower)`, fine. But cleaning while uses `v = -max_lower[0]`. Then `v = -heappop(max_lower)`. Good.

Add inline:
```
if lower_size:
    while max_lower:
       v = -max_lower[0]; c=lower_delayed.get(v,0); if c: heappop... else break
    if x <= -max_lower[0]:
       heappush(max_lower, -x); lower_size +=1
    else:
       heappop? no, heappush(min_upper, x); upper_size +=1
else:
    heappush(max_lower, -x); lower_size +=1
```
If lower_size>0 but max_lower empty (shouldn't), `-max_lower[0]` error. Could guard:
```
if lower_size and max_lower:
   clean...
   if x <= -max_lower[0]: ... else ...
else:
   heappush(max_lower, -x); lower_size +=1
```
But if lower_size>0 and max_lower empty, pushing lower would make lower_size+1, logical invalid. But impossible. For safety, maybe if lower_size and not max_lower, clean? It is empty. Could set lower_size=0? Not needed.

Remove inline:
```
y = nums[i-k]
if lower_size:
    while max_lower:
       v = -max_lower[0]; c=lower_delayed.get(v,0); if c: heappop... else break
    if y <= -max_lower[0]:
       lower_size -=1
       lower_delayed[y] = lower_delayed.get(y,0)+1
    else:
       upper_size -=1
       upper_delayed[y] = upper_delayed.get(y,0)+1
else:
    upper_size -=1
    upper_delayed[y] = upper_delayed.get(y,0)+1
# rebalance
```
Again if lower_size>0 and max_lower empty? impossible.

Median:
```
while max_lower:
   v=-max_lower[0]; c=lower_delayed.get(v,0); if c: heappop... else break
if lower_size == upper_size:
   while min_upper:
      v=min_upper[0]; c=upper_delayed.get(v,0); if c: heappop... else break
   res.append((-max_lower[0] + min_upper[0]) / 2.0)
else:
   res.append(float(-max_lower[0]))
```
Need if lower_size == upper_size == 0? For k>=1, when median computed, window size k>0, so lower_size+upper_size=k. If k even, both >0. If k odd, lower>0. Good.

But note: In median even, we clean lower first, then upper. If lower and upper share values, per-heap delayed separate. Good.

Could optimize by not cleaning upper for odd. But for future add/remove, upper top may be stale; add classification doesn't use upper top, only lower. Remove classification uses lower top. Rebalance may move from upper if lower_size < upper_size; it cleans upper then. So if odd and we don't clean upper, stale upper top remains until needed. Fine.

Now, is lower_size/upper_size after removal and rebalance always correct with lazy stale? Let's prove with per-heap delayed. Logical sizes are updated on add/remove and moves. Moves pop valid top (after cleaning source) and push to dest, adjusting sizes. Stale pops in clean do not adjust sizes. Good.

Potential bug: When adding x, we compare to lower top after cleaning. But if lower_size == upper_size (balanced) and x > lower_top, push upper making upper_size = lower_size+1, then rebalance moves min upper to lower. This is standard. If x is very large, min upper may be old upper min or x? If x > all upper, min upper old; move old min to lower, upper gets x. Good. If x > lower_top but less than some upper, push upper, min upper may be x, move x to lower. Then lower max becomes x, upper remaining are >= x? Since x was min upper, remaining upper >= x. Good.

When removing x, classification by lower top. Suppose lower_size == upper_size and x > lower_top, remove from upper. Then upper_size decreases, lower_size > upper_size+1? If lower=upper before, after upper--, lower = upper+1, balanced. No rebalance. If lower_size = upper_size+1 and x > lower_top, remove upper -> lower=upper+2, rebalance move max lower to upper. Good. If x <= lower_top, remove lower -> lower decreases, maybe lower<upper, rebalance move min upper to lower. Good.

Now, consider k even/odd and median after rebalance. For even k, lower_size=upper_size. For odd, lower_size=upper_size+1. Let's verify after operations:
- Add then remove maintains total k. Balanced conditions ensure lower_size >= upper_size and lower_size <= upper_size+1. For total even, must equal; for odd, lower=upper+1. Because lower_size+upper_size = k. If k even, lower>=upper and diff<=1 => diff=0. If odd => diff=1. Good.

Need ensure initial building with loop add/remove as above results in correct window. For i<k-1, no median. But removals start at i=k. At i=k, after add and remove, window size k. Good.

Let's test with n=3,k=2 above. Good.

Now, potential performance issue: Cleaning loops repeated may pop stale entries multiple times? Each stale entry popped once. Total stale pops <= n. Good. Each clean check does dict get. Number of clean calls ~ 3 per iteration = 600k. Fine.

Can we further optimize by storing `lower_delayed_get = lower_delayed.get`? But dict get method bound? Could assign local `ld_get = lower_delayed.get`, `ud_get = upper_delayed.get`. However when dict changes, bound method still works. But if we assign before loop, and then update dict, method okay. Could use for speed. But in clean loops, calling `ld_get(v, 0)` local is faster than attribute lookup. Let's do:
```
ld_get = lower_delayed.get
ud_get = upper_delayed.get
```
But when we assign `lower_delayed[v] = c - 1`, the bound method remains valid. Good. For setting delayed: `lower_delayed[y] = ld_get(y, 0) + 1`. However if we delete keys (we don't), okay. If we left zeros, okay. Bound method local.

But if we reassign `lower_delayed`? No.

Similarly `hp_push = heapq.heappush`, `hp_pop = heapq.heappop`.

Need be careful with variable names and local scope. In Python, assigning to `lower_size` inside function makes it local. We'll use local variables. No nested functions if inline. If we define nested clean functions, they'd need access. To use local bound methods and inline loops, no nested functions. Code will be repetitive but performant.

Let's draft code:

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    max_lower = []
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get
    hp_push = heapq.heappush
    hp_pop = heapq.heappop
    result = []

    for i, x in enumerate(nums):
        # add x
        if lower_size:
            while max_lower:
                v = -max_lower[0]
                c = ld_get(v, 0)
                if c:
                    hp_pop(max_lower)
                    lower_delayed[v] = c - 1
                else:
                    break
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        # rebalance after add
        if lower_size < upper_size:
            while min_upper:
                v = min_upper[0]
                c = ud_get(v, 0)
                if c:
                    hp_pop(min_upper)
                    upper_delayed[v] = c - 1
                else:
                    break
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            while max_lower:
                v = -max_lower[0]
                c = ld_get(v, 0)
                if c:
                    hp_pop(max_lower)
                    lower_delayed[v] = c - 1
                else:
                    break
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        # remove outgoing if window full and sliding
        if i >= k:
            y = nums[i - k]
            if lower_size:
                while max_lower:
                    v = -max_lower[0]
                    c = ld_get(v, 0)
                    if c:
                        hp_pop(max_lower)
                        lower_delayed[v] = c - 1
                    else:
                        break
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            # rebalance after remove
            if lower_size < upper_size:
                while min_upper:
                    v = min_upper[0]
                    c = ud_get(v, 0)
                    if c:
                        hp_pop(min_upper)
                        upper_delayed[v] = c - 1
                    else:
                        break
                v = hp_pop(min_upper)
                upper_size -= 1
                hp_push(max_lower, -v)
                lower_size += 1
            elif lower_size > upper_size + 1:
                while max_lower:
                    v = -max_lower[0]
                    c = ld_get(v, 0)
                    if c:
                        hp_pop(max_lower)
                        lower_delayed[v] = c - 1
                    else:
                        break
                v = -hp_pop(max_lower)
                lower_size -= 1
                hp_push(min_upper, v)
                upper_size += 1

        # compute median
        if i >= k - 1:
            while max_lower:
                v = -max_lower[0]
                c = ld_get(v, 0)
                if c:
                    hp_pop(max_lower)
                    lower_delayed[v] = c - 1
                else:
                    break
            if lower_size == upper_size:
                while min_upper:
                    v = min_upper[0]
                    c = ud_get(v, 0)
                    if c:
                        hp_pop(min_upper)
                        upper_delayed[v] = c - 1
                    else:
                        break
                result.append((-max_lower[0] + min_upper[0]) / 2.0)
            else:
                result.append(float(-max_lower[0]))

    return result
```

Need check if `ld_get` bound method sees updates to `lower_delayed`? Yes. But if we assign `lower_delayed[v] = c - 1`, `ld_get` still bound to same dict. Good.

Potential bug: In add, if lower_size >0 but max_lower contains only stale entries and lower_size>0? clean loop pops stale until max_lower empty or top valid. If it becomes empty, then `-max_lower[0]` error. But if lower_size>0, there must be valid entries. However consider duplicate delayed mislabeling could cause physical valid count zero but logical size >0? We argued no. But let's stress test a scenario where delayed count for a value is positive but physical count of that value is zero? Could happen if we increment delayed for a value not physically present in that heap. We only increment when removing from heap if classification says x in heap. Classification uses lower top. It guarantees a valid x in lower logical, so physical_count[x] - delayed[x] >0 before increment. After increment, physical_count[x] - delayed[x] >=0. So delayed <= physical. Good.

When clean pops top value v, it decrements delayed[v]. It pops a physical entry of value v. physical_count[v] decreases. If delayed[v] was >0, after decrement still <= physical. Good.

Thus physical valid count equals logical size. If lower_size>0, there is at least one physical entry with delayed count not covering it; top after cleaning valid. clean won't empty.

But there is a subtle case with floats and negative zero: `-max_lower[0]` might produce 0.0 for -0.0. delayed keys: if x=-0.0, -x=0.0. If x=0.0, -x=-0.0? Actually -0.0 is -0.0. Dict keys 0.0 and -0.0 equal. Fine. But `x <= -max_lower[0]` with -0.0 and 0.0 equal. Good.

Potential bug: When rebalancing after add, if lower_size < upper_size, we clean upper and pop min upper. But what if upper_size >0 but min_upper empty? Similar impossible.

Potential bug: After add, if lower_size > upper_size + 1, we clean lower and pop max lower. But what if the popped value has delayed count for that value zero, but there are stale entries of same value not at top? No pending for that value, so all same value valid. Good.

Now, let's test with a more complex random sequence mentally or by reasoning. Could there be a case where classification by lower top fails because lower top is stale with delayed count zero but not actually valid due to duplicate delayed mislabel? We argued clean ensures for top value delayed count zero. But if physical_count[value] - delayed[value] = 0 but delayed[value]=0, that means physical_count=0, impossible if top value present. So valid.

Let's consider a scenario with duplicates across heaps and per-heap delayed.
Window lower valid: [1, 2], upper valid: [2, 3]. Physical lower may have stale 1? Let's construct.
After some removals, lower_delayed[1]=1, lower physical [2,1]. lower_size=1 (valid 2). upper valid [2,3], upper_size=2. But balanced? lower_size1 upper_size2 would rebalance. Suppose total k=3? lower_size2 upper_size1 normally. Let's not.
Add x=2. lower_size maybe 1, upper_size2? Before add invariant lower<=upper? lower valid [2], upper [2,3]. Add 2: clean lower top2, x<=2 push lower -> lower physical [2,2,1], lower_size2, upper_size2. Balanced. Median even lower top2 upper top2 =>2. Remove outgoing y=1. lower_size2 upper2. clean lower top2, y=1 <=2 -> remove lower: lower_size1, lower_delayed[1]=1 (already? It was 1, now 2). lower physical [2,2,1], delayed1=2. logical lower valid? physical_count 2:2,1:1; delayed 1:2 -> valid 2:2, total2? But lower_size=1. Inconsistency! Wait we had stale 1 already delayed=1 before add? Let's reconstruct carefully. If lower physical [2,1] with delayed1=1, logical lower valid [2], lower_size=1. But balanced invariant with upper_size? If total window size before add maybe k=3? lower_size1 upper_size2? Not balanced; would have rebalanced before. So such state shouldn't persist after rebalance. But could be transient before median? We rebalance after every add/remove. So after operations, balanced. If lower_size1 upper_size2 impossible. So stale 1 in lower with logical lower_size1 and upper_size? For k=3, lower_size2 upper_size1. Let's make lower physical [2,1], delayed1=1, logical lower [2] but lower_size should be 1, not 2. To have lower_size2, logical lower [2,?] maybe [2,2]? physical [2,2,1], delayed1=1. Okay.
Window lower valid [2,2], upper valid [3], lower_size2 upper_size1. lower physical [2,2,1], delayed1=1. Add x=2: clean lower top2 (delayed2=0), push lower -> physical [2,2,2,1], lower_size3, upper1. Rebalance lower>upper+1: clean lower top2, pop valid 2, lower_size2, push upper 2 -> upper physical [2,3], upper_size2. Now window valid lower [2,2], upper [2,3]? But total 4? Wait before add total 3? If k=3, after add before remove total 4 transient. Okay. Then remove y=1 (outgoing). lower_size2 upper2. clean lower top2, y=1 <=2 -> lower_size1, lower_delayed[1]=2. lower physical [2,2,1], delayed1=2. logical lower valid? physical_count 2:2,1:1; delayed1=2 => valid 2:2, total2, but lower_size=1. Inconsistency! This suggests a problem: We marked delayed for 1 again, but there was already a stale 1 that was never popped (buried). Logical lower_size before removal was 2 (valid 2,2). The stale 1 was not part of logical. Removing y=1 (which is outgoing and still physically present but stale? Wait y=1 is outgoing, but if it was already stale from a previous removal, it cannot be outgoing again. A value can only leave once. If 1 was already stale, it was removed in a previous window; it cannot be removed again. So this scenario invalid: y=1 outgoing must not have been previously removed. Thus lower_delayed[1] should be 0 before removing y=1. Good. Stale entries correspond to values already removed. You can't remove same index again. If duplicates equal, a previous removed duplicate could have same value, and delayed count for that value positive. Then a later outgoing duplicate with same value may be removed; delayed count increments. Is that invalid? The previous stale duplicate is already removed; the new outgoing duplicate is a different occurrence with same value. There are two stale occurrences of value 1 to ignore. Physical lower may have two 1 entries? If one was stale buried, and another valid outgoing 1. Then physical_count[1]=2, delayed before=1, logical valid 1=1. Remove outgoing 1: delayed becomes2, logical lower_size decreases. Physical_count=2, delayed=2, valid 1=0. Consistent. In my scenario, lower physical had only one 1 but delayed before=1, logical valid 1=0; yet lower_size included only 2s. Then removing another 1 would make delayed=2 > physical_count=1, inconsistency. But that would mean two logical removals of value 1 while only one physical 1 in lower. Could that happen? If a previous 1 was removed from lower (stale in lower), and later another 1 is outgoing and classified to lower, but there is no physical 1 in lower (only the stale one already counted). However if lower has no valid 1, classification by lower top might still choose lower if y=1 <= lower_top. But if lower has no valid 1, and y=1 is in upper, choosing lower is wrong. This is the duplicate misclassification issue! Let's examine.

Example: lower valid [2,2], upper valid [1? impossible upper >= lower]. If y=1 and lower_top=2, upper must have values >=2, so upper cannot have 1. Thus if y=1 is in window, it must be in lower. So there must be a valid 1 in lower if y=1 <= lower_top. Therefore physical_count[1] - delayed[1] >=1. So physical_count[1] >= delayed[1]+1. In my scenario physical_count[1]=1, delayed=1 => no valid 1; then y=1 cannot be in window. So invalid. Good.

But what if previous stale 1 is in lower, and later outgoing 1 is in upper? Could y=1 be in upper while lower_top=2? No, upper values >= lower_top=2, so no. If lower_top=1, and lower has no valid 1 but top stale 1? clean would pop stale 1 until no delayed 1; if lower has no valid 1, lower top would be lower max maybe <1? But if lower_top=1 after clean, there is valid 1. So classification safe.

Thus delayed <= physical and classification safe.

Now, consider duplicate values and previous stale in same heap. Suppose lower valid [1,2], upper [2,3]. lower physical has stale 1 (delayed1=1) plus valid 1,2? physical_count1=2, delayed1=1, valid1=1. Remove outgoing 1. lower_top=2, y=1<=2 choose lower. delayed1 becomes2, physical_count1=2, valid1=0. lower_size decreases. Consistent. Good.

What if outgoing 1 is in upper? upper has 1? But lower_top=2, upper values >=2, impossible. If lower_top=1, upper may have 1. lower valid may have 1 top. If lower has no valid 1 but top stale 1? clean pops. If lower top <1, y=1 > lower_top choose upper. Good.

So algorithm correct.

Let's think about using `list[float]` type. In Python 3.11, `list[float]` is okay. Function signature as requested.

Need maybe handle `k` not int? Type says int. If k is bool? bool is int subclass; k=True -> 1, k=False -> 0 ValueError. Fine.

Now, possible issue: The median for even k is mean of two middle values. Our lower top is max of lower half, upper top min of upper half. For even k, middle two are these. Average float. Good.

Now, test with simple sorted array n=5,k=3: [1,2,3,4,5]
i0 add1 ls1
i1 add2: lower top1, 2>1 upper us1. no median.
i2 add3: lower top1, 3>1 upper us2. rebalance ls<us: pop upper min2, us1, push lower2 ls2. median lower_size2 upper1 -> lower top2. Correct [1,2,3] median2.
i3 add4: lower top2, 4>2 upper us2. median? i>=k remove i-k=1 first? In loop, add then remove then median. i=3: add4 us2, rebalance? ls2 us2 no. remove y=1: lower top2, y<=2 -> lower ls1, delayed1. rebalance ls<us (1<2): clean upper top3? upper has 3,4. pop3 us1, push lower3 ls2. median: lower top3, upper top4? lower_size2 upper1 -> median3. Window [2,3,4] median3. Correct.
i4 add5: lower top3, 5>3 upper us2. remove y=2: lower top3, y<=3 -> lower ls1, delayed2. rebalance ls<us: clean upper top4? upper 4,5. pop4 us1, push lower4 ls2. median lower top4, upper5 -> median4. Window [3,4,5]. Correct.

Test descending [5,4,3,2,1], k=3:
i0 add5 lower5
i1 add4: lower top5, 4<=5 lower ls2; rebalance lower>upper+1: pop lower max5, push upper5, lower4 us1. median? no.
i2 add3: lower top4, 3<=4 lower ls2; median lower_size2 upper1 -> lower top4. Window [5,4,3] median4.
i3 add2: lower top4, 2<=4 lower ls3; rebalance lower>upper+1: pop lower max4, push upper4, lower top3, upper [4,5], ls2 us2. remove y=5: lower top3, y=5>3 -> upper us1, delayed upper5. rebalance ls>us+1? 2>2 no. median even: clean lower top3, clean upper: upper top4 delayed4?0, median (3+4)/2=3.5. Window [4,3,2] median3.5. Correct.
i4 add1: lower top3, 1<=3 lower ls3; rebalance lower>upper+1: pop lower max3, push upper3, lower top2, upper [3,4,5? stale5], ls2 us2. remove y=4: lower top2, y=4>2 -> upper us1, delayed upper4. rebalance no. median even: clean lower top2; clean upper: top3 delayed3?0, median (2+3)/2=2.5. Window [3,2,1] median2.5. Correct. Stale 5,4 remain upper; upper_size1 but physical upper has 3,4,5. delayed upper4=1, upper5=1. upper valid 3. Good.

Now, consider case where stale upper top has delayed and is popped during median/rebalance. Descending above after i4 upper physical [3,4,5], delayed 4,5. upper top3 valid. Stale buried. If later remove 3, classification lower top2, y=3>2 -> upper delayed3=1, upper_size0. Rebalance lower_size2 upper0 -> move lower max2 to upper: clean upper? upper top3? Wait upper physical [3,4,5], upper_delayed3=1. clean upper pops 3, delayed3=0; next top4 delayed4=1 pop; delayed4=0; next top5 delayed5=1 pop; upper empty. Then pop? But upper_size was 0, we are moving from lower to upper, not upper. Rebalance condition lower_size > upper_size+1 (2>1) moves from lower to upper. It cleans lower, pops lower max2, pushes upper2. Upper physical now [2,4,5]? Actually stale 4,5 still. upper_size1. Median odd? For k=3 window [2,1]? Wait total should 3? Let's not. If later need upper top, clean upper will pop stale 4,5. Good.

Now, one important subtlety: When rebalancing from upper to lower, we clean upper and pop min valid. But if upper has stale entries with values smaller than valid min, they will be at top and popped. Good. If stale entries with values larger than valid min, they are buried. Fine.

Now, let's consider if we can further simplify by using `heapq.heappushpop`? Not needed.

Potential issue with using `enumerate(nums)` and accessing `nums[i-k]`. For n=200k, okay. Could store `nums_local = nums` for speed. Already local.

Now, should we preallocate result list? `result = [0.0] * (n - k + 1)` and assign by index might be faster and avoids append. Could do. Since output length known. Use `res = [0.0] * (n - k + 1)`, `out_idx = 0`, when median `res[out_idx] = ...; out_idx += 1`. This may be faster. Let's consider. Append is amortized O(1), fine. Prealloc maybe slightly faster. Use prealloc.

```
out = [0.0] * (n - k + 1)
out_idx = 0
...
if i >= k - 1:
   ...
   out[out_idx] = ...
   out_idx += 1
return out
```
Good.

Need ensure if k > n, n-k+1 negative; but we raise before.

Now, code with repetitive cleaning. Could factor cleaning into local functions to reduce code size. But final answer can be long. Need single code block. Repetition okay. But risk of bugs in repeated blocks. Could define small inline functions? Let's weigh. A nested `clean_lower` and `clean_upper` would make code shorter and less error-prone. Performance likely okay. But we can define them with local variables via default args to reduce closure? Example:
```
def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, hp_pop=hp_pop, ld_get=ld_get):
    while max_lower:
        v = -max_lower[0]
        c = ld_get(v, 0)
        if c:
            hp_pop(max_lower)
            lower_delayed[v] = c - 1
        else:
            break
```
But `ld_get` bound to original dict; updates okay. `lower_delayed` default local. `max_lower` default local. This function does not need nonlocal. Calling `clean_lower()` will use default locals. Function call overhead. But code cleaner. Similarly `clean_upper`. Rebalance still needs sizes; could inline.

If we use nested functions, `ld_get` bound method is captured. But if we reassign `lower_delayed`? no. Good.

However, Python's default args capture at definition time. `ld_get = lower_delayed.get` defined before function. Good.

Could also define `clean_lower` after binding. Then in loop call `clean_lower()`. This reduces repeated while code. I think acceptable for 2s. Let's estimate function calls: clean_lower called after add, after remove, after median (for lower) => up to 3 per iter = 600k. clean_upper called after rebalance when moving from upper, after median even, maybe 2 per iter = 400k. Total ~1M function calls. Function call overhead maybe ~0.1-0.2 micro? Actually Python function call ~100 ns? No, ~80 ns in 3.11? Maybe ~50-100 ns? Let's recall: Python function call is ~50-100 ns? More like 100-200 ns? 1M calls ~0.1-0.2s. Fine. But closure/default maybe. Heap ops 1M? Should be <2s. Use functions for maintainability.

But rebalance code still repeated after add/remove. Could define `rebalance()` with nonlocal sizes. 400k calls. Maybe okay. But nonlocal variable access slower. Could inline rebalance to be safe. Or define `rebalance` taking and returning sizes? Function call plus tuple return overhead. Inline better.

Maybe use helper functions for clean only, inline rebalance. Code length moderate. Let's draft with clean functions:

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    max_lower = []
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get
    hp_push = heapq.heappush
    hp_pop = heapq.heappop

    def clean_lower():
        while max_lower:
            v = -max_lower[0]
            c = ld_get(v, 0)
            if c:
                hp_pop(max_lower)
                lower_delayed[v] = c - 1
            else:
                break

    def clean_upper():
        while min_upper:
            v = min_upper[0]
            c = ud_get(v, 0)
            if c:
                hp_pop(min_upper)
                upper_delayed[v] = c - 1
            else:
                break

    out = [0.0] * (n - k + 1)
    out_idx = 0
    for i, x in enumerate(nums):
        if lower_size:
            clean_lower()
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        if lower_size < upper_size:
            clean_upper()
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            clean_lower()
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            if lower_size < upper_size:
                clean_upper()
                v = hp_pop(min_upper)
                upper_size -= 1
                hp_push(max_lower, -v)
                lower_size += 1
            elif lower_size > upper_size + 1:
                clean_lower()
                v = -hp_pop(max_lower)
                lower_size -= 1
                hp_push(min_upper, v)
                upper_size += 1

        if i >= k - 1:
            clean_lower()
            if lower_size == upper_size:
                clean_upper()
                out[out_idx] = (-max_lower[0] + min_upper[0]) / 2.0
            else:
                out[out_idx] = float(-max_lower[0])
            out_idx += 1
    return out
```

Need consider: In add, if lower_size>0 but max_lower empty? clean_lower leaves empty, then `-max_lower[0]` error. Could add guard:
```
if lower_size:
    clean_lower()
    if not max_lower:
        # should not happen, but push to lower
        hp_push(max_lower, -x); lower_size +=1
    elif x <= -max_lower[0]: ...
```
But if lower_size>0 and max_lower empty, logical inconsistent. Pushing would make lower_size+1, still inconsistent. Better to avoid error by treating as lower? But could hide bug. Since impossible, leave. For robustness against NaN? If NaN comparisons false, could break? Let's ignore.

But there is a scenario: lower_size>0, max_lower contains only stale entries, and clean_lower pops them all. If logical size >0, there must be valid entries, so not empty. But what if valid entries were popped erroneously due to delayed count misassignment? We argued no. So safe.

Now, nested functions `clean_lower` and `clean_upper` use `ld_get` and `ud_get` from outer scope. They are cell variables? Since they are read in nested function, they become free variables. Accessing free variables is slower than local. But okay. Could pass as default args to make local:
```
def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
    ...
```
Then inside, all are local default parameters. But `max_lower` is a list, `lower_delayed` dict, `ld_get` method, `hp_pop` function. This avoids closure cell access. However, default args evaluated at definition. Good. But if we use `lower_delayed[v] = c - 1`, `lower_delayed` local. Good. Let's do that for speed. Similarly clean_upper.

```
def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
    while max_lower:
        v = -max_lower[0]
        c = ld_get(v, 0)
        if c:
            hp_pop(max_lower)
            lower_delayed[v] = c - 1
        else:
            break
```
But `ld_get` is bound method of `lower_delayed`. If we update `lower_delayed`, bound method sees updates. Good.

One subtlety: If we ever reassign `lower_delayed` (we don't), default would be stale. No.

Now, in main loop, `lower_size` and `upper_size` are local variables in `sliding_median`. No nested function modifies them. Good.

Potential issue: `ld_get` bound method is local in main too. When we update `lower_delayed[y] = ld_get(y,0)+1`, if y not present, get returns 0. If present with 0, returns 0. Good.

Could we delete zero delayed keys to keep dict small? We leave zeros. But `ld_get` returns 0 for zero. Good. However, if delayed count becomes 0, and later we increment, `ld_get` returns 0, set to 1. Good.

Memory: lower_delayed and upper_delayed may accumulate zero keys for every distinct removed value. 200k entries okay. But if n=200k, k=1000, distinct values maybe 200k. Two dicts total maybe 200k keys, each key float object (already in nums? Floats are objects; dict stores references). Memory maybe ~20MB. Acceptable. If want lower memory, delete zeros. But delete overhead. Could use `if c == 1: del lower_delayed[v] else: lower_delayed[v] = c-1`. This keeps dict small. For n=200k, memory not issue. Speed? Deleting 200k times maybe okay. Leaving zeros avoids delete but dict lookup for zero keys still. Which is faster? Hard to know. I'd leave zeros for simplicity and speed (no del branch). But zero keys can cause `ld_get(v,0)` to return 0 for many stale values; still one dict lookup. If delete, get returns None? We can use `c = ld_get(v)` and if c is not None. But then need handle count. Maybe delete not necessary.

Potential issue with leaving zeros: If a value had delayed count decremented to 0, but there are still stale entries of that value? Could that happen? Delayed count equals number of stale entries not yet popped. If it reaches 0, no stale entries of that value remain (conceptually). If we popped valid copies instead of stale, the remaining physical entries of that value are all valid. So zero is correct. Good.

Now, let's consider if `heapq` can handle storing negative floats and comparing. Yes.

Now, possible alternative: Use `heapq` with lazy deletion and maintain `lower_size`/`upper_size` but no per-heap delayed? We settled per-heap.

Let's try to find a counterexample to classification by lower top with per-heap delayed. We need a state after rebalancing where invariant all lower <= all upper holds logically. Does lazy deletion preserve invariant when stale entries remain? Stale entries are not part of logical multiset. Logical lower/upper multisets are physical multisets minus delayed counts. We maintain by operations. Moves use valid tops. So invariant holds.

Proof of classification: If lower_size>0, let L = max valid lower. After clean_lower, heap top is L (max valid lower). For any y in valid upper, y >= L. If y <= L, then y cannot be in upper unless y == L and lower has L. If y < L, not in upper. If y == L, lower has L (top). Thus if y <= L, there is a valid y in lower. If y > L, y cannot be in lower because all valid lower <= L < y, so y in upper. Good.

Now, what if y is NaN? Comparisons false; classification may fail. Problem likely assumes normal floats. Could handle NaN? Median with NaN undefined. Ignore.

Now, need ensure output length exactly n-k+1. `out_idx` should equal. Could assert? No. Return out.

Now, let's think about time. With nested clean functions, each clean call checks while. For each iteration, add clean_lower (if lower_size), maybe rebalance clean, remove clean_lower, maybe rebalance clean, median clean_lower. That's up to 4 lower clean calls. Each clean call does at least one dict get. 200k*4=800k gets. Fine.

Heap operations: Add one push. Rebalance maybe one pop+push if size imbalance. In sliding window with fixed k, after initial build, each add and remove changes sizes. Let's see how often rebalance occurs. For odd/even, after add then remove, maybe one rebalance each. Example k=3: add may cause lower+1, remove may cause lower-1; often one rebalance after add or remove. Worst-case 2 rebalances per iteration (one after add, one after remove). Each rebalance one pop+push. So up to 4 heap ops per iteration (add push, add rebalance pop/push, remove maybe delayed no heap, remove rebalance pop/push) = 4 heap ops. 200k*4=800k heap ops. Good.

But note: remove itself doesn't pop immediately; stale popped later during clean. Total stale pops <= n. So total heap pops ~ rebalances + stale pops ~ 400k? Actually rebalances pop valid, stale pops pop stale. Total pushes n + rebalance pushes ~ n. Total pops ~ rebalance pops + stale pops ~ n + n? Each removed element eventually popped as stale if not moved? Some removed elements may be popped as stale; each element pushed once, popped at most once. Total heap pops <= total pushes ~ 2n? Because rebalance pushes add extra entries (moving existing elements). An element can be pushed multiple times when moved between heaps. How many moves? Each add/remove can cause at most one move. So total pushes = n (adds) + moves (<=2n) = 3n. Pops = moves (pop source) + stale pops (<= number of stale entries = n removals? plus maybe stale from moved elements? Removed elements that are moved? If an element is removed while not top, it remains stale and later popped. If an element is moved after being marked stale? Can a stale element be moved? We clean source before moving, so stale top popped, not moved. Stale buried can never be moved because only top moved. So stale pops <= removals = n. Total pops <= moves + n <= 3n. So ~600k heap ops. Fine.

Now, one more subtle issue: When an element is moved from upper to lower, we pop it from upper and push to lower. If that element had been marked delayed in upper? We clean upper top, so top not delayed. But what if there is a delayed count for the same value, and the top value has delayed count 0 but there are delayed copies of same value buried? As discussed, if delayed count 0, no delayed copies of that value? Wait delayed count is per value, not per entry. If delayed count 0, there are no pending removals for that value in that heap. So no buried delayed copies of that value. Good. If delayed count >0, clean would pop top copies until count 0. It might pop valid copies, but after count 0, no pending. So moved value not stale.

Now, let's consider the scenario where delayed count for value v >0 but top value is not v (v buried). clean doesn't pop v. Later we move a different value w. Stale v remains. Fine. If later we move v after delayed count? It won't be top until stale entries above popped. When v reaches top, if delayed[v]>0, clean pops it (or copies) before it can be moved. So stale v never moved. Good.

Now, code style: The user requested "Write `sliding_median(nums: list[float], k: int) -> list[float]` ... Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing." So final should be just code block. Can include import. Good.

Need maybe include from __future__? No.

Let's consider if using `list[float]` in signature is okay in Python 3.11. Yes.

Now, let's think about a possible more efficient approach using two heaps and `heapq._heapify_max`? Not needed.

Could there be an issue with initial building using the same add/remove loop: For i from 0 to k-1, no removals. After k-1, window size k. Good. But sizes balanced? After adding k elements, rebalance after each add ensures balanced for current size (which grows from 1 to k). For size m, lower_size = ceil(m/2), upper=floor(m/2). For k even, lower=upper=k/2; for odd lower=upper+1. Good.

Now, if k=1, after i=0 median. Then i=1 add, remove, median. Good.

Let's test k=1 with duplicate and stale:
nums=[1,2,1]
i0 add1 lower1 ls1 median1
i1 add2: clean lower top1, 2>1 upper2 us1. rebalance? ls1 us1 no. remove y=1: lower_size1, clean lower top1, y<=1 -> lower ls0, lower_delayed1=1. rebalance ls<us: clean upper top2, pop2 us0, push lower2 ls1. median: clean lower: top2 delayed2?0, out2. Window [2].
i2 add1: lower_size1, clean lower top2, 1<=2 push lower1 ls2. rebalance lower>upper+1: clean lower top2, pop2 ls1, push upper2 us1. remove y=2: lower_size1, clean lower top1, y=2>1 -> upper us0, upper_delayed2=1. rebalance lower>upper+1? ls1 >1? no. median: clean lower top1, lower_size1 upper0 -> out1. Window [1]. Correct. Upper stale 2 remains.

Now, consider if lower_size=0 after removal and upper_size>0 before rebalance. In k=1 above, after remove lower0 upper1, rebalance moves upper to lower. Good. In remove code, if lower_size==0, we assume y in upper and decrement upper_size. Could upper_size be 0? If total window size before removal k, and lower_size=0, then upper_size=k. For k>=1. If k=1, upper_size=1. Good. After decrement, upper_size=k-1. Rebalance moves if lower<upper.

Now, let's think about using `float(-max_lower[0])` for odd median. If `-max_lower[0]` is an int? nums float, but if list contains ints, -int is int, float() makes float. Good. If value is inf, float(inf) inf. If value is nan, float(nan) nan.

For even median, `(-max_lower[0] + min_upper[0]) / 2.0`. If both ints, result float. If one inf and other -inf, nan. Fine.

Now, potential bug with `clean_lower` default args: It captures `ld_get` bound method. In main loop, we also use `ld_get`. If we modify `lower_delayed` by assigning new keys, bound method okay. But if we use `lower_delayed = {}` reassign? no.

Could `ld_get` become invalid if dict is mutated? No.

Now, let's consider if we should use `heapq.heappush` and `heapq.heappop` imported as functions. Good.

Now, possible issue: Python's `heapq` on list of floats with negative zero: `max_lower` stores `-x`. If x = -0.0, -x = 0.0. If x = 0.0, -x = -0.0. In min heap, -0.0 and 0.0 compare equal. `v = -max_lower[0]`: if stored -0.0, v=0.0; if stored 0.0, v=-0.0. delayed key uses v. Since -0.0 == 0.0, dict same. Fine.

Now, let's think about if `nums` is a list of `float` but very large and adding two middle values overflows? Python float inf. Not specified.

Now, can we improve by using `math.fsum`? No, simple average.

Now, let's consider an alternative with two `heapq` and `Counter` per heap might be more obviously correct but slower. Our code is a bit subtle; but final only code, no explanation. Need ensure no hidden bug.

Let's do a more formal invariant check with per-heap delayed counts by value, not unique. We maintain logical sizes `ls`, `us`. For each heap H and delayed dict D_H, the multiset of valid elements in H is the multiset of heap entries minus D_H (by value counts). We need D_H counts <= heap entry counts. Operations:
- Add x to H: push x, increment size. D unchanged. Valid multiset gains x. Invariant partition checked.
- Remove x from H: choose H such that valid multiset contains x. Decrement size, increment D_H[x]. Heap entry counts unchanged. Valid multiset loses x. D_H[x] <= entry count? Before, valid count for x = entry - D >=1. After D+1, valid count = entry - D -1 >=0. Good.
- Clean H: while top value v has D_H[v] >0: pop entry, D_H[v]--. Entry count--, D--. Valid count for v unchanged. D <= entry remains. Top after clean has D[top]=0. Is top the max/min valid? For max heap, root is max entry. If root value v has D[v]=0, then valid count for v = entry_count[v] >0 (since root entry present). Any entry with value greater than v would be root, contradiction. Thus root is max among valid entries. Good.
- Move from H to G: clean H, pop root v (valid), decrement size H, push v to G, increment size G. Entry counts: H--, G++. D unchanged. Valid multiset moves v. Partition checked.
Thus correct.

Now, classification for remove: Need choose H such that valid multiset contains x. We use Lmax = max valid lower after clean. If lower_size>0. If x <= Lmax, valid lower contains x? We know all valid upper >= Lmax. If x < Lmax, x cannot be in upper, so must be in lower (since x is in window). If x == Lmax, lower contains Lmax (root), so valid lower contains x. Thus choose lower. If x > Lmax, x cannot be in lower, so in upper. If lower_size=0, all in upper. Good.

Now, one nuance: What if x is in window but due to previous duplicate choices, the logical partition has x in lower but x > Lmax? Impossible because Lmax is max lower. If x in lower, x <= Lmax. Good.

Now, initial state empty: ls=us=0, heaps empty, D empty. Good.

Now, let's consider if after add before remove, total size k+1, partition invariant holds. After remove, total k, partition holds. Good.

Now, potential issue with rebalancing after add before remove: We may move elements. Does moving based on logical sizes and valid tops preserve partition when total size temporarily k+1? Yes same proof.

Now, let's test a tricky sequence with duplicates and stale across heaps.
nums = [1, 2, 2, 1, 2], k=3.
Expected medians: [1,2,2] ->2; [2,2,1] ->2; [2,1,2] ->2.
Run algorithm:
i0 add1 lower1 ls1
i1 add2 upper2 us1
i2 add2: lower top1, 2>1 upper us2; rebalance move upper min2 to lower: upper [2], lower [2,1] ls2 us1. median lower top2.
i3 add2: lower top2, x<=2 lower push2 ls3; rebalance lower>us+1: clean lower top2, pop2 (which one?) lower physical [2,2,1], pop root 2, push upper2. upper physical [2,2], us2, lower physical [2,1], ls2. remove y=nums0=1: lower_size2, clean lower top2, y=1<=2 -> lower ls1, lower_delayed1=1. rebalance ls<us (1<2): clean upper top2, pop2 us1, push lower2 ls2. lower physical [2,2,1] (stale1), upper [2]. median lower_size2 upper1 -> clean lower top2, median2. Window [2,2,1] correct.
i4 add2: lower top2, x<=2 lower push2 ls3; rebalance lower>us+1: clean lower top2, pop2, push upper2. upper physical [2,2], us2, lower physical [2,2,1] ls2. remove y=nums1=2: lower_size2, clean lower top2, y=2<=2 -> lower ls1, lower_delayed2=1. rebalance ls<us (1<2): clean upper top2, upper_delayed2?0, pop2 us1, push lower2 ls2. lower physical now? It had [2,2,1] plus pushed 2, and delayed2=1. physical 2:3,1:1. delayed2=1, delayed1=1. logical lower valid: 2:2, total2? But lower_size=2. Yes. upper physical [2], us1. median lower_size2 upper1 -> clean lower: top2, delayed2=1 -> pop a 2, delayed2=0. Now lower physical 2:2,1:1; top2. median2. Window [2,1,2] correct. Stale 1 remains. Good.

If later median even maybe upper stale? Fine.

Now, let's consider a case where stale value equals current top and delayed count positive, clean pops valid copy, leaving stale copy. Example lower physical [2(stale), 2(valid)], delayed2=1. clean pops root 2 (could be valid), delayed0, remaining physical [2(stale)] now considered valid. Logical lower_size before clean? If lower_size counts valid entries, before clean valid count of 2 = physical 2 - delayed1 =1. After popping one, physical1, delayed0, valid count1. Good. The remaining stale is now valid, but value same. So logical multiset unchanged. Good.

Now, possible issue with using `ld_get` bound method after dict changes: If we do `lower_delayed[v] = c - 1`, and c-1 is 0, `ld_get(v,0)` returns 0. Good.

Now, let's think about if `heapq.heappop` on empty list in rebalance due to logical size positive but heap empty after cleaning stale. We trust impossible. But to be extra safe, we could in rebalance clean and then if heap empty, adjust? But that could mask inconsistency. For production, maybe include guard to avoid runtime error in weird NaN cases. But problem likely not NaN. Adding guard could complicate.

If nums contains NaN, comparisons false, partition invariant broken. Not required.

Now, one more performance consideration: The nested clean functions with default args still use `while max_lower:` where `max_lower` is a local parameter. Good. But `ld_get` is a local parameter. `lower_delayed` local. `hp_pop` local. Very fast.

Could we further optimize by not cleaning lower in add if we just cleaned lower in previous median/remove? But stale can be introduced by removal before add? Sequence in loop: add, remove, median. Stale introduced during remove after add. Next iteration add occurs after previous median cleaned lower and maybe upper. So lower top may still be valid; no new stale in lower except if previous remove marked lower delayed and median clean_lower didn't pop it because not top. Add clean_lower will check top; if top not stale, no pop. So okay. Could skip clean in add if we know top valid? But stale may be top due to previous remove if top value marked. Need clean. Fine.

Now, let's consider prealloc output and out_idx. If no medians? k > n raises. If n>=k, out length >=1. out_idx final equals length. Good.

Now, code final. But before final, let's maybe think of an even more efficient known approach: maintain two heaps with `lazy_deletion` and `lower_size`/`upper_size`, but use a single `remove` dict and classify by heap? We already have robust.

Let's consider if `lower_delayed` and `upper_delayed` should be `defaultdict(int)`? Plain dict with get faster? Maybe `dict.get` fine. `defaultdict` slower. Use plain.

Now, possible micro-optimization: In remove, when adding delayed, use `lower_delayed[y] = ld_get(y, 0) + 1`. Since `ld_get` bound method local. Good.

Potential issue: `ld_get` is bound to `lower_delayed` before it is mutated. If we ever resize dict, bound method still works. Yes.

Now, let's think about Python scoping: In `sliding_median`, we define `clean_lower` with default args. It references `max_lower`, `lower_delayed`, `ld_get`, `hp_pop` as local parameters. Good. But `max_lower` list is mutable; default arg holds reference. Good.

Now, if we use `max_lower` in main loop, it's local. Good.

Now, final code should not have comments? Comments okay. The user didn't forbid comments. Could include concise comments. But final answer single code block. I can include a docstring. Fine.

Let's maybe include a docstring explaining? Not necessary but okay. No printing.

Now, let's run through edge cases with code mentally:
- nums=[], k=1: n=0, k>n -> ValueError. Good.
- nums=[1.0], k=1: n=1, out len1. i=0 lower_size0 push lower ls1. i>=k? 0>=1 false. i>=0 true: clean_lower (top valid), lower_size != upper_size (1!=0), out[0]=float(1.0). return [1.0]. Good.
- nums=[1.0,2.0], k=2: i0 add1. i1 add2: lower_size1 clean, x>1 push upper us1. rebalance no. i>=k? 1>=2 false. median even: clean lower, clean upper, out (1+2)/2=1.5. Good.
- k=n=200000: loop no removals, output one. Initial build O(n log n) with n=200k, k=200k. But problem performance spec n=200k k=1000. If k=n=200k, heap size 200k, O(n log n) ~ 200k*18 = 3.6M, okay maybe <2s? Might be close but standard. But if k=n large, our algorithm still O(n log n). Could there be a more efficient for k=n? Not needed. But if k=200k, rebalancing each add, heap ops ~ n, okay. Memory okay.

Now, if k=1000, heap size ~1000, fast.

Potential issue: For large k, `lower_delayed` keys zero accumulate up to n, memory okay.

Now, let's consider if we can use `heapq` with negative values for lower. For max heap, storing `-x`. If x is a float, `-x` okay. For very large x, `-x` finite. Good.

Now, let's think about a possible bug in rebalancing after add when lower_size < upper_size: We clean upper, pop min valid, push to lower. But what if upper_size == 0? Condition lower_size < upper_size implies upper_size > lower_size >=0, so upper_size >0. Good.

After remove, same.

Now, what if lower_size > upper_size + 1 and lower heap top is stale with delayed count, clean pops. If after cleaning lower heap empty but lower_size > upper_size+1? impossible. Good.

Now, one subtle point: In add, if lower_size > 0, we clean lower and compare x to `-max_lower[0]`. But if lower_size == upper_size? If x is very small, push lower, lower_size becomes upper_size+1, balanced. If x is very large, push upper, upper_size becomes lower_size+1, rebalance moves min upper to lower. Good.

Now, let's consider if we can reduce repeated rebalance code by defining a local function `rebalance()` that modifies sizes via `nonlocal`. But inline is okay. Code length maybe ~100 lines. Acceptable.

Let's maybe factor rebalance into a nested function to avoid duplication and potential copy-paste errors. It would need modify `lower_size`, `upper_size`, and use heaps/dicts. With `nonlocal lower_size, upper_size`. Function call 400k. Might be okay. But nonlocal access inside function for sizes each time. Could be slower but still likely <2s. However, to be safe for performance, inline. But duplication risk: We have same rebalance block after add and after remove. We must ensure both identical. We can copy carefully.

Maybe define a macro-like nested function but use local variables? Another technique: define `def rebalance(): nonlocal lower_size, upper_size ...` and call. The code is cleaner. Let's estimate performance: 200k iterations, at most 2 rebalance calls per iteration = 400k. Function call overhead maybe 0.05s. Nonlocal variable operations maybe. Heap ops dominate. I think it's safe. But the user demands well under 2 seconds; Python function calls 400k is fine. Let's consider worst-case n=200k, k=1000, 400k function calls, each maybe 0.2 micro? Actually Python function call is ~100 ns? Let's recall from benchmarks: simple function call ~50-100 ns in PyPy? In CPython 3.11, ~100 ns? No, more like 50-100 nanoseconds? Wait, Python can do ~10-50 million simple operations per second. A function call maybe ~100 ns? That would be 10 million/sec. 400k = 0.04s. If 1 micro, 0.4s. Still okay. Heap ops 800k * log 1000 maybe 8M comparisons, maybe 0.5-1s. Total maybe 1.5s. To be safe, inline rebalance. But code duplication manageable.

Let's keep inline rebalance for max performance. Need ensure no typo.

Maybe we can create a small local function for clean only. That's fine.

Now, let's review code line by line for variable scope and mutations.

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    max_lower = []
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get
    hp_push = heapq.heappush
    hp_pop = heapq.heappop

    def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
        while max_lower:
            v = -max_lower[0]
            c = ld_get(v, 0)
            if c:
                hp_pop(max_lower)
                lower_delayed[v] = c - 1
            else:
                break

    def clean_upper(min_upper=min_upper, upper_delayed=upper_delayed, ud_get=ud_get, hp_pop=hp_pop):
        while min_upper:
            v = min_upper[0]
            c = ud_get(v, 0)
            if c:
                hp_pop(min_upper)
                upper_delayed[v] = c - 1
            else:
                break

    out = [0.0] * (n - k + 1)
    out_idx = 0

    for i, x in enumerate(nums):
        if lower_size:
            clean_lower()
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        if lower_size < upper_size:
            clean_upper()
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            clean_lower()
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            if lower_size < upper_size:
                clean_upper()
                v = hp_pop(min_upper)
                upper_size -= 1
                hp_push(max_lower, -v)
                lower_size += 1
            elif lower_size > upper_size + 1:
                clean_lower()
                v = -hp_pop(max_lower)
                lower_size -= 1
                hp_push(min_upper, v)
                upper_size += 1

        if i >= k - 1:
            clean_lower()
            if lower_size == upper_size:
                clean_upper()
                out[out_idx] = (-max_lower[0] + min_upper[0]) / 2.0
            else:
                out[out_idx] = float(-max_lower[0])
            out_idx += 1

    return out
```

Potential issue: In add, if lower_size >0, after clean_lower, `max_lower` could be empty if lower_size inconsistent. If it happens, `-max_lower[0]` IndexError. Could add a safety fallback:
```
if lower_size:
    clean_lower()
    if not max_lower:
        # Should not happen; reset lower_size? 
        lower_size = 0
    if not max_lower:
        hp_push(max_lower, -x); lower_size +=1
    elif x <= -max_lower[0]: ...
```
But if lower_size>0 and max_lower empty, setting lower_size=0 loses valid elements? They are missing, can't recover. Better not. Impossible.

But consider k=1 after removal, lower_size=0, max_lower may have stale entries. Next add lower_size=0, we push to max_lower without cleaning. Suppose max_lower has stale top with value 100, delayed100=1. We push new x=1. max_lower physical [1,100]? Heap min of negatives: stored -1, -100. Root -100 (value100) stale. lower_size=1. Rebalance? upper_size0. Median clean_lower: top value100 delayed100=1 -> pop, delayed0. Next top value1 delayed1?0 -> median1. Good. If we had not cleaned before push, fine.

Now, in add when lower_size=0 but max_lower has stale entries, we don't clean. Could this affect future classification if lower_size becomes >0 and stale top not popped until later? We clean before comparing in next add/remove/median. Good.

Now, one subtle performance/correctness issue: `ld_get` is bound to `lower_delayed.get`. In `clean_lower`, we update `lower_delayed[v] = c - 1`. If c-1 is 0, key remains with 0. `ld_get(v,0)` returns 0. Good. But if c is e.g. 1, set to 0. If later we increment y, `ld_get(y,0)+1` returns 1. Good.

Now, maybe we should use `if c is not None` instead of `if c` to distinguish count 0? We leave zeros, so `if c` false for 0. Good. If count could be negative, false? Negative truth true, but shouldn't.

Now, let's think about if values are `Decimal` or `Fraction`? Type float, but Python allows. `heapq` can compare. Negative of Decimal okay. `/2.0` with Decimal? Decimal / float raises TypeError? Actually Decimal / float not allowed? But type says float. Ignore.

Now, let's consider if `nums` is a tuple? Type list, but code works for sequence. `len` and indexing. Good.

Now, let's maybe include a docstring with complexity. Fine.

Potential hidden requirement: "Return floats." For odd median, if nums contains `float('inf')`, float(inf) okay. For even, division by 2.0 returns float. Good.

Now, let's think about whether the median of even k should be mean of two middle values after sorting window. Our lower/upper partition does that. For even k, lower_size=upper_size. The two middle values are max lower and min upper. Good.

Now, let's consider if the window size k is even and after add/remove lower_size==upper_size. Suppose k=2, after add x and remove y, could lower_size=upper_size=1. Yes.

Now, let's test with all equal values k=1000, n=200k. Algorithm: Many duplicates. Delayed counts for value 0 will accumulate? For all equal, lower and upper both contain same value. Add: initially lower grows until lower_size=upper_size+1. For even k, after initial, lower=upper=500. Add new x: lower top x, x<=top push lower, lower_size=501, upper=500, rebalance? lower>upper+1? 501>501? no. Remove y: lower top x, y<=top remove lower, lower_size=500, delayed lower x +=1. Rebalance? lower=upper. Median: clean lower: top x, delayed lower x maybe 1 -> pop, delayed0. Since there are many x, physical lower count maybe 500? It pops one. Then median lower top x, upper top x. Next iteration add push lower, remove lower delayed++. Over time, lower_delayed[x] may oscillate? Let's see: Each iteration after initial, add push lower (lower_size 501), remove lower (lower_size 500, delayed++). Median clean lower pops one stale (delayed--). So delayed count maybe stays 0 or 1. Physical lower has many x. This works. But classification always lower because y<=top. The outgoing elements could conceptually be in upper, but lower has x, so okay. Over many iterations, lower physical x count and delayed manage. Since all values equal, no issue.

Now, consider all equal but k odd: lower=501, upper=500. Add push lower (502), rebalance lower>upper+1? 502>501 yes: clean lower, pop x, push upper (upper 501, lower501? Wait total before remove 1002? For k=1001, before add lower501 upper500. Add lower502, rebalance move one to upper -> lower501 upper501. Remove lower -> lower500 delayed++, rebalance lower<upper (500<501): move upper min x to lower -> lower501 upper500. Median clean lower maybe pop stale. Works. Many moves, but heap size 1000.

Now, performance with all equal: clean_lower may pop one stale each median. Good.

Now, let's think about if delayed dict counts can grow large if stale entries not at top for long. For all equal, stale at top and popped soon. For distinct increasing values, stale small values may be buried in lower? Example increasing nums, k=1000. Lower contains smallest half. Outgoing smallest values are in lower, likely at bottom? Max heap lower: smallest values are at bottom, not top. Stale small values buried. Delayed counts for those values remain until they reach top. Over time, lower heap may accumulate many stale small values. But heap size can grow beyond k by number of stale not popped. Total stale <= n, but for k=1000, n=200k, heap could grow to 200k? Let's analyze. In increasing sequence, each outgoing is smallest in window, belongs to lower. It is the minimum of lower, which in max heap is at bottom. It will not be popped until all larger valid/stale entries above it are removed. As window slides, larger elements also become outgoing later and may be buried. Could stale entries accumulate to O(n) in lower heap, making heap size O(n) and log factor increase. But each stale is popped eventually when it reaches top. In worst case, heap size can grow to n if stale elements are buried and not popped. n=200k, log 200k ~18, still okay maybe. But memory heap up to 200k, fine. However, if stale elements are buried, clean checks only top; heap size grows. Total heap pushes n + moves, pops stale eventually. Heap operations O((n+moves) log n) still okay for 200k. Under 2s? 200k log 200k ~3.6M, plus Python heap ops maybe okay. But if heap size grows to 200k, each push/pop log 200k, 800k*18 ~14M comparisons, maybe ~1s-2s. Should still be okay on normal PC? Maybe close. Could we bound heap size by cleaning buried stale? Not easy. But n=200k, log 200k not bad.

However, consider worst-case where stale elements are always buried and never popped until end, heap size ~n. 200k heap size, Python list memory okay. Heapq operations in Python are Python-level loops (siftdown) with comparisons. 800k*18 ~14.4M loop iterations, maybe ~1s? Could be ~2s. Need ensure well under 2s. Maybe we can improve by using a different algorithm with O(n log k) bounded heap size? Lazy deletion with buried stale can grow heap size to n, but total operations still O(n log n) worst-case. For n=200k, likely okay in Python? Let's estimate CPython heapq: heapq heappush/pop on 200k list maybe ~1 micro? 800k*1us=0.8s. Dict gets ~1M. Total maybe 1.5s. Acceptable. But if 2s limit, maybe need more efficient.

Can we bound heap size by periodically rebuilding? Or use a balanced BST? Not stdlib. Could use `heapq` with lazy deletion and periodically clean all if heap size too large? Since k=1000, we can rebuild heaps from current window when physical heap size exceeds some threshold (e.g., 2*k or 4*k). This would bound heap size and maybe improve performance. But rebuilding requires knowing current window multiset. We can maintain current window? We have nums and i. At index i, window after removal is nums[i-k+1:i+1]. We could rebuild from that slice when heap size > threshold. But slicing of size k=1000 cheap. Rebuilding O(k) heapify. If done every time heap size exceeds say 2k, total O(n). This can bound heap size and prevent O(n log n) worst-case. But need also rebuild delayed dicts and sizes. Could be beneficial.

Should we add periodic rebuild? It adds complexity but ensures efficiency. For n=200k, k=1000, even without rebuild likely okay. But "well under 2 seconds" maybe we want robust. Let's consider implementing a rebuild when `len(max_lower) + len(min_upper) > 2 * k` or maybe `> 3 * k`. Since logical window size k, physical heaps may contain stale. If total physical length > 2*k, rebuild from current window (after removal) to restore heaps with exactly k elements and empty delayed. But need ensure we rebuild at a point where window is valid (after removal, before median or after median?). We can rebuild after removal before median, or after median before next add. Simpler: after removal (if i >= k), before median, if `len(max_lower) + len(min_upper) > 2 * k`: rebuild. But for i=k-1 initial no removal, physical size k, no rebuild. For later, window is nums[i-k+1:i+1]. We can rebuild by constructing lower/upper heaps directly? We can just create two heaps from the window using our add algorithm? O(k log k) if using add. Better: Use sorting? k=1000, sorting O(k log k) maybe okay if infrequent. But rebuild should be efficient. We can split sorted window into lower/upper and heapify. For k maybe up to 200k? If k large, sorting rebuild expensive. But threshold maybe 2k; number of rebuilds O(n/k)? If k large, n/k small. Sorting k each rebuild could be O((n/k)*k log k)=O(n log k), okay. But if k=200k, n/k=1, sorting 200k once okay. But if k=1000, sorting 1000 ~10k ops per rebuild, rebuilds maybe n/k=200, total 2M, okay.

But rebuilding by sorting slice: `window = nums[i-k+1:i+1]` creates list of k floats. `window.sort()`. Then lower part and upper part. For even k: lower = window[:k//2], upper = window[k//2:]. For odd: lower = window[:k//2+1], upper = window[k//2+1:]. Need max heap for lower: store negatives. `max_lower = [-v for v in lower]`; `heapq.heapify(max_lower)`. `min_upper = upper`; `heapq.heapify(min_upper)`. But assigning to `max_lower` in local scope would change variable; nested clean functions default args capture old list! If we reassign `max_lower`, clean_lower still references old list. So either mutate old list in place: `max_lower[:] = [-v for v in lower]`; `heapq.heapify(max_lower)`. Same for upper. Or define clean functions to use a wrapper? Simpler mutate in place. Also reset delayed dicts: `lower_delayed.clear()`, `upper_delayed.clear()`. But `ld_get` bound method remains valid for same dict. Good. Set `lower_size = len(lower)`, `upper_size = len(upper)`.

Need be careful: If we rebuild after removal before median, the current window is `nums[i-k+1:i+1]`. For i >= k. For i=k-1, no removal, window `nums[0:k]`; could rebuild if needed (not needed). We can condition `if i >= k and len(max_lower) + len(min_upper) > 2 * k:`. But if k large, 2*k threshold. Use integer.

However, rebuilding with sorting may be slower than heap lazy for small n? But only when physical heap size > 2k. In worst-case increasing, physical lower grows; threshold triggers. How often? Each time stale accumulate. Rebuild every O(k) removals, total O(n/k) rebuilds. Sorting k each time. For k=1000, 200 rebuilds * sort 1000 ~ 200*1000log1000 ~2M comparisons, fine. Heap ops reduced. Could improve.

But rebuilding requires slicing `nums[i-k+1:i+1]`, which for k=1000 is 1000 elements, 200 times =200k elements copied, fine. For k=200k, threshold 400k, physical size maybe k, no rebuild. Good.

Should we include rebuild? It adds code and potential bugs. But can guarantee O(n log k) with heap size O(k). Without rebuild, heap size O(n) worst-case but n=200k still maybe okay. The requirement says n=200k, k=1000 must finish well under 2s. Python lazy heap without rebuild likely passes. But to be safe, rebuild can ensure log k. However, sorting rebuild has overhead and slicing; but likely okay.

Let's evaluate if rebuild threshold `2*k` is enough. Physical heap size can exceed 2k due to stale. Rebuild resets. But what if k=1? threshold 2. Physical heap size may grow? For k=1, stale elements are popped during median each iteration, so size ~1. No rebuild. If k=1 and increasing, after remove lower delayed small, median clean pops it, size 1. Good.

If we rebuild, need to do it at a point where delayed dicts are clear and heaps valid. After removal, before median. But after removal, there may be stale entries that should be cleaned for median. Rebuild bypasses. Good.

Implementation of rebuild inline:
```
if i >= k and len(max_lower) + len(min_upper) > 2 * k:
    window = nums[i - k + 1 : i + 1]
    window.sort()
    mid = k // 2
    if k % 2:
        lower_len = mid + 1
    else:
        lower_len = mid
    # Build max_lower in place
    max_lower[:] = [-v for v in window[:lower_len]]
    heapq.heapify(max_lower)
    min_upper[:] = window[lower_len:]
    heapq.heapify(min_upper)
    lower_delayed.clear()
    upper_delayed.clear()
    lower_size = lower_len
    upper_size = k - lower_len
```
Need `heapq.heapify` local `hp_heapify = heapq.heapify`. Add. But `window[:lower_len]` creates list; `[-v for v in ...]` creates another. Could do `max_lower[:] = [-v for v in window[:lower_len]]`. For k=1000 fine. For k=200k, if rebuild (unlikely) memory okay. Could avoid slice by using `itertools.islice`? Not needed.

But if we rebuild, the nested clean functions default args reference `max_lower` and `min_upper` lists. Mutating in place with `[:]` keeps same list object. Good. `lower_delayed.clear()` keeps same dict, `ld_get` still valid. Good.

Need update `lower_size`, `upper_size` local variables. Since in same function, assignment okay.

Should we rebuild before or after median? If before median, median uses clean heaps. Good. If after median, next add uses clean. Either. Before median may save median clean. Do before median after removal. For i=k-1 (first median), no removal, physical size k, no rebuild. For i>=k, after removal window valid. Good.

But note: At i>=k, we add then remove. The window after removal is `nums[i-k+1:i+1]`. Correct. If we rebuild, we don't need to clean stale. Good.

Threshold: `2 * k` maybe too low causing frequent rebuilds? Physical size can exceed 2k gradually. In increasing sequence, lower heap size after t removals maybe k + t? It will exceed 2k after k removals. Rebuild every k removals. Total rebuilds n/k. Good. Could use `3*k` to reduce. `2*k` fine. For k=1000, rebuild every 1000, 200 times. Sorting 1000 200 times okay.

But for k=1000, sorting 1000 200 times ~ 200*1000*10 =2M comparisons in C (Timsort fast), plus list copy. Good.

For k=100000, n=200000, threshold 200000. Physical size might not exceed 200000? It could if stale accumulate. Rebuild at most n/k=2 times, sorting 100k twice ~2M log? Timsort C, okay.

Could rebuilding with sort be slower than just heap lazy for moderate n? It only triggers when heap size >2k. If no stale buildup, no rebuild. Good.

Need ensure `window.sort()` sorts floats ascending. For NaN, undefined. Ignore.

Now, if we rebuild, delayed dicts cleared. But what about `ld_get` and `ud_get` bound methods? They remain bound to same dict. `.clear()` empties. Good.

Potential issue: `max_lower[:] = [-v for v in window[:lower_len]]` if `max_lower` is large, slice assignment replaces contents. The list object remains. Good. `heapq.heapify(max_lower)` works.

Could we avoid `window[:lower_len]` by list comprehension over range? `max_lower[:] = [-window[j] for j in range(lower_len)]`. This avoids slice copy? It still accesses. Fine. `min_upper[:] = window[lower_len:]` copies upper. We need window list anyway. Could sort slice and assign. Fine.

Maybe use `window = nums[i - k + 1 : i + 1]` each rebuild. If k large, memory. Okay.

Now, if we rebuild, we should maybe also rebuild if `len(max_lower) > 2*k` or `len(min_upper) > 2*k`? Total physical >2k sufficient. But one heap could have stale >2k while total >2k. Good.

Now, consider if k is very small, threshold 2. For k=2, physical size may exceed 2 often. Rebuild every maybe 2 removals, sorting 2 elements 100k times = 200k sort calls, overhead might be high. Need threshold relative and minimum. For small k, lazy heap size likely O(k) because stale popped quickly? But for k=2 increasing, lower heap stale? Let's simulate k=2 increasing: window [1,2], lower1 upper2. i2 add3 -> upper [2,3], lower1, rebalance move upper min2 to lower: lower2 upper3. remove1: lower top2, y1<=2 -> lower delayed1, lower_size1. median clean lower: top2? lower physical [2,1], top2 valid. median (2+3)/2. stale1 buried. i3 add4: lower top2, x>2 upper push4, upper [3,4], lower [2,1], lower_size2 upper2. remove2: lower top2, y2<=2 -> lower delayed2, lower_size1. median clean lower: top2 delayed2=1 -> pop2, delayed0; now top1 delayed1=1 -> pop1, delayed0; lower empty? But lower_size1? Wait lower physical had [2,1], both? Let's track: After i2, lower physical [2,1] (1 stale). lower_size1 (valid2). i3 add4: lower_size2? Add x=4 to upper? lower_size1 upper2? Actually after i2 median lower_size1 upper1? Window [2,3]: lower2 upper3. lower physical [2,1], upper [3]. i3 add4: lower_size1, upper push4 -> upper [3,4], upper_size2. Rebalance? lower_size1 < upper_size2: clean upper top3, pop3, push lower3. lower physical [3,2,1], lower_size2, upper [4]. remove y=2: lower top3, y2<=3 -> lower_size1, lower_delayed2=1. median clean lower: top3 valid, lower_size1 upper1, median (3+4)/2. Stale 2 and 1 buried. Heap size 3 > 2k=4? no. i4 add5: lower_size1 upper1? Add5 upper [4,5] us2, rebalance move upper4 to lower: lower [4,3,2,1] ls2 us1. remove3: lower top4, y3<=4 -> lower delayed3, ls1. median clean lower top4 valid. Heap size4 =2k. Stale accumulate. i5 add6: lower ls1 us1, add6 upper us2, rebalance move upper5 to lower: lower [5,4,3,2,1] ls2 us1. remove4: lower top5, y4<=5 -> delayed4, ls1. Heap size5 >4 -> rebuild. So for k=2, rebuild every ~3 removals. Sorting 2 elements 66k times might be overhead but small? Sorting 2 elements in Python 66k times maybe 0.05s? Function calls/slicing overhead maybe 0.2s. Could set threshold `max(2*k, 4)`? For k=2, threshold 4, rebuild when >4, still every few. Could set threshold `4*k` to reduce. For k=2, >8, rebuild every ~7 removals, ~28k sorts. Still okay. But small k lazy heap size can grow to O(n) if stale buried? For k=2, stale accumulate until rebuild. If threshold 4k=8, heap size <=8, log small. Rebuild frequency n/8=25k. Sorting 2 elements 25k times okay. Maybe threshold `4*k` better to reduce rebuilds. But if k=1000, threshold 4000, rebuild every 3000 removals ~66 times, even better. Let's use `4 * k` maybe. But if k=1, threshold 4, heap size maybe 1, no rebuild. Good.

Physical heap size can grow to threshold; log threshold = log(4k). For k=1000, log 4000 ~12, still good. Rebuild less frequent. Use `if len(max_lower) + len(min_upper) > 4 * k:`.

But if k is large, 4*k may exceed n, no rebuild. Fine.

Could rebuild be unnecessary and add complexity? It might help ensure performance. Let's include with threshold `4 * k` and minimum maybe `4`? `4*k` for k=1 is 4. Good.

Need be careful: Rebuilding after removal but before median changes `lower_size`/`upper_size`. If we rebuild, we should not then clean lower/upper? The heaps are clean. But code after rebuild will proceed to median and call clean_lower; it will see no delayed, fine. Could skip clean if just rebuilt, but not necessary.

Where to place rebuild? After removal and rebalance, before median. But if physical heap size > threshold after add before removal? We can rebuild after removal to use current window. If after add physical size > threshold but after removal maybe still >. We check after removal. Good.

What about initial window i=k-1, physical size k, no rebuild. If k huge and building heaps with lazy? No stale yet. Good.

Now, if we rebuild, we must update `lower_size` and `upper_size`. But these are local variables. Good.

Potential issue: `window = nums[i - k + 1 : i + 1]` after removal at i. For i=k, window nums[1:k+1], correct. For i=n-1, window nums[n-k:n], correct.

Now, if k=0? raised.

Now, let's adjust code with rebuild. Add `hp_heapify = heapq.heapify`.

Rebuild block:
```
        if i >= k and len(max_lower) + len(min_upper) > 4 * k:
            window = nums[i - k + 1:i + 1]
            window.sort()
            lower_len = (k + 1) // 2
            max_lower[:] = [-v for v in window[:lower_len]]
            hp_heapify(max_lower)
            min_upper[:] = window[lower_len:]
            hp_heapify(min_upper)
            lower_delayed.clear()
            upper_delayed.clear()
            lower_size = lower_len
            upper_size = k - lower_len
```
For even k=2, lower_len=(2+1)//2=1, upper=1. For odd k=3, lower_len=2, upper=1. Good.

But `window[:lower_len]` creates slice; `[-v for v in window[:lower_len]]` creates list. Could do `max_lower[:] = [-v for v in window[:lower_len]]`. Fine. For memory, okay.

Potential issue: If `max_lower` is large, slice assignment with list of different length shrinks list. Good.

Now, after rebuild, `ld_get` and `ud_get` still bound to cleared dicts. Good.

Now, do we need to rebuild if physical heap size > threshold even when i < k? During initial build, no stale, physical size = i+1 <= k, threshold 4k, no.

Now, let's think if rebuild can break the logical partition if sorting ascending and split. Lower part is smallest lower_len values. For even k, lower_len=k/2. Max lower is middle, min upper is next. For odd, lower_len=(k+1)/2, median lower top. Good.

Now, one subtlety: If values are floats with NaN, sort places NaN maybe at end; median undefined. Ignore.

Now, let's reconsider if rebuild threshold `4*k` can still allow heap size O(k) and log k. Yes.

Now, performance with rebuild: Sorting in C is fast. But slicing `nums[i-k+1:i+1]` copies k references. For k=1000, 66*1000=66k refs, trivial. For k=100000, if threshold 400000 and n=200000, no rebuild. If n=1e6, k=100000, rebuild at most 10 times, copy 1M refs, okay. Problem n=200k.

Now, could rebuild be triggered during initial build if k small and physical size >4k? No stale, physical size <=k <4k.

Now, let's think about if physical heap size can exceed 4k quickly due to stale in both heaps. Rebuild resets. Good.

Now, potential bug: Rebuild uses `nums[i - k + 1:i + 1]`, but if we are at i>=k after removal, the window is correct. However, if we rebuild, we discard all pending delayed. Good. But what about elements that have been removed but not yet popped? They are excluded from slice, so gone. Good.

Now, let's test rebuild with small k=2 increasing to ensure no logical inconsistency.
At i=5 (0-index) after remove4, heap size5 >8? no. At i=8 maybe rebuild. Window slice correct. Sizes set. Median computed. Good.

Now, one more potential issue: The `clean_lower` and `clean_upper` functions use `ld_get` and `ud_get` bound methods. If we call `lower_delayed.clear()`, the bound method still works. Yes.

Now, should we update `ld_get` after clear? No.

Now, let's consider if we can avoid rebuild to keep code simpler. The final code with rebuild is longer but robust. The user only wants solution. Complexity okay.

Let's verify code with rebuild for k=1. lower_len=(1+1)//2=1, upper_len=0. If rebuild triggered (unlikely), `min_upper[:] = window[1:]` empty. `heapq.heapify` on empty okay. Median lower_size1 upper0. Good.

Now, possible issue: `4 * k` can be large; if k is not int? Type int. If k huge, multiplication okay.

Now, let's think about a pathological case where physical heap size stays just below threshold but log factor bigger than k? threshold 4k, log <= log(4k). Good.

Now, could stale entries in one heap be O(n) while total physical <=4k? No, total physical bound. Good.

Now, let's consider if rebuild sorting slice of length k each time could be O(n*k) if threshold triggers every iteration for small k? For k=1, threshold4, physical size never >4. For k=2, threshold8, physical size can exceed 8 every ~? It triggers every ~7 iterations, not every. For k=2, sorting 2 elements 28k times, okay. For k=3, threshold12, triggers every ~9 iterations, 22k sorts of 3. Fine. The number of rebuilds roughly n/(threshold-k) ~ n/(3k). Sorting k => O(n log k /3). Good.

Now, let's maybe set threshold `max(4 * k, 64)` to avoid too frequent rebuilds for very small k? For k=2, max(8,64)=64, rebuild every ~62 iterations, 3200 sorts. Better. For k=1, 64, never. For k=10, threshold64, rebuild every ~54 iterations, 3700 sorts of 10. Good. But if k=2, heap size can grow to 64, log64 small. Fine. Use `rebuild_threshold = max(4 * k, 64)`. This reduces rebuild overhead for small k. For k=1000, threshold4000. Good.

Add `rebuild_threshold = max(4 * k, 64)`.

Now, check if threshold too high for k=2 causing heap size 64, still fine. For n=200k, no issue.

Now, let's think about if sorting rebuild for k=1000 threshold4000, physical size can grow to 4000, log4000 ~12. Good.

Now, let's review final code with rebuild and clean functions.

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    max_lower = []
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get
    hp_push = heapq.heappush
    hp_pop = heapq.heappop
    hp_heapify = heapq.heapify
    rebuild_threshold = max(4 * k, 64)

    def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
        while max_lower:
            v = -max_lower[0]
            c = ld_get(v, 0)
            if c:
                hp_pop(max_lower)
                lower_delayed[v] = c - 1
            else:
                break

    def clean_upper(min_upper=min_upper, upper_delayed=upper_delayed, ud_get=ud_get, hp_pop=hp_pop):
        while min_upper:
            v = min_upper[0]
            c = ud_get(v, 0)
            if c:
                hp_pop(min_upper)
                upper_delayed[v] = c - 1
            else:
                break

    out = [0.0] * (n - k + 1)
    out_idx = 0

    for i, x in enumerate(nums):
        # add
        if lower_size:
            clean_lower()
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        # rebalance after add
        if lower_size < upper_size:
            clean_upper()
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            clean_lower()
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        # remove outgoing
        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            # rebalance after remove
            if lower_size < upper_size:
                clean_upper()
                v = hp_pop(min_upper)
                upper_size -= 1
                hp_push(max_lower, -v)
                lower_size += 1
            elif lower_size > upper_size + 1:
                clean_lower()
                v = -hp_pop(max_lower)
                lower_size -= 1
                hp_push(min_upper, v)
                upper_size += 1

            # optional rebuild
            if len(max_lower) + len(min_upper) > rebuild_threshold:
                window = nums[i - k + 1:i + 1]
                window.sort()
                lower_len = (k + 1) // 2
                max_lower[:] = [-v for v in window[:lower_len]]
                hp_heapify(max_lower)
                min_upper[:] = window[lower_len:]
                hp_heapify(min_upper)
                lower_delayed.clear()
                upper_delayed.clear()
                lower_size = lower_len
                upper_size = k - lower_len

        # median
        if i >= k - 1:
            clean_lower()
            if lower_size == upper_size:
                clean_upper()
                out[out_idx] = (-max_lower[0] + min_upper[0]) / 2.0
            else:
                out[out_idx] = float(-max_lower[0])
            out_idx += 1

    return out
```

Need consider if rebuild threshold check `len(max_lower) + len(min_upper) > rebuild_threshold` after removal but before median. If rebuild occurs, `lower_size` and `upper_size` set. Then median clean_lower (no stale). Good.

Potential issue: If rebuild occurs, `ld_get` and `ud_get` are bound to dicts that were cleared. Good. But `clean_lower` default arg `ld_get` is bound method. After clear, `ld_get(v,0)` returns 0. Good.

Potential issue: `window[:lower_len]` for lower_len maybe 0? k>=1, lower_len>=1. Upper may be empty. Good.

Potential issue: Sorting slice with `window.sort()` modifies window list. Fine.

Potential issue: If `nums` is a list of floats, slicing copies references. Fine.

Now, let's think about if rebuild can be triggered at i=k when physical heap size > threshold. For k small, threshold64, physical size after initial k maybe k, not >64. After many iterations. Good.

Now, let's consider if physical heap size can exceed threshold between iterations (after add before remove) and we don't rebuild until after remove. Heap size may be threshold+1 during add, but log still okay. We could check after add too, but window after add not valid (size k+1). Rebuilding with slice not straightforward. Not needed.

Now, let's test code with rebuild for k=2 increasing mentally. It will rebuild when heap size >64. At rebuild, window sorted, lower_len1. Good.

Now, one subtle bug: In rebuild, we use `lower_len = (k + 1) // 2`. For even k, lower_len = k/2? e.g., k=2 ->1, k=4 ->2. For odd k=3 ->2. Good. But for even k, median even uses lower_size==upper_size. For k=2, lower_len1 upper1. Good.

Now, another subtle bug: The lower heap stores negatives. When rebuilding, `max_lower[:] = [-v for v in window[:lower_len]]`. If `window[:lower_len]` contains floats, negative okay. `heapq.heapify` makes min heap of negatives => max heap of values. Good.

Now, let's consider if `max_lower` or `min_upper` are empty and we assign slice. Works.

Now, let's think about if `lower_delayed.clear()` invalidates `ld_get`? No.

Now, maybe we should also clear `window`? It goes out of scope. Fine.

Now, potential issue with `rebuild_threshold = max(4 * k, 64)`: If k is very large (e.g., 200k), threshold 800k > n, no rebuild. If physical heap size can grow to n=200k, log 200k okay. If k=100k, threshold400k > n, no rebuild; heap size up to 200k, log18. Fine.

Now, let's think about memory of delayed dicts if no rebuild and many distinct stale buried. Dict keys up to n. Fine.

Now, could the delayed dict grow with zero values and cause `ld_get` to return 0 for many keys, but if we rebuild we clear. Good.

Now, let's consider if we should delete zero delayed keys to save memory when no rebuild. Not necessary.

Now, let's think about a possible issue with using `len(max_lower) + len(min_upper) > rebuild_threshold` after removal. If k is small and threshold64, physical heap size may exceed 64; rebuild sorting slice of k. Good. But what if k=1 and physical heap size somehow >64 due to stale not popped? For k=1, median clean_lower pops stale top each time. Could stale be buried? With one logical element, lower heap physical may have stale entries. If stale top, popped. If stale buried, how can stale be buried if lower heap has one valid? In max heap, valid might be larger than stale, so stale buried. Example k=1 decreasing: i0 add5 lower5. i1 add4: lower top5, 4<=5 push lower4 ls2, rebalance move max5 to upper: lower4 upper5. remove5: lower top4, y5>4 -> upper delayed5, upper_size0. rebalance lower>upper+1? ls1 >1? no. median lower4. Upper stale5. i2 add3: lower top4, 3<=4 push lower3 ls2, rebalance move max4 to upper: upper [4,5(stale)], lower3. remove4: lower top3, y4>3 -> upper delayed4, upper_size1? Wait upper_size before remove1 (valid4), after0? Actually upper had valid4 and stale5, upper_size1. Remove4 -> upper_size0, delayed4=1. rebalance lower>upper+1? ls1 >1? no. median lower3. Upper physical [4(stale),5(stale)]. No lower stale. Physical size lower1 upper2 total3. Not >64. For k=1, upper stale can accumulate? Each iteration moves lower max to upper, then removes it (stale upper). Upper heap accumulates stale values that are decreasing? Values decreasing: 5,4,3,... stale in upper. Upper min heap stores smallest values; stale largest are buried. Upper physical size grows O(n)! But upper_size=0, we never clean upper unless rebalance moves from upper or median even (k=1 odd, median doesn't clean upper). Stale upper entries accumulate unbounded! This is a serious issue. For k=1, our algorithm will push valid to upper each iteration (to maintain lower_size=1 upper_size=0? Wait let's re-evaluate k=1 decreasing:
- i0: lower [5], ls1, us0.
- i1 add4: lower top5, x<=5 push lower4, ls2. rebalance lower>us+1 (2>1): clean lower top5, pop5, push upper5, ls1, us1. Now lower [4], upper [5]. remove y=5 (nums0): lower_size1, clean lower top4, y=5 >4 -> upper_size0, upper_delayed[5]=1. Rebalance lower_size1 upper0, no. Median lower4. Upper physical [5], delayed5=1. Upper_size0.
- i2 add3: lower_size1, clean lower top4, x=3<=4 push lower3, ls2. rebalance lower>us+1 (2>1): clean lower top4, pop4, push upper4. upper physical [4,5], us1, ls1. remove y=4: lower_size1, clean lower top3, y=4>3 -> upper_size0, upper_delayed[4]=1. Rebalance no. Median lower3. Upper physical [4,5], delayed4=1, delayed5=1. Upper_size0. Stale upper grows.
Yes. Since upper_size=0, we never clean upper (except if lower_size<upper_size, which never because lower_size>=upper_size after rebalance? After remove upper_size0, lower1; no). So stale upper accumulates O(n). Heap size O(n), but for k=1, n=200k, heap size 200k, log 18. Still maybe okay, but rebuild threshold will trigger: after removal, len(max_lower)+len(min_upper) >64. It will rebuild from window of size1, clearing upper stale. Great. Rebuild threshold64 solves. For k=1, rebuild every 64 iterations, sorting 1 element 3125 times, fine. Without rebuild, heap size 200k but still maybe okay; rebuild improves.

Good catch. Rebuild is useful.

Now, consider k=2 decreasing, stale upper may accumulate too. Rebuild handles.

Now, ensure rebuild threshold check occurs after removal before median. For k=1, after i=64, physical size maybe 65 >64, rebuild. Good.

Now, what about stale lower accumulation for increasing sequence? Rebuild handles.

Now, let's think if rebuild threshold `max(4*k,64)` for k=1 means rebuild every 64, good. For k=2, threshold64, rebuild every ~62, good.

Now, one more subtle issue: If upper_size=0 and upper heap has stale entries, `clean_upper` is not called except in rebalance when lower_size<upper_size (not) or median even (not). Rebuild clears. Good.

Now, consider if physical heap size exceeds threshold but we rebuild using current window. The current window after removal for k=1 is `nums[i:i+1]` (just current x). Good.

Now, let's think about if rebuild threshold check should also occur when i < k? No stale, physical size <=k < threshold (threshold >=64, if k<64 physical <=k; if k>64 threshold4k >k). No.

Now, potential issue: Rebuild threshold uses `len(max_lower) + len(min_upper)`. If one heap has stale and the other valid, total may be below threshold but one heap log factor still <= threshold. Fine.

Now, let's consider if rebuilding with sorting changes the heap representation such that `clean_lower` default `max_lower` list is same. Yes via slice assignment. But what about `max_lower` variable in main? It still references same list. Good.

Now, potential issue: `hp_heapify` is a local variable. In rebuild, we call `hp_heapify(max_lower)`. Good.

Now, let's think about if `window.sort()` on floats with `nan` could make sort inconsistent. Ignore.

Now, let's revisit the clean functions with default args. If we rebuild by slice assignment, the list object remains. But the list's contents change. `clean_lower` uses `max_lower` parameter referencing same list. Good.

Now, one possible bug: In rebuild, we clear delayed dicts. But `ld_get` and `ud_get` are bound methods. In CPython, bound method holds reference to dict. `dict.clear()` mutates. Good.

Now, let's consider if we should reset `ld_get = lower_delayed.get` after clear? Not needed.

Now, let's think about if `lower_delayed[y] = ld_get(y, 0) + 1` when `y` is a float and `ld_get` returns an int. Good.

Now, potential issue with `heapq` and list slice assignment: If `max_lower` is large, `max_lower[:] = [...]` may temporarily hold both old and new lists, memory spike. For n=200k, okay. Could do `max_lower.clear(); max_lower.extend(...)` to maybe free? Slice assignment may keep old elements until done. Memory okay. But if we want memory efficient, use `max_lower[:] = ...` fine.

Now, let's consider if rebuild sorting slice of `nums` each time could be costly for k=1000 and threshold4000, 50 rebuilds? Actually n=200k, k=1000, rebuild every ~3000, ~66. Good.

Now, let's test with a small manual case where rebuild threshold low (simulate threshold2) to ensure rebuild code works. But final threshold64. We can mentally set threshold2 for k=2. At i where physical >2, rebuild. Window sorted. Good.

Now, let's think about if after rebuild, `lower_size` and `upper_size` are correct, but there may be stale entries in heaps? No, heaps rebuilt from valid window, delayed cleared. Good.

Now, potential issue: The rebuild block is inside `if i >= k:` after removal. For i=k, window size k. If rebuild, lower_size set. Then median. Good.

Now, let's consider if `out_idx` and `out` length. For i from k-1 to n-1 inclusive, count n-k+1. Good.

Now, let's think about if we should use `range(n)` instead of enumerate for speed? `enumerate` is fine. Access `nums[i-k]` requires i. Could use `for i in range(n): x = nums[i]`. `enumerate` in Python is optimized. Fine.

Now, possible micro-optimization: Store `nums_local = nums` and `out_local = out`? Already local.

Now, let's consider if the code passes type checking? `list[float]` in signature. Import heapq. Good.

Now, let's think about if the user expects no comments? They said single code block. Comments okay. I can include minimal comments.

Now, let's maybe simplify by removing rebuild to reduce code? But rebuild addresses unbounded stale for k=1 and performance. Keep.

Now, let's verify the rebuild threshold with k=1 and decreasing sequence: At i=64, after removal, upper physical size 64? Let's count: i0 upper0; i1 upper1; ... i64 upper64? After i=64 removal, upper_size0, upper physical maybe 64. lower physical1. total65 >64 rebuild. Good.

Now, one subtle issue: For k=1, after rebuild, upper_size=0, lower_size=1. `min_upper` empty. Next add: lower_size1, clean lower, compare x <= lower top. If x smaller, push lower, rebalance move max lower to upper. If x larger, push upper, upper_size1, lower_size1. remove previous: if lower_size1, clean lower, compare y to lower top. Suppose x larger, lower old, upper new. Remove old: y=old <= lower top old -> lower delayed, lower_size0. Rebalance lower<upper: clean upper (valid new), pop, push lower. Good. Upper stale from previous cleared. Works.

Now, let's think about if rebuild threshold check should use `>` or `>=`. `>` fine.

Now, potential issue: If k is very small, threshold64, physical heap size can grow to 64. For k=1, log64 small. Good.

Now, let's consider if sorting rebuild for k=1 3125 times is okay. Yes.

Now, let's think about if the delayed dicts can still grow to threshold size before rebuild, e.g., 64 keys. Fine.

Now, let's consider if we can further bound by checking after add too? Not needed.

Now, let's review final code for PEP8? Not important.

Now, let's consider if there is any issue with using `float(-max_lower[0])` when `max_lower[0]` is a negative of a float. If `max_lower[0]` is `-x`, `-max_lower[0]` may be `x` with sign. For `x = -1.0`, stored `1.0`, `-max_lower[0] = -1.0`. Good.

Now, let's think about if the median for even should be `(-max_lower[0] + min_upper[0]) / 2.0`. If both are large floats, addition may overflow to inf, while true mean might be inf if both inf, okay. If one inf one -inf, nan. Not specified.

Now, let's consider if `nums` can be a generator? Type list, no.

Now, potential issue: In rebuild, `window = nums[i - k + 1:i + 1]`. If `nums` is a list, slicing O(k). If k=1000, fine. If k=200k and rebuild not triggered, fine. If k=100k and n=200k, threshold400k, no rebuild. If physical heap size grows >400k impossible n=200k. Good.

Now, let's think about if `heapq.heapify` on `min_upper` after slice assignment with values from `window[lower_len:]`. The list `window[lower_len:]` is a new list; slice assignment copies into `min_upper`. Good.

Now, one more potential bug: In rebuild, for even k, lower_len = (k+1)//2 = k//2. For k=2, lower_len1. For k=4, lower_len2. Good. For odd k=5, lower_len3. Median lower top. Good.

Now, let's consider if after rebuild, the invariant all lower <= all upper holds. Sorted split ensures.

Now, let's think about if we need to update `rebuild_threshold` after k? No.

Now, let's maybe include a docstring:
```
"""Return sliding window medians of size k."""
```
Fine.

Now, let's consider if the final answer should not include any explanation outside code block. Yes, single code block.

Before final, let's maybe run through a small random example with rebuild not triggered (threshold64) to ensure no hidden errors.

Example nums=[4,1,2,3], k=3.
Expected: [4,1,2] median2; [1,2,3] median2.
i0 add4 lower4 ls1
i1 add1: lower top4, 1<=4 lower1 ls2; rebalance lower>us+1: pop lower max4, push upper4, lower1 us1.
i2 add2: lower top1, 2>1 upper2 us2; rebalance ls<us: clean upper top2, pop2, push lower2, ls2 us1. median: clean lower top2, lower_size2 upper1 -> out2.
i3 add3: lower top2, 3>2 upper3 us2; remove y=4: lower_size2, clean lower top2, y4>2 -> upper us1, upper_delayed4=1. rebalance lower_size2 upper1, no. median: clean lower top2, lower_size2 upper1 -> out2. Upper physical [3,4(stale)], upper_size1. Correct.

Now, if stale upper top? In this case upper top3 valid. If stale 4 larger buried. Good.

Now, case where stale upper top needs cleaning: nums=[3,1,2,0], k=3? Expected [3,1,2] median2; [1,2,0] median1.
i0 add3 lower3
i1 add1 lower1? lower top3, 1<=3 lower ls2; rebalance pop3 to upper, lower1 upper3.
i2 add2: lower top1, 2>1 upper2 us2; rebalance move upper min2 to lower: lower2,1 upper3, ls2 us1. median2.
i3 add0: lower top2, 0<=2 lower0 ls3; rebalance lower>us+1: clean lower top2, pop2, push upper2. upper [2,3], us2, lower [1,0] ls2. remove y=3: lower_size2, clean lower top1, y3>1 -> upper us1, upper_delayed3=1. rebalance lower2 upper1 no. median: clean lower top1, lower_size2 upper1 -> median1. Upper physical [2,3(stale)], upper_size1. upper top2 valid. Correct.

Now, case where stale upper top: Need upper_size>0 and stale at min. Example decreasing k=2: nums=[5,4,3]. i0 lower5; i1 add4 -> lower4 upper5; median4.5? Actually [5,4] median4.5. i2 add3: lower top4, 3<=4 lower3 ls2; rebalance? lower_size2 upper1, no? Wait k=2, before i2 lower4 upper5 ls1 us1. Add3 -> lower [4,3] ls2 us1. Rebalance? lower_size2 > upper1+1? 2>2 no. Window size3 transient. remove y=5: lower top4, y5>4 -> upper us0, delayed5. Rebalance lower_size2 upper0 -> lower>upper+1: clean lower top4, pop4, push upper4, ls1 us1. median even: clean lower top3, clean upper top4, median3.5. Window [4,3] median3.5. Upper stale5 buried (min heap [4,5], top4 valid). i3 add2: lower top3, 2<=3 lower2 ls2; rebalance? lower2 upper1 no. remove y=4: lower top3, y4>3 -> upper us0, delayed4. Rebalance lower2 upper0 -> move lower top3 to upper: upper [3,4(stale),5(stale)]? heap min [3,4,5], us1, lower [2] ls1. median: clean lower top2, clean upper top3, median2.5. Stale4,5 buried. Good. If stale were min, e.g., removing smaller from upper? For upper stale min can happen if a small value in upper is removed. Example upper contains [2,5], remove2, stale2 at min. Then clean_upper needed when moving/median. Our code cleans upper in rebalance if moving from upper, and median even. If upper_size becomes 0, stale upper may accumulate until rebuild. Rebuild handles. If upper_size>0 and stale min, next operation that uses upper (rebalance or median even) will clean. If k odd and upper_size maybe lower_size? For odd, median doesn't clean upper, but add classification doesn't use upper, remove classification doesn't use upper. Rebalance may move from upper if lower_size<upper_size. For odd steady state lower=upper+1. After add, lower=upper+2, rebalance moves from lower to upper, not upper. After remove, if remove from lower, lower=upper, no rebalance; if remove from upper, lower=upper+2, rebalance moves from lower to upper. So for odd, we may never clean upper unless we need to move from upper (which happens when total size grows during initial build or after add? Let's see steady odd k=3: lower2 upper1. Add -> lower3 upper1, rebalance lower>upper+1 -> move lower to upper => lower2 upper2. Remove -> if remove lower: lower1 upper2, rebalance lower<upper -> move upper to lower (clean upper). If remove upper: lower2 upper1, no rebalance. So sometimes clean upper. If remove upper repeatedly, upper stale may accumulate? Example odd k=3, values decreasing? Upper contains largest, removed largest (stale buried, not min). Stale min in upper could happen if a small upper value removed while larger upper values remain. That can happen when window changes. If upper_size>0 and stale min, but we never clean upper because no move from upper and median odd, stale min may remain and upper heap top stale. Does that affect correctness? Upper logical size excludes stale, but if we later need to use upper top (median even? no, median odd doesn't; rebalance move from upper if lower<upper, will clean; add doesn't use upper; remove classification doesn't use upper). If upper_size remains >0 and stale min, and we never move from upper, the stale min can sit at top. But physical upper size grows; rebuild threshold handles. However, if we do need to move from upper, clean_upper will pop stale min(s). If we compute median for even, clean_upper. So correctness okay even if stale upper top remains until needed. But if upper_size=0, stale upper accumulates; rebuild handles.

Now, could stale upper top affect rebalancing when lower_size<upper_size? clean_upper called before pop, so okay.

Now, could stale upper top affect `len` threshold? It counts physical, triggers rebuild. Good.

Now, let's think about if delayed dict for upper can have key with count >0 while upper_size=0. Rebuild clears. Without rebuild, upper_size=0 and stale upper never cleaned; but `clean_upper` not called. If later upper_size becomes >0 due to add? For k=1, after upper_size=0, add may push to upper (if x > lower top) making upper_size1, but upper heap has stale entries. Rebalance after add? lower_size1 upper1, no move. Remove previous lower? Let's see k=1 decreasing with stale upper. At i2 before rebuild, upper physical [4,5] stale, upper_size0. Add3: lower top4? Wait lower was 4? Actually i2 lower3? Let's use after i2: lower3, upper [4,5] stale, upper_size0. i3 add2: lower top3, 2<=3 push lower2 ls2; rebalance lower>upper+1: clean lower top3, pop3, push upper3. Upper physical [3,4,5], upper_size1. remove y=3? outgoing nums0? For k=1, i3 remove nums2? Wait sequence decreasing 5,4,3,2. i3 x=2, remove nums2=3. lower_size2, clean lower top2? lower physical [3,2], top3. y=3 <=3 -> lower delayed3, lower_size1. Rebalance lower1 upper1 no. Median lower? lower top2? clean lower top3 delayed3=1 -> pop3, delayed0; lower top2. median2. Upper physical [3,4,5], upper_size1 (valid3? Wait we pushed 3 to upper, but then removed 3 from lower? Outgoing 3 was in lower? Let's track: Window before i3 was [3] lower3, upper stale4,5. Add2 -> lower [3,2], upper stale. Rebalance move max lower 3 to upper => upper valid3, lower2. Remove outgoing 3: classification lower top2? Actually after rebalance lower top2, y=3 >2, so remove from upper! Ah, because we moved 3 to upper. So y=3 removed from upper, upper_size0, upper_delayed3=1. Upper physical [3,4,5], delayed3=1,4=1,5=1. upper_size0. Stale upper grows. Good. So upper valid can be removed and become stale. No correctness issue.

Now, if upper_size=0 and upper heap has stale top with delayed count, and we add a new value to upper, upper_size1. The new valid value may be smaller than stale top? In min heap, if new valid is smaller, it becomes top; stale top buried. If new valid larger, stale top remains top. If later we need upper top, clean_upper will pop stale if delayed. If we don't need upper top (odd median), stale can remain. Rebuild threshold handles. If upper_size1 and stale top, but we compute median even? For k=1 odd, no. For k even, median even will clean upper. Good.

Now, let's consider if stale upper top with delayed count can cause `clean_upper` to pop a valid new upper value instead of stale, as duplicates issue. If values differ, delayed count for stale value v. If new valid value w < v, top w delayed[w]=0, clean_upper stops, stale v buried. Good. If new valid value w = v (duplicate), delayed[v]>0, top v. clean_upper pops top v (could be valid), delayed--. Physical count v decreases, delayed decreases; valid count unchanged. Good. If delayed count > physical count? Not possible. Good.

Now, let's think about if rebuild threshold should be checked before median, but if rebuild occurs, we might skip cleaning stale that could have reduced heap size. Rebuild resets. Good.

Now, one possible issue: Rebuild uses `window.sort()`, which is O(k log k). If k is very small and threshold64, rebuild every ~62 iterations. For n=200k, ~3200 rebuilds, sorting 2-10 elements. Fine. If k=100, threshold400, rebuild every ~300, ~666 rebuilds sorting100. Fine.

Now, let's consider if the heap lazy algorithm without rebuild could be simpler and still pass. But rebuild code is okay.

Now, let's ensure no use of `input()` or printing. Good.

Now, final answer should be code block only. Need final. But let's double-check for any syntax errors.

Code:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    max_lower = []
    min_upper = []
    lower_size = 0
    upper_size = 0
    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get
    hp_push = heapq.heappush
    hp_pop = heapq.heappop
    hp_heapify = heapq.heapify
    rebuild_threshold = max(4 * k, 64)

    def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
        while max_lower:
            v = -max_lower[0]
            c = ld_get(v, 0)
            if c:
                hp_pop(max_lower)
                lower_delayed[v] = c - 1
            else:
                break

    def clean_upper(min_upper=min_upper, upper_delayed=upper_delayed, ud_get=ud_get, hp_pop=hp_pop):
        while min_upper:
            v = min_upper[0]
            c = ud_get(v, 0)
            if c:
                hp_pop(min_upper)
                upper_delayed[v] = c - 1
            else:
                break

    out = [0.0] * (n - k + 1)
    out_idx = 0

    for i, x in enumerate(nums):
        if lower_size:
            clean_lower()
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        if lower_size < upper_size:
            clean_upper()
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            clean_lower()
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            if lower_size < upper_size:
                clean_upper()
                v = hp_pop(min_upper)
                upper_size -= 1
                hp_push(max_lower, -v)
                lower_size += 1
            elif lower_size > upper_size + 1:
                clean_lower()
                v = -hp_pop(max_lower)
                lower_size -= 1
                hp_push(min_upper, v)
                upper_size += 1

            if len(max_lower) + len(min_upper) > rebuild_threshold:
                window = nums[i - k + 1:i + 1]
                window.sort()
                lower_len = (k + 1) // 2
                max_lower[:] = [-v for v in window[:lower_len]]
                hp_heapify(max_lower)
                min_upper[:] = window[lower_len:]
                hp_heapify(min_upper)
                lower_delayed.clear()
                upper_delayed.clear()
                lower_size = lower_len
                upper_size = k - lower_len

        if i >= k - 1:
            clean_lower()
            if lower_size == upper_size:
                clean_upper()
                out[out_idx] = (-max_lower[0] + min_upper[0]) / 2.0
            else:
                out[out_idx] = float(-max_lower[0])
            out_idx += 1

    return out
```

Syntax okay. Type hint `list[float]` requires Python 3.9+. Good.

Now, let's think about if `max_lower` can be empty in add when lower_size>0 due to rebuild? Rebuild sets lower_size>0 and fills max_lower. Good.

What if k=0? raised.

Now, let's consider if `rebuild_threshold` for k very large (e.g., 10**9) but k <= n, n maybe 10**9? Problem n=200k. `4*k` may be large but int okay. If k large, `max(4*k,64)` large. No rebuild. Good.

Now, potential issue: In rebuild, `window = nums[i - k + 1:i + 1]`. If k is large and i-k+1 negative? i>=k, so nonnegative. Good.

Now, let's think about if sorting `window` with floats that are very close and negative zero, okay.

Now, let's consider if the delayed dicts can have counts for values that are no longer in heap due to rebuild? Rebuild clears. Without rebuild, counts <= physical. Good.

Now, one more subtle bug: In `clean_lower`, we use `ld_get(v, 0)`. If `lower_delayed` contains key v with value 0, `c=0`, break. But if there is a stale entry of value v with delayed count 0 due to previous mislabel? We argued no. Good.

Now, let's think about if `lower_delayed[y] = ld_get(y, 0) + 1` when y is a float and `ld_get` returns an int. If y is `nan`, dict key nan behaves equality false, but ignore.

Now, potential performance issue: `len(max_lower) + len(min_upper)` called every i>=k. O(1). Fine.

Now, let's consider if we should move rebuild check before rebalance after remove? If physical heap size huge, rebalance may do extra heap ops before rebuild. But at most one rebalance. Fine. Could check before rebalance to save, but window after remove valid. We could check after remove before rebalance: if physical > threshold, rebuild and skip rebalance? But sizes after removal may be unbalanced. Rebuild sets balanced sizes. That could save. But current order: rebalance then rebuild. If physical huge, rebalance does a heap pop/push unnecessarily. Not a big deal. Could optimize: after remove, before rebalance, if len > threshold, rebuild (which sets balanced sizes) and skip rebalance. But rebuild requires current window, which is valid after removal. It also sets lower_size/upper_size balanced, so no need rebalance. This could be more efficient. Let's consider implementing:
```
if i >= k:
   remove y (update sizes/delayed)
   if len(max_lower)+len(min_upper) > rebuild_threshold:
       rebuild (sets sizes)
   else:
       rebalance
```
But careful: If we rebuild, we don't need to rebalance. If we don't rebuild, rebalance. This avoids rebalance when rebuilding. Current code rebalances then rebuilds; if rebuild, the previous rebalance was wasted but okay. However, after removal, sizes may be unbalanced; if physical heap huge, rebalance may pop from a heap with many stale, but clean will pop stale perhaps. Then rebuild. Not a correctness issue. For performance, maybe check before rebalance. But if we rebuild, we must ensure we haven't already cleaned? Not needed. Let's restructure for efficiency:

After remove y and updating sizes/delayed:
```
if len(max_lower) + len(min_upper) > rebuild_threshold:
    # rebuild from current window
    ...
else:
    if lower_size < upper_size: ...
    elif lower_size > upper_size + 1: ...
```
But if we rebuild, we set sizes balanced. Good. If not, rebalance. This also avoids needing to rebalance after rebuild. But what if physical heap size > threshold and lower_size/upper_size unbalanced; rebuild uses sorted window, fine. This seems better.

Similarly, after add, could check threshold? Window size k+1, not valid for rebuild. Could maybe rebuild with previous window? Not needed.

Let's adjust code: In remove block, after updating delayed and sizes, do:
```
            if len(max_lower) + len(min_upper) > rebuild_threshold:
                window = nums[i - k + 1:i + 1]
                ...
            else:
                if lower_size < upper_size: ...
                elif lower_size > upper_size + 1: ...
```
But note: If we rebuild, we should not use the unbalanced sizes. Rebuild sets. Good.

What if physical heap size > threshold but `i` is last iteration? Rebuild before median, okay.

What if physical heap size > threshold and k small, rebuild sorting. Good.

Could physical heap size exceed threshold before removal (after add) and we would like to rebuild after removal with window size k. We do after removal. Good.

Now, after add, if physical heap size already > threshold (from previous stale) and add makes it larger, we still do add rebalance before removal. Could be extra. But threshold ensures not too large. Fine.

Let's update code accordingly. Need ensure if rebuild, we don't then execute rebalance. Use `else`.

Remove block revised:
```
        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            if len(max_lower) + len(min_upper) > rebuild_threshold:
                window = nums[i - k + 1:i + 1]
                window.sort()
                lower_len = (k + 1) // 2
                max_lower[:] = [-v for v in window[:lower_len]]
                hp_heapify(max_lower)
                min_upper[:] = window[lower_len:]
                hp_heapify(min_upper)
                lower_delayed.clear()
                upper_delayed.clear()
                lower_size = lower_len
                upper_size = k - lower_len
            else:
                if lower_size < upper_size:
                    clean_upper()
                    v = hp_pop(min_upper)
                    upper_size -= 1
                    hp_push(max_lower, -v)
                    lower_size += 1
                elif lower_size > upper_size + 1:
                    clean_lower()
                    v = -hp_pop(max_lower)
                    lower_size -= 1
                    hp_push(min_upper, v)
                    upper_size += 1
```
This is better. But consider: If physical heap size > threshold, we rebuild and skip rebalance. However, the removal `y` may have been from lower/upper and we incremented delayed. Rebuild clears delayed, so fine. The window slice excludes y. Good.

Now, what if physical heap size > threshold but lower_size/upper_size are such that `len` includes stale entries that we just marked; rebuild uses slice, fine.

Now, after rebuild, median clean_lower. Good.

Now, is it possible that physical heap size > threshold but current window slice is large and sorting is expensive, while rebalancing would be cheap? Threshold chosen to amortize. Fine.

Now, should we also rebuild if `len(max_lower) + len(min_upper) > rebuild_threshold` before removal for i>=k? We do after removal. If after add physical huge, but after removal maybe still huge. Good.

Now, let's think about if rebuild threshold check should be after removal but before cleaning for median. Yes.

Now, potential issue: If we rebuild, we set `lower_size` and `upper_size`, but the logical sizes before rebuild might have been unbalanced. The sorted split sets balanced. Good.

Now, let's adjust final code accordingly.

Now, consider if rebuild threshold check uses `len(max_lower) + len(min_upper)` after removal but before rebalance. If no rebuild, rebalance. If rebuild, no rebalance. Good.

Now, one more optimization: In add block, if lower_size is 0 but max_lower has stale entries, we push to lower. Could physical heap size be huge (if upper stale? lower maybe stale). If lower_size=0, max_lower may have stale entries (e.g., k=1 after removing lower? Actually lower_size can be 0 transient after removal before rebalance, but in add of next iteration, after previous removal we either rebalanced or rebuilt, so lower_size>=upper_size and if lower_size=0 then upper_size=0. But max_lower may have stale entries. Pushing to lower with stale okay. Rebuild threshold will catch. Good.

Now, let's test k=1 decreasing with revised rebuild before rebalance after remove. At i=64, after remove, upper physical64, lower1, total65 >64, rebuild. We skip rebalance (which would do nothing for k=1 after remove? lower1 upper0). Rebuild sets lower1 upper0. Good.

Now, consider a case where after removal, sizes unbalanced and physical > threshold. Rebuild sets balanced, skip rebalance. Good.

Now, let's think about if we should also rebuild after add during initial build if k large and heap size maybe > threshold? No stale, size <=k < threshold (threshold >=4k or64). If k<16, threshold64 >k. No.

Now, let's consider if `rebuild_threshold = max(4 * k, 64)` for k=1000 is 4000. If physical heap size reaches 4001, rebuild. Sorting 1000. Good.

Now, potential issue: Sorting slice every rebuild can be O(k log k) in C, but for k=1000 and 50 rebuilds, fine. For k=100000 and n=200000, threshold400000, no rebuild. If physical heap size somehow >400000 impossible. Good.

Now, let's think about if the delayed dicts can become large (distinct values) even if physical heap size <= threshold? No, delayed keys correspond to stale entries, which are in physical heaps. If physical size <= threshold, delayed keys <= threshold (plus zero keys from previous cleared? If no rebuild, zero keys can accumulate beyond physical size because we leave zero keys. Ah! Important: We leave zero delayed keys forever. Even if physical heap size is bounded by rebuild? If no rebuild, zero keys can accumulate to n even if physical heap size small. For k=1 with rebuild every64, dicts cleared often, so zero keys limited. Without rebuild, zero keys could grow to n. With rebuild, cleared. But if physical heap size stays below threshold, zero keys can still accumulate over n because we never delete zeros. Example k=1000, threshold4000, physical heap size maybe ~1000, but each removed distinct value leaves a zero key in delayed dict. Over 200k iterations, delayed dict could grow to 200k even though physical heap size small. Memory okay (200k keys). But `ld_get` for values not in heap may still hit zero keys. Memory okay. If we want to bound memory, delete zeros or clear periodically. Rebuild threshold based on physical heap size won't clear zero keys if physical stays below threshold. For n=200k, 200k keys okay. But if n larger, maybe. Problem n=200k. Fine.

Could zero keys cause performance issue? Dict size 200k, get still O(1). Fine.

If we delete zeros, dict size bounded by stale entries (physical size). But delete overhead. Could be okay. Maybe better to delete zeros to keep memory and cache small. Let's evaluate. In clean_lower, when c becomes 0, we could `del lower_delayed[v]`. But if there are multiple stale entries of same value, c may become >0. Use:
```
if c == 1:
    del lower_delayed[v]
else:
    lower_delayed[v] = c - 1
```
This keeps dict small. But when we do `lower_delayed[y] = ld_get(y,0)+1`, if key absent, get 0. Good. In clean, if c=1, delete. This adds branch. For n=200k, deleting up to stale pops. Could be okay. It also prevents zero key accumulation. Which is faster? Branch and delete vs leaving zero. Dict get for zero keys still O(1), but larger dict maybe cache. For 200k, not big. I'd consider deleting to be neat. But if c=1 common, delete overhead maybe ~200k deletes, okay. If we leave zeros, no delete. Memory 200k floats ~ maybe 16MB, okay. The problem doesn't specify memory limit. Simpler to leave zeros. But with rebuild, dicts cleared, zero keys only since last rebuild. If physical heap size small and no rebuild, zero keys can accumulate. 200k okay. Let's leave zeros for speed/simplicity.

However, if we leave zeros, `ld_get(v,0)` returns 0 for zero keys. In clean, if c=0, break. But if top value has zero key, and there is a stale entry of that value? Delayed count zero means no stale entries of that value (conceptually). Good.

Now, let's think about if zero keys can make `len(max_lower)+len(min_upper)` not reflect delayed dict size. Rebuild threshold only physical. Zero keys memory not an issue.

Now, potential issue: If a value has delayed count 0 but physical stale entry remains (due to mislabel), we could treat it as valid. We argued count zero implies no stale. Good.

Now, let's consider if we should use `try`/`except` for IndexError? No.

Now, let's think about if the code is fully standard library. Yes.

Now, let's maybe include type hint for local variables? Not needed.

Now, final answer code block. Ensure no trailing explanation.

Double-check final code with revised rebuild before rebalance. Let's write final version cleanly.

One more subtle point: In add block, if lower_size >0, we call clean_lower. If max_lower has stale top, clean pops. But if max_lower becomes empty while lower_size>0 (shouldn't), then `-max_lower[0]` error. Could add a safety fallback to avoid crash in edge cases with NaN or bugs. But adding fallback might hide bugs. Maybe add:
```
            if not max_lower:
                hp_push(max_lower, -x)
                lower_size += 1
            elif x <= -max_lower[0]: ...
```
But if lower_size>0 and max_lower empty, logical valid elements missing; pushing adds one, lower_size becomes lower_size+1, still inconsistent. Could instead set `lower_size = 0`? But missing elements can't be recovered. Since impossible, no guard. For NaN, maybe possible? NaN comparisons false could break invariant and lead to lower_size>0 but max_lower empty? Let's see if NaN in nums. Add NaN: if lower_size0 push lower. Next add x: clean lower top NaN? `x <= -max_lower[0]` with NaN false, push upper. Rebalance maybe. Median clean lower: top NaN, delayed? no, median NaN. Not crash. If lower_size>0 and max_lower empty? clean only pops stale, not valid. NaN not stale. So no.

Now, consider if a stale top has delayed count, clean pops. If all entries stale but lower_size>0, impossible. Good.

Now, let's think about if rebuild threshold check after removal but before rebalance could skip rebalance and set sizes balanced. Good. But what if physical heap size > threshold and `lower_size` or `upper_size` is negative due to bug? No.

Now, let's verify with k=1 decreasing and rebuild before rebalance:
At i=1 after remove, physical size2? lower1 upper1, threshold64 no rebuild, rebalance? lower_size1 upper0, no. Good.
At i=64 after remove, physical size65, rebuild. It sets lower_size1 upper0. No rebalance. Median. Good.

Now, what if after removal, physical size > threshold but sizes unbalanced, and rebuild sets balanced. Good.

Now, let's consider if after add, physical size > threshold and we don't rebuild until after remove. During add rebalance, heap size may be threshold+1, log okay. Fine.

Now, one more potential optimization: In median, if we just rebuilt, we know heaps clean; but code calls clean_lower (and clean_upper if even). It will do one dict get each. Fine.

Now, let's think about if `out_idx` might not be used to prealloc? It is.

Now, final code. Ensure indentation correct. Use 4 spaces.

Let's produce final.
