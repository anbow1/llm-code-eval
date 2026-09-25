The user wants a `sliding_median` function that computes the median of every contiguous window of size k over a list of floats.

Requirements:
- For even k, median is mean of two middle values
- Return floats
- Raise ValueError if k < 1 or k > len(nums)
- Must be efficient: n=200,000 with k=1,000 must finish well under 2 seconds

Approach options:
1. **Two heaps (max-heap and min-heap)**: Classic sliding window median. But with standard library, we only have `heapq` (min-heap). We can simulate max-heap by negating values. The challenge is lazy deletion when elements leave the window.

2. **SortedList from sortedcontainers**: Not standard library.

3. **Two heaps with lazy deletion**: Use a max-heap (negated min-heap) for the lower half and a min-heap for the upper half. When elements expire, mark them as "to-be-deleted" and lazily remove them from the top of heaps when they surface.

Let me think about the two-heap approach:
- `lo`: max-heap (store negated values) for the lower half, size = ceil(k/2)
- `hi`: min-heap for the upper half, size = floor(k/2)
- Median: if k is odd, top of lo. If k is even, mean of top of lo and top of hi.

For sliding:
- When a new element comes in, insert into appropriate heap.
- When an old element leaves, mark it for lazy deletion.
- Rebalance heaps to maintain size invariant.
- Clean tops (remove lazily-deleted elements from tops).

The lazy deletion technique: maintain a dictionary `delayed` counting how many times each value should be deleted. Also maintain `lo_size` and `hi_size` tracking the "effective" sizes (not counting delayed elements at the top).

Actually, let me think more carefully. The standard approach:

- `lo` is a max-heap (negated) of size `k//2 + 1` (for odd k) or `k//2` (for even k). Wait, let me use: lo has size `(k+1)//2` and hi has size `k//2`.
- `delayed`: dict mapping value -> count of times it should be deleted
- `lo_size`, `hi_size`: effective sizes (total elements minus delayed ones still in the heap)

Operations:
- `make_balance()`: ensure lo_size == (k+1)//2 and hi_size == k//2
- `clean_top(heap)`: while top of heap is in delayed, pop it and decrement count
- `prune(heap, val)`: mark val as delayed, decrement heap_size if val is in that heap's range
- `insert(num)`: if lo is empty or num <= -lo[0], push to lo, else push to hi. Then balance.
- `remove(num)`: mark num as delayed. Decrement appropriate size. Then balance.

Wait, for determining which heap a value belongs to: value <= -lo[0] means it's in lo's range. But after insertions and deletions, this might not be perfectly accurate. Let me use the standard approach:

Actually, let me think about this differently. The standard lazy deletion two-heap approach:

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    # lo: max-heap (negated), size (k+1)//2
    # hi: min-heap, size k//2
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def clean_top(heap):
        while heap:
            val = -heap[0] if heap is lo else heap[0]
            if delayed[val] > 0:
                delayed[val] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def prune(heap, val):
        # mark val as delayed
        delayed[val] += 1
        # decrement appropriate size
        nonlocal lo_size, hi_size
        if val <= -lo[0] if lo else True:  # val belongs to lo
            lo_size -= 1
        else:
            hi_size -= 1
    
    def make_balance():
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2
        # move from lo to hi
        while lo_size > target_lo:
            clean_top(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        # move from hi to lo
        while lo_size < target_lo:
            clean_top(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        # also need to clean tops after operations
        clean_top(lo)
        clean_top(hi)
    
    ...
```

Hmm, this is getting complex. Let me think about performance. With n=200,000 and k=1,000, we have 199,001 windows. Each window requires O(log k) operations. That's about 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. Should be well under 2 seconds in Python.

Actually, let me reconsider. Python's heapq operations are O(log n) but with constant overhead. 200,000 iterations with a few heap operations each should be fine.

Let me write the complete solution carefully:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    result = []
    
    # lo: max-heap (store negated), effective size = (k+1)//2
    # hi: min-heap, effective size = k//2
    lo = []
    hi = []
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0
    
    def clean_top(heap):
        while heap:
            top = -heap[0] if heap is lo else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def prune(val):
        nonlocal lo_size, hi_size
        delayed[val] += 1
        if lo and val <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
    
    def make_balance():
        nonlocal lo_size, hi_size
        target_lo = (k + 1) // 2
        
        # Rebalance: ensure lo_size == target_lo
        while lo_size > target_lo:
            clean_top(lo)
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        
        while lo_size < target_lo:
            clean_top(hi)
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        clean_top(lo)
        clean_top(hi)
    
    def insert(val):
        nonlocal lo_size, hi_size
        if not lo or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
        else:
            heapq.heappush(hi, val)
            hi_size += 1
        make_balance()
    
    def remove(val):
        prune(val)
        make_balance()
    
    def get_median():
        clean_top(lo)
        clean_top(hi)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    # Initialize first window
    for i in range(k):
        insert(nums[i])
    
    result.append(get_median())
    
    # Slide
    for i in range(k, n):
        remove(nums[i - k])
        insert(nums[i])
        result.append(get_median())
    
    return result
```

Wait, there's a subtle issue with `prune`. When we check `val <= -lo[0]`, the top of lo might be a delayed element. But actually, we call `clean_top` in `make_balance` after `prune`. The issue is: at the time of `prune`, the top of lo might not be cleaned. But actually, we always call `make_balance` after `prune`, which calls `clean_top`. So the sequence is: prune (mark delayed, decrement size) -> make_balance (clean tops, rebalance).

But there's another issue: in `prune`, we check `val <= -lo[0]` to decide which heap the value belongs to. But if the top of lo is delayed, this comparison might be wrong. However, since we maintain the invariant that all elements in lo are <= all elements in hi, the comparison `val <= -lo[0]` should correctly identify which heap val was in... unless the top is stale.

Actually, let me think again. The invariant is: every element in lo (after removing delayed ones) is <= every element in hi (after removing delayed ones). The top of lo (after cleaning) is the max of lo. The top of hi (after cleaning) is the min of hi.

When we prune a value, we need to know which heap it's in. If `val <= -lo[0]` (the current top of lo, which might be stale), it could be wrong. But actually, since lo contains all values <= some threshold and hi contains all values > that threshold, and val was inserted into one of them, checking against the current top should work in most cases.

Hmm, actually there's a known issue. Let me look at this more carefully.

The standard approach from LeetCode 480 solution: when pruning, you check if the value is <= the top of lo (max of lower half). If yes, it was in lo. If no, it was in hi. This works because of the invariant maintained by the two heaps.

But if the top of lo is a delayed element, the comparison might be off. However, since we call `clean_top` in `make_balance` right after, and the rebalancing moves elements correctly, it should still work. The key insight is: even if we temporarily misclassify which heap a delayed element belongs to, the lazy deletion will handle it when it reaches the top.

Actually wait - the size tracking could get wrong. If we decrement lo_size when the element was actually in hi (or vice versa), the rebalancing will be off.

Let me reconsider. Actually, the standard solution does handle this correctly because:
- The invariant is: max(lo) <= min(hi)
- When we insert val, we put it in lo if val <= max(lo), else in hi
- When we prune val, if val <= max(lo), it must have been in lo (because if it were in hi, it would be >= min(hi) >= max(lo) >= val, contradiction unless val == max(lo) == min(hi))

Wait, if val == max(lo) == min(hi), it could be in either. But we'll clean it up eventually.

Actually, I think the standard approach works. Let me just be careful.

One more issue: `heapq.heappush` and `heapq.heappop` work on lists. When I do `heapq.heappop(lo)`, it pops from `lo`. The `clean_top` function takes a heap parameter, but `heapq.heappop` works on any list (it's a min-heap by default). For `lo`, we store negated values, so it's a min-heap of negated values = max-heap of original values. `heapq.heappop(lo)` gives us the smallest negated value = largest original value. Good.

Let me also handle the edge case where lo or hi might be empty. If k=1, hi is always empty. `get_median` for odd k just returns -lo[0]. For even k, both should be non-empty.

Let me also make sure `clean_top` works correctly. It needs to pop from the correct heap. Since `lo` stores negated values, `heap[0]` for lo gives the most negative = largest original. We check `delayed[-heap[0]]`.

Actually, I realize there might be an issue with `clean_top` when `heap is lo` - since `lo` is a local variable in the outer function, and `clean_top` is a nested function, it should capture `lo` correctly. But using `heap is lo` as a comparison... in Python, `is` checks identity. Since `lo` is a list and we pass it as an argument, `heap is lo` should be True when we pass `lo`. Let me verify this works.

Actually, a cleaner approach: pass a flag or just handle the negation outside.

Let me rewrite more carefully:

```python
def clean_top_lo():
    while lo:
        top = -lo[0]
        if delayed[top] > 0:
            delayed[top] -= 1
            heapq.heappop(lo)
        else:
            break

def clean_top_hi():
    while hi:
        top = hi[0]
        if delayed[top] > 0:
            delayed[top] -= 1
            heapq.heappop(hi)
        else:
            break
```

This is cleaner. Let me finalize the solution.

One more thought on performance: using `defaultdict(int)` for delayed lookups is O(1) amortized. Heap operations are O(log k). With k=1000, log(k) ≈ 10. We do a constant number of heap ops per window, so total is O(n log k) ≈ 200,000 * 10 = 2,000,000 basic operations. In Python, this should run in well under 2 seconds.

Let me also consider: should I use `bisect.insort` with a sorted list? For k=1000, each insert/delete in a sorted list is O(k) for the shift. Total: 200,000 * 1000 = 200,000,000 operations. That might be too slow in Python. The heap approach is better.

Actually wait, with bisect the binary search is O(log k) but the insertion/deletion into a list is O(k) due to shifting. For k=1000 and n=200,000, that's 200M list operations which in Python might take a few seconds. The heap approach with lazy deletion is O(n log k) which is much better.

Let me finalize.
