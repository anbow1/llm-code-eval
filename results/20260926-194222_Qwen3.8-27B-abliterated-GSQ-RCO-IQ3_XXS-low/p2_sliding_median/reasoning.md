The user wants a `sliding_median` function that:
1. Takes a list of floats `nums` and window size `k`
2. Returns the median of every contiguous window of size k
3. For even k, median is the mean of the two middle values
4. Raise ValueError if k < 1 or k > len(nums)
5. Must be efficient: n = 200_000 with k = 1_000 must finish in well under 2 seconds

Let me think about approaches:

**Naive approach**: For each window, sort the k elements and find the median. That's O(n * k log k) = 200,000 * 1000 * 10 = 2 billion operations. Too slow.

**Two heaps approach**: Use two heaps (max-heap for lower half, min-heap for upper half) to maintain the median. When we slide the window, we remove an element and add a new one. But removal from a heap is O(k) without a lazy deletion approach. With lazy deletion, it could work but is complex.

**Two heaps with lazy deletion**: 
- Maintain two heaps: a max-heap (negated min-heap) for the lower half, and a min-heap for the upper half.
- Each heap has size at most ceil(k/2) or floor(k/2).
- When removing an element, mark it as "removed" (lazy deletion).
- When adding an element, add to the appropriate heap.
- Rebalance as needed.
- This gives O(log k) per operation amortized.
- Total: O(n log k) = 200,000 * log(1000) ≈ 200,000 * 10 = 2 million operations. Very fast.

Let me implement the two heaps approach with lazy deletion:

- `low`: max-heap (store negated values) - contains the lower half of elements
- `high`: min-heap - contains the upper half of elements
- `removed_low`: set of elements marked for removal from low (as negated values)
- `removed_high`: set of elements marked for removal from high
- `size_low`: actual size of low (accounting for lazy deletions)
- `size_high`: actual size of high (accounting for lazy deletions)

For even k: median = (max(low) + min(high)) / 2, where size_low == size_high == k/2
For odd k: median = max(low), where size_low == (k+1)//2, size_high == (k-1)//2

Wait, let me reconsider the sizes. For k elements:
- If k is odd: low has (k+1)//2 elements, high has (k-1)//2 elements. Median is max of low.
- If k is even: low has k//2 elements, high has k//2 elements. Median is (max(low) + min(high)) / 2.

Actually, let me use a simpler convention:
- `size_low` should be `k // 2` (or `(k+1)//2` for odd)
- `size_high` should be `k - size_low`

Let me think more carefully:
- For odd k: we want the single middle element. Let size_low = (k+1)//2, size_high = (k-1)//2. Median = max(low).
- For even k: we want the average of two middle elements. Let size_low = k//2, size_high = k//2. Median = (max(low) + min(high)) / 2.

Operations:
1. Initialize: add first k elements, building the heaps.
2. For each slide: remove nums[i-k], add nums[i], rebalance, compute median.

