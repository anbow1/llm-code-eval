I need to implement a sliding window median algorithm that's efficient for n=200,000 and k=1,000.

The naive approach would be O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 2 billion operations - too slow.

The efficient approach uses two heaps (a max-heap for the lower half and a min-heap for the upper half) with lazy deletion. This gives O(n*log(k)) time complexity.

Let me think about the two-heap approach with lazy deletion:

1. Maintain a max-heap `lo` (for the lower half) and a min-heap `hi` (for the upper half).
2. `lo` contains the smaller elements, `hi` contains the larger elements.
3. For odd k: median is the top of `lo` (the max of the lower half).
4. For even k: median is (top of `lo` + top of `hi`) / 2.

The tricky part is handling the sliding window - when we remove an element, we need to "lazily" mark it for deletion and clean up when it reaches the top of a heap.

Let me think about the structure:
- `lo`: max-heap (store negatives), size = (k+1)//2
- `hi`: min-heap, size = k//2

For k=1000: lo has 500 elements, hi has 500 elements.
For k=999: lo has 500 elements, hi has 499 elements.

Algorithm:
1. Initialize the first window of size k.
2. For each subsequent window:
   a. Remove the element leaving the window.
   b. Add the new element entering the window.
   c. Rebalance the heaps.
   d. Compute the median.

For lazy deletion, I'll use a dictionary `to_remove` that tracks elements to be removed. When I pop from a heap, I check if the element is in `to_remove`.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # lo: max-heap (negated), hi: min-heap
    lo = []  # max-heap (store -x)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    
    def clean(heap):
        while heap and to_remove[-heap[0]] if isinstance(heap[0], float) else to_remove[heap[0]]:
            # This won't work cleanly with negation...
            pass
    
    # Actually, let me rethink. With max-heap using negation, the top is -lo[0].
    # When checking if the top should be removed, I check to_remove[-lo[0]] for lo,
    # and to_remove[hi[0]] for hi.
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    def add(x):
        if not lo or x <= -lo[0]:
            heapq.heappush(lo, -x)
        else:
            heapq.heappush(hi, x)
        rebalance()
    
    def remove(x):
        to_remove[x] += 1
        if x <= -lo[0]:
            heapq.heappop(lo)
        else:
            heapq.heappop(hi)
        rebalance()
    
    def rebalance():
        # Target sizes: lo should have (k+1)//2, hi should have k//2
        target_lo = (k + 1) // 2
        target_hi = k // 2
        
        # We might have stale elements, so we need to be careful
        # Actually, with lazy deletion, the actual sizes might be off.
        # Let me think differently...
    
    # Hmm, the lazy deletion approach is tricky because the heap sizes aren't accurate.
    # Let me use a different approach.
```

Actually, let me reconsider. The lazy deletion approach with two heaps:

The key insight is that we don't track exact sizes - instead, we track "logical" sizes. When we add an element, we increment the logical size of the heap it goes into. When we remove, we decrement. The physical heap might have extra elements (marked for removal), but the logical size tells us the true size.

Let me restructure:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated values)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_size = 0  # logical size of lo
    hi_size = 0  # logical size of hi
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def rebalance():
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2
        target_hi = k // 2
        
        while lo_size > target_lo:
            # Move top of lo to hi
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        while hi_size > target_hi:
            # Move top of hi to lo
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        while lo_size < target_lo:
            # Move top of hi to lo
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        while hi_size < target_hi:
            # Move top of lo to hi
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
    
    def add(x):
        nonlocal lo_size, hi_size
        if lo_size < (k + 1) // 2 and (not lo or x <= -lo[0]):
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        to_remove[x] += 1
        if x <= -lo[0]:
            lo_size -= 1
            heapq.heappop(lo)
        else:
            hi_size -= 1
            heapq.heappop(hi)
        rebalance()
    
    # Initialize first window
    for i in range(k):
        add(nums[i])
    
    result = []
    result.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, there's an issue with `remove`. When I check `x <= -lo[0]`, the top of `lo` might be a stale element. I need to clean first.

Let me fix:

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] += 1
    clean_lo()
    if x <= -lo[0]:
        lo_size -= 1
        heapq.heappop(lo)
    else:
        hi_size -= 1
        heapq.heappop(hi)
    rebalance()
```

Actually wait - after `clean_lo()`, the top of `lo` is valid. But `x` might be in `hi` even if `x <= -lo[0]` is false... no, if `x <= -lo[0]` (the max of lo), then x should be in lo. If `x > -lo[0]`, then x should be in hi. This logic is correct as long as the heaps are properly maintained.

But there's a subtlety: what if `x` equals `-lo[0]`? Then it could be in either heap. But since we're doing lazy deletion, it doesn't matter which heap we mark it in - we just mark it in `to_remove` and pop from one of the heaps. The key is that we pop from the correct heap to keep the logical sizes consistent.

Actually, the issue is: if `x == -lo[0]`, it could be the top of `lo` OR it could be somewhere in `hi`. We need to be careful.

Standard approach: if `x <= -lo[0]`, assume it's in `lo`. Otherwise, assume it's in `hi`. This works because if `x == -lo[0]`, it's definitely in `lo` (since `lo` contains the smaller half and its max is `-lo[0]`).

Wait, that's not quite right either. If we have lo = {1, 2, 3} (max-heap, so top is 3) and hi = {3, 4, 5}, then x=3 could be in either. But by our invariant, lo contains the smaller half, so if x=3 and -lo[0]=3, we say it's in lo. That's fine because we're just tracking sizes.

Actually, I think the standard approach works. Let me also handle the edge case where `lo` might be empty during `remove` (shouldn't happen if k >= 1 and we've initialized properly).

Let me also think about the `add` function. The condition `lo_size < (k + 1) // 2 and (not lo or x <= -lo[0])` - during initialization, lo_size starts at 0, so this will be true for the first few elements. But after rebalancing, lo_size should be at target. Let me simplify:

```python
def add(x):
    nonlocal lo_size, hi_size
    if not lo or x <= -lo[0]:
        heapq.heappush(lo, -x)
        lo_size += 1
    else:
        heapq.heappush(hi, x)
        hi_size += 1
    rebalance()
```

This is simpler and correct. If x is less than or equal to the current max of lo, it goes into lo. Otherwise, it goes into hi. Then rebalance fixes any size imbalances.

Let me also consider: during the initialization phase, we add k elements one by one. Each add triggers a rebalance. The target sizes are (k+1)//2 and k//2. This should work fine.

Let me trace through a small example:
- nums = [1, 3, 2], k = 2
- target_lo = 1, target_hi = 1

Add 1: lo = [-1], lo_size=1, hi=[], hi_size=0. Rebalance: lo_size=1=target_lo, hi_size=0<target_hi=1. Move top of lo to hi: pop -1, push 1 to hi. lo=[], lo_size=0, hi=[1], hi_size=1. Now lo_size=0<target_lo=1. Move top of hi to lo: pop 1, push -1 to lo. lo=[-1], lo_size=1, hi=[], hi_size=0. Hmm, this oscillates!

The problem is that with target_lo=1 and target_hi=1, after moving from lo to hi, lo is empty and we immediately move back. I need to be more careful with the rebalance logic.

Let me fix the rebalance to avoid oscillation:

```python
def rebalance():
    nonlocal lo_size, hi_size
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    # First, make sure lo doesn't have too many
    while lo_size > target_lo:
        clean_lo()
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    
    # Then, make sure hi doesn't have too many
    while hi_size > target_hi:
        clean_hi()
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    
    # Then, make sure lo has enough
    while lo_size < target_lo:
        clean_hi()
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    
    # Then, make sure hi has enough
    while hi_size < target_hi:
        clean_lo()
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
```

