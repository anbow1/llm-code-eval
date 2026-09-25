We need answer with Python code block only. Need analyze problem thoroughly.

Need implement sliding_median(nums: list[float], k: int) -> list[float]. Efficient n=200k k=1000 well under 2s. Standard library only. Need median of each window length k, order. Need handle floats, duplicates. Need efficient.

Options:
1. SortedList custom with Fenwick/BIT coordinate compression. n=200k, k=1000. Coordinate compress all nums. Maintain counts BIT. For each slide, add new, remove old, find kth order statistics by BIT prefix. Complexity O(n log m), m unique <=200k. Need maybe fast enough. Python BIT loops ~ log 200k=18; two medians => ~7.2M operations plus updates ~7.2M = maybe okay <2 sec? Need optimize. Could use sorted list? Python no built-in SortedList. Could use bisect.insort on list of size 1000; n=200k; insertion/removal O(k)=1000 => 200M moves, maybe too slow. Need better.

2. Two heaps lazy deletion (max/min heaps) for sliding median. O(n log k) but removal lazy, heap size grows O(n) maybe okay? k=1000, n=200k => heap sizes up to 200k if lazy deletion accumulates? But can rebalance and prune; maybe okay but tricky with floats. Could maintain two heaps with lazy counts dict. Insert, delete delayed. Rebalance sizes with effective counts. Need median retrieval. Complexity log heap size but heap size can grow due to deletions; but total insert 200k, pop deleted maybe amortized. Should be fast in Python? Heaps with lazy dict may be okay. Need careful for k=1000. But median for even: max lower and min upper. Maintain lower max heap negative, upper min heap positive. lazy deletion dict. Sizes effective. Rebalance to lower size = upper size or lower = (k+1)//2? Standard: lower contains ceil(k/2), upper floor(k/2). Median: if k odd lower top; if even average lower top and upper top.

Potential issues duplicates, floats. Use values themselves keys in dict. Lazy delete when top stale. Need rebalance with effective sizes. Could be efficient.

But there is a subtle issue: if we push floats into heap, lazy deletion dictionary keyed by value; floats NaN? likely not. Values can be float. Duplicates okay count. For deletion: mark num to delete. Then rebalance. But stale elements might reside in top and need clean.

Pseudo:
import heapq
from collections import defaultdict

def sliding_median(nums,k):
 if k<1 or k>len(nums): raise ValueError
 lower=[]; upper=[]; delayed=defaultdict(int); lower_size=0; upper_size=0
 def add(num): lower_size++ push -num; rebalance
 def remove(num): delayed[num]+=1; if num <= -lower[0]? careful after top cleaned? if num <= -lower[0] then lower_size-- else upper_size--; rebalance
 def rebalance(): ensure lower_size == upper_size or lower_size == upper_size+1? For median k maybe fixed size: lower_size = (k+1)//2? Actually maintain invariant lower_size == upper_size or lower_size == upper_size+1. Since effective total k. target lower=(k+1)//2. Could rebalance to that? If k odd lower target = upper+1; if even equal. More general ensure lower_size >= upper_size and lower_size - upper_size <=1. But for median if lower smaller? Move.
   while lower_size > upper_size+1: move top lower to upper (pop stale, etc) lower_size--; upper_size++; if num is delayed? when moving top stale? Need pop stale top first.
   while upper_size > lower_size: move top upper to lower.
   Then clean top stale? Need before comparisons and medians.

Need careful when moving: to move top, first pop stale? We can pop while delayed. But if top has delayed, don't count it. Actually lower_size effective excludes delayed top? delayed marks items already removed logically. If top delayed, size includes not? In invariant lower_size effective counts non-delayed elements in heap? We adjust when remove marks delayed: we decrement lower_size if num <= current max lower after cleaning top? But if num not at top, logical count decrement still okay. But if top delayed, size counts? lower_size is intended count of non-delayed elements? If we decrement only when deletion is assigned to lower/upper based on top threshold, then size effective remains correct even if stale top remains. Yes remove num: delayed[num]+=1; lower_size--; if num <= -lower[0] (clean top maybe) else upper_size--. But if top is delayed, lower[0] stale; should clean before compare. remove top? We can call clean_lower/upper first.

Need rebalance moves actual non-delayed top. Need functions pop_heap_clean(heap, neg=False). For lower: while lower and lower[0] delayed? value=-lower[0]; if delayed[value]>0: delayed[value]-=1; heappop; (size already decremented by removal, no decrement) else break. For upper similarly.

Move lower to upper: clean_lower(); val=-heappop(lower); lower_size-=1; heapq.heappush(upper, val); upper_size+=1; But val could be delayed? clean ensured not. If val was delayed? clean popped stale. Good. Move upper to lower similarly.

Add: push; lower_size++? But maybe to keep balance. Standard: push to lower first; rebalance. But if value large maybe upper top smaller? We also need ensure max(lower) <= min(upper). Rebalance should move elements to maintain order. Standard two heaps algorithm: push new to lower, then rebalance sizes, then move tops if lower max > upper min. But with lazy deletion, top may stale; need clean before compare.

Algorithm add:
  heappush(lower, -num); lower_size +=1
  rebalance()
rebalance:
  # first enforce sizes
  while lower_size > upper_size + 1: move_lower_to_upper()
  while upper_size > lower_size: move_upper_to_lower()
  # enforce order: clean tops; while lower and upper and -lower[0] > upper[0]: swap? Standard move top lower to upper and top upper to lower? Need maintain sizes unchanged if swapping? Could do:
   clean_lower(); clean_upper(); if lower and upper and -lower[0] > upper[0]: val1=-heappop(lower); lower_size-=1; val2=heappop(upper); upper_size-=1; heappush(lower,-val2); lower_size+=1; heappush(upper,val1); upper_size+=1? Then repeat until order.
 But lazy deletion can affect sizes? Popping actual non-delayed tops, decrement/increment sizes. Swapping maintains total effective.

But standard: after size rebalance, if lower top > upper top, move lower top to upper then upper top to lower. Need clean both. Could loop while lower_size and upper_size and order violation: move_max_lower_to_upper(); move_min_upper_to_lower(). But moving one then the other preserves sizes. However if we just move lower max to upper, sizes become lower -1 upper +1 violating balance; then move upper min to lower. But the upper min might be the just moved value if it remains smallest? Then back? Let's examine standard approach: push to lower then rebalance size; if lower max > upper min: heappush(upper, -heappop(lower)); heappush(lower, -heappop(upper)); This swaps tops. Works because upper min might be new? Suppose lower top large > upper min small. Push lower large to upper. Then upper top small is original upper min (<= moved large? yes original upper min smaller, so top upper after push is original small unless moved value smaller than original? But moved value is larger than original upper min by violation, so top original small. Move original small to lower. Good. If lazy stale, clean tops.

Alternative maintain target lower_size = (k+1)//2 exactly by moving? Could be easier: total effective always k after initial. For each window: remove old, add new, rebalance to lower=(k+1)//2 and order. Use sizes.

Need efficient enough.

Potential issue with lazy dict keys floats: if num == -0? 0 okay. NaN? Median with NaN? Probably not. But floats can include inf; keys okay. If using <= comparison with inf okay. If NaNs: comparisons false; problematic. But likely no NaNs. Could treat NaNs? Not specified. Could avoid special? If list contains NaNs, heaps weird. Standard median of floats likely finite. We can ignore.

Performance of two heaps: For each slide, one remove and one add => heap operations O(log k) maybe heap sizes include delayed. Rebalance may clean many stale? Each stale popped at most once. Lazy deletion dict memory O(n). Should be okay. But heap sizes can grow if many delayed not at top. At most total inserted 200k + initial k => 200k; popping stale amortized. Dict operations. Might fit <2 sec? Possibly. But Python with defaultdict and heaps for 200k maybe okay ~1-2s? Need optimize.

Alternative Fenwick coordinate compression may be predictable O(n log m) with arrays, maybe faster? Let's compare.

Fenwick BIT: compress sorted unique nums. Need for each slide find lower median kth = (k+1)//2 and if even (k+2)//2? For k even lower index k/2, upper index k/2+1 (1-based). Need values from BIT kth. Updates: initial add first k. Then slide remove nums[i], add nums[i+k]. Need map value to index via dict. BIT find_kth using binary lifting. Complexity: initial k updates O(k log m); each slide 2 updates + (1 or 2) kth queries. n=200k,k=1000: ~200k*2*18=7.2M updates + find_kth 200k*2? For even 400k*18=7.2M? Actually each kth query loops 18, two => 7.2M. total ~14M simple array operations in Python. Could be faster than heaps? Probably 1-2s maybe. Coordinate compression sort 200k O(n log n). BIT kth binary lifting with fixed LOG = m.bit_length(). We need find_kth: idx=0; bitmask=highest power of two <=m; while bitmask: t=idx+bitmask; if t<=n and bit[t] < k: idx=t; k-=bit[t]; bitmask>>=1; return idx+1. Then value sorted_vals[idx-1]. This is efficient but function call overhead. Optimize inlined? Could use local variables. Memory: BIT list int length m+1; counts ints; dict mapping float to compressed index. Sorting floats okay. But duplicate values many. For even k, need two find_kth queries. Can optimize by finding first and next? BIT find two maybe same loop. Could find lower kth, then next = find_kth(kth+1) maybe independent. Could get lower rank index and upper rank index. Or find both? Could use order statistic via binary lifting. Need counts as int.

Need ensure updates for duplicates okay. Fenwick tree stores counts. Removal update -1. Need kth target: if k odd target=(k+1)//2. If even target1=k//2, target2=target1+1? median mean lower rank k/2 (1-based) and upper rank k/2+1. Example k=2 target1=1, target2=2. k=4 target1=2 target2=3. yes.

Potential optimization: If k==1: return nums (float?) Need list of float? nums may ints, return float. For k==1, sliding median each element. Return [float(x) for x in nums] maybe. But if already float? Return floats. For general medians floats. Need if even and values ints return float; if odd maybe value could be int? Problem says Return floats. Ensure output list of float. For k odd median value maybe int -> cast float.

Fenwick coordinate compression: mapping all unique values to index sorted. But if there are NaNs, sorting and dict key equality problematic (NaN != NaN? dict keys with same NaN? In Python dict can store multiple NaN keys? Actually float('nan') != float('nan'), but hash same; dict lookup with equal? NaN keys don't compare equal, so mapping duplicates fail). Ignore.

Need ValueError k<1 or k>n. If nums empty? k<1 triggers if k maybe? If len(nums)=0 and k=1 -> k > len raise. If k=0 and len 0? k<1 raise.

Need ensure len output n-k+1. For k==n, just median of all nums once. BIT works initial.

Need optimize BIT. Use list of int counts. Update while i<=m: tree[i]+=delta; i += i & -i. Need map values to index: val_to_idx = {v: i+1 for i,v in enumerate(vals)} after sorted_unique. But for floats, building dict. Could coordinate compression via sorted(set(nums)) but set of floats okay. But if many unique 200k, sorting okay. Need maybe handle duplicate int/float equal? fine.

Potential memory: vals list, mapping dict, tree, nums list. okay.

Need fastest implementation. Options:
- Use two heaps? Maybe code simpler but performance maybe okay. Need choose likely fastest robust.
- Fenwick might be very fast but must write kth queries efficiently.

Let's estimate Fenwick speed: n=200k, k=1000, unique maybe 200k. Build: sorted(set(nums)) 200k ~0.1s? dict ~0.05. Initial updates 1000*18 = 18k trivial. Slides: 199000 iterations. For even k: remove update 18 + add update 18 + two kth queries 2*18 = 72 operations loop per iteration ~14.3M. Each operation Python while with list access and arithmetic. Might be ~1.0-2.0 sec. Function calls overhead could be bigger. Need inline? Could implement update and kth as local functions but still call overhead 199k*4 = 800k function calls; okay but could optimize. For odd k: 199k*(36+18=54) ~10.7M.

Could optimize queries by using BIT kth with local tree and m. But need two queries. Could implement `find_kth` function local. Might be okay. Need maybe use `int.bit_length`? Precompute bitmask powers.

Can we do faster with two sorted halves? Since k=1000, could maintain two lists of size 500 using bisect and array? Insort into list size 500 O(500) per slide => 100M element shifts, maybe C-level list memmove? Python list insert/pop O(n) with memmove, maybe quite fast? For n=200k,k=1000 half size 500. Each slide two removes/two inserts? Could be maybe 200M pointers moved ~1.6GB memory movement, might be <2 sec? Let's analyze: Maintain lower and upper sorted lists (Python lists) of fixed half sizes. Remove/insert using bisect + list insert/pop. List insert shifts references. Total length ~1000. For each slide: remove old from lower/upper based on value <= lower[-1], insert into appropriate, rebalance by moving. That involves O(500) shifts, each shift C pointer copy. 200k* (some 1000 pointer ops) = 200M pointer ops ~1.6GB, perhaps <1s? But Python list insert in C fast. But need comparisons and bisect in Python O(log k) trivial. Could be surprisingly efficient and simpler. But worst-case many insertions at front, shifts. Memory movement 1.6GB maybe okay. However n=200k, k=1000, list size 500. Need initial build sorted slices. Slide algorithm maintain two sorted halves with target sizes lower = (k+1)//2, upper = k//2. For each step: remove outgoing x, insert incoming y. Could remove by binary search in appropriate list? Since halves maintain all lower <= upper. We can determine outgoing list: if lower and x <= lower[-1], remove from lower; else remove from upper. But duplicates equal boundary: if x <= lower[-1] choose lower. Need find index via bisect_left; remove that x. Insert incoming: if lower and y <= lower[-1] insert lower else upper. Then rebalance to sizes target by moving top max lower to upper or min upper to lower. Maintains sorted. Complexity O(k) due to list operations but in C.

Will it pass 2 sec? Let's approximate. Python list.insert/pop: for list length 500, memmove 500*8=4KB. 4 operations per slide maybe 16KB*200k=3.2GB memmove. Could be maybe 0.5-1s? But Python call overhead for bisect, list operations 4 per slide ~800k. Maybe okay. Need careful with initial k=1000. This could be simpler than BIT and likely fast for k=1000. But worst-case? Python list operations are C-optimized; 200k * shifting ~500-1000 elements. 100M-200M references. CPython can do ~100M/s? Maybe. But list.insert/pop may allocate? It uses memmove. Should be okay. But if k larger? Spec n=200k,k=1000; not arbitrary k up to n? They say len nums - k +1, efficient n=200k k=1000. Could k maybe close to n? If k=200000, list algorithm O(n*k) impossible. Need algorithm efficient for all k? It says must be efficient n=200k k=1000. Could hidden tests maybe k large? Need design robust for any k? Fenwick O(n log n) independent of k (except queries) and handles k=n. Better. But if k very large, Fenwick still O(n log n), good. So Fenwick safer.

Need maybe consider use of `bisect` sorted list but no O(log n) removal? Fenwick robust.

Let's design optimized Fenwick.

Pseudo:
def sliding_median(nums: list[float], k: int) -> list[float]:
    n=len(nums)
    if k<1 or k> n: raise ValueError("k out of range")
    if k==1:
       return [float(x) for x in nums]
    vals = sorted(set(nums))
    m=len(vals)
    comp = {v: i+1 for i,v in enumerate(vals)}
    tree = [0]*(m+1)
    # local variables for speed
    # initial update for first k
    for i in range(k):
       idx = comp[nums[i]]
       while idx <= m: tree[idx]+=1; idx += idx & -idx
    # find kth inline function
    # compute bitmask highest power <=m
    bit = 1 << (m.bit_length() - 1)
    # define find(kth)
    def find(kth):
        idx=0
        b=bit
        tree_local=tree? closure lookup maybe okay; assign local variables outside? In function, tree free var slower? Could inline loops in main for initial query and each slide.
But repeated function calls overhead. Could write nested function with default args `def kth(kth, tree=tree, m=m, bit=bit):` local defaults faster. Return vals[ idx ]? Since idx after loop is largest prefix < kth; 1-based result idx+1; zero-based idx. Actually if idx is 0-based index in compressed? Let's test: tree indices 1..m. Binary lifting: idx=0; step=bit; if idx+step <=m and tree[idx+step] < kth: idx += step; kth -= tree[idx]. At end, position = idx+1 (1-based). Zero-based in vals: idx. because vals[0] corresponds index1. If result index = idx+1 => zero=idx. So return vals[idx]. Need ensure idx+1 <= m. If kth valid. Example m=5 tree counts. If result index 1, idx=0 return vals[0]. Good.

Function:
    def find_kth(kth, tree=tree, m=m, bit=bit):
        idx=0
        step=bit
        while step:
            nxt = idx + step
            if nxt <= m and tree[nxt] < kth:
                idx = nxt
                kth -= tree[nxt]
            step >>= 1
        return vals[idx]  # vals local? closure maybe; default vals=vals.

But each call accesses vals. Default okay.

Update function:
    def add(idx, delta):
       while idx <= m:
          tree[idx] += delta
          idx += idx & -idx
But for speed maybe inline updates in loop. Could use function with default tree/m. 400k update calls; okay but maybe overhead. Could inline two updates in slide loop? We'll need code readability. Since requested only code no tests, okay.

Optimization: Precompute compressed indices for all nums: `idxs = [comp[x] for x in nums]` to avoid dict lookup in slide loop. Memory 200k ints okay. Then initial updates use idxs. This saves dict lookups 400k. Good.

Can also store nums as float? output median floats from vals (already floats/ints). For even average: (v1 + v2) / 2.0. If ints, returns float. If large ints maybe overflow? In Python arbitrary. If inf, inf+? fine. For NaN, no.

Fenwick counts are int counts; if many duplicates tree counts. For kth queries, target 1..k. Need after update total counts always k. For initial, find target.

For k even: target1 = k//2; target2 = target1 + 1. For odd target = (k+1)//2. Could branch outside loop to avoid checking parity each iteration.

Implementation structure:
```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n: raise ValueError(...)
    if k == 1: return [float(x) for x in nums]
    vals = sorted(set(nums))
    m = len(vals)
    comp = {v: i+1 for i,v in enumerate(vals)}
    idxs = [comp[x] for x in nums]
    tree = [0]*(m+1)
    bit = 1 << (m.bit_length() - 1)
    # define update local using idxs
    tree_local = tree
    m_local = m
    # initial updates maybe for idx in idxs[:k]
    for idx0 in range(k):
        idx = idxs[idx0]
        while idx <= m_local:
            tree_local[idx] += 1
            idx += idx & -idx
    res = [0.0] * (n - k + 1)
    bit_local = bit; vals_local=vals
    def kth(target): ...
    if k & 1:
       target=(k+1)//2
       for out_pos in range(n - k + 1):
          # output current
          # find kth
          ... maybe function call
          res[out_pos]=float(kth(target))
          if out_pos + k < n:
             remove idxs[out_pos], add idxs[out_pos+k]
    else: ...
```
Need order: output every window before sliding. Could output initial then loop slide and output. Simpler:
```
out=0
while True:
   query output
   if out + k >= n: break
   remove idxs[out]; add idxs[out+k]; out +=1
```
But function calls.

Maybe combine query code inline using helper to avoid function call overhead? Let's design efficient but maintainable.

Could define `find_kth` nested with default args, call each target. 200k or 400k calls. Function call overhead maybe okay but to optimize can write two specialized loops? Hmm.

Alternative implement `find_kth` using while step: step=bit; idx=0; tree=tree_local; while step: ... This per call 18 iterations. Function call overhead 400k maybe negligible ~0.04s? Actually Python function call ~0.1 micro? Maybe 0.1-0.2 sec. Fine.

Potential issue with `set(nums)` on list of floats may fail for unhashable? floats hashable. But if nums contain bool? okay.

Need maybe if `nums` is not list? type hint but okay.

Potential edge cases:
- k = n. Output length 1. initial tree then query no slides. Good.
- all duplicates: m=1. bit=1 << (1.bit_length()-1) = 1. find_kth: idx=0 step=1 nxt=1 tree[1]=k >= target, not move, step=0 return vals[0]. Good.
- k odd/even median average: If k even and target1+1 target2; find lower and upper. Need if target1==target2? no. For k=2, target1=1, target2=2. Good.
- Values huge: float(x) maybe overflow? int conversion to float may overflow to inf? Problem likely floats. For median average of ints >1e308 maybe inf? Could return inf. But `float` return required. If values are Decimal? no.
- Need return list[float], output list maybe values from vals if vals int? Need ensure each median float. For odd k, `res[i] = float(v)`. For even, `(a + b) / 2.0` returns float (if a,b ints). If a,b float. If a,b Decimal no. Good. If a,b ints and sum huge, / returns float maybe OverflowError? In Python, int / int returns float and if too large raises OverflowError? Let's recall: huge int / 2.0 -> OverflowError? Actually converting huge int to float for division can overflow to inf? Test mentally: 10**400 / 2.0 => OverflowError? I think Python float division for huge int: `float(10**400)` raises OverflowError, but `/` may also? Need not worry. Could implement `v = vals[idx]`, for odd `float(v)`. For even if huge int might overflow. But problem says list[float], so inputs floats, not huge ints. If ints as floats okay.

Potential speed: `idxs = [comp[x] for x in nums]` uses dict lookup with floats. Fine. `vals = sorted(set(nums))`: if nums includes int and float equal, e.g., 1 and 1.0, set treats equal? 1 == 1.0 True, same hash? Python hash(1)==hash(1.0), so one value. But output median type? If input ints and floats? sorted returns maybe int 1. Need float output. okay.

Could optimize Fenwick query for two targets: Need median lower and upper. For k even, maybe we can find both in one function using BIT order statistics? Could find idx for target, then find idx of next rank. Could potentially find next value without full kth if duplicate? Maybe unnecessary. But perhaps optimize: implement `kth2`? Not needed.

But Fenwick updates and kth using Python lists can be optimized further:
- Use local variables `tree = tree` inside loops.
- Inline initial updates.
- Define functions outside main? Could avoid nested closure overhead? But no imports? We can just define helper inside.

Need only code block. Let's maybe implement robust, efficient Fenwick.

Detailed optimized code:
```
from typing import List # no needed? maybe no import? We can avoid imports except maybe not.
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    if k == 1:
        return [float(x) for x in nums]

    unique = sorted(set(nums))
    m = len(unique)
    comp = {v: i + 1 for i, v in enumerate(unique)}
    idxs = [comp[x] for x in nums]

    bit = [0] * (m + 1)

    # Build initial window
    for pos in range(k):
        i = idxs[pos]
        while i <= m:
            bit[i] += 1
            i += i & -i

    # highest power of two <= m
    step_init = 1 << (m.bit_length() - 1)

    def find(target, bit=bit, m=m, unique=unique, step_init=step_init):
        idx = 0
        step = step_init
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < target:
                idx = nxt
                target -= bit[nxt]
            step >>= 1
        return unique[idx]

    res = []
    append = res.append
    if k & 1:
        target = (k + 1) // 2
        # initial window output
        append(float(find(target)))
        last_start = n - k
        for start in range(1, last_start + 1):
            # remove idxs[start - 1]
            i = idxs[start - 1]
            while i <= m:
                bit[i] -= 1
                i += i & -i
            # add idxs[start + k - 1]
            i = idxs[start + k - 1]
            while i <= m:
                bit[i] += 1
                i += i & -i
            append(float(find(target)))
    else:
        target_low = k // 2
        target_high = target_low + 1
        append(float((find(target_low) + find(target_high)) * 0.5))
        last_start = n - k
        for start in range(1, last_start + 1):
            i = idxs[start - 1]
            while i <= m:
                bit[i] -= 1
                i += i & -i
            i = idxs[start + k - 1]
            while i <= m:
                bit[i] += 1
                i += i & -i
            append(float((find(target_low) + find(target_high)) * 0.5))
    return res
```

Need `float` around median maybe unnecessary but okay. For even, if both int, `(a + b)*0.5` returns float. If both float maybe. If huge inf? okay. For odd `float(find(target))`. If input is `Fraction`? not list[float]. okay.

Potential performance concern: `res = []` append; for n=200k okay. Could preallocate res and assign to avoid append overhead. Append fine. But prealloc and assign may be faster? Maybe not needed. Could use list comprehension? We have loop. Prealloc might allow `res[pos]=...`. Append method local faster.

Potential performance concern: `find` function called 400k. Closure default unique; okay. But inside `find`, `bit` list, `m`, `unique`, `step_init`. For speed maybe use `while step > 0`. okay.

Potential correctness with BIT find target after updates: tree contains counts total k. The BIT find relies `bit` tree where each node prefix sum for range. Binary lifting with `bit[nxt] < target` standard works. Need bit initial tree built by point updates. Yes.

Potential bug in BIT `find`: If `nxt > m` skip. If `bit[nxt] < target`, then move. At end idx is largest index with prefix sum < original target. Return unique[idx]. Let's test simple: values indices 1,2,3 each count1. tree: index1 count1; index2 count2? Fenwick tree after updates: tree[1]=1, tree[2]=2, tree[3]=1. step=2. target=2. idx=0 step2 nxt2 bit[2]=2 <2 false. step1 nxt1 bit[1]=1<2 true idx1 target1. end return unique[1] index 2. Correct. target=1: step2 bit2=2<1 false; step1 bit1=1<1 false; return unique[0]. Correct. target=3: step2 bit2=2<3 true idx2 target1; step1 nxt3 bit3=1<1 false return unique[2] index3. Good.

Need maybe handle m=0? k>0 implies len>=k so len>0, unique nonempty. If nums empty k<1? if k=0 and len0 raise. Good.

Could `m.bit_length() - 1` when m=0? no.

Now, is Fenwick with coordinate compression of all nums correct for sliding median? yes values fixed.

Can we optimize queries for k even: calling find twice; could find lower then high. But find high traverses again. Could implement `find_index` returns unique index, and then find next? Could maybe get median by target and target+1 using `find` with target; then find with target+1. okay.

But hidden performance: n=200k,k=1000 => 199001 windows. 400k find calls. Each 18 loops. ~7.2M loops. Updates 398k*18=7.16M loops. total 14M. Python 14M while loops with list indexing maybe ~0.8-1.2s. Function overhead maybe okay. Set/dict/sort maybe ~0.2. Good.

But `float(find(...))` for even: `float` of average already float; no issue. If `unique` contains `int`, `(find+find)*0.5` float; `float` redundant but okay.

Could use `median = find(target)` then append(median if isinstance? Need list[float]. If input floats, median is float. If input ints, median is int. To be safe `float(median)`. For even, `float((low + high) * 0.5)`. If low/high are float nan? float okay.

Potential issue with `unique = sorted(set(nums))` if nums is list of `float('nan')`: set may have multiple NaN? Actually set equality and hash for NaN? Python: `float('nan') == float('nan')` is False, but in set, `nan` can be present multiple? I believe yes: `len({float('nan'), float('nan')}) == 2`? Due to identity? In CPython set uses equality, so NaN distinct unless same object? But if list contains same NaN object maybe one? Hash same. But dict mapping: `comp = {v:i+1 for ...}` will have separate keys for different NaNs; but lookup `comp[x]` for x=NaN if it's not same object? It might fail due to non-equality. So NaN unsupported. Problem likely assumes finite floats. If want robust to NaN, coordinate compression could sort but NaN comparisons? sorted with NaNs weird (NaN < NaN false). Could handle NaNs separately but overkill. Standard median with NaN not meaningful. We can ignore or document? No comments maybe. But code should not crash if NaN? It could KeyError for dict if duplicate NaNs not same object. Since list[float] may include nan. To be robust, maybe avoid coordinate compression dict with NaN by mapping via list? Hmm. Need think: hidden tests likely not include NaN. But if they do, any median including NaN? Python min max maybe return? Could produce weird. We could support NaNs? Need consider.

If need support NaNs, sorting floats with NaNs: Python sort doesn't guarantee total order for NaNs but will place them? Comparisons false, sort may leave relative? It works but not sorted. Fenwick median with NaN not meaningful. Probably not required.

Alternative heap algorithm handles NaNs? Comparisons with NaN false may break invariant. Not robust either.

Could use `math.isnan` special? Not needed.

Could avoid `set(nums)` if unhashable? no.

Need maybe handle `k` large and unique small. If all values equal, m=1, find quick. Good.

Potential issue: If `nums` is tuple or other iterable, type hint list; len works, `nums[pos]` works. But set(nums) okay. If generator? no len; but hint list. Could convert `nums = list(nums)`? Not necessary. Could be memory.

Could maybe use `bisect` to remove from sorted unique? No.

Let's test mentally on example:
nums=[1,2,3,4], k=2. unique [1,2,3,4] idx [1,2,3,4]. init tree counts [1,2] => total2. target low1 high2. find1=1, find2=2 ->1.5. slide start=1 remove idx1 add idx3 => counts values2,3 => median2.5. start=2 remove2 add4 => counts3,4 => 3.5. result [1.5,2.5,3.5]. Good.

k=3 nums [1,3,2,10,0]. unique [0,1,2,3,10], idx [2,4,1,5,1]
init 1,3,2 => sorted 1,2,3 median2. target2. find target2 =2. slide remove1 add10 => 2,3,10 median3. good.

Coordinate compression with duplicates: nums [1,1,2,2] k=3 unique [1,2], idx [1,1,2,2], counts init 1:2,2:1. target2 => find? tree m=2 step2; bit[2]=3? Actually tree: idx1 add twice -> tree[1]=2; tree[2]=2. add idx2 -> tree[2]=3. target2: step2 nxt2 bit[2]=3 <2 false; step1 nxt1 bit[1]=2 <2 false -> unique[0]=1. sorted [1,1,2] median1. good. slide remove1 add2 counts 1:1,2:2 median2. find target2: tree after update? bit[1]=1, bit[2]=3? Wait total3. bit[2]=3. step2 bit2=3<2 false; step1 bit1=1<2 true idx1 target1; return unique[1]=2. good.

Need ensure Fenwick tree after update subtract works if count becomes zero? Yes counts non-negative. If removal idx maybe not present? Sliding window remove old; count positive. Good.

Could precompute `last_start = n - k` inclusive, start range(1, last_start+1). If n=k: last_start=0, initial append, range(1,1) empty. result length 1. good.

Potential bug with output append initial and then each slide. For odd: append initial. For start in 1..n-k: after update append. Total 1 + (n-k) = n-k+1. Good.

Now consider speed of function `find` default `unique=unique`. Returning unique[idx] may be int; append float. For even: `find(target_low) + find(target_high)`, if low and high are large floats, okay.

Could improve by caching median if target same and tree unchanged? No.

Could optimize `find` for target_low and high in same call? Maybe implement function returning pair? Not necessary.

Could reduce float conversion overhead by if all unique are float? Can't know. Could if `all(isinstance(v,float)...)`? overhead. We'll convert.

Potential hidden tests expect exact list length and floats. For odd input floats output floats. For even input ints output floats. Good.

Could there be requirement to return `list[float]` not tuple. okay.

Could we import `from typing`? Standard library, but type hint `list[float]` works 3.9+. We may not need imports. If need `list` generic okay.

Could we use `collections.defaultdict`? no.

Could we implement BIT with array module? Not needed.

Alternative: use sortedcontainers not allowed.

Let's maybe think if Fenwick coordinate compression using `sorted(set(nums))` loses duplicates order? Median values only depend on values. good.

Potential issue: If `nums` values are `-0.0` and `0.0`: `set` treats equal? -0.0 == 0.0 True, hash same? Python hash(-0.0) == hash(0.0). unique [0.0] maybe. Median -0.0 vs 0.0? Mean of -0.0 and 0.0 = 0.0 maybe sign? Not critical.

Need maybe raise ValueError message. okay.

Let's consider if k is not int? Type hint int; if bool k True => k=1? bool is int subclass; okay. If k float? k<1 works but k> len works; then range(k) fails TypeError. Could cast? Not required. But could if `not isinstance(k,int)`? no. Maybe hidden tests call k=2.0? Type hint int, no.

Potential issue with negative numbers and `<=` no issue.

Now, we need output only code block. Need final with code. Ensure no extra text.

Before final, maybe further optimize code for speed: Use local variables in loops; maybe not too much. Let's design final code carefully.

Potential code:
```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    if k == 1:
        return [float(x) for x in nums]

    vals = sorted(set(nums))
    m = len(vals)
    comp = {v: i + 1 for i, v in enumerate(vals)}
    idxs = [comp[x] for x in nums]

    tree = [0] * (m + 1)
    tree_list = tree
    m_val = m

    for pos in range(k):
        i = idxs[pos]
        while i <= m_val:
            tree_list[i] += 1
            i += i & -i

    high_bit = 1 << (m_val.bit_length() - 1)
    vals_list = vals

    def kth(target: int, tree: list[int] = tree_list, m: int = m_val, vals: list = vals_list, high_bit: int = high_bit) -> float:
        idx = 0
        step = high_bit
        while step:
            nxt = idx + step
            if nxt <= m and tree[nxt] < target:
                idx = nxt
                target -= tree[nxt]
            step >>= 1
        return vals[idx]

    out = []
    append = out.append

    if k & 1:
        target = (k + 1) >> 1
        append(float(kth(target)))
        end = n - k
        for start in range(1, end + 1):
            i = idxs[start - 1]
            while i <= m_val:
                tree_list[i] -= 1
                i += i & -i
            i = idxs[start + k - 1]
            while i <= m_val:
                tree_list[i] += 1
                i += i & -i
            append(float(kth(target)))
    else:
        target = k >> 1
        target2 = target + 1
        append(float((kth(target) + kth(target2)) * 0.5))
        end = n - k
        for start in range(1, end + 1):
            i = idxs[start - 1]
            while i <= m_val:
                tree_list[i] -= 1
                i += i & -i
            i = idxs[start + k - 1]
            while i <= m_val:
                tree_list[i] += 1
                i += i & -i
            append(float((kth(target) + kth(target2)) * 0.5))
    return out
```

Need type annotation inside kth `list[int]` requires Python 3.9? Standard okay. But no need; might be okay. To avoid extra typing issues, omit annotation: `def kth(target, tree=tree_list, m=m_val, vals=vals_list, high_bit=high_bit):`. Good.

Potential bug in `kth` if `idx` equals `m`? Could return vals[m]? But target <= total counts <= k. In binary lifting, idx can become m? If target > total? not. If idx=m, then vals[idx] out of range. Could idx become m? If all prefix sums < target impossible because total at m >= target. But if due to bug tree total? no. For safety maybe return vals[idx] with idx < m. Good.

Could avoid `float` if median already float? If `vals` are floats and k odd, `float(kth)` returns same float object? It calls float constructor, overhead maybe. But if inputs floats, `float(v)` for float returns v itself? It may return same? In CPython, `float(f)` returns same object? Maybe returns same if already float? `float(1.5) is 1.5` maybe yes? Not guaranteed? It may return same for float subclass? Not too overhead. Could instead append `kth(target)` if not int. But for int, need float. Could define helper `to_float`? Not.

Could preconvert `vals = [float(v) for v in unique]`? That ensures all vals floats. But if values are ints huge, converting may overflow? Probably okay. But converting each unique to float may cost but small. If values are already floats, no effect. Then kth returns floats. Then no need float conversion except average. But if values huge ints? Could overflow. Better not convert unique? If we don't convert, median of ints returns int for odd; but we convert at append. If we convert `vals = [float(v) for v in unique]`, mapping uses float values; if int/float equal okay. Then output odd float without additional float conversion; maybe faster? But extra conversion cost. However output must be float; if unique ints and n=200k, conversion 200k maybe okay. But could raise OverflowError for huge ints. Not needed. But if list contains int and huge? Problem says list[float], so all floats; could assume no conversion needed for odd. But to satisfy if list has ints hidden? Use float conversion.

Maybe do `vals = sorted(set(float(x) for x in nums))`? Then input floats anyway. But if x is int huge, float conversion. Could avoid.

Alternative if all inputs are floats by signature, kth returns float, odd append(kth(target)) no conversion. But if hidden tests include ints, might fail type? They likely check equality not type? Could be strict? `list[float]` maybe they expect floats; Python doesn't enforce. But if odd int median 1 vs 1.0 equal. Might pass. But safer convert. Overhead 200k float calls not huge.

Could speed by if `vals` elements are floats then no conversion: we can determine `vals_are_floats = all(isinstance(v, float) for v in vals)` maybe overhead. Or simply for even returns float due 0.5. For odd, if kth target returns int only if unique contains int; if input list[float], no int. But type hints not enforced. We can keep `float` for safety.

Potential memory of idxs: if `nums` list is big, okay. Could not use idxs to save memory but slower. Good.

Could optimize updates by precomputing lowbit? `i += i & -i` each time. okay. Could precompute update paths for each idx? Since m<=200k, for each unique value maybe list of tree indices to update. For n=200k, update 400k times; precomputing paths may speed: paths = [[] for idx in range(m+1)]? Memory large but maybe okay. Then for each idx iterate path: for j in path[idx]: tree[j]+=delta. Number of steps log m. List iteration overhead maybe more than while with lowbit? while arithmetic maybe okay. Precompute `parent`? Not necessary.

Could optimize `find` by using precomputed powers list and unroll? Maybe not.

Let's consider if BIT find can be optimized using `idx.bit_length`? No.

Could use `sortedcontainers` no.

Now, maybe there is even faster approach using two heaps; but Fenwick robust. Need ensure no imports. Could use `bisect` no.

Let's evaluate two heaps possibility with lazy deletion may be O(n log k) with heaps but heap sizes maybe large. Could be slower. Fenwick good.

Now consider hidden tests with k=100000, n=200000. Fenwick still O(n log n). Good.

Could there be negative k? raise.

Now, think about exact median for even k: For sorted window values `w[0..k-1]`, if k even: (w[k/2 -1] + w[k/2]) / 2 in 0-based. Our 1-based ranks target_low=k//2 (e.g., k=4 target=2 -> rank2), target_high=3 -> rank3. Correct. k=2 target=1 rank1, target2=2. Good.

Now, let's verify `find(target)` for target=0? never; k even target k//2 >=1 since k>=2. odd target>=1.

Could if `k==0` raise before k==1.

Potential code comments? Not necessary but okay. Need output single code block. No tests/usage/print.

Let's consider if `nums` includes `Decimal` and set sorting okay? Decimal comparable, hashable. But output float conversion okay. Not list[float]. Fine.

Potential bug: `comp = {v: i+1 for i,v in enumerate(vals)}` when `v` is `-0.0` and `0.0`: set may choose one? Dict keys equal, so one mapping; both lookups okay. Good.

Potential bug: `sorted(set(nums))` if nums includes both int and float equal; set uses equality, but which object remains? It keeps first inserted? If first int 1 then unique contains int 1; mapping for 1.0 lookup? `comp[1.0]` returns int's index due equality/hash. Good. kth returns int if median is int. Append float. Fine.

Potential performance of `set(nums)` with unhashable? no.

Alternative to avoid storing `nums` original? If `nums` is list, okay.

Let's think about Python recursion? no.

Now, maybe problem expects efficient for k=1000 specifically; sorted list approach might be acceptable but Fenwick definitely efficient. Need maybe not use external `typing` to avoid imports? Fine.

Could use `__slots__`? no.

Let's test more edge cases mentally:
- nums=[0.0, -0.0], k=2. set: {0.0}? unique [0.0] m=1, idxs [1,1]. init tree [0,2? after updates: tree[1]=2]. target=1,2. find target1: step1 nxt1 tree[1]=2<1 false => vals[0]=0.0. target2: false => 0.0. median 0.0. good.
- nums=[float('inf'), float('-inf'), 1], k=2. unique [-inf,1,inf]. sorted okay. median inf? window [inf,-inf] -> 0.0? (inf + -inf = nan, /2 = nan). Actually (inf + -inf) gives nan. `float(nan)`. median mathematically nan. okay.
- nums=[10**308, 10**308, k=2]. even sum 2e308 -> inf? Python float addition: 1e308+1e308 = inf? It may overflow to inf. median inf. okay. If `float((a+b)*0.5)` with inf inf -> inf. If overflow in addition? Python float addition overflow yields inf? Actually operations with Python floats follow IEEE? 1e308+1e308 returns inf? Yes no OverflowError. Good.

Potential if `nums` contains very large ints: `unique` sorted ints. kth returns int. For even `(int + int)*0.5` may overflow when converting to float? For 10**400, `(10**400 + 10**400)*0.5` => first int sum 2*10**400, multiply by float 0.5; Python converts huge int to float? Could raise OverflowError? Let's check: In Python, `10**400 * 0.5` returns `inf` or raises OverflowError? I believe float multiplication with int converts int to float and may raise OverflowError? Actually `float(10**400)` raises OverflowError; but `10**400 * 0.5`? Let's recall: Python's `int` to `float` for multiplication with float: It may use special handling? Test memory: `10**400 * 2.0` returns `inf`? I think it raises OverflowError: (int too large to convert to float)? Hmm. Let's recall: In Python 3, `float(10**400)` raises OverflowError. But `10**400 * 2.0`: I think returns `inf` because long multiplication with float? Need check. Python operations: For binary arithmetic with float, ints are converted to float if needed. If too large, maybe OverflowError: `OverflowError: int too large to convert to float`. I recall `10**309 * 1.0` returns inf? Let's reason: CPython `int` to float for huge maybe returns inf? Actually `float(10**400)` definitely raises OverflowError because explicit conversion. For `10**400 * 1.0`, maybe calls `PyLong_AsDouble` which raises OverflowError? But maybe since 1.0 is float, long_float? Let's not rely. Could avoid for huge ints by using `(a + b) / 2` int? But output float. For huge ints, exact median int could be too large for float. But spec list[float], so ignore. If want robust: for even, if not finite? We could compute `median = (a + b) / 2` and then float? In Python, true division of ints returns float, may also Overflow? `(a + b) / 2` converts to float. Could use `median = (a + b) * 0.5`. Same. Not concern.

Potential if k is odd and unique int huge, `float(kth)` raises OverflowError. But list[float] prevents. If hidden ints huge, maybe they don't expect? Could instead return `kth(target)` which may be int, not list[float]. To avoid overflow, we could not convert ints to float if too large. But type. Since list[float], all are floats. okay.

Let's consider if `nums` has length 200k and k=1000 all distinct random floats. `sorted(set(nums))` sorts 200k floats; okay. `comp` mapping floats. `idxs` list. Good.

Could we optimize by mapping via `bisect_left` instead of dict? Dict faster.

Now, hidden tests might include `nums` with 200k random integers and k=1000, expecting under 2 sec. Fenwick okay.

Let's consider alternative using `heapq` might have issue with duplicate deletion dict memory but okay. Fenwick more deterministic.

Potential bug with `m_val = m`, `tree_list = tree`. In `kth` default `tree=tree_list`, if `tree_list` mutated okay. But we later modify `tree_list` in loops; default list reference same. Good.

Maybe using `end = n - k` and range(1,end+1) can be slow due many range iterations; fine.

Could precompute `add_index = start + k - 1`. good.

Could maybe combine update remove/add in one loop with delta? no.

Potential optimization: For initial window, instead of k point updates, build tree in O(m) by counting initial window? Could use `initial_counts = [0]*(m+1)` then for pos k initial_counts[idx] +=1, then build Fenwick tree via for i in range(1,m+1): j=i+(i&-i); if j<=m: tree[j]+=tree[i]. This may be faster for large k? k=1000 initial not matter. If k near n, initial k updates = n log m; building via counts O(m) faster. Could implement general efficient: For initial window, create freq array of compressed counts length m+1, then build BIT in O(m). For n=200k,k=200k, avoids 3.6M update loops. But code more. Could use for any k: `freq=[0]*(m+1); for pos in range(k): freq[idxs[pos]] +=1; tree = freq[:]`? Wait Fenwick tree needs tree values where tree[i]=sum freq over range (i - lowbit(i)+1..i). We can build from freq: `tree = [0]+freq[1:]`; for i in range(1,m+1): j=i+(i&-i); if j<=m: tree[j]+=tree[i]`. This is O(m). Good. Since m up to n. This could speed for large k and even for k=1000 maybe similar (1000 updates vs 200k build? O(m) build 200k vs 18k updates; initial updates better for small k. But code complexity slight. For n=200k, m=200k, O(m) build 200k operations vs initial 1000 updates 18k; O(m) slower. But initial update okay. If k large, O(m) build faster. Could branch if k > m? But not necessary. Could always use `freq` plus build? Then initial O(m + k) instead of k log m. For m=200k,k=1000, O200k vs 18k, maybe slower but still fine. But O(m) build plus dict? Actually building tree from freq length m=200k loops 200k, okay. Might not hurt. But initial update 18k is much faster. We can keep initial updates. If hidden k=n=200k, initial updates 3.6M, okay. Fenwick queries still. Under 2s? Could be okay. But could optimize large k by build.

Maybe implement initial build using counting array to reduce time for k large, but memory extra freq. Code:
```
tree = [0]*(m+1)
for pos in range(k): tree[idxs[pos]] += 1
for i in range(1,m+1):
    j = i + (i & -i)
    if j <= m: tree[j] += tree[i]
```
Wait if we initially store freq at tree[i], then build in-place: For i from1 to m: tree[i] currently sum of freq in its range after previous accum? Standard: `tree = freq copy`; for i in range(1,m+1): j=i+(i&-i); if j<=m: tree[j]+=tree[i]`. Yes. This works because tree[i] at time i includes contributions from previous indices within its range? Example freq [0,1,0,1]? tree copy. i=1 j=2 tree2+=tree1. i=2 j=4 tree4 += tree2 (which includes freq1+freq2). i=3 j=4 tree4 += tree3. Good. This O(m). But if k small and m large, slower. Could branch: if k * (m.bit_length()) < m? approximate. We can choose initial updates if k*logm < m else build. For k=1000 log18 =>18k <200k, so updates. For k=n, build. Nice.

Implement:
```
tree = [0]*(m+1)
# If initial window is small compared to m, point updates; else build from counts.
if k * m.bit_length() <= m:
    for pos in range(k): update
else:
    for pos in range(k): tree[idxs[pos]] += 1
    for i in range(1, m+1):
       j = i + (i & -i)
       if j <= m: tree[i? wait need j] tree[j] += tree[i]
```
Need ensure if `m=1`, bit_length 1. k*1 <=1? if k=1 handled, if k>=2 m=1 false? k*1 <=1 false for k=2; build: set tree[1]=k; build loop i=1 j=2 skip. good.
But if build branch, point updates after? tree built as Fenwick. Later updates use point updates. okay.

But branch maybe unnecessary. Let's keep simple initial point updates. For k=n=200k, 3.6M update operations maybe still okay (updates 3.6M + queries maybe 7M). Still maybe within 2s but a bit. Could include build branch to be safe. Adds O(m) build for all cases? Could be okay. O(m)=200k simple loops much faster than k updates 18k? Actually 200k vs 18k maybe 10x, still trivial (<0.02s). For k=1000,m=200k, build 200k vs 18k, extra 0.01s. Not issue. Build branch could simplify? It uses tree as freq initially; but if we branch only when beneficial, code more. Maybe always build is simpler and initial O(m+k). O(m) loops 200k simple `for i in range(1,m+1): j=... if j <=m: tree[j]+=tree[i]` maybe 200k, okay. But point updates 18k. Which is faster? 200k vs 18k, not significant total. But if m=200k,k=2? Build 200k vs 36 ops. Still 0.02s. okay. Simpler maybe always build from initial counts to avoid while loops initial. But need tree values freq first. Let's ensure correctness with duplicates and Fenwick tree: We can do:
```
tree = [0]*(m+1)
for pos in range(k): tree[idxs[pos]] += 1
for i in range(1, m+1):
    j = i + (i & -i)
    if j <= m:
        tree[j] += tree[i]
```
This transforms freq to BIT. Yes. This might be fastest overall for initial large k, but for small k extra m loop. For n=200k,m=200k, m loop 200k not bad. Then slide updates dominate. Simpler and robust for k large. Could use always build. But careful: if we use `tree` as freq and then build, `tree[idx]` point update function for later assumes Fenwick tree. After build, yes. Initial output queries valid. Good.

Let's test build with m=5, freq counts [0,2,0,1,0]? tree after freq: [0,2,0,1,0,0]
i=1 j=2 tree2 +=2 -> [0,2,2,1,0,0]
i=2 j=4 tree4 +=2 -> tree4=3
i=3 j=4 tree4 +=1 ->4
i=4 j=8 skip; i=5 j=6 skip. Fenwick tree: tree1=2 (range1), tree2=2? Wait tree2 should sum freq1+freq2 =2+0=2, yes. tree3=1, tree4 sum1-4=3? But we added tree2 (2) and tree3 (1) to tree4, total3. Good. tree5 freq5=0. For query target 3: step4? bit=4. idx0 nxt4 tree4=3 <3 false; step2 nxt2 tree2=2<3 true idx2 target1; step1 nxt3 tree3=1<1 false; return vals[2] index3. correct. Good.

Should we always build? Complexity O(m) for initial; plus building comp dict O(n). Good. Could save initial while loops for k large. For k small m large, extra O(m) but still maybe 200k vs 18k; 200k loop negligible (<0.02). Let's use always build? Need consider if m=200k, loop with `if j <= m` branch; okay. Simpler:
```
tree = [0]*(m+1)
for pos in range(k): tree[idxs[pos]] += 1
for i in range(1, m+1):
    j = i + (i & -i)
    if j <= m: tree[j] += tree[i]
```
Wait, there's a subtlety: The build algorithm `for i in range(1,n+1): j=i+(i&-i); if j<=n: tree[j] += tree[i]` works when `tree` initialized as `freq` (1-based). But after `tree[j]` gets `tree[i]`, later when i reaches j, tree[j] has accumulated its range and will propagate. Correct.

But if m large and k small, building tree via this O(m) could be slower than O(k log m), but still okay. But for n=200k, m could be 200k, 200k loop. Good.

Could further optimize build by using `while j <= m`? no.

Potential branch: if m==1: build loop trivial. Good.

Then `find` function default uses tree after build. Good.

Now, slide updates need point update using Fenwick tree. Use `tree_list` variable. For point update, standard while `i <= m: tree[i] += delta; i += i & -i`. Good.

Could combine removal and addition into a single `update` function for readability. Function call overhead 400k maybe okay. But for speed inline as above. Could define local update to reduce code duplication? But code with inline two loops repeated in odd/even branches; duplication okay.

Maybe avoid duplicated slide loops by one loop with `median_func`? But parity branch okay. We can factor `remove_add` but function call overhead. Not.

Could optimize by not re-check `nxt <= m` in find for fixed bit? Since `idx+step` maybe >m often; need check. We can precompute `highest = 1 << (m.bit_length()-1)`. The binary lifting loop steps: highest, half, etc. If m not power of two, initial step <=m. For each step, `nxt` can exceed m if idx near m? Example m=5, step4: idx0 nxt4 <=m. Later idx maybe 4, step2 nxt6 >m. Need check. okay.

Could use `if tree[nxt] < target and nxt <= m` but indexing before check bad. Use `if nxt <= m and tree[nxt] < target`.

Could precompute `steps = [1 << b for b in range(m.bit_length()-1, -1, -1)]` and loop `for step in steps:` to avoid `step >>= 1`? Slight. Use while step.

Could precompute tree update lowbits? Not.

Now think about correctness of sliding with BIT coordinate compression: The window count always k? We remove exactly outgoing before adding incoming. At start initial counts k. In loop start=1, remove nums[0] counts k-1, add nums[k] counts k. Then query. Good. Query after update. We appended initial before loop. Good.

Potential if `end = n-k` but if n==k, end=0; for range(1,1) none. Good.

Potential if `n-k+1` large; out append. Good.

Could preallocate `out = [0.0]*(n-k+1)` and assign maybe slightly faster and ensures length. Let's compare: append avoids prealloc but dynamic growth. 200k append okay. Prealloc assign may be faster? Could do:
```
res = [0.0] * (n - k + 1)
pos=0
res[pos]=...
pos+=1
...
```
Maybe faster to avoid append method? Append is C amortized. Prealloc assign requires index variable. Could be slightly. Let's maybe use append for simplicity. But if using prealloc, can avoid method lookup? We already localize append. Append method overhead maybe okay. Prealloc list of zeros maybe faster memory. Could do:
```
res = [0.0] * (n - k + 1)
pos = 0
...
res[pos] = float(...)
pos += 1
```
This avoids dynamic resizing but need maintain pos. Append likely fine. Prealloc may be faster and returns list. Let's use prealloc? Code complexity slightly. Could also use list comprehension with generator? no because need maintain tree.

Maybe prealloc and assign in both branches. Let's design:
```
count = n - k + 1
res = [0.0] * count
if k & 1:
  pos=0
  res[pos] = float(kth(target)); pos +=1
  for start in range(1, end+1): ... res[pos]=...; pos+=1
```
Good. Avoid append local. For even, pos.

Need ensure if count=0? Since k<=n and k>=1, count>=1.

Now, maybe use `bit_length` for m=0? no.

Could precompute `add_start = k` maybe:
```
for start in range(1, end+1):
    i = idxs[start - 1]
    ...
    i = idxs[start + k_minus_1] # k-1? start + k -1
```
`start + k - 1` addition each iteration. Could set `add_pos = k` initial and increment each iteration:
```
add_pos = k
for start in range(1, end+1):
   i=idxs[start-1]; update -1
   i=idxs[add_pos]; update +1
   add_pos +=1
```
This avoids addition? maybe minor. Use `add_pos = k`. Good.

Could set `remove_pos = 0` increment:
```
remove_pos = 0
add_pos = k
for _ in range(end):
  i = idxs[remove_pos]; remove_pos +=1
  i = idxs[add_pos]; add_pos +=1
  update; query; assign
```
This might be clean. But `start` used for initial? We already output initial. `range(end)` with end=n-k number of slides. Use local `idxs_local=idxs` maybe.

Let's implement optimized loop:
```
slides = n - k
if k & 1:
    target = (k + 1) >> 1
    res = [0.0] * (slides + 1)
    pos = 0
    res[pos] = float(kth(target)); pos += 1
    remove_pos = 0
    add_pos = k
    tree_list = tree
    idxs_list = idxs
    for _ in range(slides):
       i = idxs_list[remove_pos]
       while i <= m_val: ... -=1
       i = idxs_list[add_pos]
       while i <= m_val: ... +=1
       remove_pos += 1; add_pos += 1
       res[pos] = float(kth(target)); pos += 1
    return res
```
Need in `find` default tree uses tree_list? We assign tree_list after build; default kth created after tree built. If later modify tree_list, same object. Good.

Could localize `m_val`, `tree_list` in loops. Already. `idxs_list=idxs` local. `float_ = float` maybe speed? Could localize `float_func = float`. Use `res[pos] = float_func(kth(target))`. `float` builtin local maybe slight. Good.

Also localize `kth_func = kth`. Good.

Could `kth` returns float? If vals not floats, returns int. We call float. Good.

Need `tree` variable after build. If we create `kth` before tree built? No.

Potential issue if `tree` built via freq and then `kth` default uses `tree=tree`. Then in loops we use `tree_list = tree`. okay.

Could use `m_plus = m + 1`? no.

Let's think if building tree with `tree = [0]*(m+1); for pos in range(k): tree[idxs[pos]] +=1; for i...` might produce tree where point update while modifies correctly. But note tree values no longer direct freq but Fenwick. We need not know freq for removal? Removal point update decrements tree along Fenwick path. Good.

Now, if k=1 handled early. If k>1 and m=1, build tree[1]=k; build loop i=1 j=2 skip. `high_bit=1`. kth target works. For k even target1=1 target2=2. find target1: tree1=k<1 false return unique0; target2 tree1<2 false return unique0. median. Good. For k odd target. Good.

Now, maybe if `nums` includes booleans: True ==1, False==0; sorted unique maybe [False, True]? In Python bool subclass int, True==1 maybe if 1 present. Hash? If unique contains True and 1? set may collapse. kth return bool maybe `float(True)` 1.0. okay.

Now, possible issue with `sorted(set(nums))` and floats that are `-0.0` and `0.0`; mapping with lookup for `-0.0` returns index for `0.0` if unique has 0.0 due equality. Fenwick treats -0.0 and 0.0 same; median sign not exact but likely okay.

Could there be requirement to not mutate input? We don't.

Now, could using set on large list of floats with duplicate equal but NaN? Not robust. Should we include handling for NaN? If hidden tests include NaNs, what expected? Median of window with NaNs ambiguous. Could treat NaNs as equal to themselves? Python sort doesn't but can. But `list[float]` likely no NaN. If want, we could preprocess with `math.isnan`? Standard library math available but no import? Could import math. But median with NaNs would likely produce NaN if any NaN? There is no standard. Better not.

Now, maybe hidden tests expect efficient for n=200k k=1000 but with all values distinct. Our code fine.

Let's consider alternative: use `array('i')` for tree for memory? Not necessary.

Potential issue with Python recursion limit? no.

Let's evaluate time with build O(m). Suppose m=200k, slides=199000. `find` function call twice per slide. But `find` default args with list. Maybe function overhead + loop. Could inline kth into median retrieval to avoid function calls? Let's think. If performance critical, inlining two kth in loop could be faster but code verbose. Could implement a local function is acceptable. Need ensure under 2s. CPython 3.11 maybe function calls okay. But let's estimate more precisely: 400k function calls; each 18 iterations. Python loop inside function; function call overhead ~50 ns? Actually CPython function call maybe ~100 ns? No, ~100-200 ns? Maybe 400k*200ns=0.08s. okay. But local variable defaults speed. Fine.

Could use PyPy? Standard? likely CPython. Good.

Could optimize `find` using `while step > 0` and local `tree=tree_list`. Good.

Let's maybe write `kth` as:
```
def kth(target, tree=tree, m=m, vals=vals, high_bit=high_bit):
    idx = 0
    step = high_bit
    while step:
        nxt = idx + step
        if nxt <= m and tree[nxt] < target:
            idx = nxt
            target -= tree[nxt]
        step >>= 1
    return vals[idx]
```
This uses `m` and `tree` local. Good.

Potential issue if `vals[idx]` returns a non-float and then `float(...)` in even? `float((kth(target_low) + kth(target_high)) * 0.5)`. If kth returns `Decimal`, addition with 0.5? Decimal + float? TypeError? But list[float] no.

Could localize `half = 0.5`? not necessary. Use `* 0.5`.

Could if even and `low is high` maybe just float(low)? But overhead. Not.

Now, maybe we should not include `list[int]` in kth signature due Python version? Python 3.11 supports. But avoid annotations inside function maybe.

Need final code only. Let's think if any imports needed for `ValueError` no. `float`, `range`, `len`, `sorted`, `set`, `enumerate`, `bit_length` builtins. No imports. Good.

Let's perhaps include a docstring? Not necessary. But code block can have docstring. Fine. No tests. Could include comments. okay.

Let's test some cases manually:
Case nums=[1,2,3], k=1: returns [1.0,2.0,3.0]. good.
Case nums=[3,1,2], k=2: unique [1,2,3], idx [3,1,2], tree freq pos0,1: idx3, idx1 -> tree1=1, tree3=1. Build: tree [0,1,0,1]
i=1 j=2 tree2 +=1 => [0,1,1,1]
i=2 j=4 skip; i=3 j=4 skip. Query target1,2. kth1: high=2 (m.bit_length=2? m=3 bit_length=2 high=2). step2 nxt2 tree2=1 <1 false; step1 nxt1 tree1=1<1 false return vals0=1. kth2: step2 tree2=1<2 true idx2 target1; step1 nxt3 tree3=1<1 false return vals[2]=3. median2.0. Window [3,1] median2. good. Slide remove idx3: update tree3-=1 (tree3 0); add idx2: update i=2 tree2 +=1 => tree2=2, i=4 skip. Counts 1,2. kth1=1, kth2 step2 tree2=2<2 false step1 tree1=1<1 false vals1=2 median1.5. Window [1,2]. good.

Case duplicates [1,1,1,1], k=3 unique m=1, tree freq tree1=3; kth target2 returns vals0=1. slide remove/add no tree change. good.

Case k=n: initial build; query once; slides=0; result len1. For odd target; for even average. good.

Case k=2,n=2: tree initial counts both; query target1,2; slides=0. good.

Potential bug if `m.bit_length() - 1` for m=1: 1.bit_length=1, high=1. good.

Potential bug if `tree` built with freq, `kth` target high uses `tree[nxt]` prefix sums but tree built from freq. yes.

Now, could point updates with `tree_list[i] -= 1` ever make tree node negative due to Fenwick structure? No if counts nonnegative; but Fenwick node sums over ranges, subtract from path. Since count at leaf idx was >=1. Fenwick nodes may remain nonnegative. Good.

Potential issue with `build` if initial `tree` freq and then we do point updates; but if `tree` initial contains freq at indices but after build tree[i] no longer freq. okay.

Could maybe use `for pos, idx in enumerate(idxs[:k])` but slicing creates list; use range. Good.

Could use `for pos in range(k): tree_list[idxs[pos]] += 1` before `tree_list=tree`? okay.

Now, let's think if using `set(nums)` might produce unsorted stable but sorted. For floats, sorting 200k maybe okay. If nums contains `True` and `1` duplicates, okay. If nums contains large int and float equal? Python compares. okay.

Potential hidden requirement: "Return floats" maybe every element must be exactly `float` instance. Our `float()` ensures. For even average, if `(low+high)*0.5` returns `float`; wrapping float okay. For odd `float(kth)` ensures. If `kth` returns `float` subclass? `float()` returns base float. good. For k==1 `[float(x) for x in nums]` returns floats. Good.

Potential if `nums` contains `int` and k odd, median `float` conversion. Good.

Now, maybe there is a more efficient method using median of two heaps and sorted lists. But final code Fenwick okay.

Let's consider if `nums` length n = 200_000, k=1000, unique m maybe 1000? Then BIT query high_bit maybe 512? Actually m.bit_length=10, loops 10. Very fast. Updates 10 loops. Good. If m=200k, loops 18. Good.

Potential optimization: For even k and target_low and target_high often adjacent; maybe if we find low index `pos`, high target is target_low+1. If low value count >1, high value same. Could find high by starting from low and increment count? Could optimize but not needed. However 400k find calls maybe okay. Let's examine if we can reduce kth calls for even by using rank query pair. Could implement `find_two_targets` that finds both ranks in one traversal? Binary lifting finds rank target, but to find target+1 may traverse again. Could maybe compute lower rank and then `next` by moving to next unique index where cumulative >= target+1. If we find `idx0` (0-based index of target), if count at idx0 >= target+1 - prefix_before_target then high same; else high next index. But need count at idx0. We can get count via Fenwick? Need prefix sums. Not worth.

Could query lower rank, then `find_high` maybe starting from idx found? Fenwick binary lifting always starts idx=0. But could optimize by using BIT find with `target2` but no.

Potential if m=200k, high_bit 131072, step sequence 131072,65536,...,1. `nxt <= m` check. Good.

Let's think about possible integer target in `kth` mutated; default args; okay. If target invalid > total, returns last? no.

Now, maybe code style: Need only code block. We can include comments. Fine.

Let's perhaps refine final code for clarity:
```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    values = sorted(set(nums))
    m = len(values)
    rank = {v: i + 1 for i, v in enumerate(values)}
    ids = [rank[x] for x in nums]

    bit = [0] * (m + 1)
    for i in range(k):
        bit[ids[i]] += 1
    for i in range(1, m + 1):
        j = i + (i & -i)
        if j <= m:
            bit[j] += bit[i]

    top_step = 1 << (m.bit_length() - 1)

    def kth(target, bit=bit, m=m, values=values, top_step=top_step):
        idx = 0
        step = top_step
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < target:
                idx = nxt
                target -= bit[nxt]
            step >>= 1
        return values[idx]

    windows = n - k + 1
    result = [0.0] * windows
    pos = 0
    slides = n - k
    remove_pos = 0
    add_pos = k
    float_ = float
    kth_ = kth
    bit_ = bit
    ids_ = ids
    m_ = m

    if k & 1:
        target = (k + 1) >> 1
        result[pos] = float_(kth_(target)); pos += 1
        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i
            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i
            remove_pos += 1; add_pos += 1
            result[pos] = float_(kth_(target)); pos += 1
    else:
        target1 = k >> 1
        target2 = target1 + 1
        result[pos] = float_((kth_(target1) + kth_(target2)) * 0.5); pos += 1
        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i
            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i
            remove_pos += 1; add_pos += 1
            result[pos] = float_((kth_(target1) + kth_(target2)) * 0.5); pos += 1
    return result
```

This is good. Need think if `rank = {v: i+1 for ...}` with `values` sorted floats. If there is `-0.0` and `0.0` and sorted unique contains -0.0? Actually sorted([0.0, -0.0]) maybe [-0.0,0.0]? But set collapses. If set keeps -0.0, values [ -0.0], mapping 0.0 -> 1 because equality. okay.

Potential issue if `nums` is very large and `set(nums)` creates set of float objects; if list contains unhashable? no.

Could `values = sorted(set(nums))` be slower due sorting NaNs? no.

Let's maybe consider if k=2 and values [1.0, -inf, inf]? window [-inf,inf], average nan; okay.

Potential hidden test with k even, median should be mean of two middle values; if values are `int`, mean as float. Good.

Now, could there be memory limit low? `ids` 200k ints ~5.6MB, dict ~20MB, values ~20MB, bit ~1.6MB, result 1.6MB floats ~12MB? total maybe 60MB, okay. If memory 64MB maybe borderline? Could reduce memory by not storing values floats? Already. If all floats, values list 200k float objects already from nums? Set references? Hmm memory might be high but okay for typical. Could avoid `ids` dict lookups by replacing nums with compressed ids in place? Could mutate copy? Not necessary. But if memory strict, we could store `ids` array of ints using `array('I')`, but no imports? Could import array? standard. Not necessary.

Could avoid storing original `nums`? It already input. `ids` adds ints. `rank` dict large. Fenwick BIT coordinate compression requires mapping; could avoid dict by sorting nums with indices? e.g., coordinate compression using dict necessary. For memory, rank dict of up to 200k entries ~16MB; values list ~12MB; ids list ~1.6MB? ints maybe 28 bytes each =5.6MB. Result list floats ~6.4MB. Total maybe 50MB. Usually okay. If memory 16MB, not. Problem likely no strict memory. Could use `bisect_left(values, x)+1` for each x to avoid rank dict but 400k*log 200k ~7M C comparisons? `bisect` in C? `bisect_left` implemented in C? Python's bisect module is Python? Actually `_bisect` C accelerator. Could save dict memory but slower maybe. We can keep dict.

Could use `rank = {v:i for i,v in enumerate(values)}` 0-based and BIT indices +1? Need +1. okay.

Potential if nums has duplicate floats, set unique smaller. rank dict small.

Could precompute ids and release `nums`? not.

Now, maybe output result list of floats but for windows many zeros maybe all zeros same object? `[0.0]*windows` shares float 0.0 immutable okay; then assign. Good.

Potential issue if `result[pos] = float_((kth_(target1) + kth_(target2)) * 0.5)` with `kth_` returning Decimal? not.

Let's test with k odd but target fixed. Good.

Now, let's think about alternative of using two heaps could be less memory. But Fenwick okay.

Potential issue with initial Fenwick build: We set `bit[ids[i]] += 1` for initial window. But Fenwick tree build algorithm expects `bit` contains freq values at each index. However after adding duplicates to `bit[ids[i]]`, yes. Then for i from1 to m, propagate to j. Good. But wait: Suppose m=4, freq at indices [1:1,2:1,3:1,4:1]. Build:
bit initial [0,1,1,1,1]
i=1 j=2 bit2=2
i=2 j=4 bit4=3 (initial1+bit2(2)) ->3
i=3 j=4 bit4=4
i=4 j=8 skip.
Fenwick should be bit1=1, bit2=2, bit3=1, bit4=4. good. If freq at 2:1 only: bit [0,0,1,0,0]
i=1 skip; i=2 j=4 bit4=1; i=3 skip; i=4 skip. Fenwick bit4=1, correct range1-4 sum1. Query target1: step4? high=4 for m=4. idx0 nxt4 bit4=1<1 false; step2 nxt2 bit2=1<1 false; step1 nxt1 bit1=0<1 true idx1 target1; return vals[1]? Wait values idx? For m=4, idx=1 zero-based => vals[1] index2, correct. Good.

If m not power of two, high_bit <=m. Build works. Good.

Now, potential if `values = sorted(set(nums))`, mapping uses 1-based `i+1`. For `ids`, if x is NaN not equal to key, KeyError. ignore.

Let's consider if `nums` includes `None`? Type list[float], no. If None, set sort fails? no.

Now, maybe problem expects "well under 2 seconds" and standard library. Could hidden tests use n=200k k=1000 but all random floats; our code good. Could hidden use n=200k k=1000 with adversarial values causing many unique; okay. Could hidden use k=1000 and repeated random update causing tree nodes many increments/decrements. okay.

Potential optimization: Because k fixed small=1000, we could use sorted list algorithm faster than BIT? But BIT fine. Let's maybe compare: BIT query loops Python-level, sorted list insert uses C memmove but Python-level bisect and list operations. Could be faster for k=1000? Hmm maybe list algorithm actually much faster due C memmove? But BIT also C list operations in while? BIT loops Python-level with Python int arithmetic. 14M Python loop iterations could be slower than C memmove. For k=1000, list shifts maybe 200k*1000 pointer copies = 200M pointer moves in C, but list insert/pop calls Python C API. 200M pointer moves maybe ~0.2-0.5s? Python overhead for 4 operations each ~0.2s. Could be faster. But BIT 14M Python iterations maybe ~1s. Both fine.

But list sorted halves might fail for k very large (if hidden k=1000 only okay). Fenwick robust. Need ensure BIT Python iterations not too high. 14M Python while iterations maybe maybe 1.5-2s in CPython. Could we reduce Python iterations? Let's estimate: Each update loop: `while i <= m_: bit_[i] -= 1; i += i & -i`. For m=200k, number of nodes updated equals number of 1 bits? For random idx, ~ log2(m)/2? Actually Fenwick update path length average maybe ~9? Let's compute: idx += lowbit; path length number of zero bits? For random <=200k, average maybe ~9. For query, fixed bit_length 18. So updates 400k*9=3.6M, queries 400k*18=7.2M, total 10.8M. Build 200k. 10M Python iterations. Could be ~0.7-1.5s. Good.

Could optimize update path length by precomputing `next_idx = [i + (i & -i) for i in range(m+1)]` and loop `while i <= m_: bit_[i] += delta; i = next_idx[i]`. This avoids `i & -i` arithmetic. Precompute list size m+1. Could speed updates. Query still bit arithmetic. Update path maybe 3.6M loops; saving arithmetic helpful. Memory +1.6MB. Could do:
```
next_idx = list(range(m+1))? Actually next_idx[i]=i+(i&-i)
for i in range(1,m+1): next_idx[i]=i+(i&-i)
...
while i <= m_:
   bit_[i] += delta
   i = next_idx[i]
```
Could be faster? List lookup vs bit arithmetic. `i & -i` is C fast, maybe list lookup slower? Not sure. Could skip.

Could precompute update paths for compressed indices? Not.

Could query use `while step: nxt=idx+step; if nxt<=m_: ...; step >>=1`. good.

Could implement `kth` returning index and value? no.

Now, maybe using `array('i')` for tree and next_idx could reduce memory but list faster.

Could use `from itertools import chain`? no.

Let's think if there is a way to find median using BIT with two targets more efficiently by leveraging target low/high and counts. Could use binary search over sorted unique values using prefix sum query? That would be O(log m * log m) slower. BIT kth optimal.

Could use wavelet tree? Not standard.

Maybe use `heapq` with two heaps and lazy deletion: operations on heap are C? heapq is Python with some C? `heapq` uses Python functions but heappush/pop loops in Python? It's C accelerated `_heapq`? CPython has C implementation for heappush/pop? Yes `heapq` has C functions? I think `_heapq` provides C implementations for heappush/heappop? Actually heapq module functions are Python but use `_heapq.heappush` C? Might be fast. Could be efficient for k=1000. But Fenwick okay.

Let's evaluate correctness of lazy heap if we considered; no need.

Potential issue: Fenwick `kth` uses BIT built from initial window, then point updates remove/add. It can find kth of multiset after updates. yes.

Now, maybe hidden tests require stable for k large n small; okay.

Could include comments explaining? No tests. Comments okay.

Let's ensure no `input()` or printing. Good.

Potential issue with `list[float]` type hint in Python 3.8? Problem says 3.11+, okay.

Now, let's consider if using `sorted(set(nums))` and `rank` dict with floats could be problematic with values that are equal but different hash? For int/float hash equality. For `1` and `1.0`, hash equal and equality true. For `-0.0`, hash 0, equality true. Good. For `float('nan')`, hash 0 but equality false, so dict separate. no.

Potential if `nums` has custom float subclass? list[float]. okay.

Now, maybe we need to handle `k` as numpy int? Type int maybe. If `k` numpy int, `k & 1` works? `range(k)` if numpy int works? yes maybe. `k < 1` returns numpy bool, okay in if. `k >> 1` works. But not concern.

Potential if `nums` is empty and k=0? `k<1` true raise. If k negative raise. If k > len raise. Good.

Now, final answer must be a single ```python code block. No explanation. Ensure no example usage. Fine.

Double-check code syntax:
```
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    values = sorted(set(nums))
    m = len(values)
    rank = {v: i + 1 for i, v in enumerate(values)}
    ids = [rank[x] for x in nums]

    bit = [0] * (m + 1)
    for i in range(k):
        bit[ids[i]] += 1
    for i in range(1, m + 1):
        j = i + (i & -i)
        if j <= m:
            bit[j] += bit[i]

    top_step = 1 << (m.bit_length() - 1)

    def kth(target, bit=bit, m=m, values=values, top_step=top_step):
        idx = 0
        step = top_step
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < target:
                idx = nxt
                target -= bit[nxt]
            step >>= 1
        return values[idx]

    windows = n - k + 1
    result = [0.0] * windows
    pos = 0
    slides = n - k
    remove_pos = 0
    add_pos = k
    bit_ = bit
    ids_ = ids
    m_ = m
    kth_ = kth
    float_ = float

    if k & 1:
        target = (k + 1) >> 1
        result[pos] = float_(kth_(target))
        pos += 1
        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i
            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i
            remove_pos += 1
            add_pos += 1
            result[pos] = float_(kth_(target))
            pos += 1
    else:
        target1 = k >> 1
        target2 = target1 + 1
        result[pos] = float_((kth_(target1) + kth_(target2)) * 0.5)
        pos += 1
        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i
            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i
            remove_pos += 1
            add_pos += 1
            result[pos] = float_((kth_(target1) + kth_(target2)) * 0.5)
            pos += 1

    return result
```

Potential issue: In even branch, result initial assignment; if windows maybe 0? windows >=1 because k<=n. Good.

Potential issue: `float_((kth_(target1) + kth_(target2)) * 0.5)` if target1 and target2 values are int and sum int large; maybe overflow. okay.

Potential if `k` is even but target1==0? k>=2 if even and k>1; okay. If k=1 handled odd. Good.

Potential if `m` is 0? If n=0, k must invalid. For k>=1, n>=1, m>=1. Good.

Potential if top_step = 1 << (m.bit_length() - 1), for m=1 top_step=1. Good.

Could we reduce code duplication by defining slide update? no.

Could `rank` dict lookup for x in nums fail if x is NaN? ignore.

Now, maybe problem says "n = 200_000 with k = 1_000" but not all k; maybe they expect algorithm O(n log k), but O(n log n) okay. If unique m=200k, log n. Good.

Now, let's consider if there is a bug in BIT build: We are using `bit` both as freq and tree. In initial counts, for i in range(k): bit[ids[i]] += 1. If multiple initial positions have same idx, okay. Then build. But if ids are compressed 1..m, and bit length m+1. okay.

Potential issue: For coordinate compression with floats, sorted unique returns values; mapping rank maps float objects to ints. If list has equal float `0.0` and int `0`, mapping `rank[0]` if 0 key exists. good.

Now, maybe we should use `values` not `vals` to avoid shadowing built-in? okay.

Let's maybe test with random small by mental brute? Could write not needed. But verify median with k even and duplicates: nums=[1,2,2,3], k=4 sorted [1,2,2,3] median (2+2)/2=2.0. unique [1,2,3]. idx [1,2,2,3]. initial freq bit: [0,1,2,1]. Build m=3 top=2? m.bit_length=2 top=2. bit after build: i1 j2 bit2=3; i2 j4 skip; i3 j4 skip. bit=[0,1,3,1]? Wait initial bit after counts: bit1=1,bit2=2,bit3=1. i1 j2 bit2=3. i2 j4 skip. i3 j4 skip. Fenwick should bit1=1, bit2=sum1+2=3, bit3=1. target1=2,target2=3. kth2: step2 nxt2 bit2=3<2 false; step1 nxt1 bit1=1<2 true idx1 target1; return values[1]=2. kth3: step2 bit2=3<3 false; step1 bit1=1<3 true idx1 target2; return values[1]=2. median 2. good.

Another: nums=[1,2,3,4], k=4. freq bit1=1,bit2=1,bit3=1,bit4=1. build i1 j2 bit2=2; i2 j4 bit4=3; i3 j4 bit4=4. target2 target3. kth2: step4 bit4=4<2 false; step2 bit2=2<2 false; step1 bit1=1<2 true idx1 target1 return values[1]=2. kth3: step4 false; step2 bit2=2<3 true idx2 target1; step1 nxt3 bit3=1<1 false return values[2]=3. median 2.5. good.

Now, if k even and target1=1,target2=2 with values [1,2]. kth1: step? m=2 top=2. bit after build counts: initial bit1=1,bit2=1; i1 j2 bit2=2. kth1: step2 bit2=2<1 false; step1 bit1=1<1 false return values0. kth2: step2 bit2=2<2 false; step1 bit1=1<2 true idx1 target1; return values1. good.

If all values same: bit1=k, kth target returns values0. good.

Now, let's think about the median order for even with negative values: target ranks ascending. Good.

Potential if there are duplicate NaNs and sorted set weird; no.

Could we use `values = sorted(set(nums), key=lambda x: (x != x, x))` to sort NaNs? no.

Now, hidden tests could have `nums` as list of ints and `k` large; `float(x)` for k==1 returns float. good.

Could hidden tests expect `ValueError` exactly? yes.

Now, maybe there is an issue with using built-in `list` type hint requiring `from __future__` in Python 3.8? But 3.11. okay.

Now, final response should be only code block. Need no analysis in final. Good.

Double-check no example usage/no input/print. yes.

Could we include `# Standard library only`? okay. Not necessary.

Let's maybe add a short docstring? No need but okay. The instruction "Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing." Comments okay? Usually okay. To be safe, only code with function. Comments minimal.

Now, potential further optimization: Avoid `rank` dict if values are all distinct by sorting `sorted_nums_with_idx`? no.

Could use `values = sorted(set(nums))`, but if nums list contains many duplicates, rank dict small. If unique all 200k, dict memory okay.

Potential hidden tests with time limit 1s? Our code maybe borderline. Could improve with C acceleration? No external. Maybe implement sorted list approach might be faster for k=1000. But hidden unknown k. Could choose algorithm based on k to maximize speed? We could combine two algorithms: for small k (e.g., k <= 4096) use two sorted halves lists (C-level insert/delete) and for large use BIT? That might be faster for specified k=1000 but more code complexity. Is it worth? Need robust and under 2 sec. BIT likely under 2 sec. But if time limit very strict 1s, maybe sorted list faster? Let's explore.

Sorted two halves algorithm:
- `low = sorted(nums[:k])`, `high = []`? Maintain low size lower=(k+1)//2, high size upper=k//2. But initial full sorted; then low = sorted[:lower], high=sorted[lower:]. Maintain order low<=high.
For each slide remove outgoing x, insert incoming y.
Remove: if low and x <= low[-1]: idx = bisect_left(low,x); low.pop(idx); elif high: idx = bisect_left(high,x); high.pop(idx). But if x appears in both halves due duplicates and equal to boundary, choosing low may be wrong if outgoing x actually in high? We have multisets, any copy indistinguishable. If x <= low[-1], remove from low; else high. But if x == low[-1] and there is copy in high? low contains <= boundary; removing from low okay; high copy if outgoing high? But all copies equal, removing from any half of equal value maintains multiset? Sizes then rebalance. Good.
Insert y: if low and y <= low[-1]: low.insert(bisect_right(low,y),y)? For duplicates maybe insert before/after; maintain order with high? If y <= low[-1] insert in low; else high. But if low empty? high. Then rebalance sizes: while len(low) > lower_size: high.append? Need insert into high maintaining order: move low[-1] to high using bisect.insort? Since low[-1] <= all high? Actually after order maintained, max low <= min high. So we can `low.pop(); high.insert(0, moved)`? Because moved is <= existing high min? Wait when moving max low to high, moved may be greater than some high values? If all low <= all high before, moved <= min high? Yes max low <= min high, so high.insert(0, moved) keeps sorted. When moving min high to low, moved >= max low? Since min high >= max low, low.append(moved) keeps sorted. So rebalance efficient O(1) moves plus list pop. Good.
- Enforce order after insert/remove: if low and high and low[-1] > high[0]: swap top: a=low.pop(); b=high.pop(); low.append(b); high.insert(0,a)? Actually if low max > high min, move low max to high and high min to low. low.append(high[0])? Since high[0] <= low max and low sorted, appending high[0] to low maintains sorted if high[0] >= previous low max? But low[-1] was > high[0]; after pop low, new low[-1] <= high[0]? Since original low sorted, all remaining low <= old max; but high[0] could be less than some remaining low? If low max > high min, but low second max could still > high min? Example low [5,6], high [1,2], after swap low pop 6, high pop 1 => low [5], high [2,6]? Need multiple swaps. Standard loop while low[-1] > high[0]: swap tops. After one swap, sizes temporarily? We can do swap maintaining sizes: `a=low.pop(); b=high.pop(); low.append(b); high.insert(0,a)`. Need ensure b appended to low sorted: before swap, all low elements <= a? low pop max. After removing a, remaining low max <=? high min b maybe could be less than remaining low max? Example low [1,5,6], high [2,3,4] (order violated because max6 > min2). Swap a=6,b=2 => low [1,5,2] append 2 -> [1,5,2] not sorted because 5>2. Need insert b at correct position (bisect) or multiple swaps. Standard two-heap uses heaps no order issue; for sorted lists, to swap maintain sorted need `low.pop(); high.pop(); bisect.insort(low,b); bisect.insort(high,a)` O(k). Or use heap? Hmm. Could rebalance order by moving max low to high with `high.insert(0,a)` because a >= all high? If order violated, max low > min high but not necessarily >= all high? Since low elements could be mixed. To maintain sorted after arbitrary insert, need fix order via moves that may require O(k). Could instead insert new into correct half then rebalance sizes by moving boundary, then if order violated due to sizes? Standard algorithm: ensure sizes and order by moving elements; if a low max > high min, move max low to high, move min high to low, but sorted list insertion costs. However if we always keep max low <= min high, then after remove/insert, if insert y <= low[-1] into low, low max maybe increases? But y <= old max, so low max unchanged. If insert y > low[-1] into high, min high maybe decreases? If y < old min high? But y > low[-1]; could be less than old min high, so min high may decrease but still > low max. So order maintained. Remove can cause sizes rebalance moving boundary maintaining order. Actually if initial invariant holds, remove and insert by boundary preserves invariant before rebalance? Let's examine remove from low (x <= low[-1]) removing a value from low; low max might decrease; order still holds. Remove from high (x > low[-1]) high min might decrease? Removing from high sorted by bisect, high min could become larger or same? If remove first element, next high min >= old x? old x > low max, so new high min > low max. order holds. Insert: if y <= low[-1] insert into low, low max maybe same (if y<=max) or y could become max? y<=low[-1] so no increase beyond old max. if y > low[-1] insert high, high min maybe y if y < old min high; y > low max so min high > low max. order holds. Rebalance sizes: if low too large, move low[-1] to high: moved = max low <= min high? Since order holds, moved <= min high, insert at high[0] maintains. if high too large, move high[0] to low: high min >= max low? order holds, append to low maintains. Good. So sorted lists can maintain order with O(1) boundary moves! Nice. Insert into correct half maintains order. Remove by boundary and bisect maintains order. Thus no need bisect.insort for moves.

Need handle duplicates and boundary decisions carefully. We can maintain low sorted, high sorted, invariant all low <= all high. For insert y: if low and y <= low[-1]: low.insert(bisect_right(low,y), y) (or bisect_left?) If duplicates equal to max, insert into low; okay. Else high.insert(bisect_left(high,y), y). If low empty insert high? For k maybe high empty if k=1 handled. If high empty and low not full? For rebalance? If high empty and y > low[-1], high.insert. good.

Remove x: Need decide which half contains outgoing x. If low and x <= low[-1] remove from low else high. If x equals boundary and also in high, removing low okay. But if x <= low[-1] but no x in low? Could happen if low contains values less, high contains x? Invariant low <= high. If x <= low[-1], any occurrence of x can be assigned to low because low contains all elements <= boundary? But low may not contain x if high has x equal to boundary? If x == low[-1] and low contains boundary? If x <= low[-1] but low does not contain x? Suppose low=[1,3], high=[3,4], low[-1]=3, x=3. Low contains x at max. Good. Suppose x=2, low=[1,3], high=[4], low[-1]=3, x=2 but outgoing x=2 not in low? In multiset, if low contains 1,3 and high contains 4 and initial window values maybe [1,3,4]? x=2 cannot be outgoing if not present. If x present and x=2 <= low[-1], by invariant if x in high, high min >= low max? If x in high, x >= low max =3 contradiction 2<3. So x must be in low. Good. For duplicates equal boundary, can remove from low even if outgoing copy logically in high? Since copies identical; multiset removal same. But if we remove low copy when outgoing high copy, we may still maintain counts? Total copies decreased by one; sizes rebalance maybe move another boundary equal. Good.

Thus sorted half list algorithm is efficient. Complexity per slide: two bisects (C? bisect_left in Python? `_bisect` C) and list pop/insert of length up to 500 (C memmove) plus O(1) moves. Could be faster than Fenwick for k=1000. But if k large, list sizes ~100k, too slow. Could choose sorted list algorithm when k small (e.g., k <= 4096 or k * log? threshold), else Fenwick. This hybrid could optimize specified case and robust for large. But code complexity and potential bugs. Fenwick is simpler and robust. Do we need hybrid? Not necessary, but maybe if time strict. The prompt says must be efficient n=200k k=1000; Fenwick fine. Hybrid may not needed. Simpler final is better.

Let's roughly benchmark mentally: Python BIT 10M while loops. Each while loop: list indexing, int addition/subtraction, comparison. Could be ~0.1 micro per iteration? Actually Python iteration ~50 ns? No, Python bytecode ~50 ns? More like 20-100 ns for simple? 10M * 100ns=1s? Maybe 10M * 200ns=2s. Could be close. Sorted list maybe C memmove 200k*500=100M pointers ~800MB, maybe 0.2s plus Python ops 1M ~0.2s. Hybrid could ensure well under 2s for k=1000. But Fenwick should pass typical. The prompt specifically "well under 2 seconds" maybe because naive O(k log n) would be slow; Fenwick O(n log n) good. They likely accept.

Need ensure no hidden timeout due Python coordinate compression sort/dict. Should be okay.

Could we improve Fenwick by using `bisect` sorted list for small k? Hybrid maybe overkill but could be done. Let's consider writing hybrid to be safe performance. But more code, risk bugs. If sorted half algorithm correct, could use for k <= maybe 2048 or 4096, else BIT. Then k=1000 uses fast sorted lists. For k large uses BIT. That might yield best. But final code longer. Need maintain correctness. Let's thoroughly verify sorted half algorithm before considering.

Sorted half details:
Given `lower_size = (k + 1)//2`, `upper_size = k - lower_size`.
Initial: `sorted_window = sorted(nums[:k]); low = sorted_window[:lower_size]; high = sorted_window[lower_size:]`. invariant.
For each slide outgoing x=nums[start], incoming y=nums[start+k].
Remove x:
- if low and x <= low[-1]: idx = bisect_left(low, x); low.pop(idx)
  But if x <= low[-1] but x not found? Should not; due multiset. However if x == boundary and low contains some but maybe not? It does. If x < low[-1] but x in low. Good. Use `bisect_left`; pop. If low empty? For k>1, lower_size maybe >=1? If k=2 lower=1. If lower empty only k=0. So okay. But if lower_size=0? k=1 handled.
- else: idx = bisect_left(high, x); high.pop(idx)
Insert y:
- if low and y <= low[-1]: low.insert(bisect_right(low, y), y) (using bisect_right to place after duplicates? Maintains order. Could use bisect_left; any position among duplicates okay. Need ensure y >= low[-1]? if y <= low[-1], insertion before max; if y == low[-1], insert before max maybe okay, low max remains same. If use bisect_right, low sorted. Use `bisect_right` maybe keeps duplicates grouped. If y < low[-1], inserted before max. Good.)
- else: high.insert(bisect_left(high, y), y). If high empty, insert 0. Need if low empty? lower_size could be 0 for k? no. If k even lower_size=k/2; if k=2 lower=1. If k=3 lower=2. Good.
Rebalance sizes:
- If len(low) > lower_size: move = low.pop(); high.insert(0, move) (since move <= high[0]? Need if high empty? If high empty but low > lower_size? upper_size maybe >0? If k even and lower_size=1 upper_size=1; high could be empty if low got too many and high empty. move <= high[0]? high empty so insert 0 okay. If high nonempty and invariant holds before move, move <= high[0] if high[0] exists. If high empty, okay.)
- If len(high) > upper_size: move = high.pop(0); low.append(move). Need high pop(0) O(k) shift; list pop(0) shifts high elements, but high length ~500, C memmove. Could use `high.pop()`? Need min high. Could maintain high as sorted list; min at 0. pop(0) O(k). Alternatively if high too large, we could move max of low? Not. But rebalance after removal/insert should only differ by at most 1, so at most one move. pop(0) shifts high. Acceptable. Could avoid pop(0) by using deque? sorted list. For k=1000 okay. Or maintain high with max? no.
- If len(high) < upper_size and len(low) >? Already. Could ensure exact sizes; due remove/add sizes total k. The above while or if. At most one move each? After remove+insert, len(low) may be lower_size-1, lower_size, lower_size+1? If both remove low insert high: low -1 high +1. If remove low insert low: sizes unchanged. If remove high insert low: low +1 high -1. If remove high insert high: unchanged. So at most difference 1. So if statements enough. But if high pop(0) and insert into low, order? Since high[0] >= low[-1] (invariant after insertion? If removal from high, order maintained; insert into low could make low max? If insert y > old low[-1] but <=? Wait branch: if low and y <= low[-1] insert low. That y <= old low max. So low max unchanged. If y > low[-1] insert high, so not low. Thus if low+1 high-1 due remove high insert low? That can only happen if low empty? If low empty no low[-1], insert high. For low+1 high-1, insert y into low because y <= low[-1], so low max unchanged. Thus moving high[0] (after removal high) to low append preserves sorted. Good. If high+1 low-1 due remove low insert high, insert y into high because y > low[-1]; low max unchanged (or decreased). Moving low[-1] to high[0] preserves sorted because low[-1] <= high[0]? If high nonempty. If high empty, okay. Good.

But what if insert y > low[-1] but low is empty? high insert. Good.

Need maintain order after rebalancing if high empty and low max > high? high empty no order. If high nonempty and invariant before rebalance, okay. If due remove low from low with low max maybe unchanged, insert high with y maybe less than low max? But branch says y > low[-1], so no. Due remove high and insert low, y <= low max. okay.

Need remove `x` from high if x > low[-1]. If high empty? Could happen if low contains all k? But upper_size maybe 0 for k=1 only. For k>1 upper_size>=1. But during rebalance high could become empty temporarily? For k=2 lower=1 upper=1. At start high size 1. Remove low insert high: high size 2 then rebalance. high not empty. If x > low[-1], high should contain x because low contains only <= boundary. If high empty but x > low[-1], impossible unless invariant broken. okay.

Median retrieval:
if k odd: low[-1]
else: (low[-1] + high[0]) / 2.0
Because low size lower=(k+1)//2 = ceil(k/2), high size floor(k/2). For k odd, low has extra and max low = kth (1-based k+1//2), median. For k even, low max rank k/2, high min rank k/2+1. Good.

Need import `bisect`? Standard. `from bisect import bisect_left, bisect_right`. Allowed. If not, can implement? import okay. But final code maybe no imports? Standard library import okay. If using Fenwick no imports. Hybrid adds import. Could still okay. But maybe prefer no imports for simplicity. Fenwick no imports.

If hybrid, code length long. Is there any advantage? Could choose `if k <= 4096: sorted lists else BIT`. Need implement both. More risk. Fenwick likely pass. We can keep Fenwick only.

Let's consider if Python 3.11 standard library performance enough. 10M loops maybe okay. To be safe, we can optimize Fenwick update by using a helper `update` maybe function call overhead but code shorter. Inline okay. Could also use `while i <= m_` with `bit_i = bit_[i]`? no.

Could use local variables for `bit_` and `ids_` inside loops. yes.

Potential micro-optimizations:
- Use `for _ in range(slides):` okay.
- Use `pos += 1` and `result[pos]` maybe okay. Could maintain pos increment and assign. Could instead use `append` and no pos. Append method local perhaps faster than indexing? Let's think: Prealloc list and assign avoids append resize but indexing overhead similar. Append method C handles size. For 200k, both okay. Append code shorter? Could use `append = result.append` after creating empty; append method call overhead vs assignment with pos. Assignment maybe faster? But prealloc `[0.0]*windows` requires initializing all zeros. Append empty maybe less memory initialization? 200k zeros init trivial. Append might be faster than assignment? Not sure. Append is method call; assignment is `STORE_SUBSCR` with integer pos. Both okay. Use append? Simpler maybe:
```
result=[]; append=result.append
append(...)
for ...: append(...)
```
No pos, no prealloc. Dynamic list resizing 200k but amortized. Append method call maybe C. It may be fine. But prealloc and assignment avoids resizing and method call. Which is faster? In CPython, list append has method call overhead but optimized; assignment to preallocated list with `pos` might be similar. Could use `result_append = result.append` and call. Let's maybe keep append to reduce variable pos. But prealloc ensures list length. Hmm.

If using append, dynamic reallocation maybe few copies, negligible. Method call overhead 200k maybe ~0.02s. okay. Code simpler:
```
result = []
append = result.append
...
append(float(...))
```
Could be faster than prealloc assign? Not critical.

But if using prealloc, we need result zeros maybe memory. Append empty avoids storing zeros until assigned. But dynamic overallocation. Maybe append faster? Let's use append to simplify. However if using append in even branch, we need method local. Good.

Potential issue with `append` method call inside loop 200k; okay. Could localize `append = result.append`. Good.

Which code final? Fenwick with append and inline updates.

Let's write final Fenwick with append, not prealloc? Need output length exactly. Append easier.

```
result=[]; append=result.append
if odd:
 append(...)
 for ...: append(...)
return result
```
This avoids pos. Good. But result dynamic memory; fine.

Could localize `append` after branch. Use `result_append = result.append`.

Potential micro-opt: In even branch, `half = 0.5`, use `median = (a+b)*half`. no.

Now, maybe we can use `kth` function with default `bit=bit` but inside loop `bit_ = bit` updated? Since default bit references same list, okay. In `kth`, bit local variable is list. Good. But `kth_ = kth`; `append` calls. Good.

Could make `kth` return float? Not if values ints; then `append(kth(target))` might append int. Could inside kth `return float(values[idx])` but for even need addition maybe float. That would add float conversion for every query, maybe overhead; for odd one conversion, for even two conversions but average of ints might need float anyway. If kth returns float, even `(float+float)*0.5` no final float? Need still maybe. But if kth returns int and even average returns float; for odd need conversion. Current good.

Could in even branch use `(kth1 + kth2) / 2` instead of `*0.5`. Multiplication by 0.5 maybe faster than division? likely similar. Use `* 0.5`.

Now, final code with no imports. Need ensure `list[float]` type hint allowed. yes.

Let's maybe include `__all__`? no.

One more thought: The coordinate compression `values = sorted(set(nums))` creates a set of floats; if nums length 200k all distinct, memory but okay. Could sort `nums.copy()` and unique by scanning to reduce memory? `sorted(nums)` then unique values list; but then mapping? Could do `values = sorted(nums); unique=[]; prev=None; ...`; but need mapping dict. Set is okay.

Potential if input has many equal floats but -0.0 vs 0.0; set collapses. okay.

Now, check for ValueError if `nums` is None? len raises TypeError. Type hint. okay.

Now, maybe hidden tests call `sliding_median([], 1)`: k>len -> ValueError. Good.

Now, could hidden tests call `sliding_median([1,2,3], 0)`: k<1 -> ValueError. Good.

Now, potential issue: `k & 1` for negative k? Already raised. Good.

Now, consider if k is even but m=1; `target2 = target1 +1` = k/2+1 <= k. find target2 valid. good.

Let's think if `kth` function uses `target -= bit[nxt]` but target could become 0? Standard when `bit[nxt] < target` strictly. If target becomes exactly? okay. At end target in 1..lowbit? return index. Good.

Now, maybe BIT tree values could exceed Python int small? counts <=200k, small. good.

Potential micro bug: In `kth`, if `idx` becomes equal to `m`, `values[idx]` out of range. Could this happen for target valid? Let's prove: After loop, idx is largest index such that prefix sum of idx < original target. Since total prefix sum m >= target, idx < m. Thus values[idx] index zero-based? If idx = m? impossible. If idx = m-1? return values[m-1] correct. Good.

Now, maybe top_step chosen as highest power <=m. Binary lifting standard can start with highest power of two <=m. Good. If m=5 top=4. Good.

Potential issue with `bit_length` when m=0? no.

Now, let's think if using Fenwick tree build from initial window with `bit[ids[i]] +=1` and then propagation could break if `ids` 0? No rank 1..m.

Now, maybe coordinate compression mapping could be done with 0-based indices and BIT update i+1? We use 1. good.

Now, final answer. Need only code block. Ensure indentation correct.

One more possible improvement: If k == n, no slides. We still build BIT initial and kth once. Could compute median by sorting `nums`? But BIT okay. If k very large n=200k, BIT build O(m + n?) Actually initial count loop k=200k, build O(m). Queries 1-2. Updates none. Good. Sorting set already O(n log n). Could just sort whole nums if k==n and compute median O(n log n), but BIT also sort set maybe same. If k==n and unique n, set+sort + mapping+ids. If we just sort nums, median faster. Could branch: if k == n: sorted_nums=sorted(nums); compute median float; return [median]. This avoids BIT memory and dict? Might speed large k. But not necessary. Could add branch before coordinate compression: `if k == n: ...` But if k=n large, sorting list of n O(n log n), same as set+sort but less overhead. Good optimization. For k==n, output length 1. Could implement:
```
if k == n:
    if k &1: return [float(nums[k//2])]
    return [float((nums[k//2-1]+nums[k//2])*0.5)]
```
But if nums contains NaNs? sorting? same. If nums is not list but sequence; okay. Need `nums` already list. This branch could improve large k. But if k==n=1 handled k==1. For k==n even/odd. Could use sorted(nums) not sorted(set). If all values. Let's consider if `nums` unsorted; median of all. Use sorted(nums). This avoids rank/ids. Good. But if values all floats, okay. If k==n=200k, sorting list 200k vs set+dict+ids; faster. Should we add? Sure, small code. But branch if `k == n` before k==1? k==1 covered but okay. Need ensure returns floats:
```
if k == n:
    if k & 1:
       return [float(nums[k >> 1])]
    mid = k >> 1
    return [float((nums[mid - 1] + nums[mid]) * 0.5)]
```
Works if k even. If nums contains bool, float. If k==n and n=0? k<1 if k>=1? If n=0,k=1 k>n raise before. good. If k==n=1, earlier k==1 returns list; either. Could place after validation and before k==1? k==1 and k==n, if k==1 branch returns each element sorted? For k==n=1, `nums` not sorted, but median of single no need sorted. k==1 branch `[float(nums[0])]`; okay. Could place `if k == 1` first. Then `if k == n` maybe. Fine.

If k==n and nums contains unhashable? no. Sorting list directly. Good. This optimization not necessary but okay. But careful: `nums` may contain NaN; sorting with NaN weird but single median if k odd maybe okay if NaN? If k even with NaNs ambiguous. no.

What if k==n but `nums` is large and we don't want sort because we could compute selection algorithm? Not standard. Sorting okay.

Could also branch for small k with sorted lists to improve specified? Maybe not.

Would `if k == n` before coordinate compression alter behavior if `nums` is a view object? not.

Let's maybe include `if k == n` after k==1 for efficiency. If k==n==2, returns float average of nums[0]+nums[1] if nums unsorted? Wait median of window size n requires sorted values. If nums=[2,1], mid=1? For k=2 even mid=k>>1=1; mid-1=0, nums[0]+nums[1]/2 = 1.5 independent of order! Sum of two values same, median of two values mean same regardless order? For two values, median = (a+b)/2, order irrelevant. For k=4 even, sum of middle two requires sorted; need sort. For odd, median of single middle after sort; order matters. So branch needs sort all nums if k!=? Could do `if k == n: s=sorted(nums)`. Use sorted. For k odd/even. Good. But if k==n=2, no need but sort okay. If k==n large, sort all. Good.

Could include:
```
if k == n:
    s = sorted(nums)
    if k & 1:
       return [float(s[k >> 1])]
    mid = k >> 1
    return [float((s[mid-1]+s[mid])*0.5)]
```
If k=1 already returned. Good.

This branch may sort list; if set+sort would sort unique and then mapping. Sorting all maybe faster if all distinct but if many duplicates? sorted(nums) length n, set sort unique m maybe smaller; but k==n maybe if many duplicates, set sort faster. But branch sorting all may be slower than set unique if many duplicates? Could be. Maybe not include to avoid complexity. If many duplicates and k=n=200k, set sort m=1 very fast; sorted all n slower. But k=n maybe less common. Fenwick with set+mapping okay. Could avoid branch. Let's not over-optimize.

What about if k close to n, Fenwick initial counting loop k=199999; but sorted set maybe m small. okay. Branch sort all could be bad for duplicates. Leave no branch.

Could choose initial build branch using Fenwick build O(m) after counting; initial count loop k. If k=n and duplicates many, count loop 200k and build m small. okay.

Now, maybe we can use `values = sorted(set(nums))`; if k=n and m small, good. If k=n and m=n, set+dict overhead vs sorted all. Fine.

Now, perhaps `rank = {v: i+1 for ...}` for floats with `-0.0`: okay.

Let's consider if `nums` contains many `float('inf')` duplicates; set collapses. good.

Now, final answer with Fenwick only. Let's include maybe comments for clarity. Ensure code block only. Need no `from bisect`. Good.

Double-check if using `list[float]` without importing `list`? built-in. okay.

Potential PEP 604? no.

Now, final. But before final, maybe think if problem expects median of every contiguous window of size k in order. We output initial then slide. good.

Let's maybe reason about correctness proof? Not in final. Only code.

One more performance consideration: `rank = {v: i + 1 for i, v in enumerate(values)}` if values length 200k; okay. `ids = [rank[x] for x in nums]` uses dict lookups. Could `ids` list be replaced by replacing `nums` with ids to save memory? We still need original nums? After ids built, no need original nums. Could `nums = ids` but type? We use ids. Original list remains until function ends. okay. Could free `rank`? Not necessary. Could `del rank` after ids to reduce memory before slides. Maybe good for memory but not speed. Add `del rank`? Not needed but could. If memory strict, yes. Could also `del values`? Need values for kth; keep. Could `del ids`? no. Could `del rank` after ids. Fine. Add `del rank` maybe. Not harm. Could also `del nums`? But if we assign `ids_ = ids`, original nums still referenced? If we do `nums = None` maybe frees original list (input reference? If caller passed list, setting local `nums` removes local reference but caller still has list; memory of input remains outside anyway if caller holds. In function, if list no longer needed, local ref removed; but caller may hold. Not important.

Could use `array` for ids to reduce memory but no imports? Could `from array import array` but not. list okay.

Now, maybe hidden tests with k=1000 but n=200000 and all random unique: our Fenwick queries use `values[idx]` where values list has floats. Good.

Let's maybe micro-optimise `kth`: Use `while step > 0`? `while step:` okay. `step >>= 1` bit shift. Good.

Could localize `bit_ = bit` inside kth default; no closure lookup. Good. `m` default. `values` default. `top_step` default. Good.

Potential if `values` contains int and `bit` local list of int; no issue.

Now, one more check: When building BIT from counts using `for i in range(1, m + 1): j = i + (i & -i); if j <= m: bit[j] += bit[i]`, this assumes `bit` 1-indexed and initial values at `bit[i]` are frequencies. After build, `bit` values are Fenwick partial sums. Good. But if we later perform point updates `while i <= m: bit[i] += delta; i += i & -i`, this works on Fenwick tree. Good.

Potential issue: If `m` is large and `top_step` is high power. For BIT kth, the tree array values are Fenwick partial sums. The binary lifting algorithm works with Fenwick tree if tree values are stored. Good.

Let's maybe test query on a BIT built from counts via propagation with non-power m. Example m=5 counts at indices [0,0,1,0,1]? Build: initial [0,0,0,1,0,1]; i1 j2 bit2+=0; i2 j4 bit4+=0; i3 j4 bit4+=1 =>1; i4 j8 skip; i5 j6 skip. Fenwick bit: [0,0,0,1,1,1]? For index5 count1, Fenwick tree for i5 should bit5=1, tree4 sum1-4=1. good. kth target1: top=4. step4 nxt4 bit4=1<1 false; step2 nxt2 bit2=0<1 true idx2 target1; step1 nxt3 bit3=1<1 false; return values[2] (idx zero=2) index3 correct. target2: step4 bit4=1<2 true idx4 target1; step2 nxt6 skip; step1 nxt5 bit5=1<1 false; return values[4] index5 correct. Good.

Now, if BIT tree total count k but tree nodes not directly prefix? Binary lifting algorithm using tree array works with Fenwick internal. Good.

Potential issue: Fenwick tree built via propagation from freq in-place may require iterating `i` from 1 to m and adding tree[i] to parent j. This builds standard BIT if `tree[i]` initially freq. Yes. It uses already accumulated tree[i] from earlier children. Standard.

Now, code final. Should we include type hints for `kth`? no to avoid `list[int]` issues. Good.

One thought: Since function signature uses `list[float]`, in Python 3.11 `list` is built-in generic. okay.

Now final answer. Ensure no additional text.```python
...```
