We need an efficient sliding window median. Standard approach: two heaps with lazy deletion, or sorted containers using bisect with a list (insertion/deletion O(k) each — k=1000, n=200000, that's 2*10^8 operations worst case... actually each window does one insert and one delete on a list of size 1000, each O(k) memmove — memmove is fast in C, ~1000 elements * 200000 windows = 2*10^8 element moves, that's actually fast in C-level memmove, maybe ~0.1-0.5s. Using insort and a find+pop. That's likely fine.)

Actually simpler and robust: maintain a sorted list via bisect.insort and list.pop(bisect_left(...)). Each operation is O(k) but with C memmove, so very fast. 200,000 windows × (insort + pop) on list of 1000 → each ~memmove of 500 avg elements ×2 = ~2×10^8 bytes-ish moves. Should run well under 2 seconds.

Let me write it:

```python
from bisect import insort, bisect_left, bisect_right

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    half = k // 2
    result = []
    if k % 2:
        med = float(window[half])
    else:
        med = (window[half-1] + window[half]) / 2
    result.append(med)
    for i in range(k, len(nums)):
        # remove nums[i-k], add nums[i]
        out = nums[i-k]
        j = bisect_left(window, out)
        window.pop(j)
        insort(window, nums[i])
        if k % 2:
            result.append(float(window[half]))
        else:
            result.append((window[half-1] + window[half]) / 2.0)
    return result
```

Optimization: avoid recompute via tracking, but bisect index lookup is fine. Could micro-opt by caching middle elements but not needed.

Edge: duplicates removal — bisect_left finds first occurrence; since window contains multiset, removing any equal element is fine.

Validation: nums could contain ints; convert result to float. Also `k > len(nums)` check. Also should we check nums non-empty — if k>=1 and k>len(nums) covers empty nums.

Micro-optimizations: use local variable references for bisect functions. Fine.