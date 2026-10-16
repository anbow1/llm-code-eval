Let me think about this carefully. I need to implement a diff algorithm based on Myers' O((N+M)·D) algorithm that produces a shortest edit script.

Myers' algorithm works as follows:
- N = len(a), M = len(b)
- D = edit distance (minimum number of insertions + deletions)
- The algorithm finds the shortest edit path in O((N+M)*D) time

The key data structures:
- We track the "frontier" of paths at each edit distance level d
- For each d, we track the set of (i, j) positions reachable with exactly d edits
- Actually, Myers' algorithm tracks just one path per d-level: for each d, we track the range of i values (or the V array)

Let me recall Myers' algorithm more precisely:

Myers' algorithm (the "linear space" version for finding the edit distance, but we need the actual path):

The standard approach:
1. First, compute the edit distance D using Myers' O((N+M)*D) algorithm
2. Then, backtrack to find the actual edit script

Actually, for the backtracking, we can use a divide-and-conquer approach that repeatedly applies the forward algorithm to find the midpoint of the shortest path.

Let me think about the algorithm:

**Phase 1: Compute edit distance D**

We use the V array approach:
- V[k] represents the maximum value of (i - j) for paths of edit distance d that reach row i, column j where i - j = k
- Actually, V[k] = the maximum i such that there's a path of edit distance d from (0,0) to (i, j) where i - j = k

Wait, let me be more precise. In Myers' formulation:
- V[k] = the furthest row i reachable with edit distance d where i - j = k (so j = i - k)

The algorithm:
```
for d in range(0, D+1):
    for k in range(-d, d+1, 2):
        # extend from V[k-1] (insertion) and V[k+1] (deletion)
        if k == -d or (k != d and V[k-1] < V[k+1]):
            V[k] = V[k+1]  # insertion (j increases)
        else:
            V[k] = V[k-1] + 1  # deletion (i increases)
        # snake: follow diagonal
        while i < N and j < M and a[i] == b[j]:
            i += 1; j += 1
        V[k] = i
```

Wait, I need to be more careful. Let me re-derive.

State: position (i, j) in the grid where a[0..i-1] and b[0..j-1] have been processed.
- Diagonal: (i, j) -> (i+1, j+1) if a[i] == b[j] (free)
- Insertion: (i, j) -> (i, j+1) (cost 1)
- Deletion: (i, j) -> (i+1, j) (cost 1)

Edit distance D is the minimum number of insertions + deletions to transform a into b.

Myers' V array: V[k] = the maximum i such that there exists a path of exactly d edits from (0,0) to (i, i-k).

Wait, actually let me reconsider. The standard formulation:

V[k] = the row index i (0-indexed, meaning we've consumed i characters from a) such that there's a path of edit distance d from (0,0) to (i, i-k). So j = i - k.

Initial: V[0] = 0 (we're at (0,0) with 0 edits)

For each d from 0 to D:
  For k from -d to d step 2:
    if k == -d:  # must come from k+1 (insertion)
      V[k] = V[k+1]
    elif k == d:  # must come from k-1 (deletion)  
      V[k] = V[k-1] + 1
    else:
      if V[k-1] > V[k+1]:  # deletion is better
        V[k] = V[k-1] + 1
      else:  # insertion
        V[k] = V[k+1]
    
    # Snake: advance along diagonal
    while V[k] < N and (V[k] - k) < M and a[V[k]] == b[V[k] - k]:
      V[k] += 1

After processing all d values, D is the first d where V[d] >= N and V[-d] >= ... wait, we need V[d] >= N and the corresponding j = V[d] - d >= M... actually we need V[d] >= N and V[-d] >= M? No...

Actually, we've reached the end when there exists k such that V[k] >= N and V[k] - k >= M. The simplest check: after processing level d, if V[d] >= N and V[-d] >= ... hmm.

Actually, the termination condition: we've reached (N, M) when there exists a path of d edits that reaches row N and column M. Since i - j = k, we need i = N and j = M, so k = N - M. But that's just one specific k.

The simpler check: after processing level d, check if V[k] >= N and V[k] - k >= M for any k in range. Actually, the standard check is: after processing, if V[d] >= N and V[-d] >= ... 

Let me just check: we're done when for some k in [-d, d], V[k] >= N and V[k] - k >= M. Since the snakes extend as far as possible, this will happen at the frontier.

Actually, the standard termination: D is found when after processing level d, V[d] >= N (and since V[d] - d >= M is equivalent to V[d] >= M + d... hmm that's not quite right).

Let me just check both conditions: V[k] >= N and V[k] - k >= M. Since we process k from -d to d, we can check after each level.

For the **backtracking** (finding the actual edit script):

We use a divide-and-conquer approach:
- Given subproblem (a[i0:i1], b[j0:j1]) with known edit distance d, find the midpoint.
- Run the forward Myers' algorithm from (i0, j0) up to d/2 edits.
- Run the backward Myers' algorithm from (i1, j1) up to d/2 edits.
- Find where they meet (a diagonal position reachable by both).
- Recurse on the two halves.

The forward and backward meet at some position (i, j) where:
- Forward: d1 edits to reach (i, j)
- Backward: d2 edits to reach (i, j)
- d1 + d2 = d

The midpoint is at the diagonal k = i - j where the forward V[k] and backward V[k] overlap.

Let me think about the forward algorithm:
- Start from (i0, j0), V_forward[k] = max i reachable with d edits where i - j = k
- After d/2 edits, we have positions

Backward algorithm:
- Start from (i1, j1), working backwards. V_backward[k] = min i reachable with d edits from (i1, j1) going backwards where i - j = k
- Actually, backward from (i1, j1): we go from (i1, j1) towards (i0, j0).
  - "Backward insertion" (undoing an insertion) means j decreases: (i, j) -> (i, j-1)
  - "Backward deletion" (undoing a deletion) means i decreases: (i, j) -> (i-1, j)
  
So in backward: V_back[k] = minimum i such that there's a path of d backward edits from (i1, j1) to (i, i-k).

The meeting point: for diagonal k, forward reaches i_f = V_forward[k] and backward reaches i_b = V_back[k]. They meet if i_f >= i_b (forward has gone past backward's starting point on this diagonal).

Actually, I need to be more careful. Let me think of it differently.

Forward from (i0, j0): after d_f edits, position (i, j) where i - j = k, i = V_f[k]
Backward from (i1, j1): after d_b edits, position (i, j) where i - j = k, i = V_b[k]

They meet on diagonal k when V_f[k] >= V_b[k] (forward has reached at least as far as backward has gone).

The midpoint is at (i, j) = (V_b[k], V_b[k] - k) or (V_f[k], V_f[k] - k) - we pick the meeting point.

Actually, the standard approach:
- d_f = d // 2 (or (d+1)//2)
- d_b = d - d_f
- Run forward for d_f steps, run backward for d_b steps
- Find k where V_f[k] >= V_b[k]
- The meeting point is (i, j) where i = max(V_f[k], V_b[k])... actually we want the exact meeting.

Hmm, let me look at this more carefully.

Actually, I think the standard approach is:
- Forward: V_f[k] = furthest (max i) reachable from start in d_f edits
- Backward: V_b[k] = nearest (min i) reachable from end in d_b edits
- They meet when V_f[k] >= V_b[k] for some k
- The meeting point is at (i, j) = (V_b[k], V_b[k] - k) -- or we can use V_f[k], doesn't matter much as long as we're consistent

Wait, actually I think the meeting point should be where the forward snake ends and the backward snake begins. Let me think again...

The forward path: starts at (i0, j0), makes d_f edits, ends at some position (i_mid, j_mid). The furthest point on each diagonal k is V_f[k].

The backward path: starts at (i1, j1), makes d_b edits, ends at some position (i_mid, j_mid). The nearest point on each diagonal k is V_b[k].

They meet at (i_mid, j_mid) where i_mid - j_mid = k and V_f[k] >= V_b[k]. The actual meeting point is at i = max(V_f[k], V_b[k])... no, I think it's at i = V_b[k] (the backward path's furthest backward reach) or V_f[k].

Actually, I think the correct meeting is: the point (i, j) such that it's reachable by forward in d_f edits AND by backward in d_b edits. Since forward gives the max i and backward gives the min i on each diagonal, the meeting is at i where V_f[k] >= V_b[k], and the point is (V_b[k], V_b[k] - k) or equivalently (V_f[k], V_f[k] - k) -- but these might differ. The actual point should be where the two paths actually intersect, which is on the diagonal k at row max(V_f[k], V_b[k])? No...

I think the correct approach is: the meeting point is at (i, j) where i = V_b[k] and j = V_b[k] - k (or equivalently i = V_f[k], j = V_f[k] - k). Since both are on the same diagonal and V_f[k] >= V_b[k], either works as a valid split point. Let me just use i_mid = V_b[k], j_mid = V_b[k] - k.

Wait, but we need the snake (diagonal run) to be handled correctly. The snake is the free diagonal moves. So the actual meeting might be in the middle of a snake.

Let me reconsider. In Myers' algorithm:
- At each level d, we process all k in [-d, d] step 2
- For each k, we either come from k-1 or k+1 (an edit), then snake forward
- V[k] after the snake is the final position

So V_f[k] is after the snake, and V_b[k] is after the backward snake (which goes "backwards" = decreasing i).

The meeting: V_f[k] >= V_b[k] means the forward path has reached at least as far (in i) as the backward path on diagonal k. The meeting point is at (i, j) = (V_b[k], V_b[k] - k). This is valid because:
- Forward can reach (V_b[k], V_b[k] - k) since V_f[k] >= V_b[k] and the snake covers all intermediate points
- Backward can reach (V_b[k], V_b[k] - k) since V_b[k] is exactly where backward stops on this diagonal

Actually wait, I need to double-check the backward algorithm direction.

Backward from (i1, j1):
- We want to find positions reachable by going "backwards" (towards (i0, j0))
- A backward "deletion" (undoing a deletion from forward) means going from (i, j) to (i-1, j): i decreases
- A backward "insertion" (undoing an insertion from forward) means going from (i, j) to (i, j-1): j decreases
- A backward "snake" (diagonal) means going from (i, j) to (i-1, j-1) if a[i-1] == b[j-1]

So in backward, k = i - j stays the same during a snake, and:
- backward deletion: i decreases by 1, j same, so k decreases by 1
- backward insertion: i same, j decreases by 1, so k increases by 1

V_b[k] = minimum i reachable from (i1, j1) going backward with d edits where i - j = k.

Start: V_b[N - M] = i1 (we start at (i1, j1), k = i1 - j1 = N - M)

Hmm wait, for the subproblem, k_start = i1 - j1.

For backward at level d_b:
- For k in range from k_start - d_b to k_start + d_b, step 2:
  - If k == k_start + d_b: must come from k-1 (backward insertion, j decreased)
    V_b[k] = V_b[k-1]
  - Elif k == k_start - d_b: must come from k+1 (backward deletion, i decreased)
    V_b[k] = V_b[k+1] - 1
  - Else:
    If V_b[k-1] < V_b[k+1] - 1:  # backward insertion gives smaller i
      V_b[k] = V_b[k-1]
    Else:
      V_b[k] = V_b[k+1] - 1
  - Snake backward:
    while i > i0 and j > j0 and a[i-1] == b[j-1]:
      i -= 1; j -= 1
    V_b[k] = i

Wait, I'm getting confused with the indices. Let me re-derive.

Let me use a cleaner formulation. For the subproblem a[i0:i1], b[j0:j1]:
- N_sub = i1 - i0, M_sub = j1 - j0
- Forward starts at relative (0, 0), i.e., absolute (i0, j0)
- Backward starts at relative (N_sub, M_sub), i.e., absolute (i1, j1)

Forward V_f[k]: max relative row (or absolute row i0 + relative_row) reachable with d edits.
Let me just use absolute indices to avoid confusion.

Forward from (i0, j0):
- V_f[k] = max i such that (i, i-k) is reachable from (i0, j0) with d edits
- Initial: V_f[i0 - j0] = i0 (at level 0)
- At level d, for k from (i0-j0)-d to (i0-j0)+d step 2:
  - Determine predecessor:
    - If k == (i0-j0) + d: only from k-1 (insertion)
      V_f[k] = V_f[k-1]
    - Elif k == (i0-j0) - d: only from k+1 (deletion)
      V_f[k] = V_f[k+1] + 1
    - Else:
      if V_f[k-1] >= V_f[k+1] + 1:  # deletion gives larger i
        V_f[k] = V_f[k+1] + 1
      else:  # insertion gives larger i (or tied)
        V_f[k] = V_f[k-1]
  - Snake:
    while V_f[k] < i1 and (V_f[k] - k) < j1 and a[V_f[k]] == b[V_f[k] - k]:
      V_f[k] += 1

Backward from (i1, j1):
- V_b[k] = min i such that (i, i-k) is reachable from (i1, j1) going backward with d edits
- Initial: V_b[i1 - j1] = i1 (at level 0)
- At level d, for k from (i1-j1)-d to (i1-j1)+d step 2:
  - Determine predecessor:
    - If k == (i1-j1) + d: only from k-1 (backward insertion: j decreased, i same)
      V_b[k] = V_b[k-1]
    - Elif k == (i1-j1) - d: only from k+1 (backward deletion: i decreased, j same)
      V_b[k] = V_b[k+1] - 1
    - Else:
      if V_b[k-1] <= V_b[k+1] - 1:  # backward insertion gives smaller i
        V_b[k] = V_b[k-1]
      else:  # backward deletion gives smaller i
        V_b[k] = V_b[k+1] - 1
  - Snake backward:
    while V_b[k] > i0 and (V_b[k] - k) > j0 and a[V_b[k]-1] == b[V_b[k]-1-k]:
      V_b[k] -= 1

Meeting: find k where V_f[k] >= V_b[k]. The meeting point is (i_mid, j_mid) = (V_b[k], V_b[k] - k).

Wait, I should double-check: is the meeting point at V_b[k] or V_f[k]? 

Forward reaches up to V_f[k] on diagonal k. Backward reaches down to V_b[k] on diagonal k. If V_f[k] >= V_b[k], then the point (V_b[k], V_b[k]-k) is reachable by forward (since forward has gone to V_f[k] >= V_b[k] and the snake covers all intermediate points) and is exactly where backward stops. So (V_b[k], V_b[k]-k) is the meeting point. ✓

Now, for the divide-and-conquer:
- d_total is the edit distance for a[i0:i1] vs b[j0:j1]
- d_f = d_total // 2
- d_b = d_total - d_f
- Find meeting point (i_mid, j_mid)
- Recurse on a[i0:i_mid] vs b[j0:j_mid] with edit distance d_f
- Recurse on a[i_mid:i1] vs b[j0+... wait, b[j_mid:j1] with edit distance d_b

Wait, the edit distances for the subproblems: the forward path uses d_f edits to go from (i0, j0) to (i_mid, j_mid). The backward path uses d_b edits to go from (i1, j1) to (i_mid, j_mid). So:
- Subproblem 1: a[i0:i_mid] vs b[j0:j_mid], edit distance d_f
- Subproblem 2: a[i_mid:i1] vs b[j_mid:j1], edit distance d_b

This should work.

Now, the recursion depth is O(D) in the worst case (when D is large), but each level does O((N+M)) work... wait, no. At each level of the divide-and-conquer, we run the forward and backward algorithms on the subproblem. The total work is O(D * (N+M)) in the worst case, which is what Myers' guarantees.

Actually, let me reconsider. At each level of the recursion, we run forward for d_f steps and backward for d_b steps. The total number of steps across all levels is D (since d_f + d_b = d at each level, and the subproblems partition the work). So the total work is O(D * (N+M))... hmm, actually that's not quite right either.

Let me think about it differently. At the top level, we run forward for D/2 steps and backward for D/2 steps. Each step processes O(D) k values, so it's O(D^2) work. Then we recurse into two subproblems each with edit distance D/2. The total work is:
T(D, N, M) = O(D^2) + T(D/2, N/2, M/2) + T(D/2, N/2, M/2)
= O(D^2) + 2 * T(D/2, N/2, M/2)

Hmm, this doesn't look like O((N+M)*D) in general.

Wait, I think I'm overcomplicating this. Let me reconsider.

Actually, the standard analysis: at each recursion level, the forward+backward computation takes O(d * (N_sub + M_sub)) time where d is the edit distance for that subproblem. But actually, it takes O(d^2 + (N_sub + M_sub) * d) time... no.

Let me re-examine. In the forward algorithm at a given level d:
- For each d' from 0 to d, we process k from -d' to d' step 2, which is O(d') values.
- Total k values processed: O(d^2).
- But the snakes can advance O(N) or O(M) total across all k values at a given d' level.
- Actually, the total snake advancement across all d' levels is bounded by N + M.

So the forward algorithm takes O(d^2 + N + M) time. Similarly for backward.

Total across the recursion:
- Level 0: O(D^2 + N + M)
- Level 1 (two subproblems): 2 * O((D/2)^2 + N/2 + M/2) = O(D^2/2 + N + M)
- Level 2: 4 * O((D/4)^2 + N/4 + M/4) = O(D^2/4 + N + M)
- ...
- Level l: 2^l * O((D/2^l)^2 + N/2^l + M/2^l) = O(D^2/2^l + N + M)

Sum over all levels: O(D^2 + D^2 + D^2 + ...) -- this diverges!

Hmm, that can't be right. Let me reconsider.

Actually, I think the key insight is that the snake advancement is what gives the O(N+M) term, and it's not duplicated at each level. Let me think again.

Actually, I recall that the correct complexity of the divide-and-conquer approach is O((N+M)*D). Let me see why.

The forward algorithm at edit distance d for subproblem of size N_sub x M_sub:
- The V array has O(d) entries
- For each of the d levels, we process O(d) k values
- Total: O(d^2) for the V array updates
- Plus O(N_sub + M_sub) for the snakes (total diagonal advancement)

So time per forward call: O(d^2 + N_sub + M_sub)

In the recursion tree:
- The sum of d^2 over all nodes: at level l, there are 2^l nodes each with d = D/2^l, so sum = 2^l * (D/2^l)^2 = D^2/2^l. Total over all levels: D^2 * (1 + 1/2 + 1/4 + ...) = 2*D^2.
- The sum of (N_sub + M_sub) over all nodes: at level l, there are 2^l nodes, each with subproblem size at most N/2^l + M/2^l (the subproblems partition the original). Wait, do they partition? Yes! a[i0:i_mid] and a[i_mid:i1] partition a[i0:i1]. So at level l, the sum of N_sub over all nodes is at most N, and similarly for M_sub. So total over all levels: D * (N + M).

Total: O(D^2 + (N+M)*D).

For the performance requirement: N = M = 20000, D ≈ 50 (50 differences). So (N+M)*D = 40000 * 50 = 2,000,000. D^2 = 2500. That's well within 2 seconds.

For N = M = 1000, completely different: D = 2000 (1000 deletions + 1000 insertions). (N+M)*D = 2000 * 2000 = 4,000,000. D^2 = 4,000,000. Total ≈ 8,000,000 operations. Should be fine in under 6 seconds in Python.

Wait, D = 2000 means 1000 deletions and 1000 insertions. D^2 = 4,000,000. (N+M)*D = 4,000,000. Total ~8 million. In Python, this should be fine.

But wait, in the worst case where N = M = 1000 and completely different, D = N + M = 2000. The recursion depth would be log2(2000) ≈ 11 levels. At each level, the forward+backward takes O(d^2 + N_sub + M_sub).

Actually, I realize the recursion might be deep. Let me think about whether to use recursion or iteration. With D up to 2000, the recursion depth is at most D (in the worst case where d_f = 1 each time). But typically it's log(D). Actually, d_f = d // 2, so the depth is at most log2(D).

Hmm wait, d_f = d // 2 and d_b = d - d_f. If d is odd, d_f = d//2 and d_b = d - d//2 = (d+1)//2. So the larger subproblem has edit distance ceil(d/2). The recursion depth is O(log D).

OK let me now think about the implementation.

Actually, for very different lists (D = N + M = 2000), the recursion tree has D leaves (each leaf is a single edit operation). The total work is O(D^2 + (N+M)*D) = O(4M + 4M) = O(8M) for the 1000x1000 case. That's fine.

Let me now code this up.

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)
    
    if N == 0 and M == 0:
        return []
    
    # Myers' forward algorithm: compute V_f for d edits
    def forward(d: int, i0: int, j0: int, i1: int, j1: int) -> dict:
        """Returns V_f[k] = max i reachable from (i0,j0) in d edits on diagonal k=i-j"""
        # k range: from (i0-j0)-d to (i0-j0)+d
        k_start = i0 - j0
        # We'll use a dict or array. Since k ranges from k_start-d to k_start+d,
        # that's at most 2d+1 values.
        # Use offset indexing: index k - (k_start - d)
        size = 2 * d + 1
        V = [0] * size
        # Initial: at level 0, only k = k_start, V[k_start] = i0
        # But we need to process level by level.
        
        # Actually, let me restructure. We process d levels.
        # At level 0: V[k_start] = i0, snake forward
        # At level d': V[k] for k in [k_start-d', k_start+d'] step 2
        
        # Let me use a different approach: process all d levels, keep V for the last level.
        # V[k] after level d is what we need.
        
        # Actually, we need V at exactly level d (the final level).
        # Let's process levels 0, 1, 2, ..., d and keep V for level d.
        
        # Use offset: V_arr[offset + k] where offset = d (so index 0 corresponds to k = -d)
        # k ranges from -d to d
        offset = d
        V_arr = [0] * (2 * d + 1)
        
        # Level 0: only k = k_start
        # But k_start might not be 0! We need k_start to be in [-d, d].
        # Since d >= 0 and k_start = i0 - j0, we need |k_start| <= d.
        # This is guaranteed because the edit distance d >= |i1-i0 - (j1-j0)| ... hmm, not necessarily.
        
        # Actually, for the subproblem, the edit distance d must be >= |(i1-i0) - (j1-j0)|.
        # And k_start = i0 - j0. The relevant k range at level d is [k_start - d, k_start + d].
        # We only need to track k values in this range.
        
        # Let me use a dict for simplicity (or an array with proper offset).
        # For performance with d up to 2000, an array of size 4001 is fine.
        
        # Let me use offset = k_start - d, so index 0 -> k = k_start - d, index 2d -> k = k_start + d
        off = k_start - d
        V_arr = [0] * (2 * d + 1)
        
        # Level 0:
        V_arr[off + k_start] = i0  # V[k_start] = i0
        # Snake:
        k = k_start
        while V_arr[off + k] < i1 and (V_arr[off + k] - k) < j1 and a[V_arr[off + k]] == b[V_arr[off + k] - k]:
            V_arr[off + k] += 1
        
        for dcur in range(1, d + 1):
            # k ranges from k_start - dcur to k_start + dcur, step 2
            for k in range(k_start - dcur, k_start + dcur + 1, 2):
                idx = off + k
                if k == k_start - dcur:
                    # Must come from k+1 (deletion)
                    V_arr[idx] = V_arr[off + k + 1] + 1
                elif k == k_start + dcur:
                    # Must come from k-1 (insertion)
                    V_arr[idx] = V_arr[off + k - 1]
                else:
                    # Choose the one that gives larger i
                    from_del = V_arr[off + k + 1] + 1
                    from_ins = V_arr[off + k - 1]
                    if from_del >= from_ins:
                        V_arr[idx] = from_del
                    else:
                        V_arr[idx] = from_ins
                # Snake:
                i_val = V_arr[idx]
                j_val = i_val - k
                while i_val < i1 and j_val < j1 and a[i_val] == b[j_val]:
                    i_val += 1
                    j_val += 1
                V_arr[idx] = i_val
        
        return V_arr, off
    
    # Similarly for backward
    def backward(d: int, i0: int, j0: int, i1: int, j1: int) -> tuple:
        """Returns V_b[k] = min i reachable from (i1,j1) going backward in d edits on diagonal k=i-j"""
        k_start = i1 - j1
        off = k_start - d
        V_arr = [0] * (2 * d + 1)
        
        # Level 0:
        V_arr[off + k_start] = i1
        k = k_start
        while V_arr[off + k] > i0 and (V_arr[off + k] - k) > j0 and a[V_arr[off + k] - 1] == b[V_arr[off + k] - 1 - k]:
            V_arr[off + k] -= 1
        
        for dcur in range(1, d + 1):
            for k in range(k_start - dcur, k_start + dcur + 1, 2):
                idx = off + k
                if k == k_start + dcur:
                    # Must come from k-1 (backward insertion: j decreased, i same)
                    V_arr[idx] = V_arr[off + k - 1]
                elif k == k_start - dcur:
                    # Must come from k+1 (backward deletion: i decreased, j same)
                    V_arr[idx] = V_arr[off + k + 1] - 1
                else:
                    from_back_ins = V_arr[off + k - 1]
                    from_back_del = V_arr[off + k + 1] - 1
                    if from_back_ins <= from_back_del:
                        V_arr[idx] = from_back_ins
                    else:
                        V_arr[idx] = from_back_del
                i_val = V_arr[idx]
                j_val = i_val - k
                while i_val > i0 and j_val > j0 and a[i_val - 1] == b[j_val - 1]:
                    i_val -= 1
                    j_val -= 1
                V_arr[idx] = i_val
        
        return V_arr, off
```

Hmm wait, I need to double-check the forward and backward logic.

Forward from (i0, j0) to somewhere:
- An "insertion" in the edit script means we insert a character from b. In the grid, this moves (i, j) -> (i, j+1). So k = i - j decreases by 1.
- A "deletion" means we delete a character from a. In the grid, this moves (i, j) -> (i+1, j). So k = i - j increases by 1.
- A "match" (snake) moves (i, j) -> (i+1, j+1). k unchanged.

So at level d, to compute V[k]:
- If we came from k+1 via a deletion: V[k] = V[k+1] + 1 (i increased by 1, j same)
- If we came from k-1 via an insertion: V[k] = V[k-1] (i same, j increased by 1)

At the boundary k = k_start + d: we can only come from k+1 (deletion) because k+1 would be outside the previous level's range.
Wait, at level d-1, k ranges from k_start-(d-1) to k_start+(d-1). At level d, k ranges from k_start-d to k_start+d.
- k = k_start + d: can only come from k+1 = k_start + d + 1, which is outside level d-1's range. So it must come from... wait.

Hmm, I think I have the boundaries wrong. Let me reconsider.

At level d, k ranges from k_start - d to k_start + d (step 2).
- k = k_start - d: to reach this k, we must have made a "net" of d deletions (each increases k by 1). So we came from k+1 = k_start - d + 1 at level d-1. This is a deletion. V[k] = V[k+1] + 1.
- k = k_start + d: to reach this k, we must have made a "net" of d insertions (each decreases k by 1). So we came from k-1 = k_start + d - 1 at level d-1. This is an insertion. V[k] = V[k-1].

Wait, that doesn't seem right either. Let me think about it in terms of the parity.

At level d, k has the same parity as k_start + d (since we step by 2, starting from k_start). Actually, k ranges from k_start - d to k_start + d in steps of 2. So k ≡ k_start + d (mod 2).

For an interior k (not at the boundary):
- We can come from k+1 (deletion): previous level d-1 had k' = k+1. At level d-1, k' ranges from k_start-(d-1) to k_start+(d-1). So k+1 must be in [k_start-d+1, k_start+d-1], i.e., k in [k_start-d, k_start+d-2]. Since k is at most k_start+d-2 for interior... hmm.
- We can come from k-1 (insertion): previous level d-1 had k' = k-1. k-1 must be in [k_start-d+1, k_start+d-1], i.e., k in [k_start-d+2, k_start+d].

So:
- k = k_start - d: only k+1 is available (k-1 = k_start-d-1 is outside range). Must be deletion.
- k = k_start + d: only k-1 is available (k+1 = k_start+d+1 is outside range). Must be insertion.
- Interior k: both k+1 and k-1 are available.

This matches what I had. Good.

Now for the backward algorithm, from (i1, j1) going backwards:
- A "backward deletion" (undoing a forward deletion): (i, j) -> (i-1, j). k decreases by 1. i decreases by 1.
- A "backward insertion" (undoing a forward insertion): (i, j) -> (i, j-1). k increases by 1. i same.
- A "backward snake": (i, j) -> (i-1, j-1) if a[i-1] == b[j-1]. k same.

V_b[k] = min i reachable from (i1, j1) going backward with d edits on diagonal k.

At level d, k ranges from k_start - d to k_start + d (step 2), where k_start = i1 - j1.

For interior k:
- From k+1 via backward deletion: V_b[k] = V_b[k+1] - 1 (i decreased by 1)
- From k-1 via backward insertion: V_b[k] = V_b[k-1] (i same)

We want the MINIMUM i, so:
- V_b[k] = min(V_b[k+1] - 1, V_b[k-1])

Boundary:
- k = k_start - d: must come from k+1 (backward deletion). V_b[k] = V_b[k+1] - 1.
- k = k_start + d: must come from k-1 (backward insertion). V_b[k] = V_b[k-1].

Then snake backward: while i > i0 and j > j0 and a[i-1] == b[j-1]: i -= 1, j -= 1.

This looks correct.

Now, the meeting: find k where V_f[k] >= V_b[k]. The meeting point is (i_mid, j_mid) = (V_b[k], V_b[k] - k).

Wait, I need to make sure V_b[k] - k = j_mid is valid (>= j0). Since we're doing the backward snake down to j0, V_b[k] - k >= j0. And V_f[k] >= V_b[k] means the forward path has reached at least this far.

Let me also handle the edge case where d = 0: no edits needed, all lines match. The result is all "=" lines.

Now let me think about the overall structure:

```python
def diff_lines(a, b):
    N, M = len(a), len(b)
    
    def compute_edit_distance(i0, j0, i1, j1):
        """Compute edit distance using Myers' O((N+M)*D) algorithm"""
        # ...
    
    def find_script(i0, j0, i1, j1, d):
        """Find the edit script for a[i0:i1] vs b[j0:j1] with edit distance d"""
        if d == 0:
            # All lines match
            return [("=", a[i0+k]) for k in range(i1 - i0)]
        if i1 == i0:
            # No lines from a, all are insertions
            return [("+", b[j0+k]) for k in range(j1 - j0)]
        if j1 == j0:
            # No lines from b, all are deletions
            return [("-", a[i0+k]) for k in range(i1 - i0)]
        
        d_f = d // 2
        d_b = d - d_f
        
        # Forward
        V_f, off_f = forward(d_f, i0, j0, i1, j1)
        # Backward
        V_b, off_b = backward(d_b, i0, j0, i1, j1)
        
        # Find meeting point
        # k range: intersection of forward and backward k ranges
        # Forward: k in [k_start_f - d_f, k_start_f + d_f] step 2
        # Backward: k in [k_start_b - d_b, k_start_b + d_b] step 2
        # k_start_f = i0 - j0, k_start_b = i1 - j1
        
        k_start_f = i0 - j0
        k_start_b = i1 - j1
        
        k_min = max(k_start_f - d_f, k_start_b - d_b)
        k_max = min(k_start_f + d_f, k_start_b + d_b)
        
        # Find k where V_f[k] >= V_b[k]
        # Adjust parity: k must have same parity as k_start_f + d_f (or equivalently k_start_b + d_b)
        # Actually, k must be such that k - k_start_f is even (for forward) AND k - k_start_b is even (for backward)
        # This means k_start_f + d_f ≡ k (mod 2) and k_start_b + d_b ≡ k (mod 2)
        # Since d_f + d_b = d, and k_start_f + k_start_b = i0 - j0 + i1 - j1 = (i1-i0) - (j1-j0) ... 
        # Actually k_start_f ≡ i0 - j0 (mod 2), k_start_b ≡ i1 - j1 (mod 2)
        # k_start_f + d_f ≡ k (mod 2) and k_start_b + d_b ≡ k (mod 2)
        # So k_start_f + d_f ≡ k_start_b + d_b (mod 2)
        # i0 - j0 + d_f ≡ i1 - j1 + d_b (mod 2)
        # (i0 - j0) - (i1 - j1) ≡ d_b - d_f (mod 2)
        # (i0 - i1) + (j1 - j0) ≡ d_b - d_f (mod 2)
        # This should be satisfied if d is the correct edit distance.
        
        # Let's just iterate k from k_min to k_max and check parity
        parity = (k_start_f + d_f) % 2
        for k in range(k_min, k_max + 1):
            if (k - parity) % 2 != 0:
                # Skip if wrong parity... actually let me just check k % 2 == parity % 2
                pass
            # Check if V_f[k] >= V_b[k]
            # Forward index: off_f + k
            # Backward index: off_b + k
            if off_f + k >= 0 and off_f + k < 2*d_f + 1 and off_b + k >= 0 and off_b + k < 2*d_b + 1:
                if V_f[off_f + k] >= V_b[off_b + k]:
                    i_mid = V_b[off_b + k]
                    j_mid = i_mid - k
                    break
        
        # Recurse
        left = find_script(i0, j0, i_mid, j_mid, d_f)
        right = find_script(i_mid, j_mid, i1, j1, d_b)
        return left + right
```

Wait, I realize there might be an issue with the parity. Let me think about it.

At level d_f in forward, k ranges from k_start_f - d_f to k_start_f + d_f, step 2. So k ≡ k_start_f - d_f (mod 2), which is the same as k ≡ k_start_f + d_f (mod 2) (since 2*d_f is even).

Similarly for backward, k ≡ k_start_b + d_b (mod 2).

For the meeting, we need k to satisfy both parities. This is guaranteed to be consistent if d is the correct edit distance (because the parity of the edit distance relates to the parity of (i1-i0) - (j1-j0)).

Let me just iterate over the valid k values (step 2) and check.

Actually, I realize I should iterate k in steps of 2 starting from the right parity. Let me just do:

```python
for k in range(k_min, k_max + 1):
    if (k - (k_start_f + d_f)) % 2 != 0:
        continue
    # check bounds and V_f[k] >= V_b[k]
```

Or simply iterate in steps of 2 from the first valid k.

Let me also think about the edge case where d_f = 0. Then forward just does the snake from (i0, j0). V_f[k_start_f] = i0 after snake. The k range is just [k_start_f, k_start_f].

Similarly d_b = 0.

Let me also handle the case where d = 1. Then d_f = 0, d_b = 1. Forward just snakes from (i0, j0). Backward does one edit from (i1, j1). They should meet.

OK, I think the algorithm is correct. Let me now write the full implementation, being careful about edge cases.

Actually, wait. Let me reconsider the forward and backward algorithms. I was using 0-indexed positions where i is the number of characters consumed from a (so position i means a[i0:i] has been processed, and the next character to process is a[i]). Similarly for j.

So the "snake" from (i, j) checks a[i] == b[j], then moves to (i+1, j+1). The snake stops when i >= i1 or j >= j1 or a[i] != b[j].

In the forward algorithm, V[k] represents the maximum i such that (i, i-k) is reachable. After the edit step (from k+1 or k-1), we get a starting i, then the snake extends i as far as possible.

Let me re-examine:
- Deletion from k+1: we were at (i', j') on diagonal k+1, so i' - j' = k+1. After deletion, we're at (i'+1, j'), so new i = i' + 1, new j = j', new k = (i'+1) - j' = k+1-1 = k. ✓
- Insertion from k-1: we were at (i', j') on diagonal k-1, so i' - j' = k-1. After insertion, we're at (i', j'+1), so new i = i', new j = j'+1, new k = i' - (j'+1) = k-1-1 = k-2. 

Wait, that's not right. If we're on diagonal k-1, then i' - j' = k-1. After insertion (j increases by 1), new k = i' - (j'+1) = (k-1) - 1 = k-2. That's not k!

I think I'm confusing myself. Let me redo this.

The grid: position (i, j) means we've matched a[0:i] against b[0:j] (with some edits). The "diagonal" is d = i - j.

Transitions:
- Match (diagonal): (i, j) -> (i+1, j+1). Diagonal unchanged: (i+1) - (j+1) = i - j. ✓
- Delete (from a): (i, j) -> (i+1, j). Diagonal: (i+1) - j = i - j + 1. Diagonal increases by 1.
- Insert (from b): (i, j) -> (i, j+1). Diagonal: i - (j+1) = i - j - 1. Diagonal decreases by 1.

So if we're at diagonal k and we do a deletion, we go to diagonal k+1. If we do an insertion, we go to diagonal k-1.

Now, V[k] at level d = max i such that (i, i-k) is reachable with d edits.

To compute V[k] at level d:
- Option 1: came from diagonal k-1 at level d-1 via an insertion. At level d-1, diagonal k-1 had position (i', i'-(k-1)). After insertion: (i', i'-(k-1)+1) = (i', i'-k+2). New diagonal: i' - (i'-k+2) = k-2. 

Hmm, that's not k. I'm getting confused.

Let me be very explicit. Let's say at level d-1, on diagonal k-1, the position is (i_prev, j_prev) where i_prev - j_prev = k - 1.

Insertion: (i_prev, j_prev) -> (i_prev, j_prev + 1). New position: (i_prev, j_prev + 1). New diagonal: i_prev - (j_prev + 1) = (k-1) - 1 = k - 2.

That's diagonal k-2, not k! So an insertion from diagonal k-1 leads to diagonal k-2, not k.

I think my confusion is about what "diagonal k" means in the V array. Let me reconsider.

Actually, I think the issue is that in Myers' formulation, the V array is indexed by the diagonal, and the transitions are:
- From diagonal k, a deletion goes to diagonal k+1
- From diagonal k, an insertion goes to diagonal k-1

So to arrive at diagonal k at level d:
- From diagonal k-1 at level d-1 via an insertion (k-1 -> k-1+1 = k). Wait, insertion from k-1: new diagonal = (k-1) - 1 = k-2. That's not k.

I'm clearly making an error. Let me start from scratch.

Position (i, j). Diagonal = i - j.

- Match: (i, j) -> (i+1, j+1). New diagonal = (i+1) - (j+1) = i - j. Same diagonal.
- Delete a[i]: (i, j) -> (i+1, j). New diagonal = (i+1) - j = i - j + 1. Diagonal +1.
- Insert b[j]: (i, j) -> (i, j+1). New diagonal = i - (j+1) = i - j - 1. Diagonal -1.

So:
- From diagonal d, deletion leads to diagonal d+1.
- From diagonal d, insertion leads to diagonal d-1.

To arrive at diagonal d at level L:
- From diagonal d+1 at level L-1 via deletion (d+1 -> d+1-1... no wait. From diagonal d+1, deletion leads to diagonal (d+1)+1 = d+2. That's not d.

Ugh, I keep making the same mistake. Let me be super careful.

From position (i, j) with diagonal d = i - j:
- Delete: go to (i+1, j). New diagonal = (i+1) - j = d + 1.
- Insert: go to (i, j+1). New diagonal = i - (j+1) = d - 1.

So from diagonal d:
- Delete leads to diagonal d+1
- Insert leads to diagonal d-1

To arrive at diagonal d at level L:
- From diagonal d-1 at level L-1 via delete: (d-1) + 1 = d. ✓
- From diagonal d+1 at level L-1 via insert: (d+1) - 1 = d. ✓

OK so:
- V[d] at level L can come from V[d-1] at level L-1 via delete: new i = V[d-1] + 1 (i increased by 1)
- V[d] at level L can come from V[d+1] at level L-1 via insert: new i = V[d+1] (i unchanged)

And V[d] at level L = max(V[d-1] + 1, V[d+1]) (taking the one that gives larger i).

Then snake: while i < N and (i - d) < M and a[i] == b[i - d]: i += 1.

Now for the boundary:
- At level L, diagonal d ranges from d_start - L to d_start + L (step 2), where d_start = i0 - j0.
- d = d_start - L: can only come from d-1 = d_start - L - 1, which is outside the level L-1 range [d_start-(L-1), d_start+(L-1)]. So must come from d+1 = d_start - L + 1 via insert: V[d] = V[d+1].
- d = d_start + L: can only come from d+1 = d_start + L + 1, which is outside. So must come from d-1 = d_start + L - 1 via delete: V[d] = V[d-1] + 1.

This matches what I had before! Good.

Now for the backward algorithm:
Position (i, j), diagonal d = i - j.
Backward from (i1, j1):
- Undo delete (go backwards): (i, j) -> (i-1, j). New diagonal = (i-1) - j = d - 1.
- Undo insert (go backwards): (i, j) -> (i, j-1). New diagonal = i - (j-1) = d + 1.
- Undo match (snake backwards): (i, j) -> (i-1, j-1) if a[i-1] == b[j-1]. New diagonal = d.

V_b[d] at level L = min i such that (i, i-d) is reachable from (i1, j1) going backward with L edits.

To arrive at diagonal d at level L (backward):
- From diagonal d+1 at level L-1 via undo-delete: new i = V_b[d+1] - 1
- From diagonal d-1 at level L-1 via undo-insert: new i = V_b[d-1]

V_b[d] = min(V_b[d+1] - 1, V_b[d-1])

Boundary:
- d = d_start_b + L (d_start_b = i1 - j1): can only come from d-1 = d_start_b + L - 1 via undo-insert: V_b[d] = V_b[d-1].
- d = d_start_b - L: can only come from d+1 = d_start_b - L + 1 via undo-delete: V_b[d] = V_b[d+1] - 1.

Snake backward: while i > i0 and (i - d) > j0 and a[i-1] == b[i-1-d]: i -= 1.

This all checks out. Let me now write the code properly.

One more thing: for the meeting point, I need to find k (diagonal) where V_f[k] >= V_b[k]. The meeting point is at (i, j) = (V_b[k], V_b[k] - k).

But I should verify: is V_b[k] - k >= j0? Since the backward snake goes down to j0, yes.
Is V_b[k] <= i1? Since we start at i1 and only decrease, yes.
Is V_f[k] >= V_b[k]? That's the condition we check.
Is V_f[k] - k >= j0? Since forward starts at j0 and only increases, yes.
Is V_b[k] - k <= j1? Since backward starts at j1 and only decreases, yes.

So the meeting point (V_b[k], V_b[k] - k) is valid for both paths.

Now, one subtlety: the snake in forward extends i to the maximum possible. The snake in backward extends i to the minimum possible. The meeting point at i = V_b[k] means:
- Forward has reached at least i = V_b[k] (since V_f[k] >= V_b[k]), and the snake covers all intermediate positions.
- Backward has reached exactly i = V_b[k].

So the split is valid: the forward path covers a[i0:i_mid] and b[j0:j_mid], and the backward path covers a[i_mid:i1] and b[j_mid:j1].

Great. Let me now write the complete implementation.

Actually, let me reconsider the performance. For N = M = 1000, completely different, D = 2000.

The forward algorithm at d_f = 1000:
- Process 1000 levels, each with up to 2001 k values.
- Total k values: sum of (2*d'+1) for d'=0 to 999 ≈ 1000*1000 = 1,000,000.
- Plus snake overhead: O(N + M) = O(2000) total.

The backward algorithm at d_b = 1000: similar, ~1,000,000.

Total at top level: ~2,000,000.

Then recursion: two subproblems each with d = 1000, N_sub ≈ 500, M_sub ≈ 500.
At next level: 2 * (2 * 500^2) = 1,000,000.
Next: 4 * (2 * 250^2) = 500,000.
...
Total: ~4,000,000.

In Python, 4 million iterations should take maybe 1-2 seconds. Should be fine for the 6-second limit.

For N = M = 20000, D ≈ 50:
- Forward at d_f = 25: 25 levels, up to 51 k values. Total: 25 * 25 ≈ 625 k values. Plus snakes: O(40000).
- Backward at d_b = 25: similar.
- Top level: ~80,000.
- Recursion: very small additional cost.
- Total: well under 2 seconds.

OK, let me code this up now.

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)
    
    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]
    
    # Check if a == b
    if a == b:
        return [("=", line) for line in a]
    
    # Myers' forward algorithm
    def forward(d, i0, j0, i1, j1):
        """Returns (V_arr, offset) where V_arr[off + k] = max i reachable from (i0,j0) in d edits on diagonal k"""
        if d == 0:
            # Just snake from (i0, j0)
            k = i0 - j0
            i = i0
            j = j0
            while i < i1 and j < j1 and a[i] == b[j]:
                i += 1
                j += 1
            return [i], k  # V_arr = [i], offset = k, so V_arr[0] = V[k]
        
        k_start = i0 - j0
        off = k_start - d  # index 0 corresponds to k = k_start - d
        size = 2 * d + 1
        V = [0] * size
        
        # Level 0: only k = k_start
        V[off + k_start] = i0
        # Snake
        i_val = V[off + k_start]
        j_val = i_val - k_start
        while i_val < i1 and j_val < j1 and a[i_val] == b[j_val]:
            i_val += 1
            j_val += 1
        V[off + k_start] = i_val
        
        for dcur in range(1, d + 1):
            k_lo = k_start - dcur
            k_hi = k_start + dcur
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_lo:
                    # Must come from k+1 via insert
                    V[idx] = V[off + k + 1]
                elif k == k_hi:
                    # Must come from k-1 via delete
                    V[idx] = V[off + k - 1] + 1
                else:
                    from_del = V[off + k - 1] + 1  # from k-1 via delete
                    from_ins = V[off + k + 1]       # from k+1 via insert
                    V[idx] = from_del if from_del >= from_ins else from_ins
                # Snake
                i_val = V[idx]
                j_val = i_val - k
                while i_val < i1 and j_val < j1 and a[i_val] == b[j_val]:
                    i_val += 1
                    j_val += 1
                V[idx] = i_val
        
        return V, off
    
    # Myers' backward algorithm
    def backward(d, i0, j0, i1, j1):
        """Returns (V_arr, offset) where V_arr[off + k] = min i reachable from (i1,j1) going backward in d edits on diagonal k"""
        if d == 0:
            k = i1 - j1
            i = i1
            j = j1
            while i > i0 and j > j0 and a[i-1] == b[j-1]:
                i -= 1
                j -= 1
            return [i], k
        
        k_start = i1 - j1
        off = k_start - d
        size = 2 * d + 1
        V = [0] * size
        
        # Level 0: only k = k_start
        V[off + k_start] = i1
        # Snake backward
        i_val = V[off + k_start]
        j_val = i_val - k_start
        while i_val > i0 and j_val > j0 and a[i_val - 1] == b[j_val - 1]:
            i_val -= 1
            j_val -= 1
        V[off + k_start] = i_val
        
        for dcur in range(1, d + 1):
            k_lo = k_start - dcur
            k_hi = k_start + dcur
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_hi:
                    # Must come from k-1 via undo-insert
                    V[idx] = V[off + k - 1]
                elif k == k_lo:
                    # Must come from k+1 via undo-delete
                    V[idx] = V[off + k + 1] - 1
                else:
                    from_undo_del = V[off + k + 1] - 1  # from k+1 via undo-delete
                    from_undo_ins = V[off + k - 1]       # from k-1 via undo-insert
                    V[idx] = from_undo_del if from_undo_del <= from_undo_ins else from_undo_ins
                # Snake backward
                i_val = V[idx]
                j_val = i_val - k
                while i_val > i0 and j_val > j0 and a[i_val - 1] == b[j_val - 1]:
                    i_val -= 1
                    j_val -= 1
                V[idx] = i_val
        
        return V, off
    
    def find_script(i0, j0, i1, j1, d):
        if d == 0:
            # All match
            result = []
            for i in range(i0, i1):
                result.append(("=", a[i]))
            return result
        
        if i1 == i0:
            return [("+", b[j]) for j in range(j0, j1)]
        
        if j1 == j0:
            return [("-", a[i]) for i in range(i0, i1)]
        
        d_f = d // 2
        d_b = d - d_f
        
        V_f, off_f = forward(d_f, i0, j0, i1, j1)
        V_b, off_b = backward(d_b, i0, j0, i1, j1)
        
        k_start_f = i0 - j0
        k_start_b = i1 - j1
        
        # Find meeting diagonal
        k_min = max(k_start_f - d_f, k_start_b - d_b)
        k_max = min(k_start_f + d_f, k_start_b + d_b)
        
        # Adjust k_min to correct parity
        parity = (k_start_f + d_f) % 2
        if (k_min - parity) % 2 != 0:
            k_min += 1
        
        i_mid = j_mid = None
        for k in range(k_min, k_max + 1, 2):
            idx_f = off_f + k
            idx_b = off_b + k
            if 0 <= idx_f < 2 * d_f + 1 and 0 <= idx_b < 2 * d_b + 1:
                if V_f[idx_f] >= V_b[idx_b]:
                    i_mid = V_b[idx_b]
                    j_mid = i_mid - k
                    break
        
        # Safety: if no meeting found (shouldn't happen), fall back
        if i_mid is None:
            # This shouldn't happen, but as a fallback:
            i_mid = i0
            j_mid = j0
        
        left = find_script(i0, j0, i_mid, j_mid, d_f)
        right = find_script(i_mid, j_mid, i1, j1, d_b)
        return left + right
    
    # First compute the edit distance
    # Use Myers' algorithm to find D
    def compute_distance():
        # Myers' O((N+M)*D) distance computation
        # V[k] = max i reachable from (0,0) with d edits, diagonal k
        # k ranges from -d to d
        # We'll use an array indexed by k + offset
        
        max_d = N + M  # upper bound
        # We'll expand V as needed
        
        # Use a dict or a growing array
        # For efficiency, use an array of size 2*max_d+1 with offset max_d
        # But max_d could be up to 40000, so array of size 80001. That's fine.
        
        offset = max_d
        V = [0] * (2 * max_d + 1)
        V[offset] = 0  # At level 0, diagonal 0, i = 0
        
        for d in range(0, max_d + 1):
            # Check if we've reached the end
            # At diagonal k, position is (V[k+offset], V[k+offset] - k)
            # We need i >= N and j >= M, i.e., V[k+offset] >= N and V[k+offset] - k >= M
            # Check k = d: V[d+offset] >= N and V[d+offset] - d >= M
            # Or more generally, any k in [-d, d]
            
            # Actually, let's check after processing level d
            # For efficiency, check k = d first (most likely)
            if d >= 0:
                if V[offset + d] >= N and V[offset + d] - d >= M:
                    return d
            
            # If d == max_d, we've exhausted all possibilities
            if d == max_d:
                break
            
            # Process level d+1
            # k ranges from -(d+1) to d+1, step 2
            # But we only need to process k where k has same parity as d+1
            # k = -(d+1), -(d+1)+2, ..., d+1
            
            for k in range(-(d+1), d+2, 2):
                idx = offset + k
                if k == -(d+1):
                    # Must come from k+1 via insert
                    V[idx] = V[offset + k + 1]
                elif k == d+1:
                    # Must come from k-1 via delete
                    V[idx] = V[offset + k - 1] + 1
                else:
                    from_del = V[offset + k - 1] + 1
                    from_ins = V[offset + k + 1]
                    V[idx] = from_del if from_del >= from_ins else from_ins
                # Snake
                i_val = V[idx]
                j_val = i_val - k
                while i_val < N and j_val < M and a[i_val] == b[j_val]:
                    i_val += 1
                    j_val += 1
                V[idx] = i_val
            
            # Check if we've reached the end at any diagonal
            # The most efficient check: is there a k in [-(d+1), d+1] with V[k+offset] >= N and V[k+offset] - k >= M?
            # Since the snakes extend as far as possible, it's enough to check k = d+1 and k = -(d+1)
            # Actually, k = d+1: V >= N and V - (d+1) >= M => V >= max(N, M+d+1)
            # k = -(d+1): V >= N and V + (d+1) >= M => V >= max(N, M-(d+1))
            # Hmm, this is getting complicated. Let me just check a few key diagonals.
            
            # Actually, the standard check: after processing level d, if V[d] >= N and V[-d] >= ... 
            # No, the standard check is simply: if for the current level, any V[k] >= N and V[k] - k >= M.
            # For efficiency, since V is the max i on each diagonal, and the snakes have extended as far as possible:
            # If V[d+1] >= N, then j = V[d+1] - (d+1). If j >= M, we're done.
            # But it could be that V[k] >= N for some k != d+1.
            # In practice, checking k = d+1 is usually sufficient because the furthest reach is on the extreme diagonals.
            # But to be safe, let's check all k.
            
            # For performance, let's just check k = d+1 and k = -(d+1):
            if V[offset + d + 1] >= N and V[offset + d + 1] - (d+1) >= M:
                return d + 1
            if V[offset - d - 1] >= N and V[offset - d - 1] + (d+1) >= M:
                return d + 1
            
            # Actually, I realize the check should be done before the next iteration. Let me restructure.
    
    # Hmm, this is getting messy. Let me restructure the distance computation.
```

Actually, let me simplify. The standard way to compute the edit distance with Myers:

```
V = {0: 0}  # V[k] = max i on diagonal k
for d in range(0, N + M + 1):
    # Check if done: for any k, V[k] >= N and V[k] - k >= M
    # Simplest: check if V[d] >= N and V[-d] >= M - 2d ... no, that's wrong.
    # Just check V[d] >= N and V[d] - d >= M, OR V[-d] >= N and V[-d] + d >= M
    # Actually, the cleanest: after processing level d, check if we've reached (N, M).
    # (N, M) is on diagonal N - M. So check V[N-M] >= N (which implies V[N-M] - (N-M) >= M iff V[N-M] >= N).
    # Wait, V[N-M] >= N means i >= N. And j = V[N-M] - (N-M). For j >= M, we need V[N-M] >= M + (N-M) = N. So V[N-M] >= N is equivalent to both i >= N and j >= M when k = N-M.
    # But we might reach (N, M) from a different diagonal? No, (N, M) is only on diagonal N - M.
    # So we just need to check V[N-M] >= N.
    
    # Hmm, but V[N-M] might not be set at level d if d < |N - M|.
    # Actually, at level d, k ranges from -d to d. N-M is in [-d, d] only if d >= |N-M|.
    # For d < |N-M|, we can't have reached (N,M) because we need at least |N-M| edits just to get the right diagonal.
    
    # So: if d >= |N-M| and V[N-M] >= N, return d.
```

Wait, that's not right either. V[N-M] >= N at level d means we've reached row N on diagonal N-M. But we need to be at column M too. Column M on diagonal N-M means row N. So V[N-M] >= N is exactly the condition.

But V[N-M] is only defined (non-zero, having been set) at levels d where d >= |N-M|. And at those levels, the snake would have extended V[N-M] to at most N (since we can't go past row N). So V[N-M] = N at the level where we first reach it.

Actually, I realize the snake is bounded by N and M:
while i < N and j < M and a[i] == b[j]: i += 1; j += 1

So V[k] is always <= N and V[k] - k <= M (i.e., V[k] <= M + k).

The condition to have reached (N, M) is V[N-M] == N (and correspondingly V[N-M] - (N-M) == M).

But we only set V[k] for k in [-d, d] at level d. So we can only check V[N-M] when d >= |N-M|.

Let me just check: after processing level d, if d >= |N - M|, check V[N-M] >= N. If yes, return d.

Actually, I realize there's an even simpler check. Since the snake always extends to the maximum possible, if at any point during the snake we reach i = N and j = M, we're done. But for the V array, we just need V[N-M] >= N.

Let me just go with: after processing level d, if d >= abs(N - M) and V[offset + (N-M)] >= N, return d.

Hmm, but actually I think the standard check is different. Let me look at this from the perspective of the frontier.

After processing level d, the frontier is the set of positions (V[k], V[k]-k) for k in [-d, d]. We've reached (N, M) if (N, M) is on this frontier, i.e., N - M is in [-d, d] and V[N-M] >= N (which means the snake has reached row N, and since j = V[N-M] - (N-M), j >= M).

Actually, V[N-M] >= N implies V[N-M] = N (since the snake can't go past N). And V[N-M] - (N-M) = N - (N-M) = M. So j = M. ✓

So the check is: d >= |N - M| and V[N-M] == N.

But in practice, I think it's easier to just check after each level whether any position on the frontier satisfies i >= N and j >= M. Since the snake extends to the max, checking V[k] >= N and V[k] - k >= M for the extreme k values should suffice.

Actually, for simplicity and correctness, let me just check V[N-M] >= N when d >= |N-M|.

Let me restructure the distance computation:

```python
def compute_distance():
    if a == b:
        return 0
    D = N + M  # upper bound
    offset = D
    V = [0] * (2 * D + 1)
    V[offset] = 0
    
    for d in range(0, D):
        # Check if done
        if d >= abs(N - M):
            if V[offset + (N - M)] >= N:
                return d
        # Process level d+1
        d_next = d + 1
        for k in range(-d_next, d_next + 1, 2):
            idx = offset + k
            if k == -d_next:
                V[idx] = V[offset + k + 1]
            elif k == d_next:
                V[idx] = V[offset + k - 1] + 1
            else:
                from_del = V[offset + k - 1] + 1
                from_ins = V[offset + k + 1]
                V[idx] = from_del if from_del >= from_ins else from_ins
            i_val = V[idx]
            j_val = i_val - k
            while i_val < N and j_val < M and a[i_val] == b[j_val]:
                i_val += 1
                j_val += 1
            V[idx] = i_val
    
    return D  # Should not reach here
```

Wait, I think there's an issue. At level 0, V[0] = 0, and we snake from (0,0). If a[0] == b[0], we advance. But the snake is part of level 0, not level 1. Let me re-examine.

In the standard Myers formulation:
- Level 0: V[0] = 0, then snake. (No edits, just diagonal moves.)
- Level d: for each k in [-d, d] step 2, compute V[k] from level d-1, then snake.

So the snake is part of each level. At level 0, we start at (0,0) and snake as far as possible. At level d, we do one edit (deletion or insertion) and then snake.

So my code should be:
- Initialize V[0] = 0, snake from (0,0).
- For d = 1, 2, ..., D:
  - For k in [-d, d] step 2:
    - Compute V[k] from V[k-1] or V[k+1] (the edit step)
    - Snake from (V[k], V[k]-k)
  - Check if done.

Let me redo:

```python
def compute_distance():
    # Level 0
    offset = N + M
    V = [0] * (2 * (N + M) + 1)
    V[offset] = 0
    # Snake
    i, j = 0, 0
    while i < N and j < M and a[i] == b[j]:
        i += 1
        j += 1
    V[offset] = i
    # Check if done (all matched)
    if i >= N and j >= M:
        return 0
    
    for d in range(1, N + M + 1):
        # Process level d
        for k in range(-d, d + 1, 2):
            idx = offset + k
            if k == -d:
                V[idx] = V[offset + k + 1]
            elif k == d:
                V[idx] = V[offset + k - 1] + 1
            else:
                from_del = V[offset + k - 1] + 1
                from_ins = V[offset + k + 1]
                V[idx] = from_del if from_del >= from_ins else from_ins
            i_val = V[idx]
            j_val = i_val - k
            while i_val < N and j_val < M and a[i_val] == b[j_val]:
                i_val += 1
                j_val += 1
            V[idx] = i_val
        
        # Check if done
        if d >= abs(N - M) and V[offset + (N - M)] >= N:
            return d
    
    return N + M
```

Hmm wait, I think there's still an issue. At level d, k ranges from -d to d in steps of 2. But k must have the same parity as d. -d and d have the same parity as d. ✓

But when k = -d, we use V[offset + k + 1] = V[offset + (-d+1)]. Is (-d+1) in the range of level d-1? Level d-1 has k from -(d-1) to d-1. So -d+1 = -(d-1), which is the left boundary of level d-1. ✓

When k = d, we use V[offset + k - 1] = V[offset + (d-1)], which is the right boundary of level d-1. ✓

OK this looks correct.

Now, one more thought: the array V has size 2*(N+M)+1, which for N=M=20000 is 80001. That's fine memory-wise.

But actually, for the distance computation, we only need k in [-d, d], so we could use a smaller array. But for simplicity, let's use the full array.

Actually, for N=M=1000, N+M=2000, array size 4001. Fine.
For N=M=20000, N+M=40000, array size 80001. Fine.

Now let me put it all together. Let me also think about recursion depth. The recursion in find_script has depth at most log2(D) in the balanced case, or up to D in the worst case (when d_f = 1 each time). For D = 2000, worst case recursion depth is 2000. Python's default recursion limit is 1000, so I might need to increase it or use an iterative approach.

Actually, d_f = d // 2. If d = 1, d_f = 0, d_b = 1. So we recurse into (0, 1). The depth-0 case is handled directly. So the recursion only goes one level deeper when d_f > 0.

If d = 2, d_f = 1, d_b = 1. We recurse into two subproblems each with d = 1. Each of those has d_f = 0, d_b = 1, so they terminate.

If d = 3, d_f = 1, d_b = 2. Recurse into (1, 2). The d=2 case recurses into (1, 1). The d=1 case terminates.

So the maximum recursion depth is about log2(D) for balanced splits, but could be up to D/2 in the worst case (when d_b is always 1 larger than d_f). Actually, d_f = d//2 and d_b = d - d//2 = ceil(d/2). So the larger subproblem has edit distance ceil(d/2). The recursion depth is at most O(log D) since we always halve (roughly).

Wait: d_f = d//2, d_b = d - d//2 = (d+1)//2 for odd d, or d/2 for even d.
So the max of d_f, d_b = ceil(d/2).
After one level: ceil(d/2). After two: ceil(ceil(d/2)/2) ≈ d/4. After l levels: d/2^l.
Depth: O(log D). For D = 2000, depth ≈ 11. Well within Python's recursion limit.

But wait, we have TWO recursive calls (left and right), so the total number of recursive calls is O(D) (each leaf is a single edit or a snake). But the depth is O(log D). So recursion limit is fine.

Let me now write the final code. I'll be careful about the edge cases.

Actually, I realize I should double-check the meeting point logic. Let me trace through a simple example.

a = ["A", "B", "C"], b = ["A", "C"]
N = 3, M = 2.
Edit distance: delete "B" -> D = 1.

find_script(0, 0, 3, 2, 1):
d_f = 0, d_b = 1.

Forward(d=0, i0=0, j0=0, i1=3, j1=2):
k = 0 - 0 = 0. V = [0], off = 0.
Snake: i=0, j=0. a[0]="A"==b[0]="A" -> i=1, j=1. a[1]="B"!=b[1]="C" -> stop.
V[0] = 1.
Return ([1], 0).

Backward(d=1, i0=0, j0=0, i1=3, j1=2):
k_start = 3 - 2 = 1. off = 1 - 1 = 0. size = 3. V = [0, 0, 0].
Level 0: V[0+1] = V[1] = 3.
Snake backward: i=3, j=2. a[2]="C"==b[1]="C" -> i=2, j=1. a[1]="B"!=b[0]="A" -> stop.
V[1] = 2.

Level 1: k from 1-1=0 to 1+1=2, step 2: k = 0, 2.
k=0: k == k_lo = 0. V[0+0] = V[0+1] - 1 = V[1] - 1 = 2 - 1 = 1.
  Snake backward: i=1, j=1-0=1. a[0]="A"==b[0]="A" -> i=0, j=0. Stop (i==i0).
  V[0] = 0.
k=2: k == k_hi = 2. V[0+2] = V[0+1] = V[1] = 2.
  Snake backward: i=2, j=2-2=0. j==j0, stop.
  V[2] = 2.

So V_b = [0, 2, 2], off_b = 0.

Meeting:
k_start_f = 0, k_start_b = 1.
k_min = max(0-0, 1-1) = max(0, 0) = 0.
k_max = min(0+0, 1+1) = min(0, 2) = 0.
parity = (0+0) % 2 = 0. k_min = 0, (0-0)%2 = 0. OK.

k=0: idx_f = 0+0 = 0. idx_b = 0+0 = 0.
V_f[0] = 1. V_b[0] = 0. 1 >= 0. ✓
i_mid = V_b[0] = 0. j_mid = 0 - 0 = 0.

Hmm, that gives i_mid = 0, j_mid = 0. That means the forward part is a[0:0] vs b[0:0] (empty) and the backward part is a[0:3] vs b[0:2] with d_b = 1.

find_script(0, 0, 0, 0, 0) = [] (empty).
find_script(0, 0, 3, 2, 1):
d_f = 0, d_b = 1.
Forward(0, 0, 0, 3, 2): k=0, V=[0], off=0. Snake: i=0,j=0, a[0]=="A"==b[0] -> i=1,j=1. a[1]=="B"!=b[1]=="C" -> stop. V[0]=1. Return ([1], 0).
Backward(1, 0, 0, 3, 2): Same as before. V_b = [0, 2, 2], off_b = 0.

Meeting: k_min = 0, k_max = 0. k=0: V_f[0]=1 >= V_b[0]=0. i_mid=0, j_mid=0.

This is an infinite recursion! The problem is that the meeting point is (0,0), which is the starting point, and we're trying to split a[0:3] vs b[0:2] with d=1 into a[0:0] vs b[0:0] (d=0) and a[0:3] vs b[0:2] (d=1). The second is the same as the original!

I see the issue. The meeting point should be at i_mid = V_b[k] = 0, but the forward path reaches i=1 on diagonal 0. The actual meeting should be at i=1 (where the forward snake ends), not i=0 (where the backward path's minimum is).

Wait, I think the issue is that the backward path at diagonal 0 reaches i=0 (it snaked back from i=1 to i=0). But the forward path at diagonal 0 reaches i=1. The meeting point should be at i=1, not i=0.

The problem: V_b[0] = 0 means the backward path can reach (0, 0) on diagonal 0. But the forward path reaches (1, 1) on diagonal 0. The meeting is at (1, 1), not (0, 0).

I think the correct meeting point is at i = V_f[k] (the forward path's maximum), not V_b[k] (the backward path's minimum). Because the forward path has "covered" up to i = V_f[k], and the backward path has "covered" down to i = V_b[k]. The meeting is where they overlap, which is at i = V_f[k] (the forward has reached there, and the backward can also reach there since V_b[k] <= V_f[k]).

Wait, but the backward path going from (i1, j1) to (i, j) means the subproblem a[i:i1] vs b[j:j1] has edit distance d_b. If i = V_f[k] = 1, j = 1, then the subproblem is a[1:3] vs b[1:2] with d_b = 1. That's ["B","C"] vs ["C"], which indeed has edit distance 1 (delete "B"). ✓

And the forward subproblem is a[0:1] vs b[0:1] with d_f = 0, which is ["A"] vs ["A"], edit distance 0. ✓

So the correct meeting point is at i = V_f[k], j = V_f[k] - k, NOT at i = V_b[k].

Let me re-examine why. The forward path from (i0, j0) to (i_f, j_f) uses d_f edits. The backward path from (i1, j1) to (i_b, j_b) uses d_b edits. We need i_f = i_b and j_f = j_b for them to meet.

On diagonal k, forward reaches i_f = V_f[k] (maximum), backward reaches i_b = V_b[k] (minimum). For them to meet, we need i_f >= i_b (forward has gone at least as far as backward has come). The meeting point can be anywhere from i_b to i_f on diagonal k. But we want the meeting point to be such that:
- The forward subproblem a[i0:i_mid] vs b[j0:j_mid] has edit distance d_f.
- The backward subproblem a[i_mid:i1] vs b[j_mid:j1] has edit distance d_b.

If we set i_mid = V_f[k], j_mid = V_f[k] - k:
- Forward: a[i0:i_mid] vs b[j0:j_mid] with d_f edits. The forward path reaches (i_mid, j_mid) with d_f edits. ✓
- Backward: a[i_mid:i1] vs b[j_mid:j1] with d_b edits. The backward path starts at (i1, j1) and reaches (i_mid, j_mid) with d_b edits. But does it? The backward path reaches (V_b[k], V_b[k]-k) with d_b edits. Since V_b[k] <= V_f[k] = i_mid, the backward path has gone past i_mid (it went down to V_b[k] which is <= i_mid). But can it stop at i_mid? The backward snake goes from some point down to V_b[k]. All intermediate points on the diagonal are reachable (by stopping the snake early). So yes, (i_mid, j_mid) is reachable by the backward path with d_b edits (just stop the snake at i_mid instead of going all the way to V_b[k]).

Wait, but that's only if the snake passes through i_mid. The backward snake goes from (i_start, j_start) down to (V_b[k], V_b[k]-k). It passes through all intermediate (i, j) on the diagonal. So if V_b[k] <= i_mid <= i_start, then (i_mid, j_mid) is on the snake and is reachable.

But i_mid = V_f[k], and we need V_f[k] <= i_start (the starting i of the backward path on diagonal k). The backward path on diagonal k starts from some position after the edit step, then snakes down. The starting i is V_b_before_snake[k], which is >= V_b[k]. And V_f[k] could be larger than V_b_before_snake[k]?

Hmm, I think in practice, since V_f[k] >= V_b[k] and the backward snake covers all intermediate points, setting i_mid = V_f[k] should work as long as V_f[k] is within the range covered by the backward path.

Actually, I think the correct and safe choice is i_mid = V_f[k] (or equivalently V_b[k], since both are on the diagonal and the snake covers intermediate points). Let me use V_f[k] to be safe.

Wait, actually, I realize there might be a subtlety. The forward path's snake on diagonal k goes from some starting point to V_f[k]. The backward path's snake on diagonal k goes from some starting point down to V_b[k]. The "edit step" for the forward path on diagonal k brings us to a starting point, then the snake extends to V_f[k]. Similarly for backward.

The meeting point (i_mid, j_mid) must be such that:
1. (i_mid, j_mid) is reachable by forward in d_f edits: i_mid <= V_f[k] and i_mid >= (forward starting point on diagonal k).
2. (i_mid, j_mid) is reachable by backward in d_b edits: i_mid >= V_b[k] and i_mid <= (backward starting point on diagonal k).

Since V_f[k] >= V_b[k], and both starting points are between V_b[k] and V_f[k] (on the same diagonal), setting i_mid = V_f[k] satisfies condition 1 (i_mid is the endpoint of the forward snake). For condition 2, we need i_mid <= backward starting point. The backward starting point is the i value before the backward snake, which is >= V_b[k]. Is it >= V_f[k]?

Hmm, not necessarily. Let me think of a case where it might fail.

Actually, I think the standard approach in the literature is to use i_mid = V_f[k] (or the equivalent). Let me just go with that and trust the algorithm.

Actually, re-reading the Myers divide-and-conquer paper (from "Linear Space Diff" by Myers 1986, or the "An O(ND) Difference Algorithm" paper), the meeting point is where the forward and backward frontiers first touch. The standard approach is:

- Forward: V_f[k] = max i on diagonal k after d_f edits.
- Backward: V_b[k] = min i on diagonal k after d_b edits.
- Find k where V_f[k] >= V_b[k].
- Meeting point: (i_mid, j_mid) = (V_f[k], V_f[k] - k). (Or (V_b[k], V_b[k] - k), either works.)

I'll use V_f[k] for the meeting point.

Let me re-trace my example:
V_f[0] = 1, V_b[0] = 0. V_f[0] >= V_b[0]. i_mid = V_f[0] = 1, j_mid = 1 - 0 = 1.
Forward subproblem: a[0:1] vs b[0:1] = ["A"] vs ["A"], d_f = 0. ✓
Backward subproblem: a[1:3] vs b[1:2] = ["B","C"] vs ["C"], d_b = 1. ✓

Then find_script(1, 1, 3, 2, 1):
d_f = 0, d_b = 1.
Forward(0, 1, 1, 3, 2): k = 1-1 = 0. V=[1], off=0. Snake: i=1, j=1. a[1]="B"!=b[1]="C". V[0]=1. Return ([1], 0).
Backward(1, 1, 1, 3, 2): k_start = 3-2 = 1. off = 1-1 = 0. size=3. V=[0,0,0].
Level 0: V[1] = 3. Snake backward: i=3, j=2. a[2]="C"==b[1]="C" -> i=2, j=1. a[1]="B"!=b[0]="B"... wait, b[j_val-1] = b[0] = "A". a[i_val-1] = a[1] = "B". "B" != "A". Stop. V[1] = 2.
Level 1: k from 0 to 2, step 2: k=0, 2.
k=0: k==k_lo=0. V[0] = V[1] - 1 = 2-1 = 1. Snake backward: i=1, j=1-0=1. i==i0=1. Stop. V[0]=1.
k=2: k==k_hi=2. V[2] = V[1] = 2. Snake backward: i=2, j=2-2=0. j==j0=1? No, j=0, j0=1. j < j0. Stop. V[2]=2.

V_b = [1, 2, 2], off_b = 0.

Meeting: k_start_f = 1-1 = 0, k_start_b = 3-2 = 1.
k_min = max(0-0, 1-1) = max(0, 0) = 0.
k_max = min(0+0, 1+1) = min(0, 2) = 0.
k=0: V_f[0] = 1, V_b[0] = 1. 1 >= 1. ✓
i_mid = V_f[0] = 1, j_mid = 1 - 0 = 1.

Forward subproblem: a[1:1] vs b[1:1] = [] vs [], d_f = 0. Returns [].
Backward subproblem: a[1:3] vs b[1:2] = ["B","C"] vs ["C"], d_b = 1.

Hmm, that's the same as before! We're stuck in a loop.

The issue is that the meeting point is (1, 1), which is the same as the starting point of the subproblem. So the forward part is empty, and the backward part is the same subproblem.

I see the problem. When d_f = 0, the forward "path" is just the snake from (i0, j0). The snake from (1, 1) doesn't advance (a[1] != b[1]), so V_f[0] = 1. The backward path from (3, 2) with 1 edit reaches (1, 1) (after the edit and snake). So they meet at (1, 1), which is the start of the subproblem.

The fix: when d_f = 0, the forward subproblem should be a[i0:i0] vs b[j0:j0] (empty), and the backward subproblem should be the entire a[i0:i1] vs b[j0:j1] with d_b = d. But that's what we're getting, and it leads to infinite recursion because d_b = d.

The real issue: when d_f = 0 and the snake doesn't advance, the meeting point is at the start, and we can't make progress.

I think the fix is: when d_f = 0, we should not use the divide-and-conquer. Instead, we should directly determine the edit script.

Actually, I think the correct approach is: when d_f = 0, the forward path is just the snake. If the snake advances to (i_mid, j_mid) > (i0, j0), then the forward subproblem is a[i0:i_mid] vs b[j0:j_mid] with d=0, and the backward subproblem is a[i_mid:i1] vs b[j_mid:j1] with d_b = d. If the snake doesn't advance (i_mid = i0, j_mid = j0), then we have a problem.

But wait, if d_f = 0 and the snake doesn't advance, it means a[i0] != b[j0]. But d_b = d >= 1, so there's at least one edit. The backward path should find a meeting point further along.

Hmm, but in my example, the backward path's meeting is also at (1, 1) = (i0, j0). That means the backward path with 1 edit from (3, 2) reaches (1, 1). Let's verify:
- From (3, 2), diagonal 1.
- Level 1: k=0 (from k=1 via undo-delete: i=3-1=2, j=2, diagonal 0). Snake backward from (2,1): a[1]="B" != b[0]="A". Stop. i=2.
  OR k=2 (from k=1 via undo-insert: i=3, j=2-1=1, diagonal 2). Snake backward from (3,1): a[2]="C" != b[0]="A". Stop. i=3.
  
Wait, I think I made an error in the backward computation. Let me redo.

Backward(1, 1, 1, 3, 2):
i0=1, j0=1, i1=3, j1=2.
k_start = i1 - j1 = 3 - 2 = 1.
off = k_start - d = 1 - 1 = 0. size = 3.

Level 0: V[off + k_start] = V[0+1] = V[1] = i1 = 3.
Snake backward: i_val = 3, j_val = 3 - 1 = 2.
Check: i_val > i0 (3 > 1) and j_val > j0 (2 > 1) and a[i_val-1] == b[j_val-1]: a[2]="C", b[1]="C". Yes. i_val=2, j_val=1.
Check: i_val > i0 (2 > 1) and j_val > j0 (1 > 1). 1 > 1 is False. Stop.
V[1] = 2.

Level 1: k from k_start - 1 = 0 to k_start + 1 = 2, step 2: k = 0, 2.
k = 0: k == k_lo = 0. Must come from k+1 = 1 via undo-delete.
  V[0+0] = V[0+1] - 1 = V[1] - 1 = 2 - 1 = 1.
  Snake backward: i_val = 1, j_val = 1 - 0 = 1. i_val > i0? 1 > 1? No. Stop.
  V[0] = 1.
k = 2: k == k_hi = 2. Must come from k-1 = 1 via undo-insert.
  V[0+2] = V[0+1] = V[1] = 2.
  Snake backward: i_val = 2, j_val = 2 - 2 = 0. i_val > i0? 2 > 1. j_val > j0? 0 > 1? No. Stop.
  V[2] = 2.

V_b = [1, 2, 2], off_b = 0.

Now, forward(0, 1, 1, 3, 2):
i0=1, j0=1, i1=3, j1=2.
k = i0 - j0 = 0. V = [1], off = 0.
Snake: i=1, j=1. a[1]="B", b[1]="C". Not equal. Stop.
V[0] = 1. Return ([1], 0).

Meeting: k_start_f = 0, k_start_b = 1.
k_min = max(0-0, 1-1) = 0.
k_max = min(0+0, 1+1) = 0.
k=0: V_f[0]=1, V_b[0]=1. 1 >= 1. i_mid = V_f[0] = 1, j_mid = 1.

So we get i_mid = 1, j_mid = 1, which is the same as (i0, j0). This means:
- Left: a[1:1] vs b[1:1] with d_f = 0. Empty.
- Right: a[1:3] vs b[1:2] with d_b = 1. Same as original!

Infinite recursion! The problem is that d_f = 0 and the snake doesn't advance, so the meeting is at the start.

I think the solution is: when d_f = 0, we should handle it specially. The forward path is just the snake. If the snake advances to (i_s, j_s), then:
- If (i_s, j_s) > (i0, j0): split at (i_s, j_s). Left is snake (d=0), right is d_b = d.
- If (i_s, j_s) == (i0, j0): the snake doesn't advance. This means a[i0] != b[j0]. We need to do an edit. The edit is either a deletion of a[i0] or an insertion of b[j0]. We can determine which by looking at the rest of the strings.

Actually, I think the correct approach is to not use d_f = 0 as a special case in the divide-and-conquer, but rather to ensure that d_f >= 1 when we do the split. If d = 1, we handle it directly (it's a single edit).

Let me handle d = 1 directly:
- If a[i0] != b[j0]:
  - If a[i0+1:] == b[j0:]: it's a deletion. (Check if removing a[i0] makes them match.)
  - If a[i0:] == b[j0+1:]: it's an insertion.
  - Otherwise... well, with d=1, exactly one of these must be true (since the edit distance is 1).

Actually, for d = 1:
- If a[i0] == b[j0]: then the edit is somewhere later. But d=1 and a[i0]==b[j0] means the rest a[i0+1:i1] vs b[j0+1:j1] has edit distance 1. We can recurse.
  But wait, if a[i0] == b[j0], then we can match them and the remaining has edit distance 1. So the result is ("=", a[i0]) + find_script(i0+1, j0+1, i1, j1, 1).
  
Hmm, but that's not efficient. Let me think differently.

For d = 1:
- Try matching: while i0 < i1 and j0 < j1 and a[i0] == b[j0]: i0++, j0++.
- Now either i0 == i1 (all of a matched, remaining b is an insertion) or j0 == j1 (all of b matched, remaining a is a deletion) or a[i0] != b[j0].
- If i0 == i1: result is [matches] + [("+", b[j]) for j in range(j0, j1)].
- If j0 == j1: result is [matches] + [("-", a[i]) for i in range(i0, i1)].
- If a[i0] != b[j0]: one of a[i0] or b[j0] is the edit. Check:
  - If a[i0+1:i1] == b[j0:j1]: deletion of a[i0].
  - If a[i0:i1] == b[j0+1:j1]: insertion of b[j0].
  - (One of these must be true for d=1.)

This is O(N+M) for d=1, which is fine.

Actually, let me just handle the general case properly. The issue is that when d_f = 0, the forward path is just a snake, and if the snake doesn't advance, the meeting is at the start.

I think the correct fix is: when d_f = 0, the forward "subproblem" is just the snake. We should set i_mid = V_f[k] (the end of the snake) and j_mid = V_f[k] - k. The forward subproblem is a[i0:i_mid] vs b[j0:j_mid] with d=0 (all matches). The backward subproblem is a[i_mid:i1] vs b[j_mid:j1] with d_b = d.

The issue in my example: the snake from (1,1) doesn't advance (a[1] != b[1]), so i_mid = 1, j_mid = 1. The forward subproblem is empty. The backward subproblem is the same as the original. This leads to infinite recursion.

But wait, this shouldn't happen if d is the correct edit distance. Let me re-examine.

The edit distance of a[1:3] = ["B","C"] vs b[1:2] = ["C"] is 1. d_f = 0, d_b = 1.

The forward path with 0 edits from (1,1): snake. a[1]="B" != b[1]="C". Doesn't advance. V_f[0] = 1.
The backward path with 1 edit from (3,2): as computed, V_b[0] = 1.

They meet at (1,1). But this is the starting point! The forward subproblem is a[1:1] vs b[1:1] (empty, d=0), and the backward subproblem is a[1:3] vs b[1:2] (d=1). Same as original. Infinite recursion.

The fundamental issue: when d_f = 0, the forward path is just a snake, and it might not advance. In that case, the "meeting" is at the start, and we can't split.

I think the solution is: when d_f = 0, we should NOT use divide-and-conquer. Instead, we should directly compute the script.

For d_f = 0: the forward path is a snake from (i0, j0) to (i_s, j_s) where a[i0:i_s] == b[j0:j_s] and (i_s == i1 or j_s == j1 or a[i_s] != b[j_s]). The remaining a[i_s:i1] vs b[j_s:j1] has edit distance d_b = d.

So the result is:
[("=", a[i]) for i in range(i0, i_s)] + find_script(i_s, j_s, i1, j1, d_b)

But this is just a recursive call with the same d (d_b = d), just with smaller subproblem (i_s > i0 or j_s > j0). If i_s = i0 and j_s = j0 (snake doesn't advance), we're stuck.

When the snake doesn't advance (a[i0] != b[j0]), and d_f = 0, d_b = d:
- The edit must be at position (i0, j0): either delete a[i0] or insert b[j0].
- We can determine which: check if a[i0+1:i1] == b[j0:j1] (deletion) or a[i0:i1] == b[j0+1:j1] (insertion).

So for d_f = 0:
```
# Snake from (i0, j0)
i_s, j_s = i0, j0
while i_s < i1 and j_s < j1 and a[i_s] == b[j_s]:
    i_s += 1
    j_s += 1

if i_s > i0 or j_s > j0:
    # Snake advanced, split here
    left = [("=", a[i]) for i in range(i0, i_s)]
    right = find_script(i_s, j_s, i1, j1, d_b)
    return left + right
else:
    # Snake didn't advance, a[i0] != b[j0]
    # The edit is at (i0, j0)
    if i0 + 1 <= i1 and j0 <= j1 and a[i0+1:i1] == b[j0:j1]:
        # Deletion of a[i0]
        return [("-", a[i0])] + find_script(i0+1, j0, i1, j1, d_b - 1)
    elif i0 <= i1 and j0 + 1 <= j1 and a[i0:i1] == b[j0+1:j1]:
        # Insertion of b[j0]
        return [("+", b[j0])] + find_script(i0, j0+1, i1, j1, d_b - 1)
    else:
        # Shouldn't happen, but fallback
        ...
```

Wait, but a[i0+1:i1] == b[j0:j1] is an O(N) comparison. In the worst case, this is done O(D) times (once per recursion level), giving O(D*N) total, which could be slow.

Hmm, but actually, in the case where the snake doesn't advance, we're at the "edit" position. There's exactly one edit here. After handling it, the remaining subproblem has edit distance d_b - 1, and the snake will advance (since the remaining strings have edit distance d_b - 1 < d, and the next characters match... actually, not necessarily).

Wait, I think I'm overcomplicating this. Let me reconsider.

The standard Myers divide-and-conquer should work. Let me look at why it fails in my example and see if there's a fix.

The issue: d_f = 0, and the forward path is just a snake that doesn't advance. The meeting is at the start.

I think the correct fix is: when d_f = 0, don't use divide-and-conquer. Instead, handle it as a base case:
- The script for a[i0:i1] vs b[j0:j1] with edit distance d (where d = d_b) starts with a snake, then one edit, then the rest.
- Actually, this is the same as the general case with d_f = 0.

Let me try a different approach: instead of d_f = d//2, use d_f = max(1, d//2) when d > 1. And when d = 1, handle it directly.

Actually, I think the simplest fix is:
- If d <= 1: handle directly (O(N+M)).
- If d >= 2: d_f = d//2 (which is >= 1), d_b = d - d_f.

When d_f >= 1, the forward path involves at least one edit, so it will advance beyond the snake. The meeting point should be strictly beyond the start.

Let me verify: with d_f >= 1, the forward path makes at least one edit (deletion or insertion) and then snakes. The position after the edit is different from (i0, j0) (either i increased or j increased). So the forward path reaches a position that's not (i0, j0). Similarly for backward. The meeting should be at a position strictly between (i0, j0) and (i1, j1).

Actually, I'm not 100% sure the meeting is strictly interior. Let me think of a case: a = ["X", "Y"], b = ["Y"], D = 1. d_f = 0, d_b = 1. This is the d=1 case, handled directly.

a = ["X", "Y", "Z"], b = ["Y", "Z"], D = 1. d_f = 0, d_b = 1. Handled directly.

a = ["X", "Y", "Z", "W"], b = ["Y", "W"], D = 2. d_f = 1, d_b = 1.
Forward(1, 0, 0, 4, 2):
k_start = 0. off = -1. size = 3. V = [0, 0, 0].
Level 0: V[0+0] = V[0] = 0. Snake: i=0, j=0. a[0]="X" != b[0]="Y". V[0] = 0.
Level 1: k from -1 to 1, step 2: k = -1, 1.
k=-1: k == k_lo = -1. V[0+(-1)] = V[0] = V[0+0] = 0. (insert from k+1=0)
  Snake: i=0, j=0-(-1)=1. a[0]="X" != b[1]="W". V[-1] = 0.
k=1: k == k_hi = 1. V[0+1] = V[0+0] + 1 = 0 + 1 = 1. (delete from k-1=0)
  Snake: i=1, j=1-1=0. a[1]="Y" == b[0]="Y". i=2, j=1. a[2]="Z" == b[1]="W"? No. V[1] = 2.
V_f = [0, 0, 2], off_f = -1. So V_f[-1] = 0, V_f[0] = 0, V_f[1] = 2.

Backward(1, 0, 0, 4, 2):
k_start = 4-2 = 2. off = 2-1 = 1. size = 3. V = [0, 0, 0].
Level 0: V[1+2] = V[3]... wait, size is 3, indices 0,1,2. off + k_start = 1 + 2 = 3. That's out of bounds!

I see the issue. The V array size is 2*d+1 = 3, but k_start = 2, so off + k_start = 1 + 2 = 3 >= 3. Out of bounds!

The problem: k_start = i1 - j1 = 4 - 2 = 2, and d = 1. k ranges from k_start - d to k_start + d = 1 to 3. But the array is indexed from off + (k_start - d) to off + (k_start + d) = 1 + 1 to 1 + 3 = 2 to 4. Size should be 2*d+1 = 3, but we need indices 2, 3, 4. That's 3 values but the max index is 4, which requires size 5.

I see the bug. The offset should be k_start - d, and the array should have indices from 0 to 2d. The k values range from k_start - d to k_start + d. The index for k is (k - (k_start - d)) = k - k_start + d. So k = k_start - d gives index 0, k = k_start + d gives index 2d.

For k_start = 2, d = 1: k ranges from 1 to 3. Index for k=1: 1 - 2 + 1 = 0. Index for k=3: 3 - 2 + 1 = 2. Array size 3. ✓

So off should NOT be k_start - d in the sense of adding to k. Instead, the index is k - k_start + d. Let me re-derive.

Let me define: idx(k) = k - k_start + d. Then idx(k_start - d) = 0, idx(k_start + d) = 2d.

So V[idx(k)] = V[k - k_start + d].

In my code, I was using `off + k` where `off = k_start - d`. So `off + k = k_start - d + k`. For k = k_start - d: k_start - d + k_start - d = 2*k_start - 2*d. That's wrong!

I see the bug. The offset should be such that `off + k` gives the correct array index. We want:
- off + (k_start - d) = 0 => off = d - k_start
- off + (k_start + d) = 2d => off = 2d - k_start - d = d - k_start. ✓

So off = d - k_start, NOT k_start - d. Let me fix this.

With off = d - k_start:
- k = k_start - d: off + k = d - k_start + k_start - d = 0. ✓
- k = k_start + d: off + k = d - k_start + k_start + d = 2d. ✓

Let me redo my example:
Backward(1, 0, 0, 4, 2):
k_start = 2. off = 1 - 2 = -1. size = 3.
Level 0: V[off + k_start] = V[-1 + 2] = V[1] = i1 = 4.
Snake backward: i=4, j=4-2=2. i>i0(4>0) and j>j0(2>0) and a[3]="W"==b[1]="W". i=3, j=1. a[2]="Z"!=b[0]="Y". Stop. V[1] = 3.
Level 1: k from 2-1=1 to 2+1=3, step 2: k=1, 3.
k=1: k==k_lo=1. V[off+1] = V[-1+1] = V[0] = V[off+2] - 1 = V[1] - 1 = 3 - 1 = 2.
  Snake backward: i=2, j=2-1=1. i>i0(2>0) and j>j0(1>0) and a[1]="Y"==b[0]="Y". i=1, j=0. j>j0? 0>0? No. Stop. V[0] = 1.
k=3: k==k_hi=3. V[off+3] = V[-1+3] = V[2] = V[off+2] = V[1] = 3.
  Snake backward: i=3, j=3-3=0. j>j0? 0>0? No. Stop. V[2] = 3.
V_b = [1, 3, 3], off_b = -1.

Forward(1, 0, 0, 4, 2):
k_start = 0. off = 1 - 0 = 1. size = 3.
Level 0: V[1+0] = V[1] = 0. Snake: i=0, j=0. a[0]="X"!=b[0]="Y". V[1] = 0.
Level 1: k from -1 to 1, step 2: k=-1, 1.
k=-1: k==k_lo=-1. V[1+(-1)] = V[0] = V[1+0] = V[1] = 0. (insert from k+1=0)
  Snake: i=0, j=0-(-1)=1. a[0]="X"!=b[1]="W". V[0] = 0.
k=1: k==k_hi=1. V[1+1] = V[2] = V[1+0] + 1 = V[1] + 1 = 0 + 1 = 1. (delete from k-1=0)
  Snake: i=1, j=1-1=0. a[1]="Y"==b[0]="Y". i=2, j=1. a[2]="Z"!=b[1]="W". V[2] = 2.
V_f = [0, 0, 2], off_f = 1.

Meeting:
k_start_f = 0, k_start_b = 2.
k_min = max(0-1, 2-1) = max(-1, 1) = 1.
k_max = min(0+1, 2+1) = min(1, 3) = 1.
parity = (0+1) % 2 = 1. k_min = 1, (1-1)%2 = 0. OK.
k=1: idx_f = off_f + 1 = 1 + 1 = 2. idx_b = off_b + 1 = -1 + 1 = 0.
V_f[2] = 2. V_b[0] = 1. 2 >= 1. ✓
i_mid = V_f[2] = 2. j_mid = 2 - 1 = 1.

Forward subproblem: a[0:2] vs b[0:1] = ["X","Y"] vs ["Y"], d_f = 1.
Backward subproblem: a[2:4] vs b[1:2] = ["Z","W"] vs ["W"], d_b = 1.

This makes sense! The meeting is at (2, 1).

Now for a[0:2] vs b[0:1] with d=1:
d_f = 0, d_b = 1. This is the d=1 case.
We need to handle d=1 directly.
Snake from (0,0): a[0]="X" != b[0]="Y". Doesn't advance.
So the edit is at (0,0). Check: a[1:2] == b[0:1]? ["Y"] == ["Y"]. Yes! Deletion of a[0]="X".
Result: [("-", "X"), ("=", "Y")].

For a[2:4] vs b[1:2] with d=1:
Snake from (2,1): a[2]="Z" != b[1]="W". Doesn't advance.
Check: a[3:4] == b[1:2]? ["W"] == ["W"]. Yes! Deletion of a[2]="Z".
Result: [("-", "Z"), ("=", "W")].

Total: [("-", "X"), ("=", "Y"),("-", "Z"), ("=", "W")].
Check: a = ["X","Y","Z","W"], taking "-" and "=": ["X","Y","Z","W"]. ✓
b = ["Y","W"], taking "=" and "+": ["Y","W"]. ✓
Number of "=": 2. LCS of ["X","Y","Z","W"] and ["Y","W"] is ["Y","W"], length 2. ✓

Great, the algorithm works when d_f >= 1.

So the fix is: handle d = 0 and d = 1 as base cases, and for d >= 2, use d_f = d//2 >= 1.

For d = 1:
- Snake from (i0, j0) as far as possible to (i_s, j_s).
- Now a[i_s:i1] vs b[j_s:j1] has edit distance 1, and a[i_s] != b[j_s] (or one of them is exhausted).
- If i_s == i1: remaining b is all insertions. Result: snake + [("+", b[j]) for j in range(j_s, j1)].
- If j_s == j1: remaining a is all deletions. Result: snake + [("-", a[i]) for i in range(i_s, i1)].
- If a[i_s] != b[j_s]:
  - If a[i_s+1:i1] == b[j_s:j1]: deletion of a[i_s]. Result: snake + [("-", a[i_s])] + [matches...].
    Actually, after the deletion, a[i_s+1:i1] == b[j_s:j1], so all remaining are matches.
    Result: snake + [("-", a[i_s])] + [("=", a[i]) for i in range(i_s+1, i1)].
  - If a[i_s:i1] == b[j_s+1:j1]: insertion of b[j_s]. Similarly.

For d = 0: all matches. Result: [("=", a[i]) for i in range(i0, i1)].

This should work. Let me now write the complete code.

Actually, I realize the d=1 handling with slice comparisons a[i_s+1:i1] == b[j_s:j1] is O(N) in the worst case. But it's done at most once per d=1 subproblem, and there are at most D such subproblems. So total O(D*N) in the worst case. For D=2000, N=1000, that's 2,000,000. Fine.

But actually, I can avoid the slice comparison by just checking: after the snake, if a[i_s] != b[j_s], then:
- If i_s + 1 < i1 and a[i_s+1:i1] == b[j_s:j1]: deletion.
  To check this without creating slices: iterate from i_s+1 and j_s, comparing a and b. If they all match, it's a deletion.
- Otherwise: insertion (must be, since d=1).

This is still O(N) per d=1 case, but avoids creating slice objects.

Actually, for the d=1 case, I can just do:
```
# After snake, at (i_s, j_s), a[i_s] != b[j_s] (or one is exhausted)
if i_s < i1 and j_s < j1:
    # Check deletion: a[i_s+1] == b[j_s], and the rest matches
    # Since d=1, either delete a[i_s] or insert b[j_s]
    # Try deletion: check if a[i_s+1:i1] == b[j_s:j1]
    i2, j2 = i_s + 1, j_s
    match = True
    while i2 < i1 and j2 < j1:
        if a[i2] != b[j2]:
            match = False
            break
        i2 += 1; j2 += 1
    if i2 == i1 and j2 == j1:
        # Deletion
        return snake_result + [("-", a[i_s])] + [("=", a[i]) for i in range(i_s+1, i1)]
    else:
        # Insertion
        return snake_result + [("+", b[j_s])] + [("=", a[i]) for i in range(i_s, i1)]
```

Hmm, this is getting complex. Let me just use the slice comparison for simplicity, since it's O(N) and only done O(D) times.

Actually, Python slice comparison `a[i:j] == b[k:l]` creates new lists, which is O(N) time and space. For N=1000, D=2000, total O(D*N) = 2M elements. Fine.

But wait, for the performance test with N=M=20000, D=50, the d=1 cases would have N_sub up to 20000. D=50, so 50 * 20000 = 1M. Fine.

OK let me just write the code now. I'll use the slice comparison for simplicity.

Let me also think about whether I need to handle the case where d_f = 0 in the divide-and-conquer. If d >= 2, then d_f = d//2 >= 1, so d_f is never 0. Good.

Wait, d = 2: d_f = 1, d_b = 1. ✓
d = 3: d_f = 1, d_b = 2. ✓
d = 4: d_f = 2, d_b = 2. ✓

So for d >= 2, d_f >= 1. Good.

Now let me write the final code:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)
    
    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", s) for s in b]
    if M == 0:
        return [("-", s) for s in a]
    
    # Compute edit distance using Myers' algorithm
    def myers_distance():
        if a == b:
            return 0
        max_d = N + M
        offset = max_d
        V = [0] * (2 * max_d + 1)
        V[offset] = 0
        # Snake at level 0
        i, j = 0, 0
        while i < N and j < M and a[i] == b[j]:
            i += 1
            j += 1
        V[offset] = i
        if i >= N and j >= M:
            return 0
        
        for d in range(1, max_d + 1):
            for k in range(-d, d + 1, 2):
                idx = offset + k
                if k == -d:
                    V[idx] = V[offset + k + 1]
                elif k == d:
                    V[idx] = V[offset + k - 1] + 1
                else:
                    from_del = V[offset + k - 1] + 1
                    from_ins = V[offset + k + 1]
                    V[idx] = from_del if from_del >= from_ins else from_ins
                i_val = V[idx]
                j_val = i_val - k
                while i_val < N and j_val < M and a[i_val] == b[j_val]:
                    i_val += 1
                    j_val += 1
                V[idx] = i_val
            
            if d >= abs(N - M) and V[offset + (N - M)] >= N:
                return d
        
        return max_d
    
    D = myers_distance()
    
    if D == 0:
        return [("=", s) for s in a]
    
    # Forward algorithm for subproblem
    def forward(d, i0, j0, i1, j1):
        k_start = i0 - j0
        off = d - k_start
        size = 2 * d + 1
        V = [0] * size
        
        # Level 0
        V[off + k_start] = i0
        i_val = i0
        j_val = j0
        while i_val < i1 and j_val < j1 and a[i_val] == b[j_val]:
            i_val += 1
            j_val += 1
        V[off + k_start] = i_val
        
        for dcur in range(1, d + 1):
            k_lo = k_start - dcur
            k_hi = k_start + dcur
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_lo:
                    V[idx] = V[off + k + 1]
                elif k == k_hi:
                    V[idx] = V[off + k - 1] + 1
                else:
                    from_del = V[off + k - 1] + 1
                    from_ins = V[off + k + 1]
                    V[idx] = from_del if from_del >= from_ins else from_ins
                i_val = V[idx]
                j_val = i_val - k
                while i_val < i1 and j_val < j1 and a[i_val] == b[j_val]:
                    i_val += 1
                    j_val += 1
                V[idx] = i_val
        
        return V, off
    
    # Backward algorithm for subproblem
    def backward(d, i0, j0, i1, j1):
        k_start = i1 - j1
        off = d - k_start
        size = 2 * d + 1
        V = [0] * size
        
        # Level 0
        V[off + k_start] = i1
        i_val = i1
        j_val = j1
        while i_val > i0 and j_val > j0 and a[i_val - 1] == b[j_val - 1]:
            i_val -= 1
            j_val -= 1
        V[off + k_start] = i_val
        
        for dcur in range(1, d + 1):
            k_lo = k_start - dcur
            k_hi = k_start + dcur
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_hi:
                    V[idx] = V[off + k - 1]
                elif k == k_lo:
                    V[idx] = V[off + k + 1] - 1
                else:
                    from_undo_del = V[off + k + 1] - 1
                    from_undo_ins = V[off + k - 1]
                    V[idx] = from_undo_del if from_undo_del <= from_undo_ins else from_undo_ins
                i_val = V[idx]
                j_val = i_val - k
                while i_val > i0 and j_val > j0 and a[i_val - 1] == b[j_val - 1]:
                    i_val -= 1
                    j_val -= 1
                V[idx] = i_val
        
        return V, off
    
    def find_script(i0, j0, i1, j1, d):
        if d == 0:
            return [("=", a[i]) for i in range(i0, i1)]
        
        if i1 == i0:
            return [("+", b[j]) for j in range(j0, j1)]
        
        if j1 == j0:
            return [("-", a[i]) for i in range(i0, i1)]
        
        if d == 1:
            # Snake
            i_s, j_s = i0, j0
            snake = []
            while i_s < i1 and j_s < j1 and a[i_s] == b[j_s]:
                snake.append(("=", a[i_s]))
                i_s += 1
                j_s += 1
            
            if i_s == i1:
                snake += [("+", b[j]) for j in range(j_s, j1)]
                return snake
            if j_s == j1:
                snake += [("-", a[i]) for i in range(i_s, i1)]
                return snake
            
            # a[i_s] != b[j_s], need one edit
            # Check if deleting a[i_s] makes the rest match
            if a[i_s+1:i1] == b[j_s:j1]:
                snake.append(("-", a[i_s]))
                snake += [("=", a[i]) for i in range(i_s+1, i1)]
                return snake
            else:
                # Must be insertion of b[j_s]
                snake.append(("+", b[j_s]))
                snake += [("=", a[i]) for i in range(i_s, i1)]
                return snake
        
        # d >= 2
        d_f = d // 2
        d_b = d - d_f
        
        V_f, off_f = forward(d_f, i0, j0, i1, j1)
        V_b, off_b = backward(d_b, i0, j0, i1, j1)
        
        k_start_f = i0 - j0
        k_start_b = i1 - j1
        
        k_min = max(k_start_f - d_f, k_start_b - d_b)
        k_max = min(k_start_f + d_f, k_start_b + d_b)
        
        # Adjust k_min to correct parity
        parity = (k_start_f + d_f) % 2
        if k_min % 2 != parity:
            k_min += 1
        
        i_mid = j_mid = None
        for k in range(k_min, k_max + 1, 2):
            idx_f = off_f + k
            idx_b = off_b + k
            if 0 <= idx_f < 2 * d_f + 1 and 0 <= idx_b < 2 * d_b + 1:
                if V_f[idx_f] >= V_b[idx_b]:
                    i_mid = V_f[idx_f]
                    j_mid = i_mid - k
                    break
        
        if i_mid is None:
            # Fallback (shouldn't happen)
            i_mid = i0
            j_mid = j0
        
        left = find_script(i0, j0, i_mid, j_mid, d_f)
        right = find_script(i_mid, j_mid, i1, j1, d_b)
        return left + right
    
    return find_script(0, 0, N, M, D)
```

Wait, I need to double-check the parity adjustment. k ranges from k_min to k_max in steps of 2. The valid k values have parity (k_start_f + d_f) % 2 (same as (k_start_f - d_f) % 2 since 2*d_f is even).

If k_min % 2 != parity, increment k_min by 1 to get the right parity.

Let me trace through the example a=["X","Y","Z","W"], b=["Y","W"], D=2:
d_f = 1, d_b = 1.
k_start_f = 0 - 0 = 0. k_start_b = 4 - 2 = 2.
k_min = max(0-1, 2-1) = max(-1, 1) = 1.
k_max = min(0+1, 2+1) = min(1, 3) = 1.
parity = (0+1) % 2 = 1. k_min = 1, 1 % 2 = 1. OK.
k=1: idx_f = off_f + 1. off_f = d_f - k_start_f = 1 - 0 = 1. idx_f = 2.
       idx_b = off_b + 1. off_b = d_b - k_start_b = 1 - 2 = -1. idx_b = 0.
       V_f[2] = 2, V_b[0] = 1. 2 >= 1. i_mid = 2, j_mid = 1. ✓

Good.

Now, let me also verify the forward and backward V array indices are correct.

Forward(d, i0, j0, i1, j1):
- k_start = i0 - j0
- off = d - k_start
- k ranges from k_start - d to k_start + d
- idx = off + k = d - k_start + k
- When k = k_start - d: idx = d - k_start + k_start - d = 0. ✓
- When k = k_start + d: idx = d - k_start + k_start + d = 2d. ✓
- Array size = 2d + 1. ✓

Backward(d, i0, j0, i1, j1):
- k_start = i1 - j1
- off = d - k_start
- Same indexing. ✓

In the meeting search:
- idx_f = off_f + k = d_f - k_start_f + k
- idx_b = off_b + k = d_b - k_start_b + k

These should be in [0, 2*d_f] and [0, 2*d_b] respectively, which is guaranteed by the k_min and k_max bounds.

Actually, let me verify: k_min >= k_start_f - d_f, so off_f + k_min >= d_f - k_start_f + k_start_f - d_f = 0. ✓
k_max <= k_start_f + d_f, so off_f + k_max <= d_f - k_start_f + k_start_f + d_f = 2*d_f. ✓
Similarly for backward. ✓

So the bounds check `0 <= idx_f < 2*d_f + 1` is always true given the k_min/k_max bounds. I can remove it, but it's safer to keep.

Now, one more concern: the recursion in `find_script`. For d >= 2, we make two recursive calls: left (d_f) and right (d_b). The total number of calls is bounded by 2^depth where depth = O(log D). But the total work is O(D^2 + (N+M)*D) as analyzed.

For the d=1 base case, the slice comparison `a[i_s+1:i1] == b[j_s:j1]` is O(N_sub). This is fine.

Let me also consider: what if the two lists are very long but identical? Then D=0, and we just return all "=" lines. O(N). ✓

What if they're very long with a few differences? D is small, the distance computation is O((N+M)*D), and the divide-and-conquer is also O((N+M)*D). ✓

I think the code is correct. Let me also add a small optimization: in the d=1 case, instead of creating slices, I can compare character by character. But for simplicity and since N is at most 20000, slices are fine.

Actually, wait. For the performance test with N=M=20000, D=50, the d=1 subproblems could have N_sub up to 20000. The slice comparison creates lists of up to 20000 elements. There are at most 50 such subproblems (one per d=1 leaf). Total: 50 * 20000 = 1,000,000 elements. Fine.

For N=M=1000, D=2000, the d=1 subproblems have N_sub up to 1000. There are 2000 such subproblems. Total: 2000 * 1000 = 2,000,000. Fine.

Let me finalize the code. I'll also make sure to handle the edge case where the meeting point search fails (shouldn't happen, but as a safety net).

One more thing: I should verify that the output satisfies the invariants:
1. Taking "=" and "-" items in order gives exactly a.
2. Taking "=" and "+" items in order gives exactly b.
3. Number of "=" items = LCS length.

By construction:
- Each line of a appears exactly once in the script (as "=" or "-").
- Each line of b appears exactly once in the script (as "=" or "+").
- The order is preserved.
- The number of edits (insertions + deletions) = D = N + M - 2*LCS, so the number of "=" = 2*LCS - N - M + N + M... wait.
  N = (# "=") + (# "-")
  M = (# "=") + (# "+")
  D = (# "-") + (# "+") = N - (# "=") + M - (# "=") = N + M - 2*(# "=")
  So (# "=") = (N + M - D) / 2.
  And LCS = N + M - D (since D = N + M - 2*LCS). So (# "=") = LCS. ✓

I'm confident the algorithm is correct. Let me write the final version.

Actually, I want to double-check one more thing. In the `find_script` function, when d >= 2 and we find the meeting point (i_mid, j_mid), we recurse:
- left = find_script(i0, j0, i_mid, j_mid, d_f)
- right = find_script(i_mid, j_mid, i1, j1, d_b)

We need to verify that:
- i0 <= i_mid <= i1 and j0 <= j_mid <= j1. ✓ (from the algorithm)
- The edit distance of a[i0:i_mid] vs b[j0:j_mid] is d_f. ✓ (by construction of the forward path)
- The edit distance of a[i_mid:i1] vs b[j_mid:j1] is d_b. ✓ (by construction of the backward path)
- i_mid > i0 or j_mid > j0 (to avoid infinite recursion). Since d_f >= 1, the forward path makes at least one edit, so (i_mid, j_mid) != (i0, j0). ✓
- i_mid < i1 or j_mid < j1 (similarly for backward). Since d_b >= 1, (i_mid, j_mid) != (i1, j1). ✓

Wait, is it guaranteed that i_mid > i0 or j_mid > j0? The forward path with d_f >= 1 edits: it makes d_f edits (deletions and/or insertions) and snakes. The position after the edits and snake is (V_f[k], V_f[k]-k). Since d_f >= 1, at least one edit was made, so the position is not (i0, j0). But could it be (i0, j0) after the snake? No, because the snake only moves forward (increases i and j). After an edit, i > i0 or j > j0, and the snake only increases further. So (i_mid, j_mid) > (i0, j0) in the sense that i_mid > i0 or j_mid > j0. ✓

Similarly, i_mid < i1 or j_mid < j1. ✓

So the recursion always makes progress. Good.

Let me also think about whether the algorithm produces a valid edit script (not just any edit script, but one with the minimum number of edits). By construction, the total number of edits is D (the edit distance), so it's minimal. The number of "=" is (N+M-D)/2 = LCS. ✓

I'm satisfied. Let me write the final code.

Hmm, one more thought: the `myers_distance` function uses an array of size 2*(N+M)+1. For N=M=20000, that's 80001 integers. In Python, each int is an object, so this is about 80001 * 28 bytes ≈ 2.2 MB. Fine.

For the forward/backward in the divide-and-conquer, the arrays are of size 2*d+1 where d <= D/2. For D=2000, that's 2001 integers. Fine.

Let me write the final code now.

Wait, actually I want to reconsider the `myers_distance` function. The array V has size 2*(N+M)+1, and we access V[offset + k] where offset = N+M and k ranges from -d to d. So the max index is offset + d = N+M+d <= N+M+N+M = 2*(N+M). And the min index is offset - d >= N+M-(N+M) = 0. So the array size of 2*(N+M)+1 is sufficient. ✓

But actually, we don't need the full array. We only access V[offset + k] for |k| <= d, so we only need indices from offset - d to offset + d, which is 2d+1 values. But since d can be up to N+M, the max array size is 2*(N+M)+1. Using the full array is simplest.

Actually, for the distance computation, I can use a smaller array and shift the offset each iteration. But for simplicity, I'll use the full array.

Let me finalize.

One more edge case: what if N = 1, M = 1, and a[0] != b[0]? Then D = 2 (one deletion + one insertion). d_f = 1, d_b = 1.
Forward(1, 0, 0, 1, 1): k_start = 0, off = 1.
Level 0: V[1] = 0. Snake: a[0] != b[0]. V[1] = 0.
Level 1: k = -1, 1.
k=-1: V[0] = V[1] = 0. Snake: i=0, j=1. j >= j1=1. Stop. V[0] = 0.
k=1: V[2] = V[1] + 1 = 1. Snake: i=1, j=0. i >= i1=1. Stop. V[2] = 1.
V_f = [0, 0, 1], off_f = 1.

Backward(1, 0, 0, 1, 1): k_start = 0, off = 1.
Level 0: V[1] = 1. Snake: i=1, j=1. a[0]==b[0]? No. V[1] = 1.
Level 1: k = -1, 1.
k=-1: k==k_lo. V[0] = V[1] - 1 = 0. Snake: i=0, j=1. i<=i0. Stop. V[0] = 0.
k=1: k==k_hi. V[2] = V[1] = 1. Snake: i=1, j=0. j<=j0. Stop. V[2] = 1.
V_b = [0, 1, 1], off_b = 1.

Meeting: k_start_f = 0, k_start_b = 0.
k_min = max(-1, -1) = -1. k_max = min(1, 1) = 1.
parity = (0+1)%2 = 1. k_min = -1, (-1)%2 = 1. OK.
k=-1: idx_f = 1+(-1) = 0. idx_b = 1+(-1) = 0. V_f[0]=0, V_b[0]=0. 0>=0. i_mid=0, j_mid=0-(-1)=1.
k=1: idx_f = 1+1 = 2. idx_b = 1+1 = 2. V_f[2]=1, V_b[2]=1. 1>=1. i_mid=1, j_mid=0.

We take the first meeting: k=-1, i_mid=0, j_mid=1.
Left: a[0:0] vs b[0:1] with d_f=1. i1==i0, so [("+", b[0])].
Right: a[0:1] vs b[1:1] with d_b=1. j1==j0, so [("-", a[0])].
Result: [("+", b[0]), ("-", a[0])].

Check: a = [a[0]], "-" and "=": [a[0]]. ✓
b = [b[0]], "=" and "+": [b[0]]. ✓
Edits: 2 = D. ✓

Alternatively, k=1 gives i_mid=1, j_mid=0.
Left: a[0:1] vs b[0:0] with d_f=1. j1==j0, so [("-", a[0])].
Right: a[1:1] vs b[0:1] with d_b=1. i1==i0, so [("+", b[0])].
Result: [("-", a[0]), ("+", b[0])].

Both are valid. The algorithm picks the first meeting (k=-1), giving [("+", b[0]), ("-", a[0])]. Fine.

OK, I'm confident the code is correct. Let me write it out cleanly.

Actually, I just realized there might be an issue with the parity check. Let me reconsider.

At level d_f in forward, k ranges from k_start_f - d_f to k_start_f + d_f in steps of 2. So k ≡ k_start_f - d_f (mod 2). Since k_start_f - d_f ≡ k_start_f + d_f (mod 2) (differ by 2*d_f which is even), we can say k ≡ k_start_f + d_f (mod 2).

Similarly, at level d_b in backward, k ≡ k_start_b + d_b (mod 2).

For the meeting, k must satisfy both parities. This means k_start_f + d_f ≡ k_start_b + d_b (mod 2).

Let's verify: k_start_f + d_f = (i0 - j0) + d_f, k_start_b + d_b = (i1 - j1) + d_b.
(i0 - j0) + d_f - (i1 - j1) - d_b = (i0 - i1) + (j1 - j0) + d_f - d_b
= -(i1 - i0) + (j1 - j0) + d_f - d_b

Since d_f + d_b = d, and the edit distance d satisfies d ≡ (i1-i0) - (j1-j0) (mod 2) (because each edit changes i-j by ±1, and d edits change i-j by a total of ±d, and the net change is (i1-i0)-(j1-j0)), we have:
d ≡ (i1-i0) - (j1-j0) (mod 2)
d_f - d_b ≡ d (mod 2) (since d_f + d_b = d and d_f - d_b = 2*d_f - d, so d_f - d_b ≡ -d ≡ d (mod 2) since 2 is 0 mod 2)

Wait: d_f - d_b = 2*d_f - d. So d_f - d_b ≡ -d ≡ d (mod 2). ✓

So (i0-i0) + (j1-j0) + d_f - d_b ≡ -(i1-i0) + (j1-j0) + d (mod 2)
= -[(i1-i0) - (j1-j0)] + d ≡ -d + d ≡ 0 (mod 2). ✓

So the parities are consistent. Good.

In my code, I set `parity = (k_start_f + d_f) % 2` and adjust k_min to have this parity. Since the parities are consistent, this also gives the correct parity for the backward k values. ✓

I think the code is ready. Let me write the final clean version.

One last thought: I should make sure the recursion doesn't hit Python's recursion limit. The maximum depth is O(log D) ≈ 11 for D=2000. Well within the default limit of 1000. ✓

Let me also consider: in the `find_script` function, when d >= 2, we always make progress (i_mid > i0 or j_mid > j0, and i_mid < i1 or j_mid < j1). So the recursion terminates. ✓

I'm ready to write the final code.
