Classic sliding window median with two heaps or a sorted list. With k=1000, a simple "sorted list with insort + remove" approach: insort is O(k), remove is O(k) → n*k ≈ 2e8 operations... too slow in Python? 200_000 * 1000 = 2e8 element shifts in C (list insort uses bisect + insert which is memmove, fast in C). Actually bisect.insort is O(log k) search plus O(k) memmove — memmove of 1000 floats is very fast (~microseconds). Similarly removal via list.remove is O(k) but linear search... better use bisect to find index then pop. Each op ~ few microseconds. 2*2e5 = 4e5 ops * ~2µs = 0.8s. Should be fine "well under 2 seconds". But heap-based two-heap solution with lazy deletion is safer: O(n log n) with heap ops.

Two-heaps with lazy deletion is more code. Alternative: use a single sorted list approach — simpler and reliable.

Let me implement with bisect:

```python
import bisect

def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    window = sorted(nums[:k])
    res = []
    def med():
        m = k // 2
        if k % 2: return float(window[m])
        return (window[m-1] + window[m]) / 2
    res.append(med())
    for i in range(k, len(nums)):
        old = nums[i-k]
        idx = bisect.bisect_left(window, old)
        window.pop(idx)
        bisect.insort(window, nums[i])
        res.append(med())
    return res
```

Complexity: each iteration O(k) memmove. n=2e5, k=1e3: 2e5 iterations × 2 memmoves of ~1000 elements (8KB each) → memmove 8KB ~ hundreds of ns to ~1µs. Plus bisect log. Total maybe 0.5–1.5s in Python loop overhead (~2e5 iterations of loop body: bisect calls, pops, insort, median computation — each iteration maybe 3-5µs Python overhead + memmove). Estimate ~1s. Acceptable "well under 2 seconds"? Maybe borderline. Could speed up by avoiding function call for median and computing indices inline.

Alternative: use two heaps with lazy deletion — O(n log k), heap ops in C. That's faster asymptotically. Lazy deletion with heapq: maintain small (max-heap via negation) and large heaps, plus a counter/dict of delayed elements. Standard algorithm; each element inserted/removed once → ~4e5 heap operations each O(log k) in C → very fast (<0.5s).

But median retrieval each window: peek tops; if lazy-deleted tops, need to prune. Standard LeetCode 480 solution.

I'll implement two heaps with lazy deletion carefully.

Standard approach (from LeetCode solutions):

```python
class DualHeap:
    def __init__(self, k):
        self.k = k
        self.small = []  # max heap (negated) — smaller half
        self.large = []  # min heap — larger half
        self.delayed = defaultdict(int)  # actually Counter
        self.small_size = 0  # counts of valid elements in small
        self.large_size = 0
```

Standard solution:

```python
from collections import defaultdict
import heapq

class DualHeap:
    def __init__(self, k):
        self.small = []
        self.large = []
        self.delayed = defaultdict(int)
        self.k = k
        self.small_size = 0
        self.large_size = 0

    def prune(self, heap):
        while heap:
            if heap is self.small:
                num = -heap[0]
            else:
                num = heap[0]
            if self.delayed[num]:
                heapq.heappop(heap)
                self.delayed[num] -= 1
            else:
                break
```

Hmm, delayed pruning with counts: when popping a duplicate that appears multiple times... The standard implementation: delayed counter decrements by 1 per pruned element, but heap stores duplicates too, and pruning loop pops while top is delayed. But careful: if num appears multiple times in heap and in delayed with count c, we pop it c times (each pop decrements). Actually the standard implementation prunes only the top: while top is delayed, pop and decrement delayed count. Since heap contains actual copies, and delayed counts deletions not yet applied, this works: each delayed count corresponds to an equal number of copies in the heap.

Insert logic (make_balance):

```python
    def insert(self, num):
        if self.small and num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.small_size += 1
        else:
            heapq.heappush(self.large, num)
            self.large_size += 1
        self.rebalance()

    def rebalance(self):
        s, l = self.small_size, self.large_size
        if s > l + 1:
            # move top of small to large, accounting for delayed? No—move actual heap top.
            v = -heapq.heappop(self.small)  # but top might be delayed...
```

Problem: when moving, if small's top is delayed... The standard solution moves -small[0] regardless (even if delayed) — wait no. Standard solution (from the well-known one):

```python
    def rebalance(self):
        if self.small_size > self.large_size + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
            self.small_size -= 1
            self.large_size += 1
            self.prune(self.large)  # ? no...
```

Actually the known solution:

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
            if heap is self.small:
                num = -heap[0]
            else:
                num = heap[0]
            if num in self.delayed:
                heapq.heappop(heap)
                self.delayed[num] -= 1
                if not self.delayed[num]:
                    del self.delayed[num]
            else:
                break
```

Hmm wait, that prunes whenever top is in delayed dict, decrementing the counter. But delayed counts deletions; if counter reaches 0 delete key. But issue: if num exists in delayed with count>0 but there are still valid copies of num in the heap below... it prunes those copies too while counter > 0? That's the correct semantics: delayed[num]=c means c copies of num in heap are logically deleted; pruning pops copies of num from top decrementing c each time; once c reaches 0, remaining copies are valid. Correct.

But careful with `del self.delayed[num]` when 0 — needed so the `if num in self.delayed` check works when counter is 0.

rebalance and adjust sizes: the standard solution:

```python
    def rebalance(self):
        if self.smallSize > self.largeSize + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
            self.smallSize -= 1
            self.largeSize += 1
            self.prune(self.large)
        elif self.smallSize < self.largeSize:
            heapq.heappush(self.small, -heapq.heappop(self.large))
            self.largeSize -= 1
            self.smallSize += 1
            self.prune(self.small)
```

Wait, but when moving the top of small to large, the top may be a delayed element whose actual copies... moving -small[0] even if delayed is fine because the delayed marker moves with the element: the element was logically deleted; moving it to the other heap keeps the delayed marker, and later pruning of either heap will remove it. But the delayed counter keyed by value: if we later prune `large` and top is that num with delayed count>0, it pops it. Correct, since delayed is value-based, heap-agnostic. There is a subtle correctness issue with duplicates: delayed[num] counts total logically-deleted copies of num across both heaps; when pruning either heap, popping a copy of num decrements. Since values are interchangeable, this works.

Hmm, but there's a known subtlety: when rebalance moves the top of small to large, but small's top is delayed, we move a logically-deleted element — sizes track it as a real move. Then sizes remain consistent since the element still exists physically. Fine.

erase:

```python
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
```

Wait, need care: prune called when the erased element is at the top. Actually standard solution calls prune on the heap whose top equals num, or always? The known solution:

```python
    def erase(self, num):
        self.delayed[num] += 1
        if num == -self.small[0]:
            self.smallSize -= 1
            self.prune(self.small)
        elif num == self.large[0]:
            self.largeSize -= 1
            self.prune(self.large)
        elif num <= -self.small[0]:
            self.smallSize -= 1
        else:
            self.largeSize -= 1
```

Hmm, but if erase target equals small top, decrement smallSize and prune. If it's somewhere in the middle, just decrement size. But there's the issue where pruning small might encounter top that's delayed... prune loop handles that.

Wait, there's a bug scenario: erase(num) where num equals small[0] but delayed already had entries for num... prune pops copies while delayed[num]>0. Fine.

But one more subtlety: if num == -small[0], we prune; prune may pop multiple copies. Each pop decrements delayed. Good.

Median:

```python
    def median(self):
        if self.k % 2:
            return float(-self.small[0]) if self.small else ...
```

With invariant smallSize == largeSize+1 (odd k) or smallSize == largeSize (even). For odd: median = -small[0]. For even: (-small[0] + large[0]) / 2.

But wait — could -small[0] be a delayed element at median time? If erase pruned when needed, tops should be valid... Not necessarily: if erase was for a middle element (not top), tops remain valid. If erase was top, prune removes delayed tops. Rebalance prunes the destination heap after push — actually why prune destination? After pushing to large then pruning large: because the moved element might be delayed and now at top of large? Hmm, the moved element pushed to large: if it's delayed, it might become top of large... it would equal delayed[num], so prune would pop it immediately — but it's logically deleted already and its size was decremented already? Wait: when erasing num that's in small middle: smallSize -=1, delayed[num]+=1. Element still physically in small. Later rebalance moves small top (maybe this element) to large and prunes large, popping it and decrementing delayed. Sizes: it was counted in small, moved to large... hmm, when it was erased smallSize decremented, so the physical copy in small is "size-less"? Then rebalance moves based on sizes but pops physical top which could be that size-less delayed element. Moving it increments largeSize — but it was logically deleted (size not counted). Then largeSize counts a deleted element, and prune(large) pops it decrementing delayed... wait prune only pops if delayed[num] > 0; delayed[num] = 1, so it pops it, largeSize should decrement then? Hmm.

Let me re-check the standard LeetCode 480 solution. The canonical one (from "liweiwei" / official-ish):

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
            if heap is self.small:
                num = -heap[0]
            else:
                num = heap[0]
            if num in self.delayed:
                heapq.heappop(heap)
                self.delayed[num] -= 1
                if not self.delayed[num]:
                    del self.delayed[num]
            else:
                break
```

Hmm wait, that's wrong: prune pops whenever top's value appears in delayed, decrementing — but the delayed count might belong to a different heap's copy! Since values equal, it doesn't matter — copies of equal values are interchangeable. But the size accounting: sizes were decremented once per erase. Pruning pops physical copies without touching sizes — that's fine because those physical copies were already accounted (either erased, or...). Hmm, actually there's the classic subtlety: prune may pop a copy whose deletion hasn't been counted... Let me think about the invariant: at any time, smallSize + largeSize = number of valid elements = k - (total delayed count). Physical heap sizes may exceed. Every physical element is either valid or matches a delayed entry. When we pop during prune, we consume one unit of delayed count. Since delayed count = number of physically-present-but-deleted copies (invariant maintained), pops match deletions. 

Check invariant maintenance:
- erase(num): delayed[num]+=1; the physically present copy remains; size decremented for the heap it belongs to. Invariant holds (one more deleted-physical pair).
- insert(num): push physically; size incremented. Not delayed. Fine.
- rebalance move: pop physical from A, push to B. If the popped element is deleted (matches delayed), then after move: it's physical in B, deleted marker unchanged (value-based, applies across heaps). Sizes: smallSize-1, largeSize+1 — but the element was deleted, so size accounting... its deleted status: when erased, we decremented smallSize even though physical copy stayed in small. So the size accounting said "element left small" but physically it's still in small (or now in large after move). Inconsistency: largeSize incremented by a deleted element, and delayed count still 1. Then when is largeSize corrected? Hmm.

Actually I recall the canonical solution handles this differently: rebalance moves based on heap tops regardless, and prune is called on destination after move. If the moved element is delayed, prune(large) pops it (delayed[num]>0), decrementing delayed — but largeSize was incremented! Then largeSize is overcounted by 1 permanently?

Hmm, let me look at the actual canonical solution more carefully. From LeetCode official solution for 480:

```python
class DualHeap:
    def __init__(self, k: int):
        # ...
        self.small = []  # max-heap (negated)
        self.large = []  # min-heap
        self.delayed = collections.Counter()
        self.small_size = 0
        self.large_size = 0
        self.k = k

    def prune(self, heap):
        while heap:
            if heap is self.small:
                num = -heap[0]
            else:
                num = heap[0]
            if num in self.delayed:
                heapq.heappop(heap)
                self.delayed[num] -= 1
                if not self.delayed[num]:
                    del self.delayed[num]
            else:
                break

    def makeBalance(self):
        s, l = self.small_size, self.large_size
        if s > l + 1:
            heapq.heappush(self.large, -heapq.heappop(self.small))
            self.small_size -= 1
            self.large_size += 1
            self.prune(self.large)
        elif s < l:
            heapq.heappush(self.small, -heapq.heappop(self.large))
            self.large_size -= 1
            self.small_size += 1
            self.prune(self.small)

    def insert(self, num):
        if not self.small or num <= -self.small[0]:
            heapq.heappush(self.small, -num)
            self.small_size += 1
        else:
            heapq.heappush(self.large, num)
            self.large_size += 1
        self.makeBalance()

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
```

Hmm, in this version, insert of num <= -small[0]: but -small[0] might be delayed... it's fine, comparison uses the value.

Now the concern: makeBalance moves the physical top of small to large. If small's top is a delayed element, we move it and increment large_size — but that element is logically deleted, so large_size now includes a deleted element. Then prune(large) — top of large is now that element (value num), which is in delayed, so prune pops it, delayed[num] -= 1. But large_size stays incremented. Net effect: large_size overcounts by 1? And delayed decremented for a deletion that... hmm, but the deletion was already accounted: when erase happened, small_size was decremented. Let's trace: element x erased from middle of small: small_size--, delayed[x]+=1, physical x in small. Now makeBalance: moves small top (say x, if it's top) to large: small_size-- (now small_size is one less than valid count in small? no...). 

Hold on — sizes should count valid elements. Let's define: small_size = number of valid elements in small. After erase from middle: x deleted, small_size--. Correct. Physical x still in small but "not counted". Now makeBalance condition uses sizes (valid counts), fine. It pops physical top of small, which might be x (deleted, uncounted). Pushes to large, large_size++ — but x is deleted, so large_size now overcounts! Unless... prune(large) then pops x (delayed[x]≥1) and... large_size not decremented. Bug?

Hmm wait — but actually if the top of small is a deleted element, the invariant "tops are valid" needs maintenance. In erase, when num == top, we prune, keeping top valid. When erase is for a middle element, the top stays valid (unchanged). So the top of small is always valid! Because: initially all valid; any deletion either (a) deletes the top → prune immediately, restoring valid top; (b) deletes a non-top element → top unaffected. Also, after prune, top is valid or heap empty. And insert pushes to top region — pushed element is valid. makeBalance moves a valid top (since tops are always valid by the above) to the other heap where it remains valid. So tops are always valid; hence the physical element moved in makeBalance is valid, and large_size++ is correct. 

But wait — in erase case (a): we prune small after decrementing small_size. Prune pops top (the deleted one) — but wait, small_size was already decremented for it, and prune pops physical without touching size. Consistent. Prune continues popping while top is in delayed — these additional popped elements are also deleted ones (their size already decremented at their erase time). Consistent.

Case: erase num where num <= -small[0] but num != -small[0]: deleted middle element, small_size--. Fine.

But subtle: what if num <= -small[0] numerically but num actually resides in large (duplicate values)? E.g., small has max 5, large has [5, 7]. Erase 5: num <= 5, so small_size--. But which copy got deleted? delayed[5]+=1, sizes: we decremented small_size. Later prune of either heap popping a 5 decrements delayed. Since values equal, whichever physical copy is popped, the accounting: total valid = physical - delayed_total. Sizes track valid per heap but the distribution between heaps of "valid" vs "deleted" copies of equal values can get mixed. Does this break the median? The median only reads tops: -small[0] and large[0], which are valid (never deleted). Sizes only matter for balancing. If sizes are slightly off due to value mix-ups... can sizes become incorrect such that balance is wrong?

Hmm, this is the known-correct canonical solution (it's the LeetCode official one and it's accepted), so I'll trust it. Actually, let me double check the potential issue: erase(num) with num <= -small[0] decrements small_size, but the physically deleted copy might conceptually be in large. Then small_size undercounts and large_size overcounts valid elements by 1 relative to physical? No — sizes count valid elements; the deletion removes one valid element from the multiset; assigning it to small vs large: since small's max ≥ num ≥ ... hmm, if num ≤ -small[0], convention says the element "belongs" to small. Whether the physical copy that survives in the heap is in small or large, delayed entries will be consumed by whichever heap gets pruned. But pruning only happens when the delayed value reaches the top of a heap. If delayed[num] sits unconsumed (num in middle of large) while large_size was... wait no, we decremented small_size.

Let me just trust the canonical solution — it's the official LeetCode solution, verified correct. Actually, let me verify the invariant more rigorously: 

Claim: at any point after operations, for each heap, (number of physical elements in heap) − (number of delayed entries "attributed" to it) = size? The mixing of equal values makes attribution ambiguous, but a cleaner invariant: total physical = small_size + large_size + total_delayed. And heap property ensures: all elements of small ≥ ... hmm, with duplicates across the boundary, small's max and large's min are each valid and small_max ≤ large_min? Is that maintained? insert: num ≤ -small[0] → small, else large. If num == -small[0] it goes to small — fine, small_max stays ≥. Order maintained: every element in small ≤ ... no wait, small is the smaller half: all elements in small ≤ all in large. Pushing num to small when num ≤ small's max: num could exceed some elements of large? No: if num ≤ small_max ≤ large_min... is small_max ≤ large_min always? Invariant: max(small) ≤ min(large). Initially true. Insert: if num ≤ small_max, push to small — num ≤ small_max ≤ large_min, so max(small) may become num ≤ large_min. OK. Else num > small_max, push to large: num > small_max but is num ≥ large_min? num > small_max, but large_min ≥ small_max, so num could be less than large_min! E.g., small_max=5, large_min=10, num=7 → goes to large, large_min becomes 7 ≥ 5. Still max(small)=5 ≤ 7. OK fine, because num > small_max means new large_min ≥ ... new min of large = min(old_min, num) > small_max. Invariant holds. Rebalance moves tops which are the extremes, preserving invariant. Delayed deletions don't move elements. So invariant max(small) ≤ min(large) holds, and tops are valid, so median from tops is correct.

Sizes: do small_size and large_size correctly reflect valid counts per heap? Potential drift: erase(num) with num ≤ small_max: we decrement small_size. Physically, copies of value num may exist in both heaps. delayed[num]++ will be consumed by pruning whichever heap. If the consumed physical copy was in large, then large's physical count drops without large_size dropping — so large has one more "size credit" than valid elements? Hmm, that means large_size overcounts valid elements in large. Then balance decisions use sizes; median computed from tops. If large_size overcounts but total = small+large = k (window size) still... total valid = k - total_delayed = small_size + large_size must hold? Total delayed entries each corresponds to one size decrement (at erase time). Each prune pop consumes one delayed entry and removes one physical element whose size was already decremented (at its erase) OR... hmm wait: is every physically popped element during prune one whose erase already decremented a size? Yes — prune pops elements matching delayed entries, and each delayed entry was created at erase time with a corresponding size decrement. But which heap's size was decremented vs where the physical copy lives can differ when duplicates span heaps!

Example: k=2. Insert 5: small=[5], sizes s=1,l=0. Insert 5: 5 ≤ 5 → small=[5,5]... wait -small[0]=5, num=5 ≤ 5, push to small: small=[-5,-5] heap, s=2,l=0. makeBalance: s > l+1 → move: pop 5, push to large: small=[-5], large=[5], s=1,l=1. Good.

Now erase 5 (window slides): num=5 ≤ -small[0]=5 → delayed[5]=1, s=0, and num == -small[0] → prune(small): top is 5 which is in delayed → pop it, delayed→0. small empty now! s=0, l=1. But small is the "smaller half" and it's empty while large has one element — for k=1 now. makeBalance isn't called in erase... The canonical solution: median query would read -small[0] → error if small empty! Hmm, but in the actual sliding window usage, insert and erase alternate: erase then insert each step. After erase, small is empty; then insert(num_new): "if not self.small or num <= -self.small[0]" → push to small: small=[-new], s=1; makeBalance: s=1, l=1, balanced. Median: -small[0]=new and large[0]=5. Window {new, 5}, k=2: median = (new+5)/2. Correct only if new ≤ 5... if new > 5, e.g. new=10: we pushed 10 to small (since small empty) — violates the halves invariant! small_max=10, large_min=5. Invariant broken!

Hmm wait, but in the canonical solution the insert condition is `if not self.small or num <= -self.small[0]`. With small empty, everything goes to small. Then makeBalance: s=1, l=1 → no rebalance. Now small=[-10], large=[5]. Tops: small_max=10, large_min=5 — invariant max(small) ≤ min(large) broken! Median for even k reads both tops: (10+5)/2 — but the actual two elements are 10 and 5, median = 7.5. Oh wait, that's actually still correct! Because with only two elements, median = mean of both regardless. Hmm, the invariant broke but the median... for even k, median = (top of small + top of large)/2 — needs small top = k/2-th smallest and large top = (k/2+1)-th smallest. If the halves are "wrong", the tops might not be the right order statistics.

Hmm wait, but I think the issue: when small is empty and we insert, the element pushed to small should arguably go to large if the structure is lopsided. Let me re-trace: after erase, s=0, l=1: sizes say small needs one element to balance (makeBalance: s < l → it should move from large to small!). But makeBalance is only called in insert, not erase. In the sliding window, the sequence is: erase old, insert new (per the canonical solution's usage: `dh.erase(nums[i-k]); dh.insert(nums[i])`? or insert then erase?). Canonical usage in LC480: for each i, first insert nums[i], then if i >= k, erase nums[i-k]. Then when window complete, get median. Hmm, order matters.

With insert-first: at step where window fills: insert makes sizes s+l = k+1 temporarily, then erase brings back to k, then makeBalance? No — makeBalance called only in insert. Hmm: insert: push, size++, makeBalance (sizes now k+1... balance relative to k+1). Then erase: size--, prune. Sizes could be unbalanced after erase: e.g., k=2: after insert (sizes sum=3, balanced s=2,l=1 or s=1,l=2), erase decrements one → s=1,l=1 or s=2,l=0 or s=0,l=2? Balance condition s>l+1 or s<l: after erase no rebalance, so s=2,l=0 possible (erase from large). Then next insert: if num ≤ small_max → small: s=3,l=0; makeBalance: s>l+1 → move → s=2,l=1. Then getmedian. Hmm okay, so after the full step (erase+insert... or insert+erase), sizes might be temporarily unbalanced but the canonical solution computes median after both ops, and balance is only guaranteed... s and l differ by at most... let's see: after insert's makeBalance, |s-l| ≤ 1 (with s ≥ l). After erase: s+l = k, s-l ∈ {1, 0, -1}? Erase decrements either. So s-l ∈ {0,1,2}?? If s=2,l=1 (k=3) then erase from large: s=2,l=0, s-l=2. Median for odd k reads only small top — with s=2,l=0, small has 2 valid, large 0, total 3 — small top is the max of all 3?? That would be wrong!

Hmm, wait — for odd k, median should be the middle. Let me re-check canonical usage. Actually the canonical LC480 solution:

```python
class Solution:
    def medianSlidingWindow(self, nums: List[int], k: int) -> List[float]:
        dh = DualHeap(k)
        n = len(nums)
        for i in range(n):
            dh.insert(nums[i])
            if i >= k:
                dh.erase(nums[i-k])
            if i >= k-1:
                dh.median()...
```

Hmm, if insert is followed by erase, then after erase no rebalance happens and sizes can be s=2,l=0 for k=3 as I showed. Unless... makeBalance is called at end of erase too? Let me recall the actual official solution... I believe the official solution's erase doesn't rebalance, and the median getter is:

```python
def getMedian(self):
    if self.k % 2:
        return -self.small[0]
    return (-self.small[0] + self.large[0]) / 2
```

And the balance invariant maintained: small_size == large_size + 1 (odd) or small_size == large_size (even), maintained after each full step? Let's check: window sliding: erase(old), insert(new) — or insert(new), erase(old). 

Case k odd, balanced state s = l+1 (sum k). erase: whichever heap. insert: push + makeBalance. makeBalance ensures s ≥ l and s ≤ l+1 for the new total. If after erase s=l+1... wait sum after erase = k-1. Possible (s,l): (l+1, l) → erase from small: (l, l) → insert: if goes to small (l+1, l): balanced for odd k. If goes to large: (l, l+1): makeBalance: s<l → move from large to small: (l+1, l). Good. Erase from large: (l+1, l-1) → insert to small: (l+2, l-1): makeBalance: s > l+1 → move: (l+1, l). Good. Insert to large: (l+1, l): balanced. So with erase-then-insert order, after each full step balance holds. With insert-then-erase: after insert sum=k+1, balance: s∈{l+1, l+2}? makeBalance gives s≥l, s≤l+1: so (l+1,l) or (l,l+1)... makeBalance ensures final s-l ∈ {0,1}. Sum k+1: either s=l+1 with sum 2l+1=k+1, or s=l with sum 2l=k+1 → k even: s=l, sum even ✓. Then erase: sum k. From (s=l+1, l) sum even k... hmm let me just do k odd=3: after insert, sum=4, s-l∈{0,1}: (s,l)=(2,2)? sum 4 ✓ or (s,l) = ... s-l∈{0,1} and sum 4: (2,2) or... (s-l=1, sum 4) → not integer-solvable (4 odd... 2s... s+l=4, s-l=1 → s=2.5). So (2,2). Erase: from small → (1,2): s<l! Median reads small top... k=3 odd, median = -small[0]. small has 1 valid, large 2. small top = min of the smaller... is -small[0] the 2nd smallest of 3? Elements: small has 1 element, large 2 elements, all valid, invariant max(small) ≤ min(large). small's single element is the smallest, not the median! WRONG?

Hmm, that suggests insert-then-erase order is buggy for the canonical solution... unless the canonical uses erase-then-insert, or calls makeBalance in erase too, or the median is computed... Let me actually recall the official LeetCode solution code for 480 (Python):

```python
class DualHeap:
    def __init__(self, k: int):
        self.small = []
        self.large = []
        self.delayed = collections.Counter()
        self.smallSize = 0
        self.largeSize = 0
        self.k = k

    def prune(self, minHeap: List[int]) -> None:
        ...
```

Official (I remember it's Java-first; the Java official solution):

```java
class DualHeap {
    private PriorityQueue<Integer> small; // max heap
    private PriorityQueue<Integer> large; // min heap
    private HashMap<Integer, Integer> delayed;
    private int smallSize, largeSize, k;

    public DualHeap(int k) { ... }

    public void prune(PriorityQueue<Integer> heap) { ... }

    public void makeBalance() {
        if (smallSize > largeSize + 1) {
            large.offer(small.poll());
            smallSize--; largeSize++;
            prune(large);
        } else if (smallSize < largeSize) {
            small.offer(large.poll());
            largeSize--; smallSize++;
            prune(small);
        }
    }

    public void insert(int num) {
        if (small.isEmpty() || num <= -small.peek()) {
            small.offer(-num);
            smallSize++;
        } else {
            large.offer(num);
            largeSize++;
        }
        makeBalance();
    }

    public void erase(int num) {
        delayed.put(num, delayed.getOrDefault(num, 0) + 1);
        if (num <= -small.peek()) {
            smallSize--;
            if (num == -small.peek()) prune(small);
        } else {
            largeSize--;
            if (num == large.peek()) prune(large);
        }
    }
```

And usage in medianSlidingWindow:

```java
DualHeap dh = new DualHeap(k);
for (int i = 0; i != n; ++i) {
    dh.insert(nums[i]);
    dh.erase(nums[i - k + 1]) when window slides...
```

Actually the official Java:

```java
public double[] medianSlidingWindow(int[] nums, int k) {
    DualHeap dh = new DualHeap(k);
    for (int i = 0; i < k; ++i) dh.insert(nums[i]);
    double[] ans = ...;
    ans[0] = dh.getMedian();
    for (int i = k; i < n; ++i) {
        dh.erase(nums[i - k]);
        dh.insert(nums[i]);
        ans[i - k + 1] = dh.getMedian();
    }
}
```

Erase then insert. Good — that matches my analysis that erase-then-insert maintains balance after each step. Great, so I'll use: build initial window via k inserts, then per step: erase(old), insert(new), then compute median.

Now, remaining concern about the duplicate-value size attribution issue. Let me think again whether small_size/large_size correctly track valid counts per heap, given equal values may span heaps.

The concern: erase(num) with num ≤ small_max but the "conceptually deleted" physical copy is in large (duplicate value in both heaps). Then small_size decremented but the physical copy remains in large, and delayed[num] will be consumed by pruning... but pruning only happens on a heap when its top equals a delayed value. If delayed[num] is never consumed (num never reaches top of either heap), physical count stays high but that's fine — delayed count and sizes remain consistent: total valid = physical − total_delayed = small_size + large_size. But per-heap validity: is every physical element in small that's "unmatched" valid? Hmm, the real question is whether sizes correctly reflect which heap holds the valid elements, because rebalance moves physical tops assuming sizes match valid distribution.

Let me construct a potential failure: k=2. Elements: insert 1, insert 5. small=[-1]... insert 1: small empty → small=[-1], s=1. makeBalance: s>l+1? 1>1 no; s<l? no. insert 5: 5 ≤ -small.peek()=1? No → large=[5], l=1. Balanced (s=l=1, k even). Median (1+5)/2.

Slide: erase(1), insert(7). erase 1: 1 ≤ 1 → s=0, prune(small): top 1 in delayed → pop, small empty, delayed consumed. insert 7: small empty → small=[-7], s=1. Balanced. Median (7+5)/2 ✓.

Now duplicate scenario: k=4. Insert 3,5,5,7: 
- i1: 3 → small=[-3], s=1.
- i2: 5 ≤ 3? no → large=[5], l=1. balance ok (1,1).
- i3: 5 ≤ 3? no → large=[5,5], l=2. makeBalance: s=1 < l=2 → move large top (5) to small: small=[-5,-3], large=[5], s=2,l=1.
- i4: 7 ≤ 5? no → large=[5,7], l=2. s=2,l=2 ✓.
State: small valid {3,5}, large valid {5,7}. Median = (5+5)/2 = 5.

Slide: erase(3), insert(6). erase 3: 3 ≤ -small.peek()=5 → s=1; 3 == 5? no, no prune. delayed={3:1}, physical 3 still in small. insert 6: 6 ≤ 5? no → large=[5,6,7], l=3. makeBalance: s=1 < l=3 → move large top: large top is 5 → small=[-5,-5,-3]? pop 5 from large, push -5: small now has {-5,-5,-3}, large=[6,7], s=2, l=2. prune(small): top is 5, in delayed? delayed={3:1}, 5 not in delayed → stop. Median: (-small[0] + large[0])/2 = (5+6)/2 = 5.5. Window {5,5,6,7}: median = (5+6)/2 = 5.5 ✓.

But note: delayed={3:1} persists, physical 3 in small. Sizes: s=2 but small physically has 3 elements {3,5,5}, one delayed. Valid in small = 2 ✓ (the two 5s are counted, 3 not). But which physical copies got counted? Fine.

Now erase(5), insert(8): erase 5: 5 ≤ small_max=5 → s=1; 5 == -small.peek()=5 → prune(small): top 5 in delayed? delayed={3:1}; 5 not in delayed → break! Hmm! The top is 5, we're erasing 5, delayed has {3:1}. num==top triggers prune but prune's condition `if num in delayed` uses the top value 5, which is not in delayed → prune immediately stops without popping. But we needed to logically delete the top 5! delayed[5] should be... erase sets delayed[num] += 1: erase(5) → delayed={3:1, 5:1}. THEN prune: top 5 in delayed → pop, delayed[5]→0, delete key. small=[-5,-3], s=1. ✓. Right, erase increments delayed first. Good.

Continue: s=1, small physical {-5,-3}, delayed={3:1}. insert 8: 8 ≤ 5? no → large=[6,7,8], l=3. makeBalance: s=1<l=3 → move large top 6 → small: small={-6,-5,-3}, large=[7,8], s=2, l=2. prune(small): top 6 not in delayed. Median = (6+7)/2 = 6.5. Window {5,6,7,8} ✓.

Now a trickier case where erase target's value exists in both heaps and top-of-heap logic misattributes. k=4, values: 5,5,6,7 → then slide erase 5, insert 5.

Build: i1: 5→small=[-5],s=1. i2: 5≤5→small=[-5,-5],s=2. makeBalance: s=2>l+1=1 → move: pop 5→large. small=[-5], large=[5], s=1,l=1. i3: 6≤5? no→large=[5,6], l=2. balance: s=1<l=2 → move large top 5→small: small=[-5,-5], large=[6], s=2,l=1. i4: 7→large=[6,7], l=2. s=2,l=2 ✓. Valid: small {5,5}, large {6,7}. Median (5+6)/2.

Slide: erase(5): 5 ≤ small_max=5 → s=1; 5==top → prune: pop 5 (delayed consumed). small=[-5], s=1. insert(5): 5 ≤ 5 → small=[-5,-5], s=2. makeBalance: s=2, l=2: no move (s > l+1 false). Median: (-small[0]+large[0])/2 = (5+6)/2 ✓. Window {5,5,6,7} ✓.

Tricky: erase a value that's the top of large while equal copies in small. k=4: 3,4,5,5. Build:
- 3→small=[-3],s=1.
- 4≤3? no→large=[4],l=1.
- 5→large=[4,5],l=2. balance: s<l → move 4→small: small=[-4,-3], large=[5], s=2,l=1.
- 5≤4? no→large=[5,5], l=2. s=2,l=2. Valid small {3,4}, large {5,5}. Median (4+5)/2 ✓.

Slide: erase(3), insert(9): erase 3: 3≤4 → s=1, 3≠4, delayed={3:1}. insert 9: 9≤4? no → large=[5,5,9], l=3. balance: s=1<l=3 → move large top 5→small: small=[-5,-4,-3], large=[5,9], s=2,l=2. prune(small): top 5 in delayed({3:1})? no. Median (5+5)/2 = 5. Window {4,5,5,9}: median (5+5)/2 = 5 ✓.

Slide: erase(4), insert(10): erase 4: 4 ≤ small_max=5 → s=1; 4≠5; delayed={3:1,4:1}. insert 10: 10≤5? no → large=[5,9,10], l=3. balance: s=1<l=3 → move top 5→small: small=[-5,-5,-4,-3]?? wait small physical: {-5,-4,-3} plus pushed {-5} = 4 physical, s=2. large=[9,10], l=2. prune(small): top 5 in delayed? delayed={3,4}. No → stop. Median: (5+9)/2 = 7. Window {5,5,9,10}: median = (5+9)/2 = 7 ✓. Physical small has 4 elements {5,5,4,3} with delayed {3:1,4:1} → 2 valid ✓ matches s=2.

Slide: erase(5), insert(11): erase 5: 5 ≤ small_max=5 → s=1; 5 == -small.peek()=5 → prune(small): top 5, delayed has {3,4}, 5 not in delayed → prune stops immediately! But we just erased a 5 whose value equals top — delayed[5]=1, and prune should pop the top 5! Wait — erase does delayed[num] += 1 first: delayed={3:1,4:1,5:1}. Then prune: top=5, 5 in delayed → pop, delayed[5]→0, del key. Next top: -small.peek()=5 (the other 5): 5 in delayed? delayed now {3:1,4:1} → no → stop. small physical {-5,-4,-3}, s=1. ✓ (valid small: one 5, but which? whatever). delayed={3:1,4:1}.
insert 11: 11 ≤ 5? no → large=[9,10,11], l=3. balance: s=1<l=3 → move 9→small: small=[-9,-5,-4,-3], large=[10,11], s=2,l=2. prune(small): top 9 not in delayed. Median (9+10)/2 = 9.5. Window {5,9,10,11}: median (9+10)/2 = 9.5 ✓.

OK the algorithm keeps working. The size attribution: when erase(num) with num ≤ small_max but num's equal copy physically in large — the size decrement hits small_size, and delayed[num] gets consumed by pruning whichever heap. Pruning consumes delayed entries regardless of which heap they were "attributed" to. Could this cause sizes to drift such that s+l ≠ k − total_delayed... no: s+l counts valid, each erase decrements exactly one size and adds one delayed; each prune pop removes one physical and one delayed. Physical counts: small physical = s + (delayed entries whose physical copy is in small)... The per-heap question: does small_size equal the number of valid elements in small? Suppose erase(num≤small_max) where the actual copy deleted "should" be in large. Then small_size loses one, large keeps physical. If the delayed entry is later consumed by pruning large, large's physical decreased but large_size unchanged → large_size > valid-in-large. Drift!

Can drift cause wrong balance decisions? Balance uses sizes; if sizes drift, we might move elements unnecessarily, but moves preserve correctness as long as tops are valid and... hmm, actually if sizes drift from valid distribution, the median reading could be wrong (tops might not be the right order statistics).

Hmm, let me think about whether drift can actually occur. Erase(num) with num ≤ small_max: I claimed the "deleted" element is in small conceptually. Physically, copies of value num: could one be in large? That requires at some point a copy of value num in large: it was pushed to large when num > small_max at insert time, or moved during rebalance. But invariant max(small) ≤ min(large) — if small_max == num and large contains num (equal values), that's allowed (≤). So yes, duplicates spanning both heaps are possible (we had 5 in both heaps in examples above).

In the example above: "erase 5, 5 ≤ small_max=5": we decremented small_size and pruned small (popping small's top 5). The delayed entry got consumed by small's prune. What if instead the erase's num equals small_max but there are also copies in large, and pruning small pops the top copy — the delayed count from THIS erase is consumed by small. Consistent. What if num < small_max (middle of small)? Then no prune, delayed[num] lingers. The physical copy of num in small stays. Later, if num rises to top of small (after other removals), prune pops it then. Or if the physical copy in small gets moved to large during rebalance (only tops move; num at middle won't move). Hmm, could a physical copy of num in LARGE get popped by prune while the delayed entry was "attributed" to small's size? Prune(large) happens when large's top is in delayed. If large's top is num (value with delayed>0), it pops, consuming delayed. Then large physical decreased without large_size change → large_size overcounts valid in large by 1? But also small_size was decremented at erase while small still physically holds... hmm wait — if num < small_max and num also has a copy in large... but invariant max(small) ≤ min(large): num < small_max ≤ large_min ≤ num?? Contradiction: large_min ≤ num < small_max ≤ large_min. So num == small_max == large_min. So if num < small_max strictly, no copy of num is in large... wait, copies of num in large means large_min ≤ num, and num < small_max ≤ large_min → large_min ≤ num < small_max ≤ large_min → strict inequality contradiction unless equalities: num < small_max and large_min ≤ num gives large_min < small_max — violates invariant. So: for erase(num) with num < small_max, all copies of value num are in small only. And for num == small_max (top), we prune immediately, consuming small's top copy. Could the delayed entry for this erase later consume a large copy? delayed[num] was incremented once and prune consumed one pop immediately (if delayed[num] was 0 before). But if delayed[num] was already > 0 before this erase (previous unconsumed deletions of same value), prune pops possibly multiple copies... it pops while top is in delayed, decrementing. Each pop consumes one unit, corresponding to one physical copy of that value currently at top of that heap. Total pops across both heaps over time = total delayed increments = total erase size decrements. And each heap's size decrement at erase is attributed by the rule num ≤ small_max → small. Question: over the whole run, for each heap H: (physical pops from H during prune) == (size decrements attributed to H)? 

Hmm, actually what matters isn't exact per-heap accounting; what matters is that small_size == number of valid elements in small at all times (so median tops are right order statistics and balance decisions correct). Let me think of it differently: define for each heap: physical count P_H, valid count V_H = P_H − D_H where D_H = delayed entries consumed by... no, delayed entries aren't per-heap.

Alternative cleaner formulation to avoid this headache: I can sidestep the whole issue by using a different well-understood approach: the "two multisets / index-based heaps" is messy. Options:

1. Sorted list with bisect (simple, O(k) per op but C-speed memmove). Simple, obviously correct. Performance: 200k iterations, each with bisect_left, pop, insort, and median calc. Python-level overhead per iteration maybe ~1.5µs (function calls: bisect_left, list.pop, insort — these are C functions). Plus memmove ~1000 elements * 2 * 8 bytes = 16KB moved per iteration → 200k * 16KB = 3.2GB memory traffic — at ~10GB/s that's 0.3s. Total maybe 0.8–1.2s. "Well under 2 seconds" — probably OK but not comfortably.

2. Two heaps with lazy deletion (canonical). More code but O(n log k) and proven (it's the official LC solution; I derived erase-before-insert maintains balance). Let me settle the drift question definitively.

Let me prove the invariant precisely for the canonical dual heap. I'll define things carefully.

State: small (max-heap via negation), large (min-heap), delayed counter, sizes s, l (intended valid counts).

Operations:
- insert(x): if small empty or x ≤ −small[0]: push to small, s++. else push to large, l++. Then balance.
- erase(x): delayed[x]++. if x ≤ −small[0]: s−−; if x == −small[0]: prune(small). else: l−−; if x == large[0]: prune(large).
- balance: if s > l+1: move small's top to large (s−−, l++), prune(large). elif s < l: move large's top to small (l−−, s++), prune(small).
- prune(H): while H nonempty and H.top value in delayed (with count>0): pop, delayed[v]−− (delete key if 0).

Key question: after any sequence, is the median computed from −small[0], large[0] correct, i.e., small contains exactly the ⌈k/2⌉ smallest valid elements (with s = ⌈k/2⌉ etc.)?

Alternative correctness argument: Think of it as the algorithm maintaining a valid partition where "delayed" elements are ghosts. Hmm, this is getting long. Honestly, this is the well-known official solution to LeetCode 480, used by thousands, known correct. The erase-before-insert order and the exact structure I wrote match the official solution. I'll trust it.

But wait — actually there's a cleaner known variant that avoids my drift worry entirely: instead of value-based delayed counter, note the drift concern: let me just carefully prove per-heap accounting.

Claim: At all times, for heap small: physical_count(small) − s = (number of delayed units that will be consumed by pruning small)... not well-defined. Let me instead prove: s = |{valid elements in small}| and similarly l, where valid = physical − matched-to-delayed, with some matching. Hmm.

Let me define: a delayed unit for value v created by erase(v). Since delayed is value-keyed, any physical copy of v can absorb it. Let's define an arbitrary consistent matching over time. The danger is only if sizes diverge from valid counts in a way that breaks the partition property (max(small) ≤ min(large) among valid) or the count property (s = intended).

Let me try to construct a drift example deliberately. Need: erase(v) with v ≤ small_max, attributed to small (s−−), but the delayed unit for v eventually consumed by pruning large, while small keeps a physical copy of v forever (never pruned) — then small physical includes ghost v but s already decremented it, so small's valid count = physical − ghosts; but is the ghost in small "counted"? s counts... ugh.

Concrete attempt: get a copy of v into large while small_max ≥ v. As shown, invariant forces v == small_max == large_min for copies of v to be in both heaps. So: v is both the max of small and min of large (as values present). Now erase(v): rule says v ≤ small_max → attribute to small, s−−, and since v == −small[0], prune(small) → pops one copy of v from small top, consuming one delayed unit (possibly this one). So the erase of the boundary value is immediately resolved within small. The delayed unit never lingers to be consumed by large. What if delayed[v] had prior lingering units from earlier erases of v that were attributed... those were also v == small_max at that time? Any erase of v with v < small_max attributes to small AND leaves no copy in large (proven above). Any erase of v with v > small_max: then copies of v all in large (since v ≥ large_min... if v ≥ small_max and v in small? can't, small max is small_max; copies of v in small require v ≤ small_max. So v > small_max → all copies in large, attribute to large, l−−, and if v == large[0] prune large). If v == small_max: boundary case handled, prune small immediately.

But subtlety: erase(v) where v ≤ small_max: we prune small only if v == −small[0]. Suppose v < small_max but v's copies are all in small (proven). delayed[v] lingers. The physical copy of v in small stays until v surfaces to small's top, then prune pops it. Meanwhile could delayed[v] be consumed by a prune of large? Prune(large) pops large's top while top's value in delayed. If large's top value == v: but all copies of v are in small (v < small_max ≤ large_min, and large's top ≥ large_min > v) — so large's top ≠ v... unless large_min == v which contradicts v < small_max ≤ large_min... wait invariant is small_max ≤ large_min; v < small_max ≤ large_min → large's top > v. So prune(large) can't consume v's unit. 

What about rebalance moves: moving large's top to small — could move a copy of value v where v has lingering delayed units? large's top ≥ large_min ≥ small_max > v → no. Moving small's top to large: small's top = small_max; if v == small_max has lingering delayed units... when does a unit for v == small_max linger? Erase(v==small_max) triggers prune(small) which pops while top in delayed — it pops all consecutive top copies of v (and any other delayed values at top). So after that, either delayed[v] == 0 or top of small is no longer v... wait prune pops while top's value in delayed. If there are multiple copies of v at... heap top is a single value; after popping one copy, next top could be v again (duplicates) — prune continues popping while delayed[v] > 0. So all physically-present copies of v that were at small's top region get popped until delayed[v] hits 0 or a different value surfaces. Hmm: suppose small has three copies of v on... heap doesn't have "consecutive" copies necessarily but if top is v and delayed[v] = c, prune pops until delayed[v]=0 — popping c copies of v total (as long as they surface as top). Since copies of v in a max-heap: once you pop one v, other copies of v are... all copies of v that are currently in the heap and ≥ everything else — they'll be at top successively. But some copies of v might be deeper (below larger elements)? In a max-heap, if v is the max value present, all copies of v are at... no, a copy of v could be below a copy of v+1... but if v is the max, nothing larger exists, so copies of v are all effectively at top level? In a heap, the maximum element is at root; duplicates of the max: after popping root, another copy becomes root (heap property: every element ≥ its children; second copy of max must be... not necessarily at position 1, but it is ≥ all its descendants and equal to max; the new root after popping is the max of remaining, which is v if any copy remains). Yes: pop repeatedly yields v while copies remain. So prune correctly consumes.

OK here's the cleanest way to think: I'll just trust it. This is literally the LeetCode official solution; it's correct. My drift concerns resolve because of the invariant argument: delayed units for value v can only be consumed by pruning a heap whose top equals v, and copies of v can only be in both heaps when v == small_max == large_min, in which case erase attributes to small and prunes immediately. Residual worry about rebalance moving a copy whose value has lingering delayed units: balance moves small's top (value = small_max). Could small_max's value have lingering delayed units? If erase(small_max) happened, prune ran and consumed... unless delayed[v] existed BEFORE from... any delayed unit for v==small_max would have been created by an earlier erase when v was small_max, immediately pruned. But what if v was small_max, erase created unit, prune popped copies until delayed[v]=0 — always reaches 0? Prune pops while top in delayed. It pops copies of v while delayed[v]>0. If delayed[v] = 2 but only 1 physical copy of v in small (the other "deleted copy" was... all copies of v are in small when v ≤ small_max... if v == small_max == large_min, copies could be in large too!). Hmm: erase(v), v == small_max, copies of v in both heaps. delayed[v] = c_old + 1. prune(small) pops small's copies of v until delayed[v] = 0 or small's top ≠ v (i.e., small ran out of v copies). If small has fewer copies than delayed units, delayed[v] > 0 lingers with remaining copies in large! Then later, large's top = v (large_min = v), and any prune(large) (triggered by an erase of large's top or a balance move into... prune(large) is called after balance moves into large, or erase of large top) — when large's top = v and delayed[v] > 0, prune(large) pops it, consuming the lingering unit. But that pop removes a physical copy from large whose size... was it counted in l? The erase that created the unit decremented s (not l). The physical copy in large: was pushed/created counting toward l. So popping it via prune (no size change) leaves l overcounted? Wait no: l counts valid elements. Let's carefully track with a full example. This is the crux — let me construct it.

Goal: copies of v in both heaps, small has fewer v-copies than pending erase units... Let me try: k=4, values: 5, 5, 5, 7 → then erase 5 twice etc.

Build:
- insert 5: small=[-5], s=1.
- insert 5: 5≤5 → small=[-5,-5], s=2. balance: s=2 > l+1=1 → move: pop 5 → large=[5], s=1, l=1. prune(large): top 5 in delayed? empty. 
- insert 5: 5 ≤ small_max=5 → small=[-5,-5], s=2. balance: s=2, l=1: s > l+1? 2>2 no. s<l? no. 
- insert 7: 7≤5? no → large=[5,7], l=2. s=2,l=2 ✓.
State: small phys {-5,-5} (two 5s), large phys [5,7]. All valid, no delayed. Median (5+5)/2 = 5. Window {5,5,5,7} median 5 ✓.

Slide 1: erase(5), insert(9).
- erase 5: delayed={5:1}; 5 ≤ 5 → s=1; 5==top → prune(small): top 5 in delayed → pop (delayed[5]→0, del). next top 5: in delayed? key deleted → stop. small=[-5], s=1.
- insert 9: 9 ≤ 5? no → large=[5,7,9], l=3. balance: s=1 < l=3 → move large top 5 → small: small=[-5,-5], large=[7,9], s=2, l=2. prune(small): top 5, delayed empty → stop.
- Median: (5+7)/2 = 6. Window {5,5,7,9}: median (5+7)/2 ✓.

Slide 2: erase(5), insert(10).
- erase 5: delayed={5:1}; 5 ≤ small_max=5 → s=1; top==5 → prune(small): pop top 5, delayed→0. Next top: 5 (other copy). in delayed? deleted → stop. small=[-5], s=1. Wait, small phys was {-5,-5}: two copies. Pop one → small=[-5] (one copy). s=1 ✓ (valid small = {5}).
- insert 10: 10 ≤ 5? no → large=[7,9,10], l=3. balance: s=1<l=3 → move large top 7 → small: small=[-7,-5], large=[9,10], s=2,l=2. prune(small): top 7 not delayed.
- Median: (7+9)/2 = 8. Window {5,7,9,10}: ✓.

Now to create the drift scenario I wanted: need small to run out of copies of v while delayed[v] > 0. From above: at slide 1, after erase, small had 1 copy, delayed consumed exactly. Hmm, small had 2 copies, 1 delayed unit, popped 1, delayed hit 0. To make delayed linger, need delayed count > copies in small. delayed[v] units accumulate only if erases of v happen without prune consuming — but erase of v when v==small_max always prunes immediately... units accumulate when erase(v) with v < small_max (middle). Then copies of v all in small. Then later v becomes small_max (after bigger elements leave) — when v becomes top, the next prune of small (triggered by any erase hitting small's top, or balance) will consume pending units. Meanwhile could copies of v be in large? Requires v == large_min at some point while v < small_max — impossible (invariant). But wait: during a balance move, small's top (small_max) moves to large. Suppose v is small's top with lingering delayed units — move happens without prune of small! balance: s > l+1 → pop small top, push to large, prune(large). If small's top v has delayed[v] > 0 (lingering), moving it to large: then large's top = v, and prune(large) runs: top v in delayed → pops it, consuming the unit! And size accounting: the move did s−−, l++; then prune popped it from large without touching l. So l++ then implicit removal → l overcounts?? Let's trace whether this can happen: v at small's top with delayed[v] > 0. When did delayed[v] get created without immediate consumption? Erase(v) with v < small_max (no prune since v ≠ top). Then elements above v got erased/removed... each removal of elements above v: those erases either hit small top (prune small — prune small would pop the top; after popping tops, does it reach v? prune pops while top in delayed; it stops when top not in delayed. So v surfaces as top but prune stops if top ≠... it pops while top is in delayed — if the elements being popped are the ones erased, delayed entries for them exist, so prune continues: pop top (delayed, consumed), next top... it keeps popping while tops are delayed. v's copies: v is in delayed → when v surfaces, prune pops it too, consuming. So actually whenever v surfaces due to prune-driven unwinding, it gets consumed.

But if the elements above v left via being moved in balance (not erased), v surfaces as top without prune. Balance moves small's top only when s > l+1. The top at that moment: if top = some w with delayed[w] > 0 (lingering)... 

Concrete: want erase(v), v < small_max, delayed[v] lingers; then all elements above v in small vanish via... they can only vanish via erase (with prune) or balance moves. Balance moves happen when s > l+1, which after erases is less likely (erase decrements sizes)... Let me just try small k and simulate mentally, or trust.

Honestly, I've spent enough; the canonical solution is verified correct by massive usage (LeetCode official editorial + countless AC). The balance-move-with-lingering-delayed-top scenario: let me check it once: balance moves small's top to large then calls prune(large). If moved top w has delayed[w] > 0: after push, large's top might be w; prune(large) pops it, delayed[w]−−. Size: s−− (at move), l++ then effectively the element leaves large physically without l−−. But wait: when w's delayed unit was created (erase(w) attributed to small, s−−), w physically stayed in small. Then balance: s−− again?? No — balance moves based on sizes; the move pops physical w and does s−−, l++. But s was already decremented for w at erase time! So s gets double-decremented?? Unless the sizes at balance time already didn't count w...

Hmm right, this is the crux: s counts valid elements. After erase(w): s excludes w. Physically w in small. Balance condition s > l+1: uses sizes. It pops physical top = w (a ghost). s−−: now s excludes w twice?? No wait — s is just a number; the question is whether s equals valid count in small. Before move: small physical includes ghost w; s = valid count ✓. Move: pop w (ghost), s−− → s now = valid count − 1 ✗. Undercount! Then push to large, l++ → l includes ghost w?? l should count valid. Then prune(large): pops w, delayed[w]−− (consuming the unit from erase(w)). Now large physical lost the ghost, but l was incremented for it. So l overcounts by... and s undercounts by 1. Then delayed[w] consumed — total consistent? Total s+l = k? Let's see: erase decremented s by 1 (for w). Move decremented s and incremented l (net +0 to sum? s−1, l+1: sum unchanged ✓). Prune pop: no size change. Total sum: k − (erases) + ... hmm sum should equal window size k after each full step. Let me count: valid elements k. Each erase: delayed++, size−− → sum = k ✓ maintained. Move: sum unchanged ✓. Prune: sum unchanged ✓. So sum stays k. But distribution s/l is off: s undercounts small's valid by 1, l overcounts large's valid by 1 — IF the moved element was a ghost. Then the "balance" is wrong by one, and median might read wrong tops... but wait — if the moved element was a ghost (delayed, not valid), then valid elements: small loses nothing, large gains nothing valid. s−− makes s = valid_small − 1?? Hmm no: before move, s = valid_small (including... w was ghost, so valid_small excludes w; s = valid_small ✓). After move: s = valid_small − 1. But w moved to large as ghost, pruned immediately (delayed[w] consumed). So after prune, large physical excludes w. valid_large unchanged, but l = valid_large + 1. Now s + l = k still? s+l = valid_small − 1 + valid_large + 1 = k ✓. But distribution wrong: the algorithm believes small has one fewer valid element than it does.

Does this break correctness? The invariant "s ≥ l, s ≤ l+1" is enforced on these drifted numbers. Median reads tops. If s is off by one, small might actually hold one more valid element than intended... but the partition property (all valid in small ≤ all valid in large) still holds physically. With drifted sizes, the algorithm thinks small has s valid but actually has s+1. For odd k, median = −small[0] = small's max — if small actually contains (k+1)/2 + 1 elements... that's not the median!

But hold on — can the scenario actually arise? Balance move requires s > l+1. For the moved top w to be a ghost, delayed[w] > 0 with w = small's physical top. But if w is small's physical top and delayed[w] > 0 — when delayed[w] was created (erase(w), w ≤ small_max), we called prune(small) if w == −small[0] at that time. If w < small_max then (middle), lingered. Then for w to become physical top, all physical elements above w in small must leave. Elements above w leave via: (a) prune pops during other erases — prune pops while top in delayed; when prune stops, top is not in delayed. Hmm, elements above w could be popped by prune if they're delayed. (b) balance moves to large. (c) they're still there! For w to surface, ALL physical elements ≥ w above it must leave small. Elements strictly greater than w in small: each either erased (prune-driven unwinding would then continue popping while delayed — when prune unwinds past them, does it pop w too? prune pops while top in delayed — if all elements above w got erased (delayed units exist for them), prune pops them one by one, reaches w: w in delayed → pops w too! Then w doesn't linger as top; it's consumed. So w lingers as physical top with delayed[w]>0 only if the elements above it left WITHOUT prune unwinding to w — i.e., via balance moves, or if prune stopped early (prune stops when top not in delayed — but if the element above w was erased, its delayed unit exists; prune pops it; continues...). Prune stops only at a non-delayed top. So between that point and w, all elements... after prune stops at non-delayed top u (u > w, u valid), for w to surface, u must leave: u valid, leaves via erase (→ prune unwinds: pops u's delayed unit, continues to next... pops while delayed — w IS delayed, so it pops w too!) or via balance move (u moved to large). If balance moves keep skipping over... balance moves pop the top each time. Each balance move: s > l+1. Hmm, so scenario: u (valid) moved to large via balance; then new top w (ghost, delayed) — but balance continues only if s > l+1 still. s was decremented... 

OK here's the thing: after balance moves u to large and prunes large (popping nothing relevant), small's top is w (ghost). Now s vs l: the move did s−−, l++. For balance to have triggered, s > l+1 before. After: s ≥ l+1... could be s = l+1 exactly (s = l_before + 2... ). The move happens once per insert. After the move, sizes: s−1, l+1 with s−1 ≥ l+1... 

You know what — the moved element being a ghost: at the moment of the move, is small's physical top necessarily valid? Earlier I argued tops are always valid because erase-of-top triggers immediate prune. Prune ensures: after any prune, top is valid (not delayed) or heap empty. Erase of a non-top middle element doesn't change the top. So the only way top becomes ghost: erase created delayed unit for value v, v not top at the time, and later v surfaces to top. When v surfaces: via prune unwinding (then it gets popped immediately — prune continues while top in delayed) or via... what else removes elements above v? Balance moves! Balance pops top (valid u), moves to large. Now v might be the new physical top of small, with delayed[v] > 0, and NO prune of small happens (balance pruned large instead). Then small's top is a ghost. Next operation: erase — reads −small[0] = v for comparisons; if the erased element x ≤ v: attribute to small, s−−. If x == v: prune(small): pops v, consuming the old unit ✓. If x < v: s−−, no prune — v still ghost top. Then insert: compares against v (ghost max!) — insert(y): if y ≤ v → small. But small's valid max might be less than v... pushing y ≤ v into small where actual valid max < y possible → partition violation! E.g., valid elements of small are {1, 3}, ghost v = 5 at top. insert(4): 4 ≤ 5 → pushed to small. But 4 > 3 = valid max of small → 4 belongs in large. Partition broken → median wrong.

Can this occur in the canonical solution? It requires: ghost v at small's top, and v > some valid element... wait v is a ghost with delayed[v] > 0, meaning v was erased. The valid elements of small are those not matched to delayed units. If v > valid max of small — the ghost v sits above valid elements. When was v erased? v ≤ small_max at that time (attribution rule). At that time, elements above v existed (v wasn't top, else pruned). Those elements above v were valid then. They must leave for v to surface. They leave via erase (→ prune unwinds and consumes v too — contradiction with v lingering) or via balance moves to large. So: elements above v moved to large via balance. Balance moves top of small to large when s > l+1. The moved elements are valid. After such a move, small's top = v (ghost). 

Now, sizes: each balance move of a valid element u: s−−, l++ — correct accounting (u valid, moves between heaps). So sizes remain correct through moves! The drift I worried about (moving a ghost) — here the moved elements are valid, so no drift. The ghost v stays in small, uncounted (s excluded it at erase time). So sizes remain correct: s = valid count in small ✓. The only issue: small's physical top is a ghost v, and insert comparisons use v. Is that a correctness problem? insert(y) with y ≤ v goes to small — but maybe y should go to large (if y > valid max of small). Then small gets a valid element y that's larger than... wait, but partition property is about valid elements: valid elements in small must be ≤ valid in large. If y > valid_max(small) but y ≤ v (ghost), y goes to small → possibly y > some... hmm, does y > all valid in small matter? The partition property needed for median: small's valid max ≤ large's valid min. If y is misplaced...

But actually, does it matter which heap y goes into, as long as... yes it does — median = f(tops). Tops: −small[0] is a ghost! −small[0] = v, but v was erased — median would read a ghost value! Wait, for odd k, median = −small[0] = v — but v is not in the window (it was erased). That's plainly wrong... unless the ghost gets consumed before median is read. Sequence per step: erase, insert, read median. The ghost surfaces during... let me re-examine: ghost v surfaces to small's top via balance move (moving valid u above it). Balance happens inside insert. Then median is read after insert. If small's top is ghost v at median-read time → wrong median.

But wait — can the ghost actually surface? Balance move requires s > l+1 (strict). Hmm, let me try to construct a full failing example... Actually, let me reconsider: maybe when balance moves and the new top is a ghost, we should prune small — but the canonical code prunes the DESTINATION heap (large). Hmm, actually let me reconsider the canonical code — maybe it prunes the source... Let me recall the official Java code exactly (from LeetCode editorial "Sliding Window Median" official solution - "two heaps with lazy deletion"):

```java
class DualHeap {
    private PriorityQueue<Integer> small;
    private PriorityQueue<Integer> large;
    private HashMap<Integer, Integer> delayed;
    private int smallSize;
    private int largeSize;
    private int k;

    public DualHeap(int k) {
        this.small = new PriorityQueue<>(Collections.reverseOrder());
        this.large = new PriorityQueue<>();
        this.delayed = new HashMap<>();
        this.k = k;
    }

    private void prune(PriorityQueue<Integer> heap) {
        while (!heap.isEmpty()) {
            int num = heap.peek();
            if (heap == small) num = -num;
            if (delayed.containsKey(num)) {
                delayed.put(num, delayed.get(num) - 1);
                if (delayed.get(num) == 0) delayed.remove(num);
                heap.poll();
            } else break;
        }
    }

    private void makeBalance() {
        if (smallSize > largeSize + 1) {
            large.offer(small.poll());
            smallSize--;
            largeSize++;
            prune(large);
        } else if (smallSize < largeSize) {
            small.offer(-large.poll());
            largeSize--;
            smallSize++;
            prune(small);
        }
    }
    ...
```

Hmm wait, in makeBalance moving from large to small: `small.offer(-large.poll())`. And it prunes the source? "prune(small)" — small is the destination here (element added to small). So prune(destination)? Moving large→small: destination small, prune(small). Moving small→large: destination large, prune(large). So prune(destination)?? That seems odd — why prune destination? The moved element is now at destination's top region; if it's delayed (ghost), prune(destination) pops it. Ah — so the canonical code DOES handle moving ghosts: after moving, it prunes the destination, which removes the moved element if it's a ghost. And when moving a ghost from source: the source's size... the move s−−/l++ — for a ghost, hmm.

Hold on, when does a ghost get moved? Balance pops small's physical top. If that's a ghost w: s−− (double-decrement for w?) — no wait. Let me re-derive: the scenario "ghost surfaces at small's top via balance moves of valid elements above it" — in the canonical code, when balance moves u (valid) to large, it then prunes LARGE. Small's top is now ghost v — no prune of small. Ghost still there. Then the NEXT balance move pops small's top = ghost v: s−−, push to large, l++, prune(large): pops v (delayed), consuming unit. Net effect on accounting: erase(v) did s−− (correct: v no longer valid). Move: s−−, l++ — but v wasn't counted in s! So s loses an extra... 

Wait, I need to be very careful: s is a plain integer. Let me track it as: s should equal number of valid elements in small. Let me audit each operation's effect:
- insert to small: physical++, s++. If pushed to correct side, valid_small++ and s++ ✓.
- erase(x) attributed small: s−−, delayed[x]++. valid_small−− (the erased element, if it was in small... attribution). s−− ✓ assuming attribution correct.
- balance small→large: physical move, s−−, l++. If moved element valid: valid_small−−, valid_large++ ✓. If moved element ghost: valid_small unchanged (ghost not counted), but s−− → s now undercounts by 1? AND l++ with valid_large unchanged → l overcounts. Then prune(large) pops the ghost: physical large−−, delayed−−. valid_large still unchanged, l still overcounted. So drift persists?? Unless... hmm, but wait: if the moved element is a ghost, its delayed unit is consumed by prune(large) — that unit's creation had decremented s. The move also decremented s. So s decreased by 2 total for one ghost, while valid_small decreased by 0... but then later, when the ghost's "slot"... ugh.

Hmm, hold on. Maybe I'm overcomplicating. Let me reconsider: maybe ghosts can never be at the top when balance moves, i.e., every physical top is always valid at balance time. Ghost at top arises only if: delayed unit created for v (not top), and later v surfaces. v surfaces when all physical elements above v leave small. As established, elements above v leave via prune (which would unwind into v and consume it — since prune pops while top is delayed, and v is delayed... wait, prune pops while top is in delayed; when unwinding reaches v (delayed), it pops v too, consuming the unit — so v can't surface via prune unwinding without being consumed). OR elements above leave via balance moves. Balance moves happen inside insert, and each balance move is followed by prune(destination). Sequence: elements above v: u1 > u2 > ... (stack). Balance moves u1 to large (prune large). Now top could be u2 or v. If u2 still there, next balance moves u2... eventually v surfaces to top. Then a subsequent balance move pops v (ghost) → drift as analyzed. OR an erase triggers prune(small) when top is ghost v: erase(x): if x == v (top): prune pops v, consuming unit ✓ no drift. If x < v... but wait, can x < v while v is a ghost? x is being erased from the window; x ≤ −small[0] = v → attributed small, s−−. x is valid (in window). x physically in small below v. s−− ✓. No prune (x ≠ top). Ghost v still top. Then insert(y): compares y ≤ v. If y > v → large. Fine. If y ≤ v → small: but small's valid max might be < y! Then y placed in small though it exceeds valid max. Partition broken?

Let me just try to construct a concrete failing case and simulate the canonical algorithm by hand. This is taking very long, but correctness matters. Alternatively — screw it, I could implement the two-heaps in the "rebalance on both operations" style, or use a cleaner method: maintain heaps with known-k window and use the "lazy deletion + rebalance every iteration" where I re-derive carefully. OR use a much simpler provably-correct approach.

Simplest provably-correct efficient approach: sorted list with bisect (approach 1). Let me just estimate performance more carefully and maybe optimize.

Actually, there's another clean approach: maintain a sorted list and use indices — no. Or maintain counts... Alternatively: "two heaps without lazy deletion, rebuilding..." no.

Actually, let me settle the dual-heap correctness by just simulating the canonical algorithm on a brute-force-checkable scenario in my head... too error-prone. Alternative: implement dual heap but call prune on BOTH heaps' tops before reading median, and rebalance based on... no — sizes drift is the issue, not tops.

Alternative clean implementation: maintain the window as a sorted list, but do removal/insertion via index bookkeeping with a fixed-size array... still O(k).

Alternative: use `heapq` with the "lazy deletion" but keep the window's sorted order via a different structure: the classic approach for sliding median that's simple and correct: keep a sorted list `window`; for each slide, remove outgoing via `window.pop(bisect_left(window, old))` and insert incoming via `insort`. This is unconditionally correct. Performance is the only question. Let me optimize the constant factor:

- Inline median computation without function calls.
- Use local variable bindings for bisect_left, insort.

Per iteration: bisect_left (C, ~0.2µs for k=1000), list.pop(idx) (C memmove), insort (C: bisect + insert memmove), plus ~6-8 Python bytecode ops. Python-level maybe 0.5µs + memmoves: pop shifts ~500 elements avg (4KB), insort shifts ~500 (4KB) → 8KB/iter → 200k iters → 1.6GB → ~0.2-0.3s. Total maybe 0.4-0.7s. That's fine, "well under 2 seconds."

Also median: k//2 precomputed; per iteration: `m = half; if k & 1: r = float(window[m]) else: r = (window[m-1] + window[m]) / 2`. Cheap.

Hmm, but worst case with floats, comparisons fine.

Actually, wait: I realize the drift question for dual heaps — let me just do one final decisive check on whether ghost-at-top-under-balance can occur, because if the canonical solution is correct (it is — it's the official editorial solution, and I'm fairly confident the official editorial handles this correctly), fine, but my reproduction might have subtle deviations. The sorted-list approach is trivially correct. Given the performance estimate is acceptable (~0.5s for the stated benchmark), I'll go with sorted list. Actually, let me double check the perf claim "n=200,000 with k=1,000 must finish well under 2 seconds."

Let me count Python-level operations per iteration:
```
idx = bisect_left(window, old)   # C call, ~100ns? bisect on list of floats: log2(1000)=10 comparisons in C ~ 100-200ns
window.pop(idx)                   # C, memmove avg 500*8=4KB ~ 100-300ns
insort(window, new)               # C: bisect + memmove ~ 300ns
# median:
if k_odd: med = window[half] ... float() wrap
res.append(med)
```
Loop overhead, tuple-free: maybe ~0.8-1.5µs per iteration total → 200k → 0.2-0.3s. Plus initial sort trivial. Yes, comfortably under 2s. 

One more optimization: for odd k, avoid float() call — just ensure result is float: window[half] is a float already since nums are floats. The problem says list[float] input, return floats. For even k, (a+b)/2 is float. For odd k, the element is already a float (or could be int if user passes ints — the problem says list[float], but to be safe, wrap with float()? If nums contains ints, median should still return float. The signature says list[float]; but being safe: for odd k return float(window[half]). float() on a float returns same object quickly (~50ns). Fine, keep it for robustness.

Hmm, actually should I make it faster/safer with the dual heap? Given uncertainty in my dual-heap analysis, sorted list wins on correctness confidence. But let me reconsider dual-heap once more with a definitive small example including a ghost-top-balance scenario, since dual heap is asymptotically better... 

Actually, you know what, there's a cleaner provably-correct O(n log k) approach: index-pairing with two multisets is complex; but there's the approach: keep a sorted list implemented as... no.

Alternative provably correct + fast: two heaps WITHOUT lazy deletion, using "remove-and-rebalance with heap removal"? heapq can't delete arbitrary elements.

Alternative: maintain two heaps where we physically rebalance every step by... no.

Another clean one: maintain a single min-heap and max-heap with clean... same issues.

Alternatively: maintain the window sorted with bisect but use array-based skip... no.

Decision: sorted-list bisect approach. Simple, correct, fast enough. Let me also micro-optimize: bind methods.

Actually, one more consideration: instead of pop+insort (two memmoves), we could... there's a trick: if new == old, skip. Also common case? Not guaranteed. Keep simple.

Let me also double check edge cases: k == len(nums): loop runs zero times after initial, returns one median ✓. k == 1: window always [x], median = x ✓ (odd, half = 0). len(nums) < k → ValueError ✓. k < 1 → ValueError ✓. Also k > len(nums) check. Empty nums with k>=1: k > 0 = len → ValueError ✓.

Also should handle NaN? Not required.

Code:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums), inclusive")

    window = sorted(nums[:k])
    half = k // 2
    odd = k % 2 == 1

    if odd:
        med = float(window[half])
    else:
        med = (window[half - 1] + window[half]) / 2.0
    result = [med]

    bl = bisect.bisect_left
    insort = bisect.insort
    pop = window.pop
    append = result.append

    for i in range(k, n):
        old = nums[i - k]
        new = nums[i]
        if new != old:
            idx = bl(window, old)
            # window[idx] == old guaranteed
            del window[idx]
            insort(window, new)
        if odd:
            append(float(window[half]))
        else:
            append((window[half - 1] + window[half]) / 2.0)

    return result
```

Note: bisect_left finds leftmost occurrence of old; since old is in the window, window[idx] == old exactly (value equality). Deleting by value: any copy equal to old is fine since values are interchangeable for median. But careful: floats — if old is NaN, bisect breaks; ignore. If there are duplicates, removing leftmost copy equal to old — fine.

Wait, subtlety: if old and new are equal (`new != old` check skips) — fine, multiset unchanged.

Also `del window[idx]` vs `window.pop(idx)` — same. 

The `new != old` skip: careful when old/new are NaN — != is True for NaN, causing insort of NaN... edge case, ignore.

Hmm, but one concern: when new != old but window lacks... old is always in window by invariant ✓.

This is O(n·k) worst case for memmove but C-fast. For k=1000, n=200000: fine.

Should I also guard against ints in input for the odd-case float()? Already using float().

Wait, but for odd k, `float(window[half])` — if the element is a float, float() returns it (new ref). OK.

Let me also consider: should I add a fast path using the dual-heap for large k? The problem only specifies the benchmark k=1000. Sorted list handles it. But what if k is large, e.g., k = 100000, n = 200000? Then memmove 800KB per op × 200k = 160GB → ~30+ seconds. The problem statement only requires the n=200k, k=1000 case to be fast. But to be safe/robust, maybe implement the dual-heap? Hmm, the requirement explicitly states the benchmark: "n = 200_000 with k = 1_000 must finish in well under 2 seconds." So sorted list at ~0.3-0.6s meets it. But if a grader tests other sizes... The stated requirement is the one to meet. Still, I'd like more robustness.

Let me reconsider implementing the dual heap correctly after all. Let me settle the ghost-at-top question with a brute-force mental test... Actually, let me think about it more cleverly. 

Alternative hybrid: use the sorted-list approach but note that the real hot cost is fine. I'll go with sorted list. Actually, hmm, let me reconsider the dual heap correctness one final time with a targeted example, because if I can convince myself, dual heap is strictly better (handles all k sizes).

Targeted scenario for ghost top + balance:

We need: delayed[v] > 0 with v not at top, elements above v in small leave via balance moves (valid elements moving to large), then balance pops v (ghost) from small.

Balance small→large requires s > l+1. Each erase decrements s or l. Let me attempt with k large enough.

Let me try to construct: small = {10, 9, 8(v)}, large = {} ... need s > l+1.

Start: insert 8, 9, 10 (k will be 5, add more later):
- i8: small=[-8], s=1.
- i9: 9≤8? no → large=[9], l=1.
- i10: 10≤8? no → large=[9,10], l=2. balance: s=1<l=2 → move 9→small: small=[-9,-8], large=[10], s=2,l=1.
State: small {8,9}, large {10}.

- insert 11: 11≤9? no → large=[10,11], l=2. s=2,l=2. (k=4 so far: {8,9,10,11}, median (9+10)/2).
- insert 12: large=[10,11,12], l=3. balance: s=2<l=3 → move 10→small: small=[-10,-9,-8], large=[11,12], s=3,l=2.
- Now k=5: {8,9,10,11,12}. s=3,l=2 ✓. median = 10.
- erase(8): 8 ≤ 10 → s=2; 8 ≠ 10 → no prune. delayed={8:1}. Ghost 8 in small (below 10, 9).
- insert 13: 13 ≤ 10? no → large=[11,12,13], l=3. balance: s=2 < l=3 → move large top 11 → small: small=[-11,-10,-9,-8], large=[12,13], s=3, l=2. prune(small): top 11 in delayed? delayed={8:1} → no. 
  Hmm, the ghost 8 is still buried (above it: 9,10,11). Balance moved a valid element into small on top. Now to surface ghost 8, elements 9,10,11 must leave small. They leave via erase+prune (which would consume ghost 8 when reached — fine, no drift) or balance moves small→large (requires s > l+1: s=3, l=2 → 3 > 3? No). Hmm, to get s > l+1, insert pushes to small. Insert pushes to small only if num ≤ −small[0] = 11 (ghost? no, 11 is valid). So insert x ≤ 11: if x ≤ 11, push small, s=4: balance: s=4 > l+1=3 → move small top 11 → large: s=3, l=3. prune(large): top 11, delayed {8}? no. Now small top = 10, ghost 8 still below 9. Need more balance moves: s=3, l=3 → no move. To move 10 out: need s=4: insert ≤ 10... this isn't surfacing 8 quickly.

For the ghost to surface via balance moves, we need repeated s > l+1 conditions, each moving one top element. Each such move must not be preceded by prune unwinding... Between moves, inserts happen. Let me try: make window where small keeps receiving new small elements and losing... each balance move requires an insert first. And inserts to small require num ≤ current top. Let me try to design:

Window k=5. Get: small={2,3,4,5(ghost)}, large={6,7}: s=3 (valid 2,3,4), l=2? Wait ghost 5 means 5 erased. Let me aim: valid small {2,3,4}, ghost 5 on top, large {6,7}: s=3, l=2, total valid 5 = k ✓.

How to reach: insert 2,3,4,5,6,7 over time with k=5, erasing... Let me simulate: k=5.

Phase 1: insert 5,6,7,8,9: 
- 5: small=[-5], s=1.
- 6: large=[6], l=1.
- 7: large=[6,7], l=2. bal: s=1<l=2 → move 6→small: small=[-6,-5], large=[7], s=2,l=1.
- 8: large=[7,8], l=2. s=2,l=2.
- 9: large=[7,8,9], l=3. bal: s=2<l=3 → move 7→small: small=[-7,-6,-5], large=[8,9], s=3,l=2.
Window {5,6,7,8,9}, median 7 ✓ (small top 7).

Phase 2: erase(5), insert(10):
- erase 5: 5 ≤ 7 → s=2; 5≠7; delayed={5:1}. Ghost 5 in small below 6,7.
- insert 10: 10 ≤ 7? no → large=[8,9,10], l=3. bal: s=2<l=3 → move 8→small: small=[-8,-7,-6,-5], large=[9,10], s=3,l=2. prune(small): top 8 ∉ delayed.
Window {6,7,8,9,10}: median 8 ✓ (small top 8, s=3 valid {6,7,8} ✓, ghost 5 buried).

Phase 3: To surface ghost 5, need 6,7,8 to leave small via balance. Balance small→large needs s > l+1, i.e., s ≥ l+2. Currently s=3,l=2: 3 > 3? No. Need s=4,l=2 or s=4,l=1... erase decrements l: erase(6): 6 ≤ 8 → attributed small! s=2. Hmm, erases of elements ≤ small top attribute to small. To decrement l, must erase > small top: erase(9) or 10. erase(10): 10 ≤ 8? No → l=1, and 10 == large[0]=10 → prune(large): pop 10, delayed={5:1,10:1}. large=[9], l=1. Now s=3, l=1: s > l+1=2 → but balance only runs inside insert! Next insert(x): if x ≤ 8 → small: s=4 → bal: s=4 > l+1=2 → move small top 8 → large: s=3, l=2. prune(large): large top 8? pushed 8, top=min(9,8)=8, delayed={5,10} → 8 not delayed → stop. Small top now 7.
insert next ≤ 7 → small: s=4 → bal: s=4 > l+1=3? 4>3 yes → move 7 → large: s=3, l=3?? wait l=2 → l=3, s=4-1=3. prune(large): top 7 ∉ delayed. Small top now 6. Ghost 5 still buried below 6! Argh — moving 6,7,8 out requires them to be popped as tops, each requiring s > l+1. Each move: s−−, l++. After moving 8: s=3,l=2 (from s=4,l=1). After moving 7: need s > l+1: s=3, l=2 → 3 > 3 no! Balance won't fire. Hmm. So to move 7 out, need s=4 again: insert ≤ 7 → small: s=4 → bal: move 7 out. Each element above the ghost needs its own insert+move cycle, but inserts to small add valid elements to small, and moves remove tops... each cycle: insert(x ≤ top) then move(top). Net: small's valid count stays 3? Insert x: valid_small +1, s+1; move top: s−1... the moved top is valid (7): valid_small −1. So small valid stays, sizes stay. The elements moved out are the larger ones; x inserted is smaller. So small valid set: {6, 5?...} — wait 5 is ghost. Small valid: {6, x1, x2}... To surface ghost 5, need ALL valid elements > 5 out of small AND... small's physical top after moving everything above 5: top = 5 (ghost) — but the moves pop physical tops: after 6 is moved out, physical top is ghost 5. Then next balance pops ghost 5: s−− (drift!), push to large, prune(large) pops it, consuming delayed[5].

Wait, but hold on: to move 6 out, need balance condition s > l+1 at that time. Let's see if we can orchestrate: 

Continue from end of phase 3: s=3, l=3, small phys {6, 5ghost}, large {7, 9}?? Hmm wait I had large = {8→moved, 9, ...}. Let me redo carefully with explicit state.

This is getting really messy. Let me instead just write the canonical algorithm and test it mentally against a brute force on a small case... I can't run code. OK.

Decision time. Options:
(A) Sorted list: provably correct; meets stated perf requirement (k=1000). Risk: slow for very large k (not required).
(B) Dual heap: fast for all k, but I have residual doubt about ghost-top edge cases (though it's the official LC editorial solution — which I'm 95% sure is correct; the editorial solution has been validated by huge usage).

Actually — wait. I recall the official editorial's makeBalance prunes the destination, and there's a known subtlety... Let me look at this from a different angle: the official editorial code for LC 480 (I've seen it):

```python
class DualHeap:
    def __init__(self, k):
        self.small = []
        self.large = []
        self.delayed = defaultdict(int)
        self.smallSize = 0
        self.largeSize = 0
        self.k = k

    def prune(self, minHeap):
        if minHeap:
            if minHeap is self.small:
                num = -minHeap[0]
            else:
                num = minHeap[0]
            ... 
```

Hmm, I actually recall the official prune only prunes ONE element? No... The official solution's prune:

```python
def prune(self, minHeap):
    while minHeap:
        if minHeap is self.small:
            num = -minHeap[0]
        else:
            num = minHeap[0]
        if num in self.delayed:
            heapq.heappop(minHeap)
            self.delayed[num] -= 1
            if not self.delayed[num]:
                del self.delayed[num]
        else:
            break
```

Hmm no, wait — there's a subtlety I now remember: the delayed counter pruning `while top in delayed` — this pops the top even if... if top value v is in delayed with count c, but there are MORE physical copies of v in the heap than c (some valid)... it pops them all while v remains in delayed... it pops exactly one copy per unit of delayed[v], decrementing. Once delayed[v] hits 0, key deleted, stop. So it pops min(c, copies-at-top...) — pops while v in delayed: each pop decrements. It stops when delayed[v] becomes 0 (key deleted) — so it pops exactly... it pops copies of v as long as delayed[v] > 0; each pop decrements; so it pops until delayed[v] = 0 OR top ≠ v. If delayed[v]=3 but only 1 physical copy at top and next top is different value: pops 1, delayed[v]=2, top now different → break. Lingering delayed[v]=2 with other copies of v deeper? They'd surface later and get popped then. Consistent.

I'm now fairly convinced the algorithm is correct — it's the official editorial and I remember the key invariants hold; my drift worry: let me just resolve it with the trace attempt but more carefully, since I keep going back and forth. Actually, let me think about the drift worry rigorously with a clean formal claim:

Formal setup: Let S = physical elements in small, L = physical in large, D = delayed multiset (counts). Valid elements V = (S ∪ L) \ matched(D) — where matching between delayed units and physical copies is established by prune operations over time (a delayed unit is matched to the physical copy popped when consumed). Claim: the algorithm maintains: s = |V ∩ S|... 

Ugh. Alternatively — pragmatic resolution: implement BOTH? No. 

Pragmatic: implement the sorted-list solution. It meets the stated requirement with big margin. The requirement is explicit about the benchmark. Ship it.

Actually, let me reconsider performance once more, being pessimistic: per iteration cost components:
1. `nums[i - k]` and `nums[i]`: index ops ~50ns each.
2. `new != old` comparison: ~30ns.
3. `bisect_left(window, old)`: ~200ns.
4. `window.pop(idx)`: memmove avg k/2 elements: for k=1000, 4KB → ~150-300ns.
5. `insort(window, new)`: bisect + memmove ~300ns.
6. median: few ops ~200ns.
7. append: ~40ns.
8. loop overhead ~50ns.

Total ~1-1.3µs → 200k iters → ~0.25s. 

But memmove estimate: CPython list.pop and insert use memmove; 4KB memmove ~ 100-200ns (memmove bandwidth tens of GB/s). Fine. Even at 3µs/iter → 0.6s. Safe.

One more thing: `range(k, n)` vs iterating with enumerate — fine.

Also the initial median: handle via same code path? I'll compute initial then loop. Or simpler: iterate over all n-k+1 windows uniformly: initialize window = sorted(nums[:k]), append median, then loop from k. Done above.

Edge: k == n: range(n, n) empty → single median ✓.

Also note: `nums[:k]` copies k elements — fine.

Type hints: `from __future__` not needed (3.11). Use `list[float]`.

Let me also add the ValueError message. And ensure no printing/tests.

Final code:

```python
import bisect


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k."""
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    window = sorted(nums[:k])
    half = k >> 1
    odd = k & 1

    if odd:
        result = [float(window[half])]
    else:
        result = [(window[half - 1] + window[half]) / 2.0]

    bisect_left = bisect.bisect_left
    insort = bisect.insort
    pop = window.pop
    append = result.append

    for i in range(k, n):
        new = nums[i]
        old = nums[i - k]
        if new != old:
            pop(bisect_left(window, old))
            insort(window, new)
        if odd:
            append(float(window[half]))
        else:
            append((window[half - 1] + window[half]) / 2.0)

    return result
```

Hmm, one subtle bug: `pop(bisect_left(window, old))` — bisect_left returns the index of the first element ≥ old; since old ∈ window, window[idx] == old ✓. But floating point: if old appears via different bit patterns... equal floats compare equal, fine.

Another subtlety: when `new != old` is False but they're different objects with equal value — skipping is correct (multiset unchanged).

NaN handling: not required.

Should I worry that the problem wants strictly floats even for odd k with float inputs — float() handles ints too. Good.

I think this is solid. Let me also consider adding a docstring and keeping code clean. Done.