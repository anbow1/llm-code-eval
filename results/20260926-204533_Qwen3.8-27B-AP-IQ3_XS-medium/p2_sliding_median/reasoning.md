Let me think about this problem carefully.

I need to implement a sliding window median function that:
1. Takes a list of floats and window size k
2. Returns the median of every contiguous window of size k
3. For even k, median is the mean of the two middle values
4. Raises ValueError if k < 1 or k > len(nums)
5. Must be efficient: n = 200,000 with k = 1,000 in under 2 seconds

The naive approach would be O(n * k log k) - for each window, sort and find median. With n=200,000 and k=1,000, that's 200,000 * 1,000 * log(1,000) ≈ 200,000 * 10,000 = 2 billion operations. Too slow.

A better approach: Use two heaps (a max-heap for the lower half and a min-heap for the upper half) with lazy deletion.

The classic approach for sliding window median:
- Maintain two heaps: a max-heap (lower half) and a min-heap (upper half)
- Use lazy deletion (mark elements as deleted, clean up when they reach the top)
- For each window:
  - Add the new element
  - Remove the old element (mark for deletion)
  - Rebalance
  - Get the median

Let me think about the two-heap approach with lazy deletion:

- `lo`: max-heap (store negatives for Python's min-heap) - contains the smaller half
- `hi`: min-heap - contains the larger half
- `lazy`: dict counting how many elements have been "deleted" but are still in the heaps

Invariants:
- len(lo) >= len(hi) (lo has either equal or one more element)
- max(lo) <= min(hi)
- lo contains the floor((k+1)/2) smallest elements
- hi contains the rest

For median:
- If k is odd: median = top of lo
- If k is even: median = (top of lo + top of hi) / 2.0

Wait, let me reconsider. For k elements:
- lo should have (k+1)//2 elements (the smaller half, including the median for odd k)
- hi should have k//2 elements (the larger half)

Actually, let me think more carefully:
- For odd k: lo has (k+1)//2 elements, hi has k//2 elements. Median = max(lo).
- For even k: lo has k//2 elements, hi has k//2 elements. Median = (max(lo) + min(hi)) / 2.0.

Wait, actually the standard approach:
- lo is a max-heap with size >= hi size
- lo size - hi size <= 1
- For odd k (k = 2m+1): lo has m+1 elements, hi has m elements. Median = max(lo).
- For even k (k = 2m): lo has m elements, hi has m elements. Median = (max(lo) + min(hi)) / 2.

Hmm, actually let me reconsider. The standard invariant is:
- lo.size() == hi.size() or lo.size() == hi.size() + 1
- All elements in lo <= all elements in hi

For k elements total:
- If k is odd (k = 2m+1): lo has m+1, hi has m. Median = lo's max.
- If k is even (k = 2m): lo has m, hi has m. Median = (lo's max + hi's min) / 2.

Wait, that doesn't quite work. Let me think again.

Actually the common convention:
- lo has either the same number or one more than hi
- Total = lo.size() + hi.size() = k

If k is odd: lo.size() = (k+1)/2, hi.size() = (k-1)/2. Median = lo's top.
If k is even: lo.size() = k/2, hi.size() = k/2. Median = (lo's top + hi's top) / 2.

Yes, that works.

Now for the algorithm:
1. Initialize: add first k elements, build the two heaps.
2. For each subsequent window (slide by 1):
   a. Remove the element that's leaving (the one at index i-k)
   b. Add the new element (at index i)
   c. Rebalance
   d. Compute median

For lazy deletion:
- When removing an element, if it's in lo, decrement lo's "effective size" and add to lazy set.
- When removing from hi, same.
- But we don't know which heap an element is in at the time of removal (it could have moved during rebalancing).

Actually, the standard approach with lazy deletion:
- Maintain a `lazy` dict: value -> count of deletions
- Maintain `lo_size` and `hi_size` as the effective sizes (not the actual heap sizes)
- When adding: push to appropriate heap, increment size
- When removing: we don't know which heap it's in, so we push to both? No...

Actually, a cleaner approach:

When removing an element `x`:
- If x <= current max of lo (after cleanup), it's in lo: decrement lo_size, mark lazy
- Else it's in hi: decrement hi_size, mark lazy
- Then clean tops of both heaps
- Then rebalance

Wait, but what if x == max of lo? It could be in either heap. Let me think...

Actually, the standard approach:
- When removing x:
  - If x <= lo's top (after cleaning): assume it's in lo. lo_size -= 1. lazy[x] += 1.
  - Else: it's in hi. hi_size -= 1. lazy[x] += 1.
- Then clean both heaps (remove tops that are in lazy).
- Then rebalance: ensure lo_size >= hi_size and lo_size - hi_size <= 1.
  - If lo_size < hi_size: move top of hi to lo.
  - If lo_size > hi_size + 1: move top of lo to hi.
  - Also ensure max(lo) <= min(hi): if not, swap tops.

Hmm, this is getting complex. Let me think about whether there's a simpler approach that's still efficient enough.

n = 200,000, k = 1,000. Number of windows = 199,001.

If I use the two-heap approach with lazy deletion, each operation is O(log k) amortized. Total: O(n log k) = 200,000 * log(1,000) ≈ 200,000 * 10 = 2,000,000 operations. That's very fast.

Let me code this up carefully.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)  # or [float(x) for x in nums]
    
    # Two heaps with lazy deletion
    lo = []  # max-heap (store negatives)
    hi = []  # min-heap
    lazy = defaultdict(int)  # count of elements to delete
    lo_size = 0  # effective size of lo
    hi_size = 0  # effective size of hi
    
    def clean(heap):
        """Remove lazy-deleted elements from the top of heap."""
        while heap and lazy[-heap[0]] if heap[0] < 0 else lazy[heap[0]]:
            # Hmm, this is confusing because lo stores negatives
            pass