Let me re-trace:
- Add 1: lo=[-1], lo_size=1, hi=[], hi_size=0. 
  - lo_size=1, target_lo=1: OK
  - hi_size=0, target_hi=1: not > 1, OK
  - lo_size=1, target_lo=1: OK
  - hi_size=0 < target_hi=1: clean_lo (nothing to clean), pop -1 from lo, lo_size=0, push 1 to hi, hi_size=1.
  - Now lo_size=0 < target_lo=1: clean_hi (nothing), pop 1 from hi, hi_size=0, push -1 to lo, lo_size=1.
  - Now hi_size=0 < target_hi=1: clean_lo (nothing), pop -1 from lo, lo_size=0, push 1 to hi, hi_size=1.
  - INFINITE LOOP!

The problem is that with k=2, target_lo=1 and target_hi=1, but we only have 1 element. The targets assume we have k elements total. During initialization, we don't have k elements yet.

I need to handle initialization differently. Either:
1. Fill the first window all at once, then start sliding.
2. Adjust targets based on current total size.

Option 1 is cleaner. Let me do that:

```python
# Initialize first window
for i in range(k):
    if not lo or nums[i] <= -lo[0]:
        heapq.heappush(lo, -nums[i])
    else:
        heapq.heappush(hi, nums[i])

# Rebalance to correct sizes
lo_size = len(lo)
hi_size = len(hi)
# ... rebalance
```

Actually, for initialization, I can just add all k elements and then rebalance once. Since there's no lazy deletion during init, the sizes are exact.

Let me restructure:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    # Initialize
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
        else:
            heapq.heappush(hi, nums[i])
    
    # Rebalance
    while len(lo) > target_lo:
        val = -heapq.heappop(lo)
        heapq.heappush(hi, val)
    while len(hi) > target_hi:
        val = heapq.heappop(hi)
        heapq.heappush(lo, -val)
    while len(lo) < target_lo:
        val = heapq.heappop(hi)
        heapq.heappush(lo, -val)
    while len(hi) < target_hi:
        val = -heapq.heappop(lo)
        heapq.heappush(hi, val)
    
    # Now lo has target_lo elements, hi has target_hi elements
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove nums[i-k]
        x = nums[i - k]
        to_remove[x] += 1
        clean_lo()
        if x <= -lo[0]:
            heapq.heappop(lo)
        else:
            heapq.heappop(hi)
        
        # Add nums[i]
        y = nums[i]
        if not lo or y <= -lo[0]:
            heapq.heappush(lo, -y)
        else:
            heapq.heappush(hi, y)
        
        # Rebalance
        # ... same as before but using physical sizes
        
        result.append(get_median())
    
    return result
```

Wait, but after the initial setup, the physical sizes equal the logical sizes (no lazy deletion yet). After that, when we do lazy deletion, the physical sizes will be larger than logical sizes by the number of pending deletions.

Hmm, this is getting complicated. Let me use a cleaner approach.

Actually, I think the cleanest approach for this problem with the performance constraints is:

Use two heaps with lazy deletion, tracking logical sizes explicitly.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > target_lo:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > target_hi:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        while lo_size < target_lo:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        while hi_size < target_hi:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
    
    def add(x):
        nonlocal lo_size, hi_size
        if lo_size < target_lo and (not lo or x <= -lo[0]):
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        to_remove[x] += 1
        clean_lo()
        if x <= -lo[0]:
            lo_size -= 1
            heapq.heappop(lo)
        else:
            hi_size -= 1
            heapq.heappop(hi)
        rebalance()
    
    # Initialize
    for i in range(k):
        add(nums[i])
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, I had the oscillation problem before during initialization. Let me check if it still exists.

With k=2: target_lo=1, target_hi=1.

Add 1: lo_size=0 < target_lo=1, and lo is empty. Push to lo. lo=[-1], lo_size=1. Rebalance: lo_size=1=target_lo, hi_size=0<target_hi=1. Move from lo to hi: pop -1, lo_size=0, push 1 to hi, hi_size=1. Now lo_size=0<target_lo=1: pop 1 from hi, hi_size=0, push -1 to lo, lo_size=1. Now hi_size=0<target_hi=1: pop -1 from lo, lo_size=0, push 1 to hi, hi_size=1. INFINITE LOOP again!

The issue is that the rebalance loops keep going back and forth. I need to restructure.

The correct approach: in rebalance, I should only do ONE direction of movement at a time, and the total number of elements is always k (after initialization). So if lo_size + hi_size == k, and target_lo + target_hi == k, then fixing one fixes the other.

Actually wait - during initialization, lo_size + hi_size might not equal k. After the first add, it's 1. After the second, it's 2 = k. So the oscillation only happens when total < k.

Solution: only rebalance when lo_size + hi_size == k. Or better, during initialization, just add all elements first, then rebalance once.

Let me restructure:

```python
# Initialize: add all k elements
for i in range(k):
    if not lo or nums[i] <= -lo[0]:
        heapq.heappush(lo, -nums[i])
    else:
        heapq.heappush(hi, nums[i])

lo_size = len(lo)
hi_size = len(hi)

# Rebalance (only need to move elements from the larger to the smaller)
while lo_size > target_lo:
    val = -heapq.heappop(lo)
    lo_size -= 1
    heapq.heappush(hi, val)
    hi_size += 1
while hi_size > target_hi:
    val = heapq.heappop(hi)
    hi_size -= 1
    heapq.heappush(lo, -val)
    lo_size += 1
```

Since lo_size + hi_size = k = target_lo + target_hi, if lo_size > target_lo then hi_size < target_hi, and vice versa. So only one of the two while loops will execute. No oscillation.

Then for the sliding phase, after each remove+add, lo_size + hi_size is always k (we remove one, add one). So the same logic applies.

Let me also fix the `add` and `remove` for the sliding phase:

After a remove, lo_size + hi_size = k-1. After an add, lo_size + hi_size = k. So we should rebalance after the add.

Actually, let me just do: remove, then add, then rebalance. During rebalance, lo_size + hi_size = k.

```python
def rebalance():
    nonlocal lo_size, hi_size
    # lo_size + hi_size == k here
    if lo_size > target_lo:
        # Move one from lo to hi (only need one move since difference is at most 1)
        clean_lo()
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    elif hi_size > target_hi:
        clean_hi()
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
```

Wait, can the difference be more than 1? Let's see:
- Before remove+add: lo_size = target_lo, hi_size = target_hi (assuming balanced).
- Remove: one size decreases by 1. Say lo_size becomes target_lo - 1.
- Add: one size increases by 1. If we add to lo, lo_size becomes target_lo. If we add to hi, hi_size becomes target_hi + 1.

So after remove+add, the imbalance is at most 1. A single if/elif is sufficient.

But wait, what if during the remove, the element was in lo (lo_size decreases), and during add, the element goes to lo (lo_size increases)? Then lo_size is back to target_lo. No rebalance needed.

What if remove from lo (lo_size decreases) and add to hi (hi_size increases)? Then lo_size = target_lo - 1, hi_size = target_hi + 1. Need to move one from hi to lo.

What if remove from hi (hi_size decreases) and add to lo (lo_size increases)? Then lo_size = target_lo + 1, hi_size = target_hi - 1. Need to move one from lo to hi.

What if remove from hi (hi_size decreases) and add to hi (hi_size increases)? Then hi_size is back to target_hi. No rebalance needed.

So yes, at most one element needs to move. 

But I should also consider: what if the `add` decision (go to lo or hi) is based on a stale top? I should clean before making the decision.

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    # Initialize first window
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
        else:
            heapq.heappush(hi, nums[i])
    
    lo_size = len(lo)
    hi_size = len(hi)
    
    # Rebalance initial window
    if lo_size > target_lo:
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    elif hi_size > target_hi:
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove nums[i-k]
        x = nums[i - k]
        to_remove[x] += 1
        clean_lo()
        if x <= -lo[0]:
            lo_size -= 1
            heapq.heappop(lo)
        else:
            hi_size -= 1
            heapq.heappop(hi)
        
        # Add nums[i]
        y = nums[i]
        clean_lo()
        if not lo or y <= -lo[0]:
            heapq.heappush(lo, -y)
            lo_size += 1
        else:
            heapq.heappush(hi, y)
            hi_size += 1
        
        # Rebalance (at most one element moves)
        if lo_size > target_lo:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        elif hi_size > target_hi:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        result.append(get_median())
    
    return result
```

