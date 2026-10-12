Efficient sliding median using two heaps with lazy deletion, or sorted containers via bisect. The classic two-heap approach: maintain max-heap (low) and min-heap (high), with a delayed-delete counter. With k=1000 and n=200000, lazy deletion works fine.

Alternatively, use bisect.insort into a sorted list of window elements — insertion into list of 1000 elements is O(k) memmove, which is fast (C-level). 200,000 windows × removal via bisect + insort = O(n·k) memmove but C-level: 200,000 × 2000 ops ≈ 4×10^8... actually memmove of 1000 floats is very fast (~microseconds), total ~0.4s maybe. Two-heap lazy deletion is O(n log k), safer. Let me write the two-heap approach carefully.

Standard approach:
- low: max-heap (negated), high: min-heap
- balance invariant: len(low) == len(high) or len(low) == len(high)+1
- lazy deletion: when element leaves window, mark pending deletions in a dict; before using heap tops, prune pending elements.

Implementation (well-known LeetCode 480 solution):

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    lo = []  # max-heap, negated
    hi = []  # min-heap
    to_delete = defaultdict(int)
    lo_size = 0  # effective sizes
    hi_size = 0
    result = []

    def prune(heap):
        while heap:
            num = heap[0] if heap is hi else -heap[0]
            if to_delete[num]:
                to_delete[num] -= 1
                heapq.heappop(heap)
                if heap is hi: hi_size -= 1 else lo_size -= 1
            else:
                break
```

Better: write functions make_small (pop from lo, push to hi) etc. Let me use the standard LeetCode 480 dual-heap solution.

Standard code:

```python
def sliding_median(nums, k):
    n = len(nums)
    if not 1 <= k <= n:
        raise ValueError("k must be between 1 and len(nums)")
    if k == 1:
        return [float(x) for x in nums]

    lo = []  # max heap (negated values)
    hi = []  # min heap
    delayed = defaultdict(int)
    balance = 0  # hi_size - lo_size conceptually... 

Actually let me use the classic approach with explicit sizes:

```python
lo_size = hi_size = 0  # logical sizes

def prune(heap, size_attr):
    ...
```

Simpler: track logical sizes as integers, prune inside balance operations.

Classic LeetCode solution pattern:

```python
class DualHeap:
    def __init__(self, k):
        self.k = k
        self.small = []  # max-heap
        self.large = []  # min-heap
        self.delayed = collections.Counter()
        self.small_size = 0
        self.large_size = 0

    def prune(self, heap):
        while heap:
            num = heap[0]
            if heap is self.small:
                num = -num
            if self.delayed[num]:
                self.delayed[num] -= 1
                if self.delayed[num] == 0:
                    del self.delayed[num]
                heapq.heappop(heap)
            else:
                break

    def balance(self):
        if self.small_size > self.large_size + 1:
            # small -> large
            heapq.heappush(self.large, -heapq.heappop(self.small))
            self.small_size -= 1
            self.large_size += 1
            self.prune(self.small)
        elif self.small_size < self.large_size:
            heapq.heappush(self.small, -heapq.heappop(self.large))
            self.large_size -= 1
            self.small_size += 1
            self.prune(self.large)

    def insert(self, num):
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.small_size += 1
        else:
            heapq.heappush(self.large, num)
            self.large_size += 1
        self.balance()

    def erase(self, num):
        self.delayed[num] += 1
        if num <= -self.small[0]:
            self.small_size -= 1
            if num == -self.small[0]:
                self.prune(self.small)
        else:
            self.large_size -= 1
            if num == self.large[0]:
                self.prune(self.large)
        self.balance()

    def median(self):
        if self.k % 2:
            return float(-self.small[0])
        return (-self.small[0] + self.large[0]) / 2
```

Careful with delayed counter: using dict and deleting when zero to avoid growth — fine. Also delayed can grow with stale entries for erased nums not at top... Actually with `del self.delayed[num]` when zero, keys only exist while > 0. But erase(num) adds delayed[num]+=1 creating entry even if never pruned... it will be pruned when it reaches top eventually. If window slides, erase happens for elements leaving window — they get delayed entries; when they reach heap top they're pruned. Since heap sizes stay bounded by ~k, entries eventually pruned? Not necessarily — an erased element may sit below other elements and never reach top until... but heap sizes are bounded by logical sizes + delayed count; delayed count could grow? Bounded: each erase adds one delayed, each prune removes. Total delayed ≤ number of elements ever erased minus pruned. But heap size = small_size + large_size logical; delayed elements occupy slots in heaps. Heaps physical size ≤ logical sizes + delayed. Could delayed grow unboundedly? Each delayed element is in a heap; heap physical size grows by pushes only. Physical size ≤ n total pushes. It's bounded by n overall, memory fine.

Edge case k==n: still works.

Also `erase` when num == -small[0]: prune small — but the delayed increment happens first, so prune will remove top if delayed. Good. Note erase requires small non-empty — always true since k≥1 and window non-empty, small_size ≥ 1 after balance? With balance condition small_size == large_size or small_size == large_size+1, small never empty. For k==1: small_size=1, large=0. erase works.

Return result: for each window after inserting nums[i], i from 0..k-1 insert; then for each i from k..n-1: median, erase nums[i-k], insert nums[i]; at end append median.

Wait, order: after first window, compute median. Loop i in range(k, n): result.append(median()); erase(nums[i-k]); insert(nums[i]); then append median at end. Correct: n-k+1 medians.

Also erase for num==small[0] check: need prune inside erase — fine.

Actually one subtlety: in erase, `if num <= -self.small[0]` determines which heap logically contains it. Since balance invariant holds and duplicates handled via delayed, that's the standard correct approach.

Handle floats and possibly non-comparable? nums are floats, fine. But nums could contain ints? Type hint says floats; fine either way.

Also prune needs to know which heap to negate. I'll pass a flag.

Let me write final code as a function with nested functions or a simple class. I'll write it inline with closures for speed, or a class — speed matters slightly; nested functions with local variable access faster. I'll write it procedurally.

Let me write procedural:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if not 1 <= k <= n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    small = []  # max-heap (negated)
    large = []  # min-heap
    delayed = defaultdict(int)
    small_size = 0
    large_size = 0
    result = []
    append = result.append

    def prune(heap: list, is_small: bool) -> None:
        nonlocal small_size, large_size
        while heap:
            top = heap[0]
            if is_small:
                top = -top
            if delayed[top]:
                delayed[top] -= 1
                if not delayed[top]:
                    del delayed[top]
                heapq.heappop(heap)
                if is_small:
                    small_size -= 1
                else:
                    large_size -= 1
            else:
                break

    # initial window
    for i in range(k):
        num = nums[i]
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
            small_size += 1
        else:
            heapq.heappush(large, num)
            large_size += 1
        # balance
        if small_size > large_size + 1:
            heapq.heappush(large, -heapq.heappop(small))
            small_size -= 1
            large_size += 1
            prune(small, True)
        elif small_size < large_size:
            heapq.heappush(small, -heapq.heappop(large))
            large_size -= 1
            small_size += 1
            prune(large, False)

    # helper for median
    def median():
        if k & 1:
            return float(-small[0])
        return (-small[0] + large[0]) / 2.0

    append(median())

    for i in range(k, n):
        # erase nums[i-k]
        num = nums[i - k]
        delayed[num] += 1
        if num <= -small[0]:
            small_size -= 1
            if num == -small[0]:
                prune(small, True)
        else:
            large_size -= 1
            if num == large[0]:
                prune(large, False)
        # balance
        if small_size > large_size + 1:
            heapq.heappush(large, -heapq.heappop(small))
            small_size -= 1
            large_size += 1
            prune(small, True)
        elif small_size < large_size:
            heapq.heappush(small, -heapq.heappop(large))
            large_size -= 1
            small_size += 1
            prune(large, False)
        # insert nums[i]
        num = nums[i]
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
            small_size += 1
        else:
            heapq.heappush(large, num)
            large_size += 1
        if small_size > large_size + 1:
            heapq.heappush(large, -heapq.heappop(small))
            small_size -= 1
            large_size += 1
            prune(small, True)
        elif small_size < large_size:
            heapq.heappush(small, -heapq.heappop(large))
            large_size -= 1
            small_size += 1
            prune(large, False)

        append(median())

    return result
```

Issue: in erase, when `num <= -small[0]` — small must be non-empty. After first window small_size ≥ 1 always. During erase before insert: small_size ≥ large_size, so small_size ≥ 1 as long as window non-empty (k ≥ 1). For k==1: erase nums[i-1]: delayed[num] += 1; num <= -small[0] true (only element); small_size -=1 → 0; num == -small[0] → prune small → pops it, delayed decremented. Then balance: small_size(0) < large_size(0)? No, equal. Then insert num: small empty → push. small_size=1, large_size=0. OK. But wait: after pruning small is empty; erase branch uses -small[0] before checking? Condition `num <= -small[0]` — small non-empty at that point (window still has k elements before erase). Yes fine.

Another subtle issue: in erase, delayed[num] += 1 then check `num == -small[0]` → prune. But if num is the top and delayed count now ≥1, prune pops it once (decrementing delayed). Good.

Balance edge: after erase, small_size could be large_size - 1 → balance moves one from large to small. Prune(large) after pop from large — correct, since the popped top was valid (we only pop real elements from the top; tops are always non-delayed due to pruning... actually tops are guaranteed non-delayed after prune calls? The pop in balance happens on heap top which must be non-delayed because invariant: tops never delayed after each operation ends? Hmm, after erase, delayed[num]+=1 might make small[0] delayed, but we prune immediately if num == small[0]. If num < small[0], it's buried; top not delayed. In balance, heappop from small: small's top is guaranteed non-delayed at that point? After erase we pruned if top was the erased num. If erased num was in large and equal large[0], pruned large. So tops are clean before balance. Then balance pops top (clean), pushes to other heap. New top of source heap might be delayed? No — tops are never delayed except transiently; we prune the source heap after pop, which handles any newly-exposed delayed top. Actually the newly exposed top could be delayed (a previously erased buried element now at top). prune handles it. Then in insert: check `num <= -small[0]` — small's top is clean (pruned at end of balance). Good. Invariant maintained: at the start/end of each full iteration, both heap tops are non-delayed. That's the standard correctness argument.

One more: in prune, delayed[top] on defaultdict — accessing creates entry if absent? `if delayed[top]:` — for defaultdict, accessing missing key creates it with 0. That creates stale zero entries. Better: use `if delayed.get(top)` — use regular dict via defaultdict but .get avoids creation. Use `d = delayed.get(top)`. Let me use a plain dict: delayed = {} and in erase: delayed[num] = delayed.get(num, 0) + 1. In prune: cnt = delayed.get(top, 0); if cnt: ...

Performance: n=200k, k=1000 → ~200k iterations with ~4-6 heap ops each, O(log k) — well under 2s.

Also median for even k: (-small[0] + large[0]) / 2.0 — float. For odd: float(-small[0]).

Edge: k == n: loop doesn't run; result has 1 element. Good.

Write final clean code. Use local references to heapq functions for speed: heappush = heapq.heappush etc.

Also handle potential non-float ints: float(-small[0]) fine.

Final code.