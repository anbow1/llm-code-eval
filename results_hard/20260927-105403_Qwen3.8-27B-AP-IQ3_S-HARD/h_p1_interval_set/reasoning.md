Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) with operations that maintain the invariant that intervals are sorted, disjoint, and touching intervals are merged.

Key requirements:
1. `add(lo, hi)` - add interval, merge with overlapping/adjacent ones
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n) lookup
4. `total_length()` - sum of lengths
5. `intervals()` - sorted list of tuples
6. `__len__()` - number of intervals

Performance: 60,000 add() calls of small disjoint intervals in random order + 200,000 contains() calls must be under 5 seconds.

For O(log n) contains(), I need a data structure that supports efficient searching. A sorted list would give O(log n) for search but O(n) for insertion. With 60,000 adds, that's 60,000 * 60,000/2 = way too slow.

Options:
1. Use a sorted list with bisect for search, but insertion is O(n) due to list shifting. 60,000 insertions * 60,000/2 shifts = 1.8 * 10^9 operations - too slow.
2. Use a balanced BST / interval tree.
3. Use a sorted list but batch operations... no, that won't work.
4. Use `bisect` module with a list - but insertion is O(n).
5. Use a treap or other self-balancing BST.

Actually, let me reconsider. 60,000 add() calls of small disjoint intervals. If they're disjoint, each add() only inserts one new interval (no merging needed). So we're doing 60,000 insertions into a sorted structure.

With a plain list: each insertion is O(n) for the list shift. 60,000 insertions with average position n/2 = 30,000 shifts each. Total: 60,000 * 30,000 = 1.8 * 10^9 element shifts. In CPython, list insertion involves memmove which is fast in C, but 1.8 billion element moves... each element is a pointer (8 bytes), so that's about 14.4 GB of memory movement. That might actually be too slow.

Wait, actually in CPython, list.insert is implemented in C and does a memmove. 60,000 inserts of 8-byte pointers with average 30,000 elements to move = 60,000 * 30,000 * 8 bytes = 14.4 GB of memmove. That's probably too slow (would take several seconds).

Alternative: Use a treap (randomized BST) for the intervals. Each node stores lo, hi, and pointers to left, right, plus a priority. This gives O(log n) expected for insert, delete, search.

Actually, let me think about this differently. For the interval set, I need:
- Find all intervals that overlap with [lo, hi) for add()
- Find the interval containing x for contains()
- Split intervals for remove()

A treap keyed by lo (the left endpoint) would work. To find overlapping intervals:
- Find the interval with the largest lo <= x (for the start of our range)
- Then walk forward while interval.lo < hi

For contains(x):
- Find the interval with the largest lo <= x
- Check if x < that interval's hi

Let me implement a treap.

Actually, let me think about whether there's a simpler approach. What about using a sorted list with bisect, but being smarter about it?

With 60,000 disjoint intervals added in random order:
- Each add() does: bisect to find position (O(log n)), then list.insert (O(n) for memmove)
- Total: 60,000 * (log(60,000) + 60,000/2) ≈ 60,000 * 30,000 = 1.8 * 10^9 pointer moves

In CPython, a list insert of an 8-byte pointer at position k requires moving (n-k) elements. The memmove is in C and very fast (memory bandwidth). On modern hardware, memmove can do ~10 GB/s. So 14.4 GB / 10 GB/s ≈ 1.4 seconds. Plus the bisect operations. This might be borderline.

Actually, let me reconsider. The memmove for a list of 60,000 elements is moving 60,000 * 8 = 480,000 bytes = 480 KB. At 10 GB/s, that's 48 µs per insertion. 60,000 insertions * 48 µs = 2.88 seconds. That's cutting it close.

A treap would be safer. Let me implement one.

Treap node:
- lo, hi: the interval bounds
- left, right: child pointers
- priority: random value

Operations:
- insert(node, new_node): standard treap insertion
- split(root, key): split into < key and >= key
- merge(left, right): merge two treaps where all keys in left < all keys in right
- search: find node with key
- delete: standard treap deletion

For the interval operations:

`add(lo, hi)`:
1. Find all existing intervals that overlap [lo, hi) or touch it (i.e., interval.lo <= hi and interval.hi >= lo, or for touching: interval.hi == lo or interval.lo == hi)
2. Actually, we need to merge [lo, hi) with all intervals that overlap or touch it.
   - Overlapping: existing.lo < hi AND existing.hi > lo
   - Touching: existing.hi == lo OR existing.lo == hi
   - Combined: existing.lo <= hi AND existing.hi >= lo
   - Wait, for half-open [lo, hi): [1,3) and [3,5) touch. [1,3) and [2,4) overlap. [1,3) and [4,5) don't touch.
   - Two intervals [a,b) and [c,d) should be merged if a <= d and c <= b. Wait no: [a,b) and [c,d) overlap or touch if a < d and c < b... hmm.
   - Actually [a,b) and [c,d) should be merged if max(a,c) < min(b,d) (they overlap) OR a == d (touching from left, i.e., [a,b) ends where [c,d) starts... wait no, if c == b then they touch) OR b == c (they touch).
   - Simpler: merge if not (b <= c or d <= a), i.e., if a < d and c < b. But this doesn't handle touching: [1,3) and [3,5): a=1, b=3, c=3, d=5. a < d (1<5) and c < b (3<3 is false). So they wouldn't be merged!
   - We need: merge if not (b <= c and a >= d)... no.
   - Let me think again. [a,b) and [c,d). They are disjoint and non-touching if b <= c or d <= a. They should be merged if NOT (b <= c or d <= a), i.e., b > c AND d > a. Wait: [1,3) and [3,5): b=3, c=3, d=5. b > c? 3 > 3? No. d > a? 5 > 1? Yes. So NOT(b <= c or d <= a) = NOT(False or False) = True. Wait, b <= c is 3 <= 3 which is True. So NOT(True or ...) = False. They wouldn't be merged. But they should be!
   
   Hmm, let me reconsider. [1,3) and [3,5) should be merged into [1,5) because they touch. The condition for two half-open intervals [a,b) and [c,d) to NOT be mergeable (i.e., they are truly disjoint with a gap) is: b < c (gap between them) or d < a (gap). If b == c, they touch and should be merged.
   
   So merge if: NOT (b < c or d < a), i.e., b >= c AND d >= a.
   
   Check: [1,3) and [3,5): b=3, c=3, d=5. b >= c (3>=3) and d >= a (5>=1). Merge! ✓
   Check: [1,3) and [4,5): b=3, c=4, d=5. b >= c (3>=4)? No. Don't merge. ✓
   Check: [1,5) and [2,3): b=5, c=2, d=3. b >= c (5>=2) and d >= a (3>=1). Merge. ✓
   Check: [1,3) and [3,5) again: merge. ✓

   So the condition to check if a new interval [lo, hi) overlaps/touches an existing [a, b) is: lo < b AND hi > a... wait no. Let me re-derive.
   
   [a, b) and [lo, hi) should be merged if NOT (b <= lo OR hi <= a), i.e., b > lo AND hi > a.
   
   Wait: [1,3) and [3,5): b=3, lo=3. b > lo? 3 > 3? No. So they wouldn't be merged. But they should be!
   
   I think the issue is: for half-open intervals, [a,b) and [c,d) are "connected" (should be merged) if b >= c AND d >= a. They have a gap only if b < c (first ends before second starts) or d < a (second ends before first starts).
   
   Let me verify: [1,3) and [3,5): b=3, c=3. b < c? 3 < 3? No. d < a? 5 < 1? No. So no gap, merge. ✓
   [1,3) and [4,5): b=3, c=4. b < c? 3 < 4? Yes. Gap, don't merge. ✓
   
   So the condition for "connected" (merge) is: NOT (b < c OR d < a), equivalently b >= c AND d >= a.
   
   For adding [lo, hi) to existing [a, b):
   Merge if: NOT (b < lo OR hi < a), i.e., b >= lo AND hi >= a.
   
   Check: adding [3, 5) to existing [1, 3): b=3, lo=3, hi=5, a=1. b >= lo? 3>=3? Yes. hi >= a? 5>=1? Yes. Merge. ✓
   Adding [4, 5) to existing [1, 3): b=3, lo=4, hi=5, a=1. b >= lo? 3>=4? No. Don't merge. ✓

