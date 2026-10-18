We need Myers' algorithm with LCS. Classic Myers O(ND) greedy. For 20k lines differing in ~50 places, D is small, fine. For 1000 completely different lines, D = N+M = 2000, O(ND) = 2,000,000 — fine.

But careful: Myers' greedy algorithm with only forward pass gives the length of shortest edit script, but reconstructing the actual LCS path requires storing V arrays per D (snakes) or using the divide-and-conquer (linear space) middle snake approach. Simpler: store V (list of k-values) snapshots per D step; memory O(D^2) worst case — for D=2000 that's ~4M ints, fine. For 20k lines with D=100 (50 changed places → maybe 100 deletions+insertions), D=100, D^2=10k, fine.

Actually worst case: completely different 1000 lines each: D = 2000, storing V per step: 2000 * 2001 ints ≈ 4M entries, fine memory-wise (list of lists).

Implementation:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # trim common prefix/suffix for speed
    # then Myers
    
Myers greedy:

max_d = n + m
V storage: vs = [] list of copies of V array.
V = {1: 0} or array indexed by k with offset. Use dict or list.

Standard forward Myers:

for d in range(max_d+1):
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and V[k-1] < V[k+1]):
            x = V[k+1]
        else:
            x = V[k-1] + 1
        y = x - k
        while x < n and y < m and a[x] == b[y]:
            x += 1; y += 1
        V[k] = x
        if x >= n and y >= m: found
    vs.append(copy of V)

Backtracking: from final d, k = n - m... Actually reconstruct: at depth d, position (x, y) = end of path. For k index, x = V_d[k], y = x - k. To find predecessor: determine whether we came from k+1 (insertion) or k-1 (deletion) using same condition, then predecessor x_prev = V_{d-1}[k±1], snake from prev to current minus the one edit step.

Reconstruct moves backward: while d > 0: at (x,y) with k=x-y. If k == -d or (k != d and Vd_minus1[k+1] < Vd_minus1[k-1])... wait the condition for choosing x = V[k+1] (down move = insertion) was: k == -d or (k != d and V[k-1] < V[k+1]). Hmm careful with signs.

In the forward pass: if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1] (this is a "down" move, insertion from b). else x = V[k-1]+1 ("right" move, deletion from a).

Backtrack: given current (x, y) at depth d, k = x - y. If k == -d or (k != d and prevV[k-1] < prevV[k+1]): came from k+1 via down move; prev point is (prevV[k+1], prevV[k+1] - (k+1)); the edit is insertion of b[prevY]... hmm. Actually simpler: prev_x = prevV[k_prev] where k_prev = k+1 or k-1. Then snake between prev point and pre-edit point. Let me just reconstruct:

If came from k+1 (down/insertion): prev end = (px, py) = (prevV[k+1], prevV[k+1] - (k+1)). Then the move from prev end is one down step: to (px, py+1), then snake to (x, y). So edit: "+" b[py]. Then lines kept: b[py+1..y-1] as "=".

If came from k-1 (right/deletion): prev end (px, py) = (prevV[k-1], prevV[k-1] - (k-1)). Move right: (px+1, py), deletion of a[px]. Then snake "=" a[px+1..x-1].

When d == 0, the snake from (0,0) to (x,y): all "=".

Also trim common prefix and suffix first to reduce D drastically — important for the 20k case with few diffs (D small anyway, but trimming reduces V array sizes and speeds up). Actually with D=100, Myers is already fast. But trimming helps: prefix trim reduces n,m; suffix trim too. But then backtracking must prepend prefix "=" lines and append suffix "=" lines. That's straightforward.

Edge cases: a empty or b empty, one equal, etc. Trimming handles fully equal lists (result all "="). If after trimming n==0: all "+" for remaining b. If m==0: all "-" for remaining a.

But careful: trimming common prefix/suffix — is the resulting script still minimal (LCS maximal)? Yes: common prefix lines are always matchable and any LCS can be assumed to include them (standard). Actually is it safe? If a[0]==b[0], then there's an optimal alignment matching them — yes, standard result: matching equal first elements never hurts LCS length. For edit script with "=" count = LCS length, matching equal endpoints is safe. Yes.

Also need to guard: if after prefix trim, one becomes empty, suffix trim trivial.

Potential issue: with duplicates, Myers greedy still finds minimal D and backtracking gives valid path with LCS length = n+m - D... The "=" count equals (n + m - D)/2? Each edit step is one delete or insert; total script length D; matches = (n + m - D)/2. Minimal D corresponds to maximal matches. Good.

Performance for 1000 completely different: D=2000, inner loop total steps ~ D^2/2 ≈ 2M, each step cheap; storing V copies: 2000 lists of ~2001 ints — that's fine but memory 2000*2001*8 bytes ≈ 32MB as list of ints (Python ints more, pointers 8 bytes each → ~32MB plus small int caching; small ints cached so fine). Acceptable. Alternatively only store V arrays (dict→list with offset). Use a list of size 2*max_d+1 with offset, copy each iteration: copying 4001-length list 2000 times = 8M ops, fine. Could store only... we need full history for backtrack. OK.

Actually to reduce memory: we could store V as list snapshots. Fine.

Speed for 20k with 50 diffs: trimming leaves small remaining segments? Not necessarily — 50 diffs spread out means long common runs; trimming prefix/suffix only removes ends. The middle common runs are handled by snakes in Myers quickly (while loop). With D=100, outer loop 100 iterations, each d scans k in [-d,d], snakes run along. Total snake work bounded by O((N+M)·D)? Actually total snake length ≤ (N+M) per... hmm, total snake steps across all d is O(N+M) per d? No — each d, the furthest-reaching values can extend; total work is O((N+M)·D) worst case, 20k*100*... hmm, worst case 40k * 100 = 4M snake comparisons, fine, but typically snakes don't overlap much. Actually snake steps: each (x,y) pair visited... total ≤ (N+M)*D in theory but in practice with few diffs it's near linear. Even worst 4M string comparisons in 2s: fine.

