

```python
import bisect


class IntervalSet:
    """Stores a set of real numbers as disjoint half-open intervals [lo, hi)."""

    def __init__(self):
        self._los: list = []
        self._his: list = []
        self._total: float = 0

    def add(self, lo, hi):
        """Add [lo, hi) to the set, merging with overlapping or adjacent intervals."""
        if lo >= hi:
            return
        # Find the first interval that overlaps or touches [lo, hi)
        start_idx = bisect.bisect_left(self._los, lo)
        if start_idx > 0 and self._his[start_idx - 1] >= lo:
            start_idx -= 1
        # Find the last interval that overlaps or touches [lo, hi)
        end_idx = bisect.bisect_right(self._los, hi) - 1

        new_lo = lo
        new_hi = hi
        if start_idx <= end_idx:
            new_lo = min(lo, self._los[start_idx])
            new_hi = max(hi, self._his[end_idx])
            # Subtract lengths of intervals being absorbed
            for i in range(start_idx, end_idx + 1):
                self._total -= self._his[i] - self._los[i]

        self._total += new_hi - new_lo
        self._los[start_idx:end_idx + 1] = [new_lo]
        self._his[start_idx:end_idx + 1] = [new_hi]

    def remove(self, lo, hi):
        """Remove [lo, hi) from the set, splitting intervals as needed."""
        if lo >= hi:
            return
        # Find the first interval that strictly overlaps [lo, hi)
        start_idx = bisect.bisect_left(self._los, lo)
        if start_idx > 0 and self._his[start_idx - 1] > lo:
            start_idx -= 1
        # Find the last interval that strictly overlaps [lo, hi)
        end_idx = bisect.bisect_left(self._los, hi) - 1

        if start_idx > end_idx:
            return

        new_los = []
        new_his = []
        for i in range(start_idx, end_idx + 1):
            a = self._los[i]
            b = self._his[i]
            if a < lo:
                new_los.append(a)
                new_his.append(lo)
            if b > hi:
                new_los.append(hi)
                new_his.append(b)

        removed = 0
        for i in range(start_idx, end_idx + 1):
            removed += self._his[i] - self._los[i]
        added = 0
        for i in range(len(new_los)):
            added += new_his[i] - new_los[i]
        self._total += added - removed

        self._los[start_idx:end_idx + 1] = new_los
        self._his[start_idx:end_idx + 1] = new_his

    def contains(self, x) -> bool:
        """Return True if x is in the set."""
        i = bisect.bisect_right(self._los, x) - 1
        if i >= 0 and x < self._his[i]:
            return True
        return False

    def total_length(self):
        """Return the total length of all intervals."""
        return self._total

    def intervals(self) -> list[tuple]:
        """Return all intervals as sorted (lo, hi) tuples."""
        return list(zip(self._los, self._his))

    def __len__(self):
        return len(self._los)
```