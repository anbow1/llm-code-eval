Implement Myers' O(ND) algorithm. Need to reconstruct edit script. Classic approach: forward Myers with V array and trace of V snapshots, then backtrack. Or use the "middle snake" divide-and-conquer. Simpler: keep trace of all V arrays per D step — memory O(D^2) worst case; for completely different 1000 lines, D ~ 2000, trace is 2000 arrays of size ~2000 → 4M entries, fine. For 20000 lines with 50 diffs, D small, fine.

Actually trace memory: D steps each with V of length up to 2D+1 → O(D²). For D=2000, ~2000*2001 = 4M ints, okay.

Implementation: standard Myers with trace, backtrack to produce script.

Standard backtrack: from (x, y) at d = D, using V trace. For k in range(-d, d+1): find which k was used. Classic algorithm:

```
def diff(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    v = {1: 0}  # or list
    trace = []
    # use dict keyed by k, storing x
    for d in range(max_d + 1):
        trace.append(dict(v))
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v.get(k-1, ...) < v.get(k+1...)):
```

Careful with dict-based. Let me write with dict:

```
v = {1: 0}
trace = []
found = False
for d in range(n + m + 1):
    trace.append(dict(v))
    for k in range(-d, d + 1, 2):
        # decide down or right
        if k == -d or (k != d and v.get(k - 1, -1) < v.get(k + 1, -1)):
            x = v.get(k + 1)  # down: from k+1
        else:
            x = v.get(k - 1) + 1  # right
        ...
```

Hmm, dict default handling: v.get(k+1) may be None at boundaries. At k = -d, we take down from k+1 = -d+1 which exists (from previous step, value... at d-1 step, k+1 = -(d-1) was computed). Actually v holds values from previous d iteration. At iteration d, k ranges -d..d step 2. v contains entries for k in -(d-1)..(d-1) step 2 (from previous iteration, plus initial {1:0} which covers d=1 case: k=1 at d=1 needs v[0]? no—at d=1, k=-1 uses down from k=0: v.get(0)... v={1:0}, k=-1: k==-d so take x = v.get(k+1)=v.get(0) which is None!). Hmm.

Standard fix: initialize v = {1: 0}; then at d=0, k=0: k==-d? no, k==d, so take right: x = v[k-1]+1 = v[0]+1 → KeyError since v[0] missing. Hmm.

Better: use the classic list-based formulation with offset. Let max size = n+m+2, offset = n+m+1? Use list v of length n+m+1, index k+offset where offset = n (or n+m). Initialize v[offset+1] = 0? The classic:

```
v = [0] * (n + m + 2)
offset = n + 1  # index k+offset
v[1 + offset] = 0  # v[1] = 0 in 1-indexed
for d in range(0, n+m+1):
    trace.append(v[:])  # snapshot — expensive O(N) each → O(N·D). For D=2000, N=1000 → 2M ints, ok. For D small, fine.
```

Actually snapshot copying a list of size ~n+m each step: O(D·(N+M)). For completely different 1000: D=2000, N+M=2000 → 4M, fine. For 20000 lines 50 diffs: D≈100, copy 40002-element list 100 times → 4M ops, fine.

But careful: copying before modification each d. Then in backtrack, use trace[d].

Standard backtrack (from Myers paper):

```
def backtrack():
    x, y = n, m
    script = []
    for d in range(len(trace) - 1, 0, -1):
        v = trace[d]
        k = x - y
        if k == -d or (k != d and v[k-1+offset] < v[k+1+offset]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[prev_k]... 
```

Wait, condition in backtrack: whether the move at (d, k) was "down" (from k+1) or "right" (from k-1). Down iff k == -d or (k != d and vprev[k-1] < vprev[k+1]). Then:

prev_x = trace[d-1][prev_k], prev_y = prev_x - prev_k. Then while x > prev_x and y > prev_y: diagonal — a[x-1]==b[y-1], append ("=", a[x-1]), x-=1, y-=1. Then if x == prev_x: append ("+", b[y-1]); y -= 1 (down move). else append ("-", a[x-1]); x -= 1.

Note k in the loop over each d: at step d we ended at some (x,y) with x-y=k. Backtrack: start at final d where we found solution.

Forward search:

```
def shortest_edit(a, b):
    n, m = len(a), len(b)
    off = n
    v = [0]*(n+m+2)  # indices k+off for k in [-n, m]... need k from -max to max where max <= n+m? k = x-y, x<=n, y<=m, so k in [-m, n]. But during search k ranges -d..d, d<=n+m. Use size n+m+1 with offset = m? k ranges -m..n, so index k+m in [0, n+m]. Size n+m+1.
```

Hmm, careful: v[k] in Myers stores furthest x on diagonal k. Diagonals needed: k from -m to n. So array of size n+m+1, offset m.

But in Myers loop, v[1] = 0 initialization corresponds to k=1 having x=0 (so that at d=1, k=0, taking "down" from k=1 gives x=0, y=0... wait down from k+1: x = v[k+1], y = x-(k+1). At d=1,k=0: x=v[1]=0, y=-1? Hmm no.

Actually the standard Myers pseudocode:

```
v[1] = 0
for d in 0..(M+N):
    for k in -d..d step 2:
        if k == -d or (k != d and v[k-1] < v[k+1]):
            x = v[k+1]        # down
        else:
            x = v[k-1] + 1    # right
        y = x - k
        while x < N and y < M and a[x] == b[y]:
            x, y = x+1, y+1
        v[k] = x
        if x >= N and y >= M: return d
```

With v[k] meaning furthest x reached on diagonal k. Init v[1]=0 so that at d=1... hmm at d=0, k=0: condition k==-d true → x = v[1] = 0, y = 0, snake advances. Good. Actually at d=0 k=0: k==-d so take down from k+1=1, x=v[1]=0, y=x-k=0. Good, that's the starting point.

Note k range for diagonals during search: k in [-d, d], d can exceed m or n but snake bounds x<n, y<m limit. v array index k+m must be in [0, n+m]: k in [-m, n]. During search k up to d, d up to n+m... but if k > n then x >= n impossible... Actually Myers as written loops k from -d to d regardless; v[k-1]+1 accesses may go out of bounds. In practice when x >= n we'd stop. To be safe, size array n+m+2 with offset m and guard: break condition when found. Standard implementations use array size N+M and offset M, works because once x>N or y>M it stops. Let me just use size = n+m+1, offset = m, and clamp the k loop: k in range(-d, d+1, 2) but skip if k+m out of range? Actually if d > n+m impossible... d max is n+m. When k > n: taking right from k-1 gives x = v[k-1]+1 where v[k-1] was set... Hmm, could reach k=n+something? x<=n always after clamp? Snake stops at x<n. x after move = v[k-1]+1 ≤ n+1? v[k-1] ≤ n so x ≤ n+1, then y = x-k could be negative if k > x... The standard implementation (e.g., in "myers diff" simple versions) just allocates (n+m+... ) big enough and it works. Common practice: max_size = n + m + 2? Let me think: worst x = n+1? Then k could be up to... y = x - k ≥ 0 requires k ≤ x ≤ n+1? Hmm.

Simpler robust approach: use dict for v with get defaults. Let me write with dict carefully:

```
v = {1: 0}
trace = []
d = 0
while True:
    trace.append(dict(v))
    for k in range(-d, d+1, 2):
        # down if k == -d or (k != d and v.get(k-1) < v.get(k+1))
        if k == -d:
            x = v[k+1]           # exists? k+1 = -d+1; at d, previous step covered -(d-1)..(d-1); -d+1 = -(d-1), exists if d>=1. At d=0, k=0: x = v[1] = 0. OK.
        elif k != d and v.get(k-1, -1) < v.get(k+1, -1):
            x = v[k+1]
        else:
            x = v[k-1] + 1
```

Hmm v.get(k+1) at k=d: k==d handled by else. At k==-d, v[k+1] must exist: yes since -(d-1) was frontier at previous step... at d=0: v={1:0}, k=0, k==-d → x=v[1]=0. ✓.

But wait, at step d, v currently holds values from step d-1 (we snapshot before updating). When k==-d (down move), k+1 = -(d-1), which is within previous frontier. ✓. When else-branch k==d: k-1 = d-1 exists ✓. When k==-d handled first. Mixed: for -d < k < d, both k±1 in previous frontier. ✓. Also v.get(k-1) for k=-d+... covered.

Also note k+1 when k = d-1... at step d, k = d: else branch uses v[k-1]. ✓.

Edge: v.get(k-1, -1) — if k-1 not in v... for -d<k<d both present. So defaults never needed except... fine, keep default -1 for safety.

Then y = x - k; snake; v[k] = x; if x >= n and y >= m: found at depth d, record trace snapshot? Need trace[d] with final v[k]. Snapshot at loop top captures v before updates at this d. So instead, when found, we should store the final v too, or handle backtrack for the last step using a final snapshot. Approach: append dict(v) to trace at the top each iteration; after finding at depth d, the last diagonal's x is in v[k] but not in trace[d]. Simplest: after the k loop, if found, trace.append(dict(v))? Then trace has length d+1 (indices 0..d), and backtrack uses trace[d] for current and trace[d-1] for previous. Let me restructure:

```
trace = []
v = {1: 0}
found_d = None
for d in range(n + m + 1):
    trace.append(dict(v))
    for k in range(-d, d+1, 2):
        ...compute x, y, snake...
        v[k] = x
        if x >= n and y >= m:
            trace.append(dict(v))
            found_d = d
            break
    if found_d is not None:
        break
```

Then backtrack from d = found_d down to 1 (or 0):

```
script = []
x, y = n, m
for d in range(found_d, 0, -1):
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k-1] < v[k+1]):
        prev_k = k + 1
        move = "down"
    else:
        prev_k = k - 1
        move = "right"
    # hmm, but v here is final v of step d (includes this step's updates). The condition comparing v[k-1] vs v[k+1] — in Myers backtrack these are values from step d-1. Since at step d we only updated v[k] entries with same parity as d, and k±1 have opposite parity, trace[d] entries at k±1 equal trace[d-1] values. ✓ So using trace[d] works.
    prev_x = v[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        script.append(("=", a[x-1]))
        x -= 1; y -= 1
    if move == "down":
        script.append(("+", b[y-1]))
        y -= 1
    else:
        script.append("-", a[x-1])
        x -= 1
# after loop, d=0: remaining diagonal from (x,y) to (0,0) — all equals
while x > 0 and y > 0:
    script.append(("=", a[x-1]))
    x -= 1; y -= 1
```

Wait — at d=0, the whole path is a snake along k=0, so remaining a[:x] are equals (and x==y). Actually x must equal y at k=0, and since diagonal 0 from origin, all matched. So append a[:x] reversed as "=".

But careful: the backtrack condition uses v[k-1] < v[k+1] to decide down vs right — but this must match the forward decision. In forward, down iff k==-d or (k != d and v_{d-1}[k-1] < v_{d-1}[k+1]). In trace[d], entries at k±1 have parity opposite to d, so they weren't updated at step d (only entries with k ≡ d mod 2 updated), hence trace[d][k±1] == trace[d-1][k±1]. ✓. And when k==-d, forward took down; backtrack same. When k==d, forward took right (since k!=d false → else). Backtrack condition: k==d → second clause false → else → right. ✓.

Edge: prev_x = v[prev_k] — is it guaranteed ≤ x and prev_y ≤ y? In Myers yes.

Also potential: prev_x could be... fine.

One subtlety: equality of lines — hashable strings, fine.

Edge cases: empty a or b. n=0: x starts 0, y=m. found_d: at d=... Let's check: a empty. v={1:0}. d=0: k=0, k==-d → x=v[1]=0, y=0, snake: x<0 false → v[0]=0, x>=0? x>=n=0 ✓ and y>=m? if m>0 no. d=1: k=-1: down x=v[0]=0, y=1, snake x<0 false; v[-1]=0; x>=0 ✓, y>=m? only if m==1. Continue... k=1: k==d → right x=v[0]+1=1 → y=0, x=1 > n=0... snake x<n false. v[1]=1. x>=n ✓ but y>=m only if m==0. Hmm, for n=0, m=5: we need down moves only, k=-5 at d=5: x=v[-4]=0, y=5, snake stops, x>=0, y>=5 ✓ → found at d=5. Good. Then backtrack: trace includes d=0..5 plus the extra append. Backtrack handles: at d, k=x-y=-d → down. ✓.

What if both empty: n=m=0. d=0: k=0, x=0, y=0, snake none, x>=0 and y>=0 → found_d=0. trace = [ {1:0}, {1:0, 0:0} ] (extra append). Backtrack loop range(0,0,-1) empty, then while x>0... empty. Script = []. ✓.

Hmm wait, found at d=0: x>=n=0 and y>=m=0 immediately at k=0 after v[0]=x=0. Yes.

Check condition x >= n and y >= m: y = x - k after snake. ✓.

Another subtlety: the check should happen after snake, using current x, y. ✓.

Also possible issue: at k == d when computing else branch x = v[k-1]+1: v[k-1] exists (previous frontier has k-1 = d-1). ✓. At k == -d branch, v[k+1] exists. For d=0, v={1:0}: k+1=1 ✓.

Now, worst-case D for completely different 1000 lines: D = n+m = 2000 iterations, each with up to d k-values → total k iterations ~ D²/2 = 2M, each doing dict ops + snake. Snake per iteration O(1) amortized total? Total snake length over all is O(D·avg?) — actually snake advancement is monotonic in each diagonal, total snake work bounded by O(n·D)? No — each diagonal advances monotonically, total across all diagonals ≤ ... each step advances at most one diagonal by its snake length; sum of snake lengths per d-step can be large. Worst case total snake = O((n+m)·D)? Hmm. Each diagonal's total snake advancement ≤ min(n, m) per... Actually x on diagonal k is monotonic nondecreasing over time, and x ≤ n, so total snake work ≤ (number of diagonals visited... no, per diagonal total advancement ≤ n). Number of diagonals = 2D+1 ≤ 2(n+m)+1. Total snake work ≤ min over... each diagonal: total advancement across all d ≤ n (since x only grows, bounded by n... but x can exceed n? snake stops at x<n, moves give x ≤ v[k-1]+1 ≤ n+1). So total ≤ (2D+1)·... roughly (n+m)·... hmm for n=m=1000 different: D=2000, diagonals 4001, each x ≤ 1001 → total snake ≤ 4M worst case but actually strings are completely different so snakes are length 0 mostly; but even worst case 4M operations fine.

But wait — "two completely different lists of 1000 lines in under 6 seconds": D = 2000, dict operations 2M — fine in Python (~1-2s). Memory: trace 2001 dicts, each with up to 2001 entries → 4M entries in dicts, each dict entry ~ heavy... 2001 dicts * average 1000 entries = 2M entries, dict overhead ~100 bytes/entry → 200MB. Hmm, that could be heavy. Better use lists with offset.

List approach: v = list of size n+m+1 with offset m, index k+m. But k can go out of [-m, n]? During forward search with k in [-d, d], d ≤ n+m. When could k > n or k < -m? x = v[k-1]+1 for right moves; snake keeps x < n then x = v[k-1]+1 where v[k-1] ≤ n so x ≤ n+1, y = x - k. For k > n... would require v[k-1] = n meaning diagonal k-1 reached x=n i.e. y = n-(k-1) < 0, impossible since y ≥ 0 and snake stops at y<m too. Actually v[k] values satisfy x = v[k] ≥ 0 and y = x - k ≥ 0... hmm not guaranteed: v[k] = x where y = x-k could be... after a move, y = x-k where x from neighbor. At k=d, right move: x = v[d-1]+1, y = x-d. v[d-1] has y' = v[d-1]-(d-1) ≥ 0, so x ≥ d, y ≥ 0. ✓. So always 0 ≤ y ≤ m? y = x-k, and snake stops when y≥m or x≥n; after move y could be... down move: x = v[k+1], y = x-k = (prev y) - 1. Could y be negative? Down move at k=-d: x = v[-d+1], y = x+d-1... wait y = x - k = x + d ≥ 0. Fine. Generally y ≥ 0 always. And x ≤ n+1? After right move x = v[k-1]+1 ≤ n+1 but then snake won't advance (x<n false), y = x-k. Hmm if x = n+1 then y = n+1-k. This entry v[k] = n+1 could then be used... but if x ≥ n and y ≥ m we've terminated. If not terminated, could we continue with x = n+1? Only matters if it leads to out-of-bounds k later. Standard Myers implementations (the simple trace version, e.g., from "The Myers diff algorithm" by James Coglan) use array sized N+M+2 and it's proven fine because we stop when x≥N and y≥M. Actually the concern: with x = n+1 (past end), we might keep exploring. But the algorithm terminates when x>=n and y>=m; before termination, paths with x=n+1 have y = x-k; termination requires reaching (n, m). Hmm.

Let me just be safe: size the array generously: offset = m, size = n + m + 2? k ranges... to be safe use offset = m + 1? Let's reason: can k exceed n? k = x - y with x ≤ n after snake (snake stops x<n then... no wait, during snake x goes up to at most n; after a move x = v[k-1]+1 could be n+1 only if v[k-1] = n, i.e., diagonal k-1 reached x=n meaning y=n-(k-1) ≥ 0, and y < m at that point or we'd have terminated... y ≥ m would mean n-(k-1) ≥ m → k ≤ n-m+1, and termination would have triggered. So if v[k-1] = n without termination, y=n-(k-1) < m, i.e., k-1 > n-m, so k > n-m+1. Then new x = n+1, y = n+1-k < n+1-(n-m+1) = m... y ≤ m-1? y = n+1-k < m. Hmm wait we need y ≥ 0: k ≤ n+1. So k can reach n+1 at most (since x = n+1 and y ≥ 0 → k ≤ n+1). Then next right move from k = n+1: v[k-1] = v[n] = n+1?? No — v[n] ≤ n+1... this could cascade: k = n+2, x = n+2, y = 0. Then k up to n+m? Hmm: from k=n+2, x=n+2, y=0, snake none (x≥n). Right move: x = n+3, y = 0... k = n+3... This could go up to k = n+m? y stays 0? Wait right move increments x by 1 and k by 1, keeping y constant at 0. So k could grow up to... x = k, y = 0, up to x = n+m?? That happens only if... hmm, but is it reachable? For k > n to be reached, we need some path. Actually in Myers correctness, the algorithm finds solution at d = D ≤ n+m, and k = x-y = n-m at the end. Exploration at k beyond n or below -m is wasted but the standard bounded loop still does it? Let's check the guard: the loop is `for k in range(-d, d+1, 2)` — no bound by n, m. Many implementations add: only consider k where v[k-1] within bounds etc. To avoid index errors, I'll size array = n + m + 3 with offset = m + 1, i.e., k ranges [-m-1, n+1] fits; but k could grow to n+m as argued? Let's check: right move requires condition not down: down iff k==-d or (k≠d and v[k-1]<v[k+1]). For large k > n: v[k-1] vs v[k+1] — v[k+1] hasn't been set (it's from previous step: k+1 ≤ d-1? k=d-1... hmm).

Let me think again whether k can exceed n. Claim: x = v[k] ≤ n + 1? After right move x = v[k-1]+1. If v[k-1] ≤ n then x ≤ n+1. Can v[k-1] > n+1? Inductively v[k-1] = x after snake; snake only runs while x < n, so snake final x ≤ n... wait snake can end at x = n exactly (loop while x < n). After a move x = v[k-1]+1. So v[k] ≤ max(n, v[k-1]+1). By induction v[k] ≤ n+1? Base v[1]=0. Hmm, v[k-1]+1 ≤ n+2 if v[k-1] = n+1. Can v[k-1] = n+1? That requires a right move from v[k-2] = n, i.e., x = n+1, y = n+1-(k-1). Then snake: x ≥ n → no. And termination check x ≥ n and y ≥ m: y = n+1-k ≥ m? If y ≥ m then... y ≥ m and k = x-y ≤ n+1-m... if y ≥ m, then k ≤ n+1-m, and termination would require also x ≥ n ✓ → we'd have terminated at that point? Termination is checked when v[k] is set. If x = n+1 ≥ n and y ≥ m → terminate. If y < m, no terminate, and v[k-1] = n+1 stored. Then from diagonal k-1, right move to k: x = n+2. Hmm so x can grow beyond n+1. But wait — can v[k-2] = n with y = n-(k-2) < m? That means diagonal k-2 has x=n, y = n-k+2. For this not to terminate need y < m i.e. n-k+2 < m → k > n-m+2.

Hmm, but actually can x exceed n meaningfully? A path that goes past x=n has y < m still, and these paths... in Myers, once x = n, only down moves remain (k decreases by 1 each down move, x stays). Paths reaching x=n with y<m: from there, down moves increase y until y=m → terminate. So the frontier values with x ≥ n: the relevant one terminates eventually. But the loop over k might process other k values with x = n+1, n+2... these are dead paths. Do they occur before termination? The loop processes k from -d to d in increasing order; termination happens when we hit the k where x≥n and y≥m. Dead paths with k > n - m + 1... Hmm.

The point: to be safe, I'll just guard the k loop: skip k where x would exceed... Simpler: bound k to [-m... no. Cleanest: use dict — no index bounds issues, handles everything. Memory concern for dict trace: for n=m=1000 completely different, D = 2000. Trace entries: dicts of size ~2d. Total entries = sum over d of (d+1) ≈ D²/2 = 2M entries. Python dict of 2M int entries total across 2001 dicts: each small dict has overhead ~64 bytes + entries ~ (int object cached? ints up to 1000 cached; k values are small ints cached; x values up to 1000, cached; so values are cached ints, keys cached ints). dict overhead: ~ (56 + 8*2/3*cap)... A dict with d entries: roughly 100-200 bytes per entry for small dicts. 2M entries → 200-400 MB. Risky.

Alternative: store trace as list of tuples/dicts only of the frontier? Better memory approach: store per-d snapshot as a list copy. List of size ~2d+small: list copy per step: total = sum(d) ≈ 2M slots, each slot 8 bytes pointer + shared int objects → 16MB + list overhead. Much better. But need array size n+m+2 (with offset). The out-of-range concern: allocate size n+m+2, offset = m, k index k+m ∈ [0, n+m+1]. If k can reach n+1... n+1+m = n+m+1 < n+m+2 ✓. Can k exceed n+1? From analysis: x = v[k-1]+1 with x... for k > n+1, need x = k + y ≥ k, but x ≤ ? Let's bound: x after snake ≤ n? snake runs while x<n so ends x ≤ n... snake increments x so ends at x ≤ n? No: while x < n: x++ → ends with x ≤ n. Yes! Snake ends with x ≤ n. After a move: x = v[k-1]+1 (right) or x = v[k+1] (down). v[k+1] ≤ ? inductively all v ≤ n+1? Hmm: down move x = v[k+1], unchanged bound. Right move x = v[k-1]+1 ≤ (n+1)+1 = n+2 if v[k-1] ≤ n+1. Circular. Let's bound differently: is it true that x ≤ n+1 always? Suppose v[k-1] = n+1 with y = n+1-(k-1) ≥ 0 → k ≤ n+2. For v[k-1] = n+1 to be set, it came from right move from v[k-2] = n (snake doesn't go past n). So chain: v[k0] = n (fine, snake end), right move → v[k0+1] = n+1, y = n+1-(k0+1) ≥ 0. Termination check at that entry: x = n+1 ≥ n; y ≥ m? y = n - k0. If y ≥ m → terminated. If y < m: stored. Then right move from k0+1: x = n+2, y = n+2-(k0+2) = n - k0, same y. Termination check: y ≥ m? same as before, no. Stored v[k0+2] = n+2! Then continues: x grows, y constant. So yes, k can grow up to... until? These dead-path entries keep growing until the loop's k reaches d... within the same d iteration, k only goes up to d. Next iteration d+1: k up to d+1, and right moves from k-1... The dead chain at high k: at iteration d', k = d', right move from v[d'-1] = n + (d' - (k0+1))... x = n + (d'-k0), y = n - k0. This continues indefinitely until termination via another path. Termination happens at the first (x≥n and y≥m) — but the loop processes k in increasing order, and the true solution path has k = n - m at the end. Dead paths with k > n-m... hmm, if n ≥ m, solution k = n-m. Dead paths at k = n-m+1... would be processed before k... no wait, the loop goes k = -d, -d+2, ..., d. The terminating k is found when processing that k. Dead k values larger than the terminating k are processed after? The terminating k could be any value in [-d, d]. If terminating k < some dead k, we terminate before processing dead k at that d, but dead k values might have been created at earlier d.

Hmm, when does the first dead entry get created? v[k0+1] = n+1 requires right move to diagonal k0+1 with x = n+1, y = n-k0 ≥ 0. Also need the down/right condition to choose right at k0+1. This can happen. And termination at that same iteration requires some k' ≤ k0+1... The overall algorithm terminates at d = D where D is minimal edit distance. Dead entries created at d' < D. At d' < D, k values up to d'. For a dead chain to reach index beyond array bounds (k + m > size-1), we'd need k > n+1... wait size = n+m+2, offset m, max index n+m+1 → k ≤ n+1. Can k exceed n+1 before termination? k = x - y, x could exceed n+1 as shown (dead chain), k = x - y with y = n - k0 ≥ 0 fixed, k = x - y grows with x. x grows one per iteration. Dead chain starts at iteration d0 with v[k0+1] = n+1, k0+1 = x - y = n+1 - (n-k0) = k0+1 ✓. At iteration d0 + j, chain at k = k0+1+j, x = n+1+j, y = n-k0. This continues while the loop still runs, i.e., until termination at d = D. Could x reach n + 1 + j with j such that k = k0+1+j > n+1 → j > n - k0 → y = n - k0 < j → y < j... but y ≥ 0, so possible. Hmm, so potentially k can exceed n+1? But wait — termination: is D ≥ d0 + j for these to be processed? Also, do these dead chains actually get selected by the condition? At iteration d, for k in the dead region, condition: down iff v[k-1] < v[k+1]. Dead chain: v[k] = n + (k - k0). v[k+1] from previous iteration = n + (k+1 - k0) = v[k] + 1 > v[k-1] = v[k]... wait at iteration d, k in dead region: v[k-1] (prev iter) = n + (k-1-k0), v[k+1] (prev iter) = n + (k+1-k0) — but v[k+1] was only set if k+1 was in dead region at prev iter. Hmm, at iteration d, the dead frontier is at k_dead = k0 + 1 + (d - d0)... Actually within iteration d, the k loop: at k = k_dead_prev + 2? Let me not go down this hole.

Practical solution used by everyone (e.g., Myers diff in many libraries): they just allocate max_size = n + m + 2 and offset = m and it works, because in practice when k exceeds bounds... Hmm, actually many implementations bound the k loop: `for k in range(-d, d+1, 2)` and rely on x, y staying within [0, n], [0, m] except the final overshoot. Let me reconsider: is the dead chain actually reachable? For the right move to be chosen at k0+1 with v[k0] = n: down would be from v[k0+2] (prev iter) — unset or... At iteration d0, k = k0+1: down iff k == -d0 (no) or (k != d0 and v[k0] < v[k0+2]). v[k0+2] at prev iteration d0-1: k0+2 ≤ d0-1 means it was set. If v[k0+2] > n... hmm.

You know, I recall that in Myers, x can exceed N by at most... Let me look at it from correctness standpoint: the standard simple implementation (from Coglan's blog and the "myers-diff" gist commonly used):

```python
def shortest_edit(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    v = [0] * (max_d * 2)?? 
```

Common versions use array size 2*max_d + 1 or just use dict. Given uncertainty, dict is simplest and safe. Memory: worst case here is n=m=1000 fully different → D=2000. Dict trace memory ~ let's estimate: 2001 dicts. Dict at step d has ~d entries (k from -d to d step 2 → d+1 entries... k parity: entries with k ≡ d mod 2 plus k=1 odd/even mismatch — roughly (d+2)/2? No wait: k ranges -d..d step 2 → d+1 values, but updates only happen for k ≡ d (mod 2)... all k in range(-d, d+1, 2) have same parity as d. So dict accumulates entries of both parities over time: after step d, dict has ~d+1 entries (all k from -d to d step 2 plus stray k=1 from init... k=1 has parity matching odd d). Roughly d entries. Total entries = Σ_{d=0}^{2000} d ≈ 2M.

Python dict entry cost: for a dict with ~1000 entries, it uses ~2/3 load: capacity 2048, indices table 2048*2 bytes (small dict uses 1-byte? for ≤ 255 entries... for larger, 2-byte indices if < 65536) + entries array: 3 pointers * 8 * (2/3 * 2048) ≈ 32KB per dict of 1000 entries. Hmm, entries array is preallocated as capacity * 2/3 * 24 bytes = 2048 * 2/3 * 24 ≈ 32KB. 2000 dicts averaging capacity ~512-2048: average maybe 16KB → 32MB total. That's acceptable! Plus ints are cached (values ≤ 2001? x up to 1000... values are x ≤ n+m; for n=m=1000, x ≤ ~1000ish, ints ≤ 256 cached, above that each int object 28 bytes but shared across... actually distinct int objects per unique value created during computation — total distinct ints maybe a few thousand, negligible).

Wait but dict growth: dicts grow by rehashing; the snapshot copies double... trace.append(dict(v)) creates a new dict each step — that's the snapshot. And dict(v) copy cost O(d) per step → total O(D²) = 2M dict insertions... dict copy is fast-ish. 2M inserts ~ maybe 0.5s. Plus main loop 2M iterations with dict gets ~ 2-3s? Hmm, could be tight with 6s budget but probably OK. Actually let's count main loop work: Σ d ≈ 2M iterations of the inner k loop. Each iteration: condition check, dict get(s), y computation, snake while (1 check each), dict set. ~ maybe 0.5-1 μs... in Python more like 0.3-0.5 μs per simple op, so ~10 ops → ~4μs per iteration?? No — Python bytecode ops are ~30-50ns each; 15 ops ≈ 0.7μs. 2M iterations → 1.5s. Plus copies 2001 dict copies of average size 1000 → 2M entries copied → ~0.3s. Total ~2s. Under 6s ✓.

But wait — for completely different lists, do we even hit D = 2000? Yes, minimal script for completely different lists: all minus/plus, no equals, D = n + m = 2000. But careful — "completely different" means no common lines. Then LCS = 0, D = n+m. But actually if lists are different but share some lines... the spec says completely different. Fine.

Alternative: use list-based v with generous size and offset, snapshot as list slice — faster and less memory. The bounds concern: allocate size = n + m + 2, offset = m. Index k+m. k min: down moves decrease k; y ≥ 0 and x ≤ ... k = x - y ≥ -y ≥ -m... wait down move: y decreases by 1 (y = x - k, k increases by... down move: from k+1 to k, x same, y = x - k increases by 1. Right move: x increases 1, k increases 1, y same. So y = x - k: down increases y, right keeps y. y ≥ 0 always (start 0, only increases via down... hmm y = x-k: after down move at step: y = v[k+1] - k = x_prev - (k) where previous diagonal k+1 had y_prev = x_prev - (k+1), so y = y_prev + 1 ≥ 1. After right: y = (x_prev + 1) - k = x_prev - (k-1) = y_prev ≥ 0. So y ≥ 0 always, y ≤ m? y increases only via down moves and snake; snake stops at y < m... snake: while x<n and y<m: y++ → y ≤ m after snake. Down move: y = y_prev + 1 where y_prev ≤ m → y ≤ m+1?? y_prev = v[k+1] - (k+1)... could y_prev = m? v[k+1] set with y_prev... after down, y = y_prev + 1. y_prev ≤ m possible (snake ended at y = m or down reached m). If y = m+1... then k = x - y. Hmm, termination check happens after each v[k] set: if x ≥ n and y ≥ m → terminate. Down move reaching y = m+1 means y_prev = m and x ≥ n? y_prev = m with x = x_prev: if x_prev ≥ n... then when y_prev was set, check x ≥ n and y ≥ m would have terminated. Unless y_prev = m was set... y_prev = m could arise from snake ending (snake stops at y ≥ m with x < n) — then x < n, no termination. Then down move from that diagonal: x same < n, y = m+1. k = x - m - 1 < n - m. Hmm, so y can be m+1? Snake: while x<n and y<m — y < m required, so snake leaves y ≤ m-1? No: loop increments y then re-checks: exits when y ≥ m, so y ≤ m... exits when y == m (since increments by 1 from y < m). So snake gives y ≤ m. Down move: y = y_prev + 1 ≤ m + 1. But would a down move happen from a diagonal with y_prev = m and x < n? That would be useless but the algorithm doesn't know. Down from k+1 to k with x = v[k+1]: condition for down at k: k == -d or v[k-1] < v[k+1]. Possible. Then y = m+1, k = x - m - 1 ≥ -(m+1) → k ≥ -m-1. Index k+m = -1 → out of bounds! So need offset = m+1 and size accommodating k ∈ [-m-1, n+1]? Upper: x ≤ n+1? Right move x = v[k-1]+1; v[k-1] ≤ n? Can v[k-1] > n? v[k-1] = x after snake ≤ n, or x from a move = v[k-2]+1... inductively x can exceed n only via right moves chained on dead paths. Hmm, but with y ≤ m+1 and x... Let's bound x: snake leaves x ≤ n. Right move x = v[k-1] + 1. If all v ≤ n + something...

Ugh. Let me just bound practically: dead paths with x > n have y ≤ m (or m+1) and they continue via right moves... Do dead paths with x > n get extended? At k = x - y with x > n: for this diagonal at iteration d, down/right choice: down gives same x from k+1... The dead chain: entries v[k] = n + j for j ≥ 1. Right move from v[k] → v[k+1] = n + j + 1. This requires choosing right at k+1, i.e., not down: v[k] ≥ v[k+2]... plausible. So chains do grow. But do they grow before termination? Termination at d = D. Within iterations d < D, k ≤ d < D ≤ n+m. Index k+m ≤ d+m < n+2m... could exceed array. Hmm, but also x = k + y ≤ ... with y ≤ m+1: k ≤ x ≤ ? x = v[k-1]+1 could keep growing... but wait, x > n requires... hmm x = k + y, k ≤ d, so x ≤ d + m + 1. And index k + m ≤ d + 2m + 1. For n=m=1000: array size needs up to ~ (d + 2m + 1) - offset... if offset = m+1, need size ≥ d + m + 1 + ... total ~ n + 3m? Getting silly.

OK here's the thing: these dead-path overshoots — do they actually happen in Myers? Let me think about whether x can exceed n at all before termination. Claim: no. Proof attempt: consider the frontier. Standard Myers invariant: v[k] is the furthest x. Paths that reach x = n... A path reaching x = n at diagonal k has y = n - k. If y < m, this is a valid frontier point and the algorithm continues. From there, further moves: down (k decreases, x stays n, y increases) — legitimate, eventually y = m terminates. Right move from x = n: x = n+1, y = n-k. Is a right move from (n, y) with y < m ever chosen? At diagonal k+1, down would give x = v[k] = n from k → wait down at k+1 takes x = v[k+2]?? Let me recheck the move mechanics.

Forward step at (d, k): if down: x = v[k+1] (comes from diagonal k+1, same x, y increases by 1 relative to that diagonal's point? y = x - k = (x - (k+1)) + 1 = y_{k+1} + 1 ✓ down means y+1). If right: x = v[k-1] + 1, y = y_{k-1} ✓ (x+1).

Right move from (n, y), y < m: x = n+1, y. This is "delete a[n]" — but a has only n lines, indices 0..n-1; deleting a line beyond the end is invalid! In a correct edit script, once x = n you only do insertions (down moves). Does the algorithm ever choose right there? At diagonal k+1 at iteration d: choose right iff NOT (k+1 == -d) and (v[k] < v[k+2] → down) false, i.e., v[k] ≥ v[k+2]... wait condition: down iff k==-d or (k != d and v[k-1] < v[k+1]). At diagonal k' = k+1: down iff v[k'-1] < v[k'+1], i.e., v[k] < v[k+2]. If v[k] = n (with y = n - k < m) and v[k+2] ≤ n... v[k+2] could also be n (another dead path) → v[k] < v[k+2] false → right chosen → x = n+1. Hmm so yes possible if v[k+2] == n too. But v[k+2] = n means diagonal k+2 reached x = n, y = n - k - 2 ≥ 0.

So overshoot x = n+1 possible. Then from x = n+1, right moves continue x = n+2 etc.? At k'' = k+2: down iff v[k+1] < v[k+3]. v[k+1] = n+1. v[k+3] ≤ ? If v[k+3] < n+1 → right → x = n+2. So chains can grow. And y stays n - k, k grows. k = x - y grows. So k can exceed n+1. And also below -m-1 symmetric (insertions past end of b when y = m).

Hmm wait, but actually can v[k+3] < n+1 with the chain? The chain grows x by 1 each iteration; other diagonals below might have smaller x. So yes.

BUT: does this happen before termination at d = D? The terminating path ends at (n, m), k = n - m. The loop at iteration d processes k ascending. Dead chains at k > n - m... termination at k_term = n - m... The dead chain passes through k = n - m at some iteration? When the dead chain reaches diagonal k = n-m with x = n + (k - k0), y = n - k0... hmm wait the chain: x = n + j, y = n - k0 (const), k = n + j - n + k0 = k0 + j. When k = n - m: j = n - m - k0, requires n - m > k0 i.e. y = n - k0 > m — but y < m was required (no termination)... y = n - k0 < m → k0 > n - m → j = n - m - k0 < 0. So the dead chain (with y = n - k0 < m) reaches k = n-m never, since k0 > n-m means chain k only grows beyond k0 > n-m. So dead chains live entirely at k > n - m. And termination happens at k = n - m (when the true path completes)... but the loop processes k ascending: at iteration d = D, it processes k = -D, ..., n-m (terminates here) before reaching k > n-m. So dead chain entries created at iterations d < D have k > n - m, and could have k up to d - ... k ≤ d < D. Hmm so k can be as large as D - 2 < n + m. And x = k + y ≤ (n+m) + m + 1.

So array needs size ~ n + 2m + 2 with offset... k ∈ [-(m+1), D-?]. Symmetric negative dead chains: k down to -D + 2. Total k range: [-(m+1), n+1] plus dead chains... k range roughly [-(D), D] fully. Array size 2(n+m)+3, offset D+1? That's safe but snapshot copies of size O(n+m) per step → memory O(D·(n+m)) = for n=m=1000: 2000 * 2003 * 8 bytes ≈ 32MB. Fine. For 20000-line case with D=100: snapshots 100 * 40003 * 8 = 32MB. Fine. Actually also fine.

Hmm wait, but do we even need to worry? Actually many well-tested implementations (e.g., the one in "diff-match-patch", or Git's xdiff) handle this via bounds. But since dead chains are bounded by k < D ≤ n+m and k > n-m... and negative dead chains k > -(D)... So k ∈ [-D, D] ⊂ [-(n+m), n+m]. Array size 2(n+m) + 3, offset n+m+1. Safe.

But actually wait: is it true that dead chains never extend beyond? k ≤ d always (k in loop range -d..d). d ≤ D ≤ n+m. ✓. So array size 2(n+m)+3, offset = n+m+1 covers everything. 

But hold on — actually I realize there's subtlety: can the algorithm terminate at d = D but the loop earlier (d < D) create dead entries beyond? Covered: k ≤ d < D. And k ≥ -d. So all indices within [-(n+m), n+m]. ✓.

However, memory/time: for the 20000 case, v list of size ~40003, snapshot per d step (D ~ maybe 100): 100 copies of 40003-list → 100*40003*8 = 32MB, ok. But wait, D for "differ in about 50 places" — D = number of edits ≈ 100 (50 deletes + 50 inserts) or 50 if... D ≤ ~100. Fine.

For n=m=1000 completely different: D = 2000, v size 4003? Wait 2(n+m)+3 = 4003. Snapshots: 2001 lists of avg size ~2003 → Σ d * 8 bytes ≈ 2000*2001*... hmm snapshot at step d copies full array of size 4003 (not shrinking). 2001 * 4003 * 8 bytes = 64MB. Hmm, borderline but OK. Could slice only used portion: v[:offset+d+2] or something. Snapshot only the relevant window: indices from offset-d-1 to offset+d+2? Backtrack needs k-1 and k+1 neighbors for k in [-d, d] plus snakes... During backtrack at step d, we need v[k-1], v[k+1] for k = x-y where |k| ≤ d. Values beyond window aren't accessed. So snapshot v[offset-d : offset+d+2]? Need v[k] for k in [-(d), d] and neighbors ±1 → k in [-d-1, d+1]. Also within the snake-backtrack we don't need more. So snapshot = v[offset-d-1 : offset+d+2] with local offset d+1. Or simpler: just snapshot full — 64MB is probably fine but let's do windowed to be safe. Actually simpler: snapshot list(v) full for clarity; 64MB acceptable. Hmm, plus Python list of 4003 pointers = 32KB each, 2001 → 64MB. OK, acceptable. But time: 2001 copies × 4003 elements = 8M pointer copies — fast (~0.1s). Main loop: Σ d ≈ 2M iterations. Fine.

Actually, let me reconsider: to reduce work, bound k loop to relevant diagonals: k in range(-d, d+1, 2) but we can restrict to k ≥ -m and k ≤ n? Diagonals beyond k > n... wait legitimate k range for final answer is [-m, n]. Diagonals with k > n: x = k + y ≥ k > n with y ≥ 0 — impossible for valid paths that stay within bounds... but dead paths exist there. Restricting k to [-m, n] ∩ [-d, d] is safe and reduces work for the 20000 case? For n=20000, m≈20000, D small — irrelevant. Restricting to [-m, n]: is it correct? Paths visiting k > n must have passed through x > n which... a path that goes right at x = n is deleting beyond the end — is that ever needed for optimality? No, and Myers' furthest-reaching with restriction: if we never allow moves beyond boundaries, is the answer still found? The D-path to (n, m): its intermediate points have x ≤ n, y ≤ m (a valid edit script deletes a[i] for i < n only). So restricting x ≤ n, y ≤ m in exploration keeps all valid paths. But the standard algorithm doesn't check boundaries during moves; the furthest-reaching values v[k] computed without boundary checks might include overshoot paths, but the terminating one doesn't overshoot. If I clamp: after computing x, y from move, if x > n or y > m... hmm, simpler: restrict k loop to kmax = min(d, n - 0?...). Actually let me think: valid k for any prefix path: k = x - y with 0 ≤ x ≤ n, 0 ≤ y ≤ m → k ∈ [-m, n]. So restrict loop: k from max(-d, -m) to min(d, n). But then the down/right neighbor access: k-1 or k+1 might be outside [-m, n] (e.g., k = n, right move from v[n-1] — fine; down at k = -m: from v[-m+1] — fine). At k = -m... can k = -m occur at d < needed? Yes when m > n and paths go down a lot. Down at k=-m? k == -d only if d = m... Hmm at k = -m with d > m: down from v[k+1] fine. Right at k = n: from v[k-1] fine. So restrict loop to [max(-d,-m), min(d,n)] and neighbors are within [-m... wait k+1 when k = min(d, n): if k = d, right move uses v[k-1], fine, no v[k+1] accessed except in condition `k != d and v[k-1] < v[k+1]` — when k == d condition short-circuits (k != d false → else). When k = n < d: condition evaluates v[k+1] = v[n+1] — might be unset (0 from init) → 0 < v[k-1]? condition v[k-1] < v[k+1] → v[n-1] < v[n+1](=0, stale) → likely false → right. Hmm, v[n+1] never set if we restrict k ≤ n... but could k = n+1 ever be legitimately needed? k ≤ n always for valid paths. v[n+1] would be garbage (0). Condition: down iff v[k-1] < v[k+1]; with v[k+1] = 0 stale garbage, down iff v[k-1] < 0 → never (x ≥ 0). So we'd choose right at k = n when v[k-1] ≥ 0, i.e., always right at k=n... but right at k=n: x = v[n-1]+1, y = y_{n-1}. Hmm is that correct? At diagonal n, y = 0 necessarily (x = n + y... k = n → x - y = n, x ≤ n → y ≤ 0 → y = 0). The path along k = n: all deletions. x = v[n-1] + 1: from diagonal n-1 which had y ≥ 1... this transition deletes a[x-1] where the point on k=n-1 was (x-1, y) with y ≥ 1, then delete a[x-1] → (x, y). Valid. OK.

But wait, the condition comparison for choosing down vs right compares v[k-1] and v[k+1] from previous iteration. With restriction, v[k+1] for k = n is stale garbage 0 — initial array zeros. x values ≥ 0, and v[k-1] ≥ 0 → down condition false → right. Is right always correct choice at k = n? Down at k = n would come from diagonal n+1 (x = v[n+1], y = x - n) — diagonal n+1 has y... only overshoot paths. So right is correct. But careful: garbage 0 vs actual — if v[k+1] were legitimately needed... k+1 = n+1 never legit. ✓. Similarly k = -m: condition down iff k == -d or (k != d and v[k-1] < v[k+1]); v[k-1] = v[-m-1] stale 0; down iff 0 < v[k+1]... v[k+1] = v[-m+1] ≥ 0 → down iff v[-m+1] > 0. Hmm, but correct behavior: at k = -m, y = m (x = 0), only down moves... wait k = -m means x - y = -m, x ≥ 0, y ≤ m → x = 0, y = m. From here, only right moves (deletions)? No wait: at (0, m), remaining a must be deleted: right moves. Down at k=-m comes from k+1 = -m+1: x = v[-m+1], y = x + m — but y ≤ m → x ≤ 0 → x = 0, y = m... down from diagonal -m+1 requires that diagonal's point x = 0 → y = m - 1 → point (0, m-1) → down to (0, m). That's legit if b[m-1] inserted at start. Hmm, so down at k = -m IS legitimate. With stale v[-m-1] = 0: down iff 0 < v[-m+1]. v[-m+1] is x on diagonal -m+1 ≥ 0; could be 0 (all inserts up to y = m-1). Then condition false → right chosen: x = v[-m-1] + 1 = 1?? v[-m-1] stale 0 → x = 1, y = x - k = 1 + m > m! Invalid! That's the overshoot garbage. Hmm — wait, right at k = -m: x = v[k-1] + 1 where v[k-1] = v[-m-1] is garbage. That gives y = m + 1 > m. Problem!

The condition should be: down iff k == -d or (k != d and v[k-1] < v[k+1]). At k = -m (not -d): we compare v[-m-1] (garbage 0) < v[-m+1] (could be 0) → false → right → garbage. Without restriction (array big), v[-m-1] would... also never be legitimately set! k = -m-1 < -m invalid. Hmm, so even without restriction this issue: v[k-1] for k = -m is unset garbage 0 in a zero-initialized array. In the unrestricted algorithm, down at k = -m: down iff k == -d or v[k-1] < v[k+1]. If d > m, k=-m ≠ -d, compare v[-m-1](garbage) < v[-m+1]. If v[-m+1] = 0 → false → right → x = v[-m-1]+1 = 1, y = 1 - (-m) = m+1 > m. Overshoot! But then termination check x ≥ n? x = 1 ≥ n only if n ≤ 1. So it stores garbage v[-m] = 1, y = m+1. Hmm — but does this garbage matter? It could propagate. But note: y > m paths are invalid; the true optimal path never has y > m. Garbage entries have y > m, i.e., x - k > m. Later paths using them inherit y > m... They can't produce the terminating condition falsely? Terminating condition x ≥ n and y ≥ m — garbage x = 1 < n typically. Hmm, garbage could eventually... Since Myers is proven correct with proper initialization, the standard formulation handles this via: in Myers' paper, v[k] for out-of-range diagonals... The paper's algorithm uses v[1] = 0 and only k in [-d, d]; the concern about k = ±beyond m, n: In Myers' proof, D ≤ N+M... hmm actually in the paper, the algorithm works because snakes and moves naturally... Let me check Myers' original: "for k := -D to D step 2... if k = -D or (k ≠ D and V[k-1] < V[k+1]) then x := V[k+1] else x := V[k-1]+1". Original assumes... The paper's correctness proof: an optimal path never has y > M or x > N? Actually a D-path to (N, M): intermediate points satisfy 0 ≤ x ≤ N, 0 ≤ y ≤ M. And the furthest reaching computation: V[k] computed may include overshoot paths but those never win... Hmm, but the CHOICE between down/right at boundary k affects which paths are explored. If garbage choice creates a path with y > m, that path is invalid but just wastes exploration; does it ever overwrite a valid frontier value on a valid diagonal? The garbage is at diagonal k = -m (y = m+1). Later, from diagonal -m, further moves: down from -m+1 (valid) could overwrite v[-m] with valid value? Overwriting happens if... v[k] = x is set unconditionally each time k is processed! So garbage v[-m] = 1 gets overwritten next time k = -m processed with the correct down value? At next iteration d+1, k = -m... wait k parity: -m processed at iterations with d ≡ m mod 2. Each time processed, v[-m] recomputed. The recomputation compares v[-m-1] (garbage/stale) vs v[-m+1]. If it again picks right, garbage again. Hmm, so v[-m] might persistently be garbage y = m+1. Does garbage at diagonal -m affect termination? Termination occurs when some processed k gives x ≥ n and y ≥ m. The optimal path completes at k = n - m at d = D. When processing k = n - m at d = D, is v's state such that the correct x computed? The chain of dependencies for the optimal path: all its diagonals are within [-m, n] and all its frontier points are valid (y ≤ m, x ≤ n). The computation of v[k] at each step depends on v[k-1], v[k+1] from previous iteration. If those are garbage (overshoot), the comparison down-vs-right might pick wrong... but does it matter? The claim of Myers: V[k] after iteration d = furthest reaching 0..d path on diagonal k. For diagonal k ∈ [-m... hmm within valid bounds, the furthest reaching path among ALL (including overshoot?) paths... An overshoot path on diagonal k has y > m... its x = k + y > k + m ≥ ... For the comparison v[k-1] < v[k+1] to pick correctly per Myers' proof, values must be furthest-reaching x. The furthest-reaching path on diagonal k+1 = -m+1 might legitimately... 

OK this rabbit hole is deep. Practical resolution: real implementations handle this. Let me recall a widely used Python implementation with trace (e.g., from James Coglan's "Myers Diff" series, Ruby):

```ruby
max_d = a.size + b.size
v = Array.new(2 * max_d + 1)? 
```

Hmm. Alternatively the well-known gist:

```python
def diff(a, b):
    # Myers O(ND)
    back = ...
```

Alternative clean approach that avoids all boundary issues: pad or handle explicitly. Idea: ensure k stays in [-m, n] by construction using the valid-path argument, and handle boundary conditions by treating out-of-range neighbor values as -infinity appropriately:

At diagonal k, valid moves: right (delete) allowed iff resulting x ≤ n... The move choices with proper boundaries:
- right at k: needs x = v[k-1] + 1 ≤ n → requires v[k-1] < n... if v[k-1] ≥ n (reached end of a), right invalid → must go down.
- down at k: needs y = v[k+1] + 1 ≤ m → requires v[k+1] < m... wait down: y = (v[k+1] - (k+1)) + 1 = v[k+1] - k. Down valid iff v[k+1] - k ≤ m i.e. y_{k+1} ≤ m - 1.

Hmm, let me define boundary-corrected condition:
- down possible iff k+1 reachable... Let's define: if k == -d: must down (no right source? at k=-d, k-1 = -d-1 unset). If k == d: must right. Otherwise compare.

With restriction k ∈ [max(-d,-m), min(d,n)]:
- at k = -m (when d > m... and -m ≥ -d... if m ≤ d): only right is valid (down would need y_{k+1} ≤ m-1 with y_{k+1} = v[k+1] - (k+1); diagonal -m+1 has y ≤ m; hmm down from (-m+1): y = y_{-m+1} + 1 ≤ m iff y_{-m+1} ≤ m-1. Could be valid!). Hmm wait down at k = -m from diagonal -m+1: point (x, y_{-m+1}) on diag -m+1 with y_{-m+1} = x - (-m+1) = x + m - 1 ≤ m - 1 requires x ≤ 0 → x = 0. So down valid iff v[-m+1] = 0 (then y = 0 + ... wait down: y = y_{k+1} + 1 = 0 + 1 = 1?? That contradicts earlier: point on diag k=-m is (x, x + m); down gives y = y_{-m+1} + 1 where y_{-m+1} = v[-m+1] + m - 1. If v[-m+1] = 0: y = m. Hmm: y_{-m+1} = v[-m+1] - (-m+1) = 0 + m - 1 = m - 1. Down: y = m. ✓ point (0, m) on diag -m. Valid!)

So at k = -m, both moves can be valid. The garbage issue: right at k=-m uses v[-m-1] which is invalid diagonal. Right at k = -m: point on diag -m-1: (x', y') with y' = x' + m + 1 > m always → invalid diagonal entirely! So right at k = -m is NEVER valid. So at k = -m: always down. Similarly at k = n: always right? Down at k = n from diag n+1: y = y_{n+1} + 1... diag n+1: x - y = n+1, x ≤ n impossible → invalid. So at k = n: always right? Wait, right at k = n: from diag n-1, x = v[n-1] + 1 ≤ n requires v[n-1] ≤ n - 1, y = y_{n-1} ≤ m... could overshoot y? y stays same as y_{n-1} ≤ m ✓, but x = v[n-1]+1 could be n+1 if v[n-1] = n. v[n-1] = n means diag n-1 point (n, 1)... wait y = n - (n-1) = 1 ≥ 0 ✓. Then right at k=n gives x = n+1 invalid. Hmm! So at k = n, right is invalid if v[n-1] = n. And down at k=n is always invalid. So if v[n-1] = n... then diagonal n can't be extended?? But diagonal n with y = 0: point (n, 0)... The path at diag n-1 reaching (n, 1)... then to reach diag n we'd delete a[n-1]? No — deleting from (x, y) → (x+1, y) requires x < n. Point (n,1) on diag n-1 means x=n already. Hmm, but diag n-1 point (n, 1): x = n means we've consumed all of a; this point on diag n-1... and diag n needs x - y = n with x ≤ n → y = 0, point (n, 0). Path to (n, 0) uses only deletions from (0,0). v[n] = furthest x on diag n = n if reachable (i.e., all-deletes path), else diag n unreachable? Diag n point (n, 0) always exists as path endpoint candidate... The furthest-reaching: v[n] = n when? The right move from diag n-1 at x_{n-1}... hmm at k = n, x = v[n-1] + 1 might overshoot but the correct v[n] should be n if diag n reachable via valid path. Ugh, the formulation "x = v[k-1] + 1" assumes the move from (v[k-1], y_{k-1}) → right → (v[k-1]+1, y_{k-1}) which is on diagonal k. For diag n: v[n-1] + 1 with y = y_{n-1} = v[n-1] - (n-1). Point (v[n-1]+1, v[n-1]-n+1) on diag n ✓. If v[n-1] = n: point (n+1, 1) — x overshoot. But the true furthest valid point on diag n is (n, 0), reached only by the all-deletion path... which would be captured by: v[n-1] at some earlier iteration? Path to (n, 0): n deletions, d = n, along diag n. At iteration d = n, k = n... wait k = n requires d ≥ n. Hmm, at iteration d ≥ n... but also at iteration d = n, k = n: k == d → right: x = v[n-1] + 1. v[n-1] at iteration n-1: furthest on diag n-1 with n-1 edits... path to diag n with n deletions passes through diag n-1? A D-path alternating... The path of n deletions from (0,0) to (n, 0) stays on diag n the whole time — it never visits diag n-1! But in Myers' formulation, moves are: at each step d, diagonal k comes from k-1 (right, delete) or k+1 (down, insert). The all-deletes path: at d=0, k=0 point (0,0) [after snake, if a[0]==b[0]... assume all different]. At d=1, k=1: right from v[0]... v[1] = v[0] + 1 = 1, point (1, 0). ... v[n] = n at d = n. ✓ via chained right moves. Fine — each right move from diag k-1. So v[n-1] = n-1 at d = n-1, and at d = n, x = v[n-1]+1 = n ✓. Good, no overshoot. The overshoot scenario v[n-1] = n: happens when diag n-1 reached x = n via mixed path (e.g., n-1 edits with some inserts... point (n, 1) on diag n-1 with d' edits). Then at some later d, k = n processed: k==d? Only if d = n. If d > n: condition down iff v[n-1] < v[n+1] — v[n+1] invalid diag garbage. Restricted: we said at k = n... hmm.

OK let me step back and take the pragmatic, safe route: implement with dict + allow overshoot (no k restriction), like the canonical implementations that are known correct. Known correct reference: the algorithm in Myers' paper with v[1] = 0 handles boundaries implicitly? In the paper, V is indexed by k from -D to D, uninitialized entries... The paper states the loop k from -D to D and uses V[k±1] — entries from previous iteration, all k' ∈ [-(D-1), D-1] were set. So all accesses in-range. No garbage issue! Because every k in [-d+1, d-1] gets set at each iteration, values are always furthest-reaching (possibly overshoot paths but furthest-reaching among all paths including overshoot ones — Myers' lemma doesn't exclude overshoot; the lemma holds for all paths; the terminating condition picks the first d where a D-path reaches (N, M); overshoot paths on other diagonals don't interfere since we check termination per diagonal after computing). The garbage concern I had: at k = -m, choosing right using v[-m-1] — v[-m-1] IS set (previous iteration set k = -m-1... only if -m-1 ≥ -(d-1), i.e., d ≥ m+1). It's a furthest-reaching value on diagonal -m-1, which may be an overshoot path (y = x + m + 1 > m). Using it: right → x = v[-m-1] + 1 on diagonal -m, y = v[-m-1] + m + 1... wait y = x - k = v[-m-1] + 1 + m. Hmm, and down would give y = y_{-m+1} + 1 ≤ m+... The comparison picks larger x. Overshoot paths have larger x (since y larger... x = k + y). So overshoot wins the comparison → v[-m] becomes overshoot value with y > m. But this is still "furthest reaching x on diagonal -m" among all paths — consistent with Myers' lemma. And the final termination: we check x ≥ n AND y ≥ m. An overshoot path has y > m... could it trigger termination before the true d? x ≥ n and y ≥ m with y = x - k... For overshoot path on diag k: could satisfy both. E.g., path to (n, m') with m' > m?? But such a path doesn't exist — paths are sequences of delete/insert moves from (0,0); there's no path reaching (n, m') for m' > m... wait there is: insert more than m lines? Inserts correspond to b's lines; a path could insert "past" b's end? In the graph, down moves from y to y+1 correspond to inserting b[y]; the grid is (N+1)×(M+1) points; paths exist within grid. An overshoot "path" with y > M doesn't exist in the grid! So V[k] values always satisfy y ≤ m?? Down move from diagonal k+1 point (x, y+... the down move at k takes point (x, y_{k+1}) on diag k+1 → (x, y_{k+1} + 1). If all points satisfy y ≤ m, then down gives y ≤ m + 1. Hmm, point (x, m) on diag k+1 → down → (x, m+1)? But (x, m+1) is outside grid — the down move from (x, m) would insert b[m] which doesn't exist. In Myers' graph formulation, moves from (x, m): only right (delete). The algorithm's "down at k" uses V[k+1] unconditionally — if V[k+1] = x with y_{k+1} = m, the down move produces (x, m+1), invalid!

So the question: does Myers' paper handle this? Yes — in the paper, I believe the furthest-reaching D-path definition and the algorithm are correct as stated, and this boundary issue is handled by... hmm. Let me recall the paper (Myers 1986, "An O(ND) Difference Algorithm"): The algorithm in Figure: 

```
V[1] ← 0
For D ← 0 to ⌈(M+N)/2⌉ Do
  For k ← −D to D in steps of 2 Do
    If k = −D or k ≠ D and V[k−1] < V[k+1] Then x ← V[k+1]
    Else x ← V[k−1]+1
    y ← x−k
    While x < N and y < M and a_{x+1} = b_{y+1} Do (x,y) ← (x+1,y+1)
    V[k] ← x
    If x ≥ N and y ≥ M Then ...
```

And the correctness proof via Lemma 1 & 2 about furthest reaching. The lemma: V[k] after iteration D = furthest reaching in x... "the endpoint of the furthest reaching D-path on diagonal k". D-paths are within the grid by definition. The claim x = V[k+1] for down: the furthest reaching (D-1)-path on diagonal k+1 followed by a down move — but if its endpoint has y = M, the down move is out of grid. Hmm — however, if endpoint of furthest reaching (D-1)-path on diag k+1 is (x, M)... then that path extended... Hmm.

Honestly, this boundary condition is known to be fine in practice: the overshoot values, even if computed, lead to y > M endpoints whose successors can't terminate (since to terminate need x ≥ N and y ≥ M; overshoot path has y ≥ M+1, x = k + y... it could satisfy x ≥ N!). Hmm, e.g., overshoot at diag k with y = M + 1, x = k + M + 1 ≥ N → terminates at (x, y) with y = M+1 > M! That would be wrong — a "path" to a point outside the grid... But wait: is such an overshoot value reachable as V[k]? For it to be created: down move from diag k+1 endpoint (x, M) → (x, M+1)?? The down move at iteration d at diagonal k uses V[k+1] from iteration d-1. If V[k+1] = x with y = M... then at iteration d-1 when that was set, termination check: x ≥ N and y ≥ M — if also x ≥ N, terminated already. So V[k+1] = x with y_{k+1} = M implies x < N (no termination). Then overshoot (x, M+1) at diag k: x < N → termination check x ≥ N fails → stored but never terminates. Later this overshoot could grow via right moves: x = x+1 each... while y = M+1 constant... eventually x ≥ N?? Right moves at diag k: x = V[k-1] + 1... the overshoot grows only if chosen. Could it reach x ≥ N with y = M+1 ≥ M → false termination at wrong d? Possible?? If it did, we'd produce an incorrect (shorter) D. Hmm, but Myers' algorithm is proven correct, so presumably this can't happen before the true D. Intuition: an overshoot path has made MORE inserts than exist... its d value (number of non-vertical... ) hmm. Each overshoot path to (x, M+1) has d = (x - matches) + (M + 1 - matches) ≥ M + 1 - matches... and x < N. True D ≥ (N - lcs) + (M - lcs). Could overshoot trigger earlier? Overshoot path: deletes + inserts = d, inserts = M + 1 - matches, deletes = x - matches, matches = (x + M + 1 - d)/2. Termination at iteration d requires x ≥ N: N ≤ x = d - (M + 1 - matches)... d ≥ N + M + 1 - matches ≥ N + 1 (matches ≤ ...). And true D ≥ N + M - 2·lcs... hmm not obviously bigger. E.g., N = 10, M = 1, a and b totally different except... let b = [x], a = 10 lines none equal b[0]. LCS = 0, D = 11. Overshoot: path inserting b[0] then... down moves: from (0,0) down → (0,1) = M, d=1. Down at diag k=-1: uses V[0] = 0 with y = 0 → (0, 1)? y = 1 = M ✓ x = 0 < N → no terminate, v[-1] = 0. Next iteration d=2, k = -2: down from v[-1] = 0, y_{-1} = 0 - (-1) = 1 = M → down → y = 2 = M + 1, x = 0, v[-2] = 0. Overshoot created! d=2, y = M+1 = 2, x = 0. Right moves: d=3, k=-1: down iff k==-d? no; v[-2] = 0 < v[0]? v[0] = 0 → 0 < 0 false → right: x = v[-2] + 1 = 1, y = x - k = 1 + 1 = 2 = M+1. v[-1] = 1 (overshoot persists). d=4, k = 0: v[-1] = 1 vs v[1]: v[1] = 1 (from d=1 right move? At d=1, k=1: k==d → right: x = v[0] + 1 = 1, y = 0, snake none → v[1] = 1, x=1 < N, no term). Condition at k=0, d=4: v[-1]=1 < v[1]=1? false → right: x = v[-1]+1 = 2, y = 2. v[0] = 2. d=5, k=1: v[0]=2 < v[2]? v[2]: d=2, k=2: right x = v[1]+1 = 2, y=0 → v[2] = 2. So 2 < 2 false → right x = 3, y = 2. ... pattern: overshoot path advances x by 1 per d, y = 2 = M+1. Termination when x ≥ N = 10: x = 2 + (d - 4)... at d: x = d - 2? d=4→x=2, d=5→3,... x = d - 2. x ≥ 10 at d = 12 > D = 11. True termination: the true path: 10 deletes + 1 insert, D = 11. Along the way... at d = 11, k = N - M = 9: processed. Path: deletes then insert, or insert then deletes. E.g., insert first: (0,0)→(0,1) d=1 diag -1... but v[-1] got overwritten by overshoot at d=3! Then the true path's continuation deletes: right moves from diag -1... v[-1] = 1 (overshoot, y=2) vs true would be v[-1] = 0 (y=1, x=0)... The deletion path from (0, 1): right moves → x grows, y = 1... At d, diag k = x - 1... termination at (10, 1): x=10 ≥ 10, y = 1 ≥ 1 ✓ at d = 11. But v[-1] = 1 (overshoot with y=2)! Then right moves from overshoot: x = 1 + j, y = 2, diag k = x - 2 = j - 1... reaching (10, 2)?? at d: x = 1 + (d-3), x ≥ 10 → d = 12. And the true route: at d=11, k=9: condition: v[8] vs v[10] at d=10... v[8]: from true-ish paths along y=0 or y=1... hmm at d=10, k=8: what's v[8]? Paths: all-deletes along y=0: diag k = x, v[k] = x... e.g., v[8] could be 8 + (via path that inserted b[0] at some point: deletes + 1 insert = d = 10, x - y = 8, y = 1 → x = 9 → v[8] = 9! Path: delete 8, insert b0, delete 1? d = 10 ✓ point (9, 1) on diag 8. Also overshoot-influenced: v[8] via overshoot: x = ..., y = 2, diag 8 → x = 10 > 9? Overshoot path to (10, 2): deletes + inserts = 10 + 2 - matches... matches along overshoot: it inserted b[0] once (match), so d = 10 + 2 - 1 = 11. Not at d=10. So at d=10, v[8] = 9 (true). Condition at d=11, k=9: down iff v[8] < v[10]. v[10] at d=10: k=10: x = v[9]+1... v[9] at d=9: all-deletes gives v[9] = 9; with insert path: diag 9, y = 1 → x = 10 at d = 10... hmm at d=9, k=9: k==d → right: x = v[8](d=8) + 1. v[8] at d=8: all-deletes v[8]=8; insert path d=8: diag 8 y=1 x=9 needs d = 8 + ... deletes 8 + insert 1 = 9 edits → not at d=8. So v[9] = 9 at d=9. At d=10, k=10: k==d → right x = v[9] + 1 = 10, y = 0. v[10] = 10, x ≥ N=10, y = 0 < M → no term. So at d=11, k=9: down iff v[8](=9) < v[10](=10) → TRUE → down: x = v[10] = 10, y = x - 9 = 1. Termination: x = 10 ≥ 10, y = 1 ≥ 1 ✓ at d = 11 = D ✓ correct!

Phew. So in this example overshoot didn't cause premature termination. Is that guaranteed in general? I believe yes — this is Myers' theorem; the overshoot paths are essentially paths that "insert beyond the end" and they're dominated: any path reaching x ≥ N and y ≥ M in the extended sense corresponds to... Actually here's a cleaner way to think: the algorithm computes furthest-reaching points; the theorem states the first d at which V[k] ≥ N for k = ... the paper's termination is "If x ≥ N and y ≥ M" — and correctness is proven. I'll trust the canonical formulation. This exact formulation with v[1] = 0 and the trace/backtrack is used in many working implementations (e.g., Coglan's, and the popular JS "myers-diff"). And the k range stays within [-d, d], d ≤ N + M... but wait d can exceed ceil((M+N)/2)? No: loop until found, d ≤ D ≤ N + M. Paper loop bounds "For D ← 0 to ⌈(M+N)/2⌉" — because D-path... actually D ≤ M + N obviously; the paper says ⌈(M+N)/2⌉ because... hmm, D ≤ M + N but for the diff, D ≤ M + N... why ⌈/2⌉? Because a D-path has at most ⌈D/2⌉... no — the paper loops D up to ⌈(M+N)/2⌉?? Hmm, I recall the standard loop is until D = N + M. Actually paper: "For D ← 0 to ⌈(M+N)/2⌉" — hmm, I think that's for the middle-snake version (linear space). The basic version loops until found, up to M + N. I'll loop up to n + m.

Now, V array sizing: k ∈ [-d, d], d ≤ n + m. So allocate size 2(n+m) + 1? Plus we access v[k±1] with |k±1| ≤ d + 1 ≤ n + m + 1? At k = d, we don't access v[k+1] (short-circuit k != d false → else). At k = -d: access v[k+1] = -d+1 ✓ in range. Condition evaluation: `if k == -d or (k != d and v[k-1] < v[k+1])` — at k = d: k != d false → no v[k+1] access ✓ (Python short-circuit). At k = -d: first clause true → no v access... but we then use x = v[k+1] ✓. For -d < k < d: both accesses in [-d+1, d-1] ✓ set. So array indices needed: -d..d → allocate 2(n+m)+3 with offset n+m+1 to be safe (v[1]=0 init at index offset+1).

Backtrack: uses trace[d][k-1], trace[d][k+1] comparisons. trace[d] = snapshot of v BEFORE iteration d... but as noted, entries at k±1 (parity opposite to d) are same in trace[d] and trace[d-1]. But careful: v[k-1] where k-1 has parity of d-1 — set at iteration d-1 ✓ same in both snapshots. And v[k+1] similarly. But wait: is v[k±1] guaranteed set at iteration d-1 (i.e., present in trace[d])? k±1 ∈ [-(d-1), d-1] and parity matches d-1 → set ✓ (for d ≥ 1; entries with |k'| ≤ d-1, parity = d-1 mod 2 → set at iteration d-1 ✓). Except... k+1 with k = d? Not accessed. k-1 with k = -d: not accessed (first clause). But in backtrack, the condition uses v[k-1] < v[k+1] with k = x - y, |k| ≤ d... if k = -d: condition k == -d → down ✓ no access. If k = d: k != d false → right ✓ no access. Else accesses fine.

Hmm, one more subtlety: during backtrack at step d, the current point (x, y) — is k = x - y guaranteed |k| ≤ d and parity ≡ d? Yes: after d moves... including snakes? Snakes don't change k. The frontier point after iteration d on some diagonal k with parity(k) ≡ d mod 2... but during backtrack we also trace through snake points (diagonal same). x, y after processing equals and the move. ✓.

Also backtrack: after the move at step d (from prev point on diag k±1), we then walk equals back to prev point. The order of script building: we're going backwards, appending; final reverse. Each iteration: append equals (backwards), then the move ("+" or "-"). Then reverse whole script at end. ✓.

Let me also double check the move direction mapping: forward "down" = insertion from b (y+1) → script item ("+", b[y...]). In backtrack, move "down" between prev point (prev_x, prev_y) on diag k+1 and current (x, y) on diag k: current = (prev_x, prev_y + 1). So the inserted line is b[prev_y] (0-indexed) = b[y - 1] with current y = prev_y + 1 → b[y-1] ✓. Right move: current = (prev_x + 1, prev_y), deleted line a[x-1] ✓.

Wait, careful about the down move in forward: down at k takes x = V[k+1], and the point on diag k+1 is (V[k+1], V[k+1] - (k+1)) = (x, y - 1) where current (x, y = x - k). ✓ prev_y = y - 1, inserted b[prev_y] = b[y-1]... current y = prev_y + 1 ✓ so inserted line = b[current_y - 1] ✓.

Also snake equals: between move points. In backtrack at step d: we have current (x, y) (end of iteration-d frontier, possibly after snake). prev point (prev_x, prev_y). The path from prev to current: one move then snake. Snake equals: a[x-1] == b[y-1] pairs while x > prev_x... hmm, careful: after the move, the point is (x0, y0) = move target, then snake extends to (x, y). Backwards: from (x, y), walk equals while x > prev_x and y > prev_y... but actually while the points are in the snake: condition a[x-1] == b[y-1] and x > prev_x and y > prev_y. Since Myers guarantees the snake, using x > prev_x and y > prev_y suffices (lines match there). Hmm, is that exactly right? Between prev point and frontier point: move then snake. Snake length s ≥ 0. Points: prev → move → (prev_x + 1 or prev_x, ...) → snake s steps → (x, y). Walking back: s equals, then the move. Condition x > prev_x and y > prev_y: for equals part, both x > prev_x and y > prev_y hold during snake walk? During snake backwards: x from x down to x0; move target: for down move x0 = prev_x → x > prev_x iff x > prev_x: during snake x ≥ x0 = prev_x... at the last equals step x = x0 + 1 > prev_x ✓ and y = y0 + 1 > prev_y ✓. Then when x == x0 (down move: x0 = prev_x, y0 = prev_y + 1): x > prev_x false → stop equals ✓, then append "+" with b[y-1] = b[prev_y] ✓ y -= 1 → y = prev_y ✓. For right move: x0 = prev_x + 1, y0 = prev_y: equals walk: y > prev_y fails immediately (y = y0 = prev_y... only if s = 0). With s > 0: y goes y0 + s down to y0 + 1 > prev_y ✓ and x ≥ x0 + ... ✓. Then append "-" a[x-1] = a[prev_x] ✓, x -= 1.

But subtle: for down move with s > 0: walking equals, condition x > prev_x: x goes down to x0 = prev_x → stops ✓. Good. But wait — what if equals-walk condition `x > prev_x and y > prev_y` stops early incorrectly? The lines match on the snake so no issue; could it stop at a point where a[x-1] != b[y-1]? Only if the path between prev and current isn't move+snake — it is by construction. ✓.

Hmm, one more: in backtrack, for the equals walk, we don't verify a[x-1] == b[y-1] — trust the algorithm. Fine, but for safety we could assert; no, keep clean.

Also final: after processing d = 1 down to 1, remaining at d = 0: point (x, y) on diag 0 with snake from (0, 0): x == y, append a[x-1]... while x > 0: append ("=", a[x-1]); x -= 1 (y -= 1 too; x == y). Actually careful: is remaining necessarily all equals? At d = 0, the only path is the snake from (0,0) along diag 0. ✓.

Edge: found_d = 0 (identical prefixes... e.g., a == b): backtrack loop empty, then append all equals. ✓.

Also n or m zero: e.g., a empty, b = [x, y]. Search: d=0: k=0: k==-d → x = v[1] = 0, y = 0, snake: x < 0? x<n=0 false → v[0] = 0; term? x ≥ 0 ✓, y=0 ≥ 2? no. d=1: trace snapshot; k=-1: down: x = v[0] = 0, y = 1, snake no (x<n false), v[-1] = 0, term: y=1 ≥ 2 no. k=1: k==d → right: x = v[0] + 1 = 1 → but n = 0! x = 1, y = x - 1 = 0. v[1] = 1. term: x = 1 ≥ 0 ✓, y = 0 ≥ 2 no. Overshoot stored (v[1] overwritten from... v[1] was 0 init; now 1). Hmm — v[1] init value 0 is needed for... at d=1, k=... we already used it at d=0? v[1] = 0 is the sentinel for the very first down at d=0 k=0. After d=0, v[1]'s role done. Overwriting fine. d=2: k=-2: down x = v[-1] = 0, y = 2, snake no, v[-2] = 0, term: y = 2 ≥ 2 ✓, x = 0 ≥ 0 ✓ → found_d = 2 ✓ (2 inserts). Backtrack: d=2: v = trace[2]... wait trace: I append snapshot at top of iteration: trace[0] = copy of {1:0}, trace[1] = copy after d=0 (has 0:0), trace[2] = copy after d=1 (has 0:0, -1:0, 1:1), then found during d=2 → append trace[3] = copy after partial d=2 (has ... -2:0). Backtrack d=2: k = x - y = 0 - 2 = -2 = -d → down, prev_k = -1, prev_x = trace[2]... hmm I said use trace[d] for neighbor values (parity argument): trace[2] has -1: 0 ✓, prev_x = 0, prev_y = prev_x - prev_k = 0 + 1 = 1. Equals walk: x=0 > 0? no. Down move: append ("+", b[y-1]) = b[1] ✓, y = 1. Next d=1: k = x - y = 0 - 1 = -1 = -d → down, prev_k = 0, prev_x = trace[1][0] = 0, prev_y = 0 - 0 = 0. equals none. Down: append ("+", b[0]), y = 0. Loop ends (d=1 was last, range(2, 0, -1) = [2, 1]). Then final: while x > 0: x = 0 none. Script reversed: ["+", x, "+", y] ✓. 

But wait — in backtrack I planned to use trace[d] (which contains entries set through iteration d... including iteration d's own updates at parity d). Neighbor entries k±1 have parity d-1 → their values in trace[d] equal those after iteration d-1 ✓. But trace[d] as appended at top of iteration d = state after d-1. Then I append extra final snapshot. So trace has indices 0..D+1 where trace[i] = state after iteration i-1 for i ≤ D, and trace[D+1] = final state. In backtrack for step d, use trace[d+1]?? Let me re-index: trace[t] = v-state after iteration t-1 (for t = 0..D, since appended at top of each iteration 0..D). Plus extra append after found → trace[D+1] = state after iteration D. For backtrack step d (processing the frontier established at iteration d): neighbor values = state after iteration d-1 = trace[d]. ✓ So use trace[d], for d = 1..D. And the current point (x, y) = final frontier of iteration d. ✓. So backtrack loop: for d in range(found_d, 0, -1): v = trace[d]; k = x - y; ... as I wrote. ✓ And found_d=0 → skip.

Wait, but in my earlier trace example: trace[1] = state after iteration 0 ✓ used for d=1 ✓, trace[2] = state after iteration 1 ✓ used for d=2 ✓. 

Now performance choice: dict vs list. Let me reconsider list with full-size array: size = 2*(n+m) + 3, offset = n+m+1. For the 20000-line case: array ~80003 elements; D ≈ 100 (50 diffs → ~100 edits) → 101 snapshots × 80003 × 8B ≈ 64MB. Hmm. Windowed snapshots would help: snapshot v[offset-d-1 : offset+d+2]... but backtrack needs trace[d][k±1] for |k| ≤ d... and also for k = -d, we access... backtrack at step d accesses v[prev_k] where prev_k = k±1, |k| ≤ d → prev_k ∈ [-(d+1), d+1]. So snapshot window k ∈ [-d-1, d+1] suffices → slice v[offset-d-1 : offset+d+2], length 2d+3. Store as list with local offset d+1. Total memory Σ (2d+3)*8 ≈ D² * 8 ≈ for D=100: 80KB ✓; for D=2000 (n=m=1000): 32MB ✓. 

But then in backtrack, index mapping: trace[d][prev_k + d + 1]. And the condition v[k-1] < v[k+1] similarly mapped. Fine.

Hmm, but there's the parity issue for window contents: window at snapshot time (top of iteration d, state after d-1) contains k ∈ [-(d-1), d-1] set (parity d-1), plus older opposite-parity entries, plus init. The slice v[offset-d-1 : offset+d+2] captures k from -d-1 to d+1 ✓ including all needed.

Actually, is full-array snapshot simpler and still fast enough? For the 6-second test (n=m=1000, D=2000): full snapshots 2001 × 4003 × 8 = 64MB, copies 8M elements ~ maybe 0.15s. Fine. For the 2-second test: 101 × 80003 × 8 = 64MB, copies 8M — fine, ~0.2s. Both OK. But windowed is strictly better and easy. I'll do windowed.

Wait, actually one concern with windowed + list: stale values within window (unset → 0). At iteration d, accesses: for -d < k < d: v[k±1] set at d-1 ✓ within window. At k = -d: v[k+1] set ✓. Fine. But the condition `v[k-1] < v[k+1]` for -d < k < d: both set ✓. Stale zeros only at k = ±(d+1) which we never read (short-circuit). ✓.

Hmm wait, one more: at iteration d, k = -d: `k == -d` → x = v[k+1] ✓ set at d-1 (k+1 = -d+1, |·| = d-1, parity d-1 ✓). At k = d: else → x = v[k-1] + 1 ✓ set. ✓.

Now the main loop cost for the worst allowed case: the problem says "two completely different lists of 1000 lines" — D = 2000, Σd ≈ 2M inner iterations. Python: each inner iteration ~ maybe 10-15 bytecode-heavy ops → ~1.5-2.5s. Should fit in 6s. Can optimize: use local variable references, avoid function call overhead in snake, use `while x < n and y < m and a[x] == b[y]` with local a, b. Fine.

Also the 20000/50-diff case: D ≈ 100 → trivial, but the snake work: per iteration snake could traverse... total snake work ≤ ... fine.

One more consideration: equality comparisons of strings — hashing not needed, just ==. ✓.

Memory of trace for windowed: fine.

Let me also handle a possible subtlety: the problem says minimal number of "=" items equals LCS length. Myers gives minimal edit script (D minimal), which maximizes matches? Minimal D ↔ maximal matches along path = LCS? A shortest edit script has D = (len(a) - lcs) + (len(b) - lcs). Myers finds minimal D, and number of "=" items = matches = (n + m - D)/2 which equals LCS. ✓ (Since n + m - D = 2·matches and matches ≤ lcs... matches = number of snake steps = common subsequence length? Each equals corresponds to a matched pair, and they're increasing → matches form a common subsequence → matches ≤ lcs; and D ≥ (n - lcs) + (m - lcs) = n + m - 2 lcs → matches = (n+m-D)/2 ≤ lcs. Combined with minimal D: matches ≥ lcs? For minimal D, matches = (n+m-D)/2 ≥ (n+m - (n+m-2lcs))/2 = lcs ✓.) So minimal D ⇒ maximal "=" count ✓.

Now write the code.

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1          # index of diagonal k is offset + k; k in [-max_d, max_d]
    size = 2 * max_d + 3
    v = [0] * size
    v[offset + 1] = 0           # sentinel: v[1] = 0

    trace = []                  # trace[d]: snapshot window after iteration d-1
    found_d = -1

    for d in range(max_d + 1):
        lo = offset - d - 1
        hi = offset + d + 2
        trace.append(v[lo:hi])
        kmin = -d if d <= m else -m
        kmax = d if d <= n else n
        for k in range(kmin, kmax + 1, 2):
            if k == -d or (k != d and v[offset + k - 1] < v[offset + k + 1]):
                x = v[offset + k + 1]
            else:
                x = v[offset + k - 1] + 1
            ...
```

Hold on — I earlier worried about restricting k to [-m, n] causing the garbage-choice problem at boundaries (e.g., k = -m choosing right using stale v[-m-1]). With the FULL k range [-d, d], all neighbor values are genuinely set (previous iteration) and the algorithm is canonical-correct. The restriction concern was real (at k = -m with stale/garbage neighbor). But wait — with full range and offset = max_d + 1, index k = -m - 1... at iteration d, k = -m is processed; condition accesses v[k-1] = v[-m-1] — set at iteration d-1 (since -m-1 ≥ -(d-1) iff d ≥ m). Its value is a furthest-reaching point possibly overshoot. That's the canonical behavior. So: do NOT restrict k. Use full range(-d, d+1, 2). Indices within [-d, d] ⊆ [-max_d, max_d] ✓ array covers.

But hmm, now revisit: is canonical Myers (without restriction) actually correct at boundaries? As discussed, yes per the paper. Let me sanity-check with a small tricky case mentally... Take a = [x], b = [x, y]? n=1, m=2. Expected: "=" x, "+ y". D = 1.
d=0: k=0: k==-d → x = v[1] = 0, y = 0, snake: a[0]==b[0] → x=1,y=1; x<n? 1<1 no. v[0] = 1. term: x≥1 ✓ y≥2? no.
d=1: trace. k=-1: down: x = v[0] = 1, y = 2, snake: x<1 no. v[-1] = 1. term: x=1≥1 ✓ y=2≥2 ✓ → D=1. Backtrack: d=1, k = x-y = 1-2 = -1 = -d → down, prev_k = 0, prev_x = trace[1][0+... local] = 1, prev_y = 1 - 0 = 1. equals: x=1 > 1? no... wait x=1, prev_x=1 → no equals. Down: "+" b[y-1] = b[1] = y ✓, y=1. Final d=0: while x>0 and y>0: append ("=", a[0]), x=0,y=0. Script reversed: [("=", x), ("+", y)] ✓.

Another tricky: overshoot garbage affecting choice. a = [p], b = [q, p]? Expected: "+q", "=p", D = 1? n=1, m=2: D = 1 (insert q at front). 
d=0: k=0: x=v[1]=0, y=0, snake a[0]==b[0]? p vs q no. v[0]=0. term: 0≥1 no.
d=1: k=-1: down: x = v[0] = 0, y = 1, snake: a[0]==b[1]? p==p ✓ x=1,y=2; x<1? no. v[-1] = 1. term ✓ D=1. Backtrack: d=1: k = 1-2 = -1 → down, prev_k = 0, prev_x = trace[1][0] = 0, prev_y = 0. equals: x=1>0, y=2>0 → append ("=", a[0]) x=0,y=1. Then y > prev_y? y=1 > 0 ✓ but x > prev_x? x=0 > 0 false → stop equals. Down: "+" b[y-1] = b[0] = q ✓ y=0. Reversed: ["+ q", "= p"] ✓.

Now overshoot-prone case: a = [1,2,3], b = [x] where x different from all. n=3, m=1. Optimal: "-1 -2 -3 +x" (D=4) or "+x -1 -2 -3" (D=4). D=4.
d=0: k=0: x=0,y=0 snake no. v[0]=0.
d=1: k=-1: down x=v[0]=0, y=1, snake x<3, y<1? y=1 not <1 → stop. v[-1]=0. term: x≥3 no. k=1: right: x=v[0]+1=1, y=0, snake a[0]==b[0]? no. v[1]=1.
d=2: k=-2: down x=v[-1]=0, y=2 → y>m... y = x - k = 0 + 2 = 2 > 1 = m. Overshoot! snake: x<3, y<1 no. v[-2] = 0. term x≥3 no. k=0: down iff v[-1] < v[1]: 0 < 1 ✓ → x = v[1] = 1, y = 1. snake: y<1 no. v[0] = 1. k=2: right: x = v[1]+1 = 2, y = 0, snake no. v[2] = 2.
d=3: k=-3: down x = v[-2] = 0, y = 3 (overshoot). v[-3] = 0. k=-1: down iff v[-2] < v[0]: 0 < 1 ✓ → x = v[0] = 1, y = 2 (overshoot). Hmm! The legit path: down from v[0]=1 (point (1,1)? wait v[0] = 1, y on diag 0 = 1; down → (1, 2), overshoot y=2>m). The legit alternative: right from v[-2] = 0 (point (0, 2) overshoot) → also overshoot. True path needs diag -1 point (0, 1) extended by right deletes: (1,1), (2,1), (3,1)... The point (0,1) was v[-1] at d=1; at d=2, v[-1] got overwritten by overshoot x=1 (y=2). Because overshoot x=1 > legit extension from v[-2]=0: right from (0,2)? that's x=1, y=2 — same x! Condition chose down (v[-2]=0 < v[0]=1 → down, x = 1, y = 2). Both give x=1, y=2 overshoot. The TRUE useful point on diag -1 at d=2 would be... paths with 2 edits reaching diag -1: e.g., down,down → (0,2)? y=2 > m invalid. down, right: (0,1)→(1,1): x=1, y=1! Wait: down move → (0, 1) on diag -1 (d=1), then right → (1, 1) on diag 0?? Right from (0,1): x=1, y=1 → diag k = 0. Hmm, right move keeps y: from diag -1 point (0,1) → (1,1) which is diag 0. So at d=2, diag 0 point (1,1): that's v[0] computed via down from v[1]... v[1] at d=1 = 1 (point (1,0)); down → (1,1) ✓ x=1. Same result ✓. OK so diag -1 at d=2: paths ending on diag -1 after 2 edits: last move down (from diag 0 at d=1: v[0]=0, point (0,0) → down → (0,1)) giving x=0; or last move right (from diag -2 at d=1: v[-2] unset at d=1! diag -2 needs d ≥ 2). So at d=2, computing k=-1: sources are d=1 values: v[-2] (unset garbage... wait full range: at d=1, k loop = {-1, 1}, so v[-2] NOT set at d=1!). Hmm!! At d=2, k=-1: condition down iff k == -d? -1 == -2? no. k != d ✓ so compare v[k-1] = v[-2] vs v[k+1] = v[0]. v[-2] was NOT set at d=1 (d=1 processed k=-1, 1). But v[-2] = 0 stale (zero-init)! Compare 0 < v[0] = 0 → false → right: x = v[-2] + 1 = 1, y = x - k = 2 → overshoot (y=2 > m=1). But CORRECT furthest-reaching 2-path on diag -1: down from d=1 diag 0: v[0] = 0 (point (0,0)), down → (0, 1), x = 0. So correct v[-1] at d=2 = 0, but algorithm computes 1 (overshoot garbage)! 

Uh oh. Wait — but down at k=-1 uses x = v[k+1] = v[0]: v[0] at d=1 = 0 → x = 0, y = 1. The condition chose right because v[-2](garbage 0) < v[0](0) false. If condition had chosen down: x = 0. The algorithm chose right → x = 1, y = 2. This deviates from furthest-reaching semantics? Furthest-reaching 2-path on diag -1: candidates: down-from-(0,0) → (0,1) x=0; right-from-diag-(-2)-point — diag -2 at d=1: no 1-path ends on diag -2 (min |k| per d: |k| ≤ d and parity; diag -2 needs d ≥ 2). So furthest = (0, 1), x = 0. Algorithm gives x = 1 with y = 2 — that's not a real path! So v[-1] = 1, y = 2 is garbage that a strict furthest-reaching semantics wouldn't produce. Does this garbage break correctness? Continue:
d=3: k=-3: down: x = v[-2](still 0 stale) → wait k=-3: k==-d → x = v[k+1] = v[-2] = 0, y = 3. overshoot. k=-1: down iff v[-2] < v[0]: 0 < 1 → down: x = v[0] = 1, y = 2. overshoot (correct furthest-reaching 3-path on diag -1: down from diag 0 d=2 (v[0]=1, point (1,1)) → (1, 2)? y=2 > m. Or right from diag -2 d=2 (v[-2]=0, point (0,2) — itself overshoot). Hmm what IS the furthest valid path on diag -1 with 3 edits? diag -1, y ≤ 1 → x = y - 1... wait k = x - y = -1, y ≤ 1 → x ≤ 0. Valid endpoints on diag -1: (0, 1) only. Path: down (d=1). With 3 edits: can we end at (0,1) with 3 edits? Edits must be... path of 3 moves ending at (0,1): moves down increase y, right increase x; end x=0 → all downs → y=3 ≠ 1. So no valid 3-path on diag -1. Furthest-reaching among... the algorithm's semantics treat "paths" in the move-graph without grid boundary; endpoints outside grid are meaningless but the algorithm uses them as intermediates. Myers' proof handles this: Lemma: V[k] after D = x-value of furthest reaching D-path... the paper's paths CAN go outside? Hmm, actually I recall the paper defines paths in the grid... 

Let me just continue this example to see if final answer correct:
d=3 (cont): k=1: down iff v[0] < v[2]: 1 < 2 ✓ → x = v[2] = 2, y = 1. snake: x<3 ✓ y<1? no. v[1] = 2. term: y=1 ≥ 1 ✓ but x=2 < 3 no. k=3: right: x = v[2]+1 = 3, y = 0. v[3] = 3. x≥3 ✓ y≥1? no.
d=4: k=-4: down x = v[-3] = 0, y = 4. k=-2: down iff v[-3] < v[-1]: 0 < 1 ✓ → x = v[-1] = 1, y = 3. overshoot. k=0: down iff v[-1] < v[1]: 1 < 2 ✓ → x = v[1] = 2, y = 2 overshoot. Hmm — legit 4-path on diag 0: e.g., down, right×3? (0,0)→(0,1)→(1,1)→(2,1)→(3,1) diag 0 point (3,1)? x - y = 2... (3,1) on diag 2. Paths ending diag 0 with 4 edits, y ≤ 1: x = y ≤ 1?? k=0 → x=y; y ≤ 1 → x ≤ 1. (1,1) reachable with 2 edits (down+right); with 4 edits ending at (1,1)? moves = 4, net x=1,y=1: 1 right + ... 4 moves summing to Δx=1, Δy=1 → impossible (Δx+Δy = #moves... each move increments exactly one of x, y: Δx + Δy = 4 but = 2. So no 4-path ends at (1,1) — parity/monotonic: every move increments x or y, so Δx + Δy = d. Endpoint (x, y) reachable at exactly d iff x + y ≥ d... and x + y ≡ d mod 2? No: Δx + Δy = d exactly. So endpoint (1, 1) needs d = 2 exactly. So on diag 0, d=4 valid endpoints: x = y, x + y = 4 → (2, 2) — outside grid (y=2 > 1). So NO valid 4-path on diag 0. Algorithm computes v[0] = 2 (y=2, overshoot). Consistent — as an unbounded path it's furthest reaching. k=2: down iff v[1] < v[3]: 2 < 3 ✓ → x = v[3] = 3, y = 1. snake: x<3 no. v[2] = 3. term: x=3 ≥ 3 ✓, y=1 ≥ 1 ✓ → D=4 ✓✓. 

So termination happened via valid path (3 deletes + 1 insert... endpoint (3,1): Δx=3, Δy=1, d=4 ✓). The garbage on overshoot diagonals didn't cause premature termination. Backtrack would work: trace windows... Let me trust it.

But now the backtrack correctness with garbage: backtrack at d=4: k = x - y = 3 - 1 = 2. condition: k == -d? no. v[k-1] = v[1] vs v[k+1] = v[3] in trace[4] (state after d=3): v[1] = 2, v[3] = 3 → 2 < 3 → down. prev_k = 3, prev_x = 3, prev_y = 3 - 3 = 0. equals: x=3>3 no. down: "+" b[y-1] = b[0] = x ✓, y = 0. d=3: k = 3 - 0 = 3 = d → right. prev_k = 2, prev_x = trace[3][v[2]] = 2, prev_y = 2 - 2 = 0. equals: x=3 > 2, y=0 > 0? no → stop. right: "-" a[x-1] = a[2] = 3 ✓ x=2. d=2: k = 2, = d → right: prev v[1] = 1, prev_y = 0, "-" a[1] = 2, x=1. d=1: k=1=d → right: prev v[0] = 0, "-" a[0] = 1, x=0. Final: y=0 → nothing. Script reversed: ["-",1, "-",2, "-",3, "+x"] ✓ valid & minimal.

Great, canonical algorithm works. Note in this example, at d=2, k=-1, garbage choice was made, but it never contaminated the successful path's dependencies. Is that guaranteed in general? Myers' paper proves it. There are known subtleties though... Actually, hmm, I recall discussions that the simple Myers formulation CAN produce suboptimal results in some edge cases?? No — the O(ND) algorithm is well-established and correct. The common buggy variants are in backtracking (e.g., off-by-one or wrong condition), not the forward search. I'll trust it, but let me double check the correctness of relying on possibly-overshoot V values in the down/right comparison. Myers' Lemma 2 proof: the furthest reaching D-path... The comparison V[k-1] < V[k+1] chooses whether the furthest reaching (D)-path on diagonal k has last move down or right... hmm, actually the algorithm just needs SOME D-path reaching (N, M) at the minimal D, and the greedy furthest-reaching ensures if any D-path reaches (N,M), the computed frontier on the relevant diagonal reaches at least as far... The relevant diagonals near k = N - M: overshoot garbage on far diagonals doesn't affect the comparison at k = N - M unless neighbors are garbage... neighbors k±1 = N-M±1: could they be garbage (overshoot)? Overshoot on diag k' means y_{k'} > m i.e. x_{k'} - k' > m. For k' = N - M + 1: x > N - M + 1 + m = N + 1 → x ≥ N + 2?? overshoot x = k' + y ≥ k' + m + 1 = N + 2. Hmm, is that reachable at d-1 < D? x ≥ N + 2 requires... The concern: at iteration d-1, could v[N-M+1] be an overshoot value that beats the legit value and causes wrong down choice at k = N-M at iteration d? If down is chosen via overshoot v[k+1] = x with y = x - (k+1) > m... then current point y = y_{k+1} + 1 > m + 1?? wait down at k: y = y_{k+1} + 1 = x - (k+1) + 1. If overshoot y_{k+1} ≥ m+1 → y ≥ m + 2, x = y + k... then termination needs x ≥ n AND y ≥ m: y ≥ m ✓, x = k + y = (n - m) + y ≥ n + 2 ≥ n ✓!! PREMATURE TERMINATION with garbage!! 

Hmm!! Wait: if v[k+1] (diag n-m+1) has overshoot y_{k+1} ≥ m + 1, then down at k = n-m gives y = y_{k+1} + 1 ≥ m + 2, x = k + y = n - m + y ≥ n + 2 ≥ n, and y ≥ m → terminate at this d. Is d < D possible? The overshoot path on diag n-m+1 has endpoint (x, y) with y ≥ m+1, x = y + n - m ≥ n + 2. Number of moves d-1 = Δx + Δy = x + y ≥ n + m + 3?? No wait: d = x + y - 2·matches... moves d = Δx + Δy = x + y?? No! Each move increments x or y by 1, so d = x + y?? That's only from origin with no snakes... snakes also increment both. Actually total d = (number of delete moves) + (insert moves), and x = deletes + matches, y = inserts + matches → d = x + y - 2·matches ≤ x + y. Endpoint (x, y) = (n+2, m+2)-ish: d ≥ ... hmm, d ≥ max(x - ?, ...). Lower bound: d ≥ x + y - 2·min(x, y)... not helpful. Lower bound via LCS: d ≥ (x - l) + (y - l) where l = matches ≤ lcs of prefixes... l ≤ lcs(a[:x], b[:y]) ≤ min(x, y). Hmm. For overshoot endpoint x ≥ n + 2, y ≥ m + 2: d ≥ (x - l) + (y - l), l ≤ min(x,y). If the overshoot path is "insert beyond b's end", its matches with b[:y] for y > m... b[:y] doesn't exist for y > m — the overshoot path "inserted" b[m], b[m+1]... which don't exist; in the algorithm's move-graph, down moves from y = m are phantom. But matches counted are real line comparisons? Snakes compare a[x] == b[y] — phantom y > m never snakes (snake requires y < m... snake condition y < m ✓ stops). So phantom region: x increases only via right moves (from other garbage) — garbage propagates through right moves and down moves within phantom region.

Let me reconsider: can garbage (y > m) trigger premature termination before true D? Termination needs x ≥ n and y ≥ m. Garbage point (x, y), y ≥ m + 1. Its path: sequence of moves from (0,0); all moves before entering phantom (y > m) are real; once y > m, further down moves increase y (phantom inserts), right moves increase x with match check... snake only when y < m... in phantom, snakes impossible except... snake condition x < n and y < m: phantom has y ≥ m+1 → no snakes ever again. Also right moves into phantom region from real points? Right keeps y: can't enter phantom. Only down enters phantom: from y = m real point → y = m + 1 phantom. So garbage paths: real prefix to some (x0, y0 = m) [this requires y0 = m real: fine, e.g., all inserts], then one down (phantom) → (x0, m+1), then only right moves (downs further? down from phantom y = m+1 → m+2 — possible! down at k uses v[k+1] which might be real point (x, m)... yielding y = m+1 again. Or from phantom (x, m+1) diag k → down at k-1 from v[k] phantom → y = m+2.) Hmm.

Key question: at iteration d', could a garbage point (x ≥ n, y ≥ m+1) exist, triggering false termination at d' < D? Garbage point (x, y ≥ m+1): its move count d' = Δx + Δy = x + y - 2·(matches in real prefix... matches happen only in real region; phantom moves (down at y ≥ m, i.e., inserting b[y] for y ≥ m) — are phantom downs counted as moves? Yes, each move (down or right) counts 1. Phantom downs insert nonexistent lines but still count.

So garbage path: real prefix reaching (x0, m) with d0 moves, matches p0 ≤ lcs(a[:x0], b[:m]) = lcs(a[:x0], b). Then phantom: 1 down + r rights (+ maybe more phantom downs) reaching (x, y): x = x0 + r (+0 from phantom downs), y = m + 1 + (extra phantom downs)... say total phantom downs = q ≥ 1: y = m + q, x = x0 + r. d' = d0 + q + r. Termination: x = x0 + r ≥ n.

False termination at d' means d' < D = (n - L) + (m - L), L = lcs(a, b).
d' = d0 + q + r ≥ ? d0 ≥ (x0 + m - 2 p0) hmm d0 ≥ x0 + m - 2·lcs(a[:x0], b). And L ≥ ... this is getting complicated. Let me try to construct a counterexample or convince myself.

Take the earlier example: a = [1,2,3], b = [x]. Garbage existed at diag -1 etc. but termination came at true D. Garbage termination would need x ≥ n = 3 with y = 2: garbage path reaching (3, 2): d' = 5 - 2·matches... garbage path: down to (0,1) [d=1], down phantom → (0,2) [d=2], then rights: (1,2),(2,2),(3,2) [d=5], matches: snake never in phantom... matches = 0 (b[x] matched? The real prefix (0,1) then... wait to reach (0,1) then phantom... matches = 0 since no snakes happened (a[0] != b[0]). d' = 5. True D = 4. 5 > 4 → no premature termination ✓.

General argument attempt: garbage termination point (x, y), y ≥ m+1, x ≥ n, with d' moves and p matches (all in real prefix). The real prefix ends at (x0, y0) with y0 ≤ m... hmm actually garbage requires the path to have y ≥ m+1 at end; matches p = matches of whole path (snakes only in real part). d' = x + y - 2p. Since p ≤ lcs(a[:x'], b[:y']) for the real prefix endpoint... but simpler: p ≤ L (global LCS). d' = x + y - 2p ≥ n + (m + 1) - 2L = D + 1 > D. !! So any garbage point with x ≥ n, y ≥ m+1 has d' ≥ D + 1, so it can only terminate at d ≥ D + 1, after true termination at D. ✓✓ 

Because termination check happens at iteration d' when the garbage point is CREATED, and d' = x + y - 2p ≥ n + m + 1 - 2L = D + 1. And true termination at d = D. Since we terminate at first d satisfying the check, and garbage can only satisfy at d ≥ D+1, we're safe. Also real (non-garbage) points: y ≤ m, x ≤ n; termination at (n, m) with d = D ✓ found at correct iteration.

Similarly the V values being garbage doesn't break the final backtrack: the backtrack follows the path that terminated — which is a real path? The terminating point (x, y) = (≥n, ≥m)... hmm, terminating point could have x ≥ n, y = m (real, endpoint (n, m) possibly after snake ends exactly at (n, m)... could terminating point be (n+1, m)? Right move x = v[k-1] + 1 = n + 1 with y = m: x ≥ n, y ≥ m → terminate at (n+1, m) — phantom-ish (delete a[n]?). Hmm: v[k-1] = n on diag k-1 = n - m - 1 → y_{k-1} = n - (n-m-1) = m + 1 → that's garbage! So terminating at (n+1, m) via right from garbage diag... then d' = (n+1) + m - 2p ≥ D + 1 ✓. So any termination before d = D+1 is at a point reachable... hmm, but the terminating point (x, y) with x ≥ n, y ≥ m at d = D: d = x + y - 2p = D = n + m - 2L → x + y = D + 2p ≤ D + 2L = n + m → x + y ≤ n + m, with x ≥ n, y ≥ m → x = n, y = m exactly ✓. So at d = D, termination point is exactly (n, m), a real point. 

Backtrack from (n, m): follows the D-path; intermediate V values used are v[prev_k] — the furthest-reaching values; the backtrack reconstructs SOME D-path to (n, m). Is the reconstructed path guaranteed valid (real moves)? The backtrack uses trace values; the condition mirrors forward choice; prev point (prev_x, prev_y) — could prev be garbage (y > m)? If current point is real (y ≤ m) and move was down: prev_y = y - 1 ≤ m... could prev be garbage? prev_y = y - 1 where y ≤ m → prev_y ≤ m - 1... but garbage means y_prev > m — no. If move right: prev_y = y ≤ m ✓ prev_x = x - 1 ≥ 0 ✓. And prev point must be on frontier at d-1: prev_x = v_{d-1}[prev_k]. Since current is real and reachable... The forward computation at iteration d, diagonal k computed x from prev values; if the terminating frontier point at (d, k) is real (n, m), was it computed from real prev values? The computed x = v[k+1] (down) or v[k-1]+1 (right) — these could be garbage values, but the resulting (x, y): if from garbage v[k+1] with y_{k+1} = x - k - 1 ≥ m + 1 → y = x - k ≥ m + 2... then point garbage — but terminating point is real. So if terminating point real, its source prev point: down → y = y_{k+1} + 1 ≤ m → y_{k+1} ≤ m - 1 real ✓; right → y = y_{k-1} ≤ m real ✓... prev_x = x or x-1 ≥ 0, prev_y ≥ 0? y_{k+1} = x - k - 1: could be negative?? x ≥ ... hmm prev_y ≥ 0 needed. prev point (prev_x, prev_y) on diag prev_k with prev_x ≥ 0, prev_y = prev_x - prev_k ≥ 0? Since prev_k ∈ [-(d-1), d-1] and v[prev_k] = furthest reaching x... for real paths x ≥ 0; garbage paths also have x ≥ 0 (moves only increment). prev_y = prev_x - prev_k ≥ 0? If prev value came from a path, its y ≥ 0 always ✓ (moves from origin). ✓. And equals-walk between prev and current: snake — matches verified during forward ✓. Inductively the whole reconstructed path is real. ✓.

And the backtrack's own choices: at each step, the condition replicates forward's choice for that (d, k) — using trace[d] neighbor values (state after d-1) ✓ — so prev point is exactly the source used in forward, which is on the terminating path. ✓.

Wait, one more check on the backtrack condition mirroring: forward at iteration d, diagonal k: down iff k == -d or (k != d and v_{d-1}[k-1] < v_{d-1}[k+1]). Backtrace at step d, k = x - y: same condition with trace[d] ≡ v_{d-1} at indices k±1 (parity argument: trace[d] = state after iteration d-1 EXACTLY — since trace[d] appended at top of iteration d!). Oh nice — with my trace structure, trace[d] IS exactly v after iteration d-1. No parity argument needed! Because I snapshot at the top. But the window slice: trace[d] = v[offset-d-1 : offset+d+2] at top of iteration d — contents at indices k ∈ [-d-1, d+1]... values for k with parity ≡ d-1, |k| ≤ d-1 are from iteration d-1 ✓; entries with parity ≡ d (from iteration d-2 etc.) stale but we don't read those (we read k±1, parity d-1 ✓; wait k±1 where k ≡ d mod 2 → k±1 ≡ d-1 mod 2 ✓, and |k±1| ≤ d+1... k+1 ≤ d+1 with parity d-1: was it set at iteration d-1? |k+1| ≤ d+1 but iteration d-1 sets |k'| ≤ d-1. If k = d... k+1 = d+1: but at k = d the condition short-circuits (k != d false), and down-source v[k+1] not used. If k = d - ... for k < d: k+1 ≤ d, parity d-1 ✓, |k+1| ≤ d... hmm |k+1| could = d: e.g., k = d - 2 → k+1 = d - 1 ✓ ≤ d-1 fine. k = d: excluded. k = d - 1?? parity: k ≡ d mod 2, k ranges over step 2 from -d: k ∈ {-d, -d+2, ..., d}. k = d - 1 not in set ✓. So k+1 ≤ d - 1 + 1... for k ≤ d - 2: k+1 ≤ d - 1 ✓ set at iteration d-1 ✓. Similarly k-1 ≥ -(d-1) for k ≥ -d + 2; k = -d handled by first clause ✓. And in backtrack: at step d, k = x - y; the window trace[d] covers k' ∈ [-d-1, d+1] ✓ contains k±1 ✓.

Also backtrack reads trace[d][prev_k] for prev_k = k±1 ∈ [-d-1, d+1] hmm prev_k = k+1 could be d+1? Only if k = d: then prev_k = k - 1 = d - 1 (right). k = -d → prev_k = -d + 1 ✓. So prev_k ∈ [-d+1... wait k=-d → down → prev_k = k+1 = -d+1 ✓ ≥ -(d-1)+... -d+1 ≥ -(d-1)? -d + 1 = -(d-1) ✓. So prev_k ∈ [-(d-1), d-1] ∪ ... for k in middle: prev_k ∈ [k-1, k+1] ⊆ [-d+1, d-1]?? k ∈ {-d+2, ..., d-2} middle → prev_k ∈ [-d+1, d-1] ✓ all within window ✓ and set at iteration d-1 ✓.

Hmm wait, k=-d → prev_k = -d+1 = -(d-1) ✓ set at d-1 ✓. k = d → prev_k = d - 1 ✓. ✓.

And window slice: trace[d] = v[offset - d - 1 : offset + d + 2] covers k' ∈ [-d-1, d+1] — includes ±(d+1)? offset-d-1 → k = -d-1 ✓; last index offset+d+1 → k = d+1 ✓. Good. Local indexing: trace[d][k' + d + 1].

Also the final extra snapshot: after finding at iteration d = D, I append trace.append(v[lo:hi]) again (state after iteration D) — needed? Backtrack uses trace[d] for d = D down to 1 — state after d-1. Doesn't need state after D. So no extra snapshot needed! Wait: backtrack for step d uses trace[d] = state after iteration d-1 ✓, for d = 1..D. trace[0] = initial state (unused). So no extra append. But hold on — I need trace[D] to exist: loop appends at top of each iteration 0..D ✓ (found during iteration D after its append). ✓. No extra append needed. 

But careful: window for trace[d] uses d of that iteration ✓.

Edge: found_d = 0 → backtrack loop range(0, 0, -1) empty → then final equals from (x, y) = (n, m)... wait if found at d=0, x=y=n=m, and the final while loop appends all equals ✓. But my final loop: `while x > 0 and y > 0` — at d=0 path, x == y so both conditions same ✓. But in general after backtrack to d=... hmm, after processing d=1, the point is on diag 0 (parity: after step d=1's backtrack, x - y = 0? prev_k of step 1 ∈ {0±1}... k at step 1 is ±1 or... after step d=1 backtrack, point is prev point of iteration 1 = frontier after iteration 0 = on diag 0 (x=y, after snake at d=0). ✓ x == y. So final while with both conditions fine.

Now let me also double-check the forward termination placement: check after setting v[k] and snake: if x >= n and y >= m: found. Note: this checks the current diagonal's endpoint. ✓.

Also possible early exit optimization: if a and b share nothing... no, fine.

Another performance point: for the 20000-line / 50-diff case, D ≈ 50-100. But there's a subtlety: if the 50 diffs are e.g. 50 changed lines → 50 del + 50 add = D = 100. Loop iterations Σd ≈ 5000. Trivial. Snakes traverse big common regions but each diagonal monotonic — total bounded.

Worst case overall: completely different 1000 + 1000 → D = 2000 → Σd ≈ 2M inner iterations. Each inner iteration does: condition (2 list index + compare), x/y compute, snake check (2 compares + string eq), list set. ~ Let me estimate ~1μs → 2s. Under 6s ✓. Memory: trace windows Σ (2d+3) pointers ≈ 2000² × 8 ≈ 32MB + lists overhead (2001 list objects ~ 56 + ... negligible) ✓.

Wait — but the snake while loop for completely different lists: zero-length snakes, 1 check each ✓.

Hmm, one more optimization consideration: string equality checks — for identical lists, d=0 snake traverses n... fine.

Now also handle the case where termination might not happen within max_d? D ≤ n + m always (delete all + insert all) so loop range(n+m+1) suffices; add fallback raise or just construct trivial script if not found (shouldn't happen). I'll add a fallback: if not found, return trivial script. Actually d = n+m: k ranges -n-m..n+m step 2; at k = n - m... will it find? Path all-deletes-then-all-inserts: exists always → at d = n + m, diag k = n - m reaches (n, m) ✓. So always found ≤ n+m. But floating parity: k = n - m at d = n + m: parity ✓ (d ≡ k mod 2 since d - k = 2m). ✓. So found guaranteed. Still, defensive: after loop, if found_d < 0: return trivial (shouldn't occur).

Hmm wait, one boundary: max_d = n + m; array size 2*max_d + 3, offset = max_d + 1: index for k = max_d: offset + max_d = 2*max_d + 1 ≤ size - 1 = 2*max_d + 2 ✓. k = -(max_d): offset - max_d = 1 ≥ 0 ✓. During iteration d ≤ max_d, accesses at k±1 ∈ [-d-1, d+1]?? Forward: at k = -d, reads v[k+1] ✓; at k = d reads v[k-1] ✓; condition for -d<k<d reads k±1 ∈ [-(d-1), d-1]... wait no: condition reads v[k-1] and v[k+1] for -d < k < d → range [-(d-1), d-1] ✓. Reads never exceed [-d, d] except... k = -d: reads v[k+1] = -d+1 ✓; k = d: reads v[d-1] ✓. So indices ∈ [-d, d] ⊆ [-max_d, max_d] ✓. Window slice [offset-d-1, offset+d+2] within array for d ≤ max_d: offset+d+2 = max_d + 1 + d + 2 ≤ 2*max_d + 3 = size when d ≤ max_d ✓ exactly equals size at d = max_d ✓ (slice end can equal size, fine).

Backtrack window access: trace[d] local index prev_k + d + 1, prev_k ∈ [-d+1.., d-1] → local index ∈ [2, 2d] ≤ 2d+... window length 2d+3, indices 0..2d+2 ✓.

Wait, also in backtrack the condition reads trace[d][k±1 + d + 1]: k ∈ [-d, d] → k+1+d+1 ≤ 2d+2 ✓, k-1+d+1 ≥ 0 ✓. But at k = -d: condition short-circuits on k == -d ✓; at k = d: k != d false ✓. So reads only for middle k ✓ but even boundary reads are in-window ✓.

Hmm, but wait: in backtrack, the condition needs v_{d-1}[k-1] and v_{d-1}[k+1] — trace[d] = state after iteration d-1 ✓ exactly. ✓.

Let me now also double check the forward "down" condition edge at d=0: k=0: k == -d ✓ → x = v[offset + 1] = 0 ✓ (sentinel). ✓.

Now, potential issue: sentinel v[offset+1] = 0 could be read later as a stale value for diagonal k=1? At iteration d ≥ 1, k=1 processed: v[offset+1] gets overwritten with real value at d=1 ✓ (before any read at d=2 reads v[1]... reads at d=2 of v[1] happen after d=1 set it ✓). And v[offset+1] read at d=0 k=0 ✓ sentinel ✓. Any other read of diagonal 1 before d=1 sets it? Reads at iteration d of diagonal k' happen for k' ∈ [k-1, k+1] with parity d-1... diagonal 1 read at iteration d=2 (k ∈ {-2? no...}) reads of k'=1 at d=2: k ∈ {0, 2} ✓ after set ✓. Fine.

Negative sentinel: v[offset - 1] = 0 stale, read at... diagonal -1 read before set? Set at d=1 (k=-1). Read at d=2 (k ∈ {-2? k=-1±1 → k=-1: reads v[-2], v[0]... hmm reads of diagonal -1 happen at k = -2 (v[k+1]) and k = 0 (v[k-1]) at d=2 ✓ after set at d=1 ✓. And at d=1, k=-1: k == -d → reads v[0] ✓ set. ✓. Similarly all diagonals k' first read at iteration k'+... first read of diagonal k' at iteration d where some k ∈ {k'-1, k'+1} with |k| ≤ d, parity... earliest d = |k'| ... |k| = |k'±1| ≥ |k'| - 1 and d ≥ |k|, and k' set at iteration |k'| (parity). Read at iteration d ≥ |k'| ✓ after set? Read of k' at iteration d requires k = k'±1 processed at d: d ≥ |k'±1| and parity d ≡ k'±1... also k' must have been set: iteration |k'| ≤ d? |k'| ≥ |k'±1| - 1, and set iteration |k'| has parity |k'|; d ≡ k'±1 ≡ |k'|±... d ≡ k'-1 or k'+1 (mod 2) → d ≡ k' + 1 ≢ |k'| (mod 2) → d ≠ |k'| → d ≥ |k'| + 1 > |k'| ✓ set before read ✓. Except diagonal 1 sentinel: read at d=0 as k'+1 = 1 with k=0 ✓ intended ✓; diagonal 1 set "at iteration 1" — but sentinel read at d=0 < 1 ✓ fine. Similarly diagonal... v[1] = 0 sentinel mimics "0-path reaching diag 1 at x=0"? It's the standard trick ✓.

Alright. Also: what about reading diagonal k-1 at k = d (right move) at d where d-1 set at iteration d-1 ✓.

Now write final code cleanly:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1
    v = [0] * (2 * max_d + 3)

    trace = []
    found_d = -1

    for d in range(max_d + 1):
        trace.append(v[offset - d - 1: offset + d + 2])
        base = offset - d  # hmm, index arithmetic
        for k in range(-d, d + 1, 2):
            ki = offset + k
            if k == -d or (k != d and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]
            else:
                x = v[ki - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break

    script = []
    x, y = n, m
    for d in range(found_d, 0, -1):
        t = trace[d]
        local = d + 1  # add to k to index into t
        k = x - y
        if k == -d or (k != d and t[k - 1 + local] < t[k + 1 + local]):
            prev_k = k + 1
            down = True
        else:
            prev_k = k - 1
            down = False
        prev_x = t[prev_k + local]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if down:
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
```

Wait — backtrack uses trace[d] which was snapshotted at top of iteration d = state after iteration d-1 ✓. But the window slice at top of iteration d: v[offset-d-1 : offset+d+2] — contents: at that moment, v holds state after iteration d-1 ✓ (plus sentinel and stale). ✓.

Hmm, one issue: the equals-walk in backtrack uses condition x > prev_x and y > prev_y — for down move, snake: current (x, y), move target (prev_x, prev_y + 1); equals between move target and current: walk while x > prev_x and y > prev_y + ... let me recheck: equals points have x > prev_x AND y > prev_y + 1? The move target is (prev_x, prev_y + 1). Snake points: (prev_x + i, prev_y + 1 + i) for i = 0..s, current = (prev_x + s, prev_y + 1 + s). Walking equals from current: while x > prev_x and y > prev_y: at i ≥ 1: x = prev_x + i > prev_x ✓, y = prev_y + 1 + i > prev_y ✓ → append equals ✓ down to i = 1 → then x = prev_x + 1, y = prev_y + 2 → append equals? i=1: append ("=", a[x-1]) with x-1 = prev_x, y-1 = prev_y + 1 → this is the pair (a[prev_x], b[prev_y+1]) — a snake step ✓ correct. Then x = prev_x, y = prev_y + 1 → loop check: x > prev_x false → stop ✓. Then down: append ("+", b[y - 1]) = b[prev_y] ✓, y = prev_y ✓. 

For right move: target (prev_x + 1, prev_y); current (prev_x + 1 + s, prev_y + s). Walk: while x > prev_x and y > prev_y: i ≥ 1: ✓ append; i=1 → append pair (a[prev_x], b[prev_y])?? At i=1: x = prev_x + 2?? wait current x = prev_x + 1 + s; walking: append a[x-1] with x = prev_x + 1 + s → pair (a[prev_x + s], b[prev_y + s]) ✓ snake step. Continue down to x = prev_x + 1, y = prev_y + 1: append pair (a[prev_x], b[prev_y]) ✓ snake step (i=1). Then x = prev_x + 1, y = prev_y → check y > prev_y false → stop. Right: append ("-", a[x-1]) = a[prev_x] ✓, x = prev_x ✓. 

Wait but hold on: for right move, equals walked down to y = prev_y + 1, requiring pair (a[prev_x], b[prev_y]) — that's the snake step right after the delete move: delete a[prev_x] → (prev_x + 1, prev_y), then snake matches a[prev_x + 1]?? Hmm wait. Let me recompute. Forward: at prev point (prev_x, prev_y) on diag k-1 (end of frontier d-1, after its snake). Move right: delete a[prev_x] → (prev_x + 1, prev_y), now on diag k. Then snake: while a[x] == b[y]: from (prev_x + 1, prev_y): matches a[prev_x + 1] == b[prev_y], a[prev_x + 2] == b[prev_y + 1], ..., s steps → (prev_x + 1 + s, prev_y + s). So snake pairs: (a[prev_x + 1 + i], b[prev_y + i]) for i = 0..s-1.

Backward walk from current (x = prev_x + 1 + s, y = prev_y + s): append ("=", a[x-1]) → a[prev_x + s] paired with b[y-1] = b[prev_y + s - 1] ✓ (i = s-1). Continue... last append at x = prev_x + 2, y = prev_y + 1: pair (a[prev_x + 1], b[prev_y]) ✓ (i = 0). Then x = prev_x + 1, y = prev_y: check y > prev_y → false → stop ✓. Then "-" a[x-1] = a[prev_x] ✓. 

For down move: forward: insert b[prev_y] → (prev_x, prev_y + 1), snake pairs (a[prev_x + i], b[prev_y + 1 + i]) i = 0..s-1 → current (prev_x + s, prev_y + 1 + s). Backward: append a[x-1] = a[prev_x + s - 1]... wait current x = prev_x + s: first append a[prev_x + s - 1]? Hmm: append ("=", a[x - 1]) → a[prev_x + s - 1] paired with b[y - 1] = b[prev_y + s] ✓ (i = s-1: pair (a[prev_x + s - 1], b[prev_y + 1 + s - 1]) ✓). Continue to x = prev_x + 1, y = prev_y + 2: append pair (a[prev_x], b[prev_y + 1]) ✓ (i=0). Then x = prev_x, y = prev_y + 1: x > prev_x false → stop. Down: "+" b[y-1] = b[prev_y] ✓, y = prev_y ✓. 

Now the final d=0 loop: point (x, y) = frontier after iteration 0 = (snake end from origin, diag 0) → x = y, all equals ✓.

Now, sanity check trace[d] content indexing in backtrack once more with earlier example a=[1,2,3], b=[x]: trace windows: iteration d=0: trace[0] = v[offset-1 : offset+2] (k ∈ {-1, 0, 1}) = [0,0,0]. d=1: trace[1] = k ∈ {-2..2}: after d=0: v[offset] = v[0-diag] = 0 (set at d=0 ✓), others 0. Backtrack d=1: k = x - y. After processing d=4,3,2,1... In that example final backtrack: at d=1, x=1,y=0 → k=1=d → right: prev_k=0, prev_x = t[0 + 2] = t[2] → trace[1] window covers k ∈ [-2, 2], local offset 2 → index 2 = k=0 → value = state after d=0 → 0 ✓. prev_y = 0. equals: x=1>0 ✓ y=0>0 ✗ → none. "-" a[0] ✓. ✓.

Now — potential correctness worry remaining: the forward algorithm's garbage propagation could in theory... I proved termination-point safety via the counting argument (any point with x ≥ n, y ≥ m has d = x + y - 2p ≥ n + m + 1 - 2L... wait that argument: garbage point y ≥ m+1, x ≥ n: d = x + y - 2p where p = matches along path. p ≤ L? matches form common subsequence of a[:x] and b[:y]... but b[:y] for y > m isn't defined; matches occurred at b indices < m ✓ so p ≤ lcs(a[:x0], b[:y0]) ≤ L ✓. d = x + y - 2p ≥ n + m + 1 - 2L = D + 1 ✓. And real points x ≤ n, y ≤ m terminate only at... x ≥ n, y ≥ m → (n, m) exactly, d = n + m - 2p, p ≤ L → d ≥ D; first found is D ✓ (since a D-path exists). But could a real point (n, m) be reached at d < D? No, D is minimal. ✓. Could garbage point trigger at d = D exactly but before the real one within iteration D? Loop k ascending; if garbage at some k' triggers at d = D... garbage requires d ≥ D + 1 per argument — can't trigger at d = D ✓. 

Hmm wait, the argument assumed the garbage point's move count d = x + y - 2p — each move increments x or y by exactly 1, snakes increment both but snakes aren't moves and don't count... Let me redo: path = sequence of moves (d of them) interleaved with snakes. End point (x, y). x = (#rights) + (#matched pairs), y = (#downs) + (#matched pairs) → d = #rights + #downs = x + y - 2·(#matched pairs) = x + y - 2p ✓ where p = total snake steps = matches ✓. ✓.

Also, snake steps require a[x]==b[y] at the time — matches form increasing pairs → common subsequence ✓ p ≤ L ✓.

One more: in the phantom region, "down" moves at y ≥ m insert b[y] for y ≥ m — but wait, down move at diagonal k takes b[y] where y = current y — the line b[y] with y ≥ m doesn't exist; but the algorithm treats it as a move regardless. Counted in d ✓. Fine.

Now performance micro-optimizations:
- Bind locals: a_local = a, b_local = b (already params), n, m local ✓.
- The inner loop: use v with offset arithmetic inline.
- trace windows slicing each iteration: fine.

Let me also consider: should trace store the window relative to k=-d-1? I'll store as-is and compute local = d + 1 (since window starts at k = -d-1 → index 0 ↔ k = -d-1 → k + (d+1)). ✓.

Double-check window slicing cost: slice of length 2d+3 per iteration; Σ ≈ D² ≈ 4M pointer copies for D=2000 → ~0.1-0.2s ✓.

Also memory for trace: Σ (2d+3) × 8B ≈ 32MB for D=2000. Plus each small list object ~100 bytes × 2001 ✓ fine.

One more consideration: completely different 1000-line lists — but what does "completely different" mean for D? No common lines → D = 2000 ✓. If they happen to share a few, D smaller → faster. Fine.

Also potential worst case: 20000 lines each... the 2-second test is easy.

What about pathological: a, b both 20000, completely different? Not required (only 1000 required for full-D case). D = 40000 → Σd ≈ 800M — way too slow, but not required. Hmm, "two completely different lists of 1 000 lines in under 6 seconds" — only that. OK.

But hmm, should I worry the grader might test bigger? Spec is explicit; follow it.

Also: recursion none ✓. difflib not used ✓.

Let me also think again about whether restricting `range(-d, d+1, 2)` reads v[ki+1] when k == d... condition: `if k == -d or (k != d and v[ki-1] < v[ki+1])`. For k == d: first false, second: k != d → False → short-circuit, no read ✓. For k == -d: True → x = v[ki+1] read ✓ valid.

Edge case n=m and a==b: d=0: k=0: k==-d → x = v[offset+1] = 0, snake to (n, n) → found_d=0. Backtrack loop skipped; final while appends n equals ✓ reversed ✓.

Edge: a=[1], b=[1]: d=0 snake → found ✓ → [("=", "1")] ✓.

Edge: a=[1], b=[2]: d=0: snake no, v[0]=0, no term. d=1: k=-1: down x=v[0]=0,y=1: term x≥1? no. v[-1]=0. k=1: right x=1, y=0: term x≥1 ✓ y≥1? no. v[1]=1. d=2: trace; k=-2: down x=v[-1]=0, y=2 → overshoot, v[-2]=0, no term (x=0<1). k=0: down iff v[-1] < v[1]: 0 < 1 ✓ → x = v[1] = 1, y = 1 → term x≥1 ✓ y≥1 ✓ → D=2. Backtrack d=2: k = 0; condition: k==-2? no; t[k-1+3] < t[k+1+3] → trace[2] window k ∈ [-3,3], local offset 3: t[2] = v[diag -1] after d=1 = 0; t[4] = v[diag 1] after d=1 = 1 → 0 < 1 → down. prev_k = 1, prev_x = t[1 + 3] = t[4] = 1, prev_y = 1 - 1 = 0. equals: x=1 > 1? no. down: "+" b[y-1] = b[0] = "2" ✓ y=0. d=1: k = x - y = 1 - 0 = 1 = d → right. prev_k = 0, prev_x = trace[1][0 + 2] = 0, prev_y = 0. equals none. "-" a[0] = "1" ✓ x=0. Final: x=0,y=0. Script reversed: ["-1", "+2"] ✓ minimal D=2 ✓ (could also be "+2","-1" — both valid, both D=2 ✓).

Now, subtle: trace[d] window slice bounds when d = max_d and found there... fine.

I think the solution is solid. Let me also think about whether to include an assertion-free fallback if found_d stays -1 (impossible per proof, but defensive):

```python
    if found_d < 0:  # unreachable, defensive
        return [("-", line) for line in a] + [("+", line) for line in b]
```

Hmm, that script: "=" count 0 — is it minimal? Only if LCS = 0. Since it's unreachable, whatever. Actually to be safe if somehow not found (it will be), fallback fine.

Micro-opt for inner loop: precompute nothing fancy; keep readable but reasonably fast:

```python
    for d in range(max_d + 1):
        trace.append(v[offset - d - 1: offset + d + 2])
        for k in range(-d, d + 1, 2):
            ki = k + offset
            if k == -d or (k != d and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]
            else:
                x = v[ki - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break
```

Speed for the 2M-iteration case: per iteration ~ dict... list indexing v[ki±1] — ki computed per k. Could iterate ki directly: `for ki in range(offset - d, offset + d + 1, 2)` and derive k = ki - offset when needed for k==-d / k!=d tests: k == -d ↔ ki == offset - d; k == d ↔ ki == offset + d. Use ki comparisons:

```python
        lo_ki = offset - d
        hi_ki = offset + d
        for ki in range(lo_ki, hi_ki + 1, 2):
            if ki == lo_ki or (ki != hi_ki and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]
            else:
                x = v[ki - 1] + 1
            y = x - (ki - offset)
            ...
```

y = x - k = x - ki + offset → y = x - ki + offset: one add. Or keep k. Minor. Also `while x < n and y < m and a[x] == b[y]` — note a[x] == b[y] string compare could be slow for long common prefixes... fine.

Alternative micro-opt: skip snake via precomputed... no, keep it.

Also small optimization: when d is large and many diagonals, we do full k scan — inherent to Myers.

One more potential speed-up for the "completely different" case: if no common lines at all, D = n+m and we could early-detect? Not needed.

Also: type hints per signature. Add docstring briefly.

Let me also double check the backtrack trace indexing with a slightly bigger mental example where down occurs mid-path... trust the derivations above (verified on multiple examples).

Let me also verify the parity/window issue in backtrack for k = -d case: down, prev_k = k+1 = -d+1, local index = -d+1 + d+1 = 2 ✓ within window (length 2d+3) ✓. k = d: right, prev_k = d-1, local index = 2d ✓ ✓. Middle: fine.

Also — wait, in the backtrack condition I read t[k-1+local] and t[k+1+local]: at k = -d, short-circuit avoids reading t[-1+local] = t[0]... k-1+local = -d-1+d+1 = 0 — actually in window ✓ but value stale — but short-circuit avoids ✓ (k == -d True → or short-circuits ✓). At k = d: `k != d` False → avoids t[k+1+local] = t[2d+2] ✓ exists anyway ✓.

Hmm, k == -d: `k == -d or (...)` — Python evaluates left first → True → skip right ✓.

Now, one more thought about the forward loop bound: `for d in range(max_d + 1)` — max_d = n+m; D ≤ n+m ✓ and loop covers d = 0..n+m ✓. Termination guaranteed at d = D ≤ n+m ✓ (the trivial script path). ✓.

Also the `if found_d >= 0: break` after inner loop ✓.

Let me also reconsider the trace slicing when d=0: v[offset-1 : offset+2] — length 3 ✓.

Memory concern for the 20000 case with D=100: windows Σ(2d+3)*8 ≈ 100*103*8 ≈ 80KB ✓; v array 80003*8 = 640KB ✓.

Wait, but for the 20000 case: is D really small? "differ in about 50 places" — yes D ≈ 100. ✓ Under 2s easily.

Hmm, actually one more subtle thing: for the 20000-line case, the snake while loops: at d small, each diagonal's snake traverses long runs — but each diagonal total snake ≤ its length; Σ over diagonals visited... diagonals ~2d+1 ≈ 200, each snake up to 20000 → worst 4M char/line comparisons... but realistically the snakes are bounded by the diff regions. Actually careful: at iteration d, for each k, snake starts at (x, y) and runs while lines equal. In a mostly-common document, most diagonals have long snakes. Total snake work across the whole algorithm: each diagonal's x monotonically increases; per diagonal total ≤ n. Number of diagonals with parity... up to 2D+1 ≈ 201 → total ≤ 201 × 20000 = 4M in absolute worst case; realistically far less. Each snake step: 3 condition checks + 2 increments ≈ fast (~0.2μs) → worst ~1s. Hmm, borderline with 2s? Realistic: the snakes on the D-path region are short; other diagonals also run into the common bulk. Let me think: with 50 isolated changes, common runs between changes ~400 lines. Diagonals explored: ~201, each snake traverses at most... the frontier advances across the document; total snake across all diagonals ~ O(n × D / something)? Hmm worst case: consider a = b except changes at the very end: then d=0 snake runs 19950 → found at d ≈ 100 immediately after? At d=0: k=0 snake runs to (19950, 19950) if changes start there... then continues d=1.. D. Each iteration d, each diagonal k snake extends until mismatch — snakes overlap heavily but each is bounded by distance to next mismatch ≈ run lengths. Total ≈ Σ_d Σ_k snake_len. Snake on diagonal k at time d starts at frontier x_{d-1}... The total work is bounded by Σ over (d, k) of (mismatch distance). Hmm hard to bound tightly, but with Myers' amortization: each (diagonal) x only moves forward; the snake from a given frontier point traverses at most (length of common run starting there) — and frontier points across different d on the same diagonal advance... Actually key amortization: v[k] monotonic ↑; the snake work for diagonal k total ≤ Σ over d of (v_d[k] - start_d[k]) where start_d = v_{d-1}[k±1]-ish... The total snake work on diagonal k ≤ n (x bounded by n) + ... no wait, x on diagonal k can be reached, then next iteration diagonal k again starts from neighbor values which may be behind, re-traversing the same common run! E.g., diagonal k gets x = 10000 at d=5; at d=6, diagonal k is recomputed from neighbors (x=9990 + move) → snake re-traverses from 9990 to ... 10000+ → re-walk 10 lines... Each re-computation re-walks at most (advance since last visit of that diagonal)? Not exactly — neighbor values could be far behind. Worst case: v[k-1] = 0 while v[k] = 10000 → recompute walks 10000 again. Hmm, could this blow up? In Myers, values on adjacent diagonals differ by at most ~1 in d-progress... Actually there's a known bound: total snake work is O((N+M)·D)? No... Known result: Myers total time O(N+M + D²)? The D² comes from the loop; snakes add... hmm, each diagonal k's value v[k] is monotone non-decreasing over iterations, and each iteration d computes v[k] from v_{d-1}[k±1] + move + snake. The snake from the start point: start = max-ish of neighbors... The re-traversal concern: neighbors v[k±1] at d-1 — how far behind v_d[k] can they be? By Myers' properties, |v[k] - v[k±1]| ≤ 1 + (snake differences)... In fact there's a lemma: v_d[k] ≤ v_{d-1}[k] + ... hmm. Known: the furthest reaching points on adjacent diagonals differ such that snakes total O((N+M)·√?) ... Let me think practically: in the 20000/50-diff case, common regions are long. Diagonal k at iteration d: v[k] computed from v'[k-1] or v'[k+1] (prev iter). The frontier spread across diagonals at fixed d: |v[k] - v[k']| for adjacent k is bounded by snake lengths... For a document with common runs of length ~L between mismatches, snake per step ≤ L + 1? A snake stops at first mismatch: from any start point within a common run region... hmm, snake can cross multiple runs if the diagonal aligns matched lines. Diagonal k = x - y: within a common run, aligned; mismatches at changes shift alignment. Snake stops when a[x] != b[y]. Starting points: on diagonal k, positions where alignment offset k. If the documents are identical except 50 changed lines, then for k = 0, snake runs the whole way (stops only at changed lines... a[x] vs b[x]: changed lines mismatch → snake stops at each change? Snake stops at FIRST mismatch: from start, runs to next change ~ up to 400 lines, then stops. Then further progress only via moves. So per (d,k) snake ≤ ~ run length + 1 ≈ 401. Total: 100 iterations × 201 diagonals × 401 ≈ 8M... hmm that's an overestimate: snake per (d,k) bounded by distance to next mismatch on that diagonal, ≤ ~401 for k=0 alignment; for other k alignments, mismatches are dense (offset alignment mismatches at every changed line + ...). Actually for |k| ≥ 1, alignment shifted → a[x] vs b[y] with y = x - k: equal only where... in mostly-identical docs, shifted alignment matches only accidentally. Snake stops quickly ✓. So total snake work ~ 100 iters × (few diagonals with long snakes) ≈ manageable, ~1M ops worst. Fine under 2s.

OK. Also consider duplicates-heavy inputs (many identical lines) — Myers handles; performance depends on D, not values ✓.

Now, is there any issue with the k loop when d > m or d > n regarding reading sentinel-stale zeros causing bad choices that could... covered by the general correctness argument (canonical Myers). ✓.

Also: `y = x - k` where I have ki: y = x - (ki - offset) = x - ki + offset. Compute k = ki - offset once per iteration (cheap).

Final code:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Shortest edit script between two line lists via Myers' O(ND) algorithm."""
    n = len(a)
    m = len(b)

    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]

    max_d = n + m
    offset = max_d + 1              # diagonal k is stored at index offset + k
    v = [0] * (2 * max_d + 3)
    v[offset + 1] = 0               # Myers' sentinel: v[1] = 0

    trace = []                      # trace[d] = snapshot of v (window) before iteration d
    found_d = -1

    for d in range(max_d + 1):
        trace.append(v[offset - d - 1: offset + d + 2])
        lo = offset - d
        hi = offset + d
        for ki in range(lo, hi + 1, 2):
            if ki == lo or (ki != hi and v[ki - 1] < v[ki + 1]):
                x = v[ki + 1]       # down: insertion from b
            else:
                x = v[ki - 1] + 1   # right: deletion from a
            y = x - ki + offset
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            v[ki] = x
            if x >= n and y >= m:
                found_d = d
                break
        if found_d >= 0:
            break

    if found_d < 0:                  # cannot happen; defensive fallback
        return [("-", line) for line in a] + [("+", line) for line in b]

    script = []
    x, y = n, m
    for d in range(found_d, 0, -1):
        t = trace[d]                 # state of v after iteration d-1; window starts at k = -d-1
        k = x - y
        if k == -d or (k != d and t[k] < t[k + 2]):      # local index: k' + d + 1
            prev_k = k + 1
            down = True
        else:
            prev_k = k - 1
            down = False
        prev_x = t[prev_k + d + 1]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if down:
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
```

Check local indexing in backtrack condition: t index for diagonal k' is k' + (d+1). k-1 → k-1+d+1 = k+d; k+1 → k+d+2. I wrote t[k] and t[k+2]: k + d vs... t[k] = index k → diagonal k - d - 1?? WRONG. t[k-1+d+1] = t[k+d], t[k+1+d+1] = t[k+d+2]. Fix: `t[k + d] < t[k + d + 2]`. Let me redo: local = d + 1; condition reads diagonals k-1 and k+1 → indices (k-1)+(d+1) = k+d and (k+1)+(d+1) = k+d+2. So condition: `t[k + d] < t[k + d + 2]`. And prev_x = t[prev_k + d + 1] ✓ as written.

Also check window coverage: condition reads indices k+d and k+d+2 for k ∈ (-d, d) → k+d ∈ (0, 2d) ✓ within [0, 2d+2] ✓; at k = -d: short-circuit ✓; at k = d: `k != d` False ✓ short-circuit. prev_k + d + 1: prev_k ∈ [-(d-1), d-1]... plus cases k=-d → prev_k = -d+1 → index 2 ✓; k=d → prev_k = d-1 → index 2d ✓. ✓ all within window length 2d+3 ✓.

Verify with example a=[1],b=[2] backtrack d=2: t = trace[2] = window k∈[-3,3] (state after d=1). k = x-y = 0. Condition: k == -2? no. t[k+d] = t[2] (diag -1 → index -1+3 = 2 ✓) vs t[4] (diag 1 → 1+3=4 ✓). Values: after d=1: v[-1] = 0, v[1] = 1 → 0 < 1 → down ✓ matches forward ✓.

Now verify trace window slicing captures needed values: trace[d] taken at TOP of iteration d — state after iteration d-1 ✓. In forward, iteration d reads v[ki±1] for ki ∈ [lo+2, hi-2]... values set at iteration d-1 ✓ present ✓.

One more check of the y computation: y = x - k where k = ki - offset → y = x - ki + offset ✓.

And termination check uses x, y ✓.

Also — the sentinel: v[offset+1] = 0 explicitly (already 0 from init; but keep for clarity... the array is zero-initialized so it's automatic; keep the comment assignment? It's redundant; drop it or keep. Keep for documentation value—actually [0]*(size) already gives 0. I'll drop the explicit assignment but comment the sentinel meaning. Hmm, keep it — harmless and self-documenting. I'll drop to avoid confusion? Keep simple: note in comment that zero-init provides v[1]=0 sentinel.)

Double-check forward reads for d=0: ki = offset: ki == lo ✓ → x = v[ki+1] = v[offset+1] = 0 ✓.

Now, performance of forward inner loop, per ki: ~ 6-10 ops + snake. For 2M kis → maybe 1.5-2s in CPython. The 6s budget ✓. Could micro-opt further: avoid `y = x - ki + offset` by tracking k? Fine as is.

Hmm, one more perf thought: `while x < n and y < m and a[x] == b[y]` — when lists mostly equal and snake long, each step 3 checks + 2 increments ≈ 5 ops ~0.3μs. For the 20000 case discussed, total snake ops ~ up to a few million → OK.

Also consider: could improve by using `min(n - x, m - y)` and slice comparison? e.g., find snake length via comparing chunks — not straightforward. Skip.

One more correctness detail: the problem statement wants list[tuple[str,str]] ✓.

Also, is there an issue when a and b are identical but the algorithm's found_d... fine.

Let me trace one more nontrivial example fully to be safe: a = ["A", "B", "C"], b = ["A", "X", "C", "C"]. LCS: "A","C" → 2. Expected minimal D = (3-2)+(4-2) = 3. Possible script: "="A, "-B", "+X", "=C", "=C"? That's D = 1 del + 1 add = 2?? Wait: a: A,B,C; b: A,X,C,C. Delete B, insert X → "="A, "-B", "+X", "=C", then b has extra C → "+C". So D = 3: items: =, -, +, =, +. matches = 2 = LCS ✓ D = (3-2) + (4-2) = 3 ✓.

Forward: n=3, m=4, max_d=7, offset=8.
d=0: ki=8 (k=0): x = v[9] = 0, y=0; snake: a[0]==b[0] "A" ✓ → (1,1); a[1]=="B" vs b[1]="X" ✗ → v[8]=1. term: x=1≥3? no.
trace[0] = v[7:10] = [0,0,0].
d=1: trace[1] = v[6:11] (state after d=0: v[8]=1 else 0) = [0,0,1,0,0].
k=-1 (ki=7): ki==lo(7) ✓ → x = v[8] = 1, y = 1 - (-1) = 2; snake: a[1]="B" vs b[2]="C" ✗. v[7] = 1. term: 1≥3 no.
k=1 (ki=9): ki != lo; ki != hi(9)? ki == hi → condition: ki == lo? no → (ki != hi) False → else: x = v[8] + 1 = 2, y = 2 - 1 = 1; snake: a[2]="C" vs b[1]="X" ✗. v[9] = 2. term no.
d=2: trace[2] = v[5:12]: v[7]=1, v[8]=1, v[9]=2, rest 0 → [0,0,1,1,2,0,0].
k=-2 (ki=6): lo → x = v[7] = 1, y = 1+2 = 3; snake a[1]="B" vs b[3]="C" ✗. v[6]=1.
k=0 (ki=8): v[7]=1 < v[9]=2 ✓ → down: x = v[9] = 2, y = 2; snake a[2]="C" vs b[2]="C" ✓ → (3,3); x<3? no → stop. v[8] = 3. term: x=3≥3 ✓ y=3≥4? no.
k=2 (ki=10): hi → else: x = v[9]+1 = 3, y = 1; snake a[?] x=3 not <3 → stop. v[10] = 3. term: x≥3 ✓ y=1≥4 no.
d=3: trace[3] = v[4:13]: indices 4..12 → k=-4..4: values: k=-4:0, -3:0, -2:1, -1:1, 0:3, 1:2, 2:3, 3:0, 4:0.
k=-3 (ki=5): lo → x = v[6] = 1, y = 4; snake x<3? no... x=1 <3 ✓, y=4 <4? no → stop. v[5] = 1. term: x=1 no.
k=-1 (ki=7): v[6]=1 < v[8]=3 ✓ → down: x = v[8] = 3, y = 4; snake x<3 no. v[7] = 3. term: x=3≥3 ✓ y=4≥4 ✓ → found_d = 3 ✓ D=3 ✓.

Backtrack: x=3, y=4.
d=3: t = trace[3], window k∈[-4,4], local offset 5. k = x-y = -1. Condition: k == -3? no. k != 3 ✓ → t[k+d] = t[-1+3] = t[2] → diag k'-1 = -2 → value at diag -2 after d=2 = 1. t[k+d+2] = t[4] → diag 0 = 3. 1 < 3 → down ✓. prev_k = 0, prev_x = t[0 + 5] = t[5] → diag 0 after d=2 = 3 ✓, prev_y = 3. equals: x=3>3? no. down: "+" b[y-1] = b[3] = "C" ✓, y=3.
d=2: k = 3 - 3 = 0. condition: k == -2 no; k != 2 ✓ → t[k+d]=t[2] → diag -1 after d=1 = 1; t[4] → diag 1 = 2. 1 < 2 → down ✓. prev_k = 1, prev_x = t[1+3] = t[4] → diag 1 after d=1 = 2 ✓, prev_y = 2 - 1 = 1. equals: x=3 > 2 ✓, y=3 > 1 ✓ → append ("=", a[2]="C") [pair a[2],b[2] ✓], x=2, y=2; still 2>2? x > prev_x: 2 > 2 ✗ → stop. down: "+" b[y-1] = b[1] = "X" ✓, y=1.
d=1: k = 2 - 1 = 1 = d → condition: k == -1? no; k != d → False → right. prev_k = 0, prev_x = trace[1][0 + 2] = diag 0 after d=0 = 1 ✓, prev_y = 1. equals: x=2 > 1 ✓ y=1 > 1 ✗ → stop. right: "-" a[x-1] = a[1] = "B" ✓, x=1.
final: x=1, y=1 → append ("=", a[0]="A") ✓, x=0, y=0.
script reversed: ["=A", "-B", "+X", "=C", "+C"] ✓✓ 

Now write final answer. Include brief docstring/comments. No tests, no examples, no prints.

One last review of code details:

- `trace.append(v[offset - d - 1: offset + d + 2])` — for d=0: v[offset-1:offset+2] ✓.
- Fallback branch — fine.

Also think: any chance `found_d` found during d but inner `break` then outer break ✓.

Potential edge: very large identical lists → d=0 found ✓ trace only 1 window ✓.

I'm confident. Write it.