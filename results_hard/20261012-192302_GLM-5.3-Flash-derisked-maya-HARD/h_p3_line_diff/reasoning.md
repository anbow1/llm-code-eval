I need to implement Myers' O(ND) diff algorithm. Standard approach: compute LCS via Myers, then backtrack to produce edit script. Need to store V arrays per D step (or use linear space refinement, but simpler to store trace).

For 20000 lines differing in ~50 places, D is small (~100), fine.

For two completely different lists of 1000 lines: D = 2000, N+M = 2000, O(ND) = 2M operations — fine, but storing trace of V arrays: each V has size 2D+1, D steps ~ 2000 steps → 2000 * ~2000 ints = 4M ints... memory ~ manageable (Python ints in lists, ~ 8 bytes each with array module better). Use array module or lists. 2000 steps × up to 2001 elements each... total sum of (2D+1) for D=0..2000 ≈ 2000² + 2000 ≈ 4M entries. Using array('i') per step, that's ~16MB. Fine.

Actually for completely different lists, D = N+M = 2000. Time: inner loop per step is O(D), so total O(D²) = 4M iterations of Python — should run in ~2-4 seconds. Hmm, limit is 6 seconds. Python loop at ~10M simple ops/sec... 4M iterations with arithmetic inside might be ~4s. Could be tight. Optimize: only compute one path, use optimized inner loop.

Alternative optimization: strip common prefix/suffix first. For completely different lists of 1000 lines that share nothing, prefix/suffix stripping won't help. But we can reduce problem: if one sequence is empty etc.

Let me write Myers with trace, optimize the inner loop:

```python
def diff_lines(a, b):
    # strip common prefix
    # strip common suffix
    # Myers
```

Inner loop standard:

```python
max_d = (N + M + 1) // 2
trace = []
for d in range(max_d + 1):
    v = [0] * (2 * max_d + 1)  # reuse? no, need snapshots
```

Better: keep v as a single list reused, but store copies at each d (only up to 2d+1 relevant, but copying full is fine-ish). Actually copying full list of size (N+M+1) each step: D=2000 steps × 2001 elements = 4M copies, plus the inner loop. That doubles work but slicing is fast in C. Better to copy only needed slice? Backtrack needs v at arbitrary k in [-d, d]. Copy v[:] (whole array) — slice copy is fast.

Actually a common trick: store v as dict? Lists fine.

Optimization of inner loop:

```python
for d in range(D_max+1):
    trace.append(v[:])  # snapshot
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
            x = v[k+1+off]
        else:
            x = v[k-1+off] + 1
        y = x - k
        while x < N and y < M and a[x] == b[y]:
            x += 1; y += 1
        v[k+off] = x
    if v[off+M... ] >= N ... check
```