OK so for the treap, I'll key by `lo` (the left endpoint). Since intervals are disjoint and non-touching in the stored form, all `lo` values are unique.

Wait, are they? If we have [1,3) and [3,5), they should be merged to [1,5). So in the stored form, no two intervals touch. That means all lo values are strictly less than the hi of the previous interval, with a gap. So lo values are all distinct. Good.

Let me design the treap:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'left', 'right', 'prio')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.left = None
        self.right = None
        self.prio = random.random()
```

Treap operations (using the "split and merge" approach):

Actually, let me think about what operations I need:

1. `contains(x)`: Find the interval whose lo is the largest value <= x. Check if x < hi.
   - This is a "floor" search in the treap keyed by lo.

2. `add(lo, hi)`: 
   - Find all intervals that are "connected" to [lo, hi). These are intervals [a, b) where b >= lo AND hi >= a.
   - Since intervals are sorted by lo and non-overlapping, the connected intervals form a contiguous range in the treap.
   - The new interval's lo = min(lo, min of connected intervals' lo), hi = max(hi, max of connected intervals' hi).
   - Remove all connected intervals, insert the new merged one.

3. `remove(lo, hi)`:
   - Find all intervals that overlap [lo, hi). These are intervals [a, b) where a < hi AND b > lo (strict overlap, not just touching).
   - Wait, for removal: we remove the part of the set that intersects [lo, hi). So if we have [1, 5) and remove [2, 4), we get [1, 2) and [4, 5).
   - If we remove [2, 5), we get [1, 2).
   - If we remove [1, 5), we get nothing.
   - The intervals that overlap [lo, hi) are those with a < hi AND b > lo.
   - For each such interval [a, b):
     - If a < lo, keep [a, lo)
     - If b > hi, keep [hi, b)
   - Remove the overlapping intervals, add back the partials.

4. `total_length()`: Sum of (hi - lo) for all intervals. I can maintain this as a running total.

5. `intervals()`: In-order traversal of the treap.

6. `__len__()`: Maintain a counter.

For the treap, I'll implement:
- `_split(node, key)` -> (left_tree, right_tree) where left has keys < key, right has keys >= key
- `_merge(left, right)` -> merged tree (all keys in left < all keys in right)
- `_floor_search(node, key)` -> node with largest key <= key (or None)

Actually, for `add` and `remove`, I need to find a range of intervals. Let me think about this more carefully.

For `add(lo, hi)`:
- Find the first interval that could be connected: the one with the largest lo <= hi (since we need b >= lo, and since intervals are sorted, if an interval has lo > hi, its b > lo is possible but... wait, no. If lo_interval > hi_new, then lo_interval >= hi_new, and since lo_interval < hi_interval (valid interval), hi_interval > lo_interval > hi_new. So hi_interval > hi_new >= lo_new. Wait, that means they could still overlap!
  
  Hmm, actually let me reconsider. The condition for [a,b) to be connected to [lo,hi) is: b >= lo AND hi >= a. Since a < b always (valid interval), and lo < hi (we check this):
  - b >= lo: the existing interval extends at least to lo
  - hi >= a: the new interval extends at least to a
  
  So I need to find all intervals where a <= hi (i.e., lo of existing <= hi of new) AND b >= lo (hi of existing >= lo of new).
  
  Since intervals are sorted by a (lo), and non-overlapping:
  - The intervals with a <= hi form a prefix (all intervals from the start up to some point)
  - Among those, the ones with b >= lo form a suffix of that prefix (because b increases as a increases for non-overlapping sorted intervals... wait, is that true?)
  
  Actually, for disjoint non-touching intervals sorted by lo: a1 < b1 < a2 < b2 < a3 < b3 < ...
  So both a and b are increasing. So the condition b >= lo gives us a suffix, and a <= hi gives us a prefix. The intersection is a contiguous range.
  
  To find this range:
  - Find the first interval with a <= hi (this is all of them up to some point, or all of them)
  - Among those, find the first with b >= lo (this is a suffix)
  
  Actually, since a and b are both increasing:
  - The intervals with b >= lo: since b is increasing, this is a suffix starting at some index
  - The intervals with a <= hi: since a is increasing, this is a prefix ending at some index
  - The connected intervals are from the start of the suffix to the end of the prefix, i.e., a contiguous range.
  
  More simply: I can find the range by:
  1. Find the interval with the largest a < hi (or <= hi... well, a <= hi means a < hi since a < b and if a == hi then a == hi means the interval starts exactly at hi, so [a,b) = [hi, b) which doesn't overlap with [lo,hi) since it's half-open. Wait: [lo,hi) and [hi,b): do they overlap? No, they touch. And we want to merge touching intervals. So a <= hi should include a == hi? Let's check: [1,3) and [3,5) should be merged. Here a=3, hi=3. a <= hi? 3<=3? Yes. And b=5, lo=1. b >= lo? 5>=1? Yes. So they'd be connected. Good.
  
  Actually wait, I need to be more careful. Let me re-examine: [a,b) and [lo,hi) are connected if NOT (b < lo OR hi < a), i.e., b >= lo AND a <= hi.
  
  So I want intervals where a <= hi AND b >= lo.
  
  Since a is increasing (sorted), a <= hi gives a prefix.
  Since b is increasing (sorted, non-overlapping), b >= lo gives a suffix.
  
  The intersection is [max(start_of_suffix, 0), min(end_of_prefix, n-1)] which is a contiguous range (possibly empty).
  
  Implementation with treap:
  - Find the rightmost interval with a <= hi: this is the floor search for hi.
  - Find the leftmost interval with b >= lo: since b is increasing, this is... hmm, I need to search by b.
  
  Alternative approach: since the connected intervals form a contiguous range, I can:
  1. Find the first interval (by a) where a <= hi. That's... the first interval in the tree (smallest a) always satisfies a <= hi unless hi is very small. Actually, the smallest a might be > hi. In that case, no intervals are connected.
  2. Actually, let me think differently. I'll find:
     - The last interval with a <= hi (floor search on a for value hi)
     - The first interval with b >= lo (this requires searching by b)
  
  For the b-search: since b is increasing in order of a, I can do a binary search on the treap. But the treap is keyed by a, not b. However, since b is monotonically increasing with a, I can still do a search: start at root, if node.b >= lo, go left to find earlier ones; if node.b < lo, go right. This works because b is monotonic!
  
  Wait, is b monotonic? For disjoint non-touching intervals sorted by lo: [a1,b1), [a2,b2), ... where a1 < b1 < a2 < b2 < ... Yes, b is strictly increasing.
  
  So I can search for the first interval with b >= lo:
  - Start at root
  - If node.b >= lo: the answer is in the left subtree or the node itself. Go left if possible.
  - If node.b < lo: the answer is in the right subtree. Go right.
  
  This is O(log n).
  
  Similarly, to find the last interval with a <= hi:
  - Standard floor search on a.
  
  So the connected range is from the first interval with b >= lo to the last interval with a <= hi. If the first is after the last (or either is None), no connection.

  Once I have the range, I need to:
  - Compute new_lo = min(lo, a of first connected interval)
  - Compute new_hi = max(hi, b of last connected interval)
  - Remove all intervals in the range
  - Insert the new merged interval

For the treap, removing a range and inserting:
- I can use split: split by the lo of the first connected interval to get (before, rest), then split by the lo of the interval after the last connected interval to get (middle, after). Then merge before + new_interval + after.

Actually, let me use a different approach. I'll use the split/merge treap operations:

```
_split(node, key) -> (L, R) where all keys in L < key, all keys in R >= key
_merge(L, R) -> merged tree (requires all keys in L < all keys in R)
```

For removing a range [key_lo, key_hi) from the treap:
- Split by key_lo: (L, R1)
- Split R1 by key_hi: (M, R2)
- M is the range to remove
- Result: merge(L, R2)

For add(lo, hi):
- Find first connected: first interval with b >= lo
- Find last connected: last interval with a <= hi
- If no connected intervals: just insert [lo, hi)
- If connected intervals exist:
  - new_lo = min(lo, first.connected.lo)
  - new_hi = max(hi, last.connected.hi)
  - Remove range [first.connected.lo, next_after_last.lo)
  - Insert [new_lo, new_hi)

For remove(lo, hi):
- Find intervals that overlap [lo, hi): intervals [a,b) where a < hi AND b > lo
- Since a is increasing and b is increasing:
  - a < hi: prefix
  - b > lo: suffix
  - Intersection: contiguous range
- Find first interval with b > lo (first where b > lo)
- Find last interval with a < hi (last where a < hi)
- For each interval in the range:
  - If a < lo: keep [a, lo)
  - If b > hi: keep [hi, b)
- Remove the range, add back the partials

Let me also maintain a `total_length` and `count` for O(1) access.

Let me code this up:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'left', 'right', 'prio')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.left = None
        self.right = None
        self.prio = random.random()

class IntervalSet:
    def __init__(self):
        self._root = None
        self._count = 0
        self._total = 0.0  # or 0, depends on types
    
    def _split(self, node, key):
        """Split treap into (L, R) where all keys in L < key, all in R >= key."""
        if node is None:
            return (None, None)
        if node.lo < key:
            L, R = self._split(node.right, key)
            node.right = L
            return (node, R)
        else:
            L, R = self._split(node.left, key)
            node.left = R
            return (L, node)
    
    def _merge(self, left, right):
        """Merge two treaps where all keys in left < all keys in right."""
        if left is None:
            return right
        if right is None:
            return left
        if left.prio < right.prio:  # min-heap by priority
            left.right = self._merge(left.right, right)
            return left
        else:
            right.left = self._merge(left, right.left)
            return right
```

Wait, I should think about whether to use min-heap or max-heap for priorities. Either works. Let me use the convention where lower priority = higher in tree (min-heap), so the node with the smallest random value is the root.

Actually, let me reconsider the recursion depth. With 60,000 nodes, the expected height of a treap is O(log n) ≈ 17. Python's default recursion limit is 1000, so we should be fine. But to be safe, I could increase it or use iterative approaches. Actually, the split and merge operations recurse on the depth of the tree, which for a treap with 60,000 nodes is about 2*log2(60000) ≈ 34 in the worst expected case. Well within 1000.

Let me also think about the `_floor_search` for finding the last interval with a <= key:

```python
def _floor_search(self, node, key):
    """Find node with largest lo <= key."""
    result = None
    while node is not None:
        if node.lo <= key:
            result = node
            node = node.right
        else:
            node = node.left
    return result
```

And for finding the first interval with b >= key (or b > key):

```python
def _first_with_b_ge(self, node, key):
    """Find leftmost interval with b >= key. Uses the fact that b is monotonically increasing with lo."""
    result = None
    while node is not None:
        if node.hi >= key:
            result = node
            node = node.left
        else:
            node = node.right
    return result
```

Wait, this works because b is monotonically increasing. If node.hi >= key, then all nodes in the right subtree also have hi >= key, so the answer is in the left subtree or the node itself. If node.hi < key, then the node and all left subtree have hi < key, so the answer is in the right subtree.

Similarly for _last_with_a_le (floor search on lo) - already done above.

