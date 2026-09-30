The user wants a class `IntervalSet` that stores disjoint half-open intervals [lo, hi). Let me think about the design.

Key requirements:
- add(lo, hi): add interval, ignore if lo >= hi
- remove(lo, hi): remove interval, may split
- contains(x): O(log n)
- total_length(): sum of lengths
- intervals(): sorted, disjoint, merged touching intervals
- __len__(): number of intervals
- Performance: 60,000 add() calls of small disjoint intervals in random order, then 200,000 contains() calls must be under 5 seconds.

For O(log n) contains and efficient add/remove, I should use a sorted structure. Since Python doesn't have a built-in balanced BST, I can use `bisect` module with a sorted list. But for 60,000 add calls in random order, a sorted list with bisect insertion would be O(n) per insertion due to shifting, giving O(n²) total which is 60000² = 3.6 billion - too slow.

Wait, let me reconsider. With 60,000 intervals, inserting into a sorted list of up to 60,000 elements... each insertion is O(n) for the list shift. That's 60,000 * 60,000 = 3.6 billion operations. That might be too slow.

Actually, for small disjoint intervals in random order, each add would need to find the position (O(log n) with bisect) and then insert (O(n) for list shifting). 60,000 insertions into a list of growing size... the total cost is sum of list sizes = 1 + 2 + ... + 60000 ≈ 1.8 billion element copies. In Python that's probably too slow.

Hmm, but wait - "small disjoint intervals in random order". If they're disjoint, each add just inserts a new interval. The list shifting is the bottleneck. Let me think...

Actually in CPython, list.insert is implemented in C and is quite fast for shifting. Let me estimate: 60,000 inserts, average list size 30,000, so about 1.8 billion pointer moves. In C, pointer moves are very fast (maybe 1-2 ns each), so about 2-4 seconds. It might be tight but could work.

Alternatively, I could use a different approach. Since intervals are disjoint, I can store them as a sorted list of (lo, hi) tuples and use bisect on the lo values. For contains(x), I can use bisect_right to find the interval that might contain x, which is O(log n).

For add: find position with bisect, check for overlaps, merge, insert. For disjoint intervals in random order, each add is a simple insertion - bisect to find position, then list.insert.

For remove: more complex as it may split intervals.

Let me think about performance more carefully. 60,000 add calls - the key insight is that these are "small disjoint intervals in random order". So each add() call:
1. bisect to find position: O(log n)
2. Check neighbors for overlap: O(1) since they're disjoint
3. list.insert: O(n) for shifting

Total shifting cost: sum from i=0 to 59999 of i = ~1.8 billion. In CPython's C implementation of list.insert, each pointer copy is very fast. Let me estimate: 1.8 billion * ~5ns per element = 9 seconds. Hmm, that might be too slow.

Wait, actually CPython list.insert shifts elements with memmove which is very fast - essentially memcpy speed. For a list of 60,000 PyObject pointers, that's 60000 * 8 = 480KB per insert, and memmove of 480KB takes maybe 1-2 microseconds. For 60,000 inserts: 60000 * ~500ns average = ~30ms. Actually I think this will be fine. The overhead is in the Python function calls and tuple creation, not the memmove.

Let me reconsider: 60,000 Python function calls with bisect + list.insert. Each call involves Python interpreter overhead. Probably ~10-50 microseconds each. 60,000 * 30μs = 1.8 seconds. Plus 200,000 contains calls each at ~5-10μs = 1-2 seconds. Total ~3-4 seconds. Should be under 5 seconds.

Actually, let me use `bisect` module for O(log n) contains. The data structure will be two parallel sorted lists (or a list of tuples sorted by lo).

Let me design:
- Store intervals as a sorted list of (lo, hi) tuples.
- For contains(x): bisect_right on lo values to find the rightmost interval with lo <= x, then check if x < hi.

For the bisect, I need a key. Since I'm storing tuples, I can bisect on the list of tuples. But tuples compare by first element first, so bisect_right(intervals, (x, float('inf'))) would give the insertion point for (x, inf), and the interval at index pos-1 is the one that might contain x.

