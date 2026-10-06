The user wants a class `IntervalSet` that stores disjoint half-open intervals [lo, hi). Let me think about the implementation carefully.

Key requirements:
1. `add(lo, hi)` - add interval, ignore if lo >= hi
2. `remove(lo, hi)` - remove interval, may split, ignore if lo >= hi
3. `contains(x)` - O(log n), check if x is in the set
4. `total_length()` - sum of all interval lengths
5. `intervals()` - sorted, disjoint, merged touching intervals
6. `__len__()` - number of intervals
7. Performance: contains() O(log n), 60k adds + 200k contains well under 5 seconds

For O(log n) contains, I need a sorted structure. In Python standard library, I can use `bisect` for binary search. I'll maintain a sorted list of intervals.

Let me think about the data structure:
- Store intervals as a sorted list of tuples [(lo1, hi1), (lo2, hi2), ...] where lo1 < hi1 <= lo2 < hi2 <= ...
- Use `bisect` module for O(log n) lookups

For `contains(x)`:
- Use bisect to find where x would be inserted among the lo values
- Check the interval just before and the one at that position

For `add(lo, hi)`:
- Find overlapping intervals, merge them, insert back
- Need to handle merging with touching intervals

For `remove(lo, hi)`:
- Find overlapping intervals, split/trim them

Let me think about the sorted list approach. I'll maintain a list of intervals sorted by `lo`. For contains, I can use bisect on the list of `lo` values.

Actually, let me store intervals as a list of tuples sorted by `lo`. For bisect, I'll need to search by `lo` values.

For `contains(x)`:
- Use `bisect_right` on lo values to find the insertion point
- The interval that could contain x is at index `pos - 1` (the last interval whose lo <= x)
- Check if x < intervals[pos-1][1] (since interval is [lo, hi))

Wait, let me be more careful. If intervals are [(1,3), (5,7)], and x = 4:
- bisect_right on lo values [1, 5] for x=4 gives pos=1
- Check interval at pos-1 = 0: (1,3), x < 3? No, 4 >= 3, so not contained.
- Correct!

If x = 2:
- bisect_right on [1, 5] for x=2 gives pos=1
- Check interval at pos-1 = 0: (1,3), 2 < 3? Yes, contained. Correct!

If x = 5:
- bisect_right on [1, 5] for x=5 gives pos=2
- Check interval at pos-1 = 1: (5,7), 5 < 7? Yes, contained. Correct!

If x = 1:
- bisect_right on [1, 5] for x=1 gives pos=1
- Check interval at pos-1 = 0: (1,3), 1 < 3? Yes, contained. Correct!

If x = 3:
- bisect_right on [1, 5] for x=3 gives pos=1
- Check interval at pos-1 = 0: (1,3), 3 < 3? No, not contained. Correct (half-open)!

If x = 0:
- bisect_right on [1, 5] for x=0 gives pos=0
- pos-1 = -1, no interval to check. Correct!

If x = 7:
- bisect_right on [1, 5] for x=7 gives pos=2
- Check interval at pos-1 = 1: (5,7), 7 < 7? No, not contained. Correct!

Great, the logic works. I'll use `bisect.bisect_right` on a separate list of lo values for O(log n) lookup.

Actually, for performance with 60k adds, I need to be careful. Each add() does bisect to find position, then may need to merge intervals (remove multiple, insert one). That's O(n) worst case per add due to list insert/delete, but amortized it should be fine for 60k operations.

Wait, with 60k small disjoint intervals, each add just finds its position and inserts. The list insert is O(n) due to shifting, so total is O(n^2) = 60k^2 = 3.6 billion operations... that might be too slow.

Hmm, actually 60k inserts into a Python list - each insert shifts elements. Total shifts = sum from 1 to 60k ≈ 1.8 billion. In CPython, list operations are implemented in C so this should be fast. 60k inserts with average shift of 30k elements... Let's see, 60000 * 30000 = 1.8e9 pointer moves. At maybe 1-2 ns per pointer move in C, that's about 1.8-3.6 seconds. Might be tight.

Actually, I think for 60k elements this is fine in practice. Python's list insertion in C is very fast - moving pointers. Let me just go with a sorted list and bisect.

Let me think about the implementation more carefully:

```python
import bisect

class IntervalSet:
    def __init__(self):
        # intervals stored as sorted list of [lo, hi] (mutable for efficiency)
        self._ivs = []  # list of [lo, hi], sorted by lo, disjoint, non-touching
        self._los = []  # parallel list of lo values for bisect
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find all overlapping or touching intervals
        # Touching means hi == other_lo or other_hi == lo
        # Overlapping means lo < other_hi and hi > other_lo
        # Together: lo <= other_hi and hi >= other_lo (touching or overlapping)
        
        # Find the leftmost interval that could overlap or touch
        # An interval [a, b] overlaps/touches [lo, hi] if a < hi and b > lo
        # But for touching: a == hi or b == lo also count
        # So condition: a <= hi and b >= lo... wait no
        # [1,3) + [3,5) should merge. Here other_hi = 3 == our lo = 3. 
        # [1,3) + [2,5) should merge. Here a=1 < hi=5 and b=3 > lo=2.
        # [1,3) + [4,5) should NOT merge. Here a=1 < hi=5 but b=3 < lo=4... wait 3 < 4, so no overlap.
        # But what about [1,3) + [3,5)? a=1, b=3, lo=3, hi=5. b >= lo (3>=3) yes. a < hi (1<5) yes. Overlap/touch.
        # [1,3) + [3.5, 5)? b=3 < lo=3.5, no touch.
        
        # So condition for merging: other_lo < hi AND other_hi > lo... 
        # Wait for touching: [1,3) and [3,5): other_lo=3 < hi=5 ✓, other_hi=3 > lo=1 ✓. Yes they'd merge.
        # But do we want to merge touching? The problem says "touching intervals merged". So yes.
        # [1,3) and [3,5) → (1,5). So touching means other_lo == our hi or other_hi == our lo.
        
        # Actually the condition for "overlap or touch" for half-open intervals [a,b) and [c,d):
        # They overlap or touch if a < d and b > c. Let me verify:
        # [1,3) and [3,5): a=1 < d=5 ✓ and b=3 > c=3? No! 3 > 3 is false.
        # Hmm, that doesn't work for touching.
        
        # For merging touching: [a,b) and [c,d) merge if a <= d and b >= c... 
        # No wait. [1,3) and [3,5) should merge to [1,5). Condition: b >= c (3 >= 3) and a <= d (1 <= 5).
        # [1,3) and [4,5) should NOT merge. b=3 >= c=4? No. So condition b >= c excludes it. Good.
        # [1,3) and [2,5): b=3 >= c=2 ✓ and a=1 <= d=5 ✓. Merge. Good.
        # [1,3) and [0,2): b=3 >= c=0 ✓ and a=1 <= d=2 ✓. Merge. Good.
        
        # So condition: other_lo <= hi AND other_hi >= lo (using <= and >= for touching)
        # Wait: [1,3) and [3,5): other_lo=3, hi=5. other_lo <= hi: 3<=5 ✓. other_hi=3 >= lo=1: ✓. Merge.
        # [1,3) and [4,5): other_lo=4 <= hi=5: ✓. other_hi=5 >= lo=1: ✓. But we DON'T want to merge these!
        
        # Hmm that's wrong. Let me reconsider.
        # [1,3) and [4,5): These don't overlap or touch. Gap is [3,4).
        # Condition should be: NOT (other_hi <= lo OR other_lo >= hi) for overlap
        # For touching (to merge): other_hi == lo OR other_lo == hi
        # Combined: NOT (other_hi < lo OR other_lo > hi)
        # = other_hi >= lo AND other_lo <= hi
        
        # Check: [1,3) and [4,5): other_hi=4 >= lo=1 ✓ and other_lo=3... wait I'm confusing myself.
        # Let me use [a,b) for existing and [c,d) for new.
        # Overlap: a < d and b > c (strict)
        # Touch: a == d or b == c (they share an endpoint)
        # Merge condition: a <= d and b >= c (non-strict, includes both overlap and touch)
        # Wait: [a,b) and [c,d) with a=1,b=3,c=4,d=5: a<=d (1<=5) ✓, b>=c (3>=4)? No. Don't merge. 
        # [1,3) and [3,5): a=1,b=3,c=3,d=5: a<=d ✓, b>=c (3>=3) ✓. Merge. 
        # [1,3) and [2,5): a=1,b=3,c=2,d=5: a<=d ✓, b>=c (3>=2) ✓. Merge. 
        # [1,3) and [0,1): a=1,b=3,c=0,d=1: a<=d (1<=1) ✓, b>=c (3>=0) ✓. Merge. 
        # [1,3) and [0,0.5): a=1,b=3,c=0,d=0.5: a<=d (1<=0.5)? No. Don't merge. 
        
        # Great! So merge condition: existing_lo <= new_hi AND existing_hi >= new_lo
        
        # To find all intervals to merge:
        # Find leftmost interval with existing_hi >= new_lo → bisect_right on hi values... 
        # Actually, let me use lo values.
        # I need intervals where other_lo <= hi AND other_hi >= lo.
        # Since intervals are sorted by lo and non-overlapping, I can find:
        # - Start: first interval where other_hi >= lo. Since intervals are sorted by lo and non-overlapping,
        #   if other_lo < lo, we check if other_hi >= lo. We can bisect on lo to find where lo would go,
        #   then check one position back.
        # - End: last interval where other_lo <= hi. Use bisect_right on lo values.
        
        # Let me use bisect_right on self._los for the new hi to find the end.
        # And for the start, use bisect_right on self._los for new lo, then check position-1.
        
        # Actually simpler: find leftmost idx where los[idx] <= hi... no that's all of them.
        
        # Let me think differently. I want all intervals [a,b) where a <= hi AND b >= lo.
        # Since sorted by a: use bisect_right(los, hi) to get right boundary (all a <= hi are before this index).
        # For left boundary: I need b >= lo. Since intervals are disjoint and sorted, if los[idx] < lo,
        # then interval at idx might have b >= lo (overlapping/touching). I can find idx where lo would be
        # inserted: pos = bisect_right(los, lo). Then check idx = pos-1: if its hi >= lo, include it.
        # Then the range to merge is [start_idx, end_idx) where:
        # start_idx = pos-1 if that interval's hi >= lo, else pos
        # end_idx = bisect_right(los, hi)
        
        # Wait, I need to also include intervals where a == hi (touching on right).
        # bisect_right(los, hi) gives the position after all a <= hi. But a == hi means [hi, ...) which
        # touches [lo, hi) at hi. We want to merge that. bisect_right(los, hi) would include it since
        # it finds position where hi would be inserted to keep sorted, and for a == hi, it goes after.
        # Actually bisect_right returns the insertion point AFTER existing equal values.
        # bisect_right([1,3,5], 5) = 3. So interval (5,7) would be included. Good.
        # But wait, [5,7) touches [1,5) at 5. We want to merge. And bisect_right(los, 5) would give index
        # after 5, so interval at that index (if it's 5) is NOT included... 
        # Hmm, bisect_right([1,3,5], 5) returns 3. Indices 0,1,2 are checked. That includes 5. Good.
        # bisect_right([1,3,7], 5) returns 2. Indices 0,1 checked. 7 > 5, not included. Correct, no touch.
        
        # For the left: I need intervals where b >= lo (existing_hi >= new_lo).
        # pos = bisect_right(los, lo) → gives first index where a > lo.
        # So indices 0..pos-1 have a <= lo. Among these, some might have b >= lo.
        # Since intervals are disjoint and sorted, at most ONE interval at index pos-1 could have b > lo
        # (the one whose lo < our lo but whose hi extends past our lo).
        # Also interval at pos-1 might have b == lo (touching).
        # So: start = pos - 1 if pos > 0 and intervals[pos-1][1] >= lo, else pos.
        
        # For the right: end = bisect_right(los, hi)
        # But we also need intervals[pos] where a == hi to be included (touching).
        # bisect_right(los, hi) already includes a == hi. ✓
        
        # Let me code this up:
        pass
```

OK let me just write the full implementation now.

For performance, using `bisect` on a parallel list of lo values. The main operations:
- contains: O(log n) - just bisect + one comparison
- add: O(log n) for finding position + O(k) for merging k intervals + O(n) for list modification
- remove: O(log n + k) similar

For 60k random adds of small disjoint intervals, the merging step usually only affects 1 interval (or 0 if no overlap). The O(n) list modification is the bottleneck but with 60k elements in CPython, this should be manageable.

Actually, I realize there could be an issue with 60k adds where each insert is O(n) due to list shifting. 60000 inserts × average 30000 shifts = ~1.8 billion operations. In CPython, list insert/delete moves are done in C with memmove, which is very fast (maybe 10+ GB/s for pointer arrays). 1.8 billion pointers × 8 bytes = 14.4 GB of data movement. At ~10 GB/s, that's ~1.4 seconds. Should be fine within 5 seconds.

Let me also consider using `array` module for the lo values... actually, bisect works fine with regular lists in Python.

Let me write the full solution:

```python
import bisect

class IntervalSet:
    __slots__ = ('_ivs', '_los')
    
    def __init__(self):
        self._ivs = []   # list of [lo, hi], sorted by lo, disjoint, non-touching
        self._los = []   # parallel sorted list of lo values
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        
        # Find merge range [start, end) in self._ivs
        # Intervals to merge: those where iv[0] <= hi AND iv[1] >= lo
        pos = bisect.bisect_right(self._los, lo)
        
        # Check if interval at pos-1 touches/overlaps
        start = pos
        if pos > 0 and self._ivs[pos - 1][1] >= lo:
            start = pos - 1
        
        # Find end: first index where iv[0] > hi
        end = bisect.bisect_right(self._los, hi)
        
        if start == end:
            # No merge, just insert
            self._ivs.insert(pos, [lo, hi])
            self._los.insert(pos, lo)
            return
        
        # Merge intervals from start to end-1 with [lo, hi]
        new_lo = min(lo, self._ivs[start][0])
        new_hi = max(hi, self._ivs[end - 1][1])
        
        self._ivs[start:end] = [[new_lo, new_hi]]
        self._los[start:end] = [new_lo]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        
        # Find intervals that overlap with [lo, hi)
        pos = bisect.bisect_right(self._ivs, (lo, float('inf')))
        # Hmm, this doesn't work well with parallel lists.
        
        # Let me use a different approach.
        # Overlap condition: iv[0] < hi AND iv[1] > lo
        # Since sorted by iv[0]: iv[0] < hi means we look at indices < bisect_left(los, hi)... 
        # Actually bisect_left(los, hi) gives first index with lo >= hi. So indices 0..that-1 have iv[0] < hi.
        # Also need iv[1] > lo.
        
        right = bisect.bisect_left(self._los, hi)  # first index where iv[0] >= hi, so 0..right-1 have iv[0] < hi
        
        # Among these, which have iv[1] > lo?
        # Since intervals are sorted by lo and disjoint, if iv[0] < lo, at most the one just before
        # our position has iv[1] > lo.
        
        # Find where lo would be:
        pos = bisect.bisect_left(self._los, lo)
        # Check if interval at pos-1 overlaps (iv[1] > lo)
        left = pos
        if pos > 0 and self._ivs[pos - 1][1] > lo:
            left = pos - 1
        
        if left >= right:
            return  # No overlap
        
        # Remove/trim intervals from left to right-1
        # Build new intervals
        new_ivs = []
        new_los = []
        
        for i in range(left, right):
            a, b = self._ivs[i][0], self._ivs[i][1]
            # [a, b) minus [lo, hi)
            # Left part: [a, lo) if a < lo
            # Right part: [hi, b) if hi < b
            if a < lo:
                new_ivs.append([a, lo])
                new_los.append(a)
            if hi < b:
                new_ivs.append([hi, b])
                new_los.append(hi)
        
        self._ivs[left:right] = new_ivs
        self._los[left:right] = new_los
    
    def contains(self, x):
        if not self._los:
            return False
        pos = bisect.bisect_right(self._los, x)
        if pos == 0:
            return False
        return x < self._ivs[pos - 1][1]
    
    def total_length(self):
        total = 0
        for lo, hi in self._ivs:
            total += hi - lo
        return total
    
    def intervals(self):
        return [(lo, hi) for lo, hi in self._ivs]
    
    def __len__(self):
        return len(self._ivs)
```