Now for `add(lo, hi)`:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find connected intervals: a <= hi AND b >= lo
    # First connected: first interval with b >= lo
    first = self._first_with_b_ge(self._root, lo)
    if first is None:
        # No interval has b >= lo, so no overlap. But check if any interval has a <= hi
        # Actually if first is None, it means all intervals have b < lo, so a < b < lo <= hi
        # So a < hi for all... but we need a <= hi AND b >= lo. Since b < lo for all, no connection.
        # Just insert.
        self._insert(_Node(lo, hi))
        return
    
    # Last connected: last interval with a <= hi
    last = self._floor_search(self._root, hi)
    if last is None:
        # No interval has a <= hi. But first has b >= lo. Can this happen?
        # If first.hi >= lo, and all intervals have a > hi... 
        # Then a > hi >= lo, so a > lo. And b > a > lo. So b > lo. 
        # But a > hi means the interval starts after hi. So [a,b) with a > hi.
        # Does [a,b) connect to [lo,hi)? Condition: b >= lo AND a <= hi.
        # a > hi, so a <= hi is false. No connection.
        # Contradiction with first existing. So first should also be None in this case.
        # Actually wait: _first_with_b_ge finds first with b >= lo. If all a > hi, then all b > a > hi >= lo,
        # so all have b >= lo. So first would be the first interval in the tree.
        # But last (floor search for hi) would be None since all a > hi.
        # In this case, first.a > hi, so first.a <= hi is false. No connection.
        self._insert(_Node(lo, hi))
        return
    
    # Check if first and last are in the same "connected" range
    # The connected range is from first to last (by position in sorted order)
    # But we need to verify: is first actually connected to lo?
    # first has b >= lo. We also need a <= hi for first.
    # last has a <= hi. We also need b >= lo for last.
    # Since b is increasing and first has b >= lo, all intervals from first onwards have b >= lo.
    # Since a is increasing and last has a <= hi, all intervals up to last have a <= hi.
    # So the connected range is [first, last] (inclusive) in sorted order.
    
    # But wait: is it possible that first > last (in sorted order)? 
    # first is the leftmost with b >= lo, last is the rightmost with a <= hi.
    # Since a and b are both increasing, and for any interval a < b:
    # If first exists and last exists, is first always <= last in sorted order?
    # first.b >= lo and last.a <= hi. Since lo < hi, we have first.b >= lo < hi.
    # If first == last, it's clearly connected (b >= lo and a <= hi for the same interval).
    # If first < last (first comes before last in sorted order): first.a <= last.a <= hi, and first.b >= lo.
    #   So first is connected. All between are also connected. Good.
    # If first > last (first comes after last): first.a > last.a. 
    #   last.a <= hi. first.b >= lo. But first.a > last.a and first.a < first.b.
    #   Is it possible? last is the rightmost with a <= hi. first is the leftmost with b >= lo.
    #   If first is after last, then first.a > hi (since last is the rightmost with a <= hi).
    #   And last.b < lo (since first is the leftmost with b >= lo, everything before has b < lo).
    #   So last: a <= hi and b < lo. But a < b, so a < lo. And hi > lo. So a < lo < hi.
    #   last interval: [a, b) with a < lo < hi and b < lo. So b < lo < a? No, a < b < lo.
    #   Hmm, this means last is entirely before lo. And first is entirely after hi.
    #   So no interval actually connects to [lo, hi). 
    #   In this case, first.a > hi (since first is after last, and last is rightmost with a <= hi).
    #   So first is not connected (its a > hi). And last is not connected (its b < lo).
    #   So we should just insert.
    
    # To check: is first actually connected? first.b >= lo (by construction) and first.a <= hi?
    # If first.a > hi, then first is not connected.
    # Similarly for last: last.a <= hi (by construction) and last.b >= lo?
    # If last.b < lo, then last is not connected.
    
    # Since a and b are increasing:
    # - If first.a > hi: all intervals from first onwards have a > hi. No connection. Just insert.
    # - If last.b < lo: all intervals up to last have b < lo. No connection. Just insert.
    # - Otherwise: first.a <= hi and last.b >= lo. The range [first, last] is all connected.
    
    if first.lo > hi or last.hi < lo:
        # No actual connection
        self._insert(_Node(lo, hi))
        return
    
    # The connected range is from first to last (inclusive)
    new_lo = min(lo, first.lo)
    new_hi = max(hi, last.hi)
    
    # Remove range [first.lo, next_after_last.lo)
    # Split by first.lo to separate before
    L, R = self._split(self._root, first.lo)
    # Now R contains first and everything after
    # Find the lo of the node after last
    # We need to split R by the lo of the successor of last
    # The successor of last in the treap...
    
    # Actually, I need to find the lo value that is "after" last.
    # Since last is the rightmost with a <= hi, the next interval (if exists) has a > hi.
    # I can find it by: the successor of last in the BST.
    
    # Or simpler: split R by (hi + epsilon)? No, that's hacky.
    # Better: find the successor of last.
    
    # Actually, I can split R by a key that separates last from its successor.
    # The successor of last has the smallest lo > last.lo in R.
    # I can find it, or I can just split by a value between last.lo and its successor's lo.
    
    # Simpler approach: I'll find the successor of last.
    succ = self._successor_in_tree(last)  # might be None
    split_key = succ.lo if succ is not None else float('inf')
    
    M, R2 = self._split(R, split_key)
    # M contains first through last
    # L is everything before first
    # R2 is everything after last
    
    # Remove M's intervals from count and total
    # I need to count nodes in M and sum their lengths
    m_count, m_total = self._tree_info(M)
    self._count -= m_count
    self._total -= m_total
    
    # Discard M (garbage collect)
    
    # Create new node and insert
    new_node = _Node(new_lo, new_hi)
    new_tree = self._merge(self._merge(L, new_node), R2)
    self._root = new_tree
    self._count += 1
    self._total += (new_hi - new_lo)
```

Hmm, this is getting complex. Let me think about whether I need `_successor_in_tree`. 

Actually, a simpler approach for the split: I can find the successor of `last` in the treap. The successor of a node is either:
- The leftmost node in its right subtree, or
- The nearest ancestor for which the node is in the left subtree.

But since I'm going to split the tree anyway, maybe I can avoid finding the successor explicitly.

Alternative: Instead of finding the exact range and splitting, I can:
1. Split by first.lo: (L, R) - L has everything before first, R has first and after
2. In R, I need to split off everything up to and including last.
3. Since last is the rightmost with a <= hi, I can split R by (hi + 1)? No, that's not clean with mixed int/float.

Actually, wait. I know that last is the rightmost with a <= hi. The next interval after last has a > hi. So I can split R by any value k where last.lo < k <= next.lo. Since last is the rightmost with a <= hi, and the next has a > hi, I can use k = hi (if hi > last.lo, which it should be since last.lo <= hi and last.lo < last.hi... hmm, last.lo could equal hi? No: if last.lo == hi, then last is [hi, b) which starts at hi. Does [hi, b) connect to [lo, hi)? Condition: b >= lo AND hi >= hi (a <= hi, a = hi, so hi <= hi is true). And b >= lo. So yes, they connect! And last.lo = hi, so splitting by hi would put last in R (since we split by key where L has keys < key). Wait, my split is: L has keys < key, R has keys >= key. So splitting R by hi: L part has keys < hi, R part has keys >= hi. last.lo = hi would go to R part. That's wrong.

Let me use a different approach. I'll find the successor of last explicitly.

```python
def _successor(self, node):
    """Find successor of node in the treap (node must be in the treap)."""
    if node.right is not None:
        cur = node.right
        while cur.left is not None:
            cur = cur.left
        return cur
    # Find the nearest ancestor where node is in the left subtree
    # This requires parent pointers or we need to search from root
    # Since we don't have parent pointers, let's search from root
    cur = self._root
    succ = None
    while cur is not None:
        if cur.lo > node.lo:
            succ = cur
            cur = cur.left
        else:
            cur = cur.right
    return succ
```

This is O(log n) which is fine.

Actually, let me reconsider the whole approach. Maybe I should just use a sorted list with bisect, and hope that the C-level memmove is fast enough. Let me estimate more carefully.

60,000 inserts into a list. Each insert at position k in a list of length n requires moving n-k elements. The memmove is in C.

Average position: n/2 = 30,000 (early on it's less, later more).
Average elements to move: ~30,000 * 8 bytes = 240,000 bytes per insert.
Total memory moved: 60,000 * 240,000 = 14.4 GB.
At ~20 GB/s memory bandwidth (modern CPU): 14.4 / 20 = 0.72 seconds.
Plus the bisect operations: 60,000 * log(60,000) ≈ 60,000 * 17 ≈ 1,020,000 comparisons. Negligible.
Plus the 200,000 contains() calls: 200,000 * log(60,000) ≈ 3.4 million comparisons. Negligible.

Actually, list.insert in CPython involves:
1. Checking bounds
2. memmove of (size - index) * sizeof(void*) bytes
3. Writing the new element

The memmove for 240 KB should take about 240,000 / 20,000,000,000 ≈ 12 µs.
60,000 * 12 µs = 720 ms.

Plus Python overhead for the function call, the bisect, etc. Maybe 1-2 seconds total. This might be under 5 seconds.

But to be safe, let me go with the treap approach. It's more robust.

Actually, you know what, let me reconsider. The problem says "60,000 add() calls of small disjoint intervals in random order". If they're all disjoint, then each add() just inserts one new interval (no merging). So the list grows from 0 to 60,000.

With the list approach:
- add: bisect.insort (O(log n) search + O(n) insert)
- contains: bisect to find the interval (O(log n))

The 60,000 inserts with average O(n) = O(30,000) memmove each. Total memmove: sum from i=0 to 59999 of (i+1)/2 ≈ 59999*60000/2/2 ≈ 900,000,000 elements * 8 bytes = 7.2 GB. At 20 GB/s: 360 ms.

Hmm, actually the average is n/2 where n goes from 0 to 60000, so average n/2 = 15000. Total: 60000 * 15000 * 8 = 7.2 GB. At 20 GB/s: 360ms. Plus Python overhead.

This should be well under 5 seconds. Let me go with the simpler list-based approach using bisect.

Wait, but I also need to handle the general case where add() might merge intervals (not just the performance test case). And remove() which splits.

Let me go with the list approach:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._intervals = []  # list of (lo, hi) tuples, sorted, disjoint, non-touching
        self._total = 0  # total length
    
    def _update_total(self, delta):
        self._total += delta
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        # Find all intervals that overlap or touch [lo, hi)
        # An interval (a, b) connects to (lo, hi) if not (b < lo or hi < a)
        # i.e., b >= lo and hi >= a (wait, I need to be careful)
        # Actually: (a, b) and (lo, hi) connect if b >= lo AND a <= hi
        # Wait: [a,b) and [lo,hi) connect if NOT(b < lo OR hi < a), i.e., b >= lo AND hi >= a
        # Hmm wait: NOT(b < lo) means b >= lo. NOT(hi < a) means hi >= a.
        # So connect if b >= lo AND hi >= a.
        
        # Since intervals are sorted by lo, and non-overlapping (a_i < b_i < a_{i+1} < b_{i+1}):
        # The connected intervals form a contiguous range.
        # Find the first interval with b >= lo (using binary search since b is increasing)
        # Find the last interval with a <= hi (using binary search since a is increasing)
        
        if not self._intervals:
            self._intervals.append((lo, hi))
            self._total += (hi - lo)
            return
        
        # Find first interval with b >= lo
        # b values are in self._intervals[i][1], sorted
        # Use bisect_left on the list of b values
        b_vals = [iv[1] for iv in self._intervals]
        i_start = bisect.bisect_left(b_vals, lo)  # first index where b >= lo
        
        # Find last interval with a <= hi
        a_vals = [iv[0] for iv in self._intervals]
        i_end = bisect.bisect_right(a_vals, hi) - 1  # last index where a <= hi
        
        # Check if there's actual overlap
        if i_start > i_end:
            # No connection, just insert
            self._intervals.insert(i_start, (lo, hi))
            # Wait, I need to find the right position for lo
            # Actually, I should insert at position where lo fits
            # Since a_vals is sorted, use bisect
            pos = bisect.bisect_right(a_vals, lo)
            self._intervals.insert(pos, (lo, hi))
            self._total += (hi - lo)
            return
        
        # There's overlap from i_start to i_end
        new_lo = min(lo, self._intervals[i_start][0])
        new_hi = max(hi, self._intervals[i_end][1])
        
        old_total = sum(self._intervals[i][1] - self._intervals[i][0] for i in range(i_start, i_end + 1))
        
        self._total += (new_hi - new_lo) - old_total
        self._intervals[i_start:i_end+1] = [(new_lo, new_hi)]
```

Wait, this is getting slow because I'm creating `b_vals` and `a_vals` lists every time. For 60,000 intervals, that's O(n) per add, making it O(n^2) total. Bad.

Let me keep the lists separate or use a different approach.

Actually, for the list approach, I can just store the intervals in a list and use bisect on the lo values (which are the first elements). For finding the first interval with b >= lo, I can do a binary search since b is monotonically increasing.

Let me restructure:

```python
import bisect

class IntervalSet:
    def __init__(self):
        self._lo = []  # sorted list of lo values
        self._hi = []  # sorted list of hi values (corresponding to _lo)
        self._total = 0
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        
        if not self._lo:
            self._lo.append(lo)
            self._hi.append(hi)
            self._total += (hi - lo)
            return
        
        # Find first index where hi >= lo (bisect on _hi)
        i_start = bisect.bisect_left(self._hi, lo)
        
        # Find last index where lo <= hi (bisect on _lo)
        i_end = bisect.bisect_right(self._lo, hi) - 1
        
        if i_start > i_end:
            # No overlap, find insertion position
            pos = bisect.bisect_right(self._lo, lo)
            self._lo.insert(pos, lo)
            self._hi.insert(pos, hi)
            self._total += (hi - lo)
            return
        
        new_lo = min(lo, self._lo[i_start])
        new_hi = max(hi, self._hi[i_end])
        
        old_total = 0
        for i in range(i_start, i_end + 1):
            old_total += self._hi[i] - self._lo[i]
        
        self._total += (new_hi - new_lo) - old_total
        
        self._lo[i_start:i_end+1] = [new_lo]
        self._hi[i_start:i_end+1] = [new_hi]
```

But the `bisect.bisect_left(self._hi, lo)` requires _hi to be sorted. Is it? For disjoint non-touching intervals sorted by lo: a1 < b1 < a2 < b2 < ... So yes, hi values are also sorted!

This works. The only issue is performance of list.insert for 60,000 elements. As I calculated, it should be OK.

For `contains(x)`:
```python
def contains(self, x):
    if not self._lo:
        return False
    i = bisect.bisect_right(self._lo, x) - 1
    if i < 0:
        return False
    return x < self._hi[i]
```

This is O(log n). 

For `remove(lo, hi)`:
- Find intervals that overlap [lo, hi): [a,b) where a < hi AND b > lo
- i_start: first index where b > lo (bisect_right on _hi for lo)
  Wait: bisect_left(self._hi, lo) gives first index where hi >= lo. But I want hi > lo.
  Hmm: bisect_right(self._hi, lo) gives first index where hi > lo. Yes!
  
  Wait, let me reconsider. bisect_right(a, x) returns the insertion point to the right of any existing x. So a[0:pos] are all <= x, and a[pos:] are all > x. So bisect_right(self._hi, lo) gives the first index where hi > lo. 
  
  Actually wait: I want intervals where b > lo (strict). bisect_right(self._hi, lo) gives the count of elements <= lo, so the index of the first element > lo. That's what I want.
  
  i_end: last index where a < hi. bisect_left(self._lo, hi) gives the first index where a >= hi. So i_end = bisect_left(self._lo, hi) - 1.
  
  Check: if i_start <= i_end, there are overlapping intervals.
  
  For each interval [a, b) in range [i_start, i_end]:
  - If a < lo: keep [a, lo)
  - If b > hi: keep [hi, b)
  
  Remove the range, add back partials.

Let me code this more carefully:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    if not self._lo:
        return
    
    # Find intervals overlapping [lo, hi): a < hi AND b > lo
    i_start = bisect.bisect_right(self._hi, lo)  # first index where hi > lo
    i_end = bisect.bisect_left(self._lo, hi) - 1  # last index where lo < hi (a < hi)
    
    if i_start > i_end:
        return  # nothing to remove
    
    # Build the replacement
    new_intervals = []
    old_total = 0
    for i in range(i_start, i_end + 1):
        a, b = self._lo[i], self._hi[i]
        old_total += b - a
        if a < lo:
            new_intervals.append((a, lo))
        if b > hi:
            new_intervals.append((hi, b))
    
    self._total += sum(h - l for l, h in new_intervals) - old_total
    self._lo[i_start:i_end+1] = [l for l, h in new_intervals]
    self._hi[i_start:i_end+1] = [h for l, h in new_intervals]
```

Wait, there's a subtlety. If a < lo and b > hi (the interval fully contains [lo, hi)), we get [a, lo) and [hi, b). If a < lo and b <= hi, we get [a, lo). If a >= lo and b > hi, we get [hi, b). If a >= lo and b <= hi, we get nothing (the interval is fully contained in the removal range).

This looks correct.

Let me also make sure the "touching" logic is right for add:
- [1,3) and [3,5) should merge. In add: lo=3, hi=5 (or lo=1, hi=3 added to existing [3,5)).
  - If adding [3,5) to existing [1,3): i_start = bisect_left([3], 3) = 0 (first hi >= 3). i_end = bisect_right([1], 5) - 1 = 1 - 1 = 0. So range is [0,0]. new_lo = min(3,1) = 1, new_hi = max(5,3) = 5. Result: [1,5). ✓
  - If adding [1,3) to existing [3,5): i_start = bisect_left([5], 1) = 0 (first hi >= 1, which is 5). i_end = bisect_right([3], 3) - 1 = 1 - 1 = 0. Range [0,0]. new_lo = min(1,3) = 1, new_hi = max(3,5) = 5. Result: [1,5). ✓

For remove:
- Remove [2,4) from [1,5): i_start = bisect_right([5], 2) = 0 (first hi > 2). i_end = bisect_left([1], 4) - 1 = 1 - 1 = 0. Range [0,0]. a=1, b=5. a < lo (1<2): keep [1,2). b > hi (5>4): keep [4,5). Result: [1,2), [4,5). ✓
- Remove [2,5) from [1,5): i_start = bisect_right([5], 2) = 0. i_end = bisect_left([1], 5) - 1 = 1 - 1 = 0. a=1, b=5. a < 2: keep [1,2). b > 5? 5 > 5? No. Result: [1,2). ✓
- Remove [1,5) from [1,5): i_start = bisect_right([5], 1) = 0. i_end = bisect_left([1], 5) - 1 = 1 - 1 = 0. a=1, b=5. a < 1? No. b > 5? No. Result: []. ✓

Looks good!

Now let me think about edge cases with the total_length. If lo and hi are ints, the difference is int. If mixed, it's float. I should initialize _total as 0 (int) and let Python handle the arithmetic.

Let me also handle the `intervals()` method and `__len__`:

```python
def intervals(self):
    return list(zip(self._lo, self._hi))

def __len__(self):
    return len(self._lo)
```

And `total_length()`:
```python
def total_length(self):
    return self._total
