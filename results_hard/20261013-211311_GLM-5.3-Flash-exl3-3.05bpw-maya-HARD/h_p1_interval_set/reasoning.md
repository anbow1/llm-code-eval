Design: sorted list of disjoint merged intervals [lo, hi). Use bisect on a list of (lo, hi) tuples keyed by lo. add: find overlapping intervals, merge. remove: similar.

Store two parallel lists? Using bisect on list of tuples sorted by lo works since disjoint intervals: lo values unique and sorted, and bisect with key lo... bisect on list of tuples compares tuples; to find insertion point by lo, use bisect with key parameter (Python 3.10+ bisect supports key). Use bisect_left(intervals, lo, key=lambda t: t[0]).

Implementation:

add(lo, hi): if lo>=hi return. Find i = first index with interval.hi >= lo... Since intervals disjoint, find all intervals that overlap [lo,hi): those with interval.lo < hi and interval.hi > lo. Find start index via bisect on lo values: i = bisect_left(lo_list, lo) then check i-1's hi > lo. Merge: new_lo = min(lo, first overlapping interval's lo), new_hi = max(hi, last overlapping's hi). Replace slice.

Use two lists: los, his for bisect speed? Keep simple: list of tuples, but 60000 adds with merging — fine.

Let me write with lists los and his (parallel arrays) for efficiency.

def _overlapping_range(self, lo, hi): return indices [i, j) of intervals overlapping.

i = bisect_right(self.los, lo) - 1 — candidate preceding interval: if i >= 0 and self.his[i] > lo: include, start = i else start = i+1... Actually careful: interval at index i with los[i] <= lo overlaps if his[i] > lo. Then extend j: while j < n and self.los[j] < hi: j += 1. Since intervals sorted and disjoint, all intervals with los[j] < hi and index >= start overlap (their hi > lo because lo < los[j] < hi and hi > lo; yes since los[j] >= los[start]... need los[j] >= lo? intervals between start and j have los possibly < lo? No, if index > i then los[j] > los[i], and disjoint means his > los of next... intervals with index > i have los >= his[i]... anyway intervals from start..j-1 all overlap [lo,hi): interval k in (i, j): los[k] >= los[i], los[k] < hi, and his[k] > los[k] >= los[i]... need his[k] > lo: his[k] > los[k] > lo if los[k] > lo; if los[k] == lo? Only one interval can have los == lo and it'd be index i or adjacent... fine, since intervals disjoint and sorted, los[k] > lo implies his[k] > los[k] > lo. Good.)

add:
```
start, end = self._range(lo, hi)
if start == end:
    insert lo, hi at start
else:
    new_lo = min(lo, self.los[start])
    new_hi = max(hi, self.his[end-1])
    self.los[start:end] = [new_lo]
    self.his[start:end] = [new_hi]
```

remove:
```
start, end = self._range(lo, hi)
if start == end: return
# left piece
pieces = []
if self.los[start] < lo: pieces.append((self.los[start], lo))
if self.his[end-1] > hi: pieces.append((hi, self.his[end-1]))
self.los[start:end] = [p[0] for p in pieces]
self.his[start:end] = [p[1] for p in pieces]
```

contains: i = bisect_right(self.los, x) - 1; return i >= 0 and self.his[i] > x.

total_length: sum(hi - lo).

intervals: list(zip(self.los, self.his)).

__len__: len(self.los).