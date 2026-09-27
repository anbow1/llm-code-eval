We need to implement `sliding_median(nums: list[float], k: int) -> list[float]` that returns the median of every contiguous window of size k.

Requirements:
- For even k, median is the mean of the two middle values.
- Raise ValueError if k < 1 or k > len(nums).
- Must be efficient: n = 200,000 with k = 1,000 must finish in well under 2 seconds.

The naive approach would be O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations - way too slow.

We need an efficient approach. The classic approach for sliding window median uses two heaps (or two sorted structures) - a max-heap for the lower half and a min-heap for the upper half.

The approach:
1. Maintain two heaps:
   - `low`: max-heap (using negative values since Python has min-heap) for the lower half
   - `high`: min-heap for the upper half
2. Invariant: `len(low) >= len(high)` and `len(low) - len(high) <= 1`
   - If k is odd: `len(low) = (k+1)//2`, `len(high) = (k-1)//2`
   - If k is even: `len(low) = k//2`, `len(high) = k//2`

3. For the median:
   - If k is odd: `low[0]` (negated)
   - If k is even: `(-low[0] + high[0]) / 2`

The challenge with sliding window is removing elements. We can use lazy deletion with a dictionary to track "removed" elements.

Algorithm:
1. Initialize the first window of size k.
2. For each subsequent window, remove the element that slides out and add the new element.
3. After each add/remove, rebalance the heaps.

Let me think about the lazy deletion approach:
- We maintain `low` (max-heap via negatives) and `high` (min-heap).
- We maintain a `removed` dict that counts how many times each value has been "logically removed".
- When we pop from a heap, we check if the top is in `removed`. If so, decrement the count and pop again.

Let me code this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    n = len(nums)
    # low is a max-heap (store negatives), high is a min-heap
    low = []  # max-heap via negation
    high = []  # min-heap
    removed = defaultdict(int)
    
    def clean(heap):
        while heap and removed.get(heap[0], 0) > 0:
            removed[heap[0]] -= 1
            heapq.heappop(heap)
    
    def add_to_low(val):
        heapq.heappush(low, -val)
    
    def add_to_high(val):
        heapq.heappush(high, val)
    
    def rebalance():
        # Ensure len(low) >= len(high) and len(low) - len(high) <= 1
        # Target: len(low) = (k+1)//2, len(high) = (k-1)//2
        target_low = (k + 1) // 2
        target_high = k - target_low
        
        # Clean tops
        clean(low)
        clean(high)
        
        while len(low) < target_low:
            clean(high)
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
        while len(high) < target_high:
            clean(low)
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        while len(low) > target_low:
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        while len(high) > target_high:
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
    
    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return float(-low[0])
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize first window
    for i in range(k):
        add_to_low(nums[i])
    rebalance()
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove nums[i-k]
        val_out = nums[i - k]
        if val_out <= -low[0]:
            removed[-val_out] += 1
            # Actually we need to be careful - the heap stores negatives for low
            # So the value in low is -val_out
            # We mark -val_out as removed
            removed[-val_out] += 1
        else:
            removed[val_out] += 1
        
        # Add nums[i]
        # Add to the appropriate heap based on comparison with median
        val_in = nums[i]
        if val_in <= -low[0]:
            heapq.heappush(low, -val_in)
        else:
            heapq.heappush(high, val_in)
        
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, there's an issue with the lazy deletion. When I mark a value as removed, I need to mark the value as it appears in the heap. For `low`, values are stored as negatives. For `high`, values are stored as-is.

So when removing `val_out`:
- If `val_out` is in `low` (i.e., `val_out <= -low[0]`), then the heap entry is `-val_out`, so I mark `removed[-val_out] += 1`.
- If `val_out` is in `high`, the heap entry is `val_out`, so I mark `removed[val_out] += 1`.

But wait, what if `val_out == -low[0]`? It could be in either heap. Actually, the condition `val_out <= -low[0]` should determine which heap it's in. But there's a subtlety: if `val_out == -low[0]`, it could be in either heap. 

Hmm, actually the standard approach is:
- If `val_out <= -low[0]` (the max of low), it's in low.
- Otherwise, it's in high.

But what if `val_out == -low[0]` and it's actually in high? That's a problem. Let me think...

Actually, the invariant should be that all elements in low are <= all elements in high. So if `val_out <= -low[0]`, it must be in low (since -low[0] is the max of low, and all elements in high are >= -low[0]). Wait, that's not quite right either.

The invariant is: max(low) <= min(high). So `-low[0] <= high[0]`.

If `val_out <= -low[0]`, then `val_out` could be in low. But could it also be in high? Only if `val_out == -low[0] == high[0]`. In that case, it's ambiguous.

A safer approach: check if `val_out <= -low[0]`. If so, it's in low. Otherwise, it's in high. This works because:
- All elements in low are <= -low[0]
- All elements in high are >= high[0] >= -low[0]
- So if val_out < -low[0], it must be in low
- If val_out > -low[0], it must be in high
- If val_out == -low[0], it could be in either. But we assign it to low, which is fine because the lazy deletion will handle it - if it was actually in high, the `removed` count for `-val_out` (i.e., the negative) won't match anything in high, but it will match in low when we clean. Wait no...

Actually, let me reconsider. The `removed` dict tracks values as they appear in the heaps. So:
- In `low`, a value `x` is stored as `-x`.
- In `high`, a value `x` is stored as `x`.

When we remove `val_out`:
- If we determine it's in `low`, we do `removed[-val_out] += 1`.
- If we determine it's in `high`, we do `removed[val_out] += 1`.

The issue: if `val_out == -low[0]` and it's actually in `high`, we'd mark `removed[-val_out]` but the value in high is `val_out`. So when we clean high, we check `removed.get(high[0], 0)` which is `removed.get(val_out, 0)`, not `removed.get(-val_out, 0)`. So the removal wouldn't be applied to high, and it would remain.

But wait - if `val_out == -low[0]`, and the invariant is max(low) <= min(high), then `-low[0] <= high[0]`. If `val_out == -low[0]`, then `val_out <= high[0]`. So `val_out` could be in either heap.

Hmm, this is a known issue with the two-heap sliding median. Let me think of a better approach.

One common solution: instead of trying to determine which heap the element is in, we can use a different strategy. We can mark the removal, and during rebalancing, we clean both heaps. The key insight is that if we mark `removed[val] += 1` for the value as it appears in the heap, we need to know which heap it's in.

Alternative approach: Use the fact that we can determine which heap an element belongs to by comparing with the boundary. Specifically:
- If `val_out < -low[0]`, it's definitely in low.
- If `val_out > high[0]`, it's definitely in high.
- If `-low[0] <= val_out <= high[0]`, it's ambiguous.

In the ambiguous case, we can just pick one. Let's say we assign it to low. Then we mark `removed[-val_out] += 1`. During rebalancing, when we clean low, if the top of low is `-val_out`, we'll decrement the count. But what if the actual `val_out` was in high? Then the count in `removed` for `-val_out` would remain, and when we eventually pop `-val_out` from low (if it exists there), we'd incorrectly remove it.

Actually, I think the standard approach works correctly. Let me think again...

The standard approach for sliding window median with two heaps and lazy deletion:

When removing element `x`:
- If `x <= -low[0]`: mark `removed[-x] += 1` (it's in low)
- Else: mark `removed[x] += 1` (it's in high)

This works because of the invariant that all elements in low <= all elements in high. So:
- If `x < -low[0]`, x must be in low (it can't be in high since all high elements >= -low[0] > x).
- If `x > high[0]`, x must be in high.
- If `-low[0] <= x <= high[0]`, x could be in either. We assign to low.

In the ambiguous case, we assign to low. This means we mark `removed[-x] += 1`. Now, if x was actually in high, then:
- The `removed[-x]` count is 1, but there's no `-x` in high (high stores positive values).
- When we clean low, if `-x` is at the top of low, we'd decrement. But if x was in high, there might not be a `-x` in low at all!

Wait, but if x was in high, and we mark `removed[-x]`, then when we clean low, we check `removed.get(low[0], 0)`. If `low[0]` happens to be `-x` (meaning there IS an x in low), we'd incorrectly remove it. But if there's no x in low, the count just sits there.

Hmm, but actually if x was in high and we mark `removed[-x]`, the count is orphaned. It will never be cleaned because no `-x` will ever be at the top of low (unless another x is added to low). This would cause a memory leak but not a correctness issue... wait, no. If later another x is added to low, then when we clean, we'd see `removed[-x] > 0` and pop it, but that x in low is a legitimate element!

So this approach has a correctness issue in the ambiguous case.

Let me look at this differently. A better approach:

Instead of trying to determine which heap the element is in, we can:
1. Mark `removed[x] += 1` (using the actual value, not the negated one).
2. When cleaning, for `low`, check `removed.get(-low[0], 0)`. For `high`, check `removed.get(high[0], 0)`.

Wait, that's what I was doing before. Let me re-examine.

If I store `removed[x]` where x is the actual value:
- When cleaning low: check `removed.get(-low[0], 0)` (since low stores `-x`, the actual value is `-low[0]`).
- When cleaning high: check `removed.get(high[0], 0)` (since high stores `x`, the actual value is `high[0]`).

And when removing `val_out`:
- Just do `removed[val_out] += 1`.

This way, we don't need to know which heap it's in! The lazy deletion will handle it: when the element reaches the top of whichever heap it's in, it'll be cleaned.

But wait, there's a subtlety with rebalancing. When we rebalance, we need to know the correct sizes. The `removed` elements still occupy space in the heaps, so `len(low)` and `len(high)` include the "removed" elements. We need to account for this.

Actually, let me use a different approach. Let me track the "effective" sizes:
- `eff_low = len(low) - (number of removed elements in low)`
- `eff_high = len(high) - (number of removed elements in high)`

But we don't know exactly how many removed elements are in each heap without tracking that separately.

Alternative: Let's track `removed` as a dict mapping value -> count, and during rebalancing, we clean and then check sizes.

Let me try this approach:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    if k == 1:
        return list(nums)
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    removed = defaultdict(int)
    
    def clean(heap):
        while heap and removed.get(heap[0], 0) > 0:
            removed[heap[0]] -= 1
            heapq.heappop(heap)
    
    def rebalance():
        clean(low)
        clean(high)
        # Target sizes
        target_low = (k + 1) // 2
        target_high = k - target_low
        
        while len(low) < target_low:
            clean(high)
            heapq.heappush(low, -heapq.heappop(high))
        while len(high) < target_high:
            clean(low)
            heapq.heappush(high, -heapq.heappop(low))
        while len(low) > target_low:
            heapq.heappush(high, -heapq.heappop(low))
        while len(high) > target_high:
            heapq.heappush(low, -heapq.heappop(high))
    
    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return float(-low[0])
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        heapq.heappush(low, -nums[i])
    rebalance()
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove outgoing element
        removed[nums[i - k]] += 1
        
        # Add incoming element
        # Decide which heap to add to
        clean(low)
        if nums[i] <= -low[0]:
            heapq.heappush(low, -nums[i])
        else:
            heapq.heappush(high, nums[i])
        
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, but there's still the issue with the `removed` dict. When I do `removed[nums[i-k]] += 1`, I'm marking the value. But in `low`, the value is stored as negative. So when I clean `low`, I check `removed.get(low[0], 0)` where `low[0]` is `-x`. But I marked `removed[x]`. So the lookup would be `removed.get(-x, 0)` which is 0!

I need to be consistent. Let me use the actual values in the `removed` dict and adjust the cleaning:

```python
def clean_low():
    while low and removed.get(-low[0], 0) > 0:
        removed[-low[0]] -= 1
        heapq.heappop(low)

def clean_high():
    while high and removed.get(high[0], 0) > 0:
        removed[high[0]] -= 1
        heapq.heappop(high)
```

And when removing: `removed[nums[i-k]] += 1` (using the actual value).

This should work! The `removed` dict maps actual values to counts. When cleaning low, we negate the heap entry to get the actual value and look it up. When cleaning high, we use the heap entry directly.

Let me also think about the rebalancing. After adding/removing, the sizes might be off. The `len(low)` and `len(high)` include elements that are marked as removed but haven't been cleaned yet. So when we do `while len(low) < target_low`, we might be comparing against the wrong size.

Hmm, this is tricky. Let me think...

Actually, the approach should work if we clean before checking sizes. Let me restructure:

```python
def rebalance():
    clean_low()
    clean_high()
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    while len(low) < target_low:
        clean_high()
        heapq.heappush(low, -heapq.heappop(high))
    while len(high) < target_high:
        clean_low()
        heapq.heappush(high, -heapq.heappop(low))
    while len(low) > target_low:
        heapq.heappush(high, -heapq.heappop(low))
    while len(high) > target_high:
        heapq.heappush(low, -heapq.heappop(high))
```

After cleaning, `len(low)` and `len(high)` should reflect the actual (non-removed) sizes. So the rebalancing should work correctly.

But wait, there's another issue. When we pop from a heap during rebalancing, the popped element might be marked as removed. So we need to clean before popping. Let me add cleaning before each pop:

```python
def rebalance():
    clean_low()
    clean_high()
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    while len(low) < target_low:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
    while len(high) < target_high:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    while len(low) > target_low:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    while len(high) > target_high:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
```

This should be correct. Let me also think about the `add` step. When adding a new element, I compare with `-low[0]` (the current max of low). But I should clean low first to make sure the top is valid.

Let me also consider: what if `low` is empty when I try to access `low[0]`? This shouldn't happen because we always maintain at least one element in low (since k >= 1 and we initialize with k elements).

Actually wait, during rebalancing, could low become empty? If k=1, target_low=1, target_high=0. So low always has at least 1 element. For k>=2, target_low >= 1. So low is never empty.

Let me also think about the time complexity. Each element is pushed and popped at most a constant number of times (amortized). The `clean` operations are amortized O(1) per element since each element is cleaned at most once. So the total time is O(n log k).

For n=200,000 and k=1,000: 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. This should be well under 2 seconds in Python.

Wait, but Python's heapq operations are not super fast. Let me think about whether this will be fast enough. 200,000 iterations, each doing a few heap operations (push, pop, clean). Each heap operation is O(log k) = O(log 1000) ≈ 10 comparisons. So roughly 200,000 * 10 * constant_factor. The constant factor might be 5-10 heap operations per iteration. So maybe 200,000 * 10 * 10 = 20,000,000 basic operations. In Python, this might take around 1-2 seconds. Should be fine.

Let me also handle the edge case where k == 1 (just return the list as floats).

Actually, let me reconsider the approach. Let me trace through a small example:

nums = [1, 3, 5, 7, 9], k = 3

Initialize: push 1, 3, 5 to low (as -1, -3, -5).
low = [-5, -3, -1] (heap: top is -5, so max is 5)
rebalance: target_low = 2, target_high = 1
clean_low: nothing to clean
clean_high: nothing to clean
len(low) = 3 > 2, so pop from low: val = -(-5) = 5, push to high.
low = [-3, -1], high = [5]
Median: -low[0] = 3. Correct!

Next window: remove 1, add 7.
removed[1] += 1
clean_low: low[0] = -3, removed.get(3, 0) = 0. OK.
7 > -low[0] = 3, so push to high.
high = [5, 7]
rebalance: target_low = 2, target_high = 1
clean_low: OK
clean_high: high[0] = 5, removed.get(5, 0) = 0. OK.
len(low) = 2 = target_low. OK.
len(high) = 2 > 1. Pop from high: val = 5, push to low.
low = [-5, -1, -3] -> heap: [-5, -1, -3]
high = [7]
Median: -low[0] = 5. 

Wait, the window is [3, 5, 7], median should be 5. Correct!

Next window: remove 3, add 9.
removed[3] += 1
clean_low: low[0] = -5, removed.get(5, 0) = 0. OK.
9 > -low[0] = 5, push to high.
high = [7, 9]
rebalance: target_low = 2, target_high = 1
clean_low: OK
clean_high: high[0] = 7, removed.get(7, 0) = 0. OK.
len(low) = 3 > 2. Pop from low: clean_low first. low[0] = -5, removed.get(5,0)=0. Pop: val = 5, push to high.
low = [-3, -1]
high = [7, 9, 5] -> heap: [5, 9, 7]
len(high) = 3 > 1. Pop from high: clean_high. high[0] = 5, removed.get(5,0)=0. Pop: val=5, push to low.
low = [-5, -1, -3] -> heap: [-5, -1, -3]
high = [7, 9]
len(high) = 2 > 1. Pop from high: clean_high. high[0]=7, removed.get(7,0)=0. Pop: val=7, push to low.
low = [-7, -1, -3, -5] -> heap: [-7, -1, -3, -5]
high = [9]
len(low) = 4 > 2. Pop from low: clean_low. low[0]=-7, removed.get(7,0)=0. Pop: val=7, push to high.
low = [-5, -1, -3] -> heap: [-5, -1, -3]
high = [9, 7]
len(low) = 3 > 2. Pop from low: clean_low. low[0]=-5, removed.get(5,0)=0. Pop: val=5, push to high.
low = [-3, -1]
high = [7, 9, 5] -> heap: [5, 9, 7]
len(high) = 3 > 1. Pop from high: clean_high. high[0]=5, removed.get(5,0)=0. Pop: val=5, push to low.
low = [-5, -1, -3] -> heap: [-5, -1, -3]
high = [7, 9]
len(low) = 3 > 2. ...

This is oscillating! The problem is that the sizes keep bouncing. This won't terminate!

The issue is that my rebalancing logic is not correct. Let me fix it.

The problem: when I pop from low and push to high, the size of high increases. Then I check if high is too big and pop from high to low. This creates an infinite loop.

I need a different rebalancing strategy. Let me think...

The correct approach:
1. First, clean both heaps.
2. If len(low) > target_low: move elements from low to high until len(low) == target_low.
3. If len(low) < target_low: move elements from high to low until len(low) == target_low.
4. Similarly for high.

But the issue is that after step 2, high might be too big. And after step 3, low might be too big.

Actually, the target sizes are fixed: target_low + target_high = k. So if len(low) == target_low, then len(high) should be target_high (assuming total elements = k).

Wait, but we have removed elements that haven't been cleaned yet. After cleaning, the total should be k.

Let me restructure:

```python
def rebalance():
    clean_low()
    clean_high()
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    # At this point, len(low) + len(high) should be k (after cleaning)
    # We just need to ensure len(low) == target_low
    
    while len(low) > target_low:
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    while len(low) < target_low:
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
```

This is simpler! We only adjust low to hit the target, and high will automatically be correct since total = k.

But wait, we need to make sure that when we pop from high, it's not a removed element. So we need to clean high before popping:

```python
def rebalance():
    clean_low()
    clean_high()
    target_low = (k + 1) // 2
    
    while len(low) > target_low:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    while len(low) < target_low:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
```

Let me re-trace:

nums = [1, 3, 5, 7, 9], k = 3, target_low = 2

Initialize: low = [-5, -3, -1] (heap), high = []
rebalance: clean both (nothing to clean). len(low)=3 > 2. Pop: val=5, push to high. low=[-3,-1], high=[5].
Median: 3. ✓

Window [3,5,7]: remove 1, add 7.
removed[1]=1
clean_low: low[0]=-3, removed.get(3,0)=0. OK.
7 > 3, push to high. high=[5,7]
rebalance: clean_low OK, clean_high OK. len(low)=2=target. Done.
Median: -low[0]=3? Wait, low=[-3,-1], so -low[0]=3. But the window is [3,5,7], median should be 5!

Hmm, that's wrong. Let me check: low should contain the lower half. For k=3, target_low=2. The lower 2 elements of [3,5,7] are 3 and 5. So low should be [-5, -3] and high should be [7].

But in my trace, low=[-3,-1] which means low contains 3 and 1. But 1 was removed! The issue is that 1 is still in low (marked as removed but not cleaned because it's not at the top).

So low = [-3, -1] where -1 corresponds to the removed element 1. The effective low is just [3]. And high = [5, 7].

When I clean_low, low[0] = -3, removed.get(3, 0) = 0. So -1 (value 1) is not at the top, so it doesn't get cleaned.

The problem is that the "removed" element 1 is buried in low. The heap property means -3 is the top (max is 3), and -1 is deeper. So 1 (removed) is not at the top.

This means my approach has a flaw: the effective size of low is not `len(low)` but `len(low) - (number of removed elements in low)`. And I can't easily determine that without cleaning all elements.

Hmm, this is the fundamental issue with lazy deletion in heaps. The removed elements can be anywhere in the heap, not just at the top.

One solution: track the effective sizes separately.

```python
low_size = 0  # effective size of low
high_size = 0  # effective size of high
```

When we add to low: `low_size += 1`
When we add to high: `high_size += 1`
When we remove an element: if it's in low, `low_size -= 1`; if in high, `high_size -= 1`.
When we clean (pop a removed element from low): `low_size -= 1` (wait, no - the removal already decremented the size, and cleaning just removes the physical element).

Hmm, let me think differently.

Actually, let me reconsider. The standard approach for sliding window median with two heaps uses lazy deletion and tracks sizes:

```python
low_size = 0
high_size = 0

def add_to_low(val):
    heapq.heappush(low, -val)
    low_size += 1

def add_to_high(val):
    heapq.heappush(high, val)
    high_size += 1

def remove(val):
    removed[val] += 1
    if val <= -low[0]:  # might be in low
        low_size -= 1
    else:
        high_size -= 1

def clean_low():
    nonlocal low_size
    while low and removed.get(-low[0], 0) > 0:
        removed[-low[0]] -= 1
        heapq.heappop(low)
        low_size -= 1

def clean_high():
    nonlocal high_size
    while high and removed.get(high[0], 0) > 0:
        removed[high[0]] -= 1
        heapq.heappop(high)
        high_size -= 1
```

Wait, but in `remove`, I'm still guessing which heap the element is in. And in `clean_low`, I'm decrementing `low_size` when I physically remove a lazy-deleted element. But the `remove` function already decremented the size. So I'd be double-decrementing!

Let me fix: in `remove`, I just mark `removed[val] += 1` and decrement the appropriate size. In `clean`, I just physically remove the element from the heap WITHOUT decrementing the size (since it was already decremented in `remove`).

```python
def remove(val):
    removed[val] += 1
    if val <= -low[0]:
        low_size -= 1
    else:
        high_size -= 1

def clean_low():
    while low and removed.get(-low[0], 0) > 0:
        removed[-low[0]] -= 1
        heapq.heappop(low)
        # Don't decrement low_size here, it was already decremented in remove()

def clean_high():
    while high and removed.get(high[0], 0) > 0:
        removed[high[0]] -= 1
        heapq.heappop(high)
        # Don't decrement high_size here
```

And rebalancing uses `low_size` and `high_size`:

```python
def rebalance():
    clean_low()
    clean_high()
    target_low = (k + 1) // 2
    
    while low_size > target_low:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
        low_size -= 1
        high_size += 1
    while low_size < target_low:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
        low_size += 1
        high_size -= 1
```

And when adding:
```python
def add(val):
    clean_low()
    if val <= -low[0]:
        heapq.heappush(low, -val)
        low_size += 1
    else:
        heapq.heappush(high, val)
        high_size += 1
```

Let me re-trace:

nums = [1, 3, 5, 7, 9], k = 3, target_low = 2

Initialize:
add(1): low=[-1], low_size=1
add(3): 3 > -(-1)=1, so high=[3], high_size=1
add(5): 5 > 1, so high=[3,5], high_size=2
rebalance: clean both. low_size=1 < 2. Pop from high: val=3, push to low. low=[-3,-1], low_size=2, high_size=1.
Median: -low[0] = 3. ✓ (window [1,3,5])

Window [3,5,7]: remove 1, add 7.
remove(1): 1 <= -low[0] = 3. removed[1]=1, low_size=1.
add(7): clean_low: low[0]=-3, removed.get(3,0)=0. 7 > 3, push to high. high=[3,5,7]... wait, high was [5] (after rebalance, high=[5]). Let me redo.

After initialization and rebalance: low=[-3,-1], high=[5], low_size=2, high_size=1.

remove(1): 1 <= -low[0]=3. removed[1]=1, low_size=1.
add(7): clean_low: low[0]=-3, removed.get(3,0)=0. 7 > 3. Push to high. high=[5,7], high_size=2.
rebalance: clean_low: low[0]=-3, removed.get(3,0)=0. OK. clean_high: high[0]=5, removed.get(5,0)=0. OK.
low_size=1 < 2. Pop from high: clean_high first. val=5. Push to low. low=[-5,-1,-3], low_size=2, high_size=1.
Median: -low[0]=5. ✓ (window [3,5,7])

Window [5,7,9]: remove 3, add 9.
remove(3): 3 <= -low[0]=5. removed[3]=1, low_size=1.
add(9): clean_low: low[0]=-5, removed.get(5,0)=0. 9 > 5. Push to high. high=[7,9], high_size=2.
rebalance: clean_low: low[0]=-5, removed.get(5,0)=0. OK. clean_high: high[0]=7, removed.get(7,0)=0. OK.
low_size=1 < 2. Pop from high: val=7. Push to low. low=[-7,-1,-3,-5], low_size=2, high_size=1.
Median: -low[0]=7. ✓ (window [5,7,9])

Now let me check a case where the removed element is buried:

nums = [1, 2, 3, 4, 5], k = 3

Initialize:
add(1): low=[-1], low_size=1
add(2): 2 > 1, high=[2], high_size=1
add(3): 3 > 1, high=[2,3], high_size=2
rebalance: low_size=1 < 2. Pop from high: val=2, push to low. low=[-2,-1], low_size=2, high_size=1.
Median: 2. ✓

Window [2,3,4]: remove 1, add 4.
remove(1): 1 <= -low[0]=2. removed[1]=1, low_size=1.
add(4): clean_low: low[0]=-2, removed.get(2,0)=0. 4 > 2. Push to high. high=[3,4], high_size=2.
rebalance: clean_low: low[0]=-2, removed.get(2,0)=0. OK.
low_size=1 < 2. Pop from high: val=3. Push to low. low=[-3,-1,-2], low_size=2, high_size=1.
Median: -low[0]=3. ✓

Window [3,4,5]: remove 2, add 5.
remove(2): 2 <= -low[0]=3. removed[2]=1, low_size=1.
add(5): clean_low: low[0]=-3, removed.get(3,0)=0. 5 > 3. Push to high. high=[4,5], high_size=2.
rebalance: clean_low: low[0]=-3, removed.get(3,0)=0. OK.
low_size=1 < 2. Pop from high: val=4. Push to low. low=[-4,-1,-2,-3], low_size=2, high_size=1.
Median: -low[0]=4. ✓

Now let me test a case where the removed element is at the top:
nums = [5, 1, 2, 3, 4], k = 3

Initialize:
add(5): low=[-5], low_size=1
add(1): 1 <= 5. Push to low. low=[-5,-1], low_size=2
add(2): 2 <= 5. Push to low. low=[-5,-1,-2], low_size=3
rebalance: low_size=3 > 2. Pop from low: val=5. Push to high. low=[-2,-1], low_size=2, high_size=1. high=[5].
Median: -low[0]=2. ✓ (window [5,1,2], sorted [1,2,5], median=2)

Window [1,2,3]: remove 5, add 3.
remove(5): 5 <= -low[0]=2? No, 5 > 2. So high_size -= 1. removed[5]=1, high_size=0.
add(3): clean_low: low[0]=-2, removed.get(2,0)=0. 3 > 2. Push to high. high=[5,3], high_size=1.
rebalance: clean_low: OK. clean_high: high[0]=3, removed.get(3,0)=0. OK.
low_size=2=target. Done.
Median: -low[0]=2. ✓ (window [1,2,3], median=2)

Window [2,3,4]: remove 1, add 4.
remove(1): 1 <= -low[0]=2. removed[1]=1, low_size=1.
add(4): clean_low: low[0]=-2, removed.get(2,0)=0. 4 > 2. Push to high. high=[3,5,4], high_size=2.
rebalance: clean_low: low[0]=-2, removed.get(2,0)=0. OK.
low_size=1 < 2. Pop from high: clean_high: high[0]=3, removed.get(3,0)=0. val=3. Push to low. low=[-3,-1,-2], low_size=2, high_size=1.
Median: -low[0]=3. ✓ (window [2,3,4], median=3)

Now let me test the "buried removed element" case more carefully:
nums = [1, 5, 3, 2, 4], k = 3

Initialize:
add(1): low=[-1], low_size=1
add(5): 5 > 1. high=[5], high_size=1
add(3): 3 > 1. high=[5,3], high_size=2
rebalance: low_size=1 < 2. Pop from high: val=3. Push to low. low=[-3,-1], low_size=2, high_size=1. high=[5].
Median: 3. ✓ (window [1,5,3], sorted [1,3,5], median=3)

Window [5,3,2]: remove 1, add 2.
remove(1): 1 <= -low[0]=3. removed[1]=1, low_size=1.
add(2): clean_low: low[0]=-3, removed.get(3,0)=0. 2 <= 3. Push to low. low=[-3,-1,-2], low_size=2.
rebalance: clean_low: low[0]=-3, removed.get(3,0)=0. OK.
low_size=2=target. Done.
Median: -low[0]=3. ✓ (window [5,3,2], sorted [2,3,5], median=3)

Note: low physically contains [-3, -1, -2] where -1 is the removed element 1. But low_size=2 correctly reflects that only 2 elements are active.

Window [3,2,4]: remove 5, add 4.
remove(5): 5 <= -low[0]=3? No. So high_size -= 1. removed[5]=1, high_size=0.
add(4): clean_low: low[0]=-3, removed.get(3,0)=0. 4 > 3. Push to high. high=[5,4], high_size=1.
rebalance: clean_low: OK. clean_high: high[0]=4, removed.get(4,0)=0. OK.
low_size=2=target. Done.
Median: -low[0]=3. ✓ (window [3,2,4], sorted [2,3,4], median=3)

Now let me test where the removed element gets cleaned:
nums = [1, 2, 1, 3, 4], k = 3

Initialize:
add(1): low=[-1], low_size=1
add(2): 2 > 1. high=[2], high_size=1
add(1): 1 <= 1. Push to low. low=[-1,-1], low_size=2
rebalance: low_size=2=target. Done.
Median: -low[0]=1. ✓ (window [1,2,1], sorted [1,1,2], median=1)

Window [2,1,3]: remove 1, add 3.
remove(1): 1 <= -low[0]=1. removed[1]=1, low_size=1.
add(3): clean_low: low[0]=-1, removed.get(1,0)=1 > 0. Clean! removed[1]=0, pop. low=[-1], low_size stays 1 (we don't decrement in clean).

Wait, I said we don't decrement low_size in clean. But the element was already accounted for in the size when we removed it. So after remove(1), low_size=1. The physical low has 2 elements [-1, -1], one of which is removed. After cleaning, low has 1 element [-1]. low_size=1. Correct!

3 > 1. Push to high. high=[2,3], high_size=2.
rebalance: clean_low: low[0]=-1, removed.get(1,0)=0. OK.
low_size=1 < 2. Pop from high: val=2. Push to low. low=[-2,-1], low_size=2, high_size=1.
Median: -low[0]=2. ✓ (window [2,1,3], sorted [1,2,3], median=2)

Great, this works!

Now let me also handle the case where k is even:
nums = [1, 3, 2, 4], k = 2

Initialize:
add(1): low=[-1], low_size=1
add(3): 3 > 1. high=[3], high_size=1
rebalance: target_low = (2+1)//2 = 1. low_size=1=target. Done.
Median: (-low[0] + high[0]) / 2 = (1 + 3) / 2 = 2.0. ✓ (window [1,3], median=(1+3)/2=2)

Window [3,2]: remove 1, add 2.
remove(1): 1 <= -low[0]=1. removed[1]=1, low_size=0.
add(2): clean_low: low[0]=-1, removed.get(1,0)=1. Clean! removed[1]=0, pop. low=[].
Now low is empty! Can't access low[0].

Hmm, this is a problem. When low is empty, I can't compare with -low[0].

I need to handle this case. If low is empty after cleaning, I should add to low.

```python
def add(val):
    clean_low()
    if not low or val <= -low[0]:
        heapq.heappush(low, -val)
        low_size += 1
    else:
        heapq.heappush(high, val)
        high_size += 1
```

Let me continue the trace:
add(2): clean_low: low is empty. So push to low. low=[-2], low_size=1.
rebalance: target_low=1. low_size=1=target. Done.
Median: (-low[0] + high[0]) / 2 = (2 + 3) / 2 = 2.5. ✓ (window [3,2], sorted [2,3], median=2.5)

Window [2,4]: remove 3, add 4.
remove(3): 3 <= -low[0]=2? No. high_size -= 1. removed[3]=1, high_size=0.
add(4): clean_low: low[0]=-2, removed.get(2,0)=0. 4 > 2. Push to high. high=[3,4], high_size=1.
rebalance: clean_low: OK. clean_high: high[0]=3, removed.get(3,0)=1. Clean! removed[3]=0, pop. high=[4].
low_size=1=target. Done.
Median: (-low[0] + high[0]) / 2 = (2 + 4) / 2 = 3.0. ✓ (window [2,4], median=3)

The approach works. Let me now write the final code.

One more thing: in the `remove` function, I compare `val <= -low[0]`. But what if low is empty? This shouldn't happen during normal operation because we always maintain at least one element in low (for k >= 1). But let me add a safety check.

Actually, for k >= 1, target_low = (k+1)//2 >= 1. So low always has at least 1 effective element. But physically, low might be empty if all elements were removed and cleaned. However, since we clean before accessing, and we maintain the invariant, this shouldn't happen.

Wait, actually it could happen temporarily. Let me think... After `remove`, low_size could become 0 (if k=1 and we remove the only element). But then we immediately add a new element. So during the `add` step, low might be empty.

For k=1: target_low=1. After remove, low_size=0. Then add: if low is empty, push to low. low_size=1. Rebalance: target=1, done. This works.

For k=2: target_low=1. After remove, low_size could be 0. Then add: if low is empty, push to low. low_size=1. Rebalance: target=1, done. Works.

OK, I think the code is correct. Let me also make sure the `remove` function handles the case where low might be empty (after cleaning). Actually, in `remove`, I access `-low[0]`. If low is empty, this would crash. But can low be empty at the time of `remove`?

At the start of each iteration (after the previous rebalance), low_size >= target_low >= 1. So low has at least 1 effective element. But physically, low might have more elements (including removed ones). After cleaning, low has at least low_size >= 1 elements. So low[0] is valid.

Wait, but I don't clean before `remove`. Let me add a clean before the comparison in `remove`:

Actually, let me restructure. In the main loop:
1. Remove outgoing element: mark as removed, decrement size.
2. Add incoming element: clean, decide which heap, push, increment size.
3. Rebalance.
4. Get median.

In step 1, I need to compare `val_out` with `-low[0]`. At this point, low should have at least 1 effective element (from the previous rebalance). But the top of low might be a removed element from a previous operation. So I should clean first.

Let me add `clean_low()` before the comparison in the remove step.

Actually, let me just restructure to clean at the beginning of each step:

```python
for i in range(k, n):
    # Remove outgoing
    val_out = nums[i - k]
    clean_low()
    if val_out <= -low[0]:
        removed[val_out] += 1
        low_size -= 1
    else:
        removed[val_out] += 1
        high_size -= 1
    
    # Add incoming
    val_in = nums[i]
    clean_low()
    if not low or val_in <= -low[0]:
        heapq.heappush(low, -val_in)
        low_size += 1
    else:
        heapq.heappush(high, val_in)
        high_size += 1
    
    rebalance()
    result.append(get_median())
```

Hmm wait, but there's still an issue. When I do `remove`, I compare `val_out <= -low[0]`. But what if `val_out` was actually in high, and `val_out == -low[0]`? Then I'd incorrectly assign it to low.

Example: low = [-3], high = [3, 5]. val_out = 3. 3 <= -low[0] = 3. So I assign to low. But 3 is in high!

In this case, `removed[3] = 1`, `low_size -= 1`. But 3 is in high, not low. So low_size is now wrong (decremented when it shouldn't be), and high_size is not decremented.

This is the fundamental ambiguity issue. How to handle it?

One approach: if `val_out == -low[0]`, check if it's more likely in low or high. Actually, we can't determine this without more information.

Alternative approach: Don't try to determine which heap. Instead, just mark `removed[val_out] += 1` and don't decrement any size. Then during rebalancing, when we clean, we decrement the size.

But then the sizes during rebalancing would be wrong (too large by the number of uncleaned removed elements).

Hmm, let me think of another approach.

Actually, you know what, let me use a different strategy. Instead of trying to figure out which heap an element is in, I'll use the following approach:

When removing `val_out`:
- Mark `removed[val_out] += 1`.
- If `val_out < -low[0]`: definitely in low. `low_size -= 1`.
- If `val_out > high[0]`: definitely in high. `high_size -= 1`.
- If `-low[0] <= val_out <= high[0]`: ambiguous. Assign to low. `low_size -= 1`.

In the ambiguous case, if `val_out` was actually in high, then:
- `low_size` is decremented (wrong).
- `high_size` is not decremented (wrong).
- `removed[val_out]` is incremented.

During rebalancing, when we clean:
- If we clean from low and find `val_out` (as `-val_out` in low), we pop it. But `low_size` was already decremented, so we don't decrement again. But the element wasn't actually in low!
- If we clean from high and find `val_out`, we pop it. `high_size` was not decremented, so... wait, I said we don't decrement in clean.

I'm going in circles. Let me try a completely different approach.

Alternative: Use a sorted list with bisect. For each window, maintain a sorted list. Insertion and deletion are O(k) due to list shifting. Total: O(n*k) = 200,000 * 1,000 = 200,000,000. This might be too slow in Python.

Another alternative: Use `heapq` with a different strategy. 

Actually, let me look at this from a different angle. The issue with the two-heap approach is the ambiguity when removing. But there's a well-known solution that handles this correctly.

The key insight: when `val_out == -low[0]` (or more generally, when it's ambiguous), it doesn't matter which heap we assign it to, AS LONG AS we're consistent and the rebalancing handles it correctly.

Here's the trick: when we assign a removed element to the "wrong" heap, the size tracking is off by 1. But during rebalancing, when we move elements between heaps, the sizes get corrected.

Wait, no. If I decrement low_size when the element was actually in high, then low_size is too small and high_size is too large. During rebalancing, I'd move an extra element from high to low, which would make both sizes correct... but the physical heaps would have an extra element in low that shouldn't be there.

Hmm, I think the correct approach is:

When removing, if ambiguous, assign to low. During rebalancing, if we need to move from high to low, and the top of high is the removed element, we clean it (which doesn't affect sizes since we already decremented low_size). Wait, this is getting confusing.

Let me try yet another approach. Let me NOT track sizes separately. Instead, I'll clean both heaps before every size check.

```python
def effective_low_size():
    clean_low()
    return len(low)

def effective_high_size():
    clean_high()
    return len(high)
```

But cleaning is expensive if done repeatedly. However, each element is cleaned at most once, so the total cost of all cleaning operations is O(n log k) amortized.

Actually, the issue is that `clean_low()` only cleans the top. If a removed element is buried, it won't be cleaned until it reaches the top. So `len(low)` after cleaning might still include buried removed elements.

OK here's what I'll do. Let me use the size-tracking approach but handle the ambiguity correctly:

When removing `val_out`:
- `removed[val_out] += 1`
- If `val_out < -low[0]`: `low_size -= 1` (definitely in low)
- Elif `val_out > high[0]`: `high_size -= 1` (definitely in high)
- Else (ambiguous, i.e., `-low[0] <= val_out <= high[0]`): 
  - We'll assign to low: `low_size -= 1`
  - But we need to remember that this might have been in high.

Actually, I just realized: in the ambiguous case, `val_out == -low[0]` (since if it were strictly between, it would be > -low[0] and < high[0], which means it's in neither... wait no, it must be in one of them).

Hmm, actually if `-low[0] < val_out < high[0]`, then val_out is not the max of low and not the min of high. It's somewhere in the middle. It must be in one of the heaps. If it's in low, it's not the max (since -low[0] > val_out is false, wait I'm confusing myself).

Let me be precise:
- low is a max-heap (via negation). The max of low is `-low[0]`.
- high is a min-heap. The min of high is `high[0]`.
- Invariant: `-low[0] <= high[0]`.

If `val_out < -low[0]`: val_out is less than the max of low, so it must be in low (it can't be in high since all high elements >= high[0] >= -low[0] > val_out).

If `val_out > high[0]`: val_out is greater than the min of high, so it must be in high (it can't be in low since all low elements <= -low[0] <= high[0] < val_out).

If `-low[0] <= val_out <= high[0]`: val_out could be in either heap. Specifically:
- If `val_out == -low[0]`: it could be the max of low, or it could be in high (if high[0] == -low[0]).
- If `val_out == high[0]`: it could be the min of high, or it could be in low (if -low[0] == high[0]).
- If `-low[0] < val_out < high[0]`: this can't happen because all elements in low are <= -low[0] and all elements in high are >= high[0]. So val_out must be either in low (if val_out <= -low[0]) or in high (if val_out >= high[0]). Wait, that's contradictory. If -low[0] < val_out < high[0], then val_out > -low[0] means it's not in low (since all low elements <= -low[0]), and val_out < high[0] means it's not in high (since all high elements >= high[0]). Contradiction! So this case can't occur.

So the only ambiguous case is when `val_out == -low[0] == high[0]` (or when `-low[0] == high[0]` and `val_out` equals that value).

In this case, val_out could be in either heap. Let's just assign to low.

Now, if val_out was actually in high:
- We decrement low_size (wrong).
- We mark removed[val_out] += 1.
- During rebalancing, when we clean high, if val_out is at the top of high, we pop it. We don't adjust sizes in clean.
- But low_size was already decremented, so the total (low_size + high_size) is k-1, which is correct (we removed one element).
- The issue is the distribution: low_size is 1 too small, high_size is 1 too large.
- During rebalancing, we'd move one element from high to low to fix the distribution.
- But that element might be a valid element in high!

Hmm, this is problematic. Let me think differently.

Actually, you know what, I think the approach works correctly even in the ambiguous case. Here's why:

When we assign the removal to low (decrement low_size), and the element was actually in high:
- low_size is 1 too small.
- high_size is 1 too large.
- During rebalancing, we move 1 element from high to low.
- The element moved from high to low is the min of high.
- If the removed element was at the top of high, it gets cleaned (popped) during the move, and the next element is moved.
- If the removed element wasn't at the top of high, a valid element is moved to low.

In either case, after rebalancing:
- low_size is correct (it was decremented by 1 for the removal, and incremented by 1 for the move from high, net 0 change from the removal's perspective... wait no).

Let me think about this more carefully with an example.

Suppose k=3, target_low=2, target_high=1.
State: low=[-5, -3], high=[5]. low_size=2, high_size=1.
Invariant: -low[0]=5, high[0]=5. So -low[0] == high[0] == 5.

Remove val_out=5. Ambiguous (5 == -low[0] == high[0]). Assign to low.
removed[5]=1, low_size=1.

Now add val_in=7.
clean_low: low[0]=-5, removed.get(5,0)=1. Clean! Pop. low=[-3]. (low_size stays 1, we don't decrement in clean)
7 > -low[0]=3. Push to high. high=[5,7]. high_size=2.

rebalance: target_low=2.
clean_low: low[0]=-3, removed.get(3,0)=0. OK.
clean_high: high[0]=5, removed.get(5,0)=1. Clean! Pop. high=[7]. (high_size stays 2)
low_size=1 < 2. Pop from high: val=7. Push to low. low=[-7,-3]. low_size=2, high_size=1.

Median: -low[0]=7. 

The window was [3, 5, 7] (after removing 5 and adding 7 from [5,3,5,7]... wait let me set up a proper example.

nums = [5, 3, 5, 7], k=3.

Window 1: [5, 3, 5]. Sorted: [3, 5, 5]. Median: 5.
Window 2: [3, 5, 7]. Sorted: [3, 5, 7]. Median: 5.

Initialize:
add(5): low=[-5], low_size=1
add(3): 3 <= 5. Push to low. low=[-5,-3], low_size=2
add(5): 5 <= 5. Push to low. low=[-5,-3,-5], low_size=3
rebalance: target_low=2. low_size=3>2. Pop from low: val=5. Push to high. low=[-5,-3], low_size=2, high_size=1. high=[5].
Median: -low[0]=5. ✓

Window 2: remove 5 (nums[0]), add 7 (nums[3]).
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
val_out=5. 5 <= -low[0]=5. Assign to low. removed[5]=1, low_size=1.
val_in=7. clean_low: low[0]=-5, removed.get(5,0)=1. Clean! Pop. low=[-3,-5]... wait, the heap was [-5, -3, -5]. After popping the top (-5), the heap is restructured. Let me be more careful.

low as a heap: [-5, -3, -5]. The heap property: parent <= children. -5 <= -3 and -5 <= -5. OK.
After heappop: removes -5 (the first one). Remaining: [-5, -3]. Heap property: -5 <= -3. OK.
So low = [-5, -3]. This represents values {5, 3}.

Now, removed[5]=1. The -5 in low corresponds to value 5, which is marked as removed.
clean_low: low[0]=-5, removed.get(5,0)=1. Clean! Pop. low=[-3]. removed[5]=0.

Now low=[-3], low_size=1.
val_in=7. 7 > -low[0]=3. Push to high. high=[5,7]. high_size=2.

rebalance: target_low=2.
clean_low: low[0]=-3, removed.get(3,0)=0. OK.
clean_high: high[0]=5, removed.get(5,0)=0. OK. (The 5 in high was NOT the removed one; the removed 5 was in low and already cleaned.)
low_size=1 < 2. Pop from high: val=5. Push to low. low=[-5,-3]. low_size=2, high_size=1. high=[7].
Median: -low[0]=5. ✓

The 5 that was in high got moved to low. The removed 5 was in low and got cleaned. Everything works out!

Let me try the case where the removed 5 was actually in high:
nums = [3, 5, 5, 7], k=3.

Window 1: [3, 5, 5]. Sorted: [3, 5, 5]. Median: 5.
Window 2: [5, 5, 7]. Sorted: [5, 5, 7]. Median: 5.

Initialize:
add(3): low=[-3], low_size=1
add(5): 5 > 3. Push to high. high=[5], high_size=1
add(5): 5 > 3. Push to high. high=[5,5], high_size=2
rebalance: target_low=2. low_size=1<2. Pop from high: val=5. Push to low. low=[-5,-3]. low_size=2, high_size=1. high=[5].
Median: -low[0]=5. ✓

Window 2: remove 3 (nums[0]), add 7 (nums[3]).
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
val_out=3. 3 <= -low[0]=5. Assign to low. removed[3]=1, low_size=1.
val_in=7. clean_low: low[0]=-5, removed.get(5,0)=0. 7 > 5. Push to high. high=[5,7]. high_size=2.
rebalance: target_low=2.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
clean_high: high[0]=5, removed.get(5,0)=0. OK.
low_size=1 < 2. Pop from high: val=5. Push to low. low=[-5,-3,-5]. low_size=2, high_size=1. high=[7].
Median: -low[0]=5. ✓

Now let me try the truly ambiguous case where the removed element is in high:
nums = [5, 3, 5, 7], k=3. But this time, let's arrange so that the 5 to be removed is in high.

Actually, in my first trace, the 5 was in low (low=[-5,-3], high=[5]). The removed 5 was assigned to low, and it WAS in low. So it worked.

Let me try: nums = [3, 5, 5, 7], k=3. The first 3 is removed.
In my trace above, it worked fine.

Let me try: nums = [5, 5, 3, 7], k=3.
Window 1: [5, 5, 3]. Sorted: [3, 5, 5]. Median: 5.
Window 2: [5, 3, 7]. Sorted: [3, 5, 7]. Median: 5.

Initialize:
add(5): low=[-5], low_size=1
add(5): 5 <= 5. Push to low. low=[-5,-5], low_size=2
add(3): 3 <= 5. Push to low. low=[-5,-5,-3], low_size=3
rebalance: target_low=2. low_size=3>2. Pop: val=5. Push to high. low=[-5,-3]. low_size=2, high_size=1. high=[5].
Median: -low[0]=5. ✓

Window 2: remove 5 (nums[0]), add 7.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
val_out=5. 5 <= -low[0]=5. Assign to low. removed[5]=1, low_size=1.
val_in=7. clean_low: low[0]=-5, removed.get(5,0)=1. Clean! Pop. low=[-3]. removed[5]=0.
7 > 3. Push to high. high=[5,7]. high_size=2.
rebalance: target_low=2.
clean_low: low[0]=-3, removed.get(3,0)=0. OK.
clean_high: high[0]=5, removed.get(5,0)=0. OK.
low_size=1 < 2. Pop from high: val=5. Push to low. low=[-5,-3]. low_size=2, high_size=1. high=[7].
Median: -low[0]=5. ✓

The 5 in high was moved to low. The removed 5 was in low and got cleaned. 

Now let me try a case where the removed element is definitely in high:
nums = [3, 7, 5, 2], k=3.
Window 1: [3, 7, 5]. Sorted: [3, 5, 7]. Median: 5.
Window 2: [7, 5, 2]. Sorted: [2, 5, 7]. Median: 5.

Initialize:
add(3): low=[-3], low_size=1
add(7): 7 > 3. Push to high. high=[7], high_size=1
add(5): 5 > 3. Push to high. high=[7,5], high_size=2
rebalance: target_low=2. low_size=1<2. Pop from high: val=5. Push to low. low=[-5,-3]. low_size=2, high_size=1. high=[7].
Median: -low[0]=5. ✓

Window 2: remove 3, add 2.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
val_out=3. 3 <= -low[0]=5. Assign to low. removed[3]=1, low_size=1.
val_in=2. clean_low: low[0]=-5, removed.get(5,0)=0. 2 <= 5. Push to low. low=[-5,-3,-2]. low_size=2.
rebalance: target_low=2.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
low_size=2=target. Done.
Median: -low[0]=5. ✓

Note: low physically has [-5, -3, -2] where -3 is the removed element. But low_size=2 correctly. The removed 3 is buried in low.

Window 3 (if there were more elements): remove 7, add next.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
val_out=7. 7 <= -low[0]=5? No. 7 > high[0]=7? No, 7 == 7. So ambiguous. Assign to low. removed[7]=1, low_size=1.

Wait, but 7 is in high, not low! This is the problematic case.

Let me continue:
val_in = next element, say 4.
clean_low: low[0]=-5, removed.get(5,0)=0. 4 <= 5. Push to low. low=[-5,-3,-2,-4]. low_size=2.
rebalance: target_low=2.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
clean_high: high[0]=7, removed.get(7,0)=1. Clean! Pop. high=[]. removed[7]=0.
low_size=2=target. Done.
Median: -low[0]=5.

The window is [5, 2, 4]. Sorted: [2, 4, 5]. Median: 4. But I got 5!

Wait, let me recheck. nums = [3, 7, 5, 2, 4], k=3.
Window 1: [3,7,5] → median 5
Window 2: [7,5,2] → median 5
Window 3: [5,2,4] → median 4

Let me redo from window 2:
After window 1: low=[-5,-3], high=[7], low_size=2, high_size=1.

Window 2: remove 3, add 2.
clean_low: low[0]=-5, removed.get(5,0)=0.
val_out=3. 3 <= 5. Assign to low. removed[3]=1, low_size=1.
val_in=2. clean_low: low[0]=-5, removed.get(5,0)=0. 2<=5. Push to low. low=[-5,-3,-2]. low_size=2.
rebalance: clean_low: low[0]=-5, removed.get(5,0)=0. OK. low_size=2=target. Done.
Median: -low[0]=5. ✓

Window 3: remove 7, add 4.
clean_low: low[0]=-5, removed.get(5,0)=0.
val_out=7. 7 <= -low[0]=5? No. 7 > high[0]=7? No (equal). Ambiguous. Assign to low. removed[7]=1, low_size=1.
val_in=4. clean_low: low[0]=-5, removed.get(5,0)=0. 4<=5. Push to low. low=[-5,-3,-2,-4]. low_size=2.
rebalance: target_low=2.
clean_low: low[0]=-5, removed.get(5,0)=0. OK.
clean_high: high[0]=7, removed.get(7,0)=1. Clean! Pop. high=[]. removed[7]=0.
low_size=2=target. Done.
Median: -low[0]=5.

But the correct median is 4! The window is [5,2,4], sorted [2,4,5], median=4.

The problem: 7 was in high, but I assigned its removal to low. So low_size was decremented (from 2 to 1), then incremented (from 1 to 2) when I added 4. Net: low_size=2. But physically, low has [-5,-3,-2,-4] (4 elements, one of which is the removed 3). The effective low should be {5, 2, 4} → but wait, 7 was removed, so the window is [5,2,4]. The effective low should have 2 elements: the two smallest of {5,2,4} which are 2 and 4. So low should be [-4,-2] and high should be [5].

But in my trace, low=[-5,-3,-2,-4] with low_size=2. The effective elements in low are {5, 2, 4} (since 3 is removed). That's 3 elements, but low_size says 2. This is inconsistent!

The issue: I decremented low_size for removing 7 (which was in high), but 7 was never in low. So low_size is off by 1.

After remove: low_size should still be 2 (since 7 was in high, not low). But I set it to 1.
After add: low_size becomes 2. But it should be... let's see. The window is [5,2,4]. target_low=2. The two smallest are 2 and 4. So low should have {2,4} and high should have {5}. low_size should be 2.

In my trace, low_size=2 after rebalancing. But the physical low has elements {5, 3(removed), 2, 4}. The effective elements are {5, 2, 4} (3 elements). But low_size=2.

During rebalancing, I check low_size=2=target. So I don't move anything. But the effective low has 3 elements, not 2!

The problem is that low_size doesn't accurately reflect the number of effective elements in low. I decremented it for a removal that wasn't in low.

So the approach of "assign ambiguous removals to low" doesn't work correctly.

I need a different strategy. Let me think...

Option 1: Always assign the removal to the correct heap. To do this, I need to know which heap the element is in. For the ambiguous case (val == -low[0] == high[0]), I can't determine this without additional information.

Option 2: Don't track sizes at all. Instead, clean both heaps fully before every operation. But "fully cleaning" means removing all marked elements, which could be expensive.

Option 3: Use a different data structure. For example, use two `SortedList`-like structures. But we only have the standard library.

Option 4: Use the `bisect` module to maintain two sorted lists. Insertion and deletion are O(k) due to list shifting. Total: O(n*k) = 200,000 * 1,000 = 200,000,000. In Python, list insert/delete is O(k) but with a small constant (memmove). 200,000 * 1,000 = 200 million element moves. Each move is a pointer copy (8 bytes). So about 1.6 GB of memory movement. This might take 1-2 seconds in C (which is what list insert/delete uses). In Python, the overhead might make it slower.

Actually, let me benchmark mentally: `list.insert` and `list.pop` in the middle of a list of size 1000 involve moving ~500 elements on average. 200,000 iterations * 2 operations (remove + add) * 500 element moves = 200,000,000 element moves. Each move is a pointer copy. In C, this is very fast. Python's list operations are implemented in C, so this should be fast. Maybe 0.5-1 second.

But we also need to find the median, which is O(1) with sorted lists (just index into the list).

Let me go with the sorted list approach using `bisect`:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    if k == 1:
        return list(nums)
    
    # Maintain two sorted lists: low (lower half) and high (upper half)
    # For odd k: len(low) = (k+1)//2, len(high) = (k-1)//2
    # For even k: len(low) = k//2, len(high) = k//2
    low = []
    high = []
    
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    # Initialize
    for i in range(k):
        if len(low) < target_low and (not high or nums[i] <= high[0]):
            bisect.insort(low, nums[i])
        else:
            bisect.insort(high, nums[i])
    
    # Rebalance
    while len(low) > target_low:
        low.pop()
        bisect.insort(high, low[-1])  # Wait, this is wrong
```

Hmm, this is getting complicated. Let me think of a cleaner approach.

Actually, let me just maintain ONE sorted list of size k, and for each window, insert the new element and remove the old element.

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    
    # Initialize sorted window
    window = sorted(nums[:k])
    
    result = []
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
    
    for i in range(k, n):
        # Remove nums[i-k]
        val_out = nums[i - k]
        idx = bisect.bisect_left(window, val_out)
        window.pop(idx)
        # Add nums[i]
        val_in = nums[i]
        bisect.insort(window, val_in)
        
        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

This is O(n * k) due to the list insert/delete being O(k). For n=200,000 and k=1,000, that's 200,000 * 1,000 = 200,000,000 operations (element moves). In CPython, list pop and insert in the middle involve memmove of ~k/2 elements on average. So 200,000 * 2 * 500 = 200,000,000 pointer moves. Each pointer is 8 bytes, so 1.6 GB of memory movement. This should take about 0.5-1 second on a modern PC.

Actually, let me reconsider. `bisect.bisect_left` is O(log k). `list.pop(idx)` is O(k) (shifts elements). `bisect.insort` is O(k) (shifts elements). So per iteration: O(log k + k + k) = O(k). Total: O(n * k) = 200,000 * 1,000 = 200,000,000.

In practice, the constant factor for list operations in CPython is very small (just pointer moves in C). So this should be fast enough.

Let me verify: 200,000 iterations, each doing a pop (shifting ~500 elements) and an insert (shifting ~500 elements). That's ~1000 element moves per iteration, 200,000,000 total. At ~1ns per element move (optimistic), that's 0.2 seconds. More realistically, maybe 0.5-1 second. Should be under 2 seconds.

Let me go with this approach. It's simpler and correct.

Wait, but I should double-check: is `bisect.insort` O(k)? Yes, because it does a `list.insert` which is O(k) due to shifting.

And `list.pop(idx)` is O(k) for the same reason.

So the total is O(n*k) which for n=200,000 and k=1,000 is 2*10^8. This should be fine.

Let me finalize the code:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    window = sorted(nums[:k])
    
    result = []
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
    
    for i in range(k, n):
        val_out = nums[i - k]
        idx = bisect.bisect_left(window, val_out)
        window.pop(idx)
        
        val_in = nums[i]
        bisect.insort(window, val_in)
        
        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

This should work correctly and efficiently. Let me verify with a small example:

nums = [1, 3, 5, 7, 9], k = 3
window = [1, 3, 5], mid = 1, median = 3
i=3: remove 1, add 7. window = [3, 5, 7]. median = 5.
i=4: remove 3, add 9. window = [5, 7, 9]. median = 7.
Result: [3.0, 5.0, 7.0]. ✓

nums = [1, 3, 2, 4], k = 2
window = [1, 3], mid = 1, median = (1+3)/2 = 2.0
i=2: remove 1, add 2. window = [2, 3]. median = (2+3)/2 = 2.5.
i=3: remove 3, add 4. window = [2, 4]. median = (2+4)/2 = 3.0.
Result: [2.0, 2.5, 3.0]. ✓

Looks good! Let me also make sure the return type is correct - all values should be floats.

For odd k: `float(window[mid])` - this converts to float. ✓
For even k: `(window[mid-1] + window[mid]) / 2.0` - division by 2.0 gives a float. ✓

I think this solution is correct and efficient enough. Let me write the final version.