Hmm wait, there's a subtle issue. When I do `clean_lo()` before checking `x <= -lo[0]`, I'm cleaning the top of lo. But what if `x` is not at the top of lo? Then `x <= -lo[0]` might still be correct (x is in lo but not at the top). That's fine - we just mark it for removal and pop the top (which might be a different element that's also marked for removal, or might be x itself).

Actually wait - in the `remove` step, I do:
```
to_remove[x] += 1
clean_lo()
if x <= -lo[0]:
    lo_size -= 1
    heapq.heappop(lo)
else:
    hi_size -= 1
    heapq.heappop(hi)
```

The `heapq.heappop(lo)` pops the top of lo. If x is at the top, great. If x is not at the top but is in lo, then we're popping a different element! That's wrong.

The correct approach: we mark x for removal in `to_remove`, and we pop ONE element from the heap it belongs to. The popped element might not be x - it could be another element that was already marked for removal (which `clean` would have handled) or it could be x.

Wait, I think the standard approach is:
1. Mark x in to_remove.
2. Determine which heap x belongs to (based on x <= -lo[0] after cleaning).
3. Pop from that heap. The popped element is either x or a previously-marked element.

But if the popped element is NOT x, then we've removed the wrong element from the heap structure!

Hmm, let me think again. The standard lazy deletion approach:

1. `to_remove[x] += 1` - mark x for removal.
2. If x is in lo (determined by x <= -lo[0]):
   - `lo_size -= 1`
   - `heapq.heappop(lo)` - this pops the MINIMUM of the negated heap, i.e., the MAXIMUM of lo.
   
Wait no. `lo` is a max-heap implemented as a min-heap of negated values. So `lo[0]` is the most negative value, which corresponds to the largest original value. `heapq.heappop(lo)` removes `lo[0]`, which is the largest element in lo.

So if x is in lo but x is NOT the largest element in lo, then `heapq.heappop(lo)` removes the largest element, not x. This is incorrect!

The correct approach for lazy deletion:
1. Mark x in to_remove.
2. If x is in lo: `lo_size -= 1`. Do NOT pop from lo yet.
3. If x is in hi: `hi_size -= 1`. Do NOT pop from hi yet.
4. The actual popping happens in `clean()` when the marked element reaches the top.

But then the physical heap size doesn't match the logical size, and we might try to pop from an empty heap during rebalance.

Actually, I think the correct approach IS to pop immediately:

When we remove x:
- Mark x in to_remove.
- If x <= -lo[0] (x is in lo):
  - lo_size -= 1
  - heapq.heappop(lo)  # This pops the top, which might be x or might be a stale element
  
The key insight: if the top of lo is a stale element (already in to_remove), then `clean_lo()` would have removed it. So after `clean_lo()`, the top of lo is a valid element. If x <= -lo[0], then x is in lo. We pop the top. If the top IS x, great. If the top is some other element y > x... wait, that can't happen because lo is a max-heap and -lo[0] is the max. If x <= -lo[0], the max is -lo[0] >= x. We pop -lo[0] which is the max. But x might not be the max!

I think I'm overcomplicating this. Let me look at how this is typically done.

The standard approach:
- When removing x, you mark it in to_remove and pop from the heap it's in. The pop removes the top of the heap. If the top is x, fine. If the top is some other element that was already marked for removal, clean() would have handled it. If the top is some other valid element y ≠ x, then we've removed y from the heap but x is still logically in the heap (marked for removal). The next time x reaches the top, clean() will remove it.

Wait, but we only popped ONE element. If the top was y (not x), then y is now gone from the heap, but we marked x for removal. So x is still in the heap somewhere, and to_remove[x] = 1. Next time x reaches the top, clean() will pop it. But we already decremented lo_size by 1 for removing x. And y is gone from the heap but we didn't account for it.

This is the key issue. The solution: when we pop from the heap, we ALWAYS pop exactly one element, and we account for it. The element we pop might be x or might be a previously-marked element. Either way, the logical size decreases by 1.

Let me re-examine:
- to_remove[x] += 1
- x is in lo (x <= -lo[0])
- lo_size -= 1
- heapq.heappop(lo) → removes top element, call it y

Case 1: y == x. Then to_remove[x] was 1, and we just removed x. But to_remove[x] is still 1! We need to decrement it. Actually no - we'll decrement it in clean() when x reaches the top. But x is already gone from the heap! So to_remove[x] will never be cleaned up. That's a memory leak but not a correctness issue (since x won't appear at the top again).

Hmm, actually that IS a problem. If to_remove[x] = 1 and x is no longer in the heap, then later if another x appears in the heap, clean() will incorrectly remove it.

The fix: when we pop y from the heap, check if y is in to_remove. If so, decrement to_remove[y].

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] += 1
    clean_lo()
    if x <= -lo[0]:
        lo_size -= 1
        y = -heapq.heappop(lo)
        if to_remove[y]:
            to_remove[y] -= 1
    else:
        hi_size -= 1
        y = heapq.heappop(hi)
        if to_remove[y]:
            to_remove[y] -= 1
```

Wait, but clean_lo() already handles the case where the top is in to_remove. So after clean_lo(), the top of lo is NOT in to_remove. Then we pop it. If it's x, then to_remove[x] was just set to 1 (or incremented). We should decrement it. If it's not x (it's some other element y), then to_remove[y] should be 0 (since clean_lo() ensured the top isn't in to_remove). So we only need to handle the case where y == x.

Actually, after clean_lo(), the top of lo is guaranteed NOT to be in to_remove. So when we pop it:
- If it's x: to_remove[x] was just incremented to some value >= 1. We should decrement it.
- If it's not x: to_remove[top] = 0, so no issue.

But wait, how can the top be x if clean_lo() already cleaned it? clean_lo() checks `to_remove[-lo[0]]`. If x was just added to to_remove, and x is at the top, then clean_lo() would have already popped it!

So the sequence is:
1. to_remove[x] += 1
2. clean_lo() → if x is at the top of lo, it gets popped here, and to_remove[x] is decremented.
3. Now, if x was at the top, it's already gone. We don't need to pop again.
   If x was NOT at the top, the top is some valid element y ≠ x. We pop y.

But in case 3 (x not at top), we pop y which is a valid element. We've removed y from the heap, but y was a valid element! We've corrupted the data structure.

I think the correct approach is:

1. to_remove[x] += 1
2. Determine which heap x is in.
3. Pop from that heap (removing the top).
4. The top might be x (if x was at the top) or might be a stale element (if clean wasn't called) or might be a valid element different from x.

If the top is a valid element different from x, we've made a mistake.

OK I think the real solution is:

1. to_remove[x] += 1
2. If x is in lo: lo_size -= 1; heapq.heappop(lo)
3. If x is in hi: hi_size -= 1; heapq.heappop(hi)
4. The element popped is either x or a previously-marked element.
5. If the popped element is a previously-marked element (in to_remove), decrement its count.
6. If the popped element is x, decrement to_remove[x].

But how do we know which case it is? We check: after popping, if the popped value is in to_remove, decrement.

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] += 1
    if x <= -lo[0]:  # x is in lo
        lo_size -= 1
        y = -heapq.heappop(lo)
        to_remove[y] -= 1
    else:
        hi_size -= 1
        y = heapq.heappop(hi)
        to_remove[y] -= 1
```

