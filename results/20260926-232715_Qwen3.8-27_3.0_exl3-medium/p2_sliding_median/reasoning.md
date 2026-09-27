We need answer with only python code block. Need solve sliding median efficient. Need think deeply. Need standard library only Python 3.11. n=200k, k=1000. Need well under 2 sec. Need algorithm O(n log k) perhaps okay in Python? 200k * log 1000 ~ 2M operations, but heap with lazy deletion maybe okay. But median sliding with even k needs two middle values. Need robust.

Options:
1. Two heaps (max-heap lower, min-heap upper) with lazy deletion. Maintain sizes. For each slide, add new, remove old lazily. Need median from tops. Complexity O(n log k). Python heap operations with floats and tuples. Could be acceptable. Need handle duplicates and lazy deletions. Need validate k.

2. Sorted list via bisect insort? O(n*k) bad.

3. Two sorted heaps with counts dict. Need efficient. Use heapq. Maintain low (max heap with -x), high (min heap). Each heap elements as (value, unique_id) maybe to handle duplicates? Lazy deletion with counts dictionary by value. But floats can be negative; maxheap store -x. If using value as key, duplicate removal okay. But stale entries remain. Need clean top while count[value]==0. However if value duplicates, count tracks number of valid occurrences in that heap? Need assign each element to low or high, and deletion marks from respective heap. We can maintain two dicts: low_counts, high_counts? Or one dict per value with total valid? Need know which heap a stale top belongs to. If only total counts, stale in either heap can be removed when count zero, but if value appears in both heaps, count >0 while one heap stale? Example value 5 in low and high, remove one 5, count goes 1, but stale low top 5 remains because count >0. If clean only checks count zero, stale won't be removed. So need separate counts per heap or use unique ids with expired set.

Approach with unique IDs: maintain two heaps of (value, id) for high (min) and (-value, id) for low. Maintain active boolean or id -> value, or set of expired ids. On add assign id, push to appropriate heap. On remove expired id add to removed set. When cleaning top, pop while id in removed set. This handles duplicates exactly. Need keep sizes (number active in each heap). Balance after add/remove? We can add new to high or low, then balance; remove old by if id in low? Need know which heap each id belongs to. We can maintain id_heap membership? Could store id_to_heap? Or when adding to low, push to low; if remove id that belongs to low, decrement low_size. Need know membership. Maintain dict id -> heap? For n 200k, dict of 200k ints okay. But could avoid by using value counts with per-heap counts.

Alternative: use two heaps and lazy deletion with counts per heap values. Each element assigned to low/high. low_counts[value] and high_counts[value]. On add x: if low empty or x <= -low[0], push -x to low, low_counts[x] +=1, low_size +=1; else push to high... But need balance. On remove x: decrement count of heap where x is. But how know which heap? If x could be in both, we need know which instance. Could maintain counts total? If remove old x, if it was in low, decrement low_counts; if high, high_counts. Need know. We can infer? Not reliably if duplicates. Need track membership per element. Unique ids easiest.

But unique ids plus heaps: Need efficient memory. n=200k only, ok. But per iteration push new, lazy pop stale. Removed set could grow O(n), but okay. Could clean when needed. For each slide, after add and remove, balance may require moving tops. Need median:
- if k odd: median = (lower max + upper min? if low size = k//2+1, high size = k//2, median low top). But if balanced such that low size >= high size and sizes differ by at most 1. For even k, median = (-low[0][0] + high[0][0]) / 2. For odd, low top.

Need ensure both heaps non-empty for median. For k=1, high empty. median low top.

Implementation details:
```
def sliding_median(nums, k):
    if k < 1 or k > len(nums): raise ValueError
    n = len(nums)
    low = []  # max heap as (-x, id)
    high = [] # min heap (x, id)
    low_size = 0
    high_size = 0
    removed = set()
    id_counter = 0
    id_heap = {}? # id -> 0 low, 1 high maybe
    result = []
    def clean_low():
       while low and low[0][1] in removed:
          heapq.heappop(low)
    def clean_high(): ...
    def add(x):
       nonlocal id_counter, low_size, high_size
       id_counter += 1
       if low_size == 0 or x <= -low[0][0]:
          heapq.heappush(low, (-x, id_counter))
          id_heap[id_counter] = 0
          low_size += 1
       else:
          heapq.heappush(high, (x, id_counter))
          id_heap[id_counter] = 1
          high_size += 1
    def remove(x, id_)?
```
Need know id of outgoing element. Could precompute window? For each i, outgoing nums[i-k]. Need its id. Since ids assigned in order of sliding? For initial window ids 0..k-1; then each new element gets next id. Outgoing id at step i (i from k to n-1?) is i-k. Since we assign each element at time it enters, in sequence: initial positions 0..k-1 ids 0..k-1; then position k id k, etc. Outgoing at slide to window [i-k+1..i] is element at i-k, id i-k. So we can use id = i-k. Nice no id_heap? Need still know which heap an id belongs to for size decrement. Could use id_heap dict or maybe arrays? Since ids 0..n-1, we can store membership in a list of bool? id belongs low or high, but elements may move between heaps during balancing. Need update membership when moving. Could maintain id_heap as list of int (0/1) length n, but n known. Or dict. List of bytearray? `heap_of = bytearray(n)` (0 low, 1 high). Efficient. Need also `id_value`? Not needed for removal? Need remove by id: add id to removed, decrement size of heap_of[id]. We don't need value. But when balancing moving top from one heap to other, need update heap_of for that id. Also for stale cleanup, we need pop id from removed; can remove from set to free? `removed.discard(id)` after pop. Good.

But we need initial build. Could add first k elements. However adding one by one with balancing O(k log k) okay. But we can do faster: push all initial to high? Need balanced. Simpler add with balance after each maybe O(k log k) = 1000 log okay.

Need balance function: ensure low_size >= high_size and low_size <= high_size + 1? For median. Standard: low should have either equal (even) or one more (odd). If low_size < high_size: move top high to low. If low_size > high_size + 1: move top low to high.
When moving, need clean top before move.
```
def move_high_to_low():
   clean_high()
   x, i = heapq.heappop(high)
   removed.discard(i) # though not removed, active; no
   heapq.heappush(low, (-x, i))
   heap_of[i] = 0
   high_size -= 1; low_size += 1
```
No need removed. But ensure if top stale, clean first.

Add function:
```
def add(x):
   id_counter += 1
   # Need know current low top clean? low_size may include stale? We maintain sizes active, but low heap may have stale not cleaned. low[0] may be stale. For compare x <= low top, need clean_low first.
   clean_low()
   if low_size == 0 or x <= -low[0][0]: push low
   else push high
   balance()
```
But balance may call clean.

Remove function:
```
def remove(id_):
   if id_ in removed: return? No active id not removed.
   removed.add(id_)
   if heap_of[id_] == 0: low_size -= 1
   else: high_size -= 1
   balance()
```
Need balance after removal. But if removed id is top, balance might clean.

Potential issue: `id_counter` starts -1, id=0 for first. n maybe 0? If k > len(nums) raises; if len 0 and k<1 raises? k<1 first. If nums empty and k=1 => k > len => ValueError. Good.

Need ensure for k=1, high empty. add first: low_size 0 => push low, balance no. median low top. Then for each slide: remove old id (low_size 0? wait after remove low_size=0, balance? Let's test. k=1: after initial low_size=1 high=0. Slide i=1: remove id0: removed add, low_size=0, balance: low_size < high_size? 0<0 false; low_size > high_size+1? 0>1 false. Then add new: clean_low sees top stale, pops, low empty; low_size=0 => push low. balance. median. OK.

But need result append after each window. Could build initial then append median, then loop i from k to n-1: remove i-k, add nums[i], append median.

Need cleaning functions:
```
def clean_low():
    while low and low[0][1] in removed:
        heapq.heappop(low)
        removed.discard(low[0][1])? careful order.
```
Use local variables for speed? Need performance. n=200k, k=1000. Lazy removed set grows maybe up to number stale not cleaned. If we discard when popped, set size bounded by uncleaned stale. But if we don't clean often, removed set can grow O(n). Still okay memory. For speed, `if low and low[0][1] in removed: heapq.heappop(low); removed.discard(popped_id)`. Need avoid function call overhead? Could inline? But code clarity okay. But 200k * several heap ops maybe okay under 2s? Need optimize.

Python with heap O(n log k) 200k*10 ~ 2M heappush/pop, set lookups. Should be okay maybe ~0.5-1s? But nested functions with nonlocal may be slower. Need write efficient enough.

Alternative using `heapq` with two heaps and lazy deletion by value counts? Unique id with bytearray and set likely fine.

Could optimize initial window: instead of adding one by one with balance, maybe build two heaps by sorting? But k=1000 small. But for n=200k, k could be 1000 exactly. Adding 1000 trivial. If k large (e.g., 100k) O(k log k) maybe okay? Constraint n=200k, k=1000 specified but general? Need efficient for n=200k k=1000. If k large 100k, O(n log k) ~ 3.4M heap ops, okay maybe. But initial adding one by one O(k log k) maybe 1.7M for k=100k, still okay? Maybe. But could do O(k) build: push all to high with ids, then sort? Simpler not needed.

Potential correctness issue with balancing and stale tops. Let's simulate.

Define invariant: low_size/high_size active counts. low heap contains active plus stale; high same. `heap_of` for active and stale? For stale, heap_of still original; when popped from heap, we can leave. When moved, update.

`balance`:
```
def balance():
    if low_size < high_size:
        clean_high()
        x, i = heapq.heappop(high)
        heapq.heappush(low, (-x, i))
        heap_of[i] = 0
        high_size -= 1; low_size += 1
    elif low_size > high_size + 1:
        clean_low()
        x, i = heapq.heappop(low)
        heapq.heappush(high, (x, i))
        heap_of[i] = 1
        low_size -= 1; high_size += 1
```
After one move, invariant restored? If difference >1? Should not be >1 after add/remove? Add can make low high by at most 2? Suppose before balanced, add to low => low = high+2 => move one. Remove can make high = low+1? remove from low => low=high-1 => move high to low. One move enough. But if stale? active sizes reflect. Good.

`add`: Need compare with low top. If low_size >0 but low top stale, clean_low. If low empty after clean but low_size should be 0? Wait low_size active count may be >0 even if low heap top stale? Could all active low elements be below stale top? clean will pop stale until active top. If low_size >0, low heap must contain active elements; clean will find one. If low_size==0, clean can pop all stale and low empty. So:
```
clean_low()
if low_size == 0 or x <= -low[0][0]: push low else high
```
Need update id_counter. Use local variable maybe.

`remove(id_)`: Add to removed. But what if id_ already removed? In sliding, each id removed once. Good.
```
removed.add(id_)
if heap_of[id_] == 0: low_size -= 1 else high_size -= 1
balance()
```
But if the removed id is not active? It is active. Good.

Median:
```
clean_low(); clean_high()
if k % 2 == 1:
    result.append(float(-low[0][0]))
else:
    result.append((-low[0][0] + high[0][0]) / 2.0)
```
Need for even k, high non-empty. For k=2 after balanced low_size=1 high_size=1. Good.

But need return list[float]. If nums ints, floats? For odd, -low[0][0] might be int if input ints; spec list[float], return floats. So cast `float(...)`. For even division returns float. For odd, use `float(-low[0][0])`.

Potential issue with `-0.0`? float(-(-0.0))? If x=-0.0, -x=0.0, median -0.0? Not important.

Performance: nested functions nonlocal variables. Could be okay. But to be safe, implement without too many function calls? We can write loops with helper clean as local functions. Function call overhead for each add/remove maybe 400k calls; okay? Could be ~0.1s. But we can optimize by inlining clean loops in add/remove/balance? Maybe too complex. Need robust.

Could use two `heapq` heaps with entries as tuples. For max heap, storing `-x` for floats. If x = nan? Not specified. Comparisons with nan? Ignore.

Need handle large ints? list[float] but could be ints. Heap entries floats? If x int, -x int. Fine.

Memory: heaps contain up to k active + stale not cleaned. Stale could accumulate if not cleaned. But we clean tops whenever add/balance/median. Stale elements not at top remain until they reach top. Total heap size could grow O(n) if many stale not at top? Let's analyze. Each step add one, remove one. Stale elements are removed elements. They remain in heap until popped from top. In worst case, many stale elements not at top can accumulate, total heap size O(n) maybe 200k, okay memory. But heap operations on size O(n) rather than O(k) could degrade to O(n log n) if stale accumulate. Is that possible? For sliding median, removed elements can be anywhere. If we only clean top, stale entries can linger. Total heap size may grow to n. 200k log 200k ~ 3.6M, still okay. But could be more? Each element pushed once, popped at most once from heap (when cleaned or moved? moved doesn't pop? It pops from one and pushes to other; same id can be moved multiple times? Could an active element be moved back and forth many times? Possibly. But each balance move pops/pushes. Number of moves O(n). Heap size can be O(n). 200k okay. But if k=1000, stale may not top for long; heap size maybe n. log 200k ~18, still fine. But need under 2s. 200k pushes + 200k pops for cleanup + moves ~ maybe 1M heap ops. Good.

Could we bound heap size to O(k) by more aggressive removal? Unique id no. Could periodically rebuild? Not needed.

Alternative: use `bisect` with two sorted lists? For k=1000, n=200k, O(n*k) = 200M, too slow.

Another efficient approach: use `sortedcontainers` not stdlib.

Need consider Python 3.11 standard library. Use `heapq`, `typing`? No imports besides heapq. Could omit type hints? Function signature required. Use `list[float]` okay.

Potential bug: In `add`, if we push to low based on low top but low_size maybe >0 and low top stale not cleaned? We clean. Good.

Potential bug: When moving high to low, high top might be stale if high_size > low_size. clean_high before pop. Good. When moving low to high, clean_low.

Potential bug: After remove, if removed id was the only active in heap but heap top stale? balance clean. Good.

Let's test mentally with small cases.

nums=[1,2,3], k=2.
init add 1: low [( -1,0)] low_size1. median? not yet.
add 2: clean low top 1, x=2 >1 push high [(2,1)] high_size1. balance low_size=1 high=1. median (1+2)/2=1.5.
slide i=2: remove id0: removed{0}, low_size0, balance: low_size<high_size (0<1): clean_high top id1 active, pop high, push low (-2,1), heap_of[1]=0, high_size0 low_size1. add 3: clean_low top id1 active (not removed), x=3 >2 push high (3,2), high_size1. balance 1/1. median (2+3)/2=2.5. OK.

nums=[3,2,1], k=2.
add3 low. add2: x<=3 push low size2, balance low>high+1 (2>1): clean_low top 3, pop push high 3, low now top 2, sizes 1/1. median (2+3)/2=2.5.
slide remove id0 (3) which is in high (heap_of[0]=1), high_size0, balance low_size1 high0 no. add1: clean_low top 2, x<=2 push low size2, balance move low top 2 to high, low size1 (1), high size1 (2). median (1+2)/2=1.5. OK.

Duplicates: nums=[1,1,1], k=2.
add1 low id0. add1: x<=1 push low id1 size2, balance move top? low heap has (-1,0),(-1,1); heappop gets id0 (smaller tuple? (-1,0) < (-1,1)), push high id0. low id1. median 1.
slide remove id0: id0 in high, high_size0, balance low_size1 high0. add1: clean_low top id1 active, x<=1 push low id2 size2, balance low>2? low_size2 high0 => move top low. low heap has (-1,1),(-1,2); pop id1 push high. low id2 high id1. median 1. OK.

What if removed id in low but not top, low_size decremented. Later balance? Suppose low_size still >= high. Stale sits. add compare low top active? If stale not top, okay. If stale becomes top, clean.

Need ensure `heap_of` length n. If n large 200k, bytearray fine. But if we use `bytearray(n)`, values 0/1. For id_counter from 0 to n-1. Good.

Could avoid `id_heap` dict by bytearray. Need know n before allocate. `n = len(nums)`. If k invalid raise before allocate? Yes.

Implementation with local variables for speed:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    low = []
    high = []
    removed = set()
    heap_of = bytearray(n)
    low_size = 0
    high_size = 0
    next_id = 0
    result = []
    # local bindings
    heappush = heapq.heappush
    heappop = heapq.heappop
    removed_add = removed.add
    removed_discard = removed.discard
    # But removed_add/discard bound before modifications okay.
```
However nested functions need nonlocal. If we bind methods, inside functions use nonlocal? Could write as nested functions with local variables captured. But for speed, maybe implement main loop with inline clean? Let's design efficient code without nested functions? We can create helper functions but local bindings.

Option 1: nested functions:
```
    def clean_low():
        while low and low[0][1] in removed:
            _, i = heappop(low)
            removed_discard(i)
```
But `low` and `removed` from outer; no nonlocal needed for mutation. `low_size` not modified. Good.
`balance` modifies low_size/high_size -> nonlocal. `add` modifies next_id/low_size/high_size -> nonlocal. `remove` modifies low_size/high_size -> nonlocal.
Function call overhead okay.

But Python nonlocal variable access slower than local. Could implement as class? No. Could implement loops with inline helper via while? Maybe not necessary.

Could use lists for sizes: `low_size = [0]`? Not faster. Could use integer variables in while and define no functions? We can write repeated code.

Given constraints, nested functions likely pass. But let's estimate: n=200k, for each slide: remove (set add, balance maybe clean, median clean). add (clean, push, balance). Maybe ~4 clean while checks, 2 heap pushes, occasional pops. 200k* maybe 10 operations. Python can do ~10M simple ops/sec? Under 2s likely. Need be careful with function calls: 400k add/remove + balance/clean calls maybe 1M function calls, could be ~0.1-0.2s. Fine.

But there is a subtle issue: `removed` set may contain ids that have been popped from one heap but not removed from set? We discard when cleaning. If an id is removed, then later moved? Wait if id is removed (stale), it is never active, so will not be moved. It can only be popped from the heap it resides in. We discard then. Good.

But what if id is removed, and before it is cleaned, it is in removed set. If balance moves top from other heap, no issue. If add compares low top, clean_low will pop removed top. Good.

Need ensure when moving active top, it is not in removed. clean ensures. But if top not removed, active. Good.

Potential issue with `heap_of` for stale entries: When an active element is moved, heap_of updated. If later removed, decrement correct heap. If stale element not yet popped, heap_of still its current heap (last active heap). But when it's popped, we don't need heap_of. If a stale element is not top, its heap_of remains. If it was removed, size already decremented. If later? It won't be moved because only active tops are moved. But could a stale element become top of a heap, and balance sees low_size > high_size+1 and calls clean_low before moving, so it will be popped. Good. It won't be moved while stale. Good.

Need consider if low_size == 0 but low heap has stale elements; add cleans low. Good.

Now, can we make it faster by building initial window using heaps directly? Maybe not needed. But initial add one by one with balance may cause many moves. For k=1000 okay. For k=100000, adding one by one could be O(k log k) with moves ~k. Still okay maybe 100k log 100k ~1.7M, plus sliding n-k maybe 100k. Total ~3M heap ops. Under 2s? Possibly. But if k=199999, n=200k, initial 200k heap ops, sliding 1. Could be ~3.6M heap ops, maybe okay but Python might be ~1s-2s. Need maybe optimize initial build to O(k) to be safe.

Can build initial window more efficiently:
- Assign ids 0..k-1, push all to high? Then balance? Or use `heapq.heapify` on lists.
We need maintain active sizes and heap_of. For initial window, we can partition elements into low/high by median? For even/odd. But we can simply push all initial elements into high heap with ids, then move k//2 (or (k+1)//2?) elements to low. But moving from high to low by popping min k//2 times gives the smallest elements to low? Let's see. If we push all to high (min-heap), the k//2 smallest popped are the lower half. For low max-heap, we need largest among lower half as top. If we push popped elements to low as -x, low heap contains lower half. low_size = target_low_size = (k+1)//2 (ceil), high_size = k - target. For odd k, low should have one more: target=(k+1)//2. For even, target=k//2. If we pop target smallest from high, low has target smallest. Good. Then high has rest. This is O(k log k) if pop target; can do O(k) heapify + O(target log k). target up to k/2. For k=100k, 50k pops. Add one-by-one also ~100k pushes + moves ~50k? Similar. But heapify O(k) plus 50k pops maybe faster. Could also sort initial window O(k log k) but no. Maybe use two heaps with all in high then move. Need update heap_of for moved ids. This may be faster and simpler? Need handle k=1: target=1, push all (one) to high, pop to low. high empty.

But we need assign ids and heap_of. For initial all in high: `heap_of[i]=1` for i in range(k). Push `(nums[i], i)`. Then `heapq.heapify(high)`. Then for _ in range(target): x,i=heappop(high); heappush(low, (-x,i)); heap_of[i]=0. low_size=target; high_size=k-target. This gives balanced. Need no removed. Then result append median. Then slide loop ids from 0..n-k-1 removed, new id i+k? Let's index: initial ids 0..k-1. For slide window starting at 1 (end index k), remove id 0, add element at index k with id k. Next remove id1 add id k+1. So loop `for out_id in range(n - k):`? If n-k windows after initial? Total windows n-k+1. Initial window end k-1. Then for end index from k to n-1, out_id = end - k = 0..n-k-1. new_id = end = out_id + k. Number n-k. Good.

This initial build is more efficient and avoids add function for initial. But we still need add for sliding. Could use same `add` function. Need `next_id = k` before loop.

Can we avoid `heap_of` list initialization for all n? `bytearray(n)` zeros. For initial, set high for i in range(k). When moving to low set 0. For new elements, set based on add. For elements never in window? ids beyond current maybe remain 0. But they are not removed before added. When adding, set heap_of[new_id]. Good.

Need be careful: `bytearray(n)` initialized 0 (low). Initial high elements set to 1. If k maybe 0? k invalid. Good.

Add function after initial:
```
    def add(x, new_id):
        nonlocal low_size, high_size
        clean_low()
        if low_size == 0 or x <= -low[0][0]:
            heappush(low, (-x, new_id))
            heap_of[new_id] = 0
            low_size += 1
        else:
            heappush(high, (x, new_id))
            heap_of[new_id] = 1
            high_size += 1
        balance()
```
Remove:
```
    def remove(out_id):
        nonlocal low_size, high_size
        removed_add(out_id)
        if heap_of[out_id] == 0:
            low_size -= 1
        else:
            high_size -= 1
        balance()
```
Need if out_id was already removed? No.

But initial build with all in high then pop target smallest: Does low heap contain lower half, high upper half. Invariant low_size >= high_size? For even target=k//2 equal. For odd target=(k+1)//2, low one more. Good. But low max-heap top is max of lower half. high min top is min of upper half. Good.

Need ensure for even k median average of low top and high top. For odd median low top. Good.

Now, could there be an issue if all initial pushed to high and then target popped: `heap_of` for popped set 0. But high heap after pops contains remaining. low heap built by heappush target times. Complexity O(k + target log target). For k=1000 trivial. For k=200k, target=100k, heapify 200k + 100k pops/pushes ~ maybe okay. But if n=200k, k=200k, no sliding. Under 2s? 100k heap ops maybe fine. But memory heaps 200k.

Could further optimize initial by using `heapq.heapify` on low directly? Another method: push all to low? Not needed.

Potential issue: If k even, target=k//2. Pop target smallest from high. high_size = k-target = target. Good. If k odd, target=(k+1)//2. high_size=(k-1)//2. Good.

Need append initial median. Clean not needed because no stale. But low/high tops active. Use `if k % 2: result.append(float(-low[0][0])) else: result.append((-low[0][0] + high[0][0]) / 2.0)`. For k=1, high empty but odd so okay.

Then loop:
```
    for out_id in range(n - k):
        remove(out_id)
        add(nums[out_id + k], out_id + k)
        # median
        clean_low(); clean_high() # maybe remove/add balance already cleaned? But median needs ensure tops not stale. balance cleans only if move. If no move, top could be stale? Let's analyze.
```
After remove, balance may or may not clean. Suppose removed element not top, sizes remain balanced, no move. Top may be stale? If removed element was top, then heap top stale. balance might not need to move if sizes still okay. Example k=3, low_size=2 high=1. Remove low non-top? sizes low=1 high=1 balanced, no move. If removed low top, low heap top stale, low_size=1 but top stale; active low element below. No move, so median clean_low needed. If removed high top and sizes? high_size maybe 1->0, low_size=2, balanced? low_size > high_size+1? 2>1 true, balance will clean_low and move low to high. It cleans low, not high. high top stale remains, but median needs high top; if high_size>0? after move high_size=1 with active moved, but stale high top may be above active? clean_high needed. So always clean both before median. Good.

After add, balance may clean as needed, but still clean both before median. Could clean both in a combined loop to reduce function calls.

Maybe implement `clean_low` and `clean_high` as inline while in median. But also add/remove need clean for comparisons/balance. Could define functions.

Potential optimization: In `balance`, after moving, no need to clean the other heap. But median cleans.

Need consider if `low_size` or `high_size` can become negative due to removing stale? No.

Let's test with initial build and sliding.
nums=[1,2,3,4], k=2.
init: high [(1,0),(2,1),(3,2),(4,3)] heapify. target=1. pop (1,0) to low. low [-1,0], high [2,1],... median 1.5.
loop out_id=0: remove 0 (low) low_size0 high1 balance low<high: clean_high top (2,1) active, pop push low, high_size0 low1. add 4 id3: clean_low top active 2, x>2 push high (4,3) high1 balance 1/1. median clean: low 2 high4 =>3. OK.
out_id=1: remove 1 (id1 now low? Wait id1 was moved to low in previous remove? Let's track: initial id1 in high. remove id0: balance moved id1 from high to low. heap_of[1]=0. add id3 high. So window [2,4]. remove out_id=1: heap_of[1]=0, low_size0 high1 (id3). balance move high id3 to low. add id? out_id+k=3? But id3 already used? Wait new element index out_id+k = 1+2=3, but id3 was already added in previous slide? That's a bug! Let's examine indexing.

Initial ids 0..k-1 correspond to indices 0..k-1. For slide to window starting 1 (end index k), outgoing index 0 id0, incoming index k id k. For k=2, incoming index 2 id2, not id3. In previous step I mistakenly added id3. Let's recalc: n=4,k=2. Initial ids 0 (idx0),1(idx1). Loop out_id=0: remove 0, add nums[2] with id 2. Then window ids 1,2. Next out_id=1: remove 1, add nums[3] id3. Good. So new_id = out_id + k. For out_id=0, new_id=2. For out_id=1, new_id=3. Good. My previous add id3 was wrong. So track: after first slide low id1, high id2. remove id1 low, balance move id2 high to low, add id3? Wait out_id=1 new_id=3, yes. But window should [3,4]? Actually nums [1,2,3,4], after first slide window [2,3], low id1 (2), high id2 (3). Second slide remove id1 (2), move id2 (3) to low, add id3 (4) high. OK. No conflict.

But note id2 was added previous slide; heap_of[2]=1. Good.

Need ensure `heap_of` for new_id not previously set? It is zero initially. Good.

Now, potential bug with initial build: For k even, low has smallest k/2. For k=2, low id0 (1), high id1 (2). After remove id0, balance moves id1 to low. OK.

Let's test with descending nums [4,3,2,1], k=2.
init high all, pop smallest 1? Wait all values [4,3,2,1], high min-heap pops 1 (id3) to low. low contains 1, high contains 2,3,4. Median should (2+3)/2? Window [4,3] median 3.5? Wait initial window first k=2 is [4,3], not [4,3,2,1]! Oops initial build over first k elements only, not all n. For k=2, high initial only indices 0,1: [4,3]. pop smallest 3 to low, high 4. median 3.5. Good. I used all n. So okay.

Need be careful initial build only first k.

Now, can we further optimize by not using `removed` set but using `deleted` dict? Set of ints fine.

Potential issue: If `nums` contains `float('nan')`, heap comparisons may not be well-defined. Not required.

Potential issue: For very large values, `-x` could overflow? Python float/int arbitrary. If x is int huge, -x fine. If x is float inf, -inf fine. Heap comparisons with inf okay. If x=nan, undefined.

Need think about exact median for even k: mean of two middle values. If values are ints, returning float. If values are -0.0 and 0.0, average 0.0. Good.

Now, let's consider if using initial build by pushing first k to high and popping target smallest correctly handles duplicates and ids. Yes.

Now, performance of `clean_low`/`clean_high` functions:
```
    def clean_low():
        while low and low[0][1] in removed:
            heappop(low)
            removed_discard(low[0][1])? No, need popped id.
```
Correct:
```
            _, i = heappop(low)
            removed_discard(i)
```
But if we bind `removed_discard = removed.discard`, it works. However `removed_discard` local in outer, captured. Good.

But in `clean_low`, `low` is a list from outer. Access to `low` is a free variable, maybe slower. Could pass low as default arg? e.g. `def clean_low(low=low, removed=removed):` but then heappop? Could optimize. But not necessary.

However, if we bind `heappop = heapq.heappop`, inside function, `heappop` is free variable. okay.

Could avoid `removed_discard` if we don't remove from set when popping? Then set grows to n, memory maybe 200k ints ~ 14MB, okay. But set lookup for stale ids remains. If we don't discard, set size O(n) 200k, okay. But if n bigger? Constraint 200k. But not discarding could make set lookups slightly slower due to larger set? Maybe negligible. Discarding requires method call. But set size smaller. Need balance. Use discard.

Could use `removed.discard(i)` directly. Binding `removed_discard` avoids attribute lookup. Good.

Potential issue: When we pop a stale entry in clean, we discard its id. But what if the same id appears in both heaps? It cannot; each id is in exactly one heap (active or stale). When moved, it is popped from one and pushed to other, not stale. If stale, it is only in one heap. Good.

Potential issue: When moving active top, we do not discard id (not in removed). But we call `heappop` and `heappush`. If the id is in removed? clean ensures not. Good.

Need ensure `balance` after add/remove doesn't call clean on heap with size 0? It can. If low_size < high_size, high_size >0, clean_high. If low_size > high_size+1, low_size >0, clean_low. Good.

Let's consider edge cases:
- n=1,k=1. initial high [nums0], target=1, pop to low. result [float(nums0)]. loop range(0) none. OK.
- k=n. initial only, loop range(0). OK.
- k invalid: n=0,k=0 => k<1 ValueError. n=0,k=1 => k>n ValueError.
- All equal. OK.
- Negative numbers. Max heap stores -x; if x negative, -x positive. Comparisons correct. E.g. low top value = -low[0][0]. If x=-5, low entry (5,id). Compare x <= -low[0][0]. Good.

Now, could there be an issue with tuple ordering when values equal? Ids break ties. For max heap low with -x, if x equal, lower id pops first. For high, lower id pops first. This is fine. Movement may prefer older elements. Does not affect median.

Now, possible problem: `heap_of` bytearray values default 0. For initial high elements, set to 1. For popped to low, set 0. For new elements, set based on add. But what about ids that are stale and in high/low; heap_of remains. When they are popped from heap during clean, we don't reset. Not needed. When remove an id, we use heap_of to decrement. But what if the id was moved after being stale? Impossible. What if id was removed but not yet popped, and then we try to remove same id again? No.

Now, could `low_size` become inconsistent if an active element is popped during balance without removing from removed? We pop active and push to other, update sizes. Good.

Let's consider a scenario where top is stale and low_size==0 but low heap has stale. clean_low pops stale until empty. Good.

Now, let's think about alternative: use two heaps with lazy deletion by `deleted` dict counts and no ids. Might be simpler but id approach robust.

Need maybe use `math.fsum`? No.

Now, final answer must be single ```python code block. No tests. Include import heapq. Function only.

But before final, let's thoroughly test mentally and maybe simulate some random small cases by reasoning. Could there be a bug in initial build for even k when low and high sizes equal but low top > high top? If low contains smallest half, high contains largest half, so low top <= high top. For duplicates equal okay.

After sliding, invariant should maintain all low values <= all high values? Does add/remove and balance preserve? Standard two-heap median invariant: every element in low <= every element in high. Does lazy deletion with stale elements affect? Active sets should maintain. Let's verify.

Initial: active low smallest half, active high largest half, invariant.

Add x: We clean low top (active max low). If x <= max_low, push to low. Then low may have size high+2. Balance moves max_low to high. Need ensure invariant after move: The moved element is max of low before move. Since x <= old max_low, and all low <= old max_low. After moving old max_low to high, remaining low <= moved value. High previously had all values >= old max_low? Wait invariant before: all low <= all high. Old max_low <= min_high. Moved old max_low to high, high now contains values >= old max_low. Remaining low <= old max_low. So invariant holds. If x > max_low, push to high. High size may become low+1, balanced? If before low=high (even) or low=high+1 (odd). Adding to high makes high = low+1 or low+2? Let's check. If before odd low=high+1, add high => high=low, balanced, invariant: x > max_low, all low <= x, and x <= other high? Not necessarily x could be > some high, but high is min-heap; invariant requires all low <= all high. Since x > max_low, and all existing high >= max_low, x may be smaller than some high but still >= max_low, so all low <= x. Existing high values are >= max_low; low <= existing high. So invariant holds. If before even low=high, add high => high=low+1, balance moves min_high to low. The moved value is min of high (could be x or existing). Since before low <= all high, moved >= max_low? Actually min_high >= max_low. Moving it to low: new low contains max_low and moved. Remaining high values >= moved. New low max = moved (since moved >= max_low). Invariant holds. Good.

Remove x: We just decrement size, no moving. Invariant remains because removing an element from one set doesn't violate order. Balance may move top from larger to smaller. If high larger (low<high), move min_high to low. Before removal, invariant held. After removal, still. Moving min_high to low: min_high >= max_low? Invariant before move: all low <= all high, so min_high >= max_low. New low max = min_high. Remaining high >= min_high. Invariant holds. If low larger, move max_low to high: max_low <= min_high. New high min = max_low, remaining low <= max_low. Invariant holds. Stale elements not active ignored. Good.

Now, median from active tops after cleaning. Good.

Potential issue: In `add`, compare x <= -low[0][0] after clean_low. But if low_size==0, low may still have stale; clean_low empties. Good. If low_size>0 but low heap empty? Could that happen? Active low_size>0 means there are active elements in low heap. Stale pops only remove stale. So low not empty. Good.

Potential issue: In `balance`, when moving, we pop top after clean. But what if heap is empty while size>0 due to bug? No.

Now, let's think about speed more. We can maybe avoid `balance` function call by inlining? But okay.

Let's write code with nested functions. Need be careful with nonlocal in `balance` and `add`/`remove`. In Python, if we assign to `low_size` inside nested function, need `nonlocal low_size, high_size`. For `next_id` if add uses? We pass new_id, so no nonlocal next_id. Initial next_id not needed. Could omit next_id entirely; new_id = out_id + k. Good.

Code draft:
```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    removed = set()
    heap_of = bytearray(n)
    low_size = 0
    high_size = 0

    heappush = heapq.heappush
    heappop = heapq.heappop
    removed_add = removed.add
    removed_discard = removed.discard

    def clean_low():
        while low and low[0][1] in removed:
            _, i = heappop(low)
            removed_discard(i)

    def clean_high():
        while high and high[0][1] in removed:
            _, i = heappop(high)
            removed_discard(i)

    def balance():
        nonlocal low_size, high_size
        if low_size < high_size:
            clean_high()
            x, i = heappop(high)
            heappush(low, (-x, i))
            heap_of[i] = 0
            high_size -= 1
            low_size += 1
        elif low_size > high_size + 1:
            clean_low()
            x, i = heappop(low)
            heappush(high, (x, i))
            heap_of[i] = 1
            low_size -= 1
            high_size += 1

    # initial window
    for i in range(k):
        heap_of[i] = 1
        heappush(high, (nums[i], i))
    heapq.heapify(high)
    target_low = (k + 1) // 2
    for _ in range(target_low):
        x, i = heappop(high)
        heappush(low, (-x, i))
        heap_of[i] = 0
    low_size = target_low
    high_size = k - target_low

    result = []
    if k % 2 == 1:
        result.append(float(-low[0][0]))
    else:
        result.append((-low[0][0] + high[0][0]) / 2.0)

    def add(x, new_id):
        nonlocal low_size, high_size
        clean_low()
        if low_size == 0 or x <= -low[0][0]:
            heappush(low, (-x, new_id))
            heap_of[new_id] = 0
            low_size += 1
        else:
            heappush(high, (x, new_id))
            heap_of[new_id] = 1
            high_size += 1
        balance()

    def remove(out_id):
        nonlocal low_size, high_size
        removed_add(out_id)
        if heap_of[out_id] == 0:
            low_size -= 1
        else:
            high_size -= 1
        balance()

    for out_id in range(n - k):
        remove(out_id)
        add(nums[out_id + k], out_id + k)
        clean_low()
        clean_high()
        if k % 2 == 1:
            result.append(float(-low[0][0]))
        else:
            result.append((-low[0][0] + high[0][0]) / 2.0)

    return result
```

Need check initial `heap_of` for high: bytearray assignment in loop. For k maybe large, loop okay. Could use `heap_of[:k] = b'\x01'*k`? But need list of entries. Maybe loop also push. Fine.

Potential issue: `heapq.heapify(high)` after pushing one by one is O(k). Could just append tuples then heapify, faster than heappush k times. Use:
```
    high = [(nums[i], i) for i in range(k)]
    heap_of[:k] = b'\x01' * k  # bytearray slice assignment? Need length k. b'\x01'*k.
    heapq.heapify(high)
```
But `heap_of[:k] = b'\x01' * k` works for bytearray. For k=0? invalid. This is faster. But need `high` list. Could do:
```
    high = [(nums[i], i) for i in range(k)]
    heap_of[:k] = b'\x01' * k
    heapq.heapify(high)
```
Then pop target. This avoids k heappush. Good. Need if k large, `b'\x01' * k` memory 1000 or 200k, fine. Or loop assignment. Use slice for speed.

But note `heap_of` is bytearray of length n. `heap_of[:k] = b'\x01' * k` okay. If k==n, all ones. Then move target to low set zeros. Good.

Can we build `high` via list comprehension. `nums` list of floats. Good.

Initial pop target: We use `heappop` and `heappush` to low. Could optimize by collecting target popped and then `low = [(-x, i) for x,i in popped]` then heapify? For target up to k/2. Popping target from high O(target log k). If we instead sort first k? Not. But we can pop target and append to low list, then heapify low at end. That replaces target heappushes with append and one heapify O(target). But we still need target heappops from high. Popping from high modifies high. We can do:
```
    low = []
    for _ in range(target_low):
        x, i = heappop(high)
        low.append((-x, i))
        heap_of[i] = 0
    heapq.heapify(low)
```
This is faster than heappush target times. Need `low` defined before. Good. For target=0? k>=1, target>=1. Good.

Could we partition in O(k) using `heapq.nsmallest`? `heapq.nsmallest(target, high)` returns target smallest, O(k log target)? But it also uses heap. Not needed.

Use `low = []` initial. Good.

Now, after initial, `low` list of tuples. `heapq.heapify(low)`.

Need ensure `heap_of` for high elements not moved remains 1; moved set 0. Good.

Now, `add` and `remove` nested after initial. But `low` and `high` lists used. Good.

Potential issue: `removed_discard` bound to removed.discard. If we use `removed` set in clean, and discard, okay. But if `removed` is empty, method still works.

Potential issue: In `clean_low`, after `heappop(low)`, we call `removed_discard(i)`. If the id was not in removed (shouldn't happen because while condition checked), discard no effect. Good.

Potential issue: In `balance`, after `clean_high`, we assume high non-empty. If low_size < high_size, high_size >0. But high heap could be empty if all active high elements were popped? No. clean only pops stale. If high_size>0, at least one active remains. Good.

Potential issue: In `add`, after `clean_low`, if low_size==0 but low heap not empty? clean_low would pop stale until empty. Good. If low_size>0, low[0] active. Good.

Potential issue: In `remove`, after adding to removed, if heap_of[out_id] indicates heap, but out_id might have been popped from heap already? Can an active id be popped from heap before removal? Only during balance (moved) or clean (stale). If active, balance may move it, updating heap_of. It remains active in other heap. It won't be popped without being moved (and re-pushed). So at removal, it is in the heap indicated by heap_of (unless it was moved and heap_of updated). Good. If it was stale, it would already be removed, but we don't remove same id twice. Good.

Now, think about stale id that was moved before removal? Example id active, balance moves it, heap_of updated. Later removed, correct. Good.

Now, could an id be removed while it is top and then clean not called, and then balance moves top from same heap without cleaning? balance always cleans the heap it pops from. If remove made size imbalance requiring move from same heap, clean will pop stale top. If no imbalance, median clean. Good.

Now, let's test a tricky case where removed top in high but no imbalance, median clean_high needed. k=3. Window values [1,2,3], low has [2,1]? Initial: high all, target=2, pop 1,2 to low, high 3. low_size2 high1. Remove id of 2 (low top?) If remove 2 (low top), low_size1 high1, no balance. low heap top stale 2, active low 1 below. median clean_low pops stale, low top 1, high 3 => median 1? But window after removing 2 and before adding? We add before median. Suppose add 4. Add: clean_low pops stale 2, low top 1, x=4>1 push high. high_size2 low1, balance low<high: clean_high top 3 active, pop 3 push low. low_size2 high1. low has 3,1; high 4. median 3. Correct for window [1,3,4] median 3. Good.

If remove high top 3, low_size2 high0, balance low>high+1: clean_low top 2 active, pop 2 push high. low_size1 high1. high contains 2 and stale 3? high heap before had stale 3 at top? Wait remove 3: high top stale 3, high_size0. balance low>high: clean_low, pop 2 push high. high heap now has stale 3 (top) and active 2. high_size1. median clean_high pops stale 3, high top 2. Add maybe. Good.

Now, add compare low top may be stale if low top stale and low_size not imbalanced? Add always clean_low. Good.

Now, potential issue with initial `heap_of[:k] = b'\x01' * k`: If `k` is large, multiplication creates bytes. Fine. But if `n` is 0? k invalid so not. If k = n = 200k, bytes 200k. Fine.

Could use `heap_of = bytearray(n)` and then `heap_of[:k] = b'\x01' * k`. If k maybe 1, okay.

Now, if `nums` is not a list but sequence? Type hint list, len works. We only index.

Now, maybe we can avoid nested functions for speed by making `clean_low` and `clean_high` inline in `add`, `remove`, `balance`, median. But code longer. Let's see if nested functions with nonlocal can handle 200k under 2s. I think yes. But let's estimate worst-case heap size O(n) and clean pops many. Function calls: For each of 199k slides: remove calls balance (maybe clean), add calls clean_low + balance (maybe clean), median calls clean_low+clean_high. That's ~5 function calls per slide => 1M calls. Python function call ~80ns? Actually ~100ns? More like 100-200 ns? 1M ~0.1-0.2s. Heap ops ~maybe 1M ~0.5s. Should be under 2s.

But nested function free variable access and nonlocal could be slower. Still likely okay. Need maybe optimize by making `k_even = k % 2 == 0` and `if k_even` in loop. Use local `result_append = result.append`. Good.

Add local bindings:
```
    result_append = result.append
    k_even = (k % 2 == 0)
```
In loop:
```
        if k_even:
            result_append((-low[0][0] + high[0][0]) / 2.0)
        else:
            result_append(float(-low[0][0]))
```
This avoids modulo each time.

Could also bind `nums_local = nums`, `heap_of_local = heap_of`? Inside nested functions, free vars. Could use default arguments to bind lists and methods for speed:
```
    def clean_low(low=low, removed=removed, heappop=heappop, removed_discard=removed_discard):
        while low and low[0][1] in removed:
            _, i = heappop(low)
            removed_discard(i)
```
But default args capture at definition. For `balance`, needs low/high/heap_of etc. Could do. But nonlocal sizes still. This can speed free var lookup. But code more complex. Not necessary but can.

Potential issue with default arg `removed=removed`: set object mutable, okay. `heappop=heappop` local. Good.

However, if we define `clean_low` before `low`? We define after low. Good.

Let's consider if using `removed` set with ints and `in` is fast. Yes.

Alternative lazy deletion using `deleted` dict of counts and no ids may be faster? Let's explore. Could maintain two heaps of values only, and `low_del`, `high_del` counts. On add, decide based on low top. On remove old value, need know which heap it was in. Could maintain total counts? We can know outgoing value but not its heap. But maybe we can decide by comparing value to low top? Not reliable with duplicates. Could maintain two heaps with value+index as we do. Good.

Could use `heapq` with entries `(value, i)` and a `heap_id` list. Good.

Now, possible memory/time issue with `bytearray(n)` if n huge (but 200k). Good.

Now, let's think about exact requirements: "Write `sliding_median(nums: list[float], k: int) -> list[float]` that returns the median of every contiguous window of size k (len(nums) - k + 1 values, in order). - For even k the median is the mean of the two middle values. Return floats. - Raise ValueError if k < 1 or k > len(nums). - Must be efficient: n = 200_000 with k = 1_000 must finish in well under 2 seconds on a normal PC."

Need only code block. No tests. Good.

Let's consider if there is a more efficient O(n log k) with `heapq` but using two heaps and active counts. Our code is O(n log n) worst-case due to stale heap size maybe n. But n=200k, log n 18, still okay. Could we bound heap size to O(k) by periodically rebuilding or using deletion by value? Unique id stale can accumulate. In worst-case, stale elements not at top can accumulate to O(n). But heap size 200k, log 200k. 200k slides, each push log 200k ~18, 3.6M comparisons. Fine. Under 2 sec? Python heap of tuples maybe ~0.5 micro per op? 3.6M ~1.8s? Need be careful. But heap size likely around k + stale. For k=1000, if stale accumulate to 200k, log 200k. But number of heap pushes n=200k. Each push log current heap size. If heap size grows to 200k, average log maybe ~17. 200k*17=3.4M. Plus pops. Python 3.4M heap operations on tuples maybe maybe 0.5-1s. Function calls etc maybe under 2. Good.

Can we reduce heap size by cleaning more aggressively? We only clean tops. Stale not top remain. Could periodically rebuild when heap size > 2*k? This would bound heap size O(k) and maybe improve performance. Rebuild cost O(heap_size) occasionally. But implementing rebuild with active ids? Could be useful. However rebuilding requires identifying active elements. We have `removed` set of stale ids. We could rebuild both heaps by filtering heaps for ids not in removed, then heapify. But if we discard stale ids when popped, removed only contains not-yet-popped stale. Active ids not in removed. To rebuild, create new low = [entry for entry in low if entry[1] not in removed], high similarly. But removed contains stale not popped; active not. Then clear removed? Wait if we rebuild by filtering, all stale removed from heaps, so removed set can be cleared. But we must be careful: removed set contains ids of elements that are no longer active. Filtering removes them. Then `removed.clear()`. Sizes already correct. Then heapify. This can bound memory. But rebuilding costs O(heap_size) and may be done when len(low)+len(high) > 2*k maybe. For n=200k,k=1000, if heap size grows to 2000, rebuild maybe many times? Let's analyze. If we rebuild when total heap size > 2*k, cost O(k) each rebuild. Number of rebuilds O(n/k) if stale accumulate to 2k then rebuild. Total O(n) extra. This could keep heap size O(k), improving log factor. But rebuilding in Python list comprehensions maybe cost. For k=1000, n/k=200 rebuilds * 2000 = 400k, negligible. For k=100k, n/k=2, cost 200k, okay. Could be beneficial. But added complexity. Need ensure removed set cleared correctly. If we clear removed after filtering, what about stale ids that were already popped and discarded? Not in removed. Good. Active ids not in removed. Filtering by `i not in removed` keeps active. But what about ids that are active but in removed? Shouldn't happen. When an active id is moved, not in removed. When removed, added to removed. When popped during clean, discarded. So removed exactly stale not yet popped. Filtering removes them, clear. Good.

But if we rebuild, we need preserve `heap_of`? Active ids already have correct heap_of. Stale ids irrelevant. Sizes correct. We can just assign new lists. Need update `low` and `high` variables. If nested functions close over `low` and `high`, reassigning in outer with `nonlocal`? If we do rebuild in outer loop (not nested), we can reassign `low` and `high`. But nested functions `clean_low` etc capture variable names `low` and `high`; if we reassign in outer, closures see new list? In Python, closures capture variables by name, not value, so if `low` is assigned in outer after function definition, nested functions will use the current binding. But if we assign to `low` inside outer (the same scope), it's not nonlocal; it's local in sliding_median. Nested functions can read it. Reassigning `low = ...` in sliding_median updates the cell variable. Good. But if we use default args binding old list, then rebuild won't affect. So avoid default args if rebuilding. Or update default? Simpler no rebuild.

Do we need rebuild? Maybe not. But could improve worst-case. Let's evaluate if stale heap size can really grow to n for k=1000. Consider sequence such that removed elements are always smallest or largest and not top? For low heap (max), stale small elements may never be top if larger active elements above. For high heap (min), stale large elements may never be top. Example nums increasing. Window slides: low tends to contain smaller half? Let's simulate increasing. Initial [1..1000], low smallest 500, high largest 500. Slide remove 1 (low), add 1001 (high). Low loses smallest, high gains largest. Low top maybe 500, high top 501. Stale 1 in low not top. As slides continue, stale small elements accumulate in low; active low values increase, so stale small remain below top? In max heap, smaller values deeper, so they may never be popped until all larger active removed. For n=200k, low heap could accumulate ~100k stale small elements. Heap size O(n). log n. Still okay. Rebuild would keep size O(k). Could be faster. But not required maybe. However "well under 2 seconds" maybe need optimize. Let's think performance of 200k pushes into heap size 200k. `heapq.heappush` with tuple comparisons. 200k pushes * log2(200k) ~ 3.4M comparisons. Python heap operation in C? heapq is Python module, comparisons in Python? heapq implemented in Python (with _heapq C? Actually heapq imports from _heapq C for heappush/heappop? In CPython, _heapq provides C implementations. Yes heapq.heappush/pop are C functions, fast. So 3.4M C-level heap operations maybe very fast. Tuple comparisons in C? For floats/ints, C. So okay. Function calls to C. 200k pushes maybe ~0.1s? Maybe. Lazy clean pops another 200k. Should be well under 2s. No rebuild needed.

But note `heapq` in Python 3.11 uses C _heapq if available. Yes.

Potential issue: Using tuple entries with id int. C heap compares tuple first element, then second if equal. Fine.

Now, let's consider if initial build with `high = [(nums[i], i) for i in range(k)]` and `heapq.heapify(high)` is C? `heapify` C? Yes.

Now, maybe we can further simplify by not using `heap_of` bytearray but a list of bool? Bytearray memory efficient and fast. Access `heap_of[out_id]` returns int. Good.

Potential issue: `heap_of[new_id] = 0` where new_id may be > n? Loop out_id range(n-k), new_id=out_id+k ranges k..n-1. Good.

Now, check initial `target_low = (k + 1) // 2`. For k=2 target=1. For k=3 target=2. Good.

Now, maybe result list length can be large (n-k+1 up to 200k). Prealloc? Could `result = [0.0] * (n - k + 1)` and assign by index to avoid append overhead. Append is amortized and fast. Prealloc maybe slightly faster? Could do:
```
    result = [0.0] * (n - k + 1)
    idx = 0
    ... result[idx] = ...; idx += 1
```
But append is optimized. Prealloc memory okay. Append maybe fine. If want speed, prealloc and local `result_setitem`? Not necessary. But we can use append local.

Now, nested functions defined after initial. But `add` and `remove` use `balance` which uses `clean_low/high`. All defined. Good.

Potential issue: `nonlocal low_size, high_size` in `balance`, `add`, `remove`. But `add` also calls `balance`; `balance` modifies sizes. `add` modifies sizes before calling balance. Good. `remove` modifies sizes before balance. Good.

Could there be a race with `clean_low` using `removed` set while `removed_discard` bound. Good.

Now, let's think about using `float` conversion. For odd median, if value is `int`, `float(-low[0][0])`. If value is `float`, no change. If value is `Decimal`? Type hint float, not. If value is `numpy`? Not standard. If value is `int` huge > 1e308, float conversion raises OverflowError. But spec list[float], so okay. Could return ` -low[0][0]` and it may be int; but requirement floats. Use float.

For even, `(-low[0][0] + high[0][0]) / 2.0` returns float. If values huge ints, sum could overflow? Python int arbitrary, division float may overflow if too large. Spec floats. okay.

Now, possible issue with `-low[0][0]` if low[0][0] is `int` and negative? Works.

Now, let's consider if `k` is not int? Type hint int. If k is bool? bool is int subclass. k=True => 1, k=False => 0 raises. Fine.

Now, maybe need `ValueError` no message? Can include.

Now, let's examine if using `bytearray(n)` when n is huge maybe memory but okay. If n=0 and k invalid, we raise before allocating? Code: n=len(nums); if k<1 or k>n: raise. Then allocate. Good.

Now, potential bug: `heap_of[:k] = b'\x01' * k` if k is large and `heap_of` length n. If k==n, okay. If k<n, okay. But if k=0 invalid. Good.

Now, initial high list comprehension uses `nums[i]`. If `nums` is a list of floats, okay. Could be memory double. Fine.

Now, let's think about whether we can avoid `heap_of` for initial high by using a list of int 1? Bytearray good.

Now, one subtle issue: When we filter stale by `removed` set in clean, we discard id. But if we rebuild and clear removed, what about stale ids that were in removed but already popped? Already discarded. Good. No rebuild in current code.

Now, let's test a random small case manually more systematically maybe by writing conceptual brute? Can't run, but can reason.

Case nums=[5,1,4,2,3], k=3.
Brute windows:
[5,1,4] sorted [1,4,5] median4
[1,4,2] sorted [1,2,4] median2
[4,2,3] sorted [2,3,4] median3
Algorithm:
init high [(5,0),(1,1),(4,2)] heapify. target=2. pop (1,1) low, pop (4,2) low. low entries (-1,1),(-4,2) heapify => top (-4,2) value4. high top (5,0). median4.
loop out_id=0 remove id0 (high) high_size0 low2 balance low>1: clean_low top id2 active 4, pop push high 4, low_size1 high1. add nums[3]=2 id3: clean_low top id1 value1, x=2>1 push high (2,3) high_size2 low1 balance low<high: clean_high top (2,3) active, pop push low, high_size1 low2. low has id3(2), id1(1); high id2(4). median low top2. OK.
loop out_id=1 remove id1 (low) low_size1 high1 balance no. add nums[4]=3 id4: clean_low top id3 value2 (id1 stale below), x=3>2 push high high_size2 low1 balance low<high: clean_high top (3,4) active? high has (4,2),(3,4) top3, pop push low. low_size2 high1. low has id4(3), id3(2); high id2(4). median3. OK.

Case even k=4 nums=[1,3,2,4,5], windows [1,3,2,4] sorted [1,2,3,4] median2.5; [3,2,4,5] sorted [2,3,4,5] median3.5.
init high first4, target=2, pop 1,2 to low; high 3,4. low top2 high top3 median2.5.
remove id0 (1 low) low_size1 high2 balance low<high: clean_high top3, pop push low. low top3, high top4. add 5 id4: clean_low top3, x>3 push high. high_size2 low2? Wait before add low_size2? After balance low_size2 high1. Add high => high2 low2. balanced. high has 4,5 top4. median (3+4)/2=3.5. OK.

Now, consider removing from high when high top stale and low_size high_size? Example k=4, after some operations. Should clean in median.

Now, possible issue: In `add`, if low_size == 0, we push to low. But what if high_size > 0 and low_size 0? This can happen after remove before add? In loop we remove then add. If k=1, after remove low_size0 high0. If k>1, after remove maybe low_size0 high>0, balance will move high to low before add, so add sees low_size at least? For k=2, after remove low, low_size0 high1, balance moves high to low, low_size1 high0. So add sees low_size1. For k=3, after remove low maybe low_size1 high1 or low_size0 high2? Let's see initial low2 high1. Remove low => low1 high1 balanced. Remove high => low2 high0 balance move low to high => low1 high1. So low_size never 0 for k>1 after balance? Maybe if k=2 remove high? initial low1 high1, remove high => low1 high0 balanced. So low_size 0 only k=1. But add handles.

Now, consider if `balance` after remove when low_size < high_size and high top stale. clean_high pops stale. But what if high_size >0 and all high heap entries stale? Impossible because high_size active count >0. But stale entries could be more than active? Yes, but at least one active. clean will find.

Now, let's think about possible integer vs float in heap entries. If nums are floats, tuple first element float. If ints, int. Negative of int is int. Median float. Good.

Now, maybe we can use `math.fsum` for even average to avoid overflow? Not needed. `(a + b) / 2.0` can overflow if a,b huge floats inf? If both inf, inf/2 inf. If a=1e308,b=1e308, sum inf, median inf, but true mean 1e308? Actually 1e308+1e308 overflows to inf, division inf. Could use `a/2 + b/2` to avoid overflow. But spec normal floats. To be robust, use `(-low[0][0] / 2.0) + (high[0][0] / 2.0)`? For negative large? If a=-1e308,b=1e308, a/2+b/2=0. Good. If a=1e308,b=1e308, a/2+b/2=1e308 (no overflow). This is better. But if a and b are ints huge, `a / 2.0` converts to float and may overflow if int > 1e308. But spec floats. Could use `(-low[0][0] + high[0][0]) / 2.0` standard. To avoid float overflow, use `(-low[0][0] / 2.0) + (high[0][0] / 2.0)`. But if value is int huge, float division may overflow? Python int / float converts int to float, OverflowError if too large. `(a+b)/2.0` also converts sum to float. Same. If values are floats, `/2.0` safe from overflow? 1e308/2 = 5e307, sum =1e308. Good. Let's use `(-low[0][0] / 2.0) + (high[0][0] / 2.0)` for even median. But note operator precedence: `-low[0][0] / 2.0` is `(-low[0][0]) / 2.0`. Good. For a=-0.0, -a=0.0. Good.

For odd, `float(-low[0][0])`. If low[0][0] is -inf, -(-inf)=inf. float(inf) inf. Good.

Now, perhaps we should use `result_append(float(-low[0][0]))` for odd. If value is int, converts. If value is float, okay. If value is `decimal`, not.

Now, let's consider if `nums` contains `None`? No.

Now, let's think about code style. Single code block. Include `from __future__`? No.

Potential issue: In Python, `list[float]` type hint requires Python 3.9+. 3.11 okay. Need import `heapq`.

Now, maybe the environment checks only function. Good.

Let's consider if nested functions with `nonlocal` are allowed inside function. Yes.

Now, one subtle bug: `heap_of` is a bytearray. In `balance`, when moving active element from high to low, we do `heap_of[i] = 0`. But if the element was already in low? No, popped from high. Good. When moving low to high, set 1.

Now, in initial build, we set `heap_of[:k] = b'\x01' * k`. Then pop target to low and set 0. Good. But for high list, after popping target, high heap remains a valid heap. Good.

Now, `low` after `heapq.heapify(low)` is max-heap because entries (-x,i). Good.

Now, in `clean_low`, we use `low[0][1] in removed`. If `low` contains tuple `(-x, i)`. Good.

Now, in `balance`, after `clean_high`, we do `x, i = heappop(high)`. But what if `high` is empty due to all stale and high_size >0 bug? No.

Now, in `add`, after `clean_low`, if `low_size == 0 or x <= -low[0][0]`. If low_size >0 but low heap empty? No. If low heap top stale but clean didn't pop because removed set doesn't contain? Then active. Good.

Now, in `remove`, we don't clean before decrement. If out_id is stale? No. If out_id was moved, heap_of correct. Good.

Now, after `remove`, `balance` may move. But what if the removed id is in a heap and is the top, and the heap has stale top (itself). balance may not clean that heap if it doesn't need to move from it. Then median clean handles. But `add` before median? In loop we do remove then add. `add` calls clean_low only. If removed stale top is in high and no balance clean_high, then add may not clean high. Median clean_high. Good. If removed stale top is in low, add clean_low pops it. Good.

Now, what if removed stale top is in high, and add pushes to high based on low top, no clean_high. high top stale remains. median clean_high. Good.

Now, what if removed stale top is in high, and balance low<high pops from high, clean_high pops stale. Good.

Now, what if removed stale top is in low, and balance low>high+1 pops from low, clean_low pops stale. Good.

Now, one possible issue: In `add`, we clean_low and compare. Suppose low_size >0, low top active. But there are stale entries in low below top. Fine. Suppose x <= low top, push to low. low_size increases. If low_size > high_size+1, balance moves max low to high. clean_low will pop stale top if any, but top active (since just pushed maybe). It may move the newly pushed x or existing max. Good. If the newly pushed x is stale? No.

Now, let's think about if using `removed` set and discarding when popping could cause an issue if the same id is in removed and then we pop it in clean, discard. Good. If the id is removed but also in the other heap? No.

Now, potential problem with `removed_discard` bound method: If we clear removed (not in current code), bound method still works. Not using clear.

Now, let's consider adding rebuild to bound heap size. It could make code more complex but maybe safer for performance. Let's evaluate if we should include. Rebuild after each slide? Could check if `len(low) + len(high) > 2 * k + 1000` maybe. But rebuilding with list comprehensions over heaps and `removed` set. Need clear removed. But if we clear removed, what about stale ids that were already discarded? Not in removed. Good. But what about stale ids that are not in removed because they were popped? They are not in heaps. Good. Filtering keeps active. Then `removed.clear()`. But if we clear removed, we lose record of stale ids that have been popped? They are not in heaps, no need. Good.

However, if we rebuild, we must ensure `heap_of` for active elements remains correct. It does. For stale elements, heap_of maybe wrong but irrelevant. Sizes remain. But if we clear removed, and there are stale entries still in heaps? We filtered them out, so no. Good.

Rebuild code in loop:
```
        if len(low) + len(high) > 2 * k:
            low = [e for e in low if e[1] not in removed]
            high = [e for e in high if e[1] not in removed]
            heapq.heapify(low)
            heapq.heapify(high)
            removed.clear()
```
But if we reassign `low` and `high` inside the function (not nested), nested functions will see new lists? Since `low` and `high` are local variables in sliding_median, and nested functions close over them. Reassigning them in the same scope updates the cell. Yes. But if we have bound `low` in default args, no. We won't use default args. However, Python determines `low` is a cell variable because referenced in nested functions. Reassigning in outer after nested function definitions is allowed. The nested functions will use the new binding. Good.

But if we define `clean_low` before `low` reassign? It uses `low` cell. Good.

Potential issue: In `clean_low`, we use `low` and `high` from closure. If we reassign `low` in outer, the closure sees new list. Good.

But rebuilding inside loop after `add` and before median? Need ensure sizes consistent. If we rebuild, no need to clean. But we might have just called clean_low/high for median. Could rebuild before median if heap sizes large. But removed set contains stale not popped. Filtering uses removed. Good. Then clear. Then median no clean needed? Could still clean? Not needed if rebuild. But if no rebuild, clean. We can combine:
```
        if len(low) + len(high) > 2 * k:
            low = [e for e in low if e[1] not in removed]
            high = [e for e in high if e[1] not in removed]
            heapq.heapify(low)
            heapq.heapify(high)
            removed.clear()
        else:
            clean_low(); clean_high()
        # median
```
But `len(low)+len(high)` includes active + stale. If > 2*k maybe rebuild. For k=1000, threshold 2000. Rebuild cost ~2000. Number rebuilds maybe O(n/k)=200. Total 400k list elements processed, fine. Keeps heap log k. This may improve performance and memory. But list comprehensions with `e[1] not in removed` where removed set size maybe up to threshold. Good.

However, reassigning `low` and `high` inside the loop: Since `low` and `high` are used in nested functions, Python makes them cell variables. Reassigning in the same function is okay. But if we also use `low` in the same function before nested functions, no issue. Need not declare nonlocal because we're in the same scope. Good.

But there is a subtle issue: If we reassign `low` in the loop, the `clean_low` function's closure cell is updated. But `clean_low` itself references `low` as a free variable. Yes.

Potential issue: `removed.clear()` after filtering. But what if there are stale ids in `removed` that are not in heaps because already popped? They were discarded when popped, so not in removed. Good. What if there are stale ids in removed that are in heaps, filtered out. Good. Clear safe.

But if we rebuild, we don't update `heap_of` for active? No need. But what about `heap_of` for stale filtered out? It remains, but stale ids won't be removed again. If somehow remove called with an id that was filtered out? No, remove only for outgoing ids that are active before removal. Rebuild occurs after add and before median; outgoing ids already removed. Future outgoing ids are active. Good.

Could rebuild interfere with `removed` set used by clean? Clear removes all stale marks, but stale entries are gone. Active entries not in removed. Good.

Is threshold `2 * k` safe for k=1? len(low)+len(high) active =1. Stale can accumulate. Threshold 2. If >2, rebuild. For k=1, heap size may grow 2, rebuild often? n=200k, threshold 2, rebuild every slide? Let's see k=1: low active 1, high 0. Stale in low. len(low) can grow. After each slide: remove old (adds to removed, low_size0), balance none, add new: clean_low pops stale top (because k=1, stale top always? For k=1, the only low entry is stale, clean pops it, so len(low) becomes 1 after add. No accumulation. So len=1. No rebuild. Good.

For k=2, stale can accumulate. Threshold 4. Rebuild when >4. Fine.

But rebuilding with list comprehensions may be slower than just letting heap grow for small k? For k=1000, rebuild 200 times, negligible. For k=100000, threshold 200000, maybe one rebuild. Fine. For k close to n, no many slides. Good.

However, if we rebuild, we must be careful that `low` and `high` reassignment inside loop invalidates local bindings? We didn't bind `low` local in nested functions? They use closure. In the outer loop, `low` is a local variable. Reassigning is fine. But if we have `clean_low` defined, and inside `clean_low` we do `while low and ...`, Python will look up `low` in closure. Good.

But if we use `low` in the same outer function after reassign, okay.

Potential issue: `heapq.heapify(low)` after list comprehension. Need bind `heapify = heapq.heapify` for speed. Could use.

Should we include rebuild? It adds complexity but may ensure O(n log k). The requirement efficient for n=200k,k=1000. Without rebuild likely fine. With rebuild, more code but robust. Need ensure no bugs. Let's test rebuild scenario.

Suppose after add, len(low)+len(high) > 2*k. removed contains stale ids not popped. We filter. But what about stale ids that are not in removed because they were popped and discarded? They are not in heaps. Good. What about active ids that are in removed due to a bug? No.

After filtering, heap sizes (len) should equal low_size+high_size? Active counts. But stale removed from heaps. Yes. However, if some stale ids were not in removed because they were discarded when popped, they are already not in heaps. So len after filter = active counts. Good.

Then `removed.clear()`. But what about stale ids that are in heaps but not in removed? Impossible. Because stale = removed not yet popped. If popped, discarded and removed from heap. Good.

Now, if we rebuild, we might not need to clean before median. But if threshold not exceeded, clean. Good.

Could threshold check itself be costly? `len(low)+len(high)` O(1). Fine.

But reassigning `low` and `high` in loop means the nested functions `clean_low`/`clean_high` will use new lists. However, `balance` also uses `low` and `high`. Good.

One issue: If we reassign `low` in the loop, the `low` variable in the outer function is a cell variable. But we also have `low` referenced in list comprehensions? In Python 3, list comprehensions have their own scope, but they capture `low` from outer? Actually `[e for e in low if e[1] not in removed]` uses `low` as iterable from outer scope. It will read current `low`. Fine. `removed` set. Good.

Potential issue: If we use `low = [e for e in low if e[1] not in removed]`, during evaluation RHS `low` is old list, LHS assigns new. Good.

Now, does rebuilding preserve heap order? We call heapify. Good.

Now, if we rebuild, we should perhaps also shrink `heap_of`? No.

Now, what threshold? `2 * k` maybe. But active total = k. Stale total can be up to threshold. If len > 2*k, rebuild. For k=1000, max heap size 2000, log 11. Good. For k=1, active 1, threshold 2. Fine. For k=0 invalid. Could use `2 * k + 1` to avoid rebuild at exactly 2k. Not important.

But if k is large, `2*k` may be 400k for k=200k, but len max n=200k, no rebuild. Fine.

Would rebuilding be triggered too often if k small and stale accumulate slowly? For k=2, threshold 4. Active 2, stale can accumulate to 2 before rebuild. Rebuild every ~2 slides. n=200k => 100k rebuilds, each process 4 elements => 400k operations, okay. But list comprehension overhead 100k times might be noticeable (100k * small). Maybe threshold `4*k` or `k + 1000`? For k=2, 4*k=8, rebuild less. For k=1000, 4k=4000, log 12, still fine. Could use `2 * k + 1000` to reduce rebuilds for small k. But simplicity.

Maybe no rebuild is simpler and less risk. Given C heapq, O(n log n) fine. But "well under 2 seconds" maybe O(n log n) with n=200k still fine. Let's estimate more concretely: 200k pushes into heap size maybe 200k. C heappush is fast, maybe 0.5 micro per level? Actually heappush involves Python C API, tuple comparisons. 3.4M comparisons maybe ~0.1s? Python function call to C maybe 0.05us? Hard. 200k slides, 400k nested function calls, set operations. Could be ~0.5s. Should pass. Rebuild may reduce heap size but adds list comprehensions. I'd lean simpler without rebuild to avoid closure reassign complexities. But maybe include rebuild for safety? Need decide.

Let's think of worst-case without rebuild: heap size can be n=200k. Each heappush log 200k ~18. 200k pushes = 3.6M sift steps. Each step C-level? `_heapq.heappush` is C but it calls PyObject_RichCompareBool, which for float/int is C. 3.6M comparisons maybe ~0.1-0.2s. Pops similar. Set lookups 200k. Total maybe <1s. Good. No rebuild needed.

But if stale heap size n, median clean may pop many stale at once, total pops n. Fine.

Thus simpler code better.

Now, let's consider if initial build using `high = [(nums[i], i) for i in range(k)]` and `heap_of[:k] = b'\x01' * k` could be memory heavy for k=200k: high list 200k tuples, low list 100k tuples, heap_of 200k bytes, removed set maybe. Total maybe ~20MB, okay.

Now, possible issue: `heap_of[:k] = b'\x01' * k` for k large creates bytes of length k. Fine. Could use `heap_of[:k] = b'\x01' * k` but if k is 1, bytes length 1. Good.

Now, maybe `bytearray(n)` when n is 200_000 is fine. If n is huge (10^7), memory 10MB, okay maybe. But problem n=200k.

Now, let's consider if there is a way to avoid `heap_of` by storing heap membership in the heap entry? Could entry be `(value, id, heap)`? Not needed.

Now, let's think about exact median for even k when k=0? invalid.

Now, potential issue: If `nums` is a list of `float`, but `float` conversion for odd median may be redundant. But okay.

Now, let's consider if we should use `math.isclose`? No.

Now, let's review code for syntax and scope.

```
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    low = []
    high = []
    removed = set()
    heap_of = bytearray(n)
    low_size = 0
    high_size = 0

    heappush = heapq.heappush
    heappop = heapq.heappop
    heapify = heapq.heapify
    removed_add = removed.add
    removed_discard = removed.discard

    def clean_low():
        while low and low[0][1] in removed:
            _, i = heappop(low)
            removed_discard(i)

    def clean_high():
        while high and high[0][1] in removed:
            _, i = heappop(high)
            removed_discard(i)

    def balance():
        nonlocal low_size, high_size
        if low_size < high_size:
            clean_high()
            x, i = heappop(high)
            heappush(low, (-x, i))
            heap_of[i] = 0
            high_size -= 1
            low_size += 1
        elif low_size > high_size + 1:
            clean_low()
            x, i = heappop(low)
            heappush(high, (x, i))
            heap_of[i] = 1
            low_size -= 1
            high_size += 1

    high = [(nums[i], i) for i in range(k)]
    heap_of[:k] = b'\x01' * k
    heapify(high)
    target_low = (k + 1) // 2
    low = []
    for _ in range(target_low):
        x, i = heappop(high)
        low.append((-x, i))
        heap_of[i] = 0
    heapify(low)
    low_size = target_low
    high_size = k - target_low

    result = []
    result_append = result.append
    k_even = (k % 2 == 0)

    if k_even:
        result_append((-low[0][0] / 2.0) + (high[0][0] / 2.0))
    else:
        result_append(float(-low[0][0]))

    def add(x, new_id):
        nonlocal low_size, high_size
        clean_low()
        if low_size == 0 or x <= -low[0][0]:
            heappush(low, (-x, new_id))
            heap_of[new_id] = 0
            low_size += 1
        else:
            heappush(high, (x, new_id))
            heap_of[new_id] = 1
            high_size += 1
        balance()

    def remove(out_id):
        nonlocal low_size, high_size
        removed_add(out_id)
        if heap_of[out_id] == 0:
            low_size -= 1
        else:
            high_size -= 1
        balance()

    for out_id in range(n - k):
        remove(out_id)
        add(nums[out_id + k], out_id + k)
        clean_low()
        clean_high()
        if k_even:
            result_append((-low[0][0] / 2.0) + (high[0][0] / 2.0))
        else:
            result_append(float(-low[0][0]))

    return result
```

Check scope: We assign `high = [...]` after defining clean_high which references `high`. Is that okay? Yes, `high` is a local variable in sliding_median. It is assigned before nested function definitions? Initially `high = []`, then nested functions, then reassign `high = [...]`. Since nested functions reference `high`, it's a cell variable. Reassigning after definition updates cell. Good. Same for `low`: initially `low=[]`, nested clean_low references, then reassign `low=[]` after initial. Actually we assign `low = []` again before building. This is in same scope. Fine.

But note: We define `clean_low` before `low` is reassigned. It captures the variable, not the object. When we later reassign `low`, clean_low uses new list. Good.

Potential issue: In `clean_low`, we use `low` and `removed`. If we reassign `low` after clean_low definition, okay. But if we reassign `low` inside loop (if rebuild), okay. Not using rebuild.

Now, initial `low = []` then `low = []` again? We had `low = []` at top, then after high build `low = []`. This is okay but redundant. Could just keep `low` empty. No issue.

Now, `heap_of[:k] = b'\x01' * k`: If k is large, okay. But if k is 0? invalid. Good.

Now, one subtle bug: We use `heap_of` to track membership. For initial high elements, set to 1. For moved to low, set 0. For new elements, set in add. But what about ids that are in high initial and never moved, then removed: heap_of 1. Good. What about ids that are in low initial and moved to high later: heap_of updated. Good.

Now, in `remove`, if `heap_of[out_id] == 0`, we decrement low_size. But what if out_id is stale? No. What if out_id was moved to high but heap_of not updated because movement happened in `balance` after clean? We update. Good.

Now, let's consider if `balance` can move an element that is scheduled to be removed in the same slide? We remove then add. Balance after remove may move active elements. The outgoing id is already marked removed, so if it is top, clean will pop it before moving. So we won't move a stale element. Good.

Now, potential issue: In `remove`, we mark removed before balance. If balance needs to clean the heap containing removed id, it will pop it and discard. Good. If balance moves from the other heap, removed id remains stale in its heap. Good.

Now, let's think about if `removed_discard` bound method remains valid after `removed` set resizes. Yes.

Now, perhaps we should not bind `removed_discard` because if we clear removed (not) no issue. Good.

Now, consider if `nums` is a tuple, type hint list but len and indexing okay.

Now, maybe the grader expects no extra imports? Standard library okay.

Now, let's think about a possible alternative using `heapq` with entries as `(value, id)` and `heap_of` as list of bool. Bytearray good. But bytearray assignment `heap_of[i] = 0` where i is int. Good.

Now, test with k=1 and initial build:
high = [(nums0,0)], heap_of[0]=1, heapify. target_low=1. pop x,i, low=[(-x,0)], heap_of[0]=0, heapify. low_size=1 high_size=0. result odd. loop out_id range(n-1): remove(0): removed_add(0), heap_of[0]=0 => low_size=0, balance no. add nums[1] id1: clean_low: low top id0 in removed => pop, discard. low empty. low_size==0 push low id1, heap_of[1]=0, low_size1, balance no. clean_low/high, median. Good. Stale id0 popped each time, heap size 1. Good.

Now, test with k=n=1: loop range(0). Good.

Now, test with k=n=2: initial result only. loop range(0). Good.

Now, consider if `n-k` is 0, `range(0)` empty. Good.

Now, potential issue: In initial build, if k is even, target_low=k//2. For k=2, low_size=1 high_size=1. For k=4, low_size=2 high_size=2. Good.

Now, let's think about if we need to return a list of floats, not necessarily new list? We return result.

Now, let's consider if `ValueError` should be raised if `k` is not int? Not specified. If k is float 1.0, `k < 1` works, `k > n` works, but `range(k)` would error. Type hint int. Could coerce? Not needed. But if k is bool False, k<1 true. Good.

Now, maybe we should check `k = int(k)`? No.

Now, let's consider if `nums` length is huge and k invalid, we raise before allocating. Good.

Now, performance of `heap_of[:k] = b'\x01' * k`: For k=1000, fine. For k=200k, bytes multiplication. Good.

Now, one subtle issue: `heap_of` is a bytearray of zeros. For initial high, set first k to 1. For target moved to low, set 0. For new elements, set in add. But for ids that are added to low in add, set 0 (already 0 by default). For ids added to high, set 1. Good.

Now, what about ids that are added to low but then moved to high before being removed? heap_of updated to 1. Good.

Now, possible bug: In `balance`, when moving high to low, we do `x, i = heappop(high)`. But `x` is the actual value. We push `(-x, i)` to low. If `x` is a float `-0.0`, `-x` is `0.0`. Good. If `x` is int, `-x` int. Good.

When moving low to high, `x, i = heappop(low)`, where `x` is negative of value. We push `(x, i)` to high? Wait low entry is `(-value, id)`. If we pop `x, i` from low, `x = -value`. To push to high, we need value = -x. But code above says `heappush(high, (x, i))`? That's wrong! Let's check. In balance low to high:
```
x, i = heappop(low)
heappush(high, (x, i))
```
But low entry first element is `-value`. So `x` is negative value. Need push `-x` to high. In earlier draft I wrote `heappush(high, (x, i))`? Let's review. I wrote:
```
        elif low_size > high_size + 1:
            clean_low()
            x, i = heappop(low)
            heappush(high, (x, i))
            heap_of[i] = 1
```
This is a bug. Need `heappush(high, (-x, i))`. Similarly high to low: high entry first element is value. `x` is value. Push low `(-x, i)`. Correct. So low to high must negate. Good catch.

In median, low top value = -low[0][0]. Good.

In add, if push low: `(-x, new_id)`. Push high: `(x, new_id)`. Good.

Initial low append `(-x, i)` where x from high value. Good.

So fix balance low to high: `heappush(high, (-x, i))`.

Let's test descending case with bug would fail. Need correct.

Now, in `balance` high to low: `x, i = heappop(high)`, push low `(-x, i)`. Good.

Now, in `clean_low`, low entries are negative values. No issue.

Now, in `add`, compare `x <= -low[0][0]`. Good.

Now, in median even: `(-low[0][0] / 2.0) + (high[0][0] / 2.0)`. Good.

Now, let's re-evaluate balance invariant with negation. Good.

Now, consider if `x` is int and `-x` in low to high. Good.

Now, another subtle bug: In `balance`, after moving low to high, we push `(-x, i)` where `x` is negative value. If value was negative, x positive, -x negative. Good.

Now, let's think about if `low` heap uses negative values, so top is smallest negative (most negative) corresponding to largest value. Good.

Now, possible issue with tuple comparison when first elements are floats and nan. Ignore.

Now, let's consider if we should use `float` for `x` in heaps? If nums are ints, heap entries ints. Fine. If mixed ints/floats, comparisons okay.

Now, let's think about if `heap_of` default 0 could cause remove of an id that hasn't been added yet? Loop removes out_id from 0 to n-k-1. All out_id < k? Initial ids 0..k-1 added. For out_id >= k? out_id max n-k-1. If n-k-1 >= k? e.g., n=10,k=3, out_id max6. id6 was added when out_id=3? Let's see new_id=out_id+k. For out_id=3, new_id=6. So id6 added before it can be removed? It will be removed when out_id=6? But loop max6, yes. But is id6 added before out_id=6? It is added at out_id=3, then remains active until out_id=6. Good. All removed ids have been added. heap_of set. Good.

Now, what about ids beyond n-1? No.

Now, maybe we can eliminate `remove` function and inline in loop for speed. But okay.

Let's consider if nested functions with nonlocal are defined after initial result. They capture `low`, `high`, etc. Good.

Now, let's think about if `balance` uses `clean_low` and `clean_high`, which use `removed_discard`. If we discard an id in clean, and later in same balance? No.

Now, let's test a scenario where an active element is moved multiple times. Does heap_of update each time. Yes.

Example: k=3, window [1,2,3], low [2,1], high [3]. Add 0: low top2, x=0<=2 push low size3, balance low>2: clean_low top2, pop push high (-x? low entry x=-2, push high (2,id)). low size2 high2? Wait k=3 after add active 4? But sliding removes one first. In loop remove then add. Suppose remove 1, then add 0. Remove 1 (low) low_size1 high1, add 0 push low size2 high1, balanced. No move. If add without remove, low size3 high1, move top 2 to high, sizes2/2. Correct.

Now, consider moving same element back and forth. Fine.

Now, potential issue: When we move an element, we pop from one heap and push to other. The id remains active. It might be in `removed` set? clean ensures not. But what if `removed` set contains id due to a previous removal, but element still active? That would be bug. Not.

Now, let's think about if we should use `deleted` set of ids and not discard on pop, to simplify? If we don't discard, removed set grows to n. But clean while `id in removed` will keep popping. If id popped, it remains in removed, but no longer in heap. Future membership checks for other ids unaffected. Set size n=200k, okay. It avoids `removed_discard` call. But set size larger may make `in` slightly slower? Set membership O(1) with size maybe larger but load factor. 200k not big. Could be faster to not discard because no method call. But memory okay. However, if we don't discard, when we move active elements, they are not in removed. Good. If we rebuild and clear, need. Without rebuild, no. Which is faster? `removed_add` per removal, no discard per stale pop. Stale pops up to n. Discard method call maybe cost. Not discarding leaves set size n, membership for active ids (not in set) still O(1). Set with 200k entries fine. Could remove `removed_discard` and not discard. But then `removed` set will contain all removed ids, even those popped. That's okay. But if we ever rebuild and clear, not. Without rebuild, simpler: clean just pops without discard. But then `removed` set size n, memory ~8-16MB. Acceptable. It also means if an id is popped and remains in removed, and later we somehow push same id again? We never push same id again. Good.

If we don't discard, `removed` set contains ids of all outgoing elements. For n=200k, fine. This might be faster and simpler. But if n were much larger, memory. Problem n=200k. Could keep discard for memory. Method call cost maybe small. Which is better? Let's estimate: 200k discards vs set size 200k. Set membership in clean: For each heap top check, if id in removed. If removed set large, hash table lookup maybe a bit slower but still fast. Discard also hash lookup + delete. I'd keep discard to bound set size. But discarding changes set size, may cause resizes. Fine.

Could use `removed` as a set of ints and in clean do `if low and low[0][1] in removed: heappop(low)`. Without discard. Simpler. But then `removed` grows monotonically. For n=200k, okay. The code is simpler and avoids `removed_discard` binding. But if heap top is stale, we pop and don't remove from set. If the same stale id is not in heap anymore, no issue. If we later clean, no duplicate id in heap. Good.

What about if we rebuild? Not using. Without discard, removed set contains stale ids that have been popped. If we later decide to rebuild by filtering, filtering with `e[1] not in removed` would still filter active? Active ids not in removed. Stale popped not in heaps. Stale not popped in heaps filtered. Then clear removed. That would work. But if we don't rebuild, fine.

Maybe no discard is simpler and faster? Let's think: In clean loop, each stale pop currently does heappop + removed_discard. Without discard, just heappop. Heappop is C, discard is Python method. Removing 200k discards could save time. Set size 200k membership may be slightly slower but likely not significant. I'd consider using no discard. But then `removed` set size n, and `in` checks for active tops occur many times. Set membership for 200k entries vs smaller set maybe similar. Hash lookup independent of size mostly. So no discard may be faster. Memory okay. Let's adopt no discard? Need be careful: If we don't discard, and an id is removed, then later (before it is popped) we might move it? No, clean prevents moving stale. Good.

If we don't discard, `removed` set will contain ids that have been popped. If we later add a new element with a new id, unique. No conflict. Good.

Potential issue: If we use `removed` set for membership, and we never discard, then when we pop a stale entry, it remains in removed. If the same id appears in the other heap? It shouldn't. But if due to a bug an id appears in both heaps, clean of one heap would pop, other heap still has stale id, but removed still contains, so clean of other would pop later. Fine.

Thus we can simplify clean:
```
    def clean_low():
        while low and low[0][1] in removed:
            heappop(low)
```
No need `removed_discard`. Remove `removed_discard` binding. `removed_add` still.

But if we don't discard, `removed` set grows to n. For n=200k, okay. If n=10^7, memory huge, but problem 200k. The requirement mentions n=200k. Good.

However, if we don't discard, and we have many stale entries not at top, `removed` set size equals number of removed elements not necessarily popped? Actually all removed elements, even popped. Size O(n). Fine.

Could there be a scenario where an active id is in removed because we removed it, but then it is moved back? No, removed means element left window, inactive. It will never become active again. Good.

Let's decide: Use discard or not? Discard bounds set to stale not popped, which in worst-case could also be O(n) if stale not top. For increasing sequence, stale small in low not top, removed set size O(n) anyway because they are not popped. Discard only helps if stale are popped. In worst-case, set size O(n) regardless. So no discard doesn't asymptotically change. It saves method calls. Let's use no discard for simplicity/speed. But if we later consider rebuild, we could clear. Not.

So clean functions:
```
    def clean_low():
        while low and low[0][1] in removed:
            heappop(low)
```
Need `heappop` returns value but ignore. Could use `heappop(low)` without assignment. Good.

Now, `removed` set will contain all outgoing ids. For n=200k, memory okay. If we want to bound, we could periodically clear? But if we clear, we must ensure no stale entries remain in heaps. Could rebuild. Not needed.

Now, if we don't discard, `removed_add` bound. Good.

Now, consider if `removed` set size large, and in `clean_low` while condition checks `low[0][1] in removed`. For active tops, false. Set membership with 200k entries maybe okay.

Now, let's think about if we can use a boolean array `is_removed` instead of set for O(1) and less memory? `bytearray(n)` for removed flags. Since ids 0..n-1. On remove, `removed_flags[out_id] = 1`. Clean checks `removed_flags[low[0][1]]`. This is faster and memory n bytes. But we already have `heap_of` bytearray. Could use `removed = bytearray(n)` instead of set. Then no hash. For n=200k, great. Remove: `removed[out_id] = 1`. Clean: `while low and removed[low[0][1]]: heappop(low)`. This is faster and memory efficient. Need not discard. But if we reassign? No. This is better! Let's consider.

Use `removed = bytearray(n)`. For each outgoing id, set 1. Stale entries remain with flag 1. Active ids flag 0. When cleaning, pop while flag 1. We never reset flag. Since ids are never reused, fine. Memory n bytes. Fast. This avoids set overhead. Great.

Need be careful: `removed` bytearray values 0/1. Access `removed[id]` returns int. Clean:
```
    def clean_low():
        while low and removed[low[0][1]]:
            heappop(low)
```
Remove:
```
    removed[out_id] = 1
```
No `removed_add`. This is much faster. Good. Use this.

Now, if we ever rebuild and clear removed flags, we'd need reset for active? But not. If no rebuild, flags for all removed ids remain 1. New ids have flag 0 initially. Good. If an id is removed, it will never be added again. Good.

This is excellent. Let's adopt bytearray removed.

Then `heap_of` and `removed` both bytearray(n). Memory 400k bytes. Good.

Now, clean functions free var `removed` bytearray. Fast.

Potential issue: If n is huge, bytearray n memory okay. If n=0 invalid. Good.

Now, code with bytearray removed:
```
    removed = bytearray(n)
    ...
    def clean_low():
        while low and removed[low[0][1]]:
            heappop(low)
    def clean_high():
        while high and removed[high[0][1]]:
            heappop(high)
    def remove(out_id):
        nonlocal low_size, high_size
        removed[out_id] = 1
        ...
```
No set. Good.

Now, one subtlety: When an element is moved between heaps, its removed flag remains 0 (active). Good. When removed, flag 1. If it was in low, we decrement low_size. If later clean pops it, flag remains 1. Good.

Now, if we don't reset flags, and an id is popped from heap, flag remains 1. If somehow the same id is pushed again? We never push same id. Good.

Now, if we rebuild and filter, we would need clear flags for active? Not using.

Now, performance improved.

Now, let's reconsider initial build with `heap_of[:k] = b'\x01' * k`. `removed` all zeros. Good.

Now, nested functions with bytearray access. Good.

Now, could we combine `heap_of` and `removed` into one bytearray? Need two bits? Could use 2-byte? Not necessary.

Now, let's think about if `heap_of` default 0 and removed default 0. For new ids, heap_of set in add. For initial high, heap_of set 1. Good.

Now, potential issue: In `remove`, if `heap_of[out_id]` is 0 but out_id was never added? For out_id >= k? It was added earlier. Good. For out_id < k initial. Good.

Now, let's think about if `n` is large and `bytearray(n)` allocation twice. Fine.

Now, could we use `array('b')`? No need.

Now, let's re-evaluate balance with bytearray removed. Good.

Now, let's consider if we can avoid `balance` function by inlining to reduce nonlocal. But okay.

Now, possible bug: In `balance`, when moving high to low, we call `clean_high()`, then `x, i = heappop(high)`. But what if `high` top is removed flag 1 and `clean_high` pops it. Good. What if after popping active, the next top is removed, but we don't clean again? We only need one active top to move. After moving, we don't need to clean remaining. Good.

Now, in `add`, we call `clean_low()` then compare. If low top active. Good. If low_size==0, clean_low may pop stale until empty. Good.

Now, in median, we call clean_low and clean_high. Good.

Now, let's think about if `low_size` and `high_size` can be wrong due to stale flags not reset. They are active counts. Remove decrements. Add increments. Balance adjusts. Stale popping doesn't change sizes. Good.

Now, let's test with bytearray removed in a scenario where stale id popped and flag remains. If we later check removed for active id with same value? Id unique. Good.

Now, potential issue: If `n` is 200_000, `bytearray(n)` okay. If `n` is 0 and k invalid, we raise before allocation. Good.

Now, let's consider if using `heap_of[:k] = b'\x01' * k` for k maybe large and `heap_of` is bytearray. If k is 1, okay. If k is n, okay. If k is 0 invalid. Good.

Now, maybe we can set `heap_of[:k] = b'\x01' * k` but if k is very large, multiplication by k creates bytes. Fine.

Now, let's think about if `nums` is a list of floats but contains `inf`. Heap order with inf. Median inf. Fine. If contains `-inf`, low entry `inf`? For x=-inf, -x=inf. Max heap low top with inf corresponds to largest? If values include -inf and inf, comparisons okay. If all -inf, low entries inf, top value -inf. Good.

Now, if contains nan, comparisons inconsistent. Not required.

Now, let's consider if result list can be built with preallocation for speed. Append local is fine. But prealloc could avoid resizing. n=200k, resizing few times. Append local fast. Keep append.

Now, let's think about if `k_even` computed as `k % 2 == 0`. For k large, okay.

Now, potential issue: In even median, using `(-low[0][0] / 2.0) + (high[0][0] / 2.0)`. If `low[0][0]` is a very large int, `-low[0][0] / 2.0` may raise OverflowError? Python int to float conversion. But if nums are floats, no. If nums are ints within float range, okay. Could use `float(-low[0][0]) / 2.0 + float(high[0][0]) / 2.0` same. Not worry.

Now, maybe for odd median, if value is int and we cast to float, okay. If value is inf, float(inf). Good.

Now, let's consider if we should use `result_append((-low[0][0] + high[0][0]) * 0.5)`? The division by 2.0 fine.

Now, let's think about if `heapq.heapify` on `low` after appending target elements. For target=1, heapify trivial. Good.

Now, could initial build be incorrect for odd k? Example k=3, target=2, low two smallest, high one largest. Median low top (largest of two smallest) = middle. Good.

Now, after sliding, balance maintains low_size = (current window size +1)//2? Window size always k. For odd k, low_size should be (k+1)//2. For even, k//2. Balance ensures low_size >= high_size and low_size <= high_size+1. Since total k, for odd low_size=(k+1)//2, even equal. Good.

Now, let's verify balance after add/remove preserves total active size k. Remove decrements one size => total k-1. Add increments => total k. Balance doesn't change total. Good.

Now, potential issue: In `remove`, if out_id flag already 1? No. But if due to bug, low_size could go negative. Not.

Now, let's consider if we can make `clean_low` and `clean_high` local variables for speed? They are functions. Fine.

Now, one subtle Python scoping issue: We assign to `low` and `high` after defining nested functions. In Python, if a variable is assigned anywhere in a function, it's local to that function. Nested functions can reference it. Since we assign `low` in sliding_median, it's local. Nested functions capture it. Reassigning updates. Good. But if we use `low` in a default argument of nested function, it would capture old value. We won't.

Now, let's think about if we should define nested functions after all list assignments to avoid cell variable overhead? Cell variable access is slightly slower than local. Could pass lists as default args to make them local in nested functions. But if we reassign low/high (not in final maybe no rebuild), default args could be used. We do reassign low/high once before function definitions? We can define clean functions after initial build, so they can capture final low/high as default args. But `add`/`remove` also need. We can structure:
- Build initial low/high first.
- Then define clean_low/high, balance, add, remove with default args binding lists and bytearrays. But balance needs to modify low_size/high_size nonlocal. It can bind lists as defaults. This could speed. But code more complex. Not necessary.

However, cell variable access for `low`, `high`, `removed`, `heap_of` in nested functions may be slower. But n=200k, okay. If we want optimize, we can avoid nested functions by writing a class? No.

Maybe we can implement the sliding loop with local variables and inline clean code to avoid closures. Let's consider for performance. But code length okay.

Potential performance bottleneck: Nested functions `remove` and `add` called 200k each. Each call does nonlocal variable access. Could be okay. But if we want well under 2s, maybe inline remove/add in loop? Let's estimate. 400k function calls not huge. But nonlocal size updates maybe.

Could write `add` and `remove` as inner functions but use local variables by passing sizes as list? Not faster.

Let's maybe inline balance? Hmm.

Alternative: Use two heaps and a sorted list of active? No.

I think nested functions fine.

Now, let's think about if `heapq` C functions accept lists of tuples. Yes.

Now, let's consider if using `bytearray` for `heap_of` and `removed` with index `i` from heap entries. `i` is int. Good.

Now, potential issue: If `n` is very large, `bytearray(n)` may allocate zeroed memory. Fine.

Now, let's test with a small random sequence by manual maybe more complex.

nums=[2,0,3,1,4], k=3.
Brute:
[2,0,3] sorted [0,2,3] med2
[0,3,1] sorted [0,1,3] med1
[3,1,4] sorted [1,3,4] med3
Algorithm:
init high [(2,0),(0,1),(3,2)], target2. pop 0 id1 low, pop2 id0 low. low top2, high top3. med2.
out0 remove id0 (low? heap_of[0]=0) low_size1 high1. add nums3=1 id3: clean_low low top id1 value0? Wait low heap has (-2,0) stale, (-0,1) active. clean_low pops id0 stale. low top id1 value0. x=1>0 push high id3. high_size2 low1. balance low<high: clean_high top id3 value1 active, pop push low. low_size2 high1. low has id3(1), id1(0); high id2(3). med1. OK.
out1 remove id1 (low) low_size1 high1. add nums4=4 id4: clean_low top id3 value1 active (id1 stale below). x=4>1 push high high_size2 low1. balance low<high: clean_high top id4 value4? high has id2(3), id4(4), top3 actually id2. Wait high heap after previous: high id2(3). Add id4(4), high top id2(3). balance pop id2 push low. low_size2 high1. low has id2(3), id3(1); high id4(4). med3. OK.

Good.

Now, consider even k=4 nums=[2,0,3,1,4,5]
Brute:
[2,0,3,1] sorted [0,1,2,3] med1.5
[0,3,1,4] sorted [0,1,3,4] med2.5
[3,1,4,5] sorted [1,3,4,5] med3.5
Algorithm init first4: high, target2 pop 0 id1,1 id3? Wait values [2,0,3,1], smallest 0(id1),1(id3). low top1, high top2? high remaining 2(id0),3(id2). median (1+2)/2=1.5.
out0 remove id0 (high) high_size1 low2. balance low>high+1? 2>2? no (low_size2 high1, difference1 ok). add nums4=4 id4: clean_low top id3 value1, x>1 push high high_size2 low2. balanced. high top2? high has id2(3), id4(4)? Wait id0 removed, high had id2(3) only after remove? Initial high id0(2), id2(3). Remove id0 high_size1 (id2). Add id4 high_size2 (id2,id4). high top id2(3). low top id3(1). median (1+3)/2=2. But brute second window [0,3,1,4] median 2.5? Wait low should be [1,0], high [3,4], median (1+3)/2=2.0? Sorted [0,1,3,4], two middle 1 and3 =>2.0. I mistakenly said 2.5. Correct 2.0. Good.
out1 remove id1 (low) low_size1 high2. balance low<high: clean_high top id2(3), pop push low. low_size2 high1. low has id2(3), id3(1). add nums5=5 id5: clean_low top id2(3), x>3 push high high_size2 low2. high has id4(4),id5(5). median (3+4)/2=3.5. Brute third [3,1,4,5] sorted [1,3,4,5] median3.5. OK.

Now, let's think about if initial build popping target smallest from high yields low with two smallest but low heap top is max of them. Yes.

Now, potential issue: In initial build, if k is even, low and high sizes equal. If k is odd, low one more. Good.

Now, let's consider if we should use `target_low = (k + 1) // 2` for odd. Yes.

Now, one more performance idea: We can avoid `balance` function call after add/remove by writing a small inline balance in both? But no.

Now, let's think about if `nonlocal low_size, high_size` in `balance` and `add`/`remove` is necessary. Yes.

Now, possible issue: In `add`, we call `clean_low()` before checking `low_size == 0`. If low_size==0, clean_low may pop stale entries. Good. But if low_size==0 and low heap has stale entries, `low[0][1]` valid. Good.

Now, in `remove`, after marking removed, we call balance. Balance may call clean_low/high. If the removed id is top in a heap, clean pops it. Good. If removed id not top, no clean. Good.

Now, let's consider if `balance` after remove could need to move more than one element if sizes differ by more than 1 due to stale? Active sizes differ by at most 1 before remove. Remove one can make difference at most 2? Example before even low=high=500. Remove low => low=499 high=500 diff -1, one move. Remove high => low=500 high=499 diff 1, no move. Before odd low=501 high=500. Remove low => low=500 high=500 diff0. Remove high => low=501 high=499 diff2, one move. So one move enough. Add similarly. Good.

Now, what if `balance` is called when sizes already balanced but top stale. It doesn't clean. Median/add clean as needed. Good.

Now, let's think about if `add` should call `balance` after pushing. Yes.

Now, could `add` push to low when low_size==0 but high_size>0 (shouldn't after balance except k=1 after remove before add? Actually remove then balance before add, so low_size maybe 0 only k=1 high0). If high_size>0 and low_size0, add would push low, making low1 high>0, maybe imbalance. But balance after add would fix. Could happen if we didn't balance after remove? We do. Good.

Now, let's consider if `remove` and `add` order could be reversed (add then remove) to simplify? Current remove then add. Good.

Now, potential issue: If `nums` is modified during function? Not.

Now, let's think about if the grader will call with `nums` as a list of `float` and `k` as int. Good.

Now, let's consider if we need to handle `k` as negative. ValueError.

Now, let's think about if `len(nums)` could be negative? No.

Now, let's review final code for PEP and correctness.

One more subtle bug: In `balance`, low to high move:
```
x, i = heappop(low)
heappush(high, (-x, i))
```
But `x` is negative value. Suppose value = 5, low entry (-5,i). x=-5, -x=5. Good. Suppose value = -5, low entry (5,i). x=5, -x=-5. Good.

High to low move:
```
x, i = heappop(high)
heappush(low, (-x, i))
```
High entry value x. Good.

Now, in initial low append: `low.append((-x, i))` where x from high value. Good.

Now, in median: low top value = -low[0][0]. high top value = high[0][0]. Good.

Now, in add compare: `x <= -low[0][0]`. Good.

Now, let's think about if using `/ 2.0` on negative zero. Good.

Now, maybe for even median, if values are ints, `(-low[0][0] / 2.0) + (high[0][0] / 2.0)` returns float. Good.

Now, let's consider if `float(-low[0][0])` for odd median could be slower than just `-low[0][0]` if already float. But requirement floats. If input ints, need float. Could do `float(-low[0][0])`. Good.

Now, could we avoid float conversion by returning `-low[0][0]` and if input ints, list contains ints, violating? The requirement says return floats. Use float.

Now, let's think about if `nums` contains `float` but `-low[0][0]` is a float, `float()` copies. Fine.

Now, let's consider if we should use `result_append(float(-low[0][0]))` or `result_append(-low[0][0])` for speed. Use float.

Now, possible issue: If `nums` contains very large integers beyond float, float conversion raises OverflowError. But type hint float, so not.

Now, let's think about if we can preallocate result to avoid append method lookup. We use `result_append`. Good.

Now, let's consider if we should delete `high` initial list comprehension variable? No.

Now, maybe we can build initial high without list comprehension to reduce memory? List comprehension fine.

Now, let's think about if `heap_of[:k] = b'\x01' * k` when k is 1000 is okay. If k is large, bytes multiplication. Good.

Now, one possible issue: `heap_of` is a bytearray, and `heap_of[i] = 0` where i is an int from heap. If i is negative? No.

Now, let's consider if `n` can be 0 and k invalid. We raise before `bytearray(n)`. Good.

Now, let's think about if `k` is 1 and n=200k. Initial high list length1, target1. Loop 199999. Each remove sets removed[out_id]=1, low_size0, balance no. Add clean_low pops stale (one heappop), push new. This is O(n). Good. `removed` bytearray flags for all old ids remain 1. clean_low only checks top. Good.

Now, for increasing sequence k=1000, stale small in low not top, removed flags remain. low heap size grows. clean_low only pops when stale reaches top. Since active low values increase, stale small may never reach top until many active removed. They accumulate. Heap size O(n). But heappush log n. Okay.

Could we use rebuild to keep heap size O(k) and avoid log n. With bytearray removed, rebuild is easy: when len(low)+len(high) > 2*k, filter. But if we filter, we need reset removed flags for active? Active flags 0. Stale flags 1. After filtering, stale entries gone. We can keep flags 1 for stale ids (they won't be used again except maybe as new? ids not reused). But if we keep flags 1, removed bytearray remains with 1 for all removed ids. Filtering uses `not removed[e[1]]`. Good. We don't need clear. But if we filter, stale entries gone, flags remain 1. Future new ids have flag 0. Good. We could rebuild without clearing flags. But list comprehension `[e for e in low if not removed[e[1]]]` uses removed flags. Good. After rebuild, no stale entries in heaps. Flags for removed ids remain 1, but those ids not in heaps. Fine. This bounds heap size. Rebuild cost. Should we include? It adds code but can improve worst-case. Need reassign low/high in loop. With bytearray removed, reassign okay. But nested functions closure. Good.

If we include rebuild, threshold maybe `2 * k`. For k=1000, heap size kept <=2000. log ~11. Rebuild 200 times. Good. For k=1, threshold 2, but heap size doesn't exceed 1. For k=2, threshold 4, rebuild often maybe okay. Could use `2 * k + 1000` to reduce rebuilds for small k. But if k small, log n with n=200k is 18, still fine. Rebuild overhead maybe not needed. But if we include, need ensure no bug with reassigning low/high in nested functions. Let's test mentally.

In loop after add:
```
        if len(low) + len(high) > 2 * k:
            low = [e for e in low if not removed[e[1]]]
            high = [e for e in high if not removed[e[1]]]
            heapify(low)
            heapify(high)
        else:
            clean_low()
            clean_high()
```
But if we rebuild, we don't call clean. The filtered lists should have no stale entries because removed flags mark all stale. Active flags 0. Good. But what about stale entries that were already popped and removed from heaps? Not in lists. Good. Sizes low_size/high_size remain active counts. After filtering, len(low) should equal low_size, len(high)=high_size. Could assert but not.

If we reassign `low` and `high`, nested functions `clean_low` etc will use new lists. However, `balance` and `add`/`remove` were defined before reassign. They use closure cells. Reassign updates cells. Good.

But there is a Python gotcha: If a variable is assigned in a function, and nested functions reference it, it becomes a cell variable. Reassigning in the