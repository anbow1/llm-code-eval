The user wants a Python class `IntervalSet` that stores disjoint half-open intervals [lo, hi). Let me think about the implementation carefully.

Key requirements:
1. `add(lo, hi)`: Add a half-open interval, merging overlapping/touching intervals.
2. `remove(lo, hi)`: Remove a half-open interval, potentially splitting an existing interval.
3. `contains(x)`: O(log n) - binary search to find if x is in any interval.
4. `total_length()`: Sum of all interval lengths.
5. `intervals()`: Return sorted, merged, disjoint intervals as list of tuples.
6. `__len__()`: Number of intervals.
7. Performance: 60,000 add() calls + 200,000 contains() calls in under 5 seconds.

For O(log n) `contains()`, I need to keep the intervals sorted and use binary search. The natural data structure is a sorted list of intervals maintained in sorted order.

Let me think about the approach:

**Data structure**: A sorted list of (lo, hi) tuples. I'll maintain them in sorted order.

**add(lo, hi)**:
- If lo >= hi, ignore.
- Find the position where (lo, hi) would be inserted using binary search.
- Merge with any overlapping or touching intervals.
- This is O(n) in worst case due to list operations, but with 60,000 intervals it should be fine.

Wait, for 60,000 add() calls, each add could be O(n) in the worst case (inserting into a list of 60,000). That's 60,000 * 60,000 = 3.6 billion operations in worst case. That might be too slow.

Hmm, but actually, if intervals are disjoint and we're adding small disjoint intervals, each add is O(n) for the list insertion (shifting elements). With 60,000 insertions into a sorted list, that's O(n²) total = 3.6 billion operations. In Python, that's likely too slow.

Wait, let me reconsider. 60,000 insertions into a list - each insertion requires shifting at most 60,000 elements. But list.insert in CPython is implemented in C and is quite fast. 60,000 * 60,000 = 3.6 billion pointer moves... that might be around 3-4 seconds in C. Might be tight.

Actually, for `bisect.insort`, the search is O(log n) but the insertion is O(n) due to shifting. For 60,000 inserts, total work is O(n²) = 3.6 billion. In CPython's C implementation of list operations, this might actually be feasible in under 5 seconds since each "shift" is just a pointer copy.

Let me think about alternatives:
- Use a `sortedcontainers.SortedList`? No, only standard library.
- Use a balanced BST? Not in standard library.
- Use a `bisect` module with a list - this is the standard approach.

Actually, let me reconsider the problem. With 60,000 small disjoint intervals added in random order, each `add` call needs to:
1. Find the insertion point: O(log n) with bisect
2. Check for merges with neighbors: O(1) amortized if truly disjoint (no merges needed)
3. Insert into list: O(n) for the shift

The O(n) insertion is the bottleneck. 60,000 * 60,000 / 2 = 1.8 billion pointer moves. In CPython, each pointer move is very fast (it's C code doing memmove essentially). I think this should be under 5 seconds.

Actually, `list.insert()` in CPython uses `memmove` for the shift, which is very cache-friendly. For a list of 60,000 pointers, shifting is about 60,000 * 8 bytes = 480KB, which fits in L2 cache. This should be very fast.

Let me go with the sorted list + bisect approach.

**contains(x)**: Use `bisect_right` to find the rightmost interval with lo <= x, then check if x < hi. This is O(log n).

**remove(lo, hi)**:
- Find intervals that overlap with [lo, hi).
- For each overlapping interval, either remove it entirely, or trim it.
- If an interval is [a, b) and we remove [lo, hi):
  - If a >= lo and b <= hi: remove entirely
  - If a < lo and b <= hi: trim to [a, lo)
  - If a >= lo and b > hi: trim to [hi, b)
  - If a < lo and b > hi: split into [a, lo) and [hi, b)

Let me code this up:

```python
from bisect import bisect_left, bisect_right, insort

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find intervals that overlap or touch [lo, hi)
        # Two intervals [a,b) and [lo,hi) overlap or touch if a < hi and b > lo
        # i.e., b > lo and a < hi
        new_lo, new_hi = lo, hi
        
        # Find the first interval with hi > lo (i.e., could overlap with [lo, hi))
        # An interval (a, b) could overlap if b > lo and a < hi
        # We want to find all such intervals and merge them
        
        # Use bisect to find where lo would be inserted
        # We need to find intervals where a < hi (start before our end)
        # and b > lo (end after our start)
        
        # Find the leftmost interval that could overlap:
        # An interval (a, b) overlaps [lo, hi) if a < hi and b > lo
        # The condition a < hi means: we look at all intervals with a < hi
        # The condition b > lo means: we start from intervals with b > lo
        # Since intervals are sorted by lo, we can find the first one with lo_start > lo
        # Actually, we need to check intervals where hi > lo too.
        
        # Let's find the insertion point for (lo, hi)
        # Then check left and right neighbors
        
        # Better approach: find all intervals that overlap or touch [lo, hi)
        # Two intervals [a,b) and [lo,hi) touch/overlap iff a <= hi and b >= lo (for closed)
        # For half-open [a,b) and [lo,hi): they overlap or touch iff a < hi and b > lo
        # Wait, "touching" for merging: [1,3) and [3,5) should merge to [1,5)
        # So touching means: a == hi_prev (the start of one equals the end of another)
        # For half-open intervals, [1,3) and [3,5) don't overlap but are adjacent.
        # To merge adjacent intervals: a <= hi_prev and b >= lo_next (non-strict for touching)
        # Actually for [a,b) and [lo,hi): they merge if a <= hi and b >= lo
        # [1,3) and [3,5): a=1,b=3, lo=3,hi=5: 1<=5 and 3>=3: yes, merge.
        
        # So merge condition: existing (a,b) merges with (lo,hi) if a <= hi and b >= lo
        
        # Find all intervals to merge
        # Start from the first interval with b >= lo (i.e., hi >= lo)
        # Since sorted by a, the first candidate could be found by looking for a < hi
        # and b > lo (strict) or b >= lo (for touching merge)
        
        # Let me use a different approach:
        # Insert (lo, hi) tentatively, then merge all overlapping/touching intervals
        
        # Actually, the standard approach:
        # 1. Find the position where (lo, hi) would be inserted
        # 2. Check if it can merge with intervals to the left and right
        
        pos = bisect_left(self._intervals, (lo, hi))
        
        # Check if we need to merge with intervals before pos
        # The interval at pos-1 has its lo < lo (or == lo)
        # It overlaps/touches if its hi >= lo
        start = pos
        end = pos
        
        # Check left: merge with intervals that have hi >= lo
        while start > 0 and self._intervals[start - 1][1] >= lo:
            start -= 1
        
        # Check right: merge with intervals that have lo <= hi
        while end < len(self._intervals) and self._intervals[end][0] <= hi:
            end += 1
        
        # Now merge all intervals from start to end-1 with [lo, hi]
        if start < len(self._intervals):
            new_lo = min(new_lo, self._intervals[start][0])
        if end > 0:
            new_hi = max(new_hi, self._intervals[end - 1][1])
        
        # Remove intervals from start to end-1, insert the merged one
        self._intervals[start:end] = [(new_lo, new_hi)]
```

Wait, I need to be more careful with the merge condition. For half-open intervals:
- [a, b) and [lo, hi) overlap if a < hi and b > lo (strict)
- [a, b) and [lo, hi) touch (adjacent) if b == lo or hi == a

For merging adjacent/touching: [a, b) and [lo, hi) should merge if a <= hi and b >= lo (non-strict).

Let me verify: [1,3) and [3,5): a=1, b=3, lo=3, hi=5. a <= hi: 1 <= 5 ✓. b >= lo: 3 >= 3 ✓. Merge. Correct.

[1,3) and [4,5): a=1, b=3, lo=4, hi=5. a <= hi: 1 <= 5 ✓. b >= lo: 3 >= 4 ✗. No merge. Correct.

[1,4) and [3,5): a=1, b=4, lo=3, hi=5. a <= hi: 1 <= 5 ✓. b >= lo: 4 >= 3 ✓. Merge. Correct.

OK so the merge condition is: a <= hi AND b >= lo.

For finding intervals to merge:
- Intervals with b >= lo: Since sorted by a (and disjoint, so b of interval i < a of interval i+1), I need to find intervals where b >= lo. Since intervals are disjoint and sorted, the interval just before the insertion point might have b >= lo. Let me search left from pos.
- Intervals with a <= hi: Since sorted by a, all intervals from pos to some end have a <= hi.

Let me redo:

```python
pos = bisect_left(self._intervals, (lo, hi))

# Intervals that could merge: those with a <= hi AND b >= lo
# Since sorted by a, intervals at indices 0..pos-1 have a < lo (or a == lo and b < hi)
# Wait, bisect_left finds the leftmost position where (lo, hi) could be inserted.
# All intervals at indices < pos have a < lo, or a == lo and b < hi.

# For intervals at index i < pos: a < lo (mostly). They merge if b >= lo.
# Since intervals are sorted and disjoint, only the immediate left neighbor could have b >= lo.
# Actually, because they're disjoint, if interval i has b >= lo, then interval i+1 has a >= b >= lo.
# But pos is where (lo, hi) would be inserted, so intervals at pos have a >= lo.
# Wait no. Let me think again.

# bisect_left(self._intervals, (lo, hi)) finds the first index where 
# intervals[idx] >= (lo, hi) in tuple comparison.
# So intervals at index < pos have (a, b) < (lo, hi), meaning a < lo or (a == lo and b < hi).
# Intervals at index >= pos have (a, b) >= (lo, hi), meaning a > lo or (a == lo and b >= hi).

# For merging:
# Left side (indices < pos): these have a < lo. They merge if b >= lo.
# Since intervals are disjoint and sorted, at most one interval to the left can have b >= lo.
# (If interval i has b >= lo, then interval i+1 has a >= b >= lo, but i+1 < pos means a < lo. Contradiction unless a == lo and b < hi... hmm, edge case.)

# Actually, because intervals are disjoint and sorted: a[i+1] >= b[i] for all i.
# If interval at index i (i < pos) has b[i] >= lo, then a[i+1] >= b[i] >= lo.
# But for i+1 < pos, we need (a[i+1], b[i+1]) < (lo, hi), so a[i+1] < lo.
# Contradiction (a[i+1] >= lo and a[i+1] < lo). So at most one interval to the left can merge.

# Right side (indices >= pos): these have a >= lo. They merge if a <= hi.
# Since sorted, we check from pos forward while a <= hi.

# But wait, what about an interval with a == lo? If (lo, hi) == (a, b) exactly, bisect_left would put pos at that index. So the exact match is at pos.
```

Hmm, this is getting complicated. Let me simplify by just using bisect to find a starting point, then linearly scan for mergeable intervals. Since we maintain disjoint intervals, the scan is bounded.

Actually, let me just use a simpler and correct approach:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    new_lo, new_hi = lo, hi
    intervals = self._intervals
    n = len(intervals)
    
    # Find all intervals that overlap or touch [new_lo, new_hi)
    # Condition: interval_a <= new_hi and interval_b >= new_lo
    
    # Find the first interval that could overlap: interval_b >= new_lo
    # Since sorted by interval_a, and disjoint (interval_a[i+1] >= interval_b[i]),
    # we need to find the first i where interval_b[i] >= new_lo.
    # This is the first i where interval_a[i] could be < new_hi.
    # Actually let's just find where new_lo would be inserted and scan from there.
    
    # Simpler: find pos where (lo, -inf) would be inserted
    pos = bisect_left(intervals, (lo,))
    
    # Check one position to the left
    if pos > 0 and intervals[pos-1][1] >= new_lo:
        new_lo = min(new_lo, intervals[pos-1][0])
        pos -= 1
    
    # Now scan forward from pos, merging all intervals with a <= new_hi
    end = pos
    while end < n and intervals[end][0] <= new_hi:
        new_hi = max(new_hi, intervals[end][1])
        end += 1
    
    # Replace intervals[pos:end] with merged interval
    intervals[pos:end] = [(new_lo, new_hi)]
```

Wait, `bisect_left(intervals, (lo,))` - comparing tuples (lo,) with (a, b). In Python, (lo,) vs (a, b): if lo < a, then (lo,) < (a, b). If lo == a, then (lo,) < (a, b) because (lo,) is shorter. So this finds the first index where a >= lo, or a == lo (since (lo,) < (lo, b) for any b). Actually (lo,) vs (lo, b): comparing first elements: lo == lo. Then (lo,) has no second element, so it's less. So bisect_left(intervals, (lo,)) finds the first index where a >= lo. Good.

Then I check pos-1 for merging (the interval just before could have b >= lo).

Then scan forward from pos while a <= new_hi.

This should work correctly.

For **remove(lo, hi)**:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    n = len(intervals)
    
    # Find intervals that overlap with [lo, hi)
    # Overlap condition: a < hi and b > lo
    
    # Find starting position
    pos = bisect_left(intervals, (lo,))
    if pos > 0 and intervals[pos-1][1] > lo:
        pos -= 1
    
    # Process from pos forward
    # For each interval (a, b) that overlaps [lo, hi):
    # - If a >= lo and b <= hi: remove entirely
    # - If a < lo and b <= hi: trim to [a, lo)
    # - If a >= lo and b > hi: trim to [hi, b)
    # - If a < lo and b > hi: split into [a, lo) and [hi, b)
    
    new_intervals = []
    i = pos
    while i < n:
        a, b = intervals[i]
        if a >= hi:
            break
        if b <= lo:
            i += 1
            continue
        # Interval (a,b) overlaps [lo, hi)
        if a < lo and b > hi:
            new_intervals.append((a, lo))
            new_intervals.append((hi, b))
        elif a < lo:
            new_intervals.append((a, lo))
        elif b > hi:
            new_intervals.append((hi, b))
        # else: fully contained, remove it
        i += 1
    
    # Replace intervals[pos:i] with new_intervals
    intervals[pos:i] = new_intervals
```

Hmm wait, I need to be more careful. Let me re-think.

After finding `pos`, I scan forward. For each interval (a, b):
- If a >= hi: no more overlaps, break.
- If b <= lo: no overlap (we're past it), but wait, since intervals are sorted and I started at a position where intervals might overlap, b > lo should hold for the first one... Actually no, I might have gone too far left. Let me handle this:
  - If b <= lo: skip (no overlap).
  - If a < lo and b <= hi: trim to [a, lo). But we need lo < hi (given) and a < lo. The resulting interval [a, lo) is valid if a < lo. Since a < lo is given, and lo > a, this is valid.
  - If a >= lo and b <= hi: remove entirely.
  - If a >= lo and b > hi: trim to [hi, b). Valid if hi < b. Since b > hi, valid.
  - If a < lo and b > hi: split into [a, lo) and [hi, b). Both valid.

Let me also handle the edge case where after trimming, the resulting interval might be empty (a >= lo case for left trim: [a, lo) is valid since a < lo; [hi, b) is valid since hi < b).

Actually wait, in the case a < lo, the left piece is [a, lo). Since a < lo, this is a valid non-empty interval. In the case b > hi, the right piece is [hi, b). Since hi < b, valid.

But what about the case where lo == a and hi == b? Then a >= lo (yes) and b <= hi (yes), so remove entirely. Correct.

What about a < lo and b == lo? Then b <= lo, so skip. Correct (no overlap with [lo, hi) since b == lo means the interval ends at lo, which is the start of removal).

Wait, [a, b) and [lo, hi) where b == lo: they don't overlap. The overlap condition is a < hi AND b > lo. If b == lo, then b > lo is false, so no overlap. Correct.

OK, I think my logic is right. Let me also make sure the `pos` finding is correct.

For `remove`, the overlap condition is `a < hi AND b > lo` (strict, because half-open intervals don't overlap at a single point).

Finding start: I need the first interval with b > lo. Since sorted by a, and disjoint (b[i] <= a[i+1]), the first interval with b > lo could be found by bisect. But it's easier to find pos = bisect_left(intervals, (lo,)) and check pos-1.

Actually, let me reconsider. `bisect_left(intervals, (lo,))` finds first index where a >= lo. The interval at pos-1 has a < lo. If its b > lo, it overlaps. So check pos-1.

For intervals at pos onwards: a >= lo. They overlap if a < hi (since b > a >= lo > lo... wait, b > a >= lo, so b > lo is automatically true). So for pos onwards, overlap iff a < hi.

Let me refine:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    n = len(intervals)
    
    # Find start position
    pos = bisect_left(intervals, (lo,))
    # Check if interval at pos-1 overlaps
    if pos > 0 and intervals[pos-1][1] > lo:
        pos -= 1
    # else, no interval before pos overlaps
    
    # Process
    i = pos
    while i < n and intervals[i][0] < hi:
        a, b = intervals[i]
        if b <= lo:
            # Shouldn't happen if pos is correct, but just in case
            i += 1
            continue
        if a >= lo and b <= hi:
            # fully inside, remove
            pass
        elif a < lo and b <= hi:
            # trim left
            intervals[i] = (a, lo)
            i += 1
        elif a >= lo and b > hi:
            # trim right
            intervals[i] = (hi, b)
            i += 1
        else:  # a < lo and b > hi
            # split
            intervals[i] = (a, lo)
            intervals.insert(i+1, (hi, b))
            i += 2
    
    # Remove intervals that were "removed" (fully inside)
    # Actually, I need a different approach for removal...
```

Hmm, this is getting complicated with in-place modifications. Let me use the approach of building a new list for the affected range:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    n = len(intervals)
    
    pos = bisect_left(intervals, (lo,))
    if pos > 0 and intervals[pos-1][1] > lo:
        pos -= 1
    
    i = pos
    while i < n and intervals[i][0] < hi:
        i += 1
    # intervals[pos:i] are those that could overlap
    
    # Rebuild those intervals
    new_parts = []
    for j in range(pos, i):
        a, b = intervals[j]
        if b <= lo:
            new_parts.append((a, b))  # no overlap, keep as-is
        elif a >= hi:
            new_parts.append((a, b))  # no overlap, keep as-is (shouldn't happen given loop condition)
        else:
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
            # else: removed entirely
    
    intervals[pos:i] = new_parts
```

Wait, the loop condition `intervals[i][0] < hi` ensures all intervals in [pos, i) have a < hi. And we checked that intervals before pos don't have b > lo. So for intervals in [pos, i):
- They have a >= lo (for pos onwards) or a < lo (for the single pos-1 case)
- They have a < hi (from loop condition)
- They might have b <= lo (no overlap) - this can happen if pos was decremented but the interval at old pos-1 doesn't actually overlap. Wait, I checked `intervals[pos-1][1] > lo` before decrementing, so the interval at the new pos DOES have b > lo. And intervals at pos onwards have a >= lo, so b > a >= lo, so b > lo. So b <= lo shouldn't happen for intervals in the range.

Actually wait, after the `if pos > 0 and intervals[pos-1][1] > lo: pos -= 1`, the interval at pos has b > lo. And for intervals at pos+1 onwards, a >= lo (since they're at index >= original pos), so b > a >= lo. So b > lo for all intervals in the range. Good, the `b <= lo` check is unnecessary but harmless.

Also, I don't need the `a >= hi` check since the loop stops at a >= hi.

Let me also reconsider: after `pos -= 1`, the interval at pos has a < lo (since original pos was first with a >= lo). So for the first interval in range, a < lo. For subsequent ones, a >= lo.

Let me simplify:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    
    pos = bisect_left(intervals, (lo,))
    if pos > 0 and intervals[pos-1][1] > lo:
        pos -= 1
    
    end = pos
    while end < len(intervals) and intervals[end][0] < hi:
        end += 1
    
    new_parts = []
    for j in range(pos, end):
        a, b = intervals[j]
        if a < lo:
            new_parts.append((a, lo))
        if b > hi:
            new_parts.append((hi, b))
    
    intervals[pos:end] = new_parts
```

This is clean. For each overlapping interval (a, b):
- The part before [lo, hi): (a, lo) if a < lo
- The part after [lo, hi): (hi, b) if b > hi
- The middle part is removed.

If a >= lo and b <= hi: nothing is added (removed entirely). Correct.
If a < lo and b <= hi: only (a, lo) is added. Correct.
If a >= lo and b > hi: only (hi, b) is added. Correct.
If a < lo and b > hi: both parts added (split). Correct.

Now for **contains(x)**:

```python
def contains(self, x):
    # Find the rightmost interval with lo <= x
    # i.e., find the largest lo such that lo <= x
    # Then check if x < hi for that interval
    
    idx = bisect_right(self._intervals, (x, float('inf'))) - 1
    # This finds the rightmost interval with (lo, hi) <= (x, inf)
    # which means lo <= x (since if lo > x, (lo, hi) > (x, inf) as lo > x)
    # Actually, (x, inf) vs (lo, hi): if lo > x, then (x, inf) < (lo, hi). So bisect_right gives the first index where (lo, hi) > (x, inf), i.e., where lo > x.
    # So idx is the last index with lo <= x.
    
    if idx < 0:
        return False
    lo, hi = self._intervals[idx]
    return lo <= x < hi
```

Wait, `bisect_right(self._intervals, (x, float('inf')))`:
- We're looking for the rightmost position where (lo, hi) <= (x, float('inf')).
- (lo, hi) <= (x, inf) iff lo < x, or (lo == x and hi <= inf, which is always true).
- So all intervals with lo <= x are included. bisect_right returns the index after the last such element.
- idx = bisect_right(...) - 1 gives the last interval with lo <= x.
- Then check x < hi.

Actually, let me use a cleaner approach:

```python
def contains(self, x):
    # Find rightmost interval with lo <= x
    idx = bisect_right(self._intervals, (x,)) - 1
    if idx < 0:
        return False
    lo, hi = self._intervals[idx]
    return x < hi
```

Wait, `bisect_right(self._intervals, (x,))`:
- Looking for position after all elements < (x,).
- (lo, hi) < (x,) iff lo < x, or (lo == x and hi < ... wait, (x,) has length 1.
- Tuple comparison: (lo, hi) vs (x,). First compare lo vs x. If lo < x, then (lo, hi) < (x,) regardless of second element. If lo > x, then (lo, hi) > (x,). If lo == x, then (lo, hi) vs (x,) - compare second element: hi vs nothing. A 2-tuple is greater than a 1-tuple of same prefix. So (lo, hi) > (x,) when lo == x.

So bisect_right(self._intervals, (x,)) gives the first index where (lo, hi) >= (x,).
- All intervals before that index have lo < x (strictly).
- The element AT that index (if exists) has lo >= x.

So `bisect_right(...) - 1` gives the last index with lo < x. But I want lo <= x!

Let me use `bisect_right(self._intervals, (x, float('inf'))) - 1`:
- (lo, hi) <= (x, inf) iff lo < x, or (lo == x and hi <= inf, always true).
- So all with lo <= x are "less than or equal to" the key.
- bisect_right returns first index where element > (x, inf), i.e., lo > x.
- So idx = bisect_right(...) - 1 is last with lo <= x. ✓

Or use `bisect_left(self._intervals, (x, float('-inf')))`:
- Looking for first index where (lo, hi) >= (x, -inf).
- (lo, hi) >= (x, -inf) iff lo > x, or (lo == x and hi >= -inf, always true).
- So this finds first index with lo >= x.
- idx - 1 gives last with lo < x. Not quite what I want.

Let me stick with:
```python
idx = bisect_right(self._intervals, (x, float('inf'))) - 1
```

This gives the last interval with lo <= x. Then check x < hi.

Actually, there's a subtlety with float('inf'). What if lo can be float('inf')? Probably not in practice, but let's be safe. I'll use `float('inf')` since it's in the spec (real numbers).

Hmm, actually for the comparison to work correctly, I should use a large sentinel. `float('inf')` works for tuple comparison since any finite number < float('inf'). Let me verify: (5, 10) vs (5, float('inf')): 5 == 5, then 10 < float('inf'), so (5, 10) < (5, float('inf')). Good. And (5, 10) vs (4, float('inf')): 5 > 4, so (5, 10) > (4, float('inf')). Good.

So `bisect_right(self._intervals, (x, float('inf')))` correctly finds the first interval with lo > x.

Let me now write the full solution:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        new_lo, new_hi = lo, hi
        
        # Find where (lo, ...) would be inserted
        pos = bisect_left(intervals, (lo,))
        
        # Check left neighbor for merging
        if pos > 0 and intervals[pos - 1][1] >= new_lo:
            new_lo = intervals[pos - 1][0]
            pos -= 1
        
        # Merge with all intervals whose lo <= new_hi
        end = pos
        while end < len(intervals) and intervals[end][0] <= new_hi:
            new_hi = max(new_hi, intervals[end][1])
            end += 1
        
        intervals[pos:end] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        
        pos = bisect_left(intervals, (lo,))
        if pos > 0 and intervals[pos - 1][1] > lo:
            pos -= 1
        
        end = pos
        while end < len(intervals) and intervals[end][0] < hi:
            end += 1
        
        new_parts = []
        for j in range(pos, end):
            a, b = intervals[j]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        
        intervals[pos:end] = new_parts
    
    def contains(self, x):
        intervals = self._intervals
        idx = bisect_right(intervals, (x, float('inf'))) - 1
        if idx < 0:
            return False
        return x < intervals[idx][1]
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Let me trace through the performance requirement: 60,000 add() calls of small disjoint intervals in random order, then 200,000 contains() calls.

For add(): Each add involves:
- bisect_left: O(log n)
- Check left: O(1)
- Merge loop: For disjoint intervals, the loop typically runs 0-1 times (only merges if touching). For truly disjoint intervals added in random order, the while loop condition `intervals[end][0] <= new_hi` will fail immediately after pos (since the next interval starts after our end). So O(1) merging.
- The list slice assignment `intervals[pos:end] = [(new_lo, new_hi)]`: This involves shifting elements. In worst case O(n) for the shift. With 60,000 inserts into a list, total is O(n²) = 3.6 billion pointer operations. But CPython's list operations are in C and very fast (memmove). For 60,000 elements of 8-byte pointers, a full shift is ~480KB which fits in L2 cache. This should be very fast.

Actually wait, `intervals[pos:end] = [(new_lo, new_hi)]` when pos == end is just an insert. When pos < end, it's a delete + insert. For adding disjoint intervals that don't touch, pos == end (no merge), and it's `intervals[pos:pos] = [(new_lo, new_hi)]` which is an insert. CPython's `list.insert` uses memmove internally, which is very fast.

For contains(): bisect_right is O(log n) = O(log 60000) ≈ 16 comparisons. 200,000 * 16 = 3.2 million comparisons. Trivially fast.

I think this should be well under 5 seconds.

Let me double-check correctness of the add merge logic:

Say we have intervals [(1, 3), (5, 7), (9, 11)] and we add (3, 5):
- pos = bisect_left([(1,3),(5,7),(9,11)], (3,)) → looking for first (a,b) >= (3,). (1,3) < (3,) since 1 < 3. (5,7) > (3,) since 5 > 3. So pos = 1.
- Check left: intervals[0] = (1, 3), intervals[0][1] = 3 >= new_lo = 3. Yes! So new_lo = 1, pos = 0.
- Merge loop: end = 0. intervals[0] = (1,3), 1 <= 5? Yes. new_hi = max(5, 3) = 5. end = 1. intervals[1] = (5,7), 5 <= 5? Yes! new_hi = max(5, 7) = 7. end = 2. intervals[2] = (9,11), 9 <= 7? No. Stop.
- intervals[0:2] = [(1, 7)]. Result: [(1,7), (9,11)]. ✓

Say we add (4, 6):
- pos = bisect_left([(1,3),(5,7),(9,11)], (4,)) → (1,3) < (4,), (5,7) > (4,). pos = 1.
- Check left: intervals[0] = (1,3), 3 >= 4? No. Don't merge left.
- Merge loop: end = 1. intervals[1] = (5,7), 5 <= 6? Yes. new_hi = max(6,7) = 7. end = 2. intervals[2] = (9,11), 9 <= 7? No. Stop.
- intervals[1:2] = [(4, 7)]. Result: [(1,3), (4,7), (9,11)]. ✓

Say we add (3, 5) to [(1,3), (5,7)]:
- pos = bisect_left([(1,3),(5,7)], (3,)) → (1,3) < (3,) since 1 < 3. (5,7) > (3,). pos = 1.
- Check left: intervals[0] = (1,3), 3 >= 3? Yes! new_lo = 1, pos = 0.
- Merge: end = 0. (1,3): 1 <= 5. new_hi = max(5,3) = 5. end = 1. (5,7): 5 <= 5. new_hi = max(5,7) = 7. end = 2. Stop.
- intervals[0:2] = [(1, 7)]. ✓

Now let me check remove:

Remove (2, 6) from [(1, 3), (5, 7), (9, 11)]:
- pos = bisect_left([...], (2,)) → (1,3) < (2,) since 1 < 2. (5,7) > (2,). pos = 1.
- Check left: intervals[0] = (1,3), 3 > 2? Yes! pos = 0.
- end: intervals[0] = (1,3), 1 < 6? Yes. end = 1. (5,7): 5 < 6? Yes. end = 2. (9,11): 9 < 6? No. Stop. end = 2.
- Process: j=0: (1,3). a=1 < lo=2: add (1,2). b=3 > hi=6? No. j=1: (5,7). a=5 < lo=2? No. b=7 > hi=6? Yes: add (6,7).
- new_parts = [(1,2), (6,7)]
- intervals[0:2] = [(1,2), (6,7)]. Result: [(1,2), (6,7), (9,11)]. ✓

Remove (2, 5) from [(1, 7)]:
- pos = bisect_left([(1,7)], (2,)) → (1,7) < (2,). pos = 1.
- Check left: intervals[0] = (1,7), 7 > 2? Yes. pos = 0.
- end: intervals[0] = (1,7), 1 < 5? Yes. end = 1. Stop.
- Process: (1,7). a=1 < lo=2: add (1,2). b=7 > hi=5: add (5,7).
- new_parts = [(1,2), (5,7)]
- intervals[0:1] = [(1,2), (5,7)]. Result: [(1,2), (5,7)]. ✓

Looks correct!

One edge case: what about remove where the interval exactly matches an existing one?
Remove (1, 7) from [(1, 7)]:
- pos = bisect_left([(1,7)], (1,)) → (1,7) >= (1,) since first element equal and tuple is longer. So (1,7) > (1,). pos = 0.
- Check left: pos = 0, no left.
- end: intervals[0] = (1,7), 1 < 7? Yes. end = 1.
- Process: (1,7). a=1 < lo=1? No. b=7 > hi=7? No.
- new_parts = []
- intervals[0:1] = []. Result: []. ✓

What about contains on boundary?
contains(3) in [(1, 3)]:
- idx = bisect_right([(1,3)], (3, inf)) - 1.
- (1,3) vs (3, inf): 1 < 3, so (1,3) < (3, inf). bisect_right returns 1. idx = 0.
- x=3 < intervals[0][1] = 3? No. Return False. ✓ (Half-open: 3 not in [1,3))

contains(1) in [(1, 3)]:
- idx = bisect_right([(1,3)], (1, inf)) - 1.
- (1,3) vs (1, inf): 1 == 1, then 3 < inf. So (1,3) < (1, inf). bisect_right returns 1. idx = 0.
- x=1 < 3? Yes. Return True. ✓

contains(0.5) in [(1, 3)]:
- idx = bisect_right([(1,3)], (0.5, inf)) - 1.
- (1,3) vs (0.5, inf): 1 > 0.5, so (1,3) > (0.5, inf). bisect_right returns 0. idx = -1.
- Return False. ✓

Looks good. Let me also think about the `intervals()` method. The spec says it should return intervals as tuples, sorted, disjoint, and with touching intervals merged. Since our internal representation already maintains this invariant, we just return a copy.

For `total_length()`, just sum up hi - lo for all intervals. This returns a number (int or float). Since the spec says "Bounds may be ints or floats. Keep the original values (no rounding).", we just do arithmetic.

Let me also handle the edge case in `add` where `pos` after the left-check could cause issues. If intervals is empty, bisect_left returns 0, no left check, merge loop doesn't execute (end = 0, while 0 < 0 fails), and we insert. Fine.

I think the solution is correct and efficient. Let me finalize it.

Actually, one more thought: the `intervals()` method returns `list(self._intervals)` which is a shallow copy of a list of tuples. The tuples are immutable, so this is fine.

Also, `total_length()` should return a number. If all intervals have int bounds, it returns an int. If any have float bounds, it returns a float. This is natural Python behavior.

Let me write the final clean version.
