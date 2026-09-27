The user wants a sliding window median implementation in Python. Let me think about the approach:

1. For each window of size k, I need to find the median.
2. Naive approach: sort each window - O(n*k*log(k)) which for n=200,000 and k=1000 would be 200,000 * 1000 * log(1000) ≈ 200,000 * 1000 * 10 = 2,000,000,000 operations. That's too slow in Python.

3. Better approach: Use two heaps (max-heap for lower half, min-heap for upper half) - the classic "sliding window median" approach. But in Python, maintaining two heaps with lazy deletion is complex but doable.

Let me think about the two-heap approach:
- Maintain a max-heap (lower half) and min-heap (upper half), each of size ~k/2.
- For each new element, add it to the appropriate heap, rebalance.
- When removing an element, use lazy deletion (mark as deleted, clean up when it reaches the top).

Actually, let me think about this more carefully. The standard approach for sliding window median with two heaps:

- `lo`: max-heap (stored as negatives) containing the lower half
- `hi`: min-heap containing the upper half
- We maintain that `lo` has either k//2 or (k+1)//2 elements, and `hi` has the rest.

For removal, we use lazy deletion with a `to_remove` dictionary (or Counter).

Let me think about the complexity:
- Each element is added once and removed once: O(n) heap operations total
- Each heap operation is O(log k)
- So total is O(n log k) which for n=200,000 and k=1000 is about 200,000 * 10 = 2,000,000 operations. That should be well under 2 seconds.

But Python's heapq doesn't support remove, so we use lazy deletion.

Let me code this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # lo: max-heap (negated), hi: min-heap
    # lo should have (k+1)//2 elements, hi should have k//2 elements
    # median is max of lo (top of lo) if k is odd
    # median is (max of lo + min of hi) / 2 if k is even
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    to_remove = defaultdict(int)  # lazy deletion count
    
    def clean(heap):
        while heap and to_remove[-heap[0]] > 0 if heap is lo else to_remove[heap[0]] > 0:
            ...
    
    # Actually, let me be more careful. Let me use a different approach.
    
    # I'll store lo as negated values (max-heap) and hi as normal (min-heap)
    # For lazy deletion, I'll track which values to remove.
    
    # Wait, there's a subtlety: values can repeat, so I need to track counts.
    
    # Let me use a different lazy deletion approach:
    # to_remove is a Counter/dict that maps value -> count of times to remove
    # When cleaning the top of a heap, if the top value is in to_remove with count > 0,
    # pop it and decrement the count.
    
    # For lo (max-heap via negation), the top is -lo[0]
    # For hi (min-heap), the top is hi[0]
    
    def clean_lo():
        while to_remove[-lo[0]] > 0:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while to_remove[hi[0]] > 0:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def add(val):
        # Add to appropriate heap
        if len(lo) <= len(hi):  # or based on target sizes
            # try adding to lo
            ...
    
    # Actually, let me think about this differently.
    
    # Target: lo has (k+1)//2 elements, hi has k//2 elements.
    # So lo always has >= hi in size.
    
    # When k is odd: lo has (k+1)//2, hi has (k-1)//2
    # When k is even: lo has k//2, hi has k//2
    # Wait, that's the same: lo has (k+1)//2, hi has k//2
    
    # Let me reconsider. For k elements total:
    # lo: (k+1)//2 elements (the lower half, including the median if k is odd)
    # hi: k//2 elements (the upper half)
    
    # Median: if k is odd, it's the max of lo (top of lo heap)
    #          if k is even, it's (max of lo + min of hi) / 2
    
    # Add new element:
    # - If val <= max of lo (i.e., -lo[0]), add to lo
    # - Otherwise, add to hi
    # - Then rebalance: if len(lo) > (k+1)//2, move min of lo to hi
    #                  if len(lo) < (k+1)//2, move max of hi to lo
    # - Wait, but with lazy deletion, the "effective" sizes matter.
    
    # This is getting complex with lazy deletion. Let me think of a cleaner approach.
    
    # Alternative: Use the "sorted list" approach with bisect.
    # Maintain a sorted list of the window. Insertion is O(k) due to list shifting, 
    # and removal is also O(k). Total: O(n*k) which for n=200,000, k=1000 is 200,000,000.
    # In Python, list operations are in C so this might be fast enough...
    # But 200M operations in Python might be borderline.
    
    # Actually, bisect.insort is O(k) for the shift but it's done in C. Let me estimate:
    # 200,000 insertions * 1000 shifts = 200,000,000 element moves. Each move is a pointer move in C.
    # This should take about 1-2 seconds. Might be tight.
    
    # The two-heap approach with lazy deletion is O(n log k) which is better.
    
    # Let me go with the two-heap approach.
    
    # Here's my plan:
    # - lo: max-heap (negated), should contain (k+1)//2 elements
    # - hi: min-heap, should contain k//2 elements
    # - to_remove: dict for lazy deletion
    # - effective_lo_size and effective_hi_size to track actual sizes (accounting for lazy deletions)
    
    # Actually, a simpler way: just track the "logical" sizes separately.
    
    # Let me just implement it carefully.
```

Let me write a clean implementation:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    lo = []   # max-heap (negated)
    hi = []   # min-heap
    to_remove = Counter()
    lo_size = 0  # effective size of lo
    hi_size = 0  # effective size of hi
    
    # Target sizes
    lo_target = (k + 1) // 2
    hi_target = k // 2
    
    def clean_lo():
        nonlocal lo_size
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            lo_size -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        nonlocal hi_size
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            hi_size -= 1
            heapq.heappop(hi)
    
    result = []
    
    for i in range(n):
        # Add nums[i]
        val = nums[i]
        if lo_size > 0 and val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
        
        # Rebalance
        # We need lo_size == lo_target and hi_size == hi_target
        # But we can only rebalance by moving tops (after cleaning)
        if lo_size > lo_target:
            # Move from lo to hi
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        elif lo_size < lo_target:
            # Move from hi to lo
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # If window is full, remove nums[i-k]
        if i >= k:
            old = nums[i - k]
            if old <= -lo[0]:
                to_remove[old] += 1
                lo_size -= 1
            else:
                to_remove[old] += 1
                hi_size -= 1
            # Rebalance after removal
            if lo_size > lo_target:
                clean_lo()
                val = -heapq.heappop(lo)
                lo_size -= 1
                heapq.heappush(hi, val)
                hi_size += 1
            elif lo_size < lo_target:
                clean_hi()
                val = heapq.heappop(hi)
                hi_size -= 1
                heapq.heappush(lo, -val)
                lo_size += 1
        
        # Compute median
        if i >= k - 1:
            clean_lo()
            clean_hi()
            if k % 2 == 1:
                result.append(-lo[0])
            else:
                result.append((-lo[0] + hi[0]) / 2)
    
    return result
```

