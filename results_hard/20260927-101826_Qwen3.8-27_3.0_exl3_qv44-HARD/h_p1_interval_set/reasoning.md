Let me think about this carefully.

We need an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
1. `add(lo, hi)` - add interval, ignore if lo >= hi
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, disjoint, merged (touching intervals merged)
6. `__len__()` - number of intervals
7. Bounds may be ints or floats, keep original values
8. Performance: 60,000 add() calls of small disjoint intervals in random order, then 200,000 contains() calls must be well under 5 seconds.

The performance requirement is critical. 60,000 add() calls of small disjoint intervals in random order. This means we can't use a simple list (O(n) for each add would be O(n²) = 3.6 billion operations).

We need a balanced BST or sorted structure. Since we only have the standard library, we can use `bisect` module with a list, but that would be O(n) for insertions.

Wait, let me reconsider. 60,000 add() calls. If we use a list with bisect, each insertion is O(n) for the list manipulation (shifting elements). 60,000 * 60,000 / 2 = 1.8 billion shifts... that's too slow.

Actually, let me reconsider. With `bisect`, insertion into a list is O(n) for the shift. 60,000 insertions into a list of up to 60,000 elements means about 60,000 * 60,000 / 2 = 1.8 billion element shifts. That's way too slow.

Options:
1. Use a balanced BST - but standard library doesn't have one directly.
2. Use `sortedcontainers` - not standard library.
3. Use a segment tree or interval tree.
4. Use a list but be smart about it.

Wait, actually let me reconsider the performance. 60,000 adds of small disjoint intervals. If they're disjoint, each add just inserts one interval. With a list, insertion is O(n) due to shifting. 60,000 * 60,000 / 2 ≈ 1.8 billion operations. That's too slow in Python.

Alternative: Use a sorted list but batch operations? No, the API requires individual add() calls.

What about using a different data structure? 

Actually, in Python, list insertion (via `list.insert()`) is implemented in C and is quite fast. Let me think about the actual cost. For 60,000 insertions into a list of average size 30,000, that's 60,000 * 30,000 = 1.8 billion pointer moves. In C, moving pointers is very fast - maybe 1-2 nanoseconds per pointer move. So 1.8 billion * 1.5ns ≈ 2.7 seconds. That might be borderline.

Actually, `list.insert()` in CPython moves elements by `memmove` which is highly optimized. Let me reconsider: 60,000 inserts, average list size 30,000. Each insert moves ~30,000 pointers (8 bytes each = 240KB). memmove of 240KB is very fast, maybe 1-2 microseconds. So 60,000 * 2μs = 120ms. That's fine!

Wait, actually the `memmove` for 240KB would be maybe 1-2 microseconds on modern hardware. So 60,000 * 2μs = 120ms. That's well under 5 seconds.

But we also need to handle merging. When we add an interval, we need to find overlapping intervals and merge them. With a sorted list, we can use bisect to find the position, then check neighbors.

Let me think about the algorithm for `add(lo, hi)`:
1. If lo >= hi, return.
2. Find the position where lo would be inserted (using bisect on the list of lo values).
3. Check the interval at position pos-1 (if exists) - does it overlap or touch?
4. Check the interval at position pos (if exists) - does it overlap or touch?
5. Potentially need to merge with multiple intervals (if the new interval spans multiple existing intervals).
6. Remove overlapping intervals and insert the merged interval.

For `contains(x)`:
- Use bisect to find the right interval. O(log n).

Let me think about the data structure more carefully.

I'll store intervals as a list of (lo, hi) tuples, always sorted by lo, and non-overlapping (disjoint, and touching intervals merged).

For `add(lo, hi)`:
- If lo >= hi, return
- Use bisect to find where lo fits
- Check the interval before (index i-1) and after (index i) for overlap/touching
- Actually, since intervals are sorted and disjoint, we need to find all intervals that overlap with [lo, hi) or touch it.
- The intervals that could overlap are those where existing_hi > lo and existing_lo < hi (overlap) or existing_hi == lo or existing_lo == hi (touching).
- Actually for merging: we want to merge if existing_lo <= hi and existing_hi >= lo (overlap) OR existing_hi == lo (touching on left) OR existing_lo == hi (touching on right).
- Wait, since intervals are disjoint (non-overlapping) and touching intervals are merged, we just need to check if existing_hi > lo (overlap or touching on left) and existing_lo < hi (overlap or touching on right).
- Actually: two intervals [a,b) and [c,d) are "mergeable" if a <= d and c <= b (they overlap or touch). Since they're already sorted and disjoint, we just need: c <= b and a <= d. Since c >= a (sorted), we need c <= b (they overlap or touch).

