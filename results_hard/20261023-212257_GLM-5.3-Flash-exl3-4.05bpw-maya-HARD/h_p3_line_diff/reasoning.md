Implement Myers diff algorithm producing edit script with equality runs.

Key points:
- Use Myers O((N+M)D) with linear space refinement (divide and conquer middle snake) or the simple forward algorithm storing V arrays per D (memory O(D^2) — for D=50 with N=20000, fine; for D=1000 with N=1000, D^2 = 1e6, fine). Actually the simple algorithm storing V snapshots uses O(D^2) memory which is okay for these bounds. But to be safe, use linear-space divide-and-conquer (Myers 1986) — more robust for large D on large inputs. However, worst case completely different 1000 lines: D=2000, D^2=4e6 ints — fine.

But 20000 lines differ in 50 places: simple Myers forward: D=100 max, per D loop over (N+M) → O((N+M)D) = 40000*100 = 4e6 operations. Fine. Memory for snapshots: (D+1) arrays each of size 2D+1 → ~100*200 = 20k ints. Fine.

Completely different 1000 lines: N=M=1000, D=2000, ops = 4000*2000 = 8e6, memory snapshots 2000 arrays of 4001 → 8e6 ints, ~64MB+ in Python lists... Python ints in lists, 8e6 elements → each list holds pointers 8 bytes → 64MB, plus int objects (small ints cached). Might be heavy but okay. Under 6 seconds fine.

Alternatively implement linear space to be safer. Linear-space Myers is trickier but well-known. Let me implement the divide and conquer version:

def diff_lines(a, b):
    - Trim common prefix/suffix first (important for performance and correctness).
    - Then run Myers.

Simpler approach: trim prefix/suffix, then use the forward Myers with trace, then backtrack. Given problem bounds, that's fine. But worst case general: two 20000-line files completely different → D=40000, D^2 = 1.6e9 — blows up. But the spec only requires given performance. Still, trimming prefix/suffix plus maybe hashing lines... I'll implement linear-space Myers for robustness? The hint says Myers O((N+M)·D). The simple trace version is O((N+M)·D) time but O((N+M)·D)... actually O(D^2) memory. Fine.

But to be safe about worst cases, implement the linear space divide and conquer. It's not too long. Let me write it carefully.

Myers linear space:

def myers_diff(a, b, i1, i2, j1, j2, out):
    # trim common prefix/suffix
    while i1 < i2 and j1 < j2 and a[i1] == b[j1]: out equal; i1++; j1++ — careful with recursion, better handle prefix/suffix inside function.

Standard recursive:

def diff_rec(i1, i2, j1, j2):
    # remove common prefix
    while i1 < i2 and j1 < j2 and a[i1]==b[j1]: emit('=', a[i1]); i1+=1; j1+=1
    # remove common suffix
    l = 0
    while i1 < i2-? ... collect suffix then emit after
    if i1 == i2: emit '+' for b[j1:j2]; return
    if j1 == j2: emit '-' for a[i1:i2]; return
    find middle snake (x, y, u, v) with forward and backward D; recurse on (i1,x,j1,y) and (u,i2,v,j2). But careful: the middle snake part that's part of the LCS path... In Myers' paper, the middle snake corresponds to a diagonal run; the D path splits into two halves. The standard implementation (e.g., from the "diff" paper or git's xdiff) recurses: find middle snake giving points (x,y) start and (u,v) end; recurse diff_rec(i1,x,j1,y) and diff_rec(u,i2,v,j2). The middle snake diagonal itself — hmm, in the middle snake algorithm, the snake from (x,y) to (u,v) is along a diagonal; recursion on both halves plus... Actually in the standard treatment, the snake between (x,y) and (u,v) is not emitted by recursion. Wait: the forward D-path ends at (x,y)? Let me recall.

Myers' linear space: find the middle snake such that the sum of the lengths of an optimal path prefix ending at snake start and suffix from snake end equals D. Then recurse on [i1,x)×[j1,y) and [u,i2)×[v,j2). The snake from (x,y) to (u,v) lies on a single diagonal and represents equal lines — must be emitted as "=" for a[x:u]. Hmm, but actually the recursion will handle it: the suffix/prefix trimming inside recursive calls? No — the left recursion ends at (x,y) and right starts at (u,v); the segment a[x:u] (equal to b[y:v]) is not covered. So we need to emit '=' for it. Wait, but in many implementations (e.g., git's recursion), they include the snake: the middle snake endpoints (x, y) and (u, v) with the snake being a[x:u]. Let me check the classic algorithm from Myers' paper:

Middle snake: for odd/even delta, find overlap of forward and backward paths. The result is a snake (x, y, u, v). Then LCS(A, B) = LCS(A[1..x], B[1..y]) + snake + LCS(A[u..], B[v..]). So yes, emit '=' for a[x:u] between the two recursive calls. Hmm, but actually many implementations merge the snake into recursion via prefix/suffix trimming — the recursive calls will trim... no, the left call trims prefix of a[i1:] vs b[j1:], the trailing part of the left region's common suffix with... The snake is inside, not at boundaries of subregions. Wait — actually the left subproblem's suffix: left region is a[i1:x], b[j1:y]; its common suffix is not the snake. Right region a[u:i2], b[v:j2]; its common prefix is not the snake either. So the snake must be emitted explicitly. Hmm wait, let me re-check: actually in the standard algorithm, the middle snake found by the algorithm — the forward path reaches (x,y) and backward path starts at (u,v)? Let me define carefully.

Standard implementation (adapted from well-known code, e.g., the one in "diff-match-patch" or the classic):

def middle_snake(a, a0, a1, b, b0, b1):
    N = a1-a0, M = b1-b0
    delta = N - M
    odd = delta % 2 != 0
    vf = {k: ...}, vb = {...}
    vf[1] = 0 (with offset)
    For d in 0..ceil((N+M)/2):
        # forward
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and vf[k-1] < vf[k+1]): x = vf[k+1]
            else: x = vf[k-1] + 1
            y = x - k
            x0, y0 = x, y  # snake start
            while x < N and y < M and a[a0+x] == b[b0+y]: x+=1; y+=1
            vf[k] = x
            if odd and (-(d-1) <= k-delta <= d-1) ... check overlap: if k-delta in range of vb and vf[k] + vb[delta - k]... hmm.

Overlap condition: for odd delta, check when forward d-step meets backward (d-1)-step: if vb[k - delta] <= x? The backward V is indexed with k relative to same origin: backward vb[k'] = largest x such that snake ends... conventions vary.

This is fiddly; the classic correct version (from Myers' paper pseudocode / common implementations):

Let me use the version from the well-known article "Myers Diff Algorithm — line space" or the implementation used in many places:

def find_middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2
    delta = N - M
    odd = delta & 1
    vf = [0]*(2*max_d+2) with offset; vf[1] = 0 initially meaning vf[1-offset]=0? Use dict or list with offset max_d.

Actually let me use a known-correct implementation pattern (like the one from Robert Elder's article):

def find_middle_snake(a, a_off, a_end, b, b_off, b_end):
    N = a_end - a_off
    M = b_end - b_off
    max_d = (N + M + 1) // 2
    size = 2 * max_d + 1
    Vf = [0] * size  # index k + max_d ; store x
    Vb = [0] * size
    Vf[1] = 0? In Robert Elder's version, Vf[1]=0 and forward loop:

    for d in range(max_d + 1):
        # forward
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and Vf[k - 1 + off] < Vf[k + 1 + off]):
                x = Vf[k + 1 + off]
            else:
                x = Vf[k - 1 + off] + 1
            y = x - k
            sx, sy = x, y
            while x < N and y < M and a[a_off + x] == b[b_off + y]:
                x += 1; y += 1
            Vf[k + off] = x
            if odd and (k - delta >= -(d - 1) and k - delta <= d - 1):
                # check overlap with backward
                if Vf[k + off] + Vb[(k - delta) + off]... hmm.

Robert Elder's overlap check: if odd and (delta - (d-1)) <= k <= (delta + (d-1))? He checks: if Vb[k - delta + off]? Let me recall his code:

His pseudocode (from "Myers Diff in linear space"):

for d in 0..max:
  forward:
    k from -d to d step 2:
      if k == -d or (k != d and Vf[k-1] < Vf[k+1]): x = Vf[k+1]
      else: x = Vf[k-1]+1
      y = x - k
      while x<N and y<M and a[x]==b[y]: x++, y++
      Vf[k] = x
      if delta odd and delta - (d-1) <= k <= delta + (d-1):
        if Vf[k] >= Vb[?]. The backward is stored as... In his version backward stores x too? He stores backward with Vb[k] = x where snake goes from... Hmm.

Alternatively I recall the condition: if odd and (-(d-1) <= k-delta <= d-1) and Vf[k] + Vb[(k-delta)] >= N? where Vb[k'] stores x measured from the end: backward snake: vb[k'] = N - x_end? Conventions differ.

To reduce risk, maybe implement the simpler forward Myers with trace (O(D^2) memory). Given the stated performance requirements (max D=100 with N=20000 → trivial; D=2000 with N=M=1000 → memory ~ 2001 arrays × 4001 ints). In Python, list of lists: outer list 2001 pointers, each inner list of length up to 4001 → 2001*4001*8 bytes ≈ 64MB for pointers plus small-int caching. That's acceptable memory-wise and fast enough (8e6 basic ops in a few seconds... hmm, Python loops: 8e6 inner operations at ~50-100ns each in tight loop with list indexing — actually Python is slower, ~100-300ns per op; 8e6 ops in the k-loop plus snake while loops... The while loop snake comparisons: total across all d, k the snake steps are bounded by total... In the worst case (all different, no matches), snakes are length 0, so the work is just the k-loops: sum over d of (d+1) ≈ D²/2 = 2e6 k iterations, each doing a few list indexing ops — maybe 0.5-2s. Fine under 6s.

Wait, D for completely different 1000 vs 1000: D = N+M = 2000. k-loop iterations: sum_{d=0}^{2000} (d+1) ≈ 2e6. Each iteration ~ maybe 10 bytecode-heavy ops → ~2s. OK.

For 20000 lines differing in 50 places: D=100, k-iters ≈ 100*101/2*... sum_{d=0}^{100}(d+1)≈5151, plus snake steps: each d, each k, snake runs... trimming prefix/suffix first reduces N,M to small regions around the diffs. Actually with prefix/suffix trimming, N and M become small (the differing middle region). Great — very fast.

But worst-case unbounded inputs would be O(D²) memory — acceptable for this problem.

Hmm, but the requirement "completely different lists of 1000 lines in under 6 seconds": my estimate 2e6 k-iterations. Each iteration in Python: the inner loop body has comparisons, list indexing with offset arithmetic, while check. Realistically ~1µs per iteration → 2s. OK. Let me optimize: use local variable references, single list V of size 2*max_d+1... fine.

Alternatively use bisect-based Hunt–Szymanski? No — repeats allowed, worst case bad. Stick with Myers trace version.

Let me write the forward Myers with trace:

def diff_lines(a, b):
    # Trim common prefix
    out = []
    n, m = len(a), len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        out.append(("=", a[p])); p += 1
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]:
        s += 1
    # middle
    mid_a = a[p:n-s]; mid_b = b[p:m-s]
    out.extend(_myers(mid_a, mid_b))
    # suffix
    for i in range(n - s, n): out.append(("=", a[i]))
    return out

Edge: if n-s < p? The while conditions ensure prefix and suffix don't overlap: p advances while both within; suffix s bounded by n-p and m-p. If mid empty, _myers returns [].

_myers(a, b):
    n, m = len(a), len(b)
    if n == 0: return [("+", x) for x in b]
    if m == 0: return [("-", x) for x in a]
    max_d = n + m
    v = {1: 0} or list. Use list with offset: off = m? Standard: V indexed by k in [-max_d, max_d], size 2*max_d+3. V[1] = 0.

    trace = []
    found = False
    for d in range(max_d + 1):
        trace.append(v.copy())  # snapshot before or after? Snapshot of v after processing d, storing per-d V arrays.
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v[k-1] < v[k+1]):
                x = v[k+1]
            else:
                x = v[k-1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[k] = x
            if x >= n and y >= m:
                found = True; break
        if found: break

Hmm, careful: the snapshot should be taken before updating v in that d round, because backtrack uses V at step d-1. Standard approach: store a copy of V at the start of each d iteration (i.e., state after d-1). Then backtrack:

x, y = n, m
for d in range(len(trace)-1, 0, -1):
    vprev = trace[d]  # state at start of round d = after round d-1
    k = x - y
    if k == -d or (k != d and vprev[k-1] < vprev[k+1]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = vprev[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        # diagonal moves are '=' — emit from the end backwards? We're building backwards; collect and reverse.
    Hmm — backtrack: from (x,y), the d-1 step goes to (prev_x, prev_y) via one non-diagonal move (either down: x same, y+1 → "+" of b, or right: x+1 → "-" of a), then diagonal snake to (x, y).

Standard backtrack: at each step d from D down to 1:
    v = trace[d] (state after round d-1... wait need state after round d-1 which equals snapshot taken at start of round d).
    k = x - y
    decide prev_k as above (same condition using v[k-1], v[k+1]).
    prev_x = v[prev_k]; prev_y = prev_k? prev_y = prev_x - prev_k.
    while x > prev_x and y > prev_y: emit ('=', a[x-1]); x-=1; y-=1
    if d > 0: if prev_k == k - 1: emit ('-', a[x-1]); x -= 1  # moved right in x
              else: emit ('+', b[y-1]); y -= 1

Wait sign: prev_k = k+1 means previous diagonal was k+1 and we moved... In forward, from k we came from k-1 (x increased, "delete") or k+1 (y increased... let's check: forward step: if we take x = v[k+1] (coming from diagonal k+1), then y = x - k = v[k+1] - k = (v[k+1]) - k, and since prev x' = v[k+1] on diagonal k+1 with y' = x' - (k+1) = x - k - 1 = y - 1. So new (x, y) = (x', y'+1): y increased → insertion → "+". If we take x = v[k-1]+1 from diagonal k-1: x increased by 1 → deletion "-".

In backtrack, the condition mirrors forward: if k == -d or (k != d and v[k-1] < v[k+1]) → came from k+1 → "+" move (y decreases going back), else came from k-1 → "-" move.

So backtrack:
    v = trace[d]  # snapshot at start of round d = V after round d-1
    k = x - y
    if k == -d or (k != d and v[k-1] < v[k+1]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = v[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        out.append(("=", a[x-1])); x -= 1; y -= 1
    if prev_k == k + 1:  # came from above diagonal, y was incremented
        out.append(("+", b[y-1])); y -= 1
    else:
        out.append(("-", a[x-1])); x -= 1

Hmm wait: prev_k == k+1 corresponds to x = v[k+1], the "+" case. Yes.

Then after loop down to d=1, at d=0: k=0, x=y, diagonal: while x>0: emit ('=', a[x-1]); x-=1.

But careful: the condition at d uses k range [-d, d]; k = x-y where (x,y) is endpoint after round d. At backtracking step for round d, x,y is end of d-path. k within [-d,d]. Using v = trace[d] which is V after round d-1 (values for k in [-(d-1), d-1], plus V[1] initialized... For k == -d case: prev_k = k+1 = -d+1, valid. For k == d: condition k != d fails → prev_k = k-1 = d-1, valid. Good.

But one subtlety: when k == -d and also... if k == -d, we must use prev_k = k+1 since v[k-1] = v[-d-1] not set this round — but might contain stale value. The condition handles it: k == -d check first. When k == d: use else branch. Good. But what about "k != d and v[k-1] < v[k+1]" — when k == -d... handled. Fine.

Snapshot memory: trace stores dict copies or list copies. Using a list of size 2*max_d+3, copying each round: d copies of length ~2D → O(D²) memory. For D=2000: 2000 arrays × 4000 → 8e6 slots. Using Python list of ints: 64MB pointers + shared small ints (values up to n=1000, ints up to 256 cached; larger ints are objects but many duplicates? Each int object 28 bytes; distinct values created during computation... x values range 0..1000, ~1000 distinct objects reused across assignments). Actually v[k]=x stores references to int objects; many are the same objects. Memory ~ 64MB + small overhead. Acceptable? Possibly borderline but OK.

Alternative: store only v.copy() — list copy is fast (C level).

Time: d-loop total k-iterations ≈ D²/2 = 2e6, each with ~6-10 ops → maybe 1.5-3s in CPython. Plus list copies: 2000 copies of avg 4000-length list = 8e6 pointer copies, fast C. Plus trace backtracking: D steps with snake emits: total emitted = n+m = 2000. Fine. Under 6s, probably ~2-3s worst case. Let's optimize the inner loop:

Use local names: va = v (list), a_local = a, b_local = b, n, m local. Precompute offset? Using negative indices: k in [-max_d, max_d]; use index k + off where off = max_d + 1, list size 2*max_d + 3. Index arithmetic adds ops. Alternatively use dict for v — dict ops maybe comparable. I'll use list with offset; keep off as local.

Actually simpler: allocate v = [0]*(2*max_d+3), off = max_d + 1. v[off+1] = 0 initial (represents k=1 → x=0). Standard.

For trace, store v[:2*d+...]? Just store full copy: trace.append(v[:]) — but copies of full 2*max_d+3 each time: 2000 × 4003 = 8e6. Fine.

Hmm, one more subtlety: at round d, only k in [-d, d] are updated; older entries remain from previous rounds but backtracking only reads indices prev_k within [-(d-1), d-1], which were set in round d-1 — correct.

Also handle: if n == 0 or m == 0 shortcut. Also an optimization: check first if there are any common lines; if LCS = 0... the algorithm handles it (D = n+m).

Another optimization for the "20000 lines, 50 diffs" case: trimming prefix/suffix reduces to small middle, so trivially fast.

Also for completely different 1000: no trimming, D=2000 full run. Estimate time more carefully: inner loop body:

for k in range(-d, d+1, 2):
    if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
        x = v[k+1+off]
    else:
        x = v[k-1+off] + 1
    y = x - k
    while x < n and y < m and a[x] == b[y]:
        x += 1; y += 1
    v[k+off] = x

With all-different lines, snake while does 2 comparisons each iteration then fails: at least the first check x<n and y<m true, then a[x]==b[y] false. ~4-5 ops. Total per k ≈ maybe 12-15 bytecode ops ≈ 0.7-1 µs. 2e6 k-iters → ~1.5-2s. Plus d rounds overhead small. OK, should pass under 6s.

Could reduce constant: since completely different, we could add a quick pre-check: if no common elements (set intersection empty), return all "-" then "+". That handles the worst case instantly. But lines can repeat and partially common... A set-based check: if not (set(mid_a) & set(mid_b)): return deletes+inserts. That's a nice fast path but not required. Adding it is harmless and boosts worst case. But careful: it's only valid if truly no common line values. Yes.

Also could bound: if min(n,m)==0 handled.

Also another optimization: when D would be large, still fine.

Edge cases with the k == -d check: at d=0, k=0: condition k == -d (0 == 0) True → x = v[k+1+off] = v[off+1] = 0. Good.

Break condition: after computing x,y, if x >= n and y >= m: break. Note we must also ensure we don't break mid-round before... it's fine; we break out of k loop then d loop.

But trace: we append snapshot at start of each round d, before updating. Then backtrack for d in range(D, 0, -1) using trace[d]. trace has D+1 entries (rounds 0..D). At d=D, trace[D] is state after round D-1. Good. For d=0, handle remaining diagonal directly: after loop, x should equal... after backtracking all d≥1, we have path start at d=0: (x,y) with x==y==0? At d=0 the only k is 0 and path is x=y=0 plus snake. So after loop, while x>0 and y>0: emit '='. Since k=0 diagonal, x==y. Emit while x>0.

Wait — after processing d=1 backtrack, we reach state at start of round 0, i.e., the d=0 path endpoint before snake... Actually the d=0 path: start (0,0), snake along diagonal 0. Its endpoint stored... The backtrack: after d=1 step, (x,y) is the endpoint of the d=0 path (including its snake). Then remaining diagonal moves: while x > 0 and y > 0: emit ('=', a[x-1]). Correct.

Let me now also double check the trace/backtrack consistency: in forward round d, when we find x>=n and y>=m at some k, v[k] = x is set, and trace snapshot was taken before the round. Backtrack: x,y = n,m; k = x-y = n-m. Is k within [-d, d]? The found k is in [-d,d] and x - y = k. Yes.

Condition in backtrack uses v[k-1], v[k+1] from trace[d] — same values as forward used? Forward at round d for index k used v[k±1] values from round d-1 (stale or fresh—within round, k iterates by 2, so k-1 and k+1 are from previous round since same-parity). Trace[d] is state before round d, so v[k±1] in trace are exactly what forward used (forward reads v[k+1] and v[k-1] which were last written in round d-1 or initialization). But careful: forward writes v[k] during the round; reads v[k-1], v[k+1] — same parity as k differ from k, so they weren't written this round. Good, consistent.

Hmm, but wait: within round d, we write v[k] for k in {-d, -d+2, ...}. Next k' = k+2 reads v[k'-1] = v[k+1] — written in round d-1? k+1 has opposite parity from... k+1 is odd when k even... In round d, k has parity of d. k±1 parity d±1 ≠ d, so not written in round d. Correct.

Now, one more subtlety: forward reads v[k+1] which at round d for k=d: k == d → else branch, uses v[k-1]. For k = -d: uses v[k+1]. v[k+1] = v[-d+1] was written in round d-1 (k=-d+1 = -(d-1)). Good.

Now the "=" items ordering: backtrack emits in reverse; so collect into list and reverse at end, or build by prepending. Collect then reverse, then merge with prefix/suffix handled outside — _myers returns reversed list reversed.

Total diff_lines assembly: prefix equals, then _myers output, then suffix equals.

Verify properties: taking "=" and "-" gives a: prefix equals from a, then _myers "=" + "-" gives mid_a, then suffix equals. ✓. Similarly for b. Minimality: Myers gives minimal D, and number of "=" = (n+m-D)/2 = LCS length. ✓.

Also handle lines equality via ==; hashing not needed.

Let me also think: should trimming be done inside _myers too? The outer trim suffices for the perf scenarios.

Additional micro-optimization: in the main loop, hoist `v` and `off`, use `while` maybe. Also skip the trace copy: instead of copying whole v each round, we could store only... keep simple.

Actually memory concern for D=2000: trace = 2001 lists × 4003 slots ≈ 8e6 pointers = 64MB. Plus list object overhead 2001×~56 bytes. Should be fine (default memory limits). But we could store copies truncated: v[:2*d+3]? At round d, valid indices span k ∈ [-(d-1), d-1] plus we read k±1 within round d → indices needed at round d: [-(d), d]... For backtrack at step d we read trace[d][k-1], trace[d][k+1], trace[d][prev_k] with k ∈ [-d, d], so indices in [-d-1, d+1]. Store v[off-d-1 : off+d+2] → length 2d+3. Total sum ≈ D² = 4e6. Saves half. But then indexing changes (offset per round). Slightly more complex; skip — full copy is fine, simpler and correct.

Hmm, actually maybe better: to reduce memory and time, note for the k==d case we use v[k-1]; the copy is v[:] of length 2*max_d+3 = 2*(n+m)+3 ≈ 4003 for D=2000. 2001 copies × 4003 = 8.01e6 pointer slots ≈ 64 MB. OK.

Alternatively reduce max_d: D never exceeds n+m but the loop naturally stops at the true D. max_d = n+m is just bound. Fine.

Let me also add the empty-intersection fast path for robustness:

    if not (set(a) & set(b)):
        return [("−",...)]... Actually careful: set intersection uses hashing; lines are strings, hashable. Fine. But is it needed? The pure Myers handles it within time budget. It also helps cases like "reversed lists". I'll include it — harmless.

Also another common fast path: if a == b → all equals (handled by trim). If mid lengths... fine.

Wait, one more: the fast path changes nothing about minimality (LCS=0 → D=n+m, "=" count 0). ✓.

Let me write the final code.

def diff_lines(a, b):
    out = []
    n, m = len(a), len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        out.append(("=", a[p]))
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    ma = a[p:n - s]
    mb = b[p:m - s]
    out.extend(_diff_middle(ma, mb))
    for i in range(n - s, n):
        out.append(("=", a[i]))
    return out

def _diff_middle(a, b):
    n = len(a); m = len(b)
    if n == 0:
        return [("+", ln) for ln in b]
    if m == 0:
        return [("-", ln) for ln in a]
    if not (set(a) & set(b)):
        return [("-", ln) for ln in a] + [("+", ln) for ln in b]

    max_d = n + m
    off = max_d + 1
    v = [0] * (2 * max_d + 3)
    trace = []
    D = None
    for d in range(max_d + 1):
        trace.append(v[:])
        kmin = -d; kmax = d
        for k in range(kmin, kmax + 1, 2):
            if k == kmin or (k != kmax and v[k - 1 + off] < v[k + 1 + off]):
                x = v[k + 1 + off]
            else:
                x = v[k - 1 + off] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[k + off] = x
            if x >= n and y >= m:
                D = d
                break
        if D is not None:
            break

    script = []
    x = n; y = m
    for d in range(D, 0, -1):
        vprev = trace[d]
        k = x - y
        if k == -d or (k != d and vprev[k - 1 + off] < vprev[k + 1 + off]):
            pk = k + 1
        else:
            pk = k - 1
        px = vprev[pk + off]
        py = px - pk
        while x > px and y > py:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if pk == k + 1:
            script.append(("+", b[y - 1]))
            y -= 1
        else:
            script.append(("-", a[x - 1]))
            x -= 1
    while x > 0 and y > 0:
        script.append(("=", a[x - 1]))
        x -= 1
        y -= 1
    script.reverse()
    return script

Check backtrack loop condition: while x > px and y > py — diagonal moves decrease both. After diagonal, one edit move. But could there be leftover diagonal mismatch, e.g., x > px but y == py? Then the edit move: pk == k+1 means "+" (y decrement) → y = y-1 = py, x unchanged = px? Wait: after the edit move in forward direction, (x', y') = (px, py) then snake to (x,y). Going backward: from (x,y), snake back to (px + diag?) Hmm. Let me re-derive: forward: start (px, py) on diagonal pk, one move: if pk = k+1 case: (px, py+1) [since y increases], then snake to (x, y). So backward from (x,y): snake back while x>px and y>py+... hmm. The snake goes from (px, py+1) to (x, y) along diagonal k. Backtrack: while x > px and y > py + 1? No wait.

Let me redo: forward from diagonal pk: point (px, py) with px - py = pk. If pk == k+1: move down: (px, py+1). Then snake: while a[x]==b[y]: x++, y++ ending at (x,y) with x - y = k. So snake from (px, py+1) to (x, y): length L = x - px = y - (py+1). Backward: while x > px and y > py + 1: emit '='. Then emit '+' b[py] (i.e., b[y-1] after decrements). Hmm, my code uses `while x > px and y > py` then '+' with y -= 1. If y ends at py+1 after diagonal, condition y > py holds → would emit an extra '=' with a[x-1], x = px already? Let's check: after diagonal loop with condition x > px and y > py: diagonal from (x,y) back to where? The snake start is (px, py+1). Diagonal steps: x decreases with y. Loop stops when x == px or y == py. If y > py still (y == py+1) and x == px, loop stops with y = py+1. Then '+' with b[y-1] = b[py], y -= 1 → y = py. x stays px. Correct! The loop condition x > px stops it. But what if x > px and y == py? Can that happen? x - y = k, px - py = pk = k-1 (else branch) or k+1.

Case pk = k-1: forward: (px+1, py) then snake to (x,y), snake length L = x - px - 1 = y - py. Backward: diagonal while x > px+1 and y > py, i.e., while x > px and y > py: stops when x == px+1 (or y == py). Then '-' a[x-1], x -= 1 → x = px. Correct.

Case pk = k+1: snake start (px, py+1), end (x, y): x - px = y - py - 1. Backward diagonal loop: stops when x == px or y == py. Could y reach py before x reaches px? y = py requires decrementing y by py+1 - py = 1... snake steps decrease both equally; y reaches py means we took y-(py) steps... but snake start y is py+1, so only 1 step would overshoot to y < snake start... The loop decrements both; from (x,y): after t steps, (x-t, y-t). Stop when x-t == px or y-t == py. x - px = y - py - 1 = L, so x-t==px at t=L, y-t==py at t=L+1. So stops at t=L first (x==px), y = py+1. Then '+' y-=1 → py. ✓.

So `while x > px and y > py` combined with the appropriate final move is correct in both cases. 

Then final d=0: after d=1 iteration, (x,y) is the endpoint of d=0 path = (L0, L0) where L0 = snake length on diagonal 0. while x>0 and y>0 emits equals. Since x==y, condition x>0 suffices but y>0 same. ✓.

Edge: D == 0 (identical middles)? Then mid_a == mid_b, but trimming would have consumed... Actually outer trim removes all common prefix and suffix; mid could still be identical? No: if a[p] == b[p] we trimmed. If mid non-empty and identical, first elements equal → contradiction with trim loop having stopped. Trim stops when a[p] != b[p] or one exhausted. If mid_a == mid_b non-empty, then a[p]==b[p], trim would have continued. So mid identical only if both empty. But what if mid_a empty and mid_b non-empty: handled by n==0 branch. If both non-empty, a[p] != b[p], D ≥ 1. But D=0 case in loop: d=0, k=0, x=y=0, snake runs to min... if a[0]==b[0] can't happen. So D≥1 and break happens with x>=n,y>=m possibly at d where... fine. Also if D found at d=0 (impossible here but in general), backtrack loop range(0,0,-1) empty, final while handles. OK.

One more check on the trace/backtrack when D is found mid-round: we break out of k loop; trace[d] was appended at round start; backtrack uses trace[d] (state after d-1). ✓. And v[k] for the found k was set before break — not needed for backtrack though (backtrack reads v[k-1], v[k+1] and v[pk]). pk ∈ [-(d-1), d-1] which are in trace[d]. ✓.

Also the k == -d / k != d condition in backtrack: k = x - y where (x,y) is the d-path endpoint found. In forward, k was within [-d, d]. ✓.

Now think about the "k != kmax and v[k-1+off] < v[k+1+off]" — when k == kmax, use else (x = v[k-1+off]+1). ✓ matches standard.

Also v[k+1+off] when k == kmin = -d: v[-d+1+off] — set in previous round. For d=0, v[off+1]=0 initial. ✓.

Potential issue: v initial zeros for indices never set — v[k-1+off] when k=-d reads v[-d-1+off] which for d>0 was never written but is not read due to k==kmin short-circuit. ✓.

Performance tweak: avoid attribute lookups; all local. The trace copy v[:] each round — for the 1000-different case, 2001 copies of 4003-elem list: each copy ~ C-speed, 8e6 pointer writes, maybe 0.3s. Fine.

Also, could reduce max_d loop bound: D ≤ n+m; but also LCS ≥ 0 so D ≤ n+m. fine.

Fast path set intersection: builds two sets of up to 1000 strings — trivial.

For the 20000/50 case: trim reduces middle to maybe ~100 lines each side (depends on layout), D ~ 100, trivial time.

I think also worth adding: inside _diff_middle, trim common prefix/suffix again (cheap, helps recursion-free version)? Outer already did full trim on the whole lists; the middle region a[p:n-s], b[p:m-s] has a[p] != b[p] (or exhausted) and a[n-s-1] != b[m-s-1] — wait, is that right? Outer trim stops at first mismatch p; suffix trim stops at first mismatch from end, with constraint s < n-p and s < m-p ensuring no overlap. So mid starts with mismatch and ends with mismatch. No further trimming possible. Good.

Double-check suffix trim constraint: we want mid_a = a[p:n-s] non-negative length: s ≤ n - p ensured by loop condition s < n - p... loop: while s < n-p and s < m-p and match: s += 1. After loop, s ≤ n-p and s ≤ m-p. mid_a length = n - s - p ≥ 0. ✓. Also if after prefix trim p == n (a exhausted), then n-p = 0, s stays 0, mid empty. ✓.

One concern: when prefix trim consumed everything of the shorter list, e.g., a is prefix of b: p == n, mid empty, out has equals for a, then _diff_middle([], b[p:]) → all '+'. ✓.

Now write final code. Also type hints as specified.

Micro-optimization of inner loop: replace `kmin`/`kmax` comparisons with direct -d and d. Keep as is.

One more possible optimization: use enumerate? Not needed.

Also guard: strings compared with == — fine.

Let me also consider recursion... none used, iterative. Good.

Final code:

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    ...

Include helper _myers_middle.

Write it out.