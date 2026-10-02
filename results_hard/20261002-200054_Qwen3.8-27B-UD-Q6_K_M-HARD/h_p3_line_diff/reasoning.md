The user wants me to implement a shortest edit script using Myers' O((N+M)·D) diff algorithm. Let me think through this carefully.

Myers' algorithm finds the longest common subsequence (LCS) by finding the shortest edit script (minimum number of insertions and deletions). The algorithm works on the "edit graph" where we go from (0,0) to (N,M) where N=len(a) and M=len(b).

The key insight of Myers' algorithm:
- We look for the shortest path from (0,0) to (N,M) in the edit graph
- The path consists of diagonal moves (=, matching a[i] with b[j]), horizontal moves (-, deleting a[i]), and vertical moves (+, inserting b[j])
- The edit distance D is the number of non-diagonal moves
- Myers' algorithm uses a parameter k (the diagonal) and tracks the furthest-reaching point on each diagonal

The algorithm:
1. For D = 0, 1, 2, ... (number of edits):
   - For each diagonal k from -D to D (step 2):
     - Determine if we came from a horizontal or vertical move
     - Advance diagonally as far as possible
     - Store the furthest-reaching x coordinate
   - If we reach (N, M), we found the shortest edit script

For the traceback, we need to store the path. Let me think about how to do this efficiently.

The standard Myers algorithm:
- `V` array stores the furthest x-coordinate reached on each diagonal
- We store a snapshot of V for each D value for traceback

Let me implement this:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N = len(a)
    M = len(b)
    
    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]
    
    # Myers' algorithm
    # V[k] = furthest x reached on diagonal k
    # Diagonal k means x - y = k, so x = y + k
    
    max_d = N + M
    # We'll store snapshots for traceback
    # For performance, we can use arrays
    
    # V is indexed by k + offset where offset = max_d (or N+M)
    # Actually, for diagonal k, x = y + k, and 0 <= x <= N, 0 <= y <= M
    # So k ranges from -M to N
    
    # Let's use a dictionary or array approach
    # For performance with 20000 elements, we should use arrays
    
    # Actually, let me think about this more carefully.
    # V[k] stores the furthest x on diagonal k
    # k = x - y
    # We need V for k in range [-D, D] at step D
    # Overall k ranges from -M to N
    
    # For traceback, we need to store V at each step D
    # But storing full V arrays for each D could be expensive
    # Alternative: store the path directly during forward search, then do reverse search
    
    # Let me use the "divide and conquer" approach or the simpler approach of storing all V snapshots.
    
    # For N, M up to 20000 and D up to ~50 (or ~2000 for completely different lists of 1000),
    # storing V snapshots should be fine.
    
    # Actually for completely different lists of 1000, D = 2000, and each V has up to 2001 entries.
    # That's 2000 * 2001 = ~4 million entries. Should be fine.
    
    # Let me use a list of lists for V snapshots.
    
    # V is an array where index k + offset gives V[k]
    # offset = M (so k ranges from -M to N, index ranges from 0 to N+M)
    
    offset = M
    size = N + M + 1  # k ranges from -M to N
    
    V = [0] * size
    V[offset + 1] = 0  # V[1] = 0 (diagonal k=1, x starts at 0)
    
    # Actually, let me be more careful.
    # V[k] = furthest x such that (x, x-k) is reachable
    # Initially, V[1] = 0 (we're at (0,0), which is on diagonal 0... wait)
    
    # Let me reconsider. The standard formulation:
    # We start at (0,0). The diagonal is k = x - y = 0.
    # V[k] = furthest x on diagonal k
    # Initially V[0] = 0
    # 
    # At step D, for each k in [-D, D]:
    #   If k == -D: we must have come from a vertical move (insertion), so x = V[k-1]
    #   If k == D: we must have come from a horizontal move (deletion), so x = V[k+1] + 1
    #   Otherwise: x = max(V[k-1], V[k+1] + 1)
    #   Then advance diagonally: while x < N and y < M and a[x] == b[y]: x++, y++
    #   V[k] = x
    #   y = x - k
    
    # Let me redo this properly.
    
    # For the initial state before any edits:
    # V[1] = 0 (this is the standard Myers initialization)
    # This represents that on diagonal k=1, the furthest x is 0
    # (meaning we can reach (0, -1) which is the "start" for deletion)
    # And on diagonal k=-1, V[-1] = -1 (meaning we can reach (-1, 0) which is the "start" for insertion)
    
    # Actually the cleaner way:
    # V[k] = furthest x on diagonal k after some number of edits
    # Before any edits (D=0), we can only reach (0,0) which is on diagonal 0
    # So V[0] = 0 initially
    
    # At D=0: k=0, x = V[0] = 0, advance diagonally from (0,0)
    # At D=1: k=-1: x = V[-2]... no wait.
    
    # Let me use the standard formulation from the paper:
    # V[k] for k in [-D, D]
    # For k = -D: x = V[k+1] (came from insertion, y increased by 1, x stayed)
    #   Wait no. If k = x - y, and we did an insertion (y += 1), then new k = x - (y+1) = k_old - 1
    #   So to get to diagonal k, we came from diagonal k-1 via insertion? No...
    
    # Let me think again. Diagonal k: x - y = k.
    # From (x, y) on diagonal k:
    #   - Diagonal move to (x+1, y+1): stays on diagonal k
    #   - Deletion (skip a[x]): go to (x+1, y): new diagonal k+1
    #   - Insertion (add b[y]): go to (x, y+1): new diagonal k-1
    
    # So to arrive at diagonal k with the furthest x:
    #   - From diagonal k+1 via deletion: x = V[k+1] + 1, y = x - k = V[k+1] + 1 - k
    #   - From diagonal k-1 via insertion: x = V[k-1], y = x - k = V[k-1] - k
    #   - Choose the one with larger x
    
    # Special cases:
    #   - k = D: can only come from k-1 via insertion? No, k = D means we've done D more deletions than insertions... 
    #     Actually k = D: the only way to reach this at step D is via a deletion from k-1.
    #     Wait no. At step D, we're on diagonal k. The number of deletions minus insertions = k.
    #     Total edits = deletions + insertions = D.
    #     So deletions = (D+k)/2, insertions = (D-k)/2.
    #     For k = D: insertions = 0, deletions = D. So we can only get here via deletions.
    #     The previous step was on diagonal D-1 = k-1, and we did a deletion.
    #     So x = V[k-1] + 1.
    #   - k = -D: deletions = 0, insertions = D. So we can only get here via insertions.
    #     The previous step was on diagonal -D+1 = k+1, and we did an insertion.
    #     So x = V[k+1].
    
    # OK so:
    # For D = 0, 1, 2, ...:
    #   For k = -D, -D+2, -D+4, ..., D-2, D (same parity as D):
    #     if k == -D: x = V[k+1]  (insertion from k+1)
    #     elif k == D: x = V[k-1] + 1  (deletion from k-1)
    #     else: x = max(V[k-1], V[k+1]) + ... 
    #       from k-1 via insertion: x = V[k-1]
    #       from k+1 via deletion: x = V[k+1] + 1
    #       x = max(V[k-1], V[k+1] + 1)
    #     y = x - k
    #     while x < N and y < M and a[x] == b[y]: x += 1; y += 1
    #     V[k] = x
    #     if x == N and y == M: found it, D is the answer
    #   Store V for traceback
    
    # Wait, I need to be more careful about parity. At step D, k must have the same parity as D.
    # Because k = deletions - insertions, D = deletions + insertions, so D and k have same parity.
    
    # For traceback, I'll store all V arrays.
    
    # Let me code this up:
    
    max_d = N + M
    # V array: index k + offset, where offset = M (so k=-M maps to index 0, k=N maps to index N+M)
    # Actually k ranges from -M to N, so size = N + M + 1
    
    # For storing snapshots, I'll use a list of arrays.
    # But for performance, let's only store what we need.
    
    # Actually, for the "completely different" case with 1000 lines each, D = 2000.
    # Storing 2000 snapshots of size 2001 each = 4 million integers. That's fine.
    
    # For the "50 differences in 20000 lines" case, D is small (maybe 50-100), so very fast.
    
    let me just implement it:
    
    def diff_lines(a, b):
        N, M = len(a), len(b)
        if N == 0 and M == 0:
            return []
        if N == 0:
            return [("+", line) for line in b]
        if M == 0:
            return [("-", line) for line in a]
        
        offset = M
        size = N + M + 1
        V = [0] * size
        # Initialize: before any edits, we're at (0,0) on diagonal 0
        # But the standard init is V[1] = 0, meaning from "before" we can delete to get to diagonal 1
        # Let me use a slightly different init:
        # V[k+1] and V[k-1] should be initialized such that:
        # For k=0, D=0: x = max(V[-1], V[1]+1)
        # We want x=0. So V[-1] should be 0 and V[1]+1 should be <= 0, i.e., V[1] = -1.
        # Or V[-1] = -1 and V[1]+1 = 0, i.e., V[1] = -1.
        # Hmm, let me just set V[1] = 0 and handle D=0 specially.
        
        # Actually, the cleanest way:
        # V[1] = 0  (standard Myers init)
        # This means: on diagonal 1, we can reach x=0 (i.e., point (0,-1) which is "virtual")
        # For D=0, k=0: x = V[1] + 1 = 1? No that's wrong.
        
        # Let me re-derive. The standard Myers init:
        # V[1] = 0
        # For D = 0:
        #   k = 0: since k == -D == 0... wait D=0, k=0, k==-D and k==D both true.
        #   Hmm, for D=0, the only k is 0.
        #   k == -D: x = V[k+1] = V[1] = 0. Then advance from (0,0).
        #   k == D: x = V[k-1] + 1 = V[-1] + 1. 
        #   Since both conditions apply, we should take the max? Or since D=0, we start at (0,0).
        
        # I think the cleanest approach:
        # V[1] = 0
        # For D = 0, 1, 2, ...:
        #   For k in range(-D, D+1, 2):
        #     if k == -D: x = V[k + offset + 1]  # from insertion (came from k+1)
        #     elif k == D: x = V[k - 1 + offset] + 1  # from deletion (came from k-1)
        #     else:
        #       from_k_minus_1 = V[k - 1 + offset]  # insertion: x stays
        #       from_k_plus_1 = V[k + 1 + offset] + 1  # deletion: x increases
        #       x = max(from_k_minus_1, from_k_plus_1)
        #     y = x - k
        #     while x < N and y < M and a[x] == b[y]:
        #       x += 1; y += 1
        #     V[k + offset] = x
        #     if x >= N and y >= M:  # actually x == N and y == M
        #       # Found the edit script with D edits
        #       break
        #   Store V for traceback
    
    # Wait, I need to be careful. When k == -D, we come from k+1 via insertion.
    # From diagonal k+1, we did an insertion: (x, y) -> (x, y+1), new diagonal = x - (y+1) = (k+1) - 1 = k. ✓
    # x stays the same: x = V[k+1]
    # 
    # When k == D, we come from k-1 via deletion.
    # From diagonal k-1, we did a deletion: (x, y) -> (x+1, y), new diagonal = (x+1) - y = (k-1) + 1 = k. ✓
    # x increases: x = V[k-1] + 1
    
    # This looks right. Let me also verify with D=0:
    # k=0, k==-D and k==D. 
    # Using k==-D: x = V[1] = 0. y = 0-0 = 0. Start at (0,0), advance diagonally. ✓
    # Using k==D: x = V[-1] + 1. V[-1] is uninitialized (0 in our array). x = 1. That's wrong.
    # So for D=0, we should only use the k==-D case (or k==D case, but not both).
    # Actually for D=0, k=0, both conditions are true. We should use x = V[1] = 0.
    # Let me structure it as:
    #   if k == -D: (this covers D=0, k=0)
    #   elif k == D: (this covers D>0)
    #   else:
    
    # That works because for D=0, k=0, the first condition catches it.
    
    # Now for traceback:
    # We store V arrays at each step D (before the step, i.e., the state from D-1).
    # Actually, we need to store the state at each D to trace back.
    # At step D, we compute new V values. We need to know where we came from at each step.
    
    # The standard approach: store V before updating at each step.
    # traces[D] = copy of V before step D updates.
    
    # Then to trace back from (N, M) at step D*:
    #   For d = D*, D*-1, ..., 0:
    #     k = x - y
    #     Determine how we got to (x, y):
    #       Check traces[d] (V before step d... hmm this is getting confusing)
    
    # Let me use a different approach. I'll store the V after each step.
    # traces is a list where traces[d] is the V array after processing step d.
    # traces[-1] or traces[0] could be the initial state.
    
    # Actually, let me store it differently:
    # path[d] = (x_d, y_d) where (x_d, y_d) is the endpoint we reach at step d.
    # But that's not quite right either because we need the full path.
    
    # Better approach: store all V snapshots, then trace back.
    
    # Let me define:
    # V_snapshots[d] = V array after step d has been processed
    # (i.e., V[k] = furthest x on diagonal k reachable with at most d edits)
    
    # To trace back from the final point (N, M) at step D*:
    #   x, y = N, M
    #   For d = D*, D*-1, ..., 0:
    #     k = x - y
    #     Look at V_snapshots[d-1] (the state before step d)
    #     Determine if we came from k-1 (insertion) or k+1 (deletion):
    #       If d == 0: we were at (0, 0) before any edits... actually the diagonal advance handles this.
    #       If k == -d: must have come from k+1 (insertion). prev_x = V_snapshots[d-1][k+1], prev_y = prev_x - (k+1)
    #       If k == d: must have come from k-1 (deletion). prev_x = V_snapshots[d-1][k-1], prev_y = prev_x - (k-1)
    #       Else: 
    #         from k-1: prev_x = V_snapshots[d-1][k-1], prev_y = prev_x - (k-1)
    #         from k+1: prev_x = V_snapshots[d-1][k+1], prev_y = prev_x - (k+1)
    #         Choose the one where prev_x is larger (or prev_x >= x means insertion, prev_x+1 >= x means deletion)
    #         Actually: if V_snapshots[d-1][k-1] >= x: came from k-1 (insertion, x didn't change)
    #         Else: came from k+1 (deletion, x increased by 1)
    #     The edit was:
    #       If from k-1: insertion (y increased by 1), the line is b[prev_y]
    #       If from k+1: deletion (x increased by 1), the line is a[prev_x]
    #     Then set x, y = prev_x, prev_y
    #     But wait, we also need to account for the diagonal advance.
    #     After the edit, we advanced diagonally from (prev_x + delta_x, prev_y + delta_y) to (x, y).
    #     The diagonal advance means (x - prev_x - delta_x, y - prev_y - delta_y) are all "=" moves.
    
    # Hmm, this is getting complex. Let me think about it differently.
    
    # Actually, the standard traceback works like this:
    # At each step d, we know the endpoint (x_d, y_d) which is the furthest point on the "optimal" diagonal.
    # But we need to track which diagonal we're on at each step.
    
    # Let me just store the full V at each step and trace back carefully.
    
    # Alternatively, a simpler approach for traceback:
    # Store at each step d the V array.
    # Start from (N, M) at step D*.
    # At step d, we're at point (x, y) on diagonal k = x - y.
    # We need to find where we came from:
    #   Look at V from step d-1 (call it V_prev).
    #   If k == -d: we came from diagonal k+1 via insertion.
    #     prev_point = (V_prev[k+1], V_prev[k+1] - (k+1))
    #   If k == d: we came from diagonal k-1 via deletion.
    #     prev_point = (V_prev[k-1], V_prev[k-1] - (k-1))
    #   Else:
    #     from k-1 (insertion): candidate = (V_prev[k-1], V_prev[k-1] - (k-1))
    #     from k+1 (deletion): candidate = (V_prev[k+1]+1, V_prev[k+1]+1 - (k+1)) = (V_prev[k+1]+1, V_prev[k+1]-k)
    #     Choose based on which gives the correct x:
    #       If V_prev[k-1] == x: came from k-1 (insertion)
    #       Else: came from k+1 (deletion)
    #       (One of them must equal x or x-1 appropriately)
    
    # Actually, I realize the issue. After the edit, we advance diagonally. So:
    # Before diagonal advance: we're at some point (x', y') on diagonal k.
    # After diagonal advance: we're at (x, y) on diagonal k (furthest reachable).
    # The points (x', y'), (x'+1, y'+1), ..., (x, y) are all on diagonal k and all match.
    
    # For traceback:
    # At step d, endpoint is (x_d, y_d) on diagonal k_d.
    # The edit at step d took us from some point on diagonal k_{d-1} to (x'_d, y'_d) on diagonal k_d.
    # Then we advanced diagonally from (x'_d, y'_d) to (x_d, y_d).
    
    # So to trace back:
    # 1. We're at (x_d, y_d) on diagonal k_d = x_d - y_d.
    # 2. Find the edit: go back to (x'_d, y'_d) which is the point right after the edit but before diagonal advance.
    #    x'_d is determined by where we came from:
    #    - From k_d - 1 (insertion): x'_d = V_prev[k_d - 1], y'_d = x'_d - k_d
    #    - From k_d + 1 (deletion): x'_d = V_prev[k_d + 1] + 1, y'_d = x'_d - k_d
    # 3. The diagonal segment is from (x'_d, y'_d) to (x_d, y_d), all "=" moves.
    # 4. The edit itself:
    #    - Insertion: prev point was (x'_d, y'_d - 1) on diagonal k_d - 1. The inserted line is b[y'_d - 1].
    #    - Deletion: prev point was (x'_d - 1, y'_d) on diagonal k_d + 1. The deleted line is a[x'_d - 1].
    # 5. Set (x, y) = (x'_d, y'_d - 1) or (x'_d - 1, y'_d) and continue to step d-1.
    
    # Wait, I need to be more careful. Let me re-examine.
    
    # If we came from diagonal k-1 via insertion:
    #   Previous point: (px, py) where px - py = k-1
    #   After insertion: (px, py+1) where px - (py+1) = k-1-1 = k-2... 
    #   No wait. Insertion means we add b[py] to b. In the edit graph:
    #   We're at (px, py) and we move to (px, py+1). The new diagonal is px - (py+1) = (px-py) - 1 = (k-1) - 1 = k-2.
    #   That doesn't work. Let me re-think.
    
    # OK I'm getting confused with the diagonal convention. Let me restart with a clear definition.
    
    # Edit graph: nodes are (i, j) where 0 <= i <= N, 0 <= j <= M.
    # (i, j) means we've matched the first i lines of a with the first j lines of b (with some deletions and insertions).
    # From (i, j):
    #   - Match: if a[i] == b[j], go to (i+1, j+1). Cost 0.
    #   - Delete: go to (i+1, j). Cost 1. (Delete a[i])
    #   - Insert: go to (i, j+1). Cost 1. (Insert b[j])
    
    # Diagonal: d = i - j. (This is the "k" in Myers)
    # Match: d stays the same.
    # Delete: d increases by 1 (i+1 - j = d+1).
    # Insert: d decreases by 1 (i - (j+1) = d-1).
    
    # V[d] = furthest i reached on diagonal d.
    # j = i - d.
    
    # Initialization: V[1] = 0. This means on diagonal d=1, furthest i is 0, so j = 0-1 = -1.
    # This is the "virtual" starting point for a deletion: from (-1... no, from (0, -1) which doesn't exist.
    # Actually, V[1] = 0 means: to be on diagonal 1 at i=0, we'd need j=-1, which is "before the start of b".
    # This allows the first move to be a deletion: from (0, -1) [virtual] -> (1, -1)... no that's wrong too.
    
    # Let me look at this differently. The standard Myers initialization:
    # V[1] = 0
    # For D = 0:
    #   k = 0: x = V[1] = 0 (using the k == -D rule since D=0, k=0=-D)
    #   Wait, that gives x=0, y=0. Then advance diagonally.
    #   Actually with V[1]=0 and the rule "k == -D: x = V[k+1]":
    #   k=0, D=0: x = V[1] = 0. y = 0 - 0 = 0. Correct, we start at (0,0).
    
    # For D = 1:
    #   k = -1: x = V[0] (from previous step). y = x - (-1) = x + 1.
    #     This means: we did an insertion. Previous point was (x, y-1) = (x, x) on diagonal 0.
    #     The inserted element is b[y-1] = b[x].
    #   k = 1: x = V[0] + 1. y = x - 1 = V[0].
    #     This means: we did a deletion. Previous point was (x-1, y) = (V[0], V[0]) on diagonal 0.
    #     The deleted element is a[x-1] = a[V[0]].
    
    # OK so for traceback at step d:
    # We're at (x, y) on diagonal k = x - y.
    # Look at V_prev (the V from step d-1, i.e., before step d was processed).
    # 
    # If k == -d: came from k+1 via insertion.
    #   prev_i = V_prev[k+1], prev_j = prev_i - (k+1)
    #   The edit: insertion of b[prev_j] (since we went from j=prev_j to j=prev_j+1=y)
    #   Wait: y = x - k, prev_j = prev_i - (k+1). 
    #   x = prev_i (insertion doesn't change i).
    #   y = x - k = prev_i - k = prev_i - k.
    #   prev_j = prev_i - k - 1 = y - 1.
    #   So we went from (prev_i, y-1) to (prev_i, y). Inserted b[y-1]. ✓
    #   The "before edit" point is (prev_i, y-1).
    #   
    # If k == d: came from k-1 via deletion.
    #   prev_i = V_prev[k-1], prev_j = prev_i - (k-1)
    #   The edit: deletion of a[prev_i] (since we went from i=prev_i to i=prev_i+1=x)
    #   x = prev_i + 1. y = x - k = prev_i + 1 - k.
    #   prev_j = prev_i - k + 1 = y.
    #   So we went from (prev_i, y) to (prev_i+1, y). Deleted a[prev_i]. ✓
    #   The "before edit" point is (prev_i, y).
    #   
    # Else (|k| < d):
    #   Option 1 (insertion from k-1): prev_i = V_prev[k-1], prev_j = prev_i - (k-1)
    #     x = prev_i, y = x - k = prev_i - k. prev_j = prev_i - k + 1 = y - 1.
    #     Went from (prev_i, y-1) to (prev_i, y). Inserted b[y-1].
    #   Option 2 (deletion from k+1): prev_i = V_prev[k+1], prev_j = prev_i - (k+1)
    #     x = prev_i + 1, y = x - k = prev_i + 1 - k. prev_j = prev_i - k - 1 = y - 1.
    #     Hmm wait: prev_j = prev_i - (k+1) = prev_i - k - 1. And y = prev_i + 1 - k = prev_i - k + 1.
    #     So prev_j = y - 2? That can't be right.
    #     
    #     Let me redo: From (prev_i, prev_j) on diagonal k+1, we do a deletion.
    #     New point: (prev_i + 1, prev_j) on diagonal (prev_i+1) - prev_j = (k+1) + 1 = k+2.
    #     Wait, that's diagonal k+2, not k!
    
    # I think I'm making an error. Let me recheck.
    # If we're on diagonal d (meaning i - j = d), and we do a deletion (i -> i+1, j stays):
    #   New diagonal: (i+1) - j = d + 1.
    # So deletion moves from diagonal d to diagonal d+1.
    # If we do an insertion (i stays, j -> j+1):
    #   New diagonal: i - (j+1) = d - 1.
    # So insertion moves from diagonal d to diagonal d-1.
    
    # Therefore, to arrive at diagonal k:
    #   Via deletion: came from diagonal k-1 (since k-1 + 1 = k). ✓
    #   Via insertion: came from diagonal k+1 (since k+1 - 1 = k). ✓
    
    # So:
    # If k == -d: must have come from k+1 via insertion (can't come from k-1 since k-1 = -d-1 is out of range for step d-1... actually at step d-1, the valid diagonals are [-(d-1), d-1], and k-1 = -d-1 < -(d-1) = -d+1 for d>0. So yes, only insertion from k+1).
    #   Actually for d=1, k=-1: k-1 = -2, and at step 0, valid diagonals are [0,0]. So -2 is out of range. Only k+1=0 is valid.
    #   prev_i = V_prev[k+1], prev_j = prev_i - (k+1)
    #   New point after edit: (prev_i, prev_j + 1) = (prev_i, prev_i - k)
    #   x = prev_i, y = prev_i - k. ✓
    #   Inserted line: b[prev_j] = b[prev_i - (k+1)]
    #   Before edit: (prev_i, prev_j) = (prev_i, prev_i - (k+1))
    
    # If k == d: must have come from k-1 via deletion.
    #   prev_i = V_prev[k-1], prev_j = prev_i - (k-1)
    #   New point after edit: (prev_i + 1, prev_j)
    #   x = prev_i + 1, y = prev_j = prev_i - (k-1) = prev_i - k + 1
    #   Deleted line: a[prev_i]
    #   Before edit: (prev_i, prev_j) = (prev_i, prev_i - (k-1))
    
    # Else:
    #   From k+1 via insertion: prev_i = V_prev[k+1], prev_j = prev_i - (k+1)
    #     New point: (prev_i, prev_j + 1) = (prev_i, prev_i - k)
    #     x should equal prev_i, y should equal prev_i - k
    #   From k-1 via deletion: prev_i = V_prev[k-1], prev_j = prev_i - (k-1)
    #     New point: (prev_i + 1, prev_j) = (prev_i + 1, prev_i - k + 1)
    #     x should equal prev_i + 1, y should equal prev_i - k + 1
    #   
    #   We choose based on which is larger:
    #     If V_prev[k-1] + 1 >= V_prev[k+1]: came from k-1 (deletion)
    #       (because x = V_prev[k-1] + 1 > V_prev[k+1] = x from insertion)
    #     Else: came from k+1 (insertion)
    
    # After determining the edit, we also need to "walk back" the diagonal advance.
    # The point right after the edit is (x_edit, y_edit).
    # The point at the end of the diagonal advance is (x, y).
    # All points from (x_edit, y_edit) to (x, y) are "=" (matches).
    # The number of matches is (x - x_edit) = (y - y_edit).
    
    # So the full traceback for step d gives us:
    #   1. A sequence of "=" lines (from the diagonal advance): a[x_edit..x-1] = b[y_edit..y-1]
    #   2. A single edit: either "-" a[prev_i] or "+" b[prev_j]
    #   3. The "before edit" point for the next step back.
    
    # Let me code this up properly now.
    
    # For efficiency, I'll store V snapshots as lists.
    # For the 20000-line case with ~50 diffs, D is small, so very few snapshots.
    # For the 1000-line completely different case, D = 2000, and each V has ~2001 entries.
    # Total: 2000 * 2001 ≈ 4M integers. Should be fine memory-wise and time-wise.
    
    # Let me also think about whether I need to store ALL V values or just the relevant ones.
    # At step d, k ranges from -d to d. So I only need V values for k in [-d, d].
    # But for simplicity, I'll store the full V array each time.
    
    # Actually, for performance with 20000 lines, the V array has size N+M+1 = 40001.
    # If D is small (say 50), that's 50 * 40001 = 2M integers. Fine.
    # If D is 2000 (worst case for 1000+1000), that's 2000 * 2001 = 4M. Fine.
    
    # Let me write the code now.
    
    # One more thing: for the diagonal advance, I should be careful about performance.
    # With 20000 lines and 50 differences, the diagonal advances will be long (most of the time).
    # But the total work is O((N+M) * D) which for 20000+20000 and D=50 is 2M. Fast.
    # For 1000+1000 and D=2000, it's 4M. Still fast.
    
    # Let me write the final implementation:
    
    def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
        N, M = len(a), len(b)
        
        if N == 0 and M == 0:
            return []
        if N == 0:
            return [("+", line) for line in b]
        if M == 0:
            return [("-", line) for line in a]
        
        offset = M  # offset for indexing diagonal k as k + offset
        size = N + M + 1
        
        V = [0] * size
        V[1 + offset] = 0  # V[1] = 0
        
        # Store snapshots for traceback
        # snapshots[d] = V array state at the beginning of step d (i.e., after step d-1)
        # Actually, let me store: snapshots[d] = V after processing all diagonals for step d
        # Then for traceback at step d, I look at snapshots[d-1] to see where we came from.
        # For d=0, snapshots[-1] would be the initial state (only V[1]=0 is set).
        
        # Hmm, let me think about this differently.
        # I'll store the V state BEFORE each step's updates.
        # pre_snapshots[d] = V before step d is processed.
        # 
        # For traceback at step d:
        #   We know the endpoint (x, y) on diagonal k.
        #   We look at pre_snapshots[d] to see where we came from.
        
        # Actually, the issue is that within a step, V is updated in-place.
        # At step d, we update V for k = -d, -d+2, ..., d.
        # When computing V[k] for step d, we read V[k-1] and V[k+1] from the PREVIOUS step.
        # So we need to read old values and write new values.
        # 
        # The trick: at step d, we update V for k values with the same parity as d.
        # We read from k-1 and k+1 which have the opposite parity (from step d-1).
        # So we can update in-place as long as we go in the right order... actually no,
        # we're reading from the "old" V (step d-1) and writing "new" V (step d).
        # Since k-1 and k+1 have different parity than k, and we're writing k,
        # we won't overwrite what we need to read later in the same step.
        # Wait, at step d, we write k = -d, -d+2, ..., d-2, d.
        # We read k-1 and k+1 for each.
        # For k = -d: read -d-1 and -d+1. -d+1 has parity d-1 (opposite), so it's from step d-1. ✓
        # For k = -d+2: read -d+1 and -d+3. -d+1 was written earlier in this step! ✗
        
        # Hmm, that's a problem. Let me check: at step d (say d=2):
        #   k = -2: read V[-3], V[-1]. Both from step 1 (or initial). Write V[-2].
        #   k = 0: read V[-1], V[1]. V[-1] is from step 1. V[1] is from step 1. Write V[0].
        #   k = 2: read V[1], V[3]. Both from step 1. Write V[2].
        # 
        # At step d=3:
        #   k = -3: read V[-4], V[-2]. V[-2] was written at step 2. ✓ (it's the "previous step" for us)
        #   k = -1: read V[-2], V[0]. V[-2] from step 2, V[0] from step 2. ✓
        #   k = 1: read V[0], V[2]. Both from step 2. ✓
        #   k = 3: read V[2], V[4]. Both from step 2. ✓
        # 
        # OK so it works because at step d, we read from step d-1 values (opposite parity diagonals)
        # and write to step d values (same parity diagonals). No conflict.
        
        # So in-place update works. For traceback, I need to store a copy of V before each step.
        
        snapshots = []
        found = False
        D_star = -1
        end_x, end_y = 0, 0
        
        for D in range(0, N + M + 1):
            # Store snapshot before this step
            snapshots.append(V[:])
            
            for k in range(-D, D + 1, 2):
                if k == -D:
                    x = V[k + 1 + offset]
                elif k == D:
                    x = V[k - 1 + offset] + 1
                else:
                    from_left = V[k + 1 + offset]  # insertion from k+1
                    from_right = V[k - 1 + offset] + 1  # deletion from k-1
                    x = from_left if from_left > from_right else from_right
                
                y = x - k
                
                # Diagonal advance
                while x < N and y < M and a[x] == b[y]:
                    x += 1
                    y += 1
                
                V[k + offset] = x
                
                if x == N and y == M:
                    found = True
                    D_star = D
                    end_x = x
                    end_y = y
                    break
            
            if found:
                break
        
        if not found:
            # Shouldn't happen, but just in case
            result = [("-", line) for line in a]
            result.extend([("+", line) for line in b])
            return result
        
        # Traceback
        result = []  # We'll build this in reverse and then reverse it
        
        x, y = N, M
        for d in range(D_star, -1, -1):
            k = x - y
            V_prev = snapshots[d]
            
            if d == 0:
                # No edit, just diagonal advance from (0,0) to (x,y)
                # All matches
                # x == y, k == 0
                for i in range(x - 1, -1, -1):
                    result.append(("=", a[i]))
                x = 0
                y = 0
                continue
            
            if k == -d:
                # Came from k+1 via insertion
                prev_i = V_prev[k + 1 + offset]
                prev_j = prev_i - (k + 1)
                # The edit was: insert b[prev_j]
                # After edit: (prev_i, prev_j + 1) = (prev_i, y) [since x = prev_i and y = x - k = prev_i - k = prev_i - (-d) = prev_i + d; prev_j + 1 = prev_i - (k+1) + 1 = prev_i - k = y] ✓
                # Diagonal advance from (prev_i, y) to (x, y)... wait x = prev_i here.
                # Actually x = prev_i (insertion doesn't change i), and the diagonal advance goes from (prev_i, y) to (x, y).
                # But x = prev_i, so the diagonal advance is zero length? 
                # No wait. After the edit, we're at (prev_i, prev_j+1). Then we advance diagonally.
                # The V stores the final x after diagonal advance.
                # So V_prev[k+1] is the x AFTER the diagonal advance at step d-1 for diagonal k+1.
                # Hmm no. Let me re-examine.
                
                # At step d, for diagonal k:
                #   We compute x_start (before diagonal advance) based on V_prev[k-1] or V_prev[k+1].
                #   Then we advance diagonally to get the final x.
                #   V[k] = final x.
                # 
                # For traceback, we're at (x, y) which is the final point (after diagonal advance) at step d.
                # We need to find x_start (before diagonal advance).
                # 
                # If we came from k+1 (insertion): x_start = V_prev[k+1]
                #   (because insertion: x doesn't change from the previous diagonal's endpoint)
                #   y_start = x_start - k
                #   Diagonal advance: from (x_start, y_start) to (x, y). Length = x - x_start.
                #   The edit: from (x_start, y_start - 1) to (x_start, y_start). Inserted b[y_start - 1].
                #   Wait: prev point on diagonal k+1 is (V_prev[k+1], V_prev[k+1] - (k+1)).
                #   After insertion: (V_prev[k+1], V_prev[k+1] - (k+1) + 1) = (V_prev[k+1], V_prev[k+1] - k) = (x_start, y_start).
                #   So the inserted line is b[V_prev[k+1] - (k+1)] = b[y_start - 1].
                
                x_start = V_prev[k + 1 + offset]
                y_start = x_start - k
                # Diagonal advance: (x_start, y_start) to (x, y)
                for i in range(x - 1, x_start - 1, -1):
                    result.append(("=", a[i]))
                # Edit: insertion
                result.append(("+", b[y_start - 1]))
                # Move to before-edit position
                x = x_start
                y = y_start - 1
                
            elif k == d:
                # Came from k-1 via deletion
                # x_start = V_prev[k-1] + 1
                # y_start = x_start - k
                # Previous point: (V_prev[k-1], V_prev[k-1] - (k-1))
                # After deletion: (V_prev[k-1] + 1, V_prev[k-1] - (k-1)) = (x_start, y_start)
                # Deleted line: a[V_prev[k-1]]
                x_start = V_prev[k - 1 + offset] + 1
                y_start = x_start - k
                # Diagonal advance: (x_start, y_start) to (x, y)
                for i in range(x - 1, x_start - 1, -1):
                    result.append(("=", a[i]))
                # Edit: deletion
                result.append(("-", a[x_start - 1]))
                # Move to before-edit position
                x = x_start - 1
                y = y_start
                
            else:
                # |k| < d
                from_insertion = V_prev[k + 1 + offset]  # x if came from k+1 via insertion
                from_deletion = V_prev[k - 1 + offset] + 1  # x if came from k-1 via deletion
                
                if from_insertion > from_deletion:
                    # Came from k+1 via insertion
                    x_start = from_insertion
                    y_start = x_start - k
                    for i in range(x - 1, x_start - 1, -1):
                        result.append(("=", a[i]))
                    result.append(("+", b[y_start - 1]))
                    x = x_start
                    y = y_start - 1
                else:
                    # Came from k-1 via deletion
                    x_start = from_deletion
                    y_start = x_start - k
                    for i in range(x - 1, x_start - 1, -1):
                        result.append(("=", a[i]))
                    result.append(("-", a[x_start - 1]))
                    x = x_start - 1
                    y = y_start
        
        result.reverse()
        return result
    
    Let me verify this with a simple example:
    a = ["a", "b", "c"], b = ["a", "c"]
    N=3, M=2. LCS = ["a", "c"], length 2. Edit script: ("=", "a"), ("-", "b"), ("=", "c"). D=1.
    
    offset = 2, size = 6.
    V = [0]*6, V[1+2] = V[3] = 0.
    
    D=0:
      snapshots = [V.copy()] = [[0,0,0,0,0,0]]
      k=0: k==-D, x = V[0+1+2] = V[3] = 0. y = 0-0 = 0.
        Diagonal advance: a[0]=="a"==b[0], x=1,y=1. a[1]=="b"!=b[1]=="c", stop.
        V[0+2] = V[2] = 1.
        x=1, y=1. Not (3,2).
    
    D=1:
      snapshots = [[0,0,0,0,0,0], [0,0,1,0,0,0]]
      k=-1: k==-D, x = V[-1+1+2] = V[2] = 1. y = 1-(-1) = 2.
        Diagonal advance: y=2=M, can't advance.
        V[-1+2] = V[1] = 1.
        x=1, y=2. Not (3,2).
      k=1: k==D, x = V[1-1+2] + 1 = V[2] + 1 = 2. y = 2-1 = 1.
        Diagonal advance: a[2]=="c"==b[1]=="c", x=3, y=2.
        V[1+2] = V[3] = 3.
        x=3, y=2. Yes! Found. D_star=1.
    
    Traceback:
    x=3, y=2.
    d=1: k=3-2=1. k==d==1.
      V_prev = snapshots[1] = [0,0,1,0,0,0]
      x_start = V_prev[1-1+2] + 1 = V_prev[2] + 1 = 1+1 = 2.
      y_start = 2-1 = 1.
      Diagonal advance: (2,1) to (3,2). i from 2 to 2: result.append(("=", a[2])) = ("=", "c").
      Edit: deletion. result.append(("-", a[2-1])) = ("-", a[1]) = ("-", "b").
      x = 2-1 = 1, y = 1.
    
    d=0: k=1-1=0.
      Diagonal advance from (0,0) to (1,1). i from 0 to 0: result.append(("=", a[0])) = ("=", "a").
      x=0, y=0.
    
    result (before reverse) = [("=", "c"), ("-", "b"), ("=", "a")]
    After reverse: [("=", "a"), ("-", "b"), ("=", "c")] ✓
    
    Let me check another example: a = ["b"], b = ["a"]. N=1, M=1. D should be 2 (delete b, insert a).
    
    offset=1, size=3. V=[0,0,0], V[1+1]=V[2]=0.
    
    D=0:
      snapshots = [[0,0,0]]
      k=0: x=V[0+1+1]=V[2]=0. y=0. Diagonal: a[0]="b"!=b[0]="a". No advance.
      V[0+1]=V[1]=0. Not (1,1).
    
    D=1:
      snapshots = [[0,0,0],[0,0,0]]
      k=-1: k==-D. x=V[-1+1+1]=V[1]=0. y=0-(-1)=1.
        Diagonal: y=1=M. No advance.
        V[-1+1]=V[0]=0. Not (1,1).
      k=1: k==D. x=V[1-1+1]+1=V[1]+1=1. y=1-1=0.
        Diagonal: x=1=N. No advance.
        V[1+1]=V[2]=1. Not (1,1). Wait, x=1, y=0. That's not (1,1). Correct, not found.
    
    D=2:
      snapshots = [[0,0,0],[0,0,0],[0,0,1]]
      k=-2: k==-D. x=V[-2+1+1]=V[0]=0. y=0-(-2)=2. y=2>M=1. 
        Hmm, y=2 > M=1. That's a problem. We can't have y > M.
        
    Wait, I think there's an issue. Let me reconsider.
    
    If x=0 and k=-2, then y = x-k = 0-(-2) = 2. But M=1, so y=2 is out of bounds.
    
    Actually, in Myers' algorithm, we should check that the point is valid (0<=x<=N, 0<=y<=M) before doing the diagonal advance. But the algorithm should naturally not produce invalid points if implemented correctly...
    
    Actually, I think the issue is that we should still process it (the diagonal advance just won't do anything since y > M), and V[k] = x = 0. The point (0, 2) is "virtual" in the sense that we've already passed the end of b. But we can still reach (1, 1) from here? No, we can't because we'd need to go backwards.
    
    Hmm, let me reconsider. The edit graph goes from (0,0) to (N,M). We can only move right (delete), down (insert), or diagonally (match). We can't go outside the grid [0..N] x [0..M].
    
    So when y > M or x > N, the point is invalid and we shouldn't be there.
    
    Let me re-examine. At D=1, k=1: x=1, y=0. This is valid (on the bottom edge). We can't advance diagonally because x=N.
    
    At D=2, k=0: 
      from k+1 (insertion): V[0+1+1] = V[2] = 1. x_insert = 1. y = 1-0 = 1. Valid!
      from k-1 (deletion): V[0-1+1] + 1 = V[0] + 1 = 0+1 = 1. x_del = 1. y = 1-0 = 1. Valid!
      x = max(1, 1) = 1. y = 1.
      Diagonal: x=1=N. No advance.
      V[0+1] = V[1] = 1.
      x=1, y=1. Found! D_star=2.
    
    Wait, I skipped k=0 at D=2. Let me redo:
    D=2: k ranges from -2 to 2, step 2: k = -2, 0, 2.
    
    k=-2: x = V[-2+1+1] = V[0] = 0. y = 0-(-2) = 2. y > M. 
      Diagonal: can't advance (y > M). V[-2+1] = V[-1]... wait, -2+1 = -1, which is out of bounds for our array!
      
    Hmm, I have an indexing issue. offset = M = 1. k ranges from -M to N, i.e., -1 to 1.
    But at D=2, k=-2 which is less than -M=-1. So k+offset = -2+1 = -1, out of bounds!
    
    This is a problem. The diagonal k can range from -M to N in the grid, but at step D, k ranges from -D to D. If D > M, then k < -M is possible.
    
    In this case, the point (x, y) = (x, x-k) would have y = x + D > M (since k < -M means x-k > x+M >= M for x>=0). So the point is outside the grid.
    
    I think the solution is: if y > M or x > N, we just set V[k] = x (or some sentinel) and don't do the diagonal advance. The point is "beyond" the target.
    
    Actually, a cleaner approach: we can clamp or just let the algorithm handle it. If y > M, the diagonal advance won't happen (since we check y < M). And we just store V[k] = x.
    
    But the indexing issue remains: k+offset could be negative or >= size.
    
    For the algorithm to work correctly, I need to handle the case where k is outside [-M, N]. In practice:
    - If k < -M: then for any valid point on this diagonal, y = x - k > x + M >= M (since x >= 0). So no valid point exists on this diagonal within the grid. We can just skip it or set V[k] = -infinity.
    - If k > N: then for any valid point, x = y + k > y + N >= N (since y >= 0). No valid point.
    
    So for these diagonals, we just set V[k] = -1 (or 0) and don't do anything useful.
    
    But we still need to index into the V array. Let me make the array large enough.
    
    Actually, the maximum |k| we'll ever access is max(N, M) (since k ranges from -D to D and D <= N+M, but we only care about k in [-M, N] for valid points).
    
    Wait, at step D, we access V[k-1+offset] and V[k+1+offset] where k is in [-D, D].
    So we need indices from (-D-1+offset) to (D+1+offset).
    The maximum D is N+M. So we need indices from (-(N+M)-1+offset) to ((N+M)+1+offset).
    With offset = N+M (or max(N,M)+1 or something), this gets large.
    
    Alternative: use a dictionary for V. But that's slower.
    
    Better: make the offset large enough. offset = N + M + 2. Size = 2*(N+M) + 5 or something.
    Actually, the max index we need: (N+M) + 1 + offset. The min: -(N+M) - 1 + offset.
    If offset = N + M + 2, then min index = -(N+M)-1+N+M+2 = 1. Max index = (N+M)+1+N+M+2 = 2*(N+M)+3.
    Size = 2*(N+M) + 5.
    
    For N=M=20000: size = 80005. Fine.
    For N=M=1000: size = 4005. Fine.
    
    Actually wait, I realize the diagonal advance while loop is the main cost. Let me think about whether my algorithm is truly O((N+M)*D).
    
    At each step D, for each k, we do a diagonal advance. The total diagonal advance across all k at step D is at most N+M (since the advances on different diagonals don't overlap in terms of the "frontier"). Actually, I think the total work per step is O(N+M) in the worst case, giving O(D*(N+M)) total. But actually, the standard analysis shows it's O((N+M)*D) because the sum of diagonal advances across all k at a given step is bounded.
    
    Hmm, actually I'm not sure that's tight. Let me think... At step D, we have 2D+1 diagonals. Each diagonal advance can be O(N+M) in the worst case. So per step: O(D*(N+M)). Total: O(D^2*(N+M)). That's worse!
    
    Wait no. The key insight is that the diagonal advances at a given step D are "non-overlapping" in some sense. The furthest-reaching points on adjacent diagonals differ by at most 1 in x. So the total diagonal advance across all diagonals at step D is at most... hmm.
    
    Actually, I recall that the correct complexity is O((N+M)*D) for the forward phase. The reason is: at step D, the sum of (V[k] - V[k-2]) over all k is bounded by N+M. Because the V values are "Lipschitz" in k (adjacent diagonals differ by at most 1 in x). So the total advance is bounded.
    
    Actually, I think the simpler argument is: each cell (i,j) in the grid is visited at most once across all steps. Because once we've "passed" a cell (i.e., it's behind the frontier), we never visit it again. The total number of cells is N*M, but the frontier advances by at most D in total... 
    
    You know what, let me just trust that Myers' algorithm is O((N+M)*D) and move on. For the given constraints (20000 lines, 50 diffs → D≈50, or 1000 lines, all different → D=2000), it should be fast enough.
    
    Let me also handle the edge case where y > M in the diagonal advance. If y >= M at the start of the advance, we just skip it.
    
    Let me also double-check: in the traceback, when I do `for i in range(x - 1, x_start - 1, -1)`, this iterates i from x-1 down to x_start. The number of iterations is x - x_start. And we append ("=", a[i]). This represents the diagonal matches from (x_start, y_start) to (x, y).
    
    Wait, the diagonal goes from (x_start, y_start) to (x, y). The matched lines are a[x_start], a[x_start+1], ..., a[x-1] (and correspondingly b[y_start], ..., b[y-1]). So I should iterate i from x-1 down to x_start (inclusive). That's `range(x-1, x_start-1, -1)`. Yes, that's what I have.
    
    Let me also make sure the d=0 case is handled correctly. At d=0, we're at (x, y) on diagonal k=0 (since x-y=0 at the start). Actually no, at d=0, the only diagonal is k=0. So x=y. The diagonal advance went from (0,0) to (x,y). All matches.
    
    In my code for d=0:
    ```
    for i in range(x - 1, -1, -1):
        result.append(("=", a[i]))
    x = 0
    y = 0
    ```
    This is correct: we're matching a[0..x-1] with b[0..y-1] where x=y.
    
    Now let me also think about potential issues with the `while x < N and y < M` check. If y starts negative (which shouldn't happen in practice) or x starts negative, we should handle it. But with proper initialization, this shouldn't occur.
    
    Actually, wait. Can x be negative? V[k] is initialized to 0 for all k except V[1]=0. And we only set V[k] = x where x >= 0 (since we start from non-negative values and only increment). So x should always be >= 0.
    
    Can y be negative? y = x - k. If k > x, then y < 0. This can happen for large positive k. In that case, the diagonal advance won't happen (since y < 0 < M, wait no, we check y < M, not y >= 0).
    
    Hmm, I should add a check: `while x < N and y < M and y >= 0 and x >= 0 and a[x] == b[y]`. Actually, x >= 0 is always true. y >= 0 might not be. Let me add it.
    
    Wait, actually if y < 0, that means we're above the top of the grid, which shouldn't happen for valid paths. But to be safe, let me add the check.
    
    Actually, thinking about it more carefully: if k is very large positive (say k = N), then y = x - k <= N - N = 0. For y to be negative, we'd need x < k, i.e., x < N. This could happen. But in that case, the point (x, y) with y < 0 is outside the grid, and we can't do a diagonal advance. The algorithm should still work because we just won't advance, and this diagonal won't be useful for reaching (N, M).
    
    Let me add `y >= 0` to the while condition to be safe.
    
    OK let me also think about a potential optimization: instead of copying the entire V array for each snapshot, I could store only the relevant portion. But for the given constraints, copying should be fine.
    
    For N=M=20000, D=50: 50 copies of a 40005-element list = 2M elements. Fine.
    For N=M=1000, D=2000: 2000 copies of a 2005-element list = 4M elements. Fine.
    
    Actually wait, with my larger offset, the size would be 2*(N+M)+5. For N=M=20000: 80005. 50*80005 = 4M. Still fine.
    For N=M=1000: 4005. 2000*4005 = 8M. Fine.
    
    Let me finalize the code. I'll use offset = N + M + 2 and size = 2*(N+M) + 5.
    
    Actually, let me reconsider. The maximum k value we'll access is D+1 (when k=D, we access V[k+1+offset] = V[D+1+offset]). The minimum is -D-1 (when k=-D, we access V[k-1+offset]... wait no, when k=-D, we access V[k+1+offset] = V[-D+1+offset]).
    
    Hmm, let me be more careful:
    - k ranges from -D to D.
    - We access V[k-1+offset] (when k==D or in the else case) → min index: (-D)-1+offset = -D-1+offset
    - We access V[k+1+offset] (when k==-D or in the else case) → max index: D+1+offset
    
    Max D = N+M. So:
    - Min index: -(N+M)-1+offset
    - Max index: (N+M)+1+offset
    
    For min index >= 0: offset >= N+M+1
    For max index < size: (N+M)+1+offset < size
    
    Let's set offset = N+M+1, size = 2*(N+M) + 3.
    Min index: -(N+M)-1+N+M+1 = 0. ✓
    Max index: (N+M)+1+N+M+1 = 2*(N+M)+2. Need size > 2*(N+M)+2, so size = 2*(N+M)+3. ✓
    
    Great. Let me write the final code.
    
    One more thought: for performance, the diagonal advance while loop is the hot spot. In Python, this can be slow for long stretches. But for 20000 lines with 50 diffs, the longest stretch is ~20000, and we have maybe 50 such stretches total. 50 * 20000 = 1M iterations. Should be fine in under 2 seconds.
    
    For 1000 lines all different, D=2000, and the diagonal advances are all zero-length (no matches). So the while loop never executes. The main cost is the 2000 steps * 2001 diagonals = 4M simple operations. Should be fine in under 6 seconds.
    
    Let me write the final version now.
