Classic two-heaps with lazy deletion approach. Or use sorted containers — but standard library only. Implement two-heaps with lazy deletion (delayed removal via hash maps).

Standard approach: maintain low (max-heap via negatives) and high (min-heap), plus dicts for pending deletions, balance counts.

Let me write it carefully.

Alternative simpler: use `sortedlist` via bisect insort into a list — that's O(n) per insert due to list shifting, n=200k, k=1000 → 200k inserts each shifting up to 1000 elements → 200M element moves, but memmove is fast in C... Actually inserting into a Python list of size 1000 is fast (memmove of ~8KB). 200k * ~1000 = 2e8 byte-ish moves via memmove — probably fine, well under 2s. Plus removal is O(k) too. Actually simplest: maintain a sorted list, remove outgoing element via bisect + del, add incoming via insort. Each op O(k) memmove, which is extremely fast. 2*(n-k) ops * k=1000 elements each = ~400M element moves of memory, memmove at GB/s... each element move is 8 bytes, so ~3.2GB moved... hmm that could be ~1 second. Risky but likely okay? "well under 2 seconds" — let's do the heap approach to be safe. Actually, bisect approach: insort is O(log n) search + O(n) shift. Shift of 1000 floats = 8KB memmove, takes ~ microseconds. 400k ops * ~1µs = 0.4s. Probably fine. But heap approach is safer and standard.

Let me write two-heap lazy deletion properly.

Implementation:

```python
import heapq
from collections import defaultdict

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    if k == 1:
        return [float(x) for x in nums]
    result = []
    low = []  # max-heap (negated)
    high = [] # min-heap
    delayed = defaultdict(int)
    low_size = 0  # valid count in low
    high_size = 0

    def prune(heap):
        # remove tops marked delayed
        while heap:
            num = -heap[0] if heap is low else heap[0]
            ...
```

Need to know which heap; pass sign. Write two prune functions or pass a flag.

```python
def prune(h, sign):
    while h and delayed[-h[0]*sign... 
```

Better: store in delayed keyed by actual value; for low heap, actual value = -heap[0].

```python
def prune(heap, is_low):
    while heap:
        v = -heap[0] if is_low else heap[0]
        c = delayed.get(v, 0)
        if c:
            delayed[v] = c - 1
            if c == 1: del delayed[v]
            heapq.heappop(heap)
        else:
            break
```

But closure with nonlocal sizes... Let me structure with a class-free approach using functions defined inside and lists mutable. delayed needs to be reset per window? No, delayed persists throughout, it's fine.

Balance logic (from LeetCode 480 solution):

- add(num): if low and num <= -low[0]: push to low, low_size++ else push to high, high_size++. Then rebalance: if low_size > high_size + 1: move top of low to high. elif high_size > low_size: move top of high to low (popping actual values).
- remove(num): if num <= -low[0]: low_size--; mark delayed[num]; prune low. else: high_size--; delayed; prune high.
  - But careful: if low is empty, num <= -low[0] fails — handle: if num <= -low[0] (when low non-empty), else high. Also edge case where num equals top of low... standard: compare with max of low.

- median(): if k odd: -low[0]. else: (-low[0] + high[0]) / 2.

Rebalance after removal too (sizes changed). Standard implementations rebalance in both add and remove.

Move top: pop from heap (after prune ensures top valid) and push into other heap.

Let me write:

```python
import heapq

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > n:
        raise ValueError("k must not exceed len(nums)")

    low: list[int] = []   # max-heap (negated values) — lower half
    high: list[float] = []  # min-heap — upper half
    delayed: dict[float, int] = {}
    low_size = 0
    high_size = 0

    def prune(heap: list, sign: int) -> None:
        while heap:
            v = -heap[0] * sign if sign == -1 else heap[0]
            # simpler: v = heap[0] * sign
            cnt = delayed.get(v, 0)
            if cnt == 0:
                return
            delayed[v] = cnt - 1  # hmm, better decrement
            ...
```

Simplify: v = heap[0] * sign where sign is 1 for high, -1 for low. Actually for low, entries are -value, so value = heap[0] * -1 = -heap[0]. For high, value = heap[0]. So v = heap[0] * sign with sign = -1 or 1.

Prune:
```python
def prune(heap, sign):
    while heap:
        v = heap[0] * sign
        c = delayed.get(v)
        if c:
            delayed[v] = c - 1
            heapq.heappop(heap)
        else:
            break
```

Remove:
```python
def remove(v):
    nonlocal low_size, high_size
    # decide which heap
    if low and v <= -low[0]:
        low_size -= 1
        delayed[v] = delayed.get(v, 0) + 1
        prune(low, -1)
    else:
        high_size -= 1
        delayed[v] = delayed.get(v, 0) + 1
        prune(high, 1)
```

Wait: prune with the delayed already incremented — but prune pops the top only if it's in delayed; if v is not the top, it's marked for later. Fine.

But subtlety: when marking v and pruning, if v ends up being top of the heap, prune removes it. Good.

Add:
```python
def add(v):
    nonlocal low_size, high_size
    if low and v < -low[0]:
        heapq.heappush(low, -v)
        low_size += 1
    else:
        heapq.heappush(high, v)
        high_size += 1
    rebalance()
```

Hmm, need prune before accessing -low[0] in add/remove? The tops might be stale. Standard: prune both heaps before reading medians, and prune before comparisons? Actually comparisons involving stale tops could misroute. The standard lazy-deletion solution (e.g., from known solutions) calls prune inside remove and before median. Stale tops: after pruning in remove, tops are always valid... not exactly — a stale element deeper in the heap becomes top later. So prune must be called whenever we access the top. Let's call prune both heaps at the start of add, remove, and median accesses. Prune only removes elements that are genuinely marked, cost amortized fine.

Actually careful: prune in add before comparing v to -low[0]: yes should prune first.

Rebalance:
```python
def rebalance():
    nonlocal low_size, high_size
    if low_size > high_size + 1:
        # move top of low to high
        prune(low, -1)
        v = -heapq.heappop(low)
        low_size -= 1
        heapq.heappush(high, v)
        high_size += 1
    elif high_size > low_size:
        prune(high, 1)
        v = heapq.heappop(high)
        high_size -= 1
        heapq.heappush(low, -v)
        low_size += 1
```

Hmm, but in rebalance, top might be stale — prune before popping. Yes I included prune.

Also in rebalance, when high_size > low_size after move, low may get stale-topped? The move push is a fresh valid element. Fine.

Invariant: low_size = count of valid in low, low has len = low_size + stale. Balance: low_size == high_size or low_size == high_size + 1.

Median:
```python
def median():
    prune(low, -1)
    prune(high, 1)
    if k & 1:
        return float(-low[0])
    return (-low[0] + high[0]) / 2
```

Main loop:
```python
for i, x in enumerate(nums):
    if i == 0:
        add(x)
    else:
        add(x)
        remove(nums[i - k])  # when window full
```

Order: standard: for each i, add nums[i]; if i >= k: remove nums[i-k]; if i >= k-1: record median. Let me do:

```python
for i in range(n):
    add(nums[i])
    if i >= k:
        remove(nums[i - k])
    if i >= k - 1:
        result.append(median())
```

Check removal correctness with float equality: values removed are exact same float objects/equal values from nums — dictionary keyed by float value works with equality; -0.0 == 0.0 issue: if nums contains both -0.0 and 0.0... delayed keyed by value; heap entries for -0.0 and 0.0: negation of -0.0 is 0.0. Edge case, extremely unlikely in tests; accept. Also NaN would break everything — assume no NaN.

One subtle bug in remove: choosing heap by comparing v to -low[0]. If low's top is stale... prune first. But if v must go to low and low is... Let's prune both before deciding. Actually the condition `if low and v <= -low[0]` — with stale top, comparison wrong. Add prune(low,-1); prune(high,1) at top of remove. But what if after removing from low via delayed marking, the element v isn't on top (it's deeper) — fine.

Another subtlety: `v <= -low[0]` routing: standard solution routes removal: if v <= max of low, remove from low, else from high. But if v is not in either heap top region... it's guaranteed present. However, if low_size == 0 and v belongs to high but comparison `low and ...` handles empty low → goes to high. Good.

Edge: when k == n, only one window — works.

Potential issue: in add, comparing `v < -low[0]` with stale top: prune first. I'll prune both at start of add too. Prune is cheap (while loop breaks immediately if top not delayed).

Hmm, one more subtlety: in remove, we decrement low_size but delayed marking might not correspond to an actual pop if v never becomes top before... it will always be pruned eventually by invariant logic? Actually the standard solution has this issue addressed: since v is in one of the heaps, and prune is called on that heap in remove; if v is not top, remains marked. Then later when it surfaces to top, prune removes it. But we already decremented low_size at mark time — consistent since delayed represents pending removals, and valid counts exclude marked elements. But wait — could an element be marked delayed while another equal-valued valid element stays in heap? delayed counts handle multiplicity correctly: if two equal values in heap and one removed, delayed[v]=1, prune pops one, delayed back to 0. Top access checks delayed and pops correctly per count. Standard and correct.

One more correctness check in prune: it pops top whenever delayed[top] > 0, decrementing. If two stale entries of same value at top consecutively, loop handles.

But careful: delayed count decremented in prune even when... fine.

Also potential issue: in remove, after marking v and pruning, sizes may become unbalanced (e.g., low_size became much smaller than high_size). Standard solutions rebalance in remove as well. Let's call rebalance() at end of remove, and also ensure the moved element is valid (prune before pop in rebalance — done).

Wait: in rebalance, after popping from low and pushing to high, top of high changed — fine.

Also rebalance condition uses low_size/high_size which track valid counts — with stale elements in heaps not counted. Popping from low: we do low_size -= 1 and pop actual heap element — but that popped element must not be stale. That's why we prune first. Good.

Now also add: after prune + route + rebalance.

Let me also double-check the median for even k when high's top is stale — prune in median handles.

Complexity: each element pushed/popped O(log n) times amortized; totally fine for 200k.

Let me also consider `nums[i-k]` for removal before median computed — order: add new, remove old, then median. At i == k-1 (first full window): add, i>=k false, median. At i == k: add nums[k], remove nums[0], median. Correct.

Write final code. Use dict.get for speed. Use local variable bindings for heapq functions for speed.

Also k==1: each window median is the element itself; the general code handles it but with extra overhead; k odd path returns -low[0]; with k=1, low holds single element? add: low empty → goes to high (since `if low and ...` false) → high_size=1 > low_size=0 → rebalance moves to low. Then median odd → -low[0]. Then remove nums[i-1]... works. No special case needed but fine to keep general.

Final code:

```python
import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1:
        raise ValueError("k must be at least 1")
    if k > n:
        raise ValueError("k must not exceed the length of nums")

    heappush = heapq.heappush
    heappop = heapq.heappop

    low: list[float] = []      # max-heap via negation (lower half)
    high: list[float] = []     # min-heap (upper half)
    delayed: dict[float, int] = {}
    low_size = 0
    high_size = 0

    def prune(heap: list[float], sign: int) -> None:
        while heap:
            v = heap[0] * sign
            c = delayed.get(v, 0)
            if c == 0:
                break
            delayed[v] = c - 1
            heappop(heap)

    def rebalance() -> None:
        nonlocal low_size, high_size
        if low_size > high_size + 1:
            prune(low, -1)
            heappush(high, -heappop(low))
            low_size -= 1
            high_size += 1
        elif high_size > low_size:
            prune(high, 1)
            heappush(low, -heappop(high))
            high_size -= 1
            low_size += 1

    def add(v: float) -> None:
        nonlocal low_size, high_size
        if low and v <= -low[0]:  # hmm need prune first?
```

Wait — in add, low's top could be stale? After every operation we prune tops in the paths used for comparisons... Let's see: after rebalance, tops are pruned before pops but pushes happen; tops of heaps: after push to high, high top might be valid new element or older. Stale tops can only occur if delayed nonempty and element surfaces. In remove we prune which guarantees after remove, top of the pruned heap is valid. But the other heap's top could be stale? Delayed entries only get created in remove, and prune of that heap happens immediately — removing top if it's the marked one, or marking deeper element. So a heap can contain stale deeper elements while its top is valid. Top valid after prune. But subsequent operations: add pushes valid elements; rebalance prunes before popping, then pops a valid element — top after pop? Could a stale element become top after that pop! E.g., low: after prune top is valid; we pop it (in rebalance); the next top could be stale. Then later comparison `v <= -low[0]` uses stale value. Hmm.

Is that actually harmful? The stale element is marked for deletion. Suppose stale top of low is value s (marked). We add v; comparing v <= s. If s is large (stale old max), v might be routed to low incorrectly... But actually routing slightly wrong elements between halves doesn't break the median? It breaks the invariant that low's max ≤ high's min? Actually even with correct routing via valid values, the halves remain sorted partitions... Hmm, if routing errs, an element larger than true max of low may enter low, making low's "max" larger than high's min — median wrong.

Safer: prune both heaps at start of add and remove. Since stale elements get removed on surfacing, prune at start of each op keeps tops valid always. Let's do that: in add: prune(low,-1); prune(high,1). In remove: same before deciding. In rebalance: prune before pop (again) — top may still be valid though, prune is no-op then.

With pruning at start of removal decision and add comparison, tops always valid at decision points... but in rebalance, after popping from low (top valid), pushing into high — fine. Then in median, prune both. Tops valid there? After rebalance's pop, the new top of source heap could be stale. Median prunes. Good. And add/remove prune at start. So all comparisons see valid tops. 

Actually do we even need comparison correctness for correctness of medians? Yes, as argued. Good.

One more: does the count-based invariant survive stale-topped states between ops? low_size/high_size only change in add/remove/rebalance explicitly — fine.

Also, `remove` needs the element actually present: guaranteed since it was added k positions ago and never removed before.

Let me also double check remove routing when low_size==0 but high has elements: `if low and ...` — low empty → route to high. If low nonempty and v > -low[0] but v actually in low (equal values not possible here since v > top strictly? v > max valid of low means v in high). Since tops valid after prune, comparison valid: v ≤ max(low) → in low; else in high (v ≥ min(high); could v be in both? no duplicates issue — if v == -low[0] it goes to low; v also in high? can't be, v exists once; but v could equal top of low while also present in high as another equal copy? nums values may repeat: duplicates are separate heap entries of equal value. If v equals low's max, routing to low removes one equal entry — correct either way since counts by value.)

Edge in remove: v ≤ -low[0] routes to low, but what if all in low... v must be in low then. Fine.

Now, remove from low: low_size -= 1, mark delayed[v], prune(low, -1) which pops top if it equals v. But if top ≠ v (v deeper), mark persists — fine.

Hmm wait, a subtle known bug: prune pops only while top is delayed; the marked v deeper stays. Later, delayed[v] might exceed number of v's remaining? No: delayed[v] increments once per actual removal of one instance; prune decrements once per popped instance. Invariant: delayed[v] ≤ count of v instances currently in heaps. Initially after mark: instances include the one being removed (still in heap) plus others. delayed[v]=1 ≤ instances. prune pops if top==v: pops one instance, delayed back to 0. Balanced. Good.

Now write final code with prune calls in add/remove.

def add(v):
    nonlocal low_size, high_size
    prune(low, -1); prune(high, 1)
    if not low or v <= -low[0]:  # low could still be... after prune low may be empty only if it was empty or all stale — but prune removes all stale tops; if low_size>0 and prune empties heap? Not possible: prune only removes delayed ones and delayed count ≤ instances, so prune removes exactly the delayed instances. If low_size>0 (valid count), heap has ≥ low_size valid entries → nonempty. But stale entries: heap len ≥ low_size + (total delayed attributed)... yes heap length ≥ low_size. So prune leaves ≥ low_size elements. If low_size == 0 but heap nonempty with stale entries, prune may empty it. Good.
        heappush(low, -v); low_size += 1
    else:
        heappush(high, v); high_size += 1
    rebalance()

Hmm wait — `if not low or v <= -low[0]`: if low empty (low_size==0), push to low always? Then low_size=1, high_size maybe big → rebalance moves from high. Fine but rebalance only moves one per call; after add one element imbalance is at most... before add, |sizes| ≤ 1; add adds 1 → ≤ 2? Rebalance fixes to ≤ diff 1 with one move? If low_size - high_size = 2, rebalance moves one → diff 1. If high bigger, moves one from high → diff 1. OK, one rebalance move suffices because prior state balanced within 1. Good.

def remove(v):
    nonlocal low_size, high_size
    prune(low, -1); prune(high, 1)
    if low and v <= -low[0]:
        low_size -= 1
        delayed[v] = delayed.get(v, 0) + 1
        prune(low, -1)
    else:
        high_size -= 1
        delayed[v] = delayed.get(v, 0) + 1
        prune(high, 1)
    rebalance()

Hmm — case: low nonempty, v <= -low[0], route to low: but what if v actually in high? Can't: v ≤ max(low) and halves partition values... with duplicates: max of low could equal min of high when sizes... e.g., low has [5], high has [5,6] (k even, duplicates). v=5: it's ambiguous; removing from low is fine — a 5 is a 5, counts work out since we track by value. Yes, fine.

But another case: v > -low[0] but high empty? Can't — element exists somewhere.

Hmm, actually wait: what about when v belongs to high but comparison says low? v ≤ max(low) — values in low are all ≤ ... hmm not necessarily: low contains the lower half; all valid low values ≤ all high values? With duplicates around boundary, equality possible. Strict inequality v > max(low) implies v not in low → in high. v ≤ max(low): v could be in high only if v == some low value boundary... if v in high and v ≤ max(low), then since min(high) ≤ v ≤ max(low) and all low ≤ all high: max(low) ≤ min(high) ⇒ max(low) = v = min(high)... wait need max(low) ≤ min(high): holds only if partition is value-sorted. Is it? With duplicates: low contains some 5s, high contains some 5s, max(low)=5, min(high)=5. v=5 in high: v ≤ 5 → routed to low: removes a 5 from low — but low has a valid 5, so removal from low by value is fine (counts consistent: one fewer 5 in low). Sizes handled by counters. Good — value-based accounting makes it robust.

Median in even case: (-low[0] + high[0]) / 2 → float. For odd: float(-low[0]).

Result list: append median each step.

Performance: 200k iterations, heap ops O(log k). Fine.

Also nonlocal usage: rebalance modifies low_size/high_size declared... all inner functions need nonlocal for the ints. delayed is dict — mutation fine.

Final polish: type hints ok.

Write it.