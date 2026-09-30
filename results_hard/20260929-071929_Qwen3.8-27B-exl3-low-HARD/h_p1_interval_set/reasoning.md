Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) with efficient operations.

Key requirements:
1. `add(lo, hi)` - add interval, merge overlapping/touching ones
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, disjoint, merged list
6. `__len__()` - number of intervals
7. Performance: 60k adds + 200k contains must be < 5 seconds

For O(log n) contains, I need a data structure that supports efficient lookup. Options:
- Sorted list with bisect - O(n) for insertions but O(log n) for contains
- Balanced BST - O(log n) for both
- Sorted list of interval starts with bisect

Wait, the performance requirement is 60,000 add() calls followed by 200,000 contains() calls. If I use a sorted list:
- Each add could be O(n) in the worst case (for insertion and merging)
- 60,000 adds with a sorted list would be O(n^2) = 60,000^2 = 3.6 billion operations - too slow

Actually wait, let me reconsider. If the intervals are small and disjoint, each add only affects a small neighborhood. But in the worst case with a sorted list, insertion is O(n) due to list shifting.

Let me think about using a different approach:

Option 1: Use a sorted list (Python list) with bisect. For 60k adds, each add involves:
- Finding the position: O(log n)
- Checking neighbors for merging: O(1)
- Inserting: O(n) due to list shifting

So 60k adds would be O(n^2) = 3.6 * 10^9 operations. That's way too slow.

Option 2: Use a balanced BST. Python doesn't have one in stdlib. But I could implement one or use a different approach.

Option 3: Use a sorted list but batch operations? No, the API requires individual add calls.

Option 4: Use a different data structure. What about using a dict or some other structure?

Actually, let me reconsider. Python's list insertion is O(n) in the worst case, but for 60,000 elements, each insertion moves at most 60,000 elements. That's 60,000 * 60,000 / 2 = 1.8 * 10^9 element moves. In Python, this would be way too slow.

What about using a treap or skip list? Or what about using `bisect` with a list but being smarter?

Actually, let me think about this differently. The key insight is that we need O(log n) for contains. For add, we need reasonable performance for 60k operations.

Let me think about a treap-based approach or a sorted structure.

Actually, what about using a different approach: maintain a sorted list of interval starts, and for each start, store the corresponding end. Then:
- contains(x): find the rightmost interval start <= x, check if x < end. O(log n) with bisect.
- add(lo, hi): find where to insert, check neighbors for merging. O(n) for the list insertion though.

Hmm, the problem is the O(n) insertion into a Python list.

Wait, let me reconsider the performance constraint. 60,000 adds of small disjoint intervals. If they're disjoint, each add only needs to:
1. Find position: O(log n)
2. Check if it overlaps with left neighbor: O(1)
3. Check if it overlaps with right neighbor: O(1)
4. Insert: O(n) due to list shifting

The list shifting is the bottleneck. For 60,000 inserts into a list of average size 30,000, that's about 60,000 * 30,000 = 1.8 * 10^9 element moves. In CPython, list element moves are very fast (just pointer moves in C), so maybe this is actually feasible? Let me think...

Actually, `list.insert` in CPython is implemented in C and does `memmove`, which is very fast. For 60,000 elements, each memmove is moving about 60,000 * 8 bytes = 480KB. That's very fast in terms of memory bandwidth. The total would be 60,000 * 480KB = ~28GB of memory moved. At ~10GB/s, that's about 3 seconds. Hmm, that might be borderline.

But wait, the intervals are described as "small disjoint intervals in random order". If they're truly disjoint, then each add just inserts one new interval (no merging needed), so we're just doing 60,000 inserts into a growing list.

Actually, let me reconsider. `memmove` of 480KB is extremely fast - probably under 1 microsecond. So 60,000 * 1μs = 60ms for the memmoves. Plus the bisect and neighbor checks. This should be well under 5 seconds.

Let me just go with a sorted list approach using bisect. It should be fast enough.

Let me design the data structure:
- `_intervals`: a list of (lo, hi) tuples, sorted by lo, disjoint, non-touching (merged).

For `contains(x)`:
- Use bisect to find the rightmost interval with lo <= x
- Check if x < hi for that interval
- O(log n)

For `add(lo, hi)`:
- If lo >= hi, return
- Find position using bisect on the list of starts
- Check the interval at position-1 (left neighbor) and position (right neighbor) for overlap/touching
- Merge as needed
- Insert the new/merged interval

For `remove(lo, hi)`:
- If lo >= hi, return
- Find all intervals that overlap with [lo, hi)
- For each, either remove it entirely or split it
- Update the list

Let me code this up:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi), sorted by lo, disjoint, non-touching
    
    def _starts(self):
        # We need to bisect on the lo values
        # bisect on a list of tuples bisects on the first element by default
        # Actually, bisect_left on a list of tuples compares tuples
        # We want to find based on lo only
        pass
    
    def contains(self, x):
        # Find rightmost interval with lo <= x
        # bisect_right on starts gives us the index of the first start > x
        # So the candidate is at index - 1
        n = len(self._intervals)
        # We need to find the rightmost i such that _intervals[i][0] <= x
        # bisect_right on a list of (lo, hi) tuples with key x...
        # Actually, bisect works on the list directly. If we bisect_right with (x, float('inf')),
        # we get the position after all intervals with lo == x.
        # The candidate interval is at that position - 1.
        pos = bisect_right(self._intervals, (x, float('inf')))
        if pos > 0:
            lo, hi = self._intervals[pos - 1]
            if lo <= x < hi:
                return True
        return False
```

Wait, there's a subtlety. `bisect_right(self._intervals, (x, float('inf')))` - this compares tuples. Since our intervals are (lo, hi), comparing (x, inf) with (lo, hi):
- If x > lo, then (x, inf) > (lo, hi) regardless of hi
- If x == lo, then (x, inf) > (lo, hi) since inf > hi (assuming hi is finite)
- If x < lo, then (x, inf) < (lo, hi)

So `bisect_right` with (x, float('inf')) gives us the index of the first interval with lo > x. The candidate is at pos - 1.

But wait, what if hi can be infinity? The problem says "real numbers" so I'll assume finite.

Actually, let me use a different approach. I'll maintain a separate list of starts for bisecting, or I'll use a key function.

In Python 3.10+, bisect supports a `key` parameter. But to be safe, let me just use the tuple comparison trick.

Actually, for `bisect_right(self._intervals, (x, float('inf')))`:
- This finds the rightmost position where (x, inf) could be inserted to keep the list sorted
- Since all our intervals have finite hi, (x, inf) > (x, any_finite_number)
- So this gives us the position after all intervals with lo == x
- The interval at pos-1 has lo <= x, and it's the rightmost such interval

This works! Let me verify:
- If intervals are [(1,3), (5,7)] and x = 2:
  - bisect_right([(1,3),(5,7)], (2, inf)) → 1 (since (2,inf) > (1,3) but < (5,7))
  - pos-1 = 0, interval is (1,3), 1 <= 2 < 3 → True ✓
- If x = 4:
  - bisect_right([(1,3),(5,7)], (4, inf)) → 1
  - pos-1 = 0, interval is (1,3), 1 <= 4 < 3 → False ✓
- If x = 5:
  - bisect_right([(1,3),(5,7)], (5, inf)) → 2 (since (5,inf) > (5,7))
  - pos-1 = 1, interval is (5,7), 5 <= 5 < 7 → True ✓

For `add(lo, hi)`:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    # Find position: first interval with lo > hi (these might need merging)
    # Actually, we need to find all intervals that overlap or touch [lo, hi)
    # An interval (a, b) overlaps or touches [lo, hi) if a < hi and b > lo
    # Find the leftmost interval that could overlap: its hi > lo
    # Find the rightmost interval that could overlap: its lo < hi
    
    # First, find the rightmost interval with lo <= lo (i.e., lo of the interval <= our lo)
    # That's bisect_right(intervals, (lo, inf)) - 1
    # Actually, let me think differently.
    
    # Find the first interval with start >= lo
    pos = bisect_left(intervals, (lo,))
    # Wait, (lo,) is a 1-tuple, can't compare with 2-tuples directly in a useful way
    # Let me use (lo, float('-inf')) for bisect_left to find first interval with lo >= our lo
    # Actually (lo, -inf) < (lo, any_finite) so bisect_left would give the first position where lo >= our lo
    
    # Hmm, let me think more carefully.
    # I want to find the first interval with start >= lo.
    # bisect_left(intervals, (lo, float('-inf'))) gives the first position where interval >= (lo, -inf)
    # Since all intervals have finite hi > lo, (lo, -inf) < (lo, hi) for any valid interval
    # So this gives the first interval with start >= lo. But if there's an interval with start == lo,
    # it would be included.
    
    # Actually, I think the cleanest approach is:
    # 1. Find the index of the first interval with start >= lo (call it i)
    # 2. Check interval at i-1 (if exists) for overlap/touch
    # 3. Check intervals starting from i for overlap/touch
    # 4. Merge all overlapping/touching intervals with [lo, hi)
    
    i = bisect_left(intervals, (lo, float('-inf')))
    
    # Check left neighbor
    new_lo, new_hi = lo, hi
    start_idx = i
    
    if i > 0:
        l_lo, l_hi = intervals[i - 1]
        if l_hi >= lo:  # overlaps or touches
            new_lo = min(new_lo, l_lo)
            new_hi = max(new_hi, l_hi)
            start_idx = i - 1
    
    # Check right neighbors
    j = i
    while j < len(intervals) and intervals[j][0] <= new_hi:
        r_lo, r_hi = intervals[j]
        new_hi = max(new_hi, r_hi)
        j += 1
    
    # Replace intervals[start_idx:j] with (new_lo, new_hi)
    intervals[start_idx:j] = [(new_lo, new_hi)]
```

Wait, I need to be more careful. Let me reconsider.

When adding [lo, hi):
- Find all existing intervals that overlap or touch [lo, hi)
- An existing interval (a, b) overlaps or touches [lo, hi) if a < hi and b > lo (i.e., they share at least a point, or they touch: b == lo or a == hi)

Actually for half-open intervals [a, b) and [lo, hi):
- They overlap if a < hi and lo < b
- They touch if b == lo or a == hi
- They should be merged if a <= hi and lo <= b (overlap or touch)

Wait, [a, b) and [lo, hi) should be merged if they overlap or are adjacent:
- Overlap: a < hi and lo < b
- Adjacent: b == lo or a == hi
- Combined: a <= hi and lo <= b

Let me verify: [1, 3) and [3, 5) → a=1, b=3, lo=3, hi=5. a <= hi (1 <= 5) and lo <= b (3 <= 3) → merge. ✓
[1, 3) and [4, 5) → a=1, b=3, lo=4, hi=5. a <= hi (1 <= 5) and lo <= b (4 <= 3)? No. → don't merge. ✓
[1, 3) and [2, 5) → a=1, b=3, lo=2, hi=5. a <= hi (1 <= 5) and lo <= b (2 <= 3) → merge. ✓

Good. So the condition for merging is: a <= hi and lo <= b.

Now for the algorithm:
1. Find the first interval with start >= lo. Call this index `i`.
   - Use `bisect_left(intervals, (lo, float('-inf')))`
   - Wait, this might not work correctly. Let me think again.
   - `bisect_left` finds the leftmost position where the element could be inserted.
   - We're comparing (lo, -inf) with (a, b) tuples.
   - (lo, -inf) < (a, b) iff lo < a or (lo == a and -inf < b), which is always true when lo == a (since b is finite).
   - So bisect_left gives us the first interval with a > lo, or the first interval with a == lo.
   - Actually: (lo, -inf) < (a, b) when lo < a, or when lo == a (since -inf < b always).
   - And (lo, -inf) >= (a, b) when lo > a, or when lo == a and -inf >= b (impossible).
   - So bisect_left(intervals, (lo, -inf)) gives the first index where a >= lo.
   
   Hmm wait, that's not quite right either. Let me be more precise.
   
   bisect_left(a, x) returns the leftmost index i such that a[i] >= x.
   
   We want the first interval with a >= lo.
   (lo, -inf) vs (a, b): 
   - If a > lo: (a, b) > (lo, -inf) ✓
   - If a == lo: (a, b) = (lo, b) > (lo, -inf) since b > -inf ✓
   - If a < lo: (a, b) < (lo, -inf) ✓
   
   So bisect_left(intervals, (lo, float('-inf'))) gives the first index where a >= lo. 

2. The left neighbor is at index i-1 (if i > 0). Check if it should be merged.
3. Starting from index i, check consecutive intervals for merging.

