Let me think about this carefully.

The class `IntervalSet` stores disjoint half-open intervals [lo, hi).

Key requirements:
1. `add(lo, hi)`: Add [lo, hi), merge with existing intervals if they overlap or touch
2. `remove(lo, hi)`: Remove [lo, hi), may split an interval
3. `contains(x) -> bool`: O(log n)
4. `total_length() -> number`: sum of all interval lengths
5. `intervals() -> list[tuple]`: sorted, disjoint, merged
6. `__len__()`: number of intervals
7. Bounds may be ints or floats, keep original values (no rounding)
8. Performance: contains() must be O(log n); 60,000 add() calls + 200,000 contains() calls must take well under 5 seconds.

The tricky part is performance. 60,000 add() calls in random order, then 200,000 contains() calls.

If I use a sorted list and do binary search for contains(), that's O(log n). But for add(), I need to find overlapping intervals and merge them, which could be O(n) in the worst case (if all intervals overlap, each add is O(n)).

Wait, let me reconsider. The problem says "60,000 add() calls of small disjoint intervals in random order". So the intervals are small and disjoint. This means each add() will typically only overlap with a few intervals (probably just 1 or 2 neighboring ones).

If I maintain a sorted list of intervals, for each add():
- Binary search to find the position (O(log n))
- Check neighboring intervals for overlap (O(1) since intervals are disjoint and sorted, an interval can only overlap with its immediate neighbors)
- Merge as needed

Wait, actually for disjoint intervals, [lo, hi) can only overlap with the interval immediately before and immediately after its position. So add() is O(log n) for the search + O(1) for the merge (removing at most a few intervals and inserting the merged one).

Actually, let me think more carefully. If intervals are disjoint and sorted, then [lo, hi) can potentially overlap with multiple intervals. For example, if we have [1,2), [3,4), [5,6) and we add [1,6), it overlaps with all three. But the problem says "small disjoint intervals in random order", so in practice each add overlaps with at most 1-2 intervals.

But in the worst case, adding a large interval could overlap with many small intervals. The performance requirement says "small disjoint intervals in random order", so I think the worst case for a single add is bounded.

Actually, let me re-read: "60 000 add() calls of small disjoint intervals in random order". This means the intervals being added are small AND disjoint from each other. So each new interval won't overlap with many existing ones. In the worst case, it might overlap with 1 or 2 neighbors.

So a sorted list approach with binary search should work fine:
- add(): O(log n) for binary search + O(k) for merging (k is small, typically 1-3) + O(n) for list insertion/deletion (shifting elements)

Wait, list insertion/deletion is O(n) due to shifting. With 60,000 elements, that's 60,000 * 60,000 = 3.6 billion operations in the worst case. That's too slow.

Hmm, but if intervals are disjoint and small, each add() only removes at most 1-2 intervals and inserts 1. So the list insertion is O(n) for shifting, which is 60,000 shifts per operation. 60,000 * 60,000 = 3.6 billion. In Python, list operations on 60,000 elements... each shift is a memory move. Actually, Python's list insertion is O(n) but with a constant factor. 60,000 * 60,000 operations might be too slow.

Let me think of alternatives:
1. Use a balanced BST (like a sorted list from `bisect` module, but with O(1) insertion... no, list insertion is O(n))
2. Use a different data structure

Actually, wait. Let me reconsider. In CPython, list.insert and list.pop are O(n) in the worst case. But 60,000 inserts of O(60,000) each = 3.6 billion element moves. Each element move is just a pointer assignment (8 bytes). 3.6 billion * 8 bytes = 28.8 GB of memory moves. That would be too slow.

Hmm, but actually the intervals are "small and disjoint". So when we add a new interval, it doesn't overlap with existing ones (since they're all disjoint from each other). Wait, "small disjoint intervals in random order" - the intervals being added are disjoint from each other, but they could still overlap with already-added intervals? No, if they're all disjoint from each other, then no new interval overlaps with any existing interval. So each add() just inserts one interval with no merging.

