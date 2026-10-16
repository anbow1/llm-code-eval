Let me think about this carefully.

I need to implement an `IntervalSet` class that stores disjoint half-open intervals [lo, hi).

Key requirements:
1. `add(lo, hi)` - add an interval, ignore if lo >= hi
2. `remove(lo, hi)` - remove an interval, may split
3. `contains(x)` -> bool - O(log n)
4. `total_length()` -> number
5. `intervals()` -> list of (lo, hi) tuples, sorted, disjoint, merged
6. `__len__()` - number of intervals
7. Bounds can be ints or floats, keep original values

Performance: 60,000 add() calls + 200,000 contains() calls must be under 5 seconds.

For O(log n) contains(), I need a balanced tree or sorted structure. Since Python doesn't have a built-in balanced BST, I have options:
- Use a sorted list with bisect - but insertion is O(n) which is bad for 60,000 adds
- Use a B-tree or skip list
- Use `sortedcontainers` - but that's not standard library
- Implement a simple balanced BST (AVL or Red-Black tree)
- Use a sorted list but with a different approach

Wait, let me reconsider. 60,000 add() calls where intervals are small and disjoint in random order. If I use a sorted list:
- Each add is O(n) for insertion
- 60,000 * 60,000 = 3.6 billion operations - way too slow

I need a better data structure. Let me think about what's available in standard library.

Options:
1. Implement a Treap (randomized BST) - O(log n) expected for all operations
2. Implement an AVL tree
3. Use a sorted list with bisect - O(n) for insertion, too slow

Let me go with a Treap or a simple balanced BST. Actually, let me think about what operations I need:

For `add(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- Merge them with [lo, hi)
- The result is a single interval [min_lo, max_hi) where min_lo is the min of lo and all overlapping intervals' lo, and max_hi is the max of hi and all overlapping intervals' hi

For `remove(lo, hi)`:
- Find all intervals that overlap with [lo, hi)
- For each overlapping interval, split it: if the interval is [a, b) and we remove [lo, hi):
  - If a < lo, add [a, lo)
  - If b > hi, add [hi, b)
  - Remove the original interval

For `contains(x)`:
- Find the interval containing x using binary search - O(log n)

For `intervals()`:
- Traverse the tree in order

Let me implement a Treap. Each node has:
- key: the `lo` value of the interval
- value: the `hi` value of the interval
- priority: random for treap
- left, right children

Actually, for the tree, I'll key by `lo`. Each node stores (lo, hi).

For `contains(x)`:
- I need to find if there's an interval [lo, hi) where lo <= x < hi
- In a BST keyed by lo, I can't simply do a binary search. I need to find the predecessor (largest lo <= x) and check if x < hi.
- Actually, I can do: find the node with the largest lo <= x, then check if x < hi. If no such node exists, x is not in the set.

Wait, that's not quite right. I need to find the interval that could contain x. The interval [lo, hi) contains x if lo <= x < hi. In a BST keyed by lo, the candidate is the node with the largest lo <= x. But I also need to check: is there a node with lo <= x whose hi > x?

Actually, in a BST keyed by lo, the node with the largest lo <= x is the only candidate. Because if any interval contains x, its lo must be <= x, and the one with the largest lo <= x is the one that could contain x (since intervals are disjoint, at most one interval can contain x).

Wait, that's not quite right either. Consider intervals [1, 5) and [2, 3). These overlap, so they shouldn't be in the set. In a properly maintained set of disjoint intervals, at most one interval contains any given x.

So: find the node with the largest lo <= x. If it exists and x < hi, then x is in the set.

This is O(log n) - I just need to do a search for the predecessor in the BST.

Let me implement a Treap:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None
```

For the Treap operations:
- Insert: standard treap insert
- Delete: standard treap delete
- Find predecessor: traverse the tree

Actually, let me think more carefully about the operations.

For `add(lo, hi)`:
1. Find all intervals that overlap with [lo, hi). An interval [a, b) overlaps with [lo, hi) if a < hi and b > lo.
2. Merge all overlapping intervals with [lo, hi) into a single interval.
3. Remove the overlapping intervals from the tree.
4. Insert the merged interval.

To find all overlapping intervals:
- The leftmost overlapping interval has lo < hi (since intervals are disjoint and sorted by lo)
- The rightmost overlapping interval has hi > lo
- I need to find the first interval with lo < hi, then walk right until hi <= lo.

In a BST keyed by lo:
- Find the node with the largest lo < hi (predecessor of hi). This is the leftmost interval that could overlap.
- Then walk right from there, collecting all intervals where hi > lo.

Wait, I need to be more careful. The intervals are disjoint. So if I sort by lo, the intervals are [a1, b1), [a2, b2), [a3, b3), ... where b1 <= a2, b2 <= a3, etc.

For adding [lo, hi):
- The first interval that could overlap is the one with the largest lo < hi. Let's call it [a, b).
- Then I walk right: if the next interval's lo < hi, it also overlaps. Continue until I find an interval with lo >= hi.
- The merged interval is [min(lo, a), max(hi, last_hi)].

