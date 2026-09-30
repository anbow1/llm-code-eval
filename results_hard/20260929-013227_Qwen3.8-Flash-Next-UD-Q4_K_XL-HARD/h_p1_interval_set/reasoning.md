Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
- `add(lo, hi)`: Add interval, merge touching/overlapping ones. Ignore if lo >= hi.
- `remove(lo, hi)`: Remove interval, may split. Ignore if lo >= hi.
- `contains(x)`: O(log n) lookup.
- `total_length()`: Sum of lengths.
- `intervals()`: Return sorted, merged, disjoint list.
- `__len__()`: Number of intervals.

For O(log n) `contains()`, I need a sorted structure. I'll use `bisect` module for binary search on a sorted list of interval start points.

Data structure: Keep intervals as a sorted list of tuples `(lo, hi)`, sorted by `lo`.

For `contains(x)`:
- Use `bisect_right` on the list of `lo` values to find the rightmost interval whose `lo <= x`.
- Check if `x < hi` of that interval.

For `add(lo, hi)`:
- Ignore if lo >= hi.
- Find all intervals that overlap or touch [lo, hi). Two intervals touch if one's hi equals the other's lo.
- Merge them all together.
- Insert the merged interval.

For `remove(lo, hi)`:
- Ignore if lo >= hi.
- Find intervals that overlap with [lo, hi).
- For each overlapping interval, either shrink, split, or remove it.

Let me think about the implementation more carefully.

I'll maintain a sorted list of `(lo, hi)` tuples. I'll use a helper list of `lo` values for bisect operations, or I can just use bisect with key parameter (Python 3.10+).

Actually, for simplicity and performance, let me maintain the intervals as a sorted list of tuples and use bisect on a separate list of lo values, or use bisect with key.

Let me use a list of tuples sorted by lo, and use `bisect.bisect_right` with a key function or a separate list.

Actually, in Python 3.10+, `bisect` supports `key` parameter. But for maximum performance, let me maintain a separate list of `lo` values for bisect, and the main list of intervals.

Wait, maintaining two lists in sync is error-prone. Let me just use bisect with key parameter, or use the tuple comparison (tuples compare element-wise, so `(lo, hi)` sorted by lo works).

For `contains(x)`: I need to find the rightmost interval where `lo <= x`. Using `bisect_right` on the list with `(x, inf)` would give me the index after the last interval with `lo <= x`. Actually, `bisect_right(intervals, (x, float('inf')))` gives the index where `(x, inf)` would be inserted to keep sorted order. Since intervals are `(lo, hi)` sorted by lo, this gives the position after the last interval with `lo <= x`. So the candidate is `intervals[idx - 1]` if `idx > 0`.

Wait, let me reconsider. `bisect_right(intervals, (x, float('inf')))` - since tuples compare element by element, this finds the rightmost position where we can insert `(x, inf)`. An interval `(lo, hi)` is less than `(x, inf)` if `lo < x` or (`lo == x` and `hi < inf`), which is always true for the second case. So `bisect_right` gives us the index after all intervals with `lo <= x`. The candidate interval is at index `idx - 1`.

Check: if `intervals[idx-1] = (a, b)` and `a <= x < b`, then x is in the interval.

For `add(lo, hi)`:
- Find the range of intervals that overlap or touch [lo, hi).
- An interval `(a, b)` overlaps or touches [lo, hi) if `b >= lo` and `a <= hi`. (Touching means `b == lo` or `a == hi`.)
- Find start index: first interval where `b >= lo` (i.e., not entirely to the left). Use bisect to find this.
- Find end index: first interval where `a > hi` (i.e., entirely to the right). Use bisect to find this.
- Merge all intervals from start to end into one big interval.
- Replace them in the list.

For finding the start index: I need the first interval whose `hi >= lo`. This is a bit tricky with a list sorted by `lo`. I can iterate from the beginning, but that's O(n). 

Alternative: I can use bisect to narrow down. An interval `(a, b)` with `b < lo` is entirely to the left. Since intervals are sorted by `lo`, and `b > a` always (since lo < hi for valid intervals), intervals with `lo < lo_param` could still have `hi >= lo_param` or `hi < lo_param`.

Hmm, for the start index, I can start from `bisect_right(intervals, (lo, -inf))` and go left while `intervals[i].hi >= lo`. But that's O(n) in worst case.

Actually, let me think differently. For `add`:
1. Start with `[new_lo, new_hi] = [lo, hi]`.
2. Find all intervals that overlap or touch [lo, hi).
3. An interval `(a, b)` overlaps/touches [lo, hi) iff `a <= hi` and `b >= lo` (using >= for touching since [a,b) and [lo,hi) touch when b==lo or a==hi).

Wait, for half-open intervals [a,b) and [c,d):
- They overlap if there exists x with a<=x<b and c<=x<d. This means max(a,c) < min(b,d).
- They "touch" if b == c or d == a (one's end equals the other's start).
- Combined condition for merging: `a <= hi and b >= lo` (i.e., NOT (b < lo or a > hi)).

So I need intervals where NOT (b < lo or a > hi), i.e., b >= lo AND a <= hi.

For finding the start index (first interval with b >= lo):
- I could do a linear scan from a bisect point, but worst case is O(n).
- Alternative: use a different data structure.

For performance with 60,000 adds, I need this to be efficient. Let me think about what data structure gives O(log n) for all operations.

Options:
1. Sorted list + bisect: add/remove are O(n) due to list insertion/deletion, but contains is O(log n).
2. Balanced BST / Red-Black tree: O(log n) for all, but complex to implement in pure Python.
3. Sorted list with amortized cost: still O(n) for insert.

Given the constraint "60,000 add() calls of small disjoint intervals in random order followed by 200,000 contains() calls must take well under 5 seconds", the bottleneck is likely the 200,000 contains() calls needing O(log n). The 60,000 adds with list operations would be O(n) each in worst case, but 60,000 * 60,000 = 3.6 billion operations which is too slow.

Wait, but they're "small disjoint intervals in random order" - so most adds won't merge with existing intervals (they're disjoint). The issue is list insertion is O(n) for shifting elements.

Hmm, let me reconsider. With a Python list, inserting into the middle is O(n) due to shifting. 60,000 inserts would be O(n^2) = 3.6 * 10^9 element moves. That might be too slow.

Alternative: Use a sorted data structure. In pure Python, I could use a skip list or an AVL tree implemented manually. Or I could batch operations.

Actually wait - let me re-read: "60,000 add() calls of small disjoint intervals in random order". If they're disjoint, no merging is needed. The cost is finding the insertion point (O(log n) with bisect) and inserting into a list (O(n) for shifting). Total: O(n^2) for all adds. n=60000, so 60000^2 = 3.6e9... that's definitely too slow for Python.

Let me use a different approach. I could use a sorted list implementation based on a balanced BST or a B-tree-like structure. Or I could use a different strategy.

Actually, Python's list insertion at a random position in a list of 60,000 elements... let me think. `list.insert(idx, item)` shifts elements. For 60,000 elements, average shift is 30,000. Total shifts across 60,000 inserts: roughly 60000 * 30000 = 1.8e9. In CPython, list operations are implemented in C, so shifting a pointer is fast. Let's say 1-2 ns per pointer shift. 1.8e9 * 2ns = 3.6 seconds. That's borderline.

Hmm, maybe it's okay since the shifting is in C. Let me try with a sorted list approach and see.

Actually, let me reconsider. The problem says "well under 5 seconds". Python list operations in C are quite fast. 60,000 inserts into a list of up to 60,000 elements... In practice, `list.insert` in CPython is a memmove of pointers, which is very fast. Let me estimate: memmove of 30,000 pointers (8 bytes each) = 240KB. 60,000 times = 14.4 GB of memmove. At memory bandwidth of ~20 GB/s, that's about 0.7 seconds. Plus Python overhead for the bisect and function calls. Should be under 5 seconds.

Actually, I think using a sorted list with bisect should work fine. Let me go with that approach.

Let me also consider using a `sortedcontainers`-like structure, but since we're limited to stdlib, I'll use a plain list with bisect.

Let me code this up:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # sorted list of (lo, hi) tuples, disjoint, no touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find intervals that overlap or touch [lo, hi)
        # Condition: a <= hi and b >= lo (NOT (b < lo or a > hi))
        
        ivals = self._intervals
        n = len(ivals)
        
        # Find start: first index where ivals[i][1] >= lo
        # i.e., first index where NOT (ivals[i][1] < lo)
        # We can start from bisect_right position for lo and go left
        start = bisect.bisect_left(ivals, (lo, float('-inf')))
        # Check if the interval just before start also touches
        if start > 0 and ivals[start - 1][1] >= lo:
            start -= 1
        
        # Find end: first index where ivals[i][0] > hi
        # i.e., first index NOT overlapping on the right
        end = bisect.bisect_right(ivals, (hi, float('inf')))
        
        # Merge intervals from start to end-1 with [lo, hi)
        new_lo = lo
        new_hi = hi
        for i in range(start, end):
            a, b = ivals[i]
            new_lo = min(new_lo, a)
            new_hi = max(new_hi, b)
        
        # Replace intervals[start:end] with [new interval]
        ivals[start:end] = [(new_lo, new_hi)]
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        ivals = self._intervals
        n = len(ivals)
        
        # Find intervals that overlap with [lo, hi)
        # Overlap condition: a < hi and b > lo
        # Start: first index where ivals[i][1] > lo (interval extends past lo)
        # End: first index where ivals[i][0] >= hi (interval starts at or after hi)
        
        start = bisect.bisect_left(ivals, (lo, float('-inf')))
        if start > 0 and ivals[start - 1][1] > lo:
            start -= 1
        
        end = bisect.bisect_left(ivals, (hi, float('-inf')))
        
        # Process intervals from end-1 down to start (process right to left to avoid index issues)
        # Actually, let's build the replacement list
        replacements = []
        for i in range(start, end):
            a, b = ivals[i]
            # Interval [a, b) minus [lo, hi)
            if a < lo:
                replacements.append((a, lo))
            if b > hi:
                replacements.append((hi, b))
        
        ivals[start:end] = replacements
    
    def contains(self, x):
        ivals = self._intervals
        # Find rightmost interval with lo <= x
        idx = bisect.bisect_right(ivals, (x, float('inf')))
        if idx == 0:
            return False
        a, b = ivals[idx - 1]
        return a <= x < b
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, let me double-check the `add` logic for touching intervals. The requirement says "touching intervals merged ([1,3) + [3,5) gives [(1, 5)]".

With my code: adding [1,3) then [3,5).
- After adding [1,3): ivals = [(1,3)]
- Adding [3,5): lo=3, hi=5
  - start = bisect_left([(1,3)], (3, -inf)) = 1 (since (1,3) < (3,-inf))
  - Check start > 0 and ivals[0][1] >= lo: 3 >= 3 → True, so start = 0
  - end = bisect_right([(1,3)], (5, inf)) = 1
  - Merge: new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5
  - ivals[0:1] = [(1, 5)]
  - Result: [(1, 5)] ✓

Let me check `remove`:
- ivals = [(0, 10)]
- remove(3, 7):
  - start = bisect_left([(0,10)], (3, -inf)) = 1
  - Check start > 0 and ivals[0][1] > lo: 10 > 3 → True, start = 0
  - end = bisect_left([(0,10)], (7, -inf)) = 1
  - Process i=0: a=0, b=10. a < lo(3) → add (0, 3). b > hi(7) → add (7, 10).
  - ivals[0:1] = [(0, 3), (7, 10)]
  - Result: [(0, 3), (7, 10)] ✓

Let me check `contains`:
- ivals = [(1, 3), (5, 8)]
- contains(2): bisect_right([(1,3),(5,8)], (2, inf)) = 1. ivals[0] = (1,3). 1 <= 2 < 3 → True ✓
- contains(3): bisect_right([(1,3),(5,8)], (3, inf)) = 1. ivals[0] = (1,3). 1 <= 3 < 3 → False ✓ (half-open)
- contains(5): bisect_right([(1,3),(5,8)], (5, inf)) = 2. ivals[1] = (5,8). 5 <= 5 < 8 → True ✓
- contains(0): bisect_right([(1,3),(5,8)], (0, inf)) = 0. idx==0 → False ✓

Looks good.

Now let me think about edge cases:
- add(lo, hi) where lo == hi: ignored ✓
- remove(lo, hi) where lo == hi: ignored ✓
- remove that doesn't intersect any interval: start == end, replacements is empty, ivals[start:end] = [] (no change) ✓
- Adding interval that completely contains existing intervals: all get merged ✓

One issue: in `remove`, the overlap condition should be `a < hi and b > lo` (strict, since intervals are half-open). Let me verify:
- [1,3) and remove [3,5): do they overlap? max(1,3) < min(3,5) → 3 < 3 → False. No overlap. Correct.
- [1,3) and remove [2,4): max(1,2) < min(3,4) → 2 < 3 → True. Overlap. Correct.

My start condition: first index where ivals[i][1] > lo (strict >). An interval [a,b) extends past lo only if b > lo. If b == lo, then [a, lo) and [lo, hi) don't overlap. Correct.

My end condition: first index where ivals[i][0] >= hi. An interval [a,b) starts at or after hi, meaning a >= hi. If a == hi, then [a,b) starts where [lo,hi) ends, no overlap. Correct.

Wait, let me recheck `add` with touching:
- [1,3) touching [3,5): b >= lo means 3 >= 3 → True. They should merge. ✓
- For the overlap check in add, I use `b >= lo` (inclusive) to catch touching. And `a <= hi` (inclusive) to catch touching on the other side. Let me verify the bisect for `end`:
  - end = bisect_right(ivals, (hi, float('inf'))). This gives first index where ivals[i] > (hi, inf), i.e., ivals[i][0] > hi (since if ivals[i][0] == hi, then (hi, something) < (hi, inf) is True... wait).
  
  Actually, `(hi, inf)` - bisect_right finds the rightmost position where `(hi, inf)` can be inserted. An element `(a, b)` is <= `(hi, inf)` if `a < hi` or (`a == hi` and `b <= inf`). Since b is always finite, `a == hi` means `(a,b) <= (hi, inf)` is True. So bisect_right gives the index after all elements with `a <= hi`. 

  So `end` = index after last interval with `a <= hi`. Intervals at index < end have `a <= hi`, which is the condition `a <= hi` for overlap/touch. ✓

  And `start` = first index where `b >= lo` (I go left from bisect position if needed). ✓

  Actually wait, let me re-examine the start logic:
  ```
  start = bisect_left(ivals, (lo, float('-inf')))
  if start > 0 and ivals[start - 1][1] >= lo:
      start -= 1
  ```
  
  `bisect_left(ivals, (lo, -inf))`: finds leftmost index where `(lo, -inf)` can be inserted. An element `(a,b)` < `(lo, -inf)` if `a < lo` or (`a == lo` and `b < -inf`). Since b > a (valid intervals), b is never < -inf when a == lo. So this is essentially finding the first index where `a >= lo`.

  Then if `intervals[start-1]` has `b >= lo`, it also touches/overlaps, so we include it.

  But what if there are multiple intervals before `start` that touch? No, since intervals are disjoint and sorted. Only the immediately preceding interval could touch (its `b == lo`).

  Actually, could there be a case where `start - 1` has `b >= lo` but `start - 2` also has `b >= lo`? No, because intervals are disjoint and sorted. If `intervals[start-2] = (a2, b2)` and `intervals[start-1] = (a1, b1)`, then `b2 <= a1` (disjoint and sorted). And `a1 < lo` (since start-1 < start). So `b2 <= a1 < lo`. Therefore `b2 < lo`. So only start-1 could possibly have b >= lo. ✓

Similarly for remove:
```
start = bisect_left(ivals, (lo, float('-inf')))
if start > 0 and ivals[start - 1][1] > lo:
    start -= 1
```
Only start-1 could have b > lo (since b2 <= a1 < lo for start-2). ✓

Great, the logic is sound.

Let me also think about the performance concern. For `add`:
- bisect: O(log n)
- Loop to find min/max: O(k) where k is number of merged intervals (usually small for disjoint adds)
- List slice assignment: O(n) in worst case for shifting, but in C.

For 60,000 disjoint adds: each add doesn't merge, so k=0, and the list slice is just inserting one element. The memmove in C should handle 60,000 inserts fine.

For `contains`: O(log n) via bisect. 200,000 calls at log2(60000) ≈ 16 comparisons each. Very fast.

I think this solution will perform well. Let me also add `__repr__` or `__iter__`? The problem doesn't ask for them, so I'll skip.

Actually, let me also think about whether I need `__contains__` for the `in` operator. The problem just says `contains(x) -> bool`, so I'll implement that method. But adding `__contains__` as well wouldn't hurt and is Pythonic.

Let me finalize the code. I'll keep it clean and efficient.

One more thought: should I use `__slots__` for slightly faster attribute access? Probably marginal. Let me include it for good measure.

Actually, let me not overthink this and just write clean code.
