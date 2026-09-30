The user wants a class `IntervalSet` that stores disjoint half-open intervals [lo, hi). Let me think about the design:

Key requirements:
1. `add(lo, hi)` - add interval, merge with existing overlapping/touching intervals
2. `remove(lo, hi)` - remove interval, may split intervals
3. `contains(x)` - O(log n) lookup
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, disjoint, merged
6. `__len__()` - number of intervals
7. Performance: 60,000 add() calls + 200,000 contains() calls must be well under 5 seconds

For O(log n) `contains()`, I need a sorted structure. Python's standard library has `bisect` module which gives O(log n) binary search on a sorted list.

Design approach:
- Store intervals in a sorted list (sorted by `lo` value).
- Use `bisect` for O(log n) lookups.
- For `add()`, use binary search to find where the new interval would go, then merge with all overlapping/touching intervals.
- For `remove()`, use binary search to find affected intervals, then modify/split them.

Let me think about the data structure:
- A sorted list of `(lo, hi)` tuples.
- For `contains(x)`: binary search for the rightmost interval with `lo <= x`, then check if `x < hi`.
- For `add(lo, hi)`: find all intervals that overlap or touch `[lo, hi)`, merge them all into one.
- For `remove(lo, hi)`: find all intervals that overlap with `[lo, hi)`, remove the overlap from each.

Let me think about `contains(x)`:
- Use `bisect_right` on the list of `lo` values to find the insertion point of `x`.
- The candidate interval is at index `idx - 1` (the interval with the largest `lo <= x`).
- Check if `x < intervals[idx-1][1]`.

Actually, I need to be careful. Let me use `bisect.bisect_right` with the list of tuples. Since tuples compare lexicographically, `bisect_right(intervals, (x, float('inf')))` would give me the insertion point after all intervals with `lo <= x`. Then I check `intervals[idx-1]`.

Wait, actually I should use a separate list of `lo` values for binary search, or I can use `bisect_right` on the intervals list itself with a key trick.

In Python 3.11+, `bisect` doesn't have a `key` parameter directly in `bisect_right`... wait, actually it does! Python 3.10 added `key` parameter to bisect module. Let me check - actually `bisect_right(a, x, lo=0, hi=len(a), *, key=None)` was added in 3.10.

So I can do: `idx = bisect.bisect_right(self._intervals, x, key=lambda t: t[0])`

This finds the rightmost position where `x` could be inserted based on `t[0]` (the `lo` value). Then `self._intervals[idx-1]` is the candidate interval.

For `add(lo, hi)`:
1. If lo >= hi, ignore.
2. Find the first interval that could overlap with [lo, hi). An interval (a, b) overlaps or touches [lo, hi) if a < hi and b > lo (actually for touching, b >= lo... wait no, for half-open intervals [a,b) and [lo,hi), they touch if b == lo. So they should be merged if a < hi and b >= lo... no wait, [a,b) touches [lo,hi) if b >= lo and a <= hi. Actually, for merging, we need them to overlap or be adjacent. Two half-open intervals [a,b) and [c,d) are mergeable if b >= c or d >= a. Actually the condition is: max(a,c) < min(b,d) for overlap, or b == c or d == a for touching.

The simpler condition: [a,b) and [c,d) can be merged (are overlapping or touching) iff a < d and c < b. Wait no: [a,b) and [c,d) are overlapping or touching iff NOT (b <= c or d <= a), i.e., b > c and d > a. Hmm, but if b == c, they're touching and should be merged. So the condition is b >= c and d >= a. Wait, if b > c and a < d, that's overlap. If b == c, that's touching. So the condition for mergeable is b >= c and a <= d. Which simplifies to: a < d and b >= c. Actually let me think more carefully.

Two intervals [a,b) and [c,d): they are disjoint iff b <= c or d <= a. They are overlapping or touching (mergeable) iff NOT(b <= c or d <= a) = b > c AND d > a. But touching means b == c (or d == a). So mergeable = b >= c AND d >= a.

For add(lo, hi), I need to find all intervals that are mergeable with [lo, hi):
- An interval (a, b) is mergeable with (lo, hi) iff b >= lo and a <= hi. Wait: b > lo and a < hi for overlap, b >= lo and a <= hi for including touching.

Actually, let me reconsider. If I have interval (a, b) and I want to add (lo, hi):
- They overlap if max(a, lo) < min(b, hi), i.e., a < hi and lo < b.
- They touch if b == lo or a == hi.
- So mergeable condition: b >= lo and a <= hi.

Wait, if a == hi, then [a,b) starts at hi, and [lo,hi) ends at hi. They touch. So yes, a <= hi and b >= lo is the merge condition.

Hmm, but actually I realize the condition `a <= hi` is very broad. Let me think again:
- [a,b) and [lo,hi) are mergeable (overlap or adjacent) iff b >= lo AND hi >= a.
  - If b < lo: [a,b) is entirely to the left of [lo,hi), not mergeable.
  - If hi < a: [lo,hi) is entirely to the left of [a,b), not mergeable.
  - Otherwise they overlap or touch.

So the condition is: `not (b < lo or hi < a)` which is `b >= lo and hi >= a`.

Wait, but that's very broad. If I have interval [0, 100) and I add [50, 51), then b=100 >= lo=50 and hi=51 >= a=0, so they're mergeable. That's correct - [50,51) is contained in [0,100) so the result is still [0,100).

OK so for `add`:
1. Find the first interval with `b >= lo` (since we need b >= lo for mergeability). Actually, since intervals are sorted by `a`, and we know they're disjoint, if `b < lo` for an interval, all intervals to the left also have `b < lo`. So I can binary search for the first interval where `b >= lo`.

Hmm, but I'm sorting by `a` not `b`. Let me think differently.

Since intervals are sorted by `a` and disjoint, for a given `lo`, the first potentially mergeable interval has `a <= hi` (since we need `hi >= a` for mergeability). But also we need `b >= lo`. Since intervals are sorted by `a`, all intervals with `a < lo` are to the left. The first one that could have `b >= lo` is the one right before the insertion point of `lo`.

Let me use a different approach:
1. Find `idx` = position where `lo` would be inserted (based on `a` values) using `bisect_right(self._intervals, lo, key=lambda t: t[0])`. This gives the first interval with `a > lo`.
2. The candidate start is `idx - 1` (the interval just before, which might have `b >= lo`). But also `idx` itself might have `a <= hi`.
3. So I need to check from `max(0, idx-1)` to `idx` and beyond until `a > hi`.

Actually let me think of a cleaner approach:
1. Find `start_idx`: the first index where interval's `b >= lo`. Since intervals are sorted by `a` and disjoint, I can binary search. But I'm not indexing by `b`...

Alternative cleaner approach:
1. Find `idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[0])`. This is the first interval with `a > lo`.
2. Check if `self._intervals[idx-1][1] >= lo` (if idx > 0). If so, that interval overlaps/touches.
3. Also check from `idx` onwards: any interval with `a <= hi` overlaps/touches.
4. Collect all mergeable intervals, compute new `(new_lo, new_hi)` = `(min of all los, max of all his)`, remove them all, insert the merged one.

Let me code this up:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    # Find first interval with a > lo
    idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[0])
    
    # Check if previous interval overlaps
    if idx > 0 and self._intervals[idx - 1][1] >= lo:
        idx -= 1
    
    # Collect all overlapping/touching intervals
    merge_lo = lo
    merge_hi = hi
    end_idx = idx
    while end_idx < len(self._intervals) and self._intervals[end_idx][0] <= hi:
        merge_lo = min(merge_lo, self._intervals[end_idx][0])
        merge_hi = max(merge_hi, self._intervals[end_idx][1])
        end_idx += 1
    
    if end_idx > idx:
        self._intervals[idx:end_idx] = [(merge_lo, merge_hi)]
    else:
        self._intervals.insert(idx, (merge_lo, merge_hi))
```

Wait, I need to be more careful. The condition for mergeability is `b >= lo and a <= hi` (I wrote it as `a <= hi` earlier but let me double check). Actually:
- Two intervals [a,b) and [lo,hi) merge if b >= lo AND a <= hi.

Hmm wait, if a == hi, then [a,b) starts exactly where [lo,hi) ends. They're adjacent and should be merged. So condition is a <= hi. Yes.

But in my while loop, I check `self._intervals[end_idx][0] <= hi`. That's checking `a <= hi`. But I also need `b >= lo` for the first interval before idx. Let me re-examine.

After `idx = bisect_right(..., lo, key=lambda t: t[0])`, `idx` is the first interval with `a > lo`. So all intervals at indices < idx have `a <= lo`. For such an interval (a, b), since a <= lo, the condition `a <= hi` is automatically satisfied (since lo < hi). So the merge condition reduces to `b >= lo`. That's what I check with `self._intervals[idx-1][1] >= lo`.

For intervals at indices >= idx, `a > lo`, so `b > a > lo` (since b > a for valid intervals), meaning `b >= lo` is automatically satisfied. The merge condition reduces to `a <= hi`. That's what I check in the while loop.

Great, so the logic is correct. But I need to also include `idx-1` in the merge range if it's mergeable. Let me adjust:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[0])
    
    # Check if previous interval overlaps/touches
    if idx > 0 and self._intervals[idx - 1][1] >= lo:
        idx -= 1
    
    merge_lo = lo
    merge_hi = hi
    end_idx = idx
    while end_idx < len(self._intervals) and self._intervals[end_idx][0] <= hi:
        merge_lo = min(merge_lo, self._intervals[end_idx][0])
        merge_hi = max(merge_hi, self._intervals[end_idx][1])
        end_idx += 1
    
    if end_idx > idx:
        self._intervals[idx:end_idx] = [(merge_lo, merge_hi)]
    else:
        self._intervals.insert(idx, (merge_lo, merge_hi))
```

