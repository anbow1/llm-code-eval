We need to implement a sliding window median function that's efficient for n=200,000 and k=1,000.

The naive approach would be O(n*k) which is 200,000 * 1,000 = 200 million operations - too slow.

We need an efficient approach. Options:
1. Two heaps (min-heap and max-heap) - O(n log k)
2. Sorted list with bisect - O(n * k) in worst case due to insert/delete, but with k=1000 and n=200000, that's 200,000 * 1000 = 200M operations for the sorted list operations. Actually, list insertion is O(k) so total is O(n*k) = 200M. That might be borderline.
3. Two heaps approach: O(n log k) = 200,000 * log(1000) ≈ 200,000 * 10 = 2M operations. Much better.

Let me go with the two-heaps approach:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- For even k: median = (max of lower + min of upper) / 2
- For odd k: median = max of lower (the middle element)

The invariants:
- len(lower) >= len(upper) (for odd k, lower has one more)
- All elements in lower <= all elements in upper

Let me think about the implementation:

For k even: len(lower) = k//2, len(upper) = k//2
For k odd: len(lower) = (k+1)//2, len(upper) = (k-1)//2

Approach:
- Use a max-heap for the lower half (negate values to use heapq as min-heap)
- Use a min-heap for the upper half

Operations:
- Add new element, remove old element
- Rebalance

Let me think more carefully:

We maintain:
- `lower`: max-heap (using negative values), size = (k+1)//2 for odd k, k//2 for even k
- `upper`: min-heap, size = k//2 for both cases

When adding a new element x:
- If x < max(lower), put in lower
- If x > min(upper), put in upper
- Rebalance

When removing old element:
- Remove from whichever heap it belongs to
- Rebalance

Actually, let me think of a cleaner approach:

Standard approach for sliding window median with two heaps:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    # lower: max-heap (negated), upper: min-heap
    lower = []  # max-heap via negation
    upper = []  # min-heap
    
    # Target sizes
    if k % 2 == 0:
        lower_size = k // 2
        upper_size = k // 2
    else:
        lower_size = (k + 1) // 2
        upper_size = (k - 1) // 2
    
    # Initialize first window
    for i in range(k):
        x = nums[i]
        if len(lower) < lower_size:
            heapq.heappush(lower, -x)
        else:
            heapq.heappush(upper, x)
        # Rebalance
        while len(lower) > lower_size:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > upper_size:
            heapq.heappush(lower, -heapq.heappop(upper))
    
    result = []
    # Compute median for first window
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        # Remove nums[i-k], add nums[i]
        old = nums[i - k]
        new = nums[i]
        
        # Remove old element
        if old <= -lower[0]:
            heapq.heappop(lower)
        else:
            heapq.heappop(upper)
        
        # Add new element
        if new <= -lower[0]:
            heapq.heappush(lower, -new)
        else:
            heapq.heappush(upper, new)
        
        # Rebalance
        while len(lower) > lower_size:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > upper_size:
            heapq.heappush(lower, -heapq.heappop(upper))
        
        # Compute median
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Wait, there's a problem with removing the old element. When we do `heapq.heappop(lower)`, we remove the max element of lower, but the old element might not be the max. We need to handle this more carefully.

The issue: we need to remove a specific element from a heap. This is O(k) to find and remove. With k=1000, that's 1000 per removal, total 200,000 * 1000 = 200M. That's too slow.

Alternative: Use a "lazy deletion" approach or use a sorted structure.

Actually, let me reconsider. With k=1000, the heap operations are O(log k) ≈ O(10). The problem is the removal.

Option: Use a sorted list (bisect). Insertion and deletion are O(k) each. Total: n * k = 200,000 * 1,000 = 200M operations. In Python, this might be too slow.

Option: Use two heaps with lazy deletion. We mark elements as "deleted" and clean up lazily.

Actually, let me think about this differently. The lazy deletion approach:

- When we need to remove an element, we mark it for deletion
- When we need the top of a heap, we pop until we find a non-deleted element

But this can lead to O(n) cleanup in the worst case over the entire run, but amortized it's O(1) per operation.

Actually, let me think about the sorted list approach more carefully. With k=1000:
- Each insertion: O(k) to insert into sorted list
- Each deletion: O(k) to find and remove
- Median lookup: O(1)
- Total: n * k = 200M basic operations

In Python, 200M operations might take 2-5 seconds. That's borderline.

Let me try the two-heap approach with a different strategy:

Actually, a cleaner approach: maintain two heaps and when removing, we can use the fact that we're removing a specific value. We can:
1. Pop from the appropriate heap (the one that contains the value)
2. Push the value into the other heap
3. Then pop from the other heap

