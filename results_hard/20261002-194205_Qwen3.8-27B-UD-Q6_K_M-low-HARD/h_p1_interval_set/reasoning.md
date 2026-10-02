Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) with:
- `add(lo, hi)` - add interval, merging with overlapping ones
- `remove(lo, hi)` - remove interval, potentially splitting
- `contains(x)` - O(log n) membership test
- `total_length()` - sum of lengths
- `intervals()` - sorted, merged list of (lo, hi) tuples
- `__len__()` - number of intervals

Performance requirements:
- `contains()` must be O(log n)
- 60,000 add() calls of small disjoint intervals in random order + 200,000 contains() calls must take well under 5 seconds.

Since we need O(log n) for `contains()`, I can't use a simple list. I need a balanced BST or a sorted structure.

Options:
1. Use a sorted list with `bisect` - but insertion/deletion is O(n) in the worst case
2. Use a balanced BST like `sortedcontainers.SortedList` - but that's not standard library
3. Use a B-tree or similar structure
4. Use a simple approach: since we need O(log n) for contains, I can maintain a sorted list of intervals and use binary search. For add/remove, I can accept O(n) worst case since the performance requirement is specifically about contains() being O(log n) and the overall 60k add + 200k contains being under 5 seconds.

Wait, let me re-read: "60,000 add() calls of small disjoint intervals in random order followed by 200,000 contains() calls must take well under 5 seconds."

If the intervals are small and disjoint, then each add() will likely only need to check a few neighbors (or none at all if they're truly disjoint and non-adjacent). So even with a sorted list approach using bisect, the add operations should be fast if the intervals don't overlap much.

Actually, let me think more carefully. With a sorted list of intervals:
- `add(lo, hi)`: Use bisect to find where lo falls. Then check neighboring intervals for overlap. If there are overlaps, merge them. This is O(k + 1) where k is the number of overlapping intervals (typically small), plus O(n) for the list insertion due to shifting.
- `contains(x)`: Use bisect to find the interval that might contain x. O(log n).

The O(n) for insertion in a Python list is due to the memory shift, but in practice it's very fast (it's just memmove in C). For 60,000 intervals, each insertion shifts at most 60,000 pointers, which is ~480KB of data to move. That should be fast.

Actually, let me reconsider. With 60k intervals in a list, each insertion in the middle would require shifting ~30k elements on average. 60,000 * 30,000 * 8 bytes = 14.4 GB of memory movement. That might be too slow.

Hmm, but actually Python lists store pointers (8 bytes each), and memmove is very fast. 60,000 insertions each moving ~30,000 pointers = 1.8 billion pointer moves. At ~10 GB/s for memmove, that's about 0.18 seconds for the moves alone. But there's also the overhead of Python list operations.

Actually, let me reconsider. In CPython, list insertion in the middle does call `memmove` which is highly optimized. Let me think about whether this will be fast enough.

60,000 insertions, each requiring on average O(n/2) = 30,000 pointer moves. Total: 60,000 * 30,000 = 1.8 * 10^9 pointer moves. Each pointer is 8 bytes, so 14.4 GB of data moved. At typical memmove speeds of ~10-20 GB/s, that's 0.7-1.4 seconds. Plus the Python overhead for bisect and list operations.

This might be borderline. Let me think of a better approach.

Alternative: Use a different data structure. Since we're in standard library only:

Option A: Use a sorted list (list of tuples) with bisect. Accept O(n) for add/remove but O(log n) for contains.

Option B: Build a B-tree from scratch. This would give O(log n) for all operations.

Option C: Use a treap (randomized BST) implemented in Python. This gives expected O(log n) for all operations.

Let me go with Option A first and see if it's fast enough. The key insight is that the test says "small disjoint intervals in random order" - if they're disjoint, each add() will only need to check immediate neighbors (at most 2) and insert one new interval. The bisect is O(log n) and the list insert is O(n) in terms of pointer moves but very fast in practice.

Actually, let me just go with the sorted list approach. For 60k intervals:
- bisect: O(log 60000) ≈ 17 comparisons - negligible
- list.insert: O(n) pointer moves, but memmove is fast
- The 200k contains() calls: each is O(log n) ≈ 17 comparisons - negligible

The main cost will be the 60k list insertions. Let me estimate more carefully:
- Python list.insert calls PyObject_Free and memmove internally
- For 60k elements, average insertion position is n/2, so average memmove size is 30k * 8 = 240KB
- 60,000 * 240KB = 14.4GB total data moved
- memmove typically runs at ~10-50 GB/s depending on system
- So 0.3-1.4 seconds for the memory moves alone

This should be well under 5 seconds. Let me go with the sorted list approach.

Let me implement this:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find where to insert
        # We need to find all intervals that overlap with [lo, hi)
        # An interval [a, b) overlaps with [lo, hi) if a < hi and b > lo
        
        # First, find the rightmost interval that could potentially overlap
        # We want intervals where hi > lo (i.e., they extend past lo)
        # And intervals where lo < hi (i.e., they start before hi)
        
        # Binary search for the insertion point of lo
        # The relevant intervals start at or before hi and end after lo
        
        # Let's find the first interval with hi > lo
        # We need to search by the lo values to find candidates
        
        # Strategy: find the interval where lo falls, or the gap where lo falls
        # Then check neighbors for overlap
        
        # Find the position where lo would be inserted in terms of interval starts
        idx = bisect_right(self._intervals, (lo, float('inf')))
        # idx is the index where (lo, inf) would be inserted, so intervals[0..idx-1] have lo <= lo
        # Actually, bisect_right with (lo, inf) gives us the position after all intervals with lo <= lo
        # But we want to check from idx-1 backwards and idx forwards
        
        # Actually, let me think differently.
        # Find the first interval that could overlap: we need intervals with start < hi and end > lo
        # Since intervals are sorted by start, we can find all intervals with start < hi
        # Among those, we need ones with end > lo
        
        # The intervals that could overlap are:
        # - The interval containing lo (if any): the one with start <= lo < end
        # - Intervals that start within [lo, hi)
        # - Intervals that contain hi (start < hi <= end) - but this is handled by start < hi
        
        # So: find all intervals with start < hi, then filter for end > lo
        # The first such interval could be anywhere from 0 to n
        
        # Better approach: 
        # 1. Find the index of the last interval with start < hi (using bisect_left on starts)
        # 2. Go backwards from that index to find the first interval with end > lo
        # 3. All intervals from that point to the end of the "start < hi" range overlap
        
        # Actually, the simplest approach:
        # - Use bisect to find the position where lo fits
        # - Check the interval at that position and the one before
        # - Expand to cover all overlapping intervals
        
        # Let me use a different approach:
        # Find the leftmost interval that could overlap with [lo, hi)
        # That's the rightmost interval with end > lo AND start < hi
        # Since intervals are sorted by start and non-overlapping:
        # - Intervals are sorted: [a0, b0), [a1, b1), ... with ai >= b(i-1)
        # - An interval [ai, bi) overlaps with [lo, hi) iff ai < hi and bi > lo
        # - Since bi <= a(i+1) (non-overlapping), if bi <= lo, then all subsequent intervals also don't overlap (their starts are >= bi > lo... wait no, their starts are >= bi which could be > lo)
        # Actually if bi <= lo, then interval i doesn't overlap. But interval i+1 has a(i+1) >= bi, so it might or might not overlap.
        
        # Let me just do:
        # 1. Find the index where lo would be inserted among the starts
        # 2. Check that interval and the previous one for overlap
        # 3. Expand in both directions while there's overlap
        
        # Step 1: find index
        # bisect_left(self._intervals, (lo,)) gives the first interval with start >= lo
        # But we want the first interval with start >= lo... 
        # Actually, (lo, -inf) would be before any interval with start == lo
        # (lo, inf) would be after any interval with start == lo
        
        # Let's use: idx = bisect_left(self._intervals, (lo, float('-inf')))
        # This gives us the first interval with start >= lo
        # The interval at idx-1 (if exists) has start < lo and might contain lo
        
        # Hmm, this is getting complicated with tuple comparison. Let me use a helper.
        
        pass
```

Actually, let me simplify. I'll store intervals as a list of (lo, hi) tuples sorted by lo. For binary search, I'll search on the lo values.

Let me use a cleaner approach:

```python
from bisect import bisect_left

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of [lo, hi], sorted by lo, disjoint and merged
    
    def _find_insert_pos(self, val):
        """Find the index where val would be inserted among interval lo values."""
        # Binary search for the first interval with lo >= val
        lo_idx = 0
        hi_idx = len(self._intervals)
        while lo_idx < hi_idx:
            mid = (lo_idx + hi_idx) // 2
            if self._intervals[mid][0] < val:
                lo_idx = mid + 1
            else:
                hi_idx = mid
        return lo_idx