```

Let me now put it all together and make sure I handle all edge cases:

1. Empty set operations
2. lo >= hi (ignore)
3. Adding an interval that's already fully contained
4. Removing from empty set
5. Removing an interval that doesn't exist

Let me trace through a few more cases:

Adding [2, 4) to existing [1, 3):
- i_start = bisect_left([3], 2) = 0 (3 >= 2, first index)
- i_end = bisect_right([1], 4) - 1 = 1 - 1 = 0
- Range [0,0]. new_lo = min(2,1) = 1, new_hi = max(4,3) = 4.
- Result: [1,4). ✓

Adding [2, 3) to existing [1, 5) (fully contained):
- i_start = bisect_left([5], 2) = 0
- i_end = bisect_right([1], 3) - 1 = 1 - 1 = 0
- Range [0,0]. new_lo = min(2,1) = 1, new_hi = max(3,5) = 5.
- Result: [1,5). ✓ (no change)

Adding [6, 7) to existing [1, 3), [4, 5):
- i_start = bisect_left([3, 5], 6) = 2 (no hi >= 6)
- i_end = bisect_right([1, 4], 7) - 1 = 2 - 1 = 1
- i_start (2) > i_end (1): no overlap.
- Insert at position bisect_right([1,4], 6) = 2.
- Result: [1,3), [4,5), [6,7). ✓

Removing [3, 4) from [1, 3), [4, 5):
- i_start = bisect_right([3, 5], 3) = 1 (first hi > 3, which is 5 at index 1)
- i_end = bisect_left([1, 4], 4) - 1 = 1 - 1 = 0
- i_start (1) > i_end (0): nothing to remove. ✓
  (Because [1,3) ends at 3 which is not > 3, and [4,5) starts at 4 which is not < 4)

Removing [3, 4) from [1, 5):
- i_start = bisect_right([5], 3) = 0 (first hi > 3)
- i_end = bisect_left([1], 4) - 1 = 1 - 1 = 0
- Range [0,0]. a=1, b=5. a < 3: keep [1,3). b > 4: keep [4,5).
- Result: [1,3), [4,5). ✓

Now, one concern: the performance of list.insert for 60,000 elements. Let me think about whether there's a way to make this faster.

Actually, for the specific test case (60,000 disjoint adds in random order), each add() does:
1. bisect_left on _hi (O(log n))
2. bisect_right on _lo (O(log n))  
3. Since disjoint, i_start > i_end (no overlap)
4. list.insert at position pos (O(n) memmove)

The memmove for list.insert in CPython: for a list of n elements, inserting at position k requires moving n-k elements. Each element is a pointer (8 bytes on 64-bit). The memmove is done in C.

For n going from 0 to 59,999, the average n-k where k is random is about n/2. Total bytes moved: sum_{n=0}^{59999} n/2 * 8 ≈ 8 * (60000^2)/(4) ≈ 8 * 900,000,000 = 7.2 GB.

At memory bandwidth of ~20 GB/s (achievable for sequential memmove): 7.2 / 20 ≈ 360 ms.
Plus Python overhead: 60,000 * (2 bisects + 1 insert call) ≈ 60,000 * ~1µs ≈ 60 ms.

Total: ~420 ms. Well under 5 seconds. 

But wait, I also have two lists (_lo and _hi) to insert into. That doubles the memmove: ~720 ms. Still fine.

Actually, let me reconsider. Instead of two parallel lists, I could use a single list of tuples. Then bisect would need a custom key or I'd need to compare tuples.

Using a list of tuples: `self._intervals = []` where each element is (lo, hi).
- bisect on lo: I can use `bisect.bisect_right(self._intervals, (hi,))` ... hmm, that's tricky because tuple comparison.
- Actually, I can do: `pos = bisect.bisect_right(self._intervals, (hi, float('inf')))` to find where to insert... no, that's hacky.

Better to keep two parallel lists. Or I can use a list of tuples and for bisect, create a dummy tuple for comparison.

Actually, the simplest approach: keep a list of (lo, hi) tuples. For bisect, I need to search by lo. I can do:

```python
pos = bisect.bisect_right(self._intervals, (hi_bound, float('inf')))
```

Wait, that would compare (hi_bound, inf) with (lo_i, hi_i). Tuple comparison: first compare hi_bound with lo_i, then if equal, compare inf with hi_i. So this gives the insertion point for a tuple with first element = hi_bound and second element = +infinity. Since all hi_i < +inf, this is equivalent to bisect_right on the first element. 

Hmm, but this only works if no two intervals have the same lo (which is true since they're disjoint and non-touching). So:

```python
# Find position where lo would be inserted
pos = bisect.bisect_right(self._intervals, (lo, float('inf')))
```

This finds the position after any interval with lo' <= lo. Since all lo values are unique, this is the same as the position where lo would be inserted.

But for the overlap detection, I need to search by hi values. With tuples, I can't easily bisect on the second element.

So I'll stick with two parallel lists: _lo and _hi.

Actually, wait. Let me reconsider the performance. With two lists, each insert does two memmoves. But I could also just store a list of tuples and do the search differently.

For the search by hi (finding first interval with hi >= lo):
- Since hi values are sorted, I need to binary search on them.
- With a list of tuples, I can't directly bisect on the second element.
- I could create a separate sorted list of hi values, but then I need to keep them in sync.

Let me just go with two parallel lists. It's clean and fast.

Let me write the final implementation:

```python
import bisect

class IntervalSet:
    __slots__ = ('_lo', '_hi', '_total')
    
    def __init__(self):
        self._lo = []
        self._hi = []
        self._total = 0
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        
        if not self._lo:
            self._lo.append(lo)
            self._hi.append(hi)
            self._total += hi - lo
            return
        
        # Find first interval with hi >= lo
        i_start = bisect.bisect_left(self._hi, lo)
        # Find last interval with lo <= hi  
        i_end = bisect.bisect_right(self._lo, hi) - 1
        
        if i_start > i_end:
            # No overlap, insert
            pos = bisect.bisect_right(self._lo, lo)
            self._lo.insert(pos, lo)
            self._hi.insert(pos, hi)
            self._total += hi - lo
        else:
            new_lo = min(lo, self._lo[i_start])
            new_hi = max(hi, self._hi[i_end])
            
            old_total = 0
            for i in range(i_start, i_end + 1):
                old_total += self._hi[i] - self._lo[i]
            
            self._total += (new_hi - new_lo) - old_total
            self._lo[i_start:i_end + 1] = [new_lo]
            self._hi[i_start:i_end + 1] = [new_hi]
    
    def remove(self, lo, hi):
        if lo >= hi or not self._lo:
            return
        
        # Find intervals overlapping [lo, hi): a < hi AND b > lo
        i_start = bisect.bisect_right(self._hi, lo)  # first index where hi > lo
        i_end = bisect.bisect_left(self._lo, hi) - 1  # last index where lo < hi
        
        if i_start > i_end:
            return
        
        new_los = []
        new_his = []
        old_total = 0
        for i in range(i_start, i_end + 1):
            a, b = self._lo[i], self._hi[i]
            old_total += b - a
            if a < lo:
                new_los.append(a)
                new_his.append(lo)
            if b > hi:
                new_los.append(hi)
                new_his.append(b)
        
        new_total = sum(b - a for a, b in zip(new_los, new_his))
        self._total += new_total - old_total
        self._lo[i_start:i_end + 1] = new_los
        self._hi[i_start:i_end + 1] = new_his
    
    def contains(self, x):
        if not self._lo:
            return False
        i = bisect.bisect_right(self._lo, x) - 1
        if i < 0:
            return False
        return x < self._hi[i]
    
    def total_length(self):
        return self._total
    
    def intervals(self):
        return list(zip(self._lo, self._hi))
    
    def __len__(self):
        return len(self._lo)
