We need to implement a sliding window median function that's efficient for n=200,000 and k=1,000.

The naive approach would be O(n*k) which for 200,000 * 1,000 = 200,000,000 operations - too slow.

We need an efficient approach. The standard approach for sliding window median is to use two heaps (a max-heap for the lower half and a min-heap for the upper half) to maintain the median. This gives O(n log k) time complexity.

Let me think about the two-heap approach:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- The lower half should have size ceil(k/2) or floor(k/2) depending on even/odd k
- For odd k: lower half has (k+1)//2 elements, upper half has k//2 elements
- For even k: both halves have k//2 elements

When we add a new element:
1. Add to the appropriate heap
2. Rebalance so sizes are correct

When we remove an element (the one leaving the window):
1. Remove from the appropriate heap
2. Rebalance

The tricky part is removing an arbitrary element from a heap. We can use a "lazy deletion" approach with a dictionary to track elements to remove.

Let me think more carefully:

For the sliding window, we process elements left to right. For each new element entering the window, we add it. For the element leaving the window, we remove it.

Approach with two heaps + lazy deletion:
- `lo` = max-heap (using negative values for Python's min-heap)
- `hi` = min-heap
- `to_remove` = dictionary of elements to lazily remove

Target sizes:
- For odd k: len(lo) = (k+1)//2, len(hi) = k//2
- For even k: len(lo) = k//2, len(hi) = k//2

When adding a new element:
- If lo is "full" (at target size), push to hi, else push to lo
- Then rebalance

When removing an element:
- Check if it's in lo or hi (by comparing with the median boundary)
- Actually, it's easier to just add it to a "to_remove" dict and lazily remove

Let me reconsider. The lazy deletion approach:

- We maintain two heaps and a counter for how many elements are "pending removal" in each heap.
- When we need to remove an element, we check if it belongs to lo or hi based on the current state.
- Actually, the simplest approach: when removing, we just mark it in a dict. When cleaning the top of a heap, we check if the top is in the removal dict.

Let me use a cleaner approach:

For each window, we need to track which elements are in the window. When an element leaves, we need to remove it from whichever heap it's in.

Actually, let me think about this differently. We can use a sorted structure. But Python doesn't have a built-in sorted list with efficient insert/delete.

The two-heap approach with lazy deletion:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError
    if k == 1:
        return list(nums)
    
    # Target sizes
    if k % 2 == 1:
        lo_target = (k + 1) // 2
        hi_target = k // 2
    else:
        lo_target = k // 2
        hi_target = k // 2
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = {}  # key: value, value: count to remove
    
    def clean(heap, is_lo):
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if val in to_remove:
                heapq.heappop(heap)
                to_remove[val] -= 1
                if to_remove[val] == 0:
                    del to_remove[val]
            else:
                break
    
    def add(val):
        if len(lo) < lo_target:
            heapq.heappush(lo, -val)
        else:
            heapq.heappush(hi, val)
        # Rebalance
        while len(lo) > lo_target:
            heapq.heappush(hi, -heapq.heappop(lo))
        while len(hi) > hi_target:
            heapq.heappush(lo, -heapq.heappop(hi))
    
    def remove(val):
        # We need to figure out which heap val is in
        # If val <= lo's max (i.e., -lo[0]), it's in lo
        # Otherwise it's in hi
        # But we need to clean first
        clean(lo, True)
        clean(hi, False)
        
        if lo and val <= -lo[0]:
            to_remove[val] = to_remove.get(val, 0) + 1
        else:
            to_remove[val] = to_remove.get(val, 0) + 1
        
        # After marking for removal, rebalance
        # We need to clean the heap where we marked the removal
        if lo and val <= -lo[0]:
            clean(lo, True)
        else:
            clean(hi, False)
        
        # Rebalance
        while len(lo) > lo_target:
            heapq.heappush(hi, -heapq.heappop(lo))
        while len(hi) > hi_target:
            heapq.heappush(lo, -heapq.heappop(hi))
    
    # Process the first window
    for i in range(k):
        add(nums[i])
    
    def get_median():
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (float(-lo[0]) + float(hi[0])) / 2.0
    
    result = [get_median()]
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, there's an issue with the `remove` function. When we mark an element for removal, we need to know which heap it's in. The check `val <= -lo[0]` works after cleaning. But what if lo is empty? That shouldn't happen if we maintain the correct sizes.

Actually, let me reconsider. After removing an element from a heap (lazily), the sizes might be off. Let me trace through:

After adding k elements, lo has lo_target elements and hi has hi_target elements. Total = k.

When we remove an element:
- We mark it in to_remove
- We clean the heap it's in
- Now that heap has one fewer "effective" element
- We need to rebalance: if lo lost an element, we should move one from hi to lo, etc.

Let me redo the rebalancing after removal:

After removing from lo: lo has lo_target - 1 effective elements, hi has hi_target. Total = k-1.
We need to get back to k-1... wait no, we're replacing one element. So:
- Remove old element (window shrinks to k-1)
- Add new element (window grows back to k)

Actually, let me separate the operations:
1. Remove the element that left the window
2. Add the new element
3. Rebalance after each operation

After step 1: total effective elements = k-1
After step 2: total effective elements = k

For rebalancing after step 1:
- If we removed from lo: lo has lo_target-1, hi has hi_target. Need to move one from hi to lo.
- If we removed from hi: lo has lo_target, hi has hi_target-1. Need to move one from lo to hi.

For rebalancing after step 2:
- We add to whichever heap is "small" (below target)
- Then rebalance

Let me restructure:

```python
def add(val):
    if len(lo) < lo_target:
        heapq.heappush(lo, -val)
    else:
        heapq.heappush(hi, val)
    # Rebalance to target sizes
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))

def remove(val):
    clean(lo, True)
    clean(hi, False)
    if lo and val <= -lo[0]:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(lo, True)
    else:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(hi, False)
    # Rebalance
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))
```

Hmm, but after remove, the total is k-1. The target sizes should be for k-1 elements... but then we add back to get k. So the rebalancing after remove should target k-1 sizes, and after add should target k sizes.

Actually, it's simpler to just do: remove, then add, then rebalance to k sizes. Or: remove (rebalance to k-1), add (rebalance to k).

Let me think about this more carefully. After removing one element, we have k-1 elements. The target sizes for k-1 would be:
- If k is odd: k-1 is even, so both get (k-1)//2
- If k is even: k-1 is odd, so lo gets (k-1+1)//2 = k//2, hi gets (k-1)//2

This gets complicated. Let me just do: remove, add, then rebalance to k sizes.

```python
def remove(val):
    clean(lo, True)
    clean(hi, False)
    if lo and val <= -lo[0]:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(lo, True)
    else:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(hi, False)

def add(val):
    if len(lo) < lo_target:
        heapq.heappush(lo, -val)
    else:
        heapq.heappush(hi, val)

def rebalance():
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))
```

Then in the main loop:
```
remove(old)
add(new)
rebalance()
```

This should work. After remove, total is k-1. After add, total is k. After rebalance, sizes are correct.

Let me verify with a small example:
nums = [1, 2, 3, 4, 5], k = 3

lo_target = 2, hi_target = 1

Window [1, 2, 3]:
- add(1): lo < 2, push to lo. lo=[-1], hi=[]
- add(2): lo < 2, push to lo. lo=[-1, -2], hi=[]
- add(3): lo >= 2, push to hi. lo=[-1, -2], hi=[3]
- rebalance: lo=2, hi=1. OK.
- median: -lo[0] = 2. Correct!

Window [2, 3, 4]:
- remove(1): clean lo (top is -2, 1 not in to_remove... wait, 1 was in lo. Let me check: lo=[-1, -2], top is -1 which is 1. clean(lo) pops -1 since 1 is in to_remove. Now lo=[-2].
  - to_remove[1] = 1, clean(lo) pops -1, to_remove[1] becomes 0, deleted.
  - lo=[-2], hi=[3]
- add(4): lo < 2 (len=1), push to lo. lo=[-2, -4], hi=[3]
- rebalance: lo=2, hi=1. OK.
- median: -lo[0] = 2. 

Wait, the window is [2, 3, 4]. Median should be 3. But lo=[-2, -4] means lo contains 2 and 4? That's wrong.

The issue: when I add 4, I push to lo because len(lo) < lo_target. But 4 is larger than 3 (which is in hi). The heap property is maintained (it's a max-heap via negation), but the partition is wrong.

The problem is that after removal, lo has 1 element (2) and hi has 1 element (3). When I add 4, I push to lo because len(lo) < 2. But 4 should go to hi since it's >= 3.

I need to fix the add logic. The standard approach:
- If lo is not full, push to lo, then move the max of lo to hi if needed.
- Or: push to the appropriate heap based on comparison with the boundary.

Better approach for add:
```python
def add(val):
    if lo and val <= -lo[0]:
        heapq.heappush(lo, -val)
    else:
        heapq.heappush(hi, val)
    rebalance()
```

Let me re-trace:
Window [1, 2, 3]:
- add(1): lo is empty, so push to hi? No wait, if lo is empty, we should push to lo.
  
Let me handle the empty case:
```python
def add(val):
    if not lo:
        heapq.heappush(lo, -val)
    elif val <= -lo[0]:
        heapq.heappush(lo, -val)
    else:
        heapq.heappush(hi, val)
    rebalance()
```

Window [1, 2, 3]:
- add(1): lo empty, push to lo. lo=[-1], hi=[]
- add(2): 2 > -(-1)=1, push to hi. lo=[-1], hi=[2]
- add(3): 3 > 1, push to hi. lo=[-1], hi=[2, 3]
- rebalance: lo=1 < 2, hi=2 > 1. Move min of hi to lo: heappop(hi)=2, push to lo. lo=[-1, -2], hi=[3]
- median: -lo[0] = 2. Correct!

Window [2, 3, 4]:
- remove(1): clean(lo): top is -1, 1 in to_remove? We need to mark it first.
  
Wait, I need to mark the element for removal. Let me redo:

```python
def remove(val):
    clean(lo, True)
    clean(hi, False)
    if lo and val <= -lo[0]:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(lo, True)
    else:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(hi, False)
```

Window [2, 3, 4]:
- remove(1): clean(lo): top is -1 (value 1). Is 1 in to_remove? No, we haven't marked it yet. So clean does nothing.
  - lo=[-1, -2], top is -1, value 1. 1 <= 1, so mark to_remove[1]=1.
  - clean(lo): top is -1, 1 in to_remove, pop. to_remove[1]=0, delete. lo=[-2].
  - lo=[-2], hi=[3]
- add(4): 4 > -(-2)=2, push to hi. lo=[-2], hi=[3, 4]
- rebalance: lo=1 < 2, hi=2 > 1. Move min of hi to lo: heappop(hi)=3, push to lo. lo=[-2, -3], hi=[4]
- median: -lo[0] = 3. Correct!

Window [3, 4, 5]:
- remove(2): clean(lo): top is -2 (value 2). Not in to_remove. 
  - lo=[-2, -3], top is -2, value 2. 2 <= 2, mark to_remove[2]=1.
  - clean(lo): top is -2, 2 in to_remove, pop. lo=[-3].
  - lo=[-3], hi=[4]
- add(5): 5 > 3, push to hi. lo=[-3], hi=[4, 5]
- rebalance: lo=1 < 2, hi=2 > 1. Move min of hi to lo: heappop(hi)=4, push to lo. lo=[-3, -4], hi=[5]
- median: -lo[0] = 4. Correct!

Great, this works.

Now let me also handle the edge case where k=1:
- Just return the list as floats.

And the validation: k < 1 or k > len(nums) → ValueError.

Let me also think about the `clean` function more carefully. The `to_remove` dict maps values to counts. When we clean a heap, we pop the top if it's in to_remove. But what if there are duplicate values? For example, if we have [1, 1, 2] and k=3, and we remove one 1. to_remove[1] = 1. When we clean lo, top is -1 (value 1), we pop it. to_remove[1] becomes 0. Good.

But what if we have [1, 1, 1] and remove one 1? to_remove[1] = 1. Clean lo: top is -1, pop. to_remove[1] = 0. Good. The remaining two 1s are still in the heap.

What about [1, 2, 2, 3] with k=3? 
lo_target=2, hi_target=1
- add(1): lo=[-1]
- add(2): 2>1, hi=[2]
- add(2): 2>1, hi=[2, 2]
- rebalance: lo=1<2, hi=2>1. Move min hi to lo: heappop(hi)=2, push to lo. lo=[-1, -2], hi=[2]
- median: -lo[0]=2. Window [1,2,2], median=2. Correct.

Remove 1:
- clean(lo): top=-1, 1 not in to_remove. 
- lo=[-1, -2], top=-1, val=1. 1<=1, mark to_remove[1]=1.
- clean(lo): top=-1, 1 in to_remove, pop. lo=[-2].
- lo=[-2], hi=[2]

Add 3:
- 3 > 2, push to hi. lo=[-2], hi=[2, 3]
- rebalance: lo=1<2, hi=2>1. Move min hi to lo: heappop(hi)=2, push to lo. lo=[-2, -2], hi=[3]
- median: -lo[0]=2. Window [2,2,3], median=2. Correct!

Looks good. Let me also think about potential issues:
- Floating point: we're comparing floats, which should be fine.
- The `clean` function: we only clean the top of the heap. We don't need to clean the entire heap.

One more concern: in the `remove` function, after marking and cleaning, the heap sizes might be off. But we don't rebalance in `remove` - we rebalance after `add`. Since we always do remove then add then rebalance, the total after both operations is k, and rebalance fixes the sizes.

Wait, but what if after remove, lo has more than lo_target? E.g., lo had lo_target elements, we removed one from lo, so lo has lo_target - 1. Then we add to hi (since the new value is large). Now lo has lo_target - 1, hi has hi_target + 1. Rebalance: hi > hi_target, move from hi to lo. lo becomes lo_target, hi becomes hi_target. Good.

What if after remove, hi has more than hi_target? E.g., hi had hi_target elements, we removed one from hi, so hi has hi_target - 1. Then we add to lo (since new value is small). Now lo has lo_target + 1, hi has hi_target - 1. Rebalance: lo > lo_target, move from lo to hi. lo becomes lo_target, hi becomes hi_target. Good.

What if we remove from lo and add to lo? lo has lo_target - 1 + 1 = lo_target. hi has hi_target. Already balanced. Good.

What if we remove from hi and add to hi? hi has hi_target - 1 + 1 = hi_target. lo has lo_target. Already balanced. Good.

Great, the algorithm is correct.

Time complexity: Each add/remove is O(log k). Total: O(n log k). For n=200,000 and k=1,000, that's about 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. Well within 2 seconds.

Let me write the final solution:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    if k % 2 == 1:
        lo_target = (k + 1) // 2
        hi_target = k // 2
    else:
        lo_target = k // 2
        hi_target = k // 2
    
    lo: list[float] = []  # max-heap (negated)
    hi: list[float] = []  # min-heap
    to_remove: dict[float, int] = {}
    
    def clean(heap: list[float], is_lo: bool) -> None:
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if val in to_remove:
                heapq.heappop(heap)
                to_remove[val] -= 1
                if to_remove[val] == 0:
                    del to_remove[val]
            else:
                break
    
    def add(val: float) -> None:
        if not lo:
            heapq.heappush(lo, -val)
        elif val <= -lo[0]:
            heapq.heappush(lo, -val)
        else:
            heapq.heappush(hi, val)
    
    def remove(val: float) -> None:
        clean(lo, True)
        clean(hi, False)
        if lo and val <= -lo[0]:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(lo, True)
        else:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(hi, False)
    
    def rebalance() -> None:
        while len(lo) > lo_target:
            heapq.heappush(hi, -heapq.heappop(lo))
        while len(hi) > hi_target:
            heapq.heappush(lo, -heapq.heappop(hi))
    
    def get_median() -> float:
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (float(-lo[0]) + float(hi[0])) / 2.0
    
    # Build initial window
    for i in range(k):
        add(nums[i])
    rebalance()
    
    result = [get_median()]
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, I should double-check: after the initial window build, do we need rebalance? Let's trace:
- add(1): lo empty, push to lo. lo=[-1]
- add(2): 2 > 1, push to hi. lo=[-1], hi=[2]
- add(3): 3 > 1, push to hi. lo=[-1], hi=[2, 3]
- rebalance: lo=1 < 2, hi=2 > 1. Move min hi to lo: heappop(hi)=2, push to lo. lo=[-1, -2], hi=[3]

Yes, rebalance is needed. Good.

Let me also verify the even k case:
nums = [1, 2, 3, 4], k = 2
lo_target = 1, hi_target = 1

Window [1, 2]:
- add(1): lo empty, push to lo. lo=[-1]
- add(2): 2 > 1, push to hi. lo=[-1], hi=[2]
- rebalance: lo=1, hi=1. OK.
- median: (1 + 2) / 2 = 1.5. Correct!

Window [2, 3]:
- remove(1): clean(lo): top=-1, not in to_remove. lo=[-1], top=-1, val=1. 1<=1, mark to_remove[1]=1. clean(lo): pop -1. lo=[].
- add(3): lo empty, push to lo. lo=[-3], hi=[2]
- rebalance: lo=1, hi=1. OK.
- median: (3 + 2) / 2 = 2.5. Correct!

Window [3, 4]:
- remove(2): clean(lo): top=-3, not in to_remove. clean(hi): top=2, not in to_remove. 
  - lo=[-3], top=-3, val=3. 3<=3, mark to_remove[3]=1. clean(lo): pop -3. lo=[].
  
Wait, that's wrong! 2 is in hi, not lo. Let me re-check.

lo=[-3], hi=[2]. 
- clean(lo): top=-3, val=3. 3 not in to_remove. Don't pop.
- clean(hi): top=2, val=2. 2 not in to_remove. Don't pop.
- Now check: lo=[-3], top=-3, val=3. Is 2 <= 3? Yes! So we mark to_remove[2]=1 and clean(lo).
- clean(lo): top=-3, val=3. 3 not in to_remove. Don't pop.

Hmm, that's a problem. 2 is in hi, but the check `val <= -lo[0]` says 2 <= 3, so we think it's in lo. But it's actually in hi!

The issue is that the check `val <= -lo[0]` is not sufficient to determine which heap an element is in. An element could be in hi even if it's less than lo's max.

For example, lo=[-3] (contains 3), hi=[2] (contains 2). 2 < 3, so the check says it's in lo, but it's actually in hi.

This is a fundamental issue with the lazy deletion approach. The check `val <= -lo[0]` doesn't correctly identify which heap the element is in when there are elements that "cross" the boundary.

Wait, actually in a correct two-heap setup, all elements in lo should be <= all elements in hi. So if the partition is maintained correctly, any element with value <= max(lo) should be in lo, and any element with value > max(lo) should be in hi.

But in my example: lo=[-3] (contains 3), hi=[2] (contains 2). 2 < 3, so the partition is violated! The correct partition should be lo=[-2] (contains 2), hi=[3] (contains 3).

The issue is that after removing 1 and adding 3, the rebalance didn't fix the partition properly. Let me re-trace:

After window [1, 2]: lo=[-1], hi=[2]. Partition: 1 <= 2. Correct.

Remove 1: lo becomes empty (after lazy removal). hi=[2].
Add 3: lo is empty, so push to lo. lo=[-3], hi=[2].

Now the partition is violated: 3 > 2, but 3 is in lo and 2 is in hi.

The rebalance only moves elements based on size, not value. lo=1, hi=1, both at target. So no rebalancing happens.

This is the bug! The rebalance should also ensure the partition property.

Fix: In rebalance, after adjusting sizes, we should also ensure that max(lo) <= min(hi). If not, swap.

```python
def rebalance() -> None:
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))
    # Ensure partition: max(lo) <= min(hi)
    if lo and hi and -lo[0] > hi[0]:
        # Swap the two boundary elements
        a = -heapq.heappop(lo)
        b = heapq.heappop(hi)
        heapq.heappush(lo, -b)
        heapq.heappush(hi, a)
```

Let me re-trace with the fix:

Window [1, 2]: lo=[-1], hi=[2]. 
- rebalance: sizes OK. Partition: 1 <= 2. OK.
- median: (1+2)/2 = 1.5. ✓

Remove 1: 
- clean(lo): top=-1, not in to_remove. 
- lo=[-1], top=-1, val=1. 1<=1, mark to_remove[1]=1. clean(lo): pop -1. lo=[].
- lo=[], hi=[2]

Add 3:
- lo empty, push to lo. lo=[-3], hi=[2]

Rebalance:
- Sizes: lo=1, hi=1. OK.
- Partition: -lo[0]=3, hi[0]=2. 3 > 2. Swap!
  - a = heappop(lo) negated = 3. b = heappop(hi) = 2.
  - push 2 to lo: lo=[-2]. push 3 to hi: hi=[3].
- lo=[-2], hi=[3]. Partition: 2 <= 3. OK.

Median: (2+3)/2 = 2.5. ✓

Now remove 2:
- clean(lo): top=-2, not in to_remove.
- clean(hi): top=3, not in to_remove.
- lo=[-2], top=-2, val=2. 2<=2, mark to_remove[2]=1. clean(lo): pop -2. lo=[].
- lo=[], hi=[3]

Add 4:
- lo empty, push to lo. lo=[-4], hi=[3]

Rebalance:
- Sizes: lo=1, hi=1. OK.
- Partition: 4 > 3. Swap!
  - a=4, b=3. lo=[-3], hi=[4].
- Partition: 3 <= 4. OK.

Median: (3+4)/2 = 3.5. ✓

The fix works. But wait, I need to be careful: the swap might not be sufficient if there are more violations. Actually, since we only ever move one element at a time (and the heaps maintain their internal order), a single swap should fix the partition. Let me think...

After the swap, lo contains the smaller element and hi contains the larger element. Since both heaps maintain their heap property internally, and we've ensured max(lo) <= min(hi), the partition is correct.

Actually, is a single swap always sufficient? Consider: lo=[-5, -4] (contains 5, 4), hi=[3, 2] (contains 3, 2). This would mean max(lo)=5 > min(hi)=2. After swap: a=5, b=2. lo=[-4, -2] (contains 4, 2), hi=[3, 5] (contains 3, 5). Now max(lo)=4 > min(hi)=3. Still violated!

Hmm, but can this situation actually arise? Let me think about when it could happen.

In our algorithm, we add one element at a time and remove one element at a time. The heaps are always in a state where the partition is maintained (after rebalance). So the only way the partition gets violated is:
1. We add an element to the "wrong" heap (when lo is empty, we push to lo regardless of value)
2. We remove an element, changing the effective sizes

In case 1: lo was empty, we push val to lo. If val > min(hi), the partition is violated. A single swap fixes it because after the swap, lo has the smaller of the two boundary elements, and hi has the larger.

In case 2: we remove from lo (or hi), changing sizes. Then we add to the other heap. The new element might violate the partition. But again, a single swap should fix it because the violation is only at the boundary.

Actually, I think the issue is more subtle. Let me think about whether multiple swaps could be needed.

After a single add or remove, at most one element is "out of place" at the boundary. So a single swap should suffice.

Wait, but what about the initial build? We add k elements one by one. After each add, we rebalance. The rebalance handles both size and partition. So after the initial build, the partition is correct.

I think a single swap in rebalance is sufficient. Let me verify with a more complex example.

Actually, let me reconsider. The issue is: can we have a situation where max(lo) > min(hi) by more than just one element?

In our algorithm:
- We always maintain the invariant that all elements in lo <= all elements in hi (after rebalance).
- When we add a new element, it goes to lo (if lo has space) or hi. If it goes to lo but is larger than min(hi), we need to swap.
- When we remove an element, the partition might be temporarily violated, but after add + rebalance, it's fixed.

I believe a single swap is sufficient because:
- The heaps internally maintain their order.
- The only violation is at the boundary (the max of lo vs min of hi).
- Swapping the two boundary elements fixes the violation.

Let me just go with the single swap and test it mentally a few more times.

Actually, I realize there might be an issue with the `remove` function. When we check `val <= -lo[0]`, if lo is empty after cleaning, we'd go to the else branch (mark in hi). But what if the element was actually in lo and lo became empty?

Hmm, if lo becomes empty after cleaning, that means the element we removed was the only element in lo. In that case, `lo` is empty, and we'd go to the else branch, marking the element in hi. But the element was in lo!

Wait, let me re-examine. If lo had exactly one element and we remove it:
- clean(lo): pops the element (if it's in to_remove). lo becomes empty.
- Then we check: `if lo and val <= -lo[0]` → lo is empty, so we go to else.
- We mark to_remove[val] += 1 and clean(hi).
- But the element was in lo, not hi! The to_remove entry is now useless (the element was already popped).

Actually wait, the element was already popped during clean(lo). So the to_remove entry is indeed useless. The element is gone from the heap. The to_remove dict just has a stale entry that will never be cleaned.

But this means the effective count is wrong. We removed one element from lo, but we didn't account for it in the rebalancing correctly.

Hmm, let me think about this differently. The lazy deletion approach:
- When we mark an element for removal and clean the heap, the element is physically removed from the heap.
- The to_remove dict is just a mechanism to know which elements to remove from the top.
- Once the element is popped, the to_remove entry is decremented.

So in the case where lo becomes empty after cleaning:
- The element was in lo, got popped. to_remove[val] was decremented.
- lo is now empty.
- We then go to the else branch: to_remove[val] += 1 (but this is wrong, the element is already gone).
- clean(hi): checks if hi's top is val. It's not (val was in lo). So nothing happens.
- Now to_remove has a stale entry for val.

This is a bug! The to_remove entry for val now has count 1, but the element is already gone. This will cause a future clean to incorrectly pop an element.

Wait, no. Let me re-read my code:

```python
def remove(val: float) -> None:
    clean(lo, True)
    clean(hi, False)
    if lo and val <= -lo[0]:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(lo, True)
    else:
        to_remove[val] = to_remove.get(val, 0) + 1
        clean(hi, False)
```

First, we clean both heaps (removing any previously marked elements from the tops).
Then we determine which heap val is in.
If lo is non-empty and val <= max(lo), we mark val for removal from lo.
Otherwise, we mark val for removal from hi.

The issue: if lo becomes empty after the first clean, and val was in lo, we'd incorrectly mark it for hi.

But wait: if lo becomes empty after cleaning, it means all elements in lo were marked for removal. But we only mark one element at a time. So if lo had one element and it was marked for removal, it gets popped, and lo is empty.

In that case, val was in lo (it was the only element). After the first clean, lo is empty. Then we check `if lo and val <= -lo[0]` → False (lo is empty). We go to else, marking val for hi. But val is already gone!

This is indeed a bug. The fix: if lo is empty after cleaning, and val was in lo, we should not mark it for hi.

How do we know if val was in lo? If lo was non-empty before cleaning and val <= max(lo), then val was in lo. But after cleaning, lo might be empty.

Alternative approach: instead of checking `val <= -lo[0]`, we can track which heap each element is in. But that's complex with the lazy deletion.

Actually, let me reconsider. The scenario where lo becomes empty after cleaning:
- lo had exactly one element, which was marked for removal.
- That element was val (the one we're removing now).
- Wait, no. The first `clean(lo, True)` removes previously marked elements. If lo had one element that was previously marked, it gets popped. Then lo is empty.
- But then we're trying to remove a NEW element (val). If lo is empty, val can't be in lo.

Oh wait, I think I was confusing myself. Let me re-read the algorithm:

The `remove(val)` function is called when `val` is leaving the window. At this point, `val` is definitely in one of the heaps (lo or hi). The question is which one.

The first `clean` calls remove any previously lazy-deleted elements from the tops. This might change the heaps.

After cleaning, we check which heap `val` is in. If lo is non-empty and val <= max(lo), val is in lo. Otherwise, val is in hi.

The case where lo becomes empty: this means all elements in lo were previously marked for removal. But wait, we only mark one element per remove call. So at most one element in lo is marked. If lo had exactly one element and it was marked, after cleaning, lo is empty.

But if lo is empty, then val (which is in the window) must be in hi. So the else branch is correct!

Wait, but what if val was in lo and lo had multiple elements? Then after cleaning, lo still has elements (only the marked one was removed). So lo is non-empty, and we correctly identify val as being in lo.

The only problematic case is: lo had exactly one element, it was previously marked for removal, and val is that element. After cleaning, lo is empty. But val is already gone from the heap! We shouldn't be removing it again.

Hmm, but this can't happen because: we mark an element for removal, then clean pops it. The element is gone. If we then try to remove the same element again, that's a logic error in our algorithm (we'd be removing an element that's no longer in the window).

Actually, in the sliding window, each element enters once and leaves once. So we never remove the same element twice. The lazy deletion is for the element that's leaving the window. We mark it, clean pops it. Done.

So the scenario I was worried about (lo becoming empty after cleaning a previously marked element) would mean that a previous remove call marked an element in lo, and it's now being cleaned. The current `remove(val)` is for a different element. If lo is empty after cleaning, val must be in hi. The else branch is correct.

OK so I think the logic is actually correct. Let me re-examine:

1. We call `remove(val)`. val is in the window, so it's in either lo or hi.
2. We clean both heaps (removing any previously lazy-deleted elements from the tops).
3. After cleaning, we determine which heap val is in:
   - If lo is non-empty and val <= max(lo): val is in lo.
   - Otherwise: val is in hi.
4. We mark val for removal from the appropriate heap.
5. We clean that heap (popping val if it's at the top).

The key insight: after step 2, the partition property holds (because we rebalanced after the previous operation). So all elements in lo <= all elements in hi. Therefore, if val <= max(lo), val is in lo. If val > max(lo), val is in hi. And if lo is empty, val must be in hi.

This is correct! The partition property ensures the check works.

But wait, does the partition property hold after cleaning? Cleaning removes elements from the top of a heap. If we remove the max of lo, the new max of lo is still <= min(hi) (since the old max was <= min(hi), and the new max is smaller). If we remove the min of hi, the new min of hi is still >= max(lo) (since the old min was >= max(lo), and the new min is larger). So yes, the partition property is preserved after cleaning.

Great, so the algorithm is correct. Let me finalize the code.

One more thing: I should make sure the `rebalance` function also handles the case where we need to move elements to fix the partition, not just sizes.

```python
def rebalance() -> None:
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))
    # Fix partition
    if lo and hi and -lo[0] > hi[0]:
        a = -heapq.heappop(lo)
        b = heapq.heappop(hi)
        heapq.heappush(lo, -b)
        heapq.heappush(hi, a)
```

I think this is correct. Let me write the final version.

Actually, wait. I want to double-check: can the partition violation require more than one swap? 

After rebalancing sizes, we have lo_target elements in lo and hi_target in hi. The only possible violation is at the boundary: max(lo) > min(hi). After swapping the two boundary elements, max(lo) becomes the old min(hi) and min(hi) becomes the old max(lo). Since old max(lo) > old min(hi), after swap: new max(lo) = old min(hi) < old max(lo) = new min(hi). So the partition is fixed.

But wait, after the swap, is it possible that the new max(lo) > new min(hi)? The new max(lo) is the max of the remaining lo elements (which are all <= old max(lo)) and the new element (old min(hi)). The new min(hi) is the min of the remaining hi elements (which are all >= old min(hi)) and the new element (old max(lo)).

So new max(lo) <= max(old max(lo), old min(hi)) = old max(lo) (since old max(lo) > old min(hi)).
And new min(hi) >= min(old min(hi), old max(lo)) = old min(hi) (since old max(lo) > old min(hi)).

So new max(lo) <= old max(lo) and new min(hi) >= old min(hi). Since old max(lo) > old min(hi), we can't conclude new max(lo) <= new min(hi) directly.

Hmm, let me think of a concrete example:
lo = [5, 4, 3] (max-heap, contains 5, 4, 3), hi = [2, 1] (min-heap, contains 2, 1)
lo_target = 2, hi_target = 2.

After size rebalance: lo has 3 > 2, move max(lo)=5 to hi. lo=[4,3], hi=[2,1,5]. Now hi has 3 > 2, move min(hi)=1 to lo. lo=[4,3,1], hi=[2,5]. Now lo has 3 > 2, move max(lo)=4 to hi. lo=[3,1], hi=[2,5,4]. Now hi has 3 > 2, move min(hi)=2 to lo. lo=[3,1,2], hi=[5,4]. Now lo has 3 > 2, move max(lo)=3 to hi. lo=[2,1], hi=[5,4,3]. Now hi has 3 > 2, move min(hi)=3 to lo. lo=[2,1,3], hi=[5,4]. ...

This is getting complicated. But in practice, in our sliding window algorithm, we only add/remove one element at a time, so the size difference is at most 1 from target. The rebalance would only move at most 1 element.

Let me simplify: in our algorithm, after remove + add, the total is k. The size of lo could be lo_target - 1 or lo_target + 1 (at most 1 off). Similarly for hi. So the rebalance moves at most 1 element. After that, the partition check with a single swap fixes things.

I'll go with this approach. Let me finalize.

Actually, I realize I should also handle the case where `lo` might need to receive an element from `hi` during rebalance (when lo is below target). My current rebalance only handles the case where lo is above target or hi is above target. Let me fix:

```python
def rebalance() -> None:
    while len(lo) > lo_target:
        heapq.heappush(hi, -heapq.heappop(lo))
    while len(hi) > hi_target:
        heapq.heappush(lo, -heapq.heappop(hi))
    # If lo is below target, move from hi to lo
    while len(lo) < lo_target:
        heapq.heappush(lo, -heapq.heappop(hi))
    # Fix partition
    if lo and hi and -lo[0] > hi[0]:
        a = -heapq.heappop(lo)
        b = heapq.heappop(hi)
        heapq.heappush(lo, -b)
        heapq.heappush(hi, a)
```

Wait, but if len(lo) < lo_target, that means len(hi) > hi_target (since total is k). So the `while len(hi) > hi_target` loop would already handle it. Let me verify:

Total = k = lo_target + hi_target.
If len(lo) < lo_target, then len(hi) = k - len(lo) > k - lo_target = hi_target. So the `while len(hi) > hi_target` loop moves elements from hi to lo until len(lo) = lo_target.

So I don't need the `while len(lo) < lo_target` line. The existing loops handle it.

Let me also consider: what if both loops fire? E.g., len(lo) = lo_target + 1 and len(hi) = hi_target - 1. First loop: move from lo to hi. Now len(lo) = lo_target, len(hi) = hi_target. Second loop: hi is at target, doesn't fire. Good.

Or: len(lo) = lo_target - 1 and len(hi) = hi_target + 1. First loop: lo is at target - 1, doesn't fire. Second loop: move from hi to lo. Now len(lo) = lo_target, len(hi) = hi_target. Good.

OK, the rebalance is correct without the extra line.

Let me write the final clean version:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    if k % 2 == 1:
        lo_target = (k + 1) // 2
        hi_target = k // 2
    else:
        lo_target = k // 2
        hi_target = k // 2
    
    lo: list[float] = []
    hi: list[float] = []
    to_remove: dict[float, int] = {}
    
    def clean(heap: list[float], is_lo: bool) -> None:
        while heap:
            val = -heap[0] if is_lo else heap[0]
            if val in to_remove:
                heapq.heappop(heap)
                to_remove[val] -= 1
                if to_remove[val] == 0:
                    del to_remove[val]
            else:
                break
    
    def add(val: float) -> None:
        if not lo:
            heapq.heappush(lo, -val)
        elif val <= -lo[0]:
            heapq.heappush(lo, -val)
        else:
            heapq.heappush(hi, val)
    
    def remove(val: float) -> None:
        clean(lo, True)
        clean(hi, False)
        if lo and val <= -lo[0]:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(lo, True)
        else:
            to_remove[val] = to_remove.get(val, 0) + 1
            clean(hi, False)
    
    def rebalance() -> None:
        while len(lo) > lo_target:
            heapq.heappush(hi, -heapq.heappop(lo))
        while len(hi) > hi_target:
            heapq.heappush(lo, -heapq.heappop(hi))
        if lo and hi and -lo[0] > hi[0]:
            a = -heapq.heappop(lo)
            b = heapq.heappop(hi)
            heapq.heappush(lo, -b)
            heapq.heappush(hi, a)
    
    def get_median() -> float:
        clean(lo, True)
        clean(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (float(-lo[0]) + float(hi[0])) / 2.0
    
    for i in range(k):
        add(nums[i])
    rebalance()
    
    result = [get_median()]
    
    for i in range(k, len(nums)):
        remove(nums[i - k])
        add(nums[i])
        rebalance()
        result.append(get_median())
    
    return result
```

Let me do one more trace to make sure:

nums = [1, 3, 2, 4, 5], k = 3
lo_target = 2, hi_target = 1

Window [1, 3, 2]:
- add(1): lo empty, push to lo. lo=[-1]
- add(3): 3 > 1, push to hi. lo=[-1], hi=[3]
- add(2): 2 > 1, push to hi. lo=[-1], hi=[3, 2]
- rebalance: lo=1 < 2, hi=2 > 1. Move min(hi)=2 to lo. lo=[-1, -2], hi=[3].
  - Partition: max(lo)=2, min(hi)=3. 2 <= 3. OK.
- median: -lo[0] = 2. Window [1,2,3], median=2. ✓

Window [3, 2, 4]:
- remove(1): clean(lo): top=-1, not in to_remove. clean(hi): top=3, not in to_remove.
  - lo=[-1, -2], top=-1, val=1. 1<=1, mark to_remove[1]=1. clean(lo): pop -1. lo=[-2].
  - lo=[-2], hi=[3]
- add(4): 4 > 2, push to hi. lo=[-2], hi=[3, 4]
- rebalance: lo=1 < 2, hi=2 > 1. Move min(hi)=3 to lo. lo=[-2, -3], hi=[4].
  - Partition: max(lo)=3, min(hi)=4. 3 <= 4. OK.
- median: -lo[0] = 3. Window [2,3,4], median=3. ✓

Window [2, 4, 5]:
- remove(3): clean(lo): top=-3, not in to_remove. clean(hi): top=4, not in to_remove.
  - lo=[-2, -3], top=-3, val=3. 3<=3, mark to_remove[3]=1. clean(lo): pop -3. lo=[-2].
  - lo=[-2], hi=[4]
- add(5): 5 > 2, push to hi. lo=[-2], hi=[4, 5]
- rebalance: lo=1 < 2, hi=2 > 1. Move min(hi)=4 to lo. lo=[-2, -4], hi=[5].
  - Partition: max(lo)=4, min(hi)=5. 4 <= 5. OK.
- median: -lo[0] = 4. Window [2,4,5], median=4. ✓

All correct!

Now let me think about performance. For n=200,000 and k=1,000:
- We do (n-k+1) iterations of the main loop = 199,001 iterations.
- Each iteration: remove (O(log k)), add (O(log k)), rebalance (O(log k)), get_median (O(log k) for cleaning).
- Total: O(n log k) ≈ 200,000 * 10 = 2,000,000 heap operations.
- Each heap operation is O(log k) ≈ O(10).
- Total operations: ~20,000,000. Well under 2 seconds in Python.

Actually, the cleaning in get_median could be O(k) in the worst case if many elements need to be cleaned. But in practice, each element is cleaned at most once, so the total cleaning cost over all iterations is O(n).

I'm satisfied with this solution. Let me write the final version.
