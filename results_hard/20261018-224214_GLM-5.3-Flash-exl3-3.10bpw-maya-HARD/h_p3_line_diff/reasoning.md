Implement Myers' algorithm. Standard version: greedily compute edit script with LCS via Myers O((N+M)D) using V array and storing V snapshots for backtracking, then reconstruct path.

For 1000 completely different lines, D = 2000, N+M = 2000, so O((N+M)D) = 4M — fine. For 20000 lines differing in ~50 places, D ~ 100, fine. Memory: storing V snapshot per d step: D * (D+1) ints ~ for D=2000 that's ~2M ints per... actually snapshots: each d step stores list of size 2D+1. Sum = O(D^2) = 4M ints — acceptable? For D=2000: sum over d of (2d+1) ≈ D^2 ≈ 4 million ints ≈ 32MB as Python ints in lists — heavy but okay-ish. Alternative: backtrack in reverse without storing snapshots, using the classic trick (Myers paper section): recompute forward from a known point, or use the linear-space divide-and-conquer. Simpler: store snapshots but limit memory. 4M Python ints in lists: each list of 2000 elements, 2000 lists → 4M * 8 bytes pointers = 32MB plus int objects (small ints cached up to 256; values up to 20000 not cached, but many are duplicates... ints up to N+M=2000, Python caches only -5..256). Could be ~100MB+ of int objects. Risky.

Better: linear-space Myers (divide and conquer middle snake). That's the standard solution and handles large inputs. Implement Myers "An O(ND) Difference Algorithm" with linear space refinement (the middle snake approach used in GNU diff).

Implement find_middle_snake(a, b) returning (x, y, u, v) endpoints of middle snake, then recursively diff.

Let me write it carefully.

Classic algorithm (from Myers paper, figure 8):

def shortest_edit(a, b): returns D (length of SES) and whether odd.

Middle snake:

def middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2
    delta = N - M
    odd = delta % 2 != 0
    # forward V indexed by k+offset, reverse Vf/Vr
    Vf = {1: 0}  # or arrays
    Vr = {delta-1... hmm.

Standard implementation with dicts keyed by k:

offset = N? Use arrays of size 2*max_d+1.

Let me write with dict for clarity; performance fine for these sizes? For 1000 totally different lines, recursion... D=2000, divide and conquer recursion depth could be large but each level does O((N+M)) work; total O((N+M)D). Fine.

Code:

def middle_snake(a, b, offset_f=..., ):
    N = len(a); M = len(b)
    delta = N - M
    odd = (delta % 2 != 0)
    max_d = (N + M + 1) // 2
    Vf = [0] * (2*max_d + 2)
    Vr = [0] * (2*max_d + 2)
    off = max_d  # index shift; k in [-max_d..max_d]
    Vf[off + 1] = 0  # x of k=1 is 0
    Vr[off + 1] = 0  # reverse k=1 x is 0 (means?)
    
Reverse: define reverse d-paths from (N,M) using k = x - y as well; Vr[k] = x such that furthest reaching reverse path... Standard: for reverse, Vr[k] gives the x coordinate of furthest reaching reverse path on diagonal k, and paths go from (N,M) to (0,0). Convention from the paper:

For forward: V[k] = furthest x on diagonal k.
Initialize V[1] = 0.
For d in 0..max_d:
  for k in -d..d step 2:
    if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]
    else: x = V[k-1] + 1
    y = x - k
    while x < N and y < M and a[x] == b[y]: x+=1; y+=1
    V[k] = x
    if odd and delta - (2*d - 1)... paper: if odd and k in [delta-(d-1), delta+(d-1)] and V[k] >= ... check overlap with reverse: reverse furthest reaching on diagonal k has x_r; if forward x >= reverse x (i.e., forward path reaches at or beyond reverse on same diagonal), snake found.
    
For reverse: process reverse paths starting at (N, M). Define Vr[k] = the x-coordinate such that the furthest reaching reverse path on diagonal k has reached from x down... Convention: reverse path on diagonal k, Vr[k] = x of furthest reaching (towards lower x,y) point; initialize Vr[1] = 0 with a shift meaning x = N? Let's use the paper's exact formulas:

Paper (Myers 1986, figure 8): 

V[1] = 0 for forward; for reverse, V[1] = 0 too but with delta added: The reverse algorithm:

for d in 0..ceil((delta)/2)+... Let me recall the standard implementation from the paper:

```
def middle_snake:
  N, M = len(a), len(b)
  delta = N - M
  odd = delta % 2
  Vf = {1: 0}
  Vr = {1: 0}
  for d in range(0, (N+M+1)//2 + 1):
      # forward
      for k in range(-d, d+1, 2):
          if k == -d or (k != d and Vf[k-1] < Vf[k+1]):
              x = Vf[k+1]
          else:
              x = Vf[k-1] + 1
          y = x - k
          x0, y0 = x, y
          while x < N and y < M and a[x] == b[y]:
              x += 1; y += 1
          Vf[k] = x
          if odd and (delta - (d - 1)) <= k <= (delta + (d - 1)):
              if x >= Vr[delta - k]:  # hmm sign
                  return 2*d - 1, x0, y0, x, y
      # reverse
      for k in range(-d, d+1, 2):
          kr = k + delta  # reverse diagonals offset
          if k == -d or (k != d and Vr[kr+1]... 
```

Hmm, let me use the well-known formulation where reverse Vr[k] stores x coordinate of furthest-reaching reverse path on diagonal k, computed as:

For reverse: we move from (N,M) toward (0,0). A reverse path on diagonal k (where k = x - y) reaches point (x, x-k). Initialize Vr[1] = 0 meaning... The trick: reverse furthest reaching on diagonal k: define Vr[k] = x value. In the paper, reverse step:

for k in -d..d step 2:
    if k == -d or (k != d and Vr[k+1] <= Vr[k-1])? Signs get confusing.

Alternative cleaner approach: implement reverse by mapping to coordinates relative to (N,M): let x' = N - x, y' = M - y, then reverse paths are forward paths in (x', y') space with diagonal k' = x' - y' = (N-M) - (x-y) = delta - k. And instead of matching a[x]==b[y] forward, we match a[x-1]==b[y-1] moving backward.