For removing [lo, hi):
- Find the first interval that overlaps: the one with the largest lo < hi.
- Walk right while intervals overlap (lo < hi of the interval, i.e., interval's hi > lo).
- For each overlapping interval [a, b):
  - If a < lo: add [a, lo)
  - If b > hi: add [hi, b)
  - Remove [a, b) from the tree

Let me implement this step by step.

For the Treap, I'll implement:
- `_insert(node)`: insert a node
- `_delete(lo)`: delete node with key lo
- `_find_predecessor(key)`: find node with largest key < key (or <= key?)

Actually, I need:
- `_find_first_overlapping(hi)`: find the node with the largest lo < hi. This is the predecessor of hi in the BST.
- `_inorder_traversal()`: get all intervals in order

Let me code this up:

```python
import random

class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right')
    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None

class IntervalSet:
    def __init__(self):
        self._root = None
        self._size = 0
    
    def _rotate_right(self, y):
        x = y.left
        y.left = x.right
        x.right = y
        return x
    
    def _rotate_left(self, x):
        y = x.right
        x.right = y.left
        y.left = x
        return y
    
    def _insert(self, node):
        # Standard treap insert
        if self._root is None:
            self._root = node
            self._size = 1
            return
        # Insert into left or right subtree
        if node.lo < self._root.lo:
            self._root.left = self._insert(node)  # Wait, this isn't right for treap
        ...
```

Hmm, let me think about this differently. Let me use an iterative approach or a recursive one that's clean.

Actually, let me use a recursive treap insert:

```python
def _insert(self, node):
    if self._root is None:
        self._root = node
        self._size += 1
        return
    if node.lo < self._root.lo:
        self._root.left = self._insert_node(self._root.left, node)
        if node.priority > self._root.left.priority:
            self._root = self._rotate_right(self._root)
    else:
        self._root.right = self._insert_node(self._root.right, node)
        if node.priority > self._root.right.priority:
            self._root = self._rotate_left(self._root)
```

Wait, I need to be more careful. Let me structure this properly.

```python
def _insert_node(self, node, new_node):
    if node is None:
        return new_node
    if new_node.lo < node.lo:
        node.left = self._insert_node(node.left, new_node)
        if new_node.priority > node.priority:
            return self._rotate_right(node)
    else:
        node.right = self._insert_node(node.right, new_node)
        if new_node.priority > node.priority:
            return self._rotate_left(node)
    return node
```

For delete:
```python
def _delete_node(self, node, key):
    if node is None:
        return None
    if key < node.lo:
        node.left = self._delete_node(node.left, key)
        return node
    elif key > node.lo:
        node.right = self._delete_node(node.right, key)
        return node
    else:
        # node is the one to delete
        if node.left is None:
            return node.right
        if node.right is None:
            return node.left
        # Merge: put the higher-priority child on top
        if node.left.priority > node.right.priority:
            node.left = self._delete_node(node.left, key)
            return self._rotate_right(node)
        else:
            node.right = self._delete_node(node.right, key)
            return self._rotate_left(node)
```

For finding predecessor (largest key < target):
```python
def _predecessor(self, key):
    """Find node with largest lo < key"""
    node = self._root
    pred = None
    while node is not None:
        if node.lo < key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred
```

For finding successor (smallest key > target):
```python
def _successor(self, key):
    """Find node with smallest lo > key"""
    node = self._root
    succ = None
    while node is not None:
        if node.lo > key:
            succ = node
            node = node.left
        else:
            node = node.right
    return succ
```

Now for `add(lo, hi)`:
- If lo >= hi, return
- Find the first overlapping interval: predecessor of hi (largest lo < hi)
- Walk right from there, collecting all intervals where hi > lo (i.e., the interval's hi > lo of the new interval)
- Merge into [min(lo, first.lo), max(hi, last.hi)]
- Remove all collected intervals
- Insert the merged interval

Wait, I need to be more careful. The intervals are disjoint. So if I have intervals [1,3), [5,7), [9,11), and I add [2, 10):
- First overlapping: predecessor of 10 is [9,11) (lo=9 < 10). Wait no, predecessor of 10 is the node with largest lo < 10, which is [9,11). But does [9,11) overlap with [2,10)? Yes: 9 < 10 and 11 > 2.
- But [5,7) also overlaps: 5 < 10 and 7 > 2.
- And [1,3) also overlaps: 1 < 10 and 3 > 2.

So I need to walk left from the predecessor to find all overlapping intervals, then walk right.

Actually, let me think again. Since intervals are disjoint and sorted by lo:
- An interval [a, b) overlaps with [lo, hi) iff a < hi and b > lo.
- The leftmost overlapping interval: the one with the largest lo < hi. Because all intervals to the left have lo < hi, but I need b > lo. Since intervals are disjoint, if [a, b) has the largest lo < hi, then the interval to its left has hi <= a, so it might not overlap. Wait, actually the interval to the left has hi <= a (since they're disjoint). So the interval to the left of [a, b) has hi <= a. Does it overlap with [lo, hi)? It overlaps if hi_left > lo. Hmm, so I need to check.

Let me think differently. Since intervals are disjoint:
- If interval [a, b) overlaps with [lo, hi), then a < hi and b > lo.
- The interval immediately to the left of [a, b) has hi_left <= a. Does it overlap? It overlaps if hi_left > lo. Since hi_left <= a and a < hi, we need hi_left > lo. This could be true or false.

So I can't just find the predecessor and walk right. I need to potentially walk left too.

Better approach:
1. Find the node with the largest lo < hi. Call it `first`.
2. Walk left from `first` while the left neighbor's hi > lo. Collect these.
3. Walk right from `first` while the right neighbor's lo < hi. Collect these.
4. Merge all collected + [lo, hi] into a single interval.

Actually, since intervals are disjoint, I can simplify:
- The first overlapping interval (leftmost) is the predecessor of hi. But I need to verify it actually overlaps (hi_of_interval > lo).
- If it doesn't overlap, then no interval overlaps (because all intervals to the left have even smaller hi values... wait, no. All intervals to the left have lo < first.lo, and their hi <= first.lo. So if first.lo >= hi (meaning first doesn't exist), or if first.hi <= lo, then no interval to the left overlaps.

Wait, let me reconsider. Intervals are disjoint and sorted by lo. So:
- Interval i: [a_i, b_i) where a_i < a_{i+1} and b_i <= a_{i+1}

For [lo, hi) to overlap with interval i: a_i < hi and b_i > lo.

The rightmost interval that could overlap: the one with the largest a_i < hi. Let's call it interval j.
- If b_j > lo, it overlaps.
- Walk left from j: interval j-1 has b_{j-1} <= a_j. Does it overlap? b_{j-1} > lo? Since b_{j-1} <= a_j and a_j < hi, we need b_{j-1} > lo. This is possible.
- Continue walking left while b_i > lo.

The leftmost interval that could overlap: the one with the smallest a_i such that b_i > lo. This is the first interval (from the left) where b_i > lo.

Actually, let me just do:
1. Find predecessor of hi (largest lo < hi). This is the rightmost interval that starts before hi.
2. From there, walk left while the interval's hi > lo. Collect.
3. From the starting point, walk right while the interval's lo < hi. Collect.
4. Merge.

Wait, step 3: walk right from the predecessor. The next interval to the right has lo >= predecessor.lo. Does it overlap? It overlaps if lo < hi_of_new (the new interval's hi). So walk right while next.lo < hi.

Step 2: walk left from the predecessor. The interval to the left has hi <= predecessor.lo. Does it overlap? It overlaps if hi_of_left > lo. So walk left while left.hi > lo.

Let me code this:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find the rightmost interval with lo < hi
    first = self._predecessor(hi)
    
    # Walk left while overlapping
    left_intervals = []
    node = first
    while node is not None:
        if node.hi > lo:
            left_intervals.append(node)
            node = self._prev_inorder(node)
        else:
            break
    
    # Walk right from first while overlapping
    right_intervals = []
    node = self._next_inorder(first)
    while node is not None:
        if node.lo < hi:
            right_intervals.append(node)
            node = self._next_inorder(node)
        else:
            break
    
    # Merge
    merged_lo = min(lo, *(n.lo for n in left_intervals)) if left_intervals else lo
    merged_hi = max(hi, *(n.hi for n in right_intervals)) if right_intervals else hi
    
    # Remove all overlapping intervals
    for n in left_intervals + right_intervals:
        self._delete_node(self._root, n.lo)
        self._size -= 1
    
    # Insert merged
    self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
    self._size += 1
```

Hmm, but I need inorder predecessor and successor. Let me think about how to get them.

For inorder predecessor of a node: it's the rightmost node in the left subtree, or if no left subtree, the first ancestor for which the node is in its right subtree.

For inorder successor: leftmost node in the right subtree, or if no right subtree, the first ancestor for which the node is in its left subtree.

Let me implement these:

```python
def _inorder_prev(self, node):
    if node.left is not None:
        # Go to leftmost of left subtree
        curr = node.left
        while curr.left is not None:
            curr = curr.left
        return curr
    # Go up to parent
    # I need parent pointers or a different approach
```

Hmm, without parent pointers this is tricky. Let me add parent pointers to the nodes.

Actually, let me use a different approach. Instead of traversing the tree to find neighbors, I can:
1. Find the predecessor of hi (this gives me the rightmost interval starting before hi)
2. To walk left, I can repeatedly find the predecessor of the current node's lo
3. To walk right, I can repeatedly find the successor of the current node's lo

This is O(log n) per step, and in the worst case I might visit O(n) intervals, making the total O(n log n) for an add. But for the performance requirement, 60,000 adds of small disjoint intervals... if they're disjoint, each add only overlaps with at most 1 existing interval (or 0). So it's O(log n) per add in practice.

Wait, the problem says "60,000 add() calls of small disjoint intervals in random order". If they're disjoint, each add is O(log n) - just insert a new node. That's 60,000 * log(60,000) ≈ 60,000 * 16 ≈ 1 million operations. Fine.

Then 200,000 contains() calls, each O(log n) ≈ 16. Total ≈ 3.2 million operations. Fine.

Let me use the approach of finding predecessor/successor by key:

```python
def _predecessor(self, key):
    """Find node with largest lo < key"""
    node = self._root
    pred = None
    while node is not None:
        if node.lo < key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred

def _successor(self, key):
    """Find node with smallest lo > key"""
    node = self._root
    succ = None
    while node is not None:
        if node.lo > key:
            succ = node
            node = node.left
        else:
            node = node.right
    return succ
```

For add:
```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find rightmost interval with lo < hi
    first = self._predecessor(hi)
    
    # Walk left: find all intervals with hi > lo
    # Start from first, go to predecessor of first.lo
    to_remove = []
    node = first
    while node is not None and node.hi > lo:
        to_remove.append(node)
        node = self._predecessor(node.lo)
    
    # Walk right: find all intervals with lo < hi
    node = self._successor(first.lo) if first else None
    while node is not None and node.lo < hi:
        to_remove.append(node)
        node = self._successor(node.lo)
    
    # Merge
    merged_lo = min(lo, *(n.lo for n in to_remove)) if to_remove else lo
    merged_hi = max(hi, *(n.hi for n in to_remove)) if to_remove else hi
    
    # Remove
    for n in to_remove:
        self._root = self._delete_node(self._root, n.lo)
        self._size -= 1
    
    # Insert
    self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
    self._size += 1
```

Wait, there's an issue. When I walk left from `first`, I'm finding predecessors. But what if `first` is None? Then no interval starts before hi, so no overlap on the left.

Also, I need to handle the case where `first` is None but there might be intervals to the right that overlap. Wait, if `first` is None, it means no interval has lo < hi. So all intervals have lo >= hi. The first interval (smallest lo) has lo >= hi, so it doesn't overlap with [lo, hi) because lo >= hi means the interval starts at or after hi. Actually wait, if lo < hi (we checked), and the smallest interval's lo >= hi, then that interval starts at hi or later, so it doesn't overlap. So if first is None, no interval overlaps.

Hmm wait, that's not right. If first is None, it means no interval has lo < hi. But what about intervals with lo == hi? They don't overlap because [lo, hi) is half-open. An interval [hi, x) doesn't overlap with [lo, hi) because the first ends at hi and the second starts at hi.

So if first is None, no interval overlaps. Good.

But wait, what if first exists but first.hi <= lo? Then first doesn't overlap. And since intervals to the left of first have hi <= first.lo < first.hi <= lo, they also don't overlap. So no overlap on the left.

And on the right: the successor of first has lo >= first.lo. Does it overlap? It overlaps if its lo < hi. Since first.lo < hi (first is predecessor of hi), the successor has lo >= first.lo but could be < hi. So I need to check.

Let me refine:

```python
def add(self, lo, hi):
    if lo >= hi:
        return
    
    # Find rightmost interval with lo < hi
    first = self._predecessor(hi)
    
    to_remove = []
    
    # Walk left from first while overlapping
    node = first
    while node is not None and node.hi > lo:
        to_remove.append(node)
        node = self._predecessor(node.lo)
    
    # Walk right from first's successor while overlapping
    if first is not None:
        node = self._successor(first.lo)
    else:
        node = self._root  # leftmost node
    while node is not None and node.lo < hi:
        to_remove.append(node)
        node = self._successor(node.lo)
    
    # Merge
    if to_remove:
        merged_lo = min(lo, min(n.lo for n in to_remove))
        merged_hi = max(hi, max(n.hi for n in to_remove))
    else:
        merged_lo = lo
        merged_hi = hi
    
    # Remove all
    for n in to_remove:
        self._root = self._delete_node(self._root, n.lo)
        self._size -= 1
    
    # Insert merged
    self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
    self._size += 1
```

Hmm wait, there's a subtlety. When walking right, I start from the successor of `first`. But what if `first` is None? Then I should start from the leftmost node. But if `first` is None, no interval has lo < hi, so the leftmost node has lo >= hi, and it doesn't overlap. So I can skip the right walk if first is None.

Actually wait, I realize there might be an issue. Let me reconsider.

If first is not None and first.hi <= lo, then first doesn't overlap. The walk left stops immediately (first.hi <= lo, so the while condition fails). Good.

For the right walk: successor of first has lo > first.lo. Since first.lo < hi (first is predecessor of hi), the successor could have lo < hi (overlap) or lo >= hi (no overlap). The while condition `node.lo < hi` handles this.

But what if first is None? Then I start from the leftmost node. The leftmost node has lo >= hi (since no node has lo < hi). So `node.lo < hi` is false, and the while loop doesn't execute. Good.

Actually, I realize I should handle the case where first is None more carefully. If first is None, I can just set node = self._root for the right walk, and the condition will handle it.

Let me also think about `remove(lo, hi)`:

```python
def remove(self, lo, hi):
    if lo >= hi:
        return
    
    # Find rightmost interval with lo < hi
    first = self._predecessor(hi)
    
    to_remove = []
    
    # Walk left from first while overlapping
    node = first
    while node is not None and node.hi > lo:
        to_remove.append(node)
        node = self._predecessor(node.lo)
    
    # Walk right from first's successor while overlapping
    if first is not None:
        node = self._successor(first.lo)
    else:
        node = self._root
    while node is not None and node.lo < hi:
        to_remove.append(node)
        node = self._successor(node.lo)
    
    # Remove all and add back the parts outside [lo, hi)
    for n in to_remove:
        self._root = self._delete_node(self._root, n.lo)
        self._size -= 1
        if n.lo < lo:
            self._root = self._insert_node(self._root, _Node(n.lo, lo))
            self._size += 1
        if n.hi > hi:
            self._root = self._insert_node(self._root, _Node(hi, n.hi))
            self._size += 1
```

Wait, but I need to be careful. If I'm removing multiple intervals, and I add back pieces, those pieces might need to be merged with adjacent intervals. But since I'm removing a contiguous range, the pieces I add back are:
- [n.lo, lo) for the leftmost removed interval (if n.lo < lo)
- [hi, n.hi) for the rightmost removed interval (if n.hi > hi)

These are at the boundaries, so they won't overlap with each other. And they won't overlap with non-removed intervals (since the removed intervals were contiguous). So no merging needed.

Actually wait, let me reconsider. The removed intervals are contiguous (they all overlap with [lo, hi)). The leftmost removed interval might have lo < lo_of_removed, and the rightmost might have hi > hi_of_removed. The pieces I add back are:
- Left piece: [leftmost.lo, lo) - this is to the left of all removed intervals
- Right piece: [hi, rightmost.hi) - this is to the right of all removed intervals

These don't overlap with each other (lo <= hi) and don't overlap with non-removed intervals. Good.

But wait, I'm inserting them one by one. If I have multiple removed intervals, I only add at most 2 pieces total (one left, one right). So it's fine.

Let me also handle `contains(x)`:

```python
def contains(self, x):
    # Find the interval with the largest lo <= x
    # Actually, I need lo <= x < hi
    # Find predecessor of x+1? No, I need the node with largest lo <= x.
    # Hmm, but what if lo == x? Then x is in [lo, hi) if x < hi.
    
    # Let me find the node with the largest lo <= x
    node = self._root
    pred = None
    while node is not None:
        if node.lo <= x:
            pred = node
            node = node.right
        else:
            node = node.left
    
    return pred is not None and x < pred.hi
```

Wait, I need to be careful. The predecessor of x in the BST (largest lo <= x) is the candidate. If pred.lo <= x < pred.hi, then x is in the set.

But what if there's a node with lo == x? Then pred would be that node (since lo <= x). And x < pred.hi means x is in the interval. Good.

What if the largest lo < x? Then pred.lo < x, and we check x < pred.hi. Good.

What if there's no node with lo <= x? Then pred is None, and x is not in the set. Good.

This is O(log n). 

For `total_length()`:
```python
def total_length(self):
    total = 0
    self._inorder_traverse(self._root, lambda n: total)  # hmm, can't do this cleanly
    # Better:
    total = 0
    stack = []
    node = self._root
    while node is not None or stack:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        total += node.hi - node.lo
        node = node.right
    return total
```

For `intervals()`:
```python
def intervals(self):
    result = []
    stack = []
    node = self._root
    while node is not None or stack:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        result.append((node.lo, node.hi))
        node = node.right
    return result
```

For `__len__`:
```python
def __len__(self):
    return self._size
```

Now let me think about the treap implementation more carefully.

Treap insert:
```python
def _insert_node(self, root, node):
    if root is None:
        return node
    if node.lo < root.lo:
        root.left = self._insert_node(root.left, node)
        if node.priority > root.priority:
            return self._rotate_right(root)
    else:
        root.right = self._insert_node(root.right, node)
        if node.priority > root.priority:
            return self._rotate_left(root)
    return root
```

Wait, this isn't quite right. The standard treap insert is:
1. Insert as a BST node
2. Rotate up while priority is higher than parent

The recursive version:
```python
def _insert_node(self, root, node):
    if root is None:
        return node
    if node.lo < root.lo:
        root.left = self._insert_node(root.left, node)
        if node.priority > root.priority:
            return self._rotate_right(root)
    else:
        root.right = self._insert_node(root.right, node)
        if node.priority > root.priority:
            return self._rotate_left(root)
    return root
```

Hmm, but this only rotates once. The standard approach is to insert and then bubble up. Let me think...

Actually, the recursive approach does work correctly for treaps. When you insert a node, you go left or right based on key, then if the new node has higher priority than the current node, you rotate. But this only handles one level. The node might need to bubble up multiple levels.

Wait, actually in the recursive approach, after inserting into the left subtree, if the new node's priority > root's priority, we rotate right. But the new node might still have higher priority than root's parent. However, since we're recursing, the parent will check after the recursive call returns.

Let me trace through:
- Insert node N with key 5, priority 10 into a tree rooted at A (key 3, priority 5).
- N goes to A's right (5 > 3).
- A.right = _insert_node(A.right, N). Suppose A.right is None, so it returns N.
- Now check: N.priority (10) > A.priority (5)? Yes. Rotate left: A becomes N's left child, N becomes root.
- Return N.

Now if A's parent is B (key 1, priority 8):
- B.right = _insert_node(B.right, N). B.right was A, now it's N (after rotation).
- Check: N.priority (10) > B.priority (8)? Yes. Rotate left: B becomes N's left child, N becomes the new root of this subtree.
- Return N.

So the bubbling up works correctly through the recursion. 

Treap delete:
```python
def _delete_node(self, root, key):
    if root is None:
        return None
    if key < root.lo:
        root.left = self._delete_node(root.left, key)
        return root
    elif key > root.lo:
        root.right = self._delete_node(root.right, key)
        return root
    else:
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        if root.left.priority > root.right.priority:
            root.left = self._delete_node(root.left, key)
            return self._rotate_right(root)
        else:
            root.right = self._delete_node(root.right, key)
            return self._rotate_left(root)
```

Wait, this doesn't look right. The standard treap delete:
1. Find the node to delete.
2. If it has two children, rotate it down (merge the higher-priority child up).
3. Remove the leaf.

Let me re-examine:
```python
def _delete_node(self, root, key):
    if root is None:
        return None
    if key < root.lo:
        root.left = self._delete_node(root.left, key)
        return root
    elif key > root.lo:
        root.right = self._delete_node(root.right, key)
        return root
    else:
        # root is the node to delete
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        # Both children exist
        if root.left.priority > root.right.priority:
            # Rotate right: root.left becomes parent
            root.left = self._delete_node(root.left, key)
            return self._rotate_right(root)
        else:
            # Rotate left: root.right becomes parent
            root.right = self._delete_node(root.right, key)
            return self._rotate_left(root)
```

Hmm wait, when I rotate right, root.left becomes the new root of this subtree. But I'm deleting root, so I need to remove root from the tree. After rotating right, root is now the right child of root.left. Then I recursively delete root from root.left's right subtree.

Actually, let me think about this differently. The standard treap delete:

```python
def _delete_node(self, root, key):
    if root is None:
        return None
    if key < root.lo:
        root.left = self._delete_node(root.left, key)
        return root
    elif key > root.lo:
        root.right = self._delete_node(root.right, key)
        return root
    else:
        # root is the target
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        # Both children exist
        if root.left.priority > root.right.priority:
            # Merge: rotate right, then delete from the new right subtree
            root.left = self._delete_node(root.left, key)
            return self._rotate_right(root)
        else:
            root.right = self._delete_node(root.right, key)
            return self._rotate_left(root)
```

Wait, I think the issue is: after rotating, root is now a child of the rotated node. But I'm deleting root. So I should delete root from the appropriate subtree.

Let me think step by step:
- root has left child L and right child R.
- If L.priority > R.priority: rotate right. Now L is the new root, L.right = root, root.left = L's old right.
- Now I need to delete root. root is in L's right subtree. So: L.right = self._delete_node(L.right, key). But wait, root IS the key I'm deleting. So after rotation, root is L.right. I need to delete root from L's right subtree. But root is a leaf now (its left child was moved to L.right... no wait).

Hmm, let me re-examine the rotation:
- rotate_right(y): x = y.left; y.left = x.right; x.right = y; return x.

So after rotate_right(root):
- new_root = root.left (call it L)
- L.right = root
- root.left = L's old right

So root still has a right child (R). And root.left is now L's old right (which was originally between L and root in the BST).

Now I need to delete root. root is now L.right. So I call _delete_node(L.right, key) which will find root and delete it.

Wait, but in my code:
```python
if root.left.priority > root.right.priority:
    root.left = self._delete_node(root.left, key)
    return self._rotate_right(root)
```

This first deletes key from root.left, then rotates. But root IS the key! So _delete_node(root.left, key) won't find key in root.left (since key == root.lo, and root.left has keys < root.lo). So it returns root.left unchanged. Then rotate_right(root) makes root.left the new root with root as its right child.

That's wrong. I need to:
1. Rotate root down (make one child the new root)
2. Then delete root from the new root's subtree

Let me fix:
```python
def _delete_node(self, root, key):
    if root is None:
        return None
    if key < root.lo:
        root.left = self._delete_node(root.left, key)
        return root
    elif key > root.lo:
        root.right = self._delete_node(root.right, key)
        return root
    else:
        if root.left is None:
            return root.right
        if root.right is None:
            return root.left
        if root.left.priority > root.right.priority:
            # Rotate right, then delete root from the new right subtree
            new_root = self._rotate_right(root)
            new_root.right = self._delete_node(new_root.right, key)
            return new_root
        else:
            new_root = self._rotate_left(root)
            new_root.left = self._delete_node(new_root.left, key)
            return new_root
```

Let me verify:
- root has left L and right R.
- L.priority > R.priority.
- rotate_right(root): L becomes new_root, L.right = root, root.left = L's old right.
- Now root is new_root.right. Delete root from new_root.right: _delete_node(root, key). Since key == root.lo, and root has no left (it was moved to L's old right... wait, no).

Hmm, after rotate_right:
- new_root = L
- L.right = root
- root.left = (L's old right)

So root still has root.left and root.right. When I call _delete_node(root, key), key == root.lo, so it goes to the else branch. root has both children (root.left and root.right), so it rotates again. This works!

Actually wait, I think there might be an issue. Let me trace more carefully.

Tree: L(2) - root(5) - R(8), where L.left = A(1), L.right = None, R.left = None, R.right = B(9).

L.priority > R.priority.

rotate_right(root):
- x = root.left = L
- root.left = x.right = None
- x.right = root
- return x = L

Now: L(2) has left=A(1), right=root(5). root(5) has left=None, right=R(8).

Now _delete_node(L.right, 5) = _delete_node(root, 5):
- key == root.lo, so else branch.
- root.left is None, so return root.right = R(8).

Result: L(2) has left=A(1), right=R(8). Correct!

Another case: L(2) - root(5) - R(8), L.right = C(4), R.left = D(6).

L.priority > R.priority.

rotate_right(root):
- x = L
- root.left = L.right = C(4)
- L.right = root
- return L

Now: L(2) has left=A(1), right=root(5). root(5) has left=C(4), right=R(8).

_delete_node(root, 5):
- key == root.lo, else branch.
- root.left = C(4), root.right = R(8). Both exist.
- C.priority vs R.priority: say C.priority > R.priority.
- rotate_right(root): x = C, root.left = C.right (None), C.right = root.
- new_root = C(4), C.right = root(5).
- _delete_node(C.right, 5) = _delete_node(root, 5):
  - key == root.lo, else branch.
  - root.left = None, root.right = R(8).
  - root.left is None, return root.right = R(8).
- C.right = R(8).
- return C(4).

So L.right = C(4), C(4) has left=None, right=R(8).
L(2) has left=A(1), right=C(4). C(4) has right=R(8).

BST check: A(1) < C(4) < R(8). ✓

Great, the delete works.

Now let me also think about the `_predecessor` and `_successor` functions. These need to be efficient.

```python
def _predecessor(self, key):
    """Find node with largest lo < key (strictly less)"""
    node = self._root
    pred = None
    while node is not None:
        if node.lo < key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred

def _successor(self, key):
    """Find node with smallest lo > key (strictly greater)"""
    node = self._root
    succ = None
    while node is not None:
        if node.lo > key:
            succ = node
            node = node.left
        else:
            node = node.right
    return succ
```

Wait, for `add(lo, hi)`, I need to find intervals that overlap with [lo, hi). An interval [a, b) overlaps if a < hi and b > lo.

The rightmost interval that could overlap is the one with the largest a < hi. That's `_predecessor(hi)`.

But what if there's an interval with a == hi? It doesn't overlap (since [hi, x) and [lo, hi) don't overlap for half-open intervals). So `_predecessor(hi)` (strictly less) is correct.

For the left walk: from `first`, go to `_predecessor(first.lo)`. This gives the interval with the largest lo < first.lo. Since intervals are disjoint, this interval's hi <= first.lo. It overlaps with [lo, hi) if its hi > lo.

For the right walk: from `first`, go to `_successor(first.lo)`. This gives the interval with the smallest lo > first.lo. It overlaps if its lo < hi.

This all looks correct.

Now, for `contains(x)`:
```python
def contains(self, x):
    node = self._root
    pred = None
    while node is not None:
        if node.lo <= x:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred is not None and x < pred.hi
```

This finds the node with the largest lo <= x. If that node's hi > x, then x is in the set.

Wait, I should double-check: what if x equals some interval's hi? E.g., interval [1, 5), x = 5. The predecessor of 5 is the node with largest lo <= 5, which is the node with lo=1. x < pred.hi means 5 < 5, which is False. So x is not in the set. Correct (since [1,5) doesn't include 5).

What if x = 1? Predecessor is the node with lo=1. x < pred.hi means 1 < 5, True. Correct.

What if x = 0? Predecessor is None (no node with lo <= 0). Returns False. Correct.

Great.

Now let me put it all together and make sure the code is clean.

One concern: recursion depth. For 60,000 nodes, the treap height is O(log n) ≈ 16-20, so recursion is fine.

Let me also think about whether I need to handle the case where `add` inserts a new interval that doesn't overlap anything. In that case, `to_remove` is empty, and I just insert the new node. That's O(log n).

Let me write the final code:

```python
import random


class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right')

    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None


class IntervalSet:
    def __init__(self):
        self._root = None
        self._size = 0

    def _rotate_right(self, y):
        x = y.left
        y.left = x.right
        x.right = y
        return x

    def _rotate_left(self, x):
        y = x.right
        x.right = y.left
        y.left = x
        return y

    def _insert_node(self, root, node):
        if root is None:
            return node
        if node.lo < root.lo:
            root.left = self._insert_node(root.left, node)
            if node.priority > root.priority:
                return self._rotate_right(root)
        else:
            root.right = self._insert_node(root.right, node)
            if node.priority > root.priority:
                return self._rotate_left(root)
        return root

    def _delete_node(self, root, key):
        if root is None:
            return None
        if key < root.lo:
            root.left = self._delete_node(root.left, key)
            return root
        elif key > root.lo:
            root.right = self._delete_node(root.right, key)
            return root
        else:
            if root.left is None:
                return root.right
            if root.right is None:
                return root.left
            if root.left.priority > root.right.priority:
                new_root = self._rotate_right(root)
                new_root.right = self._delete_node(new_root.right, key)
                return new_root
            else:
                new_root = self._rotate_left(root)
                new_root.left = self._delete_node(new_root.left, key)
                return new_root

    def _predecessor(self, key):
        """Node with largest lo < key."""
        node = self._root
        pred = None
        while node is not None:
            if node.lo < key:
                pred = node
                node = node.right
            else:
                node = node.left
        return pred

    def _successor(self, key):
        """Node with smallest lo > key."""
        node = self._root
        succ = None
        while node is not None:
            if node.lo > key:
                succ = node
                node = node.left
            else:
                node = node.right
        return succ

    def add(self, lo, hi):
        if lo >= hi:
            return

        first = self._predecessor(hi)

        to_remove = []

        # Walk left
        node = first
        while node is not None and node.hi > lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo < hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        # Merge
        if to_remove:
            merged_lo = min(lo, min(n.lo for n in to_remove))
            merged_hi = max(hi, max(n.hi for n in to_remove))
        else:
            merged_lo = lo
            merged_hi = hi

        # Remove overlapping intervals
        for n in to_remove:
            self._root = self._delete_node(self._root, n.lo)
            self._size -= 1

        # Insert merged interval
        self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
        self._size += 1

    def remove(self, lo, hi):
        if lo >= hi:
            return

        first = self._predecessor(hi)

        to_remove = []

        # Walk left
        node = first
        while node is not None and node.hi > lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo < hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        # Remove and add back pieces
        for n in to_remove:
            self._root = self._delete_node(self._root, n.lo)
            self._size -= 1
            if n.lo < lo:
                self._root = self._insert_node(self._root, _Node(n.lo, lo))
                self._size += 1
            if n.hi > hi:
                self._root = self._insert_node(self._root, _Node(hi, n.hi))
                self._size += 1

    def contains(self, x):
        node = self._root
        pred = None
        while node is not None:
            if node.lo <= x:
                pred = node
                node = node.right
            else:
                node = node.left
        return pred is not None and x < pred.hi

    def total_length(self):
        total = 0
        stack = []
        node = self._root
        while node is not None or stack:
            while node is not None:
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
        while node is not None or stack:
            while node is not None:
                stack.append(node)
                node = node.left
            node = stack.pop()
            result.append((node.lo, node.hi))
            node = node.right
        return result

    def __len__(self):
        return self._size
```

Wait, I need to double-check the `remove` method. When I remove multiple intervals, I add back pieces. But the pieces I add back might need to be merged with adjacent intervals. However, since the removed intervals are contiguous (they all overlap with [lo, hi)), the left piece [n.lo, lo) is to the left of all removed intervals, and the right piece [hi, n.hi) is to the right. They don't overlap with non-removed intervals. So no merging needed.

But wait, what if I have intervals [1, 3), [3, 5), [5, 7) and I remove [2, 6)?
- Overlapping intervals: [1,3) (hi=3 > lo=2), [3,5) (lo=3 < hi=6), [5,7) (lo=5 < hi=6).
- to_remove = [1,3), [3,5), [5,7)
- For [1,3): lo=1 < 2, add [1,2). hi=3 < 6, no right piece.
- For [3,5): lo=3 >= 2, no left piece. hi=5 < 6, no right piece.
- For [5,7): lo=5 >= 2, no left piece. hi=7 > 6, add [6,7).

Result: [1,2), [6,7). Correct!

Another case: remove [2, 5) from [1, 7):
- Overlapping: [1,7) (hi=7 > lo=2, lo=1 < hi=5).
- to_remove = [1,7)
- lo=1 < 2, add [1,2). hi=7 > 5, add [5,7).
- Result: [1,2), [5,7). Correct!

Another case: remove [2, 5) from [1, 3) and [3, 7):
- Overlapping: [1,3) (hi=3 > lo=2), [3,7) (lo=3 < hi=5).
- to_remove = [1,3), [3,7)
- [1,3): lo=1 < 2, add [1,2). hi=3 < 5, no right.
- [3,7): lo=3 >= 2, no left. hi=7 > 5, add [5,7).
- Result: [1,2), [5,7). Correct!

Looks good.

Let me also verify `add`:
Add [2, 6) to [1, 3), [5, 7):
- first = predecessor(6) = [5,7) (lo=5 < 6).
- Walk left: [5,7) has hi=7 > lo=2, add to to_remove. predecessor(5) = [1,3). [1,3) has hi=3 > lo=2, add to to_remove. predecessor(1) = None. Stop.
- Walk right: successor(5) = None (no node with lo > 5). Stop.
- to_remove = [5,7), [1,3).
- merged_lo = min(2, 5, 1) = 1. merged_hi = max(6, 7, 3) = 7.
- Remove [5,7) and [1,3). Insert [1,7).
- Result: [1,7). Correct!

Add [2, 4) to [1, 3), [5, 7):
- first = predecessor(4) = [1,3) (lo=1 < 4).
- Walk left: [1,3) has hi=3 > lo=2, add. predecessor(1) = None. Stop.
- Walk right: successor(1) = [5,7). [5,7) has lo=5 < hi=4? No, 5 < 4 is False. Stop.
- to_remove = [1,3).
- merged_lo = min(2, 1) = 1. merged_hi = max(4, 3) = 4.
- Remove [1,3). Insert [1,4).
- Result: [1,4), [5,7). Correct!

Now let me think about edge cases:
- Adding an interval that's a subset of an existing interval: add [2, 4) to [1, 5).
  - first = predecessor(4) = [1,5) (lo=1 < 4).
  - Walk left: [1,5) has hi=5 > lo=2, add. predecessor(1) = None. Stop.
  - Walk right: successor(1) = None. Stop.
  - to_remove = [1,5).
  - merged_lo = min(2, 1) = 1. merged_hi = max(4, 5) = 5.
  - Remove [1,5). Insert [1,5).
  - Result: [1,5). Correct (no change).

- Adding a touching interval: add [3, 5) to [1, 3).
  - first = predecessor(5) = [1,3) (lo=1 < 5).
  - Walk left: [1,3) has hi=3 > lo=3? No, 3 > 3 is False. Stop.
  - Walk right: successor(1) = None. Stop.
  - to_remove = [].
  - merged_lo = 3, merged_hi = 5.
  - Insert [3,5).
  - Result: [1,3), [3,5). 

Hmm, but the problem says "touching intervals merged ([1,3) + [3,5) gives [(1, 5)]". So I need to merge touching intervals!

Wait, let me re-read: "intervals() -> list[tuple]: all intervals as (lo, hi) tuples, sorted, disjoint, and with touching intervals merged ([1,3) + [3,5) gives [(1, 5)])."

So the `intervals()` method should merge touching intervals. But the internal representation... should I keep them separate or merge them?

If I keep them separate in the tree, then `intervals()` needs to merge them. But then `total_length()` would still be correct (sum of lengths is the same whether merged or not). And `contains()` would still work.

But the problem says the intervals should be "disjoint" and "with touching intervals merged". So the `intervals()` output should have merged touching intervals.

I think the cleanest approach is to merge touching intervals in the internal representation. When I add an interval, if it touches an existing interval (i.e., existing.hi == new.lo or new.hi == existing.lo), I should merge them.

Wait, actually, let me re-read the requirement. It says `intervals()` returns them "sorted, disjoint, and with touching intervals merged". So the internal representation can have touching intervals, but `intervals()` merges them for output.

Hmm, but that would make `intervals()` potentially different from the internal state. And `__len__()` returns "number of intervals" - is that the internal count or the merged count?

I think the cleanest interpretation is: the internal representation already has merged intervals (no touching intervals). So `intervals()` just returns them in order, and `__len__()` is the count.

Let me adjust `add` to handle merging with touching intervals:

When adding [lo, hi):
- Find all intervals that overlap OR touch [lo, hi).
- An interval [a, b) touches or overlaps [lo, hi) if a < hi and b > lo (overlap) OR a == hi (touching from left) OR b == lo (touching from right).

Wait, actually: [a, b) and [lo, hi) are "touching" if b == lo or a == hi. They "overlap" if a < hi and b > lo.

For merging, I want to merge if they overlap OR touch. So the condition is: a < hi and b >= lo... no wait.

Actually, for half-open intervals [a, b) and [lo, hi):
- They overlap if a < hi and b > lo.
- They touch if b == lo or a == hi.
- They don't interact if b <= lo or a >= hi.

For merging, I want to merge if they overlap or touch: a < hi and b >= lo... hmm, that's not quite right either.

Let me think: [1, 3) and [3, 5). They touch (3 == 3). Merged: [1, 5).
[1, 3) and [2, 5). They overlap. Merged: [1, 5).
[1, 3) and [4, 5). They don't touch or overlap (3 < 4). Not merged.

The condition for "should merge" is: a < hi and b > lo (overlap) OR b == lo (touching) OR a == hi (touching).

Simplified: a < hi and b >= lo. Wait:
- [1,3) and [3,5): a=1, hi=5, b=3, lo=3. a < hi (1<5) ✓, b >= lo (3>=3) ✓. Merge.
- [1,3) and [4,5): a=1, hi=5, b=3, lo=4. a < hi (1<5) ✓, b >= lo (3>=4) ✗. Don't merge.
- [1,3) and [2,5): a=1, hi=5, b=3, lo=2. a < hi (1<5) ✓, b >= lo (3>=2) ✓. Merge.
- [3,5) and [1,3): a=3, hi=3, b=5, lo=1. a < hi (3<3) ✗. Don't merge. Wait, that's wrong! [3,5) and [1,3) should merge (they touch).

Hmm, the condition a < hi fails because a=3 and hi=3. But they touch! Let me reconsider.

[3,5) and [1,3): a=3, b=5, lo=1, hi=3.
- Do they overlap? a < hi (3 < 3) is False. b > lo (5 > 1) is True. But for overlap we need BOTH: a < hi AND b > lo. So they don't overlap.
- Do they touch? b_of_first == lo_of_second? 5 == 1? No. a_of_second == hi_of_first? 3 == 3? Yes! They touch.

So the merge condition is: a < hi and b > lo (overlap) OR a == hi (touching from left) OR b == lo (touching from right).

Equivalently: NOT (b <= lo OR a >= hi). I.e., b > lo AND a < hi. Wait:
- [3,5) and [1,3): b=5 > lo=1 ✓, a=3 < hi=3 ✗. So NOT(b > lo AND a < hi) = NOT(True AND False) = NOT(False) = True. They should merge.

Hmm, that doesn't work. Let me think differently.

Two intervals [a, b) and [c, d) should be merged if they overlap or touch:
- Overlap: a < d and b > c
- Touch: b == c or a == d

Combined: a < d and b >= c (this covers overlap and one type of touch)
OR: a >= d and b == c (this covers the other type of touch... wait no)

Actually, let me just use: the intervals interact (should be merged) if they are not separated. They are separated if b <= c or a >= d. So they should be merged if NOT(b <= c or a >= d), i.e., b > c AND a < d.

Check:
- [1,3) and [3,5): b=3 > c=3? No (3 > 3 is False). a=1 < d=5? Yes. NOT(False AND True) = NOT(False) = True. Merge. ✓
- [1,3) and [4,5): b=3 > c=4? No. a=1 < d=5? Yes. NOT(False AND True) = True. Hmm, but they shouldn't merge!

Wait, that's wrong. [1,3) and [4,5) should NOT be merged (they're separated).

Let me re-examine. b <= c means [a,b) ends before or at [c,d) starts. a >= d means [a,b) starts at or after [c,d) ends.

[1,3) and [4,5): b=3, c=4. b <= c (3 <= 4) is True. So they ARE separated. Should not merge. ✓
[1,3) and [3,5): b=3, c=3. b <= c (3 <= 3) is True. So they ARE separated?? But they should be merged!

The issue is that for half-open intervals, [1,3) and [3,5) don't actually overlap (3 is not in [1,3) and 3 is in [3,5)). But the problem says they should be merged.

So the "separated" condition for half-open intervals where we want to merge touching ones is: b < c or a > d (strictly separated, not just touching).

So merge if NOT(b < c or a > d), i.e., b >= c AND a <= d.

Check:
- [1,3) and [3,5): b=3 >= c=3 ✓, a=1 <= d=5 ✓. Merge. ✓
- [1,3) and [4,5): b=3 >= c=4? No. Don't merge. ✓
- [1,3) and [2,5): b=3 >= c=2 ✓, a=1 <= d=5 ✓. Merge. ✓
- [3,5) and [1,3): b=5 >= c=1 ✓, a=3 <= d=3 ✓. Merge. ✓
- [1,3) and [3,5) (as [a,b)=[3,5), [c,d)=[1,3)): b=5 >= c=1 ✓, a=3 <= d=3 ✓. Merge. ✓

Great! So the condition for "intervals interact (should be merged)" is: b >= c AND a <= d, where [a,b) and [c,d) are the two intervals.

In my `add(lo, hi)` method, I'm looking for intervals [a, b) that interact with [lo, hi):
- b >= lo AND a <= hi

So: a <= hi AND b >= lo.

Let me update my overlap detection:
- Walk left from `first` (largest lo < hi... wait, I need a <= hi, which includes a == hi).

Hmm, this changes things. Let me reconsider.

I need to find all intervals [a, b) where a <= hi AND b >= lo.

The rightmost such interval: the one with the largest a <= hi. That's the predecessor of hi in the non-strict sense (largest a <= hi). Let me call it `_predecessor_le(hi)`.

Actually, let me define:
- `_predecessor(key)`: largest lo < key (strict)
- `_predecessor_le(key)`: largest lo <= key (non-strict)

For the merge condition a <= hi AND b >= lo:
- The rightmost candidate: largest a <= hi.
- Walk left while b >= lo.
- Walk right while a <= hi.

Wait, walking right: the next interval has a > current.a. It interacts if a <= hi. So walk right while a <= hi.

Walking left: the previous interval has b <= current.a (since disjoint). It interacts if b >= lo. So walk left while b >= lo.

Let me redefine:

```python
def _predecessor_le(self, key):
    """Node with largest lo <= key."""
    node = self._root
    pred = None
    while node is not None:
        if node.lo <= key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred
```

And for `add(lo, hi)`:
```python
first = self._predecessor_le(hi)  # largest lo <= hi

to_remove = []

# Walk left while b >= lo
node = first
while node is not None and node.hi >= lo:
    to_remove.append(node)
    node = self._predecessor(node.lo)  # strict predecessor

# Walk right while a <= hi
if first is not None:
    node = self._successor(first.lo)
else:
    node = self._root
while node is not None and node.lo <= hi:
    to_remove.append(node)
    node = self._successor(node.lo)
```

Wait, but I need to be careful. If first is the node with lo == hi, does it interact? a = hi, b >= lo. If b >= lo, yes. But [hi, b) and [lo, hi) - do they interact? a=hi, b >= lo. The merge condition is b >= lo AND a <= hi. a <= hi means hi <= hi, True. b >= lo. So yes, they interact (they touch at hi).

But wait, if I have interval [3, 5) and I add [1, 3):
- first = predecessor_le(3) = [3,5) (lo=3 <= 3).
- Walk left: [3,5) has hi=5 >= lo=1. Add. predecessor(3) = None. Stop.
- Walk right: successor(3) = None. Stop.
- to_remove = [3,5).
- merged_lo = min(1, 3) = 1. merged_hi = max(3, 5) = 5.
- Remove [3,5). Insert [1,5).
- Result: [1,5). Correct!

And add [3, 5) to [1, 3):
- first = predecessor_le(5) = [1,3) (lo=1 <= 5).
- Walk left: [1,3) has hi=3 >= lo=3. Add. predecessor(1) = None. Stop.
- Walk right: successor(1) = None. Stop.
- to_remove = [1,3).
- merged_lo = min(3, 1) = 1. merged_hi = max(5, 3) = 5.
- Remove [1,3). Insert [1,5).
- Result: [1,5). Correct!

And add [4, 6) to [1, 3):
- first = predecessor_le(6) = [1,3) (lo=1 <= 6).
- Walk left: [1,3) has hi=3 >= lo=4? No (3 >= 4 is False). Stop.
- Walk right: successor(1) = None. Stop.
- to_remove = [].
- Insert [4,6).
- Result: [1,3), [4,6). Correct!

Great, this works.

Now for `remove(lo, hi)`:
The intervals to remove are those that interact with [lo, hi): a <= hi AND b >= lo.

Same logic as add.

```python
def remove(self, lo, hi):
    if lo >= hi:
        return

    first = self._predecessor_le(hi)

    to_remove = []

    # Walk left while b >= lo
    node = first
    while node is not None and node.hi >= lo:
        to_remove.append(node)
        node = self._predecessor(node.lo)

    # Walk right while a <= hi
    if first is not None:
        node = self._successor(first.lo)
    else:
        node = self._root
    while node is not None and node.lo <= hi:
        to_remove.append(node)
        node = self._successor(node.lo)

    # Remove and add back pieces
    for n in to_remove:
        self._root = self._delete_node(self._root, n.lo)
        self._size -= 1
        if n.lo < lo:
            self._root = self._insert_node(self._root, _Node(n.lo, lo))
            self._size += 1
        if n.hi > hi:
            self._root = self._insert_node(self._root, _Node(hi, n.hi))
            self._size += 1
```

Let me verify: remove [2, 5) from [1, 3), [3, 7):
- first = predecessor_le(5) = [3,7) (lo=3 <= 5).
- Walk left: [3,7) has hi=7 >= lo=2. Add. predecessor(3) = [1,3). [1,3) has hi=3 >= lo=2. Add. predecessor(1) = None. Stop.
- Walk right: successor(3) = None. Stop.
- to_remove = [3,7), [1,3).
- [3,7): lo=3 >= 2, no left piece. hi=7 > 5, add [5,7).
- [1,3): lo=1 < 2, add [1,2). hi=3 <= 5, no right piece.
- Result: [1,2), [5,7). Correct!

Remove [2, 5) from [1, 7):
- first = predecessor_le(5) = [1,7) (lo=1 <= 5).
- Walk left: [1,7) has hi=7 >= lo=2. Add. predecessor(1) = None. Stop.
- Walk right: successor(1) = None. Stop.
- to_remove = [1,7).
- [1,7): lo=1 < 2, add [1,2). hi=7 > 5, add [5,7).
- Result: [1,2), [5,7). Correct!

Remove [2, 5) from [1, 2), [2, 5), [5, 7):
- first = predecessor_le(5) = [2,5) (lo=2 <= 5).
- Walk left: [2,5) has hi=5 >= lo=2. Add. predecessor(2) = [1,2). [1,2) has hi=2 >= lo=2. Add. predecessor(1) = None. Stop.
- Walk right: successor(2) = [5,7). [5,7) has lo=5 <= hi=5. Add. successor(5) = None. Stop.
- to_remove = [2,5), [1,2), [5,7).
- [2,5): lo=2 >= 2, no left. hi=5 <= 5, no right.
- [1,2): lo=1 < 2, add [1,2). hi=2 <= 5, no right.
- [5,7): lo=5 >= 2, no left. hi=7 > 5, add [5,7).
- Result: [1,2), [5,7). Correct!

Wait, but [1,2) was removed and re-added. That's fine - it's the same interval.

Hmm, actually I realize there might be an issue. When I remove [1,2) and re-add [1,2), and also remove [5,7) and re-add [5,7), the net effect is that [2,5) is removed. Correct.

Now let me also think about `contains(x)` with the touching-merge semantics. Since I'm merging touching intervals in the internal representation, `contains(x)` works the same way.

Actually wait, I need to double-check: if I have [1,3) and [3,5) merged into [1,5), then contains(3) should be True (3 is in [1,5)). Let me verify: predecessor_le(3) in the tree gives the node with lo=1 (since 1 <= 3). 3 < 5? Yes. So contains(3) = True. Correct.

Without merging: [1,3) and [3,5). predecessor_le(3) gives [3,5) (lo=3 <= 3). 3 < 5? Yes. contains(3) = True. Also correct.

OK so both work. But since I'm merging, it's simpler.

Let me finalize the code. I think I need to use `_predecessor_le` for the add/remove operations.

Actually, let me reconsider. In the `_predecessor_le` function:
```python
def _predecessor_le(self, key):
    node = self._root
    pred = None
    while node is not None:
        if node.lo <= key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred
```

This finds the node with the largest lo <= key. Good.

And `_predecessor` (strict):
```python
def _predecessor(self, key):
    node = self._root
    pred = None
    while node is not None:
        if node.lo < key:
            pred = node
            node = node.right
        else:
            node = node.left
    return pred
```

This finds the node with the largest lo < key. Used for walking left.

And `_successor` (strict):
```python
def _successor(self, key):
    node = self._root
    succ = None
    while node is not None:
        if node.lo > key:
            succ = node
            node = node.left
        else:
            node = node.right
    return succ
```

This finds the node with the smallest lo > key. Used for walking right.

Let me put together the final solution. I'll also add a `random` seed or just use `random.random()` for priorities.

One more thing: the problem says "Bounds may be ints or floats. Keep the original values (no rounding)." This means I should not convert between int and float. If lo is an int, keep it as int. Python handles this naturally since I'm just storing the values.

Let me write the final clean version:

```python
import random


class _Node:
    __slots__ = ('lo', 'hi', 'priority', 'left', 'right')

    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.priority = random.random()
        self.left = None
        self.right = None


class IntervalSet:
    def __init__(self):
        self._root = None
        self._size = 0

    # --- Treap operations ---

    def _rotate_right(self, y):
        x = y.left
        y.left = x.right
        x.right = y
        return x

    def _rotate_left(self, x):
        y = x.right
        x.right = y.left
        y.left = x
        return y

    def _insert_node(self, root, node):
        if root is None:
            return node
        if node.lo < root.lo:
            root.left = self._insert_node(root.left, node)
            if node.priority > root.priority:
                return self._rotate_right(root)
        else:
            root.right = self._insert_node(root.right, node)
            if node.priority > root.priority:
                return self._rotate_left(root)
        return root

    def _delete_node(self, root, key):
        if root is None:
            return None
        if key < root.lo:
            root.left = self._delete_node(root.left, key)
            return root
        elif key > root.lo:
            root.right = self._delete_node(root.right, key)
            return root
        else:
            if root.left is None:
                return root.right
            if root.right is None:
                return root.left
            if root.left.priority > root.right.priority:
                new_root = self._rotate_right(root)
                new_root.right = self._delete_node(new_root.right, key)
                return new_root
            else:
                new_root = self._rotate_left(root)
                new_root.left = self._delete_node(new_root.left, key)
                return new_root

    # --- Search helpers ---

    def _predecessor(self, key):
        """Node with largest lo < key (strict)."""
        node = self._root
        pred = None
        while node is not None:
            if node.lo < key:
                pred = node
                node = node.right
            else:
                node = node.left
        return pred

    def _predecessor_le(self, key):
        """Node with largest lo <= key."""
        node = self._root
        pred = None
        while node is not None:
            if node.lo <= key:
                pred = node
                node = node.right
            else:
                node = node.left
        return pred

    def _successor(self, key):
        """Node with smallest lo > key (strict)."""
        node = self._root
        succ = None
        while node is not None:
            if node.lo > key:
                succ = node
                node = node.left
            else:
                node = node.right
        return succ

    # --- Public API ---

    def add(self, lo, hi):
        if lo >= hi:
            return

        first = self._predecessor_le(hi)
        to_remove = []

        # Walk left while interval.hi >= lo
        node = first
        while node is not None and node.hi >= lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right while interval.lo <= hi
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo <= hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        if to_remove:
            merged_lo = min(lo, min(n.lo for n in to_remove))
            merged_hi = max(hi, max(n.hi for n in to_remove))
        else:
            merged_lo = lo
            merged_hi = hi

        for n in to_remove:
            self._root = self._delete_node(self._root, n.lo)
            self._size -= 1

        self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
        self._size += 1

    def remove(self, lo, hi):
        if lo >= hi:
            return

        first = self._predecessor_le(hi)
        to_remove = []

        # Walk left while interval.hi >= lo
        node = first
        while node is not None and node.hi >= lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right while interval.lo <= hi
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo <= hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        for n in to_remove:
            self._root = self._delete_node(self._root, n.lo)
            self._size -= 1
            if n.lo < lo:
                self._root = self._insert_node(self._root, _Node(n.lo, lo))
                self._size += 1
            if n.hi > hi:
                self._root = self._insert_node(self._root, _Node(hi, n.hi))
                self._size += 1

    def contains(self, x):
        node = self._root
        pred = None
        while node is not None:
            if node.lo <= x:
                pred = node
                node = node.right
            else:
                node = node.left
        return pred is not None and x < pred.hi

    def total_length(self):
        total = 0
        stack = []
        node = self._root
        while node is not None or stack:
            while node is not None:
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
        while node is not None or stack:
            while node is not None:
                stack.append(node)
                node = node.left
            node = stack.pop()
            result.append((node.lo, node.hi))
            node = node.right
        return result

    def __len__(self):
        return self._size
```

Wait, I need to double-check the `remove` method. When I remove intervals and add back pieces, I'm inserting them one by one. But could the pieces I add back overlap with each other or with remaining intervals?

The pieces are:
- [n.lo, lo) for the leftmost removed interval (if n.lo < lo)
- [hi, n.hi) for the rightmost removed interval (if n.hi > hi)

These two pieces don't overlap with each other (lo <= hi, so [n.lo, lo) ends at lo and [hi, n.hi) starts at hi, and lo <= hi).

They don't overlap with non-removed intervals because the removed intervals were contiguous and the pieces are at the boundaries.

But wait, what if I have multiple removed intervals and the leftmost one has lo < lo_of_remove, and I add [n.lo, lo). Then later I process another removed interval that also has lo < lo_of_remove? No, only the leftmost removed interval can have lo < lo_of_remove (since they're sorted and contiguous).

Actually, let me reconsider. The removed intervals are sorted by lo. The leftmost one has the smallest lo. Only that one can have lo < lo_of_remove. The others have lo >= leftmost.lo, but since they all overlap with [lo, hi), they have lo < hi. Wait, they could have lo < lo_of_remove too if... no. Since they're sorted by lo and the leftmost has the smallest lo, only the leftmost can have lo < lo_of_remove.

Hmm, actually no. Consider: remove [3, 5) from [1, 4), [4, 6).
- Overlapping: [1,4) (hi=4 >= lo=3), [4,6) (lo=4 <= hi=5).
- to_remove = [1,4), [4,6).
- [1,4): lo=1 < 3, add [1,3). hi=4 <= 5, no right.
- [4,6): lo=4 >= 3, no left. hi=6 > 5, add [5,6).
- Result: [1,3), [5,6). Correct!

And remove [3, 5) from [1, 3), [3, 6):
- Overlapping: [1,3) (hi=3 >= lo=3), [3,6) (lo=3 <= hi=5).
- to_remove = [1,3), [3,6).
- [1,3): lo=1 < 3, add [1,3). hi=3 <= 5, no right.
- [3,6): lo=3 >= 3, no left. hi=6 > 5, add [5,6).
- Result: [1,3), [5,6). Correct!

Wait, [1,3) was removed and re-added as [1,3). That's fine.

What about remove [2, 4) from [1, 5)?
- Overlapping: [1,5) (hi=5 >= lo=2, lo=1 <= hi=4).
- to_remove = [1,5).
- [1,5): lo=1 < 2, add [1,2). hi=5 > 4, add [4,5).
- Result: [1,2), [4,5). Correct!

Looks good. Let me also think about potential issues with the treap:

1. Duplicate keys: Can I have two intervals with the same lo? No, because intervals are disjoint. If two intervals have the same lo, they'd overlap (both start at the same point). So no duplicates.

2. The `_insert_node` handles the case where node.lo == root.lo. In my code, `if node.lo < root.lo` goes left, `else` goes right. So equal keys go right. But since we never have duplicate keys, this shouldn't matter.

3. Memory: Each node has 5 attributes. For 60,000 nodes, that's about 60,000 * 5 * 8 bytes ≈ 2.4 MB. Fine.

4. Recursion depth: Treap height is O(log n) ≈ 16-20 for 60,000 nodes. Python's default recursion limit is 1000, so we're fine.

I think the solution is correct. Let me write the final version.

Actually, one more thought: the `min(n.lo for n in to_remove)` and `max(n.hi for n in to_remove)` - if to_remove is large, this is O(k) where k is the number of removed intervals. But in the worst case (one giant interval covering everything), k could be large. However, for the performance test (60,000 small disjoint intervals), each add only removes 0 or 1 intervals, so it's O(1) per add. Fine.

Let me also make sure I handle the edge case where `first` is None in the right walk. If first is None, it means no interval has lo <= hi. So the leftmost interval has lo > hi. The while condition `node.lo <= hi` will be False immediately. So the right walk does nothing. Good.

I'm satisfied with the solution. Let me write it up cleanly.