Actually wait, re-reading: "60 000 add() calls of small disjoint intervals in random order". I think this means the 60,000 intervals are all small and disjoint from each other. So no merging is needed. Each add is just a binary search + list insertion.

60,000 list insertions, each O(n) where n grows from 0 to 60,000. Total work: sum(i for i in 1..60000) = 60000*60001/2 ≈ 1.8 billion element moves. In Python, each element move is cheap (pointer assignment), but 1.8 billion operations... that might be too slow.

Let me think of a better data structure.

Option 1: Use a sorted list with `bisect` for search, but accept O(n) insertion. For 60,000 inserts, total is O(n^2) ≈ 3.6 billion. In Python, this is probably too slow.

Option 2: Use a different structure. What about a balanced BST? Python doesn't have one in the standard library.

Option 3: Use a sorted array (list) but batch operations. Not applicable here since we need individual add calls.

Option 4: Use a dictionary mapping lo to hi, plus a sorted list of los for binary search. Insertion into the sorted list is still O(n).

Option 5: Use a Treap or similar BST implemented in Python. Each operation is O(log n) expected.

Option 6: Use a skip list.

Actually, let me reconsider the performance. 60,000 inserts into a Python list. Each insert involves shifting elements. In CPython, list.insert is implemented in C and shifts a contiguous block of memory. For 60,000 elements, each insert shifts up to 60,000 pointers (8 bytes each = 480KB). 60,000 inserts * average 30,000 shifts * 8 bytes = 14.4 GB of memory movement. At memory bandwidth of ~20 GB/s, that's about 0.7 seconds. Plus the binary search overhead. This might actually be within 5 seconds!

Let me be more precise. Python's list.insert(pos, item) in CPython:
- Allocates new memory (or grows the internal array)
- Memmoves the tail portion
- Inserts the new element

The memmove for 60,000 pointers is 60,000 * 8 = 480KB. This is very fast (microseconds). 60,000 such operations * ~10 microseconds = 600ms. Plus binary search is O(log n) ≈ 17 comparisons.

Actually, I think the list approach is fine. Let me just go with a sorted list.

Wait, but there's another issue. When we merge intervals, we might need to remove multiple intervals. But if the intervals are "small and disjoint", there's no merging needed.

Let me go with a sorted list approach:
- Maintain a list of (lo, hi) tuples, sorted by lo.
- `contains(x)`: binary search to find if x falls in any interval. O(log n).
- `add(lo, hi)`: binary search for position, check neighbors for overlap, merge, insert. O(log n + k) where k is number of overlapping intervals.
- `remove(lo, hi)`: binary search, find all overlapping intervals, split/merge as needed. O(log n + k).
- `total_length()`: maintain a running sum. O(1).
- `intervals()`: return the list. O(n) to copy.
- `__len__()`: return len of list. O(1).

For `contains(x)`:
- Binary search for the interval whose lo <= x < hi.
- Find the rightmost interval with lo <= x (using bisect_right on los).
- Check if that interval's hi > x.

Actually, let me think about `contains` more carefully.
- I have a sorted list of intervals [(lo1, hi1), (lo2, hi2), ...] where lo_i < hi_i and hi_i <= lo_{i+1}.
- For contains(x), I need to find if there exists an interval [lo_i, hi_i) such that lo_i <= x < hi_i.
- Using bisect, I can find the index i such that lo_i is the largest lo <= x. Then check if x < hi_i.

I'll maintain a separate list of just the lo values for binary search, or I can use bisect on the full list.

Actually, I can use `bisect.bisect_right(self._intervals, (x, float('inf')))` - no, that's not quite right because the tuple comparison would work differently.

Better: maintain a list of lo values separately, or use a custom approach.

Let me maintain:
- `self._intervals`: list of (lo, hi) tuples, sorted by lo
- `self._los`: list of just lo values (for binary search)
- `self._total`: running sum of lengths

Actually, I can just use `bisect.bisect_right` on the intervals list with a tuple. Since tuples are compared lexicographically, `bisect_right(self._intervals, (x, float('inf')))` would give the index of the first interval with lo > x (or lo == x and hi > inf, which is impossible). So the interval at index `idx - 1` would have lo <= x. Then I check if x < hi.

Wait, let me be more careful. `bisect_right(self._intervals, (x, float('inf')))`:
- This finds the insertion point for (x, inf) in the sorted list of (lo, hi) tuples.
- Since we're looking for right insertion, it finds the position after all elements <= (x, inf).
- An element (lo, hi) <= (x, inf) iff lo < x or (lo == x and hi <= inf). Since hi is always finite, (lo == x and hi <= inf) is always true. So elements with lo <= x are all <= (x, inf).
- So bisect_right gives the index of the first element with lo > x.
- The element at index (result - 1) has lo <= x.
- Then check if x < hi of that element.

This works! O(log n).

Now for `add(lo, hi)`:
1. If lo >= hi, return.
2. Binary search for the position where lo would be inserted.
3. Check the interval at position-1 (if exists): if its hi > lo, they overlap or touch.
4. Check the interval at position (if exists): if its lo < hi, they overlap or touch.
5. Actually, since intervals are disjoint, at most the immediate neighbors can overlap.

Wait, can [lo, hi) overlap with more than 2 intervals? Since the existing intervals are disjoint and sorted, [lo, hi) can overlap with a contiguous range of intervals. For example, if we have [1,2), [2,3), [3,4), [4,5) and we add [1,5), it overlaps with all 4.

But for the performance requirement, the intervals added are "small and disjoint", so in practice at most 1-2 overlaps.

For the general algorithm:
1. Find the leftmost interval that could overlap: the interval with the largest lo <= hi (or lo < hi since [lo,hi) and [a,b) overlap if a < hi and lo < b).
   Actually, [lo, hi) and [a, b) overlap (or touch, i.e., form a connected interval) iff lo < b and a < hi.
   
2. Find all intervals that overlap or touch [lo, hi).
3. Merge them all into one interval.
4. Remove the old intervals, insert the new one.

For the sorted list, the overlapping intervals form a contiguous range. I can find the start and end of this range.

Start: the first interval with lo < hi (i.e., bisect_left for hi in the los).
End: the last interval with lo >= lo... wait, I need the last interval with lo <= hi... no.

Let me think again. Interval [a, b) overlaps or touches [lo, hi) iff a < hi and lo < b.

The intervals are sorted by lo. The set of intervals with lo < hi is a prefix (up to some index). The set of intervals with b > lo is... hmm, since intervals are disjoint and sorted, b_i <= lo_{i+1}, so if b_i > lo, then all subsequent intervals have lo_{i+1} >= b_i > lo, so they also satisfy lo < b_{i+1}? No, that's not necessarily true. b_{i+1} could be less than lo.

Wait, intervals are disjoint: b_i <= lo_{i+1}. So if b_i > lo, then lo_{i+1} >= b_i > lo, so lo < lo_{i+1} < b_{i+1}. Yes! So if interval i has b_i > lo, then all intervals after it also have b > lo.

So the overlapping intervals are:
- Start: first interval with a < hi (i.e., lo_i < hi)
- End: last interval with b > lo (i.e., hi_i > lo)

Since the intervals are sorted by lo, the start is found by bisect_right on los for hi (first lo >= hi, so start is that index - 1... wait).

Let me use a cleaner approach:
- Find `start_idx`: the first index where lo_i < hi. Since los are sorted, this is `bisect_left(self._los, hi)` gives the first lo >= hi, so the last lo < hi is at index `start_idx - 1`... no wait, I want the first one where lo < hi. Since los are sorted, all los from 0 to (bisect_left(hi) - 1) are < hi. So start_idx = 0 (or the first one that's relevant).

Hmm, actually I want to find the range of intervals that overlap with [lo, hi).

The condition for overlap/touch: lo_i < hi AND lo < hi_i.

Since los are sorted:
- The set of intervals with lo_i < hi is a prefix: indices 0 to bisect_left(los, hi) - 1.
- The set of intervals with hi_i > lo: since intervals are disjoint, hi_i <= lo_{i+1}. So hi_i > lo implies lo_{i+1} >= hi_i > lo, which implies lo_{i+1} < hi (if lo_{i+1} < hi). Hmm, this is getting circular.

Let me just do it more simply. Since intervals are disjoint and sorted:
- The overlapping intervals form a contiguous subsequence.
- I can find the left boundary: the first interval with hi > lo (or equivalently, since intervals are disjoint, the first interval with lo < hi AND hi > lo).

Actually, let me just use a simpler approach:
1. Find the index `i` where lo would be inserted (bisect_right on los for lo, or bisect_left).
2. The candidate intervals are from some start to some end around position i.
3. Since intervals are disjoint, I just need to check:
   - The interval at i-1 (if it exists): does it overlap with [lo, hi)? Check if hi_{i-1} > lo.
   - The interval at i (if it exists): does it overlap with [lo, hi)? Check if lo_i < hi.
   
   But wait, can there be more than 2 overlapping intervals? Yes! If [lo, hi) is large and there are many small intervals inside it.

So I need to find the full range. Let me do:
- `right_idx`: the first index where lo_i >= hi. All intervals before this have lo < hi. Found by `bisect_left(self._los, hi)`.
- `left_idx`: I need the first interval with hi_i > lo. Since intervals are disjoint, hi_i <= lo_{i+1}. The intervals are in order, and I need to find the first one where hi > lo.

Hmm, this is getting complex. Let me think differently.

Since the intervals are disjoint and sorted, I can find:
- The rightmost interval that starts before hi: `r = bisect_right(self._los, hi - epsilon)` ... no, I can't use epsilon with floats.

Let me use: `r = bisect_left(self._los, hi)` gives the first index where lo >= hi. So intervals 0 to r-1 all have lo < hi.

Now, among these, which ones have hi_i > lo? Since intervals are disjoint, if interval j has hi_j > lo, then for all k > j, lo_k >= hi_j > lo, and we need hi_k > lo. But hi_k > lo_{k-1+1}... no, hi_k >= lo_k (since it's a valid interval) and lo_k > lo (since lo_k >= hi_j > lo). So hi_k >= lo_k > lo. Yes! So if interval j has hi_j > lo, then all intervals j, j+1, j+2, ... up to r-1 also have hi > lo.

So I need to find the first interval in [0, r-1] with hi > lo. Since intervals are disjoint, hi_j <= lo_{j+1}. I need the first j where hi_j > lo.

This is like a binary search on the hi values, but hi values aren't necessarily sorted... wait, actually they ARE sorted! Since intervals are disjoint and sorted by lo: lo_0 < hi_0 <= lo_1 < hi_1 <= lo_2 < ... So both los and his are sorted!

So I can binary search on the his to find the first interval with hi > lo. That's `bisect_right(self._his, lo)` which gives the first index where hi > lo.

So:
- `left = bisect_right(self._his, lo)` — first interval with hi > lo
- `right = bisect_left(self._los, hi)` — first interval with lo >= hi (so intervals 0 to right-1 have lo < hi)

The overlapping/touching intervals are from index `left` to `right - 1`.

Then I merge them all with [lo, hi):
- new_lo = min(lo, self._intervals[left][0])
- new_hi = max(hi, self._intervals[right-1][1])
- Remove intervals[left:right]
- Insert (new_lo, new_hi) at position left

This is O(log n) for the searches + O(k) for the removal/insertion where k is the number of overlapping intervals.

For `remove(lo, hi)`:
1. If lo >= hi, return.
2. Find the range of intervals that overlap with [lo, hi).
3. For intervals completely inside [lo, hi), remove them.
4. For intervals partially overlapping, split them.
5. Update the list.

Let me think about remove more carefully.
- Find `left = bisect_right(self._his, lo)` — first interval with hi > lo
- Find `right = bisect_left(self._los, hi)` — first interval with lo >= hi

Intervals from `left` to `right-1` overlap with [lo, hi).

For each such interval [a, b):
- If a >= lo and b <= hi: completely inside, remove it.
- If a < lo: the part [a, lo) remains.
- If b > hi: the part [hi, b) remains.
- If a < lo and b > hi: two parts remain: [a, lo) and [hi, b).

After processing, I replace the range [left, right) with the remaining parts.

Let me code this up.

For performance, I'll maintain:
- `self._intervals`: list of (lo, hi) tuples
- `self._los`: list of lo values
- `self._his`: list of hi values
- `self._total`: sum of lengths

Actually, maintaining separate los and his lists is a bit of overhead but helps with binary search. Alternatively, I can just use the intervals list and do binary search on it.

Let me just use the intervals list and do binary search manually or with bisect.

For `contains(x)`:
```python
import bisect

def contains(self, x):
    # Find the rightmost interval with lo <= x
    idx = bisect.bisect_right(self._los, x) - 1
    if idx >= 0 and x < self._his[idx]:
        return True
    return False
```

Wait, I need to maintain `_los` and `_his` as separate lists. Let me do that.

Actually, for 60,000 elements, maintaining 3 lists (intervals, los, his) is fine. The insertion/deletion cost is the same for all three.

Let me write the full solution:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted by lo
        self._los = []  # list of lo values
        self._his = []  # list of hi values
        self._total = 0  # total length

    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find the range of overlapping intervals
        # left: first interval with hi > lo
        left = bisect.bisect_right(self._his, lo)
        # right: first interval with lo >= hi
        right = bisect.bisect_left(self._los, hi)
        
        if left == right:
            # No overlap, just insert
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._his.insert(left, hi)
            self._total += hi - lo
            return
        
        # Merge all overlapping intervals with [lo, hi)
        new_lo = lo
        if left < len(self._intervals):
            new_lo = min(new_lo, self._intervals[left][0])
        new_hi = hi
        if right - 1 < len(self._intervals):
            new_hi = max(new_hi, self._intervals[right - 1][1])
        
        # Remove the overlapping intervals
        removed_length = sum(self._his[i] - self._los[i] for i in range(left, right))
        self._intervals[left:right] = [(new_lo, new_hi)]
        self._los[left:right] = [new_lo]
        self._his[left:right] = [new_hi]
        self._total += (new_hi - new_lo) - removed_length

    def remove(self, lo, hi):
        if lo >= hi:
            return
        # Find the range of overlapping intervals
        left = bisect.bisect_right(self._his, lo)
        right = bisect.bisect_left(self._los, hi)
        
        if left == right:
            return
        
        new_segments = []
        
        for i in range(left, right):
            a, b = self._intervals[i]
            # a < hi and b > lo (overlap or touch)
            if a < lo:
                new_segments.append((a, lo))
            if b > hi:
                new_segments.append((hi, b))
        
        removed_length = sum(self._his[i] - self._los[i] for i in range(left, right))
        new_length = sum(b - a for a, b in new_segments)
        
        self._intervals[left:right] = new_segments
        self._los[left:right] = [a for a, b in new_segments]
        self._his[left:right] = [b for a, b in new_segments]
        self._total += new_length - removed_length

    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        if idx >= 0 and x < self._his[idx]:
            return True
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Wait, I need to double-check the merge logic in `add`. When I do `self._intervals[left:right] = [(new_lo, new_hi)]`, this replaces the slice with a single element. That's correct.

But wait, `new_lo = min(lo, self._intervals[left][0])`. Since `left` is the first interval with hi > lo, and intervals are disjoint, `self._intervals[left][0]` could be less than lo (if the interval starts before lo). Yes, that's the case where the interval partially overlaps from the left.

Similarly, `new_hi = max(hi, self._intervals[right-1][1])`. The last overlapping interval could extend beyond hi.

Let me trace through an example:
- Existing: [(1, 3), (4, 6)]
- Add [2, 5]:
  - left = bisect_right([3, 6], 2) = 0 (first hi > 2 is at index 0, hi=3>2)
  - right = bisect_left([1, 4], 5) = 1 (first lo >= 5 is at index 1, lo=4<5, so... wait)
  
  Hmm, bisect_left([1, 4], 5) = 2 (both 1 and 4 are < 5). So right = 2.
  
  - new_lo = min(2, intervals[0][0]) = min(2, 1) = 1
  - new_hi = max(5, intervals[1][1]) = max(5, 6) = 6
  - Remove intervals[0:2] = [(1,3), (4,6)]
  - Insert (1, 6) at position 0
  - Result: [(1, 6)] ✓

Another example:
- Existing: [(1, 3), (5, 7)]
- Add [3, 5]:
  - left = bisect_right([3, 7], 3) = 1 (first hi > 3 is at index 1, hi=7>3)
  - right = bisect_left([1, 5], 5) = 1 (first lo >= 5 is at index 1, lo=5>=5)
  
  Wait, bisect_left([1, 5], 5) = 1. So right = 1.
  
  - left == right, so no overlap. Just insert at position 1.
  - Result: [(1, 3), (3, 5), (5, 7)]
  
  But [1,3) and [3,5) touch! They should be merged into [1,5).

Hmm, this is the touching case. [1,3) and [3,5) form [1,5). My code doesn't handle this!

The issue is that when intervals touch (hi of one == lo of next), they should be merged. Let me fix the overlap condition.

Two intervals [a, b) and [c, d) should be merged if b >= c AND a <= d (they overlap or touch). In terms of my binary search:
- An existing interval [a, b) overlaps or touches [lo, hi) iff a < hi AND b > lo. But if b == lo, they touch: [a, lo) and [lo, hi) form [a, hi). Similarly if a == hi, they touch.

Wait, [a, b) and [lo, hi) touch if b == lo or a == hi. In that case, they form a single interval. So the condition for "overlap or touch" is: a <= hi AND b >= lo.

So:
- left: first interval with b >= lo, i.e., bisect_left(self._his, lo)
- right: first interval with a > hi, i.e., bisect_right(self._los, hi)

Let me re-check:
- Existing: [(1, 3), (5, 7)]
- Add [3, 5]:
  - left = bisect_left([3, 7], 3) = 0 (first hi >= 3 is at index 0, hi=3>=3)
  - right = bisect_right([1, 5], 5) = 2 (first lo > 5... 1<5, 5 is not > 5, so bisect_right gives 2)
  
  - new_lo = min(3, intervals[0][0]) = min(3, 1) = 1
  - new_hi = max(5, intervals[1][1]) = max(5, 7) = 7
  - Result: [(1, 7)] ✓

Another check:
- Existing: [(1, 3), (4, 6)]
- Add [3, 4]:
  - left = bisect_left([3, 6], 3) = 0
  - right = bisect_right([1, 4], 4) = 2 (1 < 4, 4 is not > 4, so bisect_right = 2)
  
  - new_lo = min(3, 1) = 1
  - new_hi = max(4, 6) = 6
  - Result: [(1, 6)] ✓

Good. Now let me fix the `contains` method too:
- contains(x) should check if x is in [lo, hi) for any interval.
- idx = bisect_right(self._los, x) - 1 gives the rightmost interval with lo <= x.
- Check if x < self._his[idx].

This is correct because if lo_i <= x, and intervals are disjoint, then either x < hi_i (contained) or x >= hi_i (not in this interval, and since intervals are disjoint, x can't be in any later interval because lo_{i+1} >= hi_i > x... wait, no. If x >= hi_i, then x could still be in interval i+1 if lo_{i+1} <= x < hi_{i+1}. But lo_{i+1} >= hi_i, so if x >= hi_i, x could be >= lo_{i+1}.

Hmm wait, let me reconsider. If lo_i <= x and x >= hi_i, then since lo_{i+1} >= hi_i, we have x >= hi_i <= lo_{i+1}. So x could be < lo_{i+1} (not in interval i+1) or x >= lo_{i+1} (possibly in interval i+1).

But wait, I used bisect_right(self._los, x) - 1. This gives the largest index where lo <= x. If that interval doesn't contain x (x >= hi), could x be in a later interval? Yes! For example, intervals [(1, 2), (3, 4)], x = 3. bisect_right([1, 3], 3) = 2, idx = 1. Check: x < hi[1] = 4? Yes! So contains(3) = True. Correct.

What about x = 2? bisect_right([1, 3], 2) = 1, idx = 0. Check: 2 < hi[0] = 2? No. So contains(2) = False. Correct.

What about x = 2.5? bisect_right([1, 3], 2.5) = 1, idx = 0. Check: 2.5 < 2? No. So contains(2.5) = False. Correct.

What about x = 100? bisect_right([1, 3], 100) = 2, idx = 1. Check: 100 < 4? No. False. Correct.

What about x = 0? bisect_right([1, 3], 0) = 0, idx = -1. Return False. Correct.

OK so `contains` is correct.

Now, the performance concern. With 60,000 adds of disjoint intervals:
- Each add: 2 binary searches (O(log n)) + 1 list insert (O(n) for shifting).
- Total: 60,000 * (log(60000) + 60000/2) ≈ 60,000 * (17 + 30,000) ≈ 1.8 billion element moves.

In CPython, list insert at position i in a list of length n involves:
- PyMem_Malloc or PyList resize
- memmove of (n-i) pointers
- Setting the new element

For n=60,000, memmove of ~30,000 pointers (240KB) is very fast (~0.01ms). 60,000 such operations: 60,000 * 0.01ms = 600ms. Plus the binary searches: 60,000 * 17 comparisons = ~1 million comparisons. Total well under 5 seconds.

Actually, I realize I'm maintaining 3 lists (intervals, los, his). Each insert requires 3 list operations. That triples the work but still fine.

Let me also consider: when no overlap, `left == right`, and I do:
```python
self._intervals.insert(left, (lo, hi))
self._los.insert(left, lo)
self._his.insert(left, hi)
```

This is 3 O(n) insertions. For 60,000 such operations, total is 3 * 60,000 * 60,000/2 = 5.4 billion pointer moves. At ~10GB/s memory bandwidth, that's ~0.5 seconds. Should be fine.

Actually, I realize I can optimize by not maintaining separate los and his lists. I can just use the intervals list and do binary search on it. But bisect on a list of tuples compares by first element then second, which is what I want for lo comparison.

For `bisect_left(self._intervals, (hi,))` — no, this would compare (lo, hi) with (hi,) which would fail for tuple length mismatch... actually in Python, (1, 2) > (1,) is True (shorter tuple is "less than"). So `bisect_left(self._intervals, (hi, float('-inf')))` would find the first interval where lo > hi or (lo == hi and -inf > ...). Hmm, this gets complicated.

Actually, let me just use the separate lists. It's cleaner and the performance is fine.

Wait, actually there's a subtlety. Let me re-examine `bisect_right(self._his, lo)`.

`self._his` is the list of hi values. But are they sorted? Yes! Because intervals are disjoint and sorted by lo: lo_0 < hi_0 <= lo_1 < hi_1 <= lo_2 < ... So hi_0 < hi_1 < hi_2 < ... (strictly increasing since lo_{i+1} >= hi_i and hi_{i+1} > lo_{i+1} >= hi_i, so hi_{i+1} > hi_i).

Wait, is hi strictly increasing? hi_0 <= lo_1 < hi_1. So hi_1 > lo_1 >= hi_0, meaning hi_1 > hi_0 (since hi_1 > lo_1 and lo_1 >= hi_0). Actually, lo_1 >= hi_0, and hi_1 > lo_1, so hi_1 > hi_0. Yes, strictly increasing.

Similarly, los are strictly increasing (since lo_{i+1} >= hi_i > lo_i).

Great, so both los and his are strictly sorted.

Let me finalize the code. I think it's correct. Let me also make sure `intervals()` returns a copy (since the problem says "all intervals as (lo, hi) tuples, sorted, disjoint, and with touching intervals merged"). Since our internal representation already maintains merged intervals, just returning a copy is fine.

One more thing: the problem says "Keep the original values (no rounding)." Since we're just storing and comparing the values without modifying them, this is satisfied.

Let me write the final code:

```python
import bisect


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []
        self._los: list = []
        self._his: list = []
        self._total: float = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi)

        if left == right:
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._his.insert(left, hi)
            self._total += hi - lo
            return

        new_lo = lo
        if left < len(self._intervals) and self._intervals[left][0] < new_lo:
            new_lo = self._intervals[left][0]
        new_hi = hi
        if right - 1 < len(self._intervals) and self._intervals[right - 1][1] > new_hi:
            new_hi = self._intervals[right - 1][1]

        removed = sum(self._his[i] - self._los[i] for i in range(left, right))
        self._intervals[left:right] = [(new_lo, new_hi)]
        self._los[left:right] = [new_lo]
        self._his[left:right] = [new_hi]
        self._total += (new_hi - new_lo) - removed

    def remove(self, lo, hi):
        if lo >= hi:
            return
        left = bisect.bisect_left(self._his, lo)
        right = bisect.bisect_right(self._los, hi)

        if left == right:
            return

        new_segments = []
        for i in range(left, right):
            a, b = self._intervals[i]
            if a < lo:
                new_segments.append((a, lo))
            if b > hi:
                new_segments.append((hi, b))

        removed = sum(self._his[i] - self._los[i] for i in range(left, right))
        added = sum(b - a for a, b in new_segments)

        self._intervals[left:right] = new_segments
        self._los[left:right] = [a for a, _ in new_segments]
        self._his[left:right] = [b for _, b in new_segments]
        self._total += added - removed

    def contains(self, x):
        idx = bisect.bisect_right(self._los, x) - 1
        return idx >= 0 and x < self._his[idx]

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Let me trace through a few more examples to verify:

Example 1:
- add(1, 5): left=bisect_left([], 1)=0, right=bisect_right([], 5)=0. left==right. Insert (1,5) at 0. → [(1,5)]
- add(3, 7): left=bisect_left([5], 3)=0, right=bisect_right([1], 7)=1. left!=right. new_lo=min(3,1)=1, new_hi=max(7,5)=7. Remove [(1,5)], insert (1,7). → [(1,7)]
- add(10, 12): left=bisect_left([7], 10)=1, right=bisect_right([1], 12)=1. left==right. Insert (10,12) at 1. → [(1,7),(10,12)]
- contains(7): bisect_right([1,10], 7)=1, idx=0. 7 < 7? No. → False ✓
- contains(6.9): bisect_right([1,10], 6.9)=1, idx=0. 6.9 < 7? Yes. → True ✓
- contains(7.5): bisect_right([1,10], 7.5)=1, idx=0. 7.5 < 7? No. → False ✓
- total_length(): 6+2=8 ✓

Example 2:
- add(1, 10): → [(1,10)]
- remove(3, 7): left=bisect_left([10], 3)=0, right=bisect_right([1], 7)=1. left!=right.
  - a=1, b=10. a<3: add (1,3). b>7: add (7,10).
  - new_segments = [(1,3), (7,10)]
  - removed = 9, added = 2+3=5
  - → [(1,3), (7,10)]
  - total = 9 - 9 + 5 = 5 ✓
- contains(3): bisect_right([1,7], 3)=1, idx=0. 3 < 3? No. → False ✓
- contains(7): bisect_right([1,7], 7)=1, idx=0. 7 < 3? No. → False ✓
- contains(7.5): bisect_right([1,7], 7.5)=2, idx=1. 7.5 < 10? Yes. → True ✓

Example 3 (touching):
- add(1, 3): → [(1,3)]
- add(3, 5): left=bisect_left([3], 3)=0, right=bisect_right([1], 5)=1. left!=right.
  - new_lo=min(3,1)=1, new_hi=max(5,3)=5
  - → [(1,5)]
  - total = 2-2+4 = 4 ✓

Looks good!

One concern: in `remove`, when `new_segments` is empty (all intervals are completely contained in [lo, hi)), the slice assignment with an empty list correctly removes them.

Let me also handle the edge case where lo or hi might be a float and the comparison works correctly. Since we're just doing numerical comparisons, this should be fine.

I think the solution is complete and correct. Let me write the final version.
