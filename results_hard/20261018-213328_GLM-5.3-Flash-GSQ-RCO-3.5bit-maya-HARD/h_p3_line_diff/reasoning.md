Implement Myers' O((N+M)·D) diff algorithm, with prefix/suffix trimming (common prefix/suffix removal) to handle the 20,000-line case differing in ~50 places quickly. For the worst case 1000 vs 1000 completely different, D ≈ 2000, so O((N+M)·D) ≈ 2000·2000 = 4,000,000 — fine.

Need to reconstruct the edit script. Standard Myers with V arrays snapshot per D to backtrack, or recursive divide-and-conquer via middle snake. Simpler: keep per-d snapshots of V (forward) and backtrack.

Standard approach: forward Myers storing V arrays each step, then backtrack. Memory O(D^2) in worst case; D=2000 gives 2000 arrays of size 2000 → 4 million ints, fine.

Implementation:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # trim common prefix
    p = 0
    while p < n and p < m and a[p] == b[p]: p += 1
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]: s += 1
    ca, cb = a[p:n-s], b[p:m-s]
    script middle = myers(ca, cb)
    result = [("=", x) for x in a[:p]] + middle + [("=", x) for x in a[n-s:]]

Myers:

def myers(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    if max_d == 0: return []
    v = [0] * (2 * max_d + 1)  # offset max_d
    trace = []
    # find shortest edit script
    for d in range(max_d + 1):
        trace.append(v[:])  # snapshot before or after? Standard: snapshot after updating per k
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v[k-1+max_d] < v[k+1+max_d]):
                x = v[k+1+max_d]
            else:
                x = v[k-1+max_d] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[k+max_d] = x
        if v[n - m + max_d] == n:
            break
    else:
        d = max_d
    # backtrack
    ...

Backtracking: iterate trace in reverse. Standard backtrack:

    x, y = n, m
    script = []
    for d in range(len(trace)-1, 0, -1):
        v = trace[d]  # this is the V state after d... careful.

