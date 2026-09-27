The problem is to compute the sliding median for every window of size k in a list of numbers.

Key constraints:
- n = 200,000, k = 1,000
- Must finish well under 2 seconds
- Return floats
- Even k: mean of two middle values
- Odd k: middle value
- Raise ValueError if k < 1 or k > len(nums)

Approach options:
1. **Two heaps with lazy deletion** - Classic approach. Maintain two heaps (max-heap for lower half, min-heap for upper half) with lazy deletion. Amortized O(n log k) time.
2. **Sort each window** - O(n * k log k) which for n=200k, k=1000 would be 200k * 1000 * log(1000) ≈ 200k * 1000 * 10 = 2 * 10^9 operations. Too slow.
3. **Two heaps with lazy deletion** - O(n log k) amortized. For n=200k, k=1000: 200k * log(1000) ≈ 200k * 10 = 2 * 10^6 operations. Very fast.

Let me go with the two heaps approach.

The two heaps approach:
- `lo` is a max-heap (using negative values in Python's heapq) containing the lower half
- `hi` is a min-heap containing the upper half
- We maintain the invariant that:
  - All elements in `lo` <= all elements in `hi`
  - `len(lo) == len(hi)` or `len(lo) == len(hi) + 1`
- We use lazy deletion: we keep a `delayed` counter/dict for elements to be removed

Let me think about the lazy deletion approach more carefully:

For the sliding window, as we slide:
- Remove the element that leaves the window
- Add the element that enters the window

With lazy deletion, when we remove an element, we just mark it as "to be removed" and clean up when it reaches the top of the heap.

Let me implement this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    n = len(nums)
    result = []
    
    # lo: max-heap (negated), hi: min-heap
    lo = []  # max-heap of lower half (stored as negatives)
    hi = []  # min-heap of upper half
    # Lazy deletion
    delayed_lo = defaultdict(int)  # count of elements to remove from lo
    delayed_hi = defaultdict(int)  # count of elements to remove from hi
    lo_size = 0
    hi_size = 0
    
    def lo_clean():
        while lo and -lo[0] in delayed_lo:
            delayed_lo[-lo[0]] -= 1
            if delayed_lo[-lo[0]] == 0:
                del delayed_lo[-lo[0]]
            heapq.heappop(lo)
            lo_size -= 1
    
    def hi_clean():
        while hi and hi[0] in delayed_hi:
            delayed_hi[hi[0]] -= 1
            if delayed_hi[hi[0]] == 0:
                del delayed_hi[hi[0]]
            heapq.heappop(hi)
            hi_size -= 1
    
    def lo_balance():
        if lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
    
    def hi_balance():
        if hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    def add(val):
        if not lo or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        if val <= -lo[0]:
            lo_size -= 1
            delayed_lo[val] += 1
        else:
            hi_size -= 1
            delayed_hi[val] += 1
    
    # Initialize first window
    for i in range(k):
        add(nums[i])
    
    # Clean and balance, then compute median
    lo_clean()
    lo_balance()
    hi_balance()
    
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    for i in range(k, n):
        # Remove element leaving window
        remove(nums[i - k])
        # Clean tops
        lo_clean()
        hi_clean()
        # Add new element
        add(nums[i])
        # Balance
        lo_balance()
        hi_balance()
        # Clean again after balancing
        lo_clean()
        hi_clean()
        
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, I need to be careful about the order of operations. Let me reconsider:

After removing an element, the sizes might be unbalanced. Then we add a new element. Then we balance.

Actually, let me reconsider the order:
1. Remove the outgoing element (mark as delayed, decrement size)
2. Clean the tops (remove any delayed elements that are at the top)
3. Add the incoming element
4. Balance (move elements between heaps if needed)
5. Clean again (in case balancing moved a delayed element to the top)
6. Compute median

This should work. Let me also make sure the `remove` function is correct. When we remove a value, we need to check which heap it belongs to. We check if val <= max of lo (top of lo). If so, it's in lo; otherwise it's in hi.

Wait, but what if the top of lo is already marked as delayed? Then we should clean first before checking. Actually, the standard approach is:
- Clean tops first (before the remove), or clean before checking which heap the value belongs to.

Let me restructure:

```python
for i in range(k, n):
    # Remove outgoing
    # First clean to ensure tops are valid
    lo_clean()
    hi_clean()
    # Now determine which heap the outgoing element is in
    remove(nums[i - k])
    # Add incoming
    add(nums[i])
    # Balance
    lo_balance()
    hi_balance()
    # Clean after balancing
    lo_clean()
    hi_clean()
    # Compute median
```

Hmm, but there's a subtle issue. After `remove`, the sizes are off by 1. Then `add` makes them off by 0. Then `lo_balance` and `hi_balance` should restore the invariant.

Actually, let me think again. The invariant is:
- `lo_size - hi_size` is 0 or 1
- All elements in lo <= all elements in hi

After remove: one size decreases by 1. Could be lo_size = hi_size (if we removed from lo when lo was bigger) or lo_size = hi_size - 1 (if we removed from hi when sizes were equal).

After add: one size increases by 1.

So after remove+add, the sizes could be:
- Was (hi+1, hi) → remove from lo → (hi, hi) → add to either → (hi+1, hi) or (hi, hi+1)
- Was (hi+1, hi) → remove from hi → (hi+1, hi-1) → add to either → (hi+1, hi) or (hi, hi-1+1=hi)

Wait, this is getting complex. Let me just use the standard balance approach:

`lo_balance`: while lo_size > hi_size + 1, move from lo to hi
`hi_balance`: while hi_size > lo_size, move from hi to lo

These together ensure the invariant.

Let me also handle the edge case where `lo` might be empty when we try to check `-lo[0]` in `remove`. But if k >= 1 and we've filled the first window, lo should never be empty.

Actually wait - after cleaning, lo could theoretically be empty if all elements were delayed. But since we maintain lo_size and hi_size, and the total is k, if k >= 1 then at least one of them is non-zero. And lo_size should be >= 1 after balancing (since lo_size >= hi_size always after balance... wait no, lo_size can equal hi_size).

Hmm, let me reconsider. After balancing:
- If k is odd: lo_size = hi_size + 1, so lo_size >= 1
- If k is even: lo_size = hi_size, so lo_size >= k/2 >= 1 (since k >= 2 for even)

So lo[0] is always valid after cleaning. Good.

But wait, what about in `remove`? We check `val <= -lo[0]`. If lo is empty at that point... but we should clean first. And after cleaning, if lo_size > 0 then lo is non-empty. Since we're in the window phase (k >= 1), total elements is k, so at least one heap has elements.

Actually, there's a potential issue: what if all elements are in `hi` and `lo` is empty? After balancing, this shouldn't happen because `hi_balance` would move elements to `lo`. But we need to make sure we balance before removing.

Let me restructure the loop:

```python
for i in range(k, n):
    # Clean before determining which heap to remove from
    lo_clean()
    hi_clean()
    
    # Remove outgoing element
    remove(nums[i - k])
    
    # Add incoming element  
    add(nums[i])
    
    # Balance
    lo_balance()
    hi_balance()
    
    # Clean after balancing (in case a delayed element moved to top)
    lo_clean()
    hi_clean()
    
    # Compute median
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
```

This should work. Let me also think about the `add` function. When adding, we compare with `-lo[0]` (the max of lo). But what if lo is empty? After the initial window fill and balance, lo should not be empty. And during the sliding phase, after cleaning, lo should not be empty (since total elements in the window is k >= 1, and after balance lo_size >= 1).

Wait, actually during `add`, we haven't balanced yet. After `remove`, it's possible that lo became empty (if k=1... but we handle k=1 separately). For k >= 2, after removing one element from a window of k elements, we have k-1 elements. If all k-1 were in hi... but that can't happen because the invariant says lo_size >= hi_size or lo_size = hi_size + 1. So after removing, lo_size >= hi_size - 1. If hi had all elements, lo_size = 0 and hi_size = k-1. But this violates the invariant (lo_size should be at least hi_size - 1... no wait, the invariant is lo_size >= hi_size or lo_size = hi_size + 1).

Hmm, actually the invariant is: lo_size == hi_size or lo_size == hi_size + 1. So lo_size >= hi_size. After removing from lo: lo_size = hi_size - 1 (violation). After removing from hi: lo_size = hi_size or lo_size = hi_size + 1.

So after removing from lo, we have lo_size = hi_size - 1. Then if we add to hi, we get lo_size = hi_size - 1 + 1 = hi_size... wait no. Let me redo:

Before remove: lo_size = hi_size or lo_size = hi_size + 1.

Case 1: lo_size = hi_size + 1
- Remove from lo: lo_size = hi_size. OK.
- Remove from hi: lo_size = hi_size + 1, hi_size = hi_size - 1. So lo_size = (hi_size+1) = hi_size + 2. Violation.

Case 2: lo_size = hi_size
- Remove from lo: lo_size = hi_size - 1. Violation.
- Remove from hi: lo_size = hi_size, hi_size = hi_size - 1. So lo_size = hi_size + 1. OK.

After remove, we add:
- If we add to lo: lo_size increases by 1.
- If we add to hi: hi_size increases by 1.

Then we balance:
- lo_balance: while lo_size > hi_size + 1: move from lo to hi
- hi_balance: while hi_size > lo_size: move from hi to lo

After both balances, the invariant is restored.

The key issue is: in `add`, we check `val <= -lo[0]`. If lo is empty, we can't do this. Can lo be empty at that point?

After remove, if we removed from lo and lo_size was 1 (and hi_size was 0), then lo_size becomes 0. But that means k-1 = 0, so k = 1. We handle k=1 separately.

For k >= 2: the minimum lo_size after a valid state is max(1, ceil((k-1)/2)) or something... Actually, with the invariant lo_size >= hi_size and lo_size + hi_size = k:
- k even: lo_size = k/2, hi_size = k/2
- k odd: lo_size = (k+1)/2, hi_size = (k-1)/2

So minimum lo_size is floor(k/2). For k >= 2, floor(k/2) >= 1. After removing from lo, lo_size >= floor(k/2) - 1. For k = 2: floor(2/2) - 1 = 0. So lo could be empty!

But wait, for k = 2: initially lo_size = 1, hi_size = 1. If we remove from lo, lo_size = 0, hi_size = 1. Then in `add`, lo is empty, so we can't compare with `-lo[0]`. We should just add to lo (since it's empty, the new element becomes the max of the lower half).

Let me handle this: in `add`, if lo is empty, just add to lo.

```python
def add(val):
    if lo_size == 0 or val <= -lo[0]:
        heapq.heappush(lo, -val)
        lo_size += 1
    else:
        heapq.heappush(hi, val)
        hi_size += 1
```

Similarly in `remove`, if lo is empty, the element must be in hi.

```python
def remove(val):
    if lo_size > 0 and val <= -lo[0]:
        lo_size -= 1
        delayed_lo[val] += 1
    else:
        hi_size -= 1
        delayed_hi[val] += 1
```

This should handle all cases.

Let me also think about the performance. For n=200,000 and k=1,000:
- We do n-k+1 ≈ 199,001 iterations
- Each iteration: O(log k) for heap operations
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations

This should be well within 2 seconds in Python.

Actually, let me reconsider. Python's heapq operations are O(log n) where n is the heap size (up to k=1000). So each push/pop is O(log 1000) ≈ 10 comparisons. With ~200k iterations and a few heap ops each, we're looking at maybe 2-3 million heap operations. Each heap operation in Python is maybe 1-2 microseconds. So total should be well under a second.

Let me also make sure I handle the floating point comparisons correctly. Since we're dealing with floats, `val <= -lo[0]` should work fine.

One more thing: the `lo_clean` and `hi_clean` functions. They use dictionaries (defaultdict) to track delayed removals. The key insight is that we only clean when the delayed element is at the top of the heap.

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    if k == 1:
        return list(nums)
    
    lo = []  # max-heap (negated values), lower half
    hi = []  # min-heap, upper half
    delayed_lo = defaultdict(int)
    delayed_hi = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def lo_clean():
        nonlocal lo_size
        while lo and -lo[0] in delayed_lo:
            delayed_lo[-lo[0]] -= 1
            if delayed_lo[-lo[0]] == 0:
                del delayed_lo[-lo[0]]
            heapq.heappop(lo)
            lo_size -= 1
    
    def hi_clean():
        nonlocal hi_size
        while hi and hi[0] in delayed_hi:
            delayed_hi[hi[0]] -= 1
            if delayed_hi[hi[0]] == 0:
                del delayed_hi[hi[0]]
            heapq.heappop(hi)
            hi_size -= 1
    
    def lo_balance():
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
    
    def hi_balance():
        nonlocal lo_size, hi_size
        if hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    def add(val):
        nonlocal lo_size, hi_size
        if lo_size == 0 or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        nonlocal lo_size, hi_size
        if lo_size > 0 and val <= -lo[0]:
            lo_size -= 1
            delayed_lo[val] += 1
        else:
            hi_size -= 1
            delayed_hi[val] += 1
    
    # Initialize
    for i in range(k):
        add(nums[i])
    lo_clean()
    lo_balance()
    hi_balance()
    
    result = []
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    for i in range(k, n):
        lo_clean()
        hi_clean()
        remove(nums[i - k])
        add(nums[i])
        lo_balance()
        hi_balance()
        lo_clean()
        hi_clean()
        
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Wait, I need to double-check: after the initial fill, do I need to clean before the first balance? Let me trace through:

Initial fill: we add k elements. During add, we compare with -lo[0]. The first element goes to lo (since lo_size == 0). Subsequent elements are compared with the current max of lo.

After adding all k elements, the invariant might be violated (lo_size could be more than hi_size + 1). So we need to balance. But we also need to make sure the tops are clean (though since we haven't done any removals yet, there are no delayed elements, so clean is a no-op).

So the initial setup is fine without clean (no delayed elements exist yet).

Let me trace a small example to verify:
nums = [1, 3, 5, 7, 9], k = 3

Initial: add 1, 3, 5
- add(1): lo_size=0, push to lo. lo=[-1], lo_size=1
- add(3): 3 > -lo[0]=1, push to hi. hi=[3], hi_size=1
- add(5): 5 > -lo[0]=1, push to hi. hi=[3,5], hi_size=2

lo_balance: lo_size=1, hi_size=2. lo_size > hi_size+1? 1 > 3? No.
hi_balance: hi_size > lo_size? 2 > 1? Yes. Pop 3 from hi, push to lo.
lo=[-3,-1], hi=[5], lo_size=2, hi_size=1.

k=3 is odd, median = -lo[0] = 3. Correct! [1,3,5] median is 3.

Slide: remove nums[0]=1, add nums[3]=7
- lo_clean: no delayed elements. No-op.
- hi_clean: no-op.
- remove(1): lo_size > 0 and 1 <= -lo[0]=3. Yes. lo_size=1, delayed_lo[1]=1.
- add(7): lo_size=1, 7 <= -lo[0]=3? No (7 > 3). Push to hi. hi=[5,7], hi_size=2.
- lo_balance: lo_size=1, hi_size=2. 1 > 3? No.
- hi_balance: 2 > 1? Yes. Pop 5 from hi, push to lo. lo=[-5,-1], hi=[7], lo_size=2, hi_size=1.

Wait, lo is [-5, -1] as a max-heap (negated). The top is -lo[0] = 5. But element 1 is delayed in lo. Let me clean:
- lo_clean: -lo[0] = 5. Is 5 in delayed_lo? No. So no clean needed.

Wait, but 1 is in lo (as -1) and marked as delayed. It's just not at the top. That's fine - we'll clean it when it reaches the top.

Median: k=3 odd, -lo[0] = 5. [3,5,7] median is 5. Correct!

Slide: remove nums[1]=3, add nums[4]=9
- lo_clean: -lo[0]=5. 5 in delayed_lo? No.
- hi_clean: hi[0]=7. 7 in delayed_hi? No.
- remove(3): lo_size=2, 3 <= -lo[0]=5? Yes. lo_size=1, delayed_lo[3]=1.
- add(9): lo_size=1, 9 <= -lo[0]=5? No. Push to hi. hi=[7,9], hi_size=2.
- lo_balance: 1 > 3? No.
- hi_balance: 2 > 1? Yes. Pop 7 from hi, push to lo. lo=[-7,-1], hi=[9], lo_size=2, hi_size=1.

Wait, lo was [-5, -1] before. We popped... no wait, we didn't pop from lo. We pushed -7 to lo. So lo = [-5, -1, -7] as a heap. The heap property: -5 is the root (smallest, i.e., largest original value 5). Wait no: [-5, -1, -7] - is this a valid min-heap? -7 < -5 < -1. The min-heap property requires parent <= children. Root is -5. Children are -1 and -7. -7 < -5, so the heap property is violated!

Actually, heapq maintains a min-heap. So after pushing -7 into [-5, -1], we get a heap. Let me think: heap = [-5, -1]. Push -7: append to end → [-5, -1, -7]. Then sift up: -7 is at index 2, parent is at index 0 (value -5). -7 < -5, so swap: [-7, -1, -5]. Now -7 is root.

So lo = [-7, -1, -5]. Top is -7, so -lo[0] = 7.

lo_clean: -lo[0] = 7. 7 in delayed_lo? No. (delayed_lo has {3: 1})
hi_clean: hi[0] = 9. 9 in delayed_hi? No.

Median: k=3 odd, -lo[0] = 7. [5,7,9] median is 7. Correct!

Great, the algorithm works.

Now let me also consider: what if there are duplicate values? E.g., nums = [1, 1, 1, 1], k = 3.

Initial: add 1, 1, 1
- add(1): lo_size=0, push to lo. lo=[-1], lo_size=1
- add(1): 1 <= -lo[0]=1? Yes (1<=1). Push to lo. lo=[-1,-1], lo_size=2
- add(1): 1 <= -lo[0]=1? Yes. Push to lo. lo=[-1,-1,-1], lo_size=3

lo_balance: lo_size=3, hi_size=0. 3 > 1? Yes. Pop from lo: val=1. lo_size=2. Push to hi: hi=[1], hi_size=1.
Now lo_size=2, hi_size=1. 2 > 2? No.

hi_balance: 1 > 2? No.

Median: k=3 odd, -lo[0]=1. [1,1,1] median is 1. Correct.

Slide: remove 1, add 1
- remove(1): lo_size=2, 1 <= -lo[0]=1? Yes. lo_size=1, delayed_lo[1]=1.
- add(1): lo_size=1, 1 <= -lo[0]=1? Yes. Push to lo. lo=[-1,-1,-1] (one of the old ones), lo_size=2.

Wait, lo was [-1,-1] (after the balance pop). Now we push another -1: lo=[-1,-1,-1]. lo_size=2.
- lo_balance: 2 > 2? No.
- hi_balance: 1 > 2? No.
- lo_clean: -lo[0]=1. delayed_lo[1]=1. So pop. delayed_lo[1]=0, del. heapq.heappop(lo). lo_size=1.
  Now lo=[-1,-1] (two remaining). -lo[0]=1. 1 in delayed_lo? No (we deleted it).
- hi_clean: hi[0]=1. 1 in delayed_hi? No.

Median: -lo[0]=1. Correct!

Another test: nums = [1, 2, 3, 4], k = 2
- Windows: [1,2]→1.5, [2,3]→2.5, [3,4]→3.5

Initial: add 1, 2
- add(1): lo=[-1], lo_size=1
- add(2): 2 > 1, hi=[2], hi_size=1

lo_balance: 1 > 2? No. hi_balance: 1 > 1? No.
k=2 even: (-lo[0] + hi[0])/2 = (1+2)/2 = 1.5. Correct!

Slide: remove 1, add 3
- remove(1): lo_size=1, 1<=1? Yes. lo_size=0, delayed_lo[1]=1.
- add(3): lo_size=0, push to lo. lo=[-3]... wait, lo still has [-1] in it (the actual heap), but lo_size=0. We push -3: lo=[-3,-1] (or [-1,-3] depending on heap structure). Actually the heap was [-1]. We push -3: append → [-1, -3]. Sift up: -3 < -1, swap → [-3, -1]. lo_size=1.
- lo_balance: 1 > 2? No. hi_balance: 1 > 1? No.
- lo_clean: -lo[0]=3. 3 in delayed_lo? No. (delayed_lo has {1:1})
- hi_clean: hi[0]=2. 2 in delayed_hi? No.

k=2 even: (-lo[0]+hi[0])/2 = (3+2)/2 = 2.5. Correct!

Slide: remove 2, add 4
- lo_clean: -lo[0]=3. 3 in delayed_lo? No.
- hi_clean: hi[0]=2. 2 in delayed_hi? No.
- remove(2): lo_size=1, 2<=-lo[0]=3? Yes. lo_size=0, delayed_lo[2]=1.
- add(4): lo_size=0, push to lo. lo=[-4,-1,-3]... 

Hmm wait, the heap lo currently is [-3, -1] (from before). lo_size is 1 (logical). The actual heap has 2 elements: -3 and -1. We push -4: heap becomes [-4, -1, -3]. lo_size=1 (logical, but really it's 2 elements in the heap with 1 being "logical").

Wait I'm confusing myself. Let me be more careful.

The heap `lo` is a Python list that implements a min-heap of negated values. The "logical size" is `lo_size`. The actual number of elements in the heap list might be larger than `lo_size` due to delayed deletions.

After initial + first slide:
- lo heap: [-3, -1] (2 elements physically)
- lo_size: 1 (logical)
- delayed_lo: {1: 1}

Now slide 2: remove 2, add 4.
- lo_clean: -lo[0] = 3. Is 3 in delayed_lo? No (delayed_lo = {1:1}). No clean.
- hi_clean: hi[0] = 2. Is 2 in delayed_hi? No. No clean.
- remove(2): lo_size=1, 2 <= -lo[0]=3? Yes. lo_size=0, delayed_lo[2]=1. Now delayed_lo = {1:1, 2:1}.
- add(4): lo_size=0. Push to lo. Heap was [-3, -1]. Push -4: [-4, -1, -3]. lo_size=1.
- lo_balance: lo_size=1, hi_size=1. 1 > 2? No.
- hi_balance: 1 > 1? No.
- lo_clean: -lo[0] = 4. Is 4 in delayed_lo? No.
- hi_clean: hi[0] = 2. Is 2 in delayed_hi? No.

k=2 even: (-lo[0] + hi[0])/2 = (4+2)/2 = 3. Correct! [3,4] median is 3.5... 

Wait, that's wrong! [3,4] median should be (3+4)/2 = 3.5, not 3.

Let me re-trace. After slide 1, the window is [2, 3]. lo has max 3, hi has min 2? That's wrong! lo should have the lower half.

Oh wait, I think I made an error. Let me re-trace more carefully.

nums = [1, 2, 3, 4], k = 2

Initial window [1, 2]:
- add(1): lo_size=0, push to lo. lo=[-1], lo_size=1.
- add(2): 2 <= -lo[0]=1? No. Push to hi. hi=[2], hi_size=1.
- Balance: no changes needed.
- lo=[-1], hi=[2], lo_size=1, hi_size=1.
- Median: (1+2)/2 = 1.5. ✓

Slide to [2, 3]: remove nums[0]=1, add nums[2]=3.
- lo_clean: -lo[0]=1. 1 in delayed_lo? No.
- hi_clean: hi[0]=2. 2 in delayed_hi? No.
- remove(1): lo_size=1, 1 <= -lo[0]=1? Yes. lo_size=0, delayed_lo[1]=1.
- add(3): lo_size=0, push to lo. lo was [-1], push -3 → [-3, -1] (heap). lo_size=1.
- lo_balance: 1 > 2? No.
- hi_balance: 1 > 1? No.
- lo_clean: -lo[0]=3. 3 in delayed_lo? No.
- hi_clean: hi[0]=2. 2 in delayed_hi? No.
- State: lo=[-3,-1] (heap, 2 physical elements), lo_size=1, hi=[2], hi_size=1.
- Median: (3+2)/2 = 2.5. ✓ (window is [2,3])

Slide to [3, 4]: remove nums[1]=2, add nums[3]=4.
- lo_clean: -lo[0]=3. 3 in delayed_lo? No (delayed_lo={1:1}).
- hi_clean: hi[0]=2. 2 in delayed_hi? No.
- remove(2): lo_size=1, 2 <= -lo[0]=3? Yes. lo_size=0, delayed_lo[2]=1. Now delayed_lo={1:1, 2:1}.
- add(4): lo_size=0, push to lo. lo was [-3,-1], push -4 → [-4,-1,-3] (heap). lo_size=1.
- lo_balance: 1 > 2? No.
- hi_balance: 1 > 1? No.
- lo_clean: -lo[0]=4. 4 in delayed_lo? No.
- hi_clean: hi[0]=2. 2 in delayed_hi? No.
- State: lo=[-4,-1,-3] (heap, 3 physical elements), lo_size=1, hi=[2], hi_size=1.
- Median: (4+2)/2 = 3. ✗ Should be 3.5!

The problem is that hi still has 2 in it, but 2 is no longer in the window! The window is [3,4]. Element 2 was in the previous window.

Ah I see the issue. When we removed 1, it went to delayed_lo. But 2 is still physically in hi. The issue is that 2 should have been the element in hi for the window [2,3], and when we slide to [3,4], we remove 2 (which is the outgoing element). But in my trace, I removed 2 from lo (because 2 <= -lo[0]=3). That's wrong!

The problem: element 2 is in hi, not in lo. But my `remove` function checks `val <= -lo[0]` to determine which heap it belongs to. Since 2 <= 3 (the max of lo), I incorrectly assigned it to lo.

This is a fundamental issue with the lazy deletion approach when there are duplicates or when the boundary between lo and hi is ambiguous. In this case, 2 is in hi, but 2 <= max(lo)=3, so the check incorrectly says it's in lo.

The standard solution to this: the `remove` function should check which heap the element actually belongs to. But with lazy deletion, we don't track individual elements' locations.

Wait, actually the standard approach for sliding median with two heaps handles this correctly. Let me re-examine.

The issue is: after the window [1,2], lo has {1} and hi has {2}. When we slide to [2,3]:
- We remove 1 (outgoing). 1 is in lo. ✓
- We add 3 (incoming). 3 > max(lo)=3? No, 3 <= 3. So it goes to lo.

Wait, -lo[0] after removing 1 and before adding 3: lo has physical [-1] but lo_size=0. So lo_size=0, and in `add`, we check `lo_size == 0`, so we push to lo. lo now has [-3, -1] physically, lo_size=1.

Then for window [2,3]: lo has logical max = 3 (the 3 we just added), hi has 2. Median = (3+2)/2 = 2.5. ✓

Now sliding to [3,4]: remove 2 (outgoing), add 4 (incoming).
- 2 is in hi (hi=[2]). 
- In `remove(2)`: lo_size=1, -lo[0]=3. 2 <= 3? Yes. So we mark it as delayed in lo. But 2 is actually in hi!

This is the bug. The element 2 is in hi, but we're marking it as delayed in lo.

The standard fix: when removing, if the value is <= max(lo), we assume it's in lo. But this assumption breaks when the value exists in both heaps (duplicates) or when the value is in hi but is less than max(lo) (which shouldn't happen if the invariant is maintained correctly...).

Wait, the invariant is: all elements in lo <= all elements in hi. So if 2 is in hi and 3 is in lo, then 3 <= 2 must hold. But 3 > 2, which violates the invariant!

So the invariant was already broken! Let me re-examine.

After the first slide (window [2,3]):
- lo: physical [-3, -1], lo_size=1. The "logical" content of lo is {3} (the 3 we added). The 1 is delayed.
- hi: [2], hi_size=1. Content: {2}.
- Invariant: max(lo) = 3, min(hi) = 2. 3 > 2. Invariant violated!

So the invariant was broken after the first slide. The issue is that when we added 3, lo was empty (logically), so we put 3 in lo. But 3 > 2 (which is in hi). The invariant should have been maintained.

The problem: after removing 1 from lo, lo became empty. Then we added 3 to lo (since lo was empty). But we should have balanced first! Or rather, the add function should consider the state of both heaps.

I think the fix is: after remove and before add, we should not need to balance (since we're about to add). But the issue is that when lo is empty and hi has elements, adding to lo violates the invariant.

The correct approach: in `add`, if lo is empty but hi is not, we should move the min of hi to lo first, then add. Or alternatively, we should always add to the appropriate heap based on the median boundary.

Actually, I think the real fix is simpler: after `remove`, before `add`, we should rebalance. Or, in the `add` function, if lo_size == 0 and hi_size > 0, we should first move the min of hi to lo.

Let me restructure:

```python
def add(val):
    nonlocal lo_size, hi_size
    if lo_size == 0 and hi_size > 0:
        # Move min of hi to lo to maintain invariant
        val2 = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val2)
        lo_size += 1
    if lo_size == 0 or val <= -lo[0]:
        heapq.heappush(lo, -val)
        lo_size += 1
    else:
        heapq.heappush(hi, val)
        hi_size += 1
```

Hmm, but this changes the logic. Let me think differently.

Actually, I think the cleaner approach is to do the balance between remove and add:

```python
for i in range(k, n):
    lo_clean()
    hi_clean()
    remove(nums[i - k])
    # Rebalance after removal
    lo_balance()
    hi_balance()
    add(nums[i])
    # Rebalance after addition
    lo_balance()
    hi_balance()
    lo_clean()
    hi_clean()
    # Compute median
```

Let me re-trace with this fix:

nums = [1, 2, 3, 4], k = 2

Initial: lo=[-1], hi=[2], lo_size=1, hi_size=1. Median=1.5. ✓

Slide to [2,3]: remove 1, add 3.
- lo_clean: no-op. hi_clean: no-op.
- remove(1): 1 <= -lo[0]=1? Yes. lo_size=0, delayed_lo[1]=1.
- lo_balance: lo_size=0, hi_size=1. 0 > 2? No.
- hi_balance: hi_size=1, lo_size=0. 1 > 0? Yes. Pop 2 from hi, push to lo. hi=[], lo=[-2,-1], lo_size=1, hi_size=0.
- add(3): lo_size=1, 3 <= -lo[0]=2? No. Push to hi. hi=[3], hi_size=1.
- lo_balance: 1 > 2? No. hi_balance: 1 > 1? No.
- lo_clean: -lo[0]=2. 2 in delayed_lo? No.
- hi_clean: hi[0]=3. 3 in delayed_hi? No.
- State: lo=[-2,-1] (2 physical), lo_size=1, hi=[3], hi_size=1.
- Median: (2+3)/2 = 2.5. ✓

Slide to [3,4]: remove 2, add 4.
- lo_clean: -lo[0]=2. 2 in delayed_lo? No (delayed_lo={1:1}).
- hi_clean: hi[0]=3. 3 in delayed_hi? No.
- remove(2): lo_size=1, 2 <= -lo[0]=2? Yes. lo_size=0, delayed_lo[2]=1. delayed_lo={1:1, 2:1}.
- lo_balance: 0 > 2? No.
- hi_balance: 1 > 0? Yes. Pop 3 from hi, push to lo. hi=[], lo=[-3,-1,-2]... 

Wait, lo was [-2, -1] physically. We push -3: heap becomes [-3, -1, -2] (after sift). lo_size=1, hi_size=0.
- add(4): lo_size=1, 4 <= -lo[0]=3? No. Push to hi. hi=[4], hi_size=1.
- lo_balance: 1 > 2? No. hi_balance: 1 > 1? No.
- lo_clean: -lo[0]=3. 3 in delayed_lo? No.
- hi_clean: hi[0]=4. 4 in delayed_hi? No.
- State: lo=[-3,-1,-2] (3 physical), lo_size=1, hi=[4], hi_size=1.
- Median: (3+4)/2 = 3.5. ✓

The fix works. The key is to rebalance after remove (before add).

Let me also verify that the invariant is maintained throughout. After rebalancing, we ensure lo_size >= hi_size (or lo_size = hi_size + 1). And the `add` function ensures new elements go to the correct heap.

But wait, there's still a potential issue with the `remove` function. When we check `val <= -lo[0]`, we're assuming the element is in lo if it's <= max(lo). But what if the element is actually in hi (because of the invariant being temporarily broken)?

After the rebalance step (lo_balance, hi_balance), the invariant should be restored: all elements in lo <= all elements in hi. So if val <= max(lo), val should indeed be in lo (or could be in either if val == max(lo) == min(hi)). If val > max(lo), val should be in hi.

Actually, with the rebalance in place, the invariant is maintained. So the `remove` logic is correct: if val <= max(lo), it's in lo; otherwise it's in hi.

But what about duplicates? If val == max(lo) and val == min(hi), the element could be in either heap. In that case, we arbitrarily assign it to lo. Is that a problem?

If the element is actually in hi but we mark it as delayed in lo, then when we clean lo's top, we'll try to remove a value that's not there (or rather, we'll remove a different instance of the same value). This could cause issues.

Example: lo = {2}, hi = {2}, and we want to remove a 2 that's in hi. We check 2 <= max(lo)=2, so we mark it as delayed in lo. Now lo has delayed {2:1}. When we clean lo, if 2 is at the top of lo, we'll remove it. But the 2 in lo is a different 2 (the one that should stay). So now lo loses its 2, and hi still has its 2. The total count is correct (we removed one 2), but the distribution is wrong.

However, since we only care about the median (which depends on the sorted order, not on which specific element is in which heap), this should be fine as long as the sizes are correct.

Actually wait, it could be a problem. If lo loses a 2 (that should stay) and hi keeps its 2 (that should have been removed), then the boundary between lo and hi is wrong. But since both values are 2, the median calculation is unaffected.

More generally, if val == max(lo) == min(hi), and we remove one instance (say from hi), but we mark it as delayed in lo, then:
- lo will lose a val when cleaned
- hi keeps its val
- Net effect: one val is removed from the system. ✓
- But the heap distribution might be off: lo has one fewer val, hi has one more.
- This could affect future median calculations if the distribution matters.

Hmm, actually I think this is fine in practice because:
1. The total count is correct.
2. The invariant (all lo elements <= all hi elements) is maintained because all the values at the boundary are equal.
3. The median only depends on the values, not on which heap they're in.

I'll proceed with this approach. It's the standard algorithm and handles duplicates correctly for median computation purposes.

Let me also think about whether we need `lo_balance` and `hi_balance` to be while loops or if a single if is enough. Since we're only adding/removing one element at a time, the imbalance can be at most 1, so a single move (if) is sufficient. But to be safe, I'll use a while loop.

Actually, for the initial fill (adding k elements one by one), the imbalance could grow larger. But since we add one at a time and the balance function moves at most one element per call... wait, no. In the initial fill, we don't call balance after each add. We only balance after all k elements are added. At that point, lo_size could be up to k (if all elements went to lo). So we need a while loop.

Wait, actually in the initial fill, after each `add`, the invariant might be violated by 1. But we don't balance during the initial fill. So after k adds, lo_size could be as high as k (if all elements are in non-decreasing order, each new element goes to hi, so actually lo_size stays small...).

Let me think: in the worst case for initial fill, all elements are the same (or decreasing). Then all go to lo. lo_size = k, hi_size = 0. Then lo_balance needs to move (k-1)/2 elements. So yes, we need a while loop.

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    if k == 1:
        return list(nums)
    
    lo = []  # max-heap (negated), lower half
    hi = []  # min-heap, upper half
    delayed_lo = defaultdict(int)
    delayed_hi = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def lo_clean():
        nonlocal lo_size
        while lo and -lo[0] in delayed_lo:
            delayed_lo[-lo[0]] -= 1
            if delayed_lo[-lo[0]] == 0:
                del delayed_lo[-lo[0]]
            heapq.heappop(lo)
            lo_size -= 1
    
    def hi_clean():
        nonlocal hi_size
        while hi and hi[0] in delayed_hi:
            delayed_hi[hi[0]] -= 1
            if delayed_hi[hi[0]] == 0:
                del delayed_hi[hi[0]]
            heapq.heappop(hi)
            hi_size -= 1
    
    def lo_balance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
    
    def hi_balance():
        nonlocal lo_size, hi_size
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
    
    def add(val):
        nonlocal lo_size, hi_size
        if lo_size == 0 or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
    
    def remove(val):
        nonlocal lo_size, hi_size
        if lo_size > 0 and val <= -lo[0]:
            lo_size -= 1
            delayed_lo[val] += 1
        else:
            hi_size -= 1
            delayed_hi[val] += 1
    
    # Initialize first window
    for i in range(k):
        add(nums[i])
    lo_balance()
    hi_balance()
    
    result = []
    if k % 2 == 1:
        result.append(float(-lo[0]))
    else:
        result.append((-lo[0] + hi[0]) / 2.0)
    
    for i in range(k, n):
        lo_clean()
        hi_clean()
        remove(nums[i - k])
        lo_balance()
        hi_balance()
        add(nums[i])
        lo_balance()
        hi_balance()
        lo_clean()
        hi_clean()
        
        if k % 2 == 1:
            result.append(float(-lo[0]))
        else:
            result.append((-lo[0] + hi[0]) / 2.0)
    
    return result
```

Let me verify performance: for n=200,000, k=1,000:
- Initial fill: 1,000 adds, each O(log k). Total: O(k log k).
- 199,000 slides: each has 2 cleans (amortized O(1) per element removed), 1 remove (O(1)), 2 balances (each moves at most 1 element, O(log k)), 1 add (O(log k)), 2 more cleans.
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 operations.

This should run well under 2 seconds in Python.

One concern: the `nonlocal` declarations in nested functions. In Python 3, this should work fine.

Let me also consider: could there be an issue with the `remove` function when `lo_size > 0` but the top of lo is a delayed element? We call `lo_clean()` before `remove()`, so the top should be clean. Good.

I think this solution is correct and efficient. Let me write the final version.

Actually, I want to double-check one more edge case: what if k == len(nums)? Then we have exactly one window. The loop `for i in range(k, n)` won't execute (since range(k, k) is empty). We just return the median of the full array. That's correct.

What if k == 0? We raise ValueError. What if k == -1? ValueError. Good.

I'm satisfied with this solution. Let me write it up cleanly.
