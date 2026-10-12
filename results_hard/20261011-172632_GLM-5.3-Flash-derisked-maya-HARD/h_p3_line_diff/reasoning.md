Need to implement Myers diff producing line-level edit script with maximal LCS. Performance requirements: 20,000 lines differing in ~50 places — Myers O(ND) fine. Two completely different lists of 1000 lines: D ~ 2000, N+M ~ 2000, so O(ND) ~ 4 million — fine.

Implement Myers with linear space refinement? Simpler: use the classic O(ND) with backtracking storing V arrays per D. Memory: D up to ~2000, V arrays of size 2D+1... fine.

Standard approach: compute LCS via Myers, then walk to produce script. Actually the simplest: recursive/iterative divide-and-conquer (linear space Myers), or store all V per D-step and backtrack. With D=2000 and V arrays of 4001 ints per step, 2000 steps × 4001 ints ≈ 8M ints — memory heavy but OK? Each int ~28 bytes in list of Python ints... 8M * 8 bytes pointer + small ints cached (ints up to 2000 are... not cached beyond 256, but V stores x values up to 2000, each int object ~28 bytes; 8M distinct-ish? ints are shared if same value? No, each computed int is new object). 8M * ~36 bytes ≈ 300MB. Risky. But D=2000 only for the 1000-line completely-different case: N+M=2000, D max = 2000, so 2000 steps, each V list of 2*2000+1=4001. Total ~8M entries... hmm ~300MB. Might be too much. Better use linear-space divide and conquer (find middle snake, recurse). That's the standard "linear space Myers" with find_mid_snake.

Alternatively, trim common prefix/suffix first, and use the O(ND) with backtrace but only store... Let's just implement linear-space Myers recursion.

Implementation:

def diff_lines(a, b):
    # trim prefix/suffix
    # then _diff(a, b, offset...) building ops list.

Plan: produce ops list of ("="|"-"|"+", line). Use recursion on (a_start, a_end, b_start, b_end).

def _myers(a, ax, ay... let's write:

def diff_lines(a, b):
    ops = []
    # common prefix
    i = 0
    while i < len(a) and i < len(b) and a[i] == b[i]:
        ops.append(("=", a[i])); i += 1
    # common suffix
    j = 0
    while j < len(a) - i and j < len(b) - i and a[len(a)-1-j] == b[len(b)-1-j]:
        j += 1
    # now recurse on a[i:len(a)-j], b[i:len(b)-j]
    ops.extend(_diff_core(a[i:len(a)-j], b[i:len(b)-j]))
    # wait, suffix appending handled inside core? core produces full script for the middle. Then done.

Actually core produces full ops for the middle slices; the suffix "=" ops need appending after. Let me structure:

prefix ops, then core on middles, then suffix ops appended.

Wait but "=" items order: prefix "=" then middle then suffix "=" — matches both a and b since prefix/suffix match.

Hmm, careful: if a is prefix of b, suffix trimming might overlap; handled by the loop conditions.

_diff_core(a, b): if not a: return [("+", x) for x in b]; if not b: return [("-", x) for x in a]. If len both >=1: find middle snake (Myers). If D <= 1... Actually the standard: run forward and backward one-direction D-paths to find a middle snake; recurse. Simpler variant: run the full O(ND) forward algorithm only to compute the D where it reaches the end, but use the "find middle snake" for splitting.

Standard linear-space algorithm (from Myers paper):

def _diff(a, a0, a1, b, b0, b1, ops):
    # handle empties
    ...

Let me write find_middle_snake:

def _middle_snake(a, b):
    N, M = len(a), len(b)
    max = N + M
    delta = N - M
    odd = delta % 2 != 0
    Vf = {1: 0}  # or arrays indexed by k+offset
    Vb = {delta-1: ...} hmm.

Use dict-based or list with offset. Let me use lists: size 2*max+1, offset = max.

vf = [0]*(2*max+2); vb = [0]*(2*max+2)

for d in range(0, max//2 + 2):
    # forward
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and vf[k-1+offset] < vf[k+1+offset]):
            x = vf[k+1+offset]
        else:
            x = vf[k-1+offset] + 1
        y = x - k
        x0, y0 = x, y
        while x < N and y < M and a[x] == b[y]:
            x += 1; y += 1
        vf[k+offset] = x
        if not odd and (k - delta) in range(-(d-1)... : check overlap: if - (d-1) <= k - delta <= d-1 (step irrelevant) and vb[(k-delta)+offset]... backward V stores furthest reach from bottom: vb[k+offset] = number of... Let me store backward as x-coordinates too: furthest D-path from (N,M) going backwards reaches point with x-coordinate vb[k+offset] measured from start? Standard: vb[k] gives the x value such that the backward path reaches (x, x-k). Condition: vf[k] + vb[delta - k] >= N, i.e., overlap when x_forward >= N - x_backward... Let me use the formulation from Myers' paper:

Forward: furthest path from (0,0) in k-diagonal reaches x = vf[k]. Backward: furthest path from (N,M) reaches x = N - vb[k'] where vb measured... I'll implement carefully.

Let me use the well-known implementation (e.g., from "The Myers diff algorithm" linear space, as in the paper's pseudocode):

MAX = N + M
D_MAX = (MAX + 1) // 2  # ceil

V arrays with offset.

for d in range(D_MAX + 1):
    # forward step
    for k in range(-d, d + 1, 2):
        if k == -d or (k != d and vf[off + k - 1] < vf[off + k + 1]):
            x = vf[off + k + 1]
        else:
            x = vf[off + k - 1] + 1
        y = x - k
        while x < N and y < M and a[x] == b[y]:
            x += 1; y += 1
        vf[off + k] = x
        if delta is odd... For forward, overlap check only when d-parity matches: if not odd (delta even), check k in [-d, d] with k ≡ d (mod 2) — it is. Overlap when vf[k] >= N - vb[delta - k]... hmm need backward V indexed by delta - k. But backward at step d' covers diagonals k' = delta - k with k' in [delta-d', delta+d']. Condition from paper: "if not odd and k in [delta - (d-1), delta + (d-1)]" — wait paper: overlap found when vf[k] + vb[k] ... Let me just use the formulation where backward stores x measured from the start on diagonal k (i.e., the x coordinate), so backward furthest path on diagonal k reaches (xb, xb - k) where xb = N - vb_raw... Simpler: store backward as the x coordinate directly.

Backward: for d' steps, for k' = delta - d' ... delta + d' step 2:
    if k' == delta + d' or (k' != delta - d' and vb[k'+1] < vb... hmm need care: moving backward, x decreases. Standard: 

    for k in range(delta - d, delta + d + 1, 2)? Actually backward diagonals are the same k. Let me define vb[k] = x-coordinate of furthest reachable point from (N,M) along diagonal k after d' inverse D-steps (d' = number of steps, path length d'). Initialize vb[k] = ... at d'=0, only k=delta, point (N, M) so vb[delta] = N? But we need "before first step" states. Standard trick: vb[k'] initialized such that at d'=0, vb[delta]... hmm, many implementations do: for the backward pass with d steps, vb[delta - d - something]... 

Let me instead use a cleaner known implementation. There's the well-known one from "Myers diff" in various repos. Let me recall the pseudocode from Myers' paper (Figure: Linear space):

Δ = (N - M)
odd = Δ % 2
for D in 0..ceil((N+M)/2):
    # forward
    for k in -D..D step 2:
        # find end of furthest forward D-path ending at diagonal k
        if k == -D or (k != D and Vf[k-1] < Vf[k+1]): x = Vf[k+1]
        else: x = Vf[k-1]+1
        y = x - k
        # remember snake start
        while x < N and y < M and a[x]==b[y]: x+=1, y+=1
        Vf[k] = x
        if odd and k in [Δ-(D-1), Δ+(D-1)]:
            if Vf[k] >= Vb[k]:  # overlap
                # last snake of forward path is Vb[k]..Vf[k] on diag k... 
                return snake
    # backward
    for k in -D..D step 2:
        kk = k + Δ
        if kk == Δ+D or (kk != Δ-D and Vb[kk-1]... hmm.

Actually paper: backward step uses Vb indexed by k+Δ, and conditions: if kk == Δ+D or (kk != Δ-D and Vb[kk-1] < Vb[kk+1])? Hmm. The paper (Myers 1986, "An O(ND) Difference Algorithm"): 

Backward:
for k in range(-D, D+1, 2)? No — paper does for k = -D..D step 2 with kk = k + Δ:
    if kk == Δ+D or (kk != Δ-D and Vb[kk+1] <= Vb[kk-1])? I need to get direction right.

Let me derive from scratch instead, carefully.

Backward paths go from (N, M) to (0,0), moving with steps: delete: (x-1, y) i.e., move left; insert: (x, y-1) move up; and diagonal snakes stay. Define for a d-path backwards, furthest reaching point (smallest x+y? or we track x). Track furthest = smallest (x + y)? Equivalent to smallest x+y; on diagonal k, y = x - k, so x+y = 2x - k; smallest x+y ⟺ smallest x. So track minimum x on each diagonal.

Backward recursion: to reach diagonal kk with d inverse steps, come from diagonal kk±1 with d-1 steps. Moving left (deletion of a[x-1]) from diagonal k+1 point (x', y') goes to (x'-1, y') on diagonal k? (x'-1) - y' = k+1 - 1 = k. Yes. So backward from diagonal kk: candidates: take from diagonal kk+1 a point (x1, y1) with y1 = x1 - (kk+1), move to (x1 - 1, y1) on diagonal kk. Or from diagonal kk-1 point (x0, y0), y0 = x0 - (kk-1), move up to (x0, y0 - 1) on diagonal kk.

We want minimum x on diagonal kk. Initialize at d=0: only diagonal kk = Δ reachable at (N, M): vb[Δ] = N? But we need a base for the recursion similar to forward's V[1]=0 initialization. Standard approach: maintain vb such that vb[k] is the min-x after d steps; to handle edges, sentinel values: for k outside reachable range, set to large (for forward: Vf beyond boundaries set to -1 or use V[1]=0 trick). The classic trick uses V[1] = 0 with V initialized to 0 and works because of boundary conditions with the condition "k == -D or (k != D and Vf[k-1] < Vf[k+1])".

Rather than deriving, let me use a well-tested structure: implement the linear-space version via a different, simpler and robust approach: compute the LCS length matrix lazily? No — performance.

Alternative robust approach: Use the simple O(ND) forward algorithm storing V snapshots, but bound memory by only storing snapshots... The memory concern: worst case completely different 1000 vs 1000 lines → D=1000? Wait: if completely different (no common lines), D = N+M = 2000. Number of forward steps d = 0..1000? No — the algorithm needs d up to D/2? In the simple forward-only algorithm, d goes 0..D where D = N+M when no matches... Actually forward-only: D path length = number of non-diagonal moves = deletions+insertions = 2000. d ranges 0..2000, each V list size 2*2000+1=4001 → 8M ints. Too much? Actually each V snapshot is a list of 4001 slots, mostly unused (only d+1 entries touched). But list allocation is 4001 pointers = 32KB each; 2001 snapshots = 64MB pointers plus int objects. int objects for x values: each snapshot stores up to d+1 new ints; total ~2M new ints ≈ 60MB+. Total maybe 150-250MB. Hmm, might pass but risky, and slow-ish.

Better: combine trimming: trim common prefix/suffix first. For the "completely different 1000 lines" case, maybe they share some lines? "completely different" — assume none common. D=2000.

Alternatively: use the linear-space divide and conquer — the standard solution. Let me carefully implement find-middle-snake with correct backward pass. I'll derive it fully.

Definitions: a[0..N), b[0..M). Diagonal k: points with x - y = k.

Forward V_f[k] = largest x such that (x, x-k) is endpoint of a furthest forward D-path from (0,0) reaching diagonal k, where D is current step count. Standard recurrence with sentinel: allocate Vf of size 2*MAX+3, offset such that index k+off valid; initialize all to 0. The trick V[1] = 0 handles the d=0 case: at d=0, k=0: condition k == -d (0 == -0) true → x = Vf[1] = 0. Good. For k = d > -d: x = Vf[k-1] + 1; at d=1, k=1: k != -d, and k == d → x = Vf[0] + 1 = 1. Hmm, that means on diagonal 1, furthest path with 1 step: one insert-move (right, (0,0)->(0,1) is... wait forward moves: insert: (x, y+1)? Convention: forward paths from (0,0), x steps in a, y steps in b. Delete a-line: move (x+1, y). Insert b-line: move (x, y+1). Diagonal k = x - y. From (0,0), diagonal 0. One step: delete → (1, 0), diagonal 1; insert → (0, 1), diagonal -1. Furthest on diagonal 1 with d=1: x=1 (then snake). Vf[1] should be ≥ 1. With x = Vf[0]+1 = 0+1 = 1 ✓. Then snake extension. But Vf[0] was modified by the d=0 step (it's the furthest at d=0 after snakes, fine, but for d=1 k=1 we need "came from diagonal 0 at d=0 then delete step" — that's Vf[0]+1 where Vf[0] is d=0 value. But we already overwrote Vf[0] at d=0 with final d=0 value — which is exactly what we want (furthest d=0 path). Then overwriting Vf[k] in decreasing k order: at d, we iterate k from -d to d step 2; when computing k, we read Vf[k-1] (value from d-1, since k-1 not yet updated this round when going in increasing order? k-1 was updated at round d-1; in round d we go k = -d, -d+2, ..., so when at k, index k-1 was last updated at round d-1 (since k-1 has parity d-1). ✓. Index k+1: parity d+1, last updated at round d-1 too. ✓. Good, classic in-place update works.

For the base cases: at k = -d, we must come from diagonal -(d-1) via insert: x = Vf[k+1] (x from diagonal k+1 at round d-1, y = x - k = (x_{k+1} - (k+1)) + 1 ✓). At k = d: come from d-1 via delete: x = Vf[k-1] + 1. These are exactly the conditions. For 0 < |k| < d, choose whichever gives larger x: if Vf[k-1] < Vf[k+1] then come from k+1 (insert) giving x = Vf[k+1], else x = Vf[k-1] + 1. Wait check: from k+1 via insert → x stays = Vf[k+1]. From k-1 via delete → x = Vf[k-1] + 1. Choose max. Condition "Vf[k-1] < Vf[k+1]" picks insert. ✓.

Backward pass: track V_b[k] = smallest x endpoint of furthest backward d-path from (N, M) on diagonal k. Backward moves: from (x, y): delete (a-line a[x] unmatched? going backwards) — move to (x-1, y) [this corresponds to a delete of a[x-1]... in forward terms it's a delete step]; insert: (x, y-1). Both reduce x or y. Furthest backward = minimal x+y? On diagonal k, minimal x. 

Recurrence for d steps: diagonal kk = Δ + k? Let's index backward diagonals by their actual k = x - y. Start: (N, M), diagonal Δ, at d=0. After d backward steps, reachable diagonals: Δ - d .. Δ + d. From diagonal k at d, we came from diagonal k+1 at d-1 via move-left: point (x1, y1) on k+1 → (x1 - 1, y1) on k; or from k-1 via move-up: (x0, y0) → (x0, y0 - 1), x unchanged = x0.

We want minimal x on diagonal k. Candidates: x = V_b[k+1] - 1 (from k+1, move left) or x = V_b[k-1] (from k-1, move up). Choose minimum.

Base cases: at k = Δ + d (rightmost), must come from k-1: x = V_b[k-1]. At k = Δ - d: must come from k+1: x = V_b[k+1] - 1. Initialization: V_b array initialized to N (so that V_b[k+1] - 1 at boundaries... let's handle bases explicitly like forward).

Hmm, but there's a subtlety: snakes. Backward snake: from (x, y), while x > 0 and y > 0 and a[x-1] == b[y-1]: x -= 1, y -= 1.

Initialize: at d=0, k=Δ: V_b[Δ] = N after snake extension backward: x=N, y=M; snake: while x>0 and y>0 and a[x-1]==b[y-1]: decrement. Then V_b[Δ] = x.

Hmm wait, but for d=0 we need V_b[Δ] after maximal snake from (N,M). Yes.

But also for the recursion base at k = Δ + d: "must come from k-1: x = V_b[k-1]" — moving up from (x0, y0) on k-1 to (x0, y0 - 1): x stays x0. Then snake extension backward from (x0, y0-1): while x>0 and y>0 and a[x-1]==b[y-1]... 

Wait, careful: the snake extension and the step interleaving. In forward Myers, each step is: move (non-diagonal) then snake (diagonal). The stored V values are after the snake. So recurrence reads previous-round values (after their snakes) applies one move then extends snake. ✓ same for backward.

Base initialization for backward: we need V_b[k] for round d computed from round d-1 values. For d=0: V_b[Δ] set as described. But actually we should also, before the loop, handle the initial snake from (N,M): V_b[Δ] = snake(N, M).x. Then loop d from 1: for k from Δ+d down to Δ-d step -2 (order matters: we read k±1 which must be round d-1 values; going downward, k+1 was updated this round (parity Δ+d-... let's see: k has parity of Δ+d... iterating k = Δ+d, Δ+d-2, ...: when processing k, k+1 was processed already this round (if k < Δ+d) — that's a round-d value, but we need round d-1 values for k±1! k+1 has parity (Δ+d+1) ≡ (Δ + (d-1)) mod 2, so k+1 was last updated in round d-1 only if we haven't touched it in round d. In round d, we process k with parity ≡ Δ+d (mod 2). k+1 has different parity → not touched this round. ✓ Similarly k-1 untouched. So any order works; in-place is fine.

Bases: k = Δ + d: can't come from k+1 (not reachable in d-1 steps? diagonal Δ+d+1 needs d+1... wait moving left from k+1 reduces... reachable diagonals at round d-1 are Δ-(d-1)..Δ+(d-1). k = Δ+d is outside, so must come from k-1 (move up: from (x0,y0) on k-1 to (x0, y0-1) on k). x = V_b[k-1]. Then snake. ✓. k = Δ - d: must come from k+1: x = V_b[k+1] - 1, then snake.

For middle: choose min(V_b[k+1] - 1, V_b[k-1]).

Overlap detection: forward path at round d_f on diagonal k reaches V_f[k]; backward path at round d_b on diagonal k reaches V_b[k] (min x). They overlap (meet) when V_f[k] >= V_b[k]. Total path length = d_f + d_b. The middle snake is the segment on diagonal k from (V_b[k], V_b[k]-k) to (V_f[k], V_f[k]-k)? Actually the meeting snake: the overlap region. Standard: when odd(Δ) — check overlap in the backward pass against forward values from round d-1 (since forward has done d_f = ceil(Δ/2)... ) Hmm, the paper: if Δ is odd, overlap check happens in the forward pass at step d, comparing V_f[k] with V_b[k] where backward has run d-1 steps... Let me not replicate paper's parity bookkeeping exactly; instead do a simpler robust approach:

Run forward and backward passes in lockstep: for d = 0, 1, 2, ...:
  - forward step d (compute Vf for round d), check all k in forward range: if V_f[k] >= V_b_current[k] for some k where backward round ≤ d has been computed... Since backward round d computes diagonals Δ-d..Δ+d, and forward round d computes -d..d. Overlap possible when ranges intersect: need d ≥ |Δ|/2 roughly.

Simplest correct approach: after computing forward round d, check overlap: for each k in [-d, d]: if k within backward range computed so far (i.e., backward has been run for rounds 0..d_prev) and V_f[k] >= V_b[k]: found meeting point at (V_f... hmm, but need to ensure total path is ≤ final D and it's a valid middle snake. The standard result (Myers): a middle snake exists with total path length = D (optimal), and you find it by running forward and backward each up to ceil(D/2) steps. If you check overlaps correctly, the first overlap found gives a middle snake of a path of length D.

Known correct scheme (from Myers' paper pseudocode):

If Δ is odd:
  Only check overlaps during the forward pass, at step d = ceil(Δ/2)... hmm no. Paper: "If Δ is odd, find the overlap in the forward pass when d = ceil(Δ/2)? " Let me recall the actual paper pseudocode (Figure 4? in "An O(ND) Difference Algorithm and Its Variations"):

Basic algorithm with Δ = N - M:
For D = 0 to ceil((M+N)/2):
  (a) Forward: for k = -D..D step 2: compute Vf[k]. If Δ is odd and k in [Δ - (D-1), Δ + (D-1)]: if Vf[k] >= Vb[k]: answer: middle snake found, D_total = 2D - 1.
  (b) If Δ even and D' = ... Backward: for k = -D..D step 2: kk = k + Δ; compute Vb[kk]. If Δ even and kk in [-D, D]... : if Vb[kk] <= Vf[kk]: answer with D_total = 2D.

Hmm, the paper's Vb is indexed differently. In the paper, backward is on diagonals indexed by k (same as forward) but I think they index Vb by k too, with the backward starting diagonal being Δ. The pseudocode from the paper (I recall):

for D := 0 to ceil((M+N)/2) do
  (1) for k := -D to D in steps of 2 do
        (a) find the end of the furthest reaching forward D-path ... V[k]
        (b) if Δ is odd then
              if k is in [Δ-(D-1), Δ+(D-1)] and V[k] >= Vb[k] then accept middle snake...
  (2) for k := -D to D in steps of 2 do
        (a) kk := k + Δ
            find the end of the furthest reaching reverse (D)-path ... Vb[kk]
        (b) if Δ is even then
              if kk is in [-D, D] and Vb[kk] <= Vf[kk] then accept ...

Hmm, but Vb indexed by kk = k + Δ where k ranges -D..D means kk ranges Δ-D..Δ+D — actual diagonals. And forward V indexed by k in -D..D. Overlap condition: Vb[kk] <= Vf[kk] where both indexed by actual diagonal. In (2b), kk in [-D, D] — checking against forward values from the current round's Vf? But forward round D was just computed in (1). Hmm, actually the paper's condition uses Vf from the same D loop iteration — forward pass (1) runs first, computing Vf for round D on diagonals -D..D. Then backward pass (2) computes Vb for round D on diagonals Δ-D..Δ+D; overlap check only for kk in [-D, D], where Vf[kk] exists (from round D, just computed). Hmm, but does using forward round D (not D-1) give correct total? If Δ even: forward D-path on diagonal kk ends at Vf[kk]; backward D-path ends at Vb[kk]; if Vf[kk] >= Vb[kk], they overlap, and combined path length = D + D = 2D? Hmm, but is that the optimal middle snake? The paper claims the algorithm finds the middle snake of an optimal path. There's subtlety: using Vf from round D (rather than D-1) — the paper indeed uses the current round. Actually I recall the paper's condition in (2b) is kk in [-(D) , D]... Let me think about correctness: We want a snake that lies on some optimal (D-total) path. If Δ even, D_total (the answer) is even? Δ = N - M = (deletions - insertions) = D_f - D_i where D_total = D_f + D_i. So D_total ≡ Δ (mod 2). So if Δ even, D_total even, and the middle snake splits the path into two halves of length D_total/2 each: forward half is a D_total/2-path, backward half reverse of D_total/2-path. So it suffices to run both passes to d = D_total/2 and detect overlap: forward d-path reaching x_f on diagonal k, backward d-path reaching x_b on diagonal k with x_f >= x_b means the forward path can be extended along the diagonal to reach the backward path's endpoint → combined path length 2d ≤ ... but must equal D_total? If overlap found at d = D_total/2 exactly. But we might detect overlap earlier at smaller d — that would give a combined path of length 2d which is ≤ D_total, contradicting optimality unless 2d = D_total... Actually overlap at forward-d and backward-d means there's a path of length 2d from (0,0) to (N,M)? Forward d-path ends at (xf, xf-k); backward d-path (reversed) starts at (xb, xb-k) with xb <= xf, ends at (N,M). Connect along diagonal: total = 2d. If 2d < D_total, contradiction with D_total optimal. But could we detect overlap at d < D_total/2 spuriously? Overlap means xf >= xb, and the combined path length is exactly 2d (d moves + d moves... wait, forward d-path has d non-diagonal moves; backward d-path has d; connecting along diagonal adds 0). So 2d ≤ D_total. If overlap detected at d, then D_total ≤ 2d. Since we scan d increasing, first detection at d gives 2d = ... we can't have 2d < D_total since D_total is min. So 2d = D_total? Not necessarily: overlap at d with 2d ≤ D_total and D_total ≤ 2d → 2d = D_total. But wait, D_total is unknown; we run passes incrementally. If overlap is detected at round d in either pass, then D_total ≤ 2d (or 2d-1 for odd case). We accept it as the middle snake. Fine — but is the snake found this way guaranteed to split into optimal halves? Since combined path length is 2d and ≥ D_total, and D_total ≤ 2d... equality. And the forward half is a d-path (optimal? it's a path of length d reaching that point — fine, any d-path works since total is optimal). Hmm, but for linear-space correctness we just need: the snake lies on SOME optimal path, and the recursion splits into (prefix problem, snake, suffix problem). Actually the requirement is that the total edit distance = d_f + d_b where the prefix is solved optimally with distance ≤ d_f and suffix ≤ d_b, and the snake is on an optimal path. If combined path length 2d equals D_total, then the snake is on an optimal path, and prefix/suffix subproblems have optimal distances exactly d each (since any better would beat D_total). ✓.

But subtlety: when we detect overlap in the forward pass at round d using backward values from round d-1 (odd Δ case): combined length = d + (d-1) = 2d - 1. And parity: Δ odd → D_total odd. If overlap detected at forward round d with backward round d-1: total 2d-1, and D_total ≤ 2d-1, and by parity D_total is odd ≤ 2d-1... could D_total < 2d-1? Only if overlap would have been detected earlier. Since we check every round, first detection gives D_total = 2d-1. Hmm, but the checks must be exhaustive enough. The paper proves this works. Let me just trust the paper's structure but I must get the details right, especially which Vf round is compared in the even case.

Actually, let me reconsider: maybe simpler to implement the O(ND) space-optimized-with-snapshots but with trimming and the observation that the memory is bounded by D and N+M. For the given constraints (20k lines, 50 diffs → D ≈ 100, trivial; 1000 vs 1000 completely different → D = 2000, N+M = 2000): snapshots approach: d from 0 to 2000, each snapshot list of size (2*(N+M)+1) = 4001 → 2001 * 4001 * 8 bytes ≈ 64 MB for pointers, plus int objects: total ints stored ≈ sum over d of (d+1) ≈ 2M ints × 28 bytes ≈ 56 MB. ~120-150MB. Time: filling 8M list slots ≈ fine, snake extensions: each snake step is a Python-level loop comparing strings — total snake work bounded by O(N+M + D·?)... total snake length across all d is O(N + M + D²)? No — total diagonal moves across all rounds is bounded by... each round's snakes are disjoint? Not necessarily, but standard bound: O(D² )? Hmm, in Myers the total work is O((N+M)·D) worst case because snakes can overlap across rounds. With N+M = 2000, D = 2000: worst 4M operations — okay in Python? 4M iterations of a while loop ≈ 1-2 seconds. Borderline but the 6-second budget helps.

Hmm, but actually for the completely-different case: no common lines at all means no snakes at all (every diagonal move requires a[x]==b[y])! So snakes are empty; the inner loops are trivial. The cost is the round loop: d up to 2000, each round iterating ~d k-values with cheap ops: total ~2M operations. Fine.

And the 20k/50-diff case: D ≈ 100 (50 changes → ~100 edits), rounds 100, each round ~100 k-values = 10k ops, snakes: total snake length O(N+M) per round? No—snake extension per (d, k) is bounded but overall bounded by O((N+M)·D)? With trimming, most snakes are length 0 except near the diff region... Actually no: snakes can be long. Hmm, in the 20k case with 50 diffs, D~100, N+M~40k. Worst-case O(ND) = 40k * 100 = 4M — but typical is much less. Actually with trimming prefix/suffix, remaining is small (~100 lines each side), so it's trivial. Good: trimming makes case 1 fast regardless.

So the plan: trim prefix and suffix, then run Myers on the middle. With trimming, the middle for case 1 is small. For case 2 (completely different), no trimming helps, D = 2000.

Now, snapshots vs linear-space recursion: For case 2, D=2000, snapshots memory ~150MB — probably acceptable but let's just do linear-space to be safe? Linear-space adds complexity and bug risk. Alternatively, reduce snapshot memory: store V snapshots as arrays only of the touched range? Or note that for backtracking we don't need full snapshots if we use the divide-and-conquer.

Alternative simpler correct approach for reconstruction: compute D with forward-only algorithm (O(ND) time, O(D) space), then reconstruct via recursive "find midpoint" using forward and backward passes (i.e., the linear-space method anyway).

Hmm. Or: since D ≤ N+M and memory concern arises only when D is large relative to... snapshots: memory O(D²) for V values + O((N+M)·D) for lists. For case 2: D=N+M=2000 → 150MB. Risky but likely OK. For pathological larger inputs it'd blow up, but constraints only require those two cases. Still, I'd rather do it right: linear-space divide and conquer. Let me implement it carefully; I've derived the recurrences above. Let me now also derive the paper's exact overlap conditions to be safe, or just use my derived approach with both passes run in lockstep and check overlaps appropriately.

My derived approach: 
- Δ = N - M.
- Run for d = 0, 1, 2, ...:
  - Forward round d: diagonals -d..d (parity of d). Compute Vf[k] for k in that range.
  - Check forward overlap: for k in forward range of round d where backward values exist (backward has run rounds 0..d or d-1): overlap iff Vf[k] >= Vb[k]. But which backward round do we have available? If we run forward first then backward each iteration, during forward round d we have backward up to round d-1. Overlap check: k must be in backward's computed range: |Δ - k|... backward round r covers diagonals Δ-r..Δ+r. After running backward rounds 0..d-1, available diagonals: Δ-(d-1)..Δ+(d-1). So check for k in [-d, d] with k in [Δ-(d-1), Δ+(d-1)]: if Vf[k] >= Vb[k]: found, total = d + (d-1).
  
  Hmm wait — but is checking only against backward round d-1 sufficient? Could the optimal middle snake require forward round d meeting backward round d' with d' < d-1? If forward d-path and backward d'-path overlap with d + d' = D_total, then... we check each round; if D_total = d + d' with d' ≤ d-1, then consider backward round d-1: does backward have a (d-1)-path on diagonal k? Backward paths: a d'-path on diagonal k can be extended to a (d-1)-path on diagonal k? Not necessarily staying on diagonal k... Hmm, a backward path of length d' ending on diagonal k — we can extend it with extra moves that go out and come back? Moves change diagonal by ±1, so to return to diagonal k you need pairs of moves; a (d')-path ending on k extends to a (d'+2)-path ending on k (out and back), not (d'+1). So overlap with backward round exactly d-1 requires d' ∈ {d-1, d-3, ...}. Hmm, so checking only round d-1 might miss D_total = d + (d-3)? But wait, we would have detected that at an earlier round: at forward round d-1 with backward round d-3: total (d-1)+(d-3) = d+d'-2... no wait D_total = d + d'. If d' ≤ d - 2, then at forward round d' + d''... Let me think: we want first detection. Suppose optimal D_total = d_f + d_b with d_b ≤ d_f - 2 (d_f ≥ d_b + 2). Consider forward round d_f - 1: is there overlap with backward round d_b? Check condition at round (d_f - 1): k in forward range [-(d_f-1), d_f-1] — k is in forward range of round d_f; is it in range of round d_f - 1? k parity: forward round r covers diagonals ≡ r (mod 2). k ≡ d_f (mod 2) ≢ d_f - 1. So diagonal k isn't even computed at forward round d_f - 1. Hmm. But is there an optimal-path-related overlap detectable earlier? 

The paper's scheme handles this via parity: D_total ≡ Δ (mod 2), and the paper checks in forward pass only when Δ odd (comparing with backward round D-1), and in backward pass only when Δ even (comparing with forward round D... or D-1?). This parity reasoning ensures the halves are balanced. Let me reconsider: the middle snake of an optimal path splits it into two paths of lengths d1 and d2 with d1 + d2 = D_total, and the paper chooses the *middle* snake such that |d1 - d2| ≤ 1? No — the middle snake is chosen as any snake on the optimal path such that the split lengths d1, d2 satisfy d1, d2 ≤ ceil(D_total/2)? The paper's Lemma: there exist optimal paths with a snake such that the forward part is a d-path and backward part a d-path where... The paper's theorem: the algorithm finds a middle snake with the property that forward part has length ≤ ceil(D/2) hmm.

Let me recall the paper more concretely. Myers 1986, Section 4 (linear space):

"Theorem: Let D be the length of the shortest edit script... there is a snake h-p... " The algorithm:

For D := 0 to ceil((M+N)/2):
  (a) for k := -D to D in steps of 2:
        find furthest reaching forward D-path on diagonal k,记 V[k]
        if Δ odd and k ∈ [Δ-(D-1), Δ+(D-1)] and V[k] >= Vb[k]: 
            then the answer D = 2D-1 and the snake from Vb[k] to V[k] on diagonal k is the middle snake. (Note: Vb here is from the previous iteration's backward pass, i.e., backward round D-1.)
  (b) for k := -D to D in steps of 2:
        kk := k + Δ
        find furthest reaching reverse D-path ending at ... Vb[kk]
        if Δ even and kk ∈ [-D, D] and Vb[kk] <= Vf[kk]:
            answer D = 2D, middle snake from Vb[kk] to Vf[kk]. (Vf from forward pass of this same iteration? or previous?)

Hmm. In the even case: forward round D computes diagonals -D..D; backward round D computes Δ-D..Δ+D. Overlap check for kk in [-D, D] uses Vf[kk] which exists only for kk in [-D, D] — exactly the condition. If Vb[kk] <= Vf[kk]: the forward D-path reaches x=Vf[kk] on diagonal kk; backward D-path reaches x=Vb[kk] on diagonal kk; since Vb ≤ Vf, forward path extends along diagonal to Vb's point... wait, backward path goes from (N,M) backward to (Vb[kk], Vb[kk]-kk). Forward path from (0,0) to (Vf[kk], Vf[kk]-kk). If Vf >= Vb, then the forward path point is further; connect: forward path to (Vf,·), then along diagonal backward to (Vb, ·), then reverse backward path to (N, M). Total = D + D = 2D. So D_total ≤ 2D. By induction/parity, D_total = 2D when first detected (since D_total ≡ Δ ≡ even, and D_total < 2D would mean detection at earlier round... hmm, would it? D_total even = 2D' with D' < D. At iteration D', the even-case check: backward round D' covers Δ-D'..Δ+D'; forward covers -D'..D'. Is the middle snake detectable then? The claim is that for the optimal D_total, there EXISTS a middle snake detectable at round D_total/2. This is the content of the paper's lemma. I'll trust the paper's algorithm as it's well-established. Let me get the exact pseudocode right. I found in memory the pseudocode from the paper:

```
Linear space algorithm:
Δ := (N - M)
For D := 0 to Ceil((M + N)/2) Do
  (1) For k := -D to D in steps of 2 Do
        (a) Find the end of the furthest reaching forward D-path on diagonal k
            (as in the simple algorithm) and set V[k] ...
        (b) If Δ is odd and k is in [Δ - (D-1), Δ + (D-1)] Then
              If V[k] >= Vb[k] Then
                Accept the middle snake ... and terminate.
  (2) If Δ is even and Ceil((M+N)/2) ... hmm
  (2) For k := -D to D in steps of 2 Do  -- hmm actually I think backward pass runs for all D
        (a) kk := k + Δ
            Find the end of the furthest reaching reverse D-path on diagonal kk (as in ...) and set Vb[kk].
        (b) If Δ is even and kk is in [-D, D] Then
              If Vb[kk] <= Vf[kk] Then accept and terminate.
```

Wait, in (2), the backward path at round D: reverse D-path starting from (N,M). The initialization of Vb: Vb[Δ-1]?? Hmm, the reverse recurrence base. In the paper's "find the end of furthest reaching reverse D-path on diagonal kk": the recurrence for reverse paths on diagonal kk at round D: it comes from diagonal kk+1 (round D-1) via a horizontal move left, or from kk-1 via vertical move up. Base cases: if kk = Δ + D (rightmost reachable), must come from kk-1: x = Vb[kk-1]... and the snake extension. And there's the d=0 initialization: Vb[Δ] = ... after snake from (N, M).

Hmm wait, actually there's a subtlety in the paper: I recall the reverse path recurrence is stated with the snake-extension included, and initialization Vb[Δ+1] = N or similar sentinel trick. Let me just implement with explicit base cases:

Reverse pass, round d (d ≥ 1), for k from Δ+d down to Δ-d step -2 (or any order):
- if k == Δ + d: x = Vb[k-1]  (came from diagonal k-1 via "up" move: (x0, y0-1); x unchanged)
- elif k == Δ - d: x = Vb[k+1] - 1 (came from diagonal k+1 via "left" move)
- else: x = min(Vb[k+1] - 1, Vb[k-1])
- y = x - k; then extend snake: while x > 0 and y > 0 and a[x-1] == b[y-1]: x -= 1; y -= 1
- Vb[k] = x

Wait, need to double check the "left" move geometry: on diagonal k+1, point (x1, y1), y1 = x1 - k - 1. Move left to (x1 - 1, y1): diagonal = x1 - 1 - y1 = k. ✓. Move "up": on diagonal k-1, point (x0, y0), y0 = x0 - k + 1. Move up to (x0, y0 - 1): diagonal = x0 - y0 + 1 = k. ✓.

d = 0: k = Δ: x = N, y = M; extend snake; Vb[Δ] = x. But wait — for d=0 the point must be reachable: (N, M) exactly. ✓.

Hmm, but there's an issue with the snake extension in the reverse pass at d=0: if a[N-1] == b[M-1] etc., Vb[Δ] < N. That's correct: the furthest reverse 0-path on diagonal Δ ends after the maximal snake.

Also potential subtlety: when k == Δ + d and also d == 0 — handled separately.

Forward pass, round d (d ≥ 1), k from -d to d step 2:
- if k == -d: x = Vf[k+1]
- elif k == d: x = Vf[k-1] + 1
- else: x = Vf[k+1] if Vf[k-1] < Vf[k+1] else Vf[k-1] + 1
- y = x - k; while x < N and y < M and a[x] == b[y]: x += 1; y += 1
- Vf[k] = x

d=0: k=0: x=0, y=0, snake extend, Vf[0] = x.

Hmm wait, but the standard base trick sets Vf[1] = 0 implicitly via V init 0; with explicit bases above I handle it. But careful: at d=1, k=-1: x = Vf[0]. Vf[0] at that time is the round-0 value (after snake). ✓. k=1: x = Vf[0] + 1. ✓.

Edge: what about k == -d == d == 0 (d=0): handle: x=0,y=0,snake.

Now overlap detection & termination. D_total parity = parity of Δ? D_total = deletions + insertions, N - M = deletions - insertions (since "=" items counted once each... let's verify: the edit script maps a to b: keeping lines (lcs), deleting a-only lines (count = N - |LCS|), inserting b-only (M - |LCS|). So Δ = N - M = del - ins, and D_total = del + ins. So D_total ≡ Δ (mod 2). ✓.

Algorithm:
```
if Δ odd:
    for d in 0..ceil((N+M)/2):
        forward round d
        # check overlap: k in [Δ-(d-1), Δ+(d-1)] ∩ [-d, d], parity k ≡ d (mod 2) automatically? 
        # backward available: rounds 0..d-1 → diagonals Δ-(d-1)..Δ+(d-1)
        for k in forward range intersect backward range:
            if Vf[k] >= Vb[k]: found: middle snake on diagonal k from (Vb[k], Vb[k]-k) to (Vf[k], Vf[k]-k); total D = 2d - 1; split and recurse.
        backward round d (if continuing)
else:
    for d in 0..:
        forward round d
        backward round d
        # check: kk in [-d, d] ∩ [Δ-d, Δ+d]: if Vb[kk] <= Vf[kk]: found, D = 2d
```

Hmm wait — in the even case, comparing backward round d with forward round d (both just computed). Combined path length 2d. In the odd case, forward round d with backward round d-1: combined 2d-1.

But is checking only these pairings sufficient to find the middle snake at the earliest possible d (= D_total/2 or (D_total+1)/2)? The paper's lemma guarantees: there is a middle snake such that the forward part is a ceil(D_total/2)... Actually the paper's lemma: "there exists a D-path (optimal) that has a snake whose... " The precise statement: Let D be the minimum edit script length. There exists a snake on some optimal path, call it the middle snake, such that the path can be split into: forward part of length ⌈D/2⌉ ending at the snake's start? Hmm, I recall: "there is a snake h1..h2 on the optimal path such that the portion before it is a ⌈D/2⌉-path? no..." 

Paper's Lemma 1 (from "An O(ND)..." section on linear space): "If D is the length of a shortest edit script, then there is a snake (h1, h2) [from point to point] on some optimal path such that: if D is even, the path can be split into a D/2-path ending at the start of the snake... " Honestly, the accepted implementation is as in the paper's pseudocode which I sketched. Many implementations (e.g., in git's xdiff? no, git uses a variant) — the well-known Python implementations of linear Myers exist. Let me reconstruct the exact paper pseudocode from a reliable memory: The paper's Figure 6? pseudocode:

```
L / D Basic Algorithm ... 
Δ := (N - M)
odd := Δ mod 2 ≠ 0  -- paper uses: if Δ odd...
V := ...
for D := 0 to Ceil((M+N)/2):
   for k := -D to D step 2:
      # forward
      if k = -D or (k ≠ D and V[k-1] < V[k+1]): x := V[k+1]
      else: x := V[k-1] + 1
      y := x - k
      while x < N and y < M and a[x+1] = b[y+1]: (x,y) := (x+1, y+1)  # 1-indexed
      V[k] := x
      if odd and k ∈ [Δ - (D-1), Δ + (D-1)]:
          if V[k] >= Vb[k]: # Vb from previous backward pass? Hmm, but Vb is initialized...
             # snake found: from (Vb[k], ...) to (V[k], ...)
   for k := -D to D step 2:  # hmm, or the backward pass runs with its own k range
      kk := k + Δ  ... 
```

I'm fairly confident about the structure. One more subtlety: in the odd case, when the overlap is found in the forward pass at round d, the backward Vb values are from backward round d-1 (computed in the previous iteration of the outer loop). And in the even case, the overlap found in the backward pass at round d compares with forward round d (same iteration, computed in step (1)). Wait — should the even case compare backward round d with forward round d, or forward round d with... Let me sanity check with a tiny example where the answer matters. 

Example: a = [x], b = [y] (N=M=1, Δ=0 even). Optimal D = 2 (delete x, insert y). 
Forward: d=0: k=0: x=0,y=0; a[0]!=b[0] → no snake; Vf[0]=0. Backward: d=0: k=Δ=0: x=1,y=1; a[0]!=b[0] → Vb[0]=1. Check overlap: kk in [-0,0] → kk=0: Vb[0]=1 <= Vf[0]=0? No. Next d=1: forward: k=-1: x = Vf[0] = 0, y = x - k = 1; snake: x<N=1,y<M=1: a[0] vs b[0]: x=0,y=1 → a[0]==b[y]=b[1]? out of range (M=1, y=1 not < 1). Vf[-1] = 0. k=1: x = Vf[0]+1 = 1, y = 0; a[1] out of range; Vf[1]=1. Backward round 1: k ranges Δ±1 = -1, 1. k=1 (=Δ+d, rightmost): x = Vb[0] = 1; y = x - k = 0; snake backward: x>0 and y>0? y=0 → stop. Vb[1] = 1. k=-1 (leftmost): x = Vb[0]... wait k = Δ - d = -1: x = Vb[k+1] - 1 = Vb[0] - 1 = 0; y = 0 - (-1) = 1; snake: x>0? x=0 stop. Vb[-1] = 0. Now overlap check even case: kk in [-1, 1] ∩ [Δ-1, Δ+1] = {-1, 0, 1} ∩ {-1, 1} = {-1, 1}. kk=-1: Vb[-1]=0 <= Vf[-1]=0 ✓ → found at d=1, D=2. ✓ Middle snake on diagonal -1 from (0, 1) to (0, 1) — degenerate snake (a point). Then recursion: prefix a[0..0], b[0..0] empty-empty; suffix: a[1..1] vs b[1..1] → both empty. Hmm wait, the middle snake is a point (0,1); the split: prefix = a[0:0], b[0:1]?? Let me define the recursion properly.

The middle snake goes from point P1 = (xb, yb) to P2 = (xf, yf) on the same diagonal (xb=xf for degenerate). The edit path: forward part from (0,0) to P1 (a d_f-path), the snake P1→P2 (diagonal moves), backward part from P2 reversed to (N,M) (d_b-path). Recursion: solve subproblem a[0:xb]... wait: prefix region is a[0:x1] vs b[0:y1] where (x1,y1) = P1 = start of middle snake = (Vb[k], Vb[k]-k). Suffix region: a[x2:N] vs b[y2:M] where (x2,y2) = P2 = (Vf[k], Vf[k]-k).

Check with example: snake from (0,1) to (0,1): prefix a[0:0], b[0:1] = [], [y] → insert y. Suffix a[0:1]... wait x2=0: a[0:1] = [x], b[1:1] = [] → delete x. Result: insert y? order: prefix ops, then "=" for snake lines? The snake is degenerate (no diagonal moves), then suffix: delete x. Total: ["+", y], ["-", x] — valid: applying to a=[x]: delete x, insert y → [y] ✓. D=2 ✓.

Now check the odd case: a = [x], b = [] → N=1, M=0, Δ=1 odd. D_total should be 1.
d=0: forward: k=0: x=0, y=0; snake: x<1 and y<0? no. Vf[0]=0. Overlap check: backward range for rounds 0..d-1 = rounds 0..(-1) → none computed. Skip. Backward round 0: k=Δ=1: x=N=1, y=M=0; snake: x>0 and y>0? y=0 → stop. Vb[1]=1.
d=1: forward: k=-1: x=Vf[0]=0, y=1; y<M=0? no. Vf[-1]=0. k=1: x=Vf[0]+1=1, y=0; snake: x<1? no. Vf[1]=1. Overlap check: backward available diagonals: rounds 0..0 → {1}. Forward range {-1,1} ∩ {1} = {1}: Vf[1]=1 >= Vb[1]=1 ✓ → found: d=1, total = 2*1-1 = 1 ✓. Snake from (Vb[1], Vb[1]-1) = (1, 0) to (Vf[1], 0) = (1,0): degenerate point (1,0). Prefix: a[0:1], b[0:0] → delete x ✓. Suffix: a[1:1], b[0:0] empty. Result: [("-", x)] ✓.

Great. Now check the even-case comparison concern (backward round d vs forward round d): another example: a=[x,y], b=[x] → N=2,M=1,Δ=1 odd. D_total = 1 (delete y). 
d=0: fwd: Vf[0]: x=0,y=0: a[0]==b[0] → snake to (1,1); then x<2,y<1? y=1 not <1. Vf[0]=1. bwd: k=1: x=2,y=1; snake: a[1] vs b[0]: x-1=1,y-1=0: a[1]=y,b[0]=x → no. Vb[1]=2.
d=1: fwd: k=-1: x=Vf[0]=1, y=2; y<1? no. Vf[-1]=1. k=1: x=Vf[0]+1=2, y=1; snake: x<2? no. Vf[1]=2. Overlap: backward diagonals {1}: k=1: Vf[1]=2 >= Vb[1]=2 ✓ → total=1. Snake (2,1)→(2,1). Prefix: a[0:2], b[0:1]: prefix region = a[0:x1] where x1 = Vb = 2, b[0:y1], y1 = Vb - k = 1: so prefix is the whole thing, suffix empty. Recursion on a[0:2], b[0:1] → that's the same problem! Infinite recursion? Hmm. The snake is degenerate at (2,1) — the path endpoint. Forward d-path from (0,0) to (2,1) has length d=1 (one delete), and backward 0-path at (2,1): the backward 0-path on diagonal Δ=1 is the snake from (2,1) — which is degenerate. Combined: 1 + 0 = 1 = D_total ✓. But the recursion splits into prefix (whole problem) + suffix (empty) → infinite loop!

Need to handle this: when the snake is degenerate/empty at the very end, recursing on the same problem loops. Standard implementations handle this because... hmm. Actually wait: the split should be: prefix = region before snake start, snake, suffix = region after snake end. Here snake start = (2,1) = snake end = (2,1). Prefix = a[0:2], b[0:1] = full problem. Suffix empty. Then recursion re-runs the same computation and finds the same overlap → infinite recursion.

Hmm, but this is a known aspect: when the middle snake has zero length and sits at the boundary, the split still reduces the problem because... it doesn't here. Let me re-check the overlap found: is there a better (non-degenerate) snake? The optimal path: (0,0) → delete y → (2,1)? Wait: (0,0), delete a[0]: (1,0); then a[0]==b[0] diagonal to (1,1); then delete a[1]: (2,1). Total 2 moves?? Hmm, D_total should be 1: delete one line. Path: (0,0) → delete a[1]?? Can't, must go in order. Edit script: delete y (a[1]): path (0,0) →(1,0) [keep x? no—] hmm. Let me recount: LCS of [x,y] and [x] is [x], length 1. Script: keep x, delete y → 1 deletion. Path: (0,0) → diagonal (snake a[0]==b[0]) → (1,1) → delete a[1] → (2,1). That's 1 non-diagonal move ✓ D=1. Or: (0,0) → delete a[0] → (1,0) → insert b[0]?? that's 2 moves then diagonal... anyway D=1.

Forward d-path at d=1 on diagonal 1: from (0,0), 1 move: delete → (1, 0) on diagonal 1. Then snake: a[1] vs b[0]: "y" vs "x" no. So Vf[1] should be 1, not 2! Let me recompute: k=1, d=1: k == d → x = Vf[0] + 1. Vf[0] = 1 (after the snake). x = 2? That's wrong: the delete move goes from the furthest reaching 0-path endpoint (1,1) left... wait delete move forward: (x+1, y): from (1,1) → (2,1): diagonal = 1. x=2, y=1. Then snake: x<2? no. So Vf[1] = 2. Hmm, but earlier I said the d=1 path on diagonal 1 is (1,0)... Both are valid d-paths on diagonal 1: (0,0) → delete → (1,0) is on diagonal 1? x-y = 1-0 = 1 ✓. And (0,0) → snake → (1,1) → delete → (2,1) also diagonal 1, x=2 further. Furthest = (2,1). ✓ Vf[1]=2 correct.

And backward 0-path on diagonal 1: from (2,1): snake: a[1]="y" vs b[0]="x"? The backward snake at (x,y) checks a[x-1]==b[y-1]: a[1]="y", b[0]="x" → no. So Vb[1] = 2. Overlap: Vf[1] = 2 >= Vb[1] = 2 → detected, total = 2*1 - 1 = 1 ✓ correct total! But the snake is the degenerate point (2,1), giving prefix = full problem. Recursion infinite.

Hmm. But wait — is this actually a problem in the standard algorithm? The standard middle snake should split the problem into strictly smaller subproblems... Not necessarily strictly smaller, but the recursion must terminate. In the standard formulation, the middle snake found has the property that the prefix subproblem has optimal distance d_f and suffix d_b with d_f + d_b = D_total, and both subproblems are strictly smaller in (N+M) unless degenerate. Here prefix = whole problem with d_f = 1 = D_total, suffix empty with d_b = 0. Recursion on prefix: it's the same problem → but will it find a different (earlier) snake next time? Same computation, same result → infinite loop.

Standard implementations avoid this because... let me think. Ah, I think the issue: in the odd case, the overlap check should compare Vf[k] (round d) with Vb[k] from round d-1, and the snake is from Vb[k] to Vf[k]. Here Vb from round 0 on diagonal 1 = 2, Vf round 1 = 2. The "snake" between them is empty. Hmm.

But actually, maybe the correct interpretation: when Vb[k] == Vf[k], the snake is empty and we should still be able to make progress. The standard resolution: the recursion is on (prefix, suffix) around the snake; if the snake is empty and the prefix equals the whole problem, we recurse on the whole problem but with... hmm.

Wait, maybe I mis-identified which overlap to detect. In the paper, the found snake must be a "middle" snake, and I believe the paper's algorithm, when Δ odd, finds the overlap in the forward pass comparing with Vb from the backward pass of the SAME D value? Let me reconsider: maybe the backward pass runs BEFORE the forward pass in each iteration? Order: for D: (1) backward? Let me reconsider the geometry to figure out the right pairing.

Actually, let me reconsider. The paper's algorithm for the odd case: overlap detected in forward pass round D comparing Vf (round D) with Vb (round D-1)? That gives total 2D-1. In my example, at D=1: Vf[1]=2 (round 1), Vb[1]=2 (round 0). Overlap. Total = 1 = D_total ✓. The paper says "the snake between Vb[k] and Vf[k] is the middle snake" — here it's empty. The paper then recurses: prefix problem a[0..x_snake_start), b[0..y_start) and suffix. With empty snake at the path's end, prefix = whole. Hmm, so does the paper's algorithm handle this? I think in the paper the split is: prefix = [0, x_start) and suffix = [x_end, N), and if the snake is empty, x_start = x_end, and the recursion is on prefix + suffix where prefix ∪ suffix ⊂ problem, strictly smaller unless... x_start = x_end and both = N means prefix = whole, suffix = empty. Infinite loop. But the paper's algorithm is proven correct, so maybe such a degenerate detection never is the *first* detection? In my example it WAS the first detection at D=1. Unless the algorithm would have detected at D=0: at D=0: forward round 0: Vf[0]=1; check odd case: k=0 in [Δ-(D-1), Δ+(D-1)] = [0, 0] (D-1=0): Vb[0]? Backward round 0 gives Vb[Δ]=Vb[1]=2, not Vb[0]. Backward round -1 doesn't exist. So no check at D=0 for odd case (k ∈ [Δ-(D-1), ...] = [1, ...]? Δ-(D-1) = 1-(-1) = 2? For D=0, D-1 = -1, range [Δ+1, Δ-1] empty. OK so no check at D=0. First check at D=1 finds the degenerate snake at (2,1).

Hmm, so how do real implementations handle this? Let me look at known implementations. The classic: "diff-myers" linear space implementations, e.g., in the "dwdiff"? Or the well-known pseudo-code in "An O(ND) Difference Algorithm and Its Variations", Figure 7? Let me think about what the paper actually does:

I now recall the paper's middle-snake procedure returns the snake, and the caller does:

```
Find middle snake → (x, y, u, v) [start and end points]
if D is the total (odd/even accordingly):
    solve(a[0:x], b[0:y])  # prefix
    output snake lines as "="
    solve(a[u:N], b[v:M])  # suffix
```

And for the termination: the base cases D ≤ 1 or D ≤ 2 handled directly? Many implementations handle small cases: if min problem size == 0 → trivial; and importantly, they often check `if D <= 1: handle directly` or the recursion naturally terminates because... 

Hold on — maybe in my example the correct middle snake detection should compare Vf[k] with Vb[k] where Vb comes from backward round d (not d-1) in the odd case too? No wait — the backward pass at iteration d runs AFTER the forward pass at iteration d in the paper (steps (1) then (2)). At step (1) of iteration D, only backward rounds 0..D-1 available. So odd case compares round D forward with round D-1 backward. In my example that's what happened.

Alternatively maybe the even case compares backward round D with forward round D-1? In the even example above (a=[x], b=[y]) I compared backward round 1 with forward round 1 and it worked (found degenerate snake at (0,1) → but there prefix was a[0:0], b[0:1] and suffix a[0:1]→ wait let me redo: snake point (0,1): prefix a[0:0]=[], b[0:1]=[y]: insert y. suffix a[0:1]=[x], b[1:1]=[]: delete x. Both strictly smaller. Fine.)

So