Let me code this up:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        # Find position where lo would be inserted
        pos = bisect.bisect_left(intervals, (lo,))
        # Check if overlapping with previous interval
        if pos > 0 and intervals[pos - 1][1] >= lo:
            # Merge with previous
            pos -= 1
            lo = min(lo, intervals[pos][0])
            hi = max(hi, intervals[pos][1])
        # Merge with subsequent overlapping intervals
        end = pos + 1
        while end < len(intervals) and intervals[end][0] <= hi:
            hi = max(hi, intervals[end][1])
            end += 1
        intervals[pos:end] = [(lo, hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        intervals = self._intervals
        # Find intervals that overlap with [lo, hi)
        # First, find the leftmost interval with hi > lo
        pos = bisect.bisect_left(intervals, (lo,))
        # Also check interval before pos whose hi > lo
        if pos > 0 and intervals[pos - 1][1] > lo:
            pos -= 1
        
        # Find all intervals that intersect with [lo, hi)
        new_intervals = []
        end = pos
        while end < len(intervals) and intervals[end][0] < hi:
            ilo, ihi = intervals[end]
            # Left part: [ilo, lo) if ilo < lo
            if ilo < lo:
                new_intervals.append((ilo, lo))
            # Right part: [hi, ihi) if ihi > hi
            if ihi > hi:
                new_intervals.append((hi, ihi))
            end += 1
        
        intervals[pos:end] = new_intervals
    
    def contains(self, x):
        intervals = self._intervals
        # Find rightmost interval with lo <= x
        pos = bisect.bisect_right(intervals, (x, float('inf')))
        if pos == 0:
            return False
        lo, hi = intervals[pos - 1]
        return lo <= x < hi
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, for `contains`, using `bisect_right(intervals, (x, float('inf')))` - this finds the position where (x, inf) would be inserted. Since tuples compare lexicographically, (x, inf) > (x, y) for any y < inf. So bisect_right gives the position after all intervals with lo == x. The interval at pos-1 has lo <= x, and we check if x < hi.

But wait - `float('inf')` might not work well with all types. If lo/hi are ints, comparing (x, float('inf')) with (lo, hi) where lo == x works fine since inf > any hi. But what if x is an int and intervals have int bounds? (x, float('inf')) vs (x, 10) - yes inf > 10, so bisect_right gives position after (x, 10). Good.

Actually, let me think more carefully. bisect_right(intervals, (x, float('inf'))) - this finds the rightmost position where (x, inf) could be inserted maintaining order. All tuples with first element < x come before. All tuples with first element == x come before (x, inf) since inf > any second element. All tuples with first element > x come after. So pos-1 gives the last interval with lo <= x. That's correct.

For performance: using a plain list with bisect should work well. Let me also think about whether I need to store lo values separately for faster bisect. Actually bisect on a list of tuples should be fine since it compares tuples.

One concern: for 60,000 random disjoint intervals, the add operation. Since they're disjoint, for each new interval [lo, hi):
- bisect_left finds the position (O(log n))
- No merging needed (disjoint)
- list.insert(pos, (lo, hi)) - O(n) memmove

The total memmove cost: sum of n_i for each insertion. n_i grows from 1 to 60000. Total ≈ 60000 * 60000 / 2 = 1.8 billion element moves. But in CPython, list.insert uses memmove on PyObject* arrays, which at 8 bytes each is about 14.4 GB of data moved. At memory bandwidth of ~20 GB/s, that's about 0.7 seconds. Plus Python overhead of 60,000 function calls, maybe 1-2 seconds total. Should be fine.

Let me also make sure the `remove` method handles edge cases properly. If removing [lo, hi) and an interval [a, b) overlaps:
- If a >= hi: no overlap (handled by loop condition)
- If b <= lo: no overlap (but we've already advanced past it)
- If a < lo and b > hi: split into [a, lo) and [hi, b)
- If a < lo and b <= hi: trim to [a, lo)
- If a >= lo and b > hi: trim to [hi, b)
- If a >= lo and b <= hi: remove entirely

The loop condition `intervals[end][0] < hi` - this finds intervals whose lo < hi, meaning they start before the removal ends. Combined with starting at pos (where the first interval with lo >= lo is found, adjusted for previous interval that might extend past lo).

Actually, let me reconsider the initial position finding for remove. I need all intervals [a, b) where a < hi AND b > lo. 

- Intervals with a >= hi don't overlap (they start after removal ends) - loop condition handles this
- Intervals with b <= lo don't overlap (they end before removal starts)

To find the first potentially overlapping interval:
- bisect_left(intervals, (lo,)) gives first interval with a >= lo. But an interval before this could have b > lo (it starts before lo but extends past it).
- So I check pos-1 for that case.

The loop condition `intervals[end][0] < hi` ensures we stop when intervals start at or after hi. Good.

Let me refine the code. I think it's solid. Let me also make sure I handle the `float('inf')` in contains properly - I should import math.inf or just use float('inf'). Actually I'll just use a large sentinel or restructure.

Alternative for contains: instead of using (x, float('inf')), I can bisect on just the lo values:

```python
pos = bisect.bisect_right([lo for lo, hi in intervals], x)
```

But that creates a new list each time - O(n) overhead. Not good.

Better: I can store a separate list of lo values. Or I can use a custom key. Actually, since the intervals are sorted by lo (and tuples compare by first element first), bisect_right(intervals, (x, float('inf'))) works perfectly and is O(log n) without creating any extra lists.

Actually wait, there's a subtle issue. If x is an int and I compare (x, float('inf')) with (lo, hi) where lo == x and hi is an int - this works fine in Python. inf > any int. Good.

But what if x is float('inf')? Then (inf, inf) vs (inf, hi) - hmm, but x = inf means x is at infinity, which shouldn't be contained in any finite interval. Let me check: bisect_right(intervals, (inf, inf)) would give len(intervals). intervals[-1][0] = some finite lo <= inf. Then check lo <= inf < hi? If hi is finite, inf < hi is False. If hi is also inf... well the problem says "real numbers" so probably finite. I'll not worry about infinite x.

Let me finalize the code. I'll use a simple approach with sorted list and bisect.

Actually, one more thought on performance. For `bisect.bisect_right(intervals, (x, float('inf')))`, creating the tuple `(x, float('inf'))` each time adds overhead. For 200,000 calls, creating 200,000 tuples is fine.

I could optimize by using a separate list of lo values and maintaining it in sync. But that adds complexity and the tuple comparison in bisect should be fine.

Let me write the final version:
