The user wants a sliding window median function. Let me think about the efficient approach.

For n=200,000 and k=1,000, I need something better than O(n*k log k) which would be ~200,000 * 1000 * log(1000) ≈ 2 billion operations - too slow.

I need O(n log k) or O(n log n) approach.

The classic approach is to use two heaps (or two sorted structures) to maintain the median of a sliding window:
- A max-heap for the lower half
- A min-heap for the upper half

But Python's heapq is a min-heap, so I'll negate values for the max-heap.

The challenge with sliding window + heaps is lazy deletion (removing elements that slide out of the window).

Approach:
1. Maintain two heaps: `lo` (max-heap, negated values) and `hi` (min-heap)
2. Use a "to_remove" dictionary to track lazy deletions
3. When an element leaves the window, mark it for removal
4. When adding a new element, add it to the appropriate heap
5. Balance the heaps so sizes differ by at most 1
6. Clean up heap tops when they match elements marked for removal

Let me think about the balance:
- For odd k: len(lo) = len(hi) + 1 (median is lo's top)
- For even k: len(lo) == len(hi) (median is average of both tops)

Actually, let me reconsider. The standard approach:
- `lo` is a max-heap (negated), contains the smaller half
- `hi` is a min-heap, contains the larger half
- Invariant: len(lo) >= len(hi) and len(lo) - len(hi) <= 1
- For odd k: k = 2m+1, len(lo) = m+1, len(hi) = m, median = -lo[0]
- For even k: k = 2m, len(lo) = m, len(hi) = m, median = (-lo[0] + hi[0]) / 2

Lazy deletion approach:
- `to_remove` is a dict mapping value -> count
- When we remove an element, we increment `to_remove[value]`
- When we need the top of a heap, we check if the top is in `to_remove`; if so, pop it and decrement the count
- We also need to track the "effective size" of each heap (actual size minus number of pending removals)

Let me think more carefully:

Actually, let me use a slightly different approach. I'll track:
- `lo`: max-heap (negated values)
- `hi`: min-heap
- `to_remove`: Counter/dict of values to remove (lazy)
- `lo_size`, `hi_size`: effective sizes (accounting for lazy deletions)

When we "remove" a value:
- Increment `to_remove[value]`
- Decrement the appropriate size (we need to know which heap it's in... hmm, this is tricky)

Alternative: When removing, we don't know which heap it's in. So we just mark it for removal and decrement a total count. Then when we need to clean a heap top, we check if it's marked.

Wait, let me think differently. 

Actually, a cleaner approach:

Maintain:
- `lo`: max-heap (negated), effective size `lo_sz`
- `hi`: min-heap, effective size `hi_sz`
- `to_remove`: dict value -> count

When removing value `x`:
- `to_remove[x] += 1`
- But we don't know which heap it's in. So we decrement... hmm.

Actually, the standard approach for sliding window median with two heaps and lazy deletion:

1. When adding an element, determine which heap it goes to based on comparison with heap tops.
2. When removing an element, just mark it in `to_remove` and track which heap it was in (we can track this by checking against the current tops, or we can just decrement a size counter for the heap it was added to... but that's complex).

Let me use a different strategy:

- Track `lo_sz` and `hi_sz` as the number of elements that *belong* to each heap (not the actual heap size).
- When adding:
  - If `hi` is empty or `x >= hi[0]`: push to `hi`, `hi_sz += 1`
  - Else: push to `lo`, `lo_sz += 1`
  - Then rebalance.
- When removing (value `x`):
  - `to_remove[x] += 1`
  - We need to decrement the size of whichever heap `x` is in. But we don't know!
  
Hmm, this is the classic problem. One solution: when removing, check if `x` is in `lo` or `hi` by comparing with the tops. But that's not reliable.

Better solution: Just decrement the size of the heap where the element was. We can track this by: when we add to a heap, we know. But with lazy deletion, an element might have been "moved" logically... no, with this approach elements don't move between heaps.

Actually wait - in the two-heap sliding window approach, elements DO get moved between heaps during rebalancing. So tracking which heap an element is in is tricky.

Let me use the simplest correct approach:

When removing element `x`:
- `to_remove[x] += 1`
- We don't know which heap it's in, so we just track total removals.

Actually, I think the cleanest approach is:

- `lo_sz` and `hi_sz` represent the effective sizes.
- When adding `x`:
  - If `x <= -lo[0]` (or lo is empty): heappush(lo, -x), lo_sz += 1
  - Else: heappush(hi, x), hi_sz += 1
  - Rebalance: if lo_sz > hi_sz + 1, move from lo to hi. If hi_sz > lo_sz, move from hi to lo.
  
  Wait, but during rebalancing, we pop from one and push to the other. We need to handle lazy deletion during these pops.

- When removing `x` (sliding out):
  - `to_remove[x] += 1`
  - We need to figure out which heap it belongs to. 
  
  The trick: we can determine which heap it's in by checking if it's "less than or equal to" the boundary. But that's not precise either.

Alternative simpler approach: When removing, just decrement `lo_sz` if `x <= -lo[0]` (after cleaning lo's top) and `hi_sz` otherwise. But this isn't always correct because the heap might have been rebalanced.

OK let me think about this differently. 

The cleanest approach I've seen:

```
def clean(heap, to_remove):
    while heap and to_remove.get(-heap[0] if heap is lo else heap[0], 0) > 0:
        val = -heap.pop(0) if heap is lo else heap.pop(0)
        to_remove[val] -= 1
```

Wait, let me just be more careful.

Let me define:
- `lo`: max-heap (store negated values), so the median candidate is `-lo[0]`
- `hi`: min-heap, so the median candidate is `hi[0]`
- `to_remove`: dict mapping value to count of pending removals
- `lo_sz`: effective size of lo (number of elements that logically belong to lo)
- `hi_sz`: effective size of hi

Invariant: `lo_sz + hi_sz = current window size`, and `lo_sz - hi_sz` is 0 or 1.

`clean_top(heap, is_lo)`:
```
while heap:
    val = -heap[0] if is_lo else heap[0]
    if to_remove.get(val, 0) > 0:
        heapq.heappop(heap)
        to_remove[val] -= 1
    else:
        break
```

But wait, when we clean, we should also decrement the size counter. Hmm, but we only clean when we need to access the top.

Let me reconsider. I'll track sizes explicitly and only clean when needed:

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    
    result = []
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0
    
    def clean_top(heap, is_lo):
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if to_remove.get(val, 0) > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
                # size already decremented when we marked for removal
            else:
                break
    
    # ... 
```

Hmm, the size management is getting complicated. Let me think about when to decrement sizes.

When we mark an element for removal, we should decrement the size of the heap it's in. But we don't know which heap it's in!

Solution: When removing element `x`:
- `to_remove[x] += 1`
- If `x <= current_lo_top` (after cleaning): decrement `lo_sz`
- Else: decrement `hi_sz`

But "current_lo_top" might not be accurate if there are pending removals at the top. So we need to clean first.

Actually, I think a simpler approach: since we process windows left to right, when element at index `i` leaves, we know it was added at some point. But tracking exactly which heap it's in is the issue.

Let me try yet another approach. I'll just always add to one heap and rebalance:

```python
def add(x):
    nonlocal lo_sz, hi_sz
    if hi_sz == 0 or x >= hi[0]:  # after cleaning hi's top
        heapq.heappush(hi, x)
        hi_sz += 1
    else:
        heapq.heappush(lo, -x)
        lo_sz += 1
    rebalance()

def remove(x):
    nonlocal lo_sz, hi_sz
    to_remove[x] += 1
    # Determine which heap x is in
    clean_top(lo, True)
    if hi and x >= hi[0]:  # x is in hi (or could be in either if x == boundary)
        hi_sz -= 1
    else:
        lo_sz -= 1
    rebalance()
```

Wait, this isn't quite right either. If `x == hi[0]` and `x` is actually in `lo`... no, if `x >= hi[0]` after cleaning, it should be in `hi`. But what if `x` is in `lo` but `x >= hi[0]`? That can't happen because of the invariant that all elements in `lo` are <= all elements in `hi`.

Wait, is that invariant maintained? With lazy deletion, we might have stale elements. But the invariant should hold for the "effective" elements.

Hmm, let me think about this more carefully.

Actually, I think the issue is: after rebalancing, all effective elements in `lo` should be <= all effective elements in `hi`. Stale elements (marked for removal) can violate this, but that's OK because they'll be cleaned up eventually.

So when removing `x`:
- Clean tops
- If `x <= -lo[0]`: it must be in `lo`, so `lo_sz -= 1`
- Else: it must be in `hi`, so `hi_sz -= 1`

Wait, what if `lo` is empty (all elements removed)? Then it must be in `hi`.

Let me also consider: what if `x` equals the boundary? E.g., `x == -lo[0] == hi[0]`. In this case, `x` could be in either heap. But since we're just decrementing a size, it doesn't matter which we pick as long as we're consistent.

Actually, it does matter for correctness of the invariant. Let me think...

If `x == -lo[0]` and `x` is actually in `hi`, and we decrement `lo_sz`, then `lo_sz` becomes too small. But then rebalancing would fix it.

Hmm, actually I think there's a subtlety. Let me just go with: if `x <= -lo[0]` (after cleaning lo's top), put in lo. Otherwise in hi. If lo is empty, put in hi. If hi is empty, put in lo.

Let me also handle the edge case where after cleaning, the heap is empty.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    result = []
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0
    
    def clean(heap, is_lo):
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if to_remove.get(val, 0) > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
            else:
                break
    
    def rebalance():
        nonlocal lo_sz, hi_sz
        # Target: lo_sz should be hi_sz or hi_sz + 1
        # Actually for odd k: lo_sz = (k+1)//2, hi_sz = (k-1)//2
        # For even k: lo_sz = k//2, hi_sz = k//2
        # General: lo_sz should be (k+1)//2 ... wait no, window size changes during processing.
        
        # Actually, lo_sz + hi_sz = current window size (which is always k after initial fill)
        # We want lo_sz - hi_sz in {0, 1}
        
        while lo_sz > hi_sz + 1:
            clean(lo, True)
            val = -heapq.heappop(lo)
            lo_sz -= 1
            heapq.heappush(hi, val)
            hi_sz += 1
        while hi_sz > lo_sz:
            clean(hi, False)
            val = heapq.heappop(hi)
            hi_sz -= 1
            heapq.heappush(lo, -val)
            lo_sz += 1
    
    # Initial fill
    for i in range(k):
        if hi_sz == 0 or nums[i] >= hi[0]:
            heapq.heappush(hi, nums[i])
            hi_sz += 1
        else:
            heapq.heappush(lo, -nums[i])
            lo_sz += 1
        rebalance()
    
    # Compute first median
    clean(lo, True)
    clean(hi, False)
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2)
    
    # Slide
    for i in range(k, n):
        # Remove nums[i-k]
        old = nums[i - k]
        to_remove[old] += 1
        # Determine which heap old is in
        clean(lo, True)
        if lo and old <= -lo[0]:
            lo_sz -= 1
        else:
            hi_sz -= 1
        
        # Add nums[i]
        x = nums[i]
        if hi_sz == 0 or x >= (hi[0] if hi else float('inf')):
            # need to clean hi first
            clean(hi, False)
            heapq.heappush(hi, x)
            hi_sz += 1
        else:
            clean(lo, True)
            heapq.heappush(lo, -x)
            lo_sz += 1
        
        rebalance()
        
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2)
    
    return result
```

Wait, I need to be more careful. Let me reconsider.

When adding `x`, I compare with `hi[0]`. But `hi[0]` might be stale. So I should clean `hi` first.

Also, when determining which heap `old` belongs to, I compare with `-lo[0]`. But I should clean `lo` first.

Let me also reconsider the rebalance condition. During the sliding phase, the window size is always `k`, so `lo_sz + hi_sz = k`. We want:
- If k is odd: `lo_sz = (k+1)//2`, `hi_sz = (k-1)//2`
- If k is even: `lo_sz = k//2`, `hi_sz = k//2`

So the target for `lo_sz` is `(k+1)//2` in both cases. Let me just use:
- `lo_sz` should be `hi_sz` or `hi_sz + 1`

Which means:
- If `lo_sz > hi_sz + 1`: move from lo to hi
- If `hi_sz > lo_sz`: move from hi to lo

This should work.

Let me also think about performance. For n=200,000 and k=1,000:
- We do n-k+1 ≈ 200,000 iterations
- Each iteration: O(log k) for heap operations
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations

That should be well within 2 seconds in Python.

But wait, the lazy deletion might cause issues. If we don't clean aggressively, heaps could grow. But since we clean tops each iteration, and we only add one and remove one per iteration, the heaps should stay bounded.

Actually, I realize there might be an issue with my approach. When I do `clean(lo, True)` in the removal step, I'm cleaning the top of `lo`. But the element `old` might be buried deep in the heap, not at the top. That's fine - the lazy deletion handles that. We just mark it and it'll be cleaned when it reaches the top.

But there's a subtle issue: when I determine which heap `old` is in by comparing with `-lo[0]`, I need to make sure `-lo[0]` is the effective top (after cleaning). Let me make sure I clean before comparing.

Let me also think about a potential issue: what if `old` is in `lo` but there are stale elements on top of `lo`? After cleaning, the top of `lo` might change, and `old` might now be greater than the new top. But that's fine - `old` is still logically in `lo` because of the invariant.

Wait, no. The invariant is about effective elements. Stale elements don't count. So after cleaning, `-lo[0]` is the max effective element in `lo`. And `old` is an effective element (it's being removed now). If `old <= -lo[0]`, then `old` is in `lo` (or could be equal to the boundary and in either). If `old > -lo[0]`, then `old` must be in `hi`.

But what if `old == -lo[0]`? It could be in either heap. Let's just say it's in `lo`. That's fine.

What if `lo` is empty after cleaning? Then `old` must be in `hi`.

OK I think my logic is correct. Let me also handle the edge case where after cleaning, a heap is empty.

Actually wait, there's another issue. When I compare `x >= hi[0]` for insertion, I should clean `hi` first. But what if after cleaning, `hi` is empty? Then `x` should go to `lo`.

Let me rewrite more carefully:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    result = []
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0
    
    def clean(heap, is_lo):
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if to_remove.get(val, 0) > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
            else:
                break
    
    def rebalance():
        nonlocal lo_sz, hi_sz
        while lo_sz > hi_sz + 1:
            clean(lo, True)
            val = -heapq.heappop(lo)
            lo_sz -= 1
            heapq.heappush(hi, val)
            hi_sz += 1
        while hi_sz > lo_sz:
            clean(hi, False)
            val = heapq.heappop(hi)
            hi_sz -= 1
            heapq.heappush(lo, -val)
            lo_sz += 1
    
    def get_median():
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2
    
    # Initial fill
    for i in range(k):
        clean(hi, False)
        if hi_sz > 0 and nums[i] >= hi[0]:
            heapq.heappush(hi, nums[i])
            hi_sz += 1
        else:
            heapq.heappush(lo, -nums[i])
            lo_sz += 1
        rebalance()
    
    result.append(get_median())
    
    # Slide
    for i in range(k, n):
        # Remove nums[i-k]
        old = nums[i - k]
        to_remove[old] += 1
        clean(lo, True)
        if lo_sz > 0 and old <= -lo[0]:
            lo_sz -= 1
        else:
            hi_sz -= 1
        
        # Add nums[i]
        x = nums[i]
        clean(hi, False)
        if hi_sz > 0 and x >= hi[0]:
            heapq.heappush(hi, x)
            hi_sz += 1
        else:
            heapq.heappush(lo, -x)
            lo_sz += 1
        
        rebalance()
        result.append(get_median())
    
    return result
```

Hmm wait, I think there might be an issue with the initial fill. During initial fill, `hi_sz` starts at 0. So the first element goes to `lo`. Then we rebalance. Let me trace through:

k=3, nums = [1, 2, 3]

i=0: hi_sz=0, so push to lo. lo=[-1], lo_sz=1, hi_sz=0. Rebalance: lo_sz(1) > hi_sz(0)+1? No. hi_sz(0) > lo_sz(1)? No. OK.

i=1: clean hi (empty). hi_sz=0, so push to lo. lo=[-2,-1], lo_sz=2, hi_sz=0. Rebalance: lo_sz(2) > hi_sz(0)+1? Yes. Pop lo: val=1, lo_sz=1. Push to hi: hi=[1], hi_sz=1. Now lo_sz(1) > hi_sz(1)+1? No. hi_sz(1) > lo_sz(1)? No.

i=2: clean hi: hi[0]=1, to_remove[1]=0, OK. hi_sz=1, x=3 >= 1. Push to hi. hi=[1,3], hi_sz=2. lo_sz=1. Rebalance: lo_sz(1) > hi_sz(2)+1? No. hi_sz(2) > lo_sz(1)? Yes. Pop hi: val=1, hi_sz=1. Push to lo: lo=[-1,-1], lo_sz=2. Now lo_sz(2) > hi_sz(1)+1? No. hi_sz(1) > lo_sz(2)? No.

State: lo=[-1,-1] (effective: {1,1}), hi=[3] (effective: {3}). lo_sz=2, hi_sz=1.
Median: k=3 odd, so -lo[0] = 1. Correct! (median of [1,2,3] is 2... wait that's wrong!)

Wait, I made an error. Let me retrace.

k=3, nums = [1, 2, 3]

i=0: x=1. hi_sz=0, so push -1 to lo. lo=[-1], lo_sz=1, hi_sz=0.
Rebalance: lo_sz=1 > hi_sz=0 + 1? 1 > 1? No. hi_sz=0 > lo_sz=1? No.

i=1: x=2. Clean hi (empty). hi_sz=0, so push -2 to lo. lo=[-2,-1], lo_sz=2, hi_sz=0.
Rebalance: lo_sz=2 > hi_sz=0 + 1? 2 > 1? Yes.
  Clean lo: lo[0]=-2, val=2, to_remove[2]=0. OK.
  Pop lo: val=2. lo=[-1], lo_sz=1. Push 2 to hi: hi=[2], hi_sz=1.
  lo_sz=1 > hi_sz=1 + 1? 1 > 2? No. hi_sz=1 > lo_sz=1? No.

i=2: x=3. Clean hi: hi[0]=2, to_remove[2]=0. OK. hi_sz=1 > 0, x=3 >= hi[0]=2. Push 3 to hi: hi=[2,3], hi_sz=2.
Rebalance: lo_sz=1 > hi_sz=2 + 1? 1 > 3? No. hi_sz=2 > lo_sz=1? Yes.
  Clean hi: hi[0]=2, to_remove[2]=0. OK.
  Pop hi: val=2. hi=[3], hi_sz=1. Push -2 to lo: lo=[-2,-1], lo_sz=2.
  lo_sz=2 > hi_sz=1 + 1? 2 > 2? No. hi_sz=1 > lo_sz=2? No.

State: lo=[-2,-1] (effective: {1,2}), hi=[3] (effective: {3}). lo_sz=2, hi_sz=1.
Median: k=3 odd, -lo[0] = 2. Correct!

Let me try k=2, nums = [1, 3, 2]:

i=0: x=1. hi_sz=0, push to lo. lo=[-1], lo_sz=1, hi_sz=0.
Rebalance: 1 > 1? No. 0 > 1? No.

i=1: x=3. Clean hi (empty). hi_sz=0, push to lo. lo=[-3,-1], lo_sz=2, hi_sz=0.
Rebalance: lo_sz=2 > hi_sz=0+1? 2>1? Yes.
  Clean lo: lo[0]=-3, val=3, to_remove[3]=0. Pop: val=3, lo=[-1], lo_sz=1. Push 3 to hi: hi=[3], hi_sz=1.
  1 > 2? No. 1 > 1? No.

State: lo=[-1] ({1}), hi=[3] ({3}). lo_sz=1, hi_sz=1.
Median: k=2 even, (-lo[0]+hi[0])/2 = (1+3)/2 = 2. Correct!

Now slide: i=2, old=nums[0]=1, x=nums[2]=2.
Remove 1: to_remove[1]=1. Clean lo: lo[0]=-1, val=1, to_remove[1]=1>0. Pop lo: lo=[], to_remove[1]=0. lo_sz is still 1 (we'll decrement). 
lo_sz > 0 and old(1) <= -lo[0]? lo is empty now! So hi_sz -= 1. hi_sz=0.

Wait, that's wrong. 1 was in lo (lo=[-1] before cleaning). After cleaning lo becomes empty. But we should have decremented lo_sz, not hi_sz.

The issue: I'm cleaning lo before checking, and after cleaning, lo is empty, so I fall through to the else and decrement hi_sz. But 1 was in lo!

Fix: I should check before cleaning, or handle the empty case differently.

Alternative: Check if `old <= -lo[0]` BEFORE cleaning. But then `-lo[0]` might be stale.

Better approach: Don't clean before the comparison. Just compare with the current top (even if stale). If the top is stale and we clean it later, the comparison might be off.

Hmm, actually let me think about this differently. The issue is that after cleaning, the heap might be empty even though there are still effective elements in it (just not at the top... wait no, if we cleaned all the tops, the remaining elements are all effective).

Wait no. In my example: lo=[-1], lo_sz=1. We mark 1 for removal. Clean lo: pop -1 (since to_remove[1]>0). Now lo=[] but lo_sz is still 1 (we haven't decremented yet). The effective element 1 is "in" lo logically.

So the check should be: if `lo_sz > 0 and (lo is empty or old <= -lo[0])` then old is in lo.

Wait, that doesn't work either because lo could be empty due to cleaning but still have effective elements... no, if lo is empty after cleaning, it means all elements that were at the top and got cleaned were the only ones. But there could be more elements below that are also stale.

Actually, I think the issue is simpler. Let me reconsider.

When we have lo=[-1] and lo_sz=1, and we mark 1 for removal:
- The element 1 IS in lo (it's the only element).
- After cleaning, lo is empty.
- We should decrement lo_sz.

So the check should be: if `lo_sz > 0` AND (lo is empty OR `old <= -lo[0]`), then old is in lo.

But wait, what if lo has elements [5, 3] (negated: [-5, -3], so lo[0]=-5, meaning max is 5), and lo_sz=2, hi=[7], hi_sz=1. Now we remove 3. 
- Clean lo: lo[0]=-5, val=5, to_remove[5]=0. Stop.
- old=3 <= -lo[0]=5? Yes. So lo_sz -= 1. Correct!

What if lo=[5, 3] and we remove 5?
- Clean lo: lo[0]=-5, val=5, to_remove[5]=1>0. Pop. lo=[-3]. to_remove[5]=0.
- Now lo[0]=-3, val=3, to_remove[3]=0. Stop.
- old=5 <= -lo[0]=3? No! So we'd say old is in hi. But it's not!

This is the bug. After cleaning, the top changed, and now old > new top.

The fix: compare with the top BEFORE cleaning, or use a different strategy.

Alternative: Compare with the top before cleaning:
- old=5, lo[0]=-5 (before cleaning), -lo[0]=5. old <= 5? Yes. lo_sz -= 1. Correct!

So I should NOT clean before the comparison. Let me adjust:

```python
# Remove nums[i-k]
old = nums[i - k]
to_remove[old] += 1
if lo_sz > 0 and (not lo or old <= -lo[0]):
    lo_sz -= 1
else:
    hi_sz -= 1
```

Wait, but if lo[0] is stale (marked for removal), the comparison might be wrong. Example:
- lo=[-5, -3], lo_sz=2. 5 is marked for removal (but not yet cleaned from heap).
- We're removing 3.
- lo[0]=-5, -lo[0]=5. old=3 <= 5? Yes. lo_sz -= 1. Correct! (3 is in lo)

Another example:
- lo=[-5, -3], lo_sz=2. 5 is marked for removal.
- We're removing 5.
- lo[0]=-5, -lo[0]=5. old=5 <= 5? Yes. lo_sz -= 1. Correct!

Another:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 5 is marked for removal (from a previous window).
- We're removing 9.
- lo[0]=-5, -lo[0]=5. old=9 <= 5? No. hi_sz -= 1. Correct!

What about:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 3 is in lo, 7 is in hi.
- We're removing 3.
- lo[0]=-5, -lo[0]=5. old=3 <= 5? Yes. lo_sz -= 1. Correct!

What about:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 5 is marked for removal.
- We're removing 7.
- lo[0]=-5 (stale), -lo[0]=5. old=7 <= 5? No. hi_sz -= 1. Correct!

What about:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 5 is marked for removal.
- We're removing 9.
- lo[0]=-5 (stale), -lo[0]=5. old=9 <= 5? No. hi_sz -= 1. Correct!

What about a trickier case:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 5 and 3 are both in lo. 5 is marked for removal.
- We're removing 3.
- lo[0]=-5 (stale), -lo[0]=5. old=3 <= 5? Yes. lo_sz -= 1. Correct!

What about:
- lo=[-5, -3], hi=[7, 9], lo_sz=2, hi_sz=2.
- 5 is in lo, 7 is in hi. 5 is marked for removal.
- We're removing 7.
- lo[0]=-5 (stale), -lo[0]=5. old=7 <= 5? No. hi_sz -= 1. Correct!

What if the stale top makes the comparison wrong?
- lo=[-10, -5], hi=[12, 15], lo_sz=2, hi_sz=2.
- 10 is in lo, marked for removal.
- We're removing 12.
- lo[0]=-10 (stale), -lo[0]=10. old=12 <= 10? No. hi_sz -= 1. Correct!

- lo=[-10, -5], hi=[12, 15], lo_sz=2, hi_sz=2.
- 10 is in lo, marked for removal.
- We're removing 5.
- lo[0]=-10 (stale), -lo[0]=10. old=5 <= 10? Yes. lo_sz -= 1. Correct!

I think comparing with the (possibly stale) top works because:
- If old is in lo, then old <= max(lo). The stale top might be larger than the effective max, but old is still <= stale top (since old <= effective max <= stale top... wait, is that true? The stale element at the top is >= all elements below it in the max-heap. So stale top >= effective max. And old (if in lo) <= effective max <= stale top. Yes!)
- If old is in hi, then old >= min(hi) >= max(lo) (effective). The stale top of lo could be larger or smaller... 

Wait, can the stale top of lo be LARGER than an element in hi? Yes! If we had [1, 2, 3, 4] with k=4, and 1 and 2 are in lo, 3 and 4 in hi. Then 1 is removed (marked). Now lo's top is still 2 (or 1 if it's at the top). Actually in a max-heap with [1,2], the top is 2. So lo[0] = -2 (negated), -lo[0] = 2. If we're removing 3 (from hi), 3 <= 2? No. Correct!

But what if lo = [3, 1] (max-heap, so 3 is at top) and hi = [4, 5]? And 3 is marked for removal. Now we're removing 4.
- lo[0] = -3, -lo[0] = 3. old=4 <= 3? No. hi_sz -= 1. Correct!

What if lo = [3, 1] and hi = [2, 5]? (This violates the invariant that all lo elements <= all hi elements... wait, 3 > 2. That shouldn't happen if the invariant is maintained.)

Actually, with lazy deletion, the invariant can be temporarily violated by stale elements. But effective elements should maintain the invariant.

I think the key insight is: if old is in lo, then old <= max(effective elements in lo) <= max(all elements in lo including stale) = -lo[0] (before cleaning, since the max-heap property means the root is the max of ALL elements, stale or not).

Wait, is that true? In a max-heap, the root IS the maximum of all elements in the heap. So -lo[0] is the max of all elements in lo (stale or not). And old (if in lo) is one of those elements, so old <= -lo[0]. ✓

If old is in hi, then old >= min(effective elements in hi) >= max(effective elements in lo). But -lo[0] is max of ALL elements in lo (including stale). So -lo[0] could be > max(effective lo) > min(effective hi) > old? No wait, old IS in hi, so old >= min(hi) >= max(effective lo). But -lo[0] >= max(effective lo). So -lo[0] could be >= old or < old.

Hmm, so if old is in hi, can old <= -lo[0]?
- old >= max(effective lo) and -lo[0] >= max(effective lo). So both are >= max(effective lo). It's possible that old < -lo[0] (if the stale top is large).

Example: lo has effective {1, 2} and stale {100}. -lo[0] = 100. hi has effective {50, 60}. old = 50 (in hi). 50 <= 100? Yes! So we'd incorrectly put it in lo!

This is a problem!

So comparing with the stale top is NOT safe. I need a different approach.

Options:
1. Clean the top before comparing (but then the top changes and we lose information).
2. Track which heap each element was inserted into (but rebalancing moves elements between heaps).
3. Use a different data structure.

For option 1: If I clean the top, and the heap becomes empty, I know all effective elements were removed. But the element I'm removing might have been in this heap.

Actually, let me reconsider. If I clean the top and the heap is still non-empty, then -lo[0] is the effective max of lo. If old <= -lo[0], old is in lo. If old > -lo[0], old is in hi. This is correct!

If I clean the top and the heap becomes empty, it means all elements in lo (that were at the top at various cleaning points) were stale. But there might still be effective elements in lo that are below the stale ones. Wait, no - we only clean the top repeatedly. If we pop the top and it's stale, we pop again. We stop when the top is not stale. If the heap becomes empty, it means ALL elements were stale (popped one by one).

Wait no! In a heap, only the root is guaranteed to be the max. If we pop the root, the next root is the max of the remaining. So if we clean and the heap becomes empty, it means all elements were marked for removal. In that case, lo_sz should be 0 (all elements in lo were removed). But lo_sz might still be > 0 if we haven't decremented it yet for the current removal.

Hmm, this is getting complicated. Let me think of another approach.

Alternative approach: Instead of tracking which heap an element is in, I'll always try to remove from both and let the rebalancing fix things.

Actually, here's a cleaner approach I've seen:

When removing `old`:
- `to_remove[old] += 1`
- If `lo_sz > 0` and `hi_sz > 0`:
  - We need to determine which heap. Compare with the boundary.
  - The boundary is: if we clean both tops, the boundary is between -lo[0] and hi[0].
  - If old <= -lo[0] (after cleaning lo): old is in lo (or on the boundary, assign to lo).
  - Else: old is in hi.
- If `lo_sz > 0` and `hi_sz == 0`: old is in lo.
- If `lo_sz == 0` and `hi_sz > 0`: old is in hi.

But the problem I identified: after cleaning lo, the top might change, and old might be > new top even though old was in lo.

Wait, let me reconsider. If old is in lo (effective), and we clean lo's top:
- Before cleaning: -lo[0] is the max of all lo elements (stale + effective).
- After cleaning: -lo[0] is the max of effective lo elements (or lo is empty).
- old is an effective element in lo, so old <= max(effective lo) = -lo[0] (after cleaning). ✓

So if we clean first, and old is in lo, then old <= -lo[0] after cleaning. ✓

If old is in hi:
- After cleaning lo, -lo[0] is max(effective lo).
- old >= min(effective hi) >= max(effective lo) = -lo[0]. So old >= -lo[0].
- If old > -lo[0]: we correctly put it in hi.
- If old == -lo[0]: it's on the boundary. We assign to lo. But it's actually in hi!

The boundary case: old == -lo[0] but old is in hi. This can happen if there are duplicate values.

Example: lo effective = {1, 2}, hi effective = {2, 3}. old = 2, and it's the 2 in hi.
After cleaning lo: -lo[0] = 2. old(2) <= 2? Yes. We assign to lo. But it's in hi!

This means lo_sz gets decremented when it shouldn't. But does it matter?

After: lo_sz decreases by 1 (should be in hi). hi_sz unchanged.
Then we add a new element and rebalance. The rebalancing will fix the sizes.

But will the heaps be correct? Let's see: lo still has the 2 (in hi), and lo_sz is one less. When we rebalance, we might move an element from lo to hi (since lo_sz > hi_sz + 1 potentially). That element might be the 2 that's supposed to be in hi. So it gets moved to hi. Net effect: correct!

Wait, but what if we need to move from hi to lo instead? Then hi_sz > lo_sz, and we move from hi to lo. The 2 (which is in hi) might get moved to lo. That's wrong!

Hmm, I think the boundary case is tricky. Let me think about whether it actually causes issues.

If old == -lo[0] and old is in hi:
- We decrement lo_sz (wrong, should be hi_sz).
- Now lo_sz is one less, hi_sz is correct.
- When we add new element x:
  - If x goes to hi: hi_sz increases. Then hi_sz might > lo_sz, triggering rebalance (move from hi to lo).
  - If x goes to lo: lo_sz increases. Back to normal.

In the first sub-case: we move an element from hi to lo. That element is the min of hi. If the 2 (that was supposed to stay in hi) is the min of hi, it gets moved to lo. Now lo has an extra element and hi has one less. But the effective sizes are: lo_sz (which was decremented by 1, then incremented by 1 for the move) = original. hi_sz (which was correct, then decremented by 1 for the move) = original - 1. But we wanted both to be original (since we added 1 and removed 1). 

Wait, I'm getting confused. Let me think about it differently.

Actually, I think the key insight is: it doesn't matter which heap we decrement, as long as the total (lo_sz + hi_sz) is correct, and the rebalancing maintains the size constraint. The actual content of the heaps might have "wrong" elements temporarily, but the lazy deletion + rebalancing should handle it.

Wait no, that's not quite right either. The issue is that the heaps might not have the correct partition property.

Let me try a different approach: instead of trying to determine which heap an element is in, I'll just always decrement the size of the heap where the element "should" be based on the boundary, and accept that there might be off-by-one errors that get fixed by rebalancing.

Actually, I just realized: the boundary case (old == -lo[0]) only causes an issue if there are duplicates. And in that case, either assignment works because the values are the same!

If old == -lo[0] and old is in hi:
- We assign to lo. lo_sz -= 1.
- But the value is the same whether it's in lo or hi. So when we compute the median, it doesn't matter.
- The only issue is if it causes an imbalance that leads to wrong elements being at the tops.

I think in practice, this is fine. The rebalancing will fix any size imbalances, and since the values are equal at the boundary, the median computation is correct.

Let me just go with: clean lo's top, then if old <= -lo[0] (or lo is empty after cleaning and lo_sz > 0), assign to lo. Otherwise assign to hi.

Wait, but if lo becomes empty after cleaning and lo_sz > 0, that means all elements in lo were stale. But we're removing an effective element. Contradiction! So if lo_sz > 0, lo should not be empty after cleaning (unless the element we're removing is the last effective element in lo, and all others are stale).

Hmm, actually: lo_sz = number of effective elements in lo. If lo_sz > 0, there's at least one effective element in lo. After cleaning, the top should be an effective element (or lo is empty if the only effective element was at a position that got exposed after popping stale elements... wait, no. We only pop the top. If the top is stale, we pop it. The next element might also be stale. We keep popping until the top is effective or the heap is empty. If the heap becomes empty, ALL elements were stale, meaning lo_sz should be 0. Contradiction with lo_sz > 0.

Wait, that's only true if we've been cleaning properly. Let me think again...

lo_sz is the count of effective elements we've tracked. The actual heap might have more elements (stale ones). When we clean, we pop stale elements from the top. If we pop all elements (heap becomes empty), it means ALL elements in the heap were stale. But lo_sz counts effective elements. If lo_sz > 0, there should be at least one effective element, so the heap should NOT become empty.

Unless... there's a bug where we didn't properly account for all elements. Let me make sure:
- When we add to lo, lo_sz += 1 and we push to the heap.
- When we remove from lo (lo_sz -= 1), we mark for removal but don't pop.
- When we rebalance (move from lo to hi), we pop from lo and push to hi, lo_sz -= 1, hi_sz += 1.
- When we clean, we pop stale elements (no size change).

So the heap size = lo_sz + (number of stale elements not yet cleaned). If lo_sz > 0, heap size > 0, and after cleaning (removing all stale), the heap should have lo_sz elements > 0.

Wait, that's not right either. The heap size = (number of elements ever pushed to lo) - (number of elements ever popped from lo). Elements are popped during rebalancing (moved to hi) and during cleaning (stale removal).

Let's say we pushed P elements to lo, popped R elements during rebalancing, and cleaned C elements. Heap size = P - R - C. lo_sz = P - R - (number of removals assigned to lo). Stale count in heap = (number of removals assigned to lo) - C.

If lo_sz > 0: P - R - (removals_lo) > 0. Heap size = P - R - C = lo_sz + (removals_lo - C) > 0. And stale count = removals_lo - C. After cleaning, we remove min(stale at top, stale count) elements. If all stale elements are at the top (which they will be after we've cleaned enough), the heap will have lo_sz elements.

Actually, I realize stale elements might not all be at the top. In a heap, the stale elements can be anywhere. So cleaning only removes stale elements that happen to be at the top.

So after cleaning, the heap might still have stale elements (below the top). But the top is guaranteed to be effective (or the heap is empty).

And the heap size after cleaning >= lo_sz (since there are lo_sz effective elements + some stale elements).

So if lo_sz > 0, after cleaning, the heap is NOT empty. ✓

Great, so my logic is:
1. Clean lo's top.
2. If lo_sz > 0: old must be in lo if old <= -lo[0] (which is the effective max of lo). Otherwise, old is in hi.
3. If lo_sz == 0: old must be in hi.

And similarly for the case where old might be in hi:
1. Clean hi's top.
2. If hi_sz > 0: old must be in hi if old >= hi[0] (effective min of hi). Otherwise, old is in lo.

But I only need one check. Let me use: if lo_sz > 0 and (old <= -lo[0] after cleaning lo), assign to lo. Else assign to hi.

Wait, I also need to handle: what if lo_sz > 0 but lo is empty after cleaning? I just proved that can't happen. So if lo_sz > 0, lo[0] exists after cleaning.

Let me also double-check: after cleaning, is -lo[0] really the effective max of lo?
- The heap contains effective + stale elements.
- After cleaning, the top is an effective element (since we cleaned all stale from the top).
- But is it the MAX effective element? In a max-heap, the root is the max of all elements in the heap. The heap contains all effective elements of lo (plus some stale ones below the top). So the root is the max of (effective + stale below top) >= max(effective). 

Hmm wait, the root is the max of ALL elements in the heap (effective and stale). After cleaning, the root is effective, but there might be stale elements below it that are larger. So -lo[0] (after cleaning) = max of all remaining elements (effective + stale below). This could be > max(effective).

Example: lo heap (max-heap, negated): [-10, -5, -3]. Effective: {5, 3}. Stale: {10} (10 is at the root, negated to -10).
After cleaning: pop -10 (10 is stale). Heap: [-5, -3]. Top: -5, val=5. 
Now -lo[0] = 5 = max(effective). ✓

Another: lo heap: [-10, -8, -5]. Effective: {8, 5}. Stale: {10}.
After cleaning: pop -10. Heap: [-8, -5]. Top: -8, val=8. -lo[0] = 8 = max(effective). ✓

Another: lo heap: [-5, -10, -3]. (Max-heap: -5 is root, meaning 5 is max.) Effective: {5, 3}. Stale: {10} (at position 1).
After cleaning: top is -5, val=5, to_remove[5]=0. Stop. -lo[0] = 5 = max(effective). ✓
(10 is stale but below the top, so it doesn't affect the comparison.)

But wait, can a stale element be LARGER than the effective max and be at the top?
- lo heap: [-10, -5, -3]. 10 is stale, 5 and 3 are effective.
- Before cleaning: -lo[0] = 10 > max(effective) = 5.
- After cleaning: -lo[0] = 5 = max(effective). ✓

So after cleaning, -lo[0] is always <= the stale max (which was the original -lo[0]) and >= max(effective). Actually, -lo[0] after cleaning IS the max of (effective + remaining stale). And since all effective elements are in the heap, max(effective) <= -lo[0] after cleaning.

But could -lo[0] after cleaning be > max(effective)? Yes, if there's a stale element that's the new top and is larger than all effective elements.

Example: lo heap: [-10, -8, -5]. 10 is effective, 8 is stale, 5 is effective. (lo_sz = 2)
After cleaning: top is -10, val=10, to_remove[10]=0. Stop. -lo[0] = 10 = max(effective). ✓

Another: lo heap: [-10, -8, -5]. 10 is stale, 8 is effective, 5 is effective. (lo_sz = 2)
After cleaning: pop -10 (stale). Heap: [-8, -5]. Top: -8, val=8. -lo[0] = 8 = max(effective). ✓

Another: lo heap: [-8, -10, -5]. 8 is stale, 10 is effective, 5 is effective. (lo_sz = 2)
Wait, this violates the max-heap property! In a max-heap (negated), -8 is the root, -10 and -5 are children. -8 < -5, so 5 > 8. That means 5 is a child of 8 in the max-heap (min-heap of negated). The heap property says parent <= child for min-heap. -8 <= -5? Yes. -8 <= -10? Yes. So it's a valid min-heap of [-8, -10, -5], which is a max-heap of [8, 10, 5] with 8 at the root. But 8 < 10, so 10 is not at the root!

Wait, I'm confusing myself. Let me be clear:
- `lo` is a min-heap of negated values.
- The root of `lo` (lo[0]) is the minimum negated value = negation of the maximum value.
- So -lo[0] is the maximum value in the heap.

In a valid min-heap of [-8, -10, -5]: root is -8 (min). -(-8) = 8 is the max value. But 10 > 8! So 10 is in the heap but -lo[0] = 8 ≠ 10.

Wait, that can't be right. In a min-heap, the root is the minimum. [-8, -10, -5]: min is -10, not -8. So this is NOT a valid min-heap with -8 at the root.

Let me redo: min-heap of negated values for lo = {8, 10, 5}:
- Negated: {-8, -10, -5}
- Min-heap: root should be -10 (min). Then children: -8, -5.
- Heap: [-10, -8, -5]. -lo[0] = 10. ✓ (10 is the max of {8, 10, 5})

OK so I was wrong. The min-heap property ensures the root is the minimum, so -lo[0] is always the maximum of all values in lo. Good.

So after cleaning:
- -lo[0] = max of all remaining elements in lo (effective + stale that weren't at the top).
- This is >= max(effective elements in lo).

And if old is an effective element in lo: old <= max(effective in lo) <= -lo[0] after cleaning. ✓

If old is an effective element in hi: old >= min(effective in hi) >= max(effective in lo). But -lo[0] after cleaning >= max(effective in lo). So old >= max(effective in lo) but -lo[0] could be > max(effective in lo) (if there's a stale element that's the new max). In that case, old could be < -lo[0], and we'd incorrectly assign old to lo!

Example:
- lo effective: {1, 2}. lo stale: {100}. lo_sz = 2.
- hi effective: {50, 60}. hi_sz = 2.
- We're removing 50 (from hi).
- Clean lo: top is 100 (stale). Pop. Next top is 2 (effective). Stop.
- -lo[0] = 2. old=50 <= 2? No. Assign to hi. ✓

Another:
- lo effective: {1, 2}. lo stale: {100}. lo_sz = 2.
- hi effective: {3, 60}. hi_sz = 2.
- We're removing 3 (from hi).
- Clean lo: top is 100 (stale). Pop. Next top is 2. Stop.
- -lo[0] = 2. old=3 <= 2? No. Assign to hi. ✓

Another:
- lo effective: {1, 50}. lo stale: {100}. lo_sz = 2.
- hi effective: {51, 60}. hi_sz = 2.
- We're removing 51 (from hi).
- Clean lo: top is 100 (stale). Pop. Next top is 50. Stop.
- -lo[0] = 50. old=51 <= 50? No. Assign to hi. ✓

Another:
- lo effective: {1, 50}. lo stale: {100}. lo_sz = 2.
- hi effective: {50, 60}. hi_sz = 2. (Note: 50 is in both lo and hi!)
- We're removing 50 (the one in hi).
- Clean lo: top is 100 (stale). Pop. Next top is 50. Stop.
- -lo[0] = 50. old=50 <= 50? Yes. Assign to lo. But it's in hi!

So we decrement lo_sz (becomes 1) instead of hi_sz (stays 2).
Then we add a new element and rebalance.

Let's say new element is 55.
- Clean hi: top is 50 (effective, to_remove[50] is now 1). Wait, to_remove[50] = 1 (we marked it). So we pop 50 from hi. to_remove[50] = 0. Next: 60. Stop.
- hi[0] = 60. x=55 >= 60? No. Push to lo. lo_sz = 2.
- Rebalance: lo_sz=2, hi_sz=2. 2 > 3? No. 2 > 2? No. OK.
- Now lo has {1, 50, 55} (effective: 1, 55; stale: 50 which we haven't cleaned from lo yet... wait, 50 was marked for removal but it's in lo? No, we assigned the removal to lo (lo_sz was decremented). But the 50 in lo is a different 50 (the one that was originally in lo).

Hmm wait, I'm getting confused with duplicates. Let me use indices to distinguish.

Actually, I think for the purpose of median computation, it doesn't matter which "50" we remove, since they have the same value. The median only depends on the multiset of values, not which specific copy is where.

So even if we "incorrectly" assign the removal to lo instead of hi, the net effect on the multiset is the same (one 50 is removed). The only issue is the size tracking (lo_sz vs hi_sz), which gets fixed by rebalancing.

I think this approach is correct for computing the median, even if the internal bookkeeping is slightly off at boundaries. The rebalancing ensures the sizes are correct, and the median is computed from the tops which are correct.

Let me just go with this approach and trust that it works. The key operations are:
1. Clean tops before accessing them.
2. Use the cleaned top to determine which heap an element belongs to.
3. Rebalance after every add/remove.

Let me also consider: what if k=1? Then lo_sz=1, hi_sz=0 always. Median is just the element itself.

What about the initial fill? I fill the first k elements, then start sliding. During initial fill, there are no removals, so no lazy deletion issues.

Let me also think about the performance. For each window:
- Clean lo: O(log k) per pop, at most a few pops (amortized).
- Clean hi: same.
- One heappush: O(log k).
- Rebalance: at most one heappop + heappush: O(log k).
- Total per window: O(log k).
- Total: O(n log k) = 200,000 * log2(1000) ≈ 200,000 * 10 = 2,000,000. Should be fast.

But wait, the cleaning might pop multiple elements. However, each element is popped at most once (when it's cleaned), so amortized it's O(1) per window for cleaning.

Total: O(n log k) which is fine.

Let me code this up properly:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    result = []
    lo = []  # min-heap of negated values (max-heap of values)
    hi = []  # min-heap of values
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0
    
    def clean(heap, negate):
        while heap:
            val = -heap[0] if negate else heap[0]
            if to_remove[val] > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
            else:
                break
    
    def rebalance():
        nonlocal lo_sz, hi_sz
        while lo_sz > hi_sz + 1:
            clean(lo, True)
            val = -heapq.heappop(lo)
            lo_sz -= 1
            heapq.heappush(hi, val)
            hi_sz += 1
        while hi_sz > lo_sz:
            clean(hi, False)
            val = heapq.heappop(hi)
            hi_sz -= 1
            heapq.heappush(lo, -val)
            lo_sz += 1
    
    def median():
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    # Initial fill
    for i in range(k):
        clean(hi, False)
        if hi_sz > 0 and nums[i] >= hi[0]:
            heapq.heappush(hi, nums[i])
            hi_sz += 1
        else:
            heapq.heappush(lo, -nums[i])
            lo_sz += 1
        rebalance()
    
    result.append(median())
    
    # Slide
    for i in range(k, n):
        # Remove
        old = nums[i - k]
        to_remove[old] += 1
        clean(lo, True)
        if lo_sz > 0 and old <= -lo[0]:
            lo_sz -= 1
        else:
            hi_sz -= 1
        
        # Add
        x = nums[i]
        clean(hi, False)
        if hi_sz > 0 and x >= hi[0]:
            heapq.heappush(hi, x)
            hi_sz += 1
        else:
            heapq.heappush(lo, -x)
            lo_sz += 1
        
        rebalance()
        result.append(median())
    
    return result
```

Wait, I need to double-check the `clean` function. `to_remove` is a defaultdict, so `to_remove[val]` creates an entry if it doesn't exist. That's fine but might waste memory. Let me use a regular dict with `.get()` or just use defaultdict (it's fine for this problem size).

Actually, let me reconsider the edge case in the initial fill. When `hi_sz == 0`, I push to `lo`. But what if `lo` is empty and `hi_sz == 0`? Then I push to lo. That's correct for the first element.

Let me trace through k=2, nums=[1,3,2,4]:

Initial fill:
i=0: x=1. hi_sz=0, push to lo. lo=[-1], lo_sz=1. Rebalance: 1>1? No. 0>1? No.
i=1: x=3. Clean hi (empty). hi_sz=0, push to lo. lo=[-3,-1], lo_sz=2. Rebalance: 2>1? Yes.
  Clean lo: lo[0]=-3, val=3, to_remove[3]=0. Stop.
  Pop lo: val=3, lo=[-1], lo_sz=1. Push 3 to hi: hi=[3], hi_sz=1.
  1>2? No. 1>1? No.

State: lo=[-1] ({1}), hi=[3] ({3}). lo_sz=1, hi_sz=1.
Median: even, (-(-1)+3)/2 = (1+3)/2 = 2.0 ✓

Slide i=2: old=nums[0]=1, x=nums[2]=2.
Remove 1: to_remove[1]=1. Clean lo: lo[0]=-1, val=1, to_remove[1]=1>0. Pop lo: lo=[]. to_remove[1]=0.
lo_sz=1 > 0? Yes. But lo is empty! old(1) <= -lo[0]? lo is empty, so -lo[0] doesn't exist!

Bug! I need to handle the case where lo is empty after cleaning but lo_sz > 0.

Wait, I argued earlier that if lo_sz > 0, lo can't be empty after cleaning. Let me re-examine.

In this case: lo=[-1], lo_sz=1. We mark 1 for removal. Clean lo: pop -1 (stale). lo=[]. lo_sz is still 1.

But lo_sz > 0 and lo is empty! This contradicts my earlier proof. Let me see where I went wrong.

I said: "If lo_sz > 0, there's at least one effective element in lo, so after cleaning, the heap should have lo_sz elements > 0."

But in this case, lo_sz = 1 (one effective element: 1). We're removing 1 (marking it for removal). After marking, the effective count should be 0. But lo_sz hasn't been decremented yet (we're about to do that). So at the moment of cleaning, lo_sz is still 1, but the element is no longer "effective" (it's being removed).

Ah, I see the issue. lo_sz hasn't been decremented yet when we clean. So lo_sz=1 but the only element is being removed (marked). After cleaning, the heap is empty because the only element was stale.

So the condition should be: after cleaning, if lo_sz > 0 AND lo is not empty, then -lo[0] is the effective max. If lo is empty after cleaning, it means the element we're removing was the only "effective" element in lo (before this removal), so it must be in lo.

Let me adjust:
```python
clean(lo, True)
if lo_sz > 0 and (not lo or old <= -lo[0]):
    lo_sz -= 1
else:
    hi_sz -= 1
```

Wait, but if lo is empty after cleaning and lo_sz > 0, it means all elements in lo were stale (including the one we're removing). So the one we're removing IS in lo. So we should decrement lo_sz.

But what if lo is empty after cleaning and lo_sz > 1? That means multiple elements were in lo, all stale. But we're only removing one. So lo_sz should decrease by 1, but there are still lo_sz-1 effective elements... wait, no. If all elements in the heap are stale, and lo_sz > 0, that means we have lo_sz elements that should be effective but are all marked for removal. That's only possible if we marked multiple elements for removal without decrementing lo_sz each time. But we do decrement lo_sz each time we assign a removal to lo.

Hmm, let me reconsider. lo_sz is the number of elements we've "accounted for" in lo. Each time we add to lo, lo_sz += 1. Each time we assign a removal to lo, lo_sz -= 1. Each time we move from lo to hi (rebalance), lo_sz -= 1.

The actual heap size = (total adds to lo) - (total pops from lo during rebalance) - (total pops from lo during cleaning).

If lo_sz > 0, then (total adds) - (total rebalance pops) - (total removals assigned to lo) > 0.
Heap size = (total adds) - (total rebalance pops) - (total cleaning pops).
Stale count in heap = (total removals assigned to lo) - (total cleaning pops).

lo_sz > 0 means (total adds) - (total rebalance pops) - (total removals to lo) > 0.
This means (total adds) - (total rebalance pops) > (total removals to lo).
Heap size = (total adds) - (total rebalance pops) - (total cleaning pops) > (total removals to lo) - (total cleaning pops) = stale count.
So heap size > stale count, meaning heap size - stale count = lo_sz > 0. So there are lo_sz effective elements in the heap.

After cleaning: we pop stale elements from the top. The number we pop is at most the stale count. After popping, the heap has heap_size - (popped) elements. The effective count is still lo_sz (cleaning doesn't change effective count). So the remaining heap has lo_sz effective + (stale - popped) stale elements. Since lo_sz > 0, the heap is not empty. ✓

So in my example: lo=[-1], lo_sz=1. We mark 1 for removal (to_remove[1]=1). But lo_sz is still 1 (not yet decremented). The "effective" count is still 1 (we haven't logically removed it yet, just marked it). After cleaning: pop -1 (stale). lo=[]. lo_sz is still 1.

But I just proved the heap can't be empty if lo_sz > 0! Where's the contradiction?

The issue: when I mark an element for removal, I increment to_remove but haven't decremented lo_sz yet. At this point, the element is in a "limbo" state: it's in the heap and marked for removal, but lo_sz still counts it. The effective count (for the purpose of my proof) should be lo_sz, and the stale count is the number of to_remove entries minus what's been cleaned.

In my example: lo_sz=1. Stale count in heap = to_remove[1] - cleaned = 1 - 0 = 1. But the heap only has 1 element! So stale count = heap size? That means effective count = 0, contradicting lo_sz=1.

The issue is that my "effective count" = lo_sz is the count BEFORE the current removal. After marking for removal, the effective count should be lo_sz - 1 = 0. But I haven't updated lo_sz yet.

So the correct interpretation: at the moment of cleaning, the "true effective count" is lo_sz - 1 (for the element being removed) + 0 (if we've already assigned it to lo) or lo_sz (if we haven't assigned yet).

Since we clean BEFORE assigning, the true effective count is lo_sz - 1 (the element being removed is still counted in lo_sz but is now stale).

So: true effective = lo_sz - 1 (if the element is in lo) or lo_sz - 1 (if in hi, but then lo's effective is still lo_sz).

Ugh, this is getting complicated. Let me just handle the edge case:

```python
clean(lo, True)
if lo_sz > 0 and (not lo or old <= -lo[0]):
    lo_sz -= 1
else:
    hi_sz -= 1
```

If lo is empty after cleaning and lo_sz > 0: it means the element being removed was in lo (and it was the only "effective" one, now marked stale). So we assign to lo. ✓

If lo is not empty after cleaning: -lo[0] is the max of (effective in lo after this removal) + (stale in lo after cleaning). Since the element being removed is <= this max (if it's in lo) or >= min(hi) (if in hi)...

Actually, I realize my proof above shows that if the element IS in lo, then after marking it and cleaning, the heap should have lo_sz - 1 effective elements (the remaining ones). And -lo[0] >= max(those effective elements) >= old (if old is in lo). Wait, old <= max(effective in lo) is what we need. And -lo[0] >= max(effective in lo) after this removal. But old might not be in "effective in lo after this removal" (it's the one being removed). So old <= max(effective in lo BEFORE removal) = max(effective in lo after removal ∪ {old}).

Hmm, I think I'm overcomplicating this. Let me just trust the approach and test it mentally with the example:

k=2, nums=[1,3,2,4]:
After initial fill: lo=[-1], hi=[3], lo_sz=1, hi_sz=1.

Slide i=2: old=1, x=2.
- to_remove[1]=1.
- Clean lo: lo[0]=-1, val=1, to_remove[1]=1>0. Pop. lo=[]. to_remove[1]=0.
- lo_sz=1 > 0 and (not lo or old <= -lo[0]): not lo is True. So lo_sz -= 1 = 0.
- Add x=2: Clean hi: hi[0]=3, to_remove[3]=0. Stop. hi_sz=1 > 0 and x=2 >= hi[0]=3? No. Push to lo: lo=[-2], lo_sz=1.
- Rebalance: lo_sz=1, hi_sz=1. 1>2? No. 1>1? No.
- Median: clean lo: lo[0]=-2, val=2, to_remove[2]=0. Stop. Clean hi: hi[0]=3, to_remove[3]=0. Stop. k even: (-(-2)+3)/2 = (2+3)/2 = 2.5. ✓ (median of [3,2] is 2.5)

Slide i=3: old=nums[1]=3, x=nums[3]=4.
- to_remove[3]=1.
- Clean lo: lo[0]=-2, val=2, to_remove[2]=0. Stop.
- lo_sz=1 > 0 and old=3 <= -lo[0]=2? No. So hi_sz -= 1 = 0.
- Add x=4: Clean hi: hi[0]=3, to_remove[3]=1>0. Pop. hi=[]. to_remove[3]=0.
  hi_sz=0 > 0? No. Push to lo: lo=[-4,-2], lo_sz=2.
- Rebalance: lo_sz=2, hi_sz=0. 2>1? Yes.
  Clean lo: lo[0]=-4, val=4, to_remove[4]=0. Stop.
  Pop lo: val=4, lo=[-2], lo_sz=1. Push 4 to hi: hi=[4], hi_sz=1.
  1>2? No. 1>1? No.
- Median: clean lo: lo[0]=-2, val=2, to_remove[2]=0. Stop. Clean hi: hi[0]=4, to_remove[4]=0. Stop. k even: (2+4)/2 = 3.0. ✓ (median of [2,4] is 3.0)

The algorithm works for this example.

Let me also think about whether the `not lo` condition is sufficient. If lo is empty after cleaning, it means all elements in lo were stale (including the one being removed). Since we're removing one element, and it was in lo (it's the only one that was "effective"), we assign to lo. But what if there were multiple elements and all were stale?

Example: lo had elements {1, 2}, both stale (from previous removals). lo_sz=2. We're removing element 1.
After marking 1: to_remove has 1 and 2 (or maybe just 1 if 2 was cleaned earlier).

Wait, if 2 was cleaned earlier (popped during a previous cleaning), then it's no longer in the heap. So the heap only has 1 (and maybe other stale elements).

Actually, I think the `not lo` case is handled correctly: if lo is empty after cleaning, all elements that were in lo's heap are stale. Since lo_sz > 0, there was at least one "effective" element, which must be the one we're removing (or was cleaned earlier but lo_sz wasn't updated... no, lo_sz is updated when we assign removals).

I think the logic is sound. Let me also make sure the `not lo` check handles the case where lo_sz > 0 but the element is actually in hi. Can that happen?

If lo_sz > 0 but lo is empty after cleaning, it means all elements in lo's heap were stale. The stale elements in lo's heap were elements that were "assigned to lo" for removal. If lo_sz > 0, there's at least one element that was assigned to lo but not yet removed (from lo's perspective). That element is the one we're removing (or a different one that was removed in a previous step but lo_sz wasn't decremented... no, lo_sz is decremented immediately).

I think it's fine. Let me finalize the code.

One more thing: performance. Using `defaultdict(int)` for `to_remove` is fine. The heap operations are O(log k). The cleaning is amortized O(1) per operation (each element is cleaned at most once).

For n=200,000 and k=1,000:
- ~200,000 iterations
- Each iteration: O(log k) ≈ 10 comparisons for heap ops
- Total: ~2,000,000 basic operations
- Python can do ~10-50 million simple operations per second
- Should finish well under 1 second.

Actually, I realize there might be a performance issue with the `clean` function if there are many stale elements at the top. But since each element is cleaned at most once, the total cleaning work across all iterations is O(n log k) (each element is popped from a heap once).

Wait, that's O(n) total cleaning (each of n elements is popped at most once). So total work is O(n log k) for heap operations + O(n) for cleaning = O(n log k). Fine.

Let me also make sure I handle the `k == 1` case efficiently (though the general case should handle it too).

Actually, let me reconsider. For k=1, the general case would:
- Initial fill: 1 element in lo.
- Slide: remove 1, add 1, for each subsequent element.
- Each iteration: clean, remove, add, rebalance, median.

This should work but has unnecessary overhead. The special case `k == 1` is a micro-optimization. Let me keep it for clarity.

Wait, actually for k=1, the general case might have issues. Let me trace:
k=1, nums=[3,1,4].
Initial fill: i=0, x=3. hi_sz=0, push to lo. lo=[-3], lo_sz=1.
Rebalance: 1>1? No. 0>1? No.
Median: k odd, -lo[0]=3. result=[3.0].

Slide i=1: old=nums[0]=3, x=nums[1]=1.
- to_remove[3]=1.
- Clean lo: lo[0]=-3, val=3, to_remove[3]=1>0. Pop. lo=[]. to_remove[3]=0.
- lo_sz=1 > 0 and (not lo): True. lo_sz=0.
- Add x=1: Clean hi (empty). hi_sz=0, push to lo. lo=[-1], lo_sz=1.
- Rebalance: 1>1? No. 0>1? No.
- Median: clean lo: lo[0]=-1, val=1, to_remove[1]=0. Stop. -lo[0]=1. result=[3.0, 1.0].

Slide i=2: old=nums[1]=1, x=nums[2]=4.
- to_remove[1]=1.
- Clean lo: lo[0]=-1, val=1, to_remove[1]=1>0. Pop. lo=[]. to_remove[1]=0.
- lo_sz=1 > 0 and (not lo): True. lo_sz=0.
- Add x=4: hi_sz=0, push to lo. lo=[-4], lo_sz=1.
- Rebalance: OK.
- Median: -lo[0]=4. result=[3.0, 1.0, 4.0]. ✓

Great, k=1 works without special case. But I'll keep the special case for performance.

Let me also think about potential issues with floating point. Since we're dealing with floats, comparisons should be fine (no precision issues for the median computation).

One more consideration: the problem says "Return floats". So I should make sure the output is always float, even for integer inputs. The `(-lo[0] + hi[0]) / 2.0` ensures float division. And `float(-lo[0])` for odd k.

Actually, if the input is `list[float]`, the values are already floats. But to be safe, I'll cast.

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    result = []
    lo = []  # min-heap of negated values
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_sz = 0
    hi_sz = 0
    
    def clean(heap, negate):
        while heap:
            val = -heap[0] if negate else heap[0]
            if to_remove[val] > 0:
                heapq.heappop(heap)
                to_remove[val] -= 1
            else:
                break
    
    def rebalance():
        nonlocal lo_sz, hi_sz
        while lo_sz > hi_sz + 1:
            clean(lo, True)
            val = -heapq.heappop(lo)
            lo_sz -= 1
            heapq.heappush(hi, val)
            hi_sz += 1
        while hi_sz > lo_sz:
            clean(hi, False)
            val = heapq.heappop(hi)
            hi_sz -= 1
            heapq.heappush(lo, -val)
            lo_sz += 1
    
    # Initial fill
    for i in range(k):
        clean(hi, False)
        if hi_sz > 0 and nums[i] >= hi[0]:
            heapq.heappush(hi, nums[i])
            hi_sz += 1
        else:
            heapq.heappush(lo, -nums[i])
            lo_sz += 1
        rebalance()
    
    # First median
    clean(lo, True)
    clean(hi, False)
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    # Slide
    for i in range(k, n):
        # Remove old
        old = nums[i - k]
        to_remove[old] += 1
        clean(lo, True)
        if lo_sz > 0 and (not lo or old <= -lo[0]):
            lo_sz -= 1
        else:
            hi_sz -= 1
        
        # Add new
        x = nums[i]
        clean(hi, False)
        if hi_sz > 0 and x >= hi[0]:
            heapq.heappush(hi, x)
            hi_sz += 1
        else:
            heapq.heappush(lo, -x)
            lo_sz += 1
        
        rebalance()
        
        # Compute median
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Hmm, I'm repeating the median computation. Let me factor it out. Actually, for performance, inlining might be better. Let me keep it as is.

Wait, I just realized: in the `rebalance` function, when I do `clean(lo, True)` and then `heapq.heappop(lo)`, I'm assuming lo is not empty. Since lo_sz > hi_sz + 1 >= 1, lo_sz >= 2 (or lo_sz >= 1 if hi_sz = 0). Wait, lo_sz > hi_sz + 1 means lo_sz >= 2 (since hi_sz >= 0). So lo has at least 2 effective elements, meaning the heap has at least 2 elements. After cleaning, the heap still has at least lo_sz elements (as I proved). So it's safe to pop.

Similarly for the other direction: hi_sz > lo_sz means hi_sz >= 1. After cleaning, hi has at least hi_sz elements. Safe to pop.

I think the code is correct. Let me also consider: what if `nums` contains duplicates? The algorithm should handle it fine since we're using a count-based lazy deletion.

Let me also consider: what if all elements are the same? E.g., nums = [5, 5, 5, 5], k = 3.
Initial fill: 
i=0: lo=[-5], lo_sz=1.
i=1: hi_sz=0, push to lo. lo=[-5,-5], lo_sz=2. Rebalance: 2>1? Yes. Pop lo: 5, lo_sz=1, hi=[5], hi_sz=1.
i=2: clean hi: hi[0]=5, to_remove[5]=0. x=5 >= 5? Yes. Push to hi: hi=[5,5], hi_sz=2. Rebalance: 1>3? No. 2>1? Yes. Pop hi: 5, hi_sz=1, push to lo: lo=[-5,-5], lo_sz=2. 2>2? No. 1>2? No.

State: lo=[-5,-5], hi=[5]. lo_sz=2, hi_sz=1.
Median: odd, -lo[0]=5. ✓

Slide i=3: old=5, x=5.
to_remove[5]=1.
Clean lo: lo[0]=-5, val=5, to_remove[5]=1>0. Pop. lo=[-5]. to_remove[5]=0.
lo_sz=2>0 and old=5 <= -lo[0]=5? Yes. lo_sz=1.
Add x=5: clean hi: hi[0]=5, to_remove[5]=0. x=5>=5? Yes. Push to hi: hi=[5,5], hi_sz=2.
Rebalance: 1>3? No. 2>1? Yes. Clean hi: hi[0]=5, to_remove[5]=0. Pop: 5, hi_sz=1. Push to lo: lo=[-5,-5], lo_sz=2. 2>2? No. 1>2? No.
Median: -lo[0]=5. ✓

Looks good!

One more edge case: what if k = n? Then there's only one window. The initial fill handles it, and the slide loop doesn't execute.

I'm satisfied the algorithm is correct. Let me finalize.

Actually, wait. I want to double-check one more thing. In the initial fill, I use `hi_sz > 0 and nums[i] >= hi[0]`. But I also clean hi before this check. Let me make sure that's correct.

During initial fill, there are no removals, so `to_remove` is empty. Cleaning does nothing. So the `clean(hi, False)` is a no-op during initial fill. That's fine.

But what about the comparison? If hi_sz > 0, hi[0] is the min of hi. If nums[i] >= hi[0], it goes to hi. Otherwise to lo. This maintains the invariant that all elements in lo <= all elements in hi.

After rebalancing, the sizes are balanced. ✓

I'm confident the solution is correct and efficient. Let me write the final version.
