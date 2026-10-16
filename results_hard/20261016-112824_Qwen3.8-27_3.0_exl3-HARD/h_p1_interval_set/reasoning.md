Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) with efficient operations.

Key requirements:
1. `add(lo, hi)` - add interval, ignore if lo >= hi
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of all interval lengths
5. `intervals()` - sorted, disjoint, merged touching intervals
6. `__len__()` - number of intervals
7. Performance: 60,000 adds of small disjoint intervals in random order + 200,000 contains() must be under 5 seconds.

The performance requirement is critical. Let me think about data structures:

Option 1: Sorted list of intervals. Add would be O(n) for insertion, contains would be O(log n) with bisect. But 60,000 adds each O(n) would be O(n²) = 60,000² = 3.6 billion operations. That's too slow.

Option 2: Use a balanced BST / sorted structure. Python doesn't have a built-in balanced BST. But we can use the `bisect` module with a list, but insertion is O(n).

Option 3: Use a sorted list but be smart about it. Actually, for 60,000 disjoint intervals added in random order, each add would need to find the right position (O(log n) with bisect) and insert (O(n) for list insertion). So total would be O(n²) for the list insertions. 60,000² / 2 ≈ 1.8 billion element shifts. That's too slow in Python.

Option 4: Use a different approach. Since we need O(log n) for contains, we need a sorted structure. But for adds, we need to merge overlapping/touching intervals.

Wait, let me reconsider. The performance requirement says "60,000 add() calls of small disjoint intervals in random order followed by 200,000 contains() calls must take well under 5 seconds."

The key insight: the intervals are DISJOINT. So when we add them, they don't overlap. But they're added in random order.

For a sorted list approach:
- Finding position: O(log n) with bisect
- Insertion: O(n) due to list shifting
- Total for 60,000 inserts: O(n²) ≈ 60,000² = 3.6 × 10⁹ operations

In Python, list insertion involves memmove which is in C, so it's fast. Each memmove of ~30,000 pointers (8 bytes each) is about 240KB of memory movement. 60,000 such operations... that's 60,000 × 240KB ≈ 14.4 GB of memory movement. At ~10 GB/s, that's about 1.4 seconds. Plus the Python overhead of the bisect and comparison. This might be borderline.

Actually, let me reconsider. The list insert in CPython is a memmove of pointers. For a list of 60,000 elements, each insert moves on average 30,000 pointers = 240,000 bytes. 60,000 inserts × 240,000 bytes = 14.4 GB. At memory bandwidth of ~20 GB/s, that's ~0.7 seconds. Plus Python overhead for the loop, bisect, etc. This should be well under 5 seconds.

But wait, there's also the merging logic. For each add, we need to check if the new interval overlaps or touches existing intervals. With disjoint intervals in random order, most adds won't overlap. But we still need to check neighbors.

Let me think about the algorithm for add:
1. If lo >= hi, return.
2. Find the insertion position using bisect on the sorted list of (lo, hi) pairs.
3. Check if the new interval overlaps or touches any existing intervals.
4. Merge as needed.

Actually, for the "small disjoint intervals" case, most adds will just be insertions without merging. The bisect to find position is O(log n), and the list insert is O(n) amortized due to memmove.

Let me think about whether a sorted list is sufficient:
- 60,000 adds: each involves bisect (O(log n)) + insert (O(n) memmove in C) + neighbor checks (O(1))
- 200,000 contains: each is O(log n) bisect

The total time should be dominated by the 60,000 list insertions. In CPython, list.insert is implemented as a memmove, which is very fast. I think this will be well under 5 seconds.

Let me go with a sorted list of (lo, hi) tuples.

For the data structure:
- `self._intervals`: list of (lo, hi) tuples, always sorted by lo, disjoint, non-touching (merged).

For `add(lo, hi)`:
1. If lo >= hi, return.
2. Use bisect to find where lo would be inserted.
3. Check the interval before and after the insertion point for overlap/touching.
4. Actually, we need to find all intervals that overlap or touch [lo, hi). Since intervals are sorted and disjoint, at most we need to merge with a contiguous chain of intervals.
5. Merge and insert.

Wait, for disjoint intervals, at most one interval on the left can overlap/touch, and at most one on the right can overlap/touch. Actually no - if we're adding a large interval that spans multiple existing intervals, we could merge with many. But the problem says "small disjoint intervals" for the performance test, so in practice it's at most a few.

Let me be more careful:
- Find the rightmost existing interval with hi <= lo (it's immediately before our new interval if it touches).
- Find the leftmost existing interval with lo >= hi (it's immediately after our new interval if it touches).
- Everything in between overlaps with [lo, hi) and gets merged.

Algorithm for add:
1. If lo >= hi, return.
2. Use bisect_right on the list of lo values to find position where hi would be. This gives us the first interval whose lo >= hi.
3. Use bisect_right on the list of lo values to find position where lo would be. Actually, let me think differently.

Let me use a list of (lo, hi) pairs sorted by lo.

To find overlapping intervals:
- `right_idx = bisect.bisect_right(self._los, hi)` - first interval with lo >= hi
- `left_idx = bisect.bisect_left(self._los, lo)` - first interval with lo >= lo

Wait, I need to also check the interval just before left_idx, because it might have hi > lo (i.e., it overlaps with our new interval).

Let me define:
- `self._intervals`: list of (lo, hi) tuples, sorted by lo, disjoint, non-touching.

For add(lo, hi):
1. If lo >= hi, return.
2. Find `right_idx = bisect.bisect_right(self._intervals, (hi, float('inf')))` - first interval with lo >= hi. Actually, bisect on tuples compares element-wise, so (hi, inf) would find the first tuple where the first element >= hi. Wait, bisect_right finds the position to insert to keep order, so it finds the first element > (hi, inf). Since hi is the first element, this gives us the first interval with lo > hi. But we want lo >= hi. Hmm.

Actually, let me just use bisect on the lo values separately, or use a helper.

Let me use:
- `self._intervals`: list of (lo, hi) tuples, sorted by lo.

For finding positions:
- `right_idx = bisect.bisect_left(self._intervals, (hi, -float('inf')))` - first interval with lo >= hi. Wait, bisect_left finds the leftmost position where the value can be inserted. For (hi, -inf), it finds the first interval where (lo, hi) >= (hi, -inf), which means lo > hi or (lo == hi and hi >= -inf). Since -inf is the smallest, it effectively finds the first interval with lo >= hi. Actually, (lo, hi_val) >= (hi, -inf) means lo > hi or (lo == hi and hi_val >= -inf). Since hi_val is always >= -inf, this simplifies to lo >= hi. Yes!

- `left_idx = bisect.bisect_left(self._intervals, (lo, -float('inf')))` - first interval with lo >= lo, i.e., first interval with lo >= lo.

Wait, I need to be more careful. Let me just extract the lo values into a separate list for bisect operations.

Actually, let me use a simpler approach. I'll maintain `self._intervals` as a list of (lo, hi) tuples sorted by lo. For bisect operations, I'll create a list of just the lo values, or I'll use the tuple comparison.

Let me use a helper approach:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi), sorted by lo, disjoint, non-touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find the range of intervals that overlap or touch [lo, hi)
        # right_idx: first interval with lo >= hi
        # left_idx: last interval with hi > lo (might be one before the first with lo >= lo)
        
        # Using bisect on the lo values
        # right_idx = bisect.bisect_left(self._intervals, (hi, float('-inf')))
        # This gives first interval where lo >= hi (since (lo, h) >= (hi, -inf) iff lo >= hi)
        
        right_idx = bisect.bisect_left(self._intervals, (hi, float('-inf')))
        
        # left_idx: we need to check the interval just before the first one with lo >= lo
        # Actually, we need to find all intervals that overlap [lo, hi)
        # An interval (a, b) overlaps [lo, hi) if a < hi and b > lo
        # Since intervals are sorted by lo and disjoint:
        # - Intervals with lo >= hi don't overlap (they start at or after hi)
        # - Intervals with hi <= lo don't overlap (they end at or before lo)
        # - So overlapping intervals are those with lo < hi and hi > lo
        
        # The overlapping intervals form a contiguous block in our sorted list.
        # right_idx is the first interval with lo >= hi.
        # For the left boundary, we need to go back until we find an interval with hi <= lo.
        
        # Start from right_idx - 1 and go backwards
        left_idx = right_idx - 1
        while left_idx >= 0 and self._intervals[left_idx][1] > lo:
            left_idx -= 1
        left_idx += 1  # first interval that overlaps or touches
        
        # Now merge all intervals from left_idx to right_idx-1 with [lo, hi)
        new_lo = lo
        new_hi = hi
        for i in range(left_idx, right_idx):
            a, b = self._intervals[i]
            new_lo = min(new_lo, a)
            new_hi = max(new_hi, b)
        
        self._intervals[left_idx:right_idx] = [(new_lo, new_hi)]
```

Wait, but for the performance case of 60,000 small disjoint intervals, the while loop would typically iterate 0 or 1 times (since the intervals are disjoint, the new interval won't overlap with many existing ones). So the amortized cost is fine.

But actually, for the worst case of the while loop, if we add a large interval that spans many small ones, it could be O(n). But for the stated performance test (small disjoint intervals), this is fine.

For `contains(x)`:
```python
def contains(self, x):
    # Find the interval where x might be
    # We need the last interval with lo <= x, then check if x < hi
    idx = bisect.bisect_right(self._intervals, (x, float('inf'))) - 1
    # Actually, bisect_right finds the position after the last element <= (x, inf)
    # (x, inf) - any interval (a, b) where a <= x and b <= inf, which is all intervals with a <= x
    # So idx is the last interval with lo <= x
    if idx >= 0:
        lo, hi = self._intervals[idx]
        return lo <= x < hi
    return False
```

Wait, let me verify: `bisect_right(self._intervals, (x, float('inf')))` finds the insertion point for (x, inf) in the sorted list. Since all intervals have lo as first element, this finds the position after the last interval with lo <= x. So `idx = that - 1` is the last interval with lo <= x. Then we check if x < hi. Yes, this is O(log n).

For `remove(lo, hi)`:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    # Find intervals that overlap [lo, hi)
    # Same logic as add
    right_idx = bisect.bisect_left(self._intervals, (hi, float('-inf')))
    left_idx = right_idx - 1
    while left_idx >= 0 and self._intervals[left_idx][1] > lo:
        left_idx -= 1
    left_idx += 1
    
    if left_idx >= right_idx:
        return  # no overlap
    
    # Now we need to remove [lo, hi) from the union of intervals [left_idx, right_idx)
    # The result might be 0, 1, or 2 intervals
    
    result = []
    for i in range(left_idx, right_idx):
        a, b = self._intervals[i]
        # Split (a, b) by removing [lo, hi)
        if a < lo:
            result.append((a, lo))
        if b > hi:
            result.append((hi, b))
    
    self._intervals[left_idx:right_idx] = result
```

Wait, this isn't quite right. Let me think again.

We have a sequence of intervals [left_idx, right_idx) that all overlap with [lo, hi). We want to remove [lo, hi) from their union.

The union of these intervals is some interval [min_lo, max_hi) (since they're contiguous after merging... wait, no, they're disjoint but we're removing a portion).

Actually, the intervals in [left_idx, right_idx) are disjoint and sorted. Removing [lo, hi) from each:
- For each interval (a, b):
  - If a < lo: the part (a, lo) remains
  - If b > hi: the part (hi, b) remains

But since the intervals are disjoint and we're removing a contiguous range, the remaining parts form at most 2 intervals:
- Left part: from the leftmost overlapping interval, the part before lo
- Right part: from the rightmost overlapping interval, the part after hi

Wait, that's not quite right either. Let me think more carefully.

The intervals in [left_idx, right_idx) are disjoint, sorted, and all overlap [lo, hi). So:
- The first interval (left_idx) has lo_interval <= lo (it starts before or at lo) and hi_interval > lo.
- The last interval (right_idx - 1) has lo_interval < hi and hi_interval >= hi.
- Middle intervals are entirely within [lo, hi).

After removing [lo, hi):
- From the first interval: if a < lo, we get (a, lo)
- From the last interval: if b > hi, we get (hi, b)
- Middle intervals: completely removed.

But wait, what if there's only one interval? Then:
- If a < lo and b > hi: we get (a, lo) and (hi, b)
- If a < lo and b <= hi: we get (a, lo)
- If a >= lo and b > hi: we get (hi, b)
- If a >= lo and b <= hi: nothing remains

Let me redo:
```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    right_idx = bisect.bisect_left(self._intervals, (hi, float('-inf')))
    left_idx = right_idx - 1
    while left_idx >= 0 and self._intervals[left_idx][1] > lo:
        left_idx -= 1
    left_idx += 1
    
    if left_idx >= right_idx:
        return
    
    result = []
    # Left part from the first interval
    a, b = self._intervals[left_idx]
    if a < lo:
        result.append((a, lo))
    
    # Right part from the last interval
    a, b = self._intervals[right_idx - 1]
    if b > hi:
        result.append((hi, b))
    
    self._intervals[left_idx:right_idx] = result
```

This should work because:
- The first interval in the range starts before lo (since it overlaps [lo, hi)), so a < hi. And since it's the leftmost overlapping, a could be < lo or >= lo.
- Actually wait, the first interval could have a >= lo. In that case, a >= lo and we don't add a left part.
- The last interval could have b <= hi. In that case, we don't add a right part.

Let me verify: if the first interval is (lo, something), then a == lo, and a < lo is False, so no left part. Correct.
If the last interval is (something, hi), then b == hi, and b > hi is False, so no right part. Correct.

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

Since we maintain the invariant that intervals are sorted, disjoint, and non-touching (merged), this is already correct.

For `__len__()`:
```python
def __len__(self):
    return len(self._intervals)
```

Now let me think about the performance more carefully.

For 60,000 adds of small disjoint intervals in random order:
- Each add: bisect_left (O(log n)) + while loop (typically 0-1 iterations for disjoint) + list slice assignment (O(n) for memmove)
- Total: O(n log n + n²) dominated by the n² from list insertions.

60,000² = 3.6 × 10⁹. But the memmove is in C and very fast. Each insertion moves on average n/2 = 30,000 pointers (8 bytes each) = 240KB. 60,000 × 240KB = 14.4 GB of memory movement. At ~20 GB/s, that's ~0.7 seconds. Plus Python overhead for the bisect and loop, maybe another 0.5-1 seconds. Total should be well under 5 seconds.

For 200,000 contains:
- Each: O(log n) bisect + O(1) comparison
- Total: 200,000 × log(60,000) ≈ 200,000 × 16 ≈ 3.2 million operations. Very fast.

I think this approach will work. Let me also consider using `float('-inf')` vs some other sentinel. Since the bounds can be any real number (int or float), I should use `float('-inf')` and `float('inf')` as sentinels.

Wait, there's a subtlety. If lo or hi can be `float('-inf')` or `float('inf')`, then using those as sentinels in bisect could be problematic. But the problem says "real numbers" which I'll interpret as finite reals. Let me use `float('-inf')` and `float('inf')` as sentinels.

Actually, let me reconsider the bisect. I'm using `bisect.bisect_left(self._intervals, (hi, float('-inf')))`. This compares tuples. If an interval is (lo_i, hi_i), the comparison (lo_i, hi_i) < (hi, -inf) means lo_i < hi or (lo_i == hi and hi_i < -inf). Since hi_i is always >= -inf (and actually > -inf for finite values), the second condition is never true. So it simplifies to lo_i < hi. Thus bisect_left gives the first position where lo_i >= hi. 

Similarly, for contains: `bisect.bisect_right(self._intervals, (x, float('inf')))`. An interval (lo_i, hi_i) <= (x, inf) means lo_i < x or (lo_i == x and hi_i <= inf). Since hi_i is always <= inf, this simplifies to lo_i <= x. So bisect_right gives the position after the last interval with lo_i <= x. Subtracting 1 gives the last interval with lo_i <= x.

This all looks correct. Let me write the final code.

One more thing: the problem says "Keep the original values (no rounding)." This means I should not convert between int and float unnecessarily. Python handles int and float comparisons natively, so this should be fine.

Let me also double-check the `add` method for the case where the new interval touches existing intervals. For example, if we have [(1, 3)] and add [3, 5), the result should be [(1, 5)].

In my algorithm:
- right_idx = bisect_left(intervals, (5, -inf)) = 1 (since (1,3) < (5,-inf))
- left_idx: start at 0, check intervals[0][1] = 3 > lo = 3? No, 3 > 3 is False. So left_idx stays at 0.
- Wait, the condition is `self._intervals[left_idx][1] > lo`. For lo=3, hi=5: intervals[0] = (1, 3), 3 > 3 is False. So left_idx = 0.
- We merge intervals[0:1] with (3, 5): new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- Result: [(1, 5)]. Correct!

Another case: [(1, 3), (5, 7)] and add [3, 5):
- right_idx = bisect_left(intervals, (5, -inf)) = 1 (since (1,3) < (5,-inf) but (5,7) >= (5,-inf))
- left_idx: start at 0, check intervals[0][1] = 3 > lo = 3? No. So left_idx = 0.
- Merge intervals[0:1] with (3, 5): new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- Result: [(1, 5), (5, 7)]. 

Wait, but (1, 5) and (5, 7) are touching! They should be merged to (1, 7).

Hmm, I need to handle this. After the merge, I should check if the new interval touches the next interval.

Let me revise the add algorithm:

After merging, check if the new interval touches the next interval (at right_idx after the slice assignment, which is now at position left_idx + 1 in the modified list).

Actually, let me think about this differently. The issue is that my current algorithm only merges with intervals that overlap [lo, hi). But touching intervals (where one ends exactly where the other begins) should also be merged.

Let me adjust: when finding the range to merge, I should include intervals that touch the new interval.

For the left side: an interval (a, b) touches [lo, hi) from the left if b == lo. So the condition should be `b >= lo` instead of `b > lo`.

Wait, but if b == lo, the interval (a, b) and [lo, hi) touch, and should be merged. So the condition for the left boundary should be `self._intervals[left_idx][1] >= lo`.

Let me re-examine:
- An interval (a, b) overlaps or touches [lo, hi) if b > lo and a < hi (for overlap) or b == lo (for touching from left) or a == hi (for touching from right).

Actually, let me think about it as: the interval (a, b) is "relevant" if it's not completely to the left (b <= lo) and not completely to the right (a >= hi). So relevant means b > lo and a < hi. But for touching: b == lo means touching from left, a == hi means touching from right.

So the condition for being relevant (overlap or touch) is: b >= lo and a <= hi.

For the right boundary: first interval with a > hi (not a >= hi, because a == hi means touching).
For the left boundary: last interval with b < lo (not b <= lo, because b == lo means touching).

Let me redo:
- right_idx = bisect.bisect_left(self._intervals, (hi + epsilon, ...)) - no, that doesn't work with exact values.

Hmm, let me think differently. 

right_idx: first interval with lo > hi (strictly greater, not >=).
- This is bisect_right(self._intervals, (hi, float('inf'))). Because (lo_i, hi_i) <= (hi, inf) means lo_i < hi or (lo_i == hi and hi_i <= inf). Since hi_i <= inf always, this means lo_i <= hi. So bisect_right gives the first position where lo_i > hi.

left_idx: I need the first interval where hi > lo (i.e., the interval extends past lo). Going backwards from right_idx - 1:
- Start at right_idx - 1, go back while hi > lo.
- Wait, I need to include intervals where hi == lo (touching). So the condition to continue going back is hi >= lo.

Let me redo:
```python
right_idx = bisect.bisect_right(self._intervals, (hi, float('inf')))
# This gives first interval with lo > hi

left_idx = right_idx - 1
while left_idx >= 0 and self._intervals[left_idx][1] >= lo:
    left_idx -= 1
left_idx += 1
```

Wait, but if an interval has hi == lo, it touches [lo, hi) and should be merged. The condition `self._intervals[left_idx][1] >= lo` means the interval's hi is >= lo, which means it either overlaps or touches. Yes, this is correct.

Let me re-verify with the example: [(1, 3), (5, 7)] and add [3, 5):
- right_idx = bisect_right(intervals, (5, inf)) = 2 (both (1,3) and (5,7) have lo <= 5, so bisect_right gives 2)

Wait, (5, 7) <= (5, inf)? 5 <= 5 and 7 <= inf. Yes. So bisect_right gives 2.

- left_idx: start at 1. intervals[1] = (5, 7). 7 >= 3? Yes. left_idx = 0. intervals[0] = (1, 3). 3 >= 3? Yes. left_idx = -1. Stop. left_idx = 0.
- Merge intervals[0:2] with (3, 5): new_lo = min(3, 1, 5) = 1, new_hi = max(5, 3, 7) = 7.
- Result: [(1, 7)]. Correct!

Another example: [(1, 3)] and add [3, 5):
- right_idx = bisect_right(intervals, (5, inf)) = 1. (1,3) <= (5, inf)? Yes. So right_idx = 1.
- left_idx: start at 0. intervals[0] = (1, 3). 3 >= 3? Yes. left_idx = -1. Stop. left_idx = 0.
- Merge intervals[0:1] with (3, 5): new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- Result: [(1, 5)]. Correct!

Example: [(1, 3)] and add [4, 5):
- right_idx = bisect_right(intervals, (5, inf)) = 1.
- left_idx: start at 0. intervals[0] = (1, 3). 3 >= 4? No. Stop. left_idx = 0.
- Merge intervals[0:1] with (4, 5): Wait, but (1,3) doesn't overlap or touch [4,5). 

Hmm, the issue is that left_idx = 0 but the interval at index 0 doesn't actually overlap or touch [4, 5). The condition `self._intervals[left_idx][1] >= lo` is 3 >= 4 which is False, so we stop. left_idx becomes 0 (after the +1). But then we'd be merging interval (1,3) with (4,5), which is wrong!

Wait, let me re-read my code:
```python
left_idx = right_idx - 1  # = 0
while left_idx >= 0 and self._intervals[left_idx][1] >= lo:
    left_idx -= 1
left_idx += 1  # = 0 + 1 = 1? No...
```

Wait: left_idx starts at 0. Check: 0 >= 0 and intervals[0][1] = 3 >= 4? No. So the while loop doesn't execute. left_idx stays at 0. Then left_idx += 1 gives left_idx = 1.

So left_idx = 1, right_idx = 1. The range [1, 1) is empty. We just insert (4, 5) at position 1. Result: [(1, 3), (4, 5)]. Correct!

OK so the algorithm works. Let me trace through more carefully:

```python
right_idx = bisect.bisect_right(self._intervals, (hi, float('inf')))
left_idx = right_idx - 1
while left_idx >= 0 and self._intervals[left_idx][1] >= lo:
    left_idx -= 1
left_idx += 1
```

For [(1, 3)] and add [4, 5):
- right_idx = bisect_right([(1,3)], (5, inf)) = 1
- left_idx = 0
- while: 0 >= 0 and 3 >= 4? No. Exit.
- left_idx = 0 + 1 = 1
- Range [1, 1) is empty.
- Insert (4, 5) at position 1: [(1, 3), (4, 5)]. ✓

For [(1, 3)] and add [2, 5):
- right_idx = bisect_right([(1,3)], (5, inf)) = 1
- left_idx = 0
- while: 0 >= 0 and 3 >= 2? Yes. left_idx = -1.
- left_idx = -1 + 1 = 0
- Range [0, 1): merge (1,3) with (2,5) → (1, 5). ✓

For [(1, 3), (5, 7)] and add [3, 5):
- right_idx = bisect_right([(1,3),(5,7)], (5, inf)) = 2
- left_idx = 1
- while: 1 >= 0 and 7 >= 3? Yes. left_idx = 0.
- while: 0 >= 0 and 3 >= 3? Yes. left_idx = -1.
- left_idx = -1 + 1 = 0
- Range [0, 2): merge (1,3), (5,7) with (3,5) → (1, 7). ✓

Great, the algorithm works.

Now for the performance concern with the while loop: in the worst case (adding a large interval that spans many small ones), the while loop could be O(n). But for the stated test case (small disjoint intervals), each add will have the while loop execute at most 0-1 times (since the intervals are disjoint, the new interval can touch at most one interval on each side). So the total work for 60,000 adds is O(n log n) for the bisects + O(n²) for the list insertions (memmove).

I'm satisfied this will be fast enough. Let me write the final code.

Actually, one more thought: for the `remove` method, I need to be careful. Let me re-examine:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    right_idx = bisect.bisect_right(self._intervals, (hi, float('inf')))
    left_idx = right_idx - 1
    while left_idx >= 0 and self._intervals[left_idx][1] > lo:
        left_idx -= 1
    left_idx += 1
    
    if left_idx >= right_idx:
        return
    
    result = []
    a, b = self._intervals[left_idx]
    if a < lo:
        result.append((a, lo))
    
    a, b = self._intervals[right_idx - 1]
    if b > hi:
        result.append((hi, b))
    
    self._intervals[left_idx:right_idx] = result
```

Wait, for remove, the condition should be different from add. For remove, we only care about intervals that actually overlap [lo, hi) (not just touch). An interval (a, b) overlaps [lo, hi) if a < hi and b > lo.

For the right boundary: first interval with a >= hi (not a > hi, because a == hi means no overlap).
- bisect_left(self._intervals, (hi, float('-inf'))): (a, b) < (hi, -inf) means a < hi or (a == hi and b < -inf). Since b > -inf always, this means a < hi. So bisect_left gives the first position where a >= hi.

For the left boundary: go back while b > lo (strictly greater, because b == lo means no overlap).

Let me verify: [(1, 5)] and remove [2, 3):
- right_idx = bisect_left([(1,5)], (3, -inf)) = 1 (since (1,5) < (3,-inf) because 1 < 3)
- left_idx = 0
- while: 0 >= 0 and 5 > 2? Yes. left_idx = -1.
- left_idx = 0
- Range [0, 1): 
  - a, b = (1, 5). a < lo? 1 < 2? Yes. result = [(1, 2)]
  - a, b = (1, 5) (same, since right_idx-1 = 0). b > hi? 5 > 3? Yes. result = [(1, 2), (3, 5)]
- Replace [0:1] with [(1,2), (3,5)]. Result: [(1, 2), (3, 5)]. ✓

[(1, 5)] and remove [1, 5):
- right_idx = bisect_left([(1,5)], (5, -inf)) = 1 (since (1,5) < (5,-inf) because 1 < 5)
- left_idx = 0
- while: 0 >= 0 and 5 > 1? Yes. left_idx = -1.
- left_idx = 0
- Range [0, 1):
  - a, b = (1, 5). a < lo? 1 < 1? No.
  - a, b = (1, 5). b > hi? 5 > 5? No.
  - result = []
- Replace [0:1] with []. Result: []. ✓

[(1, 5)] and remove [0, 2):
- right_idx = bisect_left([(1,5)], (2, -inf)) = 1 (since (1,5) < (2,-inf) because 1 < 2)
- left_idx = 0
- while: 0 >= 0 and 5 > 0? Yes. left_idx = -1.
- left_idx = 0
- Range [0, 1):
  - a, b = (1, 5). a < lo? 1 < 0? No.
  - a, b = (1, 5). b > hi? 5 > 2? Yes. result = [(2, 5)]
- Replace [0:1] with [(2, 5)]. Result: [(2, 5)]. ✓

[(1, 5)] and remove [3, 10):
- right_idx = bisect_left([(1,5)], (10, -inf)) = 1
- left_idx = 0
- while: 0 >= 0 and 5 > 3? Yes. left_idx = -1.
- left_idx = 0
- Range [0, 1):
  - a, b = (1, 5). a < lo? 1 < 3? Yes. result = [(1, 3)]
  - a, b = (1, 5). b > hi? 5 > 10? No.
  - result = [(1, 3)]
- Replace [0:1] with [(1, 3)]. Result: [(1, 3)]. ✓

Looks good!

Now let me also think about edge cases:
- What if lo or hi is a float like 0.1 + 0.2 = 0.30000000000000004? We just keep the value as-is. Python handles this natively.
- What about negative numbers? The bisect logic should work the same way.
- What about very large numbers? Should be fine with Python's arbitrary precision.

I think the solution is complete. Let me write it up.

One more performance consideration: the `bisect` module works on lists. For 60,000 elements, log2(60000) ≈ 16 comparisons per bisect. 60,000 adds × 2 bisects × 16 comparisons = ~2 million comparisons. Very fast.

The main cost is the list insert/delete (memmove). For 60,000 inserts into a growing list, the total memmove is approximately sum_{i=0}^{59999} i * 8 bytes ≈ 60000²/2 * 8 = 14.4 GB. At ~20 GB/s memory bandwidth, that's ~0.7 seconds. In practice, it might be a bit slower due to cache effects, but should still be well under 5 seconds.

Let me finalize the code.
