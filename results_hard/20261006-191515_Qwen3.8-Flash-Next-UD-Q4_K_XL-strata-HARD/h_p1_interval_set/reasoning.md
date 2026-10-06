Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
- `add(lo, hi)`: add interval, merge touching/overlapping ones
- `remove(lo, hi)`: remove interval, possibly splitting existing intervals
- `contains(x)`: O(log n) - need binary search
- `total_length()`: sum of lengths
- `intervals()`: return sorted, disjoint, merged list of tuples
- `__len__()`: number of intervals
- O(log n) for contains: need sorted structure with binary search
- Performance: 60k adds of small disjoint intervals in random order + 200k contains in < 5s

For O(log n) `contains()`, I need binary search on sorted intervals. The tricky part is maintaining sorted order during add/remove operations.

Approach: Use a sorted list of intervals. For `contains()`, use `bisect` to find the position.

For `add(lo, hi)`:
1. If lo >= hi, ignore.
2. Find the position where [lo, hi) would go using bisect.
3. Check neighboring intervals for overlap/touching.
4. Merge all overlapping/touching intervals into one.

For `remove(lo, hi)`:
1. If lo >= hi, ignore.
2. Find intervals that overlap with [lo, hi).
3. Trim/split them as needed.

For `contains(x)`:
1. Use bisect to find the rightmost interval with lo <= x.
2. Check if x < hi of that interval.

Let me think about the data structure. I'll use a sorted list of (lo, hi) tuples.

For `contains(x)`:
- I want to find the interval where lo <= x < hi.
- Using bisect: I can search for x in the list of lo values. `bisect_right` on lo values gives me the index after the last lo <= x. So index - 1 gives me the interval with lo <= x. Then check if x < hi.

For `add(lo, hi)`:
- Find the leftmost interval that could overlap or touch [lo, hi). An interval [a, b) overlaps/touches [lo, hi) if b >= lo (touching) and a < hi.
- Use bisect to find where to start checking.
- Actually, for touching: [1,3) and [3,5) should merge. So intervals where hi >= lo and lo < hi (the new interval's hi).
- More precisely, interval [a, b) touches/overlaps [lo, hi) iff b >= lo AND a < hi.

Let me think more carefully:

For add:
- I need to find all intervals that overlap or touch [lo, hi).
- [a, b) overlaps/touches [lo, hi) iff b > lo... wait, [1,3) and [3,5): b=3, lo=3. b >= lo means they touch. So condition is: b >= lo AND a <= hi... no, a < hi.
- Actually [1,3) and [3,5): a=3, hi=3 for the second. Wait no, I'm merging [lo, hi) = [3,5) with existing [1,3). Existing: a=1, b=3. New: lo=3, hi=5. Touch condition: existing hi >= new lo (3 >= 3 ✓) and existing lo < new hi (1 < 5 ✓).
- So condition: existing_b >= new_lo AND existing_a < new_hi.

For the sorted list, I can use bisect on the lo values to find where to start.

Actually, let me think about this differently. I'll maintain a sorted list of intervals by their lo value.

For `contains(x)`:
- Use `bisect_right` on the list of lo values to find the position where x would be inserted to keep sorted order. This gives the first lo > x. So the candidate interval is at position pos-1.
- Check if pos > 0 and intervals[pos-1][1] > x (i.e., x < hi).
- Wait, for half-open [lo, hi), x is in the interval if lo <= x < hi.
- `bisect_right(lo_list, x)` gives the index where x would be inserted to keep sorted, after any equal elements. So all lo values at indices < pos are <= x. The candidate is at pos-1.
- Check: pos > 0 AND intervals[pos-1][0] <= x AND x < intervals[pos-1][1].
- Since we used bisect_right, intervals[pos-1][0] <= x is guaranteed (if pos > 0).

For `add(lo, hi)`:
- Find the range of intervals to merge with.
- I need to find intervals where existing_hi >= lo (touch or overlap from left) and existing_lo < hi (touch or overlap from right).
- Start: find the leftmost interval that could merge. Use bisect to find position, then scan left.
- End: find the rightmost interval that could merge. Use bisect to find position, then scan right.

Actually, let me think of a simpler approach for add:
1. Find the insertion position for lo using bisect_left on lo values.
2. Check the interval before the insertion point (could touch/overlap from the left).
3. Scan forward from insertion point to find all overlapping intervals.
4. Merge them all.

Let me code this up:

```python
from bisect import bisect_left, bisect_right
import bisect

class IntervalSet:
    def __init__(self):
        self._ivs = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find the leftmost interval that might overlap or touch
        # An interval [a,b) touches [lo,hi) if b >= lo (and a < hi)
        # Use bisect_right on lo values to find where lo would go
        # Actually, find the first interval where hi >= lo
        
        # Simpler: find insertion point for (lo, hi) in sorted order
        # Then check left neighbor and scan right
        
        lo_vals = [iv[0] for iv in self._ivs]
        # Actually rebuilding this list each time is O(n). Let me use bisect differently.
        
        # bisect_left on lo values: finds first index where lo_vals[i] >= lo
        # bisect_right: first index where lo_vals[i] > lo
        
        # For finding intervals that overlap/touch [lo, hi):
        # Need intervals where existing_hi >= lo AND existing_lo < hi
        
        # To find left boundary: the interval just before where lo would be inserted
        # might have hi >= lo. So start checking from pos-1.
        
        pos = bisect.bisect_left(self._ivs, (lo, float('inf')))
        # Hmm, comparing tuples... this gets complicated.
        
        # Let me use a different approach. Since intervals are sorted by lo,
        # and they're disjoint, I can use bisect on just the lo values.
```

Wait, I can't use bisect directly on a list of tuples with mixed int/float. Let me think...

Actually, Python's bisect works on lists. If I have a list of (lo, hi) tuples sorted by lo, I can use bisect with a key or with manual comparison.

Actually in Python 3.10+, bisect has a `key` parameter. But let me check - yes, `bisect` module in Python 3.10+ supports `key`.

Alternatively, I can maintain a separate list of lo values for binary search. But that's O(n) to maintain.

Better approach: use bisect with a custom approach. Since intervals are sorted by lo, I can use `bisect_left` with a sentinel.

Actually, the simplest approach: store intervals as a sorted list. For bisect, I'll use `bisect_left` with a tuple `(lo, float('inf'))` - this works because tuples compare element-wise, and `(lo, inf)` will be greater than any `(lo, hi)` where hi < inf.

Wait, but with mixed int/float, tuple comparison should work fine in Python.

Let me reconsider. For `contains(x)`:
- I want to find the rightmost interval with lo <= x.
- `bisect_right(lo_list, x)` gives first index where lo > x, so pos-1 is the candidate.

For the list of intervals sorted by lo, I can create a helper list of lo values. But maintaining it is costly.

Alternative: use `bisect` on the list of tuples directly. `bisect_right(self._ivs, (x, float('inf')))` gives the first interval where lo > x (since (x, inf) > (x, any_finite)). Then pos-1 is the candidate.

Wait: `bisect_right` with `(x, float('inf'))` - this finds the rightmost position where `(x, inf)` can be inserted. Since `(x, inf) > (x, hi)` for any finite hi, and `(x, inf) < (x+eps, anything)`, this gives the first index where lo > x. 

Actually wait, I need to be more careful. `bisect_right(a, x)` returns the insertion point to the right of any existing entries equal to x. So `bisect_right(self._ivs, (x, float('inf')))` - this will be placed after any tuple `(x, hi)` since `(x, inf) > (x, hi)`. And before any tuple `(x', hi')` where `x' > x`. So yes, it gives the first index where lo > x.

But what about float comparisons with ints? In Python, `1 == 1.0` is True, and `1 < 1.5` is True. Tuple comparison works element-wise. So `(1, 5.0) < (1, 6.0)` is True, and `(1, 5.0) < (2, 1)` is True. This should work fine.

Let me now code the full solution:

```python
from bisect import bisect_left, bisect_right
from collections import namedtuple
import math

class IntervalSet:
    def __init__(self):
        self._ivs = []  # sorted list of [lo, hi) tuples, sorted by lo
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find where to start merging
        # We need to find all intervals that overlap or touch [lo, hi)
        # [a, b) touches/overlaps [lo, hi) iff b >= lo and a < hi
        # (touching: [1,3) and [3,5) -> b=3, lo=3, b >= lo ✓)
        
        # Find the first interval that could overlap: the one at position
        # where we insert lo. The one just before might also touch (hi >= lo).
        
        # Find insertion point for lo in the lo-values
        # Using bisect_right with (lo, inf) to find first interval with lo_val > lo
        # Actually, let's use bisect_left with (lo, -inf)... no that's wrong.
        
        # Let's find the leftmost interval that might merge.
        # An interval [a,b) can merge with [lo,hi) if b >= lo AND a < hi.
        # Since intervals are sorted by lo and disjoint, intervals before pos-1
        # have their hi < lo (otherwise they'd overlap with interval at pos-1
        # or the one at pos). Actually that's not quite right either.
        
        # Simple approach: find pos = first index where lo_val >= lo (bisect_left)
        # Check pos-1: if its hi >= lo, it merges.
        # Check pos onwards: if its lo < hi, it merges.
        
        # bisect on tuples: bisect_left(self._ivs, (lo, -inf)) would give
        # the first interval with lo_val > lo... no, (lo, -inf) < (lo, anything_positive).
        # Actually (lo, -inf) < (lo, hi) for any hi > -inf. So bisect_left with (lo, -inf)
        # gives first index where iv[0] > lo... no.
        
        # Ugh, tuple comparison is tricky here. Let me just use a different approach.
        # I'll use bisect_right with key... or just use a simpler method.
        
        # Actually, let's use bisect_left with a sentinel value that's less than
        # any (lo, hi) tuple with that lo value.
        # (lo, float('-inf')) - this is less than (lo, anything) since -inf < anything.
        # bisect_left(self._ivs, (lo, float('-inf'))) gives the first index where
        # (iv[0], iv[1]) >= (lo, -inf), which is the first index where iv[0] >= lo
        # (since if iv[0] == lo, (lo, iv[1]) > (lo, -inf) for any finite iv[1]).
        
        # Wait, what if iv[1] is -inf? That can't happen since lo < hi.
        # What if lo is -inf? Then (lo, -inf) = (-inf, -inf) and any interval
        # (a, b) with a > -inf would be greater. With a = -inf, (−inf, b) > (−inf, −inf).
        # So it still works.
        
        pos = bisect_left(self._ivs, (lo, float('-inf')))
        
        # Check if interval at pos-1 touches/overlaps
        if pos > 0 and self._ivs[pos - 1][1] >= lo:
            pos -= 1
        
        # Now scan forward to find all merging intervals
        new_lo = lo
        new_hi = hi
        end = pos
        
        while end < len(self._ivs) and self._ivs[end][0] < hi:  # Note: should be new_hi
            new_lo = min(new_lo, self._ivs[end][0])
            new_hi = max(new_hi, self._ivs[end][1])
            end += 1
        
        # Replace intervals from pos to end-1 with merged interval
        # But new_lo might be less than lo if pos was decremented
        if pos < end:
            # Check if the interval at pos (which might be pos after decrement) 
            # actually needs merging
            # Actually if pos was decremented, we know ivs[pos][1] >= lo, and 
            # ivs[pos][0] <= lo < hi, so it definitely overlaps/touches.
            new_lo = min(new_lo, self._ivs[pos][0]) if pos < len(self._ivs) else new_lo
            # Hmm this is getting convoluted. Let me redo.
        
        # Let me restart the add method more carefully.
        pass
```

Let me restart and think more carefully.

For `add(lo, hi)`:
1. Find the range of intervals to merge.
2. Compute new merged interval.
3. Replace the range with the new interval.

Finding the range:
- Start: Find the first interval that overlaps or touches [lo, hi). Since intervals are sorted by lo and disjoint, I can find the position where lo would be inserted, then check one to the left.
- End: Find the last interval that overlaps or touches [lo, hi). Scan right from start while iv.lo < hi (or more precisely, while iv.lo < new_hi since merging might extend the right boundary... actually no, since we're adding [lo, hi), we only merge with intervals whose lo < hi).

Wait, actually since we're finding intervals to merge with [lo, hi), and the condition is iv.lo < hi AND iv.hi >= lo. Since we start from the leftmost candidate, and intervals are sorted by lo, once we find iv.lo >= hi, all subsequent intervals also have lo >= hi, so we stop.

But we also need to check the left boundary: the interval just before our search position might have hi >= lo (touching from the left).

Let me redo:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find first interval with lo_val >= lo (could be the start of merge)
    # Using bisect_left on the tuple comparison
    # (lo, float('-inf')) < (lo, hi) for any finite hi, so bisect_left gives
    # first index where iv[0] > lo OR (iv[0] == lo AND iv[1] > -inf, i.e., always true for valid intervals)
    # Actually this just gives first index where iv[0] >= lo.
    
    pos = bisect_left(self._ivs, (lo, float('-inf')))
    
    # Check left neighbor: if it touches [lo, hi), include it
    start = pos
    if start > 0 and self._ivs[start - 1][1] >= lo:
        start -= 1
    
    # Find end: scan right while interval's lo < hi
    end = pos  # start scanning from pos (the interval at start might not need merging from right)
    # Actually, start scanning from start
    new_lo = lo
    new_hi = hi
    
    # Include interval at start if it overlaps
    if start < len(self._ivs) and self._ivs[start][0] < hi:
        new_lo = min(new_lo, self._ivs[start][0])
        new_hi = max(new_hi, self._ivs[start][1])
        end = start + 1
        # Continue scanning
        while end < len(self._ivs) and self._ivs[end][0] < new_hi:
            new_hi = max(new_hi, self._ivs[end][1])
            end += 1
    else:
        end = start  # nothing to merge, just insert
    
    # But wait, if start was decremented, the interval at start definitely
    # has hi >= lo. Does it have lo < hi? Yes, since lo < hi (our parameter)
    # and iv[0] <= lo < hi (since iv is sorted and iv[0] < lo or iv[0] == lo).
    # Actually if iv[0] == lo, then iv[0] < hi since lo < hi. If iv[0] < lo, 
    # then iv[0] < lo < hi. So yes, iv[0] < hi is always true for start.
    
    # Hmm but I need to handle the case where start == pos and the interval at
    # pos doesn't overlap (its lo >= hi). In that case, end = start = pos, 
    # and we just insert new (lo, hi) at pos.
    
    # Let me simplify:
    end = start
    while end < len(self._ivs) and self._ivs[end][0] < hi:
        new_lo = min(new_lo, self._ivs[end][0])
        new_hi = max(new_hi, self._ivs[end][1])
        end += 1
    
    # Replace self._ivs[start:end] with [(new_lo, new_hi)]
    self._ivs[start:end] = [(new_lo, new_hi)]
```

Wait, there's an issue. When I check `self._ivs[end][0] < hi`, I should use `new_hi` not `hi`, because merging with one interval might extend the boundary to cover another. 

Actually no! Since I'm merging [lo, hi) with existing intervals, the merged region is the union of [lo, hi) and all overlapping existing intervals. An existing interval [a, b) overlaps/touches the merged region if a < current_hi and b > current_lo. Since we scan left-to-right, and all intervals are sorted by lo, once we find an interval with lo >= current_hi, all subsequent ones also have lo >= current_hi (since they're sorted). So we stop.

But current_hi can increase as we merge! So I should check `self._ivs[end][0] < new_hi` not `< hi`.

```python
end = start
while end < len(self._ivs) and self._ivs[end][0] < new_hi:
    new_lo = min(new_lo, self._ivs[end][0])
    new_hi = max(new_hi, self._ivs[end][1])
    end += 1
```

But wait, if start was decremented (the left neighbor touched), then new_lo would be updated to ivs[start][0] and new_hi to max(hi, ivs[start][1]). Then scanning from start+1 or start? Let me include start in the while loop:

```python
new_lo = lo
new_hi = hi
end = start
while end < len(self._ivs) and self._ivs[end][0] < new_hi:
    new_lo = min(new_lo, self._ivs[end][0])
    new_hi = max(new_hi, self._ivs[end][1])
    end += 1
self._ivs[start:end] = [(new_lo, new_hi)]
```

This works because:
- If start == pos and ivs[pos].lo >= hi (original hi), then the while condition fails immediately (since new_hi = hi and ivs[pos].lo >= hi), and we insert (lo, hi) at position pos. end = start = pos, so `self._ivs[pos:pos] = [(lo, hi)]` which inserts. ✓
- If start was decremented, ivs[start].hi >= lo and ivs[start].lo < lo < hi, so ivs[start].lo < new_hi (= hi). The while loop includes it. ✓

Hmm wait, one edge case: what if start was decremented and `self._ivs[start][0] >= new_hi`? That can't happen because ivs[start].lo < lo < hi = new_hi.

OK, I think this works. But there's another issue: `bisect_left(self._ivs, (lo, float('-inf')))`. With mixed int/float, will this work correctly?

Python compares `(1, float('-inf'))` with `(1.0, 5)`: `1 == 1.0` is True, then `float('-inf') < 5` is True, so `(1, -inf) < (1.0, 5)` is True. Good.

What about `(1.5, float('-inf'))` vs `(1, 5)`: `1.5 > 1`, so `(1.5, -inf) > (1, 5)`. Good.

What about integer 0 vs float -inf: `0 > float('-inf')`. Good.

I think tuple comparison handles mixed int/float fine in Python.

Now for `remove(lo, hi)`:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    # Find intervals that overlap with [lo, hi)
    # Need to: trim left, trim right, or remove entirely, possibly splitting
    
    # Find first interval that might overlap
    pos = bisect_left(self._ivs, (lo, float('-inf')))
    
    # Check left neighbor
    if pos > 0 and self._ivs[pos - 1][1] > lo:
        pos -= 1
    
    # Scan and modify
    new_ivs = []
    i = 0
    while i < len(self._ivs):
        a, b = self._ivs[i]
        if i < pos:
            new_ivs.append((a, b))
        elif a >= hi:
            new_ivs.append((a, b))
        elif b <= lo:
            new_ivs.append((a, b))
        else:
            # [a, b) overlaps with [lo, hi)
            # Left remainder: [a, min(b, lo)) if a < lo
            if a < lo:
                new_ivs.append((a, lo))
            # Right remainder: [max(a, hi), b) if hi < b
            if hi < b:
                new_ivs.append((hi, b))
        i += 1
    
    self._ivs = new_ivs
```

Wait, this is O(n) for remove. For the performance requirement, we need 60k adds. But the requirement says contains() must be O(log n), and the 60k adds + 200k contains should be under 5s. It doesn't say add must be O(log n).

Actually, let me re-read: "60 000 add() calls of small disjoint intervals in random order followed by 200 000 contains() calls must take well under 5 seconds."

If the intervals are disjoint (no merging), then each add just does a binary search + list insert, which is O(n) for the list insert. 60k * 60k = 3.6 billion... that's too slow.

Hmm, but Python list insertion in the middle is O(n) due to shifting. 60000 inserts, average shift of 30000 elements each = 1.8 billion element moves. In CPython, list element moves are fast (it's C-level memmove), but 1.8 billion might still be too slow.

Actually, 60000 inserts into a list. Each insert at a random position. Average position is n/2. Total work = sum from k=0 to 59999 of k/2 ≈ 60000²/4 = 900 million element moves. Each element move is a pointer copy (8 bytes). On modern hardware, this might take ~1-2 seconds. Should be OK.

But wait, we also need to maintain the list. Let me think about whether we can use a different data structure.

For 60k elements, even O(n) insert is manageable in Python if the constant factor is low. `bisect.insort` on a list of 60k tuples... each insert shifts on average 30k elements. 60000 * 30000 = 1.8 billion pointer copies. At maybe 5ns per copy (C-level), that's ~9 seconds. Hmm, might be too slow.

Actually, let me reconsider. In CPython, list.insert does a memmove of pointers. memmove is very fast, maybe 1ns per 8-byte pointer for L1/L2 cache. 1.8 billion * 1ns = 1.8 seconds. Plus the binary search overhead. Should be under 5 seconds.

Actually, I recall that Python list operations, even with memmove, can be surprisingly fast. Let me not over-optimize and just use a sorted list.

But there's an issue with `bisect` on a list of tuples with mixed int/float. Let me test mentally: `bisect_left([(1, 3), (5, 7)], (2, float('-inf')))`. Compare (2, -inf) with (1, 3): 2 > 1, so (2, -inf) > (1, 3). Compare (2, -inf) with (5, 7): 2 < 5, so (2, -inf) < (5, 7). Result: insertion at index 1. Correct!

`bisect_left([(1, 3), (5, 7)], (3, float('-inf')))`. Compare (3, -inf) with (1, 3): 3 > 1, greater. Compare (3, -inf) with (5, 7): 3 < 5, less. Result: index 1. Correct!

What about `bisect_left([(1.0, 3.0), (5, 7)], (1, float('-inf')))`. Compare (1, -inf) with (1.0, 3.0): 1 == 1.0, -inf < 3.0, so less. Then compare with (5, 7): 1 < 5, less. Result: index 0. Correct!

OK so bisect on tuples works. But there might be issues with NaN, which I'll ignore.

Now, there's a subtle issue with `bisect_left` on tuples when we want to find "first interval with lo_val >= lo". Using `(lo, float('-inf'))`: this is less than any `(lo_val, hi_val)` where lo_val == lo (since -inf < any hi_val). And it's greater than any `(lo_val, hi_val)` where lo_val < lo. So `bisect_left` gives the first index where lo_val >= lo. ✓

For `contains(x)`:
```python
def contains(self, x):
    # Find rightmost interval with lo <= x
    # bisect_right on (x, inf) gives first index with lo_val > x
    pos = bisect_right(self._ivs, (x, float('inf')))
    if pos == 0:
        return False
    lo, hi = self._ivs[pos - 1]
    return lo <= x < hi  # lo <= x is guaranteed by bisect, so just x < hi
```

Wait, `bisect_right(self._ivs, (x, float('inf')))` - this finds the rightmost position to insert `(x, inf)`. Since `(x, inf) > (x, any_finite)`, this is placed after any interval with lo == x. And before any interval with lo > x. So pos = first index with lo > x. Then pos-1 is the last interval with lo <= x. ✓

But actually, since we're looking for lo <= x, and pos is first with lo > x, then for all i < pos, ivs[i][0] <= x. So ivs[pos-1][0] <= x. We just need to check x < ivs[pos-1][1].

Let me simplify: `return pos > 0 and x < self._ivs[pos - 1][1]`

For `intervals()`: just return a copy of the list.

For `__len__()`: return len(self._ivs).

For `total_length()`: sum of (hi - lo) for all intervals. Could cache this, but let's keep it simple.

Actually, for performance of 200k contains() calls, each containing() does a binary search (O(log 60000) ≈ 16 comparisons) + one list access. 200000 * 16 = 3.2 million tuple comparisons. Should be fast.

Let me also think about whether the `add` method handles edge cases:
- Adding [1, 3) to empty set: pos=0, start=0, while loop: 0 < len([]) is False, so end=0. `self._ivs[0:0] = [(1,3)]` → inserts. ✓
- Adding [5, 7) when set has [(1,3)]: pos = bisect_left([(1,3)], (5, -inf)) = 1. start=1. Check ivs[0][1]=3 >= 5? No. while: 1 < 1 is False. `self._ivs[1:1] = [(5,7)]` → [(1,3), (5,7)]. ✓
- Adding [3, 5) when set has [(1,3), (5,7)]: pos = bisect_left([(1,3),(5,7)], (3, -inf)). Compare (3,-inf) with (1,3): 3>1, greater. Compare with (5,7): 3<5, less. pos=1. Check ivs[0][1]=3 >= 3? Yes! start=0. While: ivs[0]=(1,3), 1 < new_hi=5? Yes. new_lo=min(3,1)=1, new_hi=max(5,3)=5. end=1. ivs[1]=(5,7), 5 < 5? No. Stop. `self._ivs[0:1] = [(1,5)]` → [(1,5), (5,7)]. 

Wait! But [1,5) and [5,7) should be merged (they touch)! My condition is `self._ivs[end][0] < new_hi`, which is `5 < 5` = False. So it doesn't merge with (5,7).

The touching condition: [1,5) and [5,7) touch. The merged interval should be [1,7). The condition for touching/overlap is `b >= lo` (existing hi >= new lo) and `a < hi` (existing lo < new hi). For [5,7) and merged [1,5): a=5, b=7, lo=1, hi=5. a < hi → 5 < 5 → False!

Hmm, so [5,7) doesn't overlap/touch [1,5) under the "a < hi" condition? But they should merge!

The issue is that when we merge [1,3) with [3,5), we get [1,5). Now [1,5) and [5,7) touch. The condition should be `a <= hi` (not `a < hi`) for touching.

Wait, let me reconsider. Half-open intervals [lo, hi) and [a, b) overlap or touch iff NOT (hi <= a OR b <= lo). Touch means hi == a or lo == b. So:
- Overlap/touch iff: hi > a AND b > lo.
- Touch specifically: hi == a or b == lo.

So the condition should be `self._ivs[end][0] < new_hi` → should be `self._ivs[end][0] <= new_hi` for touching!

Let me verify: [1,3) and [3,5): existing (1,3), new (3,5). Condition: 1 <= 5 AND 3 >= 3. Both true. ✓
[1,3) and [4,5): existing (1,3), new (4,5). Condition: 1 <= 5 AND 3 >= 4. 3 >= 4 is False. ✓ (don't merge)
[5,7) and [1,5): existing (5,7), new [1,5). Condition: 5 <= 5 AND 7 >= 1. Both true. Should merge! ✓

So I need `<=` not `<` for the touching condition. Let me fix:

In the while loop: `self._ivs[end][0] <= new_hi` (not `<`).

And for the left check: `self._ivs[start-1][1] >= lo` (not `>`). This is already `>=`. ✓

Let me re-verify the earlier example:
- Adding [3, 5) when set has [(1,3), (5,7)]: pos=1, start=0 (because ivs[0][1]=3 >= 3).
- While: ivs[0]=(1,3), 1 <= 5? Yes. new_lo=1, new_hi=5. end=1.
- ivs[1]=(5,7), 5 <= 5? Yes! new_lo=1, new_hi=7. end=2.
- end=2 = len. Stop.
- `self._ivs[0:2] = [(1,7)]` → [(1,7)]. ✓

And for contains(): [1,7) contains x=3? bisect_right([(1,7)], (3, inf)). Compare (3,inf) with (1,7): 3>1, greater. pos=1. ivs[0]=(1,7). 1<=3<7? Yes. ✓

Now let me also reconsider `contains` with the touching issue. If we have [(1,5), (5,7)] (which shouldn't happen since we merge touching intervals, but just in case), contains(5) should be True (in [5,7)). bisect_right([(1,5),(5,7)], (5,inf)): compare (5,inf) with (1,5): 5>1, greater. compare with (5,7): 5==5, inf>7, greater. pos=2. ivs[1]=(5,7). 5<=5<7? Yes. ✓.

But since we always merge touching intervals, this case won't arise.

Actually wait, I need to double-check: does my add always merge touching intervals? The condition `self._ivs[end][0] <= new_hi` handles the right side. The condition `self._ivs[start-1][1] >= lo` handles the left side. 

What about after a remove that creates touching intervals? No, remove only removes, it doesn't create new touching intervals. The remaining intervals after a remove are still disjoint and non-touching (since we only cut from existing intervals).

Wait actually, can remove create touching intervals? If we have [(1,3), (3,5)] (which shouldn't exist since they'd be merged), and remove [3,3) (empty, ignored). No issue. If we remove [2,4) from [(1,5)], we get [(1,2), (4,5)]. These don't touch. Remove can never create touching intervals.

OK, I think the logic is correct. Let me also make sure `intervals()` returns tuples, not lists.

One more thing: the problem says "Keep the original values (no rounding)." This means if you add (1, 3.0), the interval should store (1, 3.0), not (1, 3). Since Python preserves int vs float in tuples, this should be fine as long as we don't do arithmetic that changes types.

Wait, in `total_length()`, if we have intervals with int bounds, `hi - lo` gives int. If float bounds, gives float. Mixed? `(3.0 - 1)` gives `2.0`. That's fine.

In `add`, we do `min(new_lo, self._ivs[end][0])` and `max(new_hi, self._ivs[end][1])`. If both are ints, result is int. If one is float, result is float. That's fine.

Let me also handle the edge case in remove: what if we have [(1,3), (5,7)] and remove [2,6)?
- pos = bisect_left([(1,3),(5,7)], (2, -inf)). Compare (2,-inf) with (1,3): 2>1, greater. Compare with (5,7): 2<5, less. pos=1.
- Check ivs[0][1]=3 > 2? Yes. pos=0.
- Iterate:
  - i=0: (1,3). a=1 < lo=2, so add (1,2). b=3 <= hi=6, so no right part. → (1,2)
  - i=1: (5,7). a=5 >= lo=2 and a=5 < hi=6. b=7 > hi=6, so add (6,7). → (6,7)
- Result: [(1,2), (6,7)]. ✓

Another case: remove [0, 10) from [(1,3), (5,7)]:
- pos = bisect_left([(1,3),(5,7)], (0, -inf)). Compare (0,-inf) with (1,3): 0<1, less. pos=0.
- No left neighbor. pos=0.
- i=0: (1,3). a=1 >= lo=0 and a=1 < hi=10. b=3 <= lo=0? No. b=3 <= hi=10, so no right part. a < lo? 1 < 0? No. → nothing.
- i=1: (5,7). Similarly nothing.
- Result: []. ✓

Another case: remove [2,3) from [(1,5)]:
- pos = bisect_left([(1,5)], (2, -inf)). Compare (2,-inf) with (1,5): 2>1, greater. pos=1.
- Check ivs[0][1]=5 > 2? Yes. pos=0.
- i=0: (1,5). a=1 < lo=2, add (1,2). b=5 > hi=3, add (3,5). → [(1,2), (3,5)]. ✓

Great. Now let me think about performance once more.

For 60k adds of small disjoint intervals in random order:
- Each add does a bisect (O(log n)) and then a list slice assignment.
- The list slice assignment `self._ivs[start:end] = [(new_lo, new_hi)]` with start==end is essentially an insert, which is O(n) due to memmove.
- 60k inserts into a growing list: total memmove work is sum of k for k=0 to 59999 ≈ 1.8 billion pointer copies.
- In CPython, this is done via memmove in C, which should be ~1-2 seconds for 60k elements.

Actually, I just realized there might be an issue. For 60k small disjoint intervals added in random order, each add finds no overlapping interval, so it's just a binary search + insert. The insert at a random position in a list of size k costs O(k). Total: sum(k) for k=0..59999 ≈ 1.8 billion. Each operation is an 8-byte pointer move. memmove should do this at maybe 10 GB/s, so 1.8B * 8B / 10GB/s ≈ 1.4 seconds. Plus Python overhead for the function calls, comparisons, etc. Should be under 5 seconds.

For 200k contains: each does bisect_right (O(log 60k) ≈ 16 comparisons) + one list access. 200k * 16 = 3.2M tuple comparisons. At maybe 100ns each (Python), that's 0.32 seconds. Total well under 5 seconds.

I think the solution is fine. Let me also add `__contains__` as an alias for `contains` for convenience (Python's `in` operator). Actually the problem only asks for `contains(x)`, not `__contains__`. I'll just implement what's asked.

Let me also think about whether I need `__contains__`. The problem says `contains(x) -> bool`. I'll just implement that. But adding `__contains__ = contains` would be a nice touch and costs nothing.

Actually wait, I should not add extra methods not asked for. Let me stick to the spec.

One more thing: the problem says `intervals() -> list[tuple]`. I should return a list of tuples. Since I store tuples, I just return a copy.

Let me write the final code:

```python
from bisect import bisect_left, bisect_right


class IntervalSet:
    def __init__(self):
        self._ivs = []

    def add(self, lo, hi):
        if lo >= hi:
            return
        pos = bisect_left(self._ivs, (lo, float('-inf')))
        start = pos
        if start > 0 and self._ivs[start - 1][1] >= lo:
            start -= 1
        new_lo, new_hi = lo, hi
        end = start
        while end < len(self._ivs) and self._ivs[end][0] <= new_hi:
            new_lo = min(new_lo, self._ivs[end][0])
            new_hi = max(new_hi, self._ivs[end][1])
            end += 1
        self._ivs[start:end] = [(new_lo, new_hi)]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        pos = bisect_left(self._ivs, (lo, float('-inf')))
        if pos > 0 and self._ivs[pos - 1][1] > lo:
            pos -= 1
        result = []
        for a, b in self._ivs:
            if b <= lo or a >= hi:
                result.append((a, b))
            else:
                if a < lo:
                    result.append((a, lo))
                if hi < b:
                    result.append((hi, b))
        self._ivs = result

    def contains(self, x):
        pos = bisect_right(self._ivs, (x, float('inf')))
        return pos > 0 and x < self._ivs[pos - 1][1]

    def total_length(self):
        return sum(hi - lo for lo, hi in self._ivs)

    def intervals(self):
        return list(self._ivs)

    def __len__(self):
        return len(self._ivs)
```

Wait, I should double-check the `contains` for edge cases:
- Empty set: pos = bisect_right([], (x, inf)) = 0. Return False. ✓
- x < all lo values: pos = 0. Return False. ✓
- x == lo of some interval: pos = bisect_right finds first lo > x. If x == ivs[i][0], then (x, inf) > (x, any_hi), so pos > i. ivs[pos-1] could be the interval at i. Check x < hi. Since lo <= x (it equals lo) and x < hi (since lo < hi). True. ✓
- x == hi of some interval: x is NOT in [lo, hi). bisect_right gives pos where lo > x. ivs[pos-1] has lo <= x. But hi = x, so x < hi is False. Return False. ✓

One more edge: what about negative infinity or positive infinity as bounds? The problem says "real numbers", which could include infinity. Let me check:
- `float('-inf') < float('inf')` → True, so [-inf, inf) is valid.
- `add(float('-inf'), float('inf'))`: pos = bisect_left([], (inf, -inf))... wait no, lo=-inf, hi=inf. `bisect_left([], (float('-inf'), float('-inf')))`. List is empty, returns 0. Then the while loop: 0 < 0 is False. Insert. self._ivs = [(-inf, inf)].
- `contains(0)`: bisect_right([(-inf, inf)], (0, inf)). Compare (0, inf) with (-inf, inf): 0 > -inf, greater. pos=1. ivs[0]=(-inf, inf). 0 < inf. True. ✓

What about `add(float('inf'), 5)`: lo >= hi since inf >= 5. Ignored. ✓

What about using `float('-inf')` in the bisect_left sentinel when lo itself is `-inf`?
`bisect_left(self._ivs, (float('-inf'), float('-inf')))`. If self._ivs has (−inf, 3): compare (−inf, −inf) with (−inf, 3): first elements equal, second: −inf < 3, so (−inf, −inf) < (−inf, 3). bisect_left returns 0. Correct!

What if self._ivs has (−inf, −inf)? That can't happen since we require lo < hi.

I think this is solid. Let me also consider: what if we add [1, 5) then add [3, 7)? 
- pos = bisect_left([(1,5)], (3, -inf)). Compare (3,-inf) with (1,5): 3>1, greater. pos=1.
- start=1. Check ivs[0][1]=5 >= 3? Yes. start=0.
- While: ivs[0]=(1,5), 1 <= 7? Yes. new_lo=1, new_hi=7. end=1.
- end=1=len. Stop.
- self._ivs[0:1] = [(1,7)]. Result: [(1,7)]. ✓

What about add [1, 5) then add [2, 3)?
- pos = bisect_left([(1,5)], (2, -inf)). Compare with (1,5): 2>1, greater. pos=1.
- start=1. Check ivs[0][1]=5 >= 2? Yes. start=0.
- While: ivs[0]=(1,5), 1 <= 3? Yes. new_lo=min(2,1)=1, new_hi=max(3,5)=5. end=1.
- self._ivs[0:1] = [(1,5)]. No change. ✓ (Adding a subset doesn't change the set)

What about add [1, 5) then add [5, 8)?
- pos = bisect_left([(1,5)], (5, -inf)). Compare (5,-inf) with (1,5): 5>1, greater. pos=1.
- start=1. Check ivs[0][1]=5 >= 5? Yes! start=0.
- While: ivs[0]=(1,5), 1 <= 8? Yes. new_lo=1, new_hi=max(8,5)=8. end=1.
- self._ivs[0:1] = [(1,8)]. Result: [(1,8)]. ✓ (Touching intervals merged)

I'm satisfied the logic is correct. Let me finalize.

Actually, one more thought on performance. The `remove` method iterates over all intervals O(n). For the performance test, it's only add and contains, so remove's O(n) is fine.

Also, I want to make sure that `bisect_left` with tuple comparison handles the case where we have intervals like [(1, 3), (3, 5)] - oh wait, we never store touching intervals since we always merge. So this shouldn't arise.

But what if someone constructs it differently? No, the only way to add intervals is through `add()` which merges touching ones. And `remove` only splits/removes, never creates touching intervals (since it removes from the middle of existing intervals).

I'm confident the solution is correct and performant. Let me write the final version.
