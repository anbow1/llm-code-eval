Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) efficiently.

Key requirements:
1. `add(lo, hi)`: Add interval, merge overlapping/touching intervals
2. `remove(lo, hi)`: Remove interval, may split
3. `contains(x)`: O(log n) lookup
4. `total_length()`: Sum of lengths
5. `intervals()`: Return sorted list of tuples, merged
6. `__len__()`: Number of intervals

For O(log n) contains(), I need a sorted data structure. The standard library has `bisect` module which gives O(log n) binary search on a sorted list. I'll use a sorted list of intervals (tuples).

Strategy:
- Store intervals as a sorted list of (lo, hi) tuples
- For `contains(x)`: Use `bisect` to find the position where x would be inserted, check if x falls within the interval just before that position. This is O(log n).
- For `add(lo, hi)`: Find all overlapping/touching intervals, merge them into one. Use bisect to find the range of intervals to merge.
- For `remove(lo, hi)`: Find all overlapping intervals, split/remove as needed.

Let me think about the data structure. I'll use a sorted list of (lo, hi) tuples.

For `contains(x)`:
- Use `bisect.bisect_right` on the list of lo values to find the rightmost interval whose lo <= x.
- Then check if x < hi of that interval.

Actually, let me use `bisect` on the list of tuples. If I have intervals sorted by lo, I can use `bisect_right` with a key or just work with the lo values.

Let me use a list of tuples sorted by lo. For contains:
- `idx = bisect.bisect_right(self._intervals, (x, float('inf')))` gives the first interval with lo > x
- So the candidate interval is at index `idx - 1`
- Check if `idx > 0 and self._intervals[idx-1][0] <= x < self._intervals[idx-1][1]`

Wait, `bisect_right` on tuples: comparing `(x, float('inf'))` with `(lo, hi)` tuples. Since we compare element by element, `(x, inf) < (lo, hi)` iff `x < lo` or (`x == lo` and `inf < hi` which is false). So `bisect_right(self._intervals, (x, float('inf')))` gives the first index where lo > x, OR where lo == x and hi < inf (never happens since hi is finite). Actually wait - if lo == x, then `(x, inf) > (x, hi)` since `inf > hi`. So `(x, inf)` would be placed after all intervals starting at x. That means `bisect_right` gives us the index after the last interval starting at x. So `idx - 1` would be the last interval with lo <= x.

Actually let me reconsider. Let me just use `bisect.bisect_right` with just the x value on a separate list of lo values, or I can use the `key` parameter (Python 3.10+).

Actually, simpler: use `bisect.bisect_right(self._starts, x)` where `_starts` is a parallel list of lo values. But maintaining two lists is annoying.

Alternative: store intervals as list of (lo, hi) tuples sorted by lo. Use `bisect.bisect_right(self._intervals, (x, float('inf')))`. This finds the rightmost position where `(x, inf)` would be inserted. Since tuples compare element-wise, `(x, inf) < (lo, hi)` iff `x < lo` or (`x == lo` and `inf < hi` which is never true for finite hi). So this gives us the count of intervals with lo < x, plus intervals with lo == x (since `(x,inf) > (x, hi)` always). Wait no: `(x, inf) > (x, hi)` is True, so `(x, inf)` would be placed AFTER `(x, hi)`. So `bisect_right` returns the index after all intervals with lo <= x.

So `idx = bisect.bisect_right(self._intervals, (x, float('inf')))` - then interval at `idx - 1` (if idx > 0) is the last interval with lo <= x. Check if `self._intervals[idx-1][1] > x` (i.e., x < hi).

This gives O(log n) for contains.

For `add(lo, hi)`:
- Ignore if lo >= hi
- Find the range of intervals that overlap or touch [lo, hi)
- Two intervals [a, b) and [c, d) overlap or touch if a <= d and c <= b (touching means b == c or a == d)
- Actually, overlap or touch: NOT (b <= c or d <= a), i.e., NOT (hi <= existing_lo or existing_hi <= lo)
- Or equivalently: existing_lo < hi and lo < existing_hi... wait no. [lo, hi) and [a, b) overlap or touch if NOT (hi <= a or b <= lo), i.e., hi > a and b > lo. Hmm, touching: [1,3) and [3,5) should merge. So touch means hi == a (or b == lo). So overlap or touch: NOT (hi <= a or b <= lo), which is hi > a and b > lo. Wait if hi == a, then hi <= a is true, so NOT(hi <= a) is false... 

