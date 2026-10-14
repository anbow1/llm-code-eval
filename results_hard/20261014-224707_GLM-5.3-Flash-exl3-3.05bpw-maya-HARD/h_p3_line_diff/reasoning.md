We need Myers' algorithm with LCS. But careful: Myers O((N+M)D) for the case of two 1000-line completely different lists: D ~ 2000, N+M ~ 2000, so O(ND) ~ 4M — fine. For 20000 lines differing in ~50 places: D ~ 100, N+M ~ 40000, O(ND) ~ 4M — fine.

But Myers' algorithm computes edit distance, not directly LCS. The LCS length = (N + M - D) / 2 where D is the number of non-matching... Actually LCS = (N + M - D)/2 when D is even? The edit script with only insertions and deletions: D = number of deletions + insertions. LCS = N - deletions = M - insertions. And N + M - D = 2*LCS. So minimizing D maximizes "=" items. Good — Myers gives minimal D, hence maximal LCS. But note: multiple LCS of same size may exist; requirement only says number of "=" items must be as large as possible. So any minimal edit script works.

However, subtlety: lines can repeat, so we must handle ties; Myers handles repeats fine since it just compares elements.

Implementation: Myers' O(ND) with forward direction only, storing V array snapshots to backtrack. Memory: store V per D step (list of length 2D+1 or offset array). For D up to ~2000 and N+M up to 40000... For the 1000 vs 1000 completely different: D=2000, snapshots 2000 * up to 4001 ints ≈ 8M ints — memory heavy but ok? 2000 lists each of length up to 4001 → ~2000*4001*8 bytes ≈ 64MB plus list overhead. Could be ~100MB. Hmm, might be acceptable but risky. Alternative: linear-space refinement (Hirschberg / Myers divide and conquer with middle snake). Or use the "middle snake" Myers to get O(N+M) memory with recursion depth O(D)... Actually the linear-space Myers (Myers 1986 "An O(ND) difference algorithm and its variations") divide-and-conquer finds middle snake and recurses; complexity O((N+M)D) time, O(N+M) space. That's the cleanest.

But implementing middle-snake correctly is fiddly. Alternative simpler approach: forward Myers storing snapshots but only store V as dict? For the 1000 case: D ≈ 2000 worst (completely different means LCS=0? "completely different" — maybe no common lines, D = N+M = 2000). Snapshots: at step d, V has entries for k in [-d, d], i.e., 2d+1 entries. Total entries ≈ sum_{d=0}^{2000} (2d+1) ≈ 4M ints. Using a single dict or a flat array? Store as list of arrays of length 2*maxD+1? Simpler: store snapshots as list of lists of length 2*max+1 preallocated with sentinel. 2000 snapshots × 4001 ints = 8M ints in lists → ~ 8M * 8 bytes for pointers + small int caching... Python list of ints: 8 bytes per pointer, ints are cached small ones? Values up to 2000 are not all cached (cache up to 256). Still ~64MB pointers + int objects ~28 bytes each but many repeated... Actually values in V are indices 0..N; if N=1000, ints ≤ 1000, only 256 cached → up to 8M distinct int objects * 28 bytes = 224MB. Too much.

Better: use linear-space Myers middle-snake algorithm. Let me implement it carefully.

Myers linear space (reverse/forward hybrid): Standard approach: LCS via divide and conquer using middle snake.

Implement `find_middle_snake(a, a0, a1, b, b0, b1)` computing forward and reverse D-paths simultaneously until overlap.

Let me write the classic version:

```
def diff(a, b):
    out = []
    _diff_rec(a, 0, len(a), b, 0, len(b), out)
    return out
```

_diff_rec: if a0 == a1: all "+" for b[b0:b1]. if b0 == b1: all "-" for a[a0:a1]. Else compute middle snake (x, y, u, v) and D; if D > 1: recurse on (a0..x, b0..y) and (u..a1, v..b1); else handle base: with D <= 1, the edit script is straightforward: if D==0 all equal; if D==1, either one insertion or one deletion. Actually with D==1 we can just recurse? The middle snake with D==1: forward and reverse overlap at D=1... Standard implementation: when D <= 1 output directly. Hmm, but the middle snake function returns the snake path; when D==1 there's exactly one non-diagonal step. Simpler: in recursion, if D computed > some threshold, recurse; handle D<=1 directly: D==0 → "=" for all; D==1 → find where they differ: if len diff... Let me handle: if a0<a1 and b0<b1 and D==1: exactly one insertion or deletion. We can just emit: match common prefix, then "-" or "+", then common suffix. Since D==1, the sequences differ by a single edit.

Actually simpler and safe: in the recursion, always call middle snake; it returns (x,y,u,v) for the middle snake and D. If D <= 1, we can handle directly: if D == 0, all lines equal → emit "=". If D == 1, find first mismatch index i (common prefix) and emit "=", then the single edit: either deletion (if lengths differ by... ) hmm — with D==1 either N-M = ±1 or... D==1 means one insertion or one deletion, so |len(a)-len(b)|... could still be equal lengths? No: one edit changes length by ±1, so lengths differ by 1. So if len(a_seg) > len(b_seg): one deletion: emit "=" for prefix, "-" for a[i], "=" for suffix. Else insertion similarly. Since D==1 the prefix+one edit+suffix reconstructs.

Middle snake algorithm (Myers 1986, section 4):

Forward: for d in 0..ceil((N+M)/2): for k in -d..d step 2: compute V_forward[k] (furthest x). Reverse similarly with delta = (N-M) mod 2 stuff. Overlap check: forward on odd d overlaps reverse on... Standard: forward search when d ≡ delta mod 2? Let me use the well-known pseudocode:

```
def middle_snake(a, N, b, M):
    N, M lengths; delta = N - M
    odd = delta % 2 != 0
    Vf = {1: 0}  # or array
    Vr = {delta-1... } hmm
```

Classic pseudocode (from Myers paper):

```
delta = N - M
odd = delta odd
Vf = dict with Vf[1]=0
Vr = dict with Vr[delta-1] = N   # for reverse, x values; reverse k index shifted
for d in range(0, ceil((N+M)/2) + 1):
    # forward
    if not odd:  # check overlap after reverse? order matters
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and Vf[k-1] < Vf[k+1]):
            x = Vf[k+1]
        else:
            x = Vf[k-1] + 1
        y = x - k
        x0, y0 = x, y   # start of snake before extending? Actually we record before diagonal extension
        while x < N and y < M and a[x] == b[y]:
            x += 1; y += 1
        Vf[k] = x
        if odd and delta - d <= k <= delta + d - 2? hmm
```

The overlap condition: forward path on diagonal k overlaps reverse path on same diagonal when reverse has been run to depth d-1 (for odd delta) or d (for even delta). Specifically:

- If delta is odd: check forward (at depth d) against reverse (depth d-1): overlap when k in [delta-(d-1), delta+(d-1)] and Vr[k] <= x (reverse x means furthest reaching in reverse from the end; reverse "x" is measured same coordinate where path goes backward). Overlap when x >= Vr_reverse_x[k].
- If delta even: check reverse (at depth d) against forward (depth d-1): overlap when k in [-d+... ].

Let me use the standard formulation found in many implementations:

Reverse path: define furthest reaching in terms of x too: we run from (N, M) backward; define Vr[k] = the minimal x on diagonal k reachable going backward from (N,M) with D reverse-steps. Reverse step: from (x,y) go up (y-1) then diagonal left. In reverse, for diagonal k: 

```
for k in range(delta+d? ...)
```

Let me just write it carefully with known correct implementation (e.g., from "diff-match-patch" or Robert's implementation). A known correct linear-space Myers:

```
def _middle(a, a0, n, b, b0, m):
    # n, m lengths
    delta = n - m
    odd = (delta & 1) == 1
    vf = [0] * (n + m + 2)? Use dict with offsets.
```

Use arrays with offset: max diagonal range: forward k in [-d, d] with d up to ceil((N+M)/2); reverse k in [delta-d, delta+d]. Use dict for simplicity — performance: for 1000×1000 completely different, middle snake at top level: d up to 1000, each d iterates 2d+1 → ~1M iterations forward + 1M reverse, dict ops... maybe 2-4 seconds? Hmm, that's the first call which finds the middle snake at D≈2000... wait delta = 0 if both 1000, even delta, overlap found at d = D/2 = 1000. Forward loop total work sum_{d=0}^{1000}(2d+1) ≈ 1M; reverse same ≈ 1M. With Python dict overhead ~ maybe 0.5–1s each? Dict operations ~100ns... 2M dict get/set plus loop overhead → maybe 1–2s. Under 6s budget, ok. But recursion: after middle snake, D splits roughly in half; total time O((N+M)D) overall = 2000*2000 = 4M steps worst case? Actually the divide-and-conquer total is O((N+M) D) = 4M basic steps in Python → ~4-8 seconds? Hmm. Risky.

Alternative for the 1000-completely-different case: LCS is 0, D=2000, and recursion: each level the total work sums to O((N+M)·D) indeed. 4M Python-level iterations of the inner while loops plus d-loops... Each iteration involves dict access. Might be ~4–10s. Risky but let's optimize: use lists with offset instead of dicts, and inline comparisons. Lists: Vf array of size N+M+3 with offset = N? Forward k ranges [-d..d], offset index k+N? k + N... k can be negative down to -ceil((N+M)/2); use offset = N + 2? Actually forward k in [-ceil((N+M)/2), +...]; simplest: offset = N. index = k + N, but k+... hmm k ranges over -d..d where d ≤ (N+M+1)/2. k+N ranges N-d..N+d; N-d ≥ N-(N+M)/2 ≥ 0 if M... N - (N+M)/2 = (N-M)/2 could be negative if M > N. Use offset = N + M (safe: k ≥ -(N+M)/2 ≥ -(N+M)). Array size 2*(N+M)+3.

Actually there's a smarter approach for performance: precompute a quick check — trim common prefix/suffix first. For the "20,000 lines differ in ~50 places" case, trimming prefix/suffix makes the core tiny. For the 1000 completely different case, trimming doesn't help but also we should first check: if there are no common lines at all (e.g., LCS 0)... hard to check quickly. But there's another trick: if D would exceed N+M... it's bounded anyway.

Alternatively, use the simple O(ND) forward Myers with trace for small inputs and... no, memory issue only for large D. Hmm, trace memory: for 1000 vs 1000 completely different, D=2000, snapshots store V arrays of size 2*2000+1... if we store per-d only entries within [-d,d], using growing arrays: store at step d the full array of size (N+M+1) each step → 2000 × 4000 ints = 8M entries — too much memory as computed. But we can store per-d a copy of length 2d+1 (only the active window): total entries = sum (2d+1) ≈ 4M ints ≈ 32MB pointers + int objects. Values x up to 1000; Python ints 0..1000: 257 cached, rest ~28 bytes each but many duplicates across snapshots? No—each snapshot list holds references; distinct int objects created per computation. V values are computed ints; total distinct objects across snapshots could be ~4M * 28 bytes = 112MB. Hmm borderline.

Better: linear space it is. Let me just carefully implement Myers' linear-space with arrays.

Also an optimization: use a dict mapping line values? No — comparison a[x] == b[y] is cheap.

Another important optimization: for the 20k-lines-differ-in-50 case: trim prefix and suffix first (common prefix/suffix scan), which is O(N). Then the core has N' ~ maybe small (few hundred). Then middle snake recursion fast. 

For 1000 completely different: the whole thing is the worst case: O((N+M)D) = 4M steps. Let's estimate: the middle-snake function at each recursion node does forward and reverse loops until overlap at depth d ≈ D/2 where D is the local edit distance. Total over all nodes: sum over nodes of ~ (local N+M) * (local D / 2) * 2 ≈ ... The classic result: total O((N+M)D). 4M inner iterations, each involving: a for-k loop iteration with a few list index ops and a while loop (which mostly doesn't advance for completely different lines — while condition fails immediately). So per k-iteration ~ maybe 10-15 bytecode-heavy ops → 4M * ~0.5µs? Python is slower: each iteration maybe 1µs → 4s. Tight. Let's optimize the middle snake inner loops.

Hmm, alternative: for the completely-different case we can add a fast path: compute LCS length upper bound quickly? If sequences share no common elements, LCS=0 and the answer is all "-" then all "+"? Wait — requirement: "=" items as many as possible = LCS length. If LCS = 0, output must be... but order matters: taking "=" and "-" in order gives a, "=" and "+" gives b. With no "=" items, we must output all "-" for a then all "+" for b? Actually with no "=" items, "-" items must be exactly a in order and "+" exactly b in order, and any interleaving works since no "=" constraint. But minimal script is fixed: all a then all b.

Fast path: check if set(a) & set(b) is empty → return [("-", x) for x in a] + [("+", y) for y in b]. That handles "completely different" if it means disjoint sets. But "completely different" might mean lines differ pairwise but sets intersect. Can't rely on it. Still, the fast path helps in many test cases.

Another optimization: unique-line anchoring (like diff-match-patch "line mode")? That complicates minimality guarantee. Skip.

Let me just write an efficient linear-space Myers and hope 4M iterations run under 6s. We can micro-optimize: use local variable references, avoid function-call overhead in inner loops, use lists not dicts.

Middle snake with arrays:

```
def _middle_snake(a, N, b, M):
    # returns (d, x, y, u, v): middle snake from (x,y) to (u,v), total edit distance d? 
```

Standard: returns the snake and the total D. In recursion we need D to know when to stop (D<=1 handled directly). Actually we can handle recursion differently: recurse until subproblem trivially equal/empty; the middle snake function returns snake endpoints; split there. When D <= 1 the middle snake still works? For D=1: forward d=0 and reverse d=0; delta odd (D=1 → delta = ±1, odd). Forward at d=0: k=0, snake from (0,0) along common prefix... Then overlap check with reverse at d-1=0. Hmm when delta odd, check forward path (d) against reverse path (d-1). At d=1? Let's get the standard pseudocode right.

Myers paper (Fig. 4? The O(ND) with linear space, "the middle snake"):

```
delta = N - M
odd = delta is odd
V = {1: 0}
for d in 0..ceil((M+N)/2):
    # forward
    for k in -d..d step 2:
        if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]
        else: x = V[k-1]+1
        y = x - k
        # remember start
        while x<N and y<M and a[x]==b[y]: x++, y++
        V[k] = x
        if odd and k in [delta-(d-1), delta+(d-1)] and V[k] >= ... overlap with reverse
    # reverse (with separate array Vr init {delta+1: N}? )
```

