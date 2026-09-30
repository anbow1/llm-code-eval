The user wants a sliding window median function that's efficient for n=200,000 and k=1,000.

Let me think about approaches:

1. **Naive approach**: For each window, sort the k elements and find the median. This is O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * 10 = 2 * 10^9 operations. Too slow.

2. **Two heaps approach**: Use a max-heap for the lower half and a min-heap for the upper half. This gives O(n*log(k)) which is 200,000 * 10 = 2 * 10^6 operations. This should be fast enough.

The challenge with two heaps for sliding window is handling deletions. We need to support:
- Adding a new element
- Removing an old element (the one leaving the window)
- Getting the median

The standard approach is to use lazy deletion with two heaps:
- `low` = max-heap (store negated values) for the lower half
- `high` = min-heap for the upper half
- A `delayed` dict to track lazy deletions

Let me think about the two-heaps approach more carefully:

- We maintain `low` (max-heap) and `high` (min-heap)
- `low` contains the smaller half, `high` contains the larger half
- We maintain the invariant: `len(low) == len(high)` or `len(low) == len(high) + 1` (for odd k, low has one more)
- Actually for even k, we want `len(low) == len(high)`, and for odd k, `len(low) == len(high) + 1`

Wait, let me reconsider. For the median:
- If k is odd: median is the max of the lower half (which has k//2 + 1 elements)
- If k is even: median is (max of lower half + min of upper half) / 2

So the invariant should be:
- `len(low) == (k + 1) // 2`
- `len(high) == k // 2`

This means for odd k, low has one more element than high. For even k, they're equal.

For lazy deletion:
- When we need to remove an element, we mark it in a `delayed` dict
- When cleaning a heap, we pop elements that are in the `delayed` dict

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # low: max-heap (negated), high: min-heap
    low = []  # max-heap via negation
    high = []  # min-heap
    delayed = defaultdict(int)  # lazy deletion counts
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean(heap):
        while heap and -heap[0] in delayed if heap is low else heap[0] in delayed:
            # This is getting complicated with the negation
            pass
    
    # Let me use a different approach - store values and use a helper
```

Actually, let me reconsider. The lazy deletion with two heaps is a bit tricky with the negation. Let me use a cleaner approach.

I'll use:
- `low` as a max-heap (store `-x` for value `x`)
- `high` as a min-heap (store `x`)
- `delayed` as a Counter/dict tracking which values to delete

For cleaning:
- `clean_low()`: while `low` is non-empty and `-low[0]` is in `delayed`, pop from `low` and decrement `delayed`
- `clean_high()`: while `high` is non-empty and `high[0]` is in `delayed`, pop from `high` and decrement `delayed`

Wait, but with floats, using them as dict keys could be problematic due to floating point precision. Actually, since we're storing the exact same float objects, it should be fine - we're just checking if the value at the top of the heap is one we've marked for deletion.

Hmm, but there's a subtlety. If we have duplicate values, we need to handle counts. The `delayed` dict with counts handles this.

Let me write this more carefully:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (negated values)
    high = []  # min-heap
    delayed = defaultdict(int)
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean_low():
        while low:
            val = -low[0]
            if delayed[val] > 0:
                heapq.heappop(low)
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
            else:
                break
    
    def clean_high():
        while high:
            val = high[0]
            if delayed[val] > 0:
                heapq.heappop(high)
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
            else:
                break
    
    def rebalance():
        # Ensure len(low) == target_low and len(high) == target_high
        while len(low) - len(delayed_low_count()) != target_low or ...:
            pass
```

Hmm, this is getting complicated because the actual sizes of the heaps include the delayed (to-be-deleted) elements. Let me think differently.

Actually, the standard approach is:
- The "effective" size of `low` is `len(low)` minus the number of delayed elements that are in `low`
- But we don't track which delayed elements are in which heap

The simpler approach: just use `len(low)` and `len(high)` as the sizes, and when we add/remove, we adjust. The delayed elements are still in the heaps but will be cleaned when they reach the top.

Let me look at this differently. The standard sliding window median with two heaps:

1. Initialize: add first k elements to the heaps
2. For each slide:
   a. Remove the element leaving the window (lazy delete)
   b. Add the element entering the window
   c. Rebalance
   d. Compute median

For rebalancing, we need to track the "logical" sizes. The logical size of a heap is its actual length minus the number of elements marked for deletion that are in that heap. But we don't know which delayed elements are in which heap.

Alternative: track sizes separately.

Let me use a different approach:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (negated)
    high = []  # min-heap
    delayed = defaultdict(int)
    
    def clean(heap, negate=False):
        while heap:
            top = -heap[0] if negate else heap[0]
            if delayed[top]:
                heapq.heappop(heap)
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
            else:
                break
    
    def add(val):
        if not low or val <= -low[0]:
            heapq.heappush(low, -val)
        else:
            heapq.heappush(high, val)
        rebalance()
    
    def remove(val):
        delayed[val] += 1
        if val <= -low[0]:
            heapq.heappop(low)
        else:
            heapq.heappop(high)
        rebalance()
    
    def rebalance():
        # We want len(low) == (k+1)//2 and len(high) == k//2
        # But these are logical sizes... 
        pass
```

The problem is that with lazy deletion, the physical sizes of the heaps don't match the logical sizes. We need to be more careful.

Let me try a different approach. I'll track the logical sizes explicitly:

Actually, the cleanest approach I've seen for this:

- Use two heaps with lazy deletion
- Track the "size" of each heap as a separate variable (logical size)
- When adding: add to appropriate heap, increment logical size, rebalance
- When removing: mark as delayed, if it's at the top of the appropriate heap, pop it and decrement logical size, then rebalance
- Rebalance: move elements between heaps to maintain the size invariant

Wait, the issue is: when we remove an element, we don't always know which heap it's in (unless it's at the top). The standard approach:

For `remove(val)`:
- Mark `delayed[val] += 1`
- If `val <= -low[0]` (i.e., it belongs in low), then pop from low and decrement low's logical size
- Else, pop from high and decrement high's logical size
- Rebalance

But wait, `val` might not be at the top of its heap. The standard trick is:
- If `val` is at the top of the heap it belongs to, pop it
- Otherwise, just mark it as delayed (it'll be cleaned when it reaches the top)

And for rebalancing, we use the logical sizes.

Let me try yet another approach. I'll use a sorted list with bisect. For k=1000, inserting and removing from a sorted list of size 1000 is O(k) = O(1000). Total: O(n*k) = 200,000 * 1,000 = 2 * 10^8. In Python, this might be too slow... each operation on a list of 1000 elements involves moving ~500 elements on average, so it's about 10^11 byte moves. That's probably too slow in Python.

Let me stick with the two-heaps approach.

Here's my refined plan:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (negated values)
    high = []  # min-heap
    delayed = defaultdict(int)
    
    # Logical sizes
    low_size = 0
    high_size = 0
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean_low():
        nonlocal low_size
        while low:
            val = -low[0]
            if delayed[val]:
                heapq.heappop(low)
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
                low_size -= 1
            else:
                break
    
    def clean_high():
        nonlocal high_size
        while high:
            val = high[0]
            if delayed[val]:
                heapq.heappop(high)
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
                high_size -= 1
            else:
                break
    
    def rebalance():
        nonlocal low_size, high_size
        # Move from low to high if low is too big
        while low_size > target_low:
            clean_low()
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        # Move from high to low if high is too big
        while high_size > target_high:
            clean_high()
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        # If low is too small, pull from high
        while low_size < target_low:
            clean_high()
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        # If high is too small, pull from low
        while high_size < target_high:
            clean_low()
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
    
    def add(val):
        nonlocal low_size, high_size
        if low_size < target_low and (not low or val <= -low[0]):
            heapq.heappush(low, -val)
            low_size += 1
        else:
            heapq.heappush(high, val)
            high_size += 1
        rebalance()
    
    def remove(val):
        nonlocal low_size, high_size
        delayed[val] += 1
        if val <= -low[0]:
            low_size -= 1
        else:
            high_size -= 1
        rebalance()
    
    result = []
    
    # Initialize with first k elements
    for i in range(k):
        add(nums[i])
    result.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, there's an issue with `remove`. When we call `remove(val)`, we check `val <= -low[0]` to determine which heap it belongs to. But what if `low` is empty? That shouldn't happen since k >= 1 and we always maintain at least one element in low.

Also, there's a subtle issue: after marking `delayed[val] += 1`, the top of the heap might be a delayed element. So when we check `val <= -low[0]`, the top might be stale.

Let me fix this: before checking which heap a value belongs to, we should clean the tops.

Actually, the standard approach is:
- In `remove(val)`: 
  - If `val <= -low[0]`: it's in low, so `low_size -= 1`, mark delayed
  - Else: it's in high, so `high_size -= 1`, mark delayed
  - Then rebalance (which will clean as needed)

But the check `val <= -low[0]` might be wrong if `-low[0]` is a delayed element. Let me clean first.

Actually, I think the correct approach is:

```python
def remove(val):
    nonlocal low_size, high_size
    delayed[val] += 1
    # Determine which heap it logically belongs to
    if val <= -low[0]:
        low_size -= 1
    else:
        high_size -= 1
    rebalance()
```

And in `rebalance`, we clean the tops before moving elements. This should work because:
- The logical size tells us the true count
- When we need to move an element, we clean first to ensure we're moving a valid element

Let me also handle the edge case where `low` might appear empty (all elements are delayed). The `clean` functions handle this.

Let me also think about whether `val <= -low[0]` is correct. If `low[0]` is a delayed element, then `-low[0]` might not be the true max of low. But we just increment `delayed[val]` and then check. The issue is: if the true max of low is less than `val`, but the physical top of low (which is delayed) is greater than `val`, we'd incorrectly put it in low.

To handle this correctly, I should clean the tops before making the comparison:

```python
def remove(val):
    nonlocal low_size, high_size
    delayed[val] += 1
    clean_low()  # Clean the top of low
    if val <= -low[0]:
        low_size -= 1
    else:
        high_size -= 1
    rebalance()
```

Hmm, but `clean_low()` already decrements `low_size` when it pops a delayed element. So after cleaning, `low_size` reflects the true count. Then we decrement it further for the element we're removing. That should be correct.

Wait, no. Let me re-examine. `clean_low()` pops elements from the physical heap that are marked as delayed, and decrements `low_size` for each. So after `clean_low()`, the top of `low` is a valid (non-delayed) element, and `low_size` is the count of valid elements in low.

Then if `val <= -low[0]`, it means `val` belongs in low, so we decrement `low_size`.

This seems correct.

But wait, there's another issue. What if `val` is in `high` but `val <= -low[0]`? That can't happen because of the heap invariant: all elements in low are <= all elements in high. So if `val <= max(low)`, it must be in low (or it's a new element being added, but for remove, it was previously in one of the heaps).

Actually, that's not quite right either. The invariant is that the max of low <= min of high. So if `val <= max(low)`, it could be in low. If `val > max(low)`, it must be in high (since all elements in high are >= min(high) >= max(low) > val... wait no, that's backwards).

Let me reconsider. The invariant is: max(low) <= min(high). So:
- If val <= max(low), val is in low
- If val > max(low), val is in high (since val >= min(high) > max(low) >= ... hmm)

Actually, val could equal max(low) and be in either heap. But that's fine - we just need to consistently assign it to one heap. The standard approach is: if val <= max(low), assign to low; else assign to high. This works because:
- If val is actually in high but val <= max(low), that means val == max(low) (since max(low) <= min(high) <= val). In this case, we assign it to low, which is slightly wrong in terms of which physical heap it's in, but since we're doing lazy deletion, it doesn't matter - we just mark it as delayed and decrement the logical size of low. When the element eventually reaches the top of high, it'll be cleaned there.

Wait, that's a problem. If we decrement `low_size` but the element is actually in `high`, then our size tracking is off.

Hmm, let me think about this more carefully.

Actually, I think the standard approach handles this correctly. Here's why:

When we do `remove(val)`:
1. We mark `delayed[val] += 1`
2. We determine which heap to decrement based on `val <= -low[0]`
3. We rebalance

The key insight is that the rebalancing will fix any inconsistencies. If we decremented the wrong heap's size, the rebalancing will move elements to correct the sizes.

But actually, I think there's a cleaner way to think about it. Let me look at this from the perspective of the LeetCode problem (295. Find Median from Data Stream) and its sliding window variant.

The standard solution for sliding window median with two heaps:

```python
def sliding_median(nums, k):
    n = len(nums)
    low = []  # max heap
    high = []  # min heap
    delayed = defaultdict(int)
    
    for i in range(k):
        insert(nums[i], low, high)
    
    result = [get_median(low, high)]
    
    for i in range(k, n):
        delete(nums[i-k], low, high)
        insert(nums[i], low, high)
        result.append(get_median(low, high))
    
    return result
```

Where `insert` and `delete` maintain the invariant.

Let me look at this from a different angle. Maybe I should use a simpler but still efficient approach.

**Alternative: Use `sortedcontainers`-like approach with a sorted list and bisect.**

For k=1000, maintaining a sorted list:
- Insert: O(k) due to list insertion (memmove)
- Delete: O(k) due to list deletion (memmove)
- Median: O(1)

Total: O(n * k) = 200,000 * 1,000 = 2 * 10^8 basic operations.

In Python, list insert/delete involves C-level memmove which is quite fast. For a list of 1000 floats (8000 bytes), memmove is essentially instant. The Python overhead is in the bisect (O(log k) = ~10 comparisons) and the list operation (C-level).

Actually, let me benchmark mentally: 200,000 iterations, each doing a bisect (~10 ops) + list insert/delete (C memmove of ~4000 bytes). The Python overhead per iteration is maybe 1-2 microseconds for the bisect + 0.1 microseconds for the memmove. So total ~200,000 * 2μs = 0.4 seconds. That should be well under 2 seconds!

Let me go with the sorted list approach for simplicity and correctness:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
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
        old = nums[i - k]
        idx = bisect.bisect_left(window, old)
        window.pop(idx)
        # Add nums[i]
        new = nums[i]
        bisect.insort(window, new)
        # Compute median
        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

Wait, but `bisect.insort` does a `list.insert` which is O(k) due to shifting. And `list.pop(idx)` is also O(k). So each iteration is O(k). Total O(n*k).

For n=200,000 and k=1,000: 200,000 * 1,000 = 2 * 10^8. But the constant factor matters. In CPython, `list.insert` and `list.pop` in the middle of a list of 1000 elements involves moving ~500 pointers (8 bytes each = 4000 bytes). This is a C-level memmove, very fast. The Python-level overhead is the function call overhead.

Let me estimate: each iteration involves:
- `bisect_left`: ~10 Python-level comparisons (log2(1000) ≈ 10)
- `list.pop(idx)`: C-level, ~500 pointer moves
- `bisect.insort`: ~10 Python-level comparisons + C-level insert (~500 pointer moves)
- Median computation: O(1)

So maybe ~20 Python operations + 2 C memmoves per iteration. 200,000 * 20 = 4 * 10^6 Python operations. At ~50ns per simple Python operation, that's ~0.2 seconds. Plus the C memmoves which are negligible. Should be well under 2 seconds.

Actually, I realize I should double-check: `bisect.insort` is equivalent to `bisect.bisect` + `list.insert`. The `list.insert` in the middle of a list of 1000 elements is O(1000) in terms of pointer moves, but it's a single C call.

I think this approach will work. Let me also consider: is there a case where `bisect_left` might not find the exact element? No, because we're removing an element that we know is in the window. `bisect_left` will find the leftmost position where the element could be, and since the element is in the list, it will find it.

Wait, what about floating point? If we have `0.1 + 0.2` which is `0.30000000000000004`, and we store that exact value, then `bisect_left` will find it correctly because we're comparing the exact same float value.

Let me also handle the edge case where k=1: the median is just the element itself.

I think the sorted list approach is clean, correct, and fast enough. Let me finalize it.

Actually, wait. Let me reconsider the performance. `list.pop(idx)` where idx is in the middle of a list of size 1000: this shifts 500 elements. `list.insert(idx, val)` where idx is in the middle: this also shifts 500 elements. Each shift is a memmove of 500 * 8 = 4000 bytes. This is essentially instant (nanoseconds).

The Python overhead per iteration:
- `bisect.bisect_left(window, old)`: This is a Python function that does ~10 iterations of comparison. Each comparison is a Python float comparison. Maybe ~100ns total.
- `window.pop(idx)`: ~100ns (Python function call + C memmove)
- `bisect.insort(window, new)`: ~100ns (similar)
- Median: ~50ns

Total per iteration: ~350ns. For 200,000 iterations: ~70ms. Well under 2 seconds!

Great, let me go with this approach.

One more thing: the problem says "Return floats". So I should make sure the median is always a float. For odd k, `window[mid]` is already a float (since nums is list[float]). For even k, `(window[mid-1] + window[mid]) / 2.0` is a float.

Let me write the final solution:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = sorted(nums[:k])
    result = []
    
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
    
    for i in range(k, n):
        old = nums[i - k]
        idx = bisect.bisect_left(window, old)
        window.pop(idx)
        new = nums[i]
        bisect.insort(window, new)
        
        if k % 2 == 1:
            result.append(float(window[mid]))
        else:
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

This is clean, correct, and efficient. Let me verify with a small example:
- nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
- Windows: [1,3,-1], [3,-1,-3], [-1,-3,5], [-3,5,3], [5,3,6], [3,6,7]
- Sorted: [-1,1,3], [-3,-1,3], [-3,-1,5], [-3,3,5], [3,5,6], [3,6,7]
- Medians: 1, -1, -1, 3, 5, 4.5

Let me trace through:
- Initial window = sorted([1,3,-1]) = [-1,1,3], mid=1, median = 1 ✓
- i=3: old=nums[0]=1, bisect_left([-1,1,3], 1) = 1, pop(1) → [-1,3], insort(−3) → [-3,-1,3], median = -1 ✓
- i=4: old=nums[1]=3, bisect_left([-3,-1,3], 3) = 2, pop(2) → [-3,-1], insort(5) → [-3,-1,5], median = -1 ✓
- i=5: old=nums[2]=-1, bisect_left([-3,-1,5], -1) = 1, pop(1) → [-3,5], insort(3) → [-3,3,5], median = 3 ✓
- i=6: old=nums[3]=-3, bisect_left([-3,3,5], -3) = 0, pop(0) → [3,5], insort(6) → [3,5,6], median = 5 ✓
- i=7: old=nums[4]=5, bisect_left([3,5,6], 5) = 1, pop(1) → [3,6], insort(7) → [3,6,7], median = 4.5 ✓

The solution works. Let me finalize it.
