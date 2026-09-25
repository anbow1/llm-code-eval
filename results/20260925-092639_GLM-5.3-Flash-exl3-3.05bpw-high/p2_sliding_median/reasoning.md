Efficient sliding median: use two heaps with lazy deletion, or a sorted list with bisect + insertion... insertion into a list is O(n) per op — with n=200k and k=1000, each insert/delete is O(k) shift = 1000*200k = 2e8 ops... Actually list.insert is memmove, quite fast. 2e8 bytes moved... k=1000 elements shift, 200k windows * 2 operations (remove + insert) * 1000 elements * 8 bytes = 3.2e9 bytes moved — memmove is fast (~10 GB/s) → ~0.3s. That's actually feasible. bisect.insort approach is common and fast enough. But two-heaps with lazy deletion is safer asymptotically: O(n log n).

Let me implement the classic two-heap with lazy deletion using heap entries (value, index) and a "delayed" dict... Actually simpler approach for fixed window: use index-based validity. Standard technique:

- low: max-heap (negated values), high: min-heap.
- Lazy deletion: maintain counts of invalid entries. When popping, skip invalid.

Alternative cleaner approach: use a SortedList-like via two heaps with "partitions". Let me write the standard solution:

Maintain heaps valid via a dict `pending` counting delayed deletions. Balance so low has either equal size or one more than high (for odd k median is top of low... but with deletions sizes get out of sync). Better to maintain counts `len(low)` and `len(high)` as effective sizes tracking valid elements.

Implementation:

```python
import heapq

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    if k == 1:
        return [float(x) for x in nums]
    low = []  # max-heap (negated)
    high = []
    low_size = 0  # valid count
    high_size = 0
    delayed = {}  # value -> count (use tuples to distinguish? values are floats, deletion by value fine)
```

Deletion by value: when element leaves window at index i, mark nums[i] for deletion. But duplicates: delayed dict keyed by value counts how many pending deletions of that value; lazy pop checks top value in delayed. That works with duplicates.

Standard "heapq with lazy deletion / sliding window median" LeetCode 480 solution:

```python
def sliding_median(nums, k):
    n = len(nums)
    if not 1 <= k <= n:
        raise ValueError("k must be between 1 and len(nums)")
    if k == 1:
        return [float(x) for x in nums]

    low, high = [], []          # max-heap via negation, min-heap
    low_valid = high_valid = 0  # number of valid elements conceptually in each heap
    delayed = {}

    def prune(heap):
        # discard invalid tops
        while heap:
            v = -heap[0] if heap is low else heap[0]
            if delayed.get(v, 0):
                heapq.heappop(heap)
                delayed[v] -= 1
                if not delayed[v]:
                    del delayed[v]
            else:
                break
```

Hmm, but the value used as key: for low we push -x, so we check -low[0]. delayed keyed by actual value x. When deleting element x, delayed[x] += 1. Prune low: while low and delayed.get(-low[0]): delayed[-low[0]] -= 1, heappop(low). Good.

Effective size tracking: when a pending deletion is recorded but element still in heap, we decrement the "size" of the heap containing it. Standard LeetCode 480 solution does exactly this. Need to know which heap contains the element to remove — but the standard solution handles it via rebalancing logic that assumes each valid element is in exactly one heap and the sizes reflect where things belong. The classic solution:

```python
class DualHeap:
    def __init__(self, k):
        self.small = []  # max heap
        self.large = []
        self.delayed = {}
        self.k = k
        self.smallSize = 0
        self.largeSize = 0

    def prune(self, heap):
        while heap:
            num = heap[0]
            if heap is self.small:
                num = -num
            c = self.delayed.get(num, 0)
            if c:
                self.delayed[num] = c - 1
                if not self.delayed[num]:
                    del self.delayed[num]
                heapq.heappop(heap)
            else:
                break

    def makeBalance(self):
        if self.smallSize > self.largeSize + 1:
            heapq.heappush(self.large, -self.small[0])
            heapq.heappop(self.small)
            self.smallSize -= 1
            self.largeSize += 1
            self.prune(self.small)
        elif self.smallSize < self.largeSize:
            heapq.heappush(self.small, -self.large[0])
            heapq.heappop(self.large)
            self.smallSize += 1
            self.largeSize -= 1
            self.prune(self.large)

    def rebalance-delayed cleanup: prune both heaps

    def insert(self, num):
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.smallSize += 1
        else:
            heapq.heappush(self.large, num)
            self.largeSize += 1
        self.makeBalance()

    def erase(self, num):
        self.delayed[num] = self.delayed.get(num, 0) + 1
        if num <= -self.small[0]:
            self.smallSize -= 1
            if num == -self.small[0]:
                self.prune(self.small)
        else:
            self.largeSize -= 1
            if num == self.large[0]:
                self.prune(self.large)
        self.makeBalance()  # also prune? standard does makeBalance which prunes moved tops
```

Also need prune in makeBalance — the standard solution prunes after popping/moving. Also getMedian: if k odd, median = -small[0]; else (-small[0] + large[0]) / 2. Before reading median, should prune? The standard solution prunes when erasing hits top; delayed entries deeper don't affect top reading unless they're invalid at top — tops were pruned during erase when equal. Actually a delayed element might later migrate... In the standard LeetCode solution, median reading is safe because pruning happens whenever a delayed-deleted value could surface (on erase when it equals current top, and during makeBalance pops). Hmm, is it fully safe? The known accepted solution (from the official LeetCode 480 solution "延迟删除") does:

```python
def getMedian(self):
    if self.k % 2 == 1:
        return float(-self.small[0])
    else:
        return (-self.small[0] + self.large[0]) / 2
```

And correctness relies on: the top of each heap is always valid. Why? Because whenever a deletion candidate would become top... Consider: value x deleted (delayed), and x is not top of its heap. Then later, elements above it get popped/pruned naturally via heappop in makeBalance — those pops are real pops of valid values being moved/removed as part of balance. When x surfaces to top during such a pop... Actually pops in makeBalance happen via heappop(self.small) after pushing -small[0] to large — that pushed value is the current top which is valid at that time. After popping it, the next value could be a delayed-invalid x. Then large now contains x's neighbor... then getMedian reads large[0] which might be invalid x? Wait no: prune(small) is called after that pop in the standard implementation. Let me recall the official code:

Official solution III (delayed deletion):

```python
class DualHeap:
    def __init__(self, k: int):
        self.small = []
        self.large = []
        self.delayed = collections.Counter()
        self.k = k
        self.smallSize = 0
        self.largeSize = 0

    def prune(self, heap):
        while heap:
            num = heap[0]
            if heap is self.small:
                num = -num
            if num in self.delayed:
                self.delayed[num] -= 1
                if self.delayed[num] == 0:
                    del self.delayed[num]
                heapq.heappop(heap)
            else:
                break

    def balance(self):
        if self.smallSize > self.largeSize + 1:
            heapq.heappush(self.large, -self.small[0])
            heapq.heappop(self.small)
            self.smallSize -= 1
            self.largeSize += 1
            self.prune(self.small)
        elif self.smallSize < self.largeSize:
            heapq.heappush(self.small, -self.large[0])
            heapq.heappop(self.large)
            self.smallSize += 1
            self.largeSize -= 1
            self.prune(self.large)

    def insert(self, num):
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.smallSize += 1
        else:
            heapq.heappush(self.large, num)
            self.largeSize += 1
        self.balance()

    def erase(self, num):
        self.delayed[num] += 1
        if num <= -self.small[0]:
            self.smallSize -= 1
            if num == -self.small[0]:
                self.prune(self.small)
        else:
            self.largeSize -= 1
            if num == self.large[0]:
                self.prune(self.large)
        self.balance()

    def getMedian(self):
        if self.k % 2 == 1:
            return float(-self.small[0])
        return (-self.small[0] + self_large[0]) / 2
```

