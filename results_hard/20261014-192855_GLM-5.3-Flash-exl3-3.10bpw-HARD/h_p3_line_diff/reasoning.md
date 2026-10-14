We need Myers O(ND) algorithm producing an edit script. Straightforward: implement Myers with backtrack. For 20000 lines differing in ~50 places, D ~ 100, fine. For 1000 completely different lines, D ~ 2000, N+M=2000, O(ND)=2e6, fine.

Implementation: standard Myers with storing V arrays per D step, then backtrack. Memory: (D/2)*D ints — for D=2000 that's ~2000 arrays of size ~2000 → fine. Actually storing full V per step: D steps × D size = 4e6 ints for D=2000, fine.

But worst case for 20000 lines differing in 50 places: D=100, trivial.

Edge considerations: lines can repeat; Myers handles that. To get the minimal number of "=" (LCS length = N + M - D ... actually LCS = (N+M-D)/2). Myers produces a maximal match path; with ties, standard backtrack gives valid LCS script.

Implementation with prefix trimming? Not necessary but speed fine.

Let me write:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # Myers greedy
    max_d = n + m
    # trim common prefix/suffix to speed up and reduce memory
    # prefix
    pre = 0
    while pre < n and pre < m and a[pre] == b[pre]:
        pre += 1
    a2 = a[pre:n]; b2 = b[pre:m]
    suf = 0
    while suf < len(a2) and suf < len(b2) and a2[len(a2)-1-suf] == b2[len(b2)-1-suf]:
        suf += 1
    a2 = a2[:len(a2)-suf]; b2 = b2[:len(b2)-suf]
    na, nb = len(a2), len(b2)
    if na == 0 or nb == 0:
        script = [("=", a[0]*... )]

Wait careful: reconstruct script: prefix equals, then diff of middle, then suffix equals, and deletions/insertions for remainder. Actually after trimming, middle diff of a2, b2 (with Myers), and suffix lines are "=".

Let me compute:
- prefix lines a[:pre]: "="
- middle: diff(a2, b2)
- suffix lines a[na_full - suf:] i.e., a[n-suf:] : "="
- remaining of a2 after suffix: deletions... but we trimmed suffix off a2 and b2, so middle diff handles them via Myers.

Simplify: 
- script = [("=", x) for x in a[:pre]]
- then run Myers on a_mid = a[pre:n-suf], b_mid = b[pre:m-suf]
- then script += [("=", x) for x in a[n-suf:]]

Myers on mid:

def myers(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", x) for x in b]
    if m == 0:
        return [("-", x) for x in a]
    max_d = n + m
    V = {1: 0}? Use dict or arrays. Use list indexed by k + offset.

Store trace: list of V snapshots (lists of ints) per d, plus parity. Standard:

offset = n (or max_d)
v = [0]*(2*max_d+1)
trace = []
for d in range(max_d+1):
    trace.append(v[:])  # copy each step
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and v[k-1+offset] < v[k+1+offset]):
            x = v[k+1+offset]
        else:
            x = v[k-1+offset] + 1
        y = x - k
        while x < n and y < m and a[x]==b[y]:
            x += 1; y += 1
        v[k+offset] = x
        if x >= n and y >= m:
            # backtrack
            return backtrack(trace, d, a, b, offset)
    break? Actually found inside loop; handle return.

Backtrack:

def backtrack(trace, d, a, b, offset):
    x, y = len(a), len(b)
    script_rev = []
    for dd in range(d, 0, -1):
        v_prev = trace[dd]  # careful: trace[dd] is the v array before processing step dd, i.e., after step dd-1
        k = x - y
        if k == -dd or (k != dd and v_prev[k-1+offset] < v_prev[k+1+offset]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[prev_k + offset]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script_rev.append(("=", a[x-1]))
            x -= 1; y -= 1
        if dd > 0:
            if x == prev_x:
                script_rev.append(("+", b[prev_y]))
            else:
                script_rev.append(("-", a[prev_x]))
            x, y = prev_x, prev_y
    # remaining from (0,0) down to... when dd reaches 0, there may still be diagonal moves from (0,0)? At d=0, k=0, x=v[0] after snake; the final snake from (0,0) is included in the while loops. But if d==0 (identical sequences), all matches handled by final snake loop... Actually at d=0, loop for k=0: x = v[1+offset]... hmm initial v all zeros, x=0? Standard: after loop finishes without checking completion? In standard implementations, completion check occurs inside, and backtrack loop for dd from d down to 1, then remaining x,y > 0 means diagonal from (0,0) with k=0 at d=0: while x>0 and y>0: append("="...). Let me include final loop: while x>0 and y>0 and a[x-1]==b[y-1]: append "=", decrement. Actually at d=0, prev from (0,0) with snake: x equals number of diagonal steps. The remaining after processing dd=1..d: x,y at position after step 0's snake; leftover diagonal moves: while x>0 and y>0: append("=", a[x-1]); x-=1; y-=1. Since a[x-1]==b[y-1] holds in LCS region... At (x,y) with x-y=0 remaining on first diagonal, they match. Safe: a[x-1]==b[y-1] check, but for minimality guarantee use while x>0 and y>0.

Hmm—minimality guarantee: Myers' greedy gives a shortest edit script (D = minimal number of non-diagonal moves), hence number of "=" = (N+M-D)/2 = LCS length. Standard backtrack works.

But subtlety with trace copy: copying full v (size 2*max_d+1) each d step for d up to max_d — for the 20000-line case where D=100, that's fine since early termination. For 1000-vs-1000 completely different: max_d=2000, v size 4001, 1000 steps? D~2000, copies ~2000×4001×8 bytes ≈ 64MB... wait D up to n+m=2000, trace has D+1 entries each of size 2*max_d+1=4001 → 2000×4001 ≈ 8M ints ≈ 300MB with Python list of ints (small ints cached, list of pointers: 8 bytes ×8M = 64MB plus int objects cached). 64MB pointers — acceptable but let's optimize: v copy only up to ±d range; we can copy v[d-1 ... ] Actually we can store only slice [offset-d_prev ... offset+d_prev+1]? Simpler: copy v[offset-d-1 : offset+d+2]? Standard implementations (e.g., jed diffs) store trace.append(list(v)) anyway. To reduce memory, copy only needed slice with correct indices: at backtrack step dd, we need v_prev at indices k-1, k+1 within [-(dd-1), dd-1]... plus we need index arithmetic. We can store slices with an adjusted offset.

Alternative: store trace as list of dicts? Python dict overhead bigger. Let's just store slices: at step d, needed prev range is [-(d-1-... )]. Let prev_off = d (slice starts at k=-(d-1)? At backtrack for dd we need v_prev[k±1] for k in [-(dd-1), dd-1] range... k at step dd ranges within [-(dd-1), dd-1] since k = x-y and after dd-1 steps |k| ≤ dd-1. Actually k after reaching (n,m) at step d: k = n-m final? During backtrack, k values are within [-(dd), dd]? Hmm.

Let me just store trace[d] = v[offset-d : offset+d+1] copy before processing step d. Then in backtrack at step dd, index of k is k + dd (since slice starts at k=-dd... wait slice starts at offset-dd but we only need indices down to -(dd-1)? At step dd, we look at v_prev[k+1] where k could be -dd → index k+1 = -(dd-1), and v_prev[k-1] where k could be dd → k-1 = dd-1. So needed indices in [-(dd-1), dd-1]. If slice for step dd-1 covers [-(dd-1), dd-1], that works. So trace[dd-1] = copy of v[offset-(dd-1) : offset+dd]. Then in backtrack, use trace[dd-1] with local offset dd-1.

Let me restructure: at end of step d (after filling), the v values for k in [-d,d] are valid. Before step d+1, copy slice [- (d+1)... ] hmm we copy before processing to preserve state after previous steps. Standard: 

for d in range(max_d+1):
    trace.append(v[offset-d-1 : offset+d+2])  # covers k in [-(d+1)... ] hmm.

Simpler approach: copy before the step: at start of iteration d, v holds results of step d-1 (k ∈ [-(d-1), d-1]). We append a copy of v[offset-d : offset+d+1] (size 2d+1), which includes needed ±(d-1) plus sentinel positions that are stale but never read incorrectly? In greedy, when k==-d we take from k+1 without checking v[k-1] (guarded by `k == -d or ...`), and when k==d we take k-1+1... The conditions reference v[k-1] and v[k+1] only when valid. In backtrack, similarly guarded. So copying [offset-d, offset+d+1) before step d is fine, with local offset = d.

Total memory: sum over d of (2d+1) ≈ D² = 4e6 entries for D=2000. Fine.

Let me write:

def diff_lines(a, b):
    n, m = len(a), len(b)
    # trim common prefix
    pre = 0
    while pre < n and pre < m and a[pre] == b[pre]:
        pre += 1
    suf = 0
    while suf < n - pre and suf < m - pre and a[n-1-suf] == b[m-1-suf]:
        suf += 1
    head = [("=", x) for x in a[:pre]]
    tail = [("=", x) for x in a[n-suf:]]
    am = a[pre:n-suf]
    bm = b[pre:m-suf]
    return head + _myers(am, bm) + tail

def _myers(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", x) for x in b]
    if m == 0:
        return [("-", x) for x in a]
    max_d = n + m
    offset = n
    size = 2*max_d + 1
    v = [0]*size
    trace = []
    for d in range(max_d + 1):
        trace.append(v[offset-d if offset-d >= 0 else 0 : offset+d+1])
        
Hmm, offset - d could be negative when d > offset = n. Since max_d = n+m > n, d can exceed n. Negative slice start wraps. Need care: keep offset = n but clamp? Indices k+offset: k ∈ [-d, d], need offset ≥ d i.e. d ≤ n for negative k not to underflow. Use offset = m? d up to n+m... Underflow for k=-d needs offset ≥ max_d... Let offset = max_d? Then size = 2*max_d+1, k+offset ∈ [0, 2*max_d]. But offset = max_d means x = v[k+offset], y = x - k could be... x values up to n; fine, array indices just need to be non-negative and within bounds. Using offset = n: k + n for k down to -(n+m) = -max_d → negative index. Python negative indices wrap, which silently corrupts. Use offset = max_d and size 2*max_d+1? Then k+offset ∈ [max_d - max_d, max_d + max_d] = [0, 2*max_d]. Good. But typical implementations use offset = n because k ≥ -d and d ≤ D ≤ n+m, and when y < 0... whatever — offset = max_d is safest.

trace.append(v[offset-d : offset+d+1]) — with offset = max_d, offset-d ≥ 0 for d ≤ max_d. Good. Slice length 2d+1, local index k + d.

But then in backtrack, local offset for trace[dd] is dd. Wait trace[dd] is the copy made at start of iteration dd, representing state after step dd-1, with slice covering k ∈ [-(dd), dd]. In backtrack at step dd, we access v_prev[k±1] with local index (k±1) + dd.

Hmm, but trace list index: trace[0] is copy at d=0 covering only k=0 slice [offset, offset+1] = [v[0]] (all zeros). In backtrack, final leftover diagonal handled separately.

Backtrack:

x, y = n, m
script = []
for dd in range(d_found, 0, -1):
    v_prev = trace[dd]
    k = x - y
    # choose predecessor
    if k == -dd or (k != dd and v_prev[k-1+dd] < v_prev[k+1+dd]):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = v_prev[prev_k + dd]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        script.append(("=", a[x-1]))
        x -= 1; y -= 1
    # now either x==prev_x (insertion of b[prev_y]... wait)
    if x == prev_x:
        # y > prev_y: move down = insertion
        script.append(("+", b[prev_y]))  # b[y-1] == b[prev_y]
        y -= 1  # y = prev_y
    else:
        script.append(("-", a[prev_x]))  # a[x-1] == a[prev_x], x = prev_x+1
        x -= 1
    # x,y = prev_x, prev_y
script.reverse()
# leftover diagonal from (0,0)
while x > 0 and y > 0:
    script.append(("=", a[x-1]))
    x -= 1; y -= 1
script.reverse()
return script

Wait, but the leftover diagonal after the loop: after processing step 1, x,y = prev at step 0 = (v_prev stuff). At d=0, only k=0, prev_x = trace[0][0] = 0. So after loop, x==y, remaining diagonal moves: while x>0: append("=", a[x-1]). But my while uses x>0 and y>0 — since x==y it's fine. Actually to be safe: while x>0 and y>0. Hmm but could the leftover after all steps have x>0 but y==0? That would require deletion at d=0 impossible (no non-diagonal at d=0). After backtrack to step 0's start, state is (vx, vx) where vx = values from... trace[0] copy of initial v (all zeros), so prev = (0,0)?? Not exactly — at dd=1, we go to (prev_x, prev_y); then leftover diagonal while-loop handles moves between (prev_x,prev_y) and (x,y) at step 0. After step-1 backtrack, x,y is the point where step-1's snake started, which is (v[1-offset]... ). Hmm, standard implementations handle it exactly this way: after the loop, `while x > 0 and y > 0: yield '='; x-=1; y-=1`. Yes that's the common pattern and it's correct since the d=0 move is purely diagonal ending at (x0, x0), and any leftover (x,y) with x==y>0 are diagonal. But could leftover be x != y? At dd=1, k ∈ {-1, 1}. prev point for k=1 is (v_prev[0], ...)... With initial v all zeros and snake run at d... The standard algorithm doesn't run diagonal-snake at d=0 before iterating; v starts all zeros, and d=0 step does k=0: x = ? With the standard condition: k==0, d==0: k == -d → x = v[k+1] = v[1] = 0; then snake. So at d=0, the snake from (0,0) is done during the loop, and trace[0] captured v before that, which is all zeros. So after backtracking through dd=1..d, we end at point (x,y) where the d=0 snake started = (0,0). Wait no: after dd=1 processing, x,y = prev point of step 1 = endpoint of step 0's snake... Hmm. Backtrack: at each dd, prev point is endpoint of snake of step dd-1 for some k. At dd=1, prev is step-0 endpoint = (v[0+offset] after step0) but trace[1] holds v after step 0, so prev_x = trace[1][prev_k + 1]. Then after moving to prev point, leftover diagonal = the step-0 snake itself, handled by final while. Final point after final while should be (0,0)? The step-0 snake starts at (0,0). After while consumes diagonals down... consumes a[x-1] for x from endpoint down—leaves (0,0)? The while consumes diagonal moves but snake might have started not at (0,0)? At d=0, x starts at 0 (since v was zeros), snake from (0,0). So yes ends at (0,0). But careful: what if d_found == 0 (a == b)? Then the completion check triggers at d=0 inside the loop with x=n,y=m; backtrack loop doesn't run; final while appends all n "="; script reversed → correct. But wait, if a==b after prefix/suffix trimming, am and bm are both empty → handled by n==0/m==0 early returns. Still, generic code should handle d=0.

Also completion check placement: check `if x >= n and y >= m` after updating v inside k loop, record d and break out. I'll set a flag and break.

But there's subtlety: trace.append happens at start of iteration d before processing, so trace has entries 0..d_found. Backtrack uses trace[dd] for dd from d_found down to 1, and trace[1]... fine. trace[0] only needed conceptually.

One more subtlety: in backtrack choice `if k == -dd or (k != dd and v_prev[k-1+dd] < v_prev[k+1+dd])`. Standard.

Hmm, but the trace slice: trace[dd] = v[offset-dd : offset+dd+1], local index = k + dd. When k == dd, k+dd = 2*dd — valid within slice of length 2dd+1 (indices 0..2dd). k-1+dd for k=dd: 2dd-1, valid. k=-dd: index 0; k+1+dd = 1 valid. Good.

Now correctness of minimality with prefix/suffix trimming: trimming doesn't change LCS length (common prefix lines can always be matched). Fine. And performance: trimming is essential for 20000-line case with 50 diffs — D ≈ 100 after trimming (if the diffs are scattered, without trimming D would still be smallish? Actually with scattered diffs, untrimmed D ≈ up to... no—untrimmed, D equals editscript distance of full lists which is small (~100) regardless since diffs are few; Myers handles it fine even untrimmed, since early k rows converge. Actually yes, D = 100 means the algorithm terminates at d=100 with N=20000... but each inner snake scan is O(N+M) per d in the worst case → O(D·(N+M)) = 100×40000 = 4e6, fine even untrimmed. Trimming just helps.)

Hmm wait: worst-case snake scanning: for each d, for each k, the while loop advances. Total per step O(N+M). With D=100 and N+M=40000, 4e6 comparisons — fine in Python (~1-2s?). Python string comparisons are fast; 4e6 iterations maybe ~1s. Trimming makes it much faster: after trimming, na+nb small if diffs are contiguous, but scattered diffs leave middle large (~20000 lines) yet D small (number of differing regions × 2). Say 50 diff regions → D ≈ 100, middle size ~19900. So O((N+M)·D) = 100 × 40000 = 4e6 loop iterations of the while — each iteration is `a[x]==b[x+k]` comparison plus increments. In Python, ~4e6 iterations ≈ 1.5s? Hmm, tight. We can optimize the snake using a fast equality check: compare slices? Better trick: skip using `while x < n and y < m and a[x] == b[y]` — standard. To speed up, we can find runs by comparing... A known optimization: since lines repeat arbitrarily, we can't hash easily. 

Alternative optimization: reduce middle via additional trimming inside? Already done. Another optimization: instead of while loop char by char, we could exploit that most snake advances happen... they're inherent. 4e6 simple iterations in Python: roughly 0.5–1.5s. Probably OK under 2s. But to be safer, we can precompute nothing... Actually there's a classic trick: convert lists to strings with a join using unique separators? Lines could contain any chars including separators. Use repr? Not robust.

Alternative: map lines to ints via a dict (interning), then compare ints — faster than string comparison? String comparison of equal strings first checks identity fast (CPython: equal strings — actually list elements comparison `a[x]==b[y]` on identical str objects is pointer-fast? CPython does `PyObject_RichCompare` but unicode comparison first checks identity? It checks `if (left == right)` quick path in some compare paths — for `==`, unicodedata does check `a == b` pointer equality in `unicode_compare_eq`? Actually PyUnicode_Compare has identity shortcut; richcompare `==` for identical objects returns True quickly via identity check in PyObject_RichCompareBool (which is used for `==`? `==` uses PyUnicode_Compare... hmm). PyObject_RichCompare doesn't short-circuit identity for `==` generally... Actually PyObject_RichCompareBool does identity shortcut (used by `in`, list.__contains__). For direct `==` in Python code, PyUnicode_RichCompare checks identity: `if (left == right) ... return True` — yes, PyUnicode_RichCompare has a fast path when both are the same object. And for equal but non-identical strings, comparison is O(min len) with memcmp usually. Also, if strings come from the same parsing, interning may not apply but equality memcmp is fast.

To be safe with performance, I can intern strings: build id map so a and b share objects, making comparisons pointer-fast. `if a[x] is b[y] or a[x] == b[y]`. Use `is` first as fast path. Even simpler: create a dict mapping line→canonical object and map both lists through it. That costs O(N) dict ops (fast). Then comparisons `A[x] == B[y]` on identical objects is quick via identity fast path.

Also convert to a list of ints? Map each unique line to small int; comparisons on ints are fast. Let's do that: 

pool = {}
def canon(lst): return [pool.setdefault(x, x) for x in lst]

setdefault returns the stored value — the first inserted object; both lists then reference identical objects, so `==` hits identity fast path. Or map to ints: pool with index. Int comparisons also fast and small ints cached. Let's map to ints: assign id per distinct line, transform lists to lists of ints. Then all comparisons are int comparisons — fast.

Actually identity fast path: for `left is right`, CPython's PyUnicode_RichCompare: 

if (left == right) { ... return True } — that's for `==` op, yes there's a check `if (left == right && op == Py_EQ)` roughly. With ints mapped via dict, identical? setdefault returns the same object, so a-int and b-int for the same line are the same int object; int __eq__ checks identity first (long_richcompare compares values; small overhead). Fine either way.

I'll do canon mapping to ints for speed and to reduce memory in trace (trace holds ints).

Hmm, but trace holds x-coordinates (ints), fine.

Performance estimate for the hard case: N=M=20000, ~50 scattered diff regions → after prefix/suffix trim, middle n,m ≈ 20000ish, D ≈ up to ~2×number of changed lines... "differ in about 50 places" — say D ≤ ~120. Snake while iterations total across all d ≤ (N+M) per d step worst case = 40000×120 = 4.8e6 worst case, but typically much less because snakes mostly overlap... Actually worst case per d is O(N+M) only if snakes keep advancing; in practice each k's snake advances monotonically and total work is bounded by O((N+M)·D) worst case but typical much less. It should be fine, but worst case could hit ~5e6 while iterations of `x < n and y < m and A[x] == B[y]` → each iteration: two comparisons, two increments, index ops — maybe ~150ns-300ns → 1-1.5s. Under 2s, probably OK. Could speed snake with a trick: find length of common prefix of A[x:] and B[y:] efficiently? Not directly.

Micro-optimize the snake: 

while x < n and y < m and ax == by...

We can restructure to reduce bound checks: precompute n, m. Fine.

Another optimization: use local variable references A, B, v, etc.

For second scenario: 1000 completely different lines: after trim, n=m=1000, all distinct → D = 2000, d loop 1000 steps? D = n+m = 2000, but loop d from 0..2000, each step processes k in range(-d, d+1, 2) → total k-steps ≈ D²/2 ≈ 2e6, each cheap. trace memory: slices sum ≈ D² = 4e6 int slots → ~32MB list-pointer overhead... slices of lists of ints: 4e6 pointers = 32MB, ints are small ints ≤ ~20000, cached. OK. Wait, trace entries: sum_{d=0..2000} (2d+1) ≈ 4e6 → 32MB pointers. Fine.

Hmm, but with all-different 1000 vs 1000, D reaches 2000 = n+m. Loop d up to max_d inclusive; termination when d = n+m. Each step: inner k loop up to 2d+1 iterations. Total ≈ sum (2d+1) ≈ 4e6 iterations. Each iteration is a few operations — ~2-3s? Under 6s. OK.

Completion check: also check early termination when k odd/even? Standard.

Let me also handle: completion condition inside k loop: if x >= n and y >= m: record d, and break all; then backtrack. Use for-else or a found flag and function return.

Let me write the code cleanly.

def diff_lines(a, b):
    n, m = len(a), len(b)
    # canonical mapping to ints for fast comparisons
    pool = {}
    def canon(seq):
        out = []
        append = out.append
        for line in seq:
            i = pool.setdefault(line, len(pool))
            append(i)
        return out

Hmm, pool.setdefault(line, len(pool)): but if line already present, returns stored index — good. Wait setdefault's default is evaluated eagerly (len(pool) computed), fine. But stored values are ints and keys are the original strings — comparisons then int==int fast. But wait: two equal strings map to same int — good. Memory fine.

Actually simpler: pool.setdefault(line, len(pool)) — careful: default computed before look-up but that's fine since we only use it when key absent.

    A = canon(a); B = canon(b)

Then trim, then Myers on int lists.

Return script: items reference ("=", ) with line from original a/b. In backtrack I need original strings: keep a (original) for "=" and "-", b for "+". Since A is canonical of a with same indices, coordinates valid. In backtrack, use original a and b for building script — indices align. Good.

Full code:

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n, m = len(a), len(b)
    # Trim common prefix and suffix.
    pre = 0
    while pre < n and pre < m and a[pre] == b[pre]:
        pre += 1
    suf = 0
    while suf < n - pre and suf < m - pre and a[n - 1 - suf] == b[m - 1 - suf]:
        suf += 1

    # Canonicalize lines to small ints for fast comparison.
    pool: dict[str, int] = {}
    def canon(seq):
        out = []
        for line in seq:
            out.append(pool.setdefault(line, len(pool)))
        return out

    A = canon(a)
    B = canon(b)

    am = A[pre:n - suf]
    bm = B[pre:m - suf]

    result = [("=", line) for line in a[:pre]]
    result.extend(_myers(am, bm, a, b, pre))
    result.extend(("=", line) for line in a[n - suf:])
    return result

Wait — _myers works on canonical lists but outputs lines from original a/b. Pass originals with offsets: a_mid_orig = a[pre:n-suf]? For "-" items need original lines from a's middle; for "=" need either a's or b's (they're equal). Let's pass am_lines = a[pre:n-suf] and bm_lines = b[pre:m-suf]... but slicing creates copies — fine (they're refs). Or pass full a,b plus offset. Simpler: pass am_lines = a[pre:n-suf], bm_lines = b[pre:m-suf]; A, B lists. Then _myers(A_mid, B_mid, am_lines, bm_lines).

Wait but canon on full a/b — but prefix/suffix comparisons done on originals before canon — fine.

Hmm, actually I should canon after trimming to avoid canoncost on huge equal parts? canon of 40000 lines is fast anyway. But canon only the middle: A = canon of a[pre:n-suf]... then trim done on originals. Let's do canon only on middle slices. Actually to trim efficiently, comparing original strings directly works; trimming reduces middle. Then canon middle only. Good.

But careful: trimming loop comparisons are on original strings — for 20000-line case it's just prefix+suffix scans, O(N+M) total. Fine.

_myers(A, B, alines, blines):

def _myers(a, b, alines, blines):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", x) for x in blines]
    if m == 0:
        return [("-", x) for x in alines]
    max_d = n + m
    off = m  # classic: offset = m ensures k+off >= -m ... hmm choose off = n? Let me use off = n as in many impls; k ranges to -max_d which needs index ≥0 → off ≥ max_d? Not needed since d stops at D ≤ n+m, and k ≥ -d; k+off < 0 possible if d > off. With off = n, k = -d, index n - d; d can exceed n when... if d > n then y - x = d means y > n ≥ ... but y ≤ m; d ≤ n+m. If d > n, possible (n=0 handled, so n ≥ 1, m could be ≫ n; d up to n+m ≫ n). k=-d → index negative → wraps. So must use off ≥ max_d? But then indices large: fine, off = max_d, size 2*max_d+1... but allocate v = [0]*(2*max_d+1) — 20000-case: max_d = ~40000 → 80001 slots, fine; 1000-case: 4001 slots fine.

Hmm, wait many implementations use off = n and size n+m+1... e.g., common `V = {1: 0}` dict version avoids this. To be safe: off = m (so k+off ∈ [m - max_d, m + max_d] hmm negative too). Use off = n (then k+n ≥ n - max_d = -m < 0 possible). So safest: off = max_d = n+m, array size 2*(n+m)+1. For n=m=20000, that's 160001-element list allocation — 1.3MB, fine, done once.

Actually we can bound max_d by n+m and it's exact requirement. OK.

Alternatively use dict for v (like the well-known dict-based Myers) but list is faster.

off = max_d
v = [0] * (2 * max_d + 1)
trace = []
found_d = -1
for d in range(max_d + 1):
    trace.append(v[off - d : off + d + 1])
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
        if x == n and y == m:
            return _backtrack(trace, d, a, b, alines, blines)
return ... unreachable

Wait: slice v[off-d : off+d+1] length 2d+1, local index for k is k + d. In backtrack, use that.

Check guard correctness: when k == -d, we take x = v[idx+1] (i.e., k+1 from previous step) — but standard condition is: if k == -d or (k != d and v[k-1] < v[k+1]): x = v[k+1] else x = v[k-1]+1. When k == -d, v[idx-1] would be k-1 = -d-1 which hasn't been set meaningfully—guard prevents reading? The guard reads v[idx+1] only; v[idx-1] read only in else branch where k != -d... wait else branch: k != -d and (k == d or v[idx-1] >= v[idx+1]). If k == d, we take else: x = v[idx-1]+1 — idx-1 valid (k-1 = d-1 from prev step). Fine.

Backtrack:

def _backtrack(trace, d_final, a, b, alines, blines):
    x, y = len(a), len(b)
    script = []
    for d in range(d_final, 0, -1):
        v_prev = trace[d]
        k = x - y
        if k == -d or (k != d and v_prev[k - 1 + d] < v_prev[k + 1 + d]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[prev_k + d]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if x == prev_x:
            script.append(("+", b[prev_y]))  # wait: b is blines
            y = prev_y
        else:
            script.append(("-", a[prev_x + 1]))  # hmm

Hold on: after consuming diagonals, either (x == prev_x and y > prev_y) → insertion, the inserted line is blines[y - 1]? The insertion moves from (prev_x, prev_y) to (prev_x, prev_y + 1), then snake continues. So the inserted line index is prev_y → blines[prev_y]. After insertion, y becomes prev_y + 1, and then diagonals consumed brought y down to prev_y + 1... Let me redo: current (x,y) is endpoint after step d. Step d: came from (prev_x, prev_y) via one edit then snake. If x == prev_x: edit was insertion at b[prev_y] (moving y from prev_y to prev_y+1), then snake from (x=prev_x, y=prev_y+1) to (x,y). The snake lines are a[prev_x .. x-1] == b[prev_y+1 .. y-1]. So after the diagonal-consumption while (which consumed down to y = prev_y + 1, x = prev_x), we append ("+", b[prev_y]) and set y = prev_y (x already prev_x). But my while loop runs while x > prev_x AND y > prev_y — if x == prev_x immediately, while doesn't run; then append "+" with b[prev_y]... but y > prev_y might be more than 1? No: after backtrack, x - y = k and prev_x - prev_y = prev_k = k ± 1. If prev_k = k + 1 (a deletion from (prev_x,prev_y) down... let me recheck.

Case insertion (edit moves (prev)→(prev_x, prev_y+1)): k_new = prev_k - 1... For x==prev_x case: k = x - y, prev_k = prev_x - prev_y = x - prev_y. Since prev_y ≤ y - 1 → prev_k ≥ k + 1 → prev_k = k + 1. So when we reach here, prev_k = k+1, prev_y = prev_x - k - 1 = x - k - 1 = y - 1 (since prev_x = x). So y - prev_y = 1. The while loop before: condition x > prev_x false → doesn't run → snake already consumed? Hmm, the while consumed diagonals of step d's snake... but wait the while loop consumes from (x,y) backward down to the post-edit point (prev_x, prev_y + 1) in insertion case. But while condition requires both x > prev_x and y > prev_y — y > prev_y holds (y = prev_y + 1), x > prev_x? If x > prev_x, snake length > 0, consume it. Ends at (prev_x, prev_y+1). Then append ("+", b[prev_y])? But careful: appended item must reflect that this "+" comes before those "=" in forward order — since we build reversed and reverse at end, append ("+", b[prev_y]) → correct: the inserted line is b[prev_y]. Then y -= 1 → y = prev_y.

Hold on, but the while loop as written consumes diagonals before deciding edit; in the insertion case with snake present: (x,y) → consume diagonals → (prev_x, prev_y + 1) → then append "+" and set y = prev_y. Yes matches my code: after while, if x == prev_x: append "+", y = prev_y? But my code says `y -= 1`? After while, y == prev_y + 1, so y -= 1 → prev_y. But I wrote condition x == prev_x → append ("+", b[prev_y]); y = prev_y. Since y == prev_y + 1, `y = prev_y` == `y -= 1`. Both fine. But hmm — actually in the earlier code I wrote `script.append(("+", b[prev_y]))` — wait the inserted line: forward direction: from (prev_x, prev_y), insertion of b[prev_y] gives (prev_x, prev_y+1). Yes inserted line is blines[prev_y]. Correct.

Case deletion: prev_k = k - 1 (since x must decrease by 1: x = prev_x + 1). Deletion removes a[prev_x], moving (prev_x, prev_y) → (prev_x+1, prev_y), then snake. After while: (prev_x + 1, prev_y). Append ("-", a[prev_x + 1]) i.e., alines[prev_x + 1] = alines[x-1]... then x -= 1.

My earlier draft: `script.append(("-", a[prev_x]))` then `x -= 1` — that's wrong index; should be a[prev_x + 1] then x = prev_x. Or a[x - 1] with x -= 1 (x currently prev_x + 1): append ("-", a[x-1]); x -= 1. Let me use that form.

Similarly insertion: append ("+", b[y - 1]); y -= 1. Cleaner: after while, if x == prev_x: append("+", b[y-1]); y -= 1. Else: append("-", a[x-1]); x -= 1. Check: deletion case: x == prev_x + 1, y == prev_y; append a[x-1] = a[prev_x] — correct (the deleted line is a[prev_x]). Insertion case: y == prev_y + 1, x == prev_x; append b[y-1] = b[prev_y] — correct. 

But is it guaranteed that after the while loop, exactly one of (x==prev_x, y==prev_y) holds and the difference is 1 step? Since exactly one non-diagonal move occurs in each backtrack step, yes: the edit + snake. The while consumes snake; remaining delta is exactly the edit. So after while: either (x==prev_x and y==prev_y+1) or (x==prev_x+1 and y==prev_y). Good.

Then after loop over d down to 1: leftover diagonals for d=0 snake: while x > 0 and y > 0: append("=", a[x-1]); x -= 1; y -= 1. But hold on — the leftover at this point: we've backtracked to the starting point of step 1's snake, i.e., the endpoint of step 0's path which is a diagonal from (0,0). So leftover x==y and each is diagonal: while x > 0 (and y > 0 automatically). Use while x > 0 and y > 0.

Then reverse and return.

Wait, but there's an issue with the backtrack loop for d from d_final down to 1: when d_final could be... if d_final == 0, loop doesn't run, leftover while handles all. Good.

Also need trace[d] for d down to 1: trace[1] covers k ∈ [-1,1], local index k+1. Good.

But careful: in backtrack, condition `k == -d or (k != d and v_prev[k-1+d] < v_prev[k+1+d])` — mirrors forward.

Edge: when k == d in backtrack: else branch → prev_k = k-1 → reads v_prev[k-1+d] — valid.

Double-check the forward loop's condition ordering: `if k == -d or (k != d and v[idx-1] < v[idx+1])`. When k == -d, idx-1 = -d-1+off could be stale-but-not-read... we don't read it. Good.

Now also, subtle correctness: the condition `k != d` when k == d: should take else? Standard condition: 
if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]
else: x = V[k-1] + 1
When k == d (and d>0): must come from k-1 (can't come from k+1 which is beyond frontier) → else. And when k==-d → from k+1. Matches.

Termination: guarantee that the found path is found; return from inside loops via helper: put backtrack inline or return via nested function. I'll structure _myers to contain the backtrack loop inline, returning script.

Rewrite _myers fully:

def _myers(a, b, alines, blines):
    """a, b: canonical int lists; alines, blines: original lines."""
    n, m = len(a), len(b)
    if n == 0:
        return [("+", x) for x in blines]
    if m == 0:
        return [("-", x) for x in alines]
    max_d = n + m
    off = max_d
    v = [0] * (2 * max_d + 1)
    trace = []
    for d in range(max_d + 1):
        trace.append(v[off - d: off + d + 1])
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
            if x == n and y == m:
                # backtrack
                script = []
                x2, y2 = n, m
                for dd in range(d, 0, -1):
                    vp = trace[dd]
                    kk = x2 - y2
                    if kk == -dd or (kk != dd and vp[kk - 1 + dd] < vp[kk + 1 + dd]):
                        pk = kk + 1
                    else:
                        pk = kk - 1
                    px = vp[pk + dd]
                    py = px - pk
                    while x2 > px and y2 > py:
                        script.append(("=", alines[x2 - 1]))
                        x2 -= 1
                        y2 -= 1
                    if x2 == px:
                        script.append(("+", blines[y2 - 1]))
                        y2 -= 1
                    else:
                        script.append(("-", alines[x2 - 1]))
                        x2 -= 1
                while x2 > 0 and y2 > 0:
                    script.append(("=", alines[x2 - 1]))
                    x2 -= 1
                    y2 -= 1
                script.reverse()
                return script
    # unreachable
    return []

Wait — trace slice `v[off - d: off + d + 1]`: at iteration d, v holds results from step d-1 whose k range is [-(d-1), d-1], stored at indices [off-(d-1), off+(d-1)]. Slice [off-d, off+d+1] includes those plus two stale entries. Local index of k: (k + off) - (off - d) = k + d. ✓.

Now minimality concern: Myers gives minimum D. The number of "=" entries from the script = total matched = (n_mid + m_mid - D)/2, plus trimmed prefix/suffix equals — overall LCS is preserved under prefix/suffix trimming (LCS(a,b) = pre + LCS(mid) + suf; and Myers' D for the middle gives LCS(middle) = (nm+mm-D)/2 — is the trimmed-middle LCS equals middle LCS? Yes, trimming preserves LCS). But careful: does Myers path always realize the maximum matches for its D? Yes: any path with D non-diagonal moves has (N+M-D)/2 diagonal moves, and Myers finds minimal D, so its path has maximal diagonals overall. Since total "=" count = N+M-D... = diagonals count, maximal. But constraint: "taking = and - gives exactly a" — the script from path decomposition satisfies this by construction. Good.

One more check: the requirement "number of = items equals LCS length". With trimming, total "=" = pre + suf + diagonals_middle. diagonals_middle = (n_mid + m_mid - D)/2. LCS(a,b) = pre+suf+LCS(middle) and LCS(middle) = (n_mid+m_mid-D_min_middle)/2 where D_min_middle is the minimal edit distance of middles. Myers returns minimal D for middle → equals LCS. ✓

Now verify backtrack trace indexing with a small example. a = [x], b = [y] (different). n=m=1, max_d=2, off=2.

d=0: trace.append(v[2:3]) = [0]. k=0: idx=2. k==-d → x = v[3] = 0. y=0. snake: a[0]==b[0]? No. v[2]=0. Not done.
d=1: trace.append(v[1:4]) = [0,0,0] (v[1],v[2],v[3]). k=-1: idx=1. k==-d → x = v[2] = 0, y = 0 - (-1) = 1. snake: x<1,y<1? y==m stop... x<n (0<1) and y<m (1<1) false → no. v[1] = 0. Not done (x=0≠1). k=1: idx=3. k==d → else: x = v[idx-1]+1 = v[2]+1 = 0+1 = 1. y = 1-1 = 0. snake: x<n? 1<1 no. v[3]=1. Not done.
d=2: trace.append(v[0:5]). k=-2: idx=0. x = v[1] = 0 → y = 2. y<m? no snake. v[0]=0. k=0: idx=2. k==-d? no. k!=d yes, v[1] < v[3] → 0 < 1 → x = v[3] = 1, y = 1. snake: x<1? no. v[2]=1. k=2: idx=4. k==d → else: x = v[3]+1 = 2, y = 0. v[4]=2. Done? x==n=1? no.
d... hmm not found at d=2? Wait max_d = 2 = n+m. Edit script for 1-vs-1 different: delete a[0], insert b[0] → D=2. At d=2: paths with 2 edits, k ∈ {-2,0,2}. Path: deletion then insertion → x-y = -1... Let me recompute: delete a[0]: (0,0)→(1,0); insert b[0]: (1,0)→(1,1)=end. k final = x-y... at end x=y=1 → k=0. So the completion is found at k=0, d=2. In k=0 processing above: x = v[3] = 1 — hmm v[3] was set at d=1,k=1 to x=1. That corresponds to after deleting a[0] at step 1 → position (1,0). Then at d=2, k=0: from k=1 (x=1,y=0) insert b[0] → (1,1) ✓. But in my k=0 code: x = v[idx+1] = v[3] = 1, y = x - k = 1. Snake: x<n no. v[2] = 1. Check x==n and y==m: 1==1 ✓ 1==1 ✓ → done, d=2. I mistakenly said "k=2" processed after; no, return at k=0. Good.

Backtrack: script=[]; x2=y2=1. dd=2: vp = trace[2] = v[0:5] copy = [0,0,0,1,0]. kk = 0. kk==-2? no. kk != 2 yes; vp[kk-1+dd] = vp[1] = 0 < vp[3] = 1 → pk = 1. px = vp[1+2] = vp[3] = 1. py = 1 - 1 = 0. while x2>px(1>1 no). x2==px → insertion: append ("+", blines[y2-1]) = ("+", b[0]) ✓; y2 = 0. dd=1: vp = trace[1] = v[1:4] = [0,0,0]. kk = x2 - y2 = 1. kk == -1? no. kk != dd? kk=1=dd → condition false → else: pk = 0. px = vp[0+1] = vp[1] = 0. py = 0. while x2>0 and y2>0? y2=0 → no. x2==px? 1==0 no → deletion: append ("-", alines[x2-1]) = ("-", a[0]) ✓; x2=0. Leftover while: x2=0 → none. script reversed: [("-",a[0]), ("+",b[0])] ✓.

Now the "=" correctness in the middle: verified enough.

Performance detail: trace.append slice copies list of ints — fine.

One more performance concern: 20000 vs 20000 with 50 diffs: trimming may not shrink middle if diffs span the whole range (e.g., 50 single-line changes scattered). Middle n≈m≈20000, D≈100ish (each single-line change = 2 edits; 50 changes → D≈100). Forward loop: d up to 100; each d: 2d+1 k-values... total k iterations ≈ 100² = 10⁴; snakes: each k snake up to O(N+M)... worst-case per d could scan up to 2*N across ks — realistic total maybe a few million int compares. Int comparisons fast. Should be well under 2s.

But wait — worst case nuance: at each d, snakes can re-scan long equal stretches? No: x for each k is monotone; snake for k starts at x = max of neighbors + ...; total snake work per d is ≤ n+m but bounded by max over k of x which grows. Overall bound O((N+M)·D) = 4e6 — okay.

Hmm, actually consider scattered diffs: most k-snakes hit the long common runs and advance far each step. Total work ~ D × gap sizes... With 50 gaps distributed, each d-step snakes sweep across; roughly D*(N+M)/2 worst ~ 2e6 iterations. Fine.

Also canonicalization: 40000 dict setdefault ops — fast.

Edge cases: identical lists → pre covers everything, middle empty → _myers early-returns? am and bm lengths 0 → n==0 → return []. Actually if both empty: `n == 0` returns []. Good. Empty inputs work. Also all-delete or all-insert cases handled by _myers early return with minimal script (correct, and "=" count zero = LCS=0). For completely different lists, Myers with trimming: suffix trim loop requires both nonempty middles; e.g., a and b share nothing → middle full → Myers D = n+m → d loop reaches max_d... check termination: at d = n+m... does the loop find completion? For any pair, minimal D ≤ n+m, and the algorithm's frontier will reach (n,m) at d = D. At d = n+m it definitely does (path of all deletes then inserts... actually path with all deletes at k = n-m... hmm — completion check happens at some k each step; guaranteed found by d = n+m). To be safe keep `return []` fallback (unreachable).

Actually wait: consider n=2,m=0 → early return. n=3, m=1, all different: D = 4 = n+m? Path: 3 deletes + 1 insert = 4 = n+m. Found at d=4? max_d = 4, range includes 4. ✓.

Another subtlety: `trace.append(v[off - d: off + d + 1])` when slice start off-d ≥ 0 since off = max_d ≥ d. ✓ Length 2d+1 ✓.

Note the guard uses `v[idx - 1]` where idx-1 could be index of k-1 from current step d? At step d, we process k in increasing order, so v[idx-1] (k-1... wait parity: k and k-1 have different parity; k-1 was set at step d-1, k+1 also at step d-1? k+1 has parity opposite to k; at step d we only write even/odd k matching d's parity. k-1 and k+1 were last written at step d-1 (values from previous frontier) — correct since we read pre-step values. But careful: v[idx+1] corresponds to k+1 written at step d-1; v[idx-1] also from step d-1. And current step's writes don't collide since parity differs. ✓ But stale values beyond frontier? k+1 for k = d: not read (guarded by k != d). k-1 for k = -d: not read. ✓ But wait — for k in the middle, v[idx+1]: k+1 ≤ d-1 (since k ≤ d-2 by parity step 2? k ranges -d..d step 2 → kmax-1... for k ≤ d-2, k+1 ≤ d-1 ✓ written at step d-1). For k = d: guarded. ✓ Similarly k-1 ≥ -(d-1). ✓

But there's the initial d=0: k=0, k==-d true → x = v[idx+1] = v[off+1] = 0. ✓

The stale values in positions beyond frontier from earlier steps? Positions are monotone increasing; reading v[k±1] written at step d-1 is standard. ✓ (v initialized 0 for k=±1 at d=0... for d=1, k=1: v[idx-1] = v[off] which was set at d=0 to 0 — that's correct value (x at k=0 after step 0). ✓ and k=-1: x = v[idx+1]=v[off]=0 ✓.)

Now, one thing: guard `if k == -d or (k != d and v[idx - 1] < v[idx + 1])` — when k == d, first subcondition k != d false → else. When k == -d handled. ✓

Also y bounds: y = x - k; with off offset fine.

Type hints: from typing not needed; use builtins.

Also the requirement mentions tuples ("=", line). Output list of tuples ✓.

Assemble final code with helper functions inside diff_lines or module-level private. Since instructions say write diff_lines, module-level helpers are fine.

One more potential perf improvement: in canon, use dict.setdefault in loop — fine.

Also for trimming when lines repeat heavily (e.g., all lines identical): prefix/suffix trimming may leave empty middle quickly. Fine.

Also should the trim loops use canonical ints? Not necessary.

Write final code.

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)

    # Trim common prefix.
    pre = 0
    limit = n if n < m else m
    while pre < limit and a[pre] == b[pre]:
        pre += 1

    # Trim common suffix.
    suf = 0
    limit2 = n - pre
    if m - pre < limit2:
        limit2 = m - pre
    while suf < limit2 and a[n - 1 - suf] == b[m - 1 - suf]:
        suf += 1

    a_mid = a[pre:n - suf]
    b_mid = b[pre:m - suf]

    # Canonical int representation for fast comparisons inside Myers.
    pool: dict[str, int] = {}
    ids_a = [pool.setdefault(line, len(pool)) for line in a_mid]
    ids_b = [pool.setdefault(line, len(pool)) for line in b_mid]

    out = ["=" items...]...
    
Wait: pool.setdefault(line, len(pool)) — evaluation of len(pool) happens each call; when line is new, assigns index = current size ✓; when present, returns stored ✓. Good.

    result = [("=", line) for line in a[:pre]]
    result.extend(_myers(ids_a, ids_b, a_mid, b_mid))
    result.extend(("=", line) for line in a[n - suf:])
    return result

Then _myers as above.

Let me double check backtrack variable naming and correctness once more with an example with repeats: a = "A B A" lines? Trust the algorithm.

Test mentally: a = [x, x], b = [x]. Trim: pre=1 (a[0]==b[0]), then suf: limit2 = min(2-1, 1-1)=0 → suf=0. a_mid=[x], b_mid=[] → _myers m==0 → [("-", x)]. Result: [("=",x), ("-",x)]. LCS = 1, "=" count = 1 ✓.

a = [1,2,3], b=[1,3]: pre=1 (a[0]==b[0], a[1]=2 vs 3 differ) wait b[1]=3 vs a[1]=2 — pre=1. suf: limit2=min(2,1)... a ids [1,2,3]; suf: a[2]==b[1] (3==3) → suf=1; then suf=1 < limit2=min(3-1,2-1)=1? limit2 = min(2, 1) = 1 → stop. a_mid = a[1:2] = [2], b_mid = b[1:1] = []. Myers → [("-",2)]. Result: =1, -2, =3 ✓ minimal.

Now check _myers general case with repeats ensuring minimality — standard Myers, yes.

Potential issue: `for d in range(max_d + 1)` with max_d = n+m could be 2*20000=40000 for the 20k case if things went wrong, and v size 2*max_d+1 = 160001 — fine memory-wise. But trace only grows until found. Fine.

Also worst-case memory if D huge with big lists — e.g., 1000 distinct vs 1000 distinct: trace ≈ 4e6 entries ✓.

But pathological: 20000 vs 20000 completely different would be O(D²)=1.6e9 — not required by the problem.

Let me also double check the backtrack reading `trace[dd]` local index = kk + dd, slice length 2dd+1 covers kk ∈ [-dd, dd]: index range [0, 2dd] ✓. And forward guard equivalence ✓.

Also check `if x == n and y == m` uses n,m of middle. ✓

I think there might be an issue with reading `v[idx+1]` at step d when k+1 > d-1... For k = d-1? k takes values -d, -d+2, ..., d-2, d. So k = d-2 → k+1 = d-1 ✓ set at step d-1. k = -d → k+1 = -d+1 ≤ d-1 ✓ set at step d-1 (or stale 0 if... -d+1 vs step d-1 range [-(d-1), d-1], -d+1 = -(d-1) ✓ included). ✓ k-1: for k = -d+2 → k-1 = -(d-1) ✓. ✓

Great. Also handle potential empty-string lines etc. — fine.

Final code. Add type hints; docstrings optional.