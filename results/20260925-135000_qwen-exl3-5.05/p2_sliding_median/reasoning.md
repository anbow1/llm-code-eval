We need answer user wants code only in python block. Need design efficient sliding median. Need standard library only. Python 3.11+. Need n=200k k=1000 under 2s. Need efficient algorithm. Options: two heaps with lazy deletion O(n log k). Need median floats. Standard library heapq. Need handle duplicates, lazy removal. Must be correct and efficient. Could also use Fenwick with coordinate compression O(n log n) maybe okay for 200k log ~18, 3.6M operations maybe okay? But coordinate compression + BIT could be fast enough if optimized. Two heaps maybe simpler and fast. Need think carefully about correctness with duplicates and lazy deletion. Sliding window median LeetCode 480. Use maxheap lower (neg values), minheap upper. Maintain sizes and balance. To remove outgoing value, mark lazy and balance. Need maintain lower_size and upper_size counts of valid elements? Standard approach: two heaps with lazy deletion, size variables representing counts of elements actually in window in each heap. maxheap stores -value for lower half, minheap stores value for upper half. lower contains ceil(k/2) maybe? For median if k odd: max(lower) if len lower > upper; if even average max(lower), min(upper). We can maintain len(lower) == len(upper) or lower one greater (for odd). For even median mean. Need lazy deletion. Implementation:

def sliding_median(nums,k):
 if k<1 or k>len(nums): raise ValueError
 import heapq
 from collections import defaultdict
 lower=[]; upper=[]; delayed=defaultdict(int); lower_size=0; upper_size=0

 def prune(heap):
  while heap:
   top = -heap[0] if heap is lower? Need careful. Use heap param and sign? Better inline.
 Standard prune(maxheap, sign): while maxheap and delayed[sign*maxheap[0]]: val=sign*heapq.heappop(maxheap); delayed[val]-=1; if 0 del;

But prune needs maxheap vs minheap. Could write:
 def prune_max(h):
  while h:
   x=-h[0]
   if delayed[x]:
    heapq.heappop(h); delayed[x]-=1; if delayed[x]==0: del delayed[x]
   else: break
 def prune_min(h): similar.

 def add(num):
  nonlocal lower_size, upper_size
  if not lower or num <= -lower[0]:
    heapq.heappush(lower, -num); lower_size +=1
  else:
    heapq.heappush(upper, num); upper_size +=1
  balance()

 def remove(num):
  nonlocal lower_size, upper_size
  delayed[num]+=1
  if num <= -lower[0]: lower_size -=1
  else: upper_size -=1
  if num == -lower[0]: prune_max(lower)
  elif num == upper[0]: prune_min(upper)
  balance()

 def balance():
  nonlocal lower_size, upper_size
  if lower_size > upper_size + 1:
    moved = -heapq.heappop(lower); lower_size -=1; heapq.heappush(upper, moved); upper_size +=1; prune_max(lower)
  elif lower_size < upper_size:
    moved = heapq.heappop(upper); upper_size -=1; heapq.heappush(lower, -moved); lower_size +=1; prune_min(upper)

Initialize: add first k numbers. Then medians:
 for i in range(k-1, len(nums)):
  if k %2: medians.append(float(-lower[0]))
  else: medians.append((-lower[0] + upper[0]) / 2.0)
  if i == len(nums)-1: break
  remove(nums[i-k+1])
  add(nums[i+1])
 return medians

Need ensure prune called after popping moved elements? In balance, we pop from heap; if popped element delayed? We maintain heap tops not delayed via remove and after moves? But there may be delayed elements not at top until after pop. Need prune after moving? Standard: balance while lower_size > upper_size+1: max_val = -heapq.heappop(lower); lower_size--; push upper; prune(lower). But what if lower[0] is delayed? Remove should prune if top delayed. Add doesn't introduce delayed. But after moving, top might become delayed. So prune lower/upper after moving. In remove if top matches delayed, prune. However if delayed value is in heap but not top, balance moving may pop delayed? Need ensure when popping from top for move, top not delayed. Since remove prunes top if top delayed, but delayed non-top may become top after later top popped/moved. balance prune after pop? Actually in balance: if lower top delayed? It should not be, because remove prunes when it becomes top? But if top delayed and remove did not prune because delayed num != top? impossible if top delayed. But after moving top, new top might be delayed. So after each heappop in balance, prune heap. In remove, if delayed top equal, prune. In initialization no delayed.

Need be careful with float equality and NaN? Inputs list[float] could include NaN? Median of NaN undefined. Probably ignore. For duplicate floats, exact equality; if outgoing equal to top by value, remove may prune all copies? delayed counts and prune removes only one delayed at top. But if top equals outgoing value, and there are valid copies too, how know if outgoing is top? Lazy deletion by value: If outgoing value equals top value, we can remove one delayed occurrence from heap. If there are duplicates and outgoing is not the top instance but top is valid, prune will still remove top delayed marker for value, leaving valid count? Wait delayed dictionary keyed by value. remove(num) if num equals top value: we call prune, which will pop a top element with value num and decrement delayed. It does not know if popped instance is outgoing or another valid duplicate. But since all equal values indistinguishable, removing any one copy is fine. However if top has value num and there are delayed markers for other values, prune pops one marker per top value. Good.

But there is a subtle bug: remove(num) chooses lower_size vs upper_size based on `num <= -lower[0]`. If lower empty? During sliding after initialization k>=1, lower nonempty? For even k after initialization lower size k/2. upper size k/2. lower nonempty. During remove before add, window size becomes k-1, but lower may become empty? If k=1: after init lower_size=1 upper=0. remove first num: delayed; if num <= -lower[0] lower_size-- =>0; if num == -lower[0] prune lower => lower empty. balance? lower_size=0 upper=0, no balance. Then add new num: if not lower or num <= -lower[0] -> push lower. Good.

For k=2: init lower_size=1 upper=1. remove outgoing could be from lower or upper. If remove from lower: lower_size=0 upper=1; remove prunes if top. balance lower_size < upper_size: move upper top to lower. But if upper top delayed? It prunes before? remove might prune if outgoing == upper[0]. But if moving from upper and upper top delayed due to other removal? Could be. Add prune_min upper after pop. Good.

Potential performance issues: using nested functions with nonlocal overhead may be too slow for 200k? Need optimize. 200k, log k ~10; heap operations ~400k; function calls overhead maybe okay under 2s? Python LeetCode often okay? But need robust. We can implement optimized inline or local variables. Could use two sorted lists? k=1000, insertion O(k) with bisect: n*k=200M too slow maybe not under 2s. Fenwick with coordinate compression: sort unique 200k O(n log n), BIT operations per slide: add two updates, find kth two times (O(log m) each ~18 loops) => 200k*~36=7.2M loop iterations in Python; maybe ~1s-2s? Could be okay but coordinate compression and bisect for each num? We can precompress values via mapping dict O(n). For each window need find kth order statistics. For odd: find kth; even: find k/2 and k/2+1. BIT find by binary lifting. Need maintain counts. Complexity O(n log m). Might be faster? BIT loops simple but 4 operations per step? Initialization k updates; slide: update -1 old, +1 new, find twice if even else once. For n=200k, k=1000, even: 200k*2 find? Actually 199k slides, each find 2, each find ~18 iterations -> 7.2M, plus updates 2*18? Wait update loops log m too: 400k*18=7.2M. Total ~14.4M loop iterations. Heaps: add/remove/balance: per slide remove maybe prune; add push/pop. About 4 heap ops each ~C? heapq implemented Python but comparisons; maybe ~2-3 million heap operations? Might be faster than BIT loops? Need choose.

Alternative: maintain two heaps with custom lazy deletion; likely standard and fast enough for 200k/1000. Need guarantee well under 2s? On normal PC Python heapq 200k* maybe 5 heap operations ~1M, each log1000 ~10 Python comparisons => maybe 0.3-0.5s plus overhead. Good.

Need maybe use integer counts and delayed dict. But floats as keys okay. Need use sys? only stdlib. Need output only code block.

Let's thoroughly test mentally.

Detailed correctness of heap algorithm:
We maintain two heaps containing all current valid window elements plus possibly stale elements (delayed). lower_size/upper_size count valid elements (not stale) in each heap. Invariant: lower_size == upper_size or lower_size == upper_size+1. Also every valid lower <= every valid upper. Add inserts based on current max lower. Remove marks delayed and decrements size. Balance moves valid tops. Need ensure move doesn't move stale top. Since tops not stale due to prune after removals and after moves. But could a stale element become top during balance before prune? We pop top to move; if top stale? It shouldn't. After popping, prune new top if stale. Good.

Implementation variants for speed: Avoid nested prune functions? Could define local functions inside maybe okay. Need avoid nonlocal in hot loop? Could use mutable lists? Hmm. Could inline remove/add/balance for performance. Let's think optimize to meet 2s. 200k is not huge. Nested functions may be okay but Python nonlocal writes slower. Could implement as inner functions with local variable binding and return sizes? Maybe. But user wants clear robust. Need efficient. Let's benchmark mentally. Function calls: initialization k adds =1000; sliding loop ~199999: remove function + add function + median. remove calls balance; add calls balance. Each balance may move. So ~400k function calls + prune. Fine.

But Python nonlocal inside prune? prune uses delayed only. Need maybe implement `prune_max` and `prune_min` nested; called sometimes. Fine.

Potential issue: delayed default dict of int; if many unique removed values, dict grows O(n). Fine. Could clean entries. Use `del delayed[num]` when zero to keep small. In prune, after decrement if zero del.

Potential bug: `remove` if `num <= -lower[0]` but lower empty? If lower empty and upper nonempty? After removing last lower in k=1, lower empty. Remove called only if lower nonempty? In k=1 before balance lower has valid top. But if there are stale top? remove checks top? If lower empty, error. Could lower be empty while upper nonempty before balance? Yes, for k=2 if previous state lower_size=1 upper=1, remove outgoing from lower -> lower_size=0 upper=1, then we call prune if outgoing == -lower[0]? If lower heap contains stale elements? After prune lower may become empty. Then balance moves upper to lower. So remove uses lower[0] before balance and lower_size before decrement. lower_size was 1, heap lower top valid. Good. For k=1, lower_size=1 upper=0, lower top valid. So lower not empty. Good.

Potential bug: in remove, after decrement sizes, we prune if top stale. If top stale value but not equal to outgoing? Could happen? Delayed marks previous removed values; top stale could be from previous removals that didn't get pruned because not top then. It can become top due to current removal? If current removal removes an element from lower not top, sizes lower decreases; then balance may move lower top to upper; prune lower after moving. But remove does not prune lower unless outgoing == lower top. If outgoing is not top, lower top could be stale? Suppose top stale already? It would have been pruned when it became top in prior balance/remove. If not top, not relevant. If current removal decrements size and causes imbalance causing balance to pop top, top should not be stale. So okay.

Median computation: need lower and upper tops valid. Before append, invariant and pruning ensure tops valid. But in k=1 after remove? We compute before slide, valid. After adding? yes.

Even k: lower_size == upper_size? Balance maintains lower_size >= upper_size and <= upper_size+1. For even total, sizes equal. If stale counts? Sizes valid. Good. Median `( -lower[0] + upper[0]) / 2.0`. If values huge? float sum maybe overflow? Inputs floats; median float. Could use `(-lower[0] + upper[0]) * 0.5` okay. If values inf? mean inf? If +inf and -inf -> nan. Not considered. Could return float.

Could use coordinate compression Fenwick maybe more deterministic performance? Let's compare. Need produce final code. Need maybe choose algorithm with best guarantee. For n=200k k=1000, heaps likely fast. Need ensure no pathological O(n*k) due to prune? Lazy deletion ensures each stale popped once, O(n log n). Balanced heap size may include stale up to O(n) worst-case? Let's analyze: We remove k elements each slide? Actually delayed entries can accumulate if not top. Could heaps grow large (O(n)) causing heap operations log n not log k? Since we don't remove stale unless top. Is heap size bounded? Standard two heaps with lazy deletion can grow O(n) if delayed elements never top? But each heap size at most initial + adds not popped; stale popped eventually. In worst-case, can heaps grow to O(n)? Suppose monotonic increasing: add goes to upper mostly, remove smallest from lower? lower stale? Let's simulate: k fixed. If data increasing, each add goes upper, balance moves upper top to lower. Remove outgoing (small) from lower. It may be top? lower top is max lower, outgoing is min window maybe not top. So delayed small values accumulate in lower, not popped unless they reach top after bigger lower elements moved? Since lower_size maintained, lower valid size ~k/2, but heap may contain many stale small values below. Could heap size grow O(n) over time? For increasing sequence, lower heap contains many stale small values (from removals) below valid large values; they will never become top because larger valid elements remain top. So lower heap can grow O(n) (200k). heapq operations on lower: push/pop log heap size ~log n ~18; acceptable. Memory O(n) okay. But if heap size O(n), log 200k fine. Could be 200k memory. For n=200k okay. But if n huge maybe not; requirement okay. However prune only when top stale; stale below never popped. So heap size could be O(n). But operations still O(log n). Good.

But possible issue: lower_size counts valid, but lower heap top valid. When lower_size is smaller than heap len, top valid? Need ensure no stale above valid. Heaps max: stale small values cannot be above valid larger values. If stale larger than valid, it would be top and pruned. So yes.

Need maybe use `dict` instead of defaultdict for speed? Use plain dict get. In prune:
while lower:
    x = -lower[0]
    cnt = delayed.get(x)
    if cnt is None: break
    heapq.heappop(lower)
    if cnt == 1: del delayed[x]
    else: delayed[x] = cnt - 1
Could be faster than defaultdict. Need handle values None? keys floats. Use get with default 0.

Remove: delayed[num] = delayed.get(num, 0) + 1.

Balance: Need prune after moving. Could define inline helper? Use nested functions with local bindings to heapq.heappush/pop. Let's design final code.

