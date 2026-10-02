Use two heaps with lazy deletion, or a sorted list with bisect and insort O(k) per window — n=200k, k=1000 → 200k * 1000 ops insert = 2e8... bisect insort into a list of size 1000 costs ~1000 element moves per insert (memmove, fast in C). Two inserts + two removes per window, each O(k) memmove — that's 200k * ~4000 byte moves ≈ fine actually, memmove is very fast. 200k windows × 4 operations × 1000 elements × 8 bytes = 6.4 GB moved... memmove ~10GB/s → ~0.6s. Hmm, borderline but probably okay. Safer: use two-heaps (lazy deletion) with O(log k) per op. But heapq lazy deletion is more code but reliable.

Actually, a cleaner standard-library approach: maintain a sorted list via `bisect.insort` — this is typically accepted for such problems. But let me implement the two-heaps approach for guaranteed performance.

Two heaps: small (max-heap via negation) holds lower half, large (min-heap) holds upper half. Balance so len(small) == len(large) or len(small) == len(large)+1. Lazy deletion: use a dict of "to-delete" counts... Actually a simpler approach for sliding window: since we add and remove exactly one element per step, use delayed dict.

Standard solution:

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    small = []  # negated
    large = []
    delayed = defaultdict(int)
    # counts of valid elements in each heap
    small_size = 0  # logical
    large_size = 0
    ...
```

Standard "heap-based sliding window median" (LeetCode 480). Let me write it.

Balance invariant: small_size == large_size or small_size == large_size + 1.

Operations:
- prune(heap): remove top elements that are marked deleted (using delayed dict keyed by value).
- rebalance: adjust sizes.

For even k, median = (small top + large top)/2 (with small storing negatives).

Implementation:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    small = []  # max-heap (store negatives)
    large = []  # min-heap
    delayed = defaultdict(int)
    small_size = 0
    large_size = 0

    def prune(heap):
        while heap:
            num = -heap[0] if heap is small else heap[0]
            if delayed[num]:
                heapq.heapreplace(heap, heapq.heappop(heap) ... 
```

Careful: delayed[num] counts pending deletions of value num. Prune:

```python
    def prune(heap, sign):
        while heap and delayed[sign * heap[0]]:
            delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)
```

Where sign = -1 for small, +1 for large.

```python
    def balance():
        # invariant: small_size == large_size or small_size == large_size + 1
        if small_size > large_size + 1:
            # move max of small to large
            prune(small, -1)
            val = -heapq.heappop(small)
            heapq.heappush(large, val)
            small_size -= 1
            large_size += 1
        elif small_size < large_size:
            prune(large, 1)
            val = heapq.heappop(large)
            heapq.heappush(small, -val)
            large_size -= 1
            small_size += 1
```

Add num:

```python
    def add(num):
        nonlocal small_size, large_size
        if small and -small[0] >= num:
            heapq.heappush(small, -num)
            small_size += 1
        elif large and large[0] <= num:
            heapq.heappush(large, num)
            large_size += 1
        else:
            # num between heaps; push to whichever fits... need care
```

Actually simpler: decide by comparing with small's max; if small empty or num <= max(small), push small else push large. If small empty and large nonempty, num <= large[0]? Not necessarily. Standard approach: 

```python
    def add(num):
        nonlocal small_size, large_size
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
            small_size += 1
        else:
            heapq.heappush(large, num)
            large_size += 1
        balance()
```

Wait but pruning must happen first so tops are valid. With lazy deletion, tops could be stale. So prune both before deciding. In classic solutions, they prune before push decisions. Let's prune small and large at start of add.

Remove(num) (lazy):

```python
    def remove(num):
        nonlocal small_size, large_size
        delayed[num] += 1
        if num <= -small[0]:  # careful, top might be stale... but comparison with stale max still works? 
```

Hmm, the standard solution compares num to small's top even if top is stale — that can misroute the removal counter. The classic LC480 solution:

```python
def remove(num):
    balance_needed...
    delayed[num] += 1
    if num <= -small[0]:
        small_size -= 1
        if num == -small[0]:
            prune(small)
    else:
        large_size -= 1
        if num == large[0]:
            prune(large)
    balance()
```

Comparing a removed element to a possibly-stale top: if small's top is stale but marked deleted... actually stale tops get pruned before comparisons in this scheme since prune happens when top matches. If delayed value num coincides with heap's real values... The classic solution by lc users is known-correct: it prunes at the point of removal when the removed element is at the top, and balance() prunes when moving. Comparison `num <= -small[0]` with stale top: the stale top is a value that's logically deleted but physically present; it was <= any valid element in small? No — stale top of small is the negated top, which is >= all logical small elements... hmm, a stale element at top of small was once in small and all valid small elements ≤ ... Since it was the max, every currently valid element in small is ≤ it? Not exactly — after deletions the valid max could be less, so stale top ≥ valid max, comparison still routes correctly-ish: if num ≤ staleTop but num larger than valid max, we'd route to small incorrectly... but num was in the window, so it was either in small or large logically. Hmm.

To avoid subtle bugs, prune both heaps before each add/remove decision. Prune makes tops valid. Then comparisons are correct. Prune cost amortized fine.

Let me write:

```python
def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    small = []   # max-heap via negation
    large = []   # min-heap
    delayed = defaultdict(int)

    def prune(heap, sign):
        while heap:
            v = sign * heap[0]
            cnt = delayed[v]
            if cnt:
                delayed[v] = cnt - 1
                heapq.heappop(heap)
            else:
                break

    # sizes tracked logically
    sizes = [0, 0]  # small, large — or use nonlocal ints

    def add(num):
        prune(small, -1)
        prune(large, 1)
        if not small or num <= -small[0]:
            heapq.heappush(small, -num)
            small_size += 1
        else:
            heapq.heappush(large, num)
            large_size += 1
        rebalance()

    def remove(num):
        prune(small, -1)
        prune(large, 1)
        if num <= -small[0]:
            small_size -= 1
            delayed[num] += 1
            prune(small, -1)
        else:
            large_size -= 1
            delayed[num] += 1
            prune(large, 1)
        rebalance()
```

Wait, remove: if num is at small top, we can just pop instead of marking. But marking with delayed then pruning small works: increment delayed[num], then prune(small) — if num at top, it pops it (decrementing delayed). If not at top, delayed[num] stays, and prune stops. Good.

But note: after small_size -= 1 and possibly pruning removes the physical element, rebalance needs pruned tops. Let rebalance prune as needed.

rebalance:

```python
    def rebalance():
        prune(small, -1)
        prune(large, 1)
        if small_size > large_size + 1:
            val = -heapq.heappop(small)
            heapq.heappush(large, val)
            small_size -= 1
            large_size += 1
        elif small_size < large_size:
            val = heapq.heappop(large)
            heapq.heappush(small, -val)
            large_size -= 1
            small_size += 1
        prune both again? Top moved element is valid, so fine.
```

But careful: rebalance popping from small assumes top valid — we pruned first. Good.

Hmm, one subtlety: `delayed` counts must match physically-present-but-deleted elements. When rebalance moves a valid element, fine. When remove marks delayed[num] and prune pops it, count decremented. But what if num appears in both heaps as valid elements? delayed[num] marks one instance; prune pops whichever instance is at top of the heap we prune. Since we only prune small when removing from small side, and the instance belonging to small... duplicates across heaps: e.g., value 5 in small (valid) and 5 in large (valid), we remove 5 from large side: delayed[5]=1, prune(large) pops... wait no — if 5 is in large, then large[0] could be 5; prune(large) checks delayed[5]>0 → pops large's 5, delayed[5]=0. Correct.

But danger: value 5 valid in small; a stale 5 sits deeper in large; we remove 5 (large instance). delayed[5]+=1, prune(large): large[0] happens to be... top of large is 5 which is the valid one in large? Hmm, scenario: valid 5 in small, stale 5 inside large (below valid elements). Remove(5): logically 5 was in large per our size tracking? Our tracking: we decide which heap "owns" the removed element by comparison — if num <= valid max(small), it belongs to small (sizes), else large. But with duplicates, there may be a 5 in both and the one logically in small... The counting works because we only track sizes of logical elements, and we decrement small_size when num <= max(small). The physical pop from prune(small) may pop an instance equal to num in small — fine. If delayed[num] remains >0 but num's instance in small is deeper, prune stops at top... then a stale element remains in heap, counted in delayed. Later when it surfaces, prune removes it. But wait: if we marked delayed[num] += 1 for a small-side removal and the small instance of num isn't at top, prune doesn't pop, delayed[num] stays. Then prune(large) later might incorrectly pop a *valid* large instance of num because delayed[num]>0! That's the classic correctness concern.

Is that scenario possible? If num <= max(small) (so logically small's), and num has an instance in large too... duplicates allowed. Instance in large: large contains elements >= some; an instance of num in large with num <= max(small)... possible: nums = [5, 5], k=2: add first 5 → small. add second 5: prune, num(5) <= -small[0](5) → push small. small_size=2 > large_size+1 → rebalance moves 5 to large. Now small has [5neg], large has [5], each valid. Remove 5 (window slides): 5 <= max(small)=5 → small_size -=1, delayed[5]=1, prune(small): small top is 5(negated) → delayed[5] is 1 > 0 → pop, delayed[5]=0. 

When could prune(small) fail to pop a matching top while delayed[num]>0 and num also valid in large? prune(small) pops while top value has delayed count. If small top is num and delayed[num]=1, it pops and decrements — correct because we intended to delete one instance of num from small. If small top is not num (top > num since max-heap and num ≤ top... top could be > num), prune stops. Then delayed[num]=1 but num still physically in small (deeper) and also physically in large as valid. Later prune(large): top of large is min; num in large — if num <= large's other elements... could large[0]==num? num went into large means num > max(small) at insertion time... but sizes changed. Hmm, suppose num in large is minimum of large. delayed[num]=1 pending from a small-side deletion. prune(large) would pop large's num instance thinking it's the stale one. Then large loses a valid element while delayed still counts 1 → sizes drift → wrong medians.

Can this state occur? For delayed[num]=1 from small-side removal, the small instance of num must be non-top, i.e., there's an element ≥ num in small above it. And num is valid in large with num == large[0]. But num ≤ small_max always (since num ≤ -small[0]... wait small_max ≥ num because we routed deletion there when num ≤ small_max). If num ≤ small_max and num ∈ large as an element: when num was inserted into large, at that time num > small_max. Then small_max decreased? Possible via deletions. Hmm, this is getting deep.

The classic LeetCode 480 solutions with this exact lazy-deletion pattern are widely accepted as correct. The invariant that saves us: when both heaps contain duplicate values and delayed counts — the standard solution handles removal like:

```python
def remove(num):
    if num <= -small[0]:
        heapq.heappush(small, num)?? 
```

There are variants. Another common robust variant: instead of comparing num to heap top for routing deletion, compare against *valid* median structure — the routing by value comparison works because both heaps partition by value: all small elements ≤ all large elements (logically). Physically, stale elements can violate this! A stale element in large could be smaller than a valid small element. But delayed marks exact values.

Key correctness argument for the standard scheme ("Delayed deletion" from LeetCode official solution / "480. Sliding Window Median" official): It maintains delayed dict and two heap sizes (as logical counts). The official solution prunes inside rebalance and before accessing tops. Their removal:

```python
def makeBalance():
    if size1 > size2 + 1:
        heapq.heappush(heap2, -heapq.heappop(heap1))
        ...
```

Hmm. Actually the LeetCode official solution (English version) for 480 uses a different technique with two multisets... Python official uses heapq with delayed. Let me recall it:

```python
class DualHeap:
    def __init__(self, k):
        self.small = []
        self.large = []
        self.delayed = collections.Counter()
        self.smallSize = 0
        self.largeSize = 0
        self.k = k

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
            heapq.heappush(self.large, -heapq.heappop(self.small))
            self.smallSize -= 1
            self.largeSize += 1
            self.prune(self.small)
        elif self.smallSize < self.largeSize:
            heapq.heappush(self.small, -heapq.heappop(self.large))
            ...
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
        if num <= -self.small[0]:
            self.smallSize -= 1
            self.delayed[num] += 1
            self.prune(self.small)
        else:
            self.largeSize -= 1
            self.delayed[num] += 1
            self.prune(self.large)
        self.balance()
    
    def getMedian(self):
        if self.k % 2:
            return float(-self.small[0])
        else:
            return (-self.small[0] + self.large[0]) / 2
```

Important: in official solution, balance() prunes the source heap after popping (the popped top might have been stale — no wait, they pop then push to other heap then prune the source). Hmm, they pop from small top (possibly stale element) and push it to large?! That would move a stale element into the other heap — but delayed[num] marks it, so prune in the destination will drop it later. Actually they prune small after popping — because the moved element was top, and after moving, new top may be stale. They prune the source (small) after moving. The moved stale element in large: delayed[num] >0 so prune(large) will drop it when it surfaces. OK.

Also note balance does not prune before popping: it pops small's top — could be stale — but stale elements have delayed counts, and moving them to the other heap keeps delayed valid (delayed keyed by value, not heap). And prune of the source afterwards clears newly-exposed stale tops. Correct: delayed counts are global, so a stale element moved between heaps is still marked. 

The getMedian accesses heap tops without pruning! In official code, is that safe? Hmm, they call prune in erase and balance. After erase: erase prunes the relevant heap and balances (which prunes if a transfer happened). But if small is empty of valid elements... For k even, median uses small[0] and large[0] — could small's top be stale at query time? erase prunes small only if removal routed to small. If removal routed to large and no balance transfer, small top untouched — but it was valid before (not marked delayed), so still valid. Elements only become stale when erased; erase either prunes immediately or the marked element sits in the heap it logically belongs to... wait, delayed marks value not position. If erase(num) routes to small (num ≤ small top) and prune(small) doesn't pop num (not top), then num instance remains in small physically, and delayed[num]=1. num could also exist in large physically-valid? As analyzed... in official solution this pattern is considered correct and passed all tests. I'll trust it but let me reason once more about the dangerous case: delayed[num]=1 with num physically present as a valid element somewhere.

Claim: whenever delayed[v] > 0, all physically-present instances of v in both heaps are covered: total physical instances of v = logical instances (delayed doesn't distinguish) ... Let me define: delayed[v] = (physical count in heaps) − (logical count in window) for value v? Not exactly — it's a counter of pending deletions. If delayed[v] = c and v physically appears p times, logically v appeared l times before deletions... Hmm.

Let me think with the invariant: delayed[v] equals number of "pending deletions" of v. Prune pops one instance per pending count when instance at top. Since all instances of v are equal, popping any instance of v when delayed[v]>0 is consistent — it doesn't matter which physical instance is removed, as long as we don't remove one that is logically present!

The dangerous case: delayed[v]=1 while v is still logically in the window. Then prune could pop the wrong (valid) instance. When erase routes num to small: logical small_size decrement of one instance of num. If num still logically in window (another instance in window, in large say), then delayed[num]=1, and physically: small must contain ≥1 instance of num? Does it? Routing says num ≤ small top (valid top after previous pruning? top might be stale!). Hmm.

Rather than proving, note the official solution is battle-tested and correct. Known correct variants maintain invariant: every heap top, when accessed, is valid (pruned). And delayed[v] > 0 implies: no valid instance of v is exposed at top of the heap it belongs to... The invariant in the official solution: after each operation (insert/erase/balance), all tops are valid (pruned). If delayed[v] > 0 after an operation, then... hmm, prune(small) pops while top has delayed count — it pops even if that top instance is valid but marked? No: it pops while delayed[num of top] > 0. If v logically in window and an instance physically at top of small with delayed[v]=1, prune pops it — wrong!

So correctness requires: delayed[v] > 0 ⟹ v's physical instances remaining are only "beyond" the ones logically present... i.e., physical count of v in the heaps equals logical count + delayed[v]? Let's check: invariant I: physical(v) = logical(v) + delayed[v]. Initially 0=0. Insert num: physical +1, logical +1, delayed unchanged → preserved (modulo balance moves which preserve both). Erase num routed small: logical −1 (small_size), delayed +1 → physical stays, logical+delayed stays. Then prune(small): if top==num, pops: physical −1, delayed −1 → preserved. If top != num: physical unchanged, delayed unchanged. So invariant I preserved! Now the question: does prune mistakenly pop a valid instance? Prune pops top instance with delayed>0. Under invariant I, physical = logical + delayed ≥ delayed, so there are at least delayed[v] physical instances, and at most logical = physical − delayed are valid. So there exist physical instances of v that are "stale" (equal in value). Popping any instance of v when delayed[v]>0... is it the same as decrementing? If we pop an instance of v from the physical heap while delayed[v]: we should decrement logical or pending? The pop corresponds to consuming one stale pending deletion: physical −1, delayed −1 → logical = physical − delayed preserved ✓.

The real danger case is: delayed[v] > 0 AND logical(v) > 0 (v still in window). Then physical = logical + delayed ≥ 2 (if logical=1, delayed=1). Prune pops one instance → physical−1, delayed−1 → logical = physical − delayed: still balanced, v still logically present with physical instance(s) remaining. Fine!

But wait — is invariant I actually maintained in all branches? Erase routes to small when num ≤ −small[0] (top may be stale). Logical routing decision vs physical delayed increment — the invariant "logical count of v in small" isn't tracked per heap, only sizes. Hmm, does invariant I need per-heap accuracy? delayed[v] is global. The concern: erase routes deletion to small logically (size decrement from small), but the physical instance that prune later pops might come from large. As long as global accounting works out: physical(v) total, logical(v) total in window, delayed[v] = physical − logical. That's what matters for prune correctness (prune only needs to know how many v's are stale). Per-heap distribution doesn't matter!

So the true invariant: delayed[v] = physical_count(v) − logical_count(v) for all v. Let's verify each op maintains it:

- Insert num: physical +1 (push), logical +1. delayed unchanged ✓. But wait — routing to wrong heap doesn't break this; only sizes (small_size/large_size for balancing invariant) matter per-heap, and those are maintained logically. Hmm, but balance invariant (len small ≈ len large) needs physical sizes to match logical routing... The physical heap partition vs logical partition: if an element is pushed to small but logically "belongs" to large, partition invariant (all small ≤ all large) breaks → median wrong.

Insert num: compares to top of small. If small top is stale... After previous operations, is small top guaranteed valid? Official solution doesn't prune before insert's comparison?! Let me check official solution ordering: insert: `if not self.small or num <= -self.small[0]` — no prune before! If small[0] is stale (delayed marked), comparing num ≤ stale-top could route incorrectly. Hmm. But actually stale tops get pruned in erase and balance. Let's check erase: routes by comparing num to small top — if small top stale, comparison num ≤ staleTop might route to small a num that logically belongs to large. Then small_size -=1, large_size unchanged → sizes wrong!

Hmm wait — but erase's routing: delayed[num] += 1, prune(small) pops top if... Let me think: does a stale top of small ever exist at the time of erase/insert comparisons? Sequence: erase(num1) where num1 is small's top → prune pops it → fine. erase marks delayed and prunes: prune pops while top is marked. So after any erase, both heaps have valid tops? erase prunes only one heap (the routed one) and balance() prunes source after transfer... but if erase routed to small, prune(small) runs; large's top untouched — was large's top valid before erase? Before erase, tops were valid (inductively). Erase doesn't invalidate any element's validity except marking num delayed — large's top value's delayed count unchanged... Hmm, marking delayed[num] while num==large[0] and routing to small! If num == large[0] (valid) and num ≤ small top, erase routes to small, marks delayed[num], prunes small — small top isn't num (num ≤ small top; if equal... if small top == num, then prune pops small's num instance — but large's valid num remains with delayed=1... 

Ugh. But is that a problem? delayed[num]=1, large contains valid num at top. Later prune(large) — called in balance after a future erase routed to large — pops large's num and decrements delayed. Physical: large's valid num popped but logically it's still in window! Invariant broken? physical(v)= logical(v)+delayed(v): before popping: physical = 1 (large's), logical = 1, delayed = 1?? That violates I already. So I must show this state can't arise.

State: delayed[num]=1 while num logically in window and physically only 1 instance. How did delayed[num] become 1? An erase(num) marked it and pruning didn't pop any instance (no instance at top of the pruned heap). That means at erase time: num ≤ small_top (routed small), and prune(small) top ≠ num — meaning small_top > num, and small physically contains num somewhere deeper? If small physically contains num deeper, physical(v) ≥ ... logical count of num at that moment was 1 (we just erased one instance). Physical instances: suppose small had 2 instances (one deeper), large 1 (at top). Physical = 3? logical after erase = 2? delayed = 1 ✓ I holds. Prune(small): top is num? If small's max = num (top == num) — pop! decrements. If small's top > num (some element bigger), prune stops, delayed[num]=1 with num physically in small deeper — top of large is... large contains num? large's elements ≥ all small's valid... large physical top could be num only if no large element < num, i.e., num = large min. Fine: large[0] == num valid instance. delayed[num]=1. Is this a broken state? prune(large) would pop large's valid num when next prune(large) is called in balance. But balance is called after every insert/erase; balance prunes large only if transfer happened (pop from large). Transfer happens when small_size < large_size: after our erase routed small, small_size decreased → maybe transfer from large to small: pop large[0] (== num, valid instance!) and push to small, then prune large. The popped num moved to small — logical count unaffected by balance. Now delayed[num]=1 and num physically in small (2 instances?) hmm.

This is getting really intricate. Given the risk, maybe better to avoid per-heap delayed routing subtleties and use a simpler, provably correct approach. Options:

1. **Sorted list with bisect (insort/pop)**: O(k) per operation due to memmove but extremely fast in practice (C-level memmove). n=200k, k=1000: each window: remove outgoing via `del lst[bisect_left(...)]` and insert via insort. Each is O(k) = 1000 shifts... total shifts ≈ 200k windows × 2 ops × avg 500 elements = 2×10^8 element moves — but these are memmove of 8-byte pointers, ~1.6GB total memory traffic → well under 2s. Plus 200k×2 bisect calls (fast). This is simple and provably correct. Actually wait, `bisect.insort` and `del lst[i]` — the shifting is done in C (memmove), roughly 10-50 ns per element... 2×10^8 × ~2 ns = 0.4s. Plus loop overhead per window (~1 μs × 200k = 0.2s). Should run comfortably under 1s. 

2. Or use `sortedcontainers` — not stdlib.

Go with option 1 — simple, correct, fast enough. Even simpler: maintain sorted window, compute median via bisect. Actually even simpler and quite fast: for each window, just use `statistics.median`? No — resorting each window is O(k log k) per window → 200k × 1000 log ≈ way too slow.

Use bisect approach:

```python
import bisect

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    window = sorted(nums[:k])
    medians = []
    out_val = ...
    for i in range(k-1, n):
        # median
        m = k >> 1
        if k & 1:
            medians.append(float(window[m]))
        else:
            medians.append((window[m-1] + window[m]) / 2)
        if i + 1 < n:
            # remove nums[i-k+1], add nums[i+1]
            pos = bisect.bisect_left(window, nums[i - k + 1])
            del window[pos]
            bisect.insort(window, nums[i + 1])
    return medians
```

Median when k even: mean of two middle → returns float. When k odd: float(window[m]). Good.

Note: `k & 1` with k... k odd → m = k//2 is the middle index ✓. Even: indices m-1, m where m=k//2 ✓ (0-indexed: middle two are at k//2-1 and k//2).

Performance estimate fine. Edge: nums values may repeat; bisect_left finds an instance with equal value — value equality means removal is value-correct regardless of which instance. ✓

Also handle k == n: loop just computes one median. And removal step skipped when i+1==n. The condition `i+1 < n` handles it; also we could split loop but fine.

Micro-opt: precompute `rm = bisect.insort` locals. Use local aliases: `bl = bisect.bisect_left; ins = bisect.insort`. Also could avoid attribute lookups. Fine.

Also worth noting: nums[i-k+1] index math — when i = k-1 (first iteration computes median), removal target is nums[0] then add nums[k]. ✓

Edge: floats in nums; division produces float; float() for odd. If nums contains ints, fine.

Let me also double check raising ValueError when nums empty and k < 1: k=0 → ValueError via k<1 ✓. k > len(nums) ✓.

Write final code.