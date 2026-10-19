Implement Myers' algorithm. Standard linear-space is complex; but simple O(ND) greedy forward/backward with V arrays could use O(D^2) memory which for D=50 fine, but for 1000 completely different lines, D ~ 2000, so D^2 = 4M states — fine memory-wise. Actually Myers O(ND) with storing V per D for reconstruction: memory O(D^2) which for D=2000 is ~4M ints, okay.

But worst-case: 20000 lines differ in 50 places — D=100, trivial. 1000 completely different: N+M=2000, D=2000, work ~ (2000)*2000 = 4M steps, fine. Memory storing V snapshots: D+1 arrays each of size 2D+1 → 2001*4001 ≈ 8M ints, fine.

Standard Myers with trace:

def diff_lines(a, b):
    N, M = len(a), len(b)
    MAX = N + M
    v = {1: 0}? Use dict or list with offset. Use list of size 2*MAX+1 offset MAX.

Implementation:

```python
def diff_lines(a, b):
    N, M = len(a), len(b)
    offset = N + M
    v = [0] * (2 * offset + 2)
    trace = []
    found = False
    for d in range(N + M + 1):
        trace.append(v.copy())  # or store list
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + offset] < v[k + 1 + offset]):
                x = v[k + 1 + offset]
            else:
                x = v[k - 1 + offset] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            v[k + offset] = x
            if x >= N and y >= M:
                found = True
                break
        if found:
            break
    # backtrack
    ... 
```

Backtracking: standard. Then build script reversed.

Backtrack: x, y = N, M. For d from len(trace)-1 down to 1: v = trace[d]; k = x - y; prev_k decides. Standard:

```python
    path = []
    x, y = N, M
    for d in range(len(trace) - 1, 0, -1):
        v = trace[d]
        k = x - y
        if k == -d or (k != d and v[k - 1 + offset] < v[k + 1 + offset]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k + offset]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            path.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if d > 0:
            if x == prev_x:
                path.append(("+", b[prev_y - 1]))
                y -= 1
            else:
                path.append(("-", a[prev_x - 1]))
                x -= 1
    while x > 0 and y > 0:
        path.append(("=", a[x-1]))
        x -= 1; y -= 1
    if y > 0:
        path.append(("+", b[y-1])); y -= 1
    elif x > 0:
        path.append(("-", a[x-1])); x -= 1
    path.reverse()
```

Wait: careful with the d loop going down to 0? The trace includes d=0. After the loop for d from D down to 1, remaining edits at d=0 are all snake matches. But also d=0 could still have a "+" or "-"? No—at d=0, there's exactly one k=0 path starting at (0,0), which consists only of diagonal moves. So remaining x,y with x==y must be all matches. Actually at d=0, prev is k=0, prev_x = v[0+offset] at d=0... hmm, the standard backtracking uses trace[d] to find prev position on d-1. Let me use the standard from "Myers diff in Go" by James Coglan:

Standard backtrack:
```
x, y = N, M
for d in range(len(trace)-1, -1, -1)? 
```
Coglan's version iterates over trace reversed, computing prev_k from trace[d] and prev position = trace[d-1] values... Actually his:

```python
def backtrack(trace, ...):
    x, y = n, m
    for d, v in reversed(list(enumerate(trace))):
        k = x - y
        if k == -d or (k != d and v[k-1] < v[k+1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            yield x-1, y-1, x, y
            x, y = x-1, y-1
        if d > 0:
            yield prev_x, prev_y, x, y
        x, y = prev_x, prev_y
```

Here v is trace[d] which stores the x values at step d. prev position is at step d-1 but read from trace[d]? Hmm — in Coglan's implementation, v at index d stores V array AFTER processing d? Let me recall: he appends v.copy() at start of each d iteration (before processing). So trace[d] is V before processing step d, i.e., it's the state at end of step d-1. Then prev_x = trace[d][prev_k] gives the value at step d-1, which is exactly the previous furthest-reaching point. And the condition `k == -d or (k != d and v[k-1] < v[k+1])` — at the time of choosing at step d, we use trace[d] which is end of d-1... In forward pass, at step d the condition uses v after d-1 updates: `k == -d or (k != d and v[k-1] < v[k+1])`. Since trace[d] is captured before processing d, it equals state after d-1. So the condition in backtrack matches exactly the forward choice. And prev_x = trace[d][prev_k] is v[prev_k] after step d-1 = the furthest x on path d-1 that leads to our (x,y) on path d. 

So in my code: trace.append(v.copy()) at top of loop, matching this. Backtrack for d from D down to 0:

```python
x, y = N, M
result = []
for d in range(len(trace) - 1, -1, -1):
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k-1+offset] < v[k+1+offset]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = v[prev_k + offset]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        result.append(("=", a[x-1]))
        x -= 1; y -= 1
    if d > 0:
        if x == prev_x:
            result.append(("+", b[prev_y - 1]))
        else:
            result.append(("-", a[prev_x - 1]))
    x, y = prev_x, prev_y
result.reverse()
return result
```

Wait, when d>0, the edit is either a down move (+) or right move (-). If x == prev_x, we came via down (insert b[prev_y])? Down move: x stays, y increments. prev (prev_x, prev_y), then down to (prev_x, prev_y+1), then snake to (x,y). Since x==prev_x, yes: the edit inserted b[prev_y]... wait after down move y becomes prev_y+1, then snake. Hmm, but the snake moves are handled at the next iteration (d-1) since after down move, the position (prev_x, prev_y+1) is the start point at step d-1's path end? No—snake at step d is from (prev_x, prev_y+1) to (x,y). Those diagonal moves are consumed in this iteration by the while loop before the edit? No — the while loop consumes diagonals from (x,y) backward down to (prev_x, prev_y) along the snake... hmm.

Actually the while loop backs up diagonals to the point where the edit happened, i.e., to the point right after the edit: (prev_x, prev_y+1) for down or (prev_x+1, prev_y) for right. But my while condition goes while x > prev_x and y > prev_y. For down move: after backing up all diagonals, we reach x == prev_x and y == prev_y + 1 (one above prev_y). Then we emit ("+", b[y-1]) where y = prev_y+1, so b[prev_y]. Correct. But my code uses b[prev_y - 1]. Let me fix: after while loop, y = prev_y + 1 (for down case), so emit ("+", b[y-1]) = b[prev_y]. For right case: x = prev_x + 1, emit ("-", a[x-1]) = a[prev_x].

So:

```python
        if d > 0:
            if x == prev_x:
                result.append(("+", b[y - 1]))
            else:
                result.append(("-", a[x - 1]))
```

Then x, y = prev_x, prev_y.

At d == 0: while loop backs diagonals to (0,0)... prev_x = trace[0][0+offset] = 0, prev_y = 0. Diagonals consumed. Good. But careful at d=0: condition k == -d means k==0 true → prev_k = 1? That's wrong. At d=0, k must be 0. Condition `k == -d` → 0 == 0 → True, prev_k = k+1 = 1, prev_x = v[1+offset] at trace[0]. trace[0] is v.copy() before processing d=0, all zeros. So prev_x = 0, prev_y = -1. Hmm, that breaks while loop? while x>0 and y>-1: x decreases, y decreases to y=0 when x=0... then y(0) > prev_y(-1) true but x(0) > prev_x(0) false → loop ends. Then d==0 so no edit emitted. x,y = 0, -1. But all diagonals consumed correctly (we went down to (0,0)). Fine, though y ends at -1 — harmless since we don't use it after.

But wait: while loop consumed diagonals until x>prev_x and y>prev_y fails. With prev=(0,-1): starts x=y=some s≥0. If s=0, no loop. If s>0: x>0 and y>-1 → consume to x=0,y=0, then x>0 fails. Good. All "=" consumed. 

Edge: at d>0, condition k == -d with trace[d] being post-(d-1) state: at step d, k=-d only reachable via down move from k=-(d-1). v[k+1] = v[-(d-1)+offset] set at step d-1. Fine.

Edge case both lists empty: N=M=0. Loop d=0: trace=[v.copy()], k=0: k==-d true, x = v[1+offset]=0, y=0, while no, v[0+offset]=0, x>=0 and y>=0 → found. Backtrack: d=0, prev as above, result empty. Good.

Edge a empty, b nonempty: D = M, path all down moves. Should work: at d, k=-d chosen, x = v[k+1+offset]... k=-d: condition k==-d → x = v[k+1+offset] which was set at previous step for k=-(d-1) = x_prev. Good.

Edge a nonempty, b empty: D = N, all right moves. At step d, k=d: condition k==d → else branch, x = v[k-1+offset]+1. Good.

Performance concern: memory trace stores 2*MAX+2 ints per d; for D up to ~N+M. For 1000 vs 1000 completely different, MAX=2000, trace size 2001 * 4002 ≈ 8M ints → ~64MB+ as Python list of ints... Actually Python list of small ints with shared int objects: 8M pointers = 64MB. Hmm, that's borderline but acceptable? Could be ~100MB with list overhead. Maybe use dict-based V to reduce memory? Dict with 2d+1 entries per d: total ~ sum(2d+1) = D² ≈ 4M entries → dict overhead larger (~100+ bytes/entry) → worse. 

Alternative: don't store full trace; recompute using divide-and-conquer linear space (Hirschberg/Myers linear). That's more complex but safer memory-wise and time. Time: O((N+M)*D) forward anyway. For 20000/50-diff case, D=100, trivial. For worst case 1000 completely different, 8M ints in lists = list of 4002 elements × 2001 = each list ~32KB (pointers) → 2001×32KB ≈ 64MB. Probably fine within typical limits, but "under 6 seconds" is time, memory not specified. 64MB acceptable generally.

