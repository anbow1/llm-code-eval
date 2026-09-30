```python
import sys
from random import getrandbits

sys.setrecursionlimit(1_000_000)


class IntervalSet:
    __slots__ = ("root", "_count", "_total")

    class Node:
        __slots__ = ("lo", "hi", "p", "left", "right")

        def __init__(self, lo, hi, p):
            self.lo = lo
            self.hi = hi
            self.p = p
            self.left = None
            self.right = None

    def __init__(self):
        self.root = None
        self._count = 0
        self._total = 0

    def _pred_below(self, key):
        t = self.root
        ans = None
        while t is not None:
            if t.lo < key:
                ans = t
                t = t.right
            else:
                t = t.left
        return ans

    def _succ_from(self, key):
        t = self.root
        ans = None
        while t is not None:
            if t.lo >= key:
                ans = t
                t = t.left
            else:
                t = t.right
        return ans

    def _split_less(self, t, key):
        if t is None:
            return None, None
        if t.lo < key:
            a, b = self._split_less(t.right, key)
            t.right = a
            return t, b
        else:
            a, b = self._split_less(t.left, key)
            t.left = b
            return a, t

    def _merge(self, a, b):
        if a is None:
            return b
        if b is None:
            return a
        if a.p > b.p:
            a.right = self._merge(a.right, b)
            return a
        b.left = self._merge(a, b.left)
        return b

    def _insert_node(self, t, node):
        if t is None:
            return node
        if node.p > t.p:
            l, r = self._split_less(t, node.lo)
            node.left = l
            node.right = r
            return node
        if node.lo < t.lo:
            t.left = self._insert_node(t.left, node)
        else:
            t.right = self._insert_node(t.right, node)
        return t

    def _delete(self, t, key):
        if t is None:
            return None
        if t.lo == key:
            return self._merge(t.left, t.right)
        if key < t.lo:
            t.left = self._delete(t.left, key)
        else:
            t.right = self._delete(t.right, key)
        return t

    def _insert_no_merge(self, lo, hi):
        if not (lo < hi):
            return
        self._count += 1
        self._total += hi - lo
        self.root = self._insert_node(self.root, self.Node(lo, hi, getrandbits(64)))

    def add(self, lo, hi):
        if not (lo < hi):
            return

        new_lo = lo
        new_hi = hi

        while True:
            pred = self._pred_below(new_lo)
            if pred is not None and pred.hi >= new_lo:
                self._total -= pred.hi - pred.lo
                self._count -= 1
                self.root = self._delete(self.root, pred.lo)

                if pred.lo < new_lo:
                    new_lo = pred.lo
                if pred.hi > new_hi:
                    new_hi = pred.hi
                continue

            succ = self._succ_from(new_lo)
            if succ is not None and succ.lo <= new_hi:
                self._total -= succ.hi - succ.lo
                self._count -= 1
                self.root = self._delete(self.root, succ.lo)

                if succ.lo < new_lo:
                    new_lo = succ.lo
                if succ.hi > new_hi:
                    new_hi = succ.hi
                continue

            break

        self._insert_no_merge(new_lo, new_hi)

    def remove(self, lo, hi):
        if not (lo < hi):
            return

        while True:
            pred = self._pred_below(lo)
            if pred is not None and pred.hi > lo:
                a = pred.lo
                b = pred.hi

                self._total -= b - a
                self._count -= 1
                self.root = self._delete(self.root, a)

                if a < lo:
                    self._insert_no_merge(a, lo)
                if hi < b:
                    self._insert_no_merge(hi, b)
                continue

            succ = self._succ_from(lo)
            if succ is not None and succ.lo < hi:
                a = succ.lo
                b = succ.hi

                self._total -= b - a
                self._count -= 1
                self.root = self._delete(self.root, a)

                if hi < b:
                    self._insert_no_merge(hi, b)
                continue

            break

    def contains(self, x):
        if x != x:
            return False

        t = self.root
        while t is not None:
            if x < t.lo:
                t = t.left
            elif x >= t.hi:
                t = t.right
            else:
                return True
        return False

    def total_length(self):
        if self._total != self._total:
            s = 0
            stack = []
            t = self.root
            while stack or t is not None:
                while t is not None:
                    stack.append(t)
                    t = t.left
                t = stack.pop()
                s += t.hi - t.lo
                t = t.right
            self._total = s
        return self._total

    def intervals(self):
        res = []
        stack = []
        t = self.root

        while stack or t is not None:
            while t is not None:
                stack.append(t)
                t = t.left

            t = stack.pop()
            lo = t.lo
            hi = t.hi

            if res and lo <= res[-1][1]:
                if hi > res[-1][1]:
                    res[-1] = (res[-1][0], hi)
            else:
                res.append((lo, hi))

            t = t.right

        return res

    def __len__(self):
        return self._count
```