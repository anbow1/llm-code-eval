Let me analyze the requirements:

1. `IntervalSet` stores disjoint half-open intervals [lo, hi)
2. Methods: add, remove, contains, total_length, intervals, __len__
3. Bounds can be ints or floats, keep original values
4. Performance: contains() must be O(log n); 60,000 add calls + 200,000 contains calls < 5 seconds

For O(log n) contains(), I need a balanced BST or sorted structure. Since I'm limited to standard library, I can't use a tree data structure directly. However, I can use `bisect` module with a sorted list.

Wait, but the problem says 60,000 add() calls of small disjoint intervals. If they're all disjoint, that's 60,000 intervals. With a sorted list and bisect, contains() would be O(log n) for the binary search, but add() would be O(n) for insertion into the list.

60,000 add() calls, each O(n) where n grows to 60,000. That's 60,000 * 60,000 / 2 = 1.8 * 10^9 operations... that might be too slow in Python.

Hmm, let me think about this differently. The add() calls are for "small disjoint intervals in random order". If they're all disjoint, they won't merge. But we still need to maintain sorted order.

Actually, let me reconsider. 60,000 insertions into a sorted list of size up to 60,000. Each insertion is O(n) due to list shifting. That's about 60,000 * 30,000 average = 1.8 * 10^9 element moves. In Python, list insertion is done in C (memmove), so each element move is very fast. 1.8 billion simple pointer moves in C... that might actually be fast enough. Let's say each memmove of a pointer is ~1ns, so 1.8 * 10^9 * 1ns = 1.8 seconds. That's cutting it close but should be under 5 seconds.

Actually, Python's list insert is O(n) in the worst case but it uses memmove which is very fast in C. 60,000 insertions into a list growing to 60,000 elements: the total number of element moves is approximately n*(n+1)/2 = ~1.8 * 10^9. But memmove of pointers is extremely fast. Let me estimate: each element is a pointer (8 bytes), so we're moving 1.8 * 10^9 * 8 bytes = 14.4 GB of data. At memory bandwidth of ~10 GB/s, that's about 1.4 seconds. This should be fine.

Wait, actually I need to store tuples (lo, hi), not just numbers. But the list still contains references to tuple objects, so insertion is still moving 8-byte pointers.

Let me design the data structure:
- A sorted list of (lo, hi) tuples
- For contains(x): use bisect to find the interval that might contain x, then check
- For add(lo, hi): find the position, check for overlaps/merges
- For remove(lo, hi): find affected intervals, split/remove them

Let me think about the contains() method more carefully:
- I have a sorted list of intervals [(lo1, hi1), (lo2, hi2), ...]
- To check if x is in the set, I need to find the interval where lo <= x < hi
- I can use bisect on the list of lo values
- Actually, I can use bisect_right on the lo values to find the last interval with lo <= x
- Then check if x < that interval's hi

Let me store:
- `self._intervals`: sorted list of (lo, hi) tuples
- `self._los`: sorted list of just the lo values (for bisect)
- `self._total_length`: cached total length

For contains(x):
- Use bisect_right on self._los to find the index of the last interval with lo <= x
- If index > 0, check if x < self._intervals[index-1][1]
- This is O(log n)

For add(lo, hi):
- Ignore if lo >= hi
- Find where lo fits: bisect_right(self._los, lo) gives the position
- We need to merge with all overlapping intervals
- An interval [a, b) overlaps with [lo, hi) if a < hi and b > lo
- Find the first overlapping interval and the last one
- Merge them all into one interval
- Insert the merged interval

For remove(lo, hi):
- Ignore if lo >= hi
- Find all intervals that overlap with [lo, hi)
- For each, either remove it entirely or split it
- The new intervals are: [a, lo) if a < lo and [hi, b) if b > hi

Let me code this up:

```python
from bisect import bisect_right, bisect_left

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi)
        self._los = []  # sorted list of lo values
        self._total = 0

    def contains(self, x):
        idx = bisect_right(self._los, x) - 1
        if idx >= 0:
            hi = self._intervals[idx][1]
            return x < hi
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(self._intervals)

    def __len__(self):
        return len(self._intervals)

    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find overlapping intervals
        # We need to find all intervals [a, b) where a < hi and b > lo
        # First, find the last interval with a < hi: bisect_left(self._los, hi) - 1
        # Actually, we need a < hi, so bisect_left(self._los, hi) gives the first index where lo >= hi
        # So the last interval with lo < hi is at index bisect_left(self._los, hi) - 1
        
        # Wait, I need to be more careful. Let me think again.
        # An interval [a, b) overlaps with [lo, hi) iff a < hi AND b > lo
        # Since intervals are sorted by a (lo), and they're disjoint, if a[i] < a[j] then b[i] <= a[j]
        # So I need to find the first interval with b > lo, and the last interval with a < hi
        
        # Since intervals are disjoint and sorted: b[i] <= a[i+1]
        # An interval overlaps [lo, hi) iff a < hi AND b > lo
        # The first potentially overlapping interval: the last one with a < hi
        # Actually, let me find:
        # right_end: first index where a >= hi (these don't overlap)
        # left_start: first index where b > lo (these overlap)
        
        # For right_end: bisect_left(self._los, hi) gives first index with lo >= hi
        # For left_start: I need the first interval where hi > lo. Since intervals are sorted by lo and disjoint,
        # the interval's hi values are also sorted. But I don't have a separate list of hi values.
        # Actually, since intervals are disjoint and sorted, b[i] <= a[i+1], so b values are increasing.
        # I can use bisect_right on... hmm, I don't have a sorted list of hi values easily.
        
        # Alternative approach: since intervals are disjoint, I can just iterate.
        # But for performance, let me think...
        
        # Actually, for the 60,000 add calls with small disjoint intervals, they won't overlap with each other.
        # So in the worst case, each add just inserts one interval.
        # But the algorithm should still handle overlaps correctly.
        
        # Let me use a simpler approach:
        # 1. Find the index where lo would be inserted: pos = bisect_right(self._los, lo)
        #    Actually, I need the first interval that could overlap.
        #    The first interval with a < hi: all intervals before bisect_left(self._los, hi)
        #    The first interval with b > lo: since b[i] <= a[i+1] for disjoint intervals,
        #    b[i] > lo means the interval extends past lo.
        #    The first such interval: we need b[i] > lo. Since b is increasing, I can binary search.
        #    But I don't have a separate b list. However, b[i] <= a[i+1], so b[i] > lo implies a[i+1] > lo (if i+1 exists)
        #    Hmm, this is getting complicated.
        
        # Let me just use the fact that for disjoint sorted intervals:
        # If I find the rightmost interval with a < hi, call it at index j (j = bisect_left(self._los, hi) - 1)
        # Then I need to check from some starting point. The starting point is the first interval with b > lo.
        # Since b[i] <= a[i+1], if a[i+1] <= lo then b[i] <= lo. So the first interval with b > lo
        # is at most the first interval with a > lo... wait no.
        # Actually b[i] > lo AND a[i] <= lo is the interesting case.
        # Since b[i] <= a[i+1], if a[i] <= lo then b[i] could be > lo or <= lo.
        # 
        # Simpler: just find the range of overlapping intervals by:
        # - right: bisect_left(self._los, hi) - 1 (last interval with a < hi)
        # - left: I need the first interval with b > lo
        #   Since intervals are disjoint: for interval at index i, b[i] <= a[i+1]
        #   If a[i] > lo, then b[i] > lo (since b[i] > a[i] > lo)... wait no, b[i] > a[i] is guaranteed.
        #   Actually if a[i] > lo, then since b[i] > a[i] > lo, b[i] > lo. So any interval with a > lo has b > lo.
        #   If a[i] <= lo, then b[i] could be > lo or <= lo.
        #   So the first interval with b > lo is either:
        #   - The first interval with a > lo, OR
        #   - An interval with a <= lo but b > lo (at most one such interval, since intervals are disjoint)
        #   
        #   So: left = bisect_right(self._los, lo) (first interval with a > lo)
        #   Then check left-1: if left > 0 and self._intervals[left-1][1] > lo, then left = left - 1
        #   
        #   Wait, but I also need left <= right for there to be any overlap.
        
        # Let me code this:
        
        # Find right boundary (last interval with a < hi)
        right = bisect_left(self._los, hi) - 1
        
        # Find left boundary (first interval with b > lo)
        left = bisect_right(self._los, lo)  # first interval with a > lo
        if left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1
        # Also, if left <= right, we might have more to the left? No, because intervals are disjoint.
        # If left points to an interval with a > lo, then all intervals before left have a <= lo.
        # Among those, at most one (left-1) can have b > lo (since they're disjoint, b[left-1] <= a[left]).
        # So left is correct.
        
        # Now check if there's actual overlap: we need an interval in [left, right] with b > lo AND a < hi
        # Since left is the first with b > lo (or first with a > lo), and right is last with a < hi
        # We need left <= right for overlap to exist
        
        if left > right:
            # No overlap, just insert
            # But we need to insert in the right position
            # The new interval [lo, hi) should go after all intervals with a <= lo
            # Actually, since no overlap, we just insert at position left (or wherever it fits)
            # The position to insert: after all intervals with a <= lo and b <= lo (i.e., intervals that end at or before lo)
            # And before all intervals with a >= hi
            # Since no overlap, all intervals before left have b <= lo, and all after right have a >= hi
            # The insertion position is left (which equals right + 1 or similar)
            # Actually, let me just insert at position left
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._total += hi - lo
            return
        
        # There is overlap. Merge all intervals from left to right with [lo, hi)
        new_lo = min(lo, self._intervals[left][0])
        new_hi = max(hi, self._intervals[right][1])
        
        removed_length = 0
        for i in range(left, right + 1):
            removed_length += self._intervals[i][1] - self._intervals[i][0]
        
        # Remove the overlapping intervals
        del self._intervals[left:right + 1]
        del self._los[left:right + 1]
        
        self._total -= removed_length
        self._total += new_hi - new_lo
        
        # Insert the merged interval
        self._intervals.insert(left, (new_lo, new_hi))
        self._los.insert(left, new_lo)
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        
        # Find all intervals that overlap with [lo, hi)
        # Overlap: a < hi AND b > lo
        right = bisect_left(self._los, hi) - 1  # last interval with a < hi
        left = bisect_right(self._los, lo)  # first interval with a > lo
        if left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1
        
        if left > right:
            return  # no overlap
        
        # Process each overlapping interval
        new_intervals = []
        total_change = 0
        
        for i in range(left, right + 1):
            a, b = self._intervals[i]
            # a < hi and b > lo (guaranteed by our range)
            # Remove [lo, hi) from [a, b)
            # Remaining: [a, min(a, lo)) if a < lo, and [max(b, hi), b) if b > hi
            # Actually: [a, b) minus [lo, hi) = [a, min(lo, b)) union [max(hi, a), b)
            # But since a < hi and b > lo:
            # Left part: [a, lo) if a < lo
            # Right part: [hi, b) if hi < b
            
            if a < lo:
                new_intervals.append((a, lo))
                total_change -= (lo - a)
            if hi < b:
                new_intervals.append((hi, b))
                total_change -= (b - hi)
            # The removed part: [max(a, lo), min(b, hi))
            removed = min(b, hi) - max(a, lo)
            total_change -= removed  # Wait, I'm double counting
            
        # Hmm, let me reconsider. I'll just remove all overlapping intervals and add back the parts that remain.
        
        # Actually, let me redo this more carefully.
        # For each interval [a, b) in range [left, right]:
        #   It overlaps [lo, hi) because a < hi and b > lo
        #   After removing [lo, hi):
        #     Left piece: [a, lo) if a < lo (length lo - a)
        #     Right piece: [hi, b) if hi < b (length b - hi)
        #     Removed: [max(a, lo), min(b, hi)) (length min(b,hi) - max(a,lo))
        
        # Total change in _total: sum of (left_piece_length + right_piece_length - original_length)
        # = sum of (lo - a if a < lo else 0) + (b - hi if hi < b else 0) - (b - a)
        # = ... let me just compute it directly
        
        new_los = []
        self._total = 0  # Recalculate? No, that's O(n). Let me track it.
        
        # Better approach:
        # 1. Remove all intervals in [left, right]
        # 2. Add back the remaining pieces
        # 3. Track the total change
        
        total_removed = 0
        for i in range(left, right + 1):
            a, b = self._intervals[i]
            total_removed += b - a
        
        new_pieces = []
        for i in range(left, right + 1):
            a, b = self._intervals[i]
            if a < lo:
                new_pieces.append((a, lo))
            if hi < b:
                new_pieces.append((hi, b))
        
        new_total = sum(b - a for a, b in new_pieces)
        
        del self._intervals[left:right + 1]
        del self._los[left:right + 1]
        
        self._total -= total_removed
        self._total += new_total
        
        # Now insert new_pieces at position left
        # They should already be in sorted order since the original intervals were sorted
        # and the pieces maintain relative order
        for i, (a, b) in enumerate(new_pieces):
            self._intervals.insert(left + i, (a, b))
            self._los.insert(left + i, a)
```

Wait, I'm making this more complex than it needs to be. Let me reconsider the performance requirements.

60,000 add() calls of small disjoint intervals in random order:
- If they're all disjoint, each add is essentially an insertion into a sorted list
- Each insertion is O(n) for the list insert (memmove in C)
- Total: O(n^2) = O(60,000^2) = 3.6 * 10^9 operations... but in C memmove, moving 8-byte pointers
- 3.6 * 10^9 * 8 bytes = 28.8 GB of memory movement. At ~10 GB/s, that's ~3 seconds. Hmm, might be tight.

Actually wait, the average position is n/2 = 30,000. So total elements moved = 60,000 * 30,000 = 1.8 * 10^9. At 8 bytes each, that's 14.4 GB. Should be fast enough in C.

But I also have two lists (_intervals and _los), so double the work. Still should be okay.

Actually, let me reconsider. Maybe I should use a single list of tuples and do bisect on a helper. Or I can just use the list of tuples and use a custom key... no, bisect doesn't support key in older versions. In Python 3.11, bisect does support the key parameter!

Actually, let me check: `bisect.bisect_left(a, x, lo=0, hi=len(a), key=None)` - yes, Python 3.11 has the key parameter. But I'm not sure if it's available. Let me just maintain two parallel lists to be safe.

Actually, you know what, let me just test if the approach works. The key insight is:
- 60,000 inserts into a list of up to 60,000 elements
- Each insert involves a memmove of ~30,000 elements on average
- 30,000 * 8 bytes = 240KB per insert
- 60,000 * 240KB = 14.4 GB total
- At memory bandwidth ~10-20 GB/s, this is ~1-2 seconds
- Plus the bisect operations (log n, negligible)
- Plus the 200,000 contains() calls (each O(log n), negligible)