```

Wait, I should just use bisect on the lo values. Let me store the intervals as a list and use a separate key for bisect, or just extract lo values.

Actually, the cleanest approach: store as a list of (lo, hi) tuples. Since they're sorted by lo, I can use bisect with a key. But Python's bisect doesn't have a key parameter until 3.10... wait, actually it does! `bisect.bisect_right(a, x, lo=0, hi=None, *, key=None)` was added in Python 3.10.

Since we're using Python 3.11+, I can use the key parameter.

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        
        # Find all intervals that overlap with [lo, hi)
        # An interval (a, b) overlaps if a < hi and b > lo
        
        # Find the first interval with lo >= lo (i.e., start >= lo)
        # Intervals before this might still overlap (if they contain lo)
        
        # Find the leftmost candidate: the last interval that could overlap
        # We need intervals with start < hi (they could extend into [lo, hi))
        # And among those, intervals with end > lo
        
        # Strategy:
        # 1. Find index of first interval with start >= hi → all intervals before this have start < hi
        # 2. From the rightmost of those, go backwards while end > lo
        # 3. The merged interval is [min(lo, first.start), max(hi, last.end)]
        
        # Step 1: find right boundary
        # bisect_left with key=lambda x: x[0], value=hi gives first index where start >= hi
        right = bisect_left(self._intervals, hi, key=lambda x: x[0])
        
        # Step 2: find left boundary
        # The interval at right-1 has the largest start < hi
        # We need to go back from right-1 while intervals have end > lo
        left = right
        while left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1
        
        # Now intervals[left:right] all overlap with [lo, hi)
        # Merge: new_lo = min(lo, self._intervals[left][0]) if left < right else lo
        #         new_hi = max(hi, self._intervals[right-1][1]) if left < right else hi
        
        if left < right:
            new_lo = min(lo, self._intervals[left][0])
            new_hi = max(hi, self._intervals[right - 1][1])
        else:
            new_lo = lo
            new_hi = hi
        
        self._intervals[left:right] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        
        # Find all intervals that overlap with [lo, hi)
        right = bisect_left(self._intervals, hi, key=lambda x: x[0])
        left = right
        while left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1
        
        new_intervals = []
        # Intervals before left: keep as is (no overlap)
        # Intervals from left to right-1: may need to be split
        for i in range(left, right):
            a, b = self._intervals[i]
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))
        # Intervals after right-1: keep as is
        
        self._intervals[left:right] = new_intervals
    
    def contains(self, x):
        # Find the interval that might contain x
        # We need an interval (a, b) where a <= x < b
        # Find the last interval with start <= x
        idx = bisect_right(self._intervals, x, key=lambda x: x[0]) - 1
        if idx >= 0:
            a, b = self._intervals[idx]
            return a <= x < b
        return False
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, there's a subtlety with `bisect_right` and the key. Let me double-check:
- `bisect_right(self._intervals, x, key=lambda x: x[0])` returns the insertion point for x in the list, considering only the lo values. It returns the index where x would be inserted to maintain sorted order, with equal values going to the right.

So `bisect_right(intervals, x, key=lambda t: t[0])` gives the index after all intervals with lo <= x. So `idx - 1` gives the last interval with lo <= x, which is the candidate for containing x.

For `contains(x)`: we need the interval where lo <= x < hi. The last interval with lo <= x is the only candidate (since intervals are disjoint and sorted).

This looks correct!

Let me also think about edge cases:
- `add(1, 3)` then `add(3, 5)` → should merge to `[(1, 5)]`
  - First add: intervals = [(1, 3)]
  - Second add: lo=3, hi=5
    - right = bisect_left(intervals, 5, key=lambda t: t[0]) → 1 (since 1 < 5)
    - left starts at 1, check intervals[0] = (1, 3): 3 > 3? No! So left stays at 1.
    - left == right, so new_lo = 3, new_hi = 5
    - intervals[1:1] = [(3, 5)] → intervals = [(1, 3), (3, 5)]
    
  But the problem says touching intervals should be merged! "[1,3) + [3,5) gives [(1, 5)]"

So I need to also merge touching intervals. Let me fix the condition:
- Two intervals [a, b) and [b, c) touch and should be merged into [a, c)
- So in `add`, I should check if `self._intervals[left-1][1] >= lo` (not just `> lo`)

Wait, but if we have [1, 3) and we're adding [3, 5):
- The interval [1, 3) doesn't overlap with [3, 5) (since 3 < 3 is false)
- But they touch, so we should merge them

So the condition for "overlaps or touches" is: `a <= hi and b >= lo` (instead of `a < hi and b > lo`)

Let me revise:
- Overlap or touch: `a <= hi and b >= lo`
- This means: find intervals with start <= hi (not < hi) and end >= lo (not > lo)

Actually wait, let me reconsider. If I have [1, 3) and add [3, 5):
- They don't overlap (no common element)
- But they should be merged per the problem statement

So the merge condition is: `a <= hi and b >= lo` (closed overlap on the boundary)

Let me update:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find intervals that overlap or touch [lo, hi)
    # Condition: a <= hi and b >= lo
    
    # Right boundary: first interval with start > hi
    right = bisect_right(self._intervals, hi, key=lambda t: t[0])
    
    # Left boundary: go back from right while end >= lo
    left = right
    while left > 0 and self._intervals[left - 1][1] >= lo:
        left -= 1
    
    if left < right:
        new_lo = min(lo, self._intervals[left][0])
        new_hi = max(hi, self._intervals[right - 1][1])
    else:
        new_lo = lo
        new_hi = hi
    
    self._intervals[left:right] = [(new_lo, new_hi)]
```

Now for `remove(lo, hi)`:
- We need to find intervals that overlap with [lo, hi) (strict overlap: a < hi and b > lo)
- We should NOT split on touching boundaries
- E.g., removing [2, 4) from [1, 3) should give [1, 2) (since [1,3) ∩ [2,4) = [2,3))
- Removing [3, 5) from [1, 3) should give [1, 3) unchanged (no actual overlap)

Wait, [1, 3) and [3, 5): is 3 in [1, 3)? No, [1, 3) means 1 <= x < 3. Is 3 in [3, 5)? Yes. So they share no elements. So removing [3, 5) from a set containing [1, 3) should not change [1, 3).

So for remove, the overlap condition is strictly: a < hi and b > lo.

Let me verify: remove [2, 4) from [1, 5):
- [1, 5) overlaps [2, 4) since 1 < 4 and 5 > 2
- Result: [1, 2) and [4, 5)

Remove [2, 4) from [1, 3):
- [1, 3) overlaps [2, 4) since 1 < 4 and 3 > 2
- a=1 < lo=2: keep [1, 2)
- b=3 > hi=4? No. So just [1, 2)

Remove [3, 5) from [1, 3):
- [1, 3) overlaps [3, 5) since 1 < 5 and 3 > 3? No! 3 > 3 is false.
- So no overlap, [1, 3) stays.

Good, so for remove:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    # Find intervals that strictly overlap [lo, hi)
    # Condition: a < hi and b > lo
    
    # Right boundary: first interval with start >= hi
    right = bisect_left(self._intervals, hi, key=lambda t: t[0])
    
    # Left boundary: go back from right while end > lo
    left = right
    while left > 0 and self._intervals[left - 1][1] > lo:
        left -= 1
    
    new_intervals = []
    for i in range(left, right):
        a, b = self._intervals[i]
        if a < lo:
            new_intervals.append((a, lo))
        if b > hi:
            new_intervals.append((hi, b))
    
    self._intervals[left:right] = new_intervals