Wait, there's an issue. When I check `val <= -lo[0]`, I need to make sure lo is not empty or has a valid top. Let me add clean_lo() before that check.

Also, when k=1, lo_target = 1, hi_target = 0. That should work fine.

Let me also think about edge cases:
- k=1: just return nums as floats
- k=n: just return [median of all]

Let me also consider: when I add to hi but hi was empty, that's fine. When I try to add to lo but lo is empty, I check `lo_size > 0` first.

Actually wait, there's a subtle issue. When I do `if lo_size > 0 and val <= -lo[0]`, I should clean_lo() first to make sure -lo[0] is valid. Let me restructure.

Also, I realize there might be an issue with the rebalancing logic. After adding an element, the total size increases by 1. After removing, it decreases by 1. The targets are fixed at lo_target and hi_target. So:

After adding (total = k): lo_size + hi_size should = k = lo_target + hi_target. Since we just added 1, one of them is over by 1. So we move 1 from the over one to the under one.

After removing (total = k): same logic.

Actually, let me reconsider. Before adding, if window isn't full yet (i < k-1), total is i+1. After adding, total is i+2. The targets are lo_target + hi_target = k. So total != k until i = k-1.

Hmm, this means my rebalancing logic needs to account for the fact that the window might not be full yet.

Let me rethink. Maybe I should only rebalance when the window is full (i >= k-1). Before that, I just need to add elements.

Actually, a cleaner approach: 
- For i < k-1: just add to appropriate heap, maintain invariant that lo_size >= hi_size (or lo_size == lo_target for the current "partial window").
- For i >= k-1: add, then remove, then rebalance to exact targets.

Hmm, this is getting complicated. Let me use a slightly different approach:

For the partial window (i < k-1), I'll just add elements and maintain lo_size >= hi_size.
For the full window (i >= k-1), I'll add, remove, and rebalance to exact targets.

Actually, let me simplify: I'll always maintain the invariant that lo_size >= hi_size and lo_size - hi_size <= 1. This works for both odd and even k.

Wait no, for even k: lo_size should equal hi_size.
For odd k: lo_size should be hi_size + 1.

So the invariant is: lo_size == (current_window_size + 1) // 2 and hi_size == current_window_size // 2.

For partial windows, current_window_size = i + 1 (before the window slides).
For full windows, current_window_size = k.

Let me just use dynamic targets:
- current_size = min(i+1, k)  (size of the window after adding)
- lo_target = (current_size + 1) // 2
- hi_target = current_size // 2

Then after adding, rebalance to these targets.
After removing (if i >= k), the current_size stays k (we added one and removed one).

Wait, the sequence is:
1. Add nums[i]: window size goes from min(i, k) to min(i+1, k)
2. If i >= k: remove nums[i-k]: window size stays k

So after step 1, if i < k-1, window size is i+1. If i >= k-1, window size is k.
After step 2, if i >= k, window size is still k.

So the target after all operations:
- If i < k-1: lo_target = (i+1+1)//2 = (i+2)//2, hi_target = (i+1)//2
- If i >= k-1: lo_target = (k+1)//2, hi_target = k//2

This should work. Let me code it up more carefully.

Actually, I think there's an even simpler way to think about it. Let me just always maintain:
- lo_size == lo_target where lo_target = (k+1)//2 (fixed)
- hi_size == hi_target where hi_target = k//2 (fixed)

But for the initial fill (first k elements), I build up to these sizes.

For i = 0, 1, ..., k-1: add nums[i]. After adding k elements, lo_size = lo_target and hi_size = hi_target.
For i = k, k+1, ...: add nums[i], remove nums[i-k]. The sizes stay the same.

The rebalancing after each add/remove ensures the targets are met.

Let me just be careful with the implementation. Here's my revised plan:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    lo = []   # max-heap (negated)
    hi = []   # min-heap
    to_remove = Counter()
    lo_size = 0
    hi_size = 0
    
    lo_target = (k + 1) // 2
    hi_target = k // 2
    
    def clean_lo():
        nonlocal lo_size
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            lo_size -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        nonlocal hi_size
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            hi_size -= 1
            heapq.heappop(hi)
    
    result = []
    
    for i in range(n):
        # Add nums[i]
        val = nums[i]
        if lo_size > 0:
            clean_lo()
            if val <= -lo[0]:
                heapq.heappush(lo, -val)
                lo_size += 1
            else:
                heapq.heappush(hi, val)
                hi_size += 1
        else:
            # lo is empty, must go to lo
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # Rebalance after add
        if lo_size > lo_target:
            clean_lo()
            v = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, v)
            hi_size += 1
        elif hi_size > hi_target:
            clean_hi()
            v = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -v)
            lo_size += 1
        
        # Remove nums[i-k] if window is full
        if i >= k:
            old = nums[i - k]
            # Determine which heap old is in
            clean_lo()
            if old <= -lo[0]:
                to_remove[old] += 1
                lo_size -= 1
            else:
                to_remove[old] += 1
                hi_size -= 1
            
            # Rebalance after remove
            if lo_size > lo_target:
                clean_lo()
                v = -heapq.heappop(lo)
                lo_size -= 1
                heapq.heappush(hi, v)
                hi_size += 1
            elif lo_size < lo_target:
                clean_hi()
                v = heapq.heappop(hi)
                hi_size -= 1
                heapq.heappush(lo, -v)
                lo_size += 1
        
        # Record median
        if i >= k - 1:
            clean_lo()
            clean_hi()
            if k % 2 == 1:
                result.append(float(-lo[0]))
            else:
                result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, I think there's still an issue. When I add and the element goes to `hi`, but `hi` was empty and `lo` was not... that's fine. But when both are empty (first element), I put it in `lo`.

Hmm, but what if `lo_size > 0` but after `clean_lo()`, `lo` is actually empty? That shouldn't happen because `lo_size` tracks the effective size. If `lo_size > 0`, then after cleaning, `lo` should not be empty.

Actually wait, `lo_size` is the effective size. If `lo_size > 0`, there are at least that many non-removed elements in `lo`. After cleaning (removing marked elements from the top), the heap still has `lo_size` valid elements (they're just buried under the removed ones which we've now cleaned). So `lo` should not be empty after cleaning if `lo_size > 0`.

Let me also handle the edge case where `k = 1`:
- lo_target = 1, hi_target = 0
- We always keep 1 element in lo
- Median is just -lo[0]
- This should work.

Let me trace through a small example:
nums = [1, 3, 5, 4, 2], k = 3
lo_target = 2, hi_target = 1