Wait, if `end_idx > idx`, that means we found at least one interval to merge. But what if the only mergeable interval is `idx-1` (the one we just decremented to)? Then `end_idx` starts at `idx` which is the original `idx-1` position. The while loop checks `self._intervals[end_idx][0] <= hi`. Since `self._intervals[idx][0] <= lo < hi` (because we decremented idx to a position where a <= lo), the condition `a <= hi` is true (since a <= lo < hi). So the while loop will include it. Good.

Actually wait, if idx was decremented, then `self._intervals[idx][0] <= lo < hi`, so `a <= hi` is satisfied, and the while loop will include it. Then `end_idx` will be at least `idx + 1`, so `end_idx > idx`. Good.

What about the case where no intervals overlap? Then `idx` is not decremented (because `self._intervals[idx-1][1] < lo`), and the while loop condition `self._intervals[end_idx][0] <= hi` might be false if the first interval after the gap has `a > hi`. In that case `end_idx == idx` and we insert. Good.

Now for `remove(lo, hi)`:
1. Find intervals that overlap with [lo, hi).
2. An interval (a, b) overlaps with [lo, hi) if a < hi and b > lo (strict overlap, since removing [lo,hi) from [a,b) makes sense only if they actually overlap in the interior).

Wait, if they only touch (b == lo or a == hi), removing [lo,hi) from [a,b) doesn't change [a,b). So for remove, I need strict overlap: `a < hi and b > lo`.

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    # Find first interval that could overlap with [lo, hi)
    # An interval (a,b) overlaps iff a < hi and b > lo
    # Since sorted by a, find first with a < hi... well all with a < hi could potentially overlap
    # But we need b > lo too.
    
    # Find first interval with a >= hi - these and after don't overlap
    end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])
    # Wait, bisect_left gives first index with a >= hi. Intervals before that have a < hi.
    # But we also need b > lo.
    
    # Find the first interval that could have b > lo
    # Since intervals are sorted by a and disjoint, if interval i has b <= lo, 
    # then all intervals before it also have b <= lo (since they end before it starts... wait no)
    # Actually if interval i is (a_i, b_i) and interval i+1 is (a_{i+1}, b_{i+1}),
    # since they're disjoint and sorted, b_i <= a_{i+1}. So if b_i <= lo, then for all j > i,
    # b_j >= a_j > a_i >= b_{i-1}... hmm this doesn't directly help.
    
    # Let me use a simpler approach: find the first interval with a < hi,
    # then check forward for b > lo.
    
    start_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])
    # Intervals at indices < start_idx have a < hi. But some of them might have b <= lo.
    # Find the first one with b > lo. Since intervals are sorted by a and disjoint,
    # b values are also increasing (because b_i <= a_{i+1} < b_{i+1}... wait no, b_i <= a_{i+1}).
    # Actually if intervals are sorted by a and disjoint, then b_i <= a_{i+1}. 
    # So b_1 < b_2 < ... is NOT guaranteed (b_1 could be 100, a_2 = 101, b_2 = 102).
    # But b_1 < b_2 is guaranteed since b_1 <= a_2 < b_2.
    # Yes! Since intervals are disjoint and sorted by a: b_i <= a_{i+1} < b_{i+1}.
    # So b values are strictly increasing. So I can binary search for the first b > lo.
    
    # Actually, let me just find the right approach:
    # I need intervals where a < hi AND b > lo.
    # Since a values increase, "a < hi" means indices < end_idx (where end_idx = bisect_left for hi).
    # Since b values increase, "b > lo" means indices >= start_idx (where start_idx = bisect_right for lo on b values).
    # But I don't have a separate b list...
    
    # Simpler: I know b values are increasing (as argued above). So I can binary search.
    # Find first index where b > lo: bisect_right(self._intervals, lo, key=lambda t: t[1])
    # Then iterate from there to end_idx.
```

OK this is getting complex. Let me simplify:

Since intervals are disjoint and sorted by `a`, the `b` values are strictly increasing (b_i < b_{i+1} because b_i <= a_{i+1} < b_{i+1}).

So:
- `start_idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[1])` gives the first index where `b > lo`.
- `end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])` gives the first index where `a >= hi`.

All intervals from `start_idx` to `end_idx - 1` overlap with `[lo, hi)`.

Then for each such interval (a, b):
- The part before `[lo, hi)` is `(a, min(b, lo))` if `a < lo`.
- The part after `[lo, hi)` is `(max(a, hi), b)` if `b > hi`.
- Remove the interval, and optionally add back the left and right parts.

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    start_idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[1])
    end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])
    
    if start_idx >= end_idx:
        return
    
    new_intervals = []
    for i in range(start_idx, end_idx):
        a, b = self._intervals[i]
        if a < lo:
            new_intervals.append((a, lo))
        if b > hi:
            new_intervals.append((hi, b))
    
    self._intervals[start_idx:end_idx] = new_intervals
```

