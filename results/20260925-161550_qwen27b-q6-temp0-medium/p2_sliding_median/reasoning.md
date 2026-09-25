I need to write a `sliding_median` function that efficiently computes the median of every sliding window of size k.

For n=200,000 and k=1,000, I need O(n log k) or similar. The number of windows is n-k+1 ≈ 199,000, and for each I need to find the median.

Approach: Use two heaps (max-heap for lower half, min-heap for upper half) to maintain the median. When sliding the window, I remove the element that leaves and add the new element, then rebalance.

The challenge with the two-heap approach is that removing an arbitrary element from a heap is O(k) in the worst case (you need to find it and replace it). For k=1000, this gives O(n*k) = 200,000 * 1000 = 200 million operations which might be too slow in Python.

Let me think of alternatives:

1. **Two heaps with lazy deletion**: Use a max-heap (lower half) and min-heap (upper half). When removing an element, mark it as "deleted" and lazily clean up from the top. This makes the amortized cost O(log k) per operation.

2. **Using `sortedcontainers`** - not available in stdlib.

3. **Fenwick tree / Binary Indexed Tree with coordinate compression**: Since we need to find the median (k-th order statistic), we can use a BIT. Coordinate compress the values, then for each window, update the BIT (add/remove elements) and binary search for the median. This is O(n log n) overall.

Let me think about the two-heap approach with lazy deletion more carefully:

- `low` is a max-heap (store negatives) containing the lower half
- `high` is a min-heap containing the upper half
- We maintain: len(low) == len(high) or len(low) == len(high) + 1
- For odd k: median = -low[0]
- For even k: median = (-low[0] + high[0]) / 2

When sliding:
- Remove the outgoing element
- Add the incoming element
- Rebalance

The lazy deletion approach:
- Keep a `to_remove` dictionary (or counter)
- When we "remove" an element, we just increment its count in `to_remove`
- Before accessing the top of a heap, we clean up: if the top is in `to_remove`, pop it and decrement the counter

But wait, finding which heap an element belongs to and actually removing it is tricky. Let me think again.

Actually, a simpler approach: when an element leaves the window, we don't immediately remove it from the heap. Instead, we add it to a "to_remove" set/dict. When we need to access the top of a heap, we pop elements until the top is not in "to_remove".

But we also need to track the actual sizes of the heaps (counting only non-removed elements).

Let me think about this more carefully:

```python
import heapq

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    
    # Initialize with first k elements
    # Use two heaps: low (max-heap via negatives), high (min-heap)
    # low: lower half, size >= high size, diff at most 1
    # high: upper half
    
    low = []  # max heap (store negatives)
    high = [] # min heap
    
    # Insert first k elements
    for i in range(k):
        _insert(i, nums[i])
    
    # ... sliding
```

Actually, let me reconsider. For the two-heap approach with lazy deletion:

- We maintain `low` (max-heap) and `high` (min-heap)
- `low_size` and `high_size` track the actual (logical) sizes
- `to_remove` is a Counter of elements that need to be removed

When we "remove" an element `x`:
- We don't know which heap it's in (unless we track it)
- We add x to `to_remove`
- We decrement the appropriate size

Hmm, the problem is we don't know which heap an element is in. One approach: always insert into `low` first, then rebalance. For removal, we can just add to `to_remove` and decrement sizes. But which size to decrement?

Alternative: track which heap each element belongs to using a dict. But that's complicated with the lazy deletion.

Let me try a different approach: **Fenwick Tree with coordinate compression**.

1. Coordinate compress all values in `nums` (sort unique values, map each to an index)
2. Use a BIT to maintain the frequency of each value in the current window
3. For each window, find the k-th smallest element using binary search on the BIT
4. For even k, find both the (k/2)-th and (k/2+1)-th smallest elements

This is O(n log n) for coordinate compression + O(n log n) for the BIT operations (n windows × log(n) for each update and query).

Actually, the BIT approach:
- Coordinate compression: O(n log n)
- For each of the n-k+1 windows:
  - Add one element: O(log n)
  - Remove one element: O(log n)
  - Find k-th smallest: O(log n) (binary search on BIT)
  - For even k, find (k/2+1)-th smallest: O(log n)

