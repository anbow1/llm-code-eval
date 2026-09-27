The user wants a `sliding_median` function that computes the median of every sliding window of size k over a list of floats.

Requirements:
1. Returns a list of floats - the median of each window of size k
2. For even k, median is the mean of the two middle values
3. Raise ValueError if k < 1 or k > len(nums)
4. Must be efficient: n = 200,000 with k = 1,000 must finish in well under 2 seconds

Let me think about the approach:

For n = 200,000 and k = 1,000, we have 199,001 windows. Each window has 1,000 elements.

A naive approach would be O(n*k) = 200,000 * 1,000 = 200,000,000 operations, which might be too slow.

Better approaches:
1. Two heaps (min-heap and max-heap) approach - O(n log k)
2. Sorted list / order statistic tree approach
3. Using a sorted structure

Let me think about the two-heap approach:
- Maintain a max-heap (for the lower half) and a min-heap (for the upper half)
- When k is odd: the max-heap has one more element than the min-heap
- When k is even: both heaps have k//2 elements

For each step:
- Add the new element
- Remove the old element
- Rebalance

The tricky part is removing an arbitrary element from a heap. Python's heapq doesn't support efficient removal of arbitrary elements. 

One approach: use lazy deletion. Mark elements as "removed" and ignore them when popping.

Let me think about this more carefully:

- `lower` = max-heap (store negatives) for the lower half
- `upper` = min-heap for the upper half

For even k: both have k//2 elements
For odd k: lower has (k+1)//2 elements, upper has k//2 elements

When adding a new element:
- Add to appropriate heap
- Rebalance

When removing an old element:
- Mark it as removed (lazy deletion)
- If it's in the heap we need to remove from, pop until we find it
- Rebalance

Actually, let me think about a cleaner approach. Since we're only removing the element that was added k steps ago, we can track which heap it was in.

Let me use a different approach: maintain a sorted structure. 

Actually, for the two-heap approach with lazy deletion:

```python
import heapq

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    # lower: max-heap (store negatives), upper: min-heap
    # For even k: both have k//2
    # For odd k: lower has (k+1)//2, upper has k//2
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    lower = []  # max-heap (negatives)
    upper = []  # min-heap
    removed = set()  # values to ignore (lazy deletion)
    
    result = []
    
    # Initialize first window
    for i in range(k):
        if nums[i] <= (lower[0] if lower else float('inf')):
            heapq.heappush(lower, -nums[i])
        else:
            heapq.heappush(upper, nums[i])
    
    # Rebalance
    while len(lower) > target_lower:
        heapq.heappush(upper, -heapq.heappop(lower))
    while len(upper) > target_upper:
        heapq.heappush(lower, -heapq.heappop(upper))
    
    # ... this is getting complicated with lazy deletion
```

Hmm, the lazy deletion approach is tricky because we need to track which heap an element was in. Let me think differently.

Actually, let me use a sorted list approach with `bisect` module. For each window, we maintain a sorted list of k elements. Adding and removing are O(k) each (due to list insertion/deletion), so total is O(n*k) which for 200,000 * 1,000 = 200M operations... that might be too slow.

Wait, actually list insertion is O(k) in the worst case but the constant factor is small. Let me reconsider.

For n=200,000, k=1,000:
- Number of windows: 199,001
- Each operation: insert + delete from sorted list of size 1000
- Total operations: ~200,000 * 1000 = 200M element shifts

In Python, list insert/delete at position k is O(k) but with small constant. 200M operations in Python... that's probably too slow. Python does roughly 50-100M simple operations per second.

Let me go with the two-heap approach with lazy deletion.

The key insight: when we remove an element, we add it to a "removed" set. When we pop from a heap, we skip elements in the "removed" set.

But there's a subtlety: we need to know which heap the element was in. Let me track this.

Actually, let me think about this differently. 

Approach: Two heaps with lazy deletion.

- `lower`: max-heap (store as negatives)
- `upper`: min-heap
- `removed`: set of values to skip

When we add a new element x:
- If lower is non-empty and x <= -lower[0]: push to lower
- Else: push to upper
- Rebalance

When we remove an element x:
- We need to know which heap it's in
- If x is in lower: add x to removed, then pop from lower until we find x
- If x is in upper: add x to removed, then pop from upper until we find x
- Rebalance

The issue: how do we know which heap x is in? We can check: if x <= -lower[0] it might be in lower, but it could also be in upper. Actually, we can just check: is -lower[0] >= x? If the maximum of lower is >= x, then x could be in lower. But it's not guaranteed.

Better: track the element's position. When we insert, we know which heap we put it in. We can maintain a deque of (value, heap_id) pairs.

Let me use a different approach: maintain a sorted list using `bisect.insort` and `list.pop`. 