Let me reconsider. If intervals are sorted by lo and disjoint (no overlap, no touching), then for a new interval [lo, hi):
- Find the first interval with hi > lo (i.e., the interval that could overlap from the left). This is at most one interval on the left side.
- Then check all intervals starting from there where lo < hi (they overlap or touch).

Actually, since intervals are disjoint and sorted:
- The interval immediately before the insertion point might have hi > lo (overlap/touch from left)
- The interval at the insertion point and subsequent intervals might have lo < hi (overlap/touch from right)

Let me use bisect on the list of lo values to find the insertion point.

Actually, let me use a different approach. I'll maintain a list of (lo, hi) pairs sorted by lo. For `add`:

1. Find position `i` using bisect on lo values where lo would be inserted.
2. Check interval at i-1: if it exists and its hi > lo, then we need to merge (extend lo to the left if the existing lo < lo).
3. Starting from position i (or i-1 if we merged with the left one), check intervals where their lo < hi. Merge them all.
4. Remove the merged intervals and insert the new merged interval.

For `remove(lo, hi)`:
1. Find intervals that overlap with [lo, hi).
2. For each overlapping interval, potentially split it into left and right parts.
3. Remove the overlapping parts.

Let me code this up:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi), sorted by lo, disjoint, no touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find position using bisect on lo values
        # We need to find intervals that overlap or touch [lo, hi)
        # Since intervals are sorted by lo and disjoint:
        # - At most one interval on the left can overlap (the one before insertion point)
        # - Multiple intervals on the right can overlap
        
        # Use bisect to find where lo would go
        i = bisect.bisect_left(self._intervals, (lo, float('inf')))
        # Actually, bisect on tuples compares first element then second.
        # Let me use a different approach - use bisect on a list of lo values.
        
        # Actually, let me just use bisect on the intervals list with (lo, -inf) to find
        # the first interval with lo >= lo. But we need to be careful with tuple comparison.
        
        # Let me maintain a separate list of lo values for bisect.
        # Or I can use bisect with a key... but that's Python 3.10+.
        
        # Actually, I'll use bisect.bisect_left on the list of tuples.
        # (lo, -inf) would find the first interval with lo >= lo... 
        # Wait, (lo, -inf) < (lo, hi) for any hi > -inf.
        # So bisect_left(self._intervals, (lo, float('-inf'))) gives the first interval with lo >= lo.
        # Actually no: (lo, -inf) < (lo, anything_positive) so bisect_left would return the index
        # of the first element >= (lo, -inf), which is the first interval with lo >= lo (since
        # (lo, -inf) < (lo, x) for x > -inf).
        
        # Hmm, let me think again. bisect_left finds the position where to insert (lo, -inf)
        # to maintain sorted order. Since (lo, -inf) < (lo, x) for x > -inf, it would be
        # inserted before any interval with lo == lo. So it gives the first interval with lo >= lo.
        
        # But actually I want the first interval where hi > lo (potential overlap from left).
        # Let me just check i-1 and i onwards.
        
        # Let me use a simpler approach:
        # i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        # This gives the first interval with lo >= lo.
        # Check i-1 for overlap/touch from left.
        # Check i, i+1, ... for overlap/touch from right.
        
        # Actually, I realize I should just use bisect on a list of the lo values.
        # Let me maintain self._los = [lo for lo, hi in self._intervals]
        
        # Or better, let me just use the intervals list directly.
        # bisect.bisect_left(self._intervals, (lo, float('-inf')))
        # This works because tuples are compared element by element.
        
        i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        
        new_lo = lo
        new_hi = hi
        
        # Check left neighbor
        if i > 0:
            prev_lo, prev_hi = self._intervals[i - 1]
            if prev_hi > lo:  # overlap or touch
                new_lo = min(new_lo, prev_lo)
                new_hi = max(new_hi, prev_hi)
                i -= 1
        
        # Check right neighbors
        while i < len(self._intervals) and self._intervals[i][0] < new_hi:
            _, cur_hi = self._intervals[i]
            new_hi = max(new_hi, cur_hi)
            i += 1
        
        # Remove intervals from i to i-1 (exclusive) and insert new
        self._intervals[i:i] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        
        # Check if i-1 overlaps
        # We need to find all intervals that overlap with [lo, hi)
        # An interval [a, b) overlaps with [lo, hi) if a < hi and b > lo
        
        # Start from i-1 (might overlap from left)
        # Go forward while interval.lo < hi
        
        result = []
        # Process interval at i-1
        if i > 0:
            prev_lo, prev_hi = self._intervals[i - 1]
            if prev_hi > lo:  # overlaps
                if prev_lo < lo:
                    result.append((prev_lo, lo))
                if prev_hi > hi:
                    # Will be handled below? No, we need to handle it.
                    # Actually prev_hi > hi means the right part remains
                    # But we'll handle this in the forward scan
                # Actually, let me restructure.
                # If prev_lo < lo and prev_hi > hi: split into (prev_lo, lo) and (prev_hi, hi)
                # If prev_lo < lo and prev_hi <= hi: only (prev_lo, lo) remains
                # If prev_lo >= lo and prev_hi > hi: only (prev_hi, hi) remains
                # If prev_lo >= lo and prev_hi <= hi: nothing remains
                pass
        
        # This is getting complicated. Let me restructure.
        
        # Better approach: find all intervals that overlap with [lo, hi), 
        # and for each, compute the remaining parts.
        
        new_intervals = []
        start = max(0, i - 1)
        end = i
        while end < len(self._intervals) and self._intervals[end][0] < hi:
            end += 1
        
        # Intervals from start to end-1 potentially overlap with [lo, hi)
        for j in range(start, end):
            a, b = self._intervals[j]
            if b <= lo or a >= hi:
                # No overlap, keep as is
                new_intervals.append((a, b))
            else:
                # Overlap exists
                if a < lo:
                    new_intervals.append((a, lo))
                if b > hi:
                    new_intervals.append((hi, b))
        
        # Now merge new_intervals with the rest
        # Actually, the non-overlapping intervals before start and after end-1 are unchanged.
        # Let me rebuild the list.
        
        # Hmm, this approach has issues. Let me think differently.
        
        # Better: 
        # 1. Keep all intervals before start as-is
        # 2. For intervals in [start, end), compute remainders
        # 3. Keep all intervals after end-1 as-is
        # 4. Merge everything
        
        # Actually, the remainders of overlapping intervals are already disjoint from each other
        # and from the non-overlapping intervals (since the original intervals were disjoint).
        # So I just need to splice.
        
        # Let me redo:
        # new_intervals = self._intervals[:start] + remainders + self._intervals[end:]
        
        # But wait, I need to be careful. The remainders are (a, lo) and (hi, b) for each
        # overlapping interval. These are in order and disjoint.
        
        # Let me just rebuild properly.
        
        pass  # I'll restructure in the final code
    
    def contains(self, x):
        i = bisect.bisect_right(self._intervals, (x, float('inf'))) - 1
        # Actually, I want to find the interval where lo <= x < hi.
        # bisect_right(self._intervals, (x, float('inf'))) gives the first interval with lo > x
        # or lo == x and hi > inf (impossible). So it gives the first interval with lo > x.
        # Wait, (x, inf) - any interval (a, b) where a > x would be > (x, inf)? No.
        # (x, inf) vs (a, b): if a > x, then (a, b) > (x, inf). If a == x, then (x, b) vs (x, inf): b < inf, so (x, b) < (x, inf).
        # So bisect_right(self._intervals, (x, float('inf'))) gives the first interval with lo > x.
        # The interval at index i-1 (where i = bisect_right(...)) has lo <= x.
        # We need to check if x < hi for that interval.
        
        # Hmm, but what if x equals some lo? Then (x, inf) > (x, b) for any finite b.
        # So bisect_right would place after (x, b), giving index of next interval.
        # i - 1 would be the interval with lo == x.
        # We check if x < hi, which is true since x == lo < hi (intervals have lo < hi).
        
        # What if x is between two intervals? bisect_right gives the first interval with lo > x.
        # i - 1 is the last interval with lo <= x. Check if x < hi.
        
        # What if x is before all intervals? i = 0, i-1 = -1. Check: no interval.
        
        # What if x is after all intervals? i = len, i-1 = len-1. Check if x < hi of last interval.
        
        i = bisect.bisect_right(self._intervals, (x, float('inf'))) - 1
        if i < 0:
            return False
        _, hi = self._intervals[i]
        return x < hi
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, I have an issue with `contains`. Let me reconsider.

`bisect.bisect_right(self._intervals, (x, float('inf')))` - this finds the position where (x, inf) would be inserted to maintain order. Since (x, inf) > (x, b) for any finite b, it would be inserted after all intervals with lo == x. And (x, inf) < (a, b) for any a > x. So it gives the index of the first interval with lo > x.

So `i = bisect_right(...) - 1` gives the last interval with lo <= x. We check if x < hi.

But wait, what about the case where x == lo of some interval? (x, inf) > (x, hi) since inf > hi. So bisect_right would place after (x, hi), and i-1 would be that interval. Then we check x < hi, which is true. Good.

What about x being less than all lo values? bisect_right returns 0, i = -1, return False. Good.

What about x being greater than all hi values? bisect_right returns len, i = len-1. We check x < hi of last interval. If x >= hi, return False. Good.

Now let me reconsider the `remove` method more carefully.

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    # Find the range of intervals that overlap with [lo, hi)
    # Start: at most i-1 (the one before insertion point)
    # End: all intervals from i onwards where lo < hi
    
    start = i
    if i > 0 and self._intervals[i-1][1] > lo:
        start = i - 1
    
    end = i
    while end < len(self._intervals) and self._intervals[end][0] < hi:
        end += 1
    
    # Now intervals[start:end] potentially overlap with [lo, hi)
    # Compute remainders
    remainders = []
    for j in range(start, end):
        a, b = self._intervals[j]
        if a < lo:
            remainders.append((a, lo))
        if b > hi:
            remainders.append((hi, b))
    
    # Splice
    self._intervals[start:end] = remainders
```

Wait, but I need to be careful. The remainders (a, lo) and (hi, b) for different j values - are they in order and non-overlapping?

Since the original intervals are sorted and disjoint:
- For j < j+1: intervals[j] = (a_j, b_j), intervals[j+1] = (a_{j+1}, b_{j+1})
- We have b_j <= a_{j+1} (disjoint, and since touching is merged, actually b_j < a_{j+1})
- Wait, actually after merging touching intervals, we have b_j < a_{j+1} (strictly less, since touching would have been merged).

Hmm wait, the problem says "touching intervals merged ([1,3) + [3,5) gives [(1, 5)]". So after add, touching intervals are merged. So in our stored representation, we have b_j < a_{j+1} (strictly).

So for remainders:
- (a_j, lo) for j where a_j < lo: these are all < lo, and since a_j < b_j < a_{j+1} < ... < lo, they're in order and disjoint.
- (hi, b_j) for j where b_j > hi: these are all > hi, and since hi < b_j < a_{j+1} < b_{j+1}, they're in order and disjoint.
- The (a_j, lo) part is < lo <= hi < (hi, b_j) part. So all remainders are in order and disjoint.

Great, so the splice works correctly.

But wait, I need to double-check: could a remainder (a_j, lo) from one interval and (hi, b_k) from another interval be touching? (a_j, lo) ends at lo, (hi, b_k) starts at hi. Since lo < hi (we checked lo < hi at the start), they're not touching. Good.

Now let me also think about the `add` method more carefully.

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    new_lo = lo
    new_hi = hi
    
    # Check left neighbor
    if i > 0:
        prev_lo, prev_hi = self._intervals[i - 1]
        if prev_hi > lo:  # overlap or touch (prev_hi >= lo means they touch or overlap)
            # Wait, since intervals are merged (no touching), prev_hi < next_lo always.
            # So prev_hi > lo means actual overlap (not just touching).
            # Actually, prev_hi >= lo would mean overlap or touching. But since we merge touching,
            # prev_hi > lo means overlap. prev_hi == lo would mean touching, which shouldn't exist.
            # But to be safe, let's use >= for the merge condition.
            # Actually, the problem says touching intervals should be merged. So if prev_hi == lo,
            # they should be merged. But in our invariant, we don't have touching intervals.
            # So prev_hi > lo is the correct check (they overlap).
            # But wait, what if due to floating point, we have prev_hi == lo? 
            # The problem says "touching intervals merged", so we should merge if prev_hi >= lo.
            # But our invariant says we never have touching, so prev_hi > lo should suffice.
            # Let me use >= to be safe.
            new_lo = min(new_lo, prev_lo)
            new_hi = max(new_hi, prev_hi)
            i -= 1
    
    # Check right neighbors
    while i < len(self._intervals) and self._intervals[i][0] < new_hi:
        # Wait, should it be <= or <?
        # If self._intervals[i][0] == new_hi, they touch. We should merge.
        # But our invariant says no touching. So < should suffice.
        # But to be safe, use <=.
        # Actually, the invariant is that touching intervals are merged. So if cur_lo == new_hi,
        # they should be merged. Let me use <=.
        _, cur_hi = self._intervals[i]
        new_hi = max(new_hi, cur_hi)
        i += 1
    
    self._intervals[i:i] = [(new_lo, new_hi)]
```