Total: O(n log n) which should be fast enough.

Let me code this:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # Coordinate compression
    sorted_unique = sorted(set(nums))
    # Map each value to its index (1-based for BIT)
    val_to_idx = {v: i + 1 for i, v in enumerate(sorted_unique)}
    m = len(sorted_unique)
    
    # BIT (1-indexed)
    tree = [0] * (m + 1)
    
    def bit_update(i, delta):
        while i <= m:
            tree[i] += delta
            i += i & (-i)
    
    def bit_query(i):
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & (-i)
        return s
    
    def bit_kth(k_val):
        # Find the smallest index i such that prefix sum >= k_val
        pos = 0
        log_m = m.bit_length() - 1
        for i in range(log_m, -1, -1):
            nxt = pos + (1 << i)
            if nxt <= m and tree[nxt] < k_val:
                pos = nxt
                k_val -= tree[nxt]
        return pos + 1
    
    # Initialize BIT with first k elements
    for i in range(k):
        bit_update(val_to_idx[nums[i]], 1)
    
    result = []
    
    for start in range(n - k + 1):
        # Find median
        if k % 2 == 1:
            mid_idx = bit_kth((k + 1) // 2)
            result.append(sorted_unique[mid_idx - 1])
        else:
            mid1_idx = bit_kth(k // 2)
            mid2_idx = bit_kth(k // 2 + 1)
            result.append((sorted_unique[mid1_idx - 1] + sorted_unique[mid2_idx - 1]) / 2.0)
        
        # Slide: remove nums[start], add nums[start + k]
        if start + k < n:
            bit_update(val_to_idx[nums[start]], -1)
            bit_update(val_to_idx[nums[start + k]], 1)
    
    return result
```

Wait, let me verify the `bit_kth` function. The BIT stores frequencies. `bit_query(i)` gives the count of elements with compressed index <= i. We want to find the smallest index `i` such that `bit_query(i) >= k_val`. The binary search approach:

Start with pos = 0. For each bit from high to low:
- If pos + 2^bit <= m and the sum up to pos + 2^bit is still < k_val, move pos there.
- At the end, the answer is pos + 1.

Yes, that's correct.

Let me verify with a small example:
- nums = [1, 3, 2, 4], k = 2
- sorted_unique = [1, 2, 3, 4]
- val_to_idx = {1:1, 2:2, 3:3, 4:4}
- m = 4

Window [1, 3]: BIT has 1 at idx 1, 1 at idx 3
- k=2, even: find kth(1) and kth(2)
- kth(1): should return 1 (value 1)
- kth(2): should return 3 (value 3)
- median = (1 + 3) / 2 = 2.0 ✓

Window [3, 2]: BIT has 1 at idx 2, 1 at idx 3
- kth(1): should return 2 (value 2)
- kth(2): should return 3 (value 3)
- median = (2 + 3) / 2 = 2.5 ✓

Window [2, 4]: BIT has 1 at idx 2, 1 at idx 4
- kth(1): should return 2 (value 2)
- kth(2): should return 4 (value 4)
- median = (2 + 4) / 2 = 3.0 ✓

Looks good!

Now let me think about performance. n=200,000, k=1,000. Number of windows = 199,001. For each window, we do:
- 1 or 2 calls to `bit_kth` (each O(log m) where m ≤ 200,000, so about 18 iterations)
- 2 calls to `bit_update` (each O(log m), about 18 iterations)

Total operations: ~199,001 * (2*18 + 2*18) ≈ 199,001 * 72 ≈ 14 million simple operations. This should be well under 2 seconds in Python.

Actually wait, for the first window we don't do the update. Let me just make sure the code is clean.

Let me also make sure about edge cases:
- k=1: median is just the element itself
- k=n: only one window
- All same elements

Let me also double-check: the problem says "Return floats". For odd k, the median is a single element. Should I return it as a float? The problem says "Return floats" so I'll cast to float.

Actually, looking again: "For even k the median is the mean of the two middle values. Return floats." I think "Return floats" means the return type is list[float], so even for odd k, we return float values. Since nums is list[float], the elements are already floats. The division by 2 for even k naturally produces a float. For odd k, the element is already a float. So we're fine.

Let me finalize the code:
