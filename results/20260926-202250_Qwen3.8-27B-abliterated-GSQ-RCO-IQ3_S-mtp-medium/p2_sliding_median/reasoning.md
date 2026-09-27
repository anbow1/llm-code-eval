Let me think about this problem carefully.

I need to implement a sliding window median algorithm that's efficient for n=200,000 and k=1,000.

The naive approach would be O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * 10 = 2 billion operations - too slow.

Better approaches:
1. Two heaps (max-heap for lower half, min-heap for upper half) - O(n*log(k))
2. Two sorted lists with bisect - O(n*k) in worst case due to insertion
3. Two heaps with lazy deletion - O(n*log(k))

Let me think about the two heaps approach with lazy deletion:

- Maintain a max-heap for the lower half and a min-heap for the upper half.
- The lower half should have either k//2 or k//2+1 elements (depending on odd/even k).
- When we slide the window, we add a new element and remove an old one.
- We use lazy deletion: mark elements as "deleted" and clean up when they reach the top of a heap.

Let me think about the two heaps approach more carefully:

For the sliding window median:
- We maintain two heaps:
  - `lo` (max-heap): contains the smaller half. In Python, we negate values for max-heap.
  - `hi` (min-heap): contains the larger half.
- We also maintain a dictionary `delayed` for lazy deletion.

The approach:
1. Initialize the first window.
2. For each subsequent window, add the new element, remove the old element (mark as deleted), rebalance, and compute median.

Let me think about the rebalancing:
- After adding an element to one heap, we might need to move elements between heaps to maintain the size invariant.
- The size invariant: len(lo) should be k//2 + (k%2 == 1 ? 1 : 0) for odd k, and k//2 for even k. Actually, let's say len(lo) >= len(hi) always, and len(lo) - len(hi) <= 1. Or we can say: for odd k, lo has (k+1)//2 elements and hi has (k-1)//2. For even k, both have k//2.

Actually, let me use a simpler invariant: len(lo) == (k+1)//2 and len(hi) == k//2. This works for both odd and even k.

Wait, for even k: k=4, lo has 2, hi has 2. Median = (max(lo) + min(hi)) / 2.
For odd k: k=5, lo has 3, hi has 2. Median = max(lo).

So: target size of lo = (k+1)//2, target size of hi = k//2.

Algorithm:
1. Add element: add to lo (max-heap) or hi (min-heap) based on value comparison.
   - If element <= max(lo), add to lo (as negative).
   - Else add to hi.
2. Remove element (for sliding): mark as deleted in `delayed` dict, and decrement the size of whichever heap it belongs to.
3. Rebalance: if lo is too big, move top to hi. If hi is too big, move top to lo.
4. Clean top: while top of heap is marked as deleted, pop and update delayed.

Let me code this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    # lo: max-heap (negated), hi: min-heap
    lo = []  # max-heap of negated values
    hi = []  # min-heap
    delayed = defaultdict(int)  # value -> count of delayed deletions
    
    lo_size = 0  # effective size of lo
    hi_size = 0  # effective size of hi
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean(heap):
        """Remove top of heap if it's marked as deleted."""
        while heap:
            val = heap[0]
            # For lo, the actual value is -val
            actual = -val if heap is lo else val
            if delayed[actual] > 0:
                heapq.heappop(heap)
                delayed[actual] -= 1
            else:
                break
    
    def add(val):
        nonlocal lo_size, hi_size
        if lo and val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        nonlocal lo_size, hi_size
        # Determine which heap it belongs to
        # If val <= max(lo) (i.e., -lo[0]), it's in lo
        # But we need to be careful. Let's use a different approach.
        # Actually, we can just mark it as deleted and figure out which heap.
        # Hmm, but we need to know which heap to decrement.
        # Let's use: if lo_size > 0 and val <= -lo[0], it's in lo.
        # But this isn't always correct after rebalancing...
        
        # Actually, a cleaner approach: we always try to put it in the correct heap
        # based on the current median.
        # If val <= -lo[0] (max of lo), it was in lo, decrement lo_size
        # Otherwise, it was in hi, decrement hi_size
        
        if lo and val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Move from lo to hi if lo is too big
        while lo_size > target_lo:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
        
        # Move from hi to lo if hi is too big
        while hi_size > target_hi:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        
        # If lo is too small, move from hi
        while lo_size < target_lo:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        
        # If hi is too small, move from lo
        while hi_size < target_hi:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
    
    # Initialize first window
    for i in range(k):
        add(nums[i])
        rebalance()
    
    results = []
    
    def get_median():
        clean(lo)
        clean(hi)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2.0)
    
    results.append(get_median())
    
    for i in range(1, n - k + 1):
        # Remove nums[i-1], add nums[i+k-1]
        remove(nums[i-1])
        add(nums[i+k-1])
        rebalance()
        results.append(get_median())
    
    return results
```

Wait, I think there's an issue with the `remove` function. When I remove an element, I need to know which heap it's in. The approach of checking `val <= -lo[0]` might not work perfectly because after rebalancing, the boundary might shift.

Actually, let me reconsider. The standard approach for sliding window median with two heaps:

The key insight is that we don't need to know exactly which heap an element is in. We can:
1. Mark the element as deleted (increment `delayed[val]`).
2. Decide which heap's size to decrement based on where the element "should" be relative to the current partition.

The partition is: all elements in lo are <= all elements in hi (when we clean the tops).

So if the element to remove is <= the current max of lo (after cleaning), it belongs to lo. Otherwise, it belongs to hi.

But wait, what if lo is empty? Then it must be in hi.

Let me also consider: what if the element equals -lo[0]? It could be in either heap. But since we're using <=, we'll assign it to lo. As long as we're consistent, this should work.

Actually, I realize there might be an issue. Let me think more carefully.

The invariant is: every element in lo <= every element in hi (after cleaning tops). The sizes should be target_lo and target_hi.

When we remove a value `val`:
- If lo is non-empty and val <= -lo[0], then val is in lo (or could be, we assign it to lo). Decrement lo_size.
- Otherwise, val is in hi. Decrement hi_size.
- Mark delayed[val] += 1.

Then rebalance:
- If lo_size > target_lo, pop from lo (after cleaning) and push to hi.
- If hi_size > target_hi, pop from hi (after cleaning) and push to lo.
- If lo_size < target_lo, pop from hi (after cleaning) and push to lo.
- If hi_size < target_hi, pop from lo (after cleaning) and push to hi.

This should work. Let me also handle the edge case where we might try to pop from an empty heap.

Actually wait, I think there's a subtle issue. When we do `clean(lo)`, we pop elements that are marked as deleted. But we also need to make sure we don't pop more than we should. The `clean` function only pops the top if it's marked as deleted.

Let me also think about performance. For n=200,000 and k=1,000:
- We do n-1 sliding steps.
- Each step: add (O(log k)), remove (O(1)), rebalance (O(log k) amortized since we move at most 1 element), get_median (O(1) after cleaning).
- Total: O(n log k) which is about 200,000 * 10 = 2,000,000 operations. Should be well under 2 seconds.

Wait, actually the rebalance could potentially move multiple elements in the worst case, but on average it's O(1) moves. In the worst case per step, we move 1 element (since we add 1 and remove 1, the size difference changes by at most 1 from the target). So it's O(log k) per step.

Let me also think about potential issues with the `clean` function and floating point. Since we're dealing with floats, the `delayed` dict uses float keys. This should be fine as long as we're comparing exact values (which we are, since we're removing the exact same float that was added).

Actually wait, there could be an issue. If the same value appears multiple times, the `delayed` dict handles it correctly because we increment/decrement the count.

Let me also handle the case where k == 1: just return list(nums) as floats. Actually, if nums is already list[float], then list(nums) is fine. But to be safe, let's return [float(x) for x in nums].

Hmm, actually the problem says nums is list[float], so elements are already floats. list(nums) should be fine.

Let me also double-check the rebalance logic. After adding and removing, the sizes can be off by at most 1 from target. So we'll need at most 1 move. But to be safe, I'll use while loops.

Wait, actually I realize there might be an issue with the "while" loops in rebalance. Consider:
- target_lo = 501, target_hi = 499 (for k=1000)
- After add+remove, lo_size could be 500, hi_size could be 500 (if we removed from lo and added to hi, or removed from hi and added to lo, etc.)

Let me trace through:
- Before: lo_size = 501, hi_size = 499
- Remove from lo: lo_size = 500, hi_size = 499
- Add to hi: lo_size = 500, hi_size = 500
- Rebalance: lo_size (500) < target_lo (501), so move 1 from hi to lo. lo_size = 501, hi_size = 499. ✓

Another case:
- Before: lo_size = 501, hi_size = 499
- Remove from hi: lo_size = 501, hi_size = 498
- Add to lo: lo_size = 502, hi_size = 498
- Rebalance: lo_size (502) > target_lo (501), so move 1 from lo to hi. lo_size = 501, hi_size = 499. ✓

Another case:
- Before: lo_size = 501, hi_size = 499
- Remove from lo: lo_size = 500, hi_size = 499
- Add to lo: lo_size = 501, hi_size = 499
- Rebalance: already correct. ✓

Another case:
- Before: lo_size = 501, hi_size = 499
- Remove from hi: lo_size = 501, hi_size = 498
- Add to hi: lo_size = 501, hi_size = 499
- Rebalance: already correct. ✓

OK so in practice we only ever need to move 1 element. The while loops are just for safety.

But wait, what about the initial fill? For the first k elements, we add them one by one and rebalance. Each add might cause a rebalance. This is O(k log k) total, which is fine.

Let me also consider: when I do `clean(lo)` in the rebalance, I'm popping elements from the top of the heap that are marked as deleted. But what if the top of lo is not marked as deleted, but there's a deleted element deeper in the heap? That's fine - lazy deletion means we only clean when the deleted element reaches the top.

I think the algorithm is correct. Let me also handle the edge case where after cleaning, the heap becomes empty (shouldn't happen if sizes are correct, but just in case).

One more thing: the problem says "Return floats." So I should make sure the results are floats. Since nums is list[float], the operations should naturally produce floats. The division `/ 2.0` ensures a float result for even k.

Let me also consider: what if k == n? Then there's only one window, and we return [median of all elements]. This should work with our algorithm.

What if k == 1? Each window has one element, so the median is that element. I'll handle this as a special case for efficiency, but it would also work with the general algorithm.

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    lo = []  # max-heap (negated values)
    hi = []  # min-heap
    delayed = defaultdict(int)
    
    lo_size = 0
    hi_size = 0
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean(heap):
        while heap:
            val = -heap[0] if heap is lo else heap[0]
            if delayed[val]:
                heapq.heappop(heap)
                delayed[val] -= 1
            else:
                break
    
    def add(val):
        nonlocal lo_size, hi_size
        if lo and val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        nonlocal lo_size, hi_size
        if lo and val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
        while hi_size > target_hi:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while lo_size < target_lo:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while hi_size < target_hi:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
    
    # Initialize
    for i in range(k):
        add(nums[i])
        rebalance()
    
    results = []
    
    def get_median():
        clean(lo)
        clean(hi)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    results.append(get_median())
    
    for i in range(1, n - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        rebalance()
        results.append(get_median())
    
    return results
```

Wait, I need to double-check the `clean` function. The issue is that `heap` is a local variable in the function, and I'm comparing `heap is lo`. This should work since we're passing the actual list objects.

Actually, let me reconsider. In Python, `heap is lo` checks if they're the same object. Since we're calling `clean(lo)` and `clean(hi)`, this should work.

But wait, there's a subtle issue. In the `clean` function, I'm modifying `heap` (popping from it). Since `heap` is a reference to the list (not a copy), this modifies the original `lo` or `hi`. Good.

Let me trace through a small example:
nums = [1, 3, 2, 6, 4, 3, 1], k = 3

target_lo = 2, target_hi = 1

Init:
- add(1): lo=[-1], lo_size=1, hi=[], hi_size=0
  rebalance: lo_size(1) < target_lo(2), so move from hi to lo. But hi is empty!
  
Hmm, this is a problem. During initialization, we're adding elements one by one, and after each add we rebalance. But if hi is empty and we need to move from hi to lo, we'll fail.

Let me fix the initialization. Instead of adding one by one and rebalancing, let me:
1. Add all k elements to the heaps.
2. Then rebalance once.

But the issue is that `add` puts elements in the wrong heap if the heaps are in a partial state.

Alternative: during initialization, just push everything to both heaps? No, that doesn't work either.

Better approach: 
- Sort the first k elements.
- Put the first target_lo elements in lo (negated).
- Put the remaining target_hi elements in hi.

This is O(k log k) which is fine.

```python
# Initialize
first_window = sorted(nums[:k])
for val in first_window[:target_lo]:
    heapq.heappush(lo, -val)
for val in first_window[target_lo:]:
    heapq.heappush(hi, val)
lo_size = target_lo
hi_size = target_hi
```

This is cleaner and avoids the initialization issue.

Actually wait, let me reconsider. If I add elements one by one and rebalance, the issue is that during the first few additions, the sizes won't match targets. Let me think...

After adding 1 element: lo_size=1, hi_size=0. target_lo=2, target_hi=1.
- lo_size(1) < target_lo(2): need to move from hi to lo. But hi is empty!

So yes, the one-by-one approach doesn't work for initialization. Let me use the sort approach.

Actually, another approach: during initialization, just push all k elements to `hi`, then redistribute. Or:

- Push first target_lo elements to lo (as negatives).
- Push remaining target_hi to hi.
- Build heaps.

Let me go with the sorted approach:

```python
first = sorted(nums[:k])
lo = [-x for x in first[:target_lo]]
heapq.heapify(lo)
hi = list(first[target_lo:])
heapq.heapify(hi)
lo_size = target_lo
hi_size = target_hi
```

This is O(k) for heapify after sorting. Total O(k log k). Fine.

Let me rewrite:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    # Initialize with sorted first window
    first = sorted(nums[:k])
    lo = [-x for x in first[:target_lo]]
    heapq.heapify(lo)
    hi = list(first[target_lo:])
    heapq.heapify(hi)
    
    lo_size = target_lo
    hi_size = target_hi
    delayed = defaultdict(int)
    
    def clean(heap):
        while heap:
            val = -heap[0] if heap is lo else heap[0]
            if delayed[val]:
                heapq.heappop(heap)
                delayed[val] -= 1
            else:
                break
    
    def add(val):
        nonlocal lo_size, hi_size
        if val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        nonlocal lo_size, hi_size
        if val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
        while hi_size > target_hi:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while lo_size < target_lo:
            clean(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -val)
        while hi_size < target_hi:
            clean(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, val)
    
    results = []
    
    def get_median():
        clean(lo)
        clean(hi)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    results.append(get_median())
    
    for i in range(1, n - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        rebalance()
        results.append(get_median())
    
    return results
```

Wait, there's still a potential issue. In `add`, I check `val <= -lo[0]`. But what if `lo` has stale elements at the top? I should clean first. Let me add `clean(lo)` at the start of `add` and `remove`.

Actually, `clean` only removes elements that are marked as deleted. If the top of lo is not marked as deleted, it stays. So `-lo[0]` is the effective max of lo (after all previous cleanings). But wait, what if the element we're adding is being compared to a stale top?

Hmm, actually no. `clean(lo)` removes the top if it's marked as deleted. So after cleaning, `-lo[0]` is the actual max of the non-deleted elements in lo. This is correct.

But in `add`, I'm not calling `clean(lo)` first. Let me add that.

Actually, let me think about when `lo[0]` could be stale. It's stale only if we've marked the element `-lo[0]` as deleted. This happens in `remove`. So after a `remove`, the top of lo (or hi) might be stale. Then in the next `add`, I compare with `-lo[0]` which might be stale.

So yes, I should clean before comparing. Let me add `clean(lo)` and `clean(hi)` at the beginning of `add` and `remove`.

Actually, to be safe, let me just clean at the start of each operation:

```python
def add(val):
    nonlocal lo_size, hi_size
    clean(lo)
    if val <= -lo[0]:
        heapq.heappush(lo, -val)
        lo_size += 1
    else:
        heapq.heappush(hi, val)
        hi_size += 1

def remove(val):
    nonlocal lo_size, hi_size
    clean(lo)
    if val <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    delayed[val] += 1
```

This should be correct. The cleaning is O(log k) in the worst case per call, but amortized it's O(1) since each element is only cleaned once.

Let me also consider: what if lo becomes empty after cleaning? This shouldn't happen if our size tracking is correct, but just in case, I could add a check. Actually, if lo_size > 0, then after cleaning, lo should have at least one non-deleted element. So `-lo[0]` is valid.

Wait, but what if lo_size is 0? Then lo should be empty (or only contain deleted elements). In `add`, if lo is empty, we should add to hi. Let me handle this:

```python
def add(val):
    nonlocal lo_size, hi_size
    clean(lo)
    clean(hi)
    if lo_size == 0:
        # All elements go to hi? No, actually if lo_size is 0, we need target_lo elements in lo.
        # This shouldn't happen during normal operation since we always maintain target sizes.
        # But during the first step after init, it's fine.
        pass
    if lo_size > 0 and val <= -lo[0]:
        heapq.heappush(lo, -val)
        lo_size += 1
    else:
        heapq.heappush(hi, val)
        hi_size += 1
```

Hmm, but during normal sliding, lo_size should always be >= target_lo > 0 (since k >= 2, target_lo >= 1). So lo should never be empty during sliding. Let me keep it simple and assume lo is non-empty during sliding.

Actually, for k=2: target_lo = 1, target_hi = 1. So lo always has at least 1 element. Good.

I think the code is correct. Let me also make sure the `clean` function handles the `heap is lo` check correctly. Since `lo` and `hi` are local variables in the enclosing scope, and we're passing them as arguments, the identity check should work.

Let me also think about potential issues with floating point in the `delayed` dict. If we have `0.1 + 0.2 = 0.30000000000000004`, and we add the original float to the heap and then try to remove it, the dict lookup should work because we're using the exact same float object (same bits). Python dicts use hash and equality for floats, and identical floats hash to the same value. So this should be fine.

One more consideration: the problem says "Return floats." All our operations produce floats since we're working with floats. The division `/ 2.0` ensures a float. The `float(...)` casts are for safety.

I think the solution is correct and efficient. Let me finalize it.

Actually, let me reconsider the `clean` function. There's a subtle issue:

```python
def clean(heap):
    while heap:
        val = -heap[0] if heap is lo else heap[0]
        if delayed[val]:
            heapq.heappop(heap)
            delayed[val] -= 1
        else:
            break
```

This uses `heap is lo` to determine the sign. This works because `lo` and `hi` are the actual list objects in the enclosing scope. When we call `clean(lo)`, `heap is lo` is True. When we call `clean(hi)`, `heap is lo` is False.

This is correct.

Let me also make sure I'm not modifying `delayed` in a way that could cause issues. We increment `delayed[val]` in `remove`, and decrement in `clean`. Each element is removed once and cleaned once, so the counts should balance out.

I'm satisfied the solution is correct. Let me write the final version.

One more thought: for the performance requirement (n=200,000, k=1,000, under 2 seconds), the O(n log k) algorithm should be fine. 200,000 * log2(1000) ≈ 200,000 * 10 = 2,000,000 operations, each involving a heap push/pop which is O(log k). So total is about 20,000,000 basic operations. In Python, this should be well under 2 seconds.

Let me write the final clean version.