This works! Here's why:
- We mark x for removal.
- We pop the top of the heap x is in.
- The top is either x itself, or a previously-marked element.
- Either way, we decrement to_remove for the popped element.
- If the top was x: to_remove[x] was incremented to (old+1), then decremented to old. Net effect: x is removed from heap, to_remove[x] is back to old. Correct.
- If the top was some previously-marked element y: to_remove[y] was >= 1, now decremented. y is removed from heap. x is still in the heap, marked for removal. Next time x reaches the top, clean() will handle it. Correct.

But wait, what if the top is a VALID element (not in to_remove) that is different from x? Can that happen?

After the initial setup, the heap is balanced. When we remove elements and add new ones, the invariant is:
- lo contains the smaller half (approximately)
- hi contains the larger half (approximately)
- to_remove tracks elements that should be removed

The top of lo is the maximum of lo. If x is in lo, then x <= max(lo) = -lo[0]. The top of lo is -lo[0] >= x. The top could be:
- x itself (if x is the max of lo)
- A previously-marked element (if a previous removal marked the current top)
- A valid element y > x (if x is in lo but not the max)

In the third case, we'd pop y (a valid element) and decrement to_remove[y]. But to_remove[y] is 0! We'd make it -1. That's a bug!

So the issue is: can the top of lo be a valid element different from x when x is in lo?

Yes! For example, lo = {1, 5, 3} (max-heap, top is 5). x = 3 is in lo. We pop 5 (valid, not in to_remove). to_remove[5] becomes -1. BUG!

So the approach of "just pop the top" doesn't work when x is not at the top.

The correct approach must be:
1. Mark x in to_remove.
2. Do NOT pop from the heap.
3. Adjust logical size.
4. The stale element will be cleaned up when it reaches the top.

But then the physical heap size is larger than the logical size. During rebalance, when we need to move elements, we might pop stale elements.

Let me restructure:

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] += 1
    if x <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    # Don't pop! The element will be cleaned when it reaches the top.
```

And in rebalance and other operations, we always call clean() before popping.

But there's a problem: if we never pop the stale element, the heap grows unboundedly. Over n steps, we could have O(n) stale elements. But since we clean when elements reach the top, and each element reaches the top at most once (when it's popped), the total work is O(n log n). Actually, each element is pushed once and popped once, so total work is O(n log k). The heap might temporarily have more than k elements, but the total number of pushes is n and total pops is n, so the max heap size is O(n) in the worst case. For n=200,000, that's fine memory-wise.

Wait, but if the heap has O(n) elements, then each heappop is O(log n) instead of O(log k). For n=200,000, log(n) ≈ 18, which is fine.

Actually, let me reconsider. In the sliding window, at any point, the heap contains:
- k "active" elements (in the current window)
- Some number of "stale" elements (removed but not yet cleaned)

The number of stale elements is at most the number of removals that haven't been cleaned yet. In the worst case, if all stale elements are at the bottom of the heap, they could accumulate. But in practice, the number of stale elements at any time is bounded by the number of operations since the last time that position was cleaned.

For the performance constraint (n=200,000, k=1,000), even if the heap grows to O(n), each operation is O(log n) ≈ O(18), and we do O(n) operations, so total is O(n log n) ≈ 200,000 * 18 ≈ 3.6 million operations. That's well within 2 seconds.

Let me go with the "don't pop, just mark" approach:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = defaultdict(int)
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    # Initialize first window
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
        else:
            heapq.heappush(hi, nums[i])
    
    lo_size = len(lo)
    hi_size = len(hi)
    
    # Rebalance initial window
    if lo_size > target_lo:
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    elif hi_size > target_hi:
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove nums[i-k]
        x = nums[i - k]
        to_remove[x] += 1
        clean_lo()
        if x <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        
        # Add nums[i]
        y = nums[i]
        clean_lo()
        if not lo or y <= -lo[0]:
            heapq.heappush(lo, -y)
            lo_size += 1
        else:
            heapq.heappush(hi, y)
            hi_size += 1
        
        # Rebalance
        if lo_size > target_lo:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        elif hi_size > target_hi:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        result.append(get_median())
    
    return result
```

Wait, there's still an issue. In the `remove` step:
```
to_remove[x] += 1
clean_lo()
if x <= -lo[0]:
    lo_size -= 1
else:
    hi_size -= 1
```

After `clean_lo()`, the top of lo is valid. If x <= -lo[0], we say x is in lo. But what if x was already removed (marked in to_remove) and is still in the heap? No, x is in the current window, so it hasn't been removed yet. x is a valid element in the window.

But what if x is in hi, but x <= -lo[0]? That would mean x is smaller than the max of lo, but x is in hi. This shouldn't happen if the heaps are correctly maintained (lo contains the smaller half). But with lazy deletion, the actual elements in the heaps might be slightly off.

Hmm, actually, I think the invariant is maintained: lo contains elements that are <= hi's minimum (approximately). The "approximately" is because of stale elements. But the logical structure is: the lo_size smallest elements are "in lo" and the hi_size largest are "in hi".

When we check `x <= -lo[0]`, we're checking if x is <= the max of lo. If x is in the "lo" group, then x <= max(lo) = -lo[0]. If x is in the "hi" group, then x >= min(hi) >= max(lo) = -lo[0] (assuming proper maintenance). So the check is correct.

Edge case: x == -lo[0]. Then x could be in either group. We assign it to lo. That's fine.

I think this solution is correct. Let me also handle the edge case where k=1:
- target_lo = 1, target_hi = 0
- lo has 1 element, hi has 0 elements
- median is just lo[0]

And k=n:
- Only one window, just the median of all elements.

Let me also consider: what if all elements are the same? E.g., nums = [5, 5, 5, 5], k = 2.
- lo = [-5, -5], hi = []. After rebalance: lo_size=2 > target_lo=1. Pop -5, push 5 to hi. lo=[-5], hi=[5]. lo_size=1, hi_size=1. Median = (5+5)/2 = 5. Correct.

What about floats? The problem says `list[float]`. Python's heapq works fine with floats. The negation for max-heap also works with floats.

One concern: with floats, `-lo[0]` might have precision issues. But since we're just comparing and the values come from the input, it should be fine.

Let me also think about whether `clean_lo()` before the `x <= -lo[0]` check is sufficient. What if the top of lo is stale, and after cleaning, the new top is different? Then `x <= -lo[0]` uses the new (correct) top. Good.

But what if lo becomes empty after cleaning? That would mean all elements in lo are stale. But lo_size > 0 (since k >= 1 and we have a valid window). So lo can't be completely empty of valid elements. It might be empty physically (all stale) but then clean_lo() would have popped all stale elements, and lo would be empty. But lo_size > 0 means there should be valid elements. Contradiction?

