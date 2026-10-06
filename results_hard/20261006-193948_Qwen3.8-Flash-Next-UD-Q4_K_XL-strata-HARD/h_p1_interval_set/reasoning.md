The user wants a class `IntervalSet` that stores disjoint half-open intervals [lo, hi). Let me think about the data structure and algorithms needed.

Key requirements:
1. `add(lo, hi)` - add interval, merge with overlapping/touching intervals
2. `remove(lo, hi)` - remove interval, may split intervals
3. `contains(x)` - O(log n) lookup
4. `total_length()` - sum of lengths
5. `intervals()` - sorted list of disjoint merged tuples
6. `__len__()` - number of intervals
7. Performance: 60,000 adds of small disjoint intervals in random order, then 200,000 contains calls in under 5 seconds.

For O(log n) contains, I need a sorted structure. A sorted list with bisect would work for contains - find the interval whose lo <= x, check if x < hi.

For the data structure, I'll maintain a sorted list of intervals. Since intervals are disjoint and sorted, I can use `bisect` for O(log n) lookup.

For `contains(x)`:
- Use bisect to find the rightmost interval with lo <= x
- Check if x < that interval's hi

For `add(lo, hi)`:
- Find all intervals that overlap or touch [lo, hi)
- Merge them into one interval
- Use bisect to find the range of affected intervals

