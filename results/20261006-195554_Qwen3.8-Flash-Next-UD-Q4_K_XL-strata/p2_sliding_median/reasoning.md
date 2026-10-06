Let me think about how to efficiently compute the sliding median.

For n = 200,000 and k = 1,000, we need an efficient approach. A naive O(n*k log k) approach would be about 200,000 * 1000 * log(1000) ≈ 200 million operations, which might be too slow in Python.

Better approaches:
1. **Two heaps (max-heap + min-heap)** with lazy deletion - O(n log k) but tricky to implement with lazy deletion for sliding window.
2. **SortedList from sortedcontainers** - not standard library.
3. **Two sorted lists / bisect** - maintain a sorted window and use bisect to insert/remove. Each operation is O(k) for insertion/removal in a list, so total O(n*k) = 200,000 * 1,000 = 200 million... that might be too slow.

Wait, actually with bisect.insort and list.pop, each insert/remove is O(k) due to shifting. So total is O(n*k) = 200M operations. In Python, this might be too slow.

Let me think of better approaches:

**Two heaps with lazy deletion**: We maintain a max-heap (for lower half) and min-heap (for upper half). When elements leave the window, we mark them as deleted and lazily remove them when they appear at the top of a heap.

This gives O(n log k) which is about 200,000 * 10 = 2M operations. Should be fast.

Let me design the two-heap approach:
- `lo`: max-heap (store negated values) containing the lower half
- `hi`: min-heap containing the upper half
- A `delayed` dict/count to track elements that have been removed but are still in the heaps
- Balance the heaps so that `len(lo) == len(hi)` or `len(lo) == len(hi) + 1`

Actually, let me think more carefully. The standard "Sliding Window Median" LeetCode problem uses this approach.

For k elements:
- `lo` (max-heap, stored as negatives) holds ceil(k/2) elements
- `hi` (min-heap) holds floor(k/2) elements
- median = top of lo (if k odd) or mean of tops (if k even)

When sliding:
1. Remove the element leaving the window (lazy deletion)
2. Add the new element
3. Rebalance

For lazy deletion, I'll use a dictionary mapping value -> count of how many times it's been marked for deletion.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(f"k must be between 1 and len(nums)={len(nums)}")
    
    n = len(nums)
    if n == 0:
        return []
    
    # lo: max-heap (negated), holds ceil(k/2) elements
    # hi: min-heap, holds floor(k/2) elements
    lo = []  # max-heap (negated values)
    hi = []  # min-heap
    delayed = defaultdict(int)
    lo_size = 0  # effective size of lo (excluding delayed)
    hi_size = 0  # effective size of hi (excluding delayed)
    
    def prune(heap):
        # Remove delayed elements from the top of heap
        while heap and delayed[heap[0] if heap is hi else heap[0]] > 0:
            # Wait, for lo, the top is negated
            pass
    
    # Hmm, let me think more carefully.
    
    # For lo (max-heap stored as negatives): top is -heap[0]
    # For hi (min-heap): top is heap[0]
    
    # We need a unified way to prune. Let me store the actual values in delayed.
    
    def prune(heap, is_max_heap):
        while heap:
            val = -heap[0] if is_max_heap else heap[0]
            if delayed[val] > 0:
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        # lo should have (k+1)//2 elements, hi should have k//2 elements
        target_lo = (k + 1) // 2
        target_hi = k // 2
        
        while lo_size > target_lo:
            # Move from lo to hi
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        while lo_size < target_lo:
            # Move from hi to lo
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # But we also need to prune...
    
    # Hmm, this is getting complicated. Let me look at this more carefully.
    
    # Actually, let me reconsider. The issue with lazy deletion is that when we pop from a heap, we need to check if the top element is "deleted". Let me use a cleaner approach.
    
    # Alternative: since k = 1000, and n = 200,000, maybe we can use a different approach.
    # Actually, let me just use the bisect approach. For k=1000, each insert/remove in a sorted list of size 1000 is O(k) for the memmove, but the comparison is O(log k). The memmove of 1000 elements in a list is actually quite fast in CPython because it's a C-level memmove.
    
    # Total operations: n * k = 200,000 * 1000 = 200M element moves. In CPython, list operations (insort, pop) are implemented in C, so 200M memmove operations of small objects might take... let's see. Each "element" in a list is a pointer (8 bytes). memmove of 1000 * 8 = 8000 bytes. 200,000 * 2 (insert + remove) = 400,000 such operations. 400,000 * 8000 bytes = 3.2 GB of memory movement. That might take around 1-2 seconds.
    
    # Actually, bisect.insort + list.pop(idx) should be fast enough since it's all C-level operations. Let me try this approach first.
    
    # Hmm, but actually let me think about the two-heap approach more carefully.
    
    pass
```

Let me go with the two-heap approach with lazy deletion. It's O(n log k) which is much better.

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    n = len(nums)
    result = []
    
    # lo: max-heap (negated), effective size should be (k+1)//2
    # hi: min-heap, effective size should be k//2
    lo = []
    hi = []
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def prune(heap, negate=False):
        while heap:
            val = -heap[0] if negate else heap[0]
            if val in delayed and delayed[val] > 0:
                delayed[val] -= 1
                if delayed[val] == 0:
                    del delayed[val]
                heapq.heappop(heap)
            else:
                break
    
    def balance():
        nonlocal lo_size, hi_size
        # After operations, rebalance
        # lo should have one more than hi if k is odd, equal if k is even
        # Actually during the process, sizes might be off by more
        
        # Move from lo to hi if lo has too many
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            prune(hi, negate=False)  # No, we don't need to prune before pushing
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        # Move from hi to lo if hi has too many
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # Hmm wait, what if we pop a delayed element? We need to prune first.
    
    # This is getting complex. Let me look at this differently.
    
    # Actually, the standard approach for LeetCode 480:
    # 1. Remove old element: mark as delayed, decrement size of appropriate heap
    # 2. Add new element: push to appropriate heap, increment size
    # 3. Balance: move elements between heaps
    # 4. Prune: before reading the top, prune delayed elements
    
    pass
```

Let me write a cleaner version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k out of range")
    
    n = len(nums)
    result = []
    
    lo = []  # max-heap (negated), holds smaller half
    hi = []  # min-heap, holds larger half
    delayed = defaultdict(int)
    lo_size = 0  # logical size (not counting delayed)
    hi_size = 0
    
    def prune(heap, negate):
        """Remove delayed elements from top of heap."""
        while heap:
            top = -heap[0] if negate else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Target: lo_size == hi_size + 1 if k odd, lo_size == hi_size if k even
        # But during intermediate steps, sizes might not be exactly right
        
        # If lo has too many
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
            # Need to prune lo after popping? No, we just removed top.
            # But what if top was delayed? We need to prune before popping.
        
        # If hi has too many
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    # Hmm, the issue is when we pop from a heap, the top might be a delayed element.
    # We need to prune before popping.
    
    # Let me redo rebalance:
    def rebalance2():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            prune(lo, True)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        while hi_size > lo_size:
            prune(hi, False)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    # Actually wait. If I prune first, then the top is a "real" element. Good.
    # But when I pop, I'm removing a real element from one heap and pushing to another.
    # The delayed count for that element is 0 (since we pruned), so it's fine.
    
    # Hmm, but what if after moving elements, the top of a heap is now delayed?
    # That's fine - we'll prune it later when we need to read the top or pop again.
    
    # OK let me write the full algorithm:
    
    # Initialize with first k elements
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        rebalance2()
    
    # First median
    prune(lo, True)
    prune(hi, False)
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    # Slide
    for i in range(k, n):
        # Remove nums[i-k]
        old = nums[i - k]
        # Determine which heap it belongs to
        prune(lo, True)
        if old <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[old] += 1
        
        # Add nums[i]
        prune(lo, True)
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        
        rebalance2()
        
        # Get median
        prune(lo, True)
        prune(hi, False)
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, there's an issue. When determining which heap `old` belongs to, I use `old <= -lo[0]`. But what if `lo[0]` is a delayed element? I should prune first. I do prune(lo, True) before checking. Good.

But there's another subtle issue: what if old == -lo[0]? Then old belongs to lo. But what if there are duplicates and old could be in either heap? The key insight is: if old <= -lo[0], we decrement lo_size. If old > -lo[0], we decrement hi_size. This works because all elements in lo are <= all elements in hi (invariant).

Wait, but after lazy deletion, the invariant might be temporarily violated? No, we only mark elements as deleted, we don't move them. The structural invariant (all of lo <= all of hi) is maintained because we only add/remove from the correct heap.

