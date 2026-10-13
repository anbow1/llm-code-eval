Efficient sliding median using two heaps with lazy deletion, or sorted containers via bisect with insertion/removal (k=1000, n=200000 → 200k windows, each insert/remove O(k) with bisect → 200k * 2*1000/2 ≈ 2e8 operations... bisect.insort is O(k) memmove which is fast in C. Actually insort into a list of 1000 elements: bisect is O(log k) plus list insert O(k) but memmove of 1000 elements is very fast (~microseconds). 200,000 windows × (insert + delete) ≈ 200k × ~2µs ≈ 0.4s. That's fine.

But heap-based two-heap approach is safer. Let me implement the classic balanced two-heap with lazy deletion (delayed invalidation using hash counters). That's O(n log k).

Standard implementation: maintain low (max-heap, negated) and high (min-heap), balance so len(low) == len(high) or len(low) == len(high)+1. Lazy deletion with a dict `to_delete` and prune loops.

Let me write it carefully.

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")
    if k == 1:
        return [float(x) for x in nums]

    low = []  # max-heap via negation
    high = []  # min-heap
    delayed = {}  # value -> count to be removed
    low_size = 0
    high_size = 0

    def prune(heap):
        while heap:
            v = -heap[0] if heap is low else heap[0]
            c = delayed.get(v, 0)
            if c:
                delayed[v] = c - 1
                if not delayed[v]:
                    del delayed[v]
                heapq.heappop(heap)
            else:
                break
```

Wait, prune needs to know which heap and sign. Simpler: prune with sign parameter.

```python
    def prune(heap, sign):
        while heap:
            v = heap[0] * sign
            c = delayed.get(v, 0)
            if c:
                heapq.heappop(heap)
                if c == 1:
                    del delayed[v]
                else:
                    delayed[v] = c - 1
            else:
                return
```

For low heap sign = -1 (elements stored negated), high sign = 1.

Balance function: after adding/removing, rebalance.

```python
    def rebalance():
        if low_size > high_size + 1:
            heapq.heappush(high, -heapq.heappop(low))
            low_size -= 1
            high_size += 1
        elif high_size > low_size:
            heapq.heappush(low, -heapq.heappop(high))
            low_size += 1
            high_size -= 1
```

But wait: when popping from low, the top of low might be a delayed element. Need to prune before popping. Standard approach: prune before rebalance operations and before accessing top. Actually the delayed elements only affect heap tops. When we heappop from low during rebalance, if the top is delayed, that's wrong — we'd remove a valid element logically? Actually the delayed dict marks values that are logically removed but still in the heap. If we pop the top of low and it's a delayed value, we should... Hmm.

Standard approach (from LeetCode 480 solutions): when adding, push to one heap; when rebalancing, pop from one heap top and push to other — but only after pruning so the top is valid. Actually in the standard solution, rebalance pops the top; if top is a stale element, popping it moves a stale value into the other heap, which is still tracked by delayed dict, so it's fine logically — the stale value remains counted as delayed but now lives in the other heap. That still works because delayed is keyed by value, not heap. The sizes tracked are logical sizes. When we prune, we prune each heap's top. But a stale value deep in the heap only surfaces at top eventually. So correctness holds: total stale count in delayed equals stale elements across both heaps. Logical sizes: low_size counts valid elements in low. When rebalancing pop from low: if it's stale, we moved a stale element to high — sizes: low_size -=1? No! We shouldn't decrement low_size if we popped a stale element.

Hmm, standard implementation handles this: in LeetCode 480 typical solution, they prune heap tops before rebalance so the popped top is guaranteed valid. Let me prune both heaps before rebalance. Pruning tops: while top is delayed, pop and decrement. But a stale value might not be at top yet; that's fine.

Actually careful: prune pops only while top is stale. If we prune both heaps before each rebalance, then top popped in rebalance is valid. Good.

Add element:
```python
    def add(x):
        if low and -low[0] >= x:  # need prune first? low top may be stale
            ...
```

Hmm, need pruning before comparing top. Prune both, then compare. Pruning cost amortized fine.

Actually simpler robust approach: use bisect insort on a sorted window list.

```python
from bisect import insort, bisect_left

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n: raise ValueError
    window = sorted(nums[:k])
    res = []
    mid = k // 2
    if k % 2:
        res.append(float(window[mid]))
    else:
        res.append((window[mid-1] + window[mid]) / 2)
    for i in range(k, n):
        out = nums[i-k]
        insort(window, nums[i])
        del window[bisect_left(window, out)]
        ...
```

Order: remove outgoing first then insert, or insert then remove — both fine. Performance: each iteration: insort (C-level: bisect O(log k) + memmove O(k) of Python object pointers — 1000 pointers = 8KB memmove, very fast, ~ sub-microsecond), bisect_left O(log k), del O(k) memmove. So ~2-3 µs per window → 200k × 3µs = 0.6s. Plus median extraction O(1). Total well under 2s. Actually Python-level loop 200k iterations with a few function calls each — maybe 0.5-1s. Fine.

But heap approach would be faster asymptotically. The bisect approach is simpler and reliably fast enough. However, "well under 2 seconds" — bisect with k=1000: list.insert of ~1000 elements is one memmove of 8000 bytes, ~200ns. So per window maybe 1-2µs total → ~0.4s. Good.

Edge: median computation inline to avoid function call overhead. Let me also handle removing: use pop with index from bisect_left.

Let me write:

```python
from bisect import bisect_left, insort

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if not isinstance(k, int) or ... 
```

k could be passed as int; just check k < 1 or k > n.

```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    window = sorted(nums[:k])
    half = k // 2
    odd = k & 1
    result = []
    append = result.append
    if odd:
        append(float(window[half]))
    else:
        append((window[half - 1] + window[half]) / 2.0)
    for i in range(k, n):
        x = nums[i]
        out = nums[i - k]
        if x != out:
            # remove out
            idx = bisect_left(window, out)
            window.pop(idx)
            insort(window, x)
            if odd:
                append(float(window[half]))
            else:
                append((window[half - 1] + window[half]) / 2.0)
        else:
            append(result[-1])  # window unchanged
    return result
```

The x == out optimization helps when k==1 mostly. Fine.

Note floats: median of odd window is float(window[mid]) — element could already be float. For even, sum/2 is float. Return floats guaranteed.

One subtlety: removing before inserting when x != out — median changes correctly either way. If out is removed first, window temporarily has k-1, indices shift, then insert. Computing median after insert is correct.

Alternative: insert then remove — also correct. Keep as is.

Also handle k=1: window[half] with half=0 fine.

I think bisect approach is good and simple. But to be extra safe on performance, could use the two-heap. Let me estimate bisect more carefully: 200k iterations, each with bisect_left (~100ns+log), pop (memmove ~1000 pointers = fast), insort (memmove). Python interpreter overhead per iteration ~ maybe 1-2 µs total. 200k × 2µs = 0.4s. Well under 2s. 

Also for very large k (e.g., k=100_000), insort memmove of 100k pointers = 800KB, ~50µs, n-k+1 = 100001 windows → 5s. But the requirement only specifies n=200k, k=1000. Fine.

Actually, let me implement the heap approach to be robust for all k? It's O(n log n) with heap, ~200k × log operations with heapify overhead... two-heap lazy deletion has high constant factors in Python (~several µs per element). For n=200k that's maybe 1-2s. Hmm, actually lazy deletion heaps can be slower in Python than bisect. Bisect is C-level for the heavy ops. I'll go with bisect.

One more consideration: nums might contain ints? Type hint says list[float], but if ints passed, results still floats via float() and /2. Good.

Also handle k == n: loop doesn't run; fine.

Finalize code.