No, because we don't pop stale elements eagerly. We only pop them when they reach the top. So lo might have stale elements at the bottom and valid elements... wait, no. If lo_size > 0, there are valid elements in lo. They might not be at the top (stale elements could be at the top). After clean_lo(), the top is valid. But the heap isn't empty (there are valid elements below). So lo won't be empty after clean_lo() if lo_size > 0.

Actually, could lo be empty physically while lo_size > 0? No, because lo_size counts valid elements, and each valid element is physically in the heap. So len(lo) >= lo_size > 0.

OK I think the solution is correct. Let me also make sure the performance is good.

For n=200,000, k=1,000:
- We do n-k+1 ≈ 199,001 iterations.
- Each iteration: one remove (O(log n) for the heap pop in clean, amortized), one add (O(log n)), one rebalance (O(log n)), one get_median (O(log n) for clean).
- Total: O(n log n) ≈ 200,000 * 18 ≈ 3.6 million heap operations.
- Each heap operation on a heap of size up to ~n is O(log n) ≈ 18 comparisons.
- Total comparisons: ~65 million. In Python, this might be tight for 2 seconds.

Hmm, actually the heap size won't grow to n. Let's think: at any point, the heap contains k active elements plus some stale elements. The number of stale elements is bounded by the number of removals that haven't been cleaned. In the worst case, if stale elements are always at the bottom, they accumulate. But over n iterations, we do n removals and n adds. The total number of elements ever in the heap is at most n + k. But at any single point, the heap size is at most k + (number of stale elements not yet cleaned).

In practice, stale elements get cleaned as they reach the top. The amortized cost is O(1) per element for cleaning. So the heap size stays around O(k) on average.

Actually, I realize the worst case for heap size: if we always add elements that go to the bottom of the heap, and remove elements that are at the top, then stale elements accumulate at the top and get cleaned immediately. If we remove elements at the bottom, they stay stale until they bubble up. But in a heap, elements don't "bubble up" - they only get popped when they're at the top.

In the worst case, all stale elements could be at the bottom, and the heap grows to O(n). But this is extremely unlikely in practice. And even O(n) heap size gives O(log n) per operation, which is fine.

For Python performance with n=200,000:
- ~200,000 iterations
- Each iteration: a few heap operations (push, pop) on a heap of size ~1000-2000
- Total: ~1,000,000 heap operations on small heaps
- Should be well under 2 seconds.

I'm satisfied this will be fast enough. Let me finalize the code.

One more thing: the problem says "Return floats." So I should make sure the return values are floats. For odd k, `-lo[0]` is already a float (since nums is list[float]). For even k, `(-lo[0] + hi[0]) / 2.0` is a float. Good.

Actually wait, I should double-check: `nums: list[float]` means all elements are floats. So `-lo[0]` is a float, and the division gives a float. Good.

Let me write the final clean version:

```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    to_remove = defaultdict(int)
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def clean_lo():
        while lo and to_remove[-lo[0]]:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and to_remove[hi[0]]:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    # Build initial window
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
        else:
            heapq.heappush(hi, nums[i])
    
    lo_size = len(lo)
    hi_size = len(hi)
    
    # Rebalance initial window (at most one element moves)
    if lo_size > target_lo:
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    elif hi_size > target_hi:
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    
    def get_median() -> float:
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        # Remove element leaving the window
        x = nums[i - k]
        to_remove[x] += 1
        clean_lo()
        if x <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        
        # Add element entering the window
        y = nums[i]
        clean_lo()
        if not lo or y <= -lo[0]:
            heapq.heappush(lo, -y)
            lo_size += 1
        else:
            heapq.heappush(hi, y)
            hi_size += 1
        
        # Rebalance (at most one element moves)
        if lo_size > target_lo:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        elif hi_size > target_hi:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        result.append(get_median())
    
    return result
```

Wait, I want to double-check the rebalance logic. After remove + add:
- lo_size + hi_size = k (always, since we removed one and added one)
- target_lo + target_hi = k

So if lo_size > target_lo, then hi_size < target_hi. We move one from lo to hi.
If hi_size > target_hi, then lo_size < target_lo. We move one from hi to lo.
If lo_size == target_lo, then hi_size == target_hi. No rebalance needed.

The difference can be at most 1 (since before the operation, it was balanced, and we changed one size by -1 and the other by +1, or the same one by 0). So at most one element needs to move. The if/elif is correct.

But wait: what if lo_size < target_lo AND hi_size < target_hi? That can't happen since lo_size + hi_size = k = target_lo + target_hi.

What if lo_size > target_lo AND hi_size > target_hi? Same, can't happen.

So exactly one of the three cases (lo too big, hi too big, balanced) holds. The if/elif is correct.

I'm also a bit worried about the `clean_lo()` call before `x <= -lo[0]`. What if after cleaning, lo is empty? As I discussed, this can't happen if lo_size > 0. And lo_size > 0 always (since k >= 1 and target_lo >= 1).

Actually, target_lo = (k+1)//2. For k=1, target_lo=1. For k=2, target_lo=1. Always >= 1. So lo_size >= 1 always (after proper rebalancing). And lo won't be empty after clean_lo() since there's at least one valid element.

Hmm wait, lo_size is the LOGICAL size. The PHYSICAL heap might have stale elements. After clean_lo(), we pop all stale elements from the top. But there might still be stale elements below the top. The physical size of lo is >= lo_size (since there are lo_size valid elements plus possibly some stale ones). After clean_lo(), the top is valid, and the heap still has at least lo_size elements (the valid ones). So lo is not empty.

I'm confident the solution is correct. Let me also add a small optimization: instead of calling `clean_lo()` multiple times in one iteration, I can be more strategic. But for clarity and correctness, the current approach is fine.

Let me also verify with a small example:
nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

Window 1: [1, 3, -1] → sorted: [-1, 1, 3] → median = 1
Window 2: [3, -1, -3] → sorted: [-3, -1, 3] → median = -1
Window 3: [-1, -3, 5] → sorted: [-3, -1, 5] → median = -1
Window 4: [-3, 5, 3] → sorted: [-3, 3, 5] → median = 3
Window 5: [5, 3, 6] → sorted: [3, 5, 6] → median = 5
Window 6: [3, 6, 7] → sorted: [3, 6, 7] → median = 6

Expected: [1, -1, -1, 3, 5, 6]

Let me trace through my algorithm:
k=3, target_lo=2, target_hi=1

Initialize: add 1, 3, -1
- Add 1: lo empty, push -1 to lo. lo=[-1], hi=[]
- Add 3: 3 > -lo[0]=1, push 3 to hi. lo=[-1], hi=[3]
- Add -1: -1 <= -lo[0]=1, push 1 to lo. lo=[1, -1] (min-heap of negated: [1, -1] means -1 < 1, so top is 1, which is -(-1)=1... wait)

Hmm, let me be more careful. lo is a min-heap of negated values.
- Push -1: lo = [-1]
- Push 3: 3 > -lo[0] = -(-1) = 1. Push 3 to hi. lo = [-1], hi = [3]
- Push -1: -1 <= -lo[0] = 1. Push -(-1) = 1 to lo. lo = [-1, 1] (min-heap: -1 < 1, so top is -1)

lo_size = 2, hi_size = 1. target_lo = 2, target_hi = 1. Balanced!

get_median: clean_lo (nothing to clean), clean_hi (nothing). k is odd, return -lo[0] = -(-1) = 1. ✓

