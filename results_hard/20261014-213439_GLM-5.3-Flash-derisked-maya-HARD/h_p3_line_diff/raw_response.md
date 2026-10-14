Done — I've settled on the approach; let me also double-check the remaining edge cases before writing the final code.

**Edge cases to verify:**
- One list empty → all `-` / `+` items, no recursion issues.
- Identical lists → trimmed entirely by the prefix/suffix walks → all `=`.
- Repeated lines → handled since hashing/content equality is by string value, and the DP treats indices, not unique keys.
- The `V` dict trick (`V = {1: 0}`) covers the `d = 0, k = 0` bootstrap for both forward (`k = -d` branch reads `V[k+1]`) and reverse (`k = delta + d` branch reads `Vr[k-1]`, which for `k = delta` reads `Vr[delta-1]` — present via the `{delta-1: N}` seed... wait, for the reverse I seed `Vr = {delta - 1: N}`? Let me re-derive: reverse recurrence at `k == delta + d` reads `Vr[k-1]`; at `d = 0, k = delta`, it reads `Vr[delta - 1]`, which must be `N` so that `x = N`. Hmm, but actually with the "furthest from the end" convention, `Vr[k-1]` should hold the furthest reverse reach on diagonal `k-1` — at `d = 0` there is none, and the convention is that the reverse point starts at `x = N`. So seeding `Vr[delta - 1] = N`... but wait, that's only correct if the reverse recurrence for the rightmost diagonal takes `x = Vr[k-1]` (staying at the same `x`, moving `y` back). Let me re-derive the reverse recurrence from scratch to be sure:

Reverse path works backwards from `(N, M)`: a `-`-in-reverse is `x -= 1` (diagonal `k` decreases), a `+`-in-reverse is `y -= 1` (diagonal `k` increases). Furthest-reaching = minimal `x`? No — furthest *from the end* means maximal progress backward, i.e., minimal `x`... but then the recurrence: on diagonal `k` at step `d`, we came from diagonal `k+1` (via `x -= 1`, so `x_new = Vr[k+1] - 1`) or from diagonal `k-1` (via `y -= 1`, `x` unchanged: `x_new = Vr[k-1]`), then slide the snake *down* (`x-1, y-1` while `a[x-1] == b[y-1]`). We want minimal `x`, so between the two candidates we pick the smaller: `x = min(Vr[k+1] - 1, Vr[k-1])` when both available. The snake slide then only decreases `x` further. Seeding: at `d = 0, k = delta`: no predecessors; `x = N`. With the `min` formulation, if I seed `Vr[delta+1] = N + 1` then `x = N + 1 - 1 = N` ✓, and `Vr[delta-1]` would need to be... unused at `d = 0` if I branch on the boundary cases `k == delta - d` (came from `k+1`) and `k == delta + d` (came from `k-1`) explicitly, like the forward version does. That's cleaner:

```python
if k == delta - d or (k != delta + d and Vr[k+1] - 1 <= Vr[k-1]):  # hmm
```

Hmm wait, but the standard formulation (which I verified works on the `a="ab", b="b"` trace above) uses `Vr = {delta + 1: N}` with the rule `x = Vr[k+1] - 1` for the leftmost diagonal and `x = Vr[k-1]` otherwise (when `k != delta + d`), choosing the branch by `Vr[k-1] < Vr[k+1]`... let me re-check the branch condition direction for reverse. Forward: we want max `x`, branches give `V[k+1]` (enter from `k+1` via `y+=1`, `x` unchanged) or `V[k-1] + 1` (enter from `k-1` via `x+=1`), pick max → condition `V[k-1] < V[k+1]` picks the first. Reverse: we want min `x` (furthest backward), candidates `Vr[k+1] - 1` (from `k+1` via `x-=1`) and `Vr[k-1]` (from `k-1` via `y-=1`), pick min → condition: if `Vr[k-1] <= Vr[k+1] - 1`... i.e. `Vr[k-1] < Vr[k+1]` picks `x = Vr[k-1]`?? Hmm, wait: pick the *smaller* `x`: if `Vr[k-1] < Vr[k+1] - 1`... no: candidates are `c1 = Vr[k+1] - 1` and `c2 = Vr[k-1]`; we want min, so if `c2 < c1` pick `c2` else `c1`. But hold on — is "min x = furthest reverse" right? Reverse furthest-reaching: the path has made the most progress consuming both sequences from the end; progress = (N - x) + (M - y) consumed... on a fixed diagonal `k`, `y = x - k`, so consuming more means smaller `x` ✓. But careful: the *meaning* of `Vr[k]` in the overlap check: the reverse path of length `d_r` reaches point `(Vr[k], Vr[k]-k)` on diagonal `k`, and the remaining path from there to `(N,M)` has length ≥ `d_r`... it has length exactly `d_r` (the reverse path itself). For the splice: prefix path of length `d_f` ends at `(x_f, y_f)`; we need `(x_f, y_f)` to lie on the reverse path's last snake, i.e. `Vr[k] <= x_f <= t`. The check `Vr[k] <= Vf[k]` plus the theory guarantees this.

Hmm — wait, now I realize I should double check the direction of the reverse snake slide and the overlap comparison once more with a second trace, because getting `min` vs `max` wrong flips everything. Trace `a = "ab", b = "b"` again with the reverse recurrence as I now define it: `N = 2, M = 1, delta = 1` (odd). `Vr = {2: 2}` (seed `delta+1 → N`).

- d=0: forward: `k=0`: `k == -d` → `x = Vf[1] = 0`, `y = 0`. Snake: `a[0]='a'` vs `b[0]='b'` → no. `Vf[0] = 0`. Overlap check (odd, d=0): range `k in [delta - (d-1), delta + (d-1)] = [2, 0]` → empty (since `delta - (d-1) = 2 > 0 = delta + (d-1)`)? With `d = 0`, `d - 1 = -1`: `k >= delta + d = 1` and `k <= delta - d = 1` → `k = 1`, but forward diagonals at `d = 0` are `{0}` → no check. ✓.
  reverse d=0: `k in {delta - 0, ..., delta + 0} = {1}`: `k == delta - d` → `x = Vr[k+1] - 1 = Vr[2] - 1 = 1`, `y = x - k = 0`. Slide: `x > 0 and y > 0`? `y = 0` → stop. `Vr[1] = 1`. Overlap check (even branch — skipped, delta odd). 
- d=1: forward `k=-1`: `k == -d` → `x = Vf[0] = 0`, `y = x - k = 1`. Snake: `x < N=2, y < M=1`? `y = 1` not `< 1` → stop. `Vf[-1] = 0`. Overlap: `k >= delta + d = 2`? No. `k=1`: `k == d` → `x = Vf[0] + 1 = 1`, `y = 0`. Slide: `a[1]='b' == b[0]='b'` → `x=2, y=1`; then `x < N`? `x = 2` → stop. `Vf[1] = 2`. Overlap: `k = 1 in [delta + d, delta - d] = [2, 0]` ✓. `Vr[1] = 1 <= Vf[1] = 2` ✓ → overlap. Return snake `(1, 0) → (2, 1)` (absolute, plus offsets). `a[1] == b[0]` ✓ matching. Split: `a[0:1] vs b[0:0]` → `-a`; `=` for `b`; `a[2:2] vs b[1:1]` → nothing. Result: `-a, =b` ✓. And earlier I traced this same example consistently. 

Also trace the even-delta overlap branch on `a = "ac", b = "bc"` (`delta = 0`, even): checks happen in the reverse pass pairing reverse-`d` against forward-`d` (total `2d`), and in the forward pass... hmm — wait. For even delta, where exactly should the check go? Options: (a) in the reverse pass after computing reverse step `d`, compare `Vr` against `Vf` from forward step `d` (same iteration, forward already ran) → total `2d`; (b) in the forward pass comparing forward-`d` against reverse-(d-1)? total `2d - 1` — but for even delta, `D_true` is even, so total must be even → pairing must be `(d, d)` in some pass. I'll check in the reverse pass: after reverse step `d`, for each `k` in the reverse diagonal range that's also within the forward range `[-d, d]`, test `Vr[k] <= Vf[k]`. In the `"ac"` vs `"bc"` trace above I did exactly this and got the overlap at `d = 1` with total `2 = D_true` ✓. But note: at `d = 0` (reverse pass), `k = 0`: `Vr[0] = 1` vs `Vf[0] = 0`: `1 <= 0` false ✓ no premature overlap. Good.

One more subtlety for the even case: the forward check range at reverse step `d` is `k ∈ [delta - d, delta + d] ∩ [-d, d]` — must also require `k ≡ d (mod 2)`? Reverse diagonals at step `d` automatically have `k ≡ delta + d (mod 2)`; forward diagonals at step `d` have `k ≡ d (mod 2)`; both parities match iff `delta` even ✓ (guaranteed by the even branch). And keys present in `Vf` — since `Vf` only holds diagonals `[-d, d]` with matching parity, a simple `if k in Vf and Vr[k] <= Vf[k]` suffices, but I also need `k` to be a *forward-valid* diagonal (reached at exactly step `d`, not an stale... `Vf` holds only current-step values since I overwrite each step; diagonals not reachable at step `d` aren't in `Vf`... careful: `Vf` after forward step `d` contains exactly the diagonals `{±d parity-d values}` — older diagonals are overwritten only if revisited; keys from earlier steps with other parities persist! E.g. after `d = 1`, `Vf` has keys `{-1, 1}`; at `d = 2`, forward writes `{-2, 0, 2}` — key `0` overwritten ✓, but at `d = 2` reverse check, `k = 0` is valid (forward step 2 reaches `k = 0` ✓ written this iteration). At reverse step `d`, could `k` be in `Vf` with a *stale* parity (from step `d - 1`, i.e. `k ≡ d-1`) — reverse diagonals at step `d` have `k ≡ delta + d ≡ d (mod 2)` (delta even), while stale forward keys have parity `d - 1` → no collision ✓. Similarly for the odd case: forward diagonals parity `d`, stale reverse keys parity `delta + (d-1) ≡ d (mod 2)` (delta odd) — collision possible! E.g. `delta = 1`: reverse step `d-1` writes diagonals of parity `d`; forward step `d` writes parity `d` — same parity, and the check range `k ∈ [delta - (d-1), delta + (d-1)]`... wait I need to recheck this range: reverse step `d - 1` reaches diagonals `[delta - (d-1), delta + (d-1)]`; the forward-`d` check should only test `k` in that range (other `k` have no reverse coverage or stale-from-older-step coverage — older reverse steps `d' < d - 1` have parity `delta + d'` ≡ `d' (mod 2)`... delta odd → `delta + d' ≡ d' + 1 (mod 2)`; forward-`d` parity is `d`; collision needs `d' + 1 ≡ d`, i.e. `d' = d - 1` exactly ✓ — so only reverse step `d - 1` keys can spuriously match, and those are legitimately "reverse coverage ≤ d-1" — but is using reverse step `d-2`'s value wrong? It can't happen parity-wise ✓. But *within* parity `d-1`, reverse step `d-1` overwrites all its diagonals ✓, so `Vr[k]` for `k` in range `[delta-(d-1), delta+(d-1)]` is exactly reverse-step-`(d-1)` ✓, and for `k` outside that range... `k` outside range: was it written by an even older reverse step? Parity says no (only `d' = d-1` matches parity). But `k` could have been written by reverse step `d-1`? All `d-1`-step diagonals are in range ✓. So outside the range, `k` is either unwritten (absent from `Vr`) or written even earlier with wrong parity — impossible. So the check `if k in Vr and Vr[k] <= x` with the range condition — I'll include the range condition explicitly for safety: `delta - (d-1) <= k <= delta + (d-1)`... hmm wait, for `d = 0` this range is `[delta + 1, delta - 1]` = empty-ish; but the reverse step-`(-1)`... there's no reverse step `-1`; conceptually reverse step 0 covers just `{delta}` — should forward-0 check against reverse-0? Total would be `0` → only if `N = M = 0`... trimmed away. Standard formulation checks odd case starting `d = 1` effectively; with `d = 0` the range `[delta - (-1), delta + (-1)]` is empty → no check ✓ consistent.

Also for the odd case there's a mirror concern: the reverse pass itself — should I *also* check overlaps in the reverse pass for odd delta (pairing reverse-`d` with forward-`d`, total `2d + 1`?) — total `d + d = 2d` even ≠ odd `D_true` → skip; pairing reverse-`d` with forward-(d-1)? forward-(d-1) values were overwritten by forward-`d` already this iteration... but parity: reverse-`d` diagonals parity `delta + d ≡ d + 1`; forward-(d-1) parity `d - 1 ≡ d + 1` ✓ same — so it *could* be checked, total `2d + 1` odd ✓ also valid! Both pairings `((d+1) + d)` and `(d + (d+1))` give `2d+1`. Checking in the forward pass (new forward `d+1`? I indexed checks as forward-`d` vs reverse-(d-1) → total `2d - 1`) — as long as exactly one pairing per iteration is checked and the first hit has `d_f + d_r = D_true`, we're fine. With forward-`d`-vs-reverse-(d-1) checked at iteration `d`: the first hit occurs at the smallest `d` with an overlap; overlap exists at `d = (D_true+1)/2` (proved via the optimal path argument — the paper's Lemma 1: with `D = 2m+1`, the forward `m+1`-past and reverse `m`-past paths must overlap... and the "middle snake" is valid). Could a *spurious earlier* hit occur at `d < (D_true+1)/2` (case-B geometry)? The paper's lemma asserts the middle snake is found at exactly that `d` — and implementations worldwide rely on it; moreover, a spurious earlier hit would still yield *some* snake with `d_f + d_r = 2d - 1 < D_true`... if the segment isn't a real snake, the split is invalid → wrong output. Since the paper proves the construction correct (Theorem: "the middle snake is found, i.e., the snake between the furthest points, at the right time"), and my traces confirm, I'll go with it. Additionally, I can add a cheap **safety assertion**: verify the returned snake segment is all-matching (`a[x1+t] == b[y1+t]` for `t < len`); if not (shouldn't happen), fall back to... it shouldn't happen; but a defensive `while` verification loop costs O(snake) and I can, in the (never) failure case, just continue the search — actually simplest: assert-style check and, if it fails, skip this overlap and continue the `d` loop. That makes the algorithm robust even if my parity recall is off in some corner, at zero asymptotic cost. But minimality could then break... I'll trust the theory; the check is just belt-and-braces (and if it ever failed, continuing the search still finds *some* overlap later; minimality might be off but validity is preserved — acceptable defensive posture). Actually, if the segment is all-matching, is the split *guaranteed* minimal (total = D_true)? The path built through it has length `d_f + d_r = 2d - 1`... and `D_true ≤` that; but could `D_true < 2d - 1` (early hit)? Then the result would be non-minimal. To be fully safe I could also verify `d_f + d_r`... can't compute `D_true` cheaply. The paper's lemma guarantees first-hit-at-`D_true`; combined with the all-matching check, I'm confident.

Also, the reverse recurrence branch condition: I wrote `k == delta - d or (k != delta + d and Vr[k-1] < Vr[k+1])` → then `x = Vr[k+1] - 1`?? Hold on — let me redo which branch picks which candidate. Candidates: `c1 = Vr[k+1] - 1` (come from diagonal `k+1`), `c2 = Vr[k-1]` (come from `k-1`). We want min. Standard forward: want max, candidates `V[k+1]` (from `k+1`) and `V[k-1] + 1` (from `k-1`), branch `V[k-1] < V[k+1]` → take `V[k+1]` (the from-`k+1` one). Mirroring (reverse = forward on reversed strings, with `x' = N - x, y' = M - y`, diagonal `k' = x' - y' = delta - k`... so reverse-`k` maps to forward-`k' = delta - k`, and forward's rule transforms: forward picks max over `V'[k'+1] = ` (N - Vr[k+1]?) hmm: `V'[k'] = N - Vr[k]` where `k' = delta - k` → `k' + 1 = delta - (k - 1)` → `V'[k'+1] = N - Vr[k-1]`; `V'[k'-1] = N - Vr[k+1]`. Forward rule: if `k' == -d` or (`k' != d` and `V'[k'-1] < V'[k'+1]`): `x' = V'[k'+1]` else `x' = V'[k'-1] + 1`. Translate: `k' == -d` ⇔ `delta - k == -d` ⇔ `k == delta + d`. `k' == d` ⇔ `k == delta - d`. `V'[k'-1] < V'[k'+1]` ⇔ `N - Vr[k+1] < N - Vr[k-1]` ⇔ `Vr[k+1] > Vr[k-1]`. `x' = V'[k'+1]` ⇔ `N - x = N - Vr[k-1]` ⇔ `x = Vr[k-1]`. `x' = V'[k'-1] + 1` ⇔ `N - x = N - Vr[k+1] + 1` ⇔ `x = Vr[k+1] - 1`. So the reverse rule: **if `k == delta + d` or (`k != delta - d` and `Vr[k+1] > Vr[k-1]`): `x = Vr[k-1]`; else `x = Vr[k+1] - 1`**. And the seed: forward seeds `Vf = {1: 0}` (so at `d = 0, k = 0`: branch `k == -d` → `x = Vf[1] = 0` ✓). Translated: `V'[k'+1]` seed ⇔ forward seed `V'[1] = 0` ⇔ `N - Vr[k-1] = 0` with `k' + 1 = 1 → k' = 0 → k = delta` → seed `Vr[delta - 1] = N`. Hmm! Earlier I seeded `Vr[delta + 1] = N` and used a *different* branch orientation and my trace worked... let me recheck: earlier I wrote "if `k == delta - d` → `x = Vr[k+1] - 1`" — that's the opposite orientation from the derivation just now. Both can't be right. Let me recheck the derivation with the actual `a="ab", b="b"` trace that worked: there, reverse `d=0, k=delta=1`: I used branch "`k == delta - d`" (true: `1 == 1`) → `x = Vr[2] - 1 = 1` — and the alternative branch per my new derivation: `k == delta + d` → `1 == 1` also true! Both boundary conditions coincide at `d = 0`. The two formulations differ at `d ≥ 1`. Which is correct? Let me sanity-check via the mirrored-forward logic, which I trust: forward rule verified: "`k == -d or (k != d and Vf[k-1] < Vf[k+1]) → x = Vf[k+1]; else x = Vf[k-1] + 1`" — this is the canonical Myers forward rule (enter from `k+1` (a `+`-move... wait which is it): if we come from diagonal `k+1` to `k`, we did `y += 1` ('+' operation) — no x-cost, so `x = Vf[k+1]` (the furthest on `k+1`, and after the move `x` unchanged) ✓; from `k-1`: `x += 1` ('-' op): `x = Vf[k-1] + 1` ✓; we pick whichever gives larger `x`: `Vf[k+1]` vs `Vf[k-1] + 1`: condition `Vf[k-1] < Vf[k+1]` ⇔ `Vf[k-1] + 1 < Vf[k+1] + 1`... we want max: pick `Vf[k+1]` when `Vf[k+1] ≥ Vf[k-1] + 1` ⇔ `Vf[k-1] < Vf[k+1]`... `Vf[k+1] ≥ Vf[k-1] + 1 ⇔ Vf[k-1] ≤ Vf[k+1] - 1 ⇔ Vf[k-1] < Vf[k+1]` ✓. Boundary `k == -d`: only `k+1` reachable ✓; `k == d`: only `k-1` ✓. Canonical ✓.

Mirror to reverse: `k' = delta - k`, `V'[k'] = N - Vr[k]` where `V'` is the forward-DP on the reversed problem (reversed strings), and reverse-`d` paths = forward-`d` paths on reversed strings ✓ (a reverse path from `(N,M)` of length `d` ≡ forward path from `(0,0)` on reversed strings of length `d`). So `V'[k'] = N - Vr[delta - k']` i.e. `Vr[k] = N - V'[delta - k]`. Forward rule at `k'`: if `k' == -d or (k' != d and V'[k' - 1] < V'[k' + 1]): x' = V'[k' + 1] else x' = V'[k' - 1] + 1`. Convert: `x = N - x'`. `V'[k' + 1] = N - Vr[delta - k' - 1] = N - Vr[k + 1]` (since `k = delta - k'`). `V'[k' - 1] = N - Vr[k - 1]`. Condition `V'[k'-1] < V'[k'+1]` ⇔ `N - Vr[k-1] < N - Vr[k+1]` ⇔ `Vr[k-1] > Vr[k+1]`. So: if (`k == delta + d`) or (`k != delta - d` and `Vr[k-1] > Vr[k+1]`): `x = N - V'[k'+1] = Vr[k+1]`... wait: `x' = V'[k'+1]` → `x = N - V'[k'+1] = N - (N - Vr[k+1]) = Vr[k+1]`?? But coming from `k' + 1` in forward = coming from `k' + 1` ⇒ `k = delta - k' ` ⇒ `k' + 1 = delta - k + 1` ⇒ diagonal `k - 1` in reverse coords. Hmm: forward move from diagonal `k'+1` to `k'` is `y' += 1` ⇒ in reverse coords `y += 1`?? `y' = M - y`: `y' += 1` ⇒ `y -= 1` ✓ (reverse '+' op: `y -= 1`, diagonal `k = x - y` increases... but `k' = x' - y'` decreases by 1 ⇒ `delta - k` decreases ⇒ `k` increases ✓ consistent: entering reverse-diagonal `k` from `k - 1`, `x` unchanged: `x = Vr[k-1]` ✓ matches. Good: so branch "from `k+1`" (forward `k'+1`) gives `x = Vr[k+1]`?? Let me redo: forward `x' = V'[k'+1]` corresponds to reverse `x = N - V'[k'+1] = Vr[k+1]` where `k + 1 = delta - k' + 1`... `k' = delta - k` ⇒ `k' + 1 = delta - k + 1` ⇒ `delta - k' - 1 = k - 1` ⇒ `V'[k'+1] = N - Vr[k - 1]`! I made an arithmetic slip above. Redo: `Vr[j] = N - V'[delta - j]` ⇒ `V'[k'+1] = N - Vr[delta - (k'+1)] = N - Vr[delta - k' - 1] = N - Vr[k - 1]` ✓ (using `delta - k' = k`). And `V'[k'-1] = N - Vr[delta - k' + 1] = N - Vr[k + 1]`. Condition `V'[k'-1] < V'[k'+1]` ⇔ `N - Vr[k+1] < N - Vr[k-1]` ⇔ `Vr[k+1] > Vr[k-1]`. Branch true ⇒ `x' = V'[k'+1]` ⇒ `x = N - V'[k'+1] = Vr[k-1]`. Branch false ⇒ `x' = V'[k'-1] + 1` ⇒ `x = N - V'[k'-1] - 1 = Vr[k+1] - 1`. Boundary: `k' == -d` ⇔ `k = delta + d`; `k' == d` ⇔ `k == delta - d`. So final reverse rule:

**if `k == delta + d` or (`k != delta - d` and `Vr[k+1] > Vr[k-1]`): `x = Vr[k-1`; else `x = Vr[k+1] - 1`.** Seed: forward `V' = {1: 0}` ⇒ `Vr[delta - 1] = N - V'[1] = N`. So seed `Vr = {delta - 1: N}`.

Hmm — but my earlier working trace used seed `Vr[delta + 1] = N` with rule "if `k == delta - d`: `x = Vr[k+1] - 1` else... `x = Vr[k-1]`"-ish. Both formulations are mirror images of each other (one is the reverse rule with `k` ↔ ... they'd give the same results by symmetry? Not necessarily identical, but each could be self-consistent: mine earlier was "reverse rule type A", the derivation gives "type B" — type A treats reverse like a forward DP where furthest = max x from... my earlier type-A: candidates `Vr[k+1] - 1` (from `k+1`, via `x -= 1`) and `Vr[k-1]` (from `k-1`, via `y -= 1`), pick min. Wait — pick min?? Earlier I wrote "we want minimal x" — but hold on: is furthest-reaching reverse = minimal `x`? On diagonal `k`, the reverse path that has consumed the most from the end has the smallest `x` (since `y = x - k` grows as `x` shrinks... consuming more of both: `N - x` and `M - y` both larger ⇒ `x` smaller AND `y = x - k` smaller?? `y` smaller means consumed more of `b` ✓ and `x` smaller means consumed more of `a` ✓ — consistent since on fixed diagonal they move together). Yes: furthest reverse on diagonal `k` = min `x`. Hmm wait, that seems off: furthest-reaching should maximize consumed = `x` small ✓ ok.

But then type-A picks min between `Vr[k+1] - 1` and `Vr[k-1]`: hmm, but is that the right recurrence? From `k+1` via `x -= 1`: new `x = Vr[k+1] - 1`; from `k-1` via `y -= 1`: new `x = Vr[k-1]` (y decreases, x same, diagonal k = (x) - (y-1) = old k' + 1 where old diagonal `k' = k - 1` ✓). Pick min ✓. Type-B (derived): candidates `Vr[k-1]` (from `k-1`... wait type-B branch true gives `x = Vr[k-1]` — from where? Branch-true condition maps to forward's "from `k'+1`" = reverse from diagonal `k - 1`?? I showed: forward from-`k'+1` ⇔ reverse from `k - 1`, giving `x = Vr[k-1]` ✓ consistent with type-A's second candidate. Branch-false: forward from-`k'-1` ⇔ reverse from `k+1`, `x = Vr[k+1] - 1` ✓ same candidates! And the *selection*: forward picks max `x'` ⇔ reverse picks min `x`... forward picks larger `x'` = larger `N - x` = smaller `x` ✓. Type-B condition: `Vr[k+1] > Vr[k-1]` → pick `Vr[k-1]`. Type-A: pick min: if `Vr[k-1] < Vr[k+1] - 1`... i.e. `Vr[k-1] ≤ Vr[k+1] - 1` ⇔ `Vr[k-1] < Vr[k+1]`... hmm: `Vr[k-1] < Vr[k+1] - 1` vs `Vr[k-1] < Vr[k+1]`: min(`c1 = Vr[k+1] - 1`, `c2 = Vr[k-1]`): pick `c2` iff `c2 ≤ c1` ⇔ `Vr[k-1] ≤ Vr[k+1] - 1` ⇔ `Vr[k-1] < Vr[k+1]` (integers) ⇔ NOT(`Vr[k+1] > Vr[k-1]`)... so type-A picks `Vr[k-1]` iff `Vr[k-1] < Vr[k+1]`, type-B picks `Vr[k-1]` iff `Vr[k+1] > Vr[k-1]` — the same condition! (Modulo equality: when `Vr[k-1] == Vr[k+1]`: type-A: `c2 = Vr[k-1]`, `c1 = Vr[k+1] - 1 < c2` → picks `c1`; type-B condition `Vr[k+1] > Vr[k-1]` false → picks `c1` ✓ same.) Great — type-A and type-B are identical; the only difference is the *seed/boundary* bookkeeping: type-A seeds `Vr[delta + 1] = N` and branches on `k == delta - d`; type-B seeds `Vr[delta - 1] = N` and branches on `k == delta + d`. Both self-consistent (mirror images). My earlier trace used type-A and worked. I'll keep type-A exactly as traced: seed `Vr = {delta + 1: N}`, rule: `if k == delta - d or (k != delta + d and Vr[k-1] < Vr[k+1] - ...)` hmm wait — in my trace I wrote: "`k == delta - d` → `x = Vr[k+1] - 1`" as the FIRST branch. Let me re-express type-A cleanly:

Candidates: `c1 = Vr[k+1] - 1` (from `k+1`), `c2 = Vr[k-1]` (from `k-1`). Boundaries: `k == delta - d`: only from `k+1` ⇒ `x = c1`. `k == delta + d`: only from `k-1` ⇒ `x = c2`. Else: pick min: `x = c2 if Vr[k-1] < Vr[k+1] else c1`? From above: pick `c2` iff `Vr[k-1] < Vr[k+1]` — wait: pick `c2` iff `c2 ≤ c1` ⇔ `Vr[k-1] ≤ Vr[k+1] - 1` ⇔ `Vr[k-1] < Vr[k+1]` ✓. So:

```python
if k == delta - d or (k != delta + d and Vr[k-1] < Vr[k+1]):
    x = Vr[k-1]
else:
    x = Vr[k+1] - 1
```

Hmm wait, that contradicts what I wrote in the trace ("`k == delta - d` → `x = Vr[k+1] - 1`"). At `d = 0, k = delta`: first branch (`k == delta - d`) — with seed `Vr[delta+1] = N`: `x = Vr[k-1] = Vr[delta - 1]` — not seeded! With my trace's version (`x = Vr[k+1] - 1 = N - 1`?? but the trace said `x = Vr[2] - 1 = 1` with `Vr[2] = 2 = N` ✓ giving `x = 1`) — hmm, in the trace the reverse start should be `x = N = 2`?? The trace: "reverse d=0: k=1: x = Vr[k+1] - 1 = Vr[2] - 1 = 1, y = 0" — starting point `(1, 0)`?! That's wrong as a "start" — the reverse path starts at `(2, 1)`, and the snake slides down: from `(2,1)`: check `a[1] == b[0]`: `'b' == 'b'` ✓ → `(1, 0)`; then `y = 0` stop. So `Vr[1] = 1` ✓ — the trace's arithmetic coincidentally... no wait, with `x = Vr[2] - 1 = 1, y = x - k = 0`: that's the point AFTER one backward step from `(2,1)` — i.e., the recurrence `x = Vr[k+1] - 1` at `d = 0` implicitly performed the first backward `x -= 1` move from `(N, M)`: from diagonal `delta + 1 = 2` (the "virtual" diagonal holding the start), `x -= 1` → diagonal `delta = 1`, `x = N - 1`. Then the snake slide handles the rest ✓. And it produced the correct final answer in the trace. OK — both seeds work because the virtual start can be modeled either as "diagonal `delta+1`, x = N, then mandatory `x-1`" (type-A) or "diagonal `delta-1`, x = N, y-1 move" (type-B); at `d = 0` both give a valid single entry into diagonal `delta`. For `d ≥ 1` they're genuinely equivalent (shown above). I'll use the **type-B seed** with the canonical mirrored branch structure, since I derived it rigorously:

```python
Vr = {delta - 1: N}
...
for k in range(delta - d, delta + d + 1, 2):
    if k == delta + d or (k != delta - d and Vr[k+1] > Vr[k-1]):
        x = Vr[k-1]      # entered diagonal k from k-1 (y -= 1)
    else:
        x = Vr[k+1] - 1  # entered from k+1 (x -= 1)
    y = x - k
    while x > 0 and y > 0 and a[x-1] == b[y-1]:
        x -= 1; y -= 1
    Vr[k] = x
    # even-delta overlap check: reverse step d vs forward step d
    if even and -d <= k <= d and k in Vf and Vr[k] <= Vf[k]:
        return (Vr[k], Vr[k] - k, Vf[k], Vf[k] - k)  # snake (x1,y1,x2,y2)
```

Hmm — wait, the returned snake: from `(Vr[k], ·)` to `(Vf[k], ·)`: is that the right snake to return (per the theory, "the snake between the furthest points")? In the odd case I return `(Vr[...], ..., x, y)` — from reverse point to forward point — and in the trace `a="ab", b="b"` that gave `(1,0)→(2,1)` ✓. For the even case, mirror: the snake should also span from the reverse furthest point to the forward furthest point: `(x1,y1) = (Vr[k], Vr[k]-k)`, `(x2,y2) = (Vf[k], Vf[k]-k)`. In the `"ac"/"bc"` trace: `Vr[-1] = 0, Vf[-1] = 0` → snake `(0,1)→(0,1)` empty ✓ consistent with what I traced. Note the empty-snake case: `x1 == x2` — then the "middle snake" is empty; recursion: first subproblem `a[a0:x1]`×`b[b0:y1]`, then second `a[x2:a1]`×`b[y2:b1]` — the two subproblems tile the whole with the split point on an optimal path ✓ still fine (the `=`-emission loop emits nothing).

Also need: the overlap check ranges. Odd case (forward pass, step `d`, comparing against reverse step `d - 1`): reverse-(d-1) covers diagonals `[delta - (d-1), delta + (d-1)]`. But `Vr` dict might contain keys from *older* steps with the same parity — parity of reverse step `d'` diagonals: `delta + d' (mod 2)`; forward step `d` diagonals: `d (mod 2)`; collision requires `delta + d' ≡ d`, i.e. `d' ≡ d - delta ≡ d + delta (mod 2)`; delta odd ⇒ `d' ≡ d + 1 ≡ d - 1 (mod 2)` ⇒ `d' ∈ {d-1, d-3, ...}` — older same-parity steps exist! E.g. `d' = d - 3`: its diagonal values are still in `Vr` (never deleted) and could be hit by the forward-`d` check if within range `[delta - (d-1), delta + (d-1)]`. Is using a reverse-(d-3) value (instead of d-1) harmful? `Vr` values only *decrease* with more steps (furthest-reaching = min x); using an older (larger) `Vr[k]` makes the check *stricter* (`Vr[k] <= x` harder) — a false negative at worst for that `k`... but wait, could it cause a false *positive*? No — older values are ≥ newer; `older_Vr[k] <= x` ⇒ `newer_Vr[k] <= x` — the check with the *current* value would also pass. So stale entries only delay detection, never corrupt. But they *can't* be stale in range: within `[delta-(d-1), delta+(d-1)]`, reverse step `d-1` wrote all its diagonals (exactly that range) — so any `k` in range has a fresh `d-1` value ✓. Out of range: `k` might hold a `d' < d - 1` value; if the check `Vr[k] <= x` passed there, we'd return an overlap pairing `(d, d')` with `d + d' < 2d - 1` — is that valid?? It corresponds to a *smaller* total — but the theory says no overlap exists before `d = (D_true+1)/2`... if `Vr[k]` is from step `d' < d - 1`, an overlap would mean forward-`d` ∩ reverse-`d'` — total `d + d'`. If that were a genuine case-A overlap, we'd get a path of length ≤ `d + d' < 2d - 1` — possible only if `≥ D_true`... it'd be an *earlier* detection than the theory's `d = (D_true+1)/2` — but the theory (Lemma) says the first overlap under this pairing occurs at `(D_true+1)/2`... hmm, actually the theory says an overlap *exists* at `(D_true+1)/2`; a spurious earlier one (via stale values) would produce total `< D_true`?? — a path of length `< D_true` can't exist, and a case-A overlap at `(d, d')` yields a path of length ≤ `d + d'` — so it'd imply `D_true ≤ d + d'`... but `d + d' < 2d - 1` and if also `d < (D_true+1)/2` then `d + d' ≤ (2d - 2) < D_true` → contradiction → so either no such overlap passes the check, or... the check passing requires case-A geometry to conclude; with case-B geometry no conclusion. To keep it airtight: restrict the odd-case check to `k >= delta - (d - 1)` and `k <= delta + (d - 1)` — then `Vr[k]` is guaranteed fresh (step `d - 1`), pairing exactly `(d, d-1)`, total `2d - 1`, and the paper's lemma applies. I'll do that. Similarly the even-case check: restrict to `-d <= k <= d` (forward step `d`'s exact range → fresh values ✓, pairing `(d, d)`, total `2d`).

Hmm, one more: even case — should I *also* check pairing `(d, d)` in the forward pass (forward-`d` vs reverse-`d`)? Reverse-`d` isn't computed yet at forward-`d` time within the iteration (reverse runs after forward) — checking in the reverse pass covers `(d, d)` ✓. And should the even case ALSO check `(d, d-1)`-type pairings? Total `2d - 1` odd ≠ even `D_true` → no. ✓. And odd case: pairing `(d, d-1)` in the forward pass ✓ covers all splits `d_f + d_r = 2d - 1`... for the *specific* `d` where `D_true = 2d - 1`; other splits of `D_true` (e.g. `(d-1, d)`) — the paper's lemma guarantees the `(m+1, m)` split works (an overlap exists there), so detecting the first `(d, d-1)` hit at `d = m + 1` suffices ✓.

Also the loop bound: `d` up to `ceil((N + M) / 2) + 1` — the paper: `D_true ≤ N + M`; odd case needs `d = (D_true + 1)/2 ≤ (N + M + 1)/2`; even case `d = D_true/2 ≤ (N+M)/2`. I'll loop `d` in `range(0, (N + M) // 2 + 2)` and it's guaranteed to return (given non-empty, post-trim, with mismatched ends — there's always an overlap by the lemma; the `+2` slack covers rounding).

Snake validity guard (belt-and-braces): before returning, verify `all(a[x1 + t] == b[y1 + t] for t in range(x2 - x1))` — cheap; if it somehow failed, continue searching instead of returning. I'll include it silently.

Recursion in `diff_lines`: the recursive helper emits into a list. Python recursion depth: each level consumes at least one line? Each split consumes the middle snake (≥ 0 lines) — could depth blow up? Each split reduces the problem: subproblem 1 = `[a0, x1)`, subproblem 2 = `[x2, a1)`; the snake `[x1, x2)` is emitted directly (as `=` pairs) — wait, no: in my split, subproblem 1 = `[a0, x2)`×`[b0, y2)` (including the snake) and subproblem 2 = `[x2, a1)`×`[y2, b1)`; then the snake's `=` entries get emitted by subproblem 1's recursion — but hold on, earlier I argued the *safe* split is: sub 1 = prefix before snake `[a0, x1)`×`[b0, y1)`, emit snake `=`s explicitly, sub 2 = `[x2, a1)`×`[y2, b1)`. With that split: sub 1's optimal ≤ `d_f` (prefix of the optimal path) ✓, sub 2's optimal ≤ `d_r` ✓, sum ≤ `D_true`, and ≥ `D_true` ⇒ equality ✓ minimal, guaranteed. The alternative split (snake inside sub 1) gives sub 1 optimal ≤ `d_f + snake_len` — sum ≤ `D_true + snake_len` — NOT guaranteed minimal! So: **split before/after the snake and emit the snake's `=`s explicitly**. But hmm — wait: is `D1_opt ≤ d_f` right? Sub 1 = `(a[a0:x1], b[b0:y1])`: the optimal path's prefix from `(0,0)` to `(x1,y1)` has `d_f` steps ✓ so `D1_opt ≤ d_f` ✓. Sub 2 = `(a[x2:], b[y2:])`: suffix of optimal path from `(x2,y2)` to `(N,M)`: `d_r` steps ✓. And snake = matches ⇒ the `=` emissions are correct ✓. Total = `D1_opt + D2_opt + 0 ≥ D_true` (any valid script for whole... the concatenation (script1 + `=`s + script2) is a valid script for the whole ⇒ its length `D1_opt + D2_opt ≥ D_true`) and `≤ d_f + d_r = D_true` ⇒ equality ✓✓. 

Recursion depth: each call either hits base cases or splits into two strictly smaller problems (sub 1 has `x1 - a0 < a1 - a0` lines? Since post-trim `a[a0] != b[b0]`, the first step `d = 1` moves... hmm, could `x1 = a0` and `y1 = b0` (empty sub 1)? Then sub 1 is empty → base case, no recursion. Could both subs be non-empty but the *snake* empty and progress... each recursion level strictly reduces total lines: sub1 + sub2 lines = (a1 - a0) + (b1 - b0) - snake_len; if snake_len = 0, total lines same! E.g. sub1 empty (0 lines), snake 0, sub2 = whole → infinite recursion? Can sub1 be empty with an empty snake? `x1 = a0, y1 = b0` means the optimal path's prefix (length `d_f`) ends at the very start ⇒ `d_f = 0` ⇒ overlap with `d_f = 0`: forward step 0 is just point `(0,0)` after snake; post-trim, the snake at `(0,0)` is empty (mismatch at start) ⇒ `Vf[0] = 0` = `Vr[0]`... possible? `Vr[0] = 0` would mean the reverse path slides all the way down to `(0,0)` — but the end is mismatched (post-trim `a[-1] != b[-1]`) ⇒ reverse snake from `(N,M)` can't slide at all... `Vr[0] = N`? no — `Vr[0]` is on diagonal 0: reverse reaches `(N, M)` (diagonal `delta`; diagonal 0 reachable only if `delta = 0`). If `delta = 0`: `Vr[0] ≤ N` — reverse step 0: `x = N` then slide: `a[N-1] == b[M-1]`? Post-trim: false ⇒ `Vr[0] = N`. Overlap check: `Vr[0] = N ≤ Vf[0] = 0`? No ✓. So at `d = 0` no overlap (good). At `d ≥ 1` with `d_f ≥ 1`: sub 1 could still be tiny but non-empty; each recursion with non-empty sub 1 and non-empty sub 2: does the *line count* strictly decrease? Total lines across subs = total − snake_len. If snake_len = 0 and both subs non-empty: no decrease ⇒ potential deep/nonterminating recursion? But `D` strictly decreases: `D1_opt + D2_opt = D_true` with `D1_opt ≤ d_f, D2_opt ≤ d_r`, `d_f + d_r = D_true`... if both subs non-empty, both `D1_opt ≥ 1`? A non-empty pair with a mismatch at the start (post-trim within the subproblem? — the sub-problems get trimmed at entry) ⇒ `D1_opt ≥ 1` and `D2_opt ≥ 1` ⇒ `d_f ≥ D1_opt ≥ 1`, `d_r ≥ 1`, and `D1_opt < d_f` impossible?... `D1_opt ≤ d_f`, `D2_opt ≤ d_r`, sum equality ⇒ `D1_opt = d_f` might still hold... depth bounded by `D_true` regardless (each level `D` splits into `D1 + D2 = D`, both ≥ 1 ⇒ depth ≤ D). For D = 2000: recursion depth ≤ 2000 — Python default limit 1000! Use an explicit stack (iterative) or raise the limit. I'll use recursion with `sys.setrecursionlimit` bump, or better: convert to an explicit stack of (lo, hi) ranges. Cleaner: explicit stack. Each stack frame: (a0, a1, b0, b1). Process: trim, handle bases, else find middle snake, push the two subproblems... but output ORDER matters: the result must be in order — with a stack, push sub 2 first then sub 1 (LIFO) — but the `=` snake emissions must sit *between* them! Handle: emit snake `=`s immediately after computing the snake? No — order: output = script(sub1) + `=`s + script(sub2). With a stack: push ("snake-marker", lines) then... simpler: process iteratively with a stack of tasks where a task is either ("emit", item) or ("diff", a0,a1,b0,b1): push [task2, snake_emits..., task1] reversed onto stack... stack LIFO: push sub2 first? We want sub1 processed first: push in reverse: push sub2, push snake-emit-tasks, push sub1 → pop order: sub1, snakes, sub2 ✓. But the snake `=` items depend on the snake found — computed at pop time of the parent frame ✓ fine.

Alternatively just use recursion + `sys.setrecursionlimit(10000)` — recursion depth also bounded by ~D... but actually depth is bounded more tightly: each level, both subproblems get trimmed... worst case still ~D = 2000 > default 1000 in the pathological case? For the 1000-completely-different case: D_true = 2000, depth ≤ 2000. Recursion with limit 10000 is fine and simpler to write correctly. Hmm, but CPython stack frames at depth 2000 — fine memory-wise. I'll do recursion with a bumped limit. Actually — explicit stack is not much harder and avoids any limit concerns; but recursion is cleaner for appending `=` snake items in order. Let me do recursion with `sys.setrecursionlimit(max(1000, ...))` — set to e.g. 1_000_000? Setting a huge recursionlimit risks C-stack overflow segfault at extreme depths; depth ≤ D ≤ N + M ≤ ~40000 realistically... The problem states 20000/1000-line inputs; depth ≤ D_true + small. With 20000-line inputs differing in 50 places, D ≈ 100 → depth small. For safety vs the stated constraints: fine. I'll set recursion limit to 100000. Hmm, actually with deep recursion each frame is small; C stack ~ depth × ~1KB? 100000 × 1KB = 100MB — borderline; but realistic depth here ≤ ~2000 (from the 1000-line case) → fine. I'll set the limit to 20000 and note depth ≤ D+2 ≤ N+M+2; for the stated inputs that's ≤ 2002... for 20000-line inputs, if someone diffs two *completely* different 20000-line lists, D = 40000 → depth up to 40000 → C stack ~40MB — probably OK; I'll set limit 100000 and accept it. Actually, let me just write it iteratively with an explicit stack — it's straightforwardly safer, and the middle-snake function returns the snake; the driver handles ordering. Let me define the emit ordering carefully:

```python
def diff_lines(a, b):
    out = []
    stack = [(0, len(a), 0, len(b))]
    while stack:
        a0, a1, b0, b1 = stack.pop()
        # trim prefix
        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0])); a0 += 1; b0 += 1
        # trim suffix
        suffix = []
        while a1 > a0 and b1 > b0 and a[a1-1] == b[b1-1]:
            a1 -= 1; b1 -= 1
            suffix.append(("=", a[a1]))
        suffix.reverse()
        if a0 == a1 or b0 == b1:
            if b0 < b1:
                out.extend(("+", x) for x in b[b0:b1])
            if a0 < a1:
                out.extend(("-", x) for x in a[a0:a1])
            out.extend(suffix)
            continue
        snake = _middle_snake(a, a0, a1, b, b0, b1)  # (x1, y1, x2, y2) absolute
        x1, y1, x2, y2 = snake
        # push sub2, then snake emits, then sub1 (pop order: sub1, snake, sub2)
        stack.append((x2, a1, y2, b1))
        for i in range(x2 - x1):
            stack.append(("=", a[x1 + i]))  # hmm — mixed tuple/uniform items
        stack.append((a0, x1, b0, y1))
    ...
```

Mixing task tuples and emit-items on one stack is ugly (also `("=" , line)` vs 4-tuple — distinguishable but fragile). Cleaner: recursive function after all; or a stack of lists-of-ops. Let me just do recursion — cleaner and the depth is fine for the stated constraints. I'll write:

```python
def diff_lines(a, b):
    out = []
    _diff(a, b, 0, len(a), 0, len(b), out)
    return out

def _diff(a, b, a0, a1, b0, b1, out):
    while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
        out.append(("=", a[a0])); a0 += 1; b0 += 1
    tail = []
    while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
        a1 -= 1; b1 -= 1
        tail.append(("=", a[a1]))
    if a0 == a1:
        out.extend(("+", s) for s in b[b0:b1])
    elif b0 == b1:
        out.extend(("-", s) for s in a[a0:a1])
    else:
        x1, y1, x2, y2 = _middle_snake(a, b, a0, a1, b0, b1)
        _diff(a, b, a0, x1, b0, y1, out)
        for i in range(x1, x2):
            out.append(("=", a[i]))
        _diff(a, b, x2, a1, y2, b1, out)
    out.extend(tail)
```

Wait — careful: if `a0 == a1` (a-side empty in the middle): b's remainder are all `+` ✓; elif b empty: `-`s ✓. The `tail` appended at the end preserves order ✓ (tail lines come after everything in this segment) ✓.

Edge: could the middle snake search fail (return None)? Post-trim non-empty both sides ⇒ overlap guaranteed at some `d ≤ ceil((N+M)/2) + 1`; I'll loop with a generous bound and it will return; still, I'll structure the loop to always find it (loop `while True` with `d` incrementing and a theoretical cap — since it's mathematically guaranteed, `while True` is safe; I'll cap at `(N+M)//2 + 2` and if somehow not found, fall back to plain "-all then +all"? A fallback would break minimality but only triggers if theory fails — it won't; but a `while True` without cap risks infinite loop on a bug. I'll cap and fall back to the trivial split (snake = first-line split? e.g. treat as: x1=x2=a0... hmm, that'd loop forever in recursion? A fallback: return the trivial decomposition: emit '-' for all a, '+' for all b — I'd need to signal it. Simplest: cap the loop at `(N+M)//2 + 2` and if not found (impossible), do the base-case-style emission via raising a flag... I'll just trust it and use `while True` — no, safety: cap it, and on failure emit the trivial script through a returned sentinel: let `_middle_snake` return `None` and handle: `out.extend(('-')...)` etc. Fine, cheap insurance.)

Now — the crucial performance question: the middle-snake search at the ROOT of e.g. the 20000/50-diff case. After trimming at the top-level call, arrays are small (~100 lines), so the DP is tiny ✓. But WAIT — the trimming happens inside `_diff` per call; the root call trims the 20000-lists down to ~100 lines BEFORE the snake search ✓. For the 1000-completely-different case: trimming removes nothing; the snake search runs the full DP to `d ≈ D_true/2 ≈ 1000`: cost Σ_{d=0}^{1000} 2·(d+1)·2 (forward+reverse) ≈ 2M inner iterations, each involving dict ops — in Python maybe 1.5–3s. Hmm — the requirement is < 6s. Risky but probably OK; can optimize: use lists instead of dicts for `Vf`/`Vr` with offset indexing (size `2·d + 3` grown as needed) — list indexing is faster than dict. Let me use preallocated lists of size `N + M + 3`?? For N=M=1000: size ~2003 per array — fine (only two arrays, reused). Index `k` → `k + offset` with offset = N + 1 or so (k ranges `[-(N+M), N+M]`... k ranges `[-d, d]` ⊆ `[-2000, 2000]`, and reverse k ranges `[delta - d, delta + d]` ⊆ similar). Offset = N + M + 1 to be safe... k min = `delta - d ≥ -(M) - (N+M)`? No: `|k| ≤ d ≤ (N+M)/2 + 1` for forward; reverse `k ∈ [delta - d, delta + d] ⊆ [-(N+M)/2 + delta, ...] ⊆ [-(N+M), N+M]` roughly. Size `N + M + 3` with offset `N + 1`... let me just use offset `(N + M) // 2 + 2`?? Simpler: offset = N + 2 works for forward (`k ≥ -d ≥ -(N+M)/2 - 1 ≥ -N - 1` when M ≤ N? not necessarily). Use offset = N + M + 1 and list size 2(N+M) + 3 → for 2000: size 4003, negligible. Wait actually k for forward: `k ∈ [-d, d]`, `d ≤ (N+M)/2 + 2` ⇒ `|k| ≤ (N+M)/2 + 2`. Reverse: `k ∈ [delta - d, delta + d]`, `|k| ≤ |delta| + d ≤ (N+M)/2 + 2` too (since `|delta| ≤ N + M`... no: `|delta| + d` where `d ≤ (N+M)/2 + 2` and `|delta| ≤ min(N,M) + ...` hmm `|delta| = |N - M| ≤ N + M`; worst `|delta| + d ≈ |N - M| + (N+M)/2` ≤ 1.5(N+M). Just size the arrays `2*(N+M) + 8`, offset `(N+M) + 4`. Memory: for the 20000 case: trimmed arrays are small, but `_middle_snake` is called with the trimmed ranges — allocate arrays of size based on the *trimmed* lengths ✓ (per call, sized by `(a1 - a0) + (b1 - b0)`).

Performance of inner loops in Python: the forward inner loop per (d, k): ~6-8 bytecode-heavy operations + snake while-loop. 2M iterations × ~0.3μs? More realistically 0.4–0.7μs → 1–1.5s. Plus snake work: for completely-different sequences, snakes are empty (each line unique) → negligible. Should fit under 6s. Can optimize further: early exit — we can also add the "if Vf and Vr ranges can't overlap, skip check" micro-opts; not needed.

Hmm, wait — one more consideration for the 1000-different case: D_true = 2000 → d goes to ~1001. But ALSO: with completely different single-char... they're *lines*; if all 2000 lines are distinct strings, snakes are empty, and the DP inner loop is pure overhead. Σ_{d=1}^{1001} 2·(2d+2) ≈ 2·(1001² + 2·1001) ≈ 2M. OK. But hmm, actually can I add a cheap pre-check: if the sets of lines are disjoint → trivial script. That handles the likely test. I'll add it (set(a) & set(b) empty ⇒ all-minus-then-all-plus). Wait — even if sets intersect, "completely different" test might still be e.g. `a = [str(i) for i in range(1000)]`, `b = [str(i + 1000) for i in ...]` → disjoint ✓ handled. If the tester used overlapping but differently-ordered lines, D < 2000 anyway. I'll include the fast path (correct: no common lines ⇒ LCS = 0 ⇒ script must be all `-` then all `+`; that IS the unique minimal form... any minimal script with 0 `=`: all `-`s then all `+`s — order: the script must emit a's lines in order then b's? With zero `=`: `-` items give a in order, `+` items give b in order; interleaving `-` and `+` arbitrarily still satisfies the constraints and is the same length; Myers would produce *some* interleaving. My fast path emits all `-` then all `+` — valid ✓).

Hmm, but careful: the fast path changes output vs. the general algorithm — the problem says "returns a shortest edit script" — any minimal one ✓ fine.

Also add the same fast path *inside* `_diff`? At the root it matters; at inner nodes the arrays are small. I'll put the set-intersection check at the top of `_diff` — cost O(len) per call; number of calls O(D)... Σ sizes per depth ≤ N+M, depth ≤ log-ish? — hmm, depth ≤ D; Σ over all calls of O(size) work: each call's trim work is proportional to matched lines removed + small; total trim work across recursion: each equal line can be re-examined at most once per depth level it survives... The middle snake split: sub1 = [a0,x1), sub2 = [x2,a1) — equal lines are trimmed off immediately at each call, so a line is trimmed exactly once ever (then it's outside all subproblems) — EXCEPT the tail list: trimmed suffix lines are re-emitted per call but they're removed from the range ✓ trimmed once. So total trim cost O(N + M) overall ✓. The set-check per call: O(size of call) — Σ over calls of size: sizes telescope like the recursion tree — worst case Σ = (N+M) × depth? Depth ≤ D(=2000) × (N+M)=2000 → 4M set-ops... hmm, that could cost 1-2s. Limit the set fast-path to the root call only (depth 0). Actually — is deep recursion with big sets even possible? Each recursion level strictly... at each level, sub1+sub2 lines ≈ parent lines (minus snake); depth ≤ D... and at depth h there are ≤ 2^h nodes but Σ sizes ≤ N+M? NO — subproblems tile disjoint ranges ⇒ Σ over depth-h nodes of sizes ≤ N + M ✓ (disjoint tiling). So Σ over ALL nodes of sizes ≤ (N+M)·depth... no: Σ over depth h ≤ N+M, times depth ≤ D → Σ ≤ (N+M)·D = 4M for the worst case... but realistically the set-check at inner nodes: sizes shrink fast. Eh — just do the set fast-path only when the combined size is large (say > 100) — inner nodes in the pathological case are small anyway. Or simplest: do the set fast-path at every `_diff` call — with the disjointness check `not (set_a & set_b)` computed via... building sets is O(size) each call. Σ sizes ≤ (N+M)·depth... I'll just gate: only at the root (`out` empty). Simple: check `if not out and a0 == 0 and a1 == len(a) ...` — or pass a flag. Eh — do the set check only if `(a1 - a0) + (b1 - b0) > 200` (covers root and big nodes; small nodes skip). Actually for the stated perf requirements, the root check suffices; inner pathological cases have small D per node... fine, gate on size > 60? Hmm — for the 20000/50 case: root trims to ~100 lines total, set-check runs (cheap, ~100 items) — fine either way. I'll gate at `>= 64` combined size. Wait, but in the 20000/50 case the root call BEFORE trimming has size 40000 → set-check runs on full 20000-element sets → building sets O(N+M) ≈ 40000 hash ops ≈ 5ms ✓ fine, and if disjoint → instant. But here they're not disjoint (50 common) → the check fails and we proceed ✓ 5ms wasted, fine.

Hmm — one more inner-node subtlety: in the pathological 1000-different case, `_diff` root: trim finds nothing; set-check: disjoint → fast path ✓ done in ~1ms. 

Now — what if the 1000-different test uses lines that DO overlap (e.g., `a = [f"line {i}" for i in range(1000)]`, `b = [f"line {i}" for i in range(999, -1, -1)]` — reversed)? Then LCS = 1-ish, D ≈ 1998, sets overlap → full DP ~2M iterations ≈ 1.5-2.5s in CPython. Under 6s ✓ probably. Let me micro-optimize the inner loops decently (local variable caching, minimal attribute lookups).

Let me also double-check the odd-case check range subtlety: at forward step `d`, comparing against reverse step `d - 1` — but at `d = 0` there's no reverse step `-1`; the range `[delta - (d-1), delta + (d-1)]` at `d = 0` = `[delta + 1, delta - 1]` — empty unless delta... `delta + 1 > delta - 1` always → empty ✓ (range loop just won't find k). Implementation: check `if odd and delta - d + 1 <= k <= delta + d - 1 and Vr.get-ish`. With list-based Vr I need "present" tracking — since stale keys exist, use a separate "written" tracking? Alternative: initialize `Vr` fully with a sentinel (e.g. `-1`... values are `x ≥ 0`; but "absent" needs distinction from real 0). Hmm — use sentinel `BIG = a1 + 1`? For Vr, absent = +inf (check `Vr[k] <= x` fails) ✓ initialize the whole array to `N+1... ` wait x values ≤ N; absent → set to `N + 2` (never ≤ any x ≤ N) ✓. For the odd-case forward check we test `Vr[k] <= x`: absent ⇒ huge ⇒ false ✓. And the even-case reverse check tests `Vr[k] <= Vf[k]`: Vf absent → initialize Vf array to `-2`? absent Vf should FAIL (`Vr[k] <= Vf[k]` false) → init Vf to `-1`? Vf values ≥ 0; absent → `-1` ⇒ `Vr[k] ≤ -1` false ✓. But careful: in the odd case, `k` range-limited to reverse-(d-1) coverage ⇒ Vr[k] fresh ✓; the sentinel only matters if range logic is off — belt and braces ✓. In the even case, `k` range-limited to `[-d, d]` ∩ reverse range ⇒ Vf[k] fresh ✓; Vf sentinel `-1` handles edge ✓.

Also `Vf` init: seed `Vf[1] = 0` i.e. `vf[offset + 1] = 0`; everything else sentinel. `Vr` seed: `Vr[delta - 1] = N` (type-B). Both arrays sized `2*(N + M) + 8` with offset `(N + M) + 4`. Hmm wait, type-B needs `Vr[delta - 1]`: with type-B the `d = 0` iteration: `k ∈ {delta}`: branch: `k == delta + d` ✓ true → `x = Vr[k-1] = Vr[delta - 1] = N` ✓ then snake slide ✓. 

Let me also re-verify the branch-condition semantics for type-B once more with the trace `a="ab", b="b"` (N=2, M=1, delta=1, odd): `Vr = {0: 2}` (delta - 1 = 0). d=0: k=1: `k == delta + d = 1` ✓ → `x = Vr[0] = 2`, `y = x - k = 1` ✓ point (2,1) ✓. Slide: `x > 0, y > 0, a[1] == b[0]` → 'b'=='b' ✓ → (1, 0); then `y = 0` stop. `Vr[1] = 1` ✓ (matches earlier trace). Even-check skipped. ✓ Consistent.

And re-verify the odd forward check on the same trace at d=1: `k=1`: range `delta - d + 1 = 1` to `delta + d - 1 = 1` ✓ `k=1` in range; `Vr[1] = 1 ≤ x = 2` ✓ → snake `(Vr[1], Vr[1] - 1) = (1, 0)` to `(2, 1)` ✓ matches.

Even-case full trace `a="ac", b="bc"` with type-B: N=2, M=2, delta=0, even. `Vf = {1: 0}`; `Vr = {-1: 2}`.
- d=0: forward k=0: `k == -d` → `x = Vf[1] = 0`, y=0; slide: `a[0]='a' vs b[0]='b'` no. `Vf[0]=0`. reverse k=0: `k == delta + d` ✓ → `x = Vr[-1] = 2`, y=2; slide: `a[1]='c' == b[1]='c'` ✓ → (1,1); `a[0]='a' vs b[0]='b'` no. `Vr[0] = 1`. even check: range `-0 ≤ 0 ≤ 0` ✓, `Vr[0] = 1 ≤ Vf[0] = 0`? No ✓.
- d=1: forward k=-1: `k == -d` → `x = Vf[0] = 0`, y = 1; slide: `a[0]='a' vs b[1]='c'` no. `Vf[-1] = 0`. k=1: `k == d` → `x = Vf[0] + 1 = 1`, y = 0; slide: `a[1]='c' vs b[0]='b'` no. `Vf[1] = 1`. reverse k ∈ {-1, 1}: k=-1: `k == delta - d = -1`? The branch: `k == delta + d = 1`? No. `k != delta - d = -1`? k == -1 → false → else branch: `x = Vr[k+1] - 1 = Vr[0] - 1 = 0`; y = x - k = 1; slide: `x > 0`? x=0 → stop. `Vr[-1] = 0`. even check: `-1 ≤ -1 ≤ 1` ✓, `Vr[-1] = 0 ≤ Vf[-1] = 0` ✓ → overlap! Snake `(0, 1) → (0, 1)` — empty snake at (0,1) ✓ as before. Split: sub1 = a[0:0]×b[0:1] → `+b`; snake: none; sub2 = a[0:2]×b[1:2] → trim: `a[0]='a' vs b[1]='c'` no prefix; suffix `a[1]='c' == b[1]='c'` ✓ → tail `=c`; then a-side `a[0:1]='a'` vs b empty → `-a`. Total: `+b, -a, =c` ✓ minimal (D=2) ✓.

Great, the machinery is consistent. Now write `_middle_snake`:

```python
def _middle_snake(a, b, a0, a1, b0, b1):
    N = a1 - a0; M = b1 - b0
    delta = N - M
    odd = delta % 2  # 1 if odd
    size = N + M
    off = size + 2   # k ranges within [-size/2-1 - |delta|..., ...]; be generous: off = size + 2? k min = delta - d ≥ -(M) - ... let me bound: d ≤ size//2 + 2; k ≥ delta - d ≥ -M - size/2 - 2; with off = size + 2 and array size 2*size + 5: index = k + off ∈ [0, 2*size+4] requires k ∈ [-size-2, size+2] — |k| ≤ |delta| + d ≤ size + ... hmm |delta| ≤ size, d ≤ size/2 + 2 → |k| ≤ 1.5·size + 2?? No: reverse k ∈ [delta - d, delta + d]; |delta - d| ≤ max(|delta|, d)... actually |delta| + d: delta = N - M, d ≤ (N+M)/2 + 2 → |k| ≤ |N - M| + (N+M)/2 + 2 ≤ (N+M) + 2 = size + 2 ✓ (since |N - M| + (N+M)/2 ≤ N + M ✓). So k ∈ [-size - 2, size + 2]; off = size + 3; array size 2*size + 7. Fine.
```

Let me just set `off = size + 3`, `vf = [-1] * (2*size + 7)`, `vr = [big] * (2*size + 7)` where `big = N + 2`... wait, vr values ≤ N; absent-sentinel must fail `Vr[k] <= x` for any real x ≤ N... but also fail `Vr[k] <= Vf[k]` when Vf[k] is a real value — absent Vr → sentinel `> N` ✓ fails both ✓. And vf absent-sentinel `-1`: fails `Vr[k] <= Vf[k]` since Vr[k] ≥ 0 > -1 when Vr[k] real ✓; but if BOTH absent: `big ≤ -1` false ✓.

Hmm, but wait: vf needs `vf[off + 1] = 0` seed and vr `vr[off + delta - 1] = N`.

Loop:

```python
d = 0
while True:
    # forward step d
    if d == 0:
        k = 0 → handled by generic loop: for k in range(-d, d+1, 2) = {0}
    for k in range(-d, d + 1, 2):
        if k == -d or (k != d and vf[off + k - 1] < vf[off + k + 1]):
            x = vf[off + k + 1]
        else:
            x = vf[off + k - 1] + 1
        y = x - k
        # snake
        ax = a0 + x; by = b0 + y  # absolute indices... or work with absolute x directly
```

Work in RELATIVE coordinates (x ∈ [0, N], y ∈ [0, M]) but index a, b absolutely: condition `a[a0 + x] == b[b0 + y]`. To speed up: slice local references `la = a; lb = b` and add offsets. Micro-opt: precompute `aa = a; base_a = a0`. Inner while: `while x < N and y < M and a[a0 + x] == b[b0 + y]: x += 1; y += 1` — two index additions per comparison. Could avoid by comparing slices? For speed, the snake loop could use a manual comparison... keep simple; performance target should be met.

Actually, for better constant factors, an alternative for the snake: since these are Python strings/objects, the comparison `a[a0+x] == b[b0+y]` is a string comparison (interned lines: often pointer-equal fast path). OK.

Odd check inside forward loop:

```python
        vf[off + k] = x
        if odd and delta - d + 1 <= k <= delta + d - 1 and vr[off + k] <= x:
            # verify snake segment
            x1 = vr[off + k]; y1 = x1 - k
            if all(a[a0 + x1 + t] == b[b0 + y1 + t] for t in range(x - x1)):
                return (a0 + x1, b0 + y1, a0 + x, b0 + y)
```

Hmm wait — the snake from (x1,y1) to (x,y): relative coords; the segment must be matching: pairs (x1+t, y1+t) for t in [0, x - x1) ✓ (they're on diagonal k, consecutive). Note the returned snake may have length 0 (x1 == x) ✓ fine.

Even check inside reverse loop:

```python
        vr[off + k] = x
        if not odd and -d <= k <= d and vr[off + k] <= vf[off + k]:
            x2 = vf[off + k]; y2 = x2 - k; x1 = x; y1 = x - k  # vr point is (x, x-k)
            if all(a[a0 + x1 + t] == b[b0 + y1 + t] for t in range(x2 - x1)):
                return (a0 + x1, b0 + y1, a0 + x2, b0 + y2)
```

Wait — the even-case snake: from reverse point (min x) to forward point (max x): `(x1,y1) = vr point`, `(x2,y2) = vf point` ✓.

Loop bound: `while d <= size // 2 + 2` else fallback return None. Since theory guarantees a hit within `d ≤ ceil(size/2)`, the +2 slack suffices... let me double check the worst d: odd delta: `d = (D_true + 1)/2`, `D_true ≤ N + M = size` → `d ≤ (size + 1)/2`; even: `d = D_true/2 ≤ size/2`. So bound `size // 2 + 2` covers ✓. Hmm, D_true ≤ size? D_true = N + M when no common anything — yes, upper bound ✓ (script: delete all, insert all). ✓.

Fallback if loop exhausted: return None → `_diff` emits all `-` then all `+` for the segment (still a valid script, just possibly non-minimal — but this never happens).

Now, is `odd` handled right when `d = 0`? Forward loop at d=0: k=0; odd check range `[delta + 1, delta - 1]` empty ✓. Reverse loop d=0: k ∈ {delta}: even check range `[-0, 0] = {0}`: requires `k == 0` → only if delta == 0: check `vr[off] <= vf[off]`: `vr[off]` = post-slide x, `vf[off]` = post-slide x: both = full-slide from (0,0)... e.g. identical sequences: vf[0] = N (slid all the way), vr[0] = 0 → `0 ≤ N` ✓ overlap → snake (0,0)→(N,N) → whole thing is `=`s ✓ — handles identical inputs even without trimming ✓. But post-trim inputs have mismatched ends... trimming happens before `_middle_snake` ✓ so at d=0, delta==0 case: vf[0] = 0 (mismatch at start), vr[0] = N (mismatch at end) → `N ≤ 0` false ✓ no premature overlap ✓.

Wait, there's still a subtle issue with the odd-case: the forward check compares against reverse values from step `d - 1`, but the range condition `delta - d + 1 <= k <= delta + d - 1` — reverse step `d-1` covers `[delta - (d-1), delta + (d-1)]` = exactly that range ✓ fresh values ✓.

Now, `while True` outer loop over d — structure:

```python
d = 0
while d <= size // 2 + 2:
    ... forward ...
    ... reverse ...
    d += 1
return None
```

One more consideration — the `_diff` recursion: I claimed each split's subproblems have `D1 = d_f`, `D2 = d_r` exactly and the recursion is correct. Also note the subproblems get re-trimmed (cheap, correct).

Also: `_diff` emits `tail` — order check: `_diff` appends prefix `=`s, then middle (recursions + snake), then... wait I appended tail AFTER the base-case extends and after recursion — in my sketch: prefix `=`s appended first ✓, then either base-case emissions or (recursion, snake `=`s, recursion), then `tail` ✓ order correct: [prefix equals][middle stuff][suffix equals] ✓.

Now performance detail: `_middle_snake` allocates `vf`/`vr` lists of size ~2(N+M) per call — Σ over calls: sizes tile like subproblem sizes: Σ ≤ 2·(N+M)·depth? Each call allocates O(size of call) — Σ over all calls ≤ (N+M)·depth ≤ (N+M)·D... for the pathological 1000-case: root allocates ~4000-slot lists ×2 — trivial. Number of calls: ≤ 2·D+... fine.

The inner-loop cost concern for the pathological case stands at ~2M iterations; but with the disjoint-set fast path, the pathological test likely never reaches the DP. For a reversed-1000-lines case (sets overlap), DP runs ~2M iterations... let me optimize the inner loop reasonably: hoist `off`, use local names for `vf`, `vr`, `a`, `b`, `a0`, `b0`, `N`, `M`.

Actually, wait — I realize there might be an issue with how much work the DP does when sequences share a long common region but the root trim only removes prefix/suffix. E.g., the 20000/50 case: a and b share ~99.5% of lines but interleaved — after trimming, maybe ~200 lines remain — fine. But a case like: a = X + [x] + Y, b = X + [y] + Y where X, Y are huge: trimming removes X and Y ✓ leaves 2 lines ✓.

Nasty case for DP cost: 20000 lines differing in ~50 places SCATTERED — trims only the ends; the middle contains long common stretches. Then the root `_middle_snake` runs on ~40000/2... wait no — the trimmed arrays still contain the long common middle! E.g., a = [common block C (10000 lines)] + [25 diff lines] + [common block D], b = same structure with different diff lines: trim removes prefix C and suffix D → left with 50 vs 50 diff lines ✓ small. But: a = [25 diffs][10000 common][25 diffs], b = [25 different diffs][same common][25 different diffs]: prefix trim: a[0] vs b[0] — both diff → stops immediately! Suffix trim: a[-1] vs b[-1] — diff → stops. So the DP runs on 10050 vs 10050 lines with D ≈ 100! The DP cost: Σ_{d≤50} O(d) diagonal iterations + SNAKE work: snakes slide through the 10000-line common middle REPEATEDLY — once per (d, k) combination that touches it: snake work ~ O((N+M)·D) = 20000·100·2 = 4M string comparisons + loop iterations ≈ 2-4s?? Hmm, that might exceed... it's ~4M iterations of a tight while loop with list indexing + comparison: in CPython ~0.15-0.25μs per iteration → 0.6-1.0s. Plus 2·Σd ≈ 5000 outer iterations. Probably ~1s total. Under 2s? Tight but likely OK. Can I reduce snake work? Classic trick: none simple. Alternative: prune common prefix/suffix *within* the DP? There's a known optimization: in Myers' linear-space algorithm you can trim inside `_diff` recursively (already doing). The repeated snake sliding is inherent to the O(ND) algorithm (its worst case IS O(ND)). (N+M)·D = 20000·100 = 2M... with the 2× for forward+reverse and per-diagonal... my estimate above: Σ over (d, k) of snake length — bounded by (N+M)·D/... whatever, ~2M ops ≈ 0.5-1s. Accept.

Hmm, but actually — one more optimization that's easy and helps a lot here: **check overlap ALSO in the forward pass for even delta and reverse pass for odd delta with the mirror pairing**, no — that doesn't reduce snake work.

Alternatively skip-ahead: the "snakes" in the middle common region get slid repeatedly; a known optimization for the O(ND) algorithm is fine. Let's move on.

Let me also double check `_diff`'s handling when `_middle_snake` returns a snake with x1 == x2 (empty) — the split still makes progress: sub1 = [a0, x1) × [b0, y1), sub2 = [x2, a1) × [y2, b1); the two subs are strictly smaller than the whole UNLESS one of them is the whole and the other empty — possible? sub1 empty ⟺ x1 == a0 and y1 == b0; sub2 = whole ⟺ x2 == a1, y2 == b1; but snake empty means x1 == x2, y1 == y2 → both conditions together imply the whole is empty — contradiction (non-empty). But sub1 empty + sub2 non-empty (x1 == x2 == a0... x1 == a0, y1 == b0, x2 == x1 < a1 ✓): then recursion on sub2 only: is progress made? D2 = D_true and sub2 ≈ whole minus nothing?? If x1 == a0, y1 == b0: the optimal path's first d_f steps... d_f ≥ 1 (since d ≥ 1 when overlap found... could overlap be found at d = 0? shown above: no, post-trim). d_f = d ≥ 1 and the path prefix of length d ends at (x1, y1) = (0, 0)?? A path of length d ≥ 1 from (0,0) to (0,0) — impossible (paths only move forward). So x1,y1 ≠ (0,0) rel ⇒ sub1 non-empty OR the snake is non-empty... if sub1 is empty: x1 = 0, y1 = 0 (rel) → d_f = 0 → contradiction ⇒ sub1 non-empty... unless d_f = 0 via d = 0 overlap — excluded ✓. Hmm wait, but the overlap could be found in the EVEN case at reverse step d, pairing (d_f, d_r) = (d, d): d_f = d ≥ 1 ✓ (d=0 excluded above). Odd case: (d, d-1): d ≥ 1, d_f = d ≥ 1 ✓. So sub1 always non-empty when the snake is empty; and symmetric argument: d_r ≥ 1 ⇒ sub2 non-empty (sub2 empty ⟺ (x2,y2) = (N,M) rel ⇒ suffix path length d_r = 0, contradiction). So BOTH subproblems are strictly smaller (each non-empty, and snake lines excluded... if snake empty, subs partition the whole but each is a strict subset since both non-empty... "strictly smaller" for termination: each sub has fewer lines than the parent? sub1 lines = x1 + y1-ish... sub1 size = (x1) + (y1) < N + M since sub2 non-empty ✓. Termination ✓ (each recursion splits into two non-empty strictly-smaller problems). And D decreases or stays? D1 + D2 = D with D1, D2 ≥ 1 (non-empty mismatched subs — after trimming inside, could become empty base cases; fine). Depth ≤ D ✓.

Wait, actually — hmm, sub1 non-empty: I showed (x1, y1) ≠ (0,0) rel. But sub1 = a[a0:x1] × b[b0:y1]: non-empty in at least one dimension; could be e.g. a-side empty (x1 = 0, y1 > 0) → base case emits `+`s ✓ still fine (progress: y1 > 0 lines consumed).

Now — one more correctness check on the odd-case check range: I restricted `delta - d + 1 <= k <= delta + d - 1`. At `d = 1`: range `[delta, delta]` — k = delta... but forward step 1 covers k ∈ {-1, 1}: requires delta ∈ {-1, 1} for any check — makes sense (D_true = 1 iff |delta| = 1 and... e.g. N=2, M=1, delta=1: at d=1, k=1 checked ✓ found in my trace ✓).

Edge: delta = 0 (even) but D_true odd?? Impossible: D_true ≡ delta (mod 2) ✓.

Now, the `all(...)` generator for snake verification — allocates a generator per check; only runs once (at return). Fine. Actually — I realize the verification could be costly if the snake is long (e.g., the identical-strings case: snake = whole, verification O(N) — fine, once). But WAIT: verification failing → continue searching — then later overlaps re-verify... it's fine.

Hmm, actually let me reconsider whether to include the verification at all: if my parity/geometry reasoning is right, it never fails; if subtly wrong somewhere, verification prevents invalid output (sacrificing minimality possibly). Keep it — cheap insurance. Hmm, but there's a subtle interaction: if verification fails and we continue, later we might return a snake whose df+dr ≠ D_true → non-minimal. Acceptable fallback. Also: if verification never passes and we fall back to None → trivial script. OK.

Let me now also handle the `d = 0` identical case interplay: `_diff` trims first, so identical → handled before `_middle_snake` ✓. d=0 overlap only triggers for... post-trim both non-empty with mismatched ends: at d=0, even-delta check needs k=0 ∈ [-0,0] and delta=0: vr[0] = N (no slide, mismatch at end... wait — vr at d=0, k=delta=0: x = N, slide: a[a1-1] == b[b1-1]? post-trim: false → vr[0] = N... hmm, unless N or M is 0 — excluded (non-empty). vf[0] = 0 (mismatch at start). Check `vr[0] ≤ vf[0]`: N ≤ 0 false ✓. Good, d=0 never overlaps post-trim. (So d can start at 1, but harmless.)

Now assemble the final code:

```python
import sys

def diff_lines(a, b):
    out = []
    # fast path: no common lines at all
    if a and b and not (set(a) & set(b)):
        out.extend(("-", s) for s in a)
        out.extend(("+", s) for s in b)
        return out
    _diff(a, b, 0, len(a), 0, len(b), out)
    return out
```

Hmm — the fast path as written: if a is empty: `set() & ...` → empty → emit nothing for a, then `_diff` handles. But `if a and b` guard means empty lists go to _diff ✓ fine (they're base cases anyway). Also, careful: fast path when ONE is empty: skip (goes to _diff) ✓.

Wait, also: the fast path bypasses... if sets are disjoint the minimal script has zero `=` ✓ and my emission (all `-` then all `+`) is valid ✓ minimal ✓.

`_diff`:

```python
def _diff(a, b, a0, a1, b0, b1, out):
    while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
        out.append(("=", a[a0]))
        a0 += 1
        b0 += 1
    tail = []
    while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
        a1 -= 1
        b1 -= 1
        tail.append(("=", a[a1]))
    if a0 == a1:
        for i in range(b0, b1):
            out.append(("+", b[i]))
    elif b0 == b1:
        for i in range(a0, a1):
            out.append(("-", a[i]))
    else:
        snake = _middle_snake(a, b, a0, a1, b0, b1)
        if snake is None:
            for i in range(a0, a1):
                out.append(("-", a[i]))
            for i in range(b0, b1):
                out.append(("+", b[i]))
        else:
            x1, y1, x2, y2 = snake
            _diff(a, b, a0, x1, b0, y1, out)
            while x1 < x2:
                out.append(("=", a[x1]))
                x1 += 1
            _diff(a, b, x2, a1, y2, b1, out)
    out.extend(tail)
```

Wait — `while x1 < x2: out.append(("=", a[x1]))` — snake pairs: a[x1 + t] == b[y1 + t] ✓ emit a's ✓.

`_middle_snake`:

```python
def _middle_snake(a, b, a0, a1, b0, b1):
    n = a1 - a0
    m = b1 - b0
    delta = n - m
    odd = delta & 1
    size = n + m
    off = size + 3
    vf = [-1] * (2 * size + 7)
    vr = [size + 1] * (2 * size + 7)   # sentinel: > n
    vf[off + 1] = 0
    vr[off + delta - 1] = n
    d = 0
    limit = size // 2 + 2
    while d <= limit:
        # forward
        if odd:
            klo = delta - d + 1
            khi = delta + d - 1
        for k in range(-d, d + 1, 2):
            ki = off + k
            if k == -d or (k != d and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            y = x - k
            ax = a0 + x
            by = b0 + y
            while ax < a1 and by < b1 and a[ax] == b[by]:
                ax += 1
                by += 1
                x += 1  # hmm — better: x = ax - a0 after loop
            x = ax - a0
            vf[ki] = x
            if odd and klo <= k <= khi and vr[ki] <= x:
                x1 = vr[ki]
                y1 = x1 - k
                # verify
                t = x1
                ok = True
                while t < x:
                    if a[a0 + t] != b[b0 + t - k]:
                        ok = False
                        break
                    t += 1
                if ok:
                    return (a0 + x1, b0 + y1, a0 + x, b0 + y - (y - (x - k))...) 
```

careful: return absolute (a0 + x1, b0 + y1, a0 + x, b0 + (x - k)). y = x - k always ✓.

Wait, there's a bug: in the snake loop I mutate x but also need y — I'll just track via ax/by and recompute x at the end; or track x,y and compute ax = a0 + x each iteration (extra adds). Track ax, by and derive x after ✓. But the branch computed `y = x - k` initially — only needed for by init ✓.

Reverse:

```python
        rlo = delta - d
        rhi = delta + d
        for k in range(rlo, rhi + 1, 2):
            ki = off + k
            if k == rhi or (k != rlo and vr[ki + 1] > vr[ki - 1]):
                x = vr[ki - 1]
            else:
                x = vr[ki + 1] - 1
            y = x - k
            ax = a0 + x
            by = b0 + y
            while ax > a0 and by > b0 and a[ax - 1] == b[by - 1]:
                ax -= 1
                by -= 1
            x = ax - a0
            vr[ki] = x
            if not odd and -d <= k <= d and vr[ki] <= vf[ki]:
                x2 = vf[ki]
                y2 = x2 - k
                t = x
                while t < x2:
                    if a[a0 + t] != b[b0 + t - k]:
                        break
                    t += 1
                else-continue-style...
                if t == x2:
                    return (a0 + x, b0 + y, a0 + x2, b0 + y2)
        d += 1
    return None
```

Check reverse branch conditions against derivation: "if `k == delta + d` or (`k != delta - d` and `Vr[k-1] > Vr[k+1]`): `x = Vr[k-1]` else `x = Vr[k+1] - 1`" ✓ matches (`rhi = delta + d`, `rlo = delta - d`). ✓. And the type-B seed `vr[off + delta - 1] = n` ✓. Double-check d=0: k = delta (range {delta}); branch: `k == rhi` (delta == delta ✓ true) → `x = vr[ki - 1] = vr[off + delta - 1] = n` ✓.

Boundary check for the else-branch at `k == rlo`: condition `k != rlo` false → else → `x = vr[ki + 1] - 1` ✓ (leftmost reverse diagonal comes from k+1 ✓).

And forward branch at `k == d`: condition first part `k == -d` false (unless d=0); second `k != d` false → else → `x = vf[ki - 1] + 1` ✓ (rightmost comes from k-1 ✓).

Sentinels: vf absent = -1: at forward branch, `vf[ki - 1]` or `vf[ki + 1]` — could we READ an absent (sentinel) slot in a legitimate branch? Within the loop at step d, diagonal k: `k+1` was written at step d-1... diagonals at step d-1: parity (d-1); k+1 has parity d+1 ≡ d-1 ✓ and |k+1| ≤ d - ... k ≤ d → k+1 ≤ d+1: if k = d, branch takes else ✓ never reads k+1. If k < d: k+1 ≤ d, parity d-1 ✓ written at step d-1 ✓ (all diagonals of parity d-1 in [-(d-1), d-1] were written; k+1 ∈ [-(d-1)+... k ≥ -d+2 → k+1 ≥ -d+3?? hmm k ranges -d, -d+2, ..., d-2 for the k+1 reads: k+1 ∈ {-d+1, ..., d-1} ✓ all within [-(d-1), d-1] ✓ written ✓. Similarly vf[ki-1]: k-1 ∈ {-d+1, ..., d-1} parity d-1 ✓. ✓ No sentinel reads in forward. Reverse: vr[ki-1]: k-1 ∈ [delta-d, delta+d-1]... parity: reverse step d-1 wrote [delta-(d-1), delta+(d-1)] = [delta-d+1, delta+d-1]; reading vr[ki-1] at k = rlo = delta - d: branch takes else? At k == rlo: first branch cond `k == rhi`? no (unless d=0); `k != rlo` false → else → reads vr[ki+1] = vr[delta-d+1] ✓ written at step d-1 ✓. For k > rlo: k-1 ≥ delta-d+1 ✓ written ✓, and branch may choose `x = vr[ki-1]` ✓ valid. vr[ki+1]: k+1 ≤ delta + d - 1 ✓ (k ≤ rhi - 2 in else-branch... if k == rhi, branch-true reads vr[ki-1] ✓; else k ≤ rhi - 2 → k+1 ≤ rhi - 1 ✓ written ✓). ✓ No sentinel reads.

Also — the sentinel in checks: odd check reads `vr[ki]` for k ∈ [delta-d+1, delta+d-1] — fresh ✓ real values ✓. Even check reads `vf[ki]` for k ∈ [-d, d] — fresh from this iteration's forward ✓ real ✓.

Return type: absolute index tuple ✓.

Now — `limit`: `size // 2 + 2`. If not found by then → None → fallback. Theory says found ✓.

Recursion depth: bounded by ~D + O(1) ≤ size + ... each `_diff` level: splits into two subs; depth ≤ D_true + small. For size 40000 worst: depth ≤ 40000 → recursion limit: set `sys.setrecursionlimit` to something like 50000 + slack? C-stack: each `_diff` frame ~ maybe 2KB C stack?? Python frames use heap for the frame but the interpreter recursion (each Python call = a C-level `_PyEval` frame in 3.11+... in 3.11, Python-to-Python calls don't consume C stack (they're inlined in the eval loop)! In CPython 3.11+, Python function calls don't recurse into the C interpreter (mostly), so `sys.setrecursionlimit` can be set high safely-ish. I'll set it to `max(current, 4 * (len(a) + len(b)) + 1000)`? That could be enormous for 20000+20000 → 120000... In 3.11, deep Python recursion with high limit: each frame is heap-allocated; C stack only grows on certain boundaries. Setting 200000 is generally OK in 3.11+. But to be conservative, I could just convert `_diff` to an explicit stack. Let me do the explicit-stack version to be robust:

```python
def diff_lines(a, b):
    out = []
    if a and b and not set(a).intersection(b):
        out.extend(("-", s) for s in a)
        out.extend(("+", s) for s in b)
        return out
    stack = [(0, len(a), 0, len(b))]
    while stack:
        a0, a1, b0, b1 = stack.pop()
        ... trim, base cases (emit directly to out) ...
        else: find snake; then we must emit: script(sub1) + '='*snake + script(sub2)
        → push sub2, push snake-emit marker, push sub1:
```

Represent tasks as tuples with a tag: `("d", a0,a1,b0,b1)` vs `("=", line)` — pop and dispatch. Cleaner: since snake lines are known at push time, push them as `("=" , line)` items directly:

```python
        x1, y1, x2, y2 = snake
        stack.append(("d", x2, a1, y2, b1))
        for i in range(x2 - 1, x1 - 1, -1):   # reversed so pops in order
            stack.append(("=", a[i]))
        stack.append(("d", a0, x1, b0, y1))
```

Pop order: sub1, snake items (in order ✓ since pushed reversed), sub2 ✓. Dispatch:

```python
    while stack:
        task = stack.pop()
        if task[0] == "=":
            out.append(("=", task[1]))
            continue
        _, a0, a1, b0, b1 = task  # 5-tuple ("d", ...)
```

Hmm — tag collision: `("=" , line)` is a 2-tuple, `("d", a0, a1, b0, b1)` 5-tuple — dispatch on `task[0] == "="` vs... "=" items also start with "=". Fine: `if len(task) == 2: out.append(task)`. Clean: `if len(task) == 2: out.append(task); continue`.

Alternatively simpler: recursion with bumped limit. The iterative version is safer; slight ugliness acceptable. Actually — cleaner: make the stack hold only diff-tasks, and handle ordering by processing... no, the interleaving requires the marker approach. It's fine.

Wait, actually — reconsider: is output order really "script(sub1) + snake + script(sub2)"? The overall output must satisfy: `=` `-` items in order = a ✓ (sub1 covers a[a0:x1], snake covers a[x1:x2], sub2 covers a[x2:a1] ✓ tiled in order); similarly b ✓. Minimal ✓ (shown). ✓.

Hmm, one more: in the iterative version, trimming inside each popped task ✓ same as recursion.

Also the fallback (snake None): emit all `-` then `+` for the segment, then continue stack ✓ (order: these emissions happen at this point in the output stream ✓ correct).

Let me now also double-check `_middle_snake`'s odd-case check condition placement: it must run AFTER `vf[ki] = x` (doesn't matter for the check — check uses vr and x) ✓. And importantly the check must use the JUST-computed x ✓.

Potential issue: the odd-case check uses reverse values from step `d - 1`, but at `d = 0` there are none and the range is empty ✓; at `d = 1`, reverse step 0 values exist ✓ (computed in iteration d=0 after forward) ✓ ordering within iteration: forward THEN reverse ✓ so at iteration d, vr holds steps ≤ d-1 ✓ correct pairing.

Even case: reverse step d checked against forward step d — forward ran earlier in the same iteration ✓.

Now let me also reconsider: could the algorithm return an overlap whose pairing total ≠ D_true due to my *range restrictions being insufficient*? Odd case: pairing (d, d-1) fixed ✓ total 2d-1; first hit at minimal d with an overlap in that pairing; theory (Myers Lemma): for D_true = 2m+1, at d = m+1 the check fires (the lemma guarantees overlap of forward-(m+1) with reverse-m paths... precisely: "if δ is odd, an overlap occurs between the furthest reaching forward (D+1)/2-path and reverse (D−1)/2-path points"— hmm, the lemma in the paper is: the middle snake can be found by checking forward reach against reverse reach with these specific parities; and no earlier d fires... could an earlier d fire spuriously (case-B)? If it fires at d < m+1 with a VALID snake (verification passes), the snake gives a path of length... case-A with xf ≤ t: path length exactly 2d - 1... < D_true → contradiction (a path shorter than optimal!) — impossible; case-A with xf > t (forward beyond reverse snake top, but snakes overlap — my earlier case analysis): path length 2d-1-(xf-t) < D_true — impossible; so if verification passes at d < m+1, we get... contradiction — meaning verification-passing overlaps can't fire before d = m+1 (given the snake is real). What if it fires with case-B geometry (verification FAILS)? Then we continue ✓. And at d = m+1 the lemma guarantees a real overlap fires ✓. So: verification-passing hits only occur at d = (D_true+1)/2 (odd) — the first passing hit is THE middle snake ✓. Even case: same with 2d. 

Hmm wait, one more subtle thing about the even case: pairing (d, d) — total 2d; theory: for D_true = 2m, at d = m the overlap exists ✓. But ALSO — should I worry the check at reverse-step-d uses forward step d — yes pairing (d,d) ✓.

But hold on, I should double-check the even-case lemma direction: for D_true even, the paper checks... in the paper: "if δ is even, the overlap is detected when computing the reverse (D/2)-paths against forward (D/2)-paths"? I derived via the optimal-path argument: at path position d_f = m = D/2, point Q with VF[k] ≥ x_Q ≥ VR[k] where VR is reverse-m furthest ✓ — the argument worked for ANY position df (with dr = D - df); the algorithm just needs ONE working pairing; (m, m) is fine ✓.

Also — the lemma requires the overlap point Q to be reachable: Q at path position m on diagonal k, |k| ≤ m ✓ and the forward check range is all of [-d, d] ∩ reverse-range ✓ includes k ✓.

One more potential gotcha: the forward check range `[delta - d + 1, delta + d - 1]` intersected with the forward diagonal range `[-d, d]`: k must be in both; the loop over k handles the forward side ✓ condition handles the reverse side ✓.

Now, the verification loop indexes `a[a0 + t] != b[b0 + t - k]` — t from x1 to x2-1 ✓ diagonal k pairs ✓.

Also, potential performance: `vf = [-1] * (2*size + 7)` per `_middle_snake` call — allocation O(size) per call; Σ over calls ≤ O((N+M) · #calls)... #calls ≤ 2·D+2? Each `_diff` call either terminates or spawns 2; total calls ≤ 2·(number of splits) + 1 ≤ 2·D + 1. Σ allocations ≤ 2·(Σ sizes)·... each allocation is size-proportional: Σ over calls of (2·size_call) ≤ 2·(N+M)·depth ≤ 2·(N+M)·D — for the pathological 1000 case with D=2000: 8M slot-initializations ≈ 0.3s. Hmm, acceptable but wasteful. Mitigate: only the ROOT call has large size; children are smaller... in the pathological case (no common lines), children sizes shrink by ~1 each level? Actually with no common lines: D = N + M, and each split... the snake is empty, d_f ≈ d_r ≈ D/2 — sub1 gets ~half the lines. Sizes halve per level → Σ over calls of size = O((N+M)·#levels) = O((N+M)·log(D))?? No: Σ over depth-h of sizes ≤ N+M, depth ≤ log2(D)? For the no-common-lines case: D = size, splits halve D and halve sizes → depth log2(size) ✓ Σ allocations O(size · log size) ✓ fine. For the scattered-common case (20000/50): root size ~40000 — wait, after trim, the ROOT `_diff` might still be large (scattered diffs) → root allocation 2·40000 ≈ 80k slots ✓ trivial; children: each split consumes the snake and splits — with long common middles, snakes are long → sizes shrink fast ✓. OK, allocations fine.

Also the `limit` bound: `size // 2 + 2` — hmm for the odd case: d_max = (D_true+1)/2 ≤ (size+1)/2 → size//2 + 1 suffices... +2 slack ✓.

Let me now write the final code carefully, with performance-minded details:

- Local variable binding inside `_middle_snake` for `vf, vr, a, b, a0, b0, a1, b1, off`.
- The `for k in range(...)` loops: fine.

One more think about `odd` as int vs bool: `delta & 1` → int; use as boolean ✓.

Let me also double check the forward check range computation: `klo = delta - d + 1; khi = delta + d - 1` — at d=0: klo = delta+1 > khi = delta-1 → condition `klo <= k <= khi` false ✓ (noVR check) ✓.

Now, wait — I want to double-check the even-case check range `-d <= k <= d`: at reverse step d, k ranges [delta-d, delta+d]; the intersection with [-d, d]: need `k >= -d` and `k <= d` explicitly ✓ as coded.

Let me trace ONE more complete example through the whole pipeline to be safe: a = ["x","a","b","z"], b = ["a","b"] (N=4, M=2, delta=2, even). Expected minimal: "-x", "=a", "=b", "-z" (D = 2).

diff_lines: sets intersect ("a","b") → no fast path. _diff(0,4,0,2): trim prefix: a[0]="x" vs b[0]="a" no. trim suffix: a[3]="z" vs b[1]="b" no. Neither empty → _middle_snake(0,4,0,2): n=4, m=2, delta=2, even, size=6, off=9, vf=[-1]*19, vr=[7]*19 (sentinel size+1=7). vf[10]=0; vr[off + delta - 1] = vr[9+1]=vr[10] = 4. 

d=0: forward k=0: ki=9: k==-d ✓ → x=vf[10]=0, y=0; ax=0, by=0: a[0]="x" vs b[0]="a" no. x=0. vf[9]=0. odd? no. reverse: rlo=2, rhi=2: k=2: ki=11: k==rhi ✓ → x=vr[10]=4, y=4-2=2; ax=4, by=2: slide: ax>0, by>0: a[3]="z" vs b[1]="b" no. x=4. vr[11]=4. even check: -0<=2<=0? no. d=1.

d=1: forward k=-1: ki=8: k==-d ✓ → x=vf[9]=0, y=0-(-1)=1; ax=0, by=1: a[0]="x" vs b[1]="b" no. vf[8]=0. check: klo=delta-d+1=2, khi=delta+d-1=2: k=-1 not in [2,2] skip. k=1: ki=10: k==d ✓ → x=vf[9]+1=1, y=0; ax=1, by=0: a[1]="a" vs b[0]="a" ✓ → ax=2,by=1: a[2]="b" vs b[1]="b" ✓ → ax=3, by=2: by<b1? b1=2 → stop. x = ax - a0 = 3. vf[10]=3. check: k=1 in [2,2]? no. reverse: k ∈ {1, 3}: k=1: ki=10: k==rhi(3)? no; k != rlo(1)? k==1 → false → else: x = vr[11] - 1 = 3; y = 3-1 = 2; ax=3, by=2: slide: ax>0, by>0: a[2]="b" vs b[1]="b" ✓ → ax=2, by=1: a[1]="a" vs b[0]="a" ✓ → ax=1, by=0: by>0? no. stop. x=1. vr[10]=1. even check: -1<=1<=1 ✓; vr[10]=1 <= vf[10]=3 ✓ → overlap! x2 = vf[10] = 3, y2 = 3-1 = 2; verify: t = x(=1) to x2(=3): pairs (1, 1): a[1]="a" vs b[0+1-1=b0+0]="a" ✓; (2,2): a[2]="b" vs b[1]="b" ✓; t reaches 3 == x2 ✓. Return (a0 + 1, b0 + 1, a0 + 3, b0 + 2) = (1, 1, 3, 2). 

Wait — the snake from (x1,y1) = vr point = (1, 1) to (x2,y2) = (3, 2): relative. Absolute (1,1,3,2). Snake lines: a[1..2] = "a","b" ✓ pairs (1,1),(2,2): a[1] vs b[0+... let me recheck via the emit loop: x1=1, x2=3: emits a[1]="a" (with y1=1: b[1]="a" ✓ match), a[2]="b" (b[2]?? y increments alongside — in the emit loop I only advance x1 and emit a[x1]; correctness relies on a[x1..x2) == b[y1..y2) pairwise ✓ verified). ✓.

Split: sub1 = a[0:1] × b[0:1] = ["x"] × ["a"]: trim: no; suffix: no; both non-empty → _middle_snake(0,1,0,1): n=1,m=1,delta=0,even,size=2,off=5: vf[6]=0, vr[4]=1. d=0: fwd k=0: x=vf[6]=0,y=0: "x" vs "a" no; vf[5]=0. rev k=0: x=vr[4]=1, y=1; slide: a[0]="x" vs b[0]="a" no; vr[5]=1. check: 0<=0<=0 ✓: vr[5]=1 <= vf[5]=0? no. d=1: fwd k=-1: x=vf[5]=0, y=1; ax=0,by=1: by < b1=1? no → stop. vf[4]=0. check range [0,0]: k=-1 no. k=1: x=vf[5]+1=1, y=0; ax=1: ax<a1=1? no. vf[6]=1. check: k=1 in [0,0]? no. rev k ∈ {-1, 1}: k=-1: ki=4: k==rhi(1)? no; k != rlo(-1)? false → else: x = vr[5] - 1 = 0; y = 0 - (-1) = 1; ax=0: ax > a0? no. vr[4]=0. check: -1<=-1<=1 ✓: vr[4]=0 <= vf[4]=0 ✓ → overlap: x2 = vf[4] = 0, y2 = 0 + 1 = 1; verify: t = x = 0 to x2 = 0: empty ✓. Return (0, 1, 0, 1) — empty snake at (0,1) rel → absolute (0,1,0,1). Split: sub1 = a[0:0] × b[0:1] → base: b-side → "+a" ✓; snake empty; sub2 = a[0:1] × b[1:1] → base: "-x" ✓. Output so far: "+a", "-x". Then snake emits: a[1..2]: "=a", "=b". Then sub2 = a[3:4] × b[2:2] → "-z". Total: "+a", "-x", "=a", "=b", "-z". Check: "-" items in order: "x", "z" = a ✓. "+" items: "a" = b ✓. "=" count: 2 = LCS ✓. Minimal D = 3 ✓ (2 + 1... total items 5 = D + 2·LCS ✓). 

Now — order of "+a" before "-x": the script must satisfy: taking "=" and "-" gives a ✓; "=" and "+" gives b ✓. Interleaving in output: "+a","-x","=a","=b","-z" ✓ fine.

Now, performance review of `_middle_snake` inner loops — let me write them tightly:

```python
def _middle_snake(a, b, a0, a1, b0, b1):
    n = a1 - a0
    m = b1 - b0
    size = n + m
    delta = n - m
    odd = delta & 1
    off = size + 3
    vf = [-1] * (2 * size + 7)
    vr = [size + 1] * (2 * size + 7)
    vf[off + 1] = 0
    vr[off + delta - 1] = n
    d = 0
    limit = (size >> 1) + 2
    while d <= limit:
        # forward
        if odd:
            klo = delta - d + 1
            khi = delta + d - 1
            for k in range(-d, d + 1, 2):
                ki = off + k
                if k == -d or (k != d and vf[ki - 1] < vf[ki + 1]):
                    x = vf[ki + 1]
                else:
                    x = vf[ki - 1] + 1
                ax = a0 + x
                by = b0 + x - k
                while ax < a1 and by < b1 and a[ax] == b[by]:
                    ax += 1
                    by += 1
                x = ax - a0
                vf[ki] = x
                if klo <= k <= khi and vr[ki] <= x:
                    x1 = vr[ki]
                    t = x1
                    tt = t - k  # b index rel
                    while t < x:
                        if a[a0 + t] != b[b0 + t - k]:
                            break
                        t += 1
                    if t == x:
                        return (a0 + x1, b0 + x1 - k, a0 + x, b0 + x - k)
        else:
            for k in range(-d, d + 1, 2):
                ... same without the check ...
        # reverse
        ...
```

Duplicating the forward loop for odd/even to hoist the check — code duplication; alternatively keep the check inside with `if odd and ...` — the `odd` test per iteration is cheap. Keep single loop with `if odd and klo <= k <= khi and ...` where klo/khi default to something when even (e.g. klo=1, khi=0 → always false) — avoids per-iter `odd` test: set `klo, khi = (delta - d + 1, delta + d - 1) if odd else (1, 0)` before the loop ✓.

Similarly reverse check: `if not odd and -d <= k <= d and ...` → precompute `clo, chi = (-d, d) if not odd else (1, 0)` ✓.

The verify loops: only executed on candidate return — fine.

Now — the outer `while d <= limit` with fallback None ✓.

Let me reconsider `limit` once more for safety in an edge: size = 0? Can't happen (both non-empty post-trim → size ≥ 2). ✓.

Now the driver with explicit stack:

```python
def diff_lines(a, b):
    out = []
    if a and b:
        common = set(a)
        common.intersection_update(b)
        if not common:
            for s in a:
                out.append(("-", s))
            for s in b:
                out.append(("+", s))
            return out
    stack = [(0, len(a), 0, len(b))]
    while stack:
        task = stack.pop()
        if len(task) == 2:
            out.append(task)
            continue
        _, a0, a1, b0, b1 = task
        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0]))
            a0 += 1
            b0 += 1
        tail = []
        while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
            a1 -= 1
            b1 -= 1
            tail.append(("=", a[a1]))
        if a0 == a1:
            while b0 < b1:
                out.append(("+", b[b0]))
                b0 += 1
        elif b0 == b1:
            while a0 < a1:
                out.append(("-", a[a0]))
                a0 += 1
        else:
            snake = _middle_snake(a, b, a0, a1, b0, b1)
            if snake is None:
                while a0 < a1:
                    out.append(("-", a[a0]))
                    a0 += 1
                while b0 < b1:
                    out.append(("+", b[b0]))
                    b0 += 1
            else:
                x1, y1, x2, y2 = snake
                stack.append(("d", x2, a1, y2, b1))
                i = x2 - 1
                while i >= x1:
                    stack.append(("=", a[i]))
                    i -= 1
                stack.append(("d", a0, x1, b0, y1))
        out.extend(tail)
    return out
```

Hmm — `out.extend(tail)` placement: tail must be emitted after the middle content of THIS segment. But with the stack, the middle content (sub1/snake/sub2) is emitted in later iterations — and `out.extend(tail)` runs IMMEDIATELY, before the subs are processed! BUG. The tail must come after the subs' output. Fix: push the tail onto the stack too (as "=" items, reversed), before pushing sub2... order: pop sequence must be: sub1-items, snake-items, sub2-items, tail-items. Push order (reverse): tail first, then sub2, then snake items (reversed), then sub1:

```python
                stack.append(("d", x2, a1, y2, b1))  # wait—push order: last pushed = first popped
```

Desired pop order: sub1, snake..., sub2, tail. Push in reverse: tail (as "=" items in reverse order), then sub2, then snake items reversed, then sub1:

```python
            else:
                x1, y1, x2, y2 = snake
                # push in reverse pop-order
                i = len(tail) - 1
                while i >= 0:
                    stack.append(tail[i])
                    i -= 1
                stack.append(("d", x2, a1, y2, b1))
                i = x2 - 1
                while i >= x1:
                    stack.append(("=", a[i]))
                    i -= 1
                stack.append(("d", a0, x1, b0, y1))
```

And base cases emit directly (they're terminal) ✓ — but the tail for base cases: `out.extend(tail)` after the base emissions ✓ correct there (base emissions are this segment's middle; tail follows ✓). Also for the fallback (snake None): emissions then tail ✓.

Wait, also for base cases I emit directly and then extend tail ✓ order fine.

Hmm, but hold on — the fallback/base emission happens immediately at pop time, while OTHER stack tasks (from ancestors) may interleave... The stack discipline: when we pop a task and emit directly, those emissions go to `out` at the right position? Let's verify the invariant: the output should be the concatenation over pop-sequence of each task's contribution. Task contributions: sub1's full script (which unfolds recursively via stack, appearing contiguously ✓ because all its subtasks get pushed and popped before the subsequently-pushed items — since we push [tail-rev, sub2, snake-rev, sub1] and pop sub1 first: sub1's expansion pushes its own items ON TOP of sub2/snake/tail → they're processed before them ✓ contiguous ✓). Then snake items ✓, then sub2 ✓, then tail ✓. ✓ The invariant holds: the stack behaves exactly like recursion ✓.

Also — 2-tuple `("=", line)` vs 5-tuple `("d", ...)`: dispatch `len(task) == 2` ✓.

Memory/perf: stack of snake items — total snake items across all pushes ≤ total `=` emissions ≤ N + M... no — snake lines are emitted once per split; each line is in at most one snake ✓ total ≤ min(N, M) ✓ fine.

Now — double-check `_diff`'s trimming cost when tasks pop: each trim walks matched lines and removes them from the range ✓ each line trimmed at most once globally? A prefix-trimmed line is excluded from all future tasks ✓; a tail-trimmed line likewise ✓. But trimming ALSO re-compares... the trim loop stops at the first mismatch; the comparisons performed: matched lines (once each globally ✓) + 1 failed comparison per end per task. Number of tasks ≤ 2·#splits + 1 ≤ 2D + 1... for D = 2000: 4001 tasks × ~4 failed comparisons — trivial ✓.

Now — is `D` bounded by... number of splits: each split strictly reduces line count? Shown: both subs non-empty ⇒ each sub has < total lines ✓ so #splits ≤ #lines ✓ but D-wise ≤ D_true... whatever, fine.

Now — one more critical review of `_middle_snake`'s use in the 20000-scattered case: root task size ~40000 → vf/vr lists of 2·size+7 ≈ 80k ints each ✓ trivial. The DP: d up to ~50; snake slides through big common regions — per (d,k) up to O(common length): total ≤ 2·(Σ_{d≤50} 2d)·(avg slide)... bounded by O(size · D) = 4M slide-steps worst case. Each slide step: `ax < a1 and by < b1 and a[ax] == b[by]` — 2 comparisons + index... ~0.2μs → 0.8s worst. Probably real cases much better (slides only happen where snakes exist). Acceptable.

Hmm — actually, wait: can I reduce the redundant snake sliding with a classic trick? There's the "Myers with run-time bounded" — skip. It's fine.

Now — one more potential correctness trap in `_middle_snake`: the `vr` sentinel `size + 1` — must exceed any real x (≤ n ≤ size) ✓; but also used in the RECURRENCE reads? Shown: no sentinel reads in recurrence ✓ only in checks ✓. Similarly vf sentinel -1 only in checks ✓... wait, vf is READ in the recurrence: `vf[ki+1]`, `vf[ki-1]` — proven all reads hit written slots ✓. But careful at `d = 1`, `k = -1`: reads `vf[ki + 1] = vf[off + 0]` — written at d=0 ✓. And at d=1, k=1: reads vf[ki - 1] = vf[off+0] ✓. ✓.

Also `vr` recurrence reads at d=1: k = delta ± 1: k = delta - 1: branch: k == rhi (delta+1)? no; k != rlo (delta-1)? false → else: reads vr[ki + 1] = vr[delta] — written at d=0 ✓. k = delta + 1: k == rhi ✓ → reads vr[ki - 1] = vr[delta] ✓. ✓.

Now — what about `delta - 1` seed colliding with the even-check read `vf[ki]`? Different arrays ✓.

Edge: delta could be negative; `vr[off + delta - 1]` — off + delta - 1 ≥ off - size - 1 = 2 ≥ 0 ✓ (off = size + 3). Max index: off + size + 2 = 2·size + 5 < 2·size + 7 ✓. Forward k max = limit ≤ size/2 + 2 << size ✓; reverse k max = delta + d ≤ |delta| + size/2 + 2 ≤ 1.5·size + 2 → index ≤ off + 1.5·size + 2 = 2.5·size + 5?? That EXCEEDS 2·size + 7 when size > ~4?? Let me recompute: |delta| + d: d ≤ size/2 + 2, |delta| ≤ size → |k| ≤ 1.5·size + 2 → index ≤ off + 1.5·size + 2 = 2.5·size + 5. Array size 2·size + 7 insufficient for size ≥ 4?! Wait — but d never actually reaches `limit` for large |delta|: d stops at (D_true ± 1)/2 where D_true ≥ |delta|... d ≤ (D_true + 1)/2; D_true can be up to size (when |delta| ≈ size... if |delta| = size then min(n,m) = 0 — excluded (both non-empty) → |delta| ≤ size - 2... D_true ≥ |delta| and D_true ≤ size; d ≤ (D_true+1)/2 ≤ (size+1)/2. Then |k| ≤ |delta| + d ≤ (size - 2) + (size + 1)/2 + ... hmm: |delta| + d where d ≤ (D_true+1)/2 and |delta| ≤ D_true: |k| ≤ D_true + (D_true+1)/2 ≤ 1.5·size + 1. Index ≤ off + 1.5·size + 1 = 2.5·size + 4 > 2·size + 6 for size > 2. INSUFFICIENT. Let me redo the bound properly: k on diagonal at reverse step d: k ∈ [delta - d, delta + d]; max |k| = |delta| + d. With d ≤ (D_true + 1)/2 ≤ (size + 1)/2 and |delta| ≤ min... |delta| = |n - m| ≤ size - 2 (both ≥ 1). Worst: |delta| = size - 2 (m = 1), d ≈ (D_true+1)/2 ≈ (size - 2 + 1 + 1)/2 = size/2 → |k| ≈ 1.5·size. So size arrays at `2.5·size` needed? That's still fine memory-wise; just set array size `3 * size + 16` and `off = 1.5 * size + 8`? Let me be exact: max |k| ≤ |delta| + (D_true + 1)//2 ≤ (size - 2) + (size + 2)//2 ≤ size - 2 + (size + 2)/2 = 1.5·size + ... let me just allocate `(3 * size + 24)` slots with `off = (3 * size) // 2 + 12`. For size = 40000: 120k slots × 2 arrays × 8B ≈ 2MB ✓ fine. Actually simpler: `off = size + (size >> 1) + 12; arrsize = 3 * size + 24` ✓ covers |k| ≤ 1.5·size + 11 ✓.

Hmm wait, actually also the FORWARD array vf: k ∈ [-d, d], |k| ≤ d ≤ (size+1)/2 + 1 — much smaller, but sharing the same offset is fine (just allocate both big).

Double-check: `off + k` for k = -(1.5·size + 2): ≥ off - 1.5·size - 2 = 10 ≥ 0 ✓; max: off + 1.5·size + 2 = 3·size + 14 < 3·size + 24 ✓.

Sentinel init cost: 2 × 3·size per call — Σ over calls: sizes shrink... root 240k slot-inits for size 40000 ≈ 2ms ✓; children smaller. In the pathological no-common-lines case: sizes halve per level: Σ 3·size·(1 + 1/2 + 1/4 + ...) ≈ 6·size ≈ 240k... wait that's just the root-dominated geometric sum ≈ 2× root ≈ 5ms ✓.

Hmm, but actually in the pathological case does the split really halve? d_f = ceil(D/2)-ish → sub1 gets D1 = d_f... the subproblem SIZES: sub1 = (a-prefix of length x1, b-prefix y1) — sizes aren't directly D-proportional... but Σ over depth ≤ N+M ✓ and depth ≤ D... in the worst theoretical case Σ allocations = O(size · D) = 40000·4000?? Depth ≤ D = 4000?? For the 1000-line case: D = 2000, depth ≤ 2000, Σ over depth-h of sizes ≤ 2000 → Σ allocations ≤ 2000·2000·3 = 12M slot inits ≈ 0.5-1s?? Hmm. But realistically: can depth actually approach D with sizes NOT shrinking? Each split: sub1 non-empty and sub2 non-empty; sizes: sub1_lines + sub2_lines = total - snake_len ≤ total. If snake_len = 0: sub sizes sum ≈ total; depth could be O(D) with Σ_depth sizes ≈ total per depth → Σ = total · depth. With total = 2000, depth ≤ ??? — depth bounded by: each split has D1, D2 ≥ 1 and D1 + D2 = D → depth ≤ D/2? Actually depth ≤ D (each level ≥ 1 D-unit consumed per... each split consumes D1 + D2 = D_parent with both ≥ 1 → depth ≤ D). Worst Σ ≈ 2000 total-lines × 2000 depth = 4M... but can both sub-problems be NON-trivial with D1 = 1, D2 = D - 1 repeatedly? That'd make depth ~D with sizes barely shrinking. Possible in adversarial inputs. 4M list-init slots ≈ 0.2s (list repetition is fast C-level) ✓ plus the per-call Python overhead of ~4000 calls ✓ fine. OK.

Actually hmm, wait: in the pathological no-common-lines case: D = n + m = 2000, depth: each split D1 + D2 = 2000... root split d_f ≈ 1000 → both subs ~D/2 → depth ~log2(2000) ≈ 11 → Σ allocations ≈ 2000·(1+2+4+...+1024)·... Σ over depth-h of SIZES ≤ 2000 → Σ ≤ 2000 · 11 = 22k × 3 = 66k slots ✓ trivial. The scary depth scenario needs long snakes (empty D-reduction) — but long snakes shrink sizes! There's a tension: to have many depth levels with large sizes you need... each level consumes snake lines; Σ over depth of sizes ≤ total·depth but sizes at depth h sum ≤ total (disjoint tiling) — the tiling argument: at depth h, subranges are disjoint ✓ so Σ_depth-h sizes ≤ total ✓. So Σ allocations ≤ 3·total·depth; depth ≤ D... for depth to be large, splits must be lopsided (D1 = 1); lopsided splits happen when the middle snake sits at the edge — then one sub is tiny. Sizes still tile-disjoint per depth. Depth ≤ D = 2000 worst → Σ ≤ 3·2000·2000 = 12M slot-inits ≈ 0.3s ✓ OK. Plus per-(d,k) work Σ... at depth h, each node's DP costs O(D_node² + snakes·D_node)... Σ over depth-h of D_node = D ✓ (D-value bookkeeping: each node's D = Σ children D) → Σ over depth-h of D_node² ≤ max D_node · Σ D_node ≤ D·... hmm ≤ D · D? per depth: Σ D_node² ≤ (max node D) · Σ D_node ≤ D · D?? no: Σ D_node = D at each depth ✓ and max D_node ≤ D → Σ D_node² ≤ D² per depth × depth levels → O(D³)?? For D=2000: 8·10^9?? That can't be right — oh wait: Σ over depth-h of D_node² : Σ D_node = D, and each D_node ≤ D/2^h? NO — lopsided splits break the halving. Hmm: but lopsided split (D1 = 1, D2 = D-1) means the middle snake had d_f = 1?? The middle split is the BALANCED one: d_f = ceil(D_true/2)! The theory's middle snake has d_f ≈ d_r ≈ D/2 (that's the whole point — "middle" snake). So D1 ≤ d_f ≈ D/2, D2 ≤ d_r ≈ D/2 → halving ✓ depth ≤ log2(D) ✓ Σ D_node² over depth-h ≤ Σ (D/2^h)² ... fine — total DP work O(D²) overall-ish for balanced splits?? The classical bound: the linear-space algorithm is O(N·D) total — dominated by snake sliding, and Σ over nodes of D_node² ≤ Σ_depth (D/2^h)² · 2^h = D²·Σ 2^{-h} = 2D² ✓. Good: total DP diagonal-iterations ≈ 2·D² = 8M for D=2000?? Hmm: 2·D² = 8M inner iterations for the pathological case ≈ 2-4s?? Hmm wait: Σ over nodes of D_node² where the ROOT costs D²/4 (loop to d = D/2: Σ_{d≤D/2} 2·(2d) ≈ D²/2)... let me recompute root cost: iterations at step d ≈ 2·(d+1)·2(forward+reverse) ≈ 4d; Σ_{d=0}^{D/2} 4d ≈ 4·(D/2)²/2 = D²/2 = 2M for D = 2000. Children: 2·(D/2)²/2 = D²/4 total... Σ over levels: D²/2 + D²/4 + ... = D² ≈ 4M inner iterations for the pathological 1000-line case. At ~0.25μs/iter (optimistic) → 1s; at 0.5μs → 2s. Within the 6s budget ✓ (with the disjoint-set fast path, this case likely doesn't even arise).

For the 20000/50-scattered case: root D ≈ 100 → root cost ≈ 100²/2 = 5000 iterations + snake slides O(size·D) = 20000·100 = 2M slide-steps ≈ 0.4-1s; children tiny. ✓ Under 2s probably. Hmm, the 2M slide bound: slides happen per (d, k) crossing common regions... total slide work bounded by (number of (d,k) pairs that reach into common regions) × (region lengths). Rough upper bound (N+M)·D/2·2 = 4M ✓ ~1s worst. Fine.

One more micro-optimization for slides: bind `A = a; B = b` locally ✓ and avoid attribute lookups ✓.

Also — the check `ax < a1 and by < b1` per slide iteration: could hoist by computing the max slide via... keep simple.

Now — final review of the odd-case check semantics once more (this is THE critical correctness bit). Let me re-verify with a slightly bigger hand example where the middle snake is interior. a = "cab", b = "ab" (N=3, M=2, delta=1, odd). Optimal: "=a","=b","-c"? in some order: delete 'c': "-c" then "=a","=b" — D=1. Let me run: _diff(0,3,0,2): trim prefix: "c" vs "a" no; suffix: a[2]="b" vs b[1]="b" ✓ → tail=[("=", "b")], a1=2, b1=1; again: a[1]="a" vs b[0]="a" ✓ → tail += ("=","a"), a1=1, b1=0; loop ends (b1 == b0). Now a0=0 < a1=1, b0=0 == b1 → base: emit "-" for a[0:1] = "-c"; then tail ✓. Output: "-c", "=a", "=b" ✓ minimal. (Never reached the DP ✓ trimming did it.)

Example forcing interior snake: a = "xayb", b = "xyb"?? Let me do a = ["x","a","y","b"], b = ["a","b"]: delta = 2, even. trim: a[0]="x" vs b[0]="a" no; suffix: a[3]="b" vs b[1]="b" ✓ tail=[=b], a1=3, b1=1; a[2]="y" vs b[0]="a" no. Now a[0:3]=["x","a","y"], b[0:1]=["a"]: trim prefix: "x" vs "a" no; suffix: a[2]="y" vs b[0]="a" no. Both non-empty. _middle_snake(0,3,0,1): n=3, m=1, delta=2, even, size=4, off=4+6=10? off = size + size/2 + 12 = 4+2+12=18; arrays 3·4+24=36. vf[19]=0, vr[off+delta-1]=vr[19]=3. d=0: fwd k=0: x=vf[19]=0, y=0: a[0]="x" vs b[0]="a" no. vf[18]=0. rev: rlo=rhi=2: k=2: x=vr[19]=3, y=1; slide: ax=3: ax<a1=3? no → wait slide condition: `ax > a0 and by > b0 and a[ax-1]==b[by-1]`: ax=3>0, by=1>0: a[2]="y" vs b[0]="a" no. vr[20]=3. even check: 0<=2<=0? no. d=1: fwd k=-1: x=vf[18]=0, y=1; by=1 < b1=1? no → x=0; vf[17]=0; check: klo=delta-d+1=2, khi=2: k=-1 no. k=1: x=vf[18]+1=1, y=0; ax=1, by=0: a[1]="a"==b[0]="a" ✓ → ax=2, by=1: by < b1=1? no. x=2. vf[19]=2. check: k=1 in [2,2]? no. rev k ∈ {1, 3}: k=1: ki=19: k==rhi(3)? no; k != rlo(1)? false → else: x = vr[20] - 1 = 2; y = 2 - 1 = 1; slide: ax=2 > 0, by=1 > 0: a[1]="a" vs b[0]="a" ✓ → ax=1, by=0: by > 0? no. x=1. vr[19]=1. even check: -1<=1<=1 ✓: vr[19]=1 <= vf[19]=2 ✓ → overlap: x2 = vf[19] = 2, y2 = 2 - 1 = 1; verify t from x=1 to 2: pair (1, 1-1=0): a[1]="a" vs b[0]="a" ✓; t=2 == x2 ✓. Return (a0+1, b0+0, a0+2, b0+1) = (1, 0, 2, 1): snake = a[1] = "a" ↔ b[0] = "a" ✓. Split: sub1 = a[0:1]×b[0:0] = ["x"] × [] → "-x"; snake: "=a"; sub2 = a[2:3]×b[1:1] = ["y"]×[] → "-y"; tail: "=b". Total: "-x","=a","-y","=b" ✓ minimal (LCS=2 ✓).

The machinery works. Now — let me also think again about whether the FIRST detected (verification-passing) overlap might not be at the theoretical d but the verification would pass for a wrong snake... I argued: a passing overlap at (d_f, d_r) with the exact parity pairing and d_f + d_r < D_true yields a full path of length < D_true — impossible. Let me make sure the passing overlap always yields a valid full path (the splice argument): verification ensures [x1, x2] on diagonal k is all-matching. Construction: is (x2, y2) (= forward point) on the reverse path? Splice validity needs: path = P_f (d_f steps to (x2,y2)) + snake... hmm — the actual split validity: I claimed sub1 = prefix before snake has optimal ≤ d_f and sub2 ≤ d_r. Sub1 = a[a0:x1]×b[b0:y1]: is there a path of length d_f from (0,0) to (x1,y1)? The forward furthest path ends at (x2, y2) — not (x1, y1)! The forward path passes through... the forward path's last snake covers [s, x2] with s ≤ x1? Hmm! The verification only ensures the segment [x1, x2] is matching — but is the segment on the forward path? The forward path reaches (x2, y2); its last snake covers [s, x2] (matching, contiguous, ending at x2). If s ≤ x1: then [x1, x2] ⊆ forward snake ✓ the forward path passes through (x1, y1) at step d_f - (x2 - x1) ✓ then sub1 optimal ≤ d_f - (x2 - x1)... and sub2 = a[x2:]×b[y2:]: the reverse furthest path reaches (x1, y1) — its last snake covers [x1, t] with t ≥ x2 (if x2 ≤ t: [x1,x2] ⊆ reverse snake ✓ the reverse path passes through (x2,y2) — path from (x2,y2) to (N,M) of length d_r ✓ sub2 optimal ≤ d_r ✓). Then total ≤ d_f - (x2 - x1) + d_r + (snake = 0 cost) ... = D_true - (x2 - x1)?? That's a full script of length < D_true — contradiction again unless x2 = x1?! Clearly something's off in my bookkeeping — OH WAIT. I see: the split DOESN'T need d_f + d_r = D_true to give total = D_true; the total is D1_opt + D2_opt + snake... the SCRIPT length = D1_opt + D2_opt (snake contributes 0 non-`=`... the snake contributes only `=` items which don't count toward D!). The minimality requirement: total script length (counting - and +) = D1_opt + D2_opt must EQUAL D_true. From the splice: D1_opt ≤ (steps of P_f up to (x1,y1)) and D2_opt ≤ (steps of reverse path from (x2,y2)); if the forward path passes through (x1,y1) at step d_f - (x2 - x1) and the reverse path passes through (x2,y2) at d_r steps remaining: total ≤ d_f - (x2-x1) + d_r = D_true - (x2 - x1) < D_true — contradiction!! So this splice CAN'T be right — meaning my splice assumptions must be wrong somewhere. The resolution: the total can't be < D_true, so actually D1_opt + D2_opt = D_true exactly and the inequalities are tight in a different way... Let me recount: if the forward path passes through (x1, y1) at step d_f - (x2 - x1)... hmm wait — actually, the forward furthest path ENDS at (x2, y2) after d_f steps. If its last snake covers [s, x2] with s ≤ x1, then the path passes through (x1, y1) at step d_f - (x2 - x1) ✓. The prefix up to (x1,y1): d_f - (x2 - x1) steps ✓. Then the snake [x1 → x2] (free) ✓. Then from (x2, y2) to (N, M): the reverse furthest path reaches (x1, y1) at... the reverse path of d_r steps ends at (x1, y1); if its last snake covers [x1, t], t ≥ x2, the path passes through (x2, y2) — the portion from (x2, y2) to (N, M): d_r steps (the snake costs 0, so from (t,·) to (N,M) is d_r... the reverse path = (N,M) →...→ (t,·) [d_r steps] →snake→ (x1,·) [0 steps]. So from (t, ·) to (N,M) = d_r steps; and (x2,y2) is inside the snake [x1, t] → from (x2,y2), slide up the snake to (t,·) [free] then d_r steps ✓. TOTAL: (d_f - (x2 - x1)) + 0 + d_r = D_true - (x2 - x1) < D_true when x2 > x1. CONTRADICTION with optimality of D_true!... unless x2 = x1?! But non-empty middle snakes with x2 > x1 obviously exist (my traces!). Where's the error?? 

AH — I see the error: the reverse furthest path reaches (x1, y1) with d_r steps — but "d_r" here is the reverse step count of the CHECK pairing; and the forward d_f. The contradiction shows: you cannot have BOTH the forward path's snake covering [x1, x2]'s low end AND the reverse path's snake covering its high end with d_f + d_r = D_true and x2 > x1... UNLESS the path through the snake has length exactly D_true — let me recount the total path: prefix (d_f - (x2-x1) steps) + snake (0) + suffix (d_r steps) = D_true - (x2 - x1). For this to equal D_true... it doesn't. So it's < D_true — contradiction — so this geometry is IMPOSSIBLE?! But my traces produced exactly this geometry (e.g. the "xayb"/"xyb" example: forward step d=1 ended at (2, 1) via snake [s=1?, 2]... let me recheck: in that trace, forward k=1: x = vf[18] + 1 = 1 → arrived at (1, 0) via a MOVE (x+1 from (0,0) on diagonal 0); then slid to (2, 1): pairs (1,0),(2,1)... wait the slide: ax went 1→2 (a[1]="a"==b[0]) — slide stopped at by=1 = b1 → x = 2, and the snake covered [1, 2) = pair (1,0) only: snake [s=1, x2=2). The reverse point x1 = 1 = s. Verification segment [x1, x2) = [(1,0)] ✓ matching. Reverse path: d_r = 1: reached (1, 0) — via: started (3,1), moved... k=1 branch else: x = vr[20] - 1 = 2: from (3,1) via x-1 → (2, 1)?? then slid down: a[1]==b[0] ✓ → (1, 0) ✓. So reverse path = (3,1) →x-1→ (2,1) →snake→ (1,0): 1 step ✓. Forward path = (0,0) →x+1→ (1,0) →snake→ (2,1): 1 step ✓. d_f + d_r = 2 = D_true ✓ (D_true: "xayb" vs "ab": LCS = 2 ("a","b"), D = 4 + 2 - 2·2 = 2 ✓). Now the split: snake [x1=1, x2=2) — non-empty! Sub1 = a[0:1]×b[0:0] ("x" vs ""): optimal D1 = 1 = d_f - (x2 - x1) = 1 - 1 = 0?? d_f = 1, x2 - x1 = 1 → d_f - 1 = 0, but D1_opt = 1 ("-x")! So my claim "forward path passes through (x1,y1) at step d_f - (x2-x1)" — the forward path: (0,0) →move→ (1,0) [step 1] →snake→ (2,1). Point (1,0) = (x1, y1) is at step 1, NOT step d_f - (x2 - x1) = 0! The error: points on the snake are NOT all at "path end minus offset" — the snake moves are FREE (0 steps), so ALL points of the snake [s, x2] are at step d_f! The path reaches (s, ·) at step d_f - 1 (the move), then snakes [s → x2] freely — every point in [s, x2] is at step d_f. So the prefix up to (x1, y1) = d_f steps (if x1 ≥ s) ✓!! That fixes the contradiction: total = d_f + d_r = D_true ✓✓. Great — so the splice: sub1 optimal ≤ d_f (prefix of forward path up to (x1,y1), valid since (x1,y1) is on the forward path at step d_f — requires x1 ≥ s i.e. x1 within the forward's last snake). And sub2 ≤ d_r requires (x2,y2) on the reverse path at d_r remaining — requires x2 ≤ t (within reverse's last snake). So the VALIDITY conditions are: x1 ≥ s AND x2 ≤ t. The verification (segment all-matching) alone doesn't guarantee these! Hmm. But the paper's theorem guarantees the found snake is a genuine middle snake (on an optimal path, splitting into d_f/d_r) — the geometric details (s, t) work out per the paper's proof. Since I can't fully re-derive the paper's proof here, rely on: (1) the paper's algorithm = what I implemented (parity pairing + furthest points), proven correct; (2) my verification guard catches non-matching segments (defensive). If the paper's algorithm is correctly implemented, the returned snake IS a valid middle snake (the paper's Lemma 3/4 prove the furthest points' connecting snake lies on an optimal path with the right split). My traces confirm. Ship it.

Hmm, wait — but one thing to double check re: (2): in the paper, is the snake defined by [reverse point → forward point] (what I return) or [forward snake's start → ...]? In my traces the returned [x1, x2] = [vr-point, vf-point] worked and was on the optimal path (e.g. last trace: snake (1,0)→(2,1) = pair "a" ✓ on the optimal path ✓ split valid ✓). In the "ac"/"bc" trace: empty snake at (0,1) — on the optimal path? Optimal paths: "-a" then "=c"?? Path: (0,0) -a→ (1,0) +b→ (1,1) =c→ (2,2) ✓ passes (0,1)? Path (0,0) +b→ (0,1) -a→ (1,1) =c→ (2,2) ✓ yes (0,1) is on an optimal path with prefix 1 step ("+b") and suffix 1 ✓ split: sub1 = a[0:0]×b[0:1] → "+b" ✓ sub2 = a[0:2]×b[1:2] → "-a","=c" ✓ total D=2 ✓. 

OK. I'm now reasonably confident. One more paranoid check of the paper's parity rule against my implementation via a case with delta odd and D_true = 3 to exercise d=2 pairing (2,1): a = "ab", b = "xay"?? N=2... let me do a = ["a","b"], b = ["x","a","y"]: N=2, M=3, delta = -1, odd. Optimal: "+x", "=a", "=b", "+y": D = 2?? LCS = 1 ("a" or "b"): D = (2 - 1) + (3 - 1) = 3. Hmm D_true = 3 = 2m+1 → m = 1, d = 2: forward step 2 vs reverse step 1. Let me run: trim: a[0]="a" vs b[0]="x" no; suffix a[1]="b" vs b[2]="y" no. _middle_snake(0,2,0,3): n=2,m=3,size=5,odd=1,off=5+2+12=19? (size + size//2 + 12 = 5+2+12=19), arrays 39. vf[20] = 0; vr[off + delta - 1] = vr[17] = 2. d=0: fwd k=0: x = 0, y = 0: a[0]="a" vs b[0]="x" no. vf[19] = 0. rev: rlo = -1, rhi = 1: k=-1: ki=18: k==rhi(1)? no; k != rlo(-1)? false → else: x = vr[19] - 1 = vr[19]... vr[off + 0] = vr[19] — written? At d=0 reverse, k=-1 processed FIRST (before k=delta=... wait order: k ∈ {-1, 1}: k=-1 first: reads vr[ki + 1] = vr[19] — has d=0 written vr[delta]=vr[19] yet? Processing order within the d=0 reverse loop: k=-1 comes before k=+1=delta! vr[19] (diagonal delta=−1?? wait delta = -1! delta = n - m = -1. So rlo = delta - d = -1, rhi = delta + d = -1?? At d=0: range {delta} = {-1} only. OK phew: k=-1 only. k == rhi ✓ (rhi = -1) → x = vr[ki - 1] = vr[18] = seed = n = 2 ✓. y = x - k = 2 + 1 = 3?? y = 2 - (-1) = 3 = M ✓ point (2, 3) ✓. Slide: ax=2 > 0, by=3 > 0: a[1]="b" vs b[2]="y" no. vr[18] = 2. even check: odd → skip ✓. d=1: fwd k=-1: ki=18: k == -d ✓ → x = vf[19] = 0; y = x - k = 1; ax=0, by=1: a[0]="a" vs b[1]="a" ✓ → ax=1, by=2: a[1]="b" vs b[2]="y" no. x=1. vf[18]=1. check: klo = delta - d + 1 = -1, khi = delta + d - 1 = -1: k=-1 in range ✓: vr[18] = 2 <= x = 1? NO. k=1: ki=20: k == d ✓ → x = vf[19] + 1 = 1; y = 0; ax=1, by=0: a[1]="b" vs b[0]="x" no. x=1. vf[20]=1. check: k=1 in [-1,-1]? no. rev d=1: k ∈ {delta-1, delta+1} = {-2, 0}: k=-2: ki=17: k == rhi(0)? no; k != rlo(-2)? false → else: x = vr[ki+1] - 1 = vr[18] - 1 = 1; y = x - k = 3; ax=1, by=3: slide: by > b0? yes but by=3 = b1 → wait slide condition: ax > a0(0) ✓, by > b0(0) ✓ → check a[ax-1]=a[0]="a" vs b[by-1]=b[2]="y" no. x=1. vr[17]=1. k=0: ki=19: k == rhi(0) ✓ → x = vr[18] = 2; y = 2; slide: a[1]="b" vs b[1]="a" no. vr[19]=2. d=2: fwd k=-2: k==-d ✓ → x = vf[18] = 1; y = 1 + 2 = 3?? y = x - k = 1 + 2 = 3 = M → slide: by < b1? by=3 = b1=3 → no. x=1. vf[17]=1. check: klo = delta - d + 1 = -2, khi = delta + d - 1 = 0: k=-2 ✓ in range: vr[17] = 1 <= x = 1 ✓ → OVERLAP: x1 = vr[17] = 1, verify segment [1, 1): empty ✓ (t=1 == x=1 immediately). Return (a0 + 1, b0 + 1 - (-2)... y1 = x1 - k = 1 + 2 = 3: (1, 3, 1, 3) — point (1,3) rel. Split: sub1 = a[0:1]×b[0:3] = ["a"]×["x","a","y"]: trim: a[0]="a" vs b[0]="x" no; suffix: a[0]="a" vs b[2]="y" no; both non-empty → recurse: n=1,m=3,delta=-2,even,size=4: DP... eventually: minimal script for ["a"] vs ["x","a","y"]: "+x","=a","+y" (D=2) ✓. Snake: empty at (1,3). sub2 = a[1:2]×b[3:3] = ["b"]×[] → "-b" ✓. tail: none. Total: "+x","=a","+y","-b" — check: "-" items: "b" = a ✓; "+" items: "x","a","y" = b ✓; "=" count 1 = LCS ✓ minimal ✓. 

The sub1 recursion: ["a"] vs ["x","a","y"] — trust the machinery (it worked on similar cases). Total = 2 + 1 = 3 = D_true ✓.

Now let me also make sure about `d` loop when odd and the check range at d=2 was [-2, 0] — reverse step 1 covered [delta - 1, delta + 1] = [-2, 0] ✓ fresh ✓ pairing (2,1) ✓ total 3 = D_true ✓.

Now finalize code. Also: `sys` not needed anymore (no recursion-limit bump — iterative). 

Also, `_middle_snake` needs `b0` etc. — all passed.

Let me write the final polished code:

```python
def diff_lines(a, b):
    out = []
    if a and b:
        common = set(a)
        common.intersection_update(b)
        if not common:
            for s in a:
                out.append(("-", s))
            for s in b:
                out.append(("+", s))
            return out
    stack = [(0, len(a), 0, len(b), 0)]  # hmm — 5-tuples with dummy? 
```

Wait, dispatch: I used 2-tuples for "=" items and 5-tuples ("d", ...) for tasks — but the initial stack entry: ("d", 0, len(a), 0, len(b)) ✓ consistent.

```python
def diff_lines(a, b):
    out = []
    if a and b:
        common = set(a)
        common.intersection_update(b)
        if not common:
            for s in a:
                out.append(("-", s))
            for s in b:
                out.append(("+", s))
            return out
    stack = [("d", 0, len(a), 0, len(b))]
    pop = stack.pop
    push = stack.append
    while stack:
        task = pop()
        if len(task) == 2:
            out.append(task)
            continue
        a0, a1, b0, b1 = task[1], task[2], task[3], task[4]
        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0]))
            a0 += 1
            b0 += 1
        tail = []
        while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
            a1 -= 1
            b1 -= 1
            tail.append(("=", a[a1]))
        if a0 == a1:
            while b0 < b1:
                out.append(("+", b[b0]))
                b0 += 1
            out.extend(tail)
        elif b0 == b1:
            while a0 < a1:
                out.append(("-", a[a0]))
                a0 += 1
            out.extend(tail)
        else:
            snake = _middle_snake(a, b, a0, a1, b0, b1)
            if snake is None:
                while a0 < a1:
                    out.append(("-", a[a0]))
                    a0 += 1
                while b0 < b1:
                    out.append(("+", b[b0]))
                    b0 += 1
                out.extend(tail)
            else:
                x1, y1, x2, y2 = snake
                i = len(tail) - 1
                while i >= 0:
                    push(tail[i])
                    i -= 1
                push(("d", x2, a1, y2, b1))
                i = x2 - 1
                while i >= x1:
                    push(("=", a[i]))
                    i -= 1
                push(("d", a0, x1, b0, y1))
    return out
```

And `_middle_snake`:

```python
def _middle_snake(a, b, a0, a1, b0, b1):
    n = a1 - a0
    m = b1 - b0
    size = n + m
    delta = n - m
    odd = delta & 1
    off = size + (size >> 1) + 12
    vf = [-1] * (3 * size + 24)
    vr = [size + 1] * (3 * size + 24)
    vf[off + 1] = 0
    vr[off + delta - 1] = n
    d = 0
    limit = (size >> 1) + 2
    while d <= limit:
        if odd:
            flo = delta - d + 1
            fhi = delta + d - 1
        else:
            flo = 1
            fhi = 0
        for k in range(-d, d + 1, 2):
            ki = off + k
            if k == -d or (k != d and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            ax = a0 + x
            by = b0 + x - k
            while ax < a1 and by < b1 and a[ax] == b[by]:
                ax += 1
                by += 1
            x = ax - a0
            vf[ki] = x
            if flo <= k <= fhi and vr[ki] <= x:
                x1 = vr[ki]
                t = x1
                tk = t - k
                while t < x:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x:
                    return (a0 + x1, b0 + x1 - k, a0 + x, b0 + x - k)
        rlo = delta - d
        rhi = delta + d
        if odd:
            clo = 1
            chi = 0
        else:
            clo = -d
            chi = d
        for k in range(rlo, rhi + 1, 2):
            ki = off + k
            if k == rhi or (k != rlo and vr[ki + 1] > vr[ki - 1]):
                x = vr[ki - 1]
            else:
                x = vr[ki + 1] - 1
            ax = a0 + x
            by = b0 + x - k
            while ax > a0 and by > b0 and a[ax - 1] == b[by - 1]:
                ax -= 1
                by -= 1
            x = ax - a0
            vr[ki] = x
            if clo <= k <= chi and vr[ki] <= vf[ki]:
                x2 = vf[ki]
                t = x
                tk = t - k
                while t < x2:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x2:
                    return (a0 + x, b0 + x - k, a0 + x2, b0 + x2 - k)
        d += 1
    return None
```

Wait — there's an issue with the `flo <= k <= fhi` check when `odd` but the forward loop for d=0: flo = delta + 1, fhi = delta - 1 → false ✓. Also when odd but `k` in range: `vr[ki]` might be the SENTINEL (size+1) if k wasn't covered by reverse step d-1 — but range ensures coverage ✓ (as argued). Still, sentinel read is safe (fails the ≤) ✓.

Even-case: `vr[ki] <= vf[ki]`: vf[ki] fresh (k ∈ [-d, d] ✓ forward wrote all its diagonals... wait — forward wrote exactly diagonals {-d, -d+2, ..., d}; the reverse loop's k has parity delta + d ≡ d (even case) ✓ and |k| ≤ d checked ✓ → k ∈ forward's written set ✓ fresh ✓.

Also the even-case check when the same diagonal gets checked... fine.

One issue: in the odd case, could the forward check fire at d where reverse step d-1 hasn't been computed at all? d=0: range empty ✓; d≥1: reverse step d-1 ≥ 0 computed ✓.

Another potential issue: `while d <= limit` — after the loop, return None. But theory says always found by d ≤ (D_true+1)/2 ≤ limit... D_true ≤ size → (D_true+1)//2 ≤ (size+1)//2 ≤ size//2 + 1 ≤ limit ✓.

Also — `odd` check inside forward loop: I hoisted via flo/fhi ✓; but there's still `if flo <= k <= fhi` per iteration — cheap.

Now — one more thing: `vr[ki] <= x` in the odd case: vr's real values ≤ n; x ≤ n ✓ fine.

Potential subtle bug: in the odd case at d, the check uses vr from step d-1, but vr ALSO contains the SEED at `off + delta - 1` — if the check range includes k = delta - 1... e.g. d=1: range [delta, delta]: k = delta ≠ delta - 1 ✓; d=2: range [delta-1, delta+1]: k = delta - 1 IS in range — and vr[delta - 1] holds the SEED (n) — is that "fresh step-1" value or stale seed? Reverse step 1 covers [delta - 1, delta + 1] — INCLUDING delta - 1 — and the d=1 reverse loop WROTE vr[delta - 1] ✓ (k = delta - 1 = rlo at d=1: branch else → x = vr[delta] - 1 ✓ real) — so the seed got overwritten ✓ fresh ✓. Phew. But wait — what if delta - 1 < ... the d=1 reverse range is [delta - 1, delta + 1] — yes includes delta - 1 ✓ overwritten ✓. Generally: check range at forward-d = reverse-(d-1) coverage exactly ✓ every k in range freshly written at reverse step d-1 ✓.

Similarly the even-case check range [-d, d] = forward-d coverage exactly ✓.

Now — the initial `("d", 0, len(a), 0, len(b))`: if a or b is empty → base cases ✓.

Test mentally: a = [], b = ["x"]: stack: task ("d",0,0,0,1): trims skipped; a0==a1 → emit "+x" ✓.

a = ["x"], b = ["x"]: fast path: common = {"x"} non-empty → DP path: task: trim prefix → "=x"; then a0==a1==1, b0==b1==1: base: a0==a1 → while b0 < b1: false → out.extend(tail) — tail empty ✓. Output: ("=","x") ✓.

Non-list inputs? Signature says list[str] ✓.

Now, one more perf thought: `len(task) == 2` per pop — fine.

Also the `tail` handling in base cases: I put `out.extend(tail)` inside each branch ✓; make sure every path extends tail exactly once ✓ (the else-branch with snake pushes tail items ✓; fallback extends ✓).

Let me also reconsider the fast-path condition: `if a and b:` — if either is empty, skip (DP handles ✓). But ALSO: what if a and b are equal? common non-empty → DP: root task trims everything → done in O(N) ✓.

What about a = ["a","b","a"], b = ["a","a"]? LCS = 2 ("a","a"). Run: sets intersect ✓. Root: trim prefix: a[0]="a"==b[0]="a" → "=a"; a0=1,b0=1: a[1]="b" vs b[1]="a" no. Suffix: a[2]="a" == b[1]="a" ✓ tail=[("=","a")], a1=2, b1=1; a[1]="b" vs b[0]="a" no. Now a[1:2]=["b"], b[1:1]=[]: base: b0==b1 → "-b", tail "=a". Total: "=a","-b","=a" ✓ minimal ✓.

Now — think about whether the odd-case forward check should ALSO be mirrored (checking in the reverse pass with pairing (d-1, d))? For odd delta, D_true odd: splits (d_f, d_r) with d_f + d_r = D_true: the paper's approach checks (d, d-1) in the forward pass — covers split (m+1, m). The mirror split (m, m+1) would be checked in the reverse pass pairing reverse-(d) with forward-(d-1)... but forward-(d-1) values were OVERWRITTEN by forward-d (same array) — can't check after the fact without snapshots. The paper's single check suffices (lemma guarantees the (m+1, m) overlap) ✓.

Similarly even: (m, m) checked in reverse pass ✓ (forward-m values still current ✓).

Double-check the even-case lemma applicability: D_true = 2m; need overlap between forward-m and reverse-m furthest points — from the optimal path at position m: point Q (diagonal k, k ≡ m mod 2 ✓ in range ✓): VF[k] ≥ x_Q (forward furthest ≥ any m-path point ✓) and VR[k] ≤ x_Q (reverse furthest = MIN x ≤ any reverse-m-path point on k... the optimal path's suffix from Q is a reverse m-path reaching x_Q ⇒ VR[k] ≤ x_Q ✓). Overlap condition `VR[k] ≤ VF[k]` ✓ fires ✓. And the returned snake [VR[k], VF[k]] ⊇ [x_Q...]... the paper's proof shows the connecting segment is a valid middle snake ✓.

Odd-case lemma: D_true = 2m+1; optimal path at position m+1: Q on diagonal k, k ≡ m+1 (mod 2); VF (step m+1) [k] ≥ x_Q ✓; reverse step m: k must satisfy k ≡ delta + m (mod 2): delta odd ⇒ delta + m ≡ 1 + m ≡ m + 1 ✓ same parity ✓ and |k - delta| ≤ m ✓ in reverse-m range ✓: VR[k] ≤ x_Q ✓ → check fires at d = m+1 ✓ (k in [delta - (d-1), delta + (d-1)] = [delta - m, delta + m] ✓ |k - delta| ≤ m ✓).

Great. And no earlier firing (with passing verification): argued via contradiction (a passing overlap at (d, d-1), d < m+1 constructs a path of length ≤ 2d - 1 < D_true — wait, need the splice validity (x1 within forward snake etc.) — the paper's construction handles it; my contradiction argument assumed the splice works; if the geometry were weird the verification might pass while the splice fails?? The verification only checks segment matching. Hmm — could there be a "passing but splice-invalid" overlap at d < m+1? The splice needs: (x1,y1) on the forward path (within its last snake) and (x2,y2) on the reverse path (within its last snake). Suppose verification passes but (x1,y1) is NOT on the forward path (forward's last snake starts above x1): then... the paper's Lemma (I recall it as Lemma 3 in the paper: "the middle snake is the snake whose endpoints are the furthest reaching points") — the paper's proof establishes that when the overlap occurs under the algorithm's conditions, the snake between the furthest points IS the middle snake (endpoints on the respective paths). I'll trust it — implemented identically in countless implementations (e.g., the canonical psuedocode in Myers' Fig. 5? and in "gmyers"...). Plus my verification guard. Plus the ultimate safety: even if a rare suboptimal/odd result emerged, the constraints (equals/-/+ consistency) still hold structurally (the tiling is always consistent!) — minimality could only be affected, never correctness of the reconstruction. Structural correctness is guaranteed by construction (subs tile the ranges; snake verified matching) ✓. 

Now — performance polish on `_middle_snake`: hoist `a0`, `b0`, `a1`, `b1`, `a`, `b` — they're already locals (parameters) ✓. The lists vf, vr local ✓. Range objects per d ✓.

One more: the `while d <= limit` — `limit` computed once ✓.

Also — potential pathological recursion in the DRIVER stack: bounded ✓.

Let me also double check `_middle_snake` when `n` or `m` is... both ≥ 1 guaranteed by caller ✓ (post-trim both non-empty). delta - 1 index: off + delta - 1: delta ≥ 1 - ... delta = n - m ∈ [1 - m, n - 1] ⊡ [-size + 2, size - 2]... |delta - 1| ≤ size → index ∈ [off - size - 1, off + size - 2] = [0.5·size + 11 - ... fine within bounds ✓.

Now, the `3 * size + 24` sizing: max |k| = |delta| + d ≤ (size - 2) + ((size + 1) // 2 + ... d max = limit = size//2 + 2 → |k| ≤ size - 2 + size//2 + 2 = size + size//2 = 1.5·size → index max = off + 1.5·size = 3·size + 12 < 3·size + 24 ✓; index min = off - 1.5·size = 12 ≥ 0 ✓. ✓.

Hmm wait, d max in the loop is `limit = size//2 + 2`, and k can be ± that: |k| ≤ 1.5·size + 2 → index ≤ off + 1.5·size + 2 = 3·size + 14 < 3·size + 24 ✓; min index = off - 1.5·size - 2 = 10 ≥ 0 ✓.

Final check of the even-case check range vs k bounds: `clo, chi = -d, d` ✓ within loop's k range anyway (k ∈ [delta-d, delta+d] — k could exceed ±d! e.g. delta=5, d=1: k ∈ {4, 6}: check range [-1,1] → no k qualifies ✓ correct: forward step 1 covers {-1,1} only ✓).

I think the code is correct. Let me also run through the very first example family once more quickly — "ab" vs "b" gave "-a","=b" ✓ (traced).

Let me now also handle a subtle thing: `task[1], task[2], task[3], task[4]` unpack — fine; or `_, a0, a1, b0, b1 = task` ✓ cleaner.

Also — `if len(task) == 2` — the "=" items are 2-tuples ✓ tasks are 5-tuples ✓.

One more perf improvement: in the driver, base-case loops use indexing with increment — use `out.extend` with generator over slices: `out.extend(("+", s) for s in b[b0:b1])` — slicing copies but extend is fast; similar for "-". I'll use slice-based extends for speed:

```python
        if a0 == a1:
            out.extend(("+", s) for s in b[b0:b1])
            out.extend(tail)
        elif b0 == b1:
            out.extend(("-", s) for s in a[a0:a1])
            out.extend(tail)
```

✓.

Also the fast-path: `set(a).intersection(b)`? I wrote common.intersection_update(b) — equivalent ✓. Actually `set(a).isdisjoint(b)` is cleaner and short-circuits:

```python
    if a and b and set(a).isdisjoint(b):
        ...
```

`isdisjoint` may short-circuit ✓ nice.

Final assembly. Also add a module docstring? Keep it minimal — the instructions say only the code. I'll include brief comments.

One more look at the verification loops for the odd case:

```python
            if flo <= k <= fhi and vr[ki] <= x:
                x1 = vr[ki]
                t = x1
                tk = t - k
                while t < x:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x:
                    return (a0 + x1, b0 + x1 - k, a0 + x, b0 + x - k)
```

x1 ≤ x ✓ (vr[ki] ≤ x ✓). ✓. And even case:

```python
            if clo <= k <= chi and vr[ki] <= vf[ki]:
                x2 = vf[ki]
                t = x
                ...while t < x2...
                if t == x2:
                    return (a0 + x, b0 + x - k, a0 + x2, b0 + x2 - k)
```

x ≤ x2 ✓ (vr ≤ vf ✓). ✓.

Wait — in the even case, x1 = x (the reverse point, relative) and the returned tuple's first two = (a0 + x, b0 + x - k) ✓ = reverse point ✓; last two = forward point ✓.

Also, hmm: in the even case the check `vr[ki] <= vf[ki]` — vr[ki] is the just-written x ✓.

Also potential: `vr[ki] <= vf[ki]` where vf[ki] = -1 (absent)? k ∈ [-d, d] ⇒ vf[ki] fresh ✓ — but wait: is EVERY k in [-d, d] with parity d written by forward-d? Forward wrote k ∈ {-d, -d+2, ..., d} ✓ and reverse k at step d has parity delta + d ≡ d (even) ✓ and -d ≤ k ≤ d ✓ ⇒ written ✓.

Edge: what if `delta` even but the reverse loop's k range is empty?? range(rlo, rhi+1, 2) with rlo = rhi at d=0: {delta} ✓ non-empty ✓.

I'm fairly confident now. Let me also do a final performance sanity check of the DP inner loop cost for the 20000-scattered case: the root `_middle_snake` with size ≈ 40000, d up to ~50: per d: forward loop ~2d+1 iterations ≈ 100, reverse same; ×50 d's × 2 = ~20000 outer iterations, each with a slide of avg... slides through common regions: the common middle (~20000 lines) gets slid per relevant (d,k): worst-case each (d,k) pair whose path can reach the common region slides through chunks — total bounded by Σ over (d,k) of slide length ≤ (N+M)·D = 4M... realistically much less. Let's estimate more carefully for the scattered case: the DP furthest points on diagonal k after snakes — for |k| small, the furthest point is deep in the common region (slide ~20000 lines? only when the path can get there: at step d, diagonal k's furthest x ≤ (d + k)/2 + slide... the furthest x on diagonal k at step d is at most d + (slide) — bounded by d + O(slide) where slide can be long: x ≈ min(d + k... hmm, x ≤ (number of x-steps) + slide ≤ d + 20000. So each (d,k) with |k| ≤ d slides up to ~20000 → total slides ≈ Σ_{d≤50} 2·(2d)·20000 ≈ 2·2500·2·20000 = 200M?!? That would be way too slow!! Wait — no: slides only extend as far as the current furthest point + matches; the slide from the furthest point on diagonal k at step d: the furthest point ≈ where previous steps got + slide; slides through the common region happen ONCE per diagonal per "advance" — hmm, no: at each step d, diagonal k's furthest x = max(prev neighbors) + slide; the slide length from the max point: the common region is all-matching, so once any path reaches the common region's start, the slide goes ALL THE WAY THROUGH (~20000 lines) — at EVERY (d, k) that touches it! Number of (d, k) pairs touching the common region: diagonals k ∈ [-50, 50] × d ∈ [0, 100] ≈ 10000 pairs × slide length (~20000 / number of distinct... ) — total slide work ≈ 10000 × 20000 = 200M?? No wait — the slide from a point: the furthest point on diagonal k at step d = (entry point) + (slide to the region end); at the NEXT step d+1, diagonal k's furthest = max(from k±1 neighbors' furthests ± 1) + slide-from-there: the neighbors are also deep in the common region → slide ≈ 0 (already at/near the region end)! Slides only happen when the furthest point MOVES through unmatched-then-matched territory. Once a diagonal's furthest point is inside the long common run, it slides to the run's end ONCE, and subsequent steps on that diagonal start from the run's end (neighbors feed it) → slide ≈ 0. So total slide work ≈ (number of diagonals) × (region length) ≈ 100 × 20000 = 2M per... each diagonal slides through the common region at most... hmm, a diagonal's furthest can only advance; once in the run it goes to the run's end; but it ENTERS the run only once ✓ so each diagonal slides the run at most once ✓ total ≈ 200 diagonals × 20000 = 4M... no: diagonals k ∈ [-100, 100] ≈ 200, each slides ≤ 20000 once → 4M slide-steps?? Hmm, but also the region has TWO sides (forward from start, reverse from end) — the common middle: forward slides go through it; reverse slides too: ×2 = 8M?? Hmm, plus multiple common blocks... Total bounded by (number of diagonals)·(total matching lines) ≈ 2D·(N+M) = 200·40000 = 8M slide-steps ≈ 1.5-2.5s in CPython. Hmm — plus per-(d,k) overhead ~20000×0.3μs = 6ms ✓. Total ~2-3s worst for the pathological scattered case — the requirement says "differ in about 50 places" must be < 2s. Tight! Can I reduce the slide work? 

Optimization idea: cap slides via precomputed "next mismatch" tables? Classic trick: for each diagonal... the slide `while a[ax] == b[by]` — when comparing large identical regions repeatedly across diagonals, each diagonal's slide is a suffix of the common run — the work is (run length) per diagonal that enters it. An optimization: precompute for the trimmed arrays nothing simple...

Alternative: reduce the D in the scattered case: after the root trim fails to shrink (mismatches at both ends), we could still apply a smarter preprocessing: the classic "trim common prefix/suffix REPEATEDLY during recursion" already helps deeper nodes. But the root DP is the cost. Hmm — another classic trick: in `_middle_snake`, we can bound the slide by noting we don't need furthest points beyond... no.

Alternative optimization: the "linear space" middle snake only needs the OVERLAP; there's a known optimization to skip common lines during the DP via "suffix trimming inside the DP" (the "Myers with common prefix per diagonal"?) — not standard.

Practical mitigation: most real 20000-line diffs have their 50 changes scattered such that trims at the root... the root trim only handles the ENDS. The DP then costs ~2M+ slide steps. Let me optimize the slide loop constant: currently per slide-step: `ax < a1 and by < b1 and a[ax] == b[by]` — 2 range checks + 2 index + compare ≈ 0.15-0.25μs in CPython 3.11 → 8M × 0.2μs = 1.6s. Hmm. Plus everything else. Could exceed 2s in the worst crafted case. But is the worst case realistic for "differ in about 50 places"? If the 50 diffs are scattered, yes. Risky.

Better optimization — **skip repeated slides using the classic trick**: bound snake extensions by precomputation is hard, but there's a simpler big win: process the DP on the trimmed arrays where we ALSO trim middle common blocks? Alternatively use the "patience/grep" style? No — minimality required.

Alternative: reduce slide redundancy by remembering, per diagonal, the furthest point INCLUDING slides, and noting that the slide result for diagonal k at x only depends on (k, x) — memoize slide endpoints per (k, x)? The same (k, x) slide can be recomputed across different d! Memo dict keyed (k, x) → endpoint: total distinct slides ≤ number of distinct (k, x) entries ≤ ... each slide's start point is determined by (k, furthest-before-slide); distinct starts per diagonal ≤ number of distinct entry points ≤ D per diagonal? Total memoized work still same asymptotics but avoids recomputation across d — but actually the same (k, start) rarely recurs across d because furthest points only advance (per diagonal, starts are increasing → no repeats!). Right: on a fixed diagonal, the furthest point is non-decreasing in d, and the slide start for step d is ≥ previous → slides start further along → NO repeated work per diagonal?? Then where did my 8M estimate come from? Each diagonal's furthest advances monotonically; the total slide work per diagonal ≤ total advance ≤ N — the furthest point per diagonal advances at most... across all d, the furthest point on diagonal k goes from ~0 to ≤ N: total slide work per diagonal ≤ N?? But slides can overlap: at step d the furthest slides from p1 to the run end e; at step d+1 furthest = max(neighbors)+slide — neighbors are also ≤ e+1... the point is the furthest on diagonal k is non-decreasing and bounded by N ⇒ total slide-work per diagonal over ALL d ≤ N + D (each slide-step advances the furthest... slide steps either advance the furthest (first time reaching that x on this diagonal... not exactly — slide steps at step d from point p reach e; those x in (p, e] become the furthest; at step d+1 the start is ≥ max(prev furthest, neighbors) — could the start be BEHIND the previous furthest? The recurrence: x = max-ish of neighbors ± 1 — neighbors' furthests at step d-1 could be less than this diagonal's furthest at step d-1! E.g. diagonal k furthest = 100 (from step d-1); at step d, neighbors' furthests are 40, 60 → x = 61 → slide from 61 — re-slides [61, e] ALREADY covered! So repeated slides DO happen (the furthest on a diagonal can REGRESS?? No — furthest-reaching: V[k] at step d ≥ V[k] at step d-1? The recurrence takes max over neighbors ±1 and... the standard recurrence doesn't include V[k] itself! V[k]_d = max(V[k-1]_d... hmm: the d-path on diagonal k: comes from k-1 or k+1 at step d (a (d)-path's last non-diagonal move is at step d) — so V[k]_d is computed ONLY from neighbors at step d-1 — it does NOT include V[k]_{d-1}! But furthest-reaching D-paths: a path of length d ending on diagonal k — its last non-diagonal move could have been earlier with a long snake after... the snake is free, so a d-path ending on diagonal k = (d-1)-path ending on k±1, then move to k, then slide. So V[k]_d = slide(max(V[k-1]_{d-1} + ..., V[k+1]_{d-1} ...)) — V[k]_{d-1} is NOT directly used! But V[k]_d ≥ V[k]_{d-1}? A (d-1)-path ending on k... extend it: it ends at V[k]_{d-1} on diagonal k; can we extend to a d-path on k? Only by moving off and back — not directly. Hmm, but the standard theory says V[k]_d ≥ V[k]_{d-2} (parity!) — anyway: repeated slides across d on the same diagonal CAN happen when neighbors lag. Worst case: the common-run slide gets redone at every d for every diagonal: total = Σ_d Σ_k slide ≈ D × (D diagonals) × (run length)... but bounded: V[k]_d ≥ V[k]_{d-2} (parity) ⇒ slides at step d start ≥ V[k]_{d-2}'s endpoint... hmm, the slide START at step d = max(neighbors at d-1) which is ≥ ... neighbors at d-1 ≥ their values at d-3 ≥ ... this gives slide start ≥ (something like) the furthest at d-2's neighborhood... In the worst case (common run in the middle, D ≈ 2·#diffs): each diagonal's slide through the run is redone ~D/2 times? → total ≈ D/2 × (2D diagonals...) hmm for the scattered case: D=100, diagonals ~200, run ~20000, redos per diagonal ~ D/2 = 50 → 50 × 200 × 20000 / something... = 200M?! That can't be the standard complexity — the standard O(ND) bound: total work O(D²) for the k-loop + snake work bounded by... the standard bound for Myers O(ND) counts snake extensions as amortized O(1) per (d, k)?? The classic analysis: "the algorithm spends O(D² + ...) on the loops and the snake extensions are amortized..." — actually the classic worst case IS O(ND) INCLUDING snakes, via the argument that V[k]_d ≥ V[k]_{d-2}... let me recall: Myers' paper proves the O(ND) bound with snakes counted, using the monotonicity V[k]_d ≥ V[k]_{d-2}: at step d, diagonal k's slide starts from max(V[k-1]_{d-1}, V[k+1]_{d-1}) ± 1... and since V[k±1]_{d-1} ≥ V[k±1]_{d-3} ≥ (their slides at d-1 already advanced them)... the paper's amortization: each snake extension step (x, y) at (d, k) — charge it to... the paper shows total snake work is O(ND) — i.e., the worst case IS O(N·D) — for our case N=20000, D=100: 2M — not 200M. The amortization works because V[k]_d ≥ V[k]_{d-1} - something... Actually the key: V[k]_d ≥ V[k]_{d-2} (a (d-2)-path on k extends to a d-path on k by two moves? hmm — a (d-2)-path ending on diagonal k: move to k+1 (1 step) — now you're at (V+?, ...) — can't necessarily return... The known invariant is: V[k]_d ≥ V[k]_{d-2}? Let me not re-derive; empirically, Myers implementations are O(ND) and this is well-established: for the scattered case, total ≈ O((N+M)·D) = 20000·100·small-constant ≈ 2-4M slide steps ≈ 0.5-1s. I'll trust O(ND).

Hmm, but to be safer, add one cheap optimization that typically slashes the constant: in the slide loops, when the run is long we re-slide per diagonal — fine, O(ND) accepted.

Actually, one more easy and significant optimization for the 20000-scattered case: **recursive trimming at the ROOT before the DP**: the root trim handles only ends; but I can ALSO find the middle snake on SMALLER effective arrays by trimming "middle common blocks"? Non-trivial. Skip.

Alternatively — hybrid: since the middle snake search only needs the FIRST overlap, and overlaps in the scattered case... it's fine. Ship it.

Wait — actually, one more consideration on the O(ND) snake amortization: the standard proof (Myers' Theorem 1... ) — the O(ND) bound counts: for each d, for each k, the loop body O(1) + snake; snake total across everything: each snake step (x, y) on diagonal k at step d: the paper's argument: "the total time spent extending snakes is O(N + M) per ... " hmm — the actual statement: the algorithm runs in O(ND) time — snake work included — because "the furthest reaching point on diagonal k for D-paths is non-decreasing in D" — V[k] (over ALL d mixed... within a parity class) is non-decreasing in d? V[k]_d vs V[k]_{d+1}: a d-path on k... extend by... hmm, a d-path ending on k can be extended to a (d+1)-path ending on k? Move off to k+1 and back? That's 2 steps. So V[k]_{d+2} ≥ V[k]_d ✓ (parity-monotone). And slides at step d start from neighbors at d-1: V[k±1]_{d-1} ≥ V[k±1]_{d-3} — the slide start at step d on diagonal k is ≥ (slide end at step d-2 on the same diagonal) - 1?? Since neighbor's V at d-1 ≥ neighbor's V at d-3, and the slide end at d-2 on k = slide(max(neighbors at d-1... I'll trust O(ND). Empirically these algorithms are fast in practice.

OK — also, let me reconsider `limit = size//2 + 2` once more vs odd d_max = (D_true+1)//2: D_true ≤ size → d_max ≤ (size+1)//2 = ceil(size/2) ≤ size//2 + 1 ✓ < limit ✓.

Hmm, wait — actually one more edge: is D_true ≤ size always? D_true = (n - LCS) + (m - LCS) ≤ n + m ✓.

Now — let me also think: does the algorithm handle `a`/`b` being lists of unhashable...? They're str per spec ✓ (set fast path needs hashable ✓).

Also — the problem says list[str]; my code uses only indexing/len ✓.

Final code review — let me also double check the driver's handling when `_middle_snake` returns a snake and x1 == x2 (empty): the push loop `i = x2 - 1; while i >= x1` — x2 - 1 = x1 - 1 < x1 → no pushes ✓; sub1 = (a0, x1, b0, y1) and sub2 = (x2, a1, y2, b1) = (x1, a1, y1, b1) ✓ tile ✓.

And when the snake is the WHOLE range (x1 == a0, x2 == a1, y1 == b0, y2 == b1): sub1 = (a0, a0, b0, b0) → base, emits nothing ✓; snake emits everything ✓; sub2 empty ✓. Can this happen? Post-trim, the start is mismatched → the snake can't start at a0... (x1 = a0 would need a[a0] == b[b0] — contradiction) ✓ but harmless anyway.

Let me also double-check `tail` pushing order in the snake branch: desired pop order: sub1, snake, sub2, tail. Pushed: tail (reversed), sub2, snake (reversed), sub1 → pops: sub1, snake..., sub2, tail ✓.

Wait — the tail items: pushed as individual 2-tuples ("=", line) — popped in order ✓.

Hmm, but there's an ordering bug: the tail of THIS task must come after sub2's output — sub2's expansion pushes MORE items on top of the tail items — popped before ✓ correct: sub2's stuff, then tail ✓.

But WAIT — another ordering subtlety: sub1's expansion pushes its own sub-sub1, snake, sub-sub2 ON TOP of (snake, sub2, tail) — popped first ✓ so sub1's full expansion appears before the snake ✓ correct.

Now, finally — potential issue: the fast-path `set(a).isdisjoint(b)` builds a set of size |a| — for 20000 lines ~ ms ✓.

Also — hmm, the fast path changes semantics? If sets are disjoint, LCS = 0, and the minimal script has length (n + m) with zero "="; my emission is a valid minimal script ✓.

Let me also double-check the problem statement: "Taking the '=' and '-' items in order must give exactly a" ✓ our tiling ensures ✓.

One more: the output items are tuples ("=", line) etc. ✓.

Let me write the final code now, clean:

```python
def diff_lines(a, b):
    """Return a shortest edit script between line lists a and b ... """
    out = []

    if a and b and set(a).isdisjoint(b):
        for s in a:
            out.append(("-", s))
        for s in b:
            out.append(("+", s))
        return out

    stack = [("d", 0, len(a), 0, len(b))]
    while stack:
        task = stack.pop()
        if len(task) == 2:          # a literal "=" item to emit
            out.append(task)
            continue
        a0, a1, b0, b1 = task[1], task[2], task[3], task[4]

        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0]))
            a0 += 1
            b0 += 1

        tail = []
        while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
            a1 -= 1
            b1 -= 1
            tail.append(("=", a[a1]))

        if a0 == a1:
            out.extend(("+", s) for s in b[b0:b1])
            out.extend(tail)
        elif b0 == b1:
            out.extend(("-", s) for s in a[a0:a1])
            out.extend(tail)
        else:
            snake = _middle_snake(a, b, a0, a1, b0, b1)
            if snake is None:
                out.extend(("-", s) for s in a[a0:a1])
                out.extend(("+", s) for s in b[b0:b1])
                out.extend(tail)
            else:
                x1, y1, x2, y2 = snake
                for i in range(len(tail) - 1, -1, -1):
                    stack.append(tail[i])
                stack.append(("d", x2, a1, y2, b1))
                for i in range(x2 - 1, x1 - 1, -1):
                    stack.append(("=", a[i]))
                stack.append(("d", a0, x1, b0, y1))
    return out
```

and `_middle_snake` as above.

Hmm, one more check on `_middle_snake`'s handling of `odd` when `delta` negative: `delta & 1` in Python for negative: -1 & 1 = 1 ✓ (Python ints: -1 & 1 == 1 ✓); -2 & 1 = 0 ✓. ✓.

Also `flo/fhi` when odd and d=0: flo = delta + 1, fhi = delta - 1 → flo > fhi → check false ✓.

Let me now also quickly simulate the driver's stack discipline on the earlier "xayb"/"xyb" example to validate ordering: root: no trims → snake (1,0,2,1) → push: tail(empty), ("d",2,4,1,2), snake item ("=", a[1]) = ("=", "a"), ("d",0,1,0,0). Pop ("d",0,1,0,0): a0==a1 → extend b[0:0] nothing, tail empty ✓. Pop ("=","a") → out += ("=","a"). Pop ("d",2,4,1,2): a[2]="y" vs b[1]="b" no trim; suffix: a[3]="b" vs b[1]="b" ✓ tail=[("=","b")] a1=3,b1=1; a[2]="y" vs b[0]="a" no. a[2:3] vs b[1:1]: b0==b1 → "-y", tail "=b" ✓. Output: "=a", "-y", "=b" — plus earlier? Wait — the FIRST branch: sub1 = ("d",0,1,0,0) popped first ✓ emitted nothing... but where's "-x"?? sub1 = a[0:1]×b[0:0] = ["x"] × [] — should emit "-x"!! Let me recheck: sub1 = ("d", a0=0, x1=1, b0=0, y1=0): a0=0, a1=1: a0 != a1; b0 == b1 = 0 → branch b0==b1: emit a[0:1] = "-x" ✓. I mis-traced: yes it emits "-x". Output: "-x", "=a", "-y", "=b" ✓ matches the earlier trace ✓.

Now — let me also stress-test the middle-snake parity logic mentally on a case where the naive greedy would differ... I'll trust the traces.

One more potential issue: `_middle_snake` may return a snake that is NOT minimal-optimal if my parity implementation has a subtle flaw — mitigated by the verification. But there's one more scenario: the check `vr[ki] <= x` in the odd case fires at d, but the THEORY says the first fire is at d = (D_true+1)/2 — however, if an EARLIER d fires with a *verification-passing* segment that happens to be splice-invalid, we'd return a suboptimal-but-valid split. I argued passing+early → contradiction via the splice; but the splice argument needed the geometry (x1 in forward snake etc.)... Let me make the argument airtight differently: if the segment [x1, x2] on diagonal k is all-matching, then consider the path: P_f (forward d_f-path) ends at (x2, y2). Question: does P_f pass through (x1, y1)? Not necessarily — but consider instead the path: P_f to (x2,y2), then REVERSE along the verified matching segment down to (x1, y1)?? That's going backward — not allowed. Alternatively: use P_r: reverse path ends at (x1, y1). Then: script = ? Hmm — here's a cleaner validity proof of the SPLIT (not needing P_f to pass through (x1,y1)): D1_opt = edit distance of (a[0:x1], b[0:y1]) — is it ≤ d_f? Unknown without the path passing through (x1,y1). Hmm. So validity genuinely depends on the paper's geometric lemma. Given the algorithm matches the canonical one (I'm now quite sure the canonical middle-snake returns exactly [reverse-furthest-point, forward-furthest-point] — this matches e.g. the description "the middle snake is the snake connecting the furthest reaching forward and reverse points"), and the paper proves IT is a middle snake of an optimal path (that's literally the content of the paper's Lemma: the overlap points lie on a common snake ON an optimal path — the paper's proof of the linear-space algorithm's correctness), I'm confident. My extra verification only guards against implementation typos.

Actually, let me recall WHY the segment between the furthest points is on an optimal path (now I remember the proof sketch from the paper!): Let d_f + d_r = D, and suppose Vf[k] ≥ Vr[k] on diagonal k. The paper (Lemma 2/3 in section 4b... ) argues: take the optimal D-path P (exists). ... The actual paper statement (Myers 1986, section 4b): "Suppose D is odd... an overlap must occur between the furthest reaching forward (D+1)/2 path and the furthest reaching reverse (D-1)/2 path... Furthermore, the point of overlap is the end of a snake that is in the middle of the D path" — and the proof of "the middle snake is a snake on an optimal path": the overlap point (x, y) with x = Vf[k] ≥ Vr[k]: the snake is the one ending at (x,y) in the forward direction, i.e., [s, x] where s = start of the forward path's last snake... hmm — OR the paper defines the middle snake via the REVERSE furthest point's snake. You know, the practical implementations return [Vr-point, Vf-point] and they're correct — e.g., I definitely remember implementations returning exactly `(x1,y1) = reverse point, (x2,y2) = forward point`. And my verification guard additionally ensures segment-matching. If the paper's lemma guarantees [Vr, Vf] is on an optimal path — done. I recall the proof: Vr[k] ≤ x_Q ≤ Vf[k] where Q is the optimal path's point at position d_f... and the claim is the segment [Vr, Vf] lies on the optimal path — this needs the optimal path to cover the whole segment... The paper's actual lemma (I'm now recalling more precisely): "Let there be an overlap... then the snake containing the overlap point... the D-path passes through the snake whose end point is (Vf[k], ·) and whose start is (Vr[k], ·)" — the proof uses that the optimal path's point Q at position d_f lies ON the forward furthest path's last snake and ON the reverse furthest path's last snake, and that these snakes are the SAME snake (both contain Q, both are maximal runs around... hmm, if Q is in both snakes and both snakes are sub-runs of maximal matching runs on diagonal k: the forward snake [s, x2] and reverse snake [x1, t] both contain Q... if s ≤ x1... wait — do both snakes contain Q? Forward furthest Vf[k] ≥ x_Q means the forward furthest path ends at x2 ≥ x_Q; its last snake [s, x2] — does it contain x_Q? Only if s ≤ x_Q. Hmm — the forward path could have reached x2 with its snake above Q. But: the paper's trick — consider instead the REVERSE furthest path: it ends at x1 ≤ x_Q; ITS last snake [x1, t]... similarly might not contain Q. The resolution (I finally remember!): the paper uses the furthest-reaching paths' MONOTONICITY: the forward (m+1)-path's snake on diagonal k must contain the point where the OPTIMAL path crosses... ugh. 

OK — executive decision: the canonical algorithm + verification guard + structural correctness guaranteed. Even in the (unlikely) event of a rare suboptimal split, output remains a VALID edit script; minimality is essentially surely preserved given the theory. Additionally, I can strengthen the guard: after finding the snake, also verify the SPLICE quality implicitly by... nah. Ship.

Hmm, actually — wait. Let me add one more safeguard that costs nothing and fully de-risks minimality concerns in weird geometries: nothing simple. Moving on.

Let me also reconsider: should the odd-case check ALSO fire in the reverse pass (pairing reverse-d against forward-(d-1))? For robustness (in case the forward-pass check somehow misses), adding the mirror check could catch overlaps earlier — but each check must return a VALID snake; adding more checks only adds candidate returns; the first returning one wins. The mirror pairing (d-1 forward, d reverse) — total 2d-1 same parity ✓ also valid per theory (the symmetric lemma: overlap between reverse-(m+1)... for D = 2m+1 the symmetric split (m, m+1): optimal path at position m from the start = position m+1 from the end: reverse-(m+1) furthest ≤ x_Q'... by symmetry an overlap exists there too ✓). Adding the mirror check in the reverse pass: after computing reverse step d, check k ∈ [-(d-1), d-1] (forward-(d-1) coverage... but forward-(d-1) values were overwritten by forward-d! The forward array currently holds step-d values — pairing reverse-d with forward-d = total 2d (even) — for odd delta that pairing never corresponds to D_true... but an overlap there (if verification passes) would still be... its total 2d ≠ D_true — the splice would give a path of length ≤ 2d > D_true possibly → non-minimal. Skip the mirror check. Keep exactly the canonical pairings.

Final code. Let me also add `sys.setrecursionlimit`? Not needed (iterative) ✓.

Double-check variable shadowing: in the driver, `task[1], ... = a0, a1, ...` ✓.

One more: the initial task tuple ("d", 0, len(a), 0, len(b)) — if a and b are both huge and identical: trims handle in O(N) ✓.

Also — `_middle_snake` name with leading underscore at module level ✓ fine.

Let me also think about whether `while d <= limit` might exit with `d = limit + 1` without return for LARGE legit D... covered ✓.

Write it out:

```python
def diff_lines(a, b):
    out = []

    if a and b and set(a).isdisjoint(b):
        for s in a:
            out.append(("-", s))
        for s in b:
            out.append(("+", s))
        return out

    stack = [("d", 0, len(a), 0, len(b))]
    while stack:
        task = stack.pop()
        if len(task) == 2:
            out.append(task)
            continue
        a0, a1, b0, b1 = task[1], task[2], task[3], task[4]

        while a0 < a1 and b0 < b1 and a[a0] == b[b0]:
            out.append(("=", a[a0]))
            a0 += 1
            b0 += 1

        tail = []
        while a1 > a0 and b1 > b0 and a[a1 - 1] == b[b1 - 1]:
            a1 -= 1
            b1 -= 1
            tail.append(("=", a[a1]))

        if a0 == a1:
            out.extend(("+", s) for s in b[b0:b1])
            out.extend(tail)
        elif b0 == b1:
            out.extend(("-", s) for s in a[a0:a1])
            out.extend(tail)
        else:
            snake = _middle_snake(a, b, a0, a1, b0, b1)
            if snake is None:
                out.extend(("-", s) for s in a[a0:a1])
                out.extend(("+", s) for s in b[b0:b1])
                out.extend(tail)
            else:
                x1, y1, x2, y2 = snake
                for i in range(len(tail) - 1, -1, -1):
                    stack.append(tail[i])
                stack.append(("d", x2, a1, y2, b1))
                for i in range(x2 - 1, x1 - 1, -1):
                    stack.append(("=", a[i]))
                stack.append(("d", a0, x1, b0, y1))
    return out


def _middle_snake(a, b, a0, a1, b0, b1):
    n = a1 - a0
    m = b1 - b0
    size = n + m
    delta = n - m
    odd = delta & 1
    off = size + (size >> 1) + 12
    vf = [-1] * (3 * size + 24)
    vr = [size + 1] * (3 * size + 24)
    vf[off + 1] = 0
    vr[off + delta - 1] = n
    d = 0
    limit = (size >> 1) + 2
    while d <= limit:
        if odd:
            flo = delta - d + 1
            fhi = delta + d - 1
        else:
            flo = 1
            fhi = 0
        for k in range(-d, d + 1, 2):
            ki = off + k
            if k == -d or (k != d and vf[ki - 1] < vf[ki + 1]):
                x = vf[ki + 1]
            else:
                x = vf[ki - 1] + 1
            ax = a0 + x
            by = b0 + x - k
            while ax < a1 and by < b1 and a[ax] == b[by]:
                ax += 1
                by += 1
            x = ax - a0
            vf[ki] = x
            if flo <= k <= fhi and vr[ki] <= x:
                x1 = vr[ki]
                t = x1
                tk = t - k
                while t < x:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x:
                    return (a0 + x1, b0 + x1 - k, a0 + x, b0 + x - k)
        rlo = delta - d
        rhi = delta + d
        if odd:
            clo = 1
            chi = 0
        else:
            clo = -d
            chi = d
        for k in range(rlo, rhi + 1, 2):
            ki = off + k
            if k == rhi or (k != rlo and vr[ki + 1] > vr[ki - 1]):
                x = vr[ki - 1]
            else:
                x = vr[ki + 1] - 1
            ax = a0 + x
            by = b0 + x - k
            while ax > a0 and by > b0 and a[ax - 1] == b[by - 1]:
                ax -= 1
                by -= 1
            x = ax - a0
            vr[ki] = x
            if clo <= k <= chi and vr[ki] <= vf[ki]:
                x2 = vf[ki]
                t = x
                tk = t - k
                while t < x2:
                    if a[a0 + t] != b[b0 + tk]:
                        break
                    t += 1
                    tk += 1
                if t == x2:
                    return (a0 + x, b0 + x - k, a0 + x2, b0 + x2 - k)
        d += 1
    return None
```

Hmm — one thing: in the reverse loop, the `while` slide condition uses `ax > a0 and by > b0` — relative bounds ✓ (ax ≥ a0 ⟺ x ≥ 0 ✓).

Wait, there's a subtle issue with the reverse recurrence branch: `if k == rhi or (k != rlo and vr[ki + 1] > vr[ki - 1])`. At k == rlo == rhi (d=0): first condition k == rhi ✓ true → x = vr[ki - 1] ✓ seed ✓. At d ≥ 1, k == rlo: first: k == rhi? no; second: k != rlo false → else → x = vr[ki+1] - 1 ✓ ✓.

And forward at d=0, k=0: `k == -d` ✓ → x = vf[ki + 1] = vf[off+1] = 0 ✓.

Now — potential inefficiency: `vr[ki] <= x` in the odd case is checked for every k in range even when no reverse coverage... range ensures coverage ✓ but vr[ki] could be sentinel if... argued fresh ✓.

One more: the odd-case check should perhaps ALSO require that vr[ki] is not the sentinel — covered by the ≤ test (sentinel = size + 1 > any x ≤ n... x ≤ n ≤ size < size + 1 ✓ fails ✓).

Also — `size + 1` sentinel: vr real values ≤ n ≤ size ✓ strict ✓.

I also want to double check the verification inner loop indices for the odd case: `a[a0 + t] != b[b0 + tk]` with tk = t - k ✓ diagonal-k pairs ✓ t ranges [x1, x) ✓.

Also — hmm, in the odd case: is it possible that `vr[ki] > x` but an overlap exists slightly differently... fine, theory ✓.

Let me reconsider `limit` once more for the ODD case with size = 2 (n = m = 1, delta = 0 → even...) — odd requires |delta| ≥ 1 → size ≥ 2: n=1, m=... delta=±1 → size ≥ 2 ✓ limit = 3; D_true = 1 → d=1 ✓ found ✓.

Even, n=1, m=1, different: delta = 0, size = 2, limit = 3; D_true = 2 → d = 1 ✓.

Worst: n=1, m=1000 (delta=-999, odd): size=1001, limit = 502; D_true = 1000 → d_max = (1000+1)/2 = 500 ✓ ≤ 502 ✓.

Alright. Now — one more scenario test of the DRIVER with nested recursion to be sure the stack ordering is right. Take the earlier "ac"/"bc" example: root: no trim (a[0]="a" vs b[0]="b"; suffix a[1]="c" vs b[1]="c"?? wait — suffix trim: a[1]="c" == b[1]="c" ✓!! So tail = [("=", "c")], a1=1, b1=1. Then a[0:1]=["a"], b[0:1]=["b"]: non-empty → _middle_snake(0,1,0,1): n=m=1, delta=0, even, size=2, off = 2+1+12=15, arrays 30. vf[16]=0, vr[14]=1. d=0: fwd k=0: x=0,y=0: "a" vs "b" no; vf[15]=0. rev k=0: x=vr[14]=1, y=1; slide: ax=1>0, by=1>0: a[0]="a" vs b[0]="b" no; vr[15]=1. check: 0≤0≤0 ✓: vr[15]=1 ≤ vf[15]=0? no. d=1: fwd k=-1: x=vf[15]=0, y=1; by=1 < b1=1? no; vf[14]=0; check: flo=delta-d+1=0, fhi=0: k=-1 no. k=1: x=vf[15]+1=1, y=0; ax=1 < a1=1? no; vf[16]=1; check: k=1 in [0,0]? no. rev k ∈ {-1, 1}: k=-1: ki=14: k==rhi(0)? no; k != rlo(-1)? false → else: x = vr[15] - 1 = 0; y = 0+1 = 1; slide: