The user wants a sliding window median function that's efficient for n=200,000 and k=1,000.

Let me think about the approach:

1. **Naive approach**: For each window, sort the k elements and find the median. This is O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations. That's way too slow.

2. **Two heaps approach**: Use a max-heap for the lower half and a min-heap for the upper half. This gives O(n*log(k)) which is 200,000 * 10 = 2,000,000 operations. This should be fast enough.

3. **Using `sortedcontainers`**: Not available in standard library.

4. **Using two heaps with lazy deletion**: 
   - Maintain a max-heap (lower half) and min-heap (upper half)
   - When sliding the window, remove the element that leaves and add the new one
   - Use lazy deletion (mark elements as deleted, clean up when they reach the top)

Let me think about the two-heaps approach more carefully:

- `max_heap` (lower half): stores negative values (since Python only has min-heap)
- `min_heap` (upper half): stores positive values
- We want `len(max_heap) >= len(min_heap)` and `len(max_heap) - len(min_heap) <= 1`

For the sliding window:
- Initialize with first k elements
- For each slide:
  - Remove the element leaving the window
  - Add the new element
  - Rebalance
  - Compute median

The tricky part is removing arbitrary elements from a heap. We use lazy deletion:
- Keep a `to_remove` dict that counts how many times each value should be removed
- When cleaning the top of a heap, if the top is in `to_remove`, pop it and decrement the count

Let me code this up:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # max_heap stores negatives (lower half)
    # min_heap stores positives (upper half)
    max_heap = []  # lower half, store -x
    min_heap = []  # upper half
    to_remove = {}  # value -> count of removals pending
    
    def clean_max_heap():
        while max_heap and -max_heap[0] in to_remove and to_remove[-max_heap[0]] > 0:
            heapq.heappop(max_heap)
            to_remove[-max_heap[0]] -= 1
    
    def clean_min_heap():
        while min_heap and min_heap[0] in to_remove and to_remove[min_heap[0]] > 0:
            heapq.heappop(min_heap)
            to_remove[min_heap[0]] -= 1
    
    def get_max_heap_size():
        return len(max_heap) - sum(to_remove.values())  # No, this is wrong
    
    # Actually, let me track sizes separately
    # max_size = number of "live" elements in max_heap
    # min_size = number of "live" elements in min_heap
    
    # Let me rethink. I'll track sizes explicitly.
    
    max_size = 0
    min_size = 0
    
    def add_to_max_heap(x):
        heapq.heappush(max_heap, -x)
        nonlocal max_size
        max_size += 1
    
    def add_to_min_heap(x):
        heapq.heappush(min_heap, x)
        nonlocal min_size
        min_size += 1
    
    def remove_from_heap(x):
        # We need to figure out which heap x is in
        # Actually, we can just mark it for removal and let cleaning handle it
        # But we need to know which heap to decrement
        pass
