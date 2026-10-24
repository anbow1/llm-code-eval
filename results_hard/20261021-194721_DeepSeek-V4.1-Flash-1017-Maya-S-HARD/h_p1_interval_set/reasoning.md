We need to write an IntervalSet class in Python 3.11+, standard library only, no tests/printing.

Key requirements:
- Store disjoint half-open intervals [lo, hi)
- add, remove, contains, total_length, intervals, __len__
- contains must be O(log n)
- Performance: 60k adds + 200k contains well under 5s.

Use a sorted list of (lo, hi) with bisect. For contains, binary search on los. For add/remove, find overlapping intervals and merge/replace.

Implementation approach:
- Maintain `los` list and `his` list (or list of tuples) sorted by lo. Use `bisect_left` on los.
- To find intervals overlapping [lo, hi), find first index i where his[i] > lo (i.e., interval ends after lo). Then iterate while los[j] < hi: merge.

Actually since intervals are disjoint and sorted, we can:
- Use bisect on los to find index. For overlap: find i = first index such that his[i] > lo. Could use a separate list `his` and bisect on it: `bisect_right(his, lo)` gives first index with his > lo. Good.

Let me use two parallel lists `los`, `his`.

contains(x): i = bisect_right(his, x) — first index with his[i] > x. If i == 0, no interval ends after x (all end <= x), so false... wait bisect_right(his, x) returns insertion point: number of elements <= x. So first index with his[i] > x. If i < len and los[i] <= x, then x in set. Actually need his[i] > x and los[i] <= x.

add(lo, hi): 
- if lo >= hi: return.
- i = bisect_right(his, lo) — first interval that might overlap or touch? Half-open, we want merging of touching intervals: [1,3) + [3,5) -> [(1,5)]. So touching counts as merge. So we want intervals where his[i] >= lo (touch or overlap) — i.e., bisect_left(his, lo) gives first index with his[i] >= lo.
- Then j = bisect_left(los, hi) — first index with los[j] >= hi. We want intervals with los < hi to be merged; touching at hi merges too, so los[j] == hi should also merge. So use bisect_right(los, hi): first index with los > hi. Hmm, touch: [1,3) add [3,5): los of second = 3, hi=3 for first. We want merge. bisect_right(los, hi=3) finds first los > 3, includes los==3. Good.

Wait but we need first index with los >= hi to merge? For [1,3) and [3,5): when adding [3,5), existing interval [1,3) has hi=3 == lo=3, touches. So merging touching: his[i] >= lo (3>=3 yes) and los[j] <= hi... let's be careful.

Let me define: we want to find range of existing intervals that should be merged with [lo, hi). An existing interval [a,b) merges if b >= lo (touching on left) and a <= hi (touching on right). Actually touching means b == lo or a == hi should merge. So condition: b >= lo and a <= hi.

So find start index: first i with his[i] >= lo → bisect_left(his, lo).
End index: first j with los[j] > hi → bisect_right(los, hi).

Then merged interval: new_lo = min(lo, los[i]) if i < j else lo... Actually if there are intervals i..j-1, new_lo = min(lo, los[i]), new_hi = max(hi, his[j-1]). If i == j (no existing to merge), insert (lo,hi) at position i.

Then replace los[i:j], his[i:j] with single entry.

But careful: bisect_left(his, lo) — his is sorted since intervals are disjoint and sorted. Yes.

remove(lo, hi):
- if lo >= hi: return.
- Find intervals overlapping: existing [a,b) overlaps if b > lo and a < hi. Strict because half-open.
- start i = first index with his[i] > lo → bisect_right(his, lo).
- end j = first index with los[j] >= hi → bisect_left(los, hi).
- If i == j, no overlap, nothing to do.
- Otherwise, collect pieces: for first interval [a,b) with i, if a < lo, keep [a, lo). For last interval, if b > hi, keep [hi, b). For middle intervals, remove entirely.
- Replace los[i:j], his[i:j] with these pieces.

Edge: if j-1 == i (single interval), handle both splits.

Implementation:

```python
import bisect
from numbers import Real

class IntervalSet:
    __slots__ = ('_los', '_his')

    def __init__(self):
        self._los = []
        self._his = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect.bisect_left(his, lo)
        j = bisect.bisect_right(los, hi)
        if i >= j:
            los.insert(i, lo)
            his.insert(i, hi)
            return
        new_lo = lo if lo < los[i] else los[i]
        new_hi = hi if hi > his[j-1] else his[j-1]
        los[i:j] = [new_lo]
        his[i:j] = [new_hi]
```

Wait: `bisect_left(his, lo)` returns first index with his[i] >= lo. Good.

But `bisect_right(los, hi)` returns first index with los > hi. But what if there's an interval with los == hi in the middle? Since his >= los and intervals sorted, if los[k] == hi then his[k] > hi (since los<his), that interval has his[k] > hi > lo, and los[k] = hi, so it merges (touching). bisect_right includes it. Good.

But `i` might be > j? No: i = first with his >= lo. j = first with los > hi. Since lo < hi, and his[i] >= lo... hmm, if i exists, los[i] < his[i]. Actually possible i > j? If i is found first with his[i]>=lo, that interval has los[i] < his[i]. Could los[i] > hi? Then j <= i. But we'd need to consider: if los[i] > hi, then i is beyond the merge range. Actually j = first index with los > hi <= i. Then i >= j. In our code `if i >= j`, but if i > j... Hmm wait, is it possible i > j? i is first with his >= lo. For any k < i, his[k] < lo < hi. Since los[k] < his[k] < lo < hi, so los[k] < hi. So all k < i have los[k] < hi, meaning j >= i. So j >= i always. Good, so i <= j. And i == j means no overlap. Our check `if i >= j` handles i == j (no merge). Since j >= i, i >= j means i == j.

Hmm wait but `bisect_right(los, hi)` returning first los > hi; if los[k] < hi for all k < i, then j >= i. But j could be > i if los == hi at index i... no, j counts up to first los > hi, and if los[i] == hi then j = i+1 if los[i] <= hi counted... bisect_right(los, hi) returns index after all los <= hi. So if los[i] == hi, j >= i+1. But we wanted to merge it. So j would need to be i+1 to include. Yes, that's what bisect_right does — includes los == hi. Good.

Wait, I need to double check: for add, when los[i] == hi and his[i] > hi, that interval touches at hi. j from bisect_right(los, hi): all indices with los <= hi are before or at j. So j-1 >= i includes it. Good.

`remove`:
```python
    def remove(self, lo, hi):
        if lo >= hi:
            return
        los, his = self._los, self._his
        i = bisect.bisect_right(his, lo)  # first with his > lo
        j = bisect.bisect_left(los, hi)   # first with los >= hi
        if i >= j:
            return
        # pieces
        new_los = []
        new_his = []
        if los[i] < lo:
            new_los.append(los[i])
            new_his.append(lo)
        if his[j-1] > hi:
            new_los.append(hi)
            new_his.append(his[j-1])
        los[i:j] = new_los
        his[i:j] = new_his
```

Check: bisect_right(his, lo) = first index with his > lo. Since his sorted. Good — half-open, interval [a,b) with b>lo overlaps if a<hi. bisect_left(los, hi) = first with los >= hi. Since we want a < hi, so indices before j. Good.

Edge: single interval [a,b) with a<lo and b>hi: i, j = i, i+1. new pieces: [a, lo) and [hi, b). Correct.

contains:
```python
    def contains(self, x):
        his = self._his
        i = bisect.bisect_right(his, x)  # first with his > x
        if i < len(self._los) and self._los[i] <= x:
            return True
        return False
```
Wait bisect_right(his, x) gives first with his > x. Then need los[i] <= x. Since his[i] > x and los[i] < his[i]. If los[i] <= x, then x in [los[i], his[i]). Correct.

total_length:
```python
    def total_length(self):
        return sum(h - l for l, h in zip(self._los, self._his))
```

intervals:
```python
    def intervals(self):
        return list(zip(self._los, self._his))
```

__len__: len(self._los).

Performance: 60k adds with list insert O(n) each → 60k*60k/2 = 1.8e9 worst case... hmm. That's a concern. But the problem says "small disjoint intervals in random order". Adding 60k intervals into a sorted list of 60k elements with inserts: each insert shifts on average 30k elements = 1.8e9 operations. That's too slow in pure Python? Actually list.insert is memmove, very fast in C. 1.8e9 element movements of pointers... 1.8e9 * 8 bytes = 14GB of memory movement, at ~10GB/s that's ~1.4 seconds. Hmm, borderline. Actually memmove does maybe 10+ GB/s, so ~1.4s. Plus overhead. Probably okay but let's be careful.

