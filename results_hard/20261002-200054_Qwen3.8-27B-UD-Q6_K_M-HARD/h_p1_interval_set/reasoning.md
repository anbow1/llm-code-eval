Let me think about this carefully.

I need to implement an `IntervalSet` class that:
1. Stores disjoint half-open intervals [lo, hi)
2. Merges touching/overlapping intervals
3. Supports add, remove, contains, total_length, intervals, __len__

Key constraints:
- `contains()` must be O(log n)
- 60,000 add() calls of small disjoint intervals in random order + 200,000 contains() calls must take well under 5 seconds

For O(log n) contains(), I need a sorted structure. Python's standard library doesn't have a balanced BST or a sorted list with O(log n) insertion. Let me think about options:

1. **Sorted list of intervals**: Maintain a list of (lo, hi) tuples sorted by lo. Use `bisect` to find intervals for `contains()`. For `add()`, I need to find the position and merge. The list would have at most n intervals (where n is the number of disjoint intervals). `contains()` would be O(log n) using bisect. `add()` would be O(n) in the worst case due to list insertion, but for 60,000 adds, that's 60,000 * 60,000 = 3.6 * 10^9 in the worst case... that's too slow.

Wait, let me reconsider. If we have 60,000 small disjoint intervals, the list will have up to 60,000 elements. Each add would require:
- bisect to find position: O(log n)
- Checking neighbors for merging: O(1)
- Inserting into list: O(n) due to shifting

So 60,000 adds * O(n) = O(n^2) = 60,000^2 = 3.6 * 10^9 operations. That's way too slow.

Hmm, but wait. The problem says "small disjoint intervals in random order". If they're all disjoint, each add is an insertion into a sorted list. With 60,000 inserts into a sorted list, that's O(n^2) = 3.6 * 10^9 list element moves. In Python, this would be too slow.

Alternative approaches:
1. **Use a sorted structure that supports O(log n) insertion**: Python stdlib doesn't have one directly.
2. **Batch approach**: Collect all adds, then sort once? But the API requires add() to work incrementally.
3. **Use a different data structure**: A Treap or Splay tree? That's complex but doable.

Wait, let me reconsider. 60,000 inserts into a Python list... each insert in the middle shifts about 30,000 elements on average. 60,000 * 30,000 = 1.8 * 10^9 element moves. In CPython, list insertion involves moving pointers (8 bytes each), so this might actually be done in C and could be fast enough. Let me think...

Actually, `list.insert()` in CPython is implemented in C and does a `memmove`. Moving 30,000 pointers (240,000 bytes) takes a few microseconds. 60,000 such operations would take about 60,000 * a few microseconds = a few hundred milliseconds. That should be well under 5 seconds.

Let me verify: 60,000 inserts, each moving ~30,000 elements on average. Total elements moved: ~1.8 * 10^9. At ~10 GB/s for memmove, that's about 0.18 seconds. Plus the overhead of the Python call and bisect. Should be well under 5 seconds.

Actually wait, I need to be more careful. The `bisect` module's `insort` does the bisect (O(log n)) and then the insert (O(n) for the shift). The shift is done in C (memmove), so it's fast. Let me estimate more carefully:

- 60,000 inserts
- Average list size: 30,000
- Average memmove: 30,000 * 8 bytes = 240,000 bytes
- memmove speed: ~10-20 GB/s on modern hardware
- Time per memmove: ~12-24 microseconds
- Total time for all memmoves: 60,000 * 20μs = 1.2 seconds

Plus overhead for bisect, Python function calls, tuple creation, etc. Maybe 2-3 seconds total. Should be under 5 seconds.

But wait, I also need to handle merging. If intervals are all disjoint, there's no merging, so each add is just an insert. Good.

For `contains(x)`: I need to find which interval (if any) contains x. I can use bisect on the list of (lo, hi) tuples. I need to find the interval where lo <= x < hi. 

