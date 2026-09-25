We need a sliding median with two heaps plus lazy deletion, or a sorted list with bisect and insort. The sorted-list approach: for each step, remove outgoing element (O(n) removal from list) and insert incoming (O(n) insertion). With n = 200,000 and k = 1000, each removal/insertion is O(k) = O(1000), total ~ 200,000 * 1000 * small constant ≈ 200 million element moves... Actually memmove-based operations in CPython list are implemented in C, so list.pop(index) and insort are memmove operations which are very fast (roughly memmove of 1000 pointers = 8KB, very fast). 200k * memmove of 8KB twice ≈ 200k * ~2-3 microseconds ≈ 0.5s or less. Actually memmove of 8KB takes maybe ~300-500 ns; total is fine. The bisect itself is O(log k). This is the simplest and quite fast approach. Known competitive programming approach: sortedcontainers isn't available (stdlib only), so bisect on a list is a standard trick and works well for k up to a few thousand.

Alternative: two heaps with lazy deletion: O(n log n) with heap sizes potentially growing. That's also fine. But bisect approach is simpler and precise.

Implementation:

```python
import bisect

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    window = sorted(nums[:k])
    result = []
    # helper to compute median
    ...
```

For speed, avoid function-call overhead per step? Minor. Let's write inline.

Median computation: mid = k // 2. If k odd: window[mid] — but for odd k, median is window[k//2]. If k even: (window[k//2 - 1] + window[k//2]) / 2.

Loop:

```python
    res = []
    append = res.append
    win = sorted(nums[:k])
    out_index ... 
```

We need to remove nums[i] and add nums[i+k] each step. Instead of searching for the outgoing value each iteration (bisect O(log k)), fine. Using bisect_left to find position of old value; there might be duplicates but any is fine since values equal.

```python
import bisect
from bisect import insort, bisect_left

def sliding_median(nums, k):
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError(...)
    win = sorted(nums[:k])
    medians = []
    mid = k // 2
    if k % 2:
        medians.append(float(win[mid]))
        for i in range(k, n):
            old = nums[i - k]
            new = nums[i]
            pos = bisect_left(win, old)
            win.pop(pos)
            insort(win, new)
            medians.append(float(win[mid]))
    else:
        ...
```

Actually can unify: compute median after each update. But first window median computed before loop.

We could also handle removal differently: if old == new, skip removal/insertion entirely — common optimization. Then still need to recompute the median but it's the same? No — if old==new, the multiset is unchanged, so the median is unchanged. So append previous median. That's an optimization for plateau data.

Also note float conversion: nums may contain ints; median should be float. window[mid] may be int. We return float. For even k, division gives float. For odd k, wrap with float().

Alternatively, convert everything to floats upfront: win = sorted(map(float, nums[:k])) and iterate over floats. That avoids repeated float() calls. nums[i] accessed as float(nums[i])? Just convert once: vals = nums (keep as is); but indexing returns int; wrap in float at append time. Simpler: convert nums copy? Not needed; the list is float-annotated anyway. But to guarantee float output, do float(win[mid]).

Even simpler: since for odd k median = win[mid], and we want float: float(win[mid]).

Performance concern: building medians list with 199,001 elements, fine.

Total loop body: ~ (bisect_left + pop + insort) ≈ maybe 1-2 µs per iteration in CPython? bisect is C, pop is C (memmove), insort is C. Each maybe ~300-600 ns. Plus Python interpreter overhead ~ maybe 1µs. 200k iterations → ~0.3-0.5s. Well under 2s. Good.

But worst-case: pop from index 0 of a 1000-element list is memmove of ~8KB — tiny. Good.

Edge cases: k == n → no loop, one median. k == 1 → win = [x], loop for each step: remove old, insort new — median = the element. Efficient enough. Could special-case k==1 to be O(n): result = [float(x) for x in nums]. Nice optimization but not required. Let's add it cheaply? It's a one-liner; but adds branching. It's fine to include.

Actually, wait: with k=1, the general loop still works: pop and insort each step, median = win[0]. Fine but slow-ish relative to simple. Include special case for cleanliness? The problem says k = 1000 for the benchmark. I'll include a k==1 fast path anyway—harmless.

Also handle the ValueError message.

Type hints: `def sliding_median(nums: list[float], k: int) -> list[float]:`

Let me also consider the two-heap approach for theoretical O(n log n), but constant factors and Python overhead make heap approach ~ similar or slower; bisect approach is simpler and precise. There's a subtle concern: the bisect approach is O((n) * k) in memmove time, which for k=1000 is fine, but the prompt only requires that benchmark. I'll mention nothing; just code.

One more micro-optimization: localize bisect_left and insort references.

Implementation plan:

```python
from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if not 1 <= k <= n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    win = sorted(nums[:k])
    res = []
    append = res.append
    bl = bisect_left
    ins = insort

    if k % 2:  # odd
        half = k // 2
        append(float(win[half]))
        prev = win[half]
        for i in range(k, n):
            new = nums[i]
            old = nums[i - k]
            if old != new:
                pos = bl(win, old)
                # remove
                del win[pos]
                ins(win, new)
            m = win[half]
            append(float(m))
        return res
    else:
        lo = k // 2 - 1
        hi = k // 2
        append((win[lo] + win[hi]) / 2)
        for i in range(k, n):
            new = nums[i]
            old = nums[i - k]
            if old != new:
                pos = bl(win, old)
                del win[pos]
                ins(win, new)
            append((win[lo] + win[hi]) / 2)
        return res
```

Wait: `prev` unused for odd path — remove it. Also even path division: (a+b)/2 always float in Python 3 (true division). Good — returns float even for ints. Good.

Also, for even k, note (win[lo]+win[hi])/2 — could overflow? Values are floats; fine.

One subtlety: `del win[pos]` where pos found via bisect_left(win, old) — guaranteed to find because old is present in win. Yes: win always contains exactly the multiset of current window elements. bisect_left returns index of first element == old. Good.

The old != new fast path: when equal, multiset unchanged. Good.

Another micro-optimization: avoid recomputing float() each time — necessary since value changes. Fine.

Could also avoid index arithmetic: iterate over pairs. e.g. use zip(nums, nums[k-1:])? Actually outgoing at step i (for i in range(k, n)) is nums[i-k], incoming nums[i]. We could do:

```python
for old, new in zip(nums, nums[k:]):
```

Wait: when the window slides from [0..k-1] to [1..k], old = nums[0], new = nums[k]. zip(nums, nums[k:]) pairs nums[j] with nums[j+k]. At the first slide, old index = i-k = 0 and new index = i = k → j=0 pairs (nums[0], nums[k]). Next j=1: (nums[1], nums[k+1]) corresponds to slide i = k+1 with old nums[i-k] = nums[1]. Yes! So `zip(nums, nums[k:])` iterates exactly the needed pairs for len = n-k steps. That's cleaner and faster (iterator, no index arithmetic, no separate nums[i-k] and nums[i]).

zip(nums, nums[k:]) creates nums[k:] copy — O(n) memory, fine.

So:

```python
    if k % 2:
        half = k // 2
        append(float(win[half]))
        for old, new in zip(nums, copy := nums[k:]):
```

Hmm, avoid walrus confusion; just `for old, new in zip(nums, nums[k:]):`.

Loop body:

```python
        for old, new in zip(nums, nums[k:]):
            if old != new:
                del win[bisect_left(win, old)]
                insort(win, new)
            append(float(win[half]))
```

For even:

```python
        lo = (k >> 1) - 1
        append((win[lo] + win[k >> 1]) / 2)
        for old, new in zip(nums, nums[k:]):
            if old != new:
                del win[bisect_left(win, old)]
                insort(win, new)
            append((win[lo] + win[hi]) / 2)
```

This is clean.

Note on k==1 special case: even k path with k=1 doesn't occur; k==1 is odd; win sorted of one element, zip works: pairs (nums[0], nums[1]), etc. Actually for k=1, the general code works fine too. But float conversion per step plus pop/insort overhead — negligible. I could drop the special case entirely for simplicity. Hmm, keeping it adds code but is trivially correct. Simplicity: I'd keep it — it's a one-liner and makes k=1 O(n). Actually let me reconsider: with k=1, bisect path: del win[0], insort. Both tiny. It works. I'll drop the special case to keep code minimal? The problem statement didn't ask. But efficiency claim: n=200k, k=1000. Fine either way. I'll keep the special case—it's cheap and strictly faster for k=1. Eh. Let me think about code quality: an expert solution would likely include it. Fine, keep.

Also validate n == 0: then k > n for any k ≥ 1 → ValueError. If nums empty and k=0: k<1 → ValueError. Good: `if k < 1 or k > n: raise ValueError`.

Note `1 <= k <= n` handles both.

Return type: list[float]. Medians appended as float via float() or true division. Good.

Docstring: include brief.

One more precision consideration: mean of two middle values as (a+b)/2 could overflow to inf if a,b near max float. Using a/2 + b/2 avoids that but changes result slightly? (a+b)/2 vs a/2+b/2 can differ in rounding. Standard definition "mean of the two middle values" — (a+b)/2 is standard. Keep (a+b)/2. Actually `statistics` module's median returns (a+b)/2 as well (uses (a + b) / 2? It computes (a+b)/2 via `_compute_median`? statistics.median does `(data[i - 1] + data[i]) / 2`). Yes matches.

Final code:

```python
from bisect import bisect_left, insort


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every size-k contiguous window of nums.

    For even k the median is the mean of the two middle order statistics.
    Raises ValueError if k < 1 or k > len(nums).
    """
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    win = sorted(nums[:k])
    medians: list[float] = []
    emit = medians.append
    bisect_left_ = bisect_left
    insort_ = insort

    half = k >> 1
    if k & 1:  # odd window
        emit(float(win[half]))
        for old, new in zip(nums, nums[k:]):
            if old != new:
                del win[bisect_left_(win, old)]
                insort_(win, new)
            emit(float(win[half]))
    else:  # even window
        lo = half - 1
        emit((win[lo] + win[half]) / 2)
        for old, new in zip(nums, nums[k:]):
            if old != new:
                del win[bisect_left_(win, old)]
                insort_(win, new)
            emit((win[lo] + win[half]) / 2)
    return medians
```

Renaming to bisect_left_ looks awkward; alternative: `from bisect import bisect_left as bl, insort as ins` — also awkward. Local binding inside function: `bisect_left = bisect_left`? That creates a local alias shadowing... you can't `from ... import bisect_left` then assign local `bl = bisect_left` — that's fine and clean: `bl = bisect_left`. Common micro-opt. I'll do:

```python
    _find = bisect_left
    _insert = insort
```

Or just use module-level names directly (LOAD_GLOBAL is slower but with caching in 3.11+, LOAD_GLOBAL is cheap). Python 3.11 has adaptive specialization making global lookups fast. Keep direct names for readability: bisect_left(win, old), insort(win, new). Fine.

Complexity: each step O(log k) search + O(k) memmove. Total O(n·k) worst-case element moves, but those are C-level moves. For the stated benchmark ~ well under 2 seconds.

Should I mention heap alternative? The instructions say reply with a single python code block, no extra text. So output just the code block. Maybe a brief comment in code notes complexity.

Add comments noting O(log k) search, O(k) memmove.

Double-check correctness with a small mental example: nums = [1,3,2,4], k=3 (odd). win = sorted([1,3,2]) = [1,2,3]. half = 1 → median 2.0. Slides: pairs zip(nums, nums[3:]) = [(1,4)]. old=1,new=4: win becomes [2,3,4]; median win[1]=3.0 → medians [2.0, 3.0]. Correct: windows [1,3,2] → 2; [3,2,4] → 3. n-k+1 = 2 values. ✓

Even example: nums=[1,2,3,4], k=2. win=[1,2], half=1, lo=0 → (1+2)/2=1.5. Slides: zip(nums, nums[2:]) = [(1,3),(2,4)]. Step1: old=1,new=3 → win=[2,3] → (2+3)/2=2.5. Step2: old=2,new=4 → win=[3,4] → 3.5. Result [1.5,2.5,3.5] — n-k+1=3 ✓.

k = n case: zip(nums, nums[k:]) → nums[k:] empty → no loop, single median. ✓

Duplicates: nums=[2,2,2], k=2: win=[2,2]; median (2+2)/2=2.0. Slide pairs: zip(nums, nums[2:]) = [(2,2)] → old==new → skip; median (2+2)/2=2.0. ✓

ValueError message includes both constraints.

Ensure floats: for odd k, float(win[half]) — win elements might be ints if input ints; float() ensures. Even path true division → float. k==1 path float(x). ✓

Also ensure nums[:k] sorted once: O(n log n) worst? k log k.

zip(nums, nums[k:]): copies nums[k:] — a 199,000-element list; fine.

Alright. Also consider negative or NaN values — NaN comparisons would make bisect misbehave, but that's inherent to any comparison-based approach; not required to handle.

Write final answer as single python block with imports. No tests/examples.