Actually wait - for the sorted list approach:
- Insert: O(k) due to shifting
- Delete: O(k) due to shifting
- Median lookup: O(1)

Total: O(n * k) = O(200,000 * 1,000) = 200M operations

In CPython, list operations on a list of 1000 elements: each insert/pop involves memmove of ~500 elements on average. So 200,000 * 500 = 100M element moves. In C, memmove is very fast (memcpy). Actually, Python list insert/delete is implemented in C and is quite fast. Let me estimate:

- 200,000 iterations
- Each: bisect (O(log k) ≈ 10 comparisons) + list.insert or list.pop (O(k) memmove)
- The memmove for a list of 1000 floats is ~8KB of data moved
- 200,000 * 8KB = 1.6GB of memory moved

That should be fast enough in C. Let me go with this approach.

Actually, let me reconsider. The `bisect` module's `insort` does O(log k) comparisons, and then `list.insert(i, x)` does O(k) element shifting. For k=1000, that's at most 1000 element shifts per operation. 200,000 * 1000 = 200M element shifts. In CPython, this is probably around 1-2 seconds. Hmm, borderline.

Let me go with the two-heap approach which is O(n log k).

Here's my plan:

```python
import heapq
from collections import deque

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    num_windows = n - k + 1
    
    # target sizes
    # For even k: lower has k//2, upper has k//2
    # For odd k: lower has (k+1)//2, upper has k//2
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    lower = []  # max-heap (store negatives)
    upper = []  # min-heap
    removed = set()
    
    # Track which heap each element was placed in
    # Use a deque to track insertion order
    heap_assignments = deque()  # (value, 'lower' or 'upper')
    
    def clean_lower():
        while lower and -lower[0] in removed:
            heapq.heappop(lower)
            removed.discard(-lower[0])  # wait, this is wrong
    
    # Hmm, the lazy deletion is tricky. Let me think again.
```

Actually, the lazy deletion approach has issues:
1. We need to know which heap an element is in
2. When we pop to remove a marked element, we might pop the wrong one

Let me think more carefully.

When we remove element x:
- We add x to `removed` set
- We need to remove it from whichever heap it's in
- If x was in lower: we pop from lower until we find -x (and skip removed elements)
- If x was in upper: we pop from upper until we find x (and skip removed elements)

But wait - when we pop from lower, we might encounter other removed elements. We need to skip those too.

Let me restructure:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    num_windows = n - k + 1
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    lower = []  # max-heap (negatives)
    upper = []  # min-heap
    removed = set()
    
    # Track heap assignment for each element in order
    # When we slide, we remove the oldest element
    assignments = deque()  # (value, heap_name)
    
    def _clean(heap, is_lower):
        """Remove stale (removed) elements from top of heap."""
        while heap:
            val = -heap[0] if is_lower else heap[0]
            if val in removed:
                heapq.heappop(heap)
                removed.discard(val)
            else:
                break
    
    def _add(x):
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            assignments.append((x, 'lower'))
        else:
            heapq.heappush(upper, x)
            assignments.append((x, 'upper'))
    
    def _remove(x):
        val, heap_name = assignments.popleft()
        # x should equal val
        removed.add(x)
        if heap_name == 'lower':
            # Pop from lower until we find x
            while True:
                top = -heapq.heappop(lower)
                if top == x:
                    removed.discard(x)
                    break
                # top is also removed, discard it
                removed.discard(top)
        else:
            while True:
                top = heapq.heappop(upper)
                if top == x:
                    removed.discard(x)
                    break
                removed.discard(top)
    
    def _rebalance():
        # Move elements to achieve target sizes
        _clean(lower, True)
        _clean(upper, False)
        while len(lower) > target_lower:
            val = -heapq.heappop(lower)
            heapq.heappush(upper, val)
        while len(upper) > target_upper:
            val = heapq.heappop(upper)
            heapq.heappush(lower, -val)
        # Also ensure lower has enough
        while len(lower) < target_lower:
            val = heapq.heappop(upper)
            heapq.heappush(lower, -val)
        while len(upper) < target_upper:
            val = -heapq.heappop(lower)
            heapq.heappush(upper, val)
    
    # Initialize
    for i in range(k):
        _add(nums[i])
    _rebalance()
    
    result = []
    # First window median
    _clean(lower, True)
    _clean(upper, False)
    if k % 2 == 1:
        result.append(-lower[0])
    else:
        _clean(lower, True)
        _clean(upper, False)
        result.append((-lower[0] + upper[0]) / 2.0)
    
    for i in range(k, n):
        # Remove old element, add new element
        old = nums[i - k]
        _remove(old)
        _add(nums[i])
        _rebalance()
        
        _clean(lower, True)
        _clean(upper, False)
        if k % 2 == 1:
            result.append(-lower[0])
        else:
            result.append((-lower[0] + upper[0]) / 2.0)
    
    return result
