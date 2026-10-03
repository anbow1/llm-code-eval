Implement Myers' algorithm with linear-space refinement for the large-similar case, or use the classic O((N+M)D) forward/backward with divide-and-conquer (linear space) to reconstruct the script — otherwise memory for trace would be large for D small but 20k lines it's fine actually: trace stores V arrays per D step; D~100 small so fine. But worst-case fully different 1000 lines: D=2000, trace memory ~ D * (D) ints ~ 2e6, fine. But we should also handle general cases robustly. Implement Myers with divide-and-conquer middle snake for linear memory, or simpler: store trace of V arrays. For 20,000 lines similar with D≈100: forward Myers finds D=100 quickly, storing 100 arrays of size ~100 each — trivial. For 1000 fully different: D=2000, storing 2000 arrays of size up to 2000 → 2e6 ints, fine (<2s? O(ND) = 2000*1000*2 = 4e6 operations, fine).

But worst case for e.g. 20000 fully different: O(ND) = 2e8*... that's 20000*40000 = 8e8 — too slow. But spec only requires those two cases. Still, to be safe, maybe implement the linear-space divide & conquer variant which is O((N+M)D) always. That's safer. Let me implement Myers recursive with middle snake.

Plan: function diff_lines(a, b). Handle trivial cases: trim common prefix/suffix first (helps a lot). If one empty, return list of ("-", x) / ("+", y). Use recursive _diff(lo_a, hi_a, lo_b, hi_b) using Myers forward and backward to find middle snake, then recurse.

Simplest correct approach: use Myers with trace (backward? no, forward with trace of V per d), then backtrack to get edit script. Given the performance constraints, trace approach works:

- Case 1: N=20000, D small (~100): trace fine.
- Case 2: N=M=1000, D=2000: trace = list of V arrays per d: for each d, V array of size 2d+1 (or 2*max+1 fixed). Total memory ~ sum_{d=0}^{2000} (2d) ≈ 4e6 ints. OK. Time O((N+M)D) = 4e6. OK.

But what if lists are e.g. 20000 lines completely different? Then D=40000, trace memory = sum 2d ≈ 1.6e9 ints — too much, time too slow too. Not required though. Could implement linear-space variant to be safe. But complexity of implementing middle snake correctly is higher. Alternatively hybrid: use trace-based when (N+M)*D expected small — but D unknown upfront. Could implement linear-space Myers properly; it's well-defined. Let me do linear space divide-and-conquer.

Standard algorithm (Myers 1986, "An O(ND) Difference Algorithm and Its Variations"):

Find middle snake: given a[0..N-1], b[0..M-1], run forward D-path search and reverse D-path search concurrently until overlap found, giving a snake (x, y, u, v) — the middle snake. Then recursively diff prefix a[0..x], b[0..y] and suffix a[0..u]... Actually snake gives rectangle split: diff([0,x],[0,y]) and diff([u,N],[v,M]) where snake spans from (x,y) to (u,v) of equal elements.

Implementation details (from Myers paper / common ports):

Forward: V_f indexed by k in [-D..D], stores furthest x with k-delta. Backward similar with delta = N - M.

Let delta = (N - M). Odd/even consideration.

A common implementation (e.g., from "Myers diff in linear space" article by James Coglan):

- For odd D, look for overlap in forward search when k in {-(D-1)..., (D-1)} reversed... Let me recall Coglan's Ruby implementation:

```
def find_middle_snake
  reverse_x, reverse_y = size_x, size_y  (using N, M with offset 1)
  ...
```

Alternative simpler approach: implement forward Myers with trace but cap on total memory; not needed.

Actually maybe simplest robust approach: trim prefix/suffix, then:

- If min size small (say N*M small enough, like N*M <= 5,000,000?) use DP LCS? For 1000x1000 fully different = 1e6 cells DP: fine under 6 seconds in Python? 1e6 cell operations in pure Python: roughly 1–2 seconds. That satisfies case 2. And case 1 uses Myers trace (D small). But the DP path reconstruction: backtrack gives LCS. That's easy and correct.

But a hybrid could fail if e.g. two lists of 1000 with D=500 — Myers trace handles that fine too (memory ~ sum 2d for d to 500 ≈ 250k, fine).

Plan:
1. Trim common prefix and suffix.
2. If remaining a or b empty: emit straight runs.
3. Else compute via Myers forward with trace, but bound: expected cost. We don't know D in advance. We could first compute a quick upper bound on D using a cheap heuristic? Alternatively implement linear-space Myers middle-snake recursion — always O((N+M)D) time, O(N+M) space. This is the clean solution. Let me write it carefully.

Myers middle snake algorithm (following the paper):

Given substrings A = a[0:N], B = b[0:M], delta = N - M.

Forward search over d = 0, 1, 2, ...:
- Vf[k] = furthest reaching x for diagonal k using at most d edits (forward), with k in [-d, d] step 2. Vf maps k -> x; y = x - k.
- Initialize Vf[1] = 0 (i.e., x of diagonal 1 = 0 so y = -1).

Backward search over d = 0, 1, 2, ...:
- Vb[k] = furthest reaching x (smallest x) for diagonal k measured from the end. Diagonal k defined as x - y relative to... The paper defines backward Vr[k] where k = x - y and r = the reverse D-path. Vb[k] = the smallest x reachable (since going backwards, further means smaller x). Actually the paper: reverse paths start at (N, M), k = x - y with offset. Vb[k] = x such that from (N - ... ) Hmm.

Let me instead use Coglan's formulation which I remember reasonably well:

From James Coglan's "The Myers diff algorithm: part 3" blog:

```
def find_middle_snake(size_x, size_y, a, b)
  # a, b indexed with x, y in range 1..size (1-based)
  delta = size_x - size_y
  max = size_x + size_y
  forward = { 1 => 0 }
  reverse = { delta - 1 => size_x }  # hmm
```

Actually his code:

```ruby
def find_middle_snake
  reverse_offset = @size_x - @size_y
  max = @size_x + @size_y

  forward = { 1 => 0 }
  reverse = { reverse_offset - 1 => @size_x }

  odd = delta % 2 == 1 (delta odd?)
  d = 0
  loop:
    # update forward
    for offset in -d..d step 2:
      if offset == -d or (offset != d and forward[offset-1] < forward[offset+1])
        x = forward[offset+1]
      else
        x = forward[offset-1] + 1
      y = x - offset
      while x < @size_x and y < @size_y and seq_a[x] == seq_b[y]   # 1-based; snake
        x += 1; y += 1
      forward[offset] = x
      # check overlap when odd delta and offset in range
      if odd and offset in (reverse_offset - (d-1))..(reverse_offset + (d-1))  i.e., reverse_offset-d < offset < reverse_offset+d
        if x >= reverse[offset]  (with reverse indexed similarly)
          return middle snake
    # update reverse
    for offset in ... step 2 around reverse_offset:
      if offset == reverse_offset + d ... etc.
```

This is fiddly. Let me write it from scratch carefully in my own terms with 0-based indices.

Definitions:
- We diff A = a[0:N], B = b[0:M]. Use V arrays as dicts or arrays with offset.

Forward Myers (standard):
Vf[k] for k in [-d, d]: x value of furthest reaching forward path on diagonal k, where y = x - k.
Init: Vf[1] = 0, Vf[-1] = -1 (or just set Vf[1]=0 so that when k=-d we take from Vf[-d+1]).

Standard forward step for d >= 1? Actually d starts at 0: check k=0, x=0, y=0, extend snake.

Forward loop:
```
for d in 0.. :
    for k in range(-d, d+1, 2):
        # find x
        if k == -d or (k != d and Vf[k-1] < Vf[k+1]):
            x = Vf[k+1]
        else:
            x = Vf[k-1] + 1
        y = x - k
        while x < N and y < M and A[x] == B[y]:
            x += 1; y += 1
        Vf[k] = x
        if Vf reached (N, M): done, D = d
```

Backward Myers:
Diagonal k = x - y as well. Vb[k] = x, where the furthest-reaching backward path from (N, M) on diagonal k gives point (x, y = x - k), with smaller x being further (closer to origin).
Init: Vb[M-... ] hmm. Start at (N, M) which lies on diagonal k0 = N - M = delta. To mirror forward: initialize Vb[delta - 1] = N - 1? Standard trick: define backward paths in terms of moving left/up plus diagonal moves toward origin. The backward furthest point on diagonal k is x_b; snake extends while A[x-1] == B[y-1] decreasing.

Backward loop (for reverse search of middle snake, we run it for r = 0, 1, ...):
```
for r in 0..:
    for k in range(delta - r? ...) 
```

Hmm, the paper indexes reverse Vr with k' = ... Let me use the formulation from the paper directly:

Paper: Let δ = N - M. Forward D-path ends on diagonal k where k = -(D mod 2 parity)... The overlap detection: reverse paths for r steps end on diagonals k where k ≡ δ - r (mod 2)? Actually forward d-path ends on diagonal k with k ≡ d mod 2 (since each edit changes parity... no: after d edits, endpoints on diagonals with parity d mod 2? Each non-diagonal move changes k by ±1, diagonal moves don't change k. Starting at k=0 with 0 edits. After d edits, k ∈ [-d, d], k ≡ d mod 2.)

For reverse: starting from (N, M) on diagonal δ with 0 reverse edits. After r reverse edits, on diagonals k with k ∈ [δ - r, δ + r], k ≡ δ - r mod 2... Let's derive: reverse path going from (N,M) back to (0,0). Deleting a character (moving up/left) changes k by ±1 each edit. After r edits, k ∈ [δ-r, δ+r] with k ≡ (δ - r) mod 2? Each edit changes k by one, so k = δ + (number of up-moves) - (number of left-moves)... wait k = x - y. Moving x down by 1 (deleting from A) decreases k by 1; moving y down... going backward from (N,M), we move x down or y down. x-1: k decreases 1; y-1: k increases 1. So after r edits, k ∈ [δ - r, δ + r], parity k ≡ δ + r? Sum of ±1 changes: r changes each ±1, so k ≡ δ - r ≡ δ + r (mod 2). Since δ±r and δ+r differ by 2r, same parity. So k ≡ (δ + r) mod 2.

Overlap condition: forward search at step d and reverse search at step r overlap when d + r == D and forward furthest point on diagonal k has x >= reverse furthest x on same k. Since we search alternately increasing d and r, when d == r or d == r+1 etc., we detect.

The paper's approach: alternate: for d = 0, 1, 2, ...: advance forward by 1, check overlap (if δ odd), advance reverse by 1, check overlap (if δ even). Because if δ is odd, the first overlap happens when forward has taken one more step than reverse (D odd → forward d = (D+1)/2, reverse r = (D-1)/2). If δ even, reverse reaches first... hmm, actually the parity of δ determines parity of D: D ≡ δ mod 2? edit script size D has D ≡ δ mod 2? Number of edits: each edit changes k parity; final diagonal is δ; so D ≡ δ mod 2. Yes.

If D is odd: forward takes (D+1)/2 steps, reverse (D-1)/2; overlap found after forward update. If D even: after reverse update.

Overlap check (forward, δ odd): for k with forward parity d mod 2 and reverse parity r mod 2 matching (need k ≡ d mod 2 == (δ + r) mod 2, with r = d - 1 when δ odd: k ≡ d == δ + d - 1 mod 2 → need δ odd ✓). And k range: forward |k| <= d, reverse |k - δ| <= r. Check Vf[k] >= Vb[k] (forward reaches at least as far x as reverse point; since forward x increases, reverse x decreases, overlap when Vf[k] >= Vb[k]).

Also the middle snake must be a snake: when overlap detected, the forward furthest point... Actually the paper says: the middle snake is found when forward path reaches a point ≥ reverse point on same diagonal, and the snake is the overlapping portion. Hmm — need care: the detection point itself might not be inside a snake, but the paper proves that when overlap occurs, the last snake of the forward d-path overlaps with the last snake of the reverse r-path. The common implementations (Coglan) record the snake during the while-loop extension: they track (x, y) start of the current snake extension and check overlap for each point along... Actually Coglan's implementation checks overlap after extending the snake and returns the snake just extended. Is that correct? In Coglan's blog part 3, yes: he finds the middle snake by checking after each snake extension whether the forward and reverse furthest points overlap, and returns the snake he just extended. I believe the correctness argument: when the furthest-reaching points overlap (Vf[k] >= Vb[k]), there's a snake in common. Hmm, but is the snake just extended necessarily that common snake?

Let me think again. Simpler correct approach used in many implementations (e.g., git's xdiff, myers in various libs): when overlap detected at diagonal k with Vf[k] >= Vb[k], the middle snake is from reverse point (Vb[k], Vb[k]-k) to forward point (Vf[k], Vf[k]-k)? No — that's not a snake necessarily.

Alternative approach: use the trace-based forward Myers to find D and the path, but with linear-space limitation... Hmm.

Actually, another approach to satisfy requirements without full middle-snake complexity: hybrid.

Strategy:
1. Trim common prefix/suffix (both are "=" runs).
2. Handle empty remainders.
3. Compute D via forward Myers trace but with a safeguard: if (N+M) * D exceeds some budget, fall back... but we don't know D beforehand. We can estimate: run forward Myers step by step; at each step cost is O(N+M); total memory O(D^2 + N + M) with sparse dicts per step only storing k in [-d,d] — memory sum ≈ D². If D is large (say N=M=1000 fully different → D=2000, memory ≈ 4e6 ints stored in lists — fine; time O((N+M)D) = 4e6 — fine).

Worst case that could blow: N=20000 both fully different → D=40000, time 1.6e9, memory 1.6e9. Not in spec. But to be safe-ish, we could use the divide-and-conquer to make worst-case time also fine? Divide-and-conquer doesn't reduce worst-case time below O(ND) either — it's the same O((N+M)D) total, but memory linear. The time 1.6e9 would still be too slow anyway in Python for fully-different 20k. Spec doesn't require that. So trace approach meets spec and is much simpler to get right.

But memory concern: 20000 similar lines, D≈100 → trace: for each d, we store a snapshot of Vf (dict or list). Using dict per step: sum sizes ≈ D²/... ≈ 100² = 10k entries. Fine.

Trace approach details (classic "myers diff with trace"):

```
def _myers_trace(A, B):
    N, M = len(A), len(B)
    V = {1: 0}
    trace = []
    for d in range(N + M + 1):
        trace.append(dict(V))  # snapshot before update? or after?
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and V.get(k-1, ... ) < V.get(k+1)):
                x = V[k+1]
            else:
                x = V[k-1] + 1
            y = x - k
            while x < N and y < M and A[x] == B[y]:
                x += 1; y += 1
            V[k] = x
            if x >= N and y >= M:
                return trace, d  # backtrack
    ...
```

Snapshot: we need, for each d, the V values before updating step d, so that during backtrack we know predecessor. Standard: save trace.append(V.copy()) at start of each d iteration (before modifying V). Then backtrack from (x, y) at final:

```
def backtrack(trace, d, N, M):
    x, y = N, M
    script = []
    for dd in range(d, 0, -1):
        v = trace[dd]   # V state BEFORE step dd? Hmm need consistent convention.
        k = x - y
        if k == -dd or (k != dd and v[k-1] < v[k+1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", A[x-1]))
            x -= 1; y -= 1
        if x == prev_x:
            script.append(("+", B[y-1])); y -= 1
        else:
            script.append(("-", A[x-1])); x -= 1
    # then remaining from (0,0)... after loop, at (x,y) which should be (0,0)? 
    while x > 0 and y > 0 and A[x-1] == B[y-1]:  # hmm
```

Wait — with snapshot convention: trace[dd] holds V before processing step dd, i.e., containing furthest points for d' = dd-2 and less? Actually V before step dd contains furthest points for steps ≤ dd-1, on diagonals with parity (dd-1) mod 2. When backtracking from point at step dd on diagonal k, predecessor is at step dd-1 on diagonal k±1, whose furthest x is in trace[dd] (the snapshot before step dd's update). Hmm, but the predecessor is the furthest point of the (dd-1)-path, stored in V after step dd-1 = snapshot before step dd. Yes: trace[dd] (snapshot taken before updating step dd) = V after steps 0..dd-1. 

But careful: with snapshot taken as `trace.append(dict(V))` at top of loop for d, then during backtrack for step dd we use trace[dd]. Also need to handle initial d=0: trace[0] = snapshot of V before step 0 = {1: 0}?? Standard init V = {1: 0} before loop; snapshot at d=0 includes {1:0}. For d=0 step: k=0: since k == -d (0 == 0), x = V[k+1] = V[1] = 0, y = 0, extend. Good.

Backtrack loop: for dd in range(d, 0, -1)? Actually also step d=0 contributes the initial snake from (0,0): after handling dd from d down to 1, we're left at some (x, y) reachable after step 0 (i.e., the initial snake from origin). Then just prepend "=" for remaining A[0:x] (x should equal y at that point? At step 0's furthest point on diagonal 0, x=y). Actually after handling all steps dd≥1, remaining (x, y) = furthest point of 0-path on diagonal 0 = initial snake from (0,0), so x == y, and prefix A[0:x], B[0:y] equal → prepend x "=" items.

Let me restructure backtrack:

```
x, y = N, M
for dd in range(d, 0, -1):
    v = trace[dd]
    k = x - y
    decide prev_k
    prev_x = v[prev_k]; prev_y = prev_x - prev_k
    # diagonal moves between (prev_x, prev_y) and (x,y):
    while x > prev_x and y > prev_y:
        script.append(("=", A[x-1]))
        x -= 1; y -= 1
    if x == prev_x:  # moved up: insertion from B
        script.append(("+", B[y-1]))
        y -= 1
    else:
        script.append(("-", A[x-1]))
        x -= 1
# now (x, y) is end of 0-path; x == y (diagonal 0)
script.extend(("=", A[i]) for i in reversed(range(x)))
reverse script
```

Wait — but is the furthest point after step 0 necessarily on diagonal 0? After d=0 step, only k=0 updated. But when we backtrack at dd=1, we compute predecessor from trace[1] which contains V after step 0: V[0] (and initial junk {1:0}). k at step-1 point: k ∈ {-1, 1}. prev_k ∈ {0} ∪ {0}. prev_x = V_after0[k_prev] = V_after0[0] = furthest x on diagonal 0 = x0 = y0. Good, then after that loop x == y and we prepend equals.

Edge check: when dd=d and the final point (N, M): k = N - M. Is k within [-d, d] and correct parity? Yes since D = d.

