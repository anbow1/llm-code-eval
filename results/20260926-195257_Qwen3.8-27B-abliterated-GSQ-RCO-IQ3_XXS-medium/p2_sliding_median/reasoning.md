The user wants a `sliding_median` function that computes the median of every sliding window of size k over a list of floats.

Requirements:
- Returns a list of floats, one per window
- For even k, median is the average of the two middle values
- Raise ValueError if k < 1 or k > len(nums)
- Must be efficient: n = 200,000 with k = 1,000 in well under 2 seconds

Let me think about approaches:

1. **Naive approach**: For each window, sort the elements and take the median. O(n * k log k) = 200,000 * 1,000 * log(1,000) ≈ 200,000 * 1,000 * 10 = 2 * 10^9 operations. This might be too slow in Python.

2. **Two heaps approach**: Maintain two heaps (max-heap for lower half, min-heap for upper half) with a sliding window. But the challenge is handling removals (elements leaving the window). We can use lazy deletion.

3. **Sorted list approach**: Use `bisect` to maintain a sorted list. For each window, insert the new element and remove the old one. With `bisect.insort` and `bisect.bisect_left`, insertion and deletion are O(k) due to list shifting. So total is O(n * k) = 200,000 * 1,000 = 2 * 10^8. This might be borderline in Python but could work.

4. **Two heaps with lazy deletion**: 
   - Maintain a max-heap (lower half) and min-heap (upper half)
   - Each has at most k/2 elements (or k/2 and k/2+1)
   - Use a dictionary for lazy deletion
   - When adding/removing, rebalance
   - The heaps can grow in size due to lazy deletion, but amortized they stay O(k)
   
   Actually, with lazy deletion, the heaps can grow unbounded over n steps. We need to periodically clean them. But amortized, each element is added and removed once from each heap, so total operations are O(n log k). This should be efficient.

Let me think more carefully about the two-heaps approach:

- `lo` is a max-heap (store negatives) for the lower half
- `hi` is a min-heap for the upper half
- `lo` has either k//2 elements, `hi` has either k//2 elements (if k even) or k//2 + 1 elements (if k odd)
- Actually, let me use the convention: `lo` has ceil(k/2) elements or floor(k/2) elements depending on parity.

Wait, let me reconsider. For k elements:
- If k is odd: median is the middle element (k//2-th 0-indexed), so lo has k//2 + 1 elements, hi has k//2 elements
- If k is even: median is average of k//2-1 and k//2 (0-indexed), so lo has k//2 elements, hi has k//2 elements

Let me use: lo has k//2 elements (lower half), hi has k - k//2 elements (upper half).

For k even: lo has k/2, hi has k/2
For k odd: lo has k//2, hi has k//2 + 1

Wait, let me be more careful. Let's say:
- lo contains the floor(k/2) smallest elements
- hi contains the ceil(k/2) largest elements

For k=5: lo has 2, hi has 3. Median is min(hi) = hi[0]
For k=4: lo has 2, hi has 2. Median = (max(lo) + min(hi)) / 2

So:
- `lo` is a max-heap of size k//2 (for even k) or k//2 (for odd k)
  - k=4: lo=2, hi=2
  - k=5: lo=2, hi=3
- `hi` is a min-heap of size k - k//2
  - k=4: hi=2
  - k=5: hi=3

Actually for k=5: k//2 = 2, k - k//2 = 3. Median is hi[0].
For k=4: k//2 = 2, k - k//2 = 2. Median is (lo[-1] + hi[0]) / 2 (since lo is max-heap, lo[-1] in a regular list... wait no, lo is a max-heap using negatives).

Let me use:
- `lo`: max-heap (negated), size k//2
- `hi`: min-heap, size k - k//2

For odd k: median = hi[0]
For even k: median = (-lo[0] + hi[0]) / 2

Now for lazy deletion:
- When an element leaves the window, mark it as "deleted" in a counter dict
- Before reading from a heap, pop deleted elements from the top
- Amortized, this works well

Let me code this:

```python
import heapq
from collections import Counter

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    n = len(nums)
    if n == 0:
        return []
    
    lo = []  # max-heap (negated), size k//2
    hi = []  # min-heap, size k - k//2
    lo_del = Counter()  # lazy deletion for lo
    hi_del = Counter()  # lazy deletion for hi
    
    def clean_lo():
        while lo and lo_del.get(-lo[0], 0) > 0:
            val = -lo[0]
            lo_del[val] -= 1
            if lo_del[val] == 0:
                del lo_del[val]
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and hi_del.get(hi[0], 0) > 0:
            val = hi[0]
            hi_del[val] -= 1
            if hi_del[val] == 0:
                del hi_del[val]
            heapq.heappop(hi)
    
    def add_to_lo(x):
        heapq.heappush(lo, -x)
    
    def add_to_hi(x):
        heapq.heappush(hi, x)
    
    def move_lo_to_hi():
        clean_lo()
        val = -heapq.heappop(lo)
        add_to_hi(val)
    
    def move_hi_to_lo():
        clean_hi()
        val = heapq.heappop(hi)
        add_to_lo(val)
    
    def remove(x, from_lo):
        if from_lo:
            lo_del[x] += 1
            lo_size... 
        else:
            hi_del[x] += 1
    
    # Hmm, I need to track sizes. Let me think differently.
    
    lo_size = 0  # actual size of lo (excluding lazy-deleted)
    hi_size = 0  # actual size of hi (excluding lazy-deleted)
    
    target_lo = k // 2
    target_hi = k - k // 2
    
    # Initialize with first k elements
    for i in range(k):
        add_to_hi(nums[i])
        hi_size += 1
        # Move from hi to lo if hi is too big
        if hi_size > target_hi:
            move_hi_to_lo()
            hi_size -= 1
            lo_size += 1
        # Or... let me think of a cleaner approach.
```

Hmm, let me think of a cleaner approach. Actually, let me reconsider.

A simpler approach:
- For each new element added, push to `hi`.
- Then rebalance: move from `hi` to `lo` if `hi` is too big, or move from `lo` to `hi` if `lo` is too big.
- When removing, just mark as deleted.
- Before computing median, clean both heaps.

Let me redefine:
- `lo` should have exactly `k // 2` elements (the smallest k//2)
- `hi` should have exactly `k - k // 2` elements (the largest k - k//2)

Rebalancing:
- If `lo_size > k // 2`: move from lo to hi
- If `hi_size > k - k // 2`: move from hi to lo
- If `lo_size < k // 2` and `hi_size > 0`: move from hi to lo
- If `hi_size < k - k // 2` and `lo_size > 0`: move from lo to hi

Actually, a simpler invariant: 
- Push new element to hi.
- If lo_size < target_lo, move hi[0] to lo.
- If hi_size > target_hi, move hi[0] to lo.
- If lo_size > target_lo, move lo[0] to hi.

Wait, I think the standard approach is:
1. Add element to hi.
2. If lo is too small, move from hi to lo.
3. If hi is too big, move from hi to lo. (This is actually the same as step 2 in some cases.)
4. If lo is too big, move from lo to hi.

Let me just do:
- After adding to hi:
  - While lo_size < target_lo and hi_size > 0: move hi top to lo
  - While hi_size > target_hi: move hi top to lo
  - While lo_size > target_lo: move lo top to hi

Hmm, actually I think the cleanest is:
- Add to hi
- If lo_size < target_lo: move hi top to lo
- If hi_size > target_hi: move hi top to lo  
- If lo_size > target_lo: move lo top to hi

For the removal:
- If the element is in lo: lo_size -= 1, mark as deleted in lo
- If the element is in hi: hi_size -= 1, mark as deleted in hi
- Then rebalance:
  - If lo_size < target_lo: move hi top to lo
  - If hi_size > target_hi: move hi top to lo
  - If lo_size > target_lo: move lo top to hi

But how do I know if an element is in lo or hi? I can check: if the element is <= the current max of lo, it's in lo. Otherwise it's in hi.

Actually, with floating point and potential duplicates, this gets tricky. Let me use a different approach: I'll just check if lo_del already has it (meaning it was already marked for deletion from lo) or if it's in the lo heap... 

Actually, the standard approach for two heaps with lazy deletion:
- When removing x: check if x <= current lo max (after cleaning). If so, it's in lo. Otherwise, it's in hi.
- But with duplicates, this isn't perfect. 

Alternative: use a counter to track which heap each element belongs to. But that's hard with duplicates.

Let me think differently. Actually, the simplest correct approach:

When removing x:
- Clean lo and hi tops
- If lo is not empty and x <= -lo[0] (the max of lo): x is in lo, so lo_del[x] += 1, lo_size -= 1
- Else: x is in hi, so hi_del[x] += 1, hi_size -= 1
- Then rebalance

This works because: if x <= max(lo), then x belongs in the lower half. If x > max(lo), it belongs in the upper half. With duplicates, if x == max(lo), it could be in either, but it doesn't matter as long as we're consistent.

Wait, but what if x == max(lo) but x is actually in hi (because of a duplicate)? Then we'd incorrectly mark it as being in lo.

Hmm, let me think... Actually, for the median calculation, it only matters that the sizes are correct and that the heaps maintain the invariant that all elements in lo <= all elements in hi. 

If x == max(lo) and x is actually in hi, and we mark it as being in lo: then lo_size decreases by 1, and we'll pull an element from hi to lo. The element we pull will be min(hi), which is >= x (since x was in hi and x == max(lo)). So the invariant is maintained. And the count of x in lo decreases by 1 (lazily), and the count in hi effectively also decreases by 1 (the one we moved to lo). Net: one x is removed from the system. Correct!

So the approach is sound. Let me code it up properly.

Actually wait, I realize there might be an issue. Let me reconsider.

If x is in hi (hi has two copies of x, say), and we mark x as in lo (lo has one copy of x):
- lo_size -= 1
- lo_del[x] += 1
- Then we rebalance: move hi top to lo. hi top is x (or some value >= x... actually it's x since we have a duplicate).
- Now lo has the new x from hi, and lo_size went back up.
- Net effect: one x removed from hi, one x removed from lo (lazily). Total: one x removed. Correct!

OK I think it works. Let me code this up.

For performance with n=200,000 and k=1,000:
- Each element is added once and removed once
- Each heap operation is O(log k)
- Lazy deletion cleanup is amortized O(1) per operation
- Total: O(n log k) ≈ 200,000 * 10 = 2 * 10^6 operations. Very fast.

Let me also consider: can I avoid the overhead of Counter? I'll use a regular dict.

Let me also think about whether I can use a simpler data structure. For k=1000, using `sortedcontainers` would be ideal but it's not stdlib. Using a bisect-maintained list would be O(k) per insert/delete due to list shifting, giving O(n*k) = 2 * 10^8, which might be too slow in Python (maybe 10-20 seconds).

The two-heaps approach should be well under 2 seconds.

Let me write the final code:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    n = len(nums)
    if n == 0:
        return []
    
    target_lo = k // 2
    target_hi = k - target_lo
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    lo_del = {}
    hi_del = {}
    lo_size = 0
    hi_size = 0
    
    def clean_lo():
        while lo and lo_del.get(-lo[0], 0) > 0:
            v = -lo[0]
            lo_del[v] -= 1
            if lo_del[v] == 0:
                del lo_del[v]
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and hi_del.get(hi[0], 0) > 0:
            v = hi[0]
            hi_del[v] -= 1
            if hi_del[v] == 0:
                del hi_del[v]
            heapq.heappop(hi)
    
    def move_hi_to_lo():
        clean_hi()
        v = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -v)
        lo_size += 1
    
    def move_lo_to_hi():
        clean_lo()
        v = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, v)
        hi_size += 1
    
    def add(x):
        heapq.heappush(hi, x)
        hi_size += 1
        # Rebalance
        if lo_size < target_lo:
            move_hi_to_lo()
        elif hi_size > target_hi:
            move_hi_to_lo()
        if lo_size > target_lo:
            move_lo_to_hi()
    
    def remove(x):
        clean_lo()
        if lo and x <= -lo[0]:
            lo_del[x] = lo_del.get(x, 0) + 1
            lo_size -= 1
        else:
            hi_del[x] = hi_del.get(x, 0) + 1
            hi_size -= 1
        # Rebalance
        if lo_size < target_lo:
            move_hi_to_lo()
        elif hi_size > target_hi:
            move_hi_to_lo()
        if lo_size > target_lo:
            move_lo_to_hi()
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(hi[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = []
    # Initialize
    for i in range(k):
        add(nums[i])
    result.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, I need to be careful with the rebalancing in `add` and `remove`. Let me trace through some cases.

For k=3: target_lo=1, target_hi=2.

Add 1: hi=[1], hi_size=1, lo_size=0. lo_size < target_lo (0 < 1), so move_hi_to_lo: lo=[-1], hi=[], lo_size=1, hi_size=0.
Add 2: hi=[2], hi_size=1, lo_size=1. lo_size < target_lo? 1 < 1? No. hi_size > target_hi? 1 > 2? No. lo_size > target_lo? 1 > 1? No. So lo=[-1], hi=[2], lo_size=1, hi_size=1. Wait, that's wrong. target_hi=2, hi_size=1 which is less than 2.

Hmm, that's a problem. After adding 2, hi_size=1 but target_hi=2. The invariant should be lo_size=1, hi_size=2 after we have 3 elements. But we only have 2 elements so far.

Oh wait, I'm initializing. During initialization I'm adding k elements one by one. After adding the first k elements, the sizes should be correct. Let me re-trace:

Add 1: hi=[1], hi_size=1, lo_size=0. lo_size < target_lo (0 < 1): move_hi_to_lo. lo=[-1], hi=[], lo_size=1, hi_size=0.
Add 2: hi=[2], hi_size=1, lo_size=1. lo_size < target_lo? 1<1 No. hi_size > target_hi? 1>2 No. lo_size > target_lo? 1>1 No. So lo=[-1], hi=[2]. lo_size=1, hi_size=1.
Add 3: hi=[2,3], hi_size=2, lo_size=1. lo_size < target_lo? 1<1 No. hi_size > target_hi? 2>2 No. lo_size > target_lo? 1>1 No. So lo=[-1], hi=[2,3]. lo_size=1, hi_size=2.

Good. Median: k is odd, hi[0]=2. Correct!

Now remove 1: clean_lo (nothing). x=1 <= -lo[0]=1? Yes. So lo_del[1]=1, lo_size=0. Rebalance: lo_size < target_lo (0<1): move_hi_to_lo. clean_hi: nothing. pop hi: 2. hi=[3], hi_size=1. push lo: -2. lo=[-1,-2], lo_size=1.
Now lo=[-1,-2], hi=[3], lo_size=1, hi_size=1. lo_del={1:1}.
Median: clean_lo: lo[0]=-1, lo_del[1]=1>0, pop it. lo=[-2], lo_del={}. clean_hi: hi[0]=3, hi_del empty. hi=[3].
k odd: hi[0]=3. Correct! (median of [2,3] wait no, window is [2,3]... wait no.

Hmm wait, I had [1,2,3], removed 1, so window is [2,3]. Median of [2,3] with k=3? No wait, k=3 means window size 3. I only added 3 elements and then removed 1, so I should have only 2 elements. That's a mistake in my trace. Let me redo.

Actually wait, in the sliding window, at each step I have exactly k elements. Let me re-trace with k=3, nums=[1,2,3,4,5].

Init: add 1, add 2, add 3.
After add 1: lo=[-1], hi=[], lo_size=1, hi_size=0.
After add 2: hi=[2], hi_size=1, lo_size=1. No rebalancing needed. lo=[-1], hi=[2].
After add 3: hi=[2,3], hi_size=2, lo_size=1. No rebalancing. lo=[-1], hi=[2,3].
Median: hi[0]=2. Correct (median of [1,2,3] is 2).

Remove 1, Add 4:
Remove 1: x=1, clean_lo: lo=[-1], -lo[0]=1, 1<=1, so lo_del[1]=1, lo_size=0.
Rebalance: lo_size(0) < target_lo(1): move_hi_to_lo. clean_hi: hi=[2,3], hi[0]=2, hi_del empty. pop 2, hi=[3], hi_size=1. push -2 to lo, lo=[-1,-2], lo_size=1.
Now lo=[-1,-2], hi=[3], lo_size=1, hi_size=1, lo_del={1:1}.

Add 4: push 4 to hi, hi=[3,4], hi_size=2. 
lo_size(1) < target_lo(1)? No. hi_size(2) > target_hi(2)? No. lo_size(1) > target_lo(1)? No.
Now lo=[-1,-2], hi=[3,4], lo_size=1, hi_size=2, lo_del={1:1}.

Median: clean_lo: lo[0]=-1, -lo[0]=1, lo_del[1]=1>0, pop. lo=[-2], lo_del={}. clean_hi: hi[0]=3, hi_del empty. 
k odd: hi[0]=3. Correct (median of [2,3,4] is 3).

Remove 2, Add 5:
Remove 2: x=2, clean_lo: lo=[-2], -lo[0]=2, 2<=2, so lo_del[2]=1, lo_size=0.
Rebalance: lo_size(0) < target_lo(1): move_hi_to_lo. clean_hi: hi=[3,4], hi[0]=3, hi_del empty. pop 3, hi=[4], hi_size=1. push -3 to lo, lo=[-2,-3], lo_size=1.
Now lo=[-2,-3], hi=[4], lo_size=1, hi_size=1, lo_del={1:1, 2:1}.

Add 5: push 5 to hi, hi=[4,5], hi_size=2.
lo_size(1) < target_lo(1)? No. hi_size(2) > target_hi(2)? No. lo_size(1) > target_lo(1)? No.
Now lo=[-2,-3], hi=[4,5], lo_size=1, hi_size=2, lo_del={1:1, 2:1}.

Median: clean_lo: lo[0]=-2, -lo[0]=2, lo_del[2]=1>0, pop. lo=[-3], lo_del={1:1}. clean_hi: hi[0]=4, hi_del empty.
k odd: hi[0]=4. Correct (median of [3,4,5] is 4).

Great, the algorithm works.

Now let me think about potential issues:
1. Floating point equality for the `x <= -lo[0]` check: this should be fine since we're comparing actual values from the list.
2. The lazy deletion dicts could grow if we have many distinct values, but each entry is cleaned up when it reaches the top of a heap. In the worst case, the dict could have O(n) entries... but actually no, each entry is removed when it's popped from the heap. So the dict size is bounded by the heap size, which is O(k).

Wait, actually that's not quite right. An entry in lo_del stays until the value reaches the top of lo. In the worst case, if we keep adding smaller values, old deleted entries stay in the dict. But the total number of entries across all time is O(n), and each is O(1) to create and O(1) to delete (when it reaches the top). So total work is O(n). Fine.

Actually, I realize the dict entries are cleaned up when they reach the top. But they could accumulate in the dict. However, the total number of dict operations over the entire run is O(n) (one insertion and one deletion per element), so it's fine.

Let me also handle the edge case where n == k (only one window).

I think the code looks correct. Let me also make sure I handle the `k=1` case:
- target_lo = 0, target_hi = 1
- Add x: push to hi, hi_size=1. lo_size(0) < target_lo(0)? No. hi_size(1) > target_hi(1)? No. lo_size(0) > target_lo(0)? No.
- Median: k odd, hi[0] = x. Correct.
- Remove x: x <= -lo[0]? lo is empty! So we go to else: hi_del[x]=1, hi_size=0. Rebalance: lo_size(0) < target_lo(0)? No. hi_size(0) > target_hi(1)? No. lo_size(0) > target_lo(0)? No.
- Then add next element.

Wait, when lo is empty and we check `x <= -lo[0]`, we'd get an IndexError! Let me fix: I should check `if lo and x <= -lo[0]` but also need to clean first. Let me make sure I clean before checking.

In my `remove` function, I do `clean_lo()` first, then check. If lo is empty after cleaning, `lo and x <= -lo[0]` would be False (since `lo` is empty, `lo and ...` is False). So it goes to else. Good.

But wait, what if lo has elements but they're all marked as deleted? clean_lo would pop them all, making lo empty. Then `lo` is empty, and we go to else. Correct.

What about `get_median` when k=1? clean_lo, clean_hi. k is odd, return hi[0]. hi should have 1 element. Good.

For k=2: target_lo=1, target_hi=1.
Add a: hi=[a], hi_size=1, lo_size=0. lo_size(0)<1: move_hi_to_lo. lo=[-a], hi=[], lo_size=1, hi_size=0.
Add b: hi=[b], hi_size=1, lo_size=1. lo_size(1)<1? No. hi_size(1)>1? No. lo_size(1)>1? No.
Median: k even, (-lo[0]+hi[0])/2 = (a+b)/2. Correct!

OK I'm confident the algorithm is correct. Let me finalize the code.

One more performance thought: using `heapq` with individual function calls might have overhead. But for n=200,000, each step is O(log k) = O(log 1000) ≈ 10 comparisons, so total is about 2 * 10^6 * 10 = 2 * 10^7 operations. Python can handle this well within 2 seconds.

Let me also think about whether I should use local variable bindings for speed. In Python, local variable access is faster than global. Since everything is in the function, it should be fine.

Let me write the final clean version.