```

Wait, there's an issue with the `_remove` function. When we pop from the heap to find the element, we might pop elements that are in `removed` set but we're adding them back... no wait, we discard them from removed. Let me re-examine.

Actually, the issue is: when we call `_remove(x)`, we add x to `removed`. Then we pop from the heap. If we encounter another removed element, we discard it from `removed` (meaning it's now gone). But what if that element was supposed to be removed later? No - if it's in `removed`, it means it was marked for removal and we're just cleaning it up now. That's fine.

But wait - there's a subtle issue. When we add x to `removed` and then pop from the heap, we might pop elements that are in `removed` (from previous removals that haven't been cleaned up). We discard those from `removed` as well. That's correct - they're gone from the heap and from the removed set.

Let me also think about the `_rebalance` function. After removing and adding, we need to ensure the heap sizes are correct. The `_clean` calls at the top of `_rebalance` ensure the tops are valid.

Actually, I realize there might be an issue: after `_remove`, the heap sizes might be off. Let me trace through:

Initial state: lower has target_lower elements, upper has target_upper elements.
- `_remove(old)`: removes one element from whichever heap it's in. Now one heap has one fewer element.
- `_add(new)`: adds one element to one of the heaps.

After these two operations, the total count is still k. But the distribution might be off. `_rebalance` fixes this.

Let me also handle the edge case where `upper` might be empty when we try to pop from it in `_rebalance`. But since total elements = k and target_lower + target_upper = k, if lower has more than target_lower, upper must have fewer than target_upper (or vice versa). So one of the while loops will execute.

Wait, I need to be more careful. After `_remove` and `_add`:
- Total elements = k (correct)
- But distribution might be: lower has target_lower + 1, upper has target_upper - 1 (or vice versa)

The `_rebalance` handles this.

Let me also think about potential issues with duplicates. If we have duplicate values, the `removed` set approach still works because we're matching by value. If there are duplicates, we'll find the right one (any one with that value is fine since they're identical).

Actually wait - with duplicates, there's a problem. If we have value 5 in both lower and upper, and we want to remove the one in lower, we add 5 to removed, then pop from lower. We'll find 5 (which is in lower) and remove it. Good. But what if 5 is also in upper? Then when we later clean upper, we'd find 5 in removed and remove it too! That's wrong.

Hmm, this is a fundamental issue with the lazy deletion approach when there are duplicates.

Solution: use a count-based approach instead of a set. Use a dictionary `removed_counts` that tracks how many of each value need to be removed.

Let me redo:

```python
removed_counts = {}  # value -> count of pending removals

def _remove(x):
    val, heap_name = assignments.popleft()
    removed_counts[x] = removed_counts.get(x, 0) + 1
    if heap_name == 'lower':
        while True:
            top = -heapq.heappop(lower)
            if top == x:
                removed_counts[x] -= 1
                if removed_counts[x] == 0:
                    del removed_counts[x]
                break
            # top has pending removals
            removed_counts[top] -= 1
            if removed_counts[top] == 0:
                del removed_counts[top]
    else:
        while True:
            top = heapq.heappop(upper)
            if top == x:
                removed_counts[top] -= 1
                if removed_counts[top] == 0:
                    del removed_counts[top]
                break
            removed_counts[top] -= 1
            if removed_counts[top] == 0:
                del removed_counts[top]

def _clean(heap, is_lower):
    while heap:
        val = -heap[0] if is_lower else heap[0]
        if val in removed_counts:
            heapq.heappop(heap)
            removed_counts[val] -= 1
            if removed_counts[val] == 0:
                del removed_counts[val]
        else:
            break
