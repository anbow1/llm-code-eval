Use two heaps (small max-heap, large min-heap) with lazy deletion, or sorted list with bisect and insort/pop — with k=1000, insort cost O(k) per step but total O(n*k) memory moves... n=200000, k=1000 → insort does memmove of ~1000 elements per step, 200M element moves — likely ~0.1-0.5s in C, actually bisect.insort is fast (memmove). Alternative: SortedList not available. Insort approach: total operations n insort + n pop, each O(k) memmove → 200M * 8 bytes = fast C memmove, ~0.2s. That's fine and simple.

Actually simpler: use heaps with lazy deletion (standard "Sliding Window Median" solution). But bisect is simpler and reliable.

Implementation:

```python
import bisect

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    medians = []
    def median(w):
        m = k // 2
        if k % 2:
            return float(w[m])
        return (w[m-1] + w[m]) / 2.0
    medians.append(median(window))
    for i in range(k, len(nums)):
    # remove nums[i-k], add nums[i]
    out = nums[i-k]
    idx = bisect.bisect_left(window, out)
    # element guaranteed present
    window.pop(idx)  # or del window[idx]
    bisect.insort(window, nums[i])
    medians.append(median(window))
    return medians
```

Edge: float('nan') issues — ignore. Values equal fine.

Note: len(nums) check — k > len(nums) → ValueError. k<1 → ValueError. Good.

Pop from list at idx is O(k) shift, insort O(k) — fine.

Precompute k odd/even outside loop for speed. Use local variable bindings.