For worst case 1000 different: D=2000, snake steps ~0 (no matches) — fast. The loop overhead ~2M iterations of Python — under 6s? 2M loop iterations with dict operations... Let's use array (list) with offset rather than dict for speed. Inner loop body: index computations, comparisons, while loop, V[k]=x. ~2M iterations, each maybe 10-20 bytecode ops → ~0.5-1s. Plus copying V each d: 2000 copies × 4000 elements = 8M — ~0.3s. Fine.

Actually we can avoid storing all V: alternative is check patience... no, storing is simplest.

Memory: 2000 snapshots × list of 4001 → but we can store only used slice? Copy full is fine. Or store dict-free: store V per d as a plain list copy. 2000*4001*8 bytes = 64MB. Hmm, that's a bit much but acceptable? Could limit copy to indices in [−d, d] → store slice. Store per-d list of the values for k in range(-d, d+1, 2) with base offset. Let's store snapshot as list of length 2d+1? Values only defined at k ≡ d (mod 2). Simpler: store V copy of full array; max array size = 2*max_d+3 ≈ 4003 for n=m=1000. 2000 snapshots * 4003 * 8 = 64 MB. Python list of ints: 8 bytes pointer each + shared small int objects. 64MB okay-ish but let's reduce: snapshot only k in [-d, d] with step 2 → snapshot length d+1. Store offset mapping. Total memory: sum over d of (d+1)*8 ≈ 2000*2000*8/... sum_{d=0}^{2000} d ≈ 2M entries → 16MB. 

Implement: V = [0]*(2*max+1) with offset = max. For snapshot: vs.append(V[off-d : off+d+1 : 2])? That gives values for k=-d,-d+2,...,d — d+1 entries. For backtrack at depth d, need prevV = vs[d-1], which contains k in [-(d-1), d-1] step 2. Index of k in prevV: (k + (d-1)) // 2.

Backtracking loop:

d_cur = D_final; x, y = n, m (trimmed sizes). Note final k = x - y = n - m, and |k| <= d.

while d_cur > 0:
    prev = vs[d_cur - 1]
    k = x - y
    # determine predecessor same as forward condition but with prev array
    # forward condition used V[k-1] < V[k+1] → choose down (from k+1)
    if k == -d_cur or (k != d_cur and get(prev, k-1) < get(prev, k+1)):
        # down move: came from k+1
        px = get(prev, k+1)
        py = px - (k+1)
        # snake from (px, py+1) to (x,y) — but the down move itself is the edit
        ops... "=" lines b[py+1 : y]?? 

Wait: after the down step from (px,py) we go to (px, py+1), then snake to (x, y). The snake covers lines b[py+1 .. y-1] (and a[px .. x-1]). Inserted line is b[py]. But hold on — is that right? In forward pass, x = V[k+1] means new x equals old k+1's x, and y = x - k = old_y+1... yes: down move from (V[k+1], V[k+1]-(k+1)) → (px, py+1). Then snake extends.

But the condition at forward time was evaluated with V at state d-1 (during iteration d, V holds d-1 values except V[k] updated in place as we go). Since k and k±1 have different parities, V[k-1] and V[k+1] at iteration d still hold d-1 values (they're updated only when their parity matches d). Yes correct.

Hmm, one subtlety: forward condition: `if k == -d or (k != d and V[k-1] < V[k+1])`. At backtracking we have x,y fixed at the end point of diagonal k at depth d. But careful: the recorded x for diagonal k at depth d — in forward pass, after computing x for k at iteration d, snakes extend it. When backtracking from the final point, x = final x on diagonal k. We recompute the decision: if the forward algorithm at iteration d for this k chose down, predecessor px = V_{d-1}[k+1]. Otherwise predecessor px = V_{d-1}[k-1] + 1? No wait — for right move: x = V[k-1] + 1, predecessor point is (V_{d-1}[k-1], V_{d-1}[k-1]-(k-1)) = (px, py), then right step to (px+1, py), then snake.

So backtrack:

if down-chosen:
    px = prev[k+1]; py = px - (k+1)
    edit: ("+", b[py])
    then snake: from (px, py+1) to (x, y): "=" b[py+1:y] (== a[px:x])
    set x, y = px, py
else:
    px = prev[k-1]; py = px - (k-1)
    edit: ("-", a[px])
    snake: "=" a[px+1:x]
    set x, y = px, py
d_cur -= 1

At the end (d_cur == 0), remaining snake from (0,0) to (x,y): "=" a[0:x].

Then prepend prefix "=" and append suffix "=".

Wait — but does re-evaluating the decision condition during backtrack reproduce the forward choice? Yes, same inputs (prev V values) → same decision. Good.

Edge: getting values from prev snapshot: prev indexed by position j = (k + (d_cur-1))//2 for k in range(-(d_cur-1), d_cur, 2)? Hmm, prev snapshot stored as values for k = -(d-1), -(d-1)+2, ..., d-1. But is that what we snapshot? At iteration d-1, we computed k values in that range. Snapshot: vs.append(V[off-(d-1) : off+d : 2])? Let's just store after iteration d: snapshot = [V[off + kk] for kk in range(-d, d+1, 2)]. That's d+1 entries. Then for prev at depth d-1: index = (k + (d-1))//2. Need k-1 and k+1 in range [-(d-1), d-1] — yes since |k| ≤ d and k has parity of d: k-1, k+1 have parity d-1 and |k±1| ≤ d-1? If k = d, then k+1 = d+1 > d-1 — but forward condition guards k != d before accessing V[k+1]... it accesses V[k+1] only when k != d... wait condition: `k == -d or (k != d and V[k-1] < V[k+1])`. If k == -d, we take down branch using V[k+1] where k+1 = -d+1, valid. If k == d, condition k==-d false, k != d false → else branch: x = V[k-1]+1, k-1 = d-1 valid. So accesses are always to valid indices of parity d-1 in [-(d-1), d-1]. Good. Similarly backtrack condition mirrors it.

Hmm wait, in backtracking, when k == -d_cur, down branch: need prev[k+1], k+1 = -(d-1), valid. When k == d_cur, else branch: prev[k-1], valid. Good.

But one more subtlety: in backtracking, is the decision condition identical? The forward condition compares V[k-1] < V[k+1] — at depth d these were the d-1 values. Our prev snapshot holds exactly those. 

Termination: forward loop finds when x >= n and y >= m on diagonal k = n - m... it checks after each k computed. Actually check `if x >= n and y >= m` after computing snake for each k, break with d and k. Set final D = d.

Also handle n == 0 or m == 0 after trimming: D = m or n directly, skip Myers.

Let me also handle the case where after trimming, one list empty: ops = [("-" or "+") ...]. Then prepend/append "=".

Full code:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # prefix
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]:
        s += 1
    pre = a[:p]
    suf = a[n-s:] if s else []
    core_a = a[p:n-s]
    core_b = b[p:m-s]
    na, nb = len(core_a), len(core_b)
    
    ops = []
    if na == 0:
        ops = [("+", ln) for ln in core_b]
    elif nb == 0:
        ops = [("-", ln) for ln in core_a]
    else:
        ops = _myers(core_a, core_b)
    return [("=", ln) for ln in pre] + ops + [("=", ln) for ln in suf]

_myers:

def _myers(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    off = max_d
    size = 2*max_d + 1
    V = [0]*size
    vs = []
    d = 0
    found = False
    while d <= max_d:
        vs.append(V[off-d : off+d+1 : 2])  # wait: this snapshot should be of the state BEFORE iteration d? 

Hmm, ordering: I want vs[d] = values after iteration d (i.e., V_{d}). Simpler: append snapshot after computing iteration d. But then during backtrack at depth d I use vs[d-1]. Let's snapshot after each iteration.

Restructure:

    for d in range(max_d+1):
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and V[off+k-1] < V[off+k+1]):
                x = V[off+k+1]
            else:
                x = V[off+k-1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            V[off+k] = x
            if x >= n and y >= m:
                final_d = d
                found = True
                break
        vs.append(V[off-d:off+d+1:2])  # hmm — if we broke early, V[off+d] etc? 

Wait snapshot V[off-d : off+d+1 : 2] gives values for k=-d,-d+2,...,d — but for k = d (parity d), V[off+d] was just set. But indices with parity d in range: -d, -d+2,...,d — all were set this iteration (each k in the loop). But V[off-d:off+d+1:2] — slice step 2 starting at off-d: indices off-d, off-d+2, ..., off+d. Count = d+1. Values at those indices: for index off+j (j parity same as d... j in {-d, -d+2, ..., d}), V[off+j] holds value for diagonal j. But wait — V[off+j] for j with parity d was set at iteration d (just now) — but j ranges only over {-d..d}. However earlier iterations with parity d don't exist (d-2 also parity d, set at iteration d-2 for j in {-(d-2)..d-2}). Those indices off+j for |j| ≤ d-2 were set at iteration d-2 but now overwritten at iteration d within range. For snapshot after iteration d, we only need parity-d indices in [-d, d], all freshly set. But slice indices off-d, off-d+2,...,off+d all have offset parity = d parity. Good, values valid.

Hmm but if found mid-iteration (break), snapshot incomplete? We break before finishing k loop — but we found at some k; snapshot then would be wrong. But we don't need snapshots beyond... we backtrack from final_d using vs[final_d - 1] — snapshot at iteration final_d not needed. So on found: don't append, just break. Let me append only if not found, or append before break... Simplest: on found, record final_d = d and break out; don't append.

But careful: the snapshot loop appended after each complete iteration d-1: vs has entries for d=0..final_d-1. Backtrack uses vs[d-1] for d from final_d down to 1. vs[d-1] exists since d-1 ≤ final_d-1. Good.

Snapshot correctness when appending after full iteration d: slice includes k values not yet... all k in [-d,d] step2 were visited in iteration d's loop. Yes.

Wait — actually one subtle bug: within iteration d, when computing k, we read V[off+k-1] and V[off+k+1] which hold values from iteration d-1 (parity d-1). Fine.

Edge: d=0, k=0: condition k == -d (0 == 0) true → x = V[off+1]. V[off+1] initially 0 — but diagonal 1 at depth -1 doesn't exist; convention V[1] = 0 (start). With off, V[off+1] = 0 initial. Good, standard.

Backtrack:

    ops_rev = []
    x, y = n, m
    d = final_d
    while d > 0:
        prev = vs[d-1]
        k = x - y
        base = d - 1  # prev snapshot holds k in [-(d-1), d-1] step 2; index = (k + (d-1))//2
        def get(kk): return prev[(kk + (d-1))//2]
        if k == -d or (k != d and get(k-1) < get(k+1)):
            px = get(k+1); py = px - (k+1)
            ops_rev.append(("+", b[py]))
            # snake from (px, py+1) to (x,y): "=" b[py+1:y]
            for i in range(py+1, y): ops_rev.append(("=", b[i]))
            x, y = px, py
        else:
            px = get(k-1); py = px - (k-1)
            ops_rev.append(("-", a[px]))
            for i in range(px+1, x): ops_rev.append(("=", a[i]))
            x, y = px, py
        d -= 1
    # d == 0: snake from (0,0) to (x,y)
    for i in range(x): ops_rev.append(("=", a[i]))
    ops_rev.reverse()
    return ops_rev

Wait — check: when down move chosen, the snake after the edit goes from (px, py+1) to (x, y). The "=" lines correspond to b indices py+1..y-1. And a indices px..x-1. Both equal. Good.

Hmm — but wait: is x at backtrack time equal to V_d[k]? x is final x on diagonal k = x-y. Yes since we track points along the path.

One concern: the backtrack decision condition must match forward. Forward: `if k == -d or (k != d and V[k-1] < V[k+1])`. Backtrack: same with prev values. Yes.

But subtle: in forward pass, when k == d, else branch x = V[k-1]+1. When k == -d, down branch. In backtrack, k == x - y where (x,y) is endpoint of diagonal k at depth d. Is |k| ≤ d guaranteed? Yes. Parity: k ≡ d (mod 2)? Path of length d from (0,0) ends on diagonal with parity d... each step changes k by ±1, so k ≡ d mod 2. And x - y: x,y from the path. Yes.

Hmm, also need to double check: could the while-snake in backtrack have length mismatch: after down edit, snake should take us exactly to (x,y). The forward path: from prev point (px,py), down to (px, py+1), snake to (x_d, y_d) where x_d = V_d[k]. Our current x should equal V_d[k]. During backtrack x decreases along... we start with x = n, y = m on diagonal k = n-m at depth final_d. V_{final_d}[k] should equal x. Yes because that's the endpoint recorded. Then subsequent: x,y = px, py, and at depth d-1, (px,py) = (V_{d-1}[k'], y') — is py = V_{d-1}[k']? k' = px - py = px - (px - (k+1)) = k+1. And V_{d-1}[k+1] = px. Yes consistent.

