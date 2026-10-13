We need Myers' diff algorithm. Need to produce the edit script as list of tuples. Handle duplicates, minimal LCS length (max "=" items). Performance: 20000 lines differing in ~50 places — Myers forward algorithm with D small: O((N+M)*D) fine. Two completely different lists of 1000 lines: D = 2000, so (N+M)*D ≈ 2000*2000 = 4M — fine in Python? 4M operations in pure Python maybe ~2-4 seconds. Should be okay-ish. But need to also reconstruct the path.

Also need to hash lines to ints for fast comparison: map each unique line to an integer via a dict. Then compare ints.

Myers algorithm: forward variant keeping V array and trace of V arrays per D, then backtrack. Memory: trace of (2D+1) per step, D up to N+M. For 1000+1000 completely different, D=2000, trace total ~ sum over D of (2D+1) ~ 4M ints — memory heavy (~4M ints in lists ~ 32MB+ as Python ints in lists, fine actually ~ 300MB? No, list of ints: pointers 8 bytes each → 4M*8 = 32MB, fine).

Alternative: linear-space refinement (middle snake) to avoid memory. But simpler: standard Myers with trace. For D=2000, trace sizes sum = sum_{d=0}^{2000} (2d+1) ≈ 4,004,001 entries. That's fine.

But worst case for 20000 lines differing in ~50 places: D≈50-100, trace tiny. Good.

Actually, to speed up: we can trim common prefix/suffix first. That helps hugely.

Also, an optimization for completely different lists: Myers worst case D=N+M=2000, V array length 4001, each d loop iterates over k from -d to d step 2 → total iterations sum ~ d^2 = 4M. In Python, 4M iterations of inner loop with simple ops — maybe 2-3 seconds. Tight against 6s limit but likely OK. Could optimize with arrays and avoid function call overhead.

Alternatively use the "middle snake" linear space divide-and-conquer which has worst case O((N+M)·D) time too but recursion... Actually Myers linear space is O(N*M) worst-case time in the basic form? No — the linear-space version (Myers 1986) is O((N+M)D) time in the worst case as well with the find-middle-snake approach. Hmm, actually the linear space algorithm is O((N+M)·D) time worst case? The paper says O((N+M)D) time and O(N+M) space for the linear-space refinement. Yes.

But simpler: store trace. Let's do standard.

Let me write:

def diff_lines(a, b):
    # map lines to ints
    n, m = len(a), len(b)
    # trim common prefix and suffix
    # prefix
    p = 0
    while p < n and p < m and a[p] == b[p]: p += 1
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]: s += 1
    a_core = a[p:n-s]; b_core = b[p:m-s]
    # LCS on cores via Myers
    ...

Reconstruct: result = [("=", x) for x in a[:p]] + diff of cores + [("=", x) for x in a[n-s:]].

Edge: if both cores empty → just equals parts.

Myers forward with trace:

def myers(a, b):  # lists of ints
    n, m = len(a), len(b)
    max_d = n + m
    v = [0] * (2*max_d + 1)  # index offset max_d
    trace = []
    for d in range(max_d + 1):
        trace.append(v[:])  # snapshot — copying 2*max_d+1 each time is expensive for large max_d. For D=2000 case, copying 4001-length list 2000 times = 8M copies. Hmm.

Better: store only the slice of v actually touched, or store v as dict? A common trick: store v.copy() but only relevant band. Alternatively store per-d a list of x values for k in range(-d, d+1, 2): trace.append(v[max_d-d : max_d+d+1]). Slice copy of length 2d+1 — total 4M as computed. That's fine.

Actually even simpler: for each d, record list of (x for each k in band). During backtrack, we know band for that d.

Inner loop:

for d in range(max_d+1):
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
            x = v[k+1+off]
        else:
            x = v[k-1+off] + 1
        y = x - k
        # snake
        while x < n and y < m and a[x] == b[y]:
            x += 1; y += 1
        v[k+off] = x
        if x >= n and y >= m: found; store trace and break out.
    trace.append(snapshot of band)

Backtracking: we have trace[d] = list of x values for k = -d..d step 2 (band slice). At backtrack step from state (x, y) at depth d with k = x - y:

for d from len(trace)-1 down to 1:
    snapshot = trace[d]; k = x - y; band offset: index = k + d (since band starts at k=-d → index 0). But snapshot only has entries for k with parity matching d? In forward loop, for a given d we compute v[k] for k in range(-d, d+1, 2). But backtrack: given (x,y) at end of d, k = x-y has parity of d (since x+y = d+2*snake... actually parity of k matches parity of d? x - y where the previous step came from k-1 or k+1 of d-1). k parity equals d parity? If we came from k+1 at d-1: k_prev = k+1, parity(k_prev) = parity(d-1) → parity(k) = parity(d-1)+1 = parity(d). Yes, k has same parity as d.

So in snapshot for depth d, index = k + d. But wait: snapshot stores x values that were set during iteration d? We snapshot v AFTER the full d loop completes — then v[k+off] for k in band(-d..d) holds final values for depth d. But entries for k where we took "x = v[k+1]" may reference values from depth d-1 that we then overwrote? Order of iteration: k from -d to d step 2. When computing k, we read v[k-1] (depth d-1 value, not yet overwritten since k-1 has opposite parity and was last written at depth d-1... wait v[k-1] with parity d-1: at depth d we write k with parity d, so v[k-1] (parity d-1) was last written at depth d-1. Good. v[k+1] (parity d-1 too) — but we write v[k] parity d. So reads and writes don't collide within a d iteration except k-1 and k+1 both parity d-1, fine.

But wait: standard Myers reads v[k+1] which for k+1 with parity d-1: at iteration k' = k+1-2 = k-1 (processed earlier in this d loop, same parity d... no, k-1 has parity d-1 since d and k have same parity, k-1 has parity d-1). Hmm: parity of k equals parity of d. k-1 and k+1 have parity d-1, and the d loop writes k values of parity d only. So v[k-1] and v[k+1] still hold depth d-1 values. 

Then snapshot after d loop: v band holds depth-d x values for all k in band. During backtrack:

prev snapshot trace[d-1] has values for k' in band(-(d-1), d-1). Given (x,y) at depth d with k=x-y:
    if k == -d or (k != d and prev_snapshot[k+1 + (d-1)] < prev_snapshot[k-1 + (d-1)]):
        # came from k+1, x = prev x at k+1, then possibly snake
        prev_k = k + 1
        prev_x_end = snapshot_d[index]  # x after snake at depth d? Actually we need pre-snake x.
        
Standard backtracking: at depth d, we know the final x for k (from trace[d]). We determine whether we came from down (k+1) or right (k-1): if k == -d, or k != d and v_prev[k+1] < v_prev[k-1] (using the depth d-1 stored values), then came from down: prev x = v_prev[k+1], prev y = prev_x - (k+1). The moves between (prev_x, prev_y) and (x, y): one down move plus snake. So diff ops: the down move adds b[prev_y]... wait down move means y increases: line from b. Right move: line from a.

Order in script: snake lines come after the ± move. When backtracking we produce reversed script.

Let me define backtrack carefully:

x, y = final (n_core, m_core)
script = []
for d in range(D, 0, -1):
    k = x - y
    idx_prev = ... offset for depth d-1: snapshot_prev[k' + (d-1)] for k' in range(-(d-1), d, 2).
    if k == -d or (k != d and snapshot_prev[k+1 + d-1] < snapshot_prev[k-1 + d-1]):
        # down: came from k' = k+1
        prev_x = snapshot_prev[k+1 + d-1]
        prev_y = prev_x - (k+1)
        # snake from (prev_x, prev_y+1)? Actually after the down move we're at (prev_x, prev_y+1)... hmm.

Let me re-derive forward: at depth d, for k: choose x_start: either x_start = v_prev[k+1] (down move: y increases by 1, x same) or x_start = v_prev[k-1] + 1 (right move). Then y_start = x_start - k. Then snake extends. End (x, y), with y = x - k.

Down case: previous state (x_start, y_start - 1) at depth d-1 with k_prev = (x_start) - (y_start-1) = k+1. So b[y_start - 1] is the "+" line? y_start - 1 = prev_y. The down move consumed b[prev_y]. Then snake consumes a[x_start..x-1] and b[y_start..y-1] as equals.

Right case: previous state (x_start - 1, y_start) with k_prev = k-1; consumed a[x_start-1] as "-" line. Snake consumes a[x_start..x-1], b[y_start..y-1].

Backtrack producing script (reversed order of operations, so we append and reverse at end, appending snake lines then the move line... careful with ordering):

Going backward from (x, y) at depth d:
- snake lines between start and end: a[x_start..x-1] ↔ b[y_start..y-1]: these equals. In forward order they come after the move. Backtracking, we should append snake equals FIRST (they're last in forward order within this step), then the move line.

So:
compute x_start, move type.
append ("=", a[i]) for i in range(x, x_start, -1)? In reversed script building, we append in reverse: equals (from x-1 down to x_start), then the move line.
if down: append ("+", b[y_start - 1]); x, y = x_start, y_start - 1
else: append ("-", a[x_start - 1]); x, y = x_start - 1, y_start

Then set x, y = x_start, y_start for next iteration (the snake is handled). Wait: after handling depth d, next state is (x_start, y_start) adjusted: for down, previous endpoint at depth d-1 is (prev_x, prev_y) = (x_start, y_start - 1). For right: (x_start - 1, y_start). Yes as above.

At d == 0 (k == 0): remaining snake from (0,0) to (x,y): append equals for a[x-1..0]. But careful — at depth 0, snapshot trace[0] = [0] (v[0]=0 initially). x could be > 0 due to initial snake. Handle: after loop, while x>0 and y>0: append ("=", a[x-1]); x-=1; y-=1. Actually at d=0, k = x - y must be 0? At depth 0, only k=0 path, and the final state after depth 0 is (x, x) after snake... but subsequent depths build on it. Hmm, at the end of backtracking to depth 0, the state is the endpoint of the depth-0 snake, which lies on diagonal k=0, so x == y, and remaining equals a[x-1..0]. Fine.

Now performance concerns:

1. snapshot cost: for the 1000/1000 completely different case, trace total ~4M ints — slicing lists is fast in C, ~4M pointer copies is fine (<0.5s total).

Actually wait, I only snapshot the band slice v[max_d + k ...]. Let me snapshot trace.append(v[max_d - d : max_d + d + 1]) — copies 2d+1 entries. Sum ≈ D². For D=2000, 4M — ok.

Hmm, but actually maybe skip full snapshot and instead store just (v list copy)? Copying entire v (4001 entries) 2000 times = 8M entries — also fine but band slice halves it. Band slice fine.

Actually there's subtlety: v entries outside the current band contain stale values but we only read within band during backtrack. Snapshot band is sufficient.

But wait: during backtrack at depth d-1, we read snapshot_prev[k+1 + (d-1)] and snapshot_prev[k-1 + (d-1)] where k ranges with parity d, so k±1 have parity d-1 and lie in band [-(d-1), d-1]. Index: k+1 + (d-1) ranges from (-(d-1)) to (d-1) → 0..2(d-1). Good.

But careful: k could equal d: then k+1 = d+1 out of band of depth d-1 (band max index 2(d-1), k+1+d-1 = d+1+d-1 = 2d > 2d-2). But we guard: if k == d, we don't read k+1 (condition short-circuits: k == -d or (k != d and ...)). Similarly k == -d handled first. Good.

2. The main loop: for the equal-lines-heavy case, the snake inner while loop runs over many characters. 20000 lines with 50 diffs: total snake work ~ O(n + m) per... actually snakes across all d sum to O((n+m)*?) Hmm, each diagonal's total snake length across all d... In Myers, snake work per d can be O(n+m) worst case, but typically bounded: total snake length over all d ≤ O((n+m) * D)? Actually total snake work is bounded by O((N+M)·D) worst case but in practice total snake ≈ N+M per... hmm. Each position (x,y) is visited by at most... a snake on diagonal k at depth d; each (diagonal, depth) pair has one snake. Total snake length could be (N+M)*D in theory. But with prefix/suffix trimming and typical data, fine. For 20000 lines with 50 differences, D ≈ 50 (number of +/-), snakes total ≈ n+m minus... total snake ≈ 40000-ish? Actually snake lengths: at each d, snakes on different diagonals partition progress; total progress = final x+y = n+m plus... The sum over all (d,k) of snake lengths equals sum of (x at end of each (d,k))... Hmm, each (d,k) computed has one snake; total snake length could be up to (number of (d,k) pairs) × avg snake. Number of (d,k) pairs = D²/2 ≈ 1250 for D=50. If snakes long... but a snake on diagonal k at depth d ends where a mismatch is; each diagonal k has at most D snakes but they're disjoint segments along the diagonal! Because on the same diagonal, deeper d starts further along. So total snake length per diagonal ≤ diagonal length ≤ n+m. Total ≤ (2D+1)(n+m)? No — per diagonal, snakes are disjoint? Not exactly — snake start points depend on paths, could overlap. In practice fine.

Alternative optimization for the 20000-similar case: precompute matching via prefix/suffix trim (done), then the remaining core is small (only ~100 lines around diffs? No! Core is everything between first and last diff — could be nearly the whole 20000 lines if diffs are spread out). D≈50 though, so d loop is cheap; snakes: each (d,k) snake scans until mismatch. Worst case: core = 19900 equal lines with 50 scattered changes → D = 50ish. At depth d, k ranges -d..d; snakes on diagonals near k=0 run long. Total snake work: each diagonal visited up to D times, but snake on same diagonal at increasing d are nested/progressive? Hmm.

Consider: diagonal k=0. At d=0, snake from (0,0) to first mismatch at (x0,y0). At d=2, path reaches k=0 via down then right or right then down, arriving at x = v_prev[1]+? The snake at d=2 on k=0 starts from x = min/max of neighbors... The start is after the previous endpoint on that diagonal? For k=0 at d=2: comes from k=-1 or k=1 at d=1. v_prev[k±1] endpoints on adjacent diagonals. The start point (x_start, y_start) — could it be before the previous k=0 endpoint (x0,y0)? If v_prev[1] = x1 with y1 = x1 - 1. Down from (x1, y1) to (x1, y1+1): k=0, position (x1, x1). Is x1 ≥ x0? Position (x1, x1) on diagonal 0 vs previous endpoint (x0, x0): furthest-reaching points on the same diagonal are monotonically non-decreasing in d (standard Myers property: v[k] is non-decreasing over d). So x1 ≥ x0. And snake from (x1,x1): could x1 == x0 (re-scan nothing) — snake from there extends from where previous left... previous snake ended at (x0,x0) where mismatch a[x0] != b[x0]. New snake starts at (x1, x1) with x1 ≥ x0; if x1 == x0, the while loop immediately checks a[x0] == b[x0] → false, stops. If x1 > x0, starts further. So no re-scanning of the same mismatch. Actually the total snake work per diagonal ≤ diagonal length + D (each iteration either advances or stops at a mismatch, and mismatches per diagonal per depth... hmm, a snake could stop at the same mismatch point multiple times? If x_start == x0 exactly, checks one comparison and stops: 1 wasted comparison per (d,k). So total work ≤ (n+m) + (#pairs) = (n+m) + D²/2. 

So total time for case 1: ~40000 + 1250 comparisons → trivial. Case 2: 1000+1000 completely different: D=2000, pairs ≈ 2M... wait D²/2 = 2M. Plus list copying 4M. In Python, ~2M inner iterations with ~10 ops each → maybe 1.5-3 seconds. Under 6s, OK.

Wait, actually for completely different lists, D = n + m only if no common lines at all. "Completely different" — assume no common elements. Then every (d,k) snake length 0 (no matches). d loop runs to d=2000. Inner iterations: sum over d of (d/2 + 1)*... iterations = sum_{d} (number of k values) = sum_{d=0}^{2000} (d+1) ≈ 2M. Each iteration: a few comparisons and list indexing → maybe 1µs each → 2s. OK.

One more optimization: hash lines to ints first via dict — comparisons become int comparisons (fast). Also if a line object comparison is expensive... ints fine.

Edge cases: empty a and/or b. n=0, m=0 → []. a empty → all "+". b empty → all "-".

Let me also handle when one core is empty after trimming (e.g., a is prefix of b): then remaining is pure "+" lines — Myers with n=0: max_d = m; d loop: k from -d to d step 2... with n=0, x=0 always... Let's just let Myers handle it: n=0, m=5. d=0: k=0: x = v[1] (k==-d? no, k==0==-d? -d=0, yes k==-d → x = v[k+1+off] = v[1+off] = 0). y=0. snake: x<0? no, x<0 false → x=0. v[0]=0. x>=n(0) and y>=m? y=0<5 no. d=1: k=-1: k==-d → x = v[0+off]=0, y=1, snake no. v[-1]=0. k=1: k==d → x = v[0]+1 = 1, y=0. x>=n → but y<m. v[1]=1. d=2: k=-2: x=v[-1]=0,y=2. v[-2]=0. k=0: k==-d? -d=-2 no. k!=d. v[-1]=0 < v[1]=1 → down: x=v[1]=1, y=1. v[0]=1. k=2: x=v[1]+1=2,y=0. v[2]=2. d=3: k=-3: x=v[-2]=0,y=3. k=-1: v[-2]=0 < v[0]=1 → x=v[0]=1,y=2. k=1: v[0]=1 < v[2]=2 → x=v[2]=2,y=1. k=3: x=v[2]+1=3,y=0. d=4: ... k=4: x=4,y=0. k=2: x=v[3]=3,y=1. k=0: x=v[1]=2,y=2. k=-2: x=v[-1]=1,y=3. k=-4: x=v[-3]=0,y=4. d=5: k=5: x=5,y=0... k=3: x=4,y=1; k=1: x=3,y=2; k=-1: x=2,y=3; k=-3: x=1,y=4; k=-5: x=0,y=5 → x>=0 and y>=5 → found at d=5. Good: script should be "+×5" — 5 "+" and 0 "="; LCS=0. Backtrack from (5,5)... wait final x,y: found when x>=n and y>=m: at d=5, k=-5: x=0, y=5. Hmm x=0 ≥ n=0, y=5 ≥ m=5. So endpoint (0,5). Backtrack: d=5, k=0-5=-5 = -d → came from k+1=-4: prev_x = snapshot_prev[-4 + 4] = trace[4][0] = 0, prev_y = 0 - (-4) = 4. Down move: append ("+", b[prev_y]) = b[4]. Snake: x..x_start: x=0, x_start=0 → none. Set x,y = 0,4. d=4: k=-4=-d → from k+1=-3: prev_x = trace[3][-3+3=0]=0, prev_y=3 → "+" b[3]. ... continues to d=1, then x,y=(0,0). Then d stops at d=0? Loop range(D, 0, -1) → last d=1. After d=1: x,y = (0,0). Then final while: x>0? no. Done. Script reversed: "+b0..b4". Correct.

Now the backtrack loop range(d_found, 0, -1) then final cleanup for d=0 snake.

Implementation details:

def diff_lines(a, b):
    # int mapping
    lut = {}
    def enc(lines):
        out = []
        for line in lines:
            i = lut.get(line)  # hmm lines may be unhashable? Assume str. Use lut.setdefault.
            ...
    Actually simpler: 
    enc = {}
    def to_ints(lines):
        res = []
        app = res.append
        for line in lines:
            v = enc.get(line, -1)
            if v < 0:
                v = len(enc); enc[line] = v
            app(v)
        return res
    But note: equality must be consistent with ==; dict uses hash+eq — fine for strings.

    ia = to_ints(a); ib = to_ints(b)
    n, m = len(ia), len(ib)

    prefix/suffix trim:
    p = 0
    while p < n and p < m and ia[p] == ib[p]: p += 1
    s = 0
    while s < n - p and s < m - p and ia[n-1-s] == ib[m-1-s]: s += 1
    ca = ia[p:n-s]; cb = ib[p:m-s]

    result = [("=", x) for x in a[:p]]
    if ca or cb:
        result.extend(myers_script(ca, cb, a[p:n-s], b[p:m-s]))
    result.extend(("=", x) for x in a[n-s:])
    return result

Wait — for the "-" and "+" lines we need original line strings. myers works on int lists but we can pass original core lists too, or map back via index → but lines may repeat with same int; mapping int→line: keep list of unique lines: uniq[v] = line. Use that.

Let me write myers returning script over cores:

def _myers(ca, cb, la, lb):
    # ca, cb int lists; la, lb original line lists (same lengths)
    n, m = len(ca), len(cb)
    max_d = n + m
    off = max_d
    v = [0] * (2*max_d + 2)
    trace = []
    d_found = -1
    for d in range(max_d + 1):
        # snapshot will be appended after processing? We need snapshot AFTER d's writes for backtrack at depth d? 
        # Backtrack uses trace[d] to get final x for the state at depth d, and trace[d-1] for decisions.
        # So trace[d] = band snapshot after processing depth d.
        start = off - d if off - d > 0 else 0  # careful negative index slicing
        ...

Hmm, slicing v[off-d : off+d+1] — when off-d < 0 (d > max_d can't happen since d ≤ max_d → off-d ≥ 0). Good, off = max_d, d ≤ max_d → off - d ≥ 0. But band could exceed array: off + d + 1 ≤ 2*max_d + 1 ≤ len(v). Fine.

But note: v[k+off] for k in band — indices off-d..off+d. Slice v[off-d : off+d+1] length 2d+1. Index within slice: (k+off) - (off-d) = k + d. Good.

Inner loop:

for d in range(max_d+1):
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
            x = v[k+1+off]
        else:
            x = v[k-1+off] + 1
        y = x - k
        while x < n and y < m and ca[x] == cb[y]:
            x += 1; y += 1
        v[k+off] = x
        if x == n and y == m:  # x >= n can't exceed n since snake stops... x could exceed? snake stops when x==n or y==m or mismatch; x ≤ n. But x from v[k+1] could be n already. x ≤ n always? v values ≤ n. yes.
            d_found = d
            trace.append(v[off-d: off+d+1])
            break
    else:
        trace.append(v[off-d: off+d+1])
        continue
    break  # break outer

Hmm, using for-else with break flags. Alternatively check after inner loop. Let me restructure:

for d in range(max_d + 1):
    found = False
    for k in range(-d, d+1, 2):
        ...
        v[k+off] = x
        if x >= n and y >= m:
            found = True
            break
    trace.append(v[off-d: off+d+1])
    if found:
        D = d
        break

Then backtrack:

script = []
x, y = n, m  # endpoint; note found endpoint is (x, y) with x==n, y==m? x>=n and y>=m means x==n,y==m since bounded. Yes.
for d in range(D, 0, -1):
    prev = trace[d-1]
    k = x - y
    if k == -d or (k != d and prev[k+1 + d-1] < prev[k-1 + d-1]):
        # down from k+1
        x_start = prev[k+1 + d-1]
        y_start = x_start - (k+1)
        # snake: equals a[x_start..x-1] / b[y_start..y-1]... wait current (x,y) is endpoint at depth d; the snake went from (x_start, y_start) to (x, y)? 

Hold on. Forward: at depth d, after choosing move we're at (x_start, y_start) then snake to (x_end, y_end) recorded in v. Endpoint at depth d is (x_end, y_end) with k = x_end - y_end. In backtrack, current (x,y) = (x_end, y_end). x_start here is the pre-snake x (post-move). Snake equals: a[x_start .. x-1], b[y_start .. y-1]. In reverse append order: append equals from x-1 down to x_start, then the move line.

        for i in range(x - 1, x_start - 1, -1):
            script.append(("=", la[i]))
        # down move consumed b[y_start - 1]... wait no.

Hmm wait. Down move: from previous state (px, py) at depth d-1 (k_prev = k+1), moving down to (px, py+1). Then snake from (px, py+1). So x_start = px, y_start = py + 1. The "+" line is b[py] = b[y_start - 1].

px = prev[k+1 + d-1]; py = px - (k+1). x_start = px; y_start = py + 1 = px - k.

Check: y_start should equal x_start - k: px - k. And x_start - k = px - k. ✓.

        append equals a[x-1 .. x_start-1] reversed... 

Wait — but actually the snake: is the snake between (x_start, y_start) and (x, y) with x - x_start = y - y_start? Since both on diagonal k. Yes.

        for i in range(x-1, x_start-1, -1):
            script.append(("=", la[i]))
        script.append(("+", lb[y_start - 1]))
        x, y = x_start, y_start - 1
    else:
        # right from k-1
        x_start = prev[k-1 + d-1] + 1
        y_start = x_start - k
        for i in range(x-1, x_start-1, -1):
            script.append(("=", la[i]))
        script.append(("-", la[x_start - 1]))
        x, y = x_start - 1, y_start

Hmm wait, careful: in down case, the equals appended are a[x_start..x-1] — correct, those correspond to b[y_start..y-1]. Then move line "+" b[y_start-1]. Then new state (x_start, y_start-1) = (px, py). ✓.

Right case: equals a[x_start..x-1], then "-" line a[x_start-1], new state (x_start-1, y_start). ✓.

After loop (d from D down to 1), state is endpoint at depth 0: (x0, y0) with x0 == y0 (k=0) — wait, is that guaranteed? At depth 0, only k=0 processed, v[0] = snake from (0,0). Endpoint (x0, x0). Backtrack down to d=1 gives state = endpoint at depth 0 = (x0, x0)? Let's check: at d=1, we compute prev = trace[0]. trace[0] = v[off-0:off+1] = [v[off]] = [0] (v initialized 0, and at d=0 we wrote v[0+off] = snake end... wait trace[0] appended after d=0 processing: v[off] = x after snake at d=0. So prev[0] = x0 (endpoint at depth 0, k=0). Hmm but in backtrack at d=1, we read prev[k±1 + 0] where prev has length 3 (band -1..1): indices 0..2. prev[k+1] for k=-1 → prev[0] = x0 ✓; prev[k-1] for k=1 → prev[0] = x0 ✓. But prev[1] and prev[2] (k=1, -1... wait band for d=0 is slice v[off:off+1], length 1). So trace[0] length 1, index k+1+0 for k=-1: index 0 ✓. For k=1 (k==d case? d=1, k=1 == d → guard: k == -d false, k != d false → else branch: right move: x_start = prev[k-1 + 0] + 1 = prev[0] + 1 ✓.

Then after d=1, state = (x_start-1, y_start) or (x_start, y_start-1) which is the depth-0 endpoint (x0, x0). Then final:

while x > 0 and y > 0:  # actually x == y
    script.append(("=", la[x-1])); x -= 1; y -= 1

But is it guaranteed x==y at the end? The depth-0 endpoint is on diagonal 0 → x == y. Yes. But safe to use while x > 0 and y > 0.

Hmm, one subtlety: trace[0] snapshot: after d=0 processing, we append v[off:off+1]. But if found at d=0 (both cores start with long common prefix... but we trimmed prefix, so ca[0] != cb[0] unless one is empty). If n=0 and m=0 we don't call _myers. If n=0, m>0: d=0: k=0: k==-d → x = v[1+off] = 0; y = 0; snake: x<n false. v[off]=0. x>=n(0) and y>=m? y=0 < m. Not found. Continue. Fine.

If found at d=0: possible when n>0 and m>0 and ca[0]==cb[0]? We trimmed prefix so ca[0] != cb[0] (if both nonempty). Unless n==0 and m==0 (not called) or n==0/m==0 with m==0: n>0, m=0: d=0: k=0: x = v[off+1]=0, y=0. snake no. v[off]=0. x>=n? 0>=n false if n>0. Hmm then loop continues; eventually found. Actually with m=0: can we ever reach y>=m=0 and x>=n? Need x>=n with y=0 → k = x. d loop: at d, k=d gives x = v[d-1]+1 = d (progressing right moves). At d=n: k=n, x=n, y=0 ≥ 0 → found at d=n. Script: all "-". Backtrack: d=n: k=n=d → right: x_start = prev[k-1+d-1]+1 = prev[n-1+n-1]+1 = trace[n-1][2n-2]... band of d-1=n-1 is k in [-(n-1), n-1], slice index k+d-1: for k=n-1: index 2n-2 ✓ value = x endpoint at depth n-1 on diagonal n-1 = n-1. So x_start = n, y_start = n - n = 0. Equals: none (x=x_start=n). "-" line la[n-1]. x,y = n-1, 0. Continue down to d=1... each step right. Ends at (0,0). Good.

Edge: what if found at d=0? Only if n==0 and m==0, excluded. But what about n==0 and m==0 → skip. OK but also handle in trace/backtrack: D=0 case — script empty anyway; not called.

Also `x >= n and y >= m` — since x ≤ n always (v values ≤ n because snake stops at n), x>=n means x==n.

Memory concern for trace in bad case: D=2000 → trace slices total ~4M elements. Each element a Python int pointer — 32MB + small ints cached. Fine.

Alternative to reduce memory/time: store snapshots only... it's fine.

Now, is the "minimal" requirement satisfied? Myers gives minimal D = (number of "-" + number of "+") = n + m - 2*LCS... For edit script with only ins/del (no replace), minimal script ⇔ maximal LCS. Myers' algorithm finds minimal D in the "insertions+deletions" model, so = items count = LCS length maximal. ✓.

One concern: ties in direction choice affect which LCS but not its length. Fine.

Performance micro-optimizations: make locals for v, ca, cb, n, m, off inside function. Use while-based inner loop.

Also the trace snapshots: instead of slicing each d (which for large d copies big bands), note that we could store only v slice. That's what we do — band slice. For case 1 (D≈50), trivial.

But wait — there's a subtle bug possibility: at depth d, the band slice v[off-d : off+d+1] includes entries for k values of both parities; entries with parity ≠ d are stale (from depth d-1... actually from previous depths). In backtrack at depth d we only index trace[d] never (we use trace[d-1] for decisions and we know current x,y directly). Actually do we ever need trace[d]? We don't read trace[d] in backtrack at all! We use x,y (carried) and trace[d-1]. Wait — do we need trace[d]? We need x_start, which comes from prev (trace[d-1]). Current endpoint (x,y) is carried from the found state (n,m) backward. So actually we never need trace[d] itself! Interesting — but we DO need trace[d-1] for all d from D to 1. And we don't need trace values at all for the final snake. So we could avoid storing trace[d] for the found depth... but we still need all trace[0..D-1]. The appended snapshot at found d is unnecessary but harmless. Actually we could skip appending when found. Minor.

Hmm wait, but actually we need to double check: backtrack at depth d uses trace[d-1] to compute prev positions and the decision. The decision condition must replicate the forward condition exactly: forward at depth d, k: if k == -d or (k != d and v_prev[k-1] < v_prev[k+1]) → down (x = v_prev[k+1]); else right. In backtrack with prev = trace[d-1] (band for depth d-1): prev index for k' is k' + (d-1). Forward reads v_prev[k-1+off] and v_prev[k+1+off] — full v array. Are those within the band of depth d-1? k-1 and k+1 have parity d-1, and |k| ≤ d → |k±1| ≤ d+1. Hmm: k = d → k+1 = d+1, but guard prevents reading when k == d. k = -d → k-1 = -d-1 out of band but guard reads only when... when k == -d we take down branch without reading k-1. For -d < k < d: k-1 ≥ -d+... k ≥ -d+2 (parity) → k-1 ≥ -d+1 = -(d-1) ✓ in band; k+1 ≤ d-1 ✓. So reads are within band indices [-(d-1), d-1] → slice indices 0..2(d-1). ✓.

But: v_prev values at those band indices — snapshot taken after depth d-1 completed → holds depth-(d-1) endpoints ✓.

Great.

Now also: the found break inside inner loop — after break we append snapshot and break outer. But if found, we don't even need that snapshot; skip to save a copy: but code simplicity — keep, negligible.

Let me also consider: for the 20000-line case with ~50 diffs, prefix/suffix trim helps if diffs at ends; if diffs scattered in middle, core is ~20000 lines with D≈50. d loop: for d up to ~50, k range small; snakes run through mostly-equal region. Total snake work bounded as argued ≈ core length + D² ≈ 20000 + few thousand. 

Wait, is that argument right? On diagonal k, endpoints v[k] non-decreasing in d. Snake at depth d starts at x_start ≥ previous endpoint on diagonal k (v[k] at depth d-2... hmm, previous depth where diagonal k was processed is d-2 (parity). v[k] at depth d-2 = previous endpoint on that diagonal. x_start at depth d ≥ ? x_start derived from neighbors' depth d-1 endpoints. Is x_start ≥ v_{d-2}[k]? Standard property: furthest reaching points are non-decreasing, and the snake at depth d starts at a point that is ≥ previous endpoint on diagonal k? Not necessarily ≥, could be equal. If equal, snake re-checks one comparison (mismatch) and stops. If greater, fine. So per (d,k): snake work ≤ (advance) + 1 comparison. Total advance across all (d,k) on diagonal k ≤ diagonal length? Sum of advances on diagonal k: endpoints increase monotonically from initial to final ≤ n+m. And number of (d,k) pairs ≤ D²/2. So total ≤ (n+m) + D²/2 per... total across diagonals: sum over k of (diagonal length + D) ≤ (n+m)*(2D+1)?? No: sum over k of diagonal length — diagonals k range over [-D, D], each diagonal length ≤ min(n, m - k...) ≤ n+m. Sum over 2D+1 diagonals of lengths ≤ (2D+1)*(n+m)? That's 101 * 40000 = 4M for case 1. Hmm, that's a loose bound. Actually total advances across ALL (d,k) pairs: each (d,k) has one snake; the endpoint v_d[k] ≥ start. Total work = sum of snake lengths = sum over (d,k) of (endpoint - start). For diagonal k, endpoints over d (same parity) are non-decreasing, so sum of (endpoint_d - start_d) ≤ final endpoint - initial start... no: sum of increments where each start ≥ previous endpoint? start_d ≥ endpoint_{d-2}(k)? Hmm is that true? start_x at depth d on diagonal k: comes from v_{d-1}[k±1] (+1 for right). Is that ≥ v_{d-2}[k]? Property: v_{d}[k] ≥ v_{d-2}[k] + 1? Known lemma: furthest reaching points increase by at least... not necessarily monotone strict. But v_{d-1}[k+1] ≥ v_{d-2}[k]? Hmm. Known: v_d[k] ≥ v_{d-2}[k] (monotone in d). And snake starts where the previous path... I recall that total snake work in Myers is O((N+M)·D) worst case but practically the sum of snake lengths equals... Let me think: actually it's known that the sum over all d of snake lengths is O(N+M + D²)?? Hmm. Consider: snake at (d,k) starts at position ≥ endpoint of (d-2, k)? If v_{d-1}[k+1] ≥ v_{d-2}[k]... 

Claim: v_{d}[k] ≥ v_{d-2}[k]. And snake at (d,k) starts at max-ish of neighbors ≥ ... hmm, start_x for down = v_{d-1}[k+1]; is v_{d-1}[k+1] ≥ v_{d-2}[k]? A path reaching (v_{d-1}[k+1], ...) at depth d-1 on diagonal k+1: moving down once gets to diagonal k at depth d... that doesn't directly bound v_{d-1}[k+1] vs v_{d-2}[k].

Take diagonal k at depths d and d-2. Start at depth d: x_start. Previous endpoint on k: e = v_{d-2}[k], which stopped at a mismatch (a[e], b[e-k]) (or boundary). x_start: from neighbor at depth d-1. Hmm, consider case: could x_start < e? Then snake from x_start would re-scan up to e, redoing work. Example: ... I think it can happen: path via k-1 then right at depth d could land before v_{d-2}[k]? v_{d-1}[k-1] ≥ v_{d-3}[k-2]... hmm.

Actually there's a cleaner known result: in Myers' algorithm the total time is O((N+M)D), and the practical bound on snake total is O(N+M+D²)? Let me not agonize. Even worst case (n+m)*D = 40000*100 = 4M for case 1 — but is (n+m)*D reachable with only 50 diffs? Snake work total = sum over (d,k) of snake length. Each snake ends at a mismatch or boundary. Same mismatch can terminate many snakes? A snake stops at (x,y) where a[x]≠b[y] — position on diagonal k. Multiple (d,k) snakes on the same diagonal could stop at the same mismatch if they start at ≤ that point. So worst-case snake work could be O(D) per mismatch position × number of mismatch positions... total ≤ (number of (d,k) pairs) × 1 + advances. Advances: sum over all (d,k) of advance. Advance on diagonal k at depth d = endpoint_d(k) - start_d(k). Hmm.

OK regardless: worst theoretical O((N+M)·D) = 4M simple ops for case 1 — still probably under 2s? 4M inner-loop iterations in Python ~ 2-4s. Risky. But realistically with 50 scattered diffs, D≈50 and snake work ≈ N+M+small. Let me think about whether re-scanning can actually occur significantly.

Lemma: v_{d}[k] ≥ v_{d-2}[k] and moreover the snake at (d,k) starts at x_start ≥ v_{d-2}[k]? 

start_x at (d,k): if down: v_{d-1}[k+1]; if right: v_{d-1}[k-1] + 1.

Known monotonicity: v_{d}[k] ≥ v_{d-1}[k] and v_{d}[k] ≥ v_{d-2}[k] + ... Let me try to prove v_{d-1}[k+1] ≥ v_{d-2}[k] when the down branch is taken at (d,k)... Not obviously.

Counter-scenario: sequences where a common region appears at offset... e.g., a = "aaaa...", b = "aaaa..." with a mismatch somewhere. Paths on diagonal k=0 at d=0 reach mismatch at (e,e). At d=2 on k=0: start from v_1[±1]. v_1[1]: right move from (0,0) → x=1, snake on diagonal 1: a[1]==b[0]? Suppose a="xaaa", b="yaaa"... whatever. In typical data endpoints on a diagonal are monotone and starts ≥ previous endpoints because the furthest-reaching path to diagonal k at depth d dominates. Actually there IS a standard lemma: v_d[k] ≥ v_{d-2}[k] + 1? No...

Let me just also add the classic optimization: none needed. I'll trust that in practice it's fine. Actually, hmm, let me think again with a potential adversarial case for the stated perf test: 20000 lines differing in ~50 places. D ≈ 50–100. Even if snake work were (n+m)*D/2 = 2M int comparisons, that's ~1s in Python. Probably passes. And realistically snake re-scanning is minimal. I'll accept.

Alternative safety: use the linear-space "divide and conquer middle snake" (Myers 1986) which is O(N·M/2^w?) no. Let's keep forward Myers with trace.

Another optimization: convert lists to ints, and use local variable binding.

Also for the "completely different 1000" case: D = 2000 worst; inner loop 2M iterations; each iteration does: range step, condition checks, list indexing v[k-1+off], v[k+1+off], compare, y=x-k, while check (x<n and y<m and ca[x]==cb[y]) — for completely different, ca[x]==cb[y] is one int comparison that fails... but wait "completely different" means no common lines, so snake while does exactly one failed comparison per (d,k) → +2M ops. Total maybe ~3-4s in CPython? Hmm, 2M iterations with ~8 bytecode-heavy ops... Python does roughly 10-30M simple bytecode ops/sec... each iteration here maybe 0.3-0.5µs? Realistically each loop iteration with ~10 operations ≈ 0.5µs → 2M iterations ≈ 1s. Plus snapshot slices 4M pointer copies ≈ 0.2s. Under 6s comfortably.

But wait — will D really be 2000 for "completely different"? If truly no common elements, yes D = n+m = 2000. Inner iterations = sum_{d=0}^{2000}(number of k in range(-d,d+1,2)) = sum (d+1) ≈ 2001*2001/... = (2000*2001/2) + 2001 ≈ 2.004M. OK.

Could speed up with arrays: use array module? v as list is fine.

One more micro-opt: precompute nothing else. Write tight code.

Also note: k loop `range(-d, d+1, 2)` and indexing v[k+off] — negative k + off stays in bounds since off = max_d ≥ d.

Let me now also double-check backtrack decision replication with an example. a=[1,2,3], b=[1,3] (ints). Trim prefix: p=1 (1==1). Cores: ca=[2,3], cb=[3]. Suffix trim: s: ia[n-1-s]=ia[2]=3, ib[m-1-s]=ib[1]=3 → equal, s=1; next s=1 < n-p=2, s<m-p=1? m-p=1, s<1 false → stop. s=1. ca=[2], cb=[]. 

_myers(ca=[2], cb=[]): n=1,m=0,max_d=1,off=1,v=[0]*4.
d=0: k=0: k==-d → x=v[1]=0; y=0. snake: x<1 and y<0? y<m=0 false → no. v[1]=0. x>=1? no.
d=1: k=-1: k==-d → x=v[0]=0; y=1. snake: y<m=0 false. v[0]=0. x>=1? no (x=0). k=1: k==d → x=v[0]+1=1; y=0. snake: x<1 false. v[2]=1. x>=1 and y>=0 → found, D=1. trace=[[0],[0,0,1]].

Backtrack: x,y=1,0. d=1: prev=trace[0]=[0]. k=1. k==-d? no. k!=d? k==d → condition false → right branch: x_start=prev[k-1+0]+1=prev[0]+1=1. y_start=1-1=0. equals: range(x-1=0, x_start-1=0, -1) → empty. append ("-", la[0]) = ("-", "2"). x,y = 0,0. Loop ends. final while: x=0 → none. script=[("-","2")]. Full result: [("=", "1")] + [("-", "2")] + [("=", "3")] → "=":1,3 = b ✓; "="+"-": 1,2,3 = a ✓. LCS length 2: lines "1","3" ✓ minimal.

Another test: a=[1,2], b=[2,1]. Trim: p=0 (1≠2); suffix: ia[1]=2 vs ib[1]=1 → no. cores full. Myers: n=m=2, max_d=4, off=4, v=[0]*10.
d=0: k=0: x=v[4]=0,y=0. snake: ca[0]=1 vs cb[0]=2 → no. v[4]=0.
d=1: k=-1: x=v[3]=0, y=1. snake: ca[0]=1 vs cb[1]=1 → match → x=1,y=2. v[3]=1. x>=2? no. k=1: x=v[5-... v[k-1+off]=v[4]=0 +1 = 1; y=0. snake: ca[1]=2 vs cb[0]=2 → x=2,y=1. v[5]=2. x>=2 and y>=2? y=1 no.
d=2: k=-2: x=v[2]=0,y=2. snake: x<2 and y<2? y=2 no. v[2]=0. k=0: k==-d? no. v[k-1+off]=v[3]=1 < v[k+1+off]=v[5]=2 → down: x=v[5]=2, y=2. snake: x<2 false. v[4]=2. x>=2 and y>=2 → found D=2. trace=[[0],[?,...],[band]].

trace[1] = v[off-1:off+2] = v[3:6] = [1,0,2]. Backtrack: x,y=2,2, d=2: prev=trace[1]=[1,0,2] (index = k + d-1 = k+1). k=0. k==-d? no. k!=d yes. prev[k+1+1]=prev[1]=0 < prev[k-1+1]=prev[-1]... wait prev[k-1 + d-1] = prev[0-1+1]=prev[0]=1. Condition: prev[k+1+d-1] < prev[k-1+d-1] → prev[1] < prev[0] → 0 < 1 → true → down: x_start = prev[k+1+d-1] = prev[1] = 0. y_start = 0 - 0 = 0. Equals: range(x-1=1, x_start-1=-1, -1) → i=1,0: append ("=",la[1])=("=",2), ("=",la[0])=("=",1). Then ("+", lb[y_start-1]) = ("+", lb[-1])!! y_start-1 = -1 → lb[-1] = last line — BUG!

Wait — y_start = 0 means the down move consumed b[y_start - 1] = b[-1]? That's wrong. Let me recheck: down branch: previous state (px,py) with py = px - (k+1) = 0 - 1 = -1?? That's negative — impossible state. Hmm, something's off.

Recheck forward: at d=2, k=0: down from k+1=1 at depth 1: v_1[1] = 2 (endpoint (2,1)). x = v[k+1+off] = v[5] = 2. y = x - k = 2. So the state after move: (x=2, y=2)?? Down move: from (px,py)=(2,1) move down → (2,2). So pre-snake position IS (2,2) = final (no snake). px=2, py=1. So x_start should be px = 2, not prev[...]=?

I conflated: prev[k+1 + d-1] is the endpoint x of diagonal k+1 at depth d-1 = 2. x_start = px = 2. y_start = py + 1 = px - (k+1) + 1 = 2 - 1 + 1 = 2. ✓. So formula: x_start = prev[k+1 + d-1]; y_start = x_start - (k+1) + 1 = x_start - k. OK so y_start = x_start - k, and the "+" line is b[y_start - 1] = b[1] = "1". Wait y_start = 2, so b[y_start-1] = b[1] = line "1" ✓ (the down move at position... from (2,1) down consumes b[1]). ✓. I earlier wrote y_start = x_start - (k+1) — that's py, not y_start. Let me redo the formulas:

Down: px = prev[k+1 + d-1]; py = px - (k+1). Pre-snake pos: (px, py+1). Snake from (px, py+1) to (x, y). Equals: a[px..x-1], b[py+1..y-1]. "+" line: b[py]. New state: (px, py).

So in code: x_start = px; y_start_pre = py + 1 = px - k. Equals loop: range(x-1, px-1, -1) appends la[i]. Then ("+", lb[py]) where py = px - (k+1). Then x,y = px, py.

Right: px = prev[k-1 + d-1]; py = px - (k-1). Move right: pre-snake pos (px+1, py). Equals a[px+1..x-1]. "-" line a[px]. New state (px, py).

Check forward consistency: right branch forward: x = v[k-1+off] + 1 = px + 1; y = x - k = px + 1 - k = px + 1 - k; py = px - (k-1) = px - k + 1 = y ✓. Down branch forward: x = v[k+1+off] = px; y = x - k = px - k; py = px - (k+1) = y - 1 ✓ pre-snake (px, py+1) = (x, y) ✓.

Redo example backtrack: d=2, k=0, down: px = prev[0+1+1] = prev[1] = 0? Wait prev = trace[1] = [1,0,2], index = k' + (d-1) = k' + 1 for k' in {-1,0,1}. prev[1] corresponds to k'=0 → v_1[0] = 0 ✓ (v[4]=0 at d=1... wait v[4] was written at d=0 as 0 and not overwritten at d=1 (k=0 not processed at d=1, parity) → v_1[0] = 0 ✓ endpoint at depth1 diagonal0 = 0? Hmm but furthest reaching on diagonal 0 at depth 1: not processed at d=1; v[4] holds depth-0 value 0. For backtrack decision at d=2 we use "v_prev[k-1] < v_prev[k+1]" = v_1[-1] vs v_1[+1] = 1 vs 2 → down ✓ matches forward (v[3]=1 < v[5]=2 → down ✓).

px = prev[k+1 + d-1] = prev[0+1+1] = prev[2] = 2 ✓ (endpoint diagonal 1 at depth 1 = 2). py = 2 - 1 = 1. Equals: range(x-1=1, px-1=1, -1) → empty ✓ (snake length 0: pre-snake (2,2) = final). "+" lb[py] = lb[1] = "1" ✓. New state (2,1).

d=1: prev = trace[0] = [0] (v[off:off+1] after d=0 → v[4]=0). k = x - y = 2 - 1 = 1. k == -d? no. k != d? k == d=1 → false → right: px = prev[k-1 + 0] = prev[0] = 0. py = 0 - 0 = 0. Equals: range(x-1=1, px=0, -1) → i=1: ("=", la[1]) = ("=", "2"). Then ("-", la[px]) = ("-", la[0]) = ("-", "1"). New state (0, 0).

Final while: none. script reversed: [("=","2"), ("-","1"), ("+","1")]. Full: a: =2, -1 → [2,1] ✓. b: =2, +1 → [2,1] ✓. "=" count 1 = LCS("12","21")=1 ✓ minimal.

Now the equals loop bounds: down: range(x-1, px-1, -1) — appends la[x-1]...la[px]. ✓. Right: range(x-1, px, -1) — appends la[x-1]...la[px+1] ✓.

Reverse at end: script.reverse().

Also note: in down branch when appending equals, the equals correspond to snake after the "+" move — in forward order: "+", then equals. Backward appending: equals first, then "+". ✓ as coded.

Now handle found snapshot: I'll append trace snapshots uniformly. Actually to slightly reduce memory, skip appending when found (not needed). But keep for simplicity? Skipping is easy:

if found: break without append... but then trace length = D (indices 0..D-1), backtrack uses trace[d-1] for d in D..1 → max index D-2 ≤ len-1 ✓. Fine, skip.

Wait, careful: backtrack loop for d in range(D, 0, -1) uses trace[d-1], needs trace indices 0..D-1 → trace must have length ≥ D. If we skip appending at found depth D, trace has indices 0..D-1 → trace[D-1] exists ✓ (used at d=D). Good.

Also D=0 case: only if n==0 and m==0 (excluded) — but what if n=0, m=0? We skip calling. If n=0, m>0: D = m as computed earlier. Fine.

Hmm wait, one more: what if n>0, m=0: D=n. d from n..1: at d, k=d=x-0... x=y? y=0 always, k=x. Trace fine.

What about found check `x >= n and y >= m`: with m=0, y=0 ≥ 0 always; need x ≥ n. ✓.

Now, potential issue: `v` indexing with k-1+off when k=-d: k-1+off = -d-1+off ≥ off-d-1 ≥ -1... when d = max_d = n+m and k=-d: guard k==-d prevents read. But k = -d+2 (first read of k-1): k-1 = -d+1, index off-d+1 ≥ 0 since d ≤ max_d → off-d ≥ 0 → fine.

k+1 index: k ≤ d-2 when reading (k≠d guard) → k+1 ≤ d-1 → index ≤ off+d-1 < len ✓.

Also `y = x - k` then `if x >= n and y >= m` — but the found condition should also be after snake; note x could be < n but y ≥ m? Then not found, continue — correct (we need both).

Wait, actually can y exceed m? y = x - k ≤ ... snake stops at y=m. x from v could give y > m? x ≤ n and y = x - k; if k very negative, y = x - k could exceed m? E.g., x=0, k=-5, y=5 > m=3? Can that state be reached? At depth d, k=-d: x = v[k+1+off] = endpoint on diagonal -d+1 at depth d-1, with y_prev = x - (k+1) = x + d - 1; down move → y = x + d. If that y > m, the path is invalid but algorithm still records it... Actually in forward Myers, states with y > m or x > n shouldn't be recorded? Standard implementations don't guard; the found condition x>=n and y>=m might trigger with y>m? Can x ≤ n and y > m simultaneously at record time? y = x - k > m with x ≤ n → k < x - m ≤ n - m. Possible for negative k. E.g., n=1, m=0: d loop, k=-1 at d=1: x = v[0+off] = 0, y = 1 > m=0. v[-1+off] = 0 recorded. Not found (x=0 < 1). Then k=1: found. Recording y>m states is harmless for correctness of backtrack? Backtrack: D=1, x,y = (1,0) endpoint (from k=1). d=1: k=1=d → right: px = prev[k-1+0] = trace[0][0] = 0. py = 0. equals: range(0, 0, -1) empty. "-" la[0]. state (0,0). done. script [("-","a0")] ✓. The stale over-recorded states (k=-1, y=1>m) are never used since backtrack follows found path. But could a wrong path be chosen in backtrack due to stale values? Backtrack decision uses prev[k±1] comparisons — these are genuine depth d-1 endpoints (possibly with y>m, but they're real recorded endpoints of the algorithm). The decision replicates forward exactly → the reconstructed path is exactly the forward path to (n,m). ✓. But one more subtlety: the equals loop uses la[i] for i up to x-1 ≤ n-1 ✓ and lb[py] with py ≤ y ≤ m-1? py = px - (k+1); px ≤ n... py could be ≥ m? py is y-coordinate of the depth d-1 endpoint which may exceed m in weird cases (as shown y can exceed m). Then lb[py] out of range → IndexError? Can the FOUND path pass through a state with y > m? The found path reaches (n, m). Backtracked states have y ≤ m and x ≤ n? Backtrack state after step: (px, py) — the depth d-1 endpoint on the path. Since the path from (0,0) to (n,m) is monotone (x,y non-decreasing), all intermediate states have x ≤ n, y ≤ m. ✓ Because the backtracked path is the forward path reversed, and forward path ends at (n,m) with monotone steps. So all states on path have coordinates ≤ (n,m). And lb[py], py ≤ m-1 when it's a "+" move (py < y ≤ m → py ≤ m-1 ✓). la[px] with px < x ≤ n ✓.

But the DECISION reads prev[k±1] — values possibly from non-path endpoints, fine (just comparisons).

Now think about whether forward algorithm could find x ≥ n and y ≥ m via an "invalid" state (y > m)? x ≥ n means x == n (x ≤ n? Is x bounded by n? x = v[...] + 1 could exceed n? v values ≤ n? snake stops at x = n; but x = v[k-1] + 1 where v[k-1] = n → x = n+1 > n! Then y = n+1-k. If y ≥ m too → found with x = n+1? Then backtrack: equals range(x-1=n, px-1, -1) → la[n] index out of range!! Hmm. Can v[k-1] = n (endpoint at x=n on diagonal k-1 at depth d-1) while not found? Endpoint x=n, y = n-(k-1); if y < m, not found — possible. Then at depth d, k = k-1+1 = k: right move from that endpoint: x = n+1. Then snake: x < n false → stops. Record v[k] = n+1. y = n+1-k ≥ ... not found unless y ≥ m. If y ≥ m → found with x = n+1 > n → BUG.

Can this happen? x = n+1, y = n+1 - k ≥ m and y ≤ ... The state (n+1, y) has x > n — the path went past the end of a. Is that possible in forward Myers without the found check triggering earlier? Path: ... endpoint (n, y') at depth d-1, y' = n - (k-1) < m (not found because y' < m). Then right move → (n+1, y'). Not found (x > n but check is x>=n and y>=m: x = n+1 ≥ n ✓, y = y' ≥ m? y' < m → not found). Then snake: x < n false. Record (n+1, y'). Later, another path could reach y ≥ m with x = n+1? To be found we need y ≥ m at x = n+1. From (n+1, y') moving down increases y... possible: e.g., a = [1], b = [1, 2]? Trim prefix: p=1, cores: ca=[], cb=[2]. n=0 — fine, different case.

Try a = [1, 2], b = [1, 3, 2]? Trim prefix p=1, suffix: ia[1]=2 == ib[2]=2 → s=1; then s < n-p=1? s=1, n-p=1 → stop. cores: ca=[2], cb=[3]. n=m=1. Myers: d=0: k=0: x=0,y=0; snake: ca[0]=2 vs cb[0]=3 no. v=0. d=1: k=-1: x=v[off-1+... k+1=0 → v[0+off]=0; y=1. snake: y<1 false... x<1 and y<1 → y=1 no. v[k]=-1... v[off-1]=0. x>=1? no. k=1: x=v[0+off]+1=1; y=0. snake x<1 false. v[off+1]=1. found: x>=1 ✓ y>=1? y=0 no. d=2: k=-2: x=v[off-1]=0, y=2. snake: y<1 no. v[off-2]=0. x>=1? no. k=0: v[k-1+off]=v[off-1]=0 < v[off+1]=1 → down: x = v[off+1] = 1, y = 1. snake: x<1 false. v[off]=1. found: x>=1 ✓, y>=1 ✓ → D=2, endpoint (1,1). Fine, x=n exactly.

Try to construct x>n found: need endpoint recorded with x=n+1, y≥m. From above analysis: need a path at depth d-1 reaching (n, y') with y' < m, then right move to (n+1, y'), then later reaches y ≥ m via down moves at x = n+1. Down moves from (n+1, y'): at depth d+1... k increases? Down decreases k. From (n+1, y'), down: (n+1, y'+1), k' = n+1-y'-1. Possible. Example: a = [1], b = [2, 1]? No common prefix... a=[1], b=[2,1]: n=1, m=2. Trim: p=0 (1≠2); suffix: ia[0]=1 == ib[1]=1 → s=1. cores: ca=[], cb=[2]. n=0. Not this.

a = [1, 2], b = [3, 1, 2]? suffix trim: 2==2 → s=1; then ia[0]=1 vs ib[1]=1 → s=2? Check: s=1: ia[n-1-1]=ia[0]=1, ib[m-1-1]=ib[1]=1 equal, and s < n-p=2 ✓, s < m-p=2 ✓ → s=2. Then s < n-p → 2<2 stop. cores empty → result = "="1, "="2? a=[1,2], b=[3,1,2]: script = [("-"?)...]: p=0 prefix none. cores empty, s=2: result = [] + [] + [("=",1),("=",2)] — but b has "3" first — missing "+"! BUG: suffix trimming must ensure the remaining prefixes align... Wait: if we trim common suffix s=2, then a[0:0] vs b[0:1]: b[0]="3" remains as core cb=[3], ca=[]. Let me recompute: ca = ia[p:n-s] = ia[0:0] = []; cb = ib[0:m-s] = ib[0:1] = [3]. Right — cores aren't both empty. ca=[] cb=[3]. _myers: n=0, m=1. d=0: k=0: x = v[off+1] = 0 (k==-d → x = v[k+1+off] = v[off+1] = 0); y=0. snake: x<0 false. v[off]=0. x>=0 ✓ y>=1? no. d=1: k=-1: x = v[off+0]=0, y=1. snake no. v[off-1]=0. found: x>=0 ✓ y>=1 ✓ → D=1 endpoint (0,1). Backtrack: d=1: prev=trace[0]=[0]. k = 0-1 = -1 = -d → down: px = prev[k+1+0] = prev[0] = 0; py = 0 - 0 = 0. equals: range(x-1=-1, px-1=-1, -1) empty. "+" lb[py] = lb[0] = "3" ✓. state (0,0). script [("+","3")]. Full: [("+","3"), ("=","1"), ("=","2")] ✓.

OK. Now try to actually construct the x>n bug: need a common subsequence reaching x=n with y<m... e.g., a = [1], b = [1, 2]: prefix trim p=1 → cores ca=[], cb=[2] → fine, no issue. To get endpoint x=n at depth d-1 with y<m before found: need n reached, y<m, and not (y>=m). But then a right move gives x=n+1. But wait — if x=n endpoint exists at depth d-1 with y<m, is (n, y') reachable... e.g., a=[2,1], b=[1,2,3]? Hmm, let me think: a=[2,1], b=[1,2,3]. p=0. suffix: ia[1]=1 vs ib[2]=3 no. cores: ca=[2,1], cb=[1,2,3]. n=2,m=3,max_d=5.
d=0: k=0: x=0,y=0: ca[0]=2 vs cb[0]=1 no. v[5]=0.
d=1: k=-1: x=v[4]=0, y=1. snake: ca[0]=2 vs cb[1]=2 ✓ → x=1,y=2; ca[1]=1 vs cb[2]=3 ✗. v[4]=1. found? x>=2 no. k=1: x=v[4]+1... v[k-1+off]=v[4]=0 → x=1, y=0. snake: ca[1]=1 vs cb[0]=1 ✓ → x=2,y=1. x<2 false stop. v[6]=2. found: x>=2 ✓, y>=3? no.
d=2: k=-2: x=v[3]=0, y=2. snake: ca[0]=2 vs cb[2]=3 ✗. v[3]=0. k=0: v[4]=1 < v[6]=2 → down: x=v[6]=2, y=2. snake: x<2 ✗. v[5]=2. found: x>=2 ✓ y>=3 ✗. k=2: k==d → right: x=v[5]+1 = 3, y=1. snake: x<2 ✗. v[7]=3. found: x>=2 ✓ y>=3 ✗. Not found.
d=3: k=-3: x=v[2]=0, y=3. snake: x<2 and y<3? y=3 ✗... y<3 false. v[2]=0. x>=2 ✗. k=-1: v[3]=0 < v[5]=2 → down: x=v[5]=2, y=3. snake: x<2 ✗. v[4]=2. found: x>=2 ✓ y>=3 ✓ → FOUND, endpoint (2,3), D=3. Good, x=n exactly. Note at d=2, k=2 we recorded x=3 = n+1 — stale, but found happened via k=-1 path. Backtrack follows found endpoint (2,3): d=3: k = 2-3 = -1. prev = trace[2]. Is -1 == -d? no. k != d ✓. prev[k+1 + d-1] = prev[0 + 2] = v_2[0] = 2; prev[k-1+d-1] = prev[-2+2] = prev[0] = v_2[-2] = 0. Condition prev[k+1..] < prev[k-1..] → 2 < 0 false → right: px = prev[0] = 0; py = 0 - (-2) = 2. equals: range(x-1=1, px=0, -1) → i=1: ("=", la[1]) = ("=", "1"). "-" la[px] = la[0] = ("-", "2"). state (0, 2). 

Hmm wait — state (0,2) at depth 1?? x=0,y=2 → k=-2. d=2 next: k = -2 == -d → down: px = trace[1][k+1 + d-1] = trace[1][-2+1+1] = trace[1][0] = v_1[-1] = 1? trace[1] = v[off-1:off+2] = v[4:7] = [1, 0, 2] (v_1[-1]=1, v_1[0]=0? wait v[4] at d=1: not overwritten at d=1 (k=0 not processed) → holds d=0 value 0. v[4]=0? At d=0, v[5]=0 written. v[4] initial 0. So trace[1] = [v[4], v[5], v[6]] = [0, 0, 2]. Hmm: v_1[-1] = 1 was written at d=1 k=-1 → v[4] = 1! Let me redo: d=1, k=-1: v[k+off] = v[-1+5] = v[4] = 1. Then k=1: v[6] = 2. So after d=1: v[4]=1, v[5]=0, v[6]=2. trace[1] = v[4:7] = [1, 0, 2]. Index mapping: slice index j ↔ k = j - (d) ... slice starts at off-d = 4 ↔ k = -1 → j = k+1... for d=1: j = k + 1. So trace[1][0] ↔ k=-1: 1 ✓; trace[1][1] ↔ k=0: 0; trace[1][2] ↔ k=1: 2 ✓.

Redo backtrack d=3: prev = trace[2]: slice v[off-2:off+3] = v[3:8] = [v_2[-2], v_2[-1], v_2[0], v_2[1], v_2[2]] = [0, 0, 2, 3, ...wait v_2[1] = v[7] = 3 (recorded at d=2 k=2: x=3)]. Hmm v[7] = 3 recorded at d=2. v[3:8] = [v[3], v[4], v[5], v[6], v[7]] = [0, 1, 2, 2, 3]. Wait v[4] was overwritten at d=1 to 1, and at d=2, k=-2 wrote v[3]=0; k=0 wrote v[5]=2; k=2 wrote v[7]=3. v[4] and v[6] hold d=1 values (1 and 2). So trace[2] = [0, 1, 2, 2, 3] ↔ k=-2..2.

Backtrack d=3, state (2,3), k=-1: k==-d(-3)? no. k != d(3) ✓. prev[k+1 + 2] = prev[0+2] = trace[2][2] ↔ k'=0: v_2[0] = 2. prev[k-1+2] = prev[0] ↔ k'=-2: 0. Down condition: 2 < 0 → false → right branch: px = prev[k-1+d-1] = trace[2][0] ↔ k'=-2: 0. py = px - (k-1) = 0 - (-2) = 2. equals: range(x-1=1, px=0, -1) → ("=", la[1]) = ("=", "1"). "-" la[px=0] = ("-", "2"). state (0, 2). ✓ matches forward: at d=3, k=-1 came right from k'=-2 at depth 2, endpoint (0,2) ✓ (v_2[-2] = 0 = x, y = 0+2 = 2 ✓).

d=2, state (0,2), k=-2 == -d → down: px = trace[1][k+1 + d-1] = trace[1][-2+1+1] = trace[1][0] = 1 (v_1[-1] = 1). py = 1 - (k+1) = 1 - (-1) = 2. equals: range(x-1=-1, px-1=0, -1) → empty. "+" lb[py] = lb[2] = "3". state (1, 2). ✓ forward: d=2 k=-2 came down from k'=-1 depth 1 endpoint (1,2) ✓.

d=1, state (1,2), k = -1 == -d → down: px = trace[0][k+1+0] = trace[0][0] = 0. py = 0 - 0 = 0. equals: range(0, -1, -1) → empty. "+" lb[0] = "1". state (0,0).

script reversed: ["+1", "+3", "=1", "-2"]? We appended in order: ("=",1), ("-",2), ("+",3), ("+",1) → reversed: ("+",1), ("+",3), ("=",1), ("-",2). Full result: a: +1? No wait — full result = prefix equals + core script + suffix equals. p=0, s=0. Result: [("+","1"),("+","3"),("=","1"),("-","2")]. Check a: "="+"-" in order: =1, -2 → [1, 2] ✓. b: "="+"+": =1, +1, +3 → [1,1,3] ✓. LCS length 1: hmm LCS(a,b) = ? a=[2,1], b=[1,2,3]: common subsequences: "1" or "2" → length 1 ✓. D = 4 = n+m-2*1 = 5-2 = 3? n+m - 2*LCS = 5-2 = 3 = D ✓ (D = #min+ #plus = 1+2=3 ✓).

Good, algorithm consistent. Now about the potential x = n+1 stale endpoints — they can be recorded but the found path never uses x > n... Actually could the FOUND endpoint itself have x > n? Found requires x ≥ n and y ≥ m. If a recorded endpoint has x = n+1, y ≥ m: possible? From example d=2 k=2 recorded (3,1). For found at x=n+1: need y = n+1-k ≥ m → k ≤ n+1-m. And path to (n+1, y) with y ≥ m. Hmm, suppose a=[1,2,3], b=[1,2,3,4,5]: prefix trim removes everything: p=3, cores empty. Not via Myers. 

Consider a = [1,2], b = [1,2,3]: prefix trim → cores ca=[], cb=[3]. fine.

To have Myers reach x=n+1: need a path consuming all of a then... a consumed fully at endpoint (n, y') with y' < m — but then found check: x>=n ✓ y>=m ✗ → continue. Then right move to (n+1, y'). Then to reach y≥m need more downs: (n+1, y'+j). Found at x=n+1 ≥ n, y ≥ m → D found with x = n+1!! Then backtrack: equals loop range(x-1=n, ...) → la[n] IndexError... Actually wait, also lb[py] fine. Hmm, is this reachable? Endpoint (n, y') not found means y' < m. But wait — can endpoint x=n occur with y' < m and the algorithm continues? Yes as in example above (d=1 k=1: (2,1) with n=2, m=3). Then a right move at deeper d from a path through (2,1): at d=2, k=2: right from (2,1)? k=2 right means from k'=1 at d=1: px = v_1[1] = 2 → x = 3, y = 1. Recorded (3,1) ✓ happened. Now for found at x=3: need y ≥ 3 at some later depth via downs from (3,1): (3,2) at d=3 k=0? From (3,1) down → (3,2), k=0. Then down → (3,3), k=-1 at d=4 → found x=3 ≥ n=2, y=3 ≥ m=3!! Let me construct such a case: a=[2,1], b=[1,2,3] was the example — at d=2, k=2 we had (3,1). d=3: k=... from (3,1), paths: down → (3,2) k=0 at d=3; is that computed? d=3, k=0: k==-d? no. k != d ✓. v_2[-1] < v_2[+1]? v_2[-1] = v[4] = 2 (endpoint (2,3)?? wait v[4] at d=2... hmm at d=2, k=-2 wrote v[3]=0; k=0 wrote v[5]=2; v[4] holds d=1 value v_1[-1] = 1. v_2[1] = v[7] = 3. Condition at d=3 k=0: v[k-1+off]=v[4]=1 < v[k+1+off]=v[7]=3 → down: x = v[7] = 3, y = 3 - 0 = 3. snake: x<2 ✗. v[5] = 3. found: x>=2 ✓ y>=3 ✓ → FOUND at (3, 3) with x = n+1 = 3!!

Wait, but earlier I found at d=3 k=-1 endpoint (2,3) — order: k=-3, -1, 1, 3? k=0 at d=3? parity: d=3, k in {-3,-1,1,3}. k=0 not processed at d=3! Parity mismatch. k must have same parity as d: k=0 has parity even, d=3 odd. So (3,3) on k=0 requires even d. Endpoint (3,1) recorded at d=2 (k=2, parity ✓). Down from (3,1) → (3,2) on k=1 at d=3. Down from (3,2) → (3,3) on k=0 at d=4. Check d=3: k=1: computed? k in {-3,-1,1,3}: yes k=1: k==-d? no. k != d ✓. v_2[0] = 2 vs v_2[2] = 3: 2 < 3 → down: x = v_2[2] = 3, y = 3 - 1 = 2. snake ✗. v_3[1] = 3. found: x ≥ 2 ✓, y ≥ 3 ✗. d=4: k=0: v_3[-1] = v[4] = 2 (d=2 value... v[4] last written at d=1 k=-1 → 1? wait at d=3 k=-1 wrote v[4] = 2 (endpoint (2,3)). So v_3[-1] = 2. v_3[1] = 3. Condition: v[k-1]=v_3[-1]=2 < v[k+1]=v_3[1]=3 → down: x = 3, y = 3. snake ✗. v[5] = 3. found: x ≥ 2 ✓ y ≥ 3 ✓ → FOUND at (3,3), x = n+1 = 3 > n = 2!!

So the bug is real: found endpoint x can exceed n. Then backtrack: x=3, y=3. d=4: k = 0. prev = trace[3]: v_3 band: slice v[off-3:off+4] = v[2:9] ↔ k=-3..3: [v_3[-3], v_3[-2], v_3[-1], v_3[0], v_3[1], v_3[2], v_3[3]] = [0, ?, 2, ?, 3, ?, ?]. k=0: k==-d? no. k != d ✓. prev[k+1+3] = prev[4] ↔ k'=1: v_3[1] = 3. prev[k-1+3] = prev[2] ↔ k'=-1: v_3[-1] = 2. 3 < 2? No → right: px = prev[2] = 2; py = px - (k-1) = 2 - (-1) = 3. equals: range(x-1=2, px=2, -1) → empty. "-" la[px] = la[2] → INDEXERROR (n=2, la has indices 0,1)!!

So I must guard against x exceeding n. Fix options:
1. Clamp: when recording, if x > n, cap? That breaks invariants.
2. Change found condition to x == n and y == m — but then algorithm might never "find" exactly at (n,m)? The endpoint recorded is (x,y) after snake; x ≤ n+1... Standard Myers: endpoints can have x = n+1? Hmm, in the standard formulation, the search terminates when a furthest-reaching path ends at (n, m) — actually the standard condition is D == M + N or v[off + M - N... ] hmm. Common formulation: "if v[k] >= n and v[k] - k >= m" — wait many implementations use `if x >= n and y >= m` and then clamp x, y to (n, m) at backtrack: since snake can't go beyond (n,m), the actual path end is (min(x,n), min(y,m))? If endpoint (n+1, 3) with m=3: the path: right move consumed a[n] = la[2]?? The right move from (2,3)→ wait how did x become 3 = n+1? Right move consumes one line of a: from (px,py)=(2,3)... px=2 = n, py = 3 = m. Right move → (3, 3) consumes a[2] — but a[2] doesn't exist! The right move at (px, py) = (n, m) should have triggered found BEFORE this move. I.e., the endpoint (2,3) = (n,m) should have been detected as found at the depth it was recorded... it was recorded at d=3, k=-1 as endpoint (2,3) — and found check there: x>=2 ✓ y>=3 ✓ → FOUND at d=3! 

Wait, I previously computed d=3, k=-1 → down branch: v_2[-1] = ? Let me recompute carefully. v_2 values: at d=2: k=-2: v[3] = 0. k=0: v[5] = 2. k=2: v[7] = 3. v[4] = v_1[-1] = 1 (from d=1). v[6] = v_1[1] = 2.

d=3: k=-3: x = v[k+1+off] = v[3] = 0; y = 3. v[2] = 0. x≥2? no. k=-1: condition: v[k-1+off] = v[3] = 0 < v[k+1+off] = v[5] = 2 → down: x = v[5] = 2, y = 2 - (-1) = 3. snake: x<2 ✗. v[4] = 2. found: x>=2 ✓ y>=3 ✓ → FOUND at (2,3), D=3! 

Earlier I mistakenly said at d=3 k=-1 endpoint (2,3) found — yes it IS found at d=3. So D=3, endpoint (2,3) = (n,m) exactly. The (3,3) scenario never materializes because found triggers first. 

In general: can endpoint x = n+1 be recorded BEFORE found? To record x = n+1 via right move, need previous endpoint (n, y') — at the time (n, y') was recorded, found check: y' ≥ m? If y' < m, not found, and later a right move from it → x = n+1 recorded. In my example, endpoint (2,1) recorded at d=1 (y'=1 < 3), then right move at d=2 k=2 → (3,1) recorded with x = n+1. So yes, stale endpoints with x=n+1 get recorded. But can a FOUND endpoint have x = n+1? Found requires y ≥ m at x = n+1. Path to (n+1, y≥m): last move either right from (n, y) or down from (n+1, y-1). Down from (n+1, y-1): that endpoint had x=n+1 > n, y-1 ≥ m-1... recursing, eventually the path passed through (n+1, y0) first time via right from (n, y0) where y0 ≥ ... hmm, need y0 such that at recording (n,y0) not found → y0 < m; then right → (n+1, y0); then downs to y ≥ m. In my example: (2,1) → right → (3,1) → down → (3,2) → down → (3,3). At d=3 k=1: endpoint (3,2) recorded, not found (y=2<3). At d=4 k=0: down from (3,2): x = v_3[1] = 3, y = 2. y=2? x=3, k=0 → y = 3? x - k = 3 - 0 = 3?? Hmm: down move from (px,py)=(3,2): new pos (3, 3). k = 3-3 = 0 ✓ d=4 ✓. x = px = 3 = v_3[1] = 3 ✓, y = x - k = 3 ✓. found: x ≥ 2 ✓, y ≥ 3 ✓ → FOUND at (3,3)!! But wait — would found have triggered earlier at d=3 k=-1 endpoint (2,3)? d=3 processes k=-3,-1,1,3 in order. k=-1 comes BEFORE k=1. At k=-1: down from v_2[0]: x = v_2[0] = 2, y = 2-(-1) = 3 → (2,3) → FOUND at d=3 before k=1 processed. So D=3, never reach d=4. 

But can I construct a case where the (2,3)-type found is NOT available but (3,3) is? Found at (2,3) requires a furthest-reaching path on some diagonal hitting (n,m). The found condition triggers at the FIRST d where ANY endpoint has x≥n and y≥m. Myers' correctness: minimal D is the first d where a path reaches (n,m). Any endpoint with x ≥ n and y ≥ m corresponds to a path reaching... x>n means path consumed more a-lines than exist — an INVALID path (a-move beyond end). Hmm, but can an invalid path be recorded as endpoint while no valid path reaches (n,m) at that d? Endpoint (n+1, y): path consumed n+1 a-lines — invalid. It arises from right move from valid endpoint (n, y') with y' < m. The right move consumes a[n] — nonexistent. Standard Myers assumes... in the standard algorithm, the found check is usually done differently: after computing v[k], check if v[k] == n and v[k] - k == m? Or the loop terminates when D exceeds... Let me think about whether x can exceed n+1: right from x=n+1 → n+2? Endpoint (n+1, y') not found (y' < m), right → (n+2, y'). Possible! So x can grow arbitrarily? Each right move needs previous endpoint on k-1 with x = current-1... these propagate.

Hmm, so potentially found endpoint could have x > n. Does that break minimality? The found check "x ≥ n and y ≥ m" might trigger at a d where the endpoint is (n+j, m+j') with j>0 — an invalid path. But does there exist a valid path of the same length d reaching (n, m)? A path to (n+j, m) has n+j rights and m downs, d = n+j+m. A valid path to (n,m) has d = n+m < current d. But minimal D means no valid path with smaller d exists — yet the algorithm found an invalid path of length d = n+m+j. Since invalid paths exist of length n+m (e.g., consume all a then all b: that's the "all minus then all plus" path = d = n+m always exists!). The path: n rights then m downs reaches (n, m) with d = n+m. Does the algorithm's furthest-reaching computation guarantee that at d = n+m, endpoint on diagonal k = n-m reaches (n,m)? Yes: furthest reaching path... Actually the standard theorem: D = n+m - 2*LCS and the algorithm finds it. And the found check `x >= n and y >= m`... the concern is triggering EARLY with an invalid endpoint (x>n). Could an invalid path reach (x>n, y≥m) at d < minimal valid D? Invalid path to (n+j, m+j'')... hmm, y ≥ m with x > n: d = x + y > n + m > minimal D. But minimal D ≤ n+m. Found triggers at first d with any endpoint x≥n,y≥m. At d = D_min (valid), the valid endpoint (n,m) triggers found. Could an invalid endpoint trigger found at some d < D_min? Invalid endpoint (x, y), x > n, y ≥ m: d = x+y ≥ n+1+m > n+m ≥ D_min. So invalid found-d > n+m ≥ D_min → valid found happens first. 

So: the first found d always has a valid endpoint? At d = D_min, there's a valid endpoint (n,m) (furthest reaching on diagonal k=n-m is (n,m)? The theorem says the algorithm finds the minimal D; at d = D_min some endpoint satisfies x≥n,y≥m. Could that endpoint be invalid (x>n) while no valid endpoint at d=D_min reaches (n,m)? An invalid endpoint at d = D_min: x+y = D_min ≤ n+m, x > n, y ≥ m → x+y ≥ n+1+m > n+m ≥ D_min, contradiction unless y... x > n → x ≥ n+1; y ≥ m → x+y ≥ n+m+1 > D_min. Contradiction. So at d = D_min, any endpoint with x≥n,y≥m must have x ≤ n... x ≥ n and x ≤ n → x = n, y = m. 

So the first found endpoint is exactly (n, m). The stale x>n endpoints recorded at earlier d's (when y < m) never cause found, and the backtrack from (n,m) never visits x>n states (monotone path). But the DECISION comparisons in backtrack read prev[k±1] which may be stale/invalid — that's fine as they replicate forward decisions exactly, and the forward path (the one reaching (n,m) first at D_min) is what we reconstruct. But careful: at D_min, multiple k may satisfy x≥n,y≥m? Only endpoints... the inner loop breaks at the first k (smallest k) that founds. Backtrack replicates from that exact (x,y)=(n,m). The path reconstructed follows forward decisions — consistent. ✓.

But hmm, one more check: in the backtrack, when computing equals range(x-1, px-1, -1) — x ≤ n ✓ since path states have x ≤ n. And "-" la[px] with px < x ≤ n ✓. "+" lb[py], py < y ≤ m ✓. 

Now also snake bounds: forward snake while x < n and y < m — x never exceeds n in recording? x = px + 1 could be n+1 (recorded stale) — that's allowed in v but never used on the found path. OK.

But wait — there's another subtle issue: stale endpoints with x = n+1 used in DECISIONS could cause the backtrack to choose a branch that the forward algorithm chose, leading to a state with x = n+1?? No: backtrack starts at (n,m) and each step strictly decreases total x+y by 1 (plus snake); all visited states are predecessors on the actual forward path, all with x ≤ n, y ≤ m. ✓.

Edge case: what if found never happens within max_d? d = max_d = n+m always has the path (all rights then all downs) → endpoint (n, m) on diagonal k = n - m... is it furthest-reaching? At d = n+m, k ranges -n-m..n+m; diagonal k = n-m is included (parity: n+m and n-m same parity ✓). Furthest reaching on that diagonal at d=n+m: x = n (can't do better; path with n rights and m downs). Found ✓. So loop always terminates ≤ max_d.

Now efficiency of snapshot slicing when d large but n,m small... fine.

Another perf point: for case 1 (20000 lines, 50 diffs), trace snapshots: D≈50ish, band slices small. Main cost: snakes. OK.

Let me now also double check the prefix/suffix trimming doesn't break minimality: trimming common prefix/suffix preserves LCS length and script structure — standard, safe. Note: trimming suffix when cores... careful with overlap: after prefix p, suffix limited to n-p, m-p. ✓. Edge: a == b entirely: p = n = m; s=0; cores empty → all equals ✓. a prefix of b: p=n; cores: ca empty, cb = b[n:m-s']... wait s computed with bounds s < n-p = 0 → s=0. ca = a[p:n] = [], cb = b[p:m]. Myers n=0 → all "+" ✓.

Now, one more consideration: lines could be any hashable? Spec says list[str]. Dict with str keys fine.

Let me write final code.

def diff_lines(a, b):
    # encode
    enc = {}
    uniq = []
    def _enc(lines):
        out = []
        get = enc.get
        for ln in lines:
            i = get(ln)
            if i is None:
                i = len(uniq)
                enc[ln] = i
                uniq.append(ln)
            out.append(i)
        return out
    ia = _enc(a); ib = _enc(b)
    n = len(ia); m = len(ib)
    res = []
    # prefix
    p = 0
    while p < n and p < m and ia[p] == ib[p]:
        p += 1
    # suffix
    s = 0
    while s < n - p and s < m - p and ia[n-1-s] == ib[m-1-s]:
        s += 1
    ap = a[:p]
    for ln in ap: res.append(("=", ln))
    ca = ia[p:n-s]; cb = ib[p:m-s]
    if ca or cb:
        res.extend(_myers(ca, cb, a, p, n-s, p, m-s))
    asuf = a[n-s:]
    for ln in asuf: res.append(("=", ln))
    return res

For _myers I need original lines for cores: la = a[p:n-s], lb = b[p:m-s]. Pass slices or pass indices. Slices fine.

def _myers(ca, cb, la, lb):
    n = len(ca); m = len(cb)
    max_d = n + m
    off = m  # hmm, off can be anything ≥ max needed index; v index k+off, k in [-max_d, max_d]. Use off = max_d? Or smaller: k ranges within [-m... actually k = x - y ∈ [ -m, n ]. Use off = m. Then v size n+m+1... but k in loop ranges -d..d with d up to n+m; but actual reachable k limited to [-m, n]? At depth d, k values processed in range(-d, d+1, 2) — includes unreachable k (e.g., k < -m would need y > m). Those get recorded with garbage-ish values (x from v[k+1] which may chain)... using off = m keeps array size n+m+1 and indices valid for k in [-m, n]; but loop k goes beyond → index k+off out of range for k > n or k < -m!! E.g., n=1, m=0: d loop up to max_d=1: d=1, k=-1: index off-1 = -1 → v[-1] — wraps to end of list! Bad. So off = max_d with size 2*max_d+2 is safest. Slight memory waste, fine. Actually use off = max_d, size 2*max_d+1 suffices (indices 0..2*max_d). k+off ∈ [0, 2*max_d] ✓.

    v = [0] * (2 * max_d + 1)
    trace = []
    D = -1
    for d in range(max_d + 1):
        found = False
        base = off - d  # slice start
        for k in range(-d, d + 1, 2):
            i1 = k - 1 + off
            i2 = k + 1 + off
            if k == -d or (k != d and v[i1] < v[i2]):
                x = v[i2]
            else:
                x = v[i1] + 1
            y = x - k
            while x < n and y < m and ca[x] == cb[y]:
                x += 1
                y += 1
            v[k + off] = x
            if x >= n and y >= m:
                found = True
                break
        if not found:
            trace.append(v[base: base + 2*d + 1])
        else:
            D = d
            break
    ...

Hmm wait: when not found we append; when found we break without appending. trace length = D (indices 0..D-1). Backtrack uses trace[d-1] for d=1..D → indices 0..D-1 ✓.

Wait, but when found at d=0? D=0 → trace empty, backtrack loop range(0,0,-1) empty, final snake while handles (x,y)=(n,m): but if D=0 then n=m=0? d=0 found requires x≥n,y≥m with x,y from k=0: x=v[off+1]=0,y=0 → n≤0, m≤0 → n=m=0, but we don't call in that case. So D≥1 when called. ✓.

Backtrack:

    script = []
    x = n; y = m
    for d in range(D, 0, -1):
        prev = trace[d - 1]
        k = x - y
        if k == -d or (k != d and prev[k + d] < prev[k + d - 2]):
            # index within prev: k' + (d-1) → k+1 + d-1 = k+d ; k-1 + d-1 = k+d-2
            px = prev[k + d]
            # down
            # equals a[px..x-1]
            for i in range(x - 1, px - 1, -1):
                script.append(("=", la[i]))
            script.append(("+", lb[px - k - 1]))
            x = px
            y = px - k - 1
        else:
            px = prev[k + d - 2] + 1
            for i in range(x - 1, px - 1, -1):
                script.append(("=", la[i]))
            script.append(("-", la[px - 1]))
            x = px - 1
            y = px - k

Wait right branch: px = prev[k-1 + (d-1)] = prev[k + d - 2]; then x_start = px + 1. New state (px, py) where py = px - (k-1) = px - k + 1. Hmm above I wrote y = px - k — wrong! py = px - (k-1). Let me recheck: previous state on diagonal k-1: (px, py) with py = px - (k-1). New state after backtrack step should be (px, py). In down branch: py = px - (k+1). In right branch: py = px - (k-1) = px - k + 1.

Check with earlier example (a=[2,1], b=[1,2,3]): d=3, state (2,3), k=-1, right branch: px = prev[k+d-2] = prev[0] ↔ k'=-2: v_2[-2] = 0 ✓. x_start = 1. equals range(x-1=1, px=0, -1) → i=1 → ("=",la[1]) ✓. "-" la[px] = la[0] ✓. new x = px = 0, y = px - k + 1 = 0+1+1 = 2 ✓ matches (0,2). ✓.

Down branch: py = px - (k+1) = px - k - 1 ✓ as written.

Check k+d and k+d-2 index bounds in prev: prev has length 2(d-1)+1 = 2d-1, valid indices 0..2d-2. k+d: for k=-d+2 (smallest with read): k+d = 2 ✓; k=d-2 (largest with read, k≠d): k+d = 2d-2 ✓. k+d-2: k=-d+2 → 0 ✓; k=d-2 → 2d-4 ✓. Guards: k==-d → no read of k+d-2; k==d → no read of k+d. ✓. Also k+d when k=-d? Guarded. ✓.

Final:
    while x > 0 and y > 0:
        script.append(("=", la[x-1]))
        x -= 1; y -= 1
    script.reverse()
    return script

Wait — at the end, is x == y guaranteed? Path at depth 0 on diagonal 0: after backtracking to depth 0 state, that's endpoint of d=0 snake: (x0, x0). So x==y, while loop consumes all. But defensive: while x > 0 and y > 0 — if somehow x≠y... by construction fine. Actually hmm: what if the path reaches depth 0 with x>0, y>0 but x≠y? Can't: k = x-y must be 0 at depth 0 (only diagonal 0 processed at d=0). ✓.

Hold on, also need to double check: the final while uses la — but these equals correspond to both a and b (diagonal 0 snake from origin). ✓.

Also, the equals appended in backtrack loops use la; correct since equals are common.

Now, one more performance improvement: avoid `("=", ln)` tuple creation overhead — negligible relative.

For the 20000-line case: prefix/suffix trim + Myers. Also consider: what if the 50 differing places include lines that repeat a lot? Doesn't matter.

Wait, potential perf trap in case 1: D could be larger than 50? "differ in about 50 places" → D ≈ 100. d loop 100 iterations × ~100 k values = 10k inner iterations + snakes. Snakes: core = 20000 lines mostly equal. Snake work total: bounded by core length + D² roughly? As discussed, endpoints on a diagonal are monotone non-decreasing, and snake starts... Let me just also consider the worst: total snake work could be O(core * D) = 2M — ~1-2s. Hmm, risk. Can it actually be that bad with 50 diffs? 

Snake at (d,k): start s(d,k), end e(d,k) ≥ s. On diagonal k, over d (fixed parity), e is non-decreasing. Start s(d,k) = v_{d-1}[k±1] (+adjust). Question: is s(d,k) ≥ e(d-2, k)? 

Claim: v_{d-1}[k+1] ≥ v_{d-2}[k]? Consider furthest reaching point on diagonal k at depth d-2: (e, e-k). Is there a path of length d-1 reaching diagonal k+1 at x ≥ e? From (e, e-k), one down move → (e, e-k+1) on diagonal k+1, length d-1. So furthest reaching x on diagonal k+1 at depth d-1 ≥ e. YES! Similarly v_{d-1}[k-1] ≥ v_{d-2}[k] (right move). So s(d,k) ≥ e(d-2,k) always. 

So on diagonal k, starts are ≥ previous ends → snakes are non-overlapping (except a re-check of one mismatch when start == previous end). Total snake work per diagonal ≤ diagonal length + (number of depths) ≤ (n+m) + D. Total over all k in [-D, D]: but diagonal lengths... sum over diagonals k=-D..D of (length of diagonal within grid) — each diagonal length ≤ min(n, m) roughly; sum ≤ (2D+1)·min(n,m)? That's the pessimistic bound 101*20000 = 2M. Hmm. But actually more refined: sum over all diagonals of their lengths = total cells in the band = O((n+m)·D)? The grid band with |x-y| ≤ D has ~(n+m)·D cells... hmm 40000*100/... = 4M cells worst. But snakes only cover matched cells! Snake cells are matching pairs (ca[x]==cb[y]). Total matched cells across the whole grid ≤ total matches in a... The snake work = number of cells scanned = matched advances + failed comparisons (≤1 per (d,k) → ≤ D²/2 ≈ 5000). Matched advances: each (d,k) snake's matched cells; on a diagonal, snakes are disjoint → total matched cells per diagonal ≤ diagonal length. Sum over diagonals of matched cells... but a matched CELL (x,y) with ca[x]==cb[y] lies on one diagonal; it can be scanned by snakes on that diagonal only, and per diagonal disjointly → each cell scanned ≤ ... well cells on diagonal k scanned by snakes at various depths — disjoint → each cell scanned at most once per diagonal? Disjoint intervals per diagonal → total scanned cells on diagonal k ≤ length of diagonal k. Sum over k of |diag k| = number of cells in band |x-y| ≤ D... no wait, sum over ALL diagonals k (only those with snakes, |k| ≤ D) of diag length. Diagonal k length ≈ min(n, m-k...) ~ up to 20000 each, and there are ~100 diagonals → up to 2M scanned matched cells?? But scanned cells are matched cells (ca[x]==cb[y]); total matched cells in the grid could indeed be huge (two similar sequences: most cells... no — matched cells = pairs where lines equal; for similar sequences, ~n·m cells match?? e.g., all lines equal "x": every cell matches). Hmm! If all 20000 lines are the same repeated line and they "differ in 50 places"... then D would be small only if... if a and b consist of the same repeated line with 50 insertions/deletions, D = 50ish. Snakes: on diagonal k, disjoint intervals, total ≤ diag length. Sum over k in [-50,50] of diag length ≈ 101 · 20000 = 2M matched-cell scans worst case. But do snakes actually extend on ALL those diagonals? A snake at (d,k) only happens for processed (d,k) pairs: ≤ D²/2 = 5000 pairs. Each snake is an interval; per diagonal disjoint; total scanned ≤ sum over (d,k) pairs of snake length. With 5000 pairs and disjointness per diagonal, total ≤ sum over diagonals of diag length ≤ 2M. Realistically: to have long snakes on many diagonals, you need many matching cells on off-diagonals... e.g., a = ["x"]*20000, b = ["x"]*20000 with 50 edits → diagonals k=-50..50 all fully matching → snakes could total ~2M? Let's see: at depth d, diagonals -d..d; snake on diagonal k at depth d starts at s ≥ e(d-2,k). e(d,k) for fully-matching diagonal: snake runs to... where does it stop? It stops at mismatch or boundary. If everything matches, snake runs to grid boundary (x=n or y=m). So at d=0, k=0: snake 0→20000 (20000 scans). Then found? x=20000=n, y=20000=m → found at d=0 (after trim, cores would be small though!). Oh wait — trimming! If a and b are nearly identical, prefix/suffix trim reduces the core drastically (diffs scattered → core ≈ whole thing though). Hmm: 50 diffs scattered across 20000 lines → core ≈ 19950 lines. Diagonals: with repeated lines, many diagonals have long matches. d loop: at d, k=-d..d. Snake on diagonal k at depth d: starts where? e(d-2,k) previous end. But wait — will the algorithm even reach d=50? D ≈ 50 (minimal). At each d ≤ 50, diagonals -d..d each get a snake. If lines are highly repetitive (e.g., all lines identical except 50 edits), then on diagonal k, the snake at depth d runs until... it runs until a mismatch. Mismatches occur only near the 50 edit points. So snake on diagonal k at depth d runs from s(d,k) to next mismatch — could be thousands of cells. And these are disjoint per diagonal, so total per diagonal ≤ 20000. Over ~101 diagonals → up to 2M matched-cell scans... but only ~D²/2 = 1250 (d,k) pairs for D=50 — each pair one snake; a snake can be long. Total ≤ sum over (d,k) of snake lengths, disjoint per diagonal → bounded by total diagonal band matched cells... which could genuinely approach 2M if snakes on all 101 diagonals each traverse ~20000 cells. Can that happen with only 1250 (d,k) pairs? 1250 snakes, disjoint per diagonal, ~25 snakes per diagonal (D/2 per diagonal... for D=50, each diagonal k is processed at ~25 depths) → each snake avg 800 cells → 1M scans. Hmm, possible with highly repetitive content? But wait: snake at (d,k) stops at first mismatch after start. Start s(d,k) ≥ e(d-2,k). For the snake to be long, the region after previous end must be mismatch-free. Total across a diagonal: intervals partition [start_0, ...] up to final end ≤ diagonal length. So yes, per diagonal total ≤ 20000; with 101 diagonals → ≤ 2.02M matched comparisons. Each matched comparison ~3 ops (while condition: x<n, y<m, ca[x]==cb[y], two increments) → maybe 0.3µs each → 0.6s. Plus snapshot and loop overhead small. Probably OK under 2s? Borderline but likely fine — 2M simple while-iterations ≈ 0.5–1.0s in CPython. Hmm. But is the worst case realistic for "differ in about 50 places"? If lines are mostly unique (typical text lines), off-diagonal matches are rare → snakes short except near diagonal 0. Realistically total snake work ≈ core length ≈ 20000. Fine.

Could optimize further: after computing, but let's not over-engineer. Actually, one cheap big optimization for repetitive content: none simple. Accept.

Hmm, actually wait: there's a smarter consideration. In the fully-repetitive worst case, does the algorithm really spawn snakes on far diagonals? Snake start s(d,k) comes from v_{d-1}[k±1]. For far diagonals (|k| large), reaching them requires many moves; v_{d-1}[k+1] for |k+1| large... the values would be small-ish? With all-identical lines, v_{d}[k] = min(n, ...)? Let's simulate small: a=b=1000 identical lines, but suppose 1 deletion making D=2... trim handles suffix/prefix, core tiny. The scary case needs diffs spread out. E.g., a = X x Y, b = X x' Y where around each edit... fine, D=2 per edit, snakes still mostly diagonal-0. Off-diagonal snakes at depth d start from neighbors' endpoints which are also near-diagonal-0 endpoints ± ... e.g., v_{d-1}[k+1] for k=5: endpoint on diagonal 6 at depth d-1 — how far along? Reaching diagonal 6 needs 6 net downs; the endpoint x ≤ something. With identical lines everywhere, snake on diagonal 6 from wherever it starts runs to the next mismatch — mismatches only at edit points! So yes, long snakes on off diagonals possible. OK, accept ~1s worst.

Alternatively, I could add the well-known optimization: process and clamp x to n... doesn't reduce snake work.

Another optimization to be safe: use local variable references inside loop (ca_local = ca, etc.), and maybe compare via `ca[x] != cb[y]` break pattern... The while loop is the hot spot; write it tight:

            while x < n and y < m and ca[x] == cb[y]:
                x += 1
                y += 1

Fine.

Also for the 1000-completely-different case, the d loop dominates: 2M iterations. Tighten: hoist v indexing. Let me estimate: per iteration ops: range next (C), compare k==-d (or k!=d and two list index + compare), one or two list index, add, subtract, while-check (x<n, y<m, ca[x]==cb[y] → 3 ops), v[k+off]=x store, found check (x>=n and y>=m). ~15 bytecodes → ~0.4µs → 2M → 0.8s. Plus slices 4M copies ~0.15s. Total well under 6s. 

Alternative: reduce snapshot copying by storing v slice only when needed... fine as is.

One more memory thought for trace: for case 2, trace total 4M pointers = 32MB + shared small ints. OK.

Now, an important correctness check on the found-break: we break the k loop at the FIRST k (most negative) that reaches (n,m). Backtrack reproduces exactly that path since decisions match. ✓.

Also potential issue: when found, we `break` out of the k loop, and skip appending trace for depth d. But then `trace` has length D. In backtrack, `prev = trace[d-1]` for d from D down to 1 → trace indices D-1 ... 0 ✓ all exist.

Also if D=0 — impossible when called (cores non-empty, at least one differs... hmm: cores non-empty means n>0 or m>0. If n>0, m=0: found at d=n ≥ 1 ✓. If both >0: ca[0] != cb[0]? Not necessarily! Cores could start with equal lines? Prefix trim stopped because ia[p] != ib[p] OR p == min(n,m). If p < min(n,m) then ca[0] != cb[0]. If p == n < m: ca empty. If p == m < n: cb empty. So when both cores non-empty, ca[0] != cb[0] → d=0 snake length 0, endpoint (0,0), not found (unless n=m=0). ✓ D ≥ 1.

Also suffix trim: analogous, ensures ca[-1] != cb[-1] when both non-empty. Not needed for correctness, just efficiency.

Now write the final code cleanly.

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    enc: dict[str, int] = {}
    uniq: list[str] = []

    def _encode(lines):
        out = []
        push = out.append
        for ln in lines:
            i = enc.get(ln)
            if i is None:
                i = len(uniq)
                enc[ln] = i
                uniq.append(ln)
            push(i)
        return out

    ia = _encode(a)
    ib = _encode(b)
    n = len(ia)
    m = len(ib)

    p = 0
    while p < n and p < m and ia[p] == ib[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and ia[n - 1 - s] == ib[m - 1 - s]:
        s += 1

    result = [("=", ln) for ln in a[:p]]

    ca = ia[p:n - s]
    cb = ib[p:m - s]
    if ca or cb:
        la = a[p:n - s]
        lb = b[p:m - s]
        result.extend(_diff_core(ca, cb, la, lb))

    result.extend(("=", ln) for ln in a[n - s:])
    return result

def _diff_core(ca, cb, la, lb):
    n = len(ca); m = len(cb)
    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)
    trace = []
    D = 0
    for d in range(max_d + 1):
        found = False
        for k in range(-d, d + 1, 2):
            km = k - 1 + off
            kp = k + 1 + off
            if k == -d or (k != d and v[km] < v[kp]):
                x = v[kp]
            else:
                x = v[km] + 1
            y = x - k
            while x < n and y < m and ca[x] == cb[y]:
                x += 1
                y += 1
            v[k + off] = x
            if y >= m and x >= n:
                found = True
                break
        if found:
            D = d
            break
        trace.append(v[off - d: off + d + 1])

    script = []
    x = n; y = m
    for d in range(D, 0, -1):
        prev = trace[d - 1]
        k = x - y
        if k == -d or (k != d and prev[k + d] < prev[k + d - 2]):
            px = prev[k + d]
            i = x - 1
            while i >= px:
                script.append(("=", la[i]))
                i -= 1
            script.append(("+", lb[px - k - 1]))
            x = px
            y = px - k - 1
        else:
            px = prev[k + d - 2] + 1
            i = x - 1
            while i >= px:
                script.append(("=", la[i]))
                i -= 1
            script.append(("-", la[px - 1]))
            x = px - 1
            y = px - k + 1
    while x > 0 and y > 0:
        script.append(("=", la[x - 1]))
        x -= 1
        y -= 1
    script.reverse()
    return script

Wait — in the right branch, x_start = px + 1, equals are a[px+1 .. x-1]: loop `while i >= px` would include la[px] — wrong! Equals should start at px+1. Use `while i >= px + 1` i.e. i > px. Let me fix: right branch: for i in range(x-1, px, -1): append la[i]. Down branch: equals a[px..x-1]: range(x-1, px-1, -1) → i >= px. ✓.

Double-check down: pre-snake pos (px, py+1); snake covers a[px..x-1]. ✓ so equals from px. Right: pre-snake (px+1, py); snake covers a[px+1..x-1]. ✓.

Also in right branch: y_new = py = px - (k-1) = px - k + 1 ✓.

Edge: max_d could be huge if both lists large and totally different — v size 2*(n+m)+1 fine.

Also note when n=0 and m=0 → skipped. When found at d where... all good.

One more check of `if y >= m and x >= n` ordering: check x >= n first? Order irrelevant.

Wait, one more subtlety in the found check within the k loop: standard implementations check `if v[off + m - n... ]`... our per-k check is fine.

Another subtlety: `trace.append(v[off - d: off + d + 1])` — when d = max_d and not found — can't happen (always found by max_d). But if found at d = max_d, we break without append ✓.

Now think again about whether backtrack decision conditions exactly mirror forward. Forward at depth d, diagonal k:
- down iff k == -d or (k != d and v_{d-1}[k-1] < v_{d+1}... careful: forward reads v[k-1+off] and v[k+1+off] — these hold depth d-1 values for k±1 (parity d-1 ✓, and indices within prev band as shown).
Backtrack: prev = trace[d-1], index of k' is k' + (d-1) = k' + d - 1. For k' = k+1: index k+d. For k' = k-1: index k+d-2. Condition forward: v_{d-1}[k-1] < v_{d-1}[k+1] → prev[k+d-2] < prev[k+d]. ✓ matches code: `prev[k + d] < prev[k + d - 2]` → down. ✓.

Forward down: x = v_{d-1}[k+1] = prev[k+d] = px ✓. Forward right: x = v_{d-1}[k-1] + 1 = prev[k+d-2] + 1 = px + 1 ✓.

Great.

Now, about performance of the `trace.append(v[off-d:off+d+1])` in case 2: total 4M element copies — slicing is C-speed, ~50ms. Fine.

Let me reconsider the worst realistic runtime for case 2 more carefully: d loop total inner iterations = Σ_{d=0}^{2000} (d+1)·(1) = ~2M. Per iteration cost: let's count more carefully the bytecode: loop overhead ~ 5 ops; condition: k == -d (compare), maybe k != d and two subscripts + compare; x assignment; y = x - k; while check: x < n (op), y < m (op), ca[x] == cb[y] (2 subscripts + compare) → fails immediately for completely different (assuming truly no equal lines — but "completely different" lists of 1000 lines: if they share even a few lines, D smaller, faster). v store; found check 2 ops. Total maybe ~25 bytecode ops ≈ 0.6µs (CPython 3.11 is faster, ~specialized). 2M × 0.6µs = 1.2s. Good.

Hmm, but one more thing: in the completely-different case, ca[x] == cb[y] never true, so while loop exits after one check ✓.

Now the equals-heavy case with D small: dominated by snakes, ~O(core + D²) typically. Good.

Potential worst-case pathological: 20000 lines where a and b share structure causing D=100 with tons of off-diagonal matches → ~2M snake steps ~ 1s. Under 2s, probably OK. To be safer, I could add a small optimization: limit... eh. Another standard optimization: none. I'll keep it.

Actually, wait — I want to double check the claim "per diagonal, snake starts ≥ previous endpoint on that diagonal," ensuring no re-scan blowup. Proof sketch above: s(d,k) is derived from v_{d-1}[k±1], and v_{d-1}[k±1] ≥ v_{d-2}[k] because from the furthest-reaching point on diagonal k at depth d-2, one move (down or right respectively) reaches diagonal k±1 at depth d-1 with x ≥ that point... wait need x-coordinate: from (e, e-k) on diagonal k, down move → (e, e-k+1) on diagonal k+1, x = e → v_{d-1}[k+1] ≥ e ✓. Right move → (e+1, e-k) on diagonal k+1? No — right move from diagonal k goes to diagonal k+1 too! Right move: x+1 → diagonal k+1. Down move: y+1 → diagonal k-1. Oops: down move decreases k (y increases, x same → k = x-y decreases). Let me redo: from (e, e-k) on diagonal k: down → (e, e-k+1): k' = e - (e-k+1) = k-1. So down reaches diagonal k-1 → v_{d-1}[k-1] ≥ e. Right → (e+1, e-k): k' = k+1, x = e+1 → v_{d-1}[k+1] ≥ e+1 > e.

Now s(d,k): down case: s = v_{d-1}[k+1] ≥ v_{d-2}[k-1]?? Hmm I need s(d,k) ≥ e(d-2, k). s(down) = v_{d-1}[k+1] ≥ (by the same argument applied to diagonal k+1 at depth d-2) v_{d-2}[k] ✓ (right move from diagonal k at d-2 reaches k+1 at d-1 with x ≥ e+1). s(right) = v_{d-1}[k-1] + 1 ≥ v_{d-2}[k] + 1 > e ✓ (down move from diagonal k at depth d-2 reaches k-1 at depth d-1 with x ≥ e). 

So s(d,k) ≥ e(d-2,k) ✓. Snakes per diagonal are non-overlapping (touching at endpoints allowed → one extra failed comparison each). Total snake work ≤ Σ_k (len(diag k) + D) — but only diagonals with |k| ≤ D matter, and matched-cell scans total ≤ matched cells within band... fine as analyzed. Good, no quadratic blowup beyond stated.

Also, note: matched-cell scans total ≤ number of matching cells in band ≤ n+m per... no: sum over diagonals |k|≤D of diag length ≈ (2D+1)·min(n,m)?? diag k length ≈ min(n, m) roughly for |k| small. So worst ~2M as said. OK.

Let me also make sure about int equality vs string equality consistency: two distinct string objects that are == map to same int ✓. Strings hash consistently ✓.

Should I worry about lines being equal but of different types? Spec: str only.

Final code assembly. Also handle the trivial quick path: if a == b: return all equals? The prefix/suffix trim covers it (p = n = m → cores empty, result all "="). ✓. If not a: return [("+", ln) for ln in b] — covered: n=0, p=0, s=0, ca=[], cb=all → _diff_core with n=0: d loop... n=0, m>0: max_d=m. d=0: k=0: k==-d → x = v[off+1] = 0; y=0; snake: x<0 ✗; v[off]=0; found: x>=0 ✓ y>=m? ✗. d=1: k=-1: x = v[off+0] = 0, y=1 → ... k=-1: down... continues until d=m: k=-m: x = v[k+1+off] = v_{m-1}[-m+1] = 0? y = 0-(-m) = m → found ✓ D=m, endpoint (0, m). Backtrack d=m..1: k = -d always: k == -d → down: px = prev[k+d] = prev[0] = 0 (trace[d-1] slice index 0 ↔ k'=-(d-1), value = 0 ✓ since x stays 0). equals: range(x-1=-1, px-1=-1, -1) empty ✓. "+" lb[px-k-1] = lb[0+d-1] = lb[d-1]. x=0, y=px-k-1 = d-1... wait new y = px - k - 1 = 0 + d - 1 = d-1 ✓. At d=1: "+" lb[0]; y=0. ✓. Script: [("+", lb[m-1]), ..., ("+", lb[0])] reversed → [("+",lb[0]), ..., ("+",lb[m-1])] ✓.

m=0, n>0: similar → all "-" ✓.

Also both empty: ca, cb empty → skip → result [] ✓.

Let me also double check the down-branch new y vs next iteration k: after down, state (px, py), py = px - (k+1); next d-1, k_next = x - y = px - py = k+1 ✓ consistent.

Right: state (px, py), py = px - k + 1; k_next = px - py = k - 1 ✓.

One more: in down branch, `lb[px - k - 1]`: py = px - k - 1, and the "+" line is lb[py] ✓ (down move consumed b at index py, since pre-snake y = py+1).

Now finalize. I'll inline _diff_core as nested or module-level private function. Also add `from __future__` not needed (3.11).

Micro-optimizations in hot loop: bind v, ca, cb, n, m, off as locals (they are locals already in function). The inner `for k in range(-d, d+1, 2)` fine.

Maybe also convert ca/cb... they're already int lists ✓.

Small thing: `trace.append(v[off - d: off + d + 1])` — for d up to 2000, slicing each iteration: total 4M — but slicing creates new list each time: allocation overhead 2000 allocations, fine.

Consider using the found check as `if x >= n:` then `if y >= m:` — negligible.

Let me also think: should the found check be `x >= n and y >= m` — with stale x>n endpoints at earlier d, found could trigger at d where endpoint (n+1, y≥m)?? Earlier I proved impossible before D_min... wait I proved: at any d, an endpoint with x ≥ n and y ≥ m has x+y ≥ n+m+1 if x > n → d ≥ n+m+1. And valid found happens at D_min ≤ n+m. Since we break at first