For `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- For each, either remove entirely, or trim from left/right, or split into two parts

Let me think about the data structure more carefully. A sorted list of (lo, hi) tuples, maintained sorted by lo. Since intervals are disjoint and we keep them merged, lo values are strictly increasing and hi values are also strictly increasing.

For `add(lo, hi)`:
- If lo >= hi, ignore
- Find intervals that overlap or touch [lo, hi). Two intervals [a,b) and [c,d) touch if b == c or d == a, and overlap if a < d and c < b.
- Actually for merging: [a,b) and [c,d) should merge if a <= d and c <= b (they overlap or touch).
- Find the leftmost interval whose hi >= lo (using bisect)
- Find the rightmost interval whose lo <= hi
- Merge all of them

Wait, let me reconsider. For the performance requirement: 60,000 add() calls. Each add might need to merge multiple intervals. In the worst case, if we add intervals in random order, each add could potentially merge with neighbors. But since we're adding "small disjoint intervals in random order", most adds won't merge with existing intervals.

Actually, the problem says "small disjoint intervals in random order" - meaning the intervals themselves don't overlap. So most adds will just insert into the sorted list. The merge operation only kicks in when intervals touch or overlap.

For a sorted list, insertion is O(n) in the worst case due to list shifting. With 60,000 inserts, that's O(n²) = 3.6 billion operations which might be too slow.

Hmm, but Python's list insertion with bisect.insort is O(n) for the shift but O(log n) for the search. 60,000 inserts on a list of up to 60,000 elements... the total shifting would be about 60000 * 30000 = 1.8 billion byte copies. That might be tight but in CPython, list operations are implemented in C so it might be fast enough.

Actually, let me think again. With 60,000 elements and random insertion order, the average number of shifts per insert is about n/2 = 30,000. Total shifts: 60,000 * 30,000 = 1.8 * 10^9. Each shift is just a pointer copy in CPython. In C, moving 30,000 pointers takes maybe a few microseconds. 60,000 * a few microseconds = maybe 0.2-0.5 seconds. Should be fine.

For 200,000 contains calls: each is O(log n) with bisect, so about 16 comparisons each. 200,000 * 16 = 3.2 million comparisons. Very fast.

So a sorted list with bisect should work fine.

Let me design the implementation:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples, disjoint and merged
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        # Find the first interval that could overlap or touch [lo, hi)
        # An interval (a, b) overlaps/touches [lo, hi) if b >= lo and a <= hi
        # Actually: they merge if not (b < lo or a > hi), i.e., b >= lo and a <= hi
        # Wait, for half-open [a,b) and [lo,hi): they touch/overlap if b >= lo and a <= hi
        # Hmm, [1,3) and [3,5) should merge (touching). b=3 >= lo=3, a=1 <= hi=5. Yes.
        # [1,3) and [4,5) should NOT merge. b=3 >= lo=4? No, 3 < 4. Correct.
        
        # Find leftmost interval with hi > lo (or >= lo for touching)
        # We need to find intervals where hi >= lo (could touch on left)
        # and lo <= hi (could touch on right)
        
        # bisect to find where lo would be inserted (by the lo component)
        # We want intervals where a <= hi (right boundary condition)
        # and b >= lo (left boundary condition)
        
        # Let's find the range of overlapping/touching intervals
        # Left boundary: first interval with hi >= lo
        # Right boundary: last interval with lo <= hi
        
        # For the right boundary: find rightmost index where intervals[i][0] <= hi
        # Using bisect_right on the lo values
        # We need a key function... bisect doesn't directly support that for tuples.
        
        # Since we're storing tuples (lo, hi), bisect on the list directly compares tuples.
        # bisect_left(intervals, (lo, -inf)) finds first interval with lo >= lo (roughly)
        # Actually, we need to be more careful.
        
        # Let me think differently. Find all intervals that need merging.
        # An interval (a, b) needs merging with (lo, hi) if:
        #   - b >= lo (the existing interval extends to or past our lo) -- touching on left
        #   - a <= hi (the existing interval starts at or before our hi) -- touching on right
        # Both conditions together mean they overlap or touch.
        
        # Actually for touching: [1,3) touches [3,5) means 3 == 3. So b >= lo works (3 >= 3).
        # And for [5,7) touching [3,5): a <= hi (5 <= 5). And b >= lo (7 >= 3). So both needed.
        
        # Hmm wait, [1,3) and [3,5): should they merge? Yes per the problem statement.
        # Condition: b >= lo AND a <= hi. For (1,3) and (3,5): 3 >= 3 (yes) AND 1 <= 5 (yes). Merge.
        # For (1,3) and (4,5): 3 >= 4? No. Don't merge. Correct.
        
        # Find leftmost interval that could merge: its hi >= lo
        # Since intervals are sorted by lo, and disjoint, hi values are also increasing.
        # We can binary search for the first interval with hi >= lo.
        # But we can't directly bisect on hi values in a list of tuples sorted by lo.
        
        # Alternative: find the insertion point for lo, then go back one to check if previous interval's hi >= lo.
        
        # Let me use bisect to find where (lo, lo) would be inserted.
        # Actually, let me use a helper.
        
        n = len(intervals)
        
        # Find the first interval whose lo > hi (strictly), i.e., it's to the right
        # All intervals before this have lo <= hi and could potentially merge
        # bisect_right(intervals, (hi, float('inf'))) gives first index where lo > hi
        # Wait, (hi, float('inf')) -- any tuple (a, b) with a <= hi will be <= this.
        # bisect_right gives the insertion point after all elements <= (hi, inf)
        # So intervals[:right_idx] are all intervals with lo <= hi (or lo == hi and hi_val <= inf, always true)
        
        # For the left boundary, we want intervals with hi >= lo.
        # bisect_left(intervals, (lo, -inf)) gives first index where lo_val >= lo
        # The interval just before this index has lo_val < lo. We need to check if its hi >= lo.
        # Actually, we want the first interval with hi >= lo. Since intervals are disjoint and sorted,
        # the interval before the insertion point of lo might have hi >= lo (touching/overlapping).
        
        # Let me just find the range:
        # left = 0, expand right until we find first non-overlapping
        # right = n-1, expand left until we find first non-overlapping
        # But that's O(n) in worst case.
        
        # Better: use bisect.
        # right_idx = bisect.bisect_right(intervals, (hi, float('inf')))
        # This gives the first index where intervals[i][0] > hi (or == hi and intervals[i][1] > inf, impossible)
        # So intervals[0:right_idx] all have lo <= hi.
        
        # For left: we want the first index where intervals[i][1] >= lo.
        # Since intervals are sorted by lo and disjoint, hi values are strictly increasing too.
        # We can do a binary search on hi values... but we can't bisect on hi directly.
        
        # Alternative approach: find insertion point for lo in the sorted list.
        # pos = bisect.bisect_left(intervals, (lo,))
        # Then check intervals[pos-1] to see if it touches.
        # And intervals[pos] to see if it touches from the right.
        
        # Actually, let me just do it more simply:
        # Find the range of intervals to merge.
        
        # The intervals to merge are those [i, j) where:
        # intervals[i][1] >= lo (leftmost merge)
        # intervals[j-1][0] <= hi (rightmost merge)
        # And all intervals between are also merged (since they're in between and we're merging a contiguous range).
        
        # Since hi values are increasing (intervals are disjoint and sorted), 
        # intervals[i][1] >= lo defines a suffix.
        # Since lo values are increasing, intervals[i][0] <= hi defines a prefix.
        # The intersection is a contiguous range [left, right).
        
        # For left: find first i where intervals[i][1] >= lo
        # For right: find first i where intervals[i][0] > hi (exclusive upper bound)
        
        # For right boundary:
        right_idx = bisect.bisect_right(intervals, (hi, float('inf')))
        
        # For left boundary, we need first i where intervals[i][1] >= lo.
        # We can binary search manually, or:
        # Find pos = bisect.bisect_left(intervals, (lo, float('-inf')))
        # This gives first index where intervals[i][0] >= lo (or == lo and hi >= -inf, always true)
        # Then check intervals[pos-1]: if its hi >= lo, it also merges.
        # If intervals[pos-1].hi < lo, then left = pos.
        # But what about intervals[pos-2]? Its hi < intervals[pos-1].hi < lo. So no.
        
        # Wait, is that correct? Since intervals are disjoint and sorted:
        # intervals[i-1].hi <= intervals[i].lo (strictly < actually since disjoint)
        # So if intervals[pos-1].hi < lo, then all earlier intervals have even smaller hi.
        
        # Actually, for touching: intervals[i-1].hi == intervals[i].lo. So <=.
        # And we want hi >= lo for merging. If intervals[pos-1].hi >= lo, include it.
        # If intervals[pos-1].hi < lo, then all i < pos-1 also have hi < lo.
        
        pos = bisect.bisect_left(intervals, (lo, float('-inf')))
        # pos is first index where intervals[i] >= (lo, -inf)
        # i.e., intervals[i][0] >= lo or (intervals[i][0] == lo and intervals[i][1] >= -inf which is always true)
        # So pos is first index with lo_val >= lo.
        
        # Check pos-1:
        if pos > 0 and intervals[pos - 1][1] >= lo:
            left = pos - 1
        else:
            left = pos
        
        # But wait, what if pos == 0? Then left = 0.
        # What if intervals[pos] itself has hi >= lo? It always will since lo_val >= lo and hi_val > lo_val >= lo. So yes.
        
        # Actually wait. What about intervals at pos-2, pos-3, etc.? 
        # Since intervals are disjoint: intervals[pos-1].hi <= intervals[pos].lo
        # And we need intervals[i].hi >= lo for merging.
        # If intervals[pos-1].hi < lo, then for all i <= pos-2: intervals[i].hi <= intervals[pos-1].lo < intervals[pos-1].hi < lo. Wait no.
        # intervals[pos-2].hi <= intervals[pos-1].lo (disjoint, touching possible)
        # And intervals[pos-1].hi < lo
        # But intervals[pos-2].hi could be > intervals[pos-1].hi? No! Since disjoint and sorted, hi values increase.
        # Actually: intervals[pos-2].hi <= intervals[pos-1].lo < intervals[pos-1].hi (since lo < hi for each interval)
        # Hmm, intervals[pos-1].lo < intervals[pos-1].hi (since each interval has lo < hi)
        # And intervals[pos-2].hi <= intervals[pos-1].lo (disjoint)
        # So intervals[pos-2].hi <= intervals[pos-1].lo < intervals[pos-1].hi < lo
        # So yes, if pos-1 doesn't merge, nothing before it does.
        
        # Similarly for the right side, if intervals[right_idx-1].lo <= hi (by construction of right_idx),
        # we need to check intervals[right_idx].lo > hi. All intervals at right_idx and beyond don't merge.
        
        # So the range to merge is [left, right_idx).
        
        # But wait, what if left >= right_idx? Then no overlap, just insert.
        # What if left == right_idx? No merging needed, just insert at position left.
        
        if left >= right_idx:
            # No overlap/touch, just insert
            intervals.insert(left, (lo, hi))
            return
        
        # Compute merged interval
        merged_lo = min(lo, intervals[left][0])
        merged_hi = max(hi, intervals[right_idx - 1][1])
        
        # Replace intervals[left:right_idx] with the merged interval
        intervals[left:right_idx] = [(merged_lo, merged_hi)]
```

