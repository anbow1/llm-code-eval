Let me think about efficient sliding window median algorithms.

**Naive approach**: For each window, sort the k elements → O(n * k log k). With n=200,000 and k=1000, that's 200,000 * 1000 * ~10 = 2 billion operations. Too slow.

**Better approach**: Use two heaps (max-heap and min-heap) to maintain the median. This gives O(n log k) time. The challenge is lazy deletion when elements leave the window.

**Two-heap with lazy deletion approach**:
- Maintain a max-heap (lower half) and min-heap (upper half)
- Track the size of each half and lazily delete elements that have left the window
- Rebalance after each insertion/deletion

The tricky part with lazy deletion is:
1. We need to know which elements belong to which heap
2. We need to track "valid" sizes (excluding deleted elements)
3. We need a hash map to count pending deletions

Let me think through this carefully:

- `lo` = max-heap (stores negative values for Python's min-heap) containing the lower half
- `hi` = min-heap containing the upper half
- Invariant: len(lo) = len(hi) or len(lo) = len(hi) + 1 (for odd k)

Actually, let me think of another approach. 

**SortedList approach**: We could use a sorted list and insert/delete in O(k) per operation, giving O(n*k) which is 200M - borderline.

**Two heaps with lazy deletion** is the standard approach. Let me implement it:

1. Use two heaps: `lo` (max-heap via negation) and `hi` (min-heap)
2. Use dictionaries to track elements pending deletion
3. Track `lo_size` and `hi_size` as the "valid" sizes (excluding pending deletions)
4. After each operation, rebalance and clean up tops

The median computation:
- If k is odd: median is the top of `lo` (or `hi`, whichever is larger)
- If k is even: median is average of tops of `lo` and `hi`

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    lo = []  # max-heap (negated values), lower half
    hi = []  # min-heap, upper half
    lo_size = 0  # valid elements in lo
    hi_size = 0  # valid elements in hi
    lo_del = defaultdict(int)  # pending deletions from lo
    hi_del = defaultdict(int)  # pending deletions from hi
    
    def rebalance():
        nonlocal lo, hi, lo_size, hi_size
        # Ensure lo_size >= hi_size and lo_size <= hi_size + 1
        while lo_size > hi_size + 1:
            # Move top of lo to hi
            val = -heapq.heappop(lo)
            lo_size -= 1
            heapq.heappush(hi, val)
            hi_size += 1
        while lo_size < hi_size:
            # Move top of hi to lo
            val = heapq.heappop(hi)
            hi_size -= 1
            heapq.heappush(lo, -val)
            lo_size += 1
        # Prune tops
        prune_top(lo, lo_del)
        prune_top(hi, hi_del)
    
    def prune_top(heap, del_map):
        while heap and del_map[-heap[0] if heap is lo else heap[0]] > 0:
            # ... this is getting complicated
```

Actually, let me restructure. The pruning needs to know which heap it's operating on. Let me use a different structure.

Actually, a cleaner approach: store the values in the heaps, and use separate dicts for pending deletions. When we "delete" a value, we add it to the pending deletion dict of whichever heap it belongs to, and decrement the size. Then we prune the top of the heap whenever the top element has a pending deletion.

The tricky part is knowing which heap a value belongs to when we need to delete it. We can track this by knowing the median boundary.

Alternative cleaner approach: Since we know the current median (or boundary), when we want to remove a value:
- If the value <= current top of `lo`, it belongs to `lo`
- Otherwise it belongs to `hi`

But this isn't quite right either, because after rebalancing things can shift.

Let me look at this more carefully. The standard approach:

When adding a new element:
1. Compare with top of `lo`. If <= top of `lo`, push to `lo`, else push to `hi`.
2. Increment the appropriate size.
3. Rebalance.

When removing an old element:
1. Compare with top of `lo`. If <= top of `lo`, mark for deletion in `lo`, decrement `lo_size`. Else mark for deletion in `hi`, decrement `hi_size`.
2. Rebalance (which includes pruning tops).

The issue: the "top of lo" changes as we rebalance. But since we process add and remove in sequence before computing the median, and we always maintain the invariant, this should work.

Wait, there's a subtlety. When we remove an element, we compare it to the current top of `lo`. But what if the element is exactly equal to the top of `lo`? It could be in either heap. We need to handle duplicates.

Actually, the standard approach handles this by using a counter for each value. When we push a value to a heap, we increment a counter. When we "delete" a value, we compare with the median boundary to decide which heap to mark for deletion. Since we maintain the invariant that all values in `lo` <= all values in `hi`, comparing with the boundary works.

But duplicates can span both heaps. If we have value `x` in both `lo` and `hi`, and we want to delete one copy of `x`, we need to know which heap it was in. 

One solution: when adding, always push to `lo` first, then rebalance. When removing, if the value <= top of `lo`, mark it for deletion in `lo`. This works because:
- If the value was in `lo`, it's <= top of `lo` (since all lo elements <= top of lo)
- If the value was in `hi` and happens to equal top of `lo`, we might wrongly mark it for deletion in `lo`

Hmm, this is the tricky case with duplicates.

A robust solution: track the heap membership of each element. Since we're dealing with a sliding window, each element is added once and removed once. We can use a dict mapping element → which heap it's in.

But with duplicates, multiple copies of the same value can be in different heaps. We'd need to track counts per heap.

Actually, the standard lazy deletion approach handles this as follows:

When adding element `x`:
- If `x <= -lo[0]` (top of lo), push `-x` to `lo`, increment `lo_size`
- Else push `x` to `hi`, increment `hi_size`
- Rebalance

When removing element `x`:
- If `x <= -lo[0]` (top of lo), increment `lo_del[x]`, decrement `lo_size`
- Else increment `hi_del[x]`, decrement `hi_size`
- Rebalance

This works because of the invariant: all valid elements in `lo` are <= all valid elements in `hi`. The top of `lo` is the boundary. If `x` equals the boundary, it could be in either heap, but it doesn't matter which one we mark for deletion, because the rebalancing will fix things.

Wait, actually it does matter. If `x` is in `hi` but we mark it for deletion in `lo`, then we'll try to delete it from `lo`'s pending deletions, but the actual copy in `lo` won't be deleted (it'll stay as a "ghost"). And the actual copy in `hi` won't be deleted either.

Hmm, let me think again. Actually, with the lazy deletion approach, the key insight is:

The `lo_del` dict tracks "how many copies of value `x` should be considered deleted from `lo`". When we prune the top of `lo`, we check if the top value has a pending deletion in `lo_del`.

So if we wrongly mark a deletion in `lo_del` when the element is actually in `hi`:
- The top of `lo` might get wrongly pruned if its value matches
- The element in `hi` won't be properly marked for deletion

This could cause errors. So the comparison-based approach for deletion has issues with duplicates.

A cleaner solution: track the "heap_id" of each insertion. Since we process elements sequentially, we can assign each element an ID and track which heap it went to.

Actually, let me use a different approach. Let me assign a unique index to each element (its position in the array). When inserting, I record whether it went to `lo` or `hi`. When the element expires (leaves the window), I look up its recorded heap and mark for deletion in that heap.

```python
heap_id = {}  # index -> 0 for lo, 1 for hi
```

When inserting index `i`:
- Decide heap, push to it, set `heap_id[i] = 0` or `1`

When removing index `j`:
- Look up `heap_id[j]`, mark for deletion in that heap

This is clean and correct!

Let me implement this:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lo = []  # max-heap via negation
    hi = []  # min-heap
    lo_size = 0
    hi_size = 0
    lo_del = defaultdict(int)
    hi_del = defaultdict(int)
    heap_id = [0] * n  # 0 = lo, 1 = hi
    
    def prune_top():
        while lo and lo_del.get(-lo[0], 0) > 0:
            lo_del[-lo[0]] -= 1
            heapq.heappop(lo)
        while hi and hi_del.get(hi[0], 0) > 0:
            hi_del[hi[0]] -= 1
            heapq.heappop(hi)
    
    def rebalance():
        nonlocal lo_size, hi_size
        # Maintain lo_size == hi_size or lo_size == hi_size + 1
        while lo_size > hi_size + 1:
            val = -heapq.heappop(lo)
            lo_size -= 1
            prune_top()
            heapq.heappush(hi, val)
            hi_size += 1
        while lo_size < hi_size:
            val = heapq.heappop(hi)
            hi_size -= 1
            prune_top()
            heapq.heappush(lo, -val)
            lo_size += 1
        prune_top()
    
    def add(i):
        nonlocal lo_size, hi_size
        val = nums[i]
        if not lo or val <= -lo[0]:
            heapq.heappush(lo, -val)
            lo_size += 1
            heap_id[i] = 0
        else:
            heapq.heappush(hi, val)
            hi_size += 1
            heap_id[i] = 1
        rebalance()
    
    def remove(i):
        nonlocal lo_size, hi_size
        val = nums[i]
        if heap_id[i] == 0:
            lo_del[val] += 1
            lo_size -= 1
        else:
            hi_del[val] += 1
            hi_size -= 1
        rebalance()
    
    result = []
    for i in range(n):
        add(i)
        if i >= k:
            remove(i - k)
        if i >= k - 1:
            # compute median
            prune_top()
            if k % 2 == 1:
                result.append(float(-lo[0]))
            else:
                result.append(float((-lo[0] + hi[0]) / 2.0))
    
    return result
```

Wait, there's an issue with `heap_id`. When we rebalance, we move elements between heaps. The `heap_id` for those moved elements becomes stale. 

Hmm, this is a problem. When we move an element from `lo` to `hi` during rebalancing, the `heap_id` for that element's index should be updated. But we don't know the index of the element we're moving (we only know its value).

One fix: store `(value, index)` in the heaps instead of just `value`. Then when we pop during rebalancing, we know the index and can update `heap_id`.

Let me revise:

```python
lo = []  # max-heap: (-value, index)
hi = []  # min-heap: (value, index)
```

When comparing for insertion:
- `if not lo or val <= -lo[0][0]`

When moving during rebalance:
- Pop `(val, idx)` from lo, set `heap_id[idx] = 1`, push `(val, idx)` to hi

When pruning:
- Check if `lo_del[-lo[0][0]]` > 0... wait, but we need to track by index, not by value, to handle duplicates properly.

Actually, with the `(value, index)` approach, we can track deletions by index:

```python
lo_del = set()  # or defaultdict(int)
hi_del = set()
```

Or use a set of indices that are pending deletion.

Let me use sets:

```python
lo_del = set()  # indices pending deletion from lo
hi_del = set()  # indices pending deletion from hi
```

When pruning lo:
```python
while lo and lo[0][1] in lo_del:
    lo_del.discard(lo[0][1])
    heapq.heappop(lo)
```

When removing index `i`:
```python
if heap_id[i] == 0:
    lo_del.add(i)
    lo_size -= 1
else:
    hi_del.add(i)
    hi_size -= 1
```

When rebalancing (moving from lo to hi):
```python
val, idx = heapq.heappop(lo)
lo_size -= 1
prune_top()
heapq.heappush(hi, (val, idx))
hi_size += 1
heap_id[idx] = 1
```

This is clean! Let me write the full solution.

One more thing: the heap comparison for `(value, index)` tuples. For `lo`, we store `(-value, index)`. When comparing, Python will compare first by `-value` (which is what we want for max-heap), then by `index` as tiebreaker. This is fine.

For `hi`, we store `(value, index)`. Python compares by value first, then index. Fine.

Let me also double-check the rebalancing logic with prune_top. The issue is: when we pop from `lo` during rebalancing, the top of `lo` might be a deleted element. We should prune before popping, or handle it.

Actually, let me restructure. After any modification to sizes, we should:
1. Prune tops
2. Check if sizes are balanced
3. If not, move elements between heaps
4. Prune again (since moving might expose a deleted top)

Let me be more careful:

```python
def prune_top():
    while lo and lo[0][1] in lo_del:
        lo_del.discard(lo[0][1])
        heapq.heappop(lo)
    while hi and hi[0][1] in hi_del:
        hi_del.discard(hi[0][1])
        heapq.heappop(hi)

def rebalance():
    nonlocal lo_size, hi_size
    # Prune first to get correct tops
    prune_top()
    while lo_size > hi_size + 1:
        val, idx = heapq.heappop(lo)
        # Check if this is a deleted element
        if idx in lo_del:
            lo_del.discard(idx)
            continue  # don't decrement lo_size since it was already decremented
        lo_size -= 1
        heap_id[idx] = 1
        heapq.heappush(hi, (val, idx))
        hi_size += 1
        prune_top()
    while lo_size < hi_size:
        val, idx = heapq.heappop(hi)
        if idx in hi_del:
            hi_del.discard(idx)
            continue
        hi_size -= 1
        heap_id[idx] = 0
        heapq.heappush(lo, (-val, idx))
        lo_size += 1
        prune_top()
    prune_top()
```

Hmm wait, this is getting complicated. Let me think about whether we need to handle deleted elements being popped during rebalancing.

When we pop from `lo` to move to `hi`, the top of `lo` might be a deleted element. But we already pruned the top before checking the size. However, after pruning, the top is valid. So when we pop it, it's valid. Good.

But wait, after we pop and push to the other heap, the other heap's top might now be a deleted element. That's why we prune again.

Actually, I think the cleaner approach is:

```python
def rebalance():
    nonlocal lo_size, hi_size
    while lo_size > hi_size + 1:
        val, idx = heapq.heappop(lo)
        if idx in lo_del:
            lo_del.discard(idx)
            continue
        lo_size -= 1
        heap_id[idx] = 1
        heapq.heappush(hi, (val, idx))
        hi_size += 1
    while lo_size < hi_size:
        val, idx = heapq.heappop(hi)
        if idx in hi_del:
            hi_del.discard(idx)
            continue
        hi_size -= 1
        heap_id[idx] = 0
        heapq.heappush(lo, (-val, idx))
        lo_size += 1
    # Prune tops so that median computation works
    while lo and lo[0][1] in lo_del:
        lo_del.discard(lo[0][1])
        heapq.heappop(lo)
    while hi and hi[0][1] in hi_del:
        hi_del.discard(hi[0][1])
        heapq.heappop(hi)
```

This handles the case where we pop a deleted element during rebalancing (it was marked for deletion but we hadn't pruned it from the middle of the heap yet). We just discard it and continue.

Actually, I realize there's a subtle issue. The `lo_size` already accounts for the deleted elements (we decremented it when we marked for deletion). So if we pop a deleted element from the heap, we shouldn't decrement `lo_size` again. The `continue` handles this correctly.

But there's another issue: after we pop a deleted element and `continue`, we're still in the while loop checking `lo_size > hi_size + 1`. Since we didn't change sizes, we might loop forever if all remaining elements in `lo` are deleted. But that can't happen because `lo_size` represents the actual count of non-deleted elements, and we're only in the loop because `lo_size > hi_size + 1`, meaning there are actual valid elements in `lo`.

OK I think this is correct. Let me finalize.

One more concern: performance. With n=200,000 and k=1,000, we have 200,000 operations, each O(log k) for heap operations. The `continue` in rebalancing could in theory cause issues, but on average it's amortized O(1) extra work.

Actually, I want to make sure the rebalance loop terminates. In the worst case, the `continue` branch executes once per rebalance call. Since we only move one element per "real" move (lo_size changes), and the deleted elements are finite (bounded by total insertions), this is fine.

Let me also reconsider: is the `while lo_size > hi_size + 1` loop really a while loop? We add one element at a time and remove one element at a time. After adding, the imbalance is at most 1 extra on one side. After removing, the imbalance is at most 1. So we move at most 1 element. Using `while` is safe but a single `if` would suffice for performance. I'll keep `while` for correctness.

Let me write the final solution:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lo = []  # max-heap: (-value, index)
    hi = []  # min-heap: (value, index)
    lo_size = 0
    hi_size = 0
    lo_del = set()
    hi_del = set()
    heap_id = [0] * n  # 0 = in lo, 1 = in hi
    
    result = []
    
    def add(i):
        nonlocal lo_size, hi_size
        val = nums[i]
        if not lo or -val >= -lo[0][0]:  # val <= -lo[0][0], i.e., val <= max of lo
            heapq.heappush(lo, (-val, i))
            lo_size += 1
            heap_id[i] = 0
        else:
            heapq.heappush(hi, (val, i))
            hi_size += 1
            heap_id[i] = 1
    
    def remove(i):
        nonlocal lo_size, hi_size
        if heap_id[i] == 0:
            lo_del.add(i)
            lo_size -= 1
        else:
            hi_del.add(i)
            hi_size -= 1
    
    def rebalance():
        nonlocal lo_size, hi_size
        while lo_size > hi_size + 1:
            val, idx = heapq.heappop(lo)
            if idx in lo_del:
                lo_del.discard(idx)
                continue
            lo_size -= 1
            heap_id[idx] = 1
            heapq.heappush(hi, (val, idx))
            hi_size += 1
        while lo_size < hi_size:
            val, idx = heapq.heappop(hi)
            if idx in hi_del:
                hi_del.discard(idx)
                continue
            hi_size -= 1
            heap_id[idx] = 0
            heapq.heappush(lo, (-val, idx))
            lo_size += 1
        # Prune tops
        while lo and lo[0][1] in lo_del:
            lo_del.discard(lo[0][1])
            heapq.heappop(lo)
        while hi and hi[0][1] in hi_del:
            hi_del.discard(hi[0][1])
            heapq.heappop(hi)
    
    for i in range(n):
        add(i)
        if i >= k:
            remove(i - k)
        rebalance()
        if i >= k - 1:
            if k % 2 == 1:
                result.append(float(-lo[0][0]))
            else:
                result.append(float((-lo[0][0] + hi[0][0]) / 2.0))
    
    return result
```

Wait, I have a bug in the `add` function. The condition should be:
- Push to `lo` if `val <= current max of lo` (i.e., `val <= -lo[0][0]`)

So: `if not lo or val <= -lo[0][0]`

Let me fix: `if not lo or val <= -lo[0][0]`

Actually wait, `-lo[0][0]` is the actual value stored at the top of the max-heap (the maximum of the lower half). So the condition `val <= -lo[0][0]` means "this value belongs in the lower half". That's correct.

But wait, after pruning, the top of `lo` might not be the actual maximum of the lower half (because there could be stale entries). Hmm, but we prune the top before using it in the median computation. However, in `add`, we use `-lo[0][0]` as the boundary. If the top is stale, this could be wrong.

Actually, let's think about when `add` is called. We call `add`, then `remove`, then `rebalance`. Before the next `add`, we've done `rebalance` which prunes the tops. So when `add` is called next, the top of `lo` is valid (not deleted). Good.

Wait, no. Let me re-read my loop:
```
for i in range(n):
    add(i)        # lo and hi tops might be stale from previous rebalance? No, rebalance was called last iteration
    if i >= k:
        remove(i - k)
    rebalance()
    if i >= k - 1:
        # compute median
```

After `rebalance()` at the end of iteration `i-1`, the tops are pruned. Then at iteration `i`, `add` uses the pruned top. Good.

But what about the very first iteration? Before the loop starts, both heaps are empty. `add(0)` checks `if not lo` → True, pushes to `lo`. Fine.

What about `remove` and its interaction with `rebalance`? After `remove`, we call `rebalance`. In `rebalance`, we might pop from `lo` or `hi`. The top might be a deleted element (the one we just removed if it was at the top). The `if idx in lo_del: continue` handles this.

I think the logic is correct. Let me trace through a small example.

Example: nums = [1, 3, 5, 2, 4], k = 3

i=0: add(0, val=1). lo=[(-1,0)], lo_size=1, hi=[], hi_size=0. rebalance: lo_size(1) == hi_size(0)+1, OK. No pruning needed. Not enough elements yet.

i=1: add(1, val=3). lo[0] = (-1, 0), so -lo[0][0] = 1. val=3 > 1, push to hi. hi=[(3,1)], hi_size=1. rebalance: lo_size(1) == hi_size(1), OK. Not enough elements.

i=2: add(2, val=5). lo[0] = (-1, 0), -lo[0][0] = 1. val=5 > 1, push to hi. hi=[(3,1),(5,2)], hi_size=2. rebalance: lo_size(1) < hi_size(2), move top of hi to lo. Pop (3,1) from hi, hi_size=1. Push (-3,1) to lo, lo_size=2. Now lo=[(-3,1),(-1,0)], hi=[(5,2)]. lo_size(2) == hi_size(1)+1, OK. Median: k=3 odd, result.append(float(-lo[0][0])) = 3.0. Correct! (median of [1,3,5] is 3)

i=3: add(3, val=2). lo[0] = (-3, 1), -lo[0][0] = 3. val=2 <= 3, push to lo. lo=[(-3,1),(-1,0),(-2,3)], lo_size=3. Now remove(0, idx=0). heap_id[0]=0, so lo_del={0}, lo_size=2. rebalance: lo_size(2) == hi_size(1)+1, OK. Prune top of lo: lo[0]=(-3,1), 1 not in lo_del, OK. Median: k=3 odd, result.append(float(-lo[0][0])) = 3.0. Correct! (median of [3,5,2] is 3)

i=4: add(4, val=4). lo[0] = (-3, 1), -lo[0][0] = 3. val=4 > 3, push to hi. hi=[(4,4),(5,2)], hi_size=2. remove(1, idx=1). heap_id[1]=0, so lo_del={0,1}, lo_size=1. rebalance: lo_size(1) < hi_size(2), move top of hi to lo. Pop (4,4) from hi, hi_size=1. Check: 4 not in hi_del, OK. Push (-4,4) to lo, lo_size=2. Now lo=[(-4,4),(-3,1),(-1,0),(-2,3)], hi=[(5,2)]. lo_size(2) == hi_size(1)+1, OK. Prune top of lo: lo[0]=(-4,4), 4 not in lo_del, OK. Median: float(-lo[0][0]) = 4.0. Correct! (median of [5,2,4] is 4)

Result: [3.0, 3.0, 4.0]. Correct!

Looks good. Let me also think about edge cases:
- k = 1: each window is a single element, median is that element.
- k = n: only one window.
- All same values: duplicates handled correctly since we track by index.

One potential issue: the `while` loop in rebalance could loop many times if there are many deleted elements at the top. But amortized over all operations, each element is popped at most once from each heap, so total work is O(n log k).

I think this solution is correct and efficient enough. Let me finalize it.

Actually, one more thing: for the `add` function, I should handle the case where `lo` is empty but `hi` is not (this shouldn't happen with our rebalance invariant, but let's be safe). With our invariant `lo_size >= hi_size`, `lo` is never empty when `hi` is non-empty (assuming valid state). And on the very first call, both are empty. So the `if not lo` check handles it.

Let me also consider: what if `lo` is empty but `hi` is not? This can't happen after rebalance (we ensure `lo_size >= hi_size`). Before rebalance, after `add`, if we push to `hi` when `lo` was empty... wait, `add` checks `if not lo or val <= -lo[0][0]`. If `lo` is empty, we push to `lo`. So `lo` is never empty after `add` unless `hi` is also empty (initial state). Good.

I'm satisfied the solution is correct. Let me write the final version.