Actually, there's a subtle bug. When we do `prune(lo, True)` and then check `old <= -lo[0]`, what if lo is empty after pruning? That shouldn't happen if k >= 1 and we have the right number of elements.

Let me also handle the edge case where k = 1: median is just the element itself.

Actually, let me also think about whether the rebalance function handles all cases correctly. After removing an element and adding a new one:
- lo_size might be too large or too small relative to hi_size
- We need lo_size to be either equal to hi_size (k even) or hi_size + 1 (k odd)

The while loops in rebalance2 should handle this.

Let me also consider: when we pop from lo in rebalance, we do `prune(lo, True)` first. This ensures the top is a "live" element. Good.

One more issue: when I do `delayed[old] += 1` and later prune, I use the value to look up in the delayed dict. Since we're dealing with floats, and we store the exact same float value, this should work fine (same object/value).

Actually wait - with floats, `old` is `nums[i-k]` which is the exact same float object stored in the heap (we negated it for lo, but we store `-nums[i]`). When we check `delayed[top]`, `top` is `-heap[0]` for lo, which reconstructs the original value. Since it's the same float value, dictionary lookup by equality should work.

Hmm, but there could be floating point issues. If nums contains -0.0 and 0.0, they compare equal in Python. But that's fine for our purposes.

Let me also think about the initial setup. I push all k elements and rebalance after each one. This gives O(k log k) for initialization, then O(n log k) for the sliding part. Total O(n log k).

For n=200,000, k=1,000: 200,000 * 10 = 2M heap operations. In Python, this should take well under 2 seconds. Actually, heapq operations in Python are pure Python (or are they C-implemented?). Let me check - in CPython, `heapq` has a C implementation (`_heapq`) that's used automatically. So each heappush/heappop is O(log k) with small constants.

2M * log2(1000) ≈ 2M * 10 = 20M basic operations. In Python with C-implemented heapq, this should take maybe 0.5-1 second. Should be fine.

Actually, let me reconsider. The rebalance function has while loops. In the worst case, after adding one element and removing one, the heaps are off by at most 1, so we do at most 1 swap. So the while loops run at most once each. Good.

Let me also handle the case k == len(nums): just return [median(nums)].

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    result = []
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def prune(heap, negate):
        while heap:
            top = -heap[0] if negate else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            prune(lo, True)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            prune(hi, False)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    # Initialize
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        rebalance()
    
    # First median
    prune(lo, True)
    prune(hi, False)
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    # Slide
    for i in range(k, n):
        # Remove old element
        old = nums[i - k]
        if old <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[old] += 1
        
        # Add new element
        if nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        
        rebalance()
        
        # Get median
        prune(lo, True)
        prune(hi, False)
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, there's a problem in the sliding part. When I do `if old <= -lo[0]`, what if lo[0] is a delayed element? I should prune first.

Actually, let me think about this. At the point where I'm about to remove `old`, the heaps should be balanced and the tops should be non-delayed (we just pruned them when computing the previous median). But wait, the previous median computation did `prune(lo, True)` and `prune(hi, False)`. So at the start of the next iteration, the tops are non-delayed. Good.

But wait - after the rebalance in the previous iteration, we pruned the tops. Then in the current iteration, before removing `old`, the tops should still be non-delayed (nothing changed since last prune). So `old <= -lo[0]` is safe.

Hmm, actually no. The rebalance function might push/pop elements, and after rebalance, the top might change. But rebalance calls prune before popping, so after rebalance, the tops are non-delayed. Then we immediately compute the median (which also prunes). So at the start of the next loop iteration, the tops are non-delayed.

Wait, let me trace through more carefully:
1. rebalance() is called - it prunes before popping. After rebalance, tops are non-delayed (we only popped live elements).
2. prune(lo, True) and prune(hi, False) are called - confirms tops are non-delayed.
3. Median is computed.
4. Next iteration: remove old. `old <= -lo[0]` - lo[0] is non-delayed. Good.
5. delayed[old] += 1.
6. Add new element - might push to lo or hi. The comparison `nums[i] <= -lo[0]` - lo[0] is still non-delayed. Good.
7. rebalance() - prunes before popping. Good.
8. prune + compute median.

This looks correct!