But actually small ints 0..2000 are cached? CPython caches -5..256; ints >256 are created but shared via references since v holds same object... each unique int object exists once per value assignment? Not necessarily shared, but the pointer list is what matters: 4002×8 bytes = 32KB per trace entry, ×2001 = 64MB. Hmm. Plus the initial v.copy(). Could be risky but probably OK.

Alternative: store trace only for values, using array module ('i' typed array) → 4 bytes per entry: 4002×4 ≈ 16KB per d, ×2001 = 32MB. Better: use array.array('i', v)? copy overhead O(2*MAX) per step: total O(D*MAX) = 2000*2000=4M ops, fine. But for the 20000-line case, MAX=40000, D=100: each copy is 80002 elements ×100 = 8M ops — fine, and memory 100×160KB=16MB... hmm that's array of int32: 40002*4=160KB ×101 ≈ 16MB. Fine.

Actually simpler: instead of copying full v each d, only copy the slice [-d..d]? Store as dict per d: {k: x}. For D=2000, total entries 4M dicts entries — dict overhead heavy. For D=100, trivial.

Alternative better: linear-space Myers (middle snake divide & conquer). Time O((N+M)D) total typically, memory O(N+M). This handles worst cases better. Let me implement that properly — it's the "efficient" version from Myers' paper.

Linear-space algorithm:

find middle snake of a[0:N], b[0:M]:
- reverse-oriented comparison. Use forward and backward D-paths until overlap.

```python
def _middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2 + 1
    delta = N - M
    odd = delta % 2 != 0
    vf = {1: 0}  # forward: k -> x ; offset with dict
    vb = {1: 0}  # backward: k -> x (in reversed coordinates)
    vf_offset...
```