i=0: val=1, lo is empty, push to lo. lo=[1], lo_size=1. No rebalance needed (1 < 2). i < k-1=2, no remove, no record.

i=1: val=3, lo_size=1>0, clean_lo (nothing to clean), 3 > -lo[0]=1, push to hi. hi=[3], hi_size=1. Rebalance: lo_size=1 < 2, so move from hi: pop 3 from hi, push to lo. lo=[1,3] (as max-heap: [-3,-1]), lo_size=2, hi_size=0. i < 2, no remove, no record.

i=2: val=5, lo_size=2>0, clean_lo, 5 > -lo[0]=3, push to hi. hi=[5], hi_size=1. Rebalance: lo_size=2, hi_size=1. lo_target=2, hi_target=1. OK. i >= k-1=2, record median. k=3 is odd, median = -lo[0] = 3. ✓ (median of [1,3,5] is 3)

i=3: val=4, lo_size=2>0, clean_lo, 4 > -lo[0]=3, push to hi. hi=[4,5], hi_size=2. Rebalance: hi_size=2 > hi_target=1, so move from hi to lo: clean_hi, pop 4 from hi, push to lo. lo=[-4,-1,-3] wait no. lo was [-3,-1] (representing 3,1). Push -4: [-4,-1,-3]. lo_size=3, hi_size=1. Now lo_size=3 > lo_target=2, so move from lo to hi: clean_lo, pop -4 (which is 4), push to hi. lo=[-3,-1], lo_size=2, hi=[5,4] wait hi was [5] and we push 4: [4,5]. hi_size=2. Hmm that's not right.

Wait let me redo. After i=2: lo = [-3, -1] (max-heap, represents values 3, 1), hi = [5] (min-heap), lo_size=2, hi_size=1.

i=3: val=4. lo_size=2>0. clean_lo: to_remove is empty, so nothing to clean. -lo[0] = 3. 4 > 3, so push to hi. hi = [4, 5], hi_size=2.
Rebalance: lo_size=2, hi_size=2. lo_target=2, hi_target=1. hi_size > hi_target, so move from hi to lo. clean_hi: nothing to clean. Pop from hi: 4. hi_size=1. Push -4 to lo. lo = [-4, -1, -3] (heap-ified: [-4, -1, -3]), lo_size=2... wait lo_size was 2, now 3? No: lo_size was 2, we pop from hi (hi_size becomes 1), push to lo (lo_size becomes 3).

Wait I'm confusing myself. Let me re-examine the rebalance logic:

```
elif hi_size > hi_target:
    clean_hi()
    v = heapq.heappop(hi)
    hi_size -= 1
    heapq.heappush(lo, -v)
    lo_size += 1
```

So: hi_size goes from 2 to 1. lo_size goes from 2 to 3. Now lo_size=3 > lo_target=2. But I only have one rebalance step!

I think I need to handle the case where after one rebalance step, the other condition is triggered. Let me use a while loop or handle it differently.

Actually, the issue is that I can have at most 1 element out of balance at a time. Let me think...