But careful: at depth final_d, is x really V_{final_d}[n-m]? We found when x >= n and y >= m after snake. If x > n? x can't exceed n (snake loop bounded). y can't exceed m. x >= n and y >= m with x ≤ n, y ≤ m → x = n, y = m. Good.

Performance detail: the inner `for i in range(...)` loops for "=" snake lines — total lines = n + m roughly, fine. But building ops via list append of many "=" tuples — total output size ~ (n+m) which for 20k lists is ~40k tuples, fine.

Speed of Myers loop for 1000x1000 different: outer 2001 iterations, inner sum ~ sum d = ~2M iterations. Each iteration: comparisons, list indexing, while check (fails immediately), assignment. Maybe ~0.5-1.5s in CPython. Under 6s. OK.

Memory of snapshots: total ~2M ints in lists → ~16-32MB, fine.

Alternative optimization: convert to avoid function-call overhead. Keep as is.

One more micro: comparing strings a[x] == b[y] — fine.

Also, worst-case scenario guard: what if trimmed core is large AND D large — e.g., 1000 lines completely different: D = 2000 = max_d, loop runs fully, found at d = n+m. Fine.

What about the found break: we break inner loop, need to break outer too. Use a flag or function return. Put Myers in a nested function and return final_d and vs.

Let me also double-check trimming correctness with s: suf = a[n-s:] — if s>0 those are the last s lines of a which equal last s lines of b. core_a = a[p:n-s]. If s computed with condition s < n-p and s < m-p: ensures prefix and suffix don't overlap. Good. If s == 0, suf = [] (a[n:] = []). Actually a[n-0:] = a[n:] = [] — so suf = a[n-s:] works even for s=0. Good.

Check final result properties: "=" and "-" in order give exactly a: pre "=" lines (a[:p]) + core reconstruction ("=" from snakes and "-" deletions cover core_a exactly) + suf (a[n-s:]). Yes.

Minimality: LCS length = (na + nb - D)/2 maximized since D minimal. Plus prefix/suffix matches included — total "=" count = p + s + (na+nb-D)/2. Is that globally maximal LCS? Claim: LCS(a,b) = p + LCS(core_a, core_b) + s? Hmm — is that exactly true? Standard result: if a[0]==b[0], then LCS includes matching them. Proof: take any LCS; if it doesn't match a[0] with b[0], we can adjust: hmm, actually the standard result is: if a[0]==b[0] then LCS(a,b) = 1 + LCS(a[1:], b[1:])? Not exactly — consider a = [x, y], b = [x, x]. LCS: match x-x = 1, or... LCS(a,b): common subsequences: "x" (length 1). Matching a[0] with b[0]: 1 + LCS([y],[x]) = 1. OK same. Another: a=[x,y], b=[y,x]. LCS = 1 (either "x" or "y"). Matching prefix a[0]=x with b[0]=y? They're not equal, so no trim. Trim only when equal. If a[0]==b[0]==x: claim LCS(a,b) = 1 + LCS(a[1:],b[1:]). Proof: any common subsesequence of length L either uses a[0] paired with some b[j] (j≥0) and some a[i] with b[0]... Suppose LCS doesn't pair a[0] with b[0]. Case: it pairs a[0] with b[j], j>0: then replace that pairing with a[0]-b[0] and shift? The rest of the subsequence from a[1:] pairs with b[j+1:]; we could instead pair rest with... hmm, standard proof: if LCS pairs a[i] with b[0] for some i>0, then since a[0]==b[0]==a[i]... Actually simpler: known lemma: if first elements equal, there's an optimal LCS matching them. Take optimal alignment; if a[0] is matched to b[j] (j>0) and b[0] matched to nothing or to a[i] (i>0)... Since a[0]==b[0], if a[0] matched to b[j] where b[j] might differ... hmm b[j] == a[0] == b[0]. So we can rematch a[0]↔b[0] and keep rest of a-side (a[1..]) matched to rest of b-side (b[j+1..])? But then b[1..j-1] unused — that's fine, still valid subsequence, same length. If a[0] unmatched, then b[0] matched to some a[i] (or nothing). If b[0] matched to a[i], a[i]==b[0]==a[0]; rematch b[0]↔a[0] and keep rest: a[i+1..] with b[1..]. Valid. If neither matched, add the pair, length+1 — contradiction with optimality unless... adding increases length, contradiction. So yes, matching equal first elements preserves optimality. Similarly suffix. So trimming is safe.

Also, the D-minimal Myers gives max "=" for the cores. Good.

Edge: duplicates everywhere — Myers handles.

Now write clean code.

def diff_lines(a, b):
    n, m = len(a), len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    core_a = a[p:n - s]
    core_b = b[p:m - s]
    ops = _myers_diff(core_a, core_b)
    return ([("=", ln) for ln in a[:p]] + ops + [("=", ln) for ln in a[n - s:]])

def _myers_diff(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", ln) for ln in b]
    if m == 0:
        return [("-", ln) for ln in a]
    max_d = n + m
    off = max_d
    V = [0] * (2 * max_d + 1)
    history = []
    final_d = None
    for d in range(max_d + 1):
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[off + k - 1] < V[off + k + 1]):
                x = V[off + k + 1]
            else:
                x = V[off + k - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            V[off + k] = x
            if x >= n and y >= m:
                final_d = d
                break
        if final_d is not None:
            break
        history.append(V[off - d:off + d + 1:2])
    # backtrack
    ops = []
    x, y = n, m
    d = final_d
    while d > 0:
        prev = history[d - 1]
        k = x - y
        half = d - 1
        if k == -d or (k != d and prev[(k - 1 + half) // 2] < prev[(k + 1 + half) // 2]):
            px = prev[(k + 1 + half) // 2]
            py = px - (k + 1)
            ops.append(("+", b[py]))
            for i in range(py + 1, y):
                ops.append(("=", b[i]))
            x, y = px, py
        else:
            px = prev[(k - 1 + half) // 2]
            py = px - (k - 1)
            ops.append(("-", a[px]))
            for i in range(px + 1, x):
                ops.append(("=", a[i]))
            x, y = px, py
        d -= 1
    for i in range(x - 1, -1, -1):
        ops.append(("=", a[i]))
    ops.reverse()
    return ops

Wait: history snapshot indexing check. history[d] = V[off-d : off+d+1 : 2] — indices off-d, off-d+2, ..., off+d → k = -d, -d+2, ..., d. So entry for k in history[d] is at position (k+d)//2. In backtrack at depth d we use history[d-1], positions (kk + (d-1))//2 for kk ∈ [-(d-1), d-1]. My code: `prev[(k - 1 + half) // 2]` with half = d-1. Correct.

But wait — history[d] snapshot taken after iteration d completes fully. But in the loop, when k parity... snapshot slice off-d : off+d+1 : 2 — for d=0: [off:off+1:2] = [V[off]] = value of diagonal 0 after iteration 0. Good.

One problem: the snapshot after iteration d uses slice with step 2 — but the values at off-d, off-d+2, ..., off+d-2 were set at iteration d (as k looped), and off+d also. All correct.

Hmm, but wait: during iteration d, for k values, we read V[off+k±1] which are parity d-1 indices — set during iteration d-1. Their current values are from iteration d-1 — correct. But note within iteration d, we also write V[off+k] (parity d indices) — these don't collide with reads. Correct.

Edge check with duplicates example: a = ["x","x"], b = ["x"]. p=1 (a[0]==b[0]). Then core_a = a[1:2-0]=["x"], core_b = b[1:1]=[]. Wait s: s < n-p (1) and s < m-p (0) → s=0. core_a = a[1:2] = ["x"], core_b = b[1:1] = []. Myers: ["-","x"]. Result: [("=","x"), ("-","x")]. Good, minimal (1 match).

Another: a=["x"], b=["x","x"]: p=1, s=0 (s < n-p = 0 fails). core_a=[], core_b=["x"]. Result [("=","x"),("+","x")]. Good.

Check a = ["a","c","b","c"], b = ["c","a","b","c"]? No common prefix/suffix... a[-1]=c == b[-1]=c → s=1. p=0 (a[0]=a vs b[0]=c). core_a = ["a","c","b"], core_b=["c","a","b"]. Myers: LCS = "a","b" length 2? or "c","b" length 2. D = 3+3-2*2=2. Result: e.g., ("-","a"),("=","c")... path: d=0: k=0, x=0,y=0, a[0]="a" vs b[0]="c" no snake. d=1: k=-1: down: x=V[off], y... k=-1: x = V[off+0] = 0 → y=1; snake: a[0]="a" vs b[1]="a" match → x=1,y=2; V=... k=1: x = V[off+0]+1 = 1, y=0; snake a[1]="c" vs b[0]="c" → x=2,y=1. d=2: k=0: compare V[off-1] (=x for k=-1 = 1) vs V[off+1] (= 2): down chosen: x=V[off+1]=2, y=2; snake a[2]="b" vs b[2]="b" → x=3,y=3 → found. Backtrack: d=2, prev=history[1] = values for k=-1,1: [1, 2]... history[1] = V[off-1:off+2:2] = [V[off-1], V[off+1]] = [1, 2]. k = 3-3 = 0. half=1. prev[(0-1+1)//2]=prev[0]=1; prev[(0+1+1)//2]=prev[1]=2. 1 < 2 → down: px = prev[1] = 2, py = 2 - 2 = 0. ops: ("+", b[0]="c"); snake b[1:3] → ("=","a"),("=","b"); x,y = 2,0. d=1: prev = history[0] = [V[off]] = [0]. k = 2-0 = 2 = d. Condition: k == -d? no. k != d? no → else: px = prev[(2-1+0)//2] = prev[0] = 0 (index (1)//2=0). py = 0 - 1 = -1. ops: ("-", a[0]="a"); snake a[1:2] → ("=","c"). x,y = 0,-1?? y = py = -1. Hmm that's wrong! 

Problem: at depth d, the endpoint on diagonal k should satisfy y = x - k ≥ 0 and the point is valid. Here at depth 1, endpoint was (x=2, y=1) on k=1. But in backtrack, after processing depth 2 down move, we set x,y = px, py = (2, 0). Then d=1, k = x-y = 2. But at depth 1, the recorded endpoint for k=1 was (2,1). We got (2,0)?? That means backtrack is inconsistent.

Let me recheck depth-2 backtrack. At depth 2, endpoint (3,3), k=0. Forward iteration d=2, k=0: condition: k == -d? no (0 ≠ -2). k != d? 0 ≠ 2 yes → compare V[off-1] < V[off+1]: values from iteration 1: V[k=-1] = 1 (endpoint (1,2)), V[k=1] = 2 (endpoint (2,1)). 1 < 2 → down: x = V[off+1] = 2, y = x - k = 2. Then snake from (2,2): a[2]="b"==b[2]="b" → (3,3). So predecessor point (end of diagonal 1, i.e., V_1[k+1=1]) = (2,1). Down move: from (2,1) to (2,2). So px=2, py should be 1! My computation: py = px - (k+1) = 2 - 1 = 1. But I wrote py = px - (k+1) = 2 - 1 = 1 in code — but in my trace above I computed py = 2 - 2 = 0. Error in my trace: k+1 = 0+1 = 1, py = 2 - 1 = 1. Right. So ops: ("+", b[py=1]) = ("+","a")? Wait b[1] = "a". Hmm but forward: down move from (2,1) to (2,2) inserts b[1]="a"? Wait insertion moves y+1, consuming b[y]. From (2,1) down to (2,2) consumes b[1] = "a". Hmm but then script: ("+","a"), ("=","b") for snake, then depth 1: endpoint (2,1), k=1. half=0. prev = history[0] = [0] (k=0 value: after d=0, V[off]=0, endpoint (0,0)). k=1 = d → else branch: px = prev[(1-1+0)//2] = prev[0] = 0, py = 0 - 0 = 0. Down move was from (0,0) right step: ("-", a[0]="a"); snake a[1:2] → ("=","c"). x,y = 0,0. Then final snake: ("=","a")? wait at d=0 the snake from (0,0) to (x,y)=(0,0): nothing. ops reversed: ("=","a")... wait no — final loop appends a[0:x] for x=0: nothing. ops list (reverse order): [("+","a"),("=","b"),("-","a"),("=","c")] reversed → [("-","a"),("=","c"),("=","b"),("+","a")]. Check: "-"+"=" gives a = ["a","c","b"] ✓. "="+"+" gives ["c","b","a"] ✓ equals core_b. D=3? script has 2 edits (one "-", one "+") and 3 "="... wait 4 items: 2 "=" + 2 edits → D=2. ✓ LCS length 2 = (3+3-2)/2 ✓.

Good, my earlier trace had arithmetic error. The algorithm is fine.

Now double-check the backtracking else-branch py: py = px - (k-1). For deletion: from (px,py) right to (px+1, py), consumes a[px]. k' = k-1 diagonal: point (px, px - (k-1)). Then y after edit = py, x = px+1, new diagonal = (px+1) - py = k. ✓.

Down-branch: from (px, py) down to (px, py+1), consumes b[py]. new diagonal = px - (py+1) = k+1 - 1 = k. ✓.

Final d=0 snake: from (0,0) to (x,y) where k = x - y = 0 → x = y. "=" a[0:x]. ✓. But wait — after the while loop, x,y should satisfy x == y (diagonal 0). The last predecessor set gives point on diagonal k' = x-y with d'=0 → k'=0. ✓.

Also verify: in backtrack, could final point on diagonal k where V check... we assume (x,y) at depth d lies on recorded V_d[k]. Initially x=n,y=m, k=n-m, and forward found at that k. ✓ by induction as shown.

One more potential issue: history snapshots during iterations where `found` happens mid-loop — we skip appending (break before append). We only need history[d] for d < final_d, all fully appended. ✓.

Performance tweak: the inner loop uses local variable lookups; bind a, b, V, n, m, off locally (they are locals already in function). Fine.

Consider worst-case memory for the 1000-different case: history sizes 1..2000 → ~2M ints, ~16MB pointers. Fine.

Consider case where lists differ in ~50 places among 20k: trimming may not help if diffs are in middle, D≈100 (50 del + 50 ins or fewer). Myers: outer 100 iterations, inner ~5050 k-steps, each with snake while loops. Snake total work: each iteration extends furthest reaches; worst case bounded by O((N+M)*D)? Actually total snake steps across the whole run is at most O(N+M) per d? Hmm, in Myers forward, snake steps total ≤ O((N+M)·D) worst case but typically the furthest-reaching points advance monotonically per diagonal... Actually per diagonal k, x values are non-decreasing across d. Snake work per (d,k) extends x beyond previous max on that diagonal. Total = sum over k of final x range ≤ N+M per... no: for diagonal k, x can go up to n, but each d recomputes from a neighbor +1, snake from there. The total number of snake steps is bounded by number of (d,k) pairs times avg snake — worst case O(D·(N+M))... For our case: 100 d's × 5050 k's = 505k iterations, snakes mostly short or hitting common regions. Common regions: a diagonal inside a common run will snake across it once at some d and then subsequent d's start from V[k±1]+1 which may already be past... Hmm, worst case could re-snake. But 50 diffs means D small; even 505k × small snake fine. Actually worst-case snake total is bounded: each snake step lands on a match (x,y) with a[x]==b[y]; each such pair (x,y) lies on some diagonal; across all d, diagonal k's furthest x is monotone? Not strictly — snake from V[k-1]+1 could be less than current V[k]. Hmm, in Myers the computed x for diagonal k at depth d: is it ≥ previous depth's x for same k? Known property: furthest reaching values don't decrease across d. Because path of length d-1 on diagonal k... a path reaching diagonal k with d-1 steps exists only if parity matches — parity of k ≡ d, so d-1 paths reach k±1 not k. So V_d[k] vs V_{d-2}[k]: monotone non-decreasing. Snake extensions: at depth d, starting x = V[k±1]+1 which is ≥ related... The snake from start point to V_d[k] — these steps traverse matches; could a match pair be traversed at multiple depths? Possibly, but total work bounded by O((N+M)·D) anyway; with N+M=40k... 40k×100 = 4M worst case comparisons — under 2s? String equality comparisons are fast; 4M while-loop iterations ~1s maybe. Hmm risky in worst case, but realistically for 50 diffs it's far less. Let me think: total snake steps = sum over d, k of (snake length). Known bound: O(N+M) per... Actually a known tighter property: the snake at (d,k) starts at x ≥ V_{d-2}[k] (since V_{d-1}[k±1] ≥ ... hmm not guaranteed). Let me not over-analyze; Myers is standard and fast in practice for small D. With D=100, even the theoretical worst 4M is OK-ish. And realistically, when there are only ~50 edit regions, snakes quickly align and V values on middle diagonals reach n... Hmm, actually when a region between diffs is a long common run, the diagonal through it snakes fully at the first d that reaches it, and later depths start from V[k±1]+1 which is beyond... not necessarily beyond the run. Example: common run of length 10000 on diagonal 0 region; k=0 reached at d=0, snakes to run end. At d=2, k=0 computed from V[±1]+1 which may be early in the run → snake again through part of run. Could re-snake O(D) times → 100×10000 = 1M steps. Fine within 2s.

OK. Also worth adding small optimization: within snake loop compare via a[x] == b[y] — fine.

Alternatively use the "linear space divide and conquer" — unnecessary.

One more correctness check for the found condition placement: we check after setting V[off+k] = x, before snapshot. On found we break inner; then check final_d is not None → break outer. Good.

Edge: max_d loop — d up to n+m inclusive. If lists completely different, found at d = n+m. history then has entries 0..n+m-1 — memory ~ (n+m)^2/2 ints = 2M. Fine.

Let me also think: should we handle the case n+m huge but D small — memory is fine since history only D entries.

Also possible subtle issue: trimming when lists are identical → p = n = m, s = 0, cores empty → ops=[] → all "=" ✓.

Write final code. Also add type hints and maybe a helper. Use from __future__? Not needed, 3.11.

One micro-optimization for the hot inner loop: avoid repeated attribute/global lookups — all locals. Could also special-case k==-d and k==d to skip condition checks:

for k in range(-d, d+1, 2):
    if k == -d:
        x = V[off + k + 1]
    elif k != d and V[off + k - 1] < V[off + k + 1]:
        x = V[off + k + 1]
    else:
        x = V[off + k - 1] + 1

Keep as is.

Also, one more thought about backtrack condition equivalence: forward used strict <. Backtrack uses same strict <. ✓.

Also the check `if x >= n and y >= m` — must also ensure that when found we use this diagonal's endpoint (x,y) = (n,m) as shown. ✓.

Final code:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and a[n - 1 - s] == b[m - 1 - s]:
        s += 1
    ops = _myers(a[p:n - s], b[p:m - s])
    head = [("=", ln) for ln in a[:p]]
    tail = [("=", ln) for ln in a[n - s:]]
    return head + ops + tail


def _myers(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", ln) for ln in b]
    if m == 0:
        return [("-", ln) for ln in a]
    max_d = n + m
    off = max_d
    V = [0] * (max_d * 2 + 1)
    history = []
    final_d = -1
    for d in range(max_d + 1):
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and V[off + k - 1] < V[off + k + 1]):
                x = V[off + k + 1]
            else:
                x = V[off + k - 1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1
                y += 1
            V[off + k] = x
            if x >= n and y >= m:
                final_d = d
                break
        if final_d >= 0:
            break
        history.append(V[off - d:off + d + 1:2])
    ops = []
    x, y = n, m
    d = final_d
    while d > 0:
        prev = history[d - 1]
        half = d - 1
        k = x - y
        if k == -d or (k != d and prev[(k - 1 + half) // 2] < prev[(k + 1 + half) // 2]):
            px = prev[(k + 1 + half) // 2]
            py = px - (k + 1)
            ops.append(("+", b[py]))
            for i in range(py + 1, y):
                ops.append(("=", b[i]))
        else:
            px = prev[(k - 1 + half) // 2]
            py = px - (k - 1)
            ops.append(("-", a[px]))
            for i in range(px + 1, x):
                ops.append(("=", a[i]))
        x, y = px, py
        d -= 1
    for i in range(x - 1, -1, -1):
        ops.append(("=", a[i]))
    ops.reverse()
    return ops
```

Wait — snapshot after iteration d but before checking found... I appended history after the k-loop only if not found. But there's a subtlety: the snapshot slice V[off-d : off+d+1 : 2] reads values for k = -d..d step 2 — all set in iteration d ✓. But also note: when found occurs at some k in the middle of iteration d, V[off+j] for j < k (parity d) were set this iteration; we break and don't snapshot — fine since we never read history[final_d].

Hmm, but wait: history[final_d - 1] was appended after iteration final_d - 1 completed fully ✓.

Double-check the else-branch in backtrack when k == d: prev index for k-1 = d-1: (d-1 + d-1)//2 = d-1 ✓ (valid, prev has d entries indices 0..d-1). When k == -d: down branch, index (k+1+half)//2 = (-d+1+d-1)//2 = 0 ✓.

Also verify py ≥ 0 in down branch: py = px - (k+1), px = V_{d-1}[k+1] ≥ 0 and point valid → py ≥ 0 ✓.

The final d==0 snake: appends a[x-1..0] in reverse then whole ops reversed — consistent ordering ✓.

Test small example mentally: a=[], b=["x"]: p=0, s=0, myers returns [("+","x")], result [("+","x")] ✓.

a=["1","2","3"], b=["1","3"]: p=1, s=0 (s< m-p=1... check: s=0: s < n-p=2 ✓ and s < m-p=1 ✓, a[2]="3" == b[1]="3" ✓ → s=1; next: s=1 < 2 ✓ and 1 < 1 ✗ → stop). Wait s=1. Then core_a = a[1:3-1]=["2"], core_b = b[1:2-1]=["3"]. Hmm: core_a=["2"], core_b=["3"]. Myers: different → [("-","2"),("+","3")]. Result: [("=","1"),("-","2"),("+","3"),("=","3")] ✓ minimal.

Check duplicates tricky case: a=["x","x"], b=["x","x","x"]: p=2 (a[0]==b[0], a[1]==b[1]), then s: s < n-p=0 → s=0. cores: a[2:2]=[], b[2:3]=["x"] → ops [("+","x")]. Result: 3 "="... wait head = a[:2] = two ("=","x"), plus ("+","x") ✓ minimal (3 "=" items, LCS=2... "=" count = 2 ✓).

Another: a=["b"], b=["a","b"]: p=0 (b vs a), s=0 (s < n-p=1 ✓, s < m-p=2 ✓, a[0]="b" == b[1]="b" ✓ → s=1; then s=1 < 1 ✗). core_a = a[0:0]=[], core_b=b[0:1]=["a"] → [("+","a")]. Result [("+","a"),("=","b")] ✓.

Trickier duplicates: a=["x","y","x"], b=["x","x","y","x"]? p=1, s=1 (a[2]==b[3]="x"; then s=1 < n-p=2 ✓, < m-p=3 ✓, a[1]="y" vs b[2]="y" ✓ → s=2; then s=2 < 2 ✗). s=2. core_a = a[1:1]=[], core_b = b[1:2]=["x"] → ops [("+","x")]. Result: [("=","x"),("+","x"),("=","y"),("=","x")] ✓. LCS=3, "=" count 3 ✓.

Now duplicates where trimming could theoretically be suboptimal — e.g., a=["a","b"], b=["b","a"]? p=0, s=0. Myers: LCS=1. d=0: k=0, a[0]="a" vs b[0]="b" no. d=1: k=-1: x=V[off]=0,y=1; a[0]="a" vs b[1]="a" ✓ → x=1,y=2 ≥ n? x=1<2, no. V[off-1]=1. k=1: x=V[off]+1=1, y=0; a[1]="b" vs b[0]="b" ✓ → x=2,y=1 ≥ n=2, y=1 < m=2 no. d=2: k=0: V[off-1]=1 vs V[off+1]=2 → down: x=2, y=2 → found. Backtrack: history[1] = V[off-1:off+2:2] = [V[off-1], V[off+1]] = [1, 2]. d=2, half=1, k=0. prev[0]=1 < prev[1]=2 → down: px=prev[1]=2, py=2-1=1. ops: ("+", b[1]="a"); snake b[2:2] none. x,y=2,1. d=1: prev=history[0]=[0], half=0, k=1=d → else: px=prev[0]=0, py=0-0=0. ops: ("-", a[0]="a"); snake a[1:2] → ("=","b"). x,y=0,0. Final: nothing. reversed: [("=","b"),("-","a"),("+","a")] ✓ D=2, LCS=1 ✓.

I'm fairly confident. Let me also double check the history snapshot indexing when d-1 = 0: history[0] appended after d=0 iteration: V[off:off+1:2] = [V[off]] ✓.

Potential issue: max_d*2+1 array size: indices off+k for k in [-max_d, max_d] → off+k ∈ [0, 2*max_d] ✓.

Final performance thought for the 20k/50-diff case: D could be up to ~100 (if 50 deletions + 50 insertions). Outer ~100, inner k steps ~ 2*sum... sum_{d=0}^{100} (d+1) ≈ 5150 iterations plus snakes. Fast.

For pathological mid-list long common blocks with D=100: snake re-traversal bounded by ~(N+M) per d → 4M — acceptable.

For 1000 vs 1000 completely different: 2M inner iterations, no snakes. ~1s. ✓.

Write final answer.