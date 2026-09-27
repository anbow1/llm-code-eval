I need to implement a sliding window median function that's efficient for n=200,000 and k=1,000.

The naive approach would be O(n*k) which is 200,000 * 1,000 = 200 million operations - too slow.

A better approach is to use two heaps (a max-heap for the lower half and a min-heap for the upper half) to maintain the median in O(log k) per operation.

For sliding window median with two heaps:
- Max heap for lower half (we negate values for Python's min-heap)
- Min heap for upper half
- We need to support removal of arbitrary elements (when they slide out of the window)

The standard approach:
1. Use two heaps: max_heap (negated for Python) for the lower half, min_heap for the upper half
2. Maintain sizes so that max_heap has either k//2 or (k+1)//2 elements
3. When removing an element, use lazy deletion (mark as deleted in a counter, clean when it reaches the top)

Let me think about the algorithm more carefully:

Approach: Two heaps with lazy deletion
- `low` = max heap (store negated values) for the lower half
- `high` = min heap for the upper half
- `delayed` = dict/Counter tracking elements to be removed
- Balance: len(low) should be either len(high) or len(high) + 1 (for odd k), or equal (for even k)

Actually, let me think about this differently. For a window of size k:
- If k is odd: median is the max of the lower half (lower half has (k+1)//2 elements)
- If k is even: median is average of max of lower half and min of upper half (each has k//2 elements)

So I'll maintain:
- `low` (max heap, negated): should have (k+1)//2 elements
- `high` (min heap): should have k//2 elements

Wait, let me reconsider. For even k:
- k=4: lower half has 2, upper half has 2. Median = (max_lower + min_upper) / 2
- k=5: lower half has 3, upper half has 2. Median = max_lower

So: len(low) = (k+1)//2, len(high) = k//2

Algorithm:
1. Initialize with first k elements
2. For each subsequent window, remove the element leaving and add the element entering
3. Use lazy deletion for removals

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max heap (negated)
    high = []  # min heap
    delayed = defaultdict(int)  # count of elements to remove
    
    low_size = 0  # size of low excluding delayed
    high_size = 0  # size of high excluding delayed
    
    def clean(heap):
        # Remove delayed elements from top of heap
        while heap and -heap[0][0] in delayed:  # Wait, I'm storing tuples? No...
            ...
    
    # Actually, let me store just values and track delayed separately
```

Wait, the issue with using just values is that if the same value appears multiple times, I need to track counts properly. Let me use a Counter for delayed deletions.

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max heap (store negated)
    high = []  # min heap
    delayed = {}  # value -> count of pending deletions
    
    low_size = 0
    high_size = 0
    
    def clean(heap):
        while heap:
            # For low (max heap), top is -heap[0]
            # For high (min heap), top is heap[0]
            if heap is low:
                top = -heap[0]
            else:
                top = heap[0]
            if top in delayed and delayed[top] > 0:
                if delayed[top] > 1:
                    delayed[top] -= 1
                else:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def add_to_low(val):
        heapq.heappush(low, -val)
        low_size += 1
    
    def add_to_high(val):
        heapq.heappush(high, val)
        high_size += 1
    
    def remove_from_heap(val):
        # Determine which heap val is in
        if val <= -low[0]:
            delayed[-low[0]] = delayed.get(-low[0], 0) + 1  # Wait, this isn't right
```

Hmm, let me reconsider. The standard approach from LeetCode 480:

```python
def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    
    low = []  # max heap (negated)
    high = []  # min heap
    delayed = {}  # key: value, value: count to remove
    low_size = 0
    high_size = 0
    
    def clean(heap):
        # heap is either low or high
        # top of heap needs to be checked
        while heap:
            # Get top value (un-negated)
            if heap is low:
                top = -heap[0]
            else:
                top = heap[0]
            if top in delayed and delayed[top] > 0:
                if delayed[top] > 1:
                    delayed[top] -= 1
                else:
                    del delayed[top]
                heapq.heappop(heap)
            else:
                break
    
    def add_to_low(val):
        nonlocal low_size
        heapq.heappush(low, -val)
        low_size += 1
    
    def add_to_high(val):
        nonlocal high_size
        heapq.heappush(high, val)
        high_size += 1
    
    def remove_smallest():
        # Remove from low (which is the smallest in the window)
        nonlocal low_size
        heapq.heappop(low)
        low_size -= 1
    
    def remove_largest():
        # Remove from high
        nonlocal high_size
        heapq.heappop(high)
        high_size -= 1
    
    def median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return -low[0]  # median is max of lower half
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        if not low or nums[i] <= -low[0]:
            add_to_low(nums[i])
        else:
            add_to_high(nums[i])
    
    # Balance: low should have (k+1)//2, high should have k//2
    while low_size > (k + 1) // 2:
        # Move from low to high
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1
    while high_size > k // 2:
        val = heapq.heappop(high)
        high_size -= 1
        heapq.heappush(low, -val)
        low_size += 1
    
    result = [median()]
    
    for i in range(k, n):
        out = nums[i - k]
        in_ = nums[i]
        
        if out <= -low[0]:
            # out is in low
            delayed[out] = delayed.get(out, 0) + 1
            low_size -= 1
        else:
            # out is in high
            delayed[out] = delayed.get(out, 0) + 1
            high_size -= 1
        
        if in_ <= -low[0]:
            add_to_low(in_)
        else:
            add_to_high(in_)
        
        # Balance
        while low_size > (k + 1) // 2:
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        while high_size > k // 2:
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        # Also need to handle low_size < (k+1)//2
        # Actually, we also need: while high_size > k//2: move to low
        # And: while low_size > (k+1)//2: move to high
        
        clean(low)
        clean(high)
        
        result.append(median())
    
    return result
```

Wait, I'm double-cleaning. Let me restructure.

Actually, there's a subtlety. When I check `out <= -low[0]`, I need to make sure low[0] is clean first. Let me restructure:

Actually, let me think about this more carefully. The issue is:
1. When removing `out`, I need to know if it belongs to `low` or `high`. I check if `out <= -low[0]` (the max of the lower half). But I need low[0] to be clean.
2. After adding and removing, I need to rebalance.

Let me also handle the edge case where low or high might be empty after cleaning.

Let me also think about the `clean` function. When I pop from a heap in `clean`, I'm popping the top element. But what if the top element has a delayed count of 2? Then I pop once and decrement. Next time clean is called, I pop again.

Wait, actually the standard approach is:
- `delayed` maps a value to how many times it should be removed
- When cleaning, if the top of the heap is in delayed, pop it and decrement (or remove from delayed)
- This handles duplicates correctly

Let me also be careful: when I do `remove_smallest` or `remove_largest` in rebalancing, I should NOT use delayed - I should directly pop from the heap. But wait, the top might be a delayed element...

Actually, I think the cleanest approach is:
- When rebalancing, first clean both heaps, then move elements.
- When moving an element from one heap to another, pop it (it should be clean since we just cleaned) and push to the other.

Let me also handle the case where after cleaning, a heap might be empty.

Let me rewrite more carefully:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max heap (negated)
    high = []  # min heap
    delayed = defaultdict(int)
    low_size = 0
    high_size = 0
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean(heap):
        while heap:
            top = -heap[0] if heap is low else heap[0]
            if delayed[top]:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def add_to_low(val):
        nonlocal low_size
        heapq.heappush(low, -val)
        low_size += 1
    
    def add_to_high(val):
        nonlocal high_size
        heapq.heappush(high, val)
        high_size += 1
    
    def rebalance():
        # Move elements to maintain target sizes
        while low_size > target_low:
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        while high_size > target_high:
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        # Also need to handle the case where one is too small
        while low_size < target_low:
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while high_size < target_high:
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
    
    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return -low[0]
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize with first k elements
    for i in range(k):
        if not low or nums[i] <= -low[0]:
            add_to_low(nums[i])
        else:
            add_to_high(nums[i])
    
    rebalance()
    result = [get_median()]
    
    for i in range(k, n):
        out = nums[i - k]
        in_val = nums[i]
        
        # Determine where 'out' belongs
        clean(low)
        clean(high)
        
        if out <= -low[0]:
            delayed[out] += 1
            low_size -= 1
        else:
            delayed[out] += 1
            high_size -= 1
        
        # Add new element
        if not low or in_val <= -low[0]:
            add_to_low(in_val)
        else:
            add_to_high(in_val)
        
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, there's an issue with rebalance. When I pop from low in rebalance, the top might be a delayed element. But I should have cleaned before rebalancing... Actually, in `rebalance`, I'm popping and moving elements. If the top is delayed, I'm moving a delayed element to the other heap, which is wrong.

Hmm, but actually in the rebalance step, I'm popping the "real" top after cleaning. Let me make sure I clean before rebalancing.

Actually wait - in my current code, I clean before determining where 'out' goes, and then I add the new element, and then I rebalance. But during rebalance, I might pop elements that are delayed. Let me clean before each pop in rebalance.

Actually, a simpler approach: clean at the start of rebalance, and since we're only moving the top elements (which are clean), it should be fine. But what if after moving one element, the next top is delayed? That can't happen because we just cleaned.

Wait, actually it can. Consider: low has [A, B, C] (A is delayed). We clean, pop A. Now low has [B, C]. If low_size > target, we pop B and move to high. B is clean. Fine.

But what about this: low has [A, B] where A is not delayed. high has [C, D] where C is delayed. We clean high, pop C. Now high has [D]. If high_size > target, we pop D and move to low. D is clean. Fine.

I think as long as I clean before rebalancing, it should work because:
- After cleaning, the tops are clean
- When I pop a clean top and move it, the new top might be delayed
- But I only pop one element per while iteration... wait no, the while loop could pop multiple times.

Let me add cleaning inside the while loops of rebalance:

```python
def rebalance():
    while low_size > target_low:
        clean(low)
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1
    while high_size > target_high:
        clean(high)
        val = heapq.heappop(high)
        high_size -= 1
        heapq.heappush(low, -val)
        low_size += 1
    while low_size < target_low:
        clean(high)
        val = heapq.heappop(high)
        high_size -= 1
        heapq.heappush(low, -val)
        low_size += 1
    while high_size < target_high:
        clean(low)
        val = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, val)
        high_size += 1
```

Hmm, but this is getting complex. Let me think about whether the simpler version works.

Actually, I think the key insight is: in the rebalance step, we're moving the boundary element. After we've done all additions and removals for a window step, we need the sizes to be correct. The actual values in the heaps don't matter for correctness of size tracking - only the lazy deletion matters for getting the correct median.

Wait, no. If I pop a delayed element from low and push it to high, then in high it's a "real" element. But it's supposed to be deleted! That's a bug.

So I MUST clean before popping in rebalance. Let me include clean() calls in rebalance.

Actually, let me reconsider the whole approach. Let me look at this from a different angle.

The standard sliding window median with two heaps:

The key operations per window:
1. Remove element leaving the window (lazy deletion)
2. Add element entering the window
3. Rebalance
4. Compute median

For step 3, rebalancing means moving elements between heaps to maintain size invariants. When moving, we pop from one heap and push to the other. The element we pop should NOT be a delayed element.

So: clean the source heap before popping.

Let me also handle the edge case where k=1 separately (already doing that).

Let me also think about potential issues:
- What if both heaps have the same value at the boundary? E.g., nums = [1, 1, 1], k = 2. low = [1], high = [1]. out = 1. Is out <= -low[0]? Yes (1 <= 1). So we mark delayed[1] += 1, low_size -= 1. Then we add 1: 1 <= -low[0]? 1 <= 1, yes. add_to_low(1). Now low_size = 1 (was 0 after removal, +1 after add). high_size = 1. target_low = 1, target_high = 1. Balanced. Median: clean(low) - top is 1, delayed[1] = 1, pop it. delayed[1] = 0. Now low is empty! But low_size = 1...

Wait, that's a problem. After cleaning, low is empty but low_size says 1. Then -low[0] would fail.

Hmm, I think the issue is that when I do the lazy deletion, I'm decrementing low_size but the element is still in the heap. When I clean, I pop it. So after cleaning, the heap size matches low_size. That's fine.

But in the example: after removing out=1 (delayed[1]=1, low_size=0) and adding in=1 (low_size=1, heap has [1(old), -1(new)]), the heap has two elements but low_size is 1. When we clean: top is 1 (the old one), delayed[1]=1, so we pop it. Now heap has [-1], low_size=1. Good.

Wait, I'm confusing myself. Let me redo:
- Initially: low = [-1] (storing -1 to make it a max-heap of [1]), low_size = 1, high = [1], high_size = 1
- delayed = {}
- out = nums[0] = 1. Check: out <= -low[0]? 1 <= 1? Yes. So delayed[1] += 1 → delayed = {1:1}, low_size = 0.
- in = nums[2] = 1. Check: in <= -low[0]? 1 <= 1? Yes. add_to_low(1): low = [-1, -1], low_size = 1.
- Rebalance: low_size=1, target_low=1. high_size=1, target_high=1. Balanced.
- get_median: clean(low): top is 1 (=-low[0]=-(-1)=1), delayed[1]=1, pop. delayed[1]=0. low=[-1], low_size should still be 1 (we didn't change it in clean). Wait, but I popped from the heap!

Ah, I see the issue. When I clean (pop from heap), I should also decrement the size. OR, I should NOT track size separately and instead use len(heap) after cleaning.

Let me reconsider. There are two approaches:
1. Track sizes separately (low_size, high_size) and when cleaning, also decrement the size.
2. Don't track sizes separately; clean the heaps and use len().

Actually approach 1 is standard. When I do a lazy deletion (mark in delayed), I decrement the size. When I clean (actually remove from heap), I don't change the size because I already decremented it when marking.

Wait no. Let me re-examine:
- low_size tracks the "logical" size (how many elements should be in low)
- When I mark an element as delayed AND it belongs to low, I decrement low_size
- When I clean (pop from heap), the heap shrinks but low_size stays the same (I already decremented it)

So after: mark delayed (low_size 1→0), add to low (low_size 0→1, heap size 1→2). Now heap has 2 elements, low_size=1.
Clean: pop one (the delayed one). Heap has 1 element, low_size=1. Now heap size == low_size. ✓

OK so the size tracking is correct. The heap can have more elements than low_size (due to delayed elements), but after cleaning, they match.

So in my example:
- After all operations: low = [-1, -1], low_size = 1, high = [1], high_size = 1
- get_median: clean(low): top = -(-1) = 1. delayed[1] = 1. Pop. delayed[1] = 0. low = [-1].
  clean(high): top = 1. delayed[1] = 0. Stop.
  k is even: (-low[0] + high[0]) / 2 = (1 + 1) / 2 = 1.0 ✓

Great, that works.

Now let me also think about: what if after cleaning, a heap is empty but its size is 0? That's fine, we just don't use it.

What if k is odd? target_low = (k+1)//2, target_high = k//2. Median = -low[0]. We need low to be non-empty. Since target_low >= 1 for k >= 1, and we maintain low_size = target_low after rebalancing, low should have at least one element.

What about k=1? target_low = 1, target_high = 0. We handle k=1 separately.

OK let me also think about performance. n=200,000, k=1,000.
- Initialization: O(k log k) = O(1000 * 10) = O(10,000)
- Each of the n-k steps: O(log k) for add + O(log k) for rebalance (at most 1-2 moves) + O(1) amortized for cleaning
- Total: O((n-k) * log k) ≈ O(200,000 * 10) = O(2,000,000)

That should be well within 2 seconds.

But wait, in Python, each heap operation is O(log k) but with a larger constant factor. Let me estimate: 200,000 * 10 = 2,000,000 heap operations. Each is O(log 1000) ≈ 10 comparisons. So ~20,000,000 comparisons. In Python, that's probably 1-2 seconds. Should be OK.

Actually, let me think about whether there's a faster approach. One option is to use a balanced BST or a Fenwick tree with coordinate compression. But that's more complex in Python.

Another option: since k=1000, we could use a sorted list with bisect for insertion and removal. Insertion is O(k) due to list shifting, so total would be O(n*k) = 200,000 * 1000 = 200,000,000. That's too slow.

Actually, with bisect.insort, the insertion into a list of size 1000 is O(1000) due to memmove, which is very fast in C. So 200,000 * 1000 * (cost of moving a float) ≈ 200,000 * 1000 * 8 bytes / 1000000000 ≈ 1.6 seconds for the memmove alone. Plus the bisect search. It might be tight.

The two-heap approach should be faster. Let me go with that.

Let me also consider: for the `clean` function, in the worst case, how many elements can I pop? At most 1 per window step (since I only add 1 delayed element per step). So amortized O(1) per step. Good.

Let me also handle the edge case where `out` might equal `-low[0]` - it could belong to either heap. The convention is: if it equals the boundary, we consider it in low. This is fine because the median calculation is symmetric.

Actually wait, there's a subtlety. If out == -low[0] == high[0], it could be in either heap. But since we're doing lazy deletion, it doesn't matter which heap we "remove" it from - we just mark it as delayed. The clean function will remove it from whichever heap it's actually in when it reaches the top.

But wait - if I mark it as delayed and decrement low_size, but it's actually in high, then my sizes are wrong. That's the bug!

So I need to correctly determine which heap the element belongs to. The convention is:
- If out <= -low[0], it's in low
- If out > -low[0], it's in high

But what if out == -low[0] == high[0]? Then out <= -low[0] is true, so we say it's in low. But it could actually be in high!

Hmm, this is the classic issue. Let me think...

Actually, the way the algorithm works, the invariant is:
- All elements in low <= all elements in high
- low has target_low elements, high has target_high elements

If out == -low[0] (the max of low), it COULD be in low or high (since high's min could also equal this value). But for the purpose of the algorithm, it doesn't matter which heap we "logically remove" it from, as long as the sizes work out.

Wait, actually it DOES matter. If the element is physically in low (in the heap), and I mark it delayed and decrement low_size, then when I clean low, I'll pop it. But if the element is physically in high, and I mark it delayed and decrement low_size, then when I clean low, I won't find it there (it's in high), and when I clean high, I will find it but I already decremented low_size not high_size.

Hmm, but the clean function just checks if the top of the heap is in delayed. If the delayed element is in high but I decremented low_size, then:
- low_size is too small by 1
- high_size is correct (I didn't change it)
- When I rebalance, I might move an extra element from high to low
- But the delayed element in high will be cleaned when it reaches the top

Actually, I think the key insight is: it doesn't matter which heap the element is physically in. What matters is:
1. The element is marked as delayed
2. The correct size counter is decremented
3. When the element reaches the top of whichever heap it's in, it gets cleaned

But the size counters affect rebalancing. If I decrement low_size but the element is in high, then low_size is 1 too small. During rebalance, I might move an element from high to low to compensate. But that element I'm moving is a "real" element, so now high has one fewer real element than it should.

I think the correct approach is: when out == -low[0], we can assign it to either heap. Let's say we assign it to low. Then:
- We decrement low_size
- The element is delayed
- When it reaches the top of low (if it's physically in low), it gets cleaned. low_size already accounts for it.
- If it's physically in high, it stays in high until it reaches the top of high. When it does, it gets cleaned from high. But we decremented low_size, not high_size. So high has one extra element that will be cleaned later, and low is short by one. During rebalance, we'd move one from high to low. But the element in high that's delayed will eventually be cleaned.

Hmm, I think this gets complicated. Let me look at how LeetCode's official solution handles this.

The LeetCode 480 solution:
```
if out <= -low[0]:
    delayed[out] += 1
    low_size -= 1
else:
    delayed[out] += 1
    high_size -= 1
```

And then:
```
if in <= -low[0]:
    add to low
else:
    add to high
```

And rebalancing. I think the key is that the "logical" assignment (based on comparison with -low[0]) determines which size to decrement, and the physical location in the heap is handled by lazy deletion. The rebalancing ensures the sizes are correct, and cleaning ensures the tops are correct.

I believe this is correct because:
- The invariant we maintain is about sizes (low_size, high_size), not about which specific elements are in which heap
- The median is determined by the tops of the heaps after cleaning
- The lazy deletion handles the "physical" location

Let me just go with this approach and trust the standard algorithm.

One more consideration: when I do `if out <= -low[0]`, I need to make sure low is not empty and its top is clean. Let me clean before this check.

Also, what if after removing 'out', low becomes empty (low_size = 0) but k > 1? That can't happen because:
- Before removal, low_size >= target_low >= 1 (for k >= 2, target_low >= 1)
- After removing from low, low_size >= target_low - 1
- Then we add one element (to low or high)
- Then rebalance

For k=2: target_low=1, target_high=1. After removing from low: low_size=0. Then add: if to low, low_size=1; if to high, low_size=0. If low_size=0, rebalance moves one from high to low. So low won't be empty after rebalance. Good.

But what about during the check `if out <= -low[0]`? If low is empty (shouldn't happen after init), -low[0] would fail. But I'll make sure low is non-empty before this check.

Actually, after initialization, low has target_low >= 1 elements. After each step, rebalancing ensures low has target_low elements (logical size). So -low[0] should always be accessible (after cleaning).

Let me write the final version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max heap (negated)
    high = []  # min heap
    delayed = defaultdict(int)
    low_size = 0
    high_size = 0
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean(heap):
        while heap:
            top = -heap[0] if heap is low else heap[0]
            if delayed[top]:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def add_to_low(val):
        nonlocal low_size
        heapq.heappush(low, -val)
        low_size += 1
    
    def add_to_high(val):
        nonlocal high_size
        heapq.heappush(high, val)
        high_size += 1
    
    def rebalance():
        nonlocal low_size, high_size
        while low_size > target_low:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        while high_size > target_high:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while low_size < target_low:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while high_size < target_high:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
    
    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return -low[0]
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        if not low or nums[i] <= -low[0]:
            add_to_low(nums[i])
        else:
            add_to_high(nums[i])
    
    rebalance()
    result = [get_median()]
    
    for i in range(k, n):
        out = nums[i - k]
        in_val = nums[i]
        
        clean(low)
        clean(high)
        
        if out <= -low[0]:
            delayed[out] += 1
            low_size -= 1
        else:
            delayed[out] += 1
            high_size -= 1
        
        if in_val <= -low[0]:
            add_to_low(in_val)
        else:
            add_to_high(in_val)
        
        rebalance()
        result.append(get_median())
    
    return result
```

Wait, I realize there might be an issue. In the main loop, after I clean(low) and clean(high), I check `if out <= -low[0]`. But what if low is empty after cleaning? For k >= 2, target_low >= 1, so low_size >= 1 before the removal. After removal from low, low_size >= 0. But we add one element before rebalancing. So at the point of the check, low_size >= 1 (before removal) or >= 0 (after removal). 

Actually, at the point of the check `if out <= -low[0]`, I've already cleaned. low_size should be >= 1 (since we haven't removed yet - wait, no, I clean first, then check, then remove). Let me re-read my code.

In the loop:
1. clean(low), clean(high) - ensures tops are valid
2. Check if out <= -low[0] - low should be non-empty here
3. Mark delayed, decrement size
4. Add new element
5. Rebalance
6. Get median (which cleans again)

At step 2, low_size should be >= 1 because:
- Before this iteration, after rebalance, low_size = target_low >= 1
- We haven't removed anything yet in this iteration
- So yes, low is non-empty (after cleaning, heap size >= low_size >= 1)

Wait, after cleaning, the heap size equals low_size (since clean removes exactly the delayed elements from the heap). So if low_size >= 1, the heap has >= 1 elements. Good.

But what about step 4: `if in_val <= -low[0]`? At this point, we might have decremented low_size to 0 (if out was in low and low_size was 1). Then we add to low or high. If low_size is 0 and we add to high, then in the `if in_val <= -low[0]` check, low might be empty!

Hmm, but if low_size is 0, that means we removed the only element from low. Then low (after cleaning) is empty. But we haven't cleaned again after the removal...

Wait, the removal is lazy. We don't actually remove from the heap, we just mark it delayed and decrement low_size. So the heap still has the element. The heap is not empty. But -low[0] might be the delayed element.

In that case, `in_val <= -low[0]` compares against the delayed element's value. Is that correct?

I think it is, because the delayed element is still "logically" in the window at this point (we're in the middle of the transition). Actually no - we've already logically removed it (decremented low_size). But physically it's still in the heap.

Hmm, this is getting complex. Let me think of an alternative: after marking the delayed element, clean the heap before adding the new element.

```python
# After marking delayed:
if out <= -low[0]:
    delayed[out] += 1
    low_size -= 1
else:
    delayed[out] += 1
    high_size -= 1

# Clean after removal
clean(low)
clean(high)

# Now add
if low_size == 0 or in_val <= -low[0]:
    add_to_low(in_val)
else:
    add_to_high(in_val)
```

Wait, but if low_size == 0, low is empty, and we should add to low. Let me handle that.

Actually, for k >= 2, target_low >= 1. After removing from low, low_size >= 0. If low_size == 0, we need to add to low (since target_low >= 1). So the check should be:
```python
if low_size == 0 or in_val <= -low[0]:
    add_to_low(in_val)
else:
    add_to_high(in_val)
```

But wait, can low_size be 0 after removal? Only if low_size was 1 and we removed from low. For k=2, target_low=1, so yes. For k>2, target_low>1, so low_size >= 2 before removal, >= 1 after.

For k=2: target_low=1, target_high=1. After removal from low: low_size=0. After removal from high: high_size=0. Then we add one element. If we add to low (low_size=1, high_size=1 or 0), or to high (low_size=0, high_size=1 or 2). Rebalance will fix it.

Let me just add the `low_size == 0` check to be safe.

Also, I realize I should clean before the `in_val <= -low[0]` check to make sure -low[0] is valid (not a delayed element). Let me restructure:

```python
for i in range(k, n):
    out = nums[i - k]
    in_val = nums[i]
    
    clean(low)
    clean(high)
    
    if out <= -low[0]:
        delayed[out] += 1
        low_size -= 1
    else:
        delayed[out] += 1
        high_size -= 1
    
    clean(low)
    clean(high)
    
    if low_size == 0 or in_val <= -low[0]:
        add_to_low(in_val)
    else:
        add_to_high(in_val)
    
    rebalance()
    result.append(get_median())
```

This should be correct. Let me also think about whether `rebalance` needs to clean. In rebalance, I pop from one heap and push to another. If the top is delayed, I'd be moving a delayed element. So yes, I need to clean before popping in rebalance.

But wait, in rebalance, I'm calling clean before each pop. Let me verify:

```python
def rebalance():
    while low_size > target_low:
        clean(low)
        val = -heapq.heappop(low)
        ...
```

After clean(low), the top is not delayed. So popping is safe. Good.

But what if after popping and pushing to high, high's top is now delayed? That's fine - we'll clean high before popping from it in the next while loop iteration.

I think this is correct. Let me also make sure the `clean` function handles the case where the heap becomes empty.

```python
def clean(heap):
    while heap:
        top = -heap[0] if heap is low else heap[0]
        if delayed[top]:
            delayed[top] -= 1
            heapq.heappop(heap)
        else:
            break
```

If heap becomes empty, the while condition fails and we exit. Good.

One more thing: the `defaultdict(int)` for delayed. When I check `delayed[top]`, it creates an entry with value 0 if not present. That's fine for the `if delayed[top]:` check (0 is falsy). But it does create unnecessary entries. For performance, I could use a regular dict with `.get()`. But for n=200,000, the number of distinct values is at most 200,000, so it's fine.

Actually, for performance, let me use a regular dict:
```python
if top in delayed and delayed[top] > 0:
```

Or just use defaultdict(int) - it's fine.

Let me also consider: can I avoid the `clean` in the main loop and only clean in `get_median` and `rebalance`? Let's see:
- In the main loop, I need to check `out <= -low[0]`. If -low[0] is a delayed element, this comparison might be wrong.
  - Example: low = [5, 3] (max-heap, so top is 5), high = [6, 7]. delayed = {5: 1}. low_size = 1, high_size = 2.
  - out = 4. Is 4 <= 5? Yes. But 5 is delayed! The "real" max of low is 3. Is 4 <= 3? No! So 4 should go to high, not low.
  
So yes, I need to clean before the comparison. My current code does this. Good.

Let me finalize the code. Let me also add a fast path for k == 1.

Actually, I realize there might be a performance issue with the `clean` function being called multiple times. Let me count:
- In the main loop: 2 cleans before removal check, 2 cleans after removal (before add), then rebalance has cleans inside, then get_median has 2 more cleans.

That's a lot of clean calls. But each clean is O(1) amortized (at most 1 pop per window step since we only add 1 delayed element per step). So it's fine.

Let me write the final clean version:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    low = []   # max heap (negated)
    high = []  # min heap
    delayed = defaultdict(int)
    low_size = 0
    high_size = 0
    
    target_low = (k + 1) // 2
    target_high = k // 2
    
    def clean(heap):
        while heap:
            top = -heap[0] if heap is low else heap[0]
            if delayed[top]:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def add_to_low(val):
        nonlocal low_size
        heapq.heappush(low, -val)
        low_size += 1
    
    def add_to_high(val):
        nonlocal high_size
        heapq.heappush(high, val)
        high_size += 1
    
    def rebalance():
        nonlocal low_size, high_size
        while low_size > target_low:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
        while high_size > target_high:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while low_size < target_low:
            clean(high)
            val = heapq.heappop(high)
            high_size -= 1
            heapq.heappush(low, -val)
            low_size += 1
        while high_size < target_high:
            clean(low)
            val = -heapq.heappop(low)
            low_size -= 1
            heapq.heappush(high, val)
            high_size += 1
    
    def get_median():
        clean(low)
        clean(high)
        if k % 2 == 1:
            return -low[0]
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        if not low or nums[i] <= -low[0]:
            add_to_low(nums[i])
        else:
            add_to_high(nums[i])
    
    rebalance()
    result = [get_median()]
    
    for i in range(k, n):
        out = nums[i - k]
        in_val = nums[i]
        
        clean(low)
        clean(high)
        
        if out <= -low[0]:
            delayed[out] += 1
            low_size -= 1
        else:
            delayed[out] += 1
            high_size -= 1
        
        clean(low)
        clean(high)
        
        if low_size == 0 or in_val <= -low[0]:
            add_to_low(in_val)
        else:
            add_to_high(in_val)
        
        rebalance()
        result.append(get_median())
    
    return result
```

Hmm wait, I realize there's still a potential issue. In the initialization loop:
```python
for i in range(k):
    if not low or nums[i] <= -low[0]:
        add_to_low(nums[i])
    else:
        add_to_high(nums[i])
```

Here, -low[0] is always the current max of low (no lazy deletion during init). So this is fine. We're building the heaps from scratch.

After init, we call rebalance() to ensure correct sizes. Then get_median() for the first window.

I think this is correct. Let me trace through a small example:
nums = [1, 3, 2], k = 2

Init:
- i=0: low empty, add_to_low(1). low=[-1], low_size=1, high=[], high_size=0
- i=1: 3 <= -(-1)=1? No. add_to_high(3). low=[-1], low_size=1, high=[3], high_size=1

rebalance: target_low=1, target_high=1. low_size=1, high_size=1. No changes.

get_median: k is even. (-low[0] + high[0]) / 2 = (1 + 3) / 2 = 2.0. ✓

Window 2: out=nums[0]=1, in_val=nums[2]=2
- clean(low): top=1, delayed[1]=0. Stop.
- clean(high): top=3, delayed[3]=0. Stop.
- out=1 <= -low[0]=1? Yes. delayed[1]=1, low_size=0.
- clean(low): top=1, delayed[1]=1. Pop. delayed[1]=0. low=[]. 
  clean(high): top=3, delayed[3]=0. Stop.
- low_size=0, so add_to_low(2). low=[-2], low_size=1.
- rebalance: low_size=1, high_size=1. No changes.
- get_median: clean(low): top=2, delayed[2]=0. Stop. clean(high): top=3, delayed[3]=0. Stop.
  (2+3)/2 = 2.5. ✓

Let me trace another: nums = [1, 2, 3, 4], k = 3

Init:
- i=0: add_to_low(1). low=[-1], low_size=1.
- i=1: 2 <= 1? No. add_to_high(2). high=[2], high_size=1.
- i=2: 3 <= 1? No. add_to_high(3). high=[2,3], high_size=2.

rebalance: target_low=2, target_high=1.
- low_size=1 < 2. clean(high). val=heapq.heappop(high)=2. high_size=1. add to low. low=[-1,-2], low_size=2.
- Now low_size=2, high_size=1. Balanced.

get_median: k odd. -low[0]=2. Median of [1,2,3] is 2. ✓

Window 2: out=nums[0]=1, in_val=nums[3]=4
- clean(low): top=2, delayed[2]=0. Stop.
- clean(high): top=3, delayed[3]=0. Stop.
- out=1 <= -low[0]=2? Yes. delayed[1]=1, low_size=1.
- clean(low): top=2, delayed[2]=0. Stop. (The 1 is deeper in the heap.)
  Wait, low=[-1, -2]. Top is -1, so -low[0]=1. Wait no!
  
  Hmm, low=[-1, -2]. As a min-heap of negated values, the top is -2 (the smallest negated = largest original). So -low[0] = -(-2) = 2. Yes, top represents the max of the original values.
  
  Actually wait: heapq is a min-heap. low = [-1, -2]. The min is -2. So low[0] = -2. -low[0] = 2. Yes, that's the max of {1, 2}. Correct.
  
  clean(low): top = -low[0] = 2. delayed[2] = 0. Stop.
  clean(high): top = high[0] = 3. delayed[3] = 0. Stop.
  
- out=1 <= 2? Yes. delayed[1]=1, low_size=1.
- clean(low): top = 2. delayed[2] = 0. Stop. (1 is still in the heap but not at top)
  clean(high): top = 3. delayed[3] = 0. Stop.
- low_size=1, not 0. in_val=4 <= -low[0]=2? No. add_to_high(4). high=[3,4], high_size=2.
- rebalance: low_size=1 < 2. clean(high). top=3, delayed[3]=0. val=3. high_size=1. Push to low. low=[-2,-1,-3], low_size=2.
  Now low_size=2, high_size=1. Balanced.
- get_median: clean(low): top=-(-2)=2. delayed[2]=0. Stop. clean(high): top=4. delayed[4]=0. Stop.
  k odd: -low[0] = 2. Median of [2,3,4] is 3. Wait, that's wrong!

Hmm, let me recheck. After window 1 [1,2,3], we remove 1 and add 4. New window is [2,3,4]. Median should be 3.

Let me re-trace the heap states:
After init and rebalance:
- low = [-2, -1] (heap of negated values: min is -2, representing value 2)
  Actually wait: heapq.heappush(low, -1) gives [-1]. heapq.heappush(low, -2) gives [-2, -1] (since -2 < -1). So low[0] = -2, -low[0] = 2.
  The elements in low represent {1, 2}. Max is 2. ✓
- high = [3] (min is 3)
  The elements in high represent {3}. Min is 3. ✓

Window 2: out=1, in=4.
- out=1 <= -low[0]=2? Yes.
- delayed[1]=1, low_size=1 (was 2).
- Now: low heap = [-2, -1] (physical), low_size=1. The "logical" low contains {2} (since 1 is delayed).
- in=4 <= -low[0]=2? No. add_to_high(4). high=[3,4], high_size=2.
- Rebalance: low_size=1 < target_low=2.
  - clean(high): top=3, delayed[3]=0. Stop.
  - val = heapq.heappop(high) = 3. high_size=1. Push to low: heapq.heappush(low, -3). low=[-3, -1, -2]. low_size=2.
  - Now: low represents {2, 3} (1 is delayed), high represents {4}.
- get_median: clean(low): top=-(-3)=3. delayed[3]=0. Stop.
  k odd: -low[0] = 3. ✓

Median of [2,3,4] is 3. Correct!

Let me also check: what's in the low heap physically? [-3, -1, -2]. The -1 represents the delayed element 1. When it eventually becomes the top, it'll be cleaned.

Looks good! I'm fairly confident this is correct.

Let me also think about potential issues with the `defaultdict(int)` and the `delayed[top]` check. If `top` is not in delayed, `delayed[top]` creates an entry with value 0, which is falsy. So the check `if delayed[top]:` works correctly. The only downside is that we accumulate entries in the dict, but for n=200,000, that's at most 200,000 entries. Fine.

One last thing: for performance, I should avoid function call overhead in Python. The nested functions with `nonlocal` might be a bit slow. But for 200,000 iterations, it should still be fine.

Actually, let me reconsider performance. 200,000 iterations, each doing:
- 2 clean calls (amortized O(1))
- 2 more clean calls (amortized O(1))
- 1-2 heap operations for add
- Rebalance: 1-2 heap operations
- get_median: 2 clean calls

Total: ~5-10 heap operations per iteration. 200,000 * 10 = 2,000,000 heap operations. Each O(log 1000) ≈ 10. So ~20,000,000 basic operations. In Python, that's probably 2-4 seconds... might be tight.

Let me see if I can optimize:
1. Avoid redundant clean calls
2. Use local variables where possible
3. Minimize function call overhead

Actually, let me profile in my head. A Python heap operation (heappush/heappop) on a heap of size 1000 is roughly 10 comparisons + 10 swaps. Each comparison and swap is a Python operation. So maybe 20-50 Python bytecode operations per heap op. 2,000,000 * 30 = 60,000,000 bytecode ops. At ~100 million ops/sec for CPython, that's 0.6 seconds. Should be fine.

The clean calls are amortized O(1) but each call has function call overhead. Let me inline them or at least minimize calls.

Actually, I think the code as-is should be fast enough. Let me finalize it.

Wait, one more edge case: what if nums is empty and k=1? Then n=0, k=1 > n=0, so we raise ValueError. Good.

What if n=1 and k=1? We return list(nums). Good.

I think the solution is ready. Let me write the final version.

Actually, let me reconsider the `low_size == 0` check. Can low_size be 0 at that point?
- Before the iteration: low_size = target_low (after rebalance from previous iteration)
- We remove: low_size -= 1 (if out is in low)
- So low_size >= target_low - 1
- For k=2: target_low=1, so low_size >= 0. Can be 0.
- For k>2: target_low > 1, so low_size >= 1. Can't be 0.

So only for k=2 can low_size be 0. In that case, we must add to low (since target_low=1). The check `if low_size == 0 or in_val <= -low[0]` handles this.

But wait, if low_size is 0, is the low heap empty? Not necessarily - it might have delayed elements. But after cleaning (which we do before the check), the heap size equals low_size = 0, so it IS empty. So `-low[0]` would fail. The `low_size == 0` check prevents this. Good.

Actually, I realize I should also handle the case where high_size == 0 and we're trying to add to high. But in that case, we'd add to high and high_size becomes 1, which is fine. The issue is only when we try to access -low[0] when low is empty.

Let me also consider: after cleaning, if low is empty (low_size=0), and we're checking `in_val <= -low[0]`, we'd get an IndexError. The `low_size == 0` check prevents this. Good.

I'm satisfied the solution is correct. Let me write the final version.
