Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) and supports efficient operations.

Key requirements:
- `add(lo, hi)`: add interval, merge overlapping/touching intervals
- `remove(lo, hi)`: remove interval, may split
- `contains(x)`: O(log n) - this is the performance critical one
- `total_length()`: sum of lengths
- `intervals()`: sorted, disjoint, merged
- `__len__()`: number of intervals
- Performance: 60,000 adds of small disjoint intervals + 200,000 contains calls in well under 5 seconds

For O(log n) contains, I need a sorted structure. Python's `bisect` module works well here.

Approach: Store intervals as a sorted list by `lo`. For `contains(x)`, use bisect to find the rightmost interval whose `lo <= x`, then check if `x < hi`.

Let me think about the data structure:
- Store intervals as a sorted list of tuples `(lo, hi)` sorted by `lo`.
- For `contains(x)`: use `bisect_right` on the list of `lo` values to find the insertion point, then check the interval just before that point.

For `add(lo, hi)`:
- Find all intervals that overlap or touch [lo, hi)
- Merge them all into one interval
- An interval (a, b) overlaps/touches [lo, hi) if b >= lo and a <= hi

For `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- Split/trim as necessary

Let me think about performance with bisect:
- I'll maintain a sorted list of intervals
- For `contains`, I need to find the rightmost interval with `lo <= x`. I can use `bisect_right` on a list of `lo` values.

Actually, let me use `bisect` on the list of tuples directly. Since tuples compare lexicographically, I can search for `(x, float('inf'))` or similar.

Wait, let me think more carefully. If I have intervals sorted by `lo`, and I want to find if `x` is contained:
- Find the rightmost interval where `lo <= x`
- Check if `x < hi`

Using `bisect_right` on a list of `(lo, hi)` tuples: I search for the position where `(x, inf)` would be inserted. The interval at position `pos - 1` is the one with the largest `lo <= x`.

Actually, `bisect_right(intervals, (x, float('inf')))` gives the insertion point for `(x, inf)`. The interval at `pos - 1` has `lo <= x` (since `(lo, hi) <= (x, inf)` iff `lo < x` or `lo == x`). Wait, `(x, inf)` would be inserted after all tuples with first element `< x`, and after tuples with first element `== x` and second element `< inf`. Since `hi` is always finite (or could it be inf?), actually let me just use `bisect_right` with `(x, float('inf'))`.

Hmm, actually let me use a separate list of `lo` values for bisect operations to be cleaner.

Let me reconsider. I'll store intervals as a list sorted by `lo`. For bisect operations:

```python
import bisect

# intervals is a list of (lo, hi) sorted by lo
# For contains(x):
# Find rightmost interval with lo <= x
pos = bisect.bisect_right(self._intervals, (x, float('inf')))
if pos > 0:
    lo, hi = self._intervals[pos - 1]
    return lo <= x < hi