Using bisect: I can bisect on the lo values to find the position. Specifically:
- Find the rightmost interval with lo <= x
- Check if x < hi of that interval

I can use `bisect_right` on a list of lo values, or I can use `bisect` on tuples.

Let me think about the implementation:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find where to insert
        # We need to find all intervals that overlap with [lo, hi)
        # and merge them together with [lo, hi)
        
        # First, find the position where lo would be inserted
        # We want to find intervals that might overlap
        # An interval [a, b) overlaps with [lo, hi) if a < hi and lo < b
        
        # Use bisect to find the starting position
        # We need to find the first interval with hi > lo (i.e., the first interval that could overlap)
        # Actually, let's think differently.
        
        # Find the insertion point based on lo
        # We want to find intervals where lo < hi_interval (the interval starts before hi)
        # and lo_interval < hi (the interval ends after lo)
        
        # Strategy: find the position p such that intervals[p] is the first with lo >= lo
        # Then check intervals[p-1] (which has lo < lo) and intervals[p], intervals[p+1], ...
        # until we find one with lo >= hi
        
        # Actually, since intervals are sorted by lo and disjoint (non-touching),
        # I can find the position with bisect
        
        # Let me use a different approach:
        # Find the rightmost interval with lo < lo (or lo <= lo)
        # Then expand from there while intervals overlap or touch
        
        # bisect_right on lo values gives us the position after all intervals with lo <= lo
        # We want to start checking from position-1 (the interval just before insertion point)
        
        pos = bisect.bisect_right(self._intervals, (lo, float('inf')))
        # pos is the index where (lo, inf) would be inserted
        # So intervals[pos-1] has lo <= lo (if pos > 0)
        # intervals[pos] has lo > lo (if pos < len)
        
        # Actually, let me think about this more carefully with tuples.
        # bisect_right on (lo, inf) finds position after all (lo', hi') where (lo', hi') <= (lo, inf)
        # Since lo' < lo means (lo', hi') < (lo, anything), and lo' == lo means (lo, hi') <= (lo, inf)
        # So pos = number of intervals with lo' <= lo
        
        # The intervals that could overlap with [lo, hi):
        # - intervals[pos-1] if pos > 0 (has lo <= lo, might have hi > lo)
        # - intervals[pos], intervals[pos+1], ... (have lo > lo, but might have lo < hi)
        
        # Since intervals are disjoint and non-touching (merged), once we find an interval
        # with lo >= hi, we can stop.
        
        # Let's find the range of intervals to merge:
        start = pos
        end = pos
        new_lo = lo
        new_hi = hi
        
        # Check if the interval just before pos overlaps
        if start > 0:
            prev_lo, prev_hi = self._intervals[start - 1]
            if prev_hi >= lo:  # overlaps or touches
                new_lo = prev_lo
                start -= 1
        
        # Check intervals from pos onwards
        while end < len(self._intervals) and self._intervals[end][0] <= hi:
            new_hi = max(new_hi, self._intervals[end][1])
            end += 1
        
        # Now replace intervals[start:end] with (new_lo, new_hi)
        self._intervals[start:end] = [(new_lo, new_hi)]