After adding one element: total increases by 1. So exactly one of lo_size or hi_size is over its target by 1 (or both are at target if the element went to the correct place and targets weren't met before).

Wait, before adding, lo_size + hi_size = k (for i >= k-1) or i (for i < k-1).
After adding, lo_size + hi_size = k+1 (or i+1).
Targets: lo_target + hi_target = k.

So after adding, the total is k+1 but targets sum to k. That means exactly one of them is over by 1.

After removing, total goes back to k, matching targets sum.

So after adding: either lo_size = lo_target+1 and hi_size = hi_target, or lo_size = lo_target and hi_size = hi_target+1.

After removing: either lo_size = lo_target-1 and hi_size = hi_target, or lo_size = lo_target and hi_size = hi_target-1.

So I only need one rebalance step after add, and one after remove. My if/elif should work.

Let me re-trace:

After i=2: lo_size=2, hi_size=1. Total=3=k. ✓

i=3: Add 4 to hi. lo_size=2, hi_size=2. Total=4=k+1. hi_size > hi_target (2>1), so move 4 from hi to lo. lo_size=3, hi_size=1. Total=4. 

Now remove nums[0]=1. lo_size=3, hi_size=1. 
clean_lo: top is -lo[0]=4. Is 1 <= 4? Yes. So to_remove[1] += 1, lo_size=2.
Now lo_size=2 = lo_target, hi_size=1 = hi_target. No rebalance needed.

Record median: clean_lo: to_remove has {1:1}. Top of lo is 4 (=-lo[0]). 4 != 1, so no clean. 
k=3 odd, median = -lo[0] = 4.
The window is [3,5,4], sorted [3,4,5], median=4. ✓

i=4: Add 2. lo_size=2>0. clean_lo: top is 4, to_remove[4]=0, no clean. 2 <= 4, push to lo. lo_size=3.
Rebalance: lo_size=3 > lo_target=2. clean_lo: top is 4, to_remove[4]=0, no clean. Pop -4 (value 4) from lo. lo_size=2. Push 4 to hi. hi_size=2.
Now remove nums[1]=3. clean_lo: top of lo... lo had [-3,-1,-4] originally? Let me track the actual heaps.

Hmm, let me track the actual heap contents:

After i=0: lo = [-1], hi = []
After i=1: 
- Add 3: 3 > 1 (=-lo[0]), push to hi. hi=[3], hi_size=1.
- Rebalance: hi_size=1, hi_target=1. lo_size=1, lo_target=2. lo_size < lo_target.
  Wait, my code has:
  ```
  if lo_size > lo_target: ...
  elif hi_size > hi_target: ...
  ```
  But I also need to handle lo_size < lo_target!

Oh I see the issue. After adding to hi, lo_size might be below target. Let me fix:

After adding:
- If lo_size > lo_target: move from lo to hi
- If hi_size > hi_target: move from hi to lo

These two cases cover it because the total is k+1 and targets sum to k, so exactly one is over.

But wait, what if lo_size < lo_target AND hi_size < hi_target? That can't happen because lo_size + hi_size = k+1 > k = lo_target + hi_target.

What if lo_size = lo_target and hi_size = hi_target + 1? Then hi_size > hi_target, move from hi to lo. ✓
What if lo_size = lo_target + 1 and hi_size = hi_target? Then lo_size > lo_target, move from lo to hi. ✓

OK so my logic is correct. Let me re-trace.

After i=0: lo=[-1], lo_size=1, hi=[], hi_size=0. (Total=1, targets: 2,1. Not full window yet.)

i=1: Add 3. lo_size=1>0. clean_lo (nothing). -lo[0]=1. 3>1, push to hi. hi=[3], hi_size=1.
Rebalance: lo_size=1, lo_target=2. hi_size=1, hi_target=1. 
lo_size < lo_target (1<2) but my code only checks lo_size > lo_target or hi_size > hi_target. Neither is true!

This is a bug. For partial windows (before we have k elements), the total is less than k, so it's possible that neither heap is over its target.

I think the issue is that for partial windows, I should use different targets. Let me use dynamic targets based on current window size:

current_size = min(i+1, k)  # after adding
lo_target = (current_size + 1) // 2
hi_target = current_size // 2

For i=0: current_size=1, lo_target=1, hi_target=0. lo_size=1=lo_target. ✓
For i=1: current_size=2, lo_target=1, hi_target=1. lo_size=1, hi_size=1. ✓
For i=2: current_size=3, lo_target=2, hi_target=1. lo_size=1, hi_size=1. lo_size < lo_target!

Hmm, so I need to also handle lo_size < lo_target. Let me change the rebalance to:

```
if lo_size > lo_target:
    move lo -> hi
elif hi_size > hi_target:
    move hi -> lo
```

But for i=2, after adding 5: lo_size=1, hi_size=2 (5 goes to hi since 5>3). 
lo_target=2, hi_target=1. hi_size=2 > hi_target=1. Move from hi to lo. ✓

Wait, let me redo. After i=1: lo=[-1], lo_size=1, hi=[3], hi_size=1.
i=2: Add 5. lo_size=1>0. clean_lo. -lo[0]=1. 5>1. Push to hi. hi=[3,5], hi_size=2.
current_size=3, lo_target=2, hi_target=1.
hi_size=2 > hi_target=1. Move from hi to lo: pop 3 from hi, push to lo. lo=[-3,-1], lo_size=2, hi=[5], hi_size=1.
Record: k=3 odd, median=-lo[0]=3. Window=[1,3,5], median=3. ✓

i=3: Add 4. lo_size=2>0. clean_lo. -lo[0]=3. 4>3. Push to hi. hi=[4,5], hi_size=2.
current_size=3 (min(4,3)=3), lo_target=2, hi_target=1.
hi_size=2 > 1. Move from hi to lo: pop 4, push to lo. lo=[-4,-1,-3] (heap), lo_size=3, hi=[5], hi_size=1.
Now lo_size=3 > lo_target=2! But I already did the rebalance...

Oh wait, I see the issue. After moving from hi to lo, lo_size becomes 3 which is > lo_target=2. I need another rebalance step.

The problem is: I added to hi (hi_size went from 1 to 2), then I moved from hi to lo (hi_size went from 2 to 1, lo_size went from 2 to 3). Now lo is over.

So I need a while loop, or I need to think about this differently.

Actually, let me reconsider. The issue is that I'm adding to the "wrong" heap in some cases. 

A better strategy: 
- Always add to lo first (push to lo).
- Then if lo_size > lo_target, pop from lo and push to hi.

This way, after adding:
- If it belongs in lo: lo_size increases by 1, then possibly decreases by 1 (if over target). Net: 0 or +1.
- If it belongs in hi: it gets added to lo, then immediately moved to hi. Net: hi_size +1.

Let me try this approach:

```
# Add
heapq.heappush(lo, -val)
lo_size += 1

# Rebalance: if lo_size > lo_target, move top of lo to hi
if lo_size > lo_target:
    clean_lo()
    v = -heapq.heappop(lo)
    lo_size -= 1
    heapq.heappush(hi, v)
    hi_size += 1
```

This ensures that after adding, lo_size <= lo_target. And since total increased by 1, hi_size = total - lo_size >= total - lo_target = hi_target (when total = k+1, hi_size >= k+1-lo_target = hi_target+1). Wait, that's not right either.

Hmm, let me think differently. 

Total after add = old_total + 1.
lo_target + hi_target = k.
If old_total = k (full window), new total = k+1. lo_size + hi_size = k+1.
If lo_size <= lo_target, then hi_size = k+1 - lo_size >= k+1-lo_target = hi_target + 1.

So hi_size would be at least hi_target + 1. That means I'd need to move from hi to lo, which is the opposite direction!

OK I think the cleanest approach is:

1. Add to the appropriate heap based on value comparison.
2. Rebalance: 
   - If lo_size > lo_target: pop from lo, push to hi.
   - If hi_size > hi_target: pop from hi, push to lo.
   - (Only one of these can be true at a time given the total constraint.)

And for the partial window case (i < k-1), I use dynamic targets.

But the issue I found is that after rebalancing, the OTHER heap might be over. This happens because the element was added to the "wrong" heap.

Example: lo_target=2, hi_target=1. lo has [1,3] (lo_size=2), hi has [5] (hi_size=1). Add 4.
- 4 > 3 (max of lo), so add to hi. hi_size becomes 2.
- hi_size > hi_target (2>1), so move 4 from hi to lo. lo_size becomes 3.
- Now lo_size > lo_target (3>2)!

So I need to move from lo to hi. But I already moved from hi to lo!

The solution: I need to move the MINIMUM of hi to lo, not just any element. In this case, I should move 4 (the min of hi=[4,5]) to lo, and then... I still have lo_size=3 > 2.

Wait, I think the issue is more fundamental. Let me reconsider.

The correct approach for "add to appropriate heap":
- If val <= max_of_lo: add to lo
- Else: add to hi

Then rebalance:
- While lo_size > lo_target: move min_of_lo (which is -lo[0]) to hi
- While hi_size > hi_target: move min_of_hi (which is hi[0]) to lo

But can both while loops execute? Only if lo_size > lo_target AND hi_size > hi_target, which means lo_size + hi_size > lo_target + hi_target = k. But total after add is at most k+1 (for full window). So at most one heap is over by 1.

Wait, in my example: lo_size=3, hi_size=1, total=4=k+1. lo_target=2, hi_target=1. lo_size > lo_target (3>2), hi_size = hi_target (1=1). So only lo is over. I should move from lo to hi.

But I already moved from hi to lo in the first rebalance step! So I need to undo that.

I think the issue is that I'm adding to hi when I should have added to lo, or the rebalancing should be:

Actually, I think the correct algorithm is:
1. Add val to lo (always).
2. If lo_size > lo_target, move min_of_lo to hi.

This ensures:
- lo_size <= lo_target always.
- The element is in the correct heap (if it's larger than the new max of lo, it gets moved to hi).

Let me verify: 
- lo=[1,3] (lo_size=2=lo_target), hi=[5] (hi_size=1=hi_target). Add 4.
- Push -4 to lo: lo=[-4,-1,-3] (lo_size=3).
- lo_size=3 > lo_target=2. Pop -4 (value 4) from lo, push to hi. lo=[-3,-1] (lo_size=2), hi=[4,5] (hi_size=2).
- But hi_size=2 > hi_target=1!

Argh, same problem.

OK, I think the fundamental issue is that with two heaps of fixed sizes, when you add an element that belongs in hi but lo is at capacity, you need to:
1. Push to lo temporarily
2. Pop the min of lo (which might be the new element or the old min)
3. Push that to hi
4. If the old min of lo was smaller than the new element, it should stay in lo. But we already moved it!

I think the standard approach is:

```
if lo_size > 0 and val <= -lo[0]:
    push to lo
else:
    push to hi

# Now rebalance
if lo_size > lo_target:
    move min of lo to hi
if hi_size > hi_target:
    move min of hi to lo
```

And the key insight: at most ONE of these conditions can be true (because total = k+1 and targets sum to k).

In my example: lo=[1,3] (size 2), hi=[5] (size 1). Add 4.
- 4 > 3, so push to hi. lo_size=2, hi_size=2.
- lo_size=2 = lo_target. Not over.
- hi_size=2 > hi_target=1. Move min of hi to lo.
  - min of hi is 4. Pop 4 from hi, push to lo. lo=[-4,-1,-3] (size 3), hi=[5] (size 1).
- Now lo_size=3 > lo_target=2. But we already passed the "if lo_size > lo_target" check!

So I need to use a loop, or reorder the checks. The issue is that the rebalancing can "cascade."

Solution: Use a while loop, or just do:

```
# After add, total is k+1 (or i+1 for partial)
# We need lo_size == lo_target and hi_size == hi_target
# Since total = lo_target + hi_target + 1, exactly one is over by 1.
if lo_size > lo_target:
    move lo -> hi
elif hi_size > hi_target:
    move hi -> lo
```

But this only handles ONE step. In my example, after adding to hi, hi_size=2 > 1, so I move hi->lo, making lo_size=3 > 2. But I need another step!

The real issue: I should NOT have added 4 to hi. I should have added it to lo (since 4 > 1, the current min of lo, but 4 < 5, the min of hi). Wait no, the rule is: add to lo if val <= max_of_lo, else add to hi. max_of_lo = 3. 4 > 3, so add to hi. That's correct.

But then hi has [4,5] and we need to remove one. We remove 4 (the min of hi) and put it in lo. Now lo has [1,3,4] which is too big. We should remove 1 (the min of lo) and put it in hi. Now lo=[3,4], hi=[1,5]. But that's wrong! 1 should be in lo, not hi!

I see the problem now. The issue is that when I add to hi and then move the min of hi to lo, I might be moving an element that's larger than some elements in lo. The correct thing to do is:

When adding to hi makes hi too big: I should move the min of hi to lo. But the min of hi (4) is larger than max of lo (3), so the invariant (all of lo <= all of hi) is maintained. But lo becomes too big. Then I should move the min of lo to hi. The min of lo is 1, which is < 4 (now in hi). So the invariant is maintained.

But the final state is lo=[3,4], hi=[1,5] which violates the invariant (1 < 3 but 1 is in hi)!

So the two-step rebalance doesn't work with just "move min." I need a different strategy.

I think the correct approach is:

**Strategy: Always add to lo, then rebalance by moving the max of lo to hi if lo is too big.**

```
heapq.heappush(lo, -val)
lo_size += 1

if lo_size > lo_target:
    # Move max of lo (= -lo[0]) to hi
    clean_lo()
    v = -heapq.heappop(lo)
    lo_size -= 1
    heapq.heappush(hi, v)
    hi_size += 1
```

Let me verify: lo=[1,3] (lo_size=2=lo_target), hi=[5] (hi_size=1=hi_target). Add 4.
- Push -4 to lo: lo=[-4,-1,-3] (lo_size=3).
- lo_size=3 > lo_target=2. Pop -4 (value 4), push to hi. lo=[-3,-1] (lo_size=2), hi=[4,5] (hi_size=2).
- hi_size=2 > hi_target=1. But I don't check this!

Same problem!

OK let me think about this differently. The standard "median of a stream" algorithm uses:
- lo (max-heap) and hi (min-heap)
- Invariant: all elements in lo <= all elements in hi
- Size invariant: |lo| - |hi| <= 1 (for odd total) or |lo| = |hi| (for even total)

For sliding window, the sizes are fixed: |lo| = lo_target, |hi| = hi_target.

The standard insertion:
```
if lo is empty or val <= -lo[0]:
    push to lo
else:
    push to hi

# Rebalance
if lo_size > lo_target:
    move -lo[0] to hi
if hi_size > hi_target:
    move hi[0] to lo
```

The key: with the size constraint |lo| = lo_target and |hi| = hi_target (where lo_target + hi_target = k), and the value constraint (all of lo <= all of hi), the rebalancing should work in at most one step.

Let me re-examine my example:
lo=[1,3] (lo_size=2), hi=[5] (hi_size=1). lo_target=2, hi_target=1.
Add 4: 4 > 3 (=-lo[0]), so push to hi. lo_size=2, hi_size=2.
Rebalance: hi_size=2 > hi_target=1. Move hi[0]=4 to lo. lo=[1,3,4] (lo_size=3), hi=[5] (hi_size=1).
Now lo_size=3 > lo_target=2. But I already checked! 

The issue: I need to check BOTH conditions, not just one. Or use a loop.

Actually, I realize: after the add, total = k+1. So lo_size + hi_size = k+1 = lo_target + hi_target + 1. This means exactly one of them is over by 1. After moving one element, both are at target.

But in my example: before add, lo_size=2, hi_size=1, total=3=k. After add, total=4=k+1. lo_size=2, hi_size=2. 
lo_target=2, hi_target=1. 
lo_size=2 = lo_target (not over). hi_size=2 > hi_target=1 (over by 1).
Move from hi to lo: lo_size=3, hi_size=1.
Now lo_size=3 > lo_target=2 (over by 1). hi_size=1 = hi_target.

So after the move, the OTHER heap is over! Total is still 4=k+1. lo_target+hi_target=k=3. So 4 > 3, one is over by 1.

The issue is: I moved from hi to lo, making lo over. But I should have moved from lo to hi (or not moved at all and just left the element in hi... but hi is over).

I think the real issue is that my initial add decision is wrong. Let me reconsider.

When I add 4 and lo=[1,3], hi=[5]:
- 4 > max(lo) = 3, so it goes to hi.
- But hi can only hold 1 element (hi_target=1), and it already has 5.
- So I need to put 4 in lo and 5 in hi.

The correct algorithm should be:
```
if val <= -lo[0]:  # belongs in lo
    push to lo
    if lo_size > lo_target:
        move -lo[0] to hi
else:  # belongs in hi
    push to hi
    if hi_size > hi_target:
        # Need to make room in hi
        # Move the LARGEST of (val, hi[0]) to... wait
        # Actually, move hi[0] (the min of hi, which is <= val) to lo
        # No wait, we want to keep the smallest hi_target elements in hi
        # hi[0] is the smallest in hi. We want the largest elements in hi.
        # So we should move hi[0] (the smallest) to lo.
        # But then lo might be too big...
```

Hmm, I think the issue is that when we push to hi and hi is over capacity, we should:
1. Pop the min from hi (which is the "smallest" in the upper half)
2. Push that to lo
3. But then lo might be over, so pop max from lo (which might be the element we just added or an older one)
4. Push that to hi

This is essentially: push val to hi, then pop min from hi to lo, then pop max from lo to hi. The net effect is that val ends up in hi and the "boundary" element gets swapped.

Actually, I think a cleaner way:

```
# Always push to lo first
heapq.heappush(lo, -val)
lo_size += 1

# Then push the max of lo to hi if lo is over
if lo_size > lo_target:
    clean_lo()
    v = -heapq.heappop(lo)
    lo_size -= 1
    heapq.heappush(hi, v)
    hi_size += 1
```

This ensures:
- lo_size never exceeds lo_target.
- The largest element in lo gets moved to hi.
- After this, hi_size might exceed hi_target.

Let's trace: lo=[1,3] (lo_size=2), hi=[5] (hi_size=1). lo_target=2, hi_target=1.
Add 4: push -4 to lo. lo=[-4,-1,-3] (lo_size=3). lo_size=3>2. Pop -4 (val=4). Push 4 to hi. lo=[-3,-1] (lo_size=2), hi=[4,5] (hi_size=2).

Now hi_size=2 > hi_target=1. I need to move from hi to lo. But I already did the "move from lo to hi" step!

I think the fundamental issue is that with FIXED size targets, the "always push to lo then rebalance" approach requires potentially two moves. But that's fine if I use a loop:

```
# Push to lo
heapq.heappush(lo, -val)
lo_size += 1

# Rebalance
while lo_size > lo_target:
    clean_lo()
    v = -heapq.heappop(lo)
    lo_size -= 1
    heapq.heappush(hi, v)
    hi_size += 1

while hi_size > hi_target:
    clean_hi()
    v = heapq.heappop(hi)
    hi_size -= 1
    heapq.heappush(lo, -v)
    lo_size += 1
```

But can the second while loop trigger the first again? If hi_size > hi_target, I move from hi to lo, making lo_size potentially > lo_target, triggering the first loop again. In theory, this could oscillate, but in practice with the size constraints, at most 2 iterations total.

Actually, let's think: total = k+1 after add. lo_target + hi_target = k. So total = lo_target + hi_target + 1. At any point, lo_size + hi_size = k+1. If lo_size > lo_target, then hi_size = k+1-lo_size < k+1-lo_target = hi_target+1. So hi_size <= hi_target. The second while won't execute.

If hi_size > hi_target, then lo_size = k+1-hi_size < k+1-hi_target = lo_target+1. So lo_size <= lo_target. The first while won't execute.

So at most ONE of the while loops executes, and only once! Great.

Let me verify with my example:
lo=[1,3] (lo_size=2), hi=[5] (hi_size=1). lo_target=2, hi_target=1. Total=3=k.
Add 4: push to lo. lo_size=3, hi_size=1. Total=4=k+1.
lo_size=3 > lo_target=2. Move from lo to hi: pop 4 (=-lo[0]... wait, lo=[-4,-1,-3], -lo[0]=4). Push 4 to hi. lo_size=2, hi_size=2.
Now hi_size=2 > hi_target=1. Move from hi to lo: pop 4 (hi=[4,5], hi[0]=4). Push -4 to lo. lo_size=3, hi_size=1.
Now lo_size=3 > lo_target=2 again!

Total is still 4=k+1. lo_target+hi_target=3. So one of them must be over by 1. After the second move: lo_size=3, hi_size=1. lo_size > lo_target. Move from lo to hi: pop max of lo. lo was [-4,-1,-3] after pushing -4. Wait, let me retrace.

After first move: lo=[-3,-1] (lo_size=2), hi=[4,5] (hi_size=2).
Second move: pop hi[0]=4. hi=[5] (hi_size=1). Push -4 to lo. lo=[-4,-1,-3] (lo_size=3).
Third move: pop -lo[0]=4 from lo. lo=[-3,-1] (lo_size=2). Push 4 to hi. hi=[4,5] (hi_size=2).

We're oscillating! 4 keeps going back and forth!

The problem: 4 is exactly at the boundary. It could be in either lo or hi. The oscillation happens because 4 is >= max(lo) after the first move (max of lo=[1,3] is 3, and 4>3) AND 4 is <= min(hi) (min of hi=[4,5] is 4, and 4<=4).

I think the fix is to use a slightly different comparison or to handle the boundary case. Actually, I think the real issue is that I should use a "strict" comparison in one direction.

Standard approach for two-heap median:
- If val <= max(lo): push to lo
- Else: push to hi
- Rebalance

With the "always push to lo" approach, the oscillation happens because the element being moved is equal to the boundary.

I think the cleanest solution is to NOT use "always push to lo" but instead:

```
if lo_size > 0 and val <= -lo[0]:
    push to lo
    lo_size += 1
else:
    push to hi
    hi_size += 1

# Rebalance (at most one step needed)
if lo_size > lo_target:
    move -lo[0] from lo to hi
elif hi_size > hi_target:
    move hi[0] from hi to lo
```

And the key insight: after the add, total = k+1 (for full window). lo_size + hi_size = k+1. Exactly one is over its target by 1. The rebalance fixes it in one step.

Let me re-verify:
lo=[1,3] (lo_size=2), hi=[5] (hi_size=1). lo_target=2, hi_target=1.
Add 4: 4 > -lo[0]=3. Push to hi. lo_size=2, hi_size=2.
Rebalance: lo_size=2 not > 2. hi_size=2 > 1. Move hi[0]=4 to lo. lo_size=3, hi_size=1.

Now lo_size=3 > lo_target=2! But I already did the rebalance!

Hmm, the issue persists. The total after add is 4=k+1, and after the one rebalance step it's still 4. lo_target+hi_target=3. So one is still over.

Wait, I think I was wrong. Let me recheck: before add, lo_size+hi_size = 2+1 = 3 = k. After add, lo_size+hi_size = 2+2 = 4 = k+1. lo_target+hi_target = 2+1 = 3 = k. So after add, total = k+1 > k = lo_target+hi_target. One heap is over by 1.

After rebalancing (moving 1 element): total is still k+1 (we moved, didn't add or remove). Wait no, we're just moving between heaps, so total stays k+1.

But we need lo_size = lo_target AND hi_size = hi_target, which sums to k, not k+1!

OH WAIT. I think I see the error. The total after adding should be k+1 only temporarily. Then we remove an element (if window is full), bringing total back to k. So the rebalancing should happen AFTER the removal.

Let me restructure:
1. Add element (total becomes k+1 for full window, or i+1 for partial)
2. Remove element (total goes back to k for full window)
3. Rebalance (total is now k = lo_target + hi_target)

For partial windows (i < k-1), total after add is i+1 < k. Targets should be dynamic.

For full windows (i >= k-1):
- After add: total = k+1
- After remove: total = k
- Rebalance to lo_target + hi_target = k

This makes sense! The rebalancing should happen after both add and remove.

Let me restructure:

```
for i in range(n):
    # Add
    add(nums[i])
    
    # Remove (if window is full)
    if i >= k:
        remove(nums[i-k])
    
    # Rebalance
    rebalance()
    
    # Record
    if i >= k-1:
        record_median()
```

For the full window case: after add+remove, total = k = lo_target + hi_target. The rebalance ensures lo_size = lo_target and hi_size = hi_target. Since total is exactly k, if lo_size > lo_target, then hi_size < hi_target (and vice versa). So one rebalance step is sufficient.

For the partial window case (i < k-1): after add, total = i+1. We want lo_size = (i+1+1)//2 = (i+2)//2 and hi_size = (i+1)//2. Or we can just maintain lo_size >= hi_size.

Actually, for the partial window, I'll just use dynamic targets:
- current_size = min(i+1, k)
- lo_target = (current_size + 1) // 2
- hi_target = current_size // 2

And the rebalance works the same way.

Let me re-code:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    lo = []   # max-heap (negated)
    hi = []   # min-heap
    to_remove = Counter()
    lo_size = 0
    hi_size = 0
    
    result = []
    
    def clean_lo():
        nonlocal lo_size
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            lo_size -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        nonlocal hi_size
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            hi_size -= 1
            heapq.heappop(hi)
    
    for i in range(n):
        current_size = min(i + 1, k)
        lo_target = (current_size + 1) // 2
        hi_target = current_size // 2
        
        # Add nums[i]
        val = nums[i]
        if lo_size > 0:
            clean_lo()
            if val <= -lo[0]:
                heapq.heappush(lo, -val)
                lo_size += 1
            else:
                heapq.heappush(hi, val)
                hi_size += 1
        else:
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # Remove nums[i-k] if applicable
        if i >= k:
            old = nums[i - k]
            clean_lo()
            clean_hi()
            if lo_size > 0 and old <= -lo[0]:
                to_remove[old] += 1
                lo_size -= 1
            else:
                to_remove[old] += 1
                hi_size -= 1
        
        # Rebalance
        # After add+remove, total = current_size = lo_target + hi_target
        # So at most one heap is off by 1.
        if lo_size > lo_target:
            clean_lo()
            v = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, v)
            hi_size += 1
        elif hi_size > hi_target:
            clean_hi()
            v = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -v)
            lo_size += 1
        
        # Record
        if i >= k - 1:
            clean_lo()
            clean_hi()
            if k % 2 == 1:
                result.append(float(-lo[0]))
            else:
                result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Let me trace through the example again: nums = [1, 3, 5, 4, 2], k = 3

i=0: current_size=1, lo_target=1, hi_target=0.
Add 1: lo is empty (lo_size=0), push to lo. lo=[-1], lo_size=1.
No remove.
Rebalance: lo_size=1=lo_target. OK.
No record.

i=1: current_size=2, lo_target=1, hi_target=1.
Add 3: lo_size=1>0. clean_lo. -lo[0]=1. 3>1. Push to hi. hi=[3], hi_size=1.
No remove.
Rebalance: lo_size=1=lo_target. hi_size=1=hi_target. OK.
No record.

i=2: current_size=3, lo_target=2, hi_target=1.
Add 5: lo_size=1>0. clean_lo. -lo[0]=1. 5>1. Push to hi. hi=[3,5], hi_size=2.
No remove (i=2 < k=3).
Rebalance: lo_size=1 < 2. hi_size=2 > 1. Move from hi to lo: clean_hi. Pop 3 from hi. hi=[5], hi_size=1. Push -3 to lo. lo=[-3,-1], lo_size=2.
Record: k=3 odd. clean_lo, clean_hi. -lo[0]=3. result=[3]. ✓ (median of [1,3,5])

i=3: current_size=3, lo_target=2, hi_target=1.
Add 4: lo_size=2>0. clean_lo. -lo[0]=3. 4>3. Push to hi. hi=[4,5], hi_size=2.
Remove: i=3>=k=3. old=nums[0]=1. clean_lo: -lo[0]=3. 1<=3. to_remove[1]=1. lo_size=1.
Rebalance: lo_size=1 < 2. hi_size=2 > 1. Move from hi to lo: clean_hi. hi[0]=4, to_remove[4]=0. Pop 4. hi=[5], hi_size=1. Push -4 to lo. lo=[-4,-1], lo_size=2.

Wait, lo was [-3,-1] and we push -4: lo=[-4,-1,-3] (heap-ified). lo_size=2.

Hmm wait, lo_size was 1 after the removal. Then I push to lo, lo_size=2. And I popped from hi, hi_size=1. Total=3=k. ✓

Record: clean_lo: to_remove={1:1}. -lo[0]=4. 4!=1. No clean. 
k=3 odd. -lo[0]=4. result=[3,4]. ✓ (median of [3,5,4] is 4)

i=4: current_size=3, lo_target=2, hi_target=1.
Add 2: lo_size=2>0. clean_lo: to_remove={1:1}. -lo[0]=4. 4!=1. No clean. 2<=4. Push to lo. lo=[-4,-1,-3,-2] wait... lo was [-4,-1,-3]. Push -2: [-4,-1,-3,-2] → heap-ified: [-4,-1,-3,-2]. Actually heap of [-4,-1,-3,-2]: the min-heap property means the smallest is at root. -4 < -3 < -2 < -1. So heap is [-4, -1, -3, -2]? Let me just say lo has elements {4, 1, 3, 2} (as negated: -4, -1, -3, -2). lo_size=3.

Remove: i=4>=3. old=nums[1]=3. clean_lo: to_remove={1:1}. -lo[0]=4. 4!=1. No clean. 3<=4. to_remove[3]=1. lo_size=2.

Rebalance: lo_size=2=lo_target. hi_size=1=hi_target. OK.

Record: clean_lo: to_remove={1:1, 3:1}. -lo[0]=4. 4!=1, 4!=3. No clean.
k=3 odd. -lo[0]=4. result=[3,4,4]. 

The window at i=4 is [5,4,2]. Sorted: [2,4,5]. Median=4. ✓

Let me also check: what about the element 1 in to_remove? It's still in lo (as -1). When will it be cleaned? When it reaches the top of lo. Since lo has {4,3,2,1} (effective: {4,3,2}), the max is 4. 1 is at the bottom. It'll be cleaned when 4, 3, 2 are all removed.

This looks correct!

Now, one concern: the `to_remove` dictionary. Since values are floats, I'm using them as dict keys. This should be fine for exact float values (which is what we have from the input list).

Let me also consider the edge case where `lo` is empty but `lo_size > 0` (all elements in lo are marked for removal). This can happen after many removals. The `clean_lo()` call before accessing `-lo[0]` handles this.

But wait, in the "Remove" section, I do:
```
clean_lo()
clean_hi()
if lo_size > 0 and old <= -lo[0]:
```

If lo is empty (all removed), `lo_size` should be 0 (after cleaning). So we'd go to the else branch. Good.

But what if `hi` is empty and `hi_size > 0`? Same logic: after cleaning, if hi is empty, hi_size should be 0.

Actually wait, there's a subtle issue. When I do `clean_lo()`, it pops elements from lo that are marked for removal. But what if ALL elements in lo are marked? Then lo becomes empty and lo_size becomes 0. That's fine.

But what if I try to access `-lo[0]` when lo is empty? I should guard against that. In my code, I check `lo_size > 0` before accessing `-lo[0]`, and I call `clean_lo()` first. After cleaning, if lo_size > 0, then lo is not empty. ✓

Let me also think about performance. For n=200,000 and k=1000:
- Each iteration: O(log k) for heap operations + O(1) for cleaning (amortized, since each element is cleaned at most once).
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations.
- This should be well under 2 seconds in Python.

One more thing: I should make sure the function returns a list of floats. The `-lo[0]` gives a float (since nums are floats), and `(-lo[0] + hi[0]) / 2.0` also gives a float. For the odd case, `-lo[0]` is already a float. I'll cast to float explicitly to be safe.

Actually, since the input is `list[float]`, all values are already floats. So `-lo[0]` is a float. Good.

Let me also handle the case where k=1 specially for efficiency (just return nums as a list of floats).

Actually, the general algorithm handles k=1 fine:
- lo_target = 1, hi_target = 0.
- We always keep 1 element in lo.
- Median is -lo[0].

Let me finalize the code. I'll also add the `from __future__ import annotations` or just use the modern syntax since Python 3.11+ is required.

One more thought: the `Counter` import. I'll use a regular dict instead to avoid the import overhead... actually Counter is fine, it's in the standard library.

Wait, I realize I should double-check: can `old <= -lo[0]` be wrong? If `old` is in hi but `old <= -lo[0]` (max of lo), that would be a bug. But the invariant says all elements in lo <= all elements in hi. So if old is in hi, old >= -lo[0] (max of lo). And if old is in lo, old <= -lo[0]. So the check `old <= -lo[0]` correctly identifies whether old is in lo (assuming the invariant holds).

But what if old equals -lo[0]? It could be in either heap. The check `old <= -lo[0]` would say it's in lo. But it might actually be in hi!

This is a known issue with the two-heap approach. The standard solution is:
- If old == -lo[0] (or == hi[0]), it could be in either.
- One approach: check if old is in lo by comparing with -lo[0]. If old <= -lo[0], assume it's in lo. If old >= hi[0], assume it's in hi. If old == -lo[0] == hi[0], it could be in either, and we just pick one (it doesn't matter for correctness since they have the same value).

Actually, the standard approach handles this correctly:
- If old <= -lo[0]: it's in lo (or equal to max of lo, in which case we assume lo)
- Elif old >= hi[0]: it's in hi
- If old == -lo[0] == hi[0]: it's in both (conceptually), we pick one.

In practice, with the lazy deletion approach, as long as we're consistent about which heap we mark for removal, it works out. The key insight: if old == -lo[0] and we mark it for removal in lo, but it was actually in hi, then:
- When we clean lo, we'll pop a DIFFERENT element with the same value (since there are two elements with value `old`, one in each heap).
- The counts will still work out.

Wait, that's only true if there are duplicates. If all values are unique, then old == -lo[0] means old IS in lo.

With duplicates: if there are two 3's, one in lo and one in hi, and I remove a 3 by marking to_remove[3] += 1 in lo, then when I clean lo, I'll pop one 3 from lo (the one that's there). The one in hi stays. That's correct.

So the logic is fine. Let me finalize.

Actually, I want to double-check one more potential issue: when I do the "Remove" step, I check `old <= -lo[0]`. But what if `lo` is empty (lo_size == 0 after cleaning)? Then I can't access -lo[0]. My code has `if lo_size > 0 and old <= -lo[0]`, which handles this.

But what if lo_size == 0 and hi_size == 0? That means the window is empty, which shouldn't happen for k >= 1.

What if lo_size > 0 but after clean_lo(), lo is empty? That can't happen because clean_lo() only removes elements that are marked for removal, and lo_size tracks the count of non-removed elements. If lo_size > 0 before cleaning, there are > 0 non-removed elements, so lo won't be empty after cleaning.

Wait, actually: lo_size is decremented in clean_lo() for each element removed. So if lo_size was 3 and there are 2 elements marked for removal at the top, after cleaning lo_size = 1 and lo has 1 element. If lo_size was 3 and there are 3 elements marked at the top (the entire heap), after cleaning lo_size = 0 and lo is empty.

So the invariant is: after clean_lo(), lo is empty iff lo_size == 0. ✓

I think the code is correct. Let me write the final version.

Actually, one more optimization: for the common case, I can avoid calling clean_lo/clean_hi multiple times in the same iteration. Let me just be clean about it.

Let me also reconsider: do I need `clean_hi()` in the "Remove" section? I need it to access `hi[0]` safely. But I'm not accessing `hi[0]` in the remove section, I'm only accessing `-lo[0]`. So I only need `clean_lo()`.

Wait, in my code:
```
clean_lo()
clean_hi()
if lo_size > 0 and old <= -lo[0]:
```

I only need `clean_lo()` for the `-lo[0]` access. The `clean_hi()` is not strictly necessary here. But it doesn't hurt.

OK let me write the final clean version.