Alternative: use a different structure. But the requirement says contains must be O(log n). We could use `sortedcontainers` but not stdlib. Options:
1. Sorted list with bisect (O(n) insert via memmove, fast in practice).
2. A balanced BST / skip list (pure Python slower per op).
3. Batched approach: buffer adds then sort. But 60k adds individually in random order, then 200k contains. Could we lazily merge? Hmm.

Actually let's think about the test: "60 000 add() calls of small disjoint intervals in random order followed by 200 000 contains() calls must take well under 5 seconds." If we just do list insert, 1.8e9 element movement — in practice Python's list.insert with memmove is quite fast. Let's estimate: inserting into a list of n elements moves n pointers via memmove. memmove of 60k * 8 bytes = 480KB per insert at worst. 60k inserts * average 30k pointers = 1.8e9 pointer moves = 14.4 GB. memmove speed ~ 5-20 GB/s. So 0.7–3 seconds. Borderline but likely under 5s.

Hmm, but wait — "small disjoint intervals in random order". So each add creates a new interval (no merging with existing). So each add = one insert. That's the worst case for list insert shifting.

Alternative: since inserts are the bottleneck, we could use a lazy/batched approach. But contains must be O(log n) and correct at all times. Hmm.

Could we use a different data structure? A skip list with O(log n) insert and contains. Pure Python skip list with 60k inserts: ~60k * log(60k) ≈ 60k*16 = 1M operations, plus 200k contains * 16 = 3.2M operations. That's fast, maybe 1-2 seconds in Python. Might be slower than memmove approach though.

Alternatively: use sorted list but with `array` module? array.insert also memmove, same speed roughly.

Actually, there's a neat trick: use a dict/list-based approach with periodic re-sorting. Or use `bisect.insort` on a single list of pairs.

Another alternative: Use a "chunked" sorted list (like a B-tree / SortedList from sortedcontainers). Implementing a simple bucket-based sorted list with lists of size ~sqrt(n) gives O(sqrt(n)) insert and O(log n) contains... not quite O(log n).

Hmm, the requirement: "contains() must be O(log n)". With bisect on a flat list it's O(log n). With a chunked list, contains is O(log(#chunks) + log(chunk_size)) = O(log n) if chunks are sized properly and we bisect on chunk max values. That still qualifies as O(log n)-ish.

Let me think about whether flat list is fine for 5s. Actually, I recall Python's list.insert on 60k element list: benchmark. Inserting 60,000 random positions into a list that grows to 60,000... Total work ~ sum of n/2 * n = n²/4? No: inserting at random position into list of size k moves on average k/2 elements. Sum over k=1..60000 of k/2 ≈ 60000²/4 = 9e8 pointer moves = 7.2 GB. At memmove speed ~ 5-10 GB/s, ~1-1.5 seconds. Should be under 5s.

But wait, the test says "random order" of small disjoint intervals. If they're truly disjoint and don't touch, then each add is a single insert. 1-1.5 seconds is fine. And 200k contains * O(log n) bisect = 200k * ~16 = 3.2M comparisons, fast.

Actually, I realize we could optimize by keeping a single flat list of tuples and bisecting with key, but Python 3.10+ bisect supports key parameter. But keeping two parallel lists is simpler and each bisect is O(log n) on floats/ints.

Hmm, but actually one concern: with 60k adds, the list grows, and the memmove per insert... Let me just go with flat list. It should be well under 5s.

But let me reconsider: could use `bisect.insort` style but we already do that.

One more optimization: for `add`, we might consider appending then sorting periodically. But that breaks O(log n) contains. Keep it simple.

Actually, let me consider a hybrid that's definitely fast: a balanced approach using a list of "runs". Hmm, complicates. I'll go with flat parallel lists, it's the standard approach.

Actually, wait. Let me reconsider the performance more carefully. Python list.insert(idx, x) does memmove of (n - idx) elements. If inserts are random, average move = n/2 elements. Each element is a PyObject* = 8 bytes. For n=60k average 30k → 240KB per insert. 60k inserts → 14.4 GB total memmove. Modern CPU memmove ~ 10-30 GB/s for large blocks in cache... but 240KB is L2-ish. Say 10 GB/s → 1.4s. Fine.

But there are TWO inserts per add (los and his). So 28.8 GB → ~3s. Hmm, starting to be borderline. Better to use a single list of tuples.

With a single list of (lo, hi) tuples: one insert per add, moving 60k tuples (8 bytes each for pointer). 14.4 GB → ~1.4s. Better.

But then bisect on tuples: `bisect_left(intervals, (lo,))` works? Tuples compare lexicographically. bisect_right(his, lo) requires his values separately. With a single list of tuples, we can do `bisect_left(intervals, (x, float('-inf')))`? Hmm, but lo could be any real. We want first index with hi > x. Using tuples: (los[i], his[i]). We want first i with his[i] > x. Compare (his[i],) with (x,)? Can't directly since tuple order is by lo first.

Alternative: use `bisect` with `key=lambda t: t[1]` — Python 3.10+ bisect supports key. Then `bisect_right(his_values, x, key=...)`. Wait, bisect with key applies key to elements of the list. So `bisect.bisect_right(intervals, x, key=lambda t: t[1])` returns first index where key(intervals[i]) > x, i.e., first with his > x. 

But using key with bisect adds overhead (calls key per comparison). Might be slower than parallel lists.

Hmm. Alternative: maintain a single list of tuples and use `bisect_left(list, (lo, -inf))` for finding position by lo (since all his > lo, and we sort by lo first, tuple compare works: (lo, -inf) < (lo, anything)). That gives first index with lo >= lo... but for his we need separate handling.

I think two parallel lists is cleanest. Let me check if 3s is a problem... "well under 5 seconds". Hmm.

Alternative idea: Use `array` from stdlib? `array.array('d')` supports insert with memmove but stores raw doubles (8 bytes, no pointer indirection). Same memmove volume. And bisect works on array. But bounds may be ints or floats — storing in array of doubles loses int precision for huge ints. Problem says "keep original values (no rounding)". Hmm, floats from ints could round. So no.

Alternatively, a skip list or a simple chunked list. Let me think about a chunked (bucketed) sorted list. Structure: list of buckets, each bucket is a sorted list of (lo,hi) tuples. Maintain max_hi per bucket for fast lookup. Insert: find bucket via bisect on max_hi, then insert into bucket. Split bucket when size > threshold.

But contains must be O(log n). Finding bucket: bisect on bucket max_his → O(log B). Then within bucket, bisect on his list → O(log(S)). Total O(log n). Good.

But the complexity and possible bugs... Let me evaluate whether flat list suffices. Actually, let me just benchmark mentally: 60k inserts into single list. Actually, let's be safe and use two parallel lists but with `insort` — no wait.

Hmm, let me reconsider. Maybe a smarter approach: the test does 60k adds then 200k contains. Adds are the expensive part. What if I buffer adds? Store pending adds in a list; on contains/flush, merge sorted pending with sorted existing. Then contains would need to check pending (could use a sorted pending list). Hmm, complexity.

Alternatively: for add, append to a "pending" list; if pending exceeds a threshold (e.g., 1000), merge into main sorted list in O(n + p log p). contains: check main via bisect, and check pending via linear scan (1000 ops worst case) or bisect on pending. Total contains cost: O(log n + p). With p=1000, 200k contains * 1000 = 2e8 — too slow.

Better: keep pending sorted too, and contains does two bisects. Then p small. But still need periodic merge.

Hmm, let's think: 60k adds, merge every 1000 adds → 60 merges, each merging 1000-sorted into n-sorted: O(n + 1000*log 1000) ~ O(n) = 60k. 60 merges * 60k = 3.6M operations plus sorting. That's fast, ~0.5s.

contains: bisect on main (log 60k = 16) + bisect on pending (log 1000 = 10). Both O(log n). Fast.

But remove complicates: removal needs to handle both pending and main. Could just flush before remove. But 60k adds followed by 200k contains (no removes in between), so flushing only on remove/len/intervals is fine. Actually let's just flush on remove, intervals, len, total_length (or incorporate pending). Hmm, but requires care.