```

Wait, I need to double-check the remove logic. Let me trace:

Remove [2, 4) from { [1, 3), [4, 5) }:
- i_start = bisect_right([3, 5], 2) = 1 (first hi > 2: 3 is at index 0, 5 is at index 1; 3 > 2, so index 0... wait)
  
  Hmm, bisect_right([3, 5], 2): finds the rightmost position where 2 can be inserted to keep order. 2 < 3, so position 0. So i_start = 0.
  
  Wait, that doesn't seem right. Let me re-examine.
  
  bisect_right(a, x) returns the insertion point to the right of any existing entries equal to x. So for a = [3, 5] and x = 2: since 2 < 3, the insertion point is 0.
  
  So i_start = 0. That means the first interval with hi > 2 is at index 0 (hi=3 > 2). ✓
  
  i_end = bisect_left([1, 4], 4) - 1 = 1 - 1 = 0. (bisect_left finds the leftmost position where 4 can be inserted. 4 is at index 1, so bisect_left returns 1. i_end = 0.)
  
  So range is [0, 0]. Interval [1, 3). a=1 < 2: keep [1, 2). b=3 > 4? No. 
  Result: [1, 2). 
  
  But wait, should [4, 5) also be affected? [4, 5) and [2, 4): do they overlap? [4,5) starts at 4, [2,4) ends at 4. They touch but don't overlap (half-open). So [4, 5) should NOT be affected. ✓
  
  Final result: [1, 2), [4, 5). ✓

Remove [2, 5) from { [1, 5) }:
- i_start = bisect_right([5], 2) = 0 (first hi > 2: 5 > 2 at index 0)
- i_end = bisect_left([1], 5) - 1 = 1 - 1 = 0
- Range [0, 0]. [1, 5). a=1 < 2: keep [1, 2). b=5 > 5? No.
- Result: [1, 2). ✓

Remove [0, 10) from { [1, 3), [4, 5), [6, 8) }:
- i_start = bisect_right([3, 5, 8], 0) = 0 (first hi > 0: 3 > 0 at index 0)
- i_end = bisect_left([1, 4, 6], 10) - 1 = 3 - 1 = 2
- Range [0, 2]. All three intervals.
  - [1, 3): a=1 > 0? Yes (a >= lo). b=3 > 10? No. Nothing kept.
  - [4, 5): a=4 > 0? Yes. b=5 > 10? No. Nothing.
  - [6, 8): a=6 > 0? Yes. b=8 > 10? No. Nothing.
- Result: []. ✓ (all removed)

Remove [2, 6) from { [1, 3), [4, 5), [7, 8) }:
- i_start = bisect_right([3, 5, 8], 2) = 0 (first hi > 2: 3 at index 0)
- i_end = bisect_left([1, 4, 7], 6) - 1 = 2 - 1 = 1
- Range [0, 1]. Intervals [1,3) and [4,5).
  - [1, 3): a=1 < 2: keep [1, 2). b=3 > 6? No.
  - [4, 5): a=4 < 2? No (4 >= 2). b=5 > 6? No. Nothing.
- New: [1, 2). 
- Final: [1, 2), [7, 8). ✓

Looks good!

One more check on the add logic with touching:
Adding [3, 5) to { [1, 3) }:
- i_start = bisect_left([3], 3) = 0 (first hi >= 3: 3 at index 0)
- i_end = bisect_right([1], 5) - 1 = 1 - 1 = 0
- Range [0, 0]. new_lo = min(3, 1) = 1, new_hi = max(5, 3) = 5.
- Result: [1, 5). ✓

Adding [1, 3) to { [3, 5) }:
- i_start = bisect_left([5], 1) = 0 (first hi >= 1: 5 at index 0)
- i_end = bisect_right([3], 3) - 1 = 1 - 1 = 0
- Range [0, 0]. new_lo = min(1, 3) = 1, new_hi = max(3, 5) = 5.
- Result: [1, 5). ✓

Adding [5, 6) to { [1, 3), [3, 5) }: Wait, [1,3) and [3,5) should already be merged to [1,5) in our representation. So this case shouldn't arise. But let's say somehow we have [1,3) and [4,5) (non-touching).

Adding [3, 4) to { [1, 3), [4, 5) }:
- i_start = bisect_left([3, 5], 3) = 0 (first hi >= 3: 3 at index 0)
- i_end = bisect_right([1, 4], 4) - 1 = 2 - 1 = 1
- Range [0, 1]. new_lo = min(3, 1) = 1, new_hi = max(4, 5) = 5.
- Result: [1, 5). ✓ (merges both touching intervals)

Now let me think about potential issues:

1. What if lo or hi is NaN? The problem says "real numbers", so I'll assume no NaN.
2. What about infinity? float('inf') could be a valid bound. Let me make sure the logic works:
   - add(1, float('inf')): valid interval [1, ∞).
   - add(float('-inf'), 5): valid interval (-∞, 5).
   - These should work fine with the comparison logic.

3. Integer vs float: The problem says "Keep the original values (no rounding)." So if I add(1, 3) (ints), the total_length should be 2 (int). If I add(1, 3.5), it should be 2.5 (float). My code handles this naturally since Python arithmetic preserves types (int - int = int, int - float = float).

4. What about the _total starting as 0 (int)? If I add (1, 3.5), _total becomes 0 + 2.5 = 2.5 (float). Good.

Let me also consider: what if the same interval is added twice? add(1, 3) twice. First time: inserts [1,3). Second time: i_start = 0, i_end = 0. new_lo = 1, new_hi = 3. old_total = 2. new_total = 2. _total += 0. Replace [1,3) with [1,3). No change. ✓

I think the implementation is solid. Let me finalize it.

One more thought on performance: the `for i in range(i_start, i_end + 1)` loop in add() and remove(). In the worst case for the performance test (60,000 disjoint intervals), each add() has i_start > i_end (no overlap), so the loop doesn't execute. The only O(n) operation is the list.insert.

For the 200,000 contains() calls: each is O(log n) = O(log 60000) ≈ 17 comparisons. 200,000 * 17 ≈ 3.4 million operations. Fast.

I'm satisfied with this approach. Let me write the final code.

Actually, one more thought: should I use `__slots__` for performance? The class has few attributes, so it might help slightly. Let me include it.

Also, I want to make sure the `intervals()` method returns a list of tuples, not a view.

Let me finalize:
