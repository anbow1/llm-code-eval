Need efficient sliding median. Options: two heaps with lazy deletion, or sorted list with bisect and insort — insort into a list of size k=1000 is O(k) per insertion, 200k operations * ~1000 shift = 2e8 element moves; memmove is fast in C, so actually bisect insort is quite fast (list insort shifts O(k) but with memmove ~ fast). Total insertions: n insort + n deletions (remove via index with del shifts too). 2 * 200k * 1000 elements moved = 4e8 bytes-ish... memmove of 8KB pointers, ~200k ops each 8KB = 1.6 GB memmove total — maybe ~0.3-0.5s. That's acceptable "well under 2 seconds". Simpler and correct.

Alternative: two-heap lazy deletion with heaps — O(n log n), more code. bisect approach is simpler and practically fine. But strict tests may include very large k? k=1000 given. I'll do bisect approach.

Implementation:

- validate k.
- window = sorted(nums[:k])
- medians: compute via index m = k//2; if k odd: float(window[m]); else (window[m-1]+window[m])/2.
- then for each i from k to n-1: insort(window, nums[i]); remove nums[i-k]: find via bisect_left, del at index.

Use `from bisect import insort, bisect_left`.

Code:

```python
from bisect import insort, bisect_left

def sliding_median(nums: list[float], k: int) -> int:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    n = len(nums)
    result = []
    half = k // 2
    m = k & 1
    for i in range(n - k + 1):
        if m:
            result.append(float(window[half]))
        else:
            result.append((window[half-1] + window[half]) / 2)
        if i + k < n:
            insort(window, nums[i+k])
            del window[bisect_left(window, nums[i])]
    return result
```

That's fine. Return floats — for odd k, float(window[half]) ensures float.