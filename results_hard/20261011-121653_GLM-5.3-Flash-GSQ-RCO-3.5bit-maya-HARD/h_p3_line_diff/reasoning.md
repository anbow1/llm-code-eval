Implement Myers' algorithm returning the actual edit script (not just D). Need LCS-based diff.

Standard Myers O(ND) algorithm with backtracking. For performance: 20000 lines differing in ~50 places — Myers with linear space (divide and conquer) or simple forward with trace. Trace approach stores V arrays per D step: D ~ 100 (50 edits each side? D = deletions + insertions, about 100). Memory: D * (N+M) ints ~ 100 * 40000 = 4M ints — fine.

But worst case: two completely different lists of 1000 lines: N+M=2000, D up to 2000, trace storage ~ D*(N+M) = 4M — fine too. But time O((N+M)*D) = 2000*2000 = 4M — fine.

For 20000 lines differing in 50 places: D≈100 (if 50 lines replaced), work = 40000*100 = 4M — fine. But worst case if lists are completely different with 20000 lines each, D=40000, work = 40000*80000 = 3.2 billion — too slow. But requirement only specifies given scenarios. Still, to be safe, could add a fallback: if D exceeds some threshold, use a suboptimal but acceptable? No — the spec demands minimal. The given constraints are what we must satisfy. But maybe add common prefix/suffix trimming to speed up.

Implement Myers' algorithm via divide-and-conquer (linear space) recursive middle-snake approach, which uses O((N+M)·D) time for forward search per recursion but O(N+M) space. Actually linear-space Myers: find middle snake via backward/forward search meeting in middle, recurse. That gives full edit script with O(N+M) space. Time complexity O((N+M)·D) overall.

Alternatively simpler: forward Myers storing trace (list of V arrays copied each step). Copying V each step costs D per step → O(D^2) memory for copies? Each V array copy is O(N+M) length... copying arrays of length ~N+M per step: D steps × (N+M) = as computed. Memory 4M ints for the given cases; worst-case fully different 1000: D up to 2000, memory 2000*2000=4M ints — fine. Worst case 20000 fully different would blow up but not required.

But careful: V array in Myers is indexed by k from -D to D; typically use offset representation. Copy per step: store only slice needed? Simplest: store a copy of the whole V (length 2*(N+M)+1) each step. For the required scenarios memory is fine.

Actually memory concern: 20000 lines, 50 diffs → D≈100, each copy length 40001 ints → 100 copies → 4M ints ≈ 32MB as Python ints in list... Python list of ints: ~8 bytes per pointer plus small int cache — actually ints 0..256 cached, larger ints are objects ~28 bytes each. 4M ints × 28 bytes = 112MB. Hmm, could use array module ('i') or lists but only store needed range. Use array.array('l') — 8 bytes each → 32MB, ok. Or store per step only the values within k range: store dict or list slice. Better: store V as list but only copy the relevant window? Simpler: use array('i') for V, copy each step → 4M*4 bytes=16MB. Fine.

But wait: values in V are x positions up to N=20000, fits in int32.

Alternatively use linear-space divide-and-conquer to avoid trace memory entirely. Let me think about complexity of implementing middle snake correctly — it's error-prone but well-known. The trace approach is simpler and adequate for stated constraints. Let me do trace approach with trimming common prefix/suffix first (helps both scenarios: trimming reduces N+M; for the 1000 fully different lists trimming does nothing, but that's fine).

Trimming: remove common prefix and common suffix lines. Also can map lines to ints via a dict to speed equality comparisons? Comparing strings is fast enough. But converting to ids once reduces repeated string hashing: with dict mapping, x comparisons are int equality — faster. Let's do: ids = {} with default counter; a = [ids.setdefault(line, len(ids))...]. Careful: setdefault with len(ids) evaluates len before insertion — fine since setdefault inserts then len grows; using a counter variable is cleaner.

After trimming, Myers forward:

```
def myers(a, b):
    N, M = len(a), len(b)
    max_d = N + M
    v = array('i', [0]) * ... # size 2*max_d+1, offset max_d
    trace = []
    for d in range(max_d+1):
        trace.append(v copy? )
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
                x = v[k+1+off]
            else:
                x = v[k-1+off] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1; y += 1
            v[k+off] = x
            if x >= N and y >= M:
                return trace, d
```

Wait ordering: must snapshot V before modifying per d? Standard: save a copy of v at start of each d iteration (before updates) — actually the backtracking uses v values from step d-1 for k±1. Standard implementation stores trace.append(v[:]) before the loop over k, but v is mutated during the k loop; backtracking at step d uses values written during step d for k, and v[k±1] from step d-1. The standard "trace" stores v after each d step? Let me recall the common implementation (e.g., from James Coglan's "The Myers diff algorithm" blog):

```
def shortest_edit(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    v = [0] * (2*max_d + 1)
    trace = []
    for d in range(max_d + 1):
        trace.append(v.copy())
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and v[k-1] < v[k+1]):
                x = v[k+1]
            else:
                x = v[k-1] + 1
            y = x - k
            while x < n and y < m and a[x] == b[y]:
                x += 1; y += 1
            v[k] = x
            if x >= n and y >= m:
                return trace, d
```

Backtracking:

```
def backtrack(trace, d, n, m, offset):
    x, y = n, m
    for d in range(d, 0, -1):  # actually iterate d down to 1
        v = trace[d]  # v state at beginning of step d? 
```

Hmm, careful with which trace snapshot corresponds. In Coglan's version: trace.append(v.copy()) happens before processing step d, so trace[d] is the V state after step d-1 (i.e., before step d's updates). Backtrack:

```
def backtrack(trace, d, off):
    x, y = n, m
    for d in reversed(range(len(trace))):
        v = trace[d]
        k = x - y
        if k == -d or (k != d and v[k-1+off] < v[k+1+off]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k + off]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            yield ('=', ...)  # diagonal moves
        if d > 0:
            yield ('-' if prev_k == k-1 else '+') ...
        x, y = prev_x, prev_y
```

Wait, need care: trace[d] is state before step d? In the loop above, trace.append(v.copy()) at top of iteration d: trace[0] is initial v (all zeros), trace[d] is V after completing step d-1. When d iterations complete up to D (found at d=D), trace has entries 0..D. trace[D] = V after step D-1... hmm actually when found at d=D, we appended trace[D] before step D and then modified v during step D; trace[D] holds state after step D-1. Backtrack uses trace indices d = D down to 1: at step d, v=trace[d] is state after step d-1, k = x-y. Since x,y came from step d's computation... For d=D: x,y is final position computed during step D. v[k±1] in trace[D] are values after step D-1 — correct, since step D computed from those. Then after yielding the move at step d, x,y = prev_x, prev_y which is position at end of step d-1; next loop iteration d-1 uses trace[d-1] = state after step d-2 — correct.

Edge: k==d means k-1 would be d-1... condition handles.

Also handle d=0 loop: reversed range includes 0: at d=0, trace[0] is all-zero initial. k=0, k==-d true → prev_k=1? That's wrong — at d=0 we should just walk the diagonal to (0,0). Standard Coglan backtrack loops d from D down to 1 only, then remaining x>0,y>0 diagonal emitted at start? Actually in his version, at d=0, k=0, condition k == -d → true → prev_k = k+1 = 1, prev_x = v[1] = 0, prev_y = -1, then while x>prev_x and y>prev_y walks diagonals down to (0,-1)? Hmm that yields y=-1 which is wrong but the while loop: x>0 and y>-1... walks while both x>0 and y>prev_y. If x,y=(3,3) at d=0 means... can x>0 at d=0? Only if step 0 found solution, meaning all common prefix... if d=0, the entire diff is a common prefix? No — d=0 found means x>=n, y>=m at step 0, meaning a==b entirely (all diagonal). Then backtrack at d=0: k=0=-d → prev_k=1, prev_x=v[1]=0, prev_y=0-1=-1; while x>0 and y>-1: emit ('=', a[x-1]) ... down to x=0,y=0? Loop: x>prev_x(0) and y>prev_y(-1): at x=0, y=0: x>0 false, stops. Emits diagonals for x from n down to 1: correct, gives ('=', line) for all. Then x,y = 0,-1; loop ends (d range ends at 0 inclusive if we do reversed(range(d+1))). Result: y=-1 leftover but no more emissions. Fine — matches Coglan's, he loops `for d in reversed(range(trace.size))`? Actually he loops d from D down to 0? Let me just replicate: his backtrack is a Ruby block-based; the Python ports loop:

```
def backtrack(self):
    x, y = self.n, self.m
    for d in range(self.d, -1, -1): # hmm
```

Hmm, common Python port (e.g., from "myers diff in python" posts):

```
def diff(a, b):
    trace, d = shortest_edit(a, b)
    x, y = len(a), len(b)
    for d in reversed(range(d + 1)):
        v = trace[d]
        k = x - y
        if k == -d or (k != d and v[k - 1] < v[k + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = v[prev_k]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            yield x - 1, y - 1, x, y  # diagonal
            x, y = x - 1, y - 1
        if d > 0 and x == prev_x:
            yield ... # insertion (down move), prev_k == k+1
        elif d > 0:
            yield ... # deletion (right move)
        x, y = prev_x, prev_y
```

Wait there's a subtlety: after walking diagonals, x,y should equal prev_x,prev_y exactly (since the move at step d is one horizontal or vertical step followed by diagonals). Then the horizontal/vertical move: if prev_x == x (after diagonal walk) it was a vertical move (insertion, '+'), else horizontal ('-'). But careful when d>0 check for the d=0 case as discussed. Actually at d=0, after diagonal walking x,y reach (0,-1) = prev — then the move emission should be skipped. Using condition `d > 0` guards it.

