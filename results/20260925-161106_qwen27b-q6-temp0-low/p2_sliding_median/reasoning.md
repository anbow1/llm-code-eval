The user wants a `sliding_median` function that efficiently computes the median of every sliding window of size k over a list of floats.

Key constraints:
1. For even k, median is the mean of two middle values
2. Return floats
3. Raise ValueError if k < 1 or k > len(nums)
4. Must be efficient: n = 200,000, k = 1,000 must finish well under 2 seconds

The naive approach would be O(n*k*log(k)) which for n=200k, k=1000 would be 200k * 1000 * log(1000) ≈ 200M * 10 = 2 billion operations. That's too slow in Python.

A better approach is to use two heaps (or two sorted structures) to maintain the median in O(log k) per slide, giving O(n * log k) total.

The classic approach uses two heaps:
- A max-heap for the lower half
- A min-heap for the upper half

But in Python, we only have `heapq` (min-heap), so we negate values for the max-heap.

The challenge with sliding window is handling removals. When an element leaves the window, we need to remove it from the appropriate heap. Since heaps don't support efficient deletion, we can use a "lazy deletion" approach with a dictionary to track elements that should be removed.

Let me think about this more carefully:

1. Maintain two heaps:
   - `low`: max-heap (negated values) for the lower half
   - `high`: min-heap for the upper half

2. Maintain a `to_remove` dictionary to track lazy deletions.

3. After each slide, we need to:
   - Remove the element that left the window (mark in to_remove)
   - Add the new element
   - Rebalance the heaps
   - Clean up top of heaps if they have marked-for-removal elements

Let me think about the balancing:
- We want len(low) == len(high) or len(low) == len(high) + 1 (for odd k)
- For even k, len(low) == len(high)

Actually, let me think about this differently. The standard approach:
- low (max-heap) should have ceil(k/2) elements
- high (min-heap) should have floor(k/2) elements

For odd k: median = max(low) = -low[0]
For even k: median = (-low[0] + high[0]) / 2

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    to_remove = defaultdict(int)
    
    def clean(heap):
        while heap and to_remove[-heap[0] if heap is low else heap[0]] > 0:
            # Wait, this is getting confusing with negation
            pass
    
    # Let me rethink...
```

Actually, let me use a cleaner approach. I'll track values in both heaps with a dictionary for lazy deletion.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap: store negated values
    high = []  # min-heap: store values
    to_remove = defaultdict(int)
    
    def clean_low():
        while low and to_remove[-low[0]] > 0:
            to_remove[-low[0]] -= 1
            heapq.heappop(low)
    
    def clean_high():
        while high and to_remove[high[0]] > 0:
            to_remove[high[0]] -= 1
            heapq.heappop(high)
    
    def rebalance():
        # We want len(low) >= len(high) and len(low) - len(high) <= 1
        # Target: len(low) = (k+1)//2, len(high) = k//2
        target_low = (k + 1) // 2
        target_high = k // 2
        
        while len(low) < target_low and high:
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
        while len(high) < target_high and low:
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        while len(low) > target_low:
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        while len(high) > target_high:
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
    
    result = []
    for i in range(n):
        # Add new element
        if not low or nums[i] <= -low[0]:
            heapq.heappush(low, -nums[i])
        else:
            heapq.heappush(high, nums[i])
        
        rebalance()
        
        if i >= k:
            # Remove element that left the window
            val = nums[i - k]
            to_remove[val] += 1
            # We need to figure out which heap it was in
            # If val <= -low[0], it's in low, else in high
            # But after rebalance, -low[0] might have changed...
            # Actually, we should just mark it for removal and clean up
            clean_low()
            clean_high()
            rebalance()
        
        if i >= k - 1:
            if k % 2 == 1:
                result.append(float(-low[0]))
            else:
                result.append((-low[0] + high[0]) / 2.0)
    
    return result
```

Wait, there's a problem. When I mark an element for removal, I don't know which heap it's in. The `to_remove` dict handles both - I just call `clean_low()` and `clean_high()` and whichever heap has the element at the top will get it cleaned.

But there's a subtle issue: if the element to remove is in `low` but it's not at the top, `clean_low()` won't remove it. It'll stay in the heap until it reaches the top. That's fine for correctness - it just means the heap sizes are "off" by the number of lazy-deleted elements.

So I need to track the "effective" sizes. Let me use a different approach: track how many elements have been lazily deleted from each heap.

Actually, let me reconsider. The standard approach is:

- Track `low_count` and `high_count` as the actual number of elements in each heap (including those marked for removal).
- When we remove an element, we mark it in `to_remove` and decrement the count of whichever heap it belongs to.

But we don't know which heap it belongs to! That's the issue.

One approach: we can determine which heap an element belongs to by comparing it with the max of low (i.e., -low[0]). If val <= -low[0], it was in low. Otherwise, it was in high.

Wait, but that's not necessarily true after rebalancing. An element could have been moved between heaps during rebalancing.

Hmm, let me think differently. Actually, the property is:
- All elements in low are <= all elements in high (after rebalancing)
- So if val <= -low[0] (max of low), it must be in low
- If val > -low[0], it must be in high

Wait, that's not quite right either. val could be equal to -low[0] and be in either heap. But for our purposes, we can just say: if val <= -low[0], mark it in low's removal; else mark it in high's removal.

Actually no, the cleaner approach is: we don't need to know which heap it's in. We just add to `to_remove[val]` and then clean both heaps. The element will be cleaned from whichever heap it's in when it reaches the top.

But the problem is with rebalancing - we need to know the effective sizes. Let me track:
- `low_size`: number of valid elements in low
- `high_size`: number of valid elements in high

When we add an element, we increment the appropriate size.
When we remove an element, we need to know which heap it's in to decrement the right size.

To determine which heap: if val <= -low[0], it's in low (or could be, since low contains the smaller values). Otherwise it's in high.

But wait - what if the element was already lazily removed and we're trying to remove it again? No, that can't happen because each element enters and leaves the window exactly once.

Let me try this approach:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    to_remove = defaultdict(int)
    low_size = 0
    high_size = 0
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean_low():
        nonlocal low_size
        while low:
            val = -low[0]
            if to_remove[val] > 0:
                to_remove[val] -= 1
                heapq.heappop(low)
                low_size -= 1
            else:
                break
    
    def clean_high():
        nonlocal high_size
        while high:
            val = high[0]
            if to_remove[val] > 0:
                to_remove[val] -= 1
                heapq.heappop(high)
                high_size -= 1
            else:
                break
    
    def rebalance():
        nonlocal low_size, high_size
        # Move from high to low
        while low_size < target_low and high_size > 0:
            clean_high()
            if high_size > 0:
                val = heapq.heappop(high)
                heapq.heappush(low, -val)
                high_size -= 1
                low_size += 1
        # Move from low to high
        while high_size < target_high and low_size > 0:
            clean_low()
            if low_size > 0:
                val = -heapq.heappop(low)
                heapq.heappush(high, val)
                low_size -= 1
                high_size += 1
        # If low is too big, move to high
        while low_size > target_low:
            clean_low()
            if low_size > target_low:
                val = -heapq.heappop(low)
                heapq.heappush(high, val)
                low_size -= 1
                high_size += 1
        # If high is too big, move to low
        while high_size > target_high:
            clean_high()
            if high_size > target_high:
                val = heapq.heappop(high)
                heapq.heappush(low, -val)
                high_size -= 1
                low_size += 1
    
    result = []
    for i in range(n):
        # Add nums[i]
        if low_size > 0 and nums[i] <= -low[0]:
            heapq.heappush(low, -nums[i])
            low_size += 1
        else:
            heapq.heappush(high, nums[i])
            high_size += 1
        
        rebalance()
        
        if i >= k:
            # Remove nums[i-k]
            val = nums[i - k]
            if val <= -low[0]:
                to_remove[val] += 1
                low_size -= 1
            else:
                to_remove[val] += 1
                high_size -= 1
            rebalance()
        
        if i >= k - 1:
            clean_low()
            clean_high()
            if k % 2 == 1:
                result.append(float(-low[0]))
            else:
                result.append((-low[0] + high[0]) / 2.0)
    
    return result
