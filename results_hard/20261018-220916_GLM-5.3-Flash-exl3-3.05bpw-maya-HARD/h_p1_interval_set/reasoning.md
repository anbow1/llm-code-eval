Classic interval set with sorted list, bisect. For 60,000 disjoint adds in random order: naive insert into a Python list is O(n) per insert → 60,000 * 30,000 average shifts... list insertion is memmove, fast (~C level). 60k inserts into a list of up to 60k elements: memmove of pointers, ~ 60k*60k/2 = 1.8e9 pointer moves but memmove is very fast (~GB/s); 1.8e9*8 bytes ≈ 14GB moved — might be a couple seconds. Hmm, "well under 5 seconds" — memmove of 14 GB is ~2-3 s. Risky. Alternative: keep intervals in a sorted list but use a "SortedList"-like approach with buckets. Or use a balanced approach: maintain list of interval boundaries; but simpler: since standard library only, we can implement a two-level bucket structure or just accept list insertion.

Actually list.insert is O(n) memmove but with small n=60k, each insert moves ~n/2 pointers * 8 bytes = 240KB average; 60k inserts → ~14GB moved total... memmove throughput ~10GB/s so ~1.5s. Plus merging logic. Should be under 5s. contains: bisect on list, O(log n), 200k calls trivial.

But wait — "small disjoint intervals in random order" — disjoint means each add rarely merges; insertions at random positions. Also each insert may involve checking neighbors via bisect — fine.

Alternatively, implement with a skip-list or use `sortedcontainers` — not stdlib. Let's just do bisect + list. To speed up insertion, we can store two parallel lists: los and his. Insert into both via bisect.

Implementation:

self._lo = []  # sorted list of lo values
self._hi = []  # corresponding hi values

add(lo, hi):
  if lo >= hi: return
  i = bisect_right(self._hi, lo)  # first interval with hi > lo
  j = bisect_left(self._lo, hi)   # first interval with lo >= hi
  if i == j:
    # no overlap, insert at i
    self._lo.insert(i, lo); self._hi.insert(i, hi)
  else:
    new_lo = min(lo, self._lo[i])
    new_hi = max(hi, self._hi[j-1])
    self._lo[i:j] = [new_lo]
    self._hi[i:j] = [new_hi]

Wait, touching intervals should merge: [1,3)+[3,5) → [1,5). So merge condition: interval i overlaps or touches if self._lo[i] <= hi and self._hi[i] >= lo. Using bisect: intervals with hi >= lo (touching: hi == lo counts as touching, merge). Since half-open [a,b) and [b,c) merge to [a,c).

Merging predicate: merge intervals [i..j-1] where self._hi[i] >= lo and self._lo[i] <= hi. So i = bisect_left(self._hi, lo) — first interval with hi >= lo. j = bisect_right(self._lo, hi) — first interval with lo > hi. Then intervals i..j-1 all satisfy hi >= lo and lo <= hi? Check: for k in [i, j-1]: self._hi[k] >= lo (since sorted his, hi[k] >= hi[i] >= lo). self._lo[k] <= hi? lo[k] <= lo[j-1] <= hi since j = bisect_right(_lo, hi) means lo[j-1] <= hi. Yes. So merge range is [i, j).

new_lo = min(lo, self._lo[i]) if i < j else lo
new_hi = max(hi, self._hi[j-1]) if j > i else hi

If i == j: no merge, insert at position i. Note bisect_left(_hi, lo): inserting at i keeps sorted? We need lo to fit: hi[i-1] < lo (since i is first with hi >= lo, all before have hi < lo, so lo >= hi[i-1]... touching requires hi >= lo to merge; if hi[i-1] < lo, no touching, good; if hi[i-1] == lo, bisect_left finds it, merge happens). And for insertion at i: lo < ... need lo <= lo[i]? lo[i] > hi (since i == j, bisect_right(_lo, hi) == i means lo[i] > hi >= lo). Good, sorted maintained.

remove(lo, hi):
  if lo >= hi: return
  i = bisect_right(self._hi, lo)  # first interval with hi > lo (touching intervals with hi == lo are unaffected by removal)
  j = bisect_left(self._lo, hi)   # first interval with lo >= hi
  if i >= j: return
  # intervals i..j-1 overlap removal range
  new = []
  if self._lo[i] < lo: new.append((self._lo[i], lo))
  if self._hi[j-1] > hi: new.append((hi, self._hi[j-1]))
  self._lo[i:j] = [t[0] for t in new]
  self._hi[i:j] = [t[1] for t in new]

contains(x):
  i = bisect_right(self._hi, x)  # first with hi > x
  return i < len(self._lo) and self._lo[i] <= x

total_length: sum(hi-lo) — cache? Just compute; could maintain incrementally. Maintain self._total, update on add/remove. That's cheap.

intervals(): list(zip(self._lo, self._hi)).

__len__: len(self._lo).

Edge: bisect on floats/ints mixed fine.

total_length maintained: on add, diff = new_hi - new_lo minus sum of removed intervals lengths. Simpler: recompute on the merged slice: total += (new_hi - new_lo) - sum(hi[k]-lo[k] for k in range(i,j)). For add with i==j: total += hi - lo.

remove: total -= sum over removed minus kept pieces. Compute: total -= sum(self._hi[k]-self._lo[k] for k in range(i,j)); total += sum of new pieces lengths.

Let me write it cleanly.