One edge case: what if `lo` is empty when we check `old <= -lo[0]`? This shouldn't happen because k >= 1, so at least one element is in the window, and lo always has at least 1 element (since lo_size >= hi_size + (1 if k odd else 0)).

Wait, what about k=1? Then lo_size should be 1, hi_size = 0. lo has one element. Good.

What about k=2? lo_size = 1, hi_size = 1. Both non-empty. Good.

I think the code is correct. Let me also add the check for `not lo` in the initial loop (for the first element). Actually, I have `if not lo or nums[i] <= -lo[0]`. Good.

Let me also think about whether there could be an issue with `old <= -lo[0]` when old is in lo but equals the top of lo (duplicate). In that case, we decrement lo_size and mark it as delayed. When we later prune, we'll remove one instance. This is correct because the delayed dict tracks how many copies of that value need to be removed.

But wait - what if old == -lo[0] but old is actually in hi? This can happen with duplicates. E.g., lo = [-3, -3], hi = [3, 3]. We remove old=3. We check `3 <= -(-3)` → `3 <= 3` → True. So we decrement lo_size. But 3 is in hi! This is a bug!

Hmm, this is a known issue with the lazy deletion approach. The standard solution for LeetCode 480 handles this by using `<=` for the comparison. The key insight is:

If `old <= -lo[0]`, we assume it's in lo. If `old > -lo[0]`, we assume it's in hi.

This works because of the invariant: all elements in lo <= all elements in hi. So:
- If old <= -lo[0], it COULD be in lo (since lo's max >= old >= lo's other elements).
- If old > -lo[0], it MUST be in hi (since lo's max < old, so it can't be in lo).

But what if old == -lo[0] and old is actually in hi? This means there's a duplicate: old is both the max of lo and in hi. In this case:
- We decrement lo_size (wrong, it's actually in hi).
- We mark old as delayed.
- When we prune lo, we'll remove old from lo (since it's the top of lo and delayed).
- When we prune hi, we'll remove old from hi (since it's delayed).
- But we only marked ONE copy as delayed, and we decremented lo_size by 1.
- So the net effect is: lo loses one element (pruned), hi keeps its old (not pruned because delayed count went to 0). But we decremented lo_size, which means we think lo has one fewer element.

Wait, let me trace through:
- lo = [-3, -3] (meaning values [3, 3]), hi = [3, 3] (meaning values [3, 3])
- lo_size = 2, hi_size = 2 (k=4, but actually for k=4 we want lo_size=2, hi_size=2)
- Remove old=3: `3 <= -lo[0]` → `3 <= 3` → True. lo_size becomes 1.
- delayed[3] = 1
- Now we need to prune before computing median.
- prune(lo, True): top is -3, val = 3, delayed[3] = 1 > 0. Pop it. delayed[3] = 0. lo = [-3], lo physically has 1 element. But lo_size = 1. OK consistent.
- prune(hi, False): top is 3, delayed[3] = 0. Don't pop. hi = [3, 3], hi_size = 2. OK.
- lo_size = 1, hi_size = 2. Rebalance needed: hi_size > lo_size. 
  - prune(hi, False): top is 3, not delayed. Pop 3. hi_size = 1. Push -3 to lo. lo_size = 2.
  - Now lo_size = 2, hi_size = 1. Good for k=3? No wait, k is still 4.

Hmm, I think I'm overcomplicating this. The invariant we maintain is: after rebalance, lo_size == hi_size or lo_size == hi_size + 1. And lo_size + hi_size == k (number of live elements in window).

Actually, lo_size + hi_size should always equal k (the window size). When we remove one and add one, it stays k. When we rebalance, we just move between heaps, so total stays k.

Let me re-trace: k=4, lo_size=2, hi_size=2.
- Remove old=3: lo_size=1, delayed[3]=1.
- Add new=5: 5 <= -lo[0]? lo[0] = -3, so -lo[0] = 3. 5 <= 3? No. Push to hi. hi_size=3.
- lo_size=1, hi_size=3. Total=4. Good.
- Rebalance: hi_size > lo_size. Pop from hi (after prune). prune(hi, False): top=3, delayed[3]=1. Pop it! delayed[3]=0. Next top: still 3, not delayed. Pop 3. hi_size=2. Push -3 to lo. lo_size=2.
- Now lo_size=2, hi_size=2. Good.

Wait, in rebalance, I do:
```
while hi_size > lo_size:
    prune(hi, False)
    val = heapq.heappop(hi)
    hi_size -= 1
    heapq.heappush(lo, -val)
    lo_size += 1
```

After prune(hi, False), the top of hi is non-delayed. So popping gives a live element. hi_size goes from 3 to 2, lo_size from 1 to 2. Then we check again: 2 > 2? No. Done.

But wait, what happened to the delayed 3 in hi? The prune removed it! So hi went from [3(delayed), 3, 3] to [3, 3] after prune. Then we pop 3, hi becomes [3], hi_size = 2. Hmm, but hi physically had 3 elements, prune removed 1, so 2 left. Then pop removes another, 1 left. But hi_size was 3, after prune we don't change hi_size (prune doesn't touch size). Then hi_size -= 1 makes it 2. But physically hi has 1 element!

This is the problem! Prune removes elements from the heap physically but doesn't adjust lo_size/hi_size. The sizes are only adjusted when we explicitly remove/add elements. Prune just cleans up delayed elements from the top.

So the invariant is: lo_size = (number of live elements in lo). The physical size of lo might be larger due to delayed elements. When we prune, we remove delayed elements physically but they were already not counted in lo_size.

OK so let me re-trace:
- Initially: lo = [-3, -3] (physical), hi = [3, 3] (physical). lo_size=2, hi_size=2.
- Remove old=3: lo_size=1, delayed[3]=1.
- Add 5: hi = [3, 3, 5] (physical), hi_size=3.
- Rebalance: hi_size(3) > lo_size(1). 
  - prune(hi, False): top is 3, delayed[3]=1>0. Pop it physically. delayed[3]=0. Next top is 3, not delayed. Stop.
  - Now hi physically = [3, 5]. Top is 3.
  - heapq.heappop(hi) → 3. hi_size = 2. lo_size = 2. Push -3 to lo. lo = [-3, -3, -3].
  - Check: hi_size(2) > lo_size(2)? No. Done.
- Now: lo physically has 3 elements (one is delayed? No! We only marked one 3 as delayed, and we pruned one from hi. The two -3's in lo are not delayed because we only had one delayed[3] and it was consumed by the prune in hi.)

Wait, I'm getting confused. Let me think about this differently.

The delayed dict says: "this many instances of value X have been logically removed from the window, and we need to physically remove them from wherever they are in the heaps."

When we remove old=3 from the window:
- We determine it "belongs to" lo (by the <= comparison).
- lo_size -= 1 (logically lo has one fewer live element).
- delayed[3] += 1 (physically, one copy of 3 needs to be removed from a heap).

Now, the delayed element could be physically in either heap. When we prune, we check the top of a heap, and if it's delayed, we remove it. This is correct because:
- If a delayed element is at the top of lo, we remove it (the physical size decreases, but lo_size already accounted for this removal).
- If a delayed element is not at the top, it stays there until it bubbles up.

The key insight: lo_size represents the number of LIVE elements that "belong to" lo. The physical heap might contain extra (delayed) elements. When we prune, we remove delayed elements from the top, which doesn't change lo_size (they were already not counted).

So in my trace:
- After remove old=3: lo_size=1, delayed={3:1}. lo physically = [-3,-3] (but one 3 is "ghost"). hi physically = [3,3].
- After add 5: hi physically = [3,3,5]. hi_size=3.
- Rebalance: hi_size(3) > lo_size(1).
  - prune(hi, False): top=3, delayed[3]=1. Pop physically. delayed[3]=0. Next top=3, not delayed. hi physically=[3,5]. 
  - pop hi → 3. hi_size=2. push -3 to lo. lo physically=[-3,-3,-3]. lo_size=2.
  - 2 > 2? No. Done.
- Now: lo physically=[-3,-3,-3], lo_size=2. hi physically=[5], hi_size=1.

Wait, lo physically has 3 elements but lo_size=2. That means there's 1 ghost element in lo. But delayed={}. So that ghost will never be pruned!

This is a problem. The issue is: we decremented lo_size (thinking the element was in lo), but the delayed element was actually in hi (and got pruned from hi). Now there's an extra element in lo that we think is live (lo_size says so) but it's a "duplicate" that shouldn't be there.

Hmm, wait. Actually, the invariant is lo_size + hi_size = k (number of live elements). Let's check: 2 + 1 = 3, but k=4. That's wrong!

Oh wait, we also added a new element. Let me recount. Before the slide: window has 4 elements, lo_size=2, hi_size=2. After removing one and adding one: still 4. lo_size = 1+1=2, hi_size = 2+1=3 (before rebalance). Total=5? No, lo_size=1 (after remove) + 1 (after add to... wait, I said we add 5 to hi). 

Let me redo: 
- Start: lo_size=2, hi_size=2, total=4=k. ✓
- Remove old=3: lo_size=1. Total=3.
- Add 5 to hi: hi_size=3. Total=4=k. ✓
- Rebalance: move from hi to lo. hi_size=2, lo_size=2. Total=4. ✓

OK total is maintained. Now physically:
- lo has 3 physical elements, 2 are "live", 1 is "ghost" (but not marked in delayed).
- hi has 1 physical element, 1 is live.

The ghost in lo: it's a -3 (value 3). But delayed[3]=0. So when we prune lo, we won't remove it. But lo_size=2 means only 2 of the 3 physical elements are live.

When we compute median (k=4, even): we need top of lo and top of hi.
- prune(lo, True): top=-3, val=3, delayed[3]=0. Don't pop. lo[0]=-3.
- prune(hi, False): top=5, delayed[5]=0. Don't pop. hi[0]=5.
- median = (3 + 5) / 2 = 4.

But is this correct? The window after the slide has 4 elements: the original 4 minus old=3 plus new=5. The sorted window might be [3, 3, 3, 5] (if original was [3, 3, 3, 3] minus one 3 plus 5). Median of [3, 3, 3, 5] = (3+3)/2 = 3.

Hmm, that doesn't match. Let me re-examine.

Original window: let's say [3, 3, 3, 3]. lo = [-3, -3], hi = [3, 3]. 
Remove old=3 (the first 3 leaving the window). 
- 3 <= -lo[0] = 3: yes. lo_size=1. delayed[3]=1.
Add new=5.
- 5 <= -lo[0]=3? No. Push to hi. hi=[3,3,5], hi_size=3.
Rebalance: hi_size(3) > lo_size(1).
- prune(hi, False): top=3, delayed[3]=1. Pop it. delayed[3]=0. hi=[3,5].
- pop hi: 3. hi_size=2. Push -3 to lo. lo=[-3,-3,-3], lo_size=2.
- 2 > 2? No. Done.

Median: prune(lo): top=-3, delayed[3]=0. OK. prune(hi): top=3, delayed[3]=0. OK.
- Median = (-(-3) + 3)/2 = (3+3)/2 = 3. ✓

OK so the answer is correct! The "ghost" in lo doesn't cause a problem for the median computation because the top of lo is still the correct max of the lower half.

But what about future operations? The ghost (a 3 that shouldn't be in lo) is there. If in a future step we remove another 3 from the window:
- 3 <= -lo[0] = 3: yes. lo_size -= 1. delayed[3] += 1.
- Now lo_size=1, delayed[3]=1.
- When we prune lo: top=-3, val=3, delayed[3]=1. Pop it! delayed[3]=0. lo=[-3,-3].
- But lo physically had 3 elements, now 2. lo_size was 1 but now physically there are 2.

Hmm, lo_size=1 but physically 2 elements in lo? That means one is a ghost that's not tracked. This seems problematic.

Wait, I think the issue is that lo_size should always be consistent: lo_size = (physical elements in lo) - (delayed elements in lo that haven't been pruned yet). But we don't track how many delayed elements are in lo specifically.

Actually, I think the standard approach works correctly despite this apparent inconsistency, because:
1. lo_size + hi_size = k always.
2. The median is computed from the tops, which are always correct after pruning.
3. The rebalancing ensures the correct number of "live" elements are in each half.

The "ghosts" are just extra physical elements that will eventually be cleaned up when they reach the top of a heap. They don't affect the correctness of the median or the rebalancing logic.

Actually wait, they DO affect rebalancing. If lo has physical 3 but lo_size 1, and we do `while lo_size > hi_size + 1`, we're using lo_size (logical), not physical. So we pop from lo (after prune) - but the top might be a non-delayed element, and we pop a LIVE element from lo, reducing lo_size. The ghosts just sit there.

I think this is actually correct. The algorithm works because:
- We only ever pop elements from the top (after pruning).
- The top is always the correct extreme value of the live elements.
- lo_size correctly tracks the number of live elements in lo.
- Rebalancing moves live elements between heaps.
- Ghosts are cleaned up lazily.

The only potential issue: could a ghost bubble to the top and get "re-activated"? No, because ghosts are always at the top when we prune them. If they're not at the top, they stay buried. They can never be "popped" by rebalance (because we prune first).

OK, I'm convinced the algorithm is correct. Let me finalize the code.

One more thing: in the initial loop, I call `rebalance()` after each insertion. This ensures the heaps are balanced before the next comparison. This is important because `nums[i] <= -lo[0]` assumes lo[0] is the max of the lower half.

Actually, do I need to rebalance after each insertion during initialization? Yes, because otherwise lo might have too many elements and the comparison is still valid (lo[0] is the max of lo), but the balance might be way off. Actually, the comparison `nums[i] <= -lo[0]` is valid regardless of balance - it just decides which heap to insert into. And rebalance() will fix the balance. So I could do all insertions first, then one rebalance. But doing it incrementally is simpler and still correct.

Hmm, actually if I don't rebalance during init, and lo gets too big, the median computation at the end would still work (I'd rebalance before computing). But for simplicity, let me keep the per-insert rebalance.

Actually, for initialization, I can just insert all k elements into lo, then rebalance. Or insert into lo and hi alternately. The simplest correct approach: insert all into lo (or split them), then rebalance once. But the per-element approach is fine too.

Let me also think about whether I should use `bisect` instead for simplicity and correctness. For k=1000, n=200000:
- Each slide: bisect_left to find position (O(log k)), list.pop (O(k) for memmove), bisect.insort (O(log k) + O(k) for memmove).
- Total: 200,000 * 2 * 1000 memmove of 8-byte pointers = 3.2 GB memmove.
- At ~10 GB/s memory bandwidth, that's 0.32 seconds. Plus Python overhead.
- Probably 1-3 seconds. Might be cutting it close.

The heap approach is O(n log k) = 200,000 * 10 = 2M heap operations, each involving a few comparisons. In Python with C-implemented heapq, this should be faster.

Let me stick with the heap approach.

Actually, let me reconsider the bisect approach. With `bisect.insort` and `list.pop`, the operations are:
- bisect_left: O(log k) comparisons (C-level for simple types)
- list.pop(i): O(k) memmove (C-level, very fast)
- bisect.insort: O(log k) + O(k) memmove

For k=1000: memmove of ~8000 bytes. Very fast at C level.
200,000 iterations * 2 list mutations * 8000 bytes = 3.2 GB. At 20+ GB/s on modern hardware, ~0.16s for memmove.
Plus Python loop overhead: 200,000 iterations of simple code. Maybe 0.5s.
Total: maybe 1s. Should be fine.

But the heap approach should be even faster. Let me go with heaps.

Actually, you know what, let me benchmark mentally:
- Heap approach: 200,000 iterations, each doing ~4-6 heap operations (push, pop, push, pop, prune). Each heap op is O(log 1000) ≈ 10 comparisons + swaps. But heapq in Python is mostly C. So maybe 200,000 * 20 = 4M C-level operations. Fast.
- Plus Python overhead for the loop, dictionary lookups for delayed, etc.

I think heap approach will be around 0.5-1.5s. Bisect approach maybe 1-2s. Both should be under 2s.

Let me go with the heap approach for efficiency.

Let me also make sure I handle the edge case where the list is empty (n=0). If k > 0 and n=0, we raise ValueError. If k=1 and n=0, also ValueError. Good.

One more thing: the problem says "Return floats." So I should make sure all returned values are floats. `float(-lo[0])` ensures that. And for even k, `(-lo[0] + hi[0]) / 2.0` returns a float (division by float).

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    n = len(nums)
    result = []
    
    lo = []  # max-heap (negated values), lower half
    hi = []  # min-heap, upper half
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def prune(heap, is_max):
        while heap:
            top = -heap[0] if is_max else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            prune(lo, True)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            prune(hi, False)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    # Build initial window
    for i in range(k):
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        rebalance()
    
    # First median
    prune(lo, True)
    prune(hi, False)
    if k & 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    # Slide the window
    for i in range(k, n):
        # Remove element leaving window
        old = nums[i - k]
        prune(lo, True)
        if old <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[old] += 1
        
        # Add new element
        prune(lo, True)
        if not lo or nums[i] <= -lo[0]:
            heapq.heappush(lo, -nums[i])
            lo_size += 1
        else:
            heapq.heappush(hi, nums[i])
            hi_size += 1
        
        rebalance()
        
        # Compute median
        prune(lo, True)
        prune(hi, False)
        if k & 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, I added `prune(lo, True)` before checking `old <= -lo[0]` and before the new element insertion. Is this necessary?

After computing the median, both tops are non-delayed (we pruned them). Then immediately:
- We remove old: check `old <= -lo[0]`. lo[0] is non-delayed. ✓
- delayed[old] += 1. Now lo[0] might be old (if old == -lo[0]). 
- Add new element: check `nums[i] <= -lo[0]`. But lo[0] might now be a delayed element!

So yes, I need to prune before the second check. Let me add it.

Actually, after `delayed[old] += 1`, if `old == -lo[0]`, then lo[0] is now delayed. When I check `nums[i] <= -lo[0]`, I'm comparing against a delayed value. Is this a problem?

If old == -lo[0], that means the element we just removed was the max of lo. The new comparison `nums[i] <= old` still gives a correct answer for "should this go in lo or hi?" because all elements in lo are <= all in hi. If nums[i] <= old (the max of lo), it should go in lo. If nums[i] > old, it should go in hi. Even though old is now "delayed" (logically removed), the comparison is still valid for deciding placement.

Hmm, but what if old was the only element in lo (lo_size became 0)? Then lo[0] is a ghost. And `nums[i] <= -lo[0]` compares against a ghost. This could lead to wrong placement.

Example: lo_size=1, hi_size=3 (k=4). Remove old which is -lo[0]. lo_size=0. delayed[old]=1.
Now check nums[i] <= -lo[0]. lo[0] is the ghost. If nums[i] <= ghost, we push to lo. If not, push to hi.

If we push to lo: lo_size=1. Good.
If we push to hi: hi_size=4. lo_size=0. Rebalance: hi_size > lo_size. prune(hi): top might not be delayed. Pop from hi, push to lo. lo_size=1.

Either way, rebalance fixes it. And the comparison, even against a ghost, doesn't affect correctness of the final state after rebalance.

Actually, I think it's safer to prune before the comparison. Let me keep the prune calls.

But wait, if lo_size=0 and I prune lo, I might remove the ghost, making lo empty. Then `not lo` is True, and we push to lo. That's correct (first element goes to lo).

If lo_size=0 and I don't prune, lo[0] is the ghost. If nums[i] <= ghost, push to lo (correct - lo needs elements). If nums[i] > ghost, push to hi. Then rebalance moves one from hi to lo. Also correct.

So it works either way, but pruning is cleaner. Let me keep it.

Actually, let me simplify: I'll just always prune before accessing heap tops. This is the safe approach.

Let me also double-check: can `lo` be empty when we access `lo[0]`? 
- After pruning, if lo_size > 0, there must be at least one non-delayed element in lo (by definition of lo_size). So prune won't remove all elements. lo won't be empty if lo_size > 0.
- If lo_size == 0 (all elements in hi), then lo might be empty after pruning. But can lo_size be 0? Only if k=0 (impossible) or during transient states. After rebalance, lo_size >= 1 (since k >= 1).

After the remove step, lo_size could be 0. Then when adding the new element, if `not lo` (empty after prune), we push to lo. lo_size=1. Rebalance ensures balance.

I think the code is correct. Let me finalize it.

Hmm, one more thought: what about `prune(lo, True)` when lo is empty? The while loop condition `while heap:` handles it. And `heapq.heappop` on empty list would error, but we only call it inside the while loop when heap is non-empty. Good.

And `prune(hi, False)` when hi is empty? Same logic. Good.

For the median computation with k even: we access both lo[0] and hi[0]. After rebalance with k even, lo_size == hi_size >= 1 (since k >= 2). So both are non-empty after prune. Good.

For k=1: lo_size=1, hi_size=0. Median = -lo[0]. Good.

I'm satisfied the code is correct. Let me write the final clean version.
