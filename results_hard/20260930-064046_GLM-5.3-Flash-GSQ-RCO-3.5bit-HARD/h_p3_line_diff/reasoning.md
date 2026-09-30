We need to implement Myers' O((N+M)·D) algorithm with linear space refinement (divide and conquer, middle snake) to handle completely different 1000x1000 — actually full O(ND) memory approach: D could be 1000 for two completely different lists... N+M=2000, D up to ~1000? Actually for completely different lists where no common lines, D = N+M = 2000. But if lists share some lines, LCS-based... O((N+M)·D) time = 2000·2000 = 4M — fine. Memory with the simple approach storing V arrays per D step: O(D²) = 4M ints — fine actually. But for 20000 lines differing in 50 places, D=100, O((N+M)D) = 40000·100 = 4M — fine. Memory O(D²) small.

But worst case completely different 1000 lines each: D = N+M (since no common lines, D = M+N = 2000). Time 2000·2000=4M fine. Memory for storing V snapshots: D+1 arrays of length 2D+1 ≈ 2001·2001 ≈ 4M ints — fine (each int ~ small, list of ints ~ 8 bytes each plus pointer... ~ 32MB, acceptable). Alternatively use linear-space Myers. Let's just do the forward algorithm storing snapshots, then backtrack. That's simpler and correct.

Standard Myers:

a length N, b length M. V[k] = furthest reaching x on diagonal k. x goes along a (deletions increase x, insertions increase y i.e., decrease... let's set k = x - y). Standard:

max D = N+M.
V = {1: 0} or array offset.

For d in 0..max:
  for k in range(-d, d+1, 2):
    if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]
    else: x = V[k-1] + 1
    y = x - k
    while x < N and y < M and a[x] == b[y]: x+=1; y+=1
    V[k] = x
    if x >= N and y >= M: done, D = d.

Store snapshot per d. Backtrack: at step d, diagonal k, we chose either down (from k-1, x = V_{d-1}[k-1]+1, meaning deletion a[x]... wait careful) — need to record predecessors. Backtracking: reconstruct path: at (d, k) with reach x (post snake). Determine predecessor: recompute using V_{d-1}. If k == -d or (k != d and V_{d-1}[k-1] < V_{d-1}[k+1]): came from k+1 (insertion of b[y-1]? y = x-k, predecessor point (x, y-1)?). Hmm: moving from diagonal k+1 to k means increasing y by 1 (insertion). From k-1 to k means increasing x by 1 (deletion).

Standard backtrack:

def backtrack: go from final (d, k where x=N, y=M) backwards. At each step: 
  if k == -d or (k != d and Vprev[k-1] < Vprev[k+1]): prev_k = k+1 (came via insertion)
  else: prev_k = k-1 (deletion)
  prev_x = Vprev[prev_k]
  prev_y = prev_x - prev_k
  The move: if prev_k == k+1: insertion: point (prev_x, prev_x - k) = (prev_x, prev_y+1)? Let's derive: before the move we were at (x0, y0) on diagonal k_prev. After one edit step we're on diagonal k: if k = prev_k - 1 (down move? k decreases means y increases relative to x... k = x - y, k decreased → x-y smaller, done by increasing y → insertion). If k = prev_k + 1 → deletion (x increased).

Actually in the loop: for diagonal k at step d, we either take x = V_{d-1}[k+1] (from diagonal k+1, this is a "down" move: y increases → insertion of b line) or x = V_{d-1}[k-1] + 1 (from k-1, "right" move: x increases → deletion of a line). Then snake.

Backtracking with snapshots Vd stored: at (d, k, x_end) where x_end is post-snake reach. Pre-snake x_start: we can recover: the snake was maximal, but we know pre-snake point is (x0, y0) where after the edit move. Easier: recompute choice at (d,k): determine prev_k as above using V_{d-1}; prev_x = V_{d-1}[prev_k]; prev_y = prev_x - prev_k. If prev_k = k+1 (insertion): pre-move point (prev_x, prev_x - k) = (prev_x, prev_y - 1)? y = x - k = prev_x - k = prev_x - prev_k + 1 = prev_y + 1. So pre-snake point on diagonal k is (prev_x, prev_x - k), and the edit step consumed b[prev_x - k - 1]? Hmm.

Simpler: reconstruct the path of points: collect (x, y) points. Start at end point (N, M) reached at diagonal k_N = N - M, step d. For d from D down to 1: current point (x, y) on diagonal k. Determine prev_k. prev_x = V_{d-1}[prev_k]; prev_y = prev_x - prev_k. Then the edit move: if prev_k == k+1: deletion? k = prev_k - 1 means we came from k+1 down to k: down move = y increases = insertion. Wait: from diagonal k+1, x stays, y increases by 1 → new diagonal k = x - (y+1) = old k - 1 = prev_k - 1 = k. Yes: coming from k+1 → insertion. The insertion line is b[y-1] where y is current y... Actually after insertion, the snake follows. Points: (prev_x, prev_y) on diagonal prev_k. Insertion: move to (prev_x, prev_y + 1) on diagonal k. Then snake to (x, y). Emitted: "+" b[prev_y]? The line inserted is b[prev_y] since y goes from prev_y to prev_y+1, consuming b[prev_y]. Yes index prev_y (0-based).

If prev_k == k-1: deletion: from (prev_x, prev_y) move right to (prev_x+1, prev_y), diagonal k = prev_k+1. Consumed a[prev_x]. Emit "-" a[prev_x].

Then snake from (prev_x + (0 or 1), prev_y + (0 or 1)) to (x, y): all "=" lines a[x'] for x' in that range.

Set (x, y) = (prev_x, prev_y), continue.

Edge: d=0: only equal snake from (0,0) to (x,y).

But careful: backtracking condition uses V_{d-1}, and the condition for choosing: `if k == -d or (k != d and V[k-1] < V[k+1])` → came from k+1 (insertion); else from k-1 (deletion). When k == d: can't come from k+1 (>d), forced deletion. When k == -d: forced from k+1... wait k=-d: came from k-1 = -(d-1)? No: at step d, k ranges -d..d. If k == -d, it must have come from k+1 (since k-1 = -d-1 not reachable at d-1... at step d-1 diagonals range -(d-1)..d-1, k-1 = -d-1 out of range). The condition in forward loop: `if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]` — so from k+1. Hmm wait that says: when k == -d, take x = V[k+1], i.e., came from diagonal k+1, which is a down/insertion move? From diagonal k+1 to k... hold on, at step d we're computing diagonal k; predecessor diagonal at step d-1 is either k-1 or k+1. Moving from diagonal k-1 (step d-1) to diagonal k (step d): k = prev + 1 → x increased → deletion. Moving from k+1 to k: k = prev - 1 → y increased → insertion. So condition `k == -d or (V[k-1] < V[k+1])` → x = V[k+1] → predecessor k+1 → insertion. Else x = V[k-1]+1 → deletion. Good.

In backtrack at (d, k): same test with V_{d-1}: if k == -d or (k != d and V_{d-1}[k-1] < V_{d-1}[k+1]): prev_k = k+1 (insertion), else prev_k = k-1 (deletion).

Wait but the forward test for diagonal k uses V at step d-1 including entries possibly updated during step d... In forward, V is updated in-place during loop over k, but when computing diagonal k we use V[k-1] and V[k+1] which are values from step d-1 (k-1 not yet updated in this step? We iterate k from -d to d upward; k-1 was updated this step already! Hmm, standard Myers updates V[k] after computing; when k increases, V[k-1] already holds the step-d value, not step d-1. Actually the classic implementation iterates k and uses V[k-1] and V[k+1]; since k-1 was computed at this same step d (for k-1 ≥ -d... k-1 is in range at step d if k-1 ≥ -d, and since k ≥ -d, k-1 ≥ -d-1; when k = -d, k-1 = -d-1 out of step-d range but the branch k==-d avoids reading V[k-1]... actually it reads via condition k != d and V[k-1] < V[k+1] — short-circuit: k==-d avoids it). Hmm but for k > -d, V[k-1] was already overwritten with step-d value. Is that a problem? Classic Myers: for d, for k = -d..d step 2: if k==-d or (k != d and V[k-1] < V[k+1])... Actually the standard formulation handles it: when k-1 was updated at this step, V[k-1] equals the step-d value for diagonal k-1. But is using step-d value of k-1 vs step d-1 the same? Diagonal k-1 at step d: reachable only if d-1 ≥ ... diagonal k-1 at step d requires |k-1| ≤ d and parity — k-1 has opposite parity of... k and d have same parity (k from -d to d step 2). k-1 has different parity, so diagonal k-1 is not reachable at step d (no update). Wait: V keys are only diagonals with parity matching d? V[k-1]: k-1 parity differs from d's parity — at step d, diagonals k with parity of d are updated. k-1 was last updated at step d-1. Since we go k = -d, -d+2, ..., k-1 = -d-1, -d+1,... which are diagonals of parity d-1, updated at step d-1. So V[k-1] holds step d-1 value. Similarly V[k+1] holds step d-1 value. Great, no issue.

But my V storage: I'll use a dict or array indexed by k+offset. Store snapshots: snapshots[d] = V (copy) after step d. Memory O(sum over d of (d+1)) = O(D²/2). For D=2000: 2M entries. Fine. Actually we only need snapshots at each d for backtracking: need all of them. Alternatively store only V_{d} per d: D+1 arrays. For D=2000, arrays sizes 1,3,5,...,4001 → total ~4M ints. ~35MB with Python list of ints... Python ints are objects but small ints cached; list of pointers ~8 bytes each → 32MB. Acceptable but a bit heavy. Could use array module ('l') → 8 bytes each, 32MB. Or just lists — fine.

Alternative: linear-space divide & conquer middle-snake. More complex but memory O(N+M). Given constraints, snapshot approach: worst case for the perf requirements:

Test 1: 20000 lines each, differ in ~50 places → D ~100. Snapshots total ~ 100²/2 = 5000 entries. Time: outer loop d up to 100, inner loop up to 2d+1 diagonals, snake work: total snake work per step can be O(N)? No—total snake work over the whole algorithm is O((N+M)·D) worst case, but typically snakes... Actually per step, the snake scanning: for each diagonal, snake extends; total work could be O(D·(N+M)) in the worst theoretical, but with equality check cost... 20000·100 = 2M comparisons worst case — fine under 2s.

But wait: comparing strings equality — fine.

Hmm, but there's a subtlety: with 20000 lines differing in 50 places, D might be like 100, and per d step, each diagonal's snake could rescan long runs? Standard Myers: the snake at step d on diagonal k starts from (x,y) and extends; each step the furthest reach advances by at most... The furthest reach per diagonal can advance a lot per step. The total time is O((N+M)D) worst case which is 2M — fine.

Test 2: 1000 lines completely different: no common lines → LCS = 0? If truly completely different (no line equal), D = N + M = 2000. Time O((N+M)·D) = 2000·2000 = 4M basic ops, but inner snake does zero comparisons each. But the loops themselves: d up to 2000, inner up to 2d diagonals → sum = D² = 4M iterations in Python → maybe 2-3 seconds. Hmm, "under 6 seconds" — should be OK. Snapshots memory: sum (2d+1) for d=0..2000 = (D+1)² = ~4M entries → ~32MB as list-of-lists of small ints. OK.

But actually "completely different" might mean few equal lines; if some lines equal, D smaller. Worst is no common.

Python speed: 4M loop iterations with dict/array ops ≈ maybe 3-5 seconds. Risky. Let's optimize: use a list V of size N+M+3 with offset, avoid dict. And avoid storing full snapshots? We could store snapshots lazily... We need them for backtracking. Alternative: instead of snapshots, during forward pass store per diagonal, per step... Another approach: store trace as list of V copies but V copy is O(k). Total memory same.

Alternative to reduce Python overhead: represent V as a single flat list per snapshot appended to trace: trace.append(V[:]) — copying V each step costs O(len(V)) = O(N+M) per step → O((N+M)·D) copies = for test 2: 2000·2000 = 4M element copies — adds time but okay-ish. Better: only copy the slice that was touched this step: diagonals -d..d, i.e., indices offset-d .. offset+d. Store trace.append((offset-d... )) Hmm.

Alternative approach: linear-space Myers (divide and conquer with middle snake) — time O((N+M)·D) same but memory O(N+M), and avoids snapshots. Complexity of implementation higher but well-known. Given perf constraints, snapshot approach simpler; let's estimate more carefully.

Forward loop structure:

def diff_lines(a, b):
    N, M = len(a), len(b)
    offset = M? k ranges from -(N+M)... k = x - y, x in 0..N, y in 0..M, k in [-M, N]. Use array size N+M+1, offset = M.
    max_d = N + M
    V = [0]*(N+M+3)? Indices: k+offset where k in [-M, N]. But during search k ranges -d..d, d up to max_d = N+M, so k+offset in [M - (N+M), N] = [-N, N]... hmm offset must accommodate k min = -max_d? k = x - y with x,y ≥ 0: min k = -M (when x=0, y=M). But in the algorithm, k only ranges -d..d with parity constraint; k = -d with d up to N+M gives k down to -(N+M), but actual reachable k ≥ -M. The array indexing: use size N+M+1, offset = N? Standard: V sized 2*max_d+1... Let's just use size N+M+1 with offset = N (since k ∈ [N's range]: k max = N (y=0), k min = -M). Index = k + N, valid for k in [-N, N]... k min is -M; need N ≥ ... index k+N ≥ N - M ≥ -(something). If M > N, index could be negative. Safer: size = N + M + 1, offset = M, index = k + M; k max = N → index N+M ok; k min = -M → index 0 ok. But during the loop k goes to -d which may be < -M? If d > M... d max = N+M; k = -d < -M possible when d > M, but those iterations compute unreachable diagonals (x would... they get computed but values invalid). To be safe, size array 2*(N+M)+3 with offset N+M? Just make offset = max_d = N+M, size 2*max_d+3. Wasteful memory 2*(N+M) ints per snapshot... for snapshots total memory O(D²) doubled. Eh.

Actually, simpler bound: k only needs range [-d, d], and we can bail early once x ≥ N and y ≥ M found at some d ≤ max_d. For the worst cases given, D is small (test 1) or ~N+M (test 2), so array size 2*(N+M)+1 is fine.

Let me write:

def diff_lines(a, b):
    N, M = len(a), len(b)
    if N == 0 and M == 0: return []
    max_d = N + M
    offset = max_d  # index = k + offset
    size = 2 * max_d + 1
    V = [0] * size
    trace = []  # trace[d] = list of V values for indices offset-d..offset+d? store copy of slice
    
Actually store trace[d] = V snapshot restricted to touched indices. Simpler: trace.append(V[:size]) each step — copy cost O(size)=O(max_d) per step → O(max_d²) total = 4M copies for test 2. Plus list creation overhead per step (2000 steps) trivial. 4M element copies in C-level slice — fast (V[:] is a C memcpy of pointers). That's fine! list slicing is fast.

Actually V[:] copies pointers; 2000 pointers per step * 2000 steps = 4M pointer copies — microseconds-level, fine.

Hmm wait, but then memory: trace holds D+1 lists each of size 2*max_d+1 = ~4001 → 2001*4001 ≈ 8M pointers ≈ 64MB. Hmm, that's heavy but might be acceptable. Reduce: copy only slice [offset-d-1, offset+d+2] (need neighbors for backtrack? In backtrack we need V_{d-1}[prev_k] where prev_k = k±1, k in [-d, d], prev_k in [-d-1... no: k-1 ≥ -d-1? For k = -d we don't read k-1. k in [-d, d], reading k+1 ≤ d and k-1 ≥ -d. prev_k ∈ [-d, d] (k+1 = -d+1..d+1? if k = d, we don't read k+1 due to k != d check... condition: k == -d or (k != d and V[k-1] < V[k+1]). If k == -d → use k+1; elif k == d → use k-1; else compare). So needed indices in V_{d-1}: [-d, d]. So copy slice from offset-d to offset+d inclusive, store with its own offset. trace[d] = (base_offset_d, V[offset-d : offset+d+1]). For step d, slice length 2d+1. Total memory sum = (D+1)² ≈ 4M pointers = 32MB. Better.

But simpler: store full copies; 64MB acceptable? Python list of 4001 ints ≈ 4001*8 + overhead ≈ 32KB; 2001 such ≈ 64MB. Under typical limits probably fine but let's do the sliced version to be safe.

Actually wait — even simpler: we don't need full snapshots. During backtracking, we can recompute forward? No, that's O(D²) recomputes... Alternative: store for each step d, for each diagonal k, only the predecessor direction and the pre-snake point? We could store per (d, k) the x value (post-snake). That's the snapshot anyway.

Alternatively, backtrack using the values recorded: during forward pass, when we compute V[k] = x at step d, we can record (prev_k, prev_x_before?) Actually record for each (d,k): the chosen predecessor diagonal and the pre-snake x. Then backtrack without V_{d-1} lookups. Store: at step d, for each diagonal k in [-d..d], we compute x_post and also x_pre (start of snake) and direction. Then backtrack: we know end (D, k_end = N-M, x=N). Look up step-D record for k_end: gives x_pre (pre-snake start on diagonal k_end... wait pre-snake point after the edit move, still on diagonal k). Direction tells whether the edit move consumed an a-line or b-line. Then the previous point is: if deletion (came from k-1): point (x_pre - 1, y_pre) where y_pre = x_pre - k; the consumed line a[x_pre - 1]. Then move to diagonal k-1 at step d-1, where reach is exactly (x_pre - 1, y_pre)? Yes — the predecessor point is the furthest reach of diagonal k-1 at step d-1? Not exactly: the predecessor point (V_{d-1}[k-1] + 1... hmm. For deletion branch: x_pre = V_{d-1}[k-1] + 1, so predecessor reach point is (V_{d-1}[k-1], V_{d-1}[k-1] - (k-1)). And that is the furthest reach of diagonal k-1 at step d-1, which is exactly where backtracking continues. Similarly for insertion: predecessor point = (V_{d-1}[k+1], V_{d-1}[k+1] - (k+1)). So recording per (d,k): direction and x_pre (post-edit, pre-snake), plus maybe the predecessor reach is implied: predecessor reach x = x_pre - 1 (deletion) or x_pre (insertion) on diagonal k∓1 at step d-1.

But wait: is the backtrack point always exactly the furthest reach of the predecessor diagonal at step d-1? Yes, because forward moves start from V_{d-1}[prev_k] (for insertion) or V_{d-1}[prev_k]+1 (for deletion), and the snake then extends. So the predecessor point is the furthest reach of prev_k at step d-1, which has a record at step d-1 for diagonal prev_k. 

So records: for each d, a dict/list mapping k (in [-d, d]) → (dir, x_pre) where dir 0 = came from k+1 (insertion), dir 1 = came from k-1 (deletion). Then backtrack:

(d, k, x, y) current = end: (D, N-M, N, M). records[d][k] gives (dir, x_pre). The snake covers x_pre..x-1? The furthest reach (x,y) is post-snake; pre-snake (x_pre, y_pre = x_pre - k). Snake consumed a[x_pre..x-1] and b[y_pre..y-1] → equal lines. Then edit move: if dir insertion: consumed b[y_pre - 1] → "+" line b[y_pre - 1], and previous point is (x_pre, y_pre - 1) on diagonal k+1 at step d-1: x_prev = x_pre, k_prev = k+1, y_prev = y_pre - 1. If dir deletion: consumed a[x_pre - 1] → "-", previous point (x_pre - 1, y_pre) on diagonal k-1, x_prev = x_pre - 1.

Hmm wait check insertion: pre-snake point (x_pre, y_pre) on diagonal k with y_pre = x_pre - k. The edit move inserted b-line: before move, on diagonal k+1 at (x_pre, y_pre - 1). Diagonal: x - (y-1)... x_pre - (y_pre - 1) = k + 1. ✓. Consumed b[y_pre - 1]. ✓.

Deletion: before move (x_pre - 1, y_pre) on diagonal k-1, consumed a[x_pre - 1]. ✓.

Then recurse with (d-1, k_prev, x_prev, y_prev). At d=0: (0, 0, x, y) with snake from (0,0): all "=" lines.

Records storage: for step d, store dict k→(dir, x_pre)? dict overhead high for 4M entries... Use a flat list per step: records[d] = list of (dir, x_pre) for k = -d..d? But k steps by 2 in the loop (parity). Store per step d, array indexed by (k + d) for k in -d..d step 2: length d+1. Total entries sum over d = (D+1)(D+2)/2 ≈ 2M for D=2000. Each entry a tuple → 2M tuples ~ heavy (~120MB?). Hmm. Store two flat arrays: dirs (bytearray or ints) and xs. Per step: dirs_d = list of ints length d+1, xs_d = list length d+1. Total ints ≈ 4M across both → lists of pointers, 4M*2*8 = 64MB + int objects (small ints cached mostly if values < 257... no, x values up to 2000, not cached). Int objects 28 bytes each → 4M*28 = 112MB... too heavy? Actually x values up to N=2000, distinct objects. Hmm 2000 steps each creating ~2000... total 4M ints → memory concern.

Alternative: single flat list for all steps: xs_flat where records for step d start at index d(d+1)/2. Same memory.

Hmm. Let's reconsider: full V snapshots sliced: trace[d] = list copy of V[offset-d:offset+d+1] — but V is a flat list of size 2*max_d+1 of ints; the slice copies pointers but int objects are shared between snapshots (same objects). So memory: pointers total (D+1)² ≈ 4M * 8 = 32MB, plus distinct int objects ≤ 2*max_d+1 ≈ 4000 ints (shared). That's much better! Because V entries at step d-1 mostly unchanged when copied to step d — the int objects are shared. So full-sliced snapshot approach: 32MB pointers, fine.

So: trace[d] = V_slice (length 2d+1) representing V values for k in [-d, d] at end of step d. Backtrack needs V_{d-1}[k±1] for k in [-d, d] → indices within [-(d-1), d-1] → within slice d-1 (length 2d-1, covering k ∈ [-(d-1), d-1]). ✓.

But note: when computing V[k] at step d, we read V[k-1] and V[k+1] from the full array — which hold step d-1 values for those parities. But careful: the full array V of size 2*max_d+1 persists; after step d, entries for k in [-d, d] updated. When step d+1 computes k', reads V[k'-1] (step-d value, parity d... k'-1 parity matches d? k' parity = d+1's parity; k'-1 has parity d → was updated at step d ✓) and V[k'+1] (also parity d, updated at step d ✓). Great.

Backtrack: at (d, k): slice = trace[d], local index = k + d. Values of trace[d-1]: local index = k' + (d-1), representing diagonal k'. Need V_{d-1}[k+1] → trace[d-1][k+1 + d-1] = trace[d-1][k+d] and V_{d-1}[k-1] → trace[d-1][k+d-2]. Valid when k+1 ≤ d-1 and k-1 ≥ -(d-1), i.e., k < d and k > -d — matching the forward conditions (k==d forces deletion; k==-d forces insertion).

Forward loop:

for d in range(max_d+1):
    for k in range(-d, d+1, 2):
        idx = k + offset
        if k == -d or (k != d and V[idx-1] < V[idx+1]):
            x = V[idx+1]
        else:
            x = V[idx-1] + 1
        y = x - k
        while x < N and y < M and a[x] == b[y]:
            x += 1; y += 1
        V[idx] = x
        if x >= N and y >= M:
            # found, D = d
            ... backtrack and return.

trace.append(V[offset-d : offset+d+1]) — append before or after updating V[idx]? We need trace[d] to include V[k] = x for all k in [-d, d] — append after inner loop. But we break out upon finding; still append the slice before breaking? We need trace[d] for the final k too. Append slice then check/exit. Actually check inside loop; simplest: after inner loop completes... but we want early exit. Structure:

found = False
for d ...:
    snapshot needed after step; but exit occurs mid-loop. We can set V[idx] = x, then if condition met: record d_final, k_final, then append full slice V[offset-d:offset+d+1] and break. Since remaining k not yet computed but we only need k_final's entry which is set. The slice contains garbage beyond computed k's but we never use them.

Then backtrack:

d = d_final, k = k_final, x = N, y = M. Build script backwards.

result reversed list; while d > 0:
    slice_d = trace[d]  # covers k in [-d, d], local idx = k + d
    slice_p = trace[d-1] # local idx = k' + d - 1
    # determine direction
    if k == -d or (k != d and slice_p[k+d-2]... 

Careful: V_{d-1}[k+1] = slice_p[(k+1) + (d-1)] = slice_p[k+d]; V_{d-1}[k-1] = slice_p[(k-1)+(d-1)] = slice_p[k+d-2].

Hmm — but is the forward decision guaranteed recoverable from these? Forward decision compared V_{d-1}[k-1] vs V_{d-1}[k+1] where these were read from the full V array. Are full-array V_{d-1} values equal to the slice values? The slice at step d-1 was taken after step d-1's inner loop; full V entries for diagonals k±1 (parity of d-1) are unchanged between end of step d-1 and when they're read at step d (only step d updates parity-of-d diagonals). ✓.

    if k == -d:
        dir_ins = True
    elif k == d:
        dir_ins = False
    else:
        dir_ins = slice_p[k+d-2] < slice_p[k+d]   # V[k-1] < V[k+1] → insertion
    if dir_ins:
        x = slice_p[k+d]      # V_{d-1}[k+1]
    else:
        x = slice_p[k+d-2] + 1  # V_{d-1}[k-1] + 1
    y = x - k
    # snake from (x, y) to (x_end, y_end): equal lines a[x..x_end-1]
    append "=" for a[x..x_end-1] reversed order later... we're building backward; simpler to prepend or build then reverse.

Let me build list `script` in reverse (from end to start), then reverse at end.

For each step from d down to 1:
    compute x_pre (snake start), y_pre.
    snake: for i in range(x_end - 1, x_pre - 1, -1): script.append(("=", a[i])) — these are a[x_pre..x_end-1].
    if dir_ins: script.append(("+", b[y_pre - 1])); then new end: x_end = x_pre, y_end = y_pre - 1, k += 1
    else: script.append(("-", a[x_pre - 1])); x_end = x_pre - 1, y_end = y_pre, k -= 1
    d -= 1

At d == 0: point (x_end, y_end) with k = x_end - y_end = 0; snake from (0,0) to (x_end, y_end): for i in range(x_end-1, -1, -1): ("=", a[i]).

Wait, careful: y_pre - 1 when insertion: y_pre = x_pre - k. Predecessor point on diagonal k+1: (x_pre, x_pre - (k+1)) = (x_pre, y_pre - 1). ✓ And is x_end of predecessor = x_pre? Predecessor reach V_{d-1}[k+1] = x_pre → its point (x_pre, x_pre - (k+1)). ✓.

Deletion: predecessor on diagonal k-1 at (x_pre - 1, x_pre - 1 - (k-1)) = (x_pre-1, y_pre). ✓.

Also need x_end consistency: current (x_end, y_end) must equal post-snake of this step: post-snake x = snake end ≥ x_pre; we recorded V_d[k] = x_end. And snake covers a[x_pre..x_end-1] — these must be equal to b[y_pre..y_end-1]. Fine.

One subtlety about y bounds: b[y_pre - 1] requires y_pre ≥ 1 — true since insertion happened means y_pre ≥ 1... y_pre = y_end' ... the insertion move increments y from y_pre - 1 to y_pre, and y_pre ≥ 1 since move increments y. Similarly x_pre ≥ 1 for deletion. ✓.

Also the initial V[0... offset] = 0: V at offset index = diagonal 0 = 0 initially. Other entries: for d=0 loop k=0: k == -d → x = V[idx+1] = 0 (garbage but k==-d forces, x=V[1+offset]=0 anyway). Then snake. Fine — but those garbage entries: at d=0, k=0, k==-d so x = V[idx+1]; V initialized to 0 everywhere → x=0. ✓.

Edge case: empty a and empty b: max_d = 0, loop d=0, k=0: x=0,y=0, condition x>=0 and y>=0 → found at d=0... trace[0] appended, backtrack loop d==0 → snake from (0,0) to (0,0): nothing. Return [].

Edge: a empty, b nonempty: N=0. d=0: k=0, x=0, y=0, snake: x<0? x< N=0 false → x=0,y=0. Not x>=N and y>=M (y=0 < M). d=1: k=-1: k==-d → x = V[idx+1] = V[0+offset]=0, y = x - k = 1, snake none, V set. not done (x=0=N ✓ but y=1... need y>=M only if M=1). k=1: k==d → x = V[idx-1]+1 = 0+1 = 1 > N? x=1, y=0. Snake: x<N false. V set. Hmm k=1 gives x=1 ≥ N ✓, y=0 ≥ M? only if M=0. For M=1: k=-1 gives y=1 ≥ M=1, x=0 ≥ N=0 → found d=1, k=-1. Backtrack: dir_ins (k==-d) → x = slice_p[k+d] = trace[0][k + d... wait trace[0] slice for d-1=0 is V[offset-0:offset+1] = [V[offset]] = [0], length 1. slice_p[k+d] = slice_p[-1+1] = slice_p[0] = 0 = V_0[k+1] = V_0[0] ✓. x_pre = 0, y_pre = x_pre - k = 1. Snake: x range range(x_end-1, x_pre-1, -1) = range(-1, -1, -1) empty. Insertion: append ("+", b[y_pre - 1]) = b[0] ✓. d→0, k→0, x_end=0, y_end=0. Final: snake from (0,0): nothing. Result reversed: [("+", b[0])] ✓.

Edge: d_final found when k such that... fine.

Also: what if a line appears many times — algorithm handles, minimal by LCS property of Myers.

Now the forward loop with early exit: check `if x >= N and y >= M` after snake, set V[idx] = x first, append slice, break both loops.

Performance optimization details: use local variables. The main cost for test 2 (1000×1000 completely different, D=2000): inner loop iterations sum_{d=0}^{2000} (d+1) ≈ 2M. Each iteration: a few ops + slice comparisons. The while snake loop does 1 failed check per iteration → cheap. Estimated ~2M iterations × ~0.3µs... Python ~ maybe 4-6 seconds? Hmm risky. Let's optimize inner loop.

Wait, actually reconsider: for completely different lists, at step d, diagonal k: is the reach valid? For no common lines, at step d, diagonal k reachable requires... x ≤ N, y ≤ M. k = x - y. Reaches: at step d, diagonal k has x = ? With no matches, snakes are zero. Then V_d[k] follows pure edit path: x = number of deletions, y = insertions, x + y = d. So V_d[k] for k ≡ d mod 2, x = (d + k)/2, y = (d - k)/2, valid if x ≤ N and y ≤ M. The forward loop still does full work: for each (d, k) it computes, compares, snake-check fails. So ~2M iterations unavoidable with this algorithm shape. 2M Python loop iterations each with ~10 bytecode-heavy ops... roughly 1.5-3 seconds. Should be under 6s. Let's aim to make the inner loop tight.

Also the trace slicing: 2000 slices, total copied elements sum 2*(d+1)... slice length 2d+1 → sum ≈ 4M pointer copies at C speed → ~50ms. Fine.

Actually wait — for test 2 the D found = 2000 = N+M, meaning trace has 2001 lists totaling ~4M slots → ~32-64MB. Fine.

Hmm, one more consideration: early exit condition `x >= N and y >= M` — when N=0 or M=0 handled naturally? If both empty handled at d=0. If a empty: as shown works.

Also possible early termination optimization: trim diagonals where x > N or y > M (can clamp). Optional; skip.

Another optimization for test 1 (20000 lines, diff ~50): D ≈ 100; outer loop 100 iterations, inner up to 201 diagonals → 10k iterations, snakes: total snake scanning could be large? Each step, each diagonal's snake extends beyond previous reach. Worst case total O((N+M)·D) = 40k... actually snake comparisons: string comparisons a[x]==b[y] — Python string eq is fast (identity or hash-based? list elements are the same string objects if equal typically — identity check makes it O(1)). 40k*? fine, microseconds-ms. Actually per step d, snake extension: each diagonal advances; the total advance across all steps bounded by O(D·(N+M))? For nearly identical lists, reach per diagonal advances roughly 2 per step? Not exactly, but bounded by (N+M) per diagonal total... it's fine.

Hmm wait — actually there's a subtle worst case: the sum of snake lengths over all steps is O(N·D)? The furthest reach per diagonal per step can jump by up to 2 (since V[k] can increase by at most... x on diagonal k at step d vs step d-2: increases by ≤ 2? Because from V_{d-2}[k], you can do down, right then snake: x increases by at most 2 before needing... no wait, snake can be long. Actually the classic bound: total work O((N+M)·D) because each diagonal's reach can advance by at most (N+M) over the whole run, times D diagonals... Hmm, the standard argument: for a fixed diagonal k, V[k] at consecutive steps d, d+2 — the furthest reach can advance by more than 1 due to long snake? Consider: V_d[k] = x. V_{d+2}[k]: computed from V_{d+1}[k±1] which derived from V_d[k] plus at most... V_{d+1}[k-1] ≥ V_d[k] (as point) +1 in x, and V_{d+1}[k+1] ≥ V_d[k] +1 in y... The snake from V_{d+1}[k-1]+1: the point (V_{d+1}[k-1]+1, ...) — could a long snake carry it far past V_d[k]? The snake moves match a[x]==b[y]; the furthest reach argument: V_{d+2}[k] ≤ V_d[k] + 2? Hmm, I recall the bound is: V[k] for parity d increases by at most... Actually the standard O(ND) time proof: the sum over all steps of snake lengths ≤ O(ND) — no wait, it's argued that for each diagonal and each step, the snake advances the furthest-reach by at most... Let me think: furthest reach point on diagonal k at step d: (x_d, y_d). Claim: x_{d+2} ≤ x_d + 2? Suppose path for V_{d+2}[k]: d+2 edits ending on k. Remove the last two edits (they're among {insertion, deletion, snake}); the path passes through some point 2 edits earlier. Hmm, the standard proof: any path with d edits reaching diagonal k can be decomposed; the reach x_{d+2}[k] can exceed x_d[k] by more than 2 if there are long snakes — but those long snakes would also be traversable from x_d[k]'s path... Because a snake is maximal match run: if from a point p on diagonal k (reached with d edits) the snake continues to (x', y'), then V_d[k] would have included it (furthest reach extends through snake). So V_d[k] is snake-maximal. V_{d+2}[k]: candidate predecessor V_{d+1}[k+1] which ≤ ... hmm V_{d+1}[k+1] as a point on diagonal k+1; delete → point (V_{d+1}[k+1] + 1, same y). Is that point's snake bounded? V_{d+1}[k+1] ≤ V_d[k+1] + 1? By induction: V_{d+1}[k+1] comes from snake starting at ≥ V_d[k+1]-ish... I recall the bound x increases by ≤ 1 per step per diagonal holds?? Let me verify: claim: for parity-consistent steps, V_{d+2}[k] ≤ V_d[k] + 1? Hmm.

Proof sketch: any point reachable on diagonal k with d+2 edits: take its path; consider the point where it last was "2 edits earlier"... The path has d+2 edit steps (insert/delete), snakes free. Consider the path truncated to d edits: it reaches some diagonal k' with |k - k'| ≤ 2 and k' ≡ k (mod 2)? Truncating 2 edit steps: the point after d edits lies on some diagonal k2 where k2 = k ± 0, ±2 (two edit steps change x - y by ±1 each). By induction V_{d}[k'] bounds reach for all k' reachable. Then from that point, 2 edit steps + snakes reach (x, y) on k. From point (x0, y0): two edit steps move x + y by ≤ 2 → x ≤ x0 + 2 (worst case both deletions, but then diagonal k0+2 = k → k2 = k-2, and V_d[k-2] ≥ x0... so x ≤ V_d[k-2] + 2). Then snake after could extend beyond — but snake extension: if (x, y) on diagonal k with a[x]==b[y], then from a point (x'', y'') on diagonal k with x'' ≥ x... hmm, the point (x,y) after 2 edits from (x0,y0): could there be a long snake from (x,y) that doesn't overlap the snake from V_d[k]? Since V_d[k] ≥ reach of... if k2 = k-2 and V_d[k-2] = x0 + something... I recall the actual result: the total time is O((N+M)·D) and the proof handles it: per step, per diagonal, the furthest reach x increases by at most... Actually I remember now: the reach on diagonal k for parity p steps: V_{d+2}[k] ≤ V_d[k] + 2? And snake extension can be long but only when matches — and total snake work is bounded because... Hmm, the standard proof (Myers 1986): "the furthest reaching point for diagonal k in d ≤ D cannot exceed... " the algorithm is O((N+M)D) because for each d, the work is O(N+M)? No—per d, sum of snake lengths ≤ N+M + D? Each snake on diagonal k at step d starts at x ≥ V_{d-2}[k]... 

Let me just recall known fact: Myers basic algorithm worst-case time O((N+M)·D). Yes, that's the established bound. The proof: for diagonal k at step d vs d+2: x_{d+2} ≤ x_d + 1? Hmm. Actually here's a clean argument: V_{d+2}[k] is reached via a path of d+2 edits. Consider removing the final snake: pre-snake point (x_pre, y_pre). x_pre ≤ (reach with d+2 edits minus snake)... The pre-snake point on diagonal k arises from edit move from diagonal k±1 at step d+1: pre-snake x_pre = V_{d+1}[k-1] + 1 or V_{d+1}[k+1]. And V_{d+1}[k±1] ≤ V_{d-1}[k] + 1 (as x-coordinate on diagonal k... hmm diagonal k±1 point (x1, y1); after one edit moving toward k: x changes by 0 or 1). So x_pre ≤ V_{d-1}[k] + 1 + 1 = V_d... where V_{d-1}[k] + snake... V_{d-1}[k] ≤ V_{d+1}[k]... 

I'll trust O((N+M)D). For test 1: 40000·100 = 4M worst case ops in Python ~ 3-4 s? Hmm, might be tight with the 2-second limit. But realistically, snakes advance and the reach per diagonal per 2 steps increases by ≤ 2? Let me think again more rigorously, because the actual total snake length matters.

Claim: For each diagonal k, considering steps of matching parity d, d+2, d+4, ...: V_{d+2}[k] ≤ V_d[k] + 2? Hmm consider: point on diagonal k reachable at step d+2 with x = V_d[k] + 3? Path: d edits to reach diagonal k at (V_d[k], ·) — but the furthest reach V_d[k] is snake-extended. Any path reaching diagonal k with d edits reaches x ≤ V_d[k]. Now path for step d+2 on diagonal k: truncate last 2 edit steps → point p after d edits on diagonal k' ∈ {k-2, k, k+2}. Case k' = k: p.x ≤ V_d[k], then 2 edits + snake: from p, 2 edits along... to end on k: either (del, ins) → same diagonal, net x+0... del then ins: x +1 then y +1 → point (p.x+1, p.y+1) on k; then snake. Or ins then del: (p.x, p.y+1)→(p.x+1, p.y+1). Or two dels then to reach k need... two dels → k+2 ≠ k. So from p: point q = (p.x+1, p.y+1) on diagonal k, then snake → but snake from q: since q ≥ (V_d[k]... p.x ≤ V_d[k] so q.x ≤ V_d[k]+1, q on diagonal k. Is the snake from q bounded? Snake from q: extends while matches. Snake from the furthest reach V_d[k] = (X, Y): also could extend? No — V_d[k] is post-snake maximal, so a[X] != b[Y] (or boundary). If q.x = X + ... hmm if q.x ≤ X: snake from q is contained within snake from... points on the same diagonal: snake from (x1,y1) extends to (x1+s, y1+s) iff a[x1..x1+s-1]==b[y1..y1+s-1]. If q ≤ (X,Y) coordinatewise on diagonal k (q.x ≤ X since q.x ≤ V_d[k] = X? wait X = V_d[k] is the x of furthest reach; p.x ≤ X so q.x ≤ X+1). Snake length from q: matches from position q. From (X, Y): no match at (X, Y) (end of snake... unless boundary). Snake from q = (q.x, q.x - k): length s means a[q.x..q.x+s-1] == b[q.y..q.y+s-1]. If q.x + s - 1 ≥ X, then a[X] == b[Y] where Y = X - k, q.y + (X - q.x) = X - k = Y. That contradicts maximality of V_d[k] unless X = N or Y = M (boundary). So snake from q extends at most to (X, Y) plus possibly... if q.x ≤ X: s ≤ X - q.x + ... s such that q.x + s ≤ X or ends at boundary: s ≤ X - q.x unless the snake from q ends exactly because... if q.x + s > X then a[X]==b[Y] contradiction (unless X=N: then s ≤ N - q.x bounded anyway; boundary limits). So snake from q ends by x ≤ max(X, N)... = X if X<N... if X < N and Y < M, s ≤ X - q.x. So V_{d+2}[k] ≤ X + 1 via this route. Plus other routes: k' = k-2: V_d[k-2] = (X', Y'), two dels → (X'+2, Y') on diagonal k, then snake: same argument? Snake from (X'+2, Y'): extends to at most x ≤ V_d[k]?? By same argument: snake from point r on diagonal k with r.x ≤ ... hmm r.x could exceed X? V_d[k-2] vs V_d[k]: no ordering guarantee... X' could be > X! E.g., many deletions on earlier diagonals. Then snake from r = (X'+2, Y') could run far past X. Example: a = "aaaa...", b = "baaab"? Hmm. Classic example: a = "a"*n, b = ["x"] + a? Then LCS = n, D = 2. Not far. For snake running far past X: need a[X'+2 ..] == b[Y' ..], but V_d[k] = X was snake-maximal meaning a[X] != b[Y] (interior). But a[X'+2] == b[Y'] possible with different alignment? On same diagonal k: r = (X'+2, X'+2 - k), V_d[k] = (X, X - k). If X' + 2 > X: snake from r at offset r.x: a[r.x] == b[r.x - k]. The maximality of V_d[k] says a[X] != b[X - k]. Both can hold if X' + 2 > X... wait, if r.x ≤ X, snake from r could pass X only if a[X] == b[X-k], contradiction. If r.x > X, no contradiction — snake from r can be long! Then V_{d+2}[k] jumps: e.g., x_{d+2} = X' + 2 + s where s large. Total snake work: bounded by O(D · (N+M)) = the stated bound. So worst-case snake total = (N+M)·D = for test 1: 40000·100 = 4M comparisons. Python: each comparison a[x]==b[y] with loop increments ~ 0.1-0.15µs? A while loop iteration with 2 comparisons, 2 increments, condition: ~0.3µs → 4M × 0.3µs = 1.2s. Plus overhead. Tight but probably under 2s in CPython 3.11 (which is faster). Hmm, but is that worst case realistic for "differ in about 50 places"? The problem says "differ in about 50 places" — probably like 25 substitutions each (D=100 with interleaved equal runs). Then snakes: each step, reach advances via snakes; the total snake length is roughly... For nearly-identical sequences, V[k] advances along; total snake work ≈ sum over d of (advance) ≈ D·2 per diagonal per step? Hmm, actually with interleaved equal regions, the furthest reach per diagonal per step grows by ~2, snake scans are short (2 per step per diagonal? no...). Let me think: typical Myers on similar sequences: per step d, per diagonal k, the reach advances by exactly... the snake extends while matches; since reaches from different diagonals interleave, snake per (d,k) is typically O(1)... Not necessarily but commonly. Realistic runtime: fine.

To be safer performance-wise, I could add the common optimization: prune diagonals where x > N or y > M? And also an optimization: check overlap of forward... not needed.

Alternatively, could add a "trim": if x > N or y > M, skip (invalid). This bounds work.

Actually there's a well-known optimization to cap: don't explore diagonals beyond boundaries. Add: after computing snake, if we detect... eh, minor.

Let me also consider using the "middle snake" linear space algorithm — it would give O(D²·?) hmm, linear-space Myers has O((N+M)·D) time too but with recursive overhead. I'll stick with snapshots.

Memory check again for the sliced trace with the flat-V: I copy slice after each d. But note: entries V[k] for k beyond already-computed in final partial step may contain stale values; in backtrack we only access trace[d][k+d] for computed ks — final k was computed. ✓.

Now, another subtle correctness point: the forward condition uses `V[idx-1] < V[idx+1]` where idx-1 corresponds to diagonal k-1 (parity opposite → value from step d-1 ✓) and idx+1 diagonal k+1 (also parity opposite? k and d same parity; k+1 opposite ✓).

Implementation:

def diff_lines(a, b):
    N = len(a); M = len(b)
    max_d = N + M
    offset = N  # index = k + N; k in [-M, N] → index in [N-M, 2N]... k min = -M ≥ -max_d... need size ≥ N + max_d + 1? Let's use offset = N, size = N + max_d + 1? index range: k from -d..d, d ≤ max_d → k ≥ -max_d ≥ -(N+M) → index ≥ N - N - M = -M. Negative if M > N. So offset = M? k max = N → index N + M... size = N + M + 1 with offset = M: index k+M ∈ [0, N+M] for k ∈ [-M, N]. But loop k reaches -d up to -(N+M) < -M when N... d can exceed... d ≤ max_d = N+M; k = -d → index M - d ≥ M - (N+M) = -N < 0 possible. However, in practice do we ever compute k = -d with -d < -M? At step d, diagonal k = -d requires y - x = d ≤ M? To be on diagonal -d, need y = x + d ≤ M → d ≤ M. So k = -d < -M never yields valid reach; but the loop still iterates over those k and computes garbage (x = V[k+1] which might be stale/zero). We must ensure no IndexError: index k + M ≥ 0. So size array with offset = max_d to be safe: size = 2*max_d + 1, index = k + max_d. Memory: V flat list 2*(N+M)+1 ints — fine (only one copy).

But hold on: garbage computations on impossible diagonals could cause the algorithm to report a smaller D incorrectly? No — impossible diagonals have invalid reaches; the found condition x ≥ N and y ≥ M requires a valid path. Could garbage produce false "found"? x ≥ N and y ≥ M with k = x - y... if x = N and y = M then k = N - M which is valid. Could garbage x ≥ N, y ≥ M on diagonal k ≠ N - M? x ≥ N, y ≥ M, x + y = number of edits ≥ d... If garbage sets x ≥ N and y = x - k ≥ M with x < N... impossible since x ≥ N needed. x ≥ N with k ≠ N-M: y = x - k; y ≥ M → x ≥ M + k... possible? e.g., diagonal k > N - M: x ≥ N and y = x - k < N - k... need y ≥ M → x ≥ M + k > M + N - M = N → x > N. But can V[k] exceed N? x counts deletions+matches ≤ N always if computed from valid paths; garbage: values are always from valid computations of other diagonals + 1 or snakes bounded by N... x = V[other]+1 where other's value ≤ N... could chain? Values only set as x = V[k+1] (≤ N-ish) or V[k-1]+1, plus snake while x < N. So x ≤ N always? x = V[k+1] ≤ N (inductively), snake never exceeds N. So x ≤ N always. Then found requires x = N exactly? x ≥ N and x ≤ N → x = N, y = N - k ≥ M → k ≤ N - M. Combined with valid path argument... y ≥ M and y ≤ M (y = x - k, snake bounded by M; y = V[k+1] - k ≤ ... inductively y ≤ M? y = x - k; hmm x = V[k+1] from diagonal k+1, y = x - k = y_prev + 1 where y_prev ≤ M... inductively y ≤ M). So x = N, y ≥ M → y = M → k = N - M. Only correct diagonal triggers. But could it trigger at a d smaller than true minimal? The found check triggers the first time any path reaches (N, M) — which is minimal D. Garbage diagonals can't reach (N, M) unless valid. ✓. However: garbage x values on impossible diagonals: could they corrupt future valid computations? E.g., diagonal k impossible at step d (k = -d ≤ -M-... only when d > M, i.e., beyond required D anyway... hmm when would d exceed M while not found? If D_true > M means more insertions than M?? insertions ≤ M total (can't insert more than M lines in minimal script... actually LCS-based script: deletions = N - LCS ≤ N, insertions = M - LCS ≤ M, D = N + M - 2·LCS ≤ N + M, and could D > M? if N > M and LCS small: D = N + M - 2LCS; e.g., N=1000, M=0, D=1000 > M=0. Then loop k = -d for d up to 1000 with k < 0 = -M... those diagonals: x = V[k+1]... these are "phantom". Values there: computed via V[k-1]+1 chains → x could grow up to? V[k-1] at previous step on impossible diagonal also garbage but bounded by construction x ≤ N. Snake bounded. So values ≤ N, harmless, but the found condition x ≥ N and y ≥ M: y = x - k = x + d > ... for k = -d very negative, y = x + d could exceed M! Wait — then found would trigger wrongly?? x ≥ N requires x = N (as argued x ≤ N always — but is that true for garbage chains? x = V[k+1] where V[k+1] might itself be garbage but garbage values are also ≤ N by induction — base: all V init 0; each new value = V[·] or V[·]+1 or snake ≤ N. Hmm V[k-1]+1: if V[k-1] = N then x = N+1 > N! Is V[k-1] = N possible on an impossible diagonal? Diagonal k-1 at step d-1: to have x = N there need a valid path? x = N means N deletions/matches: N deletions → diagonal = N - y... on diagonal k-1 with x = N: y = N - (k-1). Valid only if that's reachable... For garbage: x = V[k-2] + 1 chains: each step +1... could x grow beyond N? x = V[k+1] choice: no +1. x = V[k-1] + 1: chain along... but each step d, k fixed parity; V[k-1] was set at step d-1 as V[(k-1)+1] = V[k] choice (no +1, since for diagonal k-1 = -(d-1)+... hmm when k-1 = -(d-1), forced x = V[(k-1)+1] = V[k] — no increment. When k-1 > -(d-1): could be V[k-2]+1 at step d-1. So chains of +1 possible down the "right edge"? The right edge k = d: x = V[k-1]+1 each step → x grows by 1 per step → for d > N... but found would've triggered before d > ... hmm not necessarily before? If a = all distinct from b: found at d = N + M. Right edge k = d: x = V_{d-1}[d-1]+1... at step d, k=d: x = V_{d-1}[d-1] + 1, snake none. V_{d-1}[d-1] = V_{d-2}[d-2]+1... So V_d[d] = d + V_0[0]? = d+... Actually V_d[d] = d (pure deletions) capped: x = d... but x ≤ N? V_d[d] = d grows with d; for d > N, x = d > N! Wait — but deletions limited to N; the pure-deletion path on diagonal k=d uses x = number of deletions; beyond N it's invalid but the algorithm doesn't check! V_d[d] = d for all d (each step x = prev + 1, no snake since a[x] out of bounds — snake checks x < N first). So x exceeds N. Then found check: x ≥ N ✓ and y = x - d = 0 ≥ M? Only if M = 0. If M = 0, correct anyway (D = N). For M > 0: y = x - k on diagonal k = d: y = 0 < M. No false trigger. What about diagonal k = -d edge: x = V_{d-1}[-(d-1)] = ... forced x = V[k+1] values; y = x + d grows. Could trigger found: x ≥ N and y = x + d ≥ M. Hmm! Example: a = 1000 distinct lines, b = 1000 distinct lines, no common. True D = 2000. Diagonal k = -d: x = V_{d-1}[-d+1], which came from... values on left edge: x = V_{d-1}[k+1] where V_{d-1}[k+1] is computed at step d-1 as (k+1 == d-1? left edge k+1 = -(d-1) → forced from V[k+2]...). Left edge values: x_{d}[-d] = x_{d-1}[-(d-1)] = ... = x_0[0] = 0? Left edge: only insertions → x stays 0. So x = 0, y = d. Found when y ≥ M = 1000 at d = 1000 with x = 0 ≥ N? N = 1000, x = 0 < N → no trigger. Then continues: k=-d edge stays x=0? At step d, k=-d: x = V[k+1] = V_{d-1}[-d+1]. But -d+1 is not the left edge of step d-1 (left edge is -(d-1)); V_{d-1}[-d+1] computed at step d-1: k' = -d+1, k' > -(d-1) → k' != -d'... condition: k' == -d'(= -(d-1))? -d+1 = -(d-1) ✓ it IS the left edge! So forced insertion, x = V[k'+1] = V_{d-2}[-d+2]... chain back to 0. So left edge x = 0 forever. y = d ≥ M at d = 1000 but x = 0 < 1000. no trigger. Good.

But false-trigger in general: found requires x = N and y = M simultaneously (since x ≤ N? we showed x can exceed N on right edge; y can exceed M on left edge; but for trigger need both ≥). x ≥ N and y ≥ M and x + y = d + ... on diagonal k: x - y = k. Could a garbage path give x ≥ N, y ≥ M with x = N + i, y = M + j, i,j ≥ 0, k = N - M + i - j ≠ N - M? Values exceed bounds only on edge-diagonal chains (pure deletions beyond N on right, pure insertions beyond M on left). Right edge: k = d, y = x - d; to have y ≥ M need x ≥ d + M; x = d (right edge pure deletion starting from V_{d-1}[d-1]+1, but wait right edge at step d: k = d → forced x = V[k-1] + 1 = V_{d-1}[d-1]+1 → V_d[d] = d + ... base V_1[1] = V_0[0]+1 = 1, so V_d[d] = d). y = 0. Interior garbage? A diagonal k is "impossible" when |k| constraints: diagonal k reachable iff exists path: max deletions on k... x ≤ N, y ≤ M with x - y = k. Impossible diagonals get garbage from formulas. Could garbage accumulate to x ≥ N AND y ≥ M? y = x - k. Suppose N = 1000, M = 1000. Need x ≥ 1000 and x - k ≥ 1000 → k ≤ x - 1000 ≤ ... if x = 1000 + i... garbage x > 1000 requires right-edge chains: only diagonal k = d has V_d[d] = d (each +1); other diagonals inherit x = V[k+1] (no increment, from left-ish moves) or V[k-1]+1. Hmm, V_{d}[k] for k < d: x = V_{d-1}[k-1] + 1 possibly, where V_{d-1}[k-1] itself... chains can grow: V_d[k] ≤ d always (x + y = x + x - k = 2x - k; edits count = x + y - ... each edit adds 1 to x or y; snake adds to both equally... x + y = d + ... path length: x + y = d_initial... for path with e edits and snake s: x + y = e + 2·(matches)? No: each deletion +1 x, insertion +1 y, snake +1 both. x + y = e + 2s. So x ≤ d. So V_d[k] ≤ d ≤ max_d. False trigger needs x ≥ N and y = x - k ≥ M → x ≥ N and x ≥ M + k. With x ≤ d. So needs d ≥ N + M... d ≤ max_d = N + M, and D_true ≤ N + M. If d = N + M and x = N + i, y = M + j with i + j = d - (N+M) = 0 → i = j = 0 → exact. If d < N + M... hmm, but if true D < d we'd have found earlier. If true D = ... we search d ascending; false trigger at d < D_true requires a path with d edits reaching (x, y) with x ≥ N, y ≥ M, i.e., overshoot. Overshoot paths: e.g., delete extra lines then insert extra: reach (N+1, M+1) with... x = N+1, y = M+1, k = N - M, edits = x + y - 2·matches... overshoot needs x > N meaning deletions... x ≤ N always for paths respecting a's length? A path that deletes all N lines has x = N; can't exceed since snake stops at N and deletions... x = V[k-1]+1 — the +1 is a deletion of a[x_prev] where x_prev < N? The deletion move: from (x_prev, y_prev) to (x_prev + 1, y_prev) — is there a check that x_prev < N? No! The algorithm doesn't check. So paths can overshoot: x = N + 1 by deleting nonexistent line. Then a[x]==b[y] snake check: x < N fails, no snake. So V_d[k] could be N+1, y = N+1-k. Trigger needs y ≥ M too: k ≤ N + 1 - M. Hmm. Example: a = 1 line "x", b = 1 line "y". N=M=1. True D=2. d=0: k=0: x=0,y=0, no snake, V=0. d=1: k=-1: x = V[k+1] = V_0[0] = 0, y = 1. check: x≥1? no. k=1: x = V_0[0]+1 = 1, y = 0. x≥1 ✓, y ≥ 1? no. V_1[1] = 1. d=2: k=-2: x = V_1[-1] = 0, y = 2 ≥ 1 but x < 1. no. k=0: x = min path... V_1[-1] = 0 vs V_1[1] = 1 → V[k-1]=V_1[-1]=0 < V_1[1]=1 → x = V[k+1] = 1 (insertion), y = 1. x≥1 ✓ y≥1 ✓ → found d=2, k=0. Correct (script: "-" x, "+" y). 

Potential false trigger scenario: overshoot with x = N + i, y = M + j, i + j > 0 but diagonal arithmetic: this requires the path to have deleted N+i lines — but only i "phantom" deletions beyond a's length... phantom deletions = increments x without bound check. Each phantom deletion adds 1 to d. So a false trigger at d would mean d ≥ D_true + something... but could false trigger happen at d < D_true? D_true = N + M - 2L. False trigger path: e edits reaching (N+i, M+j): deletions = N + i... wait deletions count = x - matches = (N + i) - m_d, insertions = (M + j) - m_i... hmm total edits e = (N + i - m_a) + (M + j - m_b) where m_a = matched a-lines = m_b = m: e = N + M + i + j - 2m ≥ N + M - 2m ≥ N + M - 2L = D_true when m ≤ L. But with overshoot i + j > 0 and m... e = D_true + (i + j) + 2(L - m) ≥ D_true + i + j... wait if m < L then e > D_true; if m = L and i+j > 0, e = D_true + i + j > D_true. So false trigger path has e > D_true... but trigger happens at d = e... and we scan d ascending, finding D_true first at d = D_true before any d' > D_true. But false trigger path with e = d where d < D_true? e ≥ D_true always for reaching (≥N, ≥M)? e = N + M + i + j - 2m; m ≤ L (matches of some subsequence... m = number of matched pairs, they form a common subsequence → m ≤ LCS = L). So e ≥ N + M + i + j - 2L ≥ D_true. Equality iff m = L and i = j = 0 → that's a real minimal path. So false triggers only at d ≥ D_true, and real trigger at d = D_true comes first (we break at first trigger in d order... within a step, we might trigger at wrong k before right k, but trigger at step d means d = e ≥ D_true; if d = D_true but from a path with m = L, i=j=0 → it IS reaching (N, M): x = N, y = M exactly since i=j=0. So trigger diagonal k = N - M? But we might compute diagonal k triggering with x ≥ N, y ≥ M via i,j>0 at d = D_true — shown impossible since i+j = d - (N+M) + 2m = 2m - 2L ≤ 0 → i=j=0, m=L. And overshoot paths have d > D_true. So first trigger is the genuine minimal. ✓ (This is the standard correctness argument.)

But overshoot garbage also affects backtracking? We backtrack from the genuine (d=D_true, k=N-M, x=N, y=M). Values used in backtrack are on the true path... The backtrack decision at (d, k) recomputes the forward choice using V_{d-1}[k±1]. But wait: if V_{d-1}[k+1] or [k-1] were garbage/overshoot, the recorded choice in forward was based on them — but forward computed V_d[k] from one of them, and we backtrack through the same values, so consistency holds: the predecessor point (x_pre or x_pre-1, ...) equals V_{d-1}[prev_k]-based point, and we continue backtracking from exactly V_{d-1}[prev_k] reach point — which is where forward continued. Even if garbage, the chain traces back to a real path (the found path's prefix — since the trigger path is a real path composed of the recorded moves... hmm, is the backtrack chain guaranteed to reconstruct a real path from (0,0)? Forward: V_d[k] = value derived from V_{d-1}[prev_k] via +snake. Recursively, each V value traces back to step 0. The final trigger: x = N, y = M was computed as V_d[k] on some chain from V_0[0] = 0 = (0,0) with snakes = real matches. Even if intermediate predecessors are "garbage" in the sense of infeasible, the reconstruction follows actual recorded transitions, giving a sequence of moves that produces exactly the emitted script — and correctness of script content (the equal/-/+ consistency) is guaranteed structurally: deletion emits a[x_pre - 1] where the move was from x_pre - 1 → these form a coherent parse. The script property (kept+deleted = a, kept+inserted = b) holds structurally. Minimality: D = D_true = N + M - 2L, and script has deletions + insertions = D... total "=" count = number of snake steps total = L (matches along path). Since deletions + insertions = D and D minimal ⇒ "=" maximal. ✓.

Now write the code efficiently.

def diff_lines(a, b):
    N = len(a)
    M = len(b)
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]
    max_d = N + M
    offset = max_d  # wait, choose offset such that index = k + offset ≥ 0 for k ≥ -max_d: offset = max_d. size = 2*max_d + 1. But then k = N - M index = N - M + N + M = 2N fine.
    
Hmm, offset = max_d makes V list of size 2*(N+M)+1. For test 1: 40001 entries, fine.

    V = [0] * (2 * max_d + 1)
    trace = []
    a_local = a; b_local = b  # locals
    
    d_found = -1; k_found = 0
    for d in range(max_d + 1):
        # iterate k from -d to d step 2
        start = offset - d
        for k in range(-d, d + 1, 2):
            i = k + offset
            if k == -d:
                x = V[i + 1]
            elif k == d:
                x = V[i - 1] + 1
            elif V[i - 1] < V[i + 1]:
                x = V[i + 1]
            else:
                x = V[i - 1] + 1
            y = x - k
            ax = a_local  # hmm
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[i] = x
            if x >= N and y >= M:  # x == N and y == M as argued (well, x>=N and y>=M)
                trace.append(V[start : i + 1])  # need up to index i at least; but slice should cover -d..d for backtrack symmetric? For backtrack at this d, we need trace[d][k+d] only for the found k. Let's append slice V[start : i+1]? Later accesses: backtrack at step d uses slice_d only for k_final? No — backtrack uses trace[d] to get... at step d we need V_{d-1}[k±1] (from trace[d-1]) and we need pre-snake... we recompute x from trace[d-1], not from trace[d]. Do we need trace[d] at all? At the top step (d_found): we know x_end = N, y_end = M, k_final. We recompute x_pre from trace[d_found - 1]. We don't need trace[d_found]! And for lower steps, we need trace[d-1] relative to current. So trace needs steps 0..D-1 only! Great: we can append trace BEFORE the final found check, or just append slice each step and never use the last. Simpler: append slice after each d step (after inner loop, i.e., before found check? Found check is inside inner loop...). Restructure: set found flag; append slice at end of d-iteration; if found break before appending? We need trace up to index d_found - 1. So: after inner loop for step d completes, append slice, then if found flag set, break. But we want early exit without finishing the inner loop for performance... finishing the remaining k's of the final step is trivial cost (≤ 2d+1 extra iterations once). So: use flag.

Actually simpler: inside inner loop when found, record and break inner; then append slice; break outer. The slice covers indices start..offset+d but entries beyond current k are stale/garbage — never used as argued (backtrack uses trace[d-1] for the found step, and trace[d] never queried? wait, backtrack for step d (the found step) uses trace[d-1]. For step d-1, uses trace[d-2]. So trace[d] unused entirely!). Even better: we don't need trace at all?! Backtrack from (d, k) needs V_{d-1}[k-1] and V_{d-1}[k+1]. So we need all snapshots 0..D-1. Yes trace needed, trace[D] not. Fine.

So:

    for d in range(max_d + 1):
        found = False
        for k in range(-d, d + 1, 2):
            ...compute...
            V[i] = x
            if x == N and y == M? — hmm use (x >= N and y >= M); argued equivalent to equality. Use `if x >= N and y >= M:` fine. Set found = True; k_found = k; break
        trace.append(V[offset - d : offset + d + 1])
        if found:
            d_found = d; break

Wait — trace.append must happen even for found step? trace[d_found] not needed. But appending is cheap; but if found, entries after k_found in slice are stale — unused. OK append anyway or skip; skip to save time: put append before found-break? Let's just: if found: break without appending? But careful: for the NEXT... no next step. So:

        if found: d_found = d; break — but then trace lacks step d... fine since unused. But careful: trace indexing — backtrack uses trace[d-1] where d goes from d_found down to 1; needs trace[0..d_found-1] — all appended (steps 0..d_found-1 each appended before checking found at that step... step d_found-1 appended, yes since its own found check failed... assuming found only at d_found). But what if found at step d=0? Both sequences equal? a == b → d=0, k=0: snake runs to x=N,y=M → found, break before append; backtrack loop `while d > 0` skipped; final: emit "=" a[0..N-1]. ✓. trace empty, fine.

Backtrack code:

    script = []
    k = N - M  # k_found — is k_found always N - M? Trigger requires x = N, y = M → k = N - M. ✓ (could just use that)
    x_end, y_end = N, M
    d = d_found
    while d > 0:
        slice_p = trace[d - 1]  # covers k' in [-(d-1), (d-1)], local index = k' + (d-1)
        # need V_{d-1}[k+1] -> slice_p[k + d]; V_{d-1}[k-1] -> slice_p[k + d - 2]
        # Wait: local index for diagonal k' is k' + (d-1). For k' = k+1: k + d. ✓ For k' = k-1: k + d - 2 ✓.
        if k == -d:
            x_pre = slice_p[k + d]       # V_{d-1}[k+1]
            ins = True
        elif k == d:
            x_pre = slice_p[k + d - 2] + 1  # V_{d-1}[k-1] + 1
            ins = False
        else:
            if slice_p[k + d - 2] < slice_p[k + d]:
                x_pre = slice_p[k + d]
                ins = True
            else:
                x_pre = slice_p[k + d - 2] + 1
                ins = False
        y_pre = x_pre - k
        # snake lines: a[x_pre .. x_end - 1] equal b[y_pre .. y_end - 1]
        for i in range(x_end - 1, x_pre - 1, -1):
            script.append(("=", a[i]))
        if ins:
            script.append(("+", b[y_pre - 1]))
            x_end = x_pre
            y_end = y_pre - 1
            k += 1
        else:
            script.append(("-", a[x_pre - 1]))
            x_end = x_pre - 1
            y_end = y_pre
            k -= 1
        d -= 1
    # d == 0
    for i in range(x_end - 1, -1, -1):
        script.append(("=", a[i]))
    script.reverse()
    return script

Check slice bounds: slice_p has length 2(d-1)+1 = 2d-1, indices 0..2d-2. Access slice_p[k+d]: k ≤ d → ≤ 2d... for k = d: but then ins=False branch uses slice_p[k+d-2] = slice_p[2d-2] ✓ max index. For k = d-? in else branch: k + d ≤ 2d - 2 when k ≤ d - 2 (else branch excludes k = d; k parity same as d, so k ≤ d-2) → k+d ≤ 2d-2 ✓. slice_p[k+d-2]: k ≥ -d+2 in else → ≥ 0 ✓. For k == -d: slice_p[k+d] = slice_p[0] ✓. Good.

Also verify ins-decision consistency with forward: forward condition `k == -d → x = V[i+1]`; `k == d → x = V[i-1]+1`; else compare V[i-1] < V[i+1]. Backtrack mirrors. ✓.

But careful: forward used V[i-1] and V[i+1] from full array at time of computation = step d-1 values = trace[d-1] entries. ✓ (trace[d-1] appended after step d-1's inner loop).

Now correctness detail: x_pre from trace[d-1][...] equals V_{d-1}[prev_k], and forward's x for diagonal k at step d: x = V_{d-1}[prev_k] (+1 if deletion) then snake. The recorded reach x_end... during backtrack, at the first iteration x_end = N (= V_d[k_final] = N ✓). Then subsequent iterations: x_end set to predecessor points which equal V_{d-1}[prev_k] coordinates ✓ and recursion continues.

Snake emission order: we emit a[x_end-1] down to a[x_pre] — reversed later, giving ascending ✓.

Now, the found check inside loop: I used x >= N and y >= M. Given overshoot possibilities (x could exceed N only via right-edge chain? x = V[i-1] + 1 where V[i-1] could be N... then x = N+1, y = N+1-k ≥ M possible? Then trigger at k ≠ N-M with script reconstruction broken? Earlier argument: trigger at step d requires e = d ≥ D_true, and false trigger path has e = D_true + i + j + 2(L - m) ≥ D_true; trigger first occurs at smallest d where any trigger; the true path triggers at d = D_true exactly. Could a false trigger occur at d = D_true with x = N+i, y = M+j? Need d = e = D_true + (i+j) + 2(L-m) = D_true → i=j=0, m=L → x=N,y=M, k = N-M. So at d = D_true, any trigger has k = N-M. But could d = D_true trigger happen with k where... no. However, could a false trigger occur at d < D_true? e ≥ D_true shown (e = d for trigger at step d... wait is e = d for garbage paths? Garbage values like V_d[d] = d: the "path" has d phantom deletions — e conceptually d, reaching (d, 0). For trigger at step d from garbage: the value's "edit count" is d by construction (each step adds ≤ 1... x+y = d + 2·snake... hmm snake adds 2 per match to x+y... let me recompute: x + y where each of d steps adds ≤ 1 total? Deletion: x+1 → x+y +1. Insertion: +1. Snake: x+1,y+1 → +2! So x + y ≤ d + 2·(total matches). Hmm so garbage can have x+y > d. Redo: trigger path value at (d, k): x + y = (number of deletions + insertions) + 2·matches = e + 2m where e ≤ d... e = d exactly (each step exactly one edit or... at step d the value derives from step d-1 via one edit + snake). So e = d, x + y = d + 2m. Trigger: x ≥ N, y ≥ M → x + y ≥ N + M → d + 2m ≥ N + M → d ≥ N + M - 2m ≥ N + M - 2L = D_true. So d ≥ D_true ✓. And if d = D_true: d + 2m ≥ N + M → m ≥ L → m = L and x + y = N + M → i = j = 0. ✓ Great, no false triggers before/at D_true other than genuine. And within step D_true, could trigger occur at k ≠ N-M? Requires x=N+i, y=M+j, i+j=0 → k = N-M only. ✓.

So safe. But note in backtrack, the found step's V_d[k] entries for k ≠ N-M in trace[d_found] — unused anyway.

Now performance tuning of forward loop. Inner loop per iteration ops: index computation, two-three comparisons, snake while, assignment. Let's micro-optimize:

- Precompute nothing per k other than needed.
- Use local references: V, a, b, N, M, offset already local.
- The `for k in range(-d, d+1, 2)` plus computing i = k + offset each time.

Alternative formulation avoiding k arithmetic: iterate over index i directly from offset-d to offset+d step 2, and use i to derive conditions: k = i - offset; k == -d ⇔ i == offset - d; k == d ⇔ i == offset + d. And comparisons V[i-1] < V[i+1]. Snake: y = x - k = x - i + offset. So:

off = offset
for d in range(max_d + 1):
    lo = off - d
    hi = off + d
    found = False
    kf = 0
    for i in range(lo, hi + 1, 2):
        if i == lo:
            x = V[i + 1]
        elif i == hi:
            x = V[i - 1] + 1
        elif V[i - 1] < V[i + 1]:
            x = V[i + 1]
        else:
            x = V[i - 1] + 1
        y = x - i + off
        while x < N and y < M and a[x] == b[y]:
            x += 1
            y += 1
        V[i] = x
        if x >= N and y >= M:
            found = True
            break
    if found:
        d_found = d
        break
    trace.append(V[lo:hi + 1])

k = i - off, maintained in backtrack via k variable: at found, k_found = i - off = N - M ✓.

Backtrack as before with k.

One more micro-opt: snake while loop — string equality of list elements: `a[x] == b[y]` — index each time. Could zip? Not easy. Fine.

Also can add small optimization: early break if found.

Also for d=0 the inner loop runs once with i = lo = hi → branch `i == lo` first → x = V[i+1] = 0 ✓.

Potential issue: `trace.append(V[lo:hi+1])` before found-break — I append only when not found? In code above, append after inner loop if not found; if found, break without append — and trace[d_found] never needed ✓. But wait: backtrack at step d uses trace[d-1]; the loop `while d > 0` uses trace[d-1] for d = d_found..1 → indices d_found-1 .. 0 ✓ all appended.

Wait, one more check on trace slicing vs needed indices: trace[d-1] = V after step d-1 covering diagonals [-(d-1), d-1]. Backtrack accesses slice_p[k+d] and slice_p[k+d-2] — validated above. ✓

Also note: forward reads V[i-1], V[i+1] where i-1 and i+1 have parity opposite to d → those indices hold values from step d-1 (for indices within previous range) OR initial zeros (for i-1 < offset-(d-1), i.e., i+1 > offset + d - 1 → i > offset + d - 2 → i = offset + d (right edge, handled by branch) ; and i-1 < offset-(d-1) → i < offset - d + 2 → i = offset - d (left edge)). Edge branches handle those; interior reads within [offset-(d-1), offset+(d-1)] hold step d-1 values... hmm, but interior reads at step d of V[i-1] where i-1 = offset-d+... e.g., d=3, k=-1, i-1: diagonal -2, which at step 2 was left edge? -(d-1) = -2 ✓ computed at step 2. ✓. All interior diagonals k±1 ∈ [-(d-1), d-1] were computed at step d-1 (range covers all parity-matching diagonals). ✓.

Edge condition subtlety: at step d, diagonal k where k+1 > d-1 (i.e., k = d) handled; k-1 < -(d-1) (k = -d) handled. ✓.

Now — memory for trace in worst case (test 2): D = 2000, slices lengths 1, 3, ..., 3999 → total ≈ D²/2·2 = 2000²·... sum_{d=0}^{1999} (2d+1) = 2000² = 4·10⁶ pointers = 32MB + list overhead 2001 lists ≈ negligible + shared int objects. OK.

But wait — the shared int objects: slices copy references; ints created during forward: each V[i] = x creates new int if not cached. Number of distinct int objects alive ≤ 2*max_d+1 (~4001) since old ones get garbage collected when no slice references... but slices keep references! Each slice references ints; total referenced ints could be up to... each step creates ≤ d+1 new ints (for updated entries); total ints created = sum (d+1) ≈ 2M, but most become unreferenced? A slice at step d references ints from steps ≤ d (values persist through steps since unchanged entries share objects... after step d, V[i] holds newly created ints for updated entries; older slices reference older objects). Total distinct int objects alive = total created = ~2M ints × 28 bytes = 56MB. Hmm. Plus 32MB pointers = ~90MB. Possibly heavy but likely acceptable. Could reduce by storing trace differently... Alternative: store per-step only the changed entries as diffs? Complexity. Or use array('i') for V and store bytes slices: convert V to array('l')? array indexing returns new int each access (slower). Store trace as list of array('i') copies: V_arr = array('i', ...)? Operations V[i-1] on array create ints each access — slower in hot loop.

Alternative memory reduction: only keep every snapshot but as `bytes`? x ≤ N ≤ 2000 fits in int16? Could pack slices into a bytearray via struct? Access cost high.

Alternative: reduce snapshots: note backtrack only needs, at each step d, V_{d-1}[k+1] and V_{d-1}[k-1] — i.e., neighbors of the backtrack path diagonals. Could record during forward, for each computed (d, k, x): the predecessor info (prev_k, prev_x_pre_snake?) — actually record per (d,k): ins flag and x_pre (pre-snake, post-edit). Store per step d three parallel lists? Entries per step: d+1 (k from -d to d step 2). Total ≈ 2M entries for D=2000. Store two flat int lists: dirs_flat (0/1) and xpre_flat — ints up to 2000 → still 2M×2 int objects ~112MB. Worse!

Better: store x_pre only and infer direction during backtrack from comparing? Direction inference needs V_{d-1}[k-1] vs V_{d-1}[k+1] — that's why we store snapshots. Alternatively store, per (d,k), the value (x_pre, dir) packed: dir = x_pre... we could store combined int: 2*x_pre + dir. Then total entries 2M ints but as flat lists → same count. Hmm 2M ints in lists (pointers 16MB + int objects 56MB) = ~72MB, better than 90MB, meh.

Or: reconstruct without storing per-(d,k) full snapshots: use the linear-space Hirschberg/myers divide-and-conquer: find middle snake via forward+backward reach in O(N+M) space, recurse. Time O((N+M)·D) total with constant factor ~2. Memory O(N+M). This is the "right" solution for memory but more code and the backward search adds complexity. Given the problem constraints (worst memory case: two 1000-line completely different lists → ~90MB, probably fine; test with 20000 lines diff 50 → tiny), snapshot approach is acceptable. But hmm, "completely different lists of 1000 lines" — worst D = 2000 → ~90MB. Risky if memory-limited but typically fine.

Actually, let me reconsider: can reduce trace memory by storing slices as `bytes` via int packing? Alternative: store trace slices but drop... Another trick: we don't need per-step full diagonal ranges; backtrack needs neighbors only. Store trace[d] = dict? No.

Alternative memory-light: keep every t-th snapshot and recompute? Complexity.

I'll go with snapshots; ~90MB worst case acceptable. Actually wait, let me recompute more carefully. Steps d = 0..D-1 stored (D steps, since trace[d_found] skipped). Slice length 2d+1. Sum_{d=0}^{1999}(2d+1) = 2000² = 4,000,000 pointers → 32MB (pointers). New int objects: at step d, updated entries d+1... each V[i] = x assignment creates int object (unless x < 257 cached — for N=1000, values up to 1000, ints > 256 are fresh objects). Total created ≈ sum_{d}(number of assignments) = 2M. But are old ints freed? A step-d int for diagonal k is referenced by: V, all slices d' ≥ d until k leaves the slice range... slice at step d' covers k ∈ [-d', d']; for |k| ≤ min(d, ...) — the int from step d for diagonal k is referenced by slices d..D-1 while |k| ≤ d' → references from slices d.. up to min(D-1, ...). So each created int stays referenced until... slice d' replaces entry? No — slice d' is a snapshot copy; entry for diagonal k in slice d' references whichever int was current at end of step d'. So int created at step d for diagonal k is referenced by slices d, d+1, ..., up to the last step where diagonal k was updated... each update replaces the reference in later slices but old slices keep old ints alive. Total alive ints = total created (each created int is referenced by at least the slice at its creation step... unless overwritten within same step? each diagonal updated once per step). So ~2M ints alive = 56MB. Total ≈ 90MB. Hmm.

Alternative: store snapshots as array('i') — conversion V-slice → array('i', V[lo:hi+1]) copies values into compact 4-byte each: 4M × 4 = 16MB, no int objects. Cost: creating array from list slice — C-speed-ish. Backtrack accesses few — fine. Forward hot loop still uses list V. So:

trace.append(array('i', V[lo:hi+1]))? But conversion cost per step: O(d) C loop — total 4M element conversions, maybe 100-200ms. Acceptable. Actually `array('i', iterable)` iterates creating objects then stores... it's reasonably fast (~50ns/el?) → 4M × 50ns = 0.2s. Hmm acceptable. Or `array('i', V[lo:hi+1])` from list — still iterates. Alternatively use memoryview cast? V as list can't.

Or: keep V itself as array('i') — then hot-loop reads V[i-1] create temp ints (slower reads, maybe +30% time) but slices/append become V[lo:hi+1] on array → returns array (C memcpy, fast!). Then trace holds arrays: 16MB total, fast appends. Hot loop slowdown: reads of array produce new int objects each time — in the inner loop we read V[i-1], V[i+1] possibly twice... `elif V[i - 1] < V[i + 1]: x = V[i + 1]` reads twice. Could restructure to read once. Python list reads return cached objects (fast). Array reads ~ slower. Trade-off.

Given both perf tests: test 2 is the heavy one (D=2000, ~2M inner iterations). Using lists: ~2M iterations × maybe 0.25µs = 0.5s plus snake checks. Fine under 6s. Using arrays might push it to 1s. Still fine. Memory: with list-V and array-snapshots: 16MB, plus transient. With array-V: V array 16KB, snapshots 16MB.

Hmm, also int objects in slices: using array('i') snapshots avoids that. But conversion time... Let me estimate: `array('i', list_slice)` — for 4M total elements, maybe 0.15-0.3s. OK.

Actually simpler: keep list V, and store snapshots as lists but accept ~90MB? The judge environment unknown; 90MB usually OK. But to be safe, use array('i') snapshots — but also careful: array('i') max value 2^31, fine. Use typecode 'l' or 'i' — 'i' is 4 bytes typically... In CPython, 'i' is at least 2 bytes; usually 4. x values ≤ N+M ≤ 40000 → 'i' fine (must be ≥ 16 bits; guaranteed ≥ 2 bytes... spec says 'i' ≥ 2 bytes! Use 'l' (≥4 bytes) or 'i' typically 4. Safer: 'l' = 4 or 8 bytes → 16-32MB. Hmm. Or 'H' (unsigned short, 2 bytes, max 65535 ≥ 40000 ✓, guaranteed 2 bytes). x ≤ N ≤ 20000 fits unsigned short ✓, but garbage values could exceed 65535? x ≤ d + ... x ≤ max? x ≤ max_d = 40000 ≤ 65535 ✓ (x ≤ d ≤ N+M=40000, plus snake no... x ≤ d? x + y = d + 2m, x ≤ d). Actually x ≤ d ≤ 40000 < 65536 ✓. Use 'H'. 8MB total snapshots. But conversion cost same.

Hmm, actually, do I even need snapshots beyond... let me reconsider a cheaper memory scheme: store for each step only the *changed* values? Backtrack needs V_{d-1} at two neighboring diagonals of the path. The path visits one diagonal per step. If I store per step d: list of (k, V_new) pairs? Then to get V_{d-1}[k±1] during backtrack I need values at arbitrary neighbors — which may not have been "changed" at step d-1... but every diagonal in [-d,d] is written every step (each k in range is assigned). So changed = all in range. No savings.

OK final decision: snapshots as array('H') from list slices? Wait — converting list of ints to array('H') requires all values fit; garbage values ≤ 40000 ✓ (argued x ≤ d ≤ max_d; also initial 0s).

Hmm wait, actually is x ≤ d? x + y = d + 2m → x = (d + 2m + k)/2 ≤ d + m... if k > 0: x = (d + 2m + k)/2. k ≤ d → x ≤ (d + 2m + d)/2 = d + m ≤ d + m. m ≤ min(N,M). Hmm so x could exceed d! E.g., d=2, matches m=1 → x + y = 4; k = 2 → x = 3 > d. Indeed with matches x can exceed edit count. So x ≤ d + m ≤ d + min(N,M) ≤ N + M... still ≤ 40000 < 65536 ✓. Fine for 'H'.

Actually simpler and safe: use 'i' (4 bytes on CPython, standard). 16MB max. Or even just keep list slices (90MB worst). You know, let me think about expected judge constraints — likely fine with lists. But array('H') is cheap insurance. Conversion cost: array('H', V[lo:hi+1]) — hmm does array constructor from a list iterate in Python? It's implemented in C, iterating via sequence protocol — fast (~20-30ns/element?). 4M elements → ~0.1-0.15s. Fine.

Hmm, wait — but during backtrack we do slice_p[k+d] on array → creates int, fine (few accesses).

Actually, alternative: avoid converting every step: convert lazily?? Nah.

Let me also reconsider whether to bound `max_d` smaller: we could stop early... found at D ≤ min needed. Fine.

Also small optimization: swap a and b so that... Myers symmetric; no benefit.

Another optimization for the common large-similar case (test 1: N=M=20000, D≈100): outer 100 steps, inner total ~101² ≈ 10k iterations — trivial. Snakes: per step, per diagonal, snake extends — total snake work: bounded by O((N+M)·D) worst but realistically... hmm, actually wait: for similar sequences, is the total snake work bounded well? Each step, V[k] advances: the furthest reach on diagonal k at step d vs d+2 — advances by ≤ 2? From the earlier analysis: from V_d[k], the reach at d+2 on k comes via V_{d+1}[k±1] + edit + snake; snake can't pass V_d[k]'s blocked point unless boundary... I argued snake from a point q ≤ (X, Y) on diagonal k can't extend past X (if interior). Points from k±2 routes: r = V_{d}[k-2] + 2 deletions → (x', y) with x' = V_d[k-2] + 2, y = V_d[k-2] - (k-2) = x' - k. Could x' > X? V_d[k-2] vs V_d[k]: these differ; e.g., a = ["a"]*n... V_d[k-2] could exceed V_d[k] + 2? V_d[k-2] ≥ V_d[k] - ... hmm points: (x, y) on k-2 vs (X, Y) on k. If x' > X + 2... possible? V_d[k-2] as point (x2, y2), x2 - y2 = k - 2. For it to have x2 > X + 2 = reach on k... e.g., lots of deletions early: a = 1000 distinct "d" lines then 19000 common lines; b = 19000 common lines then nothing? Eh. In such cases snakes can be re-scanned: classic worst-case O(ND) total. For 20000+20000 with D=100: worst total snake work = 40000·100 = 4M string comparisons → ~1-1.5s in Python. Hmm, tight against 2s limit. But is the worst case actually attainable with "differ in about 50 places"? Differ in ~50 places means D ~ 100 achieved by ~50 substitutions → common regions between edits are long. Reach advancing: on diagonal k, V advances by 2 per 2 steps typically and the snake per step is short (~2)? Let's think: after processing step d, reach on k is at some position inside a common run; the common runs are ~400 lines; the frontier spreads across diagonals... Each step, each diagonal's snake: the reach points on adjacent diagonals differ; snake from new point extends while matching — typically extends to catch up to the "diagonal boundary" of already-covered region? Total snake work = total advance of all frontiers ≈ sum over diagonals of final position ≈ D diagonals × N ≈ 100 × 40000 = 4M?? Hmm no: total advance across all steps for one diagonal = its final position ≈ up to N. Number of diagonals ≈ D. So total snake scanning ≈ D · N = 100 · 20000 = 2M... wait per diagonal the reach advances monotonically; total scan for diagonal k over all steps = final x (since each scan resumes from previous reach... snake starts at previous-adjacent point, extends past already scanned region? The snake while-loop starts at (x, y) = after-edit point, which is ≥ previous reach... it rescans? Each snake starts after the edit move, which is at most +1 from a previous reach — the region scanned by the snake from there was already scanned in earlier steps (as part of other diagonals' snakes? no — snake scan covers a[x] == b[y] checks along diagonal k only). Along diagonal k, checks are at positions advancing monotonically: each snake starts at ≥ previous end +... hmm, the reach along diagonal k: at step d, pre-snake point = V_{d-1}[k±1] ± → could be behind V_{d-2}[k]?? If pre-snake point is behind previous reach on same diagonal, the snake re-scans already-checked positions! Is that possible? Pre-snake x_pre vs V_{d-2}[k]: pre-snake = V_{d-1}[k+1] or V_{d-1}[k-1]+1. V_{d-1}[k+1] vs V_{d-2}[k]: V_{d-1}[k+1] ≥ ... hmm. In Myers, I believe x_pre ≥ V_{d-2}[k] - 0? The furthest reach is monotone in d for same parity? V_{d}[k] ≥ V_{d-2}[k]? Since from reach at d-2 on k, do ins+del... ins: (x, y+1) on k-1 at d-1... then from V_{d-1}[k-1] ≥ (as point, x ≥ V_{d-2}[k]... x-coordinate: insertion keeps x → V_{d-1}[k-1].x ≥ V_{d-2}[k].x? V_{d-1}[k-1] derives from paths with d-1 edits; the path reaching V_{d-2}[k] extended by insertion reaches diagonal k-1 with x same → V_{d-1}[k-1] ≥ V_{d-2}[k] (x-coordinate ≥, but furthest reach maximizes x... yes x ≥). Then at d: deletion from V_{d-1}[k-1]: x_pre = V_{d-1}[k-1] + 1 ≥ V_{d-2}[k] + 1 > previous reach start... but the previous reach END (post-snake) V_{d-2}[k] ≥ pre-snake point. So pre-snake (at step d) could be ≤ V_{d-2}[k] (previous post-snake end) → rescans positions already verified! E.g., V_{d-2}[k] = X (post-snake, blocked or boundary), V_{d-1}[k-1] + 1 = X - 5 → snake re-scans 5+ positions. So rescanning possible → total work O((N+M)·D) genuinely. With 4M ops worst case... but does that happen in the "differ in 50 places" scenario? Probably the rescans are small. Realistic performance: each inner iteration ~ 0.3µs, snake iterations similar. If total ops ~ 1M → 0.3s. Should be fine.

To be safer, I can add the classic optimization: skip diagonals where x > N or y > M after clamping? Minor.

Another important optimization: when snake hits x==N or y==M... handled by while condition.

Let me now also double-check the backtrack emission counts produce maximal "=" count: number of "=" = total snake matches = L (since D = N + M - 2L → = count = (N + M - D)/2 = L ✓ maximal).

Now also handle possible issue: found detection uses `x >= N and y >= M`. But what if N > 0, M > 0 and also... fine.

Let me trace another example: a = ["a","b","c"], b = ["a","c"]. N=3, M=2. LCS=2, D=1. max_d=5, offset=5.
d=0: i=5: branch i==lo → x = V[6] = 0, y = 0. snake: a[0]==b[0] ("a")→ x=1,y=1; a[1]("b") vs b[1]("c") no. V[5] = 1. not found (x=1<3).
trace[0] = V[5:6] = [1].
d=1: lo=4, hi=6. i=4 (k=-1): branch i==lo: x = V[5] = 1, y = 1 - (-1) = 2. snake: x<3, y<2? y=2 not <2 → stop. V[4] = 1. check x>=3? no. i=6 (k=1): i==hi: x = V[5]+1 = 2, y = 1. snake: a[2]="c" == b[1]="c" → x=3, y=2. while: x<3 fails. V[6] = 3. check x>=3 ✓ y>=2 ✓ → found, d=1, k=1... k_found = i - off = 1 = N-M ✓.

Backtrack: d=1, k=1, x_end=3, y_end=2. slice_p = trace[0] = [1] (diagonal 0 → local index 0). k==d → x_pre = slice_p[k+d-2] = slice_p[1+1-2] = slice_p[0] = 1, +1 → x_pre = 2. ins=False. y_pre = 2 - 1 = 1. snake emit: range(x_end-1, x_pre-1, -1) = range(2, 1, -1) = [2] → ("=", a[2]) = c ✓. deletion: ("-", a[x_pre-1]) = a[1] = "b" ✓. x_end = 1, y_end = 1, k = 0, d = 0. Final: for i in range(0, -1, -1): ("=", a[0]) = a ✓. script reversed: [("=", "a"), ("-", "b"), ("=", "c")] ✓. 

Check "=" and "-" give a ✓, "=" and "+" give b = ["a","c"] ✓.

Another: a=["a"], b=["a"] → d=0 found, script [("=", "a")] ✓.

Repeats: a = ["x","x"], b = ["x"]. d=0: x=0,y=0 snake → a[0]==b[0] → x=1,y=1; y<1 fails. V[off]=1. d=1: k=-1: x = V[0... V[off] = 1 → x=1, y = 2 ≥ M=1 but x=1 ≥ N=1? x=1 ≥ 1 ✓ and y = 2 ≥ 1 ✓ → found at d=1, k=-1?? Wait N=2, M=1: k = N - M = 1. k=-1 trigger with x=1,y=2: x ≥ N (1≥1 ✓), y ≥ M ✓ → found at k=-1 → but then backtrack reconstructs: slice_p = trace[0] = [1], k=-1: k==-d → x_pre = slice_p[k+d] = slice_p[-1+1] = slice_p[0] = 1, ins=True, y_pre = x_pre - k = 1 - (-1) = 2. snake: range(x_end-1, x_pre-1, -1) = range(0, 0, -1) empty. insertion: ("+", b[y_pre - 1]) = b[1]?? b has length 1 → IndexError!! 

Problem! The trigger at (x=1, y=2): x ≥ N and y ≥ M but x < N... wait x=1, N=2 → x ≥ N is 1 ≥ 2 → False! I mis-evaluated: N=2 so x=1 < 2 → not found. Phew. Let me redo: d=1, k=-1: x = V[off] = 1 (after d=0 snake), y = x - k = 2. found check: x≥2? No. k=1: x = V[off]+1 = 2, y = 1. snake: x < 2? No → stop. V = 2. check: x≥2 ✓, y≥1 ✓ → found, k=1 ✓. Backtrack: slice_p = trace[0] = [1]; k==d → x_pre = slice_p[k+d-2] = slice_p[0] = 1 +1 = 2. ins=False. y_pre = 2-1 = 1. snake emit range(1, 1, -1) empty. "-" a[1] = x ✓. x_end=1, y_end=1, k=0, d=0 → final snake: range(0,-1,-1) → ("=", a[0]) ✓. Result: [("=","x"), ("-","x")] ✓ and "="+"+" = ["x"] ✓ minimal (D=1). 

The earlier worry resolved: trigger requires x ≥ N AND y ≥ M simultaneously; overshoot one direction without the other doesn't trigger. And when both trigger, i=j=0 argument. But wait, in that argument I assumed e = d. Let me double check with x ≥ N, y ≥ M both: d + 2m = x + y ≥ N + M. But overshoot x = N+i, y = M+j: e (deletions + insertions along the recorded chain) = d; matches m; x - matches = deletions... deletions = x - m = N + i - m; insertions = M + j - m; d = N + M + i + j - 2m. d ≥ N + M - 2L ✓. And d + 2m = N + M + i + j ✓ consistent. Trigger at step d: if d < D_true impossible ✓. At d = D_true: i + j = 2m - 2L ≤ 0 and ≥ 0 → i=j=0, m=L ✓. So k = N - M always at trigger. And backtrack uses k = N - M — but wait, I should use k_found = i - off at trigger; it equals N - M. Also x_end must be exactly N and y_end = M at trigger (i=j=0 ✓). Good, so backtrack starting point solid.

Hmm, but one more corner: what if at step D_true, the trigger happens at k = N-M but x = N + something... no, shown exact.

Now potential issue in backtrack: slice_p[k+d] where trace[d-1] has length 2d-1 — validated. But is trace[d-1] guaranteed to hold step-(d-1) FINAL values for all its entries? Yes, appended after inner loop of step d-1 (when not found). But if step d-1... found could only be at d_found; steps < d_found completed fully. ✓. However — the found step: I break out of inner loop early, skipping V writes for remaining k in that step; trace[d_found] not appended — fine.

But hold on: what about trace entries for steps < d_found — appended fully after their complete inner loops ✓.

Edge: d_found = 0 → while d > 0 skipped → final snake from (0,0): emits "=" for a[0..N-1]. Also need y_end... = M, and N == M must hold (k=0). ✓.

Edge: N=0 or M=0 handled by early return (also the general code would handle, but early return is clean & fast).

Wait, check N=0 through general path would break: max_d = M... offset = max_d = M... inner: d=0: i = off: branch i==lo → x = V[off+1] = 0, y = 0; snake: x < 0 false. V[off] = 0. found: x >= 0 ✓ y >= M? no (unless M=0). ... eventually k = -d path: x stays 0, y grows → trigger at d = M, k = -M = N - M ✓. Backtrack: slice_p chain... works? The early-return shortcut avoids testing. Keep early returns.

Now, performance of the forward loop for test 1: outer 101 steps... wait D_true for "differ in about 50 places": if 50 substitutions → D = 100. But problem says "differ in about 50 places" — maybe 25 insert+delete pairs → D=100 too. Inner iterations ≈ sum_{d=0}^{100} (d+1) ≈ 5151. Snake scans: total across steps — the concern about O(ND). Realistically each snake scan per (d,k) is a few comparisons; total maybe tens of thousands. Trivial. The 2s limit generous.

Test 2: D=2000 (assuming zero common lines). Inner iterations = sum_{d=0}^{2000}(d+1) ≈ 2,003,000. Each iteration: range loop, 3 condition checks (i==lo, i==hi, V[i-1]<V[i+1]), arithmetic, V[i] = x, found check. Estimate ~0.4µs? → ~0.8s. Plus trace appends: 2000 slices totaling 4M elements + array conversion if used. If I use plain list slices: V[lo:hi+1] memcpy ~ 4M pointer copies ≈ 30ms. Then memory ~90MB incl ints. If arrays: conversion 4M elements... `array('H', list)` iterates → maybe 0.2s. Total ~1.5s. OK under 6s.

Hmm — actually wait: for completely different lists, is D really N+M? LCS = 0 → D = N + M - 0 = 2000 ✓. But "completely different" might include some repeated lines between a and b... assume worst.

Alternative big optimization for the inner loop: skip diagonals that are certainly infeasible (x would exceed N or y > M)? For completely different lists, about half the diagonals at each step are infeasible (those needing more deletions than N or more insertions than M). We could clamp loop ranges: k must satisfy: reachable needs (d + k)/2 ≤ N... deletions = (d + k)/2 ≤ N → k ≤ 2N - d; insertions = (d - k)/2 ≤ M → k ≥ d - 2M. So k range [max(-d, d-2M), min(d, 2N-d)] with parity. For completely different lists with N=M=1000: at d=2000, k range... max(-d, d-2000) = 0, min(d, 2000-d) = 0 → only k=0. This prunes ~half the iterations! Implement: kmin = d - 2M if d - 2M > -d else -d... careful: also require kmin ≤ kmax else no iterations (happens when d > N+M — can't since d ≤ max_d... at d = N+M: kmin = N+M-2M = N-M, kmax = 2N-(N+M) = N-M → single k ✓).

Implement with index arithmetic: iterate k in range(kmin, kmax+1, 2) where kmin = max(-d, d - 2*M), kmax = min(d, 2*N - d). Note parity: d - 2M has same parity as d ✓; 2N - d same parity as d ✓. So alignment fine. But branch conditions k == -d / k == d: with pruning, left edge becomes k == kmin (no V[k-1] valid?) — careful: if kmin = d - 2M > -d, then predecessor k-1 = d - 2M - 1 < -(d-1)+... is V_{d-1}[k-1] valid? k-1 has parity d-1; range at step d-1 pruned to [max(-(d-1), d-1-2M), min(d-1, 2N-d+1)]. Is k-1 ≥ that lower bound? k-1 = d - 2M - 1; step d-1 lower bound = max(-(d-1), d-1-2M) = max(-d+1, d-2M-1) → k-1 = d-2M-1 ≥ that ✓ equality possible. So V_{d-1}[k-1] was computed ✓ valid. But is it the *furthest reach* for that diagonal? Yes it was written. However — the deletion branch x = V[k-1] + 1 might exceed N? With pruning k ≤ 2N - d... x = V_{d-1}[k-1] + 1: V_{d-1}[k-1] ≤ (d-1 + 2m + k-1)/2 hmm... could x exceed N? k - 1 ≤ 2N - d - 1 → deletions on new path = x ≤ ? x = V_{d-1}[k-1] + 1: V_{d-1}[k-1] corresponds to a path with d-1 edits ending diagonal k-1: its deletions = (x' + m' - ...). Meh — pruning ensures feasibility of *pure* paths roughly but garbage may still exceed? Actually the concern was only about array bounds and false triggers, both still safe. With pruning, do we lose the true path? The true minimal path at step d uses some k with deletions ≤ N, insertions ≤ M... its k satisfies d - k ≤ ... deletions along true path ≤ N ⇒ k ≥ (deletions) - (y)... hmm: the true path prefix at step d: deletions_del ≤ N, insertions ≤ M → k = del - ins ≥ -ins ≥ ... k ≥ d - 2·ins ≥ d - 2M ✓ and k ≤ 2·del - d ≤ 2N - d ✓. So true path's diagonals always within pruned range ✓. Also pruning keeps V values for neighbors used later? Backtrack accesses trace[d-1][k+d] and [k+d-2] — slice covers pruned range at step d-1: [max(-(d-1), d-1-2M), min(d-1, 2N-d+1)]. Our k at step d within pruned range → k+1 and k-1... need k+1 within step d-1 range when used (ins branch): k+1 ≤ 2N - d + 1 = upper bound at step d-1 ✓; k+1 ≥ d - 2M + 1 ≥ lower bound? lower = max(-d+1, d-2M-1) ≤ d-2M+1 ✓. And k-1 similar ✓. But the local index mapping in backtrack assumed slice starts at diagonal -(d-1); with pruning the slice starts at kmin_{d-1} = max(-(d-1), d-1-2M). Need to store the starting diagonal per trace entry, or compute it. Compute: lo_k(d-1) = max(-(d-1), (d-1) - 2M). Then local index = k' - lo_k. Let me store trace as list of (array, lo_k) or compute lo_k from d (deterministic function of d, N, M): lo_k(d) = max(-d, d - 2*M), hi_k(d) = min(d, 2*N - d). Deterministic ✓ no need to store.

Hmm, wait — but pruning also changes which branch conditions apply: left edge k == lo_k: forward must not read V[k-1]... but V[k-1] might contain garbage from older steps (stale). If kmin = -d (M large): k-1 = -d-1 stale → must use k+1 branch ✓ (condition k == -d). If kmin = d - 2M > -d: V[k-1] is valid (computed at step d-1 as shown) → can use normal comparison. Similarly right edge k == hi_k: if hi = 2N - d < d: V[k+1] stale → forced deletion branch. So conditions become: if k == -d (original lower edge when M ≥ ... when -d ≤ d-2M i.e. M ≤ d... hmm two cases) — simpler: use "can I read V[k-1]" test: k-1 ≥ lo_k(d-1) AND k-1 ≥ -(d-1)? V[k-1] is trustworthy iff diagonal k-1 was computed at step d-1 iff k-1 ≥ lo_k(d-1) and k-1 ≤ hi_k(d-1) and parity ok (automatic). Similarly V[k+1] trustworthy iff lo_k(d-1) ≤ k+1 ≤ hi_k(d-1).

That complicates the hot loop with extra comparisons. Is pruning worth it? It halves iterations for the pathological case (2M → 1M). Without pruning 2M iterations ~0.8-1s, fine anyway. The pruning adds per-iteration cost. Alternative cheaper pruning: precompute per d the pruned i-range in terms of indices and use the same branch structure (i == lo_i → x = V[i+1]; i == hi_i → x = V[i-1]+1; else compare) where lo_i/hi_i are pruned bounds, PROVIDED that when i == pruned-lo, V[i-1] is stale-or-valid and we choose V[i+1] branch — but is choosing V[i+1] correct when V[i+1] might be stale?? If i == pruned lo = d - 2M (as diagonal): V[i+1] (diagonal k+1 at step d-1) trustworthy? k+1 = d - 2M + 1 ≥ lo_k(d-1) ✓ (shown) and ≤ hi_k(d-1)? need k+1 ≤ min(d-1, 2N-d+1): k+1 = d-2M+1 ≤ d-1 ⟺ M ≥ 1 ✓; ≤ 2N-d+1 ⟺ k+1 ≤ ... k ≤ 2N-d → k+1 ≤ 2N-d+1 ✓. Trustworthy ✓. And when pruned-lo = -d (< d-2M): V[k+1] = diagonal -d+1 computed at d-1 ✓ trustworthy. So x = V[i+1] at left edge always trustworthy ✓. Right edge symmetric ✓. And interior reads trustworthy ✓. And trace slice bounds in backtrack: recompute lo_k(d-1) per iteration — fine (few operations, only D steps).

But one more: with pruning, must ensure the trigger/found still detected — true path within pruned range ✓.

Also must ensure at d where pruned range empty doesn't happen before found: pruned range empty ⟺ kmin > kmax ⟺ max(-d, d-2M) > min(d, 2N-d). Since d ≤ N+M: check d-2M > 2N-d ⟺ 2d > 2(N+M) ⟺ d > N+M — impossible. Other combos: -d > 2N-d impossible; -d > d ⟺ d<0; d-2M > d impossible. So range non-empty for d ≤ N+M ✓.

Now decide: include pruning? It reduces pathological-case iterations from 2M to ~1M and also reduces trace memory (slices cover pruned ranges — for symmetric case at step d, pruned width = 2·min(d, 2N-d)... at d=2000, N=M=1000: width 1). Total trace elements = sum over d of (hi-lo+1) where width = 2·min(d, N+M-d)+1 (symmetric N=M) → sum ≈ 2·sum_{d≤1000} (2d+1)·... let me compute for N=M=1000, max_d=2000: width(d) = 2·min(d, 2000-d) + 1. Sum over d=0..1999 (2000 entries): 2·[sum_{d=0}^{999}(2d+1) + sum_{d=1000}^{1999}(2(2000-d)+1)] = 2·[10⁶ + 10⁶] = 4M? Hmm sum_{d=0}^{999} (2d+1) = 1000² = 1M; twice → 2M... wait: sum_{d=0}^{999}(2d+1) = 2·(999·1000/2) + 1000 = 999000+1000 = 1M ✓. And second half same = 1M. Total (without the extra ×2?) width(d)=2·min(...)+1; sum = Σ_{d=0}^{1999} (2·min(d,2000-d)+1) = Σ_{d=0}^{999}(2d+1) + Σ_{d=1000}^{1999}(2(2000-d)+1) = 1M + 1M = 2M. So trace 2M elements = 16MB with 'H', int objects if list-slices ~28MB·... With pruning + 'H' arrays: 8MB. 

Inner iterations with pruning: Σ width(d) = 2M → same as unpruned?? Unpruned was Σ(2d+1) = 4M. With pruning = 2M. Halved ✓. Good, and trace memory halved too.

Hmm OK let me now also double-check the claim "trustworthy" more carefully for interior reads with pruning: interior k (lo_k(d) < k < hi_k(d)): k-1 ≥ lo_k(d)? Interior means k > lo_k(d) → k-1 ≥ lo_k(d) ✓; need k-1 ≥ lo_k(d-1)? lo_k(d-1) ≤ lo_k(d)+... lo_k(d) = max(-d, d-2M); lo_k(d-1) = max(-d+1, d-1-2M) = max(-d+1, (d-2M)-1) ≥ ... is lo_k(d-1) ≤ k-1? k-1 ≥ lo_k(d) ≥ ... lo_k(d) ≥ lo_k(d-1) - 1? -d ≥ -d+1 - 1 = -d ✓; d-2M ≥ d-3M... hmm d-2M vs d-1-2M = d-2M-1 → lo_k(d) candidate d-2M ≥ d-2M-1 ✓. So lo_k(d-1) ≤ lo_k(d) ≤ ... wait we need k-1 ≥ lo_k(d-1): k-1 ≥ lo_k(d) and lo_k(d) ≥ lo_k(d-1)? -d vs max(-d+1, d-1-2M): if lo_k(d) = -d (case d ≤ 2M... i.e., M ≥ d/2): lo_k(d-1) = max(-d+1, d-1-2M); since M ≥ d/2 → d-1-2M ≤ -1 ≤ -d+1 when d ≥ 2... -d+1 ≥ d-1-2M ⟺ 2M ≥ 2d - 2 ⟺ M ≥ d-1 — hmm not exactly; e.g., M = d/2 exactly: d-1-2M = -1 > -d+1 for d > 2. Then lo_k(d-1) = d-1-2M = d/2·2... M = d/2 → d-1-d = -1. lo_k(d-1) = max(-d+1, -1) = -1 (for d>2). lo_k(d) = max(-d, d-d) = 0. Interior k > 0 → k-1 ≥ 0 ≥ -1 ✓. If lo_k(d) = d-2M > -d (M < d/2): lo_k(d-1) = max(-d+1, d-1-2M); d-1-2M vs -d+1: d-1-2M ≥ -d+1 ⟺ 2d ≥ 2M + 2 ⟺ d ≥ M+1 — true when M < d/2 (d > 2M ≥ M+1 for M≥1)... M=0 edge handled separately. So lo_k(d-1) = d-1-2M = lo_k(d) - 1 ≤ k-1 ✓. Upper side symmetric. ✓ trustworthy.

Also parity: lo_k(d) has parity of d? candidates -d ✓ and d-2M ✓. hi_k(d): d ✓, 2N-d ✓. Range step 2 from lo ✓ covers same-parity k's ✓.

Now the found condition and k_found: unchanged.

Backtrack with pruning: lo_k_prev = lo_k(d-1) computed as function; slice_p = trace[d-1]; local index of diagonal k' = k' - lo_k_prev. Access for k+1: (k+1) - lo_prev; for k-1: (k-1) - lo_prev.

Let me define helper inline: lo_p = -p if -p > p - 2*M... i.e., lo_p = max(-p, p - 2*M); using max() call fine (once per backtrack step).

Wait, also hi needed? Backtrack only reads V_{d-1}[k±1] — indices within slice since slice covers [lo_p, hi_p] and k±1 ∈ [lo_{d}... we showed k±1 within [lo_p, hi_p]? Need k+1 ≤ hi_p = min(d-1, 2N-d+1): shown ✓ when ins branch used (k < hi_d... in backtrack, ins chosen when k == -d or (k != d and V[k-1] < V[k+1]) — mirroring forward's pruned branches: forward at step d: left edge = lo_k(d) (either -d or d-2M) uses V[k+1]; right edge = hi_k(d) uses V[k-1]+1; interior compares. Backtrack must mirror: 

p = d-1; lo_p = max(-p, p - 2M); hi_p = min(p, 2N - p).
k == lo_d → ins (x = V_{d-1}[k+1]) where lo_d = max(-d, d-2M)
k == hi_d → del
else compare V_{d-1}[k-1] < V_{d-1}[k+1].

And k±1 accessibility: interior k: lo_d < k < hi_d → k+1 ≤ hi_d ≤ ... hi_d vs hi_p: hi_d = min(d, 2N-d); hi_p = min(d-1, 2N-d+1) ≥ min(hi_d - 1, hi_d + 1) → hmm k+1 ≤ hi_d... need k+1 ≤ hi_p: if hi_d = d: k ≤ d-2 (interior, parity) → k+1 ≤ d-1 ≤ hi_p? hi_p = min(d-1, ...) ✓. If hi_d = 2N-d < d: k < hi_d → k ≤ 2N-d-2 → k+1 ≤ 2N-d-1 ≤ min(d-1, 2N-d+1) ✓. Similarly k-1 ≥ lo_p ✓ shown. ✓.

Good. Also in backtrack x_pre values: x = slice_p[(k+1) - lo_p] etc.

Now, is pruning correct regarding V values at edge being from valid formulas? At left edge with lo = d-2M: forward computes x = V[k+1] where the "real" Myers would also possibly consider V[k-1]+1 — but V[k-1] here is trustworthy (computed at d-1)! Original Myers at k=-d forces k+1 branch only because V[k-1] unreadable (never computed). With pruning, when lo = d-2M ≠ -d, V[k-1] IS trustworthy, and Myers' rule would compare! But does it matter for correctness? The Myers rule V[k-1] < V[k+1] chooses the better predecessor; at forced edge it takes the only feasible one. When lo = d-2M: k-1 = d-2M-1: at step d-1 this diagonal was computed (within pruned range? d-1-2M ≥ ... k-1 = d-2M-1 ≥ lo_{d-1} = max(-d+1, d-1-2M) ✓ equality with second term). So both predecessors available → should compare per Myers to get furthest reach! Forcing k+1 branch might give suboptimal reach → potentially D larger than optimal → non-minimal script!! Hmm wait — but why did original Myers force at k=-d? Because V[-d-1] doesn't exist (diagonal -d-1 unreachable ever). When lo = d-2M > -d, diagonal k-1 = d-2M-1 IS reachable (insertions capped at M... wait why is diagonal d-2M-1 the lower prune boundary? Because insertions (d - k)/2 ≤ M ⟺ k ≥ d - 2M. Diagonal k = d-2M-1 would need d - k = 2M+1 insertions... > M — but only for paths with exactly d edits where ALL... ins - del = -(2M+1)... ins = del - (2M+1)... hmm k = del - ins, d = del + ins → ins = (d - k)/2 = (2M+1)/2 — not integer! k = d - 2M - 1 has parity d-1, not reachable at step d (parity mismatch!). Right — parity: at step d, only k ≡ d (mod 2). lo = d-2M has parity d ✓; k-1 = lo - 1 has parity d-1 → was possibly computed at step d-1 if within its pruned range: k-1 = d-2M-1 ≥ lo_{d-1} = max(-d+1, d-1-2M): d-2M-1 = d-1-2M ✓ equal to second term; lo_{d-1} = max(-d+1, d-1-2M) ≤ d-1-2M ✓ so k-1 ≥ lo_{d-1} ✓ computed at step d-1 (if k-1 ≤ hi_{d-1}: k-1 ≤ hi_d - 1... k = lo_d ≤ hi_d → k-1 ≤ hi_d - 1 ≤ hi_{d-1}? hi_{d-1} = min(d-1, 2N-d+1) ≥ min(hi_d - 1, hi_d +1)... if hi_d = d: hi_d - 1 = d-1 = hi_{d-1} candidate ✓; if hi_d = 2N-d: hi_d - 1 = 2N-d-1 ≤ 2N-d+1 ✓ and ≤ d-1? 2N-d-1 ≤ d-1 ⟺ N ≤ d — hmm not always... need k-1 ≤ min(d-1, 2N-d+1): k-1 ≤ 2N-d-1; is 2N-d-1 ≤ d-1? ⟺ N ≤ d. If d < N... e.g., N=1000, M=1, d=5: k = lo_d = 5-2 = 3, k-1 = 2 ≤ hi_{d-1} = min(4, 2·1000-4) = 4 ✓. Fine generally: k-1 = d-2M-1 ≤ d-1 ✓ trivially and ≤ 2N-d+1 ⟺ d ≥ 2M + d... d-2M-1 ≤ 2N-d+1 ⟺ 2d ≤ 2N+2M+2 ✓ always. OK ✓ computed.

So at k = lo_d = d-2M (when > -d), both V[k-1] and V[k+1] trustworthy → Myers compares → the forward must compare, NOT force! Original algorithm's forced branch applies only when k-1 < -(d-1) i.e., k = -d, or when k+1 > d-1 i.e., k = d — plus with pruning, when the neighbor falls outside the pruned range of step d-1: k+1 outside ⟺ k+1 > hi_{d-1} or k+1 < lo_{d-1}. k+1 > hi_{d-1}: hi_{d-1} = min(d-1, 2N-d+1): k+1 > d-1 ⟺ k = d ✓ (k parity d, k+1 parity... k+1 must be ≤ hi_{d-1} which has parity d-1; k+1 parity d+1 ≡ d-1 ✓). k+1 > 2N-d+1 ⟺ k > 2N-d ⟺ k ≥ 2N-d+2 — but k ≤ hi_d = min(d, 2N-d) ≤ 2N-d → impossible ✓. So k+1 untrustworthy ⟺ k = d. Similarly k-1 untrustworthy ⟺ k = lo_d? k-1 < lo_{d-1} = max(-d+1, d-1-2M): k-1 < -d+1 ⟺ k = -d... wait k-1 < -d+1 ⟺ k < -d+2 ⟺ k ≤ -d (parity) ⟺ k = -d OR k = -d+... parity: k ∈ {-d, -d+2,...}; k < -d + 2 → k = -d... but also k-1 could be < d-1-2M... k-1 < d-1-2M ⟺ k < d-2M ⟺ k ≤ d-2M-2 → k ≤ lo_d - 2 < lo_d — impossible (k ≥ lo_d). But if lo_{d-1} = -d+1 > d-1-2M (case M ≥ d... then k-1 < -d+1 ⟺ k = -d). And note when lo_d = -d (k=-d is left edge): forced ins ✓ matches original. When lo_d = d-2M: k = -d... is -d ≥ d-2M ⟺ M ≥ d... wait lo_d = max(-d, d-2M) = d-2M when d-2M > -d ⟺ M < d. Then is k = -d even in range? -d < d-2M = lo_d → k = -d < lo_d → pruned out! So when M < d, diagonal -d excluded (needs M insertions... ins = (d+k)/2 = ... at k=-d: ins = d > M impossible ✓ consistent). So forced-ins branch only applies when k = lo_d = -d ⟺ M ≥ d... then k-1 = -d-1 < -(d-1) untrustworthy ✓ forced correct. Similarly right edge. So the rule simplifies nicely: at step d, forced-ins iff k == -d (which implies lo_d = -d... when M ≥ d lo_d = max(-d, d-2M) = -d iff d-2M ≤ -d ⟺ M ≥ d ✓ consistent!), forced-del iff k == d (implies hi_d = d ⟺ 2N-d ≥ d ⟺ N ≥ d ✓ consistent). Interior (lo_d < k < hi_d): both trustworthy → compare. And edges lo_d/hi_d when they come from pruning (d-2M or 2N-d): those k values: is V[k-1] trustworthy at k = lo_d = d-2M? Shown yes → compare branch (interior treatment!). Hmm wait: k = lo_d = d-2M with d-2M > -d: V[k-1] trustworthy ✓, V[k+1] trustworthy ✓ → compare ✓. So branch logic:

k_lo = max(-d, d - 2*M)
k_hi = min(d, 2*N - d)
for k in range(k_lo, k_hi + 1, 2):
    if k == -d:      # only possible when k_lo == -d
        x = V[k+1]
    elif k == d:     # only possible when k_hi == d
        x = V[k-1] + 1
    else:
        compare

Wait but when k == -d and also k == k_hi? Can't (d > 0). When d ≥ 1 and M ≥ d: k_lo = -d → k==-d gets ins branch ✓. If M < d: k_lo = d-2M > -d → k=-d not iterated ✓ so the k==-d branch never hits untrustworthy reads? When k == -d iterated (M ≥ d): V[k-1] = V[-d-1] untrustworthy → forced ✓. When k == d iterated (N ≥ d): forced del ✓. Interior else: verified trustworthy ✓. 

And the original unpruned algorithm is the special case M ≥ ... with N, M large: k_lo = -d, k_hi = d, branches match classic Myers ✓.

Hmm wait, one more check on trustworthiness of interior reads when k = k_hi = 2N-d < d (N < d): branch k == d? No (k=2N-d ≠ d). Falls to else → compare: reads V[k-1] (diag k-1 = 2N-d-1: within step d-1 range? ≤ hi_{d-1} = min(d-1, 2N-d+1): 2N-d-1 ≤ 2N-d+1 ✓, ≤ d-1 ⟺ N ≤ d ✓ (since N < d here... N < d means 2N-d-1 < d-1 ✓). ✓ trustworthy) and V[k+1] (diag 2N-d+1: ≤ hi_{d-1}: 2N-d+1 ≤ 2N-d+1 ✓, ≤ d-1 ⟺ 2N ≤ d... hmm! If N < d but 2N-d+1 > d-1 ⟺ 2N > d... e.g., N = 1000, d = 1500, M small... wait M must be ≥ ... k_hi = min(d, 2N - d) = 2N - d requires 2N - d < d ⟺ d > N. k+1 = 2N-d+1; hi_{d-1} = min(d-1, 2N-(d-1)) = min(d-1, 2N-d+1) = 2N-d+1 iff 2N-d+1 ≤ d-1 ⟺ 2N ≤ d... if d < 2N: hi_{d-1} = d-1 and k+1 = 2N-d+1 > d-1 → V[k+1] UNTRUSTWORTHY but we read it in compare!! 

Example: N=10, M=1... let's construct: N=10, M=3, d=12: k_hi = min(12, 20-12=8) = 8 < d ✓. k = 8: else branch reads V[9] (diag 9 at step 11: hi_{11} = min(11, 20-11=9) = 9 → diag 9 ≤ 9 ✓ computed! hmm wait k+1 = 9 ≤ hi_{d-1} = 9 ✓ trustworthy here). Let me recheck condition: k+1 ≤ hi_{d-1} = min(d-1, 2N-d+1). k+1 = 2N-d+1 (at k = k_hi = 2N-d). min(d-1, 2N-d+1): if d-1 ≤ 2N-d+1 ⟺ 2d ≤ 2N+2 ⟺ d ≤ N+1: then hi_{d-1} = d-1 < k+1 → UNTRUSTWORTHY. But k_hi = 2N-d < d requires d > N. So d ∈ (N, N+1] → d = N+1 exactly (integer). At d = N+1: k_hi = min(N+1, 2N-N-1 = N-1) = N-1. k = N-1: reads V[k+1] = V[N] at step d-1 = N: hi_{N} = min(N, 2N - N) = N ✓ computed! Trustworthy ✓. Phew — because d-1 = N and hi_{d-1} = min(N, 2N-N) = N ≥ k+1 = N ✓. Let me redo generally: k+1 = 2N - d + 1; hi_{d-1} = min(d-1, 2N-d+1) ≥ 2N-d+1 always (it's ≤ min... min(a,b) where one candidate is exactly 2N-d+1 → hi_{d-1} ≤ 2N-d+1 and ≥? min(d-1, 2N-d+1) could be d-1 < 2N-d+1 when d > N... d-1 < 2N-d+1 ⟺ d < N+1. Combined with d > N → d = N+... d and N integers, d > N and d ≤ N+1 → d = N+1 → d-1 = N, 2N-d+1 = N → equal ✓ trustworthy. So k+1 trustworthy whenever k = k_hi = 2N-d is iterated ✓. Similarly k-1 at k = k_lo = d-2M: k-1 = d-2M-1 ≥ lo_{d-1} = max(-d+1, d-1-2M): shown equality with second term ✓; ≥ -d+1 ⟺ d ≥ 2M... when k_lo = d-2M > -d ⟺ 2M < d... M < d... hmm d-2M > -d ⟺ 2M < 2d ⟺ M < d. Then d-2M-1 ≥ -d+1 ⟺ 2d ≥ 2M+2 ⟺ d ≥ M+1 ✓ true. ✓.

Great — so branch rule: k == -d → ins; k == d → del; else compare. Same as classic! The pruning just restricts the k range. 

Now backtrack must likewise use k == -d / k == d tests (not lo_d/hi_d tests) ✓ — simpler, matches classic.

But backtrack reads slice_p at local index (k±1) - lo_{d-1}... need lo_{d-1} = max(-(d-1), d-1-2M). And ensure k+1 ≥ lo_{d-1} in ins branch: k = -d → k+1 = -d+1 ≥ lo_{d-1} = max(-d+1, d-1-2M) ✓ (≥ both). k interior: k+1 ≥ lo_d + ... k ≥ lo_d → k+1 ≥ lo_d + 1; lo_{d-1} ≤ lo_d? Is max(-d+1, d-1-2M) ≤ max(-d, d-2M)? -d+1 ≤ ... max(-d+1, d-1-2M): compare with max(-d, d-2M): each candidate of former ≤ some candidate of latter: -d+1 ≤ -d? No! -d+1 > -d. Hmm: need k+1 ≥ lo_{d-1}: if lo_{d-1} = -d+1 > lo_d = -d... then k > lo_d = -d → k ≥ -d+2 → k+1 ≥ -d+3 ≥ -d+1 ✓. If lo_d = d-2M: k ≥ d-2M → k+1 ≥ d-2M+1 ≥ max(-d+1, d-1-2M)? d-2M+1 ≥ d-1-2M ✓; ≥ -d+1 ⟺ d ≥ M... when lo_d = d-2M chosen means d-2M ≥ -d ⟺ d ≥ M ✓. ✓. Upper symmetric. ✓.

Also x_pre for ins branch = slice_p[(k+1) - lo_{d-1}] — trustworthy ✓.

But now backtrack trace slices: stored trace[d] = V[lo_i(d) : hi_i(d)+1] where lo_i = k_lo + offset... store list of slice; backtrack computes lo_{d-1} via formula.

Also — trace elements count reduced ✓.

Edge case M = 0 or N = 0: handled by early return, so in main code M ≥ 1, N ≥ 1; k_lo = max(-d, d-2M) fine.

Let me also double check the k range step: range(k_lo, k_hi+1, 2) — k_lo parity = d ✓ (both candidates), k_hi parity = d ✓, so all iterated have parity d ✓.

Now found-check placement: within loop after V[i] = x.

Potential false trigger with pruning: none new (pruned region contains no valid paths anyway; garbage same analysis).

Hmm, one more subtle thing: with pruning, do we still guarantee trigger x ≥ N and y ≥ M happens at k = N - M? The argument used only that trigger paths have d ≥ D_true etc. The true path at step D_true has k = N - M within pruned range (shown). Could a garbage path trigger at step D_true at different k? Shown no (i=j=0 forced). ✓. Could garbage trigger at d = D_true at k = N-M but with wrong x? x ≥ N, y ≥ M, x + y = D_true + 2m... x = N+i, y = M+j, i+j = 0 → exact ✓.

Now — trace memory with pruning for worst test 2: ~2M elements. Using list slices: 16MB pointers + int objects (~2M alive × 28B = 56MB) = ~72MB. Using array('H'): 4MB. Let's use array('H')? Conversion cost per step: array('H', V_slice) where V_slice is a list — iterating 2M elements total, creating temp ints (they exist anyway)... roughly 0.1-0.2s. Acceptable. Or store list slices and accept 72MB.

Hmm, actually alternative: store byte-packed via int.to_bytes? No, array is fine.

Actually wait — can reduce int-alive problem: the ints referenced by slices are mostly shared? A slice at step d copies current V references; next step only ~width entries updated → new ints; the rest shared. Total alive int objects = number of "value versions" = Σ per step updated entries ≈ total inner iterations ≈ 2M. Yeah 56MB. Combined with 16MB pointers = 72MB — probably fine, but array('H') makes it 4-8MB with ~0.15s cost. I'll use array('H')... hmm but 'H' unsigned 2 bytes: values ≤ 65535; garbage x ≤ ? x ≤ d + m where m ≤ min(N,M)... for N=M=1000: x ≤ 2000+1000 = 3000 ✓. In general x ≤ d + m ≤ (N+M) + min(N,M) ≤ 1.5(N+M)?? d ≤ N+M, m ≤ min(N,M): x = (d + 2m + k)/2 ≤ (N+M+2min+... k ≤ hi... hmm worst: N=1, M=100000? then tests... x ≤ N + ... deletions+matches = x ≤ N ≤ ... wait x counts deletions + matched-a = x. Deletions ≤ N? Not enforced (phantom) — x = V[k-1]+1 chains without bound check... x can exceed N via phantom deletions: right-edge chain V_d[d] = d... but with pruning, right edge k=d requires N ≥ d; for d > N... k = d pruned; but other chains: x increments happen on del branch; could x exceed N+M? x = V[k-1] + 1 where V[k-1] ≤ previous max. By induction max over V ≤ max(N + something)... Let me bound: x = (d + 2m + k)/2, k ≤ 2N - d (pruned!) → x ≤ (d + 2m + 2N - d)/2 = N + m ≤ N + min(N,M) ≤ N + M ≤ 2000+... For general tests: N + M ≤ 40000... wait test 1: N=M=20000: N + m ≤ 40000 < 65536 ✓. Hmm m ≤ min(N,M) = 20000, N + m = 40000 ✓ < 65535 ✓. General safety: could x exceed 65535 only if N + min(N,M) > 65535 — for the specified tests no; but function should be robust generally. Use 'i' (4 bytes, ≥ 2^15-1 guaranteed... actually 'i' guaranteed at least 2 bytes per docs? Docs: 'i' minimum size 2 bytes. In practice CPython 'i' = 4 bytes. To be fully safe use 'l' (minimum 4 bytes) → 8MB per... 2M × 8 = 16MB. Or 'i' practically 4. I'll use 'l'? Hmm 'l' is platform long = 8 bytes on 64-bit Linux → 16MB. Fine. Actually simplest robust: use array('q')? Also 8. Or just... use 'i' — CPython on all mainstream platforms = 4 bytes, values ≤ 2^31. Given the problem's scale, 'i' fine. Even better: bounds check unnecessary.

Hmm, wait — actually, maybe simpler: skip array conversion; store plain list slices. 72MB worst-case... judges usually give 256MB+. But the conversion also costs time. Let me weigh: worst-case time test 2 has generous 6s; memory presumably ≥ 256MB. Plain slices: simpler & faster code path (V[lo:hi+1] is a fast C memcpy of pointers). I'll go with plain list slices but... 72MB estimate includes int objects — actually let me recount: inner iterations with pruning ≈ Σ width(d) — for N=M=1000 fully different: width(d) = 2·min(d, 2000-d)+1 → Σ ≈ 2M. Each iteration writes one int → up to 2M int objects alive (each referenced by the slice snapshot of its step and later steps until replaced... a value written at step d for diagonal k is referenced by slices d, d+1, ..., until diagonal k updated again (step d+2 earliest? k parity d → updated again at d+2) → referenced by slices d and d+1 → alive while those slices alive → all alive until end. So ~2M ints ≈ 56MB + 2M pointers in slices ≈ 16MB + slice list overhead ≈ 72-80MB. Plus V list trivial. OK, acceptable. But hmm, do I want to risk it? The problem statement emphasizes performance hints (Myers O(ND)) but says nothing about memory. I'll use array('H') with values < 65536 guaranteed for the given constraints (N, M ≤ 20000 → x ≤ N + min(N,M) ≤ 40000 ✓ < 65536; but to be generically safe use 'i'). Let me estimate 'i' conversion speed: array('i', list_of_ints) — implemented via list iterator, storing longs: ~30-50ns/element → 2M → ~0.1s. Fine.

Hmm, actually there's an even better idea: since backtrack needs only 2 values per step, I could store trace slices ONLY every step but as... no, snapshots it is.

Alternatively — completely different approach to save memory & time: store, during forward, for each step d, just the predecessor info per diagonal in flat arrays of ints (pre-k sign?) — we already discussed; snapshots simpler.

Let me also reconsider: maybe implement the linear-space variant to be safe on memory AND keep time. The linear-space Myers (find middle snake with forward & backward D-contours, recurse). Time ~ 2× forward cost, memory O(N+M). Implementation trickier (off-by-one errors notorious). The problem gives 6s for the 1000×1000 worst case — snapshot approach ~1-1.5s — plenty of headroom; memory ~72MB or 8MB with arrays. I'll go snapshot + array('i').

Wait, actually one more consideration: trace conversion via `array("i", V[lo:hi+1])` — but V[lo:hi+1] creates a temp list (pointers) then array iterates. Slight extra alloc per step; fine.

Hmm, actually, could avoid temp list: array('i', ...) needs an iterable; islice over V? V is a list; slicing is fastest.

Let me now also think again about time for test 2 more concretely: inner iterations 2M (with pruning) each doing: loop overhead (~50ns), branch checks (~100ns), V reads/arith (~150ns), snake while: one failed check `x < N and y < M and a[x] == b[y]` — for completely different lists at interior... wait, with pruning, many reaches are at boundaries where while fails on first condition (~60ns). Average maybe 0.35µs/iteration → 0.7s. Plus per-step overhead: trace conversion 2M elements ~0.1s, slice temp ~. Total ~1s. 

For test 1: tiny.

Now, implement carefully.

def diff_lines(a, b):
    N = len(a)
    M = len(b)
    if N == 0:
        return [("+", ln) for ln in b]
    if M == 0:
        return [("-", ln) for ln in a]

    from array import array  # import at top-level actually

    max_d = N + M
    offset = N  # choose offset = N: index = k + N; k range with pruning: k ≥ d-2M ≥ -(2M)... k ≥ lo ≥ max(-d, d-2M) ≥ -(N+M)? d-2M ≥ -(M) when d ≥ M... min over d: max(-d, d-2M): for d ≤ 2M: -d ≥ d-2M → lo = -d ≥ -max_d... hmm max_d = N+M; lo ≥ -d ≥ -(N+M); index = k + N ≥ N - N - M = -M < 0!! Need offset ≥ M for safety? With pruning, lo = -d only when d ≤ 2M → k ≥ -d ≥ -2M. index ≥ N - 2M could be negative if M > N/2. Use offset = N + M? Then index = k + N + M: k max = min(d, 2N-d) ≤ min(N+M, N)... k_hi ≤ N (when d ≤ N? k_hi = min(d, 2N-d)... at d = N: k_hi = N; d > N: k_hi = 2N-d < N). So k ≤ N → index ≤ 2N + M. k ≥ lo: lo = max(-d, d-2M) ≥ -max... at d = N+M: lo = max(-N-M, N-M) = N-M (since N-M > -N-M ✓). Hmm lo as function: for d ≤ 2M: lo = -d (if -d ≥ d-2M ⟺ d ≤ 2M) → k ≥ -d ≥ -(N+M) → index ≥ N. For d > 2M: lo = d-2M > 0 → index > N. So k ≥ -(N+M) → index = k + offset ≥ 0 needs offset ≥ N+M? k min = -d, d ≤ N+M → k ≥ -(N+M). offset = N+M → index ≥ 0 ✓; max index = k_max + offset ≤ N + N + M = 2N+M → size = 2N + M + 1. Hmm asymmetric; just use offset = N + M, size = 2*(N+M) + 1 — safe.

Actually let me simplify: offset = max_d = N + M; size = 2 * max_d + 1. k ∈ [-max_d, max_d] → index ∈ [0, 2max_d] ✓.

    V = [0] * (2 * max_d + 1)
    trace = []
    d_found = -1

    for d in range(max_d + 1):
        klo = d - 2 * M
        if klo < -d:
            klo = -d
        khi = 2 * N - d
        if khi > d:
            khi = d
        lo_i = klo + offset  # = offset - d typically
        hi_i = khi + offset
        found = False
        for i in range(lo_i, hi_i + 1, 2):
            if i == lo_i and klo == -d:
                x = V[i + 1]
            elif i == hi_i and khi == d:
                x = V[i - 1] + 1
            else:
                # compare
                if V[i - 1] < V[i + 1]:
                    x = V[i + 1]
                else:
                    x = V[i - 1] + 1
            ...

Hmm wait — the branch condition: forced-ins iff k == -d. With pruning, k = klo when klo == -d; if klo = d-2M ≠ -d, then iterated k's all ≥ klo > ... k == -d impossible. So testing `i == lo_i and klo == -d` ⟺ k == -d when iterated ✓. But also k == -d could occur in interior?? k = -d iterated only if -d ≥ klo ⟺ klo == -d. ✓. Similarly k == d only if khi == d. But careful: what if both klo == -d and khi == d and d=0: i == lo_i == hi_i: first branch matches (klo == -d → k==0==-d ✓ for d=0): x = V[i+1] = 0 ✓ correct.

But hmm — what about k == -d when klo == -d but ALSO k == d when d == 0 — handled.

However: there's subtlety — when klo == -d (forced ins at left edge) but ALSO the left-edge k might equal... fine.

But WAIT: another subtlety: when khi == d but ALSO k == -d for that same k? No.

Yet another: forced-ins condition should be exactly `k == -d`, and forced-del `k == d`, and ELSE compare. In code: 

k = i - offset
if k == -d: ins
elif k == d: del
else: compare

Computing k = i - offset per iteration adds an op; using index-based conditions: i == offset - d and i == offset + d — precompute lo0 = offset - d, hi0 = offset + d (the UNPRUNED edges) and check i == lo0 / i == hi0. When klo == -d, lo_i == lo0 ✓; when klo = d-2M > -d, i never equals lo0 in loop? i ranges from lo_i = klo+offset > lo0 ✓ so i == lo0 never true ✓. Similarly hi. So:

lo0 = offset - d
hi0 = offset + d
for i in range(lo_i, hi_i + 1, 2):
    if i == lo0:
        x = V[i + 1]
    elif i == hi0:
        x = V[i - 1] + 1
    elif V[i - 1] < V[i + 1]:
        x = V[i + 1]
    else:
        x = V[i - 1] + 1

Clean. But careful when d=0: lo0 == hi0 == i → first branch → x = V[i+1]: V[i+1] is 0 (untouched) ✓ fine.

Snake:
    y = x - k where k = i - offset → y = x - i + offset. Precompute? y = x + (offset - i) = x + lo0... offset - i: per iteration compute. Let me define k = i - offset; y = x - k.

    while x < N and y < M and a[x] == b[y]:
        x += 1; y += 1
    V[i] = x
    if x >= N and y >= M:
        found = True
        kf = k... (k = i - offset; but we know it equals N - M)
        break
if found: d_found = d; break
trace.append(V[lo_i:hi_i+1])  # list slice

Hmm — but we also need, for backtrack, to know klo(d-1) to index slices. Compute formula each backtrack step.

Backtrack:

    script = []
    k = N - M
    x_end = N
    y_end = M
    d = d_found
    offset_d = offset
    while d > 0:
        p = d - 1
        klo_p = p - 2 * M
        if klo_p < -p:
            klo_p = -p
        sl = trace[p]  # covers diagonals klo_p .. khi_p, local index = k' - klo_p
        # V_{p}[k+1] -> sl[k + 1 - klo_p]; V_p[k-1] -> sl[k - 1 - klo_p]
        i1 = k + 1 - klo_p
        i2 = k - 1 - klo_p
        if k == -d:
            x_pre = sl[i1]
            ins = True
        elif k == d:
            x_pre = sl[i2] + 1
            ins = False
        elif sl[i2] < sl[i1]:
            x_pre = sl[i1]
            ins = True
        else:
            x_pre = sl[i2] + 1
            ins = False
        y_pre = x_pre - k
        for i in range(x_end - 1, x_pre - 1, -1):
            script.append(("=", a[i]))
        if ins:
            script.append(("+", b[y_pre - 1]))
            x_end = x_pre
            y_end = y_pre - 1
            k += 1
        else:
            script.append(("-", a[x_pre - 1]))
            x_end = x_pre - 1
            y_end = y_pre
            k -= 1
        d -= 1
    for i in range(x_end - 1, -1, -1):
        script.append(("=", a[i]))
    script.reverse()
    return script

Wait — need to double check the forced branches in backtrack mirror forward exactly: forward forced-ins iff k == -d (i == lo0). Backtrack: same test ✓. Forward forced-del iff k == d ✓. Else compare V_p[k-1] vs V_p[k+1] ✓ with same tie-breaking (V[k-1] < V[k+1] → ins). ✓ Deterministic and identical.

But hold on — in forward, when k == -d, do we use x = V[k+1] even if V[k-1] would be... V[k-1] untrusted, forced ✓. In backtrack at k == -d: ins ✓ consistent.

Also must double check slice indices in bounds: sl length = khi_p - klo_p + 1. Access sl[i1] where k+1 ≤ khi_p? For ins branch: k == -d or interior-with-choice. k == -d: k+1 = -d+1; khi_p = min(d-1, 2N-d+1) ≥ -d+1? min(d-1, 2N-d+1) ≥ -d+1 ⟺ d-1 ≥ -d+1 (d ≥ 1 ✓) and 2N-d+1 ≥ -d+1 ⟺ N ≥ 0 ✓. ✓. Interior: k < hi_d → k ≤ hi_d - 2 → k+1 ≤ hi_d - 1 ≤ khi_p? khi_p = min(d-1, 2N-d+1); hi_d = min(d, 2N-d): if hi_d = d → hi_d - 1 = d-1 ≥ min ✓; if hi_d = 2N-d → hi_d - 1 = 2N-d-1 ≤ 2N-d+1 ✓ and ≤ d-1? 2N-d-1 ≤ d-1 ⟺ N ≤ d — is N ≤ d guaranteed in this case? hi_d = 2N-d < d ⟺ 2N < 2d ⟺ N < d ✓ yes! So k+1 ≤ khi_p ✓. And k+1 ≥ klo_p ✓ shown earlier. Similarly i2 ✓.

But wait — one more: sl[i2] + 1 in del branch when k == d: i2 = d - 1 - klo_p ≤ length-1 ⟺ d-1 ≤ khi_p ⟺ d-1 ≤ min(d-1, 2N-d+1) ✓. And k == d iterated in forward means khi_d == d... in backtrack, we test k == d regardless; k == d on the true path implies forward iterated it (true path within pruned range ✓, and k=d ≤ hi_d requires khi_d = d ⟺ N ≥ d... k = d on path: deletions ≥ ... k=d means ins = 0, del = d ≤ N ✓ consistent). And i1 in ins branch when k == -d: i1 = -d+1-klo_p ≥ 0 ✓ shown.

Also: `sl[i1]` in the compare branch — both in bounds ✓ shown.

Now the trace slices: note slice V[lo_i : hi_i+1] — but forward writes V[i] for all iterated i; when found-break happens mid-loop, remaining entries not updated — but that's step d_found whose trace isn't stored ✓. For steps fully processed, all entries in slice updated ✓ trustworthy.

Hmm — but actually one more subtle issue: trace[p] entries for diagonals in [klo_p, khi_p] were ALL written at step p ✓. But does slice possibly include stale entries? Slice exactly covers written range ✓.

Now, complexity of backtrack: D steps, each with O(snake length) — total snake = D... = O(N+M). Fine.

Now, is the "=" count really L? D_found = d_found; script edits: count of "-" + "+" = d_found... each backtrack step emits exactly one edit; final snake emits x_end "="s and each step's snake emits (x_end - x_pre) "="s; total "=" = x_end_final... total = N - deletions... deletions + "=" = N ✓ and insertions + "=" = M ✓ → "=" = (N + M - d_found)/2 = L ✓.

Now — potential issue: `if x >= N and y >= M` — we argued trigger implies x == N, y == M. Actually also need to make sure we check after snake, with updated x, y ✓.

Also potential issue: for d beyond... loop range(max_d + 1) — found guaranteed by d = max_d? Path with all dels then all ins... at d = N+M: k = N - M... deletions = N, insertions = M: k = N - M ✓ within range ✓ x = N... the pure path: V_{N+M}[N-M] = N ✓ trigger ✓ (if not earlier). So loop terminates with found ✓. (Even if snake logic... yes.)

Also — the found condition might trigger mid-scan at some k before reaching k = N-M within step D_true — that's fine (any trigger at D_true is the true one).

Also — d_found could be found at a step before prune boundaries engage; fine.

Now performance tweak: bind methods/locals: a_local = a; but a is param already local. V local ✓. In the snake while, `a[x] == b[y]` list indexing. Could micro-opt by local vars but fine.

One more potential speedup for the snake: precompute `N1 = N`, use while 1 with try/except IndexError? No, keep simple.

Another possible speedup: avoid recomputing `i == lo0` etc. — the branch chain: for interior iterations, we evaluate i == lo0 (False), i == hi0 (False), V[i-1] < V[i+1]. 3 checks + reads. Alternatively precompute edge handling outside loop: iterate interior separately from edges? Edges are 2 iterations per step — handle specially, then main loop over interior without those checks:

for d in range(...):
    ...
    # left edge:
    if klo == -d:  (i.e., lo_i == lo0)
        i = lo_i; x = V[i+1]; y = ...; snake; V[i] = x; check found
        start interior at lo_i + 2... but interior branch uses same compare logic
    Actually the interior loop still needs compare branch only (no edge checks):

    for i in range(lo_i + 2, hi_i - 1, 2):  # strictly interior
        if V[i-1] < V[i+1]: x = V[i+1]
        else: x = V[i-1] + 1
        ...
    # right edge handled after (if khi == d, i = hi_i: x = V[i-1] + 1 ...)

But careful: interior requires lo_i + 2 ≤ hi_i - ... interior k strictly between: range(lo_i+2, hi_i, 2)? k from lo+2 to hi-2 step 2 → range(lo_i + 2, hi_i - 1, 2). Hmm range(lo_i+2, hi_i-1+1?) — want i values lo_i+2, ..., hi_i-2: range(lo_i + 2, hi_i - 1, 2). ✓ (stop exclusive; hi_i-1 excluded, last ≤ hi_i-2 ✓ since parity).

Also special case d == 0: lo_i == hi_i → treat as left edge (k==0==-d ✓ ins branch x = V[i+1] = 0 ✓ — same result as del branch x = V[i-1]+1 = 1? No! For d=0, k=0: classic Myers: k == -d(=0) and k == d(=0): the standard condition `if k == -d or (k != d and V[k-1] < V[k+1])` → k==-d true → x = V[k+1] = 0 ✓. Our order: left edge first → x = V[i+1] = 0 ✓ same.)

Order matters for d=0 only.

Restructure per step:

    lo0 = offset - d; hi0 = offset + d
    lo_i = ... pruned; hi_i = ... pruned
    found = False
    # left edge
    i = lo_i
    if lo_i == lo0:  # k == -d (or d == 0 case where lo0 == hi0)
        x = V[i + 1]
        y = x - k... k = i - offset = -d
        snake; V[i] = x; if trigger: found...
        next_i = i + 2
    else:
        next_i = i  # left edge is interior-like? When klo = d-2M > -d, left edge k = klo: both neighbors trusted → compare branch. Handle it in interior loop? Interior range should then start at lo_i.
    
Hmm, this is getting messy. Simplify: treat left edge as: if lo_i == lo0 → forced ins; else it's a "compare" node → include in interior loop by starting interior at lo_i. Similarly right edge: if hi_i == hi0 → forced del, handle after interior; else include in interior loop (end at hi_i).

Let me define:
    if lo_i == lo0:
        # forced ins at left edge
        handle i = lo_i with x = V[i+1]
        int_lo = lo_i + 2
    else:
        int_lo = lo_i
    if hi_i == hi0:
        int_hi_excl = hi_i  (interior up to hi_i - 2)
        then handle right edge i = hi_i with x = V[i-1] + 1
    else:
        int_hi_excl = hi_i + 1  (interior includes hi_i)

interior loop: for i in range(int_lo, int_hi_excl, 2): compare-branch.

But careful when lo_i == hi_i (d=0 or narrow): if lo_i == lo0 and hi_i == hi0 (d=0): left-edge handling runs (x = V[i+1] = 0, fine), then right edge handling would run again on same i?? Need guard: if hi_i == hi0 and hi_i >= int_lo... when d == 0, after left edge handled and found maybe; skip right edge if hi_i < int_lo... Actually if d == 0: hi_i == lo_i; left edge handled; right edge shouldn't re-handle. Condition: handle right edge only if hi_i > lo_i... more precisely if hi_i >= int_lo (i.e., not already handled). Since when d=0, int_lo = lo_i + 2 > hi_i → skip ✓. When d ≥ 1 and klo == -d and khi == d: lo_i < hi_i ✓ both handled ✓. When d ≥ 1, klo == -d, khi = 2N-d < d: left handled; interior from lo_i+2 to hi_i (inclusive? hi_i == hi0? hi0 = offset + d; hi_i = 2N-d+offset ≠ hi0 since khi ≠ d) → interior includes hi_i → int_hi_excl = hi_i + 1 ✓ and no separate right-edge handling. Similarly when klo = d-2M > -d and khi = d: interior starts at lo_i (compare ✓ correct since both trusted), ends hi_i - 2, then right edge forced ✓.

Edge case within interior: reading V[i-1], V[i+1] — trustworthiness verified for all interior incl. pruned-edge-as-interior ✓ (shown above for k = klo ≠ -d and k = khi ≠ d).

This removes two comparisons per interior iteration. Worth it? Modest. Let me keep code clarity vs speed... The hot loop for worst case ~2M iterations; saving ~2 quick int compares (~40ns) → ~0.1s. Include the optimization — but it adds bug surface. Let me carefully write it.

Also y computation: y = x - (i - offset) = x - i + offset. In the loop: `y = x - i + off` — two ops. Alternatively track k via enumerate? k = i - offset fine.

Actually here's a cleaner micro-opt: iterate k directly and compute i = k + offset. Same cost. Whatever — use i-based.

Snake loop inline:

            y = x - i + off
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[i] = x
            if x >= N and y >= M:
                found = True
                break

Note: `x >= N and y >= M` — given trigger implies equality, could write `if x == N and y == M:`? Trigger guaranteed exact as proven — but defensive: use >= (proven equivalent at trigger time... hmm at trigger within step D_true, exact; but what if... proven. Use >= anyway, harmless: backtrack starts from (N, M) — if somehow x > N, backtrack would break (a[x_pre-1] etc. still consistent? script correctness structurally guaranteed; but x_end = N initial mismatch: snake emission range(x_end-1, x_pre-1, -1) where the reach was x > N → missing lines... To be safe use x == N and y == M? If my proof is right they're equivalent at trigger. I proved: trigger at (d, k) requires x ≥ N, y ≥ M, and d ≥ D_true, with equality analysis giving x=N,y=M when d = D_true; but what if trigger occurs at d > D_true? Impossible since true path triggers at D_true and we break there. Within step D_true: any trigger has x=N,y=M ✓. So `x >= N and y >= M` first-trigger is exact. But subtle: what if D_true path triggers but ALSO earlier in the same k-scan order a garbage triggers at d = D_true with x=N+i? proven impossible. OK use >=; or even better both — use >= and set x_end = N, y_end = M in backtrack initialization regardless (since proven exact, no issue).

Hmm, wait — actually there's an edge in the proof: m ≤ L? m = number of matched pairs along the recorded path — matched pairs form a common subsequence of a and b ✓ (positions increasing in both) → m ≤ L ✓. And overshoot: x = N + i needs i phantom deletions... deletions = x - m ≥ N - m + i; hmm deletions count = x - m where m = matches: total a-lines consumed = deletions + matches = x ✓ so deletions = x - m = N + i - m. Edit count d = del + ins = (N + i - m) + (M + j - m) = N + M + i + j - 2m ✓ as before. d ≥ D_true ✓. Trigger d = d_found ≤ D_true?? d_found is FIRST trigger → d_found ≤ D_true? No: d_found is the first d at which any trigger occurs; true trigger at D_true exists → d_found ≤ D_true. Also d_found ≥ D_true (any trigger needs d ≥ D_true) → d_found = D_true ✓ and at that step all triggers exact ✓✓.

Solid.

Now — also check `y >= M` uses updated y ✓.

Let me now also handle potential huge D pathologies: the algorithm is O((N+M)·D) with pruning halving constants. For arbitrary adversarial inputs beyond the spec (e.g., 20000 lines completely different → D = 40000 → inner iterations Σ min-width ≈ ~2·Σ... width(d) = 2·min(d, 40000-d)+1 → Σ ≈ 2·(20000²)·... = Σ_{d=0}^{19999}(2d+1)·... ≈ 20000² = 4·10⁸ — way too slow (minutes). But spec only requires 1000×1000 worst-case-different ≤ 6s and 20000 similar ≤ 2s. A 20000×20000 completely-different case isn't required. OK.

Should I add the linear-space refinement for robustness? The spec's perf targets are met by this approach. Keep it.

Let me now write the final code.

```python
from array import array


def diff_lines(a, b):
    N = len(a)
    M = len(b)
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    max_d = N + M
    off = max_d                      # index = k + off, k = x - y
    V = [0] * (2 * max_d + 1)
    trace = []                       # trace[d] -> V-snapshot for diagonals [klo(d), khi(d)]
    d_found = -1

    for d in range(max_d + 1):
        lo0 = off - d                # index of diagonal -d
        hi0 = off + d                # index of diagonal d
        # pruned bounds
        klo = d - 2 * M
        if klo < -d:
            klo = -d
        khi = 2 * N - d
        if khi > d:
            khi = d
        lo = klo + off
        hi = khi + off

        found = False

        # left edge (forced insertion) when diagonal -d is in range
        if lo == lo0:
            i = lo
            x = V[i + 1]
            y = x - i + off
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[i] = x
            if x >= N and y >= M:
                d_found = d
                found = True
                break
            int_lo = i + 2
        else:
            int_lo = lo

        # interior
        stop = hi + 1 if hi != hi0 else hi - 1
        for i in range(int_lo, stop, 2):
            if V[i - 1] < V[i + 1]:
                x = V[i + 1]
            else:
                x = V[i - 1] + 1
            y = x - i + off
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[i] = x
            if x >= N and y >= M:
                d_found = d
                found = True
                break

        if found:
            break

        # right edge (forced deletion) when diagonal d is in range
        if hi == hi0 and hi >= int_lo:
            i = hi
            x = V[i - 1] + 1
            y = x - i + off
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            V[i] = x
            if x >= N and y >= M:
                d_found = d
                found = True
                break

        if found:
            break

        trace.append(V[lo:hi + 1])
```

Wait — bug: `found` set inside left-edge block then `break` — but I wrote `break` inside `if x >= N...` within left edge block: after break we skip interior — but then `if found: break` unreachable... Actually I break out of the for-d loop directly ✓ (the inner break at left edge breaks... hmm `break` inside the `if` under left-edge section — that break is at the `for d` loop level? The left-edge code isn't inside a for loop, so `break` there would be... Python: `break` outside loop → SyntaxError! The left-edge code is in the `for d` loop body but not in an inner loop — `break` applies to the `for d` loop ✓ that's what we want ✓. OK legal.

But careful: after left-edge break, trace not appended for this step ✓ fine (unused).

Also: `stop = hi + 1 if hi != hi0 else hi - 1` — when hi == hi0 (khi == d), interior excludes hi (handled separately as forced-del). When hi != hi0 (khi = 2N-d < d), interior includes hi (compare branch ✓ correct as analyzed). Hmm wait — also need: when hi != hi0 but hi == lo? (narrow range where khi == klo and neither edge?) e.g., khi = 2N-d = klo = d-2M — happens when? 2N-d = d-2M → d = N+M → d = max_d: klo = N-M, khi = N-M, lo0 = off-(N+M) = 0? lo = klo+off = N-M+N+M = 2N ≠ 0 = lo0 (unless N=0); hi0 = off+d = 2(N+M) ≠ hi = 2N. So interior loop range(2N, 2N+1, 2) = [2N] with compare branch ✓ both neighbors trusted? k = N-M at d = N+M: k-1 = N-M-1: at step d-1 = N+M-1: klo_{d-1} = max(-(d-1), d-1-2M) = max(-N-M+1, N-M-1) = N-M-1 (since N-M-1 ≥ -N-M+1 ⟺ 2N ≥ 2 ✓). ✓ computed. k+1 = N-M+1 ≤ khi_{d-1} = min(d-1, 2N-d+1) = min(N+M-1, N-M+1) = N-M+1 ✓ (since M ≥ 1... N-M+1 ≤ N+M-1 ⟺ M ≥ 1 ✓). ✓ trusted. Good.

Also `hi >= int_lo` check for right edge: needed when d == 0 (hi == lo, already handled as left edge... at d=0: lo == hi == lo0 == hi0: left edge handled (ins branch), right edge condition `hi == hi0 and hi >= int_lo`: int_lo = lo + 2 → hi ≥ lo+2 false → skip ✓.)

But hmm — d == 0 handled with ins branch; classic also fine.

Another subtle: when lo == lo0 but ALSO lo == hi (d=0) — handled ✓.

What about when klo = -d (lo == lo0) and hi == hi0 and hi == lo + ... normal.

What about interior `stop` when int_lo > stop - 1... range handles empty ✓.

Also: when lo != lo0 (klo = d-2M) AND hi == hi0: interior covers lo..hi-2 with compare ✓; right edge forced ✓. But is forced-del correct at k = d here? k = d iterated ⟺ d ≤ khi? khi = d ✓ so k = d is the top. V[k+1] untrusted (k+1 = d+1 > hi_{d-1} = min(d-1, ...) ✓ untrusted) → forced ✓.

Now wait — one more possibility: lo != lo0 AND hi != hi0 — interior covers entire range including both ends with compare ✓.

And lo == lo0 AND hi != hi0 ✓.

Also possible: lo == lo0 AND lo == hi0?? d=0 covered.

Now the `while x < N and y < M` — also note potential infinite... no.

Found at left edge: I set d_found and break; but found variable then... after break (outer), we skip trace append ✓ and proceed to backtrack ✓. But note: found flag unused after outer break — fine. Actually I set `found = True; break` — the break exits for-d ✓.

Wait, in left-edge block I wrote `d_found = d; found = True; break` — then after outer loop, backtrack. ✓. In interior: set d_found, found=True, break inner; then `if found: break` outer ✓. Right edge: same pattern with outer break ✓ — but I wrote `if found: break` twice — after interior and after right edge. The one after interior catches interior-found ✓. Right-edge block sets found and breaks outer directly ✓. Fine. Actually simplify: right-edge block: `if x >= N and y >= M: d_found = d; break`.

Hmm, but there's a subtle flaw: after interior `break`, we do `if found: break` — ✓ skips right edge and trace append ✓.

Now trace append: `trace.append(V[lo:hi+1])` — V list slice. Memory concern → convert to array('i')? Let me estimate int-object memory again with pruning for worst spec case (1000×1000 all-different): inner iterations ≈ Σ_{d=0}^{1999} width(d) ≈ 2M (computed earlier: 2·10⁶? earlier I computed Σ width = 2M... let me recompute: width(d) = 2·min(d, 2000-d)+1. Σ_{d=0}^{1999} = Σ_{d=0}^{999}(2d+1) + Σ_{d=1000}^{1999}(2(2000-d)+1) = [2·(999·1000/2)+1000] + [same by symmetry] = (999000 + 1000)·2 = 2,000,000. Yes 2M iterations, 2M written ints → trace slices hold ~2M distinct ints (28 bytes each = 56MB) + 2M pointers (16MB) + slice objects (2001 × ~56B ≈ 0.1MB). ~72MB. With array('i'): 2M × 4B = 8MB total. Conversion cost ~0.1-0.2s. I'll convert: `trace.append(array("i", V[lo:hi + 1]))`.

Hmm, but hold on — array('i', some_list) — is constructing array from a list of ints done at C speed? Yes, it iterates the sequence via PyIter and stores each — roughly 30ns/item. 2M items → 60ms. 

Backtrack accesses sl[...] on array → returns int (new object) fine.

Alternatively — hmm, we could even avoid storing most snapshots: note backtrack needs trace[p] only at neighbor diagonals of the path. Could store all steps' slices but that's what we do. Fine.

Now backtrack:

    script = []
    k = N - M
    x_end = N
    y_end = M
    d = d_found
    while d > 0:
        p = d - 1
        klo_p = p - 2 * M
        if klo_p < -p:
            klo_p = -p
        sl = trace[p]
        i1 = k + 1 - klo_p      # index of V_p[k+1]
        i2 = k - 1 - klo_p      # index of V_p[k-1]
        if k == -d:
            x_pre = sl[i1]
            ins = True
        elif k == d:
            x_pre = sl[i2] + 1
            ins = False
        elif sl[i2] < sl[i1]:
            x_pre = sl[i1]
            ins = True
        else:
            x_pre = sl[i2] + 1
            ins = False
        y_pre = x_pre - k
        for i in range(x_end - 1, x_pre - 1, -1):
            script.append(("=", a[i]))
        if ins:
            script.append(("+", b[y_pre - 1]))
            x_end = x_pre
            y_end = y_pre - 1
            k += 1
        else:
            script.append(("-", a[x_pre - 1]))
            x_end = x_pre - 1
            y_end = y_pre
            k -= 1
        d -= 1

    for i in range(x_end - 1, -1, -1):
        script.append(("=", a[i]))
    script.reverse()
    return script

Wait — in backtrack forced branches: forward forced-ins iff k == -d; but with pruning, at step d, k = -d might not be iterated; the true path's k at step d always iterated; if path k == -d then it was iterated and forced-ins ✓ backtrack test k == -d matches ✓. But is it possible that k == -d in backtrack while forward used compare branch? Forward at k = -d: if iterated, k == lo0 → check `i == lo0` — in my restructured forward, left edge handled only `if lo == lo0` where lo = klo+off: klo == -d ⟺ lo == lo0 ✓ → forced ins ✓. If klo > -d then k=-d not on any path (pruned ✓ since true path ks ≥ klo). So consistent ✓.

Similarly k == d ⟺ hi == hi0 ⟺ forced del ✓.

Compare branch in backtrack: sl[i2] < sl[i1] → ins — matches forward interior `V[i-1] < V[i+1] → x = V[i+1]` (ins) ✓.

Now consistency of the actual chosen predecessor values: forward computed x from these exact V_p values ✓ backtrack reproduces ✓.

One more check — in forward interior branch, reading V[i-1] and V[i+1]: these are step-(d-1) values for trusted diagonals ✓; but could V[i-1]/V[i+1] hold values written at step d-... within CURRENT step d? Interior loop iterates i ascending: V[i-1] — diagonal k-1 has parity d-1 → NOT written at step d (step d writes parity-d indices: i values parity = lo parity = off - d + klo... hmm index parity: i = k + off, k parity = d's parity; off = max_d = N+M; i parity = d + off mod 2 — fixed per step ✓; i-1, i+1 have other parity → not written this step ✓.) ✓.

Snake starting point: `y = x - i + off` ✓ k = i - off.

Now let me double-check `stop` for interior when hi == hi0: interior should cover i from int_lo to hi - 2: range(int_lo, hi - 1, 2) → stop = hi - 1 ✓ (matches `stop = hi - 1` via expression `hi + 1 if hi != hi0 else hi - 1` ✓).

When hi != hi0: interior covers up to hi: range(int_lo, hi + 1, 2) ✓.

But what if hi == hi0 AND hi == int_lo - ... e.g., range with int_lo = hi (can that happen with hi == hi0 and lo == lo0 and d ≥ 1? width = 2d+1 ≥ 3 → int_lo = lo+2 ≤ hi-... lo+2 ≤ hi ⟺ d ≥ 1 ✓ for d=1: lo, hi = lo+2: int_lo = lo+2 = hi → interior range(int_lo, hi-1, 2) empty ✓, right edge handles hi ✓. Good: d=1, both edges forced ✓ correct (classic Myers d=1: k=-1 forced ins, k=1 forced del ✓).

What if lo != lo0 (klo = d-2M) and hi == hi0 and width small: int_lo = lo, stop = hi-1: covers lo..hi-2 ✓ with compare at lo ✓ (trusted, shown). ✓.

What if lo != lo0 and hi != hi0: interior covers lo..hi ✓ compare everywhere ✓.

Now — also the case d=0 when lo==hi==lo0==hi0: left-edge runs (x = V[i+1] = 0), snake from (0,0), V[i] = x, trigger if a==b empty... N,M ≥ 1 here so trigger only if N==0... excluded. Then interior range(lo+2, hi-1, 2) empty ✓, right edge skipped (hi >= int_lo false) ✓, trace appended ✓.

Now — the trace for step d: slice V[lo:hi+1] — but when lo == lo0, includes left-edge written value ✓; hi included if hi==hi0 written ✓ or interior-written ✓.

Backtrack slice index check: sl = trace[p] has length khi_p - klo_p + 1. i1 = k+1-klo_p ∈ [0, len-1]? Shown k+1 ∈ [klo_p, khi_p] for ins/compare branches ✓; i2 similarly ✓.

But hmm — wait, in compare branch of backtrack, BOTH sl[i2] and sl[i1] must be in bounds ✓ shown.

Now — verify the example a=["a","b","c"], b=["a","c"] with pruning: N=3, M=2, max_d=5, off=5. 
d=0: lo0=hi0=5; klo = max(0-4, 0)=... klo = d-2M = -4 vs -d=0 → klo=0; khi = 6-0=6 vs d=0 → khi=0. lo=hi=5=lo0 → left edge: x = V[6] = 0, y = 0; snake: a[0]==b[0] → x=1,y=1; a[1] vs b[1]: "b" vs "c" stop. V[5]=1. trigger? x=1≥3? no. int_lo=7. interior range(7, stop, 2): hi=5=hi0 → stop=4 → empty. right edge: hi==hi0 ✓ but hi(5) >= int_lo(7)? No → skip. trace[0] = V[5:6] = [1] ✓.
d=1: lo0=4, hi0=6. klo = 1-4 = -3 vs -1 → klo=-1; khi = 6-1=5 vs 1 → khi=1. lo=4=lo0 ✓ left edge: i=4, x = V[5] = 1, y = 1 - 4 + 5 = 2. snake: y<M? 2<2 no. V[4]=1. trigger: 1≥3 no. int_lo = 6. interior: stop = hi-1 = (1+5)-1 = 5 → range(6, 5, 2) empty. right edge: hi=6==hi0 ✓ hi >= int_lo ✓: i=6, x = V[5]+1 = 2, y = 2-6+5 = 1. snake: a[2]=="c" == b[1]=="c" → x=3,y=2; x<3 fails → stop. V[6]=3. trigger: 3≥3 ✓ 2≥2 ✓ → d_found=1, break.

Backtrack: k = 3-2 = 1, x_end=3, y_end=2, d=1. p=0: klo_p = max(0-4, 0)... p-2M = -4 < -p=0 → klo_p = 0. sl = trace[0] = [1]. i1 = k+1-klo_p = 2, i2 = 0. k == d(1) → x_pre = sl[0]+1 = 2, ins=False. y_pre = 2-1 = 1. snake emit: range(2, 1, -1) → i=2: ("=", a[2]) ✓. "-" a[1] ✓. x_end=1, y_end=1, k=0, d=0. Final: range(0,-1,-1): ("=", a[0]) ✓. reversed → [("=",a0), ("-",a1), ("=",a2)] ✓.

Wait — i1 = 2 out of bounds for sl length 1 — but not accessed in this branch ✓ (Python evaluates lazily ✓).

Test with deletion+insertion crossing: a=["a","x","b"], b=["a","y","b"] → expect =, -, +, = or =, +, -, = (D=2). Let's run mentally: N=M=3, off=6. max_d=6.
d=0: klo=khi=0, lo=hi=6=lo0: left edge: x=V[7]=0,y=0; snake: a[0]==b[0] → x=1,y=1; a[1]="x" vs b[1]="y" stop. V[6]=1. trace[0]=[1].
d=1: lo0=5,hi0=7; klo=-1,khi=1; lo=5,hi=7. left edge i=5: x=V[6]=1, y=1-5+6=2. snake: a[1]="x" vs b[2]="b" no. V[5]=1. interior: stop=6 → range(7,6,2) empty... wait int_lo = 5+2 = 7; stop: hi==hi0 → hi-1 = 6; range(7,6,2) empty ✓. right edge i=7: x = V[6]+1 = 2, y = 2-7+6 = 1. snake: a[2]="b" vs b[1]="y" no. V[7]=2. trigger no. trace[1] = V[5:8] = [1,1,2].
d=2: lo0=4, hi0=8; klo=-1, khi=1 → lo=5, hi=7. lo != lo0? lo0=4, lo=5 → klo = d-2M = 2-6 = -4 < -d=-2 → klo=-2! Wait klo = max(-d, d-2M) = max(-2, -4) = -2. lo = -2+6 = 4 = lo0 ✓. khi = min(2, 6-2)=2 → hi = 8 = hi0 ✓. left edge i=4: x = V[5] = 1, y = 1-4+6 = 3. snake: y<3 no. V[4]=1. trigger: x≥3 no. int_lo = 6. interior stop = hi-1 = 7: range(6, 7, 2) → i=6: V[5]=1 < V[7]=2 → x = V[7] = 2, y = 2-6+6 = 2. snake: a[2]="b" == b[2]="b" → x=3, y=3; x<3 fails. V[6]=3. trigger: 3≥3 ✓ 3≥3 ✓ → d_found=2, k = i-off = 0 ✓.
Backtrack: d=2, k=0, x_end=3, y_end=3. p=1: klo_p = max(-1, 1-6) = -1; sl = trace[1] = [1,1,2] (diagonals -1,0,1). i1 = 0+1-(-1) = 2 → sl[2] = 2 (V_1[1]); i2 = -2 → sl[-2]?? i2 = k-1-klo_p = 0-1+1 = 0 → sl[0] = 1 (V_1[-1]). compare: sl[0]=1 < sl[2]=2 → ins: x_pre = sl[i1] = 2, y_pre = 2 - 0 = 2. snake: range(2, 1, -1) → i=2: ("=", a[2]) ✓. ins: ("+", b[y_pre-1]) = b[1] = "y" ✓. x_end=2, y_end=1, k=1, d=1. Next: p=0: klo_p = 0 (p-2M = -5 < 0); sl = trace[0] = [1]. k=1 == d=1 → x_pre = sl[k-1-klo_p] + 1 = sl[0]+1 = 2, ins=False. y_pre = 2-1 = 1. snake: range(x_end-1, x_pre-1, -1) = range(1, 1, -1) empty. del: ("-", a[x_pre-1]) = a[1] = "x" ✓. x_end=1, y_end=1, k=0, d=0. Final: ("=", a[0]) ✓. Reversed: =, -, +, = ✓ D=2 minimal ✓.

Now check a case exercising pruning: N=1, M=3: a=["a"], b=["a","b","c"]. D = 2. off=4.
d=0: klo = max(0, -6)=0, khi = min(0, 2)=0; lo=hi=4=lo0: left edge: x=V[5]=0,y=0; snake a[0]==b[0] → x=1,y=1; x<1 fails. V[4]=1. trigger x≥1 ✓ y=1≥3 no. trace[0]=[1].
d=1: lo0=3, hi0=5; klo = max(-1, 1-6) = -1; khi = min(1, 2-1=1) = 1. lo=3=lo0 ✓: i=3: x = V[4] = 1, y = 1-3+4 = 2. snake: x<1 fails. V[3]=1. trigger: x≥1 ✓, y=2≥3 no. int_lo=5. interior stop: hi=5=hi0 → stop=4 → empty. right edge i=5: x = V[4]+1 = 2 > N... x=2, y = 2-5+4 = 1. snake: x<1 fails. V[5]=2. trigger: x≥1 ✓ y=1≥3 no. trace[1] = V[3:6] = [1,1,2].
d=2: lo0=2, hi0=6; klo = max(-2, 2-6) = -2; khi = min(2, 0) = 0. lo=2=lo0 ✓: i=2: x = V[3] = 1, y = 1-2+4 = 3. snake: x<1 fails. V[2]=1. trigger: x≥1 ✓ y=3≥3 ✓ → d_found=2, k=-2 = N-M ✓.
Backtrack: d=2, k=-2, x_end=1, y_end=3. p=1: klo_p = max(-1, -5) = -1. sl = trace[1] = [1,1,2]. k == -d → x_pre = sl[k+1-klo_p] = sl[-2+1+1] = sl[0] = 1, ins=True. y_pre = 1-(-2) = 3. snake: range(0, 0, -1) empty. ins: ("+", b[y_pre-1]) = b[2] = "c" ✓. x_end=1, y_end=2, k=-1, d=1. p=0: klo_p = max(0, -6) = 0. sl = trace[0] = [1]. k=-1 == -d(1) ✓ → x_pre = sl[k+1-0] = sl[0] = 1, ins=True. y_pre = 1+1 = 2. snake: range(0,0,-1) empty. ins: ("+", b[1]) = "b" ✓. x_end=1, y_end=1, k=0, d=0. Final: range(0,0,-1) empty... x_end=1 → for i in range(0, 0, -1) → empty!! But we need ("=", a[0])! 

Bug? x_end=1, y_end=1 → snake from (0,0) to (1,1) → one "=" line. `for i in range(x_end - 1, -1, -1)` = range(0, -1, -1) = [0] ✓ → ("=", a[0]) ✓. range(0, -1, -1) includes 0 ✓. Phew ✓. (Earlier at p=1 y_end became 2: snake emit range(x_end-1, x_pre-1, -1) = range(0, 0, -1) empty ✓ correct since no matches there.)

Result reversed: [("+","c"),("+","b"),("=","a")] → =+? "=" and "-": [a] ✓; "=" and "+": [a,b,c] ✓. Minimal D=2 ✓.

Now — hmm, wait: in backtrack p=0 step: k=-1 == -d where d=1 ✓ ins branch: but forward at d=1, k=-1: iterated? klo_1 = -1 ✓ lo == lo0 ✓ forced ins ✓ consistent. ✓.

One more test — insertion before match with repeated lines: a=["x","a"], b=["a","a"]? LCS: ["a"] → L=1, D = 2+2-2 = 2. Expected script e.g. [("-","x"),("=","a"),("+","a")] or [("+","a"),("=","a"),("-",... no. N=2, M=2, off=4.
d=0: klo=khi=0; lo=hi=4: left edge: x=V[5]=0,y=0; snake: a[0]="x" vs b[0]="a" no. V[4]=0. trace[0]=[0].
d=1: lo0=3,hi0=5; klo=-1,khi=1. left i=3: x=V[4]=0, y=0-3+4=1. snake: a[0]="x" vs b[1