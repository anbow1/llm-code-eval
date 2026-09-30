Use SortedList from bisect — keep sorted list. contains: bisect. add with merge: insertion via insort. 60k disjoint inserts with insort is fine (O(n) each worst-case = 60k²/2=1.8e9... too slow? Actually list.insert is memmove, fast C; 60k inserts fine).

Implementation:
- store list of lists? tuples. Use `self._ivs` sorted list of [lo, hi] lists... tuples fine with bisect on lo via key? Python 3.11 has no key in bisect? bisect key added in 3.10, yes.

Keep parallel structure: use list of tuples and a separate list of los for bisect. Simpler: separate `self._lo` list and store pairs in `_ivs`. bisect on `_lo`.

add(lo,hi): find start = bisect_right(self._lo, lo) - 1 → interval that may contain lo. Then merge: build new interval expanding while overlaps. Then splice.

Implement carefully:

idx = bisect_right(self._lo, lo) - 1
if idx >= 0 and self._ivs[idx][1] >= lo: start = idx else idx+1
end = idx: while intervals with hi... find intervals overlapping [lo,hi): those i >= start with lo < hi and hi > lo... iterate:
new_lo, new_hi = lo, hi
j = start
while j < len: l,h = ivs[j]
 if l <= new_hi: (touch or overlap) → merge: new_lo = min(new_lo,l) only if merged... careful: merged intervals touching: condition l <= new_hi (touch counts). But interval with l > new_hi stops. But if merged expands, keep looping.
 if l <= new_hi: new_lo = min(new_lo, l); new_hi = max(new_hi,h); j+=1 else break.
Also need l < hi check: interval [l,h) with l >= hi doesn't overlap — but if l == hi, they touch → merge (per spec [1,3)+[3,5) merge). So condition l <= new_hi works for merging; but first interval checked: if ivs[start] has l > hi and touch? l <= hi means overlap/touch. Good, condition l <= new_hi handles.

Edge: interval entirely after hi but touching (l == hi) merges — correct.

replace ivs[start:j] with (new_lo,new_hi), update _lo list.

remove: find overlap range, truncate/split.
idx = bisect_right(_lo, lo) - 1; start = idx if idx>=0 and _ivs[idx][1] > lo else idx+1  (touching hi==lo doesn't matter, > lo)
Actually for removal touching doesn't merge; cut.
First interval may be partially before lo: if ivs[start].lo < lo → keep [lo0, lo).
Last: interval with hi > hi and lo < hi → new interval (hi, h).
Collect pieces.

Simpler: iterate affected.

Let me just write code.