return False
```

For `add(lo, hi)`:
- If lo >= hi, ignore
- Find the range of intervals that overlap or touch [lo, hi)
- Two intervals [a, b) and [c, d) touch/overlap if b >= c and d >= a, i.e., a <= d and c <= b
- For [lo, hi) and [a, b): they touch/overlap if a < hi and b > lo... wait, half-open.
  - [a, b) touches [lo, hi) if a < hi (since if a >= hi, [a,b) starts at or after hi, no overlap/touch)
  - Wait, touching means b == lo or a == hi? No: [1,3) and [3,5) touch. So touching means b >= lo and a <= hi? No...
  - [1,3) and [3,5): b=3, lo=3, so b >= lo (3 >= 3) and a <= hi (1 <= 5). Yes, they touch.
  - [1,2) and [3,5): b=2, lo=3, b >= lo is 2 >= 3 which is false. They don't touch. Correct.
  - [1,3) and [3,5): b=3 >= lo=3 is true, a=1 <= hi=5 is true. They touch. Correct.
  - [1,3) and [2,5): overlap. b=3 >= lo=2 true, a=1 <= hi=5 true. Correct.
  
  Actually for half-open intervals [a,b) and [c,d):
  - They overlap if a < d and c < b
  - They touch (b == c or d == a) in addition
  
  For merging, I want to merge if b >= c and a <= d (which covers both overlap and touch for half-open). Wait:
  - [1,3) and [3,5): b=3, c=3. b >= c → 3 >= 3 true. a <= d → 1 <= 5 true. Merge to [1,5). ✓
  - [1,3) and [4,5): b=3, c=4. b >= c → 3 >= 4 false. Don't merge. ✓
  - [1,3) and [2,5): overlap. b=3 >= c=2 true, a=1 <= d=5 true. Merge to [1,5). ✓
  
  So the condition for merging is: existing_lo < hi and existing_hi > lo... wait no. Let me re-check.
  
  Actually for half-open [a,b) and [c,d):
  - They have a non-empty intersection if a < d and c < b
  - They touch if b == c (or equivalently d == a)
  - For the purpose of merging into a single half-open interval, we merge if b >= c and a <= d.
  
  Let me verify: [1,3) and [3,5): b >= c → 3 >= 3 ✓, a <= d → 1 <= 5 ✓. Merge to [1,5). ✓
  [1,3) and [2,4): b >= c → 3 >= 2 ✓, a <= d → 1 <= 4 ✓. Merge to [1,4). ✓
  [1,3) and [3.5, 5): b >= c → 3 >= 3.5 ✗. Don't merge. ✓

Great, so condition is: `iv_lo < hi and iv_hi > lo`... wait no, that's for strict overlap. Let me re-check with touching:
- [1,3) and [3,5): iv_lo=1 < hi=5 ✓, iv_hi=3 > lo=3? 3 > 3 is false. Hmm, that doesn't work.

OK let me be more careful. For half-open intervals [a,b) and [c,d):
- They overlap (non-empty intersection) iff a < d and c < b
- They touch iff b == c (a is before, c is after) or d == a
- For merging purposes (resulting in a single interval [min(a,c), max(b,d))), we need a < d and c <= b (the c <= b part includes touching where c == b).

Wait: [1,3) and [3,5): c=3, b=3. c <= b → 3 <= 3 ✓. a < d → 1 < 5 ✓. Merge. ✓
[1,3) and [3.5, 5): c=3.5, b=3. c <= b → 3.5 <= 3 ✗. Don't merge. ✓
[1,3) and [2,5): c=2, b=3. c <= b → 2 <= 3 ✓. a < d → 1 < 5 ✓. Merge. ✓
[1,3) and [0,2): c=0, b=3. c <= b → 0 <= 3 ✓. a < d → 1 < 2 ✓. Merge. ✓

So the condition for an existing interval [a,b) to overlap or touch with new [lo,hi) is:
`a < hi and lo <= b`

Which is equivalent to: `a < hi and b >= lo`.

Let me code `add`:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    # Find all intervals [a,b) where a < hi and b >= lo
    # These are intervals that overlap or touch [lo, hi)
    # Binary search for the first interval with b >= lo
    # Since intervals are sorted by lo, and b >= lo is not directly searchable by lo...
    
    # Actually, let me find the range differently.
    # An interval [a,b) does NOT overlap/touch [lo,hi) if:
    #   b < lo (entirely to the left) OR a >= hi (entirely to the right)
    # So I need intervals where a < hi AND b >= lo.
    
    # Since sorted by a (lo):
    # - a < hi: all intervals from start up to some point
    # - b >= lo: need to filter
    
    # Let me find the first interval with a >= hi (bisect_left on lo values)
    # And the last interval with b >= lo...
    
    # Since intervals are disjoint and sorted by a, b is also increasing!
    # So b >= lo means the interval is not entirely to the left.
    # I can binary search for the first interval with b >= lo.
    
    # Find left boundary: first interval with b >= lo
    # Find right boundary: first interval with a >= hi (or len)
    
    # Since intervals are sorted by lo and disjoint, hi values are also sorted.
    # bisect_left on the list of hi values to find first with b >= lo
    # bisect_left on the list of lo values to find first with a >= hi
```

Hmm, this is getting complex. Let me think about whether maintaining a separate sorted list of `lo` values and `hi` values helps.

Actually, since intervals are disjoint and sorted by `lo`, the `hi` values are also sorted. So I can use bisect on both.

Let me maintain the list of intervals and use bisect on tuples.

