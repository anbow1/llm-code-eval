Need efficient sliding median. Use sorted list with bisect (insort O(k) per op — 200k * 1000 = 2e8... insort is O(k) shift, that might be ~fast in C? list insort uses memmove, quite fast. 200k windows, each insort/remove O(k) memmove of 1000 elements — that's 2e8 element moves, likely ~0.2-0.5s. Acceptable. Median lookup is O(1) via index.

Better: two heaps with lazy deletion, but simpler: sorted list via bisect.insort and list.remove... use bisect to find index then pop. insort is memmove — fine.

Implement:

```python
import bisect

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    res = []
    def med():
        if k % 2:
            return float(window[k//2])
        return (window[k//2 - 1] + window[k//2]) / 2
    res.append(med())
    for i in range(k, len(nums)):
        old = nums[i-k]
        idx = bisect.bisect_left(window, old)
        window.pop(idx)
        bisect.insort(window, nums[i])
        res.append(med())
    return res
```

That's it.