Using dicts with keys centered around 0 is easy. Forward: vf[k] = furthest x. Backward: vb[k] = furthest x measured from end (x' = N - x). Standard:

```
def diff(a, b):
    # returns list
    N, M = len(a), len(b)
    if N == 0: return [("+", x) for x in b]
    if M == 0: return [("-", x) for x in a]
    # trim common prefix/suffix for speed
    ...
    result middle...
```

Implement recursive:

```python
def _diff(a, b, off_a, off_b, n, m, out):
```

Simpler: implement diff on slices with indices, appending to result in forward order using divide and conquer:

```python
def diff_lines(a, b):
    result = []
    _diff(a, 0, len(a), b, 0, len(b), result)
    return result

def _diff(a, a0, a1, b, b0, b1, out):
    # strip common prefix
    while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
        out.append(("=", a[a0]))
        a0 += 1; b0 += 1
    # strip common suffix -> collect later; but order matters. Handle suffix by recursing? 
```

With prefix stripping and appending "=" directly, order is fine. For suffix, we can recurse into middle then handle suffix at the end — but suffix stripping must be done inside each sub-problem before middle snake. Standard approach: in _diff, first strip prefix (emit "="), strip suffix (remember count), find middle snake via Myers, recurse left part, emit middle snake "="s, recurse right part, then emit suffix "="s. Order: left recursion output, middle "=", right recursion output, then suffix "="s — correct.

Middle snake finding (from Myers paper section 4b):

```python
def _find_middle(a, a0, a1, b, b0, b1):
    n = a1 - a0
    m = b1 - b0
    delta = n - m
    odd = (delta & 1) == 1
    # use dicts
    vf = {1: 0}
    vb = {1: 0}
    dmax = (n + m + 1) // 2 + 1  # hmm ceil((n+m)/2)
    for d in range(dmax + 1):
        # forward
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and vf.get(k-1, ...) < vf.get(k+1, ...)):
                x = vf[k+1]... need get defaults
```

Careful with dict defaults: vf.get(k-1, -inf)? Standard condition: if k == -d or (k != d and vf[k-1] < vf[k+1]). Use dict with default: vf.get(k-1, -1)? Since x ≥ 0 always and unset k means unreachable, use -1 as default for min comparisons... Let's just use arrays with offset like before to avoid subtlety, sized 2*dmax+3? k ranges -(n+m) to (n+m) but limited. Use local arrays of size n+m+3? Simpler: dicts with get(k, -1) for forward vf (x values, nonneg), and for backward vb storing x measured from the end: vb[k] where k = (x+y) - n - m in reverse coordinates... Let me carefully write backward.

Backward path: start at (n, m), move left (delete) or up (insert), furthest-reaching in reverse = minimal x? Standard formulation: reverse D-path endpoints characterized by k' = x - y with... Let me use the well-known formulation (from Myers paper / gabriele lanaro implementations):

Define reverse V: for k in range(-d, d+1, 2) where k = (x + y) - (n + m)? Hmm. Alternative common approach: represent backward over reversed sequences and just reuse forward logic, then map back. That's cleaner: reverse both a and b slices, compute the forward middle-snake logic on reversed, then translate.

Actually the classic clean implementation: 

```
def shortest_edit(a, b): ... forward only storing trace (O(ND) memory)
```

Given the problem constraints (D ≤ 2000 worst), maybe simple O(ND) memory trace is acceptable. 64MB... Risky? Typical judges fine. But let me just implement the linear-space version properly to be safe and elegant? Linear-space is trickier to get right; bugs would be worse. Let me weigh: the problem explicitly says performance hints Myers O((N+M)·D). Simple trace version meets time easily. Memory 64MB for extreme case—actually let me recompute: D for two completely different 1000-line lists: every comparison mismatches? "completely different" — no common lines at all, so LCS=0, D = N+M = 2000. trace entries: d from 0..2000 → 2001 copies of list of length 2*MAX+2 where MAX = N+M = 2000 → 4002 entries each. 2001*4002*8 bytes ≈ 64MB. Hmm. Plus if lists are "completely different" but interleaved... D could approach 2000 only if no common subsequence at all. With repeats allowed, "completely different lists" presumably means disjoint line sets, D=2000. 64MB is probably fine but could be reduced by storing only the used slice of v per d: at step d, only k in [-d, d] are meaningful. Store slice v[MAX-d : MAX+d+1].copy()? That's a list slice copy, cheap. Total memory = sum over d of (2d+1) ≈ D² = 4M pointers = 32MB. Better. Backtrack then indexes with adjusted offset.

Alternatively store per-d dict — slower.

Alternatively: use the divide-and-conquer to be fully robust. Let me actually write linear-space Myers carefully. I've done it before; let me write it with dict-based V and reverse via negation.

Middle snake algorithm (Myers 1986, section 4):

Given sequences A (len N) and B (len M), delta = N - M.
- Forward search: Vf[k] = furthest x reaching k. Start Vf[1] = 0.
- Reverse search: Vr[k] = furthest x (from the start, i.e., minimal x such that reverse path from (N,M) reaches x on diagonal k... ) Standard: for reverse, define Vr over k where reverse path of length d ends at diagonal k; store the minimal x? Many implementations store "x" as the leftmost point.

Common implementation (e.g., from " Myers diff algorithm linear space" blog posts):

```python
def find_middle_snake(a, b):
    n, m = len(a), len(b)
    max_d = (n + m + 1) // 2
    delta = n - m
    odd = delta % 2 != 0
    # V arrays indexed by k with offset
    size = 2 * max_d + 1
    offset = max_d
    vf = [0] * (size + 2)
    vb = [0] * (size + 2)
    for d in range(max_d + 1):
        # forward
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vf[k - 1 + offset] < vf[k + 1 + offset]):
                x = vf[k + 1 + offset]
            else:
                x = vf[k - 1 + offset] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            vf[k + offset] = x
            if odd and (k - delta) in range(-(d - 1), d, 2):  # reverse has reached d-1 on overlapping diagonals
                if vf[k + offset] + vb[delta - k + offset] >= n:
                    return ...  # snake found, forward direction: from (vf[k+1+offset]?, ...)
        # reverse
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vb[k - 1 + offset] < vb[k + 1 + offset]):
                x = vb[k + 1 + offset]
            else:
                x = vb[k - 1 + offset] + 1
            y = x - k
            while x < n and y < m and a[n - 1 - x] == b[m - 1 - y]:
                x += 1; y += 1
            vb[k + offset] = x
            if not odd and (k - delta) in range(-d, d + 1, 2):
                if vb[k + offset] + vf[delta - k + offset] >= n:
                    return ...
```

Hmm wait — reverse condition: reverse path on diagonal k (in forward coordinates) corresponds to reverse-V index delta - k? Let's define reverse coordinates: reverse path starts at (n, m), we let x_r = n - x, y_r = m - y, and k_r = x_r - y_r = k - delta... Actually k = x - y, k_r = x_r - y_r = (n-x)-(m-y) = (n-m) - k = delta - k. So forward diagonal k corresponds to reverse index k_r = delta - k.

The reverse loop with index kr: vb[kr + offset] where kr ranges over (-d..d step 2), and vb[kr] stores x_r (distance from end). Overlap condition: forward at diagonal k with x_f, reverse at diagonal k with x_r such that x_f + x_r ≥ n where x_r = vb[(delta - k) + offset].

Hmm, but the code above uses vb indexed by kr and checks delta - k. And condition `odd and -(d-1) <= k - delta <= d - 1`... The reverse V was filled up to d_r = d - 1 during previous iterations (since we do forward for d then reverse for d; before forward at step d, reverse has completed steps 0..d-1). When delta is odd, overlap must occur in forward step at some d where reverse has d_r = d - 1. Condition: the corresponding reverse diagonal kr = k - delta must satisfy |kr| ≤ d - 1. When delta even, overlap detected in reverse step d with forward completed d_f = d (or d? forward completed steps 0..d). Condition kr = k - delta, |kr| ≤ d.

Then the snake: need to return the middle snake (start point and end point) to split. The middle snake found via forward: the snake ends at (x, y) on diagonal k, started at (x_start, y_start) where x_start = previous x before the snake. To reconstruct: the snake consists of the non-diagonal move at step d from d-1 path plus diagonals. In forward detection: at step d, diagonal k, position x (furthest). The path: predecessor on d-1 at diagonal prev_k (per the choice), with furthest x_prev; the move gives point (x0, y0): if prev_k = k+1 (down/insert), x0 = x_prev, y0 = x_prev - k... hmm wait if we came from k+1 via down move: position after move = (vf[k+1], vf[k+1] - k). Wait down move: from (x_prev, y_prev) with y_prev = x_prev - (k+1), move down → (x_prev, y_prev + 1) → check k: x - y = x_prev - y_prev - 1 = k. Yes. Then snake to (x, y). So snake start = (x0, y0) after the single edit move, end = (x, y).

For the divide and conquer we need the snake's endpoints in the current subproblem: the middle snake is the overlapping snake; we split the problem into (a[0:xs], b[0:ys]) and (a[xe: ], b[ye: ])? Actually we need: find middle snake with start (x, y) and end (u, v). Then recursively diff left: a[x0? ...]. Per Myers: given middle snake from (x,y) to (u,v), recurse on A[1..x], B[1..y] and A[u+1..N], B[v+1..M], and output "=" for a[x+1..u]? Indices 1-based. In 0-based: snake spans a[x_start .. x_end-1], and left problem is a[0:x_start], b[0:y_start]; right problem is a[x_end:], b[y_end:]; and the snake itself emits "=" for a[x_start:x_end].

For forward-detected snake: end = (x, y) as computed; start = (x0, y0) as above (position right after the edit move, before snake). But careful: the middle snake per Myers might need to be found such that... For the forward case, the snake start point: we need the point after the edit. Compute prev_k from condition, x_prev = vf[prev_k + offset] (value from step d-1, but vf has been updated during this d loop for other k's — prev_k's value: for k loop, when processing k, vf[k-1] and vf[k+1] were set at step d-1 (not yet at step d since we step by 2 and within same d, k-1 and k+1 belong to opposite parity). Yes: within step d, k values have same parity, and k±1 have opposite parity = set at step d-1. Safe to read after updating vf[k] too? We read before updating vf[k] in the condition; and x_prev read... we read condition first then compute. Fine.

For reverse-detected snake (delta even): reverse path at step d, diagonal kr, furthest x_r. Snake in reverse: end (in forward coords) = point right after reverse edit move translated, start = (n - x_r, m - y_r). Translate: reverse position (x_r, y_r) from end corresponds to forward point (n - x_r, m - y_r). The reverse snake goes from (n - x_r, m - y_r) backward to... The reverse path: edit move then snake moving toward start (n,m)? Reverse path moves from (n,m) toward (0,0) in reverse orientation; the snake in forward coordinates: forward-coords snake start = (n - x_r, m - y_r), end = point after edit move in reverse = reverse point (x0_r, y0_r) → forward (n - x0_r, m - y0_r). And the snake's forward direction is from (n-x_r, m-y_r) to (n-x0_r, m-y0_r).

Overlap condition check: vf[delta - kr + offset] + vb[kr + offset] ≥ n? Hmm: forward furthest x on forward-diagonal k = delta - kr: x_f. Reverse reached x_r on reverse-diagonal kr meaning forward point x = n - x_r on forward diagonal k = delta - kr? Check: forward diagonal of point (n - x_r, m - y_r): (n - x_r) - (m - y_r) = delta - (x_r - y_r) = delta - kr. Yes. Overlap when x_f + x_r ≥ n.

But subtlety: which snake do we return and does the recursion terminate correctly? Known correct implementations exist. Let me write it following a known-correct pattern. I'll adapt the well-known Python implementation style (e.g., from the "diff-match-patch" style or Robert's implementation). 

Alternatively, avoid all this: use the simple O(ND) trace algorithm but with memory optimization of storing per-d dict {k: x} only for k in [-d, d]. For the pathological D=2000 case: 2001 dicts with avg 2000 entries = 4M entries. Python dict entry ~ 100 bytes → 400MB. Too much. Lists better: 32MB with slices. That's acceptable, honestly. And time: for the 20k/50-diff case: MAX=40000, but the v list of size 80002 created once; d loop up to 100; each step copies slice of length 2d+1 ≤ 201 → trivial. For 1000-different case: v list size 4002, copies: sum 2d+1 ≈ 4M element copies — fine, well under a second. Plus the O(ND) core: 4M iterations of inner while — pure Python ~ maybe 2-4 seconds? Hmm, 4M loop iterations in Python ≈ 2s each doing simple ops... The d-loop itself: sum over d of (2d+1) ≈ D² = 4M iterations of the k-loop, each doing a few operations plus snake extension (which for completely different lists does zero extensions). 4M iterations × ~10 ops ≈ maybe 3-5 seconds. Tight for the 6-second limit!

Hmm. The k-loop for completely different 1000/1000: total k iterations = sum_{d=0}^{2000} (d+1) ≈ 2M (step 2). Each iteration: condition check, x computation, y = x - k, while check (fails immediately, 2 comparisons), assignment. ~ maybe 1-2 µs per iteration → 2-4 seconds. Risky against 6s. Also finding D: loop runs until found at d=2000.

Optimization: trim common prefix and suffix first! For 1000 completely different with no common prefix/suffix, no help. But we can add a quick optimization: if no lines of a appear in b at all, return all "-" then "+". Hmm, that's a special case; "completely different lists" likely means that. But shouldn't rely solely.

Better: implement linear-space Myers with divide & conquer. Total time O((N+M)·D) but with smaller constants? Same order. The 2M k-iterations remain. Hmm.

Could speed up the inner loop using local variable binding, avoiding attribute lookups. Also use arrays with direct indexing.

Alternative approach to reduce work dramatically: use hash-based unique-line trimming? Not standard requirement.

Let me estimate more carefully the simple algorithm cost for the 1000-completely-different case. N=M=1000, D=2000. The algorithm loops d=0..2000, k=-d..d step 2 → total k-iterations = sum_{d}(d+1) = ~2,003,001. Each iteration in optimized Python: maybe 0.3–0.6 µs? Realistically Python does ~10-30M simple bytecode ops/sec... An iteration has ~15 bytecode ops → ~0.5-1 µs → 1-2 seconds. Should be OK under 6s. Plus trace slicing ~4M element copies ~0.2s. OK.

But wait — is D really 2000 for "completely different lists of 1000 lines"? If lines are all distinct between the two lists, then any common subsequence is empty, D = N + M = 2000. Yes. So ~2M k-iterations. Should fit in 6s with a tight implementation.

Also the 20,000-line case differing in ~50 places: D ≈ 100. Prefix/suffix trimming helps hugely: after trimming common prefix and suffix, the remaining differing region might still be large (e.g., changes spread throughout — trimming only helps at ends). Without trimming, N+M=40000, D=100 → work ≈ (N+M)*D ≈ 4M? No: work is sum over d of number of k's × snake lengths. The k-loop iterations = sum_{d≤D}(d+1) ≈ D²/4? = ~2600 for D=100. Snake extensions: each k iteration extends until mismatch; worst case each extension is O(N) → D*N = 100*20000*... hmm total snake work is O((N+M)·D) = 4M char/line comparisons worst case. In practice, for a diff with 50 changed regions, snakes are long but the total is bounded by (N+M)·D/... Each d-paths' snakes can overlap heavily. Worst case 4M line comparisons ≈ 2-4 s in Python? Hmm, each comparison is a string equality — fast. 4M iterations of a tight while loop ≈ 1.5-3s. Tight against 2s limit!

Prefix/suffix trimming: if the 50 differences are spread out, trimming saves little. But actually with D small, does the snake extension total really reach (N+M)·D? The total work of Myers O(ND) worst case arises when D is large. For D=100 and N+M=40000: worst-case total snake steps = (N+M)·D = 4M. When would that happen? The while extension at each (d,k) continues until mismatch. With many repeats of the same line, snakes can be long repeatedly. E.g., a and b identical except 50 edits → actually then D=100 and the algorithm will find matches quickly... The worst case for fixed D: lines repeat a lot, causing long snakes at many (d,k). E.g., a = 20000 copies of "x" with one different line, b = 20000 copies of "x": D=2. Fine. To force long total: hmm, hard with D=100. Generally the snake at each (d,k) ends at the first mismatch; overlapping diagonals through repeated content... Consider a = [x]*10000 + [y]*10000, b = [y]*10000 + [x]*10000: D = 20000 (completely different alignment). Not our case.

The real bound: total = sum over d ≤ D of snake lengths over all k ≤ (N+M) per d... it is O((N+M)·D) = 4M worst case. Whether realistic tests hit it: "differ in about 50 places" — e.g., 50 edited lines scattered. Then a and b share long runs; diagonals k near 0 have long snakes, others short? Actually consider a = b except a[i] modified at 50 spots. D = 100 (50 deletes + 50 inserts? if modifications, D=100 if each modified line differs). Snake extensions: at each (d,k), extension runs until hitting a modified position. For d small, paths stay near main diagonal but extensions cross whole document until a mismatch — extension length up to distance between consecutive edits ~ N/50 = 400. Summed: D²/4 × 400? No wait — extension per (d,k) is until first mismatch, which for k near 0 is up to ~400 (distance to next edit). Number of (d,k) pairs ≈ D²/2 = 5000 → 5000 × 400 = 2M. Hmm, comparable to 2s in Python... borderline.

Add prefix/suffix trimming: doesn't help mid-document edits.

Hmm, but realistically with 50 scattered edits, at step d, k ranges -d..d; the furthest-reaching x on diagonal k after extension... For this kind of input, the total extension work: at each d, sum over k of extension lengths. The furthest points advance; extensions are bounded by gaps between edits. Total ≈ sum_d sum_k gap ≈ D × (avg gap × num k)? Not exactly — extensions are limited by where mismatches are. Let me think: worst case a line repeats: e.g., document of repeated blocks. Honestly, the stated test ("differ in about 50 places") is probably a realistic diff scenario where Myers performs fine. Many reference implementations pass such tests in Python. I'll optimize the hot loops (local vars, minimal ops) and trim prefix/suffix. I think it'll be OK.

To be safer on speed, consider the linear-space divide-and-conquer version — it does the same asymptotic work though. Alternatively use the "check overlap with both directions" to cut D in half — linear space version runs forward and reverse simultaneously and stops at ~D/2+1 steps for one of them... The linear-space middle snake needs only ceil(D/2) steps of each direction, and the divide and conquer recurses. Total time still O((N+M)·D) but with better constants sometimes. Complexity of implementation higher.

Alternative big optimization: use difflib? Forbidden.

Another optimization: map lines to integers via a dict (id per unique line) so comparisons are int comparisons instead of string equality — string equality of equal strings is fast (pointer check first), unequal strings of same content hash... equality check for identical string objects is O(1) via identity; for distinct objects with same content, O(len). Lines in files are usually interned? Not automatically. Mapping to ints is a solid constant-factor win: compare ints. Also enables... Let's do: build dict line→id over a and b, convert to int lists. Then comparisons are fast C-level int equality. Also prefix/suffix trimming via int comparison.

Also, an important optimization for the "50 edits in 20000 lines" case: trim common prefix/suffix, and even better, we can note the O((N+M)·D) bound counts snake steps; with trimming, N+M shrinks to the span between first and last edit... no—only if first edit is near start. "differ in about 50 places" spread over 20000 lines: span stays ~20000. Hmm.

Alternative: anchor-based approach — find unique common lines (like diff's "unique anchors")? Overkill.

Let me just estimate the 20k/50-edit case again with trimming and int comparisons: worst-case snake work ~2M-4M tight int comparisons → ~1-2 s. Probably passes. Also the k-loop overhead D²=2600 — negligible. Memory for trace: slice copies per d of length ~2d+1, D=100 → trivial.

For the 1000-different case: k-iterations 2M, snake steps ~0 → ~1.5s. Fine.

But hold on: worst case where D is large AND snakes long can't be constructed beyond the given tests; the spec only requires those two performance cases. Good, go with simple trace version + optimizations:

1. Trim common prefix and suffix.
2. Map lines to ints (dedupe via dict).
3. Myers forward with per-d trace storing only [-d, d] slice.
4. Backtrack and produce script; prefix "=" emitted first, suffix "=" appended last; middle script in between. Wait — ordering: after trimming prefix (p lines) and suffix (s lines), the script is: "=" × p, then script of middles, then "=" × s. Correct.

But careful: trimming suffix first then prefix? Trim prefix first then suffix on the remainder. Standard.

Edge: after trimming, if one side empty → all "-" or "+".

Backtracking with sliced trace: store trace[d] = v[offset-d : offset+d+1] copy? At the time we store (top of d iteration), the meaningful entries from step d-1 are k in [-(d-1), d-1]. But backtracking at step d needs vf values for k in [-d, d]?? At backtrack for step d we read v[k-1] or v[k+1] where k in [-(d-1)... hmm: at backtrack step d (with current point on path d), k = x - y ∈ [-d, d]. The condition reads v[k-1], v[k+1] — these are values from step d-1, in range [-(d-1), d-1] ∩ ... k-1 ≥ -d-1? If k = -d, condition short-circuits (k == -d) without reading. If k = d, reads v[k+1] = v[d+1]? Condition: k == -d or (k != d and ...). If k == d, second clause false due to k != d → else branch reads v[k-1] = v[d-1]. OK. If -d < k < d: reads v[k-1], v[k+1], both within [-(d-1), d-1]. And prev_x = v[prev_k], prev_k ∈ {k-1, k+1} ⊂ [-(d-1), d-1] when |k| < d; if k == -d: prev_k = k+1 = -(d-1) ✓; if k == d: prev_k = d-1 ✓. So trace[d] needs entries for k in [-(d-1), d-1] from step d-1 state. So store slice v[offset-(d-1) : offset+d] — but simpler to store full [-d, d] slice which includes step-(d-1) values in that range (entries at k=±d may be stale/garbage but unused... wait at backtrack for step d, do we ever read v[±d]? Shown above: no). But trace[d] is captured BEFORE processing step d, so v[offset-d] and v[offset+d] hold stale values from earlier steps — unused in backtrack. 

But there's a subtlety: the captured slice at step d must reflect state after step d-1 for indices [-(d-1), d-1]. v is mutated during step d at indices k ∈ {-d,...,d} — but capture happens before mutation. However, indices within [-(d-1), d-1] were last written at step d-1 (all k of that parity... within [-（d-1), d-1], indices of parity matching d-1 were written at step d-1; indices of parity matching d-2 were written at step d-2 — but at step d-1, all k in [-(d-1), d-1] with step 2 parity of d-1 get written; the other parity indices in that range are NOT written at step d-1, retaining step d-2 values. But backtrack only reads prev_k which has parity of d-1 (since k has parity d, k±1 has parity d-1). ✓. So all reads are of values written at step d-1. 

Slice capture: at iteration d, capture v[offset-d : offset+d+1] (length 2d+1). Then within backtrack, index k maps to slice index k + d. Let me store tuples of the captured lists plus offset d.

Backtrack code:

```python
x, y = N, M  # of trimmed problem
script_mid = []
for d in range(len(trace) - 1, -1, -1):
    row = trace[d]  # row[j] = v[offset - d + j]
    k = x - y
    j = k + d
    if k == -d or (k != d and row[j - 1] < row[j + 1]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = row[prev_k + d]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        script_mid.append(("=", a_mid[x - 1]))
        x -= 1
        y -= 1
    if d > 0:
        if x == prev_x:
            script_mid.append(("+", b_mid[y - 1]))
        else:
            script_mid.append(("-", a_mid[x - 1]))
        x, y = prev_x, prev_y
```

Wait: for d == 0, we still need to consume diagonals — done by while loop with prev_x=row[0+d]=row[d]... at d=0, row = v[offset-0:offset+1] = [v[offset]] which was written during step 0: v[offset] = x after snake at k=0. But capture happens before processing d=0, so row[0] = initial 0. prev_x = 0, prev_y = 0? prev_y = prev_x - prev_k; prev_k: k=0 == -d → prev_k = 1, prev_x = row[1]?? Row has length 1! IndexError. Hmm. At d=0, k must be 0 and condition k == -d (0==0) → True → prev_k = 1, prev_x = row[0 + 0 + 1] = row[1] — out of bounds for length-1 slice.

Fix: make slice length 2d+3: capture v[offset-d-1 : offset+d+2]? Then row[j] with j = k+d; reads row[j±1] and row[prev_k + d]; for k=-d: prev_k=-(d-1), j = d-1, row[j] fine; row[j+1] = row[d] read when k=-d? Condition short-circuits at k==-d so no read of row[j+1]. But in original full-array version I used prev_k=1 for d=0 giving prev_x = v[offset+1] = 0 (initial), prev_y = -1 — harmless. To keep exactly that behavior, capture slice of length 2d+3: v[offset-d-1 : offset+d+2]. Values at j=0 (k=-d-1) and j=2d+2 (k=d+1) are stale/initial — for d=0, row = v[offset-1:offset+2] = [stale, v[offset](=0 initial), stale]. prev_k=1 → row[1] = 0 = initial. prev_y = -1. While loop: while x > 0 and y > -1 → consumes diagonals down to (0,0)... wait x>0 and y>-1: from (s,s), decrements to x=0,y=0 then x>0 fails. ✓. d>0 false, done. Then remaining x,y = 0,0? x=0,y=0 after loop ✓.

Hmm wait, but the stale values at row[0] and row[2d+2]: could backtrack ever read them? row[j-1] read when k>-d... k=-d+? For k = -d+2 (same parity), j = 2d+... j-1 = k+d-1 ≥ d+1? For k=-d, no read. For k=-d+2: j-1 = d+1 ≤ 2d+1 fine. row[j+1] read when k < d: j+1 = k+d+1 ≤ 2d+1. prev_k + d ∈ [d-1, d+1] ⊂ [1, 2d+1] for d≥1. So indices 0 and 2d+2 never read. ✓.

Actually simpler: just store full copy v.copy()? For D=2000, MAX=2000 → 2001 copies × 4002 = 64MB. With slicing 2d+3: total ≈ sum (2d+3) ≈ D² = 4M ≈ 32MB. Meh, do slicing.

Hmm, wait, actually there's another subtle issue with slicing + the "found" break: we break out of the k-loop when x≥N and y≥M; capture happened at top of iteration d. ✓.

Also need v large enough: indices offset±(d+1) with d up to D ≤ N+M. Size 2*(N+M)+3 fine. offset = N+M... let me set offset = max_d where max_d = N+M (max possible D). Actually D ≤ N+M. v size = 2*(N+M) + 3, offset = N+M+1. Indices k+offset ∈ [1, 2(N+M)+1]. ✓.

Now the found condition check: `if x >= n and y >= m` after each k. Break out of both loops via flag.

Let me also apply line→int mapping: `ids = {}` with setdefault. a_int = [ids.setdefault(line, len(ids)) for line in a], similarly b. Then trim prefix/suffix on int lists, run Myers on int lists.

Trim prefix: while p < n and p < m and ai[p] == bi[p]: p+=1. Suffix: while s < (n-p) and s < (m-p) and ai[n-1-s] == bi[m-1-s]: s+=1.

Then a_mid = ai[p:n-s], b_mid = bi[p:m-s].

Script = [("=", a[i]) for i in range(p)] + mid_script + [("=", a[n-s+i]) for i in range(s)]. But mid_script was built reversed then reversed in place.

Wait — mid_script built via backtrack appends in reverse order (from end), then we reverse. The prefix/suffix "=" entries: prefix emitted in forward order — combine at end:

result = eq_prefix + list(reversed(mid)) + eq_suffix.

Hold on: mid_script appended in reverse; the prefix "=" must come before mid. Since we construct final list at end, order handled. ✓.

Now the main Myers loop, optimized:

```python
def diff_lines(a, b):
    # map lines to ints
    table = {}
    def enc(lines):
        get = table.setdefault  # hmm setdefault(line, next_id) — need counter
    ...
```

Use:
```python
    ids = {}
    n_id = 0
    ai = []
    for line in a:
        i = ids.get(line, -1)
        if i < 0:
            i = n_id; ids[line] = i; n_id += 1
        ai.append(i)
```
Similar for b. Or itertools with setdefault trick: `ids.setdefault(line, len(ids))` — works since len(ids) evaluated before insert; if line exists, returns existing. Yes: `ai = [ids.setdefault(x, len(ids)) for x in a]` — elegant and correct.

Trimming:
```python
    n, m = len(ai), len(bi)
    p = 0
    while p < n and p < m and ai[p] == bi[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and ai[n-1-s] == bi[m-1-s]:
        s += 1
    A = ai[p:n-s]
    B = bi[p:m-s]
```

Myers:
```python
    n, m = len(A), len(B)
    if n == 0:
        mid = [("+", B[y]) for y in range(m)]  # careful order
    elif m == 0:
        mid = [("-", A[x]) for x in range(n)]
    else:
        ... myers ...
```

Myers core:
```python
        max_d = n + m
        offset = max_d + 1
        v = [0] * (2 * max_d + 3)
        trace = []
        d = 0
        found = False
        while d <= max_d:
            trace.append(v[offset - d - 1 : offset + d + 2])
            k = -d
            while k <= d:
                if k == -d or (k != d and v[offset + k - 1] < v[offset + k + 1]):
                    x = v[offset + k + 1]
                else:
                    x = v[offset + k - 1] + 1
                y = x - k
                while x < n and y < m and A[x] == B[y]:
                    x += 1
                    y += 1
                v[offset + k] = x
                if x >= n and y >= m:
                    found = True
                    break
                k += 2
            if found:
                break
            d += 1
```

Then backtrack as above with a_mid = A, b_mid = B.

Then:
```python
    mid.reverse()
    out = [("=", a[i]) for i in range(p)]
    out.extend(mid)
    out.extend(("=", a[n0 - s + i]) for i in range(s))  # n0 original len
```
Careful variable naming: use an, bn original lengths; n, m trimmed lengths.

Wait, one more check on backtrack prev_y computation and edit emission. Let me re-derive with a small example: a = ["a"], b = ["b"]. n=m=1. max_d=2. d=0: trace slice [v[offset-1:offset+2]] = [0,0,0]. k=0: k==-d → x = v[offset+1] = 0, y = 0. A[0] vs B[0]: differ, no snake. v[offset] = 0. Not found. d=1: trace slice v[offset-2:offset+3] (5 elems, values [0,0,0,0,0]). k=-1: k==-d → x = v[offset+0] = 0, y = x - k = 1. Snake: x<1,y<1? y=1 not <1 → no. v[offset-1] = 0. Check x>=1? 0>=1 no. k=1: k==d → else branch x = v[offset+0]+1 = 1, y = 0. Snake: x<1? no. v[offset+1] = 1. x>=1 and y>=0 ✓ found.

Backtrack: d=1: row = trace[1], k = x - y = 1 - 0 = 1, j = k + d = 2. k == d → prev_k = 0. prev_x = row[0 + 1] = row[1] = v[offset-1] captured = 0. prev_y = 0 - 0 = 0. While x>prev_x and y>prev_y: x=1>0, y=0>0 false → no diagonals. d>0: x == prev_x? 1 vs 0 no → emit ("-", A[x-1]) = ("-", A[0]) = ("-", "a") ✓. x,y = 0,0. d=0: row = trace[0] = [0,0,0] (v[offset-1..offset+1] initial). k = 0, j = 0. k == -d → prev_k = 1, prev_x = row[0+0+1] = row[1] = 0, prev_y = -1. while x>0 and y>-1: both 0 → false. d==0 no emit. Done. mid = [("-", "a")]. Missing ("+", "b")!

Hmm! Something wrong. The path: d=1, we emitted the "-" but the "+"? Let me re-examine. Path at d=1: k=1 reached via right move from k=0 at d=0: from (0,0) right → (1,0), then snake (none). So the script is "-" then "+". Backtrack: at d=1, position (1,0). k=1, prev_k=0, prev position on d=0 path is (prev_x=0, prev_y=0)... wait v[offset+0] at step 0 = 0, so the d=0 furthest point on k=0 is (0,0). The right move goes from (0,0) to (1,0). So after emitting "-" at x=1, we set x,y = prev = (0,0). Then d=0: while loop consumes nothing, no emit. But where's the "+"?? 

Oh! I think the issue: the right move from (0,0) to (1,0) is a "-" (delete a[0]); then to produce b we need "+" somewhere. But path ends at (1,0) which is (n, m)? n=1, m=1, but y=0 ≠ m=1. Found condition: x>=n and y>=m — x=1≥1 ✓, y=0≥1 ✗. So d=1 k=1 shouldn't have been "found"! Let me recheck: at k=1, y = x - k = 1 - 1 = 0. x>=1 and y>=1 → false. Not found. Then d=2: k=-2: x = v[offset-1]... k==-d → x = v[offset + k + 1] = v[offset-1] = 0, y = 2. v[offset-2] = 0. not found. k=0: k==-d? no; k != d and v[offset-1](0) < v[offset+1](1) → true → x = v[offset+1] = 1, y = 1. Snake: x<1 no. v[offset] = 1. x>=1, y>=1 → found ✓. trace[2] captured slice v[offset-3:offset+3].

Backtrack: d=2: x=1,y=1,k=0,j=2. k==-d? no. k!=d and row[j-1] < row[j+1]: row = trace[2] slice of v[offset-3..offset+2]. row[1] = v[offset-2] = 0 (set at d=2 k=-2), row[3] = v[offset+1] = 1 (set at d=1). 0 < 1 → prev_k = 1. prev_x = row[1+1] = row[2] = v[offset-... wait row[j] corresponds to k = j - d = 2-2 = 0 → row[2] = v[offset + 0] captured before d=2 processing = value from d=1... v[offset] was set at d=0 to 0; at d=1 k... k=±1 only, k=0 not touched at d=1. So row[2] = 0. prev_x = 0, prev_y = 0 - 1 = -1?? prev_y = prev_x - prev_k = 0 - 1 = -1. Hmm that's wrong — prev point on d=1 path at k=1 is (1, 0): prev_x should be 1!

Wait — prev_k = k+1 = 1 corresponds to diagonal 1 at step d-1=1: v[offset+1] after step 1 = 1 (set at d=1, k=1: x=1). But trace[2] was captured BEFORE processing d=2 but AFTER d=1 completed — so v[offset+1] = 1 at capture time. row[3] = v[offset+1] = 1, not... let me recount slice indexing: trace[2] = v[offset - d - 1 : offset + d + 2] = v[offset-3 : offset+4]. row[j] = v[offset - 3 + j]. k=0 → j = k + d = 2 → row[2] = v[offset -1]?? offset - 3 + 2 = offset - 1. That's wrong! Mapping: row[j] = v[offset - (d+1) + j], so k = j - (d+1), i.e., j = k + d + 1. I had j = k + d — off by one!

Fix: j = k + d + 1. Check d=0: row = v[offset-1 : offset+2], j = k + 1 ∈ {1}. ✓ row[1] = v[offset]. prev_k + d + 1 ∈ [d, d+2]. For d=0, prev_k=1 → row[2] = v[offset+1] = initial 0 ✓ (prev_x=0, prev_y=-1 as before ✓).

Redo backtrack for the example: d=2: row = v[offset-3:offset+4] captured; k=0, j=1... k=0,d=2 → j=3. Condition: row[j-1]=row[2]=v[offset-1]=0; row[j+1]=row[4]=v[offset+1]=1 → 0<1 → prev_k=1. prev_x = row[prev_k + d + 1] = row[1+3] = row[4] = v[offset+1] = 1 ✓. prev_y = 1 - 1 = 0 ✓. While x>prev_x(1>1 no) → none. d>0: x==prev_x (1==1) → emit ("+", B[y-1]) = ("+", B[0]) = ("+", "b") ✓. x,y = (1,0). d=1: row = trace[1] = v[offset-2:offset+3], k = 1-0 = 1, j = k+d+1 = 3. k==d → prev_k = 0. prev_x = row[0+2] = row[2] = v[offset-2+2] = v[offset] captured before d=1 = 0 ✓. prev_y = 0. While x>0,y>0: x=1>0, y=0>0 false. Emit: x==prev_x? 1==0 no → ("-", A[x-1]) = ("-", "a") ✓. x,y = 0,0. d=0: row=[v[offset-1],v[offset],v[offset+1]] initial zeros. k=0,j=1. k==-d → prev_k=1, prev_x=row[2]=0, prev_y=-1. while x>0 and y>-1: false (x=0). done. mid reversed: [("-", "a"), ("+", "b")] ✓.

Great. Now verify condition reading row[j±1]: j-1 = k+d ≥ d... for k=-d: j-1 = d, but short-circuit prevents read. For k=-d+2: j-1 = d+1 ≥ 1 ✓ within slice [0, 2d+2]. j+1 = k+d+2 ≤ 2d+1 for k ≤ d-2 ✓. prev_k+d+1 ∈ [d, d+2] ⊆ [1, 2d+1] for d ≥ 1 ✓. For d=0: prev_k=1 → row[2], slice length 3 ✓.

One more correctness check: condition uses row (captured before step d) — the forward algorithm's condition at step d uses v values from step d-1, and row captures exactly that state for the relevant indices. ✓. And prev_x = row[prev_k + d + 1] = v at step d-1 on diagonal prev_k ✓.

Now also check the found detection inside k-loop: standard Myers checks after each k. ✓.

Now think about whether trimming prefix/suffix keeps minimality: yes, trimming common prefix/suffix preserves LCS length and any minimal script.

Actually wait — trimming prefix/suffix: does it preserve optimal LCS? Common prefix lines: could a minimal script prefer to not match some prefix line as "="? The LCS count: any common subsequence can be extended... Standard result: there's an optimal alignment matching the entire common prefix (and suffix). Since prefix lines equal, matching them costs nothing and any LCS can include them. More carefully: LCS(a,b) where a,b share prefix p: LCS(a,b) = p + LCS(a[p:], b[p:])? Yes—standard, because if an LCS doesn't align the first p equal chars, you can shift... Hmm, is it exactly true? For strings, LCS(XZ, YZ) where Z common suffix = LCS(X,Y) + |Z| — true. Similarly prefix. Yes, this is a standard lemma (e.g., used in every diff implementation). ✓.

Now performance of trimming loops: O(n+m) int comparisons, fine.

Edge: empty a and b → p=0,s=0, n=m=0 → mid=[] → result []. ✓.

Now, also consider memory of trace for the D=2000 case: slices of length 2d+3; sum ≈ 2001×2003 ≈ 4M pointers ≈ 32MB + list overheads (2001 lists). Acceptable.

Time hot loop: the k-iteration body. Let me write it tight, with v as local list, offset local, A, B local lists, n, m locals. Use a for loop over range(-d, d+1, 2) — creates range each d, fine.

The snake while: `while x < n and y < m and A[x] == B[y]: x += 1; y += 1`. Could micro-optimize but fine.

Actually, potential further speedup: skip the found check to reduce ops? Keep it.

Let me also double check the found-break placement: break inner k-loop when found; then break outer. trace appended before processing → correct.

One concern: when found at k, we still recorded v[offset+k] = x before check ✓.

Now write the final backtrack producing mid script with A and B (int lists) — but script items need original lines: A is int-encoded; map back via reverse? Simpler: use original string slices As = a[p:an-s], Bs = b[p:bn-s] and run Myers on int lists A,B but emit from string slices. Since A[x] corresponds to As[x]. Emit ("=", As[x-1]), ("+", Bs[y-1]), ("-", As[x-1]). ✓.

Alternatively run Myers directly on string slices — comparisons fine but int encoding speeds things; keep ints.

Actually hmm: does int encoding actually speed up? String equality: `A[x] == B[y]` — for equal strings that are the same object (likely, if parsed from same source? Not necessarily — a and b are separate lists, lines may be distinct str objects with equal content). Comparing distinct equal strings costs O(len). Int comparison O(1). Encoding cost: hashing each line once O(total). Worth it. ✓.

Let me now also consider: could the number of "=" be maximized but tie-breaks differ — problem only requires size equality with LCS, any minimal script OK. ✓.

Let me now write the full code.

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Encode lines as ints for fast comparison.
    ids: dict[str, int] = {}
    ai = [ids.setdefault(line, len(ids)) for line in a]
    bi = [ids.setdefault(line, len(ids)) for line in b]

    an, bn = len(ai), len(bi)

    # Strip common prefix.
    p = 0
    while p < an and p < bn and ai[p] == bi[p]:
        p += 1
    # Strip common suffix.
    s = 0
    while s < an - p and s < bn - p and ai[an - 1 - s] == bi[bn - 1 - s]:
        s += 1

    A = ai[p:an - s]
    B = bi[p:bn - s]
    As = a[p:an - s]
    Bs = b[p:bn - s]

    n, m = len(A), len(B)

    if n == 0:
        mid = [("+", line) for line in Bs]
    elif m == 0:
        mid = [("-", line) for line in As]
    else:
        max_d = n + m
        off = max_d + 1  # v[off + k] is furthest x on diagonal k
        v = [0] * (2 * max_d + 3)
        trace = []
        d = 0
        while True:
            trace.append(v[off - d - 1: off + d + 2])
            found = False
            for k in range(-d, d + 1, 2):
                if k == -d or (k != d and v[off + k - 1] < v[off + k + 1]):
                    x = v[off + k + 1]
                else:
                    x = v[off + k - 1] + 1
                y = x - k
                while x < n and y < m and A[x] == B[y]:
                    x += 1
                    y += 1
                v[off + k] = x
                if x >= n and y >= m:
                    found = True
                    break
            if found:
                break
            d += 1

        # Backtrack.
        mid_rev = []
        x, y = n, m
        for d in range(len(trace) - 1, -1, -1):
            row = trace[d]
            k = x - y
            j = k + d + 1
            if k == -d or (k != d and row[j - 1] < row[j + 1]):
                prev_k = k + 1
            else:
                prev_k = k - 1
            prev_x = row[prev_k + d + 1]
            prev_y = prev_x - prev_k
            while x > prev_x and y > prev_y:
                mid_rev.append(("=", As[x - 1]))
                x -= 1
                y -= 1
            if d > 0:
                if x == prev_x:
                    mid_rev.append(("+", Bs[y - 1]))
                else:
                    mid_rev.append(("-", As[x - 1]))
                x, y = prev_x, prev_y
        mid_rev.reverse()
        mid = mid_rev

    out = [("=", a[i]) for i in range(p)]
    out.extend(mid)
    out.extend(("=", a[an - s + i]) for i in range(s))
    return out
```

Wait, issue: while True with d never exceeding max_d — Myers guarantees termination by d = N+M. ✓.

Edge check: n>0, m>0 but they share nothing → loop until d = n+m: at d = n+m, k range includes... at d = n+m, k = n+m path: all right moves then? Let's trust the algorithm: D ≤ n+m always achievable. At d = n+m, k = n - m... path with D=n+m exists (all deletes then all inserts, or interleaved). The k-loop at d = n+m covers k = n-m (parity: (n+m) and (n-m) same parity ✓). Found ✓.

Check trace slice bounds: v has length 2*max_d + 3, indices 0..2*max_d+2. Slice v[off - d - 1 : off + d + 2] with off = max_d+1: at d = max_d: v[0 : 2*max_d+3] full ✓. Forward accesses v[off + k ± 1] with |k| ≤ d ≤ max_d → index ∈ [off - max_d - 1, off + max_d + 1] = [0, 2max_d+2] ✓.

Hmm: at k = -d, we access v[off + k + 1] = v[off - d + 1] — set at step d-1 (diagonal -(d-1)) ✓ in range.

One subtle thing: initial v all zeros; at d=0, k=0: k == -d → x = v[off+1] = 0 ✓.

Check backtrack at d=0 again with slice [v[off-1:off+2]]: row length 3, j = k+1 = 1, condition k==-d → prev_k=1, prev_x = row[1+0+1] = row[2] = v[off+1] initial = 0 ✓, prev_y = -1. While x>0 and y>-1: consumes all remaining diagonals down to (0,0)... wait from (x,x) it decrements until x>0 fails → x=0,y=0 ✓. But careful: prev_y = -1 and y > prev_y means y > -1 always true; loop exits when x == 0. Since x == y on diagonal 0 path, when x hits 0, y = 0 ✓.

But hold on — at d=0, is x necessarily equal to y? After processing all d down to 1, x,y is the start point of the d=0 path... the d=0 path consists of the snake from (0,0). The remaining x,y should be on diagonal 0, i.e., x==y ✓.

Also potential subtle bug: in backtrack, for d≥1, after the while loop, could x > prev_x and y == prev_y (i.e., leftover diagonal mismatch)? The while exits when x == prev_x or y == prev_y. If the step-d move was a right move (delete): point after move (prev_x + 1, prev_y), then snake to (x, y). Backing up diagonals: we reach (prev_x + 1, prev_y) — x = prev_x + 1 > prev_x, y = prev_y → loop exits with y == prev_y, x == prev_x + 1 → emit "-" ✓. Down move: exit with x == prev_x, y = prev_y + 1 → emit "+" ✓. If the snake was empty, same ✓. Can both x > prev_x and y > prev_y fail... fine.

But: could the while loop overshoot, i.e., consume more diagonals than the snake, going past (prev_x+1, prev_y)? It stops exactly when x==prev_x or y==prev_y, and since snake end is reachable by pure diagonals from post-move point, backing up stops exactly there. ✓.

Now think again about the parity issue in the found condition `if x >= n and y >= m`. Standard ✓.

Now double-check the claim about which value trace[d] holds for prev: In forward loop iteration d, trace.append happens first, capturing v state = after step d-1. In backtrack at step d we use row = trace[d] = state after d-1 ✓, and current (x,y) is the furthest point on path d (as recorded). The condition in backtrack chooses prev_k exactly as forward did at step d ✓ (same data). prev_x = row[prev_k...] = furthest x on diagonal prev_k at step d-1 ✓.

One more subtlety: in the forward loop at step d, when computing for k, we compare v[off+k-1] and v[off+k+1] — these were set at step d-1 ✓ (parity). But v[off+k-1] might never have been set (e.g., k-1 = -(d-1)... it was set at step d-1 since |k-1| ≤ d-1 when k ≥ -(d-1); for k = -d short-circuit; for k = d, else-branch reads v[off+k-1] = v[off+d-1] set at step d-1 ✓). And in the k==-d branch we read v[off+k+1] = v[off-d+1], set at step d-1 ✓ (diagonal -(d-1) set at step d-1). Good, no uninitialized reads affecting correctness (initial zeros only read... at d=1, k=-1: reads v[off+0] set at d=0 ✓).

Hmm wait, d=1, k=-1: condition k==-d true → x = v[off + k + 1] = v[off] = value from d=0 ✓. d=1, k=1: k==d → x = v[off+0]+1 ✓.

Now, the backtrack condition for k == d case: else-branch prev_k = k - 1 ✓ matches forward (forward condition for k==d is false → else, prev_k = k-1) ✓.

Now think about performance again for the 20k/50-edit scenario. Snake comparisons use int lists ✓. Trim prefix/suffix O(an+bn) ✓. Encoding O(an+bn) with hashing ✓.

Also worth adding: quick check `if ai == bi`? Not needed.

One more potential optimization for large identical blocks with small D: nothing needed.

Now, memory in backtrack: fine.

Let me trace another example to be safe: a = ["a","b","c"], b = ["a","c"]. LCS = "a","c" (2). Expected: ("=","a"), ("-" ,"b"), ("=","c").

Encoding: ai=[0,1,2], bi=[0,2]. Prefix p=1 (ai[0]==bi[0]=0; ai[1]=1 vs bi[1]=2 stop). Suffix: s: ai[2]==bi[1] (2==2) → s=1; next: s < an-p=2, s<bn-p=1? s=1 not < 1 → stop. A = ai[1:2] = [1], B = bi[1:1] = [2]. n=1,m=1. As=["b"], Bs=["c"].

Myers: max_d=2, off=3, v=[0]*7. d=0: trace0 = v[1:5]?? off-d-1 = 2, off+d+2 = 5 → v[2:5] = [0,0,0]. k=0: x = v[4] = 0, y = 0. A[0]=1 vs B[0]=2 → no snake. v[3] = 0. Not found. d=1: trace1 = v[1:6] = [0,0,0,0,0]. k=-1: x = v[3] = 0, y = 1. Snake: x<1,y<1? y=1 no. v[2] = 0. found? x>=1? no. k=1: k==d → x = v[2]+1 = 1, y=0. snake: x<1 no. v[4] = 1. x>=1 ✓, y>=1? 0 ✗. d=2: trace2 = v[0:7]. k=-2: x = v[2] = 0, y = 2. v[1] = 0. no. k=0: k==-d? no; v[2]=0 < v[4]=1 → x = v[4] = 1, y = 1. snake: x<1 no. v[3] = 1. x>=1, y>=1 → found.

Backtrack: d=2: x=1,y=1,k=0,j=0+2+1=3. row = v[0:7] captured: row[2]=v[2]=0 (set at d=1), row[4]=v[4]=1 (set d=1). row[2] < row[4] → prev_k=1. prev_x = row[1+3] = row[4] = 1. prev_y = 0. while x>1? no. d>0: x==prev_x → ("+", Bs[y-1]) = ("+", "c") ✓. x,y = 1,0. d=1: row = trace1 = v[1:6] = [v1,v2,v3,v4,v5] captured before d=1 = all 0. k = 1-0 = 1, j = 1+1+1 = 3. k==d → prev_k = 0. prev_x = row[0+2] = row[2] = v[3] = 0. prev_y = 0. while x>0 and y>0: x=1>0, y=0>0 false. d>0: x==prev_x? 1 vs 0 no → ("-", As[x-1]) = ("-", "b") ✓. x,y=0,0. d=0: row=[0,0,0], k=0, j=1, k==-d → prev_k=1, prev_x=row[2]=0, prev_y=-1. while x>0... x=0 → no. done.

mid reversed → [("-", "b"), ("+", "c")] then reversed → [("+","c"), ("-","b")]?? Wait mid_rev = [("+","c"), ("-","b")] appended in that order (d=2 first: "+c", then d=1: "-b"). reverse → [("-b"), ("+c")]. Final: "=" a, "-", "b", "=", "c" ✓. And "=" items of a: a ✓; of b: a, c ✓. LCS = 2 ✓.

Another test: a = ["x"], b = ["x","y"]: p=1, then s=0 (bn-p = 1, s<1 and ai[0]... an-p = 0, s < 0 false). A = [], B = ["y"]. n=0 → mid = [("+", "y")]. Result: "=", "+ y" ✓.

Test a=["a","b"], b=["b","a"]: LCS 1. p=0 (0 vs 1 differ... ai=[0,1], bi=[1,0]; ai[0]=0 != bi[0]=1 → p=0). suffix: ai[1]=1 == bi[1]=0? no → s=0. A=[0,1], B=[1,0]. Myers: max_d=4, off=5. d=0: k=0: x=0,y=0; A[0]=0 vs B[0]=1 no. v[5]=0. d=1: k=-1: x=v[5]=0, y=1: snake A[0]=0 vs B[1]=0 ✓ → x=1,y=2. v[4]=1. x>=2? no. k=1: x=v[4]... k==d → x = v[4]+1 = 2, y = 1. snake x<2? no. v[6]=2. x>=2 ✓, y>=2? 1 ✗. d=2: k=-2: x = v[3]?? off+k+1 = 5-2+1 = 4 → v[4] = 1, y = 3. snake: x<2, y<2? y=2 no. v[3] = 1. no. k=0: v[4]=1 < v[6]=2 → x = v[6] = 2, y = 2. found ✓. 

Backtrack d=2: row = trace[2] = v[2:9]. k=0, j=3. row[2] = v[4] = 1, row[4] = v[6] = 2 → 1<2 → prev_k = 1. prev_x = row[1+3] = row[4] = v[6] = 2. prev_y = 2-1 = 1. while x>2? no. x==prev_x → ("+", Bs[y-1]) = ("+", B... Bs = b[0:2] = ["b","a"], Bs[1] = "a" ✓. x,y = 2,1. d=1: row = trace[1] = v[3:8] captured before d=1: v[3..7] = [0,0,0,0,0]. k = 2-1 = 1, j = 3. k==d → prev_k = 0. prev_x = row[0+2] = row[2] = v[5] = 0. prev_y = 0. while x>0 and y>0: x=2,y=1: consume: append ("=", As[1]) = "=" "b"; x=1,y=0 → stop. d>0: x==prev_x? 1 vs 0 no → ("-", As[x-1]) = ("-", As[0]) = "-", "a" ✓. x,y = 0,0. d=0: nothing. mid_rev = [("+","a"), ("=","b"), ("-","a")] → reversed → [("-","a"), ("=","b"), ("+","a")]. Check "="+"-" = a ✓ (a then b); "="+"+" = b ✓ (b then a). LCS = 1 ✓. 

Note the alternative minimal [("-","a"),("+","b"),... ] whatever — fine.

Now, one more consideration: the problem says "The number of '=' items must be as large as possible (it equals the length of the longest common subsequence)". Myers gives D minimal → LCS = (N+M-D)/2 maximal ✓.

Also, hmm, is Myers' greedy guaranteed minimal D? Yes, classic theorem.

Now about performance of the completely-different-1000 case: d goes 0..2000, k-iterations total ≈ sum_{d=0}^{2000}(d+1) ≈ 2M. Each iteration ~ maybe 0.4µs–1µs → under 2s. Trace slicing: 2001 slices totaling ~4M elements — ~0.3s. Fine under 6s.

The 20k/50-edit case: D≈100, k-iterations ~2600, snake comparisons ≤ (n+m)*D worst but realistically much less; even worst 4M tight int-comp iterations ~1.5s... hmm. Let me think about whether it could actually reach 4M. Total snake work = sum over all (d,k) processed of extension lengths. Upper bound per d: extensions across k are non-overlapping-ish? Actually there's a known bound: total work O((N+M)·D). For it to be 4M with D=100, average extension per (d,k) would be 40k... no: number of (d,k) pairs ≈ 2600 wait D=100 → sum_{d=0}^{100}(d+1) ≈ 5151 pairs. 4M/5151 ≈ 780 avg extension — plausible only if lines repeat heavily. With 50 scattered edits in 20000 unique-ish lines: extensions bounded by gaps ~400, and only diagonals near 0 have long snakes. Rough estimate: at step d, furthest x on diagonal k ≈ ... extensions total per d ≤ n + m? Summed over d ≤ D → 100 × 40000 = 4M absolute worst but realistically for typical diffs it's far less, like O((n+m) + D²·avg_gap)... I think realistic input passes comfortably. Also note: with 50 edits, the diff regions split the doc; but Myers without divide-and-conquer still explores. Eh, let me add one cheap massive optimization: after prefix/suffix trimming, also handle the common case where... no. 

Actually, a significant optimization: use the linear-space middle-snake divide & conquer? Same worst-case bound. Alternatively reduce snake cost by noting that when D is small and sequences mostly match, the algorithm... I'll add a micro-optimization to the snake loop: cache A and B as locals (they are), and compare via list.getitem — fine.

Alternative micro-opt: since encoding maps to ints, and many lines repeat, could precompute nothing more.

Another optimization that drastically helps the "few edits" case: trim not just prefix/suffix but iteratively... Actually here's a thought: for the found check and D small, the algorithm terminates at d=100; the snake extensions: at each (d,k) extension goes until mismatch. For scattered edits, a diagonal k path extends through matching runs. The total extension across all (d,k) at step d: furthest-reaching points for consecutive diagonals are increasing in x roughly; the snake from each start runs to next mismatch. Sum over k of snake lengths ≤ n + m + D? Hmm, actually furthest reaching points on diagonal k at step d: xf(d,k). The snake at (d,k) starts at (x0,y0) and ends at xf(d,k). Total per d: sum of xf(d,k) - x0(d,k) ≤ sum xf(d,k) ≤ ... no clean small bound; worst-case per d is O(n+m) only if snakes overlap heavily, which requires repeated content. Given the test is "differ in about 50 places", I'll assume realistic. Also 2s limit with 4M int comparisons in a pure while loop: each iteration ~3 ops → CPython ~ 0.15µs/op... 4M iterations × ~0.25µs = 1s. OK.

Let me also double check trace slicing cost for 20k case: d up to 100, slices of ≤ 203 elements → trivial.

Now finalize code. Also handle inputs where a or b empty at top: covered by trimming & n==0/m==0 branches.

Type hints and docstring. Return list of tuples.

One more check of the encoding trick: `ids.setdefault(line, len(ids))` — default evaluated eagerly each time; len(ids) is current size; if line present, returns existing id, len ignored ✓. If absent, inserts with id = len(ids) ✓. For b, new lines get new ids continuing ✓.

Note: two different lines could hash-collide? dict handles by equality ✓.

Edge: lines unhashable? They're str ✓.

Final code:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    """Return a shortest edit script transforming a into b."""
    ids: dict[str, int] = {}
    ai = [ids.setdefault(line, len(ids)) for line in a]
    bi = [ids.setdefault(line, len(ids)) for line in b]

    an, bn = len(ai), len(bi)

    p = 0
    while p < an and p < bn and ai[p] == bi[p]:
        p += 1
    s = 0
    while s < an - p and s < bn - p and ai[an - 1 - s] == bi[bn - 1 - s]:
        s += 1

    A = ai[p:an - s]
    B = bi[p:bn - s]
    As = a[p:an - s]
    Bs = b[p:bn - s]
    n, m = len(A), len(B)

    if n == 0:
        mid = [("+", line) for line in Bs]
    elif m == 0:
        mid = [("-", line) for line in As]
    else:
        max_d = n + m
        off = max_d + 1
        v = [0] * (2 * max_d + 3)
        trace = []
        d = 0
        while True:
            trace.append(v[off - d - 1: off + d + 2])
            found = False
            for k in range(-d, d + 1, 2):
                if k == -d or (k != d and v[off + k - 1] < v[off + k + 1]):
                    x = v[off + k + 1]
                else:
                    x = v[off + k - 1] + 1
                y = x - k
                while x < n and y < m and A[x] == B[y]:
                    x += 1
                    y += 1
                v[off + k] = x
                if x >= n and y >= m:
                    found = True
                    break
            if found:
                break
            d += 1

        mid_rev: list[tuple[str, str]] = []
        x, y = n, m
        for d in range(len(trace) - 1, -1, -1):
            row = trace[d]
            k = x - y
            j = k + d + 1
            if k == -d or (k != d and row[j - 1] < row[j + 1]):
                pk = k + 1
            else:
                pk = k - 1
            px = row[pk + d + 1]
            py = px - pk
            while x > px and y > py:
                mid_rev.append(("=", As[x - 1]))
                x -= 1
                y -= 1
            if d:
                if x == px:
                    mid_rev.append(("+", Bs[y - 1]))
                else:
                    mid_rev.append(("-", As[x - 1]))
                x, y = px, py
        mid_rev.reverse()
        mid = mid_rev

    out = [("=", a[i]) for i in range(p)]
    out += mid
    out += [("=", a[an - s + i]) for i in range(s)]
    return out
```

Wait, in the n==0 / m==0 branch, note prefix/suffix trimming already handled; if n==0 after trimming, B nonempty (else both empty... if both empty, n==0 branch gives mid=[] ✓, but m could also be 0 — the n==0 branch checks first: if m==0 too, Bs empty → mid=[] ✓).

Hmm, wait when n==0 and m>0: mid = all "+" ✓. When m==0 and n>0: all "-" ✓.

Double-check the found break also handles d reaching max_d — guaranteed found by then ✓.

One concern: for d = max_d = n+m, trace slice v[off - d - 1 : ...] = v[0:...] ✓ within bounds.

Another subtle check in backtrack: for d where the row was captured, row[j±1] accesses need j-1 ≥ 0 and j+1 < len(row) = 2d+3. j = k+d+1, k ∈ [-d, d] → j ∈ [1, 2d+1]; j-1 ≥ 0 ✓; j+1 ≤ 2d+2 < 2d+3 ✓. px index pk+d+1: pk ∈ {k±1} ∩ [-d+... For k=-d: pk = -d+1 → index d+2 ≤ 2d+2 ✓ (d≥1). For k=d: pk = d-1 → index 2d ≤ 2d+2 ✓. ✓.

Also potential issue: in backtrack at step d, current (x,y) must satisfy |x-y| ≤ d and parity — guaranteed by construction ✓.

Also, what if the found happened at k where subsequent k's not processed — fine.

I think there might be one more subtlety in the backtrack: the standard implementation (Coglan's) yields moves for d from last down to 0 including the d==0 iteration handling leftover diagonals. Mine matches. But Coglan's loop uses `for d, v in trace.reverse()` and inside, when d == 0... his while loop with prev from v[prev_k] where trace[0] captured before d=0 gives initial zeros — same as mine, with prev_y = -1 quirk producing correct results as analyzed. ✓.

Let me also consider duplicate heavy inputs correctness — algorithm is general ✓.

Let me also think: is there an issue where trimming prefix/suffix changes which minimal script we output vs LCS size? LCS(a,b) = p + LCS(A,B) + s. Our script has p + LCS(A,B) + s "=" items = max ✓.

Potential integer overflow: none in Python.

Performance of encoding with setdefault in list comp: 40k+2k ops fine.

I'm fairly confident. Let me also mentally test a case with repeats: a = ["r","r"], b = ["r"]. p: ai=[0,0], bi=[0]; p=1. suffix: s < an-p=1, s < bn-p=0 → s=0. A=[0], B=[] → m=0 → mid=[("-","r")]. Output: ("=","r"), ("-","r"). Check: "="+"-" = ["r","r"] ✓; "="+"+" = ["r"] ✓; "=" count 1 = LCS ✓.

Case a=["r","r"], b=["r","x","r"]: p=2? ai[0]==bi[0], ai[1]==bi[1] → p=2. suffix: s < an-p=0 → 0. A=[], B=["x"] → mid=[("+","x")] ✓. LCS=2 ✓.

Case where trimming prefix greedy could be suboptimal? Lemma holds for strings/sequences: if a[0]==b[0], then LCS(a,b) = 1 + LCS(a[1:], b[1:])? Hmm, is that exactly true? Yes: standard proof — any LCS of a,b; if it doesn't use a[0]=b[0] as a matched pair... Suppose LCS matches a[i] with b[j], i,j ≥ 1, with a[i]=b[j]. If i=1 or j=1 we can replace with first elements? Standard result: matching equal first characters is always safe. Proof: take LCS of length L. If a[0]==b[0], consider... Actually the well-known safe rule: if a[0]==b[0], prepend it. Suppose LCS doesn't include a[0]. Then the first matched pair (a[i], b[j]) with a[i]=b[j]; if i>0 and j>0, replace with (a[0], b[0]) — valid since indices only decrease. If LCS includes a[0] matched with b[j], j>0, and b[0] unmatched... then a[0]=b[0], re-pair a[0]↔b[0] keeps validity. If LCS includes b[0] matched with a[i], i>0: re-pair to a[0]↔b[0]. So LCS length preserved with first pair (0,0) ✓. Similarly suffix ✓.

Now, "completely different lists of 1000 lines": note if lists share no lines, D = 2000; time ok.

But wait — what if the two lists are completely different but D is computed... fine.

One more perf thought for the 20k case: the encoding dict builds 20k+ entries; if lines unique mostly, ids ~ 20k+ entries — fine.

Also, for huge identical lists (20k), prefix trim quickly... but the while loop over 20k int comparisons — fine.

Final answer with brief docstring. Also add `from __future__` not needed. Type hints as specified.

Also consider recursion: none.

Let me also double-check `trace.append(v[off - d - 1: off + d + 2])` when d=0: v[off-1:off+2] length 3 ✓.

Also the outer while True: add safety `d <= max_d` guard? Guaranteed found; keep while True but it's provably terminating. I'll keep a bound condition for safety: `while d <= max_d:` then after loop, if not found (shouldn't happen), fallback... To be safe, I'll structure: 

```python
        d = 0
        while True:
            ...
            if found:
                break
            d += 1
```
Myers guarantees D ≤ n+m so fine.

Also I realize the found check should perhaps be `if x >= n and y >= m` — yes.

Done. Write final code with comments.