Wait, there's an issue with the left boundary. Let me reconsider.

What if `lo` is exactly equal to an existing interval's `hi`? E.g., existing interval (2, 5), adding (5, 8). They touch. We want to merge.

pos = bisect_left(intervals, (5, -inf)). The existing (2, 5) < (5, -inf)? Tuple comparison: (2,5) < (5, -inf)? 2 < 5, yes. So pos would be 1 (after (2,5)). Then pos-1 = 0, intervals[0][1] = 5 >= lo = 5. Yes! Merge. Good.

What about adding (0, 2) when existing is (2, 5)? They touch at 2.
pos = bisect_left(intervals, (0, -inf)). (0, -inf) < (2, 5)? 0 < 2, yes. So pos = 0. left = 0. right_idx = bisect_right(intervals, (2, inf)). (2, 5) <= (2, inf)? 2 == 2 and 5 <= inf, yes. So right_idx = 1. Range [0, 1). merged_lo = min(0, 2) = 0, merged_hi = max(2, 5) = 5. Result: (0, 5). Correct!

What about adding (0, 2) when existing is (3, 5)? Don't touch.
pos = bisect_left(intervals, (0, -inf)) = 0. left = 0.
right_idx = bisect_right(intervals, (2, inf)). (3, 5) <= (2, inf)? 3 > 2, no. So right_idx = 0.
left >= right_idx (0 >= 0). No overlap. Insert at 0. Correct.

What about adding (1, 3) when existing is (2, 5)? Overlap.
pos = bisect_left(intervals, (1, -inf)). (2, 5) >= (1, -inf)? 2 > 1, yes. pos = 0. left = 0.
right_idx = bisect_right(intervals, (3, inf)). (2, 5) <= (3, inf)? 2 < 3, yes. right_idx = 1.
Range [0, 1). merged_lo = min(1, 2) = 1, merged_hi = max(3, 5) = 5. Result: (1, 5). Correct.

What about adding (4, 7) when existing is (2, 5)? Overlap.
pos = bisect_left(intervals, (4, -inf)). (2, 5) >= (4, -inf)? 2 < 4, no. pos = 1.
pos > 0, intervals[0][1] = 5 >= 4? Yes. left = 0.
right_idx = bisect_right(intervals, (7, inf)). (2, 5) <= (7, inf)? 2 < 7, yes. right_idx = 1.
Range [0, 1). merged_lo = min(4, 2) = 2, merged_hi = max(7, 5) = 7. Result: (2, 7). Correct.

What about multiple intervals: existing = [(1, 3), (5, 7), (9, 12)], add (2, 10).
pos = bisect_left(intervals, (2, -inf)). (1,3) >= (2,-inf)? 1 < 2, no. (5,7) >= (2,-inf)? 5 > 2, yes. pos = 1.
pos > 0, intervals[0][1] = 3 >= 2? Yes. left = 0.
right_idx = bisect_right(intervals, (10, inf)). 
  (1,3) <= (10,inf)? yes.
  (5,7) <= (10,inf)? yes.
  (9,12) <= (10,inf)? 9 < 10, yes.
  right_idx = 3.
Range [0, 3). merged_lo = min(2, 1) = 1, merged_hi = max(10, 12) = 12. Result: [(1, 12)]. Correct.

Great, the algorithm works.

Now for `remove(lo, hi)`:
- If lo >= hi, ignore.
- Find all intervals that overlap with [lo, hi).
- An interval (a, b) overlaps with [lo, hi) if a < hi and lo < b (strict since half-open).
  Wait: [a,b) ∩ [lo,hi) ≠ ∅ iff a < hi and lo < b.
  If a >= hi or b <= lo, no overlap.
  
- For each overlapping interval:
  - If a < lo and b > hi: split into (a, lo) and (hi, b)
  - If a < lo and b <= hi: trim right to (a, lo)
  - If a >= lo and b > hi: trim left to (hi, b)
  - If a >= lo and b <= hi: remove entirely

Let me think about this more carefully with the sorted list:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    intervals = self._intervals
    n = len(intervals)
    
    # Find first interval with hi > lo (overlapping)
    # and last interval with lo < hi
    
    # right boundary: first interval with lo >= hi
    right_idx = bisect.bisect_left(intervals, (hi,))
    # Actually, bisect_left(intervals, (hi,)) gives first index where intervals[i][0] >= hi
    # or intervals[i][0] == hi and intervals[i][1] >= (the second component of (hi,))
    # Hmm, (hi,) is a 1-tuple. Comparing (hi,) with (a, b): (hi,) < (a, b) iff hi < a or (hi == a and len(hi_tuple) < len(ab_tuple)).
    # Actually in Python, (hi,) < (a, b) iff hi < a, or hi == a and the 1-tuple is shorter... no.
    # Python tuple comparison: compares element by element. (hi,) vs (a, b): compare hi vs a. If equal, then 1-tuple is shorter than 2-tuple, so (hi,) < (a, b).
    # So bisect_left(intervals, (hi,)) gives first index where intervals[i][0] >= hi... wait no.
    # If intervals[i][0] == hi, then (hi,) < (hi, b) since 1-tuple < 2-tuple when first elements equal.
    # So bisect_left gives first index where (a, b) >= (hi,), which is first index where a > hi, or a == hi.
    # That means all intervals before this have a < hi. And this interval has a >= hi.
    # We want intervals that overlap: a < hi. So [0, right_idx) are candidates from the right.
    
    # Actually, intervals with a >= hi don't overlap. So right_idx is correct as exclusive upper bound.
    
    # Left boundary: last interval with hi > lo.
    # We need the first interval with hi > lo, i.e., not (hi <= lo).
    # Since hi values are increasing (intervals are disjoint, sorted), we can binary search.
    # But we can't bisect directly on hi values.
    
    # Alternative: find the position where (lo, lo) would go.
    # pos = bisect.bisect_right(intervals, (lo, float('inf')))
    # This gives first index where (a,b) > (lo, inf), i.e., a > lo or (a == lo and b > inf, impossible).
    # So first index with a > lo. All intervals before have a <= lo.
    # Among those, the ones with b > lo overlap.
    # Since b values increase with index (intervals are disjoint and sorted: b_i <= a_{i+1} <= b_{i+1}),
    # the intervals with a <= lo form a prefix, and among those, those with b > lo form a suffix.
    
    # Actually, let me just find the left boundary more carefully.
    # I need the first interval that overlaps [lo, hi). That's the first interval with b > lo.
    # Since intervals are disjoint and sorted, b_i <= a_{i+1}. And b values are increasing.
    # So I can binary search for the first interval with b > lo.
    
    # Let me just iterate from a reasonable starting point.
    # Actually for efficiency, let me find:
    # left_idx = first i such that intervals[i][1] > lo
    
    # I'll do a manual binary search on hi values:
    # Since intervals are sorted by lo, and disjoint (b_i <= a_{i+1}), hi values are non-decreasing.
    # Actually hi values are strictly increasing since a_{i+1} > b_i... wait no, touching is allowed after merge? No, after merge touching intervals are merged. So a_{i+1} > b_i strictly (since if b_i == a_{i+1} they'd be merged).
    
    # Wait, do we maintain the invariant that touching intervals are merged? Yes, per the problem statement and our add logic.
    # So b_i < a_{i+1} strictly. Thus b values are strictly increasing.
    
    # Binary search for first i where intervals[i][1] > lo:
    # lo_val = 0, hi_val = right_idx (since beyond right_idx, a >= hi > lo, but b could still be > lo)
    # Hmm wait, if a >= hi, then b > a >= hi > lo, so b > lo. So right_idx and beyond also have b > lo.
    # But we only care about [left_idx, right_idx) as the overlapping range.
    
    # Let me just find left_idx using binary search:
    # We want first i in [0, n) with intervals[i][1] > lo.
    # Since b values are increasing, this is a standard binary search.
    
    # Actually, I realize I can simplify. Let me find the range of potentially overlapping intervals:
    # Overlap condition: a < hi AND b > lo
    # a < hi: indices [0, right_idx) where right_idx = bisect_left(intervals, (hi,))
    #   Wait, (hi,) vs (a, b): if a < hi then (a,b) < (hi,)? a < hi -> yes, (a,b) < (hi,). 
    #   If a == hi: (a,b) vs (hi,) -> (hi, b) vs (hi,) -> first elements equal, then b vs nothing -> (hi,) < (hi, b). So (hi,) < (hi, b), meaning (hi, b) > (hi,).
    #   If a > hi: (a,b) > (hi,). 
    #   So bisect_left(intervals, (hi,)) gives first index where intervals[i][0] >= hi. Correct.
    #   Intervals [0, right_idx) have a < hi. Good.
    
    # b > lo: need first index where intervals[i][1] > lo.
    # Let me binary search:
    
    # Find left_idx: first index with intervals[i][1] > lo
    # lo_idx = 0, hi_idx = right_idx (or n, but intervals beyond right_idx have a >= hi > lo... 
    #   wait a >= hi > lo, but we need b > lo. Since b > a >= hi > lo, yes b > lo. 
    #   But those intervals don't overlap (a >= hi means no overlap).
    #   So we only search in [0, right_idx).)
    
    # Hmm, this is getting complex. Let me just do it linearly within the candidate range.
    # For the performance requirement, we have at most 60,000 intervals. 
    # In the worst case for remove, we might scan many intervals. But typically removes are fewer.
    
    # Actually, let me just use a simple approach: binary search for left boundary.
    
    # Binary search for first i with intervals[i][1] > lo in [0, right_idx):
    # Since intervals are sorted by a, and b is increasing:
    
    # Actually, I realize that for intervals sorted by lo with strict disjointness:
    # a_0 < b_0 < a_1 < b_1 < ...
    # So b values are strictly increasing. I can binary search.
    
    # But bisect doesn't directly support searching on the second element. Let me do a manual binary search.
    
    # Or simpler: I know that for any interval, b > a. So if a > lo, then b > lo.
    # The first interval with a > lo is at pos = bisect_left(intervals, (lo, float('-inf'))) 
    #   which gives first index with a >= lo (or a == lo).
    #   Actually let me use bisect_right(intervals, (lo, float('inf'))) to get first index with a > lo.
    #   Hmm, (lo, inf) vs (a, b): if a < lo, (a,b) < (lo, inf). If a == lo, (lo, b) vs (lo, inf): b < inf? yes (unless b is inf). So (lo, b) < (lo, inf). If a > lo: (a,b) > (lo, inf).
    #   So bisect_right(intervals, (lo, float('inf'))) gives first index with a > lo.
    #   
    #   All intervals at index < this have a <= lo. Among those, some might have b > lo (overlapping) and some b <= lo (not overlapping).
    #   The first interval with a > lo definitely has b > a > lo, so it overlaps (if a < hi).
    
    # OK let me just do this more simply. I'll find the start index by going back from pos:
    # pos = bisect_left(intervals, (lo,))  # first index with a >= lo (since (lo,) < (lo, b) as 1-tuple < 2-tuple)
    #   Actually wait: (lo,) compared to (lo, b): compare lo vs lo -> equal. Then 1-tuple is "less than" 2-tuple (shorter prefix is less). So (lo,) < (lo, b).
    #   And (a, b) compared to (lo,): if a < lo, then (a,b) < (lo,). If a > lo, (a,b) > (lo,). If a == lo, (lo, b) > (lo,).
    #   So bisect_left(intervals, (lo,)) gives first index with a >= lo. Correct.
    
    # Starting from pos, the first interval with b > lo is at pos (since a >= lo and b > a >= lo, so b > lo... unless a == lo and b == lo, but b > a always).
    #   Actually if a >= lo, then b > a >= lo, so b > lo. Yes! So pos is the first index where b > lo... wait no.
    #   We want first index where b > lo. Could an interval with a < lo have b > lo? Yes! That's the one to the left of pos.
    #   So: check pos-1. If intervals[pos-1][1] > lo, then left_idx = pos-1. Else left_idx = pos.
    #   But wait, could pos-2 also have b > lo? No, because b_{pos-2} < a_{pos-1} < a_pos... hmm no.
    #   b_{pos-2} < a_{pos-1} (strict disjointness). And a_{pos-1} < lo (since pos is first with a >= lo). 
    #   So b_{pos-2} < a_{pos-1} < lo. So b_{pos-2} < lo. Good, only pos-1 could extend past lo.
    
    # Hmm wait, what if pos == 0? Then left_idx = 0.
    
    # Actually, I realize there might be multiple intervals before pos that overlap.
    # No! Since intervals are disjoint: b_{i} < a_{i+1}. So if intervals[pos-1].b <= lo, 
    # then intervals[pos-2].b < a_{pos-1} <= lo. So no. Only at most one interval before pos can overlap.
    
    # Great, so:
    # pos = bisect_left(intervals, (lo,))
    # if pos > 0 and intervals[pos-1][1] > lo: left_idx = pos - 1
    # else: left_idx = pos
    
    # And right_idx as computed above.
    
    # But wait, I used (lo,) for bisect_left. Let me verify:
    # We want first index with intervals[i][0] >= lo.
    # bisect_left(intervals, (lo, float('-inf'))): (lo, -inf) vs (a, b): 
    #   if a < lo: (a,b) < (lo, -inf). 
    #   if a > lo: (a,b) > (lo, -inf).
    #   if a == lo: compare b vs -inf: b > -inf always. So (a,b) > (lo, -inf).
    # So bisect_left(intervals, (lo, float('-inf'))) gives first index where a >= lo or (a == lo and b >= -inf, always true) = first index with a >= lo. Same as (lo,). Good.
    
    # OK, I think the approach is correct. Let me also handle the edge case where right_idx might be computed differently.
    
    # Actually, for remove, the overlap condition is: a < hi AND b > lo (strict, since half-open).
    # a < hi: intervals[i][0] < hi. First index with a >= hi is right_idx.
    #   bisect_left(intervals, (hi,)) gives first index with a >= hi. So overlap range is [0, right_idx).
    #   Wait, but (hi,) vs (hi, b): (hi,) < (hi, b) since shorter. So (hi, b) > (hi,). bisect_left returns index of (hi, b) which is where (hi,) would be inserted to keep sorted, which is before (hi, b). So yes, first index with a >= hi.
    
    # b > lo: handled as above.
    
    # But I also need right_idx to exclude intervals with a >= hi. And left_idx to exclude intervals with b <= lo.
    
    # Overlap range: [left_idx, right_idx).
    
    # Now process:
    # new_intervals = []
    # For each interval in overlap range, compute remaining parts
    # For intervals before left_idx: keep as is
    # For intervals after right_idx: keep as is
    
    # Let me just replace the range:
    
    pos = bisect.bisect_left(intervals, (lo,))
    # Actually, I need to be careful. Let me use (lo, float('-inf')) to be explicit.
    # No, (lo,) works as shown. But let me use a float to be safe with edge cases.
    # Actually (lo,) works fine in Python's tuple comparison. Let me keep it.
    
    left_idx = pos
    if pos > 0 and intervals[pos - 1][1] > lo:
        left_idx = pos - 1
    
    right_idx = bisect.bisect_left(intervals, (hi,))
    # First index with a >= hi. Overlapping intervals are those with a < hi.
    
    # Now, there might be an issue: what if intervals[right_idx] has a == hi and b > hi?
    # a == hi means the interval starts at hi. [a, b) ∩ [lo, hi) = [hi, hi) = empty. No overlap. Correct to exclude.
    
    # Process intervals in [left_idx, right_idx):
    new_parts = []
    for i in range(left_idx, right_idx):
        a, b = intervals[i]
        # Overlap exists: a < hi and b > lo
        if a < lo:
            # Left part remains: [a, lo)
            new_parts.append((a, lo))
        if b > hi:
            # Right part remains: [hi, b)
            new_parts.append((hi, b))
        # else: interval is completely within [lo, hi), removed entirely
    
    intervals[left_idx:right_idx] = new_parts
```

Wait, there's a subtle issue with the right_idx computation for remove. Let me reconsider.

For remove, overlap condition: a < hi AND b > lo (strict).

For the right boundary: we want the last interval with a < hi.
bisect_left(intervals, (hi,)) gives first index with a >= hi. So [0, right_idx) have a < hi. Good.

But wait, what about (hi,) vs (a, b) when a == hi?
(lo,) style: I'm using (hi,) which is a 1-tuple.
(hi,) vs (hi, b): compare first elements: hi == hi. Then (hi,) has no second element, (hi, b) does. Shorter tuple < longer tuple when prefix matches. So (hi,) < (hi, b).
bisect_left looks for the leftmost position where (hi,) can be inserted to keep sorted. Since (hi,) < (hi, b), it inserts before (hi, b). So bisect_left returns the index of the first interval with a == hi. Which is the first index with a >= hi. Correct.

For left boundary: first interval with b > lo.
pos = bisect_left(intervals, (lo,)): first index with a >= lo.
If pos > 0 and intervals[pos-1][1] > lo: left_idx = pos - 1.
Else: left_idx = pos.

Is it possible that intervals[pos] has b > lo? Since a >= lo (by definition of pos) and b > a >= lo, yes b > lo. So if pos < n, intervals[pos] is included in [left_idx, right_idx). Good.

Is it possible that intervals[pos-1] has b > lo AND intervals[pos-2] also has b > lo? 
b_{pos-2} < a_{pos-1} < a_pos... wait no. a_{pos-1} < lo (since pos is first with a >= lo). And b_{pos-2} < a_{pos-1} (disjoint). So b_{pos-2} < a_{pos-1} < lo. So b_{pos-2} < lo. Cannot have b > lo. Good, at most one interval before pos can overlap.

Alright, the algorithm looks correct.

Now for `contains(x)`:
- Binary search for the interval that could contain x.
- x is in [lo, hi) means lo <= x < hi.
- Find the rightmost interval with lo <= x.
- Check if x < hi of that interval.

```python
def contains(self, x):
    intervals = self._intervals
    # Find rightmost interval with lo <= x
    # bisect_right(intervals, (x, float('inf'))) gives first index with lo > x
    pos = bisect.bisect_right(intervals, (x, float('inf')))
    if pos == 0:
        return False
    # intervals[pos-1] has lo <= x
    return x < intervals[pos - 1][1]
```

Wait, let me verify: bisect_right(intervals, (x, float('inf'))):
- (x, inf) vs (a, b): if a < x: (a,b) < (x, inf). if a > x: (a,b) > (x, inf). if a == x: compare b vs inf: b < inf (assuming b is finite). So (a,b) < (x, inf) if a == x and b < inf. 
- So bisect_right gives first index where (a, b) > (x, inf), i.e., a > x or (a == x and b > inf, impossible).
- So first index with a > x. [0, pos) all have a <= x. Correct.
- If pos == 0, no interval has lo <= x. Return False.
- Else, intervals[pos-1].lo <= x. Check x < intervals[pos-1].hi. Correct.

But what if x is -inf or the interval has hi = inf? Edge cases. For the problem, bounds are ints or floats, so no infs. Fine.

What about float('inf') in the bisect key? If an interval has hi = float('inf'), then (lo, float('inf')) vs (x, float('inf')): if lo == x, compare inf vs inf: equal. So (lo, inf) == (x, inf). bisect_right would go past it. Hmm, but the problem says bounds are ints or floats, probably not inf. I'll keep it.

Actually, a safer approach: use a very large number instead of inf. Or better, since we're comparing tuples, use a different approach:

```python
def contains(self, x):
    intervals = self._intervals
    # Find the last interval with lo <= x
    # We can use bisect with a custom approach
    # bisect_right on a list of lo values... but we don't have a separate list.
    
    # Alternative: use bisect_right with (x, float('inf'))
    # This works as analyzed above for finite values.
    pos = bisect.bisect_right(intervals, (x, float('inf')))
    return pos > 0 and x < intervals[pos - 1][1]
```

Actually, I realize there might be an issue. What if x is very large, like float('inf')? Then (x, float('inf')) = (inf, inf), and any interval (a, b) with a < inf will be less. So pos = n. Then we check intervals[n-1][1] > inf? No. So returns False. That seems correct - x = inf isn't in any finite interval.

But what about x = float('-inf')? bisect_right(intervals, (-inf, inf)): any interval (a, b) with a > -inf is greater. So pos = 0. Return False. Correct, -inf isn't in any interval with lo > -inf.

OK, I think this is fine.

Now for `total_length()`:
Simple sum of (hi - lo) for all intervals. O(n).

For `intervals()`: return list of tuples. Already stored that way.

For `__len__()`: return len(self._intervals).

Let me also think about the `add` edge case where we're adding an interval that's completely contained in an existing interval. E.g., existing [(2, 10)], add (4, 6).
pos = bisect_left(intervals, (4,)) = 1 (since (2,10) < (4,)). pos > 0, intervals[0][1] = 10 >= 4? Yes. left = 0.
right_idx = bisect_right(intervals, (6, inf)). (2, 10) <= (6, inf)? 2 < 6, yes. right_idx = 1.
Range [0, 1). merged_lo = min(4, 2) = 2, merged_hi = max(6, 10) = 10. Replace with (2, 10). Correct.

And adding (2, 10) when existing is [(4, 6)]:
pos = bisect_left(intervals, (2,)) = 0. left = 0.
right_idx = bisect_right(intervals, (10, inf)). (4, 6) <= (10, inf)? 4 < 10, yes. right_idx = 1.
merged_lo = min(2, 4) = 2, merged_hi = max(10, 6) = 10. Replace with (2, 10). Correct.

Now let me also think about the `add` with `bisect_right` for right boundary:
right_idx = bisect_right(intervals, (hi, float('inf')))
(hi, inf) vs (a, b): if a < hi, less. if a > hi, greater. if a == hi: (hi, b) vs (hi, inf): b < inf, so less. if a == hi and b == inf: equal.
So bisect_right gives first index with (a, b) > (hi, inf), i.e., a > hi. [0, right_idx) have a <= hi.

Wait, but for merging we want intervals with a <= hi (they touch or overlap). An interval starting at hi touches [lo, hi): [hi, b) touches [lo, hi) at point hi. The problem says [1,3) + [3,5) gives [(1,5)], so touching merges. So a == hi should merge. [0, right_idx) with right_idx = first a > hi. Yes, includes a == hi. Correct.

But what about an interval with a == hi? Does [hi, b) actually touch [lo, hi)? In the half-open sense, [lo, hi) doesn't include hi, and [hi, b) starts at hi. They don't share any point. But the problem explicitly says touching intervals should merge. So we treat them as adjacent and merge. Good, our algorithm does this.

Let me also double-check: what if we have [(1, 3), (5, 7)] and add (3, 5)?
pos = bisect_left(intervals, (3,)). (1,3) < (3,)? 1 < 3 yes. (5,7) < (3,)? 5 > 3, no. pos = 1.
pos > 0, intervals[0][1] = 3 >= 3? Yes. left = 0.
right_idx = bisect_right(intervals, (5, inf)). (1,3) <= (5,inf)? 1 < 5, yes. (5,7) <= (5,inf)? 5 == 5, 7 < inf, yes. right_idx = 2.
Range [0, 2). merged_lo = min(3, 1) = 1, merged_hi = max(5, 7) = 7. Result: [(1, 7)]. Correct!

Great. Now let me put it all together and make sure performance is fine.

For 60,000 random inserts into a list: using list.insert() which is O(n) per insert but implemented in C. Total: ~60000 * 30000 pointer moves = 1.8 * 10^9 pointer copies. At maybe 10^9 pointer copies per second in C... about 2 seconds. Hmm, might be tight.

Actually, CPython's list insert uses memmove which is very fast (optimized C library). 30,000 pointers * 8 bytes = 240KB. memmove of 240KB is maybe 10-50 microseconds. 60,000 * 50μs = 3 seconds. Might be too slow.

Alternative: use a different data structure. But the problem says standard library only. We could use `bisect.insort` which does the same thing.

Actually, let me reconsider. The intervals are "small disjoint intervals in random order". If they're disjoint and we add them in random order, most of the time the merge range is just 1 (the interval itself) or maybe 2 (touching a neighbor). The list.insert() is the bottleneck.

Hmm, 60,000 inserts. Average list length at time of insert i is about i/2. Total memmove bytes: sum(i/2 * 8 for i in range(60000)) ≈ 60000^2/4 * 8 = 7.2 * 10^9 bytes. At 10 GB/s memory bandwidth, that's 0.72 seconds. Should be fine.

For 200,000 contains calls: each is a bisect_right (O(log n) ≈ 16 comparisons of tuples) plus one comparison. In Python, tuple comparison is fast but each comparison is a Python-level call. 200,000 * 16 = 3.2 million tuple comparisons. At maybe 1μs per comparison (Python overhead), that's 3.2 seconds. Hmm, that might be tight.

Actually, bisect_right in CPython's _bisect module is implemented in C. The comparisons it does are PyObject_RichCompare, but for simple tuples of numbers, this is quite fast. Let me estimate: 200,000 calls to bisect_right with list of 60,000 elements. Each bisect is about log2(60000) ≈ 16 iterations. Each iteration does one comparison. CPython's comparison of (float, float) tuples is fast. I'd estimate maybe 1-2 μs per bisect call. 200,000 * 2μs = 0.4 seconds. Should be fine.

Let me also consider: can I optimize `contains` by avoiding tuple creation? Instead of `bisect_right(intervals, (x, float('inf')))`, I could maintain a separate list of lo values. But that adds complexity and maintenance cost. Let me keep it simple first.

Actually, to avoid creating a tuple every time in contains, I could use a different approach:

```python
def contains(self, x):
    intervals = self._intervals
    # Binary search manually for rightmost interval with lo <= x
    lo, hi = 0, len(intervals)
    while lo < hi:
        mid = (lo + hi) // 2
        if intervals[mid][0] <= x:
            lo = mid + 1
        else:
            hi = mid
    # lo is first index with intervals[lo][0] > x
    if lo == 0:
        return False
    return x < intervals[lo - 1][1]
```

This avoids tuple creation and is O(log n). But it's in Python so might be slower than C bisect. Let me stick with the C bisect version.

Actually, I can avoid the tuple creation issue by using a list of just lo values alongside the intervals list. But that complicates maintenance. Let me just use bisect with tuples - it should be fast enough.

Let me also think about whether `bisect_right(intervals, (x, float('inf')))` creates a tuple each call. Yes it does. But that's one tuple allocation per call, 200,000 allocations. That's fine.

Alternative: use bisect_right on a separate list of lo values. Let me maintain `self._lo_values` as a list. Then:
```python
pos = bisect.bisect_right(self._lo_values, x)
```
This avoids tuple comparison entirely. Much faster. But maintaining two lists in sync is annoying.

Actually, let me just go with the tuple approach. For 200,000 calls, even Python-level tuple creation is fine.

Hmm, actually let me benchmark mentally. `bisect.bisect_right` is C-implemented. It calls Python's comparison for each step. Comparing a tuple (x, inf) with tuple (a, b) involves: compare x with a. If not equal, done. This is a C-level float/int comparison. Very fast. 16 steps * 200,000 = 3.2M comparisons. At ~50ns each (C-level), that's 0.16 seconds. The Python overhead for calling bisect_right 200,000 times adds maybe 200,000 * 1μs = 0.2s. Total ~0.4s. Fine.

OK, I'm confident the solution will be fast enough. Let me write the final code.

One more thing: for the `remove` method, I need to handle the case where `left_idx >= right_idx` (no overlap). And I should handle the case where the new_parts list might need the intervals to remain sorted and disjoint. Since we're replacing a contiguous range with parts that are ordered (first a left part from the first interval, possibly a right part from the last interval, with removed intervals in between), the result should still be sorted and disjoint.

Wait, let me think about this more carefully. Suppose we have [(1, 5), (7, 9), (12, 15)] and remove (3, 13).
left_idx: pos = bisect_left(intervals, (3,)). (1,5) < (3,)? 1 < 3, yes. (7,9) < (3,)? 7 > 3, no. pos = 1. intervals[0][1] = 5 > 3? Yes. left_idx = 0.
right_idx = bisect_left(intervals, (13,)). (1,5) < (13,)? yes. (7,9) < (13,)? yes. (12,15) < (13,)? 12 < 13, yes. pos = 3. right_idx = 3.

Process [0, 3):
- (1, 5): a=1 < lo=3? Yes, add (1, 3). b=5 > hi=13? No.
- (7, 9): a=7 < 3? No. b=9 > 13? No. Nothing.
- (12, 15): a=12 < 3? No. b=15 > 13? Yes, add (13, 15).

new_parts = [(1, 3), (13, 15)]. Replace [0:3] with this. Result: [(1, 3), (13, 15)]. Correct!

Another case: [(1, 5), (7, 9), (12, 15)] remove (2, 8).
left_idx: pos = bisect_left(intervals, (2,)) = 1. intervals[0][1] = 5 > 2? Yes. left_idx = 0.
right_idx = bisect_left(intervals, (8,)). (1,5) < (8,)? yes. (7,9) < (8,)? 7 < 8, yes. (12,15) < (8,)? 12 > 8, no. right_idx = 2.

Process [0, 2):
- (1, 5): a=1 < 2? Yes, add (1, 2). b=5 > 8? No.
- (7, 9): a=7 < 2? No. b=9 > 8? Yes, add (8, 9).

new_parts = [(1, 2), (8, 9)]. Result: [(1, 2), (8, 9), (12, 15)]. Correct!

What about removing from the middle of one interval: [(1, 10)] remove (4, 6).
left_idx: pos = bisect_left(intervals, (4,)) = 1. intervals[0][1] = 10 > 4? Yes. left_idx = 0.
right_idx = bisect_left(intervals, (6,)) = 1. (1, 10) < (6,)? 1 < 6, yes. right_idx = 1.

Process [0, 1):
- (1, 10): a=1 < 4? Yes, add (1, 4). b=10 > 6? Yes, add (6, 10).

new_parts = [(1, 4), (6, 10)]. Result: [(1, 4), (6, 10)]. Correct! The interval is split.

Alright, the algorithm handles splitting correctly.

Let me write the final implementation:

```python
import bisect