Wait, that's the standard trick:
- To remove x from a heap: push x into the other heap, then pop from the other heap (which now has x at the top... no, that doesn't work).

Actually the trick is:
- To remove the minimum from a min-heap: just pop
- To remove an arbitrary element: add it to the other heap, then the other heap now has a duplicate, pop from the other heap

Hmm, let me think again.

The standard approach for "remove arbitrary element from heap":
- If x is in the min-heap: push x into max-heap, then pop from max-heap (since x is now the minimum of max-heap... no, that's not right either).

Actually, the trick works like this:
- To remove x from min-heap: push x into max-heap, then pop from max-heap. This works because after pushing x into max-heap, x becomes the maximum of max-heap (assuming all elements in max-heap are <= all elements in min-heap). Then popping from max-heap removes x.

Wait, that's only true if the invariant holds. Let me reconsider.

If lower (max-heap) contains values <= upper (min-heap):
- To remove x from lower: push x into upper, then pop from upper. Since x <= min(upper), after pushing x into upper, x is the minimum of upper. So pop from upper removes x. ✓
- To remove x from upper: push x into lower, then pop from lower. Since x >= max(lower), after pushing x into lower (as -x), x is the maximum of lower. So pop from lower removes x. ✓

So the removal trick:
- If x <= -lower[0] (x is in lower): push x into upper, pop from upper
- If x > -lower[0] (x is in upper): push x into lower (as -x), pop from lower

This is O(log k) per removal!

Let me redo:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    # Initialize
    for i in range(k):
        x = nums[i]
        if len(lower) < target_lower:
            heapq.heappush(lower, -x)
        else:
            heapq.heappush(upper, x)
        # Rebalance
        while len(lower) > target_lower:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > target_upper:
            heapq.heappush(lower, -heapq.heappop(upper))
    
    result = []
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        old = nums[i - k]
        new = nums[i]
        
        # Remove old
        if old <= -lower[0]:
            heapq.heappush(upper, old)
            heapq.heappop(upper)
        else:
            heapq.heappush(lower, -old)
            heapq.heappop(lower)
        
        # Add new
        if len(lower) > 0 and new <= -lower[0]:
            heapq.heappush(lower, -new)
        else:
            heapq.heappush(upper, new)
        
        # Rebalance
        while len(lower) > target_lower:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > target_upper:
            heapq.heappush(lower, -heapq.heappop(upper))
        
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Wait, I need to be more careful. After removing old, the sizes change. Let me trace through:

After removing old:
- If old was in lower: lower loses 1, upper gains 1 (then we pop upper, so upper loses 1). Net: lower -1, upper 0.
- If old was in upper: upper loses 1, lower gains 1 (then we pop lower, so lower loses 1). Net: lower 0, upper -1.

After adding new:
- If new goes to lower: lower +1
- If new goes to upper: upper +1

So after remove+add:
- Case 1 (old in lower, new in lower): lower: -1+1=0, upper: 0. Need to move 1 from lower to upper.
- Case 2 (old in lower, new in upper): lower: -1, upper: +1. Already balanced.
- Case 3 (old in upper, new in lower): lower: +1, upper: -1. Need to move 1 from lower to upper.
- Case 4 (old in upper, new in upper): lower: 0, upper: -1+1=0. Already balanced.

Hmm, the rebalancing should handle all cases. Let me just make sure the rebalancing logic is correct.

Actually, I think the approach is sound. The rebalancing while loops will fix any imbalance. Let me also handle the edge case where lower might be empty (k=1).

For k=1: target_lower = 1, target_upper = 0. The median is just the element itself.

Let me also consider: what if after removal, lower is empty? Then -lower[0] would fail. But if k >= 1, after removal and before addition, we have k-1 elements. If k=1, we have 0 elements temporarily. Let me handle this.

Actually for k=1:
- target_lower = 1, target_upper = 0
- Initialize: push nums[0] into lower
- For each step: remove old (which is in lower), add new (which goes to lower since lower is empty or new <= -lower[0])

Wait, if lower is empty after removal, then `new <= -lower[0]` would fail. Let me add a check: if lower is empty, push new into lower.

Let me restructure:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    # Initialize
    for i in range(k):
        x = nums[i]
        if len(lower) < target_lower:
            heapq.heappush(lower, -x)
        else:
            heapq.heappush(upper, x)
        # Rebalance
        while len(lower) > target_lower:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > target_upper:
            heapq.heappush(lower, -heapq.heappop(upper))
    
    result = []
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        old = nums[i - k]
        new = nums[i]
        
        # Remove old using the swap trick
        if old <= -lower[0]:
            heapq.heappush(upper, old)
            heapq.heappop(upper)
        else:
            heapq.heappush(lower, -old)
            heapq.heappop(lower)
        
        # Add new
        if len(lower) == 0 or new <= -lower[0]:
            heapq.heappush(lower, -new)
        else:
            heapq.heappush(upper, new)
        
        # Rebalance
        while len(lower) > target_lower:
            heapq.heappush(upper, -heapq.heappop(lower))
        while len(upper) > target_upper:
            heapq.heappush(lower, -heapq.heappop(upper))
        
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Let me verify with a small example:
nums = [1, 2, 3, 4, 5], k = 3

target_lower = 2, target_upper = 1

Initialize:
- x=1: len(lower)=0 < 2, push -1. lower=[-1], upper=[]
- x=2: len(lower)=1 < 2, push -2. lower=[-2,-1], upper=[]
- x=3: len(lower)=2 = 2, push 3. lower=[-2,-1], upper=[3]
  Rebalance: len(lower)=2=2, len(upper)=1=1. OK.

Median: -lower[0] = 2. ✓ (median of [1,2,3] is 2)

Step i=3: old=1, new=4
- old=1 <= -lower[0]=2: push 1 to upper, pop upper. upper was [3], now [1,3], pop gives 1. upper=[3].
  lower=[-2,-1], upper=[3]
- new=4: 4 > -lower[0]=2, push to upper. upper=[3,4]
  Rebalance: len(lower)=2=2, len(upper)=2>1. Pop upper (3), push -3 to lower. lower=[-3,-2,-1], upper=[4]
  len(lower)=3>2. Pop lower (-1), push 1 to upper. lower=[-3,-2], upper=[1,4]
  len(lower)=2=2, len(upper)=2>1. Pop upper (1), push -1 to lower. lower=[-2,-1,-3]... wait.

Hmm, let me be more careful.

After remove: lower=[-2,-1], upper=[3]
After add: upper=[3,4]

Rebalance:
- len(lower)=2, target_lower=2. OK.
- len(upper)=2, target_upper=1. Pop upper: 3. Push -3 to lower. lower=[-3,-2,-1]. 
- len(lower)=3, target_lower=2. Pop lower: -1 (the min of the negated heap, which is the max value 1). Push 1 to upper. lower=[-3,-2], upper=[1,4].
- len(lower)=2, target_lower=2. OK.
- len(upper)=2, target_upper=1. Pop upper: 1. Push -1 to lower. lower=[-2,-1,-3]... 

Wait, heapq is a min-heap. lower=[-3,-2,-1] is a min-heap where -3 is the root. After popping -1, lower=[-3,-2]. After pushing -1, lower=[-3,-2,-1].

Hmm, I'm getting confused. Let me just trust the algorithm and verify the final state.

After all rebalancing for window [2,3,4]:
- lower should have 2 elements: the two smallest = 2, 3 → lower = [-3, -2] (min-heap of negated)
- upper should have 1 element: 4 → upper = [4]

Median: -lower[0] = 3. ✓ (median of [2,3,4] is 3)

Let me trace more carefully:

After remove old=1:
- 1 <= -lower[0] = 2: push 1 to upper → upper=[1,3], pop upper → removes 1, upper=[3]
- lower=[-2,-1], upper=[3]

After add new=4:
- 4 > -lower[0] = 2: push 4 to upper → upper=[3,4]
- lower=[-2,-1], upper=[3,4]

Rebalance:
- len(lower)=2, target=2. OK.
- len(upper)=2, target=1. Pop upper → 3. Push -3 to lower → lower=[-3,-2,-1]
- len(lower)=3, target=2. Pop lower → -1 (root of min-heap). Push 1 to upper → upper=[1,4]
- len(lower)=2, target=2. OK.
- len(upper)=2, target=1. Pop upper → 1. Push -1 to lower → lower=[-3,-2,-1]... 

Wait, after popping -1 from lower=[-3,-2,-1], the heap becomes [-3,-2]. Then pushing -1: lower=[-3,-2,-1]. That's 3 elements again!

I think the issue is that the rebalancing loop oscillates. Let me reconsider.

The problem: when we move an element from upper to lower, then from lower to upper, we might oscillate.

Actually wait, let me re-examine. After the first rebalance step:
- lower=[-3,-2,-1] (3 elements), upper=[1,4] (2 elements)
- len(lower)=3 > 2: pop lower → -1 (the smallest in the min-heap, i.e., the largest original value). Push 1 to upper.
- lower=[-3,-2], upper=[1,4]
- len(lower)=2 = 2. OK.
- len(upper)=2 > 1: pop upper → 1. Push -1 to lower.
- lower=[-3,-2,-1], upper=[4]
- len(lower)=3 > 2: pop lower → -1. Push 1 to upper.
- lower=[-3,-2], upper=[1,4]
- ... this oscillates!

The problem is that the element 1 keeps bouncing between the two heaps. This is a known issue with this approach.

I need a different strategy. Let me think...

The issue is that after removing an element and adding a new one, the total count is correct (k elements), but the distribution between the two heaps might need adjustment. The rebalancing should only move elements when sizes are off, but the issue is that moving one element can create a new imbalance.

Actually, I think the real issue is that my rebalancing is moving elements back and forth. Let me think about this differently.

The correct approach: after remove+add, we have k elements total. We need lower to have target_lower elements and upper to have target_upper elements. If lower has too many, move from lower to upper. If upper has too many, move from upper to lower.

The key insight: we should only do ONE rebalancing step (or at most a few), not a while loop that could oscillate.

Actually, the while loop should work correctly if we're careful. The issue above was that I was doing:
1. upper too big → move to lower
2. lower too big → move to upper
3. upper too big → move to lower
...

This oscillation happens because moving an element from upper to lower makes lower too big, then moving from lower to upper makes upper too big, etc.

The fix: only do the rebalancing in one direction at a time. After the initial adjustment, the sizes should be correct.

Actually, I think the real fix is: after remove+add, the total is k. If lower has target_lower+1, move one to upper. If upper has target_upper+1, move one to lower. We should at most need one move in each direction, and after that we're done.

Let me reconsider. After remove+add:
- Total elements = k
- lower + upper = k
- If lower = target_lower, upper = target_upper: done
- If lower = target_lower + 1, upper = target_upper - 1: move one from lower to upper
- If lower = target_lower - 1, upper = target_upper + 1: move one from upper to lower

So at most one move is needed! The while loop is the problem because it can oscillate. Let me use a single if instead:

```python
if len(lower) > target_lower:
    heapq.heappush(upper, -heapq.heappop(lower))
elif len(upper) > target_upper:
    heapq.heappush(lower, -heapq.heappop(upper))
```

This should work because after one move, the sizes are correct.

Let me re-trace:
After remove+add: lower=[-2,-1], upper=[3,4]
- len(lower)=2, target_lower=2. Not > 2.
- len(upper)=2, target_upper=1. > 1. Pop upper → 3. Push -3 to lower. lower=[-3,-2,-1], upper=[4].
- Now len(lower)=3, target_lower=2. But we already handled this with the elif...

Hmm, the issue is that after moving from upper to lower, lower becomes too big. So we need to also check lower after that.

Let me use:
```python
if len(lower) > target_lower:
    heapq.heappush(upper, -heapq.heappop(lower))
if len(upper) > target_upper:
    heapq.heappush(lower, -heapq.heappop(upper))
```

Trace:
After remove+add: lower=[-2,-1], upper=[3,4]
- len(lower)=2, not > 2. Skip.
- len(upper)=2, > 1. Pop upper → 3. Push -3 to lower. lower=[-3,-2,-1], upper=[4].
- Now we're done. But lower has 3 elements!

The problem is that the second `if` creates a new imbalance in lower. 

OK so the fundamental issue is: when we move an element from upper to lower, lower becomes too big. We need to then move from lower to upper. But this creates a new imbalance in upper. This is the oscillation.

The real solution: we need to think about this more carefully.

After remove+add, total = k. The correct split is:
- lower: target_lower
- upper: target_upper

If lower has target_lower + 1: move max of lower to upper. Now lower = target_lower, upper = target_upper. Done.
If upper has target_upper + 1: move min of upper to lower. Now upper = target_upper, lower = target_lower. Done.

The key: after exactly one move, we're balanced. The issue with my trace above was that I was doing the moves in the wrong order or the initial state was wrong.

Let me re-trace:
After remove old=1 (from lower): lower=[-2,-1] (2 elements), upper=[3] (1 element)
After add new=4 (to upper): lower=[-2,-1] (2 elements), upper=[3,4] (2 elements)

Total = 4 = k. target_lower=2, target_upper=1.
lower=2 (correct), upper=2 (one too many).
Move min of upper (3) to lower: lower=[-3,-2,-1] (3), upper=[4] (1).
Now lower=3 (one too many), upper=1 (correct).
Move max of lower (1, i.e., -1 from heap) to upper: lower=[-3,-2] (2), upper=[1,4] (2).
Now lower=2 (correct), upper=2 (one too many).
... oscillation!

The problem is fundamental: with k=3, target_lower=2, target_upper=1. Total=3. If lower=2, upper=1, we're good. But after the moves, we keep bouncing.

Wait, I think the issue is that the element 1 and 3 are "in the wrong heap" conceptually. The issue is that after removing 1 from lower, the remaining elements in lower are 2 and 1 (well, -2 and -1 in the heap). When we add 4 to upper, upper has 3 and 4. Then we need to move 3 to lower (since 3 should be in the lower half for the window [2,3,4]). After moving 3 to lower, lower has 1, 2, 3. Then we need to move 1 to upper (since 1 should be in the upper half... wait, no. For window [2,3,4], the lower half should be {2,3} and upper should be {4}. So 1 shouldn't be in the window at all!

Oh wait, I made an error. After removing old=1, the window is [2,3,4]. Let me re-trace.

Initial window [1,2,3]:
- lower=[-2,-1] (contains 1,2), upper=[3]
- Median = -lower[0] = 2 ✓

Remove old=1:
- 1 <= -lower[0] = 2: push 1 to upper → upper=[1,3], pop upper → removes 1. upper=[3].
- lower=[-2,-1], upper=[3]

Add new=4:
- 4 > -lower[0] = 2: push 4 to upper. upper=[3,4].
- lower=[-2,-1], upper=[3,4]

Now window is [2,3,4]. lower should have {2,3}, upper should have {4}.
Currently: lower has {1,2}, upper has {3,4}.

The issue: 1 is still in lower! The removal trick didn't actually remove 1 properly.

Wait, let me re-examine the removal trick. The trick is:
- If old is in lower (old <= -lower[0]): push old to upper, then pop from upper.
  - This works because old <= min(upper) (since all lower elements <= all upper elements). So after pushing old to upper, old is the minimum of upper. Popping removes it.
  
But wait: old=1, -lower[0]=2. Is 1 <= 2? Yes. So we push 1 to upper. upper was [3]. After push: upper=[1,3]. Pop: removes 1. upper=[3]. ✓

So lower=[-2,-1] still contains 1 and 2. That's correct - 1 was removed from the window, but the heap still has it? No wait, the removal trick should have removed it.

Oh I see the issue! The removal trick removes the element from the heap by pushing it to the other heap and popping. But the element 1 was in lower. We pushed 1 to upper and popped from upper. So 1 is gone from upper. But 1 is still in lower!

Wait no. The trick is: to remove x from lower, push x to upper, then pop from upper. The pop from upper removes x from upper. But x was in lower, not upper!

I think I confused myself. Let me re-read the trick:

To remove x from a min-heap: push x into the max-heap, then pop from the max-heap.
- This works because x >= max(max-heap) (by invariant), so after pushing x into max-heap, x is the maximum. Popping removes it.

To remove x from a max-heap: push x into the min-heap, then pop from the min-heap.
- This works because x <= min(min-heap) (by invariant), so after pushing x into min-heap, x is the minimum. Popping removes it.

So:
- To remove x from lower (max-heap): push x to upper (min-heap), pop from upper.
  - x <= min(upper) → x is min of upper after push → pop removes x from upper. ✓
  - But x was in lower, not upper! We pushed x to upper and popped from upper. So x is removed from upper (which it wasn't in). This doesn't remove x from lower!

I think I had the trick backwards. Let me reconsider.

The correct trick:
- To remove x from lower (max-heap, stored as negated): 
  - Push -x to upper? No...
  
Actually, I think the standard trick is:
- To remove the minimum from a min-heap: just pop.
- To remove an arbitrary element x from a min-heap: 
  - Push x into the max-heap. Now x is the maximum of the max-heap (since all max-heap elements <= all min-heap elements, and x is in min-heap so x >= all max-heap elements). Pop from max-heap to remove x.
  
Wait, that removes x from the max-heap, not the min-heap!

I think the correct approach is:
- To remove x from min-heap: push x into max-heap, pop from max-heap. This removes x from max-heap. But x is still in min-heap!

No, I think the trick is different. Let me look at this from first principles.

The heap doesn't support arbitrary removal in O(log n). The "trick" for two-heap median maintenance is:

When you need to remove an element x:
1. Determine which heap it belongs to (based on the partition).
2. If x is in the min-heap: push x into the max-heap, then pop from the max-heap.
   - After pushing x into max-heap: x is the maximum (since x >= all elements in max-heap). Pop removes x from max-heap.
   - But x is still in min-heap! This doesn't work.

I think I've been confusing myself. Let me look at this differently.

Actually, I recall now. The trick is:
- To remove x from min-heap: add x to max-heap, then remove x from max-heap (pop). 
  - This effectively "cancels out" - x is added to max-heap and removed from max-heap. The net effect is x is removed from min-heap... no, that's not right either.

OK let me think about this completely differently. 

The two-heap approach for sliding window median has a known challenge with removal. The standard efficient approaches are:

1. **Sorted list (bisect)**: O(k) per insert/delete, O(1) for median. Total O(n*k). For n=200k, k=1000: 200M operations. In Python this might be ~2-4 seconds. Borderline.

2. **Two heaps with lazy deletion**: Mark elements as deleted, clean up lazily. Amortized O(log k) per operation.

3. **Two heaps with the "push to other heap" trick**: I need to get this right.

Let me look at this more carefully. The trick for removing from a heap:

If we have a min-heap H and want to remove x:
- Push x into H. Now H has a duplicate of x.
- Pop from H. This removes the minimum, which might be x (if x is the minimum) or something else.

That doesn't work for arbitrary x.

The actual correct approach for the two-heap sliding window median:

After adding the new element and before removing the old element (or vice versa), we adjust. The key insight is:

**Add new element, then remove old element:**
1. Add new element to the appropriate heap.
2. Rebalance.
3. Remove old element from the appropriate heap.
4. Rebalance.

For step 3, removing from a heap:
- If old is in lower (max-heap): pop from lower. But this removes the MAX of lower, not necessarily `old`.

So the pop approach only works if old happens to be the max of lower or min of upper.

The correct removal: use the "swap" technique:
- To remove x from lower: push x into upper, then pop from upper. 
  - Invariant: all elements in lower <= all elements in upper.
  - x is in lower, so x <= min(upper). After pushing x into upper, x is the minimum of upper. Pop removes x. ✓
  - Net effect: x is removed from upper (after being temporarily added). x is still in lower! ✗

Wait, that's wrong. x was in lower. We push x to upper (now x is in both lower and upper). We pop from upper (removes x from upper). x is still in lower. This doesn't remove x from lower!

I think the correct trick is:
- To remove x from lower: push -x into upper... no.

OK I think I need to just go with the sorted list approach. For n=200,000 and k=1,000:
- Each iteration: O(k) for insert + O(k) for delete + O(1) for median
- Total: O(n*k) = 200,000 * 1,000 = 200,000,000 basic operations

In Python, a list insert/delete is about 100ns per element (roughly). So 200M * 100ns = 20 seconds. That's too slow.

Hmm, but actually Python list operations are more like:
- bisect.insort: O(k) comparisons and shifts ≈ O(k)
- list.remove or del: O(k)

For k=1000, each operation is ~1000 comparisons/shifts. 200,000 iterations * 2000 operations = 400M operations. At ~50ns per operation in CPython, that's ~20 seconds. Too slow.

Let me reconsider the two-heap approach. I think the issue with my "trick" was wrong. Let me look at a reference.

Actually, I recall now. The correct approach is:

**To remove x from a min-heap:**
- Push x into the max-heap.
- Pop from the max-heap.
- This works because: x was in the min-heap, so x >= max(max-heap). After pushing x into max-heap, x is the maximum. Pop removes it.
- Net: x is added to max-heap and removed from max-heap. x is still in min-heap. ✗

This doesn't work. The trick I was thinking of doesn't actually remove x from the original heap.

Let me think about what actually works:

**Approach: Remove old, then add new, rebalancing after each step.**

The key: we can only pop from a heap (removing the extreme). So:
- If old is the max of lower: pop lower. ✓
- If old is the min of upper: pop upper. ✓
- Otherwise: we need a different approach.

For the "otherwise" case, one approach:
- Push old into the other heap, then pop from the other heap.
  - If old is in lower: push old to upper. Since old <= min(upper), old becomes min of upper. Pop upper removes old. ✓
  - If old is in upper: push old to lower (as -old). Since old >= max(lower), -old becomes min of lower (as a negated max-heap). Pop lower removes old. ✓

Wait! I think this DOES work! Let me re-examine:

If old is in lower (old <= -lower[0]):
- Push old to upper: upper now has old as its minimum (since old <= all elements in upper).
- Pop from upper: removes old. ✓
- old is removed from upper. But old was in lower, not upper!

Hmm, the issue is: old was in lower. We push old to upper (now old is in both lower and upper). We pop from upper (removes old from upper). old is still in lower.

This is the fundamental problem: the "trick" adds x to the other heap and removes it from the other heap, but x is still in the original heap.

I think the correct interpretation is:
- The two heaps together represent the window.
- To remove x: we add x to the "wrong" heap and remove it from the "wrong" heap. The net effect on the total set is: x is added to the wrong heap and removed from the wrong heap = no change. But x is still in the original heap.

So this trick doesn't actually remove x. I was wrong.

Let me look at this from a different angle. 

**Correct approach: Use a sorted structure.**

For the performance requirement (n=200k, k=1000, < 2 seconds), we need O(n log k) or better.

Options:
1. **Two heaps with proper removal**: O(n log k) if we can remove in O(log k).
2. **Sorted list**: O(n * k) - too slow.
3. **Fenwick tree / segment tree**: O(n log k) - possible but complex.
4. **Two heaps with lazy deletion**: O(n log k) amortized.

Let me go with **two heaps with lazy deletion**:

- Maintain a min-heap (upper) and max-heap (lower, negated).
- Keep a dictionary/set of "deleted" elements.
- When popping from a heap, if the top is deleted, discard it and pop again.
- Sizes: track the "logical" size (actual size minus deleted count).

Actually, let me think about this more carefully.

**Lazy deletion approach:**
- `lower`: max-heap (negated values)
- `upper`: min-heap
- `deleted`: dict counting how many times each value has been deleted
- `lower_count`: logical size of lower
- `upper_count`: logical size of upper

Operations:
- Add x: push to appropriate heap, increment count.
- Remove x: mark x as deleted (increment deleted[x]), decrement appropriate count.
- Clean heap: while top of heap is in deleted, pop and decrement deleted.
- Rebalance: move elements between heaps to maintain target sizes.

The tricky part is determining which heap x belongs to. We can check: if x <= -lower[0] (after cleaning), x is in lower. Otherwise, x is in upper.

But wait, with lazy deletion, the top of the heap might be a deleted element. We need to clean first.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        if lower_count >= target_lower and (lower_count < target_lower or x > -lower[0]):
            # Actually, let me simplify: if x >= -lower[0] (or lower is full), put in upper
            # Hmm, this is getting complicated.
            pass
        ...
```

This is getting complex. Let me think of a cleaner formulation.

Actually, let me reconsider. The lazy deletion approach:

- `lower` is a max-heap (stored as negated)
- `upper` is a min-heap
- Invariant: all elements in lower <= all elements in upper
- Target sizes: lower has target_lower elements, upper has target_upper elements
- `deleted` tracks which elements have been logically removed

When adding x:
- If x <= max(lower) (i.e., x <= -lower[0]): add to lower
- Else: add to upper
- Adjust counts

When removing x:
- If x <= max(lower): remove from lower (mark as deleted, decrement lower_count)
- Else: remove from upper (mark as deleted, decrement upper_count)

After add/remove, rebalance:
- If lower_count > target_lower: move max of lower to upper
- If upper_count > target_upper: move min of upper to lower

For "move max of lower to upper":
- clean_lower()
- Pop from lower, push to upper
- Decrement lower_count, increment upper_count

For "move min of upper to lower":
- clean_upper()
- Pop from upper, push to lower (negated)
- Decrement upper_count, increment lower_count

This should work! Let me code it up properly.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        nonlocal lower_count, upper_count
        if lower_count > 0 and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
    
    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1
    
    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1
    
    # Initialize
    for i in range(k):
        add(nums[i])
        rebalance()
    
    result = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Wait, there's an issue with `remove`. When I check `x <= -lower[0]`, I need to make sure lower isn't empty. Also, the check should be done after cleaning.

Also, for the `add` function: if lower is empty (lower_count == 0), we should add to lower (since target_lower >= 1 for k >= 1).

Let me also think about edge cases:
- k=1: target_lower=1, target_upper=0. Only lower is used.
- The `add` function: if lower_count == 0, add to lower.

Let me refine:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        nonlocal lower_count, upper_count
        if lower_count > 0 and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
    
    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1
    
    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1
    
    # Initialize
    for i in range(k):
        add(nums[i])
        rebalance()
    
    result = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Let me trace through a small example: nums = [1, 2, 3, 4, 5], k = 3.
target_lower = 2, target_upper = 1.

Initialize:
- add(1): lower_count=0, so add to upper. upper=[1], upper_count=1.
  rebalance: lower_count=0, upper_count=1 > 1? No (target_upper=1). OK.
  
  Wait, target_upper=1 and upper_count=1. So no rebalance needed. But lower_count=0 < target_lower=2. That's a problem - we need 2 in lower!

Hmm, the issue is that during initialization, we need to fill lower first. Let me handle initialization differently.

Actually, the `add` function should be: if lower_count < target_lower, add to lower. Otherwise, add to upper.

```python
def add(x):
    nonlocal lower_count, upper_count
    if lower_count < target_lower:
        heapq.heappush(lower, -x)
        lower_count += 1
    else:
        heapq.heappush(upper, x)
        upper_count += 1
```

But this doesn't maintain the invariant (all lower <= all upper). During initialization, we add to lower first, then to upper. The rebalance will fix any ordering issues.

Actually, for initialization, if we add the first target_lower elements to lower and the rest to upper, then rebalance, it should work. But the ordering invariant might be violated.

Let me think differently. For initialization:
- Add all k elements.
- Then rebalance to get the correct sizes.

The rebalance moves elements between heaps. If we just add everything to one heap and then rebalance, it should work.

Actually, let me just add everything to lower, then rebalance:

```python
for i in range(k):
    heapq.heappush(lower, -nums[i])
    lower_count += 1

# Rebalance
while lower_count > target_lower:
    v = -heapq.heappop(lower)
    heapq.heappush(upper, v)
    lower_count -= 1
    upper_count += 1
```

After this, lower has target_lower elements (the largest target_lower elements) and upper has target_upper elements (the smallest target_upper elements). Wait, no. lower is a max-heap (negated). The largest elements are at the root. Popping gives the largest. So we move the largest elements to upper. That means upper gets the largest elements, and lower keeps the smallest. That's the opposite of what we want!

We want: lower = smaller half, upper = larger half.

If lower is a max-heap (negated), the root is the maximum. Popping gives the maximum. So if we pop from lower and push to upper, we're moving the maximum to upper. That means lower keeps the smaller elements. ✓

So:
- lower = {smallest target_lower elements}
- upper = {largest target_upper elements}

This is correct!

Let me redo:

```python
for i in range(k):
    heapq.heappush(lower, -nums[i])
    lower_count += 1

while lower_count > target_lower:
    v = -heapq.heappop(lower)
    heapq.heappush(upper, v)
    lower_count -= 1
    upper_count += 1
```

For [1,2,3,4,5], k=3, target_lower=2, target_upper=1:
- Push all to lower: lower=[-5,-4,-3,-2,-1] (min-heap of negated), lower_count=5
- Pop: v=1 (the max, since -1 is the min of the negated heap). Push 1 to upper. lower=[-5,-4,-3,-2], upper=[1], lower_count=4, upper_count=1.
- Pop: v=2. Push 2 to upper. lower=[-5,-4,-3], upper=[1,2], lower_count=3, upper_count=2.
- Pop: v=3. Push 3 to upper. lower=[-5,-4], upper=[1,2,3], lower_count=2, upper_count=3.

Wait, that's wrong. After 3 pops, lower_count=2, upper_count=3. But target_upper=1!

The issue: I'm popping the maximum from lower each time. The maximum of lower (as a max-heap) is the largest element. So I'm moving the largest elements to upper. After moving 3 elements, upper has {1,2,3} and lower has {4,5}. That's backwards!

I have the negation confused. Let me clarify:
- `lower` is a max-heap implemented as a min-heap of negated values.
- The root of `lower` (as a min-heap) is the most negative value, which corresponds to the largest original value.
- `heapq.heappop(lower)` gives the most negative value, i.e., the largest original value.

So popping from lower gives the LARGEST element. If I push it to upper, upper gets the largest elements. That's wrong - I want upper to have the LARGEST elements and lower to have the SMALLEST.

Wait, that IS what I want! lower = smallest half, upper = largest half.

For [1,2,3,4,5], k=3:
- lower should have {1,2} (smallest 2)
- upper should have {3} (largest 1)

After pushing all to lower: lower=[-5,-4,-3,-2,-1] (min-heap of negated)
- Pop: gives -1 (the min of the negated heap) → original value 1. Push 1 to upper.
- Pop: gives -2 → original value 2. Push 2 to upper.
- Pop: gives -3 → original value 3. Push 3 to upper.

After 3 pops: lower=[-5,-4] (original values 4,5), upper=[1,2,3].

This is WRONG. lower has {4,5} and upper has {1,2,3}. I want lower={1,2}, upper={3}.

The issue: I'm popping the SMALLEST original value from lower (because the min-heap of negated values gives the most negative, which is the largest original... wait no).

Let me be very careful:
- lower stores negated values: -5, -4, -3, -2, -1
- As a min-heap, the root is -5 (the minimum).
- `heapq.heappop(lower)` returns -5, which corresponds to original value 5.

So popping from lower gives the LARGEST original value (5, then 4, then 3...).

After 3 pops: lower=[-2,-1] (original values 2, 1), upper=[5,4,3].

That's also wrong! I want lower={1,2}, upper={3}.

Hmm, the issue is that with k=3 and target_lower=2, I should only pop 1 element (k - target_lower = 1).

Let me redo: k=3, target_lower=2, target_upper=1.
- Push all 3 to lower: lower=[-3,-2,-1], lower_count=3.
- While lower_count > 2: pop once.
  - Pop: -1 → original 1. Push 1 to upper. lower=[-3,-2], upper=[1], lower_count=2, upper_count=1.

lower={2,3} (negated: -3,-2), upper={1}.

But I want lower={1,2}, upper={3}! The partition is wrong.

The problem: when I push all elements to lower and then pop the max, I'm moving the largest to upper. But I want the smallest in lower and largest in upper.

Wait: lower=[-3,-2] means the original values are 3 and 2. upper=[1] means original value 1.

So lower={2,3}, upper={1}. But the correct partition for [1,2,3] with k=3 should be lower={1,2}, upper={3}.

The issue is that I'm moving the MAX to upper, but I should be moving the MIN to upper... no wait.

Let me reconsider. The invariant should be: all elements in lower <= all elements in upper. And lower has the smaller elements.

If lower={2,3} and upper={1}, then 1 < 2, so the invariant is violated (upper has a smaller element than lower).

The correct approach: I should move the SMALLEST elements to... wait, no. lower should have the smaller elements.

Let me reconsider the heap structure:
- `lower` = max-heap of the smaller half. Root = max of smaller half.
- `upper` = min-heap of the larger half. Root = min of larger half.

For [1,2,3]: lower={1,2}, upper={3}. Max of lower = 2, min of upper = 3. 2 <= 3. ✓

To build this: I should put the smallest target_lower elements in lower and the rest in upper.

If I push all to lower (max-heap via negation):
- lower contains [1,2,3] as [-1,-2,-3] (min-heap).
- The max of lower is 3 (root of the negated min-heap is -3, which is the min of the negated values).

Wait, I keep getting confused. Let me be very explicit:

`lower` is a list that functions as a min-heap, but stores negated values.
- If original values are [1, 2, 3], lower stores [-1, -2, -3].
- As a min-heap, the root is -3 (the smallest negated value).
- The "max" of the original values is 3, which corresponds to -3 in the heap.
- `heapq.heappop(lower)` returns -3, original value 3.

So popping from lower gives the LARGEST original value.

To partition [1,2,3] into lower={1,2} and upper={3}:
- Push all to lower: lower=[-1,-2,-3] (min-heap), lower_count=3.
- Need to move 1 element to upper (target_upper=1).
- Pop from lower: returns -3 (original 3). Push 3 to upper.
- lower=[-1,-2], upper=[3]. lower_count=2, upper_count=1.

lower={1,2}, upper={3}. ✓!

I made an arithmetic error before. Let me redo:
- lower stores [-1, -2, -3]. Min-heap root is -3.
- Pop: -3 → original 3. Push 3 to upper.
- lower=[-1, -2]. Min-heap root is -2. Original max = 2.
- upper=[3]. Min-heap root is 3. Original min = 3.

Median (k=3, odd): -lower[0] = -(-2) = 2. ✓ (median of [1,2,3] is 2)

Great, so the initialization is:
```python
for i in range(k):
    heapq.heappush(lower, -nums[i])
    lower_count += 1

while lower_count > target_lower:
    v = -heapq.heappop(lower)
    heapq.heappush(upper, v)
    lower_count -= 1
    upper_count += 1
```

Now for the sliding window step:
- Remove old element
- Add new element
- Rebalance

For removal with lazy deletion:
- Determine which heap old belongs to: if old <= max(lower) (i.e., old <= -lower[0] after cleaning), it's in lower.
- Mark as deleted, decrement count.

For addition:
- If lower_count < target_lower: add to lower.
- Else: add to upper.
- But we also need to maintain the invariant. If we add to upper but the value is smaller than max(lower), we need to swap.

Actually, a simpler approach for addition:
- Add to lower (or upper based on size).
- Then rebalance (which also fixes ordering).

Hmm, but rebalancing only moves elements between heaps based on size, not based on value ordering.

Let me think about this differently. The standard approach:

**Add x:**
- If x <= max(lower): push to lower.
- Else: push to upper.
- Rebalance sizes.

**Remove x:**
- If x <= max(lower): mark deleted in lower, decrement lower_count.
- Else: mark deleted in upper, decrement upper_count.
- Rebalance sizes.

**Rebalance:**
- If lower_count > target_lower: move max of lower to upper.
- If upper_count > target_upper: move min of upper to lower.

This maintains both the size constraint and the ordering invariant.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
    
    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1
    
    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1
    
    # Initialize
    for i in range(k):
        add(nums[i])
        rebalance()
    
    result = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Let me trace through [1,2,3,4,5], k=3:
target_lower=2, target_upper=1.

Initialize:
- add(1): lower_count=0, so push to upper. upper=[1], upper_count=1.
  rebalance: lower_count=0, upper_count=1. target_lower=2, target_upper=1.
  lower_count < target_lower, so no rebalance from lower. upper_count=1=target_upper. OK.
  
  But lower_count=0 < target_lower=2! The sizes are wrong.

The issue: during initialization, I'm adding to upper when lower is empty, but I should be filling lower first.

Let me fix the `add` function:
```python
def add(x):
    nonlocal lower_count, upper_count
    clean_lower()
    if lower_count < target_lower:
        heapq.heappush(lower, -x)
        lower_count += 1
    else:
        heapq.heappush(upper, x)
        upper_count += 1
```

But this doesn't maintain the ordering invariant. If I add a large value to lower (because lower_count < target_lower), it might be larger than elements in upper.

For initialization, this is fine because upper is empty. But during sliding, it could be problematic.

Actually, let me use a different approach for initialization: push everything to lower, then rebalance.

```python
# Initialize
for i in range(k):
    heapq.heappush(lower, -nums[i])
    lower_count += 1

while lower_count > target_lower:
    v = -heapq.heappop(lower)
    heapq.heappush(upper, v)
    lower_count -= 1
    upper_count += 1
```

This gives the correct partition. Then for sliding steps, use the add/remove/rebalance.

For the `add` function during sliding:
```python
def add(x):
    nonlocal lower_count, upper_count
    clean_lower()
    if lower_count > 0 and x <= -lower[0]:
        heapq.heappush(lower, -x)
        lower_count += 1
    else:
        heapq.heappush(upper, x)
        upper_count += 1
```

This maintains the ordering invariant: if x <= max(lower), it goes to lower. Otherwise, it goes to upper.

For `remove`:
```python
def remove(x):
    nonlocal lower_count, upper_count
    clean_lower()
    if lower_count > 0 and x <= -lower[0]:
        deleted[x] += 1
        lower_count -= 1
    else:
        deleted[x] += 1
        upper_count -= 1
```

For `rebalance`:
```python
def rebalance():
    nonlocal lower_count, upper_count
    if lower_count > target_lower:
        clean_lower()
        v = -heapq.heappop(lower)
        heapq.heappush(upper, v)
        lower_count -= 1
        upper_count += 1
    elif upper_count > target_upper:
        clean_upper()
        v = heapq.heappop(upper)
        heapq.heappush(lower, -v)
        upper_count -= 1
        lower_count += 1
```

Let me trace [1,2,3,4,5], k=3:

Initialize:
- Push all to lower: lower=[-3,-2,-1] (min-heap), lower_count=3.
- lower_count=3 > 2: pop → -1 (original 1). Push 1 to upper. lower=[-3,-2], upper=[1], lower_count=2, upper_count=1.

lower={2,3}, upper={1}. 

Wait, that's wrong! lower should be {1,2} and upper should be {3}.

The issue: I'm popping the MIN of the negated heap, which is the LARGEST original value. So I'm moving the largest to upper. For [1,2,3], the largest is 3, so upper={3}, lower={1,2}. 

Let me re-check: lower=[-3,-2,-1]. Min-heap root is -3. Pop gives -3 → original 3. Push 3 to upper. lower=[-2,-1], upper=[3].

lower={1,2} (negated: -1,-2), upper={3}. ✓!

I was wrong before. The min-heap of [-3,-2,-1] has root -3. Popping gives -3, original value 3. After popping, lower=[-2,-1] (min-heap), which represents original values {1,2}. ✓

Great! So the initialization is correct.

Now sliding step i=3: old=1, new=4.

remove(1):
- clean_lower(): lower=[-2,-1], -lower[0]=-(-2)=2. 2 not in deleted. OK.
- lower_count=2 > 0 and 1 <= 2: yes. deleted[1]=1, lower_count=1.

add(4):
- clean_lower(): lower=[-2,-1], -lower[0]=2. 2 not in deleted. OK.
- lower_count=1 > 0 and 4 <= 2: no. Push 4 to upper. upper=[3,4], upper_count=2.

rebalance:
- lower_count=1, target_lower=2. Not > 2.
- upper_count=2, target_upper=1. > 1. Pop upper → 3. Push -3 to lower. lower=[-3,-2,-1], upper=[4]. upper_count=1, lower_count=2.

clean_lower: lower=[-3,-2,-1]. -lower[0]=-(-3)=3. 3 in deleted? No. OK.
clean_upper: upper=[4]. 4 in deleted? No. OK.

Median: -lower[0] = -(-3) = 3. ✓ (median of [2,3,4] is 3)

Step i=4: old=2, new=5.

remove(2):
- clean_lower(): lower=[-3,-2,-1]. -lower[0]=3. 3 not in deleted. OK.
- lower_count=2 > 0 and 2 <= 3: yes. deleted[2]=1, lower_count=1.

add(5):
- clean_lower(): lower=[-3,-2,-1]. -lower[0]=3. 3 not in deleted. OK.
- lower_count=1 > 0 and 5 <= 3: no. Push 5 to upper. upper=[4,5], upper_count=2.

rebalance:
- lower_count=1, target_lower=2. Not > 2.
- upper_count=2, target_upper=1. > 1. Pop upper → 4. Push -4 to lower. lower=[-4,-3,-2,-1], upper=[5]. upper_count=1, lower_count=2.

clean_lower: lower=[-4,-3,-2,-1]. -lower[0]=4. 4 in deleted? No. OK.
clean_upper: upper=[5]. 5 in deleted? No. OK.

Median: -lower[0] = -(-4) = 4. ✓ (median of [3,4,5] is 4)

The algorithm works!

Now let me think about performance. For n=200,000 and k=1,000:
- Each step: O(log k) for heap operations + O(1) for the deletion marking.
- Lazy deletion cleanup: amortized O(1) per operation (each element is popped at most once during cleanup).
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations. Well under 2 seconds.

One concern: the `deleted` dictionary might grow large. But since we clean up, it should stay bounded.

Actually, there's a subtle issue: when we do `deleted[x] += 1`, if x appears multiple times in the window, we need to handle that. The `deleted` dict tracks how many copies of x have been logically removed. When cleaning, we decrement. This handles duplicates correctly.

Let me also make sure the `clean_lower` and `clean_upper` functions handle the case where the deleted value is at the top. Since we only check the top, and we pop the top if it's deleted, this is correct.

One more edge case: what if `lower_count == 0` when we try to `remove`? This can happen if k=1 and we're removing the only element. In that case, `lower_count > 0` is false, so we'd go to the `else` branch and mark it as deleted in upper. But upper_count would be 0, so upper_count becomes -1. That's a problem.

For k=1: target_lower=1, target_upper=0. After remove, lower_count=0. Then add puts it back in lower (since lower_count < target_lower).

Actually wait, for k=1:
- Initialize: push to lower. lower_count=1.
- Remove: lower_count=1 > 0 and x <= -lower[0]: yes (x is the only element). deleted[x]=1, lower_count=0.
- Add: lower_count=0 < target_lower=1: push to lower. lower_count=1.
- Rebalance: lower_count=1=target_lower. OK.

This works!

But what about the case where after remove, lower_count=0 and we try to check `x <= -lower[0]`? We have `lower_count > 0` check, so if lower_count=0, we go to else. For k=1, upper_count=0, so upper_count becomes -1. That's bad.

Hmm, let me add a guard:
```python
def remove(x):
    nonlocal lower_count, upper_count
    clean_lower()
    if lower_count > 0 and x <= -lower[0]:
        deleted[x] += 1
        lower_count -= 1
    else:
        deleted[x] += 1
        upper_count -= 1
```

For k=1: after remove, lower_count=0, upper_count=0. We go to else: deleted[x]=1, upper_count=-1. Then add: lower_count=0 < 1, push to lower, lower_count=1. Rebalance: OK.

But upper_count=-1 is wrong. However, since target_upper=0 and we never access upper when upper_count=0 (or negative), it might not matter in practice. But it's ugly.

Actually, for k=1, the element is always in lower (since target_lower=1, target_upper=0). So `x <= -lower[0]` should always be true (x is the only element in lower). So we'd always go to the first branch.

Wait, after remove, lower_count=0. Then in the NEXT step's remove, we'd have lower_count=1 (after the add from the previous step). So it should be fine.

Let me re-trace k=1:
- Initialize: lower=[-x0], lower_count=1.
- Step i=1: remove(x0): lower_count=1>0, x0 <= -lower[0]=x0: yes. deleted[x0]=1, lower_count=0.
  add(x1): lower_count=0 < 1: push -x1 to lower. lower=[-x0,-x1], lower_count=1.
  rebalance: lower_count=1=target_lower. OK.
  clean_lower: -lower[0] = max(x0,x1). If x0 is the max, -lower[0]=x0, x0 in deleted: yes. Pop x0. deleted[x0]=0. lower=[-x1].
  Median: -lower[0] = x1. ✓

Great, it works.

Let me also think about whether the `clean_lower` in `remove` is sufficient. After removing, the top of lower might be a deleted element. We clean before checking. Good.

I think the solution is correct. Let me finalize it.

Actually, one more thought: the `add` function checks `lower_count > 0 and x <= -lower[0]`. If lower_count == 0, we add to upper. But for k >= 1, target_lower >= 1, so after initialization, lower_count >= 1. During sliding, after remove, lower_count could be 0 (for k=1). Then add would go to upper. But target_upper=0 for k=1, so rebalance would move it back to lower.

Actually for k=1: after remove, lower_count=0, upper_count=0. Add: lower_count=0, so `lower_count > 0` is false, add to upper. upper_count=1. Rebalance: upper_count=1 > target_upper=0. Pop upper, push to lower. lower_count=1, upper_count=0. ✓

OK this works but it's a bit roundabout. Let me just special-case: if lower_count == 0, add to lower.

```python
def add(x):
    nonlocal lower_count, upper_count
    clean_lower()
    if lower_count == 0 or x <= -lower[0]:
        heapq.heappush(lower, -x)
        lower_count += 1
    else:
        heapq.heappush(upper, x)
        upper_count += 1
```

This is cleaner. If lower is empty, the new element must go to lower (since target_lower >= 1).

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count == 0 or x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
    
    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1
    
    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1
    
    # Initialize
    for i in range(k):
        heapq.heappush(lower, -nums[i])
        lower_count += 1
    while lower_count > target_lower:
        v = -heapq.heappop(lower)
        heapq.heappush(upper, v)
        lower_count -= 1
        upper_count += 1
    
    result = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Wait, I should double-check: for even k, the median is the mean of the two middle values. The two middle values are max(lower) and min(upper). So median = (-lower[0] + upper[0]) / 2. ✓

For odd k, the median is the middle value, which is max(lower) = -lower[0]. ✓

Let me also verify with an even k example: nums = [1, 2, 3, 4], k = 2.
target_lower = 1, target_upper = 1.

Initialize:
- Push all to lower: lower=[-4,-3,-2,-1], lower_count=4.
- While lower_count > 1:
  - Pop: -1 → 1. Push 1 to upper. lower=[-4,-3,-2], upper=[1], lower_count=3, upper_count=1.
  - Pop: -2 → 2. Push 2 to upper. lower=[-4,-3], upper=[1,2], lower_count=2, upper_count=2.
  - Pop: -3 → 3. Push 3 to upper. lower=[-4], upper=[1,2,3], lower_count=1, upper_count=3.

lower={4}, upper={1,2,3}. That's wrong! I want lower={1}, upper={2,3} for window [1,2,3,4]... wait, k=2, so window is [1,2] first.

Hmm, I'm initializing with all k elements. For k=2, I push 2 elements to lower, then rebalance.

Let me redo: nums = [1, 2, 3, 4], k = 2.
- Push nums[0]=1 and nums[1]=2 to lower: lower=[-2,-1], lower_count=2.
- While lower_count > 1: pop → -1 → 1. Push 1 to upper. lower=[-2], upper=[1], lower_count=1, upper_count=1.

lower={2}, upper={1}. 

But I want lower={1}, upper={2}! The partition is wrong.

The issue: I'm popping the max from lower (which is 2... wait, no). lower=[-2,-1] as a min-heap has root -2. Pop gives -2 → original 2. So I'm moving 2 to upper.

lower={1} (negated: -1), upper={2}. 

Wait: lower=[-2,-1]. Min-heap root is -2. Pop gives -2, original value 2. After pop: lower=[-1]. Original value in lower: 1. upper=[2].

So lower={1}, upper={2}. ✓!

I was confused. The min-heap of [-2,-1] has root -2 (the minimum). Popping gives -2, which is original value 2. After popping, lower=[-1], representing original value 1.

So lower={1}, upper={2}. Median = (-lower[0] + upper[0]) / 2 = (1 + 2) / 2 = 1.5. ✓ (median of [1,2] is 1.5)

Great!

Step i=2: old=1, new=3.
remove(1):
- clean_lower: lower=[-1]. -lower[0]=1. 1 in deleted? No. OK.
- lower_count=1 > 0 and 1 <= 1: yes. deleted[1]=1, lower_count=0.

add(3):
- clean_lower: lower=[-1]. -lower[0]=1. 1 in deleted: yes! Pop: v=1, deleted[1]=0. lower=[].
- lower_count=0: push -3 to lower. lower=[-3], lower_count=1.

rebalance:
- lower_count=1, target_lower=1. OK.
- upper_count=1, target_upper=1. OK.

clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No. OK.
clean_upper: upper=[2]. 2 in deleted? No. OK.

Median: (-lower[0] + upper[0]) / 2 = (3 + 2) / 2 = 2.5. ✓ (median of [2,3] is 2.5)

Step i=3: old=2, new=4.
remove(2):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No. OK.
- lower_count=1 > 0 and 2 <= 3: yes. deleted[2]=1, lower_count=0.

add(4):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No. OK.
- lower_count=0: push -4 to lower. lower=[-4], lower_count=1.

rebalance:
- lower_count=1, target_lower=1. OK.
- upper_count=1, target_upper=1. OK.

clean_lower: lower=[-4]. -lower[0]=4. 4 in deleted? No. OK.
clean_upper: upper=[2]. 2 in deleted: yes! Pop: v=2, deleted[2]=0. upper=[].

Median: (-lower[0] + upper[0]) / 2 = (4 + ...) wait, upper is empty!

The issue: upper_count=1 but upper is empty (after cleaning). The logical size is 1 but the physical heap is empty.

Hmm, this is a problem. After remove(2), upper_count was 1 (it was [2]). We marked 2 as deleted. Then in add(4), we push to lower. upper is still [2] (with 2 marked as deleted). After cleaning upper, upper becomes [].

But upper_count=1. The rebalance checks upper_count > target_upper: 1 > 1? No. So no rebalance.

Then when computing median, upper[0] doesn't exist because upper is empty after cleaning.

The issue: after cleaning, the physical heap size doesn't match the logical count. We need to ensure that after cleaning, the physical size matches the logical count.

Actually, I think the issue is that `upper_count` should reflect the logical count, and after cleaning, the physical heap should have exactly `upper_count` elements. But cleaning removes deleted elements, so the physical heap shrinks. The logical count (upper_count) already accounts for the deletion.

Wait, I think the problem is: upper_count=1 means there's 1 logical element in upper. After cleaning, the physical heap has 0 elements (the deleted one was removed). But upper_count is still 1. This is inconsistent.

The fix: after cleaning, the physical heap size should equal the logical count. If not, we need to adjust.

Actually, I think the issue is more subtle. Let me reconsider.

When we do `remove(2)`:
- 2 is in upper (since 2 > -lower[0]=3? No, 2 <= 3, so 2 is in lower!).

Wait, let me re-check. lower=[-3], so -lower[0]=3. 2 <= 3, so 2 is in lower. So remove(2) marks it as deleted in lower, lower_count becomes 0.

Then add(4): lower_count=0, push to lower. lower=[-4,-3] (wait, 3 is still in lower but marked as deleted... no, 3 was in lower and wasn't deleted).

Hmm wait. Let me re-trace more carefully.

State before step i=3:
- lower=[-3] (contains 3), lower_count=1
- upper=[2] (contains 2), upper_count=1
- deleted: {}

remove(2):
- clean_lower: lower=[-3], -lower[0]=3. 3 in deleted? No. OK.
- lower_count=1 > 0 and 2 <= 3: yes. deleted[2]=1, lower_count=0.

add(4):
- clean_lower: lower=[-3], -lower[0]=3. 3 in deleted? No. OK.
- lower_count=0: push -4 to lower. lower=[-4,-3], lower_count=1.

rebalance:
- lower_count=1, target_lower=1. OK.
- upper_count=1, target_upper=1. OK.

clean_lower: lower=[-4,-3]. -lower[0]=4. 4 in deleted? No. OK.
clean_upper: upper=[2]. 2 in deleted: yes! Pop: v=2, deleted[2]=0. upper=[].

Now: lower=[-4,-3] (physical size 2), lower_count=1. upper=[] (physical size 0), upper_count=1.

The physical sizes don't match the logical counts! lower has 2 physical elements but logical count is 1. upper has 0 physical elements but logical count is 1.

The issue: when we mark 2 as deleted, it's in upper. But we never clean upper during the remove/add/rebalance. We only clean at the end (before computing median). After cleaning upper, it's empty, but upper_count is still 1.

I think the fix is: we should clean both heaps after every operation, not just before computing the median. Or better: the logical counts should be consistent with the physical heaps after cleaning.

Actually, I think the fundamental issue is that the logical count and physical heap size can diverge. The logical count represents "how many elements should be in this heap" while the physical heap might have extra deleted elements.

The correct approach: after cleaning, the physical heap size should equal the logical count. If not, we need to adjust.

But wait: after cleaning, we remove deleted elements from the physical heap. The logical count was already decremented when we marked the element as deleted. So after cleaning, physical size = logical count. Let me verify:

- Before remove(2): upper=[2], upper_count=1.
- remove(2): deleted[2]=1, upper_count=0. (Wait, I had lower_count=1 and 2<=3, so it goes to lower!)

Let me re-check: 2 <= -lower[0] = 3. Yes, so 2 is in lower. remove(2): deleted[2]=1, lower_count=0.

So upper is still [2] with upper_count=1. 2 is NOT marked as deleted in upper; it's marked as deleted in lower. But 2 is physically in upper!

This is the bug! The determination of which heap an element belongs to is based on the value comparison, but the element might physically be in the other heap.

The issue: the invariant "all elements in lower <= all elements in upper" should ensure that if x <= max(lower), x is in lower. But after deletions and rebalancing, this invariant might be temporarily violated.

Actually, I think the invariant IS maintained throughout. Let me re-check:

After step i=2:
- lower=[-3] (value 3), upper=[2] (value 2).
- Invariant: max(lower)=3, min(upper)=2. 3 > 2. INVARIANT VIOLATED!

The invariant is broken! 3 is in lower but 2 is in upper, and 3 > 2.

How did this happen? After remove(1) and add(3):
- remove(1): 1 was in lower (1 <= 2). Marked deleted. lower_count=0.
- add(3): lower_count=0, push to lower. lower=[-3,-1] (3 and 1, with 1 deleted). lower_count=1.
- rebalance: lower_count=1=target_lower. upper_count=1=target_upper. No rebalance.

But lower physically has {3, 1} and upper has {2}. The invariant is violated because 3 > 2.

The problem: when we add 3 to lower (because lower_count was 0), it should have gone to upper (since 3 > 2). But our `add` function puts it in lower because lower_count=0.

I think the fix is: in `add`, we should always respect the ordering invariant:
- If x <= max(lower) (and lower is non-empty): add to lower.
- Else: add to upper.

But if lower is empty, we can't check. In that case, we should add to lower (since target_lower >= 1).

The real issue is that after remove, lower becomes empty, and the new element should go to upper if it's larger than the min of upper. But our `add` function puts it in lower.

I think the solution is: after remove and before add, we should rebalance to ensure the invariant. Or: in `add`, if lower is empty, add to lower, then rebalance (which might move it to upper).

Actually, let me reconsider the rebalance. The rebalance only moves elements based on size, not value. If lower has too many, move max to upper. If upper has too many, move min to lower.

In the example: lower=[-3,-1] (3 and 1, 1 deleted), lower_count=1. upper=[2], upper_count=1. Sizes are correct. But the invariant is violated.

The fix: after adding, if the new element in lower is larger than min(upper), we need to swap. Or: always add to the "correct" heap based on value.

Let me modify `add`:
```python
def add(x):
    nonlocal lower_count, upper_count
    clean_lower()
    clean_upper()
    if lower_count > 0 and x <= -lower[0]:
        heapq.heappush(lower, -x)
        lower_count += 1
    elif upper_count > 0 and x >= upper[0]:
        heapq.heappush(upper, x)
        upper_count += 1
    else:
        # lower is empty or x is between the two heaps
        # If lower is empty, add to lower
        # If x < min(upper), add to lower
        # If x > max(lower), add to upper
        if lower_count == 0:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
```

Hmm, this is getting complicated. Let me think of a cleaner approach.

Actually, I think the cleanest approach is:
1. Add x to lower.
2. Rebalance: if lower has too many, move max to upper. If upper has too many, move min to lower.
3. This maintains both size and ordering.

Wait, step 2 only fixes sizes, not ordering. If x is added to lower but x > min(upper), the ordering is violated.

The correct approach:
1. Add x to the appropriate heap based on value.
2. Rebalance sizes.

For step 1:
- If lower is non-empty and x <= max(lower): add to lower.
- If upper is non-empty and x >= min(upper): add to upper.
- If both conditions are met (shouldn't happen if invariant holds): add to lower (or upper, doesn't matter).
- If lower is empty: add to lower.
- If upper is empty: add to upper.

But if the invariant is temporarily violated (due to lazy deletion), we might have a gap. In that case:
- If x <= max(lower): add to lower.
- If x >= min(upper): add to upper.
- If max(lower) < x < min(upper): x belongs in the "middle". Add to lower (or upper), then rebalance will fix it.

Actually, I think the simplest correct approach is:

**Add x to lower, then rebalance.**

Rebalance:
- While lower_count > target_lower: move max of lower to upper.
- While upper_count > target_upper: move min of upper to lower.

After this, the sizes are correct AND the ordering is maintained (because we always move the max of lower to upper, and the min of upper to lower).

Let me verify: if x is added to lower, and x > min(upper), then after rebalance, x will be moved to upper (since lower has too many). This fixes the ordering.

If x is added to lower, and x < min(upper), then x stays in lower. Ordering is fine.

If x is added to lower, and lower is at target size, no rebalance. But if x > min(upper), ordering is violated. Hmm.

Wait, if lower_count == target_lower and we add x to lower, lower_count becomes target_lower + 1. Then rebalance moves x (the max) to upper. So x ends up in upper. ✓

If lower_count < target_lower and we add x to lower, lower_count increases. If lower_count was target_lower - 1, now it's target_lower. No rebalance. If x > min(upper), ordering is violated.

Example: lower={1}, upper={3}, target_lower=1, target_upper=1. Add x=2.
- Add to lower: lower={1,2}, lower_count=2.
- Rebalance: lower_count=2 > 1. Move max (2) to upper. lower={1}, upper={2,3}. upper_count=2.
- upper_count=2 > 1. Move min (2) to lower. lower={1,2}, upper={3}. lower_count=2.
- lower_count=2 > 1. Move max (2) to upper. lower={1}, upper={2,3}. ... oscillation!

This oscillation is the same problem as before. The issue is that with equal target sizes, moving one element from lower to upper makes upper too big, and moving from upper to lower makes lower too big.

I think the fundamental issue is that with lazy deletion, the physical heap can have more elements than the logical count, and the rebalancing gets confused.

Let me try a completely different approach.

**Approach: Sorted list with bisect.**

For n=200,000 and k=1,000:
- Each step: O(k) for insert + O(k) for delete.
- Total: O(n*k) = 200M operations.

In Python, this might be too slow. Let me estimate:
- bisect.insort into a list of size 1000: ~1000 comparisons + ~1000 shifts ≈ 2000 operations.
- list removal (del): ~1000 shifts.
- Per step: ~3000 operations.
- Total: 200,000 * 3000 = 600M operations.
- At ~50ns per operation: 30 seconds. Too slow.

Hmm. Let me think of another approach.

**Approach: Two heaps without lazy deletion, using the "push to other heap" trick correctly.**

Wait, I recall now. The correct trick for removing from a heap:

To remove x from a min-heap:
- Push x into the max-heap.
- Pop from the max-heap.
- This works because: x was in the min-heap, so x >= max(max-heap). After pushing x into max-heap, x is the maximum. Pop removes it.
- Net effect: x is removed from max-heap (after being temporarily added). x is still in min-heap.

No, this doesn't remove x from the min-heap. It's a no-op on the min-heap.

I think the correct approach for the two-heap sliding window median is actually:

**Don't remove from the heap. Instead, add the new element, and if the window is too large, remove the old element. Use the heap structure to always maintain exactly k elements.**

Actually, I think the cleanest approach that's O(n log k) is:

**Use a sorted list (bisect) but with a more efficient data structure.**

In Python, we can use `bisect` with a list. For k=1000, each operation is O(k). Total O(n*k) = 200M. This might be borderline at 2 seconds.

Let me estimate more carefully:
- `bisect.insort`: binary search (10 comparisons) + list insertion (up to 1000 shifts).
- `del lst[i]`: up to 1000 shifts.
- Per step: ~2000 shifts + 10 comparisons ≈ 2000 operations.
- Total: 200,000 * 2000 = 400M operations.
- In CPython, a list shift is roughly 10ns (pointer move). 400M * 10ns = 4 seconds. Borderline.

Actually, I think for the specific constraint (n=200k, k=1000, < 2 seconds), the sorted list approach might be too slow in pure Python.

Let me go back to the two-heap approach and fix the issues.

**Key insight for the two-heap approach:**

The lazy deletion approach has issues with the invariant. Let me try a different strategy:

**Strategy: Always maintain exactly k elements in the two heaps (no lazy deletion).**

To remove an element x:
- If x is in lower: we need to remove it from lower. Since we can only pop the max, we use the trick:
  - Push x to upper. Now x is in both lower and upper.
  - Pop from upper. This removes x from upper (since x <= min(upper) by invariant, x is the min of upper after push).
  - Net: x is removed from upper. x is still in lower. ✗

This doesn't work. The trick doesn't remove x from the original heap.

OK so I think the correct approach is:

**Two heaps where we can only pop the extreme, and we handle removal by re-inserting.**

When we need to remove x:
1. Pop the max from lower (or min from upper) - this removes SOME element, not necessarily x.
2. If the popped element is x: done.
3. If not: push the popped element into the other heap, and try again.

This is O(k) in the worst case per removal, leading to O(n*k) total. Same as sorted list.

Hmm. Let me think about this differently.

**Alternative: Use a "sorted window" approach with a balanced BST simulation.**

In Python, we don't have a built-in balanced BST. But we can simulate one with two heaps and the lazy deletion approach, being more careful about the invariant.

Let me try yet another approach: **Fenwick tree / Binary Indexed Tree.**

If the values are bounded, we can use a Fenwick tree. But the values are floats, so we'd need to coordinate-compress.

Actually, for the given constraints, let me just go with the sorted list approach and optimize it. With k=1000 and n=200,000:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []
    result = []
    
    for i in range(len(nums)):
        bisect.insort(window, nums[i])
        if i >= k:
            # Remove the oldest element
            window.remove(nums[i - k])
        
        if len(window) == k:
            if k % 2 == 0:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2)
            else:
                result.append(window[k // 2])
    
    return result
```

Wait, `window.remove(x)` is O(k) because it scans the list. And `bisect.insort` is O(k) for the insertion. Total: O(n*k).

For n=200k, k=1000: 200k * 2000 = 400M operations. In CPython, this is likely 5-10 seconds. Too slow.

Let me think about whether there's a way to make this faster...

Actually, `list.remove(x)` in CPython is O(n) where n is the list length. For k=1000, it's 1000 comparisons. `bisect.insort` is O(log k) for the search + O(k) for the insertion (shifting). So per step: O(k) for insert + O(k) for remove = O(k). Total: O(n*k) = 200M.

In CPython, 200M simple operations (comparisons + shifts) at ~50ns each = 10 seconds. Too slow.

I need a better approach. Let me go back to the two-heap with lazy deletion and fix the invariant issue.

**Fixed lazy deletion approach:**

The key issue was that the invariant (all lower <= all upper) can be violated after removals. The fix: after every add/remove, we ensure the invariant by:
- If max(lower) > min(upper): swap the two elements.

Actually, let me think about this more carefully. The invariant should be maintained at all times. If it's violated, the median computation is wrong.

Let me try a different formulation:

**Two heaps with explicit rebalancing that maintains both size and ordering:**

After each add/remove:
1. Ensure size: if lower too big, move max to upper. If upper too big, move min to lower.
2. Ensure ordering: if max(lower) > min(upper), swap.

But step 2 might create a size imbalance, requiring another step 1. This could oscillate.

Actually, I think the correct approach is:

**Add x:**
- If x <= max(lower) (and lower non-empty): push to lower.
- Else: push to upper.
- Rebalance size.

**Remove x:**
- If x <= max(lower) (and lower non-empty): mark deleted in lower, decrement lower_count.
- Else: mark deleted in upper, decrement upper_count.
- Rebalance size.

**Rebalance size:**
- If lower_count > target_lower: clean lower, pop max from lower, push to upper.
- If upper_count > target_upper: clean upper, pop min from upper, push to lower.

The key: after rebalancing, the invariant should hold because:
- Moving max of lower to upper: the moved element is >= all remaining lower elements, and <= all upper elements (since it was the max of lower). Wait, it's the max of lower, so it's >= all lower elements. After moving to upper, it's <= all upper elements? Not necessarily. It could be larger than some upper elements.

Hmm, the invariant might still be violated.

OK, I think the issue is fundamental: with lazy deletion, the physical heaps can contain elements that don't belong, and the invariant can be temporarily violated. The median computation needs to be correct despite this.

Let me try a completely different approach: **use a sorted list but with a more efficient removal.**

Instead of `list.remove(x)` which is O(k), I can:
- Use `bisect` to find the position of x: O(log k).
- Use `del window[pos]`: O(k) for the shift.

So per step: O(log k) for finding + O(k) for insert + O(k) for delete = O(k). Same as before.

Total: O(n*k) = 200M. Still too slow in Python.

**What about using `heapq` with a different strategy?**

Actually, let me reconsider the performance. In CPython:
- `bisect.insort` on a list of 1000 elements: ~10 comparisons + ~500 average shifts (since insertion is in the middle on average). ≈ 510 operations.
- `del window[pos]`: ~500 average shifts. ≈ 500 operations.
- Per step: ~1000 operations.
- Total: 200,000 * 1000 = 200M operations.
- At ~5ns per operation (C-level list operations): 1 second.

Actually, CPython list operations are done in C, so they're quite fast. A list of 1000 elements: inserting involves ~500 pointer moves (average), each ~5ns. So ~2.5μs per insert. Similarly for delete. Per step: ~5μs. Total: 200,000 * 5μs = 1 second.

This might actually be within the 2-second budget! Let me go with the sorted list approach.

But wait, `list.remove(x)` does a linear scan (O(k) comparisons). For k=1000, that's 1000 comparisons at ~5ns each = 5μs. Plus the shift: ~500 * 5ns = 2.5μs. Total per remove: ~7.5μs.

Per step: insert (~5μs) + remove (~7.5μs) + median lookup (~0) = ~12.5μs.
Total: 200,000 * 12.5μs = 2.5 seconds. Borderline.

Hmm, it's right at the edge. Let me think if there's a way to optimize.

Actually, I can avoid the linear scan for removal by using `bisect` to find the position:
- `pos = bisect.bisect_left(window, x)` → O(log k) ≈ 10 comparisons.
- `del window[pos]` → O(k) shifts ≈ 500 * 5ns = 2.5μs.

Per step: insert (~5μs) + find (~50ns) + delete (~2.5μs) = ~7.5μs.
Total: 200,000 * 7.5μs = 1.5 seconds. Within budget!

Let me go with this approach:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []
    result = []
    
    for i in range(len(nums)):
        bisect.insort(window, nums[i])
        if i >= k:
            pos = bisect.bisect_left(window, nums[i - k])
            del window[pos]
        
        if len(window) == k:
            if k % 2 == 0:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2)
            else:
                result.append(window[k // 2])
    
    return result
```

Wait, there's a subtlety: `bisect.bisect_left(window, x)` finds the leftmost position where x could be inserted. If there are duplicates, it finds the first occurrence. Then `del window[pos]` removes that occurrence. This is correct.

But what if x doesn't exist in window? That shouldn't happen since we're removing an element that was previously added.

Let me verify with a small example: nums = [1, 2, 3, 4, 5], k = 3.

- i=0: window=[1]. len<3.
- i=1: window=[1,2]. len<3.
- i=2: window=[1,2,3]. len=3. Median: window[1]=2. result=[2].
- i=3: insort 4 → window=[1,2,3,4]. Remove nums[0]=1: pos=bisect_left([1,2,3,4],1)=0. del window[0] → window=[2,3,4]. len=3. Median: window[1]=3. result=[2,3].
- i=4: insort 5 → window=[2,3,4,5]. Remove nums[1]=2: pos=bisect_left([2,3,4,5],2)=0. del window[0] → window=[3,4,5]. len=3. Median: window[1]=4. result=[2,3,4].

✓ Correct!

Now let me think about performance more carefully. For n=200,000 and k=1,000:
- Each iteration: `bisect.insort` (O(k) for the list insertion after O(log k) search) + `bisect.bisect_left` (O(log k)) + `del` (O(k)).
- The dominant cost is the list insertion and deletion, each O(k) = O(1000).
- Total: n * 2k = 200,000 * 2000 = 400M pointer moves.
- In CPython, each pointer move is ~5ns (it's a C-level memmove).
- Total time: 400M * 5ns = 2 seconds. Right at the boundary.

Hmm, it's borderline. Let me see if I can optimize.

One optimization: instead of `bisect.insort` (which does search + insert), I can do:
```python
pos = bisect.bisect_left(window, x)
window.insert(pos, x)
```
This is the same thing, no improvement.

Another thought: can I avoid the O(k) shift? Not really with a list.

What about using `array` module? It's similar to list in terms of performance.

I think the sorted list approach is the most practical for pure Python. Let me go with it and hope it's fast enough.

Actually, let me reconsider the two-heap approach one more time. I think the lazy deletion approach CAN work if I'm careful.

The key issue was: after removal, the invariant might be violated. But actually, I think the invariant IS maintained if I'm careful about which heap an element belongs to.

Let me re-examine. The invariant is: all elements in lower <= all elements in upper.

When we add x:
- If x <= max(lower): x goes to lower. Since x <= max(lower), and all lower elements <= all upper elements, x <= all upper elements. Invariant maintained. ✓
- If x > max(lower): x goes to upper. Since x > max(lower), and x is the new min of upper (or not), we need x >= min(upper). Since x > max(lower) >= min(upper)... wait, max(lower) >= min(upper) is the invariant. So x > max(lower) >= min(upper). So x >= min(upper). Invariant maintained. ✓

When we remove x:
- If x <= max(lower): x is in lower. Mark as deleted. The remaining elements in lower are still <= all elements in upper. Invariant maintained. ✓
- If x > max(lower): x is in upper. Mark as deleted. The remaining elements in upper are still >= all elements in lower. Invariant maintained. ✓

So the invariant IS maintained! The issue I saw earlier was a tracing error. Let me re-trace the problematic case.

nums = [1, 2, 3, 4, 5], k = 2. target_lower=1, target_upper=1.

Initialize:
- Push 1, 2 to lower: lower=[-2,-1], lower_count=2.
- Rebalance: lower_count=2 > 1. Pop lower → -1 → 1. Push 1 to upper. lower=[-2], upper=[1], lower_count=1, upper_count=1.

lower={2}, upper={1}. Invariant: max(lower)=2, min(upper)=1. 2 > 1. INVARIANT VIOLATED!

Wait, this is wrong. lower={2} and upper={1}. 2 > 1, so the invariant is violated.

The issue: when I push both 1 and 2 to lower, then pop the max (2... wait, no).

lower=[-2,-1] as a min-heap: root is -2. Pop gives -2 → original 2. So I'm moving 2 to upper.

lower=[-1] (original 1), upper=[2]. Invariant: max(lower)=1, min(upper)=2. 1 <= 2. ✓!

I made an arithmetic error. lower=[-2,-1]: the min-heap root is -2 (the smallest negated value). Popping gives -2, which is original value 2. After popping, lower=[-1], representing original value 1. upper=[2].

So lower={1}, upper={2}. Invariant: 1 <= 2. ✓.

I was confused earlier. Let me re-trace the full example.

nums = [1, 2, 3, 4, 5], k = 2.

Initialize:
- Push 1, 2 to lower: lower=[-2,-1], lower_count=2.
- Rebalance: lower_count=2 > 1. Pop → -2 → 2. Push 2 to upper. lower=[-1], upper=[2], lower_count=1, upper_count=1.

lower={1}, upper={2}. Median: (1+2)/2 = 1.5. ✓

Step i=2: old=1, new=3.
remove(1):
- clean_lower: lower=[-1], -lower[0]=1. 1 in deleted? No.
- lower_count=1 > 0 and 1 <= 1: yes. deleted[1]=1, lower_count=0.

add(3):
- clean_lower: lower=[-1], -lower[0]=1. 1 in deleted: yes! Pop: v=1, deleted[1]=0. lower=[].
- lower_count=0: push -3 to lower. lower=[-3], lower_count=1.

rebalance:
- lower_count=1, target_lower=1. OK.
- upper_count=1, target_upper=1. OK.

clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No.
clean_upper: upper=[2]. 2 in deleted? No.

Median: (3+2)/2 = 2.5. ✓ (median of [2,3] is 2.5)

Step i=3: old=2, new=4.
remove(2):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No.
- lower_count=1 > 0 and 2 <= 3: yes. deleted[2]=1, lower_count=0.

add(4):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No.
- lower_count=0: push -4 to lower. lower=[-4,-3], lower_count=1.

rebalance:
- lower_count=1, target_lower=1. OK.
- upper_count=1, target_upper=1. OK.

clean_lower: lower=[-4,-3]. -lower[0]=4. 4 in deleted? No.
clean_upper: upper=[2]. 2 in deleted: yes! Pop: v=2, deleted[2]=0. upper=[].

Now: lower=[-4,-3] (physical size 2), lower_count=1. upper=[] (physical size 0), upper_count=1.

Median: (-lower[0] + upper[0]) / 2. But upper is empty!

The problem: upper_count=1 but upper is physically empty. We need upper to have 1 element.

The issue: 2 was in upper (upper_count=1). We marked it as deleted (deleted[2]=1). After cleaning, upper is empty. But upper_count is still 1.

Wait, I think I made an error. When we do `remove(2)`:
- 2 <= -lower[0] = 3: yes. So we mark 2 as deleted and decrement lower_count.
- But 2 is physically in upper, not lower!

The determination "2 <= max(lower)" says 2 belongs to lower. But 2 is physically in upper. This is the bug!

The invariant says all lower <= all upper. max(lower)=3, min(upper)=2. 3 > 2. The invariant is violated!

How did the invariant get violated? After step i=2:
- lower=[-3] (value 3), upper=[2] (value 2).
- max(lower)=3, min(upper)=2. 3 > 2. Violated!

The violation happened during step i=2:
- After remove(1): lower=[-1] (value 1, deleted), lower_count=0. upper=[2], upper_count=1.
- After add(3): lower=[-3,-1] (values 3 and 1, 1 deleted), lower_count=1. upper=[2], upper_count=1.

The issue: 3 was added to lower (because lower_count was 0). But 3 > 2 (min of upper). The invariant is violated.

The fix: in `add`, we should check the value, not just the count:
```python
def add(x):
    nonlocal lower_count, upper_count
    clean_lower()
    clean_upper()
    if lower_count > 0 and x <= -lower[0]:
        heapq.heappush(lower, -x)
        lower_count += 1
    else:
        heapq.heappush(upper, x)
        upper_count += 1
```

With this fix, in step i=2:
- After remove(1): lower=[-1] (deleted), lower_count=0. upper=[2], upper_count=1.
- add(3): clean_lower: lower=[-1], -lower[0]=1, 1 in deleted: yes. Pop. lower=[]. lower_count=0.
  clean_upper: upper=[2], 2 in deleted? No.
  lower_count=0: push -3 to lower. lower=[-3], lower_count=1.

Wait, with the fix, `lower_count > 0` is false (lower_count=0), so we go to else: push 3 to upper. upper=[2,3], upper_count=2.

rebalance:
- lower_count=0, target_lower=1. Not > 1.
- upper_count=2, target_upper=1. > 1. Pop upper → 2. Push -2 to lower. lower=[-3,-2], upper=[3]. upper_count=1, lower_count=1.

clean_lower: lower=[-3,-2]. -lower[0]=3. 3 in deleted? No.
clean_upper: upper=[3]. 3 in deleted? No.

Median: (3+3)/2 = 3. 

But the window is [2,3]. Median should be 2.5. This is wrong!

The issue: after rebalancing, lower={2,3} and upper={3}. That's 3 elements, not 2!

Wait: lower_count=1, upper_count=1. Total=2. But lower physically has 2 elements (3 and 2) and upper has 1 (3). The physical sizes don't match the logical counts.

The problem: lower has a deleted element (1 was deleted but cleaned). After cleaning, lower=[-3,-2] (2 physical elements) but lower_count=1.

I think the issue is that after cleaning, the physical heap size should equal the logical count. But it doesn't because we pushed 3 to lower (making it 2 physical elements) and then the rebalance moved 2 to lower (making it... wait).

Let me re-trace:
- After remove(1): lower=[-1] (1 is deleted), lower_count=0. upper=[2], upper_count=1.
- add(3): clean_lower pops the deleted 1. lower=[]. lower_count=0.
  Since lower_count=0, push 3 to upper. upper=[2,3], upper_count=2.
- rebalance: upper_count=2 > 1. Pop upper → 2. Push -2 to lower. lower=[-2], upper=[3]. lower_count=1, upper_count=1.

Now: lower=[-2] (value 2), upper=[3] (value 3). lower_count=1, upper_count=1. ✓
Physical sizes: lower=1, upper=1. ✓
Invariant: max(lower)=2, min(upper)=3. 2 <= 3. ✓

Median: (2+3)/2 = 2.5. ✓!

I made an error in my previous trace. Let me redo:

After remove(1): lower=[-1] (value 1, marked deleted), lower_count=0. upper=[2], upper_count=1.
add(3): 
- clean_lower: lower=[-1], -lower[0]=1. 1 in deleted: yes. Pop: v=1, deleted[1]=0. lower=[].
- lower_count=0: push 3 to upper (since lower_count > 0 is false). upper=[2,3], upper_count=2.

rebalance:
- lower_count=0, target_lower=1. Not > 1.
- upper_count=2, target_upper=1. > 1. Pop upper → 2. Push -2 to lower. lower=[-2], upper=[3]. lower_count=1, upper_count=1.

Median: (-lower[0] + upper[0]) / 2 = (2 + 3) / 2 = 2.5. ✓

Step i=3: old=2, new=4.
remove(2):
- clean_lower: lower=[-2]. -lower[0]=2. 2 in deleted? No.
- lower_count=1 > 0 and 2 <= 2: yes. deleted[2]=1, lower_count=0.

add(4):
- clean_lower: lower=[-2]. -lower[0]=2. 2 in deleted: yes. Pop: v=2, deleted[2]=0. lower=[].
- lower_count=0: push 4 to upper. upper=[3,4], upper_count=2.

rebalance:
- lower_count=0, target_lower=1. Not > 1.
- upper_count=2, target_upper=1. > 1. Pop upper → 3. Push -3 to lower. lower=[-3], upper=[4]. lower_count=1, upper_count=1.

Median: (3+4)/2 = 3.5. ✓ (median of [3,4] is 3.5)

Step i=4: old=3, new=5.
remove(3):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted? No.
- lower_count=1 > 0 and 3 <= 3: yes. deleted[3]=1, lower_count=0.

add(5):
- clean_lower: lower=[-3]. -lower[0]=3. 3 in deleted: yes. Pop: v=3, deleted[3]=0. lower=[].
- lower_count=0: push 5 to upper. upper=[4,5], upper_count=2.

rebalance:
- lower_count=0, target_lower=1. Not > 1.
- upper_count=2, target_upper=1. > 1. Pop upper → 4. Push -4 to lower. lower=[-4], upper=[5]. lower_count=1, upper_count=1.

Median: (4+5)/2 = 4.5. ✓ (median of [4,5] is 4.5)

The algorithm works with the fixed `add` function!

Now let me also verify the odd k case: nums = [1, 2, 3, 4, 5], k = 3. target_lower=2, target_upper=1.

Initialize:
- Push 1, 2, 3 to lower: lower=[-3,-2,-1], lower_count=3.
- Rebalance: lower_count=3 > 2. Pop → -1 → 1. Push 1 to upper. lower=[-3,-2], upper=[1], lower_count=2, upper_count=1.

lower={2,3}, upper={1}. Invariant: max(lower)=3, min(upper)=1. 3 > 1. VIOLATED!

Wait, this is wrong. lower={2,3} and upper={1}. 3 > 1, invariant violated.

The issue: I pushed all 3 elements to lower, then popped the max (3... wait).

lower=[-3,-2,-1] as min-heap: root is -3. Pop gives -3 → original 3. Push 3 to upper. lower=[-2,-1], upper=[3].

lower={1,2}, upper={3}. Invariant: max(lower)=2, min(upper)=3. 2 <= 3. ✓!

I was wrong again. The min-heap of [-3,-2,-1] has root -3. Popping gives -3, original value 3. After popping, lower=[-2,-1] (values 1, 2). upper=[3].

So lower={1,2}, upper={3}. Median: -lower[0] = -(-2) = 2. ✓ (median of [1,2,3] is 2)

Step i=3: old=1, new=4.
remove(1):
- clean_lower: lower=[-2,-1]. -lower[0]=2. 2 in deleted? No.
- lower_count=2 > 0 and 1 <= 2: yes. deleted[1]=1, lower_count=1.

add(4):
- clean_lower: lower=[-2,-1]. -lower[0]=2. 2 in deleted? No.
- lower_count=1 > 0 and 4 <= 2: no. Push 4 to upper. upper=[3,4], upper_count=2.

rebalance:
- lower_count=1, target_lower=2. Not > 2.
- upper_count=2, target_upper=1. > 1. Pop upper → 3. Push -3 to lower. lower=[-3,-2,-1], upper=[4]. lower_count=2, upper_count=1.

clean_lower: lower=[-3,-2,-1]. -lower[0]=3. 3 in deleted? No.
clean_upper: upper=[4]. 4 in deleted? No.

Median: -lower[0] = -(-3) = 3. ✓ (median of [2,3,4] is 3)

Wait, but lower physically has 3 elements (3, 2, 1) and lower_count=2. The physical size is 3 but logical is 2. After cleaning, lower=[-3,-2,-1] (1 is not deleted, so it stays). Physical size=3, logical=2. Mismatch!

The issue: 1 was marked as deleted in lower. But 1 is physically in lower. After cleaning, 1 should be removed. But -lower[0]=3, and 3 is not deleted. So cleaning doesn't remove 1 (it's not at the top).

The physical heap has 3 elements: 3, 2, 1. The logical count is 2. The extra element (1) is marked as deleted but not at the top, so it stays in the heap.

This is the fundamental issue with lazy deletion: deleted elements that aren't at the top stay in the heap, inflating the physical size. The logical count is correct, but the physical heap is larger.

For the median computation, we use -lower[0] (the max of lower). Since 3 is the max and it's not deleted, the median is correct. The extra deleted element (1) doesn't affect the median.

But what about the rebalancing? If lower_count=2 (logical) but physical size=3, and we need to move an element from lower to upper, we pop the max (3) and push to upper. This is correct.

I think the algorithm is correct as long as we:
1. Always clean before accessing the top.
2. Use logical counts for rebalancing decisions.
3. The median is computed from the top of the cleaned heap.

The physical heap might be larger than the logical count, but that's fine as long as we only access the top (after cleaning).

Let me verify one more step:

Step i=4: old=2, new=5.
State: lower=[-3,-2,-1] (3,2,1; 1 is deleted), lower_count=2. upper=[4], upper_count=1.

remove(2):
- clean_lower: lower=[-3,-2,-1]. -lower[0]=3. 3 in deleted? No.
- lower_count=2 > 0 and 2 <= 3: yes. deleted[2]=1, lower_count=1.

add(5):
- clean_lower: lower=[-3,-2,-1]. -lower[0]=3. 3 in deleted? No.
- lower_count=1 > 0 and 5 <= 3: no. Push 5 to upper. upper=[4,5], upper_count=2.

rebalance:
- lower_count=1, target_lower=2. Not > 2.
- upper_count=2, target_upper=1. > 1. Pop upper → 4. Push -4 to lower. lower=[-4,-3,-2,-1], upper=[5]. lower_count=2, upper_count=1.

clean_lower: lower=[-4,-3,-2,-1]. -lower[0]=4. 4 in deleted? No.
clean_upper: upper=[5]. 5 in deleted? No.

Median: -lower[0] = -(-4) = 4. ✓ (median of [3,4,5] is 4)

The algorithm works! The physical heap has 4 elements (4,3,2,1) but logical count is 2. The top (4) is correct.

I'm now confident the lazy deletion approach works. Let me finalize the code.

One more concern: the `deleted` dictionary. For n=200,000, we add and remove 200,000 elements. The `deleted` dict will have at most O(k) entries at any time (since we clean up). Memory is fine.

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    deleted = defaultdict(int)
    lower_count = 0
    upper_count = 0
    
    if k % 2 == 0:
        target_lower = k // 2
        target_upper = k // 2
    else:
        target_lower = (k + 1) // 2
        target_upper = (k - 1) // 2
    
    def clean_lower():
        while lower and -lower[0] in deleted:
            v = -heapq.heappop(lower)
            deleted[v] -= 1
    
    def clean_upper():
        while upper and upper[0] in deleted:
            v = heapq.heappop(upper)
            deleted[v] -= 1
    
    def add(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_count += 1
        else:
            heapq.heappush(upper, x)
            upper_count += 1
    
    def remove(x):
        nonlocal lower_count, upper_count
        clean_lower()
        if lower_count > 0 and x <= -lower[0]:
            deleted[x] += 1
            lower_count -= 1
        else:
            deleted[x] += 1
            upper_count -= 1
    
    def rebalance():
        nonlocal lower_count, upper_count
        if lower_count > target_lower:
            clean_lower()
            v = -heapq.heappop(lower)
            heapq.heappush(upper, v)
            lower_count -= 1
            upper_count += 1
        elif upper_count > target_upper:
            clean_upper()
            v = heapq.heappop(upper)
            heapq.heappush(lower, -v)
            upper_count -= 1
            lower_count += 1
    
    # Initialize
    for i in range(k):
        heapq.heappush(lower, -nums[i])
        lower_count += 1
    while lower_count > target_lower:
        v = -heapq.heappop(lower)
        heapq.heappush(upper, v)
        lower_count -= 1
        upper_count += 1
    
    result = []
    clean_lower()
    clean_upper()
    if k % 2 == 0:
        result.append((-lower[0] + upper[0]) / 2)
    else:
        result.append(-lower[0])
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 0:
            result.append((-lower[0] + upper[0]) / 2)
        else:
            result.append(-lower[0])
    
    return result
```

Let me think about performance:
- Each step: O(log k) for heap push/pop + O(1) for dict operations + amortized O(1) for cleaning.
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations.
- Well under 2 seconds.

I'm satisfied with this solution. Let me also add a type hint and make sure the ValueError message is appropriate.

Actually, I realize I should double-check: what if `k == len(nums)`? Then there's only one window. The initialization handles it, and the loop doesn't execute. Fine.

What if `k == 1`? target_lower=1, target_upper=0. Only lower is used. The median is just the element.

Let me also make sure the return type is `list[float]`. The median computation returns a float (either an int converted to float via division, or a float directly). In Python 3, division always returns float. So `(-lower[0] + upper[0]) / 2` returns a float. And `-lower[0]` is a float (since nums is list[float]). ✓

I think this is correct and efficient. Let me finalize.
