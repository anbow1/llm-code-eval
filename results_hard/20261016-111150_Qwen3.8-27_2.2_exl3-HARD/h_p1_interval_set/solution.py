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

    # ---------- Treap internals ----------

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

    # ---------- Search helpers (O(log n)) ----------

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

    # ---------- Public API ----------

    def add(self, lo, hi):
        if lo >= hi:
            return

        # Find the rightmost interval whose lo <= hi (candidate for merge)
        first = self._predecessor_le(hi)
        to_remove = []

        # Walk left: intervals with hi >= lo interact (overlap or touch)
        node = first
        while node is not None and node.hi >= lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right: intervals with lo <= hi interact (overlap or touch)
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo <= hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        # Merge into a single interval
        if to_remove:
            merged_lo = min(lo, min(n.lo for n in to_remove))
            merged_hi = max(hi, max(n.hi for n in to_remove))
        else:
            merged_lo = lo
            merged_hi = hi

        # Remove overlapping/touching intervals
        for n in to_remove:
            self._root = self._delete_node(self._root, n.lo)
            self._size -= 1

        # Insert the merged interval
        self._root = self._insert_node(self._root, _Node(merged_lo, merged_hi))
        self._size += 1

    def remove(self, lo, hi):
        if lo >= hi:
            return

        first = self._predecessor_le(hi)
        to_remove = []

        # Walk left: intervals with hi >= lo
        node = first
        while node is not None and node.hi >= lo:
            to_remove.append(node)
            node = self._predecessor(node.lo)

        # Walk right: intervals with lo <= hi
        if first is not None:
            node = self._successor(first.lo)
        else:
            node = self._root
        while node is not None and node.lo <= hi:
            to_remove.append(node)
            node = self._successor(node.lo)

        # Remove each interval; add back the portions outside [lo, hi)
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
        """O(log n): find the interval with the largest lo <= x, check x < hi."""
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
        """Sorted, disjoint, touching intervals already merged."""
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