```

This handles duplicates correctly.

Now let me also think about the `_add` function. When adding a new element:
- If lower is non-empty and x <= -lower[0]: push to lower
- Else: push to upper

But what if lower is empty? Then push to upper. After rebalancing, it'll move to lower if needed.

Actually, for the initial build, let me just add all k elements and then rebalance.

Let me also consider: what if k=1? Then target_lower = 1, target_upper = 0. The median is just the element itself.

Let me code this up properly:

```python
import heapq
from collections import deque

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    num_windows = n - k + 1
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    lower = []  # max-heap (store negatives)
    upper = []  # min-heap
    removed_counts = {}
    assignments = deque()  # (value, 'lower' or 'upper')
    
    def _add(x):
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            assignments.append((x, 'lower'))
        else:
            heapq.heappush(upper, x)
            assignments.append((x, 'upper'))
    
    def _remove(x):
        val, heap_name = assignments.popleft()
        removed_counts[x] = removed_counts.get(x, 0) + 1
        if heap_name == 'lower':
            while True:
                top = -heapq.heappop(lower)
                if top == x:
                    removed_counts[x] -= 1
                    if removed_counts[x] == 0:
                        del removed_counts[x]
                    break
                removed_counts[top] -= 1
                if removed_counts[top] == 0:
                    del removed_counts[top]
        else:
            while True:
                top = heapq.heappop(upper)
                if top == x:
                    removed_counts[top] -= 1
                    if removed_counts[top] == 0:
                        del removed_counts[top]
                    break
                removed_counts[top] -= 1
                if removed_counts[top] == 0:
                    del removed_counts[top]
    
    def _clean(heap, is_lower):
        while heap:
            val = -heap[0] if is_lower else heap[0]
            if val in removed_counts:
                heapq.heappop(heap)
                removed_counts[val] -= 1
                if removed_counts[val] == 0:
                    del removed_counts[val]
            else:
                break
    
    def _rebalance():
        _clean(lower, True)
        _clean(upper, False)
        while len(lower) > target_lower:
            val = -heapq.heappop(lower)
            heapq.heappush(upper, val)
        while len(upper) > target_upper:
            val = heapq.heappop(upper)
            heapq.heappush(lower, -val)
    
    # Build initial window
    for i in range(k):
        _add(nums[i])
    _rebalance()
    
    result = []
    _clean(lower, True)
    _clean(upper, False)
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append((-lower[0] + upper[0]) / 2.0)
    
    for i in range(k, n):
        old = nums[i - k]
        _remove(old)
        _add(nums[i])
        _rebalance()
        
        _clean(lower, True)
        _clean(upper, False)
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append((-lower[0] + upper[0]) / 2.0)
    
    return result
```

Wait, I need to double-check the `_rebalance` logic. After `_remove` and `_add`, the total is k. But the split might be off by 1. 

Case 1: lower has target_lower + 1, upper has target_upper - 1
- We need to move one from lower to upper
- `while len(lower) > target_lower`: pop from lower, push to upper ✓

Case 2: lower has target_lower - 1, upper has target_upper + 1
- We need to move one from upper to lower
- `while len(upper) > target_upper`: pop from upper, push to lower ✓

Case 3: lower has target_lower, upper has target_upper (no change needed)
- Both while loops don't execute ✓

This looks correct.

Let me also verify the median calculation:
- For odd k: median is the middle element, which is the max of lower (since lower has (k+1)//2 elements, the median is at position (k-1)//2 which is the top of lower)
- For even k: median is mean of k//2-th and (k//2)-th elements (0-indexed), which are the max of lower and min of upper

Wait, let me be more careful. For k elements sorted: a[0] <= a[1] <= ... <= a[k-1]
- For odd k: median = a[k//2] (0-indexed)
- For even k: median = (a[k//2 - 1] + a[k//2]) / 2

With lower having (k+1)//2 elements (for odd k) or k//2 elements (for even k):
- For odd k: lower has (k+1)//2 elements. The largest in lower is a[(k+1)//2 - 1] = a[k//2]. That's the median. ✓
- For even k: lower has k//2 elements. The largest in lower is a[k//2 - 1]. The smallest in upper is a[k//2]. Median = (a[k//2-1] + a[k//2])/2. ✓

Great, the logic is correct.

Now let me think about performance:
- Each window: O(log k) for add, O(log k) for remove (amortized), O(log k) for rebalance
- Total: O(n log k) = O(200,000 * log(1000)) ≈ O(200,000 * 10) = 2M operations
- This should be well under 2 seconds.

Actually, the `_remove` function could be O(k) in the worst case if we have to pop many elements. But amortized over all operations, it's O(log k) because each element is pushed and popped at most once.

Wait, actually in `_remove`, we pop until we find the target element. In the worst case, we might pop O(k) elements. But each of those popped elements is permanently removed, so over the entire algorithm, the total number of pops is O(n). So amortized it's O(1) per removal.

Total complexity: O(n log k) for the heap operations. For n=200,000 and k=1,000, this is about 2M heap operations, which should run in well under 1 second.

Let me also make sure I handle the `float` return type correctly. The function should return floats. Since we're dividing by 2.0 for even k, and the elements are already floats, the results should be floats. For odd k, `-lower[0]` is already a float. Let me make sure I explicitly cast to float just to be safe.

Actually, `nums` is `list[float]`, so all elements are floats. `-lower[0]` will be a float. `(-lower[0] + upper[0]) / 2.0` will be a float. So we're fine.

Let me also handle the edge case where `len(nums) == k`: only one window.

Let me finalize the code:

```python
import heapq
from collections import deque

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    num_windows = n - k + 1
    
    target_lower = (k + 1) // 2
    target_upper = k // 2
    
    lower: list[float] = []  # max-heap (store negatives)
    upper: list[float] = []  # min-heap
    removed_counts: dict[float, int] = {}
    assignments: deque[tuple[float, str]] = deque()
    
    def _add(x: float) -> None:
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            assignments.append((x, 'lower'))
        else:
            heapq.heappush(upper, x)
            assignments.append((x, 'upper'))
    
    def _remove(x: float) -> None:
        _val, heap_name = assignments.popleft()
        removed_counts[x] = removed_counts.get(x, 0) + 1
        if heap_name == 'lower':
            while True:
                top = -heapq.heappop(lower)
                if top == x:
                    removed_counts[x] -= 1
                    if removed_counts[x] == 0:
                        del removed_counts[x]
                    break
                removed_counts[top] -= 1
                if removed_counts[top] == 0:
                    del removed_counts[top]
        else:
            while True:
                top = heapq.heappop(upper)
                if top == x:
                    removed_counts[top] -= 1
                    if removed_counts[top] == 0:
                        del removed_counts[top]
                    break
                removed_counts[top] -= 1
                if removed_counts[top] == 0:
                    del removed_counts[top]
    
    def _clean(heap: list[float], is_lower: bool) -> None:
        while heap:
            val = -heap[0] if is_lower else heap[0]
            if val in removed_counts:
                heapq.heappop(heap)
                removed_counts[val] -= 1
                if removed_counts[val] == 0:
                    del removed_counts[val]
            else:
                break
    
    def _rebalance() -> None:
        _clean(lower, True)
        _clean(upper, False)
        while len(lower) > target_lower:
            val = -heapq.heappop(lower)
            heapq.heappush(upper, val)
        while len(upper) > target_upper:
            val = heapq.heappop(upper)
            heapq.heappush(lower, -val)
    
    # Build initial window
    for i in range(k):
        _add(nums[i])
    _rebalance()
    
    result: list[float] = []
    _clean(lower, True)
    _clean(upper, False)
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append((-lower[0] + upper[0]) / 2.0)
    
    for i in range(k, n):
        old = nums[i - k]
        _remove(old)
        _add(nums[i])
        _rebalance()
        
        _clean(lower, True)
        _clean(upper, False)
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append((-lower[0] + upper[0]) / 2.0)
    
    return result