Hmm wait, I need to be more careful. The condition for two intervals [a,b) and [c,d) to be mergeable is: a <= d and c <= b (they overlap or touch). Since they're sorted (a <= c), this simplifies to c <= b.

So for the left neighbor [prev_lo, prev_hi) and new [lo, hi): mergeable if lo <= prev_hi (i.e., prev_hi >= lo).

For the right neighbor [cur_lo, cur_hi) and new [lo, hi): mergeable if cur_lo <= hi (i.e., cur_lo <= hi).

Since our invariant ensures no touching (b_j < a_{j+1}), in practice:
- Left: prev_hi > lo (strict, since prev_hi == lo would mean touching which is already merged)
- Right: cur_lo < hi (strict, since cur_lo == hi would mean touching which is already merged)

But to be safe and handle edge cases, I'll use >= and <=.

Actually wait, I realize there might be an issue. If the invariant is maintained (no touching intervals), then prev_hi < next_lo always. So if prev_hi == lo, that would violate the invariant. So in practice, we only need prev_hi > lo and cur_lo < hi. But using >= and <= doesn't hurt and is safer.

Let me also reconsider: when I do `i -= 1` for the left neighbor, I then check `self._intervals[i][0] < new_hi` for the right neighbors. But `i` now points to the left neighbor's position. Since we already merged with it, we should start checking from i+1. Wait no, after `i -= 1`, the while loop checks `self._intervals[i][0] < new_hi`. But i now points to the left neighbor, which we already merged. We'd be checking it again!

Let me fix this:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    new_lo = lo
    new_hi = hi
    
    # Check left neighbor
    if i > 0:
        prev_lo, prev_hi = self._intervals[i - 1]
        if prev_hi >= lo:  # overlap or touch
            new_lo = min(new_lo, prev_lo)
            new_hi = max(new_hi, prev_hi)
            i -= 1
    
    # Check right neighbors (starting from i, which is the first unprocessed interval)
    while i < len(self._intervals) and self._intervals[i][0] <= new_hi:
        _, cur_hi = self._intervals[i]
        new_hi = max(new_hi, cur_hi)
        i += 1
    
    self._intervals[i:i] = [(new_lo, new_hi)]
```

Wait, after `i -= 1`, i points to the left neighbor. Then the while loop starts at i and checks `self._intervals[i][0] <= new_hi`. But the left neighbor's lo is prev_lo, and we already merged it. We'd be processing it again!

No wait, after `i -= 1`, i points to the left neighbor's position. The while loop would check `self._intervals[i][0] <= new_hi`, which is `prev_lo <= new_hi`. Since prev_lo < prev_hi <= new_hi (we extended new_hi to include prev_hi), this would be true. So we'd process it again, extending new_hi again (no change since we already included prev_hi), and i += 1. Then we move to the next interval. This is actually fine! We just process the left neighbor again (no harm, since max is idempotent), and then continue with the right neighbors.

Actually wait, it's not quite right. After merging with the left neighbor, new_hi might have been extended. Then we check the left neighbor again: `prev_lo <= new_hi` is true (since prev_lo < prev_hi <= new_hi). We do `new_hi = max(new_hi, prev_hi)` which is a no-op. Then i += 1, and we move to the original insertion point. This is correct but does one extra iteration. Not a big deal.

Alternatively, I can restructure:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    new_lo = lo
    new_hi = hi
    
    # Check left neighbor
    if i > 0:
        prev_lo, prev_hi = self._intervals[i - 1]
        if prev_hi >= lo:
            new_lo = min(new_lo, prev_lo)
            new_hi = max(new_hi, prev_hi)
            i -= 1
    
    # Check right neighbors
    while i < len(self._intervals) and self._intervals[i][0] <= new_hi:
        _, cur_hi = self._intervals[i]
        new_hi = max(new_hi, cur_hi)
        i += 1
    
    self._intervals[i:i] = [(new_lo, new_hi)]
```

Hmm, the issue is: after `i -= 1`, the while loop starts at the left neighbor. Let me just use a different variable:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
    
    new_lo = lo
    new_hi = hi
    start = i  # where the merged interval will start in the list
    
    # Check left neighbor
    if i > 0:
        prev_lo, prev_hi = self._intervals[i - 1]
        if prev_hi >= lo:
            new_lo = min(new_lo, prev_lo)
            new_hi = max(new_hi, prev_hi)
            start = i - 1
    
    # Check right neighbors
    j = i  # start checking from original insertion point
    while j < len(self._intervals) and self._intervals[j][0] <= new_hi:
        _, cur_hi = self._intervals[j]
        new_hi = max(new_hi, cur_hi)
        j += 1
    
    self._intervals[start:j] = [(new_lo, new_hi)]
