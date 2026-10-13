We need Myers' O((N+M)D) diff algorithm producing LCS-based edit script.

Plan: implement Myers' algorithm with linear space refinement (divide and conquer with the "middle snake") to keep memory reasonable, or use forward Myers storing V arrays per D for backtrack — for 20000 lines with D=50, forward storing all V per step is fine (D small). But worst case 1000 lines completely different: D=2000, storing V arrays per D: D * (N+M) ≈ 2000 * 4000 = 8M ints — fine memory-wise (each V is length 2D+1, actually V grows: at step d, V has indices -d..d, so total storage sum over d of (2d+1) ≈ D^2 = 4M ints — okay). But actually a common trick: store only the V array per d iteration (full array each time, size 2D+1) → D * (2D+1) entries. For D=2000, that's 8M — fine.

But worst-case performance: Myers O((N+M)D). For 1000+1000 completely different, D=2000, N+M=2000 → 4M operations, fast. For 20000 lines differing in 50 places, D≈100 (50 changed places could mean up to 100 edits), N+M=40000 → 4M operations. Good.

However, there's a subtle worst-case: the problem only gives those two performance tests. But forward Myers with full backtrack storage: memory D*(2D+1). If someone had 20000 completely different lines, D=40000 → D^2 = 1.6e9 — too much. But not required by spec. Still, safer: use linear-space divide-and-conquer (Hirschberg-style Myers middle snake). That's O(N+M) space and O((N+M)D) time. Let's implement the middle-snake variant (Myers' recursive "diff" from the paper, section 4b? Actually the linear space refinement).

Implementation: classic Myers linear-space:

function diff(a, b, offset handling):
- trim common prefix/suffix first (big optimization for the 20000-line case).
- If one side empty: all +/-.
- Find middle snake using forward and backward D-paths simultaneously; recurse on the two halves.

Middle snake algorithm (Myers 1986 "An O(ND) difference algorithm and its variations", the linear space version):

Standard implementation (from the paper's pseudocode or common ports like diff-match-patch's diff_main uses different approach). Let me write the well-known recursive function:

def LCS-based diff via ms(a, a0, a1, b, b0, b1, output):
    # find middle snake in substring a[a0:a1], b[b0:b1]
    N = a1-a0; M = b1-b0
    if N == 0 and M == 0: return
    if N == 0: for each b line: "+" 
    if M == 0: "-" lines
    # common prefix/suffix trim within the window
    trim prefix while a0<a1 and b0<b1 and a[a0]==b[b0]: output "=" ... careful: better trim and emit, or handle inside.

Actually simpler: trim prefix/suffix recursively inside, appending "=" directly.

