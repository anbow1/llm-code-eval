Let me think about this problem carefully.

We need to compute the sliding window median for every window of size k.

The naive approach would be O(n * k log k) which for n=200,000 and k=1,000 would be 200,000 * 1000 * log(1000) ≈ 200,000 * 1000 * 10 = 2,000,000,000 operations. That's too slow.

A better approach is to use two heaps (a max-heap for the lower half and a min-heap for the upper half) to maintain the median efficiently. This gives us O(n log k) time complexity.

For n=200,000 and k=1,000: 200,000 * log(1,000) ≈ 200,000 * 10 = 2,000,000 operations. That should be well under 2 seconds.

The approach:
- Maintain two heaps: a max-heap (lower half) and a min-heap (upper half)
- The max-heap stores the lower half (negate values for max-heap using min-heap)
- The min-heap stores the upper half
- Keep them balanced so that max-heap has either same size or one more element than min-heap (for odd k) or same size (for even k)
- When an element leaves the window, we need to remove it from whichever heap it belongs to

The tricky part is deletion from a heap. Python's heapq doesn't support efficient deletion. We can use a "lazy deletion" approach:
- Mark elements for deletion in a separate set/dict
- When we clean the top of the heap, skip elements that are marked for deletion

Let me think about the two-heap approach more carefully:

For a window of size k:
- If k is odd: max-heap (lower) has (k+1)/2 elements, min-heap (upper) has (k-1)/2 elements. Median is top of max-heap.
- If k is even: max-heap (lower) has k/2 elements, min-heap (upper) has k/2 elements. Median is average of top of both heaps.

Actually, let me reconsider the balancing:
- For odd k: lower has (k+1)/2, upper has (k-1)/2
- For even k: lower has k/2, upper has k/2

Wait, let me think again. The standard approach:
- lower (max-heap) should have either ceil(k/2) elements or floor(k/2) elements
- upper (min-heap) should have the rest

For odd k: lower has (k+1)/2, upper has (k-1)/2
For even k: lower has k/2, upper has k/2

Median:
- If k is odd: just the max of lower
- If k is even: (max of lower + min of upper) / 2

Let me implement this with lazy deletion:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    # lower: max-heap (negated), upper: min-heap
    # lower should have ceil(k/2) elements, upper should have floor(k/2) elements
    lower = []  # max-heap (store negated)
    upper = []  # min-heap
    to_remove = {}  # value -> count for lazy deletion
    # Actually, we need to track which heap each value belongs to for lazy deletion
    # Better approach: use a set of (heap, index) or just track values to remove
    
    # Actually, the lazy deletion approach with just values is tricky because
    # duplicates can exist. Let me use a different approach.
    
    # Let me use a counter for elements to remove:
    # When removing an element, increment its count in to_remove
    # When cleaning heap tops, if the value is in to_remove, skip it
    
    # But this has issues with duplicates. Let me think...
    
    # Actually for lazy deletion with duplicates, we need to be careful.
    # Let's use a different approach: track which heap each value belongs to.
    
    # Alternative: Use a sorted list with bisect. For n=200,000 and k=1,000,
    # inserting and deleting from a list of size 1000 takes O(k) = O(1000) per operation.
    # Total: 200,000 * 1000 = 200,000,000 operations. In Python, list insertion/deletion
    # involves memmove which is fast in C. This might actually be fast enough.
    
    # Let me try the sorted list approach with bisect:
    import bisect
    
    if k == 1:
        return [float(x) for x in nums]
    
    window = sorted(nums[:k])
    result = []
    
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
    
    for i in range(k, n):
        # Remove nums[i-k] from window
        val_out = nums[i - k]
        pos = bisect.bisect_left(window, val_out)
        # Find the actual position (handle duplicates)
        # bisect_left gives us the first position where val_out could be inserted
        # But val_out should already be there, so window[pos] should equal val_out
        # Wait, bisect_left finds the leftmost position. If there are duplicates,
        # it finds the first one. That's fine since we just need to remove one instance.
        window.pop(pos)
        
        # Insert nums[i]
        bisect.insort(window, nums[i])
        
        # Compute median
        if k % 2 == 1:
            mid = k // 2
            result.append(float(window[mid]))
        else:
            mid = k // 2
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

Wait, let me think about the performance. For each window step:
1. `bisect_left` on a list of size k=1000: O(log k)
2. `list.pop(pos)` on a list of size k=1000: O(k) due to memmove
3. `bisect.insort` on a list of size k=1000: O(log k) for search + O(k) for insert

So each step is O(k) = O(1000). Total: O(n * k) = 200,000 * 1,000 = 200,000,000.

In Python, list operations like pop and insert involve C-level memmove which is very fast. 200M byte-level operations (floats are 8 bytes, so 1.6 GB of memmove total) should be doable in under 2 seconds.

Actually wait, let me recalculate. Each pop/insert moves about k/2 = 500 elements on average. Each element is a Python float object pointer (8 bytes). So each operation moves about 500 * 8 = 4000 bytes. Total: 200,000 * 2 * 4000 = 1,600,000,000 bytes = 1.6 GB of memmove. That should be fine, probably 0.5-1 second.

But wait, the bisect_left + pop + insort involves Python-level operations too. Let me think if this is fast enough.

Actually, for 200,000 iterations, each doing a bisect_left (C-level), a pop (C-level), and an insort (C-level), the Python overhead per iteration is minimal. This should be well under 2 seconds.

Let me also consider the two-heap approach as an alternative, but the sorted list approach is simpler and should be fast enough.

Actually, let me reconsider. The `bisect.insort` does a `list.insert` which is O(k) due to shifting. And `list.pop(pos)` is also O(k). So total per step is about 2k operations on pointers. For 200,000 steps with k=1,000, that's 200,000 * 2,000 = 400,000,000 pointer moves. At maybe 1-2 ns per move in C, that's 0.4-0.8 seconds. Plus Python overhead. Should be under 2 seconds.

Let me also handle edge cases:
- k = 1: return the list itself (as floats)
- k = n: only one window
- k < 1 or k > n: raise ValueError

Let me also make sure the return type is correct: "Return floats."

Let me refine the solution:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must be between 1 and {n}, got {k}")
    
    if k == 1:
        return [float(x) for x in nums]
    
    window = sorted(nums[:k])
    result = []
    
    if k % 2 == 1:
        mid = k // 2
        result.append(float(window[mid]))
        for i in range(k, n):
            val_out = nums[i - k]
            pos = bisect.bisect_left(window, val_out)
            window.pop(pos)
            bisect.insort(window, nums[i])
            result.append(float(window[mid]))
    else:
        mid = k // 2
        result.append((window[mid - 1] + window[mid]) / 2.0)
        for i in range(k, n):
            val_out = nums[i - k]
            pos = bisect.bisect_left(window, val_out)
            window.pop(pos)
            bisect.insort(window, nums[i])
            result.append((window[mid - 1] + window[mid]) / 2.0)
    
    return result
```

Hmm, but there's a subtle issue with `bisect.bisect_left` when there are duplicates. If the value to remove appears multiple times in the window, `bisect_left` will find the first occurrence, which is correct - we're removing one instance.

Wait, actually there's a potential issue. What if `bisect_left` returns a position where the value isn't actually in the list? No, that can't happen because we know `val_out` was in the window (it was added previously and not yet removed). So `bisect_left` will find the correct position.

Actually, let me double-check: if the window contains [1, 2, 2, 3] and we want to remove 2, `bisect_left` returns index 1 (first 2). We pop index 1, getting [1, 2, 3]. Correct.

What if the window contains [1, 2, 3, 4] and we want to remove 5 (which isn't there)? That can't happen in our algorithm because we only remove elements that were previously added.

I think this solution is correct and efficient. Let me also consider if there's an even faster approach.

Actually, for the two-heap approach with lazy deletion, the complexity would be O(n log k) but with higher constant factors due to the lazy deletion bookkeeping. The sorted list approach with O(n * k) but low constant factors (C-level memmove) is probably faster in practice for k=1000.

Let me stick with the sorted list approach. Let me write the final clean version.

One more thought: should I worry about the case where `nums` is empty? If k > 0 and n = 0, then k > n, so we'd raise ValueError. Good.

If n = 0 and k = 0, k < 1, so ValueError. Good.

Let me write the final solution.
