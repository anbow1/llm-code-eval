The problem is to compute the sliding median of every contiguous window of size k. This is a classic problem that can be solved efficiently using two heaps (a max-heap for the lower half and a min-heap for the upper half) with lazy deletion, or using a sorted list with bisect operations.

Let me think about the approaches:

1. **Two heaps with lazy deletion**: Maintain a max-heap for the lower half and a min-heap for the upper half. When sliding the window, mark elements for deletion lazily. This is O(n log k) but has some complexity in implementation.

2. **Sorted list with bisect**: Use `bisect.insort` to insert and `list.remove` to remove elements. The insert is O(k) worst case due to shifting, but with k=1000 and n=200,000, that's 200,000 * 1000 = 200M operations which might be too slow in pure Python.

Wait, actually `bisect.insort` is O(k) for the insertion part (shifting elements), and `list.remove` is also O(k). So for each window slide, we do O(k) work. Total: O(n*k) = 200,000 * 1,000 = 200,000,000. In pure Python this might be borderline but could work given that list operations in CPython are implemented in C.

Actually, let me reconsider. `bisect.insort` does the binary search in O(log k) but the actual insertion (shifting) is O(k). Similarly `list.remove` is O(k). But these are C-level operations, so they're very fast. With k=1000, shifting 1000 elements is trivial in C. 200,000 iterations × small constant should be fine.

Let me go with the sorted list approach since it's simpler and should be fast enough:

- Use `bisect` module to maintain a sorted list of the current window.
- For each new element, remove the outgoing element and insert the incoming element using bisect.
- The median is found by indexing into the sorted list.

For removal with `bisect`, I need to find the position of the element to remove. I can use `bisect.bisect_left` to find it, then `list.pop(idx)`.

For insertion, use `bisect.bisect_left` and `list.insert`.

Let me code this up:

```python
from bisect import insort, bisect_left

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("Invalid k")
    
    # Initialize the first window
    window = sorted(nums[:k])
    
    result = []
    mid = k // 2
    
    # Compute median for current window
    def median():
        if k % 2 == 1:
            return float(window[mid])
        else:
            return (window[mid - 1] + window[mid]) / 2.0
    
    result.append(median())
    
    for i in range(k, n):
        # Remove nums[i - k]
        out_idx = bisect_left(window, nums[i - k])
        window.pop(out_idx)
        
        # Insert nums[i]
        insort(window, nums[i])
        
        result.append(median())
    
    return result
```

This should be efficient enough. The `bisect_left` + `pop` is O(k) for the pop (shifting), and `insort` is O(k) for the insert (shifting). But these are all C-level operations. For k=1000, each shift operation moves at most 1000 pointers, which is extremely fast in C. The outer loop runs 200,000 times. Total operations: ~200,000 * 2 * 1000 = 400M pointer moves, all in C. This should complete well under 2 seconds.

Let me verify the median calculation:
- For odd k: mid = k // 2, the median is window[mid]. For k=5, mid=2, window[2] is the middle. Correct.
- For even k: mid = k // 2. For k=4, mid=2, we need window[1] and window[2], which is (window[mid-1] + window[mid]) / 2. Correct.

This looks correct and efficient. Let me finalize.
