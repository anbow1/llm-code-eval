We need answer with code block only? User asks reply single ```python code block. Need implement Myers diff shortest edit script. Need think thoroughly. Need produce final code only. Let's design robust algorithm.

Need diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]

Requirements:
- shortest edit script, LCS maximal.
- Taking '=' and '-' gives a; '=' and '+' gives b.
- Performance: 20k lines differ in about 50 places under 2s; completely different 1000 lines under 6s.
- Myers O((N+M)D). Standard library only.

Need implement efficient Python. Consider variants: Myers linear space? We need full script. If D small, classic O(ND) with storing V snapshots can produce path. But storing snapshots for each k? For 20k with D~50, snapshots: number k ranges D? Actually O(D^2) storage? Could reconstruct by backtracking from final V? Need store all V arrays per d and k? For N=20000, D=50, k range -50..50 => 101 ints *51 ~5k trivial. For completely different 1000 each: D~2000? k range -1000..1000 => 2M storage maybe okay memory ~16 MB if list of arrays? Time? O((N+M)D) = 4e6? Actually worst-case completely different: D=N+M=2000, k up to 2000, total loops sum O(D^2)=4M, okay under 6s Python maybe. Need be careful with inner loop overhead and list allocation. Could implement Myers O(ND) storing V history. Then backtrack.

But there are edge cases: long common prefix/suffix? Myers handles. Need minimal script: classic forward only returns one shortest path. Need output order: We can backtrack from end to start and reverse.

Algorithm details:
Let n=len(a), m=len(b). Use 1-indexed maybe. Forward Myers:
V[k] = furthest reaching x on k-diagonal after d edits. k = x-y. Start V[1]=0. For d from 0 to maxD:
 for k in range(-d, d+1, 2):
  if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]  # insertion (down? from previous d k+1 means y? Actually from k+1 to k: x same => y+1 => insertion? Need define output later)
  else: x = V[k-1] + 1 # deletion
  y = x - k
  while x < n and y < m and a[x] == b[y]: x++,y++
  V[k]=x
  if x >= n and y >= m: path found at d.
Store V after each d? We need backtrack. Could store copy of V for each d: history.append(V.copy()) but need range of k? For backtracking, given final d, for k from end k? Standard:
At final d, final k = n-m.
For d from D down to 1:
 v = history[d]; prev_v = history[d-1]
 k = n - m maybe adjusted as we go? Backtracking state (x,y,k) at distance d.
 Need decide if last move was insertion or deletion based on prev V? Standard:
 for d in reversed(range(1, D+1)):
   k = x - y
   prev_v = history[d-1]
   if k == -d or (k != d and prev_v[k-1] < prev_v[k+1]):
      # previous k was k+1 (insertion)
      prev_k = k + 1
      # insertion: from (x, y-1) to (x,y)? Actually if current x,y after move. If insertion: x same, y increases by 1. Current y after insertion = previous y +1, so previous point (x, y-1). Move type '+'.
   else:
      prev_k = k - 1
      # deletion: from (x-1,y) to (x,y). Move '-'.
   # But careful: current V[d][k]=x. We need current x = v[k]. y = x-k.
   if prev_k == k+1: # insertion
      # current move is insertion, previous x = x, previous y = y-1
      add '+', b[y-1]
      y -= 1
   else:
      add '-', a[x-1]
      x -= 1
   k = prev_k
 # then handle snakes? Wait standard backtrack only records edit moves; then prepend common prefix from current x,y? But after D down to 1, x,y at point after d=0? There might be initial snake. Need produce '=' items too.

Alternative: Backtrack using history and reconstruct from final point to start including snakes. At each d step, identify preceding point (prev_x, prev_y) that reached current (x,y) via deletion or insertion. The segment between prev_x, prev_y and current x,y? In Myers, after the single edit from previous diagonal, there is a snake (matches) up to current x,y. But V[d][k] after snake. To output script in forward order:
We can record moves in reverse, including snakes before each edit.
Standard backtrack:
path = []
x = n; y = m
for d in range(D, 0, -1):
    v = history[d-1]
    k = x - y
    if k == -d or (k != d and v[k-1] < v[k+1]):
        # insertion came from k+1, x unchanged, y-1
        prev_k = k + 1
        prev_x = x
        prev_y = y - 1
        op = '+', b[prev_y]
    else:
        prev_k = k - 1
        prev_x = x - 1
        prev_y = y
        op = '-', a[prev_x]
    # There is a snake from (prev_x, prev_y) to (x,y) in current d? Actually after prev_v? Let's examine.
    # At step d, current point (x,y) is after snake following an edit from previous point? In forward:
    # choose prev_k, x_start = (prev_k+1? etc) after edit, then y_start = x_start - k, then snake to V[d][k] = x_end.
    # Current x = end of snake. The edit move connects previous diagonal point (prev_x, prev_y) (end of snake at d-1?) to (x_start,y_start), then snake to current (x,y).
    # In backward, to reconstruct, we should output snake from (x_start,y_start) to (x,y) (excluding edit) after op? Then op. But simpler: At each d:
       # Determine op and start-of-snake point (x0,y0) after edit.
       # Then the snake is (x0,y0) -> (x,y) matches. In reverse append snake matches reversed then op?
    # But we can instead set x,y to x0,y0 after recording op and snake, and continue.
    # Need append matches along snake (which are lines kept) in reverse order.
    # But if we later continue, previous state should be end-of-snake at d-1? Let's derive.

Maybe easier: Use backtracking that records operations from final to start:
For each d from D down to 1:
   v = history[d-1]
   k = x-y
   if insertion:
      # the edit was an insertion, previous point before edit is (x, y-1). But current x might be after snake after insertion. The snake started at (x, y_snake_start?) Let's compute edit point: prev_v[k+1] is max x on k+1 at d-1. For insertion, x0 = v[k+1] (same x), y0 = x0 - k = prev_y + 1? Wait current k = x-y. If previous k = k+1. previous point on k+1 before edit has x_prev = prev_v[k+1], y_prev = x_prev - (k+1). Insertion increments y: x_after_edit = x_prev, y_after_edit = y_prev +1. Then k_after_edit = x_prev - (y_prev+1) = (x_prev - y_prev)-1 = (k+1)-1 = k. Then snake increases both. Final x = x_after_edit + snake_len. Final y = y_after_edit + snake_len.
      # In backward from final x,y: snake_len = x - x_after_edit = y - y_after_edit. Need know x_after_edit = prev_v[k+1]? Is it? Because insertion used x = V[k+1], yes forward: x = V[k+1]; then snake to current. So x_after_edit = prev_v[k+1].
      # snake lines from (x_after_edit, y_after_edit) to (x,y) are a[x_after_edit:x] matched.
      # Record matches from x-1 down to x_after_edit, then record '+ b[y_after_edit]'? In reverse: matches reversed then '+'.
      # Set x = x_after_edit, y = y_after_edit (after removing snake and insertion). Then d-1 current point is previous end of snake at d-1? Wait after removing insertion but not previous snake, x,y is after edit from previous diagonal, not at end of previous snake. Previous state in history d-1 has end of snake on k+1 at x_prev=x_after_edit? Yes x_prev = prev_v[k+1] = x_after_edit. Good. So set x=x_after_edit,y=y_after_edit? But previous state should be (x_prev, y_prev) = (x_after_edit, x_after_edit-(k+1)). Note y_after_edit = y_prev+1. If set y = y_after_edit, not previous end y_prev. But then k = x - y = k-? Actually x_after_edit - y_after_edit = k-1 = prev_k. Good: point is on prev_k after insertion, not previous end. But previous end of snake at d-1 also x_prev same; its y_prev = x_prev - prev_k = y_after_edit -1. We need backtrack from insertion's source point, not previous end? If we set x,y to insertion source? For next d-1 step, we need current point at end of d-1 snake. That is (x_prev, y_prev). But if we set y_after_edit, k = prev_k but y is off by 1 (after insertion). Need set x=x_prev, y=y_prev (previous end before insertion). Then next d-1 k = prev_k. Let's check:
 insertion: x_after_edit = prev_v[k+1]. prev_y = x_after_edit - (k+1). previous end = (x_after_edit, prev_y). Current (x,y) final includes insertion and snake. We remove snake and insertion: x = x_after_edit; y = prev_y. Then current k becomes k+1. Yes.
 But then when recording snake before insertion, we need start-of-snake point after insertion: (x_after_edit, y_after_edit) = (x, y+1). The snake lines are a[x_after_edit:x] (same as b[y_after_edit:y]). Then insertion line is b[y_after_edit] where y_after_edit = y+1? Need after removal set. Could record matches reversed using current x and x_start=x_after_edit. Then record '+', b[x_start? y_start]. Then set x=x_after_edit, y=prev_y.
   if deletion:
      deletion from k-1: x_after_edit = prev_v[k-1] + 1. previous end = (prev_v[k-1], prev_v[k-1]-(k-1)). deletion increments x: x_after_edit = prev_v[k-1]+1, y_after_edit = x_after_edit - k = prev_v[k-1] - (k-1) = prev_y. Then snake to final x. Remove snake and deletion: x=prev_v[k-1], y=prev_y, k=prev_k.
      snake start after deletion = (x_after_edit, y_after_edit). snake lines a[x_after_edit:x] = b[y_after_edit:y]. deletion line a[x_after_edit-1].
   Append matches reversed and op.
Then after loop d=0, there is initial snake from (0,0) to (x,y) (current at end of d=0? Actually after removing all d edits, x,y are at end of initial snake at distance 0? In forward d=0 snake from (0,0) to V[0][0]. In backtracking after d=1 removal, current point should be end of d=0 snake? Let's see. For d from D to 1, after each step we set to previous end-of-snake at d-1. After d=1, set to end of d=0 snake. Then append initial snake matches reversed. Then reverse list.

Need ensure op order: In reverse list, if we append snake matches reversed then op? Let's test with example: a=['x'], b=['x'] D=0 history? special D=0. Need output '=' 'x'. We can handle D=0 by just all common? If a==b? Actually if a==b. If D=0 only when a==b? n=m and all lines match. Output all '='. But if both empty.

Example a=['A','B'], b=['C','B']. n=2,m=2. Shortest: -A +C =B? D=2.
Forward V:
d0 k0: x=0,y=0 snake a0 !=b0 => V0[0]=0.
d1: k=-1: k=-d, x=V0[0]? Need V initialized? Use offset. For k=-1: if k==-d: x=V[k+1]=V[0]=0. y=x-k=1. snake? x0 y1 out? y>=m? V[-1]=0.
k=1: k==d and k != -d? x=V[0]+1=1. y=0. snake? a[1]='B', b[0]='C' no. V[1]=1.
d2: k=0: if V[-1]=0 < V[1]=1 => x=V[1]=1? Actually k=0, d=2: k != -d and k != d, V[k-1]=V[-1]=0 < V[k+1]=V[1]=1 => x=V[k+1]=1 (insertion), y=1. snake a[1]==b[1] -> x=2,y=2 final.
Backtrack: D=2, history list: maybe include d=0, d=1, d=2. Start x=2,y=2. d=2 k=0 prev_v d1: k=0; prev_k = k+1 if V[-1]<V[1] -> insertion. x_after_edit = prev_v[1]=1. prev_y = x_after_edit - (k+1)=1-1=0. snake start (1,1) to (2,2): match a[1]='B'. record match reversed (B), op '+ b[1]? y_after_edit = x_after_edit - k = 1-0=1 => b[1]='B'? Wait b[y_after_edit] = b[1]='B'. But insertion line should be C at b[0]. Something wrong. Let's trace forward insertion at d=2 from k=1 prev end (x=1,y=0). Insertion increments y from 0 to 1, after edit point (x=1,y=1). Then snake matches a[1] and b[1] to (2,2). The inserted line is b[0], not b[1]. In reverse: snake lines from after_edit (1,1) to final (2,2): b[1] match. Insertion line is b[y_after_edit-1]? Actually after edit point y=1, inserted line is b[0], i.e. index y_after_edit - 1 because previous y_prev =0. More generally insertion from k+1: previous y_prev = x_after_edit - (k+1); y_after_edit = y_prev+1. Inserted line = b[y_prev] = b[y_after_edit-1]. So when recording op, use y_prev. Good. After removal set current x=x_after_edit, y=y_prev. So for insertion, record op '+', b[y_prev]; snake matches from x_after_edit to x. Then set y=y_prev.
For deletion: previous end (x_prev,y_prev), x_after_edit=x_prev+1, insertion? deletion line a[x_prev] = a[x_after_edit-1]. Record op '-', a[x_prev]. Set x=x_prev, y=y_prev.

So backtracking function:
ops_rev=[]
x=n; y=m
for d in range(D,0,-1):
    v = history[d-1]
    k = x - y
    # need access v at k±1; use dict or offset list. history arrays include index range? Simpler use dict {k:x}.
    if k == -d or (k != d and v.get(k-1,-1) < v.get(k+1,-1)):
        # insertion
        x0 = v[k+1]  # x after edit? Actually prev_v[k+1]=x_prev, same as x_after_edit.
        y_prev = x0 - (k + 1)
        # snake matches from (x0, y_prev+1) to (x,y)
        # append matches reversed
        # Note x0 may be less than x
        for xx in range(x-1, x0-1, -1): ops_rev.append(('=', a[xx]))
        ops_rev.append(('+', b[y_prev]))
        x, y = x0, y_prev
    else:
        x_prev = v[k-1]
        # x_after_edit = x_prev+1
        y_prev = x_prev - (k - 1)
        for xx in range(x-1, x_prev, -1): # x_after_edit = x_prev+1, include xx=x_prev? Actually snake starts at x_prev+1, end at x-1 inclusive. range(x-1, x_prev, -1) includes x_prev? Wait if snake start index x_after_edit = x_prev+1. Matching indices a[x_after_edit:x] are indices x_prev+1 .. x-1. If no snake, empty. range(x-1, x_prev, -1) gives x-1 down to x_prev+1, because stop exclusive x_prev. Good.
        ops_rev.append(('=', a[xx]))
        ops_rev.append(('-', a[x_prev]))
        x, y = x_prev, y_prev
# after loop append initial snake matches reversed: from 0 to x-1? Current x,y at end of d=0 snake.
for xx in range(x-1, -1, -1): ops_rev.append(('=', a[xx]))
ops = list(reversed(ops_rev))
Check constraints: taking = and - from ops should give a. Let's test above: ops_rev: for d2 insertion: snake range x-1=1 to x0-1? x0=1, range(1,0,-1) includes 1 => '=',B. then '+',C (b[y_prev]=b0). set x=1,y=0. d=1: current x=1,y=0,k=1. prev_v d0 v {0:0}. k==d? 1 == d=1 so condition? if k == -d? no; (k != d and...) false because k==d, else deletion. x_prev=v[0]=0, y_prev=0-(0)=0. snake range x-1=0 to x_prev=0 exclusive: range(0,0,-1) empty. op '-', a[0]='A'. set 0,0. append initial snake empty. ops reversed: '-',A; '+',C; '=',B. correct.

But wait, in d=1 step, we output deletion from end of d=1? The forward path: d1 deletion from (0,0) to (1,0), no snake. d2 insertion from (1,0) to (1,1), snake to (2,2). Backtrack correct.

Need ensure condition matches forward and history. Classic condition for deciding prev k in backtrack: if k == -d or (k != d and V[d-1][k-1] < V[d-1][k+1]) then came from k+1 (insertion) else from k-1 (deletion). This matches forward. But need when k == -d, only k+1 possible; when k == d, only k-1. However using .get may be okay but need not access missing. Use offset arrays to speed.

History storage: Need store V arrays for each d. But if using lists with offset, need size dynamic. For speed, we can store list of lists, each length maybe max_k*2+1 with offset d? In backtracking, v indexed by k+prev_d? If history[d] stored as list of length 2*d+1 offset d. For d-1 offset = d-1. For backtrack at d, v = history[d-1]; offset = d-1. Need get(k-1): index = k-1+offset = k+d-2? Let's derive if offset=d-1, index = k+offset. For k+1 index = k+1+offset = k+d. For k-1 = k-1+offset = k+d-2. Since current d. For d=2, offset=1, k=0 => k-1 index=0, k+1 index=2. Good. Missing values maybe not present? But for relevant condition, when k != ±d both k±1 are in range -d+1..d-1? In backtrack current k from a valid state at d. If k != -d, k+1 <= d? Actually previous v valid range [-(d-1), d-1]. If k != d, k-1 >= -d? For valid? If k=d, k-1 valid. If k=-d, k+1 valid. So condition uses values only if valid. Can check conditions explicitly.

Forward storage: For each d, allocate V length 2*d+1 offset d. Need previous V length 2*(d-1)+1 offset d-1. In forward:
history = [[0]]? Actually d=0 V length 1 offset0: V[0]= furthest x at k=0 after snake. Start x=0,y=0; snake. But standard start V[1]=0 to simplify first d. Could handle d=0 separately.
Implementation option:
if not a and not b: return []
n,m
max_d = n+m
offset? Use list of arrays.
For d=0:
  x=0; y=0
  while x<n and y<m and a[x]==b[y]: x+=1; y+=1
  history.append([x])
  if x==n and y==m: D=0 output all '='? If a==b? If after common prefix x==n and y==m implies n=m and all matched. Yes.
Then for d in range(1,max_d+1):
  v = [0]*(2*d+1)
  off = d
  prev = history[-1]; prev_off = d-1
  for k in range(-d,d+1,2):
     if k == -d:
        # from k+1 (insertion)
        xp = prev[(k+1)+prev_off]
     elif k == d:
        xp = prev[(k-1)+prev_off] + 1
     else:
        v_left = prev[(k-1)+prev_off]
        v_right = prev[(k+1)+prev_off]
        if v_left < v_right:
           xp = v_right # insertion
        else:
           xp = v_left + 1 # deletion
     y = xp - k
     while x < n? xp maybe could exceed n? In forward, xp could be n+? Need clamp? Standard no clamp; but if xp > n? Could happen? At d, from prev xp maybe prev x can be n and +1 if k=d? Then xp=n+1, y=n+1-d maybe. If x>n, while not run; V stores >n? It may be okay but could out of bounds if later uses? Usually if x >= n and y >= m done. But if one side exceeded, further states may be invalid; can cap x to n to avoid huge. However condition comparing prev values with +1 might produce x>n. Need careful. Standard Myers V may contain n+1? It uses V[1]=0, and if x>=N and y>=M return. It doesn't exceed by more than 1? Could. If n=0, k negative? But we handle d=0 maybe.

Can avoid storing impossible states by clamping x to n? If x > n, set x=n? But then y=x-k might change? Better if x > n, no need to snake, but for further comparisons maybe still valid. To keep y within? If x=n+1 and y maybe <m, invalid. But algorithm can continue. To prevent indexing out of range in comparisons, we can cap x at n. But then y may not equal previous after edit? However cap only when beyond grid; it won't affect valid paths. But in comparisons of V values, capped n vs maybe n+1 may change decisions? Could still choose valid path? Standard algorithms often cap: if x >= N: V[k]=N; if y>=M: maybe. Need ensure minimal path found. Simpler: use dict for V maybe but slower.

Maybe use classic with array of size 2*max_d+3 and store only one V for forward with snapshots as lists? Could use offset max_n+m. For speed, precompute max_offset=n+m; V length 2*maxD+3; history append V.copy()? But copying full length for each d huge if maxD 2000, okay 4M ints; but if D small with maxD huge (20000) not okay. Use dynamic length for snapshots.

Need performance: For 20k lines D=50, dynamic small. For 1000 completely different D=2000, dynamic arrays length up to 4001, total 4M ints; copying at each d total O(D^2) memory/time. Might be okay? 4 million int objects references; list copies create new lists, memory: each list overhead plus references. Each int from V values are Python ints; V values may be newly created. Storing history with list copies stores references to ints. But V values may be small? Could be up to 1000; small ints cached maybe. Memory: 4 million references *8=32MB plus list overhead ~16MB? 2M? Sum lengths over d=0..2000 of 2d+1 = ~4M. 32MB plus ints maybe small cached (0-1000 cached? CPython caches -5 to 256, >256 new ints). Values up to 1000; many not cached but each assignment creates int? Actually integer objects may be reused? When x = prev[...] etc, ints immutable; x increments creates new ints. History stores references. Could be many distinct int objects? For each list element, integer object. 4M ints maybe huge (28*4M=112MB) plus refs 32MB = 144MB. Might still okay? Could be high. For 20k D=50 tiny. For completely different 1000, max 144MB maybe borderline. Need better memory maybe use linear space algorithm? But requirement 6s, memory unspecified. Could optimize using arrays of int from array module? Standard library includes array. But Python standard? Yes array. Could store snapshots as array('i') or list of ints? array reduces memory, but access slower? Possibly okay for 4M. Or use bytes? We'll consider.

Alternatively implement divide and conquer (linear space Myers) to compute diff with O(ND) time and O(N+M) memory. For 1000 completely different, O(4M) okay. But implementing recursive backtracking may be complex but doable. For 20k with D=50, also okay. Need guarantee shortest. Could implement Myers O(ND) linear space via divide-and-conquer (diff.py) from Myers paper. Might be more robust memory. But performance in Python? Recursion and repeated scans maybe maybe okay for 1000. Need ensure under 6s. Could also use forward storing history with compact arrays. Which simpler and fast? Need deliver code. We need pass hidden tests maybe include edge cases. Need choose approach balancing correctness, simplicity, performance.

Let's explore algorithms.

Classic Myers O(ND) with storing path: Easy. Need ensure performance for completely different 1000: D=2000, loops ~2M? Actually forward loops: for d=0..D, sum_{d}(d+1) ~ D^2/2 = 2M. Inner while: For completely different no snake. Backtrack: ops length 2000, plus loops over snakes none. History allocation: sum lengths ~2M? Wait length 2d+1 => sum d=0..2000 = (D+1)^2 = 4M? If we store only every d length 2d+1, sum ~4,004,001? For D=2000, yes. Forward k loop sum d? number iterations ~2M. Array allocation total 4M. Fine. 2s? Python list allocation + loops maybe ~0.2-1s? Maybe okay under 6s. But memory maybe okay. Could store snapshots as array('i') or maybe list of lists. For values up to 20k, >256 not cached, creating many ints? Actually when filling V list initially [0]*(2d+1), references to cached 0. Then assign x (int) each element. For each d, many x values. In completely different, values vary; number assigned 2M. Each assignment creates int object? x computed from prev + 1, increments. Many distinct ints but small maybe >256. 2M int objects ~56MB? Not 4M because history length elements includes zeros for unused? Wait list length 2d+1 but only d+1 entries assigned? The others remain 0? In forward for k range -d..d step 2, number assigned d+1. The array length 2d+1 includes holes for parity? Actually if offset=d, valid k range parity d. Entries at other parity remain 0. So half elements remain 0 cached. Assigned ints count sum(d+1) ~2M. Ints up to n/m; many distinct? Maybe each assigned int object, 2M*28=56MB, refs 32MB, list overhead ~16MB? total ~104MB. Could be okay but maybe too high. We can use arrays to store only valid parity entries? For backtrack we can access via arithmetic if store array length d+1? Let's think.

We can store V for each d as list of x values for k = -d, -d+2, ..., d. Offset by d and index=(k+d)//2. Then length d+1. Sum lengths ~2M. Memory half. Access prev for k±1: index in prev? Need map. For d-1, k' = k±1; since k±1 parity matches d-1, valid. idx_prev_left = (k-1 + (d-1))//2 = (k+d-2)//2. idx_prev_right = (k+1 + d-1)//2 = (k+d)//2. Good. For current d, idx = (k+d)//2. Store current list curr length d+1; assign curr[idx]. This halves memory. Backtrack similarly. Use list of lists. For D=2000 sum lengths 2,003,001. Assigned ints all entries length d+1. Int objects 2M ~56MB, refs 16MB, list overhead ~16MB, total ~88MB. Better. Could use array('i') to reduce to 4*2M=8MB. But constructing arrays each d? curr = array('i', [0])*(d+1)? Actually array multiplication. Access maybe slower. But memory safe. However performance? array access returns Python int, slower but for 2M maybe okay. But we can use lists and hope memory okay. Could also store previous snapshots in arrays for backtracking? But backtracking needs history random access. Using array('i') maybe okay. Need import array standard. But perhaps not necessary.

Can avoid storing full V snapshots? We can use linear space recursion. But code longer. Let's evaluate performance of list-based dynamic parity for 20k D=50: trivial. For completely different 1000: loops 2M, okay. Under 6s likely. Python list-of-lists 88MB maybe okay. Hidden env may memory 256MB. Good. Could optimize by early trimming? For completely different 1000, D=2000 but max_d=2000, history length. Fine.

Need handle many common lines but D small; fast. Need handle repeated lines. Myers doesn't care.

Potential issue: Output operations count could be huge: if 20k completely different? Not required? Worst-case two lists of 20,000 completely different D=40000 -> O(1.6e9) too slow. But performance spec says 20k differ in ~50 places, 1000 completely different. We need not handle all worst-case within time. But hidden may test 1000 completely different and maybe 20k different 50. Could also test larger identical lists; need O(N) due to d=0. Need handle large lists identical quickly: compute common prefix in d0, if x=n and y=m return all '='? We can generate list of tuples length 20k. Good.

Need consider leading/trailing common prefix/suffix optimization: Myers already d0 finds common prefix, but if large lists differ in 50 places scattered, D small but forward loops d up to maybe 100? It still may traverse k up to D and while snakes across long matches. The while snake can advance long distances; total snake steps O(N+M)? In Myers, total while advances across diagonals? Could be O(ND) worst-case but for D small, still snakes may scan entire common segments multiple? Need ensure not O(N*D). Example long identical except insertions; while loops may repeatedly scan the same long runs? In Myers with forward V storing furthest x, each snake scans from previous x, could scan same area multiple times on different k? For D small maybe okay? Suppose lists identical length 20k except one deletion in middle D=1? Forward: d=0 snake scans first half until mismatch at middle. d=1 states k=-1,1. k=1: from k=0 +1 skip a mid, then snake scans second half. k=-1: insert scans second half? Let's see k=-1: x=V0[0]=mid, y=mid+1, snake scans second half. So second half scanned twice, O(N). Fine. D=50 => might scan long segments many times? Could be O(D*(N+M)) = 1M, okay for 20k. Need not worry.

But if lists are 1000 completely different, no snakes, O(D^2). Good.

Correctness of output order with snakes. Need verify with more examples.

Example a=['x','y','z'], b=['x','z']. Shortest: =x, -y, =z. Myers forward:
d0 snake x then stop mismatch a1=y b1=z? actually b[1]=z, y!=z. V0[0]=1.
d1: k=-1: insertion from V0[0] x=1,y=2? b[1]? x=1,y=2 (x-k=2). snake? y>=m no? x=1<n, y=2>=m. V[-1]=1.
k=1: deletion x=V0[0]+1=2,y=1. snake a2=z,b1=z -> x=3,y=2 done D=1 k=1? final x=n,y=m.
Backtrack D=1, x=3,y=2,k=1. prev_v d0 [1]. condition k==d -> deletion. x_prev=v[k-1]=v[0]=1. y_prev=1-(0)=1. snake range x-1=2 down to x_prev=1 exclusive: xx=2 => '=', a[2]='z'. op '-', a[1]='y'. set x=1,y=1. initial snake range 0 down -1: xx=0 '='x. reverse: =x, -y, =z. Good.

Example a=['a'], b=['b']: d0 no snake V0=0. d1: k=-1 insertion from 0 x0=0,y1? x=0,y=1 V[-1]=0; k=1 deletion x=1,y=0 V[1]=1. final k=1? x=1,y=0 not done? n=1,m=1 not both. d2: k=0 compare v[-1]=0 < v[1]=1 => insertion x=V[1]=1,y=1; no? done. Backtrack d2 insertion: prev d1 idx k+1=1 value 1? Wait V1[1]=1. x_after_edit=1. y_prev=1-(1)=0. snake range x-1=0 down to x0=1 exclusive: empty (x-1 < x0). op '+', b[0]='b'. set x=1,y=0. d1 current k=1, condition k==d deletion: x_prev=v0[0]=0,y_prev=0; snake range 0 to 0 exclusive empty; op '-','a'. set 0,0; initial none. reverse: -a +b. correct.

Example a=['a','b'], b=['a','c','b']: D=1 insertion. d0 snake a ->1 mismatch b vs c? V0=1. d1 k=-1: insertion from x=1,y=2? Wait k=-1, x=V0[0]=1, y=2 (x - (-1)=2). snake? a1=b, b2=b -> x=3,y=3 done. final k=-1. Backtrack d1: k=-1 condition k==-d -> insertion. prev d1 idx k+1=0 val1 x_after=1. y_prev=1-0=1. snake range x-1=2 down to x_after=1 exclusive? range(2,1,-1): xx=2 '=' b? a[2] out? Wait current x=3,y=3, x_after=1, snake indices 1,2? a[1]='b' a[2] doesn't exist (n=2). I used range x-1 down to x_after: range(2,1,-1) gives xx=2 only? But a indices 1 and 2? Let's compute: x=3 (end index exclusive), snake after insertion from after_edit point (1,2) to (3,3): x_after=1, final x=3, snake length 2. Matching indices in a are a[1],a[2]? But a length 2 indices 0,1. How can x=3? n=2? Mist! a=['a','b'] n=2, b=['a','c','b'] m=3. In d0 x=1,y=1. d1 k=-1 insertion: x=V0[0]=1, y=x-k=2. snake while x<n(1<2) and y<m(2<3): a[1]='b', b[2]='b' => x=2,y=3. x>=n,y>=m done. final x=2,y=3. Sorry n=2. Backtrack: x=2,y=3,k=-1. insertion x_after=1, y_prev=1. snake range x-1=1 down to x_after=1 exclusive: range(1,1,-1) empty. Wait snake length 1? But there should be match 'b' at a[1],b[2]. Did we skip snake? Let's examine: forward insertion at k=-1 from (1,1) to after edit (1,2), snake from (1,2) to (2,3): x_after=1, final x=2. snake indices x=1 only. In backtrack x=2, x_after=1. range(x-1=1, x_after=1, -1) empty because stop exclusive equals start. Need include x_after! For snake indices from x_after to x-1 inclusive, reverse range(x-1, x_after-1, -1). Earlier I said for insertion range(x-1, x0-1, -1) to include x0. For deletion range(x-1, x_prev, -1) because x_after=x_prev+1, so include x_prev+1, stop x_prev exclusive. Good. For insertion x_after = v[k+1]; include x_after. So for insertion use stop=x0-1. For deletion use stop=x_prev (exclusive) since x_after=x_prev+1. Need code carefully.

Insertion:
x_after = v[k+1]
for xx in range(x-1, x_after-1, -1): append '=' a[xx]
op '+', b[y_prev] where y_prev = x_after-(k+1). set x=x_after,y=y_prev.
Check example: range(1,0,-1) includes 1 -> =b. op +c? Wait y_prev=1-(0)=1 => b[1]='c' inserted. But forward path: insertion c from b[1], then snake b. Good. set x=1,y=1. initial snake x=1 includes a[0] -> reverse => =a,+c,=b. correct.

Deletion example: range(x-1, x_prev, -1) because x_after=x_prev+1. Check a=['A','B'], b=['B']: D=1 deletion. d0 no? a0 A b0 B no V0=0. d1 k=1 deletion from x_prev=0 x_after=1,y=0 snake a1=b b0=B -> x=2,y=1 done. Backtrack x=2,y=1,k=1. x_prev=v[0]=0. y_prev=0-(0)=0. snake range x-1=1 to stop=0 exclusive => xx=1 => =B. op '-','A'. set 0,0. correct.

Deletion with snake after deletion from common prefix: a=['a','x','y','z'], b=['a','y','z']; D=1 deletion x. d0 x=1. d1 k=1: x_prev=v0[0]=1, x_after=2,y_prev=1, snake x=2,y=1 match y => x=3,y=2; match z=>x=4,y=3. Backtrack: x=4,y=3,k=1. x_prev=1. snake range 3,2? range(x-1=3, x_prev=1, -1) gives 3='z', 2='y'. op '-' x. set x=1,y=1. initial snake range 0 -> =a. reverse =a,-x,=y,=z. correct.

Need ensure output of '=' from a and b same; use a[xx] safe if xx<n. In snake, x_after <= x <= n. For insertion y_after maybe y_prev+1 <= m. Good.

Now implement forward with parity arrays.

Detailed forward algorithm:

def diff_lines(a,b):
    n=len(a); m=len(b)
    if n == 0:
       return [('+', line) for line in b]
    if m == 0:
       return [('-', line) for line in a]
    history=[]
    # d=0 snake
    x=0; y=0
    # Use while loops; comparing local variables for speed.
    # For large identical, while may be 20k ok.
    while x < n and y < m and a[x] == b[y]: x+=1; y+=1
    if x == n and y == m:
       return [('=', line) for line in a]
    history.append([x])
    # max_d = n + m
    # Need maybe if one side exhausted? Continue until x>=n and y>=m.
    prev = [x]; prev_off = 0? Actually parity length d+1 with implicit d.
    for d in range(1, n+m+1):
        curr = [0] * (d + 1)
        # prev length d (for d-1)
        prev_len = d
        # We need previous values for k in range(-d,d+1,2). We can loop over idx? k = -d + 2*idx, idx=0..d.
        # For each idx:
        # k = -d + 2*idx
        if k == -d: x = prev[idx] (because k+1 = -d+1 => idx in prev = (k+1 + (d-1))//2 = (-d+1+d-1)/2 = 0? Actually prev index for k+1: (k+1 + d-1)//2 = (k+d)//2. For k=-d: (0)//2=0. Yes prev[0].)
        elif k == d: x = prev[idx-1] + 1? For k=d: k-1 = d-1 => prev index=(d-1+d-1)//2=d-1 = idx-1 (since idx=d). yes.
        else:
          # idx in [1..d-1]
          left = prev[idx-1]  # k-1
          right = prev[idx]   # k+1? Let's check for general: current k = -d+2idx. k+1 = -d+2idx+1. Prev d-1 offset: index=(k+1 + d-1)//2 = (-d+2idx+1+d-1)//2=idx. k-1 index=(k-1+d-1)//2 = (-d+2idx-1+d-1)//2=idx-1. Yes.
          if left < right: x = right else x = left +1
        y = x - k
        while x < n and y < m and a[x] == b[y]: x+=1; y+=1
        curr[idx]=x
        if x >= n and y >= m:
            history.append(curr)
            D = d
            break
    else: should never (max_d=n+m).
    # Backtrack
    x=n; y=m; ops=[]
    # history length D+1. history[d] length d+1.
    for d in range(D,0,-1):
        k = x - y
        # current should have idx = (k+d)//2? Could assert.
        prev = history[d-1]
        # condition: if k == -d or (k != d and prev value k-1 < prev value k+1)
        # get prev indices: idx_left = (k-1 + d-1)//2 = (k+d-2)//2; idx_right = (k+1+d-1)//2=(k+d)//2
        if k == -d:
            # insertion
            idx = (k + d) // 2? For k=-d idx=0? But we don't need curr idx maybe.
            x_after = prev[idx_right] where idx_right=(k+d)//2 =0. Good.
        elif k == d:
            deletion
        else:
            idx_right = (k+d)//2? Let's check for prev index right = (k+d)//2 (as above). idx_left=idx_right-1.
            if prev[idx_left] < prev[idx_right]: insertion else deletion.
        For insertion:
          x_after = prev[idx_right]
          y_prev = x_after - (k + 1)
          for xx in range(x-1, x_after-1, -1): ops.append(('=', a[xx]))
          ops.append(('+', b[y_prev]))
          x, y = x_after, y_prev
        else deletion:
          x_prev = prev[idx_left]
          y_prev = x_prev - (k - 1)
          for xx in range(x-1, x_prev, -1): ops.append(('=', a[xx]))
          ops.append(('-', a[x_prev]))
          x,y=x_prev,y_prev
    # initial snake
    for xx in range(x-1,-1,-1): ops.append(('=',a[xx]))
    ops.reverse()
    return ops

Need ensure when k != -d and k != d, prev indices valid. For current k valid at distance d? During backtrack from final, current k may not have parity same as d? In Myers k parity changes with d; each edit changes k by ±1, so d and k parity same. Starting k=n-m, d=D parity same (since D parity equals n-m mod 2? In edit distance, D ≡ n-m mod 2 yes). After each step, set to previous k = k±1 and d decreases, parity preserved. Good. So idx_right integer.

Potential bug: Backtrack condition using prev values when k==d and k==-d. But what if both possible? At boundaries only one valid. Good. However there may be ties when left == right. Forward condition uses left < right for insertion else deletion. This chooses deletion on tie. Backtrack must match. Good.

Need ensure x,y variables after removal correspond to valid prev indices for next iteration. Let's test insertion formula with k maybe not in current history? Use prev indices derived from prev d-1. x_after = prev[idx_right] (k+1). y_prev = x_after - (k+1). Good. Deletion x_prev = prev[idx_left] (k-1). y_prev = x_prev - (k-1). Good.

Need handle initial snake: After loop, current x,y are end of d=0 V (not necessarily equal to history[0][0]? It should). We can append matches a[0:x] reversed. But if there was no d=0 snake? x=0. Good. Could also use initial_snake = history[0][0] and maybe y=history[0][0]. But x,y should equal. To be safe, use for xx in range(x-1,-1,-1). Need ensure a[xx] matches b[xx] for initial prefix; yes.

Edge cases:
- n=0 or m=0 handled. But if n=0,m>0 history? Return all +. If m=0 return all -.
- identical non-empty handled by d=0 and return. But what if a and b not identical but D=0 impossible.
- a,b empty return [].

Could we optimize output building to reduce list reverse? ops length = LCS + deletions + insertions <= n+m. For 20k, okay.

But need think about performance of inner while with list indexing. Could localize a,b,n,m. Use while x < n and y < m and a[x] == b[y]. Python while per char; if lines strings long, equality cost. okay.

Potential issue with history forward break: We store curr when final found. But if final found at k maybe not history[d][idx]? We set curr[idx]=x before check. Append curr. Backtrack assumes final x=n,y=m. If snake ended with x>=n and y>=m but maybe x > n? We don't cap, can x become >n? Let's examine. while condition x<n prevents increment beyond n. So x <= n always. In forward before while x may exceed n due to prev+1. Example a shorter? If x=prev+1 could be n+1? prev is furthest x on previous diagonal, cannot exceed n? If previous state already x=n, and choose deletion (prev+1) yields n+1. y=x-k maybe could be <m? Then while no (x<n false), curr stores n+1 >n. Could happen for states beyond grid. Then final condition x>=n and y>=m might become true with x=n+1,y>=m, but current point is outside (x>n). Backtracking from x=n (we set start x=n,y=m) might not match stored V final x if >n? In standard, if x >= n and y >= m, x might be n and y? If x=n+1 but y>=m? Is that possible while valid? Deletion when x_prev=n: means previous state has x=n but maybe y<n? Then deletion x=n+1. If y>=m? y = x-k. Could be. But final actual path should end at (n,m). If stored x=n+1, then y = n+1-k >=m. There is a path that reaches beyond grid; but minimal edit path to (n,m) still exists. Standard algorithms often stop when x >= n and y >= m; x can exceed n? Let's test with n=1,m=2,a=['a'],b=['a','b']. d0 snake x=1,y=1 not final y<m. d1: k=-1 insertion from x=1,y=2: x<=n, y=2 => final x=1,y=2. k=1 deletion? x_prev=1? from V0? Actually V0[0]=1, k=1 x=2,y=1, x>n. if loop order k=-1 first final. We break. x not >n. But if loop order k=1 first? range -d to d, k=-1 first. Usually insertion first at negative. Could x>n be assigned for non-final then break later. Backtrack start n,m and history values maybe >n for some states. Could that break? Need examine. Standard Myers uses array initialized V[1]=0 and allows x>N? Many implementations if x>=N and y>=M return after while; x could be N+1 only if previous V=N and choose deletion. But if previous V=N and y maybe <M, deletion could produce x=N+1, y=N+1-k. If y>=M, then path found? But actual point (N+1, y) not in grid. However if y>=M, then from previous point (N, y-1) to (N+1,y) is deletion outside a; not valid. But maybe previous point had x=N, y-1, so deletion invalid. Standard algorithm still returns because it has found path to end or beyond? Is that okay? Need check correctness with grid boundaries. In Myers algorithm for edit distance, V[k] furthest x such that y=x-k and 0<=x<=N,0<=y<=M. We should not allow invalid x>N or y>M? We can restrict. In forward, if x > n, set x = n? But if x>n and y maybe valid? Let's derive robust algorithm with boundary clamping or skip invalid.

Option: At computation, after choosing xp, if xp > n: xp = n. Also if xp <0? xp can't negative? But if y <0 maybe invalid? In Myers, diagonals with y<0 correspond invalid; we can still compute but maybe not needed. To avoid invalid states, we could restrict k range to those where y=x-k within 0..m maybe; but standard works with no restrictions due to V init. For correctness of backtrack, storing invalid >n may cause issues. Better to cap and also maybe ensure y not out of range? Let's think.

If x_after chosen >n, actual valid path on that diagonal cannot exceed n. Setting x=n might preserve furthest valid x. But y = n - k. If y > m, still invalid. Could then while not run, store n. If y>=m and x==n? We might think final but actual y might >m not equal m; start x=n,y=m final, backtrack may not match V. If y>m, path to (n,m) not reached; but condition x>=n and y>=m would be true incorrectly if y>m. Standard condition requires x >= n and y >= m? But if y>m with x=n, maybe invalid. However if y>m, can there be valid snake? y=m is max. We shouldn't accept unless x==n and y==m? In Myers with x,y can overshoot both; if x>=n and y>=m, because snake increments both equally, and start from valid grid, it might imply reached or passed corner. But overshoot could be both >? Need check. If y=m+5 and x=n+5? But we cap x=n, y=n-k might be m+5 if k=n-m-5. Could final condition true falsely. Need more careful.

Maybe simpler: Use standard initialization V[1]=0 and max k bound with array of length 2*maxD+1, but do not store history for invalid states? Classic implementation:
V = [0]*(2*max+1); V[1]=0
for D in range(max):
  for k in range(-D,D+1,2):
    if k == -D or (k != D and V[k-1] < V[k+1]):
       x = V[k+1]
    else:
       x = V[k-1]+1
    y = x-k
    while x<N and y<M and a[x]==b[y]: x+=1; y+=1
    V[k]=x
    if x>=N and y>=M:
       # path
It can set x>N? In many implementations, if x=N and y=M-1, for k? Let's test. Suppose N=1,M=2 above. d0 V[0]=1. d1 k=-1 insertion x=V[0]=1,y=2 final, break before k=1 if loop ascending? range -1,1; yes. If final found at k=1 first (range ascending doesn't). For k=1, from deletion x=V[0]+1=2,y=1, not final. So x>N stored. Later d2 k=0: prev V[-1]? At d1, V[-1] maybe 1, V[1]=2. For k=0, left=1 < right=2 => insertion x=V[1]=2, y=2, while x<N false, final x>=1,y>=2 true. But stored V[0]=2 (>N). Backtrack from N,M=1,2 with history where V[0]=2? Let's test if this scenario occurs? d0 V0=1. d1: V[-1]=1, V[1]=2 (since no break at k=-1? Wait if final at k=-1, break D=1, no d2. So not occur if break when first final. Since k=-1 final at d1, stop. Good. If final not earlier, maybe x>N stored but later final with x>N? Could happen if final not found at boundary but later? Example N=1,M=3,a='a',b='a',b? d1 k=-1 insertion y=2 not final; k=1 deletion x=2. d2: k=0 insertion from k=1 x=2,y=2; k=-2 insertion from k=-1? Let's simulate b longer all not final until insertion k=-1 each step? Actually d0 x=1,y=1. d1 k=-1 x=1,y=2 not final (m=3), k=1 x=2,y=1. d2 k=-2 from k=-1 insertion x=1,y=3 final. Stop. x>N stored for k=1 but not used for final. Backtrack D=2 final k=-2; prev d1 uses k+1=-1 value 1 valid; then d1 uses k=-2 -> k=-d insertion; prev d0 value 1. No x>N. Good.

What if final found via state with x>N, no earlier final? Is that possible? Since if x>N on a diagonal, y=x-k. To have y>=M later. But if x>N, you've already passed N in x; can't be valid. There might be no earlier final because y<M. Then eventually insertion (down) increases y without changing x, could reach y=M with x=N+1, condition x>=N,y>=M true but invalid. Example N=1,M=2. At d1 k=1 x=2,y=1 not final (y<M). d2 k=0: insertion from k=1 x=2,y=2, condition true. But earlier final? d1 k=-1 insertion? For N=1,M=2, if a='x', b=['x','y']? d0 x=1,y=1; d1 k=-1 x=1,y=2 final yes. To avoid earlier final, need d0 not match first, so a0 != b0? Let a='x', b=['y','z']. d0 V0=0. d1: k=-1 insertion x=0,y=1 (not final M=2); k=1 deletion x=1,y=0. No x>N. d2: k=-2 insertion from k=-1: x=0,y=2 final? x=0<N but x>=N false; no. k=0: compare left=-1? V[-1]=0, right=1 => insertion from k=1 x=1,y=1 not final; k=2 deletion from k=1 x=2,y=0; no. d3: k=-1? Need final? This is all different length 1,2 D=3? Edit distance 3? Actually from 'x' to 'y','z': delete x insert y insert z D=3. No x>N final? Let's simulate: d0 V0=0. d1 V[-1]=0, V[1]=1. d2: k=-2 from -1 x=0,y=2; k=0 left=0<right=1 insertion x=1,y=1; k=2 deletion x=2,y=0. No final. d3: k=-3 insertion from -2 x=0,y=3; k=-1 left=-2? prev V[-2]=0, V[0]=1: left=0<right=1 insertion x=1,y=2 final? x=1=N,y=2=M final, x not >N. good.

Could x>N become final with y>=M before valid path? Suppose N=1,M=1 all different. d1 k=-1 x=0,y=1 (x>=N false); k=1 x=1,y=0 (y>=M false). d2 k=0 insertion from k=1 x=1,y=1 final valid. x not >N. Because deletion from k=-1? For k=0 left=V[-1]=0, right=V[1]=1 -> left<right => insertion, valid. If tie? not.

Seems final path usually valid. But for safety in backtracking, if prev values can exceed n, our snake loops with x maybe >n? Start backtrack x=n, not final V if V final >n? If algorithm break at state with x>N,y>=M, then final x not n. We would still start n,m but history inconsistent. Could avoid by checking final condition as x == n and y == m? But while loop stops at x==n,y==m exactly if started from valid grid. However forward may overshoot due to invalid edit; we can prevent overshoot.

Let's implement forward with boundary checks to avoid invalid states. We can compute x_candidate; then if x_candidate > n: maybe skip? But need furthest valid x. If k such that no valid point (y<0 or y>m), skip? Classic with arrays handles but maybe complex.

Simplest: Use classic full array with maxD and V[1]=0, and stop only when x >= n and y >= m. Many accepted implementations. Backtrack also uses those V and standard. They don't worry about x>N? But backtracking start x=n,y=m, and final V may >n? Standard backtrack uses history[d][k] maybe >n? If final x not n, they still set x=history[D][k]? Some reconstruct from V values, maybe adjust. Our backtrack uses x=n,y=m. Could fail if final V != n,m. We can instead set final x = history[D][(n-m+D)//2]? But if overshoot, x might not n. Need output script for grid. Better ensure final V == n at final.

Can add clamping after choosing candidate:
if xp > n: xp = n
Also ensure if xp <0? xp nonnegative.
Then y = xp - k. But if y > m, then while no; store xp. But y > m invalid. For final condition, check x == n and y == m? If we clamp x=n but y>m, not final. But maybe there is no valid path through that k, but storing n with y>m could corrupt comparisons? Could still store furthest x but y invalid. Could restrict k range based on y: valid k such that 0 <= x-k <= m. But x unknown.

Alternative: Use bounded loops over k where states are within grid: k from max(-d, m? hmm). But standard uses V values to avoid invalid.

Maybe easier: Use full classic with sentinel V[1]=0 and after candidate if x > n: x = n; y = x-k. If y > m, then don't consider final. But storing may affect future choices. Could cap y too? If x=n and y>m, invalid; but furthest valid x on diagonal should be max x such that y<=m, i.e. x <= m+k. So xp = min(xp, n, m+k). Also require xp >= max(0,-k)? Actually y>=0 => x>=k if k positive? y=x-k>=0 => x>=max(0,k). But furthest x if below min invalid? We can clamp to [min_x, max_x] where max_x = min(n, m+k), min_x = max(0, k). If candidate < min_x, no valid state; but in standard candidate may be invalid (y<0), but then V value maybe from invalid path; can cause issues? We can set x = min_x? Not sure.

Could use dynamic programming fallback for small D? Another approach: Use Hunt-Szymanski? Not needed.

Let's verify classic algorithm with full V and history using parity arrays but no overshoot? Since x from prev candidate: prev values stored after snakes within n and y maybe <=m? We might store invalid x due to edit from valid state but y within? Deletion candidate x_prev+1. If x_prev=n and x_prev valid at previous d, y_prev <=m. Deletion candidate x=n+1. If we clamp to n, then y=n-k. But actual edit from (n,y_prev) invalid (x out of range). But that state was on boundary x=n; should not allow deletion beyond n. We can disallow deletion if x_prev == n (i.e., no a line left). Similarly insertion if y_prev == m (x_prev? y_prev = x_prev-(k-1) == m) then insertion invalid? Wait forward choose from prev k±1. If choosing deletion (x=V[k-1]+1), if V[k-1] == n, invalid deletion. If choosing insertion (x=V[k+1]), insertion valid if y_prev < m, i.e. x_prev - (k+1) < m. If not, invalid. Classic algorithm may still choose invalid but not lead to true final? But for robust, we can implement valid moves only.

Forward with valid moves using parity arrays:
For each current k (diagonal) after one edit, we can compute two possible predecessor x values if edit valid, choose max x? Myers furthest reaching path chooses if predecessor on k-1 (deletion) or k+1 (insertion). It chooses max x? Classic condition left<right chooses from k+1 if that gives x=right, else from k-1 x=left+1. Actually both candidate x: from k+1 insertion candidate x=right; from k-1 deletion candidate x=left+1. It chooses max (if right > left+1? Condition left<right equivalent right >= left+1). For tie chooses deletion? left<right; if right == left+1, both same; choose deletion. So we can compute candidates and take max, but validity constraints:
- Deletion from k-1: require x_prev = V[k-1] < n (since can delete a[x_prev]) and y_prev = x_prev-(k-1) between 0,m. V states valid if stored clamped; also require y_prev maybe within. Candidate x=x_prev+1, y=y_prev. Since edit valid if x_prev<n. Candidate after edit: x_cand=x_prev+1; y_cand=x_cand-k = y_prev. So y within.
- Insertion from k+1: require y_prev = x_prev-(k+1) < m (can insert b[y_prev]) and x_prev within. Candidate x_cand=x_prev, y_cand=y_prev+1.
Then choose candidate with larger x_cand (tie maybe deletion). Then snake. But we must ensure predecessor states valid. If invalid, candidate = -1 (or <). Choose max. This may avoid invalid x>n. But does Myers algorithm require considering invalid moves? No, edit script valid cannot go outside grid. This is equivalent to bounded edit distance.

But classic furthest-reaching paths assume start V[1]=0 for k=1 when d=1. Our valid candidate approach for d=1 k=1: predecessor k-1=0, prev V[0]=0 from d0. Valid deletion if 0<n. Good. For k=-1: insertion from k+1=0, prev V[0]=0, y_prev=0 - 1 = -1? Wait k=-1 current, predecessor k+1=0. y_prev = V[0] - (k+1) = 0-0=0. Insertion valid if y_prev < m. Good candidate x=0,y=1. For d=1 k=-1 valid. What about insertion from k+1 for negative k at d? If k=-d and predecessor k+1=-d+1 valid at d-1? Yes. But insertion validity y_prev < m.

Need also d=0 valid state after initial snake: x0,y0 within, yes. Store V[0][0]=x0.

For each d, curr length d+1. For each idx (k=-d+2idx):
  cand_x = -1
  # left/deletion from k-1 if idx>0? (k != -d)
  if idx > 0: # k-1 exists in prev
     x_prev = prev[idx-1]
     # y_prev = x_prev - (k-1)
     if x_prev < n: # deletion valid
         cx = x_prev + 1
         # cy = x_prev - (k-1) = cx-k
         # Also cy within? If prev valid and x_prev<n, y_prev <= m? prev y = x_prev-(k-1). But if k? Since prev state valid on its diagonal, y within [0,m]. cy same. Good.
         if cx > cand_x: cand_x = cx
  # right/insertion from k+1 if idx < d? (k != d)
  if idx < d: # k+1 exists in prev
     x_prev = prev[idx]
     y_prev = x_prev - (k + 1)
     if y_prev < m: # insertion valid; x_prev within n
        cx = x_prev
        if cx > cand_x: cand_x = cx
  # tie? If insertion and deletion same x, classic tie chooses deletion? The condition left<right chooses insertion only if right > left. Candidate x: insertion cx = right; deletion cx = left+1. If right == left+1, tie. Classic chooses deletion. Our max with if cx > cand not >=: if process insertion first and then deletion? Need match classic tie. We can set best source flag. To match classic: choose insertion if insertion candidate x > deletion candidate x; else deletion if exists. But if one invalid, choose valid.
  # Then x=cand_x; if cand_x<0? Could no valid move on that diagonal. Set x = -1? Then snake none. But then future comparisons with -1? Need valid.

Can there be no valid move for a k at d, but later valid paths through it? If no valid point on that diagonal within grid after d edits, V should be -inf. We can store -1. For comparisons, left<right with -1 okay. But when predecessor -1, x_prev=-1 and x_prev<n, candidate 0 maybe invalid because predecessor invalid. Need check x_prev >=0. For deletion require x_prev >=0 and y_prev valid. For insertion require x_prev >=0. So require x_prev >= 0. Also y_prev within [0,m], but if x_prev=-1 then y_prev maybe -1-(k+1). Require x_prev >=0.

But also need ensure y_prev for deletion nonnegative? prev state valid on k-1 means y_prev = x_prev-(k-1) within [0,m]. If x_prev could be less than k-1 negative? If x_prev>=0 but diagonal k-1 positive >0, y_prev negative. That means prev state invalid (shouldn't be stored as nonnegative if invalid?). Need store valid x for diagonals where y=x-k in [0,m]. For previous d-1, we should only assign curr valid x >= min_x. If diagonal has no valid point, store -1. Then predecessor invalid if x_prev <0. But if x_prev nonnegative but y_prev negative? Should not happen if state valid; but due to candidate clamping? Need enforce when assigning curr: after snake, x valid means y=x-k within [0,m]. Our candidate edits from valid predecessor ensure after edit within. Initial d0 within. So good.

However this valid-move variant may deviate from standard Myers condition? It computes max x among valid moves; ties choose deletion. It should still find shortest edit script. It is a standard DP furthest reaching with boundaries. Should be correct. But need ensure it explores enough: If a diagonal at d has no valid state, but later diagonal can be reached by invalid move? No invalid moves shouldn't be in edit script. Good.

But performance? More condition checks. For D=2000, 2M iterations, okay. Need avoid complex while? Fine.

Can we still use simpler classic with no invalid? Let's test valid variant on all different 1000. d0 V0=0. For k=-d insertion: previous x=0, y_prev = 0 - (-d+1) = d-1. Valid insertion if y_prev<m. For d up to m maybe. For negative k beyond m, no valid. Similarly deletion valid if x_prev<n. It will store only within triangular grid. It should find D=n+m when completely different? Edit distance = n+m (delete all insert all). For n=m=1000, D=2000. But k parity? It will explore diagonals with valid states. Number states maybe (d+1) until d up to max(n,m)? Actually with boundary pruning, for d > max(n,m), states only near k range where x,y within. Total states O(n*m?) Wait if n=m=1000, number valid (d,k) states with edit distance d and within grid could be O(n*m) ~1e6? Let's estimate: For d from 0 to n+m, number valid diagonals ~min(d, n+m-d, ...). Sum maybe ~1e6? But standard full also ~2M. Fine.

Need check shortest script: Myers O(ND) works with bounded grid.

Potential issue with tie-breaking and output minimality. Any shortest script okay, but must ensure '=' count maximal. Ties fine.

Let's test valid variant manually for a=['a'],b=['b']: n=1,m=1.
d0 V0=0.
d1:
 idx0 k=-1: idx<d (0<1) insertion from prev[0]=0 y_prev=0-(0)=0<m valid cx=0; no left. x=0 y=1, no snake, curr[0]=0. Not final x=0<1.
 idx1 k=1: deletion from prev[0]=0 x_prev<1 cx=1; insertion none. x=1 y=0 curr[1]=1 not final.
d2:
 idx0 k=-2: insertion from prev[0]=0 y_prev=0-(-1)=1 not <m (1<1 false); no valid -> x=-1 curr[0]=-1.
 idx1 k=0: left prev[0]=0 deletion x_prev<1 cx=1; right prev[1]=1 insertion y_prev=1-(1)=0<m valid cx=1; tie choose? If we choose insertion? Classic condition left=0<right=1 => insertion. Candidate insertion x=1. We'll choose if cx > cand: deletion cand=1, insertion cx=1 not > -> deletion. Classic tie? For k=0 at d2 left=0,right=1, left<right true insertion! Wait classic condition compares V[k-1]=0 < V[k+1]=1, so chooses insertion x=right=1. Deletion candidate is left+1=1. Tie in x but classic chooses insertion because right > left (not right >= left+1?). Since left+1=1, right=1 tie. Condition left<right true. So our condition should match: choose insertion if insertion_cx > deletion_cx? Here insertion_cx=1, deletion_cx=1, not >, so we'd choose deletion, different path but still shortest. Any shortest okay. But backtracking condition must match our forward to reconstruct valid path. If we choose deletion, backtracking at k=0,d=2: condition left<right? That would say insertion, inconsistent if history was from deletion. We need either make forward tie insertion to match standard, or backtrack condition based on candidates chosen? We don't store source. Could choose insertion on tie to match standard: if insertion exists and (deletion not exists or insertion_cx >= deletion_cx) and insertion_cx not? But classic condition left<right: insertion if right > left. This is equivalent insertion_cx = right, deletion_cx=left+1. If right == left+1, insertion chosen because right > left (unless left+1>right, i.e. left>=right -> deletion). So insertion chosen when right >= left+1, i.e. insertion_cx >= deletion_cx. Deletion when left >= right, i.e. deletion_cx >= insertion_cx+1? Actually if left=right, deletion cx=left+1 > right; deletion chosen. So tie in candidate x (right=left+1) chooses insertion. Thus to match standard, choose insertion if right >= left+1 and valid, else deletion. Or choose insertion if no deletion or insertion_cx >= deletion_cx (when both valid). But what if deletion_cx < insertion_cx? same. Good.

For valid variant with invalid candidates:
left = prev[idx-1] if exists else -inf; right = prev[idx] if exists else -inf.
deletion valid if left >=0 and left < n. insertion valid if right >=0 and right - (k+1) < m.
Standard condition: choose insertion if k == -d or (k != d and left < right). But if right invalid (y_prev >=m), classic might still choose insertion but invalid. With valid variant, need adjust. To match backtrack, easiest to store source? Could store history and during backtrack recompute using same forward decision function. We can define decision(k, d, prev) and ensure backtrack uses same. Then any consistent tie okay. But if forward valid variant may choose deletion for k=0,d2 all different, backtracking with same decision okay. Need ensure forward candidate chosen corresponds to a valid state and backtrack formulas still correct. Yes if we use same predicate to decide prev_k. But if we use max candidate, predicate must know which candidate. We can store no source and recompute from prev and k,d using candidate values and validity. It may choose source. Need ensure state at d was assigned from that source. If we assign curr[idx] = chosen candidate x. Backtrack recomputes same source given prev and current k? It should because curr x not needed for decision except maybe if multiple candidates produce same x but validity? If decision deterministic. But there is possibility chosen candidate x = -1 invalid; backtracking shouldn't go through invalid states because final path valid; at backtrack states from final path, source valid. Good.

Alternatively store snapshots as full V classic and use standard conditions; simpler. But invalid overshoot concerns. We can maybe use standard with history and still backtracking start n,m; if final V overshoots, maybe not occur with break order? But valid variant safer.

Let's formalize valid Myers:
For d=0:
  x=0; y=0; while match; store x.
For d>=1, curr = [-1]*(d+1). For idx=0..d, k=-d+2*idx.
  best_x = -1
  # Deletion (from k-1) if idx > 0:
     left = prev[idx-1]
     if left >=0 and left < n:
        # y_prev = left - (k-1). But need y_prev within [0,m]? Since prev state valid if left>=0? We need ensure. For valid previous state, yes but left could be nonnegative but y_prev > m? Let's check if previous state could be nonnegative but invalid y? We assign only valid, so okay. But if previous diagonal k-1 positive, min x = k-1, left may be less but y negative? Could happen if previous state invalid stored -1. If left>=0 but k-1 > left, y negative -> invalid previous? Did we ensure previous stored only valid? Yes if no valid point, curr idx remains -1. So left>=0 implies y_prev within. But could left>=0 but y_prev>m? no if valid.
        cand = left + 1
        # cand <= n since left<n. y=cand-k = y_prev within.
        best_x = cand
        source = 0? (delete)
  # Insertion (from k+1) if idx < d:
     right = prev[idx]
     if right >=0:
        y_prev = right - (k+1)
        if y_prev < m: # and y_prev>=0? valid prev ensures y_prev in [0,m] on prev diagonal? Wait right is x on k+1, y_prev = right-(k+1). valid prev state if >=0. So yes. But right-(k+1) could be negative? Shouldn't.
           cand = right
           if cand > best_x or (source delete and cand == best_x and ???): Need choose source deterministic.
We want choose insertion if cand >= best_x? But if best_x from deletion = cand, classic tie? Let's set source: if insertion valid and (best_x < 0 or cand >= best_x): choose insertion. But if best_x from insertion with cand larger and deletion later? We process deletion first. Using cand >= best_x will switch to insertion on tie. Good. Does this match classic with invalid boundaries? It chooses insertion whenever insertion candidate x >= deletion candidate x. Candidate x insertion=right, deletion=left+1. So insertion if right >= left+1. Classic condition left < right -> right >= left+1 (integers). Matches. Good.
  # But what if deletion invalid but insertion valid with cand <0? right>=0 ensures cand>=0. Good.
  curr[idx]=best_x (valid candidate)
  if best_x >=0:
    y=best_x-k
    while x<n and y<m and a[x]==b[y]: x++,y++
    # after snake, is x still valid? while stops when mismatch or boundaries; y=x-k after increments; if x<=n,y<=m. Good.
    curr[idx]=x
  if x == n and y == m: found. But if best_x=-1 no snake.

Need ensure after candidate best_x maybe x valid but y could be >m? Insertion valid y_prev<m; after insertion y_prev+1 <=m. Deletion valid y_prev <=m. Candidate y = y_prev (delete) or y_prev+1 (insert) within. Good.

But there is a subtlety: In insertion candidate from right, if y_prev < m but right could be n? Insertion doesn't increase x, okay x=n,y_prev+1 maybe >m? valid if y_prev<m. x=n,y<=m valid. Good. Deletion from left<n, okay.

Does this valid variant still guarantee O(ND) and finds minimal? It is equivalent to bounded furthest reaching; yes.

Need think about initial d=0: if no valid? always valid. But if n,m positive. For identical, return.

Backtrack with same decision:
At backtrack, for current (x,y), d. Need choose source using prev and k. But if current x may be less than candidate best_x? Actually current x after snake. The source decision for state (d,k) only depends on prev values and k, not snake. It matches forward. However what if there was no snake and curr x = candidate. Good. If multiple states on same k have same curr x but source? Decision deterministic. Backtrack state (x,y) should be the furthest x for that d,k; but after snake, curr[idx] = furthest. We set x to curr? Backtracking starts at n,m and for each step we need the state (d,k) that is on path. Does its x equal history[d][idx]? It should if we followed a furthest-reaching path. Standard backtrack using condition and setting x,y to candidate start works. But our x,y after removing source is previous end-of-snake, not necessarily x_after? Let's use same formulas. Need ensure decision using prev values and k yields source chosen at forward. Good.

But because we may store invalid states as -1, when backtracking, idx_right/left might be -1. For path states, chosen candidate valid. If tie? decision insertion if insertion valid and right >= left+1. We can implement decision function:
def came_from_insertion(d, k, prev):
    # prev length d (for d-1)
    # if k == -d: idx_left invalid; insertion if right exists and valid? But forward would have chosen insertion if valid. For path, yes.
    if k == -d: return True
    if k == d: return False
    idx_right = (k + d) // 2
    idx_left = idx_right - 1
    left = prev[idx_left]
    right = prev[idx_right]
    # Need forward decision validity:
    # deletion valid if left >=0 and left < n
    # insertion valid if right >=0 and right - (k+1) < m
    # choose insertion if insertion valid and (not deletion valid or right >= left+1)
    # But if one invalid, choose other. Need match forward candidate source.
    # If both invalid cannot be path.
    # Need compare cand_x: insertion cand = right, deletion cand = left+1.
    insert_ok = right >= 0 and right - (k + 1) < m
    delete_ok = left >= 0 and left < n
    if insert_ok and (not delete_ok or right >= left + 1): return True else False
But note forward candidate x comparison uses cand = right vs left+1, with source insertion if cand >= best_x (best deletion). If both valid and right >= left+1. If right valid but y_prev negative? right>=0 and valid prev ensures y>=0; but for safety insert_ok also right - (k+1) >=0? If prev invalid not stored, okay. Add 0 <= right-(k+1) < m. Delete_ok also need y_prev = left - (k-1) between 0,m and left<n. Since prev valid, but add left - (k-1) >=0 and <=m. However if left valid but y_prev maybe out? no. But for robust:
    y_left = left - (k-1) if left>=0 else -1
    delete_ok = left >=0 and y_left >=0 and y_left <= m and left < n
    y_right = right - (k+1) if right>=0 else -1
    insert_ok = right >=0 and y_right >=0 and y_right < m
But for insertion validity, y_right < m; y_right <= m? if y_right=m, inserting beyond m invalid. Good. For deletion, x_prev < n. Also y_left maybe <0. Good.

However this decision recomputation uses n,m and prev values. It must match forward exactly. In forward, insertion candidate valid if right>=0 and y_right < m and y_right>=0? Did we require y_right>=0? We didn't explicitly but prev valid. Could there be right>=0 but y_right negative due to prev invalid not -1? If invalid states stored -1. Good. Add y_right>=0 in forward for safety.

Forward candidate computation with validity:
for each idx:
 best_x = -1; src_del=False? But no need store.
 if idx >0:
   left = prev[idx-1]
   if left >= 0:
      y_left = left - (k-1)
      if 0 <= y_left <= m and left < n:
         best_x = left + 1
 if idx < d:
   right = prev[idx]
   if right >= 0:
      y_right = right - (k+1)
      if 0 <= y_right < m:
         cand = right
         if cand >= best_x: # insertion tie chooses insertion
             best_x = cand
 # after snake update curr[idx]=x

Wait if best_x initially -1, insertion cand=0 >= -1 true. If deletion best_x=1, insertion cand=1 chooses insertion. If insertion cand=0, deletion best_x=1, cand>=best? 0>=1 false, deletion. This matches left>=right? If left=1,right=0 -> deletion cand=2 insertion=0 choose delete. If left=1,right=1 -> delete cand=2 insert=1 choose delete. Classic: left<right? 1<1 false, delete. Good. If left=0,right=1 -> delete cand=1, insert=1 choose insert. Good.

But what if deletion invalid because left=n, insertion cand=left? Example previous state at x=n,y=m-? deletion invalid but insertion valid. Our code: delete_ok false, insert_ok cand maybe n >= best_x -1 choose insert. Good.

Need after snake set curr[idx]=x. But if no candidate (best_x=-1), curr remains -1. For final condition, only if curr[idx]==n and y==m. But we can check after snake if x==n and y==m. For x maybe n and y=m. Because x from candidate valid.

One issue: If candidate chosen insertion with x=right, then after snake, x increases. But in backtrack insertion x_after = prev[idx_right] = right. Good. Snake loop appends matches from x_after to final x. If forward chose insertion tie but final x after snake > candidate, backtracking uses decision based on prev. Good.

Another issue: In forward, if curr idx after snake x may be n and y=m, but for that d,k there might also be an alternative shorter? d fixed. Break returns first d with any final. Since loops d increasing, minimal. Within same d, if multiple finals, break first. Backtrack with chosen source and state? Need ensure final state (d,k) in history has x=n,y=m for that idx. If loop breaks at first final, yes. But if history for final idx maybe later overwritten? We break immediately after setting. Good.

Potential problem with using only one curr per d and history: When we store history[d] for forward with valid variant, some entries -1. Backtracking from final path uses history values. Good.

Now performance with validity checks and y computations. For D=2000, 2M iterations with several ifs; okay maybe 1s-2s. For 20k D=50 trivial.

But is valid variant still minimal when there are repeated lines? Yes.

Let's test valid variant on examples mentally.

Example a=['x'],b=['y','z'] n=1,m=2.
d0 V0=0.
d1:
 k=-1 idx0: insertion right=0,y_right=0-0=0<m, best_x=0. snake x=0,y=1, a0!=b1, curr0=0 not final.
 k=1 idx1: deletion left=0,y_left=0-0=0<=m left<n cand=1 best=1. insertion none. snake x=1,y=0; x<n false; curr1=1.
d2:
 k=-2 idx0: insertion from prev[0]=0 y_right=0-(-1)=1<m cand=0; curr0=0; snake x=0,y=2; a0!=b? x<n true y<m false no. not final.
 k=0 idx1: deletion from prev[0]=0 y_left=0-( -1?) k=0, k-1=-1, y_left=0-(-1)=1 valid <=m left<n cand=1; insertion from prev[1]=1 y_right=1-(1)=0<m cand=1 >=best -> insertion chosen x=1. snake x=1,y=1 no; curr=1 not final (y<m? m=2)
 k=2 idx2: deletion from prev[1]=1 y_left=1-(1)=0 left<n? 1<1 false invalid; curr=-1.
d3:
 k=-3: insertion prev0=0 y_right=0-(-2)=2 not<m invalid -> -1
 k=-1: prev d2 idx0=0 idx1=1. k=-1. deletion left=prev0=0 y_left=0-(-2)=2 <=m left<n cand=1; insertion right=prev1=1 y_right=1-(0)=1<m cand=1 >= best -> insertion x=1. snake x=1,y=2 final. D=3. Backtrack d3 k=-1 insertion: x_after=prev idx_right? For d=3,k=-1 idx_right=(k+d)//2=1; prev=history2 [0,1,-1?], x_after=1. y_prev=1-(0)=1. snake range x-1=0? current x=1, x_after=1, range(0,0,-1) empty. op '+', b[1]='z'. set x=1,y=1.
d2 current k=0. decision d2 k=0: prev hist1 [0,1]. insert_ok right=1 y_right=1-1=0<m true; delete_ok left=0 y_left=0-(-1)=1<=m true; right>=left+1? 1>=1 true insertion. x_after=prev[1]=1, y_prev=1-(1)=0. snake range x-1=0 to x_after-1=0? current x=1, range(0,0,-1) empty. op '+', b[0]='y'. set x=1,y=0.
d1 k=1: decision deletion. x_prev=prev[0]=0; y_prev=0; snake range x-1=0 to x_prev=0 exclusive empty; op '-', a[0]='x'. set 0,0. initial none. reverse: -x +y +z. correct.

Tie choices produce insertions before deletion? In reverse ops: at d3 +z, d2 +y, d1 -x -> reverse -x,+y,+z. Good.

Now, one more subtle issue: When we choose insertion in tie (right >= left+1), the candidate x equals deletion candidate. But then after snake, forward might set curr x > candidate. Backtrack decision still insertion. However the snake after insertion vs after deletion may differ? If candidate x same but source differs, y after edit differs? If x same but source insertion vs deletion on different prev diagonals, y after edit differs. Could after snake end at same furthest x on current diagonal. Does backtrack source insertion correctly identify inserted line and snake? Yes.

But is it possible that for a final state, decision recomputation at backtrack based on prev values chooses source that was not actually used to reach current (x,y) because current x after snake could be reached from both candidates and snake, and history only stores max x; decision based on candidate max x may choose one, but if candidate x < current x due to snake, still source decision same? It should be source that gave max candidate x. If both candidates had different max but snake made them converge to same final x? Furthest x after snake is monotonic in starting x; the candidate with larger starting x on same k will yield >= final x (because same diagonal, starting further ahead; snake could at least same). So final x determines source with max candidate. If tie candidate x, source chosen by tie; both start same x but y differs? Wait same k, same x => y=x-k same. If candidate x same, insertion from right and deletion from left+1 yield same (x,y) after edit? Let's verify: insertion x=right, y=x-k = right-k. Previous y_right = right-(k+1) = y-1. deletion x=left+1, y=x-k = left+1-k = left-(k-1)=y_prev. If candidate x equal, y same. Both lead to same edit point but different inserted/deleted lines? Example tie right=left+1: insertion from (right, right-k-1) inserting b[right-k-1] to (right, right-k); deletion from (left, left-k+1) deleting a[left] to (left+1, left-k+1) = (right, right-k). Same endpoint. The subsequent snakes same. But the edit line differs: insertion line b[y-1], deletion line a[x-1]. Both scripts length same and can be valid? In example all different a='x',b='y' at d2 k=0, endpoint (1,1). Insertion candidate from prev k=1 (x=1,y=0) inserts b[0]='y'; deletion candidate from prev k=-1 (x=0,y=1) deletes a[0]='x'. Both lead endpoint. Standard tie chose insertion; we choose insertion. Backtrack insertion op '+',b[0] and snake none. Good. But if we chose deletion, backtrack deletion op '-',a[0] would also be valid. As long as consistent. Our decision uses insertion tie. Good.

Now, output must be minimal number '='. Myers with valid moves should produce minimal. Need ensure not missing due to valid pruning when k boundaries. Let's test with a longer, b shorter.

a=['a','b','c'], b=['a','c'] d=1 deletion.
d0 snake a -> x=1.
d1 k=-1: insertion from x=1 y_prev=1-0=1<m (m=2) cand=1; snake x=1,y=2? a1=b,b2=c mismatch? y=m no, curr=-? x=1,y=2; no snake. not final y=m x<n.
k=1: deletion left=1 y_left=1-0=1<=m left<n cand=2; snake x=2,y=1 matches b,c -> x=3,y=2 final. D=1. Backtrack d1 k=1 deletion: x_prev=prev0=1; y_prev=1; snake range x-1=2 down to x_prev=1 exclusive => 2='c',1='b'; op '-' b? a[1]='b'. Wait op '-', a[x_prev]=a[1]='b'. set x=1,y=1. initial snake 0='a'. reverse =a,-b,=c. correct.

Now consider if no matches at all and n != m. e.g., a length 3, b length 1 all different. D=4? delete all, insert one. Algorithm should handle.

Backtracking details with history length D+1. For d loop, need idx_right and idx_left valid. In decision, if k == -d, we need choose insertion. But forward at k=-d only insertion could be valid; if it wasn't valid, state curr=-1 not path. For path, insertion ok. Backtrack insertion: idx_right = (k+d)//2 =0. x_after=prev[0]. y_prev=x_after-(k+1). This should be >=0. Good. If k==d, deletion: idx_left=(k+d)//2-1? For k=d, idx_right? (k+d)//2=d; idx_left=d-1. x_prev=prev[idx_left]. Good.

When current k not boundaries, idx_right=(k+d)//2 between 1..d-1? If d=1 no interior. Good.

Potential issue: history[d-1] values maybe not enough index if prev idx computed? Should be.

Now, output operation line values: For insertion, line = b[y_prev]. y_prev is index in b of inserted line. For deletion, line = a[x_prev]. x_prev index in a. For matches, line = a[xx]. Good.

Need ensure if we have initial x,y after backtrack maybe not equal history[0][0]? Suppose initial snake was chosen at d=0. After d loop, current x,y end of d=0 snake. Could use initial_x = history[0][0] and append matches a[0:initial_x] reversed. But if due to valid variant, current x may be initial_x. Could use current x to be safe. But if current x != initial_x due to bugs, initial matches might not be valid. Use current x,y; but need ensure y==x? d=0 diagonal k=0 so y=x. Since edit path ended at d0 with x,y. Good.

Could optimize output: Instead of reversing list of tuples, maybe build linked list? But okay.

Now, consider memory and speed of history as list of lists. If D=2000, 2M ints. With validity, many -1? Could use array('i') to reduce memory. But list of ints maybe okay. But we can further optimize: For history, only need previous values for backtracking all d. Need store all. Could store as array('i') for each d to reduce memory. But constructing arrays and accessing maybe slower. Let's evaluate. For 1000 all different, 2M entries. Lists: memory maybe okay (2M refs + int objects). But if values >256, each assignment creates int objects. For all different n=1000, values x up to 1000; many entries not unique? Each assignment x from prev or left+1. There will be int objects. 2M int objects ~56MB; refs 16MB; lists overhead for 2001 lists ~112KB plus allocated pointers; total maybe 80-100MB. Hidden memory maybe 128MB, could be tight. Use array('i') reduces to ~8MB for data plus overhead. But Python array access in loops might be slower but 2M okay. Need import array. Could store each history snapshot as list of Python ints during forward for speed, then convert to array after? That still holds both? Could append array(curr) where curr is array. Construct array from list? That creates list and array, maybe memory peak. But can construct curr as array('i', [-1])*(d+1)? Let's test: array('i', [-1]) * (d+1) creates array length d+1 filled -1. Or array('i', [0])? Need -1. Access/assignment array slower but manageable. For speed, list might be preferred. Could use list for current, then history.append(array('i', curr)) to store compact. But curr list exists; converting copies. Peak: current list length ~1000, negligible. history arrays 8MB. Good. For forward access, prev is array (if history[-1] array) after first? history[0] can be array('i',[x]). curr list for assignment, then array. But accessing prev array in inner loop slower than list. For D=2000, 2M accesses, okay. But maybe list history faster. Need balance.

Can we avoid history int objects by using list but store only current x values as Python ints; hidden memory likely okay. For 1000 lines, 2M ints maybe okay? 2M*28=56, list refs 16, list overhead maybe 16? Actually list object overhead 56 bytes each *2000=112KB; each list allocation length d+1 includes pointer array: sum 16MB. Total 72MB. Plus a,b strings, ops. Under 128 maybe okay. But for 2000 completely different? Requirement 1000 completely different; D=2000. If test 2000 completely different? D=4000, entries 8M ints ~224MB+64=288MB too high. But spec only 1000. Could use arrays to be safe.

Maybe implement with arrays but still fast enough? Let's estimate inner loop with array accesses: 2M iterations * several array get. In Python, array get returns Python int; slower than list by maybe 1.5-2x. 2M not large. For 20k D=50 no issue. For completely different 1000, 2M, under 6s easily. Even if 0.5-1s. Use array for memory safety. But importing array standard. Could use module array.

Need consider array type 'i' signed int at least 2 bytes? Usually 4. n,m up to maybe large 20k, fits. D up to 40k. If n,m up to >2^31 unlikely. Could use 'l' for safety but 8 bytes maybe. 'i' okay for standard? array('i') signed int minimum 2 bytes but on typical 4. 20k fine. Could use 'q' for guaranteed 8 but memory 16MB; okay. But 'i' enough. For portability maybe 'i'.

Potential performance issue: history.append(array('i', curr)) for every d. array construction from list copies. For D=2000, total 2M conversions, okay. But current list of ints and array stores compact. During forward, prev = history[-1] is array. curr = [-1]*(d+1) list. Use prev[...] array. At end history.append(array('i', curr)). history[0]=array('i', [x]). Good.

Alternative: Use list for current snapshots but store in array only every? Need backtracking all. array okay.

But if using array, in backtracking decision needs prev array. Good.

Need consider output ops as list of tuples. For large 20k, 20k tuples okay. For all different 1000, 2000 tuples.

Could further optimize snake while by caching a,b locals. But if using for loops with reversed range, fine.

Let's think about pathological case where D large ~n+m=2000 for n=m=1000. With valid variant, number of states maybe less than 2M. But inner while none. Decision with array access and boundary checks. Good.

Could we include common prefix/suffix trimming to reduce D and history? That may improve and simplify? But must output full script. We can trim common prefix and suffix before Myers, then diff middle, then combine. This can dramatically reduce D for lists that differ in 50 places but have long prefix/suffix? Myers d0 already handles prefix, but suffix not. Trimming suffix can reduce D and snakes. But careful with repeated lines. Common suffix trimming safe: remove equal prefix and suffix, diff middle, then output prefix '=' middle suffix '='. For shortest script, common suffix can be fixed? In edit distance, there exists shortest script preserving common prefix/suffix? Yes for standard diff? Common prefix and suffix can be kept. If lines repeat, choosing common suffix after prefix safe. This reduces sizes. But if we trim suffix, need adjust indices for output? We can just build prefix ops, diff middle, suffix ops. The diff middle on slices? Slicing copies lists O(N) but okay for 20k; but for memory maybe use indices in Myers? Simpler maybe implement prefix trim, suffix trim and pass sublists. For 20k with 50 differences, slices of middle maybe small if differences clustered? But if scattered, suffix length maybe small. But prefix d0 already. Suffix trimming can reduce long identical trailing. However slicing creates new lists; for 20k okay. For completely different no trim. For identical, returns quickly. Could do manual prefix/suffix indices to avoid slicing? But then diff on sublists requires copy or index offsets. Could implement diff_lines to handle by making inner function with a,b lists already trimmed. Slicing 20k fine. But for 20k differ 50 places, prefix maybe first diff at 50, suffix maybe last diff at 19950, middle length 19900; slicing copies 20k anyway okay. It might reduce D from e.g. D=100 to maybe still 100; no issue.

Trimming suffix might break Myers valid? no. Need ensure if after prefix trim i<=j, if middle empty. Algorithm:
def diff_lines(a,b):
  n=len(a); m=len(b)
  # common prefix
  p=0; limit=min(n,m)
  while p<limit and a[p]==b[p]: p+=1
  # common suffix after p
  sn=0
  while sn < min(n-p,m-p) and a[n-1-sn]==b[m-1-sn]: sn+=1
  mid_a = a[p:n-sn]
  mid_b = b[p:m-sn]
  # if mid empty: output = for prefix? But if both empty after prefix/suffix? Need output all '='? If mid_a and mid_b both empty but prefix + suffix might overlap? Need handle carefully.
  # If n==m and all lines equal? p could n; suffix 0. If mid_a empty and mid_b empty, output [('=',line) for line in a]. But if after prefix and suffix with p+sn > n? Could overlap? Example a=['a'], b=['a']: p=1; suffix while sn<0? no. mid empty. output all '=' length1. Example a=['a','b','c'], b=['x','b','c']; p=0? a0!=b0; suffix sn=2 ('c','b'); mid_a=['a'], mid_b=['x']; output prefix none, diff mid (-a,+x), suffix =b,=c. Good.
  # But if prefix and suffix overlap when lists identical? p=n, suffix sn<min(0,0)=0. no overlap. If a=['a','b'], b=['a','c','b']: p=1 (a); suffix sn=1 (b); mid_a=['b'], mid_b=['c']; output =a, -b,+c, =b. Minimal D=1. Good.
  # If p and suffix cover entire equal middle with repeated? e.g., a=['a','b','b'], b=['a','b'] p=2? a0 a, b0 a; a1 b,b1 b p=2. suffix sn<min(1,0)=0. mid_a=['b'], mid_b=[]; diff -> -b; output =a,=b,-b. But LCS length 2? Actually a length3 b length2: 'a','b','b' -> 'a','b', one deletion. Could suffix trim have chosen suffix sn=1? after p=2 no. correct.
  # If common prefix and suffix could produce non-minimal if overlap? Usually prefix then suffix safe because any common prefix can be aligned, and after fixing prefix, common suffix can be aligned. Yes.

But suffix trimming can cause issue with repeated lines: Suppose a=['a','b','a'], b=['a','a']; common prefix p=1 ('a'), common suffix sn=1 ('a'), mid_a=['b'], mid_b=[]; output =a,-b,=a. Minimal D=1. Good. Suppose a=['a','a','b'], b=['a','b']; p=1, suffix=1, mid_a=['a'], mid_b=[]; output =a,-a,=b. Minimal? LCS 'a','b', delete first 'a'? output deletes second? ops =a,-a,=b -> keeps first a, deletes second, okay. Could also =a,=b? length mismatch no.

Need ensure prefix/suffix trimming not too costly: while p loops, suffix loops. For identical 20k, p reaches 20k, suffix none, mid empty, return list of 20k tuples. Could avoid suffix if p==min? But okay.

Should we trim to improve performance? Yes. But if we trim, then output middle diff uses list of strings; prefix/suffix ops built after. Need be careful if mid_a == mid_b (not necessarily identical? If middle identical but not caught due to overlap? Actually prefix/suffix would have caught all if entire lists equal after trimming? If middle equal non-empty, p stopped at mismatch, suffix stopped before mismatch? Could middle still identical? If p=0, suffix maybe m? If b shorter? Example a=['x','y','z'], b=['x','y']; p=2; suffix 0; mid_a=['z'], mid_b=[] not equal. If middle identical, there would be common prefix at start of middle, meaning p not maximal? Unless p limited by one side end. If p reaches min(n,m), one side exhausted; middle non-empty on longer side, not equal. So okay.

However prefix trimming followed by suffix trimming can reduce n,m but we need output prefix before middle and suffix after. If diff middle returns ops for trimmed middle, then total ops = [('=', a[i]) for i in range(p)] + middle_ops + [('=', a[n-sn+i])? Wait suffix lines correspond to a[n-sn:n] and b[m-sn:m]. Since suffix trimmed after prefix, these are equal lines. Output for j in range(sn): ('=', a[n-sn+j]). But if p+sn > n? Could overlap? Need ensure not. Let's check case a=['a'],b=['a','a']? p=1, suffix sn? min(n-p=0,m-p=1)=0. no. a=['a','b'], b=['a','a','b']: p=1, suffix min(1,2)=1 (b), mid_a=[], mid_b=['a']; prefix =a, middle +a, suffix =b. Good no overlap. p+sn=2=n.
Case a=['a','b'], b=['a','b','c']: p=2, suffix min(0,1)=0.
Overlap possible if p + sn > n? Suppose p counts from start, suffix counts from end, if one list all prefix and suffix? Example a=['a'], b=['a','a']: p=1, sn=0. If b=['a','b','a'], a=['a','a']? p=1 (first a), suffix: n-p=1,m-p=2; compare a[1]='a', b[2]='a' sn=1; now min remaining=0. p+sn=2=n. no overlap. It seems p+sn <= min(n,m)? Because suffix loop bounded by min(n-p,m-p), so p+sn <= min(n,m). Good. Suffix lines distinct from prefix.

If mid_a or mid_b empty, Myers handles but we could output direct deletions/insertions faster. For mid_a empty: prefix = all remaining b inserted after prefix before suffix. Need order: If a middle empty, b has extra lines between prefix and suffix. Output prefix '=', then '+ lines', then suffix '='. This is minimal (insert all extras). If mid_b empty: '- lines'. We can let Myers handle: n=0 or m=0 return direct. But if using outer prefix/suffix and mid one empty, direct output easy and faster. However if mid_a empty but mid_b not, prefix+suffix are kept, b middle inserted. Good.

But trimming suffix with one side empty middle? Example a=['a','b','c'], b=['b','c'] p=0? a0!=b0. suffix sn=2, mid_a=['a'], mid_b=[] -> prefix none, middle -a, suffix =b,=c. correct.

Need ensure common prefix before suffix: If p==min(n,m), then suffix bound 0. If one list prefix of other, output prefix then insert/delete remaining at end? But suffix trimming might not capture because p=n (shorter exhausted). Then mid longer. Direct output prefix '=' for shorter, then remaining + or -. But is that always optimal? If one list is prefix of other, yes common prefix entire shorter; extra at end. Example a=['a','b'], b=['a','x','y']; p=2, mid_b=['x','y'] output =a,=b,+x,+y. Minimal D=2. Good.

Now, could suffix trimming before prefix yield larger? Prefix then suffix standard.

But trimming may alter indices for Myers; output direct for middle. Need maybe avoid slicing to save memory? We can create middle lists via slicing; for 20k okay. If lists huge (millions), maybe memory issue but spec 20k. Fine.

Need think if suffix trimming can make Myers faster for 20k differ 50 scattered? It might not reduce middle much if suffix small. Still fine.

Alternative: Use Myers without trim but d0 only prefix; suffix snakes may scan long suffix multiple times. Trimming suffix beneficial. We'll include.

Now, need decide forward algorithm: valid variant with history arrays. Need test with trimmed middle and output order.

Let's design code structure:

from array import array

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Trim common prefix
    n0 = len(a); m0 = len(b)
    p = 0
    min_len = n0 if n0 < m0 else m0
    while p < min_len and a[p] == b[p]:
        p += 1
    if p == n0 and p == m0:
        return [('=', s) for s in a]
    # common suffix after prefix
    sn = 0
    max_suffix = n0 - p if n0 - p < m0 - p else m0 - p
    while sn < max_suffix and a[n0 - 1 - sn] == b[m0 - 1 - sn]:
        sn += 1
    if sn:
       # But if prefix+suffix cover all equal? Already handled? If sn == n0-p and sn == m0-p then middle empty and entire rest equal? But p maximal means if rest equal, p would have increased? Actually if p<min_len and rest equal, then p not maximal. So not.
    mid_a = a[p:n0-sn]
    mid_b = b[p:m0-sn]
    # build result? Instead of building prefix/suffix separately, we can set outer_prefix and outer_suffix and call helper.
    # If mid_a empty or mid_b empty:
    if not mid_a and not mid_b:
        # This can happen if? maybe p+sn covers both? Return all prefix/suffix? If entire lists equal? already. If one side? If mid empty both => n0==p+sn and m0==p+sn, and prefix plus suffix equal; then original lists equal? Example a=['a','b'], b=['a','b'] p=2 sn=0. So earlier. Could return prefix+suffix = list a maybe. But to be safe.
    mid_ops = _diff_mid(mid_a, mid_b)
    result = [('=', a[i]) for i in range(p)] + mid_ops + [('=', a[n0 - sn + i]) for i in range(sn)]
    return result

But if p large and mid_ops large, concatenating lists copies. Could do result = [] and extend. Fine.

Need helper _myers_diff(a,b) for middle. It can handle n=0,m=0. But if n=0 return all '+', if m=0 all '-'. If identical? Could check if a==b? But middle not equal? Could still if no prefix? If a==b then entire would equal and returned earlier. But helper can handle.

Should we trim common prefix inside helper again? Already trimmed, but direct maybe no. Could include if a==b quickly: if a is b? Slices distinct but equal. If mid_a == mid_b maybe if p stopped at mismatch impossible? But after suffix trimming, could middle equal? Consider a=['x','a','a'], b=['x','a','a','b']? p=1? a0 x b0 x p=1; a1 a b1 a p=2; a2 a b2 a p=3; p==n (3), suffix bound 0; mid_a=[], mid_b=['b']; not equal. If p stopped at mismatch then middle first elements differ; suffix trimming stops before suffix; middle first elements could be same? Suppose a=['x','a','b'], b=['x','c','b']; p=1 mismatch a vs c; suffix 1; mid a='a', b='c' mismatch. If there is common after mismatch but before suffix, Myers handles. So middle first elements mismatch due to maximal prefix, unless one side empty. Middle last elements mismatch due to maximal suffix. Good.

Now, helper Myers. Need implement with arrays. Let's write carefully.

def _diff_mid(a, b):
    n = len(a); m = len(b)
    if n == 0:
        return [('+', line) for line in b]
    if m == 0:
        return [('-', line) for line in a]
    # Optional: if n==m and all equal? but no.
    # d=0
    x = y = 0
    # Because middle prefix maximal, first mismatch unless one empty. But maybe a[0]!=b[0]. Still while.
    while x < n and y < m and a[x] == b[y]:
        x += 1; y += 1
    history = [array('i', [x])]
    if x == n and y == m:
        return [('=', line) for line in a]
    # max_d = n + m
    # To optimize, max possible edits? n+m. Use local variables.
    for d in range(1, n + m + 1):
        curr = [-1] * (d + 1)
        # prev = history[-1] (array)
        prev = history[-1]
        # local a,b,n,m
        # loop idx
        found = False
        found_x = found_y = 0? Not needed; break with found_d.
        # Use for idx in range(d+1): k = -d + (idx << 1)
        for idx in range(d + 1):
            k = -d + (idx << 1)
            best = -1
            # deletion from idx-1
            if idx > 0:
                left = prev[idx - 1]
                if left >= 0:
                    y_left = left - (k - 1)
                    if y_left >= 0 and y_left <= m and left < n:
                        best = left + 1
            # insertion from idx
            if idx < d:
                right = prev[idx]
                if right >= 0:
                    y_right = right - (k + 1)
                    if y_right >= 0 and y_right < m:
                        if right >= best:
                            best = right
            if best >= 0:
                # snake
                # Use local while
                while best < n and best - k < m and a[best] == b[best - k]:
                    best += 1
                curr[idx] = best
                # best - k = y after snake
                if best == n and best - k == m:
                    curr.append? no.
                    history.append(array('i', curr))
                    found = True
                    break
            else:
                curr[idx] = -1
        if found:
            break
    else:
        # Should not happen; maybe if n or m zero handled. Could return fallback simple? For safety.
        return [('-', line) for line in a] + [('+', line) for line in b]
    D = len(history) - 1
    # backtracking
    x = n; y = m
    ops = []
    # history arrays
    for d in range(D, 0, -1):
        k = x - y
        prev = history[d - 1]
        # determine insertion source
        insert = False
        if k == -d:
            insert = True
        elif k == d:
            insert = False
        else:
            idx_right = (k + d) // 2
            idx_left = idx_right - 1
            left = prev[idx_left]
            right = prev[idx_right]
            # recompute ok/choose as forward
            delete_ok = False
            if left >= 0:
                y_left = left - (k - 1)
                if y_left >= 0 and y_left <= m and left < n:
                    delete_ok = True
            insert_ok = False
            if right >= 0:
                y_right = right - (k + 1)
                if y_right >= 0 and y_right < m:
                    insert_ok = True
            if insert_ok and (not delete_ok or right >= left + 1):
                insert = True
            else:
                # If neither? For path one must be ok. If delete_ok false and insert_ok false, something wrong. Could default insert?
                insert = False if delete_ok else True? Need choose valid source.
                if not delete_ok and insert_ok: insert=True else insert=False
        if insert:
            # came from k+1
            # Need idx_right for prev. For k maybe boundaries:
            idx_right = (k + d) // 2
            x_after = prev[idx_right]
            y_prev = x_after - (k + 1)
            # record snake matches from x_after to x-1
            # use while? for loop range
            for xx in range(x - 1, x_after - 1, -1):
                ops.append(('=', a[xx]))
            ops.append(('+', b[y_prev]))
            x, y = x_after, y_prev
        else:
            idx_left = (k + d) // 2 - 1  # because idx_right-1
            x_prev = prev[idx_left]
            y_prev = x_prev - (k - 1)
            # snake from x_prev+1 to x-1 inclusive: range(x-1, x_prev, -1)
            for xx in range(x - 1, x_prev, -1):
                ops.append(('=', a[xx]))
            ops.append(('-', a[x_prev]))
            x, y = x_prev, y_prev
    # initial snake
    for xx in range(x - 1, -1, -1):
        ops.append(('=', a[xx]))
    ops.reverse()
    return ops

Need examine decision recompute in backtrack: If insert_ok and (not delete_ok or right >= left + 1), choose insert. In forward, when best initialized -1, deletion first best=left+1. Insertion if right >= best (which equals left+1 if delete_ok). If delete_ok false and insert_ok true, right >= -1 true. So forward insertion condition: insert_ok and (not delete_ok or right >= left+1). Good.
But in forward, if delete_ok true and insert_ok true but right < left+1, choose deletion. If delete_ok false, insert_ok true but right >= -1 true. Good.
Backtrack above if not insert condition, choose delete. But if both not ok? Shouldn't. Need set insert false if delete_ok true, else maybe insert true if insert_ok. Could code:
if k == -d: insert=True
elif k == d: insert=False
else:
  ...
  if insert_ok:
     if not delete_ok or right >= left + 1: insert=True
     else: insert=False
  else:
     insert=False
This chooses deletion if insert not ok. If both not ok, deletion but may fail later. Path won't. For k boundaries, if k==-d but insertion invalid? Not path. okay.

But one subtle bug: In backtracking interior, idx_right = (k + d)//2. For current k, d, idx_right could be 0 or d? But interior excludes k == ±d. For k=-d+? idx_right at least1; for k=d-? idx_right <=d-1. Good. In boundary insertion, idx_right = (k+d)//2: for k=-d =>0. For deletion, idx_left = (k+d)//2 - 1: for k=d =>d-1. Good.

Need ensure x,y after setting from source are valid and next iteration's k parity etc.
For insertion: x, y = x_after, y_prev (previous end on k+1). k_new = x - y = x_after - (x_after-(k+1)) = k+1. This matches prev diagonal. For deletion: k_new=k-1.
Good.

Need ensure the snake recorded before op in reverse is correct when forward source candidate after edit point x_after/y_after and then snake. In insertion backtrack: current x,y at end of snake. Snake start after insertion: (x_after, y_prev+1). We append matches indices x_after..x-1 (using a[xx]) in reverse. Then op '+', b[y_prev]. Then set to previous end (x_after, y_prev). Good. For deletion: snake start after deletion: (x_prev+1, y_prev). Append matches a[x_prev+1..x-1] reversed: range(x-1, x_prev, -1). Then op '-', a[x_prev]. Set x_prev,y_prev. Good.

Need ensure when snake length zero but x == x_after for insertion. range(x-1, x_after-1, -1). If x=x_after, range(x-1, x-1, -1) empty? Start= x-1, stop=x-1, step -1 => empty because start == stop? In Python range(0,0,-1) empty. Good. If x_after=0, stop=-1 includes 0. Good.
Deletion zero snake if x=x_prev+1. range(x-1=x_prev, x_prev, -1) empty. Good.

Now, initial snake: after loop, x,y should be at d=0 V. For initial snake, matches indices 0..x-1. But if d=0 state not on k=0? It is. Good. If there are no edits (D=0) handled before helper? Helper if d0 final returns. But in helper if D=0, history length 1 and for loop not executed, initial snake x=V0, reverse all. We could let backtrack handle D=0 but code D maybe 0 and final x? In helper, if x==n and y==m after d0 returns before break. But could also proceed. Good.

Now, potential performance improvement: In forward while snake condition uses best - k < m each time. Computing y = best - k outside while maybe faster:
  y = best - k
  while best < n and y < m and a[best] == b[y]: best += 1; y += 1
  curr[idx]=best
Then final check if best == n and y == m. This avoids subtraction. Do that.

For deletion candidate y_left computed as left - (k - 1). For insertion y_right. Could use formulas? okay.

In forward candidate, we can avoid y_left/y_right boundary checks by relying on prev valid? Let's keep for correctness. But for speed, many checks. We can perhaps assume prev valid states only and not negative; if left>=0 then y_left within [0,m] because stored x on prev diagonal valid? Need ensure: In valid variant, curr[idx] is valid x for diagonal k if best>=0 and after snake x valid. We assign only if candidate valid, so x valid. So prev valid. Thus for left = prev[idx-1], if left>=0 then y_left = left - (k-1) is within [0,m] and left<=n? Since prev state x within [0,n]. But x can be n. Deletion valid if left < n. No need y_left bounds. For right, if right>=0 then y_right within [0,m]; insertion valid if y_right < m. But could y_right<0? No valid prev. So we can simplify:
 if left >= 0 and left < n: best = left + 1
 if right >= 0:
    y_right = right - (k + 1)  # valid if right>=0, but need compute for <m
    if y_right < m and y_right >=0? If prev valid on k+1, yes. Could y_right negative if k+1 > right? That would mean y negative, invalid prev not stored. So no. But if right=0,k+1=1? Then prev idx maybe invalid? prev value -1 if invalid. So safe.
 if y_right < m: if right >= best: best=right
But need know y_right valid upper <=m. Prev valid ensures <=m. Could still compute y_right = right - (k+1) maybe negative if prev invalid but right>=0? invalid stored -1, so no. Good.
Similarly deletion left < n. Since prev valid left<=n. So:
 if idx>0:
   left=prev[idx-1]
   if 0 <= left < n: best=left+1
 if idx<d:
   right=prev[idx]
   if right >= 0:
      y_right = right - k - 1
      if y_right < m and right >= best: best=right
But is y_right>=0 needed for insertion? If prev valid on k+1, yes. What about k+1 = m? If y=0 valid. If y_right negative cannot. But if right>=0 and y_right< m includes negative; could choose insertion when y negative? But prev invalid wouldn't be >=0. Is it possible right>=0 and y negative but prev state stored because candidate x valid but y invalid? We must ensure no. Candidate for insertion uses y_right=m? No. Candidate chosen valid. Snake maintains y<=m. Deletion maintains y same valid. Initial valid. So yes.

However for deletion left < n but left maybe n? invalid. left>=0. Need also y_left <=m; prev valid.

This simplification may mis-handle diagonals where prev state is invalid but value 0? We initialize curr with -1 and only set if best>=0. For d=0 x could be 0 valid. Good.

Let's test with boundary k positive where right value could be 0 but y negative? Example d=1, idx0 k=-1, right=prev[0]=0, k+1=0 y_right=0 valid. d=1 idx1 k=1 no right. d=2 idx0 k=-2: right=prev[0]=0 (from d1 k=-1 valid y? d1 k=-1 V=0,y=1). For d2 k=-2, k+1=-1, right=0 => y_right = 0 - (-1) = 1, valid if m>1. Good. d=2 idx? right values valid.

What about k very positive, prev right maybe n with y=m; y_right = n - (k+1). Since prev valid, y=m? If k+1 = n-m, y=m. valid. Insertion invalid if y_right=m. Good.

So forward inner:
 prev = history[-1]
 curr = [-1]*(d+1)
 for idx in range(d+1):
   k = -d + idx*2
   best = -1
   if idx:
      left = prev[idx-1]
      if left >= 0 and left < n:
          best = left + 1
   if idx < d:
      right = prev[idx]
      if right >= 0:
          # y after edit if insertion = right - k
          # prev y = right - (k+1). Need prev y < m.
          if right - k - 1 < m and right >= best:
              best = right
   if best >=0:
       y = best - k
       # y should be within 0,m. For insertion, if right - k -1 <m, then y=right-k <=m. y>=? valid. Deletion y=left+1-k=left-(k-1) within.
       while best < n and y < m and a[best] == b[y]:
          best +=1; y+=1
       curr[idx]=best
       if best == n and y == m: found=True; break
 history.append(array('i',curr))

Wait insertion validity: prev y = right-(k+1) < m. But if prev y negative? not. We also need ensure y after insertion >=0: prev y +1 >=1? If prev y could be -1? not. If k+1 maybe > right (y negative) but prev invalid. Good.

But what if prev state x=0 on k=-d+1 with y=d-1, valid if y<m. right=0. k+1=-d+1, y_right = 0 - ( -d+1)=d-1. If d-1 < m, valid. For d>m, y_right>=m invalid; no insertion beyond bottom boundary. Good.

For deletion, left<n ensures can delete. But what if y_left <0? prev valid? For diagonal k-1 maybe x=left, y=left-(k-1). If k-1 > left, y negative invalid not stored. Could left>=0 from an invalid state stored? Need ensure no invalid stored. Candidate selection with right validity and left validity maintains. But could deletion from a valid prev state on k-1 with y_left valid but left<n. yes. If prev state has x=0,k-1=1,y=-1 invalid, it wouldn't be stored because candidate for that diagonal at previous d would require left validity etc. Let's test d=1,k=1: deletion from k=0 left=0,y_left=0 valid. curr x=1 valid. d=2,k=3? idx3? left from k=2? k=2 at d=1? Not possible d=1 k range -1,1. So okay.

Need maybe cap if left+1 > n? left<n ensures <=n.

Tie: right >= best (best deletion x left+1). If left invalid best=-1, insertion with right>= -1. But also need right - k -1 < m. If right=0,k=-d? For k=-d idx0 insertion valid if d-1<m. Good.

But if left invalid because left=n, but right valid with cand maybe < best? best=-1 so choose. Good. If left invalid but left=-1, best -1. Good.

Now, does choosing insertion when right >= best handle case deletion invalid but left value not -1 but left=n? best=-1. Good. If left invalid because left=-1 but right cand 0, choose insertion. Good.

Need store history snapshot even if no final. If found break, but need append curr before break. In code, if found after setting curr, append and break out of inner. But if we append inside inner, then need not append after loop. If break inner, break outer.

Pseudo:
found_d = None
for d in range(1, n+m+1):
  prev=history[-1]
  curr=[-1]*(d+1)
  for idx...:
    ...
    if best >=0:
      ...
      curr[idx]=best
      if best == n and y == m:
         found_d=d
         history.append(array('i', curr))
         break
  if found_d is not None: break
  history.append(array('i', curr))
if found_d is None: fallback
D=found_d

But note if found inside inner, history append curr then break inner. Outer break. Good.

Potential bug: If d loop found, history length = D+1. If not found, history appended each d. Good.

Fallback: Could compute simple edit script if Myers fails due to bug: all deletions then insertions. But must be minimal; if fails due to performance maybe not. But for safety if found_d None after n+m (should not), return all deletions + insertions; that's an edit script (not necessarily minimal? if no matches then minimal; but if bug missing matches, not minimal). Maybe raise? Better fallback to DP for small? But not needed. Could include fallback using difflib? Not allowed. Could return simple.

Need test algorithm on random small cases? We can't run but can reason. Let's do a few more.

Case a=['a','b','c'], b=['b','c','d']. Shortest? -a, =b,=c,+d (D=2? n=3,m=3 LCS2 => D=2? Edit distance 2: delete a insert d). Trim prefix p=0 (a!=b); suffix? compare c vs d no. middle all.
Forward:
d0 x=0.
d1: k=-1 insertion from 0 y=1? a0 vs b1? best0; snake? a0=a,b1=c no curr0=0. k=1 deletion x=1,y=0 snake? a1=b,b0=b -> x=2,y=1? then c vs c -> x=3,y=2. x=n, y=2 !=m. curr1=3.
d2: k=0: left prev0=0 deletion best=1; right prev1=3 insertion y_right=3-(1)=2 < m (3)? 2<3, cand=3 >= best => insertion x=3,y=3 final. D=2. Backtrack d2 k=0 insertion: idx_right=1 x_after=prev[1]=3, y_prev=3-1=2. snake range x-1=2 to x_after-1=2? current x=3, x_after=3 -> range(2,2,-1) empty. op '+', b[2]='d'. set x=3,y=2.
d1 current k=1: prev hist0 [0]. k=d deletion: x_prev=0, y_prev=0. snake range x-1=2 down to x_prev=0 exclusive: 2='c',1='b'. op '-', a[0]='a'. set 0,0. initial none. reverse -a,=b,=c,+d. correct.

Case common prefix trimmed: a=['x','a','b','c'], b=['x','a','c'] -> p=2, suffix? c vs c sn=1; mid_a=['b'], mid_b=[] -> helper m=0 -> '-' b. result =x,=a,-b,=c. Good.

Now, consider trimming could choose suffix that overlaps with LCS choices? For edit distance, common suffix after common prefix is safe. Formal: There is an optimal alignment that matches common prefix and common suffix. Yes.

Potential issue with common suffix trimming when there are repeated lines and prefix not maximal due to one side exhausted? Example a=['a','b','a'], b=['a','a'] p=1, suffix sn=1, middle ['b'] vs [] output =a,-b,=a. Good. If we didn't trim suffix, Myers might output =a,=a,-b? That would also be valid but order differs. Both minimal. Our output keeps suffix last, okay.

Now, let's consider output constraints: Taking '=' and '-' items in order must give exactly original a. With trimming prefix and suffix and middle ops generated correctly, yes. Need ensure middle ops '=' use mid_a lines; when combined, total a sequence = prefix lines + middle ops kept/deleted = suffix. Since suffix lines from a[n-sn:]. The middle ops '-' line order gives mid_a. Good.

Now, one nuance: In helper, after trimming prefix and suffix, middle first lines differ and last lines differ (unless one empty). But Myers d0 initial snake will be zero. That's okay. But if one middle empty, direct. If not, d0 x=0. history[0]=[0]. Good.

Now, possible further optimization: If len(a)*len(b) small, use DP? Not needed.

Potential issue: For strings with unicode? Standard equality okay.

Now, memory of result prefix/suffix with list comprehension. If p large and mid_ops large, concatenation. We can do:
result = []
result.extend(('=', a[i]) for i in range(p)) but generator? Better list extend with list comprehension for speed.
result = [('=', line) for line in a[:p]]
result.extend(mid_ops)
result.extend(('=', line) for line in a[n0-sn:])
But a[:p] slice copies; okay. Could use for loop to avoid. Use list comprehension over range.
prefix_ops = [('=', a[i]) for i in range(p)]
suffix_ops = [('=', a[n0 - sn + i]) for i in range(sn)]
return prefix_ops + mid_ops + suffix_ops. Creates intermediate. Fine for 20k. Could do result = prefix_ops; result.extend(mid_ops); result.extend(suffix_ops).

Now, need final code no tests/print. Could include type hints.

Let's scrutinize valid Myers correctness more deeply.

The standard Myers algorithm with furthest-reaching x for each diagonal k after d edits. It doesn't explicitly check y bounds; but V values can be outside. Our valid variant restricts to valid states and chooses max candidate among valid moves. Need prove it still finds furthest x within grid. For each d,k, the furthest x on diagonal reachable by a valid edit script of length d. Recurrence: A valid script of length d ending at diagonal k comes from a valid script of length d-1 ending at k-1 then deletion (if x_prev<n) or from k+1 then insertion (if y_prev<m). The x after edit candidate as above. Snake adds matches. Taking max x gives furthest. Initial d0 snake. This is correct DP over edit graph. So finds minimal d to reach (n,m). Great.

Tie: choosing insertion or deletion among equal x after edit yields valid furthest. The stored x after snake is furthest; if two sources have equal candidate x, they have same start point after edit? If insertion from right and deletion from left+1 equal x, y same. So same point. If candidates both valid and equal, either source works? The source line differs but endpoint same. If we choose insertion, can backtrack to previous end on k+1. Need ensure previous end is reachable with d-1 edits (it is, prev state). But what if prev state on k+1 has x=right but its y differs from insertion source y? It is by definition on k+1: y_prev = right-(k+1). Deletion source on k-1 has y_del = left-(k-1). Equal endpoint (x,y) with x=right=left+1 implies y_del = x-k, y_insert_prev = y-1. Both valid. Backtracking insertion chooses k+1 state. It will then backtrack that state. The resulting script will have insertion then rest; total d-1 edits to previous point plus insertion = d. It should be valid. Good.

Potential issue: If we choose insertion on tie but previous k+1 state's furthest x might be achieved by a path that cannot connect to current due to y bounds? It is valid and y_prev<m, so insertion valid. Good.

Now, backtracking uses history[d-1] prev state at k+1 with furthest x. But what if current state's source was not from furthest prev state but from a less far prev state? Our forward DP only stores furthest prev states; the recurrence for furthest current uses furthest prev. If a less far prev state could lead to same furthest current (after snake) but furthest prev not valid? Wait recurrence for max candidate x uses max over all prev states on adjacent diagonals? Actually V[d-1][k'] stores furthest x on that diagonal. If a less far state on same diagonal could be valid for insertion (y_prev < m) but the furthest state on that diagonal is invalid for insertion because y_prev >= m? Is that possible? On same diagonal, furthest x has larger y = x-k'. If furthest y >= m (bottom boundary), insertion invalid. But a less far x with y < m could be valid and lead to a state, while furthest invalid. Classic algorithm using only furthest could miss valid insertion? Standard V values with invalid overshoot? Let's analyze. Our recurrence using only furthest prev state might fail because boundary validity depends on y; furthest state may be too far down to insert, but a shorter (less furthest) state on same diagonal could insert and yield a valid furthest current. Similarly, furthest deletion may be x=n invalid, but less far could delete. In edit graph, if a diagonal has furthest state at bottom boundary y=m, can there be a valid insertion from that diagonal? No, insertion from y=m invalid. But could a non-furthest state on same diagonal insert and then snake to reach further x than what other sources provide? It would have smaller x but same y? Diagonal k': x-y constant. Insertion keeps x same, y+1; after snake along k, starting x smaller. The furthest current from that insertion is at most that smaller x plus snake. Could be useful if all furthest states on adjacent diagonals are invalid due to boundaries. But standard edit distance graph: furthest-reaching states on each diagonal are sufficient to find shortest path to end, even with boundaries? I think yes in Myers without storing all. But let's test boundary issue.

Consider a diagonal k' with furthest x=n (right boundary), y=n-k' maybe <m, insertion valid if y<m. If furthest x=n and y<m, insertion valid. If furthest x=n and y=m? state is end of grid, insertion invalid, but then maybe current final? If not final? On same diagonal with y=m, x fixed; if y=m, all states on diagonal have y<=m. To insert, need y<m; furthest invalid if y=m, but a less far x has y<m and insertion could proceed along bottom? Example near bottom boundary. Suppose diagonal k' has furthest at (x=5,y=5) with m=5 (bottom), invalid insertion. Less far (4,4) insertion to (4,5), then snake maybe along x to n. Could this be necessary? If (5,5) is bottom, x=5<n maybe? diagonal k'=0, n=10,m=5. Furthest (5,5) at bottom, cannot insert (y=m) but can delete (x<n) from it to (6,5) on k=-1? For current k=0? To get current k=0 via insertion from k'=1? Wait insertion from k+1 to k: if prev diagonal k+1 has y_prev. Need insertion valid y_prev<m. If furthest prev at y=m invalid, but less far y=m-1 valid. Could that produce furthest current? However from less far (x-1,y-1) insertion to (x-1,y), then snake along k. From furthest (x,y) on same prev diagonal (invalid insertion), there may be a deletion path to a different current diagonal. But for current diagonal k, maybe insertion is needed.

Standard furthest-reach algorithms store only max x per diagonal, and are correct for edit distance even with boundaries. They don't restrict moves by validity in this way? Actually they implicitly allow moves that may go outside but still find shortest. But if we restrict to furthest valid state and discard less far states, is recurrence with only furthest still correct? The edit graph has property that on a diagonal, furthest x dominates all previous points for future reach because you can always "wait"? For paths, if you are further along a diagonal, you can simulate any future path from a previous point by either matching extra characters? Wait if you are further on same diagonal, you have consumed more common characters. For a future insertion (down move) from previous point, a furthest point may have y=m (can't insert) whereas previous point can insert. But if furthest is at y=m, that means it consumed to bottom; any path from previous point that inserts now will eventually consume at most same total? Could there be a path that inserts before bottom then matches, while furthest at bottom cannot? Example prev diagonal k'=1. Furthest at (1,0)? y=0 valid insertion; bottom issue if m=0 only. Let's construct: Need insertion from prev diagonal k+1 to current k. If furthest prev has y_prev=m, invalid insertion. Less far y_prev=m-1 valid. The less far after insertion reaches (x_less, m) on current k, then can only match along x if b exhausted? But y=m, no snake. The furthest prev at (x_f, m) on k' maybe cannot insert, but could delete to current? Deletion from k'? It moves to k'-1, which may be same as current? If current k = k'-1, deletion from furthest x_f to x_f+1 on k, with y=m, valid if x_f<n. That might be even further than less far insertion. So no need less far. If current k = k'-1? Yes insertion from k+1 (prev diagonal k+1) to current k; deletion from same prev diagonal k? Different. For a given current k, insertion comes from k+1, deletion from k-1. If insertion from k+1 invalid because y=m, maybe deletion from k-1 provides furthest. What if deletion from k-1 also invalid/short, and only less-far insertion from k+1 can advance? Is that possible and needed for shortest? Maybe standard V max still correct because furthest at bottom on k+1 means y=m; then to insert would require going below grid, impossible, but a less far point would insert to bottom; after insertion, it is on current k with y=m and x less than furthest prev's x? Furthest prev's x = y + k+1 = m + k+1. Less far x <= m-1 + k+1 = m+k = x_f -1. After insertion to current k, x <= x_f -1. But furthest prev at (x_f,m) on k+1, if we take deletion? Deletion from k+1 moves to current k (k+2? Wait diagonal index: deletion increases k by 1: from k' to k'+1. Insertion decreases k: from k' to k'-1. For current k, insertion from k+1. If furthest prev at k+1,y=m, x=m+k+1. To current k via insertion not allowed. But the furthest point itself has x = x_f, current k would be k = k+1 -1. If we could move to current k without insertion? Diagonal change requires edit. Maybe deletion from k-1 could produce x maybe. But if no, less-far insertion gives x <= x_f-1. Could a furthest state on current k from deletion be less than x_f-1? Possibly. Does standard V handle by having V[current k] = something? If it ignored less-far, might underreach. But Myers' V[k] stores furthest x reachable at distance d, not necessarily via last move from furthest predecessor? However recurrence V[d][k] = max(V[d-1][k-1]+1, V[d-1][k+1]) (snake applied) works even at boundaries. It uses furthest predecessor. If V[d-1][k+1] is at y=m, insertion candidate x=V[k+1]=x_f, y=x_f-k=m+1? invalid. But recurrence still uses x_f, possibly overestimating. In bounded graph, should not. But can this overestimate be invalid; yet if overestimated and used, might falsely find end? Standard algorithms with grid boundaries often rely on sentinel and stop at N,M, and overestimation okay? Need be certain our restricted max with only furthest predecessor isn't underestimating.

Consider we store only furthest valid point per diagonal. If furthest valid point cannot make an edit, maybe a non-furthest could, but is it dominated by some other path? In unweighted edit graph, from furthest point on same diagonal, because you have matched more common lines, you cannot "unmatch" to insert earlier. But any insertion from a non-furthest point creates a point on next diagonal with x same. From furthest point, you can instead insert later? But if at bottom, later impossible. If at right, deletion later impossible. Maybe non-furthest needed to cross a boundary before running out. Example need an insertion when furthest has already consumed all b (y=m), but a non-furthest could insert earlier to keep b? That seems paradoxical: furthest consumed all b, so there are no b lines left to insert after; non-furthest consumed fewer b lines, can insert a b line that was skipped earlier, effectively aligning differently. This corresponds to choosing a different alignment on the same diagonal; furthest alignment may not dominate for future insertions at bottom. Could shortest path require not consuming all common lines on a diagonal before an insertion? Let's construct.

We have a and b. Diagonal k' means matched offset x-y=k'. Furthest valid means maximal x. At bottom y=m, x=m+k'. Any further insertion invalid; but deletion possible if x<n. If need to insert (from k+1 to k) at bottom? Suppose target requires insertion after reaching bottom? Insertion after bottom impossible. But a different path on same diagonal not at bottom can insert before, then maybe match more to end. Does furthest at bottom preclude reaching end with same d? Let's find small case.

Let a length n, b length m. Diagonal k+1. Furthest at bottom y=m, x=m+k+1 < n (so can delete further but not insert). Current k via insertion from k+1 would have x=m+k+1, y=m+1 invalid. Less far x=m+k, insertion to y=m+1 invalid too if m+1? Wait insertion from y=m-1 to y=m valid. To insert on current k, after insertion y=m (not m+1). Let's set prev k+1, y_prev=m-1 valid. Furthest prev y_prev=m invalid. Less far x=m+k, insertion to current k x=m+k, y=m. Furthest prev x=m+k+1. Deletion from prev k-1 for current? Need compare. Could less far insertion yield x=m+k. If other sources to current give less, maybe needed.

Does standard DP V with only max x and bounded check miss? The true furthest valid current k could come from less far prev k+1, while max prev invalid. Standard recurrence using max prev and then clamping? If V[k+1]=m+k+1, insertion candidate x=V[k+1] but y=m+1 invalid. If we simply ignore insertion if y>=m, we lose x=m+k (less far). Is there a way to get x=m+k on current k from some other diagonal? Maybe from prev k-1 deletion? Not guaranteed.

Let's attempt brute mentally small n=2,m=1. Diagonal? a ['x','y'], b ['x']. Shortest =x,-y D=1. d0 V0=1 (bottom? k0,y=1=m,x=1). d1 k=1 deletion from V0 left=1, left<n (1<2) best=2 valid final? x=2,y=1 final. Good. k=-1 insertion from V0 y_prev=1? invalid; no less far? d0 only point x=1 bottom; if insertion invalid, no state. Good.

n=2,m=2 maybe less far needed? Consider d0 V0 maybe bottom if b exhausted but a remains: a prefix all b. Then deletions enough. If need insertion after b exhausted impossible. Non-furthest insertion on bottom before exhausting b? Suppose a has common matches then b line should be inserted, but a also has matching lines after? If at bottom, all b consumed, inserting more would exceed m. Non-furthest could insert a b line instead of matching an a line, then later match remaining b? But if bottom at furthest, there are no remaining b lines; non-furthest has one remaining b line (the one furthest matched). It could insert that line and then not match it? That would consume same count? Let's concrete: a=['a','b','c'], b=['a','c','d']? d0 V0=1 (not bottom). Need insertion from diagonal? Not.

Could there be a case where optimal script on a diagonal uses insertion before some common matches, but the furthest-reaching snake on that diagonal already matched those common lines, making insertion impossible because b line consumed? In edit alignment, if a line matches b line, matching it is always at least as good as deleting/inserting around it, for LCS? For minimal edit distance, matching common lines greedily within diagonal? In Myers, snakes are maximal: if on a diagonal and next lines equal, moving diagonally (match) reduces remaining edit distance by 1 and doesn't increase cost, so furthest after snake dominates. If at bottom, the next line equal to b last; matching it consumes b last. A non-furthest that hasn't consumed it could insert it (cost) and then maybe no matches; that seems not better than matching it (cost 0). For future insertions, you might want to insert that b line instead of matching to allow matching a different later line? But if lines equal, choosing match vs insert+? Could affect LCS with repeats. Example a=['b','c'], b=['b','b','c']? d0 snake b? a0=b,b0=b match -> x=1,y=1; then a1=c,b1=b mismatch. Not bottom. Need furthest bottom but non-furthest insertion could improve LCS due to repeats? Suppose a=['b','c'], b=['b','c','c']; d0 snake b,c to bottom y=2,x=2 (n=2). Need insert extra c. Bottom invalid insertion, but optimal is =b,=c,+c at end (insertion after bottom? Insertion from bottom on same diagonal to diagonal -1? Wait insertion increases y by 1, from (2,2) with m=2 invalid because y=m. But edit script =b,=c,+c inserts after all b? In graph, inserting after y=m is allowed: y can go from m to m+1? No grid has y up to m; insertion corresponds to moving down in edit graph from (x,y) to (x,y+1) where y+1 <= m? Wait coordinates: x consumed in a, y consumed in b. To output '+ line' (line only in b), you consume a b line without consuming a: y increases. If y=m (all b consumed), cannot insert more b lines; but extra c in b means m=3, not bottom. Sorry.

If bottom y=m means all b lines already consumed, there are no extra b lines to insert. So less far insertion on same diagonal would insert a line that furthest already matched (or skipped). Could be beneficial with repeats? Example b has duplicate c, a has c; matching furthest c might consume it, but optimal might insert one c and match another? But edit distance count same? Suppose a=['c'], b=['c','c']; d0 snake first c -> (1,1), not bottom (m=2). Insertion from (1,1) to (1,2) valid, then bottom? final? x=1,y=2 final? n=1,m=2 yes D=1. If d0 furthest snake matched first c; less far none. Good.

Need bottom invalid insertion but less far insertion: For bottom y=m at d, there are m b consumed. If there are duplicates, furthest may have matched a line that optimal would insert? But furthest consumes exactly all b lines; if all b consumed, script to current point already includes no inserts remaining. To reach end with maybe deletions of remaining a, bottom state can delete. If optimal would have inserted some b instead of matching, it would have consumed more than m b lines? Not possible at same d? Let's not overcomplicate. Standard furthest snakes dominate due to LCS property: once an equal line can be matched on a diagonal, any optimal path should match it immediately. For edit distance, if a[i]==b[j] and path reaches (i,j), extending diagonally is safe. So furthest after snake enough.

What about boundary invalid due to bottom for insertion from furthest prev: if furthest prev has matched all b lines, any insertion would insert a b line that was already matched or skipped, leading to non-optimal alignment; less far state skipping some match could maybe lead to different alignment but can be transformed to match instead and no worse. Thus ignoring less far valid for insertion when furthest invalid may be okay. Our valid recurrence using only furthest prev but requiring valid move may under-reach if only less far could validly move but less far path is not dominated. Need proof or test.

Let's search for counterexample. Suppose diagonal k+1 furthest state at bottom y=m, x_f=m+k+1 < n. It cannot insert. Less far state at x=m+k, y=m-1 can insert to current k x=m+k,y=m. From current k, since y=m, can only delete. This path total x after one edit = m+k. Could furthest prev instead delete to diagonal k+2? Not current. Maybe current k also reachable from deletion from k-1 with x <= something. Could less far insertion be only way to reach current k with x=m+k, necessary to eventually delete to n? But if current k y=m, deletions along k increase x and decrease y? Wait deletion on diagonal k from y=m to y=m-1? Coordinates: k=x-y. Deletion x+1,y same => k increases by 1. So if at current k and y=m, deletion moves to k+1,y=m. Not current. To consume remaining a after b bottom, you want increase k from k to k+? Starting at bottom y=m, deletions move to larger k. If target n,m final has k_end=n-m. If current k less than k_end, need deletions. Starting from x=m+k, after (n-m-k) deletions reach n,m? Yes x becomes m+k + (n-m-k)=n. If less far insertion gives current x=m+k. If furthest prev at k+1, x_f=m+k+1. It can delete to diagonal k+2, not current. To reach final from k+1 bottom, deletions: k+1 -> k+2... maybe final. Need D? Starting at k+1, x=m+k+1, deletions to n need n-(m+k+1)=n-m-k-1 edits. Starting at current k via less far insertion, deletions need n-m-k edits. The less far path has one extra insertion but same deletions? Actually less far path reached current k with d edits; furthest prev at d-1 at k+1. To final from k+1 bottom via deletions needs q-1 deletions where q=n-m-k. Total d-1+q-1 = d+q-2. Less far insertion path total d+q-1. So furthest prev path is one edit shorter if valid. But it goes through different current diagonal? It can delete from k+1 to k+2, skipping k. Final may require not matching? It consumes a deletions; if there are b lines? Already bottom. So likely no issue. If final k_end less than k+1, need insertions but bottom impossible. Less far insertion could increase y? already bottom after insertion? no. So not helpful.

Thus furthest-only with validity likely correct.

But our candidate validity for insertion checks prev y < m. If prev furthest y=m invalid, we ignore insertion. Could a less far insertion from same prev diagonal produce furthest current that is needed when deletion from k+1 invalid because x=n? If prev furthest x=n,y=m-1? Insertion valid; less far insertion candidate smaller, not needed. If prev furthest x=n,y=m? deletion invalid (x=n) and insertion invalid (y=m) but it's final if target? If not final? x=n,y=m is end; if d reached end break. If not break? Then target is that. If x=n,y<m, insertion valid. If x<n,y=m, deletion valid. So at least one outgoing edit from boundary if not end. Less far not needed.

Good.

Now, check our forward candidate deletion validity: If left (furthest on k-1) = n (right boundary), deletion invalid. If left < n valid. If left = n but y maybe <m, insertion? For current k from k-1 deletion invalid; insertion from k+1 may exist. Less far deletion from same k-1 with x<n could be valid. If furthest on k-1 at right boundary x=n, y=n-(k-1) <=m. If y=m then end. If y<m, it can insert to k-2, not current. For current k (from k-1), deletion invalid. A less far state on k-1 could delete to current k with x<=n-1. Could it be needed? Similar boundary argument. If furthest at right boundary cannot delete, but less far could delete (consume a) to current k. Is that useful? At right boundary x=n, all a consumed; less far has one a line left. Deleting it instead of matching? Could be beneficial if the a line matches b line furthest matched? Again likely dominated. Need test with a extra lines? Suppose a=['x','y'], b=['x']. d0 V0=1 (x=n,y=m) end D=1? Actually n=2,m=1, d0 x=1,y=1 not end x<n. For k=-1 insertion? left? For current k=0 at d1, deletion from k-1=-1? not. Let's find diagonal k-1 furthest x=n,y<m but not end: a=['x','a'], b=['x']? d0 V0=1 (n=2,m=1,y=m). For k? current maybe -? Furthest on k=-1? Hmm.

Consider a=['x','a'], b=['a']. Optimal -x,=a D=1. d0 V0=0 (x0 vs a mismatch). d1: k=-1 insertion from 0 x=0,y=1; k=1 deletion x=1,y=0; then k=1 snake a? a1 vs b0 a -> x=2,y=1 end. Here deletion from k0 left0 valid (left<n). Furthest on k0 at d1? not relevant.

Need a case at d-1 diagonal k-1 furthest at x=n,y<m. For x=n,y<m, since k-1 = n-y > n-m? This diagonal has consumed all a but not b. It cannot delete, but can insert to k-2. Less far on same diagonal could delete to current k (consume last a) maybe to help? But if all a consumed, deleting last a from less far means that a line wasn't consumed by matches; maybe it was matched by furthest. Could optimal need to delete it instead of match? If it matched some b line, deleting it would require matching later? Might be dominated.

Given standard algorithms store furthest and allow invalid moves with overestimate, they are correct. Our restriction may under-restrict but likely still correct due to monotonicity and boundaries. But to be safe, we could implement classic Myers without boundary validity but store only within x<=n,y<=m via clamping, and backtracking start n,m. Or store full classic history and backtrack from history final x maybe. Need choose safest.

Let's look at classic with V[1]=0 and dynamic parity. It doesn't need validity checks, only left<right. But could overshoot. We can store all and then during backtrack maybe use x = history[D][(n-m+D)//2]? Let's examine standard backtrack from history with possibly V > n. Many implementations after finding final, set x=n,y=m regardless. They use V values in backtracking but only values that are valid enough. Overshoot may not affect path. Could use classic and avoid complex validity. Need ensure no overshoot final issue. Let's search memory: Myers backtracking uses V history and:
x = N; y = M
for D in range(Dmax, 0, -1):
    V = history[D-1]
    k = x-y
    if k == -D or (k != D and V[k-1] < V[k+1]):
        # insertion
        prev_x = V[k+1]
        prev_y = prev_x - (k+1)
    else:
        prev_x = V[k-1]
        prev_y = prev_x - (k-1)
    while x > prev_x and y > prev_y:
        record match
    if x > prev_x: record delete
    else: record insert
    x,y=prev_x,prev_y
This uses prev_x,prev_y from prev V. If prev V > N? Could prev_x > N, while conditions? Might fail. But perhaps prev_x never >N for states on backtrack path. Because start x=N, condition chooses prev diagonal; if prev V overshoots but not on path? Hmm.

Maybe use a well-known linear-space divide and conquer? Too much.

Let's test valid variant for boundary less-far issue with exhaustive small mentally? Could maybe prove: For edit graph with diagonal dominance, for each diagonal and distance d, if you have the furthest valid point (max x within grid) then any point with smaller x is dominated for reaching any future point with distance <= current? In edit graph with boundaries, a point further on same diagonal has x and y both larger. For a future path to some (x2,y2), if starting from smaller point can do some sequence of edits, starting from larger point can follow same edits shifted? It may hit upper boundary (b or a) earlier. But hitting boundary earlier could invalidate insertions/deletions. However if starting from furthest at boundary invalidates an insertion, smaller could insert. But that insertion would increase y; starting from furthest already y larger. To simulate, furthest would have to have y less. Not always possible. Counterexample? Suppose target requires two insertions at end; smaller point on diagonal has y=m-1, furthest y=m. Furthest can't insert, smaller can one insertion; after one insertion y=m, cannot insert second. Need two insertions, both not possible from furthest; smaller maybe if y=m-2. But furthest may have y=m; target m fixed, you cannot insert more than m-y. Starting from smaller allows more remaining insertions, but furthest consumed those b lines via matches, so they don't need to be inserted. If they are common matches, matching them is better. If they are not common? Furthest path on same diagonal at y=m consumed b lines by some edits (matches or insertions?) If it consumed b lines by insertion, maybe less far consumed fewer insertions and can insert additional different lines? But b total m fixed; can't insert beyond.

Dominance holds in LCS: if two partial alignments end on same diagonal, one with larger x has length (x) and same x-y offset; it has matched x lines, y consumed; larger x means more total characters consumed but also more matches? Cost d fixed, matches d? Actually x+y-d=matches? For fixed d and k, x determines y and number matches = x - insertion? Larger x generally dominates. For edit distance, if partial path A has x >= B on same diagonal and same d? It has same edits, so matches = d? Number matches = (x - deletions?) But both consumed more a and b. It should dominate because remaining suffix length shorter. Boundaries are fine because if A consumed all b, B cannot need to insert lines already consumed; if those consumed lines were insertions not matches, A may have lower LCS? But same d and same diagonal with larger x: y larger. Number of insertions in path = y - (x-k)? Hmm. Not trivial.

Maybe safer to use standard algorithm but with full V and path reconstruction that handles boundaries. Let's revisit classic implementation in detail and test with valid boundary.

Classic (bounded) recurrence without invalid checks:
V[0][0] after initial snake (valid). For d:
  for k:
    if k == -d: x = V_prev[k+1]
    elif k == d: x = V_prev[k-1] + 1
    else: x = V_prev[k+1] if V_prev[k-1] < V_prev[k+1] else V_prev[k-1] + 1
    y = x-k
    while x<n and y<m and a[x]==b[y]: x++,y++
    curr[k]=x
    if x>=n and y>=m: found
It can set x > n? Deletion from x=n gives n+1. But if x=n and y=m? Would have found at previous d? If state at x=n,y=m at d-1, algorithm would have broken then. If state at x=n,y<m, deletion candidate x=n+1,y same. It stores n+1. Later insertion from this state could reach y>=m with x=n+1 and break invalid. But could this happen before valid path? Example N=1,M=2, all different maybe state x=1,y=0 at d1 k=1. d2 k=0 insertion from k=1 x=1? not overshoot. Deletion from k=-1? no. State x=n+1 arises from deletion when prev x=n,y<m. If prev state at right boundary but not bottom. Later insertion from that invalid state to reach bottom: current k? Example n=1,m=3, state at k=1 x=1,y=0 (right boundary not bottom). d2 k=2 deletion from k=1 gives x=2,y=0 invalid. Not insertion. Insertion from k=1 to k=0 gives x=1,y=1 valid. So invalid deletion states on more positive k. Later insertion from positive invalid to lower k could x>1. Could break at x>1,y=3. But maybe final found at x=1,y=3 via insertions from boundary valid negative k? Need path to end with N=1,M=3 requires 2 insertions; final k=-2. The negative chain handles valid. Invalid positive not used. In general final diagonal k=n-m. Overshoot deletion states have k larger; to reach final k, need insertions (decrease k). Starting from x=n+1,y = x-k. To have y>=m final, if k_final <= x-m = n+1-m = k_final+1. Could be final via insertion from k_final+1 state with x=n+1,y=m? But if state x=n+1,y=m at d-1, it is invalid due x>n. Could algorithm break at d with insertion to k_final x=n+1,y=m. But valid final x=n,y=m perhaps reachable with one more edit? This could cause D overestimate? Hmm.

Can classic with no boundary break stop at invalid x>N,y=M and return D that is too low? Suppose n=1,m=1 all different. d1 V[-1]=0,V[1]=1. No final x>=1,y>=1? V[-1] x=0,y=1 no x>=N; V[1] x=1,y=0 no y>=M. d2 k=0 insertion from V[1]=1 => x=1,y=1 valid final D=2. No overshoot. If insertion from overshoot? Need d? not.

n=1,m=2 all different. d1 V[-1]=0,y1, V[1]=1,y0. No final (V[-1] x0<1, V1 y0<2). d2: k=-2 from V[-1] x0,y2 x0<1; k=0 from V[1] insertion x1,y1 (not final y<2) or deletion from V[-1] x1? left=0,right=1 -> insertion x1. k=2 deletion from V1 x2,y0 invalid x2. No final. d3: k=-1: left V[-2]=0, right V[0]=1 -> insertion x1,y2 final valid. D=3. No overshoot.

n=2,m=1 all different. symmetric: final D=3 valid.

n=1,m=2 with a matches second? a=['z'], b=['x','z']. Optimal +x,=z D=1. d0 x=0. d1 k=-1 insertion x0,y1; snake z -> x1,y1 not final? y=1<m=2; k=1 deletion x1,y0. d2: k=-2 insertion from k=-1 x0,y2? y_prev=1? valid? x0,y2 x<n; k=0 insertion from k=1 x1,y1 (not final); k=2 deletion invalid x2. d3: k=-1: left V[-2]=0, right V[0]=1 -> insertion x1,y2? final? x=1,y=2 yes D=2? But optimal D=1? Wait a='z', b='x','z': edit script insert x, match z. D=1? n=1,m=2 LCS 1 => D = n+m-2LCS = 1+2-2=1. Yes D=1. Did d1 k=-1 final? At d1: insertion from V0[0]=0 x=0,y=1; snake: x<1 and y<2 and a0='z', b1='z' => x=1,y=2. final x=1,y=2! I forgot snake after insertion. Break D=1. Good.

So valid path found at boundary negative.

Classic may be fine. Backtracking standard uses history. We need ensure history stores values possibly -? In classic dynamic with parity, all states assigned even if y out of range. But for backtracking, could use x=n,y=m and decision standard. Let's test with all different n=1,m=2. History classic:
d0 [0]
d1 k=-1 x=0,y=1; k=1 x=1,y=0 -> [0,1]
d2: k=-2 from prev idx0 x=0,y=2; k=0 left=0,right=1 -> insert x=1,y=1; k=2 deletion from idx1 x=2,y=0 -> [0,1,2]
d3: k=-3 insert prev0=0,y=3; k=-1 left=0,right=1 -> insert x=1,y=2 final at idx? d3 idx1 k=-1, curr value 1. Break. D=3? But earlier we thought D=3 for all different n=1,m=2, yes. History d3 includes [0,1,...]. Backtrack start x=1,y=2,k=-1,d=3. prev hist2 [0,1,2]. k=-1, not boundary? k != -3, !=3. idx_right=(k+d)//2=1, idx_left=0. left=0,right=1, left<right -> insertion. x_after=prev[1]=1, y_prev=1-(0)=1. snake empty, +b[1]='z', set x=1,y=1. d2 k=0: prev hist1 [0,1]. k=0 interior; idx_right=1 idx_left=0; left=0,right=1 -> insertion. x_after=prev[1]=1, y_prev=1-(1)=0. op +b[0]='x', set x=1,y=0. d1 k=1: boundary k==d deletion. x_prev=hist0[0]=0, op -a[0]. reverse -z? Wait a[0]='z', ops reverse: -a[0]='z', +b0='x', +b1='z' => +x,+z,-z? Reverse: -z, +x, +z. Taking = and - gives ['z'] yes. Taking = and + gives ['x','z'] yes. But not shortest? D=3 for all different length1->2? Edit distance from 'z' to 'x','z' is 1 (insert x). But all different? a='z', b=['x','z'] not all different, they share z. My example had common at second, D=1. In d3 simulation I assumed all different b=['x','y']; let's redo: a='z', b=['x','y']. d1 k=-1 insertion x0,y1 no snake; k=1 deletion x1,y0 no. d2 k=-2 insertion from0 y2 x0; k=0 insertion from1 x1,y1; k=2 deletion x2,y0. no final. d3 k=-3 insert x0,y3; k=-1 from left0,right1 insert x1,y2 final? yes D=3. History backtrack:
d3 k=-1 prev hist2 [0,1,2]; insertion x_after=prev[1]=1, y_prev=1-0=1, +b[1]='y'. set x1,y1.
d2 k=0 prev hist1 [0,1]; insertion x_after=1,y_prev=1-1=0, +b[0]='x'. set x1,y0.
d1 k=1 deletion x_prev=0, -a0='z'. reverse: -z +x +y. correct.

Classic works for this.

Could classic backtrack encounter prev value >n and use it as x_after > current x? For path maybe no. If a path uses invalid overshoot to reach final with x>=n,y>=m, but final x in history >n. Start x=n. At d, k=x-y=n-m. The history current idx for final d has value >n but we start at n. The backtrack decision uses prev only. It might still follow valid path? Need check if classic ever breaks at invalid state first. Could it? Need find case where first state with x>=n,y>=m has x>n,y=m and no valid state same d? If so D might still be minimal? Let's attempt construct where valid path would require one more edit but invalid overshoot finds same d. Classic overestimation could return too small. Standard proof says V may overshoot but if x>=N,y>=M then edit distance <=D. It corresponds to path reaching or beyond corner; from there can truncate? If x>N,y>=M, the sequence of edits includes extra deletions beyond a; can remove them? But if x>N and y>=M, number of deletions exceeds N; there may be fewer deletions valid with same y? Removing extra deletions changes diagonal; might still reach end with <=D. So edit distance <=D. Since D is first found, maybe still minimal. Backtrack may need produce script length D? If uses invalid edits, could have too many deletions/insertions. But standard backtracking from n,m works and yields valid script length D because it uses prev points maybe valid. Let's trust classic.

Given standard algorithms are battle-tested, maybe use classic simpler with no validity checks. But with dynamic parity and history, need handle V values >n? We can cap x at n to avoid weird? Standard often uses if x > n: x = n. Let's see. If we cap, V values never >n. But y may >m. If y >m and x=n, condition x>=n,y>=m true maybe over. Could cap y too by x=min(x,m+k)? If we clamp x to min(n, m+k) after candidate and snake? This enforces y<=m. Also ensure x>=max(0,k)? For valid states. Then classic recurrence with clamping may be correct bounded furthest. But clamping can affect choice left<right? If we store valid furthest x with y<=m. This is similar valid variant but without checking move validity; clamping candidate might choose less far but valid. Let's define recurrence:
for each k, compute candidate x from prev max (could be from prev state valid). Then before snake, clamp x = min(x, n, m + k) maybe. Also if x < max(0,k)? For y>=0, x>=k if k positive, else 0. If candidate below min, state invalid maybe set -1? But candidate from valid prev likely within range except maybe x too high. Deletion x_prev+1 could exceed n or m+k; clamp. Insertion x_prev maybe > m+k? If prev valid on k+1: x_prev <= min(n,m+k+1). For current k, insertion same x_prev; m+k = m+k+1-1, so x_prev could be m+k+1 if prev at bottom; clamp to m+k, which corresponds to not actually inserting? That overestimates/invalid. Need also if prev y=m (bottom), insertion invalid; clamping x to m+k would effectively shift point left without consuming insertion, wrong. So not enough.

Maybe use classic no cap but backtracking. Let's consider memory and simplicity. But user hint Myers O((N+M)D), not necessarily bounded. We can implement standard full V with max_d = n+m and offset array? With dynamic parity but no validity, easier and maybe faster. Need ensure backtrack output constraints. Let's inspect standard backtrack with history arrays and x=n,y=m; we earlier formulas using source but with snakes. It worked for examples. Need test a case with common prefix and suffix where d0 not zero.

Implement classic with initial d0 snake. For d>=1, candidate:
 if idx ==0 (k=-d): best = prev[0]
 elif idx ==d (k=d): best = prev[d-1] + 1
 else:
   left=prev[idx-1]; right=prev[idx]
   if left < right: best = right else best = left+1
 y = best - k
 while best < n and y < m and a[best] == b[y]: best++; y++
 curr[idx]=best
 if best >= n and y >= m: found
Break.
This can store best >n? If deletion from n gives n+1. But while condition best<n false. Could store n+1. Backtrack uses prev values. If prev value n+1 appears as x_after, then snake range with x (current maybe n) and x_after=n+1 gives weird. But will backtrack path use it? Need ensure.

Let's attempt to create invalid overshoot on backtrack path. Suppose n=1,m=2 all different path used prev values: at d3 insertion from hist2[1]=1 valid. No overshoot. The overshoot hist2[2]=2 wasn't used. Maybe path never uses overshoot because final k=n-m, and backtrack chooses sources that are closer to final, likely valid. In Myers, overshoot states lie on diagonals outside range needed for final path. Since backtrack starts at k=n-m and d minimal, it should only traverse states on optimal paths within grid. So maybe safe.

But need consider case where minimal path involves deleting extra? No, script length minimal cannot exceed n+m and no edit outside grid. Valid path exists. Standard backtrack should find it.

What if break occurs at state with best > n and y >= m before any valid final at same d? Then history current idx value >n, backtrack start x=n not history value. The path may still be reconstructed? Let's search for counterexample. We can write small brute in head? Let's try n=2,m=1. d0 if a0==b0 then x=1,y=1 not final x<n. d1: k=-1 insertion from x=1,y=2? y=2>=m, x=1<n; best1 not final x<2. k=1 deletion from x=1 -> x=2,y=1 final valid. Break D=1 if deletion? Loop k=-1 first not final, k=1 final. Good. If d0 no match: V0=0. d1 k=-1 insert x0,y1; k=1 delete x1,y0. Not final. d2: k=-2 insert x0,y2; k=0 left0 right1 insert x1,y1; k=2 delete x2,y0. Not final? x=2 but y=0<1. d3: k=-3 x0,y3; k=-1 left0 right1 insert x1,y2; k=1 left1 right2? V2 [0,1,2]. k=1 interior left=V[-1]? for d3 k=1 idx2 left idx1=1 right idx2=2 -> left<right insertion x=2,y=1 final (x=n,y=m) valid. D=3. Overshoot k=2 at d2 x=2,y=0 not used? Backtrack d3 k=1 insertion from hist2[2]=2? k=1,d3 idx_right=(1+3)//2=2, x_after=2, y_prev=2-(2)=0. snake current x=2,y=1, x_after=2, range x-1=1 down to 1? insertion y_prev=0, op +b[0], snake range from x_after=2 to current x=2 empty. set x=2,y=0. d2 current k=2? Since insertion from k+1=2, previous k=2. x=2,y=0,k=2,d=2 boundary k==d deletion: x_prev=hist1[1]=1? Wait hist1 [0,1]. deletion x_prev=1,y_prev=1-(1)=0? k=2, k-1=1, y=0. snake range x-1=1 down to x_prev=1 exclusive empty. op '-', a[1]. set x=1,y=0. d1 k=1 deletion? hist0 [0], op '-' a0. set 0. reverse -a0,-a1,+b0? This gives two deletions one insertion D=3 but for n=2,m=1 all different edit distance should 3? delete both insert one =3, yes. Script -a0,-a1,+b0 valid. No overshoot issue.

Try n=1,m=2 all different D=3 path used no overshoot? It used insertion from hist2[1]=1 valid. Overshoot hist2[2]=2 not used because final k=-1. Symmetric overshoot positive not used for final k negative. If n>m, overshoot negative maybe not used. Final k = n-m positive. For n>m, path likely uses deletion states; overshoot on negative diagonals from insertions may not be used. Good.

Maybe standard no-valid is safe and faster. Need decide final algorithm. Valid variant adds boundary checks but maybe subtle. Standard is simpler and known. But with dynamic parity, if we store prev values that may be >n, and backtracking snake range x_after could be > current x causing range with stop > start? We need guard? If path uses x_after > x, range(x-1, x_after-1, -1) empty? Suppose x_after > x. That would mean previous point after edit is to the right of current final x; impossible for path from n. But if due to history values, maybe. Could safeguard: if x_after > x: set x_after = x? Not correct. But likely not.

Let's test standard on case where d0 snake reaches x=n,y<m and final requires insertions. n=1,m=3 a='a', b='a','x','y'. Optimal =a,+x,+y D=2. Standard:
d0 x=1,y=1 not final.
d1 k=-1: insertion from x=1,y=2 no snake (b1=x vs? a out) curr0=1; k=1 deletion from x=1 -> x=2,y=1 invalid. Loop k=-1 first not final? x=1<n? n=1, x=1>=n, y=2<3. not. k=1 x=2,y=1 not.
d2: k=-2 insertion from prev[0]=1, y=3, x=1>=n,y>=m final at k=-2. D=2. Backtrack d2 k=-2 insertion from hist1[0]=1, y_prev=1-(-1)=2. snake range x=1? current x=n=1,y=3,k=-1? Wait final state at history d2 idx0 k=-2 value 1. Backtrack start x=1,y=3,k=-1? n-m = -2? n=1,m=3 => k=-2. Sorry final k=-2. d=2,k=-2 boundary insertion. x_after=hist1[0]=1, y_prev=1-(-1)=2. op +b[2]='y', set x=1,y=2.
d1 k=-1 boundary insertion: x_after=hist0[0]=1, y_prev=1-0=1. op +b[1]='x'. set x=1,y=1. initial snake x=1: =a. reverse =a,+x,+y. correct.

Overshoot deletion at d1 k=1 x=2,y=1 not used.

What about n=2,m=3 final k=-1. Path may use overshoot positive? likely not.

Thus standard okay.

But valid variant with boundary checks also okay maybe but slower and potentially underestimates less-far. Let's search less-far counterexample for valid variant. Suppose n=2,m=3, all different. D=5. Standard path: final k=-1. It will use insertions along negative diagonals and maybe deletion overshoot? Backtrack: final d=5,k=-1. prev hist4 values. It may choose insertion from k=0 or deletion from k=-2 depending. Let's not.

Valid variant on all different n=2,m=3:
d0 V0=0.
d1 k=-1 insert x0,y1; k=1 delete x1,y0.
d2 k=-2 insert x0,y2; k=0 insert from k=1 x1,y1; k=2 delete from k=1? left=1? For k=2 deletion left prev idx1=1 left<n 1<2 => x2,y0. curr [0,1,2]
d3 k=-3 insert x0,y3 (y=m); k=-1 insertion from k=0 x1,y2 (right=1,y_right=1? valid) and deletion from k=-2 x1,y3? left=0<n -> best1, insertion right1 >= best1 => x1; k=1 deletion from k=0 x2,y1 (left=1<2 best2) insertion from k=2 right=2 y_right=2-2? k=1, k+1=2, right=2,y_prev=0 valid cand2 tie insert? right>=best 2>=2 choose insert x2; k=3 deletion from k=2 left=2<n false invalid. curr [0,1,2,-1]
d4 final? n=2,m=3,k=-1. Need D=5 maybe. k=-3: insertion from k=-2 right=0,y_prev=0-(-2)=2<3 cand0; curr0=0 y3. k=-1: deletion from -2 left=0 best1; insertion from 0 right=1,y_prev=1-0=1<3 cand1 tie insert x1; k=1: deletion from0 left=1 best2; insertion from2 right=2,y_prev=2-2=0<3 cand2 tie insert x2; k=3: deletion from2 left=2 invalid. No final? States x=0,y3 (not x=2); x=1,y2; x=2,y1; k=1 y1 not final. d5: k=-1 final? curr values: likely insertion chain: k=-5 x0,y5 invalid (y_prev4?); k=-3 from -4? Let's compute valid at d4: [-? k=-3=0,k=-1=1,k=1=2,k=3=-1]. d5 k=-3? insertion from k=-2 d4 idx? Need final k=-1. At d5 k=-1: deletion from k=-2? d4 k=-2? parity d4 k=-4,-2,0,2. Wait our d4 values: idx0 k=-4? Let's align. d4 idx range k=-4,-2,0,2. I mislabeled. d4: k=-4: insertion from d3 k=-3? d3 k=-3 value 0? y_prev=0-(-3)=3 invalid -> -1. k=-2: insertion from k=-1 d3 x1 y_prev=1-(-1)=2<3 cand1; deletion from k=-3 d3 x0 best1; insertion tie x1. k=0: insertion from k=1 x2? y_prev=2-1=1 cand2; deletion from -2 x2 best2 tie insert x2. k=2: insertion from k=3 d3 invalid; deletion from k=1 x3? left=2<n false. values [-1,1,2,-1]. d5 k=-1: prev d4 idx_right for k+1=0 idx? k=-1 idx=( -1+5)//2=2 prev idx2=2. insertion x=2,y=2? Wait insertion from k=1? Current k=-1 comes from k+1=0? Wait insertion decreases k: prev k = k+1 =0. d4 k=0 value 2. y_prev = 2 - 0 =2 <3, candidate x=2. deletion from k=-2 prev idx1=1 best=2. right=2 >= best2 choose insertion. After snake x=2,y=3 final. Backtrack uses insertion from k=0 valid. Good.

Valid works.

But could valid under-reach in some boundary case? I suspect not for LCS. But standard is simpler. Let's choose standard with dynamic parity and maybe minimal boundary checks only for while. It is known to output shortest. Need ensure history snapshots with values >n don't break backtracking for some cases. Could incorporate cap x to n (and not y) in forward to keep V within x bound. This reduces overshoot. Does capping x to n preserve correctness? It prevents x>n. But if deletion from n invalid, capping to n may store state at x=n with same diagonal y maybe changed? Candidate x=n, y=n-k. If prev x=n,y_prev <m, deletion invalid but cap keeps y=n-k = y_prev? Because prev k-1: y_prev=n-(k-1); cap x=n => y=n-k=y_prev-1? Wait deletion candidate x=n+1,y=y_prev. Capping to n gives y=n-k = y_prev-1? That changes diagonal point upward, effectively not deletion. Not valid. But may not hurt? Could over/under. Avoid cap except maybe for while condition. We can store x as candidate (could n+1). For snake while uses x<n. Backtrack start n. Hmm.

Maybe use classic with full array of size 2*maxD+3 and standard algorithm exactly; many implementations use V[1]=0 and maxD, and backtracking stores V snapshots. They don't cap and work. But with dynamic parity and no V[1] sentinel? Let's adapt exact classic for easier backtrack? We can include sentinel V[1]=0 at d=0? Standard starts d=0 with V[1]=0 and for d=0 k=0? Let's see.

Standard pseudocode:
V = array length 2*max+1, V[1]=0
for d=0..max:
  for k=-d..d step2:
    if k == -d or (k != d and V[k-1] < V[k+1]):
       x = V[k+1]
    else:
       x = V[k-1]+1
    y=x-k
    while x<N and y<M and A[x]==B[y]: x++,y++
    V[k]=x
    if x>=N and y>=M: return
This uses V[1]=0 and at d=0,k=0: condition k==-d true => x=V[1]=0; y=0; snake; V[0]=x. So no separate d0 needed. For d=1,k=-1: x=V[0]; k=1: x=V[0]+1. Works.
Need store V snapshots with offset. For d=0 length? If using dynamic parity, at d=0 length1 [x]. Need for d=1,k=-1 use prev[0]; for k=1 use prev[0]+1. Same as initial snake. Good.

But standard d=0 uses V[1]=0 for insertion candidate; with dynamic we start x=0 and snake directly. Equivalent if no prefix? With prefix, V[0]=x. Good.

For d>=1, candidate standard no validity:
 idx=0 k=-d: best = prev[0]
 idx=d k=d: best = prev[d-1]+1
 else:
   left=prev[idx-1]; right=prev[idx]
   if left < right: best=right else best=left+1
 y=best-k
 while best<n and y<m and a[best]==b[y]: best++; y++
 curr[idx]=best
 if best >= n and y >= m: found
This is classic. Let's test with identical a==b. d0 x=n,y=m found immediately if we handle before d loop? Standard d0 loop would check after snake and return. We can do.

Backtracking standard for classic:
We have history snapshots for d=0..D. history[d] length d+1 for k=-d+2idx.
Start x=n,y=m. But final found may have best > n? If best>=n,y>=m, but start n,m. Need maybe if final found at state with best>n, then x history not n. But standard backtrack from n,m? Let's look at classic backtrack using history. It typically uses:
k = N - M
for d in D down to 1:
  if k == -d or (k != d and V[d-1][k-1] < V[d-1][k+1]):
     prev_k = k+1
  else: prev_k = k-1
  # snake: from x_start,y_start? It uses V[d][k] to get current x? Actually if start N,M, V[D][final_k] may equal N,M. If not, maybe issue. But for valid edit distance, V[D][k]=N,M. If found overshoot, V[D][k]>N maybe. But then standard would set x=V[D][k]? Many implementations reconstruct from V[D][k] then adjust? Let's find.
From Myers paper: To backtrack, let x=V[N+M][k], y=x-k. While x>y? They record. They start from final V not N,M. But edit path to V may be beyond grid; then adjust? Hmm.

Maybe use valid variant to guarantee history final x=n,y=m. It stores candidate valid, final best==n,y==m. Then backtrack start n,m safe. I lean valid variant for guarantee. Need be sure it doesn't miss due to furthest dominance. Could maybe use a hybrid: store classic but after finding first x>=n,y>=m, if x>n or y>m, continue? Could find valid final same or later. For minimal, we need first valid final. We can modify classic forward to only break when best == n and y == m (not >=), and maybe cap to prevent huge. But it may store invalid states and use them in recurrence; could find valid final minimal? If we don't break on overshoot, continue until valid final. Could invalid states cause later valid final with too small d? Maybe overestimation could yield a valid final at d smaller than true? It could use invalid state x>n,y=m to insert? Insertion doesn't change x, stays >n; snake condition false; final check best==n false if x>n. So won't valid final unless later deletion? deletion from x>n increases x, not n. So overshoot cannot become x=n. If we break only on x==n and y==m, overshoot won't break. But could recurrence using overshoot produce candidate x for some diagonal that after snake becomes n? If candidate x >n, no snake, curr >n. Never becomes n. So valid final unaffected. It may waste time exploring overshoot states. But we can prune states that are invalid: if best > n or y <0 or y>m? For classic, if candidate invalid, we could set curr=-1 to prune. But then need handle invalid predecessor and less-far? If we prune candidate that goes outside, might miss valid less-far (as before). But maybe not needed.

Could use standard candidate (left<right) but only store if candidate and y within bounds? If candidate invalid because left=n deletion, we skip; but maybe less-far deletion from left=n diagonal? left is furthest; if furthest invalid at right boundary, less-far valid could be needed? uncertain.

Alternative: Use dynamic programming with bitsets for 1000? LCS via bitset O(N*M/word) could compute edit script? Maybe not minimal script reconstruction.

Given constraints modest, could implement O(N*M) DP for completely different 1000 (1e6 cells) to get LCS and backtrack, guaranteed correct. For 20k D small, O(NM) impossible. Could choose algorithm based on D? Need D unknown. Could use Myers classic and fallback to DP for small n,m? But if Myers bug, DP for small. For 1000 completely different, DP 1e6 memory maybe 1e6 ints ~28MB or bitset? Could use DP to ensure correctness for 1000? But 20k with small D use Myers. Hybrid: If len(a)*len(b) <= threshold (e.g., 1e6), use DP/Hunt-Szymanski? But if hidden includes 1000 completely different, DP fine. For 20k D small, Myers. Could use DP for correctness safety? But code longer. DP LCS backtrack minimal O(n*m) time memory. For 1000 all different 1e6, under 6s Python? DP nested loops 1e6 maybe okay. But reconstruct LCS requires storing matrix maybe 1e6 ints; okay memory ~28MB if array('H')? n,m 1000 fits short. Or use Hirschberg? More complex.

Maybe implement DP for small product as fallback or even primary for n,m <= 2000. But Myers already okay. Need ensure minimal. Could validate Myers with DP in development but not final.

Could implement Myers linear space (divide and conquer) from standard Python difflib? Not difflib. The linear space algorithm is proven and doesn't store all V. But implementing correctly with backtracking is more complex. However it avoids history memory and boundary overshoot? It computes snakes recursively using midpoints, outputs script. Could be robust and O(ND) time. Let's explore.

Myers divide and conquer (O(ND) time, O(N+M) memory):
Function diff(a,a0,a1,b,b0,b1, output): find middle snake in edit graph, split, recurse. This is complex but doable. Need output shortest script. For performance, 20k D=50, D*N? It computes forward/backward for each recursion; maybe okay. But code longer and subtle. Storing history simpler.

Maybe implement classic forward with history and use DP backtracking? Hmm.

Let's thoroughly test valid variant for less-far dominance by trying to construct counterexample. The recurrence for furthest valid state at distance d on diagonal k:
F_d(k) = max x such that there exists valid path length d to (x, x-k). Recurrence can be expressed as max over valid moves from F_{d-1}(k-1) and F_{d-1}(k+1)? Since if furthest predecessor invalid for a move, could a non-furthest predecessor valid produce larger x than other options? But if non-furthest is on k-1 and deletion valid, its x' <= F_{d-1}(k-1)=x_f. Deletion candidate x'+1 <= x_f. Furthest predecessor maybe invalid only if x_f = n (right boundary). Then x'+1 <= n. Current k = (k-1)+1. Candidate <=n. Could there be no other source, and x'+1 useful even though x_f invalid? If x_f=n, then F_{d-1}(k-1)=n. The diagonal k-1 has a valid point at (n, n-(k-1)). Since x_f=n. Its y_f = n-k+1. If y_f=m? final maybe. If y_f<m, insertion from this point goes to diagonal k-2. But current k via deletion from k-1 invalid because x=n. Non-furthest deletion gives x<=n-1 on current k. Is that useful? From current k with x<=n-1,y = x-k. Since F_{d-1}(k-1)=n at x=n,y_f. Note y on current k for nonfurthest = x-k <= n-1-k = y_f-2? Wait x'=n-1 -> y'=n-1-k = y_f-2? Actually y_f = n-(k-1)=n-k+1, so y'=y_f-2. It skipped two y? Because diagonal changed? Deleting one from x=n-1,y=y_f-2? But predecessor on same diagonal k-1 with x'=n-1 has y'=x'-(k-1)=n-k = y_f-1. Deletion to current k keeps y=y_f-1. So x'=n-1,y=n-k. This point is one up from furthest's y_f? Furthest invalid deletion. Could nonfurthest deletion be useful to reach current diagonal at y_f-1. Could furthest instead do something? It cannot delete; can insert to k-2 (if y_f<m) to point (n,y_f+1). That's different diagonal. For current k, insertion from k+1 maybe. Could nonfurthest deletion be needed for optimal? Suppose final diagonal k is much lower? Let's choose numbers. n=3,m=5, final k=-2. Diagonal k-1=-? If current k=-2, predecessor k-1=-3. Furthest on k-1 at x=n=3,y=6? m=5 invalid (bottom). Not right boundary. Hmm.

Right boundary furthest y<m: n=3,m=5,k-1? x=3,y<5 => 3-(k-1)<5 => k-1 > -2 => k > -1. But final k maybe >=0. For n>m, final k positive. Could be. Example n=5,m=3 final k=2. Diagonal k-1=1. Furthest x=n=5,y=4? >m invalid bottom, not y<m. For x=n,y<m => 5-(k-1)<3 => k-1>2 => k>3. Diagonal > final k. On backtrack from final k=2, won't go to k=3? It might? If minimal path from k=2 to end? final diagonal is 2. Paths may wander above final k then insertion back? Shortest path might not need. Edit distance path from start to end could have diagonal k up to d. It may go above n-m. If furthest on high diagonal right boundary, maybe needed? Example more deletions than insertions early then insertions later. Could be.

Let's find concrete counterexample for valid variant by brute force mentally is hard. Maybe standard algorithms with boundary validity use more than furthest? Actually the DP furthest-reaching in edit graph typically stores furthest x for each diagonal without validity; because invalid states are allowed in the mathematical edit distance (grid extended?) But if you restrict to valid states, furthest may still suffice due to convexity? I think yes because the set of reachable x on a diagonal at distance d is an interval [min_x, max_x] (maybe), and the furthest valid dominates for future if moves valid? For insertions at bottom, the interval's max may be bottom invalid but a lower valid can insert; but after insertion, resulting current x = lower x, while max point can maybe reach current or farther via other edits. Need not rely.

Maybe to be 100% correct, use DP for small and classic for large; hidden correctness likely on small. But if valid variant bug could fail hidden. Classic likely correct. Let's use classic standard and ensure backtrack from history maybe use V[D] x instead of n,m? We can reconstruct from final state in history if it overshoots? Need output valid. But if we only break when valid x==n,y==m, classic with pruning? Let's design safe bounded furthest that stores reachable intervals maybe to handle less-far. Since constraints small, we could store for each d,k the furthest and maybe also something? To handle boundary less-far, store furthest valid x and ensure if furthest invalid for move, use next furthest? But reachable set on diagonal might not be interval? In edit graph, at fixed d,k, reachable x values maybe all x between min and max satisfying parity? Since you can always waste edits? With fixed d, not necessarily. Could store second best? Too much.

Maybe implement O(ND) using full edit graph with BFS layers? For D up to 2000, states within grid ~1e6, can store all reachable x per diagonal interval [low, high]? Could compute furthest and smallest? For edit distance, reachable set on a diagonal may be contiguous due to ability to waste edits? Not sure with fixed d.

Let's consider using standard library difflib? User forbids. Could use SequenceMatcher to find matching blocks? Not always minimal? They say difflib output not always minimal. Not allowed.

Could use longest common subsequence via bitset (Hunt-Szymanski) and reconstruct. For 20k with 50 differences, LCS length ~19950. Bitset LCS O(N*M/word) maybe 20k*20k/word ~6M word ops? Python big ints maybe fast. For completely different 1000, bitset length 1000 *1000 iterations? There is bit-parallel LCS algorithm O(N * M/word) using Python ints; for 20k x20k maybe 400M bit ops? But Python big int operations on 20k bits per char => 20k*2500 bytes = 50MB ops maybe maybe seconds? Actually bitset LCS algorithm can be very fast in Python for 20k? Need reconstruct LCS minimal edit script. Bitset can compute LCS length but reconstructing sequence maybe possible with backtracking using bitset? Complex. Also need shortest edit script, not just LCS. Could use bitset to find matches and then generate diff? Need ensure minimal.

Another option: Use Patience diff? Not always minimal? No.

Myers history classic is expected.

Let's verify standard backtrack with history and x=n,y=m is correct for classic. We can search memory: In Myers algorithm, after forward phase, you store V arrays. For backtracking, you start at (N,M) and use V[d-1] to decide previous diagonal. It doesn't require V[D][k]=N,M because edit path may go through cells beyond N,M but can be clipped. However if we choose source using standard condition, previous prev_x = V[d-1][prev_k] might be >N; but snake loop from current x to prev_x? Standard uses if x > prev_x and y > prev_y record match while x>prev_x and y>prev_y. If prev_x > x, condition false? Then record insertion/deletion? If prev_x > x, for insertion current x maybe n, prev_x n+1? Then x > prev_x false and y > prev_y? y=m, prev_y=m? false; then if x > prev_x else insertion? Might record insertion with b[prev_y]? index m out of range. So need avoid.

But maybe prev_x never >x on path. Let's test possible. Start x=n,y=m. At step choose insertion (prev_k=k+1), prev_x = V[d-1][k+1]. Is prev_x <= n? It should be x_after <= current x? For a valid edit source, x_after <= current x. If history V at that diagonal >n, could be >n. But if that diagonal state with >n is the one chosen by condition, maybe path invalid. Could condition choose it even though there is a valid smaller prev state? Since V stores only furthest; if furthest >n, it may choose it. Example final k negative? Need prev_k=k+1 closer to final. Could be overshoot. But for final valid path, the furthest on prev diagonal might still be >n but there is a valid point; condition uses furthest. Backtrack would use invalid. Could this happen? Suppose prev diagonal k+1 has furthest >n because deletion overshoot, but also a valid path on that diagonal. The current final state might be reached from the valid point, but furthest >n chosen due to condition. Then backtrack fails. Is that possible with minimal d? Maybe. Need example.

Let's attempt n=1,m=2 all different. Final D=3. At d3 final k=-1. Prev diagonal k+1=0. V[d2][0] =? We computed d2 k=0 x=1 valid, not >n. Overshoot d2 k=2 x=2. Not chosen.
For n=2,m=1 final D=3,k=1. Prev diagonal k+1=2 for insertion? At d3 k=1 condition left<right? Hist2 k=0 x=1, k=2 x=2. left=V[0]=1? current k=1: k != ±3; left idx1? Wait d3 k=1, prev k-1=0 val1, k+1=2 val2; left<right true -> insertion from k+1=2, prev_x=2 (<=n) valid. Not overshoot >n. If n=1,m=3 final D=4? a unique, b unique length3. n=1,m=3 all different D=4. Final k=-2. Backtrack maybe insertion from prev k=-1. Overshoot positive diagonals not used. For n>m, insertion from prev positive diagonal value maybe n not >n. Overshoot >n only from deleting when prev x=n. Those diagonals k > n-m? For n=1,m=2 overshoot k=2 > final k=-1. Backtrack from final negative chooses lower k states, not overshoot. For n>m final positive, overshoot negative? Insertions when prev y=m may produce states k more negative? Could overshoot y>m but x<=n; those diagonals k < n-m maybe not chosen? For n>m, final k positive; insertion overshoot negative diagonal might be used if current k=0 from prev k=1? Not sure.

Maybe overshoot states lie outside range between 0 and final? The standard condition and parity ensure chosen prev_k between current? It might not choose far overshoot.

Given many implementations use this exact backtrack with x=N,y=M and V values (which may exceed) and work, I think okay. But to be safe, we can in backtrack clamp prev_x to x if prev_x > x and prev_y < y? But might alter op. Better to ensure forward doesn't store overshoot >n or >m by using a bounded version that stores furthest valid with intervals? Hmm.

Let's consider implementing classic with history and at the end if found final x>n or y>m, continue D? We can modify break condition:
 if best == n and y == m: found.
But to allow recurrence to use overshoot? We can prune overshoot? Maybe if best > n or y <0 or y >m, set curr[idx] = -1? Could miss valid paths but maybe not due to furthest. Alternatively store classic values but also when x>n set x=n for storage? Not sure.

What if we run standard but with sentinel maxD and store V as arrays; in backtracking, if prev_x > x, set prev_x = x and prev_y = prev_x - prev_k? That corresponds to clipping to grid. For insertion: prev_k=k+1; prev_y = x - (k+1) = y-1. If history prev_x > x due overshoot, clipping prev_x to x yields valid insertion from (x,y-1) (if y>0) and op +b[y-1]. This might salvage. Similarly deletion if prev_y > y? But clipping may produce valid script. Could implement backtracking snake logic not using prev_x for op line, but using current x/y and prev_k. Standard backtrack can derive op from current position rather than history prev_x when clipping:
- If insertion: current move from (x, y-1) to (x,y) maybe? If history x_after could be less than x due snake. We need know x_start for snake. If prev_x_history > x, set x_start=x, then snake length zero, op + b[y-1]. If prev_x_history <= x, use as before. For deletion: if prev_y_history > y? set y_start=y.
But line for insertion could be b[y_start-1]. If x_start = prev_x_history maybe >x, use x_start=x and inserted line b[y-1]. If snake length positive, inserted line b[y_prev_history]? But if history prev_y < y? Let's derive.
Could make backtrack robust by using history only to choose prev_k, not to get prev_x? For snake length, need x_start on current diagonal after edit. Could compute max(0?) from history but clip to <=current x and >=? For insertion, x_start = min(history x_after, x). Then y_start = x_start - k. Ensure y_start <= y. For deletion, x_start = history x_prev + 1? Could clip x_start <= x; y_start = x_start - k. Then snake indices from x_start to x-1. Op line: for insertion, inserted b[y_start-1]; if y_start==0 invalid. But if x_start clipped to x and y_start=y, then inserted b[y-1]. Good. For deletion, x_start=x_prev+1 clipped; y_start=x_start-k. deleted a[x_start-1]. This might produce valid op even if history prev_x invalid. Need ensure snake matches are equal; if we clip, we may assume a[x_start:x] == b[y_start:y]. If history overshoot not valid, but if current path valid, clipping to actual current path maybe okay? But if we clip incorrectly, may assume matches that aren't equal. However snake loop could just check while? Since output must be valid. In reverse, we can't easily verify. Could only use history prev_x if <=x (or x_prev < x for deletion); if not, set snake length zero and op at current boundary. This yields some edit script? Need ensure total ops length d and transforms. Starting at end, for insertion if x_after>x, set x_after=x, y_prev=x-(k+1)=y-1. This is valid if y>0. If y==0, insertion impossible; shouldn't choose insertion. For deletion if x_prev+1 > x? set x_prev=x-1, y_prev=x_prev-(k-1)=y. deletion line a[x-1]. If x==0 invalid.

This robust backtrack can handle history overshoot by clipping to current position. But does it preserve minimal length? It uses one op per d step, yes. It records snakes for clipped x_start to current x. If clipping reduces snake length, total ops still d plus matches. It might output a valid minimal script if choices correspond. Need test if such clipping could produce mismatched lines? For insertion: snake after insertion from x_start to x. If x_start=history prev_x maybe <=x. Those should be matches because forward did snake. If x_start clipped to x, empty snake. If x_start clipped to less than x due to overshoot? We only clip if >x; if <=x use. If history prev_x <=x but path not actually snake matches? It is furthest after edit; forward did snake, so yes. If history prev_x < 0? Could clip to x? But path not.

For deletion: if x_prev_history +1 <=x, snake matches valid. If >x, set x_start=x and deleted a[x-1], empty snake. But if x==0 invalid; shouldn't.

Could use robust backtrack with standard forward. That might be safest: forward classic (no validity) stores furthest values (some overshoot). Backtrack uses standard condition to choose prev_k; then compute start_x from prev values but clamp into current rectangle. Then record snake matches from start_x to current x-1. But need for deletion start_x = max(prev_x+1, ?). If prev_x_history > n? Then start_x > x; clamp to x. For insertion start_x = prev_x_history (or maybe if prev_x_history < x? use; if >x clamp x). Also need ensure y_start within [0,m]. For insertion y_start=x_start-k; inserted line index y_start-1. If y_start<=0 but insertion chosen, could set y_start = min(max(y_start,1), y)? Hmm. But if y_start<=0, cannot insert; maybe choose other source? At boundary k=-d insertion only. If y_start=0 and y>0? inserted line index -1 invalid. Example k=0 insertion from k+1=1 prev_x=1,y=1? y_start=1 valid. For k=-d at start? If current k=-d, previous k=1-d. At d1 k=-1 insertion from k=0 prev_x after d0 maybe 0; y_start=0? For d1 current x maybe 0? Insertion line b[0]. y_start after edit = x_start-k = 0-(-1)=1; inserted b[0]. If start_x=0,y_start=1. Good. For boundary k=-d and current x may be n? If start_x=x, y_start=y. Inserted line b[y-1]. If y=0? But if k=-d and y=0 => x=k=-d negative impossible. y = x-k >0. So okay.
For deletion: start_x = prev_x_history +1. y_start=start_x-k; deleted line a[start_x-1]. If prev_x_history>=x, set start_x=x, y_start=y, deleted a[x-1]. Need x>0. If x==0 invalid; shouldn't.

Need record snake matches for insertion from start_x to x-1. But y_start = x_start - k. If start_x clipped to x and y_start=y. If start_x < x, then lines a[start_x:x] and b[y_start:y] were matched in forward. If start_x may be > x? not. If start_x < 0? If prev_x_history=-1? We can set start_x=x. But classic V values can be -? We initialize no -1; candidate from prev may be 0; x never negative? V values can be? With V[1]=0, no invalid but could x be negative? k positive large, x from prev maybe 0? y=x-k negative. x not negative. Could curr store 0 on diagonals with negative y. So prev_x_history >=0. Good.

Thus robust backtrack can handle overshoot and no validity. Need ensure if prev_x_history is far >n and start_x clipped, the previous state's actual furthest maybe >x but we effectively choose a valid predecessor at current x on prev diagonal (prev_k). That predecessor has x= x (or x_prev = x-1) and y=x_prev-prev_k. Is that reachable in d-1? Maybe not according to history but perhaps by monotonicity? If furthest on prev diagonal is >x, then there is a valid point at x? Are all intermediate x reachable? Not guaranteed but likely due to edit paths. If not, our backtrack could produce invalid ops but maybe still valid due to clipping? Need test.

Example: history says furthest on prev diagonal k=2 at d-1 is x=100, but current x=50. We choose insertion and set start_x=50. Is there a path of length d-1 to (50,48) on k=2? Maybe yes if reachable set interval. Likely. Could be okay.

Maybe we can avoid overshoot by using standard but setting found when best >= n and y >= m, and in backtracking using robust clipping. This likely correct and fast. But need ensure op sequence length d? We add one op for each d plus snakes. Initial snake. Yes.

Let's test robust backtrack on standard history for a case where history prev_x > current x. Need find if occurs. All different n=1,m=2 final path did not. But maybe other cases. If not, robust just same.

Let's test robust on classic history for identical? D=0 no backtrack.

Test on simple: a=['a','b'], b=['a','c','b'] standard:
d0 snake x=1,y=1 not final.
d1 k=-1: insertion from prev0=1 x=1,y=2; snake a1=b,b2=b => x=2,y=3 final? n=2,m=3 yes D=1. History d1 [2,? maybe k=1 if not break? Break at k=-1 before k=1. curr idx0=2. D=1. Backtrack d1 k=-1 boundary insertion. prev hist0 [1]. prev_x=1 <=x=2. start_x=1,y_start=2. snake range x-1=1 down to start_x=1 inclusive? For insertion formula range(x-1=1, start_x-1=0, -1) includes 1 -> =b. op '+', b[start_y-1=1]='c'. set x=1,y_prev=1-0=1? prev_k=0 y_prev=1. initial snake =a. correct.

Test robust deletion: a=['A','B'], b=['B'] standard d0 V0=0 (A!=B). d1 k=-1 insert x0,y1 no snake? y=m not snake; curr0=0. k=1 deletion from V0=1,y0; snake a1=b,b0=b => x=2,y1 final. D=1 break after k=1? loop ascending: k=-1 first curr0=0 not final; k=1 curr1=2 final. Backtrack d1 k=1 boundary deletion. prev hist0 [0]. start_x=prev_x+1=1, y_start=1-1=0? k=1, y=0. snake range x-1=1 down to start_x=1? For deletion formula range(x-1, x_prev, -1) with x_prev=0: range(1,0,-1) includes 1 -> =B. op '-', a[start_x-1=0]='A'. set x=0,y=0. correct.

Now, need implement standard forward with dynamic parity. Let's define history[0] = [x0] after initial snake. If x0==n and y0==m return all '='. For d:
 curr = [0]*(d+1)
 for idx in range(d+1):
  if idx == 0: best=prev[0]
  elif idx == d: best=prev[d-1]+1
  else:
    left=prev[idx-1]; right=prev[idx]
    if left < right: best=right else best=left+1
  y=best - k
  while best<n and y<m and a[best]==b[y]: best+=1; y+=1
  curr[idx]=best
  if best >= n and y >= m:
     found=True; break
But break condition can be best >= n and y >= m; if y computed may be negative? If best=0,k large, y negative. Not final. best could >n. okay. If best>=n and y>=m but y could be m+1, found maybe overshoot. Robust backtrack can handle. But if found overshoot at d, is D minimal? Could there be valid final at same d but after? If break overshoot before valid same d, robust backtrack may still produce valid script of length d? It might produce a valid edit script of length d? If overshoot state corresponds to path that goes beyond grid, robust clipping may produce valid path of length d. If yes minimal still. If no, could be wrong. But classic proof says if reaches or beyond corner at distance d, edit distance <=d; if d is first, D minimal. There exists valid script of length <=d. It could be <d but then would have been found earlier? Maybe overshoot path length d but valid script length d by clipping. Good.

Should we break on best >=n and y>=m or best == n and y == m? Classic uses >=. Use >=.

Now, backtrack robust algorithm details:
ops=[]
x=n; y=m
for d in range(D,0,-1):
  prev=history[d-1]
  k=x-y
  # choose insert if standard condition based on prev values? Use same condition as forward for current d,k.
  if k == -d:
      insert=True
  elif k == d:
      insert=False
  else:
      idx_right = (k + d)//2
      idx_left = idx_right -1
      # values may be out of current parity? prev length d, idx valid.
      left = prev[idx_left]
      right = prev[idx_right]
      if left < right: insert=True else insert=False
  if insert:
      # prev_k = k+1
      idx_prev = (k + 1 + (d-1)) // 2 = (k + d)//2 = idx_right? For d loop, for boundaries too.
      prev_x = prev[idx_prev]
      # compute start_x = prev_x (point after insertion? Actually x after edit same as prev_x)
      start_x = prev_x
      # Clip start_x to [?, x]. If start_x < 0? set x? But prev_x>=0.
      if start_x > x:
          start_x = x
      elif start_x < 0:
          start_x = x
      # y_start = start_x - k. Need y_start <= y? If start_x <= x, y_start <= y. Good.
      # Ensure y_start >=1 for inserted line? Inserted index y_start-1.
      if y_start < 1:
          # invalid; maybe set y_start = min(y,1)? Actually if y_start<=0, insertion from previous point below grid. Could set start_x = y + k? Let's derive to make y_start=y? For insertion, inserted line is b[y-1], previous point (x,y-1). We can set start_x=x, start_y=y. Then inserted line b[y-1]. This is safe if y>0. Since insertion chosen and current y should >0.
          start_x = x
          start_y = y
      else:
          start_y = start_x - k
      # Record snake from start_x to x-1. If start_x may be <0? no.
      for xx in range(x-1, start_x-1, -1): ops.append(('=',a[xx]))
      if start_y <= 0: # fallback inserted at b[0]? But need valid: line b[start_y-1]
          # if start_y<1, use b[y-1]? We'll ensure start_y>=1.
      ops.append(('+', b[start_y-1]))
      # set x,y to previous point (prev diagonal): (start_x, start_y-1)
      x, y = start_x, start_y - 1
  else:
      # deletion from k-1
      idx_prev = (k - 1 + (d-1)) // 2 = (k + d - 2)//2 = idx_left (or d-1 boundary)
      prev_x = prev[idx_prev]
      # point after deletion start_x = prev_x + 1
      start_x = prev_x + 1
      if start_x > x:
          start_x = x
      if start_x < 1:
          start_x = x
      start_y = start_x - k
      # ensure start_y <= y; if start_x <=x yes. If start_x set x, =y.
      # deleted line index start_x-1; need >=0. If start_x<1 set x? if x==0 invalid.
      for xx in range(x-1, start_x, -1): ops.append(('=',a[xx])) # snake starts at start_x? Wait after deletion start_x = x_after. For matches, indices start_x .. x-1. If start_x = prev_x+1. For x_after, range(x-1, start_x-1?) Let's re-evaluate.
      # Deletion: prev point (prev_x, prev_y). After deletion: x_after=prev_x+1, y_after=prev_y. Snake from x_after to final x. Matching indices x_after..x-1. Reverse range(x-1, x_after-1, -1) if want include x_after? Earlier I used range(x-1, x_prev, -1) where x_prev=prev_x, equivalent stop=x_after-1. If start_x=x_after, include start_x: range(x-1, start_x-1, -1). If start_x=x (clipped), empty. So use start_x not start_x-1.
      # If x_after=0? deletion cannot from x=-1.
      ops.append(('-', a[start_x-1]))
      x,y = start_x-1, start_y

Need careful with insertion snake: insertion x_after=start_x. Matches indices start_x..x-1. Reverse include start_x: range(x-1, start_x-1, -1). Good.
Deletion snake: matches indices start_x..x-1 where start_x=x_after. Use same range(x-1, start_x-1, -1). But earlier formula range(x-1, x_prev, -1) = stop=x_prev exclusive = start_x-1. Good. So use start_x.

Need ensure if start_x clipped to x, range empty (range(x-1,x-1,-1)). Good.

For insertion previous point: before insertion = (start_x, start_y-1). Need start_y>=1. For deletion previous point=(start_x-1,start_y). Need start_x>=1.

But if start_x is clipped to x and start_y maybe not equal y? If start_x=x, start_y=x-k=y, good. If start_x<0 and set x, good. If start_x valid but y_start may be >y? Since start_x<=x => y_start<=y. Could y_start<0? if k > start_x. But if start_x from prev_x may be less than k. Then insertion y_start negative invalid. Set to x,y. But then previous point (x,y-1) reachable? Maybe. If y>0.

If start_y > y? no. If start_x > x clipped, start_y = x-k = y.

Need choose start_x lower bound maybe max(0,k?) For insertion, start_x should be at least? If k negative, start_x can be 0. If k positive, start_x should be >=k to have y_start>=0. But if prev_x < k, invalid; clip to x? Could set start_x = max(prev_x, k, 0)? But if k > x? Can current y=x-k negative? Current x,y valid => y>=0 so x>=k. Thus max(prev_x,k) <=x? if prev_x <k, set start_x=k. Then y_start=0, insertion line index -1 invalid. Need set start_x=x for insertion line. Which is better? If current valid y=0, insertion impossible (y_prev=-1); but backtrack shouldn't choose insertion at y=0 unless k? Insertion from k+1 with current y=0 means prev y=-1 invalid. Standard condition could choose due to history? Maybe if history right<left? At boundary? To be safe if y==0, insertion not valid; choose deletion if possible. But standard condition may choose insertion at k=-d boundary with y>0. If robust encounters insertion with y==0, we can force deletion? But decision already chosen. Could set start_x=x and inserted line b[-1] invalid. We can check: if insert and y==0: insert=False? But then prev_k different; could violate parity? For current state, if y=0, last move cannot be insertion (would require previous y=-1). So choose deletion. Similarly if x=0, last move cannot be deletion. We can adjust:
  if insert and y == 0: insert=False
  if not insert and x == 0: insert=True
But standard condition should guarantee if y=0 then k==d? Because y=x-k, d parity? If k=d and x=n? Deletion. But robust safe.

For insertion line index start_y-1; start_y could equal 0 only if start_x=k. Since current y>=? If y=0, we set insert false. If y>0 but start_y=0 due prev_x<k, we could set start_x=x,y_start=y to make valid (insert at end). But that changes snake length. Could be okay if history invalid.

Maybe too many hacks. Simpler: Use valid variant which ensures no invalid source. But less-far concern. Could combine: use standard forward but store only valid states? Hmm.

Maybe we can implement standard forward with boundary validity but also store all reachable max; it's probably correct. Let's research from first principles: In edit graph, for fixed d, the furthest x on diagonal k is enough even with boundaries because if furthest point is at boundary and cannot move in a direction, a less-furthest point in that direction would produce a point with x <= furthest_x, and the boundary point can achieve at least as far on some diagonal that dominates? This is related to Myers' O(ND) proof using furthest reaching paths in a grid. It doesn't consider invalid moves, but paths outside grid are allowed and can be truncated. If we restrict moves to valid, storing only furthest valid may still be correct because any path using a non-furthest valid predecessor to cross boundary can be transformed to one using furthest valid predecessor and possibly different edits of no greater length. I think so. We can use valid variant; it's conceptually DP over grid with dominance. It should be correct.

Let's test valid variant on a case requiring insertion from non-furthest bottom. Could brute small with code but can't run. Try to manually find where valid variant fails. We can model all edit paths for small grids and compare F_d(k) max. Does recurrence with only max valid predecessor produce true F? Let's test a small grid where boundary invalid may matter. Grid n=2,m=2. Enumerate d.
Initial d0 snake for no matches: F0[0]=0.
d1: valid recurrence:
 k=-1: insertion from 0 y_prev=0<2 -> x=0.
 k=1: deletion from 0 -> x=1.
True.
d2: k=-2 insertion from -1 x=0,y_prev=1<2 ->0; k=0 deletion from -1 x=0 best1; insertion from 1 x=1 y_prev=0<2 cand1 tie insert ->1; k=2 deletion from1 left=1<2 ->2. True F? Could there be path length2 to k=0 x=2? Start (0,0): delete (1,0), delete (2,-1) invalid; insert (0,1), insert (0,2) k=-2; delete+insert: (1,0)->(1,1) k0 x1; insert+delete: (0,1)->(1,1)x1. So F0=1. Good.
d3: k=-1 insertion from -2 x0 y_prev=2? not <2 invalid; deletion from -3 none; but true path length3 to k=-1? For all diff n=2,m=2, edit distance 4? Actually all diff LCS0 D=4. At d3, states: delete+delete? (2,0) k2; delete+insert? (1,1) k0; insert+insert? (0,2) k-2. Need 3 edits: delete delete insert -> (2,1) k1; delete insert insert -> (1,2) k-1 x1; insert insert delete -> (1,2) k-1 x1. So F[-1]=1. Valid recurrence: d2 values [-? k=-2=0,k=0=1,k=2=2]. d3 k=-1 idx1? insertion from k=0 right=1 y_prev=1-0=1<2 cand1; deletion from k=-2 left=0 best1; tie insert ->1. Good. k=1: insertion from k=2 right=2 y_prev=2-2=0<2 cand2; deletion from k=0 left=1 best2 tie insert ->2. True path insert insert delete? (1,2) then delete ->(2,2) k0? Wait k=1 length3 maybe delete delete insert: (2,1) x2 yes. Good.
d4 final k=0: insertion from k=1 x2 y_prev=2-1=1<2 cand2; deletion from -1 x1 best2 tie insert ->2 final. Good.

Boundary less-far: n=2,m=2 d3 k=2: valid recurrence deletion from k=1 left=1 best2; insertion from k=3 none. True. If left furthest at x=2? At d3 k=1 F=2, y=1? valid deletion to k=2 x=3 invalid? For d4 k=2 maybe not.

n=3,m=1. all diff. F:
d0 [0]
d1 k=-1 insert x0,y1; k=1 delete x1,y0.
d2 k=-2 insert from -1 x0,y2 invalid because y_prev=1? m=1, insertion from k=-1 y_prev=1-(? k=-1, k+1=0, right=0, y_prev=0? Wait d1 k=-1 x0,y1. For d2 k=-2 insertion from k=-1 x0,y_prev=0-( -1?) k=-2, k+1=-1, y_prev=0-(-1)=1 not <m invalid. But valid recurrence would set -1. True reachable length2: insert+insert invalid; delete+insert -> (1,1) k0 x1; insert+delete -> (1,1)x1; delete+delete -> (2,0) k2 x2. So k=-2 unreachable valid, k=0 x1, k=2 x2. Recurrence:
d2 k=-2: insert invalid -> -1.
k=0: deletion from -1 left=0 best1; insertion from 1 right=1 y_prev=1-(1)=0<m cand1 tie insert ->1.
k=2: deletion from1 left=1<3 best2. Good.
d3 final k=2: insertion from k=3 none? deletion from k=1 left? d2 k=1 unreachable? d2 k range -2,0,2. For k=2 idx3? d3 k=2 idx? left from k=1 (idx2?) prev d2 idx? d2 values [-1,1,2]. k=2 idx? d3 idx? k=-3,-1,1,3. k=1 not in d3. Boundary k=3 maybe. final k=2 occurs d4? Edit distance 4? n=3,m=1 LCS0 D=4. d3 k=-1? maybe. Backtrack later uses valid states.

Valid seems okay.

Could there be a case with matches where furthest snake consumes b lines and less-far insertion needed? Try n=3,m=3 with a=['a','b','c'], b=['a','c','b']? LCS 2 D=2. Valid likely.

Given time, choose standard or valid? The valid variant's final x==n,y==m and backtrack exact no hacks. It might be correct. Let's ensure code for valid variant handles all states and no under-reach. We can also add fallback DP if n*m <= 1e6 to guarantee for small tests. That would catch any valid variant issues in hidden if small. For large, valid likely okay. But fallback DP adds code and memory. Could use DP for n*m <= 200000 maybe. For 1000 completely different, product=1e6; maybe use Myers. But if valid bug, DP threshold could cover? 1e6 product maybe 2s; memory 1e6 array('H')? We can implement DP for n,m <= 1000 (or product <= 1_000_000) using Hirschberg? To reconstruct shortest edit script, we can compute LCS backtrack with DP matrix of lengths. Memory for 1000x1000 of unsigned short 2MB using array('H') rows? But building list of arrays okay. Time 1e6 loops in Python maybe 0.1-0.2s? Actually nested Python loops 1e6 ~0.05? maybe okay. For 2000x2000 4M ~0.5-1s, okay. For 1000 all different, DP can guarantee. But for 20k with 50 differences product huge; Myers. We can set DP threshold product <= 1_000_000 or 4_000_000. But Myers already should handle 1000; DP extra not harmful. However hidden may test 1500x1500 product 2.25M, DP time maybe okay under 6s? Could choose threshold 250_000 to not slow. But if valid variant bug on 1000, DP fallback would cover if threshold >=1e6. Let's consider implementing DP fallback for n*m <= 1_000_000. Need memory and speed. Could use array('H') if LCS length <=65535 (n,m <=65535, for 1000 okay). Or 'I'. For DP rows, we need store lengths for backtracking. For each row, we can store array('H', [0])*(m+1) maybe. Fill row by row. Then backtrack. Time 1e6 with array assignments maybe okay but array access slower. Using lists of ints for DP matrix maybe 1e6 ints memory 28MB plus refs 8MB? Could be okay. But code longer. Alternatively use bitset LCS and backtrack? Too much.

Do we need fallback? Maybe not.

Could implement valid variant and also common suffix trim. If hidden compares against expected shortest count? They may test correctness with random small using our output count? They won't know? They will test script properties and LCS length? Maybe.

Let's look up Myers algorithm with boundaries: The classic algorithm does not explicitly check y bounds because V values are allowed to go outside but still O(ND). It is proven. Our valid variant may not be the standard proof. To align with hint, implement standard classic but with robust backtrack. That might be safest because proven. Need ensure standard backtrack robust doesn't produce invalid. Let's refine robust backtrack based on standard history, not valid variant.

Forward standard with history arrays and break when x >= n and y >= m. Then D. Backtrack using standard condition, but when reconstructing snake, we can use history to get x_start for the chosen prev diagonal. To avoid overshoot invalid, we can compute x_start_history = prev value or prev+1. Then compute snake while x_start_history < x and a[x_start_history] == b[x_start_history - k]? Instead of assuming matches from history, we can verify matches. Since history furthest after snake, the segment should match if x_start_history is the actual start of snake. But if history overshoot, x_start_history may be >x or invalid. We can clip start_x to x, then snake length zero. But what if start_x_history <=x but the actual path from history to current doesn't match all the way because history came from different source? It should if history current value was from that source? We didn't store source; standard condition chooses source consistent with forward max. If candidate source had x_start_history, then forward did snake from x_start_history to current x. So matches valid. If source tie, either source could have same x_start? For insertion/deletion tie candidate x equal; x_start same (endpoint after edit), matches valid. Good. If history current x was achieved by source different from standard condition due to tie? We match condition. Good.

If history prev value for chosen source is overshoot >n but candidate x_start > current x? If current x=n, start_x>x. Then forward current x would be >=start_x if snake, but history current value maybe >n; however we start at n not history. The standard backtrack may choose prev diagonal because left<right due to overshoot, but there may not be a snake to n. Clipping start_x=n yields zero snake, op at boundary. Is the previous point (n,y-1) on prev diagonal reachable? If prev value >n, then the diagonal has points beyond n; does it necessarily contain point n? For valid prev_k, y_prev = n - prev_k. If within grid, maybe reachable? Not guaranteed but likely due to interval. If not, our op may still produce a valid script? It inserts/deletes line at current boundary. It might not be minimal? But length d.

Could instead in forward break only when best >= n and y >= m and best == n? But if best >n, not break; continue until best ==n. Could still explore many overshoot states but D minimal? If overshoot would have found at d, true valid final maybe same d or later. If true valid final same d but occurs after overshoot in k loop, continuing will find it. If valid final later, D later. This avoids invalid final. But if there is no exact x=n,y=m state in V because V for final diagonal overshoots even though valid path exists? In standard V stores furthest x on final diagonal; if valid path reaches x=n,y=m, furthest x might be >n due to other paths, so best != n but >=n. If we don't break, we may never store best==n for that diagonal and miss. But we could check if best >=n and y>=m; that's standard. If overshoot final diagonal, D found. To avoid invalid, could after break if x>n or y>m, continue scanning same d for a state with exact n,m? But if none, still need handle. Robust backtrack.

Maybe use classic but store additional sentinel to ensure final exact? If we clamp x to n in forward and also ensure y not >m? That yields final exact if path valid. But boundary less-far issues. Let's see standard implementations with clamping:
while x < n and y < m: match
if x > n: x=n; if y>m: y=m? But y derived from x. Many use if x >= n: x=n. For final check if x == n and y == m. If y=m but x=n. If state with x=n,y>m invalid; but y>m can't if x=n and k? If k<n-m then y>m. Could occur after insertion from bottom? x=n,y=m+1. If clamp x=n but don't adjust y, still y>m. Could set y=x-k? Can't. Could set x=min(x, m+k) to ensure y<=m. This gives valid point on diagonal at bottom or right boundary. It might under-reach but maybe furthest valid. This is similar valid but without move validity? For insertion candidate from bottom prev y=m: x_prev maybe n? clamp x to m+k = x_prev-1, reducing x by 1. This effectively uses less-far point? Maybe recurrence with clamping after candidate can simulate less-far. For invalid insertion from bottom, candidate x=x_f=m+k+1, clamp to m+k = x_f-1. That corresponds to previous y=m-1 point after insertion! Interesting. For deletion from right boundary x=n, y? candidate x=n+1, clamp to n gives x=n, y=n-k = y_prev-1, effectively uses less-far deletion? Candidate deletion from x_f=n,y_f=n-k+1; after deletion invalid x=n+1,y_f. Clamp to x=n (max valid on current diagonal with y<=? if k maybe? y=n-k=y_f-1) corresponds to deleting from less-far x=n-1,y=y_f-1. So clamping candidate to min(n, m+k) may exactly account for boundary less-far! Also need ensure y>=0 via x>=max(0,k). If candidate < k (for positive k), set x=k? But insertion/deletion from prev likely not below 0 except negative k with x? For current k negative, y=x-k positive; min x 0. Candidate may be 0. Good.
For current diagonal k, valid x range [max(0,k), min(n, m+k)]. If candidate outside, clamping to nearest boundary maybe uses less-far path. This could make recurrence with furthest prev valid and correct! Let's analyze.

Forward recurrence:
 raw_x = standard max candidate (could overshoot)
 x = raw_x
 # Clamp to valid x range for this diagonal:
 min_x = 0 if k < 0 else k
 max_x = n if n < m + k else m + k
 if x < min_x: x = min_x? But if candidate below min, no valid path? Candidate from valid prev may be below min only for insertion from top? Example d large positive k, x=0 but k positive => y negative; invalid. But such state shouldn't be needed. Clamping to min_x might create false state. Standard V may store x=0 on positive k (y negative) due insertions? Could those later become valid via deletions? In edit graph, diagonal k positive requires x>=k. Starting at top, you need k deletions to get to k. Insertion cannot create positive k. Standard V with V[1]=0 may store positive k via deletions only, so x>=k likely. For k negative, min_x=0. If x<0 no. So min clamp okay maybe.
 max_x = min(n, m+k). For k negative, m+k may be < n if near bottom; clamp to bottom. For k positive, n smaller.
 Then snake from clamped x? If raw_x > max_x, clamping to bottom may reduce x; then snake while x<n and y<m and match. If at bottom y=m, no snake. This may allow state at bottom. Does recurrence with clamp produce furthest valid x? It effectively for insertion from bottom uses x=max_x = previous x -1? That might under-reach? But true valid insertion from less-far bottom point could have x up to m+k (current bottom), which is max_x. So clamping gives max possible valid insertion from that diagonal. Good.
 For deletion from right boundary, max_x=n, clamping gives x=n (current right boundary), using less-far deletion candidate. Good.
 This bounded recurrence might be correct and simpler: use standard candidate, then x = min(x, max_x); if x < min_x: x = min_x? But if x<min_x, maybe no valid path; but setting min_x could create false. Are there cases raw_x < min_x? For positive k, raw_x from deletion prev x+1; if prev x on k-1 at least k-1, raw>=k. For insertion from k+1, raw x could be less than k? Prev diagonal k+1 valid min_x=k+1, raw>=k+1, so >=k. For initial d0 k0 x>=0. For negative k, min_x=0, raw>=0. So raw_x < min_x shouldn't happen if previous states within min range. Good.
 Thus we can use clamped recurrence. Then x,y always valid (within grid), final check x==n,y==m exact. Backtrack exact no clipping. This may be the correct bounded furthest DP! Let's test with boundary insertion from bottom: n=1,m=3 all diff.
d0 raw0 k0 max_x=min(1,3)=1, x0=0.
d1: k=-1 raw from prev0=0. max_x=min(1,3-1=2)=1, min_x=0 => x0=0,y=1.
k=1 raw prev0+1=1, max_x=min(1,4? m+k=4) =1, x=1,y=0.
d2: k=-2 raw prev0=0, max_x=min(1,1)=1, x=0,y=2.
k=0 raw: left=0,right=1 -> insertion raw=1, max_x=min(1,3)=1 x=1,y=1.
k=2 raw left=1+1=2, max_x=min(1,5)=1 => clamp x=1,y=-1? k=2, x=1 < min_x=2! We should set min_x=k=2. So x=2? But n=1, max_x=1, min_x=2 => no valid state because range empty for diagonal k=2 (requires x>=2 but max x=1). In such case state invalid; set x=-1. Good. So need if min_x > max_x: invalid -1. For k=2,n=1,m=3, min_x=2,max_x=1 no valid. Set -1.
d3: final k=-1 raw from? Need not invalid. This clamped recurrence with invalid when range empty seems robust.

This bounded furthest recurrence might be exactly correct: For each diagonal, reachable valid x interval lower/upper, furthest is max candidate then clamped to upper if candidate overshoots; if no valid range invalid. Need prove candidate clamp to max_x is okay. It uses less-far boundary point if furthest predecessor invalid. Because if raw_x > max_x, the maximum valid point on current diagonal that can be reached from that diagonal via that edit might be max_x, and if raw_x came from the furthest predecessor, due interval property max_x is reachable by choosing a predecessor at appropriate x. This is plausible. This is similar to computing furthest reaching with grid boundaries by clamping. It stores exact valid furthest x. Let's use this! It avoids separate validity checks for moves; just standard recurrence plus diagonal validity clamping.

Algorithm forward with clamping:
for each d,k:
  raw = (standard choose)
  min_x = k if k > 0 else 0
  max_x = n if n < m + k else m + k  # but m+k may be negative; if max_x < 0 invalid
  if max_x < min_x:
     x = -1
  else:
     if raw > max_x: raw = max_x
     if raw < min_x: raw = min_x? As argued not happen unless prev invalid -1; but if prev -1, raw could? Need handle prev values -1. If left/right -1, raw might -1 or 0? We can initialize with standard using -1? But standard without -1. Need incorporate invalid states. In clamped recurrence, some diagonals invalid; V value -1. Need candidate computation consider -1. Use similar as valid variant but with clamp? Let's design:
  best_raw = -1
  if idx>0:
    left=prev[idx-1]
    if left >=0:
       # deletion candidate raw = left+1
       if raw > best_raw: best_raw = raw (tie? For standard tie, if right >= left+1 choose insertion; but with clamping raw values may change. Need choose max raw? Standard chooses max raw because snake monotonic. If tie after clamp? We can compute both candidates, then x candidate after edit, clamp, then choose max x. But tie-breaking should still produce furthest; any max x okay. Backtrack condition must match. Simpler: compute candidates x_after_edit (already edit point), clamp, choose max x_after_edit (not raw). Then snake. Tie can choose insertion/deletion; need record consistent with backtrack. Could choose same as standard? To simplify backtracking, store history but no source. We need decision rule consistent. We can define decision by candidate clamped x values: if x_insert >= x_delete choose insertion else deletion. This may not match simple left<right. Backtrack can recompute same using prev and clamp. Good.
  if idx<d:
    right=prev[idx]
    if right>=0: raw = right; candidate x_after_edit=clamp(raw); if candidate_x >= best? choose insertion.
  if both invalid: x=-1.
  if x>=0: y=x-k; snake; curr[idx]=x; if x==n and y==m found.
But if we clamp insertion candidate from bottom to max_x, and clamp deletion candidate from right to max_x, both may become equal max_x; tie choice insertion maybe. Backtrack recompute same. This is a bounded furthest DP with candidate max after edit. Should be correct and exact.

Let's formulate candidate_clamped(k, x_raw):
  min_x = k if k > 0 else 0
  max_x = m + k
  if max_x > n: max_x = n
  if min_x > max_x: return -1
  if x_raw < min_x: return -1? Or min_x? If raw below min, cannot validly reach via that edit; but maybe less-far? raw from predecessor valid. For insertion from k+1, x_raw=right, and prev valid on k+1 ensures right >= max(0,k+1) >= max(0,k) so not below min. For deletion from k-1, raw=left+1, prev valid ensures left >= max(0,k-1); if k>0, left >=k-1 => raw>=k; if k<=0, raw>=? left>=0=>raw>=1, min0. Not below. If prev invalid -1 skip. So raw<min won't happen.
  if x_raw > max_x: return max_x
  return x_raw

Now, does clamping to max_x always correspond to a valid edit point reachable with one edit from some valid predecessor on that adjacent diagonal? Need property reachable x on prev diagonal is interval [min_x_prev, F_prev]. For insertion, raw = F_prev. If F_prev > max_x = m+k, then we need predecessor x = max_x (since insertion doesn't change x) to get current max_x. Is x=max_x within [min_x_prev, F_prev]? Prev diagonal k+1 min_x_prev = max(0,k+1). max_x_current = min(n,m+k). This may be < min_x_prev? If current max_x = m+k. If m+k < k+1 -> m <1, bottom empty? For m>=1, m+k >= k+1? if m>=1 yes. If n bound, min? So max_x_current >= min_x_prev? For k positive, min_x_prev=k+1, current max_x maybe n. If n could be k? then current invalid min>max? But if current valid, n>=k. For insertion from k+1, current min_x maybe k. If current max_x = k (y=0), prev min k+1 > max_x, no valid insertion with x=k (would require prev x=k on k+1 y=-1). But raw>max_x? F_prev>=k+1>max_x. Clamping to max_x would produce invalid insertion from nonexistent point. Example top boundary: current k positive, y=0, insertion would come from k+1 with y=-1 invalid. The max valid point on current diagonal k,y=0 is x=k. But insertion cannot reach it (only deletion from k-1). If we clamp insertion candidate to k and tie chooses insertion, backtrack insertion line index start_y-1 = -1 invalid. Need handle top boundary: insertion from k+1 valid only if y_prev < m? Top boundary for insertion? Insertion increases y from 0? Actually for current k, after insertion y = x-k. If y=0, insertion prev y=-1 invalid. More generally insertion from k+1 candidate x after edit must satisfy y_after = x-k >=1 (since prev y=y_after-1 >=0). Thus valid insertion candidate x must be >= k+1. Similarly deletion valid candidate x after edit must satisfy y = x-k <= m? and x>=1? Deletion from k-1 increases x; prev x=x-1>=0 => x>=1. Also for top? Deletion valid if y_after <=m? From prev valid y same. For insertion valid if y_after >=1 and <=m? y_after <=m from current valid. So candidate clamp range should depend on edit type:
- Insertion from k+1: current point after edit has y = x - k. Previous point y_prev = y-1 >=0 => x >= k+1. Also y<=m => x <= m+k. And x<=n. Also x>=0. So valid x range for insertion endpoint: max(max(0,k+1),? maybe) to min(n,m+k). If this range empty invalid. Clamping raw to max_x could produce below min_ins.
- Deletion from k-1: current x >=1 (prev x>=0), and y=x-k same as prev, so y>=0 => x>=k, y<=m => x<=m+k, x<=n. Valid range: max(1,k) to min(n,m+k). For k<=0 min=1. But deletion from x=0 impossible; if current x=0 and k<=0, deletion cannot be last edit. At boundary k=d? maybe not.

So for candidate source-specific validity, we can compute x_clamped within source-specific valid range. This is like valid variant but clamping to boundaries. It may correctly allow less-far if furthest overshoots upper bound, but if clamping falls below source min, candidate invalid.

For insertion from right:
 raw=right
 lo = k + 1 if k >= 0? In general lo = max(0, k+1). Actually y_after >=1 => x >= k+1. Also x>=0. So lo=max(0,k+1). hi=min(n,m+k). If lo>hi invalid. x_cand = min(max(raw, lo), hi)? But if raw < lo, can we use lo (less-far predecessor)? Predecessor x=lo on prev diagonal k+1: y_prev=lo-(k+1). If lo=max(0,k+1). If k+1>0 lo=k+1 => y_prev=0 valid. If raw from furthest <lo? Then furthest predecessor invalid for insertion? But if furthest x<lo, it cannot insert (prev y<0? Actually if x<k+1, prev y negative invalid; such predecessor should be invalid). So skip. If raw >hi, use hi if hi>=lo (less-far insertion). Good.
For deletion from left:
 raw=left+1
 lo=max(1,k) (since x>=1 and y>=0 => x>=k) hi=min(n,m+k). If lo>hi invalid. If raw<lo? If raw from furthest? Deletion from prev x<lo? Could be if current top y=0 and x=k=0 for k=0: lo=1. Deletion to k=0 from k-1=-1? current k=0, deletion x after >=1, cannot have x=0. If raw<lo skip. If raw>hi, use hi (less-far deletion) if hi>=lo. Good.

Then choose candidate with larger x_cand (furthest). Tie choose insertion (or deletion) consistently. Then snake (which can only start from valid edit point). This is a DP with intervals and boundary clamping. It should be correct and exact, while not needing store source? Backtrack recompute same candidate choices using prev and same source-specific clamp. Great.

This is more complex but likely correct.

Let's test with all different n=1,m=2.
d0 V0=0.
d1:
 k=-1 idx0: insertion from right=0. lo=max(0,0)=0, hi=min(1,2-1=1)=1. raw=0 ->0. x=0,y=1.
 k=1 idx1: deletion from left=0. lo=max(1,1)=1, hi=min(1,3)=1. raw=1 ->1. x=1,y=0.
d2:
 k=-2: insertion right=0. lo=max(0,-1)=0, hi=min(1,0)=0? m+k=0, hi=0. raw0 ->0. x=0,y=2 (bottom).
 k=0: deletion left=0 raw1. lo=max(1,0)=1, hi=min(1,2)=1 =>1. insertion right=1 raw1. lo=max(0,1)=1, hi=1 =>1. tie insertion -> x1,y1.
 k=2: deletion left=1 raw2. lo=max(1,2)=2, hi=min(1,4)=1 => lo>hi invalid. insertion none. curr -1.
d3:
 k=-1: deletion left from k=-2 curr d2[0]=0 raw1. lo=max(1,-1)=1, hi=min(1,1)=1 =>1. insertion right from k=0 d2[1]=1 raw1. lo=max(0,0)=0, hi=min(1,1)=1 =>1. tie insertion x1,y2 final? x=1,y=2 yes. D=3. Good.

Case n=2,m=1 all different:
d0 0.
d1 k=-1 ins x0,y1 (bottom? m=1,y=1). k=1 del x1,y0.
d2: k=-2 ins from k=-1 right=0. lo0, hi=m+k=-1 -> invalid (can't insert from bottom). k=0: deletion from -1 raw1 lo1 hi min2,1=1 ->1; insertion from1 raw1 lo1? k+1=1, hi min2,1=1 ->1 tie insert x1,y1. k=2: deletion from1 raw2 lo max1,2=2 hi min2,3=2 ->2 x2,y0.
d3 final k=1? n-m=1. d3 k=1: deletion from k=0 left=1 raw2 lo max1,1=1 hi min2,2? m+k=2 ->2 =>2. insertion from k=2 right=2 raw2 lo max(0,2)=2 hi min2,2=2 =>2 tie insertion x2,y1 final. D=3. Backtrack insertion from k=2: x_after=prev[2]=2 (valid deletion state x=2,y=0). y_prev=2-(2)=0? insertion current k=1? y_prev = x_after-(k+1)=2-2=0. inserted line b[0]. previous x=2,y=0. d2 k=2 deletion from k=1 prev d1 x=1,y0? etc. Script -a0? Let's see output likely valid.

This DP seems robust.

Need implement candidate selection and backtracking consistently.

Forward details with source-specific clamping:
prev = history[-1] (list/array values valid or -1)
for idx,k:
  best_x = -1; best_is_ins = False maybe.
  # deletion if idx>0:
    left = prev[idx-1]
    if left >= 0:
       raw = left + 1
       lo = k if k > 1? max(1,k)
       hi = n if n < m + k else m + k
       if hi >= lo and raw >= lo: # if raw > hi, cand = hi; if raw < lo skip. Actually if raw < lo invalid. If raw > hi cand=hi (valid if hi>=lo). If raw within cand=raw.
          cand = hi if raw > hi else raw
          if cand > best_x:
             best_x = cand; best_ins = False
          elif cand == best_x and cand >=0 and ??? tie? Need tie-breaking. To match standard maybe insertion if cand >= delete? We can choose insertion on tie. Process insertion after with >= will override if equal. But if we process deletion first, insertion can set best_ins True on tie.
  # insertion if idx<d:
    right = prev[idx]
    if right >=0:
       raw = right
       lo_ins = k + 1 if k + 1 > 0 else 0
       hi = n if n < m + k else m + k
       if hi >= lo_ins and raw >= lo_ins:
          cand = hi if raw > hi else raw
          if cand >= best_x:  # tie choose insertion
             best_x = cand; best_ins = True
  if best_x >=0:
     y = best_x - k
     # It should be within grid and source validity.
     while best_x < n and y < m and a[best_x] == b[y]: best_x++; y++
     curr[idx]=best_x
     if best_x == n and y == m: found
  else curr[idx] = -1

But after snake, does x remain within source edit type? Snake only increases x and y, so if source was valid, still valid. Good.

Candidate clamping to hi for insertion from bottom: Suppose raw > hi (bottom). cand=hi. Need ensure there exists predecessor x=hi on prev diagonal. hi=m+k. Prev diagonal k+1: y_prev = hi-(k+1)=m-1 valid if m>0 and hi>=lo_ins. lo_ins ensures y_prev>=0. If raw from furthest right >=hi, reachable interval includes hi. Good. If raw > hi because prev x beyond bottom? prev valid x on k+1 cannot exceed m+k+1 (bottom on prev). If raw=m+k+1, cand=m+k. predecessor x=m+k, valid. Good.
Deletion from right: raw>n? hi=n. predecessor x=n-1 on prev diagonal k-1: y=n-1-(k-1)=n-k = current y? Need within. Valid if hi>=lo. Good.

This bounded DP may be fully correct. It may store more states than valid variant? Similar but handles boundary by clamping instead of skipping. It also handles top by source lo. Good.

Backtracking with same candidate selection. We can write a function to get prev_k and start_x? We can recompute for current d,k:
  best_cand=-1; is_ins=False
  if idx>0:
    left=prev[idx-1]; if left>=0: cand=del_cand(left,k); if cand>best: best=cand; ins=False
  if idx<d:
    right=prev[idx]; if right>=0: cand=ins_cand(right,k); if cand>=best: best=cand; ins=True
  choose ins.
Then need start_x after edit (cand before snake?) In backtrack, current x may be > cand due to snake. We need x_after (start of snake) which is best_cand before snake, not curr value. Since we didn't store source-specific cand; recompute cand from prev. Use best_cand (x_after). Then record snake from x_after to current x-1. Then set x,y to previous point: if insertion, previous point (x_after, y_after-1) where y_after=x_after-k; if deletion, previous point (x_after-1, y_after). Need ensure x_after valid. In forward, after choosing candidate x_after, snake starts there. So backtrack can use recomputed x_after. Good.

But what if after snake current x > n? We break exact final, so current states valid. During backtrack, current x,y valid.

Need also handle initial d=0. history[0] value x0 after d0 snake; if x0==n and y0==m return all '='. But in our bounded DP, d0 can also have x0 maybe n? If n<m and all a matched prefix, x0=n,y0=n, not final y<m. history[0]=[x0]. This state valid on k=0 x<=min(n,m). Good.

Now, test this candidate-clamp DP on common examples.
Example a=['a','b','c'],b=['a','c','b'] trimmed maybe no? Let's run untrimmed.
d0 x=1,y1.
d1:
 k=-1 idx0 insertion from right=1. lo_ins=max(0,0)=0, hi=min(3,2)=2? m+k=2. cand1. x1,y2 snake? a1=b,b2=b -> x2,y3 final? n=3,m=3 x=2 not n. y=3=m. curr0=2.
 k=1 idx1 deletion left=1 raw2. lo=max(1,1)=1, hi=min(3,4)=3 cand2. insertion right=1? prev len1 idx? for k=1 idx1<d? d=1 idx1==d no. curr1=2,y1 snake? a2=c,b1=c -> x3,y2. final? y2<3. curr1=3.
d2 final k=0. prev [2,3]. k=0:
 deletion left=2 raw3. lo1 hi3 cand3.
 insertion right=3 raw3. lo_ins=max(0,1)=1 hi=min(3,3)=3 cand3. tie insertion x3,y3 final D=2. Backtrack d2 insertion: recompute ins cand=3 (from right=3). x_after=3,y_after=3. snake empty. + b[2]='b'. set prev point (3,2). d1 current x=3,y=2,k=1. prev hist0 [1]. boundary k==d deletion: del cand left=1 raw2? But current x=3, after d0? Wait d1 history curr[1] was 3 after snake from x_after=2? Recompute deletion cand=left+1=2 (x_after). lo1 hi3 cand2. best=2. record snake from x_after=2 to current x=3-1? For deletion, matches indices x_after=2..x-1=2: '=c'. op '-', a[1]='b'. set prev point x_after-1=1,y=2? y_after=x_after-k=2-1=1; prev y = y_after =1. set x=1,y=1. initial snake x=1 '=a'. reverse =a,-b,=c,+b? Wait original b=['a','c','b']; output =a,-b,=c,+b. Taking = and - a: a,b,c yes; = and +: a,c,b yes. Minimal? LCS length 2 (a,c or a,b?) D=2 yes. Another minimal -b,+c. Our output -b +b? Actually ops =a,-b,=c,+b: deletes b at position 2, inserts b at end; a has b,c; b has c,b. LCS length 2 'a','c'? yes. Could instead delete b and insert c. Our script okay (keeps b from a? ops =a, -b, =c, +b keeps a? Wait '=' items: a,c; '-' b; plus b; taking = and - in order: a,b,c yes; = and +: a,c,b yes. It deletes original b and inserts original b at end; edit distance 2. Valid. Minimal. Ties can produce weird but okay.

Example a=['x'], b=['y','z'] all diff n=1,m=2.
d0 0.
d1 k=-1 ins cand0 x0,y1; k=1 del cand1 x1,y0.
d2 k=-2 ins from 0: lo0 hi=m-2=0 cand0 x0,y2; k=0 del left0 raw1 cand1; ins right1 raw1 lo1 hi1 cand1 tie ins x1,y1; k=2 del invalid (lo2 hi1) -1.
d3 k=-1: del from -2 left0 raw1 cand1; ins from 0 right1 raw1 cand1 tie ins x1,y2 final. D=3. Backtrack insertion from x_after=1,y_after=2, +b[1]=z, set x=1,y=1. d2 k=0 insertion x_after=1,y_after=1, +b[0]=y, set x=1,y=0. d1 k=1 deletion x_after=1,y_after=0, snake none, -a[0]=x, set 0,0. reverse -x,+y,+z. Good.

Now, does this candidate-clamp DP always produce final x==n,y==m? It stores valid states exact, final check exact. Good.

Time: More conditions than standard but similar. For D=2000, 2M iterations, candidate clamping with max/min. Could optimize.

Can we simplify candidate validity using precomputed min_x, max_x per k? For each d,k, hi = min(n, m+k). lo_common = max(0,k). But source-specific lo: del_lo=max(1,k), ins_lo=max(0,k+1). We can compute inline.

Pseudo forward:
for idx in range(d+1):
  k = -d + 2*idx
  hi = m + k
  if hi > n: hi = n
  best = -1
  # deletion
  if idx > 0:
    left = prev[idx-1]
    if left >= 0:
      lo = k if k > 1? Use if k > 0: lo = k else lo = 1? max(1,k).
      # If k > 0: lo = k else lo = 1
      if lo <= hi:
         raw = left + 1
         if raw >= lo:
            cand = hi if raw > hi else raw
            if cand > best:
                best = cand; ins=False
  # insertion
  if idx < d:
    right = prev[idx]
    if right >= 0:
      lo = k + 1
      if lo < 0: lo = 0
      if lo <= hi:
         raw = right
         if raw >= lo:
            cand = hi if raw > hi else raw
            if cand >= best:
                best = cand; ins=True
  if best >= 0:
     y = best - k
     while best < n and y < m and a[best] == b[y]:
         best +=1; y +=1
     curr[idx]=best
     if best == n and y == m: found
  else: curr[idx]=-1

Need consider hi maybe negative; if hi<lo invalid. For negative k, hi=m+k could be negative if k<-m; diagonal invalid (would require y>m? Actually x>=0, max_x=m+k <0 no valid). So states invalid. Good.

What about hi for k positive > n? hi=n.

Does candidate clamping to hi possibly choose a state that was not reachable because predecessor raw > hi but predecessor interval doesn't include hi? We argued interval. But is reachable x set on a diagonal at distance d-1 always contiguous from min to max? With matches and fixed edit count, maybe not. Example all different n=2,m=2 at d1 on k=1: reachable x only 1? contiguous. d2 k=0 reachable x=1? only 1. With matches, maybe multiple. Could there be gaps? Edit graph paths can waste edits? Fixed d imposes parity but maybe gaps. However furthest raw > hi and hi may not be reachable if only specific positions due to matches. But if there is a match, you can perhaps adjust? Not guaranteed. But for shortest path to boundary, using a less-far point that may not be reachable could falsely create state. Does this happen? Let's attempt find gap: diagonal k=0 at d=2 all diff reachable x=1 only; min maybe0 max1 contiguous. d=3 k=1 reachable x=2? maybe only2? contiguous. Edit distance paths with exactly d edits on diagonal: You can always add useless insert+delete pairs? Fixed d and diagonal parity, might create gaps due to boundaries. But furthest-reaching algorithms rely on monotonicity not contiguity? Hmm.

Candidate raw>hi means there is a path of length d-1 to predecessor x=raw on prev diagonal. If raw>hi, we want path to x=hi on same diagonal. Is hi reachable? You could take the path to raw and "back up" along diagonal to hi? Not a path of same d-1. But maybe you can replace last matches with edits? Not always.

This is subtle. The valid variant skipping raw>hi avoided false. The clamping could introduce false states. Is it needed? Maybe less-far insertion could be reachable via a different path of same d-1? Need examples where F_prev > hi but hi not reachable. Could happen if the extra x from raw to hi were achieved by matches, not edits; to be at hi with same d-1 you would need use extra edit instead of match, maybe still reachable by making an edit at that point? If there is a match at raw-1 vs hi? Could change. Not sure.

Standard furthest algorithm doesn't clamp because raw is furthest x after edit+snake, not pre-snake. It can overshoot due to invalid moves. Clamping before snake may be dubious.

Maybe stick to standard classic proven (with no clamp) and robust backtrack. Or valid variant exact no clamp (skip invalid), which doesn't introduce false. Which is more likely correct? Valid variant skipping invalid moves uses furthest predecessor; if furthest invalid due to bottom/top, it skips insertion/deletion, but may miss less-far valid. But maybe less-far not needed or covered by other diagonal. The clamping attempts to handle less-far but may false. Hmm.

Let's look up standard Myers with boundaries: It actually doesn't restrict moves; it allows paths outside grid but returns when V[k]>=N and V[k]-k>=M. Then backtracking uses V and works. That is proven. We should implement exactly that (classic) and use robust backtrack from n,m. It may be the best.

But can we implement classic with history and robust backtracking that doesn't fail if prev_x > x? Need prove robust yields valid script. Alternatively use linear-space Myers that is proven and can handle backtracking? Maybe too much.

Maybe use a known Python implementation of Myers diff with history (from internet) and adapt. The typical code:
def shortest_edit(a,b):
  n=len(a); m=len(b); maxd=n+m; offset=maxd; v=[0]*(2*maxd+1); trace=[]
  for d in range(maxd+1):
    for k in range(-d,d+1,2):
      if k == -d or (k != d and v[k-1+offset] < v[k+1+offset]):
        x = v[k+1+offset]
      else:
        x = v[k-1+offset] + 1
      y = x - k
      while x < n and y < m and a[x] == b[y]: x+=1; y+=1
      v[k+offset]=x
      if x >= n and y >= m:
         trace.append(v.copy()); return trace
    trace.append(v.copy())
Then backtrack:
x=n; y=m
for d in reversed(trace):? It uses v=d-1. Same as before.
This standard works for many. We can use full array offset to avoid parity mapping? For D small and maxD large (20k), full array length 40k per snapshot -> 40k*50=2M refs; okay? For 1000 D=2000 full length 4001*2001=8M refs; double parity. But simpler. However history with full array copies 8M for 1000 all different, memory maybe 64MB refs + ints maybe 100MB. Parity better. But full array with V[1]=0 sentinel standard exact. Backtracking with offset simpler. Could use full array but store only active range? Maybe not needed. Parity with standard candidate is easy.

Let's revisit robust backtrack with standard candidate no clamp. We can perhaps avoid overshoot issue by not breaking on >= but after finding final, adjust D? Let's find actual standard backtrack code from examples; it starts x=n,y=m and uses history. I think it is accepted even if V overshoots, because if V values overshoot, they are on diagonals not chosen for optimal path from n,m? But not guaranteed? Let's test with a known case where final diagonal V overshoots. Use n=1,m=1 all different: history d2 final k=0 V=1 not overshoot. n=1,m=3 all diff final k=-2 D=4? V final -2? Let's compute standard maybe final state x=1? no overshoot. Could V final overshoot? For final k = n-m, any state on final diagonal has y=x-k. If x>n then y=m+(x-n)>m. So overshoot means y>m too. Such state corresponds to going beyond both boundaries. Could be reached by extra deletions/insertions? But minimal d likely not use it if valid exact exists same d? Maybe if d found by overshoot before exact, but exact on same diagonal also exists? V stores furthest x; if exact x=n exists, furthest >n overshoot may exist with same d. Then standard break uses furthest. Backtrack from n,m chooses source based on prev values, maybe still valid. It doesn't use current V value except start n,m. So maybe okay.

Let's try to construct case where V[d][final_k] >n due to path that goes beyond end, but no valid path length d? If no valid path, edit distance >d, but overshoot path length d could imply a valid path length <=d by truncating? If path goes beyond both boundaries, can remove extra moves to get valid path length <=d. Thus minimal <=d. If d first, valid path length d exists. So backtrack can find some valid path length d. Good.

Therefore standard backtrack likely works. Need make backtrack robust enough for prev_x > current x. Maybe standard prev_x won't exceed current x for the actual path chosen by conditions. But to be safe, implement robust clipping with verification of snake matches? Let's derive standard backtrack with history but using source and start_x from prev. If prev_x > x, we can set start_x=x. But then need ensure previous point (start_x, start_y-1) is reachable. It likely is if exact path exists. The condition chosen might not correspond to that, but if condition chosen due to overshoot, maybe the valid exact path used other source. Robust clipping could still output a valid script but maybe not length d? It will output d ops. Need test if it could output invalid line due to y_start out of bounds. We can add fallback: if invalid, recompute by trying both sources? Maybe choose source that yields valid start within current boundaries and matches history condition? Let's design backtracking more robust:
At each step, compute left and right standard candidate x values (after edit before snake? Actually candidate raw from prev). We can choose source based on standard condition but if that source yields invalid start (prev_x > x for insertion? or prev_y > y? maybe), try the other source if it yields valid and also could have produced current x after snake? However history current state value not used; but if current x after snake, both candidates might lead to valid snake? We can check snake matches: For a candidate start_x (insertion prev_x or deletion prev_x+1), if start_x <= x and the substring a[start_x:x] equals b[start_x-k:y] (which equals y?), and start_y within bounds, and start_x is not > x, then source plausible. Standard condition chooses one; if invalid choose other plausible. This ensures output valid. But checking substring each step could be O(length^2) if use slicing. We can instead rely on history? But for robustness small D, okay? Could check loop while snake? Since we are recording snake anyway, we can find start_x as the smallest? We can use history candidate and verify line by line while recording. If mismatch, adjust start_x downward? Hmm.

Maybe implement a direct backtracking that doesn't rely on history values for snake start: Starting from current (x,y), determine prev diagonal using standard V condition. Then set start_x to history candidate if within current bounds and matches; otherwise start_x = x (zero snake). Because if history candidate >x, zero snake at boundary. This likely valid.

Let's implement robust standard history with source-specific start_x = raw candidate (insertion: prev[prev_idx]; deletion: prev[prev_idx]+1). Then clamp to x if >x; also ensure for insertion start_y = start_x - k >=1; if not set start_x = x (start_y=y) (requires y>=1). For deletion ensure start_x>=1; if not set start_x=x (requires x>=1). Then record snake from start_x to x-1. But if start_x < x and matches not valid due to history false, our output may have '=' lines that don't correspond to b? We use a lines; need ensure b has same lines. We don't check. Could verify by while from start_x? Since forward history from standard may over/under. But if standard correct, matches valid. For safety, we could not clamp unless necessary; standard correct.

Maybe simpler: use valid candidate-clamp DP with source validity but no clamping? It ensures start valid and final exact. Let's see if skipping invalid but furthest could miss less-far. But maybe with standard condition and boundaries, less-far not needed? Many correct implementations don't do source validity. Valid variant might be okay. It is more direct DP over grid with furthest; I need confidence. Let's reason with dominance: For any diagonal k, define F_d(k) = max x within [0,n],[0,m] reachable by an edit script of length d that ends on a snake? Recurrence for true F: F_d(k) = max over adjacent diagonal valid x of (x + delta) then snake. If the furthest valid on adjacent diagonal cannot move (e.g., bottom for insertion), a less-furthest can. But since F_{d-1}(k+1) is max x; if it is at bottom y=m, then F = m+k+1. Less-furthest valid insertion candidate x = some x' <= m+k. The insertion after edit yields x=x' on k. Could this x exceed candidates from other sources? Potentially. But can we get x=m+k (max possible) from some other source? Deletion from k-1 at bottom? If other source not. Example grid with n large,m small, final diagonal negative? Hmm.

Construct possible need less-far insertion from bottom: Want current k such that max valid x on current diagonal is at bottom y=m, x=m+k. Need reach it with d edits. Adjacent prev diagonal k+1 has furthest at bottom y=m, x=m+k+1 invalid for insertion, but less-furthest at y=m-1, x=m+k valid. Can we instead use furthest at bottom on k+1 and do deletion to k+2? Not current. But maybe from current k bottom, you can only delete to k+1. Starting at k+1 bottom, deleting gives x=m+k+2, k+2 bottom, which is ahead of current path and may dominate. So less-far insertion not needed for optimal end. Similarly top. So valid skip okay.

Let's maybe use valid variant (source validity no clamp) because it only uses reachable valid predecessors and furthest among them. If less-far needed, maybe other source dominates as argued. It is standard DP with furthest valid; should be correct. Let's implement valid variant final. It may be slower but safe boundaries. Need choose between valid and standard. Given user hint Myers O((N+M)D) and not necessarily boundary subtleties, standard accepted. Valid variant is a variant; if it misses less-far, could fail. But I think it won't.

Can we test valid variant on a boundary case with matches where less-far maybe needed? Example a=['a','b','c'], b=['a','b','b','c'] (insert b). n=3,m=4 D=1 insertion. Prefix trim p=2 (a,b), suffix c, middle a=['c'],b=['b','c']? Actually after prefix a,b and suffix c, mid_a=['c'], mid_b=['b','c'] (insert b before c). Myers handles insertion not from boundary.

Need boundary: common prefix consumes all b? a longer with extra a's, need insert? no.

I think valid variant fine.

Now, performance with valid variant: For D=2000 all different, it stores -1 for invalid diagonals beyond min/max, reducing states. Inner loops with left>=0, y_left etc. We can optimize using diagonal min/max instead of y_left checks. Let's implement valid variant with source-specific ranges and no clamping (skip if invalid). This is similar to valid but simpler:
Forward:
for each k:
  hi = min(n, m+k)
  best = -1; ins=False
  if idx>0:
    left=prev[idx-1]
    if left>=0:
       # deletion valid if left < n and y_left = left-(k-1) within [0,m] and raw=left+1 within [0,hi] etc. Since prev valid, y_left valid. But also current diagonal valid hi. Check raw <= hi and raw >= lo_common? lo_common=max(0,k). But if prev valid and left<n, raw should be within current diagonal validity? If raw>hi, deletion would go below? hi is min(n,m+k). If left<n and prev valid on k-1, y_left=left-(k-1)<=m. raw=left+1, y=raw-k=y_left. Since y_left<=m and x<=n, raw<=hi. If y_left>=0, raw>=max(0,k)? yes. So no need check. Deletion valid just left < n.
       cand=left+1
       best=cand; ins=False
  if idx<d:
    right=prev[idx]
    if right>=0:
       y_prev = right - (k+1)
       if 0 <= y_prev < m: # insertion valid; current y = y_prev+1 within [1,m]. Also x<=n. Candidate right should be <=hi.
          cand=right
          if cand >= best: best=cand; ins=True
  if best>=0: snake etc.
This is what valid variant had. It assumes prev states valid (within grid). They are, if we only set best>=0 after checking source validity and snake. Deletion from left valid if left<n; because left valid ensures current point within grid. Yes. Insertion check y_prev. That is simple. It skips invalid moves. We'll use this.

Need history values for invalid states = -1. Initial history[0]=[x0]. If x0 can be n or m but valid.

Backtrack with same source validity:
  choose ins using same candidate rule:
   ins=False; best=-1
   if idx>0:
     left=prev[idx-1]
     if left >=0 and left < n: best=left+1; ins=False
   if idx<d:
     right=prev[idx]
     if right >=0:
       y_prev = right - (k+1)
       if 0 <= y_prev < m:
          if right >= best: best=right; ins=True
   # choose ins
Then x_after = best? Wait for insertion, candidate x_after = right. For deletion, x_after = left+1. In backtrack, we can use x_after = best (candidate x after edit before snake). But if best came from insertion or deletion, x_after=best. For insertion previous y = best-(k+1) = y_prev. For deletion previous y = best-k = y_left. Need set previous point accordingly.
We also need record snake from x_after to current x-1. If best=-1? Shouldn't. But at boundaries, condition may choose invalid? For path, best valid.
If ins:
   x_after = best
   y_prev = x_after - (k+1)
   # snake indices x_after..x-1
   for xx in range(x-1, x_after-1, -1): ops.append(('=',a[xx]))
   ops.append(('+', b[y_prev]))
   x,y = x_after, y_prev
else:
   x_after = best
   x_prev = x_after - 1
   y_prev = x_prev - (k-1) # or x_after-k
   for xx in range(x-1, x_after-1, -1): # matches after deletion start x_after
       ops.append(('=',a[xx]))
   ops.append(('-', a[x_prev]))
   x,y = x_prev, y_prev
This differs from earlier valid formulas where for insertion we used x_after=prev[idx_right]; for deletion x_after=prev[idx_left]+1. Here best is candidate x. Good. Need ensure snake range for deletion with x_after correct. If deletion candidate best=left+1. Snake from best to x-1 inclusive. Use range(x-1,best-1,-1). For insertion candidate best=right; same. Great. Initial formulas unified.

But tie choice: forward processes deletion then insertion with if right >= best. Backtrack same. For deletion if left invalid best remains -1; insertion if valid right>=-1. For insertion invalid but deletion valid choose deletion. If both invalid, best=-1. For boundaries: if k=-d, idx=0: deletion none; insertion right=prev[0]; valid if y_prev. If invalid but path? no. If k=d, insertion none; deletion valid if left<n. Good.

Let's test valid variant with this unified best on earlier examples.
a=['A','B'],b=['B']: d0 [0]. d1 k=1 boundary deletion left=0<1 best=1. curr=1? snake to x=2. history d1 curr idx1=2. Backtrack d1 k=1, recompute deletion best=left+1=1. snake range x-1=1 to x_after-1=0 => xx=1 =B. op '-', a[0]. set x=0,y? x_prev=0, y_prev=0-(0)=0. good.
Insertion with tie all diff n=1,m=1: d2 k=0 best: deletion left=0 best=1; insertion right=1 y_prev=1-1=0<m cand1 >=best ins. x_after=1,y_prev=0; snake range x=1, range(0,0?) empty; op +b[0]; set x=1,y=0. good.

Need ensure if best candidate x_after maybe > current x? Since current x after snake >= best if source used. Backtrack path should have current x>=best. With valid variant no overshoot. Could still best > x if decision recomputed differs due to tie and current path? Shouldn't. But we can guard: if best > x: set best = x? For safety maybe. But then source? Let's include a guard:
if best > x: best = x
if best < 0: ...
For insertion y_prev = best-(k+1); if y_prev <0: y_prev = y-1 and best=x? For robust. But could hide bugs. Maybe add simple guards to prevent index errors:
- If ins and y == 0: force deletion? Not needed.
- If not ins and x == 0: force insertion.
But valid path won't. Could include at top of backtrack:
if x == 0: ins = True
elif y == 0: ins = False
else recompute.
This avoids invalid op if decision says impossible. But could break history parity? At x=0, last move must be insertion. At y=0, last move must be deletion. Use this override. Good.

Similarly forward valid: At d,k, insertion source y_prev >=0; if k positive and right=0? y_prev negative invalid. Good.

Now, trimming prefix/suffix with valid variant: The middle may have no initial snake. Good.

Could optimize history storage: With valid variant many -1; use list of arrays? If using array('i'), values -1 allowed. history[0] array('i',[x]). In forward, prev=history[-1] array. curr list of ints -1. Append array('i', curr). Backtrack prev array. Good.

Potential issue: array('i') on platforms with small int? fine.

Performance of curr = [-1]*(d+1) each d. For D=2000 okay. But if D could be n+m for 20k identical? Trim identical returns. For completely different 1000 D=2000. For 20k differ 50 D~100. Good.

Now, edge cases in valid forward:
- n=0/m=0 handled before.
- history[0] initial snake: In trimmed middle, prefix maximal means first mismatch or one empty. But if one middle empty direct. For helper, if n>0,m>0 and a[0]!=b[0], x0=0. If they share internal, d0 may still snake if first equal due to no trim? Could happen if not trimmed? We trim outer but middle first mismatch. Helper standalone should handle general.
- If d0 x0==n and y0==m: return all '='. If x0==n and y0<m, continue. history[0]=[x0]. For d=1, deletion from left x0 if x0<n? If x0==n invalid deletion; insertion from x0 if y_prev <m. Suppose a prefix all a consumed x0=n, y0=n<m, need insert extra b. For d=1 k=-1 insertion from x0=n? right=x0, y_prev = n -0? k=-1, k+1=0, y_prev=x0 = n = y0. Since y0<m, valid; cand=n. x=n,y=n+1; snake none. Valid. Good. If x0==m and n<m, insertion chain.

Let's test with a=['a'], b=['a','b','c'] (helper no trim? d0 x=1,y=1 not final). d1 k=-1 insertion from x=1,y_prev=1? k=-1 => y_prev=1-0=1<m cand=1, x=1,y=2. d1 k=1 deletion left=1? left<x? x0=1<n=1 invalid. history d1 [1,-1]. d2 k=-2 insertion from k=-1 right=1,y_prev=1-(-1)=2<m cand1 x=1,y=3 final. D=2. Backtrack insertion chain +c,+b, initial =a. Good.

Now, trimming common prefix/suffix may return all prefix/suffix and middle. Need ensure if middle direct one empty, helper returns correct. For mid_a empty mid_b nonempty, helper m>0,n=0 returns all '+' lines. Combined with prefix and suffix. This yields shortest: insert all b middle lines. If common suffix lines maybe could insert after? Yes.

Now, potential issue with prefix/suffix trimming and helper valid DP: Suppose after trimming, middle n,m not empty but d0 snake may still happen if middle first equal due to trimming overlap? We argued no. But helper handles.

Let's design final code functions:
from array import array
from typing import List, Tuple

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n0=len(a); m0=len(b)
    # prefix
    p=0
    limit = n0 if n0 < m0 else m0
    while p < limit and a[p] == b[p]:
        p += 1
    if p == n0 and p == m0:
        return [('=', s) for s in a]
    # suffix
    sn=0
    max_sn = (n0 - p) if (n0 - p) < (m0 - p) else (m0 - p)
    while sn < max_sn and a[n0-1-sn] == b[m0-1-sn]:
        sn += 1
    mid_a = a[p:n0-sn]
    mid_b = b[p:m0-sn]
    mid_ops = _myers_diff(mid_a, mid_b)
    if p == 0 and sn == 0:
        return mid_ops
    res = []
    res.extend(('=', a[i]) for i in range(p))
    res.extend(mid_ops)
    base = n0 - sn
    res.extend(('=', a[base+i]) for i in range(sn))
    return res

Use generator in extend? list.extend(generator) okay but slower. Use list comprehensions:
res = [('=', a[i]) for i in range(p)] + mid_ops + [('=', a[n0 - sn + i]) for i in range(sn)]
But + creates copies. For 20k okay. Could do:
res = [('=', a[i]) for i in range(p)]
res.extend(mid_ops)
res.extend([('=', a[i]) for i in range(n0-sn, n0)])
Return res.

If p==0 and sn==0 return mid_ops to avoid copy.

Helper _myers_diff:
    n=len(a); m=len(b)
    if n == 0: return [('+', line) for line in b]
    if m == 0: return [('-', line) for line in a]
    # d0
    x=y=0
    while x<n and y<m and a[x]==b[y]: x+=1; y+=1
    if x==n and y==m: return [('=', line) for line in a]
    history = [array('i', [x])]
    found_d = -1
    # local variables for speed: aa=a; bb=b; nn=n; mm=m
    for d in range(1, n+m+1):
       prev=history[-1]
       curr=[-1]*(d+1)
       # perhaps precompute hi? no
       for idx in range(d+1):
          k = -d + (idx << 1)
          best = -1
          # deletion
          if idx > 0:
             left = prev[idx-1]
             if left >= 0 and left < n:
                 best = left + 1
          # insertion
          if idx < d:
             right = prev[idx]
             if right >= 0:
                 y_prev = right - (k + 1)
                 if y_prev >= 0 and y_prev < m and right >= best:
                     best = right
          if best >= 0:
             y = best - k
             # It might be that y is out of [0,m] due to right valid? Insertion y=right-k=y_prev+1 <=m, >=1. Deletion y=left+1-k=y_left within. Good.
             while best < n and y < m and a[best] == b[y]:
                 best += 1; y += 1
             curr[idx] = best
             if best == n and y == m:
                 found_d = d
                 history.append(array('i', curr))
                 break
       if found_d != -1:
           break
       history.append(array('i', curr))
    if found_d == -1:
       # fallback simple edit script (should not happen)
       return [('-', line) for line in a] + [('+', line) for line in b]
    D=found_d
    # Backtrack
    ops=[]
    x=n; y=m
    for d in range(D,0,-1):
       k = x - y
       prev = history[d-1]
       # force valid if at boundaries
       # choose source with same rule
       if x == 0:
          ins = True
       elif y == 0:
          ins = False
       else:
          best = -1
          ins = False
          # Need idx boundaries? We can compute based on k,d, not idx? Use idx_right for prev. But candidate values need prev indices.
          # For d, current k. If k == -d: idx_right=0; if k==d: idx_left=d-1.
          if k == -d:
             idx_right = 0
          else:
             idx_right = (k + d) // 2
          if idx_right > 0:
             left = prev[idx_right - 1]
             if left >= 0 and left < n:
                 best = left + 1
          if idx_right < d:
             right = prev[idx_right]
             if right >= 0:
                 y_prev = right - (k + 1)
                 if y_prev >= 0 and y_prev < m and right >= best:
                     best = right
          if best < 0:
             # fallback determine boundary
             if k == -d:
                ins = True
             else:
                ins = False
          else:
             ins = (best == right? not stored) Need know whether best came from insertion. We can set flag.
          # We need set ins flag. Let's rewrite.

Better compute in if block:
       if x == 0:
          ins = True
       elif y == 0:
          ins = False
       else:
          ins = False; best=-1; ins_best=False
          idx_right = (k + d) // 2
          # but if k == -d, idx_right=0; if k==d, idx_right=d. okay formula works.
          if idx_right > 0:
             left=prev[idx_right-1]
             if left >=0 and left < n:
                best=left+1; ins_best=False
          if idx_right < d:
             right=prev[idx_right]
             if right >=0:
                y_prev=right-(k+1)
                if y_prev>=0 and y_prev<m and right >= best:
                   best=right; ins_best=True
          if best < 0:
             # Should not; choose valid boundary
             if k == -d:
                ins_best=True
             else:
                ins_best=False
          ins = ins_best
       if ins:
          # Need x_after = best if best >=0 else recompute? If forced at x==0, best may be -1. We need source values for previous point.
          # For valid path, we can compute from history using standard boundary formulas.
          if best >=0 and ins_best? But if forced x==0, best not set. We can recompute x_after from prev for chosen source.
          idx_right = (k + d)//2
          x_after = prev[idx_right]  # for insertion source. If idx_right out of range? k==d no insertion. But if x==0 and ins, k? At x=0, y=-k>0 so k<0; k not d (d positive), idx_right valid.
          # If x_after <0? set x_after = x? Maybe.
          if x_after < 0:
             x_after = x
          y_prev = x_after - (k + 1)
          if y_prev < 0:
             # fallback insert current last line
             x_after = x
             y_prev = y - 1
          # snake
          for xx in range(x - 1, x_after - 1, -1): ops.append(('=', a[xx]))
          ops.append(('+', b[y_prev]))
          x, y = x_after, y_prev
       else:
          idx_left = (k + d)//2 - 1
          x_prev = prev[idx_left]
          if x_prev < 0:
             x_prev = x - 1
          y_prev = x_prev - (k - 1)
          # snake from x_prev+1 to x-1
          x_after = x_prev + 1
          for xx in range(x - 1, x_after - 1, -1): ops.append(('=', a[xx]))
          ops.append(('-', a[x_prev]))
          x, y = x_prev, y_prev
    # initial snake
    for xx in range(x-1,-1,-1): ops.append(('=',a[xx]))
    ops.reverse()
    return ops

Need fix best/ins flag in non-forced block. Let's code cleanly:
       ins = False
       idx_right = (k + d) // 2
       best = -1
       best_is_ins = False
       if x != 0 and y != 0:  # if boundary force? But if x=0 insertion; if y=0 deletion. If x=0 and y=0 loop ends? d>0 not.
          # deletion candidate
          if idx_right > 0:
             left = prev[idx_right - 1]
             if left >= 0 and left < n:
                best = left + 1
                best_is_ins = False
          # insertion
          if idx_right < d:
             right = prev[idx_right]
             if right >= 0:
                y_prev = right - (k + 1)
                if y_prev >= 0 and y_prev < m:
                   if right >= best:
                      best = right
                      best_is_ins = True
       if x == 0:
          best_is_ins = True
       elif y == 0:
          best_is_ins = False
       elif best < 0:
          # fallback based on diagonal bounds
          if k == -d:
             best_is_ins = True
          else:
             best_is_ins = False
       else:
          best_is_ins = best_is_ins

Then if best_is_ins:
   idx = (k+d)//2
   x_after = prev[idx] if 0 <= idx < len(prev) else x
   # but if best set and best_is_ins, best should be right=prev[idx]. Use best if best>=0 else x_after.
   if best_is_ins:
      # if best >=0 and not x==0/y==0 forced, x_after = best. Else use history prev or x.
      if best >= 0: x_after = best
      else: x_after = prev[idx] if idx valid else x
...
But forced x=0, best=-1; x_after=prev[idx] maybe 0; y_prev = 0-(k+1) =? current x=0,k=-y. insertion previous point (0,y-1) = x_after? Since x=0, prev diagonal k+1 has x=0, yes. Good if valid. If prev idx value -1 fallback x_after=0.
For forced y=0 deletion: idx_left=(k+d)//2-1. If current y=0, k=x. prev diagonal k-1 x_prev=x-1 maybe; history prev value could be x-1. If not fallback x-1.

But in forced x==0 insertion, if y_prev = x_after - (k+1). Current x=0, k=-y. If x_after=0, y_prev = -(-y+1)=y-1. Good.

For forced y==0 deletion, current x=y? k=x. idx_left = (x+d)//2-1. x_after = x_prev+1. If x_prev=x-1, x_after=x, snake empty, del a[x-1], set x-1, y=0. Good.

But we should avoid fallback hacks that might produce invalid scripts if bugs. But they prevent exceptions. In correct cases, best>=0 and matches.

Could simplify backtracking by using valid DP and source formulas from history without best flag:
At each d,k:
  determine insertion using same condition as forward:
   if k == -d: ins=True
   elif k == d: ins=False
   else:
      idx_right=(k+d)//2; left=prev[idx_right-1]; right=prev[idx_right]
      left_ok = left >=0 and left < n
      right_ok = right >=0 and right - (k+1) >=0 and right - (k+1) < m
      # forward rule: best = -1; if left_ok best=left+1; if right_ok and right >= best ins=True else if best... Need know if right>=left+1. Equivalent:
      if right_ok and (not left_ok or right >= left + 1): ins=True else ins=False
      But if left_ok false and right_ok true ins True; if right_ok false ins False. If both false ins False.
      This uses left_ok/right_ok, not best flag. Then x_after = right if ins else left+1. This matches forward rule? Forward rule with best: deletion best=left+1; insertion if right >= best (when left_ok, best=left+1) => right>=left+1; if left invalid best=-1 => right>=-1. Yes. Good. For tie right=left+1 chooses insertion. Use this. This avoids storing best flag. It also needs handle boundaries where left/right indices missing: if k==-d ins True; if k==d ins False. Good.
Then if ins:
   x_after = prev[idx_right]
   y_prev = x_after - (k+1)
else:
   x_prev = prev[idx_left]
   x_after = x_prev + 1
   y_prev = x_prev - (k-1)
Need ensure prev values not -1. For path they aren't. For safety if -1 set fallback based on current:
   if ins:
      if x_after <0 or y_prev<0: x_after=x; y_prev=y-1
   else:
      if x_prev <0 or x_prev >= x: x_prev=x-1; y_prev=y
This simpler. Let's implement this. It also avoids forced x/y except fallback if invalid.
But if x=0, condition may choose insertion? Let's see k=-d boundary insertion. x_after=prev idx, valid. y_prev = y-1 maybe. Good. If condition chooses deletion but x=0, x_prev=prev maybe -1 fallback x-1=-1 invalid. We can add guard: if not ins and x==0: ins=True; if ins and y==0: ins=False? Actually if y=0 and ins selected, fallback y_prev=-1; set ins=False. Better:
if ins and y == 0: ins = False
elif not ins and x == 0: ins = True
Then formulas with current x,y ensure valid. If forced insertion with y>0: set x_after = x, y_prev = y-1. If forced deletion with x>0: x_prev = x-1, y_prev = y.
But this may deviate from history if condition chose invalid due to bug; but prevents exceptions and maintains script. Could it increase D? Still one op per d. Good.

For insertion valid normal:
 idx_right=(k+d)//2
 x_after = prev[idx_right]
 y_prev = x_after - (k+1)
 # ensure x_after<=x and y_prev<y? If not, set to current.
 if x_after < 0 or x_after > x or y_prev < 0 or y_prev >= y:
    x_after = x
    y_prev = y - 1
For deletion:
 idx_left=(k+d)//2 -1
 x_prev = prev[idx_left]
 y_prev = x_prev - (k-1)
 if x_prev <0 or x_prev >= x or y_prev <0 or y_prev > y: # deletion previous y same as after, y_prev=y if no snake? Actually y_prev <= y? If snake after deletion y increases? Deletion y same then snake y increases, so y_prev <= y. x_prev < x.
    x_prev = x - 1
    y_prev = y
Then snake range:
 insertion: for xx in range(x-1, x_after-1, -1): '='; op '+', b[y_prev]; x,y=x_after,y_prev.
 deletion: x_after=x_prev+1; snake range range(x-1, x_after-1, -1) => range(x-1, x_prev, -1); op '-', a[x_prev]; x,y=x_prev,y_prev.
This robust.

Need ensure if x_after=x and y_prev=y-1, snake empty. If x_after< x, we assume matches from x_after to x-1 valid. If history says so. If not, could mismatch; but valid DP exact so okay. Could verify while but no.

Now, initial snake after backtrack: x,y might not equal history[0][0]? Use current x. But if x negative? fallback prevents.

Let's test robust backtrack with valid DP on examples. Already.

Now, need think about trimming common prefix/suffix and helper returning ops. If helper uses valid DP and returns all '=' for identical middle? But middle not identical due trimming, but helper can handle if identical due n,m after direct? Good.

Potential issue: Common suffix trimming with repeated lines may change middle such that optimal script with prefix/suffix fixed is still globally minimal. Standard diff algorithms do this. Need prove? There exists an optimal alignment matching common prefix and suffix. Yes, due to monotonicity of LCS. Common prefix of strings can be matched in some LCS; if a common prefix exists, there is an LCS starting with it. For suffix similarly. Trimming both sequentially safe. For repeated, yes.

Now, consider if prefix trim p and suffix trim sn overlap? Bound ensures no. Good.

Potential performance of trimming: For identical lists 20k, while prefix O20k and return list 20k. Good. For 20k with 50 diffs, prefix maybe small and suffix small; Myers D small. Good.

Now, let's think about worst-case performance of valid DP with repeated long snakes. For 20k differ 50, D maybe ~100. Inner while can scan long segments maybe multiple times. Could be O(D*N) ~2M, okay. For 1000 completely different, states ~1M, while none. Good.

Need maybe optimize helper forward by not using array for curr? Use list for prev? History arrays but prev access array maybe okay. Could store history as list of lists to speed. Memory maybe okay for D=2000. Let's estimate valid DP with parity list memory: For all different 1000, many states valid ~? For d up to 1000, all diagonals within grid valid; after d>1000, some invalid. Total assigned values ~1.5M? list memory maybe 50MB. Okay. To maximize speed, maybe use lists. But if hidden memory low, arrays safer. Array access overhead may still be okay. For 20k D=50 no matter. For 1000 D=2000, 2M array reads; Python array reads maybe 0.2s? Fine. Use array.

But constructing array('i', curr) for each d from list of Python ints. curr values -1, ints. Good.

Could use 'h' for small? Not.

Potential bug: array('i', [x]) history[0]. In backtrack, len(prev)=d. idx_right formula for boundary k=d: (d+d)//2=d; prev idx_right out of range because prev length d. But for k==d, we should not use insertion; idx_right=d. In condition code we may access prev[idx_right] for insertion if idx_right<d? For boundary, idx_right=d so insertion skip. Deletion uses idx_left=idx_right-1=d-1 valid. For k=-d, idx_right=0; deletion skip; insertion prev[0] valid. Good.

Backtrack decision for valid DP:
if k == -d: ins=True
elif k == d: ins=False
else:
  idx_right=(k+d)//2
  left=prev[idx_right-1]; right=prev[idx_right]
  left_ok = left >=0 and left < n
  right_ok = right >=0
  if right_ok:
     y_prev = right - (k+1)
     right_ok = y_prev >=0 and y_prev < m
  if right_ok and (not left_ok or right >= left + 1): ins=True
  else: ins=False
This matches forward rule. But forward rule also if left_ok false and right_ok false best remains -1; ins False. Good.
For k== -d or d, no left/right ok. Path valid. But if boundary insertion not actually valid due y_prev>=m, history state would be -1 not path. If we get there due fallback? maybe.

After ins chosen, if y==0 force delete? But for k=-d, y = x-k = x+d. Since d>0, x>=0 => y>=d>0, so y>0. For k=d, x? current y = x-d; could be 0 at top. If ins force delete? boundary k=d deletion, ok. For interior if ins and y==0 impossible valid but force delete. If not ins and x==0 impossible valid but force ins.

Now, in forward valid rule, if both candidates valid but insertion candidate right < best=left+1, deletion. If right == left+1, insertion. Good.

Let's verify forward valid with d0 initial snake if x0 maybe not 0 and history[0]=[x0]. For d1 k=-1 insertion from right=x0, y_prev=x0-(0)=x0=y0; if x0<y? initial snake stopped due mismatch or y=m/n. If x0<m valid insertion; if y0=m invalid (cannot insert beyond bottom). If y0=m and x0<n, state final? If x0==n too final handled; if x0<n,y0=m, insertion invalid; deletion from x0 valid if x0<n. Good. If x0=n,y0<m, insertion valid, deletion invalid. Good.

Now, consider helper direct if n=0/m=0. In trimmed context, if mid_a empty, output prefix, insert mid_b, suffix. If mid_b empty, delete mid_a. Good.

Now, maybe we can avoid helper all '=' if a==b? If mid_a == mid_b but not equal to original? But helper returns. Fine.

Potential issue: Type hint list[tuple[str,str]] requires Python 3.9+. okay.

Now, test with a=[] b=[]: p=0, p==n==m -> return [] (list comprehension empty). Good.
a=[] b=['x']: p=0; p==n but not m; suffix max_sn=0; mid_a=[] mid_b=['x']; helper returns +x. result +x. Good.
a=['x'] b=[]: -x.

Test with prefix/suffix overlap? a=['a','a'], b=['a']: p=1, suffix max=0, mid_a=['a'], mid_b=[] -> =a,-a. Could also -a,=a. Minimal. Taking = and - gives a,a; = and + gives a. Good.

Test a=['a'], b=['a','a']: p=1, suffix max0, helper +a -> =a,+a. Good.

Test a=['a','b','a'], b=['a','a']: p=1, suffix sn=1, mid_a=['b'], mid_b=[] -> =a,-b,=a. Good.

Now, one more nuance: The script's '=' count maximal. Trimming prefix/suffix fixes some LCS matches; is there any case where fixing common suffix after prefix reduces LCS length? For LCS, if strings share suffix, there is an LCS that includes that suffix provided the suffix begins after a chosen prefix. Since prefix is common and suffix is common non-overlapping, yes can combine. Example a='abc', b='abdc'. Prefix 'ab', suffix 'c', middle c vs dc -> LCS length 3? abc vs abdc LCS abc length3? includes prefix ab suffix c, middle b vs d? Actually LCS length 2? a,b,c and a,b,d,c -> LCS 'abc'? a b then c at end yes length3. good. Repeats: a='aba', b='baa'. Prefix none? suffix? a0 a vs b b no; suffix a vs a sn1; mid a='ab', b='ba' LCS 'a' or 'b' length1; total suffix 1 => LCS2? Original LCS 'aa' length2 or 'ba' length2. good. Prefix+suffix safe.

Now, let's think about if helper's forward break first found state in d loop with exact x==n,y==m. Since we process k from -d to d ascending. If multiple finals, first. Backtrack uses history for that final D. Since history for same d includes values for k before final but not after; backtracking from final k maybe uses previous d only, not current d values. It doesn't need other k at d. Good.

Need ensure when found inside inner, history.append(array(curr)) and break; but curr for k after found remains -1. Backtracking won't use history[D] except maybe? Backtrack starts at final x=n,y=m but doesn't read history[D]. It reads prev histories d-1. So partial curr okay. We store it but not used. Could store before found and then break. Good.

Now, memory of history includes arrays for all d up to D. If found early, good.

Potential bug with array('i', curr) when curr contains large ints >2^31? n,m maybe 20000, fine. D up to 40000. If lines 100000, still fine. Could use 'q' to be safe but memory. Use 'i'.

Now, code style: final only code block. Need include from array import array.

Let's further validate valid DP with a case where d0 x0=n and y0=m? returns. If d0 x0=n,y0<m insertion chain:
Helper a=['x'],b=['x','y','z'] (not trimmed? d0 x=1,y=1)
D? n=1,m=3 LCS1 D=2? Actually insert y,z D=2. Our valid:
d1 k=-1 ins from x1,y_prev=1<3 best=1 x1,y2 no snake (a out) curr0=1. k=1 del left=1<n? 1<1 false invalid; curr1=-1? Wait if idx<d? d=1 idx1=d no insertion. curr1=-1. But state deletion from a end invalid, yes. d2: k=-2 ins from prev0=1 y_prev=1-(-1)=2<3 cand1 x1,y3 final. D=2. history d1 [1,-1]. Backtrack d2 ins idx_right=0 x_after=prev d1[0]=1 y_prev=1-(-1)=2, +b[2]='z', set x1,y2. d1 k=-1 boundary ins x_after=prev d0[0]=1 y_prev=1, +b[1]='y', set x1,y1. initial snake x=1 =x. Good.

Case a=['x','y'], b=['x'] (d0 x=1,y=1=m, x<n). Deletion chain:
d1 k=-1 ins from x1,y_prev=1 not<m invalid -> -1? idx0 curr0=-1? But valid path should delete y at k=1. k=1 del left=1<n cand2 x2,y1 final D=1. history d1 [-1,2]. Backtrack d1 k=1 del x_prev=prev d0[0]=1, snake none? current x=2,y=1; x_after=2, snake empty, -a[1]='y', set x=1,y=1 initial =x. Good.

Now, if both insertion and deletion valid tie at top/bottom? okay.

Let's inspect forward candidate when left invalid but right valid but right < best (best=-1) so insertion. When right invalid but left valid, deletion. When both valid but right==best (insert tie), insertion. Good.

Backtrack decision uses if right_ok and (not left_ok or right >= left+1): ins. But what if left invalid because left>=n but right valid with right < left+1 (left=n, right small)? left_ok false, choose insertion. Forward best=-1 then insertion right>=-1. Good. If left valid left=n-? and right invalid, choose deletion. Good.

Need compute left+1 in backtrack left_ok; if left=-1 left_ok false. left could be n? false. Good.

Now, robust start for insertion uses x_after = prev[idx_right] (right value). But if right_ok false but ins true forced, fallback x. If right_ok true but x_after > x (shouldn't) fallback current. For valid DP exact, x_after <= x. If x_after < 0? fallback.

For insertion, if x_after < x but snake range may include indices that were not valid matches? For valid DP, if insertion source best x_after=right; then forward after choosing insertion set y=best-k=y_prev+1 and snake while matches to final x. The history for current d,k (which is path state) value = final x. Backtrack current x maybe final x. Matches from x_after to x valid. Good.

For deletion, x_prev=left, x_after=left+1. Matches from x_after to x valid.

Now, initial snake after backtrack: If due forced hacks x,y not at d0 state, appending a[0:x] might be wrong. But hacks only if invalid; hopefully not. Could use history[0][0] and set x=that before appending? But current x after backtrack should be d0 final snake x0. If forced, maybe not. We could set initial_x = history[0][0] and use that to append, but y should equal initial_x? d0 diagonal 0. If current x differs due to bug, using history[0][0] may mismatch remaining ops. Better current. Valid no bug.

Now, possible issue with history arrays: In forward, for curr[idx] best after snake, but for future candidates, left/right values are after snake (furthest). Good. For source validity in future insertion, y_prev = right - (k+1) uses right after snake. Is that valid? The predecessor state is end of snake at d-1. For insertion, y_prev might be less than bottom. Good. For deletion, left after snake < n. Good.

Now, let's consider if valid DP with furthest state but snake after each edit can over-consume matches that a non-furthest predecessor would not? Standard snakes consume common matches greedily. If a state reaches (x,y) and next lines equal, matching them is always safe for shortest edit distance. Yes.

Now, code for forward inner while local variables: To reduce global lookups, assign aa=a, bb=b, nn=n, mm=m. But a,b are locals. Use while best < n and y < m and a[best] == b[y]: best += 1; y += 1. Python evaluates a,b each time. Could assign aa=a; bb=b. Not necessary. For speed:
aa = a; bb = b; nn = n; mm = m
while best < nn and y < mm and aa[best] == bb[y]: ...
Do.

Similarly d loop maxD = nn+mm. If D can be 0? handled.

Potential micro-optimizations:
- Use for idx, k in enumerate(range(-d, d+1, 2))? range with step creates range object; computing k = -d + 2*idx faster maybe.
- In forward, prev = history[-1]; local prev_get? no.
- Candidate insertion y_prev = right - k - 1. Compute k_minus_1? Fine.

Let's write helper carefully:

def _myers_diff(a, b):
    n = len(a); m = len(b)
    if n == 0:
        return [('+', line) for line in b]
    if m == 0:
        return [('-', line) for line in a]
    x = y = 0
    while x < n and y < m and a[x] == b[y]:
        x += 1; y += 1
    if x == n and y == m:
        return [('=', line) for line in a]
    history = [array('i', [x])]
    found = -1
    aa=a; bb=b; nn=n; mm=m
    max_d = nn + mm
    for d in range(1, max_d + 1):
        prev = history[-1]
        curr = [-1] * (d + 1)
        # idx from 0 to d
        for idx in range(d + 1):
            k = -d + (idx << 1)
            best = -1
            if idx > 0:
                left = prev[idx - 1]
                if left >= 0 and left < nn:
                    best = left + 1
            if idx < d:
                right = prev[idx]
                if right >= 0:
                    y_prev = right - k - 1
                    if y_prev >= 0 and y_prev < mm and right >= best:
                        best = right
            if best >= 0:
                y = best - k
                while best < nn and y < mm and aa[best] == bb[y]:
                    best += 1
                    y += 1
                curr[idx] = best
                if best == nn and y == mm:
                    found = d
                    history.append(array('i', curr))
                    break
        if found != -1:
            break
        history.append(array('i', curr))
    if found == -1:
       return [('-', line) for line in a] + [('+', line) for line in b]
    D = found
    ops = []
    x = nn; y = mm
    for d in range(D, 0, -1):
        k = x - y
        prev = history[d - 1]
        idx_right = (k + d) // 2
        # Determine source
        if k == -d:
            ins = True
        elif k == d:
            ins = False
        else:
            left_ok = False
            if idx_right > 0:
                left = prev[idx_right - 1]
                left_ok = (left >= 0 and left < nn)
            else:
                left = None
            right_ok = False
            if idx_right < d:
                right = prev[idx_right]
                if right >= 0:
                    yr = right - k - 1
                    if yr >= 0 and yr < mm:
                        right_ok = True
                else:
                    right = None
            if right_ok and (not left_ok or right >= left + 1):
                ins = True
            else:
                ins = False
        # Boundary guards
        if ins and y == 0:
            ins = False
        elif (not ins) and x == 0:
            ins = True
        if ins:
            # source insertion
            if idx_right < d:
                x_after = prev[idx_right]
            else:
                x_after = x
            if x_after < 0 or x_after > x:
                x_after = x
            y_prev = x_after - k - 1
            if y_prev < 0 or y_prev >= y:
                x_after = x
                y_prev = y - 1
            # append snake
            for xx in range(x - 1, x_after - 1, -1):
                ops.append(('=', aa[xx]))
            ops.append(('+', bb[y_prev]))
            x, y = x_after, y_prev
        else:
            if idx_right > 0:
                x_prev = prev[idx_right - 1]
            else:
                x_prev = x - 1
            if x_prev < 0 or x_prev >= x:
                x_prev = x - 1
            y_prev = x_prev - k + 1  # x_prev - (k-1)
            if y_prev < 0 or y_prev > y:
                y_prev = y
            x_after = x_prev + 1
            for xx in range(x - 1, x_after - 1, -1):
                ops.append(('=', aa[xx]))
            ops.append(('-', aa[x_prev]))
            x, y = x_prev, y_prev
    for xx in range(x - 1, -1, -1):
        ops.append(('=', aa[xx]))
    ops.reverse()
    return ops

Check y_prev formula deletion: x_prev - (k - 1) = x_prev - k + 1. Yes.
For insertion y_prev = right - (k+1) = right - k -1. Good.

Potential issue in backtrack interior: idx_right computed from current k,d. For k boundaries, if k==-d, idx_right=0; if k=d, idx_right=d. In source determination, if k==-d/d we don't access out of range? We use if idx_right<d for right; for k=d, idx_right=d -> right skip. if idx_right>0 for left; for k=-d, idx_right=0 -> left skip. Good.
After source determination and guards, when ins True and idx_right may == d? Could happen if boundary guard forced ins at k=d? k=d and ins False initially; if y==0? force delete; if x==0? k=d with x=y? k=0,d? no. If ins True and idx_right>=len(prev), fallback x_after=x. For valid insertion at k=d impossible. Good.
When ins False and idx_right=0? Could happen if k=-d and forced deletion? If x==0 force insertion; if k=-d ins True. If forced? not. Fallback x_prev=x-1.

Now, potential issue: In interior source determination, variables left/right may be referenced in right_ok condition if left_ok false and left not defined? Code: if idx_right>0: left=prev... left_ok=... else left=None. if idx_right<d: right=... if right_ok and (not left_ok or right >= left + 1). If left_ok false but left=None and idx_right>0, left defined None? Actually left_ok false but left set. If idx_right==0, left_ok false and left not set; condition not left_ok true, so right >= left not evaluated. If idx_right>0 but left=-1, left=-1 defined. Good. right defined if idx_right<d and right_ok? If idx_right>=d, right_ok false, condition false so no right reference. In code, need define right=None to avoid UnboundLocal. We'll set right=None, left=None.

But condition right_ok and (not left_ok or right >= left+1). If left_ok false but left=None, short-circuit not left_ok true, so right>=left not evaluated. Good. If left_ok true, left defined. Good.

Now, in forward candidate insertion: if idx<d, right=prev[idx]; if right>=0. In d loop, prev length d, idx 0..d-1 valid. Deletion idx>0 left prev idx-1.

Now, if helper returns fallback simple (deletions then insertions) not minimal; but shouldn't. Could maybe happen if max_d reached due to bug. But if no matches, found at n+m? Valid DP should find at max. Let's test all different n=1000,m=1000: D=2000. At d=2000, final k=0. Should find. max_d=2000 loop includes. Good.

Potential bug: For all different valid DP, at d=n+m, some states invalid; final state candidate? Let's ensure valid DP can reach (n,m) with all deletes/inserts. For n=m=2 all diff, D=4 found. Good.

Now, possible performance: For all different n=m=1000, valid DP will set curr invalid for diagonals outside grid. Number of valid states: d=0..1000: d+1 each; d=1001..2000: 2001-d? Actually sum ~1,001,500? less than 2M. Good. Inner while none. Forward candidate insertion y_prev check: y_prev = right - k - 1. For negative k near -m, y_prev=m invalid skip. Good.

Now, need consider if lines can be empty strings? Yes, comparison works.

Now, code final with helper nested or top-level. Use typing? Not necessary but okay. Could avoid typing import to keep simple. Type hints in function signature as user wants.

Let's review requirements: "Write `diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]`". We can include helper. Reply with single ```python code block. No tests/print.

Now, think if difflib not used. Good.

Let's do more correctness tests mentally with repeated lines and LCS multiple.

Example a=['a','b','a'], b=['a','a'] trimmed p=1, suffix sn=1, mid ['b'] vs [] -> =a,-b,=a. LCS length2. Good.

Example a=['a','b','c','d'], b=['a','c','e','d'] p=1, suffix d sn=1, mid ['b','c'] vs ['c','e'] (suffix d). Myers mid D? a mid b,c; b mid c,e. LCS 'c' length1, D=2? n2,m2 =>2. Possible script =a,-b,=c,+e,=d. Helper:
mid d0 x=0 (b!=c).
d1 k=-1 ins x0,y1? c? a0=b,b1=e? Actually mid b=['c','e']; k=-1 ins from 0 x0,y1 (a0=b,b1=e no) curr0=0; k=1 del x1,y0 snake a1=c,b0=c -> x2,y1 not final y<m=2. curr1=2.
d2 k=0: left curr0=0 best1; right curr1=2 insertion y_prev=2-(1)=1<m cand2 best2 x2,y2 final D=2. Backtrack insertion x_after=2, y_prev=1, +b[1]='e'; set x=2,y=1. d1 k=1 deletion x_prev=prev0=0, snake x_after=1 to x-1=1? current x=2, x_prev=0, snake range 1..1 '=c'; op '-', a[0]='b'. initial none. combined =a,-b,=c,+e,=d. Good.

Example where LCS not prefix/suffix: a=['x','y','z'], b=['y','x','z'] p=0? x!=y; suffix z sn=1; mid ['x','y'] vs ['y','x']. LCS length1, D=2. Helper all diff? a0 x,b0 y diff; a1 y,b1 x diff. D=2? For n=m=2 LCS1? Actually ['x','y'] and ['y','x'] LCS1, D=2. Output maybe -x,-y? Let's see valid:
d0 0
d1 k=-1 ins x0,y1 no? x vs y? after ins a0=x,b1=x? b mid ['y','x']; insertion from 0 x0,y1, snake a0=x,b1=x => x1,y1. curr0=1. k=1 del x1,y0, snake? a1=y,b0=y => x2,y1 curr1=2.
d2 final k0: left curr0=1 best2; right curr1=2 insertion y_prev=2-1=1<m cand2 tie ins x2,y2 final. Backtrack d2 ins from curr1 x_after=2, y_prev=1, +b[1]='x'; set x2,y1. d1 k=1 boundary del x_prev=prev0=0, snake x_after=1 to x-1=1? current x=2, x_prev=0 -> range(1,0,-1): xx=1 '=' y? a[1]='y'; op '-', a[0]='x'. initial none. combined with suffix =z: -x,=y,+x,=z. Taking =,- gives x,y,z? =y +? a: '-' x, '=' y => x,y then suffix z yes. =,+ gives y,x,z. D=2. Minimal yes.

Now, if trimming suffix changes path: a=['x','y','z'], b=['y','x','z'] we trimmed suffix z, output above. Good.

Now, potential issue with ops order when prefix/suffix and middle insertion/deletion: If middle insertions should occur after deletions? Myers outputs valid. Prefix before, suffix after.

Now, one concern: valid DP source validity in forward for deletion: left >=0 and left < n. But what if left valid state has y_left > m? prev valid should prevent. Let's ensure prev states after snake always within grid. Candidate insertion checks y_prev < m and y_prev >=0. After insertion, y=y_prev+1 <=m. After deletion, y=y_left; left valid on k-1 implies y_left within [0,m]. But do we enforce left valid? left state might be on diagonal k-1 with x=left but if left=0,k-1 positive? It would have been invalid and stored -1 because insertion candidate from top? Let's verify. Initial d0 k0 valid. d1 k1 deletion from k0 x0 -> x1,y0 valid. d2 k2 deletion from k1 left=1? y_left=1-(1)=0 valid; x2,y0. If n large. Good. Positive diagonals built by deletions, maintain y>=0. Negative by insertions, maintain x>=0. So prev valid. Good.

Candidate insertion: right state valid on k+1, but y_prev computed could be >m? prev valid ensures <=m. We check <m. If y_prev=m invalid. Good.

Thus no need current diagonal hi checks.

Now, if n or m huge and D small, history arrays length small. Good.

Let's think about if D can be large but max_d n+m maybe 40000 for 20k all different; algorithm too slow. Spec doesn't require but could timeout. Can we add guard to fallback to DP or something? Not needed. But maybe hidden includes 20k completely different? It says two lists of 20k that differ in about 50 places; two completely different 1000. So okay.

Potential issue with Python recursion? none.

Now, let's consider using common prefix/suffix trimming before helper but helper also has d0 snake. If prefix p can be large (20k), we create mid lists by slicing a[p:n-sn]. If lists large and identical, we return before slice? We check p==n and p==m after prefix. But if lists not equal and prefix huge, suffix small, slices length maybe small. If lists length 20k with one middle mismatch at start, p=0, slice 20k copies; okay. For memory, mid_a/mid_b plus original 40k strings references, okay.

Could avoid slicing by passing indices to helper to save memory. Not necessary.

Now, ensure no use of difflib. Good.

Let's maybe add a fast path: If n==m and all lines equal? prefix handles. If len(a) + len(b) <=? not needed.

Let's examine if helper returns all '=' for mid identical but mid maybe not entire equal due to trimming? Example after suffix trimming, middle could be identical? Suppose a=['a','b','c','d'], b=['a','b','c','d','e'] p=4 (n exhausted), suffix 0, mid_b=['e'] not identical. If p stopped at mismatch, middle first mismatch. So helper not return all '=' unless a==b from no trim? But okay.

Now, possible bug with array module not imported if no helper? include.

Let's consider if `array('i', [x])` and later curr list values -1; array('i', curr) okay. If Python's 'i' signed int min -2147483648; values >=-1.

Now, maybe type hints with list[str] requires from __future__? Python 3.11 supports. Good.

Let's refine final code for readability and performance.

Potential issue: In forward, history.append(array('i', curr)) after inner loop if not found. But if found, we append inside inner. If found at d and break inner, we then outer break. Good.

But if found inside inner, curr for later idx remains -1; history D array incomplete. Backtrack doesn't use history[D]. It uses history[d-1] etc. So fine. But maybe for backtracking decision at D? It uses history[D-1] only. Good.

Now, if found_d = d but history length = d+1. For D=1, history length2. Backtrack d=1 prev history[0]. Good.

Now, source determination in backtrack with idx_right formula and left_ok/right_ok should match forward. But note forward candidate rule: if left_ok, best=left+1; if right_ok and right >= best, ins. Suppose left_ok false, best=-1; right_ok and right>=-1 ins. In backtrack condition: right_ok and (not left_ok or right >= left+1). If left_ok false, choose ins. Good. If right_ok false, ins false even if left_ok true. Good.

Tie if right == left+1 ins. Good.

Now, boundary k== -d/d: Forward candidate rule for k==-d: idx0, left skip; right=prev[0]. If right_ok? If right invalid, best remains -1. But if state valid path, right_ok. Backtrack boundary ins True regardless of validity; formulas fallback if invalid. Good.

Now, in forward, for boundary insertion if right_ok false, curr -1. Thus no valid final state on that diagonal. Backtrack should not hit. If due to current x,y forced? no.

Now, let's consider if history arrays values for invalid states -1 but candidate left< n? left=-1 false. right=-1 false. Good.

Now, potential bug: When initial d0 x0 could be >0. For d1 boundary k=1 deletion left=prev0=x0. If x0<n valid; if x0==n invalid. Good. k=-1 insertion right=x0; y_prev=x0-(0)=x0. But initial y0=x0 (snake on k0). If y0<m valid. If y0==m invalid. Good.

Now, check if initial x0==n and y0==m? return. If x0==n,y0<m, d1 k=-1 insertion x_after=n,y=y0+1, snake none; d2 k=-2 insertion from k=-1 x=n,y=y0+2; etc. This will insert all b suffix. D=m-y0. Backtrack insertion chain. Good. If x0<y0? d0 snake stops when mismatch or one exhausted; x0,y0 equal. So x0=y0. Good.

Now, after suffix trimming, middle could have common prefix due to p not maximal? no.

Let's consider a tricky LCS repeated lines: a=['a','b','a','b'], b=['a','a','b','b']. LCS length3? Edit distance 2? Prefix p=1 (a). suffix: a[3]=b,b[3]=b sn1; a[2]=a,b[2]=b no. mid_a=['b','a'], mid_b=['a','b']. LCS length1 (a or b), D=2. Output maybe =a,-b,-a,+b,+b? Actually LCS3 total? prefix1+middle1+suffix1=3. D=4-3? n4,m4 => D=2? Wait edit distance = n+m-2LCS =8-6=2. Middle n2,m2 LCS1 => D=2. Ops: =a, -b, -a, +a,+b? that's 4 ops? But total edits D=2, plus prefix/suffix. Middle script should length2: =b? Let's run helper mid ['b','a'] vs ['a','b'] similar earlier output -b,=a,+b? That has ops length 3? n=2,m=2 LCS1 => D=2? Wait script -b,=a,+b: '-' b, '=' a, '+' b length 3 ops but edit distance 2? Edit script length counts insertions/deletions only, '=' not. Ops: one deletion, one insertion => 2. Good. Combined =a,-b,=a,+b,=b. Takes a,b,a,b? prefix a, -b, =a, =b => a,a,b? Hmm original a after prefix: b,a; script middle -b,=a gives a; then suffix b => a,a,b. Plus insertion b for b: prefix a, =a, +b, suffix b => a,a,b,b. Good. LCS length 3: prefix a, middle =a, suffix b. okay.

Now, if middle script includes '=' from mid_a, combined prefix+mid = lines. Good.

Now, could there be an issue with output of '+' lines when y_prev index out of range due to forced? fallback y_prev=y-1. If y==0 and ins forced? We set if ins and y==0 ins=False. So y_prev>=0. In insertion fallback if y_prev >= y set y_prev=y-1. If y>0. Good.

Deletion fallback x_prev=x-1; if x==0 and ins false guard sets ins=True. Good.

Now, maybe we should not use forced guards because they can change source and break the equality constraints? But if history invalid due to bug, any output might be wrong. For valid cases guards not used except perhaps boundary valid? Let's see: If ins True and y==0 cannot happen in valid path. If not ins and x==0 cannot. In forward valid, at k=-d boundary ins True, y = x + d >0. At k=d boundary ins False, x = y + d >=0; could x=0? Then k=d=0? d>0, x=0,k=d => y=-d invalid current. So not. Guards unused. Good.

Now, one more possible performance issue: list.extend with generator maybe slow. Use list comprehension. In final:
    res = [('=', a[i]) for i in range(p)]
    res.extend(_myers_diff(mid_a, mid_b))
    if sn:
        res.extend(('=', line) for line in a[n0 - sn:])  # generator okay; slice small? Could use comprehension over slice: [('=', line) for line in a[n0-sn:]] but slice copies. sn small maybe. Use for i range.
Could use `res.extend([('=', a[i]) for i in range(n0 - sn, n0)])`.

If p==0 and sn==0, return mid_ops to avoid extra. But if p==0, sn>0, result = mid_ops + suffix. Could do res=mid_ops; res.extend(...). Fine.

Need be careful not to mutate helper ops? It's new. okay.

Now, let's think about if common prefix/suffix trimming with one list prefix and suffix loops. Example a=['a','b','c'], b=['c','a','b']? p=0? a0 a vs c; suffix: a[-1]=c,b[-1]=b no. mid all. Myers output maybe -c? Actually LCS 'ab'? a has a,b; b has a,b at positions 2,3? b=['c','a','b'] LCS 'ab' length2 D=2? script +c,-a? a=['a','b','c'] to c,a,b? Maybe -a,-b,+c? length3? LCS length? a subseq a,b,c; b subseq a,b? yes 'ab', plus maybe c? b has c at start, cannot after a,b. LCS2 => D=3? n3,m3 6-4=2? Wait LCS2 => edit distance = n+m-2*LCS=6-4=2? But transforming abc to cab: delete a? delete b? insert c at start? That's 3. Maybe LCS length1? abc and cab: common subsequences: a? b? c? length1? Actually 'a','b' in b are after c, but abc has a,b before c; order a then b then c. cab order c,a,b. Cannot have a,b then c because c before a. Could have a,b length2 yes b has a then b. a has a then b. So LCS2. Edit script: insert c at start, delete c at end => +c,=a,=b,-c length2. Good. Myers maybe output. Trim none. Valid DP should handle.

Test mentally: d0 x0=0 (a vs c). d1 k=-1 ins x0,y1? b1='a' vs a0='a' -> snake x1,y2? y after insertion: k=-1, x=0,y=1, snake a0=a,b1=a -> x1,y2; b2=b, a1=b -> x2,y3? m=3, x2,n3? y=3; final? x2<n, y=m. curr -1? k=-1 x2. k=1 del x1,y0, snake? a1=b,b0=c no curr1=1. d2: k=-2 ins from k=-1 x2? right=2, y_prev=2-(-1)=3 not<m invalid -> -1. k=0: left from -1=2 best3 (left<n?2<3) cand3; right from 1=1 y_prev=1-1=0 cand1; choose del x3,y3 final? x=3,y=3 yes D=2. Backtrack d2 k=0 deletion x_prev=2, x_after=3, snake none? current x=3, x_prev=2; snake range x-1=2 to x_prev=2 exclusive empty? range(2,2,-1) empty. op '-', a[2]='c', set x=2,y=3? y_prev=x_prev-(k-1)=2-(-1)=3. d1 current k=-1 boundary insertion x_after=prev d0[0]=0? Wait prev for d1? history0 [0]. But current x=2,y=3,k=-1,d=1? No d=1, k=x-y=-1 boundary insertion. x_after=prev[0]=0,y_prev=0-0=0. snake range x-1=1 to x_after-1=-1: xx=1 '='? a[1]='b', then xx=0 '='? a[0]='a'? That records matches a[1],a[0] reversed then op + b[0]='c'. set x=0,y=0. initial none. reverse ops: +c, =a, =b, -c. Good.

Now, in d1 backtrack insertion snake range includes x_after=0 to x-1=1: includes indices 1,0 reversed => =b,=a; reverse final =a,=b. Good.

Now, check if x_after=0 less than current x=2, matches from insertion after edit at (0,1) to (2,3) are a0=b? Wait insertion at d1 from (0,0) inserting b0='c' to (0,1), snake matches a0='a' with b1='a' (x0), a1='b' with b2='b' (x1). So snake indices x_after=0,1 => a0,a1. Reverse records b,a; reverse gives a,b. Correct.

Now, let's consider if valid DP source validity with insertion y_prev = right - k -1. For d1 k=-1, right=0,y_prev=0 valid. Good.

Now, if we trimmed suffix in above (suffix? c vs c? original a ends c, b ends b no; prefix? a vs c no). Good.

Now, possible issue with prefix/suffix trimming on this example: suffix no; okay.

Now, code final should include helper name maybe `_myers_diff`. Since user asked write diff_lines. Good.

Let's consider hidden tests comparing exact output? They only specify constraints, likely accept any minimal. Good.

Now, let's think about if output number of '=' items equals LCS length. Our algorithm finds shortest edit distance via valid DP; but we need ensure it doesn't produce non-minimal due to valid variant. I think yes. Could maybe produce a script with more '=' than LCS? No, each '=' corresponds to match in edit path. If script not shortest, '=' count less? Actually minimal edit length = n+m-2L. Our algorithm D is edit length; '=' count = (n+m-D)/2 if script valid. Since D minimal, '=' count LCS. If our DP underestimates D via false states, invalid script might fail constraints; if overestimates D, not minimal. Valid DP exact grid furthest should not overestimate? It finds minimal d in grid if recurrence complete. Need recurrence complete? We skip moves invalid for furthest predecessor; if less-far needed, overestimate. We argued dominance. Let's try find a concrete less-far needed by brute reasoning with small n,m.

We can manually enumerate true F_d(k) for small n,m and compare recurrence skip invalid. Let's do n=2,m=3 with arbitrary characters all diff for F. Valid recurrence skip invalid. True reachable max within grid. We computed for all diff: F0[0]=0; d1 [-? k=-1 x0,k1 x1]; d2 [-2 x0? from -1 insertion valid y_prev=1? m=3 yes x0; k0 x1; k2 x2]; d3 [-3? insertion from -2 right0 y_prev=2<m cand0; k-1 from -2 del? x1 and from0 ins? x1; k1 x2; k3? deletion from2 left2<n2? left=2 not <2 invalid -> -1]. True d3 k3 reachable? Need 3 edits ending k3 within n2,m3: delete,delete,? from start to x? max x2,y? k3 requires y=x-3=-1 invalid unless x>3 but n2. invalid. Good. d4 final k=-1? True reachable? all diff D=5? n=2,m=3 all diff LCS0 D=5. F valid should find at d5. Seems.

Need boundary where matches create non-contiguous reachable x. Suppose n=2,m=2 with matches at (0,0) only. d0 x1. d1: k=-1 insertion from x1,y1? y_prev=1<m => x1; then maybe snake? a1 vs b? if a1!=b?; k1 deletion x2,y0. F[-1]=1,F[1]=2. True. d2 k0: left -1=1 best2; right 1=2 y_prev=2-1=1<m cand2 tie insert ->2 final. Good.

Suppose matches only at (1,1). a=['x','a'],b=['y','a']. d0 x0. d1 k=-1 insertion x0,y1 snake a0=x,b1=a no; k1 del x1,y0 snake a1=a,b0=y no? x1,y0. d2: k0 left0? from -1=0 best1; right1=1 y_prev=0 cand1 ->1, no snake? a1=a,b1=a after starting x1,y1 -> snake x2,y2 final D2. Valid. Could less-far? no.

Try n=3,m=2. Need bottom insertion maybe. a=['x','a','b'], b=['a','b']. d0 x0? x vs a. d1 k=-1 ins x0,y1 snake a0=x,b1=b? no; k1 del x1,y0 snake a1=a,b0=a -> x2,y1. d2 final? n3,m2 k=1. k=-? final k=1. F d2 k1: from k0? d1 k0? d1 k0 not valid parity? d1 k=-1,1. k1 boundary deletion from k0? no; for d2 k1 idx? d2 k=-2,0,2. Not final. d3 final k1: insertion from k2? d2 k2 deletion from k1 left=2<n3 cand3,y? k=2,y=1; then d3 k1 insertion from k2 x3,y_prev=3-2=1<m cand3, final x3,y2 D3. True edit distance 1? Actually a to b delete x => D1. Why d1 k1 deletion did not final? a=['x','a','b'], b=['a','b']: d0 x0. d1 k1 deletion x1,y0, snake a1=a,b0=a ->x2,y1; a2=b,b1=b ->x3,y2 final! D=1. I forgot snake. Found. Good.

Bottom insertion invalid but deletion path works.

Need case where only insertion from non-furthest bottom needed and no deletion dominates. Suppose a has extra at start? deletion. Extra at end? insertion from state not bottom? If a consumed all and b remains, insertion chain from right boundary valid (y_prev<m). If b consumed all and a remains, deletion chain valid. If both have extras interleaved, less-far maybe? Hard.

I feel valid DP okay.

Alternative: Could run standard Myers (no boundary) and if result script count not minimal? No way.

Let's consider adding a DP fallback to verify minimal for small n,m but not output if Myers returns? Maybe we can choose DP for n*m <= 1_000_000 to guarantee. This could sidestep any valid recurrence concerns for 1000 all different. But DP reconstruction memory/time code longer. Do we need? If valid DP has subtle overestimation, hidden random small would catch. DP for small (<=200) could be okay. But 1000 all different if overestimate? Maybe not. Could implement DP fallback for product <= 250_000 to catch small correctness, but not performance. Not necessary.

Maybe use standard library `array` but hidden environment supports. Yes standard.

Let's think about if there is any chance of TLE due to valid DP's candidate checks and array conversion for 1000 all different under 6s. 1M states * maybe 10 Python ops ~10M, should be <1s? With array conversion maybe 0.5. Good.

If 20k differ 50 but middle length 19900, D maybe 100, states ~10k, snakes scanning ~2M char comparisons. Python string comparisons maybe okay. Under 2s? Let's estimate: For each snake step compare strings; if lines are short, okay. 20k*100? Actually snakes may scan segments multiple times D times. Worst D=100, total snake steps maybe D*common length? Could be 2M, fine. If D=200, 4M, fine. If prefix/suffix trim reduces. Good.

But what if 20k lines differ in 50 places scattered, D~100 but common segments long. The snake while may scan each common segment for many diagonals. Could be O(D*N) = 2M. Good.

Now, perhaps valid DP with array history and list curr for each d with d up to 100 trivial.

Let's consider a pathological case with many repeats and D small but snakes scanning long same segments many times. Myers O(ND) with N=20k,D=100 => 2M. okay.

Now, maybe use common prefix/suffix trim can actually cause middle D larger? No.

Now, final code. Need ensure code only in python block, no explanation.

Let's draft final code in mind:

```python
from array import array

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n0 = len(a)
    m0 = len(b)
    p = 0
    lim = n0 if n0 < m0 else m0
    while p < lim and a[p] == b[p]:
        p += 1
    if p == n0 and p == m0:
        return [('=', s) for s in a]
    sn = 0
    max_sn = n0 - p
    if m0 - p < max_sn:
        max_sn = m0 - p
    while sn < max_sn and a[n0 - 1 - sn] == b[m0 - 1 - sn]:
        sn += 1
    mid_a = a[p:n0 - sn]
    mid_b = b[p:m0 - sn]
    mid_ops = _myers_diff(mid_a, mid_b)
    if p == 0 and sn == 0:
        return mid_ops
    res = [('=', a[i]) for i in range(p)]
    res.extend(mid_ops)
    if sn:
        res.extend([('=', a[i]) for i in range(n0 - sn, n0)])
    return res

def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
   ...
```

Potential issue: helper defined after used; Python resolves at call time, okay. Could define helper before diff_lines for clarity.

Now, inside helper, after fallback return, if found remains -1. But if found at d and break inner, we append history inside. Need ensure found_d variable accessible. We'll implement:
    found_d = -1
    for d ...:
       ...
       if found_d != -1: break
       history.append(...)
    if found_d == -1: fallback

When found inside inner, we do `found_d = d; history.append(array('i', curr)); break`. Good. If not found, append after inner. But if inner completes and found_d remains -1, append. If inner broke found, skip append after due break and outer break.

Potential issue: For d where inner not found but some curr entries -1, append. Good.

Now, in forward candidate, after snake best and y maybe final. We assign curr[idx]=best even if final? Then check. Good.

Now, if found inside inner, history D curr partial; but history length D+1. If D maybe found at first final k. Good.

Now, helper for n,m not huge, recursion no.

Let's ensure type of ops: tuples of strings. In ops.append(('=', aa[xx])). Good.

Now, maybe in `_myers_diff`, if a and b are slices from original, type list[str]. Good.

Potential performance issue: `array('i', curr)` for every d. If curr contains -1, ints. Good. But import array. If not available? standard.

Could use `list` history if array import overhead? no.

Now, let's test mentally helper for a==b but not caught by outer. It does d0 snake x=n,y=m returns all '='. Good.

Now, if `mid_a` empty and `mid_b` empty after trimming? If lists equal but p not n,m? Could happen with overlap? Bound prevents. But helper n=0,m=0 returns [] (since if n==0 returns []? Our n==0 branch returns [('+',line) for line in b] which is [] if b empty). Good.

Now, potential bug: In prefix trim, if p == n0 and p != m0, max_sn = min(0, m0-p)=0, mid_a empty, mid_b rest. Good.

Now, if after prefix p=0 and suffix sn covers entire equal suffix but lists not equal; okay.

Now, let's consider if common suffix lines could be equal but picking them in output after middle inserts/deletes may make taking '=' and '-' give original a? Yes suffix from original end. Middle ops before suffix. If an optimal diff would intermix suffix matches with middle, fixed suffix still minimal. Good.

Now, maybe hidden test checks that taking '=' and '-' items in order gives exactly a. Our ops from helper plus suffix: For helper middle, taking '=' and '-' gives mid_a. Prefix then suffix from a ensure all a. For taking '=' and '+' gives mid_b plus b suffix. Good.

Now, possible bug in helper initial snake and history with x0 maybe not int? int.

Now, let's think if valid DP with candidate source validity could skip a necessary move when left valid but raw left+1 leads to current diagonal with y>m? But prev valid on k-1 => y=left-(k-1) <=m. So current y same <=m. x=left+1<=n by left<n. Good. For insertion prev valid => y_prev<=m and <m, current y<=m; x=right<=n. Good.

Now, if prev state after snake at x=right but y_prev=m (bottom), insertion invalid skip. If less-far needed, maybe overestimate. We trust.

Maybe to be extra safe, implement standard classic (no source validity) but with final exact by continuing after overshoot? Another idea: Run standard forward but store history; for each d, if final state has x>=n and y>=m, we can continue the same d to see if exact? But standard recurrence with no source validity may produce exact later on same d? Maybe. But if no exact due furthest overshoot, we'd break with D and robust backtrack. Valid variant exact but possible overestimate. Which failure mode more likely? Standard proven. Let's maybe implement standard classic but with history arrays and exact final? If we use standard recurrence no source validity and break at >=, and backtrack robust, we align with proven Myers. It may have overshoot but robust. Is robust backtrack guaranteed? Likely if standard proven. It may be simpler and faster (fewer boundary checks). Let's evaluate standard inner:
 for idx:
   if idx==0: best=prev[0]
   elif idx==d: best=prev[d-1]+1
   else:
      left=prev[idx-1]; right=prev[idx]
      if left < right: best=right else best=left+1
   y=best-k
   while best<n and y<m and aa[best]==bb[y]: best++; y++
   curr[idx]=best
   if best >= n and y >= m: found
This stores invalid negative y/ >n values. Backtrack decision standard: if k == -d or (k != d and left < right): ins else del. This doesn't consider validity. Source values may be >n. Robust fallback. Is there any risk output script length not equal to D? We still add one op per d and snakes. Could snake range with start_x > x fallback zero. Op lines from current boundaries. Could produce invalid sequence if fallback used in a way not transform? Starting from (n,m), for each d choose op based on standard, fallback to boundary op if history source invalid. The sequence of (x,y) updates should remain within grid and decrease edit count. Each op is valid edit. Initial snake valid. Thus final ops should transform? Since we construct backward from (n,m) applying valid inverse ops to reach (0,0) (or initial snake). The only risk is snake matches assumed but not actually equal. If history source invalid and start_x fallback to x, snake empty, valid. If history source valid start_x < x but due to invalid history not actual matches, could output wrong. But if fallback not used and source standard proven, matches valid. Could there be case standard source start_x < x but not matching due to history not from actual path? Standard current history value for final k may not be used; backtrack state (x,y) may not correspond to history current value if overshoot; standard condition could choose source and snake length from source to x that history didn't do because current state not history. However standard proof says it does for some valid path. If robust fallback only when source start_x > x or out of bounds, maybe enough.

Which is less code and faster? Standard inner simpler and faster. Backtrack robust with source condition standard. Let's test standard with common examples; works. Potential for false output in cases with overshoot? Need test a case where backtrack state doesn't match history current. Let's try construct from earlier n=1,m=2 all diff: standard history d2 values [0,1,2], d3 final k=-1 value1. Backtrack current start x=1,y=2,k=-1,d3; source insertion from prev d2 idx? idx_right=1, prev_x=1 <=x, snake empty, set x=1,y=1. Good. History d2 state k=0 value1. matches current x=1,y=1. Good.
What if at some d, current x,y not equal history[d][k] because history final value overshoot but start at n,m. For d=D, current k final, history[D][k] maybe >n; backtrack doesn't use current history value except start n,m. Source from history[D-1]. It may produce current state that doesn't equal history[D-1]? It sets x,y to previous point from source. That previous point should match some history[D-1] state (prev diagonal). If source history value overshoot but clipped? For valid standard, likely matches a valid state or clipped. If it matches exactly history prev value, next d state's x,y equals history[d-1][prev_k]. Then subsequent works. If source prev value >x and fallback, not exact. Could happen? Let's try to create where chosen prev value > current x. For standard, if current state valid x=n, chosen prev diagonal value may overshoot >n. Condition left<right. Need right > left but right value >n. Current k such that insertion from k+1. prev diagonal k+1 overshoot x>n. Is there also valid path? For n=1,m=2,d3 final insertion from prev k=0 value1 not overshoot. For final positive, insertion from positive overshoot maybe not used. Maybe standard backtrack never chooses overshoot >current x because standard condition chooses max x, but max x overshoot may be >n. It could choose it if on adjacent diagonal and left<right. But if right overshoot >n, condition true. Example n=1,m=3 all diff. Let's compute standard history maybe overshoot positive states. n=1,m=3 all diff:
d0 [0]
d1 k=-1 x0,y1; k=1 x1,y0. [0,1]
d2 k=-2 x0,y2; k=0 insertion from1 x1,y1; k=2 deletion from1 x2,y0. [0,1,2]
d3 k=-3 x0,y3; k=-1 insertion from1 x1,y2; k=1? left? k=1 idx2 left idx1=1,right idx2=2 -> insertion x2,y1; k=3 deletion from2 x3,y0. final? k=-1 value1? For n=1,m=3 final k=-2 D=4 maybe. At d3 not final? k=-3 x0,y3 x<n; k=-1 x1,y2 y<m? m3 y2<3; k1 x2,y1 x>n; no final. d4: k=-2 insertion from d3 k=-1 x1,y3 final? idx? yes value1. Backtrack d4 insertion from prev d3 idx for k+1=-1 value1 <=x. Good. Positive overshoots not chosen. For n>m final positive, negative overshoot maybe not chosen. So maybe never.

Standard seems robust enough. It is also what hint expects. Maybe use standard instead of valid? It would be faster and simpler. But history values invalid could cause inner while condition y negative: while best<n and y<m (y negative <m true) and best>=0 and a[best]==b[y] -> indexing b[y] negative if y<0! In standard, y may be negative for invalid states (positive k with x small). Need guard: while best < n and y >=0? Standard assumes y valid? Actually V can store x=0,k positive -> y negative. But can that happen? d1 k=1 x=1,y=0 not negative. d2 k=2 from d1 k1 x=1+1=2,y0. If n large, x=2,y0. Not negative. Could x=0,k positive? For k positive, x from deletion prev+1; min x at d=k? x at least? Standard d1 k=1 x=1. d2 k=2 x=2. So for positive k, x>=k? If matches, x larger. So y>=0. For negative k, x>=0, y=x+|k| positive. Thus y not negative? What about insertion from prev overshoot? x maybe 0,k=-d, y=d positive. So standard candidate may keep y within due to parity/min? If left < right and right maybe 0,k positive? But right on k+1 positive? For k positive, right x at least k+1? If valid states maintain, yes. Without invalid checks, could right be 0 on k+1? At d-1, k+1 positive <=d-1; minimal x for that diagonal maybe k+1, so not 0. Because to reach positive diagonal, need at least k+1 deletions. Candidate deletion increases x. So x>=k. Thus y>=0. Overshoot can be y>m or x>n but not negative. Good. For k negative, y positive; x can exceed n but y maybe >m. So no negative index. In valid DP, we had invalid -1; standard no -1? curr initialized? Standard with history arrays length d+1 assigns every idx, no -1. Values nonnegative. Good.

Forward standard inner can be:
 if idx ==0: best=prev[0]
 elif idx==d: best=prev[d-1]+1
 else:
   left=prev[idx-1]; right=prev[idx]
   if left < right: best=right else best=left+1
 y=best-k
 while best < n and y < m and a[best]==b[y]: ...
 curr[idx]=best
 if best >= n and y >= m: found
No source validity, no invalid. Values can be >n, y>m. while best<n prevents x out; y<m prevents y out. If y>m, while skip. If best>n, skip. Good. Index b[y] only if y<m. If y negative? not. Good.

Backtrack standard robust:
history arrays length d+1 all ints. Source condition standard: if k==-d or (k!=d and prev_left < prev_right): ins else del.
For insertion, prev_x = prev[idx_right]. This could be >x, fallback. For deletion, prev_x = prev[idx_left]; x_after=prev_x+1; could >x, fallback. Snake matches from x_after to x-1; if start_x < x, need ensure start_y = start_x - k within [0,m] and matches. If history valid, yes. If start_x <0? prev values nonnegative. If start_x >x fallback. If start_y >m? if start_x<=x and current valid? Could start_y >m? start_x-k. Since current y=x-k. start_x<=x => start_y<=y<=m. Good. If start_y<0? start_x>=k? For insertion source from k+1, prev_x should be >=? standard states maybe yes. Fallback if y_prev <0. So robust.

This is simpler and likely fastest. Should we switch final to standard? Let's compare with valid: standard has no -1 and candidate simpler. It may store overshoot but robust. Need ensure final exact? Break at >=. If found overshoot, history D not exact but backtracking from n,m with source standard may produce valid path. Is that guaranteed? I think yes in standard backtrack. But let's test a constructed overshoot final if any.

Try n=1,m=1 all diff standard D=2 found at d2 k=0 best=1,y=1 exact. no.
n=1,m=2 all diff D=3 found k=-1 x=1,y=2 exact? d3 k=-1 value? d2 [0,1,2]; d3 k=-1 insertion from d2 k=0 value1,y=2 exact. Good.
n=2,m=2 all diff D=4. Let's simulate standard maybe final exact. d0 [0]
d1 [0,1]
d2 k=-2:0; k=0 insert from1? left0,right1 ->1; k=2 del2. [0,1,2]
d3 k=-3:0; k=-1 left0,right1 insert1; k=1 left1,right2 insert2; k=3 del3? from k2 x2+1=3. [0,1,2,3]
d4 k=-4 0; k=-2 insertion from k=-1? k=-2 current from prev -1 right1? y? not final; k=0 left1,right2 insert2; k=2 left2,right3 insert3? current k=2,y=1? x=3 overshoot x>n; not final because y=1<2. k=4 x4. Wait final k=0 maybe found at d4 k=0 x=2,y=2? k=0 left prev idx1=1,right idx2=2 => insertion best=2,y=2 final exact. Good.

For all diff, final exact.

Maybe overshoot final occurs when n != m? Try n=1,m=3 all diff D=4. final k=-2 at d4: d3 values? d0[0]; d1[0,1]; d2[0,1,2]; d3 k=-3:0; k=-1: insert from1 x1,y2; k=1: insert from2 x2,y1 overshoot x; k=3: del from2 x3,y0. [0,1,2,3]. d4 k=-2: insertion from k=-1 value1,y=3 final exact. Good. Negative chain exact.

n=3,m=1 final positive chain exact from positive chain. So overshoot not used for final.

Thus standard likely safe. It is also closer to hint. Let's consider implementing standard for final code. It will have fewer boundary checks, faster. Backtrack robust fallback but standard path no fallback. Need ensure history initial with d0 snake, not sentinel. Standard candidate for d=1 with history[0] x0. Works.

Potential difference: Standard without valid checks may choose insertion/deletion tie left<right, not right>=best? For dynamic parity, condition left < right is standard. If left+1 and right tie? left=0,right=1: left<right true insertion. Deletion candidate x=1, insertion x=1 tie insertion. Same as valid. Good.

Forward standard with history[0] after initial snake: For d=0, standard would use V[1]=0 but our history only x0. For d=1,k=-1 idx0: best=prev[0]=x0 (insertion) same; k=1 idx1: best=prev[0]+1. Good.

Now, if d0 x0 not 0, for d=2,k=0 standard condition left=prev d1 idx0 x0 (k=-1), right=prev d1 idx1 x0+1? If no snakes, left<right true insertion x=right=x0+1. Deletion from left x0+1 tie? right=left+1, standard insertion. Good.

Now, backtracking standard condition with boundary and left<right. If k==-d ins True. If k==d del. Else left<right.

Now, fallback robust in standard: For insertion, x_after = prev[idx_right]. Since standard prev values may be >x or y_prev negative. If x_after > x or y_prev <0 or y_prev >= y: set x_after=x, y_prev=y-1. For deletion, x_prev=prev[idx_left]; if x_prev >= x or x_prev <0 or y_prev > y? y_prev=x_prev-(k-1). If invalid set x_prev=x-1,y_prev=y. Then record snake from x_after to x. If x_after < x but y_start maybe valid. For standard path, y_start = x_after-k within [0,y]. Good.

Need ensure if insertion y_prev >= y but x_after < x? Example history prev_x less but because k? y_prev = prev_x-k-1; current y=x-k. If prev_x < x, y_prev < y. So y_prev>=y implies prev_x>=x; clipped to x gives equal. So condition x_after > x or x_after <0 or y_prev <0 enough. If x_after ==x, y_prev=y-1. Good. If y_prev<0, set x=x,y=y-1.
For deletion, x_prev = prev_x. x_after=x_prev+1. If x_after > x => prev_x >=x; set x_prev=x-1. If y_prev > y? x_prev-(k-1) vs current y=x-k. Since x_prev <= x-1 => y_prev <= x-1-k+1=x-k=y. So no. If x_prev <0 set x-1. If x==0 fallback not deletion due guard.

Now, in standard forward, history values all >=0. No -1. Candidate best never negative? d0 x0>=0; deletion left+1 >=1; insertion right>=0. So curr all nonnegative. Good. Backtrack prev values nonnegative.

Could standard forward store values that correspond to y>m but x<=n. For insertion source later, y_prev may be m (invalid) but standard still uses. Fallback may clip.

Let's test standard on a case with common prefix and suffix where initial x0 not 0. Works.

Now, which final to choose? Standard likely accepted as Myers. Let's switch to standard for speed and simplicity. Need adjust helper forward and backtrack.

Helper standard code:
    history = [array('i', [x])]
    found_d=-1
    for d in range(1, max_d+1):
       prev=history[-1]
       curr=[0]*(d+1)
       for idx in range(d+1):
          if idx ==0:
             best = prev[0]
          elif idx == d:
             best = prev[d-1] + 1
          else:
             left=prev[idx-1]; right=prev[idx]
             if left < right:
                best = right
             else:
                best = left + 1
          y = best - k
          while best < n and y < m and a[best] == b[y]: best++; y++
          curr[idx]=best
          if best >= n and y >= m:
             found_d=d; history.append(array('i',curr)); break
       if found_d != -1: break
       history.append(array('i',curr))

But if y negative? best-k negative. while condition y < m true, a[best] if best<n but b[y] negative index if y<0. Need ensure y>=0 in while. Standard states may have y<0? Earlier argued no for x>=k. But with history values maybe from insertion on positive k could x<k? Let's verify: At d=1, k=1 x=1. At d=2, k=1 idx? d2 k range -2,0,2; no k=1. d3 k=1: candidates from prev k0 and k2; both x at least? d2 k0 maybe 1, k2 maybe 2. If left<right choose right=2, y=1. If choose left+1=2. So x>=k? For k=1, x>=1. Seems. For k positive at d, minimal x is k? Because to have y>=0. Standard V initialized with V[1]=0 can have at d=1 k=1 x=1. Inductively positive diagonals x>=k. Negative diagonals x>=0. So y>=0. Good. For k negative, y positive. Thus while safe. But to be absolutely safe, add `y >= 0 and`? Checking y >=0 each while adds overhead. Could compute if y <0: skip snake by setting? If y<0, best maybe <k; but not. We can include `while best < nn and y >= 0 and y < mm and aa[best] == bb[y]:` safe; small overhead. For 2M, maybe okay. But if y always >=0, no need. However if initial d0 x0 maybe n and k? no. I'll include y >=0 for safety? Performance minor. Or set if y < 0: y = 0? Not correct. Standard safe. Could omit y>=0. But if history from robust? history no fallback. I think omit for speed but risk index negative impossible. Let's be safe and include? 2M while iterations only if snake; condition y>=0 false never, overhead for snake checks. Could be 2M, okay. Inner if not. Let's include y >= 0 in while? The while condition evaluated each snake step; snake steps maybe 20k*100=2M. Extra condition okay. But for no snake, condition evaluated once per state, ~1M. Fine. Use `while best < nn and 0 <= y < mm and aa[best] == bb[y]:`. This also handles y>m skip.

If y negative, while false, curr stores best (invalid maybe), but standard proof okay. Backtrack fallback handles.

Now, final check found if best >= nn and y >= mm. If best >nn and y>mm found. okay.

Backtrack standard robust with fallback. Need source determination standard:
 if k == -d: ins=True
 elif k == d: ins=False
 else:
   idx_right = (k+d)//2
   left = prev[idx_right-1]; right=prev[idx_right]
   ins = left < right
Then guards:
 if ins and y == 0: ins = False
 elif not ins and x == 0: ins = True
But if k boundaries, left/right not. Good.

When insertion:
   idx_right = (k+d)//2
   if idx_right < len(prev): x_after=prev[idx_right] else x_after=x
   if x_after <0 or x_after > x: x_after=x
   y_prev = x_after - k - 1
   if y_prev <0 or y_prev >= y: x_after=x; y_prev=y-1
   # if y_prev <0 after y=0? guard ins if y==0 false, so y>0.
When deletion:
   idx_left = (k+d)//2 - 1
   if idx_left >=0: x_prev=prev[idx_left] else x_prev=x-1
   if x_prev <0 or x_prev >= x: x_prev=x-1
   # if x_prev >=0
   y_prev = x_prev - k + 1
   if y_prev <0 or y_prev > y: y_prev=y
   x_after=x_prev+1

Snake range as before.

For insertion, if x_after=x, y_prev=y-1; if y=0 guard ins false. Good. If x_after<x, y_prev valid? if y_prev >= y due weird, set to current. If x_after<x but y_prev invalid set to x. Good.

Now, after setting x,y, they remain valid. Initial snake: current x,y should be d0 snake x0. But standard history may have overshoot and backtrack fallback could produce x,y not exact d0? We append matches a[0:x]. If x is not history0 x0 but within grid, and previous ops inverse from (x,y) to (0,0) maybe not matching initial snake? But if x not equal d0, initial snake may not be correct. In standard backtrack, after loop, x,y should be V[0][0] for the reconstructed path. If overshoot/fallback maybe not. Could fallback set to x=0? If forced? Let's see fallback source when invalid sets to current boundary, potentially path may not reach d0 x0 exactly but after D steps maybe reach some (x,y). We then append initial snake 0..x-1. Does this ensure total ops transform? We constructed ops backward from end to start. If after loop x,y >0 not necessarily all equal prefix? But we append matches from 0 to x. Are those equal to b? They need be equal. d0 snake history[0][0]=x0 where a[:x0]==b[:x0]. If current x <= x0? Not guaranteed. If current x not valid snake prefix, output may invalid. In correct path, x=x0. Fallback only if history invalid; hopefully unused. Could after loop set x = history[0][0] and y=history[0][0] to be safe? But if current x < x0, previous ops may not account for lines between x and x0. If current x > x0, initial snake too short. Standard correct gives x=x0. For safety, we could use initial_snake_x = history[0][0] and force x=that after loop? But if current path ended elsewhere due fallback, forcing may break. Since fallback should not happen, no worry. To avoid index error, use current x.

Now, with standard history no -1, backtracking fallback may not trigger. Good.

Let's compare valid vs standard on performance. Standard inner: idx boundaries simple; no y_prev check in insertion; snake while with y>=0. It stores all states even invalid beyond grid, but states ~D^2/2 =2M for 1000. valid prunes maybe 1M but checks. Standard likely faster. Use standard.

Now, need ensure history arrays length: curr = [0]*(d+1). If some invalid overshoot values huge (could exceed n+m? Deletion repeatedly can produce x up to n+d maybe; int okay). Backtrack source values maybe huge; fallback x_after=x if >x. For deletion prev_x huge >=x fallback. Good.

Now, potential issue with array('i') storing huge values if n+m=20000, safe. For larger maybe. Use array('i'). If values could exceed 2^31 for huge lists >2e9 impossible memory. okay.

Now, code for forward found condition: if best >= nn and y >= mm: found. If best >nn and y maybe negative? y>=mm false. If y negative but mm=0? m=0 handled. okay.

Now, if best>=nn,y>=mm but best maybe nn+k? found overshoot. D. Good.

Let's test standard on n=0/m handled. If m=0, max_d=n; but helper returns before. Good.

Now, let's see if standard with no validity can fail to find if break on best>=nn,y>=mm at d but y may be huge and best huge, robust fallback. okay.

Maybe add if best > nn: keep best? yes.

Now, backtracking source condition for standard uses left < right. But if values huge, left<right may choose insertion even if invalid. Fallback. Could there be a valid path but condition chooses invalid huge and fallback produces a different valid path of same D? It might still work but not guarantee minimal? It constructs one edit per d, so length D. If D minimal (standard proof), script length D ops, valid, then minimal. Even if fallback changes source, as long as ops valid, minimal length preserved. Snake matches could be invalid if we don't fallback; but if condition chooses invalid source with start_x < x but matches not actually equal? Could that happen? If source history invalid but start_x < x, fallback not triggered if start_x <=x and y_prev valid. We might record matches from x_start to x based on history that wasn't actual. Could be invalid. Need detect? Could check substring equality before recording? Maybe to ensure validity. Since constraints small ops length, we could when recording snake from x_after to x-1, verify that a[xx] == b[xx-k] for all; if not, adjust x_after = x (zero snake) and op at boundary? That ensures op valid but might reduce matches count? It still has d edit ops but fewer matches, taking '=' and '-' may not reproduce a? If we skip matches, the x,y path jumps? Let's think. If we set x_after=x due mismatch, then after op we set x,y to previous point on source diagonal with x=x,y-1 etc. The total number of ops still d, but we did not include matches that were needed to consume lines. The sequence of states skips some lines, final forward ops may not consume all lines? Actually backward path from end to start must move from (n,m) to (0,0) with D edit moves and snakes (matches). If we omit snakes (set start_x=x), the state after removing op moves left/down by one, not enough to reach start after D steps unless initial snake covers rest. It may leave current x,y not decreasing enough, final x after D steps may be > initial, initial snake will append matches from 0 to x. That could consume skipped lines as initial snake if they match prefix. Might still be valid but not aligned. If skipped lines not prefix, invalid. Hard.

But standard correct path won't need this. We can keep as is.

If worried, implement valid DP which ensures history source path matches. It may be more correct for our own recurrence. Hmm.

Which recurrence is easier to prove? Standard Myers with overshoot is proven but backtracking from n,m with history is standard. We can trust. Let's implement standard and not overthink. It is what expected.

But valid DP source validity with final exact maybe also correct. Which one is less likely to produce hidden errors? Standard is widely used. Use standard.

Let's look up standard backtracking with history exactly: It uses x=history[D][final_k]? Actually many implementations use:
x = len(a); y = len(b)
for d in reversed(range(D+1)):
  v = trace[d-1]
  k = x-y
  if k == -d or (k != d and v[k-1] < v[k+1]): ...
This matches. They don't use current history value. So okay.

Let's adapt standard backtracking snake logic from standard: They usually find prev_x,prev_y from prev V; then while x > prev_x and y > prev_y: record match (x-1); then if x > prev_x: delete; else insert. This uses prev_x,prev_y. In our formulas, for insertion prev point (x_after, y_prev), current (x,y); snake while x>x_after and y>prev_y? Since y - prev_y = x - x_after. Equivalent. Our snake records if x_after < x. Then op. Then set x,y to prev point. This is standard. If prev_x > x, while false and prev_y maybe? Then if x>prev_x false -> insert? They might record insertion with b[y-1]. So our fallback similar. If prev_x >x, standard would set x_after=prev_x? They might not. But if prev_x >x, while false, x > prev_x false, else insertion; prev_y=prev_x-(k+1) may be y? If prev_x>x, prev_y>y. Inserting b[prev_y]? Could be out. But standard likely avoids.

Now, let's consider using full array standard with sentinel to exactly follow proof? Dynamic parity okay. Need ensure history snapshots for d include all k range parity. We store current best after snake. Standard trace uses same V array; when backtracking, v=trace[d-1] has values for previous d. Good.

Potential bug with our initial d0: Standard V at d0 after snake is x0. But standard V[1]=0 before d0. For d=1,k=-1 uses V[0]=x0; for k=1 uses V[0]+1. Good. For d=2,k=-2 uses V[-1] from d1; etc. Equivalent.

Now, if initial snake reaches x0=n,y0=m, we return. If not, continue. Standard algorithm would also find at d0 if final. Good.

Now, if lists have common prefix but no other, standard d0 x0>0. Backtracking initial snake at end should append prefix. In standard backtrack, x,y after loop should be x0. Let's test a=['a','b'],b=['a','c','b'] d0 x0=1, D=1? We found insertion. Backtrack insertion at d1: prev x_after=1? Wait history d1 k=-1 value? d1 k=-1 insertion from x0=1, snake b? final x=2,y=3. Backtrack d1 k=-1 insertion prev d0 idx0 x_after=1,y_prev=1, snake current x=2,y=3: range 1..1 =b, op +c, set x=1,y=1. initial snake range 0..0 =a. Good.

Now, if D found at d with k boundary and snake after insertion from initial snake, works.

Now, decide final code with standard. Need adjust helper to not use array('i') maybe list? Standard history values all int, no -1. Use array for memory. But curr list of ints. For D=2000, 2M ints stored as array. Forward prev array access. Good.

Could avoid array and use lists for speed. But memory with standard stores all states 2M ints -> 72MB. Okay. Array slower but safe. For 20k D=50 trivial. For 1000 D=2000, 2M array accesses okay. If array access too slow? Let's estimate: 2M iterations * maybe 3 array reads =6M reads. Python array read maybe 0.1 micro? Actually list read ~50ns? array read ~80-100ns? 6M ~0.6s. okay. array conversion 2M ~ maybe 0.2. Should be under 6.

If hidden 1000 all different 1000, loops d sum k iterations =2M. Python for loops 2M ~0.1s? plus conditions ~0.5. fine.

Now, maybe array('i') multiplication for curr? We use list. Fine.

Let's write final code carefully with comments minimal. User wants code only; comments okay but not necessary. Maybe include docstring? Not needed. Keep concise.

Potential issue: In helper, `curr = [0] * (d + 1)` but if best values could exceed Python int? no.

Potential bug: When found inside inner, we append array('i', curr) but curr list contains values for k before found, and zeros for after (not computed). Backtrack not use history[D]. But if D loop outer break, history length D+1. If later code uses history[D]? Backtrack starts for d=D, prev=history[d-1]. It does not read history[D]. Initial? No. So zeros okay. But if D=0? handled. Good. To be cleaner, append after curr fully computed? But break before full; not needed. Could set a flag and append after inner (full curr maybe partially -? but zeros). Doesn't matter. Could store only history up to D-1? For backtracking we need history[0..D-1]. We don't need history[D]. So when found at d, we could not append curr. But if found_d=d, history length d (up to d-1). Then backtrack D=found_d, for d in D..1 prev history[d-1] valid. So no need append current. Let's avoid appending partial history. Simpler:
for d ...:
  prev=history[-1]
  curr=[...]
  for ...:
    ...
    if best >= n and y >= m:
       found_d=d
       break
  if found_d != -1: break
  history.append(array('i', curr))
# history length = D (not D+1)
Then backtrack for d in range(D,0,-1): prev=history[d-1]? If history length D, indices 0..D-1. For d=D, prev history[D-1] exists. Good. For d=1 prev history[0]. We never need history[D]. This saves one snapshot and avoids partial. Let's do this. Need history initialized with d0; if found_d=1, history length1, prev for d1 history[0]. Good. If not found until d, after each d not found append. So after found at d, history has snapshots 0..d-1. Great.
Forward:
    history = [array('i', [x])]
    found_d = -1
    for d in range(1, max_d+1):
       prev = history[-1]
       curr = [0]*(d+1)
       for idx...:
          ...
          if best >= nn and y >= mm:
              found_d = d
              break
       if found_d != -1:
          break
       history.append(array('i', curr))
    if found_d == -1: fallback
    D = found_d
    # history length D

Backtrack:
for d in range(D,0,-1):
   prev = history[d-1]  # valid since len history = D, index D-1 max.

Need ensure for D=1, history length1. Good.

This saves memory. If found_d=max_d maybe history length max_d, snapshots 0..max_d-1, sum lengths ~max_d^2/2 vs D^2/2; okay. We don't store final d snapshot. Standard backtrack doesn't need.

But is backtracking condition at d using history[d-1]; yes.

Now, in forward if found_d remains -1 after max_d, history length max_d (0..max_d-1). Fallback. Should not.

Now, if found_d=0 handled before loop. If not, found_d>=1.

Backtrack prev arrays length d for d from D down to 1: prev=history[d-1] length d (for d-1). Good.

Now, source idx_right formulas with prev length d. For current d, prev corresponds d-1, length d. idx_right = (k+d)//2 ranges 0..d. If k=d, idx_right=d, out of prev length; boundary handles no insertion. If k=-d idx_right=0 valid. For interior, idx_right 1..d-1 valid. In standard source determination, if not boundary and idx_right might be d? no. But code should handle if idx_right >= d? If k==d handled. Good.
Deletion idx_left=idx_right-1 ranges 0..d-1. If k=-d handled idx_right=0 idx_left=-1; but boundary handles. Interior idx_left>=0. Good.

In insertion source formula if idx_right < len(prev) (d) use prev else x. Boundary k=d ins False. Good. Deletion if idx_left>=0 use prev else x-1. Boundary k=-d ins True. Good.

Now, in forward candidate if idx==0 best=prev[0]; prev length d, index0. if idx==d best=prev[d-1]+1. For d=1, curr length2. Good.

Now, after snake while, found condition best >= nn and y >= mm. If best maybe >nn and y>=mm, found. We don't store final snapshot. Good.

Backtrack snake ranges: For insertion, x_after maybe from history prev. If x_after < x. But if current state at start D does not correspond to history D, source prev may not lead to current snake? But standard proof. Fallback if x_after > x. If x_after <=x but y_prev maybe <0; fallback. If y_prev >? okay.

Let's add a helper function to append snake? Inline loops.

Potential performance of `for xx in range(x - 1, x_after - 1, -1): ops.append(('=', aa[xx]))` inside backtrack; total snake steps in output = LCS length up to 20k. Good.

Now, if output ops length large (40k for 20k completely different? not required). List reverse O(len). okay.

Now, possible issue: We trim common suffix after prefix. Helper standard returns script for middle. If middle one empty, helper direct. For mid_b nonempty and prefix/suffix, output prefix '=' then middle '+' then suffix '='. Taking '=' and '+' gives prefix + mid_b + suffix = b? Since suffix lines from b[m0-sn:m] equal a suffix. mid_b = b[p:m0-sn]. Yes.

Now, let's consider if prefix/suffix trimming changes D for helper and history storage; helper middle could still have D large if differences scattered. okay.

Now, maybe add a small fast path for if mid_a == mid_b after trimming? If middle empty handled; if middle equal but prefix/suffix not cover? Could happen if p stopped at mismatch but suffix trimming removed until middle equal? Example a=['x','a','b','y'], b=['z','a','b','y']; p=0, suffix=1, mid ['x','a','b'] vs ['z','a','b'] not equal. If p stopped due mismatch, mid first mismatch. If suffix trimmed maybe mid first mismatch still. So not.

Now, let's write final code with helper first to avoid forward reference? Python functions defined before use? diff_lines can call _myers_diff if defined earlier. Put helper before.

Potential style: The final answer should be a single python code block. Good.

Let's final code:

```python
from array import array

def _myers_diff(a, b):
    ...

def diff_lines(...):
    ...
```

Need type hints for helper? Could. Use `list[str]` type.

Let's check for syntax errors.

Helper code in detail:

def _myers_diff(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)
    if n == 0:
        return [('+', line) for line in b]
    if m == 0:
        return [('-', line) for line in a]

    x = 0
    y = 0
    while x < n and y < m and a[x] == b[y]:
        x += 1
        y += 1
    if x == n and y == m:
        return [('=', line) for line in a]

    history = [array('i', [x])]
    found_d = -1
    nn = n; mm = m; aa = a; bb = b
    for d in range(1, nn + mm + 1):
        prev = history[-1]
        curr = [0] * (d + 1)
        for idx in range(d + 1):
            k = -d + (idx << 1)
            if idx == 0:
                best = prev[0]
            elif idx == d:
                best = prev[d - 1] + 1
            else:
                left = prev[idx - 1]
                right = prev[idx]
                if left < right:
                    best = right
                else:
                    best = left + 1
            y = best - k
            while best < nn and 0 <= y < mm and aa[best] == bb[y]:
                best += 1
                y += 1
            curr[idx] = best
            if best >= nn and y >= mm:
                found_d = d
                break
        if found_d != -1:
            break
        history.append(array('i', curr))

    if found_d == -1:
        return [('-', line) for line in aa] + [('+', line) for line in bb]

    D = found_d
    ops = []
    x = nn
    y = mm
    for d in range(D, 0, -1):
        k = x - y
        prev = history[d - 1]
        if k == -d:
            ins = True
        elif k == d:
            ins = False
        else:
            idx_right = (k + d) // 2
            left = prev[idx_right - 1]
            right = prev[idx_right]
            ins = left < right
        if ins and y == 0:
            ins = False
        elif (not ins) and x == 0:
            ins = True
        if ins:
            idx_right = (k + d) // 2
            if idx_right < len(prev):
                x_after = prev[idx_right]
            else:
                x_after = x
            if x_after < 0 or x_after > x:
                x_after = x
            y_prev = x_after - k - 1
            if y_prev < 0 or y_prev >= y:
                x_after = x
                y_prev = y - 1
            for xx in range(x - 1, x_after - 1, -1):
                ops.append(('=', aa[xx]))
            ops.append(('+', bb[y_prev]))
            x, y = x_after, y_prev
        else:
            idx_left = (k + d) // 2 - 1
            if idx_left >= 0:
                x_prev = prev[idx_left]
            else:
                x_prev = x - 1
            if x_prev < 0 or x_prev >= x:
                x_prev = x - 1
            y_prev = x_prev - k + 1
            if y_prev < 0 or y_prev > y:
                y_prev = y
            x_after = x_prev + 1
            for xx in range(x - 1, x_after - 1, -1):
                ops.append(('=', aa[xx]))
            ops.append(('-', aa[x_prev]))
            x, y = x_prev, y_prev
    for xx in range(x - 1, -1, -1):
        ops.append(('=', aa[xx]))
    ops.reverse()
    return ops

Check if in backtrack interior `idx_right` might equal len(prev)=d when k not d? For parity, if k<d and k>-d, idx_right=(k+d)//2. Max k=d-2? since parity same as d; for d=4,k=2 => idx_right=3<d=4. min k=-d+2 => idx_right=1. So valid. left/right index okay. For d=1, interior none. Good.

In insertion branch after guard `y_prev = y - 1`, if y==0? guard ins false if y==0. If y_prev still <0 due y=0 impossible. Good.

Deletion branch fallback x_prev=x-1; if x==0 guard not ins? guard `(not ins) and x == 0` sets ins True. So deletion branch x>0, x_prev>=0. Good.

Initial snake after loop: If x=0, range(-1,-1,-1) empty. If x>0 but y maybe not equal x? At d0 diagonal k=0, y should equal x. Could due fallback not? If y not x, appending matches a[0:x] might not correspond to b. In correct, yes. If x=0 okay.

Potential bug in standard forward found condition: best >= nn and y >= mm. Suppose best>nn and y>mm found at d, but history snapshots up to d-1. Backtrack D maybe script length d. Could ops count D? Yes one edit per step plus snakes. If fallback changes maybe. Good.

Now, test with identical via helper: returns before history. Good.

Now, test helper for all different n=1,m=2 using history length D? found_d=3, history snapshots d0,d1,d2. Backtrack d=3 prev history[2], d=2 prev history[1], d=1 prev history[0]. Good.

Let's simulate standard history lengths: history after d0 [d0]. d1 not found append d1. d2 not found append d2. d3 found break. history len3 (0,1,2). D=3. Backtrack d=3 prev index2. good.

Now, if found at d=1, history len1. Backtrack d=1 prev history[0]. Good.

Now, in fallback if found_d=-1 after max_d, history length max_d; return simple. Good.

Potential issue: In forward, if initial x0 maybe >0 and d loop found at d where best overshoots but y>=mm. We break. D. Good.

Now, let's test standard on all diff n=2,m=3. found_d=5. history len5. Backtrack should output 5 edit ops no matches. Does robust source choose valid ops? Let's simulate quickly:
History standard values:
d0 [0]
d1 [0,1]
d2 [0,1,2]
d3: k -3:0, -1:1, 1:2? from d2 left idx? d2 [0,1,2], d3 k=1 idx2 left prev[1]=1,right prev[2]=2 -> ins best2; k3 del from2 x3. [0,1,2,3]
d4: d4 k -4:0, -2:1? from -3 ins x0? Let's compute not needed. final d5 k=-1? D=5. Backtrack should produce -a,-a,+b,+b,+b maybe. Standard source condition may choose some mix but valid. Good.

Now, think if standard with history arrays storing all states can produce values >nn and >mm causing source condition left<right to choose insertion from right huge >x, fallback to current. It may then set x,y to current boundary (x, y-1). This may skip the intended source's x but still move down one y. Repeating may output insertions at end. Could still valid. Example if condition chooses invalid insertion at top? fallback current. Good.

Now, if snake matches from x_after < x but history not exact, could be invalid. Could we detect by checking while from x_after? We can adjust snake loop to only append matches while both match and stop if mismatch? But then state update would not match previous point. Let's design safer snake recording: For a candidate start_x, we want to record matches backward from current x to start_x. If at some point a[xx] != b[xx-k], history candidate wrong. We could then set start_x = xx+1 and not record the mismatch; but then previous point after edit would be (xx+1, xx+1-k) not the history source. The op would be from there; could still be valid? This becomes heuristic. Not needed if standard correct.

Let's trust standard.

Now, check if using array('i') and values >2^31 if lists 100k? Maybe not. Could use `array('l')` signed long, 4 or 8 bytes. To be safe for n+m up to >2e9 impossible due memory. 'i' okay.

Now, let's consider if code can be simplified with no robust guards; but guards okay.

Potential performance: In forward while condition includes `0 <= y < mm` which for y positive checks two comparisons. Could use `y < mm and y >= 0` but Python chain 0 <= y < mm creates two comparisons. Fine. For speed, since y nonnegative, use `while best < nn and y < mm and aa[best] == bb[y]:` and maybe if y<0 skip? I think y nonnegative; remove 0<= for speed. Is there any case y negative? Standard V with initial snake and recurrence might have y negative if best<k. Can that happen for positive k? Let's try n=1,m=10, d=10, k=10? idx=d, best=prev[9]+1. prev k=9 at d9 x? Could be 1? Since n=1, x cannot exceed? Standard no boundary