Hmm wait, at d=0 with a==b case: x,y = (n,n); prev_x=0, prev_y=-1. Diagonal walk: while x>0 and y>-1: at x=1,y=0: y>-1 true → emit ('=', a[0])? Wait x=1,y=0: emit line a[0], x,y → (0,-1). But then we emitted n lines from (n,n) down to (0,-1)? Let's check: start (n,n). While x>0 and y>-1: emit a[x-1] with x,y both decremented. Iterations: x=n..1, y=n..1: at each step y> -1 true. So emits n lines a[n-1..0], ending at (0, -1)? Hmm x goes n→0, y goes n→0, loop exits when x=0. Wait exit condition x>0 and y>-1: when x=0 → exit. So y went from n down to 0, ending (0,0)? Let me redo: iteration 1: check x=n>0, y=n>-1 → emit a[n-1], x=n-1,y=n-1. ... iteration n: x=1>0, y=1>-1 → emit a[0], x=0,y=0. Check: x=0>0 false → exit. Ends at (0,0). Good, I miscalculated before. prev_y=-1 never reached. 

But in general d=0 non-solution case doesn't occur in backtrack since backtrack only reaches d=0 when the path at step 0... Actually the backtracked path at d=0: x,y must be on the diagonal k=0 with position reachable in 0 steps → x=y=0 (plus the diagonal walk). Fine.

Another subtlety: when D found at some d, and x>=n, y>=m reached during step d. trace list has d+1 entries (indices 0..d). Backtrack loop `for d in range(D, -1, -1)` uses trace[d] — trace has index D. Good.

But one more subtlety in the forward loop: `trace.append(v.copy())` before processing k's — but v continues being mutated; since trace stores copies, fine.

Offset: use v index k+off where off = max_d = N+M (after trimming N', M'). v size 2*(N+M)+1... k ranges -D..D ≤ -(N+M)..(N+M). Off = N+M. Actually max needed k = N+M? During search k ≤ d ≤ N+M. Yes.

Use array('l') for speed? Copying array('l') is fast (C memcpy). Values fit in int64 definitely.

Also trimming prefix/suffix: compute common prefix length p and suffix length s. Then run Myers on a[p:N-s], b[p:M-s]. Result script = prefix '=' items + middle + suffix '=' items.

Also the line-ID mapping reduces comparisons.

Now reconstruct: middle diff is list of ops with indices into trimmed arrays; then prepend p '=' and append s '='.

Let me write:

```
from array import array

def diff_lines(a, b):
    # map lines to ints
    ids = {}
    def to_ids(lines):
        out = []
        for line in lines:
            i = ids.get(line)
            if i is None:
                i = len(ids)
                ids[line] = i
            out.append(i)
        return out
    A = to_ids(a); B = to_ids(b)
    n, m = len(A), len(B)
    # common prefix
    p = 0
    while p < n and p < m and A[p] == B[p]:
        p += 1
    s = 0
    while s < n - p and s < m - p and A[n-1-s] == B[m-1-s]:
        s += 1
    ca = A[p:n-s]; cb = B[p:m-s]
    middle = _myers(ca, cb)
    result = []
    for i in range(p):
        result.append(("=", a[i]))
    result.extend(middle mapped back)
```

For mapping back, ops reference positions in ca/cb; middle ops: for "=" use ca index → a[p + idx]. Let me have _myers yield (tag, x, y) or just handle: I'll make _myers return list of (tag, x, y) where for '-' x is index into ca, for '+' y index into cb, for '=' both. Then build output with a[p+x], b[p+y].

_myers(ca, cb): if both empty → []. If one empty → all '-' or '+'. Otherwise run Myers.

Edge: if ca or cb empty, Myers loop: d=0, k=0, x=0,y=0, while x<n... if n>0,m=0: k=0, condition k==-d → prev path... forward: d=0: k=0: since k==-d (0==-0) → x = v[1]?? v[1]=0 → x=0,y=0; while x<n and y<m fails (m=0). v[0]=0. check x>=n(0? n>0) no. d=1: k=-1: k==-d → x=v[0]=0 → x=0, y = x-k = 1? y=1 but m=0... while fails; v[-1]=0. check x>=n? 0>=n no. k=1: k==d → x=v[0]+1=1, y=0; v[1]=1; x>=n? n=1? yes, y>=m=0 yes → D=1. Backtrack works? Let's trust general algorithm; but maybe simpler to special-case empty sides. I'll special-case.

Hmm wait, careful: with m=0, n=3: forward loop: d=0: x=0,v[0]=0, not found. d=1: k=-1: x=v[0]=0,y=1: v[-1+off]=0. k=1: k==d → x=v[0]+1=1, y=0; v[1]=1; x>=3? no. d=2: k=-2: x=v[-1]=0, y=2, v[-2]=0. k=0: k==-d? no; k != d and v[-1] < v[1]: 0<1 → x=v[1]=1, y=1: v[0]=1. k=2: k==d → x=v[1]+1=2, y=0; v[2]=2. d=3: k=-3: x=v[-2]=0,y=3. k=-1: v[-2] < v[0]: 0<1 → x=v[0]=1, y=2. k=1: v[0]<v[2]: 1<2 → x=v[