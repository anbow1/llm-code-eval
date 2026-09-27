The user wants a `sliding_median` function that computes the median of every sliding window of size k over a list of floats.

Requirements:
1. Returns median of every contiguous window of size k
2. For even k, median is the mean of the two middle values
3. Return floats
4. Raise ValueError if k < 1 or k > len(nums)
5. Must be efficient: n = 200,000 with k = 1,000 must finish in well under 2 seconds

Let me think about the approach:

For n = 200,000 and k = 1,000, we have 199,001 windows.

Brute force: For each window, sort k elements → O(n * k * log(k)) = 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations. Too slow.

Better approach: Use two heaps (a max-heap for the lower half and a min-heap for the upper half) to maintain the median.

The standard approach for sliding window median:
- Maintain two heaps: a max-heap (for lower half) and a min-heap (for upper half)
- When adding a new element, place it in the appropriate heap and rebalance
- When removing an element (the one that fell out of the window), remove it from the appropriate heap

But the tricky part is removing an arbitrary element from a heap. Python's heapq doesn't support O(log n) removal of arbitrary elements.

Options:
1. Use a sorted list (bisect.insort) - O(k) per insertion/removal, so O(n*k) total. For n=200,000, k=1,000: 200,000 * 1,000 = 200,000,000 operations. This might be borderline but should be fast enough in CPython since bisect operations are C-level.

Actually, let me reconsider. Using `bisect.insort` on a list of size k:
- Insertion: O(k) to shift elements, but it's done in C (memmove)
- Removal: O(k) to shift elements
- Finding median: O(1) - just index into the list

Total: O(n * k) for all operations. For n=200,000, k=1,000: 200,000 * 1,000 = 200 million operations. Each operation is a memmove of ~1000 elements, which is very fast in C. This should complete in well under 2 seconds.

Actually, let me think more carefully. For each window:
- Remove the element that left: O(k) shift
- Insert the new element: O(k) shift
- Read median: O(1)

So total is O(n * k) = 200,000 * 1,000 = 200,000,000 element moves. Each move is ~8 bytes (float), so total memory moved is about 1.6 GB. At ~10 GB/s, that's about 0.16 seconds. Should be well under 2 seconds.

Let me code this up:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    window = []  # sorted list of current window elements
    result = []
    
    for i in range(n):
        # Add new element
        bisect.insort(window, nums[i])
        
        if i >= k:
            # Remove the element that fell out
            out = nums[i - k]
            idx = bisect.bisect_left(window, out)
            window.pop(idx)
        
        if len(window) == k:
            if k % 2 == 1:
                result.append(window[k // 2])
            else:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    
    return result
```

Wait, let me trace through this:
- i=0: window = [nums[0]], len=1
- i=1: window = [nums[0], nums[1]], len=2
- ...
- i=k-1: window has k elements, compute median
- i=k: add nums[k], remove nums[0], window has k elements, compute median
- ...
- i=n-1: window has k elements, compute median

Number of windows: n - k + 1. Let me verify: when i goes from k-1 to n-1, that's n - k + 1 iterations. Yes, correct.

This should be efficient. The bisect operations are O(k) but done in C (memmove), so for 200,000 iterations with k=1,000, it should be fast.

Let me double-check the even k case: for k=4, the middle two elements are at indices 1 and 2 (0-indexed in the sorted list). So `window[k//2 - 1]` and `window[k//2]` → `window[1]` and `window[2]`. Correct.

For odd k: k=5, median is at index 2 = k//2. Correct.

This looks good. Let me finalize.