```

Hmm wait, I want to double-check one thing. In `_remove`, I'm doing `removed_counts[x] = removed_counts.get(x, 0) + 1`. But what if x was already in removed_counts from a previous removal that hasn't been cleaned? That would mean we have multiple pending removals of the same value. The count approach handles this correctly.

Let me trace through a small example:
nums = [1, 2, 3, 4, 5], k = 3

target_lower = 2, target_upper = 1

Initial window [1, 2, 3]:
- Add 1: lower empty, push to upper. upper=[1], assignments=[(1,'upper')]
- Add 2: lower empty, push to upper. upper=[1,2], assignments=[(1,'upper'),(2,'upper')]
- Add 3: lower empty, push to upper. upper=[1,2,3], assignments=[(1,'upper'),(2,'upper'),(3,'upper')]
- Rebalance: 
  - clean: no removed
  - len(lower)=0 < 2, len(upper)=3 > 1
  - Move from upper to lower: pop 1, push to lower. lower=[-1], upper=[2,3]
  - len(lower)=1 < 2, len(upper)=2 > 1
  - Move from upper to lower: pop 2, push to lower. lower=[-1,-2], upper=[3]
  - len(lower)=2, len(upper)=1 ✓

Median: -lower[0] = -(-2) = 2. ✓ (median of [1,2,3] is 2)

Window [2, 3, 4]:
- Remove 1: assignments.popleft() = (1, 'upper'). removed_counts[1]=1
  - Pop from upper: top=2. 2 != 1. removed_counts[2]... wait, 2 is not in removed_counts. 
  - Oh wait, we pop 2 from upper. But 2 is not in removed_counts. We check `if top == x` (2 != 1), then we do `removed_counts[top] -= 1`. But 2 is not in removed_counts! This would give a KeyError.

This is a bug! When we pop from the heap during `_remove`, we might encounter elements that are NOT in `removed_counts`. The logic should be:
- If top == x: we found our target, decrement count
- If top != x: this element is being removed as a side effect (it was in `removed_counts` from a previous operation)

Wait no. Let me re-think. The `_remove` function pops from the heap until it finds the target element. Elements that are popped but are not the target should already be in `removed_counts` (they were marked for removal earlier). If they're not in `removed_counts`, something is wrong.

Actually, the issue is: we only mark elements as removed when we call `_remove`. So if we're popping elements from the heap during `_remove`, the only elements that should be in `removed_counts` are:
1. The target element x (just added to removed_counts)
2. Any previously marked elements that haven't been cleaned up yet

But in my trace above, we're popping 2 from upper, and 2 is not in removed_counts. This means the logic is wrong.

The problem: when we call `_remove(1)`, we mark 1 as removed. Then we pop from upper. The top of upper is 2 (since upper is a min-heap with [2,3]). 2 is not the target. But 2 is a valid element in the heap - it's not supposed to be removed!

I see the issue now. The lazy deletion approach doesn't work this way. We can't just pop elements from the heap until we find the target, because the heap is ordered and the target might be deep in the heap.

The correct approach for lazy deletion:
- Mark the element as removed (add to removed_counts)
- Don't immediately remove it from the heap
- When we need to access the top of the heap, clean it (pop elements that are in removed_counts)
- The element will eventually be cleaned up when it reaches the top

But this means the heap sizes are wrong! `len(lower)` and `len(upper)` include the removed elements.

So I need to track the "effective" size of each heap. Let me use a different approach:

```python
lower_size = 0  # effective size of lower
upper_size = 0  # effective size of upper
```

When we add: increment the appropriate size
When we remove: decrement the appropriate size
When we clean: decrement the size for each element popped

And in `_rebalance`, we use the effective sizes.

Let me redo:

```python
def _add(x):
    if lower and x <= -lower[0]:
        heapq.heappush(lower, -x)
        lower_size += 1
        assignments.append((x, 'lower'))
    else:
        heapq.heappush(upper, x)
        upper_size += 1
        assignments.append((x, 'upper'))

def _remove(x):
    _val, heap_name = assignments.popleft()
    removed_counts[x] = removed_counts.get(x, 0) + 1
    if heap_name == 'lower':
        lower_size -= 1
    else:
        upper_size -= 1

def _clean(heap, is_lower):
    while heap:
        val = -heap[0] if is_lower else heap[0]
        if val in removed_counts:
            heapq.heappop(heap)
            removed_counts[val] -= 1
            if removed_counts[val] == 0:
                del removed_counts[val]
            if is_lower:
                lower_size -= 1
            else:
                upper_size -= 1
        else:
            break

def _rebalance():
    _clean(lower, True)
    _clean(upper, False)
    while lower_size > target_lower:
        val = -heapq.heappop(lower)
        lower_size -= 1
        heapq.heappush(upper, val)
        upper_size += 1
    while upper_size > target_upper:
        val = heapq.heappop(upper)
        upper_size -= 1
        heapq.heappush(lower, -val)
        lower_size += 1
```

Wait, but there's still an issue. When we pop from lower in `_rebalance`, the element we pop might be in `removed_counts`. We need to handle that.

Actually, let me think about this differently. The `_clean` function ensures the top of each heap is valid before we do any operation. After `_clean`, the top elements are valid. When we pop in `_rebalance`, we're popping valid elements (not in removed_counts). So we don't need to check.

But wait - what if after cleaning the top, the second element is in removed_counts? We don't clean the entire heap, just the top. When we pop the top (which is valid), the new top might be in removed_counts. But we only pop one element per rebalance step, and we call `_clean` before rebalancing.

Hmm, actually in `_rebalance`, after popping from lower and pushing to upper, the new top of lower might be a removed element. But we only do this once (or a few times), and then we call `_clean` again for the next window.

Let me trace through the example again:

nums = [1, 2, 3, 4, 5], k = 3
target_lower = 2, target_upper = 1

Initial window [1, 2, 3]:
- Add 1: lower empty → upper. upper=[1], upper_size=1, assignments=[(1,'upper')]
- Add 2: lower empty → upper. upper=[1,2], upper_size=2, assignments=[(1,'upper'),(2,'upper')]
- Add 3: lower empty → upper. upper=[1,2,3], upper_size=3, assignments=[(1,'upper'),(2,'upper'),(3,'upper')]
- Rebalance:
  - clean lower: lower empty, no-op
  - clean upper: top=1, not in removed_counts, stop
  - lower_size=0 < 2, upper_size=3 > 1
  - Pop from upper: top=1, push to lower. lower=[-1], lower_size=1, upper=[2,3], upper_size=2
  - upper_size=2 > 1: Pop from upper: top=2, push to lower. lower=[-1,-2], lower_size=2, upper=[3], upper_size=1
  - Done. lower_size=2, upper_size=1 ✓

Median: -lower[0] = 2 ✓

Window [2, 3, 4]:
- Remove 1: assignments.popleft()=(1,'upper'). removed_counts[1]=1. upper_size=0.
- Add 4: lower non-empty, 4 > -lower[0]=2. Push to upper. upper=[3,4], upper_size=1. assignments=[(2,'upper'),(3,'upper'),(4,'upper')]
- Rebalance:
  - clean lower: top=-(-2)=2, not in removed_counts. Stop.
  - clean upper: top=3, not in removed_counts. Stop.
  - lower_size=2, upper_size=1. Both at target. No rebalancing needed.

Wait, but upper_size went from 1 to 0 (remove) to 1 (add). And lower_size stayed at 2. So we're fine.

Median: -lower[0] = 2. Median of [2,3,4] is 3. WRONG!

The issue: after removing 1 and adding 4, the elements are [2, 3, 4]. Lower should have [2, 3] and upper should have [4]. But lower has [2] (size 2 means it has 2 elements... wait, lower=[-1, -2] which is {1, 2}. But 1 was removed!

Ah, I see the problem. After removing 1, lower still has [-1, -2] in the heap, but the effective size is... wait, I decremented upper_size, not lower_size. Let me re-check.

When we remove 1, it was in 'upper'. So upper_size decreases by 1. lower_size stays at 2.

But lower still contains -1 (value 1) in the heap! The effective size of lower is 2, but one of those elements (1) is marked as removed. So the effective size should be 1, not 2.

The problem: when we mark an element as removed, we decrement the size of the heap it was in. But the element is still physically in the heap. The "effective size" tracks how many valid elements are in the heap.

Wait, I think I have the logic right. Let me re-trace:

After initial window: lower=[-1,-2] (values 1,2), upper=[3] (value 3)
lower_size=2, upper_size=1

Remove 1 (was in upper): upper_size becomes 0. removed_counts={1:1}
Add 4 (goes to upper since 4 > 2): upper=[3,4], upper_size=1

Rebalance:
- clean lower: top of lower is -1 (value 1). 1 is in removed_counts! Pop it. lower=[-2], lower_size=1. removed_counts={}.
- clean upper: top=3, not in removed_counts. Stop.
- lower_size=1 < 2, upper_size=1 = target_upper. 
- Need to move from upper to lower: pop 3 from upper, push to lower. lower=[-2,-3], lower_size=2, upper=[4], upper_size=1.

Median: -lower[0] = 3. Median of [2,3,4] is 3. ✓

Now I see - the `_clean` in `_rebalance` handles this correctly. When we clean lower, we remove the stale element (1) and adjust the size.

Let me continue:

Window [3, 4, 5]:
- Remove 2 (was in lower): lower_size=1. removed_counts={2:1}
- Add 5 (5 > -lower[0]=-3, so 5 > 3): push to upper. upper=[4,5], upper_size=2
- Rebalance:
  - clean lower: top=-(-3)=3, not in removed_counts. Stop.
  - clean upper: top=4, not in removed_counts. Stop.
  - lower_size=1 < 2, upper_size=2 > 1.
  - Move from upper to lower: pop 4, push to lower. lower=[-3,-4], lower_size=2, upper=[5], upper_size=1.

Median: -lower[0] = 3. Median of [3,4,5] is 4. WRONG!

Hmm, the median of [3,4,5] should be 4. But we get 3.

The issue: after cleaning, lower has values {3, 4} and upper has {5}. The median of [3,4,5] with k=3 should be the 2nd element (0-indexed), which is 4. With lower having 2 elements and upper having 1, the median is the max of lower = 4. But we're getting -lower[0] = 3.

Wait, lower=[-3, -4]. The max-heap with negatives: the top is -3 (smallest negative = largest value... no wait). In a min-heap of negatives, the top is the most negative, which corresponds to the largest value. So -lower[0] = -(-4) = 4? No...

Let me re-examine. `lower` is a min-heap of negatives. So:
- lower = [-3, -4] means the heap has -3 and -4
- The top (min) is -4 (since -4 < -3)
- -lower[0] = -(-4) = 4

Wait, Python's heapq is a min-heap. So the smallest element is at index 0. In our lower heap (storing negatives), the smallest negative is the most negative, which corresponds to the largest original value.

So lower = [-3, -4]: top is -4, meaning the largest value in lower is 4. -lower[0] = 4. That's correct!

Let me re-trace. After the rebalance for window [3,4,5]:
- lower had [-3] (value 3), upper had [4, 5]
- lower_size=1, upper_size=2
- Move from upper to lower: pop min from upper = 4. Push -4 to lower. lower = [-3, -4], lower_size=2. upper=[5], upper_size=1.

-lower[0]: lower is a min-heap of [-3, -4]. The min is -4. So -lower[0] = 4. ✓

I made an arithmetic error earlier. The median is 4. ✓

Great, so the algorithm is correct. Let me also verify with even k.

nums = [1, 2, 3, 4], k = 2
target_lower = 1, target_upper = 1

Window [1, 2]:
- Add 1: upper=[1], upper_size=1
- Add 2: 2 > -lower[0]? lower is empty, so push to upper. upper=[1,2], upper_size=2
- Rebalance:
  - clean: no removed
  - lower_size=0 < 1, upper_size=2 > 1
  - Pop from upper: 1, push to lower. lower=[-1], lower_size=1, upper=[2], upper_size=1
- Median: (-lower[0] + upper[0]) / 2 = (1 + 2) / 2 = 1.5 ✓

Window [2, 3]:
- Remove 1 (was in lower): lower_size=0, removed_counts={1:1}
- Add 3: 3 > -lower[0]? lower is empty (effectively), push to upper. upper=[2,3], upper_size=2
- Rebalance:
  - clean lower: lower=[-1], top=1, in removed_counts. Pop. lower=[], lower_size=0. removed_counts={}
  - clean upper: top=2, not in removed. Stop.
  - lower_size=0 < 1, upper_size=2 > 1
  - Pop from upper: 2, push to lower. lower=[-2], lower_size=1, upper=[3], upper_size=1
- Median: (2 + 3) / 2 = 2.5 ✓

Window [3, 4]:
- Remove 2 (was in lower): lower_size=0, removed_counts={2:1}
- Add 4: lower empty, push to upper. upper=[3,4], upper_size=2
- Rebalance:
  - clean lower: lower=[-2], top=2, in removed. Pop. lower=[], lower_size=0.
  - clean upper: top=3, not in removed. Stop.
  - lower_size=0 < 1, upper_size=2 > 1
  - Pop from upper: 3, push to lower. lower=[-3], lower_size=1, upper=[4], upper_size=1
- Median: (3 + 4) / 2 = 3.5 ✓

The algorithm works correctly.

Now let me think about potential issues:
1. What if the heap is empty when we try to pop in `_rebalance`? Since total effective size = k, and target_lower + target_upper = k, one of the heaps must have more than its target. So we won't try to pop from an empty heap.

2. What about the `_add` function when `lower` is empty? We push to upper. That's fine.

3. What about when `lower` is non-empty but the new element is larger than the max of lower? We push to upper. Correct.

I think the solution is solid. Let me write the final version.

One more thing: I should make sure the type annotations are correct and the function signature matches what's requested.

Let me also consider: do I need to handle the case where `nums` is empty? If k > len(nums), we raise ValueError. If nums is empty and k=1, then k > len(nums) = 0, so we raise ValueError. Good.

Actually wait - if nums is empty, len(nums) = 0, and k must be >= 1, so k > 0 = len(nums), and we raise ValueError. Good.

Let me finalize:

```python
import heapq
from collections import deque


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    target_lower = (k + 1) // 2
    target_upper = k // 2

    lower: list[float] = []   # max-heap via negated values
    upper: list[float] = []   # min-heap
    removed_counts: dict[float, int] = {}
    assignments: deque[tuple[float, str]] = deque()
    lower_size = 0
    upper_size = 0

    def _add(x: float) -> None:
        nonlocal lower_size, upper_size
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_size += 1
            assignments.append((x, "lower"))
        else:
            heapq.heappush(upper, x)
            upper_size += 1
            assignments.append((x, "upper"))

    def _remove(x: float) -> None:
        nonlocal lower_size, upper_size
        _val, heap_name = assignments.popleft()
        removed_counts[x] = removed_counts.get(x, 0) + 1
        if heap_name == "lower":
            lower_size -= 1
        else:
            upper_size -= 1

    def _clean(heap: list[float], is_lower: bool) -> None:
        nonlocal lower_size, upper_size
        while heap:
            val = -heap[0] if is_lower else heap[0]
            if val in removed_counts:
                heapq.heappop(heap)
                removed_counts[val] -= 1
                if removed_counts[val] == 0:
                    del removed_counts[val]
                if is_lower:
                    lower_size -= 1
                else:
                    upper_size -= 1
            else:
                break

    def _rebalance() -> None:
        _clean(lower, True)
        _clean(upper, False)
        while lower_size > target_lower:
            val = -heapq.heappop(lower)
            lower_size -= 1
            heapq.heappush(upper, val)
            upper_size += 1
        while upper_size > target_upper:
            val = heapq.heappop(upper)
            upper_size -= 1
            heapq.heappush(lower, -val)
            lower_size += 1

    # Build initial window
    for i in range(k):
        _add(nums[i])
    _rebalance()

    result: list[float] = []
    _clean(lower, True)
    _clean(upper, False)
    if k % 2 == 1:
        result.append(float(-lower[0]))
    else:
        result.append((-lower[0] + upper[0]) / 2.0)

    for i in range(k, n):
        _remove(nums[i - k])
        _add(nums[i])
        _rebalance()

        _clean(lower, True)
        _clean(upper, False)
        if k % 2 == 1:
            result.append(float(-lower[0]))
        else:
            result.append((-lower[0] + upper[0]) / 2.0)

    return result
```

This looks good. Let me verify the complexity:
- Initialization: O(k log k)
- Each window step: O(log k) amortized (the _clean operations are amortized O(1) since each element is cleaned at most once)
- Total: O(n log k)

For n=200,000, k=1,000: ~2,000,000 heap operations. Each heap operation is O(log 1000) ≈ 10 comparisons. Total ~20M comparisons. In Python, this should take well under 1 second.

I'm satisfied with this solution. Let me write the final clean version.
