Implement sliding median with two heaps (lazy deletion) using standard library. Classic approach: two heaps small (max-heap via negation) and large (min-heap), with lazy deletion using a hash/delayed dict. Or use sortedcontainers — not allowed (stdlib only).

Alternative: maintain a sorted list with bisect.insort and remove — removal is O(k) per step, k=1000, n=200000 → 200M ops... insort is O(log k) but list.pop(index) is O(k) shift — 200,000 * 1000 element shifts = 2*10^8, borderline but in C it's fast (memmove). Actually list.pop at index does memmove which is very fast in C. 200k * 1000 * 8 bytes = 1.6GB memmove total — that's roughly... memmove ~10GB/s, so ~0.16s. Plus insort is also memmove-based O(k). So bisect approach actually works fine: each step: insort O(log k + k memmove) and pop O(k memmove). Total ~2*0.16s = fine. Median lookup O(1). This is simple and fast enough.

But heap-based two-heap lazy deletion is the canonical solution. Let me write it carefully.

Two-heaps approach:
- small = max-heap (negated), large = min-heap.
- Balance invariant: len(small) == len(large) or len(small) == len(large)+1.
- Lazy deletion: use dict `delayed` counting elements to delete; valid counts: len(small)+len(large) tracks number of valid elements.

Standard implementation (from LeetCode 480 solution):

```python
def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    n = len(nums)
    result = []
    small = []  # max heap (negated)
    large = []  # min heap
    delayed = defaultdict(int)  # or {}
    
    def prune(heap):
        while heap:
            num = -heap[0] if heap is small else heap[0]
            if delayed[num]:
                # decrement
                ...
```

Let me write carefully with helpers.

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    n = len(nums)
    medians = []
    small = []   # max-heap, store negatives
    large = []   # min-heap
    delayed = defaultdict(int)
    size_small = 0
    size_large = 0

    def make_balance():
        if size_small > size_large + 1:
            heapq.heappush(large, -heapq.heappop(small))
            size_small -= 1; size_large += 1
            prune(small)
        elif size_small < size_large:
            heapq.heappush(small, -heapq.heappop(large))
            size_large -= 1; size_small += 1
            prune(large)

    def prune(heap):
        while heap:
            num = -heap[0] if heap is small else heap[0]
            if delayed[num]:
                delayed[num] -= 1
                if delayed[num] == 0:
                    del delayed[num]
                heapq.heappop(heap)
            else:
                break

    def add(num):
        if small and num < -small[0]:
            heapq.heappush(small, -num); size_small += 1
        else:
            heapq.heappush(large, num); size_large += 1
        make_balance()

    def remove(num):
        delayed[num] += 1
        if num <= -small[0] if small else ...:
```

Careful with determining which heap the removed element belongs to. Standard check: if num <= -small[0] (small nonempty) then it's in small (logically), decrement size_small, else large.

Note: if num <= -small[0] but num actually was in large? With duplicates this check is the standard accepted heuristic — it works because delayed counts handle correctness: the pruning eventually removes garbage from heaps. Actually the standard solution does: `if num <= -small[0]: size_small -= 1; prune(small) else: size_large -= 1; prune(large)` — but pruning of wrong heap... The delayed dict marks it; prune removes from top when the marked value reaches the top. Since sizes are logical, invariant maintained. It's known correct (LeetCode 480 standard solution).

Actually more robust: check membership? Can't check heap membership efficiently. The standard approach relies on: if num <= max(small), it's "in" small logically. Since all elements ≤ max(small) that are not in large... hmm, actually elements ≤ max(small) could be in large if duplicates exist. But delayed marks handle it: sizes stay consistent because we decrement the size of the heap whose top bound matches; the actual heap contents may have stale items but pruning keeps tops valid. This is the accepted standard solution and is correct.

Wait — subtle: prune only removes delayed items at the heap top. If a delayed item is buried, it stays until it surfaces. That's fine, tops are always valid. Sizes (logical) tracked separately. Balance uses logical sizes. Medians read tops which are valid. Correct.

For k=1: window median is the element itself. add then remove each step — fine.

Also for even k: median = (max(small) + min(large))/2 when logical sizes equal; odd k: -small[0].

Let me also handle remove when small is empty: then num > ... must be in large. Check `if small and num <= -small[0]`.

Also, `make_balance` after add; prune inside balance. Also after remove, call prune on the affected heap and then make_balance.

Let me write the code:

```python
import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    n = len(nums)
    out = []
    small: list[float] = []          # max-heap via negation
    large: list[float] = []          # min-heap
    delayed: defaultdict = defaultdict(int)
    size_small = 0
    size_large = 0

    def prune(heap: list) -> None:
        top_is_neg = heap is small
        while heap:
            num = -heap[0] if top_is_neg else heap[0]
            if delayed[num]:
                delayed[num] -= 1
                if not delayed[num]:
                    del delayed[num]
                heapq.heappop(heap)
            else:
                break

    def rebalance() -> None:
        nonlocal size_small, size_large
        if size_small > size_large + 1:
            heapq.heappush(large, -heapq.heappop(small))
            size_small -= 1
            size_large += 1
            prune(small)
        elif size_small < size_large:
            heapq.heappush(small, -heapq.heappop(large))
            size_large -= 1
            size_small += 1
            prune(large)

    def add(num: float) -> None:
        nonlocal size_small, size_large
        if small and num < -small[0]:
            heapq.heappush(small, -num)
            size_small += 1
        else:
            heapq.heappush(large, num)
            size_large += 1
        rebalance()

    def remove(num: float) -> None:
        nonlocal size_small, size_large
        delayed[num] += 1
        if small and num <= -small[0]:
            size_small -= 1
            prune(small)
        else:
            size_large -= 1
            prune(large)
        rebalance()

    for i in range(k):
        add(nums[i])
    if k % 2:
        out.append(float(-small[0]))
    else:
        out.append((-small[0] + large[0]) / 2.0)

    for i in range(k, n):
        add(nums[i])
        remove(nums[i - k])
        if k % 2:
            out.append(float(-small[0]))
        else:
            out.append((-small[0] + large[0]) / 2.0)
    return out
```

Edge: k=1: after add, size_small is 1, large 0; median odd → -small[0]. Then remove(nums[i-1]): num <= -small[0]? num == that value yes → size_small 0, prune(small) removes it, rebalance: size_small < size_large? both 0. Then add next... wait order in loop: add(nums[i]) then remove(nums[i-k]). For k=1, i-k = i-1. First iteration i=1: add nums[1], remove nums[0]. Good.

Edge: k == n: only first window.

Edge: nums empty and k>=1: k > len(nums) → ValueError. Good.

Potential issue: rebalance prune(small) — if small becomes empty after pop, prune loop exits fine.

One more concern: when comparing `num <= -small[0]` where small[0] is a float negated. Fine.

Performance: O(n log k). Fine.

Note: for even k with rebalance invariant size_small == size_large or +1: for even k, invariant ensures size_small == size_large, so both nonempty. Good. For odd k, small has one more.

One subtlety: rebalance after remove — since remove decrements one side, sizes may go to size_small = size_large - 1... wait invariant: size_small ∈ {size_large, size_large+1}. After remove, could be size_small == size_large - 1 (if removed from small when equal) → rebalance moves from large. Good.

Also could add micro-opt but not needed.

Also `heap is small` — closure captures lists; since we never rebind, fine. Actually I could pass a flag. Keep as is.

Return floats: nums are floats already; -small[0] is float. Cast anyway with float().