Let me code this:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    # low: max-heap (negated) for lower half
    # high: min-heap for upper half
    low = []
    high = []
    removed_low = set()  # negated values
    removed_high = set()  # values
    
    size_low = 0
    size_high = 0
    
    def clean_low():
        while low and -low[0] in removed_low:
            heapq.heappop(low)
            removed_low.discard(-low[-1])  # wait, this is wrong
    
    # Actually let me redo the lazy deletion properly.
    
    # When we remove an element x from low, we add x to removed_low set
    # When we remove an element x from high, we add x to removed_high set
    # When peeking at top of low, we check if -low[0] is in removed_low
    # When peeking at top of high, we check if high[0] is in removed_high
    
    # But we need to track counts because of duplicates. Use a counter/dict instead of set.
    
    from collections import defaultdict
    
    removed_low = defaultdict(int)
    removed_high = defaultdict(int)
    
    def clean_low():
        while low and removed_low[-low[0]] > 0:
            val = -heapq.heappop(low)
            removed_low[val] -= 1
    
    def clean_high():
        while high and removed_high[high[0]] > 0:
            val = heapq.heappop(high)
            removed_high[val] -= 1
    
    def add_low(x):
        heapq.heappush(low, -x)
        size_low += 1
    
    def add_high(x):
        heapq.heappush(high, x)
        size_high += 1
    
    def remove_low(x):
        removed_low[x] += 1
        size_low -= 1
    
    def remove_high(x):
        removed_high[x] += 1
        size_high -= 1
    
    # Target sizes
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    # Initialize with first k elements
    for i in range(k):
        if i < target_low:  # Hmm, this isn't quite right for building
    
    # Actually, let me just add all k elements and then rebalance.
    # Simpler: add elements one by one and rebalance after each.
    
    # Let me just add all and rebalance once.
    
    for i in range(k):
        # Add to high first, then rebalance
        add_high(nums[i])
        # Move from high to low if size_high > target_high
        if size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            add_low(val)
        # Move from low to high if size_low > target_low
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            add_high(val)
    
    # Wait, this approach of adding one by one and rebalancing is O(k log k) for initialization, which is fine.
    
    # Actually let me think again. The standard approach:
    # - Always add to one side, then rebalance.
    # - But which side to add to? If the new element is <= max(low), add to low. Otherwise add to high.
    # - Then rebalance to maintain target sizes.
    
    # Let me restart with a cleaner approach.
```

Let me restart with a cleaner implementation:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    # low: max-heap (negated) for lower half
    # high: min-heap for upper half
    low = []
    high = []
    removed_low = defaultdict(int)
    removed_high = defaultdict(int)
    size_low = 0
    size_high = 0
    
    target_low = (k + 1) // 2  # for odd k, low has one more
    target_high = k - target_low
    
    def clean_low():
        while low and removed_low[-low[0]] > 0:
            val = -heapq.heappop(low)
            removed_low[val] -= 1
    
    def clean_high():
        while high and removed_high[high[0]] > 0:
            val = heapq.heappop(high)
            removed_high[val] -= 1
    
    def median():
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize: add first k elements
    for i in range(k):
        x = nums[i]
        # Add to low if x <= current max of low, else to high
        if size_low == 0 or x <= -low[0]:
            heapq.heappush(low, -x)
            size_low += 1
        else:
            heapq.heappush(high, x)
            size_high += 1
        # Rebalance
        while size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        while size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1
    
    result = []
    result.append(median())
    
    for i in range(k, n):
        out = nums[i - k]
        new = nums[i]
        
        # Remove 'out'
        if size_low > 0 and out <= -low[0]:
            # It's in low
            remove... 
```

Hmm, wait. The issue with the two-heaps approach and lazy deletion is determining which heap an element belongs to when we need to remove it. This is tricky with floats and duplicates.

Let me think of a different approach. 

**Alternative: Use a balanced BST or sorted list approach.**

Actually, for Python, we can use `sortedcontainers` but that's not stdlib. 

Let me think about using two heaps more carefully.

The key insight: when removing an element `out`, we need to determine if it's in `low` or `high`. We can do this by comparing with the boundary. If `out <= -low[0]` (the max of low), it's likely in low. But with duplicates this gets tricky.

Actually, a cleaner way: always compare the element to be removed with the current max of low. If `out <= max(low)`, remove from low; otherwise remove from high. This works correctly because:
- All elements in low are <= max(low)
- All elements in high are >= min(high) >= max(low) (after rebalancing, min(high) >= max(low))

Wait, that's not quite right with duplicates. Let me think...

If `out <= -low[0]` (i.e., out <= max(low)), we remove from low.
If `out > -low[0]` (i.e., out > max(low)), we remove from high.

This works because after proper balancing, all elements in low are <= max(low) and all elements in high are >= min(high) >= max(low). So if out <= max(low), it must be in low. If out > max(low), it must be in high.

But wait, with duplicates: if out == max(low), it could be in either heap. But it doesn't matter which one we remove it from, as long as we maintain the correct sizes. Actually, it does matter because if we remove from the wrong heap, the sizes get off.