Let me also handle the edge case where the left neighbor should be merged:
- If i > 0 and intervals[i-1][1] >= lo (i.e., the left neighbor's hi >= our lo), then merge.
  - Wait, the condition is: intervals[i-1][0] <= hi and lo <= intervals[i-1][1]
  - Since intervals[i-1][0] < lo (because i is the first with a >= lo, so i-1 has a < lo), the first condition is always true.
  - So we just need: lo <= intervals[i-1][1], i.e., intervals[i-1][1] >= lo.

For the right side:
- Starting from index i (or i-1 if we merged with left), check intervals[j][0] <= new_hi.
- If so, merge and continue.

Let me also think about `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi) (strict overlap, not just touching)
- An interval (a, b) overlaps with [lo, hi) if a < hi and lo < b
- For each such interval:
  - If lo <= a and b <= hi: remove entirely
  - If a < lo and b <= hi: shrink to (a, lo)
  - If a < lo and b > hi: split into (a, lo) and (hi, b)
  - If a >= lo and b > hi: shrink to (hi, b)

Let me code this up properly:

```python
from bisect import bisect_left, bisect_right

class IntervalSet:
    def __init__(self):
        self._intervals = []
    
    def contains(self, x):
        intervals = self._intervals
        pos = bisect_right(intervals, (x, float('inf')))
        if pos > 0:
            lo, hi = intervals[pos - 1]
            return lo <= x < hi
        return False
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, (lo, float('-inf')))
        
        new_lo, new_hi = lo, hi
        start = i
        
        # Check left neighbor
        if i > 0 and intervals[i - 1][1] >= lo:
            new_lo = intervals[i - 1][0]
            new_hi = max(new_hi, intervals[i - 1][1])
            start = i - 1
        
        # Check right neighbors
        j = i
        while j < len(intervals) and intervals[j][0] <= new_hi:
            new_hi = max(new_hi, intervals[j][1])
            j += 1
        
        intervals[start:j] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        # Find first interval that could overlap: its hi > lo
        # Since intervals are sorted by lo, the first one with hi > lo could be anywhere
        # But since they're disjoint and sorted, the first one with lo < hi is what we want
        # Actually, we need intervals where a < hi and b > lo
        # The first such interval: since they're sorted by a, we need a < hi
        # bisect_left for (hi, -inf) gives first interval with a >= hi
        # So intervals before that have a < hi
        # Among those, we need b > lo
        
        # Find the first interval with a < hi
        end = bisect_left(intervals, (hi, float('-inf')))
        # Now we need to find the first among [0, end) with b > lo
        # Since intervals are disjoint and sorted, if interval k has b > lo, then all previous
        # intervals also have... no, that's not necessarily true.
        # Actually, since intervals are disjoint and sorted by lo, and they don't overlap:
        # interval[k][1] <= interval[k+1][0]
        # So if interval[k][1] <= lo, then interval[k][0] < interval[k][1] <= lo < hi
        # The first interval with b > lo: we can binary search? Not directly since b is not sorted.
        # But since intervals are disjoint and sorted, b is also increasing!
        # interval[k][1] <= interval[k+1][0] < interval[k+1][1]
        # So b values are strictly increasing. We can binary search for the first b > lo.
        
        # Actually, let's just use a linear scan from the left.
        # The first interval that could overlap is the first one with b > lo.
        # Since b values are increasing, we can binary search.
        
        # Hmm, but we don't have a separate array of b values. Let me just find the start
        # by checking from the beginning of the relevant range.
        
        # Actually, for the left boundary: we need the first interval with b > lo.
        # Since the intervals are disjoint and sorted, we can use:
        # The interval at index i has b > lo iff... it's not trivial to binary search without a separate array.
        
        # Let me just use a different approach: find the first interval with a < hi (we have that as `end`),
        # then linearly scan backwards from end-1 to find the first with b > lo.
        # But that could be O(n) in the worst case.
        
        # Alternative: since b values are increasing (because intervals are disjoint and sorted),
        # we can binary search for the first b > lo.
        # But we'd need to access b values. We can use a helper.
        
        # For simplicity and since remove is not the performance-critical operation,
        # let me just do a linear scan.
        
        # Find start: first interval with b > lo
        start = 0
        while start < end and intervals[start][1] <= lo:
            start += 1
        
        # Now intervals[start:end] are the ones that overlap with [lo, hi)
        # (they have a < hi and b > lo)
        
        new_intervals = []
        for k in range(start, end):
            a, b = intervals[k]
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))
        
        intervals[start:end] = new_intervals
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, I realize there might be an issue with the `remove` method. Let me trace through an example:
- Intervals: [(1, 10)]
- Remove [3, 7)
- end = bisect_left([(1,10)], (7, -inf)) = 1 (since (1,10) < (7,-inf)? No! (1,10) vs (7,-inf): 1 < 7, so (1,10) < (7,-inf). So bisect_left returns 1.)
- start: intervals[0][1] = 10 > 3, so start = 0
- k=0: a=1, b=10. a < lo (1 < 3) → add (1, 3). b > hi (10 > 7) → add (7, 10).
- new_intervals = [(1,3), (7,10)]
- intervals[0:1] = [(1,3), (7,10)]
- Result: [(1,3), (7,10)] ✓

Another example:
- Intervals: [(1, 5), (10, 15)]
- Remove [3, 12)
- end = bisect_left([(1,5),(10,15)], (12, -inf)) = 2 (both (1,5) and (10,15) < (12,-inf))
- start: intervals[0][1] = 5 > 3, so start = 0
- k=0: a=1, b=5. a < 3 → add (1,3). b > 12? No.
- k=1: a=10, b=15. a < 3? No. b > 12 → add (12,15).
- new_intervals = [(1,3), (12,15)]
- intervals[0:2] = [(1,3), (12,15)]
- Result: [(1,3), (12,15)] ✓

Another example:
- Intervals: [(1, 5), (10, 15)]
- Remove [0, 20)
- end = bisect_left([(1,5),(10,15)], (20, -inf)) = 2
- start: intervals[0][1] = 5 > 0, so start = 0
- k=0: a=1, b=5. a < 0? No. b > 20? No.
- k=1: a=10, b=15. a < 0? No. b > 20? No.
- new_intervals = []
- intervals[0:2] = []
- Result: [] ✓

Looks good. But the linear scan for `start` in remove could be slow. Let me think if there's a better way.

Actually, since the b values are strictly increasing (because intervals are disjoint and sorted: interval[i][1] <= interval[i+1][0] < interval[i+1][1]), I can binary search for the first b > lo.

But I don't have a separate array of b values. I could create one, but that adds complexity. For the performance requirements (the critical path is add + contains), the linear scan in remove should be fine.

Actually wait, let me reconsider. The b values are increasing but not necessarily strictly. If we have [1,3) and [3,5), they would be merged into [1,5). So in our representation, b values are strictly increasing: interval[i][1] < interval[i+1][0] < interval[i+1][1]. So yes, b is strictly increasing.

I could do a binary search on b values. Let me use a helper:

```python
# Binary search for first index where intervals[i][1] > lo
lo_bound = 0
hi_bound = end
while lo_bound < hi_bound:
    mid = (lo_bound + hi_bound) // 2
    if intervals[mid][1] <= lo:
        lo_bound = mid + 1
    else:
        hi_bound = mid
start = lo_bound
```

This is O(log n). Let me include this.

Now let me also think about the `intervals()` method. The requirement says "touching intervals merged". Since we always merge touching intervals in `add`, our internal representation already has them merged. So `intervals()` just returns a copy.

Let me also double-check the `contains` method:
- `bisect_right(intervals, (x, float('inf')))` 
- This finds the rightmost position where (x, inf) fits, i.e., the first position where interval > (x, inf).
- (x, inf) > (a, b) when x > a, or (x == a and inf > b), which is always true when x == a.
- (x, inf) < (a, b) when x < a.
- So bisect_right gives the first index where a > x.
- The candidate is at pos - 1, which has a <= x.
- We check if x < b for that interval.

This is correct.

Now let me think about edge cases:
- What if lo or hi are numpy floats or Decimal? The problem says "real numbers" and "bounds may be ints or floats", so I'll assume standard Python int/float.
- What about negative infinity or positive infinity? The problem says "real numbers" so I'll assume finite.

Let me also think about the performance of the `add` method more carefully:
- `bisect_left`: O(log n)
- Checking left neighbor: O(1)
- While loop for right neighbors: In the worst case, this could be O(n) if we're merging many intervals. But for "small disjoint intervals", each add only merges 0 or 1 neighbors on the right, so it's O(1) amortized.
- `intervals[start:j] = [(new_lo, new_hi)]`: This is O(n) due to list shifting.

