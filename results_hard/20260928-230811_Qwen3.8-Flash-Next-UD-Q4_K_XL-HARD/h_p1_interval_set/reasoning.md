Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
1. `add(lo, hi)` - add interval, merging overlapping/touching intervals
2. `remove(lo, hi)` - remove interval, possibly splitting
3. `contains(x)` - O(log n) lookup
4. `total_length()` - sum of lengths
5. `intervals()` - sorted list of (lo, hi) tuples, merged touching intervals
6. `__len__()` - number of intervals

For O(log n) contains, I'll use `bisect` module. I'll store intervals as a sorted list of tuples `(lo, hi)`.

For `contains(x)`: Use bisect_right to find the insertion point of `(x, ...)` in the list. The interval that could contain x is the one just before the insertion point. Specifically, `bisect_right(self._intervals, (x, float('inf')))` gives the index where x would be inserted. The candidate interval is at index `i-1`. We check if `lo <= x < hi` for that interval.

Actually, let me think more carefully. If intervals are `[(1,5), (7,10), (12,15)]` and we search for `x=3`:
- `bisect_right(self._intervals, (3, float('inf')))` would return 1 (since (3, inf) > (1,5) but < (7,10))
- So candidate is at index 0: (1,5). Check 1 <= 3 < 5 → True.

For x=5:
- `bisect_right(self._intervals, (5, float('inf')))` returns 1 (since (5, inf) > (1,5) but < (7,10))
- Candidate is at index 0: (1,5). Check 1 <= 5 < 5 → False. Correct!

For x=6:
- `bisect_right(self._intervals, (6, float('inf')))` returns 1
- Candidate is at index 0: (1,5). Check 1 <= 6 < 5 → False. Correct!

For x=7:
- `bisect_right(self._intervals, (7, float('inf')))` returns 2 (since (7, inf) > (7,10)? No, (7, inf) > (7,10) since inf > 10)
- Wait, tuple comparison: (7, inf) vs (7, 10): first elements equal, second: inf > 10, so (7, inf) > (7, 10). So bisect_right returns 2.
- Candidate is at index 1: (7,10). Check 7 <= 7 < 10 → True. Correct!

This approach works.

For `add(lo, hi)`:
- Find all intervals that overlap or touch [lo, hi)
- An interval (a, b) overlaps or touches [lo, hi) if a <= hi and b >= lo (for touching, we also want a <= hi and b >= lo; for half-open [lo,hi), touching means lo == b or hi == a)
- Actually for touching: [1,3) and [3,5) should merge. So condition is: interval (a,b) touches or overlaps [lo,hi) if a <= hi and b >= lo. Wait, that's the standard overlap condition. But for half-open, [1,3) and [3,5) - do they "overlap"? a=1, b=3, lo=3, hi=5: a <= hi (1<=5) and b >= lo (3>=3) → True. Good, they'd merge.

- Find the range of intervals to merge. Use bisect to find the leftmost interval that could overlap and the rightmost.
- Left: find first interval where hi > lo (i.e., hi > lo means it could overlap). Actually, find first interval where `b > lo` (where b is the hi of the interval). Since intervals are sorted by lo, we can use bisect_left on the list.

Let me think about this differently. I'll store intervals as a list sorted by lo. For add:
1. Use bisect to find the insertion point for (lo, ...) - but I need to find intervals that overlap with [lo, hi).
2. An interval (a, b) overlaps [lo, hi) iff a < hi and b > lo. For touching: a <= hi and b >= lo. Actually for [1,3) and [3,5), a=1, b=3, lo=3, hi=5. a < hi (1<5) and b >= lo (3>=3). With strict: a < hi and b > lo → 1<5 and 3>3 → False. So I need >= for the touching case.

Let me use: overlap_or_touch condition is `a <= hi and b >= lo`. But wait, [1,3) and [3,5): a=1, b=3, new=[3,5). a <= hi: 1 <= 5 ✓. b >= lo: 3 >= 3 ✓. So they merge. Good.

[1,3) and [4,5): a=1, b=3, new=[4,5). a <= hi: 1 <= 5 ✓. b >= lo: 3 >= 4 ✗. So they don't merge. Good.

For finding which intervals to merge:
- Left boundary: first interval with b > lo (since if b <= lo, it doesn't touch). Actually b >= lo. Since intervals are sorted by lo (first element), and we know b > a for each interval, I can use bisect to find the range.

Actually, let me just use bisect to find where to insert, then scan left and right.

Better approach:
- Use `bisect.bisect_left` to find the position where (lo, ...) would be inserted.
- The intervals that could overlap are from some position to the left and some position to the right.
- Scan left from the insertion point to find intervals with b >= lo.
- Scan right from the insertion point to find intervals with a <= hi.

For 60,000 add calls, if each add involves scanning many intervals, it could be slow. But if intervals are disjoint and we add them in random order, each add typically affects at most one or two existing intervals. The merging step is O(k) where k is the number of intervals being merged.

Actually, the main concern is: for 60,000 small disjoint intervals added in random order, each add is O(log n) for the bisect plus O(1) for the merge (since they're disjoint). Then 200,000 contains calls at O(log n) each. Total: 60,000 * log(60,000) + 200,000 * log(60,000) ≈ 60,000*16 + 200,000*16 ≈ 4.2 million operations. Should be well under 5 seconds in Python.

Let me code this up:

```python
from bisect import bisect_left, bisect_right, insort

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find intervals that overlap or touch [lo, hi)
        # An interval (a, b) overlaps/touches [lo, hi) iff a <= hi and b >= lo
        # Find leftmost interval with b >= lo
        # Since intervals sorted by a (lo), and a < b, we know:
        #   if a > hi, no further intervals overlap (they're all to the right)
        #   we need to scan left for intervals where b >= lo
        
        intervals = self._intervals
        # Find insertion point based on lo
        # bisect_left on the list treating lo as key
        # We want to find first interval with a >= lo... but we also need intervals with a < lo but b >= lo
        
        # Use bisect to find position
        # Find the first index where lo > a (i.e., first interval that could contain lo)
        # Actually let's use a different approach:
        # pos = bisect_right(intervals, (hi, float('inf'))) gives first index with a > hi (no overlap)
        # We scan left from pos-1 to find first interval with b < lo (no overlap)
        
        # Hmm, let me think again. intervals are sorted by first element.
        # pos = bisect_left(intervals, (lo,)) gives first index where a >= lo
        # But intervals before pos could still overlap if their b > lo (or >= lo for touching)
        
        # Let me find the range:
        # Right boundary: first interval where a > hi (strictly beyond). bisect_right(intervals, (hi, float('inf')))
        # Left boundary: scan left from pos until b < lo
        
        pos = bisect_left(intervals, (lo, float('-inf')))  # first with a >= lo (approximate)
        # Actually bisect_left(intervals, (lo,)) would work since (lo, -inf) < (lo, x) for any x
        
        # Let's find right boundary: first interval with a > hi
        right = bisect_right(intervals, (hi, float('inf')))
        
        # Scan left from pos to find first with b >= lo
        left = pos
        while left > 0 and intervals[left - 1][1] >= lo:
            left -= 1
        
        # Actually, I should also check pos itself and rightward
        # Merge all intervals from left to right-1 with [lo, hi)
        new_lo = lo
        new_hi = hi
        for i in range(left, right):
            a, b = intervals[i]
            if a > hi:  # shouldn't happen given right boundary
                break
            if b < lo:  # shouldn't happen given left boundary
                continue
            # These intervals are already merged by the boundary conditions
            # But let me be safe:
            new_lo = min(new_lo, a)
            new_hi = max(new_hi, b)
        
        # Replace intervals[left:right] with [(new_lo, new_hi)]
        intervals[left:right] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        # Find intervals that overlap with [lo, hi)
        # Interval (a, b) overlaps [lo, hi) iff a < hi and b > lo
        # Find range of overlapping intervals
        left = bisect_left(intervals, (lo, float('-inf')))
        # Scan left for intervals that start before lo but extend into [lo, hi)
        while left > 0 and intervals[left - 1][1] > lo:
            left -= 1
        
        right = bisect_right(intervals, (hi, float('-inf')))
        # Hmm, this isn't quite right. Let me think differently.
        
        # Find first interval with a >= hi (right boundary, exclusive)
        right = bisect_left(intervals, (hi,))
        # Actually for half-open: [a,b) overlaps [lo,hi) iff a < hi and b > lo
        # So intervals with a >= hi don't overlap. bisect_left(intervals, (hi,)) gives first with a >= hi. Good.
        
        # For left: intervals with b <= lo don't overlap. Since sorted by a, scan left.
        left = bisect_right(intervals, (lo,))  # first with a > lo
        # But intervals with a == lo also overlap (if b > lo, which is always true). So use bisect_left.
        left = bisect_left(intervals, (lo,))
        while left > 0 and intervals[left - 1][1] > lo:
            left -= 1
        
        # Process intervals from left to right-1
        new_intervals = []
        for i in range(left, right):
            a, b = intervals[i]
            # (a, b) overlaps [lo, hi)
            # Keep parts outside [lo, hi)
            if a < lo:
                new_intervals.append((a, lo))
            if b > hi:
                new_intervals.append((hi, b))
        
        intervals[left:right] = new_intervals
    
    def contains(self, x):
        intervals = self._intervals
        # Find the interval that could contain x
        # bisect_right with (x, inf) gives first index with a > x (or a == x and b > inf, impossible)
        # Actually bisect_right(intervals, (x, float('inf'))) gives index after all tuples <= (x, inf)
        # A tuple (a, b) <= (x, inf) iff a < x or (a == x and b <= inf, always true)
        # So this gives first index with a > x
        i = bisect_right(intervals, (x, float('inf')))
        if i == 0:
            return False
        a, b = intervals[i - 1]
        return a <= x < b
    
    def total_length(self):
        return sum(b - a for a, b in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, let me double-check the `add` method. The touching condition: [1,3) + [3,5) should merge to [1,5).

In add(3, 5) when intervals = [(1, 3)]:
- pos = bisect_left([(1,3)], (3, -inf)) = 1 (since (1,3) < (3,-inf))
- right = bisect_right([(1,3)], (5, inf)) = 1 (since (1,3) < (5,inf))
- Scan left: left = 1, check intervals[0] = (1,3), b=3 >= lo=3? Yes! left = 0.
- Check intervals[-1]: stop (left == 0).
- left=0, right=1. Process interval (1,3): new_lo = min(3,1)=1, new_hi = max(5,3)=5.
- Result: [(1,5)]. ✓

What about add(4, 6) when intervals = [(1,3)]:
- pos = bisect_left([(1,3)], (4,-inf)) = 1
- right = bisect_right([(1,3)], (6,inf)) = 1
- Scan left: left=1, check intervals[0]=(1,3), b=3 >= lo=4? No. left stays 1.
- left=1, right=1. No intervals to merge.
- Insert (4,6) at position 1. Result: [(1,3),(4,6)]. ✓

What about add(0, 2) when intervals = [(3,5)]:
- pos = bisect_left([(3,5)], (0,-inf)) = 0
- right = bisect_right([(3,5)], (2,inf)) = 0 (since (3,5) > (2,inf)? (3,5) vs (2,inf): 3>2, so yes, (3,5) > (2,inf))
- Scan left: left=0, already at 0.
- left=0, right=0. No intervals to merge.
- Insert (0,2) at position 0. Result: [(0,2),(3,5)]. ✓

What about add(2, 4) when intervals = [(1,3),(5,7)]:
- pos = bisect_left([(1,3),(5,7)], (2,-inf)) = 1 (since (1,3)<(2,-inf) but (5,7)>(2,-inf))
- right = bisect_right([(1,3),(5,7)], (4,inf)) = 1 (since (1,3)<(4,inf), (5,7)>(4,inf))
- Scan left: left=1, check intervals[0]=(1,3), b=3>=lo=2? Yes! left=0.
- Check left>0: No. Stop.
- left=0, right=1. Process (1,3): new_lo=min(2,1)=1, new_hi=max(4,3)=4.
- Result: [(1,4),(5,7)]. ✓

What about add(3, 6) when intervals = [(1,3),(5,7)]:
- pos = bisect_left([(1,3),(5,7)], (3,-inf)) = 1
- right = bisect_right([(1,3),(5,7)], (6,inf)) = 2 (both < (6,inf))
- Scan left: left=1, check intervals[0]=(1,3), b=3>=lo=3? Yes! left=0.
- left=0, right=2. Process (1,3): new_lo=1, new_hi=max(6,3)=6. Process (5,7): new_lo=min(1,5)=1, new_hi=max(6,7)=7.
- Result: [(1,7)]. ✓

Now let me check `remove(2, 5)` when intervals = [(0,7)]:
- left = bisect_left([(0,7)], (2,)) = 1 (since (0,7) < (2,)) Wait, tuple comparison: (0,7) vs (2,). First element: 0 < 2, so (0,7) < (2,). So bisect_left returns 1.
- Scan left: left=1, check intervals[0]=(0,7), b=7 > lo=2? Yes! left=0.
- right = bisect_left([(0,7)], (5,)) = 1 (since (0,7) < (5,))
- Process i=0: (0,7). a=0 < lo=2: append (0,2). b=7 > hi=5: append (5,7).
- Result: [(0,2),(5,7)]. ✓

`remove(0, 3)` when intervals = [(0,7)]:
- left = bisect_left([(0,7)], (0,)) = 0 (since (0,7) >= (0,)... wait, (0,7) vs (0,): first elements equal (0==0), second: 7 vs nothing. In Python, (0,7) > (0,) because (0,) has fewer elements and is "less than" (0,7). So bisect_left returns 1? Let me check.

Actually in Python, tuple comparison: (0, 7) vs (0,): compare element by element. 0 == 0. Then (0,7) has more elements, so (0,7) > (0,). So bisect_left([(0,7)], (0,)) returns 1.

Hmm that's a problem. Let me use `(lo, float('-inf'))` instead.

- left = bisect_left([(0,7)], (0, float('-inf'))) = 0 (since (0,7) > (0,-inf))
- Scan left: left=0, stop.
- right = bisect_left([(0,7)], (3,)) = 1 (since (0,7) < (3,))
- Process i=0: (0,7). a=0 < lo=0? No. b=7 > hi=3? Yes: append (3,7).
- Result: [(3,7)]. ✓

Let me redo remove with proper bisect:
```python
left = bisect_left(intervals, (lo, float('-inf')))
```
This finds first interval with a >= lo (or a == lo and b >= -inf, which is always true). So it finds first interval with a >= lo.

Then scan left: intervals with a < lo but b > lo (they overlap [lo,hi) from the left).

For right: I want first interval with a >= hi. `bisect_left(intervals, (hi,))` - but this has the same tuple issue. Let me use `bisect_left(intervals, (hi, float('-inf')))`. This gives first interval with a >= hi (since (hi, -inf) < (hi, anything)). Intervals with a >= hi don't overlap [lo, hi) since their start is at or after hi.

Wait, but what about an interval with a == hi? [a, b) where a == hi. This doesn't overlap [lo, hi) since hi is not included. So using `bisect_left(intervals, (hi, float('-inf')))` for the right boundary is correct.

Actually wait - I used `bisect_left(intervals, (hi,))` earlier. Let me reconsider. In Python, (5,) vs (5, 7): compare first elements: 5==5. Then (5,) has length 1, (5,7) has length 2. In Python, shorter tuple is less if all its elements match. So (5,) < (5, 7). So bisect_left with key (5,) would return the index of the first element >= (5,), which could be an element starting with 5. That's not what I want for the right boundary.

Let me use `bisect_left(intervals, (hi, float('-inf')))` for right boundary. This gives first element where a > hi, or a == hi and b >= -inf (always true), so first with a >= hi. Good.

Actually wait: bisect_left finds the leftmost position where the key could be inserted. (hi, -inf) vs (hi, b): -inf < b, so (hi, -inf) < (hi, b). So bisect_left would return position before (hi, b), meaning the right boundary includes intervals with a == hi. But we don't want those (they don't overlap).

Hmm, let me reconsider. I want the first interval that does NOT overlap. An interval (a,b) does not overlap [lo, hi) if b <= lo or a >= hi. Since sorted by a, all intervals from some point rightward have a >= hi. The first such index is bisect_left(intervals, (hi, ...)).

For bisect_left(intervals, (hi, float('-inf'))): this returns first index where intervals[i] >= (hi, -inf). Since any (hi, b) with b > -inf satisfies this, it returns first index with a >= hi. That's correct for the right boundary (exclusive).

For the left boundary in remove: I want the first interval that could overlap. An interval (a,b) overlaps [lo, hi) if a < hi AND b > lo. Since sorted by a, all intervals with a >= hi are beyond. For intervals with a < hi, I need b > lo. Going leftward, once I find b <= lo, I can stop.

So: start with bisect_left(intervals, (hi, float('-inf'))) as right (exclusive). For left: start at bisect_left(intervals, (lo, float('-inf'))) which gives first with a >= lo. Then scan left while intervals[left-1][1] > lo.

Actually, I realize there's a subtle issue. Let me reconsider the left scan for remove:

After `left = bisect_left(intervals, (lo, float('-inf')))`:
- All intervals[i] for i >= left have a >= lo. They all have a < hi (since i < right and right is first with a >= hi). So they all overlap (since a >= lo means... wait, a >= lo and a < hi means the interval starts within or at the boundary of [lo, hi). Since b > a >= lo, b > lo, so yes they overlap).

- For intervals[i] with i < left: a < lo. They overlap only if b > lo. Scan left until b <= lo.

OK this all looks correct. Let me also handle the edge case where `lo == hi` in remove (we return early).

One more thing: in the `add` method, I should use `float('-inf')` consistently. Let me also make sure the initial `pos` calculation is right.

Let me rewrite add more carefully:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    
    # Right boundary: first interval with a >= hi (doesn't overlap)
    right = bisect_left(intervals, (hi, float('-inf')))
    
    # Left boundary: scan left from pos for intervals with b >= lo
    # Start at bisect_left for (lo, -inf) - first with a >= lo
    left = bisect_left(intervals, (lo, float('-inf')))
    
    # Also need to check: the interval at position left-1 might have b >= lo (touching)
    # Actually, any interval at position < left has a < lo.
    # It overlaps/touches [lo, hi) if b >= lo (for touching) or b > lo (for overlapping).
    # For touching [1,3) + [3,5): interval (1,3), lo=3. b=3 >= lo=3. So we need >=.
    while left > 0 and intervals[left - 1][1] >= lo:
        left -= 1
    
    # Also check rightward: intervals at position right might have... no, they have a >= hi, so they don't overlap.
    # But what about interval at position right-1? It has a < hi. Does it always overlap?
    # a < hi and we need b >= lo for touching. If b < lo, it doesn't touch.
    # But since intervals are sorted by a, and a < hi, and the interval has b > a... 
    # Actually b > a >= 0... no, b could be less than lo if a < lo too.
    # Wait, if i < left, we already excluded those. If left <= i < right, then a >= lo (since i >= left which is first with a >= lo after scan)
    # Hmm no, after scanning left, left could be less than the original bisect position.
    # Let me reconsider.
    
    # After the scan, all intervals[i] for left <= i < right satisfy:
    #   - They're in range [left, right), so a >= original_left_start OR b >= lo (from left scan)
    #   - a < hi (from right boundary)
    #   We need to verify they actually overlap/touch [lo, hi).
    #   From left scan: if i < original_bisect_pos, then b >= lo (that's why we included them). And a < lo < hi. So they overlap/touch.
    #   If i >= original_bisect_pos (and i < right), then a >= lo. And a < hi. So [a,b) overlaps [lo,hi) since a >= lo and a < hi.
    #   So all intervals in [left, right) overlap or touch [lo, hi). ✓
    
    new_lo = lo
    new_hi = hi
    for i in range(left, right):
        a, b = intervals[i]
        if a < new_lo:
            new_lo = a
        if b > new_hi:
            new_hi = b
    
    intervals[left:right] = [(new_lo, new_hi)]
```

Wait, I also need to handle the case where there are intervals in [left, right) that have b < lo. Can that happen?

If i >= original bisect position (first with a >= lo), then a >= lo. Since b > a (intervals are valid), b > lo. So no.
If i < original bisect position, it was included because b >= lo. So b >= lo. Could b == lo? That means the interval is (a, lo) with a < lo. This touches [lo, hi) at point lo. For touching, we should merge. ✓

OK looks good. But wait, what about intervals in [left, right) where a >= hi? That can't happen since right is the first with a >= hi.

And intervals where b < lo? As shown above, can't happen.

I think the logic is correct. Let me also handle the edge case where right could be beyond the list length - but bisect handles that naturally.

Let me also think about whether the `add` scanning could be O(n) in worst case. If we add an interval that covers all existing intervals, we scan all of them - O(n). But the problem says "60,000 add() calls of small disjoint intervals in random order" - since they're disjoint and small, each add will merge at most 1-2 existing intervals. The scanning to find the boundaries is O(log n) with bisect, and the merge is O(1) amortized (since we're removing as many as we add).

Actually, the left scan `while left > 0 and intervals[left-1][1] >= lo` could potentially scan many intervals in worst case (e.g., adding a huge interval that covers everything). But for the stated performance test with small disjoint intervals, it's fine.

For the performance requirement, the key bottleneck would be the `intervals[left:right] = [(new_lo, new_hi)]` operation which is O(n) due to list shifting. For 60,000 inserts in random order, this is O(n²) total = 3.6 billion element moves... that might be slow.

Hmm, but actually for small disjoint intervals added in random order, each add inserts one element and the list grows by 1. The shift cost is O(n) per insert, so total is O(n²). For n=60,000, that's about 1.8 billion element moves. In CPython, list operations are implemented in C and are quite fast, so this should still be manageable. Let's estimate: 1.8 billion pointer moves at maybe 10 bytes each... actually CPython lists store pointers (8 bytes on 64-bit). Moving 1.8B * 8 = 14.4 GB... that might be tight.

Wait, actually it's n/2 average shift per insert: 60000 * 60000 / 2 = 1.8 billion. In CPython's optimized C memmove, this should run at maybe 10-20 GB/s, so about 1-2 seconds. Should be OK.

Actually, let me reconsider. For 60,000 inserts, the total number of element moves is sum(i for i in range(60000)) ≈ 60000²/2 = 1.8 * 10⁹. At ~10 billion elements/second for C memmove, that's 0.18 seconds. Fine.

For 200,000 contains calls: 200,000 * O(log(60000)) ≈ 200,000 * 17 ≈ 3.4 million comparisons. Each comparison is a tuple comparison in Python, maybe 100ns each. So 0.34 seconds. Fine.

Total well under 5 seconds. Good.

Let me finalize the code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    __slots__ = ('_intervals',)

    def __init__(self):
        self._intervals = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        iv = self._intervals
        right = bisect_left(iv, (hi, float('-inf')))
        left = bisect_left(iv, (lo, float('-inf')))
        while left > 0 and iv[left - 1][1] >= lo:
            left -= 1
        new_lo = lo
        new_hi = hi
        for i in range(left, right):
            a, b = iv[i]
            if a < new_lo:
                new_lo = a
            if b > new_hi:
                new_hi = b
        iv[left:right] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        iv = self._intervals
        right = bisect_left(iv, (hi, float('-inf')))
        left = bisect_left(iv, (lo, float('-inf')))
        while left > 0 and iv[left - 1][1] > lo:
            left -= 1
        new_parts = []
        for i in range(left, right):
            a, b = iv[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        iv[left:right] = new_parts

    def contains(self, x):
        iv = self._intervals
        i = bisect_right(iv, (x, float('inf')))
        if i == 0:
            return False
        return iv[i - 1][0] <= x < iv[i - 1][1]

    def total_length(self):
        return sum(b - a for a, b in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Let me trace through a few more edge cases:

1. remove(2, 3) when intervals = [(1, 2), (3, 5)]:
   - right = bisect_left([(1,2),(3,5)], (3, -inf)) = 1 (since (3,5) >= (3,-inf))
   - left = bisect_left([(1,2),(3,5)], (2, -inf)) = 1 (since (1,2) < (2,-inf), (3,5) > (2,-inf))
   - Scan left: left=1, iv[0]=(1,2), b=2 > lo=2? No. left stays 1.
   - Process range [1, 1): empty. new_parts = [].
   - Result: [(1,2),(3,5)] unchanged. ✓ (Nothing to remove since [2,3) doesn't intersect either interval)

2. remove(2, 4) when intervals = [(1, 5)]:
   - right = bisect_left([(1,5)], (4, -inf)) = 1
   - left = bisect_left([(1,5)], (2, -inf)) = 1
   - Scan left: iv[0]=(1,5), b=5 > lo=2? Yes! left=0.
   - Process i=0: a=1 < lo=2: append (1,2). b=5 > hi=4: append (4,5).
   - Result: [(1,2),(4,5)]. ✓

3. contains(5) when intervals = [(1, 5)]:
   - bisect_right([(1,5)], (5, inf)): (1,5) < (5,inf)? Yes. So returns 1.
   - iv[0] = (1,5). 1 <= 5 < 5? No. Return False. ✓

4. contains(1) when intervals = [(1, 5)]:
   - bisect_right([(1,5)], (1, inf)): (1,5) < (1,inf)? 1==1, 5<inf. Yes. Returns 1.
   - iv[0] = (1,5). 1 <= 1 < 5? Yes. Return True. ✓

5. Empty set: contains(0) → bisect_right([], ...) = 0, return False. ✓

6. add(1, 3) then add(3, 5) → should give [(1, 5)]:
   After add(1,3): iv = [(1,3)]
   add(3,5): right = bisect_left([(1,3)], (5,-inf)) = 1. left = bisect_left([(1,3)], (3,-inf)) = 1.
   Scan left: iv[0]=(1,3), b=3 >= lo=3? Yes! left=0.
   Process i=0: new_lo=min(3,1)=1, new_hi=max(5,3)=5.
   Result: [(1,5)]. ✓

Looks solid. Let me also add the touching check for add: should intervals that merely touch (like [1,3) and [3,5)) be merged? The problem says "touching intervals merged ([1,3) + [3,5) gives [(1, 5)])". So yes, our >= in the add left scan is correct.

For remove, the condition is > (strict) because [1,5) remove [5,7) shouldn't change anything (the boundary point 5 is not in [1,5)). Let's verify:
- remove(5, 7) when iv = [(1,5)]:
  - right = bisect_left([(1,5)], (7,-inf)) = 1
  - left = bisect_left([(1,5)], (5,-inf)) = 1 (since (1,5) < (5,-inf))
  - Scan left: iv[0]=(1,5), b=5 > lo=5? No. left=1.
  - Range [1,1): empty. No change. ✓

I'm satisfied with the implementation. Let me write the final version.
