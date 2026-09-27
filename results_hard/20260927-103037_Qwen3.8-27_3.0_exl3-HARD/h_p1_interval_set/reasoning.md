Let me design an `IntervalSet` class that stores disjoint half-open intervals [lo, hi) and supports efficient operations.

Key requirements:
1. `add(lo, hi)` - add interval, ignore if lo >= hi
2. `remove(lo, hi)` - remove interval, may split
3. `contains(x)` - O(log n)
4. `total_length()` - sum of lengths
5. `intervals()` - sorted, disjoint, merged touching intervals
6. `__len__()` - number of intervals
7. Performance: 60,000 adds of small disjoint intervals in random order + 200,000 contains must be under 5 seconds.

For O(log n) contains, I need a balanced BST or sorted structure. In Python standard library, I don't have a built-in balanced BST. But I can use `bisect` on a sorted list. However, inserting into a list is O(n), which for 60,000 inserts would be O(n²) = 3.6 billion operations... that's too slow.

Wait, let me reconsider. 60,000 adds of small disjoint intervals. If they're disjoint, each add is O(1) in terms of merging (no merging needed since they're disjoint). But inserting into a sorted list is O(n) due to the shift. So 60,000 inserts would be O(n²) = 60,000² = 3.6 × 10⁹ operations. That's way too slow.

I need a better data structure. Options:
1. Use a sorted list with bisect - O(n) per insert, O(log n) per contains. Total for 60k inserts: O(n²) which is too slow.
2. Use a skip list - O(log n) per insert and search.
3. Use a treap (randomized BST) - O(log n) per insert and search.
4. Use a sorted list but batch operations... no, the API requires individual calls.

Actually wait - let me reconsider. The problem says "60,000 add() calls of small disjoint intervals in random order". If they're all disjoint, then each add just inserts one interval. With a sorted list, each insert is O(n) for the list shift. 60,000 × 60,000/2 ≈ 1.8 billion element shifts. In Python, that's way too slow.

Let me implement a treap or skip list. A treap (tree + heap) is relatively simple to implement.

Actually, let me think about this more carefully. I'll implement a treap where each node stores (lo, hi) and the subtree size. This gives O(log n) for insert, delete, and search.

Let me design the treap:
- Each node has: lo, hi, priority (random), left, right, size
- We maintain BST property on lo (since intervals are disjoint and sorted by lo)
- We maintain heap property on priority
- For contains(x): traverse the tree. At each node, if x < lo, go left. If x >= hi, go right. Otherwise, x is in [lo, hi).

Wait, for contains with a BST keyed on lo:
- If x < node.lo, go left
- If x >= node.hi, go right
- Otherwise (node.lo <= x < node.hi), return True

This works because intervals are disjoint and sorted by lo. If x < node.lo, it can only be in a left subtree interval. If x >= node.hi, it can only be in a right subtree interval (since intervals are disjoint and sorted).

For add(lo, hi):
1. Find all intervals that overlap with [lo, hi)
2. Remove them
3. Add the merged interval [min(lo, all overlapping los), max(hi, all overlapping his))

For remove(lo, hi):
1. Find all intervals that overlap with [lo, hi)
2. For each, determine the remaining parts (left part, right part)
3. Remove the overlapping intervals
4. Add the remaining parts

Let me implement this with a treap.

Actually, let me think about whether a simpler approach works. Since we need O(log n) for contains, and 60,000 inserts, I think a treap is the way to go.

Let me code the treap:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right', 'size')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None
        self.size = 1

def _size(node):
    return node.size if node else 0

def _update(node):
    node.size = 1 + _size(node.left) + _size(node.right)

def _rotate_left(node):
    # node -> (right child becomes parent)
    r = node.right
    node.right = r.left
    r.left = node
    _update(node)
    _update(r)
    return r

def _rotate_right(node):
    l = node.left
    node.left = l.right
    l.right = node
    _update(node)
    _update(l)
    return l

def _insert(node, lo, hi):
    if node is None:
        return _Node(lo, hi)
    if lo < node.lo:
        node.left = _insert(node.left, lo, hi)
        if node.left.priority < node.priority:  # min-heap on priority
            node = _rotate_right(node)
    else:
        node.right = _insert(node.right, lo, hi)
        if node.right.priority < node.priority:
            node = _rotate_left(node)
    _update(node)
    return node
```

Wait, I should use a max-heap or min-heap. Let me use max-heap (higher priority = closer to root).

Actually, let me use a different approach. I'll use `random.random()` for priority and use a max-heap (higher priority stays at root).

Let me reconsider the structure. For the treap:
- BST key: lo (since intervals are disjoint, lo uniquely identifies position)
- Heap property: higher priority at root

For insert:
- Standard BST insert on lo
- If child has higher priority, rotate

For delete:
- Find the node
- Merge its left and right subtrees (the one with higher priority becomes root)

For search (contains):
- Standard BST search, but with the special logic for intervals

Let me also think about the add operation more carefully:

`add(lo, hi)`:
1. If lo >= hi, return
2. Find all intervals that overlap with [lo, hi). Two intervals [a,b) and [c,d) overlap if a < d and c < b.
3. Since intervals are sorted by lo, the overlapping intervals form a contiguous range in the tree.
4. Remove all overlapping intervals.
5. The new interval is [min(lo, min of overlapping los), max(hi, max of overlapping his)).
6. Also merge with touching intervals: if there's an interval ending at the new lo, merge; if there's an interval starting at the new hi, merge.

Wait, actually "touching" means [a, b) and [b, c) should be merged into [a, c). So I need to also check for intervals that touch.

Let me think about this differently. The new interval [lo, hi) should be merged with:
- Any interval [a, b) where a <= lo and b >= lo (overlaps)
- Any interval [a, b) where a <= hi and b >= hi (overlaps)
- Any interval [a, b) where b == lo (touches from left)
- Any interval [a, b) where a == hi (touches from right)

Actually, the condition for merging is: [a, b) and [c, d) should be merged if a <= d and c <= b (they overlap or touch).

So I need to find all intervals [a, b) where a <= hi and b >= lo (they overlap or touch with [lo, hi)).

Since intervals are sorted by lo and disjoint, I can:
1. Find the first interval with hi > lo (this is the first one that could overlap/touch)
2. Find the last interval with lo < hi (this is the last one that could overlap/touch)
3. All intervals in between also overlap/touch.

Wait, let me be more precise. An interval [a, b) touches or overlaps [lo, hi) if a <= hi and b >= lo.

Since intervals are sorted by lo and disjoint:
- The first interval that could touch/overlap is the one with the largest lo that is <= hi. Actually no, it's the first interval where b > lo (i.e., the interval's end is after lo's start).

Hmm, let me think again. Intervals are sorted by lo. For interval [a, b) to overlap/touch [lo, hi):
- a <= hi (the interval starts before or at hi)
- b >= lo (the interval ends after or at lo)

Since intervals are sorted by lo and disjoint:
- If a > hi, then this and all subsequent intervals don't overlap.
- If b < lo, then this interval doesn't overlap (and since it's before, all previous ones don't either... wait no, previous ones have smaller lo, so they could still have b >= lo).

Actually, since intervals are disjoint and sorted by lo:
- If b < lo, the interval is entirely before [lo, hi).
- If a > hi, the interval is entirely after [lo, hi).
- Otherwise, it overlaps or touches.

So I need to find:
- The leftmost interval with b >= lo (first potential overlap)
- The rightmost interval with a <= hi (last potential overlap)

For a treap keyed on lo, finding the rightmost with a <= hi is easy (search for hi, the predecessor). Finding the leftmost with b >= lo is trickier because b is not the key.

Alternative approach: I can use a different strategy.

Since intervals are disjoint and sorted by lo, I can:
1. Find the interval that contains lo (or the one just before lo if lo is not in any interval). Use BST search.
2. From there, walk right while intervals overlap/touch with [lo, hi).

But walking right could be O(n) in the worst case. However, for the add operation, we're removing those intervals anyway, so the total work is amortized.

Actually, for the performance requirement: 60,000 adds of small DISJOINT intervals. If they're all disjoint, each add only touches 0 or 1 existing intervals (or 0 if truly disjoint). So the "walk right" would be O(1) per add in this case. The bottleneck is the insert itself, which is O(log n) with a treap.

Let me implement this:

For `add(lo, hi)`:
1. If lo >= hi, return
2. Find the interval containing lo (or the predecessor). Let's call it `start_node`.
3. If start_node exists and start_node.hi > lo, then start_node overlaps. Also check if start_node.hi == lo (touching).
   Actually, start_node.hi >= lo means it overlaps or touches.
4. Walk right from start_node while the current interval's lo <= hi (meaning it overlaps or touches [lo, hi)).
5. Collect all such intervals, compute the merged bounds.
6. Remove all collected intervals from the tree.
7. Insert the merged interval.

For `remove(lo, hi)`:
1. If lo >= hi, return
2. Find the interval containing lo (or predecessor).
3. Walk right while intervals overlap with [lo, hi).
4. For each overlapping interval [a, b):
   - If a < lo, add [a, lo) to remaining
   - If b > hi, add [hi, b) to remaining
5. Remove all overlapping intervals.
6. Insert remaining intervals.

Let me think about the search for "the interval containing lo or the predecessor":
- In a BST keyed on lo, I search for lo.
- If I find a node with lo <= x < hi, that node contains x.
- If I go left (x < node.lo), the predecessor is the rightmost node in the left subtree.
- If I go right (x >= node.hi), the predecessor is the last node I visited that could contain x... 

Actually, let me think of it differently. I want to find the interval that contains lo, or if none, the interval immediately before lo (i.e., the one with the largest hi that is <= lo, or the one with the largest lo that is < lo).

In a BST keyed on lo:
- Search for lo.
- At each node, if lo < node.lo, go left (the answer is in the left subtree or is a previous node).
- If lo >= node.hi, go right (the answer might be further right, but node could be the predecessor).
- If node.lo <= lo < node.hi, we found the containing interval.

Let me implement a function `find_start(lo)` that returns the node whose interval contains lo, or the node immediately before lo (rightmost node with hi <= lo), or None.

Actually, I think the cleanest approach is:

```python
def _find_start(self, lo):
    """Find the node containing lo, or the rightmost node with hi <= lo."""
    node = self._root
    best = None  # best candidate (rightmost node with hi <= lo, or containing lo)
    while node:
        if lo < node.lo:
            node = node.left
        elif lo >= node.hi:
            best = node
            node = node.right
        else:
            return node  # lo is in [node.lo, node.hi)
    return best
```

Wait, this isn't quite right. If lo < node.lo, the answer could be in the left subtree. But `best` might still be valid. Let me reconsider.

Actually, I think the issue is: if lo < node.lo, I go left, but the "best" (predecessor) could be in the left subtree (the rightmost node there) or it could be a node I've already passed. Let me track it differently.

```python
def _find_start(self, lo):
    node = self._root
    best = None
    while node:
        if lo < node.lo:
            node = node.left
        elif lo >= node.hi:
            best = node
            node = node.right
        else:
            return node
    return best
```

Hmm, but if lo < node.lo and I go left, the best predecessor could be in the left subtree. But I've already set `best` to some earlier node. The left subtree might have a node with a larger hi (closer to lo). 

Wait, no. In a BST keyed on lo, if I go left from node, all nodes in the left subtree have lo < node.lo. The "best" predecessor (rightmost in terms of position) would be the rightmost node in the left subtree that has hi <= lo, or a node containing lo.

I think the correct approach is:

```python
def _find_start(self, lo):
    node = self._root
    best = None
    while node:
        if lo < node.lo:
            node = node.left
        elif lo >= node.hi:
            best = node
            node = node.right
        else:
            return node
    return best
```

Wait, I think this IS correct. Let me trace through:
- If lo < node.lo: the node and everything to its right has lo > lo (in terms of the interval's lo). The answer must be in the left subtree. We don't update best because node.lo > lo means node is after lo.
- If lo >= node.hi: node.hi <= lo, so node is a valid predecessor (it ends before or at lo). We update best = node and go right to see if there's a closer one.
- If node.lo <= lo < node.hi: we found the containing interval.

But wait, in the first case (lo < node.lo), could there be a better predecessor in the left subtree? Yes! The left subtree has nodes with lo < node.lo, and some of them might have hi > lo (containing lo) or hi closer to lo. But since we're going left, we'll find them.

But the issue is: `best` was set to some node before we went left. Could the left subtree have a better (closer) predecessor? Yes! For example, if best has hi = 5, lo = 10, and in the left subtree there's a node with hi = 9. Then the left subtree node is a better predecessor.

Hmm, so my tracking of `best` is wrong. Let me reconsider.

Actually wait. In a BST keyed on lo, if I'm at node and lo < node.lo, I go left. The nodes in the left subtree all have lo < node.lo. Among them, the one with the largest lo (rightmost) would be the best predecessor. But I need to find the one with the largest hi that is <= lo, or the one containing lo.

I think the issue is that I can't just track a single `best` as I traverse. Let me think of a different approach.

Alternative: I'll find the node where lo would be inserted (the position in the BST), and then the predecessor is the rightmost node in the left subtree of the insertion point, or the insertion point's left child's rightmost.

Actually, let me just do a standard BST search and track the predecessor properly:

```python
def _find_start(self, lo):
    """Returns the node containing lo, or the predecessor (rightmost node with hi <= lo)."""
    node = self._root
    pred = None
    while node:
        if lo < node.lo:
            node = node.left
        elif lo >= node.hi:
            pred = node
            node = node.right
        else:
            return node
    return pred
```

Wait, I think this IS correct after all. Let me think about why:

When I go left (lo < node.lo), I'm looking for the answer in the left subtree. The `pred` I've been tracking is from nodes I've already passed. But those nodes all have lo > lo (their interval starts after lo), so they can't be predecessors. Wait no, they have lo > lo, meaning their interval starts after lo. So they're AFTER lo, not before. They can't be predecessors.

When I go right (lo >= node.hi), the current node has hi <= lo, so it's a valid predecessor. I update pred. Then I go right to look for a closer one.

When I go left (lo < node.lo), the current node starts after lo, so it's not a predecessor. I go left to find the answer.

So `pred` only gets updated when I go right, and at that point the node is guaranteed to be a valid predecessor (hi <= lo). And as I go right, I find progressively closer predecessors. The final `pred` is the rightmost valid predecessor.

But wait, what about nodes in the left subtree? If I go left from node, could there be a node in the left subtree that is a better predecessor than the current `pred`? 

Let's say pred has hi = 5, and I'm at a node with lo = 10, lo = 7. I go left. In the left subtree, there might be a node with lo = 6, hi = 6.5. This has hi = 6.5 > 5, so it's a better predecessor!

But wait, can this happen? If the left subtree has a node with lo = 6, hi = 6.5, and the parent has lo = 10, that's fine in a BST (6 < 10). And 6.5 <= 7 (our search value lo). So yes, this node would be a better predecessor.

But in my algorithm, when I go left from the node with lo=10, I'll eventually find this node. When I reach it: lo(7) >= node.hi(6.5), so I'd update pred to this node and go right. 

Wait, no. Let me re-trace. Search for lo=7:
- At node with lo=10: 7 < 10, go left.
- At node with lo=6, hi=6.5: 7 >= 6.5, update pred = this node, go right.
- Right child is None, stop.
- Return pred (lo=6, hi=6.5). ✓

OK so it works! The key insight is that when I go left, I don't update pred (because the current node is after lo), and when I go right, I do update pred (because the current node is before lo). The final pred is the closest one before lo.

Great, so my `_find_start` is correct.

Now for the add operation:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    # Find the starting point
    start = self._find_start(lo)
    # Collect all intervals that overlap or touch [lo, hi)
    to_remove = []
    new_lo = lo
    new_hi = hi
    node = start
    while node:
        if node.hi > hi:  # node starts after hi, stop
            break
        # node overlaps or touches [lo, hi)
        # node.lo <= hi (guaranteed since we start from predecessor or containing)
        # node.hi >= lo (guaranteed since we started from find_start(lo))
        to_remove.append(node)
        new_lo = min(new_lo, node.lo)
        new_hi = max(new_hi, node.hi)
        node = node.right  # ??? 
```

Wait, I can't just walk right via node.right because the tree isn't a linked list. I need to find the successor in the BST.

Let me add a helper to find the successor:

```python
def _successor(self, node):
    # Find the in-order successor of node
    if node.right:
        cur = node.right
        while cur.left:
            cur = cur.left
        return cur
    # No right child, successor is an ancestor
    # Need parent pointers... 
```

Hmm, this is getting complicated without parent pointers. Let me add parent pointers to the nodes.

Actually, let me reconsider the approach. Instead of walking through the tree, I can:
1. Find the start node (containing lo or predecessor).
2. Repeatedly find the next node using BST search.

Or, I can collect the overlapping intervals by doing a range query on the BST.

Actually, let me think about this differently. Since the intervals are disjoint and sorted by lo, the overlapping intervals form a contiguous range in the sorted order. I can:
1. Find the first overlapping interval (using _find_start).
2. Find the last overlapping interval (search for hi, the predecessor of hi or the node containing hi).
3. All intervals between first and last are also overlapping.

But "between" in a BST is hard to enumerate without parent pointers.

Alternative approach: I'll use parent pointers and in-order traversal.

Or, simpler: I'll collect the intervals to remove by doing a range extraction. Let me add parent pointers.

Actually, let me step back and think about what's really needed for the performance requirement.

60,000 adds of small DISJOINT intervals in random order. If they're truly disjoint, each add:
- Finds the start (O(log n))
- Finds 0 or 1 overlapping/touching intervals (since they're disjoint, at most 1... actually 0 if truly disjoint, or 1 if they touch)
- Removes those (O(log n) each)
- Inserts the new interval (O(log n))

So each add is O(log n), total is O(n log n) for 60,000 adds. That's about 60,000 × 17 ≈ 1 million operations. Very fast.

Then 200,000 contains calls, each O(log n) ≈ 17 steps. Total ≈ 3.4 million operations. Also very fast.

So the treap approach works well. Let me implement it properly.

Let me use parent pointers for successor/predecessor operations.

```python
class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right', 'parent', 'size')
```

For the range extraction (finding all intervals in [lo, hi) that overlap/touch), I'll:
1. Find the first interval (using _find_start(lo)).
2. Walk right using in-order successor until I find an interval with lo > hi.

Let me implement successor with parent pointers:

```python
def _successor(self, node):
    if node.right:
        cur = node.right
        while cur.left:
            cur = cur.left
        return cur
    cur = node
    while cur.parent and cur is cur.parent.right:
        cur = cur.parent
    return cur.parent
```

OK let me write the full implementation now.

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right', 'parent', 'size')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None
        self.parent = None
        self.size = 1

class IntervalSet:
    def __init__(self):
        self._root = None
        self._total_len = 0.0  # Hmm, but bounds can be int or float. Let me just compute on the fly or track it.
    
    def _update(self, node):
        if node:
            node.size = 1 + (node.left.size if node.left else 0) + (node.right.size if node.right else 0)
    
    def _set_parent(self, node, parent):
        if node:
            node.parent = parent
    
    def _rotate_left(self, node):
        r = node.right
        self._set_parent(r, node.parent)
        if node.parent:
            if node.parent.left is node:
                node.parent.left = r
            else:
                node.parent.right = r
        node.right = r.left
        self._set_parent(r.left, node)
        r.left = node
        self._set_parent(node, r)
        self._update(node)
        self._update(r)
        return r
    
    def _rotate_right(self, node):
        l = node.left
        self._set_parent(l, node.parent)
        if node.parent:
            if node.parent.left is node:
                node.parent.left = l
            else:
                node.parent.right = l
        node.left = l.right
        self._set_parent(l.right, node)
        l.right = node
        self._set_parent(node, l)
        self._update(node)
        self._update(l)
        return l
    
    def _insert(self, lo, hi):
        node = self._root
        new_node = _Node(lo, hi)
        while node:
            if lo < node.lo:
                node = node.left
            else:
                node = node.right
        # Now insert new_node
        # Standard treap insert
        parent = None
        node = self._root
        while node:
            parent = node
            if lo < node.lo:
                node = node.left
            else:
                node = node.right
        new_node.parent = parent
        if parent is None:
            self._root = new_node
        elif lo < parent.lo:
            parent.left = new_node
        else:
            parent.right = new_node
        # Bubble up
        while new_node.parent and new_node.priority > new_node.parent.priority:
            if new_node is new_node.parent.left:
                self._rotate_right(new_node.parent)
            else:
                self._rotate_left(new_node.parent)
        # Update sizes on the path
        # Actually, rotations update sizes. But the path from root to new_node might need updating.
        # Let me just update from new_node up to root.
        cur = new_node
        while cur:
            self._update(cur)
            cur = cur.parent
        return new_node
    
    def _remove(self, node):
        # Remove node from the treap
        if node.left and node.right:
            # Merge left and right subtrees
            # The root of the merged tree is the one with higher priority
            if node.left.priority > node.right.priority:
                # Merge node.right into node.left
                node = self._merge(node.left, node.right)
            else:
                node = self._merge(node.right, node.left)
        elif node.left:
            node = node.left
        elif node.right:
            node = node.right
        else:
            node = None
        
        # Replace the old node with the new root of the merged subtree
        if node:
            node.parent = ... # need to handle this
        ...
    
    def _merge(self, a, b):
        """Merge two treaps where all keys in a < all keys in b."""
        if not a:
            return b
        if not b:
            return a
        if a.priority > b.priority:
            a.right = self._merge(a.right, b)
            if a.right:
                a.right.parent = a
            self._update(a)
            return a
        else:
            b.left = self._merge(a, b.left)
            if b.left:
                b.left.parent = b
            self._update(b)
            return b
```

Hmm, this is getting complex. Let me think about whether I need the `_remove` to be particularly efficient. For the add operation, I need to remove a contiguous range of nodes. I can:
1. Find the first node to remove.
2. Find the last node to remove.
3. Extract the range.

Or, I can remove nodes one by one. Since in the disjoint case, I'm removing at most 1-2 nodes per add, this is fine.

Let me simplify. I'll implement:
- `_insert(lo, hi)`: insert a new interval
- `_remove_node(node)`: remove a specific node from the treap
- `_find_start(lo)`: find the interval containing lo or predecessor
- `_successor(node)`: find in-order successor

For add:
1. Find start node.
2. Walk right collecting overlapping/touching intervals.
3. Remove them all.
4. Insert the merged interval.

For remove:
1. Find start node.
2. Walk right collecting overlapping intervals.
3. For each, compute remaining parts.
4. Remove all overlapping intervals.
5. Insert remaining parts.

Let me code this up properly now.

Actually, I realize I should be more careful about the `_remove_node` function. In a treap, removing a node involves:
1. If the node has two children, merge its left and right subtrees.
2. Replace the node with the merged subtree in its parent.

Let me code this:

```python
def _remove_node(self, node):
    """Remove node from the treap. Returns the new root."""
    # Create a dummy to simplify
    # Actually, let me handle it directly.
    
    def _replace(old, new):
        if old.parent:
            if old.parent.left is old:
                old.parent.left = new
            else:
                old.parent.right = new
        else:
            self._root = new
        if new:
            new.parent = old.parent
    
    if node.left and node.right:
        # Merge left and right
        if node.left.priority > node.right.priority:
            merged = self._merge(node.left, node.right)
        else:
            merged = self._merge(node.right, node.left)
        _replace(node, merged)
    elif node.left:
        _replace(node, node.left)
    elif node.right:
        _replace(node, node.right)
    else:
        _replace(node, None)
    
    # Update sizes from the replaced node up to root
    cur = merged if (node.left and node.right) else (node.left or node.right or None)
    # Actually, let me just update from the parent of the removed node up to root
    cur = node.parent
    while cur:
        self._update(cur)
        cur = cur.parent
```

Wait, the `_merge` function handles parent pointers. Let me make sure.

```python
def _merge(self, a, b):
    """Merge two treaps where all keys in a < all keys in b. Returns new root."""
    if not a:
        if b:
            b.parent = None
        return b
    if not b:
        a.parent = None
        return a
    if a.priority > b.priority:
        a.right = self._merge(a.right, b)
        if a.right:
            a.right.parent = a
        self._update(a)
        a.parent = None
        return a
    else:
        b.left = self._merge(a, b.left)
        if b.left:
            b.left.parent = b
        self._update(b)
        b.parent = None
        return b
```

Hmm, setting parent to None at the end of merge is wrong because the merged tree will be attached to a parent. Let me not set parent in merge, and handle it in _remove_node.

Actually, let me just not worry about parent pointers in merge, and fix them up after.

Let me restart with a cleaner design:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right', 'parent', 'size')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None
        self.parent = None
        self.size = 1

class IntervalSet:
    def __init__(self):
        self._root = None
    
    def _sz(self, node):
        return node.size if node else 0
    
    def _update(self, node):
        node.size = 1 + self._sz(node.left) + self._sz(node.right)
    
    def _merge(self, a, b):
        """Merge two treaps: all keys in a < all keys in b."""
        if not a:
            return b
        if not b:
            return a
        if a.priority > b.priority:
            a.right = self._merge(a.right, b)
            self._update(a)
            return a
        else:
            b.left = self._merge(a, b.left)
            self._update(b)
            return b
    
    def _insert(self, lo, hi):
        new_node = _Node(lo, hi)
        parent = None
        node = self._root
        while node:
            parent = node
            if lo < node.lo:
                node = node.left
            else:
                node = node.right
        new_node.parent = parent
        if parent is None:
            self._root = new_node
        elif lo < parent.lo:
            parent.left = new_node
        else:
            parent.right = new_node
        # Bubble up
        while new_node.parent and new_node.priority > new_node.parent.priority:
            if new_node is new_node.parent.left:
                self._rotate_right(new_node.parent)
            else:
                self._rotate_left(new_node.parent)
        # Update sizes from new_node up to root
        cur = new_node
        while cur:
            self._update(cur)
            cur = cur.parent
    
    def _rotate_left(self, node):
        r = node.right
        r.parent = node.parent
        if node.parent:
            if node.parent.left is node:
                node.parent.left = r
            else:
                node.parent.right = r
        node.right = r.left
        if r.left:
            r.left.parent = node
        r.left = node
        node.parent = r
        self._update(node)
        self._update(r)
    
    def _rotate_right(self, node):
        l = node.left
        l.parent = node.parent
        if node.parent:
            if node.parent.left is node:
                node.parent.left = l
            else:
                node.parent.right = l
        node.left = l.right
        if l.right:
            l.right.parent = node
        l.right = node
        node.parent = l
        self._update(node)
        self._update(l)
    
    def _remove_node(self, node):
        # Detach node and merge its subtrees
        merged = self._merge(node.left, node.right)
        # Fix parent pointers in merged tree
        self._fix_parents(merged)
        # Replace node with merged in its parent
        if node.parent:
            if node.parent.left is node:
                node.parent.left = merged
            else:
                node.parent.right = merged
        else:
            self._root = merged
        if merged:
            merged.parent = node.parent
        # Update sizes
        cur = node.parent
        while cur:
            self._update(cur)
            cur = cur.parent
    
    def _fix_parents(self, node):
        if not node:
            return
        self._fix_parents(node.left)
        self._fix_parents(node.right)
        if node.left:
            node.left.parent = node
        if node.right:
            node.right.parent = node
```

Hmm, `_fix_parents` is O(n) which is bad. Let me handle parent pointers in `_merge` directly.

```python
def _merge(self, a, b):
    if not a:
        return b
    if not b:
        return a
    if a.priority > b.priority:
        a.right = self._merge(a.right, b)
        if a.right:
            a.right.parent = a
        self._update(a)
        return a
    else:
        b.left = self._merge(a, b.left)
        if b.left:
            b.left.parent = b
        self._update(b)
        return b
```

And in `_remove_node`:
```python
def _remove_node(self, node):
    merged = self._merge(node.left, node.right)
    if node.parent:
        if node.parent.left is node:
            node.parent.left = merged
        else:
            node.parent.right = merged
    else:
        self._root = merged
    if merged:
        merged.parent = node.parent
    node.parent = None
    node.left = None
    node.right = None
    # Update sizes from parent up
    cur = node.parent
    while cur:
        self._update(cur)
        cur = cur.parent
```

Wait, but `_merge` already sets parent pointers for the children it modifies. The root of the merged tree will have its parent set by the line `merged.parent = node.parent`. And all internal parent pointers are set during the merge. I think this is correct.

Let me also implement `_successor`:

```python
def _successor(self, node):
    if node.right:
        cur = node.right
        while cur.left:
            cur = cur.left
        return cur
    cur = node
    while cur.parent and cur is cur.parent.right:
        cur = cur.parent
    return cur.parent
```

And `_find_start`:

```python
def _find_start(self, lo):
    node = self._root
    pred = None
    while node:
        if lo < node.lo:
            node = node.left
        elif lo >= node.hi:
            pred = node
            node = node.right
        else:
            return node
    return pred
```

Now for `add(lo, hi)`:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    start = self._find_start(lo)
    # Collect overlapping/touching intervals
    to_remove = []
    new_lo = lo
    new_hi = hi
    node = start
    while node:
        if node.lo > hi:
            break
        # node overlaps or touches [lo, hi)
        # (node.lo <= hi and node.hi >= lo)
        to_remove.append(node)
        if node.lo < new_lo:
            new_lo = node.lo
        if node.hi > new_hi:
            new_hi = node.hi
        node = self._successor(node)
    # Remove all
    for n in to_remove:
        self._remove_node(n)
    # Insert merged
    self._insert(new_lo, new_hi)
```

Wait, there's a problem. When I call `_successor(node)` after I've already started removing nodes, the tree structure changes. I should collect the nodes first, then remove them.

Actually, I'm collecting them first (in the while loop), then removing them. But the `_successor` calls happen during the collection phase, before any removals. So that's fine.

But wait, there's another issue. After I collect the nodes, I remove them one by one. The `_successor` was called during collection, so it's fine. But after removing the first node, the tree changes, and removing the second node... the second node is still in the tree (it wasn't the one removed), so `_remove_node` should still work correctly because it uses parent pointers.

Actually, I need to be careful. When I remove node A, and node B is a successor of A, B's parent might change due to the merge. But B is still in the tree, and its parent pointer should be correct after the merge. So when I call `_remove_node(B)`, it should work.

Let me verify: `_remove_node(B)` uses `B.parent` to find where to attach the merged subtree. After removing A, B's parent should have been updated correctly by the merge. So yes, it should work.

OK, for `remove(lo, hi)`:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    start = self._find_start(lo)
    to_remove = []
    remaining = []
    node = start
    while node:
        if node.lo > hi:
            break
        # node overlaps [lo, hi)
        # node.lo < hi and node.hi > lo
        to_remove.append(node)
        if node.lo < lo:
            remaining.append((node.lo, lo))
        if node.hi > hi:
            remaining.append((hi, node.hi))
        node = self._successor(node)
    for n in to_remove:
        self._remove_node(n)
    for rlo, rhi in remaining:
        if rlo < rhi:
            self._insert(rlo, rhi)
```

Wait, I need to be more careful. The condition for overlap is: node.lo < hi AND node.hi > lo. Since I start from `_find_start(lo)`, the first node has node.hi >= lo (either it contains lo or it's the predecessor with hi <= lo). If it's the predecessor with hi <= lo, then node.hi <= lo, which means node.hi <= lo < hi, so node.hi < hi. But node.lo < node.hi <= lo < hi, so node.lo < hi. So the condition node.lo < hi is satisfied. But node.hi > lo might not be (if node.hi == lo, it's touching, not overlapping).

Hmm wait, for `remove`, I only want to remove parts that actually overlap with [lo, hi). If node.hi == lo, the interval [node.lo, node.hi) = [node.lo, lo) doesn't overlap with [lo, hi). So I should skip it.

Let me fix the condition:

```python
while node:
    if node.lo >= hi:
        break
    if node.hi <= lo:
        # No overlap, but since we started from find_start(lo), this shouldn't happen
        # unless the predecessor has hi == lo (touching, not overlapping)
        node = self._successor(node)
        continue
    # Overlap: node.lo < hi and node.hi > lo
    to_remove.append(node)
    if node.lo < lo:
        remaining.append((node.lo, lo))
    if node.hi > hi:
        remaining.append((hi, node.hi))
    node = self._successor(node)
```

Actually, if node.hi == lo, it's touching but not overlapping. For remove, we don't want to touch such intervals. So the condition should be: node.hi > lo (strictly greater) for overlap.

Let me reconsider. For `remove(lo, hi)`:
- An interval [a, b) overlaps with [lo, hi) if a < hi and b > lo.
- If b == lo, no overlap (the interval ends exactly where the removal starts).
- If a == hi, no overlap (the interval starts exactly where the removal ends).

So the condition is: node.lo < hi AND node.hi > lo.

In my loop:
- I start from `_find_start(lo)`. If it returns a node containing lo, then node.lo <= lo < node.hi, so node.hi > lo ✓ and node.lo <= lo < hi, so node.lo < hi ✓. Overlap confirmed.
- If it returns a predecessor (node.hi <= lo), then node.hi <= lo, so node.hi > lo is FALSE. No overlap. I should skip it.
- For subsequent nodes (successors), node.lo is increasing. I stop when node.lo >= hi.

So the correct logic:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    start = self._find_start(lo)
    to_remove = []
    remaining = []
    node = start
    while node:
        if node.lo >= hi:
            break
        if node.hi > lo:  # actual overlap
            to_remove.append(node)
            if node.lo < lo:
                remaining.append((node.lo, lo))
            if node.hi > hi:
                remaining.append((hi, node.hi))
        node = self._successor(node)
    for n in to_remove:
        self._remove_node(n)
    for rlo, rhi in remaining:
        if rlo < rhi:
            self._insert(rlo, rhi)
```

This looks correct.

For `contains(x)`:
```python
def contains(self, x):
    node = self._root
    while node:
        if x < node.lo:
            node = node.left
        elif x >= node.hi:
            node = node.right
        else:
            return True
    return False
```

This is O(log n). ✓

For `total_length()`:
```python
def total_length(self):
    total = 0
    node = self._root
    stack = []
    while node or stack:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        total += node.hi - node.lo
        node = node.right
    return total
```

Or I could maintain a running total. But since we modify the tree, let me just compute it each time. For the performance requirement, total_length() isn't in the hot path, so O(n) is fine.

Actually wait, I could maintain `_total_len` as an attribute and update it on add/remove. Let me do that for efficiency.

For `intervals()`:
```python
def intervals(self):
    result = []
    node = self._root
    stack = []
    while node or stack:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        result.append((node.lo, node.hi))
        node = node.right
    return result
```

Since the tree maintains disjoint, sorted intervals, and we merge touching intervals on add, this should already be in the correct form.

For `__len__()`:
```python
def __len__(self):
    return self._sz(self._root)
```

Now let me also think about edge cases:
- Adding an interval that's already fully contained: [1,5) already exists, add [2,3). The overlapping interval is [1,5), merged result is [1,5). Correct.
- Adding an interval that fully contains an existing one: [2,3) exists, add [1,5). Overlapping: [2,3). Merged: [1,5). Correct.
- Removing part of an interval: [1,5) exists, remove [2,3). Remaining: [1,2) and [3,5). Correct.
- Removing the entire interval: [1,5) exists, remove [1,5). Remaining: nothing. Correct.
- Removing a non-existent range: [1,5) exists, remove [6,7). No overlap. Nothing happens. Correct.

Let me also handle the case where `lo` and `hi` are of different types (int and float). Python handles this naturally with comparisons.

One more thing: the `_find_start` function. Let me double-check with an example.

Tree: [1,3), [5,7), [10,12)
Search for lo = 4:
- Root: [5,7). 4 < 5, go left.
- Left: [1,3). 4 >= 3, pred = [1,3), go right.
- Right: None.
- Return pred = [1,3). ✓ (4 is not in any interval, predecessor is [1,3))

Search for lo = 2:
- Root: [5,7). 2 < 5, go left.
- Left: [1,3). 2 >= 1 and 2 < 3, return [1,3). ✓ (2 is in [1,3))

Search for lo = 6:
- Root: [5,7). 6 >= 5 and 6 < 7, return [5,7). ✓

Search for lo = 8:
- Root: [5,7). 8 >= 7, pred = [5,7), go right.
- Right: [10,12). 8 < 10, go left.
- Left: None.
- Return pred = [5,7). ✓

Great, looks correct.

Now let me also think about the `_successor` function. After I remove a node, can I still call `_successor` on another node? Yes, because I'm collecting all nodes first, then removing them. The `_successor` calls happen before any removals.

Wait, actually I realize there might be an issue. When I collect nodes in the while loop, I call `_successor(node)` to get the next node. But what if the successor is one of the nodes I'm about to remove? That's fine, I'm just collecting them.

But what if the successor relationship changes? No, I'm not modifying the tree during collection. The tree is static during the collection phase.

OK, I think the design is solid. Let me write the final code.

One more consideration: the `_insert` function. I'm doing a standard BST insert followed by rotations. Let me make sure the size updates are correct.

After insert and rotations, I update sizes from the new node up to the root. But rotations already update sizes of the nodes involved. So the path from new_node to root (after rotations) needs updating. Let me just walk up from new_node (after rotations, new_node might have moved) and update all ancestors.

Actually, after the bubble-up loop, new_node might be at a different position. Let me just update from new_node to root:

```python
cur = new_node
while cur:
    self._update(cur)
    cur = cur.parent
```

This should work because rotations have already updated the local sizes, and we're just making sure the path to root is correct.

Wait, actually, rotations update the sizes of the two nodes involved. But what about ancestors above the rotation? They might have stale sizes. So walking up from new_node to root and updating all is the safe approach.

Let me finalize the code. I'll also add `__slots__` to `_Node` for memory efficiency (important for 60,000 nodes).

Let me also think about whether I need to handle the case where `lo` and `hi` are the same type or different types. In Python, `1 < 1.5` works fine, and `1 - 0.5 = 0.5`. So no special handling needed.

Let me write the final version:

```python
import random


class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right', 'parent', 'size')
    
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None
        self.parent = None
        self.size = 1


class IntervalSet:
    def __init__(self):
        self._root = None
    
    def _sz(self, node):
        return node.size if node else 0
    
    def _update(self, node):
        node.size = 1 + self._sz(node.left) + self._sz(node.right)
    
    def _merge(self, a, b):
        if not a:
            return b
        if not b:
            return a
        if a.priority > b.priority:
            a.right = self._merge(a.right, b)
            if a.right:
                a.right.parent = a
            self._update(a)
            return a
        else:
            b.left = self._merge(a, b.left)
            if b.left:
                b.left.parent = b
            self._update(b)
            return b
    
    def _rotate_left(self, node):
        r = node.right
        r.parent = node.parent
        if node.parent:
            if node.parent.left is node:
                node.parent.left = r
            else:
                node.parent.right = r
        node.right = r.left
        if r.left:
            r.left.parent = node
        r.left = node
        node.parent = r
        self._update(node)
        self._update(r)
    
    def _rotate_right(self, node):
        l = node.left
        l.parent = node.parent
        if node.parent:
            if node.parent.left is node:
                node.parent.left = l
            else:
                node.parent.right = l
        node.left = l.right
        if l.right:
            l.right.parent = node
        l.right = node
        node.parent = l
        self._update(node)
        self._update(l)
    
    def _insert(self, lo, hi):
        new_node = _Node(lo, hi)
        parent = None
        node = self._root
        while node:
            parent = node
            if lo < node.lo:
                node = node.left
            else:
                node = node.right
        new_node.parent = parent
        if parent is None:
            self._root = new_node
        elif lo < parent.lo:
            parent.left = new_node
        else:
            parent.right = new_node
        # Bubble up
        while new_node.parent and new_node.priority > new_node.parent.priority:
            if new_node is new_node.parent.left:
                self._rotate_right(new_node.parent)
            else:
                self._rotate_left(new_node.parent)
        # Update sizes
        cur = new_node
        while cur:
            self._update(cur)
            cur = cur.parent
    
    def _remove_node(self, node):
        merged = self._merge(node.left, node.right)
        if node.parent:
            if node.parent.left is node:
                node.parent.left = merged
            else:
                node.parent.right = merged
        else:
            self._root = merged
        if merged:
            merged.parent = node.parent
        node.parent = None
        node.left = None
        node.right = None
        # Update sizes from parent up
        cur = node.parent
        while cur:
            self._update(cur)
            cur = cur.parent
    
    def _successor(self, node):
        if node.right:
            cur = node.right
            while cur.left:
                cur = cur.left
            return cur
        cur = node
        while cur.parent and cur is cur.parent.right:
            cur = cur.parent
        return cur.parent
    
    def _find_start(self, lo):
        node = self._root
        pred = None
        while node:
            if lo < node.lo:
                node = node.left
            elif lo >= node.hi:
                pred = node
                node = node.right
            else:
                return node
        return pred
    
    def add(self, lo, hi):
        if lo >= hi:
            return
        start = self._find_start(lo)
        to_remove = []
        new_lo = lo
        new_hi = hi
        node = start
        while node:
            if node.lo > hi:
                break
            # node overlaps or touches [lo, hi)
            to_remove.append(node)
            if node.lo < new_lo:
                new_lo = node.lo
            if node.hi > new_hi:
                new_hi = node.hi
            node = self._successor(node)
        for n in to_remove:
            self._remove_node(n)
        self._insert(new_lo, new_hi)
    
    def remove(self, lo, hi):
        if lo >= hi:
            return
        start = self._find_start(lo)
        to_remove = []
        remaining = []
        node = start
        while node:
            if node.lo >= hi:
                break
            if node.hi > lo:
                to_remove.append(node)
                if node.lo < lo:
                    remaining.append((node.lo, lo))
                if node.hi > hi:
                    remaining.append((hi, node.hi))
            node = self._successor(node)
        for n in to_remove:
            self._remove_node(n)
        for rlo, rhi in remaining:
            if rlo < rhi:
                self._insert(rlo, rhi)
    
    def contains(self, x):
        node = self._root
        while node:
            if x < node.lo:
                node = node.left
            elif x >= node.hi:
                node = node.right
            else:
                return True
        return False
    
    def total_length(self):
        total = 0
        stack = []
        node = self._root
        while node or stack:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            total += node.hi - node.lo
            node = node.right
        return total
    
    def intervals(self):
        result = []
        stack = []
        node = self._root
        while node or stack:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            result.append((node.lo, node.hi))
            node = node.right
        return result
    
    def __len__(self):
        return self._sz(self._root)
```

Wait, I need to double-check the `add` logic. When I find `start` via `_find_start(lo)`:
- If start is a node containing lo: start.lo <= lo < start.hi. So start overlaps [lo, hi).
- If start is a predecessor: start.hi <= lo. If start.hi == lo, it touches. If start.hi < lo, it doesn't overlap or touch.

In the `add` case, I want to merge touching intervals too. So if start.hi == lo, I should include it. My condition is `node.lo > hi` to stop. Let me check:
- If start.hi == lo: start.lo < start.hi == lo < hi (assuming lo < hi). So start.lo < hi, we don't break. We include it. ✓
- If start.hi < lo: start.lo < start.hi < lo < hi. So start.lo < hi, we don't break. We include it. But it doesn't overlap or touch! 

Hmm, that's a problem. If start.hi < lo, the interval is entirely before [lo, hi). We shouldn't merge it.

Wait, but can this happen? `_find_start(lo)` returns the predecessor, which has hi <= lo. If hi < lo, the interval is before [lo, hi). We shouldn't include it.

Let me fix the condition. In the `add` loop, I should only include nodes where node.hi > lo (they overlap or touch) OR node.hi == lo (they touch). Actually, for add, I want to merge if node.hi >= lo (overlap or touch) AND node.lo <= hi (overlap or touch).

Since I start from `_find_start(lo)`:
- If it's a containing node: node.lo <= lo < node.hi. So node.hi > lo ✓ and node.lo <= lo < hi, so node.lo < hi ✓.
- If it's a predecessor: node.hi <= lo. If node.hi == lo, it touches. If node.hi < lo, it doesn't.

So I need: `node.hi >= lo` (for the first node) AND `node.lo <= hi` (for all nodes).

Actually, for all subsequent nodes (successors), node.lo is increasing. The condition to continue is `node.lo <= hi` (the node starts before or at hi, so it overlaps or touches). And since we started from a node with node.hi >= lo, all subsequent nodes also have node.hi > node.lo >= ... hmm, this is getting complicated.

Let me think more carefully. The intervals are disjoint and sorted. If I have a node with node.lo <= hi, and the previous node had node.hi >= lo, then this node also has node.hi > node.lo >= ... 

Actually, since intervals are disjoint and sorted by lo:
- If node_i.lo <= hi and node_{i-1}.hi >= lo, then node_i.hi > node_i.lo >= node_{i-1}.hi >= lo. Wait, that's not right. node_i.lo >= node_{i-1}.hi (disjoint), so node_i.lo >= node_{i-1}.hi >= lo. And node_i.lo <= hi. So node_i.lo is in [lo, hi]. And node_i.hi > node_i.lo >= lo. So node_i overlaps [lo, hi). ✓

So the condition for the first node is: node.hi >= lo (it overlaps or touches).
The condition for subsequent nodes is: node.lo <= hi (it overlaps or touches, given the previous one did).

Let me restructure:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    start = self._find_start(lo)
    to_remove = []
    new_lo = lo
    new_hi = hi
    node = start
    # Check if start overlaps or touches
    if node and node.hi >= lo:
        while node:
            if node.lo > hi:
                break
            to_remove.append(node)
            if node.lo < new_lo:
                new_lo = node.lo
            if node.hi > new_hi:
                new_hi = node.hi
            node = self._successor(node)
    elif node:
        # start is a predecessor with hi < lo, no overlap
        # Check if the successor overlaps
        node = self._successor(node)
        while node:
            if node.lo > hi:
                break
            to_remove.append(node)
            if node.lo < new_lo:
                new_lo = node.lo
            if node.hi > new_hi:
                new_hi = node.hi
            node = self._successor(node)
    for n in to_remove:
        self._remove_node(n)
    self._insert(new_lo, new_hi)
```

Hmm, this is getting complicated. Let me simplify.

Actually, I realize the issue is simpler than I thought. Let me reconsider.

`_find_start(lo)` returns:
- A node containing lo (node.lo <= lo < node.hi), OR
- The predecessor (rightmost node with hi <= lo), OR
- None.

If it's a containing node: node.hi > lo. The node overlaps [lo, hi).
If it's a predecessor: node.hi <= lo. 
  - If node.hi == lo: touches [lo, hi). Should merge.
  - If node.hi < lo: doesn't touch. Should NOT merge.

So the condition for the first node is: `node is not None and node.hi >= lo`.

Wait, but if node.hi == lo, then node.lo < node.hi == lo < hi. So node.lo < hi. The condition `node.lo > hi` is false, so we'd include it. Good.

If node.hi < lo, then node.lo < node.hi < lo < hi. So node.lo < hi. The condition `node.lo > hi` is false, so we'd include it. BAD!

So I need an additional check. Let me just add a condition:

```python
node = start
while node:
    if node.lo > hi or node.hi < lo:
        # No overlap
        # But wait, if node.hi < lo, we should check the successor
        # Actually, if node.hi < lo, the successor might have lo < hi
        break  # Hmm, but the successor might overlap!
```

No wait, if node.hi < lo, the successor has lo >= node.hi... no, the successor has lo > node.lo (it's the next in sorted order). But the successor's lo could be < hi.

Ugh, let me think about this differently.

The intervals that overlap or touch [lo, hi) are those with:
- node.lo <= hi (starts before or at hi)
- node.hi >= lo (ends after or at lo)

Since intervals are sorted by lo and disjoint:
- The first such interval is the one with the largest lo that is <= hi, BUT also has hi >= lo.
- Actually, it's simpler: the first interval with hi >= lo (in sorted order).

Since intervals are sorted by lo and disjoint, if an interval has hi < lo, all previous intervals also have hi < lo (because they end before this one starts, which is before lo). So the first interval with hi >= lo is the first one that matters.

So I can:
1. Find the first interval with hi >= lo.
2. From there, walk right while node.lo <= hi.

For step 1, I can use `_find_start(lo)`:
- If it returns a containing node, that node has hi > lo. ✓
- If it returns a predecessor with hi == lo, that's the first with hi >= lo. ✓
- If it returns a predecessor with hi < lo, I need the successor. The successor is the first interval after the predecessor, and since the predecessor has hi < lo, the successor has lo >= predecessor.hi. If successor.lo <= hi, it might overlap.

So:
```python
start = self._find_start(lo)
if start is not None and start.hi < lo:
    start = self._successor(start)
# Now start is the first interval with hi >= lo, or None
node = start
while node:
    if node.lo > hi:
        break
    # node.lo <= hi and node.hi >= lo (guaranteed by construction)
    to_remove.append(node)
    ...
    node = self._successor(node)
```

Wait, is `node.hi >= lo` guaranteed? 
- If start is a containing node: start.hi > lo. ✓
- If start is a predecessor with hi == lo: start.hi == lo. ✓
- If start is the successor of a predecessor with hi < lo: start.lo >= predecessor.hi. But is start.hi >= lo? start.hi > start.lo >= predecessor.hi. But predecessor.hi < lo. So start.lo >= predecessor.hi < lo. We don't know if start.hi >= lo or not.

Hmm, actually since intervals are disjoint and sorted, start.lo >= predecessor.hi. And predecessor.hi < lo. So start.lo could be < lo or >= lo.

If start.lo < lo: then start.hi > start.lo. Is start.hi >= lo? Not necessarily. start could be [0, 0.5) and lo = 1. Then start.hi = 0.5 < 1 = lo.

Wait, but if start.lo < lo and start.hi < lo, then start is entirely before [lo, hi). We shouldn't include it.

So I need: `node.hi >= lo` as a condition.

Let me just add that check:

```python
node = start
while node:
    if node.lo > hi:
        break
    if node.hi < lo:
        # This interval is entirely before [lo, hi)
        # But can this happen? If start was set correctly, no.
        # But if start is the successor of a predecessor with hi < lo, 
        # and that successor also has hi < lo, then yes.
        node = self._successor(node)
        continue
    # node.lo <= hi and node.hi >= lo
    to_remove.append(node)
    if node.lo < new_lo:
        new_lo = node.lo
    if node.hi > new_hi:
        new_hi = node.hi
    node = self._successor(node)
```

Actually, can there be multiple intervals with hi < lo before we find one with hi >= lo? Yes! For example, intervals [0,1), [1,2), [2,3) and lo = 5. All have hi < 5. We'd walk through all of them.

But wait, `_find_start(5)` would return the predecessor, which is [2,3) (hi=3 < 5). Then successor is None. So we'd just check [2,3), see hi < lo, skip it, and then successor is None, loop ends. Fine.

But what about `_find_start(2.5)`? It would go: root... let's say the tree has [0,1), [1,2), [2,3). Search for 2.5:
- [2,3): 2.5 >= 2 and 2.5 < 3. Return [2,3). ✓ (containing)

What about `_find_start(3)`? 
- [2,3): 3 >= 3, pred = [2,3), go right.
- Right: None.
- Return pred = [2,3). (hi = 3, lo = 3, so hi == lo. Touching.)

OK so in the `add` case with lo=3, hi=5:
- start = [2,3). start.hi = 3 >= lo = 3. ✓
- Check: node.lo = 2 <= hi = 5. ✓. Include [2,3).
- Successor: None. Stop.
- new_lo = min(3, 2) = 2, new_hi = max(5, 3) = 5.
- Remove [2,3), insert [2,5). ✓

What about add(4, 5) when we have [0,1), [1,2), [2,3)?
- start = _find_start(4). 
  - [2,3): 4 >= 3, pred = [2,3), go right.
  - Right: None.
  - Return [2,3).
- start.hi = 3 < lo = 4. So we go to successor.
- successor([2,3)) = None.
- Loop doesn't execute.
- to_remove is empty.
- Insert [4,5). ✓

What about add(1.5, 2.5) when we have [0,1), [1,2), [2,3)?
- start = _find_start(1.5).
  - Let's say root is [1,2). 1.5 >= 1 and 1.5 < 2. Return [1,2).
- start.hi = 2 >= lo = 1.5. ✓
- node = [1,2). node.lo = 1 <= hi = 2.5. ✓. Include.
  - new_lo = min(1.5, 1) = 1, new_hi = max(2.5, 2) = 2.5.
- successor([1,2)) = [2,3). node.lo = 2 <= 2.5. ✓. Include.
  - new_lo = min(1, 2) = 1, new_hi = max(2.5, 3) = 3.
- successor([2,3)) = None. Stop.
- Remove [1,2) and [2,3). Insert [1, 3). ✓

Looks good!

Now let me also verify the `remove` case.

remove(1.5, 2.5) when we have [0,1), [1,2), [2,3)?
- start = _find_start(1.5) = [1,2).
- node = [1,2). node.lo = 1 < hi = 2.5. node.hi = 2 > lo = 1.5. Overlap!
  - node.lo = 1 < lo = 1.5. remaining: (1, 1.5).
  - node.hi = 2 < hi = 2.5. No right remaining.
- successor = [2,3). node.lo = 2 < 2.5. node.hi = 3 > 1.5. Overlap!
  - node.lo = 2 >= lo = 1.5. No left remaining.
  - node.hi = 3 > hi = 2.5. remaining: (2.5, 3).
- successor = None. Stop.
- Remove [1,2) and [2,3). Insert (1, 1.5) and (2.5, 3).
- Result: [0,1), [1, 1.5), [2.5, 3). ✓

remove(0.5, 2.5) when we have [0,1), [1,2), [2,3)?
- start = _find_start(0.5) = [0,1).
- node = [0,1). node.lo = 0 < 2.5. node.hi = 1 > 0.5. Overlap!
  - node.lo = 0 < 0.5. remaining: (0, 0.5).
  - node.hi = 1 < 2.5. No right.
- successor = [1,2). node.lo = 1 < 2.5. node.hi = 2 > 0.5. Overlap!
  - node.lo = 1 >= 0.5. No left.
  - node.hi = 2 < 2.5. No right.
- successor = [2,3). node.lo = 2 < 2.5. node.hi = 3 > 0.5. Overlap!
  - node.lo = 2 >= 0.5. No left.
  - node.hi = 3 > 2.5. remaining: (2.5, 3).
- successor = None. Stop.
- Remove all three. Insert (0, 0.5) and (2.5, 3).
- Result: [0, 0.5), [2.5, 3). ✓

Great, the logic works.

Now let me also think about potential issues with the `_successor` function after removals. In the `add` and `remove` methods, I collect all nodes first, then remove them. The `_successor` calls happen during collection, before any removals. So the tree is stable during collection. ✓

One more thing: in the `add` method, after I remove all the overlapping nodes and insert the new merged node, the tree should be valid. The merged node's lo is <= all removed nodes' lo, and its hi is >= all removed nodes' hi. Since the removed nodes were contiguous in the sorted order, the new node fills their gap. ✓

Let me also make sure the `_merge` function handles parent pointers correctly. When I call `_merge(node.left, node.right)`, the returned tree's root will have parent set to `node.parent` (in `_remove_node`). The internal parent pointers are set during the merge. Let me trace through:

```python
def _merge(self, a, b):
    if not a:
        return b
    if not b:
        return a
    if a.priority > b.priority:
        a.right = self._merge(a.right, b)
        if a.right:
            a.right.parent = a
        self._update(a)
        return a
    else:
        b.left = self._merge(a, b.left)
        if b.left:
            b.left.parent = b
        self._update(b)
        return b
```

When we return `a`, its left child's parent is still `a` (unchanged). Its right child's parent is set to `a`. The root `a`'s parent will be set by the caller. ✓

When we return `b`, its right child's parent is still `b` (unchanged). Its left child's parent is set to `b`. The root `b`'s parent will be set by the caller. ✓

I think this is correct.

Let me also consider: what if `node.left` or `node.right` is None? Then `_merge(None, something)` returns `something`, and its parent will be set by the caller. ✓

OK, I'm fairly confident the implementation is correct. Let me write the final clean version.

Actually, one more thought: the performance requirement says "60,000 add() calls of small disjoint intervals in random order". If they're truly disjoint (no overlap, no touching), then each add:
1. `_find_start(lo)`: O(log n)
2. Check if start overlaps: O(1)
3. If no overlap: just insert. O(log n).
4. Total per add: O(log n).
5. Total for 60,000: O(n log n) ≈ 60,000 × 17 ≈ 1,020,000 operations.

Then 200,000 contains: O(log n) each ≈ 200,000 × 17 ≈ 3,400,000 operations.

Total: ~4.4 million operations. In Python, this should be well under 5 seconds. ✓

Let me finalize the code. I'll also add a `__repr__` for debugging (optional, but nice).

Actually, the problem says "No tests, no example usage, no input(), no printing." So I'll just provide the class.

Let me write the final version now.