Actually, maybe simpler: implement using two parallel lists and accept the insert cost. Let me estimate more realistically with an actual rough calculation.

Actually, I recall that Python's `list.insert` at front of 60k list: moves 60k pointers = 480KB. Time ~ 50-100 microseconds? No, memmove of 480KB ~ 50 μs at 10GB/s. 60k inserts * 50 μs = 3 seconds. Yeah borderline.

Hmm, but average is half the list, so ~25 μs. 60k * 25 μs = 1.5s for one list, 3s for two. Borderline "well under 5s".

Let me use a single list of tuples with bisect key. Actually, wait — tuple comparison. For bisect operations we need two different orderings: by hi and by lo. With single list, we can do:

- contains(x): bisect_right on his values. But we don't have a separate his list. Could do: `i = bisect.bisect_right(intervals, (x, float('inf')), key=...)` — no, key applies to the list.

Hmm. Actually, `bisect.bisect_right(a, x, key=k)` — x is compared directly against k(a[i]). So to find first i with his[i] > x: `bisect_right(a, x, key=lambda t: t[1])`. Wait, but that computes key on each element during binary search, which is fine.

Actually bisect semantics with key: it's like the list is transformed by key. `bisect_right(a, x, key=k)` = `bisect_right([k(e) for e in a], x)`. So `bisect_right(a, x, key=lambda t: t[1])` gives first index with key > x = first with his > x. 

For add: `i = bisect_left(a, lo, key=lambda t: t[1])` — first with his >= lo. `j = bisect_right(a, hi, key=lambda t: t[0])` — first with lo > hi.

The key function is called ~log(n) times per bisect, each call is a Python function call — overhead, but only ~16 calls * 60k = 1M calls for adds; fine.

Insert into single list: `a.insert(i, (new_lo, new_hi))`. One memmove per add. Better than two.

Actually, I could avoid key functions by using parallel lists but with a clever trick: store (hi, lo) instead? No, we need lo sorted primarily.

Hmm, what about storing tuples and using bisect directly without key:
- First index with hi > x: we want to bisect on the second element. With tuples sorted by first, can't bisect on second without key.

But there's a trick: if all intervals are disjoint sorted by lo, then hi[i] = los[i+1] - gap... not exactly.

Alternatively, store as a list of (lo, hi) where we do bisect on the flat list for lo directly: `bisect_right(a, (x, float('inf')))` gives first index where (lo,hi) > (x, inf) i.e. lo > x. Hmm, that's bisect on lo.

For contains: find interval with lo <= x. `i = bisect_right(a, (x, float('inf')))` gives first with lo > x, so i-1 is the candidate. If i > 0 and hi[i-1] > x → true. But wait, (x, inf) comparison: for tuple (lo, hi), compare lo first with x. If lo == x, compare hi with inf — hi is any real, less than inf (unless hi is inf). So (x, hi) < (x, inf) if hi < inf. So bisect_right(a, (x, inf)) gives first with lo > x, or lo == x and hi > ... hmm, (x, inf) > (x, finite_hi). So an entry (x, h) with h finite is < (x, inf), so bisect_right skips it. Result: first index with lo > x (or lo == x with hi == inf, unlikely). So i-1 is the last interval with lo <= x. Check i-1 >= 0 and his[i-1] > x. But careful: what if interval with lo == x exists? Then that interval contains x (since hi > lo = x). But bisect_right gives i-1 = that interval. Good.

But using float('inf') when values might be inf... edge case. Could use a sentinel object that compares greater than any number? Use `math.inf` but if hi can be inf... half-open intervals with hi=inf are valid but then remove/split issues. Typically not. Actually to be safe, we can use a custom sentinel class with __gt__ etc. But that complicates. Let's just use `inf` and note hi = inf edge case is degenerate (interval [lo, inf) length infinite). Probably fine.

Hmm, but comparisons: comparing int and float works. Comparing int and float('inf') works.

But there's subtlety: bisect uses `<` comparisons. bisect_right(a, (x, inf)) uses `x_val < a[mid]`? Let me recall: bisect_right does `if x < a[mid]: hi = mid else: lo = mid+1`. So it finds first index where a[mid] > x (strictly). With x = (x, inf), a[mid] = (lo, hi). Compare (x, inf) < (lo, hi). If lo < x → False → lo = mid+1. If lo > x → True. If lo == x: compare inf < hi → depends on hi. If hi is finite, inf < hi is False → not less → lo = mid+1. So (x, inf) < (x, h) is False for finite h, so we skip (treat as a[mid] <= x). Correct—we want first with lo > x.

But if hi = inf... then (x, inf) < (x, inf) false too. Hmm, still skip. Then i-1 wouldn't be the interval [x, inf). But x in [x, inf) should be True. Edge case with infinite hi — I'll accept the limitation, or handle by a sentinel that's always greater. Actually, let's use a small class:

```python
class _Inf:
    def __gt__(self, other): return True
    def __lt__(self, other): return False
    def __eq__(self, other): return other is self
    def __ge__(self, other): return True
    def __le__(self, other): return other is self
    def __hash__(self): return 0
```

But comparisons go both ways; tuple comparison calls the other element's __lt__/__gt__. This gets messy.

Let me instead just use parallel lists — simplest and correct. And accept performance. Or hybrid.

Actually, you know what, let me reconsider: two parallel lists but use a single insert each? No, we insert into both, so two memmoves.

To halve memmove cost, could store intervals as tuples in one list and use key functions for bisect. That's one memmove per insert. Let me go with single list of tuples + key.

Wait, but for `add`, if we find `i` (first with his >= lo) and `j` (first with lo > hi), we then do `a[i:j] = [(new_lo, new_hi)]`. This slice assignment is also memmove. Total one memmove (roughly).

Let's write it with key functions.

Actually, key functions computed ~log n times per bisect call; with 60k adds * 2 bisects * 16 comparisons * function call = ~2M function calls = ~0.2s. Acceptable.

For contains (200k calls * 16 = 3.2M function calls = ~0.3s). Acceptable.

Hmm, alternatively, we can avoid key function by using a stored auxiliary list. But that's back to parallel lists.

Let me just use parallel lists. Let me reconsider worst case: 60k inserts x 2 memmoves x average 30k pointer moves = 3.6e9 pointer moves ≈ 29 GB memmove. At 10 GB/s = 2.9s. Plus overhead. Maybe ~3-4s. "Well under 5 seconds"? Hmm, risky.

Alternatively, use single list of tuples: 60k inserts x 30k avg moves = 1.8e9 ≈ 14 GB = 1.4s. Better. Plus key overhead ~0.5s. Total ~2s. Better margin.

Hmm, but actually memmove of small blocks (<= 480KB) is very fast, likely >10GB/s. And average case might be better if intervals are added in random order — yes, random insertion positions mean average n/2 shift.

Let me go with a hybrid: use a chunked sorted list to definitively be fast. Actually, let me think about the simplest robust approach.

Alternative: use `list` of intervals but for `add`, since intervals are disjoint and sorted, do bisect then insert. That's the standard. I think 60k is small enough that it's fine. Actually 60,000 isn't that large; Python lists handle it fine. Let me just do it.

Actually, I realize I should also consider that the test might add intervals in random order but each add is a small disjoint interval — no merging, so each add inserts one interval. 60k inserts.

Let me estimate with actual real numbers: `list.insert(0, x)` on a 60k list: this memmoves 60k * 8 bytes = 480KB. On a modern CPU, memmove ~ 10-20 GB/s for 480KB, so ~30μs. 60k inserts averaging 30μs = 1.8s. Two lists = 3.6s. Hmm.

Single list of tuples: 30μs * 60k = 1.8s. Plus bisects with key: fine. Total ~2s. OK.

Or use single list of tuples with direct tuple comparison (no key) for lo-based bisect, and something for hi-based... 

Alternative clever trick: since intervals are disjoint and sorted, we can find the interval containing `lo` for add by bisecting on lo only, then check neighbors. For add, we want to find all existing intervals overlapping or touching [lo, hi). Since they're disjoint and sorted, the candidates start at the interval with the largest lo <= ... hmm.

Actually: `k = bisect_left(a, (lo,))` gives first index with lo >= lo? Or `bisect_right(a, (lo, inf))` gives first with lo > lo. Then check k-1 (could overlap if its hi >= lo) and k, k+1, ... (while lo < hi). This works and avoids key functions! Only tuple comparisons with a constructed probe.

