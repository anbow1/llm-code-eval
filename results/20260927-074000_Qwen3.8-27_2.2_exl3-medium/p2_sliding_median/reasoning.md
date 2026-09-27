The user wants a `sliding_median` function that computes the median of every sliding window of size k over a list of floats.

Requirements:
1. Returns a list of floats - the median of each window of size k
2. For even k, median is the mean of the two middle values
3. Raise ValueError if k < 1 or k > len(nums)
4. Must be efficient: n = 200,000 with k = 1,000 must finish in well under 2 seconds

Let me think about the approach:

For a sliding window of size k, I need to maintain the median as the window slides. The classic approach is to use two heaps (a max-heap for the lower half and a min-heap for the upper half) to maintain the median in O(log k) per operation.

With n = 200,000 and k = 1,000, we have 199,001 windows. Each window operation should be O(log k), so total is O(n log k) which is about 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. That should be well under 2 seconds.

The two-heap approach:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- The max-heap contains the lower half of elements, the min-heap contains the upper half
- For odd k: max-heap has (k+1)//2 elements, min-heap has k//2 elements
- For even k: both heaps have k//2 elements

Actually, let me think more carefully. For a window of size k:
- If k is odd: median is the middle element. Lower heap has (k+1)//2 elements, upper heap has k//2 elements.
- If k is even: median is the mean of the two middle elements. Lower heap has k//2 elements, upper heap has k//2 elements.

So in general:
- lower heap (max-heap) should have (k+1)//2 elements
- upper heap (min-heap) should have k//2 elements

Wait, let me reconsider. For k even, we want the two middle values. The lower half has k//2 elements, the upper half has k//2 elements. The median is (max of lower + min of upper) / 2.

For k odd, the lower half has (k+1)//2 elements, the upper half has k//2 elements. The median is the max of the lower heap.

Let me use a max-heap for the lower half (negate values) and a min-heap for the upper half.

The tricky part is handling removals when the window slides. When we remove an element, we need to know which heap it's in. We can use a "lazy deletion" approach or track which heap each element belongs to.

Actually, a cleaner approach: use two heaps with lazy deletion.

Let me think about this more carefully:

Approach: Two heaps with lazy deletion
- `lower`: max-heap (using negative values, so it's a min-heap of negated values)
- `upper`: min-heap
- `lower_count`: number of valid elements in lower
- `upper_count`: number of valid elements in upper
- `removed_lower`: set of values to remove from lower (lazy)
- `removed_upper`: set of values to remove from upper

When adding a new element:
- If it belongs in lower (it's <= max of lower), add to lower
- Otherwise add to upper
- Then rebalance

When removing an element:
- Mark it as removed in the appropriate heap
- If it's in lower, decrement lower_count
- If it's in upper, decrement upper_count
- Then rebalance

Rebalancing:
- Ensure lower has (k+1)//2 elements and upper has k//2 elements
- If lower has too many, move max of lower to upper
- If upper has too many, move min of upper to lower

The tricky part with lazy deletion: when we pop from a heap, we might get a value that's marked as removed. We need to skip those.

Let me code this up:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    # lower: max-heap (store negated values)
    # upper: min-heap
    lower = []  # max-heap via negation
    upper = []  # min-heap
    lower_count = 0
    upper_count = 0
    removed_lower = set()
    removed_upper = set()
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    def clean_lower():
        while lower and -lower[0] in removed_lower:
            heapq.heappop(lower)
            removed_lower.remove(-lower[0])  # wait, this is wrong
    
    # Actually, let me think about this differently.
    # When we pop from lower, the top is -lower[0]. If that value is in removed_lower, we pop it and remove from the set.
    
    def clean_lower():
        while lower:
            val = -lower[0]
            if val in removed_lower:
                heapq.heappop(lower)
                removed_lower.remove(val)
            else:
                break
    
    def clean_upper():
        while upper:
            val = upper[0]
            if val in removed_upper:
                heapq.heappop(upper)
                removed_upper.remove(val)
            else:
                break
    
    def rebalance():
        # Move elements to achieve target sizes
        while lower_count > target_lower:
            # Move max of lower to upper
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
        
        while upper_count > target_upper:
            # Move min of upper to lower
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        
        while lower_count < target_lower:
            # Move min of upper to lower
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        
        while upper_count < target_upper:
            # Move max of lower to upper
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
    
    result = []
    
    # Initialize first window
    for i in range(k):
        val = nums[i]
        if lower_count < target_lower and (not lower or val <= -lower[0]):
            heapq.heappush(lower, -val)
            lower_count += 1
        else:
            heapq.heappush(upper, val)
            upper_count += 1
        rebalance()
    
    # Get median of first window
    clean_lower()
    clean_upper()
    if k % 2 == 1:
        result.append(-lower[0])
    else:
        result.append((-lower[0] + upper[0]) / 2.0)
    
    # Slide window
    for i in range(k, n):
        # Remove nums[i-k]
        old_val = nums[i-k]
        # Determine which heap it's in
        # If it's in lower: old_val <= -lower[0] (or it's the top)
        # Actually, we need to figure out which heap it belongs to
        # Simple heuristic: if old_val <= -lower[0], it's in lower; else in upper
        # But this isn't always correct if the element was moved during rebalancing
        
        # Better approach: use the fact that all elements in lower are <= all elements in upper
        # So if old_val <= -lower[0], it must be in lower
        # If old_val > -lower[0], it must be in upper
        # But what if old_val == -lower[0]? It could be in either.
        
        # Hmm, this is the tricky part. Let me think...
        
        # Actually, the invariant is: all elements in lower <= all elements in upper.
        # So if old_val < -lower[0], it's definitely in lower.
        # If old_val > upper[0], it's definitely in upper.
        # If -lower[0] <= old_val <= upper[0], it could be in either.
        
        # For the ambiguous case, we can check: if old_val == -lower[0], it's in lower (since all upper >= lower max).
        # If old_val == upper[0], it's in upper.
        
        # Wait, the invariant is: max(lower) <= min(upper). So:
        # - If old_val <= max(lower) = -lower[0], it's in lower
        # - If old_val >= min(upper) = upper[0], it's in upper
        # - If -lower[0] < old_val < upper[0], this shouldn't happen given the invariant
        
        # Actually wait, the invariant is max(lower) <= min(upper). So:
        # - old_val <= -lower[0] means it's in lower
        # - old_val >= upper[0] means it's in upper
        # - If -lower[0] < old_val < upper[0], this is impossible given the invariant
        
        # But what about duplicates? If old_val == -lower[0] and also old_val == upper[0], it could be in either.
        # In that case, we can just pick one. Let's say if old_val <= -lower[0], it's in lower.
        
        if old_val <= -lower[0]:
            removed_lower.add(old_val)
            lower_count -= 1
        else:
            removed_upper.add(old_val)
            upper_count -= 1
        
        # Add new element
        new_val = nums[i]
        if lower_count < target_lower and (not lower or new_val <= -lower[0]):
            heapq.heappush(lower, -val)  # BUG: should be -new_val
            lower_count += 1
        else:
            heapq.heappush(upper, new_val)
            upper_count += 1
        
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 1:
            result.append(-lower[0])
        else:
            result.append((-lower[0] + upper[0]) / 2.0)
    
    return result
```

Wait, I have a bug. Let me be more careful.

Also, I need to think about edge cases:
- k = 1: each window is just one element, median is that element
- The "determine which heap" logic needs to be correct

Let me reconsider the "which heap" logic:
- The invariant is: all elements in lower <= all elements in upper
- So max(lower) <= min(upper)
- If old_val <= max(lower), it's in lower
- If old_val >= min(upper), it's in upper
- The boundary case: if max(lower) == min(upper), and old_val equals that value, it could be in either

For the boundary case, I'll say: if old_val <= -lower[0], it's in lower. This works because:
- If old_val < -lower[0], it's definitely in lower
- If old_val == -lower[0], it's in lower (by our convention)
- If old_val > -lower[0], since the invariant says max(lower) <= min(upper), and old_val > max(lower), it must be in upper

Wait, but what if old_val > -lower[0] but old_val < upper[0]? That violates the invariant, so it shouldn't happen. Unless... hmm.

Actually, the invariant max(lower) <= min(upper) is maintained by the rebalancing. So any element that's not in lower must be >= min(upper) >= max(lower). And any element in lower must be <= max(lower) <= min(upper).

So:
- If old_val <= -lower[0] (i.e., old_val <= max(lower)): it's in lower
- If old_val > -lower[0]: it's in upper (because if it were in lower, it would be <= max(lower) = -lower[0])

This is correct! The only issue is when -lower[0] == upper[0] and old_val equals that value. In that case, old_val <= -lower[0] is true, so we say it's in lower. That's fine.

But wait, what if the heap is empty? If lower_count == 0, then lower might be empty (or have lazy-deleted elements). Let me handle that.

Actually, with k >= 1, target_lower >= 1, so lower should always have at least 1 valid element. So -lower[0] should always be valid after cleaning.

Let me also handle the case where k = 1: target_lower = 1, target_upper = 0. So all elements go to lower.

Let me rewrite more carefully:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    lower_count = 0
    upper_count = 0
    removed_lower = set()
    removed_upper = set()
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    def clean_lower():
        while lower:
            val = -lower[0]
            if val in removed_lower:
                heapq.heappop(lower)
                removed_lower.remove(val)
            else:
                break
    
    def clean_upper():
        while upper:
            val = upper[0]
            if val in removed_upper:
                heapq.heappop(upper)
                removed_upper.remove(val)
            else:
                break
    
    def rebalance():
        while lower_count > target_lower:
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
        while upper_count > target_upper:
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        while lower_count < target_lower:
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        while upper_count < target_upper:
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
    
    result = []
    
    # Build initial window
    for i in range(k):
        val = nums[i]
        if lower_count < target_lower and (not lower or val <= -lower[0]):
            heapq.heappush(lower, -val)
            lower_count += 1
        else:
            heapq.heappush(upper, val)
            upper_count += 1
        rebalance()
    
    clean_lower()
    clean_upper()
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append(float((-lower[0] + upper[0]) / 2.0))
    
    # Slide
    for i in range(k, n):
        old_val = nums[i - k]
        
        # Remove old_val
        clean_lower()
        clean_upper()
        if old_val <= -lower[0]:
            removed_lower.add(old_val)
            lower_count -= 1
        else:
            removed_upper.add(old_val)
            upper_count -= 1
        
        # Add new_val
        new_val = nums[i]
        clean_lower()
        clean_upper()
        if lower_count < target_lower and (not lower or new_val <= -lower[0]):
            heapq.heappush(lower, -new_val)
            lower_count += 1
        else:
            heapq.heappush(upper, new_val)
            upper_count += 1
        
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append(float((-lower[0] + upper[0]) / 2.0))
    
    return result
```

Wait, there's a subtlety. When I add a new element, I check `lower_count < target_lower`. But after removing the old element, lower_count might be less than target_lower. Let me trace through:

After removing old_val:
- If old_val was in lower: lower_count decreases by 1
- If old_val was in upper: upper_count decreases by 1

Then we add new_val:
- If lower_count < target_lower and new_val <= -lower[0]: add to lower
- Else: add to upper

Then rebalance to restore target sizes.

This should work. Let me trace a simple example:
- nums = [1, 2, 3, 4, 5], k = 3
- target_lower = 2, target_upper = 1

Initial window [1, 2, 3]:
- Add 1: lower_count=0 < 2, lower empty → add to lower. lower=[-1], lower_count=1
- Add 2: lower_count=1 < 2, 2 <= -(-1)=1? No, 2 > 1. Add to upper. upper=[2], upper_count=1
- rebalance: lower_count=1 < 2, move from upper to lower. Pop 2 from upper, push -2 to lower. lower=[-1,-2], lower_count=2, upper_count=0
  Wait, that's wrong. The max-heap of lower should have the larger elements. Let me re-think.

Actually, in a max-heap using negation:
- lower = [-2, -1] means the heap stores -2 and -1, and the top (min of negated) is -2, which represents value 2. So max(lower) = 2.
- This is correct: lower contains {1, 2}, max is 2.

So after rebalancing: lower=[-2, -1] (max-heap, top is -2 representing value 2), upper=[] (empty)
lower_count=2, upper_count=0. target_lower=2, target_upper=1.
upper_count < target_upper, so move from lower to upper.
Pop -2 from lower (value 2), push 2 to upper. lower=[-1], lower_count=1, upper=[2], upper_count=1.

Now lower_count=1 < target_lower=2. Move from upper to lower.
Pop 2 from upper, push -2 to lower. lower=[-1, -2], lower_count=2, upper=[], upper_count=0.

Hmm, we're oscillating. The issue is that with k=3, target_lower=2, target_upper=1. We need 2 in lower and 1 in upper.

Let me redo:
- Add 1: lower_count=0 < 2, lower empty → add to lower. lower=[-1], lower_count=1
- Add 2: lower_count=1 < 2, 2 <= -(-1)=1? No. Add to upper. upper=[2], upper_count=1
- rebalance: lower_count=1 < 2. Move from upper to lower. Pop 2, push -2. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
  Now upper_count=0 < 1. Move from lower to upper. Pop -2 (value 2), push 2. lower=[-1], lower_count=1, upper=[2], upper_count=1.
  Now lower_count=1 < 2. Move from upper to lower. Pop 2, push -2. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
  
This is an infinite loop! The problem is that with k=3, we need exactly 2 in lower and 1 in upper, but we only have 3 elements total. After putting 2 in lower and 1 in upper, that's correct. But the rebalance keeps moving things back and forth.

The issue: after moving from upper to lower (to fix lower_count < target_lower), upper_count drops below target_upper. Then we move from lower to upper, which drops lower_count below target_lower again.

The fix: I should only rebalance in one direction at a time, or handle it differently.

Actually, the correct approach is:
- After adding/removing, adjust so that lower has exactly target_lower elements.
- If lower has too many, move excess to upper.
- If lower has too few, move from upper to lower.

The key insight: target_lower + target_upper = k, and we always have exactly k elements total. So if lower has target_lower, upper automatically has target_upper.

So I only need to ensure lower_count == target_lower. Then upper_count = k - lower_count = target_upper automatically.

Let me simplify:

```python
def rebalance():
    while lower_count > target_lower:
        clean_lower()
        val = -heapq.heappop(lower)
        lower_count -= 1
        heapq.heappush(upper, val)
        upper_count += 1
    while lower_count < target_lower:
        clean_upper()
        val = heapq.heappop(upper)
        upper_count -= 1
        heapq.heappush(lower, -val)
        lower_count += 1
```

This is cleaner. We only adjust lower_count to target_lower. Since total is always k, upper_count will automatically be target_upper.

Let me re-trace:
- Add 1: lower_count=0 < 2, lower empty → add to lower. lower=[-1], lower_count=1
- Add 2: lower_count=1 < 2, 2 <= 1? No. Add to upper. upper=[2], upper_count=1
- rebalance: lower_count=1 < 2. Move from upper to lower. Pop 2, push -2. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
  Now lower_count=2 == target_lower. Done.

Median: k=3 (odd), median = -lower[0] = -(-2) = 2. Correct! (median of [1,2,3] is 2)

Slide to [2, 3, 4]:
- Remove 1: 1 <= -lower[0] = -(-2) = 2. Yes. removed_lower.add(1), lower_count=1.
- Add 4: lower_count=1 < 2, 4 <= 2? No. Add to upper. upper=[4], upper_count=1.
- rebalance: lower_count=1 < 2. Move from upper to lower. Pop 4, push -4. lower=[-2,-4,1]... wait, lower was [-1,-2] with lazy deletion of 1.

Hmm, let me be more careful. lower = [-2, -1] (heap). After marking 1 as removed:
- clean_lower: top is -2 (value 2), not in removed_lower. OK.
- lower_count = 1 (after removal)
- Add 4: 4 <= -lower[0] = 2? No. Add to upper. upper=[4], upper_count=1.
- rebalance: lower_count=1 < 2. Move from upper to lower. Pop 4 from upper, push -4 to lower. lower=[-2,-1,-4], lower_count=2, upper=[], upper_count=0.
- clean_lower: top is -4 (value 4), not in removed_lower. OK.

Median: -lower[0] = -(-4) = 4. Correct! (median of [2,3,4] is 3... wait, no. Median of [2,3,4] is 3.)

Hmm, that's wrong. Let me re-check.

lower should contain the 2 smallest elements: {2, 3}. upper should contain the 1 largest: {4}.

But I have lower = {-4, -2, -1} with lazy deletion of 1. After cleaning, lower = {-4, -2}. The max of lower is 4? No wait, -lower[0] where lower[0] is the minimum of the negated heap.

lower = [-4, -2, -1] as a min-heap. The top (minimum) is -4, representing value 4. That's wrong!

The issue: when I push -4 into the lower heap, it becomes the "maximum" in the max-heap sense. But -4 is the smallest in the min-heap of negated values, so it's at the top. That means -lower[0] = 4, which is the maximum of the lower heap. That's correct for a max-heap.

But wait, I want the lower heap to contain the SMALLER elements. If lower contains {2, 3, 4}, the max is 4. But I want lower to contain only the 2 smallest: {2, 3}.

The problem is in my "add" logic. When I add 4 and lower_count < target_lower, I should check if 4 belongs in lower. But 4 is larger than the current max of lower (which is 2 after cleaning). So 4 should go to upper.

Let me re-examine: after removing 1, lower has {2, 3} (but with lazy deletion, the heap might still have 1 in it). lower_count = 1 (valid elements).

Wait, I think I made an error. Let me re-trace more carefully.

Initial window [1, 2, 3]:
- Add 1: lower_count=0 < 2, lower is empty → push -1 to lower. lower=[-1], lower_count=1.
- Add 2: lower_count=1 < 2, 2 <= -lower[0]=1? No (2 > 1). Push 2 to upper. upper=[2], upper_count=1.
- rebalance: lower_count=1 < 2. Pop from upper: val=2. Push -2 to lower. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
  lower_count=2 == target_lower. Done.

State: lower=[-1,-2] (valid: {1,2}), upper=[] (valid: {}), lower_count=2, upper_count=0.
Median (k=3, odd): -lower[0] = -(-2) = 2. ✓

Slide to [2, 3, 4]:
- Remove old_val=1: clean_lower: top is -2 (val=2), not removed. 1 <= -lower[0]=2? Yes. removed_lower.add(1), lower_count=1.
- Add new_val=4: clean_lower: top is -2 (val=2), not removed. lower_count=1 < 2, 4 <= -lower[0]=2? No. Push 4 to upper. upper=[4], upper_count=1.
- rebalance: lower_count=1 < 2. Pop from upper: val=4. Push -4 to lower. lower=[-2,-1,-4], lower_count=2, upper=[], upper_count=0.
  clean_lower: top is -4 (val=4), not in removed_lower. OK.

State: lower=[-4,-2,-1] (valid: {2,4}, since 1 is lazy-deleted), upper=[], lower_count=2, upper_count=0.
Median: -lower[0] = -(-4) = 4. ✗ (should be 3)

The problem: I put 4 in lower, but it should be in upper. The lower heap should contain the 2 smallest elements of {2,3,4}, which are {2,3}. But I only have {2,4} in lower.

The issue is that 3 was already in lower from the initial window, but after removing 1, lower has {2,3} with lower_count=2. Wait, no. Let me re-check.

After initial window: lower=[-1,-2], lower_count=2. The valid elements in lower are {1, 2}.

When I remove 1: lower_count becomes 1. The valid elements in lower are {2}.

When I add 4: lower_count=1 < 2, so I check if 4 <= -lower[0]=2. No. So I add to upper. upper=[4], upper_count=1.

Then rebalance: lower_count=1 < 2. I need to move one element from upper to lower. I pop 4 from upper and push -4 to lower. Now lower has {2, 4} (valid), lower_count=2.

But the correct partition should be: lower={2,3}, upper={4}. The problem is that 3 was already in lower, but I removed 1 (which was also in lower), so lower went from {1,2} to {2}. Then I need to add one more to lower. The next smallest available element is... well, 3 is already in lower! 

Wait, I think I'm confusing myself. Let me re-examine.

After initial window [1,2,3]:
- lower = [-1, -2] (min-heap of negated values), representing values {1, 2}
- upper = []
- lower_count = 2, upper_count = 0

The window is [1, 2, 3]. The median is 2 (the middle of sorted [1,2,3]).
- lower has {1, 2} (the 2 smallest)
- upper has {3} (the 1 largest)

Wait, but upper is empty! That's the bug. After rebalancing, lower_count=2=target_lower, so we stop. But upper_count=0 < target_upper=1.

Ah, I see the issue. My rebalance only adjusts lower_count to target_lower. But after the initial build, we have lower_count=2 and upper_count=0. Since target_lower=2, the rebalance doesn't do anything. But upper_count should be 1.

The total is 3 = lower_count + upper_count = 2 + 0. target_lower + target_upper = 2 + 1 = 3. So if lower_count = target_lower = 2, then upper_count = 3 - 2 = 1. But upper_count is actually 0!

The issue is that during the initial build, I added elements and rebalanced, but the rebalance moved elements from upper to lower, making upper empty. The total is still 3, but the split is wrong.

I think the issue is in my "add" logic. Let me reconsider.

When adding to the initial window:
- Add 1: lower_count=0 < 2, lower empty → add to lower. lower_count=1.
- Add 2: lower_count=1 < 2, 2 <= 1? No → add to upper. upper_count=1.
- rebalance: lower_count=1 < 2 → move from upper to lower. Pop 2, push -2. lower_count=2, upper_count=0.

The problem: after adding 2 to upper, the rebalance immediately moves it back to lower. This is because lower_count < target_lower.

But the correct state after adding all 3 elements should be: lower={1,2}, upper={3}. But I only added 2 elements at this point (1 and 2), and the rebalance moved 2 from upper to lower.

Then I add 3:
- Add 3: lower_count=2, not < 2. 3 <= -lower[0]=2? No. Add to upper. upper=[3], upper_count=1.
- rebalance: lower_count=2 == target_lower. Done.

State: lower=[-1,-2] ({1,2}), upper=[3] ({3}), lower_count=2, upper_count=1. ✓

OK so I was wrong in my earlier trace. Let me redo:

Initial window [1, 2, 3]:
- Add 1: lower_count=0 < 2, lower empty → push -1. lower=[-1], lower_count=1.
- Add 2: lower_count=1 < 2, 2 <= -(-1)=1? No → push 2 to upper. upper=[2], upper_count=1.
- rebalance: lower_count=1 < 2 → pop 2 from upper, push -2 to lower. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
- Add 3: lower_count=2, not < 2. 3 <= -(-2)=2? No → push 3 to upper. upper=[3], upper_count=1.
- rebalance: lower_count=2 == target_lower. Done.

State: lower=[-1,-2] ({1,2}), upper=[3] ({3}), lower_count=2, upper_count=1. ✓
Median: -lower[0] = 2. ✓

Slide to [2, 3, 4]:
- Remove 1: clean_lower: top=-2 (val=2), not removed. 1 <= 2? Yes. removed_lower.add(1), lower_count=1.
- Add 4: clean_lower: top=-2 (val=2), not removed. lower_count=1 < 2, 4 <= 2? No → push 4 to upper. upper=[3,4], upper_count=2.
- rebalance: lower_count=1 < 2 → pop 3 from upper, push -3 to lower. lower=[-2,-1,-3], lower_count=2, upper=[4], upper_count=1.
  clean_lower: top=-3 (val=3), not in removed_lower. OK.

State: lower=[-3,-2,-1] (valid: {2,3}), upper=[4] (valid: {4}), lower_count=2, upper_count=1. ✓
Median: -lower[0] = 3. ✓

Slide to [3, 4, 5]:
- Remove 2: clean_lower: top=-3 (val=3), not removed. 2 <= 3? Yes. removed_lower.add(2), lower_count=1.
- Add 5: clean_lower: top=-3 (val=3), not removed. lower_count=1 < 2, 5 <= 3? No → push 5 to upper. upper=[4,5], upper_count=2.
- rebalance: lower_count=1 < 2 → pop 4 from upper, push -4 to lower. lower=[-3,-2,-1,-4], lower_count=2, upper=[5], upper_count=1.
  clean_lower: top=-4 (val=4), not in removed_lower. OK.

State: lower=[-4,-3,-2,-1] (valid: {3,4}), upper=[5] (valid: {5}), lower_count=2, upper_count=1. ✓
Median: -lower[0] = 4. ✓ (median of [3,4,5] is 4)

Great, it works!

Now let me also check the even k case:
nums = [1, 2, 3, 4], k = 2
target_lower = 1, target_upper = 1

Window [1, 2]:
- Add 1: lower_count=0 < 1, lower empty → push -1. lower=[-1], lower_count=1.
- Add 2: lower_count=1, not < 1. 2 <= -(-1)=1? No → push 2 to upper. upper=[2], upper_count=1.
- rebalance: lower_count=1 == target_lower. Done.

Median: (-lower[0] + upper[0]) / 2 = (1 + 2) / 2 = 1.5. ✓

Window [2, 3]:
- Remove 1: clean_lower: top=-1 (val=1). 1 <= 1? Yes. removed_lower.add(1), lower_count=0.
- Add 3: clean_lower: top=-1 (val=1), in removed_lower! Pop it. lower=[]. clean_lower again: lower empty.
  lower_count=0 < 1, lower empty → push -3. lower=[-3], lower_count=1.
- rebalance: lower_count=1 == target_lower. Done.

State: lower=[-3] ({3}), upper=[2] ({2}), lower_count=1, upper_count=1.
Median: (3 + 2) / 2 = 2.5. ✓ (median of [2,3] is 2.5)

Window [3, 4]:
- Remove 2: clean_lower: top=-3 (val=3). 2 <= 3? Yes. removed_lower.add(2), lower_count=0.
  Wait, 2 is not in lower! Lower has {3}. 2 was in upper.
  
  Hmm, the check is: old_val <= -lower[0]. 2 <= 3? Yes. So I'd mark it as removed from lower. But 2 is actually in upper!

This is the bug! The heuristic "if old_val <= -lower[0, it's in lower" doesn't work when old_val is in upper but happens to be <= max(lower).

Wait, but the invariant says max(lower) <= min(upper). So if old_val is in upper, old_val >= min(upper) >= max(lower) = -lower[0]. So old_val > -lower[0] (or old_val == -lower[0] if there are duplicates).

In this case: lower={3}, upper={2}. max(lower)=3, min(upper)=2. But 3 > 2, which violates the invariant!

The invariant is broken! How did it get broken?

Let me re-trace:
Window [1, 2]:
- lower={1}, upper={2}. max(lower)=1, min(upper)=2. 1 <= 2. ✓

Remove 1, add 3:
- Remove 1: 1 <= -lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
- Add 3: lower_count=0 < 1, lower is effectively empty (after cleaning). Push -3. lower=[-3], lower_count=1.
- rebalance: lower_count=1 == target_lower. Done.

State: lower={3}, upper={2}. max(lower)=3, min(upper)=2. 3 > 2. ✗ Invariant broken!

The problem: when I remove 1 from lower, lower becomes empty. Then I add 3 to lower (because lower_count < target_lower). But 3 > 2 (which is in upper). The invariant is violated.

The fix: when adding a new element, I should always add it to the correct heap based on its value relative to the current heaps, not just based on lower_count.

Better approach: 
- If new_val <= max(lower) (i.e., new_val <= -lower[0]), add to lower.
- Otherwise, add to upper.
- Then rebalance.

But what if lower is empty? Then everything goes to lower initially, and rebalance will fix it.

Actually, let me reconsider. The standard approach for sliding window median with two heaps:

1. Add new element:
   - If it's <= max(lower), add to lower
   - Else, add to upper
2. Remove old element:
   - If it's <= max(lower), remove from lower
   - Else, remove from upper
3. Rebalance: ensure lower has (k+1)//2 elements

The key insight: the invariant max(lower) <= min(upper) must be maintained. After step 1 and 2, the invariant might be temporarily violated, and step 3 fixes it.

But wait, in my trace above, after removing 1 and adding 3:
- lower was {1}, became {} (after removing 1)
- upper was {2}
- Add 3: 3 <= max(lower)? lower is empty, so... what's max(lower)?

If lower is empty, I should add to lower (or upper, doesn't matter since we'll rebalance). Let's say we add to lower.
- lower = {3}, upper = {2}
- Rebalance: lower_count=1, target_lower=1. OK.
- But invariant is violated: 3 > 2.

The issue is that after removing an element from lower, lower might become "too small" and we add a new element to lower, but that element might be larger than elements in upper.

The fix: when adding, always compare with the boundary. If lower is empty, add to lower. Then rebalance should also ensure the invariant.

Actually, I think the proper rebalance should be:
1. Ensure lower_count == target_lower
2. Ensure max(lower) <= min(upper)

Step 2: if max(lower) > min(upper), swap them.

Let me add this to the rebalance:

```python
def rebalance():
    # Ensure correct sizes
    while lower_count > target_lower:
        clean_lower()
        val = -heapq.heappop(lower)
        lower_count -= 1
        heapq.heappush(upper, val)
        upper_count += 1
    while lower_count < target_lower:
        clean_upper()
        val = heapq.heappop(upper)
        upper_count -= 1
        heapq.heappush(lower, -val)
        lower_count += 1
    
    # Ensure invariant: max(lower) <= min(upper)
    clean_lower()
    clean_upper()
    if lower and upper and -lower[0] > upper[0]:
        # Swap: move max of lower to upper, min of upper to lower
        a = -heapq.heappop(lower)
        lower_count -= 1
        b = heapq.heappop(upper)
        upper_count -= 1
        heapq.heappush(lower, -b)
        heapq.heappush(upper, a)
```

Wait, but this swap changes the sizes. If lower has target_lower elements and upper has target_upper, after the swap they still have the same sizes. Good.

Let me re-trace the problematic case:
Window [1, 2] → [2, 3]:
- Remove 1: 1 <= -lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
- Add 3: lower_count=0 < 1, lower empty (after cleaning). Push -3. lower=[-3], lower_count=1.
- rebalance: lower_count=1 == target_lower=1. OK.
  Invariant check: -lower[0]=3, upper[0]=2. 3 > 2. Swap!
  a = -heappop(lower) = 3. lower=[]. lower_count=0.
  b = heappop(upper) = 2. upper=[]. upper_count=0.
  heappush(lower, -2). lower=[-2]. 
  heappush(upper, 3). upper=[3].
  lower_count=1, upper_count=1.

State: lower={2}, upper={3}. max(lower)=2, min(upper)=3. 2 <= 3. ✓
Median: (2 + 3) / 2 = 2.5. ✓

This works! But I need to be careful: the swap should only happen if both heaps are non-empty.

Also, I need to make sure the clean functions are called before checking the invariant.

Let me also think about whether the swap could be needed multiple times. After one swap, max(lower) should be <= min(upper) because we moved the max of lower to upper and the min of upper to lower. The new max of lower is at most the old min of upper (which is b), and the new min of upper is at least the old max of lower (which is a). Wait, that's not quite right.

After swap:
- lower's new max <= b (since b was min of upper, and all other elements in lower were <= a = old max of lower, and b < a... wait, b = min(upper) and a = max(lower), and a > b. So b < a.
- After swap: lower contains all old lower elements except a, plus b. New max of lower = max(old lower without a, b). Since old lower without a has max <= a, and b < a, new max <= a.
- upper contains all old upper elements except b, plus a. New min of upper = min(old upper without b, a). Since old upper without b has min >= b, and a > b, new min >= b.

Hmm, that doesn't guarantee new max(lower) <= new min(upper). Let me think of a counterexample.

lower = {5, 1}, upper = {3, 4}. max(lower)=5, min(upper)=3. 5 > 3.
Swap: a=5, b=3.
lower = {1, 3}, upper = {4, 5}. max(lower)=3, min(upper)=4. 3 <= 4. ✓

Another: lower = {5, 4}, upper = {3, 2}. max(lower)=5, min(upper)=2. 5 > 2.
Swap: a=5, b=2.
lower = {4, 2}, upper = {3, 5}. max(lower)=4, min(upper)=3. 4 > 3. ✗

Hmm, that's still violated! So one swap isn't enough.

Wait, but can this state actually occur? The invariant before the swap was violated (5 > 2). After the swap, it's still violated (4 > 3). We'd need another swap.

But actually, in our algorithm, the invariant should be maintained after each operation. Let me think about when the invariant can be violated.

The invariant is: all elements in lower <= all elements in upper. This means max(lower) <= min(upper).

When does it get violated?
1. When we add an element to lower that's larger than min(upper): this happens when lower is empty or when the element is <= max(lower) but > min(upper). Wait, if element <= max(lower) and max(lower) <= min(upper), then element <= min(upper). So adding to lower maintains the invariant.
   
   But if lower is empty, we add to lower unconditionally. Then the element might be > min(upper).

2. When we remove an element from lower, the remaining elements in lower are still <= all elements in upper (since we removed the smallest or some element, the max of lower can only decrease or stay the same). So removal from lower maintains the invariant.

3. When we remove an element from upper, the remaining elements in upper are still >= all elements in lower (since we removed the smallest or some element, the min of upper can only increase or stay the same). So removal from upper maintains the invariant.

So the only case where the invariant can be violated is when lower is empty and we add to lower. In that case, the new element might be > min(upper).

After adding to empty lower, we rebalance. The rebalance moves elements between heaps to achieve the correct sizes. During this process, the invariant might be temporarily violated.

Actually, I think the simplest fix is: after all operations (add, remove, rebalance), ensure the invariant by doing swaps until max(lower) <= min(upper).

But in practice, I think one swap is enough in most cases. Let me think about when multiple swaps are needed...

Actually, let me reconsider. The rebalance moves elements between heaps. When moving from upper to lower (to increase lower_count), we move the min of upper to lower. This maintains the invariant (the moved element is >= max(lower) before the move... wait, no. The min of upper is >= max(lower) by the invariant. So moving it to lower gives a new max(lower) that's the old min(upper), which is >= old max(lower). And the new min(upper) is >= old min(upper) >= old max(lower). So the invariant is maintained.

When moving from lower to upper (to decrease lower_count), we move the max of lower to upper. The max of lower is <= min(upper) by the invariant. So moving it to upper gives a new min(upper) that's the old max(lower), which is <= old min(upper). And the new max(lower) is <= old max(lower) <= old min(upper). So the invariant is maintained.

So the rebalance itself maintains the invariant (assuming it was valid before). The only issue is when lower is empty and we add to it.

Let me handle this: if lower is empty (after cleaning) and we're adding a new element, we should add it to upper instead, then rebalance will move it to lower if needed.

Actually, a simpler approach: always add to upper first, then rebalance. The rebalance will move elements from upper to lower as needed.

Let me restructure:

```python
def add(val):
    heapq.heappush(upper, val)
    upper_count += 1
    rebalance()

def remove(val):
    if lower and -lower[0] >= val:  # val is in lower
        removed_lower.add(val)
        lower_count -= 1
    else:
        removed_upper.add(val)
        upper_count -= 1
    rebalance()
```

Wait, but the check for "val is in lower" should be: val <= max(lower) = -lower[0]. If lower is empty, val must be in upper.

Hmm, but if lower is empty, -lower[0] doesn't exist. Let me handle that:

```python
def remove(val):
    if lower_count > 0 and val <= -lower[0]:
        removed_lower.add(val)
        lower_count -= 1
    else:
        removed_upper.add(val)
        upper_count -= 1
    rebalance()
```

And for add:
```python
def add(val):
    heapq.heappush(upper, val)
    upper_count += 1
    rebalance()
```

The rebalance will handle moving elements from upper to lower as needed.

Let me re-trace the problematic case:
Window [1, 2] → [2, 3]:
- Remove 1: lower_count=1 > 0, 1 <= -lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
  rebalance: lower_count=0 < target_lower=1. Pop from upper: val=2. Push -2 to lower. lower=[-2], lower_count=1, upper=[], upper_count=0.
  Invariant: -lower[0]=2, upper empty. OK (no violation since upper is empty).
  
- Add 3: push 3 to upper. upper=[3], upper_count=1.
  rebalance: lower_count=1 == target_lower=1. OK.
  Invariant: -lower[0]=2, upper[0]=3. 2 <= 3. ✓

State: lower={2}, upper={3}. Median: (2+3)/2 = 2.5. ✓

Let me also check: what if we remove from lower and lower becomes empty, and then we add a large value?

Window [1, 5] → [3, 5] (k=2):
- Remove 1: lower_count=1, 1 <= -lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
  rebalance: lower_count=0 < 1. Pop from upper: val=5. Push -5 to lower. lower=[-5], lower_count=1, upper=[], upper_count=0.
  
- Add 3: push 3 to upper. upper=[3], upper_count=1.
  rebalance: lower_count=1 == target_lower=1. OK.
  Invariant: -lower[0]=5, upper[0]=3. 5 > 3. ✗

We need the swap! Let me add it:

```python
def rebalance():
    while lower_count > target_lower:
        clean_lower()
        val = -heapq.heappop(lower)
        lower_count -= 1
        heapq.heappush(upper, val)
        upper_count += 1
    while lower_count < target_lower:
        clean_upper()
        val = heapq.heappop(upper)
        upper_count -= 1
        heapq.heappush(lower, -val)
        lower_count += 1
    
    # Fix invariant
    clean_lower()
    clean_upper()
    while lower and upper and -lower[0] > upper[0]:
        a = -heapq.heappop(lower)
        lower_count -= 1
        b = heapq.heappop(upper)
        upper_count -= 1
        heapq.heappush(lower, -b)
        heapq.heappush(upper, a)
```

After the swap in the example:
a=5, b=3.
lower=[-3], upper=[5]. lower_count=1, upper_count=1.
-3's value is 3, upper[0]=5. 3 <= 5. ✓

Median: (3+5)/2 = 4.0. ✓ (median of [3,5] is 4)

OK so the swap loop handles it. But could we need multiple swaps? Let me think...

After one swap: a = max(lower), b = min(upper), a > b.
New lower: old lower minus a, plus b. New max(lower) = max(old lower without a, b).
New upper: old upper minus b, plus a. New min(upper) = min(old upper without b, a).

For the new max(lower) > new min(upper) to hold:
- max(old lower without a, b) > min(old upper without b, a)
- Since a > b, and old lower without a has all elements <= a, and b < a:
  - max(old lower without a) <= a, b < a, so new max(lower) <= a
  - min(old upper without b) >= b, a > b, so new min(upper) >= b
  - But we need new max(lower) <= new min(upper)
  - new max(lower) could be as high as a (if old lower had multiple large elements)
  - new min(upper) could be as low as b (if old upper had multiple small elements)
  
Example: lower = {5, 4}, upper = {3, 2}. a=5, b=2.
New lower = {4, 2}, new upper = {3, 5}. max(lower)=4, min(upper)=3. 4>3. Still violated!

So we need the while loop, not just a single swap. Good, I have `while`.

But wait, can this state actually occur in our algorithm? Let's think...

The invariant is maintained after each add+rebalance and remove+rebalance. So when we start a new slide operation, the invariant holds. Then:
1. Remove old_val: this might make lower empty or change the max of lower.
2. Add new_val: this adds to upper.
3. Rebalance: moves elements to fix sizes, then swaps to fix invariant.

After step 1, the invariant still holds (removing from either heap preserves it).
After step 2, the invariant might be violated (adding to upper when lower has a larger max).
After step 3, the invariant is restored.

So the swap in step 3 should be sufficient. And the while loop handles the case where one swap isn't enough.

Actually wait, I realize there might be an issue with the "remove" logic. When I check `val <= -lower[0]`, I need to make sure lower is not empty (after cleaning). If lower_count > 0, then after cleaning, lower should have at least one valid element.

Let me also think about performance. For n=200,000 and k=1,000:
- We have 199,001 windows.
- Each window: O(log k) for heap operations.
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations.
- Python can do ~100M simple operations per second, so this should be well under 2 seconds.

The lazy deletion might add some overhead, but it's amortized O(1) per element since each element is added and removed at most once from the heap.

Let me write the final solution:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lower = []  # max-heap (negated values)
    upper = []  # min-heap
    lower_count = 0
    upper_count = 0
    removed_lower = set()
    removed_upper = set()
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    def clean_lower():
        while lower:
            val = -lower[0]
            if val in removed_lower:
                heapq.heappop(lower)
                removed_lower.remove(val)
            else:
                break
    
    def clean_upper():
        while upper:
            val = upper[0]
            if val in removed_upper:
                heapq.heappop(upper)
                removed_upper.remove(val)
            else:
                break
    
    def rebalance():
        while lower_count > target_lower:
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
        while lower_count < target_lower:
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        # Fix invariant: max(lower) <= min(upper)
        clean_lower()
        clean_upper()
        while lower and upper and -lower[0] > upper[0]:
            a = -heapq.heappop(lower)
            lower_count -= 1
            b = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -b)
            heapq.heappush(upper, a)
    
    result = []
    
    # Build initial window
    for i in range(k):
        heapq.heappush(upper, nums[i])
        upper_count += 1
        rebalance()
    
    clean_lower()
    clean_upper()
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append(float((-lower[0] + upper[0]) / 2.0))
    
    # Slide window
    for i in range(k, n):
        # Remove old element
        old_val = nums[i - k]
        clean_lower()
        clean_upper()
        if lower_count > 0 and old_val <= -lower[0]:
            removed_lower.add(old_val)
            lower_count -= 1
        else:
            removed_upper.add(old_val)
            upper_count -= 1
        
        # Add new element
        heapq.heappush(upper, nums[i])
        upper_count += 1
        
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append(float((-lower[0] + upper[0]) / 2.0))
    
    return result
```

Wait, I'm always adding to upper. Let me verify this works for the initial build.

Initial window [1, 2, 3], k=3, target_lower=2, target_upper=1:
- Add 1: push 1 to upper. upper=[1], upper_count=1.
  rebalance: lower_count=0 < 2. Pop 1 from upper, push -1 to lower. lower=[-1], lower_count=1, upper=[], upper_count=0.
  Still lower_count=1 < 2. But upper is empty! Can't pop from upper.
  
  Problem! If upper is empty and lower_count < target_lower, we can't move from upper to lower.

I need to handle this: if upper is empty, the element should go to lower directly.

Let me fix the add logic:

```python
def add(val):
    if lower_count < target_lower and (not lower or val <= -lower[0]):
        heapq.heappush(lower, -val)
        lower_count += 1
    else:
        heapq.heappush(upper, val)
        upper_count += 1
    rebalance()
```

Wait, but this has the same issue as before. If lower is empty, `not lower` is True, so we add to lower. Then rebalance will fix sizes.

Actually, let me think about this differently. The issue is:
- If lower_count < target_lower and lower is empty, we should add to lower.
- If lower_count < target_lower and lower is not empty, we can add to lower if val <= max(lower), or to upper.
- If lower_count >= target_lower, we add to upper.

Actually, the simplest correct approach:
- Always add to upper first.
- Then rebalance (which moves elements from upper to lower as needed).

But the problem is: if upper is empty and we need to move from upper to lower, we can't.

Wait, in the initial build, we add elements one by one. After adding the first element:
- upper=[val], upper_count=1.
- rebalance: lower_count=0 < target_lower. Pop from upper, push to lower. lower=[-val], lower_count=1, upper=[], upper_count=0.

After adding the second element:
- upper=[val2], upper_count=1.
- rebalance: lower_count=1 < target_lower (if target_lower > 1). Pop from upper, push to lower.

This works as long as upper is not empty when we need to pop from it. Since we just added to upper, upper is not empty.

So the "always add to upper, then rebalance" approach works for the initial build. Let me verify:

Initial [1, 2, 3], k=3, target_lower=2:
- Add 1: upper=[1], upper_count=1. rebalance: lower_count=0<2, pop 1, push -1. lower=[-1], lower_count=1, upper=[], upper_count=0.
- Add 2: upper=[2], upper_count=1. rebalance: lower_count=1<2, pop 2, push -2. lower=[-1,-2], lower_count=2, upper=[], upper_count=0.
- Add 3: upper=[3], upper_count=1. rebalance: lower_count=2==2. OK. Invariant: -lower[0]=2, upper[0]=3. 2<=3. ✓

State: lower={1,2}, upper={3}. Median: 2. ✓

Now for the slide, the same approach:
- Remove old_val from appropriate heap.
- Add new_val to upper.
- Rebalance.

The key: after removal, upper might be empty, but we add to upper, so upper is not empty when rebalance needs to pop from it.

Wait, what if target_upper = 0 (k=1)? Then upper should always be empty. But we add to upper and then rebalance moves it to lower. That works.

Let me also consider: what if after removal, lower_count < target_lower, and upper is empty? Can that happen?

If lower_count < target_lower after removal, that means we removed from lower. So lower lost an element. Upper still has its elements. Since total = k, upper_count = k - lower_count > k - target_lower = target_upper. So upper has more than target_upper elements, meaning upper is not empty (since target_upper >= 0 and upper_count > target_upper >= 0).

Wait, if k=1, target_upper=0. After removing from lower, lower_count=0, upper_count=1. Upper is not empty. OK.

If k=2, target_lower=1, target_upper=1. After removing from lower, lower_count=0, upper_count=2. Upper is not empty. OK.

So upper is always non-empty when we need to pop from it during rebalance. 

But wait, what about the initial build? After adding the first element to upper and rebalancing, upper becomes empty. Then we add the second element to upper (making it non-empty again), and rebalance pops from it. This is fine.

I think the "always add to upper, then rebalance" approach is correct. Let me finalize:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lower = []  # max-heap (negated)
    upper = []  # min-heap
    lower_count = 0
    upper_count = 0
    removed_lower = set()
    removed_upper = set()
    
    target_lower = (k + 1) // 2
    
    def clean_lower():
        while lower:
            val = -lower[0]
            if val in removed_lower:
                heapq.heappop(lower)
                removed_lower.remove(val)
            else:
                break
    
    def clean_upper():
        while upper:
            val = upper[0]
            if val in removed_upper:
                heapq.heappop(upper)
                removed_upper.remove(val)
            else:
                break
    
    def rebalance():
        while lower_count > target_lower:
            clean_lower()
            val = -heapq.heappop(lower)
            lower_count -= 1
            heapq.heappush(upper, val)
            upper_count += 1
        while lower_count < target_lower:
            clean_upper()
            val = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -val)
            lower_count += 1
        # Fix invariant
        clean_lower()
        clean_upper()
        while lower and upper and -lower[0] > upper[0]:
            a = -heapq.heappop(lower)
            lower_count -= 1
            b = heapq.heappop(upper)
            upper_count -= 1
            heapq.heappush(lower, -b)
            heapq.heappush(upper, a)
    
    result = []
    
    for i in range(k):
        heapq.heappush(upper, nums[i])
        upper_count += 1
        rebalance()
    
    clean_lower()
    clean_upper()
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append(float((-lower[0] + upper[0]) / 2.0))
    
    for i in range(k, n):
        old_val = nums[i - k]
        clean_lower()
        clean_upper()
        if lower_count > 0 and old_val <= -lower[0]:
            removed_lower.add(old_val)
            lower_count -= 1
        else:
            removed_upper.add(old_val)
            upper_count -= 1
        
        heapq.heappush(upper, nums[i])
        upper_count += 1
        
        rebalance()
        
        clean_lower()
        clean_upper()
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append(float((-lower[0] + upper[0]) / 2.0))
    
    return result
```

Let me trace through a few more cases to make sure.

Case: nums = [1, 2, 3, 4, 5], k = 2
target_lower = 1

Window [1, 2]:
- Add 1: upper=[1], upper_count=1. rebalance: lower_count=0<1, pop 1, push -1. lower=[-1], lower_count=1, upper=[], upper_count=0.
- Add 2: upper=[2], upper_count=1. rebalance: lower_count=1==1. Invariant: 1<=2. ✓
Median: (1+2)/2 = 1.5. ✓

Window [2, 3]:
- Remove 1: lower_count=1>0, 1<=-lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
  Add 3: upper=[3], upper_count=1. rebalance: lower_count=0<1, pop 3, push -3. lower=[-3], lower_count=1, upper=[], upper_count=0.
  Invariant: 3, upper empty. OK.
Median: (3+... wait, upper is empty!

Hmm, for k=2, target_lower=1, target_upper=1. But upper_count=0. That's wrong!

The issue: after rebalancing, lower_count=1=target_lower, so we stop. But upper_count=0, which is less than target_upper=1.

The problem is that my rebalance only adjusts lower_count to target_lower. Since total elements = k, if lower_count = target_lower, then upper_count = k - target_lower = target_upper. But this assumes all k elements are accounted for.

Wait, total elements in the window is always k. lower_count + upper_count should equal k. Let me check:
- After removing 1: lower_count=0, upper_count=0. Total=0. But we should have k-1=1 elements.
- After adding 3: upper_count=1. Total=1. Still not k=2.

Oh wait, I think the issue is that after removing and before adding, we have k-1 elements. After adding, we have k elements. The rebalance should be called after adding, and at that point total = k.

Let me re-check:
- Remove 1: lower_count=0, upper_count=0. (We had 2 elements, removed 1, now have 1... but lower_count+upper_count=0? That's wrong.)

Wait, before removal: lower_count=1, upper_count=1. Total=2=k. ✓
After removing 1 from lower: lower_count=0, upper_count=1. Total=1. (k-1 elements, correct)
After adding 3 to upper: upper_count=2. Total=2=k. ✓
Rebalance: lower_count=0<1. Pop from upper: val=3. Push -3 to lower. lower_count=1, upper_count=1. Total=2. ✓
Invariant: -lower[0]=3, upper[0]=... wait, what's in upper?

After popping 3 from upper, upper has... let me trace the heap operations.

Before rebalance: upper=[3, 3]? No. Let me be more careful.

Before removal: lower=[-1] (lazy: 1 in removed_lower), upper=[2]. lower_count=1, upper_count=1.

Remove 1: removed_lower.add(1), lower_count=0. (lower still has [-1] with lazy deletion)

Add 3: heapq.heappush(upper, 3). upper=[2, 3]. upper_count=2.

Rebalance: lower_count=0 < 1.
clean_upper: upper[0]=2, not in removed_upper. OK.
Pop from upper: val=2. heapq.heappop(upper) → upper=[3]. upper_count=1.
Push -2 to lower: lower=[-1, -2]. lower_count=1.
lower_count=1 == target_lower. Done.

clean_lower: lower[0]=-2 (val=2), not in removed_lower. OK.
clean_upper: upper[0]=3, not in removed_upper. OK.
Invariant: -lower[0]=2, upper[0]=3. 2<=3. ✓

Median: (2+3)/2 = 2.5. ✓

I made an error in my earlier trace. The upper heap still had 2 in it. Let me re-verify.

OK so the algorithm is correct. I was just confusing myself in the trace.

Let me also verify the case where the swap is needed:
nums = [1, 5, 3], k = 2, target_lower = 1

Window [1, 5]:
- Add 1: upper=[1], upper_count=1. rebalance: lower_count=0<1, pop 1, push -1. lower=[-1], lower_count=1, upper=[], upper_count=0.
- Add 5: upper=[5], upper_count=1. rebalance: lower_count=1==1. Invariant: 1<=5. ✓
Median: (1+5)/2 = 3.0. ✓

Window [5, 3]:
- Remove 1: lower_count=1>0, 1<=-lower[0]=1. Yes. removed_lower.add(1), lower_count=0.
- Add 3: upper=[5, 3], upper_count=2. (heap: [3, 5])
  rebalance: lower_count=0<1. clean_upper: upper[0]=3, not removed. Pop 3, push -3. lower=[-1, -3], lower_count=1, upper=[5], upper_count=1.
  clean_lower: lower[0]=-3 (val=3), not in removed_lower. OK.
  Invariant: -lower[0]=3, upper[0]=5. 3<=5. ✓
Median: (3+5)/2 = 4.0. ✓ (median of [5,3] sorted is [3,5], median = 4)

Great, this works.

Now let me think about performance. For n=200,000, k=1,000:
- 199,001 windows
- Each window: O(log k) heap operations
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations

Python's heapq is implemented in C, so each heap operation is fast. The lazy deletion adds some overhead but is amortized O(1).

The set operations (add, remove, membership test) are O(1) average.

I think this will comfortably finish in under 2 seconds.

One more consideration: the `removed_lower` and `removed_upper` sets. Over time, they might accumulate entries that have already been cleaned. But since we remove from the set when we clean, the set size stays bounded by the number of pending lazy deletions, which is at most k.

Actually, let me double-check: we add to removed_lower/removed_upper when we remove an element. We remove from the set when we clean (pop the element from the heap). So the set size is bounded by the number of elements that have been marked for removal but not yet popped from the heap. This is at most k (the window size).

I'm satisfied with this solution. Let me write the final version.

Actually, one more edge case: what if k = len(nums)? Then there's only one window. The function should return a list with one element.

Let me also make sure the return type is correct: list[float]. All values should be floats. Using `float(...)` ensures this.

Let me write the final clean version.
