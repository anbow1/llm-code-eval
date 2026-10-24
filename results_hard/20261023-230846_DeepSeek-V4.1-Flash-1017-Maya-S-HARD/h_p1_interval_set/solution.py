_PRIO_STATE = 0x9E3779B97F4A7C15
_MASK64 = 0xFFFFFFFFFFFFFFFF


def _next_priority():
    global _PRIO_STATE
    x = _PRIO_STATE
    x ^= (x << 13) & _MASK64
    x ^= x >> 7
    x ^= (x << 17) & _MASK64
    _PRIO_STATE = x & _MASK64
    return _PRIO_STATE


class _Node:
    __slots__ = ("lo", "hi", "prio", "left", "right", "size", "total")

    def __init__(self, lo, hi):
        self.lo = lo
        self.hi = hi
        self.prio = _next_priority()
        self.left = None
        self.right = None
        self.size = 1
        self.total = hi - lo


def _update(node):
    if node is None:
        return
    size = 1
    total = node.hi - node.lo
    left = node.left
    right = node.right
    if left is not None:
        size += left.size
        total += left.total
    if right is not None:
        size += right.size
        total += right.total
    node.size = size
    node.total = total


def _merge(left, right):
    if left is None:
        return right
    if right is None:
        return left
    if left.prio > right.prio:
        left.right = _merge(left.right, right)
        _update(left)
        return left
    right.left = _merge(left, right.left)
    _update(right)
    return right


def _split(root, key):
    if root is None:
        return None, None
    if root.lo < key:
        a, b = _split(root.right, key)
        root.right = a
        _update(root)
        return root, b
    a, b = _split(root.left, key)
    root.left = b
    _update(root)
    return a, root


def _split_le(root, key):
    if root is None:
        return None, None
    if root.lo <= key:
        a, b = _split_le(root.right, key)
        root.right = a
        _update(root)
        return root, b
    a, b = _split_le(root.left, key)
    root.left = b
    _update(root)
    return a, root


def _leftmost(root):
    while root is not None and root.left is not None:
        root = root.left
    return root


def _rightmost(root):
    while root is not None and root.right is not None:
        root = root.right
    return root


class IntervalSet:
    __slots__ = ("_root",)

    def __init__(self):
        self._root = None

    def add(self, lo, hi):
        if lo >= hi:
            return

        pred = None
        succ = None
        node = self._root
        while node is not None:
            if node.lo < lo:
                pred = node
                node = node.right
            else:
                succ = node
                node = node.left

        start_key = None
        if pred is not None and pred.hi >= lo:
            start_key = pred.lo
        elif succ is not None and succ.lo <= hi:
            start_key = succ.lo

        if start_key is None:
            left, right = _split(self._root, lo)
            new_node = _Node(lo, hi)
            self._root = _merge(left, _merge(new_node, right))
            return

        left, rest = _split(self._root, start_key)
        affected, right = _split_le(rest, hi)
        last = _rightmost(affected)

        new_lo = lo if lo < start_key else start_key
        new_hi = hi if hi > last.hi else last.hi
        new_node = _Node(new_lo, new_hi)
        self._root = _merge(left, _merge(new_node, right))

    def remove(self, lo, hi):
        if lo >= hi:
            return

        pred = None
        succ = None
        node = self._root
        while node is not None:
            if node.lo < lo:
                pred = node
                node = node.right
            else:
                succ = node
                node = node.left

        start_key = None
        if pred is not None and pred.hi > lo:
            start_key = pred.lo
        elif succ is not None and succ.lo < hi:
            start_key = succ.lo

        if start_key is None:
            return

        left, rest = _split(self._root, start_key)
        affected, right = _split(rest, hi)

        first = _leftmost(affected)
        last = _rightmost(affected)

        pieces = None
        if first.lo < lo:
            pieces = _Node(first.lo, lo)

        if last.hi > hi:
            right_piece = _Node(hi, last.hi)
            if pieces is None:
                pieces = right_piece
            else:
                pieces = _merge(pieces, right_piece)

        self._root = _merge(left, _merge(pieces, right))

    def contains(self, x):
        node = self._root
        while node is not None:
            if x < node.lo:
                node = node.left
            elif x >= node.hi:
                node = node.right
            else:
                return True
        return False

    def total_length(self):
        return self._root.total if self._root is not None else 0

    def intervals(self):
        result = []
        stack = []
        node = self._root
        while stack or node is not None:
            while node is not None:
                stack.append(node)
                node = node.left
            node = stack.pop()
            result.append((node.lo, node.hi))
            node = node.right
        return result

    def __len__(self):
        return self._root.size if self._root is not None else 0