For finding intervals that overlap/touch [lo, hi):
- Left boundary: first interval where hi > lo (since if hi <= lo, interval is entirely to the left)
  - Wait, hi >= lo means interval's right end is at or after our left end. Actually hi > lo is what we need for strict overlap. But for touching, hi == lo also counts (e.g., [1,3) and [3,5) touch when lo=3).
  - So we need hi >= lo... but wait, for half-open, [1,3) and [3,5): the first has hi=3, the second has lo=3. They touch. So we need existing_hi >= new_lo.
  - Actually no. Let me reconsider. [1,3) means the point 3 is NOT in [1,3). And [3,5) means 3 IS in [3,5). They are adjacent/touching. We merge them.
  - So condition is existing_hi >= new_lo (for the left boundary check on existing intervals).
  
  Hmm wait, I had the condition `a < hi and b >= lo` earlier. Let me recheck:
  - a < hi: existing interval starts before new interval ends
  - b >= lo: existing interval ends at or after new interval starts
  
  For [1,3) and [3,5) where new=[3,5): a=1 < hi=5 ✓, b=3 >= lo=3 ✓. Merge. ✓
  For [1,3) and new=[3.5,5): a=1 < hi=5 ✓, b=3 >= lo=3.5 ✗. Don't merge. ✓

OK so the condition is `a < hi and b >= lo`.

Now for the sorted list:
- `a < hi`: since sorted by a, this means all intervals with index < bisect_right(intervals, (hi, -inf))... actually bisect_left on lo values for hi. All intervals with lo < hi.
- `b >= lo`: since b is also sorted (disjoint sorted intervals), this means all intervals with index >= bisect_left(hi_values, lo).

Wait, I need to be careful. Let me use `bisect_left` on the list of `lo` values to find first index with `lo >= hi` (that's the right boundary, exclusive). And I need to find the left boundary: first index where `hi >= lo`.

Since the intervals are sorted by lo and are disjoint, hi values are strictly increasing. So I can binary search on hi values too.

Let me just implement it straightforwardly:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi), sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        n = len(intervals)
        
        # Find left boundary: first interval with hi > lo (b >= lo means b > lo-epsilon... 
        # actually we need b >= lo for touching)
        # Since hi values are sorted, find first index where hi >= lo
        # Hmm, but we store (lo, hi) tuples. Let me extract or use a different approach.
        
        # Actually, let me just find the range by binary searching:
        # Right boundary (exclusive): first interval with lo >= hi_new
        right = bisect.bisect_left(intervals, (hi,))  # first with lo >= hi
        # Wait, bisect_left on tuples: bisect_left([(1,3),(5,7)], (5,)) gives index of (5,7) = 1
        # That's correct: first interval with lo >= hi
        
        # Left boundary: first interval with hi >= lo (i.e., not entirely to the left)
        # Since hi values are sorted (because intervals are disjoint and sorted by lo),
        # I can binary search. But I can't directly bisect on a list of tuples by hi.
        # Let me think...
        
        # For left boundary, I need the first interval where hi >= lo.
        # Equivalently, I need to skip intervals where hi < lo.
        # Since hi is sorted, I can binary search.
        # But Python's bisect doesn't easily search by second element.
        
        # Alternative: I can search from the right. The rightmost interval with lo < hi_new
        # is at index right-1. Among intervals [0, right), I need to find the first with hi >= lo.
        # Since hi values are sorted in this range, I can bisect.
        
        # Actually, let me just do a linear scan in the overlap range, or use a smarter approach.
        
        # For performance with 60k adds of small disjoint intervals:
        # Each add finds its position via bisect (O(log n)) and inserts (O(n) for list).
        # 60k inserts into a list: O(n) each, total O(n^2) = O(60000^2) = 3.6 billion... 
        # That might be too slow!
        
        # Hmm, 60000^2 / 2 = 1.8 billion list element moves. That's probably too slow.
        # But wait, the problem says "60,000 add() calls of small disjoint intervals in random order".
        # Disjoint intervals mean no merging happens - just insertion.
        # Insertion into a Python list is O(n) due to memory shifting.
        # 60000 * 60000 / 2 = ~1.8 billion byte copies... might be ~1-2 seconds in CPython.
        # Actually list.insert() in CPython is implemented in C and does memmove, so it's fast.
        # 60000 inserts, average 30000 elements shifted, each element is a pointer (8 bytes).
        # 60000 * 30000 * 8 = 14.4 GB of memory moved. At ~20 GB/s, that's ~0.7 seconds.
        # Should be fine.
        
        # For 200k contains with bisect: 200000 * log2(60000) ≈ 200000 * 16 = 3.2M operations. Very fast.
        
        # OK let me just go with the list approach.
        
        # For the left boundary, since the number of overlapping intervals is typically small 
        # (for disjoint interval additions, it's 0), I'll find left by scanning backward from right.
        
        # Actually, for correctness and simplicity:
        # After finding `right`, I scan backward from right-1 to find where hi < lo.
        # But for the worst case this could be O(n). However, for the given benchmark, intervals are disjoint so no merging.
        
        # Let me think of a better way. Since hi values are sorted:
        # I can maintain a separate list of hi values, or use bisect with a custom approach.
        
        # Actually, the simplest approach: since intervals are sorted by lo, and I need intervals
        # with hi >= lo, and hi values are also sorted (because intervals are disjoint),
        # I can binary search on hi. But Python's bisect doesn't directly support this on tuples.
        
        # Let me just do: find right boundary with bisect on lo, then scan backward from right-1
        # to find left boundary. In the common case (no overlap), the first check succeeds.
        
        left = right
        while left > 0 and intervals[left - 1][1] >= lo:
            left -= 1
        
        # Now intervals[left:right] are all the ones that overlap/touch [lo, hi)
        if left < right:
            new_lo = min(lo, intervals[left][0])
            new_hi = max(hi, intervals[right - 1][1])
            intervals[left:right] = [(new_lo, new_hi)]
        else:
            intervals.insert(right, (lo, hi))
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        n = len(intervals)
        
        # Find all intervals that overlap with [lo, hi)
        # Overlap condition: a < hi and b > lo (strict, since half-open)
        # Wait: [1,3) ∩ [3,5) = empty for half-open. So overlap is a < hi AND b > lo.
        # [1,3) ∩ [2,4): a=1 < 4 ✓, b=3 > 2 ✓. Overlap.
        # [1,3) ∩ [3,5): a=1 < 5 ✓, b=3 > 3? No. No overlap. Correct for half-open.
        
        # Find right boundary: first interval with lo >= hi (exclusive)
        right = bisect.bisect_left(intervals, (hi,))
        
        # Find left boundary: first interval with hi > lo (strict)
        # Scan backward from right-1
        left = right
        while left > 0 and intervals[left - 1][1] > lo:
            left -= 1
        
        if left == right:
            return  # no overlap
        
        # Process intervals[left:right]
        # For each interval (a, b) in this range:
        # - If a < lo and b > hi: split into (a, lo) and (hi, b)
        # - If a < lo and b <= hi: trim to (a, lo)
        # - If a >= lo and b > hi: trim to (hi, b)
        # - If a >= lo and b <= hi: remove entirely
        
        new_intervals = []
        for i in range(left, right):
            a, b = intervals[i]
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))
        
        intervals[left:right] = new_intervals
    
    def contains(self, x):
        intervals = self._intervals
        if not intervals:
            return False
        # Find rightmost interval with lo <= x
        pos = bisect.bisect_right(intervals, (x, float('inf')))
        if pos > 0:
            _, hi = intervals[pos - 1]
            return x < hi
        return False
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, I have a naming conflict: `intervals` is both a method and the internal list. Let me rename.

Also, let me reconsider the `bisect_left(intervals, (hi,))` call. This finds the first position where the tuple is >= (hi,). Since tuples compare element by element, (lo, hi) >= (hi,) is true when lo > hi, or lo == hi (and then hi > nothing since (hi,) has length 1). Actually in Python, (5, 7) >= (5,) is True because (5, 7) has more elements and the first elements are equal, and the longer tuple is greater. So `bisect_left(intervals, (hi,))` finds the first interval where `lo >= hi`. Wait:
- (3, 5) >= (3,) → True (first elements equal, second tuple is longer)
- (2, 5) >= (3,) → False (2 < 3)
- (3, 5) >= (4,) → False (3 < 4)

Hmm, that's not quite right. I want first interval with `lo >= hi`. `bisect_left(intervals, (hi,))`:
- This finds the first position where `intervals[i] >= (hi,)`
- (lo, hi_i) >= (hi,) iff lo > hi, or (lo == hi and True since (hi, hi_i) has length 2 > 1)
- So it finds first where lo >= hi. Wait: (hi, anything) >= (hi,) is True. And (lo, anything) >= (hi,) iff lo >= hi. Yes! Because if lo < hi, then (lo, ...) < (hi,). If lo == hi, then (lo, hi_i) > (hi,) because it's longer. If lo > hi, (lo, ...) > (hi,).

So `bisect_left(intervals, (hi,))` gives first index with lo >= hi. ✓

For `bisect_right(intervals, (x, float('inf')))` in contains:
- This finds the insertion point for (x, inf).
- (lo, hi) <= (x, inf) iff lo < x, or (lo == x and hi <= inf which is always true).
- So bisect_right gives first index where (lo, hi) > (x, inf), which means lo > x.
- So pos is the first index with lo > x, and pos-1 is the last index with lo <= x. ✓

Let me also reconsider the `remove` logic. For half-open intervals:
- [a, b) ∩ [lo, hi) is non-empty iff a < hi and lo < b (strict inequalities for half-open).
- Wait: [1, 3) ∩ [3, 5): a=1 < 5 ✓, lo=3 < b=3? 3 < 3 is False. No overlap. Correct.
- [1, 4) ∩ [3, 5): a=1 < 5 ✓, lo=3 < b=4 ✓. Overlap. Correct.

So for remove, overlap condition is `a < hi and b > lo` (strict both sides for half-open).

For the right boundary in remove: first interval with a >= hi → `bisect_left(intervals, (hi,))` (same as before, since a >= hi means no overlap).

For left boundary: first interval with b > lo. Since b values are sorted (intervals are disjoint and sorted by lo, so hi values are strictly increasing), I need the first interval with hi > lo.

Scanning backward from right-1: while intervals[left-1][1] > lo: left -= 1. This is correct.

For add, the touching condition is `a < hi and b >= lo` (b >= lo includes touching).

Let me also think about edge cases:
- Adding [3, 5) when [1, 3) exists: b=3 >= lo=3 ✓. They touch, merge to [1, 5).
- Removing [3, 5) from [1, 5): a=1 < hi=5 ✓, b=5 > lo=3 ✓. Overlap. Split into [1, 3). ✓
- Removing [1, 5) from [1, 5): a=1 < hi=5 ✓, b=5 > lo=1 ✓. a >= lo and b <= hi, remove. ✓

Now for performance of the backward scan in `add`: in the worst case, if we keep adding intervals that all touch, we scan many intervals. But for the benchmark (60k disjoint intervals), there's no overlap, so the scan terminates immediately.

Actually wait - for 60k small disjoint intervals in random order, each `add` call does:
1. bisect_left to find insertion point: O(log n)
2. Check if intervals[right-1][1] >= lo: O(1) typically (it's the previous interval, and since intervals are disjoint, this check fails immediately)
3. list.insert: O(n) for memory shift

The list.insert is O(n) but done in C, so for 60k elements it should be manageable.

Let me also make sure `total_length` returns a number (int or float). The sum of int-int differences gives int, and mixing gives float. That should be fine.

Let me also handle the edge case where `total_length()` with no intervals returns 0.

One more thing: the problem says "Keep the original values (no rounding)." This means I should store the exact values given (int or float) without converting.

Let me finalize the code:

```python
import bisect

class IntervalSet:
    __slots__ = ('_ivs',)
    
    def __init__(self):
        self._ivs = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # Right boundary: first interval with lo >= hi
        r = bisect.bisect_left(ivs, (hi,))
        # Left boundary: first interval with hi >= lo (touching or overlapping)
        l = r
        while l > 0 and ivs[l - 1][1] >= lo:
            l -= 1
        
        if l < r:
            new_lo = min(lo, ivs[l][0])
            new_hi = max(hi, ivs[r - 1][1])
            ivs[l:r] = [(new_lo, new_hi)]
        else:
            ivs.insert(r, (lo, hi))
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivs = self._ivs
        # Right boundary: first interval with lo >= hi
        r = bisect.bisect_left(ivs, (hi,))
        # Left boundary: first interval with hi > lo (strict overlap)
        l = r
        while l > 0 and ivs[l - 1][1] > lo:
            l -= 1
        
        if l >= r:
            return
        
        # Replace intervals[l:r] with the remaining pieces
        replacement = []
        for i in range(l, r):
            a, b = ivs[i]
            if a < lo:
                replacement.append((a, lo))
            if b > hi:
                replacement.append((hi, b))
        
        ivs[l:r] = replacement
    
    def contains(self, x):
        ivs = self._ivs
        if not ivs:
            return False
        pos = bisect.bisect_right(ivs, (x, float('inf')))
        if pos > 0:
            return x < ivs[pos - 1][1]
        return False
    
    def total_length(self):
        total = 0
        for lo, hi in self._ivs:
            total += hi - lo
        return total
    
    def intervals(self):
        return list(self._ivs)
    
    def __len__(self):
        return len(self._ivs)
```

Wait, I need to double-check the `bisect_left(ivs, (hi,))` behavior more carefully.

Python tuple comparison: `(a, b) < (c,)` is defined as:
- Compare first elements: if a < c, True; if a > c, False; if a == c, then (a, b) > (c,) because the second tuple is shorter.
- So (a, b) < (c,) iff a < c.
- And (a, b) >= (c,) iff a >= c.

So `bisect_left(ivs, (hi,))` finds the first index where `ivs[i] >= (hi,)`, which is the first interval where `lo >= hi`. ✓

And for `bisect_right(ivs, (x, float('inf')))`:
- `(lo, hi) <= (x, inf)` iff lo < x, or (lo == x and hi <= inf). Since hi is always finite (we're dealing with real numbers), hi <= inf is always true.
- So it finds the insertion point after all intervals with lo <= x.
- pos = first index where lo > x. pos - 1 = last index where lo <= x. ✓

Actually wait, what if hi could be infinity? The problem says "Bounds may be ints or floats." I'll assume they're finite. But even if hi were inf, `inf <= inf` is True in Python, so it would still work.

Let me also think about whether the backward scan could be O(n) in the worst case. Yes, but for the given performance requirements (60k small disjoint intervals), it won't happen. And for general use, the total work across all operations is amortized reasonable.

Actually, I realize there might be a subtle issue. When I do `ivs[l:r] = [(new_lo, new_hi)]` in add, or `ivs[l:r] = replacement` in remove, if l == r, I'd be inserting at position l. But I handle that case separately with `ivs.insert(r, (lo, hi))`. Actually, `ivs[l:r] = [(new_lo, new_hi)]` with l == r would also insert. Let me simplify:

Actually no, if l == r in the `add` method, it means no overlapping/touching intervals were found, so we just insert. The code already handles this correctly with the if/else.

Let me also think about whether `min(lo, ivs[l][0])` and `max(hi, ivs[r-1][1])` correctly preserve the original values. Since ivs[l][0] and ivs[r-1][1] are original values, and lo/hi are original values, min/max will preserve the original values. ✓

One more consideration: what if we add [3, 5) and then [1, 3)? 
- First add: ivs = [(3, 5)]
- Second add: bisect_left(ivs, (3,)) → looks for first tuple >= (3,). (3, 5) >= (3,) → True (3 >= 3). So r = 0.
- Then l = r = 0, while loop doesn't execute. l == r, so we insert at position 0: ivs = [(1, 3), (3, 5)].
- But these touch! They should be merged to [(1, 5)].

Oh no, there's a bug! When we insert at position 0, we don't check if the interval at position 0 (which is (3,5)) touches the new interval (1,3).

Wait, let me retrace: bisect_left(ivs, (3,)):
- ivs = [(3, 5)]
- Compare (3, 5) >= (3,)? In Python: (3, 5) >= (3,) → True.
- So bisect_left returns 0.

Then l = r = 0. The while loop condition is `l > 0` which is False, so we don't enter it.
Since l == r, we go to else: `ivs.insert(r, (lo, hi))` = `ivs.insert(0, (1, 3))`.
Result: [(1, 3), (3, 5)]. But these should be merged!

The issue is that the backward scan from position 0 can't find touching intervals to the left (there are none), but there might be touching intervals to the right that we should also check.

Hmm wait, the right boundary is the first interval with lo >= hi. For [1, 3), hi = 3. bisect_left(ivs, (3,)) on [(3, 5)] returns 0 because (3, 5) >= (3,) is True.

So r = 0, meaning no intervals to the left of position 0 overlap. But the interval at position 0 has lo = 3 = hi of new interval. It TOUCHES.

The issue is that my condition for overlap is `a < hi and b >= lo`, and the right boundary condition `a >= hi` excludes touching intervals. Let me reconsider.

The touching condition: [lo, hi) and [a, b) touch if hi == a (new interval's end equals existing start) or b == lo (existing end equals new start).

For the right boundary, I need first interval that does NOT overlap/touch. An interval doesn't overlap/touch if a >= hi (entirely to the right, not even touching). But a == hi means the existing starts where new ends - that IS touching!

So the right boundary should be: first interval with `a > hi` (strictly after). Let me fix:

`r = bisect.bisect_right(ivs, (hi,))` → first interval with (lo, hi_i) > (hi,). 
(lo, hi_i) > (hi,) iff lo > hi, or (lo == hi and True). So (lo, hi_i) > (hi,) iff lo >= hi.

Hmm, that gives the same result. Let me think differently.

I want first interval where `lo > hi` (strictly). That means I want to include intervals where lo == hi (touching).

`bisect_right(ivs, (hi, float('inf')))`: finds insertion point for (hi, inf).
(lo, hi_i) <= (hi, inf) iff lo < hi, or (lo == hi and hi_i <= inf which is True).
So bisect_right gives first index where lo > hi. That includes intervals with lo == hi. ✓

Let me use `bisect_right(ivs, (hi, float('inf')))` for the right boundary in `add`.

Let me re-trace: ivs = [(3, 5)], add (1, 3):
- r = bisect_right(ivs, (3, float('inf'))): (3, 5) <= (3, inf) → 3 == 3 and 5 <= inf → True. So bisect_right returns 1.
- r = 1.
- l = 1, while l > 0 and ivs[0][1] >= lo: ivs[0][1] = 5 >= 1? Yes! l = 0.
- l = 0, while l > 0: False. Stop.
- l < r (0 < 1): new_lo = min(1, ivs[0][0]) = min(1, 3) = 1. new_hi = max(3, ivs[0][1]) = max(3, 5) = 5.
- ivs[0:1] = [(1, 5)]. Result: [(1, 5)]. ✓

Now let me also check the other direction: ivs = [(1, 3)], add (3, 5):
- r = bisect_right(ivs, (5, float('inf'))): (1, 3) <= (5, inf) → 1 < 5 → True. bisect_right returns 1.
- r = 1.
- l = 1, while l > 0 and ivs[0][1] >= 3: ivs[0][1] = 3 >= 3 → True! l = 0.
- l = 0 < r = 1: new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- ivs[0:1] = [(1, 5)]. ✓

What about adding [1, 3) and then [4, 5)? Should NOT merge.
- ivs = [(1, 3)], add (4, 5):
- r = bisect_right(ivs, (5, inf)): (1, 3) <= (5, inf) → True. r = 1.
- l = 1, while l > 0 and ivs[0][1] >= 4: 3 >= 4? No. Stop.
- l == r == 1. Insert at position 1. ivs = [(1, 3), (4, 5)]. ✓

What about [1, 3) and [3.5, 5)? Should NOT merge.
- ivs = [(1, 3)], add (3.5, 5):
- r = bisect_right(ivs, (5, inf)): (1, 3) <= (5, inf) → True. r = 1.
- l = 1, while l > 0 and ivs[0][1] >= 3.5: 3 >= 3.5? No. Stop.
- l == r == 1. Insert. ivs = [(1, 3), (3.5, 5)]. ✓

Now for `remove`, the condition is strict overlap (not touching). Remove [3, 5) from [1, 3): should do nothing.
- ivs = [(1, 3)], remove (3, 5):
- r = bisect_left(ivs, (5,)): (1, 3) >= (5,)? 1 >= 5? No. r = 0... wait.
- Actually bisect_left(ivs, (5,)) on [(1, 3)]: is (1, 3) >= (5,)? No (1 < 5). So r = 1.
- l = 1, while l > 0 and ivs[0][1] > 3: 3 > 3? No. Stop.
- l == r == 1. Return. ✓

Remove [3, 5) from [1, 4): should give [1, 3).
- ivs = [(1, 4)], remove (3, 5):
- r = bisect_left(ivs, (5,)): (1, 4) >= (5,)? No. r = 1.
- l = 1, while l > 0 and ivs[0][1] > 3: 4 > 3? Yes! l = 0.
- l = 0 < r = 1. Process ivs[0] = (1, 4): a=1 < lo=3, so append (1, 3). b=4 > hi=5? No. 
- replacement = [(1, 3)]. ivs[0:1] = [(1, 3)]. ✓

Remove [1, 5) from [1, 3) ∪ [5, 7): should give nothing (well, [1,5) removes [1,3) and touches [5,7) but doesn't overlap it).
- ivs = [(1, 3), (5, 7)], remove (1, 5):
- r = bisect_left(ivs, (5,)): (1, 3) >= (5,)? No. (5, 7) >= (5,)? Yes. r = 1.
- l = 1, while l > 0 and ivs[0][1] > 1: 3 > 1? Yes! l = 0.
- l = 0 < r = 1. Process ivs[0] = (1, 3): a=1 < lo=1? No. b=3 > hi=5? No. Nothing.
- replacement = []. ivs[0:1] = []. ivs = [(5, 7)]. ✓

Good. Let me also verify remove doesn't accidentally remove touching intervals:
Remove [1, 5) from [5, 7): should leave [5, 7).
- ivs = [(5, 7)], remove (1, 5):
- r = bisect_left(ivs, (5,)): (5, 7) >= (5,)? Yes. r = 0.
- l = 0. l >= r. Return. ✓

Now, for `add`, I need to also handle the case where the new interval touches the interval to its RIGHT (at position r). Wait, no - I already handle it because I use `bisect_right(ivs, (hi, float('inf')))` which includes intervals with lo == hi in the range [l, r).

Let me verify: ivs = [(5, 7)], add [1, 5):
- r = bisect_right(ivs, (5, inf)): (5, 7) <= (5, inf)? 5 == 5 and 7 <= inf → True. r = 1.
- l = 1, while l > 0 and ivs[0][1] >= 1: 7 >= 1? Yes! l = 0.
- l = 0 < r = 1. new_lo = min(1, 5) = 1, new_hi = max(5, 7) = 7.
- ivs[0:1] = [(1, 7)]. ✓

And ivs = [(5, 7)], add [1, 4) (should NOT touch [5,7)):
- r = bisect_right(ivs, (4, inf)): (5, 7) <= (4, inf)? 5 <= 4? No. r = 0.
- l = 0. while l > 0: False.
- l == r == 0. Insert at 0. ivs = [(1, 4), (5, 7)]. ✓

Great, the logic is correct.

Now let me also think about whether `bisect_left(ivs, (hi,))` in remove is correct for the right boundary. I want first interval that does NOT overlap [lo, hi). Non-overlap means a >= hi (for half-open, a == hi means no overlap). So first interval with a >= hi.

`bisect_left(ivs, (hi,))`: first index where ivs[i] >= (hi,). ivs[i] = (a, b). (a, b) >= (hi,) iff a >= hi. ✓

And for the left boundary in remove: I scan backward for intervals with b > lo (strict, since b == lo means touching but not overlapping for half-open). ✓

I think the code is correct. Let me write the final version.

One more thought on performance: the backward `while` loop in add and remove. In the worst case (adding a huge interval that spans all existing intervals), it's O(n). But for the benchmark (small disjoint intervals), it's O(1) per operation.

For the overall benchmark: 60k adds with O(log n) bisect + O(1) scan + O(n) insert = dominated by O(n) inserts. Total: O(n²) for inserts, but with C-level memmove this should be ~0.5-1s for n=60k.

200k contains calls: each is O(log n) with bisect = ~16 comparisons. Total ~3.2M operations. Very fast.

Should be well under 5 seconds.

Let me write the final clean version.
