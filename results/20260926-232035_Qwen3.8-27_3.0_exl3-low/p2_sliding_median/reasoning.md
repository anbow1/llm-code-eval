The user wants a sliding window median function that's efficient for n=200,000 and k=1,000.

Let me think about the approach:

1. **Naive approach**: For each window, sort the k elements and find the median. This is O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations. That's way too slow.

2. **Two heaps approach**: Use a max-heap for the lower half and a min-heap for the upper half. This gives O(n*log(k)) which is 200,000 * 10 = 2,000,000 operations. That should be fast enough.

The two heaps approach:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- For even k: median = (max of lower + min of upper) / 2
- For odd k: median = max of lower (if lower has one more element)

The challenge with sliding window is that we need to:
- Add a new element
- Remove an old element
- Keep the heaps balanced

The tricky part is removing an arbitrary element from a heap. Python's heapq doesn't support efficient removal of arbitrary elements. We can use a "lazy deletion" approach with a dictionary to track elements that should be removed.

Let me think about the lazy deletion approach:

- We maintain two heaps: `low` (max-heap, stored as negatives) and `high` (min-heap)
- We maintain a `lazy` dictionary that tracks elements to be removed (by value, but we need to handle duplicates)
- Actually, lazy deletion with duplicates is tricky. We need to track counts.

Let me use a different approach:

**Approach: Two heaps with lazy deletion**

- `low`: max-heap (negated values) - holds the lower half
- `high`: min-heap - holds the upper half
- `remove_low`: counter dict for elements to be removed from low
- `remove_high`: counter dict for elements to be removed from high

When we "remove" an element:
- We increment the counter in the appropriate remove dict
- When cleaning the top of a heap, we check if the top element is in the remove dict and pop it if so

Balancing:
- For odd k: len(low) = len(high) + 1
- For even k: len(low) = len(high)

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    remove_low = defaultdict(int)
    remove_high = defaultdict(int)
    
    def clean_low():
        while low and remove_low[-low[0]] > 0:
            remove_low[-low[0]] -= 1
            heapq.heappop(low)
    
    def clean_high():
        while high and remove_high[high[0]] > 0:
            remove_high[high[0]] -= 1
            heapq.heappop(high)
    
    def rebalance():
        # Target sizes
        if k % 2 == 1:
            target_low = (k + 1) // 2
            target_high = k // 2
        else:
            target_low = k // 2
            target_high = k // 2
        
        # Move from low to high
        while len(low) > target_low:
            clean_low()
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        
        # Move from high to low
        while len(high) > target_high:
            clean_high()
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
    
    # Initialize with first window
    for i in range(k):
        heapq.heappush(low, -nums[i])
    
    # Move elements from low to high to balance
    for _ in range(k // 2):
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    
    results = []
    
    # Compute median for first window
    clean_low()
    clean_high()
    if k % 2 == 1:
        results.append(float(-low[0]))
    else:
        results.append((-low[0] + high[0]) / 2.0)
    
    for i in range(1, n - k + 1):
        # Remove nums[i-1]
        if nums[i-1] <= -low[0]:
            remove_low[nums[i-1]] += 1
        else:
            remove_high[nums[i-1]] += 1
        
        # Add nums[i+k-1]
        if nums[i+k-1] <= -low[0]:
            heapq.heappush(low, -nums[i+k-1])
        else:
            heapq.heappush(high, nums[i+k-1])
        
        rebalance()
        
        clean_low()
        clean_high()
        
        if k % 2 == 1:
            results.append(float(-low[0]))
        else:
            results.append((-low[0] + high[0]) / 2.0)
    
    return results
```

Wait, there's a problem with the `rebalance` function. When I check `len(low) > target_low`, the actual size of low includes elements that are marked for removal. So I need to account for that.

Actually, let me reconsider. The `len(low)` includes lazy-deleted elements. So the effective size is `len(low) - sum(remove_low.values())`. This makes the rebalancing more complex.

Let me track the effective sizes separately:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    remove_low = defaultdict(int)
    remove_high = defaultdict(int)
    low_size = 0
    high_size = 0
    
    def clean_low():
        while low and remove_low[-low[0]] > 0:
            remove_low[-low[0]] -= 1
            heapq.heappop(low)
            low_size -= 1  # Wait, this is a closure issue
    
    # Actually, let me use a class or just inline it differently.
```

Hmm, the closure issue with mutable state in Python is a bit annoying. Let me just use a class or restructure.

Actually, let me just use nonlocal or make it a class. Or better yet, let me just track sizes explicitly.

Let me restructure:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    remove_low = defaultdict(int)
    remove_high = defaultdict(int)
    low_size = 0
    high_size = 0
    
    def clean_low():
        nonlocal low_size
        while low and remove_low[-low[0]] > 0:
            remove_low[-low[0]] -= 1
            heapq.heappop(low)
            low_size -= 1
    
    def clean_high():
        nonlocal high_size
        while high and remove_high[high[0]] > 0:
            remove_high[high[0]] -= 1
            heapq.heappop(high)
            high_size -= 1
    
    def rebalance():
        nonlocal low_size, high_size
        if k % 2 == 1:
            target_low = (k + 1) // 2
            target_high = k // 2
        else:
            target_low = k // 2
            target_high = k // 2
        
        while low_size > target_low:
            clean_low()
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        
        while high_size > target_high:
            clean_high()
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
    
    # Initialize
    for i in range(k):
        heapq.heappush(low, -nums[i])
        low_size += 1
    
    # Move k//2 elements from low to high
    for _ in range(k // 2):
        clean_low()
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1
    
    results = []
    
    clean_low()
    clean_high()
    if k % 2 == 1:
        results.append(float(-low[0]))
    else:
        results.append((-low[0] + high[0]) / 2.0)
    
    for i in range(1, n - k + 1):
        out_val = nums[i - 1]
        in_val = nums[i + k - 1]
        
        # Determine which heap out_val belongs to
        # If out_val <= median (top of low), it's in low
        clean_low()
        clean_high()
        if out_val <= -low[0]:
            remove_low[out_val] += 1
            low_size -= 1
        else:
            remove_high[out_val] += 1
            high_size -= 1
        
        # Add in_val
        clean_low()
        clean_high()
        if in_val <= -low[0]:
            heapq.heappush(low, -in_val)
            low_size += 1
        else:
            heapq.heappush(high, in_val)
            high_size += 1
        
        rebalance()
        
        clean_low()
        clean_high()
        
        if k % 2 == 1:
            results.append(float(-low[0]))
        else:
            results.append((-low[0] + high[0]) / 2.0)
    
    return results
```

Wait, there's a subtle issue. When I determine which heap `out_val` belongs to, I compare it with `-low[0]` (the current max of the lower half). But what if `out_val` equals `-low[0]`? It could be in either heap. 

Actually, the standard approach is: if `out_val <= -low[0]`, assume it's in `low`. This works because if there are duplicates, it doesn't matter which heap we "remove" from as long as we maintain the invariant that all elements in low <= all elements in high.

But wait, there's another issue. What if `out_val == -low[0]` and it's actually in `high`? Then we'd incorrectly mark it for removal from `low`. But since the values are the same, the lazy deletion would still work correctly - we'd just remove a different instance of the same value from `low` instead of `high`. The heaps maintain the property that all elements in low <= all elements in high, so this should be fine.

Actually wait, that's not quite right. If `out_val == -low[0]` and it's in `high`, and we mark it for removal from `low`, then we'd be removing a value from `low` that's actually in `high`. But since the values are the same, the net effect is the same - we've removed one instance of that value from the combined set. The rebalancing will fix any size imbalances.

Hmm, but actually this could cause issues. Let me think more carefully...

If out_val = 5, and -low[0] = 5, and high contains 5. We mark remove_low[5] += 1. Then later when we clean_low, we'll pop a 5 from low (negated as -5). But that 5 in low might be a different instance. However, since all we care about is the multiset of values, removing any 5 from the combined set is equivalent. The sizes will be off by the rebalancing step.

Actually, I think the issue is more subtle. Let me think about it differently.

The invariant is:
- All elements in low (effective) <= all elements in high (effective)
- low_size + high_size = k (after each step)
- The sizes differ by at most 1

When we remove out_val:
- If out_val <= -low[0], we assume it's in low. We increment remove_low[out_val] and decrement low_size.
- If out_val > -low[0], we assume it's in high. We increment remove_high[out_val] and decrement high_size.

This is correct because:
- If out_val <= -low[0], it must be in low (since all elements in high are >= -low[0] >= out_val, and if out_val == -low[0], it could be in either, but we can safely assume it's in low since the multiset is what matters).
- If out_val > -low[0], it must be in high.

Wait, if out_val == -low[0], it could be in either heap. But if we put it in remove_low, and the actual element was in high, then:
- low_size is decremented (but the element wasn't really in low)
- high_size is not decremented (but the element was in high)
- remove_low[out_val] is incremented

When we clean_low, we'll pop an element with value out_val from low. This is fine because low does contain elements with value out_val (since -low[0] == out_val). So we're effectively removing one instance of out_val from low, and the element in high remains. Net effect: we removed one out_val from the combined set, which is correct.

The sizes: low_size was decremented, high_size was not. But the actual effective sizes are: low had one fewer (because we'll clean it), high is unchanged. So the net is correct.

OK I think this approach works. Let me also consider edge cases:
- k = 1: handled separately
- k = n: only one window
- All same values: should work fine

Let me also think about the performance. For n=200,000 and k=1,000:
- We do n-k+1 ≈ 199,001 iterations
- Each iteration: O(log k) for heap operations + O(1) for the remove tracking
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations

This should be well under 2 seconds in Python.

Actually, let me reconsider the initialization. I push all k elements into low, then move k//2 to high. This is O(k log k) which is fine.

Let me also make sure the `rebalance` function handles the case where we need to move elements in both directions. Actually, in the sliding window, we remove one and add one, so the total size stays at k. The rebalancing only needs to move at most 1 element from one heap to the other. But to be safe, I'll keep the while loops.

One more thing: when I do `clean_low()` before checking `-low[0]`, I need to make sure low is not empty. But since we always maintain at least one element in low (for odd k) or at least one in each (for even k), this should be fine.

Wait, for even k, both heaps have k/2 elements. For odd k, low has (k+1)/2 and high has (k-1)/2. So low always has at least 1 element. Good.

Let me finalize the code. I think it's correct. Let me trace through a small example:

nums = [1, 3, -1, -3, 3, 3, 3], k = 3

Windows: [1,3,-1], [3,-1,-3], [-1,-3,3], [-3,3,3], [3,3,3]
Medians: 1, -1, -1, 3, 3

Initialization: push 1, 3, -1 into low (as -1, -3, 1)
low = [-3, -1, 1] (max-heap: top is -3, which represents 3)
Wait, heapq is a min-heap. So low contains [-3, -1, 1]. The top is -3, which represents value 3.

Hmm wait, I'm negating. So if the value is 3, I push -3. The min-heap top is the most negative, which corresponds to the largest original value. So -low[0] gives the max of the lower half.

low = [-3, -1, 1] → represents values {3, 1, -1}, max is 3 (at top as -3)

Now move k//2 = 1 element from low to high:
Pop -3 from low → val = 3, push to high
low = [-1, 1] → represents {1, -1}, max is 1
high = [3] → represents {3}, min is 3

Median (odd k): -low[0] = -(-1) = 1. ✓

Next window: remove nums[0]=1, add nums[3]=-3
- out_val = 1, -low[0] = 1. Since 1 <= 1, mark remove_low[1] += 1, low_size -= 1 → low_size = 1
- in_val = -3, -low[0] = 1. Since -3 <= 1, push -(-3)=3 to low, low_size += 1 → low_size = 2
- rebalance: target_low = 2, target_high = 1. low_size = 2, high_size = 1. OK, no rebalancing needed.
- clean_low: low[0] = -1, remove_low[-(-1)] = remove_low[1] = 1. Pop -1, low_size -= 1 → low_size = 1.
  Now low = [1, 3] (wait, the heap had [-1, 1] and we pushed 3, so it's [-1, 1, 3]. After popping -1, it's [1, 3].)
  Hmm wait, let me redo. low was [-1, 1] (representing values 1 and -1). We pushed 3 (as -3? No, we push -in_val = -(-3) = 3). So low = [-1, 1, 3].
  
  Wait, I'm confusing myself. Let me be more careful.
  
  low stores negated values. So if the actual value is v, we store -v in the heap.
  
  Initial: push 1 → store -1; push 3 → store -3; push -1 → store 1.
  low heap: [-3, -1, 1] (min-heap order)
  
  Move 1 to high: pop -3 → actual value 3. Push 3 to high.
  low: [-1, 1] (represents values 1, -1)
  high: [3] (represents value 3)
  
  low_size = 2, high_size = 1.
  
  Median: -low[0] = -(-1) = 1. ✓
  
  Window 2: remove nums[0] = 1, add nums[3] = -3.
  
  out_val = 1. -low[0] = -(-1) = 1. 1 <= 1, so remove_low[1] += 1, low_size = 1.
  
  in_val = -3. -low[0] = 1. -3 <= 1, so push -(-3) = 3 to low. low_size = 2.
  low heap now: [-1, 1, 3]
  
  rebalance: target_low = 2, target_high = 1. low_size = 2, high_size = 1. OK.
  
  clean_low: low[0] = -1. remove_low[-(-1)] = remove_low[1] = 1. Pop -1. low_size = 1.
  low heap: [1, 3]
  
  clean_high: high[0] = 3. remove_high[3] = 0. OK.
  
  Median: -low[0] = -1. ✓
  
  Window 3: remove nums[1] = 3, add nums[4] = 3.
  
  out_val = 3. -low[0] = -1. 3 > -1, so remove_high[3] += 1, high_size = 0.
  
  in_val = 3. -low[0] = -1. 3 > -1, so push 3 to high. high_size = 1.
  high heap: [3, 3]
  
  rebalance: target_low = 2, target_high = 1. low_size = 1, high_size = 1.
  Need to move from high to low: high_size > target_high? No, 1 = 1. 
  Wait, low_size = 1 < target_low = 2. But the while loop only checks if low_size > target_low or high_size > target_high. It doesn't handle the case where low_size < target_low!
  
  Hmm, this is a problem. Let me reconsider.
  
  Actually wait. After removing and adding, the total size is still k. So if low_size + high_size = k, and target_low + target_high = k, then:
  - If low_size > target_low, then high_size < target_high. We move from low to high.
  - If low_size < target_low, then high_size > target_high. We move from high to low.
  
  So the second while loop (high_size > target_high) handles the case where low_size < target_low.
  
  In my example: low_size = 1, high_size = 1. target_low = 2, target_high = 1.
  high_size = 1, target_high = 1. So high_size > target_high is False.
  
  But low_size = 1 < target_low = 2! This means we need to move from high to low.
  
  The issue is that my rebalance only moves elements when one heap is too big, not when one is too small. But since the total is fixed at k, if one is too small, the other must be too big.
  
  low_size + high_size = 2. target_low + target_high = 3. Wait, that doesn't add up!
  
  Oh I see the issue. After the remove step, low_size + high_size = k - 1 = 2. After the add step, low_size + high_size = k = 3.
  
  Let me redo: After remove: low_size = 1, high_size = 0. Total = 1 = k-1. ✓
  After add: low_size = 1, high_size = 1. Total = 2. But k = 3!
  
  Wait, that's wrong. Let me recheck.
  
  Initial: low_size = 2, high_size = 1. Total = 3 = k. ✓
  
  Window 2:
  Remove: low_size = 1, high_size = 1. Total = 2 = k-1. ✓
  Add: low_size = 2, high_size = 1. Total = 3 = k. ✓
  
  Window 3:
  Remove: out_val = 3, goes to high. high_size = 0. Total = 2. ✓
  Add: in_val = 3, goes to high. high_size = 1. Total = 3. ✓
  
  Now rebalance: target_low = 2, target_high = 1. low_size = 1, high_size = 1.
  low_size > target_low? 1 > 2? No.
  high_size > target_high? 1 > 1? No.
  
  But we need low_size = 2! The problem is that low_size is 1 but should be 2.
  
  The issue: when I removed from high (high_size went from 1 to 0), and then added to high (high_size went from 0 to 1), the net effect is that low_size stayed at 1. But we need low_size = 2.
  
  So my rebalance logic is wrong. I need to also check if low_size < target_low.
  
  Let me fix:
  
  ```python
  def rebalance():
      nonlocal low_size, high_size
      if k % 2 == 1:
          target_low = (k + 1) // 2
          target_high = k // 2
      else:
          target_low = k // 2
          target_high = k // 2
      
      while low_size > target_low:
          clean_low()
          val = -heapq.heappop(low)
          low_size -= 1
          heapq.heappush(high, val)
          high_size += 1
      
      while high_size > target_high:
          clean_high()
          val = heapq.heappop(high)
          high_size -= 1
          heapq.heappush(low, -val)
          low_size += 1
  ```
  
  In my example: low_size = 1, high_size = 1. target_low = 2, target_high = 1.
  Neither condition is met. But we need to move one from high to low!
  
  The fix: I should change the second condition to `low_size < target_low` instead of `high_size > target_high`. Or better, use both:
  
  Actually, since low_size + high_size = k always (after add), and target_low + target_high = k, we have:
  low_size - target_low = -(high_size - target_high)
  
  So if low_size > target_low, then high_size < target_high, and we need to move from low to high.
  If low_size < target_low, then high_size > target_high, and we need to move from high to low.
  
  So checking `high_size > target_high` should be equivalent to checking `low_size < target_low`.
  
  In my example: high_size = 1, target_high = 1. 1 > 1 is False.
  low_size = 1, target_low = 2. 1 < 2 is True.
  
  But 1 > 1 is False while 1 < 2 is True. These should be equivalent!
  
  low_size + high_size = 2. target_low + target_high = 3.
  
  Wait! The total is 2, not 3! I made an error.
  
  Let me recheck. After window 2 processing:
  - After clean_low in window 2: low_size went from 2 to 1 (we popped the lazy-deleted element).
  
  OH! That's the issue. The clean_low() call in the median computation step reduced low_size. But then in the next iteration, we start with low_size = 1, high_size = 1, total = 2 ≠ k = 3.
  
  Wait no. Let me retrace more carefully.
  
  After initialization:
  low_size = 2, high_size = 1. Total = 3. ✓
  
  Window 2 (i=1):
  - out_val = nums[0] = 1
  - clean_low(): low[0] = -1, remove_low[1] = 0. No change.
  - clean_high(): high[0] = 3, remove_high[3] = 0. No change.
  - 1 <= -low[0] = 1. remove_low[1] = 1. low_size = 1.
  - in_val = nums[3] = -3
  - clean_low(): low[0] = -1, remove_low[1] = 1. Pop -1. low_size = 0.
    Wait! I'm calling clean_low before checking where to put in_val. Let me re-examine my code.
  
  In my code:
  ```
  # Determine which heap out_val belongs to
  clean_low()
  clean_high()
  if out_val <= -low[0]:
      remove_low[out_val] += 1
      low_size -= 1
  else:
      remove_high[out_val] += 1
      high_size -= 1
  
  # Add in_val
  clean_low()
  clean_high()
  if in_val <= -low[0]:
      heapq.heappush(low, -in_val)
      low_size += 1
  else:
      heapq.heappush(high, in_val)
      high_size += 1
  ```
  
  So in window 2:
  - clean_low(): low[0] = -1, remove_low[1] = 0. No pop.
  - clean_high(): No pop.
  - out_val = 1 <= -low[0] = 1. remove_low[1] = 1. low_size = 1.
  - clean_low(): low[0] = -1, remove_low[1] = 1. Pop -1! low_size = 0.
    low heap was [-1, 1], now it's [1].
  - clean_high(): No pop.
  - in_val = -3. -low[0] = -1. -3 <= -1. Push -(-3) = 3 to low. low_size = 1.
    low heap: [1, 3]
  - rebalance: target_low = 2, target_high = 1. low_size = 1, high_size = 1.
    low_size > target_low? 1 > 2? No.
    high_size > target_high? 1 > 1? No.
  
  But we need low_size = 2! The total is 2, not 3!
  
  The problem: when I called clean_low() after marking the removal, it actually popped the element, reducing low_size. But I had already decremented low_size for the logical removal. So I double-counted!
  
  This is the bug. When I do `remove_low[out_val] += 1; low_size -= 1`, I'm saying "logically, low lost one element." But then when clean_low() actually pops it, I decrement low_size again.
  
  I need to fix this. The lazy deletion counter and the size tracking are conflicting.
  
  Option 1: Don't decrement size when marking for removal. Only decrement when actually popping in clean.
  Option 2: Don't decrement size in clean, only when marking.
  
  Let me go with Option 1:
  - When marking for removal: just increment the counter. Don't change size.
  - When clean actually pops: decrement size.
  
  But then the size doesn't reflect the "effective" size until we clean. The rebalance needs to use effective sizes.
  
  Hmm, this is getting complicated. Let me think of another approach.
  
  Alternative: Don't track sizes separately. Just track the "logical" size (number of elements that should be in each heap) and use clean to maintain the actual heap.
  
  Actually, let me reconsider. The standard approach for this problem:
  
  1. Track `low_size` and `high_size` as the "logical" sizes (what they should be, not counting lazy deletions).
  2. When we "remove" an element, we increment the lazy deletion counter AND decrement the logical size.
  3. When we "add" an element, we push to the heap AND increment the logical size.
  4. clean() pops elements from the heap top if they're marked for deletion, but does NOT change the logical size (because the logical size was already decremented when we marked the deletion).
  
  Wait, that doesn't work either. If I decrement logical size when marking, and clean pops without changing logical size, then the logical size correctly reflects the effective size.
  
  Let me re-examine:
  - Initially: low_size = 2, high_size = 1.
  - Remove out_val from low: remove_low[out_val] += 1, low_size -= 1. Now low_size = 1.
  - clean_low(): pops the element. low_size stays at 1. (The logical size is 1, and the heap now has 1 effective element.)
  - Add in_val to low: push to heap, low_size += 1. Now low_size = 2.
  
  This works! The key insight: clean() should NOT modify low_size/high_size. The size is only modified when we logically add or remove.
  
  Let me redo my code with this fix:
  
  ```python
  def clean_low():
      while low and remove_low[-low[0]] > 0:
          remove_low[-low[0]] -= 1
          heapq.heappop(low)
      # Do NOT change low_size here
  
  def clean_high():
      while high and remove_high[high[0]] > 0:
          remove_high[high[0]] -= 1
          heapq.heappop(high)
      # Do NOT change high_size here
  ```
  
  And in the main loop:
  ```python
  # Remove
  if out_val <= -low[0]:
      remove_low[out_val] += 1
      low_size -= 1
  else:
      remove_high[out_val] += 1
      high_size -= 1
  
  # Add
  if in_val <= -low[0]:
      heapq.heappush(low, -in_val)
      low_size += 1
  else:
      heapq.heappush(high, in_val)
      high_size += 1
  ```
  
  Let me retrace window 2:
  - Initial: low_size = 2, high_size = 1. low = [-1, 1], high = [3].
  - clean_low: no change. clean_high: no change.
  - out_val = 1 <= -low[0] = 1. remove_low[1] = 1. low_size = 1.
  - clean_low: low[0] = -1, remove_low[1] = 1. Pop -1. low = [1]. (low_size still 1)
  - clean_high: no change.
  - in_val = -3 <= -low[0] = -1. Push 3 to low. low = [1, 3]. low_size = 2.
  - rebalance: target_low = 2, target_high = 1. low_size = 2, high_size = 1. OK!
  - clean_low: low[0] = 1. remove_low[1] = 0. No pop.
  - clean_high: no change.
  - Median: -low[0] = -1. ✓
  
  Window 3:
  - Initial: low_size = 2, high_size = 1. low = [1, 3], high = [3].
  - clean_low: low[0] = 1. remove_low[1] = 0. No pop.
  - clean_high: high[0] = 3. remove_high[3] = 0. No pop.
  - out_val = 3. -low[0] = 1. 3 > 1. remove_high[3] = 1. high_size = 0.
  - clean_low: no change.
  - clean_high: high[0] = 3. remove_high[3] = 1. Pop 3. high = []. (high_size still 0)
  - in_val = 3. -low[0] = 1. 3 > 1. Push 3 to high. high = [3]. high_size = 1.
  - rebalance: target_low = 2, target_high = 1. low_size = 2, high_size = 1. OK!
  - clean_low: no change.
  - clean_high: high[0] = 3. remove_high[3] = 0. No pop.
  - Median: -low[0] = 1.
  
  But the expected median for window [-1, -3, 3] is -1! Let me check.
  Window 3 is nums[2:5] = [-1, -3, 3]. Sorted: [-3, -1, 3]. Median = -1.
  
  But I got 1. Something is wrong.
  
  Let me check the heaps. low = [1, 3] represents values {-1, -3}? No!
  
  Wait, I'm confusing myself. low stores negated values. So:
  - If low contains 1, the actual value is -1.
  - If low contains 3, the actual value is -3.
  
  So low = [1, 3] represents values {-1, -3}. The max of these is -1, which is -low[0] = -1.
  
  Wait, low[0] = 1 (the min of the negated values). -low[0] = -1. That's the max of the actual values in low. ✓
  
  high = [3] represents value {3}.
  
  So the combined set is {-1, -3, 3}. Sorted: [-3, -1, 3]. Median = -1.
  
  And -low[0] = -1. ✓!
  
  I made an arithmetic error earlier. -low[0] = -(1) = -1, not 1. Let me recheck.
  
  low = [1, 3]. The min-heap top is 1. -low[0] = -1. Yes!
  
  So the median is -1. ✓
  
  Great, I was confusing myself. The code is correct.
  
  Let me also verify window 4: nums[3:6] = [-3, 3, 3]. Sorted: [-3, 3, 3]. Median = 3.
  
  Window 4 (i=3):
  - Initial: low_size = 2, high_size = 1. low = [1, 3], high = [3].
  - clean_low: low[0] = 1. remove_low[1] = 0. No pop.
  - clean_high: high[0] = 3. remove_high[3] = 0. No pop.
  - out_val = nums[2] = -1. -low[0] = -1. -1 <= -1. remove_low[-1] = 1. low_size = 1.
  - clean_low: low[0] = 1. remove_low[1] = 0. No pop.
    Wait, remove_low[-1] was set, but low[0] = 1, so -low[0] = -1. remove_low[-1] = 1. 
    Hmm, I'm checking `remove_low[-low[0]]`. -low[0] = -1. remove_low[-1] = 1. So we pop!
    Pop 1 from low. low = [3]. (low_size still 1)
  - clean_high: no change.
  - in_val = nums[5] = 3. -low[0] = -3. 3 > -3. Push 3 to high. high = [3, 3]. high_size = 2.
  - rebalance: target_low = 2, target_high = 1. low_size = 1, high_size = 2.
    low_size > target_low? 1 > 2? No.
    high_size > target_high? 2 > 1? Yes!
    clean_high: high[0] = 3. remove_high[3] = 0. No pop.
    Pop 3 from high. high = [3]. high_size = 1.
    Push -3 to low. low = [-3, 3]. low_size = 2.
  - clean_low: low[0] = -3. remove_low[3] = 0. No pop.
  - clean_high: high[0] = 3. remove_high[3] = 0. No pop.
  - Median: -low[0] = -(-3) = 3. ✓
  
  Window 5: nums[4:7] = [3, 3, 3]. Median = 3.
  
  Window 5 (i=4):
  - Initial: low_size = 2, high_size = 1. low = [-3, 3], high = [3].
  - clean_low: low[0] = -3. remove_low[3] = 0. No pop.
  - clean_high: high[0] = 3. remove_high[3] = 0. No pop.
  - out_val = nums[3] = -3. -low[0] = 3. -3 <= 3. remove_low[-3] = 1. low_size = 1.
  - clean_low: low[0] = -3. remove_low[3] = 0. No pop.
    Wait, -low[0] = -(-3) = 3. remove_low[3] = 0. No pop. Correct.
  - clean_high: no change.
  - in_val = nums[6] = 3. -low[0] = 3. 3 <= 3. Push -3 to low. low = [-3, 3, -3]. low_size = 2.
    Hmm, low now has [-3, 3, -3]. The heap property: min is -3.
  - rebalance: target_low = 2, target_high = 1. low_size = 2, high_size = 1. OK.
  - clean_low: low[0] = -3. remove_low[3] = 0. No pop.
  - clean_high: no change.
  - Median: -low[0] = 3. ✓
  
  All checks pass. The code is correct.
  
  Now let me also think about the edge case where `low` could be empty when we try to access `low[0]`. Since we always maintain at least target_low elements in low (which is at least 1 for k >= 1), and clean only removes lazy-deleted elements, low should never be empty when we access low[0].
  
  Actually wait, could clean_low() empty the heap? If all elements in low are marked for deletion... but that can't happen because we only mark one element for deletion per window, and we add one element per window. The heap can't be fully deleted.
  
  Let me also handle the case where k = 1 separately for efficiency (just return the list).
  
  Let me write the final clean version:
  
```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max-heap via negation
    high = []  # min-heap
    remove_low = defaultdict(int)
    remove_high = defaultdict(int)
    low_size = 0
    high_size = 0
    
    def clean_low():
        while low and remove_low[-low[0]] > 0:
            remove_low[-low[0]] -= 1
            heapq.heappop(low)
    
    def clean_high():
        while high and remove_high[high[0]] > 0:
            remove_high[high[0]] -= 1
            heapq.heappop(high)
    
    def rebalance():
        nonlocal low_size, high_size
        if k % 2 == 1:
            target_low = (k + 1) // 2
            target_high = k // 2
        else:
            target_low = k // 2
            target_high = k // 2
        
        while low_size > target_low:
            clean_low()
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        
        while high_size > target_high:
            clean_high()
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
    
    # Initialize first window
    for i in range(k):
        heapq.heappush(low, -nums[i])
        low_size += 1
    
    # Move k//2 elements from low to high
    for _ in range(k // 2):
        clean_low()
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1
    
    results = []
    
    clean_low()
    clean_high()
    if k % 2 == 1:
        results.append(float(-low[0]))
    else:
        results.append((-low[0] + high[0]) / 2.0)
    
    for i in range(1, n - k + 1):
        out_val = nums[i - 1]
        in_val = nums[i + k - 1]
        
        clean_low()
        clean_high()
        
        if out_val <= -low[0]:
            remove_low[out_val] += 1
            low_size -= 1
        else:
            remove_high[out_val] += 1
            high_size -= 1
        
        clean_low()
        clean_high()
        
        if in_val <= -low[0]:
            heapq.heappush(low, -in_val)
            low_size += 1
        else:
            heapq.heappush(high, in_val)
            high_size += 1
        
        rebalance()
        
        clean_low()
        clean_high()
        
        if k % 2 == 1:
            results.append(float(-low[0]))
        else:
            results.append((-low[0] + high[0]) / 2.0)
    
    return results
```

Wait, I need to double-check the rebalance. In the rebalance, when I pop from low and push to high, I'm doing:
```
val = -heapq.heappop(low)
low_size -= 1
heapq.heappush(high, val)
high_size += 1
```

This changes the logical sizes. But wait, the element I'm popping might be a lazy-deleted element! I call clean_low() first, so the top should be a valid element. Good.

But there's another subtlety: when I pop from low in rebalance, I'm actually removing a valid element from low and putting it in high. The logical sizes change correctly.

I think this is correct. Let me also consider: what if during rebalance, after clean_low(), the heap is empty? This shouldn't happen because low_size > target_low >= 1 (for k >= 1), so there's at least one valid element in low.

Actually, for k=2: target_low = 1, target_high = 1. If low_size = 2 > 1, we pop one. After clean, there should be at least 1 valid element (since low_size = 2 means 2 valid elements, and we just popped one, leaving 1).

I'm satisfied this is correct. Let me also make sure the return type is list[float]. All values are already floats since nums is list[float]. The operations (-low[0], high[0], division) all produce floats.

One more thought: for the `float(-low[0])` in the odd case, since nums is list[float], -low[0] is already a float. The `float()` call is redundant but harmless. I'll keep it for clarity.

Actually, I realize I should double-check: what if nums contains integers? The type hint says list[float], so I'll trust that. But even if they're ints, the operations will produce floats where needed (division by 2.0 gives float).

I think the solution is complete and correct. Let me finalize it.