```

Wait, I need to be more careful. The intervals are stored as disjoint AND non-touching (merged). So if I have [1,3) and [3,5), they should be stored as [1,5).

So the condition for overlap/touching: interval [a, b) and [c, d) overlap or touch if a < d and c < b, OR they touch if b == c or d == a.

Actually for half-open intervals [a, b) and [c, d):
- They overlap if a < d and c < b (and neither is empty)
- They touch if b == c or d == a
- We want to merge if they overlap OR touch: a < d and c <= b (for [c,d) to be merged with [a,b))

Wait, let me reconsider. [a, b) and [c, d) should be merged if they overlap or are adjacent:
- [a, b) and [c, d) with a < c: they should be merged if c <= b (touching or overlapping)
- So the condition is: the next interval's lo <= current interval's hi

In my sorted list, intervals[i] = (lo_i, hi_i) with lo_i < lo_{i+1} and hi_i <= lo_{i+1} (actually hi_i < lo_{i+1} since we merge touching intervals, so hi_i < lo_{i+1}... wait no.

If we merge touching intervals: [1,3) + [3,5) = [1,5). So in our stored representation, hi_i < lo_{i+1} strictly (since if hi_i == lo_{i+1}, they would have been merged).

So the condition for [lo, hi) to overlap or touch interval (a, b) is:
- lo < b AND a < hi (overlap)
- OR lo == b (touching from the left... wait no, [lo,hi) touches [a,b) from the left if lo == a... no)

Let me think again. [lo, hi) and [a, b):
- They overlap if lo < b and a < hi
- They touch if hi == a (meaning [lo,hi) ends where [a,b) starts) or lo == b (meaning [lo,hi) starts where [a,b) ends)
- We want to merge if they overlap or touch: lo < b and a <= hi... 

Hmm, let me just use: they should be merged if lo < b and a < hi. Wait, that's just the overlap condition. For touching: [1,3) and [3,5) should be merged. Here lo=1, hi=3, a=3, b=5. lo < b (1 < 5) ✓ and a < hi (3 < 3) ✗. So the overlap condition doesn't catch touching.

The condition for merging should be: lo < b and a <= hi (for [a,b) to be merged with [lo,hi) where a >= lo in sorted order).

Actually, since our intervals are sorted and disjoint (with strict gap), the condition is simpler:
- For a new interval [lo, hi), it overlaps/touches an existing interval [a, b) if and only if a < hi and lo < b. But since we're storing merged intervals, a < hi AND lo < b means they overlap. For touching: a == hi is NOT touching (a is the start of the existing, hi is the end of new). Wait...

[lo, hi) and [a, b) where a >= lo (existing interval starts at or after new interval starts):
- Overlap: a < hi and lo < b (but since a >= lo, just a < hi)
- Touching: a == hi? No, that means the new interval ends exactly where the existing starts. [1,3) and [3,5): lo=1,hi=3,a=3,b=5. a == hi. Yes, they touch.
- So merge condition: a <= hi (and since they're sorted, a >= lo is implied if a is after lo in sorted order)

Wait, but what about the case where the existing interval starts before the new one? [a, b) where a < lo:
- Overlap: lo < b
- Touching: lo == b
- Merge condition: b >= lo (i.e., b >= lo means the existing interval reaches at least to lo)

So in general, two intervals [a, b) and [lo, hi) should be merged if a < hi and lo < b, OR if b == lo, OR if a == hi. But since we're dealing with sorted, non-touching intervals:

For the interval just before the insertion point (call it [a, b) with a < lo or a == lo):
- It should be merged if b >= lo (the existing interval's end is at or past the new interval's start)

For intervals at and after the insertion point (call them [c_i, d_i) with c_i >= lo):
- They should be merged if c_i <= hi (the existing interval's start is at or before the new interval's end)

Let me refine my approach:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find position: first interval with lo >= current lo
    # Using bisect on the list of tuples
    # (lo, -inf) would be before any (lo, x)
    # We want to find where lo fits
    
    # Let's use a helper: find the index where we'd insert
    # intervals are sorted by lo
    # bisect_right with (lo, inf) gives index after all intervals with lo_val <= lo
    # bisect_left with (lo, -inf) gives index before all intervals with lo_val >= lo
    
    # I'll use: pos = bisect.bisect_left(self._intervals, (lo,))
    # This gives the first index where intervals[i][0] >= lo
    
    pos = bisect.bisect_left(self._intervals, (lo,))
    
    new_lo = lo
    new_hi = hi
    
    # Check previous interval
    start = pos
    if start > 0:
        prev_lo, prev_hi = self._intervals[start - 1]
        if prev_hi >= lo:  # overlaps or touches
            new_lo = prev_lo
            start -= 1
    
    # Check subsequent intervals
    end = pos
    while end < len(self._intervals) and self._intervals[end][0] <= hi:
        _, next_hi = self._intervals[end]
        if next_hi > new_hi:
            new_hi = next_hi
        end += 1
    
    self._intervals[start:end] = [(new_lo, new_hi)]
```