Let me re-think. Two half-open intervals [lo, hi) and [a, b):
- They are disjoint with a gap if hi < a or b < lo (strictly)
- They touch if hi == a or b == lo
- They overlap if lo < b and a < hi (and not just touching)

For merging, we want to merge if they touch or overlap: NOT (hi < a or b < lo), i.e., hi >= a and b >= lo. Wait: if hi == a, we want to merge (touching). If b == lo, we want to merge. So condition for NOT merging: hi < a or b < lo. So merge condition: hi >= a AND b >= lo... no wait. 

[1, 3) and [3, 5): hi=3, a=3. hi >= a → 3 >= 3 → True. b=5, lo=1. b >= lo → 5 >= 1 → True. So merge condition is met. Good.

[1, 3) and [4, 5): hi=3, a=4. hi >= a → 3 >= 4 → False. Don't merge. Good.

So merge condition: NOT (hi < a or b < lo), which is hi >= a and b >= lo. Hmm wait, that's `hi >= a AND lo <= b`. Let me double-check with [3,5) and [1,3): hi=5, a=1, b=3, lo=3. 5>=1 and 3<=3. True. Good.

So for add:
- Find the first interval that could overlap/touch: the first interval with b > lo (i.e., hi > lo of existing). Using bisect: find first interval where hi > lo. Since intervals are sorted by lo, I need to find the first interval where existing_hi > lo. Hmm, this is trickier.

Actually, since intervals are sorted by lo, I can find:
- The first interval with lo < hi (our new hi): all intervals starting before our hi could potentially overlap. Use `bisect_right(self._intervals, (hi, float('inf')))` to find the upper bound.
- The last interval with hi > lo (our new lo): this is harder to find directly with sorted-by-lo.

Let me think differently. I'll find the insertion point for lo: `start_idx = bisect.bisect_left(self._intervals, (lo, -float('inf')))`. Actually let me use the key-based approach or just work with indices.

Let me use a simpler approach:
- `left = bisect.bisect_right(self._intervals, (lo, float('inf')))` - this gives the index after the last interval with lo <= our lo. But we also need to check the interval at left-1 (whose lo <= our lo but hi might extend into our interval).

Actually, let me define:
- `i = bisect.bisect_left(self._intervals, (lo, -float('inf')))` - first interval with lo >= our lo (or first with lo > our lo if we use -inf). Hmm, tuple comparison makes this tricky.

Let me just use a simpler approach with indices:

```python
# Find the range of intervals that overlap or touch [lo, hi)
# An interval [a, b) overlaps/touches if a <= hi and lo <= b
# i.e., a < hi (since a == hi means touching at a point, which we want to merge)
# Wait, [lo, hi) and [a, b): touching means hi == a or lo == b
# Merge if NOT (hi <= a or b <= lo) → hi > a and b > lo
# But for touching: hi == a means hi > a is False... 
# Hmm, let me reconsider.
```

Wait, [1,3) + [3,5) should give [1,5). So touching (hi == a) should merge. Let me re-examine:
- [lo, hi) = [1, 3), [a, b) = [3, 5). hi=3, a=3. hi > a? 3 > 3? No!
- So my condition `hi > a and b > lo` would NOT merge them. That's wrong.

Let me reconsider. For half-open intervals [lo, hi) and [a, b):
- They are disjoint with a gap: hi < a or b < lo (strictly less, meaning there's a gap)
- They touch: hi == a or b == lo (they meet at a point but don't overlap)
- They overlap: lo < b and a < hi (strict)

We want to merge if they touch or overlap. So: NOT (hi < a or b < lo) → hi >= a AND b >= lo.

Check: [1,3) and [3,5): hi=3, a=3. 3>=3 True. b=5, lo=1. 5>=1 True. Merge. ✓
Check: [1,3) and [4,5): hi=3, a=4. 3>=4 False. Don't merge. ✓

So merge condition: `hi >= a AND lo <= b`... wait `b >= lo` same as `lo <= b`. And `hi >= a`. Yes.

Hmm but actually for half-open intervals, [1,3) and [3,5) don't actually share any point (3 is not in [1,3) but IS in [3,5)). But the problem says to merge touching intervals. So we use the condition hi >= a AND lo <= b.

Wait no. Let me re-read: "[1,3) + [3,5) gives [(1, 5)]". Yes, they want touching to merge.

OK so merge condition: `NOT (hi < a or b < lo)` which simplifies to `hi >= a AND b >= lo`.

Now for finding the range of intervals to merge:
- Since intervals are sorted by lo, find the first interval with `b >= lo` (i.e., `hi_of_interval >= lo`). Since sorted by lo, this could be any interval. But practically, if we go left enough, we'll find it.
- Find the last interval with `a < hi` (i.e., `lo_of_interval < hi`). Since sorted by lo, this is `bisect_left(self._intervals, (hi, -inf))` minus 1... 

Hmm, let me think about this more carefully with tuple comparisons.

I'll store intervals as a list of tuples sorted by lo. For bisect operations:

To find the first interval that could potentially merge with [lo, hi):
- It's the first interval [a, b) where b > lo (if b == lo, they just touch at lo which is the start, but [lo,hi) includes lo, so [a, lo) and [lo, hi) touch → merge). Wait, [a, lo) and [lo, hi): b=lo, so b >= lo is True. So we should include it.
- Actually b >= lo means the interval [a,b) either overlaps or touches [lo, hi) from the left.

Hmm, finding "first interval with b >= lo" in a list sorted by a (lo) isn't straightforward with bisect.

Alternative approach: I'll use a slightly different strategy.

Since intervals are sorted by lo and are disjoint (and non-touching after normalization), the hi values are also sorted (because if [a1,b1) and [a2,b2) are disjoint and sorted, then b1 < a2 < b2, so b1 < b2). Wait, they're disjoint but after merging they're also non-touching, so b1 < a2 (strictly). So hi values ARE strictly sorted.

Wait no, before merging they might not be. But our invariant is that intervals are disjoint and non-touching (after each operation normalizes). So yes, hi values are strictly increasing.

So to find intervals that overlap or touch [lo, hi):
- Start from the left: find the rightmost interval with `a < hi` (since intervals sorted by a, use bisect). This is `bisect_left(self._intervals, (hi, -inf))`. Actually with tuples: `bisect_left(self._intervals, (hi,))` won't work well with tuple comparison.

Let me use a different approach. I'll maintain a list sorted by lo. For bisect operations, I'll use a key or extract lo values.

Actually, the simplest and cleanest: store the intervals as a list of (lo, hi) tuples sorted by lo. For bisect, I can use the fact that in Python, tuple comparison works element-wise.

`bisect_left(intervals, (lo, -float('inf')))` finds the first interval with `a >= lo` (since `(lo, -inf) <= (a, b)` iff `a > lo` or (`a == lo` and `b >= -inf` which is always true)). Wait: `(lo, -inf) <= (a, b)` means `lo < a` OR (`lo == a` AND `-inf <= b`). Since -inf <= b is always true for finite b, this simplifies to `lo <= a`. So `bisect_left` with key `(lo, -inf)` finds the first index where `lo <= a`, i.e., first interval with `a >= lo`.

`bisect_right(intervals, (hi, float('inf')))` finds the first index where `(hi, inf) < (a, b)`, i.e., `hi < a` (since `(hi,inf) < (a,b)` iff `hi < a` or (`hi == a` and `inf < b` which is false)). So it finds the first interval with `a > hi`.

But I need intervals where `a < hi` (they start before our hi). That's everything before `bisect_right(intervals, (hi, -inf))`... let me think.

`bisect_left(intervals, (hi, -float('inf')))` finds first interval with `(hi, -inf) <= (a, b)`, i.e., `a >= hi`. So intervals before this index have `a < hi`. 

Hmm wait: `(hi, -inf) <= (a, b)` means `hi < a` or (`hi == a` and `-inf <= b`). So first index where `hi <= a`... no. Let me be more careful.

Tuple comparison: `(x1, y1) < (x2, y2)` iff `x1 < x2` or (`x1 == x2` and `y1 < y2`).

`bisect_left(lst, key)` finds the leftmost position where `key <= lst[i]` (i.e., NOT `lst[i] < key`).

So `bisect_left(intervals, (hi, -float('inf')))`: finds first index where NOT `((a, b) < (hi, -inf))`, i.e., NOT (`a < hi` or (`a == hi` and `b < -inf`)). Since `b < -inf` is always false, this is NOT (`a < hi`), i.e., `a >= hi`.

So intervals at indices < this position have `a < hi`. These are candidates for overlapping/touching from the right side.

For the left side, I need intervals where `b >= lo`. Since intervals are sorted by a (and b is also sorted due to disjointness), I can find the last interval with `b < lo` using... hmm, b values are sorted but I can't directly bisect on them in a tuple list.

Alternative: I can scan leftward from the insertion point. Since intervals are disjoint and sorted, only a limited number of intervals to the left of our insertion point can have `b >= lo` (at most 1 actually! Because if interval at index i has `b_i >= lo`, and interval at i-1 has `a_{i-1} < a_i < b_i`, and they're disjoint so `b_{i-1} < a_i`, meaning `b_{i-1} < a_i`. But could `b_{i-1} >= lo`? Yes if `lo <= b_{i-1} < a_i <= b_i`. So multiple intervals could have `b >= lo`).

Hmm, actually it could be many intervals. But in practice, for the add operation, we're adding one interval, and we need to merge it with all overlapping ones. The number of intervals to merge is bounded.

Let me use a practical approach:

For `add(lo, hi)`:
1. Find `right = bisect.bisect_left(self._intervals, (hi, float('-inf')))` - first index with a >= hi. All intervals with a < hi are candidates.
2. Find `left`: scan backwards from `right - 1` to find the first interval that doesn't overlap/touch. But this could be O(n) in worst case.

Actually, let me think again. Since intervals are sorted by lo AND they're disjoint (so hi values are also sorted), I can use bisect on the hi values separately if I maintain a separate list. But that's extra bookkeeping.

Alternatively, for the left boundary: I need the first interval with `hi > lo` (strictly greater, because if hi == lo, [a, lo) and [lo, hi) touch, which we merge... wait no: if existing interval is [a, lo) and we're adding [lo, hi), then b=lo and our lo=lo, so b >= lo is True, they touch, we merge. So condition is `b >= lo`, i.e., `hi_of_existing >= lo`.

Hmm, since hi values are sorted (because intervals are sorted by lo and disjoint non-touching → hi strictly increasing), I could binary search on hi values. But storing them separately is complex.

Let me just do a linear scan from the right boundary leftward until I find an interval with hi < lo. In the worst case (one big interval in the middle and we add at the start), this is O(n), but for the typical use case described (adding small disjoint intervals in random order), the intervals are spread out and we only need to check a few.

Actually wait, the performance requirement says "60,000 add() calls of small disjoint intervals in random order followed by 200,000 contains() calls must take well under 5 seconds." If intervals are disjoint, each add() only needs to find the insertion point and insert - no merging. So the linear scan leftward would be O(1) amortized for the disjoint case.

But for a general implementation, the leftward scan could be problematic. Let me think of a better approach.

Since intervals are sorted by lo, and also by hi (because disjoint), I can binary search for the left boundary too. I need the first interval with `hi >= lo`. Since hi values are sorted, I could do `bisect_left` on a derived key. But with tuples (lo, hi), I can't directly bisect on the second element.

One option: maintain a separate sorted list of hi values, or use a different data structure.

Actually, let me reconsider. I can use a trick: for the left boundary, I know that if interval [a_i, b_i) is at index i and [a_{i+1}, b_{i+1}) is at index i+1, then b_i < a_{i+1} (strictly, since they're non-touching and disjoint). So the hi values form a strictly increasing sequence, interleaved with the lo values.

I can binary search for the left boundary using the following: find the rightmost interval with `hi < lo`. Since intervals are sorted by lo, and hi < lo implies... hmm.

Actually, let me think about it differently. Let me define the "end" of each interval. I want the last interval whose end is < lo. If I have a list of (lo, hi) sorted by lo, and I want the last one with hi < lo, I can't directly use bisect on the tuples.

Alternative approach: just scan leftward from the right boundary. In the worst case, this is O(n) for a single operation, but for the stated performance requirement (adding 60k disjoint intervals), it's fine because each add is O(log n) for finding position + O(1) for the scan (since the intervals are disjoint, only 0 intervals to the left overlap).

Actually, for 60,000 random inserts into a list, each insert is O(n) for the list shift. 60000 inserts into a list of up to 60000 elements... that's O(n^2) = 3.6 billion operations. That might be too slow!

Hmm, Python lists aren't great for many insertions. Let me think about alternatives.

Options:
1. Use a sorted list (like `sortedcontainers.SortedList`) - but that's not stdlib.
2. Use a balanced BST - not in stdlib.
3. Accept O(n) per insert but hope that 60k is fast enough in Python.

Actually, let's estimate: 60,000 inserts into a Python list. Each insert in the middle requires shifting O(n) elements. Average shift is O(n/2). Total work: sum from i=0 to 59999 of i/2 ≈ 59999^2 / 4 ≈ 9 * 10^8. In Python, list shifting is done in C, so it's fast. Each element is a small tuple, so memmove of pointers. 9 * 10^8 pointer copies / (say 10^9 per second for memmove) ≈ 1 second. Should be fine.

Plus the bisect operations: 60000 * log2(60000) * (Python interpreter overhead) ≈ 60000 * 16 * some_factor. Bisect is implemented in C, so it's fast.

And 200,000 contains calls: each is O(log n) via bisect, implemented in C. 200000 * 16 comparisons in C ≈ very fast.

I think using a Python list with bisect will work for the stated performance requirements.

Let me also consider using `array` module or other optimizations, but I think a plain list of tuples will be fine.

Let me code it up:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted by lo, disjoint, non-touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        
        intervals = self._intervals
        n = len(intervals)
        
        # Find range of intervals that overlap or touch [lo, hi)
        # Condition: existing_hi >= lo AND existing_lo <= hi (i.e., NOT touching with gap)
        # Actually: NOT (hi < existing_lo OR existing_hi < lo)
        # i.e., hi >= existing_lo AND existing_hi >= lo
        
        # Right boundary: first interval with lo >= hi
        right = bisect.bisect_left(intervals, (hi, float('-inf')))
        # All intervals[0:right] have existing_lo < hi
        
        # Left boundary: find first interval with existing_hi >= lo
        # Scan leftward from right-1
        left = right - 1
        while left >= 0 and intervals[left][1] >= lo:
            left -= 1
        left += 1  # first interval with hi >= lo
        
        # Now intervals[left:right] are the ones to merge
        if left < right:
            # Compute merged interval
            new_lo = min(lo, intervals[left][0])
            new_hi = max(hi, intervals[right-1][1])
            # Remove intervals[left:right] and insert merged
            intervals[left:right] = [(new_lo, new_hi)]
        else:
            # No overlapping intervals, just insert
            intervals.insert(left, (lo, hi))
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        
        intervals = self._intervals
        n = len(intervals)
        
        # Find intervals that overlap with [lo, hi)
        # Condition: existing_lo < hi AND existing_hi > lo (strict overlap)
        
        # Right boundary: first interval with lo >= hi
        right = bisect.bisect_left(intervals, (hi, float('-inf')))
        
        # Left boundary: first interval with hi > lo
        left = right - 1
        while left >= 0 and intervals[left][1] > lo:
            left -= 1
        left += 1
        
        if left >= right:
            return  # No intervals to modify
        
        new_intervals = []
        for i in range(left, right):
            a, b = intervals[i]
            # [a, b) overlaps with [lo, hi)
            # Left part: [a, min(a, lo)) if a < lo
            if a < lo:
                new_intervals.append((a, lo))
            # Right part: [max(b, hi), b) if b > hi
            if b > hi:
                new_intervals.append((hi, b))
        
        intervals[left:right] = new_intervals
    
    def contains(self, x):
        intervals = self._intervals
        idx = bisect.bisect_right(intervals, (x, float('inf')))
        if idx == 0:
            return False
        return intervals[idx - 1][0] <= x < intervals[idx - 1][1]
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, there's a problem with `intervals()` method - the method name conflicts with the instance variable `self._intervals`. Let me rename.

Actually looking at the spec: `intervals() -> list[tuple]`. This is a method. I'll store the data in `self._ivl` or something.

Let me also double-check the `contains` method:
- `bisect_right(intervals, (x, float('inf')))`: finds first index where `(x, inf) < (a, b)`, i.e., `x < a` or (`x == a` and `inf < b` → False). So finds first interval with `a > x`. Actually: `(x, inf) < (a, b)` iff `x < a` or (`x == a` and `inf < b`). Since `inf < b` is false for finite b, it's just `x < a`. So `bisect_right` finds first index with `a > x`, meaning all indices before have `a <= x`.
- So `idx - 1` is the last interval with `a <= x`. Check if `a <= x < b`. Since `a <= x` is guaranteed, just check `x < b`.
- If `idx == 0`, no interval starts at or before x, so x is not in any interval. ✓

Let me also think about edge cases in `add`:
- Adding [1, 3) when [0, 2) and [2, 5) exist: should merge to [0, 5).
- Adding [3, 5) when [1, 3) exists: touching, should merge to [1, 5).

For the leftward scan in `add`: I'm checking `intervals[left][1] >= lo`. This handles touching (existing_hi == lo means they touch and should merge). ✓

For the rightward scan (via bisect_left with key (hi, -inf)): I'm looking for intervals with `a < hi`. This means an interval [a, hi) would be included (a < hi is true), and it touches our [lo, hi) at hi. Should it merge? [lo, hi) and [a, hi) where a < hi: they overlap (since lo <= a < hi means they share [a, hi)). Wait, they share at least [max(lo, a), hi). Yes, overlap. ✓

What about interval [hi, b)? a == hi. `a < hi` is False, so it's excluded. But [lo, hi) and [hi, b) touch! We want to merge them!

Bug! Let me fix: I should use `bisect_left(intervals, (hi, float('-inf')))` which finds first with `a >= hi`. But I want to include intervals with `a == hi` (touching). So I should use `bisect_right(intervals, (hi, -float('inf')))`... 

Hmm wait. `bisect_left(intervals, (hi, -inf))` finds first index where `(hi, -inf) <= (a, b)`, i.e., `hi <= a` or (`hi == a` and `-inf <= b` → True). So first index where `a >= hi`. Intervals before this have `a < hi`.

But I want to include `a == hi` (touching). So I should use:
`right = bisect.bisect_right(intervals, (hi, float('inf')))` - finds first index where `(hi, inf) < (a, b)`, i.e., `hi < a` or (`hi == a` and `inf < b` → False). So first index with `a > hi`. Intervals before have `a <= hi`. This includes `a == hi`. ✓

Similarly for the left boundary in add, I want `existing_hi >= lo` (touching included). My while loop already handles this.

Let me also fix the remove: for remove, I want strict overlap: `existing_hi > lo AND existing_lo < hi`. (Touching at a single point doesn't remove anything since intervals are half-open.)

For remove right boundary: first interval with `a >= hi`: `bisect_left(intervals, (hi, -inf))`. Intervals before have `a < hi`. ✓ (Strict: a == hi means [hi, b) doesn't overlap with [lo, hi) since hi is not in [lo, hi)).

For remove left boundary: first interval with `hi > lo`. Scan leftward while `intervals[left][1] > lo`. ✓ (If existing_hi == lo, [a, lo) doesn't overlap with [lo, hi) since lo is not in [a, lo) but IS in [lo, hi)... wait. [a, lo) contains points < lo. [lo, hi) contains points >= lo. They don't overlap. So `existing_hi > lo` (strict) is correct.)

Let me also reconsider the right boundary for add. I changed to `bisect_right(intervals, (hi, float('inf')))`:
- Finds first index where NOT `(a, b) <= (hi, inf)`, i.e., NOT (`a < hi` or (`a == hi` and `b <= inf`)). Since `b <= inf` is always true, this is NOT(`a <= hi`), i.e., `a > hi`.
- So intervals at indices < right have `a <= hi`. Including `a == hi` (touching). ✓

Wait, I need to double-check. `bisect_right(lst, key)` returns the rightmost position where key can be inserted to keep order, i.e., it's equivalent to `bisect_left` for finding the first element > key. Let me verify:

`bisect_right([1, 2, 3, 3, 4], 3)` = 4 (insert after the last 3).

For tuples: `bisect_right([(1,2), (3,4), (3,5), (5,6)], (3, inf))`:
- `(3, inf) <= (1, 2)`? `3 <= 1`? No. 
- `(3, inf) <= (3, 4)`? `3 <= 3` and `inf <= 4`? No (inf > 4).
- `(3, inf) <= (3, 5)`? Same, No.
- `(3, inf) <= (5, 6)`? `3 <= 5`? Yes.

Hmm wait, bisect_right compares differently. `bisect_right` finds the insertion point to the right of any existing equal elements. The comparison is `key >= element` or `element <= key`.

Let me look at it differently. `bisect_right(a, x)` returns `i` such that all elements in `a[:i]` are `<= x` and all elements in `a[i:]` are `> x`.

For tuples: `(a_val, b_val) <= (hi, inf)` iff `a_val < hi` or (`a_val == hi` and `b_val <= inf`). Since `b_val <= inf` is always true for finite b_val, this is `a_val <= hi`.

So `bisect_right(intervals, (hi, inf))` gives the first index where `a > hi`. All intervals before have `a <= hi`. ✓

Great, so for add, right boundary should use `bisect_right(intervals, (hi, float('inf')))`.

Now let me also think about the total_length. Should it be O(n) or O(1)? The spec just says "sum of all interval lengths." O(n) is fine since it's not in the performance-critical path.

Let me finalize the code:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._ivl = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        ivl = self._ivl
        # Find range of intervals to merge
        # Include touching: existing_lo <= hi AND existing_hi >= lo
        right = bisect.bisect_right(ivl, (hi, float('inf')))  # first with lo > hi
        left = right - 1
        while left >= 0 and ivl[left][1] >= lo:
            left -= 1
        left += 1
        
        if left < right:
            new_lo = min(lo, ivl[left][0])
            new_hi = max(hi, ivl[right - 1][1])
            ivl[left:right] = [(new_lo, new_hi)]
        else:
            ivl.insert(left, (lo, hi))
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivl = self._ivl
        # Strict overlap: existing_lo < hi AND existing_hi > lo
        right = bisect.bisect_left(ivl, (hi, float('-inf')))  # first with lo >= hi
        left = right - 1
        while left >= 0 and ivl[left][1] > lo:
            left -= 1
        left += 1
        
        if left >= right:
            return
        
        new_parts = []
        for i in range(left, right):
            a, b = ivl[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        ivl[left:right] = new_parts
    
    def contains(self, x):
        ivl = self._ivl
        idx = bisect.bisect_right(ivl, (x, float('inf')))
        if idx == 0:
            return False
        lo, hi = ivl[idx - 1]
        return lo <= x < hi
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._ivl)
    
    def intervals(self):
        return list(self._ivl)
    
    def __len__(self):
        return len(self._ivl)
```

Wait, I need to double-check `bisect_left(ivl, (hi, float('-inf')))` for the remove's right boundary:
- `bisect_left(a, x)` returns first index i such that `a[i] >= x`.
- `(a_val, b_val) >= (hi, -inf)` iff `a_val > hi` or (`a_val == hi` and `b_val >= -inf`). Since `b_val >= -inf` is always true, this is `a_val >= hi`.
- So `right` is the first index with `a >= hi`. Intervals before have `a < hi`. ✓ (We want strict: existing_lo < hi for overlap)

And for `add`, `bisect_right(ivl, (hi, float('inf')))`:
- Returns first index where `a > hi`. Intervals before have `a <= hi`. ✓ (We want to include touching at hi)

Looks correct. Let me trace through some examples:

Example 1: add(1, 3), add(3, 5)
- After add(1,3): ivl = [(1, 3)]
- add(3, 5): right = bisect_right([(1,3)], (5, inf)) = 1 (since (1,3) <= (5,inf)). left: start at 0, ivl[0][1]=3 >= lo=3? Yes! left becomes -1, then left+1=0. So left=0, right=1. new_lo=min(3,1)=1, new_hi=max(5,3)=5. ivl[0:1] = [(1,5)]. ✓

Example 2: add(1, 3), add(4, 5)
- After add(1,3): ivl = [(1, 3)]
- add(4, 5): right = bisect_right([(1,3)], (5, inf)) = 1. left: start at 0, ivl[0][1]=3 >= lo=4? No. left stays at 0, left+1=1. So left=1, right=1. left >= right, insert at 1. ivl = [(1,3), (4,5)]. ✓

Example 3: remove(2, 4) from [(1, 5)]
- right = bisect_left([(1,5)], (4, -inf)). (1,5) >= (4, -inf)? 1 >= 4? No. So right = 1.
- left: start at 0, ivl[0][1]=5 > lo=2? Yes. left becomes -1, left+1=0.
- left=0, right=1. Process ivl[0] = (1,5). a=1 < lo=2 → add (1,2). b=5 > hi=4 → add (4,5).
- ivl[0:1] = [(1,2), (4,5)]. ✓

Example 4: remove(0, 6) from [(1, 3), (5, 8)]
- right = bisect_left([(1,3),(5,8)], (6, -inf)). (1,3) >= (6,-inf)? No. (5,8) >= (6,-inf)? 5>=6? No. So right=2.
- left: start at 1, ivl[1][1]=8 > 0? Yes. left=0, ivl[0][1]=3 > 0? Yes. left=-1, left+1=0.
- left=0, right=2. Process both. (1,3): a=1<0? No. b=3>6? No. Nothing added. (5,8): a=5<0? No. b=8>6? Yes → add (6,8).
- ivl[0:2] = [(6,8)]. ✓

Looks good. Let me also handle potential edge cases with float('inf') and float('-inf') as bounds. The spec says "Bounds may be ints or floats." If someone passes float('inf') as a bound, my bisect keys might cause issues. But I think for practical purposes, if lo or hi is inf, the bisect comparisons should still work since I'm comparing finite x values against them.

Actually, if hi is inf in `add(lo, float('inf'))`, then `bisect_right(ivl, (inf, inf))` would return len(ivl) since (a,b) <= (inf,inf) is always true. That's correct.

If lo is -inf in `add(float('-inf'), hi)`, then the while loop condition `ivl[left][1] >= -inf` is always true, so left goes to -1, then 0. Correct.

I think the implementation is solid. Let me write the final version.

One more thought on performance: the leftward scan in `add` and `remove`. For the 60k disjoint intervals scenario:
- When adding a disjoint interval, the leftward scan checks at most 1 element (the interval just to the left) and finds it doesn't overlap. So it's O(1).
- The bisect is O(log n).
- The list insert is O(n) for shifting.
- Total for 60k adds: sum of i for i in 0..59999 ≈ 1.8 billion pointer copies. In C (which list.insert uses internally via memmove), this should take maybe 1-2 seconds. Should be under 5 seconds.

For 200k contains: 200k * O(log 60k) ≈ 200k * 16 = 3.2M comparisons in C. Very fast.

I'm satisfied with this implementation. Let me write the final clean version.