Hmm, let me think differently. Let's say out <= -low[0]. We mark it as removed from low. Then we rebalance. If out was actually in high, we've over-decremented low's size and under-decremented high's size, but the rebalancing will fix it... no, it won't fix it because we haven't added a removal to high.

Actually, I think the standard approach works like this:
- If `out <= -low[0]`: mark out as removed from low, decrement size_low.
- Else: mark out as removed from high, decrement size_high.
- Then add the new element (same logic: if new <= -low[0], add to low, else add to high).
- Then rebalance.

The key insight is that this is correct because:
- If out is in low: out <= max(low) = -low[0]. We correctly identify it.
- If out is in high: out >= min(high) >= max(low) = -low[0]. So out >= -low[0]. 
  - If out > -low[0], we correctly identify it as in high.
  - If out == -low[0], it could be in either. We say it's in low. This is fine because after removing from low and rebalancing, we'll maintain correct sizes.

Wait, actually I realize there's a subtlety. Let me think about it with a concrete example.

k=2, target_low=1, target_high=1.
Window: [1, 2]. low=[1], high=[2].
Slide out=1, new=3.
- out=1 <= -low[0]=1, so remove from low. size_low=0, size_high=1.
- new=3 > -low[0]... wait, low is empty now. What's -low[0]?

I need to handle the case where low might be empty. Let me add: if size_low == 0, then everything goes to high, or we can say new > -low[0] is not applicable.

Let me use: if size_low == 0 or new <= -low[0]: add to low. Else: add to high.

Continuing:
- After removing out=1 from low: size_low=0, size_high=1.
- new=3: size_low==0, so add to low. size_low=1, size_high=1.
- Rebalance: sizes are correct (1,1). Median = (1+3)/2 = 2. Correct!

Another example:
k=3, target_low=2, target_high=1.
Window: [1, 2, 3]. low=[1,2], high=[3].
Slide out=1, new=4.
- out=1 <= -low[0]=2, remove from low. size_low=1, size_high=1.
- new=4 > -low[0]=2, add to high. size_low=1, size_high=2.
- Rebalance: size_high > target_high (2 > 1). Move from high to low: pop 3 from high, push to low. size_low=2, size_high=1.
- low=[2,3], high=[4]. Median = 3. Correct!

Another:
Window: [1, 2, 3]. low=[1,2], high=[3].
Slide out=3, new=0.
- out=3 > -low[0]=2, remove from high. size_low=2, size_high=0.
- new=0 <= -low[0]=2, add to low. size_low=3, size_high=0.
- Rebalance: size_low > target_low (3 > 2). Move from low to high: pop 2 from low, push to high. size_low=2, size_high=1.
- low=[1,0] (max-heap: [-1, 0] as negated, so -low[0]=1... wait)

Hmm wait. If low is a max-heap stored as negated: push -1, -0 = 0. So low = [0, -1] (min-heap of negated values, so top is 0 which means max is 0). -low[0] = 0. 

Hmm that doesn't seem right. Let me re-examine.

After adding 0 to low: we push -0 = 0. low = [0, -1] (heap property: 0 < -1? No, 0 > -1, so 0 is at root). Wait, min-heap: smallest at root. 0 < -1? No, -1 < 0. So -1 should be at root. low = [-1, 0]. -low[0] = 1. OK so max of low is 1.

Rebalance: size_low=3 > target_low=2. Pop from low: -1 (val=1). Push to high. size_low=2, size_high=1.
low = [0] (max is 0), high = [1]. 
Wait, that gives median = 0? But the window should be [0, 1, 2] and median should be 1.

