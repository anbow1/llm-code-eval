Implement Myers' O(ND) algorithm. Need to reconstruct edit script. Classic approach: compute D and trace via storing V arrays per D, then backtrack. For 20000 lines with D=100, storing traces is fine. For 1000 completely different lines, D up to 2000, traces of size ~D per step: memory ~ sum over d of (2d+1) ≈ D^2 = 4M ints — fine.

Also can add common prefix/suffix trimming to speed up.

Standard Myers with backtracking: keep `trace` list of V-array snapshots (use dicts or lists). Implement:

def diff_lines(a, b):
    # trim common prefix/suffix
    prefix = 0
    while prefix < min(len(a), len(b)) and a[prefix] == b[prefix]: prefix += 1
    suffix: compare from end but careful not to overlap prefix.

    a_core = a[prefix:len(a)-suffix], b_core = b[prefix:len(b)-suffix]

    Run Myers on cores. Max D = len(a_core)+len(b_core). If no solution found (shouldn't happen since D max covers), fallback.

Myers:
N=len(a_core), M=len(b_core)
max = N+M
trace = []
v = dict? Use list of size 2*max+1 indexed by k+max. Standard:

for d in range(max+1):
    trace.append(v.copy()) — copying dict each step. For completely different 1000 lines: N=M=1000, d up to 2000, each copy size up to 2d+1, total ~4M entries copy cost fine.

Actually use a dict for sparse v. Or list. Let's use dict with keys k in range(-d, d+1, 2). Backtrack:

def shortest_edit(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    v = {1: 0}
    trace = []
    for d in range(max_d + 1):
        trace.append(dict(v))
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v.get(k-1, ...) < v.get(k+1, ...)):
                x = v[k+1]
            else:
                x = v[k-1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[k] = x
            if x >= n and y >= m:
                return trace, d
    return trace, max_d

Wait careful: v.get(k+1) might not exist. Standard condition: if k == -d or (k != d and v[k-1] < v[k+1]) then x = v[k+1] else x = v[k-1]+1. When k == -d, v[k+1] exists (since at d, k+1 = -d+1 was set in previous iteration). When k == d, v[k+1] doesn't exist but branch uses v[k-1]. When k==d==0 (d=0): k==-d so x = v[k+1] = v[1]. Initialize v = {1: 0}. Good.

Backtrack:

def backtrack(trace, a, b, d):
    x, y = len(a), len(b)
    script = []
    for d in reversed(range(1, d+1)):  # actually iterate d from final down
    Standard:

x, y = n, m
for d in range(len(trace)-1, 0, -1):
    v = trace[d]  # actually trace snapshot before processing d
    k = x - y
    if k == -d or (k != d and v.get(k-1,-1) < v.get(k+1,-1)):
        prev_k = k + 1
    else:
        prev_k = k - 1
    prev_x = trace[d].get(prev_k)?? 

Hmm, trace[d] is the v state at start of iteration d (i.e., after iteration d-1). So values in trace[d] are from step d-1. Standard backtrack:

x, y = n, m
for d in range(final_d, 0, -1):
    v = trace[d]
    k = x - y
    if k == -d or (k != d and v[k-1] < v[k+1]):
        prev_k = k+1
    else:
        prev_k = k-1
    prev_x = v[prev_k]
    prev_y = prev_x - prev_k
    while x > prev_x and y > prev_y:
        script.append(("=", a[x-1]))
        x -= 1; y -= 1
    if x == prev_x:
        script.append(("+", b[y-1]))  # wait, careful: diagonal move means insertion
        y -= 1
    else:
        script.append(("-", a[x-1]))
        x -= 1

Hmm — need to check: at step d, we computed v[k] from either v[k+1] (horizontal? in Myers x is a-index; moving from (prev_x, prev_y) with same x, y+1 is insertion "+") or v[k-1]+1 (deletion "-").

If we took x = v[k+1] (prev_k = k+1): prev point (prev_x, prev_x - (k+1)); then y increases by 1: insertion from a's perspective? Point (x, y) vs (prev_x, prev_y): x same, y = prev_y+1 → we consume b line → "+". Yes.

If prev_k = k-1: prev_x = v[k-1], new x = prev_x+1, same y → consumes a line → "-".

After the loop d=0: remaining common prefix, x==y==k? At d=0, trace[0] = {1:0}. After loop, x,y may be > 0 with x==y (diagonal snake at d=0... actually snakes at earlier steps handled in loop). After loop for d down to 1, remaining x==y>0, append "=" for a[x-1] down to 1. Actually the loop handles snake before each edit step; after processing d=1 step, x,y reduce to position at d=0 point, which may be >0 (the d=0 snake), append those "="s.

Edge: prev_x = v[prev_k] — but v = trace[d] snapshot before step d, so v contains values from step d-1. Correct.

Wait, but the decision condition in backtrack should use the same v (snapshot at start of step d, i.e., v_{d-1}). Condition: k == -d? At step d we iterate k from -d to d step 2. When k == -d, we used x = v[k+1]. But also at k == d we used v[k-1]+1. Condition: if k == -d or (k != d and v[k-1] < v[k+1]). But in backtrack, k might not be in trace[d]? k = x - y where (x,y) is the endpoint at step d, so k is in {-d,...,d} parity matches. trace[d] contains v_{d-1} keys which are in {-d+1,...,d-1} with parity of d-1. k has parity of d, so k not in trace[d]; k±1 have parity d-1, so they're in trace[d] (for valid k). Good, and k-1, k+1 keys: when k==-d, k+1 = -d+1 in trace. When k==d, k-1 = d-1 in trace. When -d<k<d, both in trace. Good.

But wait: the values used in forward pass at step d for computing were from v_{d-1} which equals trace[d] snapshot? Forward: trace.append(dict(v)) at top of loop before computing — yes, trace[d] is v_{d-1}. And forward condition uses v_{d-1}. Matches.

Then after while x>prev_x... hmm, snake: from (prev_x, prev_y), diagonal moves consume equal lines. In forward pass, after choosing x start, we snake while a[x]==b[y]. In backtrack, from endpoint (x,y) we walk back diagonally to (prev_x, prev_y) appending "=", then the single edit step.

Edge case when n==0 or m==0 handled naturally? If a empty: forward loop d=0: k=0, x=v[1]=0, snake loop: x<0? x<n=0 false. v[0]=0, check x>=0 and y>=m. y=0; if m>0 not done. d=1: k=-1: k==-d → x=v[0]=0, y=1... eventually reaches. Fine.

Trim: also handle when both core lists — after trimming prefix p and suffix s, core diff. Then final script: "="*p + core_script + "="*s.

Suffix trimming: must not overlap prefix. Compute suffix on the remaining: s = 0; while s < min(len(a)-p, len(b)-p) and a[len(a)-1-s] == b[len(b)-1-s]: s += 1.

Myers returns trace with final d. If d found equals max_d... loop covers range(max_d+1) so always returns within loop? At d = max_d = n+m, k=n+m reachable, endpoint (n, m). Yes guaranteed.

But performance for two 20000-line lists differing in ~50 places: prefix/suffix trimming handles most; middle part small. Actually if edits are scattered (50 separate edit points spread out), trimming gives big prefix and suffix, middle has N,M small. Good. But worst: alternating — still Myers with D≈100 and trace snapshots: trace has D+1 snapshots each of size ~2d. Fine. Snake loops: each x,y advanced at most once overall per step... O((N+M)·D) worst but with trimming fine.

For completely different 1000-line lists: N=M≈1000, D≈2000, trace snapshots total ~4M entries. dict copies: fine. Backtracking O(D). Snake loops total O(N+M)·... each diagonal step visited once per (d,k)... worst O(ND) = 2M comparisons of strings — strings comparison cost depends, but ok.

Hmm, but dict copy each iteration of d: total elements sum_{d} 2d+1 ≈ D² = 4M — copying 4M entries across 2000 dicts, ~fine under 6s.

Alternative: store trace as lists sized 2*max_d+1, but copying 2000 lists of 4001 → 8M — also fine. Dict is fine.

Let me write final code.

def diff_lines(a, b):
    n0, m0 = len(a), len(b)
    p = 0
    while p < n0 and p < m0 and a[p] == b[p]:
        p += 1
    s = 0
    while s < n0 - p and s < m0 - p and a[n0 - 1 - s] == b[m0 - 1 - s]:
        s += 1
    ca = a[p:n0 - s]
    cb = b[p:m0 - s]
    script = [("=", a[i]) for i in range(p)]
    script.extend(_myers(ca, cb))
    script.extend(("=", a[n0 - s + i]) for i in range(s))
    return script

Wait careful: if ca/cb empty (identical lists), _myers returns [("=", x) for x in ca] essentially. Handle in _myers: if n==0 and m==0 return []. If n==0: all "+", m==0: all "-". Actually Myers handles but with trimming overlap guard, ca/cb could still be equal? If a==b entirely: p = n0 (loop: p < n0, so p stops at n0), s loop: s < n0-p = 0, so s=0. ca = a[n0:n0] = [], cb = []. Fine.

_myers:

def _myers(a, b):
    n, m = len(a), len(b)
    if n == 0:
        return [("+", line) for line in b]
    if m == 0:
        return [("-", line) for line in a]
    v = {1: 0}
    trace = []
    found_d = None
    for d in range(n + m + 1):
        trace.append(dict(v))
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
            if x >= n and y >= m:
                found_d = d
                break
        if found_d is not None:
            break
    # backtrack
    script = []
    x, y = n, m
    for d in range(found_d, 0, -1):
        vd = trace[d]
        k = x - y
        if k == -d or (k != d and vd[k - 1] < vd[k + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = vd[prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if x == prev_x:
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

Wait the final tail: after d loop ends (d=1 processed), remaining could have x != y? At d=0 the endpoint from step 0 is (x0, y0) with x0 - y0 = 0, i.e., x==y, plus the d=0 snake. But wait — backtrack loop goes down to d=1; processing d=1 gives prev point at step 0 which satisfies prev_x - prev_y = 0. After the edit step at d=1 and its snake, x==y. So the tail while loop with x>0 and y>0 works, and x==y so both decrement together. But what if x>0, y==0? Can't happen since x==y. Fine. Use while x > 0: append "=" a[x-1] both.

Hmm one subtlety: in backtrack, when x == prev_x we emit "+": but must verify this matches forward direction. Forward: prev_k = k+1 case: prev point (v[k+1], v[k+1]-(k+1)), then edit consumes one b line: y' = prev_y + 1, x' = prev_x. Then snake. Backward: from (x,y), walk snake back to (prev_x, prev_y) where prev_x = x_after_edit... yes x==prev_x means the edit was vertical (b consumed) → "+". If x > prev_x... hmm, after walking back snake, x >= prev_x and y >= prev_y, with exactly one of the increments being 1. If x == prev_x: "+". Else "-". Correct.

But also need to make sure the condition vd[k-1] < vd[k+1] uses keys that exist. As argued, k±1 exist in vd = trace[d] (= v_{d-1}) for all k in the forward iteration range at step d with parity d. In backtrack, k = x - y at endpoint of step d, which was visited. Good.

One more subtlety: when found_d == 0 (identical cores — but after trimming cores can't be identical unless both empty, which we handle). Actually if cores are nonempty and identical... trimming prevents: after prefix trim, either a[p] != b[p] or one exhausted; after suffix trim similarly. If a[p]!=b[p], cores not identical. So found_d >= 1 when both nonempty. But even if found_d==0, the backtrack loop range(0,0,-1) is empty, tail loop handles it. Safe anyway.

Also note condition k != d: at step d in forward, when k == d, v[k+1] doesn't exist (key from step d-1 has max d-1). Condition handles it. In backtrack similarly k could equal d, then we go prev_k = k-1 (since k==d not == -d unless d==0, and k != d fails). Good.

Performance concern: trace storing dicts — for the 1000-different case: d up to 2000, trace has 2001 dicts, total entries sum_{d=0}^{2000}(number of keys in v_{d}) ≈ sum 2d+1... actually v_{d-1} has ~d keys. Total ~2M entries. dict(v) copy of average 1000 entries × 2000 times = 2M — fast (<1s). Snake while loops: string comparisons; completely different lists — each snake at each (d,k) does O(1) failing comparison, total D²/2 = 2M comparisons of unequal strings — string eq check fast (length check first mostly). Fine.

But wait: worst case in forward loop, for the 20000-with-50-diffs case: trimming reduces to small cores only if diffs are contiguous chunks at ends. If diffs scattered, e.g., a has 50 lines inserted at 50 random spots — prefix trim stops at first difference, suffix at last. Middle could be ~20000 lines with D≈100. Then Myers O((N+M)·D) snake work: each (d,k) pair does snake walk; total work is bounded by O((N+M)·D) = 20000·100·2 = 4M snake steps — each step a string comparison + increments. ~4M operations in Python ≈ 2-4s... hmm, might be tight. Actually the standard bound: total snake extension work across the whole algorithm is O((N+M)·D) worst case, but typically much less. In practice for scattered diffs, snakes are short. The O(ND) worst case arises adversarially. With 50 scattered edits, each k iteration does at most a few snake steps beyond... Actually no — snake can be long only where there are long common runs at that diagonal. Hmm, worst case: a = X·c, b = c·X type patterns. For the given problem statement (differ in ~50 places), it's fine. Total dict copies: trace D+1 snapshots, small dicts (≤101 keys). Fine.

Actually there's a subtle inefficiency: trace.append(dict(v)) copies before each d; fine.

Alternative optimization: instead of copying dicts, store only the final v and backtrack using stored... you need history. Another approach: store per-d the k chosen... but need v history anyway. Fine as is.

Let me also consider: could use lists with offset for v to be faster. dict is fine.

Double-check backtrack tail when found_d >= 1: after processing d=1, we have position at step-0 endpoint. Step-0: k=0, x=v[1]=0, snake from (0,0). So prev point is (0,0) plus snake. But backtrack loop for d=1: vd = trace[1] = v_0 = {1: 0}. k = x - y = 0 (endpoint of step 1 has parity 1... wait endpoint at end of step d=1 has k odd. Hmm.

Let me re-examine: the endpoint (x, y) = (n, m) has k = n - m, which may be any parity. The loop: for d from found_d down: at iteration d, k = x - y where (x,y) is the endpoint reached at step d. Endpoint at step d lies on diagonal k with parity d... yes, since it's reached via d diagonal+vertical moves. And found_d is the d at which we reached (n,m), so k=n-m has parity found_d. Then each iteration d reduces to endpoint of step d-1 with parity d-1. Consistent. Good.

But careful in forward loop: the loop `for k in range(-d, d+1, 2)` — k parity matches d. Endpoints at step d on diagonals with parity d. Yes.

Also: after break in forward loop, `found_d` set. Good.

Edge: what if in forward loop the break happens but trace length = d+1; backtrack uses trace[d] for d in range(found_d, 0, -1) — indices 1..found_d, all exist (trace indices 0..found_d). trace[d] = v_{d-1}. Good.

Now verify correctness condition: "=" + "-" items in order give a. Script order: prefix "="s, then core script (reversed backtrack), then suffix "="s. Core script from backtrack reversed gives forward-order edits. Fine.

Check minimality: Myers gives LCS-length = (n+m-D)/2... number of "=" = LCS of cores plus prefix+suffix. Trim is safe: LCS(a,b) = p + LCS(cores) + s. Standard result. Fine.

One more check on trim overlap: while loops guard s < n0 - p and s < m0 - p, so suffix lines don't overlap prefix. If a==b: p=n0, then s=0. If a = "x","x" and b = "x": p=1 (p<n0=2, p<m0=1 fails at p=1). s: s < n0-p=1, s < m0-p=0 → s=0. ca=["x"], cb=[] → "-" x. Script: "=" x, "-" x → "=" and "-" give ["x","x"]=a ✓; "=" and "+" give ["x"]=b ✓. LCS count 1, maximal ✓.

Write final answer.