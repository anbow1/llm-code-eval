

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

    # ------------------------------------------------------------------
    # Treap internals
    # ------------------------------------------------------------------

    def _sz(self, node):
        return node.size if node else 0

    def _update(self, node):
        node.size = 1 + self._sz(node.left) + self._sz(node.right)

    def _merge(self, a, b):
        """Merge two treaps where every key in a < every key in b."""
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
        # Bubble up by priority
        while new_node.parent and new_node.priority > new_node.parent.priority:
            if new_node is new_node.parent.left:
                self._rotate_right(new_node.parent)
            else:
                self._rotate_left(new_node.parent)
        # Refresh sizes along the path to the root
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
        """Return the node containing *lo*, or the predecessor (rightmost
        node whose hi <= lo), or None."""
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

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add(self, lo, hi):
        if lo >= hi:
            return
        start = self._find_start(lo)
        # Advance past any predecessor that does not reach *lo*
        if start is not None and start.hi < lo:
            start = self._successor(start)
        to_remove = []
        new_lo = lo
        new_hi = hi
        node = start
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