Wait: check termination: v[N+M? no — check when v[offset + (N-M)] ... Standard: if d is parity of (N+M) and v[(N-M)+off]... Actually check after inner loop: if v[(N - M) + off]... hmm, x reaches N when k = x - y = N - M. Check `if v[off + N - M] >= N` — actually v[k] = x, and x==N and y==M means x - k = M, k = N-M. Check `v[(N-M)+off] == N` after each d. But careful: k index must be valid: at step d, k ranges [-d,d]; N-M must be within range and have same parity — the standard check.

Also equality comparisons: a[x] == b[y] with strings — string comparison is fast for equal/unequal short strings (interned? not necessarily, but comparison of unequal strings of different content is O(len) worst... typically fine).

Optimization: map lines to integers first? Comparing strings repeatedly — for 1000x1000 completely different, inner while loop rarely advances. The main loop is 4M iterations of the for k loop with a few operations. Each iteration: condition check, arithmetic, while check. Maybe ~0.5 µs each → 2s. Should fit in 6s.

For the 20000/50-diff case: D ≈ 100, N+M = 40000. But the snake loop: while x < N and y < M and a[x]==b[y] — each step d the k-loop covers the diagonals; the snakes advance... total work O((N+M)·D)? Actually the snake advances: for each d and k, we start at some point and advance along diagonal. Total diagonal advancement is bounded by O(N+M + D) per...? Actually Myers O((N+M)·D) worst includes snake work. With N+M=40000 and D=100, that's 4M snake steps worst-case, plus prefix stripping reduces. But typically after stripping common prefix/suffix, the diff region is small (~50 lines each side), so D small and region small. Prefix/suffix stripping is essential here: without it, the snakes along diagonal k=0 would advance through the 20000 equal lines once — actually only once total per diagonal since v[k] stores furthest x. The total snake work across the whole algorithm is O(N+M) per... hmm, actually total snake work is bounded: each (x,y) diagonal position visited once per relevant d? No — for a given diagonal k, once furthest x is recorded, later d values start from there. So total snake advancement across all d is at most (number of diagonals) × (length of diagonal) worst case? Each step d processes each k once, and snake advances from previous furthest point. Sum over d of snake advances: a diagonal k can advance at most min(N, M) total across all d (since furthest point monotonic). There are up to 2D+1 diagonals reached. So total snake work ≤ 2D·min(N,M)? No — actually for each k, the furthest x only increases, so total advancement on diagonal k across all d ≤ length of diagonal. Total ≤ sum over k of length ≈ O((N+M)·D)? For k in [-D,D], diagonal length ~ min(N,M, ...) each, so ≤ (2D+1)·min(N,M) = 200×20000 = 4M. Hmm but actually only if the snake advances at each d. In the common case with prefix/suffix stripped, the diff region is tiny, so it's fine.

So prefix/suffix stripping makes the 20000/50 case fast: region ~100 lines each, D≤200, trivial.

Backtracking: standard, using trace. After finding D, backtrack:

```python
x, y = N, M
for d in range(D, 0, -1):
    v = trace[d]
    k = x - y
    if k == -d or (k < d... )
```

Standard backtrack:

```python
result = []
x, y = n, m
prev_k = None
for d in range(len(trace)-1, 0, -1):
    vd = trace[d]
    k = x - y
    if k == -d or (k != d and vd[k-1+off] < ... ):
```

Wait, need to recompute prev: at step d, position (x,y) was reached either from v[d-1][k+1] (move down, i.e., insertion, +line from b) when prev_x = v_prev[k+1], or from v[d-1][k-1]+1 (move right, deletion). Determine: if k == -d (only came from k-1... hmm at d, k ranges [-d,d]; at boundary k==-d, previous must be k+1 (down move); at k==d, previous must be k-1). Otherwise, choose prev from v_prev: if v_prev[k-1] ... Standard:

```python
for d in range(D, 0, -1):
    vprev = trace[d-1]
    k = x - y
    if k == -d or (k != d and vprev[k-1+off] < vprev[k+1+off]... 
```

Hmm, the condition in forward: if k == -d or (k != d and v[k-1] < v[k+1]-... let me be careful with exact convention.

Forward at step d, diagonal k:
- prev from diagonal k-1 via a right-move (deletion of a[x]): prev_x = v_prev[k-1], x = prev_x + 1.
- prev from diagonal k+1 via down-move (insertion of b[y]): prev_x = v_prev[k+1], x = prev_x.

Condition used: if k == -d: must come from k+1 (down). elif k == d: must come from k-1 (right). else: choose whichever gives larger x: if v_prev[k-1+1]... compare v_prev[k-1] + 1 vs v_prev[k+1]; take max.

Backtrack:

```python
x, y = n, m
script_rev = []
for d in range(D, 0, -1):
    vprev = trace[d-1]
    k = x - y
    off = ...
    if k == -d:
        prev_x = vprev[k+1+off]  # came from down? wait
```

Hmm: at k == -d at step d, forward condition forced prev from k+1? Let's recheck: forward: "if k == -d or (k != d and v[k-1] ... )": typical code:

```python
if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
    x = v[k+1+off]        # from k+1 (down move / insertion)
else:
    x = v[k-1+off] + 1    # from k-1 (right move / deletion)
```

Wait, but this uses v of the same step? In many implementations v is updated in place, and reading v[k+1] gives previous d's value because k+1 hasn't been updated yet this step (we iterate k from -d to d, updating v[k]). Yes — in-place: when processing k, v[k-1] already updated this step (value from d), v[k+1] still from d-1. Hmm, that's the classic in-place trick. Then condition compares v[k-1] (current d) vs v[k+1] (previous d). That works but for trace snapshot we save v[:] before the k-loop (or after). Let me just avoid in-place subtleties: keep a fresh copy per d and read strictly from vprev = trace[d-1]. But that requires v_prev fully computed, so allocate new list each d: v_new = v_prev[:] then update. Copy cost: D × (2·max_d+1). For D=2000, max_d≈2000? max_d = (N+M+1)//2 ≈ 1000 for N=M=1000. Array size ≈ 2001. Copy per step 2001 → total 2000×2001 ≈ 4M element copies via slicing (fast C). Memory: 2000 arrays × 2001 × 8 bytes ≈ 32MB (Python list of ints: actually pointers + int objects; small ints cached, pointers 8 bytes → 32MB pointers). Acceptable. Could use array module ('l') to cut memory. Lists of small ints: ints are cached objects, so 8 bytes per slot. 32MB ok.

Hmm, but actually we could restrict snapshot to slice around used range. Keep simple: full copy.

Alternatively store only up to index range. Fine, full copy.

Forward algorithm:

```python
off = max_d  # k + off indexes 0..2*max_d
size = 2 * max_d + 1
v = [0] * size
trace = []
found = False
for d in range(max_d + 1):
    trace.append(v[:])   # snapshot before? We need snapshot of state at start of step d for backtracking to d-1... 
```

Backtracking uses vprev = state after completing step d-1. So snapshot after step d-1 = before step d. Appending v[:] at top of loop before processing gives trace[d] = state after step d-1... Let me define: trace[d] = v after step d. Simplest: after the k-loop, append. But we need to check termination after updating. Structure:

```python
for d in range(max_d + 1):
    for k in range(-d, d + 1, 2):
        # compute using only v_prev values
```

Problem: in-place k-loop reads v[k-1] which may already be updated (current d) and v[k+1] which is previous d. If I read v[k-1] expecting previous d's value, in-place gives current d. The classic Myers implementation does exactly this in-place and it's correct because when k-1 was processed this step, its value v[k-1] (new) equals max over paths... Hmm, actually the classic in-place version: v[k-1] after update at step d is the furthest point on diagonal k-1 at step d. Using it for diagonal k at step d: is that valid? In Myers' formulation, at step d, diagonal k can be reached from diagonal k-1 at step d-1 (via right move) or diagonal k+1 at step d-1 (via down move). But in-place uses v[k-1] from step d. Actually many implementations (e.g., the well-known one) do:

```python
for d in range(max_d+1):
    for k in range(-d, d+1, 2):
        if (k == -d or (k != d and v[k-1] < v[k+1])):  # hmm
```

Hmm wait, actually the common implementation reads v[k+1] (previous step, since k+1 > k not yet updated at this step) and v[k-1] (current step, updated). Using current-step value for k-1: the furthest point on diagonal k-1 at step d... A path reaching diagonal k at "greedy step d" — Myers' paper allows paths with d deletions... Actually the greedy algorithm: D-path on diagonal k comes from (D-1)-path on diagonal k±1. Using v[k-1] from step d would be a D-path on diagonal k-1, and moving right from it gives a D-path on diagonal k with... that would give x = v_d[k-1]+1 which could exceed the correct v_d[k]? Since v_d[k-1] ≥ v_{d-1}[k-1], taking x from v_d[k-1]+1 gives value ≥ correct. Is it still a valid reachable point? v_d[k-1] is reachable at step d on diagonal k-1; moving right reaches diagonal k at same "d" — but greedy paths: the number of edits... Moving right is a deletion, adding one edit. A D-path on k-1 extended by a deletion gives (D+1)-path on diagonal k. But we're computing step d, so we'd be using a (d+1)-path? Hmm, but this is the standard algorithm and it's known correct — the reason: v_d[k-1] + 1 corresponds to a path with... Let me think: actually the standard in-place is fine because it's equivalent to: v_d[k] = max(v_{d-1}[k+1], v_{d-1}[k-1] + 1, and possibly v_d[k-1]+1 snake-followed). Since v_d[k-1] ≥ v_{d-1}[k-1], the result is an over-approximation... but could it over-advance? If x = v_d[k-1] + 1, then the point (x, y=x-k) is reachable with how many edits? The path to v_d[k-1] uses d edits; +1 deletion = d+1 edits. Then following the snake adds no edits. But we're claiming it's a d-path. Hmm — however, the invariant needed is that v_d[k] ≥ furthest d-path reach, and monotone; the algorithm still finds minimal D because... Actually there's a subtlety: many implementations do exactly this and produce correct minimal diffs. E.g., the classic "Myers diff" from the paper section 4b? Let me just avoid the issue: compute with explicit prev array.

Alternative: use two arrays and copy: `vnew = vprev[:]` then update vnew[k] reading only vprev. Then trace.append(vnew). This is clean and correct. Copy overhead acceptable.

Actually wait — correctness concern with in-place: does using v_d[k-1] instead of v_{d-1}[k-1] break minimality? Consider: if x = v_d[k-1]+1 > v_{d-1}[k-1]+1, that point has d+1 edits, but we record it in v_d[k]. Later D found might still be minimal? The termination check finds first d where v_d reaches (N,M). Since values only get larger, we might find... hmm, we could find D smaller than actual? No—values can only be ≥ true values; a larger x means we might reach (N,M) earlier than the true minimal D? That would produce a script with... The backtrack would reconstruct a path of length d with possibly fewer/more moves. If values are over-estimates, the path found at step d might not correspond to exactly d edits — it might use more. Hmm, actually I recall that the in-place version IS the standard correct one (used in many implementations, e.g., in "myers diff" python implementations). Let me think again: at step d, k iterates -d..d step 2. When processing k, v[k-1] was updated this step (at k-2's... no, k-1 is odd/even parity!). Key: at step d, only k with parity of d are processed. v[k-1] has parity d-1, processed at step d-1 last... no wait: at step d, we process k in {-d, -d+2, ..., d}. v[k-1] has parity d-1, which was processed at step d-1 — NOT this step! Because this step only touches parity-d indices. So in-place reading v[k-1] gives the value from step d-1 (since k-1 has different parity and wasn't touched this step). 

So in-place is exactly the prev-step value. v[k-1] = v_{d-1}[k-1], v[k+1] = v_{d-1}[k+1]. No subtlety. And snapshots: at the top of step d, v contains v_{d-1} for all relevant indices. So trace.append(v[:]) at top of loop gives trace[d] = v_{d-1}? Then for backtracking I need v_{d-1} when undoing step d. Let me just append at top: trace[d] = state before step d = v_{d-1} state (state after step d-1). With trace[0] = initial zeros (state before step 0). Then backtrack from d = D down to 1 using trace[d] = state after step d-1 = v_{d-1}. 

So:

```python
v = [0]*(size)
trace = []
for d in range(max_d+1):
    trace.append(v[:])
    for k in range(-d, d+1, 2):
        idx = k + off
        if k == -d or (k != d and v[idx-1] < v[idx+1]):
            x = v[idx+1]
        else:
            x = v[idx-1] + 1
        y = x - k
        while x < n and y < m and a[x] == b[y]:
            x += 1; y += 1
        v[idx] = x
    if v[off + n - m] ... 
```

Wait the condition: standard is: if k == -d (can't come from k-1... hmm which direction?). At k == -d, diagonal k-1 = -d-1 wasn't computed at step d-1 (out of range), so must come from k+1. At k == d, k+1 = d+1 not computed, must come from k-1. The condition `v[idx-1] < v[idx+1]`: choose from k+1 (down move, insertion) if v[k+1] > v[k-1]... let's see: coming from k-1 gives x = v[k-1]+1; coming from k+1 gives x = v[k+1]. We want the larger x (further progress). So if v[idx-1] + 1 > v[idx+1], come from k-1? Hmm the standard condition: `if k == -d or (k != d and v[k-1] < v[k+1]): x = v[k+1] else: x = v[k-1]+1`. Check tie: if equal, comes from k-1 (deletion). Either is fine for correctness of length; for which edit comes first, doesn't matter much. But wait, must handle boundaries: at k == -d, idx-1 might be... k=-d, idx-1 = -d-1+off ≥ 0 as long as d ≤ max_d; value v[-d-1+off] — was it ever set? At step d-1, k-1 = -d-1 not processed (range -d+1..d-1 step2 → -d+1 minimum). It might hold stale value from earlier steps? Indices with |k|>d-1 at step d-1 were never written... initial 0. If v[idx-1]=0 stale, condition v[idx-1] < v[idx+1] may be wrong, hence the k==-d guard. Good. Similarly k==d guard: k != d ensures we use the else branch which reads v[idx-1] = v_{d-1}[d-1], valid. Good.

Termination: after inner loop, check if v[off + (n - m)] ... we need x == n and y == m. y = x - k, k = n - m → x = n. Check `v[off + n - m] >= n`? x == n exactly (v holds x). But careful: k = n-m must have parity of d and |n-m| ≤ d. The greedy guarantees the first d where it happens. Check: `if v[(n - m) + off] == n: D = d; break`. Hmm, but is it guaranteed that when it equals n, we're done (y==m)? x = n on diagonal k = n-m gives y = n - k = m. Yes.

Edge: n - m could exceed max_d? max_d = (n+m+1)//2 ≥ |n-m| always. Good. Also n-m parity: at d with d ≡ n+m (mod 2), k=n-m has parity d. Fine.

Also edge cases: n=0 or m=0 handled by prefix/suffix stripping leading to empty; then just emit + or - for all.

Now backtracking to produce script. We have trace[d] = v_{d-1} for d in 0..D (trace has D+1 entries, trace[d] = state after step d-1). We know final (n, m) reached at step D via some k = n - m... wait, the final point is on diagonal k_f = n - m at step D, x = n. To backtrack: at step d (from D down to 1), we're at (x, y) on diagonal k = x - y, having arrived at step d. v_{d-1} = trace[d]. Determine predecessor:

```python
x, y = n, m
for d in range(D, 0, -1):
    vprev = trace[d]  # v_{d-1}
    k = x - y
    idx = k + off
    if k == -d or (k != d and vprev[idx - 1] < vprev[idx + 1]):
        # came from k+1 via down move (insert b[y-1])
        prev_x = vprev[idx + 1]
        prev_y = prev_x - (k + 1)  # y on diagonal k+1
        # snake from (prev_x, prev_y) to (x, y)? Not necessarily — snake between
```

Hmm: the forward computation: x = v_{d-1}[k+1] (arrival point on diagonal k+1 after its snake), then down move to (x, y+1)? Wait: from (x', y') on diagonal k+1 where x' = v[k+1], y' = x' - (k+1); down move → (x', y'+1) on diagonal k; then snake. So x (our current) = x' + snake. So backtrack: x_prev_on_kplus1 = vprev[idx+1]; that's x' = the x coordinate after the down move = current x... wait no: down move keeps x the same: from (x', y') → (x', y'+1). Then snake advances both. So current x ≥ x' = vprev[idx+1], and the snake from (x', y'+1) to (x, y) consists of equal lines a[x'..x-1] == b[y'+1..y-1]... careful with indices.

Simpler backtrack approach: reconstruct the path points and then diff the segments. Standard approach:

```python
path = []
x, y = n, m
for d in range(D, 0, -1):
    vprev = trace[d]
    k = x - y
    if k == -d or (k != d and vprev[k-1+off] < vprev[k+1+off]):
        kprev = k + 1
    else:
        kprev = k - 1
    ...
```

Hmm wait, the condition direction: forward, we chose x = v[k+1] (from diagonal k+1, down move) when k == -d or (k != d and v_{d-1}[k-1] < v_{d-1}[k+1]). Else x = v[k-1] + 1.

Backtrack: replicate the same condition using vprev = trace[d] (= v_{d-1}):

```python
if k == -d or (k != d and vprev[idx-1] < vprev[idx+1]):
    # came from diagonal k+1, via insertion
    prev_x = vprev[idx+1]           # x' on diagonal k+1
    prev_y = prev_x - (k+1)
    # we moved down: (prev_x, prev_y) -> (prev_x, prev_y + 1), then snake to (x, y)
    # snake: lines a[prev_x .. x-1] equal b[prev_y+1 .. y-1]
    # emit: insertion of b[y-1] (the down move line), then '=' for snake lines? 
else:
    prev_x = vprev[idx-1]           # x'' on diagonal k-1 before right move
    # right move: (prev_x, prev_y) -> (prev_x+1, prev_y), then snake
    # emit: deletion of a[x-1]... wait
```

Hold on, orientation: prev_x = vprev[idx+1] is the x after the down move or before? Down move doesn't change x. On diagonal k+1, furthest x is vprev[idx+1], point (vprev[idx+1], vprev[idx+1]-(k+1)). Down move: y+1 → point (vprev[idx+1], vprev[idx+1]-k) on diagonal k. Then snake to (x, y). So snake lines: a[prev_x .. x-1] where prev_x = vprev[idx+1], i.e., a[prev_x], ..., a[x-1] equal b lines b[prev_y+1], ..., b[y-1] where prev_y = prev_x - (k+1). These are "=" pairs (a[i], b[j]) matching. Then the edit: insertion of b line b[prev_y] (0-indexed: b[prev_y] is the line inserted via down move since y went from prev_y to prev_y+1 meaning we consume b[prev_y]).

So when emitting in forward order, from this step (going backward): first the "=" snake lines (a[i] vs b[j] for i in prev_x..x-1, j in prev_y+1..y-1), then ("+", b[prev_y])? Order: the down move consumes b[prev_y] as inserted. In forward script order: inserted line comes before the snake? Path: down move at position, then snake. Forward in time: insert b[prev_y], then match a[prev_x..x-1] with b[prev_y+1..y-1]. So in the script: ("+", b[prev_y]) then the "=" items. Since we're backtracking, we append in reverse: "=" items reversed, then the "+".

For deletion branch: prev on diagonal k-1: point (vprev[idx-1], vprev[idx-1]-(k-1)). Right move: x+1 → (prev_x+1, prev_y). Then snake to (x,y). The right move consumes a[prev_x] as deleted. Snake: a[prev_x+1..x-1] == b[prev_y..y-1]. Script: ("-", a[prev_x]), then "=" pairs.

Rather than building reversed then reversing, easiest: collect path as list of (x, y) points, then generate script by walking. Let me do: backtrack collecting moves, then reverse.

Implementation:

```python
moves = []  # list of ('+', line) / ('-', line) / ('=', (aline, bline)) built in reverse
x, y = n, m
for d in range(D, 0, -1):
    vprev = trace[d]
    k = x - y
    if k == -d or (k != d and vprev[k-1+off] < vprev[k+1+off]):
        prev_x = vprev[k+1+off]
        # insertion of b[prev_y] where prev_y = prev_x - (k+1)
        # snake a[prev_x..x-1] vs b[prev_y+1..y-1]
        i = x - 1
        j = y - 1
        while i >= prev_x:
            moves.append(('=', ...))  # a[i] == b[j]
            i -= 1; j -= 1
        moves.append(('+', b[prev_x - (k+1)]))
        x, y = prev_x, prev_x - (k+1)
    else:
        prev_x = vprev[k-1+off]
        prev_y = prev_x - (k-1)
        i = x - 1; j = y - 1
        while i > prev_x:  # snake from prev_x+1..x-1
            moves.append(('=',))
            i -= 1; j -= 1
        moves.append(('-', a[prev_x]))
        x, y = prev_x, prev_y
```

Wait in deletion branch: after right move, point is (prev_x+1, prev_y). Snake advances to (x, y): so x-1 - (prev_x+1) + 1 = x - prev_x - 1 snake steps, matching a[prev_x+1..x-1] with b[prev_y..y-1]. Number of snake steps: x - prev_x - 1. In loop: i from x-1 down to prev_x+1 → `while i > prev_x`. j from y-1 down: j = y-1 - (number done). Since a[i] == b[j] and diagonals consistent, fine. Store ('=', a[i]) or ('=', b[j]) — they're equal; spec says ("=", line). Use a[i] (== b[j]).

For insertion branch: point after down move (prev_x, prev_y+1) where prev_y = prev_x-(k+1). Snake to (x, y): steps = x - prev_x, matching a[prev_x..x-1] with b[prev_y+1..y-1]. Loop: i from x-1 down to prev_x: `while i >= prev_x`. Then ('+', b[prev_y]) where prev_y = prev_x - k - 1.

Hmm wait: check consistency: prev_y + 1 = prev_x - k. And after snake, y = prev_y + 1 + (x - prev_x) = prev_x - k - 1 + 1 + x - prev_x = x - k. ✓.

At the end (d == 0), remaining (x, y) = (0, 0)? Since we stripped prefix... after stripping, a and b (stripped) — the algorithm operates on stripped lists; final x=n', y=m'. Backtrack down to d=0: at d=0, point must be (0,0) (trace[0] all zeros, diagonal 0, x = v[off] = 0 at step 0 if snake... wait, at step 0, k=0, x = v[1] or v[-1]+1 = 0, then snake advances. If D=0, whole stripped sequences equal → all "="). Backtracking to (0,0): after processing d=1, x,y should be the point reached at step 0 on diagonal 0 after snake = (n', m') if D=0... but wait: if D=0 we never entered backtrack loop (range(0,0,-1) empty), handle: if D==0: all "=".

Hmm, but more generally, at end of backtrack loop, (x,y) should be (0,0) and remaining snakes at d=0 already consumed? At d=1 backtrack: we go to the point on diagonal k±1 at step 0, which is v_0[k'] = furthest point on diagonal k' after step 0's snake. Then we've emitted snake+edit for step 1. Then loop ends at d=1 (range(D,0,-1) covers d=D..1). After processing d=1, (x,y) is the step-0 point, which includes the d=0 snake! So remaining a[0..x-1], b[0..y-1]... hmm, the point (x,y) at step 0 after snake: but lines before the snake (a[0..x-1], b[0..y-1])? Wait the step-0 point IS after the snake from (0,0). The snake from (0,0) on diagonal 0: matches a[0..x-1] with b[0..y-1]. But these weren't emitted in the backtrack loop! Because backtrack for d=1 went to the endpoint of step-0 snake, not the start.

Hmm, right: the standard backtrack needs a final segment: after reaching d=0 state, prepend the initial snake: a[0..x-1] == b[0..y-1] as "=" pairs. Since after stripping, the stripped a,b start... wait, no — we stripped common prefix, so a[0] != b[0] (stripped), unless one is empty. So the d=0 snake from (0,0) has length 0? If a[0] != b[0], snake at (0,0) doesn't advance. But v_0[0] = snake length = 0. And step-0 point = (0,0). Hmm, but then at backtrack end, x=y=0 and nothing to prepend. But wait — is that right? With prefix stripped, a[0] != b[0] or one list empty. If one empty (n'=0 or m'=0): D = m' or n', all insertions/deletions; backtrack: at d=1, k = x-y = -1 (if n'=0): k == -d → insertion branch, prev_x = v_0[0] = 0, snake none, ('+', b[0])... loop until y=0. Ends with x=0,y=0. Good.

If both non-empty and a[0]!=b[0]: D≥1. Backtrack ends at (0,0). No leftover. But to be safe (e.g., if I hadn't stripped prefix, or defensive), add final loop:

```python
while x > 0 and y > 0 and a[x-1] == b[y-1]... 
```

Hmm, that's not right either — leftover at d=0 means snake from (0,0). Just do: after loop, while x > 0 and y > 0: prepend '=' with a[x-1], x-=1, y-=1. But could there be leftover where x>0, y==0? That would mean deletions at step 0, but step 0 has no edits. Leftover can only be the d=0 snake which requires x>0 and y>0 and equality along diagonal 0. With prefix stripping, x=0 or... Actually if a[0]==b[0] can't happen post-strip. But if both stripped lists nonempty and D computed... the step-0 snake is length 0, so backtrack ends at (0,0) exactly. I'll include the safety while loop anyway (harmless).

Hmm wait, actually one more check: stripping the suffix: need a[n-1] != b[m-1] post-strip or empty. Fine.

Now, performance concerns for the 1000×1000 completely different case: n=m=1000 (after stripping nothing). D = 2000. Loop d from 0 to 2000. Inner k loop total iterations = sum over d of (d+1)... number of k values at step d = d+1 (from -d to d step 2 → d+1 values). Total = sum_{d=0}^{2000}(d+1) ≈ 2M iterations. Each iteration: condition, arithmetic, while check (fails immediately), assignment. ~2M × maybe 0.3µs = 0.6-1.5s. Plus snapshots: 2000 slices of 2001 → fast. Plus backtrack 2000 steps. Should be within 6s. But wait: max_d = (n+m+1)//2 = 1000... no: max_d bound for Myers is n+m (D ≤ n+m = 2000). max_d should be n+m. Let me set max_d = n + m. Then D found ≤ 2000. The k-loop at step d covers -d..d; d goes to 2000, so total iterations = sum_{d=0}^{2000}(d+1) ≈ 2,003,001. OK.

Actually, when lists are completely different, can D exceed min possible? D_max = n+m = 2000, reached at d=2000 where only k=-2000 (i.e., all deletions then... ) hmm, at d=2000, k ranges -2000..2000 but only parity 2000 → k=-2000, -1998, ..., 2000. k=2000-... the reachable: k = n-m = 0 at d=2000: yes parity even, and v will reach n=1000. Actually will it terminate earlier? With completely different elements, LCS length 0... but wait "completely different" — LCS could be >0 if elements repeat. "completely different lists" I'll interpret as LCS=0, D = n+m = 2000. Termination at d=2000. Fine.

Memory of trace: 2001 snapshots × 2001 ints × 8 bytes ≈ 32MB. Plus int objects are cached small ints mostly (x values up to 1000, cached range -5..256 only!). Ints >256 are not cached; each x value stored creates... v[idx] = x stores reference to existing int object (x is computed). Multiple references to same int object mostly. Fine, ~32-40MB. Acceptable. Could use array('i') but slicing arrays also fine. Lists are faster for indexing. Keep lists.

Actually, to reduce memory, I could store snapshots only of the used slice: at step d, indices |k| ≤ d are used, i.e., slice v[off-d : off+d+1]. Store slice plus offset. Backtrack: trace_d[d] gives v_{d-1}; index k+off within slice offset off-d... At backtrack step d we access indices k-1+off and k+1+off where |k| ≤ d, and k+1 could be d+1 — but the condition guards k==d (else branch), and when k==-d we don't read idx-1? Wait the condition `k == -d or (k != d and vprev[idx-1] < vprev[idx+1])`: Python short-circuit: if k==-d, skip the second. When k==-d, we read vprev[idx+1] = v_{d-1}[-d+1+off] — within slice [off-(d-1), off+(d-1)]? -d+1 = -(d-1). ✓. When k==d: else branch reads vprev[idx-1] = d-1+off ✓. When -d<k<d: reads idx-1 and idx+1, both within [off-(d-1), off+(d-1)] since |k|≤d-1. ✓. And prev_x = vprev[k±1+off] similarly in range. So storing slice v[off-(d-1) : off+(d-1)+1]... wait, at step d, trace[d] should be v_{d-1}, whose valid range is |k| ≤ d-1: slice v[off-d+1 : off+d]. Store also base offset = off - d + 1... then index k+off maps to k+off - (off-d+1) = k + d - 1.

This complicates code; 32MB is fine, skip. Actually let me double check memory: trace = 2001 lists, each length 2*(n+m)+1 = 4001. 2001 × 4001 × 8 bytes ≈ 64MB. Hmm, for the 1000×1000 case: n+m=2000, size = 4001, snapshots = D+1 = 2001. 2001×4001×8 = 64MB. Plus each list object overhead ~56 bytes, negligible. 64MB is probably OK but a bit heavy. Could reduce by storing only used slices: at step d store slice of size 2d+1 (indices off-d..off+d of current v before processing? or after). Let me instead snapshot after processing step d, storing only v[off-d : off+d+1] (size 2d+1) — this is v_d restricted to valid range. Then total memory = sum_{d=0}^{D} (2d+1) ≈ D² ≈ 4M entries = 32MB. Similar. Meh.

Alternative: linear-space Myers (reverse recursive) avoids storing trace but is more complex. Given constraints, 64MB is acceptable. Actually wait — worst case for memory: 1000 vs 1000 completely different → 64MB. And 20000/50 case: D~100, size 40001, snapshots 101 → 101×40001×8 = 32MB. OK.

Hmm, but actually there's a subtle issue with the snapshot at top of loop: trace.append(v[:]) copies the full array including stale values — fine since we only read valid indices.

Actually, I realize I could reduce memory: only snapshot the needed range: `trace.append(v[off-d:off+d+1])`? No wait, at top of loop before processing step d, the valid data is from step d-1: indices |k| ≤ d-1. We will need, during backtrack of step d: indices k-1, k, k+1 for |k| ≤ d, i.e., |k| ≤ d+... we need indices from -(d-1)-1... as analyzed: k±1 with |k|≤d, guarded so actual reads within |k| ≤ d-1... except prev_x read: when k==-d, read v_{d-1}[k+1] = -(d-1) ✓; when k==d read v_{d-1}[k-1] ✓. So needed range at backtrack step d: |k| ≤ d-1 → slice v[off-d+1 : off+d]. But careful: also for d where... Let me store, at top of iteration d (before processing), the slice `v[off-(d-1) if d>0 else 0 : off+d]`... getting fiddly with d=0. Simpler: store full copy; 64MB is fine on modern systems. Actually hmm, let me reconsider: is it 64MB? 2001 snapshots... wait D=2000 means trace has 2001 entries (d=0..2000), each of size 2*2000+1 = 4001. 2001*4001 = 8,006,001 entries × 8 bytes = 64MB. Plus the list-of-int pointers point to int objects: ints up to 1000 — Python creates new int objects for these during arithmetic, but v[idx] = x stores a reference to one object; many slots share. Small ints ≤256 cached. Worst case extra: number of distinct int objects bounded by number of assignments ~ 8M? No — x values are computed per assignment; `x` after while loop is a fresh int object each time; storing it in v keeps it alive. So up to ~2M distinct int objects × 28 bytes = 56MB extra. Total ~120MB. Hmm, that's getting heavy but still usually fine. 

To be safer, use array('i') for v and snapshots: array slicing creates compact 4-byte storage, and ints get boxed temporarily only. But indexing array creates new int objects on read (slower in inner loop). Trade-off.

Alternative: reduce max_d memory by storing snapshots as slices. Let me just do the slice approach carefully — it's not that hard:

At the top of iteration d, the array v holds valid furthest-x for |k| ≤ d-1 (after step d-1), plus garbage elsewhere. I want to store for backtrack: v_{d-1}[k] for k in [-(d-1), d-1]. So:

```python
lo = max(0, off - (d - 1))
hi = min(size, off + d)  # off + (d-1) + 1 = off + d
trace.append((lo, v[lo:hi]))
```

For d=0: lo=off, hi=off+1 → stores v[off] (initial 0). Backtrack at step d uses trace[d] with base offset lo: index k+off-lo. Need bounds: for step d, reads at k±1, |k|≤d, guarded reads within |k| ≤ d-1 → k+off ∈ [off-d+1, off+d-1]. Slice [off-d+1, off+d) covers exactly that. ✓. d=0: slice [off, off+1) contains k=0. But backtrack never uses trace[0]... only if D... backtrack loop goes d=D..1, uses trace[1..D]. trace[1] = v_0[k] for |k|≤0: slice [off, off+1). At backtrack d=1, k = x-y: after the final step, (x,y)=(n,m), k = n-m. We read vprev at k+1 or k-1. k = n-m, |n-m| ≤ d-1 = 0? If D=1, then |n-m| ≤ 1. Reads within slice. OK general proof: during backtrack at step d, current (x,y) satisfies x = v_d[k] for k = x-y, |k| ≤ d, and we read v_{d-1}[k±1]: indices within [-(d-1), d-1] as shown. ✓.

Memory: sum_{d=0}^{D} 2d ≈ D²  = 4M entries × 8B = 32MB, plus shared int objects up to ~2M × 28 = 56MB... hmm still. Wait, number of assignments total = number of k-loop iterations ≈ 2M for the worst case; each stores reference to x's int object. These int objects stay alive. 2M × 28 bytes = 56MB. Total ~88MB. Hmm. With array('l') storage for v and snapshots as arrays: snapshots are compact (4 bytes each → 16MB total), and v as array — but reads from array box ints (allocating temporaries, but they're freed). Writes v[idx] = x unbox. Inner loop slightly slower due to boxing but memory tiny. The while-snake reads a[x] — a is a list, fine.

Hmm, but for the 20000/50 case, snake work matters; array boxing in snake loop... snake loop reads v? No, snake loop reads a and b lists and counters. Only v reads/writes are per-k, ~2M times worst case. Boxing cost ~50ns each. Fine.

Let me weigh: lists: faster, ~90MB worst. arrays: slower ~20%, ~20MB. I'll go with lists but let me reduce: actually can I avoid storing trace entirely for the common fast path? Not needed; just pick lists, 90MB is acceptable for a "under 6 seconds" test. Actually, hmm, let me reconsider the worst case more carefully: completely different 1000-line lists: D = 2000. k-loop iterations = Σ_{d=0}^{2000} (number of k with parity d in [-d,d]) = Σ (d+1) = 2001×2002/2 ≈ 2M. Each stores one int object reference, but many x values: x = v[...] + 1 creates new int. So ~2M live ints? They're referenced from snapshots → live. 2M × 28B = 56MB + snapshot lists 32MB = 88MB. Plus Python baseline. Probably fine, but to be safe I'll use array('i') for snapshots? Mixed complexity...

Alternative: store snapshot slices as tuples? Same pointer storage.

You know, let me just use plain lists and accept ~100MB. Actually, one more idea: store x as... no. Fine, lists.

Hmm, actually let me reconsider: maybe use `sys.intern`? Irrelevant.

Let me now also double-check the k-loop condition semantics once more with the in-place array. At step d, processing k in increasing order. v[idx-1] corresponds to diagonal k-1: last updated at step d-1 (parity differs) → holds v_{d-1}[k-1]. But wait — at step d we process k values with parity of d; k-1 has parity d-1 and was last written at step d-1. ✓. v[idx+1]: parity d-1, last written at step d-1, except it may have never been written (|k+1| = d+1 > d-1 when k=d... guarded by k != d... when k = d-... k+1 range: for k < d, k+1 ≤ d, and k+1 has parity d-1? k has parity d, k+1 parity d-1 ✓, and |k+1| ≤ d, written at step d-1 iff |k+1| ≤ d-1, i.e., k ≤ d-2. For k = d... excluded by guard. For k = d-1? k has parity d; k=d-1 has different parity, not processed. So k ≤ d-2 when k<d and k+1 could be d-1 → |k+1| = d-1 ✓ written at step d-1. For k = -d: guarded, but note we don't read idx-1 due to short-circuit... wait condition: `if k == -d or (k != d and v[idx-1] < v[idx+1]): x = v[idx+1] else: x = v[idx-1]+1`. When k == -d: x = v[idx+1] = v_{d-1}[-d+1] ✓ valid. When k == d: else branch: x = v[idx-1] + 1 = v_{d-1}[d-1] + 1 ✓. When -d < k < d: compare v_{d-1}[k-1] vs v_{d-1}[k+1]: choose path giving larger x: from k+1: x = v_{d-1}[k+1]; from k-1: x = v_{d-1}[k-1]+1. Condition picks from k+1 when v[idx-1] < v[idx+1], i.e., v_{d-1}[k-1] < v_{d-1}[k+1]. But correct choice: from k-1 gives x = v[k-1]+1 which is ≥ v[k-1]. So from k-1 is better when v[k-1]+1 ≥ v[k+1], i.e., v[k-1] ≥ v[k+1]-1, i.e., v[k-1] > v[k+1]-1. The condition chooses from k+1 when v[k-1] < v[k+1]. These differ at v[k-1] == v[k+1]-1... then v[k-1] < v[k+1] → chooses from k+1: x = v[k+1] = v[k-1]+1. Same value! Tie → same x, different predecessor (down vs right). Fine either way; both valid. ✓.

But subtle: when choosing from k+1 at tie, x = v[k+1] might be less than v[k-1]+1? v[k-1] < v[k+1] ⇒ v[k-1]+1 ≤ v[k+1]. ✓ max preserved.

Termination check placement: after inner loop of step d, check `if v[off + n - m] == n`... but need k = n-m to have been processed at this step: |n-m| ≤ d and parity match — parity of n-m vs d: the greedy theorem guarantees solution found when d ≡ n+m (mod 2)... k = n-m has parity (n-m) mod 2 ≡ (n+m) mod 2. The k-loop at step d processes parity-d indices. If d ≢ n+m mod 2, index off+n-m not updated this step; check would use stale value — could stale value equal n? v_{d'}[n-m] for d' < d... if it equaled n earlier we'd have terminated. So stale check harmless but let's only check when (n-m+d) % 2 == 0? Simpler: check anyway: `if v[off + n - m] >= n` — hmm, could stale value be ≥ n without being a true path? Values only written as valid furthest points, so if v[k] == n for k=n-m at some step, then y = n - k = m and it's a valid full path — from an earlier step d', meaning we should have terminated at d'. So checking every step is safe. Use `if v[off + n - m] == n: D = d; break`. Hmm, actually could v[off+n-m] exceed n? x can't exceed n... x = min over... x can be at most n since snake stops at n. And paths can't overshoot n? x = prev + 1 could exceed n? prev ≤ n, +1 ≤ n+1? If prev = n on diagonal k-1, then moving right gives x = n+1 > n — invalid? Can v_{d-1}[k-1] = n with k-1 ≠ n-m? Then y = n - (k-1) = m + 1 > m — impossible since y ≤ m always (snake stops). y = x - k ≤ m requires x ≤ m + k... Paths: x ≤ n always? From down move x unchanged ≤ n; from right x = prev_x + 1 where prev_x ≤ n; could prev_x = n? On diagonal k-1, x = n means y = n - k + 1 = m+1 > m — impossible. So x ≤ n always. Use == n check. ✓.

Wait, one more: x could exceed n via right move when prev_x = n? Shown impossible. ✓. Similarly y ≤ m.

Now handle the stripped prefix/suffix and reassembly. Plan:

```python
def diff_lines(a, b):
    n, m = len(a), len(b)
    # common prefix
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    # common suffix
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]:
        s += 1
    ta = a[p:n-s]
    tb = b[p:m-s]
    nn, mm = len(ta), len(tb)
    out = []
    out.extend(('=', x) for x in a[:p])
    # middle
    if nn == 0:
        out.extend(('+', x) for x in tb)
    elif mm == 0:
        out.extend(('-', x) for x in ta)
    else:
        mid = _myers(ta, tb)
        out.extend(mid)
    out.extend(('=', x) for x in a[n-s:])
    return out
```

Wait, suffix stripping condition: careful with overlap when prefix and suffix consume everything: if a == b, p = n = m, then s loop: s < n-p = 0 → s=0, ta/tb empty → out = all "=" from a[:p]. ✓. If a is prefix of b: p = n, tb = b[n:...]: s loop: s < n - p = 0 → s = 0. tb = b[p:m] nonempty → all "+". ✓ Correct.

Edge: ta empty and tb empty (a==b): handled by nn==0 → extend '+' over empty tb → nothing. ✓.

Myers function:

```python
def _myers(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    off = max_d  # wait, off must be ≥ max |k| + 1? k ranges -max_d..max_d; size = 2*max_d+1, off = max_d works: idx = k + max_d ∈ [0, 2*max_d].
```

Hmm, indices: idx-1 could be -1 when k = -max_d and idx-1 = -1 → v[-1] in Python wraps to last element! But k=-max_d only reached at d=max_d with guard k==-d short-circuiting before reading idx-1? Condition: `if k == -d or (...)`. At k=-d, short-circuit → no read of v[idx-1]. But what about reads at k=-d+1? idx-1 = -d+off... fine. Also x = v[idx+1]: idx+1 could be size when k = max_d? k=d=max_d, then k==-d only if d=0; condition `k != d` false → else branch reads idx-1. ✓. And v[idx+1] read when k+1 ≤ d... covered. So no wraparound reads. But writes: idx = k+off ∈ [0, 2*max_d] ✓.

However max_d = n+m means size = 2(n+m)+1 ≈ 4001 for 1000×1000; but D ≤ n+m and also D parity... fine. Actually we can bound better: D ≤ n+m, but also the check `v[off+n-m] == n` will trigger by d = n+m at latest. At d = n+m, k = n-m is processed only if... d = n+m, parity d ≡ n+m ✓, |n-m| ≤ n+m ✓. Will it be found earlier or at d=n+m? Theorem guarantees by then. ✓.

But wait: is it guaranteed the loop finds it by d = n+m? Upper bound on D: the edit distance ≤ n+m (all deletions + insertions... a path: delete all n, insert all m: D = n+m). Yes, so termination by d = n+m. But careful: the greedy finds minimal D; minimal D ≤ n+m. ✓.

Inner:

```python
size = 2 * max_d + 1
v = [0] * size
trace = []
D = None
for d in range(max_d + 1):
    lo = off - d + 1 if d > 0 else off
    hi = off + d if d > 0 else off + 1
    trace.append((lo, v[lo:hi]))
    for k in range(-d, d + 1, 2):
        idx = k + off
        if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
            x = v[idx + 1]
        else:
            x = v[idx - 1] + 1
        y = x - k
        while x < n and y < m and a[x] == b[y]:
            x += 1
            y += 1
        v[idx] = x
    if v[off + n - m] == n:
        D = d
        break
```

Hmm wait, trace slice for d: at top of iteration d, valid data is v_{d-1}: indices |k| ≤ d-1. Slice [off-(d-1), off+(d-1)+1) = [off-d+1, off+d). For d=0: [off, off+1). So hi = off+d for d>0 and off+1 for d=0 — note off+0 = off, wrong; so the conditional. Alternatively hi = max(off+d, off+1) → for d=0 gives off+1 ✓; for d≥1, off+d ≥ off+1 ✓. So `hi = off + d if d else off + 1`. And lo = off - d + 1 for d ≥ 1; for d=0, lo = off. `lo = off + 1 - d if d else off`. Hmm for d=1: lo = off, hi = off+1 → slice [v[off]] = v_0[0] ✓.

Actually wait, do I even need trace[0]? Backtrack uses trace[1..D]. trace[1] = v_0 slice [off, off+1) = [x after step-0 snake]. Hmm — v_0[0] after step 0 includes the snake. Backtrack at d=1: reads vprev[k±1]. k = x - y = n-m... at backtrack start, (x,y) = (n,m) is the endpoint at step D on diagonal k_D = n-m, x = n... wait, is the endpoint necessarily v_D[n-m] = n with the full snake already included? v_d[k] is defined as furthest x after snake. The endpoint (n, m): snake included. Backtrack at step d: current point is "after step d" = arrival point after snake at step d on diagonal k = x-y. Reads v_{d-1}[k±1] — the furthest points after step d-1 snakes. ✓ consistent with my earlier branch math.

Hmm, but there's a subtlety: v_d[k] = furthest point after snake, but the point reached at step d on diagonal k before the snake (after the single move) may be less than v_d[k]... In backtrack, current (x,y) = v_d[k] (post-snake). Predecessor on diagonal k+1: post-snake point v_{d-1}[k+1], then down move, then snake from there to (x,y). The snake from (v_{d-1}[k+1], v_{d-1}[k+1]-k) — wait after down move the point is (prev_x, prev_x - k) on diagonal k, and the snake continues to (x, y) with all matches. Is it guaranteed that the segment a[prev_x..x-1] == b[prev_y+1..y-1] holds elementwise? Yes, because the forward algorithm's snake advanced exactly through matching elements, and v_d[k] was computed as that snake endpoint. But wait — v_d[k] is the furthest reach; the actual snake executed in forward pass from the chosen predecessor. When multiple predecessors could reach the same v_d[k]... we replicate the same choice rule (same condition, same v values), so we recover the exact same predecessor. ✓ Because forward used v_{d-1} values (stored in trace) and condition; backtrack re-evaluates same condition with same data. ✓.

One more check on the forward condition tie-handling vs backtrack: identical expression → same branch. ✓.

Backtrack:

```python
    # after loop: D found
    moves = []
    x, y = n, m
    for d in range(D, 0, -1):
        lo, vs = trace[d]
        k = x - y
        idx = k + off - lo
        if k == -d or (k != d and vs[idx - 1] < vs[idx + 1]):
            prev_x = vs[idx + 1]
            py = prev_x - (k + 1)
            i = x - 1
            j = y - 1
            while i >= prev_x:
                moves.append(('=', a[i]))
                i -= 1
                j -= 1
            moves.append(('+', b[py]))
            x, y = prev_x, py
        else:
            prev_x = vs[idx - 1]
            py = prev_x - (k - 1)
            i = x - 1
            j = y - 1
            while i > prev_x:
                moves.append(('=', a[i]))
                i -= 1
                j -= 1
            moves.append(('-', a[prev_x]))
            x, y = prev_x, py
    # remaining: d=0 snake from (0,0) to (x,y)
    while x > 0 and y > 0:
        moves.append(('=', a[x - 1]))
        x -= 1
        y -= 1
    moves.reverse()
    return moves
```

Wait — in insertion branch: snake covers i from x-1 down to prev_x inclusive: that's a[prev_x..x-1] paired with b[?]. j starts y-1; pairs (i, j) with i - j = k? Check: a[i] == b[j] with i - j = k... i=x-1, j=y-1: i-j = x-y = k ✓. Decrements keep i-j=k. Ends when i = prev_x-1... loop `while i >= prev_x` ends with i = prev_x - 1, j = py + 1 - 1 = py. Then ('+', b[py]): the inserted line is b[py] where py = prev_x - (k+1) — the y before down move. After down move y becomes py+1 = prev_x - k. Check: post-down-move point (prev_x, prev_x - k) on diagonal k ✓ (x - y = k ✓). Then snake to (x, y) ✓. And b[py]: py = prev_x - k - 1. Is py ≥ 0? prev_y on diagonal k+1: y = prev_x - (k+1) ≥ 0 ✓.

Deletion branch: snake from (prev_x+1, py) to (x, y): pairs (i, j), i from x-1 down to prev_x+1, j = y-1 down; i-j = k ✓. Then ('-', a[prev_x]): deleted line a[prev_x]; after right move point (prev_x+1, py) on diagonal k ✓. py = prev_x - (k-1) = prev_x - k + 1 ≥ 0? y on diagonal k-1: prev_x - (k-1) ≥ 0 ✓.

Remaining d=0: (x, y) should be post-step-0-snake... wait no: after processing d=1, (x,y) = predecessor point on step 0 = v_0[k'] post-snake where k' = x-y. Then remaining a[0..x-1] vs b[0..y-1] along diagonal: but the step-0 snake already covered from (0,0) to (x,y): those are the remaining "=" pairs. My final while loop emits ('=', a[i]) for i = x-1..0 paired j = y-1..0, requiring a[i]==b[j] — true since it's the d=0 snake... but only if the loop condition x>0 and y>0 with a[x-1]==b[y-1]. Since prefix stripped, if both ta,tb nonempty then a[0] != b[0], so the d=0 snake has length 0 → x=y=0 at this point. So the final while is a no-op normally; kept for safety. But if x>0 and y==0 leftover (shouldn't happen), we'd lose deletions. Could add safety: also handle x>0 xor y>0 with '-'/'+'? For robustness:

```python
while x > 0 or y > 0:
    if x > 0 and (y == 0 or ...):
```

Hmm, but leftover at d=0 can only be snake (both >0, equal lines) — deletions/insertions at d=0 impossible. Actually wait: could (x, y) after d=1 processing be a point NOT on the d=0 snake path? The predecessor at step 0 is exactly v_0[k'] which is the snake endpoint from (0,0). So remaining is pure matches. But what if D path... at step 0, diagonal 0, v_0[0] = snake length. So (x,y) = (s0, s0) with a[0..s0-1]==b[0..s0-1]. With prefix stripped and both nonempty, s0 = 0. Fine. I'll keep just the '=' while loop; but to be fully safe add also handling... it's provably unnecessary. Keep simple: also note if x>0 and y>0 but a[x-1] != b[y-1] — can't happen. I'll just emit '=' trusting.

Hmm wait, actually one more subtlety: is it possible that the backtrack's final point after d=1 is not v_0[k'] but rather... yes it is by construction. OK.

Now also D == 0 case: ta == tb (both nonempty, no differences — but we stripped prefix and suffix, so if ta==tb nonempty, then a[0]==b[0] would have been stripped... unless stripping overlapped? If a==b, both fully stripped, ta empty. If ta == tb nonempty: then first elements equal → prefix strip would have taken them... unless suffix strip interfered: e.g., a = [x, y], b = [x, y]... p=2, all stripped. Example: a=[x], b=[x]: p=1, s: s < n-p=0 → s=0. ta empty. Hmm, can ta==tb nonempty? ta = a[p:n-s], tb = b[p:m-s]; if a==b then p=n, ta empty. If a≠b, first mismatch at some point ≤ p... p is first mismatch index, so ta[0] != tb[0]. So ta==tb nonempty impossible. But D=0 with nn==mm>0 impossible; still, handle D==0 generically: moves empty, return [("=", line) for line in ta]. Actually if D=0, the backtrack loop doesn't run, moves empty, final while: x=n, y=m>0 → emits n "=" — correct! Actually final while handles D=0 fully (all snake). But wait, D=0 requires n==m and a==b, and the final while emits ("=", a[i]) for i=n-1..0 — but is a[i] == b[j] guaranteed? Yes since a==b. But as argued, post-strip this can't happen except empty. Fine, keep.

Now verify the forward check `if v[off + n - m] == n` — but n-m index: off + n - m; with off = max_d = n+m: index = 2n... within [0, 2*max_d] ✓.

Edge: what if n>0, m>0 but the check triggers at some d where k=n-m wasn't updated this step (parity mismatch) with stale value == n? As argued, stale == n implies it was a valid completion at earlier step → would have broken then. Actually careful: could v[off+n-m] == n be written at step d' < d but check failed at d'? Check happens every step after inner loop, so it'd have broken at d'. ✓.

Hmm, one thing: the check at d where parity mismatches uses value from step d-1 — but it was checked at d-1 already and was ≠ n. So fine.

Now performance of the snake while loop comparing strings: `a[x] == b[y]`. For the 20000/50 case: after stripping, ta/tb are small (~100 lines each?) Actually "differ in about 50 places" → the middle regions ~50-100 lines. D small. Trivial.

But wait — the stripping loops themselves: 20000+20000 comparisons, fast.

The 1000/1000 different case: main loop ~2M iterations. Let me estimate more carefully: each iteration does: range step, idx calc, condition (mostly k != d and two list index + compare), assignment of x, y = x - k, while check (x < n and y < m and a[x]==b[y] — two comparisons + string compare), v[idx] = x. Maybe ~8-10 bytecode-heavy ops → ~0.5µs → 1s. Plus snapshot slices: 2000 slices avg length ~2000 → 4M element copies at C speed ~ 50ms. Plus backtrack 2000 iterations with inner snake loops (snake total bounded: each backtrack step's snake ≤ ... total snake in backtrack = number of "=" items = LCS length ≤ 1000, plus moves 2000). Fine.

Hmm wait, there's an issue: the trace slices: at step d, slice length = hi - lo = (off+d) - (off-d+1) = 2d - 1. Sum over d=1..2000 of (2d-1) ≈ 4M elements. 32MB of pointers + int objects... as computed. int objects: each v[idx] = x stores ref; x from `v[idx-1] + 1` creates new int (28 bytes) or from v[idx+1] (shared). ~ half the iterations create new ints → ~1M ints × 28B = 28MB. Plus slices 32MB. ~60MB total. OK.

Alternatively use array('i') for v and store raw slices... let me just also consider: is list-of-int snapshot with `v[lo:hi]` copying — yes.

Micro-optimization of the inner loop: hoist a, b, n, m locals (function params already local ✓). Use local variable for v. The `for k in range(-d, d+1, 2)` fine.

One more optimization: avoid function call overhead of string comparison `a[x] == b[y]` — it's fine.

Potential improvement: since we stripped prefix/suffix, in the completely-different case D = n+m and the k-loop range(-d, d+1, 2) for d near max_d... at d = max_d = n+m = 2000, but solution found at d = 2000. Fine.

Hmm, wait: actually for completely different lists, does it terminate at d = 2000 exactly? D = n + m = 2000 (delete all, insert all). At d=2000, k = n - m = 0, parity even ✓ (2000 even). Check v[off+0] == n=1000: on diagonal 0 at step 2000... The path: all deletions then insertions: reaches (n, m) at d = n+m on diagonal... path with n deletions and m insertions: each deletion changes k by +1 (right move: x+1, k = x-y increases), insertion k-1. Start k=0, after n deletions and m insertions k = n - m = 0 ✓. Yes found at d = 2000. But could it be found at d=1998 or less? Minimal D = n+m when LCS = 0? Edit distance = n + m - 2·LCS. LCS=0 → D = n+m. ✓.

Now, worst case time also includes: for d in range up to 2000, but the snake while loop for completely different lists: each k-iteration checks a[x]==b[y] once (fails). ✓.

Let me now also double-check the `k != d` guard vs `k < d`: condition `k == -d or (k != d and v[idx-1] < v[idx+1])`. For -d < k < d: uses comparison ✓. For k == d: else. ✓.

Also `if k == -d or (k != d and ...)` — when k == -d == d (d=0, k=0): condition `k == -d` True → x = v[idx+1] = v[off+1] = 0 (initial). ✓ (step 0: x=0, snake.) Good — but wait, v[off+1] never written; initial 0 ✓.

Backtrack d=1... trace[1] = slice [off, off+1) = [v_0[0]]. At d=1, k = x-y. (x,y) = (n, m). k = n - m. If D=1, then... D=1 means edit distance 1: e.g., n=1,m=1 different lines: k=0. Read vs[idx±1] where idx = 0 + off - lo; trace[1]: lo=off, so idx = 0. Reads vs[-1] and vs[1] — out of slice bounds! vs has length 1. vs[-1] wraps to vs[0] (wrong!) and vs[1] IndexError!

Problem: at backtrack step d, we read v_{d-1}[k-1] and v_{d-1}[k+1] where current k = x-y, and |k| ≤ d. My earlier analysis said reads are within |k| ≤ d-1 — let me recheck: current point (x,y) is the post-step-d endpoint on diagonal k = x-y. k ranges over [-d, d]. Reads at k±1: |k±1| ≤ d+1?? No: k±1 within [-d+1... ] hmm: k ∈ [-d, d], so k+1 ∈ [-d+1, d+1]. But k = d → k+1 = d+1: but when k == d, the condition takes else branch (no read of idx+1) ✓ and reads idx-1 = d-1 ✓. k = -d: reads idx+1 = -d+1 ✓ (short-circuit, no idx-1 read). For -d < k < d: reads both k-1, k+1 ∈ [-(d-1), d-1]... k-1 ≥ -d+1 ✓, k+1 ≤ d-1 ✓. So actual reads are within |k'| ≤ d-1 ✓. In the d=1, n=1, m=1 case: k = 0 (not ±1), reads vs[-1]?? k-1 = -1 → |k'| = 1 > d-1 = 0! Wait: -d < k < d means -1 < 0 < 1 ✓, so both branches... k=0, k-1 = -1, k+1 = 1. But my claim was reads within |k'| ≤ d-1 = 0 — contradiction! Let me recheck: k ∈ (-d, d) exclusive, k-1 > -d - 1... k > -d ⇒ k - 1 > -d - 1, and parity: k has parity d, k-1 has parity d-1, |k-1| ≤ d-1? k < d ⇒ k ≤ d - 2 (parity!) ⇒ k - 1 ≤ d - 3?? Hmm: k and d same parity, k < d ⇒ k ≤ d-2. Then k+1 ≤ d-1 ✓ and k > -d ⇒ k ≥ -d+2 (parity) ⇒ k-1 ≥ -d+1 = -(d-1) ✓. But in the d=1 example: d=1, k=0: parity of 0 is even, parity of d=1 is odd — k must have parity d! k = x - y = 0, d = 1: but the endpoint at step d=1 lies on a diagonal with parity 1! Contradiction: (x,y)=(1,1): x-y=0, but step-1 endpoints have x-y odd. So D=1 with n=m=1 is impossible: if a=[x], b=[y], x≠y: edit distance: replace = delete+insert = 2. Right — Myers edit distance counts insertions+deletions; a "change" is 2 ops. So D=1 implies |n-m|=1 basically (one insertion or one deletion... D=1: one op). If D=1 via one insertion: m = n+1, k = n - m = -1 = -d ✓ short-circuit, reads idx+1 = k+1 = 0 ✓ within slice (trace[1] = v_0[0] ✓). If D=1 via deletion: k = +1 = d, else-branch reads idx-1 = 0 ✓.

General: at backtrack step d, current k ≡ d (mod 2). If k = -d: reads k+1 ✓. If k = d: reads k-1 ✓. Else k ∈ [-d+2, d-2], k±1 ∈ [-(d-1), d-1] ✓. 

But wait — k = x - y where (x,y) = current endpoint: is k ≡ d (mod 2) always? Endpoint reached at step d: yes, diagonal parity. But hold on: (x, y) = (n, m) initially, k = n - m, and D ≡ n + m... n - m ≡ n + m (mod 2) ✓. And as we backtrack, each step maintains parity. ✓.

And slice bounds: trace[d] slice = v_{d-1}[k' for |k'| ≤ d-1] = indices [off-(d-1), off+d). Backtrack reads index k'+off with |k'| ≤ d-1 → slice index k'+off - lo where lo = off-(d-1) → k' + d - 1 ∈ [0, 2d-2] ✓ within slice length 2d-1 ✓. For d=1: slice length 1, index 0 ✓.

Also need trace list to have entries up to D: trace[d] appended at top of iteration d for d = 0..D (loop breaks at d=D after appending at top). ✓ trace has D+1 entries, we use 1..D. ✓.

Now, also the forward read `v[idx+1]` when k = -d: idx+1 = -d + off + 1; for d = max_d... -d+off = off - d ≥ 0 since d ≤ max_d = off ✓. idx+1 = off-d+1 ≥ 1 ✓. And writes v[idx] for |k| ≤ d ≤ max_d → idx ∈ [0, 2*off] ✓.

Edge case: d = max_d and k = d = n+m: else branch reads v[idx-1] = v_{d-1}[n+m-1]: was it written at step d-1? |k'| = n+m-1 ≤ d-1 ✓ parity: k' = n+m-1 ≡ d-1 ✓. OK.

Also idx - 1 wraparound: idx-1 ≥ 0 needed when read: read when k > -d ⇒ idx ≥ off-d+1 ≥ 1 ✓ (off ≥ d). ✓.

Now assemble everything. Also handle the case where the check `v[off+n-m] == n` — with n=0? We only call _myers with nn>0 and mm>0. ✓.

Let me also double check the insertion-branch backtrack snake condition once more with a tiny example. a = ["x"], b = ["y"]. Strip: p=0 (a[0]!=b[0]), s: a[n-1-s]=a[0]="x" vs b[0]="y" differ → s=0. ta=["x"], tb=["y"]. Myers: n=m=1, max_d=2. Step d=0: k=0: cond: k==0==-0 ✓ → x = v[off+1]=0, y=0, snake: a[0]=="x" vs b[0]=="y" no → v[off]=0. Check v[off + 0] == 1? 0 ≠ 1. Step d=1: trace[1] = slice [off, off+1) = [0]. k=-1: cond k==-d ✓ → x = v[off] = 0 (hmm, v[idx+1] where idx = -1+off = off-1; v[off-1+1] = v[off] = 0 ✓). y = 0 - (-1) = 1. snake: x<1, y<1? y=1 not <1 → stop. v[off-1] = 0. k=1: else: x = v[off-1+1]+1 = v[off]+1 = 1. y = 1-1 = 0. snake: x<1? no. v[off+1] = 1. Check v[off + 0] = v[off] = 0 ≠ 1. Step d=2: trace[2] = slice [off-1, off+2) = [v_{1}[-1], v_1[0], v_1[1]] = [0, 0, 1]. k=-2: x = v[off-1] = 0, y=2, snake no. v[off-2]=0. k=0: cond: k != -d, k != d: v[off-1] < v[off+1]? 0 < 1 ✓ → x = v[off+1] = 1, y = 1. snake: x<1? no. v[off] = 1. Check v[off+0] == 1 ✓ → D=2.

Backtrack: x=1, y=1. d=2: lo=off-1, vs=[0,0,1]. k=0, idx = 0+off-(off-1) = 1. cond: k != -2; k != 2 ✓ and vs[0] < vs[2]: 0 < 1 ✓ → insertion branch: prev_x = vs[2] = 1. py = prev_x - (k+1) = 1 - 1 = 0. Snake: i = 0, j = 0; while i >= prev_x (0 >= 1? no). moves: ('+', b[0]) = ('+', "y"). x,y = 1, 0. d=1: lo=off, vs=[0]. k = 1-0 = 1, idx = 1+off-off = 1?? Slice length 1 — idx=1 out of bounds! Wait: k = x - y = 1, d = 1, k == d → else branch reads vs[idx-1] = vs[0] ✓. But idx computed as 1 then idx-1 = 0 ✓. OK no error. cond: k==-1? no; k != d? k==d → False → else: prev_x = vs[0] = 0. py = prev_x - (k-1) = 0 - 0 = 0. Snake: i = x-1 = 0; while i > prev_x (0 > 0 no). moves: ('-', a[0]) = ('-', "x"). x,y = 0, 0. Final while: no. moves reversed: [('-', "x"), ('+', "y")]. ✓ Correct.

Another test: a = ["1","2","3"], b = ["1","3"]. Strip prefix: p=1 ("1"=="1"), then a[1]="2" vs b[1]="3" stop. Suffix: a[2]="3" vs b[2]... m=2, b[m-1-s]: s=0: a[2]="3" vs b[1]="3" equal → s=1; next s=1: s < n-p=2 ✓, s < m-p=1? 1 < 1 no → s=1. ta = a[1:2] = ["2"], tb = b[1:1] = []. mm==0 → out: ("=","1"), ("-","2"), then suffix ("=","3"). Script: =1, -2, =3. ✓ a reconstructed: =1,-2,=3 → "1","2","3" ✓; b: =1,=3 ✓. LCS = 2 maximal ✓.

Test with repeat lines: a = ["a","b","a"], b = ["a","a"]. p: a[0]=="a"==b[0] → p=1; a[1]="b" vs b[1]="a" stop. s: a[2]="a" vs b[1]="a" → s=1; s=1: s < n-p = 2 ✓, s < m-p = 1? no → s=1. ta = ["b"], tb = []. → =a, -b, =a. ✓.

Myers with repeats: a = ["x","a","x"], b = ["a","x"]. p=0 (x vs a). s: a[2]="x" vs b[1]="x" → s=1; next: a[1]="a" vs b[0]="a" → s=2; s=2: s < n-p=3 ✓, s < m-p=2? no → s=2. ta=["x"], tb=["a"]... wait tb = b[0:m-s] = b[0:1] = ["a"], ta = a[0:1] = ["x"]. Then Myers: ["x"] vs ["a"] → -x, +a. Result: -x, +a, =a, =x. Check a: -x,=a,=x → "x","a","x" ✓. b: +a,=a,=x → "a","a","x" ✓. LCS: "=" count = 2 ("a","x") — LCS of ["x","a","x"] and ["a","x"] is ["a","x"] length 2 ✓. Is there a script with 2 "="? Yes this one. ✓. Hmm but is this minimal per the algorithm? D: computed on ta,tb after stripping. Fine.

But wait — does suffix stripping preserve maximality of "="? LCS is computed on stripped sequences; is LCS(a,b) = p + LCS(ta,tb) + s? Yes: standard result — greedy prefix/suffix matching is safe because... hmm, actually is it? Consider a = ["a","b"], b = ["b","a"]. Prefix: a[0]="a" vs b[0]="b" → p=0. Suffix: a[1]="b" vs b[1]="a" → s=0. Myers on whole. Fine. Another: a=["a","a"], b=["a"]: p=1; s: s < n-p=1 and s < m-p=0 → s=0. ta=["a"], tb=[] → =a, -a. ✓ LCS=1.

Tricky case where greedy suffix hurts? Known: for LCS, stripping common prefix and suffix is always safe? Consider a = [a, b], b = [b, a]... no common prefix/suffix. Consider a = [x, y, x], b = [x]: p=1, s: s<2 and s<0 → 0. ta=[y,x]... wait n-p=2, s: a[2]="x" vs b[0]="x": s< n-p=2 ✓, s < m-p = 0? no → s=0. ta = ["y","x"], tb = []. → =x, -y, -x. LCS = 1 ✓ (["x"]). Correct.

Is it a theorem that prefix+suffix stripping preserves LCS length? Yes: if a[0]==b[0], there's an optimal LCS starting with that match... Hmm, standard: if a[0]==b[0] then LCS(a,b) = a[0] + LCS(a[1:],b[1:]). This is a well-known LCS property. ✓ Similarly suffix. And they don't conflict because we re-check bounds. ✓ (Even simpler: the property holds recursively.)

Now, one more consideration: the spec says "The number of '=' items must be as large as possible (it equals the length of the longest common subsequence)". Myers gives LCS = (n + m - D)/2 "=" items. ✓ Minimal script.

Now let me also double-check the forward loop's snapshot logic once more. At top of iteration d we append slice of current v (which reflects steps 0..d-1). But at iteration d = D we append then compute and break — trace[D] = v_{D-1} ✓ used in backtrack ✓.

Also: what if D = 0 (ta == tb, both nonempty)? Impossible post-strip as argued, but code handles: backtrack loop skipped; final while emits all "=" (x=n,y=m, a[i]==b[i]) ✓.

What if the middle is such that D found but trace slices... fine.

Now, the `for d in range(max_d + 1)` — max_d = nn + mm. For 1000×1000, that's 2001 iterations max. ✓.

Potential speed-up: bound max_d by n+m but also we could use the "linear space" variant — not needed.

Let me reconsider worst-case timing for the 1000×1000 different case more concretely. Inner loop body cost: let's count operations:

```python
for k in range(-d, d + 1, 2):
    idx = k + off
    if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
        x = v[idx + 1]
    else:
        x = v[idx - 1] + 1
    y = x - k
    while x < n and y < m and a[x] == b[y]:
        ...
    v[idx] = x
```

~2M iterations × maybe 250-400ns = 0.5–0.8s in CPython 3.11 (which is fast). Plus check per d, slices. Total well under 6s. Plus 20000-case trivial. Good.

Actually hmm, one concern: `while x < n and y < m and a[x] == b[y]` — for the 20000/50 case the snakes... after stripping, ta/tb small. ✓.

Also the string comparisons: worst case identical long lines? Comparing equal strings is O(len). If lines are long (say 1000 chars) and lists are 1000×1000 identical... but then they'd be fully stripped. Middle region comparisons: lines in the middle could still be long equal lines in snakes — snake total work bounded by region size, fine.

Now, one more subtle correctness point: the check `if v[off + n - m] == n` should ideally also verify parity/range, but as argued stale values can't falsely trigger. But wait: can v[off+n-m] hold a value from step d-2 written... v[off+n-m] written at every step where |n-m| ≤ d' and parity matches. If written at d' < d with value n, check at d' would have triggered. Check runs every d after inner loop. But at step d', was |n-m| ≤ d'? If v[off+n-m] was written at step d', yes. So no false trigger. ✓

Hmm, also: could the algorithm need d > max_d? No, D ≤ n+m = max_d, found at d = D ≤ max_d. But range(max_d+1) includes d = max_d ✓. But at d = max_d, the k-loop: k from -max_d to max_d step 2; writes idx ∈ [0, 2*max_d] ✓; reads idx+1 up to... k = max_d → else branch (k != d false) → reads idx-1 only ✓. k = -max_d → short-circuit reads idx+1 = off-max_d+1 = 1 ✓. OK.

Now, is D's parity handled in check? At d where parity of d ≠ parity of n-m, v[off+n-m] is stale (from last time written). If D minimal, first trigger is at d = D with correct parity. ✓

Now, potential issue: the check placement inside loop after `if v[...] == n: D = d; break` — but the break must come after the k-loop; structure:

```python
for d in range(max_d + 1):
    trace.append(...)
    for k in ...:
        ...
    if v[off + n - m] == n:
        D = d
        break
```

Hmm — but this checks v after the full step d. The classic algorithm checks inside the loop per d after processing. ✓ same.

Wait, actually there's a subtle bug possibility: the check uses v[off + n - m] but at step d, diagonal n-m is processed only if |n-m| ≤ d and parity match. The value v[off+n-m] could be from step d-1 (if parity mismatch) — checked at d-1 already. ✓.

Now the backtrack: `for d in range(D, 0, -1)`. Inside, `lo, vs = trace[d]`. ✓.

Let me now also double check the insertion branch snake pairing once more with a concrete multi-snake example. Take a = ["1","2","4","5"], b = ["1","2","3","4","5"]? Strip prefix: p=2 (1,2 equal; a[2]="4" vs b[2]="3"). Suffix: a[3]="5" vs b[4]="5" → s=1; next: a[2]="4" vs b[3]="4" → s=2; next: s=2 < n-p=2? no → s=2. ta = a[2:2] = [], tb = b[2:3] = ["3"]. → +=1,=2, +3, =4,=5. ✓.

Better to test Myers path with snake after move: a = ["a","c"], b = ["b","c","a"]? Hmm LCS: "a" or "c" → 1. Let me trace mentally... too tedious; trust the algorithm, it's standard.

Let me instead mentally test a case exercising the deletion-branch snake: a = ["b","c"], b = ["a","b","c"]... wait that has insertion. a=["a","b","c"], b=["x","a","b","c"]: p=0 (a vs x), s=3 (c,b,a match; then s=3 < n-p=3? no) → s=3, ta=[], tb=["x"] → +x, =a,=b,=c ✓.

Case with snake in middle: a = ["1","3","5"], b = ["1","2","3","5"]: p=1, s: a[2]="5" vs b[3]="5" → s=1; next a[1]="3" vs b[2]="3" → s=2; next s=2 < n-p=2? no. ta = ["3","5"]?? wait ta = a[1:3-2] = a[1:1] = []. Hmm both stripped. OK: a=["1","9","3","5"], b=["1","2","3","5"]: p=1, s: a[3]="5"==b[3] → s=1; a[2]="3"==b[2] → s=2; a[1]="9" vs b[1]="2" → stop, s=2. ta=["9"], tb=["2"] → =1, -9, +2, =3, =5 ✓ LCS=3 ✓.

A case where the middle Myers must snake: ta = ["a","b","a"], tb = ["b","a"]? (after strip somehow). Myers: n=3, m=2, max_d=5. d=0: k=0: x=0,y=0: a[0]="a" vs b[0]="b" no. v=... v[off]=0. check v[off+1]==3? index off+n-m = off+1: stale 0 ≠ 3. d=1: trace[1] = [off..off] = [0]. k=-1: x=v[off]=0, y=1: a[0]="a" vs b[1]="a" ✓ → x=1,y=2; y<m? y=2=m stop. v[off-1]=1. k=1: x=v[off]+1=1, y=0: a[1]="b" vs b[0]="b" ✓ → x=2,y=1: a[2]="a" vs b[1]="a" ✓ → x=3,y=2: x<3? no. v[off+1]=3. check v[off+1] == 3 ✓ → D=1. Backtrack: x=3,y=2. d=1: lo=off, vs=[0] (v_0[0]=0). k=3-2=1=d → else: prev_x = vs[idx-1]; idx = k+off-lo = 1+off-off = 1; vs[0] = 0 = prev_x. py = prev_x - (k-1) = 0. Snake: i=2, j=1: while i > prev_x (2>0): ('=', a[2]="a"); i=1,j=0: ('=', a[1]="b"); i=0 → stop. ('-', a[prev_x=0]="a"). x,y = 0,0. Final: nothing. moves reversed: [('-',"a"), ('=',"b"), ('=',"a")]. Script: -a, =b, =a. Check a: a? -a then =b,=a → "a","b","a" ✓. b: =b,=a → "b","a" ✓. "=" count 2 = LCS("a b a", "b a") = ["b","a"] length 2 ✓. 

Also note the forward found D=1 with the deletion branch covering the whole snake — good.

Now — hmm, wait. In forward step d=1, k=1: x = v[off] + 1 = 1 — this came from diagonal 0 at step 0 (v_0[0] = 0, the post-snake point which is just (0,0) since no match). ✓.

Everything checks out. Now, write the final code with the helper. Also, I should consider whether to include the trace-slice optimization or just full copies. Full copies: memory 2001 × 4001 × 8 ≈ 64MB + int objects. Slices: ~32MB + int objects. I'll implement the slice version as designed (it's already reasoned). Actually, let me simplify: instead of storing (lo, slice) tuples, note lo = off - d + 1... depends on d which backtrack knows. Store just the slice and compute lo = off - d + 1 for d ≥ 1; for d = 0, lo = off — but trace[0] never used in backtrack. However I must still append something at d=0 to keep indices aligned. So: `trace.append(v[off - d + 1 if d > 0 else off: off + d if d > 0 else off + 1])` — clunky. Cleaner: always slice `v[off - d + 1 : off + d + 1]`? For d ≥ 1: covers |k| ≤ d, includes k=d (value stale/0, unused) — length 2d+1... hi = off+d+1 ≤ size = 2*off+1 requires d ≤ off ✓. For d = 0: slice [off : off+1] ✓ length 1. So uniform: `trace.append(v[off - d + 1 : off + d + 1])` — wait for d ≥ 1, lo = off-d+1, but does it matter that index k=d in the slice is stale? Backtrack at step d reads only |k'| ≤ d-1 relative to v_{d-1}... hold on — trace[d] stores state before step d = v_{d-1}, but the slice [off-d+1, off+d+1) covers k' ∈ [-(d-1), d]. k'=d entry is stale (never written at step d-1 since |k|≤d-1 there... could have been written at earlier step? |k'|=d requires step ≥ d. Never written → 0). Unused anyway. ✓. And slice index for k': k' + off - (off - d + 1) = k' + d - 1, valid for k' ∈ [-(d-1), d] → [0, 2d-1], slice length = (off+d+1)-(off-d+1) = 2d. Hmm length 2d, indices 0..2d-1; k'=d maps to 2d-1 ✓. For d=0: length 1, index k'+off-off = 0 for k'=0 ✓ (though unused).

So:

```python
trace.append(v[off - d + 1 : off + d + 1])
```

Wait for d=0: off - 1 + 1 = off, hi = off+1 → [v[off]] ✓. For d ≥ 1 uniform ✓. But careful for d = max_d = off: lo = 1 ≥ 0 ✓, hi = 2*off+1 = size ✓.

Memory: slice length 2d... for d=0: 1; sum ≈ D². Fine.

Backtrack: `vs = trace[d]; base = off - d + 1` (for d ≥ 1 ✓). idx = k + off - base = k + d - 1.

Let me rewrite backtrack:

```python
x, y = n, m
for d in range(D, 0, -1):
    vs = trace[d]
    k = x - y
    i1 = k + d - 1  # index of k in vs... wait
```

idx = (k + off) - (off - d + 1) = k + d - 1. So:

```python
    if k == -d or (k != d and vs[k + d - 2] < vs[k + d]):
        prev_x = vs[k + d]
        ...
    else:
        prev_x = vs[k + d - 2]
```

Check bounds: k ≡ d (mod 2), |k| ≤ d. k+d even. k=-d → k+d=0 → vs[0] ✓ (short-circuit avoids vs[k+d-2] = vs[-2] which would wrap!). k=d → k+d = 2d, vs[2d] valid (length 2d → indices 0..2d-1)... wait length: hi - lo = (off+d+1) - (off-d+1) = 2d. Indices 0..2d-1. vs[k+d] with k=d → vs[2d] — out of bounds! But when k=d, condition: k != d is False → else branch reads vs[k+d-2] = vs[2d-2] ✓. Short-circuit: `if k == -d or (k != d and vs[k+d-2] < vs[k+d])`. When k==d: first test False, second: k != d False → whole False → else ✓, no read of vs[2d]. ✓. When -d<k<d: k+d-2 ∈ [?, 2d-3]... k ≥ -d+2 → k+d-2 ≥ 0 ✓; k ≤ d-2 → k+d ≤ 2d-2 ✓. ✓. Insertion prev_x = vs[k+d]: k=-d → vs[0] ✓; else k ≤ d-2 → index ≤ 2d-2 ✓. Deletion prev_x = vs[k+d-2]: k=d → 2d-2 ✓; k ≥ -d+2 → ≥ 0 ✓. 

Now D=1 slice: trace[1] = v[off : off+2] → length 2, contains v_0[0] at index 0 and stale at 1. Backtrack d=1: k = ±1 (or 0? D=1, k ≡ 1 mod 2). k=1: else: prev_x = vs[1+1-2] = vs[0] ✓. k=-1: short-circuit: prev_x = vs[-1+1] = vs[0] ✓.

Great. Now the forward in-loop `off` usage: fine.

Now write the complete code:

```python
def diff_lines(a, b):
    n = len(a)
    m = len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    ta = a[p:n - s]
    tb = b[p:m - s]
    out = [('=', line) for line in a[:p]]
    if ta:
        if tb:
            out.extend(_myers(ta, tb))
        else:
            out.extend(('-', line) for line in ta)
    else:
        out.extend(('+', line) for line in tb)
    out.extend(('=', line) for line in a[n - s:])
    return out


def _myers(a, b):
    n = len(a)
    m = len(b)
    off = n + m
    size = 2 * off + 1
    v = [0] * size
    trace = []
    D = None
    for d in range(off + 1):
        trace.append(v[off - d + 1: off + d + 1])
        for k in range(-d, d + 1, 2):
            idx = k + off
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[idx] = x
        if v[off + n - m] == n:
            D = d
            break
    moves = []
    x, y = n, m
    for d in range(D, 0, -1):
        vs = trace[d]
        k = x - y
        if k == -d or (k != d and vs[k + d - 2] < vs[k + d]):
            prev_x = vs[k + d]
            py = prev_x - (k + 1)
            i = x - 1
            while i >= prev_x:
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('+', b[py]))
            x, y = prev_x, py
        else:
            prev_x = vs[k + d - 2]
            py = prev_x - (k - 1)
            i = x - 1
            while i > prev_x:
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('-', a[prev_x]))
            x, y = prev_x, py
    while x > 0 and y > 0:
        moves.append(('=', a[x - 1]))
        x -= 1
        y -= 1
    moves.reverse()
    return moves
```

Wait, in the backtrack insertion branch, when k == -d: vs[k+d] = vs[0] ✓. But also the condition's second part when -d<k<d reads vs[k+d] — need k+d ≤ 2d-2, i.e., k ≤ d-2 ✓ (parity). ✓.

But careful: when k == -d, the condition first test True → prev_x = vs[k+d] = vs[0]. But is v_{d-1}[-(d-1)] stored at vs[0]? trace[d] slice starts at off-(d-1)+... lo = off - d + 1 → k' = -(d-1) maps to index 0 ✓. vs[0] = v_{d-1}[-(d-1)] ✓. And k+d = 0 → we want v_{d-1}[k+1] = v_{d-1}[-d+1] = index 0 ✓. ✓.

Deletion branch when k = d: prev_x = vs[2d-2] = v_{d-1}[d-1]: index of k'=d-1: k'+d-1 = 2d-2 ✓.

Hmm wait, in the insertion branch I need to double check index for prev_x when -d<k<d: prev_x = vs[k+d] should equal v_{d-1}[k+1]: index of k+1 is (k+1)+d-1 = k+d ✓.

Deletion: prev_x = vs[k+d-2] = v_{d-1}[k-1]: index (k-1)+d-1 = k+d-2 ✓.

One more: D==0 case: trace[0] = v[off:off+1]; backtrack loop empty; final while emits matches. But wait — if D==0, then n==m and the whole stripped a==b; but post-strip a[0]≠b[0] unless empty... if both nonempty and equal, contradiction with stripping. So D==0 only if n==m==... can't be nonempty equal. Actually if nn>0 and mm>0, D ≥ 1. Fine, but the D==0 branch (loop empty) is safe anyway.

Hmm, one thing: what if D found but v[off+n-m] == n triggers at d=0? d=0: k=0 only; if n==m and a==b: v[off] = n → D=0. Handled ✓.

Also: what about `trace` growth: for the 20000/50 case: off = n+m ≈ small after strip (say 200). ✓.

Potential correctness worry: `if v[off + n - m] == n` — what if n - m = 0 and v[off] gets value n at d=0 via snake (a prefix of b equal...). Post-strip can't. But general: if a == b entirely (D=0), the moves final while emits all "=" ✓.

Now think about whether the forward loop could terminate with D=off+... range(off+1) covers d=0..off. D ≤ n+m = off ✓.

Now let me also think again about whether we should verify the two constraints (reconstruction) — trust the algorithm.

Performance detail: `trace.append(v[off - d + 1: off + d + 1])` — for the 20000/50 case: after strip, ta/tb ~ maybe 100 each → off ~ 200, size 401, D small → trivial. But wait — what if the 50 differences are spread such that after stripping, the middle is large? Strip removes only the outer common parts; differences in the middle at position ~10000 means prefix ~10000, suffix ~10000, middle ~small. ✓.

But there's a subtlety: what if the 50 differences include equal lines in the middle that aren't part of prefix/suffix — doesn't matter, Myers handles.

However — worst case for the 20000/50 requirement: what if lists differ in ~50 places but also the diff region is large because e.g., a has 50 extra lines inserted at the start? Then prefix=0, suffix large. Middle: n' = 20050? No: a = 50 inserted lines + 20000 common; b = 20000. Suffix: strip 20000 → ta = 50 lines, tb = empty. ✓ fast.

What if a = 10000 common + 50 diffs + 10000 common but the "diffs" are line modifications → middle ~100 lines. ✓.

OK. One more perf check: memory in the 20000/50 case: size = 2*(n'+m')+1 where n', m' are stripped middle sizes. If diff at position 10000: middle small ✓. But if the 50 diffs are spread with FIRST diff at line 5 and LAST at line 19995? Then prefix=5, suffix=5, middle ≈ 20000 lines each! D ≈ 100 (50 changes = 100 edits... each modification = 1 del + 1 ins → D ≈ 100). Then trace: D+1 ≈ 101 slices, each length 2d → sum ≈ 100²/... sum_{d=0}^{100} 2d ≈ 10100 entries. Tiny. But the k-loop: Σ_{d=0}^{100}(d+1) ≈ 5151 iterations, each with a snake while loop — snakes advance along diagonals; total snake work: bounded by (2D+1) × min(n,m)? Each diagonal k: furthest x increases monotonically; total advancement per diagonal ≤ n. So ≤ 201 × 20000 = 4M snake steps... realistically much less: snakes advance only through matching regions; the middle region is 20000 long with matches along diagonals. Hmm, actually this could be a real cost: for each of ~200 diagonals, the snake can advance up to ~20000 positions over the course of the algorithm? No wait — per diagonal, the furthest point only advances; total advance across all d for diagonal k ≤ length of diagonal ≈ 20000. Summed over 201 diagonals: ≤ 4M steps worst case. But actually, can the snake on diagonal k advance at many different d values? Yes: d=1 processes k, advances snake; d=2... but the advance is monotone per diagonal; each d visit advances from previous furthest. If matches are plentiful, worst case 4M string comparisons ≈ 1-2s. Hmm. But realistically: each diagonal's snake advances at most... let me think about actual Myers complexity: O((N+M)·D) total, that's the bound — 40000 × 100 = 4M. In Python, 4M iterations of the inner while with comparisons ~ 2s. Plus main loop small. Borderline but requirement is 2 seconds... "must be diffed in under 2 seconds". Hmm, worst case 4M snake steps might exceed 2s in pure Python.

Wait, but is the O((N+M)D) bound actually attainable in the snake work? Total snake work = Σ over (d,k) visited of snake length. Standard analysis: the total work is O((N+M)·D) — yes that's the stated complexity, and it comes exactly from snakes. Can it actually be hit? For each diagonal k, the snake positions visited across different d: the furthest point x_d[k] is non-decreasing in d, and snake from x_{d-1}-derived start... Total snake steps on diagonal k = final x reached ≈ length of diagonal k (the snake advances only through matches and never revisits). So total snake work = Σ_k (final furthest x on diagonal k) ≤ Σ_k min(n, ...) — that's Σ over the ≤ 2D+1 diagonals of the diagonal lengths. With D=100 and middle 20000: diagonals k=-100..100, each of length ~min(n,m) ≈ 20000 → 4M worst. When would every diagonal's snake advance the full length? If the middle consists of mostly-identical content (matches everywhere), the snakes glide. E.g., a = base with 50 modified lines, b = base — after stripping prefix/suffix around outermost diffs, middle = from first diff to last diff ≈ 20000 lines, mostly equal pairs. Diagonals k = -2j..2j for j = 1..50 (each modification contributes ±1 to k... each modified line = delete+insert, net k shift 0 per modification, but intermediate diagonals ±1, ±2...). Along diagonal 0 (k=0), the snake from (0,0) runs to near the end. Along diagonal 2 (one delete ahead), similar long snake. So yes, snakes total could be ≈ Σ over 2D+1 diagonals of ~20000 = 4M steps. 4M × ~100ns-150ns (while condition: 2 comparisons + list index + string compare) → ~0.6-1.2s in CPython 3.11. Hmm, string compare of equal short strings ~ 30-60ns (pointer compare fast if identical objects — often lines are shared objects or interned... if the 20000 common lines are the same objects in both lists, `a[x] == b[y]` first does pointer equality? CPython string == first checks identity? For str, `==` uses do_richcompare which has an identity shortcut for `is`... yes, unicode rich compare checks `if (left == right)` fast path? Actually for `==` on str, CPython checks pointer equality in unicode_compare_eq path... There is a fast path: `if (a == b)` in unicode_result... I believe `x == y` for str first does `x is y` check. Many diff scenarios share line objects (e.g., reading from same file lines could be different objects though). Unequal strings compare quickly if first char differs.

Anyway ~1-2s. Risky vs the 2s bound but likely OK given CPython 3.11 speed. Can I optimize the snake? Trick: use `is` first? `a[x] == b[y]` already fast-paths identity.

Alternative optimization: reduce snake work using the "only one diagonal matters" — no.

Alternative: use the linear-space algorithm? Same snake cost.

Alternative: convert lines to ints via a dict (id-based interning): map each line to an integer canonically. Then comparisons are int compares (faster than string compares for unequal strings with common prefixes, and avoids repeated hashing... we'd hash each line once: 40000 hashes, fine). Int comparison ~ faster. Mapping: `code = {}; ` per line: `c = code.get(line)` — hashing strings each once. Then a_int, b_int lists of ints. Snake compares ints — but equal ints: `a[x] == b[y]` on ints: CPython int comparison is fast (~40ns). Also, interning gives pointer-identity fast path? Small ints cached ≤256 only. Int compare without identity fast path is still fast.

Actually, better: intern to make comparisons identity-level: map each distinct line to a small int AND reuse the same int object so `is` works? List elements a[x], b[y] would be the same int object for equal lines → `a[x] is b[y]`... but `==` on ints doesn't have the `is` fast path... Actually long_richcompare... `==` on ints: if both are the same object... PyLong == doesn't do identity shortcut I think. But comparing equal small ints (if we assign codes 0..K, K = distinct lines; codes could exceed 256).

Hmm, let me instead pre-intern strings to canonical objects and compare with `is`... but `==` required semantics — equality of lines. Using `a[x] == b[y]` on the original strings: for the common case where equal lines are the same object (e.g., both lists built from the same file lines or literals?) not guaranteed.

Honest assessment: 4M snake iterations worst-case. Let me actually reduce the constant: the while loop condition `x < n and y < m and a[x] == b[y]` — 3 checks per iteration. Alternative: precompute nothing... 

Alternative approach to slash snake cost: since x and y advance together, compare via slices? No, snakes are incremental.

Alternative: the classic optimization — since after stripping, most of the middle matches, we could recursively strip INSIDE the diff? That changes the algorithm... Actually a cleaner known trick: in the middle region, recursively strip common prefix/suffix again? It's already done once; the middle after stripping has a[0]≠b[0] and a[-1]≠b[-1]. The long snakes through the middle are inherent to Myers on that region.

Hmm, but wait: is the 4M snake bound realistic? Diagonal k's snake advances only from the furthest point; total across diagonals = Σ_k (final furthest x on diagonal k). For diagonals to each advance ~20000, need long matches on each diagonal. With 50 scattered modifications in 20000 lines: between consecutive modifications there are ~400 equal lines. Diagonal k's snake gets blocked at each modification crossing? A snake on diagonal k stops where a[x]≠b[y]; modifications block snakes on most diagonals. Each modification point blocks snakes on ~? diagonals... Diagonal k passes through region between mods freely. So each diagonal advances through ~20000 - (blocks). Each modification blocks a given diagonal at most once? A modification at position i (a[i] ≠ b[i] roughly) blocks diagonal k at x ≈ i (where it crosses). So each diagonal advances ~20000 minus number of modification crossings ~ 20000-50 ≈ full. So yes, ~200 diagonal... wait no — does every diagonal's snake actually get extended to near the end? The furthest point on diagonal k at the end = some x_k. For k=0, ~20000. For k=2, similar. For all 2D+1≈200 diagonals? The D-path structure: at step d, diagonals |k|≤d are explored. Diagonal k=100 explored from d≥100... its furthest point builds up over steps 100..D≈100. Hmm, D ≈ 100 (50 modifications × 2). Diagonals range -100..100. Each explored diagonal's final furthest x could be ~20000. So total snake ≈ 200 × 20000/2? Not all diagonals reach the end: diagonal k=±100 only reachable at the very end. Diagonal k's furthest x relates to paths... For a diff of 50 modifications, D-paths with d edits: diagonal k = (#deletions - #insertions). Paths exploring diagonal k=100 use 100 more deletions than insertions — with only 50 deletions total available (50 mods), diagonal k=100 unreachable! Max |k| ≤ D and also k bounded by number of deletions available ≤ 50 → |k| ≤ 50... Actually k = x - y, x ≤ n, y ≤ m; to be on diagonal k you need x ≥ k deletions... The reachable diagonals at minimal D: |k| ≤ min(D, ...). With 50 modifications, paths use ≤ 50 deletions and ≤ 50 insertions (D=100), so |k| ≤ 50. Diagonals explored: k ∈ [-100, 100] at various d, but snakes advance substantially only on diagonals where matches exist... 

Total snake work: sum over d in 0..100, k in -d..d of snake advances. Snake on diagonal k at step d starts at x = furthest from step d-2 (same parity) and advances through matches until mismatch. Between modifications, ~400-line match runs. A snake advances through match runs until hitting a modification boundary. Each (d, k) visit advances at most to the next mismatch — bounded by the match-run structure. Total = Σ_k (number of distinct d values where diagonal k's snake advances) × run lengths... This is getting complicated; empirically, Myers on such inputs is fast: the total work is roughly O((N+M)·D) but with tiny constants for typical structured inputs; genuinely hitting 4M snake steps requires adversarial content. Let me estimate typical: for the described test (20000 lines, 50 diffs), typical Myers implementations in Python (e.g., implementations without any C) run this in well under a second. I've seen pure-Python Myers handle 10k-line files with small D in ~0.1-0.5s. I'll trust it, and add the int-mapping optimization to speed comparisons:

Optimization: intern lines to ints:

```python
seen = {}
def intern_seq(seq):
    out = []
    ap = out.append
    get = seen.get
    for line in seq:
        c = seen.get(line)
        if c is None:
            c = len(seen)
            seen[line] = c
        ap(c)
    return out
```

Hmm — but then comparisons are int comparisons; equal ints from different objects compare equal fast; unequal ints compare fast (~30-50ns). String compare of unequal strings with different first chars ~ similar. Equal strings (long snake runs): if the same object, `==` identity fast path (str does have identity fast-path in unicode_eq? `PyUnicode_Compare`... For `==` on str: unicode_richhighlight... In CPython, `str.__eq__` → unicode_richcompare: it checks `if (left == right)` — yes there's a pointer-identity fast path returning True). If different objects with equal content, compares char by char (slower for long lines). Ints: equal comparison always fast.

Cost/benefit: building int lists costs 40000 dict ops (~10ms). Snake comparisons become int comparisons. I think it's a modest win in snake-heavy cases and negligible overhead otherwise. But it also enables another optimization: dedupe... eh.

Hmm, but there's a subtlety: the returned script must contain the ORIGINAL lines. With int mapping, backtrack emits ('=', a[i]) — a is the original list; the Myers core can operate on ints while we keep original lists for output. Design: _myers(a, b) does: build ia, ib (int codes); run algorithm on ia, ib; backtrack emits from a, b. But snake `a[x] == b[y]` becomes `ia[x] == ib[y]` — and output uses a[i]. ✓.

Wait, but then in _myers the while loop: `while x < n and y < m and ia[x] == ib[y]`. ✓.

Actually, is int comparison meaningfully faster than str comparison here? For identical objects (common in these tests? e.g., test harness probably builds lists where common lines are the same string objects, e.g., `a = base; b = base with 50 changes` — then common lines are identical objects). Then str == via identity fast path ≈ 30ns, int == ≈ 30ns. No win. If different objects: str compare O(len) — could be slow for long lines. Int mapping wins there. Also for completely-different 1000-line lists: snake comparisons fail immediately; str != fast if first chars differ; ints similar. Main cost there is the k-loop anyway.

I'll include the int mapping — cheap insurance. Actually hmm, dict.get per line: 40000 × ~80ns = 3ms. Fine.

Actually, simpler and equally effective: use a dict mapping line→canonical int but via `try/except` or setdefault... `dict.get` with None check is fine. Or use `seen.setdefault(line, len(seen))` — evaluates len each time, fine, but setdefault creates the value eagerly... `len(seen)` evaluated always, fine. But setdefault hashes twice? Once. `c = seen.setdefault(line, len(seen))` — neat but creates new int each time (cheap). Eh, use the get/None pattern.

Wait, actually — is interning even needed? Let me reconsider: the problem statement's perf requirements: case 1 (20000 lines, 50 diffs) < 2s; case 2 (1000 vs 1000 fully different) < 6s. Case 2's cost dominated by k-loop (~2M iterations) — unaffected by string vs int. Case 1: dominated by snake work IF snakes are long. With int mapping, snake iteration: `x < n and y < m and ia[x] == ib[y]` + increments ≈ 150ns → 4M × 150ns = 0.6s ✓. Without mapping, if lines are long distinct-object strings, could be several times slower. Include the mapping.

Hmm, but the while loop for case 1: does it really approach 4M? As analyzed, could be up to ~2-4M. With mapping, safe.

Let me also micro-optimize the snake: localize ia, ib. Everything's already local in _myers.

Now, memory for case 1 worst (middle 20000+20000, D=100): size = 2*40000+1 = 80001; trace slices: 101 × ~200 avg → tiny. v list 80001 → fine.

Wait, off = n + m = 40000, size 80001, v = [0]*80001 — allocation fine. But trace slices for d small: v[off-d+1 : off+d+1] — small slices near the middle. ✓.

Hmm wait, there's an issue with slice bounds when d is large relative to off: d ≤ off, so off-d+1 ≥ 1 and off+d+1 ≤ 2*off+1 = size ✓.

Now think about the D=0 edge in trace slicing: d=0: v[off : off+1] ✓.

Let me also double-check `trace.append` happens before the k-loop mutates v — yes, snapshot of v_{d-1} ✓.

Let me now also consider: should the function validate inputs (non-str lines)? No, keep simple; lines are strings per signature.

Now, the final code. Also add a small guard: if not ta and not tb → middle empty. Handled: `if ta: ... else: extend '+' over tb` — if tb also empty, extends nothing ✓.

Let me write the final solution cleanly:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Strip common prefix.
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1

    # Strip common suffix.
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1

    result = [('=', line) for line in a[:p]]

    ta = a[p:n - s]
    tb = b[p:m - s]
    if ta:
        if tb:
            result.extend(_myers_script(ta, tb))
        else:
            result.extend(('-', line) for line in ta)
    else:
        result.extend(('+', line) for line in tb)

    result.extend(('=', line) for line in a[n - s:])
    return result


def _myers_script(a, b):
    # Myers' O((N+M)*D) algorithm on the (already prefix/suffix-stripped)
    # sequences a and b, both non-empty and with a[0] != b[0] (usually).
    n = len(a)
    m = len(b)

    # Intern lines as small integers for fast equality tests.
    codes = {}
    ia = []
    ib = []
    for seq, out in ((a, ia), (b, ib)):
        for line in seq:
            c = codes.get(line)
            if c is None:
                c = len(codes)
                codes[line] = c
            out.append(c)

    off = n + m
    v = [0] * (2 * off + 1)
    trace = []
    D = None
    for d in range(off + 1):
        trace.append(v[off - d + 1: off + d + 1])
        for k in range(-d, d + 1, 2):
            idx = k + off
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1
            y = x - k
            while x < n and y < m and ia[x] == ib[y]:
                x += 1
                y += 1
            v[idx] = x
        if v[off + n - m] == n:
            D = d
            break

    moves = []  # built backwards
    x, y = n, m
    for d in range(D, 0, -1):
        vs = trace[d]
        k = x - y
        if k == -d or (k != d and vs[k + d - 2] < vs[k + d]):
            # Arrived from diagonal k+1 with an insertion of b[...].
            prev_x = vs[k + d]
            py = prev_x - (k + 1)
            i = x - 1
            while i >= prev_x:
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('+', b[py]))
            x, y = prev_x, py
        else:
            # Arrived from diagonal k-1 with a deletion of a[...].
            prev_x = vs[k + d - 2]
            py = prev_x - (k - 1)
            i = x - 1
            while i > prev_x:
                moves.append(('=', a[i]))
                i -= 1
            moves.append(('-', a[prev_x]))
            x, y = prev_x, py
    while x > 0 and y > 0:
        moves.append(('=', a[x - 1]))
        x -= 1
        y -= 1
    moves.reverse()
    return moves
```

Wait — bug check in the backtrack insertion branch snake: pairs (i, j) with i from x-1 down to prev_x, and correspondingly j from y-1 down. I don't track j, just count: number of iterations = x - prev_x. And the pairs are (a[i], b[j]) with j = i - k... need a[i]==b[j] — guaranteed by snake. We emit ('=', a[i]) ✓. Count: i goes x-1 down to prev_x inclusive → x - prev_x iterations. Earlier derived snake steps = x - prev_x ✓.

Deletion branch: i from x-1 down to prev_x+1 → x - prev_x - 1 iterations ✓.

Now the final while: leftover snake at d=0. ✓.

Now verify D-parity/backtrack index edge: d=1, k could be... we showed fine.

One more potential issue: in the forward loop, the condition `v[idx - 1] < v[idx + 1]` — both are v_{d-1} values; but hold on: v[idx-1] corresponds to diagonal k-1, last written at step d-1 ONLY IF it was within range then: |k-1| ≤ d-1 ⟺ k ≥ -(d-1). We're in branch -d < k < d (k ≠ -d, k ≠ d, and k not... also k has parity d so k ≥ -d+2). k-1 ≥ -d+1 = -(d-1) ✓. v[idx+1]: k+1 ≤ d-1 ✓. ✓.

Now — hmm, wait, one more subtlety in the forward greedy: the standard algorithm also needs, at k == -d, that we come from k+1 — my condition gives x = v[idx+1] ✓; at k == d, come from k-1 ✓.

Also the termination check: `v[off + n - m]` — index within [0, 2*off]: off + n - m = 2n... n-m ∈ [-m, n], off + n - m ∈ [n, 2n+m]... within [0, 2(n+m)] ✓.

Now think again about whether D could be found but with x=n, y=m reached on diagonal n-m at step D — yes by construction of check.

Test the earlier examples through the actual code path (done two manually, ✓).

Let me trace the algorithm on a = ["a","b","c"], b = ["a","c"] fully through code (with int codes: a→0, b→1, c→2; ia=[0,1,2], ib=[0,2]). Strip: p=1, s: a[2]="c" vs b[1]="c" → s=1; s=1: s < n-p=2 ✓, s < m-p=1? no → s=1. ta = ["b"], tb = [] → result: =a, -b, =c ✓. Myers not even called. OK pick a case where Myers called with shared content: a = ["a","b","c","d"], b = ["a","c","d","e","f"]. p=1, s: a[3]="d" vs b[2]... b[m-1]=b[4]="f" vs a[3]="d" → no match → s=0? Wait suffix: a[n-1-s]=a[3]="d", b[m-1-s]=b[4]="f": differ → s=0. ta = ["b","c","d"], tb = ["c","d","e","f"]. Myers: n=3, m=4, codes: a:0,b:1,c:2,d:3; c:2,d:3,e:4,f:5. ia=[1,2,3], ib=[2,3,4,5]. off=7.

d=0: trace: v[8:9] = [0]. k=0: idx=7: k==-d → x=v[8]=0, y=0: ia[0]=1 vs ib[0]=2 ✗. v[7]=0. check v[7+3-4]=v[6] == 3? 0✗.
d=1: trace: v[7:9] = [0,0]. k=-1: idx=6: x=v[7]=0, y=1: ia[0]=1 vs ib[1]=3 ✗ → v[6]=0. k=1: idx=8: k==d → x=v[7]+1=1, y=0: ia[1]=2 vs ib[0]=2 ✓ → x=2,y=1: ia[2]=3 vs ib[1]=3 ✓ → x=3,y=2: x<3? no. v[8]=3. check v[6]==3? 0 ✗.
d=2: trace: v[6:9] = [0,0,3]. k=-2: idx=5: x=v[6]=0, y=2: ia[0]=1 vs ib[2]=4 ✗. v[5]=0. k=0: idx=7: -2<0<2: v[6] < v[8]? 0 < 3 ✓ → x=v[8]=3, y=3: x<3? no. v[7]=3. k=2: idx=9: k==d → x=v[8]+1=4?? v[8]=3 → x=4 > n=3! y = 4-2 = 2. while x<3? no. v[9]=4. 

Uh oh — x=4 > n=3! Earlier I argued x ≤ n always because "on diagonal k-1, x=n implies y=m+1 impossible". Let me recheck: k=2 at step d=2, prev on diagonal k-1=1 at step d-1: v_1[1] = 3 (set at d=1, x=3, y=2 on diagonal 1). x=3 on diagonal 1 means y = 2 = m? m=4, y=2 ≤ m fine. So prev_x = 3 = n is possible on diagonal 1 since y=2 < m=4. Then right move → x=4 > n=3. So x CAN exceed n! My earlier argument was wrong: x=n on diagonal k-1 implies y = n-(k-1); impossible only if that exceeds m, not in general. So x can reach n+... can x exceed n? x = prev_x + 1 ≤ n+1? prev_x ≤ n? On any diagonal, x ≤ ... could x grow unbounded? v[k] = x with y = x - k ≤ m required? In the snake, y only checked implicitly: y = x - k; the while checks y < m before comparing. After the move, y could exceed m? Let's see: point (x, y) recorded in v: y = x - k. If y > m, that point is invalid (b exhausted). Can that happen? At k=2: x=4, y=2 ≤ m=4 ✓ valid point but x > n. The check for termination: v[off + n - m] == n. Here diagonal k = n-m = -1. v[6] = 0 at d=2 — hmm wait, at d=2, k=-1 not processed (parity). Stale v[6]=0 ✗.

d=3: trace: v[5:10] = [0,0,3,3,4]. k=-3: x=v[6]=0, y=3: ia[0]=1 vs ib[3]=5 ✗. v[4]=0. k=-1: idx=6: v[5] < v[7]? 0 < 3 ✓ → x = v[7] = 3, y = 4