Also careful in the condition `k == -d or (k != d and V[k-1] < V[k+1])`: use dict .get with sensible defaults. With snapshot init V={1:0}, for k == d: must take x = V[k-1]+1 (since can't come from k+1). For k == -d: x = V[k+1]. Standard formulation:

```
if k == -d or (k != d and V[k-1] < V[k+1]):
    x = V[k+1]
else:
    x = V[k-1] + 1
```

For k = -d: only k+1 exists. For k = d: only k-1 exists; condition k != d false → else branch: V[d-1]+1 ✓. For middle: pick whichever gives larger x. Note both V[k-1] and V[k+1] exist at this point (from step d-1), except boundary values like V[1]=0 initial. Hmm, when d=1, k=1: else branch V[0]+1 — but V[0] not yet set at snapshot before step 1? trace[1] snapshot taken before step 1 contains V after step 0 = {1:0, 0: x0}. Wait, snapshot for d=1 is taken after step 0 executed, so contains {1:0, 0:x0}. For k=1: else: x = V[0]+1 = x0+1 ✓. For k=-1: x = V[0] = x0 (k == -d). ✓.

But snapshot at d=0 contains initial V = {1: 0}. That's only used if... backtrack never uses trace[0] since we stop at dd=1 and handle the rest as equals. But during forward, when reading V[k+1] for k=-d with dict, fine.

Hmm wait, one subtlety: when k == -d, x = V[k+1]; but V[k+1] could also have been... no, V[k+1] at parity k+1 ≡ 0 ≡ d-... at snapshot before step d, V contains diagonals of parity d-1 mod 2, and k+1 has parity k+1. k = -d has parity d (mod 2... -d ≡ d mod 2). So k+1 ≡ d+1 ≡ d-1 mod 2 ✓ exists in snapshot. k-1 ≡ d-... k-1 ≡ d-1? k parity = d, so k-1 parity = d-1 ✓ also exists but for k=-d we must not use k-1 (would give x too large beyond reach with too many edits). Fine.

Now: is there an issue with using dict vs list? Dict with per-step snapshot copying: copying dict of size ~d each step → O(D²) total which for D=2000 is 4e6 dict entries copies — acceptable in Python? 4 million dict insertions ≈ maybe 1-2 seconds. Hmm, under 6s budget for the 1000-fully-different case: D = 2000, sum over d of d = D²/2 = 2e6 entries. dict copy of 2e6 total entries: maybe ~0.5–1s. Plus the main loop O((N+M)D) = 4e6 iterations of inner operations ≈ few seconds in Python. Risky but probably OK under 6s? Python does ~10–30M simple ops/sec. The inner loop body: for each (d, k): a few dict lookups, comparisons, while loop. Roughly 4e6 * ~10 ops = 4e10?? No — 4e6 iterations of the k-loop (since sum over d of (d+2)/... for D=2000: sum_{d=0}^{2000} (d/2) ≈ 1e6 k-iterations for parity half, actually range(-d, d+1, 2) has d+1 elements; sum ≈ D²/2 = 2e6. Each iteration ~ 5–15 Python bytecode-heavy ops → maybe 2–4 seconds. Plus dict copies 2e6 → ~0.5s. Hmm, cutting close to 6s. And the fully-different case: no matches at all, while loops never extend. 

Alternative: use lists for V with offset and store snapshots as list copies: faster. V as list of size 2*maxd+1? We can size it to N+M+... size = 2*(N+M)+2? Max D = N+M. List copy of length ~ (N+M)*... copying a list of length L per step: O(L) per step → O(D*L) = 2000 * (2*2000+3) ≈ 8e6 element copies — list copy is fast (memcpy-ish). Better: only copy the used range? V as list indexed by k+offset, offset grows with d. Could use a dict but lists are faster.

Let me use arrays with fixed size: max index range is k ∈ [-Dmax, Dmax] where Dmax = N+M. size = 2*(N+M)+3, offset = N+M+1? Hmm wait k range is [-(N+M)... but actually k = x - y bounded by [-M, N] and [δ-d...]. Just size = N + M + 3, offset = M + 1. k ∈ [-M, N]. V = [something]*(size). Initialize V[offset + 1] = 0. Sentinel values: use -1? x values ≥ 0; uninit entries can be None but we never read uninitialized entries due to parity/range discipline? For k == d boundary we read V[k-1] which exists. For k==d, condition requires k != d false → skip reading V[k+1]? The condition `k != d and V[k-1] < V[k+1]`: Python `and` short-circuits, so V[k+1] not read when k==d. For k == -d we don't read V[k-1]. Interior reads both, both exist. ✓.

Snapshot: trace.append(V.copy()) — copying full list of length N+M+3 each of D steps: D=2000, length ~2003 → 4e6 copies via list slicing = fast (list.copy is C-level). ~4e6 pointer copies ≈ 0.1–0.3s. Good.

But for the 20000-similar-lines case: length ~20003, D ~ 100 → 100 copies of 20k-list = 2e6 — fine.

Time for 1000 fully different: main loop: for d in 0..2000, inner k-loop d+1 entries → total k-iterations = sum(d+1) ≈ 2e6. Each iteration: condition check, dict... list index ops, while check (fails immediately: x<N and y<M and A[x]==B[y] — with N=1000, M=1000; wait in fully different case with trimming, prefix/suffix trimmed so a[0]!=b[0] etc. During forward, at k near boundaries x or y may hit N or M... The while condition evaluation: `x < N and y < M and A[x] == B[y]` — 3 comparisons, fails fast. So ~2e6 iterations × ~15 bytecodes ≈ 3e7 bytecode ops ≈ 1-2s. Plus snapshot copies. Should fit in 6s.

For 20k similar with 50 diffs: D ≈ 100 (assuming ~50 changed lines → each changed line is -/+ → D ≈ 2*50 + ... = ~100). k-iterations ≈ D²/2 = 5000. Fast. Snapshots: D copies of length 20003 = 2e6 pointer copies, fast (~50ms). Backtrack trivial. 

But wait — the trimming: with 50 diffs spread out, trimming helps some. Fine either way.

Memory: trace = D lists of length N+M+3: for 1000-case: 2000 × 2003 pointers × 8 bytes = 32MB. Hmm, acceptable? 2000 lists × 2003 elements × 8 bytes ≈ 32 MB. OK. For 20k similar: 100 × 20003 × 8 = 16MB. OK.

Alternative to reduce: store V as list but copy only the active window [offset - d - 1, offset + d + 1]? That complicates index math in backtrack. Keep simple; memory fine.

Hmm, but one more consideration: worst-case beyond spec (e.g., 20000 fully different) would be too slow/memory. Spec only gives the two scenarios, so acceptable. But maybe add a guard: use trimming aggressively, and also could add a cheap improvement: if N*M small, do DP? Not needed.

Actually wait, there's a subtle correctness issue with the trace approach and repeated lines: Myers furthest-reaching with greedy choice still yields a minimal D (that's proven), and backtrack yields valid script. The maximality of "=" count: minimizing edits D maximizes keeps? Edit script with D edits = len(a)+len(b)-2*LCS? No: D = (#deletions) + (#insertions) = (N - L) + (M - L) = N + M - 2L. So minimizing D maximizes L. ✓.

One more subtlety: the backtrack must produce items such that "=" + "-" in order gives a. Our backtrack walks from (N,M) to (0,0), appending reversed. Let me double check the "=" handling: diagonal moves between (prev_x, prev_y) and (x,y): the snake consists of matched pairs A[i]=B[j] for i from x-1 down to prev_x, j from y-1 down to prev_y. Appending ("=", A[x-1]) then x-=1, y-=1 until x==prev_x (and y==prev_y simultaneously since snake has equal length in both dims). ✓ Then one edit: if x == prev_x (no horizontal moves left), the edit was vertical (insertion of B[y-1]) → ("+", B[y-1]), y -= 1. Else horizontal: ("-", A[x-1]), x -= 1. ✓.

Edge: prev_x == x and prev_y == y (no edit between)? Can't happen: each step dd includes exactly one non-diagonal move, so after diagonal moves, either x>prev_x or y>prev_y (exactly one). Actually could x == prev_x AND y == prev_y after diagonal? That would mean the furthest point at step dd equals furthest at step dd-1 on adjacent diagonal — not possible since the point at step dd comes from predecessor at step dd-1 via one edit; predecessor point (prev_x, prev_y) is furthest for diagonal prev_k; then one edit moves to (x', y') on diagonal k, then snake extends to (x, y). If the edit is down (deletion, k-1 → k means... let me recheck direction signs.

Direction analysis: from predecessor on diagonal prev_k, one edit to diagonal k = prev_k ± 1. If k = prev_k + 1: x stays? Insertion in B (y decreases by 1 going backward... hmm let's think forward: forward path adds an edit: either deletion from A: x += 1 (k += 1), or insertion into B: y += 1 (k -= 1). Going backward from point at step d to predecessor at step d-1:

At step d, point (x, y), diagonal k = x - y. Predecessor (prev_x, prev_y) on diagonal prev_k where prev_k = k+1 if the forward edit was a deletion (x+1, k+1), else prev_k = k-1 (insertion, y+1 forward).

Standard backtrack: if k == -d or (k != d and trace_d[k-1] < trace_d[k+1]): prev_k = k+1 else prev_k = k-1. This mirrors the forward choice: forward chose from k+1 when (k==-d or V[k-1] < V[k+1]) — wait forward: if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1] (came from k+1), else x = V[k-1]+1 (came from k-1). Backtrack uses same predicate. ✓ (I had that.)

Then prev_x = trace_d[prev_k], prev_y = prev_x - prev_k. The forward edit: if prev_k = k+1 (came from k+1): forward move was x += 1 (deletion). So backward: at the step-d point before snake extension... hmm, careful: the point stored at step d is (x,y) after snake extension. The predecessor chain: at step d, before snake extension, point was (x_e, y_e) = (prev_x + (1 if deletion else 0), prev_y + (1 if insertion else 0)), then snake extended to (x, y). Backward: from (x,y) walk diagonal down to just after the edit: while x > prev_x + edit_dx and y > prev_y + edit_dy. Hmm — but the standard code does:

```
while x > prev_x and y > prev_y:
    emit "="
    x--, y--
if x == prev_x: emit "+", y -= 1  ... 
```

Wait let's verify: case deletion (prev_k = k+1... hold on). Let me recompute: forward: from (prev_x, prev_y) on diag prev_k: deletion → (prev_x + 1, prev_y), diag = prev_k + 1 = k. Then snake → (x, y) with x ≥ prev_x+1, y ≥ prev_y, and x - (prev_x+1) == y - prev_y ≥ 0.

Backward from (x, y): diagonal moves: while x > prev_x and y > prev_y: this decrements both until x == prev_x+1? Since y - prev_y == x - (prev_x+1), loop ends when x == prev_x + 1 (and y == prev_y + 1) — wait loop condition x > prev_x: stops when x == prev_x+1? x decreases while x > prev_x and y > prev_y; since x - prev_x = y - prev_y + 1, x > prev_x iff y > prev_y... x > prev_x ⟺ y > prev_y + 1? Hmm: x - prev_x = y - prev_y + 1. x > prev_x ⟺ y - prev_y ≥ 0 ⟺ y ≥ prev_y, always true (y - prev_y = x - prev_x - 1 ≥ 0). And y > prev_y ⟺ x > prev_x + 1. So loop runs while y > prev_y, ending at y == prev_y, x == prev_x + 1. Then check `if x == prev_x`? x = prev_x + 1 ≠ prev_x → else branch: emit ("-", A[x-1]), x -= 1 → x = prev_x ✓. 

Case insertion: forward from (prev_x, prev_y): insertion → (prev_x, prev_y + 1), diag k = prev_k - 1. Snake → (x, y), x ≥ prev_x, y ≥ prev_y + 1, x - prev_x == y - (prev_y+1).

Backward: loop while x > prev_x and y > prev_y: x - prev_x = y - prev_y - 1 ⇒ x > prev_x ⟺ y > prev_y + 1 ⟺ (also y > prev_y true). Loop runs until x == prev_x (and y == prev_y + 1). Then x == prev_x → emit ("+", B[y-1]), y -= 1 → y = prev_y ✓.

Great, standard code works.

Now the final part: after loop for dd from d down to 1, remaining point (x, y) = furthest point of step-0 path. Is it guaranteed x == y? The step 0 furthest point is on diagonal 0 (only k=0 processed at d=0), so yes x = y. But wait — at backtrack dd=1, the computed predecessor is from trace[1] = V after step 0. prev_k ∈ {0}, prev_x = V[0]. The point (prev_x, prev_y) is step-0's furthest point. ✓. Then prepend "=" × prev_x.

But hold on: also need d could be 0 (a == b)? We trim prefix/suffix beforehand so if a==b remainder is empty → handled separately. But after trimming, if both non-empty and a[0] != b[0] (guaranteed by trimming), D ≥ 1. Still, handle general case robustly: if remainder a == b (can't happen after trim), D=0; our trace loop with d=0: k=0, x=V[1]=0, y=0, while extends... x reaches N, M → return trace, 0. Backtrack loop range(0, 0, -1) empty → prepend "=" × x. Works anyway. Fine.

Trimming: 
```
# common prefix
p = 0
while p < la and p < lb and a[p] == b[p]: p += 1
# common suffix
s = 0
while s < la - p and s < lb - p and a[la-1-s] == b[lb-1-s]: s += 1
```
Result pieces: [("=", a[i]) for i in range(p)] + diff(core_a, core_b) + [("=", a[la-s+i]) ...].

Also handle: if core_a empty → all "+"; core_b empty → all "-".

Also potential speed-up: within the Myers on cores, fine.

Also consider: lines can repeat — Myers handles naturally.

Also: to speed the while-loop snake extension in the 20k case where most of the lists match: with trimming, core is small (only regions around diffs), so fine.

Hmm, wait: for the "differ in about 50 places" case — after trimming prefix/suffix, cores might still be ~19,900 lines each if diffs are scattered at both ends. Then Myers trace with V lists of size ~40,006 copied D≈100 times: 4e6 pointer copies ≈ 0.1s fine. Main loop D²/2 ≈ 5k iterations fine. Snake extensions bounded by total snake length ≤ N+M per... no, snake extensions across all d could revisit — worst case O((N+M)D)? With greedy, each diagonal visited once per step where reachable... In similar lists, while-loops do lots of total work? Each (d,k) does a while loop that can extend far; but in mostly-equal lists with trimming, hmm — worst-case total snake work is O((N+M)D) but in practice bounded by matches. With D≈100 and N+M≈40k, worst 4e6 while-loop iterations ≈ 1s. Should be OK; typically far less. Actually there's a known optimization: after trimming, when d small, the diagonals explored are limited. Fine.

To be safer on performance, I can add an extra trim inside: no, keep simple.

Also memory: for the 20k case, trace copies each 40006-long list × ~100 → ~40000×100×8 bytes = 32MB. OK. Reduce by copying only a window? Could store trace as dict-of-dicts? Lists fine.

Actually, let me reduce snapshot cost: instead of copying full V each step, store snapshot of only k in [-d, d] relevant range? The values needed for backtrack at step dd: trace[dd][prev_k] for prev_k in [-(dd-1)... wait prev_k ∈ [-dd+1, dd-1] parity dd-1. We could store a trimmed slice. Using offset arithmetic: when copying, slice V[offset-dd : offset+dd+1] and remember offset shift. Let's do: trace.append(V[offset-d : offset+d+1])? That slice contains indices k ∈ [-d, d] — includes stale values at boundaries beyond current step? V entries for k ∈ [-d, d] at parity d-1 were set at step d-1 (k ∈ [-(d-1), d-1]) plus... entries at k=±d in V are stale (from older steps, parity mismatched? k=±d has parity d; last set when? k=+d could have been set at earlier step d' < d? k=+d only reachable at step ≥ ... reachable steps have k ≤ d', so k=+d set first at step d'=d if d parity matches — actually k=+d is set exactly at step d (since k ≤ d and parity k ≡ d). So V[offset+d] unset before step d → stale/whatever. But backtrack for step dd reads prev_k ∈ [-(dd-1), dd-1], within slice [-dd, dd] ✓. Boundary values at ±dd never read (prev_k range excludes them? prev_k range is [-(dd-1), dd-1]... hmm parity: prev_k must have parity dd-1; slice index range -dd..dd; we read only valid prev_k). So slice copy of length 2d+1: total memory sum_{d} (2d+1) ≈ D². For D=2000 → 4e6 pointers = 32MB (same). Hmm, similar. But for 20k case: D=100 → 100 × ~201 = tiny! Great. And slicing smaller arrays is faster too.

But careful: V full list still needed with offset = M+1 or so; k ranges [-M, N]. Let me set size = N + M + 3, offset = M + 1. Then k+off ∈ [1, N+M+2], within bounds for k ∈ [-M, N]. V[k+1] for k = d... max k = N (x=N, y=0); k+1 = N+1 → index N+M+2 ✓ (size N+M+3). For forward read at k == d: we don't read k+1. At k == -d we read k+1: min k+1 = -(d)+1 ≥ -N... bounded ≥ -M+1 ≥ 1-off ✓.

Initialize V = [-1] * size? Values are x ≥ 0; -1 as sentinel never read due to discipline. But dict-style reads in backtrack: trace slices as lists indexed by (k + d). Since slice starts at k = -d.

Implementation:

```
def diff_lines(a, b):
    la, lb = len(a), len(b)
    # prefix
    p = 0
    while p < la and p < lb and a[p] == b[p]:
        p += 1
    s = 0
    while s < la - p and s < lb - p and a[la - 1 - s] == b[lb - 1 - s]:
        s += 1
    ca = a[p: la - s]
    cb = b[p: lb - s]
    out = [("=", x) for x in a[:p]]
    out += _diff_core(ca, cb)
    out += [("=", x) for x in a[la - s:]]
    return out
```

Wait: suffix "=" items should be a[la-s:] — lines kept from both ✓. But careful: prefix and suffix trimming might conflict if a == b entirely: p loops until p == la, then suffix loop condition s < la - p = 0 → s=0. Fine.

_diff_core(A, B):

```
def _diff_core(A, B):
    N, M = len(A), len(B)
    if N == 0:
        return [("+", x) for x in B]
    if M == 0:
        return [("-", x) for x in A]
    trace, d = _myers_trace(A, B)
    return _backtrack(A, B, trace, d)
```

_myers_trace:

```
def _myers_trace(A, B):
    N, M = len(A), len(B)
    size = N + M + 3
    off = M + 1
    V = [-1] * size
    V[off + 1] = 0
    trace = []
    for d in range(N + M + 1):
        trace.append(V[off - d: off + d + 2])  # k in [-d-1, d+1]? 
        ...
```

Hmm — what range should the slice cover? For backtrack at step dd we need prev_k ∈ [-dd+1, dd-1] — indices relative to slice start. If slice covers k ∈ [-dd, dd] with slice[k + dd]: prev_k index = prev_k + dd. But simpler if slice covers [-d, d]. Let me do slice = V[off - d : off + d + 1] → length 2d+1, index i ↔ k = i - d.

But wait: does backtrack need values at prev_k beyond current stored? trace[dd] must contain V after step dd-1 for k ∈ [-(dd-1), dd-1]. Slice [-dd, dd] includes them ✓.

Also forward loop reads V[k-1], V[k+1] from the live full array V (not trace). ✓.

Forward loop:

```
for d in range(N + M + 1):
    trace.append(V[off - d: off + d + 1])
    for k in range(-d, d + 1, 2):
        if k == -d or (k != d and V[off + k - 1] < V[off + k + 1]):
            x = V[off + k + 1]
        else:
            x = V[off + k - 1] + 1
        y = x - k
        while x < N and y < M and A[x] == B[y]:
            x += 1
            y += 1
        V[off + k] = x
        if x >= N and y >= M:
            return trace, d
```

Hmm wait, the slice for trace at step d: covers k ∈ [-d, d]. But backtrack at step dd reads prev_k ∈ [-dd+1, dd-1]. However, is trace[dd] (snapshot BEFORE step dd) containing V-after-step-(dd-1) values for k in [-(dd-1), dd-1]? Yes since those were written at steps ≤ dd-1 and never overwritten (each k written only once per... k is written at every step with matching parity — k parity ≡ step; k ∈ [-step, step]. So k written at step d iff d ≥ |k| and d ≡ k mod 2. So k written at steps d0=|k|, d0+2, .... The latest write before step dd is at step dd-1 (if parity matches, which it does for reachable prev_k). ✓.

Edge: slice index negative? off - d: d ≤ N+M... off = M+1, off - d ≥ M+1-(N+M) = 1-N ≥ ... could be negative if N > M+1. Python negative slice index would wrap! E.g., N=1000, M=0 → but M=0 handled separately (returns early). After early returns both N,M ≥ 1. off - d: min when d = N+M: off - (N+M) = 1 - N < 0 → slice V[1-N : N+2M+2]?? That wraps incorrectly. But do we reach d = N+M? d max reached = D ≤ N+M, and slice length needed... For safety, clamp: hi = min(d, ...) Actually k max = N (diagonal N when y=0), k min = -M. So slice should cover k ∈ [max(-d, -M), min(d, N)]. Simpler: slice V[max(off - d, 0) : min(off + d + 1, size)]. And in backtrack, index prev_k relative: need to know slice start k0 = max(-d, -M)... Let me store slices with a recorded offset? Alternatively make the size big enough that off - d ≥ 0 always: need off ≥ d_max = D ≤ N+M → off = N + M + 1, size = 2(N+M)+1 + something. Then V[off + k + 1] max = off + N + 1 = 2N + 2M + 2 → size = 2(N+M)+3. Memory: full list length ~2(N+M) = 40,006 for the 20k case — same as before. For the 1000 case: 4003. Fine.

Actually simpler: since k ∈ [-d, d] and d ≤ N+M, just size = 2*(N+M) + 3, off = N+M+1. All indices k+off ∈ [1, 2N+2M+2] ✓ within [0, size-1]. k-1 index ≥ off - d - 1 ≥ 0 when k=-d? k=-d → we don't read k-1 (short-circuit: `k == -d or (...)` — careful ordering: `k == -d or (k != d and V[off+k-1] < V[off+k+1])`. For k=-d, first clause true → no read of k-1 ✓. For k=d: k != d false → no read of k+1? The and: (k != d and ...) — k != d false → whole false → else branch ✓. And slice trace.append(V[off - d: off + d + 1]) always valid since off - d ≥ off - (N+M) = 1 > 0 and off + d + 1 ≤ 2off + ... = size-1? off + d + 1 ≤ (N+M+1) + (N+M) + 1 = 2(N+M)+2 = size - 1 ✓.

But wait: slice length: we slice [-d, d] inclusive → V[off-d : off+d+1], length 2d+1. In backtrack for step dd: slice trace[dd], index = prev_k + dd. prev_k ∈ [-(dd-1), dd-1] → index ∈ [1, 2dd-1] ✓ within length 2dd+1.

Backtrack:

```
def _backtrack(A, B, trace, d):
    x, y = len(A), len(B)
    script = []
    for dd in range(d, 0, -1):
        v = trace[dd]
        k = x - y
        if k == -dd or (k != dd and v[k + dd - 1] < v[k + dd + 1]):
            pk = k + 1
        else:
            pk = k - 1
        px = v[pk + dd]
        py = px - pk
        while x > px and y > py:
            script.append(("=", A[x - 1]))
            x -= 1
            y -= 1
        if x == px:
            script.append(("+", B[y - 1]))
            y -= 1
        else:
            script.append(("-", A[x - 1]))
            x -= 1
    while x > 0:
        script.append(("=", A[x - 1]))
        x -= 1
    script.reverse()
    return script
```

Wait, the final part: after loop, (x, y) on diagonal 0, x == y. Prepend "=" × x. Using `while x > 0` and only A (since x == y). ✓.

But check the condition indices in backtrack: mirror of forward where forward used V[off + k ± 1] from full array; the trace slice covers k' ∈ [-dd, dd] with index k' + dd. prev candidates: k+1 and k-1, both ∈ [-dd+1, dd-1] → indices k+1+dd and k-1+dd. In forward at step dd, condition reads V[k-1] and V[k+1] which at snapshot-before-step-dd correspond to values from step dd-1 ✓ (written at step dd-1, present in snapshot). But hold on: forward's condition uses LIVE V at time of step dd — which equals snapshot before step dd for indices k±1 (both ∈ [-(dd-1)+1... k+1 ≤ dd? For k=dd: not read. For k<dd: k+1 ≤ dd, written at step dd if k+1 ≡ dd? k+1 parity: k ≡ dd (mod 2) → k+1 ≡ dd+1 ≠ dd parity → k+1 NOT written at step dd, latest write at step ≤ dd-1 ✓. Similarly k-1 ✓. So live V at indices k±1 at step dd == trace[dd] at those indices. ✓ consistent.

Also for k == -dd case in backtrack: predicate k == -dd → pk = k+1 = -dd+1, index pk+dd = 1 ✓.

Edge: dd=... the point at step d is (N, M) — but is x= N exactly? Forward termination condition x >= N and y >= M: x == N and y == M exactly (can't exceed because while bounded). Fine.

Hmm, one more: forward termination check `if x >= N and y >= M` — since while increments both together, x=N implies y = x - k... y >= M needed too; both conditions. Actually if x == N, path reached bottom; y = N - k; termination when (N, M) i.e., k = x - y = N - M. But could we reach x == N with y < M? Then no termination, continue. Standard check `x >= N and y >= M` but since x ≤ N always? x can exceed N? No, while guards x < N. So x ≤ N, and y ≤ M. Termination iff x == N and y == M. But careful: after snake extension at step d we check; but the furthest point might reach (N, M) only at some step where also intermediate diagonals... standard. Also possible: we reach (N, M) at step d as furthest point of diagonal k = N - M ✓ parity: N - M ≡ D mod 2? D ≡ N - M (mod 2) as argued. And forward search finds it at d = D, the first step where diagonal N-M furthest reaches (N,M). But could (N,M) be reached at step d' < D on some diagonal? Furthest point at step d' on diag N-M... reaching (N,M) at step d' means edit script of size d' exists → d' ≥ D. So first time is D. ✓.

Also the trace loop: for d in range(N+M+1) — guaranteed to terminate by then since D ≤ N+M. Return inside.

One concern: when N or M is huge and D huge — performance out of spec, ignore.

Now also handle the potential pathological memory: trace entries length 2d+1 with d up to D: sum ≈ D². For 1000 fully-different: D = 2000 → sum ≈ 4e6 pointers → 32MB. Fine.

Double-check `_backtrack` correctness with small example. A = ["x"], B = ["y"]. Trimmed: no prefix/suffix. N=M=1. Myers: V init size 2*2+3=7, off=3... wait off = N+M+1 = 3. V[off+1]=V[4]=0, else -1.

d=0: trace.append(V[3-0:3+1] = V[3:4] = [-1]) (covers k=0 with index 0). k=0: k == -d (0==0) → x = V[off+1] = 0. y = 0. while: A[0]==B[0]? "x" vs "y" no. V[off+0]=0. x>=1? 0 no.
d=1: trace.append(V[3-1:3+2] = V[2:5] = [-1, 0, -1]) → indices 0,1,2 ↔ k=-1,0,1. k=-1: k==-d → x = V[off+0] = 0. y = x - k = 1. while: x<1? 0<1 yes, y<1? 1<1 no → no extension. V[off-1]=0. Check: x>=N? 0 no.
k=1: k==-d? no. k!=d? 1!=1 no → else: x = V[off+0]+1 = 1. y = 0. while: x<1? no. V[off+1]=1. x>=1 and y>=1? y=0 no.
d=2: trace.append(V[1:6] = [-1,0,0,-1,1]) length 5 ↔ k=-2..2. k=0: k==-d? no. k!=d yes. V[off-1]=0 < V[off+1]=1 → true → x = V[off+1] = 1. y = 1. while: x<1 no. V[off]=1. x>=1, y>=1 → return trace, d=2.

Backtrack: x=1, y=1. dd=2: v = trace[2] = [-1,0,0,-1,1]. k=0. k==-dd? 0==-2 no. k!=dd (0≠2) → v[k+dd-1]=v[1]=0 < v[k+dd+1]=v[3]=-1? 0 < -1 false → pk = k-1 = -1. px = v[pk+dd] = v[1] = 0. py = 0 - (-1) = 1. while x>px (1>0) and y>py (1>1)? no. x==px? no → emit ("-", A[0])="x", x=0. Now x=0,y=1.
dd=1: v = trace[1] = [-1, 0, -1] ↔ k=-1,0,1. k = x - y = -1. k==-dd (-1==-1) → pk = 0. px = v[0+1] = v[1] = 0. py = 0. while x>px(0>0)? no. x==px → emit ("+", B[y-1]) = ("+", "y"), y=0. Now (0,0).
loop ends. while x>0: no. reverse: [("+", "y"), ("-", "x")].

Check: "="∪"-" in order → ["x"] = a ✓. "="∪"+" → ["y"] = b ✓. D=2 minimal ✓.

Another test: A=["a","b"], B=["a","c"]. Trim prefix p=1, suffix s=0. ca=["b"], cb=["c"] → diff gives [("-", "b"), ("+", "c")]? Myers: N=M=1... _diff_core(["b"],["c"]): same as above → script [("+","c"),("-","b")]. Full: [("=", "a"), ("+", "c"), ("-", "b")]. Check "="+"-" order: a, b ✓. "="+"+": a, c ✓. Minimal L=1 ✓. Order of -/+ between them arbitrary ✓.

Another: A=["a"], B=["a","b"]: trim prefix p=1, suffix s=0, ca empty → all "+" → [("=",a),(" +","b")]. ✓.

Suffix case: A=["b","a"], B=["c","a"]: p=0; suffix: s<2, a[1]=="a"==b[1] → s=1; then s<1? s<la-p=1... next s check: s=1 → s < la - p (1 < 1)? no → stop. ca = ["b"], cb = ["c"] → [("+","c"),("-","b")] or [("-","b"),("+","c")] from algorithm: same as before gave [("+","c"),("-","b")] for ["x"]→["y"] i.e. here [("+","c"),("-","b")]. Full: [("+","c"),("-","b"),("=","a")] ✓.

Repeat lines: A=["a","a"], B=["a"]: prefix p=1; suffix: s < la-p=1 and s < lb-p=0 → no. ca=["a"], cb=[] → [("-","a")]. Full: [("=","a"),("-","a")]. ✓.

Now performance tuning of the snake while-loop: `while x < N and y < M and A[x] == B[y]`. For lists of strings, comparisons fast. Fine.

Also note: potential improvement — for the case of large similar lists, D small; the loop over d up to D: but what if the actual minimal D is found earlier — we return immediately ✓.

Also consider memory/time when D found large early but lists big: OK.

Edge: a or b empty at top: p=0 (if lb==0, loop p < lb fails), suffix: s < la - 0 and s < 0 → no. ca = a, cb empty → core returns all "-". ✓. If both empty → [].

Another subtle thing: trimming uses `a[p] == b[p]`; strings compare fast.

Potential worry: recursion? None.

Now let me also double check the trace slicing when d=0: trace[0] = V[off : off+1] = [0]. Backtrack never reads trace[0] (loop stops at dd=1). ✓.

Wait, at dd=1 in the backtrack, k could be ±1. For k=1: predicate: k==-dd? no; k != dd? 1 != 1 false → else pk = 0. px = v[0+1] = v[1]. trace[1] slice = V[off-1 : off+2] ↔ k=-1,0,1 at indices 0,1,2. v[1] ↔ k=0 ✓. For k=-1: k==-dd → pk=0, px=v[1] ✓.

But hmm — one thing to double-check: in backtrack at step dd, after processing, we require x,y to be the furthest point at step dd-1 for diagonal pk. But the algorithm's greedy property: the point (x,y) we're at came from the furthest path; the backtrack decision predicate reproduces the forward choice. However, there's a subtlety: multiple predecessors could reach the same furthest point; standard proof says using the same tie-breaking predicate reconstructs a valid path. In the case V[k-1] == V[k+1] (tie), forward took else branch (from k-1: x = V[k-1]+1). Backtrack: condition v[k-1] < v[k+1] false → pk = k-1, px = v[k-1], and forward x = v[k-1] + 1 — consistent ✓. When k == dd (came from k-1): backtrack pk=k-1 ✓. When k == -dd (came from k+1) ✓.

But wait, one asymmetry: in the forward direction, when k == -d we take x = V[k+1] WITHOUT +1 (insertion move: y += 1). Backtrack for k == -dd: pk = k+1, px = v[pk+dd], py = px - pk. The forward move was: from (px, py) insert → (px, py + 1), then snake to (x, y). Backward loop handles ✓ as analyzed.

For k == dd: forward x = V[k-1] + 1 (deletion), then snake.

For interior: if V[k-1] < V[k+1]: x = V[k+1] (insertion, since moving from k+1 down to k via y+1). Hmm wait: insertion adds y, decreasing k: from diagonal k+1 to k via insertion ✓. Else deletion from k-1. ✓ matches backtrack predicate.

Now, is the tie-breaking consistent with producing correct reconstruction even when px could equal x (i.e., snake plus edit produce same point)? The edit always moves one coordinate, so px < x or py < y at the edit point; diagonal loop then edit — net (x,y) after differs from (px,py) in exactly one coord plus snake lengths; fine.

Potential issue: the while loop in backtrack `while x > px and y > py` — could it overshoot below the edit point? As analyzed: it stops exactly at (px+1, py) [deletion] or (px, py+1) [insertion] because the snake length equality forces it. But what if the snake length is 0 and the edit point IS (x,y)? Then loop doesn't run (x > px and y > py fails immediately: deletion case x = px+1, y = py → y > py false → stop; then x != px → emit "-" ✓). Insertion: x == px → but loop condition x > px false → stop; x == px → emit "+" ✓. But careful: deletion case y == py and loop requires y > py — false, stop. ✓. Edge: what if deletion case but y < py?? Can't: y ≥ py after snake? Forward: from (px, py) deletion → (px+1, py), snake y increases: y ≥ py ✓.

Hmm wait, actually there's a subtle issue: could the "while x > px and y > py" loop terminate with x > px but y == py in deletion case... deletion: x - px - 1 = y - py (snake lengths equal). Loop decrements both until one hits bound. x hits px+1 when y hits py simultaneously. Then stop. ✓. Insertion: x - px = y - py - 1: loop until x == px (y == py+1). ✓. But what if in insertion case y == py initially?? y ≥ py + 1 always ✓.

All good. Also `k != dd` guard uses dd (step), consistent with forward using d.

One more scenario to sanity check: A = ["a","b","c"], B = ["b","c","d"], fully trimmed (no common prefix/suffix). LCS = ["b","c"], L=2, D = 3+3-4=2. Myers: N=M=3, size=2*6+3=15, off=7. V[8]=0.

d=0: trace: V[7:8] = [-1]. k=0: x = V[8]=0, y=0. A[0]="a" vs B[0]="b" no. V[7]=0.
d=1: trace: V[6:9] = [-1, 0, -1]. k=-1: x = V[7] = 0, y = 1. A[0]="a" vs B[1]="c"? no. V[6]=0. k=1: k==d → else: x = V[7]+1 = 1, y = 0. A[1]="b" vs B[0]="b" ✓ → x=2,y=1; A[2]="c" vs B[1]="c" ✓ → x=3,y=2; x<3? no. V[8]=3. x>=3? yes, y>=3? y=2 no.
d=2: trace: V[5:10] = [-1,-1,0,3,-1] (k=-2..2). k=0: k!=d, V[off-1]=0 < V[off+1]=3 → x = V[8] = 3, y = 3. while: x<3 no. V[7]=3. x>=3 and y>=3 → return d=2.

Backtrack: x=3,y=3. dd=2: v = trace[2] = [-1,-1,0,3,-1]. k=0. k==-2? no. k!=2 → v[0+1]=v[1]=-1 < v[0+3]=v[3]=3 → true → pk=1. px = v[pk+dd]=v[3]=3. py = 3-1=2. while x>px(3>3)? no. x==px → emit ("+", B[2])="d", y=2. 
dd=1: v = trace[1] = [-1,0,-1]. k = 3-2 = 1. k==-1? no. k!=1? no → pk = 0. px = v[0+1] = 0. py = 0. while x>0 and y>0: emit ("=",B... A[x-1]): x=3→A[2]="c" (y=3→2), x=2→A[1]="b" (y=2→1). stop (y=1 not >0). x==px(0)? no → emit ("-", A[0])="a", x=0. 
Then while x>0: no. reverse: [("-", "a"), ("=", "b"), ("=", "c"), ("+", "d")]. ✓ Checks: "="+"-" → b,c,a... wait "="∪"-" in order: "-", then "=", "=", → ["a","b","c"] ✓. "="∪"+": b, c, d ✓. D=2 ✓ minimal.

Great. Now, the final while in backtrack: `while x > 0: script.append(("=", A[x-1]))` — but must also ensure y decreases; since x == y there. ✓.

Hmm, wait: is x == y guaranteed at that point? After dd=1 processing, we end at furthest point of step 0 = diagonal 0 point → x == y. But what if d == 0? Loop doesn't run; (x,y) = (N,M); need x == y i.e. N == M and A == B. This happens only if a == b, but we trimmed... In _diff_core called only when cores non-empty and a[0] != b[0] after trimming? Actually trimming ensures ca[0] != cb[0] (if both non-empty): prefix trim stops because a[p] != b[p] or exhausted. If p < min(la,lb), a[p] != b[p] ✓. So cores differ at first element → D ≥ 1. But _diff_core might be... we only call it once. OK, and even if called with equal cores, d=0 path: forward d=0: x=V[off+1]=0, y=0, while extends to x=N=y=M → return trace [snapshot], d=0. Backtrack: loop skipped, prepend "=" × N ✓ correct anyway. Nice, robust.

Now, is there a case where forward termination never triggers within range(N+M+1)? D ≤ N+M always ✓.

Performance micro-optimizations:
- Local variable binding inside loops (A_local = A, etc.).
- The inner loop reads V at off+k-1, off+k+1: precompute base = off + k.
- Use range step.

Let me also consider replacing trace snapshots with slices — but note: V[off-d : off+d+1] creates a list each step: fine.

Actually hmm, for the 20k similar case: D≈100, snapshots tiny. Main cost: trimming (40k string comparisons fast), forward loop trivial, backtrack trivial. 

For the 1000 fully different: as computed ~2e6 k-iterations. Each iteration does: condition eval with list indexing ×2, assignment, y compute, while check (fails on third clause since A[x] != B[y]... but first two must be checked; when near boundaries fails earlier), V store, boundary check `x >= N and y >= M`. Let's estimate ~15-20 bytecodes → ~4e7 ops → maybe 2-3s in CPython. Hmm, plus slice copies 2000 slices avg length 2000 → 4e6 elements → ~0.3s. Total maybe 3s < 6s ✓. But CPython speed varies; to be safer, micro-optimize the inner loop.

Optimization idea: since for fully-different lists no snakes, but generally: I can reduce per-iteration work by avoiding the `x >= N and y >= M` check via... keep it.

Another optimization: skip diagonals where x or y already out of bounds? Not necessary.

Alternative bigger optimization: when the lists are large and D may be large, use trimming recursively? Not needed for spec.

Let me also micro-opt the condition. Write inner loop as:

```
for k in range(-d, d + 1, 2):
    kb = k + off  # V index base... 
```

Actually precompute `Vo = V` local, `off` local. Write:

```
while x < N:
    if y >= M: break
    if A[x] != B[y]: break
    x += 1; y += 1
```

Hmm, single-condition while with `and` short-circuits similarly. Keep as is.

Also could avoid computing y = x - k then rechecking: fine.

Let me also think: is there a correctness issue with using -1 sentinel for unset V entries? For interior k at step d, V[k-1] and V[k+1] both set (from step d-1) as argued. At k=d: reads only k-1. At k=-d: reads k+1. So sentinels never read. Except... d=0: k=0 == -d → reads V[off+1] which we initialized to 0 ✓. d=1, k=... fine as checked.

But: V[k-1] for k=d is not read, ✓; but what about k values where parity mismatch due to... all reads are at parity d-1 entries which were all set at step d-1 (all diagonals -(d-1) to (d-1) step 2 written at step d-1) ✓ (every k in that range gets written at step d-1 since loop covers range(-d+1, d, 2) = all parity-(d-1) diagonals). ✓.

Now, backtrack reads trace[dd][pk + dd] where pk ∈ [-dd+1, dd-1] — those were set at step dd-1 ✓, slice covers ✓.

Also need `k = x - y` at step dd satisfies |k| ≤ dd and parity ≡ dd — true for points on step-dd furthest paths.

Now, what about the possibility that at step dd, the point (x,y) during backtrack is not the furthest point of diagonal k but some point along... The backtrack assumes (x,y) IS the furthest point V_after[step dd][k]. Initially (N,M) is furthest at step D for diagonal N-M? (N,M) is a furthest-reaching D-path endpoint — is it THE furthest for diagonal δ? The greedy algorithm returns when furthest reaches (N,M); at that step, V[δ] = N... Actually termination check happens right after setting V[off+k] = x where x == N, y == M, k = N-M. So V[δ] = N at step D. And backtrack starts with (x, y) = (N, M), k = δ ✓.

Inductive step: at step dd, (x,y) = V_after[dd][k]. The forward transition at step dd computed x from V_before[dd][k±1] = trace[dd][k±1] (values from step dd-1). Backtrack recomputes same decision → pk, px = trace[dd][pk+dd] = V_after[dd-1][pk] ✓. Then snake reduces to predecessor ✓.

All consistent.

Now write final code:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    la, lb = len(a), len(b)
    # common prefix
    p = 0
    while p < la and p < lb and a[p] == b[p]:
        p += 1
    # common suffix
    s = 0
    while s < la - p and s < lb - p and a[la - 1 - s] == b[lb - 1 - s]:
        s += 1
    core_a = a[p:la - s]
    core_b = b[p:lb - s]

    out = [("=": line) ...]
```

Implement helper functions inside or outside. The spec says write diff_lines; helpers fine at module level (single code block).

Let me finalize code:

```python
def diff_lines(a, b):
    la = len(a); lb = len(b)
    p = 0
    while p < la and p < lb and a[p] == b[p]:
        p += 1
    s = 0
    while s < la - p and s < lb - p and a[la - 1 - s] == b[lb - 1 - s]:
        s += 1
    result = [("=" , x) for x in a[:p]]
    result.extend(_diff_core(a[p:la - s], b[p:lb - s]))
    result.extend(("=", x) for x in a[la - s:])
    return result

def _diff_core(A, B):
    N = len(A); M = len(B)
    if N == 0:
        return [("+", x) for x in B]
    if M == 0:
        return [("-", x) for x in A]
    trace, d = _myers_trace(A, B, N, M)
    return _backtrack(A, B, trace, d, N, M)

def _myers_trace(A, B, N, M):
    total = N + M
    size = 2 * total + 3
    off = total + 1
    V = [-1] * size
    V[off + 1] = 0
    trace = []
    append = trace.append
    for d in range(total + 1):
        append(V[off - d: off + d + 1])
        for k in range(-d, d + 1, 2):
            base = k + off
            if k == -d or (k != d and V[base - 1] < V[base + 1]):
                x = V[base + 1]
            else:
                x = V[base - 1] + 1
            y = x - k
            while x < N and y < M and A[x] == B[y]:
                x += 1
                y += 1
            V[base] = x
            if y >= M and x >= N:
                return trace, d
    return trace, total  # unreachable
```

Wait, `while x < N and y < M and A[x] == B[y]` — checking y >= M first when x==N... fine. The termination check: after while, if x == N and y == M → return. Note x ≤ N, y ≤ M always? x starts ≤ N? x from V entries ≤ N ✓ (all stored x ≤ N). And y = x - k... could y > M? For k very negative and x large... At step d, x on diagonal k: y = x - k ≤ M required for valid furthest point? The furthest point on diagonal k could have y ≤ M? y can exceed M? V[k] stores x, and valid paths have y ≤ M. Since we only extend while y < M, stored y ≤ M ✓. Initial x from V: previous stored values have y ≤ M ✓. And y = x - k: for k = -d... x = V[k+1], y = x - k = x + d - ... hmm y could exceed M? x ≤ N and k ≥ -M... y = x - k ≤ N + M; but is stored y ≤ M guaranteed? By induction: stored point reached via valid path with at most d edits where a path's endpoint satisfies y ≤ M? Forward paths only move down/right within the grid: from (0,0), moves x+1 (requires x<N) and y+1 (requires y<M... no wait, deletion move x+1 requires x < N? In Myers forward, moves are always allowed as edits: x+1 requires x < N, y+1 requires y < M — yes, edit moves consume a line so bounded by lengths). So all points satisfy x ≤ N, y ≤ M ✓. And x = V[k+1] with y' = x - (k+1) ≤ M → y = x - k = y' + 1 ≤ M ✓ when taking insertion branch. Deletion branch: x = V[k-1] + 1 ≤ N (since V[k-1] ≤ N-1? V[k-1] has y_{k-1} = V[k-1] - (k-1) ≤ M... x could equal N already; then x+1 = N+1 > N?? Hmm: deletion move requires x < N. If V[k-1] == N... then x = V[k-1] + 1 = N + 1 invalid!

Wait — standard Myers: x = V[k-1] + 1 could exceed N? V[k-1] = N means the path already reached bottom at diagonal k-1. Then x = N+1, y = x - k. Is this possible? If V[k-1] = N then furthest point at diagonal k-1 is (N, y_{k-1}). Taking deletion from there would be invalid. In standard Myers implementations, this is handled because... hmm, actually in the standard algorithm this doesn't cause a problem: the check `while x < N and y < M and ...` — x = N+1, y = N+1-k... then V[k] = N+1 stored?! That would break things.

Let me think. Standard Myers pseudo-code:

```
for k from -D to D step 2:
    if k == -D or (k != D and V[k-1] < V[k+1]):
        x = V[k+1]
    else:
        x = V[k-1] + 1
    y = x - k
    while x < N and y < M and A[x] == B[y]: ...
    V[k] = x
```

The paper's algorithm: when computing furthest reaching D-path on diagonal k, we take a (D-1)-path furthest on k-1 or k+1 and add one edit. If V[k-1] = N, i.e., furthest (D-1)-path on k-1 is at x=N: can adding a deletion be useful/valid? The furthest-reaching D-path on k: candidates from k-1 via deletion: endpoint (V[k-1]+1, y). x = N+1 out of grid. But would that candidate ever "win"? The condition picks max candidates. If V[k-1] = N... hmm but the condition `V[k-1] < V[k+1]` → take k+1 branch; else take deletion. If V[k-1] ≥ V[k+1] and V[k-1] = N, we'd compute x = N+1. Can that happen? If x = N+1, y = N+1-k ≤ M? Since deletion requires consuming A[N] which doesn't exist — invalid move.

Hmm, but actually in the standard algorithm, can V[k-1] reach N? Yes: e.g., the final D-path reaches (N,M) via diagonal k with... Let me think: does the guard work because when V[k-1] = N, the point (N+1, ...) would never be selected as it's checked... Standard implementations (the classic JS "myers diff" by James Coglan's trace version) do exactly `x = V[k-1] + 1` without bounds check, and it's accepted as correct. Why? 

Claim: if V[k-1] = N, then the D-path on diagonal k via other branch reaches ≥ ... Hmm. Let's think: V[k-1] = N means a (D-1)-path reaches (N, y) with y = N-(k-1). Consider diagonal k: via insertion from k+1... 

Actually here's the thing: if the furthest (D-1)-path on k-1 reaches x = N, then a D-path on k-1 also reaches x = N (same path). The furthest D-path on diagonal k: is it needed? The search continues until some diagonal reaches (N, M). If V[k-1] = N at step D-1, then y = N - k + 1; if y = M we'd have terminated at step D-1 already (check `x >= N and y >= M` after V[k-1] set... wait termination check happens in the same iteration). If y < M, then x = N+1 candidate: after computing, while loop: x < N false → V[k] = N+1. This stores out-of-grid x!

Hmm, does standard Myers have this issue? Let me look at the canonical implementation more carefully. In Myers' paper, the furthest reaching values keep within grid because the moves are: "delete: move down" requires x < N... The paper's algorithm (figure 4?) does:

```
If k = -D or (k ≠ D and V[k-1] < V[k+1]) Then x ← V[k+1]
Else x ← V[k-1] + 1
```

I recall implementations like "myers-diff" libraries do exactly this and it works. Why is x = N+1 never problematic? Possibly because V[k-1] = N only when the algorithm should have terminated... Let's see: V[k-1] = N at step D-1 means furthest (D-1)-path on diagonal k-1 ends at x=N, y = N-k+1. For the search to not have terminated, y ≠ M. But termination check is `x >= N and y >= M` — we check each stored point. y < M means N - k + 1 < M → k > N - M + 1 = δ+1. So k-1 > δ. Diagonal k-1 > δ = N - M. Points on diagonal k' > δ have y = x - k' < x - δ = x - N + M ≤ M. Fine, can have x = N with y < M (reached bottom edge). Then candidate from k-1: x = N+1 — invalid.

But note: candidates on diagonal k via the OTHER branch (k+1 via insertion, y+1): x = V[k+1]. For the k branch selection: condition is V[k-1] < V[k+1] → choose insertion. If V[k-1] = N and V[k+1] ≥ N... V[k+1] ≤ N always (x ≤ N). So V[k-1] = N → V[k-1] < V[k+1] false → deletion branch → x = N+1. Bad?!

Hmm wait, unless termination already happened. If V[k-1] = N was stored at step D-1... but also consider: maybe the algorithm terminates before such k is processed. Termination requires some diagonal reaching (N, M): x = N AND y = M, i.e., diagonal δ. If V[k-1] = N with y < M at step D-1, no termination yet at step D-1 (only checked when k-1 processed; also earlier steps). Then at step D, processing k (parity D, k > δ+1... k ≡ D mod 2, and k > δ+1 means... δ ≡ D mod 2, so k ≥ δ+2? hmm k > δ + 1 and k ≡ δ mod 2 → k ≥ δ + 3? wait k-1 > δ and parity(k-1) ≡ D-1 ≡ δ-1 mod 2... k - 1 ≡ δ mod 2?? parity(k-1) ≡ D-1 ≡ δ-1 ≡ δ+1 mod 2. Hmm k-1 > δ: k-1 ∈ {δ+2, δ+4, ...} requires parity(k-1) ≡ δ mod 2 → δ+2 etc. But parity(k-1) must ≡ D-1 ≡ δ - 1 mod 2 (since D ≡ δ). Contradiction! So k-1 > δ impossible for a step-(D-1) furthest point? k-1 ≤ δ must hold?? No wait: parity constraint: furthest point at step dd lies on diagonal with parity dd mod 2. diagonal k-1 parity ≡ (D-1) mod 2 ≡ (δ-1) mod 2. k-1 > δ and k-1 ≡ δ-1 mod 2 → k-1 ≥ δ + 1 → since parity differs (δ vs δ-1... δ+1 ≡ δ+1; k-1 ≡ δ+1 mod 2 means k-1 ∈ {δ+1, δ+3,...}) hmm let me redo: (δ - 1) mod 2 = (δ+1) mod 2. So k-1 ∈ {δ+1, δ+3, ...} with k-1 > δ → k-1 ≥ δ+1... wait k-1 > δ AND k-1 ≡ δ+1 (mod 2). δ+1 ≡ δ+1 ✓ so smallest is k-1 = δ+1 > δ ✓. So possible: k-1 = δ+1, y = N - (δ+1) = M - 1 < M. So at step D-1, furthest on diagonal δ+1 could be (N, M-1) — reached bottom edge one above matching end. Then at step D, k = δ+2 ≡ D mod 2 ✓ (δ+2 ≡ δ ≡ D). Condition: k == -D? no. k != D? If k == D... k = δ+2 could equal D. Suppose δ = D-2 (possible? δ ≤ D and D ≡ δ; e.g., a fully deleted... if M=0, but handled separately). Hmm. Take k != D case: else-branch condition: V[k-1] < V[k+1]? V[k-1] = V[δ+1] = N, V[k+1] = V[δ+3] ≤ ... diagonal δ+3 at step D-1: x furthest with y = x - (δ+3) ≤ M → x ≤ M + δ + 3 = N + 3. Could be N+1?? No, x ≤ N. V[δ+3] ≤ N = V[δ+1] → condition false → else: x = V[k-1] + 1 = N + 1. y = N+1 - (δ+2) = M. while loop: x < N false immediately. V[δ+2] = N+1. Termination check: x >= N ✓ and y >= M ✓ → return! With V storing N+1 at diagonal δ+2, and trace snapshot already appended (before modification — snapshot has old values ≤ N).

Then backtrack: (x, y) = (N+1, M)? But we start backtrack at (N, M)! I set backtrack x,y = len(A), len(B) = (N, M), not (N+1, M). k = N - M = δ. Process dd = D... Hmm, but does the backtrack work from (N, M)? The path we "found" nominally goes through (N+1, M) — an invalid point. Hmm.

Let me reconsider. Maybe better termination check: check `if x >= N and y >= M` BEFORE storing, or check differently. Actually the real question: when V[k-1] = N (bottom reached) and we take deletion branch producing x = N+1, y = M: this represents "path that went to bottom of A then one more deletion" — nonsense. But actually, wait: is it possible that V[δ+1] = N with y = M-1 at step D-1 WITHOUT an earlier termination? The path on diagonal δ+1 reached (N, M-1) with D-1 edits. Then... hmm, could the minimal D be smaller? Not necessarily.

Hmm, but actually let me reconsider: maybe in valid scenarios, when furthest point on diagonal δ+1 is (N, M-1) at step D-1, is there some point at (N,M)? A D-1-edit path to (N, M-1): from there, we need one more edit: insertion of B[M-1] → (N, M) — D edits on diagonal δ. So D-path exists. But also on diagonal δ+1: D-path could extend via snake? (N, M-1): snake requires x<N — no. So V[δ+1] stays N at step D too (well, candidates via deletions from δ or insertions... whatever).

At step D, processing k = δ+2: from k-1 = δ+1: deletion candidate x = N+1 invalid. From k+1 = δ+3: insertion candidate x = V[δ+3]. Hmm, but wait — is diagonal δ+2 processing even needed? The answer we want is found on diagonal δ at step D. But the loop processes k = δ+2 before/after k = δ? Loop order: k from -D to D step 2; δ+2 > δ so k=δ processed first (if both in [-D, D]). At k = δ: candidates from δ-1 (deletion) or δ+1 (insertion): insertion: x = V[δ+1] = N, y = N - δ = M ✓. while: x<N false. V[δ] = N. Termination: x>=N and y>=M → return. 

So termination happens at k=δ processing, BEFORE reaching k=δ+2. So the invalid candidate never computed? k=δ is processed before k=δ+2 in the loop ✓. And the check after storing V[δ] triggers return. So we return before computing invalid x = N+1. But what if k = δ doesn't trigger termination because V[δ+1] ≠ N? Then can V[k-1] = N happen for the problematic k? The problematic scenario requires some diagonal k' = k-1 with V[k'] = N and y < M, i.e., k' > δ (since y = N - k' < M ⟺ k' > δ). And termination requires diagonal δ reaching (N, M). If V[δ] = N... hmm, V[k'] = N for k' > δ means bottom edge reached at diagonal k'. Does that imply the δ diagonal can reach M? The furthest on δ: x_δ ≥ ? There's monotonicity: V[k'] ≤ V[k'+... hmm. Actually there's a known property: furthest reaching points satisfy V[k-1] ≤ V[k] + 1? (adjacent diagonals). If V[δ+1] = N, then V[δ] ≥ N - 1 via snake/... hmm not necessarily.

Let me think about whether the invalid candidate can be computed before termination. The loop at step D processes k = -D, -D+2, ..., D. Problematic k: those with k-1 > δ, i.e., k ≥ δ+2 — processed AFTER k = δ. So the first problematic k comes after δ. At k = δ: if termination triggered (V[δ] = N, y = M) → return before problematic ones. When could k=δ NOT terminate but some k' > δ have V[k'] = N (stored at step D-1)? V[δ] after step D processing: x_δ = max(V[δ-1]+1 deletion candidate... x_δ = V[δ+1] (if V[δ-1] < V[δ+1]) else V[δ-1]+1). If V[δ+1] = N (from step D-1): insertion branch gives x = N, y = M → termination ✓. So if V[δ+1] = N at step D-1, then at step D, k=δ terminates. 

What if V[k'] = N for k' ≥ δ+3 (not δ+1), stored earlier (step < D-1)? At step D-1... hmm, k' ≥ δ+3, V[k'] = N at step D-2 (parity: k' ≡ D-2 ≡ δ mod 2... but k' ≡ step parity; k' ≥ δ+3 ≡ δ+1 mod 2 → k' ≡ δ+1 ≢ δ. Contradiction — furthest points at step dd lie on diagonals ≡ dd (mod 2). So V[k'] = N with k' > δ requires step dd ≥ k' with k' ≡ dd. Steps with k' ≡ dd mod 2: dd ∈ {k', k'+2, ...}. And dd ≡ δ mod 2? No—dd ranges all values; the problematic k' has parity... let's parametrize: at step dd (any parity), furthest points on diagonals with |k| ≤ dd, k ≡ dd (mod 2). For V[k'] = N, k' > δ, k' ≡ dd (mod 2), y = N - k' < M.

At step dd+1 (parity k'+1), diagonal k = k'+1 (≤ dd+1 ✓) processes: k-1 = k' with V[k'] = N: is V[k'] < V[k+1] = V[k'+2]? V[k'+2] was set at step dd-1 (parity ✓): its x ≤ ? diagonal k'+2 furthest at step dd-1: could it exceed N? No, ≤ N. So V[k-1] = N ≥ V[k+1] → condition false → deletion branch → x = N+1 computed! Unless... hmm! At step dd+1, is k = k'+1 in range? k ≤ dd+1 ✓ (k'+1 ≤ dd+1 since k' ≤ dd). And k ≥ -dd-1 ✓. So yes, at step dd+1, diagonal k = k'+1 computes x = N+1, stores V[k'+1] = N+1?!? And y = N+1-(k'+1) = N - k' < M — termination check fails, and we store an invalid out-of-grid x!

Wait, but hold on — can V[k'] = N even happen at step dd without prior termination? V[k'] = N means a dd-edit path reaching bottom edge x=N at diagonal k' > δ, i.e., endpoint (N, N-k') with N-k' < M. Sure that's possible: e.g., delete lots of A. Example: A = "ab", B = "cd" wait trimming... take A = ["a","b","c"], B = ["z","c"], δ = 1. D = ? LCS "c" L=1 → D = (3-1)+(2-1) = 3? D = N+M-2L = 5-2 = 3. δ=1, D=3 ✓ parity.

Forward: N=3, M=2.
d=0: k=0: x=V[1]=0,y=0. A[0]="a" vs B[0]="z" no. V[0]=0.
d=1: k=-1: x = V[0] = 0, y = 1. A[0]="a" vs B[1]="c"? no. V[-1]=0. k=1: x = V[0]+1 = 1, y = 0. A[1]="b" vs B[0]="z" no. V[1]=1.
d=2: k=-2: x = V[-1] = 0, y = 2. y<M? 2<2 no. V[-2] = 0. k=0: V[-1]=0 < V[1]=1 → x = V[1] = 1, y = 1. A[1]="b" vs B[1]="c"? no. V[0]=1. k=2: k==d → x = V[1]+1 = 2, y = 0. A[2]="c" vs B[0]="z"? no. V[2]=2.
d=3: k=-3: x = V[-2] = 0, y = 3?? y = x - k = 3 > M=2. Hmm! Insertion branch from k=-2: x = V[-2] = 0, y = 0-(-3) = 3 > M. That's an insertion of B beyond end — invalid! while loop: x<3 ✓, y<2 ✗ → no extension. V[-3] = 0, y=3 out of grid. Hmm — that also stores an out-of-grid point (y > M)! 

Hmm so standard Myers does produce out-of-grid furthest points near the corner? Let me check the paper: the furthest reaching D-path on diagonal k is defined... The paper's forward algorithm: "For k in [-D, D]... if k = -D or V[k-1] < V[k+1] then x = V[k+1] else x = V[k-1]+1; y = x - k; while x < N & y < M & a[x]=b[y] do x,y++; V[k] = x". Indeed out-of-grid endpoints can occur for k = -D when many insertions happen: the insertion move y+1 requires y < M. Here at d=3, k=-3: taking insertion from (0, 2) → (0, 3): y=3 > M invalid. The standard algorithm still stores V[-3]=0. Does this break correctness? The paper argues the algorithm computes the minimal D because termination occurs on diagonal δ at step D. Out-of-grid stored values are never used productively... but could they be used and cause wrong results?

Continue example d=3: k=-3 stored V[-3]=0 (y=3). Termination check: x>=N? 0 no. k=-1: condition: k==-d? no. k != d ✓. V[base-1]=V[-2]=0 < V[base+1]=V[0]=1 → x = V[0] = 1, y = 1 - (-1) = 2. while: x<3, y<2? no. V[-1] = 1. Check: x>=3? no. k=1: V[0]=1 < V[2]=2 → x = V[2] = 2, y = 1. while: A[2]="c" vs B[1]="c" ✓ → x=3, y=2. Now x<3 fails. V[1] = 3. x>=3 ✓ y>=2 ✓ → return d=3. 

Backtrack: x=3,y=2. dd=3: trace[3] = V[off-3 : off+4] snapshot before d=3 = values after d=2. v[k+3]. k = 3-2 = 1. k==-3? no. k!=3 ✓: v[1+3-1]=v[3]=V[0]=1 < v[1+3+1]=v[5]=V[2]=2 → true → pk = 2. px = v[2+3]=v[5]=2, py = 2-2 = 0. while x>2? 3>2 ✓ and y>0 ✓: emit ("=", A[2]="c"), x=2, y=1. Now x==px → emit ("+", B[y-1]=B[0]="z"), y=0. Now x=2, y=0.

dd=2: trace[2] = before step 2, values after d=1: k... slice V[off-2:off+3] ↔ k=-2..2: contains V[-1]=0, V[0]=0, V[1]=1 (and stale ±2). k = x-y = 2. k == -2? no. k != 2? no → pk = 1. px = v[1+2]=v[3] = V[1] = 1. py = 1-1 = 0. while x>1 ✓ and y>0? y=0 ✗ → stop. x != px → emit ("-", A[1]="b"), x=1. 
dd=1: trace[1] ↔ k=-1..1: V[-1]=0? wait snapshot before step 1 = after step 0: V[0]=0. slice V[off-1:off+2]: [stale, V[0]=0, stale] → indices 0,1,2 ↔ k=-1,0,1: [−1, 0, −1]. k = x - y = 1. k == -1? no. k != 1? no → pk = 0. px = v[0+1] = 0, py = 0. while x>0 ✓ y>0? y=0 ✗. x != 0 → emit ("-", A[0]="a"), x=0.
Then x=0: prepend nothing. Final script reversed: [("-", "a"), ("-", "b"), ("=", "c"), ("+", "z")].

Check: "="+"-" → a, b, c ✓. "="+"+" → c, z ✓. D = 3, minimal (L=1: (3-1)+(2-1)=3) ✓. 

So out-of-grid points (like V[-3] with y=3) didn't cause problems here. Why, in general, is it safe? This is the standard algorithm as published; the paper proves correctness. The concern about x = N+1: my analysis suggested a scenario could compute x = N+1 before termination. Let me re-examine: for x = V[k-1] + 1 = N + 1 to be computed, need V[k-1] = N, i.e., furthest point on diagonal k-1 at x=N. Then... hmm, also need the condition V[k-1] >= V[k+1] with k != d.

Known invariant: V[k-1] ≤ V[k+1] + 1? or V values differ by at most... Actually known: V[k] furthest points satisfy: x(k) ≤ x(k-2) + 1? Hmm. There's a lemma: the furthest reaching points form a "staircase": V[k] ≤ V[k±2] + 1 (when both defined)... Not exactly; with snakes things vary.

Let me think about whether x = N+1 can occur pre-termination and whether it breaks backtracking. Suppose at step dd, diagonal k gets x = N+1, y = N+1-k ≤ M (need y ≤ M for the while check... y could be > M too). Stored V[k] = N+1. Later steps might use V[k] = N+1 as predecessor producing more out-of-grid points. Eventually termination happens when diagonal δ reaches (N, M)... but with poisoned values, could the backtrack reconstruct incorrectly?

Hmm, actually wait. Let me reconsider: can V[k-1] = N happen? V[k-1] = N means furthest (dd-1)-path on diagonal k-1 reaches x = N. This path consumed all of A. Termination condition we check: only x==N AND y==M. If y < M, no termination. Now at step dd, k = k-1 + 1: deletion candidate from (N, y_{k-1}) → invalid (N+1, y_{k-1}). The while doesn't run. V[k] = N+1. This IS what standard implementations do, and it's... Let me check Coglan's implementation: his `find_furthest_reaching_D_path` in the trace version (blog part 2):

```ruby
def most_forward(array, d, k)
  if (k == -d or (k != d and array[k - 1] < array[k + 1]))
    return array[k + 1]
  else
    return array[k - 1] + 1
  end
end
```

and no bounds check. His tests pass. Hmm, but maybe there's an argument that V[k-1] = N can't happen pre-termination: if a (dd-1)-path reaches (N, y) with y < M, then from (N, y), remaining to reach (N, M) requires inserting M - y lines of B: that's y' = M... a path with (dd-1) + (M - y) edits reaching (N, M). So D ≤ dd - 1 + M - y. Hmm no contradiction.

Alternative: maybe the algorithm can be shown correct regardless because backtrack handles it? Let's think: if V[k] = N+1 (y = M' ≤ M), is this point ever used beneficially? Insertion branch from k: diagonal k+1 at step dd+1: candidate x = V[k] = N+1 → y = N+1 - (k+1) = y_prev... Then further propagation.

Hmm, but here's a thought: when the furthest path on diagonal k-1 reaches x = N at step dd-1, consider diagonal δ... 

OK here's a cleaner approach to sidestep all doubt: add bounds guards in the forward loop:

```
if x > N: x = ... 
```

Hmm, guards could change furthest-reaching semantics and break minimality? Guarding deletion branch: `x = V[k-1] + 1` then `if x > N: skip storing?` But then V[k] stale (sentinel -1) — parity discipline broken for future reads.

Alternative: clamp: the candidate via deletion from V[k-1] = N is dominated by the snake... hmm.

Let me look at this from the theory side once more. Myers' Lemma: the furthest-reaching (as defined with moves: down = consume A, right = consume B, both allowed whenever within grid) — the endpoints are always within the grid BY DEFINITION of paths (paths can't leave the grid). The greedy computation: candidate from k-1: endpoint = snake extension of (V[k-1]+1, y). If V[k-1]+1 > N, this candidate doesn't exist (invalid move). The greedy pseudo-code computes it anyway. Is the computed value ever USED in a way that matters? The values are used in two ways: (1) the selection comparisons V[k-1] < V[k+1]; (2) as predecessor for backtrack; (3) termination check.

Consider: at step dd, for diagonal k, candidates: from k+1 (insertion): exists iff V[k+1] has y = V[k+1] - (k+1) < M (need room to insert). From k-1 (deletion): exists iff V[k-1] < N, i.e., V[k-1] ≤ N-1, giving x = V[k-1]+1 ≤ N.

If V[k-1] = N: deletion candidate invalid. The correct furthest D-path on diagonal k is then via insertion (if valid) or doesn't exist... but wait, actually could exist via insertion branch: x = V[k+1], y = V[k+1] - k = (V[k+1] - (k+1)) + 1 ≤ M ✓ always valid (insertion needs y' < M where y' = y - 1... the insertion consumes B[y'] where y' = y_before; y_before = x - (k+1) must be < M ✓ since y = y_before + 1 ≤ M needed → y ≤ M ⟺ V[k+1] - (k+1) ≤ M - 1... hmm insertion move consumes B line at y_before, requires y_before < M. Then y = y_before + 1 ≤ M ✓. So valid iff y ≤ M i.e. V[k+1] - k - 1 < M.)

The greedy code picks deletion (since V[k-1] = N ≥ V[k+1]) computing x = N+1 instead of the valid insertion candidate. So greedy deviates from true furthest-reaching. Does it matter for finding minimal D? The termination only happens when valid (N, M) reached. The question is whether these poisoned values can prevent finding (N,M) at the true minimal step, making the algorithm report a larger D (breaking minimality!) or worse.

Hmm, when does V[k-1] = N with the diagonal k-1 not δ-... Let me consider: can the poisoned V[k] = N+1 later cause a too-early false termination? Termination checks x >= N and y >= M at a stored point — a poisoned point (N+1, M) at diagonal k = N+1-M... x = N+1 ≥ N ✓, y = M ✓ → false termination at diagonal δ' = k = δ+1? Wait earlier scenario: at step D, k = δ+2, x = N+1, y = M → false termination at step... but if D is the true minimal, and we're processing k = δ+2 at step D AFTER k = δ (loop ascending), termination at k=δ happens first. But if the true minimal is D and the poisoned termination happens... it happens at the same step D, just at a later k in the loop. The backtrack then starts at (N, M) — hmm, but our backtrack starts from (N, M) regardless (we pass x=N, y=M). The poisoned V[δ+2] = N+1 isn't referenced by backtrack from (N, M) on diagonal δ. Would backtrack from (N,M) be valid? The path through diagonal δ at step D: V[δ] = x_δ computed from candidates: insertion from δ+1: x = V[δ+1]; deletion from δ-1: x = V[δ-1]+1. Is V[δ] = N guaranteed when true minimal is D? The true furthest D-path on δ reaches (N, M)... by definition of D being minimal, some D-path reaches (N,M), on diagonal δ. Greedy furthest-reaching on δ ≥ that ✓ — as long as greedy computes the true furthest on δ. Greedy on diagonal δ: selection V[δ-1] vs V[δ+1] — these could be poisoned themselves?!

Ugh. This is getting deep. Let me look at actual known-good implementations to confirm the standard approach is trusted. The "myers diff in O(ND) time" constant-memory-per-step trace version is very widely used (e.g., in many GitHub gists, the "Myers Diff using C# (2)" etc.) with exactly this code and is considered correct. Actually, hmm, there IS a known subtle issue: some implementations add `if x > N or y > M` guards? Let me recall the well-known implementation from "The Myers diff algorithm" series by James Coglan — in part 2 (finding the D-path), his code:

```ruby
def shortest_edit
  n, m = ...
  max = n + m
  v = Array.new(2 * max + 1)
  v[1] = 0
  (0..max).step(1).each do |d|
    (0..d).step(2)... (actually -d..d step 2)
      ...
      while x < n && y < m && a[x] == b[y]
        x, y = x + 1, y + 1
      end
      v[k] = x
      return d if x >= n and y >= m
```

Yes this is the canonical version, no bounds checks, and considered correct. The correctness proof of Myers' algorithm covers this: the lemma states furthest reaching values; the paper's algorithm is exactly this. I believe the paper handles boundary via the observation that paths and endpoints stay in grid in the THEORETICAL definition, and the pseudo-code is proven equivalent. Actually, let me recall the paper's forward algorithm more precisely (Myers 1986, Algorithm in Figure... "for D ← 0 to N+M"): 

Paper (from memory of the GABA/xdiff style): 

```
For D = 0 to M + N:
  For k = -D to D in steps of 2:
    If k = -D or (k ≠ D and V[k-1] < V[k+1]) then x ← V[k+1]
    Else x ← V[k-1] + 1
    y ← x - k
    While x < N and y < M and A[x+1] = B[y+1] do x, y ← x+1, y+1  (1-based)
    V[k] ← x
    If x ≥ N and y ≥ M then V... D is the answer, backtrack.
```

Yes — that's exactly the paper. And the paper proves correctness. The concern about out-of-grid: note that for the deletion candidate to exceed the grid, we need V[k-1] = N. Let me try to prove this can't happen before termination... 

Suppose at end of step dd (all diagonals processed), no termination yet, and suppose V'[k'] = N for some k' with y' = N - k' < M (bottom reached, not corner). k' ≡ dd parity, |k'| ≤ dd.

Claim: then at step dd+1... hmm, I want to show either termination happens at step dd+1 before any poisoned value is USED in a way that matters, or poisoned values never get computed.

Actually, hmm, wait. Let me reconsider: the candidate selection condition `V[k-1] < V[k+1]`: known invariant from the paper: V[k-1] < V[k+1] ⟺ ... The paper's Lemma 1 part: "V[k-1] < V[k+1]" selects based on which gives further reach. There's also monotonicity: V[k] ≥ V[k-1] - 1? and V[k] ≤ V[k+1] + 1? Hmm: consider furthest points on adjacent diagonals — known relation: V[k] ≤ V[k-1] + 1 (move from k-1 by one deletion plus snake can't gain more than... no, snake can be long: V[k] can be much larger than V[k-1]+1? On diagonal k vs k-1: furthest x on k vs furthest x on k-1. A point (x, x-k) on k: is (x-1, x-k) on k-1 with same d-path? Preceding it was a deletion... Not generally bounded.

Let me just empirically trust the canonical algorithm — it's extremely well-tested (it's the basis of many diff tools). But let me reason once more about whether poisoned values can break the specific guarantees we need:

We need: (1) returned d equals minimal D; (2) backtrack produces valid script of exactly d edits.

For (1): termination check `x >= N and y >= M` at a stored point: poisoned points have x = N+1 > N with y ≤ M... could y == M? (N+1, M): x ≥ N ✓ y ≥ M ✓ → spurious termination at step dd where true D might be larger? When x = N+1, y = x - k = M → k = N + 1 - M = δ + 1. But stored values at step dd have k ≡ dd (mod 2) and δ+1 vs δ parity differ — k = δ+1 stored at step dd with k ≡ dd mod 2 → dd odd relative... fine possible. Hmm: (N+1, M): would require while loop not run (y = M means y < M false ✓ no snake). And requires V[k-1] = N where k - 1 = δ: V[δ] = N at step dd-1 with y = N - δ = M... V[δ] = N means y = M → termination would have occurred at step dd-1 already! So V[δ] = N can only exist post-termination... but we return immediately upon terminating, so pre-termination V[δ] ≠ N... wait V[δ] = N with y = M - is exactly termination; we return right when storing it. So pre-termination, V[δ] < N or (V[δ] = N impossible? V[δ] = N ⇒ y = N - δ = M ⇒ termination). So pre-termination V[δ] stores x with y = x - δ < M... but x = N on diagonal δ ⟺ y = M. So pre-termination, all V[k] have (x, y) ≠ (N, M), and x = N possible only for k > δ... k > δ: y = N - k < M ✓ possible (bottom edge).

So poisoned x = N+1 requires predecessor V[k-1] = N with k-1 > δ (shown above y_{k-1} = N-(k-1) < M ⟺ k-1 > δ; also k-1 < δ... if k-1 < δ, y > M — impossible since stored y ≤ M; so k-1 > δ strictly, or k-1 = δ excluded pre-termination).

Then poisoned V[k] = N+1 at step dd, k > δ+1. Now at step dd+1, diagonal k+1: insertion candidate x = V[k] = N+1 → y = N+1-(k+1) = N - k ≤ M - 2 (since k ≥ δ+2 → N - k ≤ N - δ - 2 = M - 2). while: y < M ✓, x < N? x = N+1... wait x here is the NEW candidate x = N+1, then while checks x < N → false. V[k+1] = N+1 stored, y = N - k < M. Termination check fails (y < M). Propagation: V[k+1] = N+1 with y < M — bottom+1 edge.

Then further steps: from V[k+1] = N+1: deletion candidate → x = N+2, etc. These poisoned values live on diagonals > δ+1... do they ever feed back into diagonals ≤ δ? Diagonal k-1 candidates: at step dd', diagonal k'' uses V[k''-1] and V[k''+1]. Poisoned values are at diagonals ≥ k > δ+1. Diagonal k-1 = poisoned predecessor's diagonal... For a diagonal j ≤ δ to get poisoned, need V[j-1] or V[j+1] poisoned → poisoning spreads from k to k±1 only via ±1 candidates... Poisoned V[k] = N+1 used at step dd+1 for diagonal k+1 (giving N+1 again) and for diagonal k-1: deletion candidate x = V[k] + 1 = N+2?? Condition V[k-1] < V[k+1]: hmm.

Key question: does poisoning ever reach diagonal δ and cause a WRONG result (spurious termination or bad backtrack)? Spurious termination requires a stored point with x ≥ N and y ≥ M, i.e., x = N+1 (or more) and y = M exactly... or x = N, y = M (legit). Poisoned x = N+1 with y = M: y = x - k = M → k = δ+1 — but poisoned values only on diagonals ≥ δ+2! Because poisoning starts at k > δ+1... wait let me recheck: poisoning starts when V[k-1] = N, k - 1 > δ → k > δ+1 → k ≥ δ+2 ✓. Propagation: poisoned V[k]=N+1 spreads to diagonal k±1 at next step: to k+1: x = N+1 (insertion) — diagonal k+1 ≥ δ+3 poisoned (y = N-k-1 < M-1). To k-1: at step dd+1, diagonal k-1: candidates: from k: deletion → x = N+2?! condition V[k-2] < V[k]: V[k] = N+1; V[k-2] ≤ N → condition true → insertion branch: x = V[k] = N+1, y = N+1-(k-1) = N-k+2 ≤ M - 1+2... hmm k ≥ δ+2 → N - k + 2 ≤ M. So V[k-1] = N+1, y ≤ M. If y = M → k - 1 = δ+1 → poisoned (N+1, M) at diagonal δ+1!! Then termination check: x ≥ N ✓ y ≥ M ✓ → SPURIOUS TERMINATION at step dd+1 before true minimal?!

When is y = M here? Need N - k + 2 = M → k = δ + 2. So: poisoned V[δ+2] = N+1 (y = M-2... wait y of V[δ+2] = N+1-(δ+2) = M-1). Hmm let me redo: poisoning origin: V[k] = N+1, k ≥ δ+2, y = N+1-k. For k = δ+2: y = M-1. Then at next step, diagonal k-1 = δ+1: insertion from δ+2: x = N+1, y = N+1-(δ+1) = M. V[δ+1] = N+1, y = M → termination check triggers: x ≥ N, y ≥ M → return at step dd+1 with the algorithm claiming D = dd+1. But actual minimal D might be > dd+1? Hmm wait — actually hold on: if there's a path... V[δ+1] = N+1 is fake. The check x >= N uses stored poisoned value. So the algorithm would return D' = dd+1 possibly < true D? Hmm, but wait: is a dd+1... hmm, actually if poisoning happened at step dd (first poisoned V[k] = N+1), can dd+1 < true D? Poisoning needs V[k-1] = N at step dd-1 with k-1 > δ: a (dd-1)-path reaching bottom edge (x=N, y = N-(k-1) < M). Then true D ≤ dd - 1 + (M - y) edits? From (N, y) continue with insertions: dd-1 + (M-y) edits reach (N, M). So true D ≤ dd - 1 + M - y < dd + 1 (since M - y = N - k + 1... y = N-k+1 < M → M - y ≥ 1 → D ≤ dd - 1 + M - y; with k ≥ δ+2: M - y = M - (N - k + 1) = k - δ - 1 ≥ 1 → D ≤ dd - 1 + (k - δ - 1)). If k = δ+2: D ≤ dd - 1 + 1 = dd. So true D ≤ dd < dd+1 — spurious return dd+1 would be LARGER than true → non-minimal! And also, hmm, but would true termination have happened at step ≤ dd before poisoning? Poisoning at step dd means step dd didn't terminate. True D ≤ dd means a D-path reaches (N,M) with D ≤ dd; greedy furthest-reaching would find termination at step D ≤ dd... IF greedy is correct up to that point. Circular.

OK this is getting really involved. Let me test the concern with a concrete potential counterexample. Poisoning origin scenario: at step dd-1, V[k-1] = N, k-1 = δ+1, y = M-1. So a (dd-1)-edit path reaches (N, M-1) on diagonal δ+1. Diagonal δ+1 = N+1-... point (N, M-1) means N - (M-1) = N - M + 1 = δ + 1 ✓ consistent. Path with dd-1 edits reaching (N, M-1): edits = deletions of A + insertions of B... The script reaching (N, M-1): consumed all A and M-1 of B. From there, inserting B[M-1] reaches (N,M) with dd edits. So true D ≤ dd. Then termination should happen at step ≤ dd. Would greedy terminate at step dd or earlier at diagonal δ? At step dd, diagonal δ: insertion from δ+1: x = V[δ+1] = N → y = M ✓ termination at step dd on k=δ BEFORE processing k = δ+2 (ascending order: δ < δ+2). So poisoning origin V[δ+1] = N at step dd-1 leads to legit termination at step dd at diagonal δ. The poisoned candidate at k=δ+2 at step dd is computed only if we didn't terminate — but we DID terminate at k=δ (processed before δ+2). 

Wait, but is k=δ processed at step dd? Need |δ| ≤ dd ✓ (δ ≤ k-1 ≤ dd-1... yes δ < k ≤ dd). Parity: δ ≡ D ≡ dd? dd here: the step where k=δ+2... we had V[k-1] = V[δ+1] = N at step dd-1, parity δ+1 ≡ dd-1 → δ ≡ dd - 2 ≡ dd ✓. So at step dd, k=δ is in range with correct parity, insertion candidate x = V[δ+1] = N, y = M → termination ✓ before k=δ+2 computed. 

Now general poisoning origin: V[k-1] = N at step dd-1, k-1 ≥ δ+3 (not just δ+1). Then y = N-(k-1) ≤ M-3. True D ≤ dd-1 + (M-y) = dd-1 + k-δ-1+... M - y = M - (N - k + 1) = k - δ - 1 ≥ 2 → D ≤ dd - 1 + (k-δ-1) ≥ dd+1 — no strong bound. Poisoned V[k] = N+1 at step dd. Propagation to diagonal k-1 at step dd+1 (shown above): V[k-1] = N+1 via insertion from poisoned V[k] — requires condition V[k-2] < V[k]: V[k-2] ≤ N (pre-poisoning values ≤ N; k-2 ≥ δ+2 could itself be poisoned? only ≥ δ+2... hmm at step dd-1, diagonals ≥ δ+2 could... poisoning starts at step dd (first poison). So at step dd, all values except possibly V[k] for the single poisoned diagonal... actually multiple diagonals could get poisoned at step dd? V[k'] = N+1 requires V[k'-1] = N pre-step... k'-1 > δ with V[k'-1] = N at step dd-1. Multiple bottom-edge-reaching diagonals possible: V[j] = N for several j > δ (all with parity dd-1: j ∈ {δ+1, δ+3, ...}). Hmm wait, can V[j] = N for multiple j? If furthest on δ+1 reaches (N, M-1), furthest on δ+3 reaches (N, M-3)... yes multiple.

So at step dd, every diagonal j' = j+1 for poisoned-predecessors j gets V[j'] = N+1 (if condition selects deletion branch — condition V[j'-1] < V[j'+1]: V[j'-1] = N, V[j'+1] ≤ N → condition false → deletion branch → poisoned ✓). So diagonals δ+2, δ+4, ... poisoned with N+1 at step dd. Then at step dd+1: diagonal δ+1: candidates from δ (V[δ] legit ≤ N... could be N? pre-termination V[δ] = N impossible... V[δ] = N ⟺ termination; could V[δ] = N at step dd without y=M? y = N - δ = M always. So no) and from δ+2 (poisoned N+1): condition V[δ] < V[δ+2] = N+1 → true (V[δ] ≤ N) → insertion branch: x = V[δ+2] = N+1 → y = N+1-(δ+1) = M → V[δ+1] = N+1 → termination check x≥N ✓ y≥M ✓ → SPURIOUS RETURN at step dd+1 (unless legit termination happened at step dd at diagonal δ first!).

At step dd, was there legit termination at diagonal δ? V[δ] at step dd: candidates from δ-1 (deletion: x = V[δ-1]+1 ≤ N) and δ+1 (insertion: x = V[δ+1] = N if V[δ+1] = N i.e. bottom edge reached at δ+1 at step dd-1). If V[δ+1] = N: insertion gives (N, M) → legit termination at step dd ✓ (this is the case analyzed above). If V[δ+1] < N (bottom edge reached only at deeper diagonals δ+3, δ+5,...): then V[δ] gets x ≤ N with y < M → no legit termination at step dd; at step dd+1, poisoned V[δ+2] = N+1 → V[δ+1] = N+1, y = M → spurious termination at dd+1. But is dd+1 ≥ true D? Hmm — true D: the bottom-edge point (N, y₀) at diagonal j ≥ δ+3, step dd-1: completing needs M - y₀ ≥ ... M - y₀ = j - δ - 1 insertions... wait from (N, y₀), insert B[y₀..M-1]: M - y₀ edits → path edits = (dd-1) + (M - y₀) = dd - 1 + M - N + j - 1... M - y₀ = M - (N - j) = j - δ. So D ≤ dd - 1 + (j - δ) where j ≥ δ+3 → D ≤ dd + j - δ - 1. For j = δ+3: D ≤ dd + 2. Spurious return at dd+1 might be < true D → WRONG (non-minimal) result!

Hmm wait, but hold on: if bottom edge reached at diagonal δ+3 at step dd-1 — path with dd-1 edits consuming all A and y₀ = M-3 lines of B... then remaining: 3 insertions → D ≤ dd+2. But also — hmm, what about diagonal δ+1's furthest at step dd-1: V[δ+1] = x with y = x-δ-1... via snake from (V[δ+3]... no. Let me try to construct a concrete counterexample or convince myself it can't happen.

Bottom edge at diagonal δ+3 with step dd-1: point (N, M-3), dd-1 edits. Then from (N, M-3): what's V[δ+1] at step dd-1? Furthest on δ+1 ≥ (N - ? ) hmm. A path reaching (N, M-3) on diagonal δ+3: its prefix passes through diagonal δ+1 at some point with fewer edits: the path had dd-1 edits total; the point (N, M-3) on diagonal δ+3; one edit earlier it was on δ+2 or δ+4... trace back: the path's endpoints on diagonal δ+1 with dd-3 edits... So there exists a (dd-3)-path reaching some point on δ+1, with y = x - δ - 1. Hmm, furthest V[δ+1] at step dd-1 ≥ that. At step dd, diagonal δ: insertion from V[δ+1]... 

Actually, let me think about the known invariant more carefully — I recall the paper has: "V[k-1] < V[k+1] iff ..." and there's a clean lemma (Myers Lemma 2?) that the furthest reaching points satisfy: if V[k-1] and V[k+1] both defined, then... hmm.

Alternatively — let me consider adding safety guards that provably preserve correctness: the standard fix used in some implementations (e.g., in git's xdiff myers with heuristics, or in "diff-match-patch"?) Hmm.

Honestly, the widely-used canonical implementation (this exact pseudo-code, thousands of production uses e.g. in jsdiff — "jsdiff" implements Myers exactly like this with trace and it's battle-tested, git-like quality). jsdiff (jsdiff library) convertChangesTo... jsdiff's diffArrays uses exactly:

```
for (var d = 0; d <= n + m; d++) {
    ...
    for (var k = -d; k <= d; k += 2) {
      ...
      if (k === -d || (k !== d && v[k - 1] < v[k + 1])) { x = v[k + 1]; }
      else { x = v[k - 1] + 1; }
      y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[k] = x;
      if (x >= n && y >= m) { ... return backtrack }
```

Wait, actually jsdiff has an extra guard: hmm, I recall jsdiff's myers:

```
let x = 0, y = 0 ... 
```

Actually I remember jsdiff has `if (k === -d || (k !== d && v[k-1] < v[k+1]))`... and no bounds guards. jsdiff is hugely used. Also "myers-diff" npm, etc. And python implementations of the trace algorithm circulating (e.g., the famous gist "Myers diff in Python" by... ) also use this exact code. If there were a correctness bug with repeated/large inputs, it'd have surfaced. The paper's proof covers the pseudo-code as given (the proof of Lemma 1 & the algorithm's correctness handles boundaries — I trust it; the subtlety I worried about is likely resolved by the paper's analysis: notably, maybe poisoned values CAN be stored, but they are provably never selected over valid candidates in ways that matter, or termination always occurs before poisoning matters. Let me try once more to see the flaw in my spurious-termination scenario:

Scenario: bottom edge reached at diagonal j = δ+3 at step dd-1: V[δ+3] = N (y = M-3), no earlier termination (requires also V[δ] ≠ N at all prior steps etc.). Also need... for the spurious return at dd+1 to beat legit termination, need V[δ+1] ≠ N at step dd-1 (else legit termination at dd as shown). But wait — CAN V[δ+1] < V[δ+3] = N? Furthest on δ+1 vs δ+3 both at step dd-1: relation? Consider the furthest (dd-1)-path on diagonal δ+3 ending at (N, M-3). Its predecessor at step dd-2 was on diagonal δ+2 or δ+4 — hmm. Let me think about whether V[δ+1] ≥ N - ... Actually here's a cleaner relation I can try to prove: **V[k] ≥ min(V[k-2] + 1, ...)** hmm.

Try instead: relation between adjacent diagonal furthest points at same step: Claim: V[k+1] ≥ V[k] - 1? i.e., x on diagonal k+1 at least x on k minus 1. Proof attempt: furthest (dd)-path on diagonal k ends at (V[k], V[k]-k). Its predecessor at step dd-1 on diagonal k-1 or k+1... if predecessor on k+1: then V[k+1] (at step dd-1) ≥ V[k]... that's step dd-1. Hmm indices.

Let me try a different known lemma (from Myers paper, Lemma 2 or so): "V[k-1] < V[k+1] iff x = V[k+1] ..." — the selection criterion. Also the paper claims the greedy algorithm computes furthest reaching correctly — with paths defined in-grid. If the greedy can compute out-of-grid values, the lemma would be violated — so either poisoning can't happen, or the lemma only applies in-grid and poisoned values don't matter... The paper's Lemma 1: "For k ∈ [-D, D], V[k] is the furthest reaching endpoint..." — the algorithm is proven; so within the paper's framework, poisoning presumably can't happen or doesn't affect. Actually here's a thought: maybe the termination check in the paper is different: paper checks after computing whether the furthest reaching point... The paper's algorithm: "If x ≥ N and y ≥ M, then... D..." hmm.

Let me just try to construct a concrete counterexample to test poisoning empirically — mentally simulate a small case:

Want: bottom edge (x=N) reached at diagonal δ+3 but NOT at δ+1 (same step), and no termination before. 

Let A = "abc" (N=3), B such that M small. δ = N - M. Let me try M=2, δ=1. Want V[4] = 3?? δ+3 = 4: (N, y) = (3, 3-4) = (3,-1) — y negative, impossible. Need y ≥ 0: diagonal j ≤ N. j = δ+3 ≤ N → δ ≤ N - 3. With N=3: δ ≤ 0. Try δ = -1: N=3, M=4, A="abc", B=4 lines. j = δ+3 = 2: (3, 1). Want V[2] = 3 at step dd-1, and V[0] ≠ 3 same step (y at δ=0 diag: x=3 → y=3 → would terminate (y ≥ M=4? y=3 < 4, no termination!). Hmm wait — termination needs y ≥ M too. V[0] = 3 → y = 3 < M=4 → no termination. Interesting — so V[j] = N with j < δ... no wait here j=2 > δ=-1. Hmm I need j > δ for y < M: j=2, y = 3-2 = 1 < 4 ✓.

So want: step dd-1 has V[2] = 3 (point (3,1)) without prior termination, then poisoning at dd (V[3] = N+1 = 4, y=0), then at dd+1: diagonal 1... wait poisoned spreads to k-1 = 2? Hmm my earlier analysis: poisoned V[k]=N+1 at step dd spreads to k-1 at dd+1 giving V[k-1] = N+1 y = N-k+2; termination when that y = M. Here k=3: V[3]=4 (y = 4-3 = 1 ≤ M... y=1). Step dd+1, diagonal k-1=2: insertion from k=3: x = V[3] = 4, y = 4 - 2 = 2 < 4. V[2] = 4, y=2. No termination. Continue: step dd+2, diagonal 1: insertion from 2: x = 4, y = 3 < 4: V[1] = 4. No termination (y=3 <4). Step dd+3: diagonal 0: insertion from 1: x = 4?? y = 4. V[0] = 4, y = 4 = M, x = 4 ≥ N → termination at step dd+3 with... but wait, that's AFTER spreading through 3 poisoned steps. Meanwhile, could legit termination have happened earlier? Legit termination needs (3, 4): at diagonal δ=-1, step... V[-1] = 3 → y = 4 → termination. When does V[-1] reach 3? 

Let me construct actual strings. A = ["a","b","c"], B = ["b","b","b","c"]? Then δ = 3 - 4 = -1. LCS: "b","c" → L=2 → D = (3-2)+(4-2) = 3. Hmm D=3 < our poisoning scenario steps. Let me compute: 

d=0: k=0: x=V[1]=0,y=0. A[0]="a" vs B[0]="b": no. V[0]=0.
d=1: k=-1: x=V[0]=0, y=1. A[0]="a" vs B[1]="b": no. V[-1]=0. k=1: x=V[0]+1=1, y=0. A[1]="b"=B[0]="b" ✓ → (2,1): A[2]="c" vs B[1]="b": no. V[1]=2.
d=2: k=-2: x=V[-1]=0, y=2. A[0]="a" vs B[2]="b": no. V[-2]=0. k=0: V[-1]=0 < V[1]=2 → x=2, y=2. A[2]="c" vs B[2]="b": no. V[0]=2. k=2: x=V[1]+1=3, y=1. while: x<3 ✗. V[2]=3 ← bottom edge at diagonal 2, y=1 < 4! Poisoning origin at step 2?! Wait, check condition: k=2 == d → deletion branch: x = V[1]+1 = 2+1 = 3 ✓ valid (V[1]=2 < N=3, so x=3 = N exactly, in-grid!). y = 1. This is a legit furthest point (3,1) on diagonal 2 (path: insert b? path to (2,0) at d=1 then delete? hmm (2,0)→(3,1)? that's diagonal move (2,0)→? deletion gives (3,0), then snake B[0]="b" vs A[?]... hmm x=3,y=0: snake needs x<3 ✗. So how x=3,y=1? deletion from (2,0) gives (3,0) y=0, then snake can't move. y=1 ≠ 0... wait y = x - k = 3 - 2 = 1. Deletion from predecessor on k-1 = 1: predecessor (V[1], V[1]-1) = (2, 1). Deletion → (3,1) ✓ y stays 1. Yes: path consumed A[0..2] and B[0..0]. (3,1) legit ✓.
No termination (y=1 < 4).
d=3: k=-3: x = V[-2] = 0, y = 3. while: x<3 ✓ (0<3), y<4 ✓, A[0]="a" vs B[3]="c"? no. V[-3]=0. k=-1: condition V[-2]=0 < V[0]=2 → x = V[0] = 2, y = 3. A[2]="c" vs B[3]="c" ✓ → (3,4): x=3<3 ✗ stop. V[-1] = 3. Termination: x≥3 ✓, y≥4 ✓ → return d=3. ✓ legit D=3 found. No poisoning issue (poisoning would need V[k-1] = N → deletion x = N+1: at d=3, k=3: not processed (returned at k=-1). 

Let me engineer a case where bottom edge is reached at a high diagonal but NOT terminating for several steps, with LCS small. Hmm, bottom edge reached at diagonal j > δ means the path consumed all of A but less than all of B; remaining B must be inserted. For no quick termination, want the completion to require many edits... but completing from (N, y) needs exactly M - y insertions — and those insertions are always available! So from a dd-1-edit path at (N, y), a (dd-1 + M-y)-edit path reaches (N, M) — so true D ≤ dd-1+M-y. Greedy termination at diagonal δ happens when V[δ] = N. Does greedy find it at step D' = dd-1+M-y or earlier/later? The insertions from (N, y) go diagonally?? Insertions move y+1 with x fixed: diagonal increases by 1 each. From (N, y) on diagonal j = N - y, insertions move to diagonals j+1, j+2, ..., δ?? δ = N - M < j. WRONG direction — insertions from (N, y) move k = x - y upward: k increases as y increases (x fixed at N): diagonal N - M = δ requires y = M — from (N, y), inserting M - y lines: k goes from j up to... x - y with y increasing → k = N - y DECREASES from j = N-y down to N - M = δ ✓ (k = N - y). Insertion decreases k by 1 each ✓. So after M - y insertions: (N, M) on diagonal δ, total edits dd-1 + (M - y). Greedy: at step dd, diagonal j-1 = δ+... k = j - 1 = N - y - 1: insertion candidate from V[j] = N → x = N, y' = N - (j-1) = y+1. V[j-1] = N (if selected: condition V[j-2] < V[j] = N — V[j-2] ≤ N... if V[j-2] = N too... hmm). So V[j-1] = N at step dd (via insertion — legit, in-grid, (N, y+1)). Then step dd+1: diagonal j-2: insertion from j-1: x = N, y = y+2 — legit! Condition: V[j-3] < V[j-1] = N → true unless V[j-3] = N. So greedily V[j-1] = N propagates DOWN diagonals toward δ, reaching V[δ] = N at step dd + (j - δ) = dd + M - y - ... j - δ = (N-y) - (N-M) = M - y. So termination at step dd + (M-y) - 1 = (dd-1) + (M-y) = the true bound D̂ = dd-1+M-y. And poisoning: does poisoning interfere first? Poisoning spreads from bottom-edge diagonals upward (to higher k)? The poisoned candidates: V[j] = N used as deletion-predecessor at k = j+1 → x = N+1?? at step dd, k = j+1: condition V[j] < V[j+2]? V[j+2] ≤ N → false → deletion → x = N+1, y = N+1-(j+1) = y ≤ M-1 < M. V[j+1] = N+1 poisoned (if j+1 within range |k| ≤ dd: j+1 ≤ dd? j ≤ dd-1 ✓ so j+1 ≤ dd ✓). But ALSO at step dd, diagonal j-1 gets legit V = N (shown). At step dd+1, diagonal j: condition V[j-1] = N < V[j+1] = N+1 → true → insertion: x = N+1, y = N+1-j = y+1 ≤ M... if y+1 = M?? y+1 = M ⟺ j = δ+1: handled earlier (legit termination at dd via δ... wait if j = δ+1 then M - y = j - δ = 1, D ≤ dd, and legit termination at step dd at diagonal δ: k=δ processed before j=δ+1? δ < δ+1 ✓ processed first: V[δ] from insertion V[δ+1] = N → y = M → terminate ✓ before poisoning propagates. OK so for j ≥ δ+3 (y ≤ M-3): at step dd+1: diagonal j (insertion from poisoned j+1? condition V[j-1] = N < V[j+1] = N+1 → insertion: x = N+1, y = y+1 < M → V[j] = N+1 poisoned now too (was N legit... overwritten). Also diagonal j+2: from poisoned j+1: deletion → x = N+2, y = y... more poisoned. Meanwhile LEGIT propagation: diagonal j-1 = N (step dd) → at step dd+1, diagonal j-2: condition V[j-3] < V[j-1] = N → x = N, y = y+2 legit. So BOTH poisoned (upper diagonals) and legit (lower diagonals) propagate. Termination needs y = M at x = N: legit propagation: at step dd+t, diagonal j-t has V = N with y = y+t → reaches y = M at t = M - y → step dd + M - y - 1... wait step dd+t has diagonal j-t, y = y + t; y = M at t = M-y → termination at step dd + (M - y) at diagonal j - (M-y) = δ ✓. But wait, check k=δ processing vs poisoned interference: at step dd+t for t < M-y, is there spurious termination? Spurious requires x = N+1 with y = M → diagonal δ+1. Poisoned values at diagonal δ+1: when? Poisoned values occupy diagonals ≥ j-... hmm at step dd+1: diagonal j poisoned (N+1, y+1); at dd+2: diagonal j-1 poisoned? Condition at diagonal j-1 (step dd+2): V[j-2] (legit = N? no wait: at step dd+1, diagonal j-2 legit V[j-2] = N y=y+2; diagonal j poisoned N+1). At step dd+2, diagonal j-1: condition V[j-2] = N < V[j] = N+1 → insertion → x = N+1, y = N+1-(j-1) = y+2 < M → poisoned V[j-1] = N+1 (overwrites legit N!). Hmm! But the legit value at j-1 was only needed as a stepping stone for legit propagation to j-2... At step dd+2, diagonal j-2: condition V[j-3] < V[j-1]: V[j-1] at this moment = value after step dd+1 = N (legit, set at step dd) — processed in ascending k order at step dd+2: k=j-2 processes reading V[j-1] (from step dd+1 = N legit ✓) and V[j-3]. V[j-3] = N (legit from step dd+1? at step dd+1, diagonal j-3: insertion from j-2 (N at step dd): x=N, y=y+3 legit ✓ — wait was diagonal j-3 processed at step dd+1? |j-3| ≤ dd+1 ✓ if... yes). So at step dd+2, diagonal j-2: condition V[j-3] = N < V[j-1] = N → false → deletion branch: x = V[j-3]+1 = N+1!!! y = N+1-(j-2) = y+3 < M → POISONED V[j-2] = N+1?! 

Hmm wait, that's the tie case: V[j-3] = V[j-1] = N → deletion chosen → x = N+1. But the legit furthest on j-2 at step dd+2 should be (N, y+2) via insertion from j-1 = (N, y+2)... The greedy picked deletion because V[j-3] (N) is not < V[j-1] (N) — tie → deletion — giving x = N+1, y = y+3. Is (N+1, y+3) in-grid? x = N+1 > N ✗ — invalid point stored!

Hold on, is this right?? Let me double check the tie-break direction in the canonical algorithm: `if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1] else: x = V[k-1] + 1`. Tie → deletion (x = V[k-1]+1). Hmm. And here deletion gives out-of-grid. 

Hmm wait, but maybe my scenario is inconsistent: let me recheck whether legit V[j-3] = N at step dd+1 and V[j-1] = N at step dd simultaneously with the poisoned chain... Let me carefully re-derive with concrete numbers. Setup: bottom edge reached at diagonal j at step s (V[j] = N, y₀ = N - j < M). Poisoning begins at step s+1 on diagonal j+1 (deletion from (N,y₀) → (N+1, y₀))... wait earlier I said poisoning at k=j+1 requires condition V[j] < V[j+2] false: V[j+2] ≤ N = V[j] → false ✓ → deletion → (N+1, y₀) at diagonal j+1, y₀. ✓.

Legit propagation: diagonal j-1 at step s+1: insertion from (N, y₀) → (N, y₀+1) ✓ if condition V[j-2] < V[j] = N → true iff V[j-2] < N ✓ (pre-termination V[j-2]... V[j-2] = N would mean y = N-(j-2) = y₀+2 ≤ M... could V[j-2] = N already? That's another bottom-edge diagonal — fine, then condition false → deletion → x = V[j-2]+1 = N+1 poisoned directly at j-1! Hmm, but if V[j-2] = N at step s, then legit propagation continues from j-2 as well.)

This is getting messy but suggests: in the presence of ties (V[k-1] == V[k+1]), greedy prefers deletion, which can compute out-of-grid x = V[k-1]+1 when V[k-1] = N. Hmm hold on — wait. Actually for deletion to out-of-grid we need V[k-1] = N exactly. In my scenario at step s+2, diagonal j-2... let me recompute cleanly with an explicit example. Let me make one and simulate by hand (or reason very carefully).

Actually, you know what — let me look at this from a totally different angle. The classic implementation that IS proven and widely used also includes the trace-based backtrack; jsdiff, and the well-known blog series, and python ports — all use tie→? Let me recall exact jsdiff code (diff line 200-ish of myers-diff... ) From jsdiff source (lcs/myers?): Actually jsdiff uses a different structure. The famous implementation matching this trace style: "Myers' diff algorithm in Javascript" by ... and Python "myers_diff" gists: e.g. https://gist.github.com/... the popular one:

```python
def shortest_edit(a, b):
    n, m = len(a), len(b)
    max_ = n + m
    v = [0] * (2 * max_ + 1)
    trace = []
    for d in range(max_ + 1):
        trace.append(list(v))
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1] < v[k + 1]):
                x = v[k + 1]
            else:
                x = v[k - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x, y = x + 1, y + 1
            v[k] = x
            if x >= n and y >= m:
                return trace
```

Yes — this is the canonical widely-copied version (from Coglan's series). It uses v[k-1] < v[k+1] tie→deletion. And it's considered correct. Also note this version stores x = v[k-1]+1 possibly = N+1 hmm.

Let me try to actually find a real counterexample by brute mental force, or better, trust + add a safeguard. Actually, I CAN add a safeguard without breaking anything: guard the deletion candidate: `x = V[k-1] + 1; if x > N: x = N... ` hmm no.

Safeguard idea: clamp candidate to grid and skip storing if entirely out? Changes semantics...

Alternative safeguard: bound the candidate: since a deletion move requires x_prev < N, if V[k-1] == N, the deletion candidate is invalid; then the furthest on k should use the insertion candidate x = V[k+1]. So modify:

```
if k == -d:
    x = V[k+1]
elif k == d:
    x = V[k-1] + 1  # V[k-1] < N? at k=d...
else:
    if V[k-1] >= N... 
```

Hmm wait, but actually if V[k-1] = N, is insertion candidate valid and better? x = V[k+1] ≤ N < N+1 — yes valid. But could the TRUE furthest on k be via deletion from a NON-furthest (dd-1)-path on k-1 that ends at x < N? No — furthest from furthest is optimal (standard). If furthest (dd-1)-path on k-1 is at (N, y) with y ≤ M... deletion invalid; other (dd-1)-paths on k-1 end at x ≤ V[k-1] = N; deletion from any of them gives x ≤ N+1; the furthest valid deletion endpoint comes from the furthest path with x ≤ N-1... but intermediate paths are dominated: a (dd-1)-path on k-1 at (x', y') with x' < N: then... the furthest path at (N, y'') — hmm, dominance: any valid D-path endpoint on k built from k-1 predecessor: endpoint = (p+1, snake...). If p+1 ≤ N... the maximum over valid p ≤ N-1 is V'(k-1) = furthest x ≤ N-1 among (dd-1)-paths... but wait, why would furthest (dd-1)-path on k-1 with x = N preclude... the true furthest D-path on diagonal k via deletion = 1 + (furthest (dd-1) x on k-1 among paths with x ≤ N-1) + snake. Hmm, but here's a monotonicity point: if a (dd-1)-path reaches (N, y) on diagonal k-1, does some (dd-1)-path reach (N-1, y...)... yes: prefix of that path. Prefixes of a path are paths. The furthest path passes through (N-1, y-1)... on diagonal k-1 ✓ same diagonal. So there's a (dd-1... hmm, the prefix reaching (N-1, y-1) — how many edits? ≤ dd-1 (could be less, fine — we need a (dd-1)-path; a path with fewer edits is also a dd-1 path? No! dd-1 paths have EXACTLY dd-1 edits? Furthest-reaching dd-path: paths with at most d edits? The paper defines D-paths as exactly D edits? Hmm: "An D-path is a path with exactly D... " — actually the furthest-reaching analysis uses paths with at most D edits? The standard formulation: V[k] after step d = furthest x reachable on diagonal k with ≤ d edits — because extra edits... hmm, exactly-d edits vs at-most: a snake can't be followed by "free" moves; but a path with fewer edits can be padded? Not with productive moves. Standard Myers: " furthest reaching D-path" with EXACTLY D? Let me think: the recurrence computes V[k](d) from V[k±1](d-1) via one edit + snake. A path with exactly d edits. But "at most d edits" paths: any path with fewer edits on diagonal k at (x,y): can it be represented? The greedy values: known property: V[k](d) ≥ V[k](d-2)... (taking two more edits: down, right — both moves valid if x < N and y < M... at furthest point maybe not). Hmm.

The paper: "V[k] ← ...; the furthest reaching D-path" — and Lemma: the algorithm computes, for each diagonal k and D, the endpoint of the furthest reaching D-path (exactly D edits? I believe paths with at most D edits — because "D-path" in the paper means path whose... let me recall: "An edit script... A D-path is a path starting at (0,0) having exactly D non-diagonal moves"? Hmm... Actually if exactly D: then V[k](d) from V[k±1](d-1): the predecessor (dd-1)-path exactly dd-1 edits ✓ consistent.

If exactly-d semantics: from furthest (dd-1)-path at (N, y): deletion invalid. Other exactly-(dd-1)-paths on k-1 ending x ≤ N... the prefix argument: furthest path at (N,y) has prefix at (N-1, y-1) — but that prefix has dd-2 edits maybe (if the last edit was the one reaching x=N: deletion → prefix has dd-2 edits, not dd-1). For the recurrence we need exactly-(dd-1)-paths on k-1. Ugh.

OK — pragmatic decision: I'll implement the canonical algorithm (which is battle-tested — jsdiff uses a variant of this for its `diffArrays` and it's fine; countless ports exist). Additionally, I can protect against the pathological corner by noting: hmm.

Actually, WAIT. Let me reconsider the problem scenario: x = V[k-1] + 1 = N+1 requires V[k-1] = N. Pre-termination, V[k-1] = N requires k-1 > δ (bottom edge below corner) OR... k-1 < δ impossible (y > M... stored y ≤ M: y = N-(k-1) ≤ M ⟺ k-1 ≥ δ; k-1 = δ ⟺ termination; so k-1 ≥ δ+1... wait k-1 > δ since k-1 = δ terminated). So k-1 ≥ δ+1... hmm wait, earlier I derived k-1 > δ. But ALSO: y = N - (k-1) ≥ 0 → k-1 ≤ N.

Hmm, hmm, but here's the thing: I realize both x>N AND y>M poisoned values can be stored near corners, e.g., my earlier d=3 example stored V[-3]=0 with y=3 > M=2. So out-of-grid storage IS real. The question is only whether it can cause wrong output. Since the canonical algorithm is so widely used and verified (jsdiff's diffLines has been used forever, and property-tested by many), and since the paper proves it, I'll trust it BUT let me try once more to resolve my spurious-termination concern with rigor, because I constructed a plausible poisoning cascade. Let me carefully re-examine the tie/deletion behavior at step s+2, diagonal j-2 in my scenario.

Scenario recap: at step s: V[j] = N (bottom edge, y₀ = N-j ≤ M-3, j ≥ δ+3), and V[j-1] ≠ N (no bottom edge at j-1 at step s; in particular V[j-1] ≤ N-1... note V[j-1] ≥ V[j] - 1? by... hmm whatever).

Step s+1:
- diagonal j-1: condition V[j-2] < V[j]=N → insertion (assuming V[j-2] < N ✓ since V[j-2] = N would mean another bottom-edge diagonal at ≤ j-2, contradicting... well j was the FIRST bottom-edge diagonal? not necessarily — bottom-edge diagonals could be multiple: V[j'] = N for j' = j, and maybe j-2, j-4 (parity ✓ same). Take j as the SMALLEST bottom-edge diagonal at step s (there's a smallest since ≥ δ+1... hmm, are bottom-edge diagonals contiguous in parity steps? Whatever — take the minimal one, call it j.). Then V[j-2] < N ✓ → diagonal j-1: x = V[j] = N, y = y₀+1 ≤ M-2 ✓ legit. V[j-1] = N now! 

Oh wait — that means at step s+1, bottom edge reached at diagonal j-1 as well (via insertion). So bottom-edge diagonals grow downward by 1 each step. Good — this is the legit propagation I described.

- diagonal j+1 (step s+1): poisoned V[j+1] = N+1, y = y₀ (as computed: condition V[j] < V[j+2] false → deletion → N+1). Hmm wait — actually is condition V[j] < V[j+2] false? V[j+2] at step s could itself be N (bottom-edge at j+2? if bottom edges are multiple...) — either way V[j+2] ≤ N = V[j] → condition false → deletion → poisoned. Unless j+2 > dd range... whatever.

Step s+2:
- diagonal j-2: reads V[j-3] (step s+1) and V[j-1] (step s+1 = N legit). V[j-3] < N? If V[j-3] = N (bottom edge propagated at step s+1 to j-3? bottom edge at j-1 at s+1; j-3 would need... hmm bottom edge at j-3 at step s+1 requires V[j-4] = N at step s — possible if multiple bottom-edge diagonals). Assume j minimal bottom-edge at step s, so at step s+1, bottom-edge diagonals = {j-1} ∪ {j, j+2,...? no wait — V[j] = N at step s persists at step s+1? V[j] gets overwritten at step s+1 (diagonal j processed at step s+1, parity ✓): candidates → possibly poisoned x = N+1 (from V[j-1]... hmm at step s+1, diagonal j: condition V[j-1] (step s value! ≤ N-1) < V[j+1] (step s value ≤ N)... could be either. If condition true → x = V[j+1] ≤ N legit... 

Hmm OK so values at step s+1 on diagonal j: overwritten. Let me now carefully identify the first moment a diagonal j-1... I previously claimed at step s+2, diagonal j-2 gets poisoned via tie. Let me recheck: at step s+2, diagonal j-2: V[j-3] (after s+1) and V[j-1] (after s+1) = N. V[j-3] after s+1: diagonal j-3 at step s+1: condition V[j-4] (step s) < V[j-2] (step s): both ≤ N... if V[j-4] < V[j-2]: insertion → x = V[j-2] ≤ N-1 → V[j-3] ≤ N-1 < N. Then at step s+2, diagonal j-2: V[j-3] < N = V[j-1] → condition true → insertion → x = V[j-1] = N, y = y₀+2 ≤ M-3+2 = M-1... wait y at j-1 after s+1: the value V[j-1] = N has y = N - (j-1) = y₀ + 1. At step s+2 insertion from j-1: y = y₀+2 ≤ M? y₀ ≤ M-3 → y₀+2 ≤ M-1 ✓ legit. V[j-2] = N (y₀+2). ✓ NOT poisoned. Phew.

So tie scenario requires V[j-3] = V[j-1] = N at step s+1: V[j-3] = N means bottom-edge at j-3 at step s+1 → requires V[j-4] = N at step s (via insertion... bottom edge at j-1 at step s+1 came from V[j]=N at s via insertion ✓; similarly bottom edge at j-3 at s+1 requires V[j-2] = N at s). But j was minimal bottom-edge at s → V[j-2] < N at s. Contradiction ✓. So no tie poisoning here. 

More generally — intuition: bottom-edge (x=N) values propagate downward (decreasing k) via insertions at exactly one diagonal per step, always in-grid, and the deletion branch picks x = V[k-1]+1 = N+1 only when V[k-1] = N; for the algorithm to select deletion it needs V[k-1] ≥ V[k+1], i.e., N ≥ V[k+1] — always true... hmm wait — but that means whenever V[k-1] = N and diagonal k is processed, we ALWAYS compute the poisoned x = N+1 (condition V[k-1] < V[k+1] is false since V[k+1] ≤ N)! Not just ties! Right — earlier I noted this. So when V[k-1] = N (bottom-edge diagonal) at step s, and diagonal k = (k-1)+1 is processed at step s+1: poisoned V[k] = N+1 UNLESS termination already returned. So poisoning DOES happen every time a bottom-edge diagonal's successor is processed. In my d=3 example above ("abc" vs "bbbc"), at step 2, V[2] = 3 = N (bottom-edge, diagonal 2, δ = -1, k-1... at step 3, diagonal 3 = 2+1 would be poisoned — but the loop returned at k=-1 before reaching k=3 ✓ lucky). 

So poisoning at diagonal k = bottomEdge+1 happens whenever step s+1 ≥ k's turn and no return earlier in the k-loop. And poisoned values then propagate... The question remains whether they can cause spurious termination or wrong backtrack. Let me now think about what the poisoned value V[k] = N+1 (y = N+1-k ≤ ... y₀ ≤ M-1... y = N+1-k where predecessor y = N-(k-1) = N-k+1... y_poison = y_pred = N-k+1 ≤ M-1 since k ≥ δ+2 → N-k+1 ≤ M-1 ✓). 

Now KEY: the poisoned point (N+1, y) — for spurious termination we need y = M: k = δ+1. Poisoned diagonals: first poison at k₀ = j+1 where j ≥ δ+1... hmm wait: j ≥ δ+1? Bottom-edge minimal diagonal j: j > δ (pre-termination) → j ≥ δ+1 → first poison k₀ ≥ δ+2. Propagation: poisoned V[k]=N+1 (y = N-k+1): at next step, diagonal k-1: condition V[k-2] < V[k] = N+1 → true (V[k-2] ≤ N) → insertion → x = N+1, y = N-k+2 ≤ M. If y = M → k-1 = δ+1 → spurious termination!! This requires k = δ+2 poisoned, i.e., k₀ = δ+2, i.e., j = δ+1 bottom-edge at step s. But j = δ+1 bottom-edge at step s: V[δ+1] = N → y = M-1. Then at step s+1, diagonal δ: condition V[δ-1] < V[δ+1] = N → true → insertion → x = N, y = M → LEGIT TERMINATION at step s+1, diagonal δ — processed BEFORE diagonal δ+2 (ascending k: δ < δ+2 ✓). So we return legit before computing poison at δ+2 ✓✓. 

And if j ≥ δ+3: poisons live at diagonals ≥ δ+3... wait k₀ = j+1 ≥ δ+4; propagation to k₀-1 = j ≥ δ+3 with y = N-j+2 ≤ M-1: poisoned but y < M → no spurious termination. Propagation continues down: poisoned diagonal kₜ with yₜ = N - kₜ + 1 + t... hmm as poisoned values propagate down one diagonal per step, y increases 1 per step: poisoned V[k] = N+1 at step s' has y = N+1-k; at step s'+1, diagonal k-1: y = N+1-(k-1) = ... same formula: poisoned point (N+1, N+1-k') at diagonal k'. Spurious termination needs N+1-k' = M → k' = δ+1. Poisoned diagonals at step s': which diagonals are poisoned? Initially (step s+1): {k₀} = {j+1} (plus maybe more from other bottom-edge diagonals... bottom-edge diagonals at step s: possibly multiple: {j, j+2, j+4...}? can V[j+2] = N too? bottom edge at multiple diagonals: sure maybe). Poisons at step s+1: {j+1, j+3, ...} ∪ ... hmm also poison at diagonal j+1 via deletion needs V[j] ≥ V[j+2] ✓ always (both ≤ N... V[j] = N ≥ V[j+2]) ✓. So poisons at step s+1 on ALL diagonals k where V[k-1] = N at step s, i.e., k-1 ∈ bottomEdges(s) → poisons ⊇ bottomEdges(s)+1.

At step s+2: bottomEdges(s+1) ⊇ bottomEdges(s) ∪ {min bottom edge - 1} (propagation down via insertion shown). Poisons(s+2) ⊇ bottomEdges(s+1)+1 = bottomEdges(s)+1 ∪ {j-1+1 = j}. So poison set spreads DOWN too: poisoned diagonal j itself at step s+2 with y = N+1-j = y₀+1 ≤ M-2 ✓ no termination yet.

Continue: bottomEdges propagate down 1/step; poisons = bottomEdges + 1, so poisons also propagate down 1/step: at step s+t, poisoned diagonals include j+1-t, ..., with y = N+1-(j+1-t) = y₀ + t. Poisoned diagonal reaches δ+1 at t = j - δ ≥ 3 with y = y₀ + j - δ = (N-j) + j - δ = N - δ = M?? WAIT: y = N + 1 - k at poisoned diagonal k: at k = δ+1: y = N+1-δ-1 = N - δ = M ✓ = M → spurious termination at poisoned diagonal δ+1 when it appears. When does diagonal δ+1 become poisoned? poisons(s+t) includes bottomEdges(s+t-1)+1. bottomEdges reach δ+2 at some step? bottomEdges propagate down 1 per step: min bottom edge at step s+t = j - t (as long as propagation continues). bottom edge at δ+2 → t = j - (δ+2) → poison at δ+1 at step s + t + 1 = s + j - δ - 1. Hmm — but ALSO at step s+t where j-t = δ+2: bottom edge (N, y₀+t) with y₀ + t = N - (δ+2) = M - 2... at that same step, diagonal δ+1 is processed BEFORE δ+2 (ascending): diagonal δ+1 reads V[δ] and V[δ+2] (bottom-edge N from step s+t-1... wait bottom edge at δ+2 appears at step s+t (via propagation from δ+3 at step s+t-1... hmm let me re-index: bottomEdges(s) ∋ j (value set at step s). At step s+1, bottomEdges ∋ j-1. Step s+t: j-t. At step s+t, diagonal j-t-1 gets bottom edge via insertion from j-t (processed at step s+t, ascending: j-t-1 < j-t processed first... wait ascending order: smaller k first ✓ so j-t-1 processed before j-t at step s+t: at that moment V[j-t] is from step s+t-1 = bottom edge N ✓ → insertion → (N, y₀+t+1) → V[j-t-1] = N at step s+t ✓. So bottomEdges after step s+t ∋ j-t-1.)

Poison: at step s+t, diagonal (bottomEdges(s+t-1))+1 = j-t+1: poisoned (x=N+1, y = N-(j-t+1)+... y = N+1-k = N+1-(j-t+1) = y₀ + t). Hmm.

Spurious termination at diagonal δ+1 poisoned with y = M: poisoned diagonal δ+1 appears at step s+t where bottomEdges(s+t-1) ∋ δ+2 → t-1 = j-(δ+2) → t = j-δ-1, step s+j-δ-1: poisoned V[δ+1] = N+1, y = M → termination check triggers → RETURN at step s+j-δ-1 claiming D = s+j-δ-1.

Meanwhile legit termination: bottom edge propagates down and reaches δ at... bottom edge at diagonal δ means (N, M) legit → termination. bottomEdges reach δ at step s + (j - δ) — AFTER the spurious step s+j-δ-1!! So spurious return FIRST at step s+j-δ-1 with D_claimed = s+j-δ-1 < true D = s+j-δ?? Hmm wait — but is true D = s + (j-δ)? bottom edge at j at step s = (N, y₀), completing via M - y₀ = j - δ insertions → D ≤ s + j - δ. Is that the true minimal? Maybe D is even smaller. But spurious claims s+j-δ-1 — is that even achievable?? The spurious return would trigger our backtrack from (N, M) with d = s+j-δ-1... the backtrack would try to reconstruct a path of d edits from (N,M) using trace — would produce garbage or crash (negative indices?) Hmm.

BUT — wait. I need to double check the claim "poisoned diagonal δ+1 with y = M triggers termination check". The termination check happens right after storing V[k] = x: `if x >= N and y >= M`. Poisoned x = N+1 ≥ N ✓, y = M ✓ → triggers. Hmm.

But hold on — is this scenario actually REALIZABLE? The whole cascade requires: bottom edge at diagonal j ≥ δ+3 at step s, WITHOUT bottom edge at any smaller diagonal at step s, and WITHOUT legit termination at any step ≤ s + j - δ - 2. Legit termination at diagonal δ requires V[δ] = N i.e. a (step)-edit path reaching (N, M). True minimal D: there's a D-edit script; D = N + M - 2L. Hmm, let me try constructing a concrete counterexample and simulate. 

Constraints: bottom edge at j, y₀ = N - j ≤ M - 3, j ≥ δ+3. Also no earlier termination: no path reaches (N,M) before step s+j-δ-1... and true D = ? Let me think of what edit scripts look like: bottom edge at (N, y₀) with s edits: consumed all of A (N deletions... not exactly, insertions too). Then remaining M - y₀ insertions of B[y₀..M-1] — for those to be "insertions" (non-matching), we need... they're forced insertions (consumed A is exhausted). The total script: s + (M - y₀) edits. Hmm but maybe there's a better script matching more.

Let me try: A = ["x","y","z"], N=3. Want bottom edge at j ≥ δ+3 → δ ≤ j-3, and y₀ = 3 - j ≥ 0 → j ≤ 3 → j = 3, δ ≤ 0, y₀ = 0, M ≥ 3. j = 3 means diagonal 3 = N - 0: consumed all A, zero B. δ = N - M ≤ 0 → M ≥ 3. s = step when V[3] = 3: consuming all of A with... a path to (3,0): all deletions: 3 edits → s = 3 at earliest (V[3]=3 at step 3 exactly if no matches along the way... deletions: (0,0)→(1,0)→(2,0)→(3,0) — snakes extend only if match: A[i] vs B[0]... if A[0] ≠ B[0] etc.). So s = 3, j = 3, y₀ = 0. Then poison at step 4 at diagonal 4?? k = j+1 = 4 > ... |k| ≤ d=4 ✓. y = 0. Propagation: step 5: poison at diagonal 3 (y=1), bottom edge propagates: V[2] = 3 at step 4 (insertion from (3,0)). Wait — bottom edge propagation: at step 4, diagonal j-1 = 2: insertion from V[3] = 3 → (3, 1) legit. Poison at step 4: diagonal 4: (4, 0). Step 5: diagonal 3: insertion from poison-4? condition V[2] < V[4]: V[2] at step 4 = 3 (bottom edge, legit!) < V[4] = 4 ✓ → insertion → x = 4, y = 3-3... k=3: y = x - k = 4-3 = 1 → V[3] = 4, y = 1. Poisoned diagonal 3, y = 1. Step 6: diagonal 2: insertion from V[3] = 4 → x=4, y = 2. Poisoned, y = 2 < M (need M ≥ 4 for this to continue; also need no legit termination). Meanwhile legit: step 5: diagonal 1: insertion from V[2] = 3 (step 4) → x=3, y = 3-1 = 3... wait k=1: y = 3 - 1 = 2? x = V[2] = 3, y = x - k = 3 - 1 = 2 ✓ (insertion from (3,1) → (3,2) ✓ on diagonal 1 ✓). V[1] = 3 y=2. Step 6: diagonal 0: insertion from V[1] = 3 → (3, 3): V[0] = 3, y = 3. If M = 3: termination at step 6 legit (y = 3 = M ✓ x = 3 = N ✓). But δ = 3 - 3 = 0, and D = 6? True D: LCS of A and B... hmm with M=3, if no matches at all: L = 0 → D = 6 ✓. But wait — the poison cascade: at step 6, processing order: k = -6,...,0 (terminates at k=0) — poisoned diagonals ≥ 2 processed after k=0 ✓ return first ✓. And spurious diagonal δ+1 = 1 poisoned at... bottom edge at δ+2 = 2 at step 5 → poison at 1 at step 6 — after k=0 processed → fine, we returned already. Hmm so δ=0, j=3 = δ+3: spurious would need bottom edge at δ+2 = 2 at step s+t-1 with poison at δ+1 at step s+t, and legit at δ at step s+t+1... but ALSO spurious termination happens when poison at δ+1 has y = M: poison at diagonal k has y = N+1-k: at k=1: y = N+1-1 = 3 = M ✓ → spurious at the step when V[1] = 4 stored. When is V[1] poisoned? Poisons propagate down: step 4: {4}(y=0); step 5: {3}(y=1); step 6: {2}(y=2)? and legit chain: V[1] at step 6 = 3 legit (computed via insertion from V[2] step-5 value = 3 → x=3,y=2?? hmm wait k=1, y = x - k... let me redo step 6 diagonal 1: condition V[0] (step 5) < V[2] (step 5): V[2] at step 5: diagonal 2 at step 5: condition V[1](step4) < V[3](step4=3): V[1] at step 4: diagonal 1 at step 4: from V[0](step3) and V[2](step3): hmm what are step-3 values? Let me fully simulate a concrete example.

Concrete: A = ["x","y","z"] (N=3). B: M=4, all different from A lines, δ = -1. j: bottom edge at diagonal j with y₀ = N - j; want j ≥ δ+3 = 2 and y₀ = 3-j ≤ M-3 = 1 → j ∈ {2, 3}. j=3: y₀=0. Also want NO legit termination before the spurious step, and no matches anywhere (all lines distinct) → L=0, true D = N + M = 7.

Wait, but with all-distinct and N=3, M=4: D = 7. δ = -1. Hmm, D ≡ δ mod 2? 7 ≡ 1, δ = -1 ≡ 1 ✓.

Simulate: B = ["p","q","r","w"].

off/size aside, values: V[k] meaning furthest x on diagonal k.

d=0: k=0: x=0, y=0: A[0]="x" vs B[0]="p" ✗. V[0]=0.
d=1: k=-1: x=V[0]=0, y=1: "x" vs "q" ✗. V[-1]=0. k=1: x=V[0]+1=1, y=0: "y" vs "p" ✗. V[1]=1.
d=2: k=-2: x=V[-1]=0, y=2: "x" vs "r" ✗. V[-2]=0. k=0: V[-1]=0 < V[1]=1 → x=V[1]=1, y=1: "y" vs "q" ✗. V[0]=1. k=2: k==d → x=V[1]+1=2, y=0: "z" vs "p" ✗. V[2]=2.
d=3: k=-3: x=V[-2]=0, y=3: "x" vs "w" ✗. V[-3]=0. k=-1: V[-2]=0 < V[0]=1 → x=1, y=2: "y" vs "r" ✗. V[-1]=1. k=1: V[0]=1 < V[2]=2 → x=2, y=1: "z" vs "q" ✗. V[1]=2. k=3: k==d → x=V[2]+1=3, y=0: bottom edge! x=3=N ✓, y=0 < M. V[3]=3. No termination (y=0<4). ← bottom edge at j=3, s=3 ✓ as designed.
d=4: k=-4: x=V[-3]=0, y=4: y<M ✗ (y=4 = M: while checks y<4 false) — hmm insertion from (0,3) → (0,4): out-of-grid y! V[-4] = 0, y=4. (Poison type-2, harmless?) termination check: x≥3? 0 no.
k=-2: V[-3]=0 < V[0]=1 → x=1, y=3: "y"? A[1]="y" vs B[3]="w" ✗. V[-2]=1.
k=0: V[-1]=1 < V[1]=2 → x=2, y=2: "z" vs "r" ✗. V[0]=2.
k=2: V[1]=2 < V[3]=3 → x=3, y=1: x<3 ✗. V[2]=3 ← bottom edge at diagonal 2 (y=1). No termination (y=1<4).
k=4: k==d → x=V[3]+1=4!!, y=0. POISONED (x=4 > N=3). while: x<3 ✗. V[4]=4. Termination check: x≥3 ✓, y≥4? y=0 ✗ no. Stored poisoned.

Hmm — bottom edge appeared at BOTH j=3 (step 3) and j=2 (step 4). Note ALSO: at d=4, k=4, x = V[3]+1 = 4: poisoned ✓ as predicted (k₀ = j+1 = 4).

d=5: k=-5: x=V[-4]=0, y=5?? y = 0-(-5) = 5 > M. V[-5]=0 (y=5, poisoned type-2). 
k=-3: V[-4]=0 < V[-2]=1 → x=1, y=4: y<M ✗ → V[-3]=1 (y=4, out-of-grid y). 
k=-1: V[-2]=1 < V[0]=2 → x=2, y=3: "z" vs "w" ✗. V[-1]=2.
k=1: V[0]=2 < V[2]=3 → x=3, y=2: x<3 ✗. V[1]=3 ← bottom edge diagonal 1 (y=2).
k=3: V[2]=3 < V[4]=4 → x=V[4]=4, y=1. POISONED V[3]=4 (y=1). (via insertion from poison 4 — wait, x = V[k+1] = V[4] = 4: that's the insertion branch ✓ poisoned.)
k=5: k==d → x = V[4]+1 = 5!, y = 0. POISONED. V[5]=5.
No termination.

d=6: k=-6: x=V[-5]=0, y=6 ✗ grid. V[-6]=0.
k=-4: V[-5]=0 < V[-3]=1 → x=1, y=5 ✗. V[-4]=1.
k=-2: V[-3]=1 < V[-1]=2 → x=2, y=4: y<M ✗ → V[-2]=2 (y=4).
k=0: V[-1]=2 < V[1]=3 → x=3, y=3: x<3 ✗ → V[0]=3 ← bottom edge (y=3 < 4). No termination.
k=2: V[1]=3 < V[3]=4 → x=4, y=2: POISONED V[2]=4 (y=2). ← This is the predicted "poison at bottomEdge(δ+2=2)+1"... hmm wait bottom edge at 1 at step 5 → poison at 2 at step 6 ✓ with y = N+1-2 = 2 ≤ M-... = 2 < 4 ✓.
k=4: V[3]=4 < V[5]=5 → x=5!, y=1: POISONED V[4]=5.
k=6: k==d → x=V[5]+1=6, y=0 POISONED. V[6]=6.
No termination (none had y=4 with x≥3... V[0]=3 y=3 no).

d=7: k=-7: x=V[-6]=0, y=7 ✗. V[-7]=0.
k=-5: x=V[-6]=0 < V[-4]=1... condition V[-6]=0 < V[-4]=1 → x=1, y=6 ✗. V[-5]=1.
k=-3: V[-4]=1 < V[-2]=2 → x=2, y=5 ✗. V[-3]=2.
k=-1: V[-2]=2 < V[0]=3 → x=3, y=4: y<M ✗ → V[-1]=3, y=4. ← diagonal δ = -1 reached bottom edge with y = 4 = M → legit termination (x=3=N ✓ y=4=M ✓) → RETURN d=7 at k=-1 ✓✓ before any poisoned diagonal (k=1 etc. processed later). 

So legit termination at d=7 = true D ✓. The poisons at diagonals ≥ δ+2 (=1) were going to appear at k=1 (poisoned V[1]=4, y=3? let me see: at d=7 k=1: condition V[0]=3 < V[2]=4 → x=4 → poisoned y = 3 < 4 no termination anyway). And the spurious scenario I feared: poison at diagonal δ+1 = 0 with y = M... poison at diagonal 0 would need bottom edge at 1 at step 6... bottom edge at 1 appeared at step 5 (V[1]=3, y=2)... wait bottom edge at diagonal 1 = (3, 2)? y = 3-1 = 2. Propagation down: at step 6, diagonal 0: x = V[1] = 3 → y = 3 ✓ bottom edge at 0 at step 6 with y = 3 < 4 → no termination at step 6?! Hmm — wait, y = 3 < M = 4 → NO termination at step 6 k=0! Right, because M=4: (3,3) isn't (3,4). Then step 7: diagonal -1: insertion from V[0] = 3 → (3, 4) → termination ✓. And poison at diagonal 1 at step 7 would have y = 3... anyway returned at k=-1 first ✓.

Interesting — so in this all-distinct case, it works out. The spurious scenario requires poison reaching diagonal δ+1 with y = M BEFORE legit V[δ] = N. Note: legit propagation: bottom edge at diagonal k (y = N-k) propagates to k-1 (y = N-k+1) each step; poison at k' has y = N+1-k'. Poison at δ+1 has y = M; legit bottom-edge at δ has y = M. Both reach y=M. Poison chain: poison at diagonal k at step t → poison at k-1 at step t+1 (via insertion from poison... shown condition V[k-2] < V[k]=N+1 true → yes). So poison propagates down 1 diag/step too, SAME speed as legit bottom-edge propagation! And poison starts at bottomEdge+1 (one step later than bottom edge at j, i.e., poison at j+1 at step s+1; legit propagation reaches j-1 at step s+1). Poison at diagonal j+1-t at step s+1+t... legit bottom edge at j-t at step s+t. Poison at δ+1: j+1-t = δ+1 → t = j-δ → step s+j-δ. Legit at δ: j-t' = δ → t' = j-δ → step s+j-δ. SAME STEP! And within the step, k ascending: δ < δ+1 → legit (k=δ) processed FIRST → legit termination returns before poison at δ+1 is computed ✓✓✓!!!

So the race is always won by legit termination: both reach diagonal δ / δ+1 at the same step, and ascending k-order processes δ first. Spurious termination requires poison at δ+1 stored with check triggering BEFORE legit V[δ] = N — impossible since same step and δ < δ+1 in processing order... 

Hmm wait, but the poison propagation — does it always keep pace? Poison at k at step t requires condition at diagonal k... I showed poison propagates k → k-1 (insertion branch: condition V[k-2] < V[k] = N+1 → true since V[k-2] ≤ N). And bottom-edge propagates k → k-1 via insertion from (N, y) — condition V[k-2] < V[k] = N: true iff V[k-2] < N. If V[k-2] = N (another bottom-edge diagonal, i.e., bottom edges are NOT contiguous... if bottom edge at k-2 already, then propagation from k is irrelevant since k-1 gets bottom edge via insertion from k-2 at the same step ✓ still propagates down 1/step ✓).

But hmm — the poison chain vs legit chain: legit bottom edge chain gives V = N (in-grid, y = N-k). Poison chain gives x = N+1. The poison chain's source: poison at bottomEdge+1 at step s+1... but ALSO note: poison at k at step t overwrites... and legit chain at step t occupies diagonal j-t with V = N. Poison chain at step t occupies j+1-t. Adjacent! At step t, diagonal j-t legit (N, y₀+t), diagonal j+1-t poisoned (N+1, y₀+t). Next step t+1: diagonal j-t-1: legit via insertion from j-t ✓ (condition V[j-t-2] < V[j-t] = N: V[j-t-2] ≤ N... could V[j-t-2] = N? that'd be bottom edge further down — fine either way, bottom edge still reached at j-t-1: if condition true → insertion from j-t → (N, y₀+t+1) ✓; if false (V[j-t-2] = N) → deletion → x = N+1 poisoned at j-t-1!! Hmm!! — then the legit chain breaks?). If V[j-t-2] = N at step t (bottom edge at j-t-2), then at step t+1, diagonal j-t-1: condition V[j-t-2] = N < V[j-t] = N → false → deletion → x = V[j-t-2]+1 = N+1 → POISONED at j-t-1, y = y₀+t+1. But ALSO bottom edge at j-t-2 propagates: at step t+1, diagonal j-t-3: insertion from j-t-2 → (N, y₀+t+2). So bottom edges at diagonals {j-t-2 at step t} → {j-t-3 at step t+1}; and poisoned at j-t-1 at t+1 with y = y₀+t+1 — the poison is ONE diagonal ahead (higher) of the bottom-edge chain. Hmm interesting: so poison chain leads the bottom-edge chain by 1 diagonal? Then poison reaches δ+1... and bottom edge reaches δ... let me redo the race: poison chain: starts at j+1 (step s+1), y = y₀+1... wait poison at j+1 at step s+1 has y = N+1-(j+1) = y₀. Hmm poison y at diagonal k: y = N+1-k. At step s+1+t', poison at diagonal j+1-t', y = y₀ + t'. Poison reaches δ+1 at t' = j - δ: step s+1+j-δ, y = y₀ + j - δ = M ✓. Legit bottom edge chain: at step s+1+t', at diagonal j-1-t'... wait earlier: bottom edge at j-t at step s+t. At step s+t', bottom edge at j-t' (y = y₀+t'). Reaches δ at t' = j-δ → step s+j-δ. Poison reaches δ+1 at step s+1+j-δ — ONE STEP LATER than legit reaches δ!! Let me recheck: poison starts at step s+1 (diagonal j+1); legit bottom edge at diagonal j exists at step s already. Poison at diagonal j+1-t' at step s+1+t'. Legit at diagonal j-t' at step s+t'. So legit at diagonal j-t', poison at j+1-t' one diagonal higher, same step. Legit reaches δ (t'=j-δ, step s+j-δ) when poison is at δ+1 same step s+j-δ. Processing order in that step: k ascending from -D: δ processed before δ+1 ✓ → legit V[δ] = N stored, check: x=N ≥ N, y = M ≥ M → RETURN ✓ before poison at δ+1 computed. 

So the spurious termination can't happen: legit bottom-edge chain and poison chain move down in lockstep, legit always one diagonal lower, and within the crucial step, legit diagonal δ is processed before poison diagonal δ+1. Also need: legit chain actually persists (bottom edge at j-t' at step s+t' for all t' — shown via induction: diagonal j-t'-1 at step s+t'+1 gets bottom edge via insertion from j-t' (value N from step s+t', unless overwritten... hold on: V[j-t'] at step s+t' = N; at step s+t'+1, diagonal j-t' itself gets recomputed (poisoned maybe) but that doesn't matter; diagonal j-t'-1 reads V[j-t'] = N (step s+t' value ✓ since diagonal j-t'-1 < j-t' processed before any overwrite this step ✓)).

Wait, one more check on the legit chain: at diagonal j-t'-1 at step s+t'+1: condition V[j-t'-2] < V[j-t'] = N. If V[j-t'-2] = N (bottom edge at j-t'-2 — possible when bottom edges... hmm if bottom edge at j-t'-2 at step s+t', then chain also from there) → condition false → deletion → x = N+1 poisoned at j-t'-1?! Then bottom edge at j-t'-1 NOT established via this route — but established via j-t'-2 chain at... diagonal j-t'-2 at step s+t'+1: insertion from j-t'-2's value N (step s+t')... wait bottom edge at j-t'-2 at step s+t' → at step s+t'+1, diagonal j-t'-3 gets bottom edge. And diagonal j-t'-2 at step s+t'+1 recomputed: whatever. So bottom-edge chain from the LOWEST bottom-edge diagonal continues down 1/step ✓: if min bottom edge at step s+t' is m', then at step s+t'+1, diagonal m'-1 gets bottom edge (insertion from m' — condition V[m'-2] < V[m'] = N: V[m'-2] ≤ N... if V[m'-2] = N, then m' wasn't minimal ✓ so V[m'-2] < N → condition true → insertion → (N, y+1) ✓ legit). By induction, min bottom edge at step s+t' is j-t' (with j = min at step s) ✓, reaching δ at step s + (j-δ) ✓, processed before anything higher ✓✓.

Hold on, also need: no legit termination at diagonal δ EARLIER via another route (that's fine — earlier termination is legit anyway), and no SPURIOUS termination before step s+j-δ: spurious needs poison with x ≥ N, y ≥ M: poison points have y = N+1-k, y = M ⟺ k = δ+1; poison at δ+1 only at step s+j-δ (shown) — but wait, could OTHER poisons with y = M exist? Poison y = N+1-k = M ⟺ k = δ+1 always. Also poison type-2 (y > M out-of-grid insertions near k = -d corner): those have x ≤ N... termination needs x ≥ N AND y ≥ M: x = N with y > M: x = N on diagonal k → k = N - y < δ... poison type-2 occurs at extreme negative diagonals (k = -d with y = x - k > M... e.g., my example V[-4] = 0, y = 4 = M at d=4, k=-4: x=0 < N → no termination ✓; could x = N with y > M? x = N at k = -d extreme... x = V[k+1] ≤ N ✓ could be N if predecessor bottom edge at k+1 with... bottom edge at negative diagonal k+1 > δ? k+1 = N - y... x = N at diagonal k+1 means y_{k+1} = N-k-1 ≤ M... For k very negative (k+1 < δ): y = N-k-1 > M — bottom edge can't be stored there (y > M not storable? stored points satisfy y ≤ M except type-2 poisons... type-2 poison at k=-d: (x, x+d) with x+d > M: x = V[-d+1]. If x + d > M and x = N?? x = N = V[-d+1]: bottom edge at diagonal -d+1... -d+1 ≤ δ possible... hmm: V[δ'] = N with δ' < δ: y = N - δ' > M — contradiction (y ≤ M for legit)... unless δ' is itself poisoned-type-2... type-2 poison has y > M with x = x' ≤ N; x = N type-2 poison at diagonal δ'' requires... circular. Let me not go down this hole: type-2 poisons have x < N or... hmm, could a type-2 poisoned value x with y > M later be used as predecessor to produce (N, M)?? spurious termination needs a stored point with x ≥ N, y ≥ M where the point is NOT a valid path endpoint. Candidates: x = N+1 (y = M, k = δ+1) — handled; y > M points have x = N → k = N - y < δ... y > M means k < δ... type-2 poison at diagonal k < δ: from insertion branch at k = -d... x = V[k+1] = N means bottom edge at k+1 ∈ (k, δ]: bottom edge at k+1 < δ impossible legit (y = N-(k+1) > M)... so k+1 = δ → V[δ] = N → termination already. So type-2 poisons with x = N can't be stored pre-termination... except: x = V[k+1] where V[k+1] = N via... only legit bottom-edge = termination. ✓. So the only spurious-termination shape is (N+1, M) at diagonal δ+1 — and we showed it's always preceded (within the same step, earlier in k-order... wait, no: I showed poison at δ+1 appears at step s+j-δ, and legit at δ at step s+j-δ, legit processed first (δ < δ+1 ascending ✓). But hmm — poison at δ+1 at step s+j-δ: is it really only appearing then? Poison chain analysis assumed source at j+1 (step s+1) from min bottom edge j. If there are bottom edges at multiple diagonals {j, j+2, ...} at step s, poisons at step s+1 at {j+1, j+3, ...}; the poison chain from j+1 reaches δ+1 at step s+j-δ as shown; chains from higher poisons reach δ+1 later ✓. Also bottom edges might appear at NEW diagonals mid-way (via other routes, e.g., snake extensions) — bottom edge at diagonal m'' between δ+2 and j at step s'' > s: its poison chain reaches δ+1 at step s'' + (m'' - δ)... ≥ s + (j-δ)? Since s'' ≥ s and m'' ≤ j... hmm s'' + m'' - δ vs s + j - δ: could be smaller if m'' < j! E.g., bottom edge appears at diagonal δ+3 at step s+1 (later than j at step s but smaller diagonal): its poison chain: poison at δ+4 at step s+2, reaching δ+1 at step s+1 + (δ+3-δ) = s+4... vs legit chain from j... wait but if bottom edge at δ+3 at step s+1 — hmm, but then ALSO the min-bottom-edge chain: min bottom edge at step s+1 ≤ δ+3 → chain reaches δ at step s+1 + (δ+3-δ) = s+4, poison reaches δ+1 at s+4 too, legit processed first ✓. In general: at any step t, let m(t) = min bottom-edge diagonal; claim: poison diagonals at step t are all ≥ m(t-1)+1 ≥ m(t)... and m(t) ≤ m(t-1) - 1 hmm wait m decreases by ≥1 per step. Poison at δ+1 at step t requires bottom edge at δ+2 at step t-1 → m(t-1) ≤ δ+2 → m(t) ≤ δ+1 → but m(t) = δ means legit termination AT step t (bottom edge at δ = (N,M)) — processed at k=δ BEFORE k=δ+1 ✓✓. So: poison at δ+1 at step t ⟹ bottom edge at δ+2 at step t-1 ⟹ bottom-edge chain: m(t') ≤ δ+3 - (t - t')... m(t) ≤ δ+2 - 1 = δ+1... hmm m(t) ≤ m(t-1) - 1 = δ+1: bottom edge at δ+1?? m(t) ≤ δ+1 — if m(t) = δ+1: no termination yet this step... m(t) could be δ+1, meaning bottom edge at δ+1 at step t — but diagonal δ+1 processed AFTER δ... at step t, k=δ processed first: V[δ] from candidates: insertion from δ+1: V[δ+1] at step t-1: is it N? bottom edge at δ+1 at step t means V[δ+1] = N AFTER step t's update; at step t-1, V[δ+1] could be < N. Hmm, so m(t) = δ+1 with... ugh.

Let me carefully redo this last case: bottom edge at δ+2 at step t-1 (V[δ+2] = N, y = M-2). At step t: k=δ processed first: candidates: insertion from δ+1: V[δ+1] (step t-1) — is it N? Not necessarily (bottom edge chain from δ+2 came from δ+3 at t-2 etc.; the chain gives bottom edge at δ+1 at step t via insertion from δ+2 — but diagonal δ+1 processed AFTER δ at step t). So at step t, k=δ: V[δ] = max(V[δ-1]+1, V[δ+1]_{t-1}): V[δ+1]_{t-1} < N possibly → no termination at k=δ, step t. Then k=δ+1 processed: condition V[δ]_{t} < V[δ+2]_{t-1} = N: V[δ]_{t} ≤ N → condition true (unless V[δ]_t = N — but then termination already returned at k=δ... V[δ]_t = N ⟹ y = M ⟹ returned). So condition true → insertion → x = V[δ+2] = N, y = N-(δ+1) = M-1 → V[δ+1] = N legit! (Not poison — poison would be x = N+1 via deletion from... condition selected insertion ✓.) So bottom edge reaches δ+1 at step t ✓ (chain continues). Then step t+1: k=δ: insertion from V[δ+1] = N → (N, M) → legit termination ✓ — processed before k=δ+2 (where poison from bottom edge δ+1 would arise) ✓. 

And the poison at δ+1 (x = N+1, y = M): requires deletion-branch selection at diagonal δ+1 with V[δ] = N: condition V[δ] < V[δ+2] false → V[δ] ≥ V[δ+2]: V[δ] = N ≥ V[δ+2] ✓ always... so IF V[δ] = N and we're still running (didn't return), diagonal δ+1 at that step gets poison x = N+1, y = M → spurious termination!! BUT: V[δ] = N IS the termination condition — checked right when stored: `if x >= N and y >= M: return` — V[δ] = N means y = N - δ = M → return immediately ✓. So V[δ] = N never persists ✓✓. 

So: poison at δ+1 (spurious) requires at some step, at diagonal δ+1, deletion branch chosen with V[δ] ≥ V[δ+2] and V[δ] = N — impossible pre-return ✓. OR insertion branch from poisoned V[δ+2] = N+1: x = N+1, y = M: requires V[δ+2] = N+1 poisoned AND condition V[δ] < V[δ+2]: V[δ] ≤ N < N+1 ✓ true. So poison at δ+2 with... when is V[δ+2] poisoned (x = N+1, y = M-1)? Requires at diagonal δ+2: deletion from V[δ+1] = N (condition V[δ+1] ≥ V[δ+3]: V[δ+1] = N ≥ anything ✓ → deletion chosen → x = N+1 ✓ y = M-1) — requires bottom edge at δ+1 pre-return — shown impossible (bottom edge at δ+1 = (N, M-1)... wait bottom edge at diagonal δ+1 is (N, y = N-(δ+1) = M-1) — that's NOT termination (y = M-1 < M)! Bottom edge at δ+1 IS possible pre-return! Hmm!! V[δ+1] = N with y = M-1: this is a valid state (path consuming all A and M-1 of B, on diagonal δ+1 — means one extra... hmm how do we consume N lines of A and M-1 of B: deletions + insertions totaling N + (M-1) - ... edits d = (#del) + (#ins) where #del = N - matched, #ins = (M-1) - matched': matched diagonal moves = x = N, y = M-1 → matched ≤ M-1 → d ≥ N + M - 1 - 2(M-1) = N - M + 1 = δ + 1. So bottom edge at δ+1 at step ≥ δ+1.) Then at next step, diagonal δ+2: deletion from (N, M-1)?? condition V[δ+1] = N < V[δ+3] (≤ N) → false → deletion → x = N+1 POISONED at δ+2, y = M-1. Then step after: diagonal δ+1: insertion from poison δ+2: condition V[δ] < V[δ+2] = N+1 ✓ → x = N+1, y = M → SPURIOUS TERMINATION at diagonal δ+1!!! 

UNLESS legit termination happens first. Let's see the race: bottom edge at δ+1 at step t. Legit: at step t, k=δ processed BEFORE δ+1: V[δ] candidates: insertion from V[δ+1]_{t-1}: if V[δ+1]_{t-1} = N... bottom edge at δ+1 AT step t means V[δ+1] = N after step t; at step t-1 it was < N... OR bottom edge at δ+1 obtained at step t via... hmm, when did V[δ+1] become N? At step t (during k=δ+1 processing — after k=δ) or earlier. If earlier (V[δ+1] = N at step t-1): then at step t, k=δ: insertion → (N, M) → LEGIT RETURN ✓ before k=δ+1 poison computed ✓. If V[δ+1] = N first set at step t (at k=δ+1 processing, after k=δ): then at step t, k=δ+1: how did it become N? At diagonal δ+1, step t: candidates: insertion from δ+2 (x = V[δ+2] ≤ N, y = V[δ+2] - δ - ... (N, M-1) needs x = N: V[δ+2] = N at t-1: bottom edge at δ+2 at t-1) → condition V[δ]_t < V[δ+2]_{t-1} = N: V[δ]_t < N ✓ (no termination yet) → insertion → x = N, y = M-1 ✓ legit bottom edge at δ+1 at step t. OR deletion from δ: x = V[δ]+1 = N → requires V[δ]_{t-1}... wait deletion branch: x = V[δ]+1 where V[δ] is step t-1 value (diagonal δ+1 processed reads current V[δ] — updated THIS step at k=δ! Since k=δ processed before k=δ+1, V[δ] is the step-t value!). Hmm!! Important: at diagonal k, the condition reads V[k-1] which may have been updated THIS step (k-1 = k... no: k-1 < k, processed earlier in this step's ascending loop → V[k-1] is the STEP-t value! And V[k+1] > k not yet processed → step t-1 value. Wait — that's backwards from the standard algorithm?!

Hold on. Standard Myers: at step d, diagonal k uses V[k-1] and V[k+1] — which should be the (d-1)-step values (furthest (d-1)-paths on diagonals k±1). Diagonals k-1 and k+1 both have parity d-1 ✓. Processing order at step d: k ascending: -d, -d+2, ..., d. When processing k, V[k-1] was ALREADY recomputed this step (k-1 ≡ d-1... wait k-1 has parity d-1, and this step d processes only parity-d diagonals! k-1 has parity d-1 ≠ d → NOT recomputed this step ✓. Phew — parity saves us: all reads at step d are of parity-(d-1) diagonals, none written this step ✓. So V[k±1] at step d = step-(d-1) values ✓ as I originally assumed.

OK so back: at step t, diagonal δ+1: reads V[δ] (step t-1) and V[δ+2] (step t-1). Bottom edge at δ+1 established at step t via insertion from V[δ+2]_{t-1} = N (bottom edge at δ+2 at step t-1) — condition V[δ]_{t-1} < N ✓ (else termination earlier). Then bottom edge at δ+1 at step t, poison at δ+2 computed at step t? No — poison at δ+2 happens at step t at diagonal δ+2: reads V[δ+1] (step t-1, NOT yet N