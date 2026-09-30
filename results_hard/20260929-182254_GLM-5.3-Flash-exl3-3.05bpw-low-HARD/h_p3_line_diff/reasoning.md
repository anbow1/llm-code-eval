Implement Myers diff with LCS reconstruction. Use classic Myers with V arrays and trace to backtrack, or use Patience-like fallback? Simplest: Myers greedy with snake recording per D step, memory O(N+M)*D — could be big for 1000 completely different (D~2000, fine). For 20000 with D~100 fine.

Implementation: standard Myers LCS:

def diff_lines(a,b): handle trivial. N+M limit; for large D fall back? Requirement says completely different 1000 lines under 6s: D≈2000, Myers O((N+M)D)=~4M, fine.

Store trace of V copies (dict/arrays). Use lists.

def shortest edit: standard algorithm returning list of ops.

Code:

def diff_lines(a,b):
  N,M=len(a),len(b)
  # trim common prefix/suffix
  ...
  then Myers on middle.

Implement Myers with trace:

max = N+M
v = [0]*(2*max+1) offset max? Use dict-free arrays; v[k] stores furthest x. Trace list of snapshots.

for d in range(max+1):
  v_copy = v[:]  # copying is O(2max) each step -> (N+M)^2 memory for 20000? prefix/suffix trim removes common, so middle small. Fine.
  Actually copy each iteration O(N+M) times D → O((N+M)D) same order, fine.

  for k in range(-d,d+1,2):
    if k==-d or (k!=d and v[k-1]<v[k+1]): x = v[k+1]
    else: x = v[k-1]+1
    y = x - k
    ax,ay = x,y
    while x<N and y<M and a[x]==b[y]: x+=1;y+=1
    v[k]=x
    if x>=N and y>=M: backtrack.
  trace.append(v_copy)

Backtrack: standard reconstruction.

Edge: N==0 or M==0 after trimming → handle by loop naturally (d needed). Myers handles N=0 fine? For N=0, d=M path with deletions... k=-d gives x=v[k+1], y=x+d... need a start. Standard: v[1]=0 initial. It works.

But when a middle empty entirely, just return equals.

Write backtrack:

x,y = N,M
result=[] 
for d in range(len(trace)-1,0,-1):
  vprev=trace[d-1]... Actually trace stores v before processing d? Let's store v snapshot after each d; reconstruct: v=trace[d]; k=x-y; decide whether came from k-1 (down? actually insertion) or k+1. Standard:

for d in range(len(trace)-1, -1, -1):
  v = trace[d]
  k = x - y
  if k == -d or (k != d and v[k-1] < v[k+1]):
     prev_k = k+1
  else:
     prev_k = k-1
  prev_x = v[prev_k]; prev_y = prev_x - prev_k
  while x > prev_x and y > prev_y:
     result.append(("=", a[x-1])); x-=1; y-=1
  if d>0? careful: when d==0 and prev... At d loop we use trace[d] snapshot before step d? Let me store trace.append(v.copy()) at start of each d iteration (before computing). Then v at index d is state after d-1 steps. Reconstruction per Wikipedia:

for d in range(len(trace)-1, 0, -1):
  v = trace[d]
  k = x - y
  if k == -d or (k != d and v[k-1] < v[k+1]): prev_k = k+1
  else: prev_k = k-1
  prev_x = v[prev_k]; prev_y = prev_x - prev_k
  while x > prev_x and y > prev_y: ("=" a[x-1]) ...
  if prev_y == y? no: during step d, moving from prev to current: if d>0 and x == prev_x: it's an insertion ("+", b[prev_y]); elif ... standard:

Actually the deletion/insertion step: from (prev_x,prev_y) one edit to something then snakes. If prev_k == k+1: deletion of a line (x advanced). So:

after snake backtrack:
  if x == prev_x: result.append(("+", b[prev_y-1]))
  else: result.append(("-", a[x-1]))— hmm need y==prev_y when deletion. deletion: x = prev_x+1, y same. so if x==prev_x (x not incremented beyond prev_x): insertion; else deletion of a[x-1].

But careful: trace[d] before step d includes v[k-1], v[k+1] from step d-1? v[k-1] and v[k+1] were set at d-1 (parity differs), yes. Also need v[1]=0 before d=1... initial snake at d=0: k=0, x=v[k+1]=v[1]... set v[1]=0 initially? With array init zeros, v[1]=0 already. Good.

Trace storing: at top of loop for d, save snapshot of v *before* modification for that d — but v[k-1], v[k+1] needed are from previous d, present. v[k-1] for k=-d is index -d-1? No, uses k+1 when k==-d. Fine.

But note when k==-d, prev_k=k+1 and v[k+1] was updated this same d? No — v is updated in place during loop; for k=-d we read v[k+1] before writing v[k]; k+1 = -d+1 which will be processed later in this d loop (steps of 2: -d, -d+2,...). k+1=-d+1 is odd-ish... k goes -d,-d+2,...; k+1=-d+1 not in this loop (different parity), so it holds value from d-1... wait k=-d, k+1=-d+1, parity of -d+1 differs from -d, so v[k+1] last updated at step d-1? At step d-1, k values are -(d-1)..(d-1) step 2. -d+1 = -(d-1), yes updated at d-1. Good. For k==d: prev_k=k-1=d-1, updated at d-1. Good. But snapshot issue: we update v in place; snapshot at start of step d captures state after d-1 done — correct.

Hmm but when k != ±d, condition uses v[k-1] vs v[k+1], both from d-1 — snapshot taken at start of d, but during processing of earlier k in this d loop, could v[k-1] or v[k+1] have been overwritten? k-1 and k+1 have different parity than k, and this d loop only writes indices with parity of d (same as k). So safe.

Edge case after trimming: if N==0 and M==0, return [("="...)]. If one zero, Myers loop: d grows, works but trace loop handles? For N=0, M>0: standard myers works. But to be safe shortcut.

Actually with N=0: d=M, k=-d branch: x=v[k+1]... fine.

Max D guard: if no solution within? max = N+M guarantees termination.

Memory: trace of snapshots each of size 2*max+1 → O(max*D). For trimmed middle of 20000 lines each totally different... but spec only needs 1000x1000 full-different: D≈1000+ (actually if completely different, D ≈ N+M ≈ 2000 after trim; snapshots ~2000*2000*... = 4M ints in lists → ~300MB? Hmm 2000 snapshots × 4001 ints = 8M ints, Python list of ints ~ 8 bytes pointer + shared small ints... indices up to 2000 not cached; ~2000*4001*(8+28) ≈ 290MB. Risky. Better: store v as array of ints? Use array('i') copies — 4 bytes each → 2000*4001*4 = 32MB. Fine. Or store only the needed prev values. Simpler: use array module.

Actually better: store trace entries as array('l', v) snapshot only when needed at backtrack... need every d. Use array('i'). Copy cost per d is O(max), total O(max*D) ~ 2000*4000=8M ops, fine.

For 20000-line case, trim reduces middle to ~small, D small, fine.

But snapshot copying O(N+M) per D could be bad if N+M=40000 and D large... only if middle huge and different — not required. OK.

Optimize inner equality loop with locals.

Write code.