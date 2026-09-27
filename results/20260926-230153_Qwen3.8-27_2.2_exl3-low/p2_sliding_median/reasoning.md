We need to implement a sliding window median function that's efficient for n=200,000 and k=1,000.

The key challenge is efficiency. For each window of size k, we need the median. 

Approach options:
1. For each window, sort the window and pick the median - O(n*k*log(k)) which for n=200k, k=1000 would be 200k * 1000 * log(1000) ≈ 200k * 1000 * 10 = 2 billion operations. Too slow.

2. Use two heaps (min-heap and max-heap) to maintain the median. This is the classic approach:
   - Maintain a max-heap for the lower half and a min-heap for the upper half.
   - For odd k: median is the top of one heap.
   - For even k: median is average of tops of both heaps.
   - When sliding, we remove the outgoing element and add the incoming element, rebalancing.
   - Each operation is O(log k), so total is O(n log k).
   - For n=200k, k=1000: 200k * log(1000) ≈ 200k * 10 = 2 million operations. Very fast.

Let me think about the two-heap approach more carefully:

- We maintain two heaps:
  - `lower` = max-heap (stored as negative values in a min-heap)
  - `upper` = min-heap
  - Invariant: len(lower) >= len(upper), and len(lower) is either len(upper) or len(upper)+1
  - For odd k: len(lower) = (k+1)//2, len(upper) = k//2
  - For even k: len(lower) = k//2, len(upper) = k//2

- To add a value: push to lower, then rebalance
- To remove a value: need to find and remove it from the appropriate heap.

The tricky part is removal. With a heap, removal is O(k) because we need to find the element. But we can use a different approach:

Actually, let me think about this differently. We can use a sorted list with bisect. For k=1000, maintaining a sorted list:
- Insert: O(k) due to shifting
- Remove: O(k) due to shifting
- Total: O(n*k) = 200k * 1000 = 200 million operations. This might be borderline.

Actually, in Python, list insert and delete are O(k) but with small constants. 200 million simple operations... that might be too slow.

Let me reconsider the two-heap approach with removal:

For removal, we can mark elements as "deleted" and lazily remove them. Or we can use a different data structure.

Actually, let me think about using a sorted list (via bisect):
- We maintain a sorted list of the current window.
- For each new element: bisect.insort (O(k) worst case)
- For each old element: find position and remove (O(k) worst case)
- Median: just index into the sorted list (O(1))

Total: O(n * k) = 200,000 * 1,000 = 200,000,000 operations. In Python, each operation is roughly a pointer move. This might take around 1-2 seconds... borderline.

Alternative: Use two heaps with lazy deletion.

Let me think about the two-heap approach more carefully:

- `lower`: max-heap (negated min-heap), contains the lower half
- `upper`: min-heap, contains the upper half
- Invariant: |len(lower) - len(upper)| <= 1, and all elements in lower <= all elements in upper

For odd k: len(lower) = (k+1)//2, len(upper) = k//2
For even k: len(lower) = k//2, len(upper) = k//2

Adding an element:
- If element <= top of lower: push to lower
- Else: push to upper
- Rebalance: if len(lower) > len(upper) + 1, move top of lower to upper. If len(upper) > len(lower), move top of upper to lower.

Removing an element:
- If element <= top of lower: it's in lower. Remove it from lower.
- Else: it's in upper. Remove it from upper.
- But removal from a heap is O(k) in the worst case (need to find the element).

For lazy deletion: mark the element as deleted, and when we access the top, clean out deleted tops. But we still need to remove it from the heap somehow.

Actually, for lazy deletion with heaps:
- We can't easily remove arbitrary elements from a heap in O(log k).
- We can mark elements as "to be removed" and when we pop from the heap, we skip deleted elements.
- But we need to track which elements are in which heap.

This gets complicated. Let me think of another approach.

Actually, for the two-heap approach, removal is:
- Determine which heap the element belongs to (based on its value relative to the median boundary)
- Remove it from that heap (O(k) scan)
- Rebalance

Total cost per step: O(k) for removal + O(log k) for insertion + O(log k) for rebalancing.
Total: O(n * k) which is the same as the sorted list approach.

Hmm, so both approaches are O(n*k). Let me think if there's a better way.

Actually wait - for the sorted list approach with bisect:
- insort is O(k) but it's just memmove in CPython, which is very fast.
- del is also O(k) memmove.
- 200k * 1000 = 200M memmove operations. Each memmove of ~1000 floats is about 8KB. Total data moved: 200M * 8KB = 1.6 TB. That's way too much.

Wait no, it's 200k iterations, each doing one insert and one delete of a list of size ~1000. So total data moved is 200k * 2 * 1000 * 8 bytes = 3.2 GB. That's a lot of memory bandwidth but modern CPUs can handle it. Actually in Python, list operations are quite fast because they're in C. Let me estimate: each insert/delete of a 1000-element list takes maybe 1-2 microseconds. 200k * 2 * 1.5μs = 600ms. That should be well under 2 seconds.

Actually, let me reconsider. Python list insert and delete:
- list.insert(i, x): O(n-i) element moves
- list.pop(i): O(n-i) element moves
- For n=1000, worst case is ~1000 element moves

In CPython, each element move is a pointer assignment. 1000 pointer assignments is extremely fast, maybe 100-200 nanoseconds. So 200k * 2 * 100ns = 40ms. That's very fast!

Wait, I'm confusing myself. Let me be more careful:
- Each insert/delete operation on a list of size k involves moving up to k elements.
- Moving k elements in CPython is k pointer assignments, which is O(k) but with very small constant.
- For k=1000, that's about 1000 pointer moves ≈ maybe 50-100 nanoseconds.
- Total: 200,000 * 2 * 100ns = 40ms.

Actually that seems too optimistic. Let me think again. In practice, Python list operations with bisect:
- bisect.insort: calls bisect (O(log k)) then list.insert (O(k))
- list.pop(i): O(k)

The O(k) part is in C (list internal), so it's fast. I'd estimate maybe 1-5 microseconds per operation for k=1000. Total: 200k * 2 * 3μs = 1.2ms. Very fast.

Wait, I think I'm overestimating the speed. Let me just go with the sorted list approach since it's simple and should be fast enough.

Actually, let me benchmark mentally:
- 200,000 iterations
- Each iteration: one bisect.insort (O(log k) + O(k) for the shift) and one list.pop(index) (O(k) for the shift)
- The O(k) shifts are in C, moving pointers
- For k=1000, the shift is about 1000 pointer moves
- CPython can do about 100M pointer moves per second (rough estimate)
- Total pointer moves: 200k * 2 * 1000 = 400M
- Time: 400M / 100M/s = 4 seconds? Hmm, that might be too slow.

Wait, I think CPython list operations are faster than that. Let me reconsider. A list of 1000 floats, inserting in the middle, involves memmove of about 500 pointers (4 bytes each = 2000 bytes). memmove of 2000 bytes is extremely fast, maybe 50-100 nanoseconds. So 200k * 2 * 100ns = 40ms. That's fine.

Actually, I realize I should just go with the sorted list approach. It's simple, correct, and should be fast enough.

Let me code it up:

```python
from bisect import insort

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []
    result = []
    
    for i in range(len(nums)):
        insort(window, nums[i])
        if len(window) > k:
            # Remove the oldest element
            window.remove(nums[i - k])  # O(k)
        if len(window) == k:
            if k % 2 == 1:
                result.append(window[k // 2])
            else:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    
    return result
```

Wait, `window.remove(x)` is O(k) because it searches for x. And we need to find the index of the element being removed. But we know it's `nums[i-k]`, and we need to find it in the sorted window. We can use bisect to find its position, then delete it.

Actually, `list.remove(x)` does a linear scan to find x, then shifts. That's O(k). Using bisect to find the position and then `del window[pos]` is also O(k) but with the search being O(log k) instead of O(k). But the shift is still O(k).

Let me use bisect to find the position:

```python
from bisect import insort, bisect_left

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    window = []
    result = []
    
    for i in range(len(nums)):
        insort(window, nums[i])
        if len(window) > k:
            pos = bisect_left(window, nums[i - k])
            del window[pos]
        if len(window) == k:
            if k % 2 == 1:
                result.append(window[k // 2])
            else:
                result.append((window[k // 2 - 1] + window[k // 2]) / 2.0)
    
    return result
```

This should work. The key operations per iteration:
- insort: O(log k) for bisect + O(k) for shift
- bisect_left: O(log k)
- del: O(k) for shift
- Median lookup: O(1)

Total: O(n * k) but with very small constants (C-level memmove).

For n=200k, k=1000: 200k * (2 * 1000 pointer moves) = 400M pointer moves. At ~1ns per pointer move (in C), that's 400ms. Well under 2 seconds.

Actually, I want to double-check: does `insort` on a list of floats work correctly? Yes, it uses `__lt__` comparison which works for floats.

One edge case: what if there are duplicate values? `bisect_left` will find the first occurrence, which is fine for removal.

Let me also consider: the problem says "Return floats" for even k. The division by 2.0 will produce a float. For odd k, the median is already a float from the list.

I think this solution is correct and efficient. Let me finalize it.
