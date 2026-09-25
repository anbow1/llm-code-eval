We need answer with Python code block only. Need solve sliding_median efficient. We need think thoroughly. Need produce final only code.

Problem: sliding_median(nums: list[float], k: int) -> list[float] returns median of every contiguous window size k, in order. Even k mean of two middle values. Raise ValueError if k<1 or k>len(nums). Efficient n=200k k=1000 under 2s normal PC Python 3.11 stdlib only.

Need design efficient sliding median. Standard two heaps with lazy deletion. Need handle floats, duplicates. Complexity O(n log k). Python can handle 200k log 1000 ~ 2M operations, should be okay if optimized. Need be careful memory/time.

Alternative: Since k=1000, could use sorted list with bisect insort/del O(k) per slide => 200M operations maybe too slow. Two heaps better.

Implement max-heap for lower half, min-heap for upper half. For median: if k odd, median = -low[0]; if even, (-low[0] + high[0])/2. Need maintain sizes: low size = (k+1)//2? Typically low has ceil(k/2), high floor(k/2). Then median low[0] for odd? For k=3, low size 2, median is max of low. For even k=4, low size 2, high size 2, median mean max low min high.

Lazy deletion: Need delete outgoing value from either heap. Since we don't know which heap it belongs? Could maintain counts dictionary of pending deletions in low/high. But value can appear in both heaps? If value duplicated, deletion of an occurrence from appropriate heap. We can track by value? Usually use two heaps and two dicts for delayed removal: add to appropriate heap based on sizes, when removing outgoing x, if x <= low[0] delete from low else high? Is this always valid? There is property: if x belongs to lower half? Not necessarily if duplicates? Let's examine. We maintain low contains smaller half, high contains larger half. Outgoing x is in window; it must be in either low or high (or both if equal to boundary?). If x <= max(low), we can decrement low removal; else high. But if x equals max(low) and actual occurrence was in high? With duplicates, if x == low[0], could be in high too. Deleting from low may be okay? Need ensure heap counts consistent. Because all values <= boundary in low, > boundary in high, equal can be split. Removing an x equal to boundary from either half preserves multiset? We need maintain correct partition after rebalancing. If we decrement low_pending for x, and x is in high actually, then low_pending refers to value not in low? Later cleaning top will remove low top if pending; if low top equals x, removes some x; net multiset counts? Suppose low has no x but pending_low[x]++ erroneously, then clean_low will not find x at top, pending remains; sizes? We also decrement low size? If we maintain explicit size counts independent of heap physical? Let's design robust.

Common approach:
- low maxheap, high minheap.
- remove dictionaries for low and high: to_remove[value]++ for the heap from which we conceptually remove.
- When remove(x): if low and x <= -low[0]: remove_low[x]+=1; low_size-=1 else: remove_high[x]+=1; high_size-=1.
- clean(heap, remove_dict, is_low): while heap and remove_dict[-heap[0] or heap[0]]: pop and decrement.
- rebalance based on low_size/high_size.

Is x <= low[0] safe? If duplicates equal and x is in high but x == low[0], we put in low removal. low may also contain equal x? Not necessarily. Example k=2, low size 1 high size 1. Window [1,2], low [1], high [2]. Remove 1: x<=1 -> low ok. Remove 2: x>1 -> high ok. If window [2,1], after rebalance low [2]? Actually low maxheap should contain smaller half: [1], high [2]. Outgoing 2 high, 1 low. OK.

If window [1,1], low size 1 high size 1, low [1], high [1]. Remove one 1: x <= low[0] -> low removal. But actual removed could be high. But low contains a 1, so decrement low is okay; the remaining 1 could be considered from low or high. Then sizes low 0 high 1. Add new 1: since low smaller, push low? Need rebalance. It will work? Let's simulate: after removal low pending 1, clean low pops 1, low empty size 0, high size 1. Add 1: low size < target? target low ceil? For k=2 target low=1 high=1; push low -1 size 1, then rebalance if low > high+1? low=1 high=1 ok. median (-1 + high 1)/2=1. Good.

If window [1,1,2,2] k=4 low size 2 high 2: low [1,1]? max low=1, high [2,2]. Remove 2: x>1 -> high. Good. Remove 1: x<=1 -> low. Good.

What if outgoing value equals boundary but not present in low? Example low [1,2], high [2,3], boundary 2. k=4. There is a 2 in high, but also 2 in low. If remove one 2, x<=2 -> low. low has a 2, okay. If all 2s are in high and low boundary less? If x == low[0] then by definition low[0]=x, so low has at least one x at top. So safe. If x <= low[0], low has some value >= x? Not guarantee x in low. Example low [3,5], high [6,7]. Remove x=4 (<=5) but 4 is not in low? Can that happen? If partition invariant low all <= high all, but values in low are the smallest half. If window contains 4 and low max 5, low should contain 4? Let's see sorted window [1,2,3,5,6,7]? k=6 low size 3 [1,2,3], max 3, remove 4? 4>3 high. If low max 5, sorted window at least low contains smallest 3 maybe [3,4,5], yes 4 in low. In general if x <= max(low), x is among the lower half? For multiset, low contains the smallest m elements (some tie). If x <= maximum of low, any x with value less than max(low) definitely in low? If duplicates maybe. If there are many values >? Let's prove: low contains m smallest elements. If x <= max(low), there are at most? Suppose low size m. If x not in low, then all m low elements are < x? But max(low)<x contradiction. If max(low)=x and x not in low? max(low)=x means low has x. So x in low. So safe.

But after lazy removals, low top may be stale (deleted value) larger than true boundary? We need clean before comparisons? In remove, low top might be stale if pending deletion at top. We should clean low before using low[0]. But if stale top value is larger, x <= stale top may misclassify. Need clean both? We can clean low and high before operations.

Standard algorithm:
Initialize first k values: for x in nums[:k]: push (or insert) and rebalance? Could add all to heaps using push.
Then loop i from k to n-1:
  remove nums[i-k]
  add nums[i]
  clean, rebalance
  compute median append.

Need define push(x):
  if low and x <= -low[0]: heappush(low, -x); low_size +=1
  else: heappush(high, x); high_size +=1
  rebalance()

rebalance(): target_low = (k+1)//2 (ceil). We want low_size == target_low, high_size == k - target_low. But during sliding, total size maintained k after remove/add. We can adjust:
  clean both.
  if low_size > target_low: move low to high: val = -heappop(low); heappush(high, val); low_size--; high_size++ (but val may be stale? clean before pop; but top may still pending not at top? clean removes pending top. If pending not top, moving top okay.)
  elif low_size < target_low: move high to low.
  else maybe ensure boundary? If after moves, if low and high and -low[0] > high[0], swap top? But with push based on top and moving, should maintain. However lazy deletions could violate? Need maybe rebalance order plus order invariant.

Alternative simpler: maintain target low size. In push, choose heap based on x <= -low[0] if low nonempty; but if low empty push low? Then rebalance sizes. But if order invariant violated due to stale tops, need clean and maybe swap.

Need optimize for 200k. Function call overhead maybe okay. But we can inline loops? Need write clear but efficient.

Could implement using two heaps and dictionaries local variables for speed. Use heapq.heappush/heappop local. Use list for results preallocate? n-k+1. Use append maybe fine. Use local variables.

Need consider floats and -x. If x = -0.0? Negating okay. NaN? Not specified; assume normal floats. For median return float. If values int? type list[float] but can be int; return floats. For odd median should return float? It says return floats. So cast float? If median is int, maybe return float(median). For even mean gives float. For odd if -low[0] is float? If input ints, -low[0] int; requirement return floats. We can convert to float: out.append(float(med)). But if values huge? float conversion okay maybe. But if input list[float], already float. Could do if k % 2: med = float(-low[0]) else med = (float(-low[0]) + float(high[0]))/2. For performance, maybe not necessary but satisfy. If input Decimal? type float. Use float.

Potential issue: Python heaps with negative floats: -x for x = inf? okay. NaN ordering weird, ignore.