```

This is cleaner. `start` is where the merged interval begins in the list, and `j` is where it ends (exclusive).

Now for performance: the while loop in `add` could iterate over many intervals if we're adding a large interval that covers many small ones. But for the performance test (60,000 small disjoint intervals), each add will only merge with at most 1-2 neighbors (or 0 if truly disjoint). So each add is O(log n) for bisect + O(1) for the while loop. Total: O(n log n) for 60,000 adds. That's fine.

For `contains`: O(log n) due to bisect. 200,000 calls * O(log 60000) ≈ 200,000 * 17 ≈ 3.4 million operations. Very fast.

Let me also handle the edge case in `remove` where the interval to remove doesn't actually overlap anything. In that case, remainders would be empty and we'd just remove nothing (or the splice would be empty).

Wait, in my remove code:
```python
start = i
if i > 0 and self._intervals[i-1][1] > lo:
    start = i - 1

end = i
while end < len(self._intervals) and self._intervals[end][0] < hi:
    end += 1
```

If no intervals overlap, then start == end (or start == i and end == i), and the splice `self._intervals[start:end] = remainders` would be an empty splice (no-op). Good.

But wait, what if `start == i` and `end == i`? Then `self._intervals[i:i] = []` which is a no-op. Good.

What if `start == i - 1` and `end == i`? Then we're checking one interval (i-1) for overlap. If it doesn't actually overlap (b <= lo), then remainders would contain the original interval. Wait no:

```python
for j in range(start, end):
    a, b = self._intervals[j]
    if a < lo:
        remainders.append((a, lo))
    if b > hi:
        remainders.append((hi, b))
```

If the interval doesn't overlap (b <= lo), then a < lo might be true (append (a, lo)) but b > hi is false. Wait, if b <= lo < hi, then b > hi is false. And a < lo might be true. So we'd append (a, lo) which is the entire interval (since b <= lo means the interval is entirely before lo). But that's wrong! We'd be replacing (a, b) with (a, lo) where lo > b. That's invalid!

I need to fix this. The condition for overlap is: a < hi AND b > lo. Let me add that check:

```python
for j in range(start, end):
    a, b = self._intervals[j]
    if b <= lo or a >= hi:
        # No overlap, keep as is
        remainders.append((a, b))
    else:
        if a < lo:
            remainders.append((a, lo))
        if b > hi:
            remainders.append((hi, b))
```

Actually, with my start/end computation, the intervals in [start, end) should all potentially overlap. Let me re-examine:

- start: i-1 if intervals[i-1].hi > lo, else i
- end: first index where intervals[end].lo >= hi

So for j in [start, end):
- If j == start == i-1: intervals[j].hi > lo (by construction). And intervals[j].lo < intervals[j+1].lo <= ... We need intervals[j].lo < hi for overlap. Since intervals[j].hi > lo and intervals are disjoint, intervals[j].lo < intervals[j].hi. But does intervals[j].lo < hi? Well, intervals[j].hi > lo, and we need intervals[j].lo < hi. Since intervals[j].lo < intervals[j].hi, and intervals[j].hi > lo, we have intervals[j].lo < intervals[j].hi. But we need intervals[j].lo < hi. Since intervals[j].hi > lo and intervals[j].lo < intervals[j].hi, we can't directly conclude intervals[j].lo < hi. Actually, intervals[j].lo < intervals[j].hi and we need intervals[j].lo < hi. If intervals[j].hi > lo, does that imply intervals[j].lo < hi? Yes! Because intervals[j].lo < intervals[j].hi, and if intervals[j].hi > lo, it doesn't directly tell us about intervals[j].lo vs hi. 

Hmm, actually: intervals[j].lo < intervals[j].hi. We know intervals[j].hi > lo. We need intervals[j].lo < hi. Since lo < hi, and intervals[j].lo < intervals[j].hi, we can't directly conclude. But actually, if intervals[j].hi > lo and intervals[j].lo >= hi, then intervals[j].lo >= hi > lo, and intervals[j].hi > lo. But intervals[j].lo < intervals[j].hi, so intervals[j].lo < intervals[j].hi. If intervals[j].lo >= hi, then intervals[j].hi > intervals[j].lo >= hi > lo. So the interval is [lo2, hi2) where lo2 >= hi > lo. This means the interval is entirely after [lo, hi). But wait, we determined end as the first index where intervals[end].lo >= hi. So for j < end, intervals[j].lo < hi. So for j in [start, end), we have intervals[j].lo < hi.

And for j in [start, end), we also need intervals[j].hi > lo. For j >= i (the original insertion point), intervals[j].lo >= lo (by bisect), and intervals[j].hi > intervals[j].lo >= lo. So intervals[j].hi > lo. For j == i-1 (the left neighbor), we checked intervals[i-1].hi > lo.

So for all j in [start, end): intervals[j].lo < hi AND intervals[j].hi > lo. They all overlap! Great, so I don't need the extra check.

Wait, let me double-check: for j >= i, intervals[j].lo >= lo (since i is the bisect position for lo). And intervals[j].hi > intervals[j].lo >= lo. So yes, intervals[j].hi > lo. And for j < end, intervals[j].lo < hi. So all intervals in [start, end) overlap with [lo, hi). 

So my original code without the extra check is correct:
```python
for j in range(start, end):
    a, b = self._intervals[j]
    if a < lo:
        remainders.append((a, lo))
    if b > hi:
        remainders.append((hi, b))
```

This is correct because all intervals in [start, end) do overlap with [lo, hi).

Let me now write the complete solution:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi), sorted, disjoint, no touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        new_lo = lo
        new_hi = hi
        start = i
        if i > 0:
            prev_lo, prev_hi = self._intervals[i - 1]
            if prev_hi >= lo:
                new_lo = min(new_lo, prev_lo)
                new_hi = max(new_hi, prev_hi)
                start = i - 1
        j = i
        while j < len(self._intervals) and self._intervals[j][0] <= new_hi:
            _, cur_hi = self._intervals[j]
            new_hi = max(new_hi, cur_hi)
            j += 1
        self._intervals[start:j] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        i = bisect.bisect_left(self._intervals, (lo, float('-inf')))
        start = i
        if i > 0 and self._intervals[i - 1][1] > lo:
            start = i - 1
        end = i
        while end < len(self._intervals) and self._intervals[end][0] < hi:
            end += 1
        remainders = []
        for j in range(start, end):
            a, b = self._intervals[j]
            if a < lo:
                remainders.append((a, lo))
            if b > hi:
                remainders.append((hi, b))
        self._intervals[start:end] = remainders
    
    def contains(self, x):
        i = bisect.bisect_right(self._intervals, (x, float('inf'))) - 1
        if i < 0:
            return False
        return x < self._intervals[i][1]
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Let me trace through some examples:

1. add(1, 3): intervals = [(1, 3)]
2. add(3, 5): i = bisect_left([(1,3)], (3, -inf)) = 1. start = 1. i > 0: prev = (1,3), prev_hi = 3 >= lo = 3. Yes! new_lo = 1, new_hi = max(5, 3) = 5. start = 0. j = 1, j < 1 is false. intervals[0:1] = [(1, 5)]. Result: [(1, 5)]. ✓

3. add(1, 3), add(5, 7), remove(2, 6):
   - After adds: [(1,3), (5,7)]
   - remove(2, 6): i = bisect_left([(1,3),(5,7)], (2, -inf)) = 1.
   - start: i > 0, intervals[0] = (1,3), hi = 3 > lo = 2. Yes. start = 0.
   - end: intervals[1][0] = 5 < 6. end = 2. intervals[2] doesn't exist. end = 2.
   - remainders: j=0: a=1, b=3. a < 2: append (1,2). b > 6? 3 > 6? No. j=1: a=5, b=7. a < 2? No. b > 6? 7 > 6? Yes. append (6,7).
   - remainders = [(1,2), (6,7)]
   - intervals[0:2] = [(1,2), (6,7)]. Result: [(1,2), (6,7)]. ✓

4. contains(2) in [(1,2), (6,7)]: i = bisect_right([(1,2),(6,7)], (2, inf)) - 1. (2, inf) > (1,2) and (2, inf) < (6,7). So bisect_right returns 1. i = 0. Check x < intervals[0][1]: 2 < 2? No. Return False. ✓ (2 is not in [1,2))

5. contains(1.5) in [(1,2), (6,7)]: i = bisect_right([(1,2),(6,7)], (1.5, inf)) - 1. (1.5, inf) > (1,2) and (1.5, inf) < (6,7). bisect_right returns 1. i = 0. 1.5 < 2? Yes. Return True. ✓

6. contains(6) in [(1,2), (6,7)]: i = bisect_right([(1,2),(6,7)], (6, inf)) - 1. (6, inf) > (6, 7) since inf > 7. So bisect_right returns 2. i = 1. 6 < 7? Yes. Return True. ✓

7. contains(7) in [(1,2), (6,7)]: i = bisect_right([(1,2),(6,7)], (7, inf)) - 1. (7, inf) > (6,7). bisect_right returns 2. i = 1. 7 < 7? No. Return False. ✓

Looks good!

Now let me think about edge cases:
- add with lo == hi: ignored. ✓
- remove with lo == hi: ignored. ✓
- remove an interval that doesn't exist: start == end, remainders empty, splice is no-op. ✓
- remove an interval that partially overlaps one interval: splits it. ✓
- add an interval that's contained in an existing interval: merges into the existing one. ✓

Let me trace: add(1, 10), add(3, 5):
- After first: [(1, 10)]
- add(3, 5): i = bisect_left([(1,10)], (3, -inf)) = 1. start = 1. i > 0: prev = (1,10), prev_hi = 10 >= 3. Yes. new_lo = 1, new_hi = max(5, 10) = 10. start = 0. j = 1, j < 1 false. intervals[0:1] = [(1, 10)]. Result: [(1, 10)]. ✓

Let me trace: add(1, 3), add(2, 5):
- After first: [(1, 3)]
- add(2, 5): i = bisect_left([(1,3)], (2, -inf)) = 1. start = 1. i > 0: prev = (1,3), prev_hi = 3 >= 2. Yes. new_lo = 1, new_hi = max(5, 3) = 5. start = 0. j = 1, j < 1 false. intervals[0:1] = [(1, 5)]. Result: [(1, 5)]. ✓

Performance concern: 60,000 add() calls of small disjoint intervals in random order. Each add is O(log n) for bisect + O(1) for the while loop (since intervals are disjoint, the while loop runs at most 1-2 times). Total: O(n log n) ≈ 60,000 * 17 ≈ 1 million operations. Very fast.

Then 200,000 contains() calls, each O(log n) ≈ 17 comparisons. Total: 200,000 * 17 ≈ 3.4 million operations. Very fast.

The list insertions (splicing) are O(n) in the worst case, but for disjoint intervals, each insertion only replaces 0 or 1 elements, so it's O(1) amortized (just shifting a few elements). Actually, `list[i:j] = [(new_lo, new_hi)]` where j - i is 0 or 1 is O(n) due to shifting. But in C, this is a memmove of at most n*8 bytes. For n = 60,000, that's 480KB. memmove of 480KB is maybe 1-2 microseconds. 60,000 * 2μs = 120ms. Fine.

Actually wait, I need to reconsider. When we do `self._intervals[start:j] = [(new_lo, new_hi)]`, if start == j (no intervals to remove), it's an insertion at position start, which shifts all elements after start. That's O(n). For 60,000 such operations with average n/2 = 30,000 elements to shift, that's 60,000 * 30,000 * 8 bytes = 14.4 GB of data moved. At 10 GB/s memmove speed, that's 1.44 seconds. Hmm, that might be borderline.

Actually, memmove on modern hardware can do 20-50 GB/s. So 14.4 GB / 30 GB/s ≈ 0.5 seconds. That should be fine.

But wait, the list is growing. The average size during the 60,000 inserts is 30,000. Each insert shifts on average 30,000/2 = 15,000 elements (if inserted at random position). 60,000 * 15,000 * 8 bytes = 7.2 GB. At 30 GB/s, that's 0.24 seconds. Fine.

Actually, I realize I should double-check: `list[i:j] = [(x, y)]` when i == j is equivalent to `list.insert(i, (x, y))`. The underlying C code does a memmove of (len - i) * sizeof(PyObject*) bytes. For a list of 60,000 elements, that's 60,000 * 8 = 480,000 bytes ≈ 480KB. At 50 GB/s, that's about 10 microseconds. 60,000 * 10μs = 600ms. Fine.

I think the solution is correct and performant. Let me finalize it.

One more thing: the problem says "Bounds may be ints or floats. Keep the original values (no rounding)." This means I should not convert types. Python handles mixed int/float comparisons naturally, so this should be fine.

Let me also make sure `total_length` returns the right type. If bounds are ints, lengths are ints. If bounds are floats, lengths are floats. If mixed, Python handles it. `sum()` of a generator of numbers will return the appropriate type.

I think the solution is complete. Let me write the final version.