```

Hmm, this is getting complicated and I'm not 100% sure about the correctness of the removal step. The issue is: when we say "if val <= -low[0], it's in low", that's true only if the invariant holds (all elements in low <= all elements in high). But after a lazy removal, the top of low might change.

Actually, let me reconsider. The invariant is: every element in low <= every element in high. When we add an element, we put it in low if it's <= max(low), else in high. When we remove an element, if val <= max(low) (i.e., -low[0]), it must be in low (because all elements in high are >= max(low) > val... wait, not necessarily > val, it could be equal).

Actually the invariant should be: max(low) <= min(high). So if val <= max(low), it's in low. If val >= min(high), it's in high. If val == max(low) == min(high), it could be in either.

For the case where val == max(low) == min(high), we can put it in either. Let's say we put it in low. Then when we clean low, we'll find it there.

But wait, there's another subtlety. What if val is in low but not at the top? Then when we do `if val <= -low[0]`, it's still true (since val <= max(low) = -low[0]). So we correctly identify it as being in low. Good.

What if val is in high? Then val >= min(high) >= max(low) = -low[0]. So `val <= -low[0]` is false (unless val == -low[0]). In the equal case, we'd incorrectly say it's in low. But that's fine because:
- We mark to_remove[val] += 1
- We decrement low_size
- When we clean low, we'll check the top. If the top is val, we remove it. If not, the lazy deletion stays until it reaches the top.
- But we decremented low_size, which is wrong because the element is actually in high!

This is a real bug. Let me think of a different approach.

Alternative: Instead of trying to determine which heap the element is in, let's just track a global set of elements to remove and handle it during rebalancing.

Actually, a cleaner approach: use a "sorted list" approach. Python doesn't have a built-in sorted list with O(log n) insert/delete, but we can use `bisect` on a list - but that gives O(n) for insert/delete.

For n=200k and k=1000, that would be 200k * 1000 = 200M operations for the list operations, which might be too slow in pure Python.

Let me go back to the two-heap approach but be more careful.

Actually, I think the correct approach is:

When removing an element `val`:
- If `val <= -low[0]` (max of low): the element is in low. Mark for removal, decrement low_size.
- Else: the element is in high. Mark for removal, decrement high_size.

The edge case is when `val == -low[0]`. In this case, the element could be in either heap. But here's the key insight: if val == -low[0], then val is the maximum of low. It MUST be in low (because if it were only in high, then -low[0] would be something else... wait no, there could be duplicates).

Hmm, let me think about this differently. 

Actually, you know what, let me just use a different strategy. Instead of trying to figure out which heap to remove from, I'll just add to `to_remove[val]` and then during rebalancing, I'll clean both heaps. For the sizes, I'll track them differently.

Let me use a completely different approach: track the "logical" size (number of non-removed elements) separately, and when removing, just figure out which heap by comparison:

Actually, I realize the issue is simpler than I thought. Let me re-examine:

The invariant is: all elements in `low` ≤ all elements in `high`.

When we want to remove `val`:
- If `val < -low[0]`: definitely in low
- If `val > high[0]`: definitely in high  
- If `-low[0] <= val <= high[0]`: could be in either (this only happens when low[0] == high[0] or the heaps are empty)

In the ambiguous case, we can assign it to either heap. Let's assign to low. Then:
- We increment to_remove[val]
- We decrement low_size
- During cleaning, if val reaches the top of high, it will be cleaned there (but we already decremented low_size!)

This is the fundamental issue. The lazy deletion approach doesn't work cleanly when we don't know which heap the element is in.

Alternative solution: DON'T use lazy deletion. Instead, when removing an element, actually find and remove it from the heap. This takes O(k) in the worst case (scanning the heap), giving O(n*k) total which is 200k * 1000 = 200M... might be borderline in Python.

Actually, for the worst case of scanning a heap of size 1000, that's 1000 comparisons per removal, and we have 200k removals, so 200M comparisons. In Python that's probably too slow (each comparison is a Python bytecode operation, so maybe 10-50 seconds).

Let me think of yet another approach.

What about using two "sorted lists" with a balanced approach? We could use `bisect.insort` on a list of size k. Each insert/delete is O(k) due to list shifting, but the constant factor is small (it's just memmove in C). For k=1000, that's 1000 * 8 bytes = 8KB of memmove per operation, which is very fast in C. 200k operations * 8KB memmove = should be well under 2 seconds.

Let me try this:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []  # sorted list
    result = []
    
    for i in range(n):
        # Add nums[i]
        bisect.insort(window, nums[i])
        
        if i >= k:
            # Remove nums[i-k]
            idx = bisect.bisect_left(window, nums[i-k])
            window.pop(idx)
        
        if len(window) == k:
            if k % 2 == 1:
                result.append(float(window[k // 2]))
            else:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    
    return result
```

This is O(n * k) due to the list insert/delete (memmove). For n=200k, k=1000:
- Each insort: O(k) comparisons (binary search) + O(k) memmove
- Each pop: O(k) memmove
- Total: O(n * k) = 200k * 1000 = 200M element moves

Each element move is just moving a pointer (8 bytes on 64-bit), so 200M * 8 = 1.6 GB of memory movement. At ~10 GB/s, that's 0.16 seconds for the memmove alone. Plus the binary search comparisons.

Actually, `bisect.insort` does a binary search (O(log k) comparisons) followed by a list insert (O(k) memmove). The memmove is done in C, so it's very fast. Let me estimate:
- 200k iterations
- Each: binary search (~10 comparisons) + insert (memmove of up to 1000 * 8 bytes = 8KB) + possibly a pop (memmove of up to 1000 * 8 bytes)
- Total memmove: ~200k * 16KB = 3.2 GB
- At 10 GB/s: ~0.32 seconds
- Plus Python overhead for the loop, bisect calls, etc.

This should be well under 2 seconds! Let me go with this approach.

Wait, but I need to be careful with `bisect_left` for the removal. If there are duplicate values, `bisect_left` will find the first occurrence. Since we're removing a specific value that's in the list, and there might be duplicates, `bisect_left` will find the correct position (the first occurrence of that value, which is one of the instances of that value in the list). Since all instances of the same value are identical, removing any one of them is fine.

Actually wait, let me reconsider. `bisect_left(window, val)` returns the leftmost position where `val` could be inserted to maintain order. If `val` is already in the list, it returns the position of the first occurrence. So `window.pop(bisect_left(window, val))` will remove the first occurrence of `val`. Since we know `val` is in the window (it was added and hasn't been removed yet), this is correct.

Let me also consider: is there a risk that `bisect_left` returns a position where the value isn't actually `val`? No, because we know `val` is in the window, and `bisect_left` returns the first position where `window[pos] >= val`. Since `val` is in the window, there must be some position where `window[pos] == val`, and `bisect_left` will return a position <= that position. At that returned position, `window[pos]` must be `>= val`. But since all elements before the first `val` are `< val` (by sorted order), `window[bisect_left(window, val)]` must be `== val`.

Great, so the approach is correct.

Let me also handle the edge case where nums is empty (k > len(nums) would catch it since k >= 1 > 0 = len(nums)).

Actually wait, what if nums is empty and k is 0? Then k < 1 raises ValueError. Good.

What if nums is empty and k is 1? Then k > len(nums) = 0, so ValueError. Good.

Let me finalize the solution:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []
    result = []
    insort = bisect.insort
    bisect_left = bisect.bisect_left
    
    for i in range(n):
        insort(window, nums[i])
        
        if i >= k:
            idx = bisect_left(window, nums[i - k])
            window.pop(idx)
        
        if len(window) == k:
            if k & 1:
                result.append(float(window[k >> 1]))
            else:
                mid = k >> 1
                result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

This should be efficient enough. Let me double-check the median calculation:
- k = 5 (odd): median is window[2] (0-indexed), which is window[k>>1] = window[2]. ✓
- k = 4 (even): median is (window[1] + window[2]) / 2, which is (window[mid-1] + window[mid]) / 2 where mid = 2. ✓
- k = 1 (odd): median is window[0]. ✓
- k = 2 (even): median is (window[0] + window[1]) / 2. ✓

Looks good. Let me also make sure I'm using local variables for speed (binding `insort` and `bisect_left` locally).

One more thought: for the performance requirement, let me consider if there's anything I can optimize further. The main bottleneck is the O(k) list insert and delete. For k=1000, this involves moving about 1000 pointers (8 bytes each = 8KB). With 200k iterations, that's about 1.6 GB of pointer movement. At typical memory bandwidth, this should take well under a second.

The binary search part is O(log k) ≈ 10 comparisons per operation, so 200k * 10 = 2M comparisons, which is negligible.

I think this solution will comfortably meet the 2-second requirement. Let me write the final version.
