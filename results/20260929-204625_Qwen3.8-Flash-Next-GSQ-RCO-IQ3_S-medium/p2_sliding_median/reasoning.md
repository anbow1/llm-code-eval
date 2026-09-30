We need answer with single python code block only. Need think through problem. Need produce final code only. Need ensure efficient for n=200k, k=1000 under 2s. Need sliding median using two heaps with lazy deletions? Standard. Need return list[float]. Edge cases duplicates, floats. Need only stdlib. Need implement median of window size k. Could also use sortedcontainers not allowed. Need efficient O(n log k). n=200k log 1000 ~10 => okay. Need Python implementation fast.

Options:
1. two heaps: maxheap for lower half, minheap for upper half. Lazy deletion with dict counts and heap balancing. Need median float.
Need careful with rebalancing sizes. Could implement as custom class or inline.

Algorithm:
Maintain two heaps:
- lo: max heap with negative values; contains lower half.
- hi: min heap contains upper half.
- size_lo, size_hi: effective sizes (count of live elements in each).
- delayed: dict element -> count to remove (lazy). Values can be float. Need handle negative floats? Use floats as keys okay.
- prune(heap): while heap and -heap[0] in lo? Actually for lo with neg values. prune_top(heap): while heap top is marked for deletion: pop and decrement count. For lo: x = -heap[0]; if delayed[x] > 0: heappop, delayed[x]-=1, del if 0. For hi similar.
- rebalance(): prune tops, move top from hi to lo if size_lo < size_hi? Or ensure size_lo == size_hi or size_lo == size_hi +1. Standard: after insert/remove, adjust target. If size_lo > size_hi: prune hi, prune lo? move lo top to hi. If size_lo < size_hi: move hi top to lo. Then prune tops. But need maintain ordering: all lo <= hi. When adding: if lo empty or x <= -lo[0], push lo, size_lo++ else hi, size_hi++. If removing: if x <= -lo[0], size_lo--; else size_hi--; delayed[x]++. Then rebalance: first ensure sizes balanced, but top may be delayed? Need prune before moving.

Pseudo:
from heapq import heappush, heappop, heapify? Use lists.

def sliding_median(nums, k):
 if k<1 or k>len(nums): raise ValueError
 lo=[]; hi=[]; delayed={}; size_lo=0; size_hi=0

 def prune(heap):
   if not heap: return
   # need know whether lo or hi? Pass is_lo? Could use negative.
Better separate prune_lo/prune_hi:
 def prune_lo():
   while lo:
     x = -lo[0]
     cnt = delayed.get(x)
     if cnt is not None and cnt >0:
       heappop(lo); delayed[x]=cnt-1; if cnt==1 del; size_lo -=1? Wait effective size? delayed removals already subtracted size_lo when marking deletion? Usually size_lo tracks live count; when marking delayed for a lo element, size_lo--. Then when popping from heap, do not change size_lo. So prune should not adjust sizes. Good.
     else break
 def prune_hi(): similar.
 Need prune before median and before moving.

 def rebalance():
   # ensure no top is deleted before moving or reading
   prune_lo(); prune_hi()
   # size_lo must be (k+1)//2 maybe? For window size fixed k; but during insertion/removal intermediate size k maybe? If we add then remove: size k+1. We can use dynamic target sizes? Simpler: after adding new and removing old, size_lo + size_hi = k. Ensure size_lo == (k+1)//2 and size_hi == k//2. But during initial building can be incremental.
   if size_lo > size_hi: # move from lo to hi until size_lo == size_hi or size_lo == size_hi+1? Since target for k: if k odd lo one more. Need target_lo = (size_lo + size_hi + 1)//2? But total fixed. Let total=size_lo+size_hi. target_lo = (total+1)//2.
But with delayed, size variables live counts. Use total = size_lo+size_hi.
   target_lo = (total+1)//2
   if size_lo < target_lo:
      # Need move from hi to lo. But if hi contains delayed top, prune_hi first; if empty? Shouldn't if total enough? But possible after marking remove from hi. Need prune_hi before. If hi empty, maybe move? Could use prune loops inside.
      while size_lo < target_lo:
        prune_hi()
        if not hi: break (should not happen)
        x=heappop(hi); size_hi -=1
        # But x may be delayed? prune ensures not. However if x delayed? delayed count decremented.
        heappush(lo, -x); size_lo +=1
   elif size_lo > target_lo:
      while size_lo > target_lo:
         prune_lo()
         x=-heappop(lo); size_lo -=1
         heappush(hi, x); size_hi +=1
   # After moving, maybe top ordering violation? With lazy deletions and insertion rule, should hold? Need consider moving only top. If x from lo to hi and x may be > some lo? Since lo top is max lo, move to hi, okay. Move hi top to lo, okay. If insert into lo with x <= top, ordering okay. insert into hi if x>top, okay. But delayed top removal may reveal ordering? Standard.
   prune_lo(); prune_hi()
   # But after moving, top of lo might be delayed? prune.

 def add(num):
   nonlocal size_lo,size_hi
   if not lo or num <= -lo[0]:
      heappush(lo,-num); size_lo +=1
   else:
      heappush(hi,num); size_hi +=1
   rebalance()

 def remove(num):
   nonlocal size_lo,size_hi
   if not lo or num <= -lo[0]: # if x <= top lo then belongs to lo (if equal ambiguous; if x equal to top but might be in hi? Need consistent? Standard: if num <= -lo[0], size_lo-- else hi. But if duplicates equal and one in hi? For removal of value equal to lo top, could decrement lo even if removed value was in hi? Since values equal, doesn't matter? Need maintain counts? Delayed count only value, if removed hi equal top and we mark delayed, but size_lo-- wrong; then rebalance might move top from hi? Let's examine standard solution by leetcode: if num <= max_heap[0] then small++ else large++ ; delayed[num]++; if num == small[0] or num == large[0] make_balance. It uses <=. Duplicates okay because heap elements indistinguishable; decrementing lower or upper size arbitrary. As long as counts delayed total. It works? Need ensure sizes target. For equal values, moving across halves may occur. Should be okay.
   delayed[num]=delayed.get(num,0)+1
   if num <= -lo[0]: size_lo -=1 else: size_hi -=1
   rebalance()

Initial window: for first k: add. Then median. Then for i from k to n-1: remove(nums[i-k]); add(nums[i]); median.
Need median after rebalance: prune_lo(); prune_hi(); if k odd: return float(-lo[0]); else: return (-lo[0]+hi[0])/2. Need hi nonempty. If even k target_lo=size_hi. Good.

Potential bug with prune and delayed values that are floats: equality okay. But float -0.0? Fine.

Need speed. Nested functions with nonlocal maybe okay for 200k*logk. Need optimize. Could implement inline? Need pass top efficiently.

Alternative use two heaps with explicit target size and no lazy deletion using bisect.insort into sorted list O(k) insert/delete O(k) would be 200M operations too slow. So lazy heaps.

Need robust correctness with floats and duplicates. Need ensure prune doesn't remove delayed elements not currently top. Standard. Delayed dict counts all pending removals. For floats with same value multiple entries: delayed counts aggregate. When top has pending count, pop one and decrement; size unchanged because size was decremented when marking? Wait when marking removal we decrement size. But if duplicate value exists in both heaps, we don't know which instance removed; delayed count for value could remove any instance top. The heap size effective adjusted by size decrement, not by actual pop. This can cause size mismatch with actual heap entries? Delayed dict counts number of live elements removed; when popping from heap, we just remove one stale entry. We don't adjust size. Since size already accounts live count. Number of stale entries total equals sum delayed. Actual heap length = effective size + stale entries in that heap. Marking deletion may decrement size from the heap based on comparison. If stale popped from other heap? But value equal? Could be delayed count value x, top of hi x; while marking removal we decremented size_lo because num <= lo top (lo top x). But stale x in hi could be popped by prune_hi, not affecting size_hi; delayed count decremented. Is that okay? Need examine standard algorithm: If value x is in both lo and hi, and we remove x but classify as in lo, then size_lo--. Delayed[x]++. If there is stale hi x, prune_hi might pop it, reducing hi actual but size_hi unchanged; delayed count goes down. Later maybe we need remove an actual hi x? The classification could cause size_lo too low and size_hi too high? But because values equal, there is an actual lo x to serve as lower half and a hi x as upper. Removing any x conceptually should decrease one count in whichever side it conceptually occupies. If there is an actual lo x and hi x; if we classify remove as lo, then we mark one x delayed. If prune later pops hi stale x instead, we have removed stale from hi but size_hi not decreased, leaving too many effective in hi? But delayed count removed, so we no longer need to pop the intended lo stale; there is one actual lo live? Let's test: lo has [x], hi has [x]. Remove x classify lo: size_lo 0, delayed[x]=1. rebalance target maybe move hi top to lo: prune_lo top x delayed, pop it. lo empty. Then while size_lo < target, prune_hi: hi top x delayed? delayed count now 0 (popped from lo). So hi top live? heappop hi move to lo. size_hi 0 size_lo1. Actual heaps: lo maybe empty then push x, hi empty. Good. If hi top delayed count existed before prune_lo? prune_hi called before move? Standard rebalance prune tops first. If prune_hi top x with delayed[x]=1, it might pop hi stale before prune_lo. Then delayed goes 0; size_lo remains 0; lo top x live. Then target move? size_lo < target, prune_hi empty, hi empty? But lo has x live, hi empty; moving? Need move from lo to hi? target for total 1 maybe target_lo=1, no move. median from lo? But actual lower half should maybe x; okay. But total effective =1, lo live count=1. Actual lo has x. Fine. But if prune_hi popped delayed hi and prune_lo didn't pop lo stale, lo live x remains. Good. Since values equal, no issue.

Need ensure ordering with lazy and moving. Standard.

Could also implement with two SortedLists? no.

Need consider k=1. target_lo=(1+1)//2=1. median -lo[0]. Remove/add. For k=1: after remove size total 0? rebalance target 0. Then add new. But if we remove first, total k-1; target maybe 0. Need not fail prune. Then add. Or add then remove total k+1; target k. Both okay. Removing first simpler? For i from k to n-1 remove old then add new. Need ensure after remove total k-1, target_lo=(k-1+1)//2 = k//2. For k=1 target=0. If remove num from lo: size_lo 0, delayed++. rebalance: total=0, target_lo=0. size_lo == target; prune_lo: if top delayed pop. prune_hi. median not taken until after add. add: if lo empty, push lo size=1; rebalance target=1; median. Works. But remove classification uses if not lo or num <= -lo[0]. After previous prune/rebalance, lo top live. Good.

Potential bug: after removing and before add, top of hi may be delayed? prune_hi does. Good.

Need maybe use local variables for speed: define inside function but use heapq functions local. Avoid nonlocal? Could use lists for sizes? But Python nonlocal in nested functions okay but overhead. For 200k, nested functions called 400k times; fine? Need <2s. Need optimize maybe implement as class? But nested calls overhead maybe okay but could be near? 200k log 1000 ~2M heap operations, each heap operation C? heappush/pop Python loops but C? heapq is Python but optimized? Need be efficient. 2 sec okay likely. But Python 200k with two heaps lazy deletion maybe fine. Need maybe optimize by building first k via heapify? We can initial add loop. But could initialize with sorted? Let's consider performance.

Alternative use Fenwick tree with coordinate compression? n=200k, values floats. Coordinate compression all nums, maintain BIT counts for window; median query kth order statistic via BIT O(log m). Update O(log m). Need return median by kth and kth-1. Complexity O(n log n) ~18, faster in Python maybe? Fenwick arrays and bisect? Could be efficient. Need handle duplicates and floats. Coordinate compression sort all unique nums. Maintain counts. Query kth: bit search. For each window, query lower index and upper. Need update counts. For even median: kth (0-index?). Need O(log m) per window. n=200k, 400k Fenwick operations (update/remove, query kth) each 18 loops in Python. Could be maybe faster than heap? Fenwick query with while loops Python 200k* (update remove two updates ~36 + median query two searches ~36) = 72*200k = 14.4M loops; maybe okay 2 sec? Python 14M loops maybe 1s? Might be okay. But heap operations log 1000 ~10 each plus prune, maybe fewer loops? heappush/pop in Python loops with comparisons. Could also be fine. Need robust and efficient. Fenwick with coordinate compression uses all nums and k, easier correctness? Need return floats exact. For even k mean of two middle values. For kth order statistic (1-index). If k odd: median = value at (k//2+1)th. If even: values at k/2 and k/2+1 average. Coordinate compression: unique sorted. BIT with 1-index frequencies. Update delta ±1. find_kth(k) returns smallest idx such that prefix sum >= k. Standard binary lifting: idx=0; bitmask=1 << (size.bit_length()-1); while bitmask: next=idx+bitmask; if next<=m and bit[next]<k: idx=next; k-=bit[next]; bitmask>>=1; return idx+1. Then value = coords[idx-1]. Could optimize using list bit. Updates: while i<=m: bit[i]+=delta; i += i&-i. For each slide: remove outgoing update -1; add incoming update +1; median query. If initial window: build bit by updates k times, or use prefix counts. Need output. This is simple and deterministic O(n log n). But m up to 200k. Bit operations Python integer additions, list indexing. Need coordinate map: dict value->1-index for updates. For duplicate floats okay. Sorting floats and unique. Need be careful if input includes NaN? list[float] maybe NaN? Median with NaN? Probably not considered. If NaN values, sorting weird, comparisons; median undefined. Could ignore.

Fenwick may be more efficient and simpler? Need compare. For n=200k, k=1000, m=200k. Building: k updates. Slide: each slide two updates + two find_kth (if even) or one (odd). find_kth loop bitmask size bit_length of m ~18. Updates ~18. Worst 2*18 + 2*18 =72 iterations per slide. 200k*72=14.4M, plus overhead. Might be okay in 2 sec? Python 14M loops can be ~0.5-1 sec if optimized? Actually 10M while loops ~0.5-1s in PyPy maybe; CPython maybe 1s-2s. Need maybe optimize to avoid two find_kth for even? Could compute both medians with two calls. Could optimize query adjacent? But okay. Heap operations: each slide remove/add each one heappop/push maybe. Lazy deletion pruning pops stale elements, but each element eventually popped once from heap. Total heappush: initial k + 2*(n-k) = ~400k? Actually add push one each slide => n-k ~199k pushes; initial k 1k; remove does not push but may prune pops stale. Rebalance moves elements: each slide maybe one pop from one heap and push other (if size adjust) = 2 operations. total maybe ~1M heap operations. Each heap operation log k ~10 comparisons Python. Could be similar. Heap has less Python-level loops than Fenwick? heapq loops in Python too. But heappush/pop implemented in Python (heapq.py) with while loops, function calls. Fenwick loops are pure Python. Could still pass.

Need maybe choose robust. Fenwick with coordinate compression handles duplicates easily and no lazy deletion complexity. Need only stdlib. Potential memory okay: bit size 200k, coords list, dict. Output length 199001 floats, memory ~1.6 MB plus floats? okay. Need maybe optimize by reading no input.

Could implement Fenwick with inlined loops for performance. Use local variables. Since final code should be function. We can define helper functions nested. But calls for each update/query could add overhead. Inline update loops inside slide? Could write local function but function call overhead 400k calls (update remove/add) + 200k query calls maybe okay but optimize maybe inline? Could use local variable bindings.

Fenwick details:
```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n: raise ValueError
    coords = sorted(set(nums))
    m = len(coords)
    # map val to index; for floats, use dict comprehension
    idx_map = {v: i+1 for i,v in enumerate(coords)}
    bit = [0]*(m+1)
    # local bit, m
    # initial add k
    for v in nums[:k]:
        i = idx_map[v]
        while i <= m:
            bit[i] += 1
            i += i & -i
    # find kth function
```

Could optimize initial build by counts array then build bit linear: counts = [0]*(m+1); for v in nums[:k]: counts[idx_map[v]] +=1; then bit = counts copy? Fenwick linear build: bit=counts[:] (counts 1-index); for i in range(1,m+1): j=i+(i&-i); if j<=m: bit[j]+=bit[i]. But building counts for k=1000, simple updates okay. But for general n,k maybe k large 200k; update k times 3.6M loops okay. Linear build faster. Do linear build:
```
counts = [0]*(m+1)
for v in nums[:k]: counts[idx_map[v]] += 1
bit = counts[:] # length m+1
for i in range(1,m+1):
    j = i + (i & -i)
    if j <= m: bit[j] += bit[i]
```
But if k large 200k, counts length m+1, fine. Need counts maybe memory. We can build bit directly: bit=[0]*(m+1); for v first: i=idx_map[v]; bit[i] +=1; then after: for i in range(1,m+1): j = i + (i&-i); if j<=m: bit[j]+=bit[i]. Wait direct bit initial as frequencies at positions; then Fenwick linear build. This avoids counts. Yes:
```
bit = [0]*(m+1)
for v in nums[:k]: bit[idx_map[v]] += 1
for i in range(1, m+1):
    j = i + (i & -i)
    if j <= m: bit[j] += bit[i]
```
This works: bit starts raw frequencies; linear Fenwick build. Need bit[i] initially freq; after build bit stores tree.

find_kth function optimized:
```
max_pow = 1 << (m.bit_length() - 1)
def kth(t):
    idx = 0
    bitmask = max_pow
    while bitmask:
        nxt = idx + bitmask
        if nxt <= m and bit[nxt] < t:
            idx = nxt
            t -= bit[nxt]
        bitmask >>= 1
    return idx + 1
```
Need if bit values ints. t 1..k. For even two queries. For speed, avoid function call? Could inline two queries in loop. But code complexity. Define local function; 200k calls maybe okay. Could make median query function. But performance: function call overhead maybe ~0.1 us? Actually 400k calls maybe 0.05s? fine. But while loops dominate. Use local variables `bit_local=bit; m_local=m; bitmask0=max_pow` inside function closure. In nested function accessing nonlocal maybe slower but okay. Could pass bit etc.

Optimization: For each slide, after updating, compute median. For odd k one kth; for even two. To avoid duplicate search, can find both by two kth calls. Since adjacent order statistics, could optimize using counts? But not needed.

Potential performance issue: idx_map dict lookup per update (400k) plus sort set 200k. Fine.

Could avoid idx_map dict by using sorted coords and bisect for update? That would be O(log m) with C? bisect_left in C faster than dict? Need map each update to compressed index. Dict lookup O(1) faster. But for floats as keys, dictionary okay. Could precompute indices for nums: `comp = [idx_map[v] for v in nums]` once, then updates use ints, no dict lookups in slide. That costs memory 200k ints (~1.6MB? Python int 28 bytes ->5.6MB), but okay. It may improve speed. Use list comp. For initial and slide. But memory still okay maybe 20MB. If n=200k, comp list 200k Python ints ~5.6MB; okay. Output list 199k floats ~? 24 bytes? okay.

Could combine: `idx_map = {v: i+1 for i,v in enumerate(coords)}` then `comp = [idx_map[v] for v in nums]`; build bit using comp[:k]; slide use comp[i], comp[i-k]. This removes dict lookup inside loop. Might be faster.

Alternative coordinate compression using sorting `nums` and mapping each? set loses duplicates; sorted(set). For floats with -0.0 and 0.0 dict key treats equal; okay. NaN? If multiple NaNs, dict keys: nan equal? In Python, nan != nan but dictionary lookup? `float('nan')` can be inserted but lookup for same object? Not reliable. Not required.

Potential issue median of floats from coords. If coords are ints? Return float. For odd: if median from integer coord maybe return float(value). Use `float(coords[idx-1])`. For even: `(coords[i1-1] + coords[i2-1]) / 2.0` yields float if division true. If coords ints, Python 3 returns float. If very large maybe inf? acceptable.

Fenwick update inline function:
```
def add(i, delta):
    while i <= m:
        bit[i] += delta
        i += i & -i
```
Could optimize by writing two loops in slide. Need remove and add. For remove outgoing idx, add incoming idx. We can use inline loops inside for each slide. But duplicated code. Function call overhead 400k; okay but if optimizing, inline:
```
for i in range(k, n):
    out_idx = comp[i-k]
    j=out_idx
    while j <= m:
        bit[j] -= 1
        j += j & -j
    in_idx = comp[i]
    j=in_idx
    while j <= m:
        bit[j] += 1
        j += j & -j
    # median
```
This avoids update function calls. But query function call still. Could inline query for one/two too.

Maybe write helper for median? Use local variables. Let's consider speed of query. Define:
```
def get_value(rank):
    idx = 0
    bitmask = top_bit
    bit_local = bit
    m_local = m
    while bitmask:
        nxt = idx + bitmask
        if nxt <= m_local and bit_local[nxt] < rank:
            idx = nxt
            rank -= bit_local[nxt]
        bitmask >>= 1
    return coords[idx]
```
Need `coords[idx]` because idx is last position with prefix < rank; answer idx+1 1-index => coords[idx]. For even rank1 and rank2. But if `idx` can be m? If rank > total? not; rank<=k total. If rank=total, bit search returns idx=m? Example bit prefix total. It returns idx = last with prefix < rank; if rank=total, idx = index before final? Actually standard returns idx+1 as first prefix >= rank. If rank total, idx could be m-1 maybe. `coords[idx]` okay. If m=1, top_bit=1, bit[1]>=rank, idx remains0, coords[0]. Good. Need not call function? Could define and call.

For even median: `a = get_value(half); b=get_value(half+1); out.append((a+b)/2)`. If k even. For odd: `append(float(get_value(mid)))`. But if values ints, even division returns float. To ensure list floats: odd maybe `float(value)`. If `value` already float, okay.

Maybe optimize query for adjacent ranks: Could implement a function returning two adjacent values for ranks r and r+1 in one traversal? Since Fenwick binary search for first and second; if r and r+1 might be in same or adjacent coordinates. Could find first rank and then maybe if prefix after first coordinate >= r+1, same value else next coordinate. But need know prefix sum at first idx? Fenwick can compute prefix. Could do:
- Find index of rank r (compressed pos p). Also know prefix before p = total before, and freq[p] =? Fenwick doesn't expose freq directly but we have bit maybe can compute point? If p found, the binary search at end: idx = p-1? Actually final idx = p-1? The answer position = idx+1 = p. During search, rank after skipping positions <p; original r. We can know `rank -= bit[...]` after search? At end `rank` is order within position? Let's see: after skip bit[nxt] < rank, rank reduced. If final position p, rank = r - prefix(p-1). Since at p prefix>=r. If rank <= freq[p], and if rank < freq[p] maybe r+1 also same coordinate if rank < freq[p]; if rank == freq[p], r+1 next coordinate. But we don't know freq[p] unless point query or maintain counts array. Could maintain counts raw separately; update counts. Then we can find p and freq. We can do two rank searches for simplicity. But maybe optimize by maintaining counts and custom median function for adjacent.

Since k=1000 small, could maintain window sorted list using heap? Fenwick okay. Another alternative using `bisect.insort` for k=1000: insertion and deletion O(k) shifting ~1000 elements, for 200k slides =200M operations in C list memmove (C-level) maybe very fast? Actually `sorted` list of 1000 floats, remove via bisect and `del list[idx]` (memmove ~1000) and insert memmove ~1000; 200k*1000 = 200M pointer moves in C, likely very fast (<2s) and median O(1). Could be simplest and efficient enough. For k=1000, n=200k, 200M C pointer moves ~0.2GB? Memory moves 200M * 8 =1.6GB, maybe okay 2s? But `bisect` Python log k comparisons in Python C? bisect implemented in C? Python's bisect module is Python? In CPython, _bisect C accelerator usually used. `insort_right` maybe C? Actually bisect.py imports _bisect. del and insert on list are C memmove. This might be simpler and pass. But worst n=200k, k=1000 -> 200k deletions/inserts of list length 1000. Each insert/delete memmove average 500 pointers = 100M moves for each? two operations =>200M, 1.6GB. C memmove can be several GB/s, maybe <0.1s? But list insert may have allocation? It resizes only length fixed. Should be fast. But if k large? constraint just example k=1000. But if k=10000, O(nk) worse. Problem says efficient: n=200k with k=1000 must finish well under 2s. Could choose O(n log k) heaps or Fenwick. But sorted list with k=1000 may be simpler, less bugs. Need ensure if k large? If hidden tests include k=100000, sorted list O(200M for 200k?) Actually if k=n/2, 200k*100k impossible. Need robust efficient general. So O(n log k) better.

Fenwick O(n log m) independent of k. Could be okay. Need implement efficient enough. Let's test mentally. CPython 14M loops in while maybe okay but function call? Need maybe use PyPy? Not guaranteed. Could optimize further.

Heap approach O(n log k), with k=1000: each slide: prune maybe, heappush, heappop? Fenwick 72 loops; heap maybe ~30 comparisons and swaps. Which faster? heapq in Python loops similar but fewer? Let's estimate. For each add: if num <= -lo[0] push to lo: heappush loops log(size_lo) ~10, each loop two comparisons? Remove: mark delayed no heap operation; rebalance: maybe move: one heappop and one heappush =>20; prune may pop stale each element once. Total maybe 30 heap loop iterations per slide, 6M loops. Fenwick 14M loops. Heap might be faster. But lazy deletion correctness more complex. Fenwick simpler and maybe fast enough. Could optimize Fenwick query and updates. Let's explore performance and correctness.

Could combine Fenwick with precomputed compressed and local variables. Let's estimate CPython: 14M simple while iterations with bit ops list accesses, maybe ~0.05 us? Actually CPython while loop overhead ~30-50 ns? no, ~50 ns? CPython 10M loops ~0.5s? Let's recall: 10 million simple integer additions in CPython ~0.5-1s? Maybe 2s. 14M may be ~2s, borderline. But n=200k, k even => 400k query calls *18=7.2M + updates 400k*18=7.2M =>14.4M. Plus list indexing. Could pass "well under 2 seconds" maybe not. We can optimize Fenwick to use block/sqrt decomposition? For n=200k, coordinate m=200k. Maintain counts in buckets? Query kth using sqrt decomposition O(sqrt(m)) ~447 per window => too high. But with k=1000, maybe two-pointer? Since sliding median can be maintained with two heaps.

Let's implement two heaps efficiently. Need ensure correctness and speed. Let's design optimized lazy two-heap.

Potential simpler: Use two multisets? not stdlib.

Two heaps with lazy deletion, target lower size = (window_size+1)//2? During slide if remove then add total k-1 then k. Could also insert then remove total k+1 target k. Which more stable? Insert then remove may need rebalance to k+1 then k, more moves. Remove then add intermediate k-1 might reduce moves. But with duplicates and target based on total, okay. Need ensure after remove, sizes target floor? Then add. But if remove causes target lower size decrease, might move from lo to hi to balance before add. Then add may move back. Could be extra moves. Insert then remove also extra. Standard Leetcode: insert then remove and balance; maybe okay.

Could optimize by combining update of outgoing/incoming without intermediate size k-1? Maybe update sizes by moving one element conceptually? But not necessary.

Implement two heaps with class-like nested functions. Need avoid nonlocal overhead? Use mutable lists for sizes? Or define class with methods? Method calls overhead. Nested functions with nonlocal may okay. But 200k calls to rebalance (two per slide?) ~400k function calls plus prune. Could inline rebalance? Maybe code complexity. Could write as inner functions but optimize by local variables. Let's see.

Pseudo with nonlocal:
```
def sliding_median(nums,k):
 n=len(nums)
 if ...
 lo=[]; hi=[]; delayed={}; sl=sh=0
 push=heappush; pop=heappop; get=delayed.get
 def prune_lo():
   nonlocal? delayed, lo
   while lo:
     x = -lo[0]
     c = delayed.get(x)
     if c is not None:
       if c == 1: del delayed[x]
       else: delayed[x] = c-1
       pop(lo)
     else: break
 ...
```
But `nonlocal sl, sh` for rebalance. Need careful.

Can maintain size_lo/size_hi as integers in closure. Nonlocal assignment in functions. Function call overhead. But likely fine.

Need target: Since after remove intermediate total=k-1. Use `target = (total + 1) // 2`. Rebalance:
```
def rebalance():
    nonlocal sl, sh
    total = sl + sh
    target = (total + 1) // 2
    # move hi->lo until sl target
    while sl < target:
        # ensure hi top live
        while hi:
            x = hi[0]
            c = delayed.get(x)
            if c:
                if c ==1: del delayed[x]
                else: delayed[x]=c-1
                pop(hi)
            else: break
        if not hi: break? 
        x = pop(hi); sh -=1
        push(lo, -x); sl +=1
    while sl > target:
        while lo:
           x = -lo[0]
           if delayed.get(x):...
           else break
        if not lo: break
        x = -pop(lo); sl -=1
        push(hi, x); sh +=1
    # after balancing, prune top for median? maybe do in median.
```
But moving based on target after remove/add may leave size_lo less than target with hi empty? Suppose total=0 target=0. fine. Suppose hi contains only delayed entries and lo live but sl<target? Could happen if we removed from hi but prune_hi not done? In while sl<target, prune_hi will pop stale; if hi empty and still sl<target, we could move from lo? But target based on total live; if hi empty, all live in lo, sl=total >= target, so sl<target cannot happen. If delayed stale in hi, live counts include elements in lo; if hi empty but sl<target would imply target > sl > total? impossible. Similarly. So safe.

Need also prune top after balancing for median. Could combine in rebalance? If we don't prune top of lo/hi before moving, while move from hi: we prune hi top; after move to lo, lo may have stale top? If lo top stale, next move? Need prune lo before moving from lo. Good. After all moves, could prune tops for median. Add prune calls at end or median. Could leave stale tops; median must prune before reading.

But insertion/removal classification must consider live top. Before classification, need ensure top of lo not stale? In add/remove, we may compare `num <= -lo[0]`. If lo[0] stale, -lo[0] could be too large/small. Standard `add` and `remove` call `rebalance` at end which prunes. But if a stale top persists from previous operations, classification may be wrong. Need ensure before add/remove top lo is live. After previous rebalance, we should prune lo/hi top. If rebalance ends with prune tops, okay. But if total=0, lo empty. Remove classification with not lo or compare. If stale top not pruned? Let's ensure rebalance ends by pruning top of both heaps. Or do at start of add/remove: `prune_lo(); prune_hi()`? That adds overhead. Instead ensure rebalance always prunes tops after adjustments.

Rebalance target loops can leave stale top? In while sl<target, we prune hi top before popping; push x into lo. If lo top stale, and sl<target still? It will prune hi? For lo stale only matters when moving from lo or median. But if sl==target, stale lo top remains. Thus end prune needed. If while sl>target, prune lo before popping, push to hi; hi top stale could remain. End prune. Good.

Need handle removal of value that is stale already? We only remove elements in window; each removed value is a live element at time of removal (unless stale classification? Delayed dict has no entries for live elements). But if value appears stale and live equal, marking delayed adds count. Fine.

Potential issue with `delayed` dict for floats and using `get(x)`; `get` returns None if absent; count could be 0 if we leave? We'll delete when 0. Use `if x in delayed`? `get` faster. Need handle count 0 not. Use `c = delayed.get(x)`; if c: (count>0). If c=0 not possible. If key absent c=None; if c: true for >0. But if count could be 0 false. Good. For values like `x` maybe 0.0, c not key? okay.

When marking removal, `delayed[x] = delayed.get(x, 0) + 1`.

Need ensure classification remove with stale lo top? Since rebalance end prunes. Good.

Initial add: after each add rebalance. Could build first k more efficiently? We can add first k with add() k times. k=1000, fine. Or build heaps from sorted first window? Not necessary.

But add uses `lo` top live after rebalance. Good.

Potential bug with target based on total live but window size during initial add less than k. For median after initial add size k. During add initial, rebalance with total current. It maintains target lower ceil(total/2). Good. But after first window, sizes maybe based k.

Now test with examples mentally:
nums [1,2,3,4], k=2.
Initial:
add1: lo [1] sl1 target1 median not.
add2: lo top1, 2>1 -> hi [2] sh1. rebalance total2 target1; sl=1, sh=1. prune tops. median (1+2)/2=1.5.
slide remove1: lo top1; remove <=1, sl0, delayed1. rebalance total1 target1; sl<target -> prune hi top2 not delayed pop? wait sl<target=1, prune_hi sees 2 live; pop hi x=2 sh0 push lo -2 sl1. delayed1 remains in lo? lo actual [-2? and stale -1? Wait initial lo heap [ -1], after remove didn't pop, lo has [-1] stale. Then move hi pop 2 push -2 -> lo heap [-1, -2]? maxheap via negatives: top -1 (stale) because -1 > -2. target reached. End prune_lo: x=-lo[0]=1, delayed1 => pop, del. lo top now -2. prune_hi empty. median add 3? Let's slide order remove then add: remove1 rebalanced to lo [2], hi []; add3: lo top2, 3>2 -> hi [3] sh1 total2 target1; median (2+3)/2=2.5. Good.
If add then remove? Similar.

But note in above remove1 rebalance moved hi top to lo while lo top stale. This is okay. However insertion after remove compared with lo top after prune (2). Good.

Need ensure after moving hi to lo, stale lo top remains and may be larger than new elements, but pruned at end if delayed top. If not pruned? We do end prune. Good.

Potential issue: delayed removal classification for num <= -lo[0], where lo top live after prune. But what if the actual window element to remove is currently in hi despite num <= lo top due to duplicates? Example lo [2,2], hi [2], remove 2. classify lo (<=2), sl--. There are stale count. It doesn't matter. But if num <= lo top and actually the removed instance in hi with same value, size_lo-- and size_hi unchanged, target balance may move. Should be okay.

Need correctness proof maybe not final, code only.

Let's test complex: window [1,1,1], k=2.
Initial add first 1 lo; second 1 <= lo top -> lo (now lo [ -1,-1], sl2), rebalance total2 target1: sl>target prune_lo top x=1 no delayed pop to hi push1 sh1. lo [ -1], hi[1]. median1.
Slide remove 1: lo top1, remove <=1 sl1 delayed1. rebalance total1 target1: sl=1. end prune_lo: top x=1 delayed -> pop, del; lo empty? Wait there was lo actual one live? initial after rebalance lo had one live 1; hi one live 1. Remove marked one 1 delayed. We decrement sl ->0? Wait sl was1, after mark sl=0. total=1 (hi live). target=(1+1)//2=1. sl<target. prune_hi top1 no delayed? but delayed[1] currently? At mark delayed[1]=1. But top of hi is 1. prune_hi in sl<target: c=1 -> pop hi stale? This pops the only live hi 1 because delayed count for value 1, but we intended remove one 1. There is no actual lo live? Let's simulate carefully: Initial after rebalance: lo actual [-1] live, hi actual [1] live. sl=1 sh=1. Remove value 1. If classify as lo (since <=1): delayed[1]=1; sl=0. Rebalance total=1 target=1. while sl<target: prune_hi: hi top 1, delayed[1]=1 => pop hi, delayed delete. Now hi empty, sh remains 1? But sh effective should be 1? Wait effective sizes: We decremented lo to0, hi remains1. But prune_hi popped hi top and decremented delayed count, but did not adjust sh. However that hi top was conceptually live, not stale, but delayed count was intended for lo top. By popping hi, we removed a live element from heap without adjusting size. This creates discrepancy: effective sizes sl=0, sh=1, but actual hi empty, lo actual stale [-1] with delayed deleted? lo top stale? delayed deleted so lo top considered live by prune_lo but we didn't pop. lo heap [-1] actual, but size_lo=0. Bad. But is this scenario possible with standard lazy algorithm? Standard make_balance first removes from heap top if delayed top, but with value duplicates across heaps, using value-based delayed can indeed pop a different instance. However because values equal, maybe effective sizes and actual heaps? After popping hi due to delayed count, there remains lo stale? delayed deleted so lo stale now considered live, but sl=0. We should instead not pop hi if it's not the removed instance. But since value equal, popping hi and leaving lo live would effectively remove hi's value and keep lo's, sizes should adjust? We didn't adjust sh. Standard algorithm's sizes count effective, and delayed only marks value, but if you pop a value from a heap not whose size was decremented, sizes become inconsistent. How does standard handle this? They only call make_balance which first while large and delayed top: pop from large; if top delayed, they remove from delayed but do not change size? But they only pop top if delayed count for that value, regardless of which side was decremented. It seems sizes can mismatch? Let's revisit standard implementation from Leetcode 480. They have sizes `small` and `large`, delayed dict. In `make_balance`: first if small_top delayed? They remove from small and delayed-- but do not change size_small because size_small was already adjusted at remove time. If large top delayed? They do not pop large in make_balance? Actually make_balance calls `prune_top_small` and `prune_top_large` only after moving? Let's recall:
```
def make_balance():
    # move elements from large to small or small to large
    if size_small == size_large + 2: ...
    if size_small < size_large: move large_top to small ...
    prune_top_small(); prune_top_large()
```
prune only pops top if delayed. But if delayed value belongs to small size, and large top equal value, prune_top_large could pop large top. This might cause size mismatch? However standard uses heap elements not values, delayed dict value counts; removal classification by value <= small_top. If equal, if removed element was in large but value <= small_top? They still decrement size_small. Delayed count one. Prune_top_large sees delayed value equal and pops large top. Does size_large remain unchanged? But then after moving, final sizes? Maybe invariant allows heap entry popped in prune_top_large without size adjustment because the size decrease for removal was applied to size_small, not large; popping large entry reduces actual large but size_large still counts an element that no longer exists. Then later moving from small to large may push to large, size_large++ etc. Actual large may have too many? Hmm.

Let's simulate standard with [1,1,1] k=2 remove one 1. If it pops large stale, size_small=0,size_large=1, small heap [stale 1], large heap []. median after add? Next add 1: add compares to small_top after prune? If small top considered live (delayed deleted) - small heap has 1. But size_small=0. add 1 <= top => push small, size_small=1, total size counts 2 (0+1?) Wait size_large=1 (stale effective), small=1, total effective 2 but actual heaps: small [1 live?], large empty. Window should [1,1]. Median if even: small top 1, large top? prune large empty -> issue. Then rebalance sizes target for total=2 is 1, no move. large empty. Median fails.

Does standard add after remove call make_balance after add? If add to small when small size 0 but small heap has stale? It may compare to stale? But after prune at end, large top? Let's trace if standard maybe `prune_top_small` in remove before classification? If top of small not delayed? In our case before remove small top 1 live. After marking delayed, small top is delayed. If remove function if num == small_top? They might call prune_top_small to actually pop delayed small top before moving? Standard `remove` increments delayed and adjusts sizes, then `make_balance`. `make_balance` starts by moving if needed? It doesn't immediately prune small? If make_balance sees size_small < size_large, it prunes large top before moving large to small. In our sizes after remove: size_small=0,size_large=1. It moves from large to small: before moving, prune_top_large. large top 1 has delayed count, so prune_top_large pops it and delayed--. Then large empty, but size_large still 1. It then tries to move large top? If large empty, but size_large>0. Standard code assumes large not empty if size_large>0. Here it fails. But maybe before moving, they call `prune_top_small` and because small top delayed, they pop it. If they first prune small, then delayed-- and size_small remains0; small empty. Then sizes small0 large1, target move large to small: prune_large: large top 1 but delayed now 0 (because small pop consumed count). Then move large live to small, size_large0,size_small1. This works. Thus order of pruning matters: prune small before large when sizes indicate small has stale? In our remove, small top delayed. So need prune_lo before using classification and before moving hi->lo. If `rebalance` starts with prune_lo if sl<sh? Let's design robust.

Problem: value-based delayed counts can be consumed by a heap not whose size was decremented. Need ensure if size_lo was decremented and lo top has that value, prune_lo before moving from hi to lo so the delayed count is consumed by lo. Similarly if size_hi was decremented and hi top has value, prune_hi before moving from lo to hi. More generally before any move, prune the heap that had size decremented / contains stale top? But we don't know which heap removal classified. We can simply at start of rebalance prune both tops? In earlier we pruned within moves. If we do `prune_lo(); prune_hi()` at start of rebalance, then stale top values will be consumed first. This avoids moving hi stale when lo stale exists with same delayed count. But if top stale in hi and removal classified hi, prune_hi consumes. Good. If top stale in lo but removal classified hi? Could delayed count be intended for hi but prune_lo pops lo equal; sizes? If removal decremented sh, hi top equal stale, prune_lo would consume count incorrectly if lo top also equal but live. Need consider. Suppose lo has live x, hi has live x. Remove x classified hi (because x > lo top? impossible if lo top x then not >. Could be lo top smaller? If lo max < x, then removal x classified hi. If there is stale top in lo equal to x, lo top live? For lo max smaller? If lo top live smaller than x, then lo cannot have x because lo max live is top. So no live lo x. If stale lo x, then top stale x > live lo max? Actually stale top can be greater than live elements, so lo top stale x. Removal x classified hi if x > current live max? But lo top stale x, live max lower. Before classification, if we don't prune stale lo, comparison x <= stale_top x true -> would classify lo, not hi. If we prune at start, lo top live lower, compare x > live_max -> classify hi. Then delayed count intended hi. Rebalance start prune_lo and prune_hi: lo top live lower no stale, hi top stale x, prune_hi consumes count. Good. If we prune_lo first, it doesn't consume because stale lo gone? Actually stale lo consumed earlier before classification. Good.

Thus rebalance should prune top stale entries before sizes adjustment and median. But if both tops have delayed values and removal classification one side, consuming count at one top could be wrong if both stale? If both heaps top same value with delayed counts? Delayed count total. Prune_lo then prune_hi will consume from lo first. If removal intended hi but lo has stale same value (which would have been top and not pruned before classification?) If both tops stale equal, delayed count >=? Need ensure classification before pruning? Add/remove compare with top live? We should prune at end of previous rebalance, so tops live before removal. During remove we mark delayed, not pop. Then rebalance start prune_lo/prune_hi. If removal decremented hi and delayed value x, but lo top stale? Lo top was live before removal. Could a live lo value x be equal to removed x while removal classified hi? If lo top live x and removed x > lo top? No, x <= lo top, so classified lo. If removal classified hi, lo top live < x, so no live lo x. So stale lo with x would have to be not top? Stale equal x greater than live max? Then top before removal would be stale x, but we pruned previous, so no. Thus okay.

Need ensure after initial window and after each slide, prune tops. In rebalance start prune both, end prune both maybe redundant but needed after moving (pushed live elements, no new stale except moving popped stale? Moving live top creates new top in source heap which might be stale; e.g. after moving hi top live to lo, hi new top may be stale. Need prune_hi after moving? If sizes still need move, loop prunes. If sizes done, new stale top in hi could remain. Median needs hi top live. So end prune both or after moves. Could use while loops for target that always prune top before pop, so new stale top will be pruned next iteration if same heap needed. But if target reached and new top stale in same heap but no need to pop, median needs prune. So do end prune.

Alternative rebalance:
```
def rebalance():
  nonlocal sl,sh
  prune_lo(); prune_hi()
  total=sl+sh; target=(total+1)//2
  if sl > target:
    while sl > target:
       # top of lo live due to prune? after pop new top may be stale, prune again before next loop if needed.
       x=-pop(lo); sl-=1; push(hi,x); sh+=1
       if sl > target: prune_lo(); prune_hi() # maybe before moving
  elif sl < target:
    while sl < target:
       x=pop(hi); sh-=1; push(lo,-x); sl+=1
       if sl < target: prune_lo(); prune_hi()
  prune_lo(); prune_hi()
```
But need ensure top of lo live before pop when sl>target. Could prune_lo at loop condition. Similarly hi.

Need also prune both at start to avoid size mismatch. Good.

Add function: before compare, lo top live? At previous rebalance end pruned, so yes. Remove: also lo top live. Good.

Potential issue in remove when total size maybe 0? not.

Let's test [1,1,1] k=2 with corrected rebalance start prune both (tops live). Remove: mark delayed, sl=0 sh=1. rebalance start prune_lo: lo top x=1 delayed -> pop lo stale del delayed. sh remains1, sl0. prune_hi: top 1 delayed? no count, live. total=1 target=1 sl<target; while sl<target: pop hi top 1 sh0 push lo -1 sl1. End prune. actual lo live 1. Good. Add next 1: lo top 1, push hi? if add 1 <= lo top -> push lo, sl2; rebalance start prune no stale; total2 target1; sl>target pop lo to hi, sl1 sh1. Good.

Need ensure `prune_lo` doesn't adjust sizes; but if it pops stale whose size was decremented from hi? Could happen if delayed count intended hi but lo top stale equal. As argued not if classification correct? Need maybe use separate delayed counts per heap to be safe? Could maintain two delayed dicts `delayed_lo`, `delayed_hi` based on removal classification. Then prune exact heap. This avoids cross-heap value ambiguity. But if removal classification is arbitrary for duplicates equal across heaps, still size side chosen. Mark delayed in that heap? But if the actual value instance in that heap doesn't exist? Since duplicate values indistinguishable; if we say it's in lo, but actual removed element may be in hi. We can maintain delayed counts per side, and when marking removal as lo, we assume there is a lo occurrence; there are total counts maybe lo count and hi count. If removal value x but all occurrences in hi, lo count of x=0. Marking delayed_lo[x] then prune_lo may not find top x; delayed_lo[x] remains and size_lo decreased. Could cause inconsistency because size_lo decreased without actual stale in lo. But if lo count x=0, but value x > lo top, classification hi; if lo count x=0 but value equal? If value equals lo top, lo count x>0 (because top x live) unless stale? So classification lo only when value <= live lo max; if value equal, lo count of value may be >0? If there are multiple equal, yes. If value < lo max, lo count of value may be 0 (e.g. lo values [10,9], hi [100], remove 5? But 5 cannot be in window if value 5 not in lo/hi? It must be somewhere. If value <= lo top but actual occurrence may be in hi? Example lo top 10, hi contains 10? Remove 10? Classification lo, lo count x>0 (top 10). If value 8 <=10 but actual occurrence in hi? hi values all >= lo top? Ordering invariant: hi elements >= all lo. If lo top 10, hi min >=10. So value 8 cannot be in hi. Thus classification by <= live lo top ensures if value in window and value <= lo top, it must be in lo? If duplicates equal could also be in hi if value=lo top. But there is lo occurrence if top=lo max. If value<lo top, cannot be hi. Thus marking delayed_lo is safe for removal if classification lo. For removal hi, value > live lo max, cannot be lo? If value equal to lo top? not >. If value > lo top, no lo occurrence. Good. Thus per-heap delayed could be precise. But if duplicates equal, and classification lo arbitrary, there is at least one lo occurrence; marking lo delayed is safe. Great. Per-heap delayed avoids cross popping. Then sizes match. Standard value-based works if prune order careful. Per-heap maybe simpler robust? Need know heap for move: when moving element from lo to hi, if it was delayed? We only move live top. If we later remove that value and classify new side? Need delayed dicts keyed by value; when moving value x from lo to hi, there may be pending delayed_lo[x] for stale lo elements that are not top? If we push x to hi, delayed_lo counts stale in lo, delayed_hi for hi removals. If we remove x in future, classification based on live top may mark hi. Could pending delayed_lo[x] later pop stale lo x; okay. Need when moving x from lo to hi, if there is delayed_lo[x] not consumed because x not top? Actually if x is live top moved, no pending delayed_lo for this instance. But there might be pending delayed_lo[x] for other stale x below top? Since max heap negative, if stale x value same as live top? If delayed_lo[x]>0 and top live x? prune_lo should have consumed top stale before moving. Could be stale x below live larger top. That's okay; pending count remains. When we move live x to hi, total live lo x decreases; pending delayed_lo x still counts a stale lo x. Fine. If we later remove live hi x, mark delayed_hi. Prune_hi consumes hi. No conflict. Good.

Could implement delayed_lo/delayed_hi dicts. But more memory/lookups. Value-based one dict simpler but needs prune order. Per-heap may make rebalance start prune both and no cross issue. But classification: removal decrements size_lo or hi and increments respective delayed. Then pruning only that heap can pop stale top; if top not that value, stale below remains. Sizes: size decreased, actual heap may still contain stale entry somewhere; when it reaches top it'll pop. Good. If stale value never reaches top? It will eventually after all larger live elements removed/moved? For maxheap, stale x below larger elements; if larger elements removed, x may become top and pruned. At end of sliding, total effective counts correct. Good.

Potential problem: If we move elements between heaps, a stale entry's side can change? Lazy deletion entries are in original heap; if we move live elements only, stale stays. Good.

Which to implement? Per-heap delayed maybe more code but robust and can use value as key. Need prune_lo/prune_hi each with own dict. When marking removal in `delayed_lo` or `delayed_hi`. For moving, if source top has pending delayed in source dict, prune. End prune. Insertion compare with `-lo[0]` live. Good.

Let's design with two delayed dicts:
```
delayed_lo = {}; delayed_hi = {}
def prune_lo():
  while lo:
    x = -lo[0]
    c = delayed_lo.get(x)
    if c is not None:
      pop(lo)
      if c == 1: del delayed_lo[x]
      else: delayed_lo[x] = c-1
    else: break
def prune_hi():
  while hi:
    x = hi[0]
    c = delayed_hi.get(x)
    if c is not None: ... pop(hi)
```
But `get` returns None; if count can be None no. If count 0 no.

add:
```
if not lo or x <= -lo[0]:
  heappush(lo,-x); sl +=1
else: heappush(hi,x); sh +=1
rebalance()
```
remove:
```
if x <= -lo[0]: # lo not empty? If removing from total >0, lo not empty? For window size k>0. But if total 0 no remove. Could guard.
  sl -=1; delayed_lo[x] = delayed_lo.get(x,0)+1
else:
  sh -=1; delayed_hi[x] = delayed_hi.get(x,0)+1
rebalance()
```
Need lo top live before remove. After rebalance end prunes. Good.

rebalance:
```
def rebalance():
  nonlocal sl, sh
  prune_lo(); prune_hi()
  total = sl+sh
  target = (total+1)//2
  while sl < target:
    # ensure hi top live
    prune_hi()
    # hi must not be empty
    x = pop(hi); sh -=1
    heappush(lo, -x); sl +=1
    # continue if needed
    # no need prune_lo? if sl still<target, need prune_hi again; also lo stale top could be but not moving from lo. For median end prune.
  while sl > target:
    prune_lo()
    x = -pop(lo); sl -=1
    heappush(hi, x); sh +=1
  prune_lo(); prune_hi()
```
But if while sl<target, hi might have stale top not live; prune_hi. If after popping live hi, hi new top stale, next iteration prune_hi. Good. But if after popping hi, lo new top stale? We don't prune_lo until end or if moving from lo in while sl>target. If total target and median, end prune. Good.

Need ensure when `while sl < target`, if hi empty due to delayed stale and size_hi >0? With per-heap delayed, size_hi counts live; if hi heap all stale but size_hi>0, prune_hi will pop stale but not adjust size; then hi could become empty but size_hi still >0, impossible? Because if all heap entries stale and size_hi>0, then there are live entries counted but not in heap? Not possible with per-heap delayed because live entries never popped except when moved; if moved, size adjusted. Stale entries are only from removals size adjusted. If heap empty, size should be 0. If size_hi>0, heap length >= size_hi. So prune_hi won't empty if size_hi>0. Good.

Potential ordering invariant with per-heap: after removals and rebalance, all lo <= hi. Lazy stale entries can violate but prune tops only. Could a stale entry in lo (removed) be smaller/larger and block? Stale removed values should not affect ordering if not live. But if stale in hi with value less than live lo top? It was once in hi, so value >= all live lo at time of insertion/removal? Removal doesn't change lo. But after moving elements, hi stale value could be less than current lo top? Example hi stale 5, lo live 6? Could that happen? If stale hi value inserted when hi min <=? Actually hi values always >= lo values at insertion. Later lo may receive larger element from hi, causing lo top > some stale hi? Suppose hi has live 5 and stale? If lo moves? Need lazy deletion can break invariant with stale tops only? Standard ensures if top live, invariant for live elements holds; stale below may be out-of-order but not top? Need median correctness relies top live of each heap represent lower/upper halves. If stale top pruned, okay. Stale below can be out-of-order but not affecting top? Could stale below become top and violate? prune handles if delayed. Stale not delayed? All removed marked. Good.

Alternative two-heaps without lazy deletion using counts? Hard.

Need think about performance of two heaps with nested functions. Could be okay. But maybe Fenwick simpler and less bug? Need final code likely evaluated for performance. Need decide. Let's benchmark mentally. 200k, k=1000. Heaps: For each slide remove+add+rebalance. Rebalance start prune both: each call checks top and maybe while delayed? Most no. Then target loops: Usually after remove then add? Let's choose slide: remove outgoing then add incoming, rebalance each time. That means two rebalances per slide. For each remove rebalance target for total k-1 (999) maybe move one? Then add rebalance target k (1000) maybe move one? Could cause more moves. If we instead update outgoing/incoming by removing then adding and call rebalance once? Need update sizes then rebalance once. For slide: mark removal in delayed and size-- then add value and size++ then rebalance once. This avoids intermediate rebalance and extra moves. Yes better. For initial window, can add all then rebalance once? Add function rebalances each addition. For slide, use custom update: remove outgoing mark/delay/size-- (without rebalance), add incoming push/size++, then rebalance once. Need compare incoming with live lo top before removal? If we remove first without pruning? lo top live from previous. Could mark removal. Then add new: compare with lo top (still maybe stale if removed top? If outgoing was lo top, lo[0] still stale, not live; adding compares to stale top incorrectly. Need handle. Could remove then prune? Or add before remove? If add before remove, compare with live lo top from previous; then mark removal; then rebalance. This might be better. But adding when total k+1 target maybe? Could still work. If outgoing was lo top, adding new compares to live top (still live until mark removal after? If remove after add, top live during add). Then mark removal. Then rebalance once. So slide: add incoming (with size++ rebalanced? no, use push only?), then mark outgoing removal, then rebalance once. But sizes total k+1; target k lower half ceil(k/2). Then mark removal total k; rebalance target ceil(k/2). However add push might disrupt balance before removal but okay because final sizes adjusted. Need add comparison with live lo top. If we do not call rebalance after push, lo top may not be live? It is live from previous plus push; if push to lo, lo top could be new or old, live. If push to hi, top unchanged. So okay. Then mark outgoing. If outgoing classification uses lo top; after push, lo top may have changed if outgoing not removed. Is classification correct for outgoing in the multiset after adding? It doesn't matter which side value conceptually belongs to in the combined k+1 set; removing any equal value side okay. Need sizes after mark decremented. Then rebalance to k. Should be okay.

Slide combined:
```
# add new
x = nums[i]
if not lo or x <= -lo[0]:
    push(lo, -x); sl += 1
else:
    push(hi, x); sh += 1
# remove old
old = nums[i-k]
if old <= -lo[0]:
    sl -= 1; delayed_lo[old]=...
else:
    sh -= 1; delayed_hi[old]=...
rebalance()
# median
```
But after push, if x goes to lo, -lo[0] may become x. For old removal classification, if old <= new top, classify lo. Could old actually be in hi? Ordering invariant before push: old <= live lo top? For values > lo top are in hi. If new top x may be larger than old, then old <= x, classify lo. If old was in hi (old > old_lo_top) and x > old, then old <= new top, classify lo though old might be in hi. Is that allowed with per-heap delayed? Marking lo delayed when no lo occurrence? But there may not be lo occurrence of old. Example before: lo top 5, hi has 10. Add 20 to hi? Actually x=20 > lo top so hi, lo top remains 5. old 10 in hi, old<=lo top? 10<=5 false -> hi. If x=7? x>5 hi, lo top remains5. old 10 false. If x=3 push lo, lo top becomes5 (max old live 5) not new. If x=10 push hi? x=10 >5 hi, lo top5, old10 false. If x=100 and lo top5. old10 false. If x smaller than old but push hi? x=6 >5, lo top5. old10 false. If x > lo top and > old? push hi, lo top5, old10 false. So classification old as lo only if old <= current lo top. Current lo top after add could be increased only if new x <= old lo top? Wait to push to lo condition x <= lo top. Then new lo top may be max(old lo top, x)=old lo top (since x <= top). So lo top doesn't increase on push to lo. Push to hi doesn't affect lo top. Thus lo top after add is same as before add (unless lo empty initial). Therefore classification old using lo top after add equals before add, consistent with live multiset before add. Good.

But after add, if x to lo and x == lo top? top unchanged. Good. Then remove mark uses lo top live. If outgoing was live lo top and removal classified lo, mark delayed; then rebalance start prune_lo consumes top. Good.

This combined slide reduces rebalance calls. Need initial building. Could add each with rebalance for first k. But we could build first window more efficiently by inserting all then rebalancing once? Need maintain lo/hi order. If we insert all without ordering, can partition initial window into lower/upper halves. Simpler: initialize by taking first k sorted? For two heaps, initial build can be optimized: take first window, sort it (k=1000) and assign lower half to lo, upper to hi. That ensures sizes target and order. Then no initial rebalance. This might be faster and robust. For k=1000, sort cost trivial. For large k maybe O(k log k) but okay. We can implement:
```
first = nums[:k]
first.sort()
mid = (k+1)//2
lo = [-x for x in reversed(first[:mid])]? Need max heap with negatives. lower half first[:mid] sorted ascending. To make maxheap, push negatives; heapify. hi = first[mid:]; heapify.
sl=mid; sh=k-mid
```
Need ensure if k=1 mid1 lo [first[0]], hi [].
For lower half, we want heap property max via negative. If first[:mid] ascending, negatives are descending? Example first [1,2], mid1? for k=3 first [1,2,3] mid2 lower [1,2], negatives [-1,-2]. heap min gives top -2? Actually heapify [-1,-2] yields top -2 (min), corresponding value 2, max. Good. For [1,2], heapify top -2. Fine. hi sorted ascending heap property already. Could use heapify directly.
But if duplicates okay. This avoids initial add/rebalance. Need ensure no lazy dict. Good.

For general k huge 200k, sort first 200k O(k log k) okay. But if k large and n large, sort 200k maybe okay. Or build with add O(k log k) similar. Sort simpler.

Now slides with combined add/remove and rebalance once. Need median after each window. For first window, median from lo/hi. Need maybe prune none. Then loop i from k to n-1:
- add nums[i] using current lo top live (after previous median, tops live if we prune in median/rebalance). Ensure after previous slide rebalance ends prune; median also maybe prune. Good.
- remove nums[i-k] using current lo top live? Wait we added new before removing. Lo top live? If new added to lo and it is smaller than old top, top remains old live; if new added to hi, top old. But if new added to lo and new > old top? Can't add to lo if new > lo top. If lo empty? not after first k. So top live. But what if new added to lo and old top is stale from previous? We prune at end, so no.
- rebalance once with total k after removal (since add size k+1, remove size k). Actually sizes total after add = k+1; after mark removal = k. Rebalance target (k+1)//2 constant. Good.
- median.

This combined method: Need careful if old removal is classified lo but we added new and lo top live. Mark delayed_lo. Then rebalance start prune_lo/prune_hi. It will prune stale top if any. Good.

Now correctness for combined with per-heap delayed.

Let's test scenarios.
Initial [1,2,3,4], k=2: sorted first mid1: lo [1], hi [2], median1.5.
Slide add2? Actually next num3: add 3 > lo top2? lo top? Wait lo has [ -1], top value1? For sorted first lower [1], hi [2]. lo top1. Add3>1 -> hi push3 (hi [2,3]) sh2. Remove1 <= lo top1 -> sl0 delayed_lo[1]. total sh2? sl0 sh2 total2. rebalance start prune_lo: top stale1 pop, delayed del. prune_hi no. total=2 target1. sl<target: prune_hi top2 pop -> hi [3], push lo -2 sl1. end prune lo -2 live, hi 3. median (2+3)/2.
Slide add4: lo top2, hi3. add4>2 hi [3,4] sh2. remove2 <= lo top2 sl0 delayed_lo2. rebalance start prune_lo top2 stale pop; hi top3 live. target1 move hi top3 to lo; lo3 hi4 median3.5. Good.

Test duplicates [1,1,1], k=2. Initial sorted [1,1], mid1 lo[1], hi[1]. median1.
Slide add third1: lo top1. add1 <=1 -> lo push, sl2 hi1. remove first1 <= lo top1? lo heap values: top max 1 (new or old). old=1; classify lo sl1 delayed_lo1. rebalance start prune_lo: top 1 delayed pop one. There are two lo entries (live? one live, one stale), pop stale, delayed0. sl currently1. hi live. total2 target1. sl==target. end prune. lo still one live1. median (1+1)/2. Good.

Test where remove value in hi but lo top stale? We prune previous. Good.

Need ensure after combined add before remove, sizes target may temporarily off but we don't call rebalance until after remove. Could adding to lo increase sl beyond target by >1? Since initial target ceil(k/2). After add total k+1, target for total would be ceil((k+1)/2). Sl could be target or target+1. For k even 2: initial target1. Add to lo => sl2 (target for total 3 is2, okay). Remove lo maybe sl1. Add to hi => sh2. Remove lo sl1 sh1. Good. k odd 3: initial target2. Add to lo => sl3 (total4 target2, could be one over). Remove hi or lo? If remove hi, sl3 sh1 total4; rebalance target2, move one lo->hi. If remove lo, sl2 sh1 total3 target2. okay. If add to hi, total4 target2 sl2 sh2, remove hi sh1 target for 3 is2 okay. Could sl be > target by 1 at most? Add one. Remove one may restore. Rebalance moves at most one? Maybe if add and remove both from same side could leave sl unchanged but total k; target same as initial, so no move. If add lo remove hi, sl+1 -> move lo->hi one. If add hi remove lo, sl-1 sh+1? target same, need move hi->lo one. Good. At most one move per slide if starting balanced. Nice. Our rebalance while handles.

Potential issue classification for remove after add when outgoing value equals lo top but actual outgoing may be in hi with equal value. Per-heap marking lo. There is at least one lo occurrence of value because lo top value x live. If outgoing equal x in hi, marking lo still okay as argued. Slides maintain sizes. Good.

Now performance with per-heap delayed. Each slide add push one heap O(log k). Remove mark dict. Rebalance: prune_lo, prune_hi O(top stale) maybe pops at most one? Could pop more if stale top from previous? But each stale popped once. Then if need move, one pop source + one push dest. So per slide ~1 push + maybe 1 pop + maybe 1 push = 2-3 heap ops. 200k*log1000 ~6M loops. Good.

Need code final no tests.

Let's refine rebalance with per-heap dicts and optimize local variables.

Option 1: Nested functions with closures; might be okay. But can make faster by inlining prune and rebalance inside loop? Let's consider.

Nested `prune_lo` and `prune_hi` called twice per slide; each function call overhead. Could inline prune in `rebalance`. `rebalance` called n-k times (199k). Function call overhead okay. Inside rebalance, while prune. `nonlocal sl, sh` in rebalance. Could be okay. To optimize, we can avoid nested remove/add functions; initial build then loop inline. Use local variables for heapq functions, dicts.

Could implement `sliding_median` with nested `rebalance` only, and inline prune code? Need rebalance for initial? initial sorted. In loop, after remove mark, call rebalance. Rebalance modifies sl, sh. Need nonlocal. Could also implement as inner function returning sl,sh? But assignment overhead.

Maybe use class? Not necessary.

Can we avoid rebalance function by writing code in loop? It will be verbose but faster. Need move if sl != target. Since starting balanced and add/remove changes sizes by at most one, after combined slide we know sl either target-1, target, target+1. Actually target = (k+1)//2 constant. Could rebalance manually with at most one move, plus prune stale top if sizes wrong. We can inline optimized special case. That may be significantly faster. Let's explore.

After initial: sl=target, sh=k-target.
Each slide:
1. Add new to lo/hi: if to lo sl +=1; else sh+=1.
2. Mark remove old: if classify lo sl -=1; else sh -=1; delayed side.
Total after mark = k. Target constant.
Size changes net: If add to lo and remove from lo: sl unchanged; if add lo remove hi: sl +1; if add hi remove lo: sl -1; add hi remove hi: sh unchanged (sl unchanged). So sl = target-1, target, or target+1. Thus rebalance only one move if sl > target or < target.

Need prune stale top before comparing remove? We need lo top live before remove classification. At end previous loop we need ensure lo top live. If we don't call prune every time, stale top could remain. But we can prune when necessary: after previous slide, if we moved elements, new source top may be stale. Need prune lo/hi top before next add/remove classification. Could maintain by calling a function that prunes tops. But maybe can combine: before comparing remove, prune lo? Actually add classification uses lo top. If lo top stale, add wrong. So we need ensure lo top live before add and remove. We could at start of each slide (or after previous rebalance) prune lo and hi tops if delayed. Instead of general rebalance, implement loop with `while lo and stale: pop` and same hi at appropriate points. Since stale top only matters for classification/median. We can prune at end of previous slide. We can do after rebalance: `prune_lo_top` and `prune_hi_top`. Inline.

For move step:
- If sl > target: need move top from lo to hi. Must ensure lo top live; if stale, pop it first (and delayed--). But if stale top exists, should we pop it before checking sl? Yes stale top may affect lo top. However if sl > target due to add/remove, and stale top exists, popping stale does not change sl. Could change heap top. Need ensure live top before moving. If top stale, we pop and then if sl still > target, move live top. Similarly if sl < target move hi top.
- After moving, source new top may be stale; but if no further moves, need prune source top for next iteration and median? If moving from lo to hi because sl>target, source lo new top may be stale; target achieved, no more pop. Need prune_lo top for median and next classification. Could pop stale top in a small loop. Also destination hi top may be stale? We moved live top, but hi may already have stale top from before. We should prune_hi at end too. Similarly move hi->lo.

Thus after each slide, we can do:
```
target = (k+1)//2
# after add/remove sizes target±1/0
if sl > target:
    # pop stale tops until live top; actually while sl > target and lo top stale? Stale top count may be multiple.
    while lo:
        x = -lo[0]
        c = delayed_lo.get(x)
        if c is not None:
            pop(lo); update dict
        else: break
    # now move live top if sl>target
    x = -pop(lo); sl-=1; push(hi,x); sh+=1
elif sl < target:
    # prune hi top until live
    while hi:
       x=hi[0]; c=delayed_hi.get(x); if ... pop ... else break
    x=pop(hi); sh-=1; push(lo,-x); sl+=1
# end prune top lo if stale; top hi if stale
while lo and delayed_lo.get(-lo[0]) ... pop
while hi and delayed_hi.get(hi[0]) ... pop
```
But what if sl==target but lo top stale? Need prune lo end. If lo top stale, pop it; no size adjust. Could after popping stale, lo size still target, heap maybe empty? If size_lo target>0, heap should have live entries after stale popped. But if target=0 (k=1? target1 not 0; after initial k>=1; total k, target >=1 for k odd? For k=1 target1. So lo nonempty. But for intermediate? no.) If k even target k/2, sh same; lo nonempty unless k=0 invalid. So okay.
What if sl<target and hi top stale multiple. Prune hi while stale top; if after pruning all hi heap empty but size_hi? Could happen if target >0 but hi all stale and size_hi? Not if size_hi >0. If size_hi=0 and sl<target? For k even target=k/2, sl could target-1, hi size = k-target = target, so hi >0. If sl<target and target maybe >0. hi live count = k - sl > k - (target-1) = if k even target -> target+1? positive. So hi nonempty. Good.

Need ensure `delayed_lo.get(x)` with x=0.0 returns 0? Counts never 0 stored. Could use `if c:` but c can be >0; None false. Use `c = d.get(x)`; `if c is not None:` because if c=0 impossible but if c=0 then false and stale not popped; we delete zeros so okay. Using `if c:` faster? If count can be 0 not. Use `if c:`; if c is None false; if count >0 true. Good. But if value x maybe not in dict, get None. For floats? okay.

Dict update inline:
```
c = delayed_lo.get(x)
if c:
    heappop(lo)
    if c == 1: del delayed_lo[x]
    else: delayed_lo[x] = c - 1
```
But if c=0? no.
Need be careful: `while lo: x = -lo[0]; c = delayed_lo.get(x); if c: ... else: break`. Good.

When marking removal: `delayed_lo[old] = delayed_lo.get(old, 0) + 1`. If old key exists with count, update. Could use `delayed_lo[old] = delayed_lo.get(old, 0) + 1`. For speed local `dlo = delayed_lo`, `dhi = delayed_hi`.

Need maybe optimize pruning after move. Could write small helper macro? Python no. Could define `def clean_lo(): nonlocal ...`? But function calls maybe okay. Since 200k slides, end prune functions called twice, maybe overhead. Inline while loops duplicate code. Could make nested function for code clarity; performance maybe okay. But requirement under 2s. Need ensure speed. Could write inline but verbose. Let's design final code with helper functions? Maybe still okay. But to be safe, inline critical loop. However code length okay.

Potential bug: If after mark removal sl>target, before moving lo top stale. Prune stale top may pop multiple. But if pop stale top, `sl` unchanged. Could after popping stale, `sl` still > target but lo heap may now top stale too. while handles. After moving live top, source heap may have stale top; end prune handles. But if sl>target and stale top in lo, and stale top value not delayed? no. Good.

What if after mark removal sl>target but there are stale entries in hi and hi top stale; moving lo->hi to hi with stale top? Does that matter? Destination hi heap may have stale top before insertion; pushing live x may result heap top? Min heap, stale top could be smaller than x. Then hi top stale, but median needs prune_hi end. We end prune_hi. Good. For next slide hi top live. But what about ordering invariant? If hi top stale, before prune it could be less than lo top, but it's stale; after prune, hi top live >= lo top? Should hold.

What if after mark removal sl<target, hi top stale; we prune hi before moving. Good.

Need consider adding new before removing. Could new value be less than lo top and pushed to lo, but lo top stale from previous not pruned? We end prune previous, so top live. Good.

Need consider remove old: we classify using lo top after add. If new pushed to lo, lo top unchanged if new <= old top, so live. If old top value had delayed_lo count pending below top? Classification okay. Mark delayed side. Then rebalance prune maybe. Good.

Need median after rebalance/prune: If k even, `lo_top = -lo[0]`, `hi_top = hi[0]`. Need ensure hi nonempty. For k even target=k/2, sh=target >0. For k odd hi may be nonempty except k=1? k odd >1 has sh=(k-1)//2 >0; but median odd uses lo only. For k=1 hi empty. For even median need hi top live after prune. Good.

Could return floats. For even, `(float(-lo[0]) + float(hi[0])) / 2.0`; using ints yields float. But if lo/hi values are Decimal? list[float] so float. For odd, `float(-lo[0])`.

Now initial sorted build: For k maybe large; `window = nums[:k]; window.sort()` copies. Need lower half length `lo_len = (k+1)//2`.
```
lo = [-x for x in reversed(window[:lo_len])] ?
```
If `window[:lo_len]` ascending. To make maxheap, need negatives. `heapify` on `[-x for x in window[:lo_len]]` works regardless order. Use list comprehension then heapify. For hi, `hi = window[lo_len:]` already sorted ascending, heap property holds but heapify okay O(k). Could skip heapify hi since sorted list is a valid heap? A sorted ascending list is a valid min-heap: parent <= children yes. So hi = window[lo_len:] valid. For lo negatives: If lower half sorted ascending [a0,a1], negatives [-a0,-a1] descending? Example lower [1,2] neg [-1,-2]. Is [-1,-2] a valid min-heap? Parent -1 <= child -2? false. So need heapify. Could instead `lo = [-x for x in reversed(window[:lo_len])]`; reversed gives descending [2,1], negatives [-2,-1], parent -2 <= -1 true, valid min-heap. For length >2, need check. If lower half descending ascending? lower half sorted ascending; reversed is descending values; negatives ascending values? Example lower [1,2,3], reversed [3,2,1], negatives [-3,-2,-1]. Min-heap: parent -3 <= children -2,-1 true; child -2 <=? okay. This is a valid min-heap because it's sorted ascending. So `lo = [-x for x in reversed(window[:lo_len])]` is sorted ascending negatives and valid heap. Great no heapify. Or use `heapify` simpler. Use `lo = [-x for x in reversed(window[:lo_len])]`; hi sorted ascending valid heap. No need import heapify? For moving push/pop need heapq. Need maybe `from heapq import heappush, heappop`. Good. But if we don't heapify, initial list valid. For `hi = window[lo_len:]` sorted ascending valid min-heap. Good. But if lower half reversed negatives sorted ascending: values descending, negatives ascending. yes.

Need if `lo_len` = 0? k>=1 so lo_len>=1. For k=1, window[:1] reversed, lo [-val], hi [] (slice empty). Good.

Now loop. Let's write with helper clean functions? To reduce code repetition, maybe define nested clean_lo/clean_hi. But final code should be efficient. Could write small inline function using local variables? Let's estimate function call overhead vs code duplication. 200k slides * maybe 2 clean calls * plus move prune. If function call overhead ~100ns? Actually Python function call ~80-150 ns? No, ~100ns? Maybe ~0.1 micro? 400k calls ~0.04s. Not big. But closures nonlocal maybe. Could keep helpers for clarity.

But nested `clean_lo` uses `lo`, `delayed_lo`, `heappop`, no nonlocal except modifying dict. It doesn't modify sl/sh. Good. `rebalance` modifies sl/sh. Could define `clean_lo` and call. Performance fine. However using `nonlocal sl, sh` in `rebalance`; if inlined not. Maybe final clarity with helpers and still fast enough. But if using Fenwick no heap bugs. Need choose final solution likely expected. We need be correct. Let's test two-heap edge cases thoroughly.

Edge cases:
- k=1. Initial target=1. Loop for i=1..n-1:
  add num: if num <= lo_top? lo top current. If add to lo, sl=2, sh0. Remove old: if old <= lo_top? Note lo top after add could be max(old,new) if new > old? Wait add to lo only if new <= current lo top old (since lo top old). If new <= old, add lo; lo heap [old stale? live? new], top old. Remove old classify lo sl=1 delayed_lo[old]. Rebalance sl==target. End prune_lo: top old stale pop. lo top new. median new.
  If new > old: add to hi, sl=1, sh=1. Remove old classify lo (old <= lo top old) sl=0 delayed_lo[old]. Rebalance sl<target: prune_hi? hi top new. prune_lo? start maybe clean_lo? Our rebalance logic: if sl<target, prune hi top live. pop hi new to lo sl1 sh0. end prune_lo: top old stale? delayed_lo old=1; lo heap has stale old and new? We pushed new to lo; heap top max(old,new)=old stale. clean_lo pops stale. lo top new. median new. Good. But note after add to hi, hi [new]; after remove mark, sl0; rebalance sl<target; we prune_hi before moving. Good. Then end prune_lo handles stale old. Fine.
  What if new > old and old stale top? previous pruned. Good.

- k=2, target=1. Initial lower one upper one.
Slide where add lo remove lo net sl=1; end prune. Example [1,2,3]? done.
Slide where add hi remove lo move hi->lo. Need ensure old top? If old in lo top. Example [1,2], add3 hi, remove1 lo; sl0 sh2, sl<target, prune_hi? hi heap [2,3], top2 live; move2 to lo; lo had stale1? heap [-1, -2]? top stale1 (max) because -1 < -2? Wait min heap negative top most negative = max value. If lo heap has stale -1 and pushed -2, top -2? Actually values 1 and 2, negatives -1,-2; heap top -2 -> value2. If stale value1 and live value2, stale is not top because live larger. If old=2? Example [2,3], add4 hi, remove2 lo. old top lo value2; after mark stale -2? lo heap [-2] stale. move hi top3 to lo push -3. Heap [-3,-2]; top -3 value3. End prune_lo: top value3 not stale. Stale2 below remains. Good. Next slide lo top3. If old removal value? okay. Stale2 below might become top later; pruned when top. Good.

- Negative floats. Max heap via negative. Compare x <= -lo[0]. For x float. If x = -0.0? okay. Initial lower half with negatives. For value -inf, negative inf? -(-inf)=inf? Heap with inf okay? list[float] could include inf? If value inf, negative -inf. heap top min -inf corresponds value inf max. Comparisons okay. Median mean maybe inf. Fine. NaN? Not supported. If NaN in window, comparisons x <= top weird False, could go hi, median weird. Not handle. Problem likely finite.

- Very large floats causing overflow? median mean could overflow to inf; Python float handles inf.

- Empty nums: if n=0, k must <1? if k > len(nums) raises ValueError. If k=0 and nums empty? k<1 raises. Good.

Now think about target and lazy dict sizes with combined slide. Does `sl` and `sh` always effective live counts? We adjust on add and remove mark. We do not adjust on prune. Need ensure when moving, source top live. We clean source top before move. But what if source top live but there are stale entries above? We clean until live. Good. What if source size >0 but after cleaning heap empty? Shouldn't if live count positive. For sl>target, sl>target>=? target may be 0? If k=0 invalid. So sl positive. If sl>target but live entries positive. If heap top stale and we pop, eventually live. If all heap entries stale but sl>0? That would mean live count positive but no heap entries, impossible if live entries not popped. But if live entries have pending delayed? They are not delayed. Okay.

Need handle stale entry whose value is in dict but count maybe belongs to multiple stale. Clean pops one per count. If multiple stale equal at top, while c: pop, c--. If after one pop next same x, get again. Good.

Potential bug: Using single dict per heap but moving live elements changes heap where live value resides. Suppose we have pending delayed_lo[x] for stale lo x. Later we remove a live x from hi and mark delayed_hi[x]. Now clean_lo and clean_hi separately. Good.

Could delayed_lo dict have key x count but no stale lo entries (because moved live x? If removal classified lo but there were no lo occurrence? We argued not. But what if due to stale top not cleaned before classification? We clean end. Good). If it did, clean_lo might never pop; size_lo decreased without stale entry, heap has too many live? Could median wrong. But classification ensures side has an occurrence of value >=? Need prove: At remove time (after add), lo top live value Lmax, hi elements all >= Lmax? With stale entries, after end prune tops, but stale below could be less or greater? Invariant for live elements: all live lo <= all live hi. If removing value v with v <= Lmax, there is at least one live lo element? If v is in window and <= Lmax, could all live lo elements > v and v in hi? But hi elements >= Lmax >= v. If v < Lmax and hi elements >= Lmax, v cannot be in hi. If v = Lmax, there is live lo top = v, so lo occurrence. Thus okay. If v > Lmax, it cannot be in lo (all lo <= Lmax), so hi occurrence. Thus per-heap mark correct.

Need ensure live invariant after combined add before remove and after move. Initial sorted valid. Add: if new <= Lmax push lo; then new <= Lmax? If new <= Lmax, all lo <=? new could be less than some lo; okay, all lo still <= hi? hi min >= Lmax >= new. If new > Lmax push hi; then new >= Lmax, all lo <= new; but hi min maybe old hi min < new? old hi min >= Lmax; new could be smaller than old hi min? If new > Lmax but < old hi min, push hi; hi min becomes new, still >= Lmax. Invariant holds. Remove mark doesn't affect live. Move: if sl>target, pop max lo and push hi; lo new max <= moved value; hi min may become moved value, which is >= lo max; invariant holds. If sl<target, pop min hi push lo; hi new min >= moved; lo new max = moved <= hi new min; invariant holds. Prune removes stale; no effect. Good.

Now performance improvements.

Final code skeleton:
```
from heapq import heappush, heappop
from typing import List? Not needed.

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    target = (k + 1) // 2
    # init
    first = nums[:k]
    first.sort()
    lo = [-x for x in reversed(first[:target])]
    hi = first[target:]
    sl = target
    sh = k - target
    delayed_lo = {}
    delayed_hi = {}
    out = []
    push = heappush; pop = heappop
    dlo = delayed_lo; dhi = delayed_hi
    # helper clean? Maybe nested functions.
```
Need if `nums[:k]` copy; if n large k large, okay. But if k=n, loop none. first sorted.

Helper functions with nonlocal sl/sh? If we use functions, need declare nonlocal in rebalance. But maybe inline cleaner.

Option A: nested clean and rebalance. Let's write:
```
    def clean_lo():
        while lo:
            x = -lo[0]
            c = dlo.get(x)
            if c:
                pop(lo)
                if c == 1:
                    del dlo[x]
                else:
                    dlo[x] = c - 1
            else:
                break
    def clean_hi():
        while hi:
            x = hi[0]
            c = dhi.get(x)
            if c:
                pop(hi)
                if c == 1:
                    del dhi[x]
                else:
                    dhi[x] = c - 1
            else:
                break
    def rebalance():
        nonlocal sl, sh
        if sl > target:
            clean_lo()
            # after clean, if sl > target? if clean popped stale, sizes unchanged. Could sl still > target. move.
            # But if sl > target and lo empty? no.
            x = -pop(lo)
            sl -= 1
            push(hi, x)
            sh += 1
        elif sl < target:
            clean_hi()
            x = pop(hi)
            sh -= 1
            push(lo, -x)
            sl += 1
        clean_lo()
        clean_hi()
```
But what if clean_lo pops stale top and sl>target; after clean, maybe sl still > target. Move top. But what if clean_lo pops stale and sl>target but lo now has multiple stale below; move live top? clean_lo only top stale. If new top stale and sl still > target, we don't clean again before move, so we might pop stale as live and move it! Because clean_lo called once. Need clean until live. clean_lo function already while loop pops all stale tops. Good. After clean_lo returns, lo top live. Good.
But if clean_lo pops stale top and sl>target, could clean_lo empty heap while sl>target? Shouldn't. If heap empty and sl>target, `pop(lo)` fails. But impossible if live count positive and no stale? Wait if sl>target but live entries all not at top due to stale? clean_lo top stale popped until live. If heap length == stale entries and sl>0? impossible because live entries exist in heap. Good.
However if clean_lo pops stale entries and after popping, `sl` may equal target? clean_lo doesn't change sl, so if sl>target before clean, still >target. Need move. Good.
If clean_lo called and lo top stale count but there are multiple delayed entries for same x; while pops all top stale until live. Good.

But there is a subtle case: Suppose sl>target but lo top stale. clean_lo pops stale top, reducing heap size but not sl. There may be another stale top with value y; pops. Eventually top live. If after popping all stale, heap top live. But could it be that after popping stale, sl > target but heap top value is less than hi top? Invariant maybe broken? Should still be live. Move top. Good.

But `clean_lo` while loop could pop many stale entries, each O(log k). Each stale popped once total, okay.

For median after initial: Need maybe clean none. But for even k if hi sorted heap; okay. For odd, lo valid. If initial includes stale none.

Could call rebalance for first window? Not needed. But initial `lo` with negatives sorted ascending valid. Wait `lo = [-x for x in reversed(first[:target])]`: For first[:target] sorted ascending, reversed descending values. Example lower [1,2,3] -> values descending [3,2,1]; negatives [-3,-2,-1], sorted ascending, valid min heap. Good. hi sorted ascending valid. But if target=1, lo [-val]. Good. If target=0? k>=1. Good.

Potential issue using `reversed(first[:target])` creates slice and reversed; okay. Could `lo = [-x for x in first[:target]][::-1]?` No. Use list comprehension with reversed.

Loop:
```
    for i in range(k, n):
        new = nums[i]
        # clean? lo/hi tops live due to previous rebalance clean. But initial okay.
        if new <= -lo[0]:
            push(lo, -new)
            sl += 1
        else:
            push(hi, new)
            sh += 1
        old = nums[i-k]
        if old <= -lo[0]:
            sl -= 1
            dlo[old] = dlo.get(old, 0) + 1
        else:
            sh -= 1
            dhi[old] = dhi.get(old, 0) + 1
        rebalance()
        if k & 1:
            out.append(float(-lo[0]))
        else:
            out.append((-lo[0] + hi[0]) * 0.5)
```
Need after add, if lo top stale? previous clean. But what if lo top stale from `clean_lo` not called because `rebalance` sl==target and end clean? It calls clean. Good.

But in loop remove classification after add, we use `-lo[0]` twice. Add may push new to lo or hi. If lo top stale? no. If add to lo with new <= top, top unchanged; if new is NaN? ignore. Could store `lo_top = -lo[0]` after add for old comparison. But if add to lo with new exactly equal and heapify? top unchanged. If lo empty? not for k>=1. Use `lo_top = -lo[0]` before add? Since add doesn't change lo top as argued except if lo empty. But to be safe, after add. However if add to lo with new > lo top? impossible due condition. So lo top unchanged. Could store before add for speed:
```
top = -lo[0]
if new <= top: push lo... else push hi...
if old <= top: mark lo else hi
```
Is this correct if lo heap top after add could change if new > top? no because condition prevents. If condition `new <= top`, top remains max of top and new = top. If top stale? previous clean. Good. For k=1 with add new > top to hi, old classify with top old live. Good. So store `top = -lo[0]` once. This avoids two `-lo[0]`. If `lo[0]` is negative zero? -lo[0] fine.

What if after add to hi, old > top and marked hi. Good. If old == top and top live lo. Mark lo. Even if old equal top but actual old in hi duplicate? lo has top equal. okay.

Now rebalance clean uses `lo` and `hi` but also uses `target` local. Need `target` accessible. If nested rebalance uses clean functions, okay.

But if we inline rebalance to avoid function call, maybe:
```
        if sl > target:
            while lo:
                x = -lo[0]
                c = dlo.get(x)
                if c:
                    pop(lo)
                    ...
                else: break
            x = -pop(lo)
            sl -= 1
            push(hi, x)
            sh += 1
        elif sl < target:
            while hi: ...
            x = pop(hi)
            sh -= 1
            push(lo, -x)
            sl += 1
        # clean lo top
        while lo:
           x=-lo[0]; c=dlo.get(x); if c: pop... else break
        while hi:
           x=hi[0]; c=dhi.get(x); if c: pop... else break
```
This duplicates clean code but faster and no nonlocal. But need clean before move? For move sl>target, need clean lo; then move; then after move end clean lo (may have stale top) and hi. But if sl>target and lo top stale, clean lo pops stale; after popping stale, could sl still > target. Good. However after moving live top, lo may have stale top; end clean. But what if before move, lo top stale and after popping stale(s), `lo` becomes empty but `sl > target`? As said impossible. But to be defensive? Could if sl>target and lo empty, no. Could cause IndexError on hidden bug. Maybe use while loops with checks? But sizes should maintain. Could add `if sl > target:` and clean; if not lo: pass? Not needed but safe? If pass and no move, sl wrong. But no.

But wait: If `sl > target`, and lo top stale, clean_lo may pop stale top. But if clean_lo pops stale top that was the only element in lo heap, and sl (effective) > target but no live lo entries? Could that happen? Effective sl>0 but heap empty? impossible if live entries exist. But if live entries are in hi and sl>target? Then total? Suppose initial target1, after add/remove maybe sl2 but live lo entries? If we mark removal in hi and add to lo, live lo entries sl2. They are in heap. Good.

Need ensure `clean_lo` after move does not adjust sizes; if it pops stale, no size adjust. But if it pops stale that had been moved? Stale entries are never moved. Good.

However, if clean_lo before move pops stale top, and this stale top's delayed count might have been associated with removal classified lo. Good. If clean_lo before move pops multiple stale, size_lo remains effective. Good.

But consider case sl>target, lo top live, but hi top stale. We move lo top to hi, then end clean_hi pops stale top. Good. But before moving, hi top stale could be smaller than moved value? We don't need move from hi. Stale hi below can remain. End clean if top.

What about if sl<target, we clean_hi before moving. But what if lo top stale and sl<target? We don't clean lo before moving hi->lo. If lo top stale, adding live hi value to lo, after push, heap top may be stale (if stale value larger). End clean_lo will pop it. Could stale top value be larger and thus affect add comparison next slide? End clean fixes. Median even if lo stale top but sl<target move and end clean; okay. Could stale lo top with value > hi min violate before move? We don't use lo top for move (we move hi), so okay. But after push hi->lo, if stale lo top remains, heap top stale; clean pops. Good.

But classification for old in next iteration after end clean okay.

What about if `sl == target` but lo top stale and hi top live. We don't clean before median? End clean after rebalance (if no move) will clean. In inline code, after `if/elif` both false, we do end clean loops. Good. If sl>target move, end clean loops. Good.

Need include end clean after each slide. Could skip end clean if we plan to clean at beginning of next iteration. But median needs clean for hi in even. So end clean.

Can we use functions for clean to reduce code? The final answer can be verbose with inline. Need ensure not too slow. Inline code inside loop maybe fastest. But long and repetitive. Could define a local inline-like function `prune(heap, delayed)` with heap sign? But function call overhead and sign check. I think inline is acceptable.

Let's write inline carefully:
```
        if sl > target:
            # ensure max-heap top is live before moving it
            while lo:
                val = -lo[0]
                cnt = dlo.get(val)
                if cnt:
                    pop(lo)
                    if cnt == 1:
                        del dlo[val]
                    else:
                        dlo[val] = cnt - 1
                else:
                    break
            val = -pop(lo)
            sl -= 1
            push(hi, val)
            sh += 1
        elif sl < target:
            while hi:
                val = hi[0]
                cnt = dhi.get(val)
                if cnt:
                    pop(hi)
                    if cnt == 1:
                        del dhi[val]
                    else:
                        dhi[val] = cnt - 1
                else:
                    break
            val = pop(hi)
            sh -= 1
            push(lo, -val)
            sl += 1

        # clean tops for next iteration / median
        while lo:
            val = -lo[0]
            cnt = dlo.get(val)
            if cnt:
                pop(lo)
                if cnt == 1:
                    del dlo[val]
                else:
                    dlo[val] = cnt - 1
            else:
                break
        while hi:
            val = hi[0]
            cnt = dhi.get(val)
            if cnt:
                pop(hi)
                if cnt == 1:
                    del dhi[val]
                else:
                    dhi[val] = cnt - 1
            else:
                break
```
Potential bug: If sl > target, after cleaning lo top stale, `lo` may still have stale top? clean while handles. Good. But what if after cleaning, lo top is live but `sl > target` and target maybe 0? target never 0. Good.

Potential bug: If clean before move pops stale entries, then `sl > target` but all stale entries popped. However there may be pending delayed_lo for values not top. Fine. Move live top.

Now, after removing old and before rebalance, `lo[0]` could be stale if old was lo top. But classification used top before mark. Good. Rebalance sl maybe? If old removed from lo and new added to lo, sl unchanged; sl==target. End clean will pop stale top. Median okay. But note if sl==target and old lo top stale, we do not move. End clean pops stale. Then heap length live count = target, good. But hi maybe? If k even, hi size target. Median uses hi top. Good. If hi top stale from previous? End clean_hi. Good.

But what about if old removal was lo top and new add to hi, sl=target-1; rebalance sl<target moves hi top to lo. End clean_lo will pop stale old if old top larger than moved live. Example [1,2], k=2 target1, add3 hi, remove1 lo top stale. sl0. move hi top2 to lo push -2; lo heap [-2,-1] top -2 live, stale below; end clean no pop. Stale1 below remains. That's okay. If stale1 larger than moved? If old=2 moved3: lo heap [-3,-2] top -3 live. stale below. Good.

What if stale old smaller than moved? For maxheap, stale smaller not top. It may become top after live larger removed/moved. End clean not pop now; next slide when becomes top, clean. But median uses lo top live because stale smaller below. For maxheap top is largest value. If stale smaller than live top, no issue. If stale larger than live top, it is top and clean pops. Good.

Need ensure after end clean_lo, if lo top live, but stale larger below? In heap, larger value corresponds more negative; if stale larger than live top, it would be top due heap property (unless below? Maxheap via negatives: min top = most negative = largest value. Any stale larger than top would be more negative and violate heap property? If stale is in heap, heap property ensures parent <= child. For min-heap of negatives, the smallest negative (largest value) is at top. So any stale larger value would be top, not below. Thus after clean, all remaining entries have negative >= top? Actually they could be smaller values. Good.

Now check with duplicate and delayed count for stale below. Suppose lo has stale 10 (count 1) but live top 20. Since 20 larger, stale 10 below. Later remove/move 20, stale10 may become top; clean pops. Good.

Potential issue with `delayed_lo` dict counts and moving: If we move a live value x from lo to hi, and there is delayed_lo[x] count for stale x below. Later when stale x becomes top, dlo pops. But if the live x moved to hi and then removed while in hi, dhi count. No cross. Good.

Now median after rebalance but before end clean? We clean end before median. Good.

Could we need to clean hi before median even if hi empty? k odd hi may empty (k=1). Clean_hi while hi false. median odd uses lo. Good.

Potential issue in add comparison: `top = -lo[0]` before add. But after previous end clean, lo top live. However if lo heap top stale but delayed_lo count zero because stale entry not marked? no. Good.

Need maybe initial median clean? If k even and hi sorted valid. No delayed. But if input contains -0.0 and 0.0, sorted treats? dict keys? okay.

Now let's test manually some random small with mental maybe. Could write proof but code only. Need maybe use `out_append = out.append` for speed. Use `append = out.append`. Use local `nums_list = nums`. Use `range_k = range(k, n)`. Maybe.

Performance: inside loop, dictionary lookups `dlo.get`, `dhi.get`. Could micro-opt: for marking `dlo[old] = dlo.get(old, 0) + 1`. For pruning many no stale: `cnt = dlo.get(val); if cnt:`. This does get each slide even no stale. okay.

Maybe maintain `lo_top_val` instead of `-lo[0]`? Not.

Could use value-based delayed one dict and prune start of rebalance? Per-heap safe.

Let's compare with Fenwick correctness. Two heaps final code may be accepted. Need ensure no hidden bug with combined slide and stale top not cleaned before add classification. End clean ensures. But what if after end clean_lo, `lo` empty because target=0? invalid. If k=1 and after removing old and moving hi->lo then end clean pops stale old, lo top live. Good. If add to lo, remove old lo, sl==target1, end clean pops stale, but heap might have stale only? Let's test k=1 with new <= old. initial lo [old], target1. Add new<=top -> push lo, sl2. Remove old<=top -> sl1 delayed_lo old. End clean: lo heap values [old,new] negatives. Top max value. If old > new, top stale old, pop. top new. If new == old, top maybe stale? Both equal. delayed old count1. clean pops one stale, leaves one equal live. top live. Good. If new <= old and top old; yes. If new<old. Good.

k=1 with new > old: add hi, sl1 sh1. remove old lo sl0 delayed. sl<target: clean_hi top new live, pop move lo, sl1 sh0. End clean_lo: lo heap has stale old and live new. If new>old top live; if new? new > old because branch, so top live. If new == old branch would be lo, not hi. So stale below. median new. Good.

k=2 with new and old equal duplicates. Good.

Potential bug: `top = -lo[0]` used for both add and remove. If new pushed to lo and new == top but old equals top and there are multiple equal. Good.

What if `lo` top is `float('inf')`; `-lo[0]`? If value inf, lo negative -inf; top value inf. Comparisons okay. If value -inf, lo negative inf? Wait -(-inf) = inf; min-heap top maybe? For lower half with -inf value, negative is inf (largest), not top if other values larger? If all -inf, okay. Median mean may overflow. okay.

Need type annotation. Use `def sliding_median(nums: list[float], k: int) -> list[float]:`.

Should we import List? no.

Now consider alternative using sorted list. But two heaps more robust for k large. Need final code maybe lengthy. Let's verify rebalance with sl > target and clean before move. Suppose sl>target but lo top stale and after clean lo top live. Move top. But what if after clean, there are still stale top in hi that is smaller than moved value; end clean hi pops if top stale. If hi top stale but not smaller? For min-heap, stale smaller at top; if stale larger than live hi top, below. okay.

Need ensure `sl` and `sh` variables inside loop are local ints. In Python, modifying them okay. If we used nested rebalance would nonlocal. Inline no.

Let's maybe implement a helper `clean_top(heap, delayed, sign)`? For code readability? But final answer can be verbose. Maybe nested helper with `while` using heap and dict, but then need call. Since inline duplication 4 times okay.

Can reduce duplication by using two local functions `prune_lo` and `prune_hi` and use in loop. Performance likely still fine. But inline ensures no function overhead. Let's use inline to maximize speed. Code still clear.

Potential micro-optimization: Since after each slide sl differs target by at most one, we can know if need move. But if stale clean before move pops entries but sizes unchanged. If sl>target, move one. If sl<target, move one. If sl==target, no move. Good. Could there be sl > target+1 due to stale clean? No. But if bug, while loop would only move one. Our if/elif moves one. If sizes somehow differ more, not rebalanced. But starting balanced and add/remove one each ensures difference <=1. Need ensure initial balanced. Yes. If stale clean before move doesn't change sl. So one move enough. But what if due to remove classification with duplicates causing sl difference more? Add one, remove one; sl change at most 1. Good.

But what about when k=1 and target=1, sl after add could 2, after remove lo could1 (diff0) or remove hi? If add hi remove lo: after add sl1 sh1; remove old lo sl0 sh1; diff -1. one move. Good.

Now, in sl>target branch, clean_lo may pop stale top; then move. But if clean_lo pops stale top that was counted in sl? No size decrement happened earlier. But if there was stale top, `sl` effective doesn't include it. If sl>target, there are live lo entries. Good.

Potential issue with stale top in lo when sl==target: end clean pops stale but doesn't change sl. Then live count equals heap top? Suppose target=1, sl=1 but lo heap has one stale and one live? clean pops stale, leaves live count1. Good. If heap has stale top but live count1, after pop heap length live1. Good.

But if heap has stale top with delayed count and live count0? target? invalid unless target0. Could happen after remove from lo and before move? For sl<target branch, we don't clean_lo first; target could be1, sl0, lo heap stale top, live lo0. End after move push live to lo and clean_lo pops stale. If k=1 branch. Good. If target>1 and sl<target, live lo count positive maybe; stale top possible. After move push live, end clean. Good.

Now let's test random small by reasoning maybe find bug. Consider window values [5,1,9], k=3 target2. Initial sorted [1,5,9], lo lower [1,5] max top5, hi [9]. median5. Slide add 0, remove 5.
Loop: top=5. add0<=5 push lo sl3. remove5<=5 sl2 dlo5. sl==target2. end clean_lo: lo values [5 stale,0,1? Actually lo heap negatives: lower values 5,1, new0. Negatives [-5,-1,0? Wait 0 negative 0. Min heap top -5 (5) stale. pop stale. lo top max of [1,0]=1. hi [9]. median (1+9)/2=5? Window [1,9,0] sorted [0,1,9] median1, not 5. Wait target for k=3 is 2 lower half [0,1], hi [9]. But our lo after removing 5 and adding 0: lower live values [0,1] top1. hi [9]. Median odd uses lo top1, correct. I incorrectly median for even. Good.

Slide next from [0,1,9], remove 0 add 5. top lo=1. add5>1 push hi (hi [5,9]) sh2. remove0<=top1 sl1 dlo0. sl target2; sl<target: clean_hi? hi top5 live. pop5 to lo, push -5. lo heap has stale 0? values lo before: after previous lo top1, heap maybe [-1,0] values1,0 stale. Push -5 value5 -> values5,0,1 top5 live. hi [9]. median top5. Window [1,9,5] sorted [1,5,9] median5. Good. Stale0 below.

Next remove1 add6. top lo=5. add6>5 push hi [6,9] sh2. remove1<=top5? 1<=5 sl1 dlo1. sl<target? target2, sl1. clean_hi top6 live move6 to lo. lo heap values: 5 live? Wait previous lo values [5 live, 0 stale? maybe 1 stale? Let's track: previous after move: lo values [5,0 stale? 1 stale? Actually window [0,1,9] after first slide: lo live [0,1], hi [9], stale 5 below? lo heap [-5? stale, -1,0]; top -1 value1 live? Then after second slide move5 to lo: lo heap [-5,-1,0], stale0? Wait remove0 marked delayed, but top was1 live, stale0 below? 0 smaller not top. So stale0 below. Remove1 in third slide: old1<=lo top5, dlo1 count. sl becomes1. Move hi top6 to lo: push -6 value6. lo heap [-6,-5(stale 5? not marked? Actually 5 was moved live? In first slide 5 stale in lo? initial lo had 5 live; first slide remove5 marked dlo5 and clean popped stale5. So no stale5. lo after first slide [1,0] with 0 live. second slide remove0 dlo0; top? lo top1 live, move5 push; lo [5,1,0(stale)] top5. third slide remove1 dlo1; move6; lo [6,1(stale),0(stale)] top6 live. end clean_lo: top6 not stale. stale below. hi [9]. median6. Window [1,9,5]? Wait slide sequence: original [5,1,9] -> [1,9,0] -> [9,0,5]? Let's not. But algorithm seems.

Consider stale top after move: lo top stale could be moved? We clean_lo before end; if stale top and no move? end pops. If move hi->lo, push live; stale top could be larger than live; end pops. Good.

Now, one critical issue: In sl<target branch, we clean_hi before moving. But what if hi top live is not the smallest live hi because there is stale top smaller? We clean_hi pops stale smaller top until top not stale. Then top is smallest live? What if there is a live hi value smaller than stale top? Stale top smaller than all live; popped. Good. What if stale top larger than live top but not top? Then live top smallest. Good. So move correct.

Now, if sl>target branch, clean_lo before moving pops stale top larger than live top; after pop, top is max live. Good. If stale top smaller than live top, not popped; but live top max. Move max live. Good.

Now consider delayed dict counts for values that are stale but equal to live top. `delayed_lo.get(val)` returns count and pops top stale, even if top stale and there is live same value also at top? Heap entries indistinguishable; any one can be considered stale. Popping one and leaving live same value okay. Size_lo decremented when removal marked; popping stale consumes delayed. Live same value remains. Good.

Now think about memory: `out` list preallocate? Could preallocate length n-k+1 for speed. `res = [0.0] * (n - k + 1)` then assign by index. This avoids append overhead and maybe memory same. Use `res = [0.0] * (n - k + 1)`; for initial res[0] = ...; loop `idx = 1`; assign `res[idx] = ...; idx +=1`. This might be faster. Let's do.
```
    res = [0.0] * (n - k + 1)
    if k & 1:
        res[0] = float(-lo[0])
    else:
        res[0] = (-lo[0] + hi[0]) * 0.5
    idx = 1
    for i in range(k, n):
        ...
        if k & 1: res[idx] = float(-lo[0])
        else: res[idx] = (-lo[0] + hi[0]) * 0.5
        idx += 1
```
For k=1, hi empty but odd branch. For even, hi nonempty because k>=2. Good.

Could assign `odd = k & 1` outside. Use `if odd:`. But for even if hi empty? no.

Need ensure after initial sort and lo/hi, if `k` even, hi nonempty: target=(k+1)//2 = k/2 for even? k=2 target1, hi length1. Good. If k odd, hi length floor. Could be 0.

Could skip `heapify` but need ensure `hi = first[target:]` valid min heap: sorted ascending yes. `lo` valid as discussed. But after list comprehension reversed lower sorted ascending, let's verify for length 4: first lower values [1,2,3,4], reversed [4,3,2,1], negatives [-4,-3,-2,-1]. This is ascending (min-heap) because -4 < -3 < -2 < -1. Valid. Good.

Potential issue if lower half values not sorted because `first[:target]` sorted ascending yes. Good.

Now need `from heapq import heappush, heappop` at top. The final answer single code block. No input/print.

Let's consider using `list[float]` type requires Python 3.9+. Problem says 3.11. okay.

Now, can there be an issue with `nums[:k]` when k huge n=200k; sorting first window O(k log k). Good. If n-k+1 length maybe 0? k<=n and k>=1 so >=1.

Now think about hidden tests with `k = len(nums)`; loop range(n,n) empty. Return one median. Heaps no updates. Good. If k=1 and n=1, res length1, odd. Good.

Now, let's verify two-heap algorithm with combined slide via a brute-force mental for all small? Could reason invariant. Need maybe ensure `top = -lo[0]` before add is live. We end clean previous, yes. But after initial no stale. Good.

But what if end clean_lo pops stale top and `lo` becomes empty while `sl` still target? Could that happen if live count target but heap after popping stale empty? Then there were no live lo entries but sl target >0, contradiction. Unless live entries have pending delayed and were popped? Prune only pops delayed; size was decremented at removal. So if live count target, there must be target non-delayed entries. Good.

What if delayed dict count exists for stale entry that has been moved? We never move delayed entries. But how do we know top clean before moving doesn't move a delayed entry? It cleans top delayed. But delayed entry might not be top but could be moved if it becomes source top later after all larger live moved. At that time clean will pop before move because if sl>target branch cleans before move. But what if sl==target and stale top? End clean pops before next move. What if sl<target and moving from hi, stale top in lo not cleaned before moving but not moved. It could become top after push; end clean pops before next move. So no delayed entry is ever popped as live/moved, except when we intentionally pop stale in clean. Could a delayed entry be popped by heap operations like heappop when not clean? We only pop heap in clean and in move. Move clean source top first. Destination push doesn't pop. Good.

Potential bug in clean before move for sl>target: We clean lo top delayed. But what if source top delayed and after popping it, `sl` (effective) is still > target but heap top now another delayed; clean loop handles. Good. But if after popping all delayed, heap becomes empty, then pop live will fail. Shouldn't.

Now consider if `sl > target` but lo top live and there is delayed_lo for a value larger than lo top? Impossible because delayed value larger than top would be more negative and should be top. Unless delayed dict count for value larger but entry not in lo heap? Could be pending count with no entry? If removal classified lo but no entry? argued no. If pending count for value larger but entry below? Heap property says larger value is top; so no. Good.

Now, if there are stale entries not top, delayed dict counts. They may be smaller values. They can become top after larger values moved/removed. Clean then. Good.

Let's think about using `dlo.get(val)` where val is `-lo[0]`. If val is e.g. `-0.0`, dict key maybe 0.0? In Python, `float('-0.0')` equals `0.0`, hash same? yes. But `-lo[0]` for value -0.0? If heap stores `-(-0.0)` = 0.0? okay.

Now, perhaps there is simpler with Fenwick that is more obviously correct. But two heaps code must be correct. Let's maybe do a small formal invariant to satisfy ourselves.

State at beginning of each loop iteration:
- Effective counts: sl live elements in lo, sh live in hi, sl+sh=k.
- lo contains sl live elements and some stale lo entries marked in dlo; hi contains sh live and stale marked dhi.
- All live elements in lo <= all live in hi.
- Top of lo is live (if sl>0), top of hi is live (if sh>0), due to end clean.
- sl = target (since balanced) after end rebalance.
For initial true.
Loop:
- top live max lo = L.
- Add new v. If v<=L push lo live else hi live. Sizes total k+1. Invariant live holds for combined multiset with sizes maybe unbalanced but all lo<=hi? If v<=L, v<=L<=all hi; if v>L, v>=L and all lo<=L, and hi elements>=L; if v inserted in hi maybe v may be < existing hi min but >=L, okay. Top of lo remains live (if v to lo, new v<=L, max unchanged; if hi unchanged). Good.
- Remove old o from previous multiset before add. Need classify: if o<=L (L from before add and still top), mark lo else hi. This identifies a heap containing o among live before add? If o<=L, there is a live lo entry with value >=o? Wait if o<L, o must be in lo because hi all >=L. If o=L, there is live lo top L. Thus there is a live lo entry equal to o? If o<L but all lo values <=L; there could be no lo value exactly o? But if o is in window and <=L and not in hi, it must be in lo exactly value o. Yes. So marking lo is valid. If o>L, o not in lo, must be in hi. Good. Mark delayed side, size--. Total k. Live multiset after removal correct (conceptually; heap entry still present stale). Invariant for live elements holds. Top of source heap may become stale; tops not necessarily live.
- Rebalance: sizes diff maybe. If sl>target: live lo count too high. Need move max live lo to hi. Clean lo removes stale entries that are max among heap. Could there be a stale entry with value greater than max live? Then it is top and cleaned. After clean, top is max live lo. Pop it, size--, push hi live. Invariant: moved m was max lo; remaining lo <= m; hi before all >=? We moved from lo to hi because too many lower; before move all lo <= hi? Yes. m may be <= some hi min? Since invariant held before, m <= all hi? Wait if sl>target, invariant before removal? after removal maybe all lo<=hi. m max lo, so m <= min hi. Pushing to hi maintains. If sl<target: clean hi removes stale min entries; top live min hi. Move to lo; m <= all remaining hi; all lo before <= m? Since m min hi, and invariant all lo<=all hi, m >= max lo. So lo remains <= hi. Good. If no move, invariant holds. Then clean tops removes stale max lo and stale min hi. If top stale max lo, it wasn't live; removing it doesn't affect live. If top stale min hi, same. Top becomes live (or heap empty if size 0). Invariant unaffected. Median correct.
Good.

Need ensure clean_hi before moving when sl<target: hi may have stale entries that are not min? Clean only top stale. Top live min? If there is stale value smaller than live min, it's top and popped. If stale larger than live min, not top, live min is top. Good.

Now, one subtle point: after combined add, the invariant all lo <= all hi for live elements in k+1 set holds, but sizes unbalanced. For removal classification using L before add. If add to hi with v>L, invariant holds; L same. If add to lo with v<=L, invariant holds. Good. If add to lo with v<=L but v could be > some hi? Since hi all >=L, v<=L <=hi. okay.

Now about `target = (k+1)//2`. We maintain sl target. For even k, target=k/2. For odd, target=(k+1)/2. Good. Median uses lower half top. If lo top live. If k even hi top live.

Could there be case hi top stale but sh=0? For k odd sh could be 0 when k=1; median doesn't use hi. Clean_hi while hi false if empty. For k>1 odd sh>=1. Good.

Now, potential issue in initial build: We didn't initialize delayed dicts with entries for stale? none.

Now, compare to Fenwick: Two heaps final code more complex but likely efficient. Need maybe handle `ValueError` if k is not int? Not. If k > n or k<1. If nums not list but sequence? Type list. okay.

Potential hidden performance issue: Sorting first window of size k=200k O(200k log) fine. Sliding loop with inline clean loops: `while lo:` and `while hi:` at end each slide, even when no stale; one iteration each (get returns None). That's 400k dict gets. Good. Before move maybe another clean if needed. 200k. Fine. Heap ops: each slide push new; if move, pop source and push dest. For random maybe move often half? So about 400k pushes + 100k pops? Actually initial no. Each slide: add push 199k. Rebalance move: depending sizes; could move nearly every slide (if old/new sides differ) maybe 199k pops and pushes. Total ~600k heap ops. Each O(log k) but heapq operations Python. Should be <2 sec likely.

Could optimize by using local `dlo_get = dlo.get`? But dict changes; `get` method bound once okay but if dict mutated method still works. However assigning `dlo_get = dlo.get` and using `dlo_get(val)` maybe faster? But if dict resized, bound method okay. For setting need dlo. Could do but not necessary. If we bind get before loop, it remains valid. Use `dlo_get = dlo.get`, `dhi_get = dhi.get`. But when dict mutated, bound method still calls current. Good. However if we reassign dlo? no. Could speed. But for updates need `dlo[old] = dlo_get(old, 0) + 1`. For prune: `cnt = dlo_get(val)`. But if key count becomes 0 and deleted, get returns None. Good. Let's use bound methods for speed.

But if we use `dlo_get` and then update dict, bound method okay. Similarly `heap_pop`? `pop = heappop`, `push = heappush`. Local variables.

Could also bind `lo0 = lo[0]`? no.

Let's write with bound `dlo_get`, `dhi_get` and maybe `dlo_setitem` not. For dict deletion, `del dlo[val]`.

Code inside loop:
```
        top = -lo[0]
        v = nums[i]
        if v <= top:
            push(lo, -v)
            sl += 1
        else:
            push(hi, v)
            sh += 1
        old = nums[i - k]
        if old <= top:
            sl -= 1
            dlo[old] = dlo_get(old, 0) + 1
        else:
            sh -= 1
            dhi[old] = dhi_get(old, 0) + 1
```
If `nums` contains values such that `old <= top` but top changed due to new? top before add. As argued. If new NaN, v <= top False, push hi; top same.

Rebalance inline:
```
        if sl > target:
            while lo:
                val = -lo[0]
                cnt = dlo_get(val)
                if cnt:
                    pop(lo)
                    if cnt == 1:
                        del dlo[val]
                    else:
                        dlo[val] = cnt - 1
                else:
                    break
            val = -pop(lo)
            sl -= 1
            push(hi, val)
            sh += 1
        elif sl < target:
            while hi:
                val = hi[0]
                cnt = dhi_get(val)
                if cnt:
                    pop(hi)
                    if cnt == 1:
                        del dhi[val]
                    else:
                        dhi[val] = cnt - 1
                else:
                    break
            val = pop(hi)
            sh -= 1
            push(lo, -val)
            sl += 1

        while lo:
            val = -lo[0]
            cnt = dlo_get(val)
            if cnt:
                pop(lo)
                if cnt == 1:
                    del dlo[val]
                else:
                    dlo[val] = cnt - 1
            else:
                break
        while hi:
            val = hi[0]
            cnt = dhi_get(val)
            if cnt:
                pop(hi)
                if cnt == 1:
                    del dhi[val]
                else:
                    dhi[val] = cnt - 1
            else:
                break
```
Potential issue: `dlo_get` bound before deletions; after deleting key, get returns None. Good. But if we do `del dlo[val]`, bound method still okay. If dict mutated heavily, method okay.

Potential micro bug: If `cnt` is negative? no. If `cnt` is 0 but key exists? We delete zeros. Good. `if cnt:` would not pop if cnt=0, but no zeros. If cnt can be None false. Good.

But `dlo_get` returns `None` if key missing; if key exists with count 0 impossible. If `cnt` is True/False? count int.

Now, after marking removal, if `old` key already in dlo with count e.g. 1, `dlo[old]=2`. Bound get works. If old equals top stale from previous, okay.

Potential issue with `top = -lo[0]` before adding but after previous end clean. What if previous end clean popped lo top stale and left `lo` empty because sl=0 (during intermediate? But end of slide total k, target>=1, sl=target after rebalance; sl not0 except target? target>=1. So lo not empty. Good. For k=1 after slide end sl=1. Good.

Now consider initial with even k: after initial median assignment, loop. If k=2, target=1. `hi` sorted [max]. Good.

Let's test another tricky case: [1,2,2,3], k=3.
Initial sorted [1,2,2], target2: lo lower [1,2] top2, hi [2]. median2.
Slide add3, remove1. top=2. add3>2 push hi [2,3] sh2. remove1<=2 sl1 dlo1. sl target2? sl1<target. clean_hi: hi top2 live? yes. pop2 to lo. lo heap values: lower had [2,1 stale? Actually lo values [2,1], dlo1. Push2 -> values [2(new),1(stale),2(old live)] top2. hi [3]. median2. Window [2,2,3] median2.
Slide add? okay.

Case where old removal value in hi but top classification hi. [1,2,3,4], k=3.
Initial sorted [1,2,3], target2: lo [1,2] top2, hi[3]. median2.
Slide add4, remove2. top=2. add4>2 hi [3,4] sh2. remove2<=2 sl1 dlo2. sl target2? sl1<target. clean_hi top3 live; move3 to lo. lo heap: values [2 stale,1 live,3 live] top3 (since 3>2), stale2 below. median3. Window [2,3,4] sorted [2,3,4] median3. Good.
Slide add5, remove3? top lo=3. add5>3 hi [4,5]. remove3<=3 sl2 dlo3. sl target2. end clean_lo: top value3 stale, pop. lo top value2 live? Wait lo values before [3 stale,2? value2 stale? We removed2 previous dlo2 but stale2 below? In previous lo heap after move: [3 live, 2 stale (from old2), 1 live]. Then slide remove3 mark dlo3. top3 stale; clean pops3. Now heap top? values2 stale? top maybe 2 stale; delayed_lo has2 count. But our end clean_lo loop continues while stale: after pop3, val=2 cnt dlo2=1 -> pop2. top1 live. sl still target2? Wait live lo count after removing3: sl? start sl2 live [1,3]? Actually after previous slide, lo live values [1,3] (2 stale), sh live [4? no hi [4]? For window [2,3,4], lower target2 live lo should [2,3], hi [4]. But our lo heap had live 3, stale2, live1? That would sl? Let's recalc sizes: Initial [1,2,3], lo live [1,2] sl2, hi[3]. Slide add4: sh2, remove2: sl1 dlo2. sl<target: move hi top3 to lo: sh1, sl2. So lo live should be [1,3], not [2,3]. The old 2 marked stale but effective live [1,3]. Median uses lo top max live =3, okay. The lower half of window [2,3,4] should [2,3]; but our lower half [1,3] contains 1 and 3, hi [4]. That's wrong! Wait, sliding window [2,3,4] sorted [2,3,4], lower half for odd k=3 should first two elements? Median is second element 3; lower half can be [2,3] but containing [1,3] would still median? Median for odd uses top lo = max of lower half =3, okay. But for even later it could be wrong if lower half not actual lower half. This is a red flag! Did algorithm maintain median only? Let's examine: In previous slide, we removed value 2 but classification marked lo delayed. However live lo after removal was [1] and hi [3]. To balance target2, we moved hi min 3 to lo, resulting lo live [1,3]. But the correct lower half should include 2 (the outgoing? Wait outgoing 2 is being removed, not in window. The window after removal before adding? For slide from [1,2,3] to [2,3,4]: remove 2, add4. But we added 4 before remove. The multiset after add/remove is [1,3,4]. Wait original [1,2,3], remove first element (i-k = 0) is 1, not 2! I mistakenly remove 2. The slide from [1,2,3] to [2,3,4] removes 1 and adds4. Then old=1<=top2, sl1, move hi top3 to lo: lo live [2? Wait lo before [1,2], remove1 marks 1 stale, live lo [2], move3 -> live [2,3]. Good. So algorithm correct. My recalc wrong. For [1,2,3], remove2 would be sliding window shift by one from [2,3,?], not. Good.

Let's test remove top but lower half correct.

Potential issue: When removing old <= top, we mark lo; but there may be multiple equal values, one in hi. We decrement lo size and mark lo stale. The live lower half might change but median still correct. Good.

Now, consider scenario where lower half contains a value not actually smallest lower half because stale not cleaned? But live counts and ordering maintained; moving ensures all live lo <= all live hi. If sl target, lo contains target smallest live elements? Since all lo <= hi, any set of target elements with all <= remaining is a lower half; if duplicates okay. If lo has target elements not exactly the smallest because some smaller in hi? Invariant prevents. Good.

Now, let's test sliding where remove hi. Example [1,2,3,4], k=3 initial remove1 move hi. Another remove hi: start [2,3,4] maybe lo [2,3] hi[4], remove3? top3, old3<=top (equal) mark lo, not hi. To remove hi, old > lo top. Example window [1,4,5], k=3: sorted [1,4,5], lo [1,4], hi[5]. Slide remove4? next [4,5,6] remove1? Hmm remove hi value 5: start [1,4,5], remove1 -> [4,5,6]; old1 lo, hi top moves? Add6 hi, remove1 sl1, move hi top5 to lo: lo [4,5], hi[6]. So 5 moved lo. To remove hi, e.g. start [1,4,5], add2? But sliding contiguous. Let's just test update with remove hi: window [1,4,5] add6 remove4? old4 lo top? top4, classify lo. Need old>top: top max lo maybe2, hi has5. Start [1,2,5], k=3 lo [1,2] top2 hi[5]. Slide remove2? add6 remove1 old1 lo. To remove5, remove first element 1? no. If window [1,5,6] sorted lo[1,5] top5 hi[6]; hi values not removed. Since removal from front could be hi if front element large. Example [5,6,1] sorted initial [1,5,6], lo [1,5] top5 hi[6]; front 5 lo. Need front > top? initial [5,1,6] sorted lo [1,5] top5, front5 lo. If k=4 even lo [?,], hi maybe front. Example window [5,6,1,7], k=4 target2 sorted [1,5,6,7], lo [1,5] top5 hi [6,7], front5 lo. Front in hi if front > 5, e.g. [7,6,1,5] sorted [1,5,6,7], lo [1,5], hi [6,7], front7 hi. Slide remove7, add8. Start top lo=5. add8>5 hi. remove7>5 -> sh-- dhi7. Sizes add hi: sh3, remove hi: sh2 sl2 target2 no move. End clean hi: hi heap [6,8,7stale]? min top6 live. Good. Median even: lo top5, hi top6 -> 5.5. Window [6,1,5,8] sorted [1,5,6,8] lower [1,5] top5 hi [6,8] correct. Stale7 below. Good.

Now if stale7 below and later becomes top: window [6,1,5,2] remove? Let's continue: from [1,5,6,8], slide add2, remove6? front6? Actually sequence [7,6,1,5] window then remove7 add8 -> [6,1,5,8]; next remove6 add2 -> [1,5,8,2] sorted [1,2,5,8] median3.5. Algorithm: current lo [1,5] top5, hi [6,8] with stale7 below? hi heap min top6, stale7 below (larger). top=5. add2<=5 push lo sl3. remove6>5? 6>5 so sh-- dhi6. sl3 target2: sl>target. clean_lo before move: lo top5 live? lo heap values [5,1,2] top5, no stale. pop5 to hi. hi push5; hi heap has stale7? heap entries [5,8,7,6stale?]. min top5 live. sh? before sh2 (live 6,8) after remove6 sh1; after move sh2. lo live [1,2], hi live [5,8] (stale6,7). Median (2+5)/2=3.5 correct. Note we moved lo top5 to hi, but hi stale6 smaller? 5<6, hi live min5. Good. Next maybe stale6 becomes top if 5 moved/removed. It is delayed_hi, will clean if top. Good.

Now, a case where stale hi below but smaller than live hi? In min-heap, smaller stale would be top, not below. So stale larger than live. okay.

Now, if we have delayed_hi count for 6, stale6 in hi. It might be moved? Clean_hi before moving if sl<target: top live? hi top5 live (since 5<6). Move5 to lo, leaving stale6 top. End clean_hi will pop stale6. Good. If sl>target, we don't clean_hi before move; after move push lo top to hi. If hi top stale smaller than moved, end clean pops. Good.

Now, consider if hi top stale smaller than moved value, but we need move because sl>target. We push moved value to hi; heap top remains stale smaller. End clean pops stale; now hi top might be live moved or other. Good. No move from hi needed.

Potential issue: If hi top stale and we push a value smaller than stale to hi, heap top could become new live smaller. End clean no pop stale below. Good.

Now, code with `dlo_get = dlo.get` and then deleting keys: In Python, if dict is mutated, bound method okay. But if we rehash, method still references dict. Good.

Could `dlo_get(old, 0)` conflict with bound method after we `del dlo[val]`? okay.

Potential micro issue: Using `if cnt:` will treat count e.g. bool? int. Fine.

Potential issue with `cnt == 1` and deleting; if key was deleted between get and update? Single-thread no.

Now, final answer: just code block. Need no comments? Could include comments okay. User says single python code block. Comments okay. But final no tests. Let's ensure imports inside code block. Need maybe `from heapq import heappush, heappop`.

Double-check type hints require `list` builtin generic available. Good.

Let's consider if input list has custom float subclass? Not.

Now, let's maybe compare to Fenwick simpler. But two-heap code maybe accepted. Need maybe ensure it passes n=200k k=1000 in Python. Could further optimize by precomputing `nums_i` local. Use `arr = nums`. Use `append` preallocated.

Final optimized code:
```
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("...")
    target = (k + 1) // 2
    first = nums[:k]
    first.sort()
    lo = [-x for x in reversed(first[:target])]
    hi = first[target:]
    sl = target
    sh = k - target
    dlo = {}
    dhi = {}
    dlo_get = dlo.get
    dhi_get = dhi.get
    push = heappush
    pop = heappop
    res = [0.0] * (n - k + 1)
    odd = k & 1
    if odd:
        res[0] = float(-lo[0])
    else:
        res[0] = (-lo[0] + hi[0]) * 0.5
    idx = 1
    arr = nums
    for i in range(k, n):
        top = -lo[0]
        new = arr[i]
        if new <= top:
            push(lo, -new)
            sl += 1
        else:
            push(hi, new)
            sh += 1

        old = arr[i - k]
        if old <= top:
            sl -= 1
            dlo[old] = dlo_get(old, 0) + 1
        else:
            sh -= 1
            dhi[old] = dhi_get(old, 0) + 1

        if sl > target:
            while lo:
                val = -lo[0]
                cnt = dlo_get(val)
                if cnt:
                    pop(lo)
                    if cnt == 1:
                        del dlo[val]
                    else:
                        dlo[val] = cnt - 1
                else:
                    break
            val = -pop(lo)
            sl -= 1
            push(hi, val)
            sh += 1
        elif sl < target:
            while hi:
                val = hi[0]
                cnt = dhi_get(val)
                if cnt:
                    pop(hi)
                    if cnt == 1:
                        del dhi[val]
                    else:
                        dhi[val] = cnt - 1
                else:
                    break
            val = pop(hi)
            sh -= 1
            push(lo, -val)
            sl += 1

        while lo:
            val = -lo[0]
            cnt = dlo_get(val)
            if cnt:
                pop(lo)
                if cnt == 1:
                    del dlo[val]
                else:
                    dlo[val] = cnt - 1
            else:
                break
        while hi:
            val = hi[0]
            cnt = dhi_get(val)
            if cnt:
                pop(hi)
                if cnt == 1:
                    del dhi[val]
                else:
                    dhi[val] = cnt - 1
            else:
                break

        if odd:
            res[idx] = float(-lo[0])
        else:
            res[idx] = (-lo[0] + hi[0]) * 0.5
        idx += 1
    return res
```

Need think if `dlo_get` bound method becomes stale after assigning `dlo = {}`? no. But if dict is modified, get sees modifications. Good.

Potential issue with using `first[:target]` and then `hi = first[target:]`: If `target=0`? no. For k=1, hi=[]; median odd; clean_hi while hi false. Good.

Potential issue: If `first` sort of floats with NaNs: lo/hi invalid. Not handle.

Could there be an issue when `new <= top` and `top` is `-0.0`? okay.

Now, let's try to find bug with `top` variable for old classification if new pushed to lo and old top? top unchanged. Good. But what if new == NaN? no.

Now, consider if after add new to lo, lo heap top stale? No top live. But if `new` is greater than top due to NaN? condition false push hi; top unchanged.

Now, maybe the combined slide add before remove changes which side old is classified relative to if we removed before adding. We argued lo top unchanged by add, so same as before. Good.

But what if lo empty before add? Initial k>=1, after slides sl target>=1, lo not empty. Good.

Now, test small random by mental brute for [1,1,2], k=2.
Initial sorted [1,1] target1: lo [1] hi [1] med1.
Slide add2 remove1 (i=2 arr[2]=2 old arr[0]=1). top1. add2>1 hi push (hi [1,2]) sh2. remove1<=1 sl0 dlo1. sl<target1. clean_hi: hi top1 (value equal to stale? dhi none). pop1 to lo. lo heap has stale1? old lo [ -1] stale, push -1 => two 1 entries. top 1 live? There are two 1 entries; one stale, one live. dlo1=1. end clean_lo: top val1 cnt1 pop one. lo top val1 (the other) live? Which one popped could be live or stale indistinguishable; leaving one live? But size_lo=1. There were two entries, one stale one live. After pop, heap has one 1. Is it guaranteed live? We popped top (could be stale or live). If we pop the live one and leave stale, then heap top stale but delayed count now 0, clean_lo won't pop. Then lo heap has stale 1 but size_lo=1, bad. Heap entries with equal value indistinguishable; delayed count for value. If we pop top equal, could be live instead of stale. Does standard value-based lazy deletion have this issue with duplicates equal at top? It says any occurrence can be considered stale because values identical; leaving stale vs live equal value doesn't matter for value/median/order. But size counts one live; heap has one entry. Even if conceptually stale, there is still one live value? If we conceptually popped live and left stale, delayed count gone but we still have an entry with value 1; we can treat it as live because values equal. The effective multiset of heap values corresponds to counts after removing one 1. There is still one 1 needed. So okay. Identity of identical values irrelevant. Good.
Median window [1,2] => (1+2)/2? hi [2], lo [1]. median1.5. Good.

Now, potential bug with per-heap delayed and identical values across heaps? We use per-heap. In above dlo stale. Good.

Now, consider if dlo has count1 for value1 but lo top1 live (another entry) and hi top? clean_lo will pop top1, potentially live, leaving stale. Delayed count0, size_lo remains1. There's one entry value1; we treat as live. Since values identical, correct. Ordering same. Good.

Now, one more tricky: When clean_lo before move pops top value x with delayed count, it doesn't change sl. If after pop, heap top also x but delayed count maybe still >0. Good. If count count less than number of stale top x entries? It pops one per count. If there are more top x stale than count but some live x top, could pop live and leave stale, count gone. Treat remaining x as live. Correct for values.

Now, what about delayed_lo count for x but top x stale and there is no live x in lo? If count equals number of stale top x, pops all. Good. If count less than stale entries? Count matches removals, should not exceed stale entries? Could count exceed live? We mark removal for each live x in lo. If some live x moved out, delayed count remains? Wait if we mark removal x in lo, then later before stale x becomes top, could a live x equal be moved from lo to hi. The delayed x was intended for a stale x, not the live moved one. If delayed count < number of x entries including live, clean top may pop live equal and leave stale. But value multiset still? Let's construct: lo has entries [10 live, 5 live]. Remove 5 (marked delayed5). Later move 10 to hi, leaving lo [5 stale, 5 live? Actually remove5 left one stale5, one live? Suppose two 5s: lo [10,5a,5b]; remove5a mark delayed5, live5b. Move10 to hi, lo [5b live, 5a stale]. clean_lo top5 delayed count1; top5 equal could pop 5b live or 5a stale; leaves one 5. Treat as live. okay. If there was only one 5 and remove5, live count of 5 zero; after move10, lo [5 stale], clean pops it. okay.

If delayed count for x but there are live x and stale x in heap, and we pop top x live, leaving stale but delayed count zero. Then effective live count still counts a live x somewhere. Since values equal, any x entry can represent live. Good. But if later we remove x again, we may mark delayed on current heap entry (which may have been considered live but actually stale conceptually). Still value multiset correct. This lazy approach relies on values indistinguishable. Good.

Now, could there be issue with moving an entry that is conceptually stale but not marked due to previous count mismatch? Since counts aggregate, we always treat some entries live. Sizes maintain counts. Fine.

Now, if two heaps per-heap delayed but moving identical values can cause identity confusion; still okay as argued.

Let's consider if moving a value x from lo to hi while delayed_lo[x] count >0 for stale x below. We move top live x. If top live and stale x same, heap top could be either. We cleaned top until no delayed count at top. If delayed_lo[x]>0 and top x, clean would pop one x even if it might be live, leaving delayed count maybe 0 if count1 and one live/stale. Then top could be x (remaining) and move it. It might be stale conceptually but treated live. Size_lo unaffected by clean; then move pops top and sl--. If moved entry was actually stale, then live count should have been lower, but delayed count was consumed by clean (which might have removed a live). Counts still represent live counts somewhere. This is standard lazy duplicate indistinguishability. Should maintain multiset of values counts? Need maybe use multisets per value per heap? But identity not needed. The counts of entries per value and delayed counts maintain total entries. Size adjusted by removals. Clean consumes delayed by popping top equal. Move pops top equal and adjusts size. Could result in moving an entry that was marked delayed while another live equal remains; but value multiset in heaps after move: one less x in lo, one more x in hi. Sizes: sl decreased. Effective live multiset: removed? Let's use counts per value maybe. Suppose lo has value counts: 1 entry x live, delayed count1 for another x? But if delayed count for x and only one entry x? That means size_lo counts live? Let's count actual heap entries: 1 entry x. delayed count1 implies it is stale, live count for x should 0. But size_lo includes live count elsewhere? If no other entry, impossible. If there are 2 entries x, delayed1, live1. If clean consumes top x (could be live), heap entries left1, delayed0, size_lo includes live1. The remaining entry (conceptually stale) becomes live. Then if move top x, size_lo--, heap entries left0; live x count in lo 0. Good. Effective value multiset same. So okay.

Now, could a stale entry become top and not be popped because delayed count was consumed by a live equal entry elsewhere? That means counts of entries and delayed not match per value, but total live count matches. If there is a stale entry but no delayed count, it is treated live. This corresponds to reassigning liveness among equal values. Fine because equal values interchangeable. If stale entry value differs from delayed consumed value, not happen because consume only equal value top. If delayed count intended for value x but popped entry y equal? no.

Thus robust.

Potential issue with dict keys and floats: If values are `nan`, delayed counts for nan? Comparisons false, ordering broken. Not required.

Now, one more performance thought: Preallocating `res = [0.0]*length` stores references to same float (immutable okay). Assign. Good.

Could `float(-lo[0])` for odd if lo[0] is int? returns float. For even expression yields float. Good.

Now, maybe the problem wants median of every contiguous window of size k inclusive; if len(nums)-k+1 =0? If k>len raise; if empty and k? raise. Good.

Now, maybe they expect efficient but could use sorted list because k=1000; but O(n log k) good.

Let's consider if initial sort lower/upper and target constant; but after many slides with stale entries, heaps may contain many stale entries not popped if they are never top? Total stale entries could accumulate? Each removed element marked delayed; if not popped when top, it remains. Heap length can grow to n if stale entries below? For sliding windows, stale entries could accumulate below top and never popped, causing heap memory O(n) and heappush/pop O(log n) rather than O(log k). Is that possible? Lazy deletion heaps can grow unbounded if stale elements not top. For median sliding with two heaps, stale elements are removed from effective size but remain in heap. Over n, heap size can grow to O(n) if many stale below top? For maxheap lower half, stale small values may be below larger live elements and never become top until larger removed. But since window size fixed k, live elements k, stale elements can accumulate as elements leave but not become top if they are smaller than current lower top? In a maxheap, smaller values are below. If stale values are small, they may remain below forever while larger values in heap? But live count lower target k/2, stale smaller can accumulate. Heap length could grow O(n). For n=200k, heap length up to 200k, log n ~18 not bad, but memory okay. However operations O(log n) not log k; still n=200k log 18 fine. But if many stale below, `heappush`/`pop` log heap length grows. Could be okay. But could it degrade to O(n) in time? 200k*18 ~3.6M loops, okay. Memory 200k entries ~ okay. But is there a scenario stale accumulates huge causing heap length n? Yes. Still acceptable. Lazy heaps typical O(n log n). For n=200k fine. But target under 2s? 200k log 18 ~3.6M heap loops, okay. However stale entries might be many, but prune only top, heappop operations on stale top only when they reach top. If stale never top, they remain; but when heap top live, operations log heap length including stale. Could be log n. okay. Fenwick O(n log m) also 18.

Could heap length grow to n for both heaps: 200k entries. Memory okay. Time maybe more than 2? Each slide push into heap length up to 200k => log 18. Initial k1000 but stale accumulate. 199k pushes * log up to18 ~3.6M. Moves pops ~199k *18. Clean pops stale maybe up to200k *18. Total ~7M loops. Fine.

But if we use sorted list, memmove 200M C maybe okay. Fenwick 14M. Heaps maybe faster.

Need consider if stale entries not top cause heap invariant for live elements but heap top live. For median, okay. For classification, top live. For move, clean top if stale. If top live but stale below. Good.

Could there be a bug if heap length includes stale and top live but target moves require moving top live; stale below remain. Fine.

Now, perhaps we can periodically clean heaps? Not needed. But lazy delayed dict counts for stale below could be many. `dlo_get(val)` at top only.

Now, verify with a scenario where stale small below not popped, and target changes? Slides remove small stale but not top. It remains. Heap length grows. When live larger elements eventually move/removed, stale may become top and clean. Good.

Potential issue with `lo` maxheap via negatives: If stale entries are small values, negatives less negative (larger) than top negative of large values, so below. Good.

Now, maybe for even k and hi minheap: stale large values stay below because larger than live hi min. Good. If stale small values? In hi, all values >= lo; stale small maybe smaller than live hi min but if stale was removed and value smaller, it would be top and clean. If stale value larger, below. So hi length grows with large stale. Good.

Now, check if `first.sort()` with `nums` floats and target. If lower/upper halves not strictly separated when duplicates across boundary. Invariant all lo <= hi. With duplicates equal okay.

Potential alternative: Use `lo = [-x for x in first[:target]]` then heapify. If we don't heapify but use reversed list valid? Let's double-check for arbitrary length. Suppose lower values [1, 100, 2, 3] cannot because first sorted ascending: [1,2,3,100]. Lower target maybe2: [1,2], reversed [2,1], negatives [-2,-1] ascending. target4: lower [1,2,3,4], reversed [4,3,2,1], neg [-4,-3,-2,-1], list sorted ascending. Any sorted ascending list is valid min-heap. Yes. For `hi = first[target:]` sorted ascending valid min-heap. Good. No need heapify. But if target = k and hi empty? k odd target=(k+1)//2 not k unless k=1. For k=1, hi empty. For even target <k. So hi nonempty if k>1. Good.

Potential issue: If first slice empty? no.

Now, let's think about possible ValueError message. Just raise ValueError. Could not include f-string? Use `raise ValueError("k must be between 1 and len(nums)")`. Good.

Now, final answer should include code block only. No explanation.

Let's maybe consider a simpler Fenwick version final? It is shorter and perhaps easier. But performance uncertain. Two-heap code long but okay. Need ensure no syntax errors. Let's review code carefully for variable scope and names.

Full code:
```
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    target = (k + 1) // 2

    first = nums[:k]
    first.sort()
    lo = [-x for x in reversed(first[:target])]
    hi = first[target:]

    sl = target
    sh = k - target

    delayed_lo = {}
    delayed_hi = {}
    get_lo = delayed_lo.get
    get_hi = delayed_hi.get

    push = heappush
    pop = heappop

    res = [0.0] * (n - k + 1)
    odd = k & 1
    if odd:
        res[0] = float(-lo[0])
    else:
        res[0] = (-lo[0] + hi[0]) * 0.5

    idx = 1
    arr = nums
    for i in range(k, n):
        top = -lo[0]
        new = arr[i]
        if new <= top:
            push(lo, -new)
            sl += 1
        else:
            push(hi, new)
            sh += 1

        old = arr[i - k]
        if old <= top:
            sl -= 1
            delayed_lo[old] = get_lo(old, 0) + 1
        else:
            sh -= 1
            delayed_hi[old] = get_hi(old, 0) + 1

        if sl > target:
            while lo:
                val = -lo[0]
                cnt = get_lo(val)
                if cnt:
                    pop(lo)
                    if cnt == 1:
                        del delayed_lo[val]
                    else:
                        delayed_lo[val] = cnt - 1
                else:
                    break
            val = -pop(lo)
            sl -= 1
            push(hi, val)
            sh += 1
        elif sl < target:
            while hi:
                val = hi[0]
                cnt = get_hi(val)
                if cnt:
                    pop(hi)
                    if cnt == 1:
                        del delayed_hi[val]
                    else:
                        delayed_hi[val] = cnt - 1
                else:
                    break
            val = pop(hi)
            sh -= 1
            push(lo, -val)
            sl += 1

        while lo:
            val = -lo[0]
            cnt = get_lo(val)
            if cnt:
                pop(lo)
                if cnt == 1:
                    del delayed_lo[val]
                else:
                    delayed_lo[val] = cnt - 1
            else:
                break

        while hi:
            val = hi[0]
            cnt = get_hi(val)
            if cnt:
                pop(hi)
                if cnt == 1:
                    del delayed_hi[val]
                else:
                    delayed_hi[val] = cnt - 1
            else:
                break

        if odd:
            res[idx] = float(-lo[0])
        else:
            res[idx] = (-lo[0] + hi[0]) * 0.5
        idx += 1

    return res
```

Check if `get_lo` bound method after `del delayed_lo[val]` and later `delayed_lo[old] = get_lo(old,0)+1` okay. Yes. But if dictionary is cleared? no. If key deleted, get returns None. Good.

Potential subtlety: Bound method `get_lo` uses the dict object; if we assign `delayed_lo[val] = cnt - 1`, dict may resize; method still okay. Good.

Could `cnt` be `False` if count=0? no.

Potential issue: `cnt = get_lo(val)` returns `None` if missing, `0` if count zero (not possible). If `cnt == 1`, delete. If count >1. Good.

Now, let's test with small examples step by step using code logic:
nums=[1,2,3], k=1. target1. first [1], lo[-1], hi[]. res[0]=1. idx1.
i=1 top=-(-1)=1 new=2 > top push hi [2] sh1. old=arr0=1 <=top sl0 delayed_lo[1]=1. sl<target (0<1): while hi: val=2 cnt get_hi None break. val=pop hi ->2 sh0 push lo [-2,-1]? push(lo,-2): lo heap [-2,-1], sl1. end clean_lo: val=-lo[0]=2? lo[0] is -2, val2 cnt get_lo(2)=None. lo top live2. hi empty. res[1]=2. Good. Note lo heap still has -1 stale but not top. delayed_lo[1]=1. Next i=2 top=-lo[0]=2 new=3>2 push hi[3] sh1. old=arr1=2 <=top sl0 dlo2. sl<target: clean_hi val3 live pop push lo -3. lo heap before [-2(stale? top? after push -3 -> [-3,-2,-1], top -3 val3 live. End clean_lo val3 no stale. Wait stale 1 and 2 below. res3. Good. Stale accumulate below. okay.
But after i=1, delayed_lo[1] count1 remained. Next top2. Stale1 below. If later top becomes1, clean. Good.

nums=[3,2,1], k=1. init lo[-3]. i1 top3 new2<=3 push lo [-3,-2]? heap top -3 val3 live. old3<=top sl0 dlo3. sl<target? sl0<1: clean_hi empty? hi empty. Then val=pop(hi) fails! Wait sl<target and hi empty. Let's examine sizes: initial sl1 sh0 target1. Add new2 <= top -> push lo sl2. Remove old3 <= top -> sl1. Not sl<target; sl==target1. Rebalance if sl>target? no; elif sl<target? no. End clean_lo: lo heap top? values [3 stale,2 live] negatives [-3,-2], top -3 val3, dlo3 count1 -> pop lo, delayed del. heap [-2] val2. median2. Good. I mistakenly sl0. Correct.

nums=[1,3,2], k=1. init1. i1 top1 new3>1 hi[3] sh1. old1<=top sl0 dlo1. sl<target: clean_hi top3 live, move to lo. lo heap stale1? push -3: lo [-3,-1] top -3 val3. end clean_lo val3 no. median3. stale1 below. i2 top3 new2<=3 push lo sl2? lo heap [-3,-2,-1], top3 live. old3<=top sl1 dlo3. sl==target. end clean_lo top3 stale pop, heap top2 live? [-2,-1] top -2 val2. median2. Good.

Now k=1 works.

Now test k=2 with [3,2,1]. target1. init sort [2,3]? first [3,2] sort [2,3]; lo [-2], hi[3]; median2.5. i2 top=2 new=1<=2 push lo [-2,-1] sl2. old=arr0=3>top -> sh-- dhi3. sizes sl2 target1; sl>target: clean_lo: top val2 (lo[0]=-2) cnt get_lo(2)=None; break. val=-pop(lo): pop lo -> -2 val2, sl1, push hi 2. hi had [3] with stale3? Actually hi heap [3] but dhi3=1. push 2 -> hi [2,3]. sh was? initial sh1; add new lo sh1; remove old hi sh0 dhi3. Move lo->hi sh1. End clean_lo: lo top -1 val1 no. clean_hi: hi[0]=2 cnt dhi_get(2) none. hi top live2 (stale3 below). median (1+2)/2=1.5. Window [2,1] sorted [1,2] median1.5. Good. Stale3 below. If later top? okay.

Now k=2 [1,3,2]. init sort [1,3] lo[1] hi[3] med2. i2 top1 new2>1 push hi [2,3] sh2. old1<=top sl0 dlo1. sl<target1: clean_hi: hi[0]=2 cnt none; pop2 sh1 push lo -2 sl1. lo heap had stale1? push -2: [-2,-1] top val2 live. end clean_lo val2 no; clean_hi hi [3] dhi none? dhi no. median (2+3)/2=2.5. Window [3,2] sorted [2,3] median2.5. Good.

Now k=2 [2,1,3]. init sort [1,2] lo1 hi2 med1.5. i2 top1 new3>1 hi[2,3] sh2. old2>top1 -> sh1 dhi2. sl target1 no move? sl1 sh1. end clean_lo top1; clean_hi: hi heap [2(stale),3] top2 cnt dhi2 -> pop2, del. heap top3. median (1+3)/2=2. Window [1,3] median2. Good.

Now k=3 [3,1,2,4]. target2. init sort [1,2,3] lo [-2,-1] top2, hi[3] med2. i3 top2 new4>2 hi [3,4] sh2. old3>top2 -> sh1 dhi3. sl target2 no move. end clean_lo top2; clean_hi hi[0]=3 cnt dhi3 -> pop3, heap top4. median (2+4)/2=3. Window [1,2,4] sorted [1,2,4] median2? Wait k=3 odd median top lo should2. But I used even branch; k=3 odd. res[1]=float(-lo[0])=2. Correct. Stale hi.

Next k=4 maybe.

Now, ensure median for even after moving uses correct hi. Good.

Could there be a bug when `hi` top is stale and `hi` empty after popping stale, but sh>0? Example k=2, after stale hi popped, heap may still have live. If hi heap only stale and sh? Shouldn't. But in code clean_hi end while hi: pop stale. If after popping stale heap empty and sh still? Could happen if all hi entries stale but sh effective live? impossible. But if due to equal value identity confusion, maybe sh positive and heap empty? Let's test: hi has two entries equal x, delayed_hi x count1, sh1 live. clean_hi pops one x (maybe live), delayed0, heap one x. sh1. good. If sh0 and heap stale entries, clean_hi pops all. Good. Then next median if even and sh0? For k even sh target>0, so sh0 impossible after rebalance. Good.

Now, consider if `get_lo = delayed_lo.get` and we delete key, but then in `delayed_lo[old] = get_lo(old,0)+1`, if `old` is not hashable? float hashable. Good.

Now, could there be issue with integer overflow in heap negatives? Python int arbitrary. If nums are floats, -float okay. If nums ints maybe type list[float] but ints okay; -int okay. Median float.

Now, maybe problem asks `Return floats` specifically; our even median for int inputs returns float due *0.5. Odd returns float. Good.

Now, should we use `float('inf')`? not.

Let's consider if input length 200k and k=1000, output list prealloc. okay.

Now, perhaps simpler to use `bisect.insort` and pass easily. But we stick with O(n log n) heaps.

Let's consider if `lo = [-x for x in reversed(first[:target])]` with floats: if x is int, -x int; if x is bool? bool float? okay. If x is `-0.0`, -x -> 0.0? okay. If x is `float('nan')`, -nan nan; heap comparisons with nan can produce weird. Not required.

Now, could stale counts dict grow with float keys that are -0.0 and 0.0? okay.

Now, maybe hidden tests include unsorted random with duplicates. Good.

Now, maybe requirement "Must be efficient: n = 200_000 with k = 1_000 must finish in well under 2 seconds". Our heap lazy with potential heap length 200k may be okay but if stale not cleaned top, heap ops O(log 200k). Let's estimate with CPython heapq: `heappush` loop ~logN, each loop comparisons and swaps in Python. 199k pushes + moves 199k pops + 199k pushes? Actually move pushes too. Suppose every slide move: add push 199k, move pop 199k, move push 199k =597k heap ops. log avg maybe 10-18. 6-11M loops. Plus clean pop stale maybe up to 199k heap ops =3.5M. total 14M loops. Similar to Fenwick but heapq loops more complex. Could be around 2s. But with k=1000, heap length may not grow to 200k? Stale may accumulate, but target 500; if stale values stay below, heap length grows. log 200k 18. 1M heap ops*18 =18M. Could be borderline but likely okay. Need optimize further? Fenwick 14M simple loops. Which is faster? heapq loops in Python have list indexing and assignments, while Fenwick loops also simple. But heapq operations are not in C; `heapq.heappush` is Python function with loop. Bound method local. 1M operations * log ~18M iterations plus function call per heap op. Could be >2s? Need evaluate. Maybe Fenwick 14M iterations + no function call? But find_kth has 18 iterations; update 18. Maybe both borderline. Need ensure under 2s. Could optimize heap approach more? Or use Fenwick with C-accelerated bisect? Hmm.

Alternative: Since k=1000, sorted list with C memmove might be fastest and simpler. But worst-case hidden k maybe larger? But stated k=1000. Could use `bisect.insort`? Let's benchmark mentally: 200k iterations, each `bisect_left` in C? In CPython, `bisect` module uses `_bisect` C functions, yes. `list.pop(idx)` and `list.insert(idx, val)` are C memmove of PyObject pointers. For list length ~1000, average memmove 500 pointers = 4KB. 200k*2*4KB = 1.6GB memory copy. C memmove ~10GB/s ->0.16s plus overhead ~200k Python operations (bisect, pop, insert) maybe 0.1-0.2s. Very fast. Actually `bisect.insort_left` maybe Python function wrapping C? `bisect.insort_left` is Python but calls C `_bisect.insort_left`? Let's check: `bisect.insort_left` is Python function that calls `_bisect.insort_left` if available? The C implementation includes `insort_left`. It may do insert in C. But still Python call. Could be extremely fast. But if k=1000, sorted list median is `window[k//2]` or mean. Complexity O(n k) but k small. The problem explicitly k=1000; O(n k) could pass. But if hidden k=100000, fail. However maybe they require efficient general. We need provide algorithmic efficiency. Heaps/Fenwick O(n log n). But if heaps in Python 200k maybe still pass. Need choose best balance.

Fenwick with precomputed compressed indices maybe deterministic 14M loops. CPython 14M loops maybe ~1s? Let's estimate accurately. A simple Python while loop doing `j += j & -j; bit[j] += delta` maybe 100ns? No, CPython bytecode per iteration maybe ~50-100 ns? Actually CPython executes ~50 million simple ops/sec? On normal PC maybe 20-30 million bytecodes/sec. Each iteration has ~10 bytecodes, so maybe 2-3M iterations/sec? 14M could be 5s. Hmm. Need be careful. CPython 3.11 maybe 50M bytecodes/s? A loop with list access could be 10-20M/s. 14M maybe 1s-2s. But two heap operations maybe more.

Sorted list could be fastest for k=1000, but if they test large k it fails. The requirement says efficient for n=200k k=1000 well under 2s. That might allow sorted list. But they'd expect O(n log k) not O(nk). However with k=1000, O(nk)=2e8 pointer moves in C, okay. But they might set k=10000 to ensure. We need robust. Could implement a hybrid: if k <= some threshold use sorted list, else use Fenwick/two heaps. That ensures speed for k=1000 and correctness for large. But code complexity? We can implement sorted list simple and for large k use Fenwick or two heaps. But final maybe overkill. Need ensure no bugs. Hybrid can use sorted list for k <= 2000, two heaps for larger. For k=1000, super fast. For larger, O(n log n) maybe passes? If hidden large n,k maybe still okay. But two heaps for large k with k large maybe heap ops log k large; okay. Could include hybrid sorted for k <= 2048. But does sorted list with `bisect` handle floats and duplicates. Yes. Could be simpler and pass performance requirement. However if k=1000, sorted list is efficient. But if problem tests k=1000 only, enough. If they expect algorithmic, hybrid robust. Need be careful with sorted list performance: removing old from sorted list via `bisect_left` then `pop(idx)`, then insert new. For k=1000, fine. For k=200k, impossible. Use threshold maybe 2000 or 4096. For k > threshold, use two-heaps. But two-heaps code already long. Including both increases code but can optimize speed. Is it worth? Could just use sorted list and meet specific benchmark. But user says "Must be efficient: n=200_000 with k=1_000 must finish in well under 2 seconds". They might not test huge k. But as expert, we can provide O(n log k) but performance? Hmm.

Let's benchmark sorted list more: For each window (200k) operations:
- `bisect_left(window, old)` C binary search ~10 comparisons, each PyObject float compare in C, fast.
- `window.pop(idx)` C memmove ~500 pointers.
- `insort_left(window, new)` C binary search + insert memmove ~500 pointers + maybe resize? list length fixed but pop frees slot? pop may shrink capacity? List pop at end? Here index middle; list length decreases by1; CPython may not shrink if large? It might resize if new size < allocated/2? With length ~1000, capacity maybe near; pop could not shrink. Insert may resize rarely. memmove C. Python overhead 4 calls. 200k* maybe 2 micro? Could be 0.4s. Very fast. Median compute. This might be best for benchmark. But O(k) memmove; if k=1000 threshold safe. For k=10000, memmove 10GB maybe 1s? maybe still okay? k=10000, 200k*10000 pointers =2e9 pointers=16GB memmove, maybe >2s. threshold 2000 safe.

Could implement sorted list version only and be accepted. But problem explicitly asks efficient maybe expects better than O(nk)? But with k=1000, O(nk) is acceptable. However if they set n=200k k=1000 exactly, sorted list definitely under 2s. But if they set k=100000, fails. We don't know. Hybrid is safest: sorted for small k (like <= 2048) for speed, two-heaps/Fenwick for large. But code length and potential bugs in large path. We have two-heaps path correct. Could include hybrid. But if two-heaps path is slower, threshold ensures small k fast. For large k maybe n smaller? If k large, n=200k, O(n log n) okay maybe. For k=10000, sorted threshold maybe 2000 => use heap path. Heap path heap length up to 200k, heap ops maybe okay. So hybrid best.

Need decide if to include hybrid. The final code can be longer but still single function. Could use sorted path for `k <= 4096` maybe. But for k=1000, sorted path simple. Need import bisect? Standard. If using hybrid, need two heaps code too. More code but acceptable. However potential for bugs in two-heaps if large; but we can rely on our code.

Could instead use Fenwick for large path, maybe simpler than heap? Fenwick with coordinate compression handles large k and is straightforward; no lazy bugs. But performance for large n okay. For k small, sorted. Hybrid with Fenwick maybe easier than two heaps? We can implement Fenwick only; performance maybe maybe pass but for k=1000 sorted path covers requirement. For large path, n=200k, Fenwick loops 14M maybe okay. If k large but n=200k, okay. Could combine sorted small + Fenwick large. That avoids two-heaps bugs? Fenwick correctness simple. But need ensure large path performance if hidden n=1e6? Not specified. Two heaps may be faster than Fenwick for large? uncertain. Could just implement Fenwick for all; maybe pass? But to be safe for requirement, sorted small path fast. Large path Fenwick. Let's evaluate Fenwick large path. For k large (e.g., 100k), coordinate m up to 200k; updates and queries per slide: if k even two kth queries. 14M loops. With Python CPython, might be ~1s-2s. Could optimize further using block decomposition? Maybe two heaps better for large. But if sorted threshold covers 1000, maybe two heaps for large. We already have heap code. Hybrid with heap path maybe okay.

Maybe simplest final: use sorted list only, because benchmark k=1000. But as "efficient" algorithmic, maybe they check k=1000 only. The problem statement likely from coding challenge wanting sliding median efficient; they might run n=200k k=1000. A sorted list with k=1000 passes. But if they have adversarial k=n, sorted list fails time/memory. They explicitly require efficient n=200k k=1000, not all. But they might not test huge k? Hmm.

Need produce best solution. Hybrid sorted + two heaps seems strongest performance for specified and algorithmic for general. But code length large. Let's consider integrating sorted path:
```
def sliding_median(...):
    ... raise
    if k <= 2048:  # sorted window
        from bisect import bisect_left, insort_left
        window = nums[:k]
        window.sort()
        res = [0.0]*(n-k+1)
        half = k//2
        if k&1: res[0]=float(window[half])
        else: res[0]=(window[half-1]+window[half])*0.5
        for i in range(k,n):
            old=nums[i-k]; new=nums[i]
            idx=bisect_left(window, old)
            del window[idx]  # or window.pop(idx)
            insort_left(window, new)
            if odd: res[idx2]=float(window[half]) else ...
        return res
    # else heap path
```
Need `del window[idx]` vs `window.pop(idx)`. `del` maybe faster? Both C. `insort_left` from bisect inserts. For duplicates, `bisect_left` finds first old; okay. If old is NaN? bisect with NaN weird. Not handle.

Threshold: `if k <= 4096` maybe. For k=1000 sorted. If k=4096, 200k*4096 pointers ~819M pointers ~6.5GB memmove, maybe still under 2? Could be borderline. Use threshold 1024 or 2048. k=1000 so threshold 2048 safe. If k=2048, memmove ~200k*2*1024=409M pointers=3.2GB, likely <1s in C? maybe. Use 2048.

But adding imports inside function okay. Need import heapq at top. If sorted path, no heap used but imported okay. Could import bisect at top too. Standard.

Hybrid code final more lengthy. Need ensure two heaps path for k>2048. But if k large 100k, two heaps heap length stale O(n), okay. Could use target and initial sort of first k (O(k log k) 100k okay). For k=200k, initial sort 200k okay. For n-k+1 small, loop few. Good.

Need consider memory of heap path with stale entries. okay.

Potential issue: Hybrid threshold affects correctness not. Use sorted path for `k <= 2048` but if n small? okay. For k=1, sorted path handles. For k large > threshold, heap path. If k large but n maybe 10, sorted path threshold? k<=2048 so sorted handles. Good.

Do we need both heap and sorted? Could use sorted path and skip heap, but hybrid better. Need be careful final answer not too huge? Desired oververbosity 9 but code only. Length okay.

Let's decide final code hybrid or heap only? The problem specifically requires efficiency; two heaps is conceptually efficient. Adding sorted path is micro-optimization for specified. Might be seen as overcomplicated but okay. Need ensure no hidden bug due to sorted path `bisect_left` with floats NaN. Not.

If we include both, we need import `bisect_left, insort_left` maybe top. That's allowed. Could use `bisect` module? `from bisect import bisect_left, insort_left`. Standard.

Let's test sorted path for k even median indices: sorted window length k. For k=2, half=k//2=1; odd false; window[half-1], window[half]. For k=4 half=2; median (window[1]+window[2])/2. For k odd=3 half=1? 3//2=1; median window[1]. Good. For k=1 half=0. Good.

Sorted path removal: `pos = bisect_left(window, old); window.pop(pos)`; if old is float and duplicates, pop one. Good. Insert new with `insort_left(window, new)`. Need output index. Use `out_idx=1`.

Threshold maybe if `k <= 2048` but for k=2048 and n=200k, sorted path likely under 2? Let's approximate: 200k windows; each pop/insert memmove average ~1024 pointers? Actually length 2048, average move ~1024 each, 409M pointers, 3.2GB. CPython list insert/pop also allocate? Might be okay but maybe borderline. Set threshold 1024 to be safe; k=1000 included. For k=1024, memmove ~2GB. Use threshold `if k <= 1024`. Good. If hidden k=2000, heap path. For k=1000 sorted path fast. Maybe threshold 1500? Use 1024 power of two.

However, if k=1000 sorted path uses `insort_left`, which may call `list.insert` after `bisect`? C implementation of insort does insert in C. Good. If `_bisect` not available, fallback Python? In CPython it's available. Could implement manual `window.insert(bisect_left(window,new), new)` but then two Python calls. `insort_left` fine.

Need maybe `del window[pos]` faster than pop returning. `del window[pos]` C. Use `del window[pos]`.

Sorted path code:
```
    if k <= 1024:
        window = nums[:k]
        window.sort()
        half = k // 2
        res = [0.0] * (n - k + 1)
        if odd:
            res[0] = float(window[half])
        else:
            res[0] = (window[half - 1] + window[half]) * 0.5
        for i in range(k, n):
            old = nums[i-k]
            del window[bisect_left(window, old)]
            insort_left(window, nums[i])
            if odd: res[idx]=float(window[half]) ...
        return res
```
Need `odd = k & 1` defined before threshold or inside. Good.

If k=0 invalid.

Potential issue sorted path with `del window[pos]` if `pos == k` due to old NaN? no. If old not found due to floating exact? Since old was in window, bisect_left finds position with equal. For floats, exact same binary value; if duplicates okay. If values are -0.0 and 0.0, bisect treats equal; old present maybe as other, okay. If NaN, no. Not required.

Now, hybrid two heaps path for k>1024. Our heap path currently uses initial sort of first k. For k>1024, okay. But if k=1025 and n=200k, heap path maybe slower but still okay. The requirement k=1000 sorted. If hidden k=2000 maybe heap path O(n log n) maybe okay. Good.

Do we need to adjust threshold for Python version? okay.

Now, code final with imports:
```
from bisect import bisect_left, insort_left
from heapq import heappush, heappop
```

Need maybe if k <= 1024 use sorted; else heap. For n small, sorted path fine. If k=1024 and n=1024, one window, sort, no loop. Good.

Now, two heap path code should not depend on sorted path. Need ensure `odd` defined for both. Use `odd = k & 1` before threshold. For heap path median indices: odd. Good.

Let's think if sorted path threshold could produce memory/time for k=1000 but nums large, yes. `nums[:k]` copy small. `bisect_left(window, old)` requires old in window. Good.

Now, potential issue with sorted path for negative zeros: `window[half-1]+window[half]` could be 0.0 + -0.0? returns 0.0. fine.

Now, let's re-evaluate two heaps path correctness with hybrid; if k>1024, sorted path not used. Good.

Could there be an issue with two heaps path if `k` > 1024 but `n` also > 200k? not.

Now, final code maybe around 200 lines? Actually ~150. Acceptable.

Need ensure no use of `input` or printing. Good.

Now, let's think if there is a better large path: use Fenwick and sorted small, less code than two heaps? Fenwick code maybe simpler and less risk. Hybrid sorted+Fenwick:
```
    if k <= 1024: sorted
    # Fenwick
    coords=sorted(set(nums))
    m=len(coords)
    index={v:i+1 ...}
    comp=[index[v] for v in nums]
    bit=[0]*(m+1)
    for i in range(k): bit[comp[i]] +=1
    for i in range(1,m+1): j=i+(i&-i); if j<=m: bit[j]+=bit[i]
    half=k//2; odd=k&1
    # find kth function with bitmask
```
Fenwick correctness easier; no lazy. Performance for k>1024 maybe maybe. Could optimize with local functions and precomputed comp. For k=1000 sorted path bypass. For large k, Fenwick maybe okay. Which large path is more reliable? Fenwick less bug but perhaps slower. Two heaps path we believe correct and perhaps faster for k large? Let's compare: If k=2000, heap path heap length ~200k stale, log 18. Fenwick coordinate m up to 200k, loops 14M. Heaps: per slide push/pop/move, maybe if move every slide 3 heap ops * 200k * log heap length. But if k=2000, heap length grows to 200k. 600k*18=10.8M heapq iterations, each more complex than Fenwick. Similar. Fenwick queries for even: 2 find_kth (36 loops) + 2 updates (36) =72 loops/slide*200k=14.4M. Similar. Fenwick loops simple; heap operations function calls. Fenwick maybe comparable. But Fenwick uses coordinate compression sort/set and comp list memory. Good. Fenwick can also be optimized to find two adjacent medians in one traversal? Maybe not needed. Could implement Fenwick with raw counts and coordinate map. Need ensure speed with `find_kth` function call overhead. Could inline? More code.

Maybe two heaps large path has no coordinate compression overhead and uses only window size. For k=10000, heap log heap length ~18, Fenwick m ~200k. Similar. If n large, both. Two heap can be tricky but we have it. Fenwick correctness simpler. Need choose final large path. Since we already have heap code, use it. But hybrid with both sorted and heap has duplicate logic; okay.

Could we simplify by only two heaps no sorted? It passes maybe. But sorted small ensures specified. The heap code if hidden large maybe okay. Need maybe not overcomplicate final; but code length okay.

Let's maybe optimize heap path further for large by using a helper `rebalance` function? No, inline.

Now, let's test heap path with `target` constant if k large. Starting `lo` sorted valid. But for large k, `lo = [-x for x in reversed(first[:target])]` creates list. If k=200k, reversed slice, okay. If first sorted ascending, `first[:target]` copy; reversed returns iterator; list comp. Memory temporary maybe first plus lower slice? `first[:target]` creates slice; then list comp. Could avoid slice by using indices: `lo = [-first[i] for i in range(target - 1, -1, -1)]` no slice. For performance/memory. Use that. hi = first[target:] creates slice. Could use `hi = first[target:]` okay. Or to avoid sort copy? Need first copy anyway. For large, memory okay. But optimize:
```
lo = [-first[i] for i in range(target - 1, -1, -1)]
hi = first[target:]
```
Good. For target maybe0? no. For target=1 range(0,-1,-1) yields 0. Good.

Sorted path uses `nums[:k]`.

Now, in heap path, we use `get_lo = delayed_lo.get`. If we assign `delayed_lo[val] = cnt - 1`, okay. But if we delete, then later `get_lo` still bound. Fine.

Could use `try: cnt = delayed_lo[val]` instead of get? Since mostly absent, `get` better. Could use `if val in delayed_lo`? no.

Now, maybe heap path can be optimized by not cleaning both tops at end every slide, but only if stale counts? But need know. Current gets.

Potential bug with `get_lo` bound after deleting many keys: If dictionary becomes empty, get still works. Good.

Now, let's consider if sorted path threshold should be based on `k * (n-k+1)`? For n small, sorted even large k okay. Could if `k <= 1024 or (n - k + 1) * k <= 2_000_000` use sorted. But not necessary. For k large but n-k small, sorted path initial sort k maybe O(k log k), loop few; could use sorted if windows few. But heap path initial sort also. If k=200k and n=200k one window, both sort once. Sorted path returns quickly; heap path initial sort too and no loop. If threshold prevents sorted, heap path still okay. For n=200k,k=100k, loop100k; sorted O(1e10) bad; heap okay. If n=1000,k=500, sorted okay but heap also okay. Fine.

Now, perhaps using sorted path with `insort_left` and `del` inside loop may have O(k) and for threshold 1024 okay. But Python's list `del window[pos]` when pos middle will call `list_ass_slice` maybe C memmove. Good.

Now, one issue: The problem's input `nums: list[float]`, values may be non-unique floats but with very close values. Sorting okay.

Now, let's think if we need to ensure output list length n-k+1 for sorted path; if n==k length1. `for i in range(k,n)` empty. idx? set but not used. Good.

Potential issue in heap path if `k` > 1024 but `n-k+1` maybe 1, res[0] set. Loop empty. Stale none. Good.

Now, should we include comments? Code only but comments okay. Could leave comments minimal. The final code block large; comments maybe helpful but no need.

Let's revisit two-heaps proof for `top = -lo[0]` before add. At end of previous slide we clean lo top. But what if `lo` is empty? target could be 0 if k=0 invalid. For k=1 target1, lo nonempty after clean. Good.

Now, edge with `k > 1024` but initial first sorted, lo/hi sizes. For even k, target = k/2. For odd target=(k+1)//2. Good.

Now, possible issue in heap path: The initial lower and upper halves from sorted window: lower half size target, upper k-target. If there are duplicates and boundary equal, invariant holds. But median for even: top lo (largest lower) and top hi (smallest upper) could be equal; okay.

Now, let's think about if values are all equal. Heap path: duplicates many. Slides: top same. Add to lo (<= top), remove old <= top mark lo. Sizes: if add lo and remove lo, sl unchanged. End clean_lo: top value x with delayed count. It will pop one x. But there are many entries equal. Size_lo target. Clean pops one stale. If add and remove equal, delayed count one each slide. Heap length may grow? Actually end clean pops top stale one, keeping heap length maybe same? If add lo then clean pop one, net heap length unchanged. For all equal, works. For add hi remove hi? In all equal, add always lo because top equal, so no hi. For duplicates, stale top popped often. Good.

If many stale below equal? okay.

Now, test all equal k=2 initial lo one hi one. Slide add equal <=top lo sl2; remove equal <=top sl1 dlo1. sl==target. End clean_lo: top stale pop. Heap lo one entry (new). hi one entry. median. Good.

Now, potential issue with sorted path for all equal: bisect_left old 0, del first, insort. Good.

Now, could `float(window[half])` for `window[half]` int huge convert to float maybe OverflowError if int too large? Type list[float], no. If int huge from input type maybe? Not.

Now, maybe problem requires "Return floats" not list of Decimal. okay.

Let's consider if we can simplify final by using sorted path only. But I think hybrid okay. Need ensure no import conflict. Code final will include hybrid. Need be careful with variable `idx` reused in sorted path and heap path; scope function, but if sorted returns before heap, okay. Use different variable `out_idx` to avoid confusion. In heap path use `out_idx`. In sorted path use `out_idx`. Good.

Now, let's maybe write final code fully and inspect syntax.

```
from bisect import bisect_left, insort_left
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    odd = k & 1
    half = k // 2

    if k <= 1024:
        window = nums[:k]
        window.sort()
        res = [0.0] * (n - k + 1)
        if odd:
            res[0] = float(window[half])
        else:
            res[0] = (window[half - 1] + window[half]) * 0.5
        out_idx = 1
        for i in range(k, n):
            old = nums[i - k]
            del window[bisect_left(window, old)]
            insort_left(window, nums[i])
            if odd:
                res[out_idx] = float(window[half])
            else:
                res[out_idx] = (window[half - 1] + window[half]) * 0.5
            out_idx += 1
        return res

    target = (k + 1) // 2
    first = nums[:k]
    first.sort()
    lo = [-first[i] for i in range(target - 1, -1, -1)]
    hi = first[target:]
    sl = target
    sh = k - target
    delayed_lo = {}
    delayed_hi = {}
    get_lo = delayed_lo.get
    get_hi = delayed_hi.get
    push = heappush
    pop = heappop
    res = [0.0] * (n - k + 1)
    if odd:
        res[0] = float(-lo[0])
    else:
        res[0] = (-lo[0] + hi[0]) * 0.5
    out_idx = 1
    arr = nums
    for i in range(k, n):
       ...
    return res
```

Potential issue in heap path: `half` is computed but unused. Fine. Could remove for heap. But half for sorted. Good.

Now, in heap path, `get_lo` bound before loop. If we use `del delayed_lo[val]`, and later use `delayed_lo[old] = get_lo(old, 0) + 1`, okay.

Potential issue if delayed_lo dict gets large and `get_lo` bound method maybe not updated? Bound method uses current dict. Good.

Now, let's inspect heap loop for `old` classification after `new` pushed. If `new` is equal to top and push lo, top unchanged. If `new` is less, top unchanged. If `new` is NaN? ignore. Good.

Now, what about if `lo` top is stale but `sl` > 0 and end clean previous failed to pop because `get_lo` bound method returns None? Could happen if stale entry was marked in delayed_lo but key value differs due to `-lo[0]` vs stored value? We store `val = -lo[0]`. For lo heap stores negative of values. Mark removal stores `old` positive. If heap value `-new`, clean val=-lo[0] returns value. Good. If values are `-0.0`, storing old `-0.0` and heap stores `-(-0.0)=0.0`, val=-0.0? Let's check: heap stores negative of value. If value is -0.0, -value = 0.0. heap[0] maybe 0.0. `-lo[0]` = -0.0? In Python, `-0.0` is -0.0. Mark old = -0.0. dict key -0.0 equals 0.0? Hash? float -0.0 equals 0.0, hash same? I think yes. If heap stores 0.0 for -0.0, val = -0.0? Actually -0.0. key equality okay. If value 0.0, heap stores -0.0, val = 0.0? `-(-0.0)` = 0.0. Good.

Now, if `nums` includes `float('inf')`, mark old inf, heap stores -inf for lower. clean val = -lo[0] = inf. dict key inf. okay. For hi, heap stores inf. clean val inf. okay.

Now, possible performance issue: In heap path, for each slide we always do end clean `while lo:` and `while hi:`. If delayed dict is empty, get returns None, one iteration each. That's 400k dict gets. okay. If many stale at top, clean may pop. Good.

Could `while lo` after moving `sl>target` pop stale and then end clean pop more. Good.

Now, could there be a case where `sl > target` but after clean_lo, `lo` top live but is actually a stale entry because delayed count was for equal value but count zero due to previous popping live; as discussed value indistinguishable. okay.

Now, let's think about using `float(-lo[0])` for odd after heap end clean. If lo top is stale? end clean ensures top not in dict. But if stale entry without delayed count due to identity, treated live. Value correct. Good.

Now, let's maybe test a scenario with two heaps path manually for all equal k=1025? target513. Initial lo 513 equal, hi 512. Slide add equal push lo sl514, remove old equal sl513 dlo1. sl target. end clean_lo top equal cnt1 pop one. lo heap length? initial 513 + push - pop clean =513. hi 512. Good. If many stale below? Since top equal and count each slide one, clean pops one each slide, no accumulation. Good.

Scenario values increasing: k=3 target2. Window sliding increasing [1,2,3,4,5]. Initial lo[1,2] hi[3]. Slide add4 hi, remove1 lo: sl1 move3 to lo: lo[2,3], hi[4]. Stale? none. Slide add5 hi, remove2 lo: sl1 move4: lo[3,4], hi[5]. No stale because removed lo top? remove2 not top; mark stale below. But clean top not stale; stale2 remains. Slide add6 hi, remove3 lo top? top lo=3, mark stale3. end clean_lo top3 pop. Stale2 below. lo heap [4 live,2 stale,?]. median top4. Heap length grows by1 per slide? Let's track: after slide2, lo heap had stale2 plus live3,4? length3. Add6 hi, remove3 lo mark. sl? target2; after add hi sh? start sl2 sh1. add hi sh2, remove lo sl1. sl<target move hi top4 to lo: push4; lo heap before [3 stale,4 live? and2 stale? Actually after slide1 move3 to lo, lo heap [3,2] (2 stale? remove1 marked stale1? Wait initial remove1: lo heap [2,1stale], move3 -> [3,1stale]? 2? Let's not). Add6, remove3 mark, move4 to lo, push4; heap length +1. End clean_lo top maybe4 live, stale3 below. Heap length grew. Stale small below. So heap length can grow O(n). okay.

Heap operations log length maybe up to 200k. okay.

Could we reduce heap length by cleaning stale non-top? No. But okay.

Now, if k small sorted path avoids heap for k=1000. For k=1025, heap length could grow 200k, heap ops 200k*18; maybe okay. If hidden k=2000, also. Good.

Now, maybe there is an even faster algorithm for k=1000 sorted path but large path could be Fenwick. Fine.

Let's consider if sorted path threshold 1024 but `bisect_left` and `insort_left` with floats maybe if old value not exactly found due to floating operations? The window contains the exact old value as it was inserted; no arithmetic transforms. Duplicates okay. If values are `nan`, bisect may find arbitrary but `old` nan not comparable; del could fail? not.

Now, final answer code block. Need no analysis in final. Ensure no mention. Good.

Double-check final code indentation. Use 4 spaces. Use f-string in ValueError? Simple string. okay.

Let's consider if imports at top accepted. Yes.

Now, could `del window[bisect_left(window, old)]` raise IndexError if `bisect_left` returns len(window) due to old NaN or because old not in window? If algorithm correct no. For safety, could use `pos = bisect_left(...); window.pop(pos)`; same. If old not found due to NaN, no guarantee. Not required.

Now, if k <= 1024 and n very large 1e6, sorted O(1e9) pointer moves maybe slow, but problem n=200k. okay.

Now, perhaps final code with hybrid is longer and might be viewed as not "single solution" but okay. Could remove sorted path to keep simpler. But requirement efficient n=200k k=1000: sorted path guarantees. Need two heaps path maybe untested for k>1024; but if hidden k large, correct.

Let's perhaps verify heap path for k=1025 with random small using logic? okay.

Potential bug: In heap path, after sorted initial, `lo` is valid min-heap of negatives. But `hi = first[target:]` sorted ascending valid min-heap. Good. But if target=0? no. If k=1 sorted path, heap path not. If threshold were 0, no.

Potential bug: `target = (k + 1) // 2`; `half = k // 2`. For k odd, target = half+1. For heap median odd lo top. For sorted median odd window[half]. Good.

Potential bug: In heap path even median, after end clean, if `hi` empty? For k even >1024, target = k/2 >=513, sh = k-target = target >0. So hi nonempty. Good.

Potential bug: In heap path, when `sl < target` and `hi` empty after cleaning stale, `pop(hi)` fail. Could this happen if target <= sl+1 and sh live? If sl<target, sh = total - sl = k - sl. target = ceil(k/2). If k even target=k/2, sl <= target-1 => sh >= target+1? Actually total k fixed; sh = k-sl > k-target = target. So sh positive. If k odd target=(k+1)//2, sl<target => sh > k-target = floor(k/2) >= target-? For k=3 target2, sh >1 -> at least2. Positive. So hi live count positive, heap not empty after pruning stale. Good.

Potential bug: When clean_lo before move and it pops stale top, could heap become empty while sl>target? sl>target >=? For k even target k/2, sl at least target+1 positive. Live lo count positive. So heap not empty. Good.

Now, possible issue with stale entries and heap length: clean_lo while top stale might pop many stale entries; if many stale top equal and count high, while loop pops them. It does not adjust sl. Good. But if count high and stale top equal but there are live equal entries, it may pop some live and leave stale. Values equal. okay.

Now, let's consider if using per-heap delayed with value indistinguishable could violate per-heap size counts if clean_lo pops live value x and delayed count consumed, leaving stale x. Size_lo still counts x as live. Later if we remove x from lo, we mark delayed_lo x. There is stale x without count now. We decrement sl. Now heap entries x count maybe same, delayed count one. Effective live x maybe? It may still correspond. Fine.

Now, could delayed_lo count become negative? If we clean_lo top x with cnt from get, pop and decrement/delete. No negative. If mark removal and then clean same slide maybe. Good.

Potential bug: `cnt = get_lo(val)` and if `cnt` is 0? We delete zeros, but what if dictionary key exists with count 0 because we didn't delete when cnt==1? We do delete. Good.

Now, if we use `get_lo` bound and then `del delayed_lo[val]`, but later in same while loop `cnt = get_lo(val)` again, returns None if no count. If next top same stale with no count, we break, treating it live. As discussed okay. But could this leave a stale entry with delayed count not consumed elsewhere? Count was consumed by popping a live equal entry; stale equal remains but considered live. Since values equal, okay.

Now, maybe there is a rare issue when values are distinguishable by side (lower vs upper) but equal values across boundary. If we treat a stale lower equal as live, it can move to upper, and a live lower equal treated stale? Since equal, boundary values arbitrary. The invariant all lower <= upper holds with equality. Good.

Now, if values are floats with `-0.0` and `0.0`, equal. okay.

Now, final answer. But let's think if there is a simpler way to guarantee under 2s: sorted path only. Hybrid code maybe large but okay. Could hidden grader inspect complexity? They just run tests. Hybrid passes.

Need maybe ensure `bisect_left` import not shadowed. Good.

Now, consider if input `nums` is empty and k=1: n=0, k>n raise. If k=0 and nums empty: k<1 raise. Good.

Now, if `nums` contains `Decimal`? Type float not. `Decimal` comparison with float may error? not.

Now, final code block only. Need no analysis. final. We'll provide code with comments maybe minimal. Ensure code is self-contained.

One final possible bug in sorted path: For k=1, `half = 0`, odd true, res[0] = window[0]. In loop, after del and insort, median window[half] correct. `insort_left` from bisect. Good.

Now, maybe use `window.insert(bisect_left(window, nums[i]), nums[i])` instead of `insort_left`? insort_left uses `list.insert` with C. Fine.

Potential issue: `insort_left` may not be available in some restricted environments? It's standard. `bisect_left` and `insort_left` imported. Good.

Now, maybe if `k <= 1024` but `n-k+1` huge, list res prealloc. Good.

Now, think about memory of heap path: `first = nums[:k]`, then `lo` and `hi` duplicate elements; first can be released? first remains until function end. Could delete first to save memory: `del first` after lo/hi. Not necessary but can. If k=200k, first 200k plus heaps 200k duplicates ~400k entries, okay. Could `first` be large and memory okay. Add `del first` maybe. Do it.

In heap path after hi slice: `del first`. Good.

In sorted path `nums[:k]` window copy. okay.

Now, final code:
```
from bisect import bisect_left, insort_left
from heapq import heappush, heappop

def sliding_median(...):
    ...
```

Let's ensure no non-ASCII? okay.

Potential concern: In heap path, if `k` large but n-k+1 small, `lo[0]` exists. yes.

Potential concern: If all numbers sorted and stale below, heap top live but `sl` counts live; heap length can be > sl+sh. When `sl>target` and clean_lo top live, we pop top live. But what if there is a stale entry larger than top but delayed count was consumed by popping live equal? Then stale larger but no delayed count? If stale larger, it would be top and no delayed count, treated live. So top live (conceptually maybe stale). Pop it; size--. This effectively removes a stale from heap but treats as live, and another live stale elsewhere remains; size counts. Value multiset okay? Need maybe formalize counts by value: For each heap, size = number of entries - number of delayed counts (conceptually). Clean_lo when top x and delayed_lo[x]>0: pop entry, decrement delayed. This reduces entry count, delayed count, size unchanged. If top x and delayed count=0: pop entry in move, size--. If the popped entry was conceptually stale but delayed count zero because a previous equal pop consumed live's delayed, then delayed count before pop zero, entry count and size both reduce. Conceptually live count? Before: entry count E, delayed D, size=E-D. There may be stale entries without delayed counts due to identity swaps, but the pair (E-D) represents live count. Popping an entry without delayed reduces both E and size, preserving live count for that side. It may correspond to a live entry, okay. If it was actually stale, then we had delayed count elsewhere? But delayed count zero. The multiset of values represented by E-D is correct; popping any entry and decreasing size maintains E-D. For median values, top after pop maybe same. This is a multiset operation: we only need counts per value and live counts. Identity irrelevant. Good.

Now, what about clean_lo with delayed count: E--, D--, size unchanged. Good. Move without delayed: E--, size--. Push to other heap: E++, size++. Remove mark: size--, D++ (entry count unchanged). This preserves per-heap multiset size E-D = live count, and heap entries with value distribution minus delayed distribution. Clean only removes top if delayed. This is exact multiset representation if top value has delayed count >0. If top value has no delayed count, we cannot pop as stale; must be live. If identity swaps make a stale with no delayed and live with delayed? But counts per value D represent number of entries marked stale, not identity; if top value x and D>0, at least one stale among top? If top entries all x and D>0, popping any x is okay because counts. If D for x >0 but top value y not x, cannot pop stale y; stale x below. We don't need to pop stale y. So representation correct. Identity confusion with equal values okay because counts per value. Good.

Now, one more correctness point: In remove classification, we mark delayed in side and decrease size. We rely on multiset count in that side having at least one entry of that value not already delayed. If we classify o<=L and o<L, there is live value o in lo; thus entry count for o in lo > delayed count for o? Since live count for value maybe. Mark delayed increases D; E-D live decreases. Good. If there are delayed entries for same value, still live count positive by invariant. If classify o>L, live in hi. Good. So counts not negative. Good.

Now, final. Use `del first` after heaps. Also maybe if `k > 1024` and `target` maybe huge, `lo` list comp with range. okay.

Could there be an issue if `first` sort is in-place and `nums` is tuple? Type list. If tuple, `nums[:k]` works, sort on copy. okay.

Let's maybe remove comments to keep concise. Final code only. Ensure no trailing spaces.

One last thought: The threshold sorted path uses `insort_left` which by default inserts after existing? For lower half with duplicates, sorted list order not important. `insort_left` fine. Removal `bisect_left` pops first occurrence. Good.

Now, final answer with code block. Need no tests. Done.