```

Wait, I need to be more careful. lo stores negatives for the max-heap. So the "value" of an element in lo is -lo[0].

Let me restructure:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap: store -value
    hi = []  # min-heap: store value
    lazy = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def clean_top(heap, negate):
        while heap:
            val = -heap[0] if negate else heap[0]
            if lazy[val] > 0:
                lazy[val] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Ensure lo_size >= hi_size and lo_size - hi_size <= 1
        while lo_size < hi_size:
            # Move top of hi to lo
            heapq.heappush(lo, -heapq.heappop(hi))
            hi_size -= 1
            lo_size += 1
        while lo_size > hi_size + 1:
            # Move top of lo to hi
            heapq.heappush(hi, -heapq.heappop(lo))
            lo_size -= 1
            hi_size += 1
        # Ensure max(lo) <= min(hi)
        if lo and hi and -lo[0] > hi[0]:
            # Swap tops
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)
            # lo_size and hi_size unchanged
    
    def get_median():
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2.0)
    
    # Initialize first window
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
    
    rebalance()
    
    result = [get_median()]
    
    # Slide the window
    for i in range(k, n):
        # Remove nums[i - k]
        leaving = nums[i - k]
        if leaving <= -lo[0]:
            lo_size -= 1
            lazy[leaving] += 1
        else:
            hi_size -= 1
            lazy[leaving] += 1
        clean_top(lo, True)
        clean_top(hi, False)
        
        # Add nums[i]
        entering = nums[i]
        if not lo or entering <= -lo[0]:
            heapq.heappush(lo, -entering)
            lo_size += 1
        else:
            heapq.heappush(hi, entering)
            hi_size += 1
        
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, there's a problem with the `leaving <= -lo[0]` check. After cleaning, lo[0] is the max of lo. But what if lo is empty (after cleaning)? Actually, since we maintain lo_size >= hi_size and lo_size + hi_size = k, and k >= 1, lo should never be empty during the process (after rebalancing).

But wait, during the removal step, before rebalancing, could lo be empty? If k = 1, lo has 1 element and hi has 0. After removing, lo_size = 0, hi_size = 0. Then we add. But k=1 is handled separately.

For k >= 2: before removal, lo_size >= 1 (since lo_size >= hi_size and lo_size + hi_size = k >= 2, so lo_size >= 1). After removing from lo, lo_size could be 0. But then we clean, and lo might be empty. Then when adding, `not lo` handles it.

Actually wait, there's a subtle issue. When I check `leaving <= -lo[0]`, I need lo to be non-empty and the top to be clean. Let me make sure I clean before checking.

Actually, let me reconsider the order:
1. Remove: determine which heap, decrement size, mark lazy
2. Clean both tops
3. Add new element: determine which heap based on current lo top (or push to lo if lo is empty)
4. Rebalance

But after step 2, lo could be empty. In step 3, if lo is empty, push to lo.

Let me also consider: what if after step 1, the `leaving` element is in lo but lo[0] (the top) has been lazy-deleted? Then I should clean first before checking.

Let me reorder:
1. Mark leaving for deletion (but which heap? Need to check first)

Hmm, the problem is: I need to know which heap the leaving element is in before I can decrement the right size. But to know which heap, I need to compare with lo's top. And lo's top might be stale.

So the correct order is:
1. Clean lo's top (to get the true max)
2. If leaving <= -lo[0] (true max of lo): it's in lo. lo_size -= 1. lazy[leaving] += 1.
   Else: it's in hi. hi_size -= 1. lazy[leaving] += 1.
3. Clean hi's top
4. Add entering to appropriate heap
5. Rebalance
6. Compute median

Wait, but after cleaning lo in step 1, lo could be empty. Then all remaining elements are in hi. So leaving must be in hi. Let me handle that:

1. Clean lo's top
2. If lo is not empty and leaving <= -lo[0]: it's in lo.
   Else: it's in hi.
3. Clean hi's top (if we put it in hi)
   Actually, clean both to be safe.
4. Add entering
5. Rebalance
6. Median

Hmm, but there's another issue. After cleaning, the top of lo is the true max. But the leaving element might have a value that's equal to lo's max but is actually in hi (if there are duplicates). In that case, `leaving <= -lo[0]` would be true, and we'd incorrectly mark it as being in lo.

This is a known issue with the lazy deletion approach. The standard solution is: when we're unsure, we push to both heaps and decrement both sizes? No, that's wrong.

Actually, the standard approach handles this correctly because:
- If leaving <= max(lo), we assume it's in lo. If it's actually in hi (due to duplicates), then we've decremented lo_size when we should have decremented hi_size. But then during rebalancing, the sizes will be off by 1, and the rebalancing will fix it.

Wait, is that actually correct? Let me think of an example.

Suppose lo = [3, 2, 1] (max-heap, so max is 3), hi = [3, 4]. lo_size = 3, hi_size = 2. k = 5.

If leaving = 3, and we check 3 <= -lo[0] = 3, true. So we say it's in lo. lo_size = 2, lazy[3] = 1.

But what if the 3 we're removing is actually in hi? Then lo still has 3 elements effectively (one of which is 3), and hi has 1 element effectively. But we've marked lo_size = 2 and hi_size = 2.

Then we clean lo: top is 3, lazy[3] = 1, so we pop it. Now lo = [2, 1], lo_size should be... well, we decremented it to 2, and the heap has 2 elements. OK.

But hi still has [3, 4] and hi_size = 2. The 3 in hi is NOT lazy-marked. So hi's effective size is 2, which is correct (we didn't remove from hi).

But wait, we removed one 3 total. The 3 in hi is still there. So total elements in heaps: lo has 2, hi has 2 (including the 3). Effective: lo_size = 2, hi_size = 2. Total = 4. But we should have k-1 = 4 elements after removal. OK that checks out.

But the issue is: the 3 that was in hi is still there, and it's correct to keep it. We removed one 3 (the one in lo). So this works out!

Actually wait, I think the issue is more subtle. Let me think again.

If lo = {1, 2, 3} and hi = {3, 4}, and we remove a 3:
- Case 1: The 3 in lo is removed. lo = {1, 2}, hi = {3, 4}. lo_size=2, hi_size=2. Correct.
- Case 2: The 3 in hi is removed. lo = {1, 2, 3}, hi = {4}. lo_size=3, hi_size=1.

In both cases, after removal, the multiset of remaining elements is {1, 2, 3, 4}. The median of the remaining (before adding new element) is the same regardless of which 3 was removed.

But in our algorithm, we always assume it's in lo if leaving <= max(lo). In case 2, we'd say lo_size=2, hi_size=2. But the true state should be lo_size=3, hi_size=1.

After rebalancing: lo_size=2, hi_size=2 is already balanced (difference is 0). But the true balanced state for 4 elements would be lo_size=2, hi_size=2. So it's actually correct!

Wait, I think the key insight is: it doesn't matter which copy of the duplicate we remove, as long as the multiset of remaining elements is correct. And since we're just decrementing one size and marking lazy, the multiset is correct either way (we remove one 3 from the total pool).

The potential issue is with the ordering invariant: max(lo) <= min(hi). If we incorrectly attributed the removal to lo, could this violate the invariant?

After removal and before rebalancing:
- lo has some elements (one of which might be lazy-marked at the top)
- hi has some elements
- We clean tops
- We add new element
- We rebalance (including the swap step)

The rebalance step ensures max(lo) <= min(hi) by swapping if needed. So even if the attribution was "wrong", the rebalance fixes the ordering.

And the sizes: we maintain lo_size + hi_size = k throughout. After removal: k-1. After add: k. The rebalancing ensures lo_size and hi_size are balanced.

I think this approach is correct. The key insight is that for duplicates, it doesn't matter which copy we "remove" - the multiset is the same, and the rebalancing ensures the structural invariants.

Let me also think about the `clean_top` function more carefully.

For lo (max-heap, stored as negatives):
- The top value is -lo[0]
- If lazy[-lo[0]] > 0, pop it, decrement lazy

For hi (min-heap, stored as positives):
- The top value is hi[0]
- If lazy[hi[0]] > 0, pop it, decrement lazy

Let me code this:

```python
def clean_lo():
    while lo:
        val = -lo[0]
        if lazy.get(val, 0) > 0:
            lazy[val] -= 1
            heapq.heappop(lo)
        else:
            break

def clean_hi():
    while hi:
        val = hi[0]
        if lazy.get(val, 0) > 0:
            lazy[val] -= 1
            heapq.heappop(hi)
        else:
            break
```

Now, for the rebalancing, I need to be careful. When moving elements between heaps, I should NOT move lazy-deleted elements. But since I clean the tops before rebalancing, the tops should be clean.

Wait, actually I should clean before rebalancing to make sure the tops are valid. Let me structure the main loop:

For each window slide:
1. Clean lo top
2. Determine which heap to remove from:
   - If lo is non-empty and leaving <= -lo[0]: remove from lo
   - Else: remove from hi
3. Mark lazy, decrement size
4. Clean both tops
5. Add entering:
   - If lo is empty or entering <= -lo[0]: push to lo, lo_size += 1
   - Else: push to hi, hi_size += 1
6. Rebalance
7. Compute median

Actually, I realize there might be an issue with step 2. After cleaning lo in step 1, lo's top is the true max of lo. But what if leaving is greater than lo's max? Then it must be in hi. But what if leaving equals lo's max and is actually in hi (duplicate)? As discussed above, it doesn't matter.

But what if leaving is less than lo's max? It must be in lo (since all elements in lo are <= all elements in hi, and leaving < max(lo) means leaving is in the lower half).

What if leaving equals lo's max? It could be in either. We attribute it to lo. Fine.

What if leaving is greater than lo's max? It must be in hi.

OK, I think the logic is correct.

Let me also handle the edge case where k = 1 (return all elements as floats) and k = n (just one median).

Actually, k = 1 is a special case where the median is just the element itself. I can handle it generally too, but it's simpler to special-case it.

Let me also think about whether I need to handle the initial window differently. For the first window, I just add k elements and rebalance. No removal.

Let me write the final code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    lazy = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def clean_lo():
        while lo:
            val = -lo[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(lo)
            else:
                break
    
    def clean_hi():
        while hi:
            val = hi[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(hi)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Balance sizes: lo_size >= hi_size, lo_size - hi_size <= 1
        if lo_size < hi_size:
            heapq.heappush(lo, -heapq.heappop(hi))
            hi_size -= 1
            lo_size += 1
        elif lo_size > hi_size + 1:
            heapq.heappush(hi, -heapq.heappop(lo))
            lo_size -= 1
            hi_size += 1
        # Fix ordering: max(lo) <= min(hi)
        if lo and hi and -lo[0] > hi[0]:
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)
    
    def add(x):
        nonlocal lo_size, hi_size
        if not lo or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
    
    # Build initial window
    for i in range(k):
        add(nums[i])
    rebalance()
    
    result = []
    # First median
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append(float((-lo[0] + hi[0]) / 2.0))
    
    # Slide
    for i in range(k, n):
        leaving = nums[i - k]
        
        # Clean lo top to get true max
        clean_lo()
        
        # Determine which heap to remove from
        if lo and leaving <= -lo[0]:
            lo_size -= 1
            lazy[leaving] += 1
        else:
            hi_size -= 1
            lazy[leaving] += 1
        
        # Clean both
        clean_lo()
        clean_hi()
        
        # Add new element
        add(nums[i])
        
        # Rebalance
        rebalance()
        
        # Compute median
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append(float((-lo[0] + hi[0]) / 2.0))
    
    return result
```

Wait, I need to double-check the rebalancing. After the initial build, I call rebalance(). But during the build, I'm using `add()` which uses `lo[0]` to decide where to put things. If lo is empty at the start, the first element goes to lo. Then subsequent elements go to lo if <= lo's max, else to hi. This builds the heaps in a somewhat arbitrary way. The rebalance at the end fixes sizes and ordering.

But wait, during the initial build, the invariants aren't maintained (lo might be much bigger than hi, or max(lo) > min(hi)). That's fine because we only call rebalance() after the build is complete.

Actually, there's a subtlety: during the initial build, when I check `x <= -lo[0]`, lo's top might not be the true max if we haven't rebalanced yet. But that's OK - we're just using it as a heuristic to distribute elements. The final rebalance will fix everything.

Hmm, actually is that true? Let me think... If I push elements based on a potentially-wrong comparison, the final state after rebalancing might not be correct.

Example: lo = [-5, -3] (max-heap, so values are 5, 3, max is 5). hi = [4]. Now I want to add 6.
- Check: 6 <= -lo[0] = 5? No. So push to hi. hi = [4, 6].
- lo_size = 2, hi_size = 2. Balanced.
- Check ordering: -lo[0] = 5, hi[0] = 4. 5 > 4! Swap.
- After swap: lo = [-4, -3], hi = [5, 6]. lo_size = 2, hi_size = 2.
- Now max(lo) = 4, min(hi) = 5. Correct!

OK so the rebalance handles it.

But what about a trickier case? lo = [-10, -1] (values 10, 1, max 10). hi = [2, 3]. Now add 5.
- Check: 5 <= 10? Yes. Push to lo. lo = [-10, -1, -5] (heap of -10, -5, -1). lo_size = 3.
- Rebalance: lo_size = 3, hi_size = 2. 3 > 2+1? No. 3 > 2? Yes but 3 - 2 = 1 which is <= 1. OK balanced.
- Check ordering: -lo[0] = 10, hi[0] = 2. 10 > 2! Swap.
- After swap: lo = [-2, -5, -1] (values 2, 5, 1, max 5), hi = [3, 10]. Wait, let me redo.
  - lo was [-10, -1, -5] (heap structure: -10 at top, then -5 and -1)
  - Pop from lo: -10, value 10.
  - Pop from hi: 2.
  - Push -2 to lo: lo = [-5, -1, -2] → heapified: [-5, -2, -1]. Max is 5.
  - Push 10 to hi: hi = [3, 10]. Min is 3.
  - Check: max(lo) = 5, min(hi) = 3. 5 > 3! Need another swap?

Hmm, this is a problem. The single swap might not be enough.

Wait, I think the issue is that my initial distribution was bad. Let me reconsider.

Actually, I think the issue is that the initial build doesn't maintain the invariant that max(lo) <= min(hi). During the build, I'm just using lo[0] as a reference, but lo[0] might not be the true max of the "lower half" because the invariant isn't maintained.

A better approach for the initial build: sort the first k elements and split them.

```python
first_window = sorted(nums[:k])
mid = k // 2
# lo gets the first (k+1)//2 elements (the smaller ones)
# hi gets the rest
for val in first_window[:mid]:
    heapq.heappush(lo, -val)
for val in first_window[mid:]:
    heapq.heappush(hi, val)
lo_size = len(lo)
hi_size = len(hi)
```

Wait, for odd k: lo gets (k+1)//2 elements, hi gets (k-1)//2.
For even k: lo gets k//2 elements, hi gets k//2.

Let me use: lo gets first (k+1)//2 elements, hi gets the rest.
- k odd (k=2m+1): (k+1)//2 = m+1. lo gets m+1, hi gets m. ✓
- k even (k=2m): (k+1)//2 = m. lo gets m, hi gets m. ✓

Yes, that works.

```python
lo_size = (k + 1) // 2
hi_size = k // 2
first_window = sorted(nums[:k])
for val in first_window[:lo_size]:
    heapq.heappush(lo, -val)
for val in first_window[lo_size:]:
    heapq.heappush(hi, val)
```

This ensures max(lo) <= min(hi) because we sorted and split.

This is O(k log k) for the initial build, which is fine.

Now for the sliding part, the invariants are maintained, so the `add` and `rebalance` logic should work correctly.

Actually wait, let me reconsider the `add` function. After the initial build, the invariants hold: max(lo) <= min(hi), and sizes are balanced. When I add a new element:
- If x <= max(lo): push to lo. Now lo might be too big.
- If x > max(lo): push to hi. Now hi might be too big.

After adding, I rebalance. The rebalance handles:
1. Size balance (move from bigger to smaller if diff > 1)
2. Ordering (swap if max(lo) > min(hi))

I think one swap is sufficient for the ordering fix, because:
- Before swap: max(lo) > min(hi). Let a = max(lo), b = min(hi).
- After swap: lo's new max is at most the old lo's second max (or b if b < old second max). hi's new min is at most the old hi's second min (or a if a > old second min).

Hmm, actually I'm not sure one swap is always sufficient. Let me think...

After adding one element and doing one size-balancing move, the heaps differ by at most one element from the balanced state. The ordering violation, if any, is at the boundary (between max(lo) and min(hi)). One swap of the two boundary elements should fix it.

Let me verify: suppose max(lo) = a and min(hi) = b with a > b. After swapping: lo gets b, hi gets a. New max(lo) <= max(old lo without a) <= a. New min(hi) <= min(old hi without b) >= b. But we need new max(lo) <= new min(hi).

Old lo (without a): all elements <= a. New max(lo) = max(old lo without a, b). Since b < a, and all old lo elements <= a... hmm, this doesn't immediately guarantee new max(lo) <= new min(hi).

Example: lo = {1, 2, 100}, hi = {50, 60}. max(lo) = 100, min(hi) = 50. Swap: lo = {1, 2, 50}, hi = {60, 100}. max(lo) = 50, min(hi) = 60. 50 <= 60. ✓

Another: lo = {1, 50, 100}, hi = {51, 52}. max(lo) = 100, min(hi) = 51. Swap: lo = {1, 50, 51}, hi = {52, 100}. max(lo) = 51, min(hi) = 52. ✓

I think it works because: all elements in lo are <= all elements in hi (invariant from before the add). After adding one element, at most one element is "out of place". The swap fixes it.

Actually, the invariant max(lo) <= min(hi) is maintained from the start. When we add x:
- If x <= max(lo): x goes to lo. Now all elements in lo are still <= all elements in hi (since x <= max(lo) <= min(hi)). Ordering is fine. But size might be off.
- If x > max(lo): x goes to hi. Now all elements in hi are >= x > max(lo) >= all elements in lo. Ordering is fine. But size might be off.

After size balancing (one move):
- If we moved from lo to hi: the moved element was max(lo). After moving, new max(lo) <= old max(lo) <= min(hi) <= new min(hi) (since we added to hi, new min(hi) <= old min(hi)). Wait, that's not right. New min(hi) could be the moved element or the old min(hi).

Hmm, let me think more carefully.

Case: lo was bigger, so we move max(lo) to hi.
- Moved element: a = max(lo).
- New lo: all elements <= a (they were all <= a before).
- New hi: all elements >= min(hi_old) and >= a (since we added a).
- New max(lo) <= a. New min(hi) = min(a, min(hi_old)).
- Since a = old max(lo) <= old min(hi) = min(hi_old) (invariant held before add).
- So a <= min(hi_old). Thus new min(hi) = min(a, min(hi_old)) = a.
- New max(lo) <= a = new min(hi). ✓

Case: hi was bigger, so we move min(hi) to lo.
- Moved element: b = min(hi).
- New lo: all elements >= min(lo_old) and >= b (since we added b).
- New hi: all elements >= b (they were all >= b before).
- New max(lo) = max(max(lo_old), b).
- New min(hi) = min(hi without b). All remaining elements in hi >= b.
- We need max(max(lo_old), b) <= new min(hi).
- max(lo_old) <= min(hi_old) (invariant). And new min(hi) >= b (all remaining hi elements >= b).
- So max(lo_old) <= min(hi_old) and b <= min(hi_old). But new min(hi) could be min(hi_old) (if b < min(hi_old)) or something else.
- Actually, new min(hi) is the min of the remaining elements in hi. Since all remaining elements in hi >= b (because b was the min), new min(hi) >= b.
- And max(lo_old) <= min(hi_old). Is max(lo_old) <= new min(hi)?
- new min(hi) is either min(hi_old) (if b < min(hi_old), which can't happen since b was the min) or the second min of hi_old.
- Wait, b = min(hi_old). So new min(hi) = second min of hi_old (or +inf if hi was size 1).
- We need max(max(lo_old), b) <= second_min(hi_old).
- max(lo_old) <= min(hi_old) = b. So max(max(lo_old), b) = b.
- Is b <= second_min(hi_old)? Since b was the min of hi, and the second min is >= b. Yes! ✓

Great, so one swap is always sufficient after a single add. And in the sliding window, we do one removal (which just decrements a size and marks lazy) and one add. The removal doesn't violate the ordering (it just makes a heap smaller). So the invariant is maintained.

Wait, but the removal is lazy. The element is still in the heap. After cleaning, it's removed from the top (if it was at the top). But if it wasn't at the top, it's still in the heap, just marked as deleted. The effective size accounts for it.

The key is: after cleaning and before adding, the effective heaps (ignoring lazy elements) satisfy the invariants. Then adding and rebalancing maintains them.

I'm now fairly confident the algorithm is correct. Let me also think about performance.

n = 200,000, k = 1,000.
- Initial sort: O(k log k) = 1000 * 10 = 10,000.
- Each slide: O(log k) for heap operations + O(1) amortized for cleaning.
- Total slides: n - k = 199,000.
- Total: ~200,000 * log(1000) ≈ 2,000,000 operations. Very fast.

The main concern is Python overhead. 200,000 iterations with a few heap operations each should be well under 2 seconds.

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    lazy = defaultdict(int)
    
    lo_size = (k + 1) // 2
    hi_size = k // 2
    
    # Initial window: sort and split
    first = sorted(nums[:k])
    for val in first[:lo_size]:
        heapq.heappush(lo, -val)
    for val in first[lo_size:]:
        heapq.heappush(hi, val)
    
    def clean_lo():
        while lo:
            val = -lo[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(lo)
            else:
                break
    
    def clean_hi():
        while hi:
            val = hi[0]
            if lazy[val]:
                lazy[val] -= 1
                heapq.heappop(hi)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        if lo_size < hi_size:
            heapq.heappush(lo, -heapq.heappop(hi))
            hi_size -= 1
            lo_size += 1
        elif lo_size > hi_size + 1:
            heapq.heappush(hi, -heapq.heappop(lo))
            lo_size -= 1
            hi_size += 1
        if lo and hi and -lo[0] > hi[0]:
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)
    
    def median():
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2.0)
    
    result = [median()]
    
    for i in range(k, n):
        leaving = nums[i - k]
        
        clean_lo()
        
        if lo and leaving <= -lo[0]:
            lo_size -= 1
            lazy[leaving] += 1
        else:
            hi_size -= 1
            lazy[leaving] += 1
        
        clean_lo()
        clean_hi()
        
        entering = nums[i]
        if not lo or entering <= -lo[0]:
            heapq.heappush(lo, -entering)
            lo_size += 1
        else:
            heapq.heappush(hi, entering)
            hi_size += 1
        
        rebalance()
        result.append(median())
    
    return result