Hmm, balance() itself also prunes large after popping from it? No — balance prunes the heap it popped from only in the second branch; in the first branch it prunes small (popped from small). Wait: in branch smallSize > largeSize+1, it pushes -small[0] to large, pops small, then prune(small). But what if large's new top (the pushed -small[0]) is valid anyway — it is valid, since it was a valid top... Actually is small[0] guaranteed valid at the time of move? Yes if the invariant "tops are always valid or pruned at deletion time" holds... There's a subtle issue: the value moved from small to large — but the delayed dict may contain that value with pending deletion of a different copy. The moved element itself is valid (the count tracked via delayed accounts for it). Fine.

Invariant: tops of both heaps are always valid. Deletion: if num equals top of small and is being deleted, prune small removes all invalid tops. If num is smaller than top of small (deep inside), top valid, fine. Insert pushes valid values; balance moves tops (valid by invariant) — but after moving top of small into large, small's new top might be invalid (delayed entries deeper). That's why prune(small) is called after popping from small. Similarly in the other branch, prune(small)? Branch 2: pushes -large[0] to small... wait pushes -large[0] which is valid, pops large, prune(large)? In branch 2 prune is on large — yes the code prunes the heap popped from. But what about small's top after receiving a pushed element — pushing increases, top only becomes the valid pushed value or stays valid. OK.

But there's another subtlety: in erase, when num <= -small[0] is false, check num == large[0]: large[0] valid by invariant, so comparing works.

Also branch conditions in erase using `num <= -self.small[0]` — small's top valid, fine.

getMedian reads tops of both heaps — both valid by invariant. Good. Also balance() branch 2 pops from large, prune(large). Branch 1 pops from small, prune(small). Wait branch 1 moves from small to large: after heappop(self.small), need prune(small). Code prunes self.small. Good. Branch 2: pops large, prune(large). Good.

One more: after erase's prune and balance, tops valid. Initial window: insert nums[0..k-1] then median. Then for i in range(k, n): insert nums[i], erase nums[i-k], record median. Standard order: insert then erase, fine either way.

Also delayed dict with float keys — floats hashable, fine. Use collections.Counter or plain dict.

Edge: k == n? Then loop over range(k, n) is empty — return one median. Fine. k==1: return floats directly — but also the general path works with k even? k=1 odd, median = -small[0]. General path handles k=1 fine actually, but I'll keep the fast path or just keep general. Keep general for simplicity; but general for k=1 does insert/erase with getMedian — fine. Actually I removed DualHeap class; I'll write it with closures or a class. Let me just write a class-free version inside the function with helper closures, or a small class. Either fine.

Performance: n=200k, k=1000 → 200k inserts + 200k erases, each O(log k). Fine.

Also validate: if k < 1 or k > len(nums): raise ValueError.

For even k: (-small[0] + large[0])/2 → float. For odd: float(-small[0]).

Prune using `num in self.delayed` — careful: value 0? delayed only stores positive counts so deleting zero-key handled by `if not c: del`. Using dict get.

Write final code:

```python
from __future__ import annotations
import heapq


class _DualHeap:
    __slots__ = ("small", "large", "delayed", "k", "small_size", "large_size")

    def __init__(self, k: int) -> None:
        self.small: list[float] = []   # max-heap (negated values)
        self.large: list[float] = []   # min-heap
        self.delayed: dict[float, int] = {}
        self.k = k
        self.small_size = 0
        self.large_size = 0

    def _prune(self, heap: list[float]) -> None:
        while heap:
            num = -heap[0] if heap is self.small else heap[0]
            c = self.delayed.get(num)
            if c:
                self.delayed[num] = c - 1
                if not self.delayed[num]:
                    del self.delayed[num]
                heapq.heappop(heap)
            else:
                break

    def _balance(self) -> None:
        if self.small_size > self.large_size + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
            ...
```

Careful: heappop then push — the top must be captured before pop: `top = -self.small[0]` then push then pop? Order doesn't matter; do:

```python
        if self.small_size > self.large_size + 1:
            val = -self.small[0]
            heapq.heappop(self.small)
            heapq.heappush(self.large, val)
            self.small_size -= 1
            self.large_size += 1
            self._prune(self.small)
        elif self.small_size < self.large_size:
            val = self.large[0]
            heapq.heappop(self.large)
            heapq.heappush(self.small, -val)
            self.small_size += 1
            self.large_size -= 1
            self._prune(self.large)
```

Wait: in branch 1, after popping small's top, the new top of small could be invalid — need prune before reading small[0]? No, we read val before pop. But the prune after pop removes invalid now-top. But could invalid entries be deeper and later surfaced through pushes? Pushes go to large or small tops region... The invariant holds in the official solution; fine.

But branch 1: after moving, large gets valid val pushed — but large might have invalid deeper entries; large top remains valid (new top = min(val, old valid top)). Fine.

Hmm, in branch 1, prune happens after popping small — but between pop and push of large? Order fine.

insert / erase as above.

median(self) -> float.

Main function:

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(f"k must satisfy 1 <= k <= {n}, got {k}")
    dh = _DualHeap(k)
    for i in range(k):
        dh.insert(nums[i])
    out = [dh.median()]
    for i in range(k, n):
        dh.insert(nums[i])
        dh.erase(nums[i - k])
        out.append(dh.median())
    return out
```

median needs to be careful that when k odd, large may be empty? With sizes balanced (small_size == large_size+1 or equal to... window has k elements; k odd → small_size = large_size+1; k even → equal). Delayed deletions mean actual heap sizes differ but at least one valid element exists on the side we read. small always non-empty? For k odd read -small[0]; small_size >= 1 guaranteed... but small heap could contain only invalid entries while small_size counts valid? small_size counts valid elements conceptually present. delayed counts pending deletions. small_size = number of valid elements assigned to small. Since window valid count small_size >= ceil(k/2) >= 1, and delayed entries with value at top get pruned... Hmm subtle: valid elements tracked by counters may be scattered in both heaps physically? In this scheme, each valid element is physically exactly in one heap and counters match physical minus delayed-pending... The invariant: heap top is always valid, so reading -small[0] gives a valid element, and small_size ensures small contains at least small_size - (delayed entries in small?) Hmm. Actually small_size decrements on erase by 1 each time and prune keeps delayed entries consistent... The official solution is proven correct; I'll trust it. Reading median when small might be physically empty but small_size>0? Can that happen? Physical elements in small = small_size + (number of delayed entries physically in small). Delayed entries physically in small are ≥0, so physical size ≥ small_size, since each delayed entry corresponds to a physical element that was in small... wait, could balance move a delayed entry's physical counterpart? Balance moves only tops, which are always valid, never delayed entries. Prune removes delayed entries physically. So delayed entries count: delayed[x]=c means c physical copies of x somewhere, each counted... Each physical heap element is either valid or corresponds to one unit of delayed count. small_size = physical_valid_count_small. Since physical size = valid + delayed_small ≥ small_size + ... hmm, delayed_small counts elements deleted-but-still-in-small. So physical size of small ≥ small_size ≥ 1 when reading. Good.

Actually careful: delayed[x] could span... a delayed entry for x recorded in small, but could a valid copy of x also exist? Yes, unrelated — erase decides which heap to attribute based on comparison with top; correctness of attribution: `num <= -small[0]` decides heap membership, matching insert logic. With duplicates this is consistent for counting purposes.

One more correctness point: erase checks `if num == -self.small[0]: self._prune(self.small)` — only prunes if the deleted value is at top. Deeper invalid values remain until surfaced. Fine.

Return floats: for odd k, float(-small[0]); even k, (-small[0] + large[0])/2 is Python float division → float. Good.

Also handle k == 0 etc.: ValueError covers k<1, k>n includes empty nums with k>=1.

I think the answer is done. Write clean code, single class + function.