Let me think about this carefully.

We need an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
1. `add(lo, hi)` - add interval, merge with existing ones
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, merged list of (lo, hi) tuples
6. `__len__()` - number of intervals
7. Performance: 60,000 add() calls of small disjoint intervals in random order, then 200,000 contains() calls must take well under 5 seconds.

The performance requirement is critical. Let me think about the data structure.

For `contains(x)` to be O(log n), we need a sorted structure where we can binary search. The typical approach is to keep intervals sorted by their `lo` value, and use binary search to find the interval containing x.

For `add(lo, hi)`:
- Find all intervals that overlap with [lo, hi) or touch it
- Merge them into a single interval
- Insert the merged interval

For `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- Split them: parts before lo stay, parts after hi stay
- This can split an interval into two parts

The challenge is doing this efficiently. With 60,000 add() calls, if each add is O(n) in the number of intervals, that could be 60,000 * 60,000 = 3.6 billion operations, which is way too slow.

Wait, but the problem says "60,000 add() calls of small disjoint intervals in random order". If they're disjoint, then each add just inserts one new interval (no merging needed). So the number of intervals grows to 60,000.

For contains(), with 60,000 intervals, binary search is O(log 60000) ≈ 16 comparisons, and 200,000 * 16 = 3.2 million operations. That's fine.

The issue is the add() calls. If we use a sorted list and do binary search to find the insertion point, then for disjoint intervals, each add is O(n) for the insertion (shifting elements in the list). 60,000 insertions into a list of growing size... the total work is O(n^2) = 60,000^2 / 2 ≈ 1.8 billion element shifts. In Python, list insertion is O(n) for the shift, so this would be very slow.

We need a better data structure. Options:
1. Use a sorted list with `bisect` - but insertion is O(n)
2. Use a balanced BST - Python doesn't have one in stdlib
3. Use a different approach

Wait, let me reconsider. With `bisect`, finding the position is O(log n), but inserting into a Python list is O(n) due to shifting. For 60,000 insertions, the total shifting cost is about 60,000 * 60,000 / 2 = 1.8 billion element moves. In Python, each element move is a pointer copy, which is quite fast in C. Let me estimate: 1.8 billion pointer copies... that's probably too slow in Python (maybe 30+ seconds).

Hmm, but actually Python lists use `memmove` for the shift, which is a C-level memory copy. 60,000 * 8 bytes (pointer size) = 480 KB per worst-case insertion. The total memory moved is about 60,000 * 480KB / 2 ≈ 14.4 GB of memory moves. That might take a few seconds.

Actually, let me reconsider. The average shift length over all insertions into a list of size n is n/2. So total elements shifted is sum from i=1 to n of i/2 ≈ n^2/4 = 60000^2/4 = 900 million element shifts. Each shift is a memcpy of 8 bytes per element. So about 7.2 GB of memory copies. At maybe 10 GB/s for memmove, that's about 0.7 seconds. Plus the bisect overhead. This might actually be feasible.

Wait, but we also need to handle the case where add() might merge intervals. For "small disjoint intervals in random order", if they're truly disjoint, no merging happens, and we just insert. But if some do merge, we need to find and remove the overlapping intervals too.

Let me think of a better approach. What about using a `sortedcontainers.SortedList`? No, that's not in the standard library.

What about using a different strategy: Instead of a list, use a balanced tree structure? Python's standard library doesn't have one.

Alternative: Use a list but be smart about it. For the 60,000 adds of disjoint intervals, if they're random, we're doing random insertions. The list approach with bisect + insert should work.

Let me calculate more carefully:
- 60,000 insertions into a list
- Average position is n/2 where n grows from 0 to 60,000
- Average shift is n/4 (since we're inserting at random positions, average shift is half the current length)
- Total shifts: sum_{i=0}^{59999} i/2 ≈ 59999 * 60000 / 4 ≈ 900 million
- Each shift is a memmove of 8 bytes per element
- Total memory: 900M * 8 = 7.2 GB
- memmove speed: maybe 5-10 GB/s
- Time: 0.7 - 1.4 seconds

Plus the bisect searches: 60,000 * log(60000) ≈ 60,000 * 16 = 960,000 comparisons. Negligible.

Plus 200,000 contains() calls: 200,000 * log(60000) ≈ 3.2 million comparisons. Negligible.

So total should be well under 5 seconds. Let me go with the sorted list approach.

Actually, let me reconsider the data structure. I'll store intervals as a list of (lo, hi) tuples, sorted by lo. I'll use `bisect` on the lo values.

For `add(lo, hi)`:
1. If lo >= hi, return
2. Find the range of intervals that overlap or touch [lo, hi)
   - An interval [a, b) overlaps or touches [lo, hi) if a < hi and b > lo
   - Since intervals are sorted by lo (and non-overlapping), I need to find:
     - The first interval with hi > lo (its end extends past lo)
     - The last interval with lo < hi (its start is before hi)
3. Merge all those into [min(lo, first_lo), max(hi, last_hi)]
4. Replace those intervals with the merged one

For finding the overlap range:
- Intervals are stored sorted by lo, and they're disjoint
- I need to find the first interval where interval_hi > lo
- And the last interval where interval_lo < hi

Using bisect:
- `bisect_right` on the list of lo values to find the first interval with lo >= hi... wait, that's not quite right.

Let me think more carefully. Intervals are [a_i, b_i) sorted by a_i, and they're disjoint (non-overlapping, non-touching after merge).

For add(lo, hi):
- I need to find all intervals [a_i, b_i) such that a_i < hi and b_i > lo (overlap or touch)
- Since intervals are sorted by a_i and disjoint:
  - Find the leftmost interval: the one with the largest a_i that is <= hi... no wait.
  - Actually, I need the first interval whose b_i > lo. Since intervals are sorted by a_i, and they're disjoint, I can binary search.
  
Hmm, let me think differently. Since intervals are sorted by lo and disjoint:
- Interval i has [lo_i, hi_i), and lo_i < lo_{i+1}, and hi_i <= lo_{i+1} (non-touching)
  
For add(lo, hi):
- I need to find the first interval that could overlap: its hi > lo
- Since intervals are sorted by lo, and hi_i <= lo_{i+1}, the first interval that could overlap is the one with the largest lo_i that is < hi, and check if its hi > lo.
  
Wait, let me think about it as:
- Find all intervals i where lo_i < hi and hi_i > lo
- Since they're sorted by lo_i, I can find the first such interval by binary search on lo_i: find the last interval with lo_i < hi, then check backwards for hi_i > lo.

Actually, a cleaner approach:
- Use bisect to find the position where lo would be inserted
- Check the interval at that position (if its lo < hi, it overlaps)
- Check the interval at position-1 (if its hi > lo, it overlaps)
- Then expand in both directions

Wait, since intervals are disjoint and sorted:
- The intervals that overlap with [lo, hi) form a contiguous range in the sorted list
- I need to find the start and end of this range

Let me define:
- `idx = bisect.bisect_right(los, hi)` — this gives the index where hi would be inserted in the sorted lo list. So all intervals at indices 0..idx-1 have lo <= hi. But I need lo < hi (strictly, since [lo_i, hi_i) and [lo, hi) — they touch at lo_i == hi, which means they don't overlap for half-open intervals). Wait, actually [a, b) and [b, c) are disjoint. So if lo_i == hi, they don't overlap. So I want lo_i < hi.
  
  `bisect_left(los, hi)` gives the first index where lo_i >= hi. So indices 0..(that-1) have lo_i < hi.

- Similarly, I need hi_i > lo. Since intervals are disjoint and sorted, and hi_i <= lo_{i+1}, the intervals with hi_i > lo form a contiguous prefix of the overlapping range.

Let me use a different approach:
- `left_idx = bisect.bisect_left(los, hi)` — first index where lo_i >= hi. So candidates are 0..left_idx-1.
- But I also need hi_i > lo. The rightmost candidate is left_idx - 1. Check if its hi > lo. If not, no overlap.
- Then scan left from left_idx-1 while intervals have hi > lo (which they all will, since they're contiguous and the first one has hi > lo... wait, no. They're sorted by lo, and disjoint. The one at left_idx-1 has the largest lo among candidates. Its hi is >= its lo. But does it overlap with [lo, hi)? It has lo_i < hi (since index < left_idx) and we need hi_i > lo.)

Actually, I think the cleanest approach is:
1. Find the right boundary: `right_idx = bisect.bisect_left(los, hi) - 1` (last interval with lo < hi)
2. Find the left boundary: `left_idx = bisect.bisect_left(los, hi)` (first interval with lo >= hi), then check if the interval at left_idx - 1 has hi > lo. If not, no overlap on the left side. But wait, what about intervals before left_idx - 1? They have even smaller lo, and since they're disjoint, their hi <= lo_{next} <= lo of interval at left_idx-1 < hi. But do they overlap with [lo, hi)? We need their hi > lo.

Hmm, this is getting complicated. Let me think again.

Since intervals are disjoint and sorted by lo:
- lo_0 < hi_0 <= lo_1 < hi_1 <= lo_2 < ...

For a new interval [lo, hi), it overlaps with interval i if and only if lo_i < hi AND hi_i > lo.

The overlapping intervals form a contiguous block in the sorted list.

To find the block:
- The rightmost overlapping interval has the largest lo_i < hi. So: `right = bisect.bisect_left(los, hi) - 1`
- Check if intervals[right] has hi > lo. If not, no overlap at all (since all earlier intervals have even smaller hi).
  Wait, that's not true. Earlier intervals have smaller lo but could have larger hi? No! Since they're disjoint and sorted: hi_i <= lo_{i+1}. So hi_0 <= lo_1 <= lo_2 <= ... The hi values are not necessarily increasing, but they are bounded by the next lo.
  
  Actually, since the intervals are disjoint and sorted by lo: lo_i < hi_i <= lo_{i+1}. So hi_i < lo_{i+1} (for non-touching) or hi_i <= lo_{i+1} (for touching, but we merge touching).
  
  Since we merge touching intervals, we have hi_i < lo_{i+1} strictly (for adjacent intervals). Wait, no: [1,3) and [3,5) merge to [1,5). So after merging, we always have hi_i < lo_{i+1} (strict inequality) for adjacent intervals. Actually wait, that's not right either. If we have [1,3) and [4,5), then hi_0 = 3 < lo_1 = 4. Yes, strict inequality for adjacent intervals.

So: lo_i < hi_i < lo_{i+1} < hi_{i+1} < ...

This means both lo and hi are strictly increasing. So I can binary search on both.

For the right boundary: find the last interval with lo_i < hi. `right = bisect.bisect_left(los, hi) - 1`. If right < 0, no overlap.

For the left boundary: find the first interval with hi_i > lo. Since hi values are strictly increasing, I can binary search on hi values. `left = bisect.bisect_right(his, lo)` — first index where hi_i > lo. Wait, `bisect_right(his, lo)` gives the first index where hi_i > lo? No: `bisect_right` gives the insertion point to the right of any existing entries equal to lo. So `bisect_right(his, lo)` is the first index where hi_i > lo. Yes!

So:
- `left = bisect.bisect_right(his, lo)` — first interval with hi_i > lo
- `right = bisect.bisect_left(los, hi) - 1` — last interval with lo_i < hi

If left <= right, there's overlap. The intervals from left to right (inclusive) all overlap with [lo, hi).

The merged interval is [min(lo, los[left]), max(hi, his[right])].

Then we replace intervals[left..right] with the new merged interval.

This is O(n) for the list splice, but O(log n) for finding the range.

For `remove(lo, hi)`:
- Find the same range of overlapping intervals
- For each interval in the range, the parts that remain are:
  - [a, lo) if a < lo (the part before the removal)
  - (b, hi) → [hi, b) if b > hi (the part after the removal)
- So we replace the block with at most 2 intervals

For `contains(x)`:
- Binary search: find the interval where lo <= x < hi
- `idx = bisect.bisect_right(los, x)` — first index where lo_i > x, so idx-1 is the last interval with lo_i <= x
- Check if idx > 0 and x < his[idx-1]

This is O(log n). 

Now for performance with 60,000 adds:
- Each add does a bisect (O(log n)) and a list splice (O(n) for the shift)
- Total shift cost: ~O(n^2) as calculated before, should be manageable

Let me also handle the `intervals()` method: just return a copy of the internal list.

`total_length()`: sum of hi - lo for all intervals. I could cache this, but it's simpler to just compute it. With 60,000 intervals, it's O(n) which is fine.

Actually, for performance, let me maintain a running total length. When we add, we add the new length minus the old lengths. When we remove, we subtract the removed length.

Wait, let me just compute it on the fly for simplicity. 60,000 additions is nothing.

Let me code this up:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._los = []  # sorted lo values
        self._his = []  # sorted hi values (corresponding to _los)
    
    def _find_overlap_range(self, lo, hi):
        """Find (left, right) indices of overlapping intervals, or None if no overlap."""
        # First interval with hi_i > lo
        left = bisect.bisect_right(self._his, lo)
        # Last interval with lo_i < hi
        right = bisect.bisect_left(self._los, hi) - 1
        if left <= right:
            return left, right
        return None
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        range_result = self._find_overlap_range(lo, hi)
        if range_result is None:
            # No overlap, just insert
            idx = bisect.bisect_left(self._los, hi)  # insert before first interval with lo >= hi
            # Actually, since intervals are disjoint, we can just find the right position
            # The new interval [lo, hi) should be inserted at position where lo fits
            idx = bisect.bisect_right(self._los, lo)  # position to insert lo
            # Wait, I need to be more careful. Since intervals are disjoint, I insert at the position where lo goes.
            # Actually, bisect.bisect_left(self._los, lo) or bisect.bisect_right(self._los, lo)?
            # Since all existing los are distinct (intervals are disjoint), bisect_left and bisect_right give the same result for lo.
            idx = bisect.bisect_left(self._los, lo)
            self._los.insert(idx, lo)
            self._his.insert(idx, hi)
        else:
            left, right = range_result
            new_lo = min(lo, self._los[left])
            new_hi = max(hi, self._his[right])
            # Replace intervals[left..right] with [new_lo, new_hi)
            self._los[left:right+1] = [new_lo]
            self._his[left:right+1] = [new_hi]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        range_result = self._find_overlap_range(lo, hi)
        if range_result is None:
            return
        left, right = range_result
        new_intervals = []
        # Check if the first overlapping interval starts before lo
        if self._los[left] < lo:
            new_intervals.append((self._los[left], lo))
        # Check if the last overlapping interval ends after hi
        if self._his[right] > hi:
            new_intervals.append((hi, self._his[right]))
        self._los[left:right+1] = [x[0] for x in new_intervals]
        self._his[left:right+1] = [x[1] for x in new_intervals]
    
    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]
    
    def total_length(self):
        return sum(h - l for l, h in zip(self._los, self._his))
    
    def intervals(self):
        return list(zip(self._los, self._his))
    
    def __len__(self):
        return len(self._los)
```