```

Wait, I have `lo_size` and `hi_size` as local variables in the function, but I'm modifying them in nested functions with `nonlocal`. Let me make sure that works. In Python 3, `nonlocal` works in nested functions.

Actually, I realize there might be an issue. In the main loop, I modify `lo_size` and `hi_size` directly (not through a nested function). And in `rebalance()`, I use `nonlocal`. Let me restructure to avoid confusion.

Actually, in Python, the main function body can access and modify local variables. The `nonlocal` is only needed in nested functions to modify variables from the enclosing scope. Since `rebalance` is a nested function that modifies `lo_size` and `hi_size`, it needs `nonlocal`. The main loop directly modifies them, which is fine since they're local to `sliding_median`.

Let me trace through a small example to verify:
- nums = [1, 3, -1, -3, 5, 3], k = 3
- Windows: [1,3,-1], [3,-1,-3], [-1,-3,5], [-3,5,3]
- Medians: 1, -1, 1, 3

Initial: first = sorted([1, 3, -1]) = [-1, 1, 3]. lo_size = 2, hi_size = 1.
- lo: push -(-1)=1, push -(1)=-1. lo = [-1, 1] (heap: -1 at top, value 1... wait)

Hmm wait. lo is a max-heap via negation. So I push -val.
- val = -1: push -(-1) = 1.
- val = 1: push -(1) = -1.
lo = [1, -1]. As a heap, the top is min: -1. So -lo[0] = 1. Max of lo is 1. ✓ (lo contains -1 and 1, max is 1)
- hi: push 3. hi = [3]. Min is 3. ✓

Median: k=3 is odd. -lo[0] = -(-1) = 1. ✓ (median of [-1, 1, 3] is 1)

Slide to window [3, -1, -3]:
- leaving = nums[0] = 1.
- clean_lo(): lo = [-1, 1]. Top is -1, val = -(-1) = 1. lazy[1] = 0. Stop.
- lo is non-empty, leaving=1 <= -lo[0] = 1. Yes. lo_size = 1. lazy[1] = 1.
- clean_lo(): Top is -1, val = 1. lazy[1] = 1. Pop. lo = [1]. Top is 1, val = -1. lazy[-1] = 0. Stop.
- clean_hi(): hi = [3]. Top is 3. lazy[3] = 0. Stop.
- entering = nums[3] = -3.
- lo is non-empty, entering=-3 <= -lo[0] = -1. Yes. Push -(-3) = 3 to lo. lo = [1, 3]. lo_size = 2.
- rebalance: lo_size=2, hi_size=1. 2 > 1+1? No. 2 < 1? No. Check ordering: -lo[0] = -1, hi[0] = 3. -1 <= 3. ✓
- median: k odd. -lo[0] = -1. ✓ (median of [3, -1, -3] is -1)

Slide to window [-1, -3, 5]:
- leaving = nums[1] = 3.
- clean_lo(): lo = [1, 3]. Top is 1, val = -1. lazy[-1] = 0. Stop.
- lo non-empty, leaving=3 <= -lo[0] = -1? No. So hi_size = 0. lazy[3] = 1.
- clean_lo(): no change.
- clean_hi(): hi = [3]. Top is 3. lazy[3] = 1. Pop. hi = []. 
- entering = nums[4] = 5.
- lo non-empty, entering=5 <= -lo[0] = -1? No. Push to hi. hi = [5]. hi_size = 1.
- rebalance: lo_size=2, hi_size=1. Balanced. Ordering: -lo[0]=-1, hi[0]=5. -1 <= 5. ✓
- median: -lo[0] = -1. But expected median is 1!

Wait, that's wrong! The window is [-1, -3, 5]. Sorted: [-3, -1, 5]. Median is -1. Oh wait, I said the expected median is 1 earlier. Let me recheck.

Actually: sorted [-3, -1, 5], median is -1. So -lo[0] = -1 is correct! I made an arithmetic error earlier. Let me recheck my expected values.

Windows for nums = [1, 3, -1, -3, 5, 3], k = 3:
- [1, 3, -1] → sorted [-1, 1, 3] → median 1
- [3, -1, -3] → sorted [-3, -1, 3] → median -1
- [-1, -3, 5] → sorted [-3, -1, 5] → median -1
- [-3, 5, 3] → sorted [-3, 3, 5] → median 3

So expected: [1, -1, -1, 3].

Let me continue:

Slide to window [-3, 5, 3]:
- leaving = nums[2] = -1.
- clean_lo(): lo = [1, 3]. Top is 1, val = -1. lazy[-1] = 0. Stop.
- lo non-empty, leaving=-1 <= -lo[0] = -1? Yes. lo_size = 1. lazy[-1] = 1.
- clean_lo(): Top is 1, val = -1. lazy[-1] = 1. Pop. lo = [3]. Top is 3, val = -3. lazy[-3] = 0. Stop.
- clean_hi(): hi = [5]. Top is 5. lazy[5] = 0. Stop.
- entering = nums[5] = 3.
- lo non-empty, entering=3 <= -lo[0] = -3? No. Push to hi. hi = [3, 5]. hi_size = 2.
- rebalance: lo_size=1, hi_size=2. 1 < 2. Move from hi to lo: pop 3 from hi, push -3 to lo. lo = [-3, 3]... wait.

lo currently is [3] (from the heap perspective, 3 is stored, which represents value -3).
Pop from hi: 3. Push -3 to lo: lo = [3, -3]. As a heap, top is -3 (min). So -lo[0] = 3. lo_size = 2, hi_size = 1.

Check ordering: -lo[0] = 3, hi[0] = 5. 3 <= 5. ✓

median: k odd. -lo[0] = 3. ✓ (median of [-3, 5, 3] is 3)

Great, the algorithm works!

Let me also verify an even-k case:
nums = [1, 2, 3, 4], k = 2
Windows: [1,2], [2,3], [3,4]
Medians: 1.5, 2.5, 3.5

Initial: first = sorted([1, 2]) = [1, 2]. lo_size = 1, hi_size = 1.
- lo: push -1. lo = [-1].
- hi: push 2. hi = [2].
- median: (-(-1) + 2) / 2 = (1+2)/2 = 1.5. ✓

Slide to [2, 3]:
- leaving = nums[0] = 1.
- clean_lo(): lo=[-1]. Top -1, val=1. lazy[1]=0. Stop.
- lo non-empty, leaving=1 <= -lo[0]=1. Yes. lo_size=0. lazy[1]=1.
- clean_lo(): Top -1, val=1. lazy[1]=1. Pop. lo=[].
- clean_hi(): hi=[2]. Top 2. lazy[2]=0. Stop.
- entering=nums[2]=3.
- lo is empty. Push -3 to lo. lo=[-3]. lo_size=1.
- rebalance: lo_size=1, hi_size=1. Balanced. Ordering: -lo[0]=3, hi[0]=2. 3 > 2! Swap.
  - a = -(-3) = 3. b = 2.
  - Push -2 to lo: lo = [-2].
  - Push 3 to hi: hi = [3].
  - lo_size=1, hi_size=1.
- median: (-(-2) + 3) / 2 = (2+3)/2 = 2.5. ✓

Slide to [3, 4]:
- leaving = nums[1] = 2.
- clean_lo(): lo=[-2]. Top -2, val=2. lazy[2]=0. Stop.
- lo non-empty, leaving=2 <= -lo[0]=2. Yes. lo_size=0. lazy[2]=1.
- clean_lo(): Top -2, val=2. lazy[2]=1. Pop. lo=[].
- clean_hi(): hi=[3]. Top 3. lazy[3]=0. Stop.
- entering=nums[3]=4.
- lo is empty. Push -4 to lo. lo=[-4]. lo_size=1.
- rebalance: lo_size=1, hi_size=1. Balanced. Ordering: -lo[0]=4, hi[0]=3. 4 > 3! Swap.
  - a=4, b=3. Push -3 to lo, push 4 to hi.
  - lo=[-3], hi=[4].
- median: (3+4)/2 = 3.5. ✓

The algorithm works correctly for both odd and even k.

One more thing to consider: the `nonlocal` declaration. In Python, I need to declare `nonlocal lo_size, hi_size` in the `rebalance` function. The other nested functions (`clean_lo`, `clean_hi`, `median`) don't modify these variables, so they don't need `nonlocal`.

Wait, actually in the main loop, I'm modifying `lo_size` and `hi_size` directly. Since they're local to `sliding_median`, this is fine. The `rebalance` function is nested and modifies them, so it needs `nonlocal`.

Let me also make sure the `add` logic in the main loop doesn't conflict with the initial build. In the main loop, I handle adding directly (not through a separate function) to avoid the `nonlocal` issue.

I think the code is ready. Let me write the final version.

One more performance consideration: using `defaultdict(int)` vs regular dict. `defaultdict` is slightly faster for the pattern we're using. I'll use it.

Also, for the `float()` conversions: since the inputs are already `float`, the median computation already produces floats. The `float()` calls are just to ensure the type is correct (e.g., if input is int, -lo[0] would be int, and we need float). But the signature says `list[float]`, so I'll include the float() conversions.

Actually, if nums contains ints, -lo[0] would be int. Division `/2.0` would give float. But for odd k, -lo[0] could be int. So I'll wrap in float().

Let me finalize.