This should be well under 5 seconds. Let me proceed with this approach.

Let me also think about whether I need the _los list. I could use the intervals list directly with a custom comparison, but that's slower. Two parallel lists is fine.

Actually, wait. Let me reconsider the remove method. The problem says "may split an interval in two". So removing [2, 8) from [1, 10) gives [1, 2) and [8, 10). My code handles this.

Let me also make sure the intervals() method merges touching intervals. Wait, the problem says "with touching intervals merged ([1,3) + [3,5) gives [(1, 5)])." But if I maintain the invariant that intervals are always merged (no touching intervals), then intervals() just returns the list. Let me ensure my add() method handles this.

In my add() method, when I merge overlapping intervals, I use new_lo = min(lo, self._intervals[left][0]) and new_hi = max(hi, self._intervals[right][1]). Since the intervals are disjoint and sorted, if interval i has [a_i, b_i) and interval i+1 has [a_{i+1}, b_{i+1}), then b_i <= a_{i+1}. If b_i == a_{i+1}, they're touching. When we merge, if we have [1,3) and we add [3,5), the overlap check: a=3 < hi=5 (yes), b=3 > lo=3 (no, 3 > 3 is false). So [3,5) doesn't overlap [1,3) in the strict sense.

Wait, I need to handle the touching case! [1,3) and [3,5) are touching but not overlapping. The problem says they should be merged.

So my overlap condition should be: a < hi AND b > lo for actual overlap, BUT I also need to merge touching intervals.

