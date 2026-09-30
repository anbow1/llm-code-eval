The user wants a `sliding_median` function that efficiently computes the median of every sliding window of size k.

For n = 200,000 and k = 1,000, we need something efficient. A naive approach would be O(n * k log k) which might be too slow. A better approach is O(n log k) using two heaps or a sorted container.

Since we can only use the standard library, we can't use `sortedcontainers`. Let me think about approaches:

1. **Two heaps approach**: Use a max-heap for the lower half and a min-heap for the upper half. This is the classic "median from data stream" approach, but we need to handle removals. We can use lazy deletion.

2. **Using `heapq` with lazy deletion**: Maintain two heaps (max-heap for lower half, min-heap for upper half) with lazy deletion. When we need to remove an element from the outgoing window, we mark it as deleted. When we need the median, we clean up the tops of the heaps first.

Let me think about the two-heap approach with lazy deletion:

- `lo`: max-heap (negated values) for the lower half
- `hi`: min-heap for the upper half
- `delayed`: dictionary tracking elements that have been marked for deletion
- `lo_size`, `hi_size`: effective sizes (not counting deleted elements)

Operations:
- `make_balance()`: ensure `lo_size == hi_size` or `lo_size == hi_size + 1` (for odd k) or `lo_size == hi_size` (for even k)
- `prune(heap)`: remove elements at the top of a heap that are marked as deleted
- `add(num)`: insert into the appropriate heap and rebalance
- `remove(num)`: mark num as deleted and adjust sizes

Let me implement this carefully.

Actually, let me think more carefully. For the sliding window:
- We add the new element and remove the old element for each step.
- We need the median after each operation.

The two-heap with lazy deletion approach:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    n = len(nums)
    
    lo = []  # max-heap (store negated) - lower half
    hi = []  # min-heap - upper half
    delayed = Counter()  # elements marked for deletion
    
    # Effective sizes
    lo_size = 0
    hi_size = 0
    
    def prune(heap):
        while heap and heap[0] in delayed:  # but this doesn't work for negated...
            ...
    
    ...
```

Hmm, the lazy deletion with two heaps is a bit tricky. Let me think through it more carefully.

For the max-heap (lo), we store negated values. For the min-heap (hi), we store actual values. When we want to "delete" an element, we increment `delayed[element]`. We also decrement the size counter of whichever heap it belongs to.

The `prune` function removes elements from the top of a heap that have been marked as deleted.

For `lo`, the top is `-lo[0]` (negate to get actual value). If `delayed[-lo[0]] > 0`, pop it and decrement `delayed`.

For `hi`, the top is `hi[0]`. If `delayed[hi[0]] > 0`, pop it and decrement `delayed`.

Let me write this more carefully:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("invalid k")
    
    n = len(nums)
    lo = []  # max-heap (negated) for lower half
    hi = []  # min-heap for upper half
    delayed = Counter()
    lo_size = 0
    hi_size = 0
    
    def prune(heap, is_lo):
        # Remove elements from top that are marked as deleted
        while heap:
            top = -heap[0] if is_lo else heap[0]
            if delayed[top] > 0:
                heapq.heappop(heap)
                delayed[top] -= 1
                if delayed[top] == 0:
                    del delayed[top]
            else:
                break
    
    def make_balance():
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            # Move top of lo to hi
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
            prune(lo, True)
        elif lo_size < hi_size:
            # Move top of hi to lo
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
            prune(hi, False)
    
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
        # If this element is at the top of a heap, prune
        if lo and num == -lo[0]:
            prune(lo, True)
        if hi and num == hi[0]:
            prune(hi, False)
        make_balance()
    
    def get_median():
        # Ensure tops are valid (prune)
        prune(lo, True)
        prune(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    # Initialize first window
    for i in range(k):
        add(nums[i])
    
    result = [get_median()]
    
    # Slide
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, there's a subtle issue. When we do `remove(num)`, we need to determine which heap `num` belongs to. We check `num <= -lo[0]`. But after pruning, `lo[0]` might be invalid. Also, if `lo` is empty (shouldn't happen since k >= 1), this could fail.

Actually, the check `num <= -lo[0]` should work because:
- After `add` and `make_balance`, the invariant is that all elements in `lo` are <= all elements in `hi`.
- So if `num <= -lo[0]`, it was in `lo`; otherwise it was in `hi`.

But wait, there could be duplicates. If `num` equals `-lo[0]` and there are duplicates, it could be in either heap. But for the purpose of size tracking, as long as we decrement the correct size, it should work. Actually, this is a known subtlety - we just need to make sure the size counters stay correct. Since the median invariant is maintained, if num == -lo[0], it could be in either heap, but decrementing lo_size is the safe choice (it's "in" lo in the sense that it's <= lo's max).

Hmm, actually this is a well-known issue. Let me look at how LeetCode 480 solutions handle this. The standard approach is:

```
if num <= -lo[0]:  # num is in lo (or equal to boundary)
    lo_size -= 1
else:
    hi_size -= 1
```

This works because the invariant guarantees that any element <= max(lo) is in lo, and any element > max(lo) is in hi. Duplicates at the boundary are "assigned" to lo.

But wait, what if lo is empty? That can't happen if k >= 1. After the first window is built, lo has at least ceil(k/2) elements.

Actually, there's another edge case: when we remove, `lo` might become empty after pruning if all elements in lo were marked as deleted. But `make_balance()` should handle moving elements from hi to lo.

Let me also think about the `prune` function more carefully. When `is_lo` is True, `heap` stores negated values. So the actual value is `-heap[0]`. We check `delayed[-heap[0]]`.

Let me also think about potential issues with the `remove` function. If we remove an element that's not at the top of either heap, we just mark it as deleted. The `prune` will clean it up when it reaches the top. This is fine.

One more issue: in `remove`, after marking as deleted and adjusting sizes, we call `make_balance()`. But `make_balance` might need to pop from a heap. If the top of that heap is a deleted element, we'd get a wrong value. So we should prune before making balance.

Actually, looking at standard solutions, the pattern is:
- In `remove`, after marking delayed and adjusting size, check if the removed element is at the top of either heap. If so, prune that heap. Then make balance.
- In `get_median`, prune both heaps first.

Actually, `make_balance` pops from a heap. If the top of that heap is a deleted element, we'd move a "ghost" element. This would mess things up. So we need to prune before `make_balance`.

Let me revise: in `make_balance`, before popping, prune the heap.

Actually, a cleaner approach: let's prune at the beginning of `make_balance` and `get_median`.

Hmm, let me just look at the standard solution pattern more carefully.

The standard LeetCode 480 solution pattern:

```
def prune(heap, is_lo):
    while heap:
        x = -heap[0] if is_lo else heap[0]
        if x in delayed:
            heapq.heappop(heap)
            delayed[x] -= 1
            if delayed[x] == 0:
                del delayed[x]
        else:
            break

def make_balance():
    if lo_size > hi_size + 1:
        move top of lo to hi
    elif lo_size < hi_size:
        move top of hi to lo

def add(num):
    # standard add
    make_balance()

def remove(num):
    # mark delayed, adjust size
    # if num is at top of lo or hi, prune
    # make_balance()

def get_median():
    # prune both
    # return median
```

The key insight is: in `make_balance`, when we pop from a heap, we should ensure the top is valid. But the standard approach handles this by pruning the heap being popped from before the pop in make_balance.

Wait no, actually the standard approach prunes in `remove` (only if the removed element is at the top) and in `get_median`. `make_balance` doesn't prune because the heaps should have valid tops after the remove/add operations.

Hmm, but that's not quite right. Consider: we remove an element from lo that's NOT at the top. Now lo has a "dead" element somewhere in the middle. Then make_balance might need to pop from lo. But the top of lo is still valid (the dead element is in the middle). So make_balance is fine.

But what if the dead element IS at the top? Then we prune it in remove. Good.

What about after add? add pushes to a heap and then calls make_balance. The pushed element is valid (not deleted). The existing elements in the heaps are either valid or marked as deleted but not at the top (since we prune at the top in remove and get_median). Wait, we don't always prune at the top in remove - only if the removed element equals the top.

Hmm, let me think of a scenario:
- lo = [5, 3, 2, 1] (as negated: [-5, -3, -2, -1]), but 2 is marked as deleted.
- We add a new element, call make_balance which needs to pop from lo.
- The top of lo is -5 (actual value 5), which is NOT deleted. So we pop 5. Fine.
- The dead 2 is still in the heap but it's not at the top. That's OK, it'll be pruned later when it reaches the top.

OK so the invariant is: we only prune at the top. The dead elements that aren't at the top don't cause problems because they'll never be accessed until they reach the top (via heappop), and when they do reach the top, they'll be pruned.

But wait, in make_balance, we do `heapq.heappop(lo)`. What if the top of lo is a deleted element? This shouldn't happen because:
1. In `remove`, if the removed element is at the top, we prune.
2. In `get_median`, we prune before reading.
3. Between operations, we only add (which pushes valid elements) and remove (which prunes if at top).

So the top of a heap should never be a deleted element when we try to pop it. Good.

Actually wait, there's a subtlety. In `remove`:
```
if num <= -lo[0]:
    lo_size -= 1
else:
    hi_size -= 1
delayed[num] += 1
if lo and num == -lo[0]:
    prune(lo, True)
if hi and num == hi[0]:
    prune(hi, False)
make_balance()
```

What if `num == -lo[0]` and we remove it, but after pruning, the new top of lo is also deleted? `prune` handles this - it keeps pruning while the top is deleted.

What if `num == -lo[0]` but also `num == hi[0]`? We prune both. Fine.

What about: we remove a number that's in lo but not at the top. We mark it as deleted. Then make_balance needs to pop from lo (because lo_size > hi_size + 1). The top of lo is valid (not the deleted one). We pop it, move to hi. The deleted one is still in lo but not at the top. Fine.

I think this approach is correct. Let me also handle the edge case where k == 1. In that case, lo has 1 element, hi is empty. median = that element. No issues.

Let me also think about potential issues with floating point. The comparison `num <= -lo[0]` should work fine for floats since we're just comparing values.

One more thing: the `remove` function checks `if lo and num == -lo[0]`. But what if `lo` has been fully pruned (all elements deleted)? Then `lo` could be empty. But since `lo_size` is at least `hi_size` (or `hi_size + 1`), and we just decremented `lo_size`, it could be that `lo_size` is now less than `hi_size`. Then `make_balance` would move from hi to lo. But before that, we check `if lo and ...`. If lo is empty, we skip the prune of lo, which is fine. Then make_balance moves from hi to lo.

Hmm, but can `lo` be empty when `lo_size > 0`? No, because `lo_size` counts non-deleted elements. If `lo_size > 0`, there must be valid elements in lo. But they might not be at the top! Actually, the heap contains valid elements (lo_size of them) and deleted elements. The top might be a deleted element, but we would have pruned it in the remove call if the removed element was at the top.

Wait, I think there could be a scenario where:
1. lo has elements [5, 3, 2] with 5 at top.
2. We remove 3 (not at top). lo_size becomes 2. delayed[3] = 1.
3. We remove 5 (at top). lo_size becomes 1. delayed[5] = 1. We prune lo: pop 5, now top is 3 which is delayed, pop 3, now top is 2, not delayed. Prune stops.
4. Now lo = [-2], lo_size = 1. Correct!

OK that works. Let me also think about what happens with make_balance when we need to pop from a heap whose top might be stale. Actually I argued above that this shouldn't happen. Let me trace through more carefully.

After `remove`, if the removed element was at the top, we pruned. If it wasn't at the top, the top is still valid. After `add`, we push a valid element. So before `make_balance`, the tops of both heaps should be valid (not deleted). Good.

Let me write the final solution. I'll also add a small optimization: avoid `Counter` and use a regular dict for delayed.

Actually, let me also think about whether we need `nonlocal` in Python. Yes, since we're modifying `lo_size` and `hi_size` in nested functions.

Let me also consider: is there a simpler approach that's still fast enough? For n=200k and k=1000:
- Naive: O(n * k log k) = 200k * 1000 * 10 ≈ 2 * 10^9. Too slow.
- Sort each window: O(n * k log k) same. Too slow.
- Two heaps with lazy deletion: O(n log k) = 200k * 10 ≈ 2 * 10^6. Very fast.

The two-heap approach is definitely the way to go.

Let me finalize the code:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lo = []  # max-heap (negated) for lower half
    hi = []  # min-heap for upper half
    delayed = {}
    lo_size = 0
    hi_size = 0
    
    def prune(is_lo, heap):
        while heap:
            val = -heap[0] if is_lo else heap[0]
            cnt = delayed.get(val, 0)
            if cnt > 0:
                heapq.heappop(heap)
                if cnt == 1:
                    del delayed[val]
                else:
                    delayed[val] = cnt - 1
            else:
                break
    
    def make_balance():
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
            prune(True, lo)
        elif lo_size < hi_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
            prune(False, hi)
    
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
        delayed[num] = delayed.get(num, 0) + 1
        if lo and num == -lo[0]:
            prune(True, lo)
        if hi and num == hi[0]:
            prune(False, hi)
        make_balance()
    
    # Build first window
    for i in range(k):
        add(nums[i])
    
    # Get median
    prune(True, lo)
    prune(False, hi)
    
    if k % 2 == 1:
        result = [float(-lo[0])]
    else:
        result = [(-lo[0] + hi[0]) / 2.0]
    
    # Slide window
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        prune(True, lo)
        prune(False, hi)
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, I need to double-check the `prune` function signature. I wrote `prune(is_lo, heap)` but I'm calling it as `prune(True, lo)`. That's fine.

Let me trace through a simple example:
- nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3
- Windows: [1,3,-1], [3,-1,-3], [-1,-3,5], [-3,5,3], [5,3,6], [3,6,7]
- Medians: 1, -1, -1, 3, 5, 6

Let me trace the first window [1, 3, -1]:
- add(1): lo=[-1], hi=[], lo_size=1, hi_size=0. make_balance: lo_size=1, hi_size=0. lo_size <= hi_size+1 (1<=1). OK.
- add(3): 3 > -(-1)=1, so hi=[3], hi_size=1. make_balance: lo_size=1, hi_size=1. OK.
- add(-1): -1 <= 1, so lo=[-1, 1] (as [-(-1)=-1... wait no. lo stores negated. lo=[-1] represents actual value 1. Wait no!

Let me be more careful. `lo` is a max-heap implemented as min-heap of negated values.
- `heapq.heappush(lo, -num)` pushes `-num`.
- The top of lo is the most negative, which corresponds to the largest original value.
- `-lo[0]` gives the maximum of the lower half.

So:
- add(1): push -1 to lo. lo = [-1]. lo[0] = -1. -lo[0] = 1. Correct, max of lower half is 1.
- add(3): 3 > 1, push 3 to hi. hi = [3]. hi_size = 1. make_balance: lo_size=1, hi_size=1. k is odd (3), so we want lo_size = hi_size + 1? No, k=3, so median is at position 1 (0-indexed), which means lo should have 2 elements and hi should have 1. lo_size + hi_size = 3.

Wait, let me reconsider. For k=3, the median is the middle element. lo should have 2 elements (indices 0, 1) and hi should have 1 (index 2). So lo_size = 2, hi_size = 1. That means lo_size = hi_size + 1.

For k=4, lo_size = hi_size = 2.

So the invariant for make_balance should be:
- If k is odd: lo_size = hi_size + 1
- If k is even: lo_size = hi_size

But we don't know k inside the function... we do, it's a parameter. Let me adjust.

Actually, the standard approach always maintains lo_size >= hi_size and lo_size <= hi_size + 1. This works for both:
- k=3: lo_size=2, hi_size=1. median = -lo[0] (top of lo).
- k=4: lo_size=2, hi_size=2. median = (-lo[0] + hi[0]) / 2.

So `make_balance` ensures:
- lo_size >= hi_size (lo_size < hi_size → move from hi to lo)
- lo_size <= hi_size + 1 (lo_size > hi_size + 1 → move from lo to hi)

This is what I have. Good.

Continuing trace:
- add(3): 3 > 1, push to hi. lo=[-1], hi=[3]. lo_size=1, hi_size=1.
- add(-1): -1 <= 1, push -(-1)=1 to lo. lo=[-1, 1], lo_size=2. hi=[3], hi_size=1.
  make_balance: lo_size=2, hi_size=1. 2 <= 1+1=2. OK.

Median: -lo[0]. lo=[-1, 1], top is -1. -(-1) = 1. Correct!

Next window: remove(1), add(-3).
- remove(1): 1 <= -lo[0]=1, so lo_size becomes 1. delayed[1]=1. Check if 1 == -lo[0]=1. Yes! prune(True, lo): val = -lo[0] = 1. delayed[1] = 1 > 0. Pop lo. lo was [-1, 1], pop -1? Wait, heapq pops the smallest, which is -1. The actual value is -(-1) = 1. Yes! Pop -1. Now lo = [1] (which represents value -1). Check top: val = -lo[0] = -1. delayed.get(-1, 0) = 0. Stop. lo = [1], lo_size was 1 (we decremented). Wait, that's wrong.

Hmm, let me re-trace. After adding the first window:
- lo = [-1, 1] (as a heap, the min is -1, representing actual value 1 which is the max of lower half)
- hi = [3]
- lo_size = 2, hi_size = 1

remove(1): 1 <= -lo[0] = -(-1) = 1. Yes. lo_size becomes 1. delayed[1] = 1.
Check: lo and 1 == -lo[0] = 1. Yes! prune(True, lo):
  - heap[0] = -1. val = -(-1) = 1. delayed[1] = 1 > 0. Pop lo. lo was [-1, 1], after heappop: [1]. 
  - delayed[1] was 1, now 0, delete.
  - Check top: lo[0] = 1. val = -(1) = -1. delayed.get(-1, 0) = 0. Stop.
- lo = [1], representing actual value -1. lo_size = 1.
- hi = [3], hi_size = 1.
- make_balance: lo_size=1, hi_size=1. 1 >= 1, 1 <= 1+1. OK.

add(-3): -3 <= -lo[0] = -(1) = -1. Yes! Push -(-3)=3 to lo. lo = [1, 3]. lo_size=2.
make_balance: lo_size=2, hi_size=1. 2 <= 1+1. OK.

Median: -lo[0] = -1. The top of lo=[1, 3] is 1 (min-heap). -1. The window is [3, -1, -3], sorted: [-3, -1, 3]. Median = -1. Correct!

Next: remove(3), add(5).
- remove(3): -lo[0] = -(1) = -1. 3 > -1. So hi_size becomes 0. delayed[3] = 1.
  Check: hi and 3 == hi[0] = 3. Yes! prune(False, hi): val = hi[0] = 3. delayed[3]=1. Pop hi. hi=[]. Stop.
  make_balance: lo_size=2, hi_size=0. 2 > 0+1. Move top of lo to hi. val = -heappop(lo) = -1. lo=[3]. lo_size=1. Push 1 to hi. hi=[1]. hi_size=1. prune(True, lo): lo[0]=3, val=-3. delayed.get(-3,0)=0. Stop.

- add(5): 5 > -lo[0] = -3. Push to hi. hi=[1, 5]. hi_size=2.
  make_balance: lo_size=1, hi_size=2. 1 < 2. Move top of hi to lo. val=heappop(hi)=1. hi=[5]. hi_size=1. Push -1 to lo. lo=[-1, 3]. lo_size=2. prune(False, hi): hi[0]=5, delayed.get(5,0)=0. Stop.

Median: k=3, odd. -lo[0] = -(-1) = 1. Window is [-1, -3, 5], sorted: [-3, -1, 5]. Median = -1.

Hmm, that's wrong! Let me re-check.

After removing 3 from [3, -1, -3], the window becomes [-1, -3]. Then adding 5 gives [-1, -3, 5]. Sorted: [-3, -1, 5]. Median should be -1.

But I got 1. Let me re-trace more carefully.

After the second window computation, state is:
- lo = [1], representing actual value -1. (heap: [1], top=1, actual=-1)
- hi = [3], representing actual value 3.
- lo_size = 1, hi_size = 1.
- Wait, but we had lo_size=2 before remove. Let me redo.

After second window [3, -1, -3]:
- lo = [1, 3] (represents actual values -1, -3). Top is 1, actual value -1. Max of lower half.
- hi = [3] (represents actual value 3).
- lo_size = 2, hi_size = 1.

remove(3):
- -lo[0] = -1. Is 3 <= -1? No. So hi_size -= 1 → hi_size = 0.
- delayed[3] = 1.
- Check: hi and 3 == hi[0]=3. Yes. prune(False, hi): val=3, delayed=1, pop. hi=[]. delayed[3]=0, delete. Check: hi empty, stop.
- make_balance: lo_size=2, hi_size=0. 2 > 0+1. Move top of lo to hi.
  - val = -heappop(lo). lo was [1, 3], heappop gives 1. val = -1. lo=[3]. lo_size=1.
  - push(-val) wait no. We push val to hi. hi.push(-1). hi=[-1]. hi_size=1.
  
  Wait, I wrote `heapq.heappush(hi, val)` where val = -1. So hi = [-1]. hi_size = 1.
  
  prune(True, lo): lo=[3], lo[0]=3, val=-3. delayed.get(-3,0)=0. Stop.

State: lo=[3] (actual: -3), hi=[-1] (actual: -1). lo_size=1, hi_size=1.

add(5):
- -lo[0] = -3. Is 5 <= -3? No. Push to hi. hi = [-1, 5]. hi_size=2.
- make_balance: lo_size=1, hi_size=2. 1 < 2. Move top of hi to lo.
  - val = heappop(hi) = -1. hi=[5]. hi_size=1.
  - push(-val) = push(1) to lo. lo = [1, 3]. lo_size=2.
  - prune(False, hi): hi[0]=5, delayed.get(5,0)=0. Stop.

State: lo=[1, 3] (actuals: -1, -3), hi=[5]. lo_size=2, hi_size=1.

get_median: prune both (no-ops). k=3 odd. -lo[0] = -(1) = -1. Correct!

I made an arithmetic error before. Let me verify: lo = [1, 3] as a min-heap, the top (minimum) is 1. -lo[0] = -1. The actual max of the lower half is -1. Window is [-1, -3, 5]. Lower half should be [-3, -1], upper half [5]. Max of lower half is -1. Median = -1. Correct!

Great, the algorithm works. Let me finalize the code.

One more thing: in `add`, when `lo` is empty (which can only happen at the very start before any elements are added), we push to lo. The condition `not lo or num <= -lo[0]` handles this.

Also, in `remove`, we assume `lo` is not empty (since we check `if lo and num == -lo[0]`). And the initial `if num <= -lo[0]` - if lo is empty, this would crash. But can lo be empty when we call remove? Only if the window size is 0, but k >= 1. After building the first window, lo has at least 1 element (since lo_size >= 1 when k >= 1). During sliding, we always have k elements. After remove, lo_size + hi_size = k-1, and then add brings it back to k. Between remove and add, we could have lo_size = 0 temporarily if k=1. Let's check: k=1, lo_size=1, hi_size=0. remove: lo_size becomes 0. Then we check `if lo and ...`. lo has one element still (the actual one, but size is 0). Hmm, this is the problem.

For k=1:
- After building first window: lo = [-nums[0]], lo_size=1, hi=[].
- remove(nums[0]): lo_size becomes 0. delayed[nums[0]] = 1. Check: lo and nums[0] == -lo[0] = nums[0]. Yes! prune: pop lo, lo=[]. Stop.
- make_balance: lo_size=0, hi_size=0. OK.
- add(nums[1]): lo is empty, so push to lo. lo=[-nums[1]], lo_size=1. OK.

This works because we check `if lo` before accessing `lo[0]`.

But what about the initial check in remove: `if num <= -lo[0]`? At this point, lo has one element (we haven't popped it yet). So `lo[0]` is valid. Good.

Actually wait, after `lo_size -= 1`, we still have the element in the heap (it's just "logically" removed). We haven't popped it yet. So `lo[0]` is still valid. The pruning happens after. Good.

I think the code is correct. Let me write the final version.

One more consideration: for very large inputs, using a dict for `delayed` should be fine. The number of delayed entries at any time is bounded by k (we only have k elements in the window at any time, and delayed entries are cleaned up as they reach the top).

Let me write the clean final version.
