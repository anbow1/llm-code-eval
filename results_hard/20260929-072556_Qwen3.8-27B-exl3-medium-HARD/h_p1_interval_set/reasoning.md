Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) with efficient operations.

Key requirements:
1. `add(lo, hi)` - add interval, merge with overlapping/adjacent ones
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, disjoint, merged list
6. `__len__()` - number of intervals
7. Touching intervals should be merged: [1,3) + [3,5) = [1,5)

Performance: 60,000 add() calls of small disjoint intervals in random order, then 200,000 contains() calls must take well under 5 seconds.

For 60,000 adds of small disjoint intervals in random order - if they're truly disjoint, each add is O(log n) to find the position, then we insert. But if they're not all disjoint, we need to merge.

The key challenge is maintaining sorted, disjoint, merged intervals efficiently.

Options:
1. Sorted list with bisect - O(n) for insert/delete due to list shifting
2. Balanced BST (like a treap or AVL tree) - O(log n) for all operations
3. Using a sorted structure from a library - but we can only use stdlib

Since we need O(log n) for contains() and the performance requirement is 60k adds + 200k contains in under 5 seconds, let me think about what data structure to use.

With a sorted list:
- `contains(x)`: O(log n) with bisect - find which interval x might be in
- `add(lo, hi)`: O(log n) to find position, but O(n) to insert/merge in the list
- `remove(lo, hi)`: O(log n) to find position, but O(n) to modify the list

For 60,000 adds, if each is O(n) worst case, that's 60,000 * 60,000 = 3.6 billion operations in the worst case. That's too slow.

But wait - "small disjoint intervals in random order". If they're truly disjoint, each add just inserts one interval. With a sorted list, insertion is O(n) due to memmove, but in CPython, list.insert is implemented in C and is quite fast for the memmove part. 60,000 inserts into a list of up to 60,000 elements... each insert is O(n) in the worst case but the constant is very small (just pointer moves in C). 60,000 * 60,000 / 2 ≈ 1.8 billion pointer moves. At ~1 ns per pointer move in C, that's about 1.8 seconds. Hmm, might be tight.

Actually, let me reconsider. `list.insert` in CPython does a `memmove` which is very fast. For 60,000 elements, the memmove is about 480KB (8 bytes per pointer). At memory bandwidth of ~10 GB/s, that's about 48 ns per insert. 60,000 * 48 ns ≈ 2.9 ms. That's very fast!

Wait, but we also need to handle merging. If intervals are "small and disjoint", then each add just inserts one new interval without merging. So the operation is:
1. Find position with bisect: O(log n)
2. Check neighbors for merging: O(1)
3. Insert: O(n) due to memmove, but very fast in C

For 200,000 contains() calls: each is O(log n) with bisect, so 200,000 * log2(60,000) ≈ 200,000 * 16 = 3.2 million comparisons. Very fast.

So a sorted list approach should work fine for the performance requirements. Let me go with that.

Data structure:
- `self._intervals`: a list of (lo, hi) tuples, sorted by lo, disjoint, and merged (no touching intervals)

For `contains(x)`:
- Use bisect to find the right position
- Check if x is in the interval at that position or the one before

Actually, let me think more carefully. I'll store intervals as a list of [lo, hi] pairs. To use bisect effectively, I need to search by lo values.

Let me store:
- `self._los`: list of lo values (for bisect)
- `self._his`: list of hi values

Or I could just use a list of tuples and use bisect with a key... but bisect doesn't support key in Python 3.10 and earlier. In Python 3.10+, bisect has a `key` parameter.

Actually, Python 3.11 has `bisect` with `key` parameter. Let me use that.

Wait, let me check: `bisect.bisect_left(a, x, lo=0, hi=len(a), *, key=None)` - yes, Python 3.10+ has the key parameter.

Actually, for simplicity and to avoid issues, let me just maintain two parallel lists: `_los` and `_his`. Or I can use a list of tuples and bisect on the first element.

Let me use a list of tuples `self._intervals` where each element is `(lo, hi)`.

For `contains(x)`:
- Use `bisect_right(self._intervals, (x, float('inf')))` to find the insertion point
- Actually, I want to find if x is in any interval [lo, hi)
- x is in [lo, hi) if lo <= x < hi
- So I need to find the interval where lo <= x and x < hi
- Using bisect: find the rightmost interval with lo <= x, then check if x < hi

Let me think about this differently. I'll use `bisect_right` on the lo values to find the last interval with lo <= x, then check if x < that interval's hi.

```python
import bisect

def contains(self, x):
    # Find the rightmost interval with lo <= x
    # bisect_right on los gives the index after the last lo <= x
    i = bisect.bisect_right(self._los, x) - 1
    if i >= 0 and x < self._his[i]:
        return True
    return False
```

Wait, but what if x equals lo of some interval? `bisect_right(self._los, x)` gives the index after the last element <= x. So `i = that - 1` gives the last interval with lo <= x. Then we check if x < hi[i]. This correctly handles the case where x == lo (since lo <= x and x < hi when x == lo < hi).

For `add(lo, hi)`:
1. If lo >= hi, return
2. Find where to insert: we need to find all intervals that overlap with [lo, hi) or are adjacent
3. Merge them all into one interval
4. Insert the merged interval

An interval [a, b) overlaps or is adjacent to [lo, hi) if:
- a <= hi and b >= lo (overlap)
- a == hi (adjacent: [lo, hi) + [hi, c) = [lo, c))
- b == lo (adjacent: [a, lo) + [lo, hi) = [a, hi))

So the condition is: a <= hi and b >= lo (which covers both overlap and adjacency since [a,b) and [lo,hi) are "compatible" if a <= hi and b >= lo... wait no.

Actually for merging: [a, b) and [lo, hi) should be merged if they overlap OR are adjacent.
- Overlap: a < hi and b > lo (strict overlap for half-open intervals... actually [a,b) and [lo,hi) overlap if a < hi and b > lo)
- Adjacent: b == lo or a == hi

Combined: a <= hi and b >= lo covers both overlap and adjacency.
- If a <= hi and b >= lo, then the intervals overlap or touch.

Wait: [1, 3) and [3, 5): a=1, b=3, lo=3, hi=5. a <= hi (1 <= 5) and b >= lo (3 >= 3). Yes, they should be merged.
[1, 3) and [4, 5): a=1, b=3, lo=4, hi=5. a <= hi (1 <= 5) and b >= lo (3 >= 4)? No, 3 < 4. Correct, don't merge.
[1, 3) and [2, 5): a=1, b=3, lo=2, hi=5. a <= hi (1 <= 5) and b >= lo (3 >= 2). Yes, merge to [1, 5).

So the condition for "needs merging" is: `a <= hi and b >= lo`.

For `add(lo, hi)`:
1. Find the first interval that could overlap: the first interval with hi > lo (i.e., not completely before [lo, hi))
   - Actually, I need to find intervals where `b > lo` (the interval extends past lo) AND `a < hi` (the interval starts before hi)
   - Wait, the condition is `a <= hi and b >= lo`... hmm, let me re-derive.
   
   Two intervals [a, b) and [lo, hi) should be merged if their union is a single interval, which happens when they overlap or touch:
   - They overlap: max(a, lo) < min(b, hi), i.e., a < hi and b > lo
   - They touch: b == lo or a == hi
   
   Combined: a <= hi and b >= lo (since if a < hi and b > lo, then a <= hi and b >= lo; if b == lo, then b >= lo; if a == hi, then a <= hi)
   
   Wait, I need to be more careful. The condition for two half-open intervals [a,b) and [c,d) to be mergeable (overlap or touch) is:
   a <= d and c <= b
   
   Let me verify:
   - [1,3) and [3,5): a=1, d=5, c=3, b=3. 1<=5 and 3<=3. Yes.
   - [1,3) and [4,5): a=1, d=5, c=4, b=3. 1<=5 and 4<=3? No. Correct.
   - [1,3) and [2,5): a=1, d=5, c=2, b=3. 1<=5 and 2<=3. Yes.
   - [3,5) and [1,3): a=3, d=3, c=1, b=5. 3<=3 and 1<=5. Yes.

   Great, so the condition is `a <= hi and lo <= b`.

2. To find all intervals that need merging:
   - The first interval that could be affected: the first interval with `b > lo` (its hi is after lo). In a sorted list by lo, this is the first interval where `hi > lo`. But since intervals are sorted by lo and disjoint, the first interval with `hi > lo` is the one at index `bisect_right(los, lo) - 1` or `bisect_left(los, lo)`.
   
   Actually, let me think differently. Since intervals are sorted by lo and disjoint:
   - Find the first interval with `hi > lo`: this is the first interval that extends past lo. Since intervals are sorted by lo, and they're disjoint, I can find this by looking at the interval at position `bisect_right(los, lo) - 1` (the last interval with lo <= x) and check if its hi > lo. Or the interval at `bisect_left(los, lo)` might start at or after lo.
   
   Hmm, let me think about this more carefully.
   
   Since intervals are sorted by lo and disjoint (and merged), for a given lo:
   - There's at most one interval that contains lo (or has hi == lo, meaning it ends at lo)
   - The interval at index `bisect_right(los, lo) - 1` has lo_val <= lo, and since intervals are disjoint, its hi <= lo (if it doesn't contain lo) or its hi > lo (if it contains lo).
   
   Wait, I think the cleanest approach is:
   
   - Find `start_idx`: the first interval index i such that `his[i] > lo` (the interval extends past lo). This is the first interval that overlaps or is adjacent to [lo, hi) from the left.
     - Since intervals are sorted by lo and disjoint, `his[i] > lo` means the interval [los[i], his[i]) has his[i] > lo, so it starts before or at lo and extends past lo, OR it starts after lo but... no, if it starts after lo, then los[i] > lo, and since it's disjoint from previous, his[i-1] <= los[i]. 
     
     Actually, let me just use: the first interval with `los[i] >= lo` OR `his[i] > lo`. Since intervals are sorted by lo, the first interval with `los[i] >= lo` is at `bisect_left(los, lo)`. But I also need to check the interval just before (at `bisect_left(los, lo) - 1`) because it might have `his[i] > lo` (i.e., it contains lo).
     
     So: `start_idx = bisect_left(self._los, lo)`. Then check if `start_idx > 0 and self._his[start_idx - 1] > lo`, in which case `start_idx -= 1`.
     
     Wait, actually if `self._his[start_idx - 1] > lo`, that means the interval at start_idx-1 contains lo (since its lo <= lo because of sorting, and its hi > lo). So it overlaps with [lo, hi). We should include it.
     
     But also, what if `self._his[start_idx - 1] == lo`? Then the interval at start_idx-1 is [a, lo) and [lo, hi) are adjacent, so they should be merged. So the condition should be `self._his[start_idx - 1] >= lo`.
     
     Hmm wait, if `self._his[start_idx - 1] == lo`, the interval is [a, lo) and we're adding [lo, hi). They touch, so merge to [a, hi). Yes, include it.
     
     So: `start_idx = bisect_left(self._los, lo)`. If `start_idx > 0 and self._his[start_idx - 1] >= lo`, then `start_idx -= 1`.
     
     Wait, `>= lo`? If his[start_idx-1] == lo, the interval ends at lo, and we're adding [lo, hi). They're adjacent. Merge. If his[start_idx-1] > lo, the interval contains lo. Overlap. Merge. If his[start_idx-1] < lo, no overlap, no adjacency. Don't merge.
     
     So condition: `self._his[start_idx - 1] >= lo`. But wait, can his[start_idx-1] > lo? Yes, if the interval contains lo. Can his[start_idx-1] == lo? Yes, if the interval ends exactly at lo.
     
     Actually, I realize I should use `> lo` for overlap and `== lo` for adjacency. Combined: `>= lo`. But wait, if his[start_idx-1] < lo, then the interval is completely before [lo, hi), so no merge needed. Correct.

   - Find `end_idx`: the last interval index i such that `los[i] <= hi` (the interval starts at or before hi). Since intervals are sorted by lo, this is `bisect_right(los, hi) - 1`.
     - But we also need to check: does the interval at end_idx actually overlap/touch [lo, hi)? Its lo <= hi, but we need its hi > lo (which is guaranteed since lo <= hi and the interval is after start_idx which we already confirmed overlaps). Actually, since all intervals from start_idx to end_idx have lo >= los[start_idx] >= ... and lo <= hi, and they're all disjoint and sorted, they all overlap or are adjacent to [lo, hi).
     
     Wait, I need to be more careful. An interval [a, b) with a <= hi overlaps/touches [lo, hi) if a <= hi and b >= lo. Since a <= hi (by our search) and b > a >= los[start_idx]... hmm, I need b >= lo.
     
     Actually, since all intervals from start_idx onwards have lo >= lo (because start_idx is the first with lo >= lo, or the one before that contains/touches lo), and they're disjoint, each subsequent interval has lo >= previous hi. So for interval at index i >= start_idx: lo_i >= his[i-1] >= ... >= his[start_idx] >= lo (since we established his[start_idx] >= lo). Wait, that's not quite right either.
     
     Let me think again. After determining start_idx (the first interval that overlaps/touches [lo, hi)), all intervals from start_idx to end_idx (where end_idx is the last with lo <= hi) will all be mergeable with [lo, hi) because:
     - They're all in a contiguous block (disjoint, sorted)
     - The first one (start_idx) overlaps/touches [lo, hi)
     - Each subsequent one starts where the previous ended (or later), and since they're all before hi (lo <= hi), they all overlap/touch the growing merged interval.
     
     Actually, I think the key insight is: since intervals are disjoint and sorted, if interval i overlaps/touches [lo, hi) and interval i+1 has lo_{i+1} <= hi, then interval i+1 also overlaps/touches [lo, hi) (because hi_i <= lo_{i+1} <= hi, and lo_{i+1} >= lo since it's after start_idx).
     
     Wait, lo_{i+1} >= lo? Not necessarily. lo_{i+1} >= hi_i >= lo (since hi_i >= lo for the first interval). Yes! So lo_{i+1} >= lo and lo_{i+1} <= hi, so the interval [lo_{i+1}, hi_{i+1}) has lo_{i+1} in [lo, hi], meaning it overlaps [lo, hi). 
     
     So the algorithm for add is:
     1. Find start_idx as above
     2. Find end_idx = bisect_right(self._los, hi) - 1
     3. new_lo = min(lo, self._los[start_idx]) if start_idx <= end_idx else lo
     4. new_hi = max(hi, self._his[end_idx]) if start_idx <= end_idx else hi
     5. Replace self._intervals[start_idx:end_idx+1] with [(new_lo, new_hi)]
     
     Wait, I need to be careful with the case where start_idx > end_idx (no existing intervals to merge with). Then we just insert [lo, hi) at position start_idx.

Let me also handle the edge case where start_idx points to an interval with his[start_idx] >= lo but los[start_idx] > lo. Can that happen? If los[start_idx] > lo, then the interval starts after lo. For it to be mergeable, we need his[start_idx] >= lo (which is true since his > los > lo) and los[start_idx] <= hi. Since we're checking bisect_left(los, lo), los[start_idx] >= lo. So if los[start_idx] > lo, the interval starts after lo. It's mergeable if los[start_idx] <= hi (which it is since start_idx <= end_idx means los[start_idx] <= hi). So yes, it should be merged.

Actually wait, I realize there might be an issue. Let me re-examine:

start_idx = bisect_left(self._los, lo) gives the first index where los[i] >= lo.
Then I check if start_idx > 0 and his[start_idx-1] >= lo. If so, start_idx -= 1.

But what if his[start_idx-1] < lo? Then the interval at start_idx-1 is [a, b) with b < lo, so it's completely before [lo, hi). No merge needed. Correct.

What if his[start_idx-1] == lo? Then [a, lo) and [lo, hi) are adjacent. Merge. start_idx -= 1. Correct.

What if his[start_idx-1] > lo? Then [a, b) with b > lo contains lo (since a <= lo because it's before start_idx in sorted order). Overlap. Merge. start_idx -= 1. Correct.

Now for end_idx: bisect_right(self._los, hi) - 1 gives the last index where los[i] <= hi.

If los[end_idx] <= hi, the interval [los[end_idx], his[end_idx]) starts at or before hi. Since it's after start_idx (or at start_idx), and intervals are disjoint, los[end_idx] >= his[end_idx-1] >= ... >= his[start_idx] >= lo. So los[end_idx] >= lo and los[end_idx] <= hi, meaning the interval overlaps [lo, hi). Correct.

What about the interval at bisect_right(self._los, hi)? Its lo > hi, so it starts after hi. It can't overlap [lo, hi) (since lo < hi < lo_next). And it can't be adjacent (since lo_next > hi, not == hi). So we don't include it. Correct.

OK so the algorithm is solid. Let me code it up.

For `remove(lo, hi)`:
1. If lo >= hi, return
2. Find all intervals that overlap with [lo, hi) (strict overlap, not just touching)
   - An interval [a, b) overlaps [lo, hi) if a < hi and b > lo
3. For each overlapping interval, subtract [lo, hi) from it:
   - If a < lo and b > hi: split into [a, lo) and [hi, b)
   - If a < lo and b <= hi: keep [a, lo) (if a < lo)
   - If a >= lo and b > hi: keep [hi, b) (if hi < b)
   - If a >= lo and b <= hi: remove entirely
4. Replace the overlapping intervals with the resulting pieces

Finding the range of overlapping intervals:
- First interval with b > lo: this is the first interval that extends past lo.
  - Similar to add: start_idx = bisect_left(los, lo), check if start_idx > 0 and his[start_idx-1] > lo.
  - Wait, for remove, we need strict overlap: b > lo (not >=). Because [a, lo) doesn't overlap [lo, hi).
  - So: start_idx = bisect_left(los, lo). If start_idx > 0 and his[start_idx-1] > lo, start_idx -= 1.
  
- Last interval with a < hi: this is the last interval that starts before hi.
  - end_idx = bisect_left(los, hi) - 1. (The last index where los[i] < hi.)
  - Wait, bisect_left(los, hi) gives the first index where los[i] >= hi. So bisect_left(los, hi) - 1 is the last index where los[i] < hi.

Let me verify:
- [1, 5) and remove [2, 4): start_idx: bisect_left([1], 2) = 1. Check his[0] = 5 > 2, so start_idx = 0. end_idx: bisect_left([1], 4) - 1 = 0 - 1 = -1. Hmm, that's wrong.

Wait, bisect_left([1], 4) = 1 (since 1 < 4, the insertion point is after 1). So end_idx = 1 - 1 = 0. Correct.

- [1, 5) and remove [0, 3): start_idx: bisect_left([1], 0) = 0. start_idx = 0. end_idx: bisect_left([1], 3) - 1 = 1 - 1 = 0. Correct.

- [1, 3) and [5, 7), remove [2, 6): start_idx: bisect_left([1,5], 2) = 1. Check his[0] = 3 > 2, so start_idx = 0. end_idx: bisect_left([1,5], 6) - 1 = 2 - 1 = 1. So we process intervals 0 and 1.
  - [1, 3) and [2, 6): a=1 < lo=2, b=3 <= hi=6. Keep [1, 2).
  - [5, 7) and [2, 6): a=5 >= lo=2, b=7 > hi=6. Keep [6, 7).
  - Result: [1, 2) and [6, 7). Correct!

- [1, 5) and remove [5, 7): start_idx: bisect_left([1], 5) = 1. Check his[0] = 5 > 5? No. So start_idx = 1. end_idx: bisect_left([1], 7) - 1 = 1 - 1 = 0. start_idx > end_idx, so no intervals to process. Correct, [1,5) doesn't overlap [5,7).

- [1, 5) and remove [3, 5): start_idx: bisect_left([1], 3) = 1. Check his[0] = 5 > 3, so start_idx = 0. end_idx: bisect_left([1], 5) - 1 = 1 - 1 = 0. Process interval 0.
  - [1, 5) and [3, 5): a=1 < lo=3, b=5 <= hi=5. Keep [1, 3).
  - Result: [1, 3). Correct!

Great, the algorithm works.

Now let me think about the data structure. I'll use two parallel lists: `_los` and `_his`. Or I could use a single list of tuples. Let me use a single list of tuples for simplicity, and maintain separate lists for bisect operations.

Actually, for performance, let me use two separate lists `_los` and `_his`. This avoids tuple unpacking in bisect.

Wait, actually in Python, bisect on a list of tuples compares tuples lexicographically. `bisect_left([(1,5), (3,7)], (2,))` would compare (2,) with (1,5) - but (2,) < (1,5) is False (2 > 1), and (2,) < (3,7) is True (2 < 3). So it would return 1. That works for finding the first lo >= 2.

But `bisect_left([(1,5), (3,7)], (2, float('inf')))` - (2, inf) vs (1,5): 2 > 1, so (2,inf) > (1,5). (2,inf) vs (3,7): 2 < 3, so (2,inf) < (3,7). Returns 1. Same result.

Actually, using tuples directly works fine since we're only comparing the first element (lo). As long as we search with (value,) or (value, something), it'll work correctly for finding positions based on lo.

Hmm, but it's cleaner to use separate lists. Let me use `_los` and `_his`.

Let me also think about `total_length()`. I can maintain a running total, or compute it each time. For performance, maintaining a running total is better. But it adds complexity to add/remove. Let me just compute it each time since it's O(n) and the problem doesn't specify performance for total_length().

Actually, let me maintain a running total for efficiency.

Let me write the code:

```python
import bisect


class IntervalSet:
    def __init__(self):
        self._los = []
        self._his = []
        self._total = 0

    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find start_idx: first interval that overlaps or touches [lo, hi)
        start_idx = bisect.bisect_left(self._los, lo)
        if start_idx > 0 and self._his[start_idx - 1] >= lo:
            start_idx -= 1
        # Find end_idx: last interval that overlaps or touches [lo, hi)
        end_idx = bisect.bisect_right(self._los, hi) - 1
        
        new_lo = lo
        new_hi = hi
        if start_idx <= end_idx:
            new_lo = min(lo, self._los[start_idx])
            new_hi = max(hi, self._his[end_idx])
            # Remove length of existing intervals
            for i in range(start_idx, end_idx + 1):
                self._total -= self._his[i] - self._los[i]
        
        self._total += new_hi - new_lo
        
        # Replace
        self._los[start_idx:end_idx + 1] = [new_lo]
        self._his[start_idx:end_idx + 1] = [new_hi]

    def remove(self, lo, hi):
        if lo >= hi:
            return
        # Find start_idx: first interval that strictly overlaps [lo, hi)
        start_idx = bisect.bisect_left(self._los, lo)
        if start_idx > 0 and self._his[start_idx - 1] > lo:
            start_idx -= 1
        # Find end_idx: last interval that strictly overlaps [lo, hi)
        end_idx = bisect.bisect_left(self._los, hi) - 1
        
        if start_idx > end_idx:
            return
        
        new_los = []
        new_his = []
        for i in range(start_idx, end_idx + 1):
            a, b = self._los[i], self._his[i]
            if a < lo:
                new_los.append(a)
                new_his.append(lo)
            if b > hi:
                new_los.append(hi)
                new_his.append(b)
        
        removed_length = sum(self._his[i] - self._los[i] for i in range(start_idx, end_idx + 1))
        added_length = sum(new_his[i] - new_los[i] for i in range(len(new_los)))
        self._total += added_length - removed_length
        
        self._los[start_idx:end_idx + 1] = new_los
        self._his[start_idx:end_idx + 1] = new_his

    def contains(self, x):
        i = bisect.bisect_right(self._los, x) - 1
        if i >= 0 and x < self._his[i]:
            return True
        return False

    def total_length(self):
        return self._total

    def intervals(self):
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)
```

Wait, I need to double-check the `contains` logic. 

`bisect_right(self._los, x)` gives the number of elements in `_los` that are <= x. So `i = that - 1` is the index of the last element with lo <= x.

If i >= 0, we check if x < his[i]. If yes, x is in [los[i], his[i]).

But what if x is exactly equal to los[i] for some i? Then bisect_right would give i+1 (since los[i] <= x), so our index would be i. And we check x < his[i], which is los[i] < his[i], which is true. Correct.

What if x is between two intervals? E.g., intervals [1,3) and [5,7), x=4. bisect_right([1,5], 4) = 1. i = 0. Check 4 < his[0] = 3? No. Return False. Correct.

What if x = 3? bisect_right([1,5], 3) = 1. i = 0. Check 3 < 3? No. Return False. Correct (3 is not in [1,3)).

What if x = 5? bisect_right([1,5], 5) = 2. i = 1. Check 5 < 7? Yes. Return True. Correct.

Looks good!

Now let me think about performance. For 60,000 adds of small disjoint intervals in random order:
- Each add: O(log n) for bisect + O(k) for the slice assignment where k is the number of intervals being merged (usually 1 for disjoint intervals) + O(n) for the memmove in the list.
- For disjoint intervals, k=1, so the slice assignment is just inserting one element. The memmove is O(n) but very fast in C.
- 60,000 inserts into a growing list: total memmove work is O(n^2) but with a very small constant.

For 200,000 contains:
- Each is O(log n) ≈ 16 comparisons. Total: 3.2 million comparisons. Very fast.

I think this will be well under 5 seconds.

Let me also think about edge cases:
- Adding an interval that's completely contained in an existing one: [1,10) exists, add [3,5). start_idx = bisect_left([1], 3) = 1. Check his[0]=10 >= 3, so start_idx=0. end_idx = bisect_right([1], 5) - 1 = 1 - 1 = 0. new_lo = min(3, 1) = 1, new_hi = max(5, 10) = 10. Replace [1,10) with [1,10). Correct.

- Adding an interval that contains an existing one: [3,5) exists, add [1,10). start_idx = bisect_left([3], 1) = 0. end_idx = bisect_right([3], 10) - 1 = 1 - 1 = 0. new_lo = min(1, 3) = 1, new_hi = max(10, 5) = 10. Replace [3,5) with [1,10). Correct.

- Removing an interval that's completely contained in an existing one: [1,10) exists, remove [3,5). start_idx = bisect_left([1], 3) = 1. Check his[0]=10 > 3, so start_idx=0. end_idx = bisect_left([1], 5) - 1 = 1 - 1 = 0. Process [1,10): a=1 < 3, so add [1,3). b=10 > 5, so add [5,10). Result: [1,3) and [5,10). Correct.

- Removing an interval that contains an existing one: [3,5) exists, remove [1,10). start_idx = bisect_left([3], 1) = 0. end_idx = bisect_left([3], 10) - 1 = 1 - 1 = 0. Process [3,5): a=3 >= 1 (no left piece). b=5 <= 10 (no right piece). Result: empty. Correct.

- Remove where the interval exactly matches: [3,5) exists, remove [3,5). start_idx = bisect_left([3], 3) = 0. Check start_idx > 0? No. end_idx = bisect_left([3], 5) - 1 = 1 - 1 = 0. Process [3,5): a=3 >= 3 (no left piece). b=5 <= 5 (no right piece). Result: empty. Correct.

I think the implementation is correct. Let me also make sure the `intervals()` method returns a list of tuples.

One more thing: the problem says "Keep the original values (no rounding)." Since we're just storing and comparing the values, and using min/max, we should be fine. Python handles int/float comparisons correctly.

Let me also consider: what if lo and hi are of different types (int and float)? E.g., add(1, 2.5). Python handles this fine - 1 < 2.5 is True, and we store them as-is.

I think the solution is complete. Let me write the final version.

Actually, wait. Let me reconsider the performance of the list-based approach for 60,000 adds.

Each `add` call does:
1. Two bisect operations: O(log n)
2. A slice assignment `self._los[start_idx:end_idx+1] = [new_lo]`: this is O(n) due to memmove

For 60,000 adds where n grows from 0 to 60,000:
Total memmove work ≈ sum of n for n = 0 to 59999 ≈ 60000 * 60000 / 2 = 1.8 * 10^9 elements moved.

Each element is a Python object pointer (8 bytes). So total bytes moved ≈ 1.8 * 10^9 * 8 = 14.4 GB.

At memory bandwidth of ~20 GB/s (optimistic for a modern CPU), that's about 0.7 seconds. At ~10 GB/s, about 1.4 seconds.

Hmm, that might be a bit tight. But in practice, the memmove in CPython's list implementation is very optimized (it uses the system's memmove which is highly optimized). Also, the average case is better than the worst case (random insertion means average memmove is n/2, not n).

Actually wait, I'm doing TWO list operations (for _los and _his), so it's double. But still, 2 * 1.4 = 2.8 seconds worst case. That might be tight.

Hmm, but actually for "small disjoint intervals in random order", if they're truly disjoint, each add inserts exactly one interval. The slice assignment `self._los[start_idx:end_idx+1] = [new_lo]` where start_idx == end_idx (no existing intervals to merge) becomes `self._los[start_idx:start_idx+1] = [new_lo]` which is equivalent to `self._los.insert(start_idx, new_lo)`.

For a list of size n, inserting at a random position requires moving n/2 elements on average. For n up to 60,000, that's 30,000 elements moved per insert. 60,000 * 30,000 = 1.8 * 10^9 elements. At 8 bytes each, that's 14.4 GB of memory moved. For _los and _his, that's 28.8 GB.

At a realistic memmove speed of ~10-20 GB/s, that's 1.4-2.9 seconds. Plus the 200,000 contains calls (which are very fast, maybe 0.1 seconds). Total: 1.5-3 seconds. Should be under 5 seconds.

But to be safe, maybe I should consider a different data structure. However, implementing a balanced BST from scratch in Python would be slower due to Python overhead. The list approach leverages C-level optimizations for memmove.

Actually, I just realized: for the specific test case of "60,000 add() calls of small disjoint intervals in random order", if the intervals are truly disjoint, there's no merging, and each add is just an insert. The total time is dominated by the memmove.

Let me stick with the list approach. It should be fast enough.

One optimization: instead of maintaining two separate lists, I could use a single list of tuples. Then I only do one memmove instead of two. But then bisect on tuples is slightly slower than on a flat list of numbers. Let me benchmark in my head...

Actually, the difference is negligible. Let me keep two lists for clarity and because bisect on a flat list of numbers is the fastest.

Wait, actually there's another consideration. When I do `self._los[start_idx:end_idx+1] = [new_lo]`, if start_idx == end_idx, this is replacing one element with one element (no size change, just a set). If start_idx > end_idx (shouldn't happen in add since we always have at least the new interval), it's an insert. If end_idx - start_idx + 1 > 1, it's a shrink.

For the disjoint case: start_idx == end_idx (no existing intervals overlap), so we're replacing one element with one element? No wait, if there are no existing intervals to merge, then start_idx > end_idx. Let me re-examine.

If no existing intervals overlap:
- start_idx = bisect_left(los, lo). If start_idx > 0 and his[start_idx-1] >= lo, start_idx -= 1. But if no interval overlaps, his[start_idx-1] < lo, so start_idx stays.
- end_idx = bisect_right(los, hi) - 1. Since no interval has lo <= hi that also has hi > lo... hmm.

Wait, let me reconsider. If intervals are [1,2), [3,4), [5,6) and I add [7,8):
- start_idx = bisect_left([1,3,5], 7) = 3. Check his[2] = 6 >= 7? No. start_idx = 3.
- end_idx = bisect_right([1,3,5], 8) - 1 = 3 - 1 = 2.
- start_idx (3) > end_idx (2). So no existing intervals to merge.
- new_lo = 7, new_hi = 8.
- self._los[3:3] = [7] → inserts 7 at position 3. Correct!

If I add [2.5, 3.5):
- start_idx = bisect_left([1,3,5], 2.5) = 1. Check his[0] = 2 >= 2.5? No. start_idx = 1.
- end_idx = bisect_right([1,3,5], 3.5) - 1 = 2 - 1 = 1.
- start_idx (1) <= end_idx (1). So we merge with interval at index 1: [3,4).
- new_lo = min(2.5, 3) = 2.5, new_hi = max(3.5, 4) = 4.
- self._los[1:2] = [2.5], self._his[1:2] = [4].
- Result: [1,2), [2.5,4), [5,6). Correct!

Wait, but [1,2) and [2.5,4) are not adjacent (2 < 2.5), so they shouldn't be merged. Correct, they're separate.

What about adding [2, 3) to [1,2), [3,4), [5,6)?
- start_idx = bisect_left([1,3,5], 2) = 1. Check his[0] = 2 >= 2? Yes! start_idx = 0.
- end_idx = bisect_right([1,3,5], 3) - 1 = 2 - 1 = 1.
- Merge intervals 0 and 1: [1,2) and [3,4).
- new_lo = min(2, 1) = 1, new_hi = max(3, 4) = 4.
- Result: [1,4), [5,6). Correct! ([1,2) + [2,3) + [3,4) = [1,4))

Great, the algorithm handles the touching case correctly.

I'm satisfied with the implementation. Let me write the final clean version.

Actually, one more thought: for the `remove` method, I should also handle the case where the removal creates adjacent intervals that should be merged. Wait, no. If I remove [lo, hi) from the set, the remaining intervals are still disjoint (we're removing, not adding). And they were already merged before. After removal, could two intervals become adjacent?

Example: [1,5) and remove [2,4). Result: [1,2) and [4,5). These are not adjacent (2 < 4). No merging needed.

Example: [1,3) and [3,5) can't exist because they'd be merged to [1,5). So after removal, we can't create adjacent intervals because the original set had no adjacent intervals.

Wait, actually: [1,5) and remove [2,3). Result: [1,2) and [3,5). 2 < 3, not adjacent. Good.

[1,5) and remove [1,3). Result: [3,5). Single interval. Good.

[1,5) and remove [3,5). Result: [1,3). Single interval. Good.

I don't think removal can create adjacent intervals, because the original intervals were already merged (no adjacent ones), and we're only taking pieces of existing intervals.

OK, I'm confident the solution is correct. Let me finalize it.
