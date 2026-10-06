The user wants a `sliding_median` function that efficiently computes the median of every sliding window of size k over a list of floats.

For n = 200,000 and k = 1,000, we need to be efficient. Let's think about the approach:

1. **Naive approach**: Sort each window - O(n * k log k) - too slow for n=200k, k=1000.

2. **Two heaps (max-heap and min-heap)**: Classic sliding window median with lazy deletion. O(n log k). This is the standard approach.

3. **Sorted list / balanced BST**: Python doesn't have a built-in balanced BST. We could use `bisect` with a sorted list - insertion/deletion is O(k), so O(n*k) which for n=200k, k=1000 is 200M operations - might be borderline.

4. **Two heaps with lazy deletion**: This is O(n log k). For n=200k, k=1000, this is about 200k * 10 = 2M operations. Very fast.

Let me go with the two heaps approach with lazy deletion:

- `lo`: max-heap (using negative values) containing the smaller half of elements. Size = (k+1)//2
- `hi`: min-heap containing the larger half of elements. Size = k//2
- A `dict` (Counter) for lazy deletion of elements that are no longer in the current window
- When removing an element, mark it for deletion. When it appears at the top of a heap, actually remove it.
- After each insert/delete, rebalance the heaps.

Let me code this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    # lo is max-heap (negate values), size = (k+1)//2
    # hi is min-heap, size = k//2
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    delayed = defaultdict(int)  # lazy deletion counter
    
    def make_balance():
        # Ensure lo has size (k+1)//2, hi has size k//2
        # Also prune delayed elements from tops
        
        # Prune tops
        while lo and -lo[0] in delayed and delayed[-lo[0]] > 0:
            x = -heapq.heappop(lo)
            delayed[x] -= 1
            if delayed[x] == 0:
                del delayed[x]
        
        while hi and hi[0] in delayed and delayed[hi[0]] > 0:
            x = heapq.heappop(hi)
            delayed[x] -= 1
            if delayed[x] == 0:
                del delayed[x]
        
        target_lo = (k + 1) // 2
        target_hi = k // 2
        
        # Move elements from lo to hi if lo is too big
        # (accounting for delayed elements)
        while len(lo) > target_lo:
            x = -heapq.heappop(lo)
            delayed[x] += 1  # Wait, no. We actually move it.
            # Hmm, lazy deletion is trickier here.
            # Actually, when we move an element, we don't mark it as delayed.
            # We just move it to the other heap.
            heapq.heappush(hi, x)
        
        while len(hi) > target_hi:
            x = heapq.heappop(hi)
            heapq.heappush(lo, -x)
        
        # If lo is too small, move from hi
        while len(lo) < target_lo and hi:
            x = heapq.heappop(hi)
            heapq.heappush(lo, -x)
        
        while len(hi) < target_hi and lo:
            x = -heapq.heappop(lo)
            heapq.heappush(hi, x)
    
    ...
```

Wait, the lazy deletion approach is more nuanced. Let me think more carefully.

The standard approach for "find median from data stream" with sliding window:

- We maintain two heaps. `lo` has the smaller half (as max-heap), `hi` has the larger half (as min-heap).
- `lo` size should be ceil(k/2), `hi` size should be floor(k/2).
- When we add a new element, we add it to the appropriate heap and rebalance.
- When we remove an old element, we mark it as "delayed" (lazy delete).
- `make_balance` prunes delayed elements from the tops and rebalances.

Actually, let me reconsider. The lazy deletion works like this:
- When we want to remove element x, we don't actually remove it from the heap. Instead, we increment `delayed[x]`.
- In `make_balance`, we first prune the tops of both heaps (pop elements that are marked as delayed).
- Then we check sizes (accounting for delayed elements) and rebalance.

But tracking sizes with delayed elements is tricky. A common approach:

- Keep track of actual sizes `lo_size` and `hi_size` (number of valid elements in each heap).
- When we add to a heap, increment its size.
- When we mark as delayed, decrement the size of the heap it belongs to.
- In `make_balance`, first prune tops, then rebalance based on `lo_size` and `hi_size`.

Let me implement this properly:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap (negated values), stores smaller half
    hi = []  # min-heap, stores larger half
    delayed = defaultdict(int)
    lo_size = 0  # actual count of valid elements in lo
    hi_size = 0  # actual count of valid elements in hi
    
    target_lo = (k + 1) // 2
    target_hi = k // 2
    
    def prune_top(heap, is_max_heap):
        while heap:
            top = -heap[0] if is_max_heap else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                if is_max_heap:
                    heapq.heappop(heap)
                else:
                    heapq.heappop(heap)
            else:
                break
    
    def make_balance():
        # Prune tops
        prune_top(lo, True)
        prune_top(hi, False)
        
        # Rebalance
        if lo_size > target_lo:
            # Move one from lo to hi
            x = -heapq.heappop(lo)
            # Prune the new top of lo
            prune_top(lo, True)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
        elif hi_size > target_hi:
            x = heapq.heappop(hi)
            prune_top(hi, False)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
        elif lo_size < target_lo and hi_size > 0:
            x = heapq.heappop(hi)
            prune_top(hi, False)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
        elif hi_size < target_hi and lo_size > 0:
            x = -heapq.heappop(lo)
            prune_top(lo, True)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
        
        # Wait, this might need to be done multiple times. Let me use a loop.
    
    # Hmm, this is getting complex. Let me use a cleaner version.
```

Actually, let me look at this more carefully. The standard implementation uses a loop for balancing:

```python
def make_balance():
    while lo_size > target_lo:
        x = -heapq.heappop(lo)
        prune_top(lo, True)
        lo_size -= 1
        hi_size += 1
        heapq.heappush(hi, x)
    while hi_size > target_hi:
        x = heapq.heappop(hi)
        prune_top(hi, False)
        hi_size -= 1
        lo_size += 1
        heapq.heappush(lo, -x)
```

Wait, but after pruning the top, the element we popped might have been a delayed one. Let me think again...

Actually the prune should happen BEFORE we pop. Let me restructure:

```python
def prune_top(heap, is_max):
    while heap:
        top = -heap[0] if is_max else heap[0]
        if top in delayed and delayed[top] > 0:
            heapq.heappop(heap)
            delayed[top] -= 1
            if delayed[top] == 0:
                del delayed[top]
        else:
            break

def make_balance():
    while lo_size > target_lo or hi_size > target_hi:
        if lo_size > target_lo:
            prune_top(lo, True)
            x = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
        else:
            prune_top(hi, False)
            x = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
```

Hmm, but this still might not handle all cases. Let me think about what happens:

1. Initial fill: add k elements to heaps, maintain balance.
2. Slide: remove old element (mark delayed, decrement size), add new element, make_balance.

Actually wait - when we mark an element as delayed, we need to know which heap it's in. But we don't track that. The standard trick is:

- When adding element x, compare with top of lo. If x <= top of lo, add to lo. Else add to hi.
- When removing element x (old element leaving window), we just mark `delayed[x] += 1`. We also need to decrement the size of whichever heap it was in.

To know which heap an element is in, we compare: if x <= top of lo, it was in lo, so decrement lo_size. Else decrement hi_size.

But wait, the top of lo might change between when we added and when we remove. The standard approach handles this:

Actually, in the LeetCode solution for this problem, the approach is:
- When inserting: compare to top of lo. Insert into lo if <= lo_top, else into hi. Increment lo_size or hi_size.
- When removing (marking as delayed): compare to top of lo. If <= lo_top, it's in lo, decrement lo_size. Else decrement hi_size. Then `delayed[num] += 1`.

This works because: after rebalancing, all elements in lo are <= all elements in hi. And the top of lo is the largest in lo. So any element <= lo_top must be in lo (or could be in hi if it equals lo_top but... actually if x == lo_top, it could be in either. Hmm.

Actually, the invariant is: lo contains elements <= some threshold, hi contains elements >= some threshold, and lo_top <= hi_top. When we compare `x <= -lo[0]`, if x is in hi and equals lo_top, we'd incorrectly decrement lo_size. But actually, if x == lo_top and x is in hi, that means x appears in both heaps (duplicates). The delayed counter handles this - we just need to make sure sizes are consistent.

Wait, I think the standard approach actually works correctly because:
- If x <= lo_top, we assume it's in lo. If it's actually in hi (only possible if x == lo_top and there are duplicates), then lo_size gets decremented instead of hi_size. But since we're just marking it for deletion and adjusting sizes, and later when the element surfaces at a top it gets pruned, the accounting works out. The key insight is that as long as we decrement the correct size, the rebalancing will be correct. And if we decrement the wrong one... hmm.

Actually I think there's a subtlety. Let me look at this differently.

For duplicates: if x == lo_top and x exists in both heaps, then when we remove one copy of x, we don't know which copy we're removing. But it doesn't matter! Because we're removing one copy of x from the window. We mark `delayed[x] += 1`. For size tracking, we decrement one of the sizes. If we decrement lo_size but the removed x was actually in hi, then lo_size is too low and hi_size is too high. But the next rebalance will fix this by moving an element from hi to lo. And the delayed count ensures the actual physical element gets removed from the correct heap's top when it surfaces.

Wait, but the delayed count is per value, not per heap. So if x appears in both heaps, and we mark `delayed[x] += 1`, when we prune, we'll remove one copy from whichever heap's top has x. If it happens to be from the wrong heap, the size tracking is off.

Hmm, actually I think the standard approach handles this correctly. Let me just go with the standard approach:

When removing x:
- if x <= -lo[0]: lo_size -= 1
- else: hi_size -= 1
- delayed[x] += 1

This works because of the invariant: after balance, lo contains the target_lo smallest elements and hi contains the rest. So if x <= lo_top, x must be in lo (among the smallest target_lo). If x > lo_top, x must be in hi.

Wait, that's not quite right either. If x == lo_top and there are multiple copies of lo_top, some might be in hi. But actually, if we maintain the invariant that all elements in lo <= all elements in hi, and lo_top is the max of lo, then any element <= lo_top could be in lo. An element in hi is >= hi_top >= lo_top. So if x == lo_top == hi_top, x could be in either. But we say "if x <= lo_top, it's in lo." This means for x == lo_top, we always decrement lo_size. If x is actually in hi, then lo_size is now one too small and hi_size is one too large. The rebalance step will move one element from hi to lo, correcting this. And the delayed[x] = 1 means when we next prune, one copy of x will be removed from a heap top. If the top of lo has x, it gets pruned (correct, because we decremented lo_size). If the top of hi has x, it gets pruned (but we decremented lo_size, so now lo_size is off by one... hmm).

OK I think I'm overcomplicating this. The standard LeetCode solution works correctly. Let me just implement it carefully.

Actually, I realize there might be a simpler and correct approach: since we need efficiency and n=200k, k=1000, even a sorted list with bisect would be O(n*k) = 200M operations which might be too slow in Python. The two-heap approach is O(n log k) which is about 200k * 10 = 2M operations, much better.

Let me go with the two-heap lazy deletion approach. Here's my implementation:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap (negated), smaller half
    hi = []  # min-heap, larger half
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    target_lo = (k + 1) // 2  # ceil(k/2)
    target_hi = k // 2
    
    def prune_top(heap, is_max):
        while heap:
            top = -heap[0] if is_max else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def add(num):
        nonlocal lo_size, hi_size
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
            lo_size += 1
        else:
            heapq.heappush(hi, num)
            hi_size += 1
        make_balance()
    
    def remove(num):
        nonlocal lo_size, hi_size
        if num <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[num] += 1
        make_balance()
    
    def make_balance():
        # Prune and rebalance
        if lo_size > target_lo:
            prune_top(lo, True)
            x = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
            prune_top(lo, True)
        elif hi_size > target_hi:
            prune_top(hi, False)
            x = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
            prune_top(hi, False)
        elif lo_size < target_lo and hi_size > 0:
            prune_top(hi, False)
            x = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
            prune_top(hi, False)
        elif hi_size < target_hi and lo_size > 0:
            prune_top(lo, True)
            x = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
            prune_top(lo, True)
    
    def get_median():
        prune_top(lo, True)
        prune_top(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = []
    
    for i in range(n):
        add(nums[i])
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            result.append(get_median())
    
    return result
```

Wait, there's an issue. When I do `make_balance`, I only move one element at a time. But what if multiple elements need to be moved? Let me use while loops instead.

Actually, let me trace through: we add one element (size goes up by 1) and remove one element (size goes down by 1). So after both operations, total size is still k. The imbalance is at most 1 in each direction. So moving one element at a time should suffice... but actually, what if we add to lo (lo_size +1) and remove from hi (hi_size -1)? Then lo_size could be target_lo + 1 and hi_size could be target_hi - 1. We need to move one from lo to hi. That's fine.

What if we add to lo (lo_size +1) and the element that should be removed (which we haven't removed yet because we add first, then remove)? Wait, in my code I add first, then remove. So after add: lo_size + 1 or hi_size + 1. Then make_balance. Then remove: lo_size -1 or hi_size -1. Then make_balance again.

After add + make_balance: sizes are at most target+1 in one heap. After remove: one heap goes down by 1. Then make_balance fixes it.

Actually, let me reconsider the order. The issue is:
- After adding element i: window is nums[max(0,i-k+1)..i]. Size is min(i+1, k).
- We want to remove element i-k when i >= k.

But if I add first then remove, after add the size is k+1 (for i >= k). Then after remove, size is k. The make_balance after add needs to handle size k+1, and after remove handles size k.

Hmm, let me restructure: first remove (if needed), then add.

```python
for i in range(n):
    if i >= k:
        remove(nums[i - k])
    add(nums[i])
    if i >= k - 1:
        result.append(get_median())
```

After remove: size is k-1. After add: size is k. make_balance in both cases handles sizes k-1 and k.

Wait, target_lo and target_hi are for size k. When size is k-1, the targets should be different. This complicates things.

Let me go back to: add first, then remove.

```python
for i in range(n):
    add(nums[i])  # size becomes min(i+1, k) or k+1 if i >= k
    if i >= k:
        remove(nums[i-k])  # size back to k
    if i >= k-1:
        result.append(get_median())  # size is k
```

For make_balance after add: if size < k (i < k-1), we need different targets. Hmm.

Actually, let me just make make_balance use the current total size to determine targets:

```python
def make_balance():
    total = lo_size + hi_size
    t_lo = (total + 1) // 2
    t_hi = total // 2
    
    while lo_size > t_lo:
        prune_top(lo, True)
        x = -heapq.heappop(lo)
        lo_size -= 1
        hi_size += 1
        heapq.heappush(hi, x)
        prune_top(lo, True)
    
    while hi_size > t_hi:
        prune_top(hi, False)
        x = heapq.heappop(hi)
        hi_size -= 1
        lo_size += 1
        heapq.heappush(lo, -x)
        prune_top(hi, False)
```

This way, make_balance always adjusts to the correct sizes for the current total. This handles both the initial fill (size < k) and the steady state (size = k).

Let me also handle edge cases:
- Empty heaps: when lo is empty, `-lo[0]` would fail. Need to check.
- In `remove`, if lo is empty, what do we compare to? If lo is empty, all elements are in hi, so num must be > lo_top... but lo is empty. Handle this case.

Let me also think about the `remove` function: if the element to remove is currently delayed (already marked), do we double-mark? No, because each window position is unique - we remove each element exactly once.

But wait, with duplicates: if nums = [1, 1, 1, 1] and k = 2, when we remove the first 1, delayed[1] = 1. When we remove the second 1, delayed[1] = 2. That's fine.

Let me also think about `remove` when lo is empty:
```python
def remove(num):
    nonlocal lo_size, hi_size
    if lo and num <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    delayed[num] += 1
    make_balance()
```

If lo is empty, we go to else, decrement hi_size. That's correct because all elements are in hi.

What about `add` when both heaps are empty? `not lo` is True, so we push to lo. Good.

Let me also think about the case where after pruning the top of lo in `remove`, lo becomes empty. Then the comparison `num <= -lo[0]` would fail. But we check `if lo` first.

Actually wait, there's a subtle issue. In `remove`, we compare `num` to `-lo[0]` to decide which heap to decrement. But `-lo[0]` might be a delayed element. Should we prune first? 

In the standard solution, I believe the comparison is done with the current top (which might be delayed). But this is OK because:
- If `-lo[0]` is delayed, the actual max of valid elements in lo is smaller (or lo is empty after pruning).
- If num <= delayed_lo_top, num might actually be in hi (if the valid elements in lo are all smaller than num, but the delayed top is large).

Hmm, this could be a problem. Let me think...

Actually no. The invariant is that ALL elements in lo are <= ALL elements in hi (among valid elements). The top of lo (after pruning delayed) is the max valid element in lo. But if we don't prune first, `-lo[0]` could be a delayed element that's larger than hi_top. In that case, num <= -lo[0] might be true even though num should be in hi.

To handle this correctly, we should prune the tops before the comparison. But pruning changes the heap sizes... no, pruning doesn't change lo_size or hi_size, it just removes physically delayed elements from the top.

Wait, pruning DOES affect the physical size of the heap, but not the logical size (lo_size, hi_size). The logical sizes track valid elements. The physical heap might have extra delayed elements.

So in `remove`:
```python
def remove(num):
    nonlocal lo_size, hi_size
    prune_top(lo, True)
    if lo and num <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    delayed[num] += 1
    make_balance()
```

By pruning first, we ensure lo[0] is a valid element (or lo is empty). Then the comparison is correct.

Similarly in `add`:
```python
def add(num):
    nonlocal lo_size, hi_size
    prune_top(lo, True)
    if not lo or num <= -lo[0]:
        heapq.heappush(lo, -num)
        lo_size += 1
    else:
        heapq.heappush(hi, num)
        hi_size += 1
    make_balance()
```

Actually, I think in practice, for the LeetCode problem, not pruning in add/remove works because the comparison direction is "safe" enough. But to be correct, let me prune first.

Hmm, actually there's another issue. If we prune lo in `remove`, and lo becomes empty, then we decrement hi_size. But what if num was actually in lo (a valid element that's not at the top)? After pruning the top delayed element, the new top might be smaller than num. But num was a valid element in lo... 

Wait, if num is in lo and lo is sorted (max-heap), then num <= lo_max = -lo[0] (after pruning). So if num <= -lo[0], we correctly say it's in lo. If num > -lo[0], it must be in hi (since all lo elements are <= -lo[0]). This is correct as long as the invariant "all valid lo elements <= all valid hi elements" holds, which is maintained by make_balance.

OK so pruning before comparison is correct and necessary. Let me finalize:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    n = len(nums)
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def prune_top(heap, is_max):
        while heap:
            top = -heap[0] if is_max else heap[0]
            if top in delayed and delayed[top] > 0:
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def make_balance():
        nonlocal lo_size, hi_size
        total = lo_size + hi_size
        t_lo = (total + 1) // 2
        t_hi = total // 2
        while lo_size > t_lo:
            prune_top(lo, True)
            x = -heapq.heappop(lo)
            lo_size -= 1
            hi_size += 1
            heapq.heappush(hi, x)
            prune_top(lo, True)
        while hi_size > t_hi:
            prune_top(hi, False)
            x = heapq.heappop(hi)
            hi_size -= 1
            lo_size += 1
            heapq.heappush(lo, -x)
            prune_top(hi, False)
    
    def add(num):
        nonlocal lo_size, hi_size
        prune_top(lo, True)
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
            lo_size += 1
        else:
            heapq.heappush(hi, num)
            hi_size += 1
        make_balance()
    
    def remove(num):
        nonlocal lo_size, hi_size
        prune_top(lo, True)
        if lo and num <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        delayed[num] += 1
        make_balance()
    
    def get_median():
        prune_top(lo, True)
        prune_top(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = []
    for i in range(n):
        add(nums[i])
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            result.append(get_median())
    
    return result
```

Let me trace through a small example: nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

- i=0: add(1). lo=[-1], hi=[], lo_size=1, hi_size=0. Balance: total=1, t_lo=1, t_hi=0. OK.
- i=1: add(3). prune lo: top=1, no delay. 3 > 1, push to hi. lo=[-1], hi=[3], lo_size=1, hi_size=1. Balance: total=2, t_lo=1, t_hi=1. OK.
- i=2: add(-1). prune lo: top=1. -1 <= 1, push to lo. lo=[-1,-1] (wait, negated: [-1, 1]... no. heapq on lo: push -1, then push -(-1)=1. So lo = [-1, 1]. That's wrong for a max-heap. 

Oh wait, lo is a MIN-heap on negated values, which acts as a max-heap. So lo[0] is the most negative = the largest original value. Push -num: if num=1, push -1. If num=-1, push 1. heapq gives min at top, so -1 < 1, lo[0] = -1, -lo[0] = 1. That's the max of {1, -1} = 1. Correct!

- i=2: add(-1). -1 <= 1, push -(−1) = 1 to lo. lo = [-1, 1], lo_size=2. Balance: total=2, t_lo=1, t_hi=1. lo_size(2) > t_lo(1), so pop from lo: -heapq.heappop(lo) = -(-1) = 1. lo_size=1, hi_size=2. Push 1 to hi. hi=[1,3]. lo=[1] (which is -(-1), so max is 1). Wait, lo after popping: lo was [-1, 1], heappop gives -1, so lo = [1]. -lo[0] = -1. Hmm that's wrong!

Oh I see the issue. lo contains [-1, 1] as the internal heap. heapq.heappop pops the minimum, which is -1. So -heapq.heappop(lo) = -(-1) = 1. After popping, lo = [1]. -lo[0] = -1. So the max-heap says the max is -1. But we had {1, -1} and the max should be 1. The issue is that we popped 1 (the max) from the max-heap and moved it to hi. So now lo has just {-1}, and hi has {1, 3}. That's correct! The smallest half is {-1} and the largest half is {1, 3}. 

- i=2, get_median: k=3, odd. Return -lo[0] = -(-1) = ... wait. lo = [1] (internal). -lo[0] = -1. Hmm.

Wait I'm confusing myself. Let me redo.

lo is a list used as a heap. We push -num into it. To get the max of original values, we look at -lo[0].

After i=0: push -1. lo = [-1]. -lo[0] = 1. Correct, max is 1.
After i=1: 3 > 1, push to hi. lo = [-1], hi = [3].
After i=2: push -(-1) = 1 to lo. lo = [-1, 1] (as a heap, -1 < 1 so -1 is root). -lo[0] = 1. 

Now balance: lo_size=2, hi_size=1, total=3, t_lo=2, t_hi=1. lo_size == t_lo, OK! No rebalance needed.

get_median: k=3 odd, return -lo[0] = -(-1) = 1. But the median of [1,3,-1] sorted is [-1,1,3], median is 1. Correct!

- i=3: add(-3). prune lo: lo=[-1,1], top=-lo[0]=1, no delay. -3 <= 1, push -(-3)=3 to lo. lo=[-1,1,3]. lo_size=3. Balance: total=4, t_lo=2, t_hi=2. lo_size(3)>t_lo(2). Prune lo (nothing). Pop: -heappop(lo) = -(-1) = 1. lo becomes [1,3] (heapified: 1 is root). lo_size=2, hi_size=2. Push 1 to hi. hi=[1,3]. 

After balance: lo=[1,3] (internal), -lo[0] = -1. hi=[1,3]. 

Now remove(nums[0]) = remove(1). prune lo: -lo[0] = -1. 1 > -1. So hi_size -= 1 → hi_size=1. delayed[1] += 1. make_balance: total=3, t_lo=2, t_hi=1. lo_size=2, hi_size=1. OK!

get_median: k=3, odd. prune lo: lo[0]=1, top=-lo[0]=-1. Is -1 in delayed? No. prune hi: hi[0]=1. Is 1 in delayed? Yes! Pop it. delayed[1]=0, del. hi=[3]. Return -lo[0] = -1. Median of [3,-1,-3] sorted: [-3,-1,3], median = -1. Correct!

- i=4: add(5). prune lo: top=-lo[0]=-1. 5 > -1, push to hi. hi=[3,5]. hi_size=2. Balance: total=4, t_lo=2, t_hi=2. OK.

remove(nums[1]) = remove(3). prune lo: top=-lo[0]=-1. 3 > -1. hi_size -= 1 → hi_size=1. delayed[3] += 1. Balance: total=3, t_lo=2, t_hi=1. lo_size=2, hi_size=1. OK.

get_median: prune lo: top=-lo[0]=-1, no delay. prune hi: hi[0]=3, delayed[3]=1>0. Pop. delayed[3]=0, del. hi=[5]. Return -lo[0]=-1. Median of [-1,-3,5] sorted: [-3,-1,5], median=-1. Correct!

- i=5: add(3). prune lo: top=-lo[0]=-1. 3 > -1, push to hi. hi=[3,5]. hi_size=2. Balance: total=4, t_lo=2, t_hi=2. OK.

remove(nums[2]) = remove(-1). prune lo: lo=[1,3], -lo[0]=-1. -1 <= -1, lo_size -= 1 → lo_size=1. delayed[-1] += 1. Balance: total=3, t_lo=2, t_hi=1. lo_size=1 < t_lo=2. Need to move from hi to lo. prune hi: hi[0]=3, no delay. Pop 3. hi_size=0, lo_size=2. Push -3 to lo. lo=[-3,1,3] (wait, lo was [1,3] and we push -3... lo=[1,3,-3], heapified: -3 is root). -lo[0]=3. lo_size=2. hi_size=0. Balance: total=2... wait that's wrong.

Oh wait. Let me recount. After remove(-1): lo_size was 2, now 1. hi_size was 2, still 2. Total = 3. t_lo = 2, t_hi = 1. lo_size(1) < t_lo(2), so move from hi to lo. hi_size(2) > t_hi(1) too.

Actually in my make_balance, I first check `while lo_size > t_lo`, then `while hi_size > t_hi`. Since lo_size(1) is not > t_lo(2), we go to the second while: hi_size(2) > t_hi(1). Prune hi (nothing). Pop hi: 3. hi_size=1, lo_size=2. Push -3 to lo. lo was [1,3], now [1,3,-3], heapified as [-3, 1, 3]. Wait, heapq.heappush maintains heap property. Starting from [1, 3], push -3: [−3, 3, 1]. -lo[0] = 3.

Now lo_size=2, hi_size=1. Check first while: lo_size(2) > t_lo(2)? No. Check second while: hi_size(1) > t_hi(1)? No. Done.

But wait, the invariant: max(lo) = -lo[0] = 3. min(hi) = hi[0] = 5. 3 <= 5. OK!

Now we need to prune lo: lo[0] = -3, top = -lo[0] = 3. Is 3 in delayed? No. OK.

get_median: k=3 odd. -lo[0] = 3. But the window is [-3, 5, 3] sorted: [-3, 3, 5]. Median = 3. Correct!

- i=6: add(6). prune lo: -lo[0] = 3. 6 > 3, push to hi. hi=[5,6]. hi_size=2. Balance: total=4, t_lo=2, t_hi=2. OK.

remove(nums[3]) = remove(-3). prune lo: lo=[-3,3,1], -lo[0]=3. -3 <= 3, lo_size -= 1 → lo_size=1. delayed[-3] += 1. Balance: total=3, t_lo=2, t_hi=1. lo_size(1)<t_lo(2) and hi_size(2)>t_hi(1). Second while: prune hi (nothing), pop 5. hi_size=1, lo_size=2. Push -5 to lo. lo was [-3,3,1] (with -3 valid? No! delayed[-3]=1). 

Hmm wait. lo is [−3, 3, 1] internally. We pushed -5. Now lo = [−5, 3, 1, −3]. Wait, that's not right. Let me be more careful.

Actually, lo before this step was [-3, 3, 1] (from previous step). We're now pushing -6? No, we pushed -5 (for num=5, we push -5). Wait no: we pop 5 from hi and push -5 to lo. So heapq.heappush(lo, -5). lo was [-3, 3, 1]. After push: [-5, 3, 1, -3] heapified: [-5, 3, 1, -3] → actually [-5, -3, 1, 3]? No. heapq: [−3, 3, 1] → push −5: [−5, 3, 1, −3]? Let me just trust heapq to maintain the min-heap property. The root will be the minimum, which is -5. -lo[0] = 5.

But wait, -3 is in delayed. When we prune lo: top = -lo[0] = 5. 5 is not in delayed. So we don't prune. But -3 is somewhere inside the heap, marked as delayed. That's fine - it'll be pruned when it reaches the top.

After balance: lo_size=2, hi_size=1. lo=[-5,...], hi=[6]. Invariant: -lo[0]=5 <= hi[0]=6. OK!

get_median: prune lo: -lo[0]=5, not delayed. prune hi: hi[0]=6, not delayed. Return -lo[0] = 5. Window is [5, 3, 6] sorted: [3, 5, 6]. Median = 5. Correct!

- i=7: add(7). 7 > 5, push to hi. hi=[6,7]. hi_size=2. Balance: total=4, t_lo=2, t_hi=2. OK.

remove(nums[4]) = remove(5). prune lo: -lo[0]=5. 5 <= 5, lo_size -= 1 → lo_size=1. delayed[5] += 1. Balance: total=3, t_lo=2, t_hi=1. hi_size(2) > t_hi(1). Pop hi: 6. hi_size=1, lo_size=2. Push -6 to lo. lo was [-5,...], push -6. lo root: -6. -lo[0] = 6. 

But wait, is -5 in delayed? No, we marked 5 (not -5) in delayed. The internal lo uses negated values. The original value 5 was pushed as -5 into lo. When we mark delayed[5] += 1, and then prune, we look at top = -lo[0]. If lo[0] = -5, top = 5. delayed[5] > 0, so we pop it. Good.

But currently lo[0] = -6 (original 6). -lo[0] = 6. 6 is not in delayed. We don't prune. -3 and -5 are still in the heap (originals 3 and 5, with 5 delayed). They'll be pruned when they bubble up.

Hmm wait, original -3 was pushed as -(-3) = 3 into lo. And original 5 was pushed as -5 into lo. These are internal values. When we check if a top is delayed, we compute `top = -heap[0]` for lo (giving original value) and check `delayed[top]`. So if heap[0] = -5, top = 5, check delayed[5]. Correct.

OK I think the implementation is correct. Let me also handle the edge case where in `get_median` for even k, after pruning, hi might be empty? That shouldn't happen if the invariant is maintained. If k is even, t_lo = t_hi = k/2. So hi_size = k/2 >= 1 (since k >= 2 for even k).

Wait, k=2: t_lo=1, t_hi=1. lo_size=1, hi_size=1. Both non-empty. Good.

Let me also handle: what if nums is empty and k=0? k < 1 raises ValueError. Good.

What about the case where `make_balance` is called and total = 0? t_lo = 0, t_hi = 0. No work needed. Good.

I think this implementation is correct. Let me also add a small optimization: when `delayed` has many entries, the `in` check on defaultdict should still be O(1) amortized.

One more thing: the problem says "Return floats." So I should make sure all returned values are floats. Using `float(x)` or `/ 2.0` should handle this.

Let me finalize the code.