Wait, I have a bug. In the while loop, I'm checking `self._intervals[end][0] <= hi` but I should also update new_hi before the next check. Let me fix:

```python
    end = pos
    while end < len(self._intervals) and self._intervals[end][0] <= new_hi:
        _, next_hi = self._intervals[end]
        if next_hi > new_hi:
            new_hi = next_hi
        end += 1
```

Using `new_hi` instead of `hi` in the condition, because new_hi might have grown.

Now for `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- For each, subtract [lo, hi) from it
- This might split an interval into two pieces

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    # Find all intervals that overlap with [lo, hi)
    # An interval [a, b) overlaps with [lo, hi) if a < hi and lo < b
    # In sorted order, find the first interval with b > lo (i.e., hi > lo)
    # And the last interval with a < hi
    
    # First, find position: first interval with lo_val >= lo... 
    # Actually I need first interval with hi > lo
    # Since intervals are disjoint and sorted, the first interval that could overlap
    # is the one where hi > lo
    
    # Let me find: first interval with a < hi (start before hi)
    # That's all intervals with index < bisect_left(intervals, (hi,))
    # And among those, the ones with b > lo
    
    pos = bisect.bisect_left(self._intervals, (lo,))
    
    # Check if pos-1 overlaps
    start = pos
    if start > 0 and self._intervals[start - 1][1] > lo:
        start -= 1
    
    # Find end: first interval with a >= hi
    end = bisect.bisect_left(self._intervals, (hi,))
    # But we might need to go further if... no, since intervals are sorted by lo,
    # once lo_i >= hi, no more overlaps possible.
    
    # Now process intervals[start:end]
    new_intervals = []
    for i in range(start, end):
        a, b = self._intervals[i]
        # Subtract [lo, hi) from [a, b)
        if a < lo:
            new_intervals.append((a, lo))
        if b > hi:
            new_intervals.append((hi, b))
    
    self._intervals[start:end] = new_intervals
```

Wait, I need to be more careful with the end. Let me reconsider.

Intervals that overlap with [lo, hi): [a, b) where a < hi and b > lo.

Since intervals are sorted by a (lo), I need:
- Start: first interval with b > lo. Since intervals are disjoint and sorted, I can find this by:
  - pos = bisect_left(intervals, (lo,)) gives first with a >= lo
  - If pos > 0 and intervals[pos-1][1] > lo, then start = pos-1, else start = pos
  - Actually, intervals[pos-1][0] < lo (since pos is first with a >= lo). If intervals[pos-1][1] > lo, it overlaps.
  
- End: first interval with a >= hi. That's bisect_left(intervals, (hi,)).
  But wait, what if an interval has a < hi but extends past hi? That's fine, it's included.
  What if an interval has a == hi? Then it doesn't overlap with [lo, hi) (since [a,b) with a==hi means the interval starts at hi, and [lo,hi) ends at hi, so they touch but don't overlap). So we should NOT include intervals with a >= hi.
  
  So end = bisect_left(intervals, (hi,)) is correct.

Let me also handle the edge case in remove: if the interval is fully contained in [lo, hi), both new_intervals entries are empty, which is correct (the interval is removed).

For `contains(x)`:
- Find the interval where lo <= x < hi
- Use bisect to find the rightmost interval with lo <= x
- Check if x < hi of that interval

