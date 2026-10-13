Classic two-heap with lazy deletion, or sorted list with bisect. Simpler: use a sorted list with insort — n=200k, k=1000, insort is O(k) each step → 200k * 1000 = 2e8 element moves, but list insort is memmove-fast; 2e8 pointer moves ~ maybe 0.5–1s. Actually bisect.insort on list of 1000 elements: insertion cost ~ k/2 element moves via memmove, that's ~500 memmove words per op, 200k ops → 1e8 words moved — very fast (~0.1s). That's fine.

Simplest correct approach: maintain sorted window, remove outgoing with del via bisect index, insert incoming with insort. Median from middle.

Use `bisect.bisect_left` for removal index. Note duplicates fine.

k=1: window sorted, median is the element. Works.

Edge: k even → mean of two middles. Values float.

Removal cost: del list[i] also memmove O(k). Fine.

Code:

```python
from bisect import bisect_left, insort

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    res = []
    half = k // 2
    if k % 2:
        for ... append float(window[half])
    else:
        append (window[half-1]+window[half])/2
    for i in range(k, len(nums)):
        out = nums[i-k]
        idx = bisect_left(window, out)
        del window[idx]
        insort(window, nums[i])
        ...
```

Handle odd/even uniformly: compute median helper.

len(nums)==0 and k<1 → ValueError anyway. k > len(nums) covers empty with k>=1.