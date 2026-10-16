Let me think about how to implement an efficient sliding window median.

The naive approach would be O(n*k) which for n=200,000 and k=1,000 would be 200 million operations - too slow.

The efficient approach uses two heaps (or balanced BSTs) to maintain the median of a sliding window. Let me think about the standard approach:

**Approach: Two heaps (max-heap for lower half, min-heap for upper half)**

We maintain two structures:
- `low`: a max-heap containing the lower half of the window
- `high`: a min-heap containing the upper half of the window

We need to support:
1. Adding an element
2. Removing an element (when the window slides)
3. Getting the median

The tricky part is removing from a heap. Python's heapq doesn't support efficient removal. We can use "lazy deletion" - mark elements as deleted and pop them when they reach the top.

Let me think more carefully:

- We maintain two heaps: `low` (max-heap, store negative values) and `high` (min-heap)
- Invariant: `low` has size ceil(k/2), `high` has size floor(k/2), and every element in `low` <= every element in `high`
- For odd k: median = top of low
- For even k: median = (top of low + top of high) / 2

**Lazy deletion approach:**
- When we remove an element, we mark it as "to be deleted" (using a counter dict or set)
- When accessing the top of a heap, we pop elements that are marked for deletion until we find a valid one

Actually, let me think about this more carefully with the sliding window:

We can pre-mark which elements to remove. When the window slides, we remove `nums[i]` and add `nums[i+k]`.

For the removal, we use a `removed` dictionary that counts how many times each value should be removed from each heap. But since values can repeat, we need to be careful.

Actually, a cleaner approach: use a dictionary `to_remove` that maps values to counts. When we need to remove a value from a heap, we increment the count. When popping from the heap, if the top value has a positive count in `to_remove`, we decrement and pop again.

Wait, but the value could be in either heap. We need to know which heap to remove from. 

Let me think of another approach:

**Alternative: Use two heaps with lazy deletion**

- `low`: max-heap (negated values) for the lower half
- `high`: min-heap for the upper half
- `removed`: a dict tracking pending removals. But we need to track per-heap.

Actually, let me use a different strategy. Since we know exactly which element to remove at each step (it's `nums[i]` when window slides from i to i+1), we can:

1. When removing `nums[i]`, we determine which heap it's in and mark it for removal from that heap.
2. When adding `nums[i+k]`, we add it to the appropriate heap.
3. Rebalance the heaps.

To determine which heap an element is in during removal: we can check if the value is <= the top of low (considering it belongs to low) or > top of low (belongs to high). But with duplicates this gets tricky.

A more robust approach: use `to_remove` as a dict with counts, and when popping from either heap, check if the top is in `to_remove`. If so, decrement the count and pop again. We don't need to know which heap we're removing from - we just increment the count and let the lazy deletion handle it when that element reaches the top of whichever heap it's in.

Let me code this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # low: max-heap (negated), high: min-heap
    low = []  # max-heap (store -x)
    high = []  # min-heap
    to_remove = defaultdict(int)
    
    def clean_low():
        while low and -low[0] in to_remove and to_remove[-low[0]] > 0:
            to_remove[-low[0]] -= 1
            heapq.heappop(low)
    
    def clean_high():
        while high and high[0] in to_remove and to_remove[high[0]] > 0:
            to_remove[high[0]] -= 1
            heapq.heappop(high)
    
    def rebalance():
        # low should have ceil(k/2) elements, high should have floor(k/2)
        target_low = (k + 1) // 2
        target_high = k - target_low
        
        # Move from low to high if low is too big
        while len(low) > target_low:
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        
        # Move from high to low if high is too big
        while len(high) > target_high:
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
        
        # Ensure max of low <= min of high
        while low and high and -low[0] > high[0]:
            a = -heapq.heappop(low)
            b = heapq.heappop(high)
            heapq.heappush(low, -b)
            heapq.heappush(high, a)
    
    # Initialize with first k elements
    for i in range(k):
        heapq.heappush(low, -nums[i])
    
    rebalance()
    
    result = []
    
    for i in range(n - k):
        # Get median of current window
        clean_low()
        clean_high()
        if k % 2 == 1:
            result.append(float(-low[0]))
        else:
            result.append((-low[0] + high[0]) / 2.0)
        
        # Remove nums[i], add nums[i+k]
        to_remove[nums[i]] += 1
        heapq.heappush(low, -nums[i+k])  # or high? 
        
        rebalance()
    
    # Get median of last window
    clean_low()
    clean_high()
    if k % 2 == 1:
        result.append(float(-low[0]))
    else:
        result.append((-low[0] + high[0]) / 2.0)
    
    return result
```

Wait, there's a problem with the lazy deletion. When I do `to_remove[nums[i]] += 1`, I'm not specifying which heap the value is in. The lazy deletion should handle it - when I clean `low`, I check if `-low[0]` is in `to_remove`, and when I clean `high`, I check if `high[0]` is in `to_remove`. This should work correctly because the value will eventually be popped from whichever heap it's in.

But wait - there's a subtle issue. If a value appears multiple times, the count in `to_remove` handles that correctly.

Let me also think about when to add new elements. I'm adding to `low` always, then rebalancing. That should be fine since rebalance will move elements to the correct heap.

Actually wait, let me reconsider. When I add to `low`, then rebalance, the rebalance handles both size balancing and value ordering. Let me trace through:

After rebalance:
- `len(low) == ceil(k/2)`
- `len(high) == floor(k/2)`
- max(low) <= min(high)

When we add to low: `len(low) = ceil(k/2) + 1`, which might exceed target. Rebalance moves it to high.

When we remove (lazily): the actual count in low or high decreases by 1 (eventually), so rebalance might need to move from high to low.

This seems correct.

Let me also make sure the `clean` functions work. They only clean when we're about to read the top. But during rebalance, we might pop from a heap that has stale elements at the top. Let me add clean calls in rebalance too.

Actually, let me reconsider. During rebalance, when we do `heapq.heappop(low)`, we might pop a stale element. We should clean before popping during rebalance.

Let me revise:

```python
def rebalance():
    clean_low()
    clean_high()
    
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    while len(low) > target_low:
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
        clean_low()  # might not need this, but safe
    
    while len(high) > target_high:
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
    
    while low and high and -low[0] > high[0]:
        a = -heapq.heappop(low)
        b = heapq.heappop(high)
        heapq.heappush(low, -b)
        heapq.heappush(high, a)
```

Hmm, but actually during rebalance, after cleaning, the heaps should be clean at the top. The stale elements are below the top. So popping from the top after cleaning should be fine.

Wait, no. If I clean the top, pop it, the next element might be stale. But in rebalance, I'm just moving elements between heaps, not reading the median. So it's fine if stale elements are in the middle of the heap - they'll be cleaned when they reach the top.

Actually, I think there's a correctness issue. Let me think again...

When I do `heapq.heappop(low)` in rebalance, I get the minimum of the negated values, i.e., the maximum of the original values. If there's a stale element at the top, I'd pop the wrong element. So I should clean before each pop in rebalance.

Let me be safe and clean before every pop:

```python
def rebalance():
    target_low = (k + 1) // 2
    target_high = k - target_low
    
    while len(low) > target_low:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    
    while len(high) > target_high:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
    
    while low and high and -low[0] > high[0]:
        clean_low()
        clean_high()
        a = -heapq.heappop(low)
        b = heapq.heappop(high)
        heapq.heappush(low, -b)
        heapq.heappush(high, a)
```

This should be correct.

Now, about performance. For n=200,000, k=1,000:
- We do n-k = 199,000 iterations
- Each iteration involves: push (O(log k)), a few rebalance operations (each O(log k)), and cleaning (amortized O(1) since each element is cleaned at most once)
- Total: O(n log k) which is about 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. Well under 2 seconds.

Let me also handle edge case: k=1. Then the median is just the element itself.

Let me also double-check: for even k, the median is (low[-1] + high[0]) / 2. Since low is a max-heap (negated), the top of low is -low[0] which is the maximum of the lower half. And high[0] is the minimum of the upper half. For even k, these are the two middle elements. Correct.

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (store -x)
    high = []  # min-heap
    to_remove = defaultdict(int)
    
    def clean_low():
        while low and -low[0] in to_remove and to_remove[-low[0]] > 0:
            to_remove[-low[0]] -= 1
            heapq.heappop(low)
    
    def clean_high():
        while high and high[0] in to_remove and to_remove[high[0]] > 0:
            to_remove[high[0]] -= 1
            heapq.heappop(high)
    
    def get_median():
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return (-low[0] + high[0]) / 2.0
    
    def rebalance():
        target_low = (k + 1) // 2
        target_high = k - target_low
        
        while len(low) > target_low:
            clean_low()
            val = -heapq.heappop(low)
            heapq.heappush(high, val)
        
        while len(high) > target_high:
            clean_high()
            val = heapq.heappop(high)
            heapq.heappush(low, -val)
        
        while low and high and -low[0] > high[0]:
            clean_low()
            clean_high()
            a = -heapq.heappop(low)
            b = heapq.heappop(high)
            heapq.heappush(low, -b)
            heapq.heappush(high, a)
    
    # Initialize
    for i in range(k):
        heapq.heappush(low, -nums[i])
    rebalance()
    
    result = []
    for i in range(n - k + 1):
        result.append(get_median())
        if i < n - k:
            to_remove[nums[i]] += 1
            heapq.heappush(low, -nums[i + k])
            rebalance()
    
    return result
```

Wait, let me trace through a small example to verify.

nums = [1, 2, 3, 4, 5], k = 3

Initial: push 1, 2, 3 into low (as -1, -2, -3). low = [-3, -2, -1] (max-heap: top is -3, which represents 3)

rebalance: target_low = 2, target_high = 1
- len(low) = 3 > 2: clean_low (nothing to clean), pop -3 (val=3), push to high. low = [-2, -1], high = [3]
- len(high) = 1 = target_high: done
- Check ordering: -low[0] = 2, high[0] = 3. 2 <= 3, OK.

get_median: k=3 (odd), return -low[0] = 2. Correct (median of [1,2,3] is 2).

i=0: result = [2]
- to_remove[1] += 1 (to_remove = {1: 1})
- push -5 into low. low = [-5, -1, -2] wait, heap is [-5, -2, -1]? Let me think: after pushing -5 into [-2, -1], the heap becomes [-5, -1, -2] (heap property: parent <= children, so -5 at top).

Actually heapq maintains: a[i] <= a[2i+1] and a[i] <= a[2i+2]. So after heappush(-5) into [-2, -1]:
- Array becomes [-2, -1, -5], then sift down: -5 < -2, so swap: [-5, -1, -2]. Yes, top is -5.

rebalance: target_low = 2, target_high = 1
- len(low) = 3 > 2: clean_low: -low[0] = 5, to_remove[5]? No. So no cleaning. Pop -5 (val=5), push to high. low = [-2, -1], high = [3, 5] → [3, 5].
- len(high) = 2 > 1: clean_high: high[0] = 3, to_remove[3]? No. Pop 3, push -3 to low. low = [-3, -1, -2] → wait, heappush(-3) into [-2, -1]: array becomes [-2, -1, -3], sift: -3 < -2, swap: [-3, -1, -2]. high = [5].
- len(low) = 3 > 2: clean_low: -low[0] = 3, to_remove[3]? No. Pop -3 (val=3), push to high. low = [-2, -1], high = [5, 3] → [3, 5].
- len(high) = 2 > 1: clean_high: high[0] = 3, to_remove[3]? No. Pop 3, push -3 to low. low = [-3, -1, -2] → [-3, -2, -1]. high = [5].
- Check ordering: -low[0] = 3, high[0] = 5. 3 <= 5. OK.

Hmm wait, this doesn't look right. The window should be [2, 3, 4, 5]... no wait, k=3, so window is [2, 3, 4]. Let me redo.

nums = [1, 2, 3, 4, 5], k = 3. Windows: [1,2,3], [2,3,4], [3,4,5].

i=0: window [1,2,3], median = 2. ✓
- to_remove[1] += 1. Push -4 into low.

After removing 1 (lazily) and adding 4:
low before: [-2, -1] (representing 2, 1). After push -4: [-4, -1, -2] → sift: -4 < -2? Wait, [-2, -1, -4] after push, then sift down -4: -4 < -2, swap → [-4, -1, -2].

high before: [3].

rebalance: target_low=2, target_high=1.
- len(low)=3 > 2: clean_low: -low[0]=4, to_remove[4]? No. Pop -4 (val=4), push to high. low=[-2, -1], high=[3, 4]→[3, 4].
- len(high)=2 > 1: clean_high: high[0]=3, to_remove[3]? No. Pop 3, push -3 to low. low=[-3, -1, -2]→[-3, -2, -1]. high=[4].
- len(low)=3 > 2: clean_low: -low[0]=3, to_remove[3]? No. Pop -3 (val=3), push to high. low=[-2, -1], high=[3, 4]→[3, 4].
- len(high)=2 > 1: clean_high: high[0]=3, to_remove[3]? No. Pop 3, push -3 to low. low=[-3, -2, -1]. high=[4].

Hmm, we're in a loop! len(low) keeps being 3 and len(high) keeps being 2.

Oh wait, I see the issue. After the first rebalance pass:
- len(low) was 3, we moved one to high → len(low)=2, len(high)=2
- Then len(high)=2 > 1, we moved one to low → len(low)=3, len(high)=1
- Then len(low)=3 > 2, we moved one to high → len(low)=2, len(high)=2
- Then len(high)=2 > 1, we moved one to low → len(low)=3, len(high)=1

This oscillates! The issue is that the total is 4 but target_low+target_high = 3. We have one extra element.

Wait, that can't be right. Let me recount. After removing 1 lazily, the actual elements in the window are {2, 3, 4}. But in our data structures:
- low has 3 elements: -4, -2, -1 (representing 4, 2, 1)
- high has 1 element: 3

Total = 4 elements, but one (1) is marked for removal. So effective count is 3.

The problem is that `len(low)` includes the stale element. So `len(low) = 3` but effective is 2 (since 1 is marked for removal).

I think the issue is that we should only rebalance based on effective counts, not raw heap lengths. Or, we should clean before checking lengths.

Let me fix: in rebalance, clean both heaps first, then check lengths.

```python
def rebalance():
    clean_low()
    clean_high()
    
    target_low = (k + 1) // 2
    target_high = k - target_high  # oops, k - target_low
    
    while len(low) > target_low:
        clean_low()
        val = -heapq.heappop(low)
        heapq.heappush(high, val)
    
    while len(high) > target_high:
        clean_high()
        val = heapq.heappop(high)
        heapq.heappush(low, -val)
    
    while low and high and -low[0] > high[0]:
        clean_low()
        clean_high()
        a = -heapq.heappop(low)
        b = heapq.heappop(high)
        heapq.heappush(low, -b)
        heapq.heappush(high, a)
```

Let me re-trace:
After i=0 (removing 1, adding 4):
- low: [-4, -1, -2] (3 elements, but 1 is stale)
- high: [3] (1 element)
- to_remove: {1: 1}

rebalance:
- clean_low: -low[0] = 4, to_remove[4]? No. No cleaning.
- clean_high: high[0] = 3, to_remove[3]? No. No cleaning.
- len(low) = 3 > 2: clean_low again (nothing), pop -4 (val=4), push to high. low = [-2, -1], high = [3, 4].
- len(high) = 2 > 1: clean_high (nothing), pop 3, push -3 to low. low = [-3, -2, -1] wait, heappush(-3) into [-2, -1]: [-2, -1, -3] → sift: -3 < -2 → [-3, -1, -2]. high = [4].
- len(low) = 3 > 2: clean_low: -low[0] = 3, to_remove[3]? No. Pop -3 (val=3), push to high. low = [-2, -1], high = [3, 4] → [3, 4].
- len(high) = 2 > 1: clean_high: high[0] = 3, to_remove[3]? No. Pop 3, push -3 to low. low = [-3, -2, -1]. high = [4].

We're oscillating again! The problem is that element 1 (stale) is still in low. len(low) is 3 but one element is stale.

I think the solution is: we need to clean more aggressively, or we need to account for stale elements in the length check.

Alternative approach: instead of checking `len(low)`, check the effective length. But that's expensive.

Better approach: clean the heaps before AND during rebalance. The issue is that after cleaning low, the stale element 1 might not be at the top. It's at position where -1 is (second or third in the heap). So clean_low only removes from the top.

Hmm, this is the fundamental problem with lazy deletion in heaps. Stale elements can be anywhere in the heap, not just at the top.

Let me think of a different approach.

**Alternative: Use a balanced BST or sorted structure.**

Python doesn't have a built-in balanced BST. But we can use `bisect` with a sorted list. For each window, we insert and delete in O(k) time using bisect. Total: O(n*k) which is 200M for our case. Too slow.

**Alternative: Use two heaps but with a different strategy for removal.**

What if instead of lazy deletion, we maintain the heaps such that we know exactly which element is being removed? We can use a "membership" approach.

Actually, let me reconsider. The standard approach for sliding window median with two heaps and lazy deletion does work, but the key insight is:

When we remove an element, we don't need to know which heap it's in. We just mark it for removal. When it reaches the top of a heap, we pop it. The rebalancing should account for the fact that the heaps contain stale elements.

The fix: instead of using `len(heap)` for rebalancing, we should track the "effective" size. Or, we can use a different rebalancing strategy.

Actually, I think the correct approach is:

1. When adding a new element, add it to `low`.
2. When removing an element, mark it in `to_remove`.
3. Before any operation that reads the top, clean that heap.
4. For rebalancing, the target sizes should account for the fact that stale elements will eventually be cleaned.

Wait, I think the issue is simpler than I'm making it. Let me reconsider.

The total number of elements in both heaps (including stale) should be k + (number of stale elements not yet cleaned). When we remove one and add one, the total stays the same. So the total is always k (if we clean all stale elements) or k + s (where s is stale count).

Hmm, actually no. Let me think about it differently.

At any point:
- We've added k + i elements total (for window i, where i starts at 0)
- We've marked i elements for removal
- So total elements in heaps = k + i - (cleaned stale) 

This is getting complicated. Let me try a different approach.

**Better approach: Two multisets with explicit tracking.**

Use two heaps, but also maintain a set (or counter) of elements currently in each heap. When we remove an element, we remove it from the set and mark it for lazy deletion from whichever heap it's in.

But we still don't know which heap it's in...

OK let me try yet another approach. What if we use the following strategy:

- Maintain `low` and `high` as heaps.
- When removing element `x`:
  - If `x <= -low[0]` (i.e., x is in the lower half), mark it for removal from `low`.
  - Otherwise, mark it for removal from `high`.
  
But with duplicates, this is ambiguous. E.g., if x = -low[0] and there are multiple copies, we're not sure which one we're removing.

Actually, for the purpose of median calculation, it doesn't matter which specific copy we remove - only the multiset matters. So we can just mark x for removal from `to_remove` (a global counter) and let the lazy deletion handle it.

The real issue is the rebalancing. Let me think about when the oscillation happens and fix it.

The oscillation happens because:
- low has 3 elements (one stale), high has 1 element. Total = 4, but effective = 3.
- target_low = 2, target_high = 1. Total target = 3. ✓
- We move from low to high: low=2, high=2.
- We move from high to low: low=3, high=1.
- We move from low to high: low=2, high=2.
- ... oscillation.

The fix: after moving from low to high, we should clean high before checking its length. And after moving from high to low, we should clean low.

But that's what I'm already doing. The issue is that the stale element (1) is in low but not at the top, so clean_low doesn't remove it.

I think the correct fix is: don't use `len()` for rebalancing. Instead, use the effective count. But computing effective count requires scanning the whole heap, which is O(k).

Alternative fix: use a different data structure. What about using `heapq` with a "generation" counter? Each element has a generation, and stale elements have an old generation. When popping, if the generation is old, discard.

Actually, that's the same as lazy deletion.

Let me try a completely different approach.

**Approach: Sorted list with bisect.**

For n=200,000 and k=1,000, using bisect:
- Insert: O(k) (list insertion in the middle)
- Delete: O(k) (list deletion)
- Total: O(n * k) = 200M operations

That's probably too slow in Python (each operation involves shifting ~1000 elements).

Actually, 200M * (cost of shifting 1000 elements) would be very slow.

**Approach: Use `bisect` with a Fenwick tree or segment tree?**

Too complex.

**Let me go back to the two-heap approach and fix the oscillation.**

The key insight: the oscillation happens because we're using raw `len()` which includes stale elements. The fix is to ensure that after each rebalance, the heaps are in the correct state.

Actually, I think the correct approach is:

Instead of rebalancing based on `len()`, rebalance based on maintaining the invariant that:
1. All elements in low ≤ all elements in high
2. |low| - |high| ≤ 1 (where sizes are effective, not raw)

For (2), we can track effective sizes:
- `low_count` = number of non-stale elements in low
- `high_count` = number of non-stale elements in high

When we clean, we decrement the appropriate count. When we add, we increment. When we move between heaps, we adjust both.

Let me try this:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    low = []   # max-heap (store -x)
    high = []  # min-heap
    to_remove = defaultdict(int)
    low_count = 0
    high_count = 0
    
    def clean_low():
        nonlocal low_count
        while low and -low[0] in to_remove and to_remove[-low[0]] > 0:
            to_remove[-low[0]] -= 1
            heapq.heappop(low)
            low_count -= 1
    
    def clean_high():
        nonlocal high_count
        while high and high[0] in to_remove and to_remove[high[0]] > 0:
            to_remove[high[0]] -= 1
            heapq.heappop(high)
            high_count -= 1
    
    def add_to_low(x):
        heapq.heappush(low, -x)
    
    def add_to_high(x):
        heapq.heappush(high, x)
    
    def rebalance():
        nonlocal low_count, high_count
        clean_low()
        clean_high()
        
        # Ensure low_count >= high_count and low_count - high_count <= 1
        # Target: low_count = ceil(k/2), high_count = floor(k/2)
        
        while low_count > high_count + 1:
            # Move from low to high
            clean_low()
            val = -heapq.heappop(low)
            low_count -= 1
            heapq.heappush(high, val)
            high_count += 1
        
        while high_count > low_count:
            # Move from high to low
            clean_high()
            val = heapq.heappop(high)
            high_count -= 1
            heapq.heappush(low, -val)
            low_count += 1
        
        # Ensure ordering: max(low) <= min(high)
        while low and high and -low[0] > high[0]:
            clean_low()
            clean_high()
            a = -heapq.heappop(low)
            low_count -= 1
            b = heapq.heappop(high)
            high_count -= 1
            heapq.heappush(low, -b)
            low_count += 1
            heapq.heappush(high, a)
            high_count += 1
    
    def get_median():
        clean_low()
        clean_high()
        if k % 2 == 1:
            return float(-low[0])
        else:
            return (-low[0] + high[0]) / 2.0
    
    # Initialize
    for i in range(k):
        heapq.heappush(low, -nums[i])
        low_count += 1
    rebalance()
    
    result = []
    for i in range(n - k + 1):
        result.append(get_median())
        if i < n - k:
            to_remove[nums[i]] += 1
            heapq.heappush(low, -nums[i + k])
            low_count += 1
            rebalance()
    
    return result
```

Let me trace through the example again:
nums = [1, 2, 3, 4, 5], k = 3

Init: low = [-1, -2, -3] (heap: [-3, -1, -2] after heapify), low_count = 3, high_count = 0

rebalance:
- clean_low: -low[0] = 3, to_remove[3]? No.
- clean_high: empty.
- low_count(3) > high_count(0) + 1: move from low to high.
  - clean_low: nothing.
  - pop -3 (val=3), low_count=2, push 3 to high, high_count=1.
  - low = [-2, -1], high = [3].
- low_count(2) > high_count(1) + 1? No.
- high_count(1) > low_count(2)? No.
- Ordering: -low[0]=2, high[0]=3. 2 ≤ 3. OK.

get_median: k=3, odd. -low[0] = 2. ✓

i=0: result = [2]
- to_remove[1] = 1
- push -4 to low. low = [-4, -1, -2] (after heappush), low_count = 3.

rebalance:
- clean_low: -low[0] = 4, to_remove[4]? No.
- clean_high: high[0] = 3, to_remove[3]? No.
- low_count(3) > high_count(1) + 1 = 2: move from low to high.
  - clean_low: nothing.
  - pop -4 (val=4), low_count=2, push 4 to high, high_count=2.
  - low = [-2, -1], high = [3, 4].
- low_count(2) > high_count(2) + 1? No.
- high_count(2) > low_count(2)? No.
- Ordering: -low[0]=2, high[0]=3. 2 ≤ 3. OK.

get_median: k=3, odd. -low[0] = 2. But the window is [2, 3, 4], median should be 3!

Wait, that's wrong. Let me recheck.

After removing 1 and adding 4, the window is [2, 3, 4]. The elements are:
- low: [-2, -1] → represents {2, 1} (but 1 is stale)
- high: [3, 4] → represents {3, 4}

Effective elements: {2, 3, 4}. Median = 3.

But get_median returns -low[0] = 2. That's wrong!

The issue: element 1 is in low but stale. The top of low is 2 (not 1), but the effective size of low is 2 (elements 2 and 1, where 1 is stale). So effective low has only 1 element: {2}. And high has 2 elements: {3, 4}.

For k=3 (odd), the median should be the max of low (if low has 2 elements) or... hmm, I think my size tracking is off.

Let me reconsider. low_count = 2 (includes stale 1), high_count = 2. Total effective = 3 (since 1 is stale).

For k=3: target low_count should be 2, target high_count should be 1. But we have low_count=2, high_count=2. The issue is that low_count includes the stale element.

I think the problem is that `low_count` should represent the effective (non-stale) count. But we only know the effective count after cleaning. And cleaning only removes from the top.

This is the fundamental issue with lazy deletion in heaps: you can't easily know the effective size without cleaning all elements.

**New idea: Use a different data structure.**

What about using `heapq` with a "tombstone" approach where we track the exact count?

Actually, I think the issue is that we need to clean before computing the median, and the stale element should be at the top of low when we clean it. Let me check: after rebalance, low = [-2, -1]. The top is -2 (value 2). The stale element 1 is at position 1 (value -1). It's NOT at the top. So clean_low won't remove it.

The stale element will only be removed when it reaches the top. But it might never reach the top if we keep adding larger elements.

I think the correct approach is different. Let me look at this from a different angle.

**Approach: Two heaps where we explicitly track membership.**

Instead of lazy deletion, when we remove an element, we determine which heap it belongs to and remove it. To determine which heap, we can use the following logic:
- If the element ≤ the current max of low (i.e., ≤ -low[0] after cleaning), it's in low.
- Otherwise, it's in high.

But with duplicates, this is ambiguous. However, for median purposes, it doesn't matter which specific copy we remove.

Actually, I think the cleaner solution is:

When removing element `x`:
- Mark it in `to_remove`.
- When rebalancing, clean both heaps.
- The rebalancing should be based on effective sizes, which we can track.

But the problem is tracking effective sizes without full cleaning.

**Alternative: Use a sorted list with `bisect` but optimize for the specific constraints.**

For n=200,000, k=1,000:
- n-k = 199,000 windows
- For each window: insert O(k) + delete O(k) = O(k)
- Total: O(n*k) = 199,000 * 1,000 = 199,000,000 element shifts

In CPython, shifting 1000 elements takes about 1μs (memmove). So 199M * 1μs ≈ 200ms? Actually that's optimistic. Let's say each shift is more like 5-10μs. Then 199M * 5μs ≈ 1 second. Might be borderline.

Actually, `list.insert(i, x)` and `list.pop(i)` in CPython use memmove which is quite fast (memory bandwidth limited). For 1000 elements, that's about 8KB of memory movement. At ~10GB/s, that's 0.8μs. So 199M * 1μs ≈ 0.2s. Plus the bisect (log k ≈ 10 comparisons). Total maybe 0.5s. This might work!

But wait, we also need to handle the fact that we're doing two operations (insert and delete) per window, so it's 2 * 199M * 1μs ≈ 0.4s. Plus bisect. Should be well under 2 seconds.

Let me go with the sorted list + bisect approach for simplicity and correctness.

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = sorted(nums[:k])
    result = []
    
    for i in range(n - k + 1):
        if k % 2 == 1:
            result.append(float(window[k // 2]))
        else:
            result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
        
        if i < n - k:
            # Remove nums[i]
            pos = bisect.bisect_left(window, nums[i])
            window.pop(pos)
            # Add nums[i+k]
            bisect.insort(window, nums[i+k])
    
    return result
```

This is O(n * k) due to the list insertions/deletions. For n=200,000, k=1,000, this is 200M element movements. In CPython, each movement is a memmove of ~8KB, which is very fast. Let me estimate more carefully:

- `list.pop(i)`: memmove of (k-i) * 8 bytes. Average: k/2 * 8 = 4000 bytes.
- `list.insert(i, x)` (via bisect.insort): memmove of (k-i) * 8 bytes. Average: k/2 * 8 = 4000 bytes.
- Per window: ~8000 bytes moved.
- Total: 199,000 * 8000 = 1.6 GB of memory movement.
- At 10 GB/s: 0.16 seconds.

Plus the bisect searches: 199,000 * 2 * log2(1000) ≈ 199,000 * 2 * 10 = 4M comparisons. Negligible.

Plus the sorted() call: O(k log k) = 1000 * 10 = 10,000. Negligible.

Total: well under 2 seconds. 

But wait, I need to be more careful. `bisect.insort` does a binary search (O(log k)) followed by a list insert (O(k)). And `list.pop(i)` is O(k). So per window: O(k). Total: O(n*k).

For n=200,000, k=1,000: 200M operations. But each "operation" is a memory move of ~4KB. Total memory: ~800GB... wait no.

Let me recalculate:
- Per window: 1 pop (moves ~k/2 elements = 500 * 8 = 4000 bytes) + 1 insert (moves ~k/2 elements = 500 * 8 = 4000 bytes) = 8000 bytes
- Total: 199,000 * 8000 = 1.6 GB

At typical memory bandwidth of 20-50 GB/s: 0.03-0.08 seconds. Well under 2 seconds.

This approach is simple, correct, and fast enough. Let me go with it.

Actually, let me double-check: is `bisect.bisect_left` finding the right position? If there are duplicates, `bisect_left` finds the first position where the element could be inserted. Since the list is sorted, popping that position removes one instance of the value. This is correct.

Let me also make sure the median calculation is correct:
- For k=1: window[0], which is window[0]. k//2 = 0. ✓
- For k=3: window[1], the middle element. k//2 = 1. ✓
- For k=4: (window[1] + window[2]) / 2. k//2 - 1 = 1, k//2 = 2. ✓
- For k=2: (window[0] + window[1]) / 2. k//2 - 1 = 0, k//2 = 1. ✓

Great, this is correct.

Let me also handle the edge case where k = n (only one window).

And k = 1 (each element is its own median).

I think the bisect approach is clean and efficient enough. Let me finalize.

Actually, one more thought: for n=200,000 and k=1,000, the window list has 1,000 elements. Each insert/delete involves moving at most 1,000 pointers (8KB). With 199,000 windows, that's 199,000 * 2 * 8KB ≈ 3.2 GB of memory operations. At 20 GB/s, that's 0.16 seconds. Definitely under 2 seconds.

Let me write the final solution.
