Let me think about this problem carefully.

We need to compute the sliding window median for every window of size k in a list of n numbers.

Naive approach: For each window, sort the k elements and find the median. This is O(n * k * log(k)) which for n=200,000 and k=1,000 would be 200,000 * 1,000 * log(1000) ≈ 200,000 * 1,000 * 10 = 2,000,000,000 operations. That's way too slow.

Better approach: Use two heaps (max-heap for lower half, min-heap for upper half) to maintain the median. But the sliding window makes this tricky because we need to remove elements.

Approach with two heaps + lazy deletion:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- Use a "lazy deletion" approach where we mark elements to be deleted and clean them up when they reach the top of a heap
- When sliding the window, we add the new element and mark the old element for deletion

Let me think about the two-heap approach:
- `lo` is a max-heap (we negate values for Python's min-heap)
- `hi` is a min-heap
- We maintain |lo| == |hi| or |lo| == |hi| + 1

For the sliding window:
- Initially, insert first k elements
- For each subsequent window:
  - Remove the element that's leaving
  - Add the element that's entering
  - Rebalance
  - Compute median

The lazy deletion approach:
- Keep a dictionary `to_remove` that maps values to their count
- When we "remove" an element, we just increment its count in `to_remove`
- When we access the top of a heap, we check if it's in `to_remove` and if so, pop it and decrement the count

Let me think about the rebalancing logic:

For the median:
- If k is odd: median is the top of lo (the max of the lower half)
- If k is even: median is (top of lo + top of hi) / 2

Let me think about the invariant:
- len(lo) == len(hi) or len(lo) == len(hi) + 1
- All elements in lo <= all elements in hi

When we add an element x:
- If lo is empty or x <= top of lo: push to lo
- Else: push to hi
- Rebalance: if len(lo) > len(hi) + 1, move top of lo to hi; if len(hi) > len(lo), move top of hi to lo

When we remove an element x:
- Mark x for deletion
- Clean top of lo and hi
- Rebalance

Wait, but there's a subtlety. When we mark x for deletion, we don't know which heap it's in. We just mark it, and when we clean the tops, it'll get removed from whichever heap it's in.

Let me code this up:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # lo is max-heap (negated), hi is min-heap
    lo = []  # max-heap via negation
    hi = []  # min-heap
    to_remove = {}  # value -> count of pending removals
    
    def clean_lo():
        while lo and -lo[0] in to_remove and to_remove[-lo[0]] > 0:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
    
    def clean_hi():
        while hi and hi[0] in to_remove and to_remove[hi[0]] > 0:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
    
    def rebalance():
        # Ensure len(lo) >= len(hi) and len(lo) <= len(hi) + 1
        # For odd k: len(lo) = len(hi) + 1
        # For even k: len(lo) = len(hi)
        while len(lo) > len(hi) + 1:
            clean_lo()
            val = -heapq.heappop(lo)
            heapq.heappush(hi, val)
        while len(hi) > len(lo):
            clean_hi()
            val = heapq.heappop(hi)
            heapq.heappush(lo, -val)
    
    def add(x):
        if not lo or x <= -lo[0]:
            heapq.heappush(lo, -x)
        else:
            heapq.heappush(hi, x)
        rebalance()
    
    def remove(x):
        to_remove[x] = to_remove.get(x, 0) + 1
        clean_lo()
        clean_hi()
        rebalance()
    
    # Initialize
    for i in range(k):
        add(nums[i])
    
    results = []
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    results.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        results.append(get_median())
    
    return results
```

Wait, let me think about the rebalancing more carefully.

For odd k: we want len(lo) = (k+1)//2 and len(hi) = (k-1)//2, so len(lo) = len(hi) + 1
For even k: we want len(lo) = k//2 and len(hi) = k//2, so len(lo) = len(hi)

So the invariant is:
- len(lo) - len(hi) is either 0 or 1
- All elements in lo <= all elements in hi

When adding:
- If x <= top of lo (i.e., x <= -lo[0]), push to lo
- Else push to hi
- Then rebalance

When removing:
- Mark for deletion
- Clean tops
- Rebalance

The rebalance:
- If len(lo) > len(hi) + 1: move top of lo to hi
- If len(hi) > len(lo): move top of hi to lo

This should work. Let me trace through a small example.

nums = [1, 3, 5, 7, 9], k = 3

Initial: add 1, 3, 5
- add(1): lo empty, push to lo. lo=[-1], hi=[]. rebalance: len(lo)=1, len(hi)=0. OK.
- add(3): 3 > -lo[0]=1, push to hi. lo=[-1], hi=[3]. rebalance: len(lo)=1, len(hi)=1. OK.
- add(5): 5 > -lo[0]=1, push to hi. lo=[-1], hi=[3,5]. rebalance: len(lo)=1, len(hi)=2. len(hi) > len(lo), move 3 to lo. lo=[-3,-1], hi=[5]. 

Median: k=3 odd, top of lo = 3. Correct!

Next window: remove 1, add 7
- remove(1): to_remove={1:1}. clean_lo: lo[0]=-3, -(-3)=3, 3 not in to_remove. OK. clean_hi: hi[0]=5, 5 not in to_remove. OK. rebalance: len(lo)=2, len(hi)=1. OK.
- add(7): 7 > -lo[0]=3, push to hi. lo=[-3,-1], hi=[5,7]. rebalance: len(lo)=2, len(hi)=2. OK.

Median: k=3 odd, top of lo = 3. 

Wait, the window is [3, 5, 7], median should be 5. But I'm getting 3.

The issue is that lo still has -1 in it (marked for removal but not at the top). Let me re-examine.

After remove(1): to_remove={1:1}. clean_lo: lo[0] is -3 (top of max-heap). -(-3) = 3. Is 3 in to_remove? No. So we don't clean. clean_hi: hi[0]=5. Is 5 in to_remove? No. OK.

rebalance: len(lo)=2, len(hi)=1. len(lo) - len(hi) = 1. OK, no rebalancing needed.

add(7): 7 > -lo[0] = 3? Yes. Push to hi. lo=[-3,-1], hi=[5,7]. rebalance: len(lo)=2, len(hi)=2. OK.

get_median: clean_lo: lo[0]=-3, 3 not in to_remove. clean_hi: hi[0]=5, 5 not in to_remove. k=3 odd, return -lo[0] = 3.

But the correct answer is 5! The problem is that lo has elements [-3, -1] but the -1 is a "dead" element. The actual elements in lo are just [3], and hi has [5, 7]. So the median of [3, 5, 7] should be 5.

The issue is that the "effective" size of lo is 1 (only 3 is alive), but we're counting it as 2. The rebalancing needs to account for the dead elements.

Hmm, this is the classic problem with lazy deletion. The heap sizes include dead elements, so the rebalancing is off.

One approach: track the "effective" sizes. Let me use a counter.

Actually, let me reconsider. The standard approach is:

- Track `lo_size` and `hi_size` as the effective (non-deleted) sizes
- When we remove, we decrement the appropriate size (but we don't know which heap it's in, so we need another approach)

Alternative: We can track sizes differently. Let me think...

Actually, the standard approach for lazy deletion with two heaps:

1. When removing x, we add it to `to_remove`
2. We clean the tops of both heaps
3. For rebalancing, we need to know the effective sizes

But the problem is: when we remove x, we don't know if x is in lo or hi. So we can't directly adjust the sizes.

One common solution: use a "virtual" size tracking. We maintain `lo_size` and `hi_size` as the number of elements that were pushed minus the number that were popped (including lazy deletions).

Actually, let me think differently. Let me track:
- `lo_count`: number of elements effectively in lo
- `hi_count`: number of elements effectively in hi

When we add x:
- If x <= top of lo: push to lo, lo_count += 1
- Else: push to hi, hi_count += 1
- Rebalance

When we remove x:
- We don't know which heap x is in. But we can figure it out:
  - If x <= top of lo (before cleaning): x is in lo, lo_count -= 1
  - Else: x is in hi, hi_count -= 1
- Add to to_remove
- Clean tops
- Rebalance

Wait, but what if x is exactly equal to the top of lo? It could be in either heap. Hmm.

Actually, a simpler approach: we can determine which heap x belongs to by comparing with the boundary.

If x < -lo[0] (strictly less than max of lo), it must be in lo.
If x > -lo[0] (strictly greater than max of lo), it must be in hi.
If x == -lo[0], it could be in either.

This is getting complicated. Let me use a different approach.

Alternative approach: Use two sorted lists with bisect. For n=200,000 and k=1,000, each insertion/deletion is O(k) due to list shifting, and we do n of them. So total is O(n*k) = 200,000 * 1,000 = 200,000,000. That might be too slow in Python.

Actually, in Python, list insert/delete is O(k) but with a very small constant (just memmove). 200,000 * 1,000 = 200 million byte operations for memmove... that might actually be borderline. Let me think.

Actually, Python's list insert/delete involves moving pointers (8 bytes each), so 1000 * 8 = 8000 bytes per operation, times 200,000 operations = 1.6 GB of memory movement. That's probably too slow.

Let me go back to the two-heap approach and handle the size tracking properly.

Here's a cleaner approach:

We maintain:
- `lo`: max-heap (negated values)
- `hi`: min-heap
- `to_remove`: dict mapping value -> count
- `lo_size`: effective size of lo
- `hi_size`: effective size of hi

Invariant: lo_size - hi_size is 0 or 1 (for odd k: always 1; for even k: always 0)

Wait, actually for the general case:
- If k is odd: lo_size = (k+1)//2, hi_size = (k-1)//2
- If k is even: lo_size = k//2, hi_size = k//2

So lo_size - hi_size is 1 if k is odd, 0 if k is even.

When adding x:
- Clean tops first
- If lo is empty or x <= -lo[0]: push -x to lo, lo_size += 1
- Else: push x to hi, hi_size += 1
- Rebalance:
  - If lo_size > hi_size + 1: pop from lo (after cleaning), push to hi. lo_size -= 1, hi_size += 1
  - If hi_size > lo_size: pop from hi (after cleaning), push to lo. hi_size -= 1, lo_size += 1

When removing x:
- Determine which heap x is in:
  - If x < -lo[0] (after cleaning): x is in lo, lo_size -= 1
  - If x > -lo[0] (after cleaning): x is in hi, hi_size -= 1
  - If x == -lo[0]: ambiguous. We can just pick one. Let's say lo_size -= 1. (It doesn't matter which we pick as long as we're consistent.)
  
  Actually wait, if x == -lo[0], it could be in lo (as the max) or in hi (as a duplicate). If we decrement lo_size, then later when we clean lo, we'll pop it from lo. If it was actually in hi, then we'd have incorrectly decremented lo_size.

  Hmm, this is the fundamental issue. Let me think of another way.

Actually, I think the safest approach is:
- When removing x, we don't try to figure out which heap it's in.
- We just add x to to_remove.
- We clean both heaps.
- We adjust sizes: we need to figure out how many elements were actually removed from each heap during cleaning.

Wait, that's better! When we clean, we know exactly which elements we're removing from which heap. So:

When removing x:
- to_remove[x] += 1
- Clean lo: for each element popped from lo, lo_size -= 1
- Clean hi: for each element popped from hi, hi_size -= 1
- Rebalance

This way, the sizes are always accurate!

Let me re-code:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated)
    hi = []  # min-heap
    to_remove = {}
    lo_size = 0
    hi_size = 0
    
    def clean_lo():
        nonlocal lo_size
        while lo and -lo[0] in to_remove and to_remove[-lo[0]] > 0:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
            lo_size -= 1
    
    def clean_hi():
        nonlocal hi_size
        while hi and hi[0] in to_remove and to_remove[hi[0]] > 0:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
            hi_size -= 1
    
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
    
    def add(x):
        nonlocal lo_size, hi_size
        clean_lo()
        clean_hi()
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        to_remove[x] = to_remove.get(x, 0) + 1
        clean_lo()
        clean_hi()
        rebalance()
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    # Initialize
    for i in range(k):
        add(nums[i])
    
    results = []
    results.append(get_median())
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        results.append(get_median())
    
    return results
```

Let me trace through the example again: nums = [1, 3, 5, 7, 9], k = 3

add(1): lo empty, push -1 to lo. lo=[-1], lo_size=1, hi_size=0. rebalance: 1 > 0+1? No. 0 > 1? No. OK.
add(3): clean. 3 > -lo[0]=1, push to hi. hi=[3], hi_size=1. rebalance: 1 > 1+1? No. 1 > 1? No. OK.
add(5): clean. 5 > -lo[0]=1, push to hi. hi=[3,5], hi_size=2. rebalance: 1 > 2+1? No. 2 > 1? Yes. Pop 3 from hi, push -3 to lo. lo=[-3,-1], lo_size=2, hi=[5], hi_size=1. Now 2 > 1+1? No. 1 > 2? No. OK.

get_median: k=3 odd, -lo[0] = 3. Correct!

Window [3,5,7]:
remove(1): to_remove={1:1}. clean_lo: lo[0]=-3, 3 not in to_remove. clean_hi: hi[0]=5, 5 not in to_remove. rebalance: lo_size=2, hi_size=1. 2>2? No. 1>2? No. OK.
add(7): clean. 7 > -lo[0]=3, push to hi. hi=[5,7], hi_size=2. rebalance: 2>3? No. 2>2? No. OK.

get_median: clean_lo: lo[0]=-3, 3 not in to_remove. clean_hi: hi[0]=5, 5 not in to_remove. k=3 odd, -lo[0]=3.

But the answer should be 5! The window is [3,5,7], median is 5.

The problem: lo still has [-3, -1] but -1 is dead. lo_size=2 but only 1 element is alive in lo. Wait no, lo_size was 2 and we didn't decrement it because the dead element (-1) isn't at the top.

Ah, I see the issue. The lo_size counts all elements that were pushed minus those popped during cleaning. But -1 is still in the heap (not at the top), so lo_size is 2, but effectively only 1 element (3) is "alive" in lo.

Wait, that's wrong. lo_size should be 2 because we pushed 2 elements to lo (1 and 3) and only popped 0 from lo. The element 1 is still in the heap but marked for removal. So lo_size=2 is correct in terms of "elements that were pushed to lo and not yet popped from lo."

But the issue is that for rebalancing, we want the effective number of alive elements. The element 1 is dead but still in the heap. So the effective lo_size should be 1, not 2.

Hmm, this is the fundamental problem with lazy deletion. The heap size includes dead elements.

One solution: instead of tracking lo_size and hi_size separately, track the total number of alive elements in each heap. But we can't easily do that without knowing which elements are dead.

Alternative approach: Don't track sizes at all. Instead, use the actual heap lengths but account for dead elements.

Actually, I think the correct approach is:

The effective size of lo = len(lo) - (number of dead elements in lo)
The effective size of hi = len(hi) - (number of dead elements in hi)

But we don't know how many dead elements are in each heap without scanning.

OK let me think about this differently. The standard approach for this problem:

Actually, I recall now. The correct approach is:

- We maintain the invariant that lo_size - hi_size is either 0 or 1 (depending on k parity)
- lo_size and hi_size track the "logical" sizes (number of elements that logically belong to each heap)
- When we remove x, we determine which heap it logically belongs to:
  - If x < boundary (top of lo), it's in lo
  - If x > boundary, it's in hi
  - If x == boundary, we need to decide. We can check: if x is in lo (it's the max of lo), decrement lo_size. Otherwise, decrement hi_size.

Actually, here's a cleaner way to handle the == case:
- If x <= -lo[0]: it's in lo (or could be, if there are duplicates). Decrement lo_size.
- Else: it's in hi. Decrement hi_size.

But wait, if x == -lo[0] and there are multiple copies, one might be in lo and one in hi. If we always assign it to lo, then when we clean lo, we'll pop it from lo. But if the actual element was in hi, we'd have incorrectly decremented lo_size.

Hmm, but actually it doesn't matter! Because:
- If x is in lo and we decrement lo_size: correct.
- If x is in hi and we decrement lo_size: lo_size is now too small by 1, and hi_size is too large by 1. But when we clean, the element will be popped from hi (reducing len(hi) but not hi_size). Then rebalance will fix the sizes.

Wait no, that's not right either. Let me think more carefully.

Actually, I think the key insight is: it doesn't matter which heap we assign the removal to, as long as the total (lo_size + hi_size) is correct. The rebalancing will fix any imbalances.

Let me re-examine: 
- We have lo_size + hi_size = k (always, since we have k elements in the window)
- We want lo_size - hi_size to be 0 or 1

When we remove x:
- We need to decrement either lo_size or hi_size by 1
- It doesn't matter which one we pick, because rebalance will fix it

So let's just always decrement lo_size (or hi_size, whichever is simpler). Actually, let's be more careful:

If x < -lo[0] (strictly less than the max of lo): x must be in lo. Decrement lo_size.
If x > -lo[0] (strictly greater than the max of lo): x must be in hi. Decrement hi_size.
If x == -lo[0]: could be in either. Let's say we decrement lo_size.

After decrementing, we clean both heaps and rebalance.

Let me re-trace:

nums = [1, 3, 5, 7, 9], k = 3

add(1): lo=[-1], lo_size=1, hi=[], hi_size=0
add(3): 3 > 1, hi=[3], hi_size=1. lo_size=1, hi_size=1. OK.
add(5): 5 > 1, hi=[3,5], hi_size=2. Rebalance: hi_size(2) > lo_size(1), move 3 to lo. lo=[-3,-1], lo_size=2, hi=[5], hi_size=1.

get_median: -lo[0] = 3. ✓

remove(1): 1 < -lo[0]=3, so lo_size -= 1 → lo_size=1. to_remove={1:1}. clean_lo: lo[0]=-3, 3 not in to_remove. clean_hi: hi[0]=5, 5 not in to_remove. rebalance: lo_size=1, hi_size=1. 1>2? No. 1>1? No. OK.

add(7): 7 > -lo[0]=3, push to hi. hi=[5,7], hi_size=2. rebalance: lo_size=1, hi_size=2. 2>1? Yes. Pop 5 from hi, push -5 to lo. lo=[-5,-3,-1], lo_size=2, hi=[7], hi_size=1. Now 2>2? No. 1>2? No. OK.

get_median: clean_lo: lo[0]=-5, 5 not in to_remove. clean_hi: hi[0]=7, 7 not in to_remove. k=3 odd, -lo[0]=5. ✓!

Let me continue:
Window [5,7,9]:
remove(3): 3 < -lo[0]=5, so lo_size -= 1 → lo_size=1. to_remove={1:1, 3:1}. clean_lo: lo[0]=-5, 5 not in to_remove. clean_hi: hi[0]=7, 7 not in to_remove. rebalance: lo_size=1, hi_size=1. OK.

add(9): 9 > -lo[0]=5, push to hi. hi=[7,9], hi_size=2. rebalance: lo_size=1, hi_size=2. 2>1? Yes. Pop 7 from hi, push -7 to lo. lo=[-7,-5,-3,-1], lo_size=2, hi=[9], hi_size=1.

get_median: clean_lo: lo[0]=-7, 7 not in to_remove. -lo[0]=7. ✓!

Great, this works!

Now let me also handle the edge case where lo might be empty when we try to access -lo[0].

Actually, during the initialization phase, lo will never be empty (we add k >= 1 elements). And during the sliding phase, we always have k elements, so lo will have at least 1 element (after cleaning).

Wait, could lo become empty? If k=1, then lo_size=1 and hi_size=0. When we remove the element, lo_size becomes 0. Then we add the new element. At that point, lo might be empty (if the old element was the only one and it got cleaned). Let me handle this.

In the `add` function, I check `if lo_size == 0 or x <= -lo[0]`. If lo_size is 0, we push to lo. Good.

But what about in `remove`? If lo_size is 1 and we remove the only element in lo, lo_size becomes 0. Then in rebalance, we might try to access lo[0] which could be a dead element or empty.

Let me add clean_lo() before accessing lo[0] in the remove function.

Actually, let me restructure:

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] = to_remove.get(x, 0) + 1
    # Determine which heap to decrement
    clean_lo()
    if lo_size > 0 and x < -lo[0]:
        lo_size -= 1
    elif lo_size > 0 and x == -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    clean_lo()
    clean_hi()
    rebalance()
```

Wait, but if lo_size is 0, we should decrement hi_size. And if x == -lo[0], we decrement lo_size. Let me simplify:

```python
def remove(x):
    nonlocal lo_size, hi_size
    to_remove[x] = to_remove.get(x, 0) + 1
    clean_lo()
    if lo_size > 0 and x <= -lo[0]:
        lo_size -= 1
    else:
        hi_size -= 1
    clean_lo()
    clean_hi()
    rebalance()
```

This should work. If lo is empty (lo_size=0), we decrement hi_size. If x <= max of lo, we assume it's in lo. Otherwise, it's in hi.

Let me also think about potential issues with floating point. Since we're dealing with floats, the `in` check for the dict should work fine (exact float equality).

Now, for performance: n=200,000, k=1,000. We do n-k+1 ≈ 200,000 iterations. Each iteration does:
- One remove: O(log k) for heap operations + cleaning (amortized O(1) per element over the entire run)
- One add: O(log k) for heap operations
- One get_median: O(1) + cleaning

The total should be O(n log k) which is about 200,000 * 10 = 2,000,000 operations. That should be well under 2 seconds.

Let me also consider: the `to_remove` dict will accumulate entries. Over the entire run, we add n-k+1 entries to to_remove. Each entry is a float -> int mapping. This should be fine memory-wise.

Actually, one optimization: after cleaning, if to_remove[value] becomes 0, we could delete the key. But this isn't necessary for correctness, just for memory.

Let me also make sure the rebalance function handles the case where lo or hi might have dead elements at the top:

```python
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
```

This looks correct. After cleaning, the top of the heap is a live element, so we can safely pop it.

One more thing: in `get_median`, for even k, we need both lo[0] and hi[0] to be valid. Since k >= 2 for even k, and we maintain lo_size >= 1 and hi_size >= 1 (for even k, lo_size = hi_size = k/2 >= 1), this should be fine.

Let me finalize the code:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    lo = []  # max-heap (negated values)
    hi = []  # min-heap
    to_remove = {}
    lo_size = 0
    hi_size = 0
    
    def clean_lo():
        nonlocal lo_size
        while lo and -lo[0] in to_remove and to_remove[-lo[0]] > 0:
            to_remove[-lo[0]] -= 1
            heapq.heappop(lo)
            lo_size -= 1
    
    def clean_hi():
        nonlocal hi_size
        while hi and hi[0] in to_remove and to_remove[hi[0]] > 0:
            to_remove[hi[0]] -= 1
            heapq.heappop(hi)
            hi_size -= 1
    
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
    
    def add(x):
        nonlocal lo_size, hi_size
        clean_lo()
        clean_hi()
        if lo_size == 0 or x <= -lo[0]:
            heapq.heappush(lo, -x)
            lo_size += 1
        else:
            heapq.heappush(hi, x)
            hi_size += 1
        rebalance()
    
    def remove(x):
        nonlocal lo_size, hi_size
        to_remove[x] = to_remove.get(x, 0) + 1
        clean_lo()
        if lo_size > 0 and x <= -lo[0]:
            lo_size -= 1
        else:
            hi_size -= 1
        clean_lo()
        clean_hi()
        rebalance()
    
    def get_median():
        clean_lo()
        clean_hi()
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    for i in range(k):
        add(nums[i])
    
    results = [get_median()]
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        results.append(get_median())
    
    return results
```

Wait, I should double-check: when k=1, lo_size=1, hi_size=0. get_median returns -lo[0]. Correct.

When k=2, lo_size=1, hi_size=1. get_median returns (-lo[0] + hi[0]) / 2. Correct.

I think this is correct. Let me also think about whether there could be issues with the `x <= -lo[0]` check when lo has dead elements. We call clean_lo() before the check, so lo[0] should be a live element. Good.

One potential issue: what if after clean_lo(), lo is empty but lo_size > 0? That shouldn't happen because lo_size only decreases when we pop from lo (in clean_lo or rebalance). If lo is empty, all elements have been popped, so lo_size should be 0.

Actually wait, in rebalance, we do:
```
val = -heapq.heappop(lo)
lo_size -= 1
```
This pops from lo and decrements lo_size. So if lo becomes empty, lo_size should also be 0 (assuming it was 1 before the pop). This is consistent.

I'm satisfied this is correct. Let me also add a small optimization: in the `to_remove` dict, if a count goes to 0, we could delete the key to save memory. But it's not necessary for correctness.

Actually, for the performance requirement (n=200,000, k=1,000 in under 2 seconds), let me estimate:
- 200,000 iterations
- Each iteration: 1 remove + 1 add + 1 get_median
- Each operation: O(log k) heap operations + O(1) cleaning (amortized)
- Total: ~200,000 * (a few heap ops of O(log 1000) ≈ 10) ≈ 2,000,000-4,000,000 basic operations

In Python, this should run in well under 1 second. The main overhead is the dict lookups for `to_remove`, but those are O(1) amortized.

I'm confident this solution is correct and efficient. Let me write the final version.