Wait, let me double-check the `_find_overlap_range` logic:
- `left = bisect.bisect_right(self._his, lo)`: This finds the first index where hi_i > lo. Since his is sorted (strictly increasing for disjoint intervals), this is correct.
- `right = bisect.bisect_left(self._los, hi) - 1`: This finds the last index where lo_i < hi. Since los is sorted, `bisect_left(los, hi)` gives the first index where lo_i >= hi, so subtracting 1 gives the last where lo_i < hi.

If left <= right, there's at least one interval that both has hi > lo (index >= left) and lo < hi (index <= right). Since the intervals are contiguous and sorted, all intervals from left to right overlap with [lo, hi).

Wait, I need to verify: is it true that ALL intervals from left to right overlap with [lo, hi)?

Interval i (left <= i <= right):
- i >= left means hi_i > lo (since his is sorted, hi_i >= hi_left > lo)
- i <= right means lo_i < hi (since los is sorted, lo_i <= lo_right < hi)

Yes! So all intervals from left to right overlap.

Let me verify with an example:
- Existing: [1, 3), [5, 7), [9, 11)
- los = [1, 5, 9], his = [3, 7, 11]
- Add [2, 10):
  - left = bisect_right([3, 7, 11], 2) = 0 (first hi > 2 is at index 0)
  - right = bisect_left([1, 5, 9], 10) - 1 = 3 - 1 = 2 (first lo >= 10 is at index 3, so last lo < 10 is index 2)
  - left=0, right=2, so we merge all three: [min(2,1), max(10,11)] = [1, 11)
  - Correct!

- Add [4, 6):
  - left = bisect_right([3, 7, 11], 4) = 1 (first hi > 4 is 7 at index 1)
  - right = bisect_left([1, 5, 9], 6) - 1 = 1 - 1 = 0 (first lo >= 6 is 9 at index 2, so last lo < 6 is index 1... wait)
  
  Hmm wait: bisect_left([1, 5, 9], 6) → 6 would be inserted at index 2 (between 5 and 9). So right = 2 - 1 = 1.
  
  left = 1, right = 1. Merge interval at index 1: [5, 7) with [4, 6) → [4, 7).
  Result: [1, 3), [4, 7), [9, 11). Correct!

- Remove [5, 10) from [1, 3), [4, 7), [9, 11):
  - los = [1, 4, 9], his = [3, 7, 11]
  - left = bisect_right([3, 7, 11], 5) = 1 (first hi > 5 is 7 at index 1)
  - right = bisect_left([1, 4, 9], 10) - 1 = 3 - 1 = 2 (first lo >= 10 is index 3, last lo < 10 is index 2)
  - Overlapping intervals: indices 1, 2 → [4, 7) and [9, 11)
  - First overlap starts at 4 < 5, so keep [4, 5)
  - Last overlap ends at 11 > 10, so keep [10, 11)
  - Replace indices 1..2 with [4, 5), [10, 11)
  - Result: [1, 3), [4, 5), [10, 11). Correct!

Looks good. Let me also handle edge cases:
- What if lo == some existing hi? E.g., existing [1, 3), add [3, 5). 
  - left = bisect_right([3], 3) = 1 (first hi > 3... there is none, so returns 1)
  - right = bisect_left([1], 5) - 1 = 1 - 1 = 0
  - left=1 > right=0, no overlap. Insert [3, 5).
  - But wait! [1, 3) and [3, 5) are touching! The spec says touching intervals should be merged: "[1,3) + [3,5) gives [(1, 5)]"
  
  So I need to also merge touching intervals! My overlap check should be: overlap OR touch.
  
  Touching means hi_i == lo (new interval starts exactly where an old one ends) or lo_i == hi (new interval ends exactly where an old one starts).
  
  So the condition for "overlap or touch" should be: lo_i <= hi AND hi_i >= lo.
  
  Let me revise:
  - left: first interval with hi_i >= lo → `bisect.bisect_left(self._his, lo)` gives first index where hi_i >= lo. Wait, `bisect_left(his, lo)` gives the first index where his[i] >= lo. Yes!
  - right: last interval with lo_i <= hi → `bisect.bisect_right(self._los, hi) - 1` gives the last index where los[i] <= hi.
  
  Let me re-verify:
  - Existing [1, 3), add [3, 5):
    - left = bisect_left([3], 3) = 0 (first hi >= 3 is at index 0)
    - right = bisect_right([1], 5) - 1 = 1 - 1 = 0
    - left=0, right=0. Merge: [min(3,1), max(5,3)] = [1, 5). Correct!
  
  - Existing [1, 3), add [0, 3):
    - left = bisect_left([3], 0) = 0 (first hi >= 0 is at index 0, since 3 >= 0)
    - right = bisect_right([1], 3) - 1 = 1 - 1 = 0 (last lo <= 3 is index 0)
    - Merge: [min(0,1), max(3,3)] = [0, 3). Correct!
  
  - Existing [1, 3), add [0, 1):
    - left = bisect_left([3], 0) = 0
    - right = bisect_right([1], 1) - 1 = 1 - 1 = 0 (last lo <= 1 is index 0, since lo_0 = 1)
    - Merge: [min(0,1), max(1,3)] = [0, 3). Correct! (touching at 1)
  
  - Existing [1, 3), add [4, 5):
    - left = bisect_left([3], 4) = 1 (no hi >= 4, returns 1)
    - right = bisect_right([1], 5) - 1 = 1 - 1 = 0
    - left=1 > right=0. No overlap/touch. Insert [4, 5). Correct!

Great, so the revised overlap check (including touching) works.

Let me also verify remove with touching:
- Existing [1, 5), remove [1, 3):
  - left = bisect_left([5], 1) = 0 (first hi >= 1 is 5 at index 0)
  - right = bisect_right([1], 3) - 1 = 1 - 1 = 0 (last lo <= 3 is index 0)
  - Overlapping: [1, 5)
  - First starts at 1, not < 1, so no left remainder
  - Last ends at 5 > 3, so keep [3, 5)
  - Result: [3, 5). Correct!

- Existing [1, 5), remove [3, 5):
  - left = bisect_left([5], 3) = 0
  - right = bisect_right([1], 5) - 1 = 1 - 1 = 0
  - Overlapping: [1, 5)
  - First starts at 1 < 3, so keep [1, 3)
  - Last ends at 5, not > 5, so no right remainder
  - Result: [1, 3). Correct!

Now let me think about the performance more carefully.

60,000 add() calls of small disjoint intervals in random order. If they're all disjoint, each add is just an insertion. The list grows from 0 to 60,000.

For insertion into a Python list at a random position, the cost is O(n) for the memmove. The total cost over all insertions is:
- Insertion 1: shift ~0 elements
- Insertion 2: shift ~1 element
- ...
- Insertion 60000: shift ~30000 elements (average)

Total: sum_{i=1}^{60000} i/2 ≈ 60000*60001/4 ≈ 900 million element shifts.

In CPython, list.insert at position i does a memmove of (n-i)*8 bytes (for 64-bit). So the total bytes moved is:
sum_{i=1}^{60000} (i/2)*8 ≈ 900M * 8 = 7.2 GB

At memmove speeds of ~10 GB/s, this is about 0.7 seconds. Plus overhead. Should be well under 5 seconds.

For contains(): 200,000 calls, each O(log 60000) ≈ 16 comparisons. Total: 3.2 million comparisons. Very fast.

I think this approach will work. Let me finalize the code.

One more thing: the spec says "Bounds may be ints or floats. Keep the original values (no rounding)." This means I should not do any floating-point manipulation that could change the values. I'll just store them as-is.

Also, for `total_length()`, I should return a number (int or float depending on the inputs). If all inputs are ints, the sum will be an int. If any are floats, it'll be a float. Python handles this naturally.

Let me write the final code:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._los = []
        self._his = []

    def _find_range(self, lo, hi):
        """Return (left, right) indices of intervals overlapping/touching [lo, hi), or None."""
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi) - 1
        if left <= right:
            return left, right
        return None

    def add(self, lo, hi):
        if lo >= hi:
            return
        r = self._find_range(lo, hi)
        if r is None:
            idx = bisect.bisect_left(self._los, lo)
            self._los.insert(idx, lo)
            self._his.insert(idx, hi)
        else:
            left, right = r
            new_lo = min(lo, self._los[left])
            new_hi = max(hi, self._his[right])
            self._los[left:right + 1] = [new_lo]
            self._his[left:right + 1] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        r = self._find_range(lo, hi)
        if r is None:
            return
        left, right = r
        new_intervals = []
        if self._los[left] < lo:
            new_intervals.append((self._los[left], lo))
        if self._his[right] > hi:
            new_intervals.append((hi, self._his[right]))
        if new_intervals:
            self._los[left:right + 1] = [x[0] for x in new_intervals]
            self._his[left:right + 1] = [x[1] for x in new_intervals]
        else:
            del self._los[left:right + 1]
            del self._his[left:right + 1]

    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]

    def total_length(self):
        return sum(h - l for l, h in zip(self._los, self._his))

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)
```

Wait, I should double-check: when inserting without overlap, I use `bisect.bisect_left(self._los, lo)`. Since intervals are disjoint and non-touching (we merge touching), all los are distinct. So bisect_left and bisect_right give the same result. Using bisect_left is fine.

Actually wait - can we ever have two intervals with the same lo? No, because they'd be overlapping (both start at the same point), which contradicts disjointness. So all los are distinct.

Let me also think about whether the `intervals()` method needs to do anything special. The spec says "sorted, disjoint, and with touching intervals merged". Our internal representation already maintains this invariant (we merge on add, and remove preserves disjointness). So just returning the list as-is should be correct.

One edge case: what if after remove, we get something like [1, 3) and [3, 5)? Can that happen? Let's see:
- We have [1, 5), remove [2, 3).
  - left = bisect_left([5], 2) = 0
  - right = bisect_right([1], 3) - 1 = 1 - 1 = 0
  - Overlapping: [1, 5)
  - los[0] = 1 < 2, so keep [1, 2)
  - his[0] = 5 > 3, so keep [3, 5)
  - Result: [1, 2), [3, 5). Disjoint, non-touching. Good.

- What if we have [1, 5) and [5, 8)? Can't happen because we merge touching.

So the invariant is maintained. Good.

I think this solution is correct and performant. Let me finalize it.

Actually, one more performance consideration: for 60,000 random inserts into a Python list, the total time for all the memmoves might be significant. Let me think if there's a faster approach.

Alternative: We could use a different data structure. For example, we could batch the insertions... but no, the API requires individual add() calls.

Another thought: Could I use a `dict` or some other structure? No, I need ordered access for binary search.

I think the list approach is the best we can do with the standard library. The 7.2 GB of memmoves should complete in well under 5 seconds on modern hardware.

Let me also make sure the code handles the case where `lo` and `hi` are of different types (int and float). Python handles comparisons between int and float natively, so this should be fine.

I'm satisfied with the solution. Let me write it out cleanly.