```

Let me verify remove [2, 4) from [1, 3):
- right = bisect_left(intervals, 4, key=lo) → 1 (since 1 < 4)
- left = 1, check intervals[0] = (1, 3): 3 > 2? Yes. left = 0.
- Check intervals[-1]: doesn't exist. left = 0.
- i=0: a=1 < 2: append (1, 2). b=3 > 4? No.
- new_intervals = [(1, 2)]
- intervals[0:1] = [(1, 2)] → intervals = [(1, 2)] ✓

Remove [3, 5) from [1, 3):
- right = bisect_left(intervals, 5, key=lo) → 1
- left = 1, check intervals[0] = (1, 3): 3 > 3? No. left stays 1.
- left == right, no intervals to process.
- intervals[1:1] = [] → no change. ✓

Now let me think about the `intervals()` method. The problem says "sorted, disjoint, and with touching intervals merged". Since we always merge touching intervals in `add`, the stored intervals should already be merged. But what about after `remove`? Could remove create touching intervals?

Example: We have [1, 5). Remove [2, 3). Result: [1, 2) and [3, 5). These don't touch (2 < 3), so they stay separate. ✓

Example: We have [1, 5). Remove [2, 4). Result: [1, 2) and [4, 5). Don't touch. ✓

What if we have [1, 3) and [3, 5) as separate intervals? That shouldn't happen because add merges them. But could remove create such a situation? 

Actually, no. If we have [1, 5) and remove [2, 3), we get [1, 2) and [3, 5). These don't touch. If we remove [2, 4), we get [1, 2) and [4, 5). Still don't touch.

What about: [1, 5), remove [2, 3) → [1, 2), [3, 5). Then add [2, 3) → should merge all three into [1, 5). Let's check:
- add(2, 3): right = bisect_right(intervals, 3, key=lo)
  - intervals = [(1,2), (3,5)]
  - bisect_right with value 3: first index where lo > 3 → index 2 (both 1 and 3 are <= 3)
  - right = 2
- left = 2, check intervals[1] = (3, 5): 5 >= 2? Yes. left = 1.
  - check intervals[0] = (1, 2): 2 >= 2? Yes. left = 0.
- new_lo = min(2, 1) = 1, new_hi = max(3, 5) = 5
- intervals[0:2] = [(1, 5)] ✓

Great, so the invariant is maintained: intervals are always disjoint and non-touching (i.e., for consecutive intervals [a,b) and [c,d), we have b < c, not b <= c).

Wait, actually the problem says "touching intervals merged ([1,3) + [3,5) gives [(1, 5)]". So we should maintain the invariant that consecutive intervals don't touch. Our add function handles this by using `>=` and `<=` in the merge condition.

But what about `intervals()`? The problem says it should return intervals that are "sorted, disjoint, and with touching intervals merged". If our internal representation already maintains this, then `intervals()` just returns a copy.

Let me also think about `contains(x)`:
- We need to check if x is in any interval [a, b) where a <= x < b
- Find the last interval with a <= x (using bisect_right on lo values, minus 1)
- Check if x < b

```python
def contains(self, x):
    idx = bisect_right(self._intervals, x, key=lambda t: t[0]) - 1
    if idx >= 0:
        a, b = self._intervals[idx]
        return a <= x < b
    return False
```

This is O(log n). ✓

Now, performance concerns. The `key=lambda t: t[0]` in bisect is called O(log n) times per bisect call. For 200,000 contains() calls, that's 200,000 * log2(60,000) ≈ 200,000 * 16 = 3.2 million lambda calls. Each lambda call is very fast (just accessing a tuple element), so this should be well under 5 seconds.

For the 60,000 add() calls:
- Each bisect is O(log n)
- The while loop for finding `left` is O(k) where k is the number of overlapping intervals (small for disjoint intervals)
- The list slice assignment is O(n) for the memmove

Total should be well under 5 seconds.

Actually wait, I realize there might be an issue with the `bisect_right` key parameter. Let me check: in Python 3.10+, `bisect.bisect_right(a, x, lo=0, hi=None, *, key=None)` is available. The key function is applied to each element of `a` for comparison with `x`.

So `bisect_right(self._intervals, hi, key=lambda t: t[0])` will compare `key(element)` with `hi`, i.e., `element[0]` with `hi`. This is correct.

Let me also think about whether I need to handle the case where `lo` and `hi` are different types (int vs float). The problem says "Bounds may be ints or floats. Keep the original values (no rounding)." Python handles int-float comparison fine, so this should work.

Let me also consider: what if we add the same interval twice? E.g., add(1, 3) then add(1, 3) again.
- Second add: right = bisect_right(intervals, 3, key=lo) → 1 (since 1 <= 3)
- left = 1, check intervals[0] = (1, 3): 3 >= 1? Yes. left = 0.
- new_lo = min(1, 1) = 1, new_hi = max(3, 3) = 3
- intervals[0:1] = [(1, 3)] → no change. ✓

What about add(2, 4) when we have [(1, 3)]:
- right = bisect_right(intervals, 4, key=lo) → 1
- left = 1, check intervals[0] = (1, 3): 3 >= 2? Yes. left = 0.
- new_lo = min(2, 1) = 1, new_hi = max(4, 3) = 4
- intervals[0:1] = [(1, 4)] ✓

I think the implementation is correct. Let me write the final version.

One more thought: the `intervals()` method should return a list of tuples. Since we store tuples internally, we just return a copy of the list.

Let me also make sure `total_length()` works correctly with mixed int/float. E.g., interval (1, 3.5) has length 2.5. `3.5 - 1 = 2.5` in Python. ✓

Final implementation:
