Let me think about this problem carefully.

We need to compute the sliding median for every window of size k in a list of floats.

The naive approach would be O(n*k*log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations. That's way too slow.

We need a more efficient approach. Let me think about options:

1. **Two heaps approach**: Maintain two heaps (max-heap for lower half, min-heap for upper half) to track the median. This gives O(n log k) time complexity. For n=200,000 and k=1,000, that's 200,000 * log(1000) ≈ 200,000 * 10 = 2,000,000 operations. That should be fast enough.

2. **Sorted list with bisect**: Use a sorted list and bisect to insert/remove. But removal from a sorted list is O(k) in Python since it's a list. So this would be O(n*k) which is 200,000 * 1,000 = 200,000,000. This might be borderline.

Let me go with the two-heaps approach.

The two-heaps approach:
- `lo` is a max-heap (store negatives) containing the lower half
- `hi` is a min-heap containing the upper half
- Invariant: len(lo) == len(hi) or len(lo) == len(hi) + 1
- The median is either the top of lo (if odd size) or the mean of tops of lo and hi (if even size)

When sliding the window:
- Add new element
- Remove old element (the one leaving the window)
- Rebalance heaps
- Get median

The tricky part is removal. When we remove an element, we need to know which heap it belongs to. We can use a "lazy deletion" approach with a dictionary to track elements that should be removed.

Let me think about the lazy deletion approach:
- `lo` = max-heap (negated values) for lower half
- `hi` = min-heap for upper half
- `lo_count`, `hi_count` = actual counts (excluding lazy-deleted)
- `lo_del`, `hi_del` = dictionaries counting elements pending deletion

Operations:
- `add(x)`: add to lo, then rebalance
- `remove(x)`: mark for deletion in the appropriate heap, then rebalance
- `rebalance()`: move elements between heaps to maintain size invariant, clean up tops

Wait, let me think more carefully.

Actually, the standard approach:

- `lo` is a max-heap (we negate values)
- `hi` is a min-heap
- `lo_size` = number of elements logically in lo
- `hi_size` = number of elements logically in hi
- `lo_del` = Counter of elements to be removed from lo
- `hi_del` = Counter of elements to be removed from hi

`add(x)`:
- If lo is empty or x <= -lo[0], push -x to lo, lo_size += 1
- Else push x to hi, hi_size += 1
- Rebalance

`remove(x)`:
- If x <= -lo[0], lo_del[x] += 1, lo_size -= 1
- Else hi_del[x] += 1, hi_size -= 1
- Rebalance

`rebalance()`:
- While lo_size > hi_size + 1: move from lo to hi
- While hi_size > lo_size: move from hi to lo
- Clean tops

`clean(heap, del_dict, other_heap, other_del)`:
- While heap top is in del_dict: pop, decrement counter

Wait, let me be more careful. Let me define the invariants:
- All elements in lo are <= all elements in hi
- lo_size == hi_size or lo_size == hi_size + 1
- Total size = lo_size + hi_size = k (after initial fill)

For the median:
- If k is odd: median = -lo[0] (after cleaning)
- If k is even: median = (-lo[0] + hi[0]) / 2 (after cleaning)

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    if k == 1:
        return list(nums)
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    lo_size = 0
    hi_size = 0
    lo_del = defaultdict(int)
    hi_del = defaultdict(int)
    
    def clean(heap, del_dict):
        while heap and heap[0] in del_dict:
            if del_dict[heap[0]] > 0:
                del_dict[heap[0]] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Clean tops
        clean(lo, lo_del)
        clean(hi, hi_del)
        
        # Move from lo to hi if lo is too big
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        # Move from hi to lo if hi is too big
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        
        # Clean tops again after moving
        clean(lo, lo_del)
        clean(hi, hi_del)
    
    def add(x):
        nonlocal lo_size, hi_size
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        if x <= -lo[0]:
            lo_del[x] += 1
            lo_size -= 1
        else:
            hi_del[x] += 1
            hi_size -= 1
        rebalance()
    
    def get_median():
        clean(lo, lo_del)
        clean(hi, hi_del)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2)
    
    result = []
    # Initialize first window
    for i in range(k):
        add(nums[i])
    result.append(get_median())
    
    for i in range(1, len(nums) - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        result.append(get_median())
    
    return result
```

Wait, there's an issue with the `clean` function. When I check `heap[0] in del_dict`, I need to be careful. The `del_dict` is a defaultdict(int), so accessing a non-existent key will create it. Let me use a regular dict or check differently.

Actually, `defaultdict(int)` - when you do `heap[0] in del_dict`, it checks if the key exists in the dict. But wait, `in` for defaultdict doesn't trigger the default value creation. It just checks if the key is in the underlying dict. So that should be fine.

But wait, there's another issue. In the `remove` function, when I check `x <= -lo[0]`, what if lo is empty? Actually, after rebalancing, lo should never be empty when we have elements. But let me think...

Actually, there's a subtle bug. When we do `remove`, we check `x <= -lo[0]` to decide which heap the element belongs to. But what if the top of lo is a "deleted" element? We should clean first.

Let me restructure:

```python
def remove(x):
    nonlocal lo_size, hi_size
    # Clean tops to ensure we compare against valid elements
    clean(lo, lo_del)
    clean(hi, hi_del)
    if x <= -lo[0]:
        lo_del[x] += 1
        lo_size -= 1
    else:
        hi_del[x] += 1
        hi_size -= 1
    rebalance()
```

Hmm, but actually the issue is more subtle. The element `x` might be in either heap regardless of its value relative to the current top, because of lazy deletions. 

Wait no - the invariant is that all elements in lo are <= all elements in hi. So if x <= -lo[0] (the max of lo), then x must have been placed in lo. If x > -lo[0], then x must have been in hi. This invariant holds regardless of lazy deletions because the structural invariant (all lo elements <= all hi elements) is maintained.

Actually wait, is that true? Let's think... When we add an element, we put it in lo if x <= max(lo), else in hi. When we move elements during rebalance, we move the max of lo to hi, or the min of hi to lo. So the invariant is maintained. And lazy deletions don't change the structural order. So yes, if x <= max(valid elements in lo), then x was in lo. But max of lo might be a deleted element...

Hmm, this is the tricky part. Let me think again.

Actually, the key insight is: the structural invariant is that every element physically in `lo` (the heap array) is <= every element physically in `hi`. Lazy deletions don't violate this because we don't change the structure when we mark for deletion. The rebalancing only moves elements from one heap to the other based on size, and since we always move the max of lo to hi or min of hi to lo, the invariant is preserved.

So when we want to remove x:
- If x <= -lo[0] (the physical top of lo, which might be a deleted element), we mark it for deletion in lo.
- But wait, what if -lo[0] is a deleted element that's larger than x, and x is actually in hi?

This can't happen because of the invariant: all elements in lo <= all elements in hi. If -lo[0] (even if deleted) >= x, and x is in hi, then we'd have an element in lo (the deleted one) > an element in hi (x), violating the invariant. So this can't happen.

Wait, but the deleted element is still physically in lo. And x in hi. The invariant says all physical elements in lo <= all physical elements in hi. So -lo[0] (top of lo, even if deleted) <= x (in hi). So if x <= -lo[0], then x must be in lo (or could be in either if equal). If x > -lo[0], then x must be in hi.

So the check `x <= -lo[0]` is correct for determining which heap x belongs to, even with lazy deletions present. Good.

But there's still the edge case where -lo[0] is a deleted element. In that case, the actual maximum of "valid" elements in lo might be smaller. But that's fine - if x <= -lo[0] (deleted), x could still be in lo or in hi (if x equals some element in hi). But by the invariant, all lo elements <= all hi elements. So if -lo[0] (deleted) >= x, and x is in hi, then -lo[0] > x, meaning an element in lo > an element in hi, which violates the invariant. So x must be in lo.

Actually wait, I need to be more careful. The invariant is: for any element a physically in lo and any element b physically in hi, a <= b. So if -lo[0] is in lo (physically, even if marked deleted), and x is in hi, then -lo[0] <= x. So if x < -lo[0], x cannot be in hi. If x == -lo[0], x could be in either. If x > -lo[0], x cannot be in lo.

So the check `x <= -lo[0]` correctly identifies x as being in lo (or could be in either if equal). And `x > -lo[0]` correctly identifies x as being in hi. 

But what about the `clean` function? Let me make sure it handles the case where the top is in del_dict correctly.

```python
def clean(heap, del_dict):
    while heap and del_dict.get(heap[0], 0) > 0:
        del_dict[heap[0]] -= 1
        heapq.heappop(heap)
```

This is cleaner. Using `.get` avoids the defaultdict issue.

Let me also think about performance. For n=200,000 and k=1,000:
- Initial fill: 1,000 add operations, each O(log k) ≈ O(10)
- Then 199,000 iterations, each doing a remove (O(log k)) and an add (O(log k))
- Total: ~200,000 * 2 * 10 = 4,000,000 operations
- Plus cleaning overhead

This should be well under 2 seconds in Python.

Actually, let me reconsider. The rebalance function might do multiple heap operations. In the worst case, each rebalance could move O(k) elements. But in practice, for a sliding window, we only move at most 1 element per step. Let me verify:

When we remove one element and add one element:
- lo_size or hi_size changes by at most 1 (from remove)
- Then lo_size or hi_size changes by at most 1 (from add)
- Net change is at most 2, so rebalance moves at most 2 elements.

Actually, it could be: remove from lo (lo_size -= 1), then add to lo (lo_size += 1). Net 0. Or remove from lo (lo_size -= 1), add to hi (hi_size += 1). Net: lo decreases by 1, hi increases by 1, so difference changes by 2. Rebalance would move 1 element.

So in the worst case, rebalance does 1-2 heap operations. Good, it's O(log k) per step.

Let me also handle the edge case where k == 1: the median is just the element itself.

Let me also think about potential issues with the `clean` function being called in `get_median`. After cleaning, the tops should be valid. But what if after cleaning, lo becomes empty? That shouldn't happen because lo_size >= 1 always (since k >= 1 and we maintain lo_size >= hi_size).

Let me finalize the code:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap (values negated)
    hi = []  # min-heap
    lo_size = 0
    hi_size = 0
    lo_del = {}
    hi_del = {}
    
    def clean(heap, del_dict):
        while heap:
            top = heap[0]
            if top in del_dict:
                del_dict[top] -= 1
                if del_dict[top] == 0:
                    del del_dict[top]
                heapq.heappop(heap)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        clean(lo, lo_del)
        clean(hi, hi_del)
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
            clean(lo, lo_del)
        while hi_size > lo_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
            clean(hi, hi_del)
    
    def add(x):
        nonlocal lo_size, hi_size
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        clean(lo, lo_del)
        clean(hi, hi_del)
        if x <= -lo[0]:
            lo_del[x] = lo_del.get(x, 0) + 1
            lo_size -= 1
        else:
            hi_del[x] = hi_del.get(x, 0) + 1
            hi_size -= 1
        rebalance()
    
    def get_median():
        clean(lo, lo_del)
        clean(hi, hi_del)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2.0)
    
    result = []
    for i in range(k):
        add(nums[i])
    result.append(get_median())
    
    for i in range(1, len(nums) - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        result.append(get_median())
    
    return result
```

Wait, I need to double-check the `clean` function. After moving an element from lo to hi during rebalance, I should clean lo again because the new top might also be deleted. Let me add cleaning after each move in the while loop.

Actually, I already have `clean(lo, lo_del)` after moving from lo to hi in the first while loop, and `clean(hi, hi_del)` after moving from hi to lo in the second while loop. But I should also clean at the start of each iteration of the while loop, not just after the move. Let me restructure:

```python
def rebalance():
    nonlocal lo_size, hi_size
    while lo_size > hi_size + 1:
        clean(lo, lo_del)
        val = -heapq.heappop(lo)
        lo_size -= 1
        heapq.heappush(hi, val)
        hi_size += 1
    while hi_size > lo_size:
        clean(hi, hi_del)
        val = heapq.heappop(hi)
        hi_size -= 1
        heapq.heappush(lo, -val)
        lo_size += 1
    clean(lo, lo_del)
    clean(hi, hi_del)
```

This should work. Each iteration of the while loop cleans the top before popping.

Let me trace through a simple example to verify:
- nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3

Window 1: [1, 3, -1]
- add(1): lo=[-1], lo_size=1, hi=[], hi_size=0. rebalance: lo_size=1, hi_size=0. 1 > 0+1? No. 0 > 1? No. Done.
- add(3): 3 > -lo[0]=1, so hi=[3], hi_size=1. rebalance: lo_size=1, hi_size=1. 1 > 1+1? No. 1 > 1? No. Done.
- add(-1): -1 <= -lo[0]=1, so lo=[-1, 1] (negated: [1, -1]), lo_size=2. rebalance: lo_size=2, hi_size=1. 2 > 1+1? No. 1 > 2? No. Done.
- median: k=3 odd, -lo[0] = -1. Wait, lo = [1, -1] (these are negated). -lo[0] = -1. Median should be 1 (sorted: -1, 1, 3). Hmm, that's wrong.

Wait, let me recheck. lo is a max-heap implemented as negated min-heap.
- add(1): push -1 to lo. lo = [-1]. lo_size = 1.
- add(3): 3 > -lo[0] = 1. Push 3 to hi. hi = [3]. hi_size = 1.
- add(-1): -1 <= -lo[0] = 1. Push -(-1) = 1 to lo. lo = [-1, 1]. lo_size = 2.
  - In a min-heap of negated values, lo = [-1, 1] means the actual values are [1, -1]. The max (top) is -lo[0] = 1. 
  - Wait, that's wrong. In a min-heap, lo[0] is the minimum. lo = [-1, 1], so lo[0] = -1, meaning the max actual value is -(-1) = 1. The other element is -1 (actual value -1).
  - So lo contains actual values {1, -1} with max 1. hi contains {3}.
  - Sorted: [-1, 1, 3]. Median = 1. -lo[0] = -(-1) = 1. Correct!

Window 2: [3, -1, -3]
- remove(1): clean lo, lo = [-1, 1], top is -1. 1 <= -lo[0] = 1? Yes. lo_del[1] = 1, lo_size = 1.
  - rebalance: clean lo: top is -1, is -1 in lo_del? lo_del = {1: 1}. No. 
  - lo_size=1, hi_size=1. 1 > 1+1? No. 1 > 1? No. Done.
- add(-3): -3 <= -lo[0] = 1 (after clean, top is still -1, -(-1)=1). Push -(-3) = 3 to lo. lo = [-1, 1, 3]. lo_size = 2.
  - rebalance: clean lo: top is -1. -1 in lo_del? No.
  - lo_size=2, hi_size=1. 2 > 1+1? No. 1 > 2? No. Done.
- median: k=3 odd. -lo[0] = -(-1) = 1. 
  - Window [3, -1, -3], sorted: [-3, -1, 3]. Median = -1. But we got 1. That's wrong!

The issue is that the "deleted" element 1 is still in lo. Let me recheck.

After remove(1):
- lo_del = {1: 1}, lo_size = 1
- lo = [-1, 1] (physical)
- clean(lo, lo_del): top is lo[0] = -1. Is -1 in lo_del? lo_del = {1: 1}. No. So no cleaning.
- But the element with value 1 (stored as -1 in the heap... wait no.

I'm confusing myself. Let me be very explicit.

lo is a min-heap of negated values. So if I push actual value `v`, I push `-v` into the heap.
- Push 1: heap gets -1. lo = [-1].
- Push -1: heap gets 1. lo = [-1, 1]. (min-heap: -1 < 1, so -1 is at top)

-lo[0] = -(-1) = 1. This is the maximum actual value in lo. Correct.

Now, remove(1):
- 1 <= -lo[0] = 1? Yes. So we mark 1 for deletion in lo.
- lo_del[1] = 1. lo_size = 1.
- rebalance: clean(lo, lo_del): top of lo is -1. Is -1 in lo_del? lo_del = {1: 1}. -1 != 1. No cleaning.

Wait, I think I see the issue. The value 1 is stored in lo as -1 (negated). So when I check `if top in del_dict`, top is -1 (the negated value in the heap), but del_dict has key 1 (the actual value). They don't match!

This is the bug! I need to be consistent. Either store negated values in del_dict, or check with negation.

Let me fix: in the `clean` function for `lo`, the heap contains negated values. So when checking if the top is deleted, I should check `-heap[0]` in `lo_del` (since lo_del stores actual values).

Or, I could store negated values in lo_del. Let me think about which is cleaner.

Option 1: Store actual values in del dicts, and negate when comparing.
```python
def clean_lo():
    while lo:
        actual = -lo[0]
        if actual in lo_del:
            lo_del[actual] -= 1
            if lo_del[actual] == 0:
                del lo_del[actual]
            heapq.heappop(lo)
        else:
            break
```

Option 2: Store negated values in lo_del.
When removing x: lo_del[-x] += 1
When cleaning: check lo[0] in lo_del directly.

Let me go with Option 1 for clarity.

Let me rewrite:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    
    if k == 1:
        return [float(x) for x in nums]
    
    lo = []  # max-heap via negation
    hi = []  # min-heap
    lo_size = 0
    hi_size = 0
    lo_del = {}  # actual value -> count
    hi_del = {}  # actual value -> count
    
    def clean_lo():
        while lo:
            actual = -lo[0]
            if actual in lo_del:
                lo_del[actual] -= 1
                if lo_del[actual] == 0:
                    del lo_del[actual]
                heapq.heappop(lo)
            else:
                break
    
    def clean_hi():
        while hi:
            if hi[0] in hi_del:
                hi_del[hi[0]] -= 1
                if hi_del[hi[0]] == 0:
                    del hi_del[hi[0]]
                heapq.heappop(hi)
            else:
                break
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            clean_lo()
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while hi_size > lo_size:
            clean_hi()
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        clean_lo()
        clean_hi()
    
    def add(x):
        nonlocal lo_size, hi_size
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        clean_lo()
        clean_hi()
        if x <= -lo[0]:
            lo_del[x] = lo_del.get(x, 0) + 1
            lo_size -= 1
        else:
            hi_del[x] = hi_del.get(x, 0) + 1
            hi_size -= 1
        rebalance()
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return float((-lo[0] + hi[0]) / 2.0)
    
    result = []
    for i in range(k):
        add(nums[i])
    result.append(get_median())
    
    for i in range(1, len(nums) - k + 1):
        remove(nums[i - 1])
        add(nums[i + k - 1])
        result.append(get_median())
    
    return result
```

Let me trace through again with [1, 3, -1, -3, 5, 3, 6, 7], k = 3:

Window 1: [1, 3, -1]
- add(1): lo=[-1], lo_size=1
- add(3): 3 > -lo[0]=1, hi=[3], hi_size=1
- add(-1): -1 <= -lo[0]=1, lo=[-1, 1], lo_size=2
  - rebalance: 2 > 1+1? No. 1 > 2? No. Done.
- median (odd): -lo[0] = -(-1) = 1. ✓ (sorted: -1, 1, 3, median=1)

Window 2: [3, -1, -3]
- remove(1): clean_lo: top=-1, actual=1. 1 in lo_del? No. clean_hi: top=3. 3 in hi_del? No.
  - 1 <= -lo[0]=1? Yes. lo_del[1]=1, lo_size=1.
  - rebalance: 1 > 1+1? No. 1 > 1? No. clean_lo: top=-1, actual=1. 1 in lo_del? Yes! lo_del[1]=0, del. pop. lo=[1]. clean_lo: top=1, actual=-1. -1 in lo_del? No. Done. clean_hi: top=3. 3 in hi_del? No. Done.
- add(-3): -3 <= -lo[0]=-(-1)... wait, lo=[1]. -lo[0] = -1. -3 <= -1? Yes. Push -(-3)=3 to lo. lo=[1, 3]. lo_size=2.
  - rebalance: 2 > 1+1? No. 1 > 2? No. clean_lo: top=1, actual=-1. -1 in lo_del? No. clean_hi: top=3. 3 in hi_del? No.
- median (odd): -lo[0] = -(1) = -1. ✓ (sorted: -3, -1, 3, median=-1)

Window 3: [-1, -3, 5]
- remove(3): clean_lo: top=1, actual=-1. Not in lo_del. clean_hi: top=3. 3 in hi_del? No.
  - 3 <= -lo[0]=-1? No (3 > -1). So hi_del[3]=1, hi_size=0.
  - rebalance: 2 > 0+1? Yes! clean_lo: top=1, actual=-1. Not in lo_del. Pop: val=-1. lo_size=1. Push -1 to hi. hi=[-1]. hi_size=1.
  - 2 > 1+1? No. 1 > 1? No. clean_lo: top=3, actual=-3. Not in lo_del. clean_hi: top=-1. -1 in hi_del? No.
  - Wait, lo was [1, 3]. After popping top (1), lo=[3]. val = -1. Push to hi: hi=[-1] (and 3 was marked for deletion... wait no, 3 is in hi_del).
  
  Hmm wait. Let me retrace. Before remove(3):
  - lo = [1, 3] (negated), actual values: -1, -3. lo_size=2.
  - hi = [3]. hi_size=1.
  - lo_del = {}, hi_del = {}.
  
  remove(3): 
  - clean_lo: top=1, actual=-1. Not in lo_del. Done.
  - clean_hi: top=3. 3 in hi_del? No. Done.
  - 3 <= -lo[0] = -(1) = -1? 3 <= -1? No. So hi_del[3]=1, hi_size=0.
  - rebalance: lo_size=2, hi_size=0. 2 > 0+1? Yes.
    - clean_lo: top=1, actual=-1. Not in lo_del. 
    - val = -(heapq.heappop(lo)) = -(1) = -1. lo_size=1. lo=[3].
    - heapq.heappush(hi, -1). hi=[-1]. hi_size=1.
  - 2 > 1+1? No (lo_size is now 1). 1 > 1? No.
  - clean_lo: top=3, actual=-3. Not in lo_del. clean_hi: top=-1. -1 in hi_del? No.
  
  - After remove: lo=[3] (actual -3), lo_size=1. hi=[-1], hi_size=1. hi_del={3:1}.
  
- add(5): 5 <= -lo[0] = -(3) = -3? No. Push 5 to hi. hi=[-1, 5]. hi_size=2.
  - rebalance: 1 > 2+1? No. 2 > 1? Yes.
    - clean_hi: top=-1. -1 in hi_del? No.
    - val = heapq.heappop(hi) = -1. hi_size=1. hi=[5].
    - Push -(-1) = 1 to lo. lo=[1, 3]. lo_size=2.
  - 1 > 2+1? No. 1 > 2? No.
  - clean_lo: top=1, actual=-1. Not in lo_del. clean_hi: top=5. 5 in hi_del? No.
  
  - After add: lo=[1, 3] (actual -1, -3), lo_size=2. hi=[5], hi_size=1. hi_del={3:1}.
  
- median (odd): -lo[0] = -(1) = -1. 
  - Window [-1, -3, 5], sorted: [-3, -1, 5]. Median = -1. ✓

Let me continue with window 4: [-3, 5, 3]
- remove(-1): 
  - clean_lo: top=1, actual=-1. -1 in lo_del? No.
  - clean_hi: top=5. 5 in hi_del? No.
  - -1 <= -lo[0] = -(1) = -1? -1 <= -1? Yes. lo_del[-1]=1, lo_size=1.
  - rebalance: 1 > 1+1? No. 1 > 1? No.
  - clean_lo: top=1, actual=-1. -1 in lo_del? Yes! lo_del[-1]=0, del. Pop. lo=[3].
  - clean_hi: top=5. 5 in hi_del? No.
  
  - After remove: lo=[3] (actual -3), lo_size=1. hi=[5], hi_size=1.
  
- add(3): 3 <= -lo[0] = -(3) = -3? No. Push 3 to hi. hi=[3, 5]. hi_size=2.
  - rebalance: 1 > 2+1? No. 2 > 1? Yes.
    - clean_hi: top=3. 3 in hi_del? No.
    - val = heapq.heappop(hi) = 3. hi_size=1. hi=[5].
    - Push -3 to lo. lo=[-3, 3]. lo_size=2.
  - 1 > 3+1? No. 1 > 2? No.
  - clean_lo: top=-3, actual=3. 3 in lo_del? No. clean_hi: top=5. 5 in hi_del? No.
  
  - After add: lo=[-3, 3] (actual 3, -3), lo_size=2. hi=[5], hi_size=1.
  
- median (odd): -lo[0] = -(-3) = 3. 
  - Window [-3, 5, 3], sorted: [-3, 3, 5]. Median = 3. ✓

Great, the algorithm works!

Now let me think about potential issues:
1. What if there are duplicate values? The algorithm should handle them fine since we're using counts in del dicts.
2. What about floating point issues? The values are floats, and we're comparing them. This should be fine as long as the same float values appear (which they do since we're removing the exact same objects that were added).

Actually wait - there's a potential issue with floating point. If we have `nums = [0.1, 0.2, 0.3]`, then `0.1` in the list is the exact same float object/value that we'd compare. Since we're not doing arithmetic on the values (just comparing and storing), this should be fine.

Let me also make sure the `clean_lo` function handles the case where `lo` becomes empty. In `clean_lo`, we check `while lo`, so if lo is empty, we just return. Good.

One more concern: in the `rebalance` function, after the while loops, we do final cleaning. But what if during the while loop iterations, we need to clean multiple times? Let me trace:

In the first while loop (`lo_size > hi_size + 1`):
- We call `clean_lo()` at the start of each iteration.
- We pop from lo, push to hi.
- Next iteration, we clean lo again (the new top might be deleted).
- This continues until lo_size <= hi_size + 1.

This is correct.

I think the code is correct. Let me also consider the time complexity more carefully:
- Each `add` and `remove` does O(log k) heap operations plus O(1) cleaning (amortized, since each element is cleaned at most once).
- Total: O(n log k) which for n=200,000 and k=1,000 is about 200,000 * 10 = 2,000,000 operations. Very fast.

Actually, the cleaning is amortized O(1) per element since each element is only cleaned once. So the total cleaning over all operations is O(n). The heap operations dominate at O(n log k).

Let me finalize the code. I'll also add type hints and make sure it's clean.

One more thought: should I worry about the case where `k == len(nums)`? In that case, there's only one window. The code should handle it fine since the loop `for i in range(1, len(nums) - k + 1)` would be `range(1, 1)` which is empty.

And `k == 1`: I handle it as a special case returning the list directly.

I think the solution is complete and correct. Let me write the final version.