This should work.

For `contains(x)`:
```python
def contains(self, x):
    idx = bisect.bisect_right(self._intervals, x, key=lambda t: t[0])
    if idx > 0:
        a, b = self._intervals[idx - 1]
        return a <= x < b  # since a <= x is guaranteed by the search
    return False
```

Wait, `bisect_right` with key gives the rightmost position where `x` could be inserted. So all intervals at indices < idx have `a <= x`. The one at `idx-1` has the largest `a <= x`. Since intervals are disjoint and sorted, if `x` is in any interval, it must be in the one at `idx-1`. So check `x < b`.

Actually `a <= x` is guaranteed since we used `bisect_right` (which finds rightmost position, so all entries before have key <= x). So just check `x < b`.

```python
def contains(self, x):
    idx = bisect.bisect_right(self._intervals, x, key=lambda t: t[0])
    if idx == 0:
        return False
    a, b = self._intervals[idx - 1]
    return x < b
```

Now for performance: 60,000 add() calls of small disjoint intervals in random order.

The problem is that inserting into a list is O(n) due to shifting. With 60,000 intervals, each insertion could shift up to 60,000 elements. That's O(n²) total = 3.6 billion operations. That might be too slow.

Hmm, but the problem says "well under 5 seconds". Let me think about what "small disjoint intervals" means. If they're truly disjoint, then each `add()` would just insert one interval (no merging needed), but the list insertion itself is O(n) for shifting.

60,000 * 60,000 = 3.6 billion. In CPython, list insertion involves memmove which is fast (memcpy), but still might be too slow.

Alternative: use a sorted container. But we're limited to the standard library.

Actually wait, let me reconsider. With `bisect.insort`, the binary search is O(log n) but the actual insertion (shifting) is O(n). For 60,000 intervals, the total work for all insertions is O(n²) = O(60000²) = 3.6 × 10⁹.

In practice, Python's list insertion uses memmove which is quite fast. Let me estimate: 60000 insertions, average shift of 30000 elements, each element is a pointer (8 bytes). Total bytes moved: 60000 * 30000 * 8 = 14.4 GB. At ~10 GB/s memory bandwidth, that's about 1.4 seconds. Plus overhead of the bisect and other operations. Might be close to 5 seconds.

Hmm, but the problem says "well under 5 seconds", so maybe it's OK. Or maybe I need a better data structure.

Actually, I realize that for "small disjoint intervals in random order", the merging logic might actually help reduce the list size temporarily but then it grows back. Let me think...

Actually, "small disjoint intervals" - if they're disjoint and small, then adding them in random order means:
- First add: list has 1 element.
- Each subsequent add: binary search to find position (O(log n)), then check if neighbors overlap (they don't since disjoint), then insert at the correct position. The insert itself requires shifting elements, which is O(n).

So total insertion cost: sum over i from 1 to 60000 of O(i) = O(n²/2) = 1.8 billion operations. In terms of memory movement: 60000 * 30000 * 8 bytes = 14.4 GB of memmove. This should take about 1-2 seconds in optimized C (which list.insert uses under the hood).

Then 200,000 contains() calls: each is O(log 60000) ≈ 16 comparisons. Total: 3.2 million operations. Trivial, well under 1 second.

I think the total should be well under 5 seconds. Let me go with the list approach.

Actually, let me also think about whether I should use a different structure. In Python's standard library, there's no balanced BST. But I could use a sorted list with `bisect` which should work fine for these sizes.

Let me also think about edge cases:
- Adding [1,3) then [3,5): should merge to [(1,5)]. My add logic: lo=3, hi=5. `bisect_right` for lo=3 gives idx=1 (since intervals[0] = (1,3) has a=1 <= 3). Check `intervals[0][1] = 3 >= lo = 3`. Yes! So idx becomes 0. While loop: intervals[0][0] = 1 <= hi = 5. merge_lo = min(3, 1) = 1, merge_hi = max(5, 3) = 5. end_idx = 1. No more intervals. Replace intervals[0:1] with [(1,5)]. Correct!

- Remove from middle: [0,10) remove [3,7) → [(0,3), (7,10)]. Let's check: start_idx = bisect_right(intervals, 3, key=t[1]). intervals = [(0,10)]. bisect_right for 3 based on t[1]=10: since 3 < 10, it returns 0. So start_idx = 0. end_idx = bisect_left(intervals, 7, key=t[0]). t[0]=0, 0 < 7 so returns 1. So we process index 0: a=0, b=10. a < lo=3, so add (0,3). b=10 > hi=7, so add (7,10). Replace intervals[0:1] with [(0,3),(7,10)]. Correct!

- Remove [3,5) from [(0,3),(5,10)]: start_idx = bisect_right for 3 on b values: b values are 3, 10. bisect_right([...], 3, key=t[1]) gives the rightmost position where 3 could go based on b. For interval (0,3), b=3. bisect_right returns 1 (after the first one, since 3 == 3 and it's "right"). Wait, bisect_right returns the insertion point AFTER equal elements. So for key=3, the first interval has b=3 which equals 3, so bisect_right returns index after it = 1. But we want b > lo, so b > 3. The first interval has b=3 which is NOT > 3. So start_idx = 1 is correct. end_idx = bisect_left for 5 on a values: a values are 0, 5. bisect_left returns first index with a >= 5, which is index 1. So we process range(1, 1) which is empty. No change. Correct! Because [3,5) doesn't overlap with [0,3) (they just touch) and doesn't overlap with [5,10) (they just touch).

Wait, but should remove [3,5) from a set that contains [0,3) and [5,10)? Since [3,5) doesn't overlap with either (they're half-open, so 3 is not in [0,3) and 5 is not in [5,10)), nothing should change. And my code correctly does nothing. 

Let me also handle the edge case in `add` where the new interval is entirely contained within an existing interval:
- intervals = [(0,10)], add(3,5): lo=3, hi=5. bisect_right for 3 on a values (0): 3 > 0, so idx = 1. Check intervals[0][1] = 10 >= 3. Yes, so idx = 0. While loop: intervals[0][0] = 0 <= 5. merge_lo = min(3, 0) = 0, merge_hi = max(5, 10) = 10. end_idx = 1. Replace intervals[0:1] with [(0,10)]. Correct!

Now let me think about the `key` parameter in bisect. It was added in Python 3.10, and we're told to use 3.11+. So it's available.

Let me also consider: do I need to worry about float comparison issues? The problem says "Keep the original values (no rounding)." So I just need to be careful not to introduce floating point errors in my logic. The comparisons themselves (>=, <, etc.) are fine.

Let me write the complete solution:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted by lo, disjoint, no touching
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[0])
        if idx > 0 and self._intervals[idx - 1][1] >= lo:
            idx -= 1
        merge_lo = lo
        merge_hi = hi
        end_idx = idx
        while end_idx < len(self._intervals) and self._intervals[end_idx][0] <= hi:
            merge_lo = min(merge_lo, self._intervals[end_idx][0])
            merge_hi = max(merge_hi, self._intervals[end_idx][1])
            end_idx += 1
        if end_idx > idx:
            self._intervals[idx:end_idx] = [(merge_lo, merge_hi)]
        else:
            self._intervals.insert(idx, (merge_lo, merge_hi))
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        start_idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[1])
        end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])
        if start_idx >= end_idx:
            return
        new_parts = []
        for i in range(start_idx, end_idx):
            a, b = self._intervals[i]
            if a < lo:
                new_parts.append((a, lo))
            if b > hi:
                new_parts.append((hi, b))
        self._intervals[start_idx:end_idx] = new_parts
    
    def contains(self, x):
        idx = bisect.bisect_right(self._intervals, x, key=lambda t: t[0])
        if idx == 0:
            return False
        return x < self._intervals[idx - 1][1]
    
    def total_length(self):
        return sum(hi - lo for lo, hi in self._intervals)
    
    def intervals(self):
        return list(self._intervals)
    
    def __len__(self):
        return len(self._intervals)