```python
def contains(self, x):
    # Find the rightmost interval with lo <= x
    # bisect_right(intervals, (x, inf)) gives index after all (lo, hi) where lo <= x
    # Actually, bisect_right on (x, float('inf')) gives the position after all intervals with lo <= x
    # So the candidate is at index pos-1
    
    pos = bisect.bisect_right(self._intervals, (x, float('inf')))
    if pos > 0:
        lo, hi = self._intervals[pos - 1]
        if lo <= x < hi:
            return True
    return False
```

Wait, but `bisect_right` with `(x, float('inf'))` - this compares tuples. (lo, hi) <= (x, inf) means lo < x OR (lo == x AND hi <= inf). Since hi is always finite, (x, hi) < (x, inf), so this includes all intervals with lo <= x. Good.

Actually, I can simplify: `bisect_right(self._intervals, (x,))` - comparing (lo, hi) with (x,):
- (lo, hi) < (x,) if lo < x (shorter tuple comparison? No, in Python, (1, 2) < (1,) is False because at index 0 they're equal, then (1,2) has more elements, so (1,2) > (1,). Wait no.

Python tuple comparison: (1, 2) vs (1,): first elements equal (1==1), then (1,2) has an extra element, so (1,2) > (1,). So (1,2) < (1,) is False.

Hmm, that's not what I want. Let me use a different approach.

I can create a separate list of lo values, or I can use a custom key. Actually, in Python 3, bisect doesn't support keys until... let me check. No, bisect doesn't support a key parameter in the standard library (it was proposed but I don't think it's in 3.11).

Alternative: I can just use `bisect_right` on the list with a tuple that ensures correct comparison.

To find the rightmost interval with lo <= x:
- I want to find the position where I'd insert x among the lo values
- `bisect_right(self._intervals, (x, float('inf')))` should work because:
  - (lo_i, hi_i) < (x, inf) iff lo_i < x OR (lo_i == x AND hi_i < inf)
  - Since hi_i is always finite, (x, hi_i) < (x, inf) is True
  - So this gives the count of intervals with lo <= x
  
Yes, this works! Let me verify:
- Interval (1, 5), x = 1: (1, 5) < (1, inf)? Yes (5 < inf). So pos includes it. ✓
- Interval (2, 5), x = 1: (2, 5) < (1, inf)? No (2 > 1). So pos doesn't include it. ✓
- Interval (1, 5), x = 2: (1, 5) < (2, inf)? Yes (1 < 2). So pos includes it. ✓

Great. So `pos = bisect.bisect_right(self._intervals, (x, float('inf')))` gives the number of intervals with lo <= x. The candidate interval is at index `pos - 1` (if pos > 0).

For `total_length()`:
```python
def total_length(self):
    return sum(hi - lo for lo, hi in self._intervals)
```

For `intervals()`:
```python
def intervals(self):
    return list(self._intervals)
```
They're already sorted, disjoint, and merged.

For `__len__()`:
```python
def __len__(self):
    return len(self._intervals)
```

Now let me think about performance:
- 60,000 add() calls with small disjoint intervals in random order:
  - Each add: bisect (O(log n)) + list insert (O(n) due to memmove)
  - Total: O(n^2) for the list operations, but the constant is very small (C-level memmove)
  - n = 60,000, so 60,000 inserts, each moving ~30,000 elements on average
  - 60,000 * 30,000 * 8 bytes = 14.4 GB of data moved... wait that's too much.
  
  Actually, 60,000 * 30,000 = 1.8 * 10^9 elements, each 8 bytes (pointer) = 14.4 GB. At 20 GB/s, that's 0.72 seconds. Plus Python overhead for the function calls, bisect, tuple creation, etc. Maybe 1-2 seconds total. Should be under 5 seconds.

  But wait, I'm also doing `self._intervals[start:end] = [(new_lo, new_hi)]` which is a slice assignment. For a single element insertion, this is equivalent to list.insert(). The memmove is the same.

- 200,000 contains() calls:
  - Each: bisect_right (O(log n)) + one comparison
  - Total: 200,000 * log(60,000) ≈ 200,000 * 16 = 3.2 * 10^6 comparisons
  - Very fast, well under a second.

I think this approach will work within the time constraint. Let me also consider: what if the intervals are NOT all disjoint? The problem says "60,000 add() calls of small disjoint intervals in random order" - so they ARE disjoint. Good, that means no merging happens, and each add is a pure insertion.

Actually wait, I need to double-check my add implementation. If all intervals are disjoint, then:
- pos = bisect_left finds the correct position
- start = pos (no previous overlap)
- end = pos (no next overlap since intervals[end][0] > hi for all)
- We replace [start:end] (empty slice) with [(new_lo, new_hi)] - this is an insert

Good.

But wait, there's a subtlety. When I do `bisect_left(self._intervals, (lo,))`, the comparison of (lo_i, hi_i) with (lo,):
- If lo_i < lo: (lo_i, hi_i) < (lo,) because lo_i < lo (first element decides)
- If lo_i == lo: (lo_i, hi_i) vs (lo,): first elements equal, then (lo_i, hi_i) has more elements, so (lo_i, hi_i) > (lo,)
- So bisect_left with (lo,) gives the first position where lo_i > lo, i.e., after all intervals with lo_i <= lo... 

Wait no. bisect_left finds the first position where the element is >= the key. So it finds the first interval where (lo_i, hi_i) >= (lo,). 

- (lo_i, hi_i) >= (lo,) means: lo_i > lo OR (lo_i == lo AND hi_i >= ... well, (lo, hi) >= (lo,) is True because the first elements are equal and the left tuple is longer).

Actually in Python: (1, 2) >= (1,) → True (because at index 0, 1==1, then left has more elements).
(1, 2) < (1,) → False.

So bisect_left(intervals, (lo,)) gives the first index where lo_i > lo. That means intervals before this index have lo_i <= lo.

Hmm, but I want the first interval with lo_i >= lo. Let me use a different key.

If I use (lo, float('-inf')):
- (lo_i, hi_i) >= (lo, -inf) means: lo_i > lo OR (lo_i == lo AND hi_i >= -inf) which is always true.
- So bisect_left(intervals, (lo, -inf)) gives the first index where lo_i >= lo. ✓

Or I can just use (lo, float('-inf')) for bisect_left.

Actually wait, let me reconsider. I want:
- For add: find where [lo, hi) fits. I need the first interval with lo_i >= lo.
  - `bisect.bisect_left(self._intervals, (lo, float('-inf')))` gives this. ✓

- For contains: find the last interval with lo_i <= x.
  - `bisect.bisect_right(self._intervals, (x, float('inf')))` gives one past the last such interval. ✓

Let me also think about the `remove` more carefully:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    # Find first interval that could overlap: b > lo
    # In sorted order, find first interval with a >= lo, then check if previous overlaps
    pos = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    start = pos
    if start > 0 and self._intervals[start - 1][1] > lo:
        start -= 1
    
    # Find end: first interval with a >= hi (these don't overlap)
    end = bisect.bisect_left(self._intervals, (hi, float('-inf')))
    
    # But wait: what if there's an interval with a < hi but b <= lo? 
    # Since intervals are sorted and disjoint, and we started from the first that could overlap,
    # all intervals from start to end-1 have a < hi and b > lo (they overlap with [lo,hi))
    # Actually, do they all have b > lo? 
    # - intervals[start] has b > lo (by our check) or a >= lo (so b > a >= lo)
    # - For subsequent intervals, since they're disjoint and sorted, a_i > a_{i-1} and b_i > b_{i-1}
    #   Actually no, we only know a_i > a_{i-1}. But since they're disjoint: b_{i-1} < a_i.
    #   And a_i < hi (since end is first with a >= hi).
    #   Do we know b_i > lo? Well, b_i > a_i >= lo (since a_i >= a_start >= lo or a_start > lo).
    #   Hmm, actually a_start could be < lo (if start = pos - 1).
    #   But we checked that intervals[start][1] > lo, so b_start > lo.
    #   For i > start: b_i > a_i > a_{i-1} >= ... this gets complicated.
    #   Actually, since intervals are disjoint: b_{i-1} < a_i. And we know b_{i-1} > lo (for i-1 = start).
    #   Wait no, we only know b_start > lo. For i > start, a_i > b_{i-1} > lo... 
    #   Hmm, a_i > b_{i-1} (disjoint) and b_{i-1} > lo doesn't directly give b_i > lo.
    #   But b_i > a_i > b_{i-1} > lo. Yes! So all intervals in [start, end) have b > lo.
    #   And they all have a < hi (by definition of end).
    #   So they all overlap with [lo, hi). ✓
    
    # Now subtract [lo, hi) from each
    new_intervals = []
    for i in range(start, end):
        a, b = self._intervals[i]
        if a < lo:
            new_intervals.append((a, lo))
        if b > hi:
            new_intervals.append((hi, b))
    
    self._intervals[start:end] = new_intervals
```

This looks correct. Let me trace through an example:
- Intervals: [(1, 10)]
- remove(3, 7):
  - pos = bisect_left([(1,10)], (3, -inf)) = 1 (since (1,10) < (3,-inf))
  - start = 1, check intervals[0] = (1, 10), 10 > 3, so start = 0
  - end = bisect_left([(1,10)], (7, -inf)) = 1 (since (1,10) < (7,-inf))
  - Process intervals[0:1] = [(1, 10)]:
    - a=1 < lo=3: add (1, 3)
    - b=10 > hi=7: add (7, 10)
  - new_intervals = [(1, 3), (7, 10)]
  - intervals[0:1] = [(1, 3), (7, 10)]
  - Result: [(1, 3), (7, 10)] ✓

Another example:
- Intervals: [(1, 5), (8, 12)]
- remove(3, 10):
  - pos = bisect_left(intervals, (3, -inf)) = 1 (since (1,5) < (3,-inf), (8,12) > (3,-inf))
  - start = 1, check intervals[0] = (1, 5), 5 > 3, so start = 0
  - end = bisect_left(intervals, (10, -inf)) = 2 (since both (1,5) and (8,12) have lo < 10)
  - Process intervals[0:2]:
    - (1, 5): a=1 < 3 → add (1, 3); b=5 > 10? No.
    - (8, 12): a=8 < 3? No. b=12 > 10 → add (10, 12)
  - new_intervals = [(1, 3), (10, 12)]
  - Result: [(1, 3), (10, 12)] ✓

Another:
- Intervals: [(1, 5), (8, 12)]
- remove(0, 20):
  - pos = bisect_left(intervals, (0, -inf)) = 0
  - start = 0
  - end = bisect_left(intervals, (20, -inf)) = 2
  - Process intervals[0:2]:
    - (1, 5): a=1 < 0? No. b=5 > 20? No.
    - (8, 12): a=8 < 0? No. b=12 > 20? No.
  - new_intervals = []
  - Result: [] ✓

Great. Now let me also make sure `contains` handles the case where x is an int and intervals have float bounds, or vice versa. Since we're just doing comparisons, Python handles mixed int/float comparisons fine.

One more thing: the problem says "Keep the original values (no rounding)." Since we're just storing and comparing, we never do any rounding. The only arithmetic is `hi - lo` in `total_length()`, which is exact for ints and standard for floats.

Let me also think about whether I need to handle the case where lo and hi are the same type vs different types. No, Python handles mixed numeric types in comparisons fine.

Let me write the final implementation:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find first interval with lo_i >= lo
        pos = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        
        new_lo = lo
        new_hi = hi
        
        # Check previous interval for overlap/touch
        start = pos
        if start > 0 and self._intervals[start - 1][1] >= lo:
            new_lo = self._intervals[start - 1][0]
            start -= 1
        
        # Check subsequent intervals for overlap/touch
        end = pos
        while end < len(self._intervals) and self._intervals[end][0] <= new_hi:
            if self._intervals[end][1] > new_hi:
                new_hi = self._intervals[end][1]
            end += 1
        
        self._intervals[start:end] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        pos = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        
        start = pos
        if start > 0 and self._intervals[start - 1][1] > lo:
            start -= 1
        
        end = bisect.bisect_left(self._intervals, (hi, float('-inf')))
        
        new_intervals = []
        for i in range(start, end):
            a, b = self._intervals[i]
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))
        
        self._intervals[start:end] = new_intervals
    
    def contains(self, x) -> bool:
        pos = bisect.bisect_right(self._intervals, (x, float('inf')))
        if pos > 0:
            lo, hi = self._intervals[pos - 1]
            return lo <= x < hi
        return False
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self) -> list[tuple]:
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, I should double-check the `add` logic. The condition for merging with the previous interval:
- Previous interval is (prev_lo, prev_hi)
- New interval is [lo, hi)
- They should be merged if prev_hi >= lo (the previous interval's end is at or past the new interval's start)
  - prev_hi > lo: they overlap
  - prev_hi == lo: they touch (prev ends at lo, new starts at lo)
  - Both cases: merge ✓

The condition for merging with subsequent intervals:
- Next interval is (next_lo, next_hi)
- They should be merged if next_lo <= hi (the next interval's start is at or before the new interval's end)
  - next_lo < hi: they overlap
  - next_lo == hi: they touch
  - Both cases: merge ✓

And I'm using `new_hi` (which grows as we merge) in the while condition, which is correct because after merging, the new interval extends further.

I think this is correct. Let me also consider edge cases:
- add(1, 1): lo >= hi, ignored ✓
- add(3, 1): lo >= hi, ignored ✓
- contains on empty set: pos = 0, return False ✓
- total_length on empty set: sum of empty = 0 ✓

One potential issue: `float('-inf')` and `float('inf')` in the bisect calls. These are used as part of tuple comparisons. Since lo and hi are real numbers (int or float), comparing them with inf works fine.

Actually, I realize there might be an issue with using `float('-inf')` when the values are integers. `(3, float('-inf'))` vs `(3, 1)`: comparison of float('-inf') with int 1 works fine in Python. And `(3, float('-inf'))` vs `(3, 2)`: float('-inf') < 2, so (3, -inf) < (3, 2). Good.

But wait, what if someone passes a very large integer? Like 10**100? Then comparing with float('inf') is still fine because any finite number < inf.

I think the implementation is solid. Let me also add type hints for clarity and make sure the class is complete.

Actually, let me reconsider the performance concern. The problem says "60,000 add() calls of small disjoint intervals in random order". If they're truly disjoint, then:
- No merging happens (start == end == pos)
- Each add is: bisect_left (O(log n)) + slice assignment of 1 element into empty slice (equivalent to insert, O(n) memmove)

The slice assignment `self._intervals[start:end] = [(new_lo, new_hi)]` where start == end is equivalent to `self._intervals.insert(pos, (new_lo, new_hi))`. In CPython, this does a memmove of the tail of the list.

For 60,000 inserts into a growing list:
- Total memmove: sum of (n-i) for i in range(60000) where n is current length
- ≈ 60000 * 60000 / 2 = 1.8 * 10^9 pointer moves
- Each pointer is 8 bytes: 14.4 GB
- At ~20-30 GB/s: ~0.5-0.7 seconds
- Plus Python overhead (function calls, bisect, tuple creation): maybe another 0.5-1 second
- Total: ~1-2 seconds

For 200,000 contains() calls:
- Each: bisect_right (O(log n) ≈ 16 comparisons) + one comparison
- Total: ~3.2 * 10^6 tuple comparisons
- Very fast: < 0.1 seconds

Total: well under 5 seconds. ✓

I'm satisfied with this solution. Let me finalize it.
