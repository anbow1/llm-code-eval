We need Myers' O((N+M)D) diff algorithm producing LCS-based edit script.

Plan: implement Myers' algorithm with linear space refinement (divide and conquer with middle snake) or the simpler forward path with storing V per D (memory heavy for large D). For 1000 completely different lines, D ~ 2000, N+M ~ 2000, so O((N+M)D) ~ 4M — fine. For 20000 lines differing in 50 places, D ~ 100, N+M ~ 40000, O ~ 4M — fine. The issue is memory: storing full V history would be D * (N+M) — for the second case D=2000, N+M=2000 → 4M ints, fine. For first case D=100, 40000 → 4M, fine. Actually worst case memory D*(N+M) = 2000*2000 = 4,000,000 ints — acceptable.

But to be safe, use the linear-space divide-and-conquer (Myers' recursive middle snake approach) — that's the standard robust solution. Or simpler: use the "histogram of trace" approach with dict storing snapshots. Simpler alternative: implement Myers with storing V arrays per iteration; for the sizes given it's fine. But to guarantee performance even in edge cases, linear space is better. However, implementing middle snake correctly is trickier but well-known.

Let me implement Myers linear-space (the "diff" recursive algorithm):

Standard pseudocode (from Myers paper):

function LCS(A, N, B, M):
  if N>0 and M>0:
    find middle snake, compute D (odd/even), x, y, u, v
    if D > 1 or (x != N or y != M): // actually condition: if D > 1
      LCS(A[1..x], x, B[1..y], y)  // prefix
      output A[x+1..u] as delete? Wait — middle snake corresponds to equal elements A[x+1..u] == B[y+1..v]
      Actually the middle snake gives a path from (x,y) to (u,v) along diagonal.
      LCS(A[u..N], N-u, B[v..M], M-v)  // suffix
    elif N < M:
      output A[1..N] as "=" (all equal)
    else:
      output B[1..M] as "="

Wait, the standard algorithm: find_middle_snake returns D, and the endpoints (x,y)-(u,v) of the snake. Then:
- LCS(prefix A[:x], B[:y])
- the middle snake: lines A[x:u] are common → output "=" for them
- LCS(suffix A[u:], B[v:])

Base case: if D <= 1: if D==1, one insertion or deletion; if 0, all equal. Actually when D==1, the snake covers everything except one edit; we handle it via the recursion: when we call LCS with subproblems where D computed... Hmm. Let me recall the standard formulation from Myers' paper section 4B:

```
LCS(A, N, B, M):
  if N > 0 and M > 0:
    find middle snake (D, x, y, u, v)
    if D > 1:
      LCS(A[1..x], x, B[1..y], y)
      for i in x+1..u: output A[i] "="
      LCS(A[u+1..N], N-u, B[v+1..M], M-v)
    elif N < M:
      for i in 1..N: output A[i] "="
    else:
      for i in 1..M: output B[i] "="
```

Wait that's not right — when D == 1, one sequence is a subsequence-ish: the middle snake with D=1 means one edit; the snake goes from (0,0) or wherever... Actually in the paper: "if D > 1" recurse; else (D is 0 or 1... D>=1 since N,M>0 unless one empty). If D == 1, then either N < M (one insertion) or M < N (one deletion) or... Hmm with D==1 the middle snake covers the common part; if N < M output A as common (all of A equals part of B), else output B as common. Yes that's the paper's version. But careful: when D==1 and N==M impossible (D would be even? D=1 means lengths differ by 1... actually N-M parity equals D parity; D=1 odd means N≠M). Good.

Edge: empty sequences handled at top: if N==0, all of B are "+"; if M==0, all of A are "-".

Middle snake finding (find_middle_snake), Myers section 4A:

```
delta = N - M
odd = delta % 2 != 0  # delta odd → forward reaches D odd... 

V forward: vf[1] = 0
for D in 0..ceil((N+M)/2):
  for k in range(-D, D+1, 2):
    if k == -D or (k != D and vf[k-1] < vf[k+1]):
      x = vf[k+1]
    else:
      x = vf[k-1] + 1
    y = x - k
    x0, y0 = x, y  # snake start
    while x < N and y < M and A[x] == B[y]: x+=1; y+=1
    vf[k] = x
    if odd and k in [delta - (D-1), delta + (D-1)]:
      # check overlap with reverse path
      if vf[k] >= vr[k]:  # vr indexed same k
        return (2D-1, x0, y0, x, y)  # middle snake
```

Reverse:
```
delta = N - M
vr[1] = N  (with reverse, x measured... standard: vr[k] with reverse path, V initialized V[1] = N+1? Let me use the standard formulation.)
```

Standard formulation (from Myers paper / common implementations):

Forward:
```
V = {1: 0}
for D in 0..ceil((N+M)/2):
    for k in range(-D, D+1, 2):
        if k == -D or (k != D and V[k-1] < V[k+1]):
            x = V[k+1]
        else:
            x = V[k-1] + 1
        y = x - k
        sx, sy = x, y
        while x < N and y < M and A[x] == B[y]:
            x += 1; y += 1
        V[k] = x
        if delta odd and delta - (D - 1) <= k <= delta + (D - 1) and ... actually check: if odd and (k == delta - (D-1) or k == delta + (D-1)):
            if V[k] >= reverse_V[k]... 
```

Hmm, checking overlap requires running reverse in lockstep. The paper runs both directions concurrently in the same loop over D. Reverse: define Vr with reverse furthest reaching: Vr[k] = smallest x on reverse path for diagonal k. Initialize Vr[M-1... ] hmm.

Common implementation (e.g., from the well-known "myers diff in Ruby" by James Coglan). Let me recall:

Forward:
- V[1] = 0
- For D = 0..ceil((M+N)/2):
  - for k = -D..D step 2:
    - if k == -D or (k != D and V[k-1] < V[k+1]): x = V[k+1]
    - else: x = V[k-1] + 1
    - y = x - k
    - snake: while x<N and y<M and A[x]==B[y]: x++, y++
    - V[k] = x
    - if delta odd and delta-(D-1) <= k <= delta+(D-1):
      - if V[k] >= Vr[k]... wait reverse Vr[k] stores x coordinate; overlap when forward x >= reverse x on same diagonal. But careful: reverse Vr[k] defined as furthest-reaching reverse point, where x decreases. Overlap condition: forward reach x >= reverse reach x AND ... the standard condition is V[k] (forward x) >= Vr[k] (reverse x)? Actually for reverse path, we define x' = N - (something)... Let me use Coglan's formulation:

Reverse path uses coordinates (x, y) going from (N, M) backward to (0,0). Vr[1] = 0? No — in Coglan's version, reverse uses "r" coordinates. Let me just use the standard from Myers' own paper (Section 4A):

```
For D in 0..ceil((M+N)/2):
  For k in -D..D step 2:
    ' Forward
    if k == -D or (k != D and Vf[k-1] < Vf[k+1]): x = Vf[k+1]
    else: x = Vf[k-1] + 1
    y = x - k
    x0, y0 = x, y
    while x < N and y < M and A[x+1] == B[y+1]: x++, y++
    Vf[k] = x
    if delta odd and k in [delta - (D-1), delta + (D-1)]:
      if Vf[k] >= Vr[k]:
        return (2D - 1, x0, y0, x, y)
    ' Reverse
    k' = k - delta  (map: reverse diagonal index kr = k - delta)
    if kr == -(D') ... hmm the reverse loop is over kr from -D..D too but shifted.
```

The paper: reverse step for k in same range but using kr = k - delta:

```
    if kr == D - delta... 
```

Actually paper's formulation: "For each diagonal k in [-D, D]", do forward step for diagonal k, then reverse step for diagonal k' = k - delta? Hmm, the reverse diagonals run with the same parity. Let me write it as:

```
for kr in range(-D, D+1, 2):
    # reverse step on diagonal kr (absolute diagonal = kr + delta? or kr itself?)
```

Let me define absolute diagonal d = x - y. Reverse path starts at (N, M), which is on diagonal delta = N - M. Reverse furthest reaching: Vr[d] = minimum x reachable going backwards along diagonal d.

Reverse step: for diagonal d (absolute), with D_r = number of reverse steps:
```
if d == delta + D_r or (d != delta - D_r and Vr[d-1] < Vr[d+1]):  # hmm
```

Standard reverse (mirroring forward): reverse on diagonal d: choose to move left (deletion... in reverse, moving up = insertion reversed) — analog of forward: "if k == -D or (k != D and V[k-1] < V[k+1])" mirrors to reverse: "if d == delta + D or (d != delta - D and Vr[d-1] < Vr[d+1]): x = Vr[d-1]" hmm... let me think.

Forward: on diagonal k, we can come from k-1 (move right/down: delete from A, x+1) or k+1 (insert from B, y+1 i.e. x-1 relative). V[k-1] < V[k+1] chooses... For reverse, symmetric: reverse path moves x-1 or y-1. Coming from diagonal d+1 means we decreased x (came from a point on diagonal d+1, moved left to diagonal d). Coming from diagonal d-1 means decreased y. Symmetric rule: if d == delta - D_r? Hmm.

Simplest: implement reverse as forward on reversed sequences. Define reverse arrays: A_rev = A[::-1], B_rev = B[::-1], and forward diff on them gives reverse furthest reaching in "reversed coordinates" xr, yr where xr = N - x - 1... Actually furthest reaching forward on reversed sequences from (0,0) to (N,M): a point (xr, yr) in reversed coords corresponds to (N - xr, M - yr)? If we reverse both sequences, position xr in A_rev corresponds to original index N - 1 - xr. The snake in reversed coords covers original indices... A reverse path from (N,M) backward: point reached after D_r reverse steps at reversed coords (xr, yr) corresponds to original (N - xr, M - yr). And a snake in reversed coords from (xr0, yr0) to (xr1, yr1) (with xr1 >= xr0) corresponds to original snake from (N - xr1, M - yr1) to (N - xr0, M - yr0).

Overlap condition: forward point (xf, yf) and reverse point (xr, yr) on same diagonal with xf >= xr (original coords), i.e., N - xr_rev <= xf → xr_rev >= N - xf. Similarly yr_rev >= M - yf. Same diagonal in reversed coords: xr_rev - yr_rev = (N - x) - (M - y) = delta - (x - y) = delta - d. So reversed diagonal dr = delta - d.

Hmm, this is getting complicated but manageable. Alternatively, just implement the direct reverse per Myers paper. Let me write the paper's pseudocode precisely. Myers 1986 paper, Figure 8? The algorithm:

```
Δ ← N − M
If Δ is odd
   V[1] ← 0   (forward, 1-indexed diagonals centered at 0? paper uses k from -D to D)
Else
   Vr[1] ← N ... 
```

Hmm the paper shifts indices. Let me instead use a cleaner modern formulation. I'll use Coglan's "Myers diff in Ruby" (well-tested):

His forward:
```
def middle_snake(a, b)
  n, m = a.size, b.size
  max = n + m
  delta = n - m
  odd = delta.odd?
  vf = { 1 => 0 }
  vr = { 1 => 0 }
  d_f = (delta odd? → (max+1)/2 else max/2 ... )
```

Actually Coglan's version:

```
def middle_snake(a, b)
  n, m = a.size
  max_d = (n + m + 1) / 2  # ceil
  delta = n - m
  odd = delta % 2 != 0
  vf = {1 => 0}
  vr = {1 => 0}

  d = 0
  while d <= max_d
    # forward
    k = -d
    while k <= d
      if k == -d or (k != d and vf[k-1] < vf[k+1])
        x = vf[k+1]
      else
        x = vf[k-1] + 1
      end
      y = x - k
      px, py = x, y
      while x < n and y < m and a[x] == b[y]
        x += 1; y += 1
      end
      vf[k] = x
      if odd and (delta - (d - 1)) <= k and k <= (delta + (d - 1))
        if x + vr[delta - k] >= n   # ← note: uses vr indexed by delta - k with values in "reversed" coords
          return [2*d - 1, px, py, x, y]
        end
      end
      k += 2
    end

    # reverse
    k = -d
    while k <= d
      if k == -d or (k != d and vr[k-1] < vr[k+1])
        x = vr[k+1]
      else
        x = vr[k-1] + 1
      end
      y = x - k
      px, py = x, y   # in reversed coords
      while x < n and y < m and a[n - x - 1] == b[m - y - 1]
        x += 1; y += 1
      end
      vr[k] = x
      if not odd and (delta - d) <= k and k <= (delta + d)  # hmm, check condition
        ...
      end
      k += 2
    end
    d += 1
  end
end
```

Coglan's actual code (I recall):

```
if odd and delta - (d - 1) <= k and k <= delta + (d - 1)
  if x + vr[delta - k] >= n
    return [2*d - 1, px, py, x, y]   # forward snake
```

where vr[delta - k]: reversed diagonal index; note reversed path's diagonal k' relates to forward diagonal k by k' = delta - k? Let's verify: reversed coords (xr, yr), xr - yr = k'. Original point: (n - xr, m - yr), diagonal = (n - xr) - (m - yr) = delta - k'. So forward diagonal d_f = delta - k', i.e., k' = delta - d_f. Yes.

Overlap condition: forward (x, y), reverse in reversed coords (xr, yr) with yr = xr - k'. Original reverse point: (n - xr, m - yr). Overlap when forward x >= n - xr, i.e., x + xr >= n. And y + yr >= m follows automatically if on same diagonal? y = x - k, yr = xr - k' = xr - delta + k. y + yr = x - k + xr - delta + k = x + xr - delta. So y + yr >= m ⟺ x + xr >= n + m - m... x + xr - delta >= m ⟺ x + xr >= m + delta = n. Yes, equivalent. Good.

Also need reverse path to have actually reached: the condition `x + vr[delta - k] >= n` — but also we need that the reverse furthest-reaching point on that diagonal exists and that its snake... Coglan checks `vr.key?(delta - k)`? Hmm, in his code he initializes vr = {1 => 0} and the reverse loop only fills diagonals in [-d, d] for reverse. delta - k might not be in that range, but the check `delta - (d-1) <= k <= delta + (d-1)` ensures delta - k is in [-(d-1), d-1], which are the reverse diagonals filled after d-1 reverse iterations. But also parity: reverse fills diagonals with same parity as d (step 2 from -d). delta - k parity: k has parity of d (forward k from -d to d step 2, so k ≡ d mod 2... k ranges -d, -d+2, ..., so k ≡ d mod 2). delta - k ≡ delta - d mod 2. Reverse diagonals at iteration d have parity ≡ d mod 2. So we need delta - d ≡ d mod 2, i.e., delta ≡ 0 mod 2 — but this check only happens when delta is odd. Contradiction? Hmm wait. Reverse at iteration d fills diagonals k ∈ {-d, -d+2, ..., d} so parity of k is parity of d. We need delta - k to have been filled, i.e., delta - k ≡ d mod 2 → delta ≡ d + k ≡ 2d ≡ 0 mod 2. But delta is odd here. So delta - k is never filled at iteration d??

Hmm, I think the reverse loop in Coglan runs with the same d but the check happens with vr from previous iteration, i.e., after d-1 reverse steps, filled diagonals have parity of d-1. delta - k: k ≡ d (mod 2), delta odd → delta - k ≡ odd - d ≡ d - 1 (mod 2). Yes! delta - k has parity of d-1, matching diagonals filled after d-1 reverse iterations.

And forward check for odd delta at iteration d uses vr values from reverse iteration d-1 (reverse loop runs after forward in same d). The forward edit path with total D: if delta odd, D is odd, and D = 2d-1 for the middle... The forward path at step... Hmm, in Myers: when delta odd, overlap is detected during forward step at D_forward = d, requiring reverse has run d-1 steps; total D = d + (d-1) = 2d-1. When delta even, overlap detected during reverse step at iteration d using forward values from iteration d, total D = 2d.

Reverse check for even delta: after forward step at iteration d (forward diagonals filled: parity d... wait forward fills k with parity ≡ d... but also iteration d fills only |k|<=d). Reverse on diagonal kr, overlap with forward diagonal k_f = delta - kr. Need k_f filled by forward: forward filled diagonals up to iteration d: |k_f| <= d and parity k_f ≡ d mod 2... forward iteration d fills k ∈ {-d..d}, parity of k ≡ d mod 2? No wait: forward iteration d fills k = -d, -d+2, ..., d → parity k ≡ d mod 2. Check happens in reverse loop of iteration d, using forward values from iteration d (forward runs first). So need delta - kr ≡ d mod 2 and |delta - kr| <= d. kr ≡ d mod 2 (reverse fills kr with parity d). delta even → delta - kr ≡ d mod 2. ✓. Range: Coglan's condition `delta - d <= kr <= delta + d`? Hmm need |delta - kr| <= d ⟺ delta - d <= kr <= delta + d. And kr ∈ [-d, d]. Coglan's code:

```
if not odd and delta - d <= k and k <= delta + d   # hmm, actually I recall: 
  if x + vf[delta - k] >= n  → return [2*d, n - px, m - py, n - x, m - y]  # reverse snake
```

Hmm wait, Coglan's reverse check: `if delta even and ... if x + vf[delta - k] >= n: return [2*d, n-px, m-py, n-x, m-y]`? But careful: for even delta, condition should be delta - d <= k <= delta + d? Hmm, but actually I recall Coglan's condition being `delta - d <= k and k <= delta + d` for reverse. Hmm but wait — forward diagonals filled at iteration d include parity d only. delta - k where k ≡ d mod 2, delta even → delta - k ≡ d mod 2 ✓.

But there's a subtlety: forward values from iteration d exist for |delta - k| <= d only if filled; the range check ensures |delta - k| <= d. But forward fills Vf[k] for all k in [-d, d] with parity d — and delta - k has parity d ✓. OK.

Also the middle snake endpoints for reverse detection: the snake in reversed coords from (px, py) to (x, y); in original coords: from (n - x, m - y) to (n - px, m - py). Since snake moves forward in reversed coords, original snake goes from lower original coords (n - x, m - y) to (n - px, m - py). So original snake start = (n - x, m - y), end = (n - px, m - py).

For forward detection: snake from (px, py) to (x, y), D = 2d - 1.

Then recursion: LCS(prefix A[0:x0], B[0:y0]) where (x0,y0) is snake start; middle: A[x0:x1] all equal → "=" lines; LCS(suffix A[x1:], B[y1:]).

Base cases in recursion: if N == 0: output "+" for all B; if M == 0: output "-" for all A. If both > 0: find middle snake; if D > 1: recurse; else (D ∈ {0, 1}): if D == 0: all equal → output A as "=" (N == M). If D == 1: one edit; if N < M: A is common... hmm is that right? D == 1 means N, M differ by 1 in parity... D = 1, delta = N - M odd, |delta| = 1? No — delta parity = D parity = odd, but |delta| could be 1, 3, 5...? If D == 1, the edit script has exactly 1 edit, so |N - M| = 1. Because D >= |delta| always. So D == 1 ⟹ |delta| == 1. If N < M: one insertion, A fully common → output A as "=", B minus one line as "+". If N > M: one deletion, B fully common → output B as "=".

The middle snake returns D which could be 0? Only if N==M and all equal — but the middle snake function with N,M>0: d starts at 0, forward d=0: k=0, snake extends, check odd delta (delta even, skip). reverse d=0: k=0... delta even check: delta - 0 <= 0 <= delta + 0 requires delta == 0. If delta == 0 and snake covers everything, x + vf[0] >= n... vf[0] = x after full snake = n, x (reverse) ... reverse at d=0: k=0, x = vr[1]?? Hmm reverse with d=0, k=0: k == -d → x = vr[k+1] = vr[1] = 0 (init). Then y = 0, snake on reversed sequences: while xr < n and yr < m and A[n-xr-1] == B[m-yr-1]... extends. vr[0] = xr. Check: delta==0, 0 <= 0 <= 0 ✓, x + vf[delta - 0] = xr + vf[0]. vf[0] = n (full snake). Condition xr + n >= n ⟺ xr >= 0 ✓ always true! So it returns [0, n - xr, m - yr, n - 0, m - 0]?? That's wrong — it would return D=0 with snake covering everything only if the reverse snake covered everything, i.e., xr = n. Hmm, xr + vf[0] >= n: vf[0] = n, so xr >= 0 always → returns even when reverse snake is short. That would return D = 0 incorrectly.

Wait — the reverse snake at d=0: starts xr=0, yr=0, extends while matching. If sequences are fully equal, xr reaches n, condition xr + n >= n true, returns D=0 snake (n - n, m - m) to (n, m) — full snake, D=0, correct. If not fully equal, reverse snake stops early, xr < n... but condition xr + n >= n still true (xr >= 0)! Bug? Hmm — unless the returned D=0 with partial snake is wrong. But wait, Coglan's condition for even delta... let me recall precisely. Coglan's actual code:

```
if not odd and delta - d <= k and k <= delta + d
  if x + vf[delta - k] >= n
    return [2*d, n - px, m - py, n - x, m - y]
```

Hmm at d=0, delta=0: k=0, delta - d = 0 <= 0 <= delta + d = 0 ✓. x = vr[0] after reverse snake. vf[0] = forward snake end x. Condition x + vf[0] >= n. If sequences fully equal: vf[0] = n, x = n → returns [0, 0, 0, n, m]? n - px where px = 0: [2*0, n - 0, m - 0, n - x, m - y] = [0, n, m, 0, 0]. Hmm which is start (n - x, m - y) = (0,0) and end (n - px, m - py) = (n, m). Snake covers all, D=0. Fine.

If not fully equal: forward vf[0] < n (snake stopped), reverse x < n. Condition x + vf[0] >= n might still hold accidentally? E.g., n = m = 10, sequences share 5 common at start and 4 common at end, middle differs. vf[0] = 5 (forward snake from (0,0)). reverse x: reversed snake from (0,0) in reversed coords matches the suffix → x = 4. Condition 4 + 5 = 9 >= 10? No. OK false. But could x + vf[0] >= n with delta = 0 while D_true = 2? D_true = 2 means total edits 2 (one insert one delete). Then there's no overlap issue? Hmm, if D = 2, is it possible that forward furthest reaching at d=0... wait forward at d=0 only computes vf[0] (single diagonal). The condition x + vf[delta - k] >= n with delta=0, k=0: reverse furthest reach x on diagonal 0 (reversed), forward vf[0]. Overlap on diagonal 0 means paths meet on diagonal 0. With delta = 0, D even. If D = 2, paths can cross on diagonal 0 at d_forward = 0, d_reverse = 0 only if... forward at d=0 is just the initial snake; reverse at d=0 is just the initial reverse snake. If they overlap, then there's a common subsequence... Hmm, if forward initial snake and reverse initial snake overlap on diagonal 0, does that mean D <= 1? Not necessarily — forward at d=0 only extends the initial diagonal-0 snake. Reverse similarly. If they overlap, the whole middle is one snake → all edits are... total path = forward from (0,0) to overlap point (0 edits, D_f = 0), snake, reverse to (n,m) (D_r = 0). Total D = 0. Wait but D_f at d=0 being 0 means the forward path hasn't made any edit. And reverse similarly. So D = 0 + snake + 0 = 0. So if they overlap, D = 0 indeed. So returning D = 0 is correct in that case!

Hmm wait, but the forward furthest reaching at d=0 on diagonal 0: the path from (0,0) with 0 edits lies entirely on diagonal 0, and the furthest reach is the end of the initial snake. Yes. And reverse similarly. If they overlap → sequences equal along... forward snake end (x1, y1), reverse snake covers from (n - x2, m - y2) to (n, m). Overlap means n - x2 <= x1 → the two snakes cover [0, x1] and [n-x2, n] with n - x2 <= x1, union covers [0, n] → all lines equal → D = 0. ✓. So the condition correctly detects D = 0. But the returned snake: [0, n - x, m - y, n - px, m - py] where (px,py) = snake start in reversed coords = (0,0) at d=0 → end = (n, m), start = (n - x, m - y). With full coverage, start should be (0,0): n - x = 0 requires x = n ✓ (overlap forced x + vf[0] >= n with vf[0] <= n and x <= n → x = n, vf[0] = n). Good, consistent.

Hmm wait, but there's still a subtle issue: at d=0 reverse, x could equal n even when sequences not fully equal? x + vf[0] >= n and x <= n forces vf[0] >= n - x... if x = n then vf[0] >= 0 always true, but x = n at d=0 reverse means the reverse snake from (0,0) reversed covered all n — meaning A reversed fully matches... no wait, reverse snake extends while a[n-xr-1] == b[m-yr-1]; it covers the common suffix. x = n means entire A matches suffix of B of length n → m >= n and A equals B[m-n:]. Then delta = n - m <= 0, delta even. Hmm, e.g., n=2, m=3, A = ["x","y"], B = ["x","y","z"]. delta = -1, odd! So reverse check not run (odd delta → forward check only). OK. If delta even and x = n: A is a suffix... prefix? A equals last n lines of B. Then D = m - n... e.g., n=1,m=2, A=["x"], B=["y","x"]: delta = -1 odd again. n=2, m=4, A=["x","y"], B=["p","q","x","y"]: delta = -2 even, d=0: forward vf[0]: snake from (0,0): a[0]="x" vs b[0]="p" → vf[0]=0. Reverse: reversed A = ["y","x"], reversed B = ["y","x","q","p"], snake from (0,0): match → x=2=n, y=2. vr[0] = 2. Check: delta - d = -2 <= 0 <= delta + d = -2? 0 <= -2 false → no check. Good, range check saves us. Then d=1: forward k=-1,1; reverse k=-1,1. Reverse k... this would continue until D found = 2? True D: LCS is ["x","y"], script: delete "p","q", keep "x","y" → D=2. At d=1: forward vf[-1], vf[1]; check odd? no. reverse k=-1: k==-d → x = vr[0] = 2? Hmm reverse: k=-1: if k == -d (yes): x = vr[k+1] = vr[0] = 2. y = x - k = 3. snake: while x<2? x=2 not < 2 → no snake. vr[-1] = 2. Check: delta - d = -3 <= -1 <= delta + d = -1 ✓. x + vf[delta - k] = 2 + vf[-1 - (-2)] = vf[1]. vf[1] at d=1: forward k=1: k == d → x = vf[0] + 1 = 1. y = 0. snake: a[1]="y" vs b[0]="p" no. vf[1] = 1. Condition: 2 + 1 = 3 >= n=2 ✓ → return [2*1, ...] = [2, snake...]. Reverse snake in reversed coords: px,py = (2,3) start, (x,y) = (2,3) — empty snake! D=2 with empty middle snake. Then original coords: start = (n - x, m - y) = (0, 1), end = (n - px, m - py) = (0, 1). Empty snake at (0,1)?? Then recursion: LCS(A[0:0], B[0:1]) → outputs "+" for B[0]... wait B[0:1] = ["p"] → "+ p". Then middle: A[0:0] nothing. Then LCS(A[0:], B[1:]) = LCS(["x","y"], ["q","x","y"]). Hmm, that sub-problem: D... total script: "+p", then for the subproblem: A=["x","y"], B=["q","x","y"]: LCS: delete q? or insert q. D=1: N<M → output A as "=" and the one extra B line as "+". Which line is extra? With D=1 and N<M, output "=" for all A and "+" for B[0] (the insertion happens at position 0? or wherever). Hmm — need care: when D==1 and N<M, the insertion point must be determined. In Myers paper's base case: "elif N < M: output A[1..N] as common" — but then B's extra line position? The paper's LCS routine outputs the common subsequence; the surrounding edit script construction: for D==1, the path is: initial snake from (0,0) to (x0,y0), then one edit, then snake to (N,M). The common output must interleave... but the problem here only needs the list of "=" / "-" / "+" items in order. When D==1, N<M: A fully common, B = A with one line inserted somewhere. The order of "=" items is all of A in order ✓, and "+" items must be B in order. So output: we need to produce, in order, B's lines with exactly one "+" and the rest "="... wait no: output must be such that "="+"+" in order gives B, and "=" items give A. B has M lines, A has N = M-1 lines. So exactly one "+" line and M-1 "=" lines... but wait, could B have duplicate lines such that different assignments work? The "=" items in order must give exactly A. If A = ["x","x"] and B = ["x","x","x"], then "=" items are 2 lines from B in order giving ["x","x"] — any 2 of the 3. Any choice works. So for D==1, N<M: we can output: walk through B, output "=" for lines matching A greedily? Simpler: since D==1, exactly one insertion; the insertion is at a specific position but any position yielding valid script works as long as "=" items = A. Since all "=" lines equal A in order, we need to select which B line is "+" such that the remaining B lines in order equal A. With one insertion, B = A[0:i] + [extra] + A[i:] for some i. Greedy: iterate B, keep pointer into A; whenever B[j] == A[p], output "=" and p++; else output "+" (must happen exactly once). That reconstructs correctly. Actually simplest: since B = A with one insertion, greedy matching works: match B[j] to A[p] greedily; the one non-match is the insertion.

But hold on — is greedy correct? A = ["a","b"], B = ["a","a","b"]. B could be A with "a" inserted at position 1. Greedy: B[0]="a" matches A[0] → "="; B[1]="a" matches A[1]="b"? No → "+"; B[2]="b" matches A[1] → "="... wait p advanced: after B[0] matched A[0], p=1. B[1]="a" ≠ A[1]="b" → "+". B[2]="b" == A[1] → "=", p=2. Result: "=", "+", "=" → "=" items: ["a","b"] = A ✓, sequence gives B ✓. 

But careful: is it guaranteed that greedy finds exactly one mismatch? B = A with one insertion at position i: B[j] = A[j] for j < i, B[i] = extra, B[j] = A[j-1] for j > i. Greedy: for j < i, B[j] == A[j] ✓ matches (p tracks j). At j = i: B[i] vs A[i]: if extra == A[i], greedy matches → p = i+1; then j = i+1: B[i+1] = A[i], vs A[p]=A[i+1]: mismatch → "+"... wait but then which line is "+": B[i+1] = A[i], labeled "+", and B[i] labeled "=" as A[i]. "=" items: A[0..i-1], A[i](=B[i]), then B[i+2..] = A[i+1..] ✓ = A. Works. If extra ≠ A[i]: "+" at B[i]. Either way exactly one "+". And can greedy produce two "+"s? Only if mismatch twice; but structurally only one insertion. Suppose extra happens to equal A[k] for k > i causing shift... A = ["a","a"], B = ["a","b","a"]? Is D==1 here? LCS = ["a"], D = 2 (delete "b"? script: "="a, "+"... hmm A→B: insert "b" after A[0], and... A=["a","a"] → B=["a","b","a"]: LCS=["a","a"]? B contains "a","a" as subsequence (positions 0,2) ✓. So LCS length 2, D = (3-2)+(3-2)=2. Not D==1. Fine. For D==1, N<M strictly one insertion, greedy gives exactly one "+". Good.

Similarly D==1, N>M: one deletion: B fully common, iterate A with pointer into B; the one non-match is "-".

Actually wait — but in the recursion, when D > 1 we recurse on both halves; base cases D ∈ {0,1} handled as above, plus N==0 or M==0 handled directly. But there's another subtlety: the middle snake detection — could it return D values that... The recursion structure: LCS(A[N], B[M]) finds middle snake with D_total = D. If D > 1: recurse on prefix (which has edit distance D1 <= floor stuff) and suffix. The paper proves correctness. Fine.

But wait — there's a subtlety with the D==1 base case and the greedy approach: when D==1, is it necessarily true that A is a subsequence of B (N<M case)? D==1 means edit script = 1 insertion, so yes A is obtained from B by deleting one line, i.e., A is a subsequence of B with LCS = A. ✓.

Also, when D==1, do we even need the middle snake? We could handle directly: N<M → greedy over B. But wait: must confirm |delta| == 1 when D==1, yes since D >= |delta| and D == 1 → |delta| <= 1, and delta parity == D parity == odd → |delta| = 1. ✓.

Also D==0: N == M and sequences identical → all "=".

Now performance: recursion depth could be O(D) in worst case; each call does O((N+M)·D_local) work... total O((N+M)·D) overall (standard result, since subproblem D's sum ≈ D and sizes shrink). For 1000 completely different lines: N+M = 2000, D = 2000 → 4M basic ops, in Python maybe ~2-4 seconds? Hmm. The middle snake loop: for each d, iterate k over range, each iteration O(1) plus snake extension. Snake extensions total O(N+M) per d? No — per d, snakes can each extend up to O(N+M)... actually total snake length per d across all k is bounded by O(N + M) (snakes don't overlap... they can overlap slightly). Standard bound: O((N+M)·D) total. For worst case D=2000, N+M=2000: 4M snake steps + ~ (2000/2)^2 ≈ 1M loop iterations for k. In Python, 4M operations ≈ 2-3 seconds maybe. Tight against 6s limit but probably OK. Hmm, but completely different 1000-line lists: D = 2000? N = M = 1000, delta = 0, D = 2*1000 = 2000 (all replaced: 1000 deletions + 1000 insertions). Middle snake recursion splits. Work ~ sum over subproblems of (N+M)*D/2-ish... Total is O((N+M)·D) = 4M. Python: each snake step is a comparison; the k-loop iterations ~ sum of (2d+1)/2 over d up to 1000 per top-level call... Top call: d goes to D/2 = 1000, k iterations sum ≈ 1000^2 = 1M, snake steps ≤ (N+M) per d? No: per d, total snake extension across all k is at most N+M + (number of k's)? Hmm, actually each snake step advances x+y by 1, and snakes for different k on the same d overlap only at boundaries; total ≤ N + M + 2·(#diagonals). So per d: O(N+M) snake steps. Over d = 0..1000: 1000 · 2000 = 2M snake steps for the top call alone, plus k-loop 1M iterations. Then recursion halves. Total maybe ~4-6M "steps" → Python ~3-5 seconds. Risky but the problem says "under 6 seconds", presumably designed with this in mind. We should optimize inner loops: use local variable caching, lists instead of dicts for V (dict with int keys is fine but list faster), avoid function call overhead in snake loop.

Alternative optimization: use dict-based V with... Let me write with lists: vf = [0]*(2*max_d+2) indexed by k + max_d? Or use dict — dict access is fast. Lists with offset indexing are faster.

Let me implement carefully with performance in mind:

```python
def diff_lines(a, b):
    n, m = len(a), len(b)
    out = []
    # quick equal-prefix/suffix trimming to speed up common cases
    # trim common prefix
    p = 0
    while p < n and p < m and a[p] == b[p]:
        p += 1
    # trim common suffix
    s = 0
    while s < n - p and s < m - p and a[n-1-s] == b[m-1-s]:
        s += 1
    core_a = a[p:n-s]
    core_b = b[p:m-s]
    for i in range(p):
        out.append(("=", a[i]))
    _diff(core_a, core_b, out)
    for i in range(n-s, n):
        out.append(("=", a[i]))
    return out
```

Prefix/suffix trimming is a big win for the "differ in 50 places" case: middle core tiny → trivial. And for random different strings, trimming does nothing much (O(N+M) comparisons).

But careful: trimming is safe — it doesn't affect minimality? Trimming common prefix/suffix: LCS(a,b) = prefix + LCS(core) + suffix, and it's known this preserves optimality. Yes, standard optimization, preserves minimal scripts. Hmm — is it always optimal? Yes: if a[p] == b[p], there is an optimal script matching them (standard result). Fine.

Then _diff(A, B, out) recursive:

```python
def _diff(a, b, out):
    n = len(a); m = len(b)
    if n == 0:
        for line in b: out.append(("+", line))
        return
    if m == 0:
        for line in a: out.append(("-", line))
        return
    # find middle snake
    res = _middle_snake(a, b)   # (D, x0, y0, x1, y1) or None
    if res is None:
        # no overlap found within max_d → shouldn't happen; but D <= max_d guaranteed
        ...
    D, x0, y0, x1, y1 = res
    if D > 1:
        _diff(a[:x0], b[:y0], out)
        for i in range(x0, x1):
            out.append(("=", a[i]))
        _diff(a[x1:], b[y1:], out)
    elif D == 1:
        if n < m:
            # A is subsequence of B with one insertion
            p = 0
            for line in b:
                if p < n and line == a[p]:
                    out.append(("=", line)); p += 1
                else:
                    out.append(("+", line))
        else:
            p = 0
            for line in a:
                if p < m and line == b[p]:
                    out.append(("=", line)); p += 1
                else:
                    out.append(("-", line))
    else:  # D == 0
        for line in a: out.append(("=", line))
```

Hmm wait, D==1 greedy: when n < m, iterating b with pointer into a. But what if the greedy hits mismatch... guaranteed exactly one mismatch as argued. But edge: could greedy fail when line == a[p] but it's actually better to treat as insertion? With exactly one insertion, any greedy match is fine — if B[j] == A[p], matching them keeps validity: remaining B[j+1:] must equal A[p+1:] (since only one insertion total, if B[j]=A[p] matched, the insertion is at index >= j... hmm need care). Let me verify: B = A[0:i] + [e] + A[i:], e may equal some A elements. Greedy with p: for j < i: B[j] = A[j], and p == j at that point (all matched), so match, p = j+1. At j = i: B[i] = e vs A[p] = A[i]. If e == A[i]: match, p = i+1. Then j = i+1: B[i+1] = A[i] vs A[i+1]: mismatch unless A[i] == A[i+1]. If A[i] == A[i+1], then B[i+1] == A[i+1] also, match, p = i+2... continues matching as long as A values repeat; eventually at some j, B[j] = A[j-1] and we need it to equal A[p] where p = j... mismatch when A[j-1] != A[j]. If A has a long run of e's... e.g., A = [e]*5, B = [e]*6: greedy matches all, no "+"! That's invalid — we need exactly one "+". But wait: "=" items would be all 6 of B → 6 "=" items but A has 5 → violates "=" items = A. Bug!

Hmm. With A = [e,e,e,e,e], B = [e]*6: D == 1, n=5 < m=6. Greedy produces 6 "=" and 0 "+". Invalid. Need fix: when n < m and D == 1, exactly one "+" must be emitted. Fix: track count; or better, determine insertion position properly. Simple fix: greedy but ensure exactly one "+": 

Since B = A with one insertion of some line e, we can find position: greedy match but force one insertion. Alternative: use the middle snake info for D==1! The middle snake gives us the path: for D==1 (delta odd), the snake returned covers from (x0,y0) to (x1,y1) with one edit either before or... D = 2d - 1. The path: forward to (x0,y0) (d-1 edits... hmm). Actually with D==1, d=1: forward step d=1, check overlap with reverse d=0. The returned snake (x0,y0)→(x1,y1): path = forward path from (0,0) to (x0,y0) with D_f = ... at d=1, forward k on diagonal k with furthest reach computed from d=0 values → the forward path to (x0,y0) has D_f = ... hmm the point (x0,y0) is the start of the d=1 snake on diagonal k; reaching diagonal k requires 1 edit (from diagonal k±1 at d=0), so path to (x0,y0): D_f = 1?? Then total D = 1 + 0 (reverse) + 0 (snake edits) = 1? But D = 2d-1 = 1 ✓. Wait, but then the middle snake for D==1: path = 1 edit to reach (x0,y0), then snake (0 edits) to (x1,y1), then reverse path from (x1,y1) to (n,m) with D_r = 0 edits... D_r = d - 1 = 0: reverse path with 0 edits from (x1,y1) to (n,m) means straight diagonal line → (x1,y1) and (n,m) on same diagonal and all lines between equal — but reverse furthest reaching with 0 edits: the reverse path at d=0 is just the initial reverse snake ending at (n - xr, m - yr)... So (x1, y1) = (n - xr, m - yr) and the segment from (x1,y1) to (n,m) is the reverse snake reversed = all equal ✓.

So for D==1: the script = 1 edit + snake "="s. The single edit: reaching (x0,y0) on diagonal k from diagonal k-1 (deletion of a[x0-1]... at forward step, if we came from vf[k-1]+1, the edit is consuming a[x0-1]? hmm) — but actually easier: just handle D==1 with a corrected greedy that guarantees exactly one "+"/"-".

Correct greedy for n < m, D==1: We know exactly one insertion. Find the insertion position deterministically: compute the forward path... simplest correct approach: greedy but with the rule that we emit exactly one "+" — we can compute where: B = A with e inserted at position i where i = length of initial matching run? Not unique. Correct approach: greedy match as far as possible from the left (standard LCS greedy for when one is subsequence of other): Actually the cleanest: B[j] = A[j] for j < i, B[i] = e, B[j] = A[j-1] for j > i, for the true insertion index i. But multiple i may be valid (when e duplicates neighbors). Any valid i works. Greedy from left: p = 0; for j in range(m): if p < n and b[j] == a[p]: "=" ; p++ else "+". Problem case: all match (when a is all-same and e same). Then we emitted m "=" and 0 "+" — wrong count. Fix: force: we know exactly one "+" must exist. Modify: emit "+" when p >= n (pointer exhausted) — that handles the tail. The problem case is when the loop ends with 0 "+" emitted and p == n... e.g., A=[e]*5, B=[e]*6: loop: j=0..5, all match until p=5 at j=5: p=5 = n → p < n false → "+" ✓! Wait: j=5: p=5, p < n = 5? No → "+". So we do get one "+". Let me recheck: j from 0 to m-1 = 5. j=0: p=0<5, b[0]==a[0] → "=", p=1. ... j=4: p=4<5 → "=", p=5. j=5: p=5 not < 5 → "+". Total: 5 "=", 1 "+". ✓!! 

Earlier I made an error. Let me recheck the general case: is greedy guaranteed exactly one "+"? B = A[0:i] + [e] + A[i:]. Greedy: j < i: match, p = j+1. j = i: B[i] = e vs A[i] (if i < n): if equal → match, p = i+1; continue: j = i+1: B[i+1] = A[i] vs A[i+1]: mismatch iff A[i] != A[i+1]. If A[i] == A[i+1], match... this continues: for j > i, B[j] = A[j-1], p = j (all matched so far) → match iff A[j-1] == A[j]. So greedy emits "+" at first j > i where A[j-1] != A[j], or if A[i:] is constant (= e), then no mismatch until p = n → "+" at p == n (j = m-1: p = n-1... let me see: if A[i:] all == e, then matches continue: p goes i+1, ..., at j = m-1 = n: B[n] = A[n-1] = e, p = n-1 < n → match, p = n. Loop ends with 0 "+"!! Wait j goes 0..m-1 = n. At j = n: p = n-1 < n = 5? p < n: n-1 < n ✓ → match, p = n. Loop ends. 0 "+" emitted. Bug again!

Hmm: A = [e,e,e,e,e] (n=5), B = [e]*6 (m=6). j = 0,1,2,3,4: match (p: 0→5). j = 5: p = 5, p < n = 5? 5 < 5 false → "+". OK here p reached n at j=5, so "+" emitted. But in the scenario above with insertion at i < n: e.g., i = 2, A = [x,x,e,e,e], B = [x,x,e,e,e,e] (e inserted... e == A[2..4]). Greedy: j=0,1 match (p=2). j=2: B[2]=e, A[2]=e → match p=3. j=3: B[3]=e=A[3] → p=4. j=4: match p=5. j=5: p=5 not<5 → "+". Total 5 "=", 1 "+". ✓. Hmm OK because p catches up. Let me think again: after insertion at i, for j > i, B[j] = A[j-1], and p = j (if all matched) → compares A[j-1] with A[j]. If they're equal, p advances; effectively p stays == j and we compare A[j-1] vs A[j]. This continues until A[j-1] != A[j] (emit "+") or p reaches n: p = j and p < n fails when j = n = m-1 → the last element: j = m-1 = n, p = n-1? Wait p = j means p = n at j = n, but check happens before increment: at j = n, p = n (from previous match j = n-1 giving p = n). Then p < n false → "+". Hmm: at j = n-1: B[n-1] = A[n-2], p = n-1 < n ✓, compare A[n-2] == A[n-1]? If equal, match, p = n. j = n: p = n, not < n → "+". ✓ one "+". If at some j: A[j-1] != A[j] → "+" at that j, then p stays, and j+1: B[j+1] = A[j], p = j → match ✓, continues to end with no more "+". ✓ exactly one "+" in all cases. 

Wait, but is greedy guaranteed to only ever emit one "+"? What if there's an early mismatch... B[j] for j < i equals A[j] and p == j, so matches. Only potential "+" emissions: at j = i (if e != A[i]) or at j > i when A[j-1] != A[j] (only first such j, since after "+" we emit "-"... after emitting "+", p unchanged = j, next B[j+1] = A[j] == A[p] → match; then p = j+1, B[j+2] = A[j+1] vs A[j+1] ✓...). And if e == A[i], first "+" at first j > i with A[j-1] != A[j], or tail. So exactly one "+". ✓. Great, greedy is correct for D==1, n<m. Symmetric for n>m.

Hmm wait, one more check for the case e == A[i] and also e == A[i-1] etc. — covered above, exactly one "+" total. And the "=" items: p advances through all of A? p ends at n after loop? At end, p = n (since m = n+1 items, one "+", n matches) ✓ and "=" items in order = A ✓ (each "=" was b[j] == a[p] at time of match, and p increments once per "=", so "=" items = a[0..n-1] ✓).

Also D==0 case: n == m, sequences identical → all "=".

Now the middle snake function. Let me write it carefully with performance.

```python
def _middle_snake(a, b):
    n = len(a); m = len(b)
    delta = n - m
    odd = delta & 1
    max_d = (n + m + 1) // 2  # forward/reverse d up to this
    # V arrays indexed by k + offset, offset = max_d + 1 (k in [-max_d, max_d], plus k=±(max_d+1)?)
```

Forward uses vf[k+1] when k == -D → need index k+1 up to max_d+1? At d = max_d, k up to max_d, k+1 = max_d+1. Hmm, when k == D we don't read vf[k+1] (condition short-circuits: k == -D or (k != D and ...)). If k == D, first condition false (k == -D only if D==0... k==D and k==-D only when D==0, k=0), then k != D false → else branch. So vf[k+1] read only when k < D ≤ max_d → k+1 ≤ max_d ✓. Similarly vf[k-1] read when... else branch: k == D or (k != -D and vf[k-1] >= vf[k+1]): reads vf[k-1], k-1 >= -D... k > -D in that branch → k-1 >= -D+1 ≥ -max_d ✓. So array size 2*max_d + 1 with offset max_d works. Reverse similarly with its own diagonals kr ∈ [-max_d, max_d] in reversed coordinate system (independent of delta). Wait — reverse diagonals kr: reverse path in reversed coords from (0,0), diagonals kr = xr - yr ∈ [-d, d]. Independent of delta ✓. And forward check uses vr[delta - k]: delta - k ∈ [-(d-1), d-1] within range ✓. Reverse check uses vf[delta - kr]: |delta - kr| ≤ d ≤ max_d ✓... wait kr ∈ [-d, d], delta - kr ∈ [delta - d, delta + d], need |delta - kr| ≤ max_d: |delta| ≤ n + m... hmm delta can be up to max_d? |delta| = |n - m| ≤ n + m, and max_d = ceil((n+m)/2). If n >> m, |delta| could exceed max_d? |n - m| ≤ n + m, but vs ceil((n+m)/2): if n = 100, m = 0 — but m > 0 in middle snake (we handle empty before). n=100, m=1: delta = 99, max_d = ceil(101/2) = 51. delta - kr range: kr ∈ [-d, d] small → delta - kr up to 99 + 51 = 150 > 2*max_d. Problem!

But wait: if |delta| > max_d... D >= |delta| always, and D <= n + m. The middle snake loop: forward d up to ceil((n+m)/2), reverse d up to floor((n+m)/2). The check conditions: forward check happens when odd (|delta| odd) and delta - (d-1) <= k <= delta + (d-1). With delta = 99, d small: k ∈ [-d, d] — condition delta - (d-1) <= k requires k >= 99 - (d-1) > d ≥ |k| → impossible for small d. So the check only triggers when d - 1 >= delta - k... i.e., when k near delta. k ≤ d ≤ max_d and k ≥ delta - d + 1. For the check to possibly pass, need delta - (d-1) ≤ d → delta ≤ 2d - 1 ≤ 2·max_d - 1 ✓ always (since delta odd ≤ n+m... hmm delta ≤ 2·max_d - 1 when odd? n + m odd ⟺ delta odd; max_d = (n+m+1)/2; 2max_d - 1 = n + m ≥ delta ✓). And index delta - k for vr: |delta - k| ≤ d - 1 < max_d ✓. So vr accesses are within [-max_d, max_d] ✓. But wait, is delta - k within array bounds at check time? Condition ensures |delta - k| ≤ d - 1 ≤ max_d - 1 ✓. But we index vr[offset + delta - k] — offset must cover [-max_d-?, ...]. delta - k ≥ -(d-1) ≥ -(max_d - 1) ✓, ≤ d - 1 ✓. Good.

Reverse check (delta even): condition delta - d ≤ kr ≤ delta + d AND kr ∈ [-d, d]. Access vf[delta - kr]: |delta - kr| ≤ d ≤ max_d ✓. Hmm but also need vf[delta - kr] to have been written: vf written at iteration d for k ∈ {-d..d, parity d}; delta - kr: parity? kr ≡ d mod 2 (kr = -d, -d+2, ...), delta even → delta - kr ≡ d mod 2 ✓; |delta - kr| ≤ d ✓ by condition. Good.

But the array indexing: vf has size 2*max_d + 1, indices k ∈ [-max_d, max_d]. delta - kr ∈ [delta - max_d, delta + max_d]. With delta even and possibly large positive (n > m): delta + max_d could exceed max_d → index out of bounds! But the check condition delta - d ≤ kr ≤ delta + d with kr ∈ [-d, d] implies kr ≤ d ≤ max_d and kr ≥ -d; delta - kr: since kr ≥ delta - d → delta - kr ≤ d ≤ max_d ✓; and kr ≤ delta + d → delta - kr ≥ -d ≥ -max_d ✓. So the condition guarantees bounds. But we must evaluate the condition BEFORE indexing — yes, short-circuit. But careful with Python: `if delta_even and delta - d <= kr <= delta + d and vf[off + delta - kr] + xr >= n:` — need delta - kr bounds ✓ guaranteed. Good.

Similarly forward check with odd delta: condition delta - (d-1) ≤ k ≤ delta + (d-1) and k ∈ [-d, d] → delta - k ∈ [-(d-1), d-1] ✓.

Hmm wait, one more: for the forward check, we need vr[delta - k] to have been WRITTEN by reverse iterations 0..d-1. Reverse writes kr ∈ [-d', d'] parity d' for d' ≤ d-1. delta - k parity: delta odd, k ≡ d mod 2 → delta - k ≡ 1 - d ≡ d - 1 mod 2 ✓. |delta - k| ≤ d - 1 ✓. But "written" also requires that reverse iteration d-1 actually wrote that diagonal — reverse writes all kr in [-d', d'] with parity d' each iteration ✓ (no gaps). But initial: reverse d'=0 writes kr=0 only. If delta - k = 0 at d=1, k = delta: k ∈ [-1,1] requires |delta| ≤ 1... fine. If delta - k nonzero with |delta - k| ≤ d-1, written at iteration |delta - k| ≤ d-1 ✓ (since iteration d' writes all parity-d' diagonals in [-d', d']). ✓.

Also initialization: vr must be initialized such that reading vr[delta - k] before any write... guaranteed written per above? For d=1 forward check: delta odd, condition delta ≤ k+... delta - (0) ≤ k ≤ delta: k = delta, need |delta| ≤ 1... if delta = 1: k = 1 ≤ d=1 ✓. delta - k = 0, vr[0] written at reverse d=0 ✓ (reverse runs before? Order within iteration: forward first, then reverse. At iteration d, forward check uses reverse results from iterations ≤ d-1 ✓ since reverse d runs after forward d.) For d=1, reverse d=0 wrote vr[0] ✓.

But hold on — reverse at d'=0: kr = 0, k == -d → x = vr[k+1] = vr[1]. vr[1] must be initialized! Standard init: vr[1] = 0 (meaning: to be on diagonal 1... the sentinel allows first reverse step to move "down" from diagonal... In forward, vf[1] = 0 init so that at d=1, k=1: k == d → x = vf[0] + 1 (else branch, doesn't read vf[1]... wait: k == -d? no (1 ≠ -1). k != d? k == d → false → else: x = vf[k-1] + 1 = vf[0]+1. So vf[1] not read at k=1,d=1. When is vf[1] read? At k = -d: x = vf[k+1] = vf[-d+1]. d=1, k=-1: x = vf[0]. Hmm. The init vf[1] = 0 is for... at d=1, k=-1: condition k == -d → x = vf[k+1] = vf[0] — vf[0] initialized? vf[0] not initialized! At d=1, k=-1: x = vf[0]... but vf[0] was written at d=0 (k=0) ✓. At d=0, k=0: k == -d → x = vf[1] = 0 (init!) ✓. So vf[1] = 0 init is needed for d=0. Similarly vr[1] = 0 for reverse d=0. And also, does anything read vf[-1] or beyond? At d=0 only k=0. Reads: vf[k+1] when k == -d (k+1 = -d+1, written at d-1 if d ≥ 1 ✓, init for d=0: vf[1]). vf[k-1] in else branch: written at d-1 or... else branch when k == d or (k != -d and vf[k-1] >= vf[k+1]): if k == d: vf[k-1] = vf[d-1] written at d-1 ✓; else: k-1 could be... k ∈ (-d, d), parity k ≡ d: k-1 parity d-1, |k-1| < d ✓ written at iteration ≤ d-1 ✓. And vf[k+1] read in the comparison vf[k-1] < vf[k+1]: k+1 parity d+1? k ≡ d mod 2 → k+1 ≡ d+1 — written at iteration d-1? Iteration d-1 writes parity d-1 ≡ d+1 mod 2 ✓, |k+1| ≤ d+1 — hmm k < d → k+1 ≤ d... k+1 ≤ d ✓ (k ≤ d - 2 since parity). ✓ written.

Great, so arrays of size 2*max_d + 1 with offset max_d, init vf[1+off]... wait offset: index = k + off, off = max_d. vf[1] → index off + 1 = max_d + 1 ≤ 2*max_d ✓ (need max_d ≥ 1; n,m ≥ 1 → max_d ≥ 1 ✓).

Now, one concern: max_d = (n+m+1)//2 — forward loop d from 0 to max_d inclusive? The paper: D ≤ ceil((N+M)/2) for middle snake search. Actually the middle snake is found by the time d reaches ceil((N+M)/2) forward steps... Total D ≤ N+M; middle detection: forward d + reverse d = D, forward goes up to ceil(D_max/2)... Let me just run forward d up to max_d and reverse d up to max_d (same loop, both each iteration), and if no snake found by end — theoretically the snake is always found by d = ceil((N+M)/2)? Hmm: D ≤ N + M. Forward check triggers at d_f = ceil(D/2) when delta odd, reverse at d_r = D/2 when even. D ≤ n+m → d ≤ ceil((n+m)/2) = max_d ✓. So loop d from 0 to max_d inclusive and it will return. But to be safe, if not found (shouldn't happen), fall back to something — maybe just handle: after loop, do a trivial split (e.g., treat whole thing... could output a full replace script). I'll add a fallback that shouldn't trigger: if loop exhausts, split at... Actually if it exhausts without finding, we can fall back to: output all of a as "-" and all of b as "+"? That breaks minimality but shouldn't happen. Better fallback: hmm. Let me think whether it's truly guaranteed. Myers theorem: the middle snake is found with D ≤ ceil((M+N)/2)... Actually the paper says the algorithm finds the middle snake with d up to ceil((M+N)/2). For safety I'll include fallback: if not found, recursively do _diff(a[:n//2]...)? Simpler: fallback: treat as D = something: output prefix... I'll just make the loop range generous: d up to max_d, and after loop if nothing, do a naive fallback: find longest common... simplest safe fallback: `_diff(a[:1], b[:0])`-ish? Hmm. Let me instead guarantee correctness: fallback — emit ("-", all a) then ("+", all b)? That's a valid script (non-minimal). Given the guarantee D ≤ n+m ≤ 2·max_d, detection happens at d_f = ceil(D/2) ≤ ceil((n+m)/2) = max_d ✓. So loop to max_d inclusive suffices. But let me double check the detection d values: delta odd: detection during forward step at iteration d where D = 2d - 1... The overlap condition: forward furthest reaching on diagonal k at D_f = d... hmm, forward at iteration d computes furthest reaching with D_f = d edits? Forward iteration d gives furthest reaching points with d edits. Reverse iteration d-1 gives reverse furthest reaching with d-1 edits. Overlap → path with d + (d-1) edits passing through overlap... and the snake between them is the middle snake with D = d + (d-1) = 2d - 1. The theorem: when delta odd, overlap must occur by forward d = ceil((D)/2)... D = 2d-1 → d = (D+1)/2 ≤ (n+m+1)/2 = max_d ✓. Delta even: D = 2d, d = D/2 ≤ (n+m)/2 ≤ max_d ✓ (reverse check at iteration d uses forward from iteration d ✓, both ≤ max_d ✓). Good. I'll still add a defensive fallback raising... no, fallback: just emit full replace (guaranteed valid, maybe non-minimal — but it won't trigger).

Actually, hmm, wait: there's a subtle issue with the reverse detection returning D=0 handled earlier. Also forward detection returning D = 2d-1 where the snake might be... fine.

One more subtlety: the recursion when D > 1 but the middle snake found — the paper's condition is `if D > 1`. But also when D == 1 we skip recursion and handle directly ✓, and D == 0 ✓.

Hmm, but wait: there's an issue with the middle snake when D == 1 — we handle base case directly without using snake ✓.

Also need: recursion depth. Worst case: completely different 1000-line lists: D = 2000, recursion splits... depth O(log)? Each level: D splits roughly in half? The middle snake divides the path into D1 + D2 = D with D1, D2 ≈ D/2 (roughly). Depth ~ O(log D) typically but worst-case O(D)? The paper's divide: prefix edit distance D1 and suffix D2 with D1 + D2 = D... not exactly balanced but the recursion terminates. Python default recursion limit 1000 — worst case depth could exceed? The subproblem sizes shrink; depth bounded by... each recursion at least one side... Hmm, prefix problem has D1 ≤ (D)/... In Myers' algorithm, D1 ≤ ceil((D)/2)? Not exactly — D1 + D2 = D, and each ≥ 0. Adversarial cases could give unbalanced splits repeatedly → depth O(D) = 2000 > 1000 default recursion limit. To be safe, sys.setrecursionlimit(10000) or convert to iterative with explicit stack. Since we must only use stdlib — sys is stdlib, fine. But setting recursion limit globally is a side effect; acceptable? Alternatively implement iteratively with an explicit stack. Let me do explicit stack to be safe and clean:

```python
def _diff(a, b, out):
    stack = [(a, b)]
    while stack:
        a, b = stack.pop()
        ... base cases ...
        else:
            D, x0, y0, x1, y1 = middle snake
            if D > 1:
                push suffix first, then prefix (so prefix processed first to keep order? stack LIFO: push (a[x1:], b[y1:]) then (a[:x0], b[:y0]) → pop prefix first ✓)
                but the middle "=" lines must be emitted between prefix and suffix outputs!
```

Problem: with a stack, emitting middle "=" between the two halves requires ordering. Use a stack of tasks where tasks are either ("diff", a, b) or ("emit", items):

```python
stack = [("diff", a, b)]
while stack:
    tag, a, b = stack.pop()
    if tag == "emit":
        out.extend items
    else:
        base cases → append directly
        else:
            middle snake
            if D > 1:
                mid = [("=", a[i]) for i in range(x0, x1)]
                stack.append(("diff", a[x1:], b[y1:]))
                stack.append(("emit", mid))
                stack.append(("diff", a[:x0], b[:y0]))
```

LIFO: pop prefix diff → its outputs appended first ✓, then emit mid ✓, then suffix ✓. 

Slicing a[:x0] copies lists — O(n) per level; total O(n log n)-ish, fine for 20000. Actually total copy cost: each level copies the sublists; sum over recursion tree ~ O((n+m) · depth). Depth could be O(D) worst case = 2000 → 20000·2000 = 40M — too slow? Hmm, worst case depth. Realistically the middle snake splits so that D1, D2 ≤ ... let me think: is it guaranteed D1 ≤ ceil(D/2) or similar? No — the middle snake splits the edit path at the middle snake; D1 + D2 = D, no balance guarantee. Hmm, actually there IS a property: the middle snake is found at forward d and reverse d' with d + d' = D... the split gives D1 ≤ d-ish? The prefix path from (0,0) to (x0,y0) has edit distance ≤ d_f (forward steps used) or d_r? Hmm: prefix ends at snake start, which was reached by the forward path with d_f edits or reverse path with d_r edits. If detected in forward at iteration d_f: path to (x0, y0) uses ≤ d_f edits... Actually the forward path reaching (x0,y0) has exactly d_f - ... the point (x0,y0) is the start of the d_f-th snake, reached with d_f edits? At forward iteration d, points (x0,y0) are reached with exactly d edits? The furthest reaching point on diagonal k at iteration d is reached with exactly d edits (or could coincide with d-1 case). Roughly D1 ≤ d_f and D2 ≤ d_r, d_f + d_r = D... For odd delta: D = 2d-1, d_f = d, d_r = d - 1 → D1 ≤ d, D2 ≤ d - 1. Both ≤ (D+1)/2. So each subproblem has edit distance ≤ ceil(D/2)! Then depth: D halves each level → depth O(log D) ≈ 11 for D=2000. 

Wait is that right? For odd delta detection at forward iteration d: D = 2d-1. Prefix (0,0)→(x0,y0): the forward furthest reaching path at iteration d on diagonal k — exactly d edits? The furthest reaching point at iteration d could also be reached with fewer edits (if paths coincide), but ≤ d. So D1 ≤ d = (D+1)/2 ✓. Suffix (x1,y1)→(n,m): reverse furthest reaching at iteration d-1: ≤ d-1 edits = (D-1)/2 ✓. For even delta: D = 2d, prefix ≤ d, suffix ≤ d ✓. So D1, D2 ≤ ceil(D/2). Depth ≤ log2(D) + O(1) ≈ 12. And total work: T(N,M,D) = O((N+M)D) at top + T(N1,M1,D1) + T(N2,M2,D2), with D1+D2 = D... total work O((N+M)·D) by standard argument (sizes telescope). ✓.

So recursion depth fine even with actual recursion, but I'll use iterative anyway (avoids recursion limit issues entirely).

Now, performance tuning of _middle_snake:

```python
def _middle_snake(a, b):
    n = len(a); m = len(b)
    delta = n - m
    odd = delta & 1
    max_d = (n + m + 1) // 2
    size = 2 * max_d + 1
    off = max_d
    vf = [0] * size
    vr = [0] * size
    vf[off + 1] = 0  # already 0
    vr[off + 1] = 0
    # local refs
    for d in range(max_d + 1):
        # forward
        kmin = -d; kmax = d
        for k in range(kmin, kmax + 1, 2):
            ki = k + off
            if k == kmin or (k != kmax and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            y = x - k
            x0 = x; y0 = y
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            vf[ki] = x
            if odd and delta - (d - 1) <= k <= delta + (d - 1) and x + vr[delta - k + off] >= n:
                return (2 * d - 1, x0, y0, x, y)
        # reverse
        for kr in range(kmin, kmax + 1, 2):
            kri = kr + off
            if kr == kmin or (kr != kmax and vr[kri - 1] < vr[kri + 1]):
                xr = vr[kri + 1]
            else:
                xr = vr[kri - 1] + 1
            yr = xr - kr
            px = xr; py = yr
            while xr < n and yr < m and a[n - xr - 1] == b[m - yr - 1]:
                xr += 1; yr += 1
            vr[kri] = xr
            if (not odd) and delta - d <= kr <= delta + d and xr + vf[delta - kr + off] >= n:
                return (2 * d, n - xr, m - yr, n - px, m - py)
    # fallback (should not happen)
    return None
```

Wait — check the reverse overlap condition direction: forward point (xf, yf) = (vf[delta - kr] mapped: vf stores x on diagonal delta - kr → point (x_f, x_f - (delta - kr))). Reverse point in original coords: (n - xr, m - yr). Overlap: x_f ≥ n - xr → x_f + xr ≥ n ✓ as written. ✓.

Hmm, but one more check on the reverse snake direction for the returned tuple: snake in reversed coords from (px, py) to (xr, yr). Original: reversed coord q ↔ original index (len - 1 - q). Snake covers reversed indices [px, xr) ↔ original A indices [n - xr, n - px). ✓ So original snake from (n - xr, m - yr) to (n - px, m - py) ✓ as returned.

Edge case in forward detection at d=0: odd delta... d=0: k=0 only; condition odd and delta - (-1) ≤ 0 ≤ delta + (-1) → delta + 1 ≤ 0 ≤ delta - 1 → impossible ✓. Good.

Edge: d=0 reverse with delta == 0 → returns D=0 with full snake when sequences equal ✓ (as analyzed). But wait, if delta == 0 and sequences NOT equal: d=0 reverse check: condition 0 ≤ 0 ≤ 0 ✓, xr + vf[0] >= n? vf[0] = initial snake length x1, xr = initial reverse snake length. If x1 + xr >= n... e.g., n=m=10, common prefix 6, common suffix 5 (overlap in middle? can't — prefix and suffix overlap means all equal). If prefix 6 + suffix 5 = 11 > 10 → sequences... prefix [0,6), suffix [5,10) overlap at index 5 → a[5] in both → all could still differ elsewhere? No: prefix means a[i]==b[i] for i<6; suffix means a[i]==b[i] for i≥5; combined all i → identical. Contradiction with "not equal". But x1 + xr >= n with delta=0: x1 on diagonal 0 (y = x), xr similarly. If x1 + xr >= n and both snakes on diagonal 0 covering [0, x1) and [n - xr, n) with n - xr ≤ x1 → union covers [0, n) on diagonal 0 → a[i] == b[i] ∀i → identical → D=0 correct ✓. And the returned snake: start (n - xr, m - yr), end (n - px, m - py) = (n - 0, m - 0) = (n, m) — covers [n-xr, n) but the true full snake is [0, n). The snake returned doesn't cover the whole [0,n)! Then recursion with D=0: our code for D ≤ 1 handles: D == 0 → output all a as "=" ✓ (correct since identical). So the wrong snake endpoints don't matter because D==0 branch ignores them ✓. But careful: code path: `if D > 1: ... elif D == 1: ... else: all "="`. ✓.

But hmm — what about D==1 detection returning a snake that doesn't cover properly? We ignore snake for D==1 too (greedy). ✓. Only D > 1 uses snake endpoints. For D > 1, is the snake correct? Standard algorithm ✓.

Wait, actually there's a subtle issue: for D > 1 detection, could the detected overlap produce a snake where x0 > x1 or nonsense? At forward detection: snake from (x0,y0) to (x,y) with x ≥ x0 ✓ (snake only extends). And reverse detection similar. But could forward detection trigger when the "overlap" is with a reverse point that hasn't the right relationship... The standard algorithm is proven; trust it. But one thing to double check: the forward check condition `x + vr[delta - k + off] >= n` — vr values are furthest reaching in reversed coords. But there's a known subtlety: also need y + yr >= m — shown equivalent ✓. And need the reverse point to be reachable... it's furthest reaching, and if forward reach ≥ reverse reach on the diagonal, paths cross ✓.

Hmm, but actually there's a classic subtlety: overlap detection requires that the reverse furthest reaching point on that diagonal was computed with D_r = d - 1 steps, and the overlap condition must ALSO ensure that combining gives D = 2d - 1 exactly and the middle snake is "middle" (i.e., d_f ≥ d_r). The paper's condition handles it. But one more known condition: for odd delta, the check `delta - (d-1) <= k <= delta + (d-1)` — some implementations also require... I recall Coglan's exact code:

```ruby
if odd and delta - (d - 1) <= k and k <= delta + (d - 1)
  if x + vr[delta - k] >= n
    return [2 * d - 1, px, py, x, y]
```

Wait — Coglan returns the FORWARD snake [2d-1, px, py, x, y] where (px,py) is the snake start ✓ matches mine.

And reverse:
```ruby
if !odd and delta - d <= k and k <= delta + d
  if x + vf[delta - k] >= n
    return [2 * d, n - px, m - py, n - x, m - y]
```

Hmm — Coglan returns [2d, n - px, m - py, n - x, m - y]: start (n - x, m - y)? or (n - px, m - py)? Let me re-derive: reversed snake from (px,py) to (x,y). Original snake start should be the one closer to (0,0): original coord of reversed point q is (n - q_x, m - q_y)... reversed point px (smaller) ↔ original (n - px, m - py) (larger). So original snake: from (n - x, m - y) to (n - px, m - py). So return (D, n - x, m - y, n - px, m - py) — start first. In my code above I wrote `return (2 * d, n - xr, m - yr, n - px, m - py)` — with xr being the end (larger reversed) → start = (n - xr, m - yr) ✓, end = (n - px, m - py) ✓. Matches. (Coglan's might list them differently but as long as start ≤ end in original coords, our usage (prefix = a[:x0], middle a[x0:x1], suffix a[x1:]) is consistent.) ✓.

Now, wait: in reverse detection, is it possible that the reverse snake is empty (px == x) — like my earlier example — and D = 2 > 1, snake empty: then recursion: prefix LCS(a[:x0], b[:y0]), no middle lines, suffix LCS(a[x1:], b[y1:]). Valid ✓.

Another subtlety: in the reverse detection, the condition uses vf[delta - kr] — forward values from iteration d (same iteration, forward ran first) ✓.

Also, must double-check the reverse loop's diagonal selection rule. Reverse in reversed coords is a forward-like algorithm on reversed sequences — the rule is identical to forward: if kr == -d or (kr != d and vr[kr-1] < vr[kr+1]): xr = vr[kr+1] else xr = vr[kr-1] + 1. ✓ (since it IS the forward algorithm on reversed sequences). ✓.

Now, hmm, one thing: in the forward branch, when k == kmin and reading vf[ki+1] — at d=0, k=0=kmin: reads vf[off+1] = init 0 ✓.

Performance micro-optimizations:
- Use local variables for a, b, n, m, vf, vr, off, delta, odd inside _middle_snake ✓ (they are locals already).
- The snake while loop: `while x < n and y < m and a[x] == b[y]` — could optimize with slice comparison? Finding snake length via comparing... e.g., compute using a manual loop is O(len); alternative: use a loop unrolled or use `is` comparison? Lines are strings; equality check fine. Could speed by first checking chunk equality? For the "differ in 50 places" case, prefix/suffix trimming already reduces core to tiny. For the 1000-different case, snakes are short. The dominant cost there: d-loop up to 1000, k-loop 2d+1 each → ~1M iterations of k-loop body, each with a few list index ops + condition. ~1M × maybe 0.5µs-1µs = 0.5-1s, plus reverse another 1M → 1-2s total, plus snake steps ~ (n+m) per d = 2M × 2 = 4M → hmm. Snake steps: per d, total snake extension across k ≤ n + m + 2(2d+1)? Actually bounded by n+m (each snake covers distinct (x,y) cells mostly). Per d ≤ n + m + 2d + 1 ≈ 2000 + small. Over 1000 d's: 2M steps for forward, 2M for reverse → 4M snake steps. Each step: index a[x], b[y], compare → ~0.15µs each in CPython? More like 0.1-0.2µs → 0.6-0.8s. Plus k-loop overhead 2M iterations × ~0.3µs = 0.6s. Total maybe 1.5-2.5s. Under 6s ✓. But wait — is the recursion going to redo this at every level? Total work argument: sum over subproblems of (N_i + M_i) × D_i... For the completely-different case: top level D=2000? Wait, D for completely different n=m=1000: D = 2000. max_d = 1001... wait (n+m+1)//2 = 1001? n+m = 2000 → max_d = 1000 (2001//2 = 1000). Hmm 2001//2 = 1000 ✓. Detection at d = D/2 = 1000 ✓ (even delta). So top-level runs d = 0..1000 → the costs above. Subproblems: D1, D2 ≤ 1000 each, sizes roughly halves... total additional work: subproblem sizes sum ≈ n+m per level, D halves per level → total ≈ (n+m)(D + D/2 + D/4 + ...) = 2(N+M)D ≈ 8M. Hmm, that doubles my estimate → ~3-5s. Tight-ish for 6s but probably OK. Can optimize:

Optimization: skip forward or reverse loops when they can't trigger the check? For delta odd, reverse loop still needed (provides vr values). Can't skip.

Optimization: bound d loop by remaining D? Not known.

Better optimization: prune k range: only diagonals k with reachable points matter: forward on diagonal k needs k ≤ n - ... a point (x, y) with y = x - k ≥ 0 → x ≥ k; and x ≤ n, y ≤ m. Diagonal k reachable only if -m ≤ k ≤ n. So clamp kmin = max(-d, -m), kmax = min(d, n). For n = m = 1000, d ≤ 1000: kmax = min(d, 1000) — no help at top level. Hmm.

Alternative optimization: instead of list-based V with offset, they're fine.

Another big optimization: trim within subproblems too (common prefix/suffix of subproblems) — cheap and helps many cases. Add prefix/suffix trimming inside _diff's main loop? That's O(N+M) per call, negligible, and can massively shrink D for structured inputs. For random data it doesn't help but doesn't hurt. Let me add it — careful: trimming inside the loop before computing middle snake.

Actually for the completely-different random-lines case, trimming won't help (no common lines). The estimate ~3-5s stands. Let me optimize the inner loops harder.

Idea: avoid the `odd and` and range checks inside the k-loop when they can never trigger: for forward check, need k ≥ delta - (d-1); so restrict the check to k ≥ max(kmin, delta - d + 1) — restructure: run k-loop, and do the check only when k ≥ check_lo where check_lo = delta - d + 1 (precomputed). Similarly k ≤ delta + d - 1 — but k ≤ d ≤ ... delta + d - 1 ≥ d when delta ≥ 1; when delta very negative, delta + d - 1 < kmin possible → check_hi = min(kmax, delta + d - 1). Precompute lo/hi per d, and inside loop just `if lo <= k <= hi and ...` — or split loop into segments. Simpler: compute `fk_ok = delta - d + 1` and compare `if k >= fk_ok and k <= delta + d - 1 and ...`. Even simpler: since k increments by 2, compute the first k where check applies and last, and handle via separate loop ranges. That complicates code. Alternative: do the check unconditionally but guard the vr index: `if -max_d <= delta - k <= max_d and x + vr[...] >= n`? That's 2 comparisons vs range check 2 comparisons — same. Hmm, but note: the check `x + vr[delta-k+off] >= n` — vr[delta-k+off] could be read even if never written (contains 0 init) — would 0 cause false positives? vr init 0 → x + 0 >= n → x >= n → only if snake reached end. If x == n (forward reached bottom), then y = x - k... if x = n and the path is valid, D_f = d... then total path D = d + 0?? That would falsely return with wrong D! E.g., delta odd, k such that delta - k out of written range → vr = 0 → condition x >= n triggers if forward reached x = n. Is that possible with k in [delta-(d-1), delta+(d-1)]? The range condition prevents it ✓ (we keep the range check). So keep range checks. Fine.

Let me restructure for speed: precompute per-d the check bounds and iterate:

```python
for d in range(max_d + 1):
    dm1 = d - 1
    # forward
    klo = -d if -d > -m else -m   # max(-d, -m)
    khi = d if d < n else n       # min(d, n)
    clo = delta - dm1
    chi = delta + dm1
    for k in range(klo, khi + 1, 2):
        ...
        if clo <= k <= chi and x + vr[delta - k + off] >= n: ...
```

Hmm, the clamp klo/khi: does clamping break the algorithm? Diagonals outside [-m, n] have no valid points (y < 0 or x > n). vf[k] for such k: y = x - k... if k > n: x ≤ n → y < 0 invalid. Setting vf[k] for unreachable k could poison neighbors? Neighbors read vf[k±1]; if we skip computing vf[k] for unreachable k but a reachable k' = k±1 reads vf[k]... Reachable k' has neighbor k = k'±1 also reachable? k' ∈ [-m, n], k'±1 ∈ [-m-1, n+1] — could be unreachable by 1! E.g., k' = n reachable (x=n,y=n-k'... wait k'=n → y = x - n ≤ 0, y=0 x=n valid), neighbor k = n+1 unreachable but read as vf[k'-1]?? Forward step on diagonal k' = n: else branch reads vf[k-1] = vf[n-1] ✓ reachable; if branch k == -d or vf[k-1] < vf[k+1] reads vf[k+1] = vf[n+1] — uninitialized/stale! Danger. Standard implementations don't clamp and rely on k ∈ [-d, d]. With clamping we'd read vf[n+1] which was possibly written in an earlier d as garbage... To be safe, don't clamp; instead initialize vf so that unreachable diagonals read as very small (so the max-choice avoids them)? If vf[k+1] = -1 (sentinel "unreachable"), then vf[k-1] < vf[k+1] false → chooses else ✓. But vf[k+1] stale from previous d could be a real value... Previous d wrote vf[k+1] only if k+1 ∈ [-(d-1), d-1]; if k = d now, k+1 = d+1 never written (indices only up to d-1 previously... wait previous iterations wrote up to ±(d-1)); k+1 = d+1 > d-1 → never written → holds init 0. Init 0 vs sentinel: at k = d: condition k == -d? no; k != d? no → else branch, doesn't read vf[k+1] ✓. At k = -d: reads vf[k+1] = vf[-d+1] written at d-1 ✓. So uninitialized reads happen only where the branch logic avoids them... except when clamped diagonals create gaps. Without clamping, no gaps: every k ∈ [-d, d] parity-d written each iteration ✓, and reads only touch written cells ✓ (shown earlier). So skip the clamp; keep k ∈ [-d, d]. The clamp was only an optimization; for n=m it doesn't help anyway. But for very unbalanced sizes (n >> m), clamping helps a lot... but risky. Alternative safe clamp: kmin = max(-d, delta - ? ) hmm. The true reachable diagonal range for forward after d edits: k ∈ [delta - ... no. Points reachable with d edits: k ranges over [-d, d] intersected with valid region... any k ∈ [-d,d] with ∃(x,y): x=y+k, 0≤x≤n, 0≤y≤m → k ∈ [-m, n]. For k outside, the "furthest reaching" would be clamped... Standard V values for unreachable diagonals: the algorithm computes x = max(vf[k-1], vf[k+1]) + ... and snake does nothing (bounds fail), storing garbage x that may violate 0≤y≤m. Do these garbage values poison? They're read by neighbors at the NEXT iteration: neighbor k' = k±1 ∈ [-d-1... but next iteration range is [-(d+1), d+1], reads vf[k±1] ⊂ [-d-2, d+2]... The garbage for unreachable k: x computed = vf[k-1]+1 or vf[k+1]; e.g., k = n+1 (unreachable, since x ≤ n... wait k ≤ d and k > n means d > n): x from vf[k-1]+1 where vf[k-1] is real ≤ n → x ≤ n+1, y = x - k = x - n - 1 ≤ 0 → y < 0 unless x = n+1... snake loop `while x < n and y < m` — y < 0 < m... y < m true, x < n maybe true → would compare a[x] == b[y] with y negative → b[-1] — BUG (negative indexing!). Without clamping can this happen? k ≤ d ≤ max_d ≤ (n+m+1)/2. y = x - k ≥ ... x ≥ ... For k > n: need d > n. With n=1, m=1000: max_d = 501, d up to 501 > n=1. k up to 501, k > n for k ≥ 2. At k = 2, d = 2: x = vf[1] + 1 or vf[3]; vf[1] real: diagonal 1... n=1: on diagonal 1, x ≤ 1, y = x - 1 ≥ 0 → x=1,y=0 valid. vf[1] = 1 (after snake). k=2: x = vf[1] + 1 = 2 > n → snake: x < n false → vf[2] = 2, y = 0. No negative y ✓ (y = x - k = 0). k=3: x = vf[2]+1 = 3, y = 0 → vf[3]=3, y=0 ✓ never negative! Because x = k when following the "+1" chain from diagonal... x ≥ k - something? Hmm: y = x - k; for unreachable diagonal k > n: x from vf[k-1] + 1: if vf[k-1] corresponds to y_{k-1} = x_{k-1} - (k-1), then x = x_{k-1} + 1 → y = x_{k-1} + 1 - k = y_{k-1} ≥ 0 ✓. Or x = vf[k+1]: y = vf[k+1] - k = y_{k+1} ≥ 0 ✓ (y preserved when moving from k+1 to k via deletion... the move from diagonal k+1 to k is x+1 keeping y: x_new = x_{k+1} + 1?? hmm). In the forward algorithm, the else branch (x = vf[k-1] + 1) corresponds to moving right (deletion): new point (x_{k-1} + 1, y_{k-1}) — same y, y_{k-1} ≥ 0 ✓. The if branch (x = vf[k+1]) corresponds to moving down (insertion): point (x_{k+1}, y_{k+1} + 1)? But the algorithm sets y = x - k = x_{k+1} - k = y_{k+1}... that gives y = y_{k+1}, but insertion should give y_{k+1} + 1?? Hmm, no: the furthest reaching formulation: on diagonal k, coming from diagonal k+1 by an insertion (down move) means new point has same x as the point on k+1, y = y_{k+1} + 1. But the algorithm uses x = vf[k+1] and y = x - k = y_{k+1}. That's y_{k+1}, not y_{k+1}+1. Hmm — because vf[k+1] as furthest reaching x on diagonal k+1: the point (vf[k+1], vf[k+1] - (k+1)); moving down: (vf[k+1], vf[k+1] - k) → y = y_{k+1} + 1 ✓ — wait y_{k+1} = vf[k+1] - (k+1), and new y = x - k = vf[k+1] - k = y_{k+1} + 1 ✓. Oh right, y = x - k automatically gives y_{k+1} + 1. And y_{k+1} + 1 ≥ 1 ≥ 0 ✓. And moving right from k-1: y same ≥ 0 ✓. So y ≥ 0 always ✓. Similarly x ≥ 0 ✓. And can y exceed m or x exceed n? x = vf[k-1] + 1 could exceed n; then snake loop's `x < n` false → vf[k] = x > n stored. Then later reads: neighbor k' = k - 1: if branch compares vf[k-1] < vf[k+1]... could choose x = vf[k+1] where vf[k+1] > n (garbage) → y = x - k... Let me think whether garbage x > n on diagonal k can be chosen for reachable k': k' = k - 1 (from k via... choosing x = vf[k+1] means coming from k+1 via insertion... hmm the choice x = vf[k±1] for diagonal k': reading vf[k'+1] where k'+1 = k garbage > n → x > n → snake skipped → vf[k'] = x > n, propagates garbage upward in x along decreasing... This is the standard behavior — for diagonal k where the path must overshoot, the value > n represents "unreachable/overshoot" and comparisons vf[k-1] < vf[k+1] still work correctly because overshoot values are larger... Actually the standard algorithm doesn't clamp and is proven correct; the stored values may exceed n but the algorithm's correctness doesn't depend on clamping since D detection uses overlap conditions. The known implementations (e.g., Coglan's, git's xdiff) don't clamp and are correct. Negative indices: shown y ≥ 0 always ✓, x ≥ 0 ✓. But b[y] with y ≥ m? Snake loop checks y < m ✓. a[x] with x possibly ≥ n? loop checks x < n ✓. OK safe.

So no clamping; correct.

Now, performance improvement idea: for the k-loop, avoid attribute/global lookups — all locals ✓. Use while loop with manual k += 2 vs range — range is fine.

Another optimization: in the snake while loop, cache a[x] and b[y] lookups: 

```python
while x < n and y < m:
    if a[x] != b[y]: break
    x += 1; y += 1
```
Similar cost. Alternatively, speed snake via memoryview? No. Could use `a[x] == b[y]` directly.

Alternative bigger optimization: map lines to integers first (interning via dict) so comparisons are int == int (fast) — string comparison of equal strings hashes... For repeated identical lines, string comparison short-circuits on identity? CPython str == does pointer check first → identical objects fast. If lines repeat and come from the same list objects, a's line and b's line are different objects even if equal → full comparison. For random 1000 distinct lines, comparisons are between distinct strings → fail fast on first char usually. Interning via dict: `ids = {}; A = [ids.setdefault(line, len(ids)) ...]` hmm setdefault returns value; `key = ids.get(line); if key is None: key = len(ids); ids[line] = key`. This converts to ints; comparisons fast. Also enables... worth it: mapping cost O(N+M) dict ops, then all snake comparisons are int compares. Also could compare whole-slice... Actually here's a thought: with ints, we could speed the snake loop significantly. Also equality trimming etc. Let me include interning in diff_lines top-level: map both lists to int lists once, run algorithm on ints, output original strings. But output needs original lines: for "-" items use a's original line, "+" use b's, "=" use either (they're equal strings — use a's or b's; equal value). We need mapping from int index positions → original lines: just keep original lists and index them in parallel, or output using a_orig[i] etc. Since algorithm works on indices, and output needs a[i]/b[j] originals — keep both int lists (for algorithm) and original lists (for output). In _diff tasks, carry (aint, bint, aorig, borig, offset?) — simpler: make the algorithm operate on the original lists but with pre-interned... Hmm, simpler: convert to ints, run algorithm producing a sequence of ops as ("=", i, j) / ("-", i) / ("+", j) index triples? Then materialize. That's clean: _diff on int lists returns/emits index-based ops, then final pass maps to lines. Let me do: _diff(ia, ib, out_ops) emits tuples ("=", ia_idx, ib_idx) etc. Then final: convert. Memory: fine.

Actually simpler: keep two parallel structures per task: (a_int, b_int) for algorithm, and for output use original lists with same indices — since a_int[i] corresponds to a_orig[i] (same order) ✓, b_int[j] ↔ b_orig[j] ✓. So tasks carry (ai, bi) int lists; output ops reference indices; final mapping uses original lists. But "=" op needs the line: a_orig[i] (== b_orig[j]) ✓. "-" → a_orig[i], "+" → b_orig[j].

Wait, but slicing for subtasks: a[:x0] on int lists; originals sliced too, or just keep global originals and absolute indices. Simplest: pass slices of int lists; collect ops with indices relative to slice; then adjust by offsets? Messy. Alternative: pass (a_int, b_int, a_base, b_base) offsets... Let me just slice both int lists and record ops with slice-relative indices, then at the end, walk through with running offsets? No — the ops from different subproblems have different bases; but if each subtask also carries its base offset and ops are recorded with absolute indices, done: task = (a_int_slice, b_int_slice, a_base, b_base); op emission: ("=", a_base + i, b_base + j), ("-", a_base + i), ("+", b_base + j). Slicing int lists is cheap.

Then final materialization:

```python
result = []
for op in ops:
    t = op[0]
    if t == "=": result.append(("=", a[op[1]]))
    elif t == "-": result.append(("-", a[op[1]]))
    else: result.append(("+", b[op[2]]))
```

OK. Actually, do we even need int interning? It adds code but improves const factor for string comparisons. For 20000 lines differing in 50 places: trimming handles it in O(N+M) — fast regardless. For 1000 different: string compares fail fast; int compare maybe 2x faster. The k-loop overhead dominates anyway. I'll include interning — it also helps when lines repeat with long common content. Hmm, interning cost: dict get per line ~0.1µs × 2000 = negligible. Fine, include.

Actually wait, there's another consideration for correctness with "=": when a line appears multiple times, our algorithm outputs "=" with specific indices — fine.

Let me now also double check the D>1 recursion usage of middle snake endpoints: prefix = a[:x0], b[:y0]; middle: a[x0:x1] (== b[y0:y1]); suffix a[x1:], b[y1:]. And D1 = edit distance of prefix problem ≤ d_f (forward detect: d; reverse detect: d) hmm for reverse detection D = 2d: prefix edit distance ≤ d? The prefix path to (x0, y0) = (n - xr, m - yr): in reversed coords the reverse path reached (xr, yr) with ≤ d edits ✓ → prefix D1 ≤ d ✓. Suffix: (x1,y1) = (n - px, m - py) to (n,m): reversed path from (0,0) to (px, py) with ≤ d edits → suffix D2 ≤ d ✓. Good.

Now let me also handle the top-level in diff_lines: trimming prefix/suffix, then check if core empty → all "="; else run _diff. Also the trivial full-replace shortcuts: if no common lines at all? Not needed.

Also: what about the case where after trimming, one side empty → emit all "+" or "-" ✓ handled by _diff base.

Let me also think: should trimming be inside _diff loop as well? It helps for inputs with large common blocks around each diff region. For safety/perf, add trimming at the start of each _diff task processing. Cost O(len) per task, tasks total size O((N+M) log D) — fine. Actually, trimming inside tasks with the stack approach: when popping a ("diff", a, b, abase, bbase) task, trim prefix/suffix, emit "=" ops directly for the trimmed parts, then process core. This could significantly reduce work for structured inputs. Include it.

Hmm wait, careful: trimming inside _diff changes nothing about minimality ✓ (standard).

Also quick win: before middle snake, if the core is small... no, generic.

Now write _middle_snake returning None fallback → in that case, emit full replace: for i in a: "-"; for j in b: "+". (Shouldn't happen.)

Let me now also double-check the D==1 greedy once more with the interning/index-op approach: D==1, n<m: iterate j over b_int, p over a_int:

```python
p = 0
for j in range(m):
    if p < n and bi[j] == ai[p]:
        out.append(("=", abase + p, bbase + j)); p += 1
    else:
        out.append(("+", abase, bbase + j))  # hmm ("+", None, bbase+j)
```

Wait but "=" op: I said ("=", i, j). For "-" ("-", i, -1) and "+" ("+", -1, j). Use sentinel -1 or None.

Hmm, but earlier analysis of greedy assumed D==1 ⟹ exactly one insertion and the structure B = A[0:i]+[e]+A[i:]. Proven exactly one "+" ✓. But wait — I should double check the claim D==1 ⟹ |delta|==1 ⟹ one insertion or deletion only. Edit distance D between sequences = (insertions + deletions) in minimal script = (n + m) - 2·LCS... D = n + m - 2L. D == 1 → n + m odd, L = (n+m-1)/2. If n < m: script has (n - L) deletions and (m - L) insertions: n - L = n - (n+m-1)/2 = (n - m + 1)/2 = (1 - delta)/2... with delta = n - m = -1 (odd, |delta| ≤ D = 1 → delta = ±1): delta = -1 → deletions = 0, insertions = 1 ✓. Good.

But hold on: in _diff, when do we get D==1 from middle snake? The middle snake returns D values 2d-1 or 2d. D==1 arises from forward detection at d=1 (delta odd). Fine.

But there's an important subtlety: the middle snake detection might return D=1 — but could detection return D=1 when true D is... no, detection D = 2d-1 with d=1 means overlap between forward-1-edit and reverse-0-edit paths → true D... The paper proves the first overlap found gives the true minimal D path. Trust it.

Also, potential subtle bug: forward detection condition — must also verify that the reverse path used has the opposite parity relationship, i.e., we don't detect "overlap" between forward and reverse paths that don't actually compose to a full path... The paper's condition is exactly what I have. OK.

Now — one more known correctness caveat: in the forward check, we compare with vr from iteration d-1, but the reverse furthest reaching points at iteration d-1 might not exist for diagonal delta - k if... covered by range check (guaranteed written) ✓.

Hmm, actually one more: the range check for forward is delta - (d-1) ≤ k ≤ delta + (d-1). Coglan uses exactly this. ✓.

Now let me also think about whether the check should use `>=` on x + vr >= n: Coglan uses `x + vr[delta - k] >= n` ✓.

Reverse check: `xr + vf[delta - kr] >= n` with range delta - d ≤ kr ≤ delta + d ✓.

Now let me also handle: middle snake might find D such that... one more potential issue: forward detection returns snake; but is it possible that the forward detection triggers at iteration d but an even-delta... no, checks are parity-gated.

Edge: n == m and sequences identical → D=0 detected at reverse d=0 ✓ (shown). But wait — with trimming, identical cores rarely reach middle snake... after trimming, if sequences identical, core is empty → handled before. But subproblems may still hit it. Fine.

Edge: n==1, m==1, different lines: delta=0 even, max_d = 2? (1+1+1)//2 = 1. d=0: forward k=0: snake none (differ) vf[0]=0. reverse k=0: snake none vr[0]=0. check: delta=0, 0≤0≤0 ✓, xr + vf[0] = 0 >= n=1? No. d=1: forward k=-1: k==-d → x = vf[0] = 0, y = 1... y = x - k = 0 - (-1) = 1. snake: x<1 ✓, y<1? 1<1 false → vf[-1] = 0. check: odd? no → skip. k=1: k==d → else: x = vf[0]+1 = 1, y = 0. snake: x<1 false → vf[1] = 1. reverse k=-1: x = vr[0] = 0, y = 1. snake reversed: a[n-xr-1] = a[0], b[m-yr-1] = b[-1] = b[0]: differ → vr[-1] = 0. check: delta - d = -1 ≤ -1 ≤ delta + d = 1 ✓; xr + vf[delta - kr] = 0 + vf[0 - (-1)] = vf[1] = 1 → 0 + 1 = 1 >= n=1 ✓ → return (2, n - xr, m - yr, n - px, m - py) = (2, 1-0, 1-1, 1-0, 1-0) = (2, 1, 0, 1, 1). Snake from (1,0) to (1,1)?? Original snake start (n - xr, m - yr) = (1, 0), end (n - px, m - py) = (1, 1). Empty snake (x0 == x1 = 1). Then D=2 > 1: prefix = a[:1], b[:0] → emit "-" a[0]. middle a[1:1] empty. suffix a[1:], b[1:] → both empty... suffix = a[1:] = [], b[1:] = [] → nothing. Total: "-" a[0], "+" b[0]?? Wait where's "+" for b[0]? prefix problem: a[:1] = [a0], b[:0] = [] → base case m==0 → emit "-" a0 ✓. Suffix empty. But b[0] never emitted!! Missing "+"!

Hmm! Let me recheck. The path: D=2 from (0,0) to (1,1): e.g., delete a0 (reach (1,0)), insert b0 (reach (1,1)). Middle snake at (1,0)-(1,1): empty snake on diagonal kr... The prefix problem is (0,0)→(x0,y0) = (1,0): a[:1], b[:0] ✓ emits "-" a0. Suffix problem (x1,y1)=(1,1)→(1,1): empty ✓. Middle: a[1:1] = [] ✓. But the insert of b0 happens... the path (1,0)→(1,1) is an insertion move — part of the "reverse path" portion. The suffix problem covers (x1,y1)→(n,m) = (1,1)→(1,1) — empty. So b0's insertion is between (1,0) and (1,1) — the middle snake region! But the middle snake is empty (x0==x1). So the insertion edit is lost!

Hmm — wait. That means my snake endpoint mapping is off by the "one edit" that connects the reverse furthest-reaching point to... Let me reconsider. In the reverse detection: the reverse path at iteration d reaches (xr, yr) reversed coords with d edits. The full reverse path continues from (xr, yr) to (n, m) reversed = (0,0) original with... no wait. Let me re-derive the composition. Reverse furthest reaching at iteration d in reversed coords (xr, yr): this point corresponds to original (n - xr, m - yr). The reverse path from (n,m) backwards to this point has d edits. The full edit path: (0,0) →forward→ overlap point →snake→ ... hmm.

The middle snake composition: forward path (0,0) → (xf, yf) [d_f edits], then snake (xf,yf)→... no wait. Let me re-derive what Coglan's algorithm composes. In Coglan's version, when reverse detection triggers: the middle snake is the reverse snake from reversed (px,py) to (xr,yr)?? Hmm, no — actually I think the middle snake returned is the LAST snake of the reverse path, and the path composition is: forward path from (0,0) to the overlap diagonal point, then the reverse snake (in original orientation from (n-xr, m-yr) to (n-px, m-py)), then the REST of the reverse path from (n-px, m-py) to (n, m) which has d - 1?? Hmm.

Let me carefully re-derive with the paper. Myers section 4A: "The middle snake": run forward and reverse simultaneously. When overlap found: if delta odd, the middle snake is the snake of the forward path at D_f = d... Actually the paper's LCS algorithm (4B) uses: find middle snake → (x, y, u, v) with the snake from (x,y) to (u,v), and D the length... then recurses on prefix A[1..x], B[1..y] and suffix A[u+1..N], B[v+1..M].

In my example: detection returned snake (1,0)→(1,1) empty with D=2. Path composition: prefix path (0,0)→(1,0): 1 edit (delete a0). Suffix path (1,1)→(1,1): 0 edits. Total edits: 1 + 0 = 1?? But D returned = 2. Inconsistency → the snake endpoints must be wrong: the true middle snake should be... The overlap: reverse at d=1 reached reversed (xr,yr) = (0,1)?? wait let me recompute. Reverse k=-1 at d=1: xr = vr[kri+1] = vr[0] = 0 (from d=0 reverse: vr[0] = 0 since no snake). y = xr - kr = 0 + 1 = 1. px,py = (0,1). snake: xr < 1 ✓, yr < 1? 1 < 1 false → vr[-1] = 0. So reverse furthest reaching on diagonal kr=-1 (reversed) is (0,1) reversed = original (1 - 0, 1 - 1) = (1, 0). So the reverse path with 1 edit reaches original (1, 0): from (1,1) delete... reverse path: (1,1) → (1,0): removes a0? In original orientation, path from (0,0) to (1,0) is deletion of a0 — and the reverse path from (1,1) back to (1,0) is that same deletion ✓.

Forward at d=1, k=1: vf[1] = 1: point (1, 0) — reached with 1 edit (insert b0). So forward path (0,0)→(1,0) with 1 edit [insert b0], reverse path (1,0)→(1,1) with 1 edit [delete a0]. Total D = 2 ✓. Overlap at point (1,0) on diagonal... forward k=1 diagonal (y = x - 1: (1,0) ✓); reverse kr = -1 reversed ↔ original diagonal delta - kr = 0 - (-1) = 1 ✓ same diagonal ✓. Overlap at (1,0).

Now the middle snake: the snake BETWEEN the forward furthest-reaching point and reverse furthest-reaching point: forward point (1,0), reverse point (1,0) — snake between them is empty, and it's at (1,0). So middle snake = empty at (1,0)→(1,0), i.e., x0 = x1 = 1, y0 = y1 = 0. Then: prefix (0,0)→(1,0): delete a0 ✓. Middle empty ✓. Suffix (1,0)→(1,1): insert b0 ✓!! 

So the correct return is (D, x0, y0, x1, y1) = (2, 1, 0, 1, 0) — both endpoints = overlap point (the forward reach point), NOT including the reverse snake endpoints. Hmm! So my earlier formula was wrong. Let me reconsider what the "middle snake" is in each detection case:

Forward detection (delta odd): forward snake from (px,py) to (x,y) at iteration d on diagonal k, overlap with reverse reach vr[delta-k] at reversed point → original point (n - xr, m - yr) where xr = vr[delta-k+off]. The overlap point on diagonal k: forward furthest reaching (x, y) with y = x - k; reverse reach original (n - xr, m - yr) also on diagonal k. Overlap means forward x ≥ reverse x_orig. The middle snake: from the reverse point to the forward point?? The composition: reverse path from (n,m) back to reverse point R = (n - xr, m - yr) with d - 1 edits; then snake from R forward to ... the forward path: (0,0) → F0 = snake start (px,py) with d - 1 edits (forward iteration d snake start is reached with d-1 edits? The point (px, py) on diagonal k at iteration d: reached via d edits?? Hmm: at forward iteration d, diagonal k, the point BEFORE the snake, (px,py), is reached with d edits (one more than iteration d-1)... or d-1 if the furthest reach didn't move. Ugh.

Let me re-read Myers' paper 4A more carefully from memory. The paper's middle snake:

```
For D ← 0 to ⌈(M+N)/2⌉:
  For k ← −D to D in steps of 2:
    (a) If k = −D or k ≠ D and Vf[k−1] < Vf[k+1] Then x ← Vf[k+1]
        Else x ← Vf[k−1] + 1
        y ← x − k
        (b) x0 ← x; y0 ← y
        While x < N and y < M and a[x+1] = b[y+1] Do x ← x+1; y ← y+1
        Vf[k] ← x
        If ∆ is odd and k ∈ [∆ − (D−1), ∆ + (D−1)] Then
          (c) If Vf[k] ≥ Vr[k] Then
                Return (2D−1, x0, y0, x, y)   ← snake (x0,y0)→(x,y)
    (reverse analogous with k' = k − ∆... )
        If ∆ is even and k' ∈ [−D, D]... If Vr[k'] ≥ ... hmm
```

The paper (Figure 8?) for the reverse part: "If ∆ is even and k − ∆ ∈ [−D, D] and Vr[k] ≤ ... If Vf[k] ≥ Vr[k]... wait the paper uses same index space: reverse Vr indexed by the same diagonal k (absolute), with reverse furthest reaching x. Hmm, the paper's reverse: Vr[1] ← N... the paper indexes reverse diagonals differently.

OK here's the paper's actual reverse (from the paper, algorithm in section 4A, using absolute diagonals):

```
For D ← 0 to ⌈(M+N)/2⌉:
  For k ← −D to D in steps of 2:
    ' Find the end of the furthest reaching forward D-path in diagonal k.
    If k = −D or k ≠ D and Vf[k−1] < Vf[k+1] Then x ← Vf[k+1]
    Else x ← Vf[k−1] + 1
    y ← x − k
    x0 ← x; y0 ← y
    While x < N and y < M and a[x+1] = b[y+1] Do ...
    Vf[k] ← x
    If ∆ odd and k ∈ [∆ − (D − 1), ∆ + (D − 1)] Then
      If Vf[k] ≥ Vr[k] Then Return 2D−1, snake (x0,y0)→(x,y)
    ' Find the end of the furthest reaching reverse D-path in diagonal k−∆... 
```

Hmm no wait, I recall the paper does the reverse for diagonal k' = k − ∆? No... The paper: "Find the end of the furthest reaching reverse D-path in diagonal k." with:

```
    If k = ∆ + D or k ≠ ∆ − D and Vr[k−1] < Vr[k+1] Then x ← Vr[k−1]
    Else x ← Vr[k+1] − 1
    y ← x − k
    x0 ← x; y0 ← y  (hmm)
    While x > 0 and y > 0 and a[x] = b[y] Do x ← x−1; y ← y−1
    Vr[k] ← x
    If ∆ even and k − ∆ ∈ [−D, D] Then
      If Vr[k] ≤ Vf[k] Then Return 2D, snake (x,y)→(x0,y0)
```

Something like that — reverse in absolute coordinates: Vr[k] = smallest x of reverse furthest reaching on diagonal k. Rule: "If k = ∆ + D or k ≠ ∆ − D and Vr[k−1] < Vr[k+1] Then x ← Vr[k−1] Else x ← Vr[k+1] − 1" — mirror image. Then snake extends backward (x,y decrease). Overlap when Vr[k] ≤ Vf[k] (reverse x ≤ forward x on same diagonal). Return snake from (x,y) [after backward extension] to (x0,y0)... and D = 2D.

This absolute-coordinate version is cleaner to verify. Let me re-derive my n=m=1 example with it: delta=0, even. d=0: k=0: forward vf[0]=0. reverse: k=0 = ∆+D = 0 → x ← Vr[k−1] = Vr[−1]?? Init: paper inits Vr[1] ← N? Hmm the paper's init: "V[1] ← 0" for forward; for reverse "Vr[1] ← N"?? Not quite... The paper's reverse init: when ∆ even, Vr[∆+1] ← N? Hmm. I don't remember exactly. Let me think it out: reverse step on diagonal k at iteration D: coming from diagonal k+1 via backward-x move (deletion undone: in reverse, moving from (x,y) to (x−1, y−?))... reverse path moves: from (x,y) either to (x−1, y) [undo insertion... in reverse orientation, a deletion in forward = ...] or (x, y−1). Reverse furthest reaching = minimal x. On diagonal k, arrive from diagonal k+1 (move x−1: from point (x+1', y') on diag k+1 to (x', y')... moving x−1 keeps y: point on k+1 (x', y') → (x'−1, y') on diag k) or from diagonal k−1 (move y−1: (x', y'−1)). Mirror of forward: forward picks max(x-reach), reverse picks min. Forward rule chooses between vf[k−1] (then +1 for the deletion move) and vf[k+1] (insertion move, x unchanged). Reverse mirror: choose between vr[k+1] (then −1 for the reverse deletion move: from diag k+1 point (x', y') move to (x'−1, y') on diag k → x = vr[k+1] − 1) and vr[k−1] (reverse insertion move: from diag k−1 point (x', y') to (x', y'−1) → x = vr[k−1], y = y'−1 = x − k ✓). Choice: want minimal x: prefer vr[k−1] (no −1)... mirror condition: "If k = ∆+D or (k ≠ ∆−D and Vr[k−1] < Vr[k+1]) Then x ← Vr[k−1] Else x ← Vr[k+1] − 1". Check boundary logic: at k = ∆+D (the extreme right diagonal for reverse at iteration D): cannot come from k+1 (would need iteration D+1... hmm reverse at iteration D reaches diagonals [∆−D, ∆+D]) → must come from k−1 → x = vr[k−1] ✓ matches. At k = ∆−D: must come from k+1 → x = vr[k+1] − 1; condition: k = ∆+D false (k = ∆−D; equal only if D=0,k=∆), then "k ≠ ∆−D" false → else ✓. Interior: choose min: if vr[k−1] < vr[k+1] then x = vr[k−1] else x = vr[k+1] − 1 ✓.

Init: reverse at D=0, k=∆: need vr[k−1] = vr[∆−1] or vr[k+1] = vr[∆+1] available: rule: k = ∆+D = ∆ → first condition true → x = vr[∆−1] — needs init vr[∆−1]?? Hmm that seems off; mirror of forward init vf[1] = 0 → reverse init vr[∆−1] = N? Hmm: forward vf[1] = 0 means: at D=0, k=0: k = −D → x = vf[1] = 0 (start point (0,0)). Reverse at D=0, k=∆: k = ∆+D → x = vr[k−1] = vr[∆−1]; the reverse start point is (N, M) on diagonal ∆; x should be N → init vr[∆−1] = N ✓. So init vr[∆−1] = N... but wait if ∆−1 out of array range: ∆ ∈ [−(n+m), n+m]... |∆| can exceed max_d! e.g., n=100, m=1: ∆=99, max_d=51. vr[∆−1] = vr[98] — array must be sized to cover ∆−1 and ∆+1? Reverse diagonals at iteration D: [∆−D, ∆+D], D ≤ max_d → range [∆−max_d, ∆+max_d]. |∆| + max_d ≤ n + m + ... n=100,m=1: ∆+max_d = 150. So array size needs ~ n+m+2max_d+1. Hmm, that's the absolute-coordinate approach: size = n + m + 2·max_d + 3 or so. Memory fine (≤ ~4·(n+m)).

Alternatively keep my reversed-sequences approach (reverse diagonals centered at 0, array size 2·max_d+1) — but I need to fix the snake endpoint issue found in the example. Let me re-derive the composition properly for the reversed-coords version.

Reversed-coords reverse algorithm is exactly the forward algorithm on (rev A, rev B). Its "furthest reaching point at iteration d on reversed diagonal kr" = point (xr, yr) reversed ↔ original R = (n − xr, m − yr). The reverse path (in original orientation) goes from (n, m) backward to R with d edits. The forward path at iteration d on diagonal k=delta−kr reaches (xf, yf) with ≤ d edits from (0,0). Overlap: xf ≥ n − xr (R is at or before F). Compose full path: (0,0) →F→ F=(xf,yf) [d_f edits, d_f ≤ d] → snake?? Hmm — the standard composition for the middle snake: forward path to its furthest reaching point, then the MIDDLE SNAKE, then reverse path from the snake's end to (n,m).

In the odd-delta (forward detection) case: the returned snake is the forward snake (px,py)→(x,y) — the last snake of the forward path at iteration d. Composition: forward path (0,0)→(px,py) [d−1 edits], snake (px,py)→(x,y) [0 edits], then from (x,y) continue... to the reverse point? The overlap point R is at x_R ≤ x on the same diagonal. Then the reverse path from R back... but we need path from (x,y) to (n,m): reverse path covers R→(n,m) with d−1 edits; the segment (x,y)→R is along the diagonal (both on diagonal k, x ≥ x_R): is the segment (x,y)→R all-equal (a snake)? R is the reverse furthest reaching point; the reverse path's LAST snake... hmm, the reverse furthest reaching point R: the reverse path from (n,m) to R consists of edits and snakes; its first segment from (n,m) backward is the reverse initial snake ending at some point, then edits... R is the end (in reverse traversal) = furthest reaching = minimal x. The point just "after" R in forward orientation (x_R, y_R) → next... The overlap condition vf[k] ≥ vr_abs[k] with the snake check: in the paper's absolute version, when overlap detected, the returned snake for ODD delta is the forward snake (x0,y0)→(x,y), and the algorithm asserts the path: forward to (x0,y0), snake to (x,y), then reverse path from (x,y) to (N,M) — with the claim that the reverse furthest reaching on diagonal k, Vr[k] ≤ Vf[k] = x means the reverse path passes through or before (x, y)... and crucially the segment from (x,y) to the reverse path... The paper says (I recall): "the reverse path overlaps the forward path" — the composed path: forward D-path to (x,y) [the snake end], then the reverse path from (x,y) to (N,M) has D−(2D−1)=... hmm total D = 2D−1?? With D_f = D (forward iteration D) and D_r = D−1: forward path to (x,y) uses ≤ D edits; reverse path from R to (N,M) uses D−1 edits; gap between (x,y) and R along diagonal k: need it to be a snake (all-equal) for composition without extra edits. Is it? The reverse furthest reaching point on diagonal k after D−1 edits, R: in reverse orientation, the reverse path's furthest reaching point at iteration D−1... The gap segment (x_R..x) on diagonal k: forward snake ended at (x,y) — the forward path's furthest reaching; the reverse path from (n,m) backwards: its furthest reaching point R at iteration D−1. Claim (Myers' lemma): the segment between them is part of a common snake? Hmm, actually I recall the subtlety: the overlap detection in the paper works because if Vf[k] ≥ Vr[k] (forward reach ≥ ... on the same diagonal), then there EXISTS a middle snake... but the returned snake is the forward snake (x0,y0)→(x,y), and the composition uses the reverse path starting from... Let me look at this differently — trust the known-good implementations. Coglan's implementation (widely tested, e.g., in his "myers diff" blog series and used in Ruby... actually Ruby's diff used it): 

Forward detection returns [2*d − 1, px, py, x, y] — the FORWARD snake, start (px,py), end (x,y). Then his LCS recursion:

```ruby
def find_middle_snake(a, b) -> (d, x, y, u, v)  # snake from (x,y) to (u,v)?
```

Hmm, in Coglan's blog ("The Myers diff algorithm: the middle snake"), his `middle_snake` returns `[d, x, y, u, v]` where the snake goes from (x, y) to (u, v). For the forward case he returns... let me recall his code:

```ruby
def middle_snake(a, b)
  n, m = a.size, b.size
  max = n + m
  delta = n - m
  odd = delta.odd?
  vf = { 1 => 0 }
  vr = { 1 => 0 }
  d = 0
  loop do
    (−d..d).step(2) do |k|   # forward
      if k == −d or (k != d and vf[k−1] < vf[k+1])
        x = vf[k+1]
      else
        x = vf[k−1] + 1
      end
      y = x − k
      px, py = x, y
      while x < n and y < m and a[x] == b[y]
        x, y = x + 1, y + 1
      end
      vf[k] = x
      if odd and