For 60,000 adds of small disjoint intervals:
- Each add: O(log n) for bisect + O(1) for neighbor checks + O(n) for list insertion
- Total: O(n * log n + n^2) where n goes from 0 to 60,000
- The n^2 term dominates: sum of i for i=1 to 60000 ≈ 60000^2/2 = 1.8 * 10^9

But as I discussed earlier, the list insertion is a C-level memmove, which is very fast. Let me estimate:
- Average list size: 30,000
- Each element is a tuple of 2 floats/ints: about 16 bytes for the tuple + 16 bytes for the references = ~32 bytes per element? Actually in CPython, a list stores pointers (8 bytes each on 64-bit). So moving 30,000 elements = 240,000 bytes = 240KB.
- memmove of 240KB takes about 10-20 nanoseconds per byte? No, that's too fast. Realistically, memmove is about 10-50 GB/s, so 240KB takes about 5-25 microseconds.
- 60,000 * 15μs = 900ms ≈ 1 second.

Plus the Python-level overhead of bisect, neighbor checks, etc. This should be well under 5 seconds.

For the 200,000 contains calls:
- Each is O(log n) = O(log 60000) ≈ 17 comparisons
- 200,000 * 17 = 3.4 million comparisons
- In Python, each comparison of tuples takes maybe 100ns, so 3.4M * 100ns = 340ms.
- Plus the bisect overhead. Should be well under 1 second.

Total should be well under 5 seconds. 

Let me finalize the code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    def __init__(self):
        self._intervals = []

    def contains(self, x):
        intervals = self._intervals
        pos = bisect_right(intervals, (x, float('inf')))
        if pos > 0:
            lo, hi = intervals[pos - 1]
            return lo <= x < hi
        return False

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        i = bisect_left(intervals, (lo, float('-inf')))

        new_lo, new_hi = lo, hi
        start = i

        # Check left neighbor
        if i > 0 and intervals[i - 1][1] >= lo:
            new_lo = intervals[i - 1][0]
            if intervals[i - 1][1] > new_hi:
                new_hi = intervals[i - 1][1]
            start = i - 1

        # Check right neighbors
        j = i
        while j < len(intervals) and intervals[j][0] <= new_hi:
            if intervals[j][1] > new_hi:
                new_hi = intervals[j][1]
            j += 1

        intervals[start:j] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals

        # Find the range of intervals that overlap with [lo, hi)
        # An interval (a, b) overlaps if a < hi and b > lo
        # Find end: first interval with a >= hi
        end = bisect_left(intervals, (hi, float('-inf')))

        # Find start: first interval with b > lo
        # Since b values are strictly increasing, binary search
        lo_bound, hi_bound = 0, end
        while lo_bound < hi_bound:
            mid = (lo_bound + hi_bound) // 2
            if intervals[mid][1] <= lo:
                lo_bound = mid + 1
            else:
                hi_bound = mid
        start = lo_bound

        if start >= end:
            return

        # Build new intervals for the overlapping range
        new_parts = []
        for k in range(start, end):
            a, b = intervals[k]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))

        intervals[start:end] = new_parts

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Wait, I need to double-check the `add` method's handling of the left neighbor. When I check `intervals[i - 1][1] >= lo`, this means the left neighbor's end is at or after our start. Since the left neighbor's start is < lo (by definition of i), and its end >= lo, they overlap or touch.

But I also need to make sure the left neighbor's start <= hi (for the merge condition a <= hi and lo <= b). Since the left neighbor's start < lo < hi, this is always true. So the condition `intervals[i - 1][1] >= lo` is sufficient.

Let me also verify: after merging with the left neighbor, could the merged interval now overlap with another interval to the left? No, because our intervals are disjoint and non-touching, so the interval at i-2 has end <= intervals[i-1][start], which is < lo. So no further merging is needed to the left.

I think the code is correct. Let me also add a docstring and make sure everything is clean.

One more thought: the `intervals()` method should return a list of tuples. Since our internal representation is already a list of tuples, `list(self._intervals)` creates a shallow copy, which is fine since tuples are immutable.

Let me also consider: what if someone passes the same object as lo and hi but they're mutable? The problem says "real numbers" so I'll assume they're immutable (int or float).

I'm satisfied with the solution. Let me write the final version.