Actually trace[i] holds snapshot of V after processing d=i. To backtrack from (x,y) at d, we need V from d-1 (trace[d-1]) to determine predecessor. Standard implementation (from James Coglan's book):

    def backtrack:
        x, y = n, m
        for d in range(len(trace)-1, 0, -1):
            v = trace[d]
            k = x - y
            if k == -d or (k != d and v[k-1+offset] < v[k+offset]):
                prev_k = k + 1
            else:
                prev_k = k - 1
            prev_x = trace[d-1][prev_k + offset]
            prev_y = prev_x - prev_k
            while x > prev_x and y > prev_y:
                script.append(("=", a[x-1]))
                x -= 1; y -= 1
            if x == prev_x:
                script.append(("+", b[y-1])); y -= 1
            else:
                script.append(("-", a[x-1])); x -= 1
        # d = 0 remaining diagonal
        while x > 0 and y > 0 and ... actually at d=0, k=0, x==y, so while x>0: script.append(("=",a[x-1])); x-=1; y-=1

Wait, but trace snapshots: trace[d] should be V after completing iteration d. In my loop I append snapshot at start (before updating for d). Let me instead append copy after each d's updates. trace[d] = V after d snakes. Then backtrack uses trace[d] to get k position at d? Actually in Coglan's backtrack, v = trace[d] gives the furthest points at depth d; k = x - y where (x,y) is endpoint at depth d. Then prev points come from trace[d-1]. Hmm, actually in Coglan's approach trace[d] stores V after step d, and during backtrack he uses trace[d] with k to find prev via trace[d-1]. Let me recheck logic:

At depth d, endpoint (x,y). k = x-y. Decision at step d: which k predecessor. The condition uses v[k-1] vs v[k+1] — these are values from depth d-1 stored in... hmm, in Coglan's backtrack, trace[d] is the V after step d, but the comparison v[k-1+offset] < v[k+offset] uses values from depth d-1 (since v was copied before update? No...).

Let me think carefully. Coglan's Ruby:

def shortest_edit
  v = Array.new(2*n+1) ... actually he uses { 1 => 0 }
  trace = []
  v = {1 => 0}
  (0..n+m).each do |d|
    trace << v.clone
    (-d..d).step(2) do |k|
      if k == -d or (k != d and v[k-1] < v[k+1]) then x = v[k+1]
      else x = v[k-1] + 1 end
      y = x - k
      ... snake ...
      v[k] = x
      return trace if x >= n and y >= m
    end
  end
end

So trace[d] is the V state before step d (i.e., after step d-1). Then backtrack:

def backtrack
  x, y = a.size, b.size
  script = []
  (trace.size - 1).downto(0) do |d|
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k-1] < v[k+1]) then prev_k = k + 1
    else prev_k = k - 1 end
    prev_x = v[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y
      script << "=" a[x-1]; x-=1; y-=1
    end
    if d > 0  (or: if x == prev_x then "+" else "-")
    ...
  end
end

Since trace[d] is V before step d (values from depth d-1), the comparisons are consistent with the forward pass which also used those values. And prev_x = v[prev_k] gives the position after snake at depth d-1. Good.

At d=0: trace[0] = v = {1=>0} → in array form, v[k+1 offset]... With array representation offset by max_d: v[1] means k=1 with initial x=0? Coglan initializes v = {1 => 0}, i.e., v[k=1] = 0, which makes for k=0 at d=0... wait at d=0, k=0: condition k == -d (0==0) true → x = v[k+1] = v[1] = 0. y = 0. Then snake along diagonal 0. So initial array: set index (1+offset) = 0. Array default 0 anyway, but to be safe set v[max_d+1] = 0 explicitly? All zeros works since v[1]=0.

Hmm but with all zeros, for other d values, could v[k-1] default 0 give wrong results? In forward pass, at each d only k in [-d,d] step 2 are updated; when computing k at step d, we read v[k-1] and v[k+1] which were written at step d-1 (since parity alternates, k±1 have parity of d-1 and |k±1| ≤ d-1 when -d<k<d; for k=-d, we don't read k-1; for k=d, we don't read k+1). So defaults never read incorrectly. But careful: parity — at step d, k ≡ d (mod 2). v[k+1] written at step d-1 (since k+1 ≡ d-1). Yes.

But at d=0 in array version, k=0, condition k==-d → x = v[max_d+1]. Need v[max_d+1] = 0 — true. But wait, that's the trick: v[1]=0 means position for k=1 is x=0, so for k=0 we take x=v[1]=0, y=0. In plain array of zeros, v[max_d + 1] = 0. Good.

Edge: if n==0 and m==0 in myers (after trimming), return []. If one is empty: e.g., a empty, b non-empty: D = m. Forward: d goes up to n+m. At d=m, k=m... Let's check termination: loop for d, if after updates v[n-m+offset] == n, break. For a empty: n=0, k = -m... at d=m, k=-d=-m allowed; x = v[k+1]: at d=m, k=-m → x = v[-m+1+max_d], which was set at d-1 for k=-m+1, x = ... eventually x=0, y=0, snake none, v[-m+max_d]=0 = n → break with d=m. Backtrack gives all "+". Good.

Termination check placement: check after inner loop per d. Also handle d reaching max_d (n+m) without break — the for-else sets d... but with trace approach we don't need d explicitly; trace length determines d range. Actually backtracking loop over trace indices: trace has one entry per d iteration (including final). If break at d, trace has d+1 entries (indices 0..d). Backtrack loop from len(trace)-1 down to 1 uses trace[d] (V before step d = after d-1) — correct.

Hmm wait: trace.append before updates, so trace[i] = V after step i-1. Backtrack: endpoint at final depth D = len(trace)-1. Loop d from D down to 1: v = trace[d] (after d-1). k = x-y. prev_k decision. prev_x = v[prev_k + offset]. Then handle snake backwards, then the +/- step. After loop reaches d=0, remaining x,y ≥ 0 with x==y (k=0) — backtrack diagonal: while x>0: "=" a[x-1].

Actually at d=0, x should equal y (diagonal 0) and we output the "="s. Let me just include d=0 in the loop: at d=0, k=0, condition k==-d true → prev_k = 1, prev_x = trace[0][1+offset] = 0, prev_y = 0... hmm prev_y = prev_x - prev_k = -1. Then while x > prev_x(0) and y > prev_y(-1): output "=" for x-1, decrement. That outputs all diagonal-0 "="s correctly (y>prev_y holds since y ≥ ... y = x, decreasing until y=0 > -1 fails at y=0... wait loop: while x>0 and y>-1: x>0 fails first at x=0). Then after: "if x == prev_x: '+' else '-'". x==0==prev_x → would append "+"? But d==0, there's no step. Need guard: only do the +/- if d > 0, or check. Coglan's code handles it: in his backtrack, `(trace.size - 1).downto(0)` and inside after the while, he does:

while x > prev_x and y > prev_y: ...
if x == prev_x: prev_y... he appends "+" and y -= 1, else "-" and x -= 1 — without d>0 guard? Hmm, at d=0: x==y==0==prev_x → appends "+" with y = -1? That seems buggy... Actually let me recheck: at d=0, prev_x=0, x=0. "if x == prev_x" → x==0, prev_x==0 → true, would append "+" b[y-1] where y=0 → b[-1]! That can't be right. Let me re-examine Coglan's backtrack:

def backtrack
  x, y = a.size, b.size
  script = []
  (trace.size - 1).downto(0) do |d|
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k - 1] < v[k + 1])
      prev_k = k + 1
    else
      prev_k = k - 1
    end
    prev_x = v[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y
      yield a[x - 1], b[y - 1], x, y
      x, y = x - 1, y - 1
    end
    yield ... actually he yields diff ops differently; but the +/-:
    prev_x > 0 or prev_y > 0? Hmm.

Actually his code:
    if x == prev_x  → he checks `prev_x` ... I recall the condition is:

    y ... Let me just write my own safe backtrack:

for d in range(D, 0, -1):
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = v[prev_k + off]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        out.append(("=", a[x-1])); x -= 1; y -= 1
    if x == prev_x:  # moved down: insertion
        out.append(("+", b[y-1])); y = prev_y  # y -= 1
    else:
        out.append(("-", a[x-1])); x = prev_x  # x -= 1
then remaining d=0: while x > 0: out.append(("=", a[x-1])); x -= 1 (y decrements too).

At d=0 remaining: x == y, diagonal 0, so just "="s. 

Wait, "if x == prev_x" — after backward snake, either x==prev_x (no horizontal moves backwards, meaning forward move was vertical/down → insertion "+") or y == prev_y (forward move was horizontal/right → deletion "-"). Since forward: from (prev_x, prev_y), either down (y+1, insertion) then snake, or right (x+1, deletion) then snake. Backwards: snake back to (prev_x or prev_x+... hmm. After snake at depth d-1 ending at (prev_x, prev_y), the edit step goes to (prev_x+1, prev_y) [deletion] or (prev_x, prev_y+1) [insertion], then snake to (x,y) at depth d. Backtracking: after unwinding the snake we're at the post-edit point: (prev_x+1, prev_y) or (prev_x, prev_y+1). If x == prev_x → we're at (prev_x, prev_y+1) → insertion. Else x == prev_x + 1, y == prev_y → deletion. Good.

Edge: at depth d, is the endpoint guaranteed reachable such that prev makes sense? Yes with standard Myers.

Also the check `k != d` needed when k == d (rightmost), and `k == -d` for leftmost. Fine.

Performance concern: trace memory for worst case 1000x1000 all different: D = 2000, trace = 2001 arrays each of size 2*(n+m)+1 = 4003 → 2001*4003 ≈ 8M ints → 64MB as Python list of ints (small ints cached; list holds pointers, 8 bytes each → 64MB pointers plus int objects mostly cached small ints... but x values up to 1000, cached ints up to 256 only! Values up to 1000 create int objects, ~28 bytes each but shared? Each snapshot stores distinct int objects potentially. v[:] copies references to same int objects — since v is updated by assigning computed ints, copies share objects. Total distinct int objects bounded by number of assignments ≈ sum over d of (d+1) ≈ D²/2 = 2M ints... that's a lot, ~56MB + 64MB pointers ≈ fine-ish but heavy. Alternative: use arrays from array module or store snapshots more compactly.

Better: use the middle-snake divide and conquer (linear space) to avoid memory issues. Or use per-row dicts. Simpler alternative: store trace as list of dict/array? Let's estimate: 2001 * 4003 = 8,010,003 entries. Using array('l', ...) per snapshot: 8 bytes each → 64MB. Hmm, borderline but under 6 seconds probably.

Alternative: linear-space refinement with middle snake. That's more code but robust. Actually, memory: instead of storing full V each d, note V at depth d only has meaningful entries k ∈ [-d, d]. Could store dicts. Total entries = sum_{d=0}^{D} (2d+1) ≈ D² ≈ 4M for D=2000. Same order.

Hmm, but note trimming: two completely different lists of 1000 lines — common prefix/suffix trim won't help. D = 2000. Full trace approach: ~2000 snapshots. Let's just use arrays of int32 via array module, size 2*max_d+1 where max_d = n+m after trim = 2000 → each snapshot 4001 int32 = 16KB, ×2001 = 32MB. Acceptable. Or even better: since we only need V for backtracking comparisons and prev values, we could store only... no, full needed.

Actually alternative memory optimization: store trace as single big array where trace_d = flat[d*(2*maxd+1) : ...]. Same memory.

Alternatively use divide-and-conquer middle snake (Myers linear space). Given the hint mentions Myers O((N+M)·D), the trace approach is standard. I'll go with it, but consider a memory-light variant: store snapshots only when needed... Backtracking needs all. OK.

Speed: forward loop total ops ≈ sum over d of (d+1) ≈ D²/2 = 2M operations plus snake comparisons. Snakes in worst case are length ~0. Python: 2M iterations of inner loop with list indexing — maybe 2-4 seconds? Hmm, the requirement is 1000 vs 1000 completely different under 6 seconds. Inner loop body: several index computations. 2M iterations * maybe 1µs-2µs each = 2-4s. Should be OK but let's optimize the inner loop.

Optimization: use local variables, avoid attribute lookups. Write tight loop:

def _myers(a, b):
    n, m = len(a), len(b)
    maxd = n + m
    off = maxd
    size = 2 * maxd + 1
    v = [0] * size
    trace = []
    # ensure v[1+off] relevant: v[off+1] = 0 default fine.
    found = False
    for d in range(maxd + 1):
        trace.append(v[:])  # hmm this copies whole array each d: 2001 copies of 4001 → 8M element copies via slice, fast C-level.
        k = -d
        ... loop k from -d to d step 2 with body.

Use `for k in range(-d, d+1, 2):` — 2M iterations total in worst case.

Body:
        if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
            x = v[k+1+off]
        else:
            x = v[k-1+off] + 1
        y = x - k
        while x < n and y < m and a[x] == b[y]:
            x += 1; y += 1
        v[k+off] = x
        after loop: if v[off + n - m] == n: found, break — but check once per d, after inner loop.

Actually check can be done inside when k == n-m? Simpler: after inner loop check.

Wait, one subtlety: termination check `v[off+n-m] == n` must be evaluated after the d loop completes. But note: at depth d, position for k=n-m could also be reached mid-loop... it's fine to check after.

Hmm, one more subtlety: the check should happen as soon as possible but correctness-wise checking after the k-loop is fine.

But also there's a subtle issue: when the endpoint (n, m) is reached at some k ≠ n - m? No — (n, m) implies k = n - m. Fine.

Also possible early exit: if x >= n and y >= m during snake... x ≤ n always since snake stops at n. Actually snake condition x < n and y < m, so x ≤ n. If v[k] = x = n and y = m, then k = n-m, check catches it.

Backtrack with trace as list of lists (copies via slicing are fast).

Memory: trace entries are lists of Python ints. Values x up to 1000; ints > 256 are separate objects. Number of assignments: total k-updates ≈ D²/2 ≈ 2M new int objects... ~2M * 28 bytes = 56MB, plus trace lists: 2001 * 4001 * 8 bytes pointers = 64MB. Total ~120MB+. Might be too much? Probably acceptable but risky. Alternative: use array('i') snapshots: trace.append(array('i', v))? Copy cost similar. Memory: 2001 * 4001 * 4 bytes = 32MB. Better. But element access on array('i') creates int objects on read — slower than list. Hmm.

Alternative: linear-space Myers divide-and-conquer. Complexity O((N+M)·D) total as well, memory O(N+M). And actually often faster. But recursion with forward and backward searches doubles work. For 1000x1000 full-diff: each recursion level does O(N+M) forward+backward search; total O((N+M)·D)? The classic bound is O((N+M)D) time, O(N+M) space... Actually linear-space Myers total time is O((N+M)·D) — same. Implementation more complex though.

Let me estimate trace approach memory more carefully for the 1000x1000 worst case: n+m=2000, maxd=2000, size=4001, D up to 2000 → 2001 snapshots. As plain lists: 2001 lists * (4001*8 bytes + overhead ~ 56 bytes) ≈ 64MB pointers. Int objects: each v[k] assignment stores an int; ints ≤ 256 are shared cached. x values range 0..1000. Distinct int objects created per d: about d+1 new ints (values >256)... total ~ sum ≈ 2M minus cached ones. ~2M * 28 = 56MB. Total ~120MB. Probably OK on typical judge machines but heavy.

Reduce size: after trimming, maxd = n + m of trimmed parts. For the 20k case differing in ~50 places, trimmed lists are tiny → trivial. For 1000x1000 different, no trim. 120MB might be fine, but I could halve by noting we only need k ∈ [-d, d] for snapshot d. Store variable-length snapshots: snapshot for depth d-1 has meaningful entries k ∈ [-(d-1), d-1]. During backtrack at depth d, we access v[k-1], v[k], v[k+1] where |k| ≤ d... hmm k at depth d satisfies |k| ≤ d, and we read trace[d] at indices k-1, k, k+1 → |index| ≤ d+1? prev_k ∈ [-(d-1), d-1]... actually prev_k = k±1 with |prev_k| ≤ d-1? At depth d, |k| ≤ d, prev_k = k±1, and predecessor depth is d-1, so |prev_k| ≤ d-1 necessarily (valid states). And the comparison reads v[k-1], v[k+1] which are depth d-1 values: need |k±1| ≤ d-1 → |k| ≤ d-2, unless guarded by k==-d / k==d conditions which skip those reads. So trace[d] needs indices k ∈ [-(d-1), d-1]. But storing variable-length snapshots complicates indexing. Simpler: offset each snapshot: store trace[d] as list of length 2*d+1 (values for k in [-d..d]... wait trace[d] = V after step d-1, meaningful k ∈ [-(d-1), d-1] but during forward at step d we read k±1 ∈ [-(d+1), d+1]? No — at forward step d we read from current v (in-place, containing depth d-1 values): indices k-1, k+1 where |k| ≤ d, guarded so we only read valid ones... k-1 read only if k != -d... condition: if k == -d: x = v[k+1]; elif k != d and v[k-1] < v[k+1]: x = v[k+1] else: x = v[k-1]+1. So reads at k+1 only when k+1 ≤ d (k != d → k+1 ≤ d... k ≤ d-1 → k+1 ≤ d ✓, and k+1 ≥ -d+1, valid depth-d? k+1 has parity d... hmm k at step d has parity d (since range(-d, d+1, 2) and -d, d same parity). k+1 has parity d-1, and |k+1| ≤ d when k ≤ d-1... wait need |k+1| ≤ d-1: k ≥ -d → k+1 ≥ -d+1; k ≤ d-1 → k+1 ≤ d. But valid depth d-1 states have |k'| ≤ d-1. k+1 ≤ d could exceed d-1 when k = d-1 → k+1 = d. But k = d-1 happens only if d-1 ≡ d mod 2 — impossible. k ranges over parity d, so k = d-1 never occurs. Max k with k≠d is d-2 → k+1 = d-1 ✓. Similarly k-1 read when k ≥ -d+2 → k-1 ≥ -d+1 ✓ and k-1 has parity d-1, |k-1| ≤ d-1 ✓. Good.

So: keep full-length v array for forward pass (simple), but for trace store only the slice v[off-d+1 : off+d] hmm — values for k ∈ [-(d-1), d-1] where d is snapshot index... trace[i] = V after step i-1 → valid k ∈ [-(i-1), i-1]. Backtrack at depth d uses trace[d] with indices prev_k ∈ [-(d-1), d-1] and comparisons at k±1 ∈ [-(d-1), d-1]. So store trace[i] = v[off-i+1 : off+i] (length 2i-1), and in backtrack map index: k + (i-1) offset. Let me double check backtrack: at depth d (from D down to 1), v_snap = trace[d], valid k ∈ [-(d-1), d-1], offset = d-1. We read v_snap[k-1+off], v_snap[k+off]? No — comparison uses depth d-1 values at k-1, k+1 where k±1 ∈ [-(d-1), d-1]: index (k±1) + off where off = d-1. And prev_x = v_snap[prev_k + off] = trace[d][prev_k + d - 1]. prev_k ∈ [-(d-1), d-1] ✓. Also need trace[d] nonempty: d ≥ 1 → length 2d-1 ≥ 1 ✓.

Memory: sum over i of (2i-1) for i=1..2001 ≈ 2001² = 4M pointers = 32MB, plus int objects ~56MB → ~88MB. Hmm still notable. 

Alternatively store trace as a single flat list with per-depth offsets — same memory.

Or: store snapshots as bytes/array('i')? Values ≤ 1000 fit in int16 even? x up to n=1000 → int16 works for n,m < 32767. But for general correctness (lists of arbitrary size), use int32 array('l') or 'i'. array('i', v_slice) conversion per depth: 2001 conversions of ~4000 elems → C-speed, fast. Memory: 4 bytes/entry → 16MB. Reads create temp ints but fine.

Hmm, but is 120MB acceptable? Typically yes for these puzzle-style constraints. But let's be safer and simpler: use array('i') for snapshots. Actually creating array('i', list) from a list of ints — C-level, ~fast. Memory 16MB. Backtrack reads: v_snap[prev_k + off] returns Python int — fine.

Actually wait — simpler idea: use a dict-based V per depth? More overhead per op. No.

Alternatively, avoid storing ints > 256 issue: values are ints; slices of list share int objects, so no duplication there. The 56MB int-object estimate: actually many assignments produce the same value? Each new int object from x = v[...] + 1 or x = v[...] (reuses existing object!). x = v[k+1+off] reuses the stored int object (no new object). x = v[k-1+off] + 1 creates new int each time. So ~half the assignments create new ints ~1M * 28 = 28MB. Plus snapshot copies reuse objects. OK total maybe ~100MB with plain lists. I'll use array('i') to be safe? But forward pass: v must support assignment — use a plain list for v during forward, and snapshot via array('i', v[lo:hi]) hmm converting slice to array: array('i', list_slice). That iterates the list creating C array — fast.

Actually, hmm, let me reconsider: is plain-list trace acceptable? 64MB pointers + 28MB ints ≈ 92MB. Probably fine. But array('i') halves pointer memory and drops int objects. Let me just do array('i') snapshots with offset per depth. Slightly more complex indexing but fine.

Actually, let me simplify: keep full-size snapshots as array('i', v) — full length 2*maxd+1 each. Memory = 2001 * 4001 * 4 = 32MB. Simple indexing with global offset everywhere. Conversion cost: array('i', v) where v is a list of 4001 — but array constructor from a list must convert each element; ~2001*4001 = 8M conversions, C speed, maybe 0.3s. Fine.

Even better: array('l')? 'i' is 2 bytes on some platforms? No — array 'i' is C int, typically 4 bytes; 'H' unsigned short 2 bytes. Use 'i' (4 bytes, at least 2). Values up to n ≤ 2*maxd could exceed 2^15? For n up to 20000 trimmed... after trim, if lists differ in 50 places among 20000, trimmed n,m are small. Worst general: n = m = 10000 fully different → D = 20000, snapshots 20001 * 40001 * 4 bytes = 3.2GB — blows up. But the constraints only require 1000x1000. Still, unbounded memory for pathological inputs... The problem only gives those two performance targets. Trace approach memory is O(D²) regardless. Linear-space middle-snake gives O(N+M) memory and handles bigger inputs. Given "Hint: Myers' O((N+M)·D)", trace-based is the intended. I'll implement trace-based but maybe with middle-snake for robustness? Let me weigh implementation risk.

Actually, I could implement the linear-space variant: find middle snake via forward/backward D-loop, recurse. Time O((N+M)·D) worst case, space O(N+M). It handles large inputs gracefully. But implementation is trickier (off-by-ones). The trace-based is well-understood and I can get it right. Given the stated performance targets (max 1000x1000 full diff), trace-based with ~92MB is fine. But what about the 20000 case? Trim makes it tiny. What if inputs are like 20000 lines with D=10000? Not required.

Hmm, but wait: worst-case time for trace-based forward pass on 1000x1000: inner k-loop total iterations = sum_{d=0}^{D} (number of k values) = sum (d+1) where step 2 → (d/2+1) ≈ D²/4 ≈ 1M iterations. Each iteration: a few list reads, a while snake check. In CPython ~0.5-1µs per simple iteration → ~1M * maybe 1.5µs = 1.5s. Plus snapshot copies: 2001 array conversions of 4001 elements ≈ 8M ops ~ 0.5s. Plus backtrack 2000 steps trivial. Total maybe ~2-3s < 6s ✓.

Could optimize forward: check termination inside loop when k == n-m to break early — no, D = n+m here anyway (fully different, D = 2000 = maxd). No early exit benefit.

Alternative optimization for the fully-different case: if D = maxd (no common elements at all... not necessarily; D = maxd means every edit is a delete+insert, i.e., LCS = 0). Not worth special-casing.

Micro-optimizations for the forward loop:
- Bind locals: a_local = a, b_local = b, n, m, off, v.
- Avoid computing k+off repeatedly: iterate k and use base index arithmetic.

Let me write:

def _shortest_edit(a, b):
    n = len(a); m = len(b)
    off = n + m
    size = 2 * off + 1
    v = [0] * size
    trace = []
    if n + m == 0:
        return trace  # empty
    for d in range(n + m + 1):
        trace.append(v[:])
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1] < v[k + 1]):
                x = v[k + 1]
            else:
                x = v[k - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k] = x
            if k == n - m and x == n:
                return trace
    return trace  # shouldn't happen

Wait — indexing v directly with k + off needed. Let me use off-adjusted indices: define vv where index = k + off. Rewrite with off:

        for k in range(-d, d + 1, 2):
            kk = k + off
            if k == -d or (k != d and v[kk - 1] < v[kk + 1]):
                x = v[kk + 1]
            else:
                x = v[kk - 1] + 1
            ...

Early return when found: but I append trace at top; on return trace includes snapshot before step d — correct for backtrack (trace[d] = V after d-1). 

But careful: returning early inside inner loop — the check `if k == n-m and x == n` — at that point y = x - k = n - (n-m) = m ✓. Return trace immediately. Good.

Hmm, but there's a subtle bug possibility: when k == n-m and k == -d and also d... all fine.

One more subtlety: the condition when k == -d: x = v[kk+1]. At d=0, k=0: kk+1 = off+1 → v[off+1] must be 0 ✓ (default). But what if a previous step wrote v[off+1]? v[off+1] corresponds to k=1, written at odd d. At d=0 nothing written yet. ✓.

But wait, at d=1: k=-1 → k==-d → x = v[kk+1] = v[off+0] = v[off] — written at d=0 for k=0 ✓ (that's depth-0 value). Good.

Now trimming: trim common prefix and suffix in the outer function, then run myers on middle, then reassemble. Note: trimming is essential for the 20000-line case. Trimming doesn't affect minimality (LCS length preserved? LCS(a,b) = prefix + LCS(middle) + suffix — yes, standard).

Also handle trivial: after trim, if ca empty: result = [("+", x) for x in cb]; if cb empty: [("-", x) for x in ca].

Backtrack implementation:

def _backtrack(a, b, trace):
    off = len(a) + len(b)
    x, y = len(a), len(b)
    out = []
    for d in range(len(trace) - 1, 0, -1):
        v = trace[d]
        k = x - y
        if k == -d or (k != d and v[k - 1 + off] < v[k + 1 + off]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k + off]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            out.append(("=", a[x - 1]))
            x -= 1; y -= 1
        if x == prev_x:
            out.append(("+", b[y - 1]))
            y -= 1
        else:
            out.append(("-", a[x - 1]))
            x -= 1
    while x > 0:
        out.append(("=", a[x - 1]))
        x -= 1; y -= 1  # y = x here
    out.reverse()
    return out

Wait — in backtrack, trace[d] = V after step d-1 (snapshot taken at start of step d). The values in trace[d] at index k+off are furthest x at depth d-1 for diagonal k. The comparison v[k-1+off] < v[k+1+off] uses depth d-1 values — matches forward decision ✓. prev_x = furthest point at depth d-1 on diagonal prev_k ✓.

But careful with the k == -d guard in backtrack: at depth d, current k = x - y where (x,y) endpoint at depth d, so |k| ≤ d. If k == -d... same guard logic as forward ✓. k != d guard ✓. Also when k == d... fine.

At d == 0 after loop: x == y (since remaining trace[0] handled?) Actually loop goes down to d=1, then leftover x,y correspond to depth 0 state on... after processing d=1, we're at depth 0: position on diagonal 0 after the depth-0 snake, i.e., (x0, x0). Then final while outputs "="s ✓.

Hmm wait: at depth 0 the snake from (0,0) along diagonal 0 gives point (x0, x0) with x0 = length of common prefix of trimmed a,b... but trimmed a,b have no common prefix! Since we trimmed, a[0] != b[0] (unless one is empty). So x0 = 0 and leftover loop does nothing. Fine either way — keep the general loop for safety.

Actually hold on: if trimmed middle has common prefix... we trimmed maximally, so a'[0] != b'[0] and a'[-1] != b'[-1] (when both nonempty). So depth-0 snake is 0. OK.

Edge: trace length could be 1 (d=0 only) if trimmed both empty — handled earlier before calling myers. If trace returned early at d=0 (k=0, x==n and y==m with n==m==0)? Guarded.

Also: `if k == n - m and x == n` — wait, need y == m too, which follows from k = n-m and x = n → y = n - (n-m) = m ✓.

Hmm, one more forward subtlety: the early-return check placed inside the k-loop after v[k] = x. But should check only... it's correct: the first time the furthest point on diagonal n-m reaches x=n is at the minimal D. ✓

Now, potential issue: `k != d and v[kk-1] < v[kk+1]` — when k == d, we must take the else branch (x = v[k-1]+1). When k == -d, take x = v[k+1]. Standard ✓.

Backtrack guard subtlety: when k == -d, prev_k = k+1; when k == d, prev_k = k-1. In my backtrack: `if k == -d or (k != d and v[k-1+off] < v[k+1+off])`. If k == -d and k == d (d=0, k=0) — but backtrack loop starts at d ≥ 1. For d ≥ 1, k == -d implies k != d ✓.

Also reading v[k-1+off] when k == d-1... k has parity d; k == d-1 impossible. k-1 read only if k != -d and k != d → k ∈ (-d, d), k±1 ∈ [-d+1, d-1] valid ✓.

Now the outer diff_lines:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # common prefix
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    # common suffix
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    ca = a[p:n - s]
    cb = b[p:m - s]
    out = []
    out.extend(("=", line) for line in a[:p])
    if not ca:
        out.extend(("+", line) for line in cb)
    elif not cb:
        out.extend(("-", line) for line in ca)
    else:
        out.extend(_myers_script(ca, cb))
    out.extend(("=", line) for line in a[n - s:])
    return out

_myers_script = _shortest_edit + backtrack combined.

Memory optimization decision: plain list snapshots (v[:]) — 2001 lists × 4001 slots. Let me just compute: 64MB pointer arrays + int objects ~28MB → ~92MB peak. Hmm. Alternatively, snapshot only meaningful slice? During backtrack at depth d we access trace[d] at indices (k±1)+off and prev_k+off with |k±1| ≤ d-1... wait |k±1| could be up to d-1 where k ∈ [-(d-2)... ] hmm we showed k±1 ∈ [-(d-1), d-1]. And prev_k ∈ [-(d-1), d-1]. So trace[d] needs only k ∈ [-(d-1), d-1], i.e., slice v[off-d+1 : off+d] (length 2d-1). Storing sliced copies: total memory sum_{d=1}^{D} (2d-1) ≈ D² = 4M pointers = 32MB (vs 64MB). Plus index adjustment: trace[d] index = k + (d-1). That saves half. Implement:

forward:
    for d in range(maxd+1):
        trace.append(v[off - d + 1 : off + d])  # values for k ∈ [-(d-1), d-1]
        ...

Wait, at snapshot time (start of step d), valid entries are k ∈ [-(d-1), d-1] — from step d-1. Slice bounds: index off-(d-1) to off+(d-1)+1 → v[off-d+1 : off+d]. Length = (off+d) - (off-d+1) = 2d-1 ✓. For d=0: v[off+1:off] = [] — empty snapshot, fine (never used in backtrack since loop goes to d ≥ 1).

backtrack at depth d: snap = trace[d]; base = d - 1; reads snap[k-1+base], snap[k+1+base], snap[prev_k+base]. k±1 ∈ [-(d-1), d-1] → indices [0, 2d-2] ✓; prev_k ∈ [-(d-1), d-1] ✓.

Total pointer memory ≈ D² = 4M × 8 = 32MB; list objects 2001 × ~56B negligible. Int objects: slices copy references ✓.

For n=m=1000 fully different: D=2000, sum ≈ 4M entries → 32MB + ints ~28MB = 60MB. 

Alternatively skip snapshotting entirely with Hirschberg middle-snake... I'll go with sliced snapshots.

Hmm, but slicing creates a new list each d — 2001 slice ops of avg 2000 elements = 4M element copies, fast C.

Let me also double-check the forward loop reads never go out of the meaningful region into stale-but-present values that could corrupt: forward uses full-size v, reads v[k±1+off] where those were written in step d-1 ✓ (shown earlier). Initial v all zeros — reads at d=1, k=-1: reads v[off+0] (written d=0 ✓). At d=1, k=1: condition k != -d, k == d → else: x = v[k-1+off]+1 = v[off]+1 = 1 (written at d=0 as 0) → x=1, y=0 ✓ (delete a[0]).

Termination when n==0, m>0 (trimmed): d loop, at d=m, k=-m: k==-d → x = v[k+1+off]... chain: at depth d, diagonal -d... eventually x=0=n, y=m ✓ check k == n-m = -m and x == n=0 ✓ returns at d=m.

Now the snake loop for 1000x1000 fully different: a[x]==b[y] always false → snake is one comparison per k-iteration. 1M iterations × (guard checks + comparison) — fine.

Actually wait, worst case D for 1000x1000 with no common lines: D = n + m = 2000, and inner iterations = sum_{d=0}^{2000} (number of k with parity d in [-d,d]) = sum_{d} (d+1)... number of k values in range(-d,d+1,2) = d+1. Sum_{d=0}^{2000} (d+1) ≈ 2001*2002/2 ≈ 2M. Hmm, 2M iterations, each with ~6-8 bytecode-heavy ops → maybe 1.5-2.5s in CPython. Plus trace slices ~0.2s. Under 6s ✓. For the 20000 case: trim reduces to ~50-100 lines, D ~ 100 → instant ✓.

Can I speed the inner loop? Minor: precompute nothing much. One trick: iterate kk (offset index) instead of k, computing y = x - k needs k though. Keep as is.

Another micro-opt: check `if k == n - m and x == n` — could restrict to when k == n-m: `if kk == n - m + off and x == n`. Fine.

Alternative to reduce work: since D ≥ |n - m| and we could... no, keep simple.

Let me also think about whether `trace.append(v[off - d + 1 : off + d])` at d where snapshot needed... Also note when we return early from inside the k-loop, trace currently has d+1 entries (indices 0..d) where trace[d] is the pre-step-d snapshot ✓.

Also: what if maxd loop completes without finding (impossible — D ≤ n+m always reachable). The final return covers it.

Now assemble _myers_script:

def _myers_script(a, b):
    n = len(a); m = len(b)
    maxd = n + m
    off = maxd
    v = [0] * (2 * maxd + 1)
    trace = []
    for d in range(maxd + 1):
        trace.append(v[off - d + 1 : off + d])
        for k in range(-d, d + 1, 2):
            kk = k + off
            if k == -d or (k != d and v[kk - 1] < v[kk + 1]):
                x = v[kk + 1]
            else:
                x = v[kk - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[kk] = x
            if kk == n - m + off and x == n:
                # backtrack
                return _backtrack(a, b, trace, d, x, y)  # or inline
    return _backtrack(a, b, trace, ...)

Hmm — backtrack needs to know final depth D and endpoint. Endpoint is (n, m). D = len(trace) - 1. So _backtrack(a, b, trace) with x,y = n,m and D = len(trace)-1 works in all cases. 

Wait: careful — when we early-return, trace has entries 0..d, len = d+1, D = d ✓.

_backtrack with sliced snapshots:

def _backtrack(a, b, trace):
    n, m = len(a), len(b)
    x, y = n, m
    out = []
    for d in range(len(trace) - 1, 0, -1):
        snap = trace[d]
        base = d - 1
        k = x - y
        if k == -d or (k != d and snap[k - 1 + base] < snap[k + 1 + base]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = snap[prev_k + base]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            out.append(("=", a[x - 1]))
            x -= 1; y -= 1
        if x == prev_x:
            out.append(("+", b[y - 1]))
            y -= 1
        else:
            out.append(("-", a[x - 1]))
            x -= 1
    while x > 0:
        out.append(("=", a[x - 1]))
        x -= 1
    out.reverse()
    return out

Check index bounds: snap length 2d-1, indices used: k-1+base, k+1+base, prev_k+base. k ∈ [-d, d] but guards: if k == -d → read snap[k+1+base] = snap[base + 1 - d + 1] = snap[0]? k+1+base = -d + 1 + d - 1 = 0 ✓ (snap nonempty for d≥1). If k == d → else branch reads snap[k-1+base] = d-1+d-1 = 2d-2 = last index ✓. If -d < k < d: reads k-1+base ≥ -d+1+d-1 = 0 ✓ and k+1+base ≤ d-1+d-1 = 2d-2 ✓. prev_k ∈ [-d+1, d-1] → prev_k+base ∈ [0, 2d-2] ✓.

Hmm wait: is prev_k guaranteed in [-(d-1), d-1]? prev_k = k±1, |k| ≤ d, so |prev_k| ≤ d+1?? If k = d, prev_k = d-1 ✓; if k = -d, prev_k = -d+1 ✓; else |prev_k| ≤ d... k ∈ (-d,d) with parity d → |k| ≤ d-2 → |prev_k| ≤ d-1 ✓. Good. But also, is snap[prev_k+base] a valid depth-(d-1) furthest point? Yes — it was set in forward step d-1 (prev_k has parity d-1, |prev_k| ≤ d-1 ✓).

Edge: what if k == d at depth d in backtrack but snap[k-1+base]... k=d → else → prev_k = d-1 ✓.

Also: `k == -d or (k != d and ...)` — if k == -d and d==0? Loop starts at d ≥ 1 ✓.

But wait, there's a subtle issue in backtrack with the condition when k == -d: forward at depth d for k == -d takes x = v[k+1] (from diagonal k+1 at depth d-1, moving down/insertion first). Backtrack guard matches ✓.

Now correctness of minimality: Myers gives LCS = (n + m - D)/2 where D is minimal. The "=" count in output = number of diagonal moves = n + m - D... n - (#deletions) where #deletions + #insertions = D and each "=" consumes one from both... total "=" = n - D_- = m - D_+ . ✓ maximal since D minimal.

Trimming and LCS: LCS(a,b) = p + LCS(ca, cb) + s. Standard argument: any common subsequence can include the full common prefix and suffix... Actually is that exactly true? If a and b share prefix p and suffix s (non-overlapping after trim), then LCS(a,b) = p + LCS(middle_a, middle_b) + s. Proof sketch: take any LCS; map it... Hmm, is it always optimal to take the entire common prefix? Consider a = [x, y], b = [x, y]: prefix trim takes both. Consider a = [x, x], b = [x]: prefix trims one x, middle a=[x], b=[] → LCS total 1 = LCS([x,x],[x]) = 1 ✓. Known result: trimming common prefix/suffix preserves LCS and one minimal script. Yes — standard pre-processing in Myers implementations (e.g., in the paper: "note that the prefix and suffix can be handled separately"). Actually the Myers paper itself says D-path... it's well-established that common prefix/suffix trimming is safe. ✓

One concern: property "taking '=' and '-' in order gives exactly a" — with trim reassembly: "=" prefix from a[:p], then middle script's "="+"-" gives ca in order, then "=" suffix ✓. Similarly for b ✓.

Now performance of trimming for 20000 lines differing in 50 places: prefix/suffix while loops O(n) Python-level comparisons... 20000 iterations × 2 loops = 40000 string comparisons — fast (strings cached equality). Actually string comparison of long identical strings could be O(len)? Python caches equality... no, `==` on str compares content but has fast path for identical objects / interned. Lines from file parsing could be equal-content different objects → O(len) each. Worst: 20000 lines × O(line length). If lines ~100 chars → 2M char comparisons C-speed, fine.

Hmm, but actually there's a subtle trim inefficiency: while loop per element in Python — 40k iterations, trivial.

Now let me also double check the early-return placement: we append snapshot for step d, then process k values. If found at k = n-m within step d, return trace — trace[d] is pre-step-d ✓, and endpoint (x, y) = (n, m). Backtrack uses x,y = n,m and D = len(trace)-1 = d ✓.

Also need to handle: what if trimmed ca and cb are both non-empty but... fine.

What about when a == b entirely (trim consumes everything, ca=cb=[]): out = all "=" ✓.

Let me now also double-check the forward v initialization issue: v[off+1] must be 0 for d=0. v all zeros ✓. But there's another subtle standard pitfall: v[k] for k not yet valid might hold stale values from smaller d? Parity ensures reads only touch entries written at d-1 ✓ (proved above). Except... at d=0 we read v[off+1] (k+1 = 1, "parity" -1?? d=0, k=0, k+1=1 which would be depth... it's the sentinel {1=>0}). v[off+1] = 0 ✓ never written before d=0 ✓. Later steps never read v[off+1] as sentinel again? At d≥1, reads are all valid d-1 entries. But v[off+1] gets written at d=1 (k=1) with real value — fine.

Also sentinel for backward? Not needed.

One more check of forward condition correctness: standard Myers:

if k == -d or (k != d and v[k-1] < v[k+1]): x = v[k+1]  # down (insertion)
else: x = v[k-1] + 1  # right (deletion)

✓ matches.

Now write final code. Also guard: diff_lines on empty lists → returns []. Trim handles: n=m=0 → p=0, s=0, ca=cb=[] → out=[] ✓.

Also make sure _backtrack's final `while x > 0` — also should decrement y? y equals x there (k=0 leftover)? After processing d=1, the state is at depth 0, which is post-snake on diagonal 0 → x == y. The leftover "="s consume from both; y isn't used after. Fine.

Let me trace a small example manually to verify. a = ["a"], b = ["b"]. Trim: p=0, s=0 (n-p=1, m-p=1, a[0]!=b[0]). ca=["a"], cb=["b"]. myers: n=m=1, maxd=2, off=2, v=[0]*5.

d=0: trace.append(v[off-0+1 : off+0]) = v[3:2] = [] . k=0: kk=2. k==-d (0==0) → x = v[3] = 0. y = 0. snake: x<1,y<1, a[0]=="a" vs b[0]=="b" no. v[2] = 0. check kk == n-m+off = 2 ✓ and x==n? 0 != 1. continue.
d=1: trace.append(v[off-1+1 : off+1]) = v[2:3] = [0]. k=-1: kk=1. k==-d → x = v[2] = 0. y = 0 - (-1) = 1. snake: x<1 ✓, y<1 ✗ → none. v[1] = 0. check kk == 2? no.
k=1: kk=3. k!=-d, k==d → else: x = v[2] + 1 = 1. y = 1-1 = 0. snake: x<1 ✗. v[3] = 1. check kk==2? no.
d=2: trace.append(v[1:3]) = [0, 0]. k=-2: kk=0. k==-d → x = v[1] = 0. y = 2. snake no. v[0]=0. check kk==2? no.
k=0: kk=2. k!=-d, k!=d, v[1] < v[3] → 0 < 1 ✓ → x = v[3] = 1. y = 1. snake: x<1 ✗. v[2] = 1. check kk==2 ✓ and x==1==n ✓ → return trace (len 3).

Backtrack: x=y=1. d=2: snap = trace[2] = [0,0], base=1. k = 0. k != -d(2), k != d, snap[k-1+base]=snap[1]=0 < snap[2+1]=snap[3]?? snap has length 2d-1 = 3, indices 0..2. snap[k+1+base] = snap[0+1+1] = snap[2] = 0. 0 < 0 false → else: prev_k = -1. prev_x = snap[-1+1] = snap[0] = 0. prev_y = 0 - (-1) = 1. Snake back: while x > 0 and y > 1: y=1 not > 1 → none. x == prev_x? x=1 != 0 → "-" a[0]; x = 0. out = [("-", "a")].
d=1: snap = trace[1] = [0], base=0. k = x - y = 0 - 1 = -1. k == -d (-1 == -1) ✓ → prev_k = 0. prev_x = snap[0+0] = 0. prev_y = 0. snake: x>0? no. x == prev_x (0==0) → "+" b[y-1] = b[0] = "b"; y = 0. out = [("-","a"), ("+","b")].
Final while: x=0 → none. reverse → [("+","b"), ("-","a")]. 

Check: "="+"-" items → a = ["a"] ✓ ("-" "a"). "="+"+" → b = ["b"] ✓. Minimal (LCS=0, one delete one insert) ✓.

Another example: a = ["x","a","b","y"], b = ["x","b","a","y"]? Trim prefix ["x"], suffix ["y"], ca = ["a","b"], cb = ["b","a"]. LCS = 1. Myers should output e.g. "-", "=", "+", "=" or "+" "-" "=" "=" depending. Let's trust the algorithm.

Let me verify another tricky backtrack detail: when the forward snake at step d-1 ended at prev point, then step d move + snake to (x,y). During backtrack we unwind snake comparing a[x-1]==... we just output "=" without verifying — fine since diagonal moves correspond.

Also potential issue: in backtrack, could `while x > prev_x and y > prev_y` overshoot/undershoot leaving x>prev_x but y==prev_y (deletion) or vice versa — handled by the if/else ✓. Could both x>prev_x and y>prev_y remain after the loop? Only if loop exited incorrectly — no, loop runs until one condition fails; if both still greater it continues. So after loop: x==prev_x or y==prev_y (or both? both means no edit step at depth d — impossible since depth increases... could x==prev_x and y==prev_y? That would mean the step d move didn't happen — can't, since endpoint at depth d differs from depth d-1 point by at least the edit. But what if snake... the edit step always increments one coordinate. So after unwinding, exactly one of x==prev_x / y==prev_y holds... unless the snake unwinding: we stop when x==prev_x or y==prev_y. Suppose forward: prev=(0,0), edit right → (1,0), snake to (3,2)? No — snake keeps x-y constant (diagonal k=d), so from (1,0) diagonal k=1, snake to (x,y) with x-y=1. Backtrack: k=1, unwind to y == prev_y=0 → x = 1 = prev_x+1 → "-" branch ✓. Suppose edit down → (0,1), diagonal k=-1, unwind to x == prev_x = 0 → "+" ✓. Both x==prev_x and y==prev_y simultaneously would require endpoint on same point — impossible at d ≥ 1. But floating case: what if after unwinding x==prev_x AND y>prev_y — "+" ✓; y==prev_y and x>prev_x — "-" ✓. Good.

Hmm, wait: what if the unwinding stops because x == prev_x while y > prev_y, but actually the true path had a deletion?? No — diagonal k = x-y constant during unwinding; prev point at depth d-1 is on diagonal prev_k = k∓1. The edit step connects diagonals. Fine.

Now — one more correctness concern about the forward guard: `k != d and v[kk-1] < v[kk+1]`. Note when k+1... we proved reads valid. But stale values: entries at index kk±1 with parity (d-1) but |kk±1| > d-1 (i.e., = d+1?) — k+1 where k = d... guarded by k != d. k+1 max = d-1+... k ≤ d-2 (parity) → k+1 ≤ d-1 ✓. k-1 min: k ≥ -d+2 → k-1 ≥ -d+1 ✓. All good.

Now performance detail: trace slices at each d: `v[off - d + 1 : off + d]` — for d=0 gives v[off+1:off] = [] ✓.

Wait, backtrack at depth d uses trace[d] = snapshot taken at start of step d = V after step d-1, sliced to k ∈ [-(d-1), d-1] = indices off-(d-1) .. off+(d-1). Slice v[off-d+1 : off+d] covers indices off-d+1 ... off+d-1 = k from -d+1 to d-1 ✓ exactly [-(d-1), d-1] ✓.

Memory: sum_{d=0}^{D}(2d-1) ≈ D² entries. For D=2000: ~4M entries * 8B = 32MB ✓.

Time for slicing: total ~4M element copies ≈ 0.1-0.3s ✓.

Alternatively, could avoid slices for small d... negligible.

Now, also think: could there be an issue with extremely long common stretches making snake loops slow? Snake total length across all d ≤ ... each snake step is bounded by n,m per d but total over d could be O(D·min(n,m))? Actually total snake work in Myers is O((N+M)·D) worst case but typically the sum of snake lengths... In the worst case (all equal lines), trimming handles it. Generally fine.

Actually hmm — worst-case snake work: for each d, each k, snake length can be up to min(n,m). Total O(D²·?) — no, standard bound O((N+M)D) total including snakes? The Myers paper: worst case O((N+M)D). Fine for our targets.

For the 20000-differ-50 case: trim → tiny ✓.

Let me now also consider recursion-free, all good.

Write final code:

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    ca = a[p:n - s]
    cb = b[p:m - s]
    result = [("=", line) for line in a[:p]]
    if not ca:
        result += [("+", line) for line in cb]
    elif not cb:
        result += [("-", line) for line in ca]
    else:
        result += _diff_middle(ca, cb)
    result += [("=", line) for line in a[n - s:]]
    return result

def _diff_middle(a, b):
    n = len(a)
    m = len(b)
    off = n + m
    v = [0] * (2 * off + 1)
    trace = []
    target_k = n - m + off
    for d in range(off + 1):
        trace.append(v[off - d + 1 : off + d])
        for k in range(-d, d + 1, 2):
            kk = k + off
            if k == -d or (k != d and v[kk - 1] < v[kk + 1]):
                x = v[kk + 1]
            else:
                x = v[kk - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[kk] = x
            if kk == target_k and x == n:
                return _backtrack(a, b, trace)
    return _backtrack(a, b, trace)  # unreachable

Wait — one issue: `for d in range(off + 1)` — off = n+m, D_max = n+m ✓. If n+m=0 we don't call _diff_middle (guarded). But also if, say, n=0? We guard ca empty before calling. But to be safe _diff_middle could handle n==0 or m==0: does the algorithm work? n=0, m=3: d=0: k=0, x = v[off+1] = 0 = n, y=0, check kk==target_k = -0+off = off ✓ but x == n=0 ✓ → returns at d=0! Wait that's wrong — at d=0, k=0, x=0, y=0, target kk = 0 - 3 + off = off - 3 ≠ off. Hmm target_k = n - m + off = -3 + off. kk = 0 + off = off ≠ off-3 ✓ no false trigger. Then proceeds until d=3 where diagonal -3 reaches x=0=n ✓. Good, so _diff_middle handles n=0 or m=0 correctly anyway. Keep guard in diff_lines anyway (or just always call _diff_middle when ca or cb nonempty... my branching handles empty cases directly; fine).

Actually simpler: in diff_lines, if ca and cb both nonempty → _diff_middle; else emit +/- directly ✓ as written.

_backtrack as above.

Double-check `_backtrack` final loop also handles y? At that point x == y. OK.

Let me re-examine trace slicing edge at d=1: v[off : off+1] → [v[off]] = value for k=0 at depth 0 ✓, base=0, snap[prev_k + 0] with prev_k ∈ {−0?}: at depth d=1, k = ±1. If k=1 (k==d): prev_k = 0 → snap[0] ✓. If k=-1: prev_k = 0 → snap[0] ✓. Good.

Now also consider potential issue: `if k == -d or (k != d and v[kk - 1] < v[kk + 1])` in backtrack: when k == d, Python evaluates k == -d (false), then k != d → False → short-circuit → else ✓, no index read of kk+1 (which would be 2d-1+... snap[k+1+base] = snap[d+1+d-1] = snap[2d] out of range — but short-circuit prevents evaluation ✓). When k == -d: first condition true → no read of snap[k-1+base] ✓ (would be index -1 → snap[-1] wraps! but not evaluated ✓). Careful: k == -d → prev_k = k+1 branch ✓.

But in forward, similar: k == -d → x = v[kk+1]; kk+1 = off-d+1 ≥ 0 ✓ for d ≤ off... d max = off → kk+1 = 1 ✓.

Also forward at k == d: else → v[kk-1], kk-1 = off+d-1 ≤ 2*off-1 ✓.

Edge case: what if n+m+... d = off, k = off (parity: off and d=off same parity ✓ k=d=off= n+m). kk-1 = 2*off-1 ✓ in range.

Now — the check `if kk == target_k and x == n` — note y = x - k; when kk == target_k, y = n - (n-m) = m ✓ automatically. Good.

One more potential subtlety: is it possible that the first time v[target_k] == n occurs at some d, but that point is NOT reachable as an endpoint of a valid d-path producing a consistent backtrack? In standard Myers, yes it's valid — the furthest-reaching point on the diagonal is derived from valid (d-1)-paths. ✓

I think the algorithm is solid. Let me also consider: the problem says lines can repeat — Myers handles that naturally.

Let me now think about worst-case timing more concretely for 1000 vs 1000 completely different:
- d loop 2001 iterations, snapshot slices: total elements = sum_{d=0}^{2000} (2d-1) ≈ 4M — slice copy fast (~0.05s).
- inner k loop: ~2M iterations. Each iteration: ~10 bytecodes + comparisons + a couple list index ops + function-free. Estimate ~0.7–1.5 µs → 1.5–3s. Hmm, could be near limits on slow machines but target is 6s. Also snake: 1 comparison per k-iteration (a[x]==b[y] with x==n or y==m bounds first...). Order of conditions: `while x < n and y < m and a[x] == b[y]` — for fully different, one string compare per iteration entry; string compare of different 1-char lines fast.

Micro-optimization: hoist `a` and `b` into locals (they already are parameters). Use `n` local ✓.

Another micro-opt: replace `if kk == target_k and x == n` with checking only when k == n - m: `if k == n_minus_m and x == n`. Minor.

Could reduce inner-loop work by handling d=0 specially? negligible.

Alternative bigger optimization: for the common case where many k iterations do trivial snakes... skip.

Also consider: two lists of 20000 differing in ~50 places — trim reduces to ≤ ~100 each → D ≤ 200, trace ~201 slices of ~401 → trivial ✓. But wait: trim loops 20000 each with string comparisons — fine.

However — potential worst-case hidden: what if there's no common prefix/suffix but lists are 20000 each differing in 50 places in the middle (e.g., different first and last lines)? Then trim gives ~20000-length middles with D≈100. Myers O((N+M)·D) = 40000·100 = 4M... but with the trace algorithm, per d we iterate k from -d to d — total sum ≈ D² = 10000 iterations ✓ plus snakes: each snake can be long — total snake work bounded by O((N+M)·D)? Snakes: at each d, for each k, snake extends... total snake length across all (d,k) — each diagonal k visited at ~multiple d values; snake from v[k±1] positions... Standard worst case O((N+M)D) = 4M snake steps max — actually snake steps total is bounded by number of (d,k) pairs times... hmm, real bound: each snake step advances x+y by 2 and there are O((N+M)·D)? No — the standard bound on total snake work in Myers is O((N+M)·D) — but more precisely, snakes on the same diagonal at consecutive d's start where previous ended? Not exactly — v[k] at depth d is ≥ v at depth d-2 on same diagonal? The furthest point on diagonal k at depth d+2 is at least depth-d point + 1 (via down-right-down-right? Actually from depth d point on diagonal k, one can do: down, right → two edits → diagonal k at depth d+2 with x ≥ previous x... snake extends further). So snake total per diagonal ≤ (max extension) ≈ n per diagonal... total ≈ (number of diagonals) × n?? = O(D·N)? That equals O((N+M)·D)? D ≤ N+M so O((N+M)·D) ✓ consistent. For the 20000/D=100 case: 100 diagonals × snake work — but snake work per diagonal across all d is bounded by n (positions only advance per diagonal? v on diagonal k at depth d vs depth d-2: point can only move forward along diagonal, so total snake steps per diagonal ≤ n + m → total ≤ (2D+1)(n+m)? Hmm that's D·(N+M) = 100·40000 = 4M worst — but realistically far less since snakes only extend when lines match; with 50 differing places, matches are long runs... each d/k snake re-walks? Let me think: on diagonal k, the furthest point at depth d, then at depth d+1 the same diagonal isn't processed (parity), at depth d+2 snake starts from v[k±1 at d+1] ± 1 which is ≥ previous point on diagonal k... the snake re-walks matched lines already counted? The furthest point on diagonal k at depth d+2 ≥ furthest at depth d (since +2 edits keep you ≥ same x? from (x, x-k) at depth d: down, right → (x+1, x+1-k+... down then right: (x, y+1) then (x+1, y+1): x+1 ≥ x ✓, then snake). So per diagonal, monotonic → total snake steps per diagonal ≤ n. Total ≤ D·n?? For D=100, n=20000: 2M snake steps worst case, each a string comparison... but actually per diagonal the snake steps total ≤ n+m and number of diagonals ≤ 2D+1 = 201 → ≤ 4M string equality checks in the worst hypothetical, ~1-2s. Acceptable, and realistically much less. OK.

Actually the classic optimization for repeated snakes: none needed here.

Now, also the required signature uses list[str]. Fine.

Let me also think again whether trimming could break the "minimal =" count requirement in weird overlap cases: trim stops when s reaches n-p or m-p, so prefix and suffix don't overlap ✓.

Hmm, one classic subtlety: trimming common prefix AND suffix simultaneously — is LCS(ca, cb) + p + s always equal to LCS(a,b)? Yes, this is standard (e.g., used in GNU diff, Myers implementations). Proof: any common subsequence of a,b: consider LCS Z. The prefix x's... Let me trust it; it's well-established. Actually let me double check with a tricky example: a = [a, x, a], b = [a, a]. Common prefix: a (p=1). Suffix: a[-1]=a vs b[-1]=a → s=1, but then n-p-s = 1, m-p-s = 0, stop (s < m - p fails: s=1, m-p=1 → stop at s=1? condition s < m - p: 1 < 1 false → s stays... wait loop: while s < n-p and s < m-p and a[n-1-s]==b[m-1-s]: initially s=0: 0<2 and 0<1 and a[2]==b[1] (a==a) → s=1. Next: 1<2 and 1<1 false → stop, s=1. ca = a[1:2] = [x], cb = b[1:1] = []. LCS total = 1 + 0 + 1 = 2 ✓ LCS([a,x,a],[a,a]) = 2 ✓.

Another: a=[x,a], b=[a,x]: p=0, s: a[1]=a vs b[1]=x → no. ca=[x,a], cb=[a,x]. LCS=1 ✓.

OK.

Now finalize code. Also add type hints as given. Only stdlib — we use nothing. Return list[tuple[str,str]].

Let me write clean final:

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Strip the common prefix and suffix (they are always kept verbatim);
    # this makes near-identical large inputs fast and never changes an
    # optimal script.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    out = [("=", line) for line in a[:p]]

    mid_a = a[p:n - s]
    mid_b = b[p:m - s]
    if not mid_a:
        out.extend(("+", line) for line in mid_b)
    elif not mid_b:
        out.extend(("-", line) for line in mid_a)
    else:
        out.extend(_edit_script(mid_a, mid_b))

    out.extend(("=", line) for line in a[n - s:])
    return out


def _edit_script(a, b):
    n = len(a)
    m = len(b)
    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)
    trace = []
    target = off + n - m
    for d in range(max_d + 1):
        trace.append(v[off - d + 1:off + d])
        for k in range(-d, d + 1, 2):
            kk = k + off
            if k == -d or (k != d and v[kk - 1] < v[kk + 1]):
                x = v[kk + 1]
            else:
                x = v[kk - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[kk] = x
            if kk == target and x == n:
                return _backtrack(a, b, trace)
    return _backtrack(a, b, trace)


def _backtrack(a, b, trace):
    n = len(a)
    x = n
    y = len(b)
    out = []
    for d in range(len(trace) - 1, 0, -1):
        snap = trace[d]
        base = d - 1
        k = x - y
        if k == -d or (k != d and snap[k - 1 + base] < snap[k + 1 + base]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = snap[prev_k + base]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            out.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if x == prev_x:
            out.append(("+", b[y - 1]))
            y -= 1
        else:
            out.append(("-", a[x - 1]))
            x -= 1
    while x > 0:
        out.append(("=", a[x - 1]))
        x -= 1
    out.reverse()
    return out

Wait, in _backtrack, "while x > 0" — should also ensure y decrements? y not used after; but for cleanliness y -= 1 too. Also is x == y guaranteed there? At depth 0, the path is on diagonal 0 → x == y ✓.

Hmm, one more check on _backtrack guard when k == d: condition `k == -d or (k != d and ...)` → False or (False and ...) → False → else prev_k = k-1 ✓. When k == -d and k == d impossible for d≥1.

Also potential negative index trap in _backtrack: snap[k - 1 + base] when k == -d would be snap[-1] (negative index wraps!) — but guarded by short-circuit ✓. snap[k + 1 + base] when k == d: index 2d — out of range — guarded by k != d ✓ (short-circuit: `k != d and snap[...]` — Python doesn't evaluate the second operand if first false ✓).

Now think again about whether the early return in _edit_script might return a trace where backtrack is consistent: trace[d] snapshot pre-step-d ✓; endpoint (n,m) at depth d ✓; loop covers depths d..1 ✓.

Also — the fallback `return _backtrack(a, b, trace)` after the for loop: for loop always returns inside... except when max_d = ... can the loop complete without triggering? At d = max_d = n+m, k = n-m is included (parity: n-m ≡ n+m mod 2 ✓, |n-m| ≤ n+m ✓). At that point, does x reach n? The path with all-deletions-then... At depth D = n+m, diagonal n-m furthest x = n certainly (path: n deletions then m insertions reaches (n,m) at depth n+m, ending on diagonal n-m with x=n). So the check triggers ✓. But does the forward pass compute v[n-m] = n at d = n+m? k = n-m at step d = n+m: takes from k-1 or k+1 chains... by induction the furthest reaching point at depth d on diagonal k... at d = n+m, x = n reachable ✓. And snake condition: x<n fails → v[kk] = n ✓ trigger ✓. So fallback unreachable but harmless.

Now consider performance detail once more: the snapshot slice `v[off - d + 1: off + d]` — when d=0: `v[off+1:off]` → [] ✓ (start > stop gives empty).

Memory concern revisited for 1000×1000 fully different: D = 2000. trace slices total elements = sum_{d=0}^{2000} (2d-1) ≈ 2001² = 4.004M → 32MB pointers + shared int objects (x values 0..1000, distinct objects ~1000 → tiny!). Wait — int objects: v stores int objects; each snapshot slice copies references. Distinct int objects in v: values change over time; each assignment x = v[...] + 1 creates a new int (unless small cached ≤256). Over the whole run, assignments ≈ 2M, each creating possibly a new int object of value up to 1000 — these persist as long as referenced by any snapshot. Worst case ~2M × 28B = 56MB. Hmm. Actually many assignments reuse: x = v[kk+1] reuses existing object (no new). x = v[kk-1] + 1 creates new. Roughly half the k's take each branch → ~1M new ints ≈ 28MB. Total ~60MB. Fine.

Alternatively, to cut memory further, snapshot as array('i', ...) — but conversion iterates and creates C array, dropping Python ints → memory 4 bytes/elem = 16MB, and backtracking reads create temp ints. Cost: array creation 2001×avg2000 = 4M conversions — maybe 0.3s. I'll keep plain lists; 60MB acceptable.

Now double-check time budget for the trace approach on 1000x1000: inner loop ~2M iterations. Let me count ops per iteration: range next, k comparison(s), kk = k+off, guard branch, v reads, y calc, snake bounds check (2 comparisons + maybe string compare), v write, target check. ~15-20 bytecodes ≈ maybe 1µs → ~2s. Plus slicing 0.1s. Plus backtrack 2000 iterations trivial. Total ~2-3s ✓ under 6s. Could optimize by using a flat approach... acceptable.

Optional speedup: skip the `if kk == target and x == n` check except when k == n-m: minor. Another: for d where both branches... keep simple.

Hmm, one more micro-optimization that meaningfully helps: avoid recomputing `k + off` — we need k for y and guards and kk for indexing. Fine.

Let me also reconsider: is it worth adding the "trapezoid"/unique-line optimization? No, not needed.

Edge case: duplicate lines everywhere (e.g., a = ["x"]*1000, b = ["x"]*1000 with some changes) — trim + small D ✓.

Edge: a=["x"]*1000, b=["x"]*999 → trim prefix 999, suffix... p=999 stops (p < m fails at p=999? m=999: p goes 0..998 → p=999? while p < m → p=999 stops when p==999... p<999 false → p=999? Loop: p increments while conditions hold; at p=999, p<m false → p=999. n-p = 1, m-p = 0 → s=0. mid_a = ["x"], mid_b = [] → "-" ✓. Result: 999 "=" + 1 "-" ✓ minimal ✓.

Now, the guarantee "number of '=' items equals LCS length" — Myers guarantees minimal D → maximal matches ✓.

I'm fairly confident. Let me also mentally test a = ["a","b","c"], b = ["b","c","d"]: trim prefix 0 (a[0]!=b[0]), suffix: a[2]=c vs b[2]=d → 0. Myers on 3×3.

n=m=3, off=6, v size 13, target = 6.
d=0: trace: v[7:6]=[] . k=0: kk=6, k==-d → x=v[7]=0, y=0. snake: a[0]="a" vs b[0]="b" no. v[6]=0. target check: kk==6 ✓ x==3? no.
d=1: trace v[6:7]=[0]. k=-1: kk=5. k==-d → x=v[6]=0, y=1. snake: a[0]="a" vs b[1]="c"? no. v[5]=0. kk==6? no.
k=1: kk=7. k==d → else: x=v[6]+1=1, y=0. snake: a[1]="b" vs b[0]="b" ✓ → x=2,y=1; a[2]="c" vs b[1]="c" ✓ → x=3,y=2; x<3 fails. v[7]=3. kk==6? no.
d=2: trace v[5:7]=[0,3]. k=-2: kk=4. x=v[5]=0, y=2. snake: a[0]="a" vs b[2]="d" no. v[4]=0.
k=0: kk=6. v[5]=0 < v[7]=3 ✓ → x=v[7]=3, y=3. snake: x<3 fail. v[6]=3. kk==6 ✓ x==3 ✓ → return.

trace = [[], [0], [0,3]] len 3, D=2. Backtrack: x=y=3.
d=2: snap=[0,3], base=1. k=0. k!=-2, k!=2, snap[k-1+1]=snap[0]=0 < snap[2]=3 ✓ → prev_k=1. prev_x = snap[2] = 3. prev_y = 3-1=2. snake back: x>3? no. x==prev_x (3==3) → "+" b[y-1]=b[2]="d", y=2. out=[("+","d")].
d=1: snap=[0], base=0. k = x-y = 3-2 = 1. k==-1? no. k != d (1 != 1 false) → else: prev_k = 0. prev_x = snap[0] = 0. prev_y = 0. snake back: while x>0 and y>0: out "=" a[2]="c" x=2 y=1; "=" a[1]="b" x=1 y=0; stop (y>0 fail). x==prev_x? 1 != 0 → "-" a[x-1]=a[0]="a", x=0. out=[("+","d"),("=","c"),("=","b"),("-","a")].
final: x=0 done. reversed: [("-","a"),("=","b"),("=","c"),("+","d")].

Check: "=",- gives a ✓; "=",+ gives ["b","c","d"] ✓. "=" count 2 = LCS(["a","b","c"],["b","c","d"]) = 2 ✓. 

Also test with deletion+insertion interleaving: a=["a","b"], b=["b","a"]: trim: p=0, s: a[1]=b vs b[1]=a no. n=m=2, off=4, target=4.
d=0: k=0: x=v[5]=0,y=0; a[0]="a" vs b[0]="b" no; v[4]=0; not target(x=0≠2).
d=1: trace v[4:5]=[0]. k=-1: kk=3: x=v[4]=0, y=1; snake a[0]="a" vs b[1]="a" ✓ → x=1,y=2; y<2 fail. v[3]=1. kk==4? no. k=1: kk=5: k==d → x=v[4]+1=1, y=0; snake a[1]="b" vs b[0]="b" ✓ → x=2,y=1; x<2 fail. v[5]=2. kk==4? no.
d=2: trace v[3:5]=[1,2]. k=-2: kk=2: x=v[3]=1, y=3; y<2 fail. v[2]=1. no. k=0: kk=4: v[3]=1 < v[5]=2 ✓ → x=v[5]=2, y=2. snake fail. v[4]=2. kk==4 ✓ x==2 ✓ return.
trace=[[],[0],[1,2]] D=2. Backtrack x=y=2:
d=2: snap=[1,2] base=1, k=0: snap[0]=1 < snap[2]=2 ✓ → prev_k=1, prev_x=snap[2]=2, prev_y=1. snake: x>2 no. x==prev_x → "+" b[1]="a", y=1. out=[("+","a")].
d=1: snap=[0] base=0. k=2-1=1. k==-1 no; k != d false → prev_k=0, prev_x=0, prev_y=0. snake: x>0,y>1: "=" a[1]="b" x=1 y... wait y=1, prev_y=0: while x>0 and y>0: x=2>0, y=1>0 → "=" a[1]="b", x=1,y=0; loop: y=0 → stop. x==prev_x? 1≠0 → "-" a[0]="a", x=0. out=[("+","a"),("=","b"),("-","a")].
reversed: [("-","a"),("=","b"),("+","a")]. Check: "=",- → ["a","b"] ✓; "=",+ → ["b","a"] ✓. "=" count 1 = LCS ✓ minimal (D=2) ✓.

The code works. Final polish: add docstrings/comments, ensure only stdlib (no imports needed).

One more thought on performance target 1: "two lists of 20000 lines that differ in about 50 places must be diffed in under 2 seconds". Trim: 20000+20000 iterations of Python while loop with string comparisons ≈ 40000 × ~0.1µs... string equality for equal strings: fast if interned/same object; else O(len). ~0.05s max. Then tiny myers ✓.

But wait — what if the "differ in about 50 places" means 50 edit operations scattered, i.e., ~50 changed lines → trimmed middle ≤ ~100+ lines. ✓.

Also consider lines could be long strings; equality checks dominate but fine.

I'll present the final code with brief comments.