Let me redo. After removing out=3 from high and adding new=0 to low:
- Before: low = [-2, -1] (max-heap, values 2 and 1), high = [3]. size_low=2, size_high=1.
- Remove out=3 from high: removed_high[3]=1, size_high=0. high still has [3] but it's marked removed.
- Add new=0 to low: push -0=0. low = [-2, -1, 0]. size_low=3.
- Rebalance: size_low=3 > target_low=2. clean_low(): -low[0] = 2, not in removed_low. Pop -2 (val=2). Push 2 to high. size_low=2, size_high=1.
- low = [-1, 0] (values 1 and 0, max=1). high = [3, 2] (min=2, but 3 is marked removed).
- clean_high(): high[0]=2, not in removed_high. OK.
- Median: -low[0] = 1. Correct!

OK so the approach works. Let me also handle the edge case where after removal, we need to clean before comparing.

Actually wait, when I check `out <= -low[0]`, I should make sure low is clean first (or at least that -low[0] is valid). Let me clean before checking.

Let me also think about: what if size_low is 0? Then -low[0] would fail. In that case, the new element should go to... well, if low is empty and we need target_low elements in low, everything new should go to low? No, that's not right either.

Actually, I think the safer approach is:
- If `out <= -low[0]` (and size_low > 0): remove from low
- Else: remove from high

But we need to clean first to get the correct -low[0].

Let me also handle: what if after removing from high, high becomes "empty" (size_high = 0) but still has elements in the heap marked as removed? That's fine, we just clean when we need to peek.

Let me also think about: after removing and adding, we might need multiple rebalancing steps. I'll use a while loop.

Actually, I realize there might be an issue: after removing from low and adding to high, size_low decreased and size_high increased. We might need to move an element from high to low (if size_high > target_high) OR from low to high (if size_low < target_low... wait no, we decreased size_low so it's below target, we need to move from high to low).

Let me be more careful with rebalancing:
After any add/remove:
- If size_low > target_low: move one from low to high.
- If size_high > target_high: move one from high to low.

These two conditions can't both be true simultaneously (since size_low + size_high = k always). So at most one "move" is needed after each operation. Actually, we might need at most one move in one direction. Let me verify:
- If we add to low: size_low increases by 1. If it was target_low, now it's target_low+1. Move one to high. Done.
- If we add to high: size_high increases by 1. If it was target_high, now it's target_high+1. Move one to low. Done.
- If we remove from low: size_low decreases by 1. If it was target_low, now it's target_low-1. Move one from high to low. Done.
- If we remove from high: size_high decreases by 1. If it was target_high, now it's target_high-1. Move one from high to low. Done.

Wait, that last one: if we remove from high, size_high decreases. We need to move from low to high to restore. Let me re-examine:
- Remove from high: size_high decreases. Now size_high < target_high. We need to move from low to high. But we're checking `size_high > target_high` for that... 

I think I had the directions confused. Let me redo:
- `size_low > target_low`: low has too many, move one from low to high.
- `size_high > target_high`: high has too many, move one from high to low.

Since size_low + size_high = k = target_low + target_high, if size_low > target_low then size_high < target_high, and vice versa. So exactly one of these is true when things are unbalanced.

After removing from low: size_low < target_low, so size_high > target_high. Move from high to low. ✓
After removing from high: size_high < target_high, so size_low > target_low. Move from low to high. ✓
After adding to low: size_low > target_low. Move from low to high. ✓
After adding to high: size_high > target_high. Move from high to low. ✓

Great, so in all cases, exactly one move is needed (assuming we were balanced before). Let me use while loops for safety.

Now let me code this up properly:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    low = []  # max-heap (negated)
    high = []  # min-heap
    removed_low = defaultdict(int)
    removed_high = defaultdict(int)
    size_low = 0
    size_high = 0
    
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    def clean_low():
        while low and removed_low[-low[0]] > 0:
            val = -heapq.heappop(low)
            removed_low[val] -= 1
    
    def clean_high():
        while high and removed_high[high[0]] > 0:
            val = heapq.heappop(high)
            removed_high[val] -= 1
    
    def get_median():
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return float(-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        x = nums[i]
        if size_low == 0 or x <= -low[0]:
            heapq.heappush(low, -x)
            size_low += 1
        else:
            heapq.heappush(high, x)
            size_high += 1
        # Rebalance
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1
    
    result = [get_median()]
    
    for i in range(k, n):
        out = nums[i - k]
        new = nums[i]
        
        # Determine where 'out' is
        clean_low()
        if size_low > 0 and out <= -low[0]:
            removed_low[out] += 1
            size_low -= 1
        else:
            removed_high[out] += 1
            size_high -= 1
        
        # Add 'new'
        clean_low()
        if size_low == 0 or new <= -low[0]:
            heapq.heappush(low, -new)
            size_low += 1
        else:
            heapq.heappush(high, new)
            size_high += 1
        
        # Rebalance
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1
        
        result.append(get_median())
    
    return result
```

Wait, I think there might be an issue with the "determine where out is" step. Consider:
- k=4, target_low=2, target_high=2.
- Window: [1, 2, 3, 4]. low=[1,2], high=[3,4].
- out=2, new=5.
- out=2 <= -low[0]=2, so remove from low. size_low=1, size_high=2.
- new=5: size_low>0, new=5 > -low[0]=1 (after cleaning, low=[1] with -low[0]=1... wait, low=[-2,-1] originally, we removed 2, so removed_low[2]=1, low still has [-2,-1]. clean_low: -low[0]=2, removed_low[2]=1>0, pop -2, removed_low[2]=0. low=[-1]. -low[0]=1.
- new=5 > 1, add to high. size_low=1, size_high=3.
- Rebalance: size_high=3 > target_high=2. Move from high to low. clean_high: high[0]=3, not removed. Pop 3. Push to low. size_low=2, size_high=2.
- low=[-3, -1] (values 3, 1, max=3). high=[4, 5] (min=4).
- Median = (3+4)/2 = 3.5. Correct! (window is [1,3,4,5], median=(3+4)/2=3.5) ✓

Another tricky case:
- k=4, target_low=2, target_high=2.
- Window: [1, 1, 2, 2]. low=[1,1], high=[2,2].
- out=1, new=3.
- out=1 <= -low[0]=1, remove from low. size_low=1, size_high=2.
- new=3: new=3 > -low[0]=1, add to high. size_low=1, size_high=3.
- Rebalance: size_high=3 > 2. Move from high to low. high=[2,2,3], pop 2. Push to low. size_low=2, size_high=2.
- low=[-2, -1] (values 2, 1, max=2). high=[2, 3] (min=2).
- Median = (2+2)/2 = 2. Correct! (window is [1,2,2,3], median=(2+2)/2=2) ✓

Another:
- k=4, target_low=2, target_high=2.
- Window: [1, 1, 1, 2]. low=[1,1], high=[1,2].
- out=1, new=3.
- out=1 <= -low[0]=1, remove from low. size_low=1, size_high=2.
- new=3: new=3 > -low[0]=1, add to high. size_low=1, size_high=3.
- Rebalance: size_high=3 > 2. Move from high to low. high=[1,2,3], clean: high[0]=1, not removed. Pop 1. Push to low. size_low=2, size_high=2.
- low=[-1, -1] (values 1, 1, max=1). high=[2, 3] (min=2).
- Median = (1+2)/2 = 1.5. Correct! (window is [1,1,2,3], median=(1+2)/2=1.5) ✓

Hmm wait, but what if out=1 was actually in high (the [1,2] part)? We said it's in low because out=1 <= -low[0]=1. But it could have been in high. Does it matter?

If out was actually in high: we mark removed_low[1]+=1 (wrong heap), size_low becomes 1. Then we add new=3 to high, size_high=3. Rebalance: move from high to low. We pop from high: the min is 1 (which was actually in high). We push it to low. Now size_low=2, size_high=2. The removed_low[1] is still 1, but we just added a 1 to low. When we clean_low, -low[0]=1, removed_low[1]=1>0, we'd pop it! That's a bug!

Wait no. Let me re-examine. Initially: low=[-1, -1] (two 1s), high=[1, 2]. 
- out=1, we say it's in low (since 1 <= 1). removed_low[1]=1, size_low=1.
- new=3, added to high. high=[1, 2, 3], size_high=3.
- Rebalance: size_high > target_high. clean_high: high[0]=1, removed_high[1]=0, OK. Pop 1 from high. removed_high unchanged. Push 1 to low. low=[-1, -1, -1] (three 1s). size_low=2, size_high=2.
- get_median: clean_low: -low[0]=1, removed_low[1]=1>0. Pop -1, removed_low[1]=0. low=[-1, -1]. -low[0]=1. clean_high: high[0]=2, removed_high[2]=0. OK.
- Median = (1+2)/2 = 1.5. Correct!

So even though we "incorrectly" marked a removal in low, the rebalancing moved an element from high to low, and the lazy deletion cleaned it up. The result is still correct!

I think this is a known property of the two-heaps approach: as long as the sizes are correct after rebalancing, the actual distribution of elements between heaps doesn't matter for the median computation, because the median only depends on the boundary elements.

Actually wait, I need to double-check this more carefully. The issue is: if we mark a removal in the wrong heap, we have one "phantom" removal in that heap. When we clean, we'll pop an extra element. But the size tracking should compensate...

Let me think about it differently. The invariant is:
- size_low + size_high = k (always, since we remove one and add one)
- After rebalancing, size_low = target_low, size_high = target_high.
- The top of low (after cleaning) gives the max of the "logical" low partition.
- The top of high (after cleaning) gives the min of the "logical" high partition.

The key question: after all operations, are the elements in low exactly the size_low smallest elements, and in high the size_high largest elements?

I believe the answer is yes, because:
1. We always add to low if x <= max(low), and to high otherwise.
2. We always move the max of low to high (or min of high to low) during rebalancing.
3. Lazy deletions don't change the relative ordering.

I think this is correct and the approach will work. Let me also handle the edge case where size_low becomes 0 (for k=2, after removing the only element in low).

Actually, for k=2: target_low=1, target_high=1.
- Window: [1, 2]. low=[1], high=[2].
- out=1, new=3.
- out=1 <= -low[0]=1, remove from low. size_low=0, size_high=1.
- new=3: size_low==0, so add to low. size_low=1, size_high=1.
- Rebalance: sizes are correct.
- get_median: -low[0]=3, high[0]=2. Median=(3+2)/2=2.5. Correct!

But wait, what about:
- Window: [1, 2]. low=[1], high=[2].
- out=2, new=0.
- out=2 > -low[0]=1, remove from high. size_low=1, size_high=0.
- new=0: new=0 <= -low[0]=1, add to low. size_low=2, size_high=0.
- Rebalance: size_low=2 > target_low=1. Move from low to high. clean_low: -low[0]=1, not removed. Pop 1. Push to high. size_low=1, size_high=1.
- low=[-0]=[0] (max=0), high=[2, 1] (min=1).
- get_median: -low[0]=0, high[0]=1. Median=(0+1)/2=0.5. Correct! (window [0,1], median=0.5) ✓

I'm now fairly confident the algorithm is correct. Let me also think about performance:
- Each window slide involves O(log k) heap operations.
- Total: O(n log k).
- n=200,000, k=1,000: 200,000 * ~10 = 2,000,000 operations. Very fast in Python.

The initialization is O(k log k) which is also fine.

One more thing: I should make sure I'm using `float` for the return values. Since we're dividing by 2 for even k, and the inputs are floats, the results should be floats. For odd k, `-low[0]` might be an int if the input is int. Let me cast to float.

Actually, the input is `list[float]`, so all elements should already be floats. But to be safe, I'll cast.

Let me also consider: what if k = n? Then we only have one window. That's fine, the loop runs 0 times.

Let me finalize the code:

```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    low: list[float] = []  # max-heap (negated)
    high: list[float] = []  # min-heap
    removed_low: dict = defaultdict(int)
    removed_high: dict = defaultdict(int)
    size_low = 0
    size_high = 0
    
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    def clean_low():
        while low and removed_low[-low[0]] > 0:
            val = -heapq.heappop(low)
            removed_low[val] -= 1
    
    def clean_high():
        while high and removed_high[high[0]] > 0:
            val = heapq.heappop(high)
            removed_high[val] -= 1
    
    def get_median() -> float:
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return float(-low[0] + high[0]) / 2.0
    
    # Initialize with first k elements
    for i in range(k):
        x = nums[i]
        if size_low == 0 or x <= -low[0]:
            heapq.heappush(low, -x)
            size_low += 1
        else:
            heapq.heappush(high, x)
            size_high += 1
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1
    
    result = [get_median()]
    
    for i in range(k, n):
        out = nums[i - k]
        new = nums[i]
        
        # Remove 'out'
        clean_low()
        if size_low > 0 and out <= -low[0]:
            removed_low[out] += 1
            size_low -= 1
        else:
            removed_high[out] += 1
            size_high -= 1
        
        # Add 'new'
        clean_low()
        if size_low == 0 or new <= -low[0]:
            heapq.heappush(low, -new)
            size_low += 1
        else:
            heapq.heappush(high, new)
            size_high += 1
        
        # Rebalance
        if size_low > target_low:
            clean_low()
            val = -heapq.heappop(low)
            removed_low[val] -= 1
            heapq.heappush(high, val)
            size_high += 1
            size_low -= 1
        elif size_high > target_high:
            clean_high()
            val = heapq.heappop(high)
            removed_high[val] -= 1
            heapq.heappush(low, -val)
            size_low += 1
            size_high -= 1
        
        result.append(get_median())
    
    return result
```

Wait, I want to double-check one more edge case. What about k=2 with all same values?
- nums = [5.0, 5.0, 5.0], k=2.
- Init: i=0: size_low=0, add 5 to low. low=[-5], size_low=1. i=1: 5 <= -low[0]=5, add to low. low=[-5, -5], size_low=2. size_low > target_low(1): pop -5 (val=5), push to high. low=[-5], high=[5], size_low=1, size_high=1.
- get_median: -low[0]=5, high[0]=5. (5+5)/2=5.0. ✓
- Slide: out=5.0, new=5.0.
  - clean_low: -low[0]=5, not removed.
  - out=5 <= 5, remove from low. removed_low[5]=1, size_low=0.
  - new=5: size_low==0, add to low. low=[-5, -5], size_low=1.
  
  Wait, low was [-5] and we push -5 again. low=[-5, -5]. size_low=1.
  - Rebalance: size_low=1, size_high=1. Correct.
  - get_median: clean_low: -low[0]=5, removed_low[5]=1>0. Pop -5, removed_low[5]=0. low=[-5]. -low[0]=5.
  - high=[5], clean_high: high[0]=5, not removed.
  - (5+5)/2=5.0. ✓

Looks good!

One more concern: in the initialization loop, I'm using `if size_low > target_low` and `elif size_high > target_high`. Could both be true at the same time? No, because size_low + size_high = k = target_low + target_high, so if size_low > target_low then size_high < target_high.

But what if during initialization, we add to low and size_low > target_low, we move one to high, and now size_high > target_high? No, because we moved one to high, so size_high increased by 1 and size_low decreased by 1. If size_low was target_low+1, now it's target_low, and size_high was target_high-1, now it's target_high. Both are at target. ✓

I'm satisfied this is correct. Let me write the final clean version.

Actually, one more thought: for the performance requirement (n=200,000, k=1,000, under 2 seconds), let me think about whether Python's heapq will be fast enough. Each iteration involves a few heap operations (push, pop, peek) each O(log k) = O(log 1000) ≈ 10 comparisons. So about 50-100 operations per window, times 200,000 windows = 10-20 million operations. In Python, this should be well under 2 seconds (maybe 1-2 seconds for the worst case). Should be fine.

Let me also make sure I'm not doing anything wasteful. The `clean_low` and `clean_high` functions are called multiple times per iteration, but they're amortized O(1) per call since each element is removed at most once from each heap.

I think the solution is ready. Let me write the final version.