The paper's version (from the "middle snake" section) uses reverse direction with its own array, and the reverse is computed inside the same d loop, checking overlap for the other parity. Let me recall the exact algorithm from Myers' paper section 4b (the one used in GNU diff):

```
For odd delta, forward overlap check at step d uses reverse values from step d-1.
For even delta, reverse overlap check at step d uses forward values from step d.
```

Implementation (widely reproduced, e.g. in "Myers diff in Ruby" articles):

```
def find_middle_snake(a, b):
    n, m = len(a), len(b)
    max_d = (n + m + 1) // 2
    delta = n - m
    odd = delta % 2 != 0
    vf = [0] * (2 * max_d + 2)?? 
```

Let me write it with dict-free arrays: vf[k + offset], offset = max_d (k in [-max_d, max_d]) forward; vr[k + offset], reverse k in [delta - max_d, delta + max_d] ⊂ [-max_d... ] since |delta| ≤ n+m and max_d ≥ (n+m)/2... delta - max_d ≥ (n-m) - (n+m+1)/2 = (n - m - 1)/2 ≥ -(m+1)/2 ≥ -max_d ok, and delta + max_d ≤ (n-m)+(n+m+1)/2 = (3n - m + 1)/2 could exceed max_d if n > m: e.g. n=1000, m=0: delta=1000, max_d=500, delta+max_d=1500 > max_d. So reverse offset needs bigger array. Use offset2 = max_d + abs(delta)? Just size both arrays 2*(max_d + abs(delta)) + 3? Simpler: size = n + m + 3 and offset = ... Let's think: forward k ∈ [-max_d, max_d], max_d ≤ (n+m+1)/2. Reverse k ∈ [delta-max_d, delta+max_d]. Union range: min = -(n+m+1)/2, max = delta + (n+m+1)/2 ≤ (n-m) + (n+m+1)/2 = (3n+m+1)/2 ≤ 1.5(n+m). So allocate size = 2*(n+m)+4 with offset = n+m+1 for both? Forward k + offset: min k = -(n+m+1)/2 → offset + k ≥ (n+m+1)/2 ≥ 1 >0 fine. Max forward k + offset = (n+m+1)/2 + n+m+1 ≤ 1.5(n+m)+... < 2(n+m)+3 ok. Reverse min k = delta - max_d ≥ -(n+m) - (n+m+1)/2 ≥ -(1.5)(n+m) → index ≥ offset - 1.5(n+m) = -0.5(n+m)... negative! Hmm. delta can be as low as -(m) e.g. n=0, m=1000: delta=-1000, max_d=500, reverse k min = -1500. offset=n+m+1=1001 → index -499 <0. Bad.

Use separate offsets: forward offset_f = max_d (k∈[-max_d, max_d] → index [0, 2max_d]). Reverse offset_r = max_d - delta (k∈[delta-max_d, delta+max_d] → index [0, 2max_d]). Both arrays size 2*max_d + 2. 

Now the algorithm, following Myers' paper precisely. I'll use the formulation from the paper (Section 4, "middle snake"):

```
Init: vf[1] = 0 (forward V with x-values), vr[1] = 0?? 
```

Paper's reverse uses x-values measured from the end: reverse furthest-reaching path stores "x" such that the reverse path endpoint in original coordinates is (N - x, M - y)? Many implementations store reverse progress as x-coordinate directly (the smallest x reachable on diagonal k going backward from (N,M)).

Let me instead use the well-tested formulation from James Coglan's "The Myers diff algorithm" blog series (Ruby), which is well-known correct:

```
def middle_snake(a, b)
  n = a.size; m = b.size
  max = n + m
  delta = n - m
  odd = delta.odd?
  vf = Array.new(2*max+... )
```

Coglan's version: forward V indexed 0..2*max? He uses vf[k] with k offset. Let me just reconstruct from first principles carefully, and verify logic mentally.

Forward Myers: Vf[k] = furthest x reached on diagonal k with d edit steps. Standard loop:

```
for d in 0..max_d:
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and Vf[k-1] < Vf[k+1]):
            x = Vf[k+1]
        else:
            x = Vf[k-1] + 1
        y = x - k
        px, py = x, y   # snake start (before diagonal moves)
        while x < n and y < m and a[x] == b[y]: x+=1; y+=1
        Vf[k] = x
        # snake from (px,py) to (x,y)
```

Reverse Myers: runs from (n, m) backward. Define Vr[k] = minimal x on diagonal k reachable moving backward with d reverse steps. Reverse moves: from (x, y), either move to (x, y-1) (deletion in reverse = "up") changing k by +1, or to (x-1, y) (insertion in reverse) changing k by -1, then extend diagonally backward while a[x-1]==b[y-1] decrementing.

Loop for reverse at depth d:

```
for k in range(delta-d? ...)
```

Reverse diagonals reachable: k ranges over [delta-d, delta+d]. Standard formulation: for k in range(delta+d, delta-d-1, -2)? Direction of iteration matters for correctness of reading neighbors? In reverse, to compute Vr[k] we look at Vr[k+1] (up move: y decreases, x same → k = x - y increases) and Vr[k-1] (left move: x decreases → k decreases). We want to maximize progress backward = minimize x. Choosing between moving up (from k+1: x stays, y = x-(k+1), then we go to y-1... hmm let me define carefully.

Reverse path: we track position (x, y) moving toward (0,0). A reverse step: 
- "down" move in paper terminology: delete: move from (x, y) to (x, y-1)? In forward, an insertion step moves (x,y)→(x,y+1) wait forward: horizontal move (x+1,y) = deletion (element of a consumed), vertical move (x,y+1) = insertion. Reverse: from (x,y) we can move up to (x, y-1) (undo insertion) — then diagonal k increases by 1 (since y decreased). Or move left to (x-1, y) (undo deletion) — k decreases by 1. Then extend diagonally backward: while x>0 and y>0 and a[x-1]==b[y-1]: x-=1, y-=1.

Vr[k] = minimal x on diagonal k reachable from (n,m) with d reverse steps.

Compute Vr[k] at depth d: we came from depth d-1 via either (x, y-1) from diagonal k-1? Wait: if we're at (x,y) on diagonal k and previous position was on diagonal k-1 with a vertical undo... Let's derive: previous point (x', y') at depth d-1, then one reverse non-diagonal move then diagonal slide. If previous on diagonal k-1: moving up (y-1) from (x', y') gives (x', y'-1) with k = x' - y' + 1 → x' = k + y' - 1... hmm messy. Alternative: previous (x', y') on diagonal k+1, move left to (x'-1, y'): new k = x'-1-y' = k+1 -1 = k. ✓. Or previous on diagonal k-1, move up to (x', y'-1): new k = x' - y' + 1 = k. ✓.

So Vr[k] = min( Vr[k-1] (then move up: x stays = Vr[k-1], y = x - k + ... ) hmm:

Case A (came from diagonal k-1 by moving up): previous point (x1, y1) with x1 - y1 = k-1, x1 = Vr[k-1] minimal. Move up: (x1, y1 - 1), now y = y1 - 1 = x1 - (k-1) - 1 = x1 - k. Then slide diagonally backward from (x1, x1 - k). x stays x1 before sliding.

Case B (came from diagonal k+1 by moving left): previous (x2, y2), x2 = Vr[k+1] minimal, x2 - y2 = k+1. Move left: (x2 - 1, y2), x = x2 - 1. 

So x before sliding: case A: x = Vr[k-1]; case B: x = Vr[k+1] - 1. We want minimal x (furthest backward). Choose B if Vr[k+1] - 1 < Vr[k-1], i.e., Vr[k+1] < Vr[k-1] + 1. Hmm, but also boundary conditions: at depth d, k ranges [delta-d, delta+d] step 2. When k = delta + d: only case A possible? k+1 = delta+d+1 not reachable at depth d-1... wait reachable k at depth d-1: [delta-(d-1), delta+(d-1)]. k = delta+d → k+1 out of range → must use case A (from k-1 = delta+d-1 ✓). When k = delta - d: k-1 = delta-d-1 out of range → must use case B (from k+1 = delta-d+1 ✓).

So:

```
if k == delta + d or (k != delta - d and Vr[k-1] < Vr[k+1] - 1):
    x = Vr[k-1]      # case A
else:
    x = Vr[k+1] - 1  # case B
```

Hmm wait check condition: choose case A when Vr[k-1] <= Vr[k+1] - 1 i.e. Vr[k-1] < Vr[k+1]. Let me redo: we pick the option giving smaller x. Case A x = Vr[k-1], case B x = Vr[k+1] - 1. Pick A if Vr[k-1] <= Vr[k+1] - 1 ⟺ Vr[k-1] < Vr[k+1]. Hmm but mirror of forward: forward picks x = Vf[k+1] when Vf[k-1] < Vf[k+1] (that gives smaller x since vertical move keeps x). Forward: case from k+1 (vertical, insertion) gives x = Vf[k+1]; from k-1 (horizontal) gives x = Vf[k-1]+1. Pick k+1 when Vf[k+1] <= Vf[k-1]+1 ⟺ Vf[k-1] >= Vf[k+1]?? The standard forward condition: `if k == -d or (k != d and Vf[k-1] < Vf[k+1]): x = Vf[k+1] else: x = Vf[k-1]+1`. So pick vertical (k+1) when Vf[k-1] < Vf[k+1]. Note Vf[k-1] < Vf[k+1] means Vf[k+1] >= Vf[k-1], and vertical x = Vf[k+1] ≤ horizontal x = Vf[k-1]+1 when Vf[k+1] ≤ Vf[k-1]+1. Both conditions: Vf[k-1] < Vf[k+1] → Vf[k+1] > Vf[k-1] → could be Vf[k+1] = Vf[k-1]+1 → tie, either fine. OK.

Reverse analog: pick case A (from k-1, x = Vr[k-1]) when Vr[k-1] < Vr[k+1]... let me verify with symmetry: reverse is mirror of forward on b (or swap roles). Under mirror, forward condition "k == -d or (k != d and V[k-1] < V[k+1])" maps to "k == delta+d or (k != delta-d and Vr[k-1] < Vr[k+1])"? Hmm let me just derive: pick A (x = Vr[k-1]) when Vr[k-1] <= Vr[k+1] - 1, i.e. Vr[k-1] < Vr[k+1] (integers) — hmm Vr[k-1] <= Vr[k+1]-1 ⟺ Vr[k-1] < Vr[k+1]. Wait Vr[k-1] ≤ Vr[k+1] - 1 ⟺ Vr[k-1] + 1 ≤ Vr[k+1] ⟺ Vr[k-1] < Vr[k+1]. Yes. And boundary: k == delta + d → must be A; k == delta - d → must be B. So:

```
if k == delta + d or (k != delta - d and Vr[k-1] < Vr[k+1]):
    x = Vr[k-1]
else:
    x = Vr[k+1] - 1
y = x - k
# slide backward
while x > 0 and y > 0 and a[x-1] == b[y-1]: x -= 1; y -= 1
Vr[k] = x
```

Initialization: Vr needs Vr[delta+1] and Vr[delta-1] at d=0... At d=0: k = delta only. Condition: k == delta + 0 = delta → true → x = Vr[delta-1]. Hmm that reads Vr[delta-1] which is unset. For forward at d=0, k=0: condition k == -d (0 == 0) true → x = Vf[1] (unset!). Standard fix: initialize Vf[1] = 0 (so x = 0, y = 0, then slide). Forward init: Vf[1] = 0. Then k=0, d=0: x = Vf[1] = 0 ✓.

Reverse init: at d=0, k=delta, condition k == delta+d → true → x = Vr[delta-1] (unset). Hmm. We want x = n (start at (n, m), no move, then slide backward). So init Vr[delta-1] = n. Check: x = n, y = x - delta = n - (n - m) = m ✓. Then slide backward. Good: initialize Vr[delta-1] = n.

Overlap detection: forward snake at depth d on diagonal k ends at (x, y) with furthest x. Reverse snake at depth d' on diagonal k ends at minimal x (its far end going backward; the snake spans from (x,y) to (x + len, y + len) in forward terms... careful). The reverse snake covers x-range [x_end_after_slide, x_before_slide]. Overlap between forward path (depth d, diagonal k, reaches x_f) and reverse path (depth d', diagonal k, whose snake covers interval [xr_low, xr_high] where xr_low = Vr[k] (minimal x after sliding) and xr_high = x before slide): they overlap if x_f >= xr_low? Standard check: forward path furthest x on diagonal k ≥ reverse path furthest x (minimal) on diagonal k → paths meet on diagonal k. More precisely the standard check used in implementations: `if odd and delta - (d - 1) <= k <= delta + (d - 1) and Vr[k] <= x` hmm but also need the reverse snake's extent... The commonly used condition (e.g., in Coglan's series): after computing forward snake at depth d, if delta is odd and k in [delta-(d-1), delta+(d-1)] and Vr[k] <= x (x = forward furthest): middle snake found. Note Vr[k] is the minimal x of the reverse snake on diagonal k; forward x ≥ Vr[k] means forward endpoint is at or beyond the reverse snake's backward end; since forward endpoint (x,y) and reverse snake covers x from Vr[k] up to (value before slide) on the same diagonal, and forward path reaches x ≥ Vr[k], the paths intersect within the reverse snake's diagonal run? Hmm: if forward endpoint x is ≥ Vr[k] but the reverse snake's diagonal run spans [Vr[k], x_high]; forward endpoint x could exceed x_high? x_high = x before slide = at most... The forward furthest-reaching x at depth d on diagonal k: can it exceed the reverse snake's top? Possibly, but the intersection point: forward path passes through all points on diagonal k from its snake start up to x_f. Reverse path passes through diagonal-k points from Vr[k] (its end after slide, which is the point reached after d' steps going backward... wait no).

Let me think again: reverse path of depth d' ends (going backward) at the point with x = Vr[k] on diagonal k. The path from (n,m) backward to (Vr[k], Vr[k]-k) — the last segment is the diagonal slide ending at (Vr[k], y). So the reverse path includes the diagonal-k points from Vr[k] up to x_slide_start. Forward path of depth d on diagonal k: its last segment is the diagonal slide from (px,py) to (x_f, y_f), so includes diagonal points from px to x_f, and the path includes point (x_f, y_f). Overlap condition standard: forward x_f ≥ Vr[k] and forward snake start px ≤ ... hmm, actually the standard simpler condition: Vr[k] ≤ x_f where also need forward path point on diagonal k with x in reverse snake's range. If x_f > x_slide_start(reverse top), is there still guaranteed intersection? Forward path on diagonal k covers [px, x_f] (via slide) plus the arrival point x_f itself came from k±1. Reverse covers [Vr[k], x_slide_start]. If x_f ≥ Vr[k] then intervals [px, x_f] and [Vr[k], x_slide_start] — x_slide_start ≥ Vr[k] always. If x_f ≥ Vr[k], intersection at max(px, Vr[k]) ≤ min(x_f, x_slide_start)? Need max(px, Vr[k]) ≤ min(x_f, x_slide_start). px ≤ x_f ✓. px ≤ Vr[k]? Not necessarily... but if px > Vr[k] then intersection needs px ≤ x_slide_start; px is forward's slide start on diagonal k... Hmm, is it guaranteed? In Myers' paper the check is simply: reverse furthest-reaching (in its direction) ≤ forward furthest-reaching, i.e., Vr[k] <= x_f. The paper proves paths overlap. Because if forward reaches x_f ≥ Vr[k] on diagonal k at depth d, and reverse reached Vr[k] ≤ x_f... The meeting point: take x* = max(px, Vr[k])? Hmm, actually the paths both are monotone; forward path on diagonal k occupies [px_f, x_f]; reverse path on diagonal k occupies [Vr[k], x_top]. We know x_f ≥ Vr[k]. Also x_top ≥ ... x_top is the reverse slide start which came from a k±1 position at depth d'-1. Hmm, could forward's diagonal-k interval [px_f, x_f] and reverse's [Vr[k], x_top] be disjoint with x_f ≥ Vr[k]? Disjoint means px_f > x_top (since x_f ≥ Vr[k], the only way disjoint is forward entirely above reverse: px_f > x_top). px_f = forward slide start = x at depth ≤ d... x_top = reverse slide start ≥ Vr[k]... Hmm is px_f > x_top possible? x_top = x before reverse slide = the point from which reverse slid down to Vr[k]. Reverse depth d' ≤ ceil((N+M)/2)... 

The paper's actual check (Myers 1986, section 4b): "If delta is odd and k ∈ [Δ-(d-1), Δ+(d-1)] and Vr[k] ≤ x_f... then the path P overlaps" — hmm, actually I recall the check is on the snake: forward snake (x,y)→(u,v) overlaps reverse when reverse's furthest reaching point on the same diagonal is within the snake's diagonal extent. Many implementations just check `Vr[k] <= x_f` and also implicitly the snake start? Let me look at known-good code: 

From "myers-diff" implementations (e.g., the well-known JavaScript one by TheJB4 / or the one in "diffs" library), middle snake:

```
function middleSnake(a, N, b, M) {
  const delta = N - M, odd = delta % 2 !== 0
  for (let d = 0; d <= Math.ceil((N + M) / 2); d++) {
    // forward
    for (let k = -d; k <= d; k += 2) {
      let x = ...
      let y = x - k
      let px = x, py = y? no...
      while (x < N && y < M && a[x] === b[y]) { x++; y++ }
      Vf[k+...] = x
      if (odd && delta - (d - 1) <= k && k <= delta + (d - 1) && Vr[k] !== undefined && Vr[k] <= x) {
        return { x: px?, ... } // length 2d - 1? 
      }
    }
    // reverse
    for (let k = delta + d? ... )
  }
}
```

The returned snake in forward check: snake from (x_at_k_arrival? ...). We need the snake endpoints for splitting: the middle snake is (px, py) → (x, y) where px,py is position after the non-diagonal move but before the slide? Or including? For splitting purposes, we split at the snake: recurse on prefix ending where snake starts and suffix starting where snake ends. The snake itself is all "=" lines. The D value = d + d' where d is current forward depth and d' = d - 1 (odd delta, forward check) or... For splitting we don't even need D except to decide termination. Actually we do need to know when to stop recursing: recurse while D > 1; the middle snake gives total D = 2d - 1 (odd delta, forward found) or 2d (even delta, reverse found). Then recurse on the two halves only if the corresponding half's D > 1? We can simply recurse on both halves and let the recursion handle trivial cases (equal → D=0; D=1 → handle directly). Actually simplest recursion: 

```
def rec(a0, n, b0, m):
    trim common prefix/suffix
    if n == 0: emit "+" for all b; return
    if m == 0: emit "-" for all a; return
    (d, snake info) = middle_snake(...)
    if d < 2? if d == 1... hmm d can't be... after trimming, if d==... 
```

Hmm, when D == 1 after trimming: sequences differ in exactly one edit; trimming common prefix/suffix leaves... e.g. a = ["x"], b = ["y"]: prefix none, suffix none. Middle snake: n=m=1, delta=0, even. d=0: forward k=0: x=0,y=0, slide fails (a[0]!=b[0]), Vf[0]=0. Reverse: d=0, k=0: x = Vr[-1] = n = 1, y = 1, slide fails, Vr[0]=1. Check overlap (even delta): reverse at depth d checked against forward at depth d: k=0 in [-d, d] = [0,0] ✓, Vf[0] = 0 ≥ Vr[0] = 1? Condition for even delta: reverse path (depth d) overlaps forward (depth d)? Hmm — even delta: forward check happens when? Let me get parities right.

From Myers paper: "If Δ is odd, the paths overlap on an even-numbered diagonal... " The forward search checks overlap after computing forward snakes at depth d, comparing against reverse snakes of depth d-1, when Δ is odd. The reverse search checks overlap after computing reverse snakes at depth d, comparing against forward snakes of depth d (same depth), when Δ is even. Yes: for even Δ, overlap occurs at odd total D = 2d, found in the reverse loop at depth d comparing with forward depth d (forward already computed at this d since forward loop precedes reverse loop in same iteration). For odd Δ, total D = 2d - 1... hmm wait D odd = 2d+1? Let me recompute: Δ odd, forward at depth d vs reverse at depth d-1: total D = d + (d-1) = 2d - 1. With d starting at 0: reverse depth -1 doesn't exist; forward at d=0 vs reverse at d=-1: no. At d=1: forward depth 1 vs reverse depth 0: D = 1 ✓ (odd). So forward check condition uses `delta - (d-1) <= k <= delta + (d-1)` with d ≥ 1. For d=0 skip check (d-1 = -1 range invalid). Good.

Even Δ: reverse at depth d vs forward at depth d: D = 2d. At d=0: reverse depth 0 vs forward depth 0: D = 0 → sequences equal. Check condition for reverse loop: k ∈ [-d, d] (forward reachable diagonals at depth d) and Vf[k] >= Vr[k]. At d=0, k=0: Vf[0] = 0 (after slide; if sequences fully equal, forward slide goes to x=n, Vf[0]=n), Vr[0] = 0 (after backward slide to 0). Condition Vf[k] >= Vr[k]: n >= 0 ✓ → middle snake = whole thing, D=0. Then handle: D == 0 → emit all "=".

So in even-delta reverse loop: overlap iff Vf[k] >= Vr[k]. And middle snake = the reverse snake just computed: from (x, y) backward to (x_end, y_end) where x,y are before-slide values and x_end,y_end after slide. In forward coordinates the snake goes from (x_end, y_end) to (x, y).

For odd delta forward check: after computing forward snake ending at (x, y) at depth d, check if k ∈ [Δ-(d-1), Δ+(d-1)] and Vr[k] ≤ x. The middle snake then is the forward snake from (px, py) to (x, y) where (px, py) is the position right after the non-diagonal step (before slide). D = 2d - 1.

Hmm wait, but we need the snake such that prefix has D-prefix = d-1 and suffix has reverse-depth d-1. The forward path at depth d consists of: path of depth d-1 to diagonal k±1, one non-diagonal move to diagonal k at (px,py), then slide to (x,y). The reverse path at depth d-1 ends at Vr[k'] for k' ∈ [Δ-(d-1), Δ+(d-1)]. Overlap: forward snake [px..x] on diagonal k contains a point also on reverse path of depth d-1. The reverse path of depth d-1 on diagonal k covers [Vr[k], x_top]. Condition Vr[k] ≤ x ensures intersection? As discussed, need the intersection point within forward snake too. The paper's correctness argument: since forward x ≥ Vr[k] and forward px... hmm. Actually I recall the precise check in Myers' paper (Figure 5? / section 4b pseudocode):

```
for d := 0 to ceil((M+N)/2):
  for k := -d to d in steps of 2 do
    ... compute V[k] forward ...
    if Δ odd and Δ-(d-1) ≤ k ≤ Δ+(d-1) and V'[k] ≤ V[k]... 
```

Hmm the paper: "if Δ is odd and k ∈ [Δ−(d−1), Δ+(d−1)] and the forward path on diagonal k overlaps the reverse path..." I think the condition is `V_reverse[k] <= V_forward[k]` evaluated with reverse values from depth d-1. And the claim is that this guarantees overlap of the *paths* (not just endpoints), because the forward furthest reaching path includes the full diagonal run [px, x] and reverse furthest reaching path includes diagonal run ending at Vr[k]... The intersection: consider point on diagonal k with x-coordinate x* = Vr[k]... reverse path contains point (Vr[k], y*). Does forward path contain it? Forward path reaches x_f ≥ Vr[k] on diagonal k at depth d; but the forward path's diagonal-k portion is [px, x_f]. If px ≤ Vr[k] ≤ x_f ✓ contains it. If px > Vr[k]: forward path doesn't contain x = Vr[k] on diagonal k. Then is there still overlap? Forward snake [px, x_f], reverse snake [Vr[k], x_top]. px > Vr[k]... need px ≤ x_top. Hmm. Note x_top ≥ x of reverse before slide. Hmm, I think in practice the condition Vr[k] ≤ x_f combined with the fact that both are furthest-reaching paths makes it work — this is what Myers' paper states and all implementations use. The subtlety: Vr[k] ≤ x_f means reverse endpoint is not ahead of forward endpoint; the reverse path's endpoint (Vr[k], y) — since forward path reaches (x_f, y_f) with x_f ≥ Vr[k] on same diagonal... The meeting point is (Vr[k], Vr[k]-k) if forward path covers it, i.e., if px ≤ Vr[k]. If px > Vr[k]: forward reached diagonal k at (px,py) from diagonal k-1 or k+1 at depth d-1, then slid forward. Meanwhile reverse path ends at Vr[k] < px. Reverse endpoint is "behind" the forward path's diagonal-k segment start. Hmm, then do the paths intersect? They must, since forward endpoint is beyond reverse endpoint on the same diagonal, and both paths are continuous monotone lattice paths from corners... Actually both paths: forward from (0,0) to (x_f, y_f), reverse from (n,m) to (Vr[k], y_r). Forward endpoint x_f ≥ Vr[k] means forward endpoint is at or past reverse endpoint along diagonal k. Two monotone paths, one from (0,0) reaching past the other's endpoint on the same diagonal, with total D = d + (d-1) ≤ D_min... they must cross? Not necessarily on diagonal k, but they must intersect somewhere. Hmm, actually the standard argument: the forward path of depth d and reverse path of depth d-1 together form a path of total cost d + d - 1 = 2d - 1 ≤ ceil stuff... and since D_min ≥ this... hmm, the check condition includes k in the reverse range ensuring they *can* connect. If Vr[k] ≤ x_f, we can connect forward path (depth d ending at (x_f,y_f) on diagonal k) with reverse path (depth d-1 starting... reverse path from (n,m) to (Vr[k], y_r)) — to connect we need a path from (x_f, y_f) to (Vr[k], y_r) going backward that's part of reverse path? Not quite.

OK, I'll trust the standard formulation — it's used everywhere and proven correct in the paper. Let me recall the paper's exact middle-snake pseudocode (from Myers 1986, Section 4B):

Actually the paper's version is a bit different: it runs forward and reverse alternately and checks after *each snake extension* using a condition involving the overlap of the *snake* with the reverse D-path, i.e., it checks whether the reverse furthest-reaching point on diagonal k lies within the current forward snake: `Vr[k]` (reverse, depth d-1) is within [px, x]? Hmm. Let me look at the paper text from memory: 

"If Δ is odd and k ∈ [Δ − (d − 1), Δ + (d − 1)] and V[k] ≥ ⌈x/2⌉... " no.

I remember Coglan's series "The Myers Diff Algorithm" part 4 implements exactly this. His code (translated):

```
def shortest_edit(a, b): ... 

def find_middle_snake(a, b):
    n, m = len(a), len(b)
    max_search = (n + m + 1) // 2  # wait he uses ceil((n+m)/2)
    delta = n - m
    odd = delta.odd?
    v = { 1 => 0 }
    w = { 1 => 0 }?? 
```

Coglan uses: forward v with initial v[1] = 0; reverse v (different array) with initial v[delta - 1] = n? Let me recall... In part 4, "find the middle snake": 

```
def middle_snake(a, b)
  n, m = a.size, b.size
  max = n + m
  delta = n - m
  odd = delta.odd?
  vf = Array.new(max + 2); vf[1] = 0
  vb = Array.new(max + 2); vb[delta + 1]?? 
```

Hmm honestly, let me just derive it fully myself and trust careful derivation, then sanity check on small examples mentally.

Plan: implement `_middle(a, n, b, m)` (subarray via indices into full lists a, b with offsets a0, b0 — I'll pass slices? Slicing copies; for recursion depth O(D) with total O((N+M)D)... slicing cost O(size) per node, total O((N+M) log D)? number of nodes O(D), each slice O(size) → could be O((N+M) D) worst again. Use index-based access with offsets to avoid copying. I'll pass (a, a0, n, b, b0, m) and index a[a0 + x].

Middle snake function returns (D, sx, sy, ex, ey) — snake start and end in local coordinates.

Forward loop:

```
offset_f = max_d  (index = k + offset_f)
vf = [0] * (2 * max_d + 3)
vf[offset_f + 1] = 0
vr = [0] * (2 * max_d + 3)
vr[offset_f + delta - 1] = n   # careful: reverse index uses same offset? reverse k range [delta-max_d, delta+max_d]; index k + offset_f ranges [delta, delta + 2*max_d] ⊂ [-(m) ... 2max_d + n - m]. Need offset_f + delta - 1 ≥ 0: max_d ≥ (n+m+1)/2, delta - 1 = n - m - 1 ≥ -(m+1); offset_f + delta - 1 ≥ (n+m+1)/2 - m - 1 = (n - m - 1)/2 ≥ -0.5. If n - m odd negative, (n-m-1)/2 < 0! e.g. n=0, m=1: delta=-1, max_d = 1, offset_f + delta - 1 = 1 - 1 - 1 = -1 < 0. Problem.
```

So use separate offset for reverse: offset_r = max_d - delta. Then reverse index = k + offset_r ∈ [0, 2*max_d]. vr[offset_r + delta - 1] = vr[max_d - 1] = n. Good.

Forward at d:

```
for k in range(-d, d + 1, 2):
    idx = k + offset_f
    if k == -d or (k != d and vf[idx - 1] < vf[idx + 1]):
        px = vf[idx + 1]          # x after non-diagonal move
    else:
        px = vf[idx - 1] + 1
    py = px - k
    x, y = px, py
    while x < n and y < m and a[a0 + x] == b[b0 + y]:
        x += 1; y += 1
    vf[idx] = x
    if odd and d >= 1 and delta - d + 1 <= k <= delta + d - 1:
        idxr = k + offset_r
        if vr[idxr] <= x:
            return (2*d - 1, px, py, x, y)
```

Wait, forward check should compare against reverse values from depth d-1. vr currently holds reverse values for depth d-1 (computed in previous iteration of outer loop) plus initialization. But note: during the outer loop iteration d, we compute forward first, then reverse — so when checking forward at depth d, vr holds depth-(d-1) values ✓ for odd delta. But vr[idxr] may hold a stale/zero value for k outside reverse's computed range [delta-(d-1), delta+(d-1)] — that's why we check k in that range first ✓ (condition `delta - d + 1 <= k <= delta + d - 1` is exactly [Δ-(d-1), Δ+(d-1)]).

But careful: vr was initialized only at [offset_r + delta - 1]; other entries are 0 (default). With the range check, k is within reverse's depth-(d-1) reachable range, so vr[idxr] was computed... except at d=1: reverse range at depth 0 = [Δ, Δ] only; k must equal Δ. vr[offset_r + Δ] = vr[max_d]... wait offset_r + Δ = max_d - Δ + Δ = max_d. Hmm but we initialized vr[offset_r + delta - 1] = vr[max_d - 1] = n. At d=1, k=Δ: check condition k ∈ [Δ-0, Δ+0] ✓, vr[max_d] ≤ x? vr[max_d] is unset (=0)! But reverse at depth 0 computes Vr[Δ] in the outer loop d=0 reverse phase. So at outer iteration d=0 we compute reverse depth 0: Vr[Δ] = after-slide minimal x. Then at d=1, vr[max_d] holds it ✓. But wait — we initialize vr[offset_r + delta - 1] = n so that the d=0 reverse computation works (reading vr[offset_r + delta - 1] as Vr[Δ-1]). And after computing reverse depth 0, vr[offset_r + delta] = Vr[Δ] ✓.

Hmm wait, in reverse d=0: k = Δ only (range(delta+d, delta-d-1, -2) = range(Δ, Δ-1, -2) = [Δ]). Condition: k == delta + d → true → x = vr[idx of (k-1)] = vr[offset_r + Δ - 1] = n ✓. Good.

Reverse loop at depth d (computed after forward at depth d):

```
for k in range(delta + d, delta - d - 1, -2):
    idx = k + offset_r
    if k == delta + d or (k != delta - d and vr[idx - 1] < vr[idx + 1] - 1):
        px = vr[idx - 1]      # hmm naming; this is x after the undo move
    else:
        px = vr[idx + 1] - 1
    y = px - k
    x, y = px, y
    while x > 0 and y > 0 and a[a0 + x - 1] == b[b0 + y - 1]:
        x -= 1; y -= 1
    vr[idx] = x
    if not odd and -d <= k <= d:   # even delta: check overlap with forward depth d
        idxf = k + offset_f
        if vf[idxf] >= x:   # forward furthest x ≥ reverse minimal x
            return (2*d, x, y, px, y?) 
```

Wait even-delta check: reverse at depth d overlaps forward at depth d (forward already computed in this outer iteration). Condition: k ∈ [-d, d] and vf[idxf] ≥ vr_new? The standard condition: forward furthest-reaching x on diagonal k ≥ reverse furthest-reaching (minimal x) on diagonal k → overlap. Actually careful: overlap requires forward path to cover the point where reverse path ends or passes... The standard implementations check `vf[k] >= x` where x is the reverse value after slide? or before slide? Hmm. Reverse snake spans [x_after_slide, x_before_slide] on diagonal k. Forward furthest x_f. Overlap iff x_f ≥ x_after_slide AND ... forward snake start px_f ≤ x_before_slide? Let me think about what's correct with the reverse check: we want the paths to share a point. Reverse path on diagonal k occupies [x_after, x_before] (the slide) plus arrives at x_after from k±1... wait reverse path ENDS at (x_after, y_after). Its diagonal-k portion is the final slide: [x_after, x_before]. Forward path on diagonal k occupies [px_f, x_f] (final slide) — wait forward path's diagonal k portion: forward path reaches diagonal k via a move from k±1, then slides: occupies [px_f, x_f] where px_f is after the non-diag move. So overlap on diagonal k iff intervals [px_f, x_f] and [x_after, x_before] intersect. Condition used in implementations: `vf[k] >= x_after`? That alone isn't sufficient as discussed (px_f could be > x_before). Hmm, but wait: in the even case, is x_before ≥ px_f guaranteed? x_before is reverse position before slide = point reached after the undo move at depth d, i.e., it came from diagonal k±1 at depth d... hmm no: x_before is x right after the undo move at depth d on diagonal k, coming from depth d-1 diagonal k∓1. Hmm.

Let me think about the actual claim: D_min = 2d means there's a path of cost 2d. Forward furthest reaching at depth d: reaches x_f on diagonal k. Reverse furthest reaching (minimal x) at depth d: x_after on diagonal k. If x_f ≥ x_after, then... the forward path of depth d reaches (x_f, y_f); the reverse path of depth d reaches (x_after, y_after) with x_after ≤ x_f. Claim: they overlap. Standard proof: Suppose x_f ≥ x_after. The reverse path endpoint (x_after, y_after) is at depth d from (n,m). The forward path endpoint (x_f, y_f) is at depth d from (0,0). Consider... if forward path passes through reverse endpoint, done. Otherwise... Hmm, alternative: consider the forward path's diagonal-k segment [px_f, x_f] and reverse's [x_after, x_before]. We know x_f ≥ x_after. If px_f ≤ x_before, intervals overlap? [px_f, x_f] ∩ [x_after, x_before]: need px_f ≤ x_before and x_after ≤ x_f ✓. So overlap iff px_f ≤ x_before (given x_f ≥ x_after). Is px_f ≤ x_before guaranteed? px_f = x-coordinate where forward path arrived on diagonal k (after non-diag move at depth d). x_before = x-coordinate where reverse path arrived on diagonal k (after undo move at depth d). Hmm, both are "arrival" points. Not obviously ordered.

Hmm, but actually maybe the correct standard condition is different. Let me recall Coglan's part 4 code exactly. I've seen it:

```
def find_middle_snake(a, b)
  n, m = a.size, b.size
  max = n + m
  delta = n - m
  odd = delta.odd?
  v = { 1 => 0 }
  if odd
    w = { delta... }? 
```

Hmm. Let me instead recall from the actual paper (I have decent memory of it):

Myers 1986, Section 4B "linear space refinement":

```
Δ ← N − M.
For D ← 0 to ⌈(M+N)/2⌉ Do
    For k ← −D to D in steps of 2 Do
        If Δ is odd and k ∈ [Δ − (D − 1), Δ + (D − 1)] Then
            Find the end of the furthest reaching forward D-path on diagonal k:
            ...
            If its snake overlaps the furthest reaching reverse (D − 1)-path on diagonal k Then
                Return the middle snake.
    For k ← Δ + D? ... 
```

Hmm, actually I believe the paper does:

```
For D ← 0 to ⌈(M+N)/2⌉ Do
  For k ← −D to D in steps of 2 Do
    If Δ is odd and k ∈ [Δ−(D−1), Δ+(D−1)] Then
      Determine the furthest reaching reverse (D−1)-path on diagonal k.
      If this path overlaps the furthest reaching forward D-path on diagonal k then
        return the middle snake (i.e., the overlapping snake).
  For k ← Δ−D to Δ+D in steps of 2 Do
    If Δ is even and k−Δ ∈ [−D, D] Then
      Determine the furthest reaching reverse D-path on diagonal k.
      If this path overlaps the furthest reaching forward D-path on diagonal k then
        return the middle snake.
```

So the overlap check is between snakes (diagonal runs), not just endpoints: "If this path overlaps the furthest reaching forward D-path on diagonal k" — the overlap test should check whether the diagonal runs intersect. But the paper says the overlap occurs iff the endpoints satisfy the ordering — actually in the paper, Lemma: the paths overlap iff V_forward[k] ≥ V_reverse[k] (with appropriate orientation). Hmm, the paper states in section 4A (for the simple version): "the overlap condition is V[k] ≥ x" style. Let me reason more rigorously for the even case:

Even Δ, depth d, diagonal k. Forward furthest-reaching d-path ends at (x_f, y_f) on diagonal k, with final snake [px_f, x_f]. Reverse furthest-reaching d-path (minimal x) ends at (x_r, y_r), x_r = vr[k], with final snake [x_r, xb_r] (xb_r = x before backward slide). 

Claim: paths overlap iff x_f ≥ x_r? Hmm consider counterexample attempt: forward d-path on diagonal k arrived via vertical move from diagonal k-1 at depth d-1: px_f = vf[k-1] (depth d-1 value). Its slide extends to x_f. Reverse d-path arrived via... x_before = arrival x. Suppose x_f ≥ x_r but px_f > xb_r. Then forward diagonal-k run [px_f, x_f] lies strictly above reverse's [x_r, xb_r]. Do the full paths intersect elsewhere? Forward path = (d-1)-path on diagonal k-1 + vertical move + slide. Reverse path = (d-1)-path on diagonal k+1 + left move + backward slide. Hmm, forward path's earlier portion is on diagonals < k region (it reached k-1 then k). Reverse path's earlier portion on diagonals > k. The forward path at depth d-1 on diagonal k-1 reaches x = vf[k-1]; reverse at depth d-1 on diagonal k+1 reaches x_r' = vr[k+1] (minimal). Forward endpoint on k-1: (vf[k-1], vf[k-1] - (k-1)). Reverse endpoint on k+1: (vr[k+1], vr[k+1]-(k+1)). Then vertical move: forward goes from (vf[k-1], vf[k-1]-k+1) to (vf[k-1], vf[k-1]-k) = (px_f, py_f) — so px_f = vf[k-1]. Left move: reverse from (vr[k+1], vr[k+1]-k-1) to (vr[k+1]-1, ...) so x_before = vr[k+1] - 1.

For paths to intersect we'd need... both paths have total depth 2d = D_min (even Δ). Hmm, if they don't intersect, is that possible while x_f ≥ x_r? Total: forward path P1 from (0,0) to (x_f,y_f), reverse path P2 from (n,m) to (x_r,y_r) with x_r ≤ x_f, same diagonal. If P1 ∪ P2 don't intersect: consider... P2 endpoint is on diagonal k at x_r ≤ x_f = P1 endpoint on diagonal k. P1 must cross diagonal k at exactly [px_f, x_f]. P2 crosses diagonal k at exactly [x_r, xb_r]. Non-intersection requires px_f > xb_r (P1's k-run entirely above P2's k-run). Possible? px_f = vf_{d-1}[k-1], xb_r = vr_d[k+1] - 1.

Hmm, let me think whether the paper's algorithm would then miss the middle snake at depth d but find it elsewhere... Actually maybe in that scenario the true middle snake is found with a different (k, d) pairing. This is getting deep; I'll trust the standard implementation which is well-tested (e.g., used in git's xdiff? git uses a variant). Let me just recall concrete known-good code. 

Known-good implementation I can reproduce from memory — "Myers' diff algorithm in Python" from the article by "Robert G" or the popular gist:

```
def find_middle_snake(a: list, b: list):
    n, m = len(a), len(b)
    max_d = (n + m + 1) // 2
    delta = n - m
    odd = delta % 2 == 1
    # V arrays with offset
    vf = {...}
```

Alternatively, I recall the pseudocode from the paper verbatim-ish (Section 4B):

```
Δ ← N − M
For D ← 0 to ⌈(M+N)/2⌉ Do
    For k ← −D to D in steps of 2 Do
        If Δ is odd and k ∈ [Δ−(D−1), Δ+(D−1)] Then
            If V[k] ≤ ... 
```

OK here's another approach to sidestep all this fiddly correctness: implement forward-only Myers O(ND) with trace storage, but bound memory by storing traces compactly using arrays of small ints via `array` module ('i' typecode, 4 bytes each). For D=2000, N+M=2000: per step d store the V array (window). Total ints = sum over d of (2d+1) ≈ D² ≈ 4M ints * 4 bytes = 16MB with array module. That's fine! And forward-only Myers is dead simple and provably correct:

```
def myers(a, b):
    n, m = len(a), len(b)
    offset = n + m  # k ranges [-D, D] ⊂ [-(n+m), n+m]
    v = [0] * (2 * (n + m) + 1)  # hmm v[k+offset] = furthest x on diagonal k
    v[offset + 1] = 0
    trace = []
    for d in range(n + m + 1):
        trace.append(v.copy())  # store state BEFORE? standard: store copy of v before processing d? We store snapshot before updating so we can backtrack: at each d, the values used are from d-1... store v (state at start of loop body, i.e., after d-1 updates) 
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and v[k - 1 + offset] < v[k + 1 + offset]):
                x = v[k + 1 + offset]
            else:
                x = v[k - 1 + offset] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[k + offset] = x
            if x >= n and y >= m:
                # done, D = d
                return d, trace
        # also handle... 
    ...
```

Backtracking: from final state, walk back: at step d, for diagonal k, we know x = v_d[k] (final position after slide). To find previous: y = x - k; determine whether came from k+1 (vertical) or k-1 (horizontal): using snapshot before step d (trace[d] holds v after step d-1... let me define trace[d] = copy of v at start of iteration d, i.e., values after steps 0..d-1; but careful: v[k+1] at iteration d for k+d... within iteration d, when computing k, v[k+1+offset] was set at iteration d-1 (since k+1 has same parity as k±... k+1 parity differs from k by 1: at iteration d-1, computed diagonals k' with k' ≡ d-1 mod 2 and |k'| ≤ d-1; k+1 with k ≡ d mod 2 → k+1 ≡ d-1 mod 2 ✓ and |k+1| ≤ d+1... k+1 ≤ d+1 but need ≤ d-1: k ≤ d-2; when k == d, k+1 = d+1 not computed at d-1 — but condition handles k == d via k == -d or ...: when k == d, the condition `k != d` fails → x = v[k-1]+1 ✓. When k == -d: x = v[k+1]+... uses v[k+1] where k+1 = -d+1 which was computed at d-1 ✓.)

Standard backtrack:

```
def backtrack(d, trace, ...):
    x, y = n, m? 
    actually start from the state after final step: we know final v after step d_final. Use trace: for step in range(d_final, 0, -1):
        v_prev = trace[step]  # state before step `step` = after step-1
        k = x - y
        # determine prev k: same logic as forward:
        if k == -step or (k != step and v_prev[k - 1 + offset] < v_prev[k + 1 + offset]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v_prev[prev_k + offset]; prev_y = prev_x - prev_k
        # the snake from (prev_x, prev_y) to (x, y)?? 
```

Hmm, careful: at step `step`, position after slide on diagonal k is (x, y) — but the slide may have length 0, and the arrival point before slide is (x - slide_len, y - slide_len). The path: prev point (prev_x, prev_y) on diagonal prev_k at step-1 → one move → (ax, ay) on diagonal k → slide → (x, y). We reconstruct by: prev_x = v_prev[prev_k + offset], prev_y = prev_x - prev_k. Then the move: if prev_k == k - 1 (horizontal move): (prev_x+1, prev_y) → diagonal k ✓. If prev_k == k + 1 (vertical): (prev_x, prev_y+1). Then slide from that point to (x, y): all equal lines → emit "=" for a[ax..x). Wait but we need to know the slide endpoints: slide goes from (ax, ay) to (x, y) where ax,ay = arrival point. ax = prev_x + (1 if horizontal else 0), ay = prev_y + (1 if vertical else 0). And (x, y) is the stored final position. But during backtrack we know x,y at each step: start (x,y) = final (n, m)?? Not exactly — final step ends when x ≥ n and y ≥ m; the final position might have x > n? No: slide stops when x == n or y == m, so x ≤ n, y ≤ m, and at least one equals its bound. Final position (x_f, y_f) with x_f ≤ n, y_f ≤ m. Then remaining lines: a[x_f:] are "-"? No wait — the edit script from path: the path from (0,0) to (x_f, y_f) covers only part... hmm, no: the furthest reaching path at D ends when x≥n and y≥m — the slide continues while x<n and y<m; ends when x==n or y==m; but we need both ≥. Since the check is after slide: x ≥ n and y ≥ m. Slide stops at x==n or y==m; if x==n but y<m, then... the check x>=n and y>=m requires y≥m too. Since slide stops when either hits bound, x≥n and y≥m both true means slide ended exactly with x==n and y==m? If x==n and y<m: check fails, continue searching other k... but can the path continue from (n, y<m)? Further moves would be horizontal (x+1 > n) impossible... diagonal impossible (x==n). Vertical possible: y+1 — that's an insertion of b[y]. So path continues via vertical moves until y==m. Hmm, but the standard algorithm's termination: `if x >= n and y >= m: return`. The path may end at x==n,y==m exactly? With slide: from (x,y) slide while x<n and y<m. If x==n and y<m after slide... then check fails and we continue. Eventually some k reaches (n, m). Actually can x exceed n? Horizontal move: x = v[k-1]+1 ≤ n? v values ≤ n always since slide stops at x==n (can't exceed). Vertical move: x = v[k+1] ≤ n ✓. y = x - k could exceed m? Vertical: y = v[k+1] - k; with k < ... hmm y can exceed m? Slide stops when y==m; y after slide ≤ m. Before slide y = prev_y + 1 ≤ m? prev_y ≤ m - ... could prev_y == m already? prev point at depth d-1 with y == m: then vertical move y+1 > m. Hmm, can a point have y > m? Only if we allow vertical moves from y == m. Let's guard: in the k-loop, when computing x from v[k+1] (vertical), the resulting y = x - k; if the previous point had y == m and we do vertical, y = m+1 > m. Standard implementations just check x >= n and y >= m at the end and don't worry; intermediate overshoot: y could become m+1? Let's see: v[k+1] = x1, prev point (x1, y1), y1 = x1 - (k+1). Vertical → (x1, y1 + 1), new diagonal k: y = y1 + 1 = x1 - k. For y to exceed m we'd need y1 + 1 > m, i.e., previous point already at y == m. But previous point with y == m at depth d-1 would have triggered termination check (x ≥ n needed too; x1 might be < n so not terminated). Then vertical move to y = m+1: that's inserting b[m] — out of bounds! Standard Myers doesn't guard this because... hmm, actually it can't happen that we'd *want* that path: if previous point has y == m and x < n, remaining edits are all deletions (horizontal moves), going to k-1 branch... but the algorithm computes for all k in range including paths that overshoot. Overshooting y > m: those paths are garbage but harmless as long as termination check and backtracking remain correct — the final answer path found satisfies x ≥ n and y ≥ m; slide ends with x ≤ n... wait if y overshot to m+1, slide condition y < m fails immediately, so point (x, m+1) stored with y > m. Then termination check y >= m true, x >= n maybe true. Then backtrack would produce insertion of b[m]?? That would be wrong (index out of range when emitting "+" for b[m]).

Hmm, but actually can such a state win the race? The path with y = m+1 used an insertion beyond b's end — that's an invalid path. To be safe, guard vertical/horizontal moves: only allow vertical move if y1 + 1 ≤ m i.e. y1 < m, and horizontal if x1 + 1 ≤ n. But standard Myers relies on the fact that a furthest-reaching path never needs to overshoot... Let me think: does the standard algorithm ever produce y > m in v? The condition x >= n and y >= m terminates at the first d where ANY k reaches it. Paths that overshoot have strictly more non-diagonal moves than necessary? A path reaching (x, m+1): compared to reaching (x, m)... The overshoot path has an insertion of a line beyond b — such a path corresponds to a script that deletes/inserts b[m+1] which doesn't exist. Hmm.

In practice, standard implementations (e.g., the widely-copied one) don't guard and are considered correct. Why: because to reach y = m+1, the path did a vertical move from a point with y = m. That point (x, m) at depth d-1 — if x ≥ n too, we'd have terminated already. So x < n. The vertical move makes y = m+1; then slide can't proceed (y < m false... slide requires y < m: y = m+1 fails). Stored v[k] = x with y = x - k = m+1. For termination we need x ≥ n as well. Possible. Then backtrack: at the last step, we'd emit... the path from (x_prev, m) vertical to (x, m+1): that's insertion of b[m] — out of range bug. Hmm, wait but is it possible for such an invalid path to be the FIRST to satisfy the termination check? The check happens per (d, k) inside the loop; the first k in the loop at the smallest d. The valid path reaching exactly (n, m) at depth d... at the same d, could an invalid path at smaller k be checked first and trigger termination? If invalid path triggers at same d but earlier in the k-loop, we'd return a wrong script. Hmm. But actually, wait: if the path is at (x, m+1) with x ≥ n... For the valid path at (n, m): exists at depth d. Hmm.

Let me think about whether overshoot can even occur. v[k] stores furthest x on diagonal k. Points with y > m: y = x - k > m. For the algorithm to compute v[k] via vertical from v[k+1]: x = v[k+1], y = x - k = (v[k+1] - (k+1)) + 1 = y_prev + 1. If y_prev == m (point (v[k+1], m) with v[k+1] < n), then new point (v[k+1], m+1). This requires that at depth d-1, diagonal k+1 had a furthest-reaching point with y == m and x < n. Is that possible without having terminated? Point (x, m) with x < n at depth d-1: termination check at depth d-1 for that k: x ≥ n false → no termination. So yes, such points exist (e.g., b exhausted). Then at depth d, diagonal k = (x) - (m+1)... the algorithm would compute v[k] = x with y = m+1. But note: is this k within the loop range and does the branch selection pick the vertical predecessor? The branch picks vertical (x = v[k+1]) when v[k-1] < v[k+1] (or k == -d). Possible.

Then slide from (x, m+1): while x < n and y < m — fails. v[k] = x, y stays m+1 conceptually. Termination check: x ≥ n and y ≥ m → if x ≥ n: terminates with a path that inserts b[m]. BUG in naive implementations? But wait — maybe it can't happen because for x ≥ n with y = m+1... let's see: point (x, m) at depth d-1 with x < n. Vertical move at depth d → (x, m+1), x < n. Then termination needs x ≥ n — false. So no termination from an overshoot point unless slide moved x... slide requires y < m — false, no movement. So overshoot points have x < n... wait not necessarily: point (x, m) at depth d-1 could have x ≥ n? If x ≥ n and y = m, termination already happened at depth d-1. So before termination, all points with y == m have x < n. After vertical move: (x, m+1), x < n. Termination check: x ≥ n false. So overshoot points never trigger termination ✓. But they still pollute v[k], and subsequent steps use them: from (x, m+1) can only... any path through (x, m+1): diagonal impossible (y ≥ m... slide needs y<m: no), horizontal → (x+1, m+1): x+1 might reach n eventually, then y = m+1 ≥ m and x ≥ n → TERMINATION with invalid path! Wait horizontal moves from overshoot points: at depth d+1, k-1... from (x, m+1) horizontal → (x+1, m+1), y stays m+1. Eventually x = n with y = m+1 ≥ m → termination check x ≥ n and y ≥ m → TRUE. Termination with overshoot!

Is this reachable before the valid path terminates? The valid path reaching (n, m) exists at some depth D_valid. The overshoot path reaching (n, m+1) — its depth: it inserted b[m] extra, so depth = D_valid + 1? Hmm, the overshoot path and valid path: overshoot path = valid path to (x, m)?? Not necessarily. Let's construct: a = ["a"], b = ["a", "b"]? n=1, m=2. d=0: k=0: x=0,y=0, slide: a[0]==b[0] → x=1,y=1; slide stop (x==n). v[0]=1. Check x≥n (1≥1) and y≥m (1≥2) false. d=1: k=-1: x = v[0] = 1 (k==-d → vertical: x = v[k+1] = v[0] = 1), y = x - k = 2. Slide: x<n? no. v[-1] = 1. Check x≥n ✓ y≥m ✓ → terminate. Path: from (0,0) slide to (1,1) [= "a"], vertical to (1,2) [insert "b"]. Valid! No overshoot here because y went to exactly m. 

Overshoot: need point with y == m and x < n, then vertical. E.g., a = ["a","c"], b = ["a"]: n=2, m=1. d=0: k=0: slide → x=1,y=1 (a[0]==b[0]), stop (y==m). v[0]=1. Check x≥2? no. d=1: k=1: horizontal: x = v[0]+1 = 2, y = 2-1 = 1. Slide: y<m? y==1==m, no. v[1] = 2. Check x≥n ✓, y≥m ✓ → terminate. Path: slide to (1,1) [= "a"], horizontal to (2,1) [delete "c"]. ✓. What about k=-1 at d=1: vertical: x = v[0] = 1, y = 1 - (-1) = 2 > m! Overshoot: point (1, 2). v[-1] = 1. But k=1 was processed first (loop order k=-d..d step 2: k=-1 first, then k=1). At k=-1: check: x≥n? 1≥2 no. Then k=1 terminates correctly. OK.

Could overshoot terminate first? Overshoot termination requires reaching x ≥ n, y = m+1 via horizontal moves after overshoot — those cost extra moves. The valid path to (n,m) — hmm, does a valid path always exist at depth ≤ overshoot-path depth? The overshoot path P': ... → (x0, m) → (x0, m+1) → ... → (n, m+1). Its depth: d'. The corresponding path P: ... → (x0, m) → horizontal moves → (n, m), depth = d' - 1 (one fewer insertion). So P reaches (n, m) at depth d' - 1 < d'. Termination happens at the first (d, k) with x≥n,y≥m. At depth d'-1, when the k-loop processes P's final diagonal... P ends at (n, m): k_P = n - m. Is P the furthest-reaching path on diagonal k_P at depth d'-1? Not necessarily — v[k_P] might be set by a different path, but SOME furthest-reaching path on that diagonal reaches x ≥ n... v[k_P] = furthest x on diagonal k_P ≥ n?? v[k_P] ≤ n always (slide stops at x == n; horizontal move x = v[k-1]+1 — could exceed n? v[k-1] ≤ n... if v[k-1] == n then horizontal gives x = n+1 > n! Hmm: point with x == n and y < m at depth d-1, then horizontal move → x = n+1. Another overshoot! Similarly guarded? Let's check: point (n, y) with y < m: from there, valid continuation is vertical only. Horizontal would be deleting a[n] — invalid. Overshoot x = n+1.)

Hmm OK so both overshoot types exist in the standard algorithm. Question: can an overshoot path trigger the termination check before a valid path does? Overshoot to (n+1, y) with y ≤ m: termination check y ≥ m needed: y must == m. So point (n+1, m): from (n, m)... but (n, m) terminates immediately at the depth it's reached. Before termination, point (n, y<m) exists; horizontal → (n+1, y), y < m → no termination. Then vertical from (n+1, y) → (n+1, y+1)... slide blocked? Slide needs x<n: false. So from (n+1, y): only horizontal (x+1, y) or vertical (n+1, y+1); to get y to m: vertical moves. Path: (n, y0) → (n+1, y0) → vertical steps → (n+1, m). Depth: 1 + (m - y0). Valid path: (n, y0) → vertical steps → (n, m): depth m - y0. So valid terminates at depth m - y0, strictly less. Similarly for y-overshoot: overshoot path (x0, m) → (x0, m+1) → horizontal → (n, m+1): depth 1 + (n - x0); valid: (x0, m) → horizontal → (n, m): depth n - x0. Strictly less. 

But subtle: the overshoot path at depth d'-1 might not be exactly "valid path + 1 extra move" — the point (x0, m) itself is at depth d-1, and the valid path from (x0, m) to (n, m) has n - x0 horizontal moves (no diagonals since y==m blocks slide? slide needs y<m — blocked. And diagonals from (x0,m) need y<m... diagonal move keeps... slide is the diagonal; from y==m no slide; so all remaining moves horizontal ✓ depth n - x0). So valid path total depth = (d-1) + (n - x0). Overshoot total = (d-1) + 1 + (n - x0) + ... wait overshoot from (x0, m): vertical → (x0, m+1) [1 move], then horizontals to (n, m+1) [n - x0 moves], then need y ≥ m ✓ and x ≥ n ✓ → terminates at depth d + (n - x0) where d = depth of (x0,m) + 1. Valid terminates at (d-1) + (n - x0) < d + (n - x0) ✓. But — does the valid path actually get STORED/reached? v[k] stores furthest x; the valid path's endpoint (n, m): at its depth, diagonal k = n - m, the loop processes k = n - m (if |k| ≤ d) and computes v[k] ≥ n... termination check x ≥ n and y ≥ m: the furthest-reaching path on diagonal k=n-m at that depth ends at x ≥ n? Hmm, v[k] is furthest x; the path achieving it — does it satisfy y ≥ m? On diagonal k = n - m, y = x - k; x ≥ n → y ≥ n - k = m ✓. And v[k] could be n+1 (overshoot) but we showed overshoot terminates later. Termination check uses the CURRENT computed (x, y) after slide for that k: x = v-computed value, y = x - k. If x = n+1 (overshoot at that diagonal): y = n+1 - (n-m) = m+1 ≥ m, x ≥ n → would terminate with invalid!! But we showed overshoot reaching (n+1, ...) requires more depth. At the depth where valid path first reaches (n, m) [depth D = minimal], could diagonal k = n-m's furthest-reaching x be n+1? Furthest x on diagonal k=n-m at depth D: paths on this diagonal of depth D... valid path ends at x = n. Could another path of depth D on the same diagonal reach x = n+1? It would reach (n+1, m+1) at depth D. But we showed any path to (·, m+1) with x ≥ n has depth ≥ (depth of valid) + 1? Let me redo: path reaching (n+1, m+1) with depth D. Consider dropping... hmm, general argument: any path reaching (n+1, m+1) has depth ≥ D + 2? Path to (n+1, m+1): remove... it must pass through (n+1, m) or (n, m+1) last. Path to (n, m+1): depth ≥ D+1 (shown: ≥ depth to (x0, m) + 1 + (n - x0) ≥ D + 1 where D = depth of valid = min over paths... hmm need care: path to (n, m+1) passes through some (x0, m) last time it's on row m? The path reaches y = m+1 at some point via vertical from (x0, m). Before that, path reached (x0, m) at depth d0. Then one vertical + (n - x0 - slide?) horizontals... after (x0, m+1), slide blocked, so horizontals only: n - x0 moves. Total ≥ d0 + 1 + (n - x0). And d0 ≥ depth of furthest reaching (x0, m) ≥ depth of valid path prefix... valid path reaches (x0, m)?? Does the valid path pass through (x0, m)? The valid path ends at (n, m) with its last row-m contact... valid path reaches row m for the first time at some point and stays... hmm, valid path could go up and down? No — monotone: y never decreases. Valid path reaches y = m and then never leaves row m (y ≤ m always). So valid path passes through every (x, m) for x from (first x where it hits row m) to n. In particular through (x0, m) if x0 ≥ x_first. If x0 < x_first: then valid path hit row m at x_first > x0... but path to (n+1, m+1) passes through (x0, m) at depth d0 and then vertical+horizontals. Hmm, alternatively compare with valid path directly: depth of valid path D. Claim: depth of any path to (n+1, m+1) ≥ D + 2? Consider path Q to (n+1, m+1) with depth q. Edit script: q non-diagonal moves. Q's script inserts/deletes lines of a and b; it "inserts b[m]" (the vertical move creating y = m+1 from y = m happens at some point... every path to y = m+1 has a vertical move landing on y = m+1 from (x0, m), which is an insertion of b[m] — but b[m] is the last line; the script corresponding to Q inserts b[m] somewhere and also has other moves. Now construct script from Q's script by removing the insertion of b[m]: does it yield a valid path to (n, m+... hmm removing that insertion: the path becomes: ... up to (x0, m), then continue with Q's remaining moves (horizontals and diagonals... after (x0, m+1), Q's moves: horizontals and possibly diagonals? Slide from (x, m+1) impossible (y<m false)... wait slide condition y < m: y = m+1 ≥ m, blocked. But Q could later do vertical moves (y = m+2?!) — overshoot more. Let me not go down this hole.

Practical resolution: real-world implementations of forward Myers with trace DO exist and are correct — e.g., the widely used "myers diff" in many libraries. Do they guard overshoot? Many don't and are fine. I believe the invariant is: the termination check `x >= n and y >= m` first fires at d = D_min on the diagonal k where the furthest-reaching path legitimately ends at (n, m)... and overshoot paths on that same diagonal can't have x = n+1 at depth D_min because that would imply a path to (n+1, m+1) of depth D_min, implying (by removing the b[m]-insertion... hmm).

Alternative safe approach: clamp — when computing vertical move, if y would exceed m... you know what, simpler: since I'm worried, let me handle it in backtracking/emit rather than the search: if final point is (n+1, m) or (n, m+1), the script would include an out-of-range line. Alternatively, guard the moves explicitly:

When choosing x for diagonal k at depth d: 
- vertical (from k+1): candidate x = v[k+1]; valid only if v[k+1] - (k+1) < m, i.e., prev y < m. If prev y == m... then vertical is invalid (y+1 > m).
- horizontal (from k-1): x = v[k-1] + 1; valid only if v[k-1] < n.

But excluding invalid moves could break the "furthest reaching" invariant? Actually including invalid moves only ever inflates v[k] with garbage; excluding them keeps correctness of valid paths and prevents overshoot. Does excluding ever cause us to miss the minimal D? The minimal D path consists only of valid moves (moves within bounds). The furthest-reaching computation restricted to valid moves still correctly computes furthest reaching among valid paths, and D_min path is valid, so termination still happens at D_min. ✓. And overshoot can't happen since moves are guarded. 

But wait — there's subtlety: the branch condition `if k == -d or (k != d and v[k-1] < v[k+1])` — with guarding, if the chosen branch's move is invalid, we must take the other branch. When could the chosen branch be invalid? k == -d → must take vertical (from k+1 = -d+1, computed at d-1 ✓). Invalid if prev y == m: prev point (v[k+1], m) with v[k+1] < n. Then vertical invalid; horizontal from k-1 = -d-1: not computed at depth d-1 (out of range)... horizontal move from diagonal k-1 requires v[k-1] from depth d-1: k-1 = -d-1 has |k-1| = d+1 > d-1 → not available. Hmm! So at k == -d, the only possible predecessor is vertical. If that vertical is invalid (prev point at y == m), then no valid path on diagonal -d at depth d?? But is that possible: k == -d means y = x + d ≥ ... points on diagonal -d at depth d: minimal x... The furthest-reaching valid path: hmm, if all paths to diagonal -d at depth d require passing through (·, m) then vertical from y==m... wait no: reaching diagonal -d at depth d means d vertical-ish moves... Let me think: k == -d at depth d: the path made d moves, net diagonal change from 0 to -d, so all d moves were "leftward" in k... k decreases via vertical moves (insertions) only! k changes: vertical +1? Wait I need to fix sign conventions. Let me redefine: k = x - y. Horizontal move (x+1, y): k += 1. Vertical (x, y+1): k -= 1. So diagonal -d at depth d: all moves vertical (insertions), y = d... wait x = 0 + slides... hmm: k = -d, all d moves vertical: but slides happen too (diagonal moves don't change k and don't count toward d). Path: d vertical moves, y = number of vertical moves + slide length... y = d + (slide total)?? If y = m needed... whatever — point on diagonal -d at depth d has y ≥ d. If m < d... then y would need to exceed m?! y = x - k = x + d ≥ d. If d > m: y > m necessarily → no valid path on diagonal -d at depth d when d > m! But the loop computes it anyway (unguarded → garbage; guarded → must handle). In guarded version: at k == -d with d > m: vertical predecessor at depth d-1 on diagonal -d+1: that point has y ≥ d-1... if d - 1... hmm its y could equal m exactly (if the (d-1)-path reached y == m): then vertical invalid. Then no valid computation for v[-d] at depth d. What to store? Something that won't be chosen incorrectly later. Since later diagonals derive from neighbors, garbage propagates. Solution: store sentinel (e.g., n+1 or -1?) such that branch conditions treat it properly. Hmm, this is getting complicated but let's think: 

Standard treatments: many implementations DO just let it slide because... hmm. Actually you know, let me reconsider — maybe I'm overcomplicating. Let me look at this from the standpoint of the actual well-known correct implementations. The most famous forward Myers with trace is from "The Myers diff algorithm" series by James Coglan (parts 1-5), which many people implemented in Python. His version does NOT guard overshoot and is considered correct. Let me re-examine whether overshoot can actually cause wrong output in his formulation... 

Actually, wait. Let me reconsider the overshoot scenario concretely and check whether the termination check can fire on an invalid path first. We need: at depth D (minimal valid), during the k-loop, an overshoot path on some diagonal k' triggers x ≥ n and y ≥ m before the valid diagonal triggers. Overshoot paths terminate at depth ≥ D + 1 as I argued (for the two specific overshoot types, the "repair" path is 1 shorter). But the subtlety: the overshoot path on diagonal k' at depth D — for it to trigger, it must reach x ≥ n, y ≥ m at depth D. I argued: overshoot path to (n, m+1) has depth ≥ (depth of valid path to (n, m)) + 1 = D + 1 > D. Similarly (n+1, m) → D + 1. And overshoot to (n+1, m+1) even more. So at depth D, no overshoot path triggers termination ✓. But — could an overshoot path trigger at depth D on a diagonal k' where y ≥ m and x ≥ n but the point is like (n, m+1)? That's the case I covered (depth ≥ D+1). At depth exactly D: overshoot points have y = m+1 (from (x0, m), x0 < n at depth D-1... wait could x0 ≥ n? (x0, m) with x0 ≥ n at depth D-1 → that point would have triggered termination at depth ≤ D-1 (x ≥ n, y = m ≥ m) → contradiction since D is first termination depth. So x0 < n ✓, overshoot point (x0, m+1) with x0 < n: triggers only if x ≥ n — needs more horizontal moves: depth ≥ D + 1 ✓). Similarly x-overshoot points (n+1, y0) have y0 < m, trigger needs y ≥ m: more vertical moves: depth ≥ D+1 ✓. 

Great — so with unguarded moves, termination first fires at depth D via a VALID path (a path whose final point is exactly (n, m) — well, the triggering computed point (x, y) with x ≥ n, y ≥ m: at depth D, valid path ends at (n, m) exactly; could the furthest-reaching x on diagonal k = n - m at depth D be n+1? That's the (n+1, m+1) overshoot: depth ≥ D + 2? Path to (n+1, m+1): hmm shown ≥ D+1... let me recheck: path to (n, m+1) depth ≥ D+1; path to (n+1, m+1): last move into it: from (n, m+1) [horizontal] → depth ≥ D+2, or from (n+1, m) [vertical] → depth ≥ D+2. So ≥ D+2 ✓). So at depth D on diagonal n - m, furthest x is exactly n (valid path). But the branch selection might pick x from a predecessor that leads to a DIFFERENT path than the valid one... the computed (x, y) for diagonal k = n-m at depth D: x = furthest reaching = n (valid path's endpoint) — but IS the furthest-reaching path on that diagonal the valid one? v[k] = max over paths; some overshoot path of depth D on diagonal n-m reaching x = n but y = m+1? Point (n, m+1) at depth D: we showed path to (n, m+1) has depth ≥ D+1. So no. All depth-D paths on diagonal n-m ending at x = n have y = m ✓. So the triggering point is (n, m) ✓ and the path achieving it is valid (all moves in-bounds? The path achieving furthest x = n at depth D on diagonal n-m: constructed from valid sub-paths? Hmm — the branch selection picks predecessor based on stored values which may include overshoot garbage from OTHER diagonals. The chosen predecessor v[k±1] might be an overshoot value, making the reconstructed "furthest-reaching path" pass through an overshoot point even though its endpoint is valid!? E.g., v[k-1] (depth D-1) = overshoot value (n+1, y0<m)?? At depth D-1, overshoot x-overshoot points (n+1, y0): shown they exist? x-overshoot from (n, y<m) at depth D-2 → (n+1, y) at depth D-1 ✓ exists. Then at depth D, diagonal k: branch picks horizontal x = v[k-1]+1 = n+2?? That would make x > n... then y = x - k... if diagonal k = n-m: y = m+2. Termination check x ≥ n ✓ y ≥ m ✓ → TRIGGER at depth D with invalid path!!! Wait — but this requires v[k-1] = n+1 at depth D-1 and the branch condition choosing horizontal: `v[k-1] < v[k+1]`? Branch picks horizontal when NOT(k == -d or (k != d and v[k-1] < v[k+1])) → horizontal when v[k-1] ≥ v[k+1] (or k == d). Hmm, if v[k-1] = n+1 ≥ v[k+1], horizontal chosen: x = n+2, y = x - k = m+2 → slide impossible → v[k] = n+2, check: x ≥ n ✓, y ≥ m ✓ → TERMINATE with invalid path at depth D — the same depth as valid! And it might be processed EARLIER in the k-loop than the valid diagonal k = n-m (k' < k processed first if k' ... loop goes k = -d, -d+2, ..., d: smaller k first). If the invalid trigger happens at k' ≠ n-m with k' < n - m... but wait, does x-overshoot at depth D-1 on diagonal k-1 = k' - 1 exist? x-overshoot points (n+1, y0<m) arise from horizontal move from (n, y<m) point. (n, y0) with y0 < m at depth D-2: possible ✓ (e.g., path consumed all of a but not b). Then at depth D-1, v[k'+... the x-overshoot point (n+1, y0) is on diagonal n+1-y0. For it to be v[k-1] with k - 1 = n + 1 - y0 → k = n + 2 - y0. Then computed x = n+2, y = x - k = m... wait y = (n+2) - (n+2-y0) = y0 < m! Not ≥ m. Phew — I miscomputed. x = v[k-1] + 1, y = x - k = (n+1+1) - (n+2-y0) = y0 < m → no termination ✓. Slide: y < m ✓ but x < n? x = n+2 > n → slide condition x < n false → no slide. v[k] = n+2, point (n+2, y0). Then NEXT depth: from (n+2, y0): horizontal → (n+3, y0)... y stays < m, never triggers y ≥ m via horizontal... vertical from (n+2, y0): (n+2, y0+1) — y increments... eventually y = m at x = n+2 ≥ n → triggers termination with invalid path! Depth: this takes (m - y0) more vertical moves: total depth D + (m - y0) ≥ D + 1 > D ✓. OK so still fine.

So the invariant seems to hold: overshoot paths trigger termination strictly later than D. Let me also verify the analogous y-overshoot: y-overshoot point (x0, m+1) at depth d on diagonal x0 - m - 1. Later horizontal moves → (x, m+1) — termination when x ≥ n: depth ≥ d + (n - x0) ≥ D + 1 ✓ (since d ≥ D... hmm d here is the depth of the overshoot point which is ≥ D? The overshoot happens from (x0, m) at depth d-1 ≥ D-1... d ≥ D ✓; termination at ≥ d + (n - x0); valid path from (x0, m) to (n, m) has depth d - 1 + (n - x0) ≥ D... so overshoot termination depth ≥ d + n - x0 = (d - 1 + n - x0) + 1 ≥ D + 1 ✓).

And diagonals: could an overshoot value cause the k-loop to trigger at diagonal k ≠ n - m at depth D with valid-looking (x ≥ n, y ≥ m) but point ≠ (n, m)? Triggering points at depth D with x ≥ n, y ≥ m: x ≥ n and y = x - k ≥ m → k ≤ n - m; also... valid endpoint (n, m) is on diagonal n - m. Other triggering points (x, y), x ≥ n, y ≥ m, (x,y) ≠ (n, m): x > n or y > m → overshoot → depth ≥ D + 1 (shown for (n, m+1), (n+1, m), (n+1, m+1); what about (n+5, m) or (n, m+5)? (n+j, m): x-overshoot chained: depth ≥ D + j? Each x-overshoot beyond n costs... point (n+j, m): path must include j horizontal moves from x = n... from (n, y<m) horizontal to (n+1, y)... to reach y = m at x = n+j: hmm, path: ... → (n, y0) [depth D-2 possible] → horizontal (n+1, y0) → verticals to (n+1, m)? then horizontal (n+2, m) → trigger at (n+2, m): x ≥ n, y ≥ m ✓ depth = (D-2) + 1 + (m - y0) + 1 = D + m - y0 ≥ D+1 ✓. In general each overshoot beyond bounds adds ≥ 1 extra non-diagonal move compared to some valid path... I'm fairly convinced: any path P ending at (x, y) with x ≥ n, y ≥ m, (x, y) ≠ (n, m), has depth ≥ D + 1. Proof sketch: define P' by trimming: if x > n: P contains horizontal moves beyond x = n; remove them and corresponding... hmm, removing moves from the middle is messy because slides depend on content. But intuitively: D is the minimal edit distance = minimal non-diagonal moves over ALL paths from (0,0) to (n, m) (valid ones). A path to (x, y) ∋ x ≥ n, y ≥ m with (x,y) ≠ (n,m): it has some "wasted" moves... Consider the script interpretation: non-diagonal moves = deletions + insertions. A path to (n+j, m+j') corresponds to a script deleting n + j lines and inserting m + j' lines — but a and b have only n and m lines! Such a script "deletes" nonexistent lines → it's not a real edit script. As a lattice path though it exists. Its depth q = deletions + insertions. Hmm, I want q ≥ D + 1. Since D = min over valid paths. Hmm, take path to (n+1, m): q moves. Map to a valid path: remove one horizontal move beyond the point where x first = n... The path visits x = n at some point (monotone x). After that, all moves keep x ≥ n... to end at x = n+1: exactly one horizontal move after x = n (since x never decreases and diagonals increase x... wait diagonals increase x too! Slide moves increase x AND y. Hmm so x can increase via slides after x = n? No — slide requires x < n... slide condition in the search: while x < n and y < m. But the path definition (not the algorithm's slide) — a diagonal move from (n, y) to (n+1, y+1) requires a[n] == b[y] — a[n] doesn't exist → invalid diagonal move; the algorithm's slide never does it ✓. So after x = n, only horizontal and vertical moves. Path to (n+1, m): after first reaching x = n at point (n, y0): remaining moves: 1 horizontal + (m - y0) verticals → q = (depth to reach (n, y0)) + 1 + (m - y0) ≥ D + 1 since valid path from (n, y0) to (n, m) takes (m - y0) verticals and total valid ≤ q - 1... wait need depth-to-(n,y0) + (m - y0) ≥ D: yes because that's a valid path to (n, m) (continuation is vertical moves inserting b[y0..m]) so its depth ≥ D. Hence q ≥ D + 1 ✓. Similarly for y > m. And (n+1, m+1) etc. ≥ D + 2. ✓.

Also need: backtrack correctness. Backtracking from the termination point: we know the path (via stored snapshots) — but the stored v values include garbage; backtracking uses the same branch condition on snapshots; the reconstructed path is THE furthest-reaching path as computed (the algorithm's implicit path), which ends at (n, m) at depth D ✓ and consists of moves that the algorithm actually made — all in-bounds? The algorithm's moves: horizontal x = v[k-1]+1 where v[k-1] could be garbage n+1 → x = n+2 out of bounds, but the FINAL triggering path... hmm, the path that triggers termination at depth D on diagonal n - m: computed via branch selection; the branch might pick a garbage predecessor? If it picks horizontal with v[k-1] = garbage ≥ ... then x = garbage + 1 > n possibly, y = x - k ≠ m... but we established the triggering point IS (n, m) (only valid trigger at depth D). The computed x for diagonal n-m at depth D: if branch picked garbage predecessor giving x ≠ n... then v[n-m] at depth D = x ≠ n — but furthest-reaching valid is n and garbage ≥ n+1 would make x ≥ n+1 → trigger check x ≥ n ✓ y = x - (n-m) ≥ m+1 ≥ m ✓ → TRIGGER with invalid path!!! Contradiction with earlier claim? Let me recheck: can v[k-1] (depth D-1) be ≥ n (garbage) for k-1 such that diagonal k = n - m... k - 1 = n - m - 1: v[n-m-1] at depth D-1 = furthest x on diagonal n-m-1 among computed (possibly garbage) paths. Valid furthest: x_valid. Garbage could exceed: x-overshoot points on diagonal n-m-1: (n+1, y) on diagonal n+1-y = n-m-1 → y = m+2?? y-overshoot... point (n+1, m+2): on diagonal n-m-1. Depth to reach: ≥ D + 3. So at depth D-1, no garbage ≥ n+1 on diagonal n-m-1? Valid furthest on diagonal n-m-1 at depth D-1: could it be n itself? Point (n, m+1): y-overshoot, depth ≥ D+1 > D-1 → no. So v[n-m-1] at depth D-1 ≤ n - 1?? Valid furthest on that diagonal: x ≤ n (slide stops at n; but reaching x = n on diagonal n-m-1 means point (n, m+1): overshoot depth ≥ D+1). So v ≤ n - 1... wait could x = n via... on diagonal n-m-1, point (n, y) has y = m+1. Only via overshoot. So v[n-m-1] ≤ n - 1 hmm, actually x ≤ n - ... point on diagonal n-m-1 with x = n needs y = m+1: overshoot only. So v[n-m-1]_{D-1} ≤ n-1. Then horizontal x = v+1 ≤ n ✓ valid. Similarly vertical branch: x = v[k+1] = v[n-m+1] at depth D-1: garbage? y-overshoot on diagonal n-m+1: (x, m+1) with x - (m+1) = n-m+1 → x = n+2: depth ≥ D+3. x-overshoot: (n+1, y): n+1-y = n-m+1 → y = m: point (n+1, m): depth ≥ D+1 > D-1 ✓ no. So v[n-m+1]_{D-1} ≤ n. Vertical: x = v[n-m+1] ≤ n, y = x - k = x - n + m ≤ m ✓. And the branch condition: could it pick a branch whose x,y then differ from n,m... the computed x for diagonal n-m at depth D = max-ish... whatever it computes, we showed valid predecessors give x ≤ n with y ≤ m, garbage predecessors unavailable at depth D-1 for these two diagonals. And furthest-reaching valid gives exactly x = n → the computed x = n (since valid path exists and no garbage exceeds it: computed x = either v[k+1] or v[k-1]+1, both ≤ n, and the valid path achieves n via one of the branches — the branch condition picks per the comparison; whichever it picks, is the picked value = n? The branch condition picks based on v[k-1] vs v[k+1] comparison designed to maximize x. Both candidates ≤ n; at least one achieves n (the valid path came through one of them with its branch condition satisfied — hmm, the valid path's own branch selection: the valid path at depth D on diagonal n-m arrived from k-1 or k+1; the algorithm's branch condition might pick the OTHER predecessor! Then computed x = other value < n → no trigger at diagonal n-m at depth D?? But then D wouldn't terminate at depth D at all... but D is the minimal edit distance; the forward Myers theorem says termination happens at d = D. The theorem's proof relies on the algorithm correctly computing furthest-reaching values — with garbage values present, does the max-picking still yield furthest-reaching VALID values? The branch condition picks the larger of the two candidates (that's its purpose: v[k-1]+1 vs v[k+1], pick larger → condition v[k-1] < v[k+1] → pick v[k+1] means v[k+1] ≥ v[k-1]+... pick v[k+1] when v[k-1] < v[k+1]: then v[k+1] > v[k-1] ≥ v[k-1]+1 - 1... v[k+1] vs v[k-1]+1: v[k+1] could equal v[k-1] (then condition false → pick v[k-1]+1 = v[k+1]+1 > v[k+1] ✓ larger). If v[k-1] < v[k+1]: pick v[k+1]; is v[k+1] ≥ v[k-1]+1? v[k+1] > v[k-1] → v[k+1] ≥ v[k-1]+1 ✓ larger or equal. So branch picks the max ✓ — including garbage. But garbage on the relevant diagonals at depth D-1 doesn't exceed valid (shown above for diagonals n∓m±1). For OTHER diagonals garbage may exceed valid, but those diagonals' garbage affects their own v[k] and subsequent garbage propagation — the concern is only whether termination first triggers validly at depth D on the correct diagonal, and whether backtracking from the trigger reconstructs a valid path.

Backtracking: we start at (x, y) = trigger point = (n, m), depth D, diagonal k* = n - m. Walk backwards using snapshots: at depth d (from D down to 1), diagonal k, we have point (x, y) = the algorithm's computed point for (d, k) — the endpoint after slide. We recompute the branch: prev_k = k+1 if (k == -d or (k != d and snap[k-1] < snap[k+1])) else k-1, where snap = trace[d] = v-state BEFORE depth d (after depth d-1). prev_x = snap[prev_k], prev_y = prev_x - prev_k. Then the move from (prev_x, prev_y) to arrival (ax, ay) then slide to (x, y). The reconstructed path is exactly the algorithm's forward path ✓ by construction. The question: is this path valid (in-bounds moves)? The path's moves: from (prev_x, prev_y): if horizontal: (prev_x + 1, prev_y) — need prev_x < n: prev_x = snap[k-1] ≤ n - 1 when... hmm at depth d < D on arbitrary diagonal, snap values can be garbage (n+1). Then the reconstructed path includes an invalid move — BUT does the backward walk from (n, m) ever visit such a diagonal? The backward walk follows the algorithm's actual chosen branches, which produced the triggering path. The triggering path: we established its endpoint (n, m) is achieved via valid predecessors at depth D-1 on diagonals n-m±1 with values ≤ n etc. But wait — I showed the CANDIDATES are ≤ n; the branch picks max; the max is n (achieved by valid path). Which predecessor achieved n? Suppose both n-1... e.g., v[k+1] = n (valid, point (n, m-1)) and v[k-1] + 1 = n (v[k-1] = n-1, point (n-1, m)). Branch: picks v[k+1] if v[k-1] < v[k+1]: n-1 < n ✓ → picks vertical: prev point (n, m-1) ✓ valid. Then path continues backward from (n, m-1). Fine. If v[k-1] = n - 1 and v[k+1] = n - 1: picks horizontal: prev (n-1, m) ✓ valid. Either way predecessor is a valid point. Then recursively: the predecessor point (prev_x, prev_y) at depth d-1 is a point the algorithm computed as furthest-reaching on diagonal prev_k — and it's a VALID point (in bounds). Inductively: is the furthest-reaching value on diagonal prev_k at depth d-1 achieved... the VALUE v[prev_k] might be garbage (larger than valid), but here prev_x = v[prev_k] is what the algorithm stored — if it's garbage (out of bounds), the backward walk goes to an out-of-bounds point → emitting script would index out of range!! 

Hmm wait: can v[prev_k] at depth d-1 be out of bounds while being the chosen predecessor of a valid chain? The chain: (n, m) at D ← predecessor P_{D-1} on diagonal n-m±1 — shown in-bounds (≤ n, ≤ m as computed above... I showed v[n-m-1]_{D-1} ≤ n-1 and v[n-m+1]_{D-1} ≤ n — in bounds ✓). Then from P_{D-1} = (x1, y1) in-bounds, predecessor P_{D-2} on diagonal x1-y1±1: could v[that diagonal]_{D-2} be garbage (out of bounds)? P_{D-2} is the stored furthest value = possibly garbage ≥ valid+... e.g., x-overshoot point (n+1, y0) at depth D-2 on some diagonal — if P_{D-1} is on that diagonal... P_{D-1} = (x1, y1) with v[x1-y1] = x1 — P_{D-1}'s coordinates ARE the stored value; P_{D-1} in-bounds ✓; its predecessor = v[x1 - y1 ± 1] at depth D-2 — the branch condition at (D-1, x1-y1) picked this predecessor; the picked predecessor value could be garbage (e.g., n+1) even though P_{D-1} is in-bounds!! Example: P_{D-1} = (x1, y1) computed via horizontal from v[k'-1] = garbage n+1 → x1 = n+2?? No wait P_{D-1} in-bounds means x1 ≤ n. If computed via horizontal from garbage v = n+1 → x1 = n+2 out of bounds — contradiction, so P_{D-1} was computed from an in-bounds predecessor OR via the other branch. Hmm: P_{D-1} = (x1, y1) is the endpoint after slide; the slide can reduce... no, slide increases x. The arrival point ax = x1 - slide_len ≤ x1. The predecessor value v_prev = ax or ax - 1 (horizontal: ax = v+1; vertical: ax = v). x1 ≥ ax. If v (predecessor stored value) = n+1 (garbage), horizontal → ax = n+2 → x1 ≥ n+2 out of bounds. So P_{D-1} in-bounds → its predecessor stored value... vertical: ax = v = predecessor x ≤ x1 ≤ n ✓ in-bounds x; but predecessor y = v - (k'+1)?? y of predecessor: for vertical move, predecessor point (v, y_p) with y_p = v - (k'+1) and ax,ay = (v, y_p + 1): ay ≤ y1 ≤ m → y_p ≤ m - 1 ✓ in-bounds. Horizontal: predecessor (v, y_p), ax = v + 1 ≤ n → v ≤ n - 1 ✓; y_p = ay ≤ m ✓. So the predecessor point of an in-bounds point is in-bounds ✓✓. By induction backward from (n, m): all path points in-bounds ✓. 

But hold on — P_{D-1} being "the stored value v[n-m±1] at depth D-1": I showed these are ≤ n and the y-coords in-bounds. But which point exactly? v[n-m+1]_{D-1} = x1 with point (x1, x1 - (n-m+1)) — y1 = x1 - n + m - 1 ≤ m - 1 ✓ and y1 ≥ 0? x1 ≥ ... could y1 be negative? v[k] ≥ ... x1 ≥ 0 ✓; y1 = x1 - k ≥ -k = m - n - 1... could be negative if m < n+1 and x1 small. Point with negative y?? Can the algorithm store a point with y < 0? y = x - k < 0 means... vertical move to diagonal k from k+1: y = y_prev + 1 ≥ 1... horizontal: y = y_prev ≥ 0 ✓. Slide decreases y: while ... y -= 1 with condition y > 0 → stops at y ≥ 0... slide condition: y > 0 → after decrement y ≥ 0 ✓. Initial d=0: y=0 ✓. So y ≥ 0 always ✓. OK.

Similarly x ≥ 0: horizontal x = v+1 ≥ 1; vertical x = v ≥ 0; slide stops at x ≥ 0 ✓.

So: unguarded forward Myers with trace is CORRECT — termination first fires at depth D via the valid path, and backtracking yields a valid path. This matches the empirical correctness of all those implementations. 

Now memory: trace stores a copy of v per depth d, for d = 0..D. v has size 2*(n+m)+1. For n=m=1000 completely different: D = 2000, size 4001 → 2000 copies × 4001 = 8M entries. As Python list of ints: 8M pointers × 8B = 64MB + int objects (values ≤ 1000; ints 0..256 cached; others up to 1000: each snapshot has many distinct values... total distinct int objects created ~8M × 28B = 224MB). Too much. Use `array` module? array('l', ...) stores raw 8-byte ints: 8M × 8B = 64MB ✓. But copying v into array per step: array(v) conversion cost... Creating an array from a list each iteration: 4001 elements × 2000 iterations = 8M element conversions — array conversion is C-speed, ~fast (maybe 0.5s total). Alternatively store snapshots only for k-window? We need arbitrary k access during backtracking; but backtracking only visits one k per depth — we could instead store, per depth, only the branch decision... but branch decisions depend on comparisons of neighbors — we could store per (d, k-visited) just prev_k! During backtracking we need, for the specific k visited at depth d, the prev_k. We could recompute forward... no. Store per depth d a dict {k: prev_k}? Backtracking visits one k per depth, but we don't know which until backtracking. Alternative: store per depth the full decision for all k — that's what the v snapshot effectively gives.

Alternative memory-light approach: store, for each depth d, the v-window values as an array('i') of size 2d+1? Not fixed layout... simpler: one big flat array: snapshot d occupies positions [d*(2S+1) ... ] with S = n+m → total (D+1)*(2S+1) ints = 2001*4001 ≈ 8M ints × 4 bytes ('i' = 4 bytes, values ≤ 2000 fit) = 32MB ✓ fine. Allocation: array('i', [0]) * ... create once: `arr = array('i', bytes(4 * total))`? array('i', [0]) * total works (array repetition). Then snapshot d at offset d*(2S+1)... wait but actually we can avoid storing full snapshots: note v only changes at entries k for the current d; other entries persist. Store per depth only the CHANGED entries? The changed entries at depth d are k ∈ {-d..d step 2} → 2d+1... hmm that's not "changes" — at depth d, entries k ∈ [-d, d] ∩ parity are updated; entries with |k| < d... at depth d we update exactly k ∈ {-d, -d+2, ..., d} — all of them (each is recomputed). But entries outside [-d, d] retain old values. So a full snapshot ≠ just the updated window; backtracking needs snap[k±1] where k ∈ [-d, d] → k±1 ∈ [-d-1, d+1] — within updated range of depth d-1 ([-(d-1), d-1])? k+1 could be d+1 when k = d — but k = d uses the k==d branch → horizontal, doesn't read v[k+1]... the branch condition reads v[k+1] when k != d... condition evaluates v[k-1] < v[k+1] only when k != d... wait condition: `if k == -d or (k != d and v[k-1] < v[k+1])`. For k = d: short-circuit? `k == -d` false; `k != d` false → whole condition false → horizontal ✓ no read of v[k+1]. For k = -d: first clause true → vertical, reads v[k+1] = v[-d+1] ∈ [-(d-1), ...] ✓ computed at d-1. For -d < k < d: reads both v[k-1], v[k+1] ∈ [-(d-1), d-1] ✓. So reads stay within [-(d-1), d-1] ✓. So snapshot for depth d needs window [-(d-1), d-1] of v-state after depth d-1. Full v state after depth d-1 has nontrivial values only in [-(d-1), d-1] (all updated at depth d-1... entries in [-(d-2), d-2] were updated at depth d-2 too but overwritten at d-1? At depth d-1, updated k ∈ {-(d-1), ..., d-1} step 2 — only parity-matching entries! Entries of opposite parity in [-（d-1), d-1] were last updated at depth d-2 (or earlier) and are STALE but never read (reads at depth d are k±1 with parity opposite to k... k has parity of d; k±1 parity of d-1 ✓ exactly the ones updated at depth d-1 ✓). 

So: flat storage where snapshot d = values of v[k] for k ∈ [-(d), d] after depth d... simpler: after processing depth d, store window W_d = v[k + offset] for k ∈ [-d, d] (2d+1 entries, including stale opposite-parity ones — harmless). Backtracking at depth d needs window of depth d-1 = W_{d-1} covering [-(d-1), d-1] ✓ contains all needed reads ✓. Total storage = Σ_{d=0}^{D} (2d+1) = (D+1)². For D=2000: 4M ints × 4B = 16MB ✓✓. 

Implementation: 
- offset = n + m (so k + offset ∈ [0, 2(n+m)]).
- v = array or list of size 2*offset + 1... size 2*(n+m)+1.
- storage: flat array `store = array('i')` appended per depth: for each d, append v[k + offset] for k in [-d, d] — that's v[offset-d : offset+d+1] — a slice! `store.extend(v[offset-d : offset+d+1])` — array.extend with array slice is fast C. Record start index per depth: cumulative (d+1)²: start_d = d*d... Σ_{i<d}(2i+1) = d². So snapshot d starts at index d² and has length 2d+1. 

Backtrack: at depth d (1..D), snap of depth d-1 at store[(d-1)² : (d-1)² + 2(d-1)+1], where snap[j] = v-after-(d-1) at diagonal (j - (d-1))... i.e., diagonal k index j = k + (d-1).

Forward loop:

```
def _myers_core(a, b):
    n, m = len(a), len(b)
    offset = n + m
    size = 2 * offset + 1
    v = [0] * size   # plain list for speed in inner loop? or array? list faster for reads/writes.
    v[offset + 1] = 0   # standard init: v[1] (k=1) = 0 → v[offset+1] = 0 (already 0)
    store = array('i')  # or 'l'
    # handle trivial: if n == 0 or m == 0 handled outside? Myers handles: n==0: D = m... loop d: k=... let's just let it run: n=0: d=0: k=0: x = v[1] = 0, y = 0; slide no; v[offset]=0; check x>=0=n ✓ y>=m? if m>0 no. d=1: k=-1: x = v[0+... wait v[k+1+offset] = v[offset] = 0 → x=0, y = 1; ... vertical moves only; k=-d: x = v[offset - d + 1]; at d: x = 0? v[-d+1] was set at d-1 to 0 ✓ (x stays 0, y = d). At d = m: k = -m: x = 0, y = m → trigger ✓ D = m ✓.
    for d in range(n + m + 1):
        store.extend(v[offset - d : offset + d + 1])   # snapshot AFTER previous depths = state before depth d... 
```

wait — I need snapshot of state BEFORE processing depth d (i.e., after depth d-1) for backtracking of step d. If I extend at the TOP of the loop with current v (which reflects depth d-1 updates) — but the window [-d, d] includes entries k = ±d which haven't been computed yet (they'll be computed during depth d) — their current values are stale garbage from... entries |k| = d: never touched before (or touched at earlier depth? |k| = d first reachable at depth d... parity: k = d ≡ d mod 2; at depth d-2, k = d has parity d ≡ d-2 ✓ and |k| = d > d-2 → not updated. So v[±d + offset] is INITIAL 0 or from... never updated → 0). Backtrack at depth d reads snap[k±1] for k ∈ [-d, d] → indices within [-(d-1), d-1] — all genuinely computed at depth d-1 ✓. The stale entries at ±d in the snapshot are never read by backtrack at depth d ✓ (reads are k±1, and for k = d: horizontal branch (no read of k+1); reads v[k-1] ✓ in range; for k = -d: vertical reads v[k+1] = -(d-1) ✓ in range).

Hmm wait, backtrack branch logic mirrors forward: `if k == -d or (k != d and snap[k-1] < snap[k+1]): prev_k = k+1 else: prev_k = k-1`. For k = d: condition false → prev_k = k-1 ✓ read snap[k-1] in range ✓. For k = -d: prev_k = k+1 ✓. For middle: reads both ✓. All reads ∈ [-(d-1), d-1] ✓ — but the snapshot window is [-(d-1), d-1] with layout snap[j] = value at diagonal j - (d-1) for j ∈ [0, 2(d-1)]. So snap index for diagonal k = k + (d-1) ✓ in [0, 2(d-1)] ✓.

So extend at top of loop body: store.extend(v[offset-d : offset+d+1]) — length 2d+1 ✓ placed at index d². ✓.

Then process k-loop, updating v. Termination check inside: after slide, if x >= n and y >= m: D_final = d; break out.

After loop, backtrack:

```
    # collect path: list of (k, prev_k?) or directly build script
    script parts: we walk from (x, y) = (n, m)?? 
```

Wait — the triggering point: (x, y) after slide at (D, k*) — we established it's exactly (n, m)? The trigger fires when x ≥ n and y ≥ m; at depth D the valid path ends exactly at (n, m) ✓ (shown). But hmm, one more check: the trigger might fire at a diagonal where the computed point is (n, m) but via garbage? No — computed x for the triggering diagonal: we showed for diagonal n-m the candidates ≤ n and valid achieves n → computed x = n... wait actually computed x = max(candidates) and candidates ≤ n... the valid path achieves x = n as furthest-reaching valid → one of the candidates = n? The valid path's arrival: the valid path on diagonal n-m at depth D arrived from k+1 or k-1 with the branch condition — hmm, the valid path exists as an abstract path; the algorithm's branch condition might not select it! The algorithm computes v[k] = max(candidates) where candidates = {v[k+1] (vertical), v[k-1]+1 (horizontal)} (with parity/boundary constraints). Furthest-reaching valid value on diagonal n-m at depth D = n. Is max(candidates) = n? candidates come from stored values at depth D-1 on diagonals n-m±1: stored value = max over paths through that diagonal INCLUDING garbage — but garbage on those diagonals at depth D-1 ≤ valid furthest (shown: no overshoot points reachable on diagonals n-m±1 at depth D-1 within bounds exceeding... I showed v[n-m-1]_{D-1} ≤ n-1 — but valid furthest on diagonal n-m-1 at depth D-1: point (x, m+1)?? in-bounds valid furthest: x ≤ n with y = x - (n-m-1) = x - n + m + 1 ≤ m → x ≤ n - 1 ✓ so valid ≤ n-1; garbage also ≤ n-1 ✓ so v = valid furthest ✓ = whatever. Similarly v[n-m+1]_{D-1} ≤ n and valid furthest on diagonal n-m+1: point (x, x-n+m-1): y ≤ m → x ≤ n+1; x = n+1 → point (n+1, m): depth ≥ D+1 → not at D-1; so valid ≤ n; = n iff point (n, m-1) reachable at depth D-1 ✓ (it is, on the valid path). So v[n-m+1]_{D-1} = n possibly ✓. Then candidates: vertical x = n (if branch picks it), horizontal x = v[n-m-1]+1 ≤ n. Branch picks max → x = n iff vertical candidate n ≥ horizontal candidate; horizontal candidate = v[n-m-1]+1 ≤ (n-1)+1 = n. So max = n achieved ✓ regardless of branch?? Branch picks: if v[n-m-1] < v[n-m+1] → vertical → x = v[n-m+1] = n ✓ (if v[n-m+1] = n). If v[n-m-1] ≥ v[n-m+1] → horizontal → x = v[n-m-1]+1; need this = n for termination at depth D... if v[n-m-1] = n-1 → x = n ✓. Could v[n-m-1] < n-1 AND v[n-m+1] < n while valid path exists? Valid path to (n, m) at depth D arrives via vertical from (n, m-1) [v[n-m+1] ≥ n → = n] or horizontal from (n-1, m) [v[n-m-1] ≥ n-1 → = n-1]. At least one holds → corresponding candidate = n → max = n → computed x = n → y = m → trigger ✓✓. And which branch is taken determines prev: backtrack uses same condition ✓ consistent.

So backtrack start: (x, y) = (n, m), k = n - m, depth D. Wait — but the trigger might have fired at a DIFFERENT diagonal with computed point... at depth D, could another diagonal k' ≠ n-m have computed point with x ≥ n, y ≥ m? Point on diagonal k' with x ≥ n, y ≥ m: (x, x - k'): y ≥ m → k' ≤ n - m; x ≥ n... if k' < n - m: y = x - k' > m... point (n, y>m): y-overshoot: depth ≥ D+1 → not at D ✓. If k' = n - m ✓ the one. So trigger diagonal = n - m, point (n, m) ✓. Actually hmm: what about x > n, y = m: point (n+1, m) on diagonal n+1-m >