import random
import sys

sys.setrecursionlimit(1_000_000)
_getrandbits = random.getrandbits


class _IntervalNode:
    __slots__ = ("lo", "hi", "prio", "left", "right", "size", "length")

    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.prio = _getrandbits(64)
        self.left = None
        self.right = None
        self.size = 1
        self.length = hi - lo


def _update(node):
    left = node.left
    right = node.right

    size = 1
    length = node.hi - node.lo

    if left is not None:
        size += left.size
        length = left.length + length

    if right is not None:
        size += right.size
        length += right.length

    node.size = size
    node.length = length


def _split(root, key):
    if root is None:
        return None, None

    if root.lo < key:
        left, right = _split(root.right, key)
        root.right = left
        _update(root)
        return root, right
    else:
        left, right = _split(root.left, key)
        root.left = right
        _update(root)
        return left, root


def _merge(left, right):
    if left is None:
        return right
    if right is None:
        return left

    if left.prio < right.prio:
        left.right = _merge(left.right, right)
        _update(left)
        return left
    else:
        right.left = _merge(left, right.left)
        _update(right)
        return right


def _peek_min(root):
    while root.left is not None:
        root = root.left
    return root


def _peek_max(root):
    while root.right is not None:
        root = root.right
    return root


def _pop_min(root):
    if root.left is None:
        right = root.right
        root.right = None
        root.size = 1
        root.length = root.hi - root.lo
        return right, root

    new_left, removed = _pop_min(root.left)
    root.left = new_left
    _update(root)
    return root, removed


def _pop_max(root):
    if root.right is None:
        left = root.left
        root.left = None
        root.size = 1
        root.length = root.hi - root.lo
        return left, root

    new_right, removed = _pop_max(root.right)
    root.right = new_right
    _update(root)
    return root, removed


class IntervalSet:
    __slots__ = ("root",)

    def __init__(self):
        self.root = None

    def add(self, lo, hi):
        if not (lo < hi):
            return

        left, right = _split(self.root, lo)
        start, end = lo, hi

        while left is not None:
            node = _peek_max(left)
            if node.hi >= start:
                left, node = _pop_max(left)
                if node.lo < start:
                    start = node.lo
                if node.hi > end:
                    end = node.hi
            else:
                break

        while right is not None:
            node = _peek_min(right)
            if node.lo <= end:
                right, node = _pop_min(right)
                if node.lo < start:
                    start = node.lo
                if node.hi > end:
                    end = node.hi
            else:
                break

        self.root = _merge(_merge(left, _IntervalNode(start, end)), right)

    def remove(self, lo, hi):
        if not (lo < hi):
            return

        a, rest = _split(self.root, lo)
        b, c = _split(rest, hi)

        spanned = False

        if a is not None:
            node = _peek_max(a)
            if node.hi > lo:
                a, node = _pop_max(a)

                if node.lo < lo:
                    a = _merge(a, _IntervalNode(node.lo, lo))

                if node.hi > hi:
                    c = _merge(_IntervalNode(hi, node.hi), c)
                    spanned = True

        if b is not None:
            if not spanned:
                node = _peek_max(b)
                if node.hi > hi:
                    c = _merge(_IntervalNode(hi, node.hi), c)
            b = None

        self.root = _merge(a, c)

    def contains(self, x):
        node = self.root
        pred = None

        while node is not None:
            if x < node.lo:
                node = node.left
            else:
                pred = node
                node = node.right

        return pred is not None and x < pred.hi

    def total_length(self):
        return self.root.length if self.root is not None else 0

    def intervals(self):
        result = []
        stack = []
        node = self.root

        while stack or node is not None:
            while node is not None:
                stack.append(node)
                node = node.left

            node = stack.pop()
            result.append((node.lo, node.hi))
            node = node.right

        return result

    def __len__(self):
        return self.root.size if self.root is not None else 0