class IntervalSet:
    __slots__ = ('_intervals',)

    def __init__(self):
        self._intervals: list[tuple] = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect.bisect_left(intervals, (lo,))
        left = pos - 1 if pos > 0 and intervals[pos - 1][1] >= lo else pos
        right = bisect.bisect_right(intervals, (hi, float('inf')))
        if left >= right:
            intervals.insert(left, (lo, hi))
        else:
            merged_lo = min(lo, intervals[left][0])
            merged_hi = max(hi, intervals[right - 1][1])
            intervals[left:right] = [(merged_lo, merged_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        pos = bisect.bisect_left(intervals, (lo,))
        left = pos - 1 if pos > 0 and intervals[pos - 1][1] > lo else pos
        right = bisect.bisect_left(intervals, (hi,))
        if left >= right:
            return
        new_parts = []
        for i in range(left, right):
            a, b = intervals[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        intervals[left:right] = new_parts

    def contains(self, x):
        intervals = self._intervals
        pos = bisect.bisect_right(intervals, (x, float('inf')))
        return pos > 0 and x < intervals[pos - 1][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)
```

Wait, I need to double-check the `add` logic for the case where the interval being added is completely inside an existing interval, and also the touching condition.

For add, the merge condition is: existing interval (a, b) merges with (lo, hi) if b >= lo AND a <= hi.
- b >= lo: the existing interval's right end is at or past our left end (overlapping or touching on left)
- a <= hi: the existing interval's left end is at or before our right end (overlapping or touching on right)

For the `left` computation:
- pos = bisect_left(intervals, (lo,)): first index with a >= lo
- If pos > 0 and intervals[pos-1][1] >= lo: this interval touches/overlaps on the left. Include it.
- Otherwise, left = pos.

For the `right` computation:
- right = bisect_right(intervals, (hi, float('inf'))): first index where (a, b) > (hi, inf)
  - (a, b) > (hi, inf) iff a > hi, or (a == hi and b > inf, impossible for finite b)
  - So first index with a > hi. [0, right) have a <= hi.
- We want intervals with a <= hi to merge. So [0, right) is the candidate set from the right side.

The merge range is [left, right). If left >= right, no merging.

Let me trace through: existing = [(1, 3), (5, 7)], add (3, 5).
pos = bisect_left(intervals, (3,)). (1,3) < (3,)? 1<3, yes. (5,7) < (3,)? 5>3, no. pos = 1.
pos > 0, intervals[0][1] = 3 >= 3? Yes. left = 0.
right = bisect_right(intervals, (5, inf)). (1,3) <= (5,inf)? 1<5, yes. (5,7) <= (5,inf)? 5==5, 7<inf, yes. right = 2.
left=0 < right=2. merged_lo = min(3, 1) = 1. merged_hi = max(5, 7) = 7. Result: [(1, 7)]. ✓

existing = [(1, 3)], add (4, 6). (Don't touch, gap at 3-4.)
pos = bisect_left(intervals, (4,)). (1,3) < (4,)? 1<4, yes. pos = 1.
pos > 0, intervals[0][1] = 3 >= 4? No. left = 1.
right = bisect_right(intervals, (6, inf)). (1,3) <= (6,inf)? yes. right = 1.
left=1 >= right=1. Insert at 1. Result: [(1,3), (4,6)]. ✓

existing = [(1, 5)], add (2, 4). Completely inside.
pos = bisect_left(intervals, (2,)). (1,5) < (2,)? 1<2, yes. pos = 1.
pos > 0, intervals[0][1] = 5 >= 2? Yes. left = 0.
right = bisect_right(intervals, (4, inf)). (1,5) <= (4,inf)? 1<4, yes. right = 1.
left=0 < right=1. merged_lo = min(2, 1) = 1. merged_hi = max(4, 5) = 5. Result: [(1, 5)]. ✓ (No change.)

existing = [(1, 5)], add (0, 10). Completely contains.
pos = bisect_left(intervals, (0,)). (1,5) < (0,)? 1>0, no. pos = 0.
left = 0.
right = bisect_right(intervals, (10, inf)). (1,5) <= (10,inf)? yes. right = 1.
left=0 < right=1. merged_lo = min(0, 1) = 0. merged_hi = max(10, 5) = 10. Result: [(0, 10)]. ✓

Looks good!

One concern: in the `remove` method, I use `bisect_left(intervals, (hi,))` for the right boundary. This gives first index with a >= hi. We want intervals with a < hi (strict, since [a, b) ∩ [lo, hi) ≠ ∅ requires a < hi). So [0, right) have a < hi. Correct.

For the left boundary in remove: `intervals[pos - 1][1] > lo` (strict). Because overlap requires b > lo (strict, since [a, b) ∩ [lo, hi) ≠ ∅ requires b > lo). Correct.

Let me also make sure the `intervals()` method returns a copy so the caller can't modify internal state. `list(self._intervals)` creates a shallow copy (new list, same tuples). Tuples are immutable, so this is fine.

I think the implementation is correct and efficient. Let me finalize it.

Actually, one more thought on performance: in `add`, when we do `intervals[left:right] = [(merged_lo, merged_hi)]`, this is a slice assignment. If the range is large (many intervals to merge), this is O(n) for the list operation. But since we're adding small disjoint intervals in random order, the merge range should typically be 1-2 intervals. So it's fine.

For the 60,000 adds: most will just be `intervals.insert(left, (lo, hi))` (no merging since intervals are disjoint). The insert is O(n) for the memmove but implemented in C. Should be fast enough.

Let me also consider: should I use `bisect.insort` instead of manual insert? `bisect.insort` just does `a.insert(i, x)` after finding i. Same thing. I'll keep the explicit code for clarity.

Final check on the `contains` method with the tuple `(x, float('inf'))`:
- What if `x` is an int? Then the tuple is `(int, float)`. Comparing with `(int, int)` or `(int, float)` or `(float, float)` tuples. Python handles mixed numeric comparisons fine.
- What if `float('inf')` causes issues? It shouldn't for finite interval endpoints.

I'm satisfied with the implementation. Let me write the final version.