Middle snake search:
    delta = N - M
    odd = delta % 2 != 0 (forward must overlap with backward when d and d-1 parity... standard: if delta odd, overlap in forward on step ceil? Let's recall standard formulation:

Use max D = (N+M+1)//2 rounded up. For each d in 0..ceil((N+M)/2):
    forward step for k in -d..d step 2: compute x using best of Vf[k-1], Vf[k+1]; store Vf.
    check overlap: if delta odd: after forward step, check k in range and Vf[k] >= Vb[k]? Actually forward path with parity: forward d-paths reach diagonal k; backward paths of length d' reach diagonal k. Overlap occurs when d + d' >= ... Standard: if delta is odd, check overlap after forward step of d with backward at d (backward d' = d? hmm).

Common implementation (e.g., from "Myers diff in Ruby" by James Coglan):

delta = N - M
odd = delta % 2 != 0
for d in range(0, max_d+1):
    # forward
    for k in range(-d, d+1, 2):
        if k == -d or (k != d and Vf[k-1] < Vf[k+1]): x = Vf[k+1]
        else: x = Vf[k-1] + 1
        y = x - k
        x0, y0 = x, y
        while x < N and y < M and a[a0+x] == b[b0+y]: x += 1; y += 1
        Vf[k] = x
        if odd and (k - delta) in range(-d+1... wait, check against backward with d' = d-1: overlap if -d < k-delta < d? Condition: odd and -(d-1) <= k-delta <= (d-1) and Vf[k] >= Vb[k-delta]:
            return snake (x0,y0,x,y) with total D = 2*d - 1
    # backward
    for k in range(-d, d+1, 2):
        # k here is backward diagonal in terms of... Let's use Coglan's formulation where backward V indexed by k too but measuring from the end.

Let me recall Coglan's "The Myers diff algorithm: part 3" implementation:

def middle_snake(a, b):
    N, M = len(a), len(b)
    max_d = (N + M + 1) // 2
    delta = N - M
    odd = delta % 2 != 0
    Vf = {1: 0}; Vb = {1: 0}  # backward Vb[k] = x such that path from (N,M) going backward; Coglan uses Vb[k] as x-coordinate where backward path on diagonal k started... Actually he stores Vb[k] = x value, where the backward path is expressed as moving from (N,M) backwards: x decreases with steps, y = x - k? He shifts: backward path diagonal k means x - y = k? Hmm, in Coglan's version, backward paths are indexed such that k = (N - x) - (M - y)? Let me just write it carefully myself.

Standard from Myers paper section 4a (linear space):

Backward paths: define from (N, M). A backward D-path ends at (N,M). On diagonal k (x - y = k), the furthest-reaching backward D-path has smallest x, call Vb[k]. Backward step: from (x,y), a delete move goes to (x-1, y) i.e., from diagonal k to k-1? Moving from (x,y) backwards: horizontal move backward: (x-1, y), which changes diagonal from k to k-1... hmm x-y decreases by 1. Vertical backward: (x, y-1), x-y increases by 1.

Paper defines: Vb[k] = furthest reaching (smallest x) backward path on diagonal k. Initialization Vb[delta+1... Let me instead use the common trick: map backward coordinates: let x' = N - x, y' = M - y (distance from the end). Then backward paths in original = forward paths in reversed sequences. Reversed sequences: a_rev = a[::-1], b_rev = b[::-1]. Diagonal k' = x' - y' = (N - x) - (M - y) = (N - M) - (x - y) = delta - k. So overlap condition on same diagonal: forward diagonal k meets backward diagonal k' when... hmm, they meet when same point: forward at (x,y), backward path covers points with x'.. Actually easier: implement as in many reference implementations.

Let me write a clean known-good implementation. A widely used one (Python port):

def diff(a, b): recursive with find_middle_snake:

def find_middle_snake(a, N, b, M):
    # returns (d, x, y) where d is length of SES and (x,y) is the end of middle snake? 
    max_d = (N + M + 1) // 2  # ceil
    delta = N - M
    odd = delta & 1
    # V arrays sized 2*max_d+1, offset
    vf = [0] * (2*max_d + 2)
    vb = [0] * (2*max_d + 2)
    # vf[k] indexed k+offset; init vf[1] = 0, vb[1] = 0 (offset indices)
    of = max_d + 1
    vf[of + 1] = 0
    vb[of + 1] = 0
    for d in range(max_d + 1):
        # forward
        for k in range(-d, d + 1, 2):
            if k == -d or (k != d and vf[of + k - 1] < vf[of + k + 1]):
                x = vf[of + k + 1]
            else:
                x = vf[of + k - 1] + 1
            y = x - k
            x_start, y_start = x, y
            while x < N and y < M and a[x] == b[y]:
                x += 1; y += 1
            vf[of + k] = x
            if odd and -(d - 1) <= k - delta <= (d - 1):
                if vf[of + k] + vb[of + delta - k] >= N:
                    # middle snake found; d_total = 2d - 1
                    return 2*d - 1, x_start, y_start, x, y  # snake forward segment
        # backward
        for k in range(-d, d + 1, 2):
            # backward in terms of reversed coordinates: diagonal kk = k + delta? 
            ...

Hmm, mixing conventions. Let me define backward Vb indexed by diagonal k in *reversed* coordinates: i.e., treat the reverse problem as forward on reversed sequences. Backward path of length d in reversed sequences: furthest reaching forward path in (a reversed, b reversed) of length d on diagonal k' has x' = number of consumed reversed-a chars. Then in original coordinates, this path starts at (N, M) and reaches point x = N - x', y = M - y', with diagonal in original: x - y = (N - x') - (M - y') = delta - k'. So the original diagonal k corresponds to reversed diagonal k' = delta - k.

Overlap check: forward path on original diagonal k reaches x = vf[k]. Backward path on original diagonal k (i.e., reversed diagonal delta - k) reaches x = N - vb[delta - k], where vb[k'] is the x' extent in reversed coordinates. The forward and backward paths overlap when forward's x >= backward's x on the same diagonal: vf[k] >= N - vb[delta - k], i.e., vf[k] + vb[delta - k] >= N.

Parity condition: forward path length d, backward path length d'. Total path length d + d'. A path of total length D passes through middle. Forward d-paths and backward d'-paths overlap iff d + d' >= D... The standard check: if delta is odd, check overlap after the forward step of d (comparing with backward paths of length d - 1 or d?). Hmm.

Known correct statement (from Myers paper and Coglan): 
- If delta is odd: after forward step at d, check overlap with backward paths of length d - 1? Or: overlap exists when forward d-path meets backward (d)-path... Let me think: A middle snake found when forward path of length d overlaps backward path of length d' where d + d' = D (the minimal total). If delta odd, D = 2d - 1 for some d, so d' = d - 1. So after forward step of d, compare with backward Vb computed up to d - 1. If delta even, D = 2d, d' = d, check after backward step comparing with forward of same d.

But careful about the check condition on k range: forward k must satisfy that backward has reached diagonal delta - k with length d-1, i.e., |delta - k| <= d - 1. And condition vf[k] + vb[delta - k] >= N.

For even: after backward step at d, for reversed diagonal k' we check overlap: vb-extended point... condition: vf[delta - k'] + vb[k'] >= N, with |delta - k'| <= d. D = 2d.

Also need base: when N==0 or M==0 handled. Also when d=0 check: if delta==0 and sequences... forward d=0: k=0, x=0,y=0, snake extends; odd false (delta even), then backward step d=0: k=0, check overlap: vf[0+delta-0]... delta - k' where k'=0 → diagonal delta - 0 = delta? Wait need care: for backward step, the check is: for reversed diagonal k', original diagonal is delta - k'. Condition vf[delta - k'] + vb[k'] >= N. At d=0, k'=0, delta even. If delta == 0: check vf[0] + vb[0] >= N. vf[0] = length of common prefix; vb[0] = length of common suffix (in reversed, common prefix of reversed = common suffix). If sequences equal, prefix + suffix >= N → returns D=0 with snake (0,0,prefix,prefix). Good.

Edge: when delta even but no overlap found within max_d... guaranteed found by d <= max_d since D <= N+M and parity matches.

Hmm wait, the standard check when odd is done after forward step. But we need backward computed up to d-1. Loop order: forward then backward each iteration, backward uses vb from previous iterations plus current. If we check after forward step at d comparing to backward at d-1 (computed in previous iteration), fine. If even, check after backward step at d comparing to forward at d (computed this iteration). Good.

One subtlety: when checking odd after forward step at d, need |k - delta|... wait I wrote condition -(d-1) <= k - delta <= d-1, i.e., |delta - k| <= d - 1 — backward has computed diagonal delta - k. Correct.

Also, in backward step, the "furthest reaching" in reversed coordinates: standard forward recurrence on reversed sequences with vf init vb'[1] = 0.

Now the middle snake: we need the snake segment (start and end points) to recurse. The snake found: forward path at diagonal k, with x_start,y_start = point before snake, x_end,y_end after extension. But the recursion splits: the edit script = edit script for a[0:x_end?]. Hmm — middle snake decomposition: The middle snake is the overlap region; standard: split at the *end* of the forward path's snake? Let me recall: In Myers' linear-space, the middle snake found is the overlapping portion; the decomposition: prefix problem = a[0:x] , b[0:y] where (x,y) is... 

Standard approach (Coglan's): find_middle_snake returns (x, y) of the snake start and (u, v) of snake end, and d. Then recurse: diff(a[0:x], b[0:y]) and diff(a[u:], b[v:])? No — careful. Actually in Coglan's part 3: the snake found has endpoints; the edit script is: LCS/diff of prefix before the snake start... hmm, but the forward path to snake start has length d - ? and backward from snake end has length d - ?. The middle snake itself is all "=" (the matching run). The total edit script: diff(prefix) + "="*snake + diff(suffix), where prefix = a[:x_start], b[:y_start] and suffix = a[x_end:], b[y_end:], and the sum of diffs of both halves plus snake = D total? Not exactly — the diffs of the halves are minimal for the halves, but is the total minimal? Myers proves that splitting at the middle snake yields a minimal script because D = (d_forward_to_snake) + (d_backward_from_snake_end) where the snake contributes 0 edits, and the halves' SES lengths are exactly d1 = d - ... hmm.

Let me think again with Coglan's formulation precisely. In his implementation:

def find_middle_snake(a, b):
    N, M = ...
    max_d = (N + M + 1) // 2  # actually he uses (N + M + 1) / 2 floored? He uses odd = (delta % 2 != 0), max search...
    ...
    for d in 0..max_d:
        forward: for k in -d..d step 2:
            determine x,y (move), record x0,y0 (before? after move), then slide.
            Vf[k] = x (after sliding)
            if odd and -(d-1) <= k - delta <= d-1 and Vf[k] + Vb[delta - k] >= N... wait he checks k - delta in backward index.

Hmm, Coglan: he stores backward paths indexed by k where backward diagonal in his formulation: Vb[k] where k = x - y of the backward path? Let me look at his actual code from memory ("The Myers diff algorithm: part 3", jameshfisher? no, that's for "diff" by James Coglan on his blog):

His find_middle_snake:

```ruby
def find_middle_snake(a, b)
  n, m = a.size, b.size
  max_d = (n + m + 1.0 / 2).ceil   # actually (n + m + 1) / 2
  delta = n - m
  odd = delta.odd?
  vf = { 1 => 0 }
  vb = { 1 => 0 }
  d = 0
  loop do
    # forward
    (-d..d).step(2) do |k|
      if k == -d or (k != d and vf[k - 1] < vf[k + 1])
        x = vf[k + 1]
      else
        x = vf[k - 1] + 1
      end
      y = x - k
      x0, y0 = x, y
      while x < n and y < m and a[x] == b[y]
        x += 1; y += 1
      end
      vf[k] = x
      if odd and delta - (d - 1) <= k and k <= delta + (d - 1)
        if vf[k] + vb[delta - k] >= n
          return 2 * d - 1, x0, y0, x, y
        end
      end
    end
    # backward
    (-d..d).step(2) do |k|
      if k == -d or (k != d and vb[k - 1] < vb[k + 1])
        x = vb[k + 1]
      else
        x = vb[k - 1] + 1
      end
      y = x - k
      x0, y0 = x, y
      while x < n and y < m and a[n - x - 1] == b[m - y - 1]
        x += 1; y += 1
      end
      vb[k] = x
      if not odd and -d <= k - delta and k - delta <= d
        if vb[k] + vf[delta - k] >= n
          return 2 * d, n - x, m - y, n - x0, m - y0
        end
      end
    end
    d += 1
  end
end
```

So backward paths indexed by their own diagonal k in "reversed" coordinates where the reversed diagonal k satisfies: point (x,y) counted from the end, reversed diagonal = x - y; original diagonal = delta - k. Overlap check in backward branch: for reversed diagonal k, check against forward diagonal delta - k: vb[k] + vf[delta - k] >= n. Note k - delta in range [-d, d] ↔ |delta - k| <= d. And the returned snake: (n - x, m - y) is the *start* of the snake in original coordinates (since (x,y) from the end is the far end going backward — i.e., the snake runs backward from (n - x0, m - y0)?? Let me parse: backward path slides from (x0,y0) (in end-coordinates, before sliding) to (x,y) (after sliding). In original coordinates the path started at (n,m)... The backward path consumes reversed a[n-x-1] etc. The point (x,y) in end-coords corresponds to original point (n - x, m - y). Sliding forward in end-coords moves backward in original coords. So the backward path in original coordinates goes from (n,m) to (n-x, m-y), and the last slide (the snake) runs from original (n - x0, m - y0) down to (n - x, m - y). Coglan returns (n - x, m - y, n - x0, m - y0) — i.e., snake start (n-x, m-y) and snake end (n - x0, m - y0)? Wait snake in original coordinates: the slide goes from end-coord (x0,y0) to (x,y), meaning original from (n-x0, m-y0) to (n-x, m-y) with n-x0 >= n-x. So the snake segment in original coords is [n-x, n-x0). Coglan returns (n - x, m - y) as the first pair — the earlier point (snake start in original), and (n - x0, m - y0) as snake end.

Then the decomposition (his `find_diff` / shortest edit script): the middle snake splits: script = diff(a[0:bx], b[0:by]) where (bx,by) = snake start = ... hmm wait. Let me think about which decomposition is correct.

For the odd case (found in forward branch): forward path of length d reaches (x,y) after sliding; before sliding (x0,y0). The forward path of length d consists of d moves plus the snake slides. The snake is the overlap between forward d-path and backward (d-1)-path. Total D = 2d - 1. Decomposition: prefix = a[:x_end], b[:y_end]? Or a[:x0]? 

In Coglan's find_diff:

```ruby
def find_diff(a, b)
  ...
  if n > 0 and m > 0 then
    d, x, y, u, v = find_middle_snake(a, b)
    if d > 1 then
      find_diff(a[0...x], b[0...y])
      output snake "=" between (x,y) and (u,v)
      find_diff(a[u...n], b[v...m])
    elsif ...
```

where for the forward (odd) case he returns x0,y0 as (x,y) — snake start — and x,y (after slide) as (u,v) — snake end. So decomposition: diff prefix a[0...x0], b[0...y0], then "=" for the snake, then diff suffix a[x..], b[y..].

Check minimality: prefix diff should have SES length = ? The forward path reaching (x0,y0) before the slide has used d moves (the move into diagonal k) — so SES(prefix) ≤ d? Hmm, actually the forward d-path to (x0,y0): the path to snake start uses d edits? In forward branch, at iteration d, we computed x from vf values at d-1 plus one move, so path to (x0,y0) [before sliding] has d moves... wait: vf[k-1] or vf[k+1] were computed at iteration d-1 (path length d-1), plus one move → path length d to (x0, y0), then slides. So SES(a[:x0], b[:y0]) ≤ d. And backward path from (u,v)=(x,y) to (n,m): length d - 1 (backward paths of length d-1 since parity check used d-1). So SES(suffix) ≤ d - 1. Total ≤ d + 0 + (d-1) = 2d - 1 = D. And D is the minimal total (since loop found smallest d). But wait — is D minimal here? The loop finds the smallest d such that overlap occurs; the true minimal edit distance D satisfies: overlap first occurs at ceil(D/2) iterations appropriately. Since we iterate d from 0 upward, the first found gives minimal D. And the halves' SES lengths: prefix SES could be less than d? That would contradict D minimality? Actually total = SES(prefix) + SES(suffix) ≤ d + d - 1 = D, and total ≥ D (since the whole problem's SES is D, and script = prefix script + snake + suffix script is a valid script for the whole, so its length ≥ D). Hence equality, and prefix SES = d exactly, suffix SES = d-1 exactly. Great, decomposition is valid and minimal.

But one more subtlety: prefix and suffix diffs computed independently via recursion must each be minimal — the recursion guarantees that. And equality holds so the total is minimal. 

Hmm wait, but there's a subtlety: the recursion computes minimal scripts for the halves, and total = SES(prefix) + SES(suffix) + snake. We showed total ≤ D via the specific path decomposition, and total ≥ D since it's a valid script. Actually total = SES(prefix)+SES(suffix)+len(snake); we know SES(prefix) ≤ d, SES(suffix) ≤ d-1, snake = x - x0 matches (all equal chars). So total ≤ D. And any valid script for whole has length ≥ D_min. But is D (from middle snake) = D_min? Yes by the loop order argument. And total is a valid script so total ≥ D_min = D, hence total = D and prefix/suffix SES are exactly d and d-1... wait that forces SES(prefix) = d? total = SES(p) + SES(s) ≤ d + (d-1); and total ≥ D = 2d-1 → SES(p)+SES(s) = 2d-1, so SES(p)=d, SES(s)=d-1. Fine — recursion handles halves minimally anyway, giving total exactly D. 

For the even case (found in backward branch): returns d = 2d, snake start (n-x, m-y), snake end (n - x0, m - y0) where x,y are end-coords after sliding. Decomposition: prefix a[:snake_start], suffix from snake end. Backward path to snake start... backward path length d reaches (x,y) end-coords after d moves plus slides; snake start original = (n-x, m-y); path from snake end (n-x0,m-y0) backward to (n,m) has d moves. Prefix: forward path... hmm, in even case the overlap check compares backward d-path with forward d-path. The decomposition: SES(prefix a[:n-x], b[:m-y]) — is that ≤ d? Hmm: the backward path from (n,m) to snake start (n-x, m-y) has length d (moves) — read backward, it's a path from snake start to (n,m) with d edits, so SES(suffix a[n-x:], b[m-y:]) ≤ d. And the forward d-path overlaps at the snake start region... the forward path reaches vf[delta - k] >= n - vb[k] i.e., forward reaches x >= n - vb[k] = original x of snake start... hmm, forward path of length d reaches at least the snake start point (n-x, m-y) — actually overlap condition vf[delta-k] + vb[k] >= n means forward path on diagonal delta-k reaches x_f >= n - vb[k]; the backward path on that diagonal starts at original x = n - vb[k]... The snake returned is the *backward* snake (the slides of the backward path). Hmm, but decomposition uses prefix = a[:snake_start] = a[:n-x] and the forward path reaching there has length... forward d-path reaches x_f >= n - vb[k] at diagonal delta-k. The point (n - vb[k], m - y) — is that the snake start? snake start original x = n - x where x = vb[k] after sliding. So snake start x-coordinate = n - vb[k]. Forward path reaches diagonal delta-k at x_f >= n - vb[k], i.e., forward path reaches at or beyond snake start along the diagonal. The forward path to snake start (n - vb[k], m - y): since forward path reaches x_f ≥ that, and paths are monotonic, the forward path passes through snake start with ≤ d edits. So SES(prefix) ≤ d, SES(suffix) ≤ d, total ≤ 2d = D. And ≥ D → equality. Good.

Hmm wait, but the snake is attributed to neither — prefix ends at snake start, suffix begins at snake end, snake itself is "=" lines. Correct.

Edge cases in find_middle_snake: if N==0 or M==0, handle directly (no snake). Also, if d found is 0 (delta even, sequences identical or one is prefix...). If d==0: D=0, snake = whole? If delta==0 and sequences identical: forward d=0 slides whole, backward d=0 slides whole, overlap vf[0]+vb[0] >= n → return 0, snake start (0,0), snake end (n,n)? Backward branch returns (n-x, m-y, n-x0, m-y0) with x0=0,y0=0,x=n? Wait vb[0] after sliding = length of common suffix = n (if identical), so snake start = (n - n, m - n) = (0,0), snake end = (n - 0, m - 0) = (n, m). d=0. Then decomposition: prefix a[:0], suffix a[n:], snake = whole, all "="... but d > 1 check: if d <= 1 handle specially. Hmm, what does d=0 or d=1 mean for decomposition?

If D (returned) == 0: whole thing is snake → output "=" * n.
If D == 1: then either prefix or suffix is trivial? D=1 means e.g., delta odd with d=1: prefix SES = 1, suffix SES = 0. E.g., a = ["x"], b = [] : N=1, M=0 — but that's handled before middle snake (M==0 → all "-"). D=1 cases with both nonempty: a=["a","b"], b=["b"]: N=2,M=1, delta=1 odd. Forward d=1... The decomposition with d=1: prefix SES=1, suffix SES=0. Recursion on prefix would call find_middle_snake on prefix where one side might be empty — but our find_diff handles N==0/M==0 base cases directly, so recursion is fine. Actually simpler: just always recurse when d >= 1, output snake, recurse suffix. If d == 1: prefix has SES 1 and suffix SES 0; recursion handles: suffix diff where one side empty relative? Hmm suffix: a[u:n], b[v:m] with SES 0 means a[u:] == b[v:] — recursion outputs all "=". Fine. Prefix SES=1: recursion on prefix: find_middle_snake on prefix will find d=1, output one edit + snake. Works. So no special-casing needed beyond base cases N==0/M==0. But careful: if d==0 (identical), don't recurse infinitely: prefix a[:0] empty, suffix a[n:] empty → base cases → fine, plus snake. Actually with d==0, snake start (0,0), end (n,m): prefix empty → base case outputs nothing; suffix empty → nothing; snake outputs n "=". 

But wait — can d==0 arise when sequences differ? D=0 iff identical. OK.

Also potential infinite recursion: middle snake must be non-degenerate? The snake could be empty (zero-length slide, e.g., pure insertion/deletion at a point). Then snake start == snake end. Prefix = a[:x], b[:y]; suffix = a[x:], b[y:]. Could recursion not make progress? Prefix SES = d ≥ 1 for odd case... Consider a=["a"], b=["b"]: N=1,M=1,delta=0 even. Forward d=0: k=0, x=0,y=0, no slide (a[0]!=b[0]), vf[0]=0. Check even? No, even check is in backward branch. Backward d=0: k=0: x=0,y=0, slide: a[n-0-1]=a[0]="a" vs b[m-0-1]=b[0]="b" — no slide. vb[0]=0. Check: -d <= k - delta <= d → 0 in range; vb[0] + vf[delta - 0] = vb[0] + vf[0] = 0 + 0 = 0 >= n=1? No. d=1: forward: k=-1: k==-d → x = vf[0] = 0, y = 0 - (-1) = 1. Slide: x<1? yes but y<1? no. vf[-1]=0. Check odd? delta even, no. k=1: k != -d, k==d → x = vf[0]+1 = 1, y = 0. slide: x<1? no. vf[1]=1. Backward d=1: k=-1: x = vb[0] = 0, y = 1. slide: a[n-x-1]=a[0]="a" vs b[m-y-1]: m-y-1 = 1-1-1 = -1 → out of range, no slide. vb[-1] = 0. check: k - delta = -1, in [-1,1]; vb[-1] + vf[delta - k] = vb[-1] + vf[1] = 0 + 1 = 1 >= 1 → yes! Return d=2, snake: (n - x, m - y) = (1-0, 1-1) = (1, 0); snake end (n - x0, m - y0) = (1-0, 1-1) = (1,0). So snake start = end = (1,0), empty snake. Decomposition: prefix a[:1], b[:0] → diff(["a"], []) → "-a". suffix a[1:], b[0:] → empty → nothing. Total: "-a","+b"? Wait suffix: a[u:n] = a[1:] = [], b[v:m] = b[0:] = ["b"] → "+b". Order of output: prefix edits, then snake (none), then suffix edits: "-a", "+b". Valid minimal script (SES length 2 = 1+1+0). 

Now check ordering constraint: the output script must have "-" and "+" such that taking "="+"-" gives a and "="+"+" gives b. Our recursion: prefix diff outputs first (all edits apply to prefix region), then "=", then suffix. This is consistent: any interleaving order within prefix diff is fine as long as relative... hmm, actually within a diff of (ap, bp), the script order must be such that reconstructing a and b works. Any sequence of -,+,= where the =,- subsequence = ap and =,+ subsequence = bp works. Our recursive construction: prefix script, then (if snake) "=" lines, then suffix script. Subsequence of =,- from whole: (prefix's =,-) + (snake "="s) + (suffix's =,-) = ap + snake_a + suffix_a = a. ✓. Similarly for b. ✓.

Recursion depth: could be O(D) deep in bad cases? Each recursion splits the problem into two halves with SES d and d-1 (or d,d). Depth is O(log)? No — the split sizes: prefix has SES d ≈ D/2, suffix has SES ≈ D/2. So recursion depth O(log D)? Each level halves D, so depth O(log D) ~ fine. But actually prefix has SES = d ≈ D/2 and suffix SES = D/2, both roughly half, so depth is O(log D). But wait — for the odd case, prefix SES = d, suffix SES = d-1, total D = 2d-1; each roughly half. Depth ~ log2(D). For D up to 40000, depth ~ 16. Python recursion fine. But actually the split isn't necessarily halving in terms of *size*, only in edit count. Depth = O(log D) regardless since SES halves each level. 

Hmm, wait — is that right? Prefix SES = d where D = 2d-1, so prefix SES = (D+1)/2. Yes halves.

But there's a catch: recursion on prefix could itself be large in size (N,M big) with small SES — fine, that's the fast case.

Performance concern: the middle snake search is O((N+M) * D_local) per call; total across recursion = O((N+M) * D) overall? The standard result: total time O((N+M)·D) — actually it's O(N+M) per level times... hmm, sum over levels: at each level, subproblems' (N+M) sum ≤ N+M, and D halves per level, so total = (N+M)(D + D/2 + D/4 + ...) = O((N+M)D). Good.

Also add prefix/suffix trimming at top of each diff call to speed up the 20000-line case (D small there but trimming avoids... actually trimming helps constant factor and also handles the huge common mass quickly: trimming 20000-line common prefix is O(N). Without trimming, middle snake search still fast since D small. But trimming is cheap and helps).

Optimization: use arrays with offset indexing instead of dicts for vf/vb. Size: 2*max_d+3. max_d = (N+M+1)//2 could be large for completely different 1000+1000: max_d ≈ 1000, arrays size ~2000. Fine. But we only fill up to found d. Allocation per call: allocate full 2*max_d+3 array each call — for the big-diff case, recursion at top allocates ~2000*2 ints per call, number of calls O(log D) per branch → total calls O(D)? Hmm, number of recursion calls: it's like a binary tree with depth log D, but each internal node splits into two — total nodes O(D)? Let's see: T(D) = T(d) + T(d-1) + O(search). Number of nodes ~ O(D) at worst (like Fibonacci-ish but balanced → 2^logD = D). Each node does a search costing O((N_local+M_local) * d_local). Sum over tree: total work O((N+M)·D) as argued (geometric in D per level, sizes sum ≤ N+M per level). Number of nodes is at most... each node has SES ≥ 1 (unless base case); nodes with SES ≥ 1: the tree splits D into d and d-1; number of leaves ~ D. So O(D) nodes, each allocating arrays of size 2*max_d_local — max_d_local for a node with SES s and size n_local: max_d = (n+m+1)/2 which could be huge even if SES small (e.g., 20000-size window with SES 1). Allocating 2*20000 ints per node × O(D) nodes = too much? For our target workloads: 20000 lines differing in ~50 places: D ~ 50-100, nodes ~ D ~ 100, each allocating arrays of size ~2*(N_local+M_local+1)/2 ≈ N+M ≈ 40000 → 100 × 40000 = 4M ints allocated total across calls (not simultaneously). That's fine, but allocation cost each time ~40000 element list creation — 100 times → 4M operations, OK under 2s? Each list creation of 40000 zeros takes ~0.2ms... times 100 nodes = 20ms. Fine. Plus the search itself: O(N+M) per d per node: 40000 × 50 × ... hmm wait: per node, search is O((N+M) · d_local). Node with d_local=50 and N+M=40000 → 2M ops. Then children each ~ d=25... geometric: 2M + 2M + ... ≈ 4M... wait 2M × (1 + 1 + ...)? Per level total (N+M)·d summed: level 0: 40000×50 = 2M; level 1: two nodes each ~(window)×25; window sizes sum ≈ 40000 → 40000×25 = 1M; level 2: 0.5M... total ≈ 4M ops. Fine. Plus trimming: O(window) per node, windows sum geometric too? Trimming is O(window) per node; total nodes ~100, windows could each be ~40000 → 4M. Fine.

For completely different 1000+1000: D = 2000 (all - then all +? SES length = N+M = 2000 when no common lines). Search at root: (2000) × d up to 1000 → 2M ops. Recursion: splits into halves each SES ~1000; depth log2(2000) ≈ 11; per level cost ≈ (sum of window sizes) × d_level ≈ 2000 × 1000 × ... wait per level d halves too: level 0: 2000×1000 = 2M; level 1: 2000×500 = 1M; total ≈ 4M ops. Under 6s easily in Python? 4M Python-level loop iterations ~ 2-4s maybe. Hmm, Python is slow: each iteration of the inner k-loop does several operations. The search inner work per (d, k) pair includes while-slide. For completely different sequences, slides are ~0 (no common lines except... "completely different" → no equal lines at all → slides never advance). So per (d,k): ~10-15 Python bytecode ops. Number of (d,k) pairs at root: sum over d of (d+1)/... k loop runs d+1 iterations step 2 → ~d/2 per d, for d up to 1000 → total ~ d^2/4 ≈ 250k pairs per branch (forward+backward → 500k), each ~15 ops → 7.5M ops ≈ 1-2s at root alone. Then recursion: level 1: two nodes, d up to 500: each ~125k pairs forward+backward... total per level: pairs ≈ (window_d^2/2 summed) — windows d halves → per level: 2 nodes × 500^2/2 × 2 branches = 500k pairs. Level 2: 4 nodes × 250^2/2 × 2 = 250k pairs. Total ≈ 500k + 250k + ... ≈ 1M pairs × ~15 ops ≈ 15M ops ≈ 3-6s. Hmm, borderline for 6 seconds. Need to optimize constants.

Optimizations:
1. Trim prefix/suffix at each node — reduces window. For completely different sequences, trimming does nothing. Hmm.
2. Use local variable caching, minimal attribute lookups.
3. Early termination: check delta and bound: if no common elements at all, SES = N+M — we could detect "no common lines" quickly via set intersection; if intersection empty, output all "-" then all "+". That handles the 1000-completely-different case in O(N+M)! "Completely different" presumably means no common lines. But to be safe against adversarial "completely different" meaning mostly different but some common, still need algorithm. The set-intersection shortcut is legitimate and helps exactly the stated benchmark. But careful: even if intersection nonempty but small, algorithm must still run. Let's also add: if one sequence's set has tiny intersection... no, just do the general algorithm well.

Also, another classic optimization: strip common prefix/suffix (done), and also handle the case where after trimming, min(N,M)==0.

Let me estimate more carefully with optimized inner loops. Write the search with local vars, integer lists with offset, and inline comparisons.

Alternative approach: use the simpler "store V per d for backtrack" forward-only Myers with memory D×(2D+1)? For D=2000: 2000 × 4001 ints = 8M ints ≈ 300MB as Python ints in lists (each list slot 8 bytes pointer + int objects small cached ≤256... values up to 20000, ints ~28 bytes each but many duplicates... pointers 8 bytes → 64MB for pointer arrays + int objects). Hmm risky. And time: forward-only: sum over d of d steps = D^2/2 = 2M k-iterations × branches... same as divide and conquer root cost but no recursion overhead. Actually forward-only with backtracking: cost = sum_{d=0}^{D} (d+1) × 2 ≈ D² = 4M k-iterations for D=2000. That's worse than divide-and-conquer's ~1M. So stick with middle-snake.

Wait, recount divide-and-conquer for D=2000: level 0: d goes 0..1000 (max_d = (N+M+1)//2 = 1000), k-loop per d has ~d/2+1 iterations, total ≈ sum_{d=0}^{1000} (d/2) × 2 (forward+backward) ≈ 500k. Level 1: each child max_d = (child window + 1)/2 ≈ 500 → two children × sum ≈ 250k×2 = 500k. Level 2: 4 × 125k... wait child of child: window halves, d halves: level 2: 4 nodes × sum_{d≤250} ≈ 31k × 2 ≈ 62k each → 250k. Hmm: level L: 2^L nodes × (d_L²/2)×2 where d_L = 1000/2^L → 2^L × 10^6/4^L = 10^6/2^L. Total ≈ 2M k-iterations. Each iteration ~15-20 bytecodes → 30-40M bytecode ops → maybe 3-5s in CPython. Tight vs 6s but probably OK. Add the empty-intersection shortcut and trimming to speed the benchmark case; the general worst case here is acceptable.

Can we do better? Micro-optimizations for the inner loop:

- Use lists vf, vb preallocated to size 2*max_d+3 with offset of = max_d+1.
- Inline the while slide with direct list indexing; cache a and b in locals.
- Avoid tuple returns overhead — minor.

Also trim: while a[ax]==b[bx] etc.

Another optimization: check for the trivial case where the two trimmed windows share no elements (set intersection empty) → output all "-" then all "+" directly. This makes the stated 1000-completely-different benchmark O(N+M). Good safety.

Also: memoize? Not needed.

Also, handle the case N==0 → all "+", M==0 → all "-". And after trimming both nonempty.

One more important correctness point: the algorithm must produce LCS-maximal "=" count, i.e., minimal number of edits — Myers guarantees minimal D (edit script length), which implies maximal "=" count (since =count = (len(a)+len(b)-D)/2... check: script length = (#-) + (#+) + (#=); a is reconstructed by =+− so #- + #= = len(a); #+ + #= = len(b); sum: #−+#+2#= = len(a)+len(b) → script len = len(a)+len(b) − #=. So minimizing script length maximizes #=. ✓).

Now implement:

```python
def diff_lines(a, b):
    out = []
    _diff(a, 0, len(a), b, 0, len(b), out)
    return out
```

_diff(aa, a0, a1, bb, b0, b1, out): operates on aa[a0:a1] vs bb[b0:b1].

Steps:
1. Trim prefix: while a0 < a1 and b0 < b1 and aa[a0] == bb[b0]: out.append(("=", aa[a0])); a0+=1; b0+=1.
2. Trim suffix: collect into temp list then append after? Order matters: suffix "=" lines must come after middle content. So gather suffix lines in a list suf, then process middle, then extend out with suf.
3. N = a1-a0, M = b1-b0.
4. If N == 0: for i in b0..b1: out.append(("+", bb[i])); then extend suffix; return. If M == 0 similarly "-".
5. Quick check: if there are no common lines between windows (use set): if not (set(aa[a0:a1]) & set(bb[b0:b1])): append all "-" then all "+"... wait order: to reconstruct a: "-" lines + "=" → all "-" then... "=" none; to reconstruct b: "+" lines. Order among - and + doesn't matter for reconstruction, but convention: "-" then "+". Append ("-", line) for each a, then ("+", line) for each b. Then extend suffix. Return. (This shortcut is also correct minimal: SES = N+M.)
6. Otherwise, find middle snake and recurse.

Wait — step 5's set creation is O(window) which is fine, but for the 20000-line near-identical case, set of 20000 strings built at root and each recursion node... set building 20000 elems ~ 1-2ms; nodes ~ 100 → 200ms. Hmm, borderline but OK. Could limit: only do the set check if window is small? Or skip set check when... Actually, the set check mainly helps the completely-different case. Alternative: skip the set shortcut entirely and rely on the algorithm speed. For completely different 1000+1000, root search cost: max_d = 1000, k-iterations ≈ sum_{d=0}^{1000} 2×(d/2+1) ≈ 500k. With slide attempts failing immediately (2 index comparisons each). Let's estimate ~500k × 20 bytecodes = 10M → ~1s for root. Then recursion halves: total maybe 2-3s. Under 6s. But adding the set shortcut makes it ~instant. Trade-off: set shortcut costs O(window) hashing per node — for near-identical 20000 case: root window 20000 → set build ~2ms... strings hash cached? Python str hash is cached per object after first computation, and lines from the same list are the same objects, so hashing is fast. Two sets of 20000 + intersection ~ 5ms. Nodes ~ 50-100 (D~100 → nodes ~ D=100?) Actually nodes count: tree where each node splits into 2, leaves ~ D... number of internal nodes ~ D. Each node builds sets of its window: windows shrink geometrically? Window sizes: root 20000, children windows sum ≈ 20000 + ... roughly geometric: level total ≈ 20000, 20000, ...? Hmm: prefix window + suffix window = (N+M) roughly (snake removes a bit). At level 1: two windows summing ~20000. Level 2: four windows summing ~20000. With ~log2(D)≈7 levels... wait depth is log2(D) ≈ 7 for D=100, nodes total ≈ 2^7 = 128, total set work ≈ 128 × avg window... level L has 2^L windows totaling ~20000 → set work per level ~ O(20000) → total ~7 × 20000 = 140k hash-ops. Fine.

Hmm, but actually for the near-identical case trimming already reduces windows massively: root trims common prefix and suffix — if 50 differing places are scattered, first trim stops at first difference, so window stays ~20000. Then middle snake search with D~50: search cost (N+M)×d ≈ 20000×25(avg k count...) — k iterations per d ≈ d, pairs per d ≈ 2×(d/2)=d... total ≈ sum_{d=0}^{25}? Wait max_d for the search isn't bounded by expected D — the search loops d until overlap found, which will be at d ≈ D/2 ≈ 25-50. Search cost ≈ (N+M) × d_found ≈ 20000 × 50 = 1M k-iterations? No wait: per d, k-loop has d+1 iterations (step 2 → (d+1)/2... range(-d, d+1, 2) has d+1 elements when d even? For d elements: number = d+1... range(-d,d+1,2) count = d+1. Hmm: -d, -d+2, ..., d → count d+1. So per d, forward d+1 iterations + backward d+1 → 2(d+1). Sum over d=0..50 → ~2600 k-iterations, each involving computing x, slide attempts (slide comparisons: for near-identical, slides can be long — the slide is O(window) worst per k? Total slide work per d is O(N+M) amortized? No — slides are not amortized across k in the same d easily; each k's slide can traverse long runs. Worst case per d: O(N+M) total? Actually each diagonal's slide is bounded by window size, and there are d+1 diagonals → O((N+M)·d) total, that's the known bound. For near-identical, most diagonals can't slide (only diagonals through common regions slide)... In the worst case it's fine: 20000 × 50 × 2 = 2M slide steps worst case, realistically far less. OK under 2s.

Let me now write clean code.

```python
def diff_lines(a, b):
    out = []
    _diff(a, 0, len(a), b, 0, len(b), out)
    return out


def _diff(a, a0, a1, b, b0, b1, out):
    # trim common prefix
    while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
        out.append(("=", a[a0]))
        a0 += 1
        b0 += 1
    # trim common suffix
    suf = []
    while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
        suf.append(("=", a[a1 - 1]))
        a1 -= 1
        b1 -= 1
    n = a1 - a0
    m = b1 - b0
    if n == 0:
        for i in range(b0, b1):
            out.append(("+", b[i]))
    elif m == 0:
        for i in range(a0, a1):
            out.append(("-", a[i]))
    elif not (set(a[a0:a1]) & set(b[b0:b1])):
        for i in range(a0, a1):
            out.append(("-", a[i]))
        for i in range(b0, b1):
            out.append(("+", b[i]))
    else:
        _middle(a, a0, n, b, b0, m, out)
    suf.reverse()
    out.extend(suf)
```

Wait, in _middle I'll pass a0 and n (window length) — the middle snake algorithm works on window coordinates a[a0 + x]. Let me define _middle(a, a0, n, b, b0, m, out) where window is a[a0:a0+n], b[b0:b0+m].

_middle:

```python
def _middle(a, a0, n, b, b0, m, out):
    max_d = (n + m + 1) // 2
    delta = n - m
    odd = delta & 1
    size = 2 * max_d + 1
    off = max_d
    vf = [0] * (size + 2)
    vb = [0] * (size + 2)
    vf[off + 1] = 0
    vb[off + 1] = 0
    d = 0
    while True:
        # forward
        if odd:
            lo = -(d - 1) if d > 0 else ... 
        for k in range(-d, d + 1, 2):
            km = off + k
            if k == -d or (k != d and vf[km - 1] < vf[km + 1]):
                x = vf[km + 1]
            else:
                x = vf[km - 1] + 1
            y = x - k
            xs = x
            ys = y
            ax = a0 + x
            bx = b0 + y
            while ax < a1... 
```

Hmm need absolute bounds: a_end = a0 + n, b_end = b0 + m.

```python
            aend = a0 + n
            bend = b0 + m
            while ax < aend and bx < bend and a[ax] == b[bx]:
                ax += 1; bx += 1
            x = ax - a0
            vf[km] = x
            if odd and -(d - 1) <= k - delta <= d - 1 and x + vb[off + delta - k] >= n:
                # snake from (xs, ys) to (x, y); d_total = 2d - 1
                _diff(a, a0, a0 + xs, b, b0, b0 + ys, out)   # prefix uses coordinates relative... 
```

Wait — careful: prefix for the decomposition is a[window_start : a0 + xs]... but xs is relative to window start a0. The prefix window in absolute coords: a[a0 : a0+xs], b[b0 : b0+ys]. Then emit "=" for the snake: lines a[a0+xs : a0+x] paired — each is ("=", a[a0+i]). Then suffix: _diff(a, a0+x, a0+n, b, b0+y, b0+m, out).

Hold on — but the recursion boundary: the prefix call will itself trim etc. Fine.

But wait: is the decomposition "prefix = up to snake start" correct for the forward/odd case? Earlier analysis: forward path to snake start (xs,ys) has d edits; suffix from snake end (x,y): backward path length d-1. Yes.

For the backward/even case: snake start original = (n - x, m - y), snake end = (n - xs, m - ys) where x,ys... careful: in backward branch, x,y are end-coords after sliding; xs,ys before sliding. Original coords: snake segment from (n - x, m - y) to (n - xs, m - ys). Prefix = window[0 : n-x] × [0 : m-y]; suffix = window[n-xs : n] × [m-ys : m]. Return d_total = 2d.

Wait check Coglan returns for backward: `return 2 * d, n - x, m - y, n - x0, m - y0` — snake start (n-x, m-y), snake end (n - x0, m - y0). And snake lines: a[n-x : n-x0]. Since x >= x0 (sliding increases), n - x <= n - x0. ✓.

Backward slide condition: a[a0 + n - x - 1] == b[b0 + m - y - 1].

Backward overlap check: for reversed diagonal k: check if not odd and -d <= k - delta <= d and vb[off+k] + vf[off + delta - k] >= n. Then d_total = 2d, snake start (n - x, m - y), snake end (n - xs, m - ys).

Hmm wait, need to double check the even-case overlap condition indexing: forward diagonal of the meeting point: meeting point original diagonal k_orig satisfies k_orig = delta - k_rev. Forward vf indexed by k_orig: vf[off + delta - k]. Condition vf[off + delta - k] >= n - vb[off + k] i.e. sum >= n. And k range: forward has computed diagonal delta - k iff |delta - k| <= d → -d <= k - delta <= d. ✓ matches Coglan.

And odd-case check after forward: k is forward diagonal; backward diagonal = delta - k; backward computed iff |delta - k| <= d - 1. Condition vf[off+k] + vb[off + delta - k] >= n. ✓.

But note in odd case, when d = 0: check range -(d-1)..(d-1) = 0..-1 empty → no check. Good (avoid weird).

Also vf[off+1] = 0 initialization: at d=0, k=0: k == -d → x = vf[off + 1] = 0. ✓. Similarly backward.

Edge: max_d could be 0? Only if n+m+1 <= 2 → n+m <= 1, but we handle n==0/m==0 before, so n>=1,m>=1 → max_d >= 1. Fine. Loop guaranteed to terminate: overlap must be found by d = max_d. Proof standard. But to be safe, while True with the guarantee.

Hmm, one subtle thing about the odd-case check when d - 1 < 0 handled above.

Another subtlety: in odd case, the check `-(d-1) <= k - delta <= d-1` — but also need k in forward's own range which it is.

Also potential issue: when delta - k index out of vb array bounds? |delta - k| <= d - 1 <= max_d, and delta - k >= -(d-1) >= -(max_d - 1), within array since off = max_d and array size 2*max_d+3. ✓.

Now recursion depth concern: Python default recursion limit 1000. Depth ~ log2(D) + constant. D ≤ N+M ≤ 40000 → depth ≤ ~16+. But worst-case splitting isn't perfectly balanced? We showed prefix SES = ceil-ish half. Depth = O(log D). Safe. But _diff also recurses; depth bounded similarly. OK. Still, to be safe could convert to iterative with explicit stack — not necessary but cheap? Let's keep recursion; maybe raise setrecursionlimit? Depth is small. Fine.

Now performance of _middle inner loop in CPython. Let me write it tight:

```python
def _middle(a, a0, n, b, b0, m, out):
    aend = a0 + n
    bend = b0 + m
    delta = n - m
    odd = (delta & 1) == 1
    max_d = (n + m + 1) // 2
    off = max_d + 1
    vf = [0] * (2 * off)
    vb = [0] * (2 * off)
    # index: off + k, k in [-max_d, max_d]; need off+1 <= 2*off - 1 → off >= 2? 
```

Array size: need indices off + k for k in [-max_d-? , max_d+1] (we access km+1 up to off + max_d + 1 and km-1 down to off - max_d - 1). So size must be ≥ 2*max_d + 3. Set size = 2*max_d + 3, off = max_d + 1.

Let me write:

```python
def _middle(a, a0, n, b, b0, m, out):
    aend = a0 + n
    bend = b0 + m
    delta = n - m
    odd = delta & 1
    max_d = (n + m + 1) // 2
    off = max_d + 1
    vf = [0] * (2 * max_d + 3)
    vb = [0] * (2 * max_d + 3)
    d = 0
    while True:
        # forward pass
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d:
                x = vf[i + 1]
            elif k != d and vf[i - 1] < vf[i + 1]:
                x = vf[i + 1]
            else:
                x = vf[i - 1] + 1
            y = x - k
            xs = x
            xa = a0 + x
            xb = b0 + y
            while xa < aend and xb < bend and a[xa] == b[xb]:
                xa += 1
                xb += 1
            x = xa - a0
            vf[i] = x
            if odd:
                kt = k - delta
                if -d < kt <= d - 1 and x + vb[off + delta - k] >= n:
                    # found: d_total = 2*d - 1
                    _diff(a, a0, a0 + xs, b, b0, y, out)
                    for i2 in range(a0 + xs, xa):
                        out.append(("=", a[i2]))
                    _diff(a, xa, aend, b, b0 + y, bend, out)
                    return
        # backward pass
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d:
                x = vb[i + 1]
            elif k != d and vb[i - 1] < vb[i + 1]:
                x = vb[i + 1]
            else:
                x = vb[i - 1] + 1
            y = x - k
            xs = x
            xa = aend - x
            xb = bend - y
            while xa > a0 and xb > b0 and a[xa - 1] == b[xb - 1]:
                xa -= 1
                xb -= 1
            x = aend - xa
            vb[i] = x
            if not odd:
                kt = k - delta
                if -d <= kt <= d and vb[i] + vf[off + delta - k] >= n:
                    sx = aend - x   # snake start (original coords)
                    sy = bend - y
                    ex = aend - xs  # snake end
                    ey = bend - ys
                    _diff(a, a0, sx, b, b0, sy, out)
                    for i2 in range(sx, ex):
                        out.append(("=", a[i2]))
                    _diff(a, ex, aend, b, ey, bend, out)
                    return
        d += 1
```

Wait — in the forward found-branch, y = x - k where x is pre-slide value; but after sliding I overwrote x. I saved xs = x (pre-slide x). y pre-slide = xs - k. And post-slide y = (xa - a0) - k. Let me recompute carefully: pre-slide point (xs, ys) with ys = xs - k. After slide, (x2, y2) = (xa - a0, xb - b0). The snake: a[a0+xs : a0+x2] with b[b0+ys : b0+y2]. Prefix window: a[a0 : a0+xs], b[b0 : b0+ys]. Suffix: a[a0+x2 : aend], b[b0+y2 : bend].

In my code above I wrote `x = xa - a0` then used `y`... I set `y = x - k` before slide (pre-slide y). After slide, x reassigned. So post-slide y should be recomputed: y2 = x - k (with new x). Let me rename to avoid bugs: use xs, ys pre-slide; x2, y2 post-slide.

Forward:
```
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d or (k != d and vf[i - 1] < vf[i + 1]):
                x = vf[i + 1]
            else:
                x = vf[i - 1] + 1
            xs = x
            ys = x - k
            xa = a0 + x
            xb = b0 + ys
            while xa < aend and xb < bend and a[xa] == b[xb]:
                xa += 1
                xb += 1
            x2 = xa - a0
            vf[i] = x2
            if odd:
                kt = k - delta
                if -d < kt < d and x2 + vb[off + delta - k] >= n:
                    _diff(a, a0, a0 + xs, b, b0, b0 + ys, out)
                    for t in range(a0 + xs, xa):
                        out.append(("=", a[t]))
                    _diff(a, xa, aend, b, xb, bend, out)
                    return
```

Check odd condition range: need |delta - k| <= d - 1 → -(d-1) <= k - delta <= d-1 → -d < kt <= d-1 → -d < kt < d. ✓ (kt integer).

Also guard d == 0 in odd check: -0 < kt < 0 → empty. ✓.

Backward:
```
        for k in range(-d, d + 1, 2):
            i = off + k
            if k == -d or (k != d and vb[i - 1] < vb[i + 1]):
                x = vb[i + 1]
            else:
                x = vb[i - 1] + 1
            xs = x
            ys = x - k
            xa = aend - x
            xb = bend - ys
            while xa > a0 and xb > b0 and a[xa - 1] == b[xb - 1]:
                xa -= 1
                xb -= 1
            x2 = aend - xa
            vb[i] = x2
            if not odd:
                kt = k - delta
                if -d <= kt <= d and x2 + vf[off + delta - k] >= n:
                    _diff(a, a0, xa, b, b0, xb, out)
                    for t in range(xa, aend - xs):
                        out.append(("=", a[t]))
                    _diff(a, aend - xs, aend, b, bend - ys, bend, out)
                    return
        d += 1
```

Check even condition: |delta - k| <= d → -d <= k - delta <= d. ✓.

Even-case snake: start original = (aend - x2, bend - y2) = (xa, xb) post-slide (since xa = aend - x2). ✓ matches code (prefix up to xa, xb). Snake end = (aend - xs, bend - ys). ✓.

Hmm wait, check the backward found condition uses vf[off + delta - k]: forward diagonal delta - k must have been computed this iteration or earlier: |delta - k| <= d ✓ since forward loop ran for this d with |k_f| <= d.

But subtle: forward computed vf for diagonal delta - k at this d — value valid. ✓.

One more subtlety in backward: when d == 0, k == 0, condition -0 <= kt <= 0 → kt == 0 → k == delta → requires delta == 0. Then check vb[off] + vf[off + delta] = common suffix + common prefix >= n → sequences identical. ✓.

Termination guarantee: if sequences have at least one common subsequence... Myers theorem: found by d = max_d. Since we pre-checked sets intersect (in _diff, before calling _middle), there's at least one common line → LCS ≥ 1 → D ≤ n + m - 1 → parity: D = n + m - 2*LCS. The loop finds at d = ceil(D/2) ≤ (n+m-1+1)/2 = max_d. ✓ terminates.

Hmm, actually is the guarantee that overlap is found exactly at d = ceil(D/2)? The standard result: forward d-path and backward (D - d)-path... The check structure: odd → check after forward d against backward d-1: overlap iff D <= 2d - 1? At d = (D+1)/2, 2d-1 = D. Yes found at d = ceil(D/2). Even: check after backward d against forward d: found when 2d >= D → d = D/2 = ceil(D/2). ✓ ≤ max_d = ceil((n+m)/2) ≥ ceil(D/2) since D ≤ n+m. ✓.

Now the "=" output for snake in forward case: snake lines a[a0+xs : xa] — all equal to b lines. ✓.

Now _diff recursion: note _diff calls _middle which calls _diff — mutual recursion, depth fine.

Now double check reconstruction property with the shortcut "no common lines": output "-"*n then "+"*m: "="+"-" subsequence = all "-" lines in order = a ✓; "="+"+" = "+" lines = b ✓. And minimal: D = n+m maximal -=0 = LCS = 0 ✓.

Check trimming correctness: trimming common prefix emits "=" immediately — but wait, is it safe to greedily emit common prefix "="? Greedy prefix matching preserves LCS optimality? Hmm — trimming common prefix: LCS(a,b) where a = p+a', b = p+b' equals p + LCS(a',b'). Yes, standard: any LCS can be assumed to match the common prefix greedily? Careful: LCS(a,b) = len(p) + LCS(a', b')? Is that always true? Yes — standard result: common prefix can be stripped without affecting LCS length. Proof: consider any LCS of a,b; ... hmm, is it exactly true? Example: a = [x, y], b = [x, z, y]? Common prefix [x]; a' = [y], b' = [z, y]; LCS(a',b') = [y] → total 2. LCS(a,b): [x,y] length 2 ✓. Another: a = [x,a], b = [x,a] trivial. Potential counterexample: stripping prefix forces suboptimal? Known theorem: yes, LCS length is preserved when stripping common prefix and suffix. Because if p is common prefix, any common subsequence S of a',b' extended by p is common of a,b → LCS(a,b) ≥ |p| + LCS(a',b'); conversely any common subsequence of a,b: does it contain p? Not necessarily, but |CS| ≤ |p| + LCS(a',b')? Hmm: take common subsequence C of a,b with |C| = LCS(a,b). Claim |C| ≤ |p| + LCS(a',b'). Consider C; match greedily... Suppose C doesn't start with x (=p[0]). C matches some occurrence... Let me think: a = p·a', b = p·b'. Any common subsequence C of a,b: map C into a and into b. The elements of C that match within the a' part of a: those must match in b at positions ≥ |p|... hmm not exactly — they could match within the p part of b. Let me just trust the well-known result: yes, it's standard and true. Quick argument: Let C be a common subsequence of a,b. Construct C' = C's matches... Alternative clean argument: LCS(a, b) where a = p+a', b = p+b'. Consider optimal alignment; if the first characters matched aren't p[0] with p[0]... Actually known lemma: LCS(x+p, y+p)... Let me verify with a potential counterexample: a = [1, 2], b = [1, 2] with prefix... trivial. Try: a = [1, 2, 1], b = [1, 2, 3, 1]? Common prefix [1]; a' = [2,1], b' = [2,3,1]; LCS(a',b') = [2,1] (2). Total 3. LCS(a,b): [1,2,1] = 3 ✓. Try to break: a = [1, 2], b = [1, 1, 2]: prefix [1]; a'=[2], b'=[1,2]; LCS = [2] → 2. LCS(a,b) = [1,2] = 2 ✓. Counterexample attempt where prefix element needed elsewhere: a = [1, 1], b = [1, 2, 1]: prefix [1]; a' = [1], b' = [2, 1]; LCS(a',b') = [1] → total 2; LCS(a,b) = [1,1] = 2 ✓. Hmm a = [1,1], b = [1,2,1] LCS is 2 either way. Try a = [1, 2, 1], b = [1, 3, 1, 2]? prefix [1]; a' = [2,1], b' = [3,1,2]; LCS(a',b') = [2] or [1] → 1; total 2. LCS(a,b): [1,2] or [1,1] → 2 ✓. Seems robust; it's a standard lemma (used in every production diff). Fine.

But wait — greedy prefix trimming affecting *which* minimal script we output is fine; any minimal script acceptable.

Suffix trimming: gather then append reversed at end. ✓ (I append suffix "=" lines then reverse).

Hmm, in _diff the suffix list: I append ("=", a[a1-1]) while decrementing — collected in reverse order, then `suf.reverse()` before extending. ✓.

Edge: after trimming, if both n==0 and m==0: the if/elif handles n==0 → "+" loop empty → nothing. ✓.

Now think again about performance for the 20000-case with ~50 differing places. "differ in about 50 places" — could mean 50 changed lines, D ≈ 50–100. The trimming at root stops at first difference — window ≈ 20000. _middle search: d up to ~25–50, per d 2(d+1) k-iterations → ~2500 iterations; each does slide attempts. The slide for a given k: bounded by window but in practice, for near-identical sequences, most k values have no slide; some slide a lot? Forward paths on diagonal k where sequences align... The total slide work: worst case per d is O(N+M) (each k's slide ≤ N+M, but sum over k of slides ≤ ?) Not amortized — worst-case bound (N+M)·d. Realistic: near-identical → slides happen only along "correct" diagonals; roughly each d adds O(diff region size) slides. Should be fast.

Recursion: prefix window ~20000 with SES d≈25; suffix ~20000 with SES 24... each recurses. Total nodes ~ D ≈ 50–100, each doing a search costing window × d_local... Root: 20000 × 50? No wait — root search: d loops 0..25 (if D≈50, delta parity...). Cost ≈ sum 2(d+1) × (slide work per k). Slide work per k per d: each k tries to slide; the slide only advances while lines equal; near-identical sequences: from most (x,y) points on diagonal k, a[x] != b[y] quickly? Hmm, actually in near-identical sequences, at any point (x,y) with x==y (diagonal 0), a[x]==b[y] except at the 50 difference spots. For diagonal k≠0, a[a0+x] vs b[b0+x-k] — these are different lines most of the time unless coincidence. So slides are short except near diagonal 0 and near aligned regions. Roughly per d: O(d + diff regions) work. Total root search ~ small. 

But the per-iteration constant: each k-iteration ~ 15–25 bytecode ops. Root: 2×sum_{d=0..50}(d+1) ≈ 2600 iterations → trivial. Recursion: each node's search d_local ≈ half of parent's, window ~20000 but slides short. Total k-iterations ≈ 2600 × (1 + 2×(1/2) + ...) hmm nodes double but d halves: per level, total k-iterations = nodes × 2×d_local ≈ 2^L × 2 × 50/2^L = 100 per level? Plus trimming O(window) per node: per level total window ≈ 40000 → level work 40000 comparisons... 7-ish levels → 300k. All trivial. Well under 2s. ✓.

And set() construction per node: window 20000 strings → ~1ms per node × 100 nodes... hmm 100ms. Acceptable but let's reconsider: is the set-intersection shortcut worth it? It saves the completely-different case. Alternative cheaper heuristic: skip set check when window is large? But then completely-different 1000+1000 falls to general algorithm: root search d up to 1000 → ~500k k-iterations ≈ maybe 1.5-3s, plus recursion → possibly near 6s limit. Risky. Keep the set check. Cost for near-identical case: sets of ~20000 each per node... Let me reduce: only compute sets if window size ≤ some threshold? No — the completely-different case has window 1000. The near-identical case has window 20000. Threshold won't distinguish.

Better: make set construction cheap: building set from list slice: set(a[a0:a1]) — slicing copies 20000 refs, set insert 20000 with cached hashes (str hashes cached). ~1–2ms. Intersection check ~1ms. Per node ~3ms × ~100 nodes = 300ms. Hmm. That plus everything else still well under 2s? Probably total < 0.5s. Acceptable. 

Alternatively, only do the set check at the top-level call (depth 0) and small windows? The completely-different recursion: root set check catches it entirely (no common lines → done, no recursion). Near-identical: root set check runs once (~3ms), children have small D... but children windows still ~20000 each and if I only check at root, children skip set check — good. But then some deep node with a fully-disjoint window would go through the slow path — rare, acceptable. Let's do: perform set shortcut only when window size ≤ 3000 OR depth == 0? Hmm, complexity. Simpler: always do set check but note near-identical windows... Actually wait: in near-identical case, do children windows stay ~20000? Prefix window = up to snake start. Root: 50 differences scattered over 20000; snake found somewhere in the middle... prefix window could be ~10000, suffix ~10000, then each splits again → level L windows ~20000/2^L. So set cost per level ≈ 20000 → 7 levels → 140k insertions ≈ 30ms total. Oh right, windows halve per level (in edit-count terms the windows... hmm, window sizes: prefix window size isn't necessarily half — prefix SES = d ≈ D/2, but window length could still be huge: e.g., differences clustered: prefix contains 25 differences but could span 19000 lines? If differences clustered in 50 places "about 50 places" — likely spread. Worst case: all 50 differences at the very end: root trims 19950 common prefix lines, window ~50+... then fast. If differences at both ends... trimming handles ends. Middle-clustered: window large but snake splits roughly through middle of the *edit region*... Hmm, prefix = up to snake start; snake is in the middle in edit-distance terms, meaning prefix SES = d/2 — prefix window could be e.g. lines 0..15000 with 25 diffs, suffix 15000..20000 with 25 diffs. Then prefix splits again: window 0..15000, snake at ~7500... windows shrink geometrically in length too, roughly. So set cost fine.)

OK, but also consider pathological: 20000 lines, differences = 50 insertions clustered in one region plus... whatever, it'll be fine.

Actually, let me reconsider whether to include the set shortcut at all, since it changes output for cases where LCS = 0 but... no, it's exactly correct when intersection empty (LCS=0, minimal script = all - then all +). But order convention: I put "-" before "+". Any order valid per spec. ✓.

One more consideration: the problem says "Lines can repeat" — Myers handles that.

Memory: vf/vb arrays sized by max_d of the window — root for completely-different 1000: 2003 ints — fine.

Now let me also double-check the forward recurrence direction conditions. Standard Myers forward:
vf[k] for k in [-d, d]. To compute vf[k] at d: choose between moving down (from diagonal k-1: x = vf[k-1] + 1, i.e., deletion: come from (vf[k-1], vf[k-1]-(k-1)) and move right in a → x+1, same y → new diagonal (x+1) - y = k ✓) or moving right... wait: two move types: from (x,y) delete→(x+1,y) (diagonal +1: from k-1 to k), insert→(x,y+1) (diagonal -1: from k+1 to k). So vf[k] = max(vf[k-1]+1, vf[k+1]) with the constraint... Standard: if k == -d: x = vf[k+1] (only insert move available). If k == d: x = vf[k-1] + 1 (only delete). Else choose the one whose x is larger: if vf[k-1] < vf[k+1] → x = vf[k+1] (insert path further) else x = vf[k-1]+1. My condition: `if k == -d or (k != d and vf[i-1] < vf[i+1]): x = vf[i+1] else x = vf[i-1]+1`. When k == d: first clause false (k==-d only if d==0... if d==0, k==0==-d=d; then condition k==-d true → x = vf[i+1] = vf[off+1] = 0 initial ✓). When k==d≠-d: goes to elif: k != d false → else: x = vf[i-1]+1 ✓. Good.

Backward analogous with vb: backward paths consume from the end; vb[k] = furthest-reaching in end-coordinates (max x end-coords). Move types in end-coords: same recurrence. ✓ (Coglan's code identical structure.)

Backward slide: consumes a[aend - x - 1]... in window coords: absolute index aend - x - 1 where x is end-coord x... wait: end-coord x means we've consumed x characters from the end: last consumed index = aend - x. Next to consume: aend - x - 1. Condition xa > a0 ensures index ≥ a0. ✓.

Now, correctness of found-snake for the odd/forward case: we need the snake to be the *overlap* — the forward slides from (xs,ys) to (x2,y2); the backward (d-1)-path reaches original point (n - vb[delta-k] ... ) hmm. The standard proof ensures the decomposition works. But there's a known subtlety: in the odd case, the overlap between forward d-path and backward (d-1)-path guarantees a middle snake, and using the forward path's final snake as the middle snake is what Coglan does. I'll trust it (it's a widely-used, tested implementation pattern).

Wait, actually let me double-check Coglan's odd-case returned snake endpoints: in his forward branch he returns `2 * d - 1, x0, y0, x, y` where (x0,y0) is pre-slide and (x,y) post-slide. And his find_diff does:

```ruby
d, x, y, u, v = find_middle_snake(a, b)
if d > 1
  find_diff(a[0...x], b[0...y])
  (x...u).each { |i| puts a[i] }   # "=" 
  find_diff(a[u...n], b[v...m])
```

Hmm — but wait, actually I recall in Coglan's part 3 the decomposition checks `if d > 1` and handles d <= 1 specially? Let me think whether d == 1 decomposition works with plain recursion: d=1: prefix SES should be 1, suffix SES 0, or (odd: prefix d=1, suffix 0). Recursion on prefix: prefix window with SES 1: _diff → trim, then if one side empty → single -/+ ✓; else _middle finds d=... prefix SES 1 means D_local = 1 → delta odd, d_local = 1 → snake with prefix empty... fine. If prefix SES 1 and both sides nonempty with common lines? SES 1 means one edit; e.g., a=[x,c], b=[c] (delete x): prefix window n=2,m=1, common line c exists → _middle: delta=1 odd. d=0: forward k=0: x=0,y=0: slide: a[0]=x vs b[0]=c → no. vf[0]=0. odd check: kt = -1, -0 < -1 false. backward d=0: k=0: x=0,y=0, slide: a[1]=c vs b[0]=c → equal! xa = aend-0-1 → consume: xa: from aend=2 → xa=1, xb=0→ wait: xa = aend - x = 2, xb = bend - 0 = 1. Slide while xa > a0(0) and xb > b0(0) and a[xa-1]==b[xb-1]: a[1]=c == b[0]=c ✓ → xa=1, xb=0. xb > b0? xb=0 > 0 false → stop. x2 = aend - xa = 1, vb[0] = 1. Check not odd? delta=1 odd → skip. d=1: forward: k=-1: x = vf[off+0] = 0 → xs=0, ys = 0-(-1)=1. xa=a0+0=0, xb=b0+1=1 ≥ bend → no slide. vf[-1]=0. check: kt=-2, -1 < -2 false. k=1: k==d → x = vf[off+0]+1 = 0+1 = 1, ys=0. xs=1. xa = 1, xb = 0. slide: a[1]=c vs b[0]=c ✓ → xa=2, xb=1; xb<bend? bend=1 → xb=1 not < 1 → stop. x2=2. vf[1]=2. check odd: kt = 1-1 = 0; -1 < 0 < 1 ✓; x2 + vb[off + delta - k] = 2 + vb[off+0] = 2 + 1 = 3 >= n=2 ✓ → found. d_total = 1. Decomposition: prefix a[a0 : a0+xs] = a[0:1] = [x], b[b0 : b0+ys] = b[0:0] = [] → _diff outputs ("-", x) ✓. Snake: a[a0+1 : xa] = a[1:2] = [c] → ("=", c). Suffix: a[2:2], b[1:1] → nothing. Result: "-", "=", correct minimal ✓.

Great, d=1 works without special-casing. But note d_total=1 with snake nonempty; fine.

What about even-case d_total = 0 (identical windows)? But _diff trims full prefix/suffix first, so identical windows reduce to n=m=0 → base case before _middle. Actually if window identical, prefix trim consumes everything → n=m=0 → handled. So _middle never sees identical windows? It could see windows where trim... prefix trim stops at first mismatch, so after trimming, a[a0] != b[b0] and a[a1-1] != b[b1-1] (both sides nonempty). So _middle always has n,m ≥ 1 and first/last lines differ. D_local ≥ 1? Not necessarily — wait, if a[a0] != b[b0] then D ≥ 1 yes (they differ). Could D_local... D ≥ 1 always here. And overlap found at d ≥ 1? D ≥ 1: if D odd found after forward at d=(D+1)/2 ≥ 1 ✓; if D even found after backward at d = D/2 ≥ 1 ✓. But careful: even case with D=0 impossible here. Also the d=0 backward check could trigger falsely? Condition requires x2 + vf[...] >= n with delta==0: x2 = common suffix length s, vf[0] = common prefix length p (computed at forward d=0). p + s >= n. Since a[a0] != b[b0], p = 0. a[a1-1] != b[b1-1] → s = 0. 0 >= n false (n≥1). ✓ no false trigger. Good — trimming first/last mismatch ensures d=0 never returns, avoiding degenerate snake/empty-split infinite recursion. But wait, could there be a false-positive at d=0 giving D=0 for non-identical? Condition delta==0 and p+s ≥ n with p=0,s=0,n≥1 → no. ✓. Also for odd d... fine.

Hmm, but also potential issue: forward found at d with snake, but the decomposition recursion — prefix SES should be exactly d, but is it? We argued via minimality. But the recursion computes minimal script of prefix regardless; total = SES(p) + SES(s) + snake ≥ D_min(window) and our path shows ≤ d + (d-1) + snake... but wait, is the snake length counted right? The script we output: prefix script (SES(p) edits), snake "="s (0 edits... they're "=" items, count toward script length but represent matches). Total edit-script length = SES(p) + SES(s) + snake_len. And D (edit distance) = SES(window) = SES(p) + SES(s) + snake_len must hold if each part minimal: we showed SES(p) ≤ d, SES(s) ≤ d-1 via concrete paths (the forward path to snake start truncated is a valid edit script for prefix? The forward d-path reaches (xs,ys) with d edits — yes that's a script of length d for prefix a[:xs],b[:ys]... wait, does a d-path ending at (xs, ys) correspond to an edit script of length exactly d for the prefix? A path from (0,0) to (xs,ys) with d non-diagonal moves = edit script with d edits transforming... the path covers a[0:xs], b[0:ys] with d edits → SES(prefix) ≤ d ✓. Similarly backward path from (n,m) to snake end... backward path of length d-1 ends (in end-coords) at (xs, ys)? Hmm: in odd case, the backward (d-1)-paths — overlap check: vf[k] + vb[delta - k] >= n means forward reaches x2 ≥ n - vb[delta-k]... The backward path on reversed-diagonal delta - k with length d-1 reaches end-coord x_b = vb[delta-k], original point (n - x_b, m - y_b). Forward post-slide point x2 ≥ n - x_b means forward went at least to the backward path's *start point* (n - x_b, ...) — hmm, backward path starts at (n, m) and its furthest reach in end-coords is x_b, meaning original point (n - x_b, m - y_b) is the deepest point going backward... The backward path covers original points from (n - x_b, m - y_b) to (n, m), i.e., suffix from (n - x_b, m - y_b). Forward reaching x2 ≥ n - x_b on same diagonal: forward path passes through point (n - x_b, m - y_b)? Forward path on diagonal k reaches x2 ≥ n - x_b; since forward paths are continuous and monotonic, it passes through (n - x_b, m - y_b)?? Only if n - x_b ≤ x2 and y-coordinate matches: same diagonal, y = x - k, so point (n - x_b, n - x_b - k); backward point (n - x_b, m - y_b) with m - y_b = (n - x_b) - k_orig where k_orig = delta - k_rev... n - x_b - (m - y_b) = (n-m) - (x_b - y_b) = delta - (delta - k)... wait x_b - y_b = k_rev = delta - k_orig. So diag = delta - k_rev = delta - (delta - k_orig) = k_orig ✓ same diagonal. So forward path passes through the backward path's far endpoint (n - x_b, m - y_b). Then: suffix from (n - x_b, m - y_b) has SES ≤ d - 1 (backward path), and prefix up to... hmm but the snake we output is the forward's snake [(xs,ys) → (x2,y2)], and suffix starts at (x2, y2), not at (n - x_b, m - y_b). Is SES(suffix from (x2,y2)) ≤ d - 1? The backward path covers (n - x_b, m - y_b) → (n, m) with d-1 edits; our suffix is (x2, y2) → (n, m), which is a *sub-window* (starts later, x2 ≥ n - x_b). SES of sub-window ≤ SES of window containing it? Hmm — not necessarily in general! A sub-problem (a[x2:], b[y2:]) vs (a[n-x_b:], b[m-y_b:]) — the latter's script might use lines before x2. Hmm. But wait — the overlap region: forward path from some point to (x2,y2) overlaps backward path from (n-x_b, m-y_b)... The overlap: forward covers up to x2 ≥ n - x_b on diagonal k; backward covers from n - x_b onward on that diagonal. The overlapping segment on diagonal k: from (n - x_b, ...) to (x2, ...) — all on diagonal k meaning all diagonal moves (matches)? Points on the same diagonal connected by diagonal moves = matches. So the segment from (n-x_b, m-y_b) to (x2, y2) consists of matched characters — it's a common substring (a "snake"). So a[x2:] is a suffix of the snake region... hmm: the snake from (n-x_b) to (x2): characters a[n-x_b : x2] are common. Our output snake is the forward's last snake [(xs,ys)→(x2,y2)] which includes [(n-x_b) → x2] portion (since xs ≤ n - x_b? forward passes through (n-x_b) during its slide, and slide started at (xs,ys) — yes (n-x_b, m-y_b) is within the forward slide, so xs ≤ n - x_b ≤ x2). 

Decomposition validity: script = prefix-diff(a[:xs], b[:ys]) + "="(a[xs:x2]) + suffix-diff(a[x2:], b[y2:]). SES(suffix a[x2:]) ≤ ? We know backward d-1 path covers (n-x_b → n). Suffix from x2 ⊂ suffix from n-x_b. Hmm, need SES(a[x2:], b[y2:]) ≤ d-1. Since a[n-x_b : x2] == b[m-y_b : y2] (common substring), a[x2:] = a[n-x_b:] minus prefix a[n-x_b:x2], similarly b. Any edit script for (a[n-x_b:], b[m-y_b:]) of length d-1... does trimming a common prefix from both sides preserve SES? SES(u+v, w+v)?? no wait: a[n-x_b:] = c + a[x2:], b[m-y_b:] = c + b[y2:] where c is the common snake part. SES(c + s1, c + s2) = SES(s1, s2)? By the prefix-stripping lemma (same as LCS lemma, applied to edit distance): yes, edit distance also satisfies: ED(p+u, p+v) = ED(u,v) when p is a common prefix. Standard. ✓ So SES(suffix) ≤ d-1 ✓. Similarly SES(prefix) ≤ d. Total = SES(p)+SES(s)+snake ≤ d + (d-1) + snake_len. And D = SES(window): the forward d-path + snake + backward path gives a path of d + (d-1) edits + snake diagonal moves from (0,0) to (n,m) → ED(window) ≤ 2d - 1. And loop minimal d → ED = 2d-1 (first d where overlap found... need: ED ≥ 2d-1 because no overlap found at earlier d' — standard Myers lemma: overlap of forward d-path and backward (d-1)-path on same diagonal implies... the lemma states D is found exactly). And our constructed script length = SES(p) + SES(s) + snake. Since it's a valid script for window, ≥ D = 2d-1. And ≤ d + d-1 + snake_len. Hmm — that gives script_len ≥ 2d-1 and ≤ 2d-1 + snake_len?? That's wrong — wait: SES(p) + SES(s) + snake_len: but the path decomposition: d-path to (xs,ys) [d edits], then snake (matches only, 0 edits), then d-1 edits → total edits d + d-1 = 2d-1 = D. The script's length counts "=" items too: script_len = (# edits) + (# =) = (2d-1) + snake_len. And D = SES = edits only = 2d-1. The requirement "number of = items maximal, equals LCS length": #= = LCS = (n + m - D)/2. n + m = (prefix sizes) + snake + (suffix sizes) = (SES(p) + 2·LCS(p)) ... whatever — the key: our script is a valid edit script whose edit count (= script_len - #=) is d + (d-1) = D = minimal → #= is maximal ✓. And recursion on prefix/suffix yields their minimal scripts (edit counts SES(p), SES(s)) — combined edit count = SES(p)+SES(s) ≤ d + (d-1) = D; but also ≥ D? Total edits = SES(p)+SES(s); is it ≥ D? The combined script is valid for window with SES(p)+SES(s) edits ≥ D... wait D = 2d-1 and SES(p)+SES(s) ≤ 2d-1, plus validity gives ≥ D → = D. Hmm but that forces SES(p) = d exactly? SES(p) ≤ d and SES(p)+SES(s) = 2d-1 with SES(s) ≤ d-1 → SES(p) ≥ d → = d. OK consistent. Everything checks out: final script edit-count = D, minimal, and #= maximal (since #= = (n+m-D)/2... only if script reconstructs a and b correctly, which it does). ✓

Even case analogous.

One more check on the even case decomposition: prefix = window[:snake_start] where snake_start = (xa, xb) (post-slide, original coords) — SES(prefix) ≤ d? Forward d-path reaches x2_f = vf[delta - k] ≥ n - vb[k] = snake_start_x... forward path on diagonal delta-k reaches ≥ snake_start → passes through snake_start (since monotonic along diagonal... forward path reaches x2 ≥ sx; does it pass exactly through (sx, sy)? It moves along diagonals with non-diagonal jumps; it reaches x2 on diagonal delta-k; the path visited points on that diagonal with x from (entry) to x2 — includes sx if sx between entry and x2 — entry ≤ sx ≤ x2? sx = n - vb[k] ≤ x2 ✓ (that's the overlap condition). And entry ≤ sx? Entry point on diagonal delta-k is where the path moved onto it, x_entry ≤ ... hmm, need sx ≥ x_entry: the path's positions on diagonal delta-k: it entered at some x_e ≤ x2 and slid/jumped. Actually the path on diagonal delta-k consists of one non-diagonal move onto it then slides; positions covered: [x_e, x2] contiguous? After the move onto the diagonal at x_e, slides to x_f, then maybe later moves off and back? No — furthest-reaching path: once computed vf for diagonal at each d, the path is d moves then final slide... but the path may revisit a diagonal multiple times (move off and back). The furthest-reaching d-path on diagonal k: its last segment on diagonal k ends at vf[k]. It may have left and returned. So does the forward path pass through (sx, sy)? Since vf[delta-k] ≥ sx and the path reaches (vf[delta-k], ...) — the path is monotonic in x, so it passes through every x ≤ vf[k] on... no! It passes x values along its route; between different diagonals. Hmm, but the claim needed: SES(prefix up to snake_start) ≤ d. Alternative cleaner: ED(c+p', ...) hmm. Let me think again: the overlap lemma (Myers paper, lemma 3 or so) states: when forward d-path and backward d'-path overlap on a diagonal, there's a middle snake, and D = d + d'. The decomposition in the paper's linear-space algorithm: "find the middle snake, split, recurse" with the split at the snake endpoints — and the paper proves SES(prefix) ≤ d and SES(suffix) ≤ d' appropriately. The standard implementations (Coglan's, and the well-known Python "myers_diff" ports) do exactly what I wrote. I'll trust the established pattern.

Actually hold on, let me double check Coglan's even-case return: `return 2 * d, n - x, m - y, n - x0, m - y0` where x,y post-slide, x0,y0 pre-slide. And find_diff splits: prefix a[0...x] where x = n - x_post... = snake start ✓; snake from x to u = n - x0 = snake end ✓; suffix from u. Matches my code. ✓.

And Coglan's odd-case: `return 2 * d - 1, x0, y0, x, y` — prefix up to (x0,y0) pre-slide ✓, snake to (x,y) post-slide ✓. Matches.

Now, hmm, one thing: Coglan's find_diff for d > 1 special... I recall his code:

```ruby
def find_diff(a, b)
  ...
end
```

Actually I think there's a subtlety: when d == 1 in the odd case... we showed recursion works. When d == 0 can't happen (post-trim). Even d_total = 2: e.g., one substitution region... recursion: prefix SES 1, suffix SES 1 → both recurse to d=1 cases ✓.

Wait, actually there's a subtle known bug in naive middle-snake implementations regarding the backward branch's overlap check needing forward values from the *current* d (same iteration) — I have forward pass before backward pass in the same iteration, so backward check at d uses forward vf at d ✓. And forward check at d uses backward vb at d-1 (from previous iteration) — required range |delta-k| ≤ d-1 ✓ ensures only d-1 values used... but vb entries for |delta-k| ≤ d-1 were set in previous iterations ✓ (array initialized 0, but indices within range were written... at iteration d-1, backward wrote all k in [-(d-1), d-1] ✓ so all referenced entries are fresh). ✓.

Edge: k range for check `-d < kt < d` where kt = k - delta; also need index off + delta - k within array: |delta - k| ≤ d - 1 ≤ max_d - 1 < off ✓.

Now also guard: in odd case check, we should ensure delta - k within [-d+1, d-1] — the kt check ensures |kt| = |k - delta| ≤ d - 1 ✓.

Now let's also think: could the forward found-snake produce xs > x2? No, slide only advances.

Potential infinite recursion risk: snake length ≥ 0; if snake length 0 (xs == x2), prefix = window[:xs], suffix = window[x2:]. Prefix SES = d ≥ 1, suffix SES = d-1 ≥ 0. Recursion on prefix with SES d ≥ 1... could prefix be identical to the whole window (no progress)? Prefix window is strictly smaller than whole (xs ≥ 0; if xs == 0 and snake empty: prefix empty → base). If xs == 0, prefix empty → fine. Suffix: if x2 == n, suffix empty → fine. Otherwise strictly smaller windows. Each recursion strictly reduces... prefix window length xs < n or (xs == n impossible since snake end ≤ n and if xs == n then snake beyond? no). Actually if xs == n then snake empty at end, prefix = whole window — infinite recursion! Can that happen? xs == n means forward path reached (n, ys) pre-slide with... but n ≤ x means path complete before slide; then overlap check: x2 = n... and prefix = whole window with SES d, recursing on same problem. Hmm: can overlap be detected with xs == n? The check: x2 + vb[delta-k] ≥ n → n + vb ≥ n always true once kt in range. So if forward reaches x2 = n (path consumed all of a) and kt in range, we return with snake possibly at the very end and prefix = whole window → infinite recursion!

Wait but if forward d-path reaches x2 = n, that means d-path covers all of a — then ED ≤ d... hmm, and the found d_total = 2d-1 but actual ED ≤ d < 2d-1 for d ≥ 1. Contradiction? If a forward d-path reaches (n, y) with y = n - k... then ED ≤ d. And the loop would have found overlap earlier? Not necessarily — the loop finds overlap at the first d where the *check* triggers; the check with x2 = n triggers at this d. But ED ≤ d < 2d - 1 means D < 2d-1, and by Myers lemma overlap should have been detected at d' = ceil(D/2) < d. So we'd have returned earlier. Hence reaching this state is impossible... unless the earlier detection failed due to the parity/range conditions? The lemma guarantees detection at d' = ceil(D/2). So at any d where check triggers, D ≥ 2d - 1 (odd case) — i.e., 2d-1 ≤ D... wait no: detection happens exactly at d = ceil(D/2) (first time). For d > ceil(D/2) we've already returned. So when the check triggers at d, d = ceil(D/2) and D = 2d-1 (odd) or 2d (even). So x2 = n with prefix = whole window would imply ED ≤ d < 2d-1 → contradiction → can't happen at the triggering d. Hmm, but wait: does the lemma guarantee detection *no later* than ceil(D/2), or exactly? Detection at first triggering d; lemma: at d = ceil(D/2) the check triggers. Could it trigger earlier (d < ceil(D/2))? That would imply a path of length 2d-1 < D from (0,0) to (n,m) — impossible since D minimal. Actually the check triggering means existence of combined path of length 2d-1 (odd case): forward d-path to snake + snake + backward (d-1)-path from snake end... does check-trigger imply a full path? The check is vf[k] + vb[delta-k] ≥ n: forward reaches x_f ≥ n - x_b on diagonal k. Combined path: forward path to (x_f, y_f), then... we need to connect forward endpoint to backward path. Forward endpoint (x_f, y_f) with x_f ≥ n - x_b; backward path covers original [n - x_b, n]. If x_f ≥ n - x_b, forward endpoint is at or beyond backward path's start. Overlap region on diagonal k from (n-x_b) to x_f is all diagonal (same k) → matches. Combined path: forward to (n - x_b, ...) [≤ d edits... wait forward path reaches (x_f,...) passing through (n-x_b,...) — hmm again the "passes through" question: forward path reaches x_f on diagonal k; its positions on diagonal k before the final slide... ugh. OK the standard proof handles this: the furthest-reaching path on diagonal k at step d: the path reaches (vf[k], vf[k]-k) and its trajectory covers, along diagonal k, a contiguous final slide [xs, vf[k]] plus earlier visits. The point (n - x_b) ≤ vf[k]: is it on the path? The path is monotone; to reach (vf[k], ...) it must cross diagonal k region... Not necessarily pass through (n - x_b, n - x_b - k) exactly. Hmm. But actually for the combined-path argument we don't need the forward path through that point: combine forward path to (x_f, y_f) — endpoint on diagonal k — with backward path: backward path in original coords runs from (n-x_b, m-y_b) to (n, m); in *reverse* it's a path from (n,m) backward... to combine into a full (0,0)→(n,m) path: forward path ends at (x_f, y_f), x_f ≥ n - x_b. We need to get from (x_f, y_f) to (n, m) with d-1 edits: reverse the backward path: backward path reversed = path from (n, m) to (n - x_b, m - y_b) with d-1 moves; we need from (x_f, y_f) ≥ (n-x_b...)... Since x_f ≥ n - x_b and same diagonal: forward endpoint is *further along* than backward start. So: forward path (0,0)→(x_f,y_f) [d edits], then we need (x_f,y_f)→(n,m) [d-1 edits]: the backward path reversed goes (n,m)→(n-x_b, m-y_b); the segment from (x_f, y_f) to (n - x_b, m - y_b) is all diagonal (both on diagonal k, and the backward path's start portion from (n-x_b, ...) going backward... hmm the backward path from (n,m): its first moves are non-diagonal possibly. The overlap segment: backward path positions on diagonal k_rev = delta - k: backward path's final slide (in end-coords) is on... ugh, I'm going too deep. This is the standard well-tested algorithm; the paper proves it. Let me just also add a safety: since trimming guarantees first and last lines differ, xs == n case: forward pre-slide point (xs, ys) with xs = n: but then the path reached x = n at diagonal k before sliding; y = n - k; for the path to have consumed all of a with d edits... then ED ≤ d and detection would've happened earlier — but let me double-check the lemma "detection exactly at ceil(D/2)" includes the range conditions. Myers' lemma (from the paper, Theorem 2 / the linear-space section): "If D is odd, overlap of forward d-paths and backward (d-1)-paths on diagonal k occurs for d = ceil(D/2)..." hmm, hmm. Actually the paper's linear space version checks slightly different things. Let me look at established correct implementations once more.

I recall a widely-cited Python implementation of Myers linear-space ("The Myers diff algorithm" series by James Coglan — his final Ruby code is well tested against difflib). My code mirrors it. Additionally many blog posts ("Myers Diff in Python") use exactly this structure. I'm fairly confident.

But let me add one more safety against pathological infinite recursion: in _diff, guard: if the middle snake decomposition would produce prefix identical to input (xs == 0 and snake len 0 and suffix == whole?) — can't happen simultaneously... Snake len 0 and xs == 0: prefix empty, suffix = whole minus nothing = whole → infinite recursion!! Check: snake empty (xs == x2) and xs == 0: prefix empty (base, no output), snake nothing, suffix = whole window → _diff(a, a0, aend, b, b0, bend) — same window! Infinite loop. Can this occur? It requires the overlap check to trigger with xs = 0 and no slide (x2 = 0): forward path at d with x2 = 0 meaning vf[k] = 0 at d ≥ 1: possible? vf[k] = 0 for k > 0 at d ≥ 1 requires... k > 0 diagonal with x = 0 → y = -k < 0 impossible (y ≥ 0 always? y = x - k ≥ 0 requires x ≥ k... no wait y can't be negative: paths stay in [0,n]×[0,m], so on diagonal k, x ≥ max(0, k)... For k > 0, x ≥ k? Path on diagonal k: y = x - k ≥ 0 → x ≥ k ≥ 1 → x2 ≥ 1 > 0. For k < 0: x ≥ 0, x2 = 0 possible (y = -k > 0): forward path consumed only b-lines (insertions) → x2 = 0. Then check: x2 + vb[delta - k] ≥ n → 0 + vb[delta-k] ≥ n → backward path on reversed diagonal delta - k covers all of a: vb[delta-k] = n, meaning backward (d-1)-path consumed all of a with d-1 edits → ED ≤ d - 1 < 2d - 1 = D claimed → contradiction with detection-time lemma again. So can't happen if lemma holds. Similarly xs == n case shown impossible.

Given the trimming invariant (first and last elements differ), detection happens at d = ceil(D/2) exactly (standard lemma, requires the check as implemented — Coglan's version is tested). I'll trust it but ALSO add a cheap defensive guard: in _middle, if the found decomposition has empty snake and prefix window == whole window or suffix window == whole window... Actually simplest defensive fix: if snake is empty and xs == 0 (prefix empty, suffix == whole): then instead output... hmm. Alternatively add recursion guard: track window identity. Let me think about whether to include. The risk: subtle bug → infinite recursion. Given trimming ensures a[a0] != b[b0] and a[a1-1] != b[b1-1], let me re-verify the key lemma detection timing with these conditions... The lemma doesn't depend on trimming. Let me just carefully prove detection at d* = ceil(D/2):

Forward d-paths and backward d'-paths: define overlap on diagonal k (original coords): forward reaches x_f(k) after d steps; backward (in end coords) reaches x_b with original x = n - x_b(k') where k' = delta - k. Overlap iff x_f + x_b ≥ n.

Claim: for d + d' ≥ D... hmm the precise statement: forward d-path and backward d'-path overlap on some diagonal iff d + d' ≥ D? No — overlap can occur "spuriously"? If they overlap, combining gives a (0,0)→(n,m) path of length ≤ d + d' (the combined path might reuse the overlap... the combined path length is exactly d + d' minus overlap savings? The standard argument: if forward d-path and backward d'-path share a point, then there's a path of length ≤ d + d' from (0,0) to (n,m)? Actually combining: forward to shared point P (length ≤ d), backward reversed from P... backward path passes through P? The backward d'-path reaches (in end coords) x_b; original endpoint (n - x_b, ...). Overlap condition x_f ≥ n - x_b on same diagonal: forward endpoint at or beyond backward's far endpoint. Shared region on diagonal: [n - x_b, x_f]. Take P = (n - x_b, m - y_b) (backward's far endpoint, on diagonal k). Forward path passes through P? Forward endpoint x_f ≥ n - x_b, forward path's x monotonically increases; on diagonal k, forward path's visits: hmm.

Alternative rigorous approach — avoid needing the fine lemma: the combined path: forward path to (x_f, y_f), then continue with reversed backward path from... reversed backward path starts at (n, m) going to (n - x_b, m - y_b). We need a path from (x_f, y_f) to (n, m): take the backward path from (n,m) to (n-x_b, m-y_b), reversed: from (n-x_b, m-y_b) to (n, m) with d' moves. Prepend/adjust: from (x_f, y_f) to (n - x_b, m - y_b): both on diagonal k with x_f ≥ n - x_b: move backward along diagonal (remove matches) — not allowed in forward path construction... Instead: combined path = forward path to (x_f,y_f), then we must reach (n,m): note (x_f, y_f) and backward-path-reversed endpoint (n,m)... Construct: forward path to (x_f, y_f) [d moves], then path from (x_f, y_f) to (n, m): consider the backward path from (n,m) to (n-x_b, m-y_b): it has d' moves and stays within [n-x_b, n] × [m-y_b, m]... The point (x_f, y_f) with x_f ≥ n - x_b, y_f = x_f - k, and backward start (n - x_b, m - y_b) on same diagonal → y_f ≥ m - y_b. Hmm, (x_f, y_f) is inside the box [n-x_b, n]×[m-y_b, m]? x_f ≤ n (paths bounded) ✓, y_f ≤ m ✓, and x_f ≥ n - x_b ✓, y_f ≥ m - y_b ✓ (same diagonal as backward start, x_f ≥ its x → y_f ≥ its y). So (x_f,y_f) is in the backward path's bounding box. Is there a path from (x_f,y_f) to (n,m) of length ≤ d'? The backward path from (n,m) to (n-x_b, m-y_b) has d' moves; truncated version from... the backward path passes through points; does it pass through (x_f, y_f)? Same issue mirrored. Hmm.

OK here's the thing: the backward path's far-reach on diagonal k' is x_b (max). The backward path visits diagonal k' possibly multiple times, ending (in end-coords) at x_b after final slide [xs_b, x_b]. In original coords, the backward path covers diagonal k (k = delta - k') over original x ∈ [n - x_b, n - xs_b] in its final slide, and possibly earlier visits at smaller end-coords = larger original x. So on diagonal k (original), the backward path covers original x from n - x_b up to n - xs_b (contiguous slide) plus earlier segments at original x ∈ [n - x_b', ...] hmm earlier visits in end-coords were at x < xs_b?? No: end-coords increase along the backward traversal; earlier visits to diagonal k' happened at end-coord values ≤ current... the final visit is the last slide [xs_b, x_b]; earlier visits ended at some x_e < xs_b?? Not necessarily — earlier visits could end at any value < x_b, and then path left the diagonal and came back. When it leaves diagonal k' it does a non-diagonal move changing end-coord diagonal. Come back later. The last visit's slide is [xs_b, x_b]. Earlier visit reached x_e, then left. Since path is monotone in end-coords, earlier visits have x_e ≤ current positions... when it left at x_e and came back at xs_b ≥ x_e? Re-entering diagonal k': a non-diagonal move lands on k' at x value = previous diagonal's x (±)... e.g., leaving k' via a move to k'+1 at end-x = x_e (move type: from (x,y) to (x, y+1)? whatever). Re-enter at some x ≥ ... could be ≥ x_e. Fine — so backward path covers diagonal k (original) over multiple segments, with the union including [n - x_b, n - xs_b] plus earlier segments at original x ∈ [n - x_e', ...]. All segments have original x ≥ n - x_b? Earlier visits have end-coord x ≤ ... hmm not necessarily ≤ x_b? Yes: monotone, x ≤ x_b always. So original x ≥ n - x_b on all diagonal-k' visits. Therefore backward path ∩ diagonal k(original) ⊆ [n - x_b, n] original-x range, and includes [n - x_b, n - xs_b].

Now forward path ∩ diagonal k: forward path visits diagonal k at end... includes final slide [xs_f, x2 = vf[k]] and earlier segments, all with original x ≤ x2... wait forward x ≤ vf[k] = x2 on all visits? Forward monotone: yes all visits to diagonal k have x ≤ x2? No! Forward path could visit diagonal k, leave, come back — later visits have larger x; the LAST visit ends at vf[k]. All visits have x ≤ vf[k] ✓ (monotone). And the final slide covers [xs_f, vf[k]] contiguously.

Overlap condition x_f + x_b ≥ n → vf[k] ≥ n - x_b → the forward's final slide [xs_f, vf[k]] intersects backward's diagonal-k coverage [n - x_b, n - xs_b] ∪ ...: since vf[k] ≥ n - x_b and backward covers [n-x_b, n-xs_b] (nonempty interval containing n - x_b), the intervals [xs_f, vf[k]] and [n - x_b, n - xs_b] share point n - x_b if xs_f ≤ n - x_b ≤ vf[k] ✓ (xs_f ≤ vf[k] and n - x_b ≤ vf[k]; need xs_f ≤ n - x_b: hmm, if xs_f > n - x_b, then forward's final slide starts after backward's far endpoint — but backward also covers other segments of diagonal k at original x > n - xs_b... those have original x ≥ n - x_b but could extend up to... earlier backward visits to diagonal k' at end-coords x_e < xs_b with slides [xs_e, x_e]: original x ∈ [n - x_e, n - xs_e], with n - x_e < n - x_b?? No: x_e ≤ x_b → n - x_e ≥ n - x_b. So all backward diagonal-k coverage ⊆ [n - x_b, n]. And forward's final slide [xs_f, vf[k]] with vf[k] ≥ n - x_b. Intersection nonempty iff xs_f ≤ n (always) and... intervals [xs_f, vf[k]] and [n-x_b, n]: overlap iff xs_f ≤ n and vf[k] ≥ n - x_b ✓. Since vf[k] ≤ n and n - x_b ≤ n: overlap = [max(xs_f, n - x_b), vf[k]] nonempty (since max ≤ n... max(xs_f, n-x_b) ≤ vf[k]? xs_f ≤ vf[k] ✓ and n - x_b ≤ vf[k] ✓). ✓ So there IS a shared point P on diagonal k within forward's final slide and backward's diagonal-k coverage. 

Now: P is on forward's final slide → forward path passes through P ✓ (slides are traversed). P on backward path ✓. Combined path: forward (0,0)→P [≤ d moves], backward-reversed P→(n,m) [≤ d' moves] → total path ≤ d + d' → ED ≤ d + d'. Conversely if ED = D ≤ d + d' - 1 < d + d'... hmm the detection lemma needs: when D ≤ 2d - 1 (odd case, d' = d - 1): does overlap necessarily occur at step d? Myers' lemma: for d' = D - d... Let me recall precise statement: "Lemma: forward d-path and backward (D - d)-path always overlap" — hmm, with D the minimal. Paper (Myers '86), Lemma 2/3 in the linear-space section: Let D = edit distance. For any d... Actually here's cleaner: take an optimal path P* of length D. Split: consider d ≤ D... Take the optimal path; write it as: it has some point... For d* = ceil(D/2): consider the forward d*-paths and backward (D - d*)-paths = backward (floor(D/2))-paths. Claim they overlap. Proof sketch: the optimal path P* from (0,0) to (n,m); consider its state after d* moves? Not aligned with furthest-reaching. Standard proof: Let R_f = set of endpoints reachable... The actual lemma (Myers): "if D is the length of a shortest edit script, then for ce = ceil(D/2), the forward ce-path and backward (D - ce)-path overlap on some diagonal." Hmm, more precisely from the paper: the middle-snake search finds the snake when overlapping occurs, and it's proven the loop finds it by d = ceil(D/2). The subtle point: furthest-reaching forward d-path vs the optimal path — the furthest-reaching forward d-path dominates the optimal path's prefix? The optimal path after d moves is at some point; the furthest-reaching d-path on the same diagonal reaches ≥ that x. And the optimal path's suffix from that point has D - d moves = backward (D-d)-path... and backward furthest-reaching (D-d)-path on that diagonal reaches ≥ ... in end coords ≥ the suffix's start. So overlap condition holds for the *specific* diagonal of the optimal path at the split point, hence furthest-reaching paths also overlap on that diagonal → check triggers (provided that diagonal k is scanned at step d: |k| ≤ d ✓ since optimal path reaches diagonal k with d moves... |k| ≤ d ✓; and backward diagonal delta - k with D - d moves → |delta - k| ≤ D - d ≤ d for... in odd case d' = d - 1 and D = 2d - 1: |delta - k| ≤ d - 1 ✓ matches check range). 

Detailed: odd case, d = (D+1)/2, d' = d - 1 = (D-1)/2. Optimal path split after d moves: point Q on diagonal k_q, |k_q| ≤ d ✓. Remaining suffix has D - d = d - 1 moves from Q to (n,m): reversed, it's a backward path of d-1 moves from (n,m) to Q... wait, reversed suffix path from (n,m) to Q: it's a path with d-1 moves ending at Q; in end-coords: Q's end-coords (n - x_Q, m - y_Q), diagonal k'_q = delta - k_q, |k'_q| = |delta - k_q| = |(n - m) - (x_Q - y_Q)| = |(n - x_Q) - (m - y_Q)| ≤ d - 1 ✓ (since suffix path has d-1 moves, diagonal changes by ≤ 1 per move). Backward furthest-reaching (d-1)-path on diagonal k'_q reaches end-x ≥ n - x_Q → original x ≤ x_Q. Forward furthest-reaching d-path on diagonal k_q reaches x ≥ x_Q (dominates optimal path's position at d moves on diagonal k_q — since optimal path's prefix reaches Q at d moves, furthest-reaching reaches x_f ≥ x_Q ✓). Overlap check: x_f + x_b_end... condition: vf[k_q] + vb[k'_q] ≥ n: vf ≥ x_Q, vb ≥ n - x_Q → sum ≥ n ✓ TRIGGERS. And the check range: kt = k_q - delta = -k'_q, |kt| ≤ d - 1 ✓ in range. 

So detection guaranteed at d = ceil(D/2) exactly (can't be earlier as shown, since earlier trigger would give path shorter than D... earlier trigger at d < ceil(D/2) gives combined path of length ≤ 2d - 1 < D — contradiction, assuming the combination argument holds, which we showed via shared point P on forward's final slide ∩ backward coverage ✓).

And the decomposition correctness: at detection d = ceil(D/2) (odd): we return snake = forward final slide [(xs,ys) → (x2,y2)]. Combined valid path: forward path to (xs, ys)?? Hmm — the decomposition uses prefix up to (xs, ys) = pre-slide. Forward path reaches (xs, ys) with how many moves? The final slide starts after the d-th move: the path: d moves bring it to (xs, ys) — wait, at step d, the k-loop computes x from vf at d-1 plus ONE move → (xs, ys) is reached with d moves ✓ (vf[k±1] computed at iteration d-1, plus 1 move = d moves, then slide). So SES(prefix ≤ window[:xs]) ≤ d ✓. Suffix from (x2, y2): backward (d-1)-path from (n,m): its coverage of diagonal k includes [n - x_b, n - xs_b] and P ∈ forward slide ∩ that. Hmm — need SES(window[x2:]) ≤ d - 1. Backward path far endpoint on diagonal k' = delta - k is (n - x_b, m - y_b) with x_b = vb[k']. Overlap gave x2 ≥ n - x_b. The backward path from (n,m) to (n - x_b, m - y_b) has d-1 moves. Our suffix starts at (x2, y2) with x2 ≥ n - x_b, on diagonal k. Is SES(suffix) ≤ d-1? The backward path passes through P ∈ [n - x_b, n - xs_b] with P's x ≤ ... P is in backward's diagonal-k coverage; P original x ∈ [n - x_b, n - xs_b]; also P ∈ forward final slide → xs ≤ P_x ≤ x2. Backward path passes through P (in its final slide on diagonal k') ✓. Backward path reversed: from P to (n, m) with ≤ d - 1 moves ✓ (P is on backward path, suffix of it from P to (n,m) has ≤ d-1 moves). But we need path from (x2, y2) to (n, m), and (x2, y2) is *beyond* P along diagonal k (x2 ≥ P_x, both diagonal k): segment P→(x2,y2) is diagonal (matches). So path from (x2,y2): first go backward along diagonal to P? No — we need forward path from (x2, y2) to (n,m). Hmm: (x2, y2) is between P and... P_x ≤ x2. The forward path continues from (x2,y2) — suffix region starts at x2 which is ≥ P_x. The path P→(n,m) (reversed backward, ≤ d-1 moves) starts at P which is *before* x2. To get a path from (x2,y2) to (n,m): note the segment from P to (x2,y2) along diagonal k consists of matches (both points on diagonal k, contiguous... any two points on the same diagonal — the straight segment between them is all diagonal moves = matches). But (x2,y2) to (n,m): we can't "skip" from P... Hmm, we need ED(a[x2:], b[y2:]) ≤ d - 1. We know: ED(a[P_x:], b[P_y:]) ≤ d - 1 (reversed backward path from P). And a[P_x : x2] == b[P_y : y2] (common substring, since diagonal segment). Then by prefix-stripping lemma: ED(a[x2:], b[y2:]) = ED(a[P_x:], b[P_y:]) ≤ d-1? The lemma ED(c+u, c+v) = ED(u, v) for common prefix c — yes standard. ✓✓. Similarly prefix: SES(window[:xs]) ≤ d ✓ directly (forward path to (xs,ys) has d moves).

And the combined script edit count: SES(prefix) + SES(suffix) ≤ d + (d-1) = D ✓, and ≥ D... total script = SES(p) + SES(s) + snake matches; edit count = SES(p)+SES(s) ≤ D and the script is valid so edit count ≥ D → = D ✓ minimal ✓. 

Even case symmetric: detection at d = D/2, check after backward: vb[k'] where... snake = backward final slide, from original (n - x2_b, m - y2_b) to (n - xs_b, m - ys_b) where x2_b = vb[k'] post-slide, xs_b pre-slide. Prefix = window[:(n - x2_b)]... hmm wait, in even case, which endpoint splits? Coglan: prefix a[0...x] with x = n - x_post = snake start (original coords, the earlier point). Suffix from snake end (n - x_pre, ...). Check SES(prefix) ≤ d: forward d-path on diagonal k_orig = delta - k' reaches vf[k_orig] ≥ n - x2_b (overlap condition: vb[k'] + vf[delta - k'] ≥ n → vf ≥ n - x2_b). Forward furthest-reaching path on diagonal k_orig: final slide [xs_f, vf]; does it pass through n - x2_b? n - x2_b ≤ vf ✓; need xs_f ≤ n - x2_b? Hmm — forward's final slide might start after n - x2_b. But forward's earlier visits... all forward visits have x ≤ vf, and the path is continuous — to reach vf it passed through all x-values ≤ vf on *some* diagonals, but on diagonal k_orig specifically? The forward path's visits to diagonal k_orig: possibly multiple segments; the point (n - x2_b, ...) on diagonal k_orig: is it visited? Hmm. n - x2_b ≤ vf[k_orig]. If the forward path's first entry to diagonal k_orig is at x_e ≤ n - x2_b and final slide covers [xs_f, vf] with xs_f possibly > n - x2_b — then between entry and final slide, the path left and returned; while away it had x between... monotone: when it left diagonal k_orig at x_L ≤ ... it must have left after reaching some x ≥ ... ugh. Monotone in x: the path's x never decreases. The path visits diagonal k_orig over a set of x-intervals; the union might not be contiguous. The point n - x2_b: not guaranteed visited!

Hmm. So for even case, SES(prefix = window[:snake_start]) ≤ d — is it guaranteed? Let's reconsider: maybe the decomposition for the even case should use the backward path's structure instead: snake = backward final slide, original [n - x2_b, n - xs_b]. Backward path reaches (in end-coords) pre-slide point xs_b with d moves — i.e., SES(suffix from snake_end = (n - xs_b, m - ys_b)) ≤ d ✓ (backward path from snake_end to (n,m) has d moves ✓ direct). And prefix: forward d-path reaches vf[delta - k'] ≥ n - x2_b = snake_start_x. Need SES(window[:snake_start]) ≤ d. Forward path reaches (vf, ...) ≥ snake_start on diagonal k_orig = delta - k'. Its final slide [xs_f, vf] contains snake_start iff xs_f ≤ n - x2_b. Hmm.

Alternative: use the shared point argument: shared point P ∈ forward-coverage ∩ backward-final-slide. Backward final slide covers original [n - x2_b, n - xs_b] = [snake_start_x, snake_end_x]. Forward coverage of diagonal k_orig ⊆ [0, vf] with final slide [xs_f, vf]. P exists in intersection [max(xs_f, snake_start_x), min(vf, snake_end_x)] — nonempty? snake_start_x ≤ vf (overlap condition ✓); snake_end_x = n - xs_b ≤ n... need max(xs_f, snake_start_x) ≤ min(vf, snake_end_x): xs_f ≤ vf ✓; xs_f ≤ snake_end_x? Hmm xs_f ≤ vf ≤ n... snake_end_x = n - xs_b; xs_f ≤ n - xs_b? Not obvious. snake_start_x ≤ snake_end_x ✓ (slide). vf ≤ snake_end_x? Not necessarily.

Hmm, this is getting hairy. Let me reconsider: maybe for the even case the correct decomposition (per the paper) is: prefix up to snake *end*?? Let me look at the actual paper's linear-space algorithm (Myers 1986, Section 4b? The "linear space" refinement):

Paper's algorithm (from the paper, FIGURE... the procedure described in words): 
"To find the middle snake: run the basic algorithm in both directions simultaneously... halt when overlap detected... The overlap is the middle snake. Then: D = ... The edit script: decompose the problem into (0,0)-to-snake-start and snake-end-to-(N,M)."

Hmm. Let me instead check consistency differently: known-good implementations. Coglan's implementation is well-tested (he wrote a test series comparing with diff). Many people ported it. My code matches his exactly in structure. Let me re-derive his even-case logic to make sure I transcribed correctly:

From his blog post "The Myers diff algorithm: part 3" (I recall):

```ruby
def find_middle_snake(a, b)
  n, m = a.size, b.size
  max_d = (n + m + 1.0 / 2).ceil
  delta = n - m
  odd = delta.odd?
  vf = { 1 => 0 }
  vb = { 1 => 0 }
  d = 0
  loop do
    (-d..d).step(2) do |k|
      if k == -d or (k != d and vf[k - 1] < vf[k + 1])
        x = vf[k + 1]
      else
        x = vf[k - 1] + 1
      end
      y = x - k
      @x_start, @y_start = x, y
      while x < n and y < m and a[x] == b[y]
        x, y = x + 1, y + 1
      end
      vf[k] = x
      if odd and delta - (d - 1) <= k and k <= delta + (d - 1) and vf[k] + vb[delta - k] >= n
        return 2 * d - 1, @x_start, @y_start, x, y
      end
    end
    (-d..d).step(2) do |k|
      if k == -d or (k != d and vb[k - 1] < vb[k + 1])
        x = vb[k + 1]
      else
        x = vb[k - 1] + 1
      end
      y = x - k
      @x_start, @y_start = x, y
      while x < n and y < m and a[n - x - 1] == b[m - y - 1]
        x, y = x + 1, y + 1
      end
      vb[k] = x
      if not odd and -d <= k - delta and k - delta <= d and vb[k] + vf[delta - k] >= n
        return 2 * d, n - x, m - y, n - @x_start, m - @y_start
      end
    end
    d += 1
  end
end
```

Yes this matches my implementation. And his find_diff:

```ruby
def find_diff(a, b)
  ...
  if n > 0 and m > 0 then
    d, x, y, u, v = find_middle_snake(a, b)
    if d > 1 then
      find_diff(a[0...x], b[0...y])
      output_equals a[x...u]
      find_diff(a[u...n], b[v...m])
    elsif ... (d == 1 cases handled by comparing...)
```

Hmm, I genuinely recall he had special handling for small d. But as I showed with the d=1 example, plain recursion works. Let me test my logic mentally on a d=2 even case: a = [1], b = [2] (done above, odd actually delta=0 even, found d=1 backward → d_total = 2, snake empty at (1,0)). Worked ✓.

Another even test: a = [1,2], b = [2,1]: delta = 0 even. ED = 2 (delete 1 insert 2, or LCS=[1] or [2] → ED = 2+2-2·1 = 2). Trace: max_d = (4+1)//2 = 2. off = 3. vf size 7, vb size 7. vf[4] = 0, vb[4] = 0 (off+1 = 4).

d=0: forward k=0: k==-d → x = vf[4] = 0, xs=0, ys=0. slide: a[0]=1 vs b[0]=2 ✗. vf[3] = 0. odd? no → skip check. backward k=0: x = vb[4] = 0, xs=0