Wait, I need to double-check the `remove` logic. The overlap condition for half-open intervals:
- [a, b) overlaps [lo, hi) if a < hi AND b > lo

For finding the range:
- `a < hi`: bisect_left(los, hi) gives first index where a >= hi. So indices [0, bisect_left(los, hi)) have a < hi. This is my `right`.
- `b > lo`: Among intervals with a < lo (indices [0, pos) where pos = bisect_left(los, lo)), at most one (the last one, pos-1) can have b > lo since they're disjoint. For intervals with a >= lo (indices [pos, right)), they all have b > a >= lo > lo... wait, b > a >= lo. Hmm, but if a == lo, then b > a == lo, so b > lo. Yes. So all intervals in [pos, right) have b > lo.

So the overlapping range is:
- Maybe pos-1 (if its b > lo)
- pos to right-1 (all have b > lo since their a >= lo and b > a)

This looks correct.

Let me also verify the `add` merge condition:
- [a, b) should merge with [lo, hi) if they touch or overlap.
- Touch or overlap: a <= hi AND b >= lo (non-strict for touching)
- `a <= hi`: indices with a <= hi are [0, bisect_right(los, hi)). This is `end`.
- `b >= lo`: Among a < lo, at most pos-1 has b >= lo. Among a >= lo (from pos to end-1), b > a >= lo, so b > lo >= lo. All satisfy.

So start = pos-1 if pos > 0 and ivs[pos-1][1] >= lo, else pos.
end = bisect_right(los, hi).

If start == end, no merging needed, just insert.

This looks correct!

One edge case: what about `remove` when the interval to remove completely covers an existing interval? E.g., intervals = [(2,3)], remove(0, 5). 
- right = bisect_left([2], 5) = 1
- pos = bisect_left([2], 0) = 0
- left = 0 (pos=0, so no check for pos-1)
- Range [0, 1): interval (2,3). a=2 < lo=0? No. hi=5 < b=3? No. So no new intervals added.
- Result: remove interval 0. Correct!

Another: intervals = [(1,5)], remove(2, 3).
- right = bisect_left([1], 3) = 0... wait, 1 < 3, so bisect_left([1], 3) = 1.
- pos = bisect_left([1], 2) = 1
- left: pos=1, check pos-1=0: ivs[0][1]=5 > lo=2? Yes. left=0.
- Range [0, 1): interval (1,5). a=1 < lo=2? Yes → add (1,2). hi=3 < b=5? Yes → add (3,5).
- Result: [(1,2), (3,5)]. Correct!

Another: intervals = [(1,3), (5,7)], add(3, 5).
- pos = bisect_right([1,5], 3) = 1
- Check pos-1=0: ivs[0][1]=3 >= lo=3? Yes. start=0.
- end = bisect_right([1,5], 5) = 2
- Merge range [0, 2): intervals (1,3) and (5,7).
- new_lo = min(3, 1) = 1, new_hi = max(5, 7) = 7.
- Result: [(1,7)]. Correct!

Another: intervals = [(1,3), (5,7)], add(3.5, 4.5).
- pos = bisect_right([1,5], 3.5) = 1
- Check pos-1=0: ivs[0][1]=3 >= 3.5? No. start=1.
- end = bisect_right([1,5], 4.5) = 1
- start == end → insert at pos=1.
- Result: [(1,3), (3.5,4.5), (5,7)]. Correct!

Looks good. Let me also handle the edge case in `remove` where `pos > len(self._ivs)` - this shouldn't happen since bisect_left returns at most len.

Also in `contains`, I should handle the case where the interval set is empty. Already handled with `if not self._los: return False`.

Let me also think about whether `intervals()` should return tuples. The problem says "list[tuple]: all intervals as (lo, hi) tuples". I'm returning `[(lo, hi) for lo, hi in self._ivs]` which converts lists to tuples. Good.

I think the implementation is solid. Let me finalize it.

Actually, wait - for performance, I should consider that `bisect_right` and `bisect_left` on a list of 60k elements is O(log 60k) ≈ 16 comparisons. That's fast. The 200k contains calls would be 200k × 16 ≈ 3.2M comparisons. Very fast.

The 60k adds: each does 2 bisections + potential merge + list insert. The list insert is the main cost. With Python's C implementation of list, inserting 60k elements one by one should take maybe 0.5-1 seconds.

I'm satisfied with the solution. Let me write the final version.
