Efficient sliding median using two heaps with lazy deletion, or sorted containers via bisect with O(k) insert/delete (n/k * k = n... actually bisect.insort is O(k) per op → O(n*k) total = 200M ops... 200,000 windows, each insert/delete O(k)=1000 → 200M element moves, too slow in Python? bisect.insort moves are C-level memmove, so ~200M element moves in C is fast (~0.5s maybe). Actually insort cost: bisect O(log k) + insertion shifting O(k) elements via memmove — that's C-speed. 200k * 1000 = 200M shifted elements — memmove of 8-byte elements, that's fast, maybe 0.2-0.5s. But also list.pop from middle similar cost. Total should be fine.

Alternative: two heaps with lazy deletion — O(n log k) with Python overhead per element; 200k * ~20 ops = fine. But heap-based median balancing is more complex. The bisect approach is simpler and reliable. Let's use bisect with a sorted window list.

Implementation:

```python
import bisect

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    half = k // 2
    result = []
    if k % 2:
        med = float(window[half])
        result.append(med)
        for i in range(k, len(nums)):
            old = nums[i - k]
            # remove old
            idx = bisect.bisect_left(window, old)
            window.pop(idx)
            bisect.insort(window, nums[i])
            result.append(float(window[half]))
    else:
        def med():
            return (window[half-1] + window[half]) / 2
        result.append(med())
        for i in range(k, len(nums)):
            old = nums[i - k]
            idx = bisect.bisect_left(window, old)
            window.pop(idx)
            bisect.insort(window, nums[i])
            result.append(med())
    return result
```

Careful with removing: if there are duplicates, bisect_left finds leftmost equal — fine since value equal, removing any equal value is fine for median computation.

Edge: old value might not be in window? It always is since window contains nums[i-k..i-1]. bisect_left could point to an element != old only if old not present — can't happen. Good.

Even k median: return floats — (a+b)/2 is float if values are floats; if ints given as floats per signature, fine. Force float().

Optimization: pop+insort both O(k) memmove. Fine.

Write clean code.