Option 1 nested functions:

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    import heapq
    heappush = heapq.heappush
    heappop = heapq.heappop
    lower: list[float] = []
    upper: list[float] = []
    delayed: dict[float, int] = {}
    lower_size = 0
    upper_size = 0

    def prune_lower() -> None:
        nonlocal lower_size? no size change? Stale popped not valid, lower_size unaffected. No.
        while lower:
            x = -lower[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(lower)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def prune_upper() -> None:
        while upper:
            x = upper[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(upper)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def balance() -> None:
        nonlocal lower_size, upper_size
        if lower_size > upper_size + 1:
            moved = -heappop(lower)
            lower_size -= 1
            heappush(upper, moved)
            upper_size += 1
            prune_lower()
        elif lower_size < upper_size:
            moved = heappop(upper)
            upper_size -= 1
            heappush(lower, -moved)
            lower_size += 1
            prune_upper()

    def add(num: float) -> None:
        nonlocal lower_size, upper_size
        if not lower or num <= -lower[0]:
            heappush(lower, -num)
            lower_size += 1
        else:
            heappush(upper, num)
            upper_size += 1
        balance()

    def remove(num: float) -> None:
        nonlocal lower_size, upper_size
        delayed[num] = delayed.get(num, 0) + 1
        if num <= -lower[0]:
            lower_size -= 1
        else:
            upper_size -= 1
        if num == -lower[0]:
            prune_lower()
        elif num == upper[0]:
            prune_upper()
        balance()

    for num in nums[:k]: add(num)
    res=[]; append=res.append
    half = k // 2
    odd = k & 1
    for i in range(k-1, n):
       if odd: append(float(-lower[0]))
       else: append((-lower[0] + upper[0]) * 0.5)
       if i+1 == n: break
       remove(nums[i-k+1])
       add(nums[i+1])
    return res

Need check `remove` assumes lower nonempty. But after initialization, if k>=1 lower_size at least 1. During slide, remove called with current valid window size k. lower_size maybe? For k=1 lower_size=1. For k even lower_size=k/2>=1. For k odd lower_size=(k+1)/2>=1. So lower nonempty valid top. But heap lower may contain stale and top valid. Good.

But potential bug in remove: if lower top stale and we compare `num <= -lower[0]` before pruning? Suppose top stale? Could top stale occur before remove? We prune after balance and after remove if top stale. Add calls balance; if top stale could appear? Add pushes to one heap and balance. If moving from lower to upper, lower top valid before pop, new top may be stale, prune_lower called. If moving from upper to lower, upper top valid before pop, new upper top may be stale, prune_upper called. So after add/balance tops valid. After remove, if top stale, pruned. If removal doesn't make stale top? If stale element under top, top valid. So top valid before remove. Good.

But potential bug: `remove` uses `if num <= -lower[0]` to decide which side it belongs to. If duplicates and equal values across heaps? Invariant lower <= upper. If num equals both top? Could be num == -lower[0] == upper[0] (duplicates spanning halves). We assign to lower if <=. Is that okay? Suppose remove value equal to boundary, and there are copies in both heaps. Decrementing lower_size might be wrong if actual outgoing copy belonged to upper. But values indistinguishable; we just need remove one copy from the multiset. If there is at least one copy in lower, we can decrement lower_size and mark delayed value. But if the heap that actually had outgoing copy was upper and lower had only valid copies that should remain, decrementing lower_size and marking delayed means we'll later prune a lower copy (maybe top) and upper_size still counts a valid copy that maybe should have been removed. Does total multiset remain correct? We need maintain multiset counts, not exact identities. If a value occurs in both heaps, removing one occurrence by decreasing lower count and marking one delayed value: There will be one stale marker for value; later one heap will have an extra copy relative to valid size. If it's not pruned immediately, could top valid? Let's examine: We decrement lower_size, add delayed. The heaps physically still contain same values. We have conceptually marked one physical occurrence in lower as stale, but we don't know which. If lower heap contains value occurrences, it will prune one when it reaches top. If lower top is value, prune immediately. If lower top > value? impossible for max heap if value is lower? Wait if num == -lower[0], value is max lower, prune lower. If num < lower max, value occurrence might be deeper. Marking delayed value means some physical occurrence of value in lower is stale. Fine. If actually outgoing occurrence was in upper, but we mark lower one stale, total counts: lower_size decreased, upper_size unchanged. But physically upper still has extra occurrence? Conceptually we shifted ownership: we leave an upper occurrence valid and make a lower occurrence stale. Since values equal, the multiset of valid values is identical (one fewer value num). The invariant lower valid <= upper valid? If values equal, okay. But if we make lower occurrence stale and upper occurrence valid, still valid. So choosing lower for equality is okay.

Need ensure `remove` pruning if `num == -lower[0]` before checking upper? If num equals lower top and upper top, prune lower; maybe delayed marker consumed by lower top. Good. If we didn't prune, balance might move stale? remove prunes lower. Good.

Could there be case where `num == -lower[0]` but delayed count for num from previous stale in upper, and current outgoing belongs upper, but we prune lower consuming marker, leaving upper marker? Delayed dictionary keyed by value cannot distinguish heaps. Standard approach with single delayed dict works because values indistinguishable and sizes determine side. But if same value exists in both heaps, marker can be consumed by either heap. Is sizes consistent? Yes total delayed value count corresponds to physical extras. When prune lower sees top value num, it pops one physical copy and decrements marker. It doesn't care which heap marker originally for. Sizes: if remove decremented upper_size but prune lower later, sizes? Let's analyze equality issue more deeply. Standard remove: if num <= max_lower: lower_size-- else upper_size--; if num == max_lower prune lower; elif num == min_upper prune upper. If marker from upper gets consumed by lower due to duplicate, but sizes were decremented upper, then lower_size unchanged but physical lower popped extra, upper_size still counts upper extra? That could mismatch. However with equality we always decrement lower if num <= max_lower, so if marker for value previously from upper (num > max_lower at removal time) and now due to changes it equals max_lower? Could delayed marker be in upper and later lower top same value, and remove another same value decrements lower and prune lower consumes marker intended for upper. Let's consider standard correctness. Lazy deletion with single delayed and size decisions by current side should work because when value is delayed, it corresponds to an element currently physically in either heap. We decrement size of the heap where we think it resides based on current comparison. If duplicate values straddle boundary, choice arbitrary but consistent with sizes? There is known implementation using two heaps and delayed set by value, and remove chooses lower if num <= lower_max. It works.

But to be safer, we can maintain delayed counts per heap? Or use order statistic tree. But standard works.

Let's try to find counterexample. Values [1,2,2,3], k=3. Add all: lower [2,1], upper [2,3], sizes 2,1. Remove outgoing 1 (num <= max_lower 2) lower_size 1, delayed 1. 1 not top, balance lower_size=1 upper=1 no move. heaps physical lower [2,1(stale)], upper [2,3], valid sizes lower {2}, upper {2,3}? Wait window should [2,2,3]. lower valid size should be 2 (ceil 3/2). But lower_size=1, upper_size=1 after remove? k-1=2, balance not called? remove calls balance: lower_size=1 upper_size=1, okay for even 2. But window before add is size 2 valid values [2,2,3]? Actually after removing 1, window [2,2,3] has 3 elements? Wait slide remove then add. Initial after first 3: [1,2,2]. Remove 1 -> [2,2] valid size 2. But heap physical upper has [2,3] where 3 is next not yet added? No we only initialized k; upper should contain [2] not 3. Sorry add sequence. Let's simulate [1,2,2,3] k=3 init first 3 [1,2,2]. Add 1 lower [1], add 2 upper [2]? balance? after 2 elements lower_size=1 upper=1. Add 2 <= lower max? num=2 >1 -> upper [2,2], upper_size=2, balance lower<upper: move upper top 2 to lower. lower_size=2, upper_size=1. Physical lower maxheap [-2,-1], upper [2]. good.
Remove 1: delayed 1, lower_size=1. 1 != top 2. balance lower=1 upper=1 no move. Valid [2,2] represented lower [2(stale? no, stale 1 deeper)], upper [2]. lower_size=1 upper=1. physical lower has [2 valid,1 stale], lower_size=1. But max lower top valid 2. upper valid 2. Window [2,2] median 2. Add 3: num > lower top 2 -> upper [2,3], upper_size=2, balance lower<upper: move upper top 2 to lower. lower_size=2, upper_size=1. But moving upper top 2: which copy? upper valid 2 moved. lower now physical [2(old valid),1(stale),2(moved valid)] size 2. valid lower {2,2}, upper {3}. good. Stale 1 remains. Fine.

Now equality across heaps. Suppose window [2,2], lower size1 upper size1 both value 2. Remove outgoing 2. Our remove chooses lower (<= lower top), lower_size=0, delayed 2, prune lower because top=2: pops lower 2, deletes delayed. upper still has 2. balance lower<upper move upper 2 to lower. Valid window [2] represented lower [2], good. If actual outgoing was upper, result same.

Now if delayed marker from upper consumed by lower: Suppose value 2 delayed in upper, later lower top 2 and remove another 2. Could marker be in upper? For marker to be in upper, remove of a 2 previously was assigned upper (num > lower_max at that time). If lower_max <2, but lower has top 2? impossible if lower_max <2. Later lower_max could become 2 after balance moving 2 from upper to lower. But marker for 2 in upper: if upper top 2 and delayed marker for 2, remove should have pruned upper if top. If marker deeper in upper, upper top maybe >2? Since min heap, deeper >? In min heap, a smaller stale 2 cannot be below a larger top? top is min, so if stale 2 in upper, top <=2. If valid 3 top? min would be 2 if stale 2 present. So stale smaller value in upper would be top and pruned. Thus marker in upper likely top or will be top before larger values move. Hmm.

Standard okay.

But one issue: using `num <= -lower[0]` for remove when lower top stale? We argued top valid. Need ensure after initialization with k=0? k>=1. okay.

Potential issue with -0.0? median of 0.0 maybe -0.0? If input -0.0, lower stores -(-0.0)=0.0? okay. For odd return float(-lower[0]) maybe positive 0.0. Fine.

Performance: The nested functions use closure variables. `lower` and `upper` lists mutated. `delayed` dict mutated. Good.

Could optimize by not using `balance` after add for initial first k? Need not. Fine.

But maybe hidden test expects no imports inside? okay.

Need consider input `nums` empty and k=0? k<1 raise ValueError. If k > len raise. If k = len(nums) return one median. Our init adds all, loop range(k-1,n) one, append, break if i+1==n. good.

Now think about alternative Fenwick maybe easier to prove? But need code complexity. Heap algorithm may have corner cases but standard. Let's test more thoroughly with random by mental? Could maybe write proof but final code only. Need ensure final code is complete. Could include type hints.

Potential problem: Python recursion? none.

Potential problem: median of even k with lower top and upper top maybe stale if no valid? For k even and after remove before add, sizes equal? But we append before slide. okay.

Let's simulate a complex scenario with duplicates and stale top after balance.

Initial [1,3,2], k=2? init: add1 lower; add3 upper -> balance lower=1 upper=1. median (1+3)/2=2. slide remove1: delayed1, lower_size=0, num==lower top? 1==1 prune lower pops 1; upper size1; balance lower<upper move upper top3 to lower lower_size1 upper0. add2: lower top3, num<=3 push lower [3,2] lower_size2; balance lower>upper+1 move top3 to upper, lower_size1 upper1. Valid [2,3]? window after slide [3,2], lower [2], upper [3], median 2.5. good.

Case [2,1,3], k=2. init lower [2], upper [1]? Add2 lower; add1 <=2 push lower size2 balance move 2 to upper, lower [1], upper [2]. median 1.5. remove2: delayed2, num<=lower top? 2<=1 false => upper_size=0. num==upper top 2 prune upper pops. balance lower_size1 upper0 ok. add3: 3<=1 false upper [3], sizes1,1 median2. good.

Case [1,2,3,4], k=3. init [1,2,3]: lower [2,1], upper [3]. median2. remove1: delayed1 lower_size1; top2 not; balance lower1 upper1; add4: >2 upper [3,4] upper_size2; balance move 3 to lower; lower_size2 upper1; median3. good.

Stale accumulation with monotonic increasing k=3: [1,2,3,4,5]
init lower [2,1], upper [3]
remove1 lower_size1 delayed1; balance lower1 upper1; add4 -> upper [3,4] size2; balance move3 to lower. lower physical [3,1(stale),2? Let's represent: initial lower [-2,-1]; after remove no pop; add4 push upper [3,4]; balance pop upper 3 push lower -3. lower heap [-3,-1,-2]? Max top 3, contains stale1, valid2? lower_size after remove1: lower_size was2->1; balance lower1 upper1; add4 upper_size2; balance move: lower_size2 upper1. Valid lower {2,3}, stale1. top3 valid. median3. remove2 (outgoing): num=2 <= top3 -> lower_size1; delayed2; 2 != top; balance lower1 upper1; add5 upper_size2; balance move upper top4 to lower: lower_size2; lower heap now top4, contains stale1,2, valid3,4? Wait valid window [3,4,5], lower size2 should {3,4}, upper {5}. yes. top4 valid. Good. Stale not top.

Now decreasing monotonic [5,4,3,2,1], k=3. init add5 lower; add4 lower size2 balance move5 upper lower [4], upper[5]; add3 <=4 lower size2 upper1 -> lower [4,3], upper[5]. median4. remove5: delayed5, num<=lower top4? false -> upper_size0; num==upper top5 prune upper empty; balance lower2 upper0 move lower top4 to upper lower_size1 upper1. valid window [4,3] represented lower [3], upper [4]. add2: <=lower top3 push lower size2 (lower [3,2]), balance no? lower2 upper1 okay. median3. remove4: delayed4, num<=lower top3? false -> upper_size0; upper empty? num==upper[0]? upper[0]=4, prune upper pops; balance lower2 upper0 move top3 to upper lower_size1 upper1. valid [3,2]? lower [2], upper [3]. add1 push lower size2 lower [2,1]. median2. Works. Stale? upper stale removed immediately.

What about stale values in upper smaller than top? In min heap, smaller stale would be top. In lower, larger stale would be top. So stale accumulate only on side where they are not extreme: lower stale smaller than max, upper stale larger than min. Balance moving lower max to upper might move valid max; if lower top valid. Stale smaller remain. Upper stale larger remain.

Need ensure when balance moving from upper to lower, upper top valid. Upper stale smaller would be top and pruned; stale larger not top. Good.

Potential issue with pruning after move: Suppose lower_size > upper_size+1, pop lower top valid, push upper. But upper might have stale top? We push moved value; then lower prune. But upper top could be stale from previous delayed larger? Wait upper is min heap; stale smaller would be top. If upper had stale top before, should have been pruned when it became top. Could it become top now because we moved a larger value? Moving from lower to upper pushes value >= upper valid min? The moved lower max could be larger than upper top. If upper top was stale but was not top before? In min heap, if stale value is larger than current valid min, it's not top. Pushing larger doesn't make it top. If stale value smaller than current top, it would have been top. So no new stale top in upper. For moving upper to lower, lower max stale? stale lower smaller than top not top; moving upper min to lower pushes value <= lower valid max? Could pushed value be smaller than stale larger? In max heap, stale larger would be top if existed. So no. But prune after moving lower maybe new lower top stale smaller? Could be? We popped max valid; new top might be stale with value smaller but larger than valid next? Wait stale smaller than old max could become top after old max popped. If its value is greater than remaining valid max, then it becomes top. That can happen: lower contains valid [5,1], stale [4] (stale but smaller than 5, larger than 1). lower_size=2, upper maybe. If lower_size > upper+1, pop 5, push upper; now lower top could be stale 4, lower_size decremented to1, but physical top stale; lower valid top should be1. Need prune_lower after pop. We do. Good. Similarly upper moving pop min could expose stale min. Good.

But in remove, if we decrement lower_size and don't pop top, but lower_size decrease might not require balance; stale top? If top stale from earlier? top valid. If outgoing value is top, prune. If outgoing value not top, could top become stale? No, outgoing not top. But if lower_size decreased and lower had stale top? no. Good.

Now, potential bug with `prune_lower` after popping in balance: It will also pop any delayed top, including possibly multiple. Good. But lower_size counts valid, not physical. Popping stale does not change lower_size. Good.

Need ensure `delayed` deletion uses `cnt is None`? If key maps to 0? We delete zeros. Good. But if input has `None`? list[float] no.

Potential issue with floats: `delayed.get(x)` returns None if missing. If a float key is `None` impossible. If key exists with count 0 impossible. Good.

Now, performance of `float(-lower[0])` for odd: lower[0] negative; -lower[0] might be int if input ints? But list[float] but could ints. Return floats. If odd and lower top is negative zero? fine. Could use `float(-lower[0])`. Even expression yields float because division by 2.0. If lower top and upper top are ints, returns float. Good.

Need maybe handle `k == 1`: For each number median is itself. Our heap algorithm works but overhead maybe. Could optimize: if k == 1: return [float(x) for x in nums]. This improves. Also if k == len(nums): compute sorted? But k up to 200k; sorting O(n log n) once maybe okay but heap O(n log k) same. But for k==1 simple. Could include.

Could also optimize k==2? Not necessary.

Potential hidden performance: nested functions with closures might be okay. But to be safe, implement with inline logic in loop? Let's consider optimizing final code for 2 sec. 200k with heap algorithm likely <1s in PyPy? On CPython maybe 0.5-1.5. Need well under 2. Maybe nested functions overhead okay. But let's design faster version without inner add/remove? Could be more verbose but robust. Since final answer can be lengthy. Need maybe avoid nonlocal functions for speed. But clarity matters. We can keep functions and bind locals. Let's think CPython performance: 200k iterations, each remove+add calls balance maybe two function calls. 400k balance calls; plus prune functions. Function call overhead ~0.1us? Actually Python function call ~100ns? More like 100-200ns? 400k ~0.08s. Heap operations maybe bigger. Fine.

But `nonlocal` variable access slower. Still okay.

However, there is a known issue: Lazy deletion with delayed dict and sizes can suffer from heap growth O(n), log n. For n=200k okay. But if k small and n large, heap may grow O(n) causing more operations. For k=1000, heap size maybe up to O(n) in monotonic increasing for lower. lower size 200k, operations log 200k ~18 vs log1000 ~10. Still okay. Memory 200k floats ~1.6MB plus list overhead ~1.6MB, okay.

But if k=1, our optimized returns direct avoids heap growth.

Could also periodically rebuild heaps to avoid stale growth? Not needed. But maybe hidden n=200k, k=1000, worst-case heap size 200k, heapq push/pop on large heap still okay. 400k*18 ~7.2M comparisons. Python comparisons floats fast. Might be ~1s. Good.

Alternative Fenwick: heap operations vs BIT loops. Heapq uses Python code with comparisons and loops too. Lazy heap may be fine.

Let's examine correctness for median if lower top and upper top are floats and sum overflows to inf? For very large finite floats (1e308 and 1e308) sum inf, median inf incorrectly; robust median formula: `lower_val + (upper_val - lower_val) / 2.0`? For same sign large avoids overflow? If lower=-1e308 upper=1e308 difference inf? `lower + (upper-lower)/2` also inf? More robust: `a + (b - a) / 2` can overflow if b-a overflows. `(a + b) / 2` can overflow. Could use `a/2 + b/2` which avoids overflow for finite? If a=1e308, b=1e308 -> 5e307+5e307=1e308 okay. If a=-1e308, b=1e308 -> -5e307+5e307=0. If both same sign max -> okay. If a=1.797e308, b=1.797e308, a/2+b/2 = inf? 8.988e307 + 8.988e307 = 1.797e308 maybe okay; if exact max, half is finite, sum may be max. If values > max impossible. If one inf, returns inf or nan. Use `(a + b) / 2.0` simpler. User likely not testing overflow. Could use `a + (b - a) * 0.5` but difference overflow. `a/2 + b/2` is safer. But if a=-1e308, b=-1e308 -> -1e308. Good. Use `(-lower[0]) * 0.5 + upper[0] * 0.5`? That yields float. For exact median maybe slight rounding differences? Usually accepted? They didn't specify tolerance. Return floats. Could `(a + b) / 2.0` standard. I'd use `(-lower[0] + upper[0]) / 2.0` because expected. If overflow edge not considered. But maybe they test with large floats? Use stable `a + (b - a) / 2.0`? Standard `a + (b-a)/2` more accurate but difference overflow. `a/2 + b/2` avoids overflow but can underflow if very small? a=5e-324, b=5e-324 -> a/2 underflows 0, b/2 0 => 0 instead of 5e-324. Hmm. `(a+b)/2` would underflow? 5e-324+5e-324=1e-323, /2=5e-324. So a/2 underflows worse. Could use `math.fsum`? Standard library math allowed but function call overhead for 200k okay. `math.fsum((a,b)) / 2.0` robust sum overflow? fsum still returns inf if sum overflow. Could scale? Not needed.

Given list[float], use direct mean.

Potential issue: input contains `float('nan')`. Comparisons with nan false. Algorithm breaks. Median of NaN not well-defined. Could handle by filtering? Not specified. Usually not. If NaN present, order undefined. We can ignore.

Need maybe use `list[float]` type hint. Python 3.11 supports. Good.

Let's consider using `heapq` maxheap via negative. For floats, negative of -inf = inf, okay. If num = -inf, push -(-inf)=inf into lower. lower top maybe inf? max heap stored negative values; top is most negative? Wait Python minheap on negative values: lower stores -num. To get max num, we need smallest -num (most negative) i.e. largest num. Example num=5 -> -5; num=3 -> -3; minheap top -5 -> max 5. For num=-inf -> -(-inf)=inf. It will be at bottom because inf large. Good. For num=inf -> -inf at top. Good.

Potential issue: `-lower[0]` if lower[0] is `-inf` returns inf. okay.

Now, think if using `lower_size` and `upper_size` valid counts but heaps physical may have stale at top after initialization? no.

Could there be `lower_size` negative? If remove decides side incorrectly due to lower top stale? no. But with equality duplicates and choosing lower maybe lower_size could become negative if no valid lower element but num equals lower top stale? Wait if lower_size=0 but lower heap top stale? Then lower top might equal num. remove would check `num <= -lower[0]`, decrement lower_size negative. Can lower_size=0 while lower heap has stale top before remove? Invariant sizes for current window: if lower_size=0 then upper_size maybe? For k>1, balance ensures lower_size >= upper_size except when total size k-1? But before remove current window size k >=2? For k=2, lower_size=1. For k>1 lower_size at least 1? If current window size k and balanced, lower_size = ceil(k/2) >=1. So lower_size cannot be 0 before remove for k>=2. For k=1 lower_size=1. So no negative. During remove after decrement lower_size could be 0 but then balance moves. Good.

What if lower heap top stale but lower_size>0? We argued top valid. Let's prove prune after balance maintains. Suppose lower_size>0. If top stale, it would have become top either due to push (new pushed element could be stale? push new valid; no), or pop (balance pop) and prune called, or removal top prune called. Good.

Need maybe call prune at start of median? Not necessary but could defensive. However if due to equality bugs top stale remains, median wrong. Could call prune_lower(); prune_upper() before median to be safe, but extra overhead 2 per loop maybe while loops usually immediate get. It adds dict get and function calls. Not needed. Could call after remove/add already. For safety, maybe in median loop before append:
prune_lower(); prune_upper()
This ensures top valid. But adds overhead. If algorithm correct, no. Could include to guard stale top from edge cases; but if top stale, pruning might reveal median. It might also change sizes? Stale popping doesn't change sizes. But if lower_size says valid elements but all physical stale? impossible. Extra get 400k, negligible. But prune functions as nested calls add overhead. Maybe not.

Let's test a tricky duplicate boundary scenario with single delayed dict. We can brute mentally? Suppose values [1,2,2,2,3], k=3.
init [1,2,2]: lower [2,1], upper [2]. sizes2,1.
remove1: lower_size1 delayed1; balance1,1. heaps lower physical [2,1(stale)], upper [2]. valid [2,2]. median2.
add2: num<=lower top2? yes push lower (value2) lower_size2; balance lower2 upper1. physical lower [2,1,2], upper [2]. valid lower size2. Which copies valid? We have three 2s physical in lower? Actually initial lower had valid 2 and stale1. Pushed new 2 valid. lower_size2. Good. But there are 3 physical 2? lower has old valid2, new valid2, and maybe upper valid2. Window [2,2,2] median2. lower_size2 upper1. okay.
remove2 (outgoing one of 2s): delayed2, num<=lower top2 -> lower_size1; num==lower top2 -> prune_lower pops top 2, deletes delayed. lower physical still contains old valid2? Depending heap order, pops one 2. lower_size1. upper size1. balance no. physical lower has one 2 valid, upper has 2 valid. valid window [2,2]. good.
add3: >2 upper [2,3] upper_size2; balance move upper top2 to lower lower_size2 upper1. physical lower has two 2 valid, upper 3. median2. Good.

Now scenario where delayed value top in upper after equality? [2,2,3], k=2? init [2,2]: lower[2], upper[2]. remove2 chooses lower prune lower; balance move upper2 to lower. good.

What if remove value equals lower top but lower_size decision should be upper due to duplicates? Suppose lower_size=1 upper_size=1 both value 2. Remove outgoing actual from upper, but we choose lower, prune lower, move upper to lower. Valid count 1. good.

Now, is lower always contains <= upper valid? With duplicate boundary yes equal. If choose lower stale, upper valid equal, okay.

Potential problem with `if num == -lower[0]: prune_lower() elif num == upper[0]: prune_upper()`: If num == lower top and delayed marker should be for upper (due to previous assignment), prune_lower consumes marker and leaves upper_size count too high? But sizes? Let's find sequence where marker for value assigned upper but later num==lower top and remove chooses lower. For marker assigned upper, at its removal time num > lower_max. Later lower_max may increase to num due to adding larger? lower_max increases only by moving from upper or adding smaller? lower can gain value num by moving from upper (when lower_size<upper_size) or by add num <= lower_max (not if lower_max<num). To have lower_max become num, maybe a valid num moved from upper to lower. But if marker for num in upper and num not top? In min heap, if marker num is smaller than top? impossible; if marker num deeper, top <=num. If top valid = num, then upper top stale? Actually if marker for num in upper and top valid num, remove should have pruned upper at removal time because num == upper[0]. So marker for num in upper only if upper top > num? But min heap top cannot be > a contained num. So marker for num in upper implies top is num (stale) and pruned immediately unless there is also valid num? If delayed count and top valid num? How know? It will pop one, maybe valid. But if there are more copies than delayed, marker could remain and top still num. It may be popped later when top num. So marker for num in upper gets pruned when upper top num. It cannot survive with lower_max < num? It could survive if upper top num but prune didn't remove because delayed count? prune removes while top delayed, so it will remove at least one. If there are more valid copies num than stale, after popping stale count, top may still num but delayed count zero. Marker gone. If there are multiple stale num in upper, it pops all consecutive top stale until valid. So marker for num won't remain in upper with top num. If marker for num remains, top > num? impossible. Thus single dict okay.

Similar for lower marker: if lower_max > num, marker for num in lower can survive deeper; lower_max becomes num only after larger valid elements removed/moved; then prune lower. It won't be consumed as marker for upper because upper markers for same value don't survive as argued. Good.

Now, maybe using `<=` in add can place equal values in lower, causing lower_size possibly > upper_size+1 then balance moves equal to upper. Fine.

Let's consider initial add with k huge all equal. Each add <= lower top true push lower, balance moves top to upper when lower_size > upper+1. Physical lower/upper equal. Stale none. Good.

Could `balance` move a stale top if remove marked top but then `num == -lower[0]` false because lower top stale with same value? Wait if remove marks a top stale, then top is delayed. We prune if outgoing equals top. But if top was already stale due to previous delayed, and outgoing not equal? top stale value x, outgoing y. If y not x, top remains stale; remove chooses side based on x. Could happen? Top stale should have been pruned earlier. But suppose multiple delayed markers for x, prune removed only one, top still x and delayed count still >0? `prune_lower` loops while delayed top; if there are multiple stale x at top, it pops until no delayed x or top different. But if there are also valid x, delayed count may become zero while top x valid. If delayed count remains >0 after popping one stale x but there are another stale x below? heap top still x; prune loop continues because delayed.get(x) still >0, so pops next. If there are valid x above stale? Indistinguishable; it may pop valid x, but count delayed decreases. Physical multiset after popping x valid and leaving stale x elsewhere is equivalent. Sizes: lower_size unchanged by prune, but we popped a physical x that might have been counted valid. However we decrement lower_size earlier for removed element. So total valid count okay. If we pop valid instead of stale, the stale remains deeper but counts as valid? This is the indistinguishability; sizes reflect valid count. As long as number of physical elements minus delayed markers = size. Popping any top with delayed marker reduces physical count and delayed count, sizes unchanged. Invariant physical_count = size + delayed_markers_in_heap. Good. It doesn't matter which copy.

Need ensure prune loop doesn't pop a top with delayed marker when lower_size says no valid elements but physical top exists; popping reduces physical but size 0; okay if physical stale count equals delayed. If lower_size=0 and top delayed, prune may empty heap. Good.

Now, possible issue: In remove, after marking delayed and decrementing size, if `num == -lower[0]` but lower top may be valid not the one removed; prune pops one top value num. If lower_size becomes 0 but there are valid lower elements deeper? Can lower_size be 0 while physical deeper valid? If we popped top valid but size 0, deeper physical should be stale (delayed) maybe? But if there are deeper valid values < num and lower_size was 1 before removal, only one valid element (top) and rest stale. okay. If lower_size >1, popping top may remove valid, but size decremented accounts. If there were stale copies of num deeper, they remain but delayed count reduced maybe insufficient? physical_count = size + delayed_count. Let's formalize: before remove, physical lower P, delayed markers in lower D, valid lower_size = P - D. Mark delayed num: D+1, size -1, invariant P - (D+1) = size. If prune lower pops top x=num with delayed count>0: P-1, D-1, size unchanged; invariant P-1 - (D-1)=size. Good. It doesn't matter if popped physical copy was counted valid or stale. So correct.

Now, code style: final must be single ```python code block. No tests. Should not print.

Potential issue: The problem says Return floats. If k odd and input int, `float(-lower[0])`. If even, division. If we optimize k==1 `[float(x) for x in nums]`. Good.

Could include docstring? okay. User asked write function. Code block only. Could include imports top-level. Need standard library only.

Let's think about using `heapq` only. Should we import at top? Yes.

Potential hidden constraints: `len(nums) - k + 1 values, in order`. If k > len raise. If k==0 raise. If len(nums)=0 and k=0? k<1 raise before k>len? If k=0 and len=0, raise. If k=-1 and len=0, raise. Use `if k < 1 or k > len(nums): raise ValueError`.

Now, is O(n log n) memory O(n) okay? yes.

Could there be faster method using `statistics.median` with deque? no.

Let's consider using two `heapq` with lazy deletion but `balance` after add and remove. There is known bug: after add, balance may move a delayed element if top delayed. We prune after move but what if before move top delayed? Remove should prune if outgoing top, but if top delayed from earlier not pruned? We think no. Could call prune before balance in balance: `prune_lower(); prune_upper()`? That may be safer but overhead. Maybe add at start of balance? If top delayed due to unforeseen, balance would move stale and break. But our invariants should prevent. However, in remove, we mark delayed and decrement size, then call balance. If outgoing is not top, balance might need to move from a heap whose top is not delayed. okay. If outgoing is top, prune before balance. Good. In add, no new delayed. Balance moves; if after pop top stale, prune. But what if before balance top stale? no. Good.

But there is a subtle case: In remove, we mark delayed num. If num is in lower but not top, and lower_size becomes less than upper_size, balance moves from upper to lower (pushing moved into lower). The stale num remains deeper. No prune needed. If num is in upper but not top? In min heap, if not top, num > upper top. We mark delayed. If upper_size becomes less than lower_size, balance moves lower top to upper. Stale num remains deeper. okay. If upper_size becomes zero and upper heap only stale? balance maybe lower>upper+1 move lower to upper; upper heap may contain stale smaller? Wait upper_size zero but upper heap may contain stale elements? If upper_size zero, all physical in upper are stale delayed. But if upper heap contains stale smaller than moved value, when we push moved value, upper top could be stale. Balance after moving from lower to upper calls prune_lower, not prune_upper. Then upper top stale! Next median or remove could use upper top stale. Is this possible? Important.

Let's analyze: Can upper_size become 0 while upper heap still has stale elements? Suppose k=2, state lower_size=1 upper_size=1. Remove outgoing from upper -> upper_size=0. If outgoing not top? But upper heap size valid 1, physical may have stale elements. If upper_size=1 and outgoing not top, then top is a different valid? In min heap, valid elements maybe [top valid 5, outgoing 7 stale later]. If remove 7, delayed7, upper_size=0. Physical upper still contains valid5? Wait if upper_size=1, there should be exactly one valid in upper. If outgoing not top, top is valid (5), outgoing 7 deeper. After marking delayed and size-- to 0, valid count zero but physical upper has top 5 which is now supposed to be stale? But we didn't mark 5 delayed. We marked 7. The invariant physical_count = size + delayed markers in upper: before P maybe 2 (5 valid,7 valid), D=0, size=1? Wait if P=2 and size=1, there must be one delayed marker for some value. Suppose 7 was already stale? Let's construct. For upper_size=0 but physical top valid? This would violate invariant if D not matching. Let's track invariant. At state before remove, upper_size=1, physical P, delayed markers in upper D = P - 1. Outgoing num not top. Could num be not top but there is exactly one valid and it is top; outgoing must be one of valid? If upper_size=1, there is one valid element. If outgoing belongs to upper and not top, then top would be stale (because only valid is outgoing below a stale smaller). But top stale should have been pruned. Thus impossible. So if upper_size=1 and outgoing not top, outgoing cannot be valid? But remove chooses upper based on num > lower_max; it may be a stale physical element? The outgoing value belongs to window, so valid. Thus if valid upper not top, top must be stale, impossible. Therefore top valid = outgoing if size1? In min heap, if valid not top, top smaller stale. So top valid must be <= all. If outgoing > top, top is valid? But then there are at least two valid (top and outgoing) because outgoing not stale, so upper_size >=2. Thus if upper_size=1, outgoing must be top. So prune. Good.

For upper_size >1, after decrement could become >0. Physical stale top? no.

But case upper_size becomes 0 from 1 only, top valid and outgoing, prune if num==upper[0]? Yes top is outgoing, prune upper pops. But prune_upper only called if `elif num == upper[0]`. We check lower first; if num equals lower top? If num in upper and equals lower top? That means value equal boundary; remove chooses lower not upper. Then upper_size not decremented. But actual valid upper copy? We conceptually move stale to lower. Upper_size remains. So upper_size not zero. okay.

What about lower_size becomes 0 with lower heap stale top? symmetric. If lower_size=1 and outgoing lower, outgoing must be top (max heap: if valid not top, top larger stale). prune lower. Good.

Now, moving lower to upper when upper has stale top? Suppose upper_size < lower_size-1, so upper_size maybe 0 and physical upper all stale. Can upper physical all stale with upper_size=0 and top stale not pruned? If upper_size became 0 earlier, we argued top valid was pruned. But could physical upper contain stale larger than top valid after upper_size zero? If upper_size zero, no valid; any physical are stale. The smallest stale would be top and should be pruned. If prune removed only some stale while delayed count remains? prune loops until top not delayed. If all physical stale, it empties upper. So upper physical empty. Good.

Thus safe.

Now, consider `remove` if lower top stale due to earlier not pruned? safe.

Let's maybe include defensive prune at start of remove? E.g. before deciding side, `prune_lower(); prune_upper()` to ensure top valid. But then if lower empty? In current window size k, lower_size>=1, but lower heap might be empty if lower_size=0? not. Could add overhead. Not needed.

Could implement `balance` with while loops instead of if? Since size difference can be more than 1? After add/remove, difference at most 2? Initial add maybe. Using if enough? In add, push one side increases diff by at most 1; if previous balanced, after push diff <=2, one move fixes. In remove, decrement side decreases diff by 1; after balance maybe diff? One move fixes. Initialization via repeated add maintains balance, so if enough. But if lazy deletion size difference could be larger? We maintain before each operation balanced. Each add changes total +1: diff either 0 or1 before; after push, lower_size can be upper+2 if lower was upper+1 and add lower. One move. Remove changes total -1: if lower was upper+1 and remove lower -> lower=upper; if remove upper -> lower=upper+2? Example k odd lower=upper+1; remove upper -> lower=upper+2, total even, one move needed. So if enough. But in remove after prune maybe size unchanged? no. If due to stale physical pops sizes unchanged. Balance if enough. Could use while for safety. Use `while lower_size > upper_size + 1:` and `while lower_size < upper_size:`. More robust; overhead negligible. Use while.

In balance while, after moving and prune, need continue because prune doesn't change sizes but moving may not fix? It will. But while safe. Need be careful prune might pop many stale but sizes unchanged; if after moving sizes balanced, while exits. If prune pops all? okay.

Potential infinite loop if moving from lower when lower_size > upper+1 but lower heap empty? Shouldn't. If lower_size count valid but physical empty due to bug, heappop error. Not.

Now, let's think about using `defaultdict` vs dict. `dict.get` with `None` sentinel. But if count can be None? no. Use `cnt = delayed.get(x, 0); if not cnt: break`. But if cnt=0 absent. Faster maybe.

prune_lower:
while lower:
    x = -lower[0]
    cnt = delayed.get(x)
    if cnt is None: break
    heappop(lower)
    if cnt == 1: del delayed[x]
    else: delayed[x] = cnt - 1

Using `cnt is None` requires `get` default None. If a float value `None` not key. Good. If delayed[x]=0 not possible. If using `get(x, 0)` and `if cnt == 0` maybe int compare. `is None` okay.

`remove`: delayed[num] = delayed.get(num, 0) + 1. For float NaN, get returns None? no.

Potential memory of delayed with floats: okay.

Could use `collections.Counter`? no.

Now, maybe problem expects efficient for n=200k k=1000. Heap with lazy deletion O(n log n) maybe accepted. But let's consider Python heapq on list of floats and dict get overhead. Need maybe faster by using coordinate compression + Fenwick? Let's evaluate actual performance more. For 200k, k=1000, two heaps monotonic increasing: each slide: remove outgoing (not top, delayed dict update, no prune), balance? After remove from lower, lower_size decreases, sizes equal; no move. add new (to upper), balance moves upper top to lower: heappop upper, heappush lower, prune_lower maybe check top (valid) -> one heappop, one heappush, two prune checks. Plus median. So per slide: remove dict, add push upper, balance pop upper push lower, prune check. Heaps lower/upper grow O(n) for lower? Upper pop from minheap of size ~? upper has valid size ~k/2 plus stale larger maybe? In increasing, upper contains stale? Outgoing from lower only, upper valid moved each time. Upper heap may contain stale larger? When moving upper top to lower, upper top valid. Pushing new larger. No stale in upper. Upper size ~k/2. Lower heap grows stale small O(n). heappush lower log O(n) ~18. heappop upper log 500 ~9. Total ~27 comparisons. 200k ~5.4M. Dict. Good.

Decreasing: remove from upper top prune (heappop upper), balance move lower top to upper (heappop lower, heappush upper). lower heap? stale? lower contains valid and maybe stale larger? Removing top upper, lower max moved; lower may not grow? okay.

Worst-case random: heaps sizes O(n?) maybe. Still okay.

Could implement a periodic rebuild to bound heap size at ~2k to improve speed. When len(lower)+len(upper) > 4*k maybe rebuild from current window? But need know current window elements. Could rebuild from `nums[i-k+1:i+1]` using sorted? Too costly. Or rebuild heaps from current window list? Not maintain. Could use delayed dict sizes to rebuild by popping all physical and reconstruct valid heaps? Need iterate heap and filter stale values by delayed markers. That could be O(heap size) occasionally. Not necessary.

Could use sorted containers? not stdlib.

Fenwick with coordinate compression: Need sort unique O(n log n). For n=200k, sorting 200k ~0.05s? BIT loops maybe ~14M Python while iterations. Each iteration list indexing and assignment. Might be ~1s-2s. Heaps likely similar. Heap code simpler.

Potential hidden tests with k=1000, n=200000 random floats. Heap algorithm random: stale accumulate in both heaps, top prunes often. Heap sizes maybe O(n). Operations ~push/pop lower/upper. okay.

Need maybe use `__slots__`? no.

Let's consider writing iterative optimized version without inner functions. Could improve speed but code harder. Let's see if final code with inner functions passes. Usually yes. But user specifically efficiency. We can present optimized standard library code. Maybe add `if k == 1` shortcut. Maybe also `if k == 2`? For k=2 median of adjacent pairs can be computed directly O(n) no heap. Could add if k == 2: return [(float(nums[i]+nums[i+1])*0.5?)]. But direct mean maybe. Not necessary but easy. For k==2, sliding median mean of adjacent pairs. Add shortcut could improve. But code complexity small. Also k==1 shortcut. For k maybe small? not needed.

Could add `if k == len(nums): return [statistics.median?]` but not use statistics? Could sort. Not needed.

Need ensure `nums` may be tuple? Type list but can accept sequence. We use len and indexing. okay.

Let's test `k == 2` shortcut with overflow? Use `(float(nums[i]) + float(nums[i+1])) / 2.0`. If large maybe overflow; same. Could skip.

Potential problem: If `nums` contains `Decimal`? Type float. no.

Now, maybe user wants no printing; final code only. Good.

Let's think about a possible bug in `balance` while loops with prune after move: Suppose lower_size > upper_size+1, heappop(lower) returns stale top? We assume top valid. But what if lower top is stale because delayed marker was added by remove but outgoing did not equal top then, and balance condition before remove? Hmm top stale could appear only after a valid top is popped/moved. If balance condition lower_size > upper+1, lower top valid. After heappop, prune. Good.

But in `remove`, after marking delayed and decrementing size, we do `if num == -lower[0]: prune_lower() elif num == upper[0]: prune_upper()`. What if lower heap is empty? If lower_size becomes 0 and lower heap top valid was pruned? If lower_size 0 and lower heap empty, then `elif num == upper[0]` maybe but lower[0] error in `num == -lower[0]`? Actually we check after decrement but before prune; we used `if num == -lower[0]` assumes lower not empty. If lower heap became empty due to previous prune? For current remove before prune, lower_size>=1, physical lower at least one valid, so not empty. For k=1, lower top valid. Good.

After prune lower, lower may become empty. Then `elif` not executed because first if true. But what if `num == -lower[0]` false, lower heap empty? impossible because if lower_size >=1 but lower heap empty bug. For k=1, first true. For k=2, lower_size=1. Good.

What if `upper` empty and `num == -lower[0]` false? e.g. remove from upper when upper empty? impossible because upper_size? For k odd lower=upper+1, upper could be 0 (k=1) remove lower; for k=3 upper_size=1. So if num > lower top, upper nonempty. Good.

But in remove after pruning lower, if lower empty and lower_size=0, we then call balance. Good.

Need maybe handle `upper[0]` when upper empty in remove's elif. Condition only if first false; if upper empty and first false, error. Could that happen? remove num > lower top when upper_size maybe 0? For current window balanced with lower_size=upper_size+1 (odd k) and upper_size=0 only k=1. For k=1, num <= lower top always because lower contains num; so first true. For even k, lower_size=upper_size>=1 if k>=2, upper nonempty. So safe. For defensive, check `elif upper and num == upper[0]:`. But if upper empty and first false, we might skip prune; balance may error moving? Could add `elif upper and num == upper[0]:` for safety. Similarly `if lower and num == -lower[0]`. Overhead small. But for hot path, lower always true. Could include to avoid rare. Use:
if lower and num == -lower[0]: prune_lower()
elif upper and num == upper[0]: prune_upper()
But if lower empty and num should prune upper? yes. However side decision before uses lower[0] for size. If lower empty, error. So no. But for pruning, safe.

Now, let's think about median for even if upper empty due to k=0? not.

Alternative robust algorithm: Maintain two heaps and a `set` of delayed indices? But values duplicates. Current okay.

Let's perhaps write a formal correctness proof in final? User asked code only? They said Reply with single python code block. So no explanation. Final only code. Need include comments? Fine. Comments okay but code block only. Could include docstring.

Now, maybe need import `heapq` at top. If final code contains only function and import, okay.

Let's test with small examples manually using algorithm.

nums=[1,2,3,4,2,3,1], k=3. Expected windows:
[1,2,3] median2
[2,3,4] 3
[3,4,2] 3
[4,2,3] 3
[2,3,1] 2
Let's simulate quickly? Probably.

Need test even [1,2,3,4], k=2 medians 1.5,2.5,3.5. Already.

Test all equal [1,1,1], k=2: init add1 lower, add1 lower size2 balance move top1 to upper. median1. remove1: delayed1, num<=lower top1 lower_size0; num==lower top prune lower pop1 delayed0; balance lower<upper move upper1 to lower. add1: <=lower top1 push lower size2; balance move top1 to upper. median1. good.

Test negative: [-1,-2,-3], k=2. init add -1 lower (store 1), add -2 <= -1? lower top -1, num -2 <= -1 true push lower store 2; balance lower_size2>1 move -lower[0]? lower heap [1,2]? minheap top 1 => moved=-1, push upper -1? Wait lower stores negative nums: for -1 store 1, for -2 store 2. heap lower [1,2], top 1 => -top = -1 (max). Balance move moved = -heappop(lower) = -1, push upper -1. lower_size1 upper1. lower remaining top2 => -2 max lower. Valid lower [-2], upper [-1]. median (-2 + -1)/2=-1.5. correct. remove -1 (outgoing): delayed -1, num <= lower top? -1 <= -2 false => upper_size0; upper top -1 prune upper pop. balance lower_size1 upper0. add -3: num <= lower top -2 true push lower size2; balance move top -2 to upper; lower [-3], upper[-2]; median -2.5. correct.

Now, test float duplicates with -0.0 and 0.0. Python treats -0.0 == 0.0, dict keys same? yes. Median mean okay.

Potential issue: using value as dict key for floats: `nan` not equal, not hash? NaN hashable but each NaN unequal. If input NaN, delayed dict could have multiple NaN keys? Since `nan != nan`, delayed.get(nan) won't find previous, so remove won't match? Algorithm fails. Not required.

Now, maybe hidden tests with extremely large n and k, recursion no.

Let's consider if `nums` is a generator? Type list, but if generator len fails. okay.

Now, maybe they expect median of every contiguous window size k (len(nums)-k+1 values, in order). Our output length n-k+1. Good.

Potential off-by-one: For i in range(k-1, n): append window ending at i. Then if i == n-1 break; remove nums[i-k+1] (start), add nums[i+1]. For next window ending i+1 start i-k+2. Good.

If n=k, range one; break, no remove. Good.

Now, could initialization `for num in nums[:k]` create slice copy O(k) memory; k=1000 negligible. Could use `for i in range(k): add(nums[i])` to avoid. Use direct loop for efficiency maybe.

Now, maybe `balance` called during initialization for each add. Could optimize initial build: push all k into lower? But k small. okay.

Potential issue: If `nums` length huge and k=1 shortcut returns list of floats, output length n. Good.

Let's decide final code. Need perhaps include comments? Could include concise.

But let's revisit performance of nested functions: `balance` nested accesses `lower_size` nonlocal. In `balance`, `prune_lower` and `prune_upper` are closures. Could be okay. But if we want faster, we can implement without nested add/remove but with inline helper for prune? Let's design optimized function maybe:

def sliding_median(nums, k):
    n=len(nums)
    if k<1 or k>n: raise ValueError
    if k==1: return [float(x) for x in nums]
    import heapq
    lower=[]; upper=[]; delayed={}; lower_size=upper_size=0
    heappush=heapq.heappush; heappop=heapq.heappop
    # define prune functions... same
    # build
    for num in nums[:k]: ... inline add/balance? Could use add.

Maybe nested functions okay. But to maximize speed, could avoid `add`/`remove` function calls by inlining in loop. Let's see code complexity. We need initial build and sliding. We can define `prune_lower`, `prune_upper`, `balance` only. Then inline add code in init and loop, remove code in loop. That reduces function calls for add/remove. balance still called. Or inline balance too? Could define macro-like code? Too verbose. But add/remove called 400k; function call overhead maybe not big. But inlining could improve.

Potential issue with nonlocal sizes if inline loop variables local. Let's attempt an optimized inline version with helper prune and balance? Balance as nested with nonlocal. If inline add/remove, need update sizes and call balance. We can keep balance function. Or inline balance code as small while? In loop:
# add new
if not lower or num <= -lower[0]: push lower; lower_size +=1 else...
while lower_size > upper_size + 1: ...
while lower_size < upper_size: ...
# remove old similar.
This duplicates code but fastest. Could write a small local `balance()` to avoid duplication. The overhead of balance call okay. But inlining add/remove eliminates two calls. Maybe final code with inner functions is more maintainable. Need satisfy performance. I think okay.

Let's estimate CPython 3.11: 200k loops, each with two nested function calls remove/add plus balance. Function call ~80 ns? Actually CPython 3.11 function call maybe ~100 ns for simple? 400k ~0.04s. Nonlocal overhead maybe. Heap ops dominate. Fine.

Now, potential issue: `delayed.get(x)` with float key that is `-0.0` and `0.0`: They are equal and same hash? yes. Good.

Let's consider using integer `lower_size` and `upper_size` as lists `[0]` to avoid nonlocal? nonlocal okay.

Now, let's see if there is any requirement about returning list[float] not tuple. list.

Could add `res = [0.0] * (n - k + 1)` and assign by index to avoid append? Append fine. Prealloc maybe faster? Could do:
res = []
append = res.append
In loop. Prealloc with `out = [0.0]*(n-k+1)` and `out[idx]=...` might be slightly faster but need idx. Use append fine.

Now, if k==1 shortcut with `float(x)` for each; if x already float, float(x) returns same? It may return float if int. Good.

If k==2 shortcut maybe:
if k == 2:
    n = len(nums)
    return [(float(nums[i]) + float(nums[i+1])) * 0.5 for i in range(n-1)]
But if overflow same. Could include. Does it improve? Maybe. But more code. Also if k=2, heap overhead small. Not necessary.

Could add `if k == n:` compute median by sorting `sorted(nums)` once O(n log n). Heap O(n log k) similar. But for k=n, sliding loop none, initialization O(n log n) anyway; sorting maybe faster in C. Could optimize: if k == n: arr=sorted(nums); if k%2 return [float(arr[k//2])] else mean. But sorting 200k in C fast. However heap initialization also 200k heap operations Python maybe slower. If hidden k=n=200k, our heap O(n log n) Python could be ~0.5-1s; sorting maybe 0.05s. Could add. But memory okay. Need careful: If k=n, only one median. Could do:
if k == n:
    arr = sorted(nums)
    if k & 1: return [float(arr[k//2])]
    return [(float(arr[k//2 -1]) + float(arr[k//2])) / 2.0]
This is efficient. But if nums contains NaN, sorted order weird but no? okay. If k=n=1, k==1 shortcut already. Could include.

But if k large close to n, heap still okay. Sorting only for exact k=n.

Could also if k > n//2 maybe sorting each window? no.

Now, maybe use `sorted` for initialization? Not needed.

Let's test k=n with our heap: init 200k adds, median. If all increasing, lower heap grows 100k? Actually balanced by moving, lower_size=100k, upper=100k, heaps size ~100k each. Each add push+pop, ~200k heap ops log100k. Might be ~0.3s? okay. Sorting not necessary but fine.

Now, possible issue with `sorted(nums)` if nums is list of floats and k even, mean of two middle. Good.

But if k==n and nums contains NaN, sorted puts NaN at end maybe, median maybe. Not important.

Could skip shortcuts to keep simple. But k==1 shortcut definitely.

Now, let's think if two-heap lazy deletion with single delayed dict works for float values that compare equal but not same (e.g., 1.0 and 1). Python treats equal, okay. Median float.

Now, maybe they require `ValueError` if k < 1 or k > len(nums). If `k` not int? Type hint int. If k float? `range` expects int. Could raise TypeError? Not required. Could cast? no.

Now, let's think about using `bisect.insort` with `array`? no.

Potential edge: window size k even and lower/upper sizes equal, but `upper` empty if k=0 only. Good.

Now, let's maybe prove to myself with invariant after initialization using add/balance. Each add calls balance after push. If lower_size > upper+1 move one. If lower_size < upper move one. Maintains. Lower top <= upper top? Add decision: if num <= lower max push lower else upper. If push lower and num > lower max? impossible due to decision. If push upper and num < upper min? possible; upper min may become num. But invariant lower max <= upper min? If push upper, num > lower max (strict) and upper min previously >= lower max, so new upper min >= lower max. If balance moves lower max to upper: moved lower max <= previous upper min, so upper min <= moved? Actually moved may be new upper min; lower max after pop <= moved, so invariant. If balance moves upper min to lower: moved upper min >= previous lower max; new lower max = moved (max of previous lower and moved), upper min after pop >= moved? Actually remaining upper elements >= moved, so invariant. Good.

Now, lazy deletion: prune doesn't affect sizes but removes physical. Invariant lower max <= upper min for valid elements? If stale top popped, valid top maybe. If we move physical copies without regard to stale? We only move tops valid due to prune. Good.

Now, consider if prune pops a top value with delayed marker but that physical copy might be needed for invariant? It's stale, removing it only improves.

Now, one potential bug: In `remove`, we mark delayed before deciding side. The side decision uses `-lower[0]`, which might be the value just marked delayed if outgoing equals top. That's okay because top value same. But if outgoing equals top and lower_size>1, top may be valid copy; side lower. Good. If outgoing belongs upper but equals lower top, side lower as discussed. Good.

Now, maybe in `balance`, after moving lower to upper, we call `prune_lower()`. But what if `lower` becomes empty and `delayed` has marker for moved value? Moved was valid; not marked. Good.

Now, let's think about a scenario where after remove, we call balance before pruning the heap that had a stale top not equal to outgoing. Is it possible top stale not equal outgoing and balance moves it? Suppose top stale x from previous delayed markers, but top stale should have been pruned. But what if there are multiple delayed markers for x and valid x; prune only removes one, but top remains x and delayed count remains >0? Actually prune loop continues while delayed.get(top) not None. If delayed count remains >0, it will pop another x. It may pop valid x too but after delayed count decreases. If there are more delayed x than physical x? impossible. If there are valid x and delayed x, after popping delayed count to zero, top x remains valid. If there are still delayed x markers but top x? That means there are physical x top and delayed count >0; prune continues. So no top with delayed marker after prune. If top stale not equal outgoing and outgoing not top, could top stale be newly exposed by size decrement? Size decrement doesn't change physical top. So no.

Now, could there be top stale after `add` before balance? Add pushes valid, no. Could push into lower with value smaller than stale top? Stale top not present. okay.

Now, final code with nested functions should be accepted. But let's consider memory and output of floats. If input list contains `int`, median odd returns float via `float`. Even returns float. If k==1 shortcut returns float. If k==n shortcut returns float. Good.

Potential issue: For odd median, if lower top is a float like `-0.0`, `-lower[0]` could be `0.0`; float. If input int, okay. If lower top is `float('inf')`, -inf? okay.

Now, let's perhaps include a top-level `import heapq` instead of inside function to avoid import overhead? Function import once maybe cached. Top-level import standard. But user asked write function; top-level import okay. If they paste in environment, okay. Use `import heapq` at top. Standard library only.

Final code:
```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    if k == n:
        arr = sorted(nums)
        mid = k // 2
        if k & 1:
            return [float(arr[mid])]
        return [(float(arr[mid - 1]) + float(arr[mid])) / 2.0]

    lower: list[float] = []
    upper: list[float] = []
    delayed: dict[float, int] = {}
    lower_size = 0
    upper_size = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_lower() -> None:
        while lower:
            x = -lower[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(lower)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def prune_upper() -> None:
        while upper:
            x = upper[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(upper)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def balance() -> None:
        nonlocal lower_size, upper_size
        while lower_size > upper_size + 1:
            moved = -heappop(lower)
            lower_size -= 1
            heappush(upper, moved)
            upper_size += 1
            prune_lower()
        while lower_size < upper_size:
            moved = heappop(upper)
            upper_size -= 1
            heappush(lower, -moved)
            lower_size += 1
            prune_upper()

    def add(num: float) -> None:
        nonlocal lower_size, upper_size
        if not lower or num <= -lower[0]:
            heappush(lower, -num)
            lower_size += 1
        else:
            heappush(upper, num)
            upper_size += 1
        balance()

    def remove(num: float) -> None:
        nonlocal lower_size, upper_size
        delayed[num] = delayed.get(num, 0) + 1
        if num <= -lower[0]:
            lower_size -= 1
        else:
            upper_size -= 1
        if num == -lower[0]:
            prune_lower()
        elif upper and num == upper[0]:
            prune_upper()
        balance()

    for i in range(k):
        add(nums[i])

    result: list[float] = []
    append = result.append
    odd = k & 1

    for i in range(k - 1, n):
        if odd:
            append(float(-lower[0]))
        else:
            append((-lower[0] + upper[0]) / 2.0)
        if i + 1 == n:
            break
        remove(nums[i - k + 1])
        add(nums[i + 1])

    return result
```

Check `remove`: if lower empty? It uses lower[0]. For k>1 and maybe after initialization lower nonempty. For k==n shortcut bypass. For k>1, yes. But what if after some slide and before remove, lower_size maybe 0? Current window size k>=2 balanced lower_size=ceil(k/2)>=1. good.

But with k==2 and after initialization lower_size=1. okay.

Potential issue: `if num == -lower[0]: prune_lower()` after lower_size decrement. If lower_size became 0 and lower top is stale? lower top might be valid? If k=2 remove lower, lower_size=0, prune lower if top outgoing. lower heap may contain stale deeper. balance moves upper. okay. If lower heap top stale (from previous) and outgoing not top? side decision maybe wrong? no.

Now, if `upper` empty and `num == -lower[0]` false, `elif upper and ...` skips. Then balance maybe if lower_size<upper_size? upper_size decremented but upper empty? impossible. Good.

Now, k==n shortcut with sorted and mean. For k==n==1, k==1 shortcut before. For k==n==2, sorted arr length2 mean. Good. If k==n but k even and arr contains NaN? ignore.

Now, should we include k==2 shortcut? Not necessary. But if k==2 and n large, heap loop still fine. Sorting shortcut for k==n maybe changes performance but correct.

Potential issue: The `balance` while loops with prune after each move. Suppose lower_size > upper_size+1 and lower heap top is stale due to a delayed marker that was just added in remove for outgoing but outgoing != top? top stale impossible. If top stale due to bug, heappop moves stale to upper and size decremented incorrectly. Could avoid by calling `prune_lower()` at start of balance. Maybe add `prune_lower(); prune_upper()` at beginning of balance? That ensures tops valid before moving. It might be safer, and overhead maybe acceptable. Let's evaluate overhead: balance called for each add and remove (400k). Each prune lower/upper does at least while condition and get top. If tops valid, two dict gets. 800k dict gets, negligible. It could prevent rare stale top issues. But in `balance`, after a move we already prune. At start, maybe unnecessary. Adding could also prune stale top that appeared due to remove not pruned? Safe. Could change side decision? balance called after sizes updated; if top stale, pruning doesn't change sizes. Then move correct. It adds overhead but still likely under 2s. Should we include for robustness? Let's think. In `balance`, if lower_size > upper_size+1 but lower top stale, moving it would corrupt. Could this happen due to our previous equality concerns? If standard invariant, no. But adding start prune reduces risk. However, if lower_size == 0 but lower heap contains stale top, prune may empty. If lower_size > upper+1 cannot happen with lower_size 0. okay.

Similarly before median, we could call prune to ensure top valid. If we call balance at start of balance but not before median, after add/remove balance has pruned after moves. At end of balance, if while not entered because sizes balanced, top stale could remain? If sizes balanced but top stale due to remove not top? We argued no. But to be absolutely safe, before median call prune_lower/upper. Overhead 400k gets. Could include. But if top stale and we prune, lower_size unchanged; median top valid. If pruning changes sizes? no. But could it violate size heap physical invariant? no.

Would start-of-balance prune create issue when `lower` or `upper` empty? prune functions handle. Good.

Maybe final code with prune in balance start and before median is more robust but slower. Need performance. Let's estimate: 200k loops, median 2 gets, balance remove and add each 2 gets = 6 gets per iteration ~1.2M dict gets. Fine. Dict get float key ~50ns? maybe 100ns, 0.12s. Acceptable. It also handles stale top due to any subtle bug. But could it ever prune a valid top incorrectly? It only pops if delayed.get(top) is not None. If delayed count is for same value but the top physical copy is valid and the stale copy is deeper, popping top is still okay because values indistinguishable and sizes accounted. Good.

If we prune at start of balance after remove marked delayed for a value that is top but outgoing maybe not top? If top value equals delayed num but outgoing not top? If top value equals num, then top is same value as outgoing. Popping one top copy okay. So start prune could handle even if `num == -lower[0]` condition somehow missed. Good.

But prune at start of balance could prune top stale before moving, leaving sizes same. Then while condition may still require move. Good.

Should we include `prune_lower(); prune_upper()` at start of balance? It might cause pruning of a heap that we are about to move from, possibly exposing another stale, loops. Good. But it also may pop stale top from upper even if upper_size=0, before balance moves lower to upper, ensuring upper empty if all stale. Good.

Potential downside: In `balance`, if `lower_size > upper_size + 1`, but lower top stale, prune_lower may pop stale and maybe lower_size now greater than upper+1 still? sizes unchanged. Continue prune until top valid. Then move. Good.

Let's incorporate? It may slightly hurt but robust. However, if we prune in balance start, then `remove`'s immediate prune before balance might be redundant. We could remove immediate prune and rely on balance start prune. But `remove` also may need prune before `add`? Balance will prune. Median after slide: remove calls balance, add calls balance; after add's balance start and end, tops valid. If balance while not entered, start prune ensures tops valid. Good. So we can simplify remove: mark delayed, decrement side, balance(). balance starts by pruning both. But add also balance prunes. This might prune before adding? add pushes then balance prunes. Good. Could remove explicit prune in remove. But need side decision in remove uses lower top valid. Before remove, after previous add/balance, tops valid. Good.

If balance always prunes both at start, maybe enough. At initialization, add calls balance which prunes (delayed empty). Good.

But adding prune in `balance` start while sizes variables are local; if prune pops stale top, sizes unchanged. If lower_size says lower has valid elements but lower heap empty? Could prune empty all physical stale while lower_size>0? That would mean physical_count < delayed_count? invariant broken. Not.

Let's see if balance start prune can pop a top with delayed marker that was just marked by `remove` but side size decremented. That's okay. Then while moves. So explicit prune in remove unnecessary. But in remove, if lower_size becomes less than upper_size, balance will prune both then move upper to lower. If upper top stale due to the delayed just marked? If marked value in upper top, prune_upper will pop it. Good. If not, top valid. Good.

Could simplify code:
- `balance` starts with `prune_lower(); prune_upper()`
- `remove` no prune conditions, just mark, adjust size, balance.
- Before median, no prune needed if last balance pruned. But after remove and add, yes. However after remove balance, before add? median only after add. For first median after init, add's balance pruned. Good.

Would this be correct? Need ensure `remove` side decision if lower top stale from previous? previous balance pruned. good.

This reduces function calls in remove (no prune functions except balance). But balance start adds prune calls. Similar.

Let's test a scenario where after remove, sizes balanced but a top became stale because outgoing was top but delayed marker remains for top? balance start prune will pop. Example [1,2], k=2 remove 1 from lower top. remove delayed1 lower_size0; balance start prune_lower pops1; then lower_size0 upper_size1 -> while lower<upper move upper to lower. good. Without explicit prune, also okay if balance start.

What about median before balance? We always call balance after add. Good.

Potential issue: `balance` start prunes upper even if upper_size=0 and upper heap contains stale markers, then `lower_size < upper_size` false if upper_size=0. But if upper heap stale not top? prune only top; if all stale but top stale, it empties. Good.

Let's decide final code with balance start prune and simplified remove? It may be slightly less efficient because balance called twice per slide and prunes both heaps even when not needed. But still okay. Maybe keep explicit prune in remove to avoid pruning both? Hmm. Performance vs robustness. Need well under 2s. 1.2M dict gets fine. But prune functions as Python calls inside balance (two calls) add 800k function calls. Current remove already has prune calls conditionally (mostly false? It calls only if outgoing top, maybe often for k small). Balance start always two calls. More function calls. Could be overhead. Maybe not needed. Simpler with explicit prune is standard and faster. But robust? Standard correct.

Maybe compromise: Keep explicit prune in remove, and in `balance` before heappop check if top stale? Could use `if lower and delayed.get(-lower[0]) is not None: prune_lower()` before moving from lower. Similarly upper. That only prunes when moving. But if sizes balanced and top stale, median maybe? remove would have pruned if outgoing top; add doesn't create. So okay. We can leave as initial code.

Let's not overcomplicate. Use initial code. It's correct.

But let's revisit k==n shortcut: It returns sorted median; if k even and arr[mid-1] + arr[mid] overflows? Same. If input contains NaN, sorted order maybe. okay.

Now, maybe using sorted for k==n but if n=200k and k=n, output one float. Good.

Could add k==2 shortcut to avoid heap for large n small k. If k=2 and n=200k, heap algorithm maybe okay but shortcut O(n) faster. Let's include? It is simple. But mean of adjacent pairs with floats. Need return floats. Code:
if k == 2:
    return [(float(nums[i]) + float(nums[i+1])) / 2.0 for i in range(n - 1)]
But if nums large, overflow. same. It also handles negative zero? fine. If contains NaN, result NaN. Good. This shortcut improves performance for small k. Could also k==3? sliding median can use min/max of three, but not necessary.

Potential issue: If k==2 and nums length 1? k>n raises before. good.

Now, let's consider memory output list of floats 200k ~1.6MB. okay.

Now, if we add k==2 shortcut, we need ensure return type list[float]. If nums ints, float sum. Good.

Could add for k==3 direct? Maybe not.

Now, let's think about an even more efficient algorithm for small k? Not needed.

Potential hidden test: n=200_000, k=1_000, but values are all equal. Heap algorithm: init each add push lower then balance move to upper; lower_size and upper_size. For all equal, after init lower_size=500 upper=500? For k=1000. Slide: remove outgoing equal lower top? Since all equal, remove chooses lower, lower_size--, prune_lower pops top equal, deletes delayed. Then balance? sizes lower499 upper500 -> move upper top to lower. Add new equal push lower (since <= top), sizes lower500 upper500? Wait remove balance moved upper to lower: after remove lower499 upper500, balance moves upper to lower => lower500 upper499. Then add new equal push lower => lower501 upper499, balance moves lower to upper => lower500 upper500. Per slide: prune pops one lower, balance move upper to lower, balance move lower to upper, add push lower. Many heap ops. Still okay. But could optimize duplicates? no.

Potential bug with all equal and prune deleting delayed before move: remove delayed num, lower_size 499. prune_lower pops one equal from lower and deletes delayed. But physical lower now has 499 equal valid? lower_size 499, okay. Then balance moves upper to lower. Good.

Now, if k even all equal, lower_size=upper_size. remove outgoing choose lower and prune lower, causing lower_size=upper-1, balance moves upper to lower. Add push lower then balance moves lower to upper. Maintains. good.

Now, consider all equal k odd: lower_size=upper+1. remove outgoing choose lower, prune lower lower_size=upper, balance no move. Add push lower lower_size=upper+1, balance no move. good.

Now, potential issue: In remove, if num == -lower[0] and lower_size after decrement becomes less than upper_size, we prune lower before balance. If lower heap still has top equal delayed? prune loops. good.

Now, maybe use `>=` instead of `<=` for add? Standard: if num <= lower_max push lower. Good.

Now, let's think about `float` list type hint with `list[float]` requires from __future__? Python 3.11 built-in generics okay. Good.

Now, final answer should be only code block. The system says final answer desired oververbosity 9 but user explicitly single code block. So final code only.

Double-check syntax: nested functions nonlocal lower_size, upper_size. `lower` and `upper` lists mutated but not assigned, no nonlocal needed. `delayed` mutated. `heappush`, `heappop` from outer local. In `prune_lower`, `heappop` local from outer, no nonlocal. Good.

Potential PEP: variable `lower_size` in `balance` while uses nonlocal; after while, okay.

Now, test k==2 shortcut with n=2 returns list length1. If k==n==2, k==2 shortcut before k==n? In code order: if k==1, if k==2, if k==n. For k=2,n=2, k==2 shortcut returns mean. Correct. If we want k==n shortcut for k=2, both correct. k==2 shortcut uses adjacent pair, same.

Now, if k==2 and n large, shortcut does not validate nums values are floats? okay.

Could add k==3 direct to improve but not necessary. Let's not.

Now, maybe use `math`? no.

Let's consider if `nums` contains complex? float only.

Now, possible performance issue with sorted shortcut for k==n and nums length huge but k==n. okay.

Now, let's examine if `k == n` shortcut should come before `k == 2`? Doesn't matter. For k=2,n=2, shortcut O(1) vs sort O(2). fine.

Now, think about correctness of k==n shortcut for even k: median of entire list is mean of sorted middle. Yes.

Now, possible hidden tests with k > len nums and len nums 0. We raise. If k is not int but float 2.0, `k < 1` works, `k > n` works, `if k == 1` false if 2.0? `range(k)` error TypeError. Type hint int. Could robustly `if not isinstance(k, int)`? Not required. But maybe user passes numpy int? isinstance(np.int64, int) false? Standard library? Not. Could cast `k = int(k)`? If k=2.5 silently wrong. Leave.

Now, let's consider using `list[float]` annotation but not importing List. okay.

Now, one more thought: The lazy deletion heap algorithm's heap sizes can grow O(n). For n=200k, okay. But if many stale in lower, `heappush(lower, -num)` log len(lower) could be log200k. Still okay. But if n=200k, output 199k, time maybe under 2s. Let's rough benchmark mentally: CPython heapq heappush/pop on 200k floats ~0.5 micro? Actually heapq heappush in Python loop ~0.5-1 us for small? For log18 maybe ~1-2 us. 400k ops ~0.8s. Plus loops ~0.2. okay.

But monotonic increasing with all equal? more ops maybe 5 per slide -> 1M heap ops ~2s? Need ensure. Let's count worst-case per slide with all equal k=1000: remove: mark, prune lower (one heappop), balance move upper->lower (heappop upper, heappush lower, prune_upper check). add: push lower, balance move lower->upper (heappop lower, heappush upper, prune_lower check). Total heappop: remove prune1 + move1 + move2 =3; heappush: move1 + add1 + move2 =3. 6 heap ops per slide. 200k*6=1.2M heap ops. Each log up to 1000 for valid heaps (not stale huge? all equal heaps size ~k). 1.2M*10 comparisons ~12M. Could be ~1.5s maybe okay. But Python function calls nested maybe. Still maybe under 2. If not, we can optimize all equal? Maybe use periodic rebuild? Or use Fenwick? For all equal, Fenwick updates and finds 2 per slide ~14M loops; maybe similar. Heap okay.

Could optimize all equal? Not necessary. But maybe hidden performance expects robust under 2s. 1.2M heap ops on 200k might be near 2s in CPython. Let's estimate more accurately: heapq.heappush/pop on 1000 list in Python maybe ~0.5 us? Actually Python function call heappush does loop, comparisons. For 1000 log 10, maybe 1 micro. 1.2M ~1.2s. Additional overhead ~0.5. okay. If heap size O(n) log18, ~2us, 2.4s. Could be issue. But worst-case heap size O(n) with 6 ops? Maybe not all equal (heaps bounded k). Monotonic increasing had 3 ops (push upper, pop upper, push lower) log lower O(n). 600k ops log18. okay. Could there be case with 6 ops and heap size O(n)? Maybe oscillating causing many stale top? But heap sizes O(n). Could be 1.2M log18 ~21M loop iterations; maybe 3s. Need perhaps improve with periodic rebuilding to bound heap size, or use Fenwick. Let's think.

The requirement n=200k k=1000 well under 2s. We should aim robust. Can we design faster deterministic O(n log n) with Fenwick maybe? Let's compare. Fenwick loops in Python while maybe 14M simple operations, likely ~1s? Sorting in C. Might be faster and bounded. But implementing kth find efficiently maybe. Let's explore Fenwick approach.

Coordinate compression:
values = sorted(set(nums))
index = {v:i+1 for i,v in enumerate(values)}
bit = [0]*(m+1)
def add(i, delta): while i<=m: bit[i]+=delta; i += i & -i
def find(k): # 1-indexed kth smallest; assume 1<=k<=total
    idx=0
    bitmask = 1 << (m.bit_length() - 1)
    while bitmask:
        nxt = idx + bitmask
        if nxt <= m and bit[nxt] < k:
            idx = nxt
            k -= bit[nxt]
        bitmask >>= 1
    return idx + 1

Initialize add counts for first k. For each window:
if odd: median = values[find((k+1)//2)-1]
else: a=values[find(k//2)-1]; b=values[find(k//2+1)-1]; median=(a+b)/2
Slide: add(idx[out], -1); add(idx[in], 1)

Performance: Preprocessing set+sort O(n log n) C mostly; mapping dict O(n). BIT init k updates Python loops k*logm=1000*18=18k negligible. Sliding 199k: updates 2*~18 loops =7.2M; finds odd 1*18=3.6M, even 2*18=7.2M. Total for even ~14.4M loop iterations. Each loop simple int ops list indexing. CPython 14M ~0.7-1.5s. Plus dict lookups 400k. Might be good. But coordinate compression sorting set of 200k floats: set and sort in C? set construction Python loop 200k, sort C. Mapping dict comprehension 200k. Overhead maybe 0.1-0.2. Could be under 2. It is deterministic O(n log n) and no lazy heap growth. Code more complex but still standard.

Which is more likely under 2s? Fenwick might be faster for n=200k? Let's estimate 14M Python while iterations. Each iteration: nxt=idx+bitmask; if nxt<=m and bit[nxt] < k: ...; bitmask >>=1. Branch. 14M maybe ~1s in PyPy, ~2s in CPython? 14M simple ops in CPython ~0.7s? Actually CPython 10M loop ~0.5s? It depends. 14M with list access maybe 1.5s. Heaps 1M heap ops each involving multiple Python loop iterations and function calls; maybe similar. Fenwick finds for even k always 2 finds. Could optimize even k to find adjacent order statistics? Maybe not.

Can we make Fenwick faster by using array module? list ints fine. Need coordinate mapping: for each num, index dict lookup. For slide, `old_idx = comp[nums[start]]` etc. Good.

Potential issue with floats in dict keys same as heap. okay. If NaN, coordinate compression weird (NaN != NaN, set multiple NaNs, dict multiple keys? Hash nan but equal? Dict with NaN? Python dict uses `is` or equality? NaN hashable, but dict lookup for same NaN object? Different NaNs with different hashes? Actually float('nan') hash is based on id? In Python, nan hash is same? Not rely). Not required.

Fenwick correctness with duplicates: counts. find kth returns smallest idx with prefix >= k. Values array 0-index. Good.

Could optimize median computation for even k: Instead of two independent finds, find k/2 then find next? Need find second order statistic can use find(k//2+1). Two finds. Could maybe find both in one traversal? Hard. Not needed.

Could optimize BIT find by precomputing `highest_power = 1 << (m.bit_length() - 1)`. Use local variables in loop for speed. Avoid nested function calls by inlining update and find? Could define functions; 400k update calls + 400k find calls maybe function call overhead. Could inline? Maybe define local functions with local bindings; function calls 800k, okay but maybe overhead. Could write nested functions and bind. Or implement loops inline inside slide? Code verbose. But to be safe performance, we can inline BIT operations in loop? Let's design optimized Fenwick.

Pseudo:
def sliding_median(nums,k):
 n=len(nums); validate; if k==1 return ...
 # coordinate compression
 vals = sorted(set(nums))
 m = len(vals)
 comp = {v:i+1 for i,v in enumerate(vals)}
 bit = [0]*(m+1)
 # init counts for first k
 for i in range(k):
   j = comp[nums[i]]
   while j <= m: bit[j]+=1; j += j & -j
 top = 1 << (m.bit_length()-1)
 res=[]; append=res.append
 if k&1:
   target = (k+1)//2
   for i in range(k-1,n):
     # find target
     idx=0; t=target; bit_mask=top
     while bit_mask:
       nxt=idx+bit_mask
       if nxt <= m and bit[nxt] < t:
         idx=nxt; t-=bit[nxt]
       bit_mask >>=1
     append(float(vals[idx])) # since idx is 0-based? find returns idx+1. If idx after loop is largest with prefix < target, answer 1-index idx+1, value vals[idx]. yes.
     if i+1==n: break
     # remove old
     j=comp[nums[i-k+1]]; delta=-1
     while j<=m: bit[j]+=delta; j += j & -j
     j=comp[nums[i+1]]; delta=1
     while j<=m: bit[j]+=delta; j += j & -j
 else:
   t1=k//2; t2=t1+1
   for i...:
     find t1 -> v1; find t2 -> v2; append((v1+v2)/2)
     update...
 return res

Note find returns `idx` such that value `vals[idx]` because idx is count of BIT indices < answer. Example answer 1: idx=0 vals[0]. Good.

Potential bug: After updates, total remains k. find assumes valid.

This code avoids heap and delayed dict. It requires coordinate compression of all nums. Sorting set of floats; if nums length 200k all unique, vals length 200k. `top = 1 << (m.bit_length() - 1)` highest power <= m. For m=0? n>=k>=1 so m>=1.

Performance: We do coordinate compression dict for each update and median? For updates two dict lookups per slide. Init k lookups. For median, values list access. No heap. Could be quite fast.

But need consider memory: `set(nums)` with 200k floats, sorted list, dict. okay ~tens MB. Fine.

Which solution is expected? Sliding median often solved with two heaps. Fenwick is also efficient but assumes all numbers known upfront (yes nums list). Coordinate compression O(n log n). Requirement efficient n=200k. Both. Fenwick may be more deterministic and no lazy deletion complexities. But code with inlined BIT may be longer but still okay. Need ensure no external libraries. Standard.

Potential issue: Fenwick find with float coordinates but values can be equal; dict mapping floats okay. Need handle `float('nan')`? sorted(set) may have NaNs; dict keys NaN maybe issue. Heap also fails. Ignore.

Could there be negative zero and zero coordinate distinct? Python set treats -0.0 == 0.0, dict same key. sorted order [0.0]. median okay.

Now, performance of `sorted(set(nums))` on floats. If duplicates many, m small, BIT loops log m smaller. Good.

Potential worst-case m=200k, even k=1000: per slide two finds ~36 iterations, two updates ~36 iterations, total 72 iterations? Wait update loop length not always log m exactly; average ~9? BIT update from random index visits ~log m/2? Actually number of iterations up to 18, average maybe 9. Find exactly bit_length loops =18. So total per slide ~2*18 + 2*9 =54 iterations. 200k*54=10.8M. Good. Heap maybe 1M heap ops * log with inner loops maybe 10M comparisons. Similar.

Fenwick loops in Python with local variables can be optimized. We can precompute `lowbit`? update uses `j += j & -j`. find uses `nxt = idx + step; if nxt <= m and bit[nxt] < t`. Could precompute powers? Use `while step:`.

Could reduce dict lookups by precomputing compressed indices for all nums: `idxs = [comp[x] for x in nums]`. Then slide uses `idxs[i]` no dict. This costs memory list of ints 200k (~1.6MB) and O(n) time, but saves 400k dict lookups. Good. For k==1 shortcut skip. For general, after comp, `a = [comp[x] for x in nums]`. Then init updates use a[i]. This also avoids float dict lookups in loop. Good.

Could even precompute `nums_float`? Already list. Use `a` for indices. Median values from `vals`. Good.

Could precompute BIT update path for each index? Not needed.

Could initialize BIT more efficiently: Instead of k updates, count frequencies in first k then build BIT O(m)? For k=1000, updates negligible. But we already precompute a. Use for i in range(k): update. okay.

Could for k==n shortcut using sorted already; coordinate compression sorting also. Our k==n shortcut maybe uses sorted(nums) and returns. Good.

Which algorithm to final? Need choose. The heap code is more conventional and no coordinate compression. But Fenwick may be easier to guarantee performance? Let's think of worst-case for Fenwick with even k: 2 finds per output (199k*2*18=7.2M) + updates 7.2M =14.4M. Python 14M while loops maybe around 1.2s on normal PC? If CPython 3.11, simple loop 10M ~0.4s? Actually let's recall: Python 3.11 can do ~50M simple ops/sec? No, CPython ~20-30M simple bytecode/sec. A while loop with list access and branch maybe ~5-10M/sec. 14M maybe 1.5-2.5s. Need well under 2. Heap may be faster due to heapq implemented in Python but fewer loops? heapq heappush/pop each does siftup/siftdown loops ~log, with function calls. Hard.

Could optimize Fenwick by using `array('i')`? list faster maybe. Use local variables `bit_local = bit`, `m_local = m`, `vals_local = vals`, `top_local = top`. In loop, assign. Use `for i in range(...)` local.

Can we reduce BIT loops for updates by using a Binary Indexed Tree with `for`? no.

Alternative: Use `sortedcontainers` not stdlib.

Alternative: Use two heaps but periodic rebuild to bound heap size and maybe fewer ops? Let's explore possible optimized heap with `heapdict`? no.

Could use `bisect.insort` with `array` and k=1000: each slide O(k) for insert/delete in list ~1000 shifts, 200M moves in C memmove? Actually `bisect.insort` on list of 1000 uses Python list insertion which memmoves pointers in C, 1000*200k=200M pointer moves ~1.6GB memory, maybe <2s? Deleting also memmove. But finding median O(1). Could be surprisingly fast? Let's evaluate: n=200k, k=1000. For each slide, remove old via `bisect_left` (C comparisons? bisect in Python loop log k ~10), delete from list (memmove ~500), insert new (bisect ~10, memmove ~500). Total memmove 1000 pointers*200k=200M pointers =1.6GB, C memmove maybe 0.1s? Actually memory bandwidth 10GB/s, 1.6GB ~0.16s. But list insertion/deletion overhead and bisect Python maybe. Could be under 2s and much simpler! But worst-case k=1000, n=200k => 200M operations in C, maybe okay. However list deletion/insertion O(k) with memmove of PyObject pointers, plus `del` decref? Deleting one element decrefs? It just moves pointers, no per-object Python overhead except refcounts? `list_remove`? `del list[idx]` shifts and decrefs moved? It should shift pointers and decref last? It doesn't decref each moved, just updates refs? It may not touch objects. Insertion increments refcount of new. It might be fast. But `bisect` uses Python-level binary search calling PyObject richcompare for floats in C? bisect module implemented in C? In CPython, `_bisect` C module. So bisect_left/insort_right are C loops, comparisons in C. Then list insertion/deletion memmove in C. This could be very fast for k=1000. But worst-case k=1000 exactly. Complexity O(n*k) but k moderate. For n=200k, 200M pointer moves; likely under 2s? Maybe. But hidden could k=100000? Requirement only n=200k k=1000, but function should be efficient for other k? It says Must be efficient: n=200_000 with k=1_000 must finish well under 2 seconds. Not necessarily O(n log k) but this O(n*k) with k=1000 might pass due to C memmove. But if k=100000, O(20B) impossible. They likely expect O(n log k). Better not use O(n*k).

Could use two `bisect` sorted list with `array`? same.

Another alternative: Maintain two sorted lists? no.

Fenwick is asymptotically O(n log n), safe.

Let's see if we can optimize Fenwick further using `bisect` on prefix sums? Not.

Could use bucket decomposition sqrt: coordinate compression + block counts for kth in O(sqrt m) ~450 per slide too slow.

Could use two heaps with coordinate compression? no.

Let's benchmark mentally heap vs Fenwick. Heapq operations are Python functions with loops but C-level list pop/append. Fenwick loops are pure Python. Heapq might be faster because sift loops are also Python but heapq functions are Python (not C) in Lib/heapq.py? In CPython, heapq has C accelerator `_heapq` for heappush/heappop? Yes heapq imports from _heapq (C) if available. heappush/heappop are C functions! That's important. They are implemented in C, loops in C, comparisons in C for floats. Very fast. So heap algorithm likely faster than pure Python BIT loops. Lazy deletion dict updates Python but few. Heap size O(n) but C loops. So heap is better. Use heap.

Need ensure heapq C accelerator available in standard Python. Yes `_heapq`. Good. So two heaps with lazy deletion should be well under 2s. Great.

Let's keep heap solution.

Could we improve heap to bound stale size? Not necessary. But heap C operations on large heap still log comparisons in C. Good.

Potential issue: Lazy deletion with `delayed` dict float keys; dict operations Python. Per slide: remove dict update, maybe prune checks. Fine.

Now, maybe use `set` for delayed? Duplicates need counts. dict.

Now, could we optimize for k==1 and k==2; yes. k==n sorted. Good.

Could also optimize k==3 direct to avoid heap for small k. But not necessary. Maybe hidden performance with k=1000. okay.

Let's consider if heap algorithm with nested functions and lazy deletion might fail due to `balance` while moving stale top after `remove` if top stale not pruned. We trust. But perhaps adding `prune_lower` and `prune_upper` before `heappop` in balance is cheap and prevents. Since heapq C, prune loops Python but usually immediate. In balance, while moves may not occur every operation. If we add prune at start of balance, two Python function calls per balance even when no move. Could be overhead. Instead, before heappop inside while, we can prune that heap:
while lower_size > upper_size + 1:
    prune_lower()
    moved = -heappop(lower)
    ...
while lower_size < upper_size:
    prune_upper()
    moved = heappop(upper)
    ...
This only prunes when moving. But if no move and top stale, median could be wrong. Top stale before median should not happen. For safety before median, we could call prune functions. But if we call before median only, and during balance move stale could corrupt. So prune before heappop. That ensures move valid. At median, call prune both. That's maybe balanced overhead: balance prunes only when moving (often one move per slide), median two prune checks. In all equal, moves two per slide, so four prune calls; okay. But explicit remove prune already. We can keep remove prune. Maybe not needed.

Let's decide final heap code robust but not too slow. I think standard explicit prune is okay. Add `prune_lower(); prune_upper()` before median? It adds two function calls per output (200k) ~400k calls. Acceptable. It ensures if top stale due to any oversight. But if top stale and we prune, sizes unchanged; however if pruning removes physical elements and lower_size/upper_size counts valid, could median still wrong if sizes indicate valid but heap empty? Not.

Maybe include before median:
prune_lower()
prune_upper()
Then append. After first median, we slide. This could handle any stale top. It also handles after remove balance if no move. Good. Overhead okay. Let's include? It may slow but robust. Need ensure if lower empty and upper nonempty (during slide? median only when window size k balanced, lower nonempty; but prune handles). If upper empty and k odd, prune_upper handles.

What about prune before median after `remove` and `add`? yes.

Could remove explicit prune in remove if we have median prune and balance start? But balance move may use stale. Keep remove prune.

Let's think if median prune could hide a size inconsistency but produce wrong median silently. Not concern.

Potential issue: `prune_lower` in median while lower_size counts valid, but if top stale and delayed count exists, prune pops. If delayed count belongs to upper but same value, could pop valid lower and leave upper_size too high? We discussed single dict okay. Median prune could consume markers in different heap than intended, but standard still okay. Could it worsen? If lower_size and upper_size mismatched due to equality, maybe not.

Now, maybe implement balance with while and after moving prune the source heap only. Already. If we also prune before median, enough.

Let's consider final code with k==2 shortcut. If k==2, output list comprehension. For n=200k, okay. If k==2 and values large, overflow. same.

Now, let's ensure type annotations don't require `from __future__` for `list[float]` in Python 3.9+; okay.

Now, maybe problem environment uses Python 3.11 but `list[float]` okay.

Now, final code only. Should we include comments? Could include concise comments. Not prohibited. Single code block.

Let's run through code for syntax with `nonlocal` in `add` and `remove`: lower_size and upper_size assigned in balance, add, remove. They are defined in outer function. Good.

One issue: In `remove`, we use `if num <= -lower[0]:` but if lower is empty? We argued no. But after median prune before slide? median prune might prune lower completely? For current window size k>=2, lower_size>=1, so prune should not remove all valid. But if delayed count misassigned, could. Not.

However, with k==2 shortcut, we avoid heap for k=2. For k>=3, lower_size>=2? For k=3 lower_size=2. So lower nonempty. Good.

If we include k==2 shortcut, heap only k>=3 (unless k==n maybe). lower_size at least2? For k=3, yes. For k even >=4, lower_size>=2. So remove lower[0] safe. For k=3, upper nonempty. Good. If we didn't shortcut k=2, lower_size=1 safe too. Shortcut not required.

Now, potential bug with k==n shortcut before heap: if k==n==2, returns mean. If k==n==3, returns median. Good. If k==n==1, k==1 shortcut. Good.

Now, let's think about sorted median for k==n and duplicates. good.

Could sorted shortcut for k==n be inconsistent with heap algorithm if there are NaNs? not.

Now, maybe hidden tests measure no use of `heapq` C? no.

Let's consider using `lower_size` and `upper_size` as valid counts, but after median prune, physical heap size changes. If we prune a top stale from lower, lower physical count decreases, delayed decreases, lower_size unchanged. Good. If later remove chooses side based on lower top valid. okay.

Now, possible bug: In `remove`, after marking delayed and decrementing size, if `num == -lower[0]` we prune lower. But if `lower_size` after decrement is 0 and lower heap contains multiple stale copies of num and delayed count 1, prune pops one, leaves stale copies. Then balance moves upper to lower. Now lower_size=1 but lower heap contains stale copies plus moved valid. lower top might be stale num if num > moved? Example lower stale large? Let's examine. lower is max heap. Suppose lower_size=1 valid num, stale copies of num deeper? If outgoing num top, prune pops one. If stale copies of same num remain and delayed count zero, they are now physically present but considered valid? Wait physical_count after prune: before remove P, D=1 (delayed outgoing? plus maybe previous?), size=1. After mark D=2? Let's create. lower_size=1, physical has one valid num and one stale num from previous? D=1. Remove outgoing num (valid top?) mark D=2, size=0. prune top num pops one, D=1. Physical now one num (could be valid or stale) but size=0, D=1. balance moves upper value v to lower: size=1, push physical P=2. Delayed D=1. lower top maybe max(num, v). If top is stale num? If num > v, top physical num but could be stale. Is that possible? We have D=1 for num, size=1 for lower. Physical two num/v. If num > v, top num. But delayed marker for num could correspond to the remaining num, meaning top is stale, while valid lower is v. `prune_lower` after moving in balance will be called (balance lower<upper moves upper to lower then prune_upper? Wait moving from upper to lower calls prune_upper, not prune_lower). In balance lower_size < upper_size: moved = heappop(upper); upper_size--; heappush(lower, -moved); lower_size++; prune_upper(). It does NOT prune lower after pushing into lower. Could lower top now be stale? This is important! In standard algorithm, after moving from upper to lower, should prune lower? Maybe yes if pushed value not top, stale lower top could become top? Let's analyze.

Scenario: lower_size=0, upper_size=1. balance moves upper top to lower. It pushes moved into lower. Before push, lower physical may contain stale elements. lower_size=0. After push, lower_size=1. The top of lower could be a stale element larger than moved. If so, lower top stale. Then median for odd window could be wrong. Does this scenario occur? lower_size=0 with lower heap containing stale elements? Can lower_size become 0 with stale elements not pruned? For k=3? lower_size before remove at least2. Remove one lower -> lower_size at least1. Balance moves only if lower_size < upper_size, so lower_size may become 0 only for k=2. But we shortcut k=2! For k>=3, can lower_size become 0? Current window size k>=3 balanced lower_size=ceil(k/2)>=2. Remove one lower -> >=1. So lower_size never 0 during balance? For k=3 lower_size=2 -> remove lower =>1, upper=1 no move; remove upper => lower=2 upper=0 -> balance lower>upper+1 moves lower to upper, not upper to lower. For moving upper to lower, lower_size < upper_size. This can happen after remove upper from even k? For k=4 lower=2 upper=2, remove upper -> lower=2 upper=1 no move; remove lower -> lower=1 upper=2, move upper to lower. lower_size=1, not 0. So for k>=3, lower_size before push in upper->lower is at least1. But it could have stale top larger than moved? lower_size>=1, top should be valid before push? But after remove, maybe lower top valid. Push moved <= current lower top? When moving upper min to lower, moved >= lower max (invariant), so moved is >= lower top. Thus pushed moved becomes top (or equal), valid. Stale lower top larger than moved would violate invariant if stale counted? Stale top larger than moved but lower_size>=1? If stale top larger than valid lower max, it would be top and should have been pruned. So no. Thus prune_lower after moving upper to lower maybe not needed, but after moving lower to upper, new lower top could be stale smaller, so prune_lower needed. Our balance only prunes source heap after pop. For lower->upper, prunes lower (source). For upper->lower, prunes upper (source). Does not prune lower destination. But destination top is pushed valid and is max, so safe. For lower->upper destination upper top? Push moved lower max <= upper min, so pushed may become upper min valid; destination upper top valid. Source lower new top may be stale, prune source. Good.

However, consider when upper->lower and lower_size=0 with stale top larger than moved, but for k>=3 not. For k=2 shortcut. Good. If we didn't shortcut k=2, could be issue? Let's examine k=2 lower_size can become0 with stale top? lower_size before remove=1. If lower physical had stale larger than valid? top stale impossible. If outgoing valid top pruned, lower heap may contain stale smaller? Stale smaller than moved? lower max stale smaller than moved? lower top after push moved valid larger. If stale equal/larger? stale larger impossible top. So safe. But okay.

What about after median prune before slide: lower_size>=1 top valid. Good.

Now, scenario where lower_size=1 with valid small and stale larger? Stale larger would be top, impossible. Good.

So balance source prune sufficient.

But in `remove`, if we mark delayed for a value in lower not top, and then balance lower_size < upper_size moves upper to lower. Destination lower top before push valid; moved >= lower top, so valid. Good.

Now, could source lower pop expose stale top, we prune lower. Good. Source upper pop expose stale top, prune upper. Good.

Now, if remove decrements lower_size but doesn't pop lower top; then balance moves upper to lower. Source upper top valid. Destination lower top valid. okay.

Thus algorithm sound.

Let's revisit k==2 shortcut; if we include, no k=2 heap. Good.

Now, maybe we can remove median prune to save overhead. Since invariant solid. But if we include, need ensure median prune before first median after init. Init add/balance no delayed. okay. If median prune pops stale, sizes unchanged. But if prune_lower pops stale top and lower_size>0, lower_size remains. If it pops all physical and lower_size>0, bug. Not.

Overhead of median prune: two function calls per output. Could be okay. But if we already have remove prune and balance source prune, maybe not. To maximize speed, skip median prune. But final code maybe tested for correctness only, speed enough. Could include k shortcuts. I'd skip median prune for speed, trusting standard.

But if standard implementation has a known edge where after moving upper to lower destination top stale? We argued no. Good.

Let's search memory: LeetCode 480 Python solution often has `rebalance` and `remove` with `prune` at end of rebalance after moving. Some prune both before/after. Standard.

Maybe we should implement `balance` as:
while lower_size > upper_size + 1:
    moved = -heappop(lower); lower_size -=1; heappush(upper,moved); upper_size +=1; prune_lower()
while lower_size < upper_size:
    moved = heappop(upper); upper_size -=1; heappush(lower,-moved); lower_size +=1; prune_upper()
This is what we have. Good.

Now, think about if `lower_size > upper_size + 1` and `lower` top stale. We call `heappop(lower)` directly. Could happen? We argued no. But what if lower top stale because after previous `remove` we didn't prune lower since outgoing != top, but then lower_size decreased causing lower top to become stale? Removing size doesn't change physical top. If top was valid, remains valid. If outgoing equals top, prune. If outgoing not top, top valid. Good. If previous balance moved lower top to upper and pruned lower, top valid. Add push valid may not become top if smaller; top valid. Good.

Now, `upper` top stale? Similar. Good.

Now, one more subtlety: `remove` side decision `if num <= -lower[0]` chooses lower if num equals lower max. Suppose lower_size=1, upper_size=2 (not balanced? but maybe after remove before balance total k-1, can be lower<upper). For current window before remove balanced. okay.

Now, if `num` is in lower but due to duplicates also in upper, and `num <= lower max` true. Decrement lower_size. But physical lower may not have enough occurrences to mark? It has at least one if lower valid count includes that value? If all occurrences of num in upper and lower has no num but lower max = num? If lower max = num, lower has at least one physical num (maybe stale). If lower_size>0 and top num, there is physical. Marking one okay. If lower top num but lower_size counts valid values not necessarily num? Could top valid num? yes. If top stale? no. So physical has num. Good.

Now, what if lower top num but lower_size=0? not before remove.

Now, consider values equal but lower_size side counts arbitrary. Invariant lower valid <= upper valid still holds with equality. okay.

Now, let's maybe write a small proof in comments? not needed.

Potential issue: Python's `heapq` with negative floats: `-lower[0]` each time. For speed, store maxheap top as `max_lower = -lower[0]` in remove/add? Could optimize. In add, we do `-lower[0]` once. In remove, twice (condition and prune check). Could store.

Modify remove:
max_lower = -lower[0]
if num <= max_lower: lower_size -=1 else upper_size -=1
if num == max_lower: prune_lower()
elif upper and num == upper[0]: prune_upper()
But after size decrement and maybe prune? `max_lower` still old top. If we need to prune if num equals top. Good. If lower top stale? no. Use this to avoid repeated indexing. Similarly add.

add:
if not lower or num <= -lower[0]: ...
Could store only if lower.

In median, store `lower_top = -lower[0]`, `upper_top = upper[0]`.

Let's optimize final code accordingly.

Code:
    def add(num: float) -> None:
        nonlocal lower_size, upper_size
        if not lower or num <= -lower[0]:
            heappush(lower, -num)
            lower_size += 1
        else:
            heappush(upper, num)
            upper_size += 1
        balance()

    def remove(num: float) -> None:
        nonlocal lower_size, upper_size
        delayed[num] = delayed.get(num, 0) + 1
        max_lower = -lower[0]
        if num <= max_lower:
            lower_size -= 1
        else:
            upper_size -= 1
        if num == max_lower:
            prune_lower()
        elif upper and num == upper[0]:
            prune_upper()
        balance()

Median:
if odd: append(float(-lower[0])) else: append((-lower[0] + upper[0]) * 0.5)
Could use `/ 2.0`. Multiplication by 0.5 maybe faster. Use `* 0.5`.

Potential overflow: same.

Now, if lower top changed after size decrement but before `num == max_lower`? No physical top not changed. If num==max_lower, prune. If num not equal, no prune. Good.

Now, if lower empty? remove not called. k shortcuts. Good.

Now, `balance` while loops: We call `prune_lower` after heappop lower. But if while condition true and lower top stale due to bug, heappop stale. Could add before heappop `prune_lower()` to be safe. Since while loops move only when imbalance, not too frequent. But imbalance occurs almost every slide? Add/remove may cause one move. Calling prune_lower before move (in addition to after) adds dict get. Could skip. But maybe if lower top stale due to destination lower after upper->lower? We argued no. Keep.

Now, possible issue with `upper and num == upper[0]` after `prune_lower`? If num == max_lower, we prune lower; if upper top also equal num and delayed marker consumed by lower, should we also prune upper? We use elif, so no. Standard uses elif because delayed marker count reduced; if marker count still >0 and upper top num, prune_upper might be needed? Let's examine. Suppose delayed[num] had count >1 (multiple stale num in lower and upper), remove num, decrement lower_size, delayed count++. If num == lower top, prune_lower loops while top delayed, consuming as many delayed markers as top stale. If delayed markers remain and upper top num, should prune upper too to maintain top valid? If upper top num and delayed count >0, upper top stale. Could this happen after prune_lower? Example delayed[num] count = 2 before remove. Both lower top num and upper top num. Remove num -> count=3. prune_lower pops lower top num, count=2. If lower top no longer num (next valid smaller), prune_lower stops with count=2. Upper top num still stale. But delayed markers count corresponds to stale copies somewhere. upper top stale, not pruned because elif. Then balance may move from upper? If upper_size? Could corrupt. Is this possible? Need analyze standard algorithm: It uses if num == lower_max: prune lower; elif num == upper_min: prune upper. If multiple delayed same value in both heaps, single dict and if/elif may leave top stale in upper. But if upper top num and delayed count >0, that means there is a stale num in upper at top. Why wasn't it pruned earlier? Could be from previous removals of num assigned upper or lower. Let's construct.

We need delayed count for num >0, upper top num valid? Delayed count doesn't specify heap. It could represent stale num in lower, not upper. But upper top num could be valid. If delayed count >0 after prune_lower, it could still correspond to stale num in lower deeper, not upper. Upper top valid. No issue. But if there is a stale num in upper, top stale. Could that exist while lower top also num and delayed count? Maybe.

Single delayed dict by value is known to work because delayed count is just value, not heap. Pruning one heap consumes marker; if another heap top same value and delayed count remains, it might need pruning but can be handled later when it becomes top or by balance? If upper top stale and delayed count remains, then upper top invalid. Could balance or median use it. But maybe invariant physical_count vs sizes ensures if upper top stale, delayed count for that value must be present; but if prune_lower consumed a marker that actually belonged to upper, then lower has a stale copy without marker? This is indistinguishable. The multiset of valid values remains correct if we treat any popped top with marker as removing one stale. If upper top stale remains, then valid upper_size may be too high? But total valid counts maybe okay. Let's search for known issues. LeetCode solutions with delayed dict use if/elif and work. They rely on `max_heap` and `min_heap` tops not delayed after `remove` and `balance`. The if/elif is standard. So no need.

But to be extra safe, we could after pruning lower, also prune upper if delayed.get(upper[0]) is not None. But that could pop upper top even if marker belongs to lower. As before indistinguishable but okay? It may reduce physical and delayed counts, sizes unchanged. Could be safe. But might over-prune valid top if marker for same value in lower. But values indistinguishable; as long as sizes consistent. It could help. Similarly if num == upper top, prune upper then maybe prune lower. We could simply call `prune_lower(); prune_upper()` after marking delayed, regardless of side. That would prune any top delayed. This is standard in some implementations (prune both in balance). It might consume markers in arbitrary heap but okay. Then no if/elif needed. This could add two prune calls per remove. Maybe okay. Let's consider correctness.

If after marking delayed, we prune both heaps, any top with a delayed marker is popped. This ensures tops valid. It may pop a top with marker that was conceptually for other heap, but values equal so okay? Need ensure sizes. Sizes decremented for side. Popping from a heap doesn't change sizes, only physical and delayed. If marker belonged to other heap, then the other heap still has an extra stale physical without marker, and this heap lost a valid physical, but values equal and sizes? Example remove num from lower, marker count 1. Upper top num with no conceptual marker, lower top stale deeper. Prune upper pops upper top, deletes marker. Now lower physical has stale num, delayed count 0, lower_size decremented. But lower physical has extra stale without marker; physical_count > size. Invariant broken for lower, but upper physical_count and delayed? Upper physical decreased and delayed decreased, invariant upper preserved. Lower has stale copy but delayed count zero; it may become top later and not be pruned, causing wrong. However since values equal, is it harmless? Suppose lower_size says one fewer num, but physical lower has an extra num (stale) with no marker. Later lower top num could be used as valid, median includes extra num. But total window multiset? The removed num was conceptually in lower; if we instead pruned upper copy, we removed an upper valid copy, leaving lower extra. Total valid counts: lower_size decreased, upper_size unchanged. If upper copy was valid and removed physically, upper_size should have decreased but didn't. So upper_size overcounts by 1, lower physical undercounts? Let's calculate. Before: lower physical includes num, upper physical includes num. Sizes correct. Remove lower num: lower_size--, delayed num. If prune upper pops upper num, delayed--. Sizes: lower_size-1, upper_size same. Physical: lower still has num (now should be stale? but no marker), upper lost num. Conceptual valid: lower one fewer num, upper same. But physical upper lacks num while upper_size counts same; if upper_size>0, it may be missing a value. However there is an extra physical num in lower not counted. Total physical valid (by sizes) lower_size+upper_size decreased by1. Physical total decreased by1. But distribution sizes mismatched: upper_size may expect a num that's gone, lower_size not expect the remaining num. Invariant lower<=upper values maybe broken if remaining lower num > upper? Values equal. For median sizes, if lower_size and upper_size still balanced, it may treat remaining lower num as valid and upper missing num. Since values equal, median same. If later num removed again, delayed counts? Could work. This is the value indistinguishability. Single dict by value works because only values matter, not heap membership, as long as size distribution arbitrary? But size distribution affects median half boundary. If we move a boundary value between heaps without changing sizes, boundary values equal, so okay. If stale marker misassigned across equal values, sizes distribution may not correspond to physical heaps but sizes only by value counts? Hmm.

Standard delayed dict doesn't track heap; if equal values, arbitrary. It should be okay.

But to avoid any doubt, standard if/elif maybe better.

Let's not alter.

Now, consider if `delayed` keys are floats and `cnt is None`. If `delayed` has key with count None? no.

Now, maybe we should use `try: cnt = delayed[x] except KeyError: break`? Faster? Maybe. `get` fine.

Potential micro-optimization: In prune, `if cnt is None` but if count 0 not. Good.

Now, final code with k shortcuts. Let's write final carefully.

One more thought: If k==n shortcut uses `sorted(nums)`, but if `nums` is not a list but iterable with len? Type list. okay.

Now, could there be a memory leak in delayed dict due to floats with count zero? We delete. In prune, after decrement if cnt==1 del. Good. In remove, no delete.

Now, if a value delayed count becomes zero and key deleted, but later `delayed.get(x)` returns None. Good.

Now, if `cnt` is not None but maybe 0 due to bug? If 0, `cnt == 1` false, sets to -1? But we never store 0. Good.

Now, check output type for k==n even: `(float(arr[mid - 1]) + float(arr[mid])) / 2.0`. If arr values huge, same. Could use `arr[mid - 1] + arr[mid]` if already float; but cast ensures float. Good.

k==2 shortcut: `[(float(nums[i]) + float(nums[i + 1])) / 2.0 for i in range(n - 1)]`. If `nums` contains int, okay. Could be memory for intermediate. fine.

Now, maybe if k==2 and nums values are `float('inf')` and `-inf`, mean nan. expected? maybe.

Now, let's think about if n=200k k=1000, heap code with nested functions uses `nums[i - k + 1]` indexing. Python negative index? i starts k-1=999, start=0. good. i+1 check before add. For i=n-1 break before accessing nums[n]. good.

Now, perhaps we can precompute `last = n - 1` and loop `for i in range(k - 1, n):` with if. Fine.

Could avoid `if i + 1 == n` inside loop by loop to n-1 and handle last separately? For speed:
for i in range(k - 1, n - 1):
    append(median)
    remove(nums[i-k+1]); add(nums[i+1])
append(median for last)
This avoids branch per iteration. Need handle n==k? But k==n shortcut returns earlier. For k<n, n-1 >= k. So:
for i in range(k - 1, n - 1):
    append median window ending i
    remove(nums[i - k + 1])
    add(nums[i + 1])
# append median for window ending n-1
...
This loops n-k times? For n=5,k=3: range(2,4): i=2,3 two iterations; then last i=4 one. Total 3 = n-k+1. Good. If k<n. Since k==n shortcut, okay. This avoids break branch. Good for speed. Let's implement.

If k==n shortcut not present? We have. If k<n. For k==n, shortcut. For k==1 shortcut. For k==2 shortcut. For k>=3 and k<n.

Median code duplicated for last. Could define helper? Or use small inner lambda? To avoid branch, duplicate. Fine.

Pseudo:
    result = []
    append = result.append
    odd = k & 1
    for i in range(k - 1, n - 1):
        if odd:
            append(float(-lower[0]))
        else:
            append((-lower[0] + upper[0]) * 0.5)
        remove(nums[i - k + 1])
        add(nums[i + 1])
    if odd:
        append(float(-lower[0]))
    else:
        append((-lower[0] + upper[0]) * 0.5)
    return result

Need ensure loop range not empty. If k<n, n-1 >= k? e.g., n=4,k=3: range(2,3) one iteration (window ending2), last ending3. good. If n=3,k=2 but k==2 shortcut. If n=4,k=3 okay. If n=3,k=3 shortcut.

Could also handle k==n without shortcut with range(k-1,n-1) empty and last append. But k==n shortcut for performance. If shortcut removed, works. Keep.

Now, initial build: `for i in range(k): add(nums[i])`. Could if k large and k<n. okay.

Now, let's test with n=4,k=3: init 0,1,2. loop i=2 to 2: append median [0:3], remove0 add3. last append median [1:4]. good.

Now, maybe if k==n shortcut not taken for n large but k==n? It is. If we later remove shortcut, loop range(k-1,n-1) empty, last append after init. works. Could remove k==n shortcut to simplify? But performance. Keep.

Now, if k==2 shortcut, no heap. If we want heap to handle k=2 and maybe no shortcut, range works. okay.

Now, think about if k==n and sorted shortcut uses O(n log n) C; but if k close to n not shortcut, heap init O(n log n) Python maybe maybe slower but acceptable. Could add if k > n//2? Maybe use sorting per window? no. Could use heap. okay.

Now, let's consider alternative for k large (e.g., n=200k,k=199999) our heap does init 199999 adds, then one slide remove/add, output 2 medians. Heap operations 200k log 100k C. Could be okay. Sorting full list for each window? no. Could use two heaps. fine.

Now, one potential bug with `balance` while loops and prune after moving: If `lower_size > upper_size + 1`, we heappop lower. But what if lower top is stale and we prune after popping? We would pop stale as moved, decrement lower_size (but size decremented again? Wait we decrement lower_size for moving a valid element. If top stale, lower_size count not include it, so decrementing lower_size incorrectly. This is why we should ensure top valid before heappop. We trust. But to be absolutely safe, we can call `prune_lower()` immediately before heappop in each while iteration. The overhead only when imbalance occurs. Imbalance occurs maybe every slide. One extra prune call per move. Could be okay. It prevents catastrophic corruption if top stale. Similarly `prune_upper()` before moving from upper. Let's include this for robustness. In balance:
while lower_size > upper_size + 1:
    prune_lower()
    moved = -heappop(lower)
    ...
    prune_lower()
while lower_size < upper_size:
    prune_upper()
    moved = heappop(upper)
    ...
    prune_upper()
This may call prune twice per move (before and after). Before ensures top valid; after cleans new top. Could combine: after prune before, if while condition still? sizes unchanged. Then pop. After pop prune. Good. If top stale and prune empties lower but lower_size still > upper+1? Invariant broken; would heappop error. Not.

In `remove`, explicit prune if outgoing top maybe makes before prune redundant. But okay.

Does pruning before moving from upper with upper_size maybe 0 but upper heap stale? If while lower_size < upper_size cannot have upper_size=0. If upper_size>0, top valid or prune. Good.

Performance: In typical slide, remove or add causes one imbalance move. balance called twice per slide (remove and add). If both cause move? For k even all equal: remove causes move, add causes move. Each move two prune calls. 400k moves *2 =800k prune calls, plus remove prune maybe. Function call overhead maybe okay. But could be slower. Could only prune before heappop if top maybe stale? Hard. We can trust invariant and not prune before. Let's not over-optimize for edge impossible. Standard solution doesn't prune before move. Keep simple.

Now, let's maybe add `prune_lower(); prune_upper()` before the first median? Not needed. Skip.

Now, final code should not include `typing` imports. Use built-in generics.

Potential issue: Some online judges use Python version where `list[float]` not supported? User says 3.11+. okay.

Now, let's think about if k is bool? bool is int subclass. k=True ->1, k==1 shortcut. okay.

Now, let's maybe consider using `__slots__` no.

Now, final answer code block. Need ensure no example usage. Good.

Double-check variable shadowing: `append = result.append`; inside if odd append. Good.

Now, let's run a mental full code for n=5,k=3 all increasing [1,2,3,4,5]:
validate, k not shortcuts. init add1: lower[ -1] size1 balance none. add2: not lower? lower top1, num2<=1 false push upper[2] size1 balance none? lower_size1 upper1. add3: num3<=1 false push upper [2,3] upper_size2 balance lower<upper: prune_upper none, moved=2 upper_size1 push lower -2 lower_size2 prune_upper (upper top3 not delayed). heaps lower [-2,-1], upper[3]. median append float(-lower[0])=2. remove nums[0]=1: delayed1, max_lower=2, num<=2 lower_size1. num==2? no. upper and num==3? no. balance lower1 upper1 none. add nums[3]=4: max_lower=2, num<=2 false push upper [3,4] upper_size2. balance lower<upper: prune_upper (top3 no delayed), moved3 upper_size1 push lower -3 lower_size2 prune_upper top4. lower heap [-3,-1,-2]? top -3 => max3, upper[4]. last median 3. good.

Stale1 remains. lower_size2, physical lower has valid3,2 and stale1. okay.

Now, slide next if n larger: remove2: delayed2, max_lower3, lower_size1. num==3? no. upper and num==4? no. balance lower1 upper1. add5 push upper upper_size2 balance move upper top4 to lower, lower_size2. lower physical top4, stale1,2, valid3,4. good.

Now, test decreasing [5,4,3,2,1] k=3:
init: add5 lower; add4 lower size2 balance move5 upper lower top4; add3 lower size2 upper1 top4 median4. remove5: delayed5, max_lower4, num<=4 false upper_size0. num==4? no. upper and num==5? upper top5 yes prune_upper pops5 deletes. balance lower2 upper0 -> while lower>upper+1: prune_lower (top4 no delayed), moved=-heappop(lower) = -(-4?) lower stores [-4,-3]? top -4, moved4. lower_size1 push upper4 upper_size1 prune_lower (top3). median next? loop i=2 (window [4,3,2] after add?) Wait n=5, loop i=2: after init median [5,4,3]=4. remove5 add2. add2: max_lower3, num<=3 push lower size2. lower_size2 upper1 median append3. good. Next remove4: delayed4, max_lower3, num<=3 false upper_size0. num==3? no. upper and num==4? upper top4 prune_upper pops. balance lower2 upper0 move lower top3 to upper prune_lower top2. last median2. good.

Now, duplicates all equal k=3 [1,1,1,1,1]: init after add1 lower; add1 lower size2 balance move top1 to upper lower top1; add1 <=lower top1 push lower size2 upper1 median1. loop i=2 append1. remove1: delayed1, max_lower1, lower_size1. num==max_lower -> prune_lower pops one 1 delayed0. balance lower1 upper1. add1 push lower size2; balance none? lower2 upper1 okay (lower>upper+1? 2>2 false). last median1. good.

Even all equal k=4 [1,1,1,1,1,1]: init sizes lower2 upper2. loop median (1+1)/2. remove1 lower_size1 delayed1 prune_lower pop1. balance lower1 upper2 -> prune_upper top1? delayed count0 (deleted), no prune; move upper top1 to lower lower_size2 upper1 prune_upper top1. add1 push lower size3; balance lower3 upper1 -> prune_lower top1, move lower top1 to upper lower_size2 upper2 prune_lower top1. median1. good. Notice delayed deleted before moving upper; upper top valid. okay.

Now, if prune_lower in remove pops top but delayed count zero, upper top may be same valid. okay.

Now, maybe if remove marks delayed and `num == max_lower`, prune_lower deletes marker, but `num` also equals upper top and upper top was stale from previous delayed marker? Delayed count zero now, so no marker. Could upper top stale remain. How could upper top stale if delayed count zero? Invariant would be broken. Standard okay.

Now, let's consider if we should use `float` conversion in median odd with `append(-lower[0])` if lower[0] already float. If input int, output int for odd if not float? Requirement return floats. Use float. Even with `*0.5` returns float. If odd `-lower[0]` could be int; `float()` safe. If `-lower[0]` is float inf, float returns inf. okay.

Now, final code with comments maybe:
```python
import heapq

def sliding_median(...):
    ...
```

Need no `main`.

Now, maybe we should include `# noqa`? no.

Let's think about if `k == n` shortcut and `nums` contains unhashable? floats hashable. okay.

Now, perhaps the problem expects `ValueError` if k < 1 or k > len(nums). If k not int and comparison okay but range error. Could add `if not isinstance(k, int): raise ValueError`? Might be unwanted. Type hint.

Now, let's consider if `len(nums)` is large and `k` negative, we raise before k== shortcuts. good.

Now, could sorted shortcut for k==n alter behavior for NaN compared to heap? Not tested.

Now, let's maybe choose Fenwick instead? Hmm. Heap with C accelerator likely fastest. Use heap.

Now, maybe some Python distributions don't have C accelerator for heapq? In standard CPython yes. In PyPy, heapq is Python? PyPy heapq may be RPython? Still okay. Requirement normal PC maybe CPython.

Now, could lazy deletion heaps with stale size O(n) cause C heap comparisons on floats still C but log. okay.

Now, let's consider memory of heaps O(n) plus delayed O(n). For n=200k okay. If n huge, maybe. okay.

Now, one more possible edge: `nums` may contain very many duplicates, delayed dict small. good.

Now, final answer. Need ensure no trailing spaces? fine.

Let's produce final code block.