Many implementations do: reverse loop over k' in -d..d step 2 in primed coordinates, and store Vr[k'] as x' (primed). Overlap check: forward on diagonal k reaches x_f; reverse on diagonal k' = delta - k reaches x'_r = N - x_r. Overlap when x_f >= x_r, i.e., x_f >= N - x'_r... wait x_r = N - x'_r. Condition: Vf[k] >= N - Vr[delta - k]? Since x'_r = N - x_r → x_r = N - Vr[k'].

Hmm, but standard condition in the paper: "if odd and delta - (d-1) <= k <= delta + (d-1) and V[k] >= Vr[delta - k]". There Vr is in original coordinates? The paper's reverse V uses x measured from the end? Let me just derive carefully myself.

Let me define:

Forward: Vf[k] = max x reachable by a d-edit forward path ending on diagonal k, from (0,0). Standard.

Reverse: define Rr[k] = min x reachable by a d-edit reverse path ending on diagonal k, starting from (N, M), moving with deletions/insertions reversed. A reverse path on diagonal k: points (x, x-k). Reverse path of length d from (N,M): it consumes the suffix. Define via mirrored coordinates: x̃ = N - x, ỹ = M - y. Then a reverse d-path in original space = a forward d-path in mirrored space from (0,0) to diagonal k̃ = delta - k, with sequence a_reversed and b_reversed. So Rr (as min x on diagonal k in original space) = N - Vf_mirror[k̃] where Vf_mirror is furthest x̃ on diagonal k̃ with strings reversed.

But easier: implement directly. Reverse furthest reaching: Vr[k] = min x on diagonal k reachable by reverse d-path. Recurrence: for k from -d+delta... hmm, reverse paths in original coordinates: k ranges over delta-d .. delta+d. Let me just work in mirrored coordinates throughout for the reverse half, using reversed strings. That's clean:

ra = a[::-1], rb = b[::-1]. Reverse path with d edits from (N,M) on diagonal k (original) ↔ forward path with d edits on diagonal k̃ = delta - k in mirrored space. Furthest reaching mirrored point (x̃, ỹ) on diagonal k̃ corresponds to original point (N - x̃, M - ỹ), and the snake in original space goes from (N - x̃_end_of_snake ... hmm we need the snake boundaries.

Overlap condition: forward d_f-path on diagonal k reaches (x_f, y_f); reverse d_r-path on same diagonal k reaches down to (x_r, y_r) with x_r = min x. They overlap when x_f >= x_r. Total D = d_f + d_r. If D is odd, D = 2d-1 where d_f = d-1, d_r = d... or some split. In the paper, the check happens during forward step d with reverse paths of length d-1 when D is odd, and during reverse step d with forward paths of length d when D is even.

Let me follow the paper structure precisely but with my own coordinates, and return the snake endpoints (x_start, y_start, x_end, y_end) in original coordinates. Then the LCS edit script: recurse on prefix a[:x_start] vs b[:y_start] and suffix a[x_end:] vs b[y_end:], and the middle snake yields "=" items for the overlapping matched region plus the edit at the middle? Actually the middle snake is a run of diagonal moves; within a snake all moves are "="; the edit script decomposition: diff(prefix) + ["=" for each line in the snake] + diff(suffix)? Hmm, careful: the snake endpoints — the snake may include... Actually the standard approach: the middle snake goes from (x, y) to (u, v) along a diagonal (u-x == v-y), all matches. Then edit script = diff(a[:x], b[:y]) + ["="]* (u-x) + diff(a[u:], b[v:]). Wait but the snake could be preceded/followed by edits in prefix/suffix recursions which handle them. But is the snake guaranteed to be all matches? Yes, a "snake" is a maximal run of non-diagonal... in Myers, a snake is a sequence of moves following a diagonal (all matches). Yes.

But careful: the middle snake found via overlap check — the forward path and reverse path overlap on the diagonal; the overlapping region is the snake. The snake in original coordinates: forward furthest reaching point (x_f, y_f) on diagonal k with forward d_f-path; reverse path reaches down to (x_r, y_r) on same diagonal with x_r <= x_f. The overlap: points on diagonal k from x_r to x_f are in both. But the snake reported should be the full snake containing the overlap? The standard result (paper lemma): the middle snake is the snake containing the overlap, and it's returned with its endpoints. In the paper's implementation, when overlap is detected at forward point (x,y) reached after extending from (x0,y0) — the snake is (x0,y0)→(x,y)? Not exactly; the overlap check: if forward x >= reverse x on the same diagonal, then the snake from the reverse side... The paper says: return the snake (x, y, u, v) where (x,y) is the start (upper-left end) and (u,v) the end.

To keep it simple and correct, many implementations (e.g., the well-known "myers diff in ~40 lines" by James Coglan, or the one in various repos) do this:

Use the formulation with reverse V in original coordinates:

Vr[k] for k in delta-d..delta+d: the paper's reverse algorithm:
  Vr[1] = 0 (with offset meaning x measured backwards?) 

Let me look at the classic implementation from "Myers algorithm" Wikipedia / common code:

```python
def shortest_middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2
    delta = N - M
    odd = delta % 2 != 0
    # V arrays indexed with offset
    Vf = [0] * (2 * max_d + 2)
    Vr = [0] * (2 * max_d + 2)
    off = max_d
    for d in range(max_d + 1):
        # forward
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and Vf[off + k - 1] < Vf[off + k + 1]):
                x = Vf[off + k + 1]
            else:
                x = Vf[off + k - 1] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1; y += 1
            Vf[off + k] = x
            if odd and delta - (d - 1) <= k <= delta + (d - 1):
                if Vf[off + k] + Vr[off + delta - k] >= N:
                    # snake found: from (x_start, y_start) to (x, y)
                    ...
        # reverse
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and Vr[off + k - 1] < Vr[off + k + 1]):
                xr = Vr[off + k + 1]
            else:
                xr = Vr[off + k - 1] + 1
            yr = xr - k
            while xr < N and yr < M and a[N - xr - 1] == b[M - yr - 1]:
                xr += 1; yr += 1
            Vr[off + k] = xr
            if not odd and -delta - d <= k <= -delta + d ... 
```

Hmm, this "reverse with xr from 0 counting backwards" version: reverse path measured in reversed coordinates; Vr[k] here is x̃ (mirrored x). Diagonal in mirrored space k̃ = x̃ - ỹ. Original diagonal k_orig = delta - k̃. Overlap check for even D during reverse step d: check against forward paths of length d: forward on original diagonal k_orig = delta - k̃ reaches x_f; condition x_f >= N - x̃_r i.e. x_f + x̃_r >= N. And k_orig = delta - k̃. In the code above during reverse step on mirrored diagonal k (k̃ = k), check if not odd and Vr[off+k] + Vf[off + delta - k] >= N.

Wait sign conventions: mirrored diagonal k̃, original diagonal k_orig = delta - k̃. Forward V indexed by k_orig. So condition: Vf[off + (delta - k̃)] + Vr[off + k̃] >= N.

And for the forward check with odd D: during forward step d, check against reverse paths of length d-1 (already computed in previous iteration). Reverse mirrored diagonal k̃ = delta - k_orig. Condition: Vf[off + k] >= N - Vr[off + (delta - k)], i.e., Vf[off+k] + Vr[off + delta - k] >= N.

Snake endpoints: When detected in forward step at point (x, y) (original coords) reached after extending from (x0, y0): the snake... The reverse path of length d-1 reaches mirrored point with x̃_r, original point (N - x̃_r, M - ỹ_r). The overlap region on diagonal k_orig is from x_r = N - x̃_r to x_f. The middle snake: it's the snake containing this overlap. Since the forward path just traversed from (x0,y0) to (x,y) along the diagonal (the while loop extension), and reverse path similarly, the overlap is within these extensions. The snake containing the overlap: it extends maximally in both directions, but for correctness of the recursion we just need a snake on the middle diagonal such that prefix+snake+suffix forms a valid D-length path. Actually we need: the snake endpoints (x_s, y_s) and (x_e, y_e) with x_e - x_s == y_e - y_s >= overlap... The safe choice: take the snake to be the overlap region itself: from (x_r, x_r - k) to (x_f, x_f - k)? But is the overlap region contiguous matches? Points from x_r to x_f on diagonal k: a[x] == b[x - k] for all x in [x_r, x_f]? Forward path extension guarantees matches from (x0,y0) to (x_f,y_f) — contiguous matches ending at x_f. Similarly reverse extension gives contiguous matches from x_r up to its start... reverse path in mirrored space extends matches from mirrored (x̃0, ỹ0) to (x̃_r, ỹ_r); in original coords, matches from (N-x̃_r, ...) backwards... The reverse path consumed matches a[N - x̃ - 1] == b[M - ỹ - 1] for x̃ from x̃0 to x̃_r, meaning original indices from N - x̃_r - 1... hmm wait: xr starts at xr0 and increments while matching a[N - xr - 1] == b[M - yr - 1]. So matches at original positions N - xr - 1 for xr in (xr0 .. xr_end - 1)? Let me redo: when xr = value v (before increment), it checks a[N - v - 1]. After the loop, xr = x̃_r. The matched original positions are N - v - 1 for v = xr0, ..., x̃_r - 1, i.e., original positions N - x̃_r, ..., N - xr0 - 1. So the reverse path's matches span original x from N - x̃_r to N - xr0 - 1, contiguous. So reverse path reaches down to original point (N - x̃_r, M - ỹ_r)? Hmm, actually the reverse path endpoint (furthest reaching in mirrored = deepest into original) is at original coordinates (N - x̃_r, M - ỹ_r)?? No wait — mirrored furthest reaching point (x̃_r, ỹ_r) corresponds to original point (N - x̃_r, M - ỹ_r), and the matches are at positions... hmm, the snake endpoints vs matched positions: in forward, path from (x0,y0) extends matching a[x0], a[x0+1], ..., reaching (x,y); matched positions x0..x-1. The point (x,y) is the endpoint after matches.

In reverse with mirrored coords: mirrored path from (x̃0, ỹ0) extends matching ra[x̃0] = a[N-1-x̃0], reaching mirrored (x̃_r, ỹ_r). In original, matched positions: a[N-1-x̃] for x̃ = x̃0..x̃_r-1, i.e., original positions N - x̃_r, ..., N - 1 - x̃0. And the corresponding original endpoint: original point (N - x̃_r, M - ỹ_r).

Hmm, note the correspondence: original point (px, py) ↔ mirrored (N - px, M - py). A snake in original from (s, s-k) to (e, e-k) with matches at positions s..e-1 ↔ mirrored snake from (N - e, M - e + k̃) to (N - s, M - s + k̃) with mirrored matches... consistent.

So: overlap condition x_f + x̃_r >= N where x_f is forward furthest reach (original) on original diagonal k_orig = delta - k̃, and reverse reaches original point (N - x̃_r, ...). Overlap when forward x_f >= reverse original x = N - x̃_r.

Now the middle snake: the paper proves the snake containing the overlap has its endpoints. For our purposes (producing a valid edit script), we can take the snake as: from (max stuff)... Simplest correct choice: the snake = the segment of the diagonal from the reverse path's furthest original point to the forward furthest point? Both are on diagonal k_orig, contiguous matches? Forward matches: positions x0..x_f-1 (contiguous, ending at x_f). Reverse matches: positions N - x̃_r .. N - xr0 - 1 (contiguous, starting at N - x̃_r). Overlap region [N - x̃_r, x_f] is contiguous matches (since forward matches cover [x0, x_f-1] ⊇ up to x_f-1 ≥ N - x̃_r when overlap, and reverse covers [N-x̃_r, ...]). Take snake from (N - x̃_r, N - x̃_r - k_orig) to (x_f, x_f - k_orig). But wait — is the length of this snake ≥ 1? If x_f == N - x̃_r, snake length 0, which breaks recursion. Hmm. But the overlap condition x_f >= N - x̃_r with equality... In the paper, the detected snake always has positive length because the paths overlap within snakes. Hmm, actually with equality the overlap is a single point which is the endpoint of the forward snake and the start of the reverse snake — the middle snake would be a different snake. Hmm.

Let me think again. The classical result: when a forward furthest-reaching path on diagonal k overlaps a reverse furthest-reaching path on the same diagonal, the overlap lies within a single snake, and that snake is the "middle snake". The overlap point: forward path is at point P_f = (x_f, y_f) (after matches), the last match was at (x_f - 1, y_f - 1). Reverse path endpoint P_r = (N - x̃_r, M - ỹ_r) (original), and its matches are at positions N - x̃_r .. N - xr0 - 1 (in original a coordinates), so the reverse path "covers" from P_r onward along diagonal. Overlap condition: x_f >= N - x̃_r means forward endpoint at or past reverse endpoint.

Hmm, but if x_f == N - x̃_r: forward path's matches end at position x_f - 1; reverse path's matches start at position N - x̃_r = x_f. So they don't actually share matched positions; they're adjacent. Then the middle snake... the paper's algorithm returns the snake from the forward extension: (x0, y0) to (x_f, y_f)? Hmm, but that snake ends exactly at the reverse path start; then prefix = a[:x0], suffix = a[x_f:], and the snake = matches x0..x_f-1. Total path: forward d_f-path to (x0,y0)? No wait — the forward path reaching (x0, y0) before the final snake has d_f edits; then snake to (x_f, y_f); then reverse path from (x_f, y_f)?? The reverse path endpoint is (N - x̃_r, M - ỹ_r) = (x_f, y_f). Yes! So the full path: forward d_f-path → snake → (x_f,y_f) → reverse path of d_r edits. But hold on, the reverse path from (x_f, y_f): its matches were at positions ≥ x_f... wait I said reverse matches at positions N - x̃_r .. N - xr0 - 1 = x_f .. ..., so the reverse path's matched segment starts at x_f. But a path point at (x_f, y_f) with matches starting at x_f means... the reverse path from (x_f, y_f): next move either edit (consuming a[x_f] or b[y_f]) or match a[x_f]==b[y_f]. But the reverse matches are at original positions x_f .. N - xr0 - 1, meaning those chars are matched, at positions x_f, x_f+1, .... So the reverse path includes matches at x_f onward. Fine: the decomposition diff(a[:x0], b[:y0]) + ["=" for a[x0:x_f]] + diff(a[x_f:], b[y_f:]) — the suffix recursion will find the reverse path's script. Valid.

But is snake length positive? x_f - x0 > 0? The forward extension loop: if no matches (a[x0] != b[y0] immediately), snake length 0 and x_f == x0 == point reached by the d_f-path. Then decomposition: prefix recursion handles a[:x0], snake empty, suffix from (x0, y0). Total edits = d_f + d_r = D still? The middle snake in this case: hmm, when overlap detected, does the forward snake always have positive length? Not necessarily. But the paper's theorem: the overlap point lies within a snake of the combined path, and specifically the snake returned is the one containing the overlap. If x_f == N - x̃_r (adjacent, no shared match), the overlap is a point which is the boundary... Hmm.

Actually, let me reconsider: maybe the correct condition/interpretation: overlap means the forward and reverse paths share at least one point, i.e., forward path passes through point (N - x̃_r, ...) or beyond, and since both are on the same diagonal, "x_f >= N - x̃_r" is shared-point condition including equality (the point (x_f, y_f) is on the reverse path as its endpoint). The middle snake: the paper returns the snake that contains the overlap point. If the overlap point is (x_f, y_f) which is the forward path endpoint (after its snake) and the reverse path's start... hmm, the reverse path's "start" in original coordinates is (N, M), and it travels down; its endpoint is (x_f, y_f)? No — the reverse path endpoint in original coordinates is (N - x̃_r, M - ỹ_r) = the furthest point it reached (deepest into the sequences from the end). Points on the reverse path: from (N, M) down to (N - x̃_r, M - ỹ_r). So (x_f, y_f) is on the reverse path. Is it inside a snake of the reverse path or at a snake boundary? The reverse path's matches (in original) at positions x_f ... wait no. Let me recompute: reverse matches at original positions N - x̃_r .. N - xr0 - 1 where xr0 < x̃_r. Hmm wait that gives matches from position N - x̃_r up to N - xr0 - 1. And the reverse path endpoint (deepest) is (N - x̃_r, ...). Hmm, that seems off: a reverse path endpoint (N - x̃_r, M - ỹ_r) with matches at positions ≥ N - x̃_r?? The path goes from (N,M) down to (N - x̃_r, M - ỹ_r); along the way it matches characters at positions between N - x̃_r and N - 1. The deepest point (N - x̃_r, ...) is the start of the last snake? Let me re-derive with mirrored picture.

Mirrored: forward path in mirrored space from (0,0), matches ra[x̃0..x̃_r-1], endpoint (x̃_r, ỹ_r). In original: endpoint (N - x̃_r, M - ỹ_r), matches at original positions N - 1 - x̃0 down to N - x̃_r... i.e., positions N - x̃_r .. N - 1 - x̃0 (as x̃ increases from x̃0 to x̃_r - 1). So the reverse path in original: from (N, M), matches at positions N - x̃_r, ..., N - 1 - x̃0 — these are the last snake? No — the matches from x̃0 to x̃_r - 1 are the final extension in mirrored, which in original is the first snake encountered coming from the end: positions N - x̃_r up to N - 1 - x̃0? Hmm wait: mirrored extension starts at x̃0 and goes to x̃_r. Original positions matched: for x̃ in [x̃0, x̃_r), position N - 1 - x̃ ranges from N - 1 - x̃0 down to N - x̃_r. So yes, matches at positions [N - x̃_r, N - 1 - x̃0], contiguous, and the reverse path endpoint (deepest original point) is (N - x̃_r, M - ỹ_r)?? But the matched position N - x̃_r is matched by... the path point before matching position N - x̃_r would be at (N - x̃_r - ... hmm I'm confusing positions with points.

Let me set it straight with mirrored coordinates directly, then translate. Mirrored strings ra = a reversed, rb = b reversed. A mirrored forward path: furthest reaching (x̃, ỹ) on diagonal k̃ with d edits. Translate to original: point (N - x̃, M - ỹ). Mirrored diagonal k̃ = x̃ - ỹ. Original diagonal: (N - x̃) - (M - ỹ) = delta - k̃. Good.

Now, in mirrored space, run the standard forward algorithm with ra, rb. Furthest reaching (x̃, ỹ) on diagonal k̃: matches at mirrored positions x̃0..x̃-1. Original matched positions: N - 1 - x̃0 down to N - x̃. So original matched positions [N - x̃, N - 1 - x̃0]. The original path: starts (N, M); the moves reversed: the mirrored path reversed is the original reverse path. Mirrored path: edits then snake (matches at mirrored x̃0..x̃-1), endpoint (x̃,ỹ). Original path (reading from (N,M)): snake first (matches at original positions N - x̃ .. N - 1 - x̃0), reaching point (N - x̃0, M - ỹ0), then edits down to (N - x̃, M - ỹ)? Hmm wait. Original path from (N,M): the first segment corresponds to mirrored last segment. Mirrored last segment is the snake from (x̃0, ỹ0) to (x̃, ỹ). Original: from (N - x̃0, M - ỹ0) to (N - x̃, M - ỹ), moving backward along diagonal (matching). So original reverse path: (N,M) → [edits, d of them] → (N - x̃0, M - ỹ0) → [snake backward] → (N - x̃, M - ỹ). The deepest original point reached is (N - x̃, M - ỹ). Matches at original positions N - x̃ .. N - 1 - x̃0 — these are the characters between the two endpoints along the diagonal: from point (N - x̃0, ...) going back to (N - x̃, ...), matched chars a[N - x̃], ..., a[N - x̃0 - 1]. Yes consistent.

So: reverse path endpoint original = (N - x̃_r, M - ỹ_r) where (x̃_r, ỹ_r) is mirrored furthest reach. Reverse matches occupy original positions [N - x̃_r, N - 1 - x̃0_r].

Forward path endpoint (x_f, y_f), matches at [x0_f, x_f - 1].

Overlap: x_f >= N - x̃_r. Shared matched positions exist iff x_f - 1 >= N - x̃_r i.e. x_f > N - x̃_r, i.e., strict. If equality, no shared match but paths share point (x_f, y_f) = (N - x̃_r, M - ỹ_r).

Case equality: forward path endpoint = reverse path endpoint = point P. Forward path: ... snake ending at P (last match at P - (1,1)); reverse path from P: first moves are edits (since its matches start at position N - x̃_r = x_f... wait reverse matches at [N - x̃_r, N - 1 - x̃0_r] = [x_f, ...] — matches at position x_f means the match of a[x_f] with b[y_f]?? But the point P = (x_f, y_f) and matching a[x_f] would take the path from (x_f, y_f) to (x_f+1, y_f+1). Hmm, but I said the reverse path's snake goes from (N - x̃0, ...) back to (N - x̃, ...). The snake endpoints: (N - x̃_r, M - ỹ_r) and (N - x̃0_r, M - ỹ0_r), matched chars a[N - x̃_r .. N - x̃0_r - 1]. So from point (N - x̃_r, M - ỹ_r), moving backward... no wait, the snake in the original path: the path visits (N - x̃_r, M - ỹ_r) then... path order: (N, M) → edits → (N - x̃0_r, M - ỹ0_r) → snake backward → (N - x̃_r, M - ỹ_r). So the snake consumes chars a[N - x̃_r] ... a[N - x̃0_r - 1]? The snake from (N - x̃0_r, M - ỹ0_r) to (N - x̃_r, M - ỹ_r): matched chars are those at positions from N - x̃_r to N - x̃0_r - 1. Hmm, but the path moves from (N - x̃0_r, M - ỹ0_r) backward to (N - x̃_r, M - ỹ_r); along a diagonal, matching a[p] == b[p - k] for p in [N - x̃_r, N - x̃0_r - 1]. The point (N - x̃0_r, M - ỹ0_r) is at position N - x̃0_r; after matching a[N - x̃0_r - 1]... hmm the point coordinates: point (px, py) means we've consumed a[0..px-1], b[0..py-1]. Snake from (px1, py1) to (px2, py2) with px2 > px1: matches a[px1..px2-1]. In reverse direction (from (px2,py2) to (px1,py1)) same matched chars.

So reverse path: endpoint (deepest) = (N - x̃_r, M - ỹ_r), and the snake adjacent to the endpoint? The snake spans points from (N - x̃0_r, ...) down to (N - x̃_r, ...). Since x̃0_r < x̃_r, N - x̃0_r > N - x̃_r. So the snake spans original x from N - x̃_r to N - x̃0_r, with endpoint (deepest) at N - x̃_r. So the deepest point is the START of that snake (the snake's lower end). OK so reverse path: (N,M) → d_r edits → point (N - x̃0_r, M - ỹ0_r)?? No wait — mirrored path: edits first, then snake. Mirrored edits take (0,0) → (x̃0_r, ỹ0_r); snake (x̃0_r, ỹ0_r) → (x̃_r, ỹ_r). Original reversed: snake first reversed: (N - x̃0_r, ...) → (N - x̃_r, ...), then edits reversed: (N - x̃_r, ...) → (N, M). Hmm, that ordering: original path from (N, M): first the edits (reversed), reaching (N - x̃_r, M - ỹ_r), then the snake backward up to (N - x̃0_r, M - ỹ0_r). Wait that contradicts what I said before. Let me redo: mirrored path P_m: (0,0) →edits→ (x̃0,ỹ0) →snake→ (x̃,ỹ). The original reverse path is the reverse of the mirrored path mapped: original path visits mapped points in reverse order: mapped(x̃,ỹ) = (N - x̃, M - ỹ) first, then mapped(x̃0,ỹ0), then (N, M). So original path: (N - x̃, M - ỹ) →snake backward→ (N - x̃0, M - ỹ0) →edits backward→ (N, M). Reading forward from (N,M) to (N - x̃, M - ỹ): edits first (from (N,M) down to (N - x̃0, M - ỹ0)), then snake from (N - x̃0, ...) down to (N - x̃, ...). Matches a[N - x̃ .. N - x̃0 - 1]. Deepest point (N - x̃, M - ỹ) is the END of the snake. Good, that makes more sense.

So reverse path endpoint R_end = (N - x̃_r, M - ỹ_r), and its matches include position N - x̃_r (the char at the endpoint position, matched as the last... the snake from (N - x̃0, ...) to (N - x̃_r, ...): matches a[N - x̃_r], ..., hmm matches are a[px1..px2-1] where px1 = N - x̃0, px2 = N - x̃_r?? px2 < px1 here. Ugh, snake going down: from (N - x̃0, ỹ...) to (N - x̃_r, ...), consuming chars going down: a[N - x̃0 - 1]? Hmm, wait. Path from (N,M) moving down consumes suffix. Point (px, py): consumed a[0..px-1]. Reverse path from (N, M): each edit removes one char from the end. Point after edits (N - x̃0, M - ỹ0): consumed a[0..N-x̃0-1], remaining suffix a[N - x̃0..N-1] = ra[0..x̃0-1]. Then snake matching: matches a[N - x̃0 - ... hmm. From point (N - x̃0, M - ỹ0), the next match would be a[N - x̃0] == b[M - ỹ0] — moving forward (in original direction) to (N - x̃0 + 1, ...). But the reverse path should move toward (0,0)! 

I think I messed up the mapping. Let me redo: mirrored coordinates x̃ counts consumption of ra (= reversed a). Mirrored point (x̃, ỹ): consumed ra[0..x̃-1] = a[N-1..N-x̃], i.e., original consumed a[N - x̃..N-1], original point (N - x̃, M - ỹ) meaning consumed a[0..N-x̃-1]. Consistent.

Mirrored path: (0,0) →(edits)→ (x̃0,ỹ0) →(snake)→ (x̃_r, ỹ_r). Original points: (N,M) [= mirrored (0,0)], then after edits mirrored (x̃0,ỹ0) = original (N - x̃0, M - ỹ0), then snake to mirrored (x̃_r, ỹ_r) = original (N - x̃_r, M - ỹ_r). So original path from (N,M): edits first, reaching (N - x̃0, M - ỹ0) — consumed from the end: the edits remove a[N-1], a[N-2], ..., matching mirrored consumption of ra[0..x̃0-1]. Then the snake: mirrored matches ra[x̃0..x̃_r-1] = a[N - x̃_r .. N - 1 - x̃0]. Original snake from point (N - x̃0, M - ỹ0) going DOWN (toward (0,0)) matching a[N - x̃0 - 1] == b[M - ỹ0 - 1]? Check: mirrored match ra[x̃0] = a[N - 1 - x̃0]. Original point (N - x̃0, M - ỹ0) means consumed a[0..N-x̃0-1]; next original char a[N - x̃0 - 1]. Yes: a[N - x̃0 - 1] = ra[x̃0]. ✓. So snake goes from point (N - x̃0, ỹ0) down to point (N - x̃_r, ỹ_r), matching a[N - x̃0 - 1], ..., a[N - x̃_r]. So matched original positions [N - x̃_r, N - x̃0 - 1]. Deepest endpoint (N - x̃_r, M - ỹ_r). ✓ matches what I had two paragraphs ago. Good.

So reverse path: (N,M) → d_r edits → (N - x̃0, M - ỹ0) → snake down → (N - x̃_r, M - ỹ_r). Matches occupy [N - x̃_r, N - x̃0 - 1].

Forward path: (0,0) → d_f edits → (x0, y0) → snake → (x_f, y_f). Matches [x0, x_f - 1].

Overlap of matched positions: [x0, x_f - 1] ∩ [N - x̃_r, N - x̃0_r - 1] nonempty iff x_f - 1 >= N - x̃_r and N - x̃0_r - 1 >= x0. The paper's condition x_f + x̃_r >= N gives x_f >= N - x̃_r; if equality, no shared matched char, but paths share the point (x_f, y_f) = (N - x̃_r, M - ỹ_r) — the forward path's endpoint equals the reverse path's deepest endpoint. In that case: full path = forward path + reverse path, sharing point P. Total edits d_f + d_r = D. The middle snake for recursion: we can take the forward snake (x0,y0)→(x_f,y_f) if nonempty, else the reverse snake. If both snakes empty (x_f == x0 and N - x̃_r == N - x̃0_r, i.e., both extensions matched nothing): then forward path endpoint (x0,y0) after d_f edits, reverse path endpoint same point after d_r edits, D = d_f + d_r. Snake empty: recursion diff(a[:x0], b[:y0]) + [] + diff(a[x0:], b[y0:]) — but wait, we need the decomposition to be valid: prefix script (d_f edits) + suffix script (d_r edits) — but the suffix recursion starting at (x0, y0) — is there a path of length d_r from (x0,y0) to (N,M)? The reverse path from (x0,y0) to (N,M) has d_r edits. Yes valid. But then does the recursion terminate properly? The divide and conquer needs progress: prefix problem a[:x0] vs b[:y0] with d_f < D edits, suffix with d_r < D. Fine as long as x0+... hmm, but if snake is empty and we recurse on (a[:x0], b[:y0]) and (a[x_f:], b[y_f:]) with x_f == x0, both subproblems are strictly smaller edit distance, so recursion terminates. Standard concern: middle snake must have length ≥ 1 to guarantee halving; but termination is still guaranteed since D strictly decreases on both sides (d_f < D and d_r < D because both ≥ ... hmm, d_f could equal D? No: D = d_f + d_r, and the overlap ensures d_f, d_r ≤ ceil(D/2)-ish. Actually with the paper's checks, d_f and d_r are both ≈ D/2, both < D when D ≥ 1. Since D ≥ 1, one of them... if D = 1: forward check at d=1 (odd D, delta...): hmm. Let's just make sure base cases: if not a and not b → []; if one empty → all +/-; if a == b trivially handled by algorithm anyway.

Actually, there's subtlety: if snake empty and we split into (x0,y0) and (x0,y0), total = d_f + d_r and both subproblems have strictly smaller D — fine.

But wait, there's a correctness requirement from the paper: the middle snake must be chosen such that prefix path length = ceil(D/2) or floor, ensuring O(ND) total. If we pick a slightly different snake (still on a valid D path), total complexity might degrade but correctness holds. For our performance constraints: worst case 1000 vs 1000 completely different, D=2000. Even naive O(ND) full-matrix is 10^6 cells — trivial. Actually for these constraints, even storing all V snapshots is fine! D=2000 worst case: snapshots sum ≈ D^2 = 4·10^6 ints. Hmm, that's the concern about memory but 4M small ints in lists ≈ 4M × 8 bytes pointer + int objects. Ints are values up to 2000 (N+M=2000... wait N=M=1000, values up to 1000). Python caches ints -5..256; larger ints are separate objects 28 bytes each but many duplicates? Not shared automatically. Worst case ~4M distinct int objects... actually values repeat a lot across snapshots. 4M × (8 + 28) ≈ 144MB worst case. Too risky.

Alternative: simple non-linear-space approach with bounded memory: use the forward-only Myers with snapshots but store V as arrays of... Or use Hirschberg-like linear space. Or simpler: since worst realistic case per the problem is 1000×1000 fully different (D=2000, N=M=1000), O(N·M) DP = 10^6 — trivially fast and we can backtrack with O(N·M) memory = 10^6 cells. But we don't know D in advance; could compute D via Myers first (cheap), then decide: if D is small relative to N+M, use snapshot backtracking (memory O(D²)); else use DP O(NM). Hmm, D=2000, N=M=1000: DP table 1001×1001 ints — 10^6, fine as list of lists (~8MB pointers + shared small ints... values up to 2000, many distinct objects; 10^6 × 28 bytes worst = 28MB + lists 8MB — acceptable). And for 20000 lines differing in 50 places: D≈100, snapshots O(D²)=10^4 — tiny.

But mixing two algorithms is more code. Alternatively implement linear-space Myers properly — it's the "right" answer and handles all cases uniformly. Let me just implement linear-space Myers carefully. It's the standard solution; I'll be careful.

Actually, let me reconsider the snapshot approach more carefully with memory optimization: store V snapshots as lists; but we can backtrack without storing all snapshots using the "forward to find D, then recompute" trick? The classic alternative: store per-d only... no.

Alternative simpler correct approach: forward Myers computing D (O((N+M)D) time, O(D) memory... wait O(N+M) for V array... V has size 2·max_d+1 where max_d ≤ (N+M+1)/2, so O(N+M)). Then reconstruct the path greedily backward without snapshots: from d = D down to 1, we know V[k] for d-1 can be recomputed... The known technique: to backtrack from (x,y) at step d, we need V_{d-1}; we can recompute V_{d-1} from scratch (running forward Myers up to d-1) — that's O(D) recomputations × O((N+M)D) each = O((N+M)D²) — too slow for D=2000 (4·10^9). No.

OK, linear-space Myers it is. Let me write it based on the paper's figure 8, adapted, and test the logic mentally.

Paper's algorithm (I'll reconstruct from memory of the standard formulation):

```
def middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2
    delta = N - M
    odd = delta % 2 == 1
    # Vf: forward, indexed by k + offset; Vf[k] = furthest x on diagonal k
    # Vr: reverse, in MIRRORED coordinates: Vr[k] = furthest x̃ on mirrored diagonal k̃ = k
    size = 2 * max_d + 2
    Vf = [0] * size
    Vr = [0] * size
    off = max_d + 1  # safe offset
    Vf[off + 1] = 0
    Vr[off + 1] = 0
    for d in range(max_d + 1):
        # forward step
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and Vf[off + k - 1] < Vf[off + k + 1]):
                x = Vf[off + k + 1]
            else:
                x = Vf[off + k - 1] + 1
            y = x - k
            x0, y0 = x, y
            while x < N and y < M and a[x] == b[y]:
                x += 1; y += 1
            Vf[off + k] = x
            if odd and delta - (d - 1) <= k <= delta + (d - 1):
                if Vf[off + k] + Vr[off + delta - k] >= N:
                    # overlap: return snake (x0,y0)-(x,y) and D=2d-1
                    return 2*d - 1, x0, y0, x, y
        # reverse step (mirrored coords, reversed strings)
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and Vr[off + k - 1] < Vr[off + k + 1]):
                x̃ = Vr[off + k + 1]
            else:
                x̃ = Vr[off + k - 1] + 1
            ỹ = x̃ - k
            x̃0 = x̃
            while x̃ < N and ỹ < M and a[N - 1 - x̃] == b[M - 1 - ỹ]:
                x̃ += 1; ỹ += 1
            Vr[off + k] = x̃
            if not odd and -delta - d <= k <= -delta + d:   # check range
                if Vr[off + k] + Vf[off + delta - k] >= N:
                    # overlap found in reverse step; D = 2d
                    # snake: in original coords from (N - x̃, ...) to ... 
                    return 2*d, ..., ...
    # shouldn't reach here
```

Wait — need to double check the k-range conditions and the reverse-overlap mapping, and how to get the snake endpoints in the reverse case.

Reverse overlap condition: reverse path (mirrored) on diagonal k̃ = k reaches original point (N - x̃_r, M - ỹ_r). Forward path on original diagonal k_orig = delta - k reaches (x_f, y_f). Overlap iff x_f >= N - x̃_r, i.e., Vf[off + (delta - k)] >= N - Vr[off + k], i.e., Vf[off + delta - k] + Vr[off + k] >= N. ✓ (matches code above).

For the forward overlap check at forward diagonal k (original): reverse paths computed so far have length d-1 (from previous iteration) — mirrored diagonals k̃ ∈ [-(d-1), d-1]; the relevant reverse path is on mirrored diagonal k̃ = delta - k_orig. Condition k̃ in range: -(d-1) <= delta - k <= d-1 ⟺ delta - (d-1) <= k <= delta + (d-1). ✓ matches code.

For reverse overlap check at reverse step d: forward paths computed have length up to d (computed in same iteration). Relevant forward path on original diagonal k_orig = delta - k̃. Its range: |k_orig| <= d ⟺ |delta - k| <= d ⟺ -delta - d <= k <= -delta + d... let's verify: delta - k <= d ⟺ k >= delta - d; delta - k >= -d ⟺ k <= delta + d. So range [delta - d, delta + d]. Hmm, I wrote "-delta - d <= k <= -delta + d" — that's wrong sign? Let me recheck: k_orig = delta - k̃, need |delta - k̃| <= d. So delta - d <= k̃ <= delta + d. So the code should check `delta - d <= k <= delta + d`. Hmm, but in the paper, the condition is written as "-delta - d <= k <= -delta + d" because the paper's reverse V is indexed by original-ish diagonals... In the paper (figure 8), they use a single index space where reverse paths are on diagonals k but measured differently. Since I'm doing mirrored coords, I derive conditions myself: forward check needs delta - (d-1) <= k <= delta + (d-1) where k is original diagonal; reverse check needs delta - d <= k̃ <= delta + d where k̃ is mirrored diagonal.

Hmm wait, but also for the forward check: reverse paths of length d-1 exist on mirrored diagonals |k̃| <= d-1, need k̃ = delta - k ∈ [-(d-1), d-1] ⟹ k ∈ [delta - (d-1), delta + (d-1)]. ✓.

Snake endpoints for reverse-detected overlap (D even = 2d): reverse mirrored path on diagonal k̃=k: furthest (x̃, ỹ), matches mirrored [x̃0, x̃-1] = original positions [N - x̃, N - x̃0 - 1], deepest original point (N - x̃, M - ỹ). Forward path on original diagonal k_orig = delta - k: furthest (x_f, y_f), matches [x0_f, x_f - 1]. Overlap point condition x_f >= N - x̃. Combined valid path: forward path → snake → reverse path. The shared/overlapping region on diagonal k_orig: from x_r_orig = N - x̃_r to x_f. Both endpoints are on the diagonal; the matched region of forward covers up to x_f - 1, reverse covers from N - x̃_r. If x_f > N - x̃_r: shared matched chars [N - x̃_r, x_f - 1], snake from point (N - x̃_r, N - x̃_r - k_orig) to (x_f, x_f - k_orig). If x_f == N - x̃_r: no shared chars; we need a snake of length ≥ 0; use empty snake at point (x_f, y_f): recurse prefix (a[:x_f], b[:y_f]) with the forward path (length d) and suffix (a[x_f:], b[y_f:]) with reverse path (length d). But is prefix path length d ≤ ... D = 2d, both halves length d < D ✓.

Hmm wait, but for correctness of minimality we just need SOME valid decomposition into D edits. The recursion: diff(prefix) gives script for a[:x_s] vs b[:y_s]; then "=" items for snake; diff(suffix) for a[x_e:] vs b[y_e:]. Validity requires: the concatenated script has exactly D edits and matches both strings. Given the path decomposition, yes.

But careful: the prefix path of length d_f: forward path reaches (x_s, y_s) — but wait if the snake we choose is the overlap region rather than the full forward snake, the forward path might extend beyond (x_s,y_s)... The forward path's furthest reach is (x_f, y_f); if we cut the snake at (x_s, y_s) with x_s > x0_f, then prefix = a[:x_s] — but the forward path to (x_s, y_s) is still length d_f (it passes through (x_s,y_s) since the snake from (x0,y0) to (x_f,y_f) passes through all intermediate points). ✓. And suffix from (x_f, y_f)... if we choose snake end at x_e < x_f? Let me just choose snake = [x_r_orig, x_f] region as described:

Case x_f > N - x̃_r (strict): snake from (x_s, y_s) = (N - x̃_r, M - ỹ_r) to (x_e, y_e) = (x_f, y_f). Prefix recursion: is there a path of length d_f from (0,0) to (x_s, y_s)? Forward path passes through it ✓. Suffix: reverse path from (x_e, y_e) to (N, M) of length d_r ✓. And the snake chars a[x_s..x_e-1] all match b[y_s..y_e-1]? Forward matched region [x0_f, x_f - 1] ⊇ [x_s, x_e - 1]? x_s = N - x̃_r > x0_f? Hmm, is x_s >= x0_f guaranteed? Not necessarily! The reverse path's deepest point could be less than the forward path's snake start? The overlap condition only says x_f >= N - x̃_r. The forward snake [x0_f, x_f]; reverse snake original [N - x̃_r, N - x̃0_r - 1]. The overlap point is somewhere in... Hmm. If x_s < x0_f: then snake [x_s, x_e] would include chars a[x_s..x0_f - 1] that the forward path reached via edits — are they matches on the diagonal? a[p] == b[p - k_orig] for p in [x_s, x_e - 1]: reverse path guarantees matches on [N - x̃_r, N - x̃0_r - 1]; if x_s < x0_f, is x0_f <= N - x̃0_r - 1? Not necessarily either. Hmm, this could break: the snake region must consist entirely of matches.

The paper's lemma handles this: the overlap of the two furthest-reaching paths occurs within a single snake, and the algorithm returns that snake's endpoints. The subtle point: when the forward path (d_f edits) and reverse path (d_r edits) overlap, the combined path has a snake containing the overlap, and the endpoints returned are that snake's endpoints. In implementations, the returned snake is typically the forward extension snake (x0,y0)→(x,y) when detected in the forward loop. Why is that valid? Because the overlap condition with reverse ensures the reverse path reaches at or before (x0, y0)? Hmm, let's think: reverse path of length d-1 on the same diagonal reaches down to x_r = N - x̃_r. Forward path: came from (x0, y0) via matches to (x, y). If x_r <= x0: then reverse path endpoint is at or before the forward snake start; combined path: forward path (d_f edits) → snake (x0..x) → reverse path from (x,y)?? But reverse path endpoint is (x_r, ...) which is BEFORE (x0,y0) on the diagonal, meaning the reverse path passes through (x0, y0) and beyond up to (x, y)? The reverse path covers diagonal points from its deepest endpoint x_r up to... the reverse path spans from (N,M) down to (x_r, ...). Points on it along diagonal k: all points with x-coord from x_r up to N? Not all — it has edits, so it jumps between diagonals; but its final snake covers [x_r, N - x̃0_r - 1] as matched chars, i.e., diagonal points from x_r to N - x̃0_r. Hmm, the reverse path passes through diagonal-k points (x_r, ...) through (N - x̃0_r, ...) contiguous? The final snake covers diagonal points from (x_r, ...) to (N - x̃0_r, ...). Plus before the snake it's on other diagonals. So the reverse path contains diagonal-k points exactly in [x_r, N - x̃0_r] (as a contiguous set of points along the snake). Wait no: the snake from point (N - x̃0_r, ...) down to (N - x̃_r, ...): the points on the path between them are all on diagonal k, x from N - x̃_r to N - x̃0_r. Yes.

Forward path contains diagonal-k points [x0, x] (its final snake) plus possibly earlier points on diagonal k (if it was on diagonal k before... a path can visit a diagonal multiple times; the furthest-reaching point is (x,y); earlier visits possible but let's not rely).

Overlap detected: x >= x_r (V[k] >= Vr mirrored condition x + x̃ >= N where x̃ = x̃_r, x_r = N - x̃). Combined path (forward + reverse) is a valid D-path iff they connect: forward endpoint (x, y) is on the reverse path: reverse path contains diagonal-k points [x_r, N - x̃0_r]. Need x <= N - x̃0_r. Is that guaranteed? x is forward furthest reach with d_f = d-1 edits... Hmm. The paper's lemma 3/proof guarantees the overlap is within one snake: i.e., x_r <= x0 and x <= N - x̃0_r? Not exactly, the lemma says the overlap point lies in a snake of the combined path. 

Honestly, rather than re-derive all subtleties, let me use the well-tested formulation. There's a widely known correct implementation pattern (from Myers' paper figure 8, used in many libraries). Let me recall it exactly. The paper's figure 8 pseudo-code (I remember its structure):

```
Procedure MiddleSnake:
    N ← a.length, M ← b.length
    Δ ← N - M
    odd ← Δ mod 2 ≠ 0
    V ← array indexed from -max to max  (forward, V[1] = 0)
    Vr ← array (reverse, Vr[1] = 0)
    For D ← 0 to ceil((M+N)/2) do:
        # forward
        For k ← -D to D step 2:
            If k = -D or (k ≠ D and V[k-1] < V[k+1]) Then x ← V[k+1]
            Else x ← V[k-1] + 1
            y ← x - k
            While x < N and y < M and a[x+1] = b[y+1] Do x, y ← x+1, y+1   # 1-indexed strings
            V[k] ← x
            If odd and Δ-(D-1) ≤ k ≤ Δ+(D-1) and V[k] + Vr[Δ-k] ≥ N... 
```

Hmm, the paper uses reverse Vr where Vr[k] is measured in the same coordinate (x from the start?) such that the check is `V[k] >= Vr[Δ - k]`... Actually in the paper, reverse paths: "V[1] = 0" init and reverse furthest reaching stored as the x-distance traveled from the end? Let me recall the paper's exact reverse loop (from the 1986 paper, Figure 8):

```
For k ← -D+Δ to D+Δ step 2 do   (* reverse *)
    If k = D+Δ or (k ≠ -D+Δ and V[k-1] < V[k+1]) Then x ← V[k+1]
    Else x ← V[k-1]+1
    y ← x-k
    While x < N and y < M and a[N-x+1] = b[M-y+1] Do x,y ← x+1,y+1
    V[k] ← x
    If not odd and -Δ-D ≤ k ≤ -Δ+D and V[k]+Vf[?]...
```

Hmm. I recall in the paper's reverse loop, k ranges over Δ-D to Δ+D and x is measured from... "While x < N and y < M and a[N-x] = b[M-y]" with x starting from... and the overlap check `V[k] + Vf[Δ - k]... ` 

Actually, the paper's reverse formulation: reverse paths from (N, M), and it tracks x directly in original coordinates: V[k] = the x-coordinate such that... no wait. The trick in the paper: reverse furthest-reaching path on diagonal k is stored as x' = N - x (distance from the end)? The check in the paper (I'm fairly confident) is: `if not odd and |Δ - k| ≤ D and V[k] + Vr[Δ - k]... ` hmm.

I'll just trust my mirrored-coordinate derivation, but resolve the snake-endpoint subtlety properly. Let me think about what the paper guarantees (Lemma 3 in Myers' paper):

Lemma 3: Let D be the length of an SES of a→b. ... there is a D-path... For odd/even D, the first overlap between forward and reverse furthest-reaching paths happens at the middle snake, and the middle snake (Δ-)-snake has endpoints... The middle snake is defined as the unique snake through the "middle" of any optimal path.

Key theorem (used by the algorithm): when overlap first detected, the snake containing the overlap point is the middle snake, and its endpoints are (x, y) [start] and (u, v) [end] with u - x = v - y, and it can be obtained as: the forward path's last snake? Not always...

Hmm. Let me look at this from a different angle: implement the version where detection returns the snake as the FORWARD extension (x0,y0)→(x,y), and check whether that's always a valid decomposition:

When detected in forward step d (D odd = 2d-1), reverse paths of length d-1 known. Overlap: V_f[k] + x̃_r >= N where x̃_r = Vr_mirrored[delta - k], i.e., forward reach x_f >= x_r_orig = N - x̃_r.

Claim: we can decompose as prefix path (length d-1) to (x0, y0)? Wait forward path at step d: it has d edits total including the diagonal move into diagonal k. Hmm: forward furthest-reaching path on diagonal k with D_f = d edits. The last edit moved onto diagonal k, then snake to (x_f, y_f). So the path: d-1 edits to reach (x0, y0) [start of final snake], then snake. So prefix recursion on (a[:x0], b[:y0]) has a (d-1)-edit path? No wait: the point (x0,y0) is reached with d-1 edits? The furthest-reaching path with d edits on diagonal k: it takes a furthest-reaching path with d-1 edits on diagonal k-1 or k+1, makes one edit, then extends by the snake. So yes: (x0, y0) is reachable with d-1 edits... careful: (x0,y0) is the point right after the last edit, i.e., reachable with exactly d edits where the last edit is the move from diagonal k±1 to k? Hmm: path with d edits ending at (x_f, y_f) on diagonal k. The point before the final snake: after d edits? Let's count: the path has d edits total; the snake contributes 0 edits. So (x0, y0) [snake start] is reached with d edits, and (x_f, y_f) also with d edits. And the point before the last edit is reachable with d-1 edits. So prefix recursion (a[:x0], b[:y0]) has a d-edit path. Then snake "=" × (x_f - x0). Then suffix from (x_f, y_f): need reverse path from (x_f, y_f) to (N, M) with d_r edits where d_f + d_r = D = 2d - 1, so d_r = d - 1... wait d_f = d here? Let me recount: detection in forward step d means forward paths of length d, reverse of length d-1, D = d + (d-1) = 2d - 1. So suffix needs a (d-1)-edit path from (x_f, y_f) to (N, M). Reverse paths of length d-1 exist on mirrored diagonals |k̃| ≤ d-1. The reverse path on mirrored diagonal k̃ = delta - k reaches original point (N - x̃_r, M - ỹ_r) with x̃_r = Vr[k̃]. For the suffix path from (x_f, y_f) to exist with d-1 edits: the reverse path must pass through (x_f, y_f). The reverse path contains diagonal-k_orig points in [x_r_orig, N - x̃0_r]. Need x_f ∈ [x_r_orig, N - x̃0_r]... 

Hmm, we know x_f >= x_r_orig. Need x_f <= N - x̃0_r, i.e., the reverse path's snake extends at least to x_f. Is this guaranteed? The overlap detection happens the FIRST time the condition holds (we check after each forward k and each reverse k, and the paper's algorithm checks both in the same d-loop, forward first). Suppose it's not guaranteed: reverse path's snake tops out at N - x̃0_r < x_f. Then combined path forward→reverse isn't connected at (x_f, y_f). But intuitively, when x_f >= x_r_orig and the reverse snake is [x_r_orig, N - x̃0_r]: the forward snake is [x0_f, x_f]. The two snakes both lie on the same diagonal; do they overlap or is there a gap? The paper's Lemma: when the overlap condition triggers, x_r_orig <= x0_f is... hmm actually the condition for a valid single combined path is that the intervals [x0_f, x_f] (forward snake) and [x_r_orig, N - x̃0_r] (reverse snake) overlap or touch: x_r_orig <= x_f and N - x̃0_r >= x0_f... 

Hmm, actually, we don't need them to overlap as snakes! We need: forward path's endpoint (x_f, y_f) lies on the reverse path. The reverse path contains points: all diagonal-k points with x in [x_r_orig, N - x̃0_r] (its snake), plus other points on other diagonals. If x_f > N - x̃0_r, forward endpoint is beyond the reverse snake's top... then no connection. But then would the overlap condition have triggered earlier? 

Consider: the forward path reached (x_f, y_f) with d edits. The reverse path with d-1 edits on the same diagonal reaches (x_r_orig, y_r_orig) [deepest]. Combined D-path needs them to connect. The paper proves that when D is odd, the first overlap occurs between forward D' paths... and the middle snake's endpoints are exactly (x0,y0)→(x,y) of the forward extension? Let me think about whether the paper's returned snake is the forward extension.

From the paper (Section 4b, "the middle snake"): the algorithm in Figure 8, when overlap detected in forward loop, the snake returned is (x, y, u, v) where (x,y) is the snake start... The paper says: "the snake (x,y,u,v) is the middle snake" — where in the forward case, I believe (x, y) is the point where the forward path entered the diagonal... Hmm.

Let me try to find the actual argument. The paper's Lemma 3 & Theorem: 

Actually here's a cleaner way to think: The paper's Theorem (middle snake): Let the SES length be D. Consider forward furthest reaching paths and reverse furthest reaching paths. For odd D: the first time a forward (D+1)/2-path overlaps a reverse ((D-1)/2)-path... the overlap occurs on a unique snake, which is the middle snake, and moreover the middle snake is the LAST snake of the forward path (i.e., the extension (x0,y0)→(x_f,y_f))? Hmm, no — I recall the middle snake is characterized as: the snake whose endpoints (x,y) and (u,v) satisfy... the paper defines middle snake via any D-path: the snake containing the point at "path length" (D-path has 2D+... 

Alternative: let me sidestep this entirely. Instead of relying on snake endpoints being exactly right, I can use a more robust divide-and-conquer: find ANY overlap point and recurse in a way that's guaranteed valid:

Robust approach: when overlap detected (forward reach x_f >= reverse reach x_r on same diagonal, with d_f + d_r = D): choose split point m = x_r_orig (the reverse path's deepest point... wait, that's the smaller x). Set split at s = x_r = N - x̃_r (original), point (s, s - k). Prefix: is (s, s-k) reachable with d_f edits? Forward path contains diagonal-k points [x0_f, x_f] (contiguous snake) — if s ∈ [x0_f, x_f] ✓ reachable with d_f edits (d_f < D). If s < x0_f: forward path doesn't pass through s. Hmm. But wait — if s < x0_f, does the overlap condition make sense? The forward furthest reach x_f >= s, but the forward path jumped to diagonal k only at x0_f via its last edit from diagonal k±1... 

OK here's another thought — use the OTHER robust method: the overlap gives us that there EXISTS a D-path through point (x_f, y_f)?? The combined path forward+reverse requires connection. Alternatively the combined path through the reverse endpoint (x_r, y_r): forward path passes through (x_r, y_r) iff x_r ∈ [x0_f, x_f] i.e. x_r >= x0_f. So:

- If x0_f <= x_r (reverse endpoint inside forward snake): split at reverse endpoint: prefix (a[:x_r], b[:y_r]) with d_f-edit path ✓ (forward path passes through), suffix (a[x_r:], b[y_r:]) with d_r-edit path ✓ (reverse path starts... the reverse path from (N,M) down to (x_r,y_r) — suffix recursion needs path from (x_r,y_r) to (N,M): yes, the reverse path itself, d_r edits ✓). Snake between? We'd recurse prefix + suffix with no snake: prefix script + suffix script = d_f + d_r = D edits ✓ valid.
- Else (x_r < x0_f): the forward snake starts after the reverse endpoint. Then consider forward endpoint (x_f, y_f): is it on the reverse path? Reverse path diagonal-k points: [x_r, N - x̃0_r]. If x_f <= N - x̃0_r: split at forward endpoint: prefix (a[:x_f], b[:y_f]) with d_f edits ✓, suffix (a[x_f:], b[y_f:]) with d_r edits ✓ (reverse path passes through (x_f,y_f) since x_f ∈ [x_r, N - x̃0_r]).
- Else (x_r < x0_f and x_f > N - x̃0_r): forward snake [x0_f, x_f] ⊂ ... contains [x_r...]? We have x_r < x0_f <= x_f... and N - x̃0_r < x_f. So reverse snake [x_r, N - x̃0_r] and forward snake [x0_f, x_f] overlap in [x0_f, N - x̃0_r] (nonempty since x0_f <= N - x̃0_r? we have x0_f <= x_f and N-x̃0_r >= x_r; is x0_f <= N - x̃0_r? Hmm: reverse snake nonempty requires x_r <= N - x̃0_r... hmm actually the reverse snake could be empty too (x̃0_r == x̃_r means no matches in reverse extension). Ugh.

This is getting complicated, but note case 3: both snakes overlap as intervals. Then the middle snake: take the intersection or the union? The union [x_r, x_f] — is it all matches? [x_r, N - x̃0_r] matches (reverse) ∪ [x0_f, x_f] matches (forward): if the intervals overlap (x0_f <= N - x̃0_r), the union is contiguous and all matches ✓. So snake from (x_r, y_r) to (x_f, y_f), all matches (need x_f - x_r = y_f - y_r ✓ same diagonal). Prefix: path of d_f edits from (0,0) to (x_r, y_r)? Forward path passes through (x_r, y_r) iff x_r ∈ [x0_f, x_f] — but in case 3, x_r < x0_f. ✗! Forward path doesn't reach (x_r, y_r) on diagonal k... but maybe via different route? Not guaranteed.

Hmm. So case 3 with x_r < x0_f: split at (x0_f, y0_f) (forward snake start): prefix d_f - ... wait forward path reaches (x0_f, y0_f) with d_f edits ✓ (it's on the forward path). Suffix: reverse path passes through (x0_f, y0_f) iff x0_f ∈ [x_r, N - x̃0_r] ✓ (case 3: x_r < x0_f <= N - x̃0_r). ✓!! So split at (x0_f, y0_f): prefix (a[:x0_f], b[:y0_f]) d_f edits, suffix (a[x0_f:], b[y0_f:]) d_r edits. No snake needed. 

Similarly general robust rule: overlap guaranteed means intervals [x0_f, x_f] and [x_r, N - x̃0_r] (points on diagonal k covered by forward/reverse paths) intersect? Forward covers diagonal-k points: at least its snake [x0_f, x_f]; could cover more but assume just that. Reverse covers [x_r, N - x̃0_r]. Overlap condition x_f >= x_r is necessary for interval intersection but not sufficient (need x0_f <= N - x̃0_r too). Hmm! So the paper's condition alone doesn't guarantee interval intersection?

Wait — but actually the reverse path with d_r edits on diagonal k: does it cover MORE diagonal-k points than its final snake? No — once it leaves diagonal k it can return... a path can visit diagonal k multiple times, but furthest-reaching analysis: the furthest-reaching d_r-path on diagonal k — its points on diagonal k include the final snake and possibly earlier segments. Hmm.

But here's the thing: the paper PROVES the algorithm correct. The condition V[k] + Vr[delta - k] >= N (in appropriate coordinates) triggering for the first time guarantees the middle snake, and the returned endpoints are specific. Since I can't perfectly recall the paper's snake-endpoint extraction, let me think about what's actually true.

Let me reconsider. Actually, I recall now: the paper's Figure 8 reverse loop stores, for reverse paths, x measured such that the overlap check is `V[k] ≥ Vr[Δ−k]` — no wait.

Let me actually carefully re-derive using the paper's own coordinate convention, from the actual paper text which I remember reasonably well:

From Myers' paper, Figure 8 (with 1-indexed strings a[1..N], b[1..M]):

```
Procedure MiddleSnake(a[1..N], b[1..M])
  Δ ← N−M, odd ← Δ odd
  For D ← 0 to ⌈(M+N)/2⌉ do
    For k ← −D to D step 2 do  (* forward *)
      If k = −D or k ≠ D and V[k−1] < V[k+1] Then x ← V[k+1]
      Else x ← V[k−1]+1
      y ← x−k
      While x < N and y < M and a[x+1] = b[y+1] Do x,y ← x+1,y+1
      V[k] ← x
      If odd and Δ−(D−1) ≤ k ≤ Δ+(D−1) and V[k]+Vr[Δ−k] ≥ N Then
         Return(2D−1, x, y, Vr[Δ−k], Vr[Δ−k]−Δ+k)   (* snake (x,y) ← (u,v)? *)
    For k ← −D+Δ to D+Δ step 2 do  (* reverse *)
      If k = D+Δ or k ≠ −D+Δ and Vr[k−1] < Vr[k+1] Then x ← Vr[k+1]
      Else x ← Vr[k−1]+1
      y ← x−k
      While x < N and y < M and a[N−x] = b[M−y] Do x,y ← x+1,y+1
      Vr[k] ← x
      If not odd and −Δ−D ≤ k ≤ −Δ+D and V[k]+Vr[k] ≥ N Then
         Return(2D, V[k]... )
```

Hmm, in the paper's reverse loop: k ranges over Δ−D to Δ+D, and the recurrence: x ← Vr[k+1] or Vr[k−1]+1 — note: x here is the ORIGINAL x? "While x < N and y < M and a[N−x] = b[M−y]": comparing a[N−x] — so x counts how far from the end we've come; x=0 means at (N,M). So Vr[k] = distance-from-end x̃, i.e., mirrored x. And diagonal: y = x − k, with k = x̃ − ỹ = mirrored diagonal. But then k ranges Δ−D..Δ+D?? mirrored diagonal ranges... hmm the paper indexes reverse by k where the OVERLAP check uses same-k. If Vr[k] is mirrored-x on mirrored diagonal k̃, and forward V[k] is original x on original diagonal k_orig = Δ − k̃. The check "V[k] + Vr[Δ−k] ≥ N" in forward loop: forward on original diagonal k, reverse on mirrored diagonal Δ−k ✓ consistent with my derivation. And reverse loop k ranges over... the paper writes k from −D+Δ to D+Δ — that would be original diagonals... but with y = x − k and a[N−x] matching... if k is the original diagonal of the reverse path's current point: original point (N − x̃, M − ỹ), k_orig = (N − x̃) − (M − ỹ) = Δ − (x̃ − ỹ) = Δ − k̃. And y = x − k with x = x̃ (mirrored): y = ỹ = x̃ − k̃ = x − k → k = k̃ mirrored. So within the loop, k = k̃ (mirrored), and range should be [−D, D]... but paper says [Δ−D, Δ+D]?? 

Hmm wait — maybe in the paper, reverse loop's y = x − k where k is such that... Let me recheck: maybe the paper's reverse uses x as original coordinate x (not mirrored). "While x < N and y < M and a[N−x] = b[M−y]": if x is the original... a[N−x] with x = distance from end. If reverse path is at original point (px, py) with px = N − x̃, then a[N − x̃] is the NEXT char to match going backward? Original point (px,py) consumed a[1..px]; going backward, next match is a[px] = a[N − x̃]... wait a[px] where px = N − x̃: a[N − x̃]. And after matching, point becomes (px − 1, py − 1), x̃ increases by 1. Hmm, so "a[N−x] = b[M−y]" with x = x̃: matches a[N − x̃] ✓ (1-indexed: a[N − x̃] is the x̃-th char from the end ✓). And y = x − k: ỹ = x̃ − k̃ ✓. So k in the reverse loop is the mirrored diagonal k̃, but the loop range is Δ−D..Δ+D?? That doesn't match |k̃| ≤ D...

Unless... the paper indexes Vr by ORIGINAL diagonal. Let me re-derive: define reverse V indexed by original diagonal k_orig, storing x̃ (distance from end). Original diagonal k_orig = Δ − k̃ → k̃ = Δ − k_orig. Then y = x − k in the loop would be... y stored should be ỹ = x̃ − k̃ = x̃ − Δ + k_orig. Hmm the paper's "y ← x − k" with k = k_orig gives ỹ = x̃ − k_orig — inconsistent unless Δ = 0.

I think my memory of the exact figure is unreliable. Fine — I'll implement it with my own careful derivation and, to be safe about the snake-endpoint subtleties, handle the recursion robustly:

Key insight for robustness: I'll define the recursion to work on (a_lo, a_hi, b_lo, b_hi) with the invariant that the answer for the subproblem is the diff of a[alo:aohi] vs b[blo:bhi]. The middle-snake function returns D and snake endpoints; I'll derive snake endpoints as follows and PROVE validity case by case. Actually, let me simplify by choosing the split point to be a point that's guaranteed on BOTH paths' diagonals... 

Alternative much simpler robust scheme: don't do middle-snake D&C at all. Instead: compute D via forward Myers. Then reconstruct the edit path via backward greedy using recomputation from the front... no, O((N+M)D²).

Hmm, what about: forward Myers with V snapshots, but snapshots stored compactly as `array` module arrays? For D=2000, N+M=2000: total ints = sum_{d=0}^{2000} (2d+1) ≈ 4M values. Using array('i') — each snapshot is an array of ints, 4 bytes each → 16MB total, plus array object overhead per snapshot (~2000 snapshots × ~64 bytes ≈ negligible). Backtracking: classic: from (x, y) with d steps remaining, k = x - y; determine whether the path arrived via V_{d-1}[k+1] (insertion, i.e., "+" ... wait direction) or V_{d-1}[k-1] + 1 (deletion), then snake back. Conditions: at step d on diagonal k: if k == -d: came from k+1 via down-move (y... in forward terms, from diagonal k+1 moving down = insertion "+"); if k == d: came from k-1 via right move ("-"); else: if V_{d-1}[k-1] + 1 == V_d[k] and the snake from V_{d-1}[k-1]+1 extends to V_d[k]... The standard backtrack: x = V_d[k]; check if V_{d-1}[k-1] + 1 <= x and snake from (V_{d-1}[k-1]+1, ...) reaches x — actually simpler: prev_x candidates: from k-1: x_prev = V_{d-1}[k-1] + 1 then snake forward; from k+1: x_prev = V_{d-1}[k+1] then snake. Check which one yields x. Since we have V_{d-1} stored, we can recompute the snake from the predecessor and see if it reaches (x, y). If both do, either works (both give valid minimal scripts). This gives the full path with D moves; emit script by walking forward through the reconstructed move list.

Memory: snapshots for d=0..D, each an array('l') of size 2D+1? We can size each snapshot as 2d+1 but simpler fixed size 2·max_d+1... that's 2001 entries × 2001 snapshots × 4 bytes = 16MB ✓ fine. Time: computing D: O((N+M)·D) = 2000·2000 = 4M char comparisons — fine (<2s? Python: 4M loop iterations ~ 1-2s... hmm, the while loop with a[x]==b[y] comparisons — for the worst case (completely different), snakes are length ~0 mostly, so the inner while does O(1) per k; total k-iterations = sum over d of (d+1) ≈ D²/2 = 2M iterations of the k-loop body — each body has a few operations. 2M iterations in pure Python ≈ 1-2 seconds. Hmm, that's borderline against the 6s budget for the 1000-line case, and then backtracking another similar amount. Total maybe 3-4s. Risky but probably OK? The problem says 1000 completely different lines under 6 seconds. D = 2000. k-loop total iterations = Σ_{d=0}^{2000}(d+1) ≈ 2,003,000. Each iteration: a few dict/array lookups, comparisons, while-check. In CPython, ~0.5-1 µs per simple iteration → ~2s. Plus backtracking ~similar. Should fit under 6s. And for the 20000-line case with D≈100: forward loop Σ ≈ 5,150 iterations, snakes long but each snake total work bounded by O((N+M)D) = 40000×100 = 4M worst case... hmm, actually snake extension total across all k,d: each extension step advances x+y by 1, and per d, x+y ≤ N+M, so total snake work ≤ D·(N+M) = 100 × 40000 = 4M — that's the worst-case bound but realistically: the k-loop for d ≤ 100 has Σ(d+1) ≈ 5150 bodies, and snake extensions happen only where lines match; with only ~50 differing places, snakes are huge. Total snake work: for each d, the furthest reaches x values can total up to... sum over k of (V[k] - start) ≤ N+M per d → 4M ops worst case. Hmm, but realistically for a near-identical diff, most diagonals hit long matches. 4M simple operations ≈ 2-4s in Python?? That might be too slow for the 2s budget!

Wait, but realistically: with N=M=20000 and D≈100, per d-step the sum of snake lengths ≤ N+M = 40000, so ≤ 100 × 40000 = 4M comparisons worst case. In practice much less? Consider: forward Myers on nearly identical sequences: at d-step, diagonals near delta reach the end quickly. Actually many diagonals will extend to large x. Hmm, hard to bound tightly. Real behavior: the furthest-reaching on diagonal k for small d is roughly min(N, something). For sequences identical except 50 spots, at d-step, diagonal k reaches close to N for many k once d ≥ 50. So snake work could indeed approach 4M char comparisons. Python: ~4M iterations of a while loop with two index comparisons and equality → maybe 1.5-3 seconds. Plus the k-loop overhead small. Borderline for 2s.

Optimization for long snakes: instead of char-by-char while loop, we can speed up matching using... hmm, standard trick: none in pure Python easily. But we could optimize the common case: when a[x] == b[y] extends long runs — we could compare slices first: e.g., check if a[x:x+K] == b[y:y+K] via slice comparison (C speed), advancing K at a time, then handle remainder. Slice equality is C-speed. E.g., chunk of 64: while x < N and y < M and a[x] == b[y]: then try chunked: if a[x:x+64] == b[y:y+64]: x += 64 (careful bounds: slice lengths equal since both clamped? a[x:x+64] and b[y:y+64] both may be shorter at end; if equal as slices, both have same length; advance by len). This makes long common runs ~64× faster. Good optimization, easy:

```
while x < N and y < M and a[x] == b[y]:
    # try to skip ahead in chunks
    step = 32
    while x + step <= N and y + step <= M and a[x:x+step] == b[y:y+step]:
        x += step; y += step
    ... then single steps
```

Hmm, simpler: 

```
while x < N and y < M and a[x] == b[y]:
    x += 1; y += 1
    if x < N and y < M and a[x] == b[y]:
        # chunk skip
        ...
```

Let me write a helper:

```
def extend(a, b, x, y, N, M):
    # fast forward using chunk comparisons
    while x < N and y < M:
        if a[x] != b[y]:
            break
        # chunk
        chunk = 64
        while x + chunk <= N and y + chunk <= M and a[x:x+chunk] == b[y:y+chunk]:
            x += chunk; y += chunk
        # can't chunk (either near end or mismatch inside chunk); advance one and retry
        x += 1; y += 1  — wait this would skip past a mismatch? No: we only get here if a[x]==b[y]; advance one; loop re-checks.
    return x, y
```

Hmm but if a[x]==b[y] and chunk fails due to near-end, we advance 1 and loop; fine. If chunk fails due to internal mismatch, advance 1, then a[x]!=b[y] breaks. Correct. But worst case (mismatch every char): overhead of attempting chunk each iteration doubles-ish work. For the totally-different case, snakes are empty so extend is called with immediate mismatch: cost = one comparison + loop exit — fine (the chunk attempt only happens after at least one match).

Actually the structure above: outer while checks a[x]==b[y] first; if match, try chunk (C-speed slice compare of 64 elements ~ sub-microsecond), advance. If mismatch inside chunk after partial... slice equality fails → advance 1, re-loop: a[x] might match again (mismatch was later in chunk) → try chunk again... This gives ~64x fewer slice ops per 64 matches, each slice op O(64) in C. Effective ~64 elements per Python-level iteration ≈ fast. For the 20000-case with ~4M match steps: 4M/64 ≈ 62K slice comparisons ≈ fast. 

But wait — actually, is worst-case snake work really 4M? Let me think about near-identical 20000-line sequences with ~50 changed lines. Myers forward: at each d, diagonals -d..d step 2. The furthest reach on diagonal k: paths with d edits. For |k - delta| region near the "action", reaches vary; but many diagonals extend far. Total per d bounded by... each (d,k) snake can be long. Realistic estimate: for d from 0..~100, diagonals within the d-band: at d, about d+1 diagonals... hmm total diagonals processed Σ(d+1) ≈ 5000. Each snake potentially up to N. If most snakes reach near N: 5000 × 20000?? No — that overcounts: sum over k of snake lengths per d ≤ N + M roughly (since snakes at fixed d overlap? no they don't overlap in a special way...). Hmm, actually there IS a tight bound: sum over all k at fixed d of the furthest reach x... not obviously bounded by N+M. Consider identical sequences, delta=0: at d=0, diagonal 0: snake to N (one snake, N long). d=1: diagonals -1, 1: reach N-? ... each extends to near N (they can, via one edit then long match). So per d, ~2(d+1)... Σ over d≤100: Σ 2(d+1) snakes × length up to N each?? That'd be Σ 2(d+1)·N ≈ 100·100·20000 = way too much. But wait — that can't be; actual bound is O((N+M)·D) total for the whole algorithm, i.e., 4M total across everything. The bound comes from: snake steps are monotonic in (x+y)... The standard O(ND) bound counts each snake extension step once globally because... hmm, the O(ND) bound: the number of (d,k) pairs is O(D²), and each snake extension advances x; total extension work is O(N·D)? The standard statement: algorithm takes O((N+M)·D) time. Reasoning: for each d, the while-loops total O(N+M)? Because within a fixed d, the furthest-reaching points on different diagonals... each extension step increases x+y by 1, and within diagonal k, x+y = 2x - k; different diagonals at the same d... Points (x, x-k) for various k are distinct points? Two diagonals k1≠k2 could have snakes passing through the same point? Point (x,y) is on exactly one diagonal, so at fixed d, each point (x,y) is claimed by at most one diagonal's snake? But snakes at the same d on different diagonals are disjoint as point sets (a point belongs to one diagonal). And total points ≤ (N+1)(M+1)... not N+M. Hmm, but the classic bound is O((N+M)D) total: I recall the argument: the total work is O(D²) for the k-loops plus the snake extensions... each snake extension is charged to... Let me recall: Myers' paper says the algorithm is O((N+M)D). The argument (paper section 3b?): for a fixed d, Σ over k of snake lengths: snakes on adjacent diagonals... hmm. Actually the known bound: O(ND) where... let me just trust O((N+M)·D) = 4M for our worst case. With chunked extension, actual Python-level operations ≈ (number of (d,k) pairs ≈ 5000) + (snake work / 64 + snake work Python overhead)... snake work 4M chars → chunked: at most 4M/1... hmm wait, chunk skipping only helps when 64 consecutive match; the while loop per chunk-advance does one slice compare (C, ~64 element compare, fast ~200ns) + increments. So 4M chars ≈ 62K chunk ops ≈ 0.05s ✓. Plus per-(d,k) overhead 5000 × ~1µs ✓. 

But hold on — for the totally-different 1000×1000 case: D=2000, (d,k) pairs ≈ Σ_{d}(d+1) ≈ 2M pairs, each doing: comparisons, array reads/writes, while-check (fails immediately). ~2M × maybe 0.6µs ≈ 1.2-2.5s. Hmm. Plus snapshot memory. Then backtracking: D=2000 steps, each step: read V_d[k], compute predecessor, re-run extend (cheap), emit move — 2000 × cheap ✓ fast.

Hmm wait, actually, I realize the D&C linear-space approach for the totally-different case: D=2000 = N+M, recursion: middle snake search does forward+reverse simultaneously, stopping at d ≈ D/2 = 1000: (d,k) pairs ≈ Σ_{d≤1000}(d+1)×2 ≈ 1M — then two subproblems... total O((N+M)·D) but constant factor ~ same. Recursion overhead fine. Memory O(N+M). This avoids the 16MB snapshot (which is fine anyway) but more importantly avoids... honestly both approaches have similar time. The snapshot approach is much simpler to get RIGHT (no middle-snake subtleties). Memory 16MB via array('i') acceptable? The problem says standard library only — array is stdlib ✓.

Hmm, wait: but snapshots: D can be up to N+M = 2000 for the 1000-case → snapshots: 2001 arrays × (2·1000+1... max_d = (N+M+1)//2 = 1000) size 2001 ints × 4 bytes = 2001×2001×4 ≈ 16MB ✓ fine. For the 20000-case: D≈100 → tiny.

But worst case D for the 20000 case: "differ in about 50 places" → D ≈ 100. But to be safe for arbitrary inputs (e.g., 20000 vs 20000 completely different, D=40000): snapshots = 40000 × 80001 × 4 bytes = 12.8 GB ✗!! Not acceptable as a general solution. The problem only specifies those two performance scenarios, but a robust solution shouldn't blow up memory. Hmm. Mitigation: hybrid: if D² is small enough (say D ≤ 2000, memory ≤ 16MB), use snapshot backtracking; else... fall back to linear-space D&C? That means implementing both. OR just implement linear-space D&C only, which handles everything with O(N+M) memory.

Alternatively: snapshot approach with pruning: we don't need ALL snapshots — backtracking needs V_{d-1} when at step d; we can store snapshots only... no, backtracking needs all.

Alternative memory trick: store snapshots as diffs? V_{d} differs from V_{d-1} in d+1 entries. Store per-d only the changed entries? Backtracking needs full V_{d-1}: reconstruct from V_{d} plus changelist? We'd walk backward: maintain current V (at step d), and to get V_{d-1}, undo the changes made at step d (we know which k's were written at step d and their previous values — we can store per-d a small list of (k, old_value) — that's O(D) per step → O(D²) again but as tuples: 4M tuples ✗ worse).

Store per-d the list of (k, V_d[k]) written — same size as snapshot. No.

OK here's another classic memory-efficient exact approach: Hirschberg-style / the "linear space" refinement is the way. Let me just carefully implement middle-snake D&C and resolve the endpoint correctness rigorously. Actually — alternative: there's a simpler well-known correct variant: after computing D with forward Myers (cheap, O(D) memory), do the D&C where instead of the paper's exact snake, we find the middle snake via overlap search and then pick split points using a SAFE rule that I can prove:

At detection, we have: forward furthest-reach point F = (x_f, y_f) on diagonal k with d_f edits; reverse furthest-reach (in original coords) R = (x_r, y_r) on the same diagonal k with d_r edits, x_f >= x_r, d_f + d_r = D.

Valid combined path exists through the snake... Let me think about what's provably true. The reverse furthest-reaching d_r-path on diagonal k reaches R = (x_r, y_r). This path, read forward from R to (N, M), is a path of d_r edits. The forward furthest-reaching d_f-path on diagonal k reaches F, x_f >= x_r.

Now: is the FORWARD path passing through R? The forward path's points on diagonal k include its final snake [x0_f, x_f]. If x_r >= x0_f ✓. If x_r < x0_f, maybe the forward path visited diagonal k earlier — not guaranteed.

Is the REVERSE path passing through F? Its diagonal-k points: final snake [x_r, t_r] where t_r = topmost point of its final snake = N - x̃0_r. If x_f <= t_r ✓. 

Hmm. Consider the combined sequence: does a D-path exist through some common point? The paper's Lemma 3 (I'll reconstruct): "If D is odd, then the first overlap between the (D+1)/2-forward and (D-1)/2-reverse furthest reaching paths occurs in an odd snake... moreover this snake is the middle snake and its endpoints can be determined." And crucially, the paper claims the overlap detection V[k] >= Vr-mirror condition triggers exactly when the paths overlap — and "overlap" of paths means sharing a common POINT. Paths share point P: P on forward path and on reverse path. Forward path points on diagonal k: at least [x0_f, x_f]; reverse: at least [x_r, t_r]. For the paths to share a point on diagonal k... they could also share points on other diagonals? The check is on the same diagonal. Hmm, but actually paths can cross on... two paths sharing a point must be at the same point → same diagonal → the check is right.

So the triggering condition x_f >= x_r doesn't immediately imply shared point; the paper's insight: at the moment of FIRST triggering, the paths DO share a point, specifically within snakes, and more: x_r and x_f are within a single snake. Why? Because consider the moment before: at the previous check (either k±2 forward or previous d), condition was false... The paper's argument: Let the forward path on diagonal k with d_f edits have furthest reach x_f, and reverse with d_r edits reach x_r, with x_f >= x_r. The middle snake: consider the point (x_r, y_r) = R. The forward path... hmm.

You know what — let me look at this from the "first triggering" perspective, which is what makes the paper's algorithm correct, and reason concretely:

The check happens after computing forward V[k] at step d (checking against reverse Vr of step d-1) and after reverse Vr[k̃] at step d (checking against forward V of step d). First trigger overall. 

Case A (forward trigger, D odd): forward d-path on diag k reaches x_f; reverse (d-1)-path on same diag reaches x_r_orig = N - x̃_r; x_f >= x_r_orig; and no earlier trigger. Claim: the forward path's final snake and the reverse path's final snake overlap (share ≥ 1 point)... Suppose not. Sub-case A1: x_r_orig < x0_f (reverse endpoint strictly before forward snake start). Then consider reverse path on diagonal k reaching x_r_orig < x0_f. Hmm, the forward path with d edits: its predecessor state: it came from diagonal k-1 or k+1 with d-1 edits, reaching x_prev = V_{d-1}[k∓1], then one edit onto diagonal k at (x0_f, y0_f), then snake. Note x0_f = x_prev + 1 (if came from k-1 via right-move: point (x_prev + 1, x_prev + 1 - k)) or x0_f = x_prev (if came from k+1 via down-move). Hmm.

Since reverse (d-1)-path on diagonal k reaches x_r_orig < x0_f ≤ x_f, and forward (d)-path reaches x_f... 

Alternatively, think in terms of what could make both snakes disjoint: forward snake [x0_f, x_f], reverse snake [x_r, t_r], disjoint means either t_r < x0_f or x_f < x_r (impossible, trigger) — so t_r < x0_f: the reverse path's deepest reach x_r and its snake top t_r are both < x0_f. But trigger requires x_r ≤ x_f ✓ fine and no contradiction yet... but ALSO: no earlier trigger means: at reverse step d-1... hmm wait, in case A the reverse paths computed are from step d-1 (completed in previous iteration). Hmm, but actually the ordering: within iteration d, forward loop runs first (checking against Vr from iteration d-1), then reverse loop (checking against Vf from iteration d, including current). So when forward trigger fires at step d, reverse Vr is from step d-1 fully computed.

Reverse (d-1)-path on diagonal k̃ = Δ - k reaches mirrored x̃_r; original x_r = N - x̃_r. Also reverse paths on mirrored diagonals k̃±1 with d-1 edits were computed: Vr[k̃±1] (mirrored reach). The reverse path on k̃ came from k̃±1 with (d-2) edits + one edit + snake.

Hmm, I want to avoid re-proving Myers' lemma. Let me instead find and trust a concrete correct implementation strategy that I can verify by construction. 

Alternative rigorous approach — "greedy overlap with shared-point check": Modify the detection to require an actual shared point: trigger when the forward and reverse paths provably share a point. We can ensure this by checking: x_f >= x_r AND x_r >= x0_f? We know x0_f (forward snake start) and the reverse path's top t_r... but simpler: trigger when x_f >= x_r and additionally the point x_r is within forward snake: x0_f <= x_r <= x_f. If not yet, continue searching; will it eventually trigger in a provably-good way? The paper's first-trigger is what's proven; adding extra conditions might delay trigger past the point where... it still triggers eventually (when d grows, x_r decreases... hmm, as d increases reverse reaches DEEPER (smaller x_r) and forward reaches FURTHER (larger x_f and x0_f?? x0_f also grows...). Hmm, x0_f is the forward snake start for the furthest-reaching path — as d grows by 2, does x0_f grow? Not necessarily monotone.

This is getting deep. Let me step back and consider the actual well-known correct implementation that many people use (e.g., from the article "Myers Diff Algorithm" series by James Coglan, or the classic `diff-myers` gems). Coglan's implementation (Ruby, well-explained in his "The Myers diff algorithm" blog series) does exactly the D&C with middle snake and backtracks by storing V snapshots per round — his final version stores the V arrays for each round and backtracks through them, using the middle-snake only for... hmm, actually Coglan's series: part 3 uses middle snake for the "linear space" refinement? His series ends with backtracking via stored snapshots I think.

Given time constraints, let me go with the snapshot-backtracking approach, which I can implement with complete confidence in correctness, plus a guard: if D is large (D² memory too big), fall back to... hmm. What's a safe fallback that's still fast enough for the specified scenarios? The specified scenarios: (20000, ~100 D) and (1000, 2000 D). Snapshot memory for D=2000: 16MB ✓. For safety cap: if (D+1)·(2·max_d+1) ≤ ~8M entries (32MB as array('i')), use snapshots; else use O(N·M) DP?? For D large relative to N,M, N·M might be smaller. Actually when D > ~sqrt stuff... Let me think: when is snapshot approach bad? Memory ≈ D². When D ~ N+M (totally different), N·M DP memory = N·M. For N=M=1000: D=2000 → snapshots 16MB vs DP 1M cells 4MB. Both fine. For hypothetical N=M=20000 totally different: D=40000 → snapshots 40000×40001×4 = 6.4GB ✗; DP = 4×10^8 cells ✗✗. Only linear-space D&C survives. But such input isn't in the requirements. Still, I'd like robustness.

Alternative: implement linear-space D&C but with the SAFE split rule proven by cases. Let me try once more to nail the middle snake correctness, being very careful. I'll allow the recursion to possibly not perfectly halve (correctness first, complexity: worst case still O((N+M)·D) if splits are reasonable — I'll argue splits keep D halved).

Setup: subproblem a[0:N], b[0:M] (I'll recurse with offsets but conceptually 0-based full arrays). delta = N - M. Search d = 0, 1, 2, ...; at each d: forward loop k = -d..d step 2 (original diagonals), then reverse loop k̃ = -d..d step 2 (mirrored diagonals). 

Forward check (after computing Vf[k] at forward step d): if odd(delta) and reverse paths of length d-1 exist on mirrored diagonal k̃ = Δ - k (i.e., |Δ - k| ≤ d - 1): condition Vf[k] + Vr_mir[Δ - k] >= N. Meaning x_f >= N - x̃_r = x_r.

Reverse check (after computing Vr_mir[k̃] at reverse step d): if not odd and forward paths of length d exist on original diagonal k_orig = Δ - k̃ (i.e., |Δ - k̃| ≤ d): condition Vf[Δ - k̃] + Vr_mir[k̃] >= N. D = 2d.

Hmm wait, one more check on parity/rounding: max_d = ceil((N+M)/2)? The SES length D satisfies D ≡ Δ (mod 2) and D ≤ N+M. Forward and reverse meet when d_f + d_r = D. Forward step d checks reverse d-1 (catches odd D = 2d-1) and reverse step d checks forward d (catches even D = 2d). Loop d up to ceil((N+M+1)/2)? To catch D = N+M (all different... D = N + M when no common... e.g., a and b share nothing: D = N + M. If Δ = N - M, D ≡ Δ mod 2. D = 2d - 1 (odd case) needs d up to (D+1)/2 = (N+M+1)/2. D = 2d (even) needs d = D/2 = (N+M)/2. So loop d in range((N+M)//2 + 2) safe, and also must handle detection failing → but it can't fail (some D-path exists; D ≤ N+M). I'll loop while True with safety d ≤ max_d where max_d = (N + M + 1) // 2, and after loop raise/fallback (shouldn't happen; but if N=0 or M=0 handle base case before recursion).

Hmm wait, edge: if D = 0 (a == b): handled by base case check (a == b → return [("=",l) for l in a]).

Base cases in recursion: if a-part empty: all "+" b-lines; if b-part empty: all "-" a-lines. Also small optimization: trim common prefix/suffix before recursing (big win for the 20000-similar case and generally). Actually trimming common prefix/suffix at the top level reduces N+M hugely; inside recursion also helps. The middle-snake D&C with trimming: standard.

Now the crucial part: extracting a VALID split from the overlap. Let me define things concretely and prove a valid split exists with the following data at trigger time:

Forward state (for original diagonal k, step d_f): x_f = Vf[k], and I ALSO record s_f[k] = the snake start x0 for the furthest-reaching path at (d_f, k). (Easy: record x0 when computing.) Similarly reverse state mirrored: for mirrored diagonal k̃, step d_r: x̃_r = Vr[k̃], and snake start x̃0_r recorded as s_r[k̃]. Original coords: reverse deepest point x_r = N - x̃_r; reverse snake covers original diagonal-k̃'... wait careful: reverse snake on mirrored diagonal k̃ corresponds to original diagonal k_orig = Δ - k̃, and covers original x ∈ [N - x̃_r, N - x̃0_r - 1]... hmm let me recompute: mirrored matches at mirrored positions [x̃0, x̃_r - 1] correspond to original positions N - 1 - (x̃) for x̃ in that range = [N - x̃_r, N - 1 - x̃0]. As positions (chars), that's [N - x̃_r, N - x̃0 - 1]. As POINTS on the path (consumed-prefix boundaries): the snake spans points from (N - x̃0, ...) down to (N - x̃_r, ...): points with x ∈ [N - x̃_r, N - x̃0]. So define t_r = N - x̃0_r (top point) and x_r = N - x̃_r (deepest point), with x_r ≤ t_r, snake points [x_r, t_r], matched chars a[x_r .. t_r - 1]?? matched chars are positions [N - x̃_r, N - x̃0_r - 1] = [x_r, t_r - 1] ✓ consistent: snake from point x_r... hmm wait: snake points from p_top down to p_bottom: chars matched between consecutive points. Points (t_r, t_r - k_orig)... path visits t_r first (coming from edits above? no—). Ugh, let me re-fix orientation: reverse path from (N, M): edits first (mirrored: path from (0,0) does edits first, and original reverse path reading from (N,M) mirrors the mirrored path read from (0,0) — the original reverse path visits: (N,M) [mirror of (0,0)] → edits... hmm mirror of mirrored path (0,0) →E→ (x̃0,ỹ0) →S→ (x̃_r,ỹ_r): original path visits mapped points in REVERSE order: (N - x̃_r, ...) ←S← ... I did this before: original path from (N,M): first segment = reverse of mirrored snake: from (N, M)?? No! mapped(x̃_r, ỹ_r) = (N - x̃_r, M - ỹ_r) — the original path starts at (N,M) = mapped(0,0), then goes to mapped(x̃_r, ỹ_r)?? The original path is the mirrored path reversed: mirrored path points p0=(0,0), ..., plast=(x̃_r,ỹ_r); original path points: mapped(plast), ..., mapped(p0) = (N,M)?? That means original path goes FROM mapped(plast) TO (N,M) — but our reverse path should go FROM (N,M) TO deepest. I think the right statement: the reverse path from (N,M) visiting points mapped(plast), mapped(plast - 1), ..., mapped(p0)=(N,M)? No: reverse path from (N,M) toward (0,0): its points are (N,M) = mapped(p0)... 

Let me just do it very concretely with a tiny example. a = "ab", N=2. Mirrored ra = "ba". Suppose mirrored path matches ra[0]='b' = a[1]. Mirrored snake from point (0,0) to point (1, 1) (if ỹ matches). Original: matched char a[1]. The reverse path from (2, 2) matching a[1]: moves to point (1, 1). So reverse path point sequence: (2,2) → (1,1). Mirrored path point sequence: (0,0) → (1,1). Mapping: mapped(x̃,ỹ) = (2 - x̃, 2 - ỹ): mapped(0,0) = (2,2) ✓ start; mapped(1,1) = (1,1) ✓ end. So original reverse path points = mapped(mirrored points) in the SAME order. I had it right the first time then confused myself: original reverse path from (N,M): first the moves corresponding to mirrored path's first moves. Mirrored path: edits first, then snake. Original reverse path from (N,M): edits first?? In the example there were no edits. Let me add: mirrored path: one edit (delete ra[0]='b') then match ra[1]='a': points (0,0) → (1,0) [edit] → (2,1) [match]. Original mapped: (2,2) → (1,2) → (0,1). Check semantics: original reverse path from (2,2): first move maps mirrored edit (consume ra[0]=a[1] via deletion-ish) — original move from (2,2) to (1,2): reduces x by 1: in forward terms that's "a[1] deleted" ✓ makes sense (reverse of insertion). Then match a[0] with b[0]: (1,2) → (0,1) ✓. Great: original reverse path = mapped(mirrored path), same order. So original reverse path: from (N,M), does the edits corresponding to mirrored path's first d_r - ... wait mirrored path with d edits: edits interleaved... in the furthest-reaching greedy construction: mirrored path = (d-1 edits reaching some point) + 1 edit + snake. So original reverse path = snake-part FIRST?? mapped order: original path visits mapped(mirrored p0), mapped(p1), ..., i.e., original path from (N,M): first moves correspond to mirrored path's FIRST moves, which are the d-1 edits... no wait mirrored path: p0 →(edits interleaved with snakes)→ ... →(last edit)→ point before final snake → (final snake) → plast. Original path from (N,M) = mapped(p0), then mapped(p1)... — mapped(p0)=(N,M), mapped points proceed: the mirrored path's early edits map to original moves near (N,M). The mirrored path's FINAL snake maps to the original path's LAST segment: from mapped(point-before-snake) = (N - x̃0, ...) to mapped(plast) = (N - x̃_r, M - ỹ_r). So original reverse path: (N,M) → [moves] → (N - x̃0_r, M - ỹ0_r) → [snake] → (N - x̃_r, M - ỹ_r). The snake moves DOWNWARD in original coords (x decreasing): from t_r = N - x̃0_r down to x_r = N - x̃_r ✓ (x̃_r ≥ x̃0_r). Matched chars: original positions of the snake: the snake consumes... path from point (t_r, ...) moving down to (x_r, ...): consumes chars a[x_r .. t_r - 1]?? Path points (t_r, t_r - k_orig) then next point (t_r - 1, t_r - 1 - k_orig) — the move matches a[t_r - 1] with b[t_r - 1 - k_orig]. So matched positions [x_r, t_r - 1] ✓ as before. 

So reverse path points on original diagonal k_orig: the final snake covers points x ∈ [x_r, t_r], and earlier points are on other diagonals (or also on k_orig — possible if the path revisits, ignore). Matched chars [x_r, t_r - 1], where t_r = N - x̃0_r, x_r = N - x̃_r.

Forward path: points on diagonal k: final snake [x0_f, x_f], matched chars [x0_f, x_f - 1].

Trigger (forward case): x_f >= x_r, D = d_f + d_r = 2d - 1 (d_f = d, d_r = d - 1).

We need to produce: a split into prefix (path with d_f edits... or fewer) + snake + suffix (path with d_r edits), or prefix+suffix without snake, all consistent.

Option 1: split at point (x_r, y_r) [reverse deepest point]: 
- Prefix: need path (0,0) → (x_r, y_r) with ≤ d_f edits. Forward path passes through (x_r,y_r) iff x_r ∈ [x0_f, x_f]. 
- Suffix: reverse path from (x_r, y_r) to (N, M): d_r edits ✓ always.
Valid iff x_r >= x0_f.

Option 2: split at point (x_f, y_f) [forward furthest]:
- Prefix: forward path (0,0)→(x_f,y_f): d_f ✓ always.
- Suffix: need path (x_f,y_f)→(N,M) with d_r edits: reverse path passes through (x_f, y_f) iff x_f ∈ [x_r, t_r], i.e., x_f <= t_r.
Valid iff x_f <= t_r.

Option 3: split with snake: snake from point (x_r, y_r) to (x_f, y_f) — requires all chars a[x_r..x_f-1] match b[y_r..y_f-1] on diagonal k: chars [x_r, x_f - 1] ⊆ forward matched [x0_f, x_f - 1] ∪ reverse matched [x_r, t_r - 1]: need x_f - 1 <= t_r - 1 (i.e., x_f <= t_r) for coverage from reverse, or x_r >= x0_f for coverage from forward; combined: chars [x_r, x_f-1] = [x_r, min(x_f-1, t_r -1)] from reverse + [max(x_r, x0_f), x_f - 1] from forward; union covers [x_r, x_f-1] iff min(x_f, t_r) >= max(x_r, x0_f)... precisely need no gap: intervals [x_r, t_r - 1] and [x0_f, x_f - 1] must together cover [x_r, x_f - 1]: since both start ≤ x_f - 1... need t_r - 1 >= x0_f - 1... need intervals to overlap-or-touch: t_r >= x0_f. Hmm: if t_r >= x0_f: union of [x_r, t_r-1] and [x0_f, x_f-1] with x_r <= x0_f?? (not nec) — coverage of [x_r, x_f - 1]: from x_r to min(t_r, x_f)-1 via reverse; from max(x0_f, x_r) to x_f - 1 via forward; gap possible between min(t_r,x_f)-1 and max(x0_f,x_r) if t_r < x0_f... So Option 3 valid iff t_r >= x0_f?? wait also need chars matched: covered positions are exactly union; need [x_r, x_f - 1] ⊆ [x_r, t_r - 1] ∪ [x0_f, x_f - 1] ⟺ every p in [x_r, x_f-1] is in one: p < t_r → in reverse's ✓; p >= t_r → need p >= x0_f, i.e., t_r >= x0_f or [t_r, x_f - 1] empty (x_f <= t_r). So Option 3 valid iff t_r >= x0_f OR x_f <= t_r (the latter subsumed) — condition: x_f <= t_r or t_r >= x0_f... if x_f <= t_r then [x_r, x_f-1] ⊆ [x_r, t_r - 1] ✓ valid regardless of x0_f. If x_f > t_r: need [t_r, x_f - 1] ⊆ [x0_f, x_f - 1] ⟺ t_r >= x0_f. So Option 3 valid iff x_f <= t_r or t_r >= x0_f, i.e., t_r >= min(x_f, x0_f) = x0_f (since x0_f ≤ x_f) — wait if x_f ≤ t_r valid; else need t_r ≥ x0_f. Combined: valid iff t_r >= x0_f or x_f <= t_r ⟺ t_r >= x0_f (since x0_f ≤ x_f, t_r ≥ x0_f covers... no: if t_r < x0_f ≤ x_f then x_f > t_r and t_r < x0_f → invalid). So Option 3 valid ⟺ t_r >= x0_f. Hmm interesting. And then prefix: path (0,0) → (x_r, y_r) with d_f edits? Forward path passes (x_r,y_r) iff x_r >= x0_f — NOT guaranteed in option 3! Hmm wait option 3's prefix must reach the snake START (x_r, y_r). Forward path passes through x_r ∈ [x0_f, x_f] iff x_r >= x0_f. If x_r < x0_f (reverse reaches deeper than forward snake start): forward path doesn't pass (x_r, y_r)... but could another d_f-path? Not guaranteed.

Hmm OK so let me enumerate by relative order of x_r, x0_f, t_r, x_f. Known: x_r ≤ t_r (reverse snake span), x0_f ≤ x_f (forward snake span), trigger: x_r ≤ x_f. Also d_f = d, d_r = d-1.

Also useful: t_r vs x_f: t_r = N - x̃0_r and the reverse path with d_r = d-1 edits... And x0_f: forward path with d edits: reached (x0_f,y0_f) with d edits (the last edit landed at start of snake)... wait no: forward furthest path with d edits on diagonal k: (d-1)-path on k±1 + 1 edit + snake. Points: (0,0) →(d-1 edits)→ P' on diag k±1 →(1 edit)→ (x0_f, y0_f) →(snake)→ (x_f, y_f). So (x0_f, y0_f) reachable with exactly d edits (and P' with d-1).

Reverse: mirrored path with d_r = d-1 edits on diagonal k̃: (d-2)-path + 1 edit + snake: original: (N,M) →(d-1 edits... wait mirrored path (0,0) →(d-2 edits)→ Q' →(1 edit)→ (x̃0, ỹ0) →(snake)→ (x̃_r, ỹ_r). Original mapped: (N,M) →(d-1 edits? no: mapped moves of mirrored first d-2 edits + 1 edit = d-1 edits total)→ (t_r, ...) →(snake down)→ (x_r, ...). So (t_r, t_r - k_orig) reachable from (N,M) with d_r = d - 1 edits... and (x_r, ...) with d_r edits too (snake adds none).

Now, possible orderings (x_r ≤ x_f given):

(i) x0_f ≤ x_r: Option 1 valid: split at (x_r, y_r): prefix via forward path ✓ d_f edits, suffix via reverse path ✓ d_r edits. No snake needed. Total d_f + d_r = D ✓. 

(ii) x_r < x0_f: forward snake starts above reverse deepest point. Sub-case by t_r vs x0_f... and x_f vs t_r:
  (ii-a) x_f ≤ t_r: Option 2 valid: split at (x_f, y_f): prefix forward ✓, suffix reverse passes through x_f ∈ [x_r, t_r] ✓. 
  (ii-b) x_f > t_r: Then reverse snake [x_r, t_r] entirely below forward snake start? t_r < x_f and x_r < x0_f. Where's t_r vs x0_f? If t_r ≥ x0_f: Option 3: snake from (x_r,y_r)?? no wait option 3 needs prefix through (x_r, y_r) which needs x_r ≥ x0_f ✗. Hmm, option 3 as I defined splits prefix at snake start x_r. Bad. Instead: snake from (x0_f, y0_f) to (x_f, y_f) [the forward snake], prefix = forward path up to (x0_f,y0_f) with d_f edits ✓, suffix from (x_f, y_f) — need reverse through x_f: x_f > t_r ✗. Alternatively snake from (x0_f, y0_f) down... hmm. What about splitting at t_r: point (t_r, ...): prefix: forward path passes t_r ∈ [x0_f, x_f] ✓ (since x0_f ≤ t_r < x_f): prefix (0,0)→(t_r,·) with d_f edits ✓. Suffix: reverse path passes (t_r, ·)? t_r is the TOP of reverse snake ∈ [x_r, t_r] ✓: suffix (t_r,·)→(N,M) with d_r edits ✓. Split at (t_r, y_t): prefix d_f + suffix d_r = D ✓ valid! No snake needed.
   If t_r < x0_f: then reverse snake [x_r, t_r] entirely below [x0_f, x_f]... both below: x_r < t_r < x0_f ≤ x_f. Then no shared point on diagonal k between the two paths' final snakes. But trigger fired: x_f ≥ x_r. Hmm! Is this possible without an earlier trigger? The paths are on the same diagonal, reverse (d-1)-path reaches x_r < x0_f ≤ x_f... The combined path forward+reverse is NOT connected. But the paper claims first-trigger gives the middle snake... In this configuration, is there a contradiction with first-trigger? Consider: reverse path on diagonal k with d-1 edits reaching x_r. The forward path with d edits reaching x_f > t_r, with snake start x0_f > t_r. Hmm. Consider the reverse path on diagonal k with d edits (step d, computed AFTER the forward loop in the same iteration): it would reach ≤ x_r (more edits from same side can't... reverse with more edits reaches deeper or equal: Vr step d on k̃ ≤ Vr step d-1 on k̃? Furthest reach with more edits is deeper (smaller original x)? For reverse: more edits → reach further from (N,M) → deeper → smaller x. So Vr_d[k̃] ≥ Vr_{d-1}[k̃] (mirrored, more edits reach further). So reverse d-path on k̃ reaches x'_r ≤ x_r. Then check x'_r... the reverse-loop check at step d compares Vr[k̃] (d edits) with Vf[Δ-k̃] (d edits): condition x'_r ≤ x_f — likely still true. Combined path: forward d-path + reverse d-path = 2d edits = D+1 > D — not useful; but for EVEN D... hmm, D here: what's the true D? If D is odd = 2d-1, the forward-trigger should have fired at step d with the right configuration per the paper. My case analysis suggests configurations where trigger fires but no valid split exists?! That would contradict the paper... unless such configuration is impossible due to first-trigger invariant or greedy properties.

Let me think about whether (ii-b with t_r < x0_f) can be a FIRST trigger. At first trigger (forward, step d, diagonal k): no trigger at any earlier (d', k') or at step d for k' < k (forward loop processes k ascending from -d to d; checks happen per k after computing Vf[k]).

Hmm, what does t_r < x0_f mean? Reverse (d-1)-path on diagonal k̃=Δ-k: its final snake tops out at t_r = N - x̃0_r and the reverse path reached (t_r, ·) with d-1 edits after its last edit (mirrored: edit landed at mirrored point (x̃0_r, ỹ0_r) = original (t_r, ·)). Forward d-path: last edit landed at (x0_f, y0_f), then snake to x_f.

Both paths on diagonal k. Reverse reaches x_r ≤ x_f ✓ trigger. For the paths to be "staircase" non-overlapping with reverse entirely below... 

Claim: this configuration implies an earlier trigger. Why: consider the forward path with d-1 edits on diagonal k-1 or k+1 that preceded. Hmm, alternatively consider the reverse path with d-1 edits on diagonal k — its "mirror" is a forward path on strings (ra, rb) — the whole situation is symmetric... The forward check at step d for diagonal k compares Vf_d[k] with Vr_{d-1}[Δ-k]. Also consider diagonal k' = k - 2 or k + 2... 

Honestly, the paper's proof (Lemma 2 & 3) establishes: the first overlap occurs at the middle snake, and "overlap" means the paths overlap — i.e., share points. The algorithm's condition x_f ≥ x_r is claimed equivalent to overlap AT FIRST TRIGGER. The proof of Lemma 3 in the paper (paraphrasing): "When D is odd, the first overlap occurs on an odd D-path... the furthest reaching forward path and reverse path must overlap within their respective snakes..." I believe the paper's argument shows that at first trigger, x_r and x_f are inside a common snake, i.e., configuration like: x_r, x_f ∈ [same snake]. Which of my options that is: if the shared snake is the forward snake: x0_f ≤ x_r (and x_f ≤ t_r or the reverse snake ends beyond...) hmm.

Rather than fully re-deriving the proof, I can make my implementation robust by checking the safe conditions at trigger time and, if neither Option 1 nor Option 2 applies directly, handle it by CONTINUING the search? But the paper says first trigger is THE middle snake; if I continue, I might still find a valid split later? Not necessarily with these options...

Alternatively — pragmatic robust approach: at trigger, choose split point s = the point guaranteed valid among the options by checking conditions; if somehow none of the point-splits is valid (which my analysis says happens only in config (ii-b, t_r < x0_f)), then note that in that config, the two snakes are disjoint with reverse strictly below forward — but wait, in that config, hmm, let me reconsider: maybe then use a DIFFERENT valid decomposition: the forward path itself continues... Let me think about config (ii-b/t_r<x0_f) more: reverse (d-1)-path on diag k reaches deepest x_r; forward d-path on diag k reaches x_f, snake [x0_f, x_f], with t_r < x0_f ≤ x_f... wait we need x_r ≤ x_f ✓. Since t_r < x0_f, reverse snake is strictly below forward snake. Now here's a thought: the forward path with d edits — its predecessor (d-1)-path on diagonal k-1 (or k+1) reaches point P' with x_{P'} = x0_f or x0_f - 1. The reverse path with d-1 edits on diagonal k reaches x_r. Consider the reverse path on diagonal k±1... hmm.

Actually WAIT. Let me reconsider: maybe in config (ii-b, t_r < x0_f), the correct interpretation: the forward path's snake [x0_f, x_f] and the reverse path — the reverse path passes through points on diagonal k in [x_r, t_r]; the forward path passes [x0_f, x_f]; disjoint. But the combined D-path must exist SOMEWHERE (D = 2d-1 is the true SES length — is it? At forward step d, we haven't confirmed D = 2d-1; the trigger asserts it). Hmm, if the true D were smaller, an earlier trigger would have fired. If the true D = 2d - 1, there EXISTS a (2d-1)-path; its middle snake... The paper's theorem: the first trigger point yields the middle snake. The middle snake is defined as the snake containing the point at "half the path"... and the theorem says the furthest-reaching paths overlap IN the middle snake. So at first trigger, the forward (d)-path and reverse (d-1)-path DO share points, and the shared snake is the middle snake. So config (ii-b, t_r < x0_f) with disjoint snakes cannot be a first trigger — meaning: if my derived condition fires in that configuration... it can't (by the theorem). But my implementation might still encounter the raw condition x_f ≥ x_r in that configuration as the FIRST raw-trigger? If the theorem says first RAW trigger always has the good configuration, then no problem. I'll trust the theorem (it's the foundation of Myers' algorithm, extremely well-established). 

Hmm, but let me double-check the theorem's claim direction with the classic subtlety: the raw condition Vf[k] ≥ Vr-orig[k] can fire "spuriously"?? No — the theorem (Myers '86, Lemma 3): "Let D be odd... the first time the overlap condition holds, the paths overlap in the middle D/2-snake." The algorithm returns the snake as (x, y, u, v) where... In the paper's forward-trigger return, the snake returned is (V[k], ..., Vr[Δ-k], ...)?? i.e., from the REVERSE point to the FORWARD point: snake from (x_r_orig, y_r_orig) to (x_f, y_f)! I now actually recall the paper's Figure 8 return statement: `Return (2D-1, Vr[Δ−k], Vr[Δ−k]−Δ+k... , x, y)` hmm — something like the snake (x,y,u,v) = (reverse reach, forward reach). And the paper's reverse-trigger returns snake from forward reach to reverse reach: (V[k']..., ...). Hmm interesting — so the paper returns the snake spanning from the reverse path's deepest point to the forward path's furthest point. For that to be a valid snake (all matches), the covering argument needs the union-of-matches condition (t_r ≥ x0_f) as I derived in "Option 3"... and prefix through (x_r, y_r) needs x_r ≥ x0_f?? Hmm no wait — if the paper returns snake (x_r → x_f), the prefix recursion is on a[:x_r] which needs a d_f-edit path to (x_r, y_r): forward path passes x_r iff x_r ≥ x0_f. So the paper implicitly relies on x_r ≥ x0_f at first trigger?? Hmm, that is: the reverse reach point lies within/on the forward snake. Then all chars [x_r, x_f - 1]: [x_r, x_f - 1] ⊆ [x0_f, x_f - 1] (forward matches) ✓ — the whole snake is covered by the forward snake's matches ✓✓. That's clean: Option 1 + snake: split prefix at x_r (forward path passes through since x_r ≥ x0_f), snake (x_r→x_f) all matches (within forward snake), suffix from x_f via reverse path (starts at its deepest point ✓). And this requires exactly: x0_f ≤ x_r ≤ x_f. Hmm, and symmetric for reverse trigger: x0_r_orig... 

So the invariant at first trigger: x0_f ≤ x_r ≤ x_f (forward trigger case). I'm fairly confident this is the paper's actual claim (the overlap point is within a single snake, and specifically the snake boundaries work out so that the returned snake is valid). Let me sanity-check with a small example mentally later via... can't run code. Let me hand-simulate a tiny case.

Example: a = [1, 2], b = [3, 4]. N=M=2, Δ=0, even. D should be 4. Forward: d=0: k=0: x=0,y=0; a[0]=1 vs b[0]=3 no match. Vf[0]=0. Even check at reverse step d=0: k̃=0: reverse: x̃=0: a[N-1-0]=a[1]=2 vs b[1]=4 no. Vr[0]=0. Reverse check: not odd and |Δ - k̃|=0 ≤ 0: condition Vf[0] + Vr[0] = 0 >= N=2? No. d=1: forward k=-1: k==-d → x = Vf[0]=0... wait recurrence: k=-1: x = Vf[k+1