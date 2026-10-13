Efficient sliding median using two heaps with lazy deletion, or sorted containers via bisect. Using bisect.insort with deletion via index removal: each window insert O(log k) find + O(k) remove/insert — removing from a list is O(k), k=1000, n=200000 → 200M element shifts... that's actually list removal shifts memory via memmove, which is fast in C. 200,000 windows × ~1000 shifts = 2×10^8 memmove bytes-ish; memmove is very fast (~GB/s), 200k × 1000 × 8 bytes = 1.6 GB... could be ~1-2 seconds. Hmm risky. Better: use two heaps with lazy deletion — classic approach, O(n log n).

Let me implement the two-heap solution:

- lo: max-heap (store negatives), hi: min-heap.
- For each new element: add to appropriate heap, rebalance sizes.
- Remove outgoing element lazily: mark in a delayed dict; prune tops when invalid.

Standard "sliding window median" solution from LeetCode 480.

Implementation details:

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    lo = []  # max-heap via negatives
    hi = []  # min-heap
    delayed = defaultdict(int)
    lo_size = 0
    hi_size = 0  # effective sizes excluding delayed

    def prune(heap):  # pop invalid tops
        while heap:
            num = -heap[0] if heap is lo else heap[0]
            if delayed[num]:
                delayed[num] -= 1
                if not delayed[num]:
                    del delayed[num]
                heapq.heappop(heap)
            else:
                break
```

Need to distinguish heap type. Write two prune functions or pass sign.

Balance: keep lo_size == hi_size or lo_size == hi_size + 1 (when k odd, median at lo top; when k even, median = (lo top + hi top)/2).

Actually sizes: total effective = k. lo_size + hi_size = k. Keep lo_size = hi_size + 1 if k odd else lo_size == hi_size.

Insert element x:
- if lo empty or x <= -lo[0]: push to lo, lo_size += 1
- else push hi, hi_size += 1
- rebalance:
  - if lo_size > hi_size + 1: move top of lo to hi (after pruning lo), lo_size -=1, hi_size +=1
  - elif hi_size > lo_size: move hi top to lo, etc.

Wait — but when moving, must ensure moved element isn't delayed? Actually moving a delayed element between heaps breaks lazy deletion accounting. Standard solution handles this by only pruning before moving the top, and the effective size accounting with delayed dict keyed by value... Actually the classic approach: when moving an element, the delayed marks belong to a value, and the same value may exist in both heaps. The typical LeetCode solution uses a `balanced` flag approach with delayed dict and it works because delayed elements are eventually pruned and counts work out. Let me recall the standard solution carefully.

Standard approach (LeetCode 480 editorial):

```python
class DualHeap:
    def __init__(self, k):
        self.small = []  # max heap
        self.large = []  # min heap
        self.delayed = Counter()
        self.k = k
        self.smallSize = 0
        self.largeSize = 0

    def prune(self, heap):
        while heap:
            num = heap[0] if heap is self.large else -heap[0]
            if num in self.delayed:
                self.delayed[num] -= 1
                if self.delayed[num] == 0:
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

    def insert(self, num):
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.smallSize += 1
        else:
            heapq.heappush(self.large, num)
            self.largeSize += 1
        self.makeBalance()

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
        self.makeBalance()
```

This is correct. Median: if k odd: -small[0]; else (-small[0] + large[0]) / 2.

Then sliding_median: validate, insert first k, compute, then for each window slide: insert nums[i+k], erase nums[i], compute median.

Edge: floats, fine. Return list of floats.

Write it as nested functions inside sliding_median.