Let me define: for add [lo, hi):
- Find start: `i = bisect_left(a, (lo,))` — first tuple >= (lo,). Since (lo,) < (lo, anything), bisect_left(a, (lo,)) gives first index where (los[idx], his[idx]) >= (lo,), i.e., los[idx] >= lo. Hmm, but we want intervals with hi >= lo (touching/overlapping). An interval with los < lo might still have hi >= lo. Since intervals are disjoint, at most one interval has los < lo < hi (the one containing lo or ending at lo). So check i-1: if i > 0 and his[i-1] >= lo, include i-1. Then merge range extends.

Simpler: 
- `i = bisect_left(a, (lo,))` gives first with los >= lo.
- If i > 0 and a[i-1][1] >= lo: start = i-1 else start = i.
- Then `j = bisect_right(a, (hi,))` — hmm, want first with los > hi. `bisect_right(a, (hi, sentinel_max))`. Tuple comparison: (hi, X) where X is greater than any hi value. Use `float('inf')`? Could fail if his have inf. Alternatively `bisect_right(a, (hi,))` — (hi,) < (hi, anything), so bisect_right returns first with tuple > (hi,)... Let me check bisect_right semantics: returns insertion point after any equal elements. For (hi,) as x, all tuples with lo == hi are >= (hi,) (since (hi,) is a prefix, shorter tuples compare less). So (hi, his) > (hi,) always. So bisect_right(a, (hi,)) gives first index with tuple > (hi,), i.e., first with lo > hi. 

So `j = bisect_right(a, (hi,))` gives first with lo > hi.

Then:
- if start == j: no interval to merge, insert at start: a.insert(start, (lo, hi)).
- else: new_lo = min(lo, a[start][0]), new_hi = max(hi, a[j-1][1]), a[start:j] = [(new_lo, new_hi)].

But wait, `start` when i-1 included: start = i-1. And j computed independently. Need start <= j. Since a[i-1] has his >= lo; its lo < lo <= hi, so it's in merge range. If start = i-1, is j >= i? j = first with lo > hi; a[i-1] has lo < lo < hi so lo < hi, so a[i-1] is before j. So j >= i. Good.

But if interval i-1 has his >= lo we merge it. What about its hi possibly > hi? Then new_hi = its hi. And j = bisect_right(a, (hi,)) might be <= i-1? No, just argued j >= i > i-1.

Wait, edge: if a[i-1][1] == hi exactly, and lo == a[i-1][1]? That is touching. his[i-1] = lo = ... hmm, if his[i-1] == lo, they touch, merge (since we want [a, lo) + [lo, b) merged? Touching intervals [a, lo) and [lo, b) → [a, b). Yes merge). Condition his[i-1] >= lo includes equality. Good.

Also for contains: `k = bisect_right(a, (x, inf))` — as discussed gives first with lo > x, then check a[k-1] if k>0 and his[k-1] > x. But (x, inf) comparison: (x, inf) vs (lo, hi). If lo < x, (x,inf) > (lo,hi) always since first element x > lo. So bisect_right moves past. If lo == x: compare inf vs hi. If hi < inf → (x,inf) > (x,hi), so bisect_right moves past (treats as <=). So we skip the interval [x, hi). Then k-1 is not that interval! Bad.

Hmm, so contains via (x, inf) fails for the interval starting exactly at x. Let me instead use `bisect_right(a, (x,))`: (x,) vs (lo, hi). For lo == x, (x,) < (x, hi) always (prefix shorter). So (x,) <= (x, anything). So bisect_right(a, (x,)) = first index with tuple > (x,), i.e., lo > x, or lo == x and tuple > (x,)? All tuples with lo == x are > (x,), so they're considered > (x,). So bisect_right gives first with lo > x. Wait: bisect_right returns insertion point after all elements equal to x. No element equals (x,) (since tuples have 2 elements). All elements with lo == x are > (x,). So bisect_right returns first index where element >= ... hmm let me carefully apply.

bisect_right(a, x) returns i such that all a[k] <= x for k < i, and all a[k] > x for k >= i. Equivalently, first index with a[i] > x (strictly).

With x = (x,): a[k] = (lo, hi). Is (lo, hi) > (x,)? If lo > x → yes. If lo == x → compare hi vs nothing: (x,) is prefix, so (x,) < (x, hi) → (x, hi) > (x,). So yes. If lo < x → (lo, hi) < (x,)? Compare lo vs x: lo < x → yes less. So (lo, hi) <= (x,).

So first index with (lo,hi) > (x,) = first index with lo >= x (either lo > x, or lo == x). Wait no: if lo == x, (x,hi) > (x,) is true. So first index with lo >= x. Hmm, that's different from what I said. bisect_right(a, (x,)) gives first index with lo >= x.

Then to check if x is in set: check a[k-1] if k > 0: x in [lo, hi) iff lo <= x < hi. Since a[k-1] has lo < x or lo == ... wait first with lo >= x means a[k-1] has lo < x. So x in a[k-1] iff his[k-1] > x. Good, that's the candidate. But we also should check a[k] if lo == x, but a[k] would be first with lo >= x, k = first with lo >= x, so a[k][0] >= x. If a[k][0] == x, x is in a[k] trivially. So need to check a[k] too if k < len.

Hmm, so: k = bisect_right(a, (x,)) = first with lo >= x. Check:
- if k > 0 and a[k-1][1] > x: return True
- if k < len(a) and a[k][0] == x: return True  (then x < a[k][1] automatically since half-open valid)

Wait, but actually bisect_left(a, (x,)) = first with lo >= x? Let me reconsider. bisect_left returns first index where a[i] >= x. (x,) vs (lo, hi): (lo, hi) >= (x,) iff lo > x or (lo == x) — since (x, hi) > (x,). If lo == x, (x, hi) >= (x,) true. So bisect_left(a, (x,)) = first with lo >= x. Same as bisect_right(a, (x,))? No wait, bisect_right gives first with a[i] > x, which as computed = first with lo >= x too? Let me redo.

Elements with lo < x: (lo, hi) < (x,)? (lo, hi) vs (x,): compare lo vs x: lo < x → (lo,hi) < (x,). Yes.
Elements with lo == x: (x, hi) vs (x,): (x,) is prefix of (x,hi)? No, (x,) is a 1-tuple, (x,hi) is 2-tuple. Compare element by element: first x == x, then (x,) has exhausted but (x,hi) has more → shorter is less. So (x,) < (x,hi). So (x,hi) > (x,).
So elements with lo == x are > (x,).

bisect_right(a, (x,)) = first index with a[i] > (x,) = first with lo >= x (since lo < x gives <=, lo == x gives >).
bisect_left(a, (x,)) = first index with a[i] >= (x,). Elements with lo < x: < (x,). Elements with lo == x: > (x,) so >= (x,)? Yes, > implies >=. So bisect_left also gives first with lo >= x. Same result. OK.

So to find candidate for contains: use bisect_left(a, (x,)) = first with lo >= x. If index k: candidate a[k-1] if his > x; also a[k] if lo == x.

Hmm, simpler: find candidate interval with lo <= x: use `bisect_right(a, (x, float('inf')))` — but inf issue. Or use `bisect_left(a, (x,))` then if a[k-1] has lo <= x (yes, since lo < x) check his. And if a[k] has lo == x, check directly.

Alternatively, simplest: find `i = bisect_right(a, (x, math.inf))`. If lo <= x and hi < inf... discussed issues. Let me just use the bisect_left approach with (x,).

Actually even simpler and robust: use two bisects? No.

Let me write contains as:
```python
def contains(self, x):
    a = self._intervals
    i = bisect.bisect_left(a, (x,))
    # i is first with lo >= x
    if i > 0 and a[i-1][1] > x:
        return True
    if i < len(a) and a[i][0] == x:
        return True
    return False
```
Wait but a[i-1][1] > x: a[i-1] has lo < x. x in [lo, hi) iff hi > x (lo <= x already). But what if lo == x for a[i-1]? No, i is first with lo >= x, so a[i-1] has lo < x. Good.

And if a[i][0] == x: x in [x, hi) yes. Good.

Hmm but there's an issue: if a[i][0] == x, that interval contains x only if hi > x, which is guaranteed since lo < hi. Yes.

Now `bisect_left(a, (x,))` uses tuple comparison with (x,). Works with ints/floats since Python compares int/float fine.

Now `add`:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    a = self._intervals
    i = bisect.bisect_left(a, (lo,))
    # i = first with los >= lo
    # check i-1 for touching/overlapping
    start = i
    if i > 0 and a[i-1][1] >= lo:
        start = i - 1
    j = bisect.bisect_right(a, (hi,))
    # j = first with los > hi
    if start >= j:
        a.insert(start, (lo, hi))
    else:
        new_lo = min(lo, a[start][0])
        new_hi = max(hi, a[j-1][1])
        a[start:j] = [(new_lo, new_hi)]
```

Wait, but j = bisect_right(a, (hi,)) gives first with lo >= hi (as computed above). Hmm, we need first with lo > hi (strict). Because touching at hi means lo == hi should merge. Let me recompute: bisect_right(a, (hi,)) = first with a[i] > (hi,) = first with lo >= hi. That includes lo == hi. But we want to merge lo == hi (touching at hi). So we want j = first with lo > hi.

Hmm, so bisect_right gives first with lo >= hi, but we want first with lo > hi. Let's check: a[i] > (hi,) iff lo > hi OR (lo == hi and ...). We said elements with lo == hi are > (hi,) because (hi,) is a prefix. So bisect_right gives first with lo >= hi. That includes lo == hi, which is what we want to merge. Wait, we want merge when lo == hi (touching). So if j = first with lo >= hi, then a[j] with lo == hi is NOT in range [start, j) — it's excluded. Hmm.

Let me re-examine. We want j = first index NOT in merge range, i.e., first index with lo > hi (strictly, since lo == hi touches and should merge). So we need j = first with lo > hi.

bisect_right(a, (hi,)): as computed, returns first with lo >= hi. That's first with lo == hi or lo > hi. If a[j] has lo == hi, we'd want it merged, but bisect_right returns j pointing at it (excluding it). Wrong.

I need `bisect_right(a, (hi, sentinel))` where sentinel > any hi. Or `bisect_left(a, (hi,))` with adjustment? Hmm.

Wait, let me recompute more carefully. Actually, let me reconsider: (lo, hi_val) vs (hi,). If lo == hi, compare hi_val vs nothing → (hi, hi_val) > (hi,). So bisect_right returns after it (if lo == hi, element > (hi,), so bisect_right's predicate a[i] > x is true, so it's the first index). So bisect_right(a, (hi,)) = first index with a[i] > (hi,) = first with lo >= hi. Wait, if lo == hi and element > (hi,), then it should be counted as > and bisect_right returns it. So j = first with lo == hi OR lo > hi = first with lo >= hi. So a[j] with lo == hi is at position j, NOT included in [0, j). So merge range [start, j) excludes lo == hi. But we want to include. Bad.

So for add, I need j = first with lo > hi. Using `bisect_right(a, (hi, float('inf')))`, but float('inf') might compare against arbitrary hi... if hi_val is float('inf'), then (hi, inf) vs (hi, inf) equal, bisect_right gives after. Hmm, edge with infinite. Let's use a sentinel class.

Actually, alternative: use bisect_right(a, (hi,)) and then check if the element at j has lo == hi — if so, extend j by 1 (merge it). Since intervals are disjoint sorted, at most one interval with lo == hi. So:

```python
j = bisect.bisect_right(a, (hi,))
if j < len(a) and a[j][0] == hi:
    j += 1
```

That handles it. Similarly for `start`, we do a check for hi >= lo, which is bisect_left(a, (lo,)) gives first with lo >= lo. Then we check a[i-1] if its hi >= lo. But we also need to check a[i] if a[i][0] == lo? Wait, if a[i][0] == lo, that interval starts at lo, overlaps [lo, hi) (since its hi > lo). Then merge range starts at i, not i-1. So start = i if a[i][0] == lo (or generally if a[i][0] < hi). But our j computation includes it, and start = i is fine.

Hmm wait, start should be the first interval to merge. If a[i][0] == lo, then start = i. If i-1's hi >= lo, start = i-1. Right, we don't need special handling for a[i][0] == lo in start since j will include it.

But wait, there's another case: what if a[i-1]'s hi < lo but a[i-1] doesn't touch, but a[i] has lo < ... no, a[i] has lo >= lo. OK.

Hmm, but actually there's a subtle issue: `bisect_left(a, (lo,))` gives first with lo >= lo, i.e., first with a[i] >= (lo,). If a[i][0] == lo, then a[i] = (lo, hi') > (lo,) so a[i] >= (lo,), yes i points to it. Fine.

Now for the case where a[i-1][1] >= lo: a[i-1] could have lo < lo. Its hi >= lo. Merge. start = i-1.

OK. And j adjustment for lo == hi. Actually wait: what if the interval at j has lo == hi, but also we need to check a[start]'s hi... no, j is about right boundary.

Let me also double-check: what if there are multiple intervals with lo == hi? Impossible, disjoint sorted.

Now for `remove`:
We want intervals overlapping [lo, hi): a < hi and b > lo. Strict.
```python
i = bisect.bisect_right(a, (lo, ...))?
```
We want first index with hi > lo. Since sorted by lo, and intervals disjoint, the interval with hi > lo could be found by: candidate is the one containing lo, or the next. Use `i = bisect_right(a, (lo,))` = first with lo >= lo. Then check i-1: if a[i-1][1] > lo, start = i-1 else start = i.

j: first with lo >= hi (strict, since lo < hi means a < hi condition; touching at hi doesn't overlap). `j = bisect_left(a, (hi,))` gives first with lo >= hi. So intervals in [start, j) have lo < hi.

But we also need to check: a[j] with lo == hi — doesn't overlap (half-open, [a, hi) ∩ [hi, b) = empty). So exclude. Good, bisect_left gives first with lo >= hi. So j = bisect_left(a, (hi,)).

Wait, `bisect_left(a, (hi,))` = first index where a[k] >= (hi,). a[k] = (lo, hi_k). Is (lo, hi_k) >= (hi,)? If lo > hi, yes. If lo == hi, (hi, hi_k) > (hi,) so yes. If lo < hi, no. So bisect_left gives first with lo >= hi. 

Then if i >= j: no overlap. Else handle.

Pieces: 
- if a[i][0] < lo: keep piece (a[i][0], lo)
- if a[j-1][1] > hi: keep piece (hi, a[j-1][1])

But careful when i == j-1 (single interval) and both conditions apply — two pieces, correct.

Also, we need to handle the case where a[i][0] >= lo: no left piece. And a[j-1][1] <= hi: no right piece.

Also, edge: if a[i][0] < lo, but is lo < a[i][1]? Since a[i] overlaps [lo, hi), yes a[i][1] > lo. So piece (a[i][0], lo) valid (lo > a[i][0]).

Similarly right piece: a[j-1][1] > hi, and a[j-1][0] < hi (since in [i, j), lo < hi). So piece (hi, a[j-1][1]) valid (hi > a[j-1][0]). But wait, we need hi > lo and hi > a[j-1][0]. Since a[j-1][0] < hi, yes.

But also need hi < a[j-1][1] for the piece to be valid (non-empty), which is the condition. Good.

Let's write:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    a = self._intervals
    i = bisect.bisect_right(a, (lo,))
    if i > 0 and a[i-1][1] > lo:
        i -= 1
    j = bisect.bisect_left(a, (hi,))
    if i >= j:
        return
    new = []
    if a[i][0] < lo:
        new.append((a[i][0], lo))
    if a[j-1][1] > hi:
        new.append((hi, a[j-1][1]))
    a[i:j] = new
```

Wait, `bisect_right(a, (lo,))` gives first with lo >= lo?? Let me recompute. bisect_right(a, (lo,)) = first index with a[k] > (lo,) = first with lo_k > lo OR (lo_k == lo and ...). Elements with lo_k == lo: (lo, h) > (lo,) as before. So counted as >. So bisect_right gives first with lo_k >= lo. Hmm, same as bisect_left. OK whatever. Let me just use bisect_left(a, (lo,)).

Actually, both give first with lo_k >= lo for (x,) as probe. Let me just use bisect_left.

Hmm wait, no. Let me carefully redo bisect_left: bisect_left(a, x) = first index with a[k] >= x. With x = (lo,). Elements with lo_k < lo: (lo_k, h) < (lo,)? Compare lo_k vs lo: lo_k < lo → yes. So these are < (lo,). Elements with lo_k == lo: (lo, h) vs (lo,): (lo,) is prefix → (lo, h) > (lo,) → >= (lo,). So counted as >=. So bisect_left gives first with lo_k >= lo. Yes.

bisect_right: first with a[k] > x, which for lo_k == lo, they are > (lo,), so also counted. So bisect_right gives first with lo_k >= lo. Same. OK, so both work for (x,) probe. Good. Let me use bisect_left for clarity.

For remove i: we want first interval with hi > lo. Candidate: the one with lo <= lo (could be containing lo), which is a[i-1] where i = bisect_left(a, (lo,)) gives first with lo_k >= lo. Hmm, a[i-1] has lo_{i-1} < lo. If a[i-1][1] > lo, it overlaps, start = i-1. Else start = i. But what about a[i] with lo_k == lo? It has hi > lo, so overlaps. start = i (included). But also what if a[i-1][1] == lo: it ends at lo, doesn't overlap (half-open [., lo) and [lo, .) disjoint). Condition a[i-1][1] > lo is strict, correct.

Wait, but if a[i-1][1] == lo, should NOT be included in remove range. Our condition `a[i-1][1] > lo` excludes it. Good. And start = i, which points to next interval. Good.

Hmm but actually wait, `bisect_left(a, (lo,))` gives first with lo_k >= lo. But if a[i-1][1] == lo, start = i (which is first with lo_k >= lo), and a[i-1] excluded. Good.

For j: first with lo_k >= hi: `bisect_left(a, (hi,))`. Good.

Hmm, but one more check: does j definitely come after start? If start = i-1 and a[i-1][1] > lo, and j = first with lo >= hi. Since a[i-1][0] < lo < hi, a[i-1][0] < hi so a[i-1] is before j. So j > i-1 = start. Good.

Now, are all intervals in [start, j) overlapping? Each has lo < hi (since before j) and... hmm, need hi_k > lo. For a[start], if start = i-1, hi > lo yes. If start = i, a[i] has lo >= lo, and its hi > lo (since hi > lo). But could a[i][0] > ... wait, if start = i, then a[i-1][1] <= lo, so a[i-1] doesn't overlap. a[i] has lo_{i} >= lo and hi_{i} > lo_{i} >= lo, so hi > lo. Wait, if lo_i == lo, hi_i > lo, overlaps. If lo_i > lo, but is lo_i < hi (since before j)? Yes, if a[i] is in [start, j) then lo_i < hi, so overlaps [lo, hi) iff lo_i < hi (yes) and hi_i > lo (yes, since hi_i > lo_i >= lo). Good.

For middle intervals k in (start, j), lo_k > lo_{start}... they're disjoint from a[start], so lo_k >= hi_{start}. Hmm, do they overlap [lo, hi)? lo_k < hi (before j), and hi_k > lo_k >= lo? Not necessarily >= lo... wait, if lo_k > lo then hi_k > lo_k > lo, overlaps (lo_k < hi and hi_k > lo). Yes. If lo_k == lo, hi_k > lo. OK. So all in [start, j) overlap. Good.

Hmm, but wait: could a[k] for k in [start, j) have lo_k < lo but not be a[start]? Only a[start] could have lo < lo since intervals sorted and disjoint; the rest have lo >= lo_{start+1} >= hi_{start} > ... hmm, actually hi_{start} could be > lo. Let's see: a[start+1].lo >= a[start].hi. If a[start].hi > lo and a[start+1].lo >= that, then a[start+1].lo > lo. So yes, only a[start] may have lo < lo. Good.

Alright, so remove works.

Now for `add` again, let me also reconsider the j adjustment. Let me rewrite add:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    a = self._intervals
    i = bisect.bisect_left(a, (lo,))
    start = i
    if i > 0 and a[i-1][1] >= lo:
        start = i - 1
    j = bisect.bisect_left(a, (hi,))
    if j < len(a) and a[j][0] == hi:
        j += 1
    if start >= j:
        a.insert(start, (lo, hi))
    else:
        new_lo = min(lo, a[start][0])
        new_hi = max(hi, a[j-1][1])
        a[start:j] = [(new_lo, new_hi)]
```

Wait, `bisect_left(a, (hi,))` gives first with lo >= hi. If a[j][0] == hi, this interval touches [lo, hi) at hi. Should we merge? Yes (touching intervals merge). So j += 1. But then we also need to check: does it affect new_hi? new_hi = max(hi, a[j-1][1]) — with j incremented, a[j-1] is the touching interval, its hi. Good.

But wait, if a[j][0] == hi, does the merged interval's new_hi become a[j][1]? Yes, since a[j][1] > a[j][0] = hi. Good.

Hmm, but what about a[j][0] == hi and additionally a[j+1][0] == a[j][1] touching? No — intervals are already maximally merged (we maintain that property), so a[j+1][0] > a[j][1] (strict). So no further merge. Good.

Also, need to check: if start = i-1, could a[i-1][1] == lo and also there's a merge... condition >= handles touching. Good.

And what if i-1's hi >= lo but also i-1's hi > hi (containing)? Then start = i-1, and j might be i (if a[i][0] > hi). Then start < j, new_hi = max(hi, a[i-1][1]) = a[i-1][1] > hi. Good.

What if start = i-1 and j = i (no middle intervals)? new_lo = min(lo, a[i-1][0]) = a[i-1][0] (since a[i-1][0] < lo). new_hi = max(hi, a[i-1][1]). Then a[start:j] = a[i-1:i] = [(new_lo, new_hi)]. Replaces. Good.

Actually wait, one more: `if start >= j: a.insert(...)`. When start == j, no merge, insert. But could start > j? start = i-1 or i, j = bisect_left(a, (hi,)) possibly +1. Since lo < hi and start could be i-1. j is first with lo >= hi, then maybe +1. If start = i-1, a[i-1][1] >= lo. Is a[i-1] before j? a[i-1].lo < lo < hi, so a[i-1].lo < hi, so a[i-1] is before j. So j > i-1 = start when j computed as bisect_left... but with +1 it's even bigger. So start < j always when start = i-1. When start = i (doesn't touch left), j = first with lo >= hi. If a[i][0] >= hi... a[i][0] >= lo (from bisect). Could be >= hi, then j = i (or i + 0). So start = i = j. Then no merge, insert at i. Good. So start >= j means start == j.

Wait, but what if start = i and a[i][0] < hi (i.e., j > i)? Then merge from i. start = i < j. Good.

Hmm, but actually there's a subtle issue with `bisect_left(a, (lo,))` when lo is a float and there's an int interval etc. Comparison works.

Also, what about the case where `a[i-1][1] >= lo` but `a[i-1][0] >= lo`? That can't happen since a[i-1] is before i (first with lo >= lo), so a[i-1].lo < lo. Good.

Now, total_length, intervals, __len__. And we might want `__contains__`, `__iter__`, but not required.

Let me also make sure intervals() returns list of tuples sorted and merged — we maintain that invariant, so just return list(a).

Also `__len__` = len(a).

One issue: comparisons with `(lo,)` vs `(x, y)` where x could be a float and lo int etc. Fine.

Edge case: `lo` or `hi` could be float('nan')? Not specified, ignore.

Another issue: `float('inf')` or `-inf` in add/remove. lo >= hi check handles inf. bisect with inf tuples... comparisons with (inf,) probe: (inf,) vs (lo, hi). If lo is some finite, (inf,) > (lo, hi) since inf > lo. If lo is inf too, compare: inf == inf, then (inf,) shorter → (inf,) < (inf, hi). So (inf, hi) > (inf,). Bisect works. Edge cases fine mostly.

Let's also verify total_length returns proper number. sum of his - los. Fine.

Now performance concern again: 60k inserts of tuples into list. Each insert at random position ~ O(n) memmove. Total ~ 1.8e9 pointer moves = 14 GB. Probably ~1-2s. Plus 200k contains with bisect (fast). Should be under 5s. OK.

Hmm, but wait: when "small disjoint intervals in random order", inserts are at random positions. 60k inserts. Let me think again: memory bandwidth ~ 30 GB/s for sequential memmove. 14 GB / 30 GB/s = 0.5s. Plus Python overhead per insert ~ maybe 1-2 μs? 60k * 1.5 μs = 0.1s. Actually Python list.insert is C-implemented, so ~ per-call overhead is small. Total maybe 1s. Fine.

Actually, one more consideration: slice assignment `a[start:j] = [...]` also creates a new list and memmoves. For remove, fine.

Let me also consider `add` performance with all-disjoint: each add does bisect_left + bisect_left (2 bisects, O(log n) each) + insert (O(n) memmove). Fine.

Now, could there be an issue that after insert, list is not sorted? No, we insert at correct position.

Let me also add a `__repr__`? Not needed.

Also maybe implement `__contains__` = contains for `x in s`? Optional.

Let me also handle the "touching intervals merged" in intervals() — we maintain that invariant always (add merges touching). Let me double check add handles touching on both sides:
- left touch: a[i-1][1] >= lo. If a[i-1][1] == lo, touch, merge. Yes.
- right touch: a[j][0] == hi, merge. Yes.
Good.

Wait, but what about after merging, could a[start-1][1] == a[start][0]? No, because before add, intervals were merged (no touching), and a[start-1][1] < a[start][0] (strict, since disjoint non-touching). After merge, new_lo = min(lo, a[start][0]). If start = i-1, new_lo = a[i-1][0] (since a[i-1][0] < lo). Is a[start-1][1] < a[start][0] still? Yes, unchanged. And new_lo = a[start][0] unchanged. So no touch. If start = i, new_lo = lo. a[start-1][1] < a[i][0] previously; but wait, a[start-1] = a[i-1], and its hi < lo (since condition failed, a[i-1][1] < lo, actually <= lo but since not >=, it's < lo). So a[i-1][1] < lo = new_lo. No touch. Good.

Right side: new_hi = max(hi, a[j-1][1]). Next interval a[j] (after replacement, it's at position start+1). If j == original j (no +1), a[j][0] > hi (strict, since a[j][0] != hi after adjustment). And new_hi = max(hi, a[j-1][1]) where a[j-1][1] <= ... hmm, could a[j-1][1] >= a[j][0]? No, intervals were disjoint before: a[j-1][1] < a[j][0] (strict, no touch). And new_hi = max(hi, a[j-1][1]). We need new_hi < a[j][0]. Since hi < a[j][0] (a[j][0] > hi) and a[j-1][1] < a[j][0], so max < a[j][0]. Good. If j was incremented (a[j-1][0] == hi originally), after increment, next a[j][0] > a[j-1][1] (non-touching). new_hi = a[j-1][1]. So new_hi < a[j][0]. Good.

Great, invariant maintained.

Remove invariant: pieces are (a[i][0], lo) and (hi, a[j-1][1]). Need to check they don't touch with neighbors:
- Left piece ends at lo. Previous interval a[i-1] (if exists): a[i-1][1] < a[i][0] < lo. So a[i-1][1] < lo. No touch with (a[i][0], lo)?  a[i-1][1] vs a[i][0]: unchanged, non-touch. Good.
- Right piece starts at hi. Next interval a[j] (if exists): a[j][0] > ... a[j-1][1] < a[j][0] (non-touch). Right piece ends at a[j-1][1] < a[j][0]. So no touch. Good.
- If both pieces: left ends at lo, right starts at hi > lo. Gap. But is lo < hi? Yes. So gap, non-touch. Wait, left piece is (a[i][0], lo) and right piece is (hi, a[j-1][1]). These are in the same slot range and inserted adjacent. Between them, is there a gap? [a[i][0], lo) and [hi, ...). If lo < hi (true since we removed [lo, hi) with lo < hi), then they're separated by gap [lo, hi). Non-touch. Good.

Hmm, but actually wait: what if lo == hi? We ignore (lo >= hi return). Good.

So remove maintains invariant.

Now let me write final code.

```python
import bisect


class IntervalSet:
    """A set of real numbers stored as disjoint half-open intervals [lo, hi)."""

    __slots__ = ("_intervals",)

    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples, disjoint, non-touching

    def add(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals
        i = bisect.bisect_left(a, (lo,))
        start = i
        if i > 0 and a[i - 1][1] >= lo:
            start = i - 1
        j = bisect.bisect_left(a, (hi,))
        if j < len(a) and a[j][0] == hi:
            j += 1
        if start >= j:
            a.insert(start, (lo, hi))
        else:
            new_lo = lo if lo < a[start][0] else a[start][0]
            new_hi = hi if hi > a[j - 1][1] else a[j - 1][1]
            a[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals
        i = bisect.bisect_left(a, (lo,))
        if i > 0 and a[i - 1][1] > lo:
            i -= 1
        j = bisect.bisect_left(a, (hi,))
        if i >= j:
            return
        pieces = []
        if a[i][0] < lo:
            pieces.append((a[i][0], lo))
        if a[j - 1][1] > hi:
            pieces.append((hi, a[j - 1][1]))
        a[i:j] = pieces

    def contains(self, x):
        a = self._intervals
        i = bisect.bisect_left(a, (x,))
        if i > 0 and a[i - 1][1] > x:
            return True
        if i < len(a) and a[i][0] == x:
            return True
        return False

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)

    def __contains__(self, x):
        return self.contains(x)

    def __iter__(self):
        return iter(list(self._intervals))

    def __repr__(self):
        return f"IntervalSet({self._intervals!r})"
```

Wait, `contains` with `bisect_left(a, (x,))`: if a[i-1][1] > x we return True. But what if a[i-1][1] == x? Half-open, x not included (since hi is exclusive). Wait, [lo, hi): x in iff lo <= x < hi, so hi > x. Yes strict. Good.

Also, if a[i-1][1] == x and a[i][0] == x: a[i] starts at x, contains x. The check a[i][0] == x catches. Good.

Hmm, but there's a subtle issue with `bisect_left(a, (x,))` when x is a float and there's a tuple with lo exactly equal... fine.

Wait, edge: what if a[i-1][1] > x but also a[i-1][0] > x? Since a[i-1] < i (first with lo >= x), a[i-1][0] < x. So a[i-1] = (lo, hi) with lo < x < hi → x in. Good.

Now let me reconsider `remove`'s `i` computation. `i = bisect_left(a, (lo,))` = first with lo >= lo. Then check i-1: if a[i-1][1] > lo, decrement. But what if i-1's hi == lo? Doesn't overlap. Correct.

But what if there are multiple intervals with hi > lo? Impossible since disjoint sorted (only one can contain lo).

Hmm wait, but what if lo is between intervals — a[i-1][1] < lo and a[i][0] > lo. Then i points to a[i], start = i. Good.

Now what if a[i][0] == lo? i points to it. If a[i-1][1] > lo (i.e., previous interval contains lo)? Can't — a[i-1] < a[i] and disjoint, a[i-1][1] < a[i][0] = lo. So no.

Actually, hmm, `bisect_left(a, (lo,))` — if a[i][0] == lo, is a[i] the first with lo >= lo? Yes. Good.

Wait, one issue: what if a[i-1][1] > lo but a[i-1][1] > hi also (i.e., the interval contains the entire [lo, hi))? Then i = i-1 after decrement. j = bisect_left(a, (hi,)). Since a[i][0] < lo < hi <= a[i][1], and the next interval starts at a[i][1] > hi, so bisect_left gives i+1 (a[i+1] has lo >= a[i][1] > hi). Actually is a[i][1] > hi? Then a[i+1][0] > a[i][1] > hi > hi, so bisect_left(a, (hi,)) gives i+1. So j = i+1. Then pieces: a[i][0] < lo → append (a[i][0], lo). a[j-1][1] = a[i][1] > hi → append (hi, a[i][1]). Both pieces. Good.

Now, let me double-check `contains` for x exactly at a boundary. Suppose interval [1, 3). contains(1): bisect_left gives index of (1,3). i = that index. i-1 might not have hi > 1. a[i][0] == 1 → True. Good. contains(3): bisect_left((3,)) → first with lo >= 3, which is next interval (lo > 3) or end. i-1 = (1,3), hi=3 > 3? No (strict). a[i][0] == 3? Next interval lo > 3. So False. Good.

Now, `total_length` with floats could have precision issues but that's inherent.

Let me reconsider the performance once more. 60k add with disjoint intervals in random order. Each add does 2 bisects (O(log n)) and 1 list.insert (O(n) memmove). 60k inserts total. Should be fine.

Actually, I want to double check `bisect_left(a, (lo,))` when lo is a float like 1.5 and existing intervals have int bounds. Tuple comparison (1.5,) vs (1, 2): compare 1.5 vs 1 → 1.5 > 1, so (1.5,) > (1,2). Fine.

What if lo is NaN? Undefined behavior, ignore.

I think this is good. Let me also consider the `intervals()` method returning "sorted, disjoint, and with touching intervals merged". Our invariant ensures this. Good.

One more: `__len__` returns number of intervals. Good.

Let me reconsider whether `contains` truly O(log n). bisect_left is O(log n), plus O(1) checks. Yes.

Let me also double check the `add` when merging with left neighbor: `new_lo = lo if lo < a[start][0] else a[start][0]`. If start = i-1, a[start][0] < lo, so new_lo = a[start][0]. If start = i, a[start][0] >= lo, so new_lo = lo. Good.

`new_hi = hi if hi > a[j-1][1] else a[j-1][1]`. If j-1 is the last merged interval, its hi could be > hi, keep it. Good.

Hmm, wait, but there's a case I didn't consider: `start = i - 1` and `j` computed as `bisect_left(a, (hi,))` — but what if the interval a[i-1] has hi >= hi (contains the whole range)? Then a[i-1][0] < lo and a[i-1][1] >= hi. j = bisect_left(a, (hi,)) — a[i-1] has lo < lo < hi, so a[i-1] is before j. j >= i. If j == i, then a[i][0] >= hi. But wait, if a[i-1][1] >= hi, then a[i][0] >= a[i-1][1] >= hi... so a[i][0] >= hi. If a[i][0] == hi, then j increment by 1 includes a[i]. So j = i+1. Then merged = (a[i-1][0], max(hi, a[i][1])) — but a[i][0] == hi means a[i] touches, so merged hi = a[i][1]. Wait but that's wrong: a[i-1] contains [lo, hi] fully, and a[i] starts at hi (touching a[i-1]? but a[i-1][1] >= hi = a[i][0], so a[i-1] and a[i] would be touching/overlapping — impossible since intervals were disjoint non-touching). So a[i-1][1] >= hi and a[i][0] == hi implies a[i-1][1] >= a[i][0], contradiction with disjointness. So this case can't happen. Good — the invariant protects us.

Actually, more carefully: if a[i-1][1] > hi, then a[i][0] > a[i-1][1] > hi, so a[i][0] != hi, no increment. If a[i-1][1] == hi, then a[i][0] >= a[i-1][1] = hi (disjoint, could be > or ==... but non-touching means >). Non-touching: a[i][0] > a[i-1][1] = hi. So a[i][0] > hi, no increment. So j = i, start = i-1 < j. Merged covers a[start:i]. But wait, a[start:i] = a[i-1:i] = [a[i-1]]. Correct, just a[i-1] replaced with itself (or extended). Good.

OK I'm fairly confident. Let me also think about whether to use `__slots__` — yes, for slight memory/speed.

One more concern: `repr` is defined but might not be needed. Keep it.

Let me also consider: what if user passes lo or hi that are numpy numbers? Not standard library, ignore.

Let me also handle the case where lo or hi is bool — bool is int subtype, works.

Final code:

```python
import bisect


class IntervalSet:
    __slots__ = ("_intervals",)

    def __init__(self):
        self._intervals = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals
        i = bisect.bisect_left(a, (lo,))
        start = i - 1 if (i > 0 and a[i - 1][1] >= lo) else i
        j = bisect.bisect_left(a, (hi,))
        if j < len(a) and a[j][0] == hi:
            j += 1
        if start >= j:
            a.insert(start, (lo, hi))
        else:
            new_lo = lo if lo < a[start][0] else a[start][0]
            new_hi = hi if hi > a[j - 1][1] else a[j - 1][1]
            a[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        a = self._intervals
        i = bisect.bisect_left(a, (lo,))
        if i > 0 and a[i - 1][1] > lo:
            i -= 1
        j = bisect.bisect_left(a, (hi,))
        if i >= j:
            return
        pieces = []
        if a[i][0] < lo:
            pieces.append((a[i][0], lo))
        if a[j - 1][1] > hi:
            pieces.append((hi, a[j - 1][1]))
        a[i:j] = pieces

    def contains(self, x):
        a = self._intervals
        i = bisect.bisect_left(a, (x,))
        if i > 0 and a[i - 1][1] > x:
            return True
        return i < len(a) and a[i][0] == x

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)

    def __contains__(self, x):
        return self.contains(x)

    def __iter__(self):
        return iter(list(self._intervals))

    def __repr__(self):
        return "IntervalSet(%r)" % (self._intervals,)
```

Wait, in `contains`, if x is such that a[i-1][1] > x but a[i-1][0] > x? Can't happen (a[i-1] < i means lo < x... actually bisect_left gives first with lo >= x, so a[i-1].lo < x). Good.

But also consider x where a[i-1][1] > x but there's an interval a[i] with a[i][0] == x. Then both conditions could true; return True either way. Fine.

Hmm, one more: contains with `bisect_left(a, (x,))` when x is a tuple? Not applicable.

I think this is solid. Let me also test mentally with a small example:

add(1, 3): a=[], i=0, start=0, j=0, start>=j → insert (1,3). a=[(1,3)].
add(3, 5): a=[(1,3)], i=bisect_left([(1,3)], (3,)) → compare (1,3) vs (3,): 1 < 3 → (1,3) < (3,) → so i=1 (past). start: i=1>0 and a[0][1]=3 >= 3 → start=0. j = bisect_left([(1,3)], (5,)): (1,3) < (5,) → j=1. j < len? no. j=1. start=0 < j=1. new_lo = min(3, 1) = 1. new_hi = max(5, 3) = 5. a[0:1] = [(1,5)]. a=[(1,5)]. Good.

add(7, 9): a=[(1,5)]. i=bisect_left([(1,5)], (7,)): (1,5) < (7,) → i=1. start: a[0][1]=5 >= 7? No → start=1. j = bisect_left([(1,5)], (9,)): (1,5) < (9,) → j=1. j<len? no. start=1 >= j=1 → insert (7,9) at 1. a=[(1,5),(7,9)]. Good.

remove(2, 4) on a=[(1,5)]: i=bisect_left([(1,5)], (2,)): (1,5) vs (2,): 1<2 → i=1. i>0 and a[0][1]=5 > 2 → i=0. j=bisect_left([(1,5)], (4,)): (1,5) < (4,)? 1<4 yes → j=1. i=0 < j=1. pieces: a[0][0]=1 < 2 → (1, 2). a[0][1]=5 > 4 → (4, 5). a[0:1] = [(1,2),(4,5)]. Good.

contains(2) on a=[(1,2),(4,5)]: i=bisect_left(a, (2,)): (1,2) < (2,)? 1<2 yes. (4,5) vs (2,): 4>2 → i=1. i>0 and a[0][1]=2 > 2? No. i < len and a[1][0]=4 == 2? No. Return False. Good, 2 not in set.

contains(4): i=bisect_left(a, (4,)): (1,2) < (4,) yes; (4,5) vs (4,): 4==4, (4,) shorter → (4,5) >= (4,) so i=1. i>0 and a[0][1]=2 > 4? No. i<len and a[1][0]=4==4 → True. Good.

remove(1, 5) on a=[(1,5)]: i=bisect_left([(1,5)], (1,)): (1,5) vs (1,): 1==1, (1,) shorter → (1,5) >= (1,) → i=0. i>0? no. j=bisect_left([(1,5)], (5,)): (1,5) < (5,)? 1<5 yes → j=1. i=0<j=1. pieces: a[0][0]=1 < 1? No. a[0][1]=5 > 5? No. pieces=[]. a[0:1] = []. a=[]. Good.

Everything checks out.

Now, the requirement "Bounds may be ints or floats. Keep the original values (no rounding)." — we store tuples as given, no conversion. Good.

"60 000 add() calls of small disjoint intervals in random order followed by 200 000 contains() calls must take well under 5 seconds." — I believe our implementation is fast enough. Let me reconsider: worst case each add is an insert into possibly large list. 60k * average 30k shifts = 1.8e9 pointer moves for 8 bytes = 14.4 GB memmove. Modern hardware ~ 20-30 GB/s → ~0.5-0.7s. Plus Python overhead. Fine.

Actually hmm, I'm second-guessing. Some machines have slower memory. But 5s is generous. I'll go with it.

One more idea to be safer: use `bisect.insort`? Not needed, our insert is equivalent.

Should I also consider a case where the 60k adds happen to all be at the front (worst case)? "random order" suggests random, so average. Fine.

Let me also verify the `__contains__` returning bool. Contains returns True/False via `return i < len(a) and a[i][0] == x`. That returns bool. Good.

I think we're done. Let me write the final code nicely.