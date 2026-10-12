Let me think about this problem carefully.

We need to find the median of every sliding window of size k over a list of numbers. The naive approach would be O(n*k*log(k)) which would be too slow for n=200,000 and k=1,000.

For efficiency, I need an O(n*log(k)) approach. The standard approach is to use two heaps (a max-heap for the lower half and a min-heap for the upper half) with lazy deletion.

Let me think about the two-heap approach:
- `lo`: a max-heap (using negative values) storing the smaller half of elements
- `hi`: a min-heap storing the larger half of elements
- We maintain the invariant that `lo` has size `k//2` or `k//2 + 1` (depending on whether we want lo to have the extra element for odd k)

Actually, let me think more carefully. For a window of size k:
- If k is odd, median is the middle element at position k//2 (0-indexed)
- If k is even, median is the average of elements at positions k//2 - 1 and k//2

Let me use the two-heap approach with lazy deletion:
- `lo` (max-heap): stores the lower half, size = (k+1)//2
- `hi` (min-heap): stores the upper half, size = k//2
- All elements in `lo` <= all elements in `hi`
- The top of `lo` is the median (for odd k) or the lower median (for even k)
- The top of `hi` is the upper median (for even k)

For lazy deletion:
- We maintain a `delayed` counter and a `delayed_dict` (or set) that tracks elements that should be removed from each heap.
- When we peek at the top of a heap, if it's in the delayed set, we pop it and continue.

Let me think about the algorithm:

1. Initialize: insert first k elements into the two heaps
2. For each window, compute median
3. Slide: remove the leftmost element of the old window, add the new element

For lazy deletion, I'll use a dictionary tracking how many of each element are delayed in each heap.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(f"k must be between 1 and len(nums), got k={k}, len(nums)={len(nums)}")
    
    n = len(nums)
    result = []
    
    # lo is a max-heap (store negatives), size = (k+1)//2
    # hi is a min-heap, size = k//2
    lo = []  # max-heap: store -val
    hi = []  # min-heap: store val
    
    # For lazy deletion
    delayed = defaultdict(int)  # maps value -> count of delayed removals (signed by which heap)
    
    # Actually, let me use a different approach for lazy deletion.
    # We need to track which heap each delayed element belongs to.
    # Let's use two separate delayed dicts, or track by sign.
    
    # Hmm, let me think again. The issue with lazy deletion and two heaps is tricky.
    # 
    # Let me use a different approach: store (value, index) in heaps, and mark
    # elements as deleted. Since values might repeat, we need the index to distinguish.
    
    # Actually, let me use a cleaner approach:
    # Store (neg_val, index) in lo and (val, index) in hi.
    # Keep a set of "removed" indices.
    # When we peek the top, if the index is in removed set, pop and continue.
    
    # Wait, but we also need to track the "effective size" of each heap.
    
    # Let me reconsider. Standard approach:
    # - Use two heaps with lazy deletion
    # - Track effective sizes
    # - Delayed deletion dict
    
    # Let me use (value, unique_id) tuples where unique_id is the index in nums.
    
    # For lo: max-heap, store (-value, index)
    # For hi: min-heap, store (value, index)
    # removed: set of indices that are no longer in the window
    
    removed = set()
    lo_size = 0  # effective size of lo
    hi_size = 0  # effective size of hi
    
    def prune_top(heap, removed_set):
        # Remove top elements that are marked as removed
        while heap and heap[0][1] in removed_set:
            heapq.heappop(heap)
            removed_set.discard(heap[0][1]) if heap else None  # wait this is wrong
    
    # Hmm, let me be more careful.
    
    def prune_lo():
        while lo and lo[0][1] in removed:
            heapq.heappop(lo)
    
    def prune_hi():
        while hi and hi[0][1] in removed:
            heapq.heappop(hi)
    
    def rebalance():
        # Ensure lo_size == (k+1)//2 and hi_size == k//2
        # After removals, sizes might be off
        target_lo = (k + 1) // 2
        
        while lo_size > target_lo:
            val, idx = heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, (-val, idx))
            hi_size += 1
            prune_hi()  # hmm, not needed here
        
        while lo_size < target_lo and hi_size > k // 2:
            # Actually this isn't quite right either...
            pass
    
    # This is getting complicated. Let me use a different, cleaner approach.
```

Actually, let me use a well-known clean implementation of the sliding median with two heaps and lazy deletion.

The key insight:
- `lo` stores the smaller half as a max-heap (negated values)
- `hi` stores the larger half as a min-heap
- Invariant: len(lo) == (k+1)//2, len(hi) == k//2
- When we remove an element, we don't actually remove it from the heap immediately. We mark it as delayed and adjust the effective size.
- When the top of a heap is a delayed element, we pop it (garbage collect).

Let me use a cleaner formulation. I'll track elements by their value (with index for uniqueness).

Actually, for the lazy deletion approach, the standard way is:

1. Have a `delayed` dict: value -> count (how many copies of this value are "logically deleted" but still in the heap)
2. Have effective sizes for each heap
3. `prune_top(heap)`: while top of heap has its value in delayed with count > 0, pop it and decrement delayed count
4. `remove(value)`: if value <= median (top of lo), decrement lo's effective size; else decrement hi's effective size. Add to delayed.
5. `add(value)`: compare with median, push to appropriate heap, increment size, then rebalance.
6. `rebalance()`: while lo_size > (k+1)//2, move top of lo to hi. While lo_size < (k+1)//2, move top of hi to lo.

The tricky part is that we need to prune before comparing. Let me code this carefully.

Wait, there's a subtlety. We can't directly compare with "top of lo" because we need to prune first. But pruning before every operation adds complexity. Let me just make sure to always prune before reading tops.

Actually, since k can be up to 1000 and we have up to 200,000 windows, we need O(n log k) which is about 200,000 * 10 = 2,000,000 operations. That should be fine.

Let me write a cleaner version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    result = []
    
    # lo: max-heap (store negative), effective size should be (k+1)//2
    # hi: min-heap, effective size should be k//2
    lo = []
    hi = []
    delayed = defaultdict(int)  # value -> number of pending deletions
    lo_size = 0
    hi_size = 0
    
    def prune_top(heap):
        while heap and delayed[heap[0][0]] > 0:
            delayed[heap[0][0]] -= 1
            heapq.heappop(heap)
    
    def remove(val):
        nonlocal lo_size, hi_size
        # Determine which heap it's in
        prune_top(lo)
        if val <= -lo[0][0]:  # it's in lo (or could be in either, but we assign to lo if <= median)
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1
    
    def add(val):
        nonlocal lo_size, hi_size
        prune_top(lo)
        if lo_size == 0 or val <= -lo[0][0]:
            heapq.heappush(lo, (-val,))  # wait, need to store value
        else:
            heapq.heappush(hi, (val,))
        ...
    
    # Hmm, using tuples for comparison in heapq... Let me use just the value.
    # But heapq in Python compares tuples element by element. If I use (-val,) and (val,), 
    # that should work. But for the delayed dict, I need the actual value.
    
    # Actually, let me store just the value in the heaps:
    # lo stores -val, hi stores val
    # For delayed, I store the actual val.
```

Wait, I need to be more careful. Let me store values directly:
- lo is a max-heap: store `-val`
- hi is a min-heap: store `val`
- delayed dict maps the actual val to a count

When I prune lo's top: the stored value is `-val`, so I look up `delayed[-lo[0]]`.
When I prune hi's top: the stored value is `val`, so I look up `delayed[hi[0]]`.

Let me rewrite:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    result = []
    
    lo = []  # max-heap: stores -val, effective size = lo_size
    hi = []  # min-heap: stores val, effective size = hi_size
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def prune_lo():
        while lo and delayed.get(-lo[0], 0) > 0:
            delayed[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def prune_hi():
        while hi and delayed.get(hi[0], 0) > 0:
            delayed[hi[0]] -= 1
            heapq.heappop(hi)
    
    def median():
        prune_lo()
        prune_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    def remove(val):
        nonlocal lo_size, hi_size
        prune_lo()
        prune_hi()
        if lo and val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[val] += 1
    
    def add(val):
        nonlocal lo_size, hi_size
        prune_lo()
        if not lo or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
        rebalance()
    
    def rebalance():
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2
        
        while lo_size > target_lo:
            prune_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        while lo_size < target_lo:
            prune_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    # Build initial window
    for i in range(k):
        add(nums[i])
    
    result.append(median())
    
    # Slide
    for i in range(1, n - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        result.append(median())
    
    return result
```

Wait, there's a problem with `remove`. When I do `remove(val)`, I need to determine which heap the value is currently in. But the value might have been already removed from that heap (delayed). The check `val <= -lo[0]` after pruning should work because we're checking the current top. But what if the value was in lo but the top of lo has changed? 

Actually, the standard approach is: after pruning, if val <= top of lo, it was in lo (or in the "lo region"), so decrement lo_size. Otherwise, it was in hi. This works because:
- All effective elements in lo are <= top of lo (the max of lo)
- All effective elements in hi are >= top of lo
- If val <= -lo[0], it must have been in the lo region

But wait, what if val is in lo but not at the top? After we mark it as delayed, the size decrements, and rebalancing will fix things. The key is that the assignment to lo_size vs hi_size must be correct.

Hmm, actually there's a subtle issue. What if val equals -lo[0]? Then it could be in either heap (if there are duplicates). But since we're just decrementing a size counter and adding to delayed, and the rebalancing will move elements as needed, it should still work. The invariant is that all effective elements in lo are <= all effective elements in hi. If we have a duplicate at the boundary, assigning it to either heap is fine.

Actually wait, there's another issue. What if `lo` is empty after pruning? That could happen if all elements in lo are delayed. Let me add a check.

Let me also think about whether `prune_lo()` in `remove` is necessary. If the value we're removing is in lo, and it happens to be at the top, then after we add it to delayed, the next `prune_lo()` call will remove it. But in `remove`, we need to know which size to decrement BEFORE adding to delayed. So we need to determine which heap it's in first. The check `val <= -lo[0]` (after pruning lo's top) should work.

But what if lo is empty? If k > 1 and we just removed the last effective element from lo... hmm, that shouldn't happen if we maintain the invariant. Let me add a guard.

Actually, let me think about when lo could be empty. Initially, lo_size = (k+1)//2. After removing one element from lo, lo_size = (k+1)//2 - 1. Before adding the new element and rebalancing, lo_size could be 0 if k=1. But for k=1, lo_size should be 1, and after removal it's 0. Then we add a new element.

For the `remove` function, if lo is empty (all delayed), we should look at hi's top instead. Let me handle this:

```python
def remove(val):
    nonlocal lo_size, hi_size
    prune_lo()
    prune_hi()
    if not lo or val <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    delayed[val] += 1
```

If lo is empty, we decrement hi_size. But is that correct? If lo is empty, all effective elements are in hi (or there are none). If val was in lo but is now delayed... wait, if val is in lo and lo is empty (all delayed), then removing it again doesn't make sense. But this shouldn't happen because we only remove elements that are in the current window.

Actually, the issue is: when we remove an element, we need to know if it's currently "in" lo or "in" hi. The pruning removes already-delayed elements from the top. If the top of lo is not delayed, then -lo[0] is the current max of lo. Any value <= that is in the "lo region". This should be correct.

But what if all of lo is delayed and hasn't been pruned yet? After `prune_lo()`, if lo is empty, then all effective elements are in hi. In that case, val must be in hi (since it's an effective element). So decrementing hi_size is correct.

Wait, but `prune_lo()` only prunes from the top. There could be delayed elements deeper in the heap. But the effective size `lo_size` accounts for that. If `lo_size == 0` but `lo` still has elements (all delayed), then after pruning the top, lo might still have elements. But `lo_size == 0` means there are no effective elements in lo, so val (which is effective) can't be in lo. So we should check `lo_size` rather than whether lo is empty.

Let me fix:

```python
def remove(val):
    nonlocal lo_size, hi_size
    prune_lo()
    prune_hi()
    if lo_size == 0 or val <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    delayed[val] += 1
```

Hmm, but if `lo_size > 0` and lo is not empty after pruning, then `-lo[0]` is valid. If `lo_size > 0` but lo is empty... that can't happen because effective elements must be in the heap.

Actually wait - effective elements ARE in the heap, they're just potentially not at the top. The heap contains both effective and delayed elements. `lo_size` counts only effective ones. If `lo_size > 0`, there's at least one effective element in lo, but it might not be at the top (delayed elements could be on top). After `prune_lo()`, the top is not delayed, so it IS effective. So if `lo_size > 0`, after `prune_lo()`, lo is not empty and `-lo[0]` is a valid effective element.

OK I think the logic is correct. Let me also handle the edge case in `add`:

```python
def add(val):
    nonlocal lo_size, hi_size
    prune_lo()
    if lo_size == 0 or val <= -lo[0]:
        heapq.heappush(lo, -val)
        lo_size += 1
    else:
        heapq.heappush(hi, val)
        hi_size += 1
    rebalance()
```

This looks correct.

For `median()`:
- If k is odd, lo_size = (k+1)//2 and the top of lo is the median.
- If k is even, lo_size = k//2 and hi_size = k//2. The median is (-lo[0] + hi[0]) / 2.

Wait, (k+1)//2 for k even is k//2. For k=4, (4+1)//2 = 2. lo has 2, hi has 2. Top of lo is the 2nd element, top of hi is the 3rd element. Median = (2nd + 3rd) / 2. Correct.

For k=5, (5+1)//2 = 3. lo has 3, hi has 2. Top of lo is the 3rd element. Median = lo[0]. Correct.

Let me also double-check the `rebalance` function. After adding an element, we might have lo_size > target_lo. We move from lo to hi. After removing, we might have lo_size < target_lo. We move from hi to lo.

But in `remove`, we don't rebalance immediately. We rebalance after `add`. Let me trace through:

1. Start: window built with k elements, lo_size = (k+1)//2, hi_size = k//2.
2. remove(nums[0]): lo_size or hi_size decremented. delayed incremented.
3. add(nums[k]): element pushed, size incremented, rebalance.
4. median(): prune and read.

In step 3's rebalance, we adjust to target sizes. But what if after remove, hi_size is too large? Rebalance handles that.

What if after remove, both lo_size and hi_size are wrong (e.g., lo too small, hi too large)? Rebalance moves from hi to lo.

What if after add + remove, lo_size < target_lo? We need to move from hi to lo. The while loop handles it.

I think this is correct. Let me also consider: what if during rebalance, we pop from lo/hi and the top is delayed? We call prune_lo()/prune_hi() before popping. Good.

Let me also think about potential issues with floating point. The problem says `list[float]`, so we're dealing with floats. The comparison `val <= -lo[0]` should work fine for floats.

One more thing: the `delayed` dict uses the actual value as key. If two different elements have the same value, they share a delayed count. That's fine because we're just counting how many elements with that value should be removed.

Wait, but what if we remove a value that's in lo, and there's also a value in hi with the same numeric value? The delayed dict would apply to both heaps. When we prune, we check the stored value (which is the actual value for hi, and the negated value for lo... wait no).

Hmm, let me re-examine. In lo, we store `-val`. In the prune function for lo:
```python
def prune_lo():
    while lo and delayed.get(-lo[0], 0) > 0:
        delayed[-lo[0]] -= 1
        heapq.heappop(lo)
```
So we look up `delayed[-lo[0]]` which is `delayed[val]`. Good.

In hi, we store `val`. In prune_hi:
```python
def prune_hi():
    while hi and delayed.get(hi[0], 0) > 0:
        delayed[hi[0]] -= 1
        heapq.heappop(hi)
```
We look up `delayed[val]`. Good.

So if two elements with the same value exist (one in lo, one in hi), and we remove one of them, the delayed count goes up. The prune function would remove any element with that value from either heap. But we only wanted to remove one. Since we decrement the size of the appropriate heap, and the delayed count is shared, the next prune of either heap might remove the wrong one.

Wait, this IS a problem! Consider: value 5.0 is in both lo and hi. We want to remove the one in hi. We do `delayed[5.0] += 1`, `hi_size -= 1`. Now, if `prune_lo()` is called and the top of lo is -5.0, it would remove the lo element!

This is a real issue. The standard solution for this uses a different approach: either use (value, index) tuples, or use a different data structure.

Let me switch to using (value, index) tuples. This way, each element is uniquely identified.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    result = []
    
    lo = []  # max-heap: stores (-val, idx)
    hi = []  # min-heap: stores (val, idx)
    removed = set()  # set of removed indices
    lo_size = 0
    hi_size = 0
    
    def prune_lo():
        while lo and lo[0][1] in removed:
            heapq.heappop(lo)
    
    def prune_hi():
        while hi and hi[0][1] in removed:
            heapq.heappop(hi)
    
    def median():
        prune_lo()
        prune_hi()
        if k % 2 == 1:
            return float(-lo[0][0])
        else:
            return float(-lo[0][0] + hi[0][0]) / 2.0
    
    def remove(idx):
        nonlocal lo_size, hi_size
        prune_lo()
        prune_hi()
        val = nums[idx]
        if lo_size == 0 or val <= -lo[0][0]:
            lo_size -= 1
        else:
            hi_size -= 1
        removed.add(idx)
    
    def add(val, idx):
        nonlocal lo_size, hi_size
        prune_lo()
        if lo_size == 0 or val <= -lo[0][0]:
            heapq.heappush(lo, (-val, idx))
            lo_size += 1
        else:
            heapq.heappush(hi, (val, idx))
            hi_size += 1
        rebalance()
    
    def rebalance():
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2
        
        while lo_size > target_lo:
            prune_lo()
            neg_val, idx = heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, (-neg_val, idx))
            hi_size += 1
        
        while lo_size < target_lo:
            prune_hi()
            val, idx = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, (-val, idx))
            lo_size += 1
    
    # Build initial window
    for i in range(k):
        add(nums[i], i)
    
    result.append(median())
    
    # Slide
    for i in range(1, n - k + 1):
        remove(i - 1)
        add(nums[i + k - 1], i + k - 1)
        result.append(median())
    
    return result
```

Wait, there's still an issue. When I pop from lo in rebalance, the popped element might have its index in `removed`. But I called `prune_lo()` first, which removes all elements at the top that are in removed. But what if there are removed elements not at the top?

Hmm, `prune_lo()` only removes from the top. If there are removed elements deeper in the heap, they won't be removed until they bubble up to the top. But when I pop from the top (after pruning), the element I pop IS at the top and is NOT removed (because prune_lo ensured the top isn't removed). So the popped element is valid. Good.

But wait, what about the element I move from lo to hi? Its index might later be added to `removed`. That's fine - it'll be pruned from hi when it reaches the top.

Actually, I realize there might be a performance issue. The heaps can grow to size O(n) in the worst case because we never truly remove elements from the middle. For n=200,000, the heaps could have up to 200,000 elements each. Operations on the heap are O(log n) rather than O(log k). For n=200,000, log n ≈ 18, which is still very fast. 200,000 * 18 ≈ 3.6 million operations, well within 2 seconds.

Actually, let me reconsider. Each window slide involves:
- 1 prune_lo, 1 prune_hi (amortized O(1) each since each element is pruned at most once)
- 1 remove (O(log n) for the heap push/pop, plus set operations)
- 1 add (O(log n) for heap push)
- rebalance: O(1) amortized (move at most 1 element)
- 1 median call: prune + O(1) read

Total: O(n log n) worst case, O(n log k) amortized since the effective heap sizes are O(k). Actually, the heap SIZE can be up to O(n) because of lazy deletion. So it's O(n log n) in the worst case.

For n=200,000, log n ≈ 18. Total operations ≈ 200,000 * 18 * (constant) ≈ 3.6 million, which should be well under 2 seconds in Python.

Hmm, actually in Python, heapq operations involve function calls and list manipulation. 200,000 operations with log(n) depth... let me think. Each heapq.heappush/pop is O(log size). If size grows to 200,000, that's about 18 comparisons per operation. With maybe 4-5 heap operations per window, that's 200,000 * 5 * 18 = 18 million comparisons. In Python, this might take 2-5 seconds. Might be tight.

To keep heap sizes bounded at O(k), we need to actually remove elements, not just lazily. But that's O(k) per removal.

Alternative: use the lazy approach but the heap size is bounded by the initial window size + number of elements added = k + (n-k) = n in the worst case. But in practice, the pruning keeps it close to O(k) since we're removing as many as we add.

Actually, let me reconsider. After the initial build, each step removes one and adds one. The lazy approach means the heap size is (initial k) + (n-k) added = n at most. But pruning removes elements from the top when they're marked removed. In the worst case (always removing the top), the heap size stays at O(k). In the best case for heap growth (always removing from the bottom), the heap size grows to O(n).

For a random dataset, the heap size should stay close to O(k). Let me just go with this approach; it should be fast enough.

Actually wait, I realize there might be another issue. When I do `remove(idx)`, I add idx to the `removed` set. But I also need to make sure that when rebalance pops an element from lo and pushes to hi, if that element's index is later removed, the `hi_size` tracking is correct.

Let me trace through an example:
- k=3, nums = [1, 5, 3, 2, 4]
- Initial window [1, 5, 3]:
  - add(1, 0): lo=[(-1,0)], lo_size=1, hi=[]. target_lo=2. rebalance: nothing.
  - add(5, 1): lo top is -(-1)=1, 5>1, push to hi. lo=[(-1,0)], hi=[(5,1)], lo_size=1, hi_size=1. rebalance: lo_size < 2, pop hi(5,1), push lo(-5,1). lo=[(-5,1),(-1,0)], hi=[], lo_size=2, hi_size=0.
  
  Wait, that's wrong. After adding 5 to hi, lo_size=1, hi_size=1. target_lo=(3+1)//2=2. lo_size < target_lo, so pop hi, push to lo. hi_size=0, lo_size=2. 
  
  - add(3, 2): prune_lo. lo top: (-5,1), val=5. 3<=5, push to lo. lo=[(-5,1),(-1,0),(-3,2)], lo_size=3. rebalance: lo_size=3 > target_lo=2. pop lo: (-5,1) [wait, is (-5,1) the top of a max-heap stored as negatives? heapq is a min-heap, so the smallest value is at top. lo stores (-5,1), (-1,0), (-3,2). As a min-heap on first element: (-5,1) < (-3,2) < (-1,0). So top is (-5,1), which corresponds to value 5.]
  
  pop (-5,1): lo_size=2, push (5,1) to hi. hi_size=1. Now lo=[(-3,2),(-1,0)], hi=[(5,1)]. lo_size=2=target_lo. Done.
  
  median: k=3 odd, return -lo[0][0] = 3. Correct! [1,5,3] sorted is [1,3,5], median=3. ✓

- Slide to [5, 3, 2]:
  - remove(0): val=nums[0]=1. prune_lo: top (-3,2), not removed. 1 <= 3? Yes. lo_size=2-1=1. removed={0}.
  - add(2, 3): prune_lo: top (-3,2). 2<=3, push to lo. lo=[(-3,2),(-1,0),(-2,3)]. lo_size=2. rebalance: lo_size=2=target_lo=2. Done.
  
  Hmm wait, but index 0 is removed and still in lo. That's fine, it'll be pruned later.
  
  - median: prune_lo: top is (-3,2), not removed. return 3. [5,3,2] sorted is [2,3,5], median=3. ✓

- Slide to [3, 2, 4]:
  - remove(1): val=nums[1]=5. prune_lo: top (-3,2), not removed. 5<=3? No. hi_size=1-1=0. removed={0,1}.
  - add(4, 4): prune_lo: top (-3,2), not removed. 4<=3? No. Push to hi: hi=[(4,4),(5,1)]. hi_size=1. rebalance: lo_size=1 < target_lo=2. prune_hi: top (4,4), not removed. Pop (4,4). hi_size=0. Push (-4,4) to lo. lo_size=2. lo=[(-4,4),(-1,0),(-3,2),(-2,3)]. Hmm wait, is (-4,4) < (-3,2)? -4 < -3, yes. So top is (-4,4). But we want max, and max-heap stored as negative min-heap means top is most negative, which is the largest value. -4 corresponds to 4. Is 4 the largest in lo? Elements in lo: -4→4, -1→1, -3→3, -2→2. Max is 4. But 1 and 2 have removed indices. Effective elements in lo: 4(idx4), 3(idx2). lo_size=2. ✓
  
  hi=[(5,1)]. hi_size=0 (but (5,1) has removed index). Wait, I set hi_size=0 after popping (4,4). But (5,1) is still in hi with removed index. That's fine, it's lazy.
  
  median: prune_lo: top (-4,4), not removed. k=3 odd, return 4. [3,2,4] sorted is [2,3,4], median=3. ✗!

Oh no, that's wrong! Let me re-trace.

Wait, let me re-examine. After removing index 1 (val=5):
- lo has effective elements: idx2 (val 3), idx3 (val 2). lo_size should be 2. But wait, after the previous step, lo_size was 2. Then remove(1): 5 > -(-3)=3? Yes (5>3). So hi_size -= 1. lo_size stays 2.

Wait, I made an error earlier. Let me re-trace the second slide more carefully.

After initial build [1, 5, 3]:
- lo: contains (-5,1), (-1,0), (-3,2) → but as min-heap on first element: (-5,1) is top.
  Actually wait. heapq in Python is a min-heap. lo stores (-val, idx). The top is the minimum, i.e., the most negative, i.e., the largest val. So top of lo is (-5, 1) representing val 5. But that's wrong for a median of [1,5,3]!

OH WAIT. I think I have a bug. Let me re-trace the initial build.

nums = [1, 5, 3, 2, 4], k=3, target_lo = 2.

- add(1, 0): lo empty, push (-1, 0). lo=[(-1,0)], lo_size=1, hi=[]. rebalance: lo_size=1 < 2. But hi is empty, can't pop from hi. PROBLEM!

Ah, I see the issue. In the initial build, when lo_size < target_lo but hi is empty, we can't move elements. The rebalance loop `while lo_size < target_lo: pop hi` would fail if hi is empty.

I need to handle this case. During initial build, elements should just go into lo until it reaches target_lo, then overflow to hi.

Let me fix the add function:

```python
def add(val, idx):
    nonlocal lo_size, hi_size
    prune_lo()
    if lo_size == 0 or val <= -lo[0][0]:
        heapq.heappush(lo, (-val, idx))
        lo_size += 1
    else:
        heapq.heappush(hi, (val, idx))
        hi_size += 1
    rebalance()

def rebalance():
    nonlocal lo_size, hi_size
    target_lo = (k + 1) // 2
    
    while lo_size > target_lo:
        prune_lo()
        neg_val, idx = heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, (-neg_val, idx))
        hi_size += 1
    
    while lo_size < target_lo and hi_size > 0:
        prune_hi()
        val, idx = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, (-val, idx))
        lo_size += 1
```

I added `hi_size > 0` condition. But this means during initial build, elements might go to hi first and then get moved to lo. Let me re-trace:

- add(1, 0): lo empty. Push (-1,0) to lo. lo_size=1. rebalance: lo_size=1 < 2 but hi_size=0. Skip. State: lo=[(-1,0)], lo_size=1, hi=[], hi_size=0.

- add(5, 1): prune_lo: top (-1,0). 5 > 1. Push (5,1) to hi. hi_size=1. rebalance: lo_size=1 < 2, hi_size=1 > 0. Pop hi: (5,1). Push (-5,1) to lo. lo_size=2, hi_size=0. lo=[(-5,1),(-1,0)]. Done.

- add(3, 2): prune_lo: top (-5,1), val=5. 3 <= 5. Push (-3,2) to lo. lo_size=3. rebalance: lo_size=3 > 2. Pop lo: (-5,1). Push (5,1) to hi. lo_size=2, hi_size=1. lo=[(-3,2),(-1,0)], hi=[(5,1)]. Done.

median: prune_lo: top (-3,2), not removed. k=3 odd. Return 3. ✓ ([1,5,3] → sorted [1,3,5] → median 3)

Slide to [5, 3, 2] (window starting at index 1):
- remove(0): val=nums[0]=1. prune_lo: top (-3,2), not removed. 1 <= 3? Yes. lo_size=1. removed={0}.
- add(2, 3): prune_lo: top (-3,2), not removed. 2 <= 3? Yes. Push (-2,3) to lo. lo_size=2. rebalance: lo_size=2 = target_lo=2. Done.
  lo=[(-3,2),(-1,0),(-2,3)], lo_size=2, hi=[(5,1)], hi_size=1.
  
  Wait, lo has 3 elements in the heap but lo_size=2 (because index 0 is removed). The heap is a min-heap on (-val, idx): (-3,2) < (-2,3) < (-1,0). So top is (-3,2), val=3. ✓

- median: prune_lo: top (-3,2), not in removed. k=3, return 3. [5,3,2] → sorted [2,3,5] → median 3. ✓

Slide to [3, 2, 4] (window starting at index 2):
- remove(1): val=nums[1]=5. prune_lo: top (-3,2), not removed. 5 <= 3? No. hi_size=0. removed={0,1}.
- add(4, 4): prune_lo: top (-3,2), not removed. 4 <= 3? No. Push (4,4) to hi. hi_size=1. rebalance: lo_size=1 < 2, hi_size=1 > 0. prune_hi: top (4,4), not removed. Pop (4,4). Push (-4,4) to lo. lo_size=2, hi_size=0.
  lo=[(-4,4),(-1,0),(-2,3),(-3,2)], lo_size=2. hi=[(5,1)], hi_size=0.
  
  Heap order for lo: min of (-4,4), (-1,0), (-2,3), (-3,2) → (-4,4) is smallest → top is (-4,4), val=4.
  
  But effective elements in lo (not in removed): idx4(val4), idx3(val2), idx2(val3). That's 3 effective elements but lo_size=2. CONTRADICTION!

Wait, I think I miscounted. Let me recount.
- Initially after build: lo had indices 2(val3), 0(val1). lo_size=2.
- remove(0): lo_size=1.
- add(2,3): pushed to lo. lo_size=2.
- remove(1): didn't affect lo (went to hi). lo_size=2. Wait, I said hi_size went from 1 to 0.
  
  Actually after first slide, hi=[(5,1)], hi_size=1.
  remove(1): val=5. 5 <= -(-3)=3? No. hi_size=1-1=0. removed={0,1}.
  
- add(4,4): push to hi. hi_size=1. rebalance: lo_size=1 < 2. pop hi (4,4). Push (-4,4) to lo. lo_size=2, hi_size=0.

So lo heap contains: (-3,2), (-1,0), (-2,3), (-4,4). lo_size=2.
Effective in lo (not in removed={0,1}): (-3,2)✓, (-2,3)✓, (-4,4)✓. That's 3 effective but lo_size=2.

PROBLEM! lo_size should be 3, not 2.

I see the bug. When I popped (-5,1) from lo during the initial build's rebalance, I decremented lo_size and incremented hi_size. But then (-5,1) went to hi. Later, (5,1) was in hi. When I popped (4,4) from hi and pushed (-4,4) to lo, lo_size went from 1 to 2. But the element (-4,4) added to lo, plus the existing (-3,2), (-1,0), (-2,3) in lo... 

Wait, the issue is that lo_size is supposed to track the number of EFFECTIVE elements in lo. Let me recount:

After initial build: lo has effective elements {0:1, 2:3}. lo_size=2. ✓
After remove(0): lo_size=1. Effective: {2:3}. ✓
After add(2,3): pushed (-2,3) to lo. lo_size=2. Effective: {2:3, 3:2}. ✓ (but heap also has (-1,0) which is removed)
After remove(1): this affected hi, not lo. lo_size still 2. ✓
After add(4,4): pushed to hi. Then rebalance moved (4,4) from hi to lo. lo_size=2→wait, it was 2, we pop from hi and push to lo: lo_size=2+1=3? 

Oh wait, I wrote `lo_size += 1` in the rebalance when moving from hi to lo. Let me re-read my rebalance:

```python
while lo_size < target_lo and hi_size > 0:
    prune_hi()
    val, idx = heapq.heappop(hi)
    hi_size -= 1
    heapq.heappush(lo, (-val, idx))
    lo_size += 1
```

Before rebalance: lo_size=1 (after remove(1) decremented... wait no, remove(1) decremented hi_size not lo_size).

Let me re-trace more carefully:

After first slide (window [5,3,2]):
- lo_size=2, hi_size=1
- lo heap: [(-3,2), (-1,0), (-2,3)] (as heap: top is (-3,2))
- hi heap: [(5,1)]
- removed={0}

Second slide (window [3,2,4]):
- remove(1): val=nums[1]=5. prune_lo: top (-3,2), not removed. 5 <= 3? No. hi_size=1-1=0. removed={0,1}.
  Now: lo_size=2, hi_size=0.
  
- add(4, 4): prune_lo: top (-3,2), not removed. 4 <= 3? No. Push (4,4) to hi. hi_size=1.
  rebalance: lo_size=2, target_lo=2. lo_size > target_lo? No (2>2 is false). lo_size < target_lo? No. Done.
  
  lo_size=2, hi_size=1.
  lo heap: [(-3,2), (-1,0), (-2,3)]
  hi heap: [(4,4), (5,1)]  (min-heap: (4,4) < (5,1))

- median: prune_lo: top (-3,2), not removed. prune_hi: top (4,4), not removed. k=3 odd. Return -(-3) = 3. ✓ ([3,2,4]→sorted[2,3,4]→median 3)

OK so I made an arithmetic error before. Let me redo the case where remove decrements lo_size:

Third slide (window [2,4,...]):  Actually with n=5 and k=3, there are only 3 windows. Let me try a different example.

Actually wait, n=5, k=3: windows are at indices [0,2], [1,3], [2,4]. That's 3 windows. The third is [3,2,4] which we just computed.

Let me try n=6, k=4 to test even k.

nums = [1, 5, 3, 2, 4, 6], k=4, target_lo=2.

Initial build:
- add(1,0): lo=[(-1,0)], lo_size=1. rebalance: 1<2, hi_size=0, skip.
- add(5,1): 5>1, push to hi. hi=[(5,1)], hi_size=1. rebalance: 1<2, hi_size=1>0. Pop (5,1). Push (-5,1) to lo. lo=[(-5,1),(-1,0)], lo_size=2, hi=[], hi_size=0.
- add(3,2): prune_lo: top (-5,1), val=5. 3<=5. Push (-3,2) to lo. lo=[(-5,1),(-1,0),(-3,2)], lo_size=3. rebalance: 3>2. Pop (-5,1). Push (5,1) to hi. lo=[(-3,2),(-1,0)], lo_size=2, hi=[(5,1)], hi_size=1.
- add(2,3): prune_lo: top (-3,2), val=3. 2<=3. Push (-2,3) to lo. lo=[(-3,2),(-1,0),(-2,3)], lo_size=3. rebalance: 3>2. Pop (-3,2). Push (3,2) to hi. lo=[(-2,3),(-1,0)], lo_size=2, hi=[(3,2),(5,1)], hi_size=2.

median: prune_lo: top (-2,3), val=2. prune_hi: top (3,2), val=3. k=4 even. (2+3)/2=2.5.
[1,5,3,2] → sorted [1,2,3,5] → median (2+3)/2=2.5. ✓

Slide to [5,3,2,4]:
- remove(0): val=1. prune_lo: top (-2,3), val=2. 1<=2. lo_size=1. removed={0}.
- add(4,4): prune_lo: top (-2,3), val=2. 4<=2? No. Push (4,4) to hi. hi_size=3. rebalance: lo_size=1 < 2. prune_hi: top (3,2), not removed. Pop (3,2). Push (-3,2) to lo. lo_size=2, hi_size=2. lo_size=2=target. Done.
  lo=[(-3,2),(-1,0),(-2,3)], lo_size=2. hi=[(4,4),(5,1)], hi_size=2.
  
  Effective lo: idx2(3), idx3(2) [idx0 removed]. Count=2. ✓
  Effective hi: idx4(4), idx1(5) [none removed]. Count=2. ✓

- median: prune_lo: top (-3,2), not removed. prune_hi: top (4,4), not removed. (3+4)/2=3.5.
  [5,3,2,4] → sorted [2,3,4,5] → median (3+4)/2=3.5. ✓

Slide to [3,2,4,6]:
- remove(1): val=5. prune_lo: top (-3,2), val=3. 5<=3? No. hi_size=2-1=1. removed={0,1}.
- add(6,5): prune_lo: top (-3,2), val=3. 6<=3? No. Push (6,5) to hi. hi_size=2. rebalance: lo_size=2=target. Done.
  lo=[(-3,2),(-1,0),(-2,3)], lo_size=2. hi=[(4,4),(6,5),(5,1)], hi_size=2.
  
  Effective hi: idx4(4), idx5(6) [idx1 removed]. Count=2. ✓

- median: prune_lo: top (-3,2), not removed. prune_hi: top (4,4), not removed. (3+4)/2=3.5.
  [3,2,4,6] → sorted [2,3,4,6] → median (3+4)/2=3.5. ✓

Looks correct.

Now, let me also think about the case where `lo` might be empty during `remove` or `add`. With k=1:
- target_lo = 1.
- add(5, 0): lo empty. Push (-5,0). lo_size=1. rebalance: 1=1. Done.
- median: return 5. ✓
- remove(0): prune_lo: top (-5,0). 5<=5. lo_size=0. removed={0}.
- add(3, 1): prune_lo: lo has [(-5,0)] with idx0 removed. Prune: pop it. lo empty. Push (-3,1). lo_size=1. ✓

OK looks good.

One more concern: in `rebalance`, when I pop from lo to move to hi, I call `prune_lo()` first. But what if after pruning, lo is empty? Then `heapq.heappop(lo)` would fail. But `lo_size > target_lo >= 0`, so if lo_size > 0, there must be effective elements in lo. After pruning (which removes elements from the top that are in removed), the top must be an effective element. But what if ALL elements in lo are removed? Then lo_size would be 0, and lo_size > target_lo (target_lo >= 1 for k >= 1) wouldn't be true. Actually for k=1, target_lo=1. If lo_size > 1... can't happen since we only have 1 effective element. For k=2, target_lo=1. lo_size could be 2 (both in lo), then we move one to hi. lo_size=2 > 1, so we pop. After prune_lo, the top is effective. Pop it. lo_size=1. ✓

I think the algorithm is correct. Let me also handle potential edge cases:
- k=1: each window is one element, median is that element.
- k=len(nums): one window, median of entire array.
- All same values.
- Negative values.

I think the code handles all these.

Let me also think about performance. For n=200,000, k=1,000:
- Initial build: k=1,000 adds, each O(log k) = O(10). Total: 10,000 operations.
- Sliding: (n-k) = 199,000 iterations. Each iteration:
  - prune_lo + prune_hi: amortized O(1) (each element pruned once total)
  - remove: prune + O(1) + set.add. O(1) amortized.
  - add: prune + O(log heap_size) + rebalance (O(1) amortized moves, each O(log heap_size)).
  - median: prune + O(1).
  
  The heap size is at most O(k + number of un-pruned removed elements). In the worst case, this could be O(n), but in practice it's O(k). Let's say O(k) = O(1000), log(1000) ≈ 10.
  
  Per iteration: ~5 heap operations × 10 = 50 comparisons.
  Total: 199,000 × 50 ≈ 10 million operations. In Python, this might take 1-3 seconds.

Hmm, that might be tight. Let me see if I can optimize.

Actually, in Python, heapq operations on lists of tuples are not super fast. Let me think about whether there's a faster approach.

Alternative: use the `sortedcontainers` module? No, we need standard library only.

Alternative: since we only need the median (not all order statistics), and k is 1000, maybe we can use a simpler approach. But O(nk) is 200 million, too slow.

Let me optimize the Python code:
1. Use local variable references for heapq functions.
2. Minimize function call overhead by inlining where possible.
3. Use a list instead of a set for `removed` (but set is O(1) for membership).

Actually, let me think about whether the heap sizes will actually stay bounded. After the initial build, we have k elements. Each step: remove 1 (lazy), add 1. The heap size grows by 1 per step (the new element is added, the old one is marked removed but stays). The prune function removes from the top. So the heap size could grow to k + n in the worst case if we never prune (e.g., if removed elements are always deep in the heap).

But in practice, after n steps, the total number of elements in the heap is k + n, and we prune from the top. Each element is pushed once and popped once (either in normal operation or during pruning). So total heap operations over the entire algorithm is O(n). Each individual operation is O(log(heap_size)) which could be up to O(log(n)). Total: O(n log n).

For n=200,000: 200,000 × 18 = 3.6M. In Python, with heapq (which is C-optimized in CPython), this should be fast. Actually, heapq in CPython is implemented in Python but the underlying list operations are C-level. Let me just go with it.

Actually, I just realized: in CPython, `heapq` is implemented in pure Python (heapq.py), but there's a C accelerator `_heapq` that's used when available. In practice, heapq operations are quite fast.

Let me write the final clean version. I'll add a few optimizations:
- Cache `heapq.heappush` and `heapq.heappop` as local variables.
- Use `remove_set` as a local name.

Actually, let me also reconsider: can I avoid the set for removed indices? I could use a boolean array. `removed = [False] * n`. Checking `removed[idx]` is O(1) and might be faster than a set lookup.

Let me write the final version:

```python
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    target_lo = (k + 1) // 2
    
    lo = []  # max-heap: stores (-val, idx)
    hi = []  # min-heap: stores (val, idx)
    removed = [False] * n
    lo_size = 0
    hi_size = 0
    
    def prune_lo():
        while lo and removed[lo[0][1]]:
            heappop(lo)
    
    def prune_hi():
        while hi and removed[hi[0][1]]:
            heappop(hi)
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            prune_lo()
            neg_val, idx = heappop(lo)
            lo_size -= 1
            heappush(hi, (-neg_val, idx))
            hi_size += 1
        while lo_size < target_lo and hi_size > 0:
            prune_hi()
            val, idx = heappop(hi)
            hi_size -= 1
            heappush(lo, (-val, idx))
            lo_size += 1
    
    # Build initial window
    for i in range(k):
        v = nums[i]
        if lo_size == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, i))
            lo_size += 1
        else:
            heappush(hi, (v, i))
            hi_size += 1
        rebalance()
    
    result = []
    
    def get_median():
        prune_lo()
        prune_hi()
        if k & 1:
            return float(-lo[0][0])
        else:
            return (-lo[0][0] + hi[0][0]) * 0.5
    
    result.append(get_median())
    
    for i in range(1, n - k + 1):
        # Remove nums[i-1]
        out_val = nums[i - 1]
        prune_lo()
        if lo_size == 0 or out_val <= -lo[0][0]:
            lo_size -= 1
        else:
            hi_size -= 1
        removed[i - 1] = True
        
        # Add nums[i + k - 1]
        in_val = nums[i + k - 1]
        prune_lo()
        if lo_size == 0 or in_val <= -lo[0][0]:
            heappush(lo, (-in_val, i + k - 1))
            lo_size += 1
        else:
            heappush(hi, (in_val, i + k - 1))
            hi_size += 1
        rebalance()
        
        result.append(get_median())
    
    return result
```

Wait, I have a subtle issue. In the initial build, I'm calling `rebalance()` after every add. But during the initial build, the window isn't complete yet (we have fewer than k elements). The target_lo is `(k+1)//2`, but we only have `i+1` elements at step i. If i+1 < target_lo, the rebalance `while lo_size < target_lo` would try to pop from hi, but hi might be empty.

I already have `hi_size > 0` in that condition. So if hi is empty and lo_size < target_lo, the loop just doesn't execute. That means lo might have fewer than target_lo elements during build. That's fine because we're still building.

But wait, what if lo_size > target_lo during build? For example, if k=4, target_lo=2, and we add 1, 2, 3, 4 in decreasing order:
- add(4): lo=[(-4,0)], lo_size=1.
- add(3): 3<=4, push to lo. lo_size=2. rebalance: 2=2. Done.
- add(2): 2<=4 (top is -(-4)=4). Push to lo. lo_size=3. rebalance: 3>2. Pop lo top (-4,0). Push (4,0) to hi. lo_size=2, hi_size=1.
- add(1): prune_lo: top (-3,1), val=3. 1<=3. Push to lo. lo_size=3. rebalance: 3>2. Pop lo top (-3,1). Push (3,1) to hi. lo_size=2, hi_size=2.

After build: lo=[(-2,2),(-1,3)] (effective: 2,1), hi=[(3,1),(4,0)] (effective: 3,4). 
Window [4,3,2,1] sorted: [1,2,3,4]. Median: (2+3)/2=2.5.
get_median: lo top (-2,2)→2, hi top (3,1)→3. (2+3)/2=2.5. ✓

Hmm wait, lo should have the lower half: {1,2}. hi should have upper half: {3,4}. But lo top is -(-2)=2, which is the max of lo. And hi top is 3, which is the min of hi. ✓

Looks good. But I realize there's still a potential issue during build: what if we add elements all to hi (because they're all larger than lo's top)? Then lo_size < target_lo and hi_size > 0, so rebalance moves from hi to lo. But what if lo is empty and we're trying to check `-lo[0][0]`?

In the add step: `if lo_size == 0 or v <= -lo[0][0]`. If lo_size is 0 but lo is not empty (all removed)... during build, nothing is removed. So if lo_size is 0, lo is empty. The condition `lo_size == 0` handles it.

But what about during sliding? After `prune_lo()`, if lo_size is 0 but lo still has elements? No, if lo_size is 0, all elements in lo are marked removed. After prune_lo, they'd all be popped from the top... but not necessarily ALL of them, just those at the top. Deeper removed elements stay.

Hmm, this is a problem. `lo_size` tracks effective elements. `prune_lo()` only removes removed elements from the TOP. If lo_size is 0 but lo still has (removed) elements deeper in the heap, then `lo` is not empty but has no effective elements. In that case, `-lo[0][0]` would give us the top of a "removed" element. But we check `lo_size == 0` first, so we'd go to the else branch (push to hi). That's correct!

Wait, but what if `lo_size > 0` and after `prune_lo()`, the top is valid? Then we use it for comparison. Good.

What if `lo_size > 0` but `prune_lo()` makes lo empty? That can't happen: if lo_size > 0, there's at least one effective element in lo, and it must be somewhere in the heap. After pruning removed elements from the top, the top must be effective (if any effective element reaches the top) OR there are removed elements on top of effective elements. But `prune_lo` pops until the top is not removed. If the top after pruning is removed... wait, the while loop continues until top is not removed. So after `prune_lo()`, either lo is empty or top is not removed. If lo_size > 0 and lo is empty... that means all elements in lo were removed and pruned. But then lo_size should be 0. Contradiction. So if lo_size > 0, after prune_lo, lo is not empty and top is effective. ✓

I'm now fairly confident the algorithm is correct. Let me finalize the code.

One more thing: the `get_median` function accesses `lo[0]` and `hi[0]`. For odd k, we only need lo. For even k, we need both. After `rebalance()`, we have lo_size=target_lo and hi_size=k-target_lo. For k=1: target_lo=1, hi_size=0. We only access lo. ✓. For k=2: target_lo=1, hi_size=1. We access both. ✓.

But wait, after `prune_lo()` and `prune_hi()`, could lo or hi be empty when we access them? If lo_size > 0, after prune_lo, lo is not empty. If hi_size > 0, after prune_hi, hi is not empty. Since we only access lo when k is odd (lo_size >= 1) and both when k is even (lo_size >= 1, hi_size >= 1), we're safe.

Actually for k=1: target_lo=1, hi_size=0. We access lo[0] only. lo_size=1 > 0. ✓
For k=2: target_lo=1, hi_size=1. We access lo[0] and hi[0]. Both sizes > 0. ✓

I think this is solid. Let me write the final clean version.

Oh wait, one more thing. In the `remove` step, I do:
```python
prune_lo()
if lo_size == 0 or out_val <= -lo[0][0]:
    lo_size -= 1
else:
    hi_size -= 1
```

But what if `out_val` equals `-lo[0][0]`? The element could be in either heap (if there are duplicates at the boundary). We assign it to lo. Is that correct?

If the value equals the top of lo, it could be in lo (as the top) or in hi (as a duplicate of the top). If it's in hi and we decrement lo_size, we'd have an inconsistency.

Hmm, this is the fundamental issue with the "compare with boundary" approach. The standard trick is: since lo_size and hi_size are just counters, and we're marking the element as removed, the actual element will be pruned from whichever heap it's in. The size adjustment just needs to be consistent with the rebalancing.

Let me think again. The invariant we maintain is:
- lo_size + hi_size = number of effective elements in the window
- lo_size = target_lo (after rebalancing)

When we remove an element:
- We decrement either lo_size or hi_size by 1
- We mark the element as removed
- After add + rebalance, sizes are restored

The key question: does it matter which heap we "assign" the removal to?

Consider: element with value v is in hi (but equals lo's top). We decrement lo_size. Then rebalance moves an element from hi to lo. The element we moved might be different from v, but v will eventually be pruned from hi. The sizes work out: lo_size went down by 1, then went up by 1 (from rebalance). Net: lo_size unchanged. hi_size went up by 1 (from rebalance) but v is marked removed, so effective hi_size decreased by 1 (v) but then increased by 1 (new element from add). 

Hmm, this is getting confusing. Let me think of it differently.

The sizes lo_size and hi_size are bookkeeping that ensure rebalance moves the right number of elements. The actual elements in the heaps include removed ones (which are lazily cleaned up). The key invariant is:

After rebalance: lo_size = target_lo, hi_size = k - target_lo.

When we remove an element from the window:
- Total effective elements goes from k to k-1.
- We need lo_size + hi_size to go from k to k-1.
- We decrement one of them.

The choice of which to decrement determines which heap "loses" an element for rebalancing purposes. If we decrement lo_size, rebalance will move an element from hi to lo (after the add). If we decrement hi_size, rebalance might not need to do anything (if the add goes to the same heap).

The important thing is: after removing and before adding, we have k-1 effective elements. After adding, we have k again. The rebalance ensures lo_size = target_lo.

The actual correctness of the median depends on: all effective elements in lo are ≤ all effective elements in hi. Is this maintained?

If we incorrectly assign a removal (e.g., element was in hi but we decrement lo_size), then:
- lo_size is temporarily one less than it should be
- After add + rebalance, one element moves from hi to lo
- This moved element is the smallest in hi, which is ≥ all in lo. So the invariant is maintained.

What if the element was in lo but we decrement hi_size?
- hi_size is one less. After add, rebalance might not move anything (or might not need to). But lo has one too many elements. The top of lo might be larger than some element in hi.

Wait, this could break the invariant! Let me think of a concrete example.

lo: {1, 2}, hi: {3, 4}. k=4, target_lo=2.
Remove element 2 (which is in lo). We check: 2 <= -lo[0][0] = 2. Yes, decrement lo_size. lo_size=1. ✓ (correct assignment)

Remove element 3 (which is in hi). We check: 3 <= 2? No. Decrement hi_size. hi_size=1. ✓

What about duplicates? lo: {2, 2}, hi: {2, 3}. Remove one 2. Check: 2 <= 2. Decrement lo_size. lo_size=1. But the removed 2 might have been in hi! 

If the removed 2 was in hi: hi now has effective {3}, but hi_size was decremented from... wait, we decremented lo_size, not hi_size. So hi_size is still 2 (both elements in hi's heap, but one is marked removed). lo_size=1.

After add + rebalance: we'll move one element from hi to lo (since lo_size < target_lo). The top of hi (after pruning removed) is 3. We move 3 to lo. lo: {2, 3}, hi: {2(removed), 3(moved)}. 

Wait, that's wrong. We'd have 3 in lo and... let me re-examine.

Actually, let me use concrete heap contents:
lo heap: [(-2, idx_a), (-2, idx_b)] → both represent value 2. lo_size=2.
hi heap: [(2, idx_c), (3, idx_d)] → values 2 and 3. hi_size=2.
Window effective values: {2, 2, 2, 3}. Sorted: [2, 2, 2, 3]. Median: (2+2)/2=2.

Now remove the element at idx_c (value 2, which is in hi).
Check: 2 <= -lo[0][0] = 2. Yes. Decrement lo_size. lo_size=1.
removed[idx_c] = True.

Now: lo_size=1, hi_size=2, effective: lo has 1 element (one of the 2s), hi has 1 element (3, since 2 is removed). Total effective: 2. But k-1=3. Wait, we removed one from a window of 4, so 3 effective. lo effective: 1, hi effective: 1. Total: 2. That's wrong! We should have 3 effective.

Oh wait, we only removed ONE element from the window. The window had 4 elements. After removal, 3 remain. lo had 2 (effective), hi had 2 (effective). Remove one from hi (idx_c). Effective: lo=2, hi=1. Total=3. ✓. But we decremented lo_size to 1. So lo_size=1 doesn't match lo's effective count of 2.

This IS a bug! The assignment to the wrong heap causes lo_size to be wrong.

Hmm, so the "compare with boundary" approach doesn't work perfectly with duplicates? Let me look at how other implementations handle this.

Actually, looking at various implementations, the standard approach is exactly this: compare with the boundary and assign the size decrement. The key insight I was missing is:

The size counters don't need to exactly match the number of effective elements in each heap. They just need to guide the rebalancing to maintain the invariant. As long as:
1. After rebalance, lo_size = target_lo and the actual max of effective lo ≤ actual min of effective hi
2. The median is correctly computed from the tops

Let me re-examine: lo_size=1, hi_size=2. target_lo=2.
After add(5, idx_e): 5 > 2 (lo top). Push to hi. hi_size=3. rebalance: lo_size=1 < 2, hi_size=3 > 0. Prune_hi: top is (2, idx_c) which is removed. Pop it. hi_size stays 3 (we already decremented for idx_c... wait, no. We decremented lo_size for idx_c, not hi_size).

Ugh, this is getting really confusing. Let me think about this differently.

Actually, I think the issue is more subtle. Let me look at how LeetCode 480 solutions handle this.

The standard approach for "Find Median from Data Stream" with two heaps and lazy deletion:

```
def findMedian():
    # median is either top of lo (odd) or avg of tops (even)

def addNum(num):
    # push to lo, pop max of lo, push to hi
    # if hi has more than lo, move min of hi to lo
    # (ensures lo has ceil(n/2) elements)

def remove(num):
    # if num <= median: lo_size -= 1
    # else: hi_size -= 1  
    # add num to delayed dict
    # rebalance
```

The key: when we remove, we don't know for certain which heap it's in (due to duplicates at the boundary). But the approach still works because:

The size counters are used ONLY for rebalancing. The actual heaps contain both effective and delayed elements. The rebalancing moves elements between heaps based on size counters. The actual element that's "removed" will be cleaned up by pruning when it reaches the top.

The invariant we maintain is:
- Every effective element in lo ≤ every effective element in hi.
- lo_size is the count we WANT in lo (for median purposes), not necessarily the exact count of effective elements currently in lo's heap.

Wait, that can't be right either. If lo_size says 1 but lo has 2 effective elements and hi has 1 effective element, and we compute median from lo's top... the top of lo is the max of lo's elements, which might not be the median.

Hmm, let me think about this more carefully with the concrete example:

lo heap: [(-2, a), (-2, b)], lo_size=1 (we said one element is "removed" but we decremented lo_size even though the removed element was in hi)
hi heap: [(2, c)(removed), (3, d)], hi_size=2

Effective elements: {a:2, b:2, d:3} (c is removed). Total: 3.
We want median of 3 elements: middle is 2.

Median computation: prune_lo: top (-2, a), not removed. prune_hi: top (2, c), removed! Pop. Top (3, d), not removed.
k was 4, but now we're computing median after removing one and adding one, so k is still 4. Wait, in the sliding window, we always have exactly k elements. Let me re-examine.

Oh right, in the sliding window, after remove + add, we always have k elements. The remove makes it k-1, the add makes it k again. The median is computed after both.

Let me re-examine: after remove(idx_c) + add(val, idx_e):

remove(idx_c): 2 <= 2, lo_size -= 1 → lo_size=1. removed[idx_c]=True.
add(val=5, idx_e): prune_lo: top (-2,a). 5 > 2. Push (5,e) to hi. hi_size=3.
rebalance: lo_size=1 < target_lo=2. prune_hi: top (2,c) removed, pop. Top (3,d) not removed. Pop (3,d). hi_size=2. Push (-3,d) to lo. lo_size=2. lo_size=2=target_lo. Done.

Now: lo heap: [(-3,d), (-2,b)] (also (-2,a) somewhere). Wait, (-2,a) might still be there. Let me track lo heap contents: [(-2,a), (-2,b)] + we popped (-2,a)? No, we only pushed (-3,d). lo heap: [(-3,d), (-2,a), (-2,b)]. As min-heap: (-3,d) < (-2,a) < (-2,b). Top is (-3,d).

hi heap: [(5,e)] (after popping (2,c) and (3,d)). hi_size=2? Wait, let me retrack hi_size.

Before add: lo_size=1, hi_size=2.
add: push (5,e) to hi. hi_size=3.
rebalance: lo_size=1 < 2. prune_hi: pop (2,c) [removed]. But hi_size doesn't change during prune! hi_size is still 3. Then pop (3,d): hi_size=3-1=2. Push (-3,d) to lo. lo_size=1+1=2.
lo_size=2=target_lo. Done. hi_size=2.

So: lo_size=2, hi_size=2. Total: 4. ✓ (k=4).
Effective in lo: (-3,d)→3, (-2,a)→2, (-2,b)→2. That's 3 effective in lo but lo_size=2!

PROBLEM! The invariant is violated. We have 3 effective elements in lo but think we have 2.

Hmm, but wait. Is (-2,a) actually effective? Let me check. removed = {idx_c}. idx_a and idx_b are not removed. So yes, (-2,a) is effective. We have 3 effective in lo but lo_size=2.

This means the top of lo (-3→val 3) is NOT the median of the lower half. The lower half should be {2, 2, 2} (or {2, 2} for the lower half of 4). 

Actually wait, the window now has elements at indices a, b, d, e. Their values are 2, 2, 3, 5. Sorted: [2, 2, 3, 5]. Median: (2+3)/2 = 2.5.

Our computation: lo top is -(-3)=3, hi top is 5. (3+5)/2=4. WRONG!

So there IS a correctness bug with the "compare with boundary" approach when duplicates are at the boundary!

This is a known issue. The fix is: when comparing, use the value AND the heap membership. But we don't track which heap each element is in.

Alternative fix: always assign the removal to the heap where the value is less than or equal to the top of lo (which is what we do), BUT this can be wrong for duplicates.

The actual fix used in practice: when the value equals the boundary, we can assign it to either heap. The issue arises because we assign to lo but the element was in hi. 

Actually, looking more carefully at implementations, I think the correct approach is:

When removing, if the value is strictly less than the top of lo, it's in lo. If strictly greater, it's in hi. If EQUAL to the top of lo, it could be in either. The common solution is to check against `lo[0]` and `hi[0]`:
- If val < hi's top (or hi is empty): it's in lo (or on the boundary, assign to lo)
- If val > lo's top (or lo is empty): it's in hi

Actually, a simpler correct rule: the element is in lo if and only if its value is ≤ max of effective lo elements. Since max of effective lo is -lo[0][0] (after pruning), and all effective lo elements are ≤ this, an element with value ≤ this could be in lo. An element with value > this must be in hi.

For duplicates at the boundary: if value == -lo[0][0], it COULD be in lo or in hi. We assign to lo. This means if it was actually in hi, we incorrectly decrement lo_size. But the key question is: does this break the invariant?

The answer is YES, it can, as my example shows. So the simple approach has a bug.

How do correct implementations handle this? Let me look more carefully...

Actually, I think the issue is that the standard approach DOES work, but my trace is wrong. Let me re-examine.

In the standard two-heap median maintenance:
- All elements are pushed to lo first, then popped and pushed to hi.
- Or: push to the "correct" heap based on comparison with median.

The key invariant of the standard median maintenance:
- lo has ceil(n/2) elements, hi has floor(n/2) elements.
- max(lo) ≤ min(hi).

When we add to lo (based on ≤ comparison), we maintain this. When we remove and rebalance, we maintain this.

The issue is: when we "remove" an element by marking it as delayed, and we decrement the "wrong" heap's size, the rebalancing might move the wrong elements.

Let me look at this from a different angle. The correct approach that avoids this issue:

Use (value, index) tuples. When comparing for the "which heap" determination:
- The element was originally placed in a specific heap.
- We could track which heap each element is in.

OR: use a different rule for removal:
- If val ≤ top of lo: decrement lo_size.
- Else: decrement hi_size.

And for the rebalance to work correctly, we need:
- After rebalance, the top of lo (effective) ≤ top of hi (effective).

If we incorrectly decrement lo_size (the element was actually in hi), then after rebalance, we'll move an element from hi to lo. This moved element is the min of hi, which is ≥ max of lo (by invariant). After the move, max(lo) could now be > old max(lo), but it's still ≤ the new min(hi). So the invariant is maintained!

Wait, let me re-examine my example:

Before removal: lo effective: {2(a), 2(b)}. hi effective: {2(c), 3(d)}.
Invariant: max(lo)=2 ≤ min(hi)=2. ✓

Remove c (value 2, actually in hi). Assign to lo: lo_size=1.
Effective: lo has {2(a), 2(b)} but lo_size=1. hi has {3(d)} but hi_size=2.

After add 5(e) to hi: hi effective: {3(d), 5(e)}. hi_size=3.
Rebalance: lo_size=1 < 2. Move min(hi) to lo.
prune_hi: top (2,c) is removed, pop. Top (3,d). Pop (3,d). hi_size=2. Push (3,d) to lo. lo_size=2.

Now: lo effective: {2(a), 2(b), 3(d)}. lo_size=2. hi effective: {5(e)}. hi_size=2.
Wait, hi_size=2 but hi only has 1 effective element!

The total effective elements: 3(a) + 3(b) + 3(d) + 5(e) = 4. ✓
But lo_size + hi_size = 2 + 2 = 4. ✓ (sizes sum correctly)
But lo has 3 effective and hi has 1 effective, while sizes say 2 and 2.

Median computation: lo top (effective): after pruning, lo top is (-3,d)→3. hi top: (5,e)→5. Median: (3+5)/2=4. WRONG! Should be (2+3)/2=2.5.

So the algorithm IS broken. The size counters don't match reality when we misassign removals.

OK so I need a different approach. Options:

1. Track which heap each element is in.
2. Use a balanced BST / sorted list (but not in stdlib).
3. Use a different algorithm entirely.

Let me go with option 1: track heap membership.

```python
# heap_of[i] = 0 if element i is in lo, 1 if in hi
heap_of = [0] * n
```

When we push an element to lo or hi, we record which heap.
When we remove, we check heap_of[idx] to know which size to decrement.
When we move an element between heaps in rebalance, we update heap_of.

This is clean and correct. Let me rewrite:

```python
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    target_lo = (k + 1) // 2
    
    lo = []  # max-heap: (-val, idx)
    hi = []  # min-heap: (val, idx)
    removed = [False] * n
    heap_of = [-1] * n  # 0 = lo, 1 = hi
    lo_size = 0
    hi_size = 0
    
    def prune_lo():
        while lo and removed[lo[0][1]]:
            heappop(lo)
    
    def prune_hi():
        while hi and removed[hi[0][1]]:
            heappop(hi)
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            prune_lo()
            neg_val, idx = heappop(lo)
            lo_size -= 1
            heap_of[idx] = 1
            heappush(hi, (-neg_val, idx))
            hi_size += 1
        while lo_size < target_lo:
            prune_hi()
            val, idx = heappop(hi)
            hi_size -= 1
            heap_of[idx] = 0
            heappush(lo, (-val, idx))
            lo_size += 1
    
    for i in range(k):
        v = nums[i]
        if lo_size == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, i))
            lo_size += 1
            heap_of[i] = 0
        else:
            heappush(hi, (v, i))
            hi_size += 1
            heap_of[i] = 1
        rebalance()
    
    result = []
    
    # get median
    prune_lo()
    prune_hi()
    if k & 1:
        result.append(float(-lo[0][0]))
    else:
        result.append((-lo[0][0] + hi[0][0]) * 0.5)
    
    for i in range(1, n - k + 1):
        # Remove i-1
        if heap_of[i - 1] == 0:
            lo_size -= 1
        else:
            hi_size -= 1
        removed[i - 1] = True
        
        # Add i + k - 1
        new_idx = i + k - 1
        v = nums[new_idx]
        prune_lo()
        if lo_size == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, new_idx))
            lo_size += 1
            heap_of[new_idx] = 0
        else:
            heappush(hi, (v, new_idx))
            hi_size += 1
            heap_of[new_idx] = 1
        rebalance()
        
        # Get median
        prune_lo()
        prune_hi()
        if k & 1:
            result.append(float(-lo[0][0]))
        else:
            result.append((-lo[0][0] + hi[0][0]) * 0.5)
    
    return result
```

Now let me re-trace the problematic example:

Initial: lo={2(a), 2(b)}, hi={2(c), 3(d)}. heap_of: a→0, b→0, c→1, d→1.
lo_size=2, hi_size=2.

Remove c: heap_of[c]=1. hi_size=2-1=1. removed[c]=True.
Now lo_size=2, hi_size=1. Total=3.

Add 5(e): prune_lo: top (-2,a), not removed. 5>2. Push to hi. hi_size=2. heap_of[e]=1.
rebalance: lo_size=2=target_lo=2. Done.

Now: lo effective: {2(a), 2(b)}. hi effective: {3(d), 5(e)}. (2(c) is removed, 5(e) is new).
hi_size=2, lo_size=2. ✓
hi heap: [(2,c)(removed), (3,d), (5,e)]. 
Median: prune_hi: top (2,c) removed, pop. Top (3,d). (2+3)/2=2.5. ✓!

Let me verify the invariant: max(lo)=2 ≤ min(hi)=3. ✓ (well, 2 ≤ 3). Actually min of effective hi is 3. And max of lo is 2. 2 ≤ 3. ✓.

But wait, the window is [2, 2, 3, 5] (indices a, b, d, e). Sorted: [2, 2, 3, 5]. Median: (2+3)/2=2.5. ✓!

The fix works. The key was tracking which heap each element is in.

Now, there's one more subtlety: when we move an element from lo to hi during rebalance, we update `heap_of[idx]`. But what if that element was already marked as removed? It doesn't matter because:
- If removed[idx] is True, the element will be pruned when it reaches the top.
- The size decrement was already done when we removed it.
- Moving it from one heap to another during rebalance doesn't change the size counters (we decrement from one and increment the other, but wait...)

Actually, in rebalance, when we move from lo to hi:
```
lo_size -= 1  # decrement lo
hi_size += 1  # increment hi
```
But if the moved element is removed, should we still increment hi_size? The element is going into hi but is removed. The hi_size represents the "target" for rebalancing, not the actual effective count. Hmm, but if we increment hi_size for a removed element, then later when we need to move from hi to lo, hi_size will be inflated and we might move a removed element.

Wait, but we also decrement lo_size for the removed element. Let me think...

If we pop a removed element from lo (it's at the top after pruning... no, pruning removes it). Actually, after `prune_lo()`, the top is NOT removed. So we only pop non-removed elements from the top. So the element we move is effective. ✓

But what about deeper in the heap? We only pop from the top, and we prune first. So the popped element is always effective. ✓

Great, the algorithm is correct.

Let me also think about performance. The `heap_of` array adds O(1) per operation. The `removed` array adds O(1) per check. The heaps grow to O(n) in the worst case but operations are O(log n). For n=200,000:
- 200,000 iterations, each with ~4-5 heap operations.
- log(200,000) ≈ 18.
- Total: ~18 million comparisons.
- In Python with heapq (which uses _heapq C accelerator), each comparison is fast but there's Python overhead for tuple creation/comparison.

Actually, I'm worried about performance. Let me think about whether there's a faster approach for n=200,000, k=1,000.

Alternative: use the "order statistics tree" approach. But that's complex and not in stdlib.

Alternative: since k=1000, we could maintain a sorted list of the window and use bisect. Insertion into a sorted list is O(k) due to shifting. Total: O(n*k) = 200M. Too slow.

Alternative: use two heaps but with the "push to lo, pop max, push to hi, check balance" pattern (like the running median problem). This avoids the "which heap" question for removal... but we still need lazy deletion for removal.

I think the two-heap with lazy deletion is the best approach. Let me optimize the Python code:

1. Avoid tuple creation in the hot loop by inlining.
2. Use local variable bindings for heappush, heappop.
3. The heap elements are tuples (-val, idx) and (val, idx). Comparing tuples compares first elements, then second. This is fine.

Actually, for the comparison in the heap: when two elements have the same value, we compare by index. This is deterministic and fine.

Let me also think: is there a way to avoid the heap growing to O(n)? 

If we periodically rebuild the heaps (e.g., every k operations), we could keep them at O(k) size. But rebuilding is O(k log k) and we'd do it n/k times, adding O(n log k) total. That's the same asymptotic cost.

Alternatively, since k is fixed, we could use a different data structure. But with stdlib only, the two-heap approach is the standard one.

For n=200,000 and k=1,000, the heap size will be approximately k + (number of removed elements not yet pruned). In the worst case, this is O(n), but on average it's O(k + k) = O(k) because we prune from the top regularly. Actually, it's O(k) amortized because we add k elements and remove k elements, and pruning removes one for each add/remove.

Hmm, not exactly. Pruning only removes from the TOP. If removed elements are scattered in the heap, they don't get pruned until they bubble up. In the worst case, the heap has O(n) elements. But log(200,000) ≈ 18, which is still fine.

Let me just go with this. The expected runtime should be well under 2 seconds for the given parameters.

Let me write the final clean version with a few more optimizations:

```python
from heapq import heappush, heappop

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    half = (k + 1) >> 1  # target_lo
    
    lo = []   # max-heap of (-val, idx)
    hi = []   # min-heap of (val, idx)
    gone = bytearray(n)  # removed flags
    hof = bytearray(n)   # heap-of: 0=lo, 1=hi
    ls = 0  # lo effective size
    hs = 0  # hi effective size
    
    result = []
    res_append = result.append
    
    for i in range(k):
        v = nums[i]
        if ls == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, i))
            ls += 1
            hof[i] = 0
        else:
            heappush(hi, (v, i))
            hs += 1
            hof[i] = 1
        # rebalance
        while ls > half:
            while lo and gone[lo[0][1]]:
                heappop(lo)
            nv, idx = heappop(lo)
            ls -= 1
            heappush(hi, (-nv, idx))
            hs += 1
            hof[idx] = 1
        while ls < half:
            while hi and gone[hi[0][1]]:
                heappop(hi)
            v2, idx = heappop(hi)
            hs -= 1
            heappush(lo, (-v2, idx))
            ls += 1
            hof[idx] = 0
    
    # first median
    while lo and gone[lo[0][1]]:
        heappop(lo)
    while hi and gone[hi[0][1]]:
        heappop(hi)
    if k & 1:
        res_append(float(-lo[0][0]))
    else:
        res_append((-lo[0][0] + hi[0][0]) * 0.5)
    
    for i in range(1, n - k + 1):
        # remove i-1
        if hof[i - 1] == 0:
            ls -= 1
        else:
            hs -= 1
        gone[i - 1] = 1
        
        # add new
        ni = i + k - 1
        v = nums[ni]
        while lo and gone[lo[0][1]]:
            heappop(lo)
        if ls == 0 or v <= -lo[0][0]:
            heappush(lo, (-v, ni))
            ls += 1
            hof[ni] = 0
        else:
            heappush(hi, (v, ni))
            hs += 1
            hof[ni] = 1
        
        # rebalance
        while ls > half:
            while lo and gone[lo[0][1]]:
                heappop(lo)
            nv, idx = heappop(lo)
            ls -= 1
            heappush(hi, (-nv, idx))
            hs += 1
            hof[idx] = 1
        while ls < half:
            while hi and gone[hi[0][1]]:
                heappop(hi)
            v2, idx = heappop(hi)
            hs -= 1
            heappush(lo, (-v2, idx))
            ls += 1
            hof[idx] = 0
        
        # median
        while lo and gone[lo[0][1]]:
            heappop(lo)
        while hi and gone[hi[0][1]]:
            heappop(hi)
        if k & 1:
            res_append(float(-lo[0][0]))
        else:
            res_append((-lo[0][0] + hi[0][0]) * 0.5)
    
    return result
```

Wait, using `bytearray` for `gone` and `hof` is good for memory and speed. `bytearray(n)` initializes to all zeros. `gone[i] = 1` sets to 1. `if hof[i] == 0` checks membership. `gone[idx]` for truthiness check (0 is falsy, 1 is truthy). Actually for `while lo and gone[lo[0][1]]`, gone returns an int (0 or 1), and 0 is falsy, 1 is truthy. ✓.

One issue: in the initial build loop, the rebalance `while ls < half` could try to pop from an empty hi. Let me add a guard:

```python
while ls < half and hs > 0:
```

Wait, can ls < half and hs == 0 during the initial build? If we're adding elements and all go to lo (because lo is empty or they're smaller), ls could exceed half and we rebalance to hi. But if all elements go to lo and ls < half... that means we haven't added enough elements yet. At step i (0-indexed), we've added i+1 elements. half = (k+1)//2. If i+1 < half, then ls ≤ i+1 < half and hs = 0. The while loop should not execute.

So yes, I need the guard `hs > 0`:

```python
while ls < half and hs > 0:
```

Similarly for the sliding part: after remove, ls + hs = k - 1. After add, ls + hs = k. If ls < half, then hs > half - 1 >= 0. Since ls + hs = k and ls < half = (k+1)//2:
- If k is odd: half = (k+1)/2. ls < (k+1)/2 means ls ≤ k/2. hs = k - ls ≥ k - k/2 = k/2 ≥ (k-1)/2 > 0 (for k ≥ 1). ✓
- If k is even: half = k/2. ls < k/2. hs = k - ls > k/2 - 1 ≥ 0. Actually hs ≥ 2 > 0 for k ≥ 2. ✓

So during the sliding part (after add), if ls < half, hs is always > 0. The guard is only needed during initial build. But it's harmless to have it always.

Actually, during initial build: after adding element i (0-indexed), total elements = i+1. If i+1 < half, ls ≤ i+1 < half, and hs = (i+1) - ls. If all went to lo, hs=0. So yes, we need the guard.

Let me add `hs > 0` to the condition. Actually, I'll just add it to be safe:

```python
while ls < half and hs > 0:
```

Let me also double-check: can the `while ls > half` loop try to pop from an empty lo? If ls > half > 0, there are effective elements in lo. After prune_lo (remove gone from top), the top is effective. ls > 0 means there are effective elements. The top after pruning must be effective. So heappop is safe. ✓

Actually wait, prune_lo only removes from the TOP. After pruning, the top is not gone. But what if lo is empty after pruning? If ls > 0, there's at least one effective element in lo. It must be somewhere in the heap. The top after pruning is not gone. If lo is empty, there are no elements, contradicting ls > 0. So lo is non-empty after pruning when ls > 0. ✓

I'm now confident the code is correct. Let me write the final version.

One more optimization: I can avoid the tuple `(-v, i)` by using a custom class, but that would be slower in Python. Tuple comparison is C-optimized. Let me stick with tuples.

Actually, there's one more thing. When I create `(-v, i)` tuples repeatedly in the hot loop, Python creates new tuple objects. This is unavoidable with the stdlib heapq. An alternative would be to store just the value and use a separate lookup for the index, but that complicates things.

Let me also think about whether `float(x)` conversion is needed. The input is `list[float]`, so elements are already floats. The median computation:
- For odd k: `-lo[0][0]` is already a float (negation of a float). `float()` is redundant but harmless.
- For even k: `(-lo[0][0] + hi[0][0]) * 0.5` is already float arithmetic.

I'll keep `float()` for safety in case ints sneak in.

Let me finalize. I'll also handle the edge case where all elements in nums are the same (the heap should still work fine).

Final check on the rebalance during initial build:
- k=5, half=3.
- Add 10 elements? No, we add k=5 elements.
- Add 1: lo=[(-1,0)], ls=1. half=3. ls<half, hs=0. Skip.
- Add 2: 2>1, push to hi. hs=1. ls=1<half=3. Pop hi(2,1). Push to lo. ls=2, hs=0. ls=2<half=3. hi empty. Skip.
- Add 3: prune_lo: top(-2,1), val=2. 3>2. Push to hi. hs=1. ls=2<half=3. Pop hi(3,2). Push to lo. ls=3, hs=0. ls=3=half. Done.
- Add 4: prune_lo: top(-3,2), val=3. 4>3. Push to hi. hs=1. ls=3=half. Done.
- Add 5: 5>3. Push to hi. hs=2. ls=3=half. Done.

Final: lo=[(-3,2),(-2,1),(-1,0)], ls=3. hi=[(4,3),(5,4)], hs=2.
Window [1,2,3,4,5]. Sorted: [1,2,3,4,5]. Median: 3.
lo top: -(-3)=3. ✓



One more: k=5, nums=[5,4,3,2,1].
- Add 5: lo=[(-5,0)], ls=1. ls<3, hs=0. Skip.
- Add 4: 4<=5. Push to lo. lo=[(-5,0),(-4,1)], ls=2. ls<3, hs=0. Skip.
- Add 3: 3<=5. Push to lo. lo=[(-5,0),(-4,1),(-3,2)], ls=3. ls=3=half. Done.
- Add 2: 2<=5. Push to lo. ls=4. ls>3. Pop lo top: (-5,0). Push (5,0) to hi. ls=3, hs=1. Done.
- Add 1: 1<=4 (lo top after prune: (-4,1)→4). Push to lo. ls=4>3. Pop (-4,1). Push (4,1) to hi. ls=3, hs=2. Done.

lo: [(-3,2),(-2,3),(-1,4)] → values {3,2,1}. Top: (-3,2)→3.
hi: [(4,1),(5,0)] → values {4,5}.
Window [5,4,3,2,1]. Sorted: [1,2,3,4,5]. Median: 3. ✓!



I'm satisfied the algorithm is correct and efficient. Let me write the final version.