Window 2: remove 1, add -3
- Remove 1: to_remove[1] = 1. clean_lo: lo[0] = -1, -lo[0] = 1, to_remove[1] = 1. Pop -1 from lo, to_remove[1] = 0. lo = [1]. Now lo[0] = 1, -lo[0] = -1. to_remove[-1] = 0. Stop. 
  x = 1. 1 <= -lo[0] = -1? No. So hi_size -= 1. hi_size = 0.
  
  Wait, that's wrong! 1 was in lo (it was the element -1 in the negated heap, which corresponds to value 1). But after cleaning, the top of lo is 1 (negated), which corresponds to value -1. And 1 > -1, so we say x is in hi. But x=1 was in lo!

The issue: after cleaning the stale element (which happened to be x itself), the new top of lo gives a different comparison result.

Let me re-examine. Before the remove:
- lo = [-1, 1] (negated values, representing original values 1 and -1)
- hi = [3]
- to_remove = {}

Remove x = 1:
- to_remove[1] = 1
- clean_lo(): lo[0] = -1, -lo[0] = 1, to_remove[1] = 1 > 0. Pop -1. to_remove[1] = 0. lo = [1]. lo[0] = 1, -lo[0] = -1, to_remove[-1] = 0. Stop.
- Now check: x = 1 <= -lo[0] = -1? No!
- So we say x is in hi. hi_size -= 1.

But x=1 was in lo! We incorrectly assigned it to hi.

The problem: clean_lo() removed x from the top of lo, and then we check the new top to decide which heap x is in. But x is already gone from lo!

The fix: we should determine which heap x is in BEFORE cleaning. Or better: we should check which heap x is in based on the state BEFORE the removal.

Alternative fix: check `x <= -lo[0]` BEFORE calling clean_lo(). But then -lo[0] might be a stale value.

Hmm, this is the fundamental issue with lazy deletion. Let me think of a better approach.

Option 1: Determine heap membership before cleaning.
```python
x = nums[i - k]
to_remove[x] += 1
# Determine which heap x is in (before cleaning)
if x <= -lo[0]:  # -lo[0] might be stale!
    lo_size -= 1
else:
    hi_size -= 1
# Then clean
clean_lo()
clean_hi()
```

But -lo[0] might be stale (a value that's been marked for removal). If -lo[0] is stale and larger than x, we'd incorrectly say x is in lo when it's actually in hi.

Option 2: Use a different data structure. For example, use a sorted list with bisect. For k=1000, inserting and removing from a sorted list of size 1000 is O(k) = O(1000). Total: O(n*k) = O(200,000 * 1,000) = O(200,000,000). In Python, this might be too slow (200 million operations).

Actually, Python's `bisect` module with `insort` and `list.pop` is O(k) per operation due to the list shift. For k=1000 and n=200,000, that's 200,000 * 1000 = 200 million element moves. In CPython, list operations are fast (C-level memcpy), so 200 million element moves might take about 1-2 seconds. It's borderline.

Option 3: Use `sortedcontainers.SortedList` - but that's not in the standard library.

Option 4: Fix the two-heap approach.

Let me think more carefully about Option 4.

The issue is: after marking x for removal and cleaning, the top of the heap changes, and we can't correctly determine which heap x was in.

Solution: determine which heap x is in BEFORE marking for removal and cleaning.

```python
x = nums[i - k]
# Determine which heap x is in
clean_lo()  # Make sure top of lo is valid
if x <= -lo[0]:
    in_lo = True
else:
    in_lo = False

# Now mark for removal
to_remove[x] += 1
if in_lo:
    lo_size -= 1
else:
    hi_size -= 1
```

But wait, if -lo[0] is stale (marked for removal from a previous operation), then the comparison might be wrong. Let me think...

If -lo[0] is stale, it means that element is no longer in the window. Its value might be larger or smaller than x. If it's larger than x, we'd say x <= -lo[0] is true, and assign x to lo. But x might actually be in hi.

However, here's the key insight: if the top of lo is stale, it means that element was removed from the window. The actual max of lo (among valid elements) is <= the stale top. So the true max of lo <= stale top. If x <= stale top, x might or might not be <= true max of lo.

This is getting complicated. Let me try a different approach.

Option 5: Instead of lazy deletion, use a "count" approach where we track the actual elements.

Actually, let me reconsider. The standard two-heap sliding median approach DOES work. Let me look at how it's typically implemented.

The key insight I was missing: when we remove x, we should:
1. Determine which heap x belongs to (based on the CURRENT state of the heaps, considering that x is still present).
2. Mark x for removal.
3. Pop from the heap (the top might be x or a stale element).
4. If the popped element is stale (in to_remove), decrement its count.

The determination in step 1 should be: if x <= -lo[0] (the current top, which might be stale), then x is in lo.

But as I showed, this can be wrong if the top is stale.

Alternative: always clean before determining. But cleaning might remove x itself (if x is at the top).

Wait, I think the correct approach is:

1. clean_lo() and clean_hi() to ensure tops are valid.
2. Now determine: if x <= -lo[0], x is in lo. Else, x is in hi.
3. Mark x for removal: to_remove[x] += 1.
4. Pop from the determined heap. The popped element is the top (which is valid, since we just cleaned).
   - If the popped element is x: great, to_remove[x] should be decremented. But we just set it to 1. So set to_remove[x] = 0 (or just don't set it, since we're popping x directly).
   - If the popped element is NOT x: this shouldn't happen! After cleaning, the top is valid. If x is in lo, and the top of lo is valid, and x <= top... the top might not be x.

Ugh, I keep going in circles. Let me look at this from a different angle.

Actually, I think the correct and standard approach is:

```python
def remove(x):
    to_remove[x] += 1
    if x <= -lo[0]:
        lo_size -= 1
        heapq.heappop(lo)
    else:
        hi_size -= 1
        heapq.heappop(hi)
```

The key: we pop from the heap. The popped element is the top. If the top is x, we've removed x. If the top is a stale element y, we've removed y (and to_remove[y] should be decremented). If the top is a valid element z ≠ x, we've made a mistake.

Can the top be a valid element z ≠ x? Only if x is in the heap but not at the top. In that case, x < top (for lo) or x > top (for hi). But we checked x <= -lo[0] (top of lo). If x < top, then x is in lo but not at the top. We pop the top (z ≠ x). z is valid (not in to_remove). We've removed a valid element!

This IS a problem. But wait - can this actually happen? Let's think about the invariant:
- lo contains the smaller half of the window.
- The max of lo is -lo[0].
- If x is in lo, then x <= -lo[0].
- The top of lo is -lo[0], which is the max of lo.
- If x < -lo[0], then x is in lo but not the max. The top is -lo[0] ≠ x.

So yes, it CAN happen that x is in lo but not at the top. In that case, popping the top removes a different element.

BUT: here's the saving grace. The element we pop (the top) is the MAX of lo. It's a valid element. We remove it from the heap. But we only decremented lo_size by 1 (for removing x). The top element z is now gone from the heap, but we didn't account for it.

Next time we need the max of lo, we'll get the second-max. But the first-max z is gone. This corrupts the data structure.

So the "just pop the top" approach is WRONG when x is not at the top.

The correct approach MUST be one of:
A) Don't pop. Just mark for removal. Let clean() handle it when x reaches the top.
B) Use a different data structure.

Let me go with approach A:

```python
def remove(x):
    to_remove[x] += 1
    if x <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    # Don't pop! x will be cleaned when it reaches the top.
```

And in all places where we access the top of a heap, we call clean() first.

The issue I had before was: after clean_lo(), the top changes, and the comparison `x <= -lo[0]` gives a different result. But in approach A, we DON'T clean before the comparison. We use the CURRENT top (which might be stale) to determine which heap x is in.

But as I discussed, if the top is stale, the comparison might be wrong.

Hmm, let me think about this differently. If the top of lo is stale (value v, marked for removal), then v is no longer in the window. The actual max of lo (among valid elements) is some value v' <= v (since v was the max, and it's been removed). 

If x <= v (stale top), x might be in lo or hi. If x > v, x is definitely in hi (since all valid elements in lo are <= v' <= v < x).

So:
- If x > -lo[0] (stale top): x is definitely in hi. ✓
- If x <= -lo[0] (stale top): x MIGHT be in lo or hi. We can't be sure.

In the ambiguous case (x <= stale top), we need to be more careful. One approach: clean the top, then re-check.

```python
def remove(x):
    to_remove[x] += 1
    # Clean tops to get valid comparisons
    clean_lo()
    clean_hi()
    if x <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
```

After clean_lo(), the top of lo is valid. Now -lo[0] is the true max of lo. If x <= true max of lo, x is in lo. If x > true max of lo, x is in hi.

But wait! What if x IS the top of lo (x == -lo[0])? Then clean_lo() would have... no, clean_lo() only removes elements that are in to_remove. x was just added to to_remove. So if x is at the top, clean_lo() would remove it!

Let me trace:
- x is at the top of lo. to_remove[x] = 1.
- clean_lo(): lo[0] = -x. -lo[0] = x. to_remove[x] = 1 > 0. Pop -x from lo. to_remove[x] = 0.
- Now lo[0] is the second-max of lo (or lo is empty).
- Check: x <= -lo[0]? x is no longer in lo (it was just popped). If -lo[0] < x, we say x is in hi. But x was in lo!

So cleaning before the check can remove x itself, leading to incorrect heap assignment.

Solution: DON'T clean before the check. Use the potentially-stale top.

If the top is stale (value v > true max v'):
- If x > v: x is in hi. ✓ (correct)
- If x <= v: we say x is in lo. But x might be in hi (if x > v'). ✗ (potentially wrong)

If the top is valid (v = true max):
- If x <= v: x is in lo. ✓
- If x > v: x is in hi. ✓

So the only problematic case is: top is stale, and v' < x <= v. In this case, we incorrectly assign x to lo.

What happens if we incorrectly assign x to lo?
- lo_size -= 1 (but x is actually in hi, so hi_size should have been decremented)
- x is marked in to_remove
- x is still physically in hi (we didn't pop from hi)
- Next time x reaches the top of hi, clean_hi() will remove it

But we decremented lo_size instead of hi_size. This means lo_size is 1 too small and hi_size is 1 too large. The rebalance will try to fix this by moving an element from hi to lo. But the "extra" element in hi is actually a valid element (x is still there, marked for removal).

Hmm, this could lead to incorrect medians.

I think the safest approach is:

1. Don't clean before the check.
2. If x <= -lo[0] (using potentially stale top), assign to lo.
3. If x > -lo[0], assign to hi.
4. The stale top will be cleaned later.

And accept that in the rare case where the top is stale and v' < x <= v, we might misassign. But actually, can this case really happen?

Let's think: the top of lo is stale means it was removed from the window in a previous step. When was it removed? In a previous iteration. At that time, it was the max of lo (or was in lo). After removal, it's marked in to_remove. It stays at the top of lo until clean_lo() is called.

When is clean_lo() called? In get_median(), in rebalance(), and (in my proposed fix) before the add operation.

So between iterations, the top of lo might be stale. But at the start of each iteration (before remove), we haven't cleaned yet. The top might be stale from the previous iteration's removal.

Wait, in my algorithm, after each iteration, I call get_median() which calls clean_lo() and clean_hi(). So at the start of the next iteration, the tops are clean!

Let me re-examine my algorithm:
```
for i in range(k, n):
    # Remove
    x = nums[i-k]
    to_remove[x] += 1
    clean_lo()  # ← I had this
    if x <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    
    # Add
    y = nums[i]
    clean_lo()
    if not lo or y <= -lo[0]:
        heapq.heappush(lo, -y)
        lo_size += 1
    else:
        heapq.heappush(hi, y)
        hi_size += 1
    
    # Rebalance
    ...
    
    # Get median (calls clean_lo and clean_hi)
    result.append(get_median())
```

At the start of the loop, the tops are clean (from the previous get_median()). So when we do the remove:
- to_remove[x] += 1
- clean_lo(): the top was clean before. Now we added x to to_remove. If x is at the top, clean_lo() removes it. If x is not at the top, clean_lo() does nothing.

Case 1: x is at the top of lo.
- clean_lo() removes x. to_remove[x] = 0.
- Now -lo[0] is the second-max of lo.
- Check: x <= -lo[0]? Since x was the max, x >= -lo[0] (new top). So x > -lo[0] (unless x == new top, which means there were duplicates).
  - If x > -lo[0]: we say x is in hi. WRONG (x was in lo).
  - If x == -lo[0]: we say x is in lo. Correct (or at least, the size adjustment is correct).

Case 2: x is NOT at the top of lo (x is in lo but not the max).
- clean_lo() does nothing (top is valid and not in to_remove).
- Check: x <= -lo[0]? Yes (x is in lo, so x <= max of lo = -lo[0]).
- We say x is in lo. Correct.

Case 3: x is in hi.
- clean_lo() does nothing.
- Check: x <= -lo[0]? No (x is in hi, so x >= min of hi >= max of lo = -lo[0]).
  - Actually, x >= min of hi. And max of lo <= min of hi (invariant). So x >= min of hi >= max of lo = -lo[0]. So x > -lo[0] (or x == -lo[0] in case of duplicates).
  - If x > -lo[0]: we say x is in hi. Correct.
  - If x == -lo[0]: we say x is in lo. But x is in hi! WRONG.

So the problematic cases are:
- Case 1: x is the max of lo. After cleaning, we misassign to hi.
- Case 3 (duplicate): x == -lo[0] but x is in hi. We misassign to lo.

For Case 1: x is the max of lo, and it's being removed. After clean_lo() removes it, we check x <= new_top. Since x was the max, x >= new_top. If x > new_top, we say x is in hi (wrong). If x == new_top (duplicate), we say x is in lo (correct).

For Case 3: x == -lo[0] and x is in hi. We say x is in lo (wrong).

In both wrong cases, we decrement the wrong size. The effect:
- Case 1 wrong: lo_size -= 1 (should be 0 change since x was already removed by clean), hi_size unchanged (should be -1). Net: lo_size is 1 too small, hi_size is 1 too large.
- Case 3 wrong: lo_size -= 1 (should be 0), hi_size unchanged (should be -1). Same net effect.

In both cases, the rebalance will move one element from hi to lo (since hi_size > target_hi). This moves a valid element from hi to lo. The net effect on the data structure:
- x is still in to_remove (will be cleaned when it reaches the top of hi).
- One valid element moved from hi to lo.
- The sizes are now: lo_size = target_lo (after rebalance), hi_size = target_hi (after rebalance).

But the actual valid elements are: lo has target_lo - 1 valid + 1 extra (the moved element) = target_lo valid. Wait, I'm getting confused.

Let me think about it differently. The LOGICAL sizes (lo_size, hi_size) are what we use for rebalancing and median computation. The PHYSICAL heaps might have extra stale elements. As long as the logical sizes are correct, the median computation (which uses the tops after cleaning) will be correct.

In Case 1 wrong:
- x was in lo (physically). clean_lo() removed it from the heap. to_remove[x] went from 1 to 0.
- We then say x is in hi and do hi_size -= 1.
- But x was in lo! lo_size should have been decremented, not hi_size.
- Actual valid elements in lo: target_lo - 1 (x was removed). We have lo_size = target_lo (not decremented).
- Actual valid elements in hi: target_hi. We have hi_size = target_hi - 1 (incorrectly decremented).
- Rebalance: hi_size < target_hi, so... wait, in my rebalance, I only handle lo_size > target_lo or hi_size > target_hi. I don't handle the "too small" case!

Oh no, I see the issue. My rebalance only moves elements from the "too big" heap to the "too small" heap. But if the sizes are wrong in the other direction (lo too small, hi too big), I need to handle that too.

Actually wait: lo_size + hi_size = k always (we decrement one and increment the other for each remove+add). And target_lo + target_hi = k. So if lo_size < target_lo, then hi_size > target_hi. My rebalance handles hi_size > target_hi by moving from hi to lo. That's correct!

Let me re-examine:
- After remove (wrong assignment): lo_size = target_lo, hi_size = target_hi - 1. (We decremented hi_size instead of lo_size.)
- After add: lo_size or hi_size increases by 1.
  - If add to lo: lo_size = target_lo + 1, hi_size = target_hi - 1. Rebalance: lo_size > target_lo, move from lo to hi. lo_size = target_lo, hi_size = target_hi. ✓
  - If add to hi: lo_size = target_lo, hi_size = target_hi. No rebalance needed. But the actual valid elements are wrong!

In the second sub-case: lo_size = target_lo, hi_size = target_hi. But actually, lo has target_lo - 1 valid elements (x was removed from lo) and hi has target_hi valid elements. The extra "slot" in lo is empty (x was physically removed by clean_lo()).

When we compute the median, we clean_lo() and clean_hi(). clean_lo() won't find any stale elements at the top (x was already removed). So the top of lo is the second-max (or whatever is there). The median might be wrong because lo effectively has one fewer valid element.

Hmm, this is a real problem. The logical size says lo has target_lo elements, but physically it has target_lo - 1 valid elements (plus possibly some stale ones at the bottom).

I think the fundamental issue is that my "don't pop, just mark" approach has this edge case where clean() removes the element before we can correctly assign it to a heap.

Let me try a completely different approach:

Approach: Instead of two heaps with lazy deletion, use a different strategy.

For n=200,000 and k=1,000, O(n*k) might be too slow in Python. But O(n*k/64) using bit manipulation or numpy would be fast. Since we can only use stdlib...

What about using `bisect` with a sorted list?
- Maintain a sorted list of the current window.
- For each new window: remove the old element (O(k) due to list shift), insert the new element (O(k) due to list shift).
- Median: O(1) (just index into the sorted list).
- Total: O(n*k) = O(200,000 * 1,000) = O(200,000,000) element moves.

In CPython, list.insert and list.pop at arbitrary positions involve a C-level memmove. For a list of 1000 floats, each move is about 8000 bytes. 200,000 * 8000 = 1.6 GB of memory moved. At ~10 GB/s, that's about 0.16 seconds. Plus the Python overhead of the loop. Total might be 0.5-1 second. Could be within 2 seconds!

Let me try this approach:

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

This is O(n*k) but with very small constants (C-level list operations). For n=200,000 and k=1,000:
- 200,000 iterations
- Each: one bisect_left (O(log k) ≈ 10 comparisons), one pop (O(k) ≈ 1000 element moves), one insort (O(log k) + O(k) ≈ 10 + 1000)
- Total element moves: 200,000 * 2000 = 400,000,000
- At C speed, this is about 400M * 8 bytes / 10 GB/s ≈ 0.32 seconds for memory moves
- Python loop overhead: 200,000 * ~1μs ≈ 0.2 seconds
- Total: ~0.5 seconds

This should be well under 2 seconds! And it's much simpler and less error-prone than the two-heap approach.

But wait, `bisect.insort` does a binary search (O(log k)) followed by a list.insert (O(k)). And `list.pop(idx)` is O(k). So each iteration is O(k) due to the list operations. Total: O(n*k) = O(200,000,000). In Python with C-level list operations, this should be fast enough.

Let me benchmark mentally:
- `list.pop(idx)` for a list of 1000 elements: ~1000 pointer moves in C. About 100 nanoseconds.
- `list.insert(idx, val)` for a list of 1000 elements: ~1000 pointer moves in C. About 100 nanoseconds.
- `bisect.bisect_left`: ~10 comparisons in Python. About 1 microsecond.
- Total per iteration: ~300 nanoseconds (C) + ~2 microseconds (Python) ≈ 2.3 microseconds.
- 200,000 iterations: ~0.46 seconds.

Yes, this should be well under 2 seconds. Let me go with this approach.

Actually, let me double-check: `bisect.insort` is equivalent to `bisect.insort_left` which does `a.insert(bisect_left(a, x), x)`. So it's one bisect + one insert. And for removal, I do one bisect + one pop. Total per iteration: 2 bisects + 1 pop + 1 insert.

The pop and insert are the expensive parts (O(k) each). For k=1000, that's 2000 element moves per iteration. 200,000 * 2000 = 400,000,000 element moves. Each element is a pointer (8 bytes on 64-bit). Total data moved: 3.2 GB. At memory bandwidth of ~20 GB/s (realistic for sequential access in a small array), that's ~0.16 seconds. Plus Python overhead. Total well under 2 seconds.

I'll go with the sorted list approach. It's simpler, correct, and fast enough.

Let me finalize:

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

Wait, I should double-check: `bisect.insort` inserts to the left of equal elements (same as `insort_left`). And `bisect.bisect_left` finds the leftmost position. So if there are duplicates, we'll remove the leftmost occurrence. That's fine for correctness (we just need to remove one occurrence of `old`).

Actually, there's a subtle issue: what if `old` is not found by `bisect_left`? That can't happen because `old` is in the window (it was added in a previous step and not yet removed). So `bisect_left` will find a position where `window[idx] == old`.

Wait, that's not quite right. `bisect_left` returns the leftmost position where `old` could be inserted to maintain sorted order. If `old` is in the list, it returns the index of the leftmost occurrence. If `old` is not in the list, it returns the position where it would be inserted. Since `old` IS in the list, `window[idx] == old`. So `window.pop(idx)` correctly removes one occurrence of `old`. ✓

Let me also verify the median computation:
- k odd: k=5, mid=2. window[2] is the 3rd smallest (0-indexed), which is the median. ✓
- k even: k=4, mid=2. window[1] and window[2] are the 2nd and 3rd smallest. Their mean is the median. ✓

I'm satisfied. Let me write the final version.

One more thought: should I use `bisect.insort_left` explicitly for clarity? `bisect.insort` is an alias for `bisect.insort_left` in Python 3. I'll use `bisect.insort` for brevity.

Actually, I realize I should double-check performance more carefully. The main concern is the `window.pop(idx)` and `window.insert(idx, val)` operations. For a list of size k=1000:
- `pop(idx)`: shifts k-idx-1 elements left. Average: k/2 = 500 shifts.
- `insert(idx, val)`: shifts k-idx elements right. Average: k/2 = 500 shifts.
- Total per iteration: ~1000 element shifts.
- 200,000 iterations: 200,000,000 element shifts.
- Each shift is a pointer copy (8 bytes) in C.
- Total: 1.6 GB of pointer copies.
- At ~10-20 GB/s effective bandwidth: 0.08-0.16 seconds.
- Python loop overhead (function calls, variable lookups): maybe 0.2-0.3 seconds.
- Total: ~0.3-0.5 seconds. Well under 2 seconds. ✓

Great, I'll go with this solution.