Need ValueError if k<1 or k>len(nums). If nums empty and k=0? k<1 raises. If k>len raises. If k=1 returns list of each as float. Could special-case k==1 for speed and avoid heap. Return [float(x) for x in nums]? But if n=200k okay. For k==1, median each. If k == len(nums), only one median; could compute sorted(nums)[k//2...] O(n log n) maybe okay? But heap init O(k) if k=n up to 200k log? Actually building heap by push O(k log k). Could use sorted for one window? But general. Need efficient. For k=1000 no problem.

Could initialize heaps more efficiently: take first k, maybe split sorted? But O(k log k) with k=1000 fine. For k=200k (if n=200k, k=200k) one median: sorted O(n log n) maybe 200k log, maybe okay under 2s? But push 200k log 200k ~ 3.6M heap ops, also okay maybe. But if k large, target low large. We can initialize by building two heaps from first k? We can just push k items, O(k log k). n=200k, if k=200k only 200k pushes, okay. But under 2s? Python 200k heap pushes ~0.1s? fine.

Need correctness with lazy deletion details.

Let's design robust classless function.

Pseudo:

import heapq

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    if k == 1:
        return [float(x) for x in nums]
    low = [] # max heap via negatives
    high = []
    remove_low = {}
    remove_high = {}
    low_size = 0
    high_size = 0
    target_low = (k + 1) // 2

    def clean_low():
       nonlocal low_size
       while low:
          v = -low[0]
          cnt = remove_low.get(v, 0)
          if cnt:
             if cnt == 1: del remove_low[v]
             else: remove_low[v] = cnt-1
             heapq.heappop(low)
             low_size -= 1
          else: break
    ...

But nested functions with nonlocal have overhead called many times. Could inline cleaning in loop maybe.

Need know sizes: If we decrement sizes when scheduling removal, and clean pops also decrement? Avoid double decrement. Two approaches:
1. low_size represents logical size including pending deletions? Or physical size? Let's define logical size after removals but before cleaning. When schedule deletion, low_size -=1. Heap physical still has element. When clean pops, we do NOT decrement low_size? But if low_size already logical, clean only removes physical stale but logical size unchanged? Let's see.

Option A: sizes track logical window size (should be k after remove/add, target). Heap physical sizes may be larger due to stale. When adding, logical size +=1 and physical push. When removing, logical size -=1 and pending dict. Clean only removes physical stale and maybe we need not change logical size (already decremented). But if we don't change size in clean, then physical vs logical mismatch but sizes used for rebalancing are logical. When moving between heaps, we pop physical from one and push to other, logical sizes change? Need adjust logical sizes. But if pop stale in clean, logical size remains same as window size; physical heap shrinks. However if low_size is logical, and low heap physical top stale, clean pops but low_size unchanged; but target rebalancing uses logical low_size. Is that okay? Suppose low logical size 1 (one pending deletion), physical low size 1. We schedule removal -> low_size 0, pending. Clean pops, low_size 0, physical 0. Good. If pending not top, low_size logical maybe 1, physical 2 (one stale not top). Rebalance sees low_size 1. But physical top is valid? maybe. If we need move top from low to high because low_size > target? low_size logical too high, but physical top may be stale not top? If top valid? If stale not top, top valid. Moving top reduces low logical and increases high logical. But what about stale in low later? fine.

Option B: sizes track physical heap sizes? Then when scheduling deletion, don't change size; when clean pops, decrement size. Rebalance based on physical sizes. But during removal before clean, physical sizes too large. Need clean before rebalance. Could be simpler: schedule deletion in dict, then clean both, sizes physical. Add push increments size. Clean pops decrement size. Rebalance based on sizes. This is typical. Need ensure after remove+add, total physical size = k plus stale? Wait if we clean after scheduling and after add, physical sizes equal logical k because all pending at top cleaned? Pending not at top remain physical, so physical size > logical? Actually if pending not at top, physical heap still includes stale element, so physical size > logical. If sizes track physical, they include stale, so target rebalancing wrong. Need clean all stale? We can only clean top. Stale not top remains; physical size includes it, logical less. If using physical sizes, must account for pending count? Could define sizes as logical (k minus removed plus added) independent of physical. Then no issue.

Thus use logical sizes. Clean doesn't change logical sizes, but when moving top, we need be careful if top is stale? clean before moving so top valid (no pending at top). But there may be stale not top; moving top changes logical membership: we are moving a valid value from low to high. However if low logical size includes stale elements? Logical size counts all elements in window assigned to low, including stale pending deletions? We schedule deletion by low_size -=1, so pending stale no longer counted logically. Thus logical size excludes stale. But if stale not top, it is in heap physical but not logical. Moving top valid changes logical sizes: low_size-- high_size++. That's correct. However what if top is stale but pending count for top value is >0? clean would remove all top pending. If there are multiple same values, pending may cover only some, clean removes that many top instances. Good.

But when adding, choose heap based on low[0]. If low logical size may be 0 but physical low has stale? Clean before add? We can clean low after scheduling removal before using low[0]. If low_size==0 but physical low not empty due to stale not top? Is that possible? If logical low size 0, all low elements are scheduled for deletion. But some stale may not be top; clean only pops top until no pending at top. If low logical 0, eventually all physical low elements should be pending, but if stale not top and top valid? Contradiction? If logical 0, no valid elements in low, so every physical element in low is pending deletion. Then top must be pending (unless heap empty) because all values pending? But if values distinct and top not pending while other pending, top would be valid, logical >0. So clean will empty low. Good.

Need ensure logical sizes nonnegative. When remove x, classify using low top after cleaning. But what if low is empty? Then remove from high. If high empty? not possible if total k>0 and x in window; but during initialization? removal only after full window.

Implementation with logical sizes:

Initialize:
 for x in nums[:k]:
   if low and x <= -low[0]: heappush(low, -x); low_size +=1
   else: heappush(high, x); high_size +=1
   # rebalance after each? Could build then rebalance? If we just push based on current low top, might maintain. But easier: push all into low? Then sort? Let's think.

Simpler initialization: Put first k into low? We can split sorted first k: arr = sorted(nums[:k]); mid = (k-1)//2? For target_low = (k+1)//2. low should contain smallest target_low. high rest. We can build heaps from those lists O(k). This is efficient and avoids rebalance. For even k=4 target_low=2, low two smallest, high two largest. For odd k=3 target_low=2, low two smallest, high one largest. Median low max. Use:
   arr = sorted(nums[:k])
   mid = target_low - 1? low = arr[:target_low], high = arr[target_low:]
   low = [-x for x in low]; heapq.heapify(low); high = high; heapq.heapify(high)
   low_size = target_low; high_size = k-target_low
This is O(k log k) sorting. For k=1000 trivial. For k=200k sorting 200k maybe okay. But if n=200k k=1000, sorting 1000 trivial. If k=n=200k, sorting 200k maybe maybe 0.05s? Python sorted 200k floats ~0.05-0.1s, okay. But heap init by pushes also okay. Sorting may be simpler and ensures invariant. But if n large k moderate, sorting k each only once. Good.

Could we use sorted for k large; if k=200_000, sorted 200k under 2s? yes likely. But maybe memory okay.

Then slide for i in range(k, n):
  outgoing = nums[i-k]
  incoming = nums[i]
  # remove outgoing
  # clean low and high before comparing? Need clean low top to classify. Could clean both.
  # define clean as inline while loops using local dict.

But logical sizes: When scheduling removal, low_size/high_size decrement. Need clean before classification to know true max low. If low top stale, clean_low. If low empty after clean, remove from high. Else if outgoing <= -low[0]: remove_low[outgoing] = ...; low_size -=1 else remove_high[outgoing]... high_size -=1.
  # add incoming
  # choose heap based on current low top after clean? We cleaned before removal. But after scheduling removal, low_size may changed; top may still valid. Could clean again? If outgoing removed from low and it was at top, pending at top; we might need clean before adding to use correct low top. So after scheduling, clean low/high maybe.
  # push incoming:
     if low_size == 0: push low? Actually if low empty, push low.
     elif high_size == 0? push high? But invariant target maybe. Use if low and -low[0] >= incoming? But need clean low. If low_size>0 and incoming <= -low[0]: push low else high. If low empty push low. If high empty? If low not empty but high empty, push high if incoming > lowmax, else low.
     low_size/high_size increment.
  # rebalance to target_low, cleaning before moves.
  # compute median after rebalancing and cleaning top.

Need clean functions that use logical sizes? As said clean does not change low_size. But when moving, we pop top valid and push to other; adjust sizes. But what if there are pending deletions in the source heap not at top; moving top doesn't remove them. Logical size of source excludes pending, but physical has stale. When we pop top valid, physical source decreases by 1, logical decreases by 1. Good. Push to dest physical increases by 1, logical increases by 1. Pending counts remain in source? Wait if stale not top in low, and we move top to high, the stale remains in low. low logical size decreased, but physical low still has stale. Later clean will remove stale but not change logical. Good.

But if we move from low to high, and low has pending deletion for the top? clean before move should remove top pending. Good.

Potential issue: When cleaning, we pop stale but do not adjust logical size. However physical heap size may become less than logical? Is that possible? Logical size counts valid elements assigned to heap, but some valid elements might have been popped inadvertently? We only pop when pending dict indicates that value has been scheduled for deletion. If there are duplicates, pending count equals number of occurrences to delete. Popping that many top occurrences removes exactly stale occurrences. It won't remove valid occurrences beyond pending. So physical size - pending_total = logical? Let's define physical = logical + pending_total_in_heap (not all pending may be in that heap? pending dict per heap). Clean pops some pending, reducing physical and pending_total; logical unchanged. So physical remains >= logical. Good.

When moving top, if top valid, pending count not include it. physical source--, logical source--. Destination physical++, logical++. Pending totals unchanged.

Now rebalancing: target_low fixed. Need while low_size > target_low: move low->high. while low_size < target_low: move high->low. But also need maintain invariant -low[0] <= high[0]. With size target, if push classification correct and moves, should hold. But due to duplicates/stale, might need swap if violation. Let's examine.

Suppose after add, low_size > target, move top low to high. This ensures low size target. But could low max > high min? If moving top low to high, high min becomes min(old high min, moved value). Since moved value was low max, and before move low max <= high min? If invariant held before, after move low max (next) <= moved <= high min, so invariant. If invariant didn't hold before, might. Suppose low max > high min. Size target maybe. Then median wrong. Need ensure invariant after each step.

Push classification: If incoming <= low max, push low else high. Then rebalance sizes by moving top. This standard maintains invariant if before invariant and low/high nonempty.

But with lazy deletion, invariant may be broken if stale top? clean removes stale top. Stale not top doesn't affect tops. So invariant among tops holds if it held before and operations maintain. Initialization holds. Removal: classify outgoing using low max. If outgoing <= low max, schedule low deletion. This may remove an element from low (logical). Could invariant break? Removing element from low can only lower or keep low max, so low max <= high min remains. Removing from high can raise high min, so low max <= high min remains. If duplicates boundary, okay. Then add with classification and rebalance maintains. So invariant should hold.

But when low_size becomes 0 or high_size 0, comparisons need handle. For k even target_low >0 and high >0 if k>=2. For k=1 special. For k>=2, both sizes target positive? If k=2 target_low=1 high=1. During operations before rebalancing, sizes may be 0 temporarily after removal. Add can make. Need handle low empty in push.

Detailed operations with cleaning:

We can define local helper clean_low and clean_high maybe as inner functions. But overhead? 200k * 2 calls = 400k, each while usually zero iterations. Python function call overhead ~0.1us? Actually ~100ns? More like 80ns? 400k ~0.04s, okay. But inner nonlocal? Could be okay. But to maximize speed, inline? Code length. We can write helper nested using local variables? It will access nonlocal low, high, dicts, no size change. Function call overhead maybe acceptable under 2s. But 200k, 4 cleans each iteration maybe 800k calls; still maybe ~0.1-0.2s. Could be okay. But nested functions with closure slower. We can implement cleaning as while loops directly in loop to be safe, but repeated code.

Alternative: use a class? No.

We need be careful with dictionary operations for deletion. Use setdefault? For speed:
    d = remove_low
    cnt = d.get(x)
    if cnt is None: d[x]=1
    else: d[x]=cnt+1
Since counts can be None? values counts ints. Use `remove_low[x] = remove_low.get(x, 0) + 1`. Simple.

Clean loop:
    while low:
        v = -low[0]
        c = remove_low.get(v)
        if c:
            heapq.heappop(low)
            if c == 1:
                del remove_low[v]
            else:
                remove_low[v] = c - 1
        else:
            break

But if v is NaN, get works? okay.

Need local heappop/push. Use `from heapq import heappush, heappop, heapify`. But import inside function? Could import at top. Code block complete. Use `import heapq` or `from heapq import ...`.

Potential performance problem: Using sorted(nums[:k]) creates slice copy. For k=1000 okay. For k=200k memory okay. Could use `arr = nums[:k]`.

But if nums is not list but iterable? Type list. okay.

Return list of floats. Preallocate out = [0.0]*(n-k+1) and assign by index for speed. Or append. Prealloc maybe faster. For k==1 return list comprehension.

Let's test algorithm manually with examples.

Example nums [1,3,-1,-3,5,3], k=3. Sorted first 3 [-1,1,3], target_low=2, low [-3? Wait low values smallest: [-1,1]; max heap negatives [-1? Actually -(-1)=1? Let's use low = [-x for x in arr[:2]] => [1, -1]? heap max top -low[0]? low[0] is smallest negative? For arr low [-1,1], negatives [1,-1], heapify -> [-1,1]? top -1 => -top=1. good. high [3]. median 1.
Slide i=3 outgoing 1, incoming -3.
clean low top 1 no pending, high 3.
outgoing 1 <= lowmax 1 -> remove_low[1]=1; low_size=1.
add -3: clean? low top still 1 pending? Actually low top value 1 has pending. Need clean before add to use correct lowmax. If not, -3 <= 1 push low. If push low okay? low logical size becomes 2. But low top pending 1. Rebalance target_low=2, low_size=2 high=1. Clean median: clean low pops 1, low_size unchanged 2? Wait logical low_size was 2 after add. But physical low after pop: contains -(-3)=3 and maybe other? Let's simulate physical: initial low physical values [-1,1] logical 2. remove 1: logical low 1, pending 1. add -3 to low: physical low [-1,1,3] logical 2, pending 1. clean low: top value 1 pending -> pop. Now physical low [-3? values -1,3? top? max is -1? Actually low values -1 and -3, max -1. logical low should be 2? But window [-1,-3,3], low should be two smallest [-3,-1], logical 2. physical low after popping 1 has values -1,-3, logical 2. Good. low_size variable remained 2. median -low[0] = -(-1)? low top negative of max: low[0] = -1? value max -1, -low[0]=1? Wait median for odd k=3 should 1? Window [-1,-3,3] sorted [-3,-1,3], median -1? Actually median -1. Let's recalc: -low[0] where low heap stores negatives. If low values [-3,-1], negatives [3,1], heap top 1, -low[0] = -1. Correct. In physical after popping 1 (which represented value 1), low heap has [1,3]? top 1 -> -1. Good.

But note low_size remained 2 though we removed one logical and added one; okay.

Next remove -3 etc.

Potential bug: In remove classification, if low top is stale but we didn't clean, misclassify. We'll clean before classification. But after scheduling removal, before adding, should clean low to get correct lowmax. If scheduled removal was from high, low unaffected. If from low and top stale, clean. So do clean_low() and clean_high() after scheduling before push.

But what if after scheduling removal, low_size < target and high has valid top. Push classification if low empty or x <= lowmax. If low top stale not cleaned, misclassify. So clean.

Rebalance after add: Need clean before moving. If low_size > target, top low might be stale? We cleaned before add, but add could push a value to low that is smaller? top remains old valid. If remove from low scheduled but top not stale, low top may still valid. If add to high, low top unchanged. But pending not top could exist; top valid. If low_size > target, moving top valid. If top somehow stale? Could be if add to low with value larger than stale top? If stale top pending not removed? We cleaned before add, so top not pending. Add may push negative value; if new value becomes top? Suppose incoming <= lowmax and push low; new value may be > old lowmax? If incoming <= old lowmax, not >. If low empty push. So top not stale. If remove from high, no new low top. So clean before move maybe not necessary but safe.

When moving high->low, need clean high top. Could be stale. We cleaned before add; but add could push to high smaller than stale top? If incoming > lowmax, push high. If stale high top pending not at top? top valid. If incoming smaller than top? push high might make new top? It could be smaller than current top, and valid. So top valid. But if there was pending at high top before add, cleaned. So okay. Still clean before move to be safe.

Need be careful: clean function does not update logical sizes. If we clean before moving and pop stale, physical heap may be empty while logical size >0? Could that happen if logical size >0 but all physical elements pending? If logical >0, there is at least one valid element, so not all pending. So not empty. But due to classification errors maybe. We'll trust.

Let's test edge cases.

k=1 special.
k=2. nums [1,2,3]. target_low=1.
init sorted [1,2], low [1], high [2], median 1.5.
slide remove 1: clean; 1<=1 remove_low[1], low_size=0. add 3: clean low empties? pending top 1 -> pop, low_size logical 0. push: low_size==0? we can if low: ... else push low? If low empty, push low? But target low=1, push low with 3. low_size=1. rebalance low_size=1 target=1. But high has 2, low 3 violates invariant (3>2). Need swap! Ah! Important. When low was empty after removal, we added new value to low blindly, but it may belong to high. Standard push should compare with high if low empty? Since low empty, if we push low, then rebalance size only, no order fix. Need handle order invariant when low empty or high empty.

Better push rule: If low is nonempty and x <= -low[0] -> low else high. If low empty, push low? But then if high not empty and x > high[0], violation. We could after rebalancing enforce order by swapping tops if violation. Or push to high when low empty and high not empty? Let's think. If low empty after removal, logical low size 0. The new value should go to low only if it is among smallest target. But high contains old high elements. For k=2, low empty, high has one old element. If incoming 3 > high 2, low should eventually contain high's 2, high contain 3. If we push low 3, then rebalance sizes okay but order violation; we can swap tops: low 3, high 2 -> swap to low 2, high 3. That fixes. If incoming 1.5 <= high 2, pushing low 1.5 yields low 1.5 high 2 invariant. If we instead push high when low empty, sizes low 0 high 2, rebalance move high top (1.5?) to low, also works. Simpler: push based on low if low nonempty, else push low (or high) and then enforce order after rebalancing. Need order fix.

Standard two-heap with lazy deletion often rebalance and if low and high and -low[0] > high[0]: swap tops. But if we always maintain sizes target, one swap enough? Let's examine. If violation, swap max low and min high. After swap, low max becomes old high min (maybe), high min becomes old low max (maybe). Should restore if heaps otherwise partition? Usually yes if only tops violate. Could there be deeper violation? Since all other elements in low <= old low max, and all in high >= old high min? If old low max > old high min, after swap, low max <= old low max? It could be old high min or another low element. Other low elements <= old low max but could be > new high min? New high min is min(old high other, old low max). Need ensure low elements <= high elements. Suppose low values [10, 9], high [5, 6] violation. Swap tops 10 and 5 -> low [9,5], high [10,6]. New low max 9, new high min 6, still violation! But can such state arise from our operations? Maybe if large violation. But standard heap partition invariant should only have tops violation? Actually if low contains elements all supposed lower half and high upper half, but after pushing to wrong heap and not rebalancing by value, could have multiple. Example above could arise if low empty? No low had two. But with push and size rebalancing, violation likely only at boundary? Let's reason. Before operation invariant. Removal preserves. Adding: if x > low max, push high; low unchanged, high min may become x? If x < high min? If x > low max but x < high min, high min becomes x, invariant low max <= x. If x >= high min, high min unchanged, invariant. If x <= low max, push low; low max may become x if x > old low max? But x <= old low max, so low max unchanged, invariant. So if we always push to correct side based on current low max, invariant holds. The only issue is when low empty (no low max) or low stale not cleaned. If low empty, push low arbitrary can create violation. But we can handle low empty by pushing to high? Let's see: If low empty, logical low 0. We need eventually low target maybe >0. If we push to high, then rebalance moves min high to low. That yields correct. If high also empty (k=1 special or transient? For k>=2 after removal total k-1, if low empty high size k-1). So push high works. If high empty and low not empty, push based on low. So rule: if low is not empty and x <= -low[0] push low else push high. If low empty, push high (if high nonempty) else low. But if low empty and high empty (k=1) not in k>=2. For k=2 after removal low empty high nonempty. Push high. Then low_size=0, high_size=2, rebalance moves high top to low. Good.

What if low nonempty but high empty and x <= low max push low; if x > low max push high. Good.

However with logical sizes, low may have physical stale but logical size 0. We clean low; if low empty after clean, push high. Good.

What if low nonempty logical size >0 but low top stale? clean.

Let's test k=2 [1,2,3]: init low 1 high 2. remove 1: low_size 0, pending. clean low empties. add 3: low empty -> push high (high [2,3], high_size 2). rebalance target_low=1: low_size<1 move high top 2 to low. low [2], high [3]. median 2.5. good.

What if incoming smaller: [3,2,1] k=2. init [2,3] low 2 high 3 median2.5. remove 3? slide i=2 outgoing nums[0]=3, incoming 1. remove 3: high_size 1->0 pending high 3. clean high empties. add 1: low nonempty max 2, 1<=2 push low low_size 2 high 0. rebalance low>1 move low top 2 to high. low [1], high [2]. median1.5. good.

Need clean after removal before add: In [3,2,1], remove 3 from high; high top 3 pending, clean high empties. Good.

Now, what if low_size < target and high top stale? Clean high before move. Good.

Let's define rebalance with order fix maybe.

Pseudo:
target_low = (k+1)//2
low_size = target_low; high_size = k - target_low

def clean_low(): ... no size change
def clean_high(): ...

for idx in range(k, n):
    out = nums[idx-k]
    # clean low and high? Need clean before classify. Could clean both.
    # But cleaning both every iteration may pop stale. We can clean low only for classify, then maybe high later. But stale high top not used until rebalance/median. We can clean both to be safe.
    while low: ...
    while high: ...
    if low:
        if out <= -low[0]:
            remove_low[out] = remove_low.get(out,0)+1
            low_size -= 1
        else:
            remove_high[out] = remove_high.get(out,0)+1
            high_size -= 1
    else:
        # all in high
        remove_high[out] = remove_high.get(out,0)+1
        high_size -= 1
    # clean after scheduling? Need before push if low top may now stale.
    while low: ...
    while high: ...
    x = nums[idx]
    if low and x <= -low[0]:
        heappush(low, -x); low_size += 1
    else:
        heappush(high, x); high_size += 1
    # rebalance
    # ensure sizes
    while low_size > target_low:
        # clean low before pop
        while low: ... # but if low top stale, pop without changing size; if still low_size > target, continue
        # But if low empty? low_size > target impossible if consistent.
        val = -heappop(low)
        heappush(high, val)
        low_size -= 1; high_size += 1
    while low_size < target_low:
        while high: ...
        val = heappop(high)
        heappush(low, -val)
        low_size += 1; high_size -= 1
    # clean tops again after moves? Moves pop top valid (cleaned), push. But source may have stale not top, dest top maybe? Clean both.
    while low: ...
    while high: ...
    # optional order fix:
    if low and high and -low[0] > high[0]:
        # swap tops
        v1 = -heappop(low)
        v2 = heappop(high)
        heappush(low, -v2)
        heappush(high, v1)
        # sizes unchanged
        # clean? maybe not needed, but can clean.
    # median
    if k & 1:
        out_list[i-k] = float(-low[0])
    else:
        out_list[i-k] = (float(-low[0]) + float(high[0])) / 2.0

But cleaning loops repeated. Could define inline helper to avoid code bloat. But if helper doesn't change sizes, can call. Need maybe performance.

Let's benchmark mentally: n=200k, k=1000. For each of ~199k slides:
- clean low/high twice? If helper function, 4 calls; each usually checks while low and get top. That's 400k dict gets, fine.
- classification dict get/set.
- push.
- rebalance: sizes may often balanced; while conditions false. But sometimes one move per slide? Adding/removing can cause at most one move? Since sizes change by -1 and +1, difference from target at most 1? Let's analyze: Before balanced low_size=target. Remove from low -> target-1; add to low -> target; no move. Remove low, add high -> target-1 low, high+1; need move high->low (1). Remove high, add low -> target+1; move low->high. Remove high, add high -> balanced. So at most one move. But if low empty push high etc maybe one move. So while loops at most one iteration. Good.
- clean after moves maybe 2 calls.
Total maybe 8 heap top checks + dict gets per slide. 200k*8=1.6M, fine.

But nested helper function call overhead 8*200k=1.6M calls, maybe ~0.1-0.2s? Actually Python function call ~100 ns? No, ~80-150 ns in C? Python function call maybe 100-200 ns? Wait Python 3.11 function call ~80 ns? Maybe 0.08 micro? Actually simple function call ~50 ns? Let's not rely. 1.6M calls could be ~0.1-0.3s. Fine under 2s. But closure variable access slower. Could inline to be safe but code lengthy. We can write small local functions using local bindings? E.g.

def _clean_low(low, remove_low, heappop): ... but passing args each call overhead. Nested closure maybe okay.

Could combine cleaning into one function `clean(low, rem)` generic? Then call with two args, more overhead. Better separate or inline.

Potential problem: When clean pops stale, it does not change logical sizes. But if we call clean inside rebalance while low_size > target, and low top stale, clean pops, low_size unchanged, then loop checks condition again, maybe still > target, then pops valid. Good. But if clean pops many stale, physical low may be empty while low_size > target? Should not. But if inconsistent, heappop empty error. We can guard.

Need consider deletion dictionary counts with floats as keys. If x is -0.0 and 0.0, dictionary treats equal? -0.0 == 0.0 and hash same, okay. Negative heap: -(-0.0) = 0.0? okay.

What about integer vs float keys: 1 and 1.0 equal, okay.

Now, can we do even more efficient using two sorted deques? Since k=1000 maybe sorted list O(k) could be okay? 200k*1000 = 200M, likely too slow in Python. Heap best.

But maybe two heaps lazy with dictionary for n=200k, k=1000 passes. Need ensure no hidden O(k) memory growth due to pending not top. In worst case, stale not top can accumulate? Each outgoing scheduled in one heap; if not at top, stays until it reaches top. Number of stale elements can be O(n) in worst case? For sliding window, could stale values not top accumulate in heaps beyond k? Let's analyze. We never delete non-top, so heaps physical size can grow beyond k. In worst-case, if removed elements are always small and in low but not top? Wait top of max heap is largest in low. If we remove small values from low, they sit at bottom and accumulate until maybe become top after larger values removed. Over n slides, physical heaps could grow O(n) if stale never top. That memory maybe 200k extra, okay (n=200k). But time: cleaning only when top stale; total pops O(pushes) O(n). So O(n log n) overall. Memory O(n) worst-case, still okay (200k floats). But if n larger? Problem n=200k. Fine.

However logical sizes target but physical can grow. When moving top, we might move valid top while stale accumulate. Could physical size become much larger than k, but still <= n. Fine.

But need ensure `low` and `high` heaps don't contain too many stale causing top stale clean loops many at once; total O(n). Good.

Now, correctness of classification with logical sizes and pending not top. We clean tops before classification. Suppose low top valid. If out <= low max, schedule low. We argued out in low. But what if out is equal to low max but all occurrences of out in window are in high, and low max out comes from a value that is not out? impossible value equality. If low max = out, low contains an out. So okay.

But what if out < low max but out is not in low due to previous misclassification? Invariant ensures partition by value, but with logical sizes and stale, could an element smaller than low max be in high? Let's see. We maintain by push and moves. It should not. But duplicates and lazy deletion? Suppose value moved? No.

Let's test random small by mental or maybe we can't run. Need be confident.

Potential issue: When removing from low by value, if there are stale pending in low for same value, and we schedule another deletion, count increases. Cleaning will pop that many top occurrences. But if some of those occurrences are not actually in low (because previous misclass)? Not.

Alternative approach: use `heapq` with index lazy? Not for values.

Let's think about median for even k: low target ceil(k/2). For k=4 target_low=2, high 2. median mean low max and high min. Good.

Now, order fix. Do we need it? With push rule low empty -> high, and rebalancing moving top, invariant should hold. But let's test more edge cases.

Case k=4. target_low=2.
Window [1,2,3,4], low [1,2], high [3,4]. Remove 1 (low), add 5.
After remove low_size=1, pending low 1. clean low: top 2? low values [1,2], max 2; pending 1 not top, so clean does nothing. low_size logical 1, physical 2 (1 stale,2 valid). add 5: low max 2, 5>2 push high. high_size=3, low_size=1. rebalance low<2: clean high top 3 valid, pop 3 push low. low_size=2 high=2. Now low physical contains stale 1, valid 2, and 3. Low max 3. high [4,5] min 4. invariant 3<=4. But low logical elements should be [2,3], stale 1 pending. Good. Median (3+4)/2. Correct window [2,3,4,5].

Next remove 2 (outgoing nums[1]=2). clean low top 3 no pending. out=2 <=3 schedule low pending 2, low_size=1. clean low: top 3 valid, pending 2 not top. add 6: low max 3, 6>3 push high. rebalance low<2: high top 4 valid? high [4,5,6], top4. move 4 to low. low_size=2 high=2. low physical stale 1,2, valid3,4 max4; high 5,6 min5. window [3,4,5,6]. Good.

Next remove 3. clean low top4 valid. out3 <=4 schedule low. clean top4 no pending? pending 3 not top. add 7 high. rebalance move high 5 to low. low physical stale 1,2,3 valid4,5 max5; high 6,7. Good.

Stale small accumulate. Eventually when window moves so stale become top, clean removes. E.g. remove 4, out4 <= low max5 schedule low, clean low top5? pending 4 not top? low physical has stale 1,2,3, valid4,5. top5. add 8 high, move 6 to low. low logical [5,6], physical stale1,2,3,4 valid5,6. Continue. When remove 5: top6, pending5 not top. Move 7. Stale includes 5. Low physical stale1,2,3,4,5 valid6,7. Eventually remove 6: low top7, pending6 not top? Wait logical low before remove should [6,7]? max7. out6 <=7 schedule low. pending6. clean top7 no. add9 high, move8 to low. logical [7,8], physical stale1-6, valid7,8. Remove7: top8, pending7 not top. Move9. Now logical [8,9], physical stale1-7 valid8,9. Remove8: top9, pending8 not top. Move10. logical [9,10], physical stale1-8 valid9,10. Remove9: top10, pending9 not top. Move11. Now low logical [10,11], physical stale1-9 valid10,11. Remove10: top11, pending10 not top? But low max 11, out10, schedule low. Now logical low 1? Actually before remove low_size=2. After remove low_size=1, pending10. clean top11 no. Add maybe 12 high, rebalance move 11? high has 11? Wait window before remove [9,10,11,12]? Let's track: after previous add 11, window [9,10,11,12], low [9,10]? Hmm my simulation off. Let's not. Eventually stale values become top when valid larger removed. Cleaning then pops multiple, low_size unchanged. Could low_size become > physical? No.

But consider when stale top and low_size logical target, clean pops stale without changing low_size, physical decreases. If physical low becomes less than low_size? That would mean we popped valid? But pending ensures stale. If multiple stale with same value as some valid? Pending count only deletes scheduled occurrences. If top value has pending count 1 and there are two top equal values, one stale one valid. Cleaning pops one, leaving valid. Good. low_size logical includes valid but not stale. physical after pop = logical + remaining pending. okay.

Now, when moving top from low to high, if low has stale not top, top valid. But what if top value has pending count 0 but is actually stale due to previous classification error? no.

Potential issue with logical sizes not updated on clean: Suppose clean pops stale from low, but then rebalance while low_size < target moves from high to low. physical low may be small, but okay. However the stale count remains in remove_low dict? clean deleted count. Good.

Now, memory of remove dicts: Keys for stale not top remain until cleaned. In worst-case O(n) distinct, okay 200k. But dictionary lookups for floats. fine.

Could we avoid two dicts by using one dict of counts and classification? Need two because value may be scheduled in both heaps? If equal boundary, possible. Two dicts safer.

Potential optimization: For k small (1000), we could use `heapq` and `collections.defaultdict`? Standard dict get faster.

Now, let's think of alternative: Use two `SortedList` not stdlib. no.

Need final code only. But before final, need ensure no input/print/tests.

Let's refine code for performance and correctness.

Option: Use nested clean functions:

def sliding_median(nums: list[float], k: int) -> list[float]:
    import heapq
    n = len(nums)
    if k < 1 or k > n: raise ValueError(...)
    if k == 1: return [float(x) for x in nums]
    target = (k + 1) // 2
    arr = sorted(nums[:k])
    low = [-x for x in arr[:target]]
    high = list(arr[target:])
    heapq.heapify(low); heapq.heapify(high)
    low_size = target
    high_size = k - target
    del_low = {}
    del_high = {}
    res = [0.0] * (n - k + 1)
    # first median
    if k & 1: res[0] = float(-low[0])
    else: res[0] = (float(-low[0]) + float(high[0])) / 2.0

    heappush = heapq.heappush; heappop = heapq.heappop

    def clean_low():
        # no logical size change
        while low:
            v = -low[0]
            c = del_low.get(v)
            if c:
                if c == 1:
                    del del_low[v]
                else:
                    del_low[v] = c - 1
                heappop(low)
            else:
                break
    def clean_high():
        while high:
            v = high[0]
            c = del_high.get(v)
            if c:
                if c == 1:
                    del del_high[v]
                else:
                    del_high[v] = c - 1
                heappop(high)
            else:
                break

    for i in range(k, n):
        out = nums[i-k]
        clean_low(); clean_high()
        if low:
            if out <= -low[0]:
                del_low[out] = del_low.get(out, 0) + 1
                low_size -= 1
            else:
                del_high[out] = del_high.get(out, 0) + 1
                high_size -= 1
        else:
            del_high[out] = del_high.get(out, 0) + 1
            high_size -= 1
        clean_low(); clean_high()
        x = nums[i]
        if low and x <= -low[0]:
            heappush(low, -x)
            low_size += 1
        else:
            heappush(high, x)
            high_size += 1
        # rebalance
        while low_size > target:
            clean_low()
            # if low top still stale? clean loop does until no top pending. If low empty? shouldn't
            val = -heappop(low)
            heappush(high, val)
            low_size -= 1
            high_size += 1
        while low_size < target:
            clean_high()
            val = heappop(high)
            heappush(low, -val)
            low_size += 1
            high_size -= 1
        clean_low(); clean_high()
        # optional swap? Let's decide.
        if low and high and -low[0] > high[0]:
            v1 = -heappop(low)
            v2 = heappop(high)
            heappush(low, -v2)
            heappush(high, v1)
            clean_low(); clean_high()
        if k & 1:
            res[i-k] = float(-low[0])
        else:
            res[i-k] = (float(-low[0]) + float(high[0])) / 2.0
    return res

But nested functions reference low_size? clean doesn't. They reference heappop from outer (local). Fine.

However, Python closure variable lookup for low, del_low, heappop inside clean is slightly slower. Could define clean loops inline to avoid. But code with functions simpler. Need performance under 2s. Let's estimate. 199k iterations. Each iteration calls clean_low/high 4 times plus rebalance clean up to 2 plus swap clean 2. Usually 4-6 calls. 1.2M calls. Each call while check and maybe dict get. If function call overhead ~0.2 micro? 0.24s. If ~0.5 micro, 0.6s. Heap ops: at most 1 move per iteration: heappop+heappush ~ log 1000 ~10 comparisons, 200k*2=400k heap ops, maybe 0.2s. Push 200k. Dict ops. Should be under 2s likely.

But nested functions with `heappop` closure maybe. Could improve by binding `low_local = low` etc? Not necessary.

Potential bug: In rebalance while low_size > target, we call clean_low() then heappop(low). But clean_low does not change low_size. If low top is stale, clean pops it. But what if low becomes empty and low_size > target? Then heappop error. Could happen if low_size logical incorrectly >0 while all physical stale and top pending cleaned. But logical >0 means valid elements exist; if all physical stale, inconsistency. Shouldn't. But to be safe, we could while low_size > target and low: ... If low empty, break? But then median may fail. Better not hide bugs. But in production, safe? We can add guard? If guard breaks, results wrong. But no need.

Potential bug: When clean pops stale, it doesn't adjust `low_size`, but the physical heap size decreases. If we later move top from low to high, and low had stale not top, physical low size may be less than low_size + pending? okay. But heappop(low) after clean removes top valid. However what if top valid but there is a pending deletion for same value count >0 not at top? Wait if top value v and del_low.get(v) is nonzero, clean would pop top. If count zero, no pending for v. There could be pending for smaller values. fine.

Now, do we need to update low_size/high_size when clean pops stale? Let's revisit with a concrete scenario where stale not top accumulates and then is popped. Low logical size target 2. Physical low size 5, pending total 3. clean pops 3 stale when they reach top? Suppose top stale value 10 pending, but there are valid 9,8 and stale 7,6. Max heap top 10 (stale). clean pops 10. logical size remains 2, physical 4, pending total 2. But low logical valid elements should be 9,8? Wait if 10 was stale, it was removed from window, logical size already decremented when scheduled. If target 2, logical low contains maybe 9,8. Good. But physical top after popping 10 is 9 valid. fine. We didn't change low_size. Good.

But what if the stale top value is larger than valid elements, and we pop it, low max decreases. This can affect partition: low max maybe still <= high min? Removing from low lowers max, so okay. But high may have smaller? invariant held.

When a stale element is popped from high, high min may increase, invariant still holds (low max <= old high min <= new high min? If removed old high min stale, new high min larger, okay).

Now, optional swap: If invariant should hold, swap rarely. But if low empty push high and rebalance move, no violation. Could swap ever trigger due to floating precision? If -low[0] > high[0] with NaN? ignore. If due to logical size not including stale? Suppose low top stale not cleaned? We clean before median. So no. Could omit swap to save time. But as safety, maybe keep? It adds checks each iteration and potential rare swap. Check is cheap. But if swap triggers in a scenario where deeper violation, one swap may not fix. But if invariant maintained, no trigger. If due to bug, maybe infinite? No. Could leave out to avoid masking and reduce time. But low empty push high + rebalance should fix. Let's test a scenario where push to high when low empty but high top stale? We clean high before add. If high top stale, clean removes. Then push high. Rebalance moves high top (maybe incoming or old valid) to low. Correct.

What if low nonempty but high empty and x > lowmax push high. sizes low target? For k=2 before remove maybe high 0? Example window [1,1] low 1 high1 not high empty. High can become empty after removal before add. If low nonempty and x > lowmax, push high, sizes balanced? k=2 remove high: low_size=1 high=0; add x>low -> high=1 balanced. invariant low <= high. If x<=low -> low=2, rebalance move low top to high. The moved top may be max of old low and x. high gets max, low gets min. invariant. Good.

Thus no swap needed. But maybe due to stale tops not cleaned in classification? We clean. I'd omit swap for speed, or include a one-time assertion? Can't assert maybe disabled? Could include if to be safe. The check `-low[0] > high[0]` each iteration 200k, cheap. If it triggers, one swap. If deeper violation, not enough, but deeper shouldn't. Including it may protect from low empty push? But we already handle. I'd maybe include because standard and cheap. However if it triggers due to NaN, comparison false. okay.

But swap changes sizes? No. It can create stale top? v1/v2 valid tops, push. okay.

Need consider first median when k even high nonempty. For k>=2, high_size = floor(k/2) >=1. For k=1 special. So high[0] exists.

Now, one subtlety: Using `arr = sorted(nums[:k])` and `low = [-x for x in arr[:target]]` for max heap. If x is `float('inf')`, -inf okay. If x is NaN, sorted with NaN weird; ignore.

Now, type hints: `def sliding_median(nums: list[float], k: int) -> list[float]:`. Need Python 3.11. okay.

Could there be memory issue with `arr = sorted(nums[:k])` for k=200_000; arr list of floats references same objects? Slice copies references, sorted new list. low and high new lists. Total maybe 4*200k refs ~6.4MB plus dict, okay.

Potential alternative initialization without sorting: push all first k into low then? Sorting is okay. But if k=200k, sorting 200k floats might be ~0.04s? Actually Python sort 200k ~0.05-0.1. fine.

Now, let's think about time with nested functions and sorting. Should pass.

But let's more rigorously verify lazy deletion with logical sizes. There is a known pitfall: If using logical sizes and not updating on clean, when moving elements, the pending deletion for a value might be in the destination heap after moving? Wait, we move values between heaps, but pending deletion counts are associated with the heap we conceptually removed from. If a value that has pending deletion in low is later moved to high (as valid top?), can that happen? Suppose low has pending deletion for value v (some occurrence stale), and later due to rebalancing we move top from low to high. If top is v but pending count for v >0, clean would remove top pending before moving, so we won't move a pending top. If pending for v not top, top is larger valid u, we move u to high. The stale v remains in low. Later v may become top and be cleaned in low. Good.

What if a value has pending deletion in high, and we move top from high to low. If top value has pending, clean removes. If pending not top, top valid moved. Stale remains in high. Good.

But could an element that was scheduled for deletion in low be moved to high before being cleaned, thus making deletion dict inconsistent? Only top moved, and top cleaned if pending. So no.

What about duplicate values: pending count for v in low, top v with count >0. Clean pops one v, decrement count. If there are multiple v top, and pending count less than number of v occurrences, clean stops when count 0, leaving valid v top. Good. If later we move top v to high (when low_size > target) and there are no pending for v, valid. If pending count for v exists but not at top? If top larger, no. If top v, clean would handle.

Now, classification of outgoing after some stale not top: We use low top valid. Suppose outgoing value equals a stale value not top and also less than low top. We schedule removal in low. It is already pending? Could increase count. Good. If outgoing value is not actually in low? We argued if <= low max, it is in low logically. But with stale not top, low logical elements are some valid values, not all physical. The low max is max valid low. If outgoing <= low max, is it guaranteed in low logical? The low logical multiset contains the smallest target_low values of current window? Does our algorithm maintain that exact partition when stale not top? We maintain by operations. Let's prove invariant: After full iteration (and before slide), logical low contains the smallest target_low elements of the current window, logical high the rest. Initialization true. Slide: remove outgoing. If outgoing <= current low max, it is in low (if equal, at least one in low). Remove it from low logical. The remaining logical low are smallest target_low-1 of window without outgoing? Need check. If outgoing was in low, yes. If outgoing > low max, in high. Remove from high. Then add incoming. If low not empty, compare to low max. If incoming <= low max, add to low; else high. Then rebalance sizes by moving max low to high or min high to low. This is standard maintaining partition. Stale physical doesn't affect logical operations as long as tops valid for comparisons/moves. We clean tops. Stale not top not in logical. So invariant holds.

Thus classification safe.

Now, one more subtlety: When low is empty after removal, we push incoming to high. But the logical low is empty; the smallest target of new window should be obtained by moving min high to low after rebalancing. Since high logical contains all remaining old elements plus incoming. Moving min high to low (possibly multiple? At most one because size difference target-1) yields correct. Good.

When high is empty and low not empty, push based on low max. If incoming > low max, high gets it. If incoming <=, low gets then rebalance moves max low to high. This yields correct. Good.

Now, let's consider k even/odd target. target_low = (k+1)//2. For k=2 target=1. For k=3 target=2. Good.

Median index for res: For i from k to n-1, window start = i-k. Initial start 0. Number windows = n-k+1. res size. For k==1, return list length n.

Potential ValueError message not important.

Now, can we further optimize by not cleaning both heaps before classification? We can clean low only; high stale top not needed until add? For add, if low empty we push high; if low nonempty compare low. Rebalance may need high top if moving high->low or median even. So need clean high before those. Cleaning both at start and after scheduling maybe overkill. But okay.

Let's think about function call overhead and closure. We can implement clean as inline while loops using a local helper? Could write a macro-like local function with default arguments to bind locals:

def clean_low(low=low, del_low=del_low, heappop=heappop):
    while low:
       v = -low[0]
       c = del_low.get(v)
       ...

Default arguments make local lookups faster (still function call). But `low` and `del_low` are mutable, default binds. `heappop` local. That might be faster than closure. Similarly clean_high. But note `heappop` defined after? We can define after heappop local. Use default args:

    def clean_low(_low=low, _del=del_low, _pop=heappop):
        while _low:
            v = -_low[0]
            c = _del.get(v)
            if c:
                if c == 1:
                    del _del[v]
                else:
                    _del[v] = c - 1
                _pop(_low)
            else:
                break

But `del _del[v]` inside default okay. This avoids closure? It still has local variables. Function call overhead remains.

Could combine cleaning of both in one function? Not.

Maybe inline cleaning with a small loop repeated using `while low:` four times. Code longer but fastest. Let's see if final code can be maintainable. We can write a local `while` snippet? Python no macros. Could use functions for readability. The prompt asks expert code, performance. I think functions fine. But to be safe for 2 seconds, maybe inline the common clean loops? Let's estimate more accurately. Python 3.11 function call overhead around 50-100 ns? Actually a simple Python function call is ~80 ns? Wait, in Python, a function call is maybe ~100 ns for C? No, Python bytecode call is several operations, maybe ~100-200 ns? Let's recall: Python can do ~10-50 million simple ops per second. Function call maybe ~0.1 micro? 1.5M calls = 0.15s. Fine. Closure variable access maybe more. Overall under 2s.

But nested function while loops with dictionary get and heap operations. 200k*? Should be okay.

Let's consider worst-case where many stale clean pops occur in a single iteration, e.g., after long accumulation, cleaning low may pop O(k) or O(n) elements. Total pops O(n), each heappop log size. If physical heap grew to O(n), heappop log n ~18. Total extra pops 200k*18=3.6M, okay. But if a single iteration cleans 100k, still total under. Time maybe okay.

But physical heap size could be O(n) not O(k) because stale not top accumulate. In worst-case with increasing values, removed small from low accumulate, low physical grows to O(n) as shown. Then each push/pop log n (up to 200k) not log k. n=200k, log2 200k ~18, still fine. 200k operations *18 ~3.6M comparisons. Python heap comparisons of floats fast. Under 2s likely.

Could physical heap grow beyond n? Each incoming pushed once, outgoing not removed until clean. Total pushes = n (init k + n-k incoming) = n. Pops for cleaning + moves + swaps. Moves pop valid and push to other heap, so physical total can increase? Let's track total physical elements in both heaps. Init k. Each slide: push incoming +1. Schedule removal no physical pop. Clean may pop stale -1. Rebalance move: pop one source, push to dest total unchanged. Swap: pop/push two each total unchanged. So total physical <= n. Good.

Now, one subtle performance issue: `arr = sorted(nums[:k])` for k=1000 no problem. For k=n=200k, only one window; we then loop 0 times. Sorting 200k and heapify low/high. But we could just compute median from sorted arr directly without heapify. For k==n, we can return [median] without heaps. But not necessary. However if k large, heapify low and high O(k). Sorting already O(k log k). We can optimize: If k == n, compute median from arr and return. This avoids heapify and memory. Also if k==1 special. Could add:
    if k == n:
       arr=sorted(nums)
       if k&1: return [float(arr[k//2])]
       else: return [(float(arr[k//2-1])+float(arr[k//2]))/2.0]
But we already slice sorted. Could do before heap init. This may be nice. But not required. It adds branch.

What if n-k+1 small? Heap algorithm fine. But for k close to n, sorting once okay.

Could use `nums` maybe tuple? len works, slicing works. Type list.

Now, let's think about using `heapq.heapify` on low with negatives. `low = [-x for x in arr[:target]]`; if x is int, -x int. okay. `high = arr[target:]` (list slice). Need not copy? arr already list; slice creates new. Could use `high = list(arr[target:])`. okay.

First median: For k even, high nonempty. For k odd, high may be empty? For k=1 special; for k=3 high size1. okay.

Now, let's test with small arrays manually.

1) nums=[1], k=1 -> [1.0]
2) nums=[], k=1 -> k>0? k > len (1>0) raise. k=0 raise.
3) nums=[5,4,3,2,1], k=2.
init sorted first2 [4,5] low[4] high[5] med4.5
i=2 out5 in3: clean; out5>low4 -> del_high[5], high_size0; clean high empties; x3 low nonempty 3<=4 push low low_size2; rebalance low>1: clean low top4? low physical [4,3]? max4 valid. pop4 push high. low_size1 high1. low now [3], high[4]. median (3+4)/2=3.5. window [3,4] sorted[3,4] yes.
i=3 out4 in2: clean low top3, high4. out4>3 -> del_high[4], high_size0; clean high pops4; x2<=3 push low low_size2; rebalance move low top3 to high; low[2], high[3]; med2.5. window[2,3]. good.

4) duplicates: nums=[1,1,1,1], k=2. init low1 high1 med1. i=2 out1: clean; out<=1 del_low[1], low_size0; clean low pops1? low physical [1], pending top, pop, low empty. high [1]. x1 low empty -> push high (high [1,1], high_size2). rebalance low<1: clean high top1? del_high? none. pop1 push low. low_size1 high1. low [1], high [1]. med1. Good. Note the outgoing removed from low, incoming pushed high, moved one 1 to low. Which occurrence doesn't matter.

5) nums=[2,2,2,1], k=3. target2. init first [2,2,2] sorted [2,2,2], low [2,2], high[2], med2. i=3 out2 in1: clean; out<=2 del_low[2] count1 low_size1. clean low: top2 pending -> pop one 2, low now [2], low_size logical1. x1 low max2, 1<=2 push low low_size2. physical low [2(valid?),1,2? Wait after clean low had one 2. push 1. low logical size2, no pending. low max2. high [2]. median odd low max2. window [2,2,1] sorted [1,2,2] median2. good.

But what if out was the 2 that was in high not low? There are three 2s, low has two, high one. Removing one 2 from low is fine; remaining window has two 2s and 1. low should have two smallest [1,2], high [2]. Our low after add [1,2] max2, high [2]. good.

6) nums=[1,2,3,4], k=3. init [1,2,3] low [1,2] high[3] med2. i=3 out1 in4: del_low1 low_size1; clean low top2? pending1 not top. x4 low max2 -> push high high_size2. rebalance low<2: clean high top3 valid; move3 to low. low_size2 high1. low physical [2,1,3] max3? Wait low logical should [2,3], stale1. low max3, high [4]. median3. window [2,3,4] median3. good.

Now, possible issue: After moving 3 from high to low, high [4]. low top 3. But low logical size2, physical 3 (stale1, valid2,3). okay.

Now, if next window? no.

Now, what about even k median when low top stale? We clean before median. good.

Now, let's think of using `float(-low[0])` for odd. If low[0] is int, float. If value is huge >1e308, float conversion may overflow? But input list[float], so already float. If input int huge, type hint float but could be int; float conversion may OverflowError? Python float(10**400) raises OverflowError? Actually float(10**400) -> inf? Let's check: float(10**400) raises OverflowError? I think `float(10**400)` returns inf? In Python, `float(10**400)` raises OverflowError: int too large to convert to float. But type is list[float], so not worry. But to be safe, could not cast? Requirement return floats. If input ints huge, maybe expected? Usually not. Could use `med = -low[0]` and if `not isinstance(med, float): med = float(med)`? same. Could return `med` if already float. For int median, requirement says return floats; maybe tests check `isinstance(result, float)`? Possibly. Use float.

If input contains `decimal.Decimal`, float conversion may lose, but type float.

Now, ValueError if k not int? k: int. If k is bool? bool is int; k=True ->1, okay. Not worry.

Now, let's consider if `nums` contains `None`? no.

Now, code style: single python code block. No tests. Could include import at top. The final should be:

```python
from heapq import heappush, heappop, heapify

def sliding_median(nums: list[float], k: int) -> list[float]:
    ...
```

Need ensure no print.

Let's refine for speed by inlining clean? Let's weigh. The final code with nested functions is acceptable. But maybe hidden test time strict 2s on normal PC. Python two-heap lazy with nested functions likely passes for 200k/1000. But let's optimize more to be safe.

We can write clean loops inline in the main loop using a small local helper? Maybe we can create a local function but bind locals via defaults. Or use a while loop with a local variable for dict? Let's design a fast version.

Pseudo fast:

from heapq import heappush, heappop, heapify

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    if k == 1:
        return [float(x) for x in nums]
    if k == n:
        arr = sorted(nums)
        if k & 1:
            return [float(arr[k // 2])]
        return [(float(arr[k // 2 - 1]) + float(arr[k // 2])) * 0.5]

    target = (k + 1) // 2
    arr = sorted(nums[:k])
    low = [-x for x in arr[:target]]
    high = arr[target:]
    heapify(low); heapify(high)
    low_size = target
    high_size = k - target
    del_low = {}
    del_high = {}
    res = [0.0] * (n - k + 1)
    if k & 1: res[0]=float(-low[0])
    else: res[0]=(float(-low[0])+float(high[0]))*0.5

    for i in range(k, n):
        out = nums[i-k]
        # clean low
        while low:
            v = -low[0]
            c = del_low.get(v)
            if c:
                if c == 1: del del_low[v]
                else: del_low[v] = c - 1
                heappop(low)
            else: break
        # clean high
        while high:
            v = high[0]
            c = del_high.get(v)
            if c:
                if c == 1: del del_high[v]
                else: del_high[v] = c - 1
                heappop(high)
            else: break
        if low:
            if out <= -low[0]:
                del_low[out] = del_low.get(out, 0) + 1
                low_size -= 1
            else:
                del_high[out] = del_high.get(out, 0) + 1
                high_size -= 1
        else:
            del_high[out] = del_high.get(out, 0) + 1
            high_size -= 1
        # clean low/high again before add
        while low: ...
        while high: ...
        x = nums[i]
        if low and x <= -low[0]:
            heappush(low, -x); low_size += 1
        else:
            heappush(high, x); high_size += 1
        # rebalance
        if low_size > target:
            # at most one? Could use if not while for speed? Let's see sizes can differ by at most 1? Yes after remove/add from balanced. But if low empty push high maybe low_size target-1, high+1; not >. If previous inconsistent? Could use if. But while safer. Since at most one, if faster. However if clean pops stale doesn't change size, no extra. Use if.
            while low_size > target:
                while low: ... clean low ...
                val = -heappop(low); heappush(high, val); low_size -=1; high_size +=1
        elif low_size < target:
            while low_size < target:
                while high: ... clean high ...
                val = heappop(high); heappush(low, -val); low_size +=1; high_size -=1
        # clean before median
        while low: ...
        while high: ...
        # optional order fix? if low and high and -low[0] > high[0]: swap
        start = i-k
        if k & 1: res[start]=float(-low[0])
        else: res[start]=(float(-low[0])+float(high[0]))*0.5
    return res

Inlining clean code 4 times (plus rebalance) makes code long but faster. But we can reduce cleans: Do we need clean both at start and after removal? Maybe we can clean low at start, classify, schedule. Then before add, only need clean low if removal from low; if removal from high, low unchanged. But high may be needed for push if low empty? If removal from high and low nonempty, high top might be stale but not needed for push unless low empty? low nonempty. Rebalance may need high if low_size<target (remove from low, add high) or median even. So can clean high when needed. Simpler to clean both. Inlining repeated clean loops is error-prone.

Could define a small local function but maybe okay. The final answer can be readable. The prompt likely values correctness and reasonable efficiency. 200k/1000 is not huge. Two heaps with nested clean functions should pass. Let's still optimize a bit.

Potential hidden time issue: Sorting first k of 1000 trivial. Loop 199k. Nested clean function call 4 times + rebalance clean 1 + final clean 2 = maybe 7*199k=1.4M calls. If each call 0.2 us ->0.28s; if 0.5 us ->0.7s. Heap ops maybe 0.5s. Total <2.

But Python function call overhead in 3.11 is maybe ~50 ns? Actually let's recall: A simple Python function call can be ~100 ns in C? No, Python executes ~10^7 function calls per second? 10 million per second = 0.1 micro. 1.4M = 0.14s. Good.

Let's use nested functions with default args for speed.

Code:

    def clean_low(_low=low, _del=del_low, _heappop=heappop):
        while _low:
            v = -_low[0]
            c = _del.get(v)
            if c:
                if c == 1:
                    del _del[v]
                else:
                    _del[v] = c - 1
                _heappop(_low)
            else:
                break

But note: `_heappop(_low)` returns popped value, ignored. Fine.

However, default arguments capture `low` list object. If we reassign `low`? We don't. Good.

Similarly clean_high.

Inside main loop, `clean_low()` uses local function lookup. Could bind `cl = clean_low; ch = clean_high` for faster? local variable already. Function name local. okay.

Rebalance: Use `if` instead of `while`? Since at most one move if sizes consistent. But if clean pops stale doesn't change size, still one. Could use if for speed. But if due to some scenario sizes differ by more? Let's prove: Before slide balanced low_size=target. Remove one from either -> target-1 or target+? If remove from low: target-1; add: if to low -> target; if high -> target-1 (need one move high->low). If remove from high: target; add: if low -> target+1 (need one move low->high); if high -> target. If low empty push high etc same. So difference at most 1. Use if. But if target maybe 0? k>=2 target>=1. Good. Use if to reduce loop overhead. However if we include swap, sizes unchanged. So if enough. But if some bug or clean? no. Use if for performance.

Rebalance with if:
        if low_size > target:
            clean_low()
            val = -heappop(low)
            heappush(high, val)
            low_size -= 1
            high_size += 1
        elif low_size < target:
            clean_high()
            val = heappop(high)
            heappush(low, -val)
            low_size += 1
            high_size -= 1

Need ensure if low_size > target but low top stale? clean_low. If low empty? shouldn't. If low_size < target high empty? shouldn't.

What if low_size > target by more due to k==1? special. no.

Now, after rebalance, do we need clean both? If we moved top after cleaning source, destination may get new top stale? Destination top might be stale not top before; after pushing moved value, top could be stale? Suppose moving from high to low: clean_high ensures high top valid. Pop high top, push to low. Low top after push could be the moved value (valid) or existing low top (valid, cleaned before? We didn't necessarily clean low in this branch if low_size<target. Low may have stale top? We cleaned both before add, so low top valid. But if removal from low scheduled stale not top, low top valid. If add to low, low top valid or new valid. So low top valid. Destination high after push? Not if moving high->low, high popped valid, high top might become stale (not top before, now top). We clean high before median. So need clean both after rebalance. Good.

Could skip clean_low after rebalance if we know low top valid, but keep for safety.

Optional swap: If we include, need clean before comparison. We already clean both after rebalance. Then if violation, swap. After swap, tops valid? v1/v2 valid, push. But source tops after pop may become stale; clean again. Could include.

Does swap ever necessary with our push rule? Let's try to find a case where invariant violates due to low nonempty but low max stale? We clean. I think no. But including check cheap. However, if violation due to deeper issue, one swap may not fix and could even make things worse? Suppose low [10,9], high [5,6] (should not). Swap -> low [9,5], high [10,6], still violation; next iteration maybe. But if it occurs, algorithm already broken. One swap not enough. Could use a loop while violation? That could be expensive and not standard. Better not include swap if not needed. The push rule with low empty->high and rebalance should maintain. Let's omit swap to keep simple and fast.

But wait, there is a scenario with low nonempty, high nonempty, and incoming <= low max so push low, then low_size > target, move low top to high. This maintains. If incoming > low max push high, low_size < target, move high top to low. Suppose incoming > low max but incoming < current high min? push high, high top becomes incoming. Rebalance if low_size<target? That only if removal from low. Move high top (incoming) to low. Then low contains incoming, which is > old low max? But old low max maybe after removal lower? Let's test: window old low [1,100]? invariant? high min 200. Remove 1 from low, low max 100, high [200]. Add 150 >100 push high. low_size target-1, move high top 150 to low. New low [100,150], high [200]. Is that correct? Window after remove 1 and add 150: old window had target maybe 2 low [1,100], high [200] (k=3 sorted [1,100,200]). New [100,150,200], low should [100,150]. yes. Invariant 150<=200. Good.

If remove from high, low_size target, add incoming > low max push high, no move. If incoming < high min but > low max, high min becomes incoming, invariant. If incoming >= high min, invariant. Good.

If removal from low, add incoming <= low max push low, no move? low_size target after add, low max unchanged (incoming <= old low max? But old low max after removal may be lower if removed max. Example old low [1,5], high [6]. Remove 5, low max 1. Add 4 <=? Compare to low max after cleaning? We clean after removal: low top 1. incoming 4 >1, so push high, then move high top 4 to low? Wait high has [6,4], top4, low_size target-1, move 4 to low -> low [1,4], high[6]. Correct. If incoming 0 <=1 push low, low [1,0], max1, invariant. Good.

Thus invariant holds.

Now, clean functions with default args and no size update. Let's test with low_size < target branch: We call clean_high() then heappop(high). But high_size logical may be target? If high has pending top, clean pops stale without changing high_size. Then heappop valid. high_size--. Good. But what if clean_high pops stale and high becomes empty while high_size >0? inconsistency. no.

Now, one issue: In remove classification, we call clean_low and clean_high before. Suppose low top stale and del_low count for top value >1. clean pops one, then continues; maybe low empty. low_size logical already reflects deletions? Wait clean does not change low_size. But if low top stale, that stale was already scheduled, so low_size was decremented when scheduled. If low_size becomes 0 but physical low has multiple stale, clean will pop all until top valid or empty. If low_size logical >0, there are valid elements. Good.

But consider scheduling deletion: We call clean before. Then if out <= lowmax, we do del_low[out]+=1; low_size-=1. Suppose out is lowmax and there are multiple lowmax values, pending count for lowmax becomes 1. clean after removal will pop one lowmax. low_size decremented. Good. If there are multiple pending lowmax? clean pops count. Good.

Now, what if out <= lowmax but out is not at top, and there is pending deletion for top value from previous? We cleaned before, so no pending top. After scheduling out, top remains valid. clean after removal does nothing. low_size decremented. Physical low still contains out stale not top. Logical low excludes it. Good.

Now, if low_size becomes less than target and we add to high then move high top to low. The stale out remains in low. Low logical size target after move. Physical low includes stale. Good.

Now, dictionary counts: When scheduling deletion, we use `del_low[out] = del_low.get(out, 0) + 1`. If out is a float nan, get returns? nan == nan false, but dict uses identity? For floats nan, hash same? Actually nan is not equal to itself, but dict lookup by nan: if key exists with same hash and identity? Python dict uses equality, so a NaN key may not be found by another NaN? This is a known issue. But numeric algorithms with NaN undefined. Ignore.

Now, return floats. For even median, `(float(a) + float(b)) * 0.5` maybe faster than /2.0. Use * 0.5.

Now, let's consider if k is even and high is empty? k>=2, target=floor? For k=2 high_size=1. For k even high_size=k/2 >=1. Good.

Now, possible optimization for k==n: If k==n, we can avoid heap. Add branch after k==1. Need sorted(nums) not slice. For k even, median mean arr[k//2-1], arr[k//2]. For odd arr[k//2]. Return list length 1. This also handles n=1? k==1 already. If n=0, k? raise before.

If k==n and n large, sorting O(n log n). The heap algorithm would also sort first k (same) and heapify. Branch saves heapify and res. Good.

What if n-k+1 is small but k not n, e.g., n=200k k=199999, two windows. Heap init sort 199999, slide one. Fine. Could alternative sort each window? no.

Now, let's think if there is a more efficient algorithm using median maintenance with two heaps but no dictionary? Could use `collections.deque`? no.

Now, final code with nested clean. Need ensure imports. Use `from heapq import heapify, heappush, heappop`.

Potential issue with default args in clean functions: They capture `heappop` from imported function. Good. But if we use `heappop` local variable also in main, default `_heappop=heappop` binds. Good.

Let's write final code:

```python
from heapq import heapify, heappush, heappop

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
        return [(float(arr[mid - 1]) + float(arr[mid])) * 0.5]

    target_low = (k + 1) // 2
    arr = sorted(nums[:k])
    low = [-x for x in arr[:target_low]]
    high = arr[target_low:]
    heapify(low)
    heapify(high)

    low_size = target_low
    high_size = k - target_low
    remove_low: dict[float, int] = {}
    remove_high: dict[float, int] = {}
    res = [0.0] * (n - k + 1)

    if k & 1:
        res[0] = float(-low[0])
    else:
        res[0] = (float(-low[0]) + float(high[0])) * 0.5

    def clean_low(_low=low, _rem=remove_low, _pop=heappop):
        while _low:
            v = -_low[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_low)
            else:
                break

    def clean_high(_high=high, _rem=remove_high, _pop=heappop):
        while _high:
            v = _high[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_high)
            else:
                break

    for i in range(k, n):
        out = nums[i - k]

        clean_low()
        clean_high()

        if low:
            if out <= -low[0]:
                remove_low[out] = remove_low.get(out, 0) + 1
                low_size -= 1
            else:
                remove_high[out] = remove_high.get(out, 0) + 1
                high_size -= 1
        else:
            remove_high[out] = remove_high.get(out, 0) + 1
            high_size -= 1

        clean_low()
        clean_high()

        x = nums[i]
        if low and x <= -low[0]:
            heappush(low, -x)
            low_size += 1
        else:
            heappush(high, x)
            high_size += 1

        if low_size > target_low:
            clean_low()
            v = -heappop(low)
            heappush(high, v)
            low_size -= 1
            high_size += 1
        elif low_size < target_low:
            clean_high()
            v = heappop(high)
            heappush(low, -v)
            low_size += 1
            high_size -= 1

        clean_low()
        clean_high()

        idx = i - k
        if k & 1:
            res[idx] = float(-low[0])
        else:
            res[idx] = (float(-low[0]) + float(high[0])) * 0.5

    return res
```

Need consider `low` and `high` variables in main after default functions. The functions use default lists. In main, we also use `low` and `high`. Fine.

Potential problem: Type annotation `dict[float, int]` inside function okay Python 3.11. But not necessary. Could omit for speed? Annotations not executed? They are evaluated? In function body, variable annotations are not evaluated? Actually local variable annotations are not evaluated? They may be stored? I think annotations for locals are not evaluated at runtime? In Python, annotations on local variables are not evaluated? Let's check: `x: SomeUndefined = 1` inside function doesn't raise? I think local annotations are not evaluated, but to be safe, omit type annotations inside. Use `remove_low = {}`.

Potential problem: `if low:` in classification after clean. `low` is list; if physical low empty but low_size logical >0? Shouldn't. But if low empty, we remove from high. What if low_size >0 but low empty due to all pending stale not cleaned? clean should empty if logical 0. If logical >0, physical not empty. okay.

Potential problem: In rebalance `if low_size > target_low: clean_low(); v = -heappop(low)`. If low top stale but clean_low pops it, low_size unchanged. If after clean low still has stale top? clean loop continues until no top pending. Good. But what if low becomes empty and low_size > target? heappop error. Should not.

Potential problem: In `elif low_size < target_low`, clean_high then heappop(high). If high top stale, clean pops; high_size unchanged. If high empty and low_size<target? Should not.

Now, let's test with a scenario where low_size > target and low top stale but pending count for top value is zero? Not stale. If stale not top, top valid. heappop moves valid. Good.

Now, think about high_size variable. We don't use high_size except updating. Could use only low_size and target? But need high_size for? Not really, except maybe no. We can omit high_size to save operations? We only need low_size to rebalance. Total logical size k; high_size = k - low_size after clean? But with pending? Logical total always k after add. We can maintain low_size only. When remove from high, low_size unchanged. When add high, low_size unchanged. Rebalance based on low_size. No need high_size. But updating high_size cheap. Could remove high_size to simplify? Need know high_size? Not for median. For push rule, we don't use high_size. For low empty check use low list. So high_size not needed. But it can serve sanity. Removing it saves a few assignments. Let's consider:

Initialize low_size = target. On removal:
 if out <= lowmax: remove_low, low_size -=1 else remove_high (no low_size change)
Add:
 if low and x <= lowmax: push low, low_size +=1 else push high (no low_size change)
Rebalance:
 if low_size > target: move low->high, low_size -=1
 elif low_size < target: move high->low, low_size +=1

This works. We don't need high_size. Let's use only low_size for speed and less bug. But wait, if low empty after removal, low_size should be 0. If remove from high and low_size target, low not empty. If remove from low and low_size target-1. Good. If low physical empty but low_size 0. okay.

When moving high->low, need high has valid top. If low_size < target, high logical size = k - low_size > k-target = target_high. There is at least one high. Good.

Let's remove high_size. Code simpler.

But in initialization, high_size not needed. For k even median high nonempty.

Revised:
    low_size = target_low
    ...
    if out <= -low[0]: ... low_size -=1 else ...
    if low and x <= -low[0]: ... low_size +=1 else ...
    if low_size > target_low: move, low_size -=1
    elif low_size < target_low: move, low_size +=1

Now, one subtlety: If out is removed from high, low_size unchanged. If add to high, low_size unchanged. Balanced. If out removed from low, low_size target-1. If add to low, low_size target; if add to high, low_size target-1 -> move high->low. Good.

Now, classification `if low:` uses physical low. Suppose low_size target but physical low top stale? cleaned. Suppose low_size 0 but physical low not empty stale? clean should empty? If low_size 0, all logical low removed. But physical low may have stale not top? If low_size 0, there are no valid low elements. Therefore every physical low element is stale. Top must be stale, clean empties. So low empty. Good.

Now, if low_size > 0 but low physical empty? inconsistency. no.

Let's adjust code.

Now, can we reduce clean calls? With only low_size, still need clean high before median even and before moving high->low. We can call clean_high only when needed:
- At start, need clean low for classification. If low empty? need maybe clean high? If low empty, out must be in high; no need high top for classification. But after removal, before add, if low empty we push high; no need high top. If low nonempty, need low top. So clean high at start not strictly needed.
- After scheduling removal, before add, need clean low if removal from low (top may stale); if removal from high, low unchanged (but was clean before). However if low had stale not top, low top unchanged. So can skip clean_low if removed from high. But for simplicity clean both.
- Before add, if low nonempty need low top valid. If low empty, no. High not needed unless low empty? push high, no top comparison. So clean high not needed before add unless low empty and we want? no.
- Rebalance: if low_size > target, need clean low before pop. If low_size < target, need clean high before pop.
- Median: need clean low always; if even need clean high.

We could optimize by cleaning as needed, but code complexity. Current clean both at start, after removal, after rebalance = 6 calls per iteration (2+2+2) plus rebalance source clean 1 maybe. Actually clean both before removal, clean both after removal, clean both after rebalance = 6, plus if branch source clean 1 = 7. Could reduce to 4: clean_low before classification; schedule; clean_low before add (if removed low); push; rebalance with clean source; clean_low (and high if even or moved?) before median. Need ensure high top valid for median even and for moving. Could clean high before median always if k even or if rebalance moved? For odd, high top not needed except maybe order? Not. But stale high top doesn't affect low median. However high stale could affect future moves. But clean high when moving high->low or before even median. For odd, could defer cleaning high until needed. But to keep simple, clean both before median. 6 calls okay.

Could use helper functions and call both. Fine.

Now, consider if k is odd and high becomes physically huge with stale top; we never clean high except at start/after removal/rebalance? In current code we clean high every iteration. Good. If we optimized, might let high stale accumulate but total pops still O(n). But current fine.

Now, let's think about a possible bug with clean functions not updating `low_size`: In rebalance `if low_size > target`, we clean_low, pop valid, low_size--. But what if clean_low popped stale elements, and those stale elements had been counted in `low_size` erroneously because when scheduled removal we didn't decrement? But we do decrement when scheduling. So no.

Let's test a scenario with remove from low not top, then low_size < target, move high->low. Low physical includes stale. low_size after move target. clean_low before median doesn't pop stale not top. low top valid. Median correct. Next iteration, classification uses low top valid. If outgoing is the stale value? It might be <= low top, schedule low again? But the stale value is no longer in window; can it be outgoing? Outgoing is from nums[i-k], each element leaves once. The stale value left earlier and was scheduled then. It cannot be outgoing again. So no.

Now, dictionary counts for stale not top remain. If the same value appears as new incoming and is pushed into same heap, pending count for that value exists. Could clean mistakenly remove the new valid occurrence if it becomes top before stale? Let's examine. This is important. Suppose low has pending deletion for value 5 (stale old occurrence) not at top because top is 10. New incoming 5 is pushed into low (if <= low max 10). Now low contains two 5s: one stale, one valid. pending count for 5 is 1. Later, if 10 is removed (scheduled deletion from low) and then low top becomes 5. clean_low sees top 5, c=1, pops one 5. It doesn't know which 5; it pops one occurrence. The net effect: one 5 removed from heap. There are two 5s, one stale one valid; removing one leaves one valid. Correct. If pending count was 1 and there are two 5s, okay. If pending count was 2 (two stale 5s) and new valid 5 added, total three 5s, clean pops two when top, leaves one. Correct. This is the power of value-based lazy deletion. Good.

What if pending count for 5 in high, and new 5 pushed to low? Then no issue. If new 5 pushed to high, pending count applies to high; clean high pops one of high 5s, leaving correct count. Good.

Now, consider moving a valid 5 from high to low while high has pending 5. clean_high before move will pop pending 5s at top if count. If pending 5 not top? top >5? But min-heap top is smallest; if pending 5 not top, there is no smaller valid/stale top? If top >5 impossible because 5 would be top if present. If top =5 and pending count >0, clean pops. So we won't move a 5 that is scheduled for deletion. If pending count for 5 exists but all 5s in high are stale? clean empties them. If new valid 5 added after pending, count still 1, total two 5s; clean will pop one when top, leaving valid. If rebalance needs move high->low and high top 5 with pending count 1, clean pops one 5 (stale or one of them) leaving one valid 5, then moves that valid 5 to low. Correct.

Thus value-based deletion works with duplicates.

Now, potential issue with floats and negative zero: -low[0] for -0.0? If low stores -x. If x=-0.0, -x=0.0. -low[0] = -0.0? If low[0]=0.0, -low[0]=-0.0. float(-0.0) okay. Dictionary keys -0.0 and 0.0 equal? In Python, -0.0 == 0.0 and hash same. Fine.

Now, maybe tests check that result length is n-k+1 and values in order. yes.

Now, let's think about possible alternative using `heapq` and `collections.defaultdict` but no.

Now, one more performance thought: Sorting `nums[:k]` where nums is list[float]. If k is small, fine. If k large, branch k==n. If k=1000, fine. If k=100000, n=200000, sort 100000, loop 100001. Heap physical size may grow. Should pass.

But the requirement specifically n=200k k=1000. Our algorithm O(n log n?) due to physical heap growing to n in increasing sequence, log n ~18. 200k * (push + maybe move + cleans) ~ maybe 1M heap ops * log 200k? Actually each push into low/high heap of size up to n: 200k pushes *18 =3.6M comparisons. Moves: at most 200k pop+push =400k*18=7.2M. Clean pops: up to 200k*18=3.6M. Total ~14M heap comparisons. Python can do maybe 10-50M/s? Could be ~1s-2s. Plus dict. Might be close but likely okay. Can we bound physical heap size to O(k) to improve? Standard lazy deletion can accumulate O(n). But n=200k okay. However if physical heap grows to 200k, heap ops log 200k instead of log 1000 (10 vs 18), factor 1.8. Still okay.

Could we periodically rebuild heaps to remove all stale and keep size k, improving time? Rebuilding O(k) maybe amortized? But not necessary. Could if len(low) > 2*target + some? But cleaning non-top not possible without extracting all. Rebuild from scratch would require knowing current window and partition. Could maintain window as deque and rebuild every k steps? O(n/k * k log k) = O(n log k) but with bigger constant. For k=1000, rebuild every 1000 => 200 rebuilds *1000 log1000 ~2M, plus. But complexity. Not needed.

But physical heap growth in increasing sequence: Let's simulate with k=1000, increasing. Removed low small values accumulate in low? target=500. Low logical contains largest 500 of current low half? Actually for increasing window [i+1...i+k], low contains first 500 smallest of window, high next 500. Outgoing is smallest, which is in low but not top? Low max is i+500. Outgoing i is at bottom, stale accumulates. Low physical grows by 1 each slide (outgoing stale, incoming high, move one from high to low? Let's see: remove smallest low, add largest high, low_size target-1, move high min (i+501) to low. Low physical: stale i, plus previous stale, plus valid low elements. It grows by 1 each slide because one stale added and one valid moved from high, no clean. After 199k slides, low physical ~199k+500. High physical? high loses one moved each slide, gains incoming, so size stays ~500? So low heap size O(n). Heap operations on low for incoming? incoming goes high (log 500). Rebalance moves high->low: push into low (log n) each slide. So 200k pushes into low log n, plus maybe clean eventually? The stale small values will never become top because low valid values keep increasing? At the end, low top is near n-500, stale small at bottom never cleaned. So no clean pops. Total push low 200k log growing to 200k: sum log ~ n log n - n log k ~ 200k*18 =3.6M. Fine.

In decreasing sequence, removed largest from high accumulate in high, high physical grows, low stays k/2. Push high log n. Fine.

Worst-case both heaps grow? Total physical <=n, operations log n. Fine.

Now, can we avoid moving push into huge heap by rebuilding? Not needed.

Now, let's consider if using `sorted(nums[:k])` for k=1000 and then heaps. For increasing sequence, low physical grows, but low_size target. The clean functions at start each iteration clean low: top valid (large), dict get top maybe no pending; O(1). Good.

Now, possible memory: low heap 200k floats, high 1000, dicts maybe 199k keys? In increasing sequence, remove_low for each outgoing i? They are pending not top, so dict remove_low accumulates 199k keys with count1. That's memory large: 200k dict entries ~ >10MB. Total maybe 30-50MB, okay? Normal PC. But if memory limit tight? Could be an issue. Standard lazy deletion with dict can accumulate O(n) keys. n=200k, dict 200k entries maybe ~10-20MB, plus heaps ~3MB each, okay maybe <100MB. But if both dicts accumulate 200k? total physical n, but dict entries for stale not cleaned can be O(n). In increasing, remove_low 199k. In alternating, maybe both. Could be 400k? But total stale elements <=n, each stale has a count in one dict; distinct values could be n. So at most n entries across dicts if values distinct. If duplicates, fewer. 200k dict entries okay.

But time for dict get top each clean: top valid, `del_low.get(v)` where v not in dict? For increasing, low top changes to new valid; dict contains old small keys. get top miss. 200k misses, fine.

Could we reduce memory by using a set of deletion counts? Need counts. okay.

Now, let's think of a different algorithm with two heaps but using an `OrderedDict`? no.

Now, hidden tests might use `nums` length 200_000, k=1_000, random values. Time likely okay.

Let's maybe micro-optimize the main loop:
- Bind `nums_local = nums`, `target = target_low`, `k_odd = k & 1`.
- Use `start = i - k` each iteration.
- Use local `heappush_local = heappush`, etc already global imported; inside function, global lookup for heappush? We can assign local `hp = heappush`, `hpop = heappop`. Use these in main and clean defaults.
- In main loop, use `low0 = -low[0]` to avoid computing twice? e.g.
    if low:
        low_max = -low[0]
        if out <= low_max: ...
        else: ...
  after clean. For add, need low_max again after clean; could recompute.

- Use `res_idx` maybe.

- Use `odd = k & 1` outside.

Let's write optimized code:

    hp = heappush
    hpop = heappop
    odd = k & 1
    target = (k+1)//2
    ...
    def clean_low(_low=low, _rem=remove_low, _pop=hpop): ...
    def clean_high(_high=high, _rem=remove_high, _pop=hpop): ...

    for i in range(k, n):
        out = nums[i-k]
        clean_low(); clean_high()
        if low:
            low_max = -low[0]
            if out <= low_max:
                remove_low[out] = remove_low.get(out, 0) + 1
                low_size -= 1
            else:
                remove_high[out] = remove_high.get(out, 0) + 1
        else:
            remove_high[out] = remove_high.get(out, 0) + 1
        clean_low(); clean_high()
        x = nums[i]
        if low and x <= -low[0]:
            hp(low, -x); low_size +=1
        else:
            hp(high, x)
        if low_size > target:
            clean_low()
            v = -hpop(low)
            hp(high, v)
            low_size -= 1
        elif low_size < target:
            clean_high()
            v = hpop(high)
            hp(low, -v)
            low_size += 1
        clean_low(); clean_high()
        if odd:
            res[i-k] = float(-low[0])
        else:
            res[i-k] = (float(-low[0]) + float(high[0])) * 0.5

Need be careful: In remove branch, if out > low_max, we schedule high but do not change low_size. If out <= low_max, low_size--. If low empty, schedule high. Good.

But what if low nonempty, out <= low_max, but out actually belongs to high due to duplicates equal? We choose low. okay.

Now, after scheduling removal, we call clean_low(); clean_high(). If removal from high, low_size unchanged; clean_low may do nothing (unless stale top from previous not cleaned? We cleaned before, so no). clean_high may pop scheduled if top. Good.

Could we avoid clean_high after removal if removal from low? If removal from low, high unchanged; but high may have stale top from previous? We cleaned high before removal, so no. So clean_high only needed if removal from high or before median/rebalance. But simple.

Now, one possible bug with default clean functions and `remove_low` variable: In main, we do `remove_low[out] = remove_low.get(out,0)+1`. The clean function default `_rem=remove_low` references same dict. Good.

Now, if we assign `remove_low = {}` later? no.

Now, consider if `nums` is a list of floats but we sort `nums[:k]`; if k large, slice copy. okay.

Now, let's think about whether to use `list[float]` type hint in Python 3.11. okay.

Now, final code should not include tests. Good.

But let's further validate with random small via mental? Could write a brute in head? Let's do some tricky sequences.

Sequence [4,1,3,2], k=3.
init sorted [1,3,4], target2 low [1,3] max3 high[4], med3.
i=3 out4 in2: clean; out4>3 schedule high; clean high pops4? high top4 pending, pop high empty. x2: low max3, 2<=3 push low low_size3. rebalance low>2: clean low top3? low physical [1,3,2] max3 valid. pop3 push high. low_size2. low [1,2] max2, high[3]. median odd 2. window [1,3,2] sorted [1,2,3] median2. good.

Sequence [4,1,3,2,5], k=3.
Previous after i=3: low logical [1,2], high[3], physical low [1,2], high[3]. i=4 out1 (nums[1]) in5. clean low top2, high3. out1<=2 schedule low low_size1. clean low: top2 valid (pending1 not top). x5 low max2 -> push high. low_size1<2: clean high top3 valid, move3 to low. low_size2. low physical [1(stale),2,3] max3, high[5]. median3. window [1? wait start i-k=1: nums[1:4]=[1,3,2]? No i=4, k=3, window [1,3,2,5]? Actually sliding windows: indices 0-2 [4,1,3], 1-3 [1,3,2], 2-4 [3,2,5]. For i=4 outgoing nums[1]=1, incoming nums[4]=5, window [3,2,5], median3. Our low [2,3] max3, high[5]. good. Stale 1 remains.

Next if more: [4,1,3,2,5,0], k=3. i=5 out3 in0. clean low top3 (stale1 not top), high5. out3<=3 schedule low low_size1. clean low: top3 pending -> pop, now low top? low physical [2,1stale]? max2. low_size logical1. x0 low max2 -> push low low_size2. rebalance none. median low max2. window [2,5,0] sorted[0,2,5] median2. good. Stale1 remains bottom.

Now, even k tricky: [1,2,3,4,5], k=4. target2.
init sorted [1,2,3,4] low[1,2] max2 high[3,4] med2.5.
i=4 out1 in5: clean; out1<=2 del_low low_size1; clean low top2 (pending1 not). x5 low max2 -> push high (high [3,4,5]). low_size1<2: clean high top3, move3 to low low_size2. low physical [1stale,2,3] max3, high[4,5] min4. med3.5. window [2,3,4,5] median3.5. good.

Now, if out is high not top: window [1,2,3,4], out1 as above. If out2 (low top) with incoming 0? nums [1,2,3,4,0], k=4 after first? Actually start [1,2,3,4], i=4 out1 not 2. Need sequence [1,2,3,4,?]. To remove 2, need slide again: after first window [2,3,4,5], low [2,3], high[4,5]. Next out2, in0: clean low top3, out2<=3 del_low low_size1; clean low top3 (pending2 not). x0 <=3 push low low_size2; median low max3, high min4 ->3.5? window [3,4,5,0] sorted[0,3,4,5] median (3+4)/2=3.5. good. Stale2 not top.

Next out3 in100: low physical stale1,2, valid3? Wait after previous low logical [3,0]? Actually low should contain two smallest of [0,3,4,5] => [0,3], high [4,5]. Our low physical has stale1,2, valid0,3 max3. out3 <=3 del_low low_size1; clean low top3 pending -> pop, low top? valid0, stale2,1. low_size logical1. x100 >0 push high. low_size1<2: clean high top4 valid, move4 to low. low logical [0,4], high [5,100] min5. median2? window [4,5,100,1]? Wait start i=5? Let's index: nums [1,2,3,4,0,100], windows k4: [1,2,3,4] med2.5, [2,3,4,0] sorted[0,2,3,4] med2.5? Our previous with out2 in0 after window [1,2,3,4]? I changed sequence. Let's not. But algorithm likely.

Now, one potential issue: When cleaning, we use `_pop(_low)` but ignore return. For max heap, heappop(low) pops smallest negative (most negative?) Actually heapq is min-heap. low stores negatives. The top `low[0]` is the smallest negative, which corresponds to largest original. `-low[0]` is max original. heappop(low) removes that. Good.

Now, if low contains negative of float, `-low[0]` maybe -(-0.0) = 0.0? okay.

Now, if `nums` values are bool, float conversion returns 1.0/0.0. okay.

Now, let's consider if k is very large and target_low maybe 100000. `arr[:target_low]` and `arr[target_low:]` copies. okay.

Now, possible issue with `k == n` branch: If n=0? k > n triggers before. If k=1 and n=1, k==1 branch returns [float(nums[0])]. If k==n and k even, arr[mid-1], arr[mid] valid. For k=2, mid=1, arr[0],arr[1]. good. For k odd, mid=k//2, arr[mid]. For k=3, arr[1]. good.

Now, if k==n but n large, sorted(nums) may use more memory than sorted(nums[:k]) same. okay.

Now, what if k is not integer but e.g., 1.0? `k < 1` works, `k > n` works, but `range(k, n)` requires int. Type hint int. Not worry. Could cast? no.

Now, let's think about final answer requirements: "Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing." So final should be just code block. No explanation. Ensure code block language python.

Before final, let's maybe consider an alternative using two heaps with `heapq` and a `Counter` but using `defaultdict(int)`. Our dict get/set okay.

Now, let's double-check lazy deletion logical sizes with clean not updating sizes in rebalance branch. Suppose low_size > target, clean_low pops multiple stale. low_size unchanged. Then we pop valid and low_size--. But what if clean_low popped stale that was actually the only element making low physical size larger, but low_size already target+1. After popping valid, low_size target. Good. The stale popped were not counted in low_size. But physical low after clean and pop may have size less than low_size? Let's calculate: before clean, physical low = logical low (low_size) + pending_total. low_size = target+1. pending_total includes stale. clean pops p stale, physical = low_size + pending_total - p, pending_total decreases by p. So physical = low_size + (pending_total-p). Then pop valid: physical-- and low_size--. New physical = low_size_old-1 + pending_remaining = low_size_new + pending_remaining. Good.

Now, when moving high->low, source high physical = high_logical + pending_high. clean pops p stale, physical = high_logical + pending-p. pop valid: physical--, high_logical-- (we don't track high_logical but total). dest low physical++ and low_logical++. Invariants.

Now, do we need to track high logical to ensure high has enough? We rely on total. Since total logical after remove/add is k. low_size target +/-1. If low_size<target, high logical = k - low_size > k-target >=1. Good.

Now, what about during initialization for k even/odd high nonempty. good.

Now, let's think of a possible bug with `clean_high()` in median for odd k. We clean high even though not needed. It may pop stale high elements. clean does not update high logical, but we don't track. That's fine. But could cleaning high pop a valid element because pending count for top value exists but the pending deletion was actually from low? We have separate dicts, so no. Could pending count for top value in high exist for a value that is no longer in window but there are more high top values? It pops correct count. Good.

Now, let's consider if a value scheduled for deletion from high later gets moved to low before being cleaned? We clean high before moving high->low. If top value has pending, clean pops. If pending not top, top valid moved. The stale remains high. But what if the stale value is equal to top value and pending count >0 but there are multiple top equal; clean pops one, maybe still top equal with pending count 0, then move top equal to low. Correct: one stale equal removed, one valid equal moved.

Now, if pending value in high is smaller than top? In min-heap, smallest is top. If pending value not top, it cannot be smaller than top; it is larger. So stale in high are larger values, sit above? Actually min-heap top smallest; stale larger not top. They will become top only when smaller valid removed. okay.

Now, let's think about potential integer division: `* 0.5` returns float. good.

Now, maybe hidden tests expect `ValueError` for k=0 or negative, and k > len. We do.

Now, if nums is a list of length 0 and k=0: k<1 raises. good.

Now, let's consider if `nums` contains very many duplicates and dict counts large. Counts could be up to n. `c == 1` check. good.

Now, could `remove_low.get(v)` return 0? We delete key when 0, so no. If count becomes 0? We only decrement when c>0; if c==1 delete else c-1 (could become 0? if c>1, c-1 >=1). good.

Now, maybe use `_rem.pop(v, None)` instead of del? del okay if key exists. We check c. good.

Now, one performance detail: In clean functions, `_pop(_low)` ignores returned value. Could use `hpop(low)` local. fine.

Now, another performance detail: The clean functions are defined after res[0]. They capture `low` and `high`. But inside main loop, `low` and `high` are free variables? Actually they are local in sliding_median, and clean functions default bind them, so no closure? They also use `_low`, `_rem`, `_pop` local parameters. The function definition itself has closure? With default args, the function body uses local parameter names, no closure. Good. It doesn't access outer variables except none. So fast.

But `clean_low` and `clean_high` themselves are local variables. Calling them does a local lookup. good.

Now, in main loop, `remove_low` and `remove_high` are local variables. good.

Now, we used `low` list truthiness. If low physical huge, truth check O(1). good.

Now, can we avoid `clean_high()` before classification if k odd? But fine.

Now, let's consider if high physical becomes empty but high logical >0 due to pending? clean_high would pop stale if top. If high logical >0, valid exists, so not empty. If high empty and low_size<target, heappop error. Shouldn't.

Let's try to construct a situation where low_size<target but high empty logically. k>=2, target ceil. If low_size<target, low_size <= target-1. Total logical k. high logical = k-low_size >= k-(target-1). For k=2, target1, low_size0, high logical2? But before add after removal total k-1? Wait we rebalance after add, total logical k. low_size<target after add. For k=2, target1, low_size0 possible after add? If remove low -> low_size0, add high -> low_size0, total logical 1? Wait total logical after remove+add should be k=2: low_size0, high logical2. So high not empty. Good.

Now, total logical after removal before add is k-1. If remove low, low_size target-1, high logical k-target. If add high, low_size target-1, high logical k-target+1. For k=2, target1, high logical 2? Before remove high logical1; remove low -> high logical1; add high -> high logical2. yes. So high nonempty.

Now, what about low physical empty but low_size>0 due to stale? clean would not empty if valid exists. okay.

Now, let's think about the first median after initialization. We sorted and split. For even k, low max <= high min. For odd, high may have one. good.

Now, maybe use `arr = sorted(nums[:k])` when k maybe 0? k>=2 here. good.

Now, potential issue: If `nums` is a list of numpy floats? Type float, but maybe objects. Standard library only, but values should support comparisons and float conversion. okay.

Now, let's consider if the judge measures time with PyPy? The code uses standard, okay. PyPy heapq maybe slower? But 200k fine.

Now, one more thought: The two-heap lazy deletion with value-based deletion and logical sizes but not physically removing stale from dicts can lead to dictionary keys accumulating for values that are cleaned? We delete key when count 0. Good. For stale not top, keys remain. If same value appears many times, count accumulates. When clean pops, decrement. good.

Now, could dictionary count for a value in low become large, and then a new valid same value is added to high, not low. No issue.

Now, let's think about median after rebalance but before cleaning: We clean both. Suppose low top valid, high top stale for even. clean_high pops stale, high top may become smaller? Wait min-heap: stale top is smallest high value. If it's stale (removed), popping it reveals a larger valid value, so high min increases. Median uses larger value, correct. If we didn't clean, median too low. We clean.

Now, what if high top stale and low_size<target rebalance needed: We clean_high before pop, so we don't move stale. good.

Now, let's maybe add a fallback order swap just in case? I'm leaning omit. But let's test a scenario with low empty and push high, rebalance move high top to low. Invariant holds. With low nonempty push high/low and move, holds. So no swap.

But what about stale top causing low max artificially low? We clean low before classification and before median. If low top stale, clean pops. If there are multiple stale top values, pops all. So low max true. good.

Now, let's consider if `out <= -low[0]` when low top is valid but there is a pending deletion for a value greater than low top? Can't be pending greater than top? In max-heap, top is max. Pending value greater than top impossible if in low. Pending smaller not top. So classification uses true max of logical low? Wait low top valid is max of physical low valid? There may be pending stale values smaller, not top. The max of logical low is max of valid low elements, which is top if top valid. Good.

Now, if low top valid but there is a pending stale value equal to top? clean would have popped because c>0. So no.

Now, let's think about if `out` is less than or equal to low max but actually in high because high contains some values smaller than low max due to invariant violation from previous stale? We maintain invariant. okay.

Now, let's evaluate time of `float(-low[0])` each median. 200k conversions, fine. Could store as float in heap? Input floats, negative float. okay.

Now, if input ints, heap stores ints, median float conversion. good.

Now, one more optimization: For odd k, we don't need clean_high before median, but we call. In odd k with increasing sequence, high physical small, clean high dict get maybe miss. Fine. In odd k with decreasing sequence, high physical grows O(n), clean high top valid? For decreasing, outgoing largest from high accumulates stale not top? High min-heap: high contains largest half; outgoing largest is in high but not top? Top is smallest of high (boundary). Stale largest accumulates, high physical grows. clean_high top valid (small boundary), dict miss. So high heap grows, but we don't push to high? Incoming smallest goes low, move low->high? For decreasing, low physical small? Let's simulate: window decreasing [1000..1], high contains largest 500, outgoing 1000 (largest) in high not top? high top 501. Stale 1000 accumulates. Incoming 0 goes low, low_size? remove high -> low_size target, add low -> low_size target+1, move low top to high. Push to high log growing. So high heap grows. clean_high each iteration top valid. okay.

Now, total heap ops similar.

Now, could dictionary misses be expensive because dict huge? Dict get O(1) average, size doesn't matter much. okay.

Now, let's think if we can clear stale dict entries for non-top periodically? no need.

Now, final code maybe should include docstring? Not necessary, but okay. The prompt says code only. Docstring okay but no need.

Now, let's ensure no syntax errors.

Code:

from heapq import heapify, heappush, heappop

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
        return [(float(arr[mid - 1]) + float(arr[mid])) * 0.5]

    target_low = (k + 1) // 2
    arr = sorted(nums[:k])
    low = [-x for x in arr[:target_low]]
    high = arr[target_low:]
    heapify(low)
    heapify(high)

    low_size = target_low
    remove_low = {}
    remove_high = {}
    res = [0.0] * (n - k + 1)

    odd = k & 1
    if odd:
        res[0] = float(-low[0])
    else:
        res[0] = (float(-low[0]) + float(high[0])) * 0.5

    hp = heappush
    hpop = heappop

    def clean_low(_low=low, _rem=remove_low, _pop=hpop):
        while _low:
            v = -_low[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_low)
            else:
                break

    def clean_high(_high=high, _rem=remove_high, _pop=hpop):
        while _high:
            v = _high[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_high)
            else:
                break

    for i in range(k, n):
        out = nums[i - k]

        clean_low()
        clean_high()

        if low:
            low_max = -low[0]
            if out <= low_max:
                remove_low[out] = remove_low.get(out, 0) + 1
                low_size -= 1
            else:
                remove_high[out] = remove_high.get(out, 0) + 1
        else:
            remove_high[out] = remove_high.get(out, 0) + 1

        clean_low()
        clean_high()

        x = nums[i]
        if low and x <= -low[0]:
            hp(low, -x)
            low_size += 1
        else:
            hp(high, x)

        if low_size > target_low:
            clean_low()
            v = -hpop(low)
            hp(high, v)
            low_size -= 1
        elif low_size < target_low:
            clean_high()
            v = hpop(high)
            hp(low, -v)
            low_size += 1

        clean_low()
        clean_high()

        idx = i - k
        if odd:
            res[idx] = float(-low[0])
        else:
            res[idx] = (float(-low[0]) + float(high[0])) * 0.5

    return res

Syntax okay.

Potential issue: In `clean_low`, `_pop(_low)` uses `hpop` which is heapq.heappop. It pops and returns. Good.

Potential issue: In `clean_high`, `_pop(_high)`. Good.

Potential issue: In main loop, after `clean_low(); clean_high()`, if low is empty but low_size maybe not 0? Could misclassify out to high. If low_size not 0 but low empty inconsistency. no.

Potential issue: In add, `if low and x <= -low[0]:` If low is empty but low_size maybe 0, push high. Good. If low empty but high empty? k? For k>=2 after removal+clean total logical k-1, if both empty impossible. But if k=2 and after removal low empty high empty? total 1, so high has one. good.

Potential issue: In rebalance `if low_size > target_low`, we call clean_low, then `hpop(low)`. Suppose low top stale and clean_low pops it, but low_size still > target. If low now empty? no. But what if clean_low pops a stale top, and the next top is also stale but `_rem.get(v)` count 0? That would mean stale not tracked, impossible. If count >0, loop continues. Good.

Potential issue: We only rebalance one step with if. If low_size differs by more due to some unexpected, no. But maybe if k=2 and low_size after add can be 0 or 2, target1, diff1. good. If low_size before slide not balanced due to previous if not enough? no.

Now, let's consider if `remove_low` or `remove_high` keys are floats and we use negative of low top `v = -_low[0]`. If `_low[0]` is -x. For x = -5, _low[0]=5, v=-5. Good. If x is int, v int. Dictionary key from `out` maybe float  -5.0; int -5 equals. good.

Now, let's think about if `nums` contains complex? no.

Now, maybe the environment uses Python 3.11 and standard library. good.

Now, one subtle point: The median for odd k should be the single middle value. With low target ceil, low max is middle. For k=5 target3, low contains 3 smallest, max is 3rd smallest. good.

Now, let's think about if k even and low target = k/2, high target = k/2. low max is k/2-th smallest, high min is k/2+1-th. mean. good.

Now, let's consider possible overflow in `-x` for x = float('-inf'): -(-inf)=inf, heap stores inf? For max heap, if x=-inf, -x=inf, top? Min-heap with inf at bottom, okay. If x=inf, -x=-inf, top -inf, -low[0]=inf. good. If mix inf, comparisons okay. float conversion fine.

Now, if x = float('nan'), sorted behavior arbitrary, heap comparisons with nan undefined. Not required.

Now, final answer code block only. But before final, maybe we should consider if using `k == n` branch with `sorted(nums)` and returning median of whole list is correct if nums length k but k even. yes.

Now, could `k` be `len(nums)` but `k` even and `nums` empty? k=0 invalid. good.

Now, let's think about if hidden tests check that `sliding_median` does not mutate input. We don't mutate nums. We create sorted slices. Heaps new. good.

Now, potential issue: In k==n branch, `arr = sorted(nums)` if nums is not list but iterable, okay. But type list.

Now, let's think if we can improve by using `nums.__getitem__`? no.

Now, let's consider if the two heaps with lazy deletion might produce a result where low or high top is stale after final clean due to pending count for top value being zero but top value should be deleted? That would mean we scheduled deletion with a different key equality, e.g., nan. ignore.

Now, let's do a more formal invariant proof for ourselves:
- Logical heaps L,H are multisets partitioning current window, sizes |L|=target, |H|=k-target, and every l in L <= every h in H (except maybe equality split).
- Physical heaps P_L, P_H contain L plus pending deleted elements D_L, D_H. For each value v, count in D_L = remove_low[v]. Clean removes from P_L any v whose count >0 at top, decrementing count, not changing L.
- At start of iteration, clean tops ensures tops of P correspond to max L/min H if nonempty.
- Remove out: if L nonempty and out <= max L, by partition out in L; schedule D_L[out]++, |L|--; else out in H; schedule D_H[out]++, |H|--. This preserves partition (removing from one side cannot violate order). Clean tops (optional) ensures top valid.
- Add x: if L nonempty and x <= max L, x in L, |L|++; else x in H, |H|++. If L empty, x in H (temporary), |H|++. This may violate size but partition? If L empty and x in H, L empty, partition vacuous. If H empty and x in L, vacuous. If both nonempty and x <= max L, adding to L keeps max L same (since x <= old max) or if L empty? so order. If x > max L, adding to H keeps min H maybe x or old; since x > max L, order. If H empty, x > max L? If L nonempty and H empty, if x > max L push H, order; if x <= max L push L then size fix will move max to H, preserving.
- Rebalance sizes: If |L|>target, move max L to H. Since before partition, after move new max L <= moved <= min H (old min H or moved), order. If |L|<target, move min H to L. New max L = max(old max L, moved); since moved was min H, all H >= moved, and old max L <= moved? Wait before partition old max L <= old min H = moved (if moved top). So new max L = moved <= remaining H min (>= moved). order.
- Thus invariant.
Good.

Now, one nuance: In add step, if L nonempty and x <= max L, adding to L keeps max L same only if x <= old max L. yes. If x is nan no.

If L empty and we push x to H, partition vacuous. Then rebalance moves min H to L. The new L size may target. Does partition hold? H contains all elements. Moving min H to L makes L contain smallest target? Repeated? At most one move because |L|=target-1? If L empty after removal, |L| could be target-1 (if remove from low) or target? If L empty, |L|=0. For k>1, target could >1. Wait! Important: If L empty, low_size=0. But target_low could be >1 (e.g., k=5 target=3). Can low_size become 0 in one removal from a balanced state? Balanced low_size=target. Removing one element can reduce low_size to target-1, not 0, unless target=1. So low_size=0 only if target=1 (k=2) or after multiple? We rebalance each slide, so before slide low_size=target. Remove one from low -> target-1. For k=5 target3, low_size becomes2, not 0. Low physical empty? If low_size=2, low not empty. So low empty only target=1. Good. But what if low_size=2 but physical low empty? no.

If target>1, low won't be empty after one removal. So push rule low empty only k=2. But code handles general.

What if high empty? Balanced high size = k-target. For k=2, high size1. Remove one from high ->0. Add can. For k=3, high size1. Remove high ->0. Add. So high empty only if high target 1? k=2 or3. But code handles.

Now, if L empty and target>1 (shouldn't), pushing x to H and one rebalance move would not reach target; would need while. But can't happen. If we want robust, use while instead of if. Maybe use while for safety. The overhead of while condition is small. Could use while to handle any unexpected diff. But if diff >1, while could move multiple. It would call clean each time. I think while safer with negligible overhead (condition false usually). Use while? In Python, `while low_size > target_low:` loop check once. Same as if plus maybe. It may be slightly slower but safe. Given target maybe 1 and low_size could diff1. I can use while for robustness. The earlier if is okay. But if there is a bug causing diff2, while fixes. Let's use while? It adds a loop construct but condition false most times. In Python, while vs if: while checks condition, then body; if similar. Slight overhead. Fine. Use while for safety.

If using while, need ensure no infinite if low empty. But okay.

Rebalance:
        while low_size > target_low:
            clean_low()
            v = -hpop(low)
            hp(high, v)
            low_size -= 1
        while low_size < target_low:
            clean_high()
            v = hpop(high)
            hp(low, -v)
            low_size += 1

This can move multiple if needed. In normal case one or zero. Good.

Now, if low_size > target and low has stale top, clean pops. If after clean low empty but low_size > target, hpop error. But if diff large and physical low only stale? inconsistency. no.

Now, clean both after rebalance. Good.

Now, should we clean low/high before first median? Initialization no pending, no need. good.

Now, let's think about using `res[idx] = float(-low[0])` for odd. If low is empty? For k>=2 target>=1, low_size target, low nonempty. good.

Now, let's consider if `nums` is very large and k=1, we return list comprehension. If nums is list[float], length 200k, fine. If k=1, no heap.

Now, maybe hidden tests expect `ValueError` specifically not Exception. yes.

Now, final code with while rebalance. Let's adjust final.

Potential micro-optimization: In main loop, we call `clean_low(); clean_high()` before classification, then again after scheduling. Could combine: clean_low, classify, if removed low then clean_low else clean_high? But code simplicity. However, with while rebalance, total clean calls: 4 (2 before, 2 after) + rebalance source clean up to 1 + final 2 =7. okay.

Could remove initial clean_high if not needed? But okay.

Now, let's estimate runtime with 7*199k=1.4M function calls. clean functions while usually one iteration check. 1.4M calls okay. But each clean function call has Python function call overhead and while loop. 1.4M maybe ~0.3s. Heap ops maybe ~1s. Should be under 2.

If concerned, inline clean? Let's consider final code readability vs performance. The prompt says expert developer, efficient. Nested helper acceptable. But to be extra safe, we can inline cleaning in a local macro-like function? No.

Maybe we can reduce clean calls to 4 per iteration by cleaning only needed:
- clean_low at start.
- after scheduling: clean_low if removed low else clean_high? Actually if removed high, high top may be stale (if out was high top), so clean_high. If removed low, low top may be stale, clean_low. If out not top in that heap, clean does nothing. So we can do:
    removed_low_flag = False
    if low:
       low_max=-low[0]
       if out <= low_max:
           remove_low...; low_size-=1; removed_low_flag=True
       else:
           remove_high...
    else: remove_high...
    if removed_low_flag: clean_low()
    else: clean_high()
  But what if both heaps had stale tops before? We cleaned low at start, not high. If removed_low_flag True, high might have stale top from previous not cleaned? We clean high after rebalance every iteration, so at start high top valid. So no. If removed_low_flag False, low top valid from start, high may stale, clean_high. Good.
- Before add, need low top valid if low nonempty. If removed_low_flag True, clean_low done. If False, low valid. Good. Need high top if low empty? If low empty, removed_low_flag likely True? For k=2 remove low -> low empty, clean_low done. If low empty and removed_high? impossible. So push can use low if low nonempty.
- Rebalance: if low_size > target, need clean_low before pop. If low_size < target, need clean_high before pop. We can clean source inside.
- Before median: need clean_low; if even need clean_high. If odd, high not needed for median, but high top may be stale for future? We could defer cleaning high until next start if needed. But if odd and next iteration remove high classification? We only use high top if low empty? For odd k>=3, low nonempty always (target>=2) after rebalance, so classification uses low only. Rebalance may move high->low if low_size<target; then clean_high inside. Median odd doesn't need high. So we could skip clean_high for odd unless rebalance moved? But stale high top could remain; when later needed, clean. This could save calls. But complexity. Current simple fine.

Given 200k, simple passes.

Now, let's think about memory of `res = [0.0] * (n - k + 1)`. For n=200k, fine. If n huge, maybe, but spec.

Now, one more subtle issue: In clean functions, using default argument `_rem=remove_low` means if we reassign `remove_low` (we don't) it would not update. fine.

Now, if the function is called multiple times, default args bind new lists each call because functions defined inside each call. good.

Now, let's consider if `heapify` imported and used. good.

Now, maybe the judge runs with `python -OO`, assertions no. no asserts.

Now, let's think if there is any requirement to use only standard library. yes.

Now, final answer should be code block. Ensure no trailing explanation.

Before final, let's maybe run through a brute-force comparison mentally for all small arrays? Can't run, but we can reason. The algorithm is standard.

Potential hidden test: `nums = [1.5, 2.5, 3.5], k=2`. init sorted [1.5,2.5] low[1.5] high[2.5] med2.0. slide out1.5 in3.5: clean; out<=1.5 del_low low_size0; clean low empties; x3.5 low empty push high; low_size0<1 move high top? high has [2.5,3.5], top2.5 move low. med (2.5+3.5)/2=3.0. window [2.5,3.5]. good.

Hidden test: negative values. `[-5, -1, -3, 2], k=3`. init sorted [-5,-3,-1] low [-5,-3] max -3 high[-1] med -3. i=3 out -5 in2: clean; out -5 <= -3 del_low low_size1; clean low top -3 (pending -5 not). x2 low max -3 -> push high; low_size1<2 move high top -1 to low. low physical stale -5, valid -3, -1 max -1; high [2]; median -1. window [-3,-1,2] sorted[-3,-1,2] median -1. good.

Hidden test: all same large count. works.

Now, let's consider if input list is modified during iteration? We assume not. If caller modifies, no guarantee.

Now, maybe we should use `len(nums)` and if `k` is float? no.

Now, one possible improvement: For k==n branch, if k is even and arr[mid-1] + arr[mid] could be int, *0.5 float. good.

Now, final code with while rebalance:

```python
from heapq import heapify, heappush, heappop

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
        return [(float(arr[mid - 1]) + float(arr[mid])) * 0.5]

    target_low = (k + 1) // 2
    arr = sorted(nums[:k])
    low = [-x for x in arr[:target_low]]
    high = arr[target_low:]
    heapify(low)
    heapify(high)

    low_size = target_low
    remove_low = {}
    remove_high = {}
    res = [0.0] * (n - k + 1)
    odd = k & 1

    if odd:
        res[0] = float(-low[0])
    else:
        res[0] = (float(-low[0]) + float(high[0])) * 0.5

    hp = heappush
    hpop = heappop

    def clean_low(_low=low, _rem=remove_low, _pop=hpop):
        while _low:
            v = -_low[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_low)
            else:
                break

    def clean_high(_high=high, _rem=remove_high, _pop=hpop):
        while _high:
            v = _high[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_high)
            else:
                break

    for i in range(k, n):
        out = nums[i - k]

        clean_low()
        clean_high()

        if low:
            low_max = -low[0]
            if out <= low_max:
                remove_low[out] = remove_low.get(out, 0) + 1
                low_size -= 1
            else:
                remove_high[out] = remove_high.get(out, 0) + 1
        else:
            remove_high[out] = remove_high.get(out, 0) + 1

        clean_low()
        clean_high()

        x = nums[i]
        if low and x <= -low[0]:
            hp(low, -x)
            low_size += 1
        else:
            hp(high, x)

        while low_size > target_low:
            clean_low()
            v = -hpop(low)
            hp(high, v)
            low_size -= 1

        while low_size < target_low:
            clean_high()
            v = hpop(high)
            hp(low, -v)
            low_size += 1

        clean_low()
        clean_high()

        idx = i - k
        if odd:
            res[idx] = float(-low[0])
        else:
            res[idx] = (float(-low[0]) + float(high[0])) * 0.5

    return res
```

Now, let's consider if `while low_size > target_low` could loop multiple times and call clean_low each time. If low_size diff multiple, after first move low_size--, still >target, clean_low again. Fine. But if low top stale, clean pops. Good.

Now, maybe `clean_low()` in while low_size > target could be called when low is empty if low_size incorrectly >target. no.

Now, one subtle performance issue: In the main loop, after `clean_low(); clean_high()`, we then if low and out <= low_max. But if low is empty, we schedule high. However, if low is empty but `low_size` >0? no. If low empty and high also empty? no.

Now, let's think about if `out` is a value that has pending deletion in both heaps? Could happen for equal values. We schedule one more in one heap based on classification. Clean functions handle counts.

Now, consider a value v with pending deletion in low, and out=v again (another occurrence leaving). Classification may put in low if v <= low max. This increments low count. If v is actually the occurrence in high? If v == low max, there is at least one v in low. If the leaving v is conceptually the high occurrence, we still delete low. The multiset logical low loses a v, high keeps its v. If the actual leaving was high, then logical high should lose a v, but we instead lose low. Does that matter? The partition invariant with equal values allows any split of equal values between halves as long as sizes. If there are v's in both, moving which one is deleted doesn't affect multiset of window? Let's examine: Window has multiple v. We need remove one v. The logical partition before removal has some number a of v in low, b in high. If we remove from low when we could remove from high, new partition has a-1 low, b high. The true window has total a+b-1 v. The partition still valid (all low <= high) and sizes correct. It doesn't matter which equal value was removed. So safe.

Now, if v < low max, there cannot be v in high (unless invariant violation), so safe. If v > low max, schedule high.

Now, what if low max = v but a=0? impossible because low max v means a>0.

Now, all good.

Let's consider if `remove_low` dictionary count for a value can become negative? No.

Now, one more thought: The clean functions pop stale elements but do not remove the value from logical heap; but logical sizes not updated. However, when a stale element is popped, if it is the top and there are pending counts, we decrement dict. But what about the logical heap size? It was already decremented when scheduled. Good. But what about the partition invariant with logical heaps after cleaning stale top? Cleaning stale top removes an element from physical, not logical. It doesn't change logical. The logical heap did not contain that stale element. So invariant unchanged. Good.

Now, potential issue: The physical heap top after cleaning may not be the max of logical low if there are stale elements not at top but larger than valid? In max-heap, top is largest physical. If top is valid (no pending), any stale not top is smaller than top. So top is max of physical, and since stale are not logical, top is max of logical? What if there is a logical element larger than top but hidden by stale? Heap property: top is minimum of negatives = maximum of originals among all physical elements. If a logical element larger exists, it would be in heap and be top unless a stale larger exists. If stale larger exists, top would be stale and cleaned. After cleaning all stale tops, top valid and no physical element larger (else top larger). So top max logical. Good.

For high min-heap analogous.

Now, let's think about if there are stale elements with same value as top valid and pending count 0? If pending count 0, not stale. If same value and one stale, one valid, pending count 1. clean pops one, stops, top may still same value valid. Good.

Now, final code seems solid.

But let's revisit the requirement: "Must be efficient: n = 200_000 with k = 1_000 must finish in well under 2 seconds on a normal PC." Our algorithm with nested functions maybe okay. But can we make it even faster by using an alternative based on two heaps but with no function calls? Let's evaluate if necessary.

We can inline clean loops to reduce function call overhead and perhaps pass time more safely. But code becomes repetitive. We can maybe define a local function and accept. If I want to be extra safe, I can inline the clean loops using a small helper? The final code length not a problem. Let's consider writing an inline version with a local `while` repeated. It would be longer but faster. Is there a risk of bugs from copy-paste? We can manage.

Inline version main loop:
        out = nums[i-k]
        # clean low
        while low:
            v = -low[0]
            c = remove_low.get(v)
            if c:
                if c == 1: del remove_low[v]
                else: remove_low[v] = c - 1
                hpop(low)
            else: break
        # clean high
        while high:
            v = high[0]
            c = remove_high.get(v)
            if c:
                if c == 1: del remove_high[v]
                else: remove_high[v] = c - 1
                hpop(high)
            else: break
        ...
        # clean low/high again repeated
This is 5 times (start low/high, after removal low/high, rebalance source, final low/high). Copy-paste lengthy. Could create a single function to clean both? That would be function call anyway. Nested functions okay.

Maybe use a generic `clean(heap, rem, neg=False)`? More overhead. Separate default funcs best.

I think nested functions pass.

Now, let's think about if `heapq.heappop` called inside clean default `_pop` but we also use `hpop` in main. Good.

Now, potential issue: In `clean_low`, `_pop(_low)` will pop and return the smallest negative. If the heap is large, okay. But we ignore the returned value; could there be a stale value not equal to v due to mutation? no.

Now, maybe use `_pop(_low)` without capturing return is fine.

Now, let's consider if Python's `del _rem[v]` inside default function with `_rem` local dict. okay.

Now, if count `c` is large, `c == 1` branch. good.

Now, maybe hidden tests use `k` as 0 and `nums` empty. We raise ValueError. good.

Now, final answer. Ensure code block only. Use triple backticks python.

Double-check no input/print. yes.

Let's maybe add a docstring? Not necessary. If include, still code. But no.

One last thought: The `k == n` branch returns list of one float. If `k` is even and `arr[mid - 1]` and `arr[mid]` are ints, `float` conversion. good. If `k` is odd and arr[mid] is int, float. good.

Now, if `nums` is a list of floats but `k==n` and n=200_000, sorting entire list maybe O(n log n). Could we instead use `heapq.nlargest`? no. Sorting is fine. But the heap algorithm with k=n would also sort first k. So same.

Now, what if `n-k+1` is 1 but k != n? That implies k=n. So branch covers single window.

Now, maybe if k is very close to n, e.g., n=200k k=199999, two windows. Our heap init sort 199999, then one slide. Good. The physical heap growth minimal. Time dominated sort. okay.

Now, let's consider if we can use `statistics.median`? no, too slow per window.

Now, final.