```

Wait, I should double check the `add` merge condition. I said the merge condition is `b >= lo AND a <= hi`. But actually, let me re-examine the while loop condition: `self._intervals[end_idx][0] <= hi`. This checks `a <= hi`. But should it be `a < hi`?

If a == hi, then interval (a, b) = (hi, b) starts exactly where our new interval ends. They're touching, so they should be merged. So `a <= hi` is correct for the merge condition.

But wait, in the while loop, once we've merged with one interval, `merge_hi` might be larger than `hi`. Should I use `merge_hi` instead of `hi` in the while loop condition?

Yes! Consider: existing intervals [(0, 5), (6, 10)], add(3, 7).
- idx = bisect_right for 3 on a values (0, 6): 3 > 0 but 3 < 6, so idx = 1.
- Check intervals[0][1] = 5 >= 3. Yes, so idx = 0.
- While loop: intervals[0][0] = 0 <= hi = 7. merge_lo = min(3, 0) = 0, merge_hi = max(7, 5) = 7. end_idx = 1.
- intervals[1][0] = 6 <= merge_hi = 7. Yes! merge_lo = min(0, 6) = 0, merge_hi = max(7, 10) = 10. end_idx = 2.
- end_idx = 2 = len. Stop.
- Replace intervals[0:2] with [(0, 10)]. Correct!

But wait, I used `self._intervals[end_idx][0] <= hi` not `<= merge_hi`. In this case, `6 <= 7` (the original `hi`), so it works. But what if merge_hi grows beyond hi?

Consider: existing intervals [(0, 5), (8, 12), (6, 7)], wait no they must be sorted. Let me re-do: [(0, 5), (6, 7), (8, 12)], add(3, 7).
- idx = bisect_right for 3 on a values (0, 6, 8): 3 > 0, 3 < 6, so idx = 1.
- Check intervals[0][1] = 5 >= 3. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 7. merge_lo = 0, merge_hi = max(7, 5) = 7. end_idx = 1.
- intervals[1][0] = 6 <= 7. Yes! merge_lo = 0, merge_hi = max(7, 7) = 7. end_idx = 2.
- intervals[2][0] = 8 <= 7? No. Stop.
- Replace intervals[0:2] with [(0, 7)]. Result: [(0, 7), (8, 12)]. Correct! (7 < 8, so they don't touch).

Another case: [(0, 5), (4, 10)], wait they can't overlap. OK: [(0, 5), (7, 12)], add(3, 6).
- idx = bisect_right for 3 on a values (0, 7): idx = 1.
- Check intervals[0][1] = 5 >= 3. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 6. merge_lo = 0, merge_hi = max(6, 5) = 6. end_idx = 1.
- intervals[1][0] = 7 <= 6? No. Stop.
- Replace intervals[0:1] with [(0, 6)]. Result: [(0, 6), (7, 12)]. Correct!

What about: [(0, 5), (6, 12)], add(3, 5).
- lo=3, hi=5. idx = bisect_right for 3 on a (0, 6): idx = 1.
- Check intervals[0][1] = 5 >= 3. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 5. merge_lo = 0, merge_hi = max(5, 5) = 5. end_idx = 1.
- intervals[1][0] = 6 <= 5? No. Stop.
- Replace intervals[0:1] with [(0, 5)]. Result: [(0, 5), (6, 12)]. Correct!

What about: [(0, 5), (5, 12)] (these should already be merged to [(0, 12)] since they touch). So this state shouldn't exist. Good, the invariant ensures no touching intervals.

Hmm, but what about the while loop condition. Let me think of a case where `merge_hi` exceeds the original `hi` and enables further merging:

[(0, 3), (5, 8)], add(1, 6):
- idx = bisect_right for 1 on a (0, 5): 1 > 0, 1 < 5, so idx = 1.
- Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While loop with condition `<= hi = 6`:
  - intervals[0][0] = 0 <= 6. merge_lo = 0, merge_hi = max(6, 3) = 6. end_idx = 1.
  - intervals[1][0] = 5 <= 6. Yes! merge_lo = 0, merge_hi = max(6, 8) = 8. end_idx = 2.
  - end_idx = 2 = len. Stop.
- Replace with [(0, 8)]. Correct!

But what if: [(0, 3), (7, 10)], add(1, 6):
- idx = 1. Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 6. merge_lo = 0, merge_hi = max(6, 3) = 6. end_idx = 1.
- intervals[1][0] = 7 <= 6? No. Stop.
- Replace with [(0, 6), (7, 10)]. Correct! (6 < 7, no touching).

Now what about this case where merge_hi growing would matter: [(0, 3), (7, 10), (4, 6)]. Wait, sorted by a: [(0, 3), (4, 6), (7, 10)].
add(2, 5):
- idx = bisect_right for 2 on a (0, 4, 7): 2 > 0, 2 < 4, so idx = 1.
- Check intervals[0][1] = 3 >= 2. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 5. merge_lo = 0, merge_hi = max(5, 3) = 5. end_idx = 1.
- intervals[1][0] = 4 <= 5. Yes! merge_lo = 0, merge_hi = max(5, 6) = 6. end_idx = 2.
- intervals[2][0] = 7 <= 5? No. Stop.
- Result: [(0, 6), (7, 10)]. Correct!

Hmm but what if after merging, merge_hi becomes large enough to merge with more intervals?

[(0, 3), (4, 6), (7, 10), (11, 15)], add(2, 12):
- idx for 2 on a (0, 4, 7, 11): idx = 1.
- Check intervals[0][1] = 3 >= 2. Yes, idx = 0.
- While loop with `<= hi = 12`:
  - intervals[0][0] = 0 <= 12. merge_hi = max(12, 3) = 12. end_idx = 1.
  - intervals[1][0] = 4 <= 12. merge_hi = max(12, 6) = 12. end_idx = 2.
  - intervals[2][0] = 7 <= 12. merge_hi = max(12, 10) = 12. end_idx = 3.
  - intervals[3][0] = 11 <= 12. merge_hi = max(12, 15) = 15. end_idx = 4.
  - end = len. Stop.
- Result: [(0, 15)]. Correct!

OK so using the original `hi` in the while condition works because all intervals with `a <= hi` will be caught. And if `merge_hi` grows beyond `hi`, those intervals with `a <= merge_hi` but `a > hi` would NOT be caught. But is that a problem?

Consider: [(0, 3), (5, 8)], add(1, 4). hi = 4.
- idx = 1 (since 1 > 0, 1 < 5). Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 4. merge_lo = 0, merge_hi = max(4, 3) = 4. end_idx = 1.
- intervals[1][0] = 5 <= 4? No. Stop.
- Result: [(0, 4), (5, 8)]. Correct! (4 < 5, no touching).

What about: [(0, 3), (5, 8)], add(1, 5). hi = 5.
- idx = 1. Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While loop: intervals[0][0] = 0 <= 5. merge_hi = max(5, 3) = 5. end_idx = 1.
- intervals[1][0] = 5 <= 5. Yes! merge_lo = 0, merge_hi = max(5, 8) = 8. end_idx = 2.
- Result: [(0, 8)]. Correct! (touching intervals merged).

Good, using the original `hi` works correctly because if an interval touches the new interval, its `a` must equal `hi` (since intervals are sorted and the new interval ends at `hi`), so `a <= hi` catches it.

Wait, actually no. After merging with the first interval, the effective right boundary is `merge_hi`, not `hi`. Consider:

[(0, 10)], add(3, 5). After processing intervals[0], merge_hi = 10. But we don't need to check further since there are no more intervals. OK.

What about [(0, 3), (4, 7)], add(1, 4)?
- hi = 4. idx = 1. Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While: intervals[0][0] = 0 <= 4. merge_hi = max(4, 3) = 4. end_idx = 1.
- intervals[1][0] = 4 <= 4. Yes! merge_lo = 0, merge_hi = max(4, 7) = 7. end_idx = 2.
- Result: [(0, 7)]. Correct!

Hmm, but what about [(0, 3), (4, 7), (8, 12)], add(1, 4)?
- hi = 4. Same as above but now:
- After merging with intervals[1], merge_hi = 7. end_idx = 2.
- intervals[2][0] = 8 <= 4? No. Stop.
- Result: [(0, 7), (8, 12)]. Correct! (7 < 8, no touching).

OK so using original `hi` is fine because touching means `a == hi` (the start of the next interval equals the end of our original new interval). And that's caught by `a <= hi`.

But wait, what if after merging, the effective end extends and creates touching with another interval?

[(0, 3), (5, 7), (8, 10)], add(1, 6):
- hi = 6. idx = 1. Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While: intervals[0][0] = 0 <= 6. merge_hi = max(6, 3) = 6. end_idx = 1.
- intervals[1][0] = 5 <= 6. Yes! merge_lo = 0, merge_hi = max(6, 7) = 7. end_idx = 2.
- intervals[2][0] = 8 <= 6? No. Stop.
- Result: [(0, 7), (8, 10)]. Correct! (7 < 8, no touching).

What if there's a chain: [(0, 3), (5, 7), (7, 10)]... wait these can't exist because (5,7) and (7,10) touch and would have been merged.

What about [(0, 3), (5, 7), (8, 10)], add(1, 8)?
- hi = 8. idx = 1. Check intervals[0][1] = 3 >= 1. Yes, idx = 0.
- While: intervals[0][0] = 0 <= 8. merge_hi = max(8, 3) = 8. end_idx = 1.
- intervals[1][0] = 5 <= 8. Yes! merge_hi = max(8, 7) = 8. end_idx = 2.
- intervals[2][0] = 8 <= 8. Yes! merge_hi = max(8, 10) = 10. end_idx = 3.
- Result: [(0, 10)]. Correct!

OK so using the original `hi` works. The key insight is: if an existing interval's start `a` is > `hi`, then the new interval [lo, hi) doesn't touch or overlap with it (since the new interval ends at hi and the existing starts at a > hi). Even if merging with other intervals extends `merge_hi`, that extension would only cover up to the `b` value of intervals we've already merged with, and those intervals end at `b > a >= next interval's a`. Wait no, that's not right either.

Actually, let me think more carefully. After we merge with interval (a_i, b_i), `merge_hi` might become b_i. Now, is there an interval at index i+1 with a_{i+1} <= merge_hi = b_i? Since intervals are disjoint and sorted, a_{i+1} > b_i (strictly greater, because if a_{i+1} == b_i they'd be touching and would have been merged in the invariant). So a_{i+1} > b_i = merge_hi. Therefore no further intervals can be merged that weren't already caught by `a <= hi`.

Wait, but we might have `merge_hi = max(hi, b_i)`. If b_i > hi, then merge_hi = b_i. And a_{i+1} > b_i > hi, so `a_{i+1} <= hi` is false. So we correctly don't merge with it.

If b_i < hi, merge_hi remains hi (or whatever it was before). And we continue checking with `a <= hi`. This is correct because if a_{i+1} <= hi, it overlaps/touches the new interval [lo, hi).

So using the original `hi` is correct! Great.

Now let me also think about `bisect_right` with key on the `remove` method.

`start_idx = bisect.bisect_right(self._intervals, lo, key=lambda t: t[1])`:
This finds the rightmost position where `lo` could be inserted based on `t[1]` (b values). Since b values are strictly increasing (as I argued), this gives the first index where `b > lo`. All intervals before this have `b <= lo` and thus don't overlap with [lo, hi).

`end_idx = bisect.bisect_left(self._intervals, hi, key=lambda t: t[0])`:
This finds the leftmost position where `hi` could be inserted based on `t[0]` (a values). This gives the first index where `a >= hi`. All intervals at or after this index have `a >= hi` and thus don't overlap with [lo, hi).

So intervals from `start_idx` to `end_idx - 1` are exactly those that overlap with [lo, hi). Correct.

One more thing: I should make sure the invariant holds - no two intervals in the list should be touching or overlapping. The `add` method ensures this by merging. The `remove` method maintains it because it only removes from existing intervals (which were already non-overlapping and non-touching), and the resulting pieces maintain the same gaps.

Actually wait, could `remove` create touching intervals? If we remove from the middle, we split into two, but those two have a gap between them (the removed part). If we remove from the left edge of one and right edge of another... let me think.

Intervals: [(0, 3), (5, 8)]. Remove [2, 6):
- start_idx = bisect_right for 2 on b values (3, 8): 2 < 3, so idx = 0.
- end_idx = bisect_left for 6 on a values (0, 5): 0 < 6, 5 < 6, so idx = 2.
- Process intervals[0] = (0, 3): a=0 < 2, add (0, 2). b=3 > 6? No.
- Process intervals[1] = (5, 8): a=5 < 2? No. b=8 > 6? Yes, add (6, 8).
- Replace intervals[0:2] with [(0, 2), (6, 8)]. Correct!

Could removing create touching intervals? Only if the remaining pieces touch. But if we remove [lo, hi) from [a, b), the remaining pieces are [a, lo) and [hi, b). These have a gap of [lo, hi) between them. And they can't touch other intervals because the original intervals were non-touching. So the invariant is maintained.

I think the solution is correct. Let me also make sure about the `key` parameter availability. In Python 3.10+, `bisect.bisect_right` and `bisect.bisect_left` accept a `key` parameter. Since the requirement says 3.11+, this is fine.

Let me finalize the code. I'll also add `__repr__` for debugging convenience... actually no, the problem says no example usage or printing. Let me just keep it clean.

One more performance consideration: using `lambda` in `key` for bisect adds overhead. For 200,000 contains calls, that's 200,000 lambda calls. Let me think if there's a way to avoid this.

Actually, I could store a parallel list of just the `lo` values and use `bisect` on that directly without a key function. This would be faster for `contains()` since no lambda is involved.

Let me redesign with two parallel lists:
- `self._los`: sorted list of `lo` values (for binary search)
- `self._his`: sorted list of `hi` values (for binary search in remove)

Actually this complicates insertions and deletions. Let me just keep the tuples and use the key function. The performance should be fine for 60k + 200k operations.

Actually, let me benchmark mentally: 200,000 contains calls, each doing a bisect_right with a key function. The key function is called O(log n) times per bisect (about 16 times for n=60000). So 200,000 * 16 = 3.2 million lambda calls. Each lambda call is maybe 100ns in CPython. Total: 0.32 seconds. Fine.

For 60,000 add calls: each involves a bisect (O(log n) key calls), then potentially a loop (which for disjoint intervals is short), then a list insert (O(n) memmove). The memmove is the bottleneck: 60,000 * 30,000 * 8 bytes = 14.4 GB of memory movement. At memory bandwidth of ~20 GB/s (for sequential access), that's ~0.7 seconds. Plus Python overhead for the loops. Should be around 1-2 seconds total.

I think this is fine. Let me write the final solution.

Actually, I want to double-check one thing about `bisect_right` with `key`. The documentation says:

> If specified, key will be a key function of one argument that is used to extract a comparison key from each list element.

And:
> bisect_right(a, x, lo=0, hi=len(a), *, key=None)
> Return the insertion point for x in a to maintain sorted order. If key is specified, key(a[i]) is compared to x.

So `bisect_right(self._intervals, lo, key=lambda t: t[0])` finds the insertion point for `lo` in the sequence `[t[0] for t in self._intervals]`, returning the index after all elements equal to `lo`. Since all elements in our list have unique `a` values (they're disjoint and sorted), `bisect_right` and `bisect_left` for `a` values would give the same result (since there are no duplicates). So `bisect_right` for `lo` on `a` values gives the first index where `a > lo`. Good.

Similarly, `bisect_right(self._intervals, lo, key=lambda t: t[1])` gives the first index where `b > lo` (since all b values are unique due to disjointness). Good.

And `bisect_left(self._intervals, hi, key=lambda t: t[0])` gives the first index where `a >= hi`. Good.

Alright, I'm confident the solution is correct and efficient. Let me write it up cleanly.