Let me reconsider. Two intervals [a,b) and [c,d) touch if b == c or d == a. They overlap if a < d and b > c.

For the add operation, I should merge any interval that overlaps OR touches the new interval.

Touching: b_i == lo (interval ends where new one starts) or a_i == hi (interval starts where new one ends).

So the condition for "should merge" is: a_i < hi AND b_i > lo, OR a_i == hi AND ... wait, a_i == hi means the interval starts at hi, and since it's [a_i, b_i) with b_i > a_i, it doesn't overlap [lo, hi). But it touches.

Hmm, actually let me reconsider. If I have [1, 3) and add [3, 5):
- Check overlap: a=1 < hi=5 (yes), b=3 > lo=3 (no). Not overlapping.
- But they touch: b=3 == lo=3.

So I need to also consider touching. Let me adjust:
- Should merge if: a < hi AND b > lo (overlap) OR b == lo (left touching) OR a == hi (right touching)

Actually, simpler: should merge if a <= hi AND b >= lo. Wait no, that's not right either. [1, 2) and [3, 5): a=1 <= 5, b=2 >= 3? No, 2 < 3. So no merge. Good.
[1, 3) and [3, 5): a=1 <= 5, b=3 >= 3. Yes, merge. Good.
[1, 3) and [4, 5): a=1 <= 5, b=3 >= 4? No. No merge. Good.

Wait, but [1, 5) and [3, 4): a=1 <= 4, b=5 >= 3. Yes, merge. Good (they overlap).

So the condition is: a_i <= hi AND b_i >= lo. But wait, this would also merge [1, 3) and [2, 5) which do overlap (a=1 <= 5, b=3 >= 2). Good.

But what about [1, 3) and [3, 5)? a=1 <= 5, b=3 >= 3. Yes. They get merged into [1, 5). Correct.

What about [1, 3) and [4, 5)? a=1 <= 5, b=3 >= 4? No, 3 < 4. No merge. Correct.

So the condition is: a_i <= hi AND b_i >= lo.

Wait, but this is the condition for the intervals to NOT have a gap between them. Let me verify:
- [a_i, b_i) and [lo, hi) have a gap if b_i < lo OR a_i > hi
- They touch or overlap if b_i >= lo AND a_i <= hi

Yes! So the merge condition is: b_i >= lo AND a_i <= hi.

Let me redo the add logic:
- Find right: last interval with a_i <= hi. Since a_i are sorted, this is bisect_right(self._los, hi) - 1.
- Find left: first interval with b_i >= lo. Since b_i are increasing (disjoint sorted intervals), I need to find the first one.
  - b_i >= lo: since b_i <= a_{i+1} for disjoint intervals, and a_i are increasing...
  - Actually, I can't directly binary search on b_i without a separate list.
  - But I know: the first interval with a_i > lo has index bisect_right(self._los, lo). Call it mid.
  - Intervals before mid have a_i <= lo. Among those, at most one can have b_i >= lo (the last one, at index mid-1, because b_{mid-1} <= a_mid and a_mid > lo... wait, a_mid > lo doesn't mean b_{mid-1} >= lo).
  - Actually, for disjoint intervals: b_i <= a_{i+1}. So b_{mid-1} <= a_mid. If a_mid > lo, then b_{mid-1} could be <= lo or > lo.
  - So: left = mid (first interval with a > lo), then check if mid > 0 and b_{mid-1} >= lo, if so left = mid - 1.
  - But wait, could there be an interval before mid-1 with b >= lo? No, because b_{mid-2} <= a_{mid-1} <= lo (since a_{mid-1} <= lo as it's before mid). So b_{mid-2} <= lo. Only mid-1 could have b >= lo.

So:
```
right = bisect_right(self._los, hi) - 1
mid = bisect_right(self._los, lo)
left = mid
if left > 0 and self._intervals[left - 1][1] >= lo:
    left -= 1
```

Then if left > right, no merge needed, just insert.
Otherwise, merge all intervals from left to right with [lo, hi).

For the merge:
new_lo = min(lo, self._intervals[left][0])
new_hi = max(hi, self._intervals[right][1])

This handles everything. Let me also make sure that after the merge, the new interval doesn't touch its neighbors. Since we merged all touching/overlapping intervals, the new interval's lo is <= all intervals before it (they had b < lo or a > hi, and we excluded them), and similarly for hi.

Wait, let me double-check. After merging, new_lo = min(lo, a_left). The interval before left has b < lo (since left is the first with b >= lo, so left-1 has b < lo). And new_lo <= lo, so b_{left-1} < lo. But could b_{left-1} == new_lo? Only if new_lo = lo and b_{left-1} = lo. But we said left is the first with b >= lo, so b_{left-1} < lo = new_lo (if new_lo = lo). Or if new_lo = a_left < lo, then b_{left-1} <= a_left = new_lo. Could b_{left-1} == a_left? That would mean they touch, but they were already in the set as separate intervals... which means they were touching! But we maintain the invariant that no touching intervals exist. So b_{left-1} < a_left = new_lo. Good.

Hmm wait, do I maintain the invariant that no touching intervals exist? The add() method should merge them. Let me make sure.

If I have [1, 3) in the set and add [3, 5):
- right = bisect_right(self._los, 5) - 1. _los = [1]. bisect_right([1], 5) = 1. right = 0.
- mid = bisect_right(self._los, 3). bisect_right([1], 3) = 1. mid = 1.
- left = 1. Check left > 0: yes. _intervals[0][1] = 3 >= 3: yes. left = 0.
- left = 0, right = 0. Merge: new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- Remove [1, 3), insert [1, 5). 

Now what about the remove method with touching? If I have [1, 5) and remove [2, 3):
- right = bisect_right([1], 3) - 1 = 1 - 1 = 0.
- mid = bisect_right([1], 2) = 1. left = 1. Check: _intervals[0][1] = 5 >= 2: yes. left = 0.
- Overlap exists: left=0, right=0.
- Interval [1, 5): a=1 < lo=2, so left piece [1, 2). hi=3 < b=5, so right piece [3, 5).
- Remove [1, 5), insert [1, 2) and [3, 5).

Do [1, 2) and [3, 5) touch? 2 < 3, no. Good.

What if I remove [2, 5) from [1, 5)?
- right = bisect_right([1], 5) - 1 = 1 - 1 = 0.
- mid = bisect_right([1], 2) = 1. left = 1. Check: _intervals[0][1] = 5 >= 2: yes. left = 0.
- Interval [1, 5): a=1 < lo=2, left piece [1, 2). hi=5 < b=5? No, 5 < 5 is false. No right piece.
- Remove [1, 5), insert [1, 2).

Good.

What about remove where the removal touches the end: remove [1, 3) from [1, 5):
- right = bisect_right([1], 3) - 1 = 1 - 1 = 0.
- mid = bisect_right([1], 1) = 0. left = 0. Check left > 0: no.
- Interval [1, 5): a=1 < lo=1? No, 1 < 1 is false. No left piece. hi=3 < b=5: yes, right piece [3, 5).
- Remove [1, 5), insert [3, 5).

Good.

Now let me think about the intervals() method. The problem says it should return "all intervals as (lo, hi) tuples, sorted, disjoint, and with touching intervals merged." Since I maintain this invariant in the set, intervals() just returns a copy of the list.

Let me also think about the total_length caching. I'll maintain _total as a running sum.

Let me also consider: what if add() is called with lo == hi? The problem says "Ignore if lo >= hi." So we skip.

Let me write the final clean version:

```python
from bisect import bisect_right, bisect_left


class IntervalSet:
    def __init__(self):
        self._intervals: list[tuple] = []
        self._los: list = []
        self._total = 0

    def contains(self, x) -> bool:
        idx = bisect_right(self._los, x) - 1
        if idx >= 0:
            return x < self._intervals[idx][1]
        return False

    def total_length(self):
        return self._total

    def intervals(self) -> list[tuple]:
        return list(self._intervals)

    def __len__(self) -> int:
        return len(self._intervals)

    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find right: last interval with a <= hi
        right = bisect_right(self._los, hi) - 1
        # Find left: first interval with b >= lo
        mid = bisect_right(self._los, lo)
        left = mid
        if left > 0 and self._intervals[left - 1][1] >= lo:
            left -= 1

        if left > right:
            # No overlap or touching, just insert
            self._intervals.insert(left, (lo, hi))
            self._los.insert(left, lo)
            self._total += hi - lo
            return

        # Merge all intervals from left to right with [lo, hi)
        new_lo = lo if lo < self._intervals[left][0] else self._intervals[left][0]
        new_hi = hi if hi > self._intervals[right][1] else self._intervals[right][1]

        removed_length = 0
        for i in range(left, right + 1):
            removed_length += self._intervals[i][1] - self._intervals[i][0]

        count = right - left + 1
        del self._intervals[left:right + 1]
        del self._los[left:right + 1]

        self._total -= removed_length
        self._total += new_hi - new_lo

        self._intervals.insert(left, (new_lo, new_hi))
        self._los.insert(left, new_lo)

    def remove(self, lo, hi):
        if lo >= hi:
            return
        # Find right: last interval with a < hi (strictly, because [a, b) overlaps [lo, hi) needs a < hi)
        # Wait, for remove, we need intervals that have any part in [lo, hi)
        # [a, b) has part in [lo, hi) iff a < hi AND b > lo
        right = bisect_left(self._los, hi) - 1  # last with a < hi
        # left: first with b > lo
        mid = bisect_right(self._los, lo)  # first with a > lo
        left = mid
        if left > 0 and self._intervals[left - 1][1] > lo:
            left -= 1

        if left > right:
            return

        # Collect new pieces
        new_pieces = []
        removed_total = 0
        for i in range(left, right + 1):
            a, b = self._intervals[i]
            removed_total += b - a
            if a < lo:
                new_pieces.append((a, lo))
            if hi < b:
                new_pieces.append((hi, b))

        new_total = sum(b - a for a, b in new_pieces)

        del self._intervals[left:right + 1]
        del self._los[left:right + 1]

        self._total -= removed_total
        self._total += new_total

        for i, piece in enumerate(new_pieces):
            self._intervals.insert(left + i, piece)
            self._los.insert(left + i, piece[0])
```

Wait, I need to double-check the remove overlap condition. For remove(lo, hi), I want to find all intervals [a, b) such that [a, b) ∩ [lo, hi) ≠ ∅, which is a < hi AND b > lo.

- right = last interval with a < hi: bisect_left(self._los, hi) - 1. This gives the last index where a < hi. Correct.
- left = first interval with b > lo:
  - mid = bisect_right(self._los, lo) = first index where a > lo. All intervals before mid have a <= lo.
  - For interval at mid-1: a <= lo. b > lo? We check.
  - For intervals before mid-1: b_i <= a_{i+1} <= a_{mid-1} <= lo. So b_i <= lo. Not > lo.
  - So only mid-1 could have b > lo.

This is correct.

But wait, for the add method, I used the condition b >= lo (for touching/merging). For remove, the condition is b > lo (strict, because [a, b) ∩ [lo, hi) ≠ ∅ requires b > lo).

Let me verify: [1, 3) and remove [3, 5): a=1 < 5 (yes), b=3 > 3 (no). No overlap. Correct, [1,3) and [3,5) don't overlap.

[1, 3) and remove [2, 5): a=1 < 5 (yes), b=3 > 2 (yes). Overlap. Remove [2, 3) from [1, 3), leaving [1, 2). Correct.

Now, one issue: in the remove method, after I remove and add new pieces, could two new pieces touch? For example, [1, 5) and remove [2, 3): new pieces are [1, 2) and [3, 5). 2 < 3, no touch. 

What about [1, 5) and remove [2, 4)? New pieces: [1, 2) and [4, 5). No touch.

What about removing from multiple intervals? Say [1, 3), [4, 6) and remove [2, 5):
- Intervals overlapping [2, 5): 
  - [1, 3): a=1 < 5, b=3 > 2. Yes.
  - [4, 6): a=4 < 5, b=6 > 2. Yes.
- New pieces from [1, 3): [1, 2) (a=1 < lo=2), no right piece (hi=5 < b=3? No, 5 > 3, so no right piece... wait, hi=5 < b=3 is false. Correct, no right piece.)
  Wait, the condition is: if hi < b: add (hi, b). hi=5, b=3. 5 < 3? No. Correct.
- New pieces from [4, 6): a=4 < lo=2? No. hi=5 < b=6? Yes. Add (5, 6).
- So new pieces: [1, 2), [5, 6). No touching. Good.

What about [1, 4), [5, 7) and remove [2, 6)?
- [1, 4): a=1 < 6, b=4 > 2. Yes.
- [5, 7): a=5 < 6, b=7 > 2. Yes.
- From [1, 4): a=1 < lo=2: add (1, 2). hi=6 < b=4? No.
- From [5, 7): a=5 < lo=2? No. hi=6 < b=7: add (6, 7).
- New pieces: [1, 2), [6, 7). Good.

What about [1, 3), [3, 5) -- wait, I maintain the invariant that no touching intervals exist. So this state shouldn't occur.

I think the code is correct. Let me also handle the edge case where in remove, after removing, the new pieces might need to be checked for touching with neighboring intervals (outside the removed range). 

Actually, since the original set has no touching intervals, and we're just splitting intervals, the new pieces won't touch their neighbors:
- Left piece [a, lo): the interval before has b < a (no touch in original), so b < a < lo. No touch.
- Right piece [hi, b): the interval after has a > b (no touch in original), so a > b > hi. No touch.
- Left piece [a, lo) and right piece [hi, b) from the same interval: lo < hi (since lo < hi is guaranteed), and we only add left piece if a < lo and right piece if hi < b. If both exist, lo < hi so they don't touch.
- Left piece from interval i and right piece from interval i+1: left piece ends at lo, right piece starts at hi. lo < hi. No touch.

Great, no touching issues.

Let me also think about whether the `intervals()` method needs to do anything special. Since I maintain the invariant, it just returns a copy.

One more thing: the problem says "Keep the original values (no rounding)." So I just store whatever lo and hi are given. Python handles int/float arithmetic fine.

Let me finalize the code. I'll also add the `__init__` method properly.

Actually, wait. Let me reconsider the performance. 60,000 add() calls, each inserting into a list of growing size. The list operations:
- bisect: O(log n) - negligible
- list.insert: O(n) for memmove - this is the bottleneck
- list del: O(n) for memmove

For 60,000 disjoint intervals being added in random order:
- Each add: one insert into _intervals and one into _los
- Average list size: 30,000
- Total memmove: 60,000 * 30,000 * 2 lists * 8 bytes = 28.8 GB

Hmm, that's a lot. At 10 GB/s memory bandwidth, that's ~3 seconds. Plus the Python overhead of the method calls. This might be tight.

Can I optimize? One option: use a different data structure. But with standard library only, my options are limited.

Alternative: Use a sorted list but only maintain one list (the intervals), and use bisect with a key function. In Python 3.11, bisect supports key parameter. Let me check... actually, I just checked and the key parameter was added in Python 3.10 for bisect. So in 3.11 it's available.

But using key means the bisect will call the key function on each element during comparison, which is slower than a plain numeric comparison. For 60,000 elements, each bisect does ~17 comparisons, each calling a lambda. That's still fast.

Actually, the bottleneck is the insert, not the bisect. Let me just go with two parallel lists.

Wait, actually I can optimize: instead of maintaining _los as a separate list, I can just use the _intervals list and bisect on it with a key. But the insert is still O(n) either way.

Let me just go with the two-list approach. It should be fast enough.

Actually, let me reconsider. 60,000 * 30,000 * 2 * 8 = 28.8 GB of memory moves. Modern CPUs can do ~50 GB/s for sequential memory access. So ~0.6 seconds for the memmoves. Plus Python overhead for 60,000 method calls, each doing a few operations. Should be well under 5 seconds.

The 200,000 contains() calls: each is O(log n) = ~17 comparisons. 200,000 * 17 = 3.4 million operations. Trivial.

I'm confident this will work within the time limit. Let me write the final version.

One more thought: I should make sure that when I do `del self._intervals[left:right + 1]` and then `self._intervals.insert(left, ...)`, this is efficient. The del removes the slice (memmove), and the insert adds one element (memmove). Total memmove is proportional to the number of elements after the deletion point. This is fine.

Let me write the clean final version now.