```

Hmm, the issue is: when we remove an element, we don't know which heap it's in. One approach:
- Check if x <= current max of max_heap (i.e., -max_heap[0] after cleaning). If so, it's in max_heap. Otherwise, it's in min_heap.

Wait, that's not quite right either. Let me think differently.

Actually, a cleaner approach:
- When removing x, we add x to `to_remove`
- We need to figure out which heap it belongs to. We can check: if x <= -max_heap[0] (after cleaning top), it's in max_heap, else in min_heap.

Wait, but the top might be stale. Let me clean first, then check.

Actually, let me use a different approach. I'll track which heap each element conceptually belongs to by checking against the boundary.

Let me reconsider:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    max_heap = []  # lower half, negated
    min_heap = []  # upper half
    to_remove = {}
    max_size = 0
    min_size = 0
    
    def clean_top(heap, negated=False):
        while heap:
            top = -heap[0] if negated else heap[0]
            if to_remove.get(top, 0) > 0:
                heapq.heappop(heap)
                to_remove[top] -= 1
            else:
                break
    
    def add(x):
        nonlocal max_size, min_size
        if not max_heap or x <= -max_heap[0]:
            heapq.heappush(max_heap, -x)
            max_size += 1
        else:
            heapq.heappush(min_heap, x)
            min_size += 1
        # Rebalance
        if max_size > min_size + 1:
            heapq.heappush(min_heap, -heapq.heappop(max_heap))
            max_size -= 1
            min_size += 1
        elif min_size > max_size:
            heapq.heappush(max_heap, -heapq.heappop(min_heap))
            min_size -= 1
            max_size += 1
    
    def remove(x):
        nonlocal max_size, min_size
        to_remove[x] = to_remove.get(x, 0) + 1
        clean_top(max_heap, negated=True)
        clean_top(min_heap, negated=False)
        # Determine which heap x was in
        if x <= -max_heap[0] if max_heap else True:
            max_size -= 1
        else:
            min_size -= 1
        # Rebalance
        if max_size > min_size + 1:
            heapq.heappush(min_heap, -heapq.heappop(max_heap))
            max_size -= 1
            min_size += 1
        elif min_size > max_size:
            heapq.heappush(max_heap, -heapq.heappop(min_heap))
            min_size -= 1
            max_size += 1
    
    # Initialize
    for i in range(k):
        add(nums[i])
    
    results = []
    
    def get_median():
        clean_top(max_heap, negated=True)
        clean_top(min_heap, negated=False)
        if k % 2 == 1:
            return float(-max_heap[0])
        else:
            return (-max_heap[0] + min_heap[0]) / 2.0
    
    results.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        results.append(get_median())
    
    return results
```

Wait, there's a problem with the `remove` function. When I clean the tops and then check which heap x is in, the logic `x <= -max_heap[0]` isn't quite right. If x was in max_heap but it's not at the top, after cleaning, the top might be smaller than x (in absolute value), meaning x could be in max_heap but not at the top.

Actually, the issue is: if x is in max_heap, then x <= -max_heap[0] (the current max of the lower half). If x is in min_heap, then x >= min_heap[0] (the current min of the upper half). And since all elements in max_heap <= all elements in min_heap, we have -max_heap[0] <= min_heap[0].

So: if x <= -max_heap[0], x is in max_heap. If x >= min_heap[0], x is in min_heap. Since the heaps are balanced, one of these must be true (they overlap at the boundary).

But wait, what if x equals both? Like x == -max_heap[0] == min_heap[0]? Then it could be in either. In that case, we can just pick one.

Actually, the standard approach is:
- If x <= -max_heap[0] (after cleaning), assume it's in max_heap
- Otherwise, it's in min_heap

This works because of the invariant that all elements in max_heap <= all elements in min_heap.

Let me also think about edge cases with floating point. Since we're dealing with floats, exact comparison should be fine for the `<=` check since we're comparing the same values.

Wait, actually there's a subtle issue. If there are duplicate values, the `to_remove` approach with counts handles it correctly.

Let me also think about the `clean_top` function. When I pop from the heap, I need to decrement the count. But what if the value appears multiple times in the heap? The `to_remove` dict tracks how many removals are pending for each value. When I pop a value from the heap, I decrement the count. This should work correctly.

Let me trace through a small example:
- nums = [1, 3, 2], k = 2
- Initialize: add(1), add(3)
  - add(1): max_heap = [-1], max_size=1, min_size=0
  - add(3): 3 > -(-1)=1, so min_heap = [3], min_size=1
  - Rebalance: max_size=1, min_size=1, ok
  - Median: (1+3)/2 = 2.0

- Slide: remove(1), add(2)
  - remove(1): to_remove={1:1}, clean max_heap: top is -1, -(-1)=1, to_remove[1]=1>0, pop. max_heap=[]. max_size=0.
    - 1 <= -max_heap[0]? max_heap is empty, so we use the `if max_heap else True` condition. So max_size becomes -1? That's wrong!

I need to handle the case where max_heap is empty after cleaning. Let me fix:

```python
def remove(x):
    nonlocal max_size, min_size
    to_remove[x] = to_remove.get(x, 0) + 1
    clean_top(max_heap, negated=True)
    clean_top(min_heap, negated=False)
    if max_heap and x <= -max_heap[0]:
        max_size -= 1
    else:
        min_size -= 1
    # Rebalance
    ...
```

Wait, but if max_heap is empty after cleaning, then x must have been in min_heap (since it was removed from max_heap and the heap is now empty). Actually no - if max_heap is empty, it means all elements were removed from it. But we only removed one element (x). So if max_heap becomes empty, x was the only element in max_heap, and max_size should go from 1 to 0.

Hmm, let me reconsider. The issue is: after cleaning, if max_heap is empty, it means x was in max_heap (since we just removed it and now the heap is empty). So:

```python
if max_heap and x <= -max_heap[0]:
    max_size -= 1
elif not max_heap:
    max_size -= 1  # x was in max_heap
else:
    min_size -= 1
```

Wait, that's equivalent to:
```python
if not max_heap or x <= -max_heap[0]:
    max_size -= 1
else:
    min_size -= 1
```

Hmm, but what if max_heap is empty and x was actually in min_heap? That can't happen because if max_heap is empty, all its elements have been cleaned (removed), and we only added one removal. So x must have been in max_heap.

Actually wait, could it be that max_heap had some stale elements that got cleaned, and x was in min_heap? Let's say max_heap had [a, b] where a is stale (in to_remove) and b is not. We clean, popping a. Now max_heap = [b]. x could be in min_heap. In this case, max_heap is not empty, and we check x <= -max_heap[0] = b. If x > b, then x is in min_heap. Correct.

What if max_heap had [a] where a is stale? We clean, popping a. Now max_heap = []. x could be in min_heap. In this case, max_heap is empty. But x was in min_heap, not max_heap! So `not max_heap` doesn't mean x was in max_heap.

Hmm, this is a problem. Let me think of another approach.

Alternative: instead of checking which heap x is in, I can track it differently. 

Actually, let me reconsider. The invariant is: all elements in max_heap <= all elements in min_heap. So -max_heap[0] <= min_heap[0].

When we remove x:
- If x <= -max_heap[0] (after cleaning), x is in max_heap
- If x >= min_heap[0] (after cleaning), x is in min_heap
- If -max_heap[0] == min_heap[0] == x, it could be in either

But what if max_heap is empty after cleaning? Then x must have been in max_heap (since the only way max_heap becomes empty is if we removed its last element, which is x). Wait no, max_heap could have had multiple stale elements. Let me think again...

Actually, the `to_remove` mechanism ensures that we only clean elements that are actually marked for removal. So if max_heap becomes empty after cleaning, it means ALL elements in max_heap were marked for removal. But we only added one removal (for x). So max_heap could only have had one element (x) that was marked for removal, OR max_heap had multiple elements all marked for removal from previous operations.

Wait, that's possible! If in a previous step, we marked some element for removal but it wasn't at the top, it stays in the heap. Then in a later step, it reaches the top and gets cleaned. So max_heap could lose multiple elements in one cleaning operation.

OK so the issue is real. Let me use a different approach to determine which heap x is in.

Alternative approach: I'll check `x <= -max_heap[0]` if max_heap is non-empty, and `x >= min_heap[0]` if min_heap is non-empty. Given the invariant, exactly one of these should determine the heap (or both if they're equal, in which case we can pick either).

But if max_heap is empty, we can't check. In that case, x must be in min_heap (since max_heap has no live elements).

Wait, no. If max_heap is empty after cleaning, it means all its elements were stale. But we only added one new stale element (x). So if max_heap had more than one stale element before this operation, it could become empty. But x might have been in min_heap!

Hmm, I think the safest approach is:

```python
if max_heap and x <= -max_heap[0]:
    max_size -= 1
elif min_heap and x >= min_heap[0]:
    min_size -= 1
else:
    # This case: max_heap is empty or x > -max_heap[0], AND min_heap is empty or x < min_heap[0]
    # This shouldn't happen if invariants are maintained
    # But to be safe, check which size is > 0
    if max_size > 0:
        max_size -= 1
    else:
        min_size -= 1
```

Actually, I think there's a simpler and more robust approach. Let me just check:
- If max_heap is non-empty and x <= -max_heap[0]: x is in max_heap
- Else: x is in min_heap

This works because of the invariant. If max_heap is empty, x must be in min_heap (since there's nothing in max_heap to be x). If max_heap is non-empty and x > -max_heap[0], then x > all elements in max_heap, so x must be in min_heap.

Wait, but what if max_heap is empty because of stale elements being cleaned, and x was actually in max_heap? Then we'd incorrectly put it in min_heap.

Let me think about this more carefully. Suppose:
- max_heap has elements [5, 3] (stored as [-5, -3]), min_heap has [7, 9]
- max_size = 2, min_size = 2
- We remove 3. to_remove[3] = 1.
- Clean max_heap: top is -5, value is 5. to_remove[5] = 0. Don't pop.
- So max_heap is still [-5, -3], top is 5.
- x = 3 <= 5? Yes. So max_size -= 1. Correct!

Another case:
- max_heap has [-5, -3] (values 5, 3), min_heap has [7, 9]
- max_size = 2, min_size = 2
- We remove 5. to_remove[5] = 1.
- Clean max_heap: top is -5, value is 5. to_remove[5] = 1 > 0. Pop. Now max_heap = [-3].
- Clean again: top is -3, value is 3. to_remove[3] = 0. Stop.
- x = 5 <= -max_heap[0] = 3? No! So we'd say x is in min_heap. But x (5) was in max_heap!

This is the bug! After cleaning, the new top (3) is less than x (5), so the check fails.

OK so I need a different approach. Let me think...

One approach: before cleaning, check which heap x is in. But the top might be stale.

Another approach: use a different data structure. Maybe I should use a balanced BST approach? But Python doesn't have one in the standard library.

Alternative: I can use the fact that the total number of elements is known. If I track `max_size` and `min_size`, and I know the total is k, then I just need to figure out which one to decrement.

Actually, here's a better approach: instead of trying to figure out which heap x is in after cleaning, I'll figure it out BEFORE cleaning:

```python
def remove(x):
    nonlocal max_size, min_size
    # Determine which heap x is in BEFORE cleaning
    # If x <= current max of max_heap (even if stale), it's in max_heap
    # But the top might be stale...
```

Hmm, this is getting complicated. Let me think of yet another approach.

**Alternative approach: Use a sorted list with bisect.**

For n=200,000 and k=1,000, using a sorted list:
- Insert: O(k) due to list insertion
- Delete: O(k) due to list deletion
- Total: O(n*k) = 200,000 * 1,000 = 200,000,000

In Python, list insertion/deletion involves memmove which is fast in C. Let me estimate: 200 million operations... each operation is a memmove of up to 1000 elements (8 bytes each) = 8000 bytes. So total memory movement is about 200,000 * 8000 = 1.6 GB. At ~10 GB/s memory bandwidth, that's about 0.16 seconds. Plus the overhead of the bisect and list operations. This might be feasible!

Actually, let me benchmark mentally:
- `bisect.insort` on a list of 1000 elements: the binary search is O(log k) in Python, but the insertion is O(k) in C (memmove). 
- `list.pop(index)` is also O(k) in C.
- So each window operation is O(k) in C code + O(log k) in Python.
- Total: 200,000 * (1000 memmove + log(1000) comparisons)
- The memmove of 1000 floats (8000 bytes) is very fast, maybe 100ns.
- 200,000 * 100ns = 20ms for the memmoves.
- Plus Python overhead for 200,000 iterations.

This should be well under 2 seconds! Let me go with this approach.

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = sorted(nums[:k])
    results = []
    
    def get_median():
        if k % 2 == 1:
            return float(window[k // 2])
        else:
            return (window[k // 2 - 1] + window[k // 2]) / 2.0
    
    results.append(get_median())
    
    for i in range(k, n):
        # Remove nums[i-k]
        idx = bisect.bisect_left(window, nums[i - k])
        window.pop(idx)
        # Add nums[i]
        bisect.insort(window, nums[i])
        results.append(get_median())
    
    return results
```

Wait, but `bisect.insort` is equivalent to `insort` which does `bisect_right` then `list.insert`. And `list.pop(idx)` is O(k). So each iteration is O(k) for the pop + O(k) for the insert = O(k). Total O(n*k).

For n=200,000, k=1,000: 200,000 * 1,000 = 200,000,000 element moves. Each move is 8 bytes (float). Total data moved: 1.6 GB. At memory bandwidth of ~20 GB/s (realistic for sequential access in a small buffer), that's about 80ms. Plus Python overhead. Should be well under 2 seconds.

Actually, let me be more careful. `list.pop(idx)` when idx is in the middle requires moving ~k/2 elements on average. `list.insert(idx, x)` also requires moving ~k/2 elements. So per iteration, we move ~k elements total. For 200,000 iterations with k=1,000: 200,000 * 1,000 * 8 bytes = 1.6 GB of data movement. This is fast.

But there's also the Python overhead of 200,000 iterations, each doing a bisect (log 1000 ≈ 10 comparisons) and two list operations. The Python loop overhead for 200,000 iterations is minimal.

I think this approach will work well. Let me also consider: is there a case where `bisect_left` finds the wrong index? If there are duplicates, `bisect_left` finds the leftmost position. Since we're removing one occurrence, this is fine - we just need to remove one instance of the value, and any position with that value works.

Let me finalize the solution:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = sorted(nums[:k])
    results = []
    
    if k % 2 == 1:
        mid = k // 2
        for i in range(n - k + 1):
            if i > 0:
                out = nums[i - 1]
                idx = bisect.bisect_left(window, out)
                window.pop(idx)
                bisect.insort(window, nums[i + k - 1])
            results.append(float(window[mid]))
    else:
        mid1 = k // 2 - 1
        mid2 = k // 2
        for i in range(n - k + 1):
            if i > 0:
                out = nums[i - 1]
                idx = bisect.bisect_left(window, out)
                window.pop(idx)
                bisect.insort(window, nums[i + k - 1])
            results.append((window[mid1] + window[mid2]) / 2.0)
    
    return results
```

Hmm, let me simplify and just use a helper:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    window = sorted(nums[:k])
    results = []
    
    for i in range(n - k + 1):
        if i > 0:
            out_val = nums[i - 1]
            idx = bisect.bisect_left(window, out_val)
            window.pop(idx)
            bisect.insort(window, nums[i + k - 1])
        
        if k % 2 == 1:
            results.append(float(window[k // 2]))
        else:
            results.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    
    return results
```

This is clean and should be efficient. Let me verify the logic:
- Window starts at index 0, covers nums[0..k-1]
- At step i, window covers nums[i..i+k-1]
- To go from step i-1 to step i: remove nums[i-1], add nums[i+k-1]
- ✓

The `bisect.insort` is from the `bisect` module and is equivalent to `insort`. Let me make sure I'm using it correctly. `bisect.insort(a, x)` inserts x into list a to maintain sorted order.

Actually, I realize I should double-check: `bisect.insort` vs `bisect.insort_right` vs `bisect.insort_left`. The default `bisect.insort` is `insort_right`. For our purposes, it doesn't matter which we use since we just need the list to be sorted.

Let me also make sure the return type is correct. The problem says "Return floats." So all values in the result should be floats. `window[k//2]` is already a float (since nums is list[float]). `(window[k//2-1] + window[k//2]) / 2.0` is also a float. Good.

One more thing: the problem says `nums: list[float]`, so all elements are floats. The median of an odd-length window is just the middle element (a float). The median of an even-length window is the mean of the two middle elements (a float). Both are already floats, so we're good.

I think this solution is correct and efficient. Let me write the final version.
