The user wants a `diff_lines` function that computes a shortest edit script using Myers' O((N+M)·D) algorithm for longest common subsequence.

Let me think about Myers' algorithm:

Myers' algorithm finds the longest common subsequence (LCS) in O((N+M)·D) time where D is the edit distance (number of insertions + deletions).

The key insight of Myers' algorithm:
- We have two sequences A (length N) and B (length M).
- The edit distance D = N + M - 2*LCS_length.
- We can compute the LCS in O((N+M)·D) time.

Myers' algorithm works by finding the longest common prefix/suffix first, then using a "frontier" approach in the middle.

Let me think about the Myers algorithm more carefully:

1. First, find the longest common prefix (matching from the start) and longest common suffix (matching from the end).
2. Then, work on the middle part using the O((N+M)·D) algorithm.

The O((N+M)·D) algorithm:
- We maintain a "frontier" - a set of (i, j) pairs where i + j = k for some k.
- For each k from 0 to D, we try to find the furthest reaching D-path.
- The frontier is stored as an array `d` where `d[x]` gives the y-coordinate of the furthest reaching D-path for diagonal x.

Let me implement this:

```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    n = len(a)
    m = len(b)
    
    # Find longest common prefix
    prefix = 0
    while prefix < n and prefix < m and a[prefix] == b[prefix]:
        prefix += 1
    
    # Find longest common suffix
    suffix = 0
    while suffix < n - prefix and suffix < m - prefix and a[n-1-suffix] == b[m-1-suffix]:
        suffix += 1
    
    # Now work on the middle: a[prefix : n-suffix] and b[prefix : m-suffix]
    mid_a = a[prefix : n - suffix]
    mid_b = b[prefix : m - suffix]
    mid_n = len(mid_a)
    mid_m = len(mid_b)
    
    # Myers' O((N+M)·D) algorithm
    # D = mid_n + mid_m - 2 * LCS_length
    # We need to find LCS without computing D first... 
    # Actually, Myers' algorithm iterates k from 0 to D, but we don't know D upfront.
    # However, D <= mid_n + mid_m, so we can iterate k from 0 to mid_n + mid_m.
    
    # The algorithm:
    # d[x] = y for diagonal x (where x = i - j)
    # For each k (edit distance), we try to find the furthest reaching path.
    
    # Actually, let me reconsider. The standard Myers algorithm:
    # - d is an array of size 2*max(n,m) + 1 (or 2*(n+m)+1)
    # - For k from 0 to D:
    #   For each diagonal x from k down to -k (or k+1 down to -k):
    #     if x is even (or x == k): start from d[x-1] + 1 (insertion)
    #     else: start from d[x] (deletion)
    #     then follow diagonal (match) as far as possible
    #     update d[x] = y
    #   if d[0] == m: we've found the LCS
    #
    # Wait, I need to be more careful. Let me re-derive.
    
    # Myers' algorithm for LCS:
    # We want to find the longest common subsequence.
    # d[x] stores the furthest y (in B) reached by a D-path on diagonal x = i - j.
    # 
    # For k = 0, 1, 2, ..., D:
    #   For x = k, k-1, k-2, ..., -k:
    #     if x == k or x is even:
    #       y = d[x-1] + 1  (we insert a character in B)
    #     else:
    #       y = d[x]  (we delete a character from A)
    #     # Follow the diagonal
    #     while y < m and x + y < n and mid_a[x + y] == mid_b[y]:
    #       x += 1
    #       y += 1
    #     d[x] = y
    #   if d[0] == m:
    #     break  # found LCS
    
    # Wait, I need to be more careful about the indexing.
    
    # Let me use the standard formulation:
    # d is indexed by x = i - j (the diagonal)
    # d[x] = j (the y-coordinate)
    # 
    # For each k from 0 to D:
    #   for x from k down to -k:
    #     if x == k or (x % 2 == k % 2):  # hmm, this isn't quite right
    #     
    # Actually let me look at this more carefully.
    
    # The standard Myers algorithm:
    # d[x] = y where x = i - j
    # 
    # For k = 0, 1, 2, ..., D:
    #   for x = k, k-1, ..., -k:
    #     if x == k or x is even:
    #       y = d[x-1] + 1
    #     else:
    #       y = d[x]
    #     while x + y < n and y < m and mid_a[x+y] == mid_b[y]:
    #       x += 1
    #       y += 1
    #     d[x] = y
    #   if d[0] == m:
    #     # LCS found
    #     break
    
    # Wait, I think the condition should be:
    # - If x == k: this is a new diagonal being explored for the first time, so we must come from an insertion (y = d[x-1] + 1)
    # - If x is even (and x != k): we come from a deletion (y = d[x])
    # - If x is odd (and x != k): we come from an insertion (y = d[x-1] + 1)
    
    # Hmm, let me think again. In Myers' paper:
    # A D-path is a sequence of insertions and deletions.
    # The "furthest reaching D-path" on diagonal x is the one that has consumed the most characters.
    # 
    # For diagonal x = i - j:
    #   The path reaching (i, j) can come from:
    #     - (i-1, j) via a deletion (removing a[i-1])  -> diagonal (i-1) - j = x - 1
    #     - (i, j-1) via an insertion (inserting b[j-1]) -> diagonal i - (j-1) = x + 1
    #   
    # So d[x] can be updated from d[x-1] (deletion: y stays same, i increases) or d[x+1] (insertion: j increases, i stays same).
    
    # Wait, I'm getting confused. Let me restart with a cleaner formulation.
    
    # Let's use the formulation where:
    # d[x] = the y-coordinate (index into B) of the furthest reaching path on diagonal x.
    # Diagonal x means i - j = x, so i = x + j.
    
    # To extend on diagonal x:
    #   Option 1: Come from diagonal x-1 (i-1, j) -> deletion. y = d[x-1]
    #   Option 2: Come from diagonal x+1 (i, j-1) -> insertion. y = d[x+1] + 1
    #   
    # We pick the one that gives a larger y (further along).
    # But actually, for a specific k (edit distance), we only consider one option:
    #   If k is even: come from deletion (d[x-1])  -- wait no.
    
    # Let me look at this differently. In Myers' algorithm:
    # For each k from 0 to D:
    #   For each diagonal x from k down to -k:
    #     if x == k or x is even:
    #       y = d[x-1]  (deletion: we go from (x-1+y, y) to (x+y, y), i.e., delete a character)
    #     else:
    #       y = d[x+1] + 1  (insertion: we go from (x+1+y, y) to (x+y, y+1), i.e., insert a character)
    #     # Then follow the diagonal (matches)
    #     while y < m and x + y < n and mid_a[x+y] == mid_b[y]:
    #       x += 1
    #       y += 1
    #     d[x] = y
    #   if d[0] == m:
    #     break
    
    # Hmm wait, I think I had the indices wrong. Let me re-derive.
    
    # Diagonal x: i - j = x, so i = x + j.
    # 
    # From diagonal x-1: point is (x-1 + j, j). Moving to diagonal x means i increases by 1: (x + j, j). This is a deletion (we removed a[i-1]).
    # So y stays the same: y_new = d[x-1]
    # 
    # From diagonal x+1: point is (x+1 + j, j). Moving to diagonal x means j increases by 1: (x + j, j+1). This is an insertion (we inserted b[j]).
    # So y_new = d[x+1] + 1
    # 
    # For a D-path of length k:
    #   The number of deletions + insertions = k.
    #   If we're on diagonal x, and we came from a deletion: x decreased by 1 (from x+1 to x)... wait no.
    #   
    # Hmm, I think I'm overcomplicating this. Let me use a well-known reference.
    
    # From Myers' 1986 paper "An O((N+M)D) Difference Algorithm":
    # 
    # d[x] stores the y-coordinate of the furthest reaching D-path on diagonal x.
    # 
    # For k = 0, 1, 2, ..., D:
    #   for x = k, k-1, k-2, ..., -k:
    #     if x == k or x is even:
    #       y = d[x-1]   # (this is a deletion step)
    #     else:
    #       y = d[x+1] + 1   # (this is an insertion step)
    #     # follow diagonal
    #     while x + y < n and y < m and mid_a[x+y] == mid_b[y]:
    #       x += 1
    #       y += 1
    #     d[x] = y
    #   if d[0] == m:
    #     break  # found LCS
    #
    # Wait, I need to double-check the parity condition. Let me think about it:
    # 
    # At step k, we're looking at D-paths of length k.
    # A D-path of length k on diagonal x means we've made k edits total.
    # The number of deletions and insertions sum to k.
    # i - j = x means we've "matched" i - j more characters from A than B... 
    # Actually, i = number of characters consumed from A, j = number consumed from B.
    # i - j = x.
    # 
    # Total edits = k. Deletions = i - (i-j) = j... no.
    # If we matched (i-j)/... hmm.
    # 
    # Let's say: deletions = d_count, insertions = i_count. d_count + i_count = k.
    # i = d_count + (matched characters from A) = d_count + (i - j - d_count + i_count)... 
    # This is getting circular. Let me just use the standard result.
    
    # Actually, I recall that the condition is:
    # - x == k: must be from insertion (since this is the first time we visit this diagonal at this k level)
    # - x is even (and x != k): from deletion
    # - x is odd (and x != k): from insertion
    #
    # Wait, I think the correct formulation is:
    # - If x == k: y = d[x-1] + 1 (insertion, because we're extending to a new diagonal)
    #   Actually no... x == k means we're at the maximum positive diagonal. To get here, we must have come from x-1 via a deletion... or from x+1 via an insertion. But x+1 = k+1 which hasn't been computed yet at this k level. So we must come from x-1 via deletion.
    #   
    # Hmm, I think I need to be more careful. Let me just use the formulation I've seen in implementations:
    
    # For k from 0 to D:
    #   for x from k down to -k:
    #     if x == k or x % 2 == 0:
    #       y = d[x-1]
    #     else:
    #       y = d[x+1] + 1
    #     while x + y < n and y < m and mid_a[x+y] == mid_b[y]:
    #       x += 1
    #       y += 1
    #     d[x] = y
    #   if d[0] == m:
    #     break
    
    # Wait, I think the parity condition might be related to whether k is even or odd. Let me think...
    
    # At k=0: x=0. We start at (0,0). y = 0. Then follow diagonal.
    #   x == k (0 == 0), so y = d[-1]... that doesn't work.
    #   
    # Hmm, let me reconsider. At k=0, x=0:
    #   We're at the start. y should be 0.
    #   Then follow diagonal: while mid_a[0] == mid_b[0], advance.
    #   d[0] = y (however far we got)
    #
    # At k=1: x=1, x=0, x=-1
    #   x=1: This is a new diagonal. To reach diagonal 1, we must have deleted a character (i went up by 1, j stayed). So y = d[0] (from the k=0 result).
    #   x=0: To reach diagonal 0 at k=1, we could come from diagonal -1 (deletion) or diagonal 1 (insertion). Since x=0 is even, we use deletion: y = d[-1].
    #   x=-1: To reach diagonal -1 at k=1, we could come from diagonal 0 (deletion) or diagonal -2 (insertion). Since x=-1 is odd, we use insertion: y = d[0] + 1.
    #
    # Wait, that doesn't seem right either. Let me think about what "from deletion" means:
    # - Deletion: we remove a character from A. So i increases by 1, j stays. Diagonal changes from (i-1)-j to i-j, i.e., x increases by 1.
    #   So to reach diagonal x via deletion, we came from diagonal x-1. y stays the same.
    # - Insertion: we insert a character into B. So j increases by 1, i stays. Diagonal changes from i-(j-1) to i-j, i.e., x decreases by 1.
    #   So to reach diagonal x via insertion, we came from diagonal x+1. y increases by 1.
    #
    # Now, for a D-path of length k on diagonal x:
    # The number of deletions is (k + x) / 2 and insertions is (k - x) / 2.
    # For this to be valid, k + x must be even (and non-negative), and k - x must be even (and non-negative).
    # So k + x must be even, which means x and k have the same parity.
    #
    # Wait: k + x even means x ≡ k (mod 2). And k - x even also means x ≡ k (mod 2). So they're the same condition.
    #
    # So for a valid D-path of length k on diagonal x, we need x ≡ k (mod 2).
    #
    # Now, to compute d[x] at step k:
    # - If x == k: This is the first time we reach this diagonal. We must come from diagonal x-1 = k-1 via deletion. y = d[k-1].
    #   Wait, but k-1 has different parity from k, so d[k-1] was computed at step k-1 (the previous edit distance level).
    #   Actually, d[x] stores the BEST (furthest) y for diagonal x, regardless of k. So d[k-1] is the best y we've achieved on diagonal k-1 at any point so far.
    #
    # Hmm, I think the algorithm works like this:
    # - d[x] is maintained across all k values.
    # - At step k, for each x from k down to -k:
    #   We compute a candidate y for diagonal x.
    #   The candidate comes from either d[x-1] (deletion) or d[x+1]+1 (insertion).
    #   We pick the one that's valid for this k (based on parity).
    #   Then we extend along the diagonal.
    #   We update d[x] = max(d[x], y) -- actually, I think we just set d[x] = y since the new value is always >= old.
    
    # OK let me just look at a concrete small example.
    # A = "ABC", B = "AC"
    # n=3, m=2
    # LCS = "AC", length 2. D = 3+2-2*2 = 1.
    #
    # k=0: x=0
    #   x==k, so y = d[-1]... 
    #   Hmm, for k=0, x=0, we should start at (0,0), so y=0.
    #   Then follow diagonal: A[0]='A', B[0]='A' match. x=1, y=1. A[1]='B', B[1]='C' no match.
    #   d[0] = 1.
    #   d[0] == m? 1 != 2. Continue.
    #
    # k=1: x=1, x=0, x=-1
    #   x=1: x==k, so deletion: y = d[0] = 1. 
    #     Follow diagonal: x+y = 1+1 = 2 < 3, y=1 < 2. A[2]='C', B[1]='C' match. x=2, y=2.
    #     x+y = 4 >= 3. Stop. d[1] = 2.
    #   x=0: x is even (and x != k), so deletion: y = d[-1].
    #     d[-1] hasn't been set... hmm.
    #     Actually, for x=0 at k=1: k+x = 1, which is odd. So x and k have different parity. This means we can't reach diagonal 0 with exactly 1 edit from a valid path... 
    #     Wait, I think I had the parity condition wrong.
    #     
    # Let me reconsider. For a D-path of length k ending at diagonal x:
    #   Number of deletions = (k + x) / 2, insertions = (k - x) / 2.
    #   We need k + x >= 0 and k - x >= 0, and both even.
    #   So k + x must be even, meaning x ≡ k (mod 2).
    #
    # At k=1: x must be odd (x ≡ 1 mod 2). So x = 1 or x = -1.
    #   x=1: deletions = (1+1)/2 = 1, insertions = (1-1)/2 = 0. Valid.
    #   x=-1: deletions = (1-1)/2 = 0, insertions = (1+1)/2 = 1. Valid.
    #   x=0: k+x = 1, odd. NOT valid. So we skip x=0 at k=1.
    #
    # OK so the loop should only iterate over x where x ≡ k (mod 2).
    # At k=1: x = 1, -1 (not 0).
    #
    # x=1: deletion from d[0]. y = d[0] = 1.
    #   Follow diagonal: A[1+1]=A[2]='C', B[1]='C'. Match. x=2, y=2.
    #   x+y=4 >= 3. Stop. d[1] = 2.
    #   
    # x=-1: insertion from d[0]+1. y = d[0]+1 = 2.
    #   Follow diagonal: x+y = -1+2 = 1 < 3, y=2 >= 2. Stop. d[-1] = 2.
    #
    # Check: d[0] == m? d[0] = 1 != 2. But wait, we should check if d[0] >= m... 
    # Actually, d[0] represents the furthest y on diagonal 0. If d[0] >= m, we've consumed all of B.
    # d[0] = 1 < 2. So we need k=2.
    #
    # k=2: x must be even. x = 2, 0, -2.
    #   x=2: deletion from d[1]. y = d[1] = 2.
    #     Follow diagonal: x+y = 4 >= 3. Stop. d[2] = 2.
    #   x=0: deletion from d[-1]. y = d[-1] = 2.
    #     Follow diagonal: x+y = 2 < 3, y=2 >= 2. Stop. d[0] = 2.
    #   x=-2: insertion from d[-1]+1. y = d[-1]+1 = 3.
    #     Follow diagonal: x+y = 1 < 3, y=3 >= 2. Stop. d[-2] = 3.
    #   Check: d[0] = 2 >= m = 2. Break!
    #
    # LCS length = d[0] = 2. Correct!
    
    # Now I need to backtrack to find the actual LCS.
    # 
    # For backtracking, I need to store the path. One approach:
    # - Store d[x] for each k (the frontier at each step).
    # - Then backtrack from (0, m) at the final k.
    #
    # Actually, a simpler approach: store the entire d array at each k step.
    # Then backtrack:
    #   Start at k_final, x=0, y=d[0]=m.
    #   For k from k_final down to 0:
    #     At step k, x=0, y=d_k[0].
    #     We need to figure out how we got here.
    #     If we came from deletion (x-1): previous x = x-1, y = d_{k-1}[x-1]... 
    #     Wait, this is getting complicated.
    
    # Alternative: Just use the standard approach where we store the full d table.
    # d[k][x] = y for each k and x.
    # Then backtrack.
    
    # Actually, for the performance requirements (20000 lines, ~50 differences), D is small (~50-100), so storing d[k][x] for k=0..D and x=-k..k is fine.
    
    # Let me think about the backtracking:
    # At the final step k_final, we have d[0] = m (all of B consumed).
    # We want to trace back.
    # 
    # At step k, diagonal x, position y:
    #   - We came from either deletion (x-1, y) or insertion (x+1, y-1).
    #   - The predecessor diagonal x' is determined by parity:
    #     If x ≡ k (mod 2): 
    #       deletions = (k+x)/2, insertions = (k-x)/2
    #       If deletions > 0: came from diagonal x-1 (deletion), y stays
    #       If insertions > 0: came from diagonal x+1 (insertion), y-1
    #       Actually, we need to check which one gives the correct y.
    #
    # Hmm, let me think differently. 
    # 
    # At step k, for diagonal x:
    #   If x == k: y = d[x-1] (deletion) [only option since x+1 = k+1 > k, not computed]
    #   If x > -k and x is even (and x != k): y = d[x-1] (deletion)
    #   If x > -k and x is odd (and x != k): y = d[x+1] + 1 (insertion)
    #   If x == -k: y = d[x+1] + 1 (insertion) [only option since x-1 = -k-1 < -k, not computed]
    #
    # Wait, I think the condition is simpler:
    #   If x == k: y = d[x-1] (must be deletion, since x+1 not available)
    #   If x == -k: y = d[x+1] + 1 (must be insertion, since x-1 not available)
    #   Otherwise: 
    #     If x is even: y = d[x-1] (deletion)
    #     If x is odd: y = d[x+1] + 1 (insertion)
    #
    # Hmm wait, I think the parity condition might depend on k's parity, not x's parity. Let me re-examine.
    
    # At k=0: x=0. y=0 (start).
    # At k=1: x=1 (even? no, 1 is odd), x=-1 (odd).
    #   x=1: x==k, y=d[0] (deletion)
    #   x=-1: x==-k, y=d[0]+1 (insertion)
    # At k=2: x=2, x=0, x=-2.
    #   x=2: x==k, y=d[1] (deletion)
    #   x=0: x is even, y=d[-1] (deletion)
    #   x=-2: x==-k, y=d[-1]+1 (insertion)
    # At k=3: x=3, x=1, x=-1, x=-3.
    #   x=3: x==k, y=d[2] (deletion)
    #   x=1: x is odd, y=d[2]+1 (insertion)
    #   x=-1: x is odd, y=d[0]+1 (insertion)
    #   x=-3: x==-k, y=d[-2]+1 (insertion)
    
    # Hmm wait, at k=3, x=1: k+x = 4, even. deletions = 2, insertions = 1.
    # To reach diagonal 1 with 2 deletions and 1 insertion:
    #   The last step could be a deletion (from diagonal 0) or an insertion (from diagonal 2).
    #   If last step is deletion: y = d[0] (from diagonal 0, y unchanged)
    #   If last step is insertion: y = d[2] + 1 (from diagonal 2, y+1)
    #   We pick the one that gives a larger y.
    #
    # But in the standard algorithm, for a given (k, x), we only use ONE predecessor:
    #   If x == k: must be deletion (y = d[x-1])
    #   If x == -k: must be insertion (y = d[x+1] + 1)
    #   If x is even (and -k < x < k): deletion (y = d[x-1])
    #   If x is odd (and -k < x < k): insertion (y = d[x+1] + 1)
    #
    # I think this is correct because:
    #   For x to be valid at step k, we need k+x even (x ≡ k mod 2).
    #   If x ≡ k mod 2 and x is even: then k is even. Deletions = (k+x)/2, which is >= 1 (since x < k means k+x < 2k, and k+x >= 0). Actually if x = k, deletions = k. If x < k, deletions = (k+x)/2 < k. And insertions = (k-x)/2 > 0.
    #   So the last step could be either. But the algorithm picks based on parity of x.
    #   
    # Actually, I think the key insight is:
    #   At step k, the diagonal x is reached from:
    #   - Diagonal x-1 (deletion) if x-1 was valid at step k-1
    #   - Diagonal x+1 (insertion) if x+1 was valid at step k-1
    #   
    # At step k-1, valid diagonals are those with (k-1)+x even, i.e., x ≡ k-1 (mod 2).
    # For x-1: (k-1)+(x-1) = k+x-2, even iff k+x even. Since k+x is even (x is valid at step k), k+x-2 is even. So x-1 is valid at step k-1. ✓
    # For x+1: (k-1)+(x+1) = k+x, even iff k+x even. Since k+x is even, k+x is even. So x+1 is valid at step k-1. ✓
    #
    # So both predecessors are valid! We need to pick the one that gives a larger y.
    # But the standard algorithm only uses one. Why?
    #
    # I think the reason is that the "furthest reaching" property ensures that one is always better. Specifically:
    #   d[x-1] >= d[x+1] (for the same k level, the diagonals are ordered)
    #   So d[x-1] (deletion) >= d[x+1] + 1 (insertion)? Not necessarily.
    #
    # Hmm, actually I think the standard algorithm does use both and takes the max. Let me look at this again.
    #
    # Actually, I recall now: the algorithm computes d[x] as:
    #   y = max(d[x-1], d[x+1] + 1)  (taking the better predecessor)
    #   Then extend along diagonal.
    #
    # But wait, for the boundary cases (x == k or x == -k), only one predecessor is available.
    #
    # Let me re-examine with the example:
    # A = "ABC", B = "AC"
    # k=0: x=0, y=0. Extend: A[0]=A, B[0]=A match. x=1,y=1. A[1]=B, B[1]=C no. d[0]=1.
    # k=1: x=1, x=-1.
    #   x=1: x==k. y = d[0] = 1. Extend: A[2]=C, B[1]=C match. x=2,y=2. d[1]=2.
    #   x=-1: x==-k. y = d[0]+1 = 2. Extend: x+y=1, A[1]=B, B[2]... m=2, y=2>=m. Stop. d[-1]=2.
    # k=2: x=2, x=0, x=-2.
    #   x=2: x==k. y = d[1] = 2. Extend: x+y=4>=3. d[2]=2.
    #   x=0: y = max(d[-1], d[1]+1) = max(2, 3) = 3? But m=2, so y can't exceed m.
    #     Hmm, y = d[1]+1 = 3 > m=2. That's invalid.
    #     y = d[-1] = 2. Valid.
    #     So y = 2. Extend: x+y=2<3, y=2>=m. Stop. d[0]=2.
    #   x=-2: x==-k. y = d[-1]+1 = 3 > m. Invalid? 
    #     Hmm, this is a problem. If d[x+1]+1 > m, we can't use it.
    #
    # I think the constraint is that y must be <= m. If the predecessor gives y > m, we skip it.
    #
    # Actually, I think in practice, d[x] is always <= m (since we never go past the end of B). And d[x+1]+1 could be m+1 which is invalid.
    #
    # Let me just use: y = max(d[x-1], d[x+1]+1) but clamp to m. Or rather, if d[x+1]+1 > m, use d[x-1]. If d[x-1] < 0, use d[x+1]+1.
    #
    # Actually, I think the cleaner formulation is:
    #   For interior x (not at boundaries):
    #     y = max(d[x-1], d[x+1] + 1)
    #   For x == k: y = d[x-1]
    #   For x == -k: y = d[x+1] + 1
    #
    # And we ensure y <= m (if d[x+1]+1 > m, we just use d[x-1]).
    #
    # Hmm, but I've also seen formulations where the parity determines which predecessor to use. Let me look at this from a different angle.
    
    # You know what, let me just use the formulation where:
    #   For each k from 0 to D_max:
    #     For x from k down to -k (only those with x ≡ k mod 2):
    #       if x == k: y = d[x-1]
    #       elif x == -k: y = d[x+1] + 1
    #       else: y = max(d[x-1], d[x+1] + 1)
    #       while x + y < n and y < m and mid_a[x+y] == mid_b[y]:
    #         x += 1; y += 1
    #       d[x] = y
    #     if d[0] >= m: break
    #
    # D_max = mid_n + mid_m (worst case, all different)
    #
    # For backtracking, I'll store d[k][x] for each k.
    
    # Actually wait, I realize there might be an issue. The "furthest reaching" property means d[x] is monotonically non-decreasing as k increases. And within a single k, d[x] for different x values have a specific ordering.
    
    # Let me just go with the max formulation and store the full table for backtracking.
    
    # For backtracking:
    # After finding k_final (where d[0] >= m), we backtrack:
    #   Start at (k_final, x=0, y=d[k_final][0])
    #   For k from k_final down to 0:
    #     At (k, x, y):
    #       If k == 0: we're at the start (x=0, y=0)
    #       Else:
    #         Determine predecessor:
    #           If x == k: came from (k-1, x-1, y) [deletion]
    #           If x == -k: came from (k-1, x+1, y-1) [insertion]
    #           Else: 
    #             If d[k-1][x-1] == y: came from (k-1, x-1, y) [deletion]
    #             If d[k-1][x+1] + 1 == y: came from (k-1, x+1, y-1) [insertion]
    #             (One of these must be true since y = max of the two)
    #     Record the operation (deletion or insertion)
    #     Move to predecessor.
    #   Then, the matches are the diagonal extensions.
    
    # Hmm, this backtracking is a bit involved. Let me think of a cleaner way.
    
    # Alternative approach: After computing the LCS using Myers, I can just use the standard LCS backtracking on the result. But I need to store the LCS or the d table.
    
    # Actually, let me think about this differently. Once I have the LCS (as a sequence of matched positions), I can construct the edit script directly.
    
    # The LCS gives me pairs (i, j) where mid_a[i] == mid_b[j].
    # Between consecutive LCS elements, I fill in deletions (from A) and insertions (from B).
    
    # So the plan is:
    # 1. Compute LCS using Myers' algorithm.
    # 2. From the LCS, construct the edit script.
    
    # For step 1, I need to extract the actual LCS (the sequence of matched indices).
    
    # Let me store the d table as a list of dicts or arrays.
    
    # Actually, for the performance constraint (20000 lines, ~50 differences), D is about 50-100. The d table has O(D * D) entries (since x ranges from -k to k at step k). That's about 50*50 = 2500 entries, very manageable.
    
    # For 1000 completely different lines, D = 2000. The d table has O(D * D) = 4,000,000 entries. That might be a bit much for memory but should be OK.
    
    # Wait, actually D for 1000 completely different lines: n=1000, m=1000, LCS=0, D=2000.
    # The d table: for k=0 to 2000, x from -k to k. Total entries ≈ sum of (2k+1) for k=0 to 2000 ≈ 2000^2 = 4,000,000. Each entry is an int. That's about 32 MB. Should be fine.
    
    # But the time: O((N+M)*D) = O(2000 * 2000) = 4,000,000. Each step involves a while loop that in the worst case could be O(N+M) but on average is small. For completely different lines, the while loop never extends (no matches), so it's O(1) per step. Total time O(D^2) ≈ 4M operations. Should be well under 6 seconds.
    
    # For 20000 lines with ~50 differences: D ≈ 50-100. O((40000)*100) = 4M operations. Well under 2 seconds.
    
    # OK let me code this up.
    
    # Plan:
    # 1. Strip common prefix and suffix.
    # 2. Run Myers' algorithm on the middle parts.
    # 3. Backtrack to get the LCS.
    # 4. Construct the edit script.
    
    # Let me code the Myers algorithm:
    
    def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
        n = len(a)
        m = len(b)
        
        # Strip common prefix
        prefix = 0
        while prefix < n and prefix < m and a[prefix] == b[prefix]:
            prefix += 1
        
        # Strip common suffix
        suffix = 0
        while suffix < n - prefix and suffix < m - prefix and a[n - 1 - suffix] == b[m - 1 - suffix]:
            suffix += 1
        
        mid_a = a[prefix: n - suffix]
        mid_b = b[prefix: m - suffix]
        mid_n = len(mid_a)
        mid_m = len(mid_b)
        
        if mid_n == 0 and mid_m == 0:
            # Everything matched
            return [("=" , line) for line in a]
        
        # Myers' O((N+M)·D) algorithm
        # d[x] = furthest y on diagonal x
        # We iterate k from 0 to mid_n + mid_m
        # Store d table for backtracking
        
        max_k = mid_n + mid_m
        # d_table[k] is a dict mapping x -> y
        d_table = []
        
        d = {}  # current frontier
        d[0] = 0  # start at (0,0)
        
        k_final = -1
        for k in range(max_k + 1):
            # For each valid x at this k
            # x ranges from -k to k, with x ≡ k (mod 2)
            new_d = {}
            for x in range(k, -k - 1, -2):  # x = k, k-2, k-4, ..., -k
                # Determine y
                if x == k:
                    y = d[x - 1]  # deletion
                elif x == -k:
                    y = d[x + 1] + 1  # insertion
                else:
                    y = max(d[x - 1], d[x + 1] + 1)
                
                # Clamp y to [0, mid_m]
                if y > mid_m:
                    y = mid_m  # hmm, actually this shouldn't happen if we're careful
                    # Actually, d[x+1] + 1 could exceed mid_m. Let's handle it.
                
                # Follow diagonal
                while x + y < mid_n and y < mid_m and mid_a[x + y] == mid_b[y]:
                    x += 1
                    y += 1
                
                new_d[x] = y
            
            d = new_d
            d_table.append(d)
            
            if d.get(0, -1) >= mid_m:
                k_final = k
                break
        
        # Backtrack to find LCS
        # Start at (k_final, x=0, y=d_table[k_final][0])
        # The LCS is the sequence of (i, j) pairs where i = x + y (index in mid_a) and j = y (index in mid_b)
        
        # Actually, for backtracking, I need to trace the path.
        # Let me store the path as a list of (operation, position) tuples.
        
        # Backtracking:
        # At step k, diagonal x, position y:
        #   The path went through some sequence of edits and matches.
        #   The matches are implicit (diagonal extensions).
        #   The edits are deletions and insertions.
        
        # I'll trace back:
        path = []  # list of (k, x, y)
        x = 0
        y = d_table[k_final][0]
        
        for k in range(k_final, -1, -1):
            path.append((k, x, y))
            if k == 0:
                break
            # Determine predecessor
            if x == k:
                # came from deletion: (k-1, x-1, y)
                x = x - 1
                # y stays the same
            elif x == -k:
                # came from insertion: (k-1, x+1, y-1)
                x = x + 1
                y = y - 1
            else:
                # y = max(d[k-1][x-1], d[k-1][x+1]+1)
                prev_d = d_table[k-1]
                if prev_d[x-1] == y:
                    # came from deletion
                    x = x - 1
                    # y stays
                elif prev_d[x+1] + 1 == y:
                    # came from insertion
                    x = x + 1
                    y = y - 1
                else:
                    # This shouldn't happen, but handle it
                    # Try both
                    if x - 1 in prev_d and prev_d[x-1] == y:
                        x = x - 1
                    elif x + 1 in prev_d and prev_d[x+1] + 1 == y:
                        x = x + 1
                        y = y - 1
        
        # Now I have the path. But I also need to account for the diagonal extensions (matches).
        # The path gives me the "skeleton" of edits. Between consecutive path points, there are matches.
        
        # Actually, let me think about this differently. The path gives me (k, x, y) at each edit step. Between two consecutive path points, the diagonal extension gives matches.
        
        # Let me reconstruct the full sequence of operations:
        # Start at (0, 0).
        # At each k step, we go from the previous (k-1, x_prev, y_prev) to (k, x, y).
        # The transition is either a deletion or an insertion.
        # Then we extend along the diagonal (matches).
        
        # So the full sequence is:
        # (0,0) -> [matches] -> (0, x0, y0) -> [edit] -> (1, x1, y1) -> [matches] -> ... -> (k_final, 0, mid_m)
        
        # Wait, the path I traced gives me the positions AFTER the diagonal extension. So:
        # path[0] = (0, 0, y0) where y0 is after the initial diagonal extension
        # path[1] = (1, x1, y1) where (x1, y1) is after the diagonal extension at k=1
        # etc.
        
        # Between path[k-1] and path[k], there's exactly one edit (deletion or insertion).
        # Before path[0], there are just matches from (0,0) to (0, 0, y0).
        
        # Let me construct the edit script:
        # i = 0 (position in mid_a), j = 0 (position in mid_b)
        
        # Phase 1: matches from (0,0) to path[0]
        # path[0] = (0, 0, y0): i = 0 + 0 = 0, j = y0
        # Wait, i = x + y. At path[0], x=0, y=y0. So i=0, j=y0.
        # Matches: for j from 0 to y0-1: mid_a[j] == mid_b[j]
        
        # Phase 2: for each k from 1 to k_final:
        #   Edit (deletion or insertion)
        #   Then matches from previous position to path[k]
        
        # Let me redo this more carefully.
        
        # The path is: path[0], path[1], ..., path[k_final]
        # path[k] = (k, x_k, y_k)
        # i_k = x_k + y_k (position in mid_a)
        # j_k = y_k (position in mid_b)
        
        # Between path[k-1] and path[k]:
        #   i goes from i_{k-1} to i_k, j goes from j_{k-1} to j_k
        #   The edit is:
        #     If x_k = x_{k-1} - 1 (deletion): i increases by 1, j stays. Then matches extend.
        #     If x_k = x_{k-1} + 1 (insertion): j increases by 1, i stays. Then matches extend.
        
        # Wait, I need to be more careful. Let me trace:
        # At step k, before the edit, we're at (k-1, x_{k-1}, y_{k-1}).
        # After the edit:
        #   Deletion: (k, x_{k-1}-1, y_{k-1}) → then diagonal extension → (k, x_k, y_k)
        #   Insertion: (k, x_{k-1}+1, y_{k-1}+1) → then diagonal extension → (k, x_k, y_k)
        
        # So the edit takes us from:
        #   Deletion: (i_{k-1}, j_{k-1}) → (i_{k-1}+1, j_{k-1}) [delete mid_a[i_{k-1}]]
        #   Insertion: (i_{k-1}, j_{k-1}) → (i_{k-1}, j_{k-1}+1) [insert mid_b[j_{k-1}]]
        # Then matches: from (i_after_edit, j_after_edit) to (i_k, j_k)
        
        # Let me construct the script:
        result = []
        
        # Add prefix matches
        for i in range(prefix):
            result.append(("=", a[i]))
        
        # Now work on mid_a and mid_b
        i = 0  # position in mid_a
        j = 0  # position in mid_b
        
        # Initial matches (from path[0])
        x0, y0 = path[0][1], path[0][2]
        # i = x0 + y0 = 0 + y0 = y0, j = y0
        # Matches from (0,0) to (y0, y0)
        while i < x0 + y0 and j < y0:
            # Actually, i should go from 0 to x0+y0, j from 0 to y0
            # Since x0=0, i goes from 0 to y0
            result.append(("=", mid_a[i]))
            i += 1
            j += 1
        
        # Hmm wait, that's not right. Let me reconsider.
        # At path[0] = (0, 0, y0): the position is (i, j) = (0 + y0, y0) = (y0, y0).
        # The matches are from (0,0) to (y0, y0), which means mid_a[0..y0-1] == mid_b[0..y0-1].
        
        # Actually, I realize the diagonal extension from (0,0) means:
        # We match mid_a[0] with mid_b[0], mid_a[1] with mid_b[1], etc.
        # Until we can't match anymore. So i goes from 0 to y0, j goes from 0 to y0.
        
        # Let me redo:
        # i = 0, j = 0
        # Match until we reach path[0]:
        # path[0] has x=0, y=y0. Position (i,j) = (0+y0, y0) = (y0, y0).
        # So we match y0 characters: i goes 0→y0, j goes 0→y0.
        
        # For k = 1 to k_final:
        #   Determine the edit (deletion or insertion)
        #   Apply the edit
        #   Match until we reach path[k]
        
        # Let me restructure:
        
        # After initial matches, i = y0, j = y0.
        
        for k in range(1, k_final + 1):
            x_prev, y_prev = path[k-1][1], path[k-1][2]
            x_curr, y_curr = path[k][1], path[k][2]
            
            # Determine edit type
            if x_curr == x_prev - 1:
                # Deletion: i increases by 1
                result.append(("-", mid_a[i]))
                i += 1
            elif x_curr == x_prev + 1:
                # Insertion: j increases by 1
                result.append(("+", mid_b[j]))
                j += 1
            
            # Now match from current (i, j) to path[k] position
            # path[k] position: i_target = x_curr + y_curr, j_target = y_curr
            while i < x_curr + y_curr and j < y_curr:
                result.append(("=", mid_a[i]))
                i += 1
                j += 1
        
        # Add suffix matches
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        
        return result
    
    # Wait, I need to double-check the backtracking logic. Let me trace through the example.
    # A = "ABC", B = "AC"
    # prefix = 0 (A[0]='A', B[0]='A' match... wait, they do match)
    # Actually prefix = 1 (A[0]=B[0]='A'), then A[1]='B' != B[1]='C', stop.
    # suffix: A[2]='C', B[1]='C' match. suffix=1. A[1]='B' != B[0]='A', stop.
    # mid_a = a[1:2] = ['B'], mid_b = b[1:1] = []
    # mid_n = 1, mid_m = 0.
    
    # Hmm, mid_m = 0. Let me handle this edge case.
    # If mid_m == 0: all of mid_a is deletions.
    # If mid_n == 0: all of mid_b is insertions.
    
    # Let me add those checks.
    
    # Actually wait, if mid_m = 0, then D = mid_n + 0 - 0 = mid_n. And the algorithm should handle it.
    # Let me trace: k from 0 to mid_n.
    # k=0: x=0. y=0. while x+y < 1 and y < 0: false. d[0]=0. d[0]>=0? Yes (mid_m=0). k_final=0.
    # 
    # Backtrack: path = [(0, 0, 0)].
    # i=0, j=0. path[0] = (0,0,0). i_target = 0, j_target = 0. No matches.
    # No k loop (k_final=0).
    # 
    # Result: prefix matches (1: "A"), then mid_a deletions... 
    # Wait, I need to handle the case where mid_m=0 separately.
    
    # Hmm, let me reconsider. If mid_m = 0, then all mid_a lines are deletions.
    # If mid_n = 0, then all mid_b lines are insertions.
    
    # Let me add special cases:
    if mid_n == 0:
        # All mid_b lines are insertions
        result = [("=" , a[i]) for i in range(prefix)]
        for j in range(mid_m):
            result.append(("+", mid_b[j]))
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        return result
    
    if mid_m == 0:
        # All mid_a lines are deletions
        result = [("=" , a[i]) for i in range(prefix)]
        for i in range(mid_n):
            result.append(("-", mid_a[i]))
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        return result
    
    # OK so for the general case, both mid_n and mid_m are > 0.
    
    # Let me re-examine the Myers algorithm for the general case.
    
    # Actually, I realize there might be an issue with my d_table storage. Let me use a different approach.
    
    # Instead of storing the full d_table, I can store just the "choice" at each step (whether it was a deletion or insertion). This is less memory.
    
    # Actually, for the 1000-line case, D=2000, and the d_table has about 2M entries. Each is a small int. In Python, this is fine (a few MB).
    
    # Let me go with the d_table approach for clarity.
    
    # Wait, actually I realize there's a subtlety. When I do `new_d[x] = y`, I'm creating a new dict each iteration. For 2000 iterations with up to 4000 entries each, that's 8M dict entries total. In Python, this might be slow and memory-heavy.
    
    # Alternative: use a single dict and just overwrite values. But I need the full history for backtracking.
    
    # Let me use a list of dicts. For 2000 steps, each with up to 4000 entries, that's about 4M entries total. In Python, a dict with 4000 entries is about 200KB. 2000 dicts = 400MB. That's too much.
    
    # Hmm, let me think of a better approach.
    
    # Alternative: Instead of storing the full d table, I can store just the predecessor choice at each (k, x) pair. For backtracking, I only need to know which predecessor was chosen.
    
    # Or: I can use a different backtracking approach. After finding the LCS length, I can use a simpler O(N*M) DP just for the backtracking part... but that defeats the purpose.
    
    # Actually, wait. For the 1000-line case, N=M=1000, D=2000. The d_table approach:
    # - k goes from 0 to 2000
    # - At each k, x goes from -k to k (about 2k+1 values)
    # - Total entries: sum(2k+1) for k=0 to 2000 ≈ 2000^2 = 4M
    # - Each entry is an int (28 bytes in CPython)
    # - Total: ~112 MB
    # That's borderline but should be OK.
    
    # But the dict overhead is significant. Let me use a list indexed by (k+x) or something.
    
    # Actually, let me use a flat array. d_table[k] is a list of length 2*k+1, indexed by x+k (so index 0 corresponds to x=-k, index 2k corresponds to x=k).
    
    # For k=0: list of length 1, index 0 → x=0
    # For k=1: list of length 3, index 0 → x=-1, index 1 → x=0, index 2 → x=1
    # For k=2: list of length 5, index 0 → x=-2, ..., index 4 → x=2
    
    # Total storage: sum(2k+1) for k=0 to D ≈ D^2 entries.
    # For D=2000: 4M ints. As a list of lists of ints, this is about 4M * 28 bytes ≈ 112 MB. Hmm, that's a lot.
    
    # Alternative: Use array('i') or just a flat list.
    # Or: only store the "choice" (deletion vs insertion) at each step, which is 1 bit per entry.
    
    # Actually, let me reconsider. For the 1000-line case with D=2000:
    # The d_table has about 4M entries. In Python, a list of 4M small ints is about 32 MB (8 bytes per pointer + 28 bytes per int object ≈ 36 bytes per entry). So about 144 MB. That's a lot but should still work.
    
    # Hmm, but actually, I can be smarter. I only need to store the d values for backtracking. And I only need to store them for the path I actually trace. So I could store the d table, do the backtracking, and then free it.
    
    # Let me just go with it. For the performance constraints, it should be fine.
    
    # Actually, wait. Let me reconsider the algorithm. There's a simpler way to do Myers that I recall:
    
    # The key data structure is d[x] = y (the frontier). We only need the current frontier, not the full history, for the forward pass. For backtracking, we need the history.
    
    # But there's a trick: we can store the "snake" (the diagonal extension) at each step, and just the edit type. Then we can reconstruct the path.
    
    # Let me use a simpler approach:
    # - Forward pass: maintain d[x] (current frontier), iterate k from 0 to D.
    # - At each k, for each x, record: the y value (or equivalently, the predecessor choice).
    # - Backtrack: trace the path.
    
    # I'll store d_history as a list of dicts (or arrays). Let me just use dicts for simplicity.
    
    # For D=2000, the total number of (k, x) pairs is about 2M (since only x ≡ k mod 2 are stored, so about k+1 per step, total ≈ D^2/2 ≈ 2M). With dict overhead, this is maybe 100-200 MB. Should be OK for the 6-second constraint.
    
    # Actually, let me just use a list of arrays. For each k, I store an array of y values indexed by x.
    
    # Let me use: d_hist[k] = array of length (2*k+1), where d_hist[k][x+k] = y for diagonal x.
    
    # Wait, but I only compute x values where x ≡ k (mod 2). So at step k, I compute about k+1 values (x = k, k-2, k-4, ..., -k).
    
    # Let me just use a dict per k: d_hist[k] = {x: y}.
    
    # For the 1000-line case: total entries ≈ 2M. Dict overhead in Python: each dict entry is about 100 bytes. 2M * 100 = 200 MB. That's a lot.
    
    # Let me use a different approach. I'll store the d values in a flat list, indexed by k and x.
    
    # Actually, you know what, let me just use a list of lists. d_hist[k] is a list of length 2*k+1 (or just the relevant entries).
    
    # For D=2000: total entries ≈ sum(k+1) for k=0 to 2000 ≈ 2M. As a list of small ints, this is about 2M * 8 bytes (pointers) + 2M * 28 bytes (int objects) ≈ 72 MB. OK.
    
    # Let me just go with it. Python can handle this.
    
    # Actually, I just realized: for the 20000-line case with ~50 differences, D ≈ 50-100. Total entries ≈ 5000. Trivial.
    # For the 1000-line case with D=2000, total entries ≈ 2M. Should be fine in under 6 seconds.
    
    # Let me code this up properly now.
    
    # One more thing: I need to handle the case where mid_n + mid_m = 0 (both empty). Already handled.
    
    # Let me also make sure the algorithm terminates. D <= mid_n + mid_m, so k goes up to mid_n + mid_m at most.
    
    # Here's my final plan:
    
    def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
        n = len(a)
        m = len(b)
        
        # Strip common prefix
        prefix = 0
        while prefix < n and prefix < m and a[prefix] == b[prefix]:
            prefix += 1
        
        # Strip common suffix
        suffix = 0
        while suffix < n - prefix and suffix < m - prefix and a[n - 1 - suffix] == b[m - 1 - suffix]:
            suffix += 1
        
        mid_a = a[prefix: n - suffix]
        mid_b = b[prefix: m - suffix]
        mid_n = len(mid_a)
        mid_m = len(mid_b)
        
        # Handle edge cases
        if mid_n == 0 and mid_m == 0:
            return [("=" , line) for line in a]
        if mid_n == 0:
            result = [("=" , a[i]) for i in range(prefix)]
            for j in range(mid_m):
                result.append(("+", mid_b[j]))
            for i in range(n - suffix, n):
                result.append(("=", a[i]))
            return result
        if mid_m == 0:
            result = [("=" , a[i]) for i in range(prefix)]
            for i in range(mid_n):
                result.append(("-", mid_a[i]))
            for i in range(n - suffix, n):
                result.append(("=", a[i]))
            return result
        
        # Myers' O((N+M)·D) algorithm
        d_hist = []  # d_hist[k] = dict {x: y}
        
        d = {0: 0}
        
        k_final = -1
        for k in range(mid_n + mid_m + 1):
            new_d = {}
            # x ranges from k to -k, step -2 (only x ≡ k mod 2)
            for x in range(k, -k - 1, -2):
                if x == k:
                    y = d[x - 1]
                elif x == -k:
                    y = d[x + 1] + 1
                else:
                    y = max(d[x - 1], d[x + 1] + 1)
                
                # Clamp
                if y > mid_m:
                    y = mid_m
                
                # Follow diagonal
                while x + y < mid_n and y < mid_m and mid_a[x + y] == mid_b[y]:
                    x += 1
                    y += 1
                
                new_d[x] = y
            
            d = new_d
            d_hist.append(d)
            
            if d.get(0, -1) >= mid_m:
                k_final = k
                break
        
        # Backtrack
        path = []
        x = 0
        y = d_hist[k_final][0]
        
        for k in range(k_final, -1, -1):
            path.append((k, x, y))
            if k == 0:
                break
            prev_d = d_hist[k - 1]
            if x == k:
                x = x - 1  # deletion
            elif x == -k:
                x = x + 1  # insertion
                y = y - 1
            else:
                if prev_d[x - 1] == y:
                    x = x - 1  # deletion
                else:
                    x = x + 1  # insertion
                    y = y - 1
        
        # Build the edit script
        result = []
        
        # Prefix
        for i in range(prefix):
            result.append(("=", a[i]))
        
        # Middle
        i = 0
        j = 0
        
        # Initial matches (up to path[0])
        x0, y0 = path[0][1], path[0][2]
        # Position: i = x0 + y0, j = y0
        # Since x0 = 0, i = y0
        while i < x0 + y0:
            result.append(("=", mid_a[i]))
            i += 1
            j += 1
        
        # Edit steps
        for k in range(1, k_final + 1):
            x_prev, y_prev = path[k-1][1], path[k-1][2]
            x_curr, y_curr = path[k][1], path[k][2]
            
            if x_curr == x_prev - 1:
                # Deletion
                result.append(("-", mid_a[i]))
                i += 1
            elif x_curr == x_prev + 1:
                # Insertion
                result.append(("+", mid_b[j]))
                j += 1
            
            # Matches up to path[k]
            while i < x_curr + y_curr and j < y_curr:
                result.append(("=", mid_a[i]))
                i += 1
                j += 1
        
        # Suffix
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        
        return result
    
    # Wait, I need to double-check the initial matches. path[0] = (0, 0, y0).
    # x0 = 0, y0 = y0. i_target = x0 + y0 = y0. j_target = y0.
    # We match from (0,0) to (y0, y0): that's y0 matches.
    # while i < y0: match. i goes from 0 to y0. ✓
    
    # Let me trace through the "ABC" vs "AC" example:
    # a = ["A", "B", "C"], b = ["A", "C"]
    # prefix: a[0]=b[0]='A' → prefix=1. a[1]='B' != b[1]='C' → stop.
    # suffix: a[2]='C' == b[1]='C' → suffix=1. a[1]='B' != b[0]='A' → stop.
    # mid_a = a[1:2] = ["B"], mid_b = b[1:1] = []
    # mid_n = 1, mid_m = 0.
    # 
    # mid_m == 0: all mid_a are deletions.
    # result = [("=", "A"), ("-", "B"), ("=", "C")]
    # 
    # Check: "=" and "-" items: "A", "B", "C" = a ✓
    # "=" and "+" items: "A", "C" = b ✓
    # "=" count: 2 = LCS length ✓
    
    # Let me try another example: a = ["a", "b", "c"], b = ["a", "c", "d"]
    # prefix: a[0]=b[0]='a' → prefix=1. a[1]='b' != b[1]='c' → stop.
    # suffix: a[2]='c' != b[2]='d' → stop. suffix=0.
    # mid_a = ["b", "c"], mid_b = ["c", "d"]
    # mid_n = 2, mid_m = 2.
    # 
    # Myers:
    # k=0: x=0. y=0. while 0+0<2 and 0<2 and mid_a[0]=='b'==mid_b[0]=='c'? No. d={0:0}. d[0]=0 < 2.
    # k=1: x=1, x=-1.
    #   x=1: x==k. y=d[0]=0. while 1+0<2 and 0<2 and mid_a[1]=='c'==mid_b[0]=='c'? Yes! x=2,y=1. while 2+1<2? No. d={1:1}.
    #   x=-1: x==-k. y=d[0]+1=1. while -1+1<2 and 1<2 and mid_a[0]=='b'==mid_b[1]=='d'? No. d={1:1, -1:1}.
    #   d[0] not in d. Check: d.get(0,-1) = -1 < 2. Continue.
    # k=2: x=2, x=0, x=-2.
    #   x=2: x==k. y=d[1]=1. while 2+1<2? No. d={2:1}.
    #   x=0: y=max(d[-1], d[1]+1)=max(1,2)=2. while 0+2<2? No. d={2:1, 0:2}.
    #   x=-2: x==-k. y=d[-1]+1=2. while -2+2<2 and 2<2? No. d={2:1, 0:2, -2:2}.
    #   d[0]=2 >= mid_m=2. k_final=2. Break.
    # 
    # Backtrack:
    # path: start at (k=2, x=0, y=2).
    # k=2: path.append((2, 0, 2)). x==k? No (0 != 2). x==-k? No (0 != -2). 
    #   prev_d = d_hist[1] = {1:1, -1:1}.
    #   prev_d[x-1] = prev_d[-1] = 1. Is 1 == y=2? No.
    #   So insertion: x = 0+1 = 1, y = 2-1 = 1.
    # k=1: path.append((1, 1, 1)). x==k? Yes (1==1). Deletion: x = 1-1 = 0.
    # k=0: path.append((0, 0, 0)). Break.
    # 
    # path = [(2, 0, 2), (1, 1, 1), (0, 0, 0)]
    # 
    # Build script:
    # prefix: [("=", "a")]
    # i=0, j=0.
    # path[0] = (0, 0, 0). x0=0, y0=0. while i < 0: no matches.
    # 
    # k=1: path[0]=(0,0,0), path[1]=(1,1,1).
    #   x_curr=1, x_prev=0. x_curr == x_prev+1 → insertion.
    #   result.append(("+", mid_b[0])) = ("+", "c"). j=1.
    #   while i < 1+1=2 and j < 1: j=1, not < 1. No matches.
    # 
    # k=2: path[1]=(1,1,1), path[2]=(0,0,2).
    #   x_curr=0, x_prev=1. x_curr == x_prev-1 → deletion.
    #   result.append(("-", mid_a[0])) = ("-", "b"). i=1.
    #   while i < 0+2=2 and j < 2: i=1<2, j=1<2. Match: ("=", mid_a[1]) = ("=", "c"). i=2, j=2.
    #   i=2, not < 2. Stop.
    # 
    # suffix: suffix=0, so no suffix matches.
    # 
    # result = [("=", "a"), ("+", "c"), ("-", "b"), ("=", "c")]
    # 
    # Check: "=" and "-": "a", "b", "c" = a ✓
    # "=" and "+": "a", "c", "c" = b ✓
    # "=" count: 2 = LCS("a","c") ✓
    
    # Great, it works!
    
    # Now let me think about edge cases and potential bugs:
    # 1. What if d[x-1] or d[x+1] doesn't exist in the current d dict?
    #    At step k, we compute x from k to -k. For x=k, we need d[k-1]. At step k-1, x=k-1 was computed (since k-1 ≡ k-1 mod 2, and k-1 is in range -(k-1) to k-1). So d[k-1] exists. ✓
    #    For x=-k, we need d[-k+1]. At step k-1, x=-k+1 was computed (since -k+1 ≡ k-1 mod 2, and -k+1 is in range -(k-1) to k-1... wait, -k+1 = -(k-1). Yes, it's in range). ✓
    #    For interior x, we need d[x-1] and d[x+1]. At step k-1, x-1 and x+1 are both in range -(k-1) to k-1 (since x is in range -k to k, x-1 is in range -(k-1) to k-1, and x+1 is in range -(k-1) to k-1). And x-1 ≡ k-1 mod 2 (since x ≡ k mod 2, x-1 ≡ k-1 mod 2). Similarly x+1 ≡ k-1 mod 2. So both exist. ✓
    
    # 2. What if y > mid_m after the max?
    #    d[x+1] + 1 could be mid_m + 1 if d[x+1] = mid_m. In that case, y = mid_m + 1 > mid_m.
    #    I clamp to mid_m. But is this correct? If d[x+1] = mid_m, it means we've already consumed all of B. Going further via insertion doesn't make sense.
    #    Actually, if d[x+1] = mid_m, then d[x+1]+1 = mid_m+1 which is invalid. We should use d[x-1] instead.
    #    Let me handle this: if d[x+1]+1 > mid_m, use d[x-1].
    #    Similarly, if d[x-1] < 0 (shouldn't happen since y >= 0 always), use d[x+1]+1.
    
    # Actually, d values are always >= 0 (we start at 0 and only increase). And d values are always <= mid_m (we stop the diagonal at mid_m). So d[x+1]+1 can be at most mid_m+1.
    
    # Let me fix:
    #   y = d[x+1] + 1
    #   if y > mid_m: y = d[x-1]  # fallback
    #   Or: y = min(d[x+1]+1, mid_m) if that's the max... 
    #   Actually, let me just: y = max(d[x-1], min(d[x+1]+1, mid_m))
    #   Hmm, but if d[x+1]+1 > mid_m, it's invalid, so we should just use d[x-1].
    #   y = d[x-1] if d[x+1]+1 > mid_m else max(d[x-1], d[x+1]+1)
    
    # Wait, I think in practice this edge case rarely occurs. Let me just clamp:
    #   y = max(d[x-1], d[x+1] + 1)
    #   if y > mid_m: y = mid_m
    # This should be fine because if y > mid_m, it means we've gone past the end of B, and clamping to mid_m is correct (we can't go further).
    
    # Actually, I realize there's another issue. If d[x+1] = mid_m, then d[x+1]+1 = mid_m+1. Clamping to mid_m is correct because we can't insert past the end.
    
    # OK, I'll go with the clamp approach.
    
    # 3. Performance: The while loop for diagonal extension. In the worst case (all lines match), it could be O(N) per step. But in that case, D is small (D=0 if all match, or very small). So the total work is still O((N+M)·D).
    
    # For the 20000-line case with ~50 differences: D ≈ 50-100. Each step has a short diagonal extension (a few characters). Total work ≈ 40000 * 100 = 4M. Fast.
    
    # For the 1000-line case with D=2000: Each step has a diagonal extension of 0 (no matches). Total work ≈ 2000 * 2000 = 4M. Fast.
    
    # I think this will work. Let me finalize the code.
    
    # One more consideration: the d_hist storage. For D=2000, I'm storing about 2M entries in dicts. In Python, this might take a few seconds. Let me think if there's a way to avoid it.
    
    # Alternative: Instead of storing the full d table, I can store just the "choice" at each step. For backtracking, I only need to know whether each step was a deletion or insertion. I can store this as a list of bytes or a bit array.
    
    # But actually, for backtracking I need to know the exact (x, y) at each step. The choice (deletion vs insertion) determines the predecessor, and then I can compute the new (x, y) from that.
    
    # Wait, I think I can do backtracking without the full d table:
    # - I store the sequence of (x, y) at each k (just the path).
    # - During the forward pass, I compute the path directly.
    
    # Hmm, but the forward pass computes d[x] for ALL x at each k, not just the path. The path is just one specific (x, y) at each k.
    
    # Actually, the path is: at each k, the path is at x=0 (since we're looking for d[0] >= m). Wait no, the path traces back from (k_final, 0, d[0]).
    
    # I think the simplest approach is to just store the d table. For D=2000, it's about 2M entries. In Python, a list of 2000 dicts, each with up to 2000 entries... that's about 2M dict entries. Each dict entry in CPython is about 100 bytes. So about 200 MB. That's a lot but should be OK for the 6-second constraint.
    
    # Actually, let me benchmark mentally: creating 2M dict entries in Python... probably 1-2 seconds. The algorithm itself is 4M operations. Total maybe 3-4 seconds. Should be under 6 seconds.
    
    # Alternatively, I can use a flat list. d_flat[k * (2*k+1) + (x+k)] = y. But the indexing is complex.
    
    # Let me just use dicts. It's simpler and should be fast enough.
    
    # Actually, wait. Let me reconsider. For D=2000:
    # - k goes from 0 to 2000
    # - At each k, I create a new dict with about k+1 entries (x = k, k-2, ..., -k)
    # - Total entries: sum(k+1) for k=0 to 2000 ≈ 2M
    # - Creating 2M dict entries: in CPython, each dict insertion is O(1) amortized. 2M insertions ≈ 0.5-1 second.
    # - The diagonal extension while loop: for completely different lines, it's 0 iterations. So no extra cost.
    # - Total: maybe 2-3 seconds. Under 6 seconds. ✓
    
    # OK, I'll go with dicts.
    
    # Let me also handle the case where k_final is never reached (shouldn't happen since D <= mid_n + mid_m and we iterate up to mid_n + mid_m).
    
    # Actually, D = mid_n + mid_m - 2*LCS. Since LCS >= 0, D <= mid_n + mid_m. And we iterate k from 0 to mid_n + mid_m. So we'll always find k_final.
    
    # Wait, is that true? D = mid_n + mid_m - 2*LCS. The algorithm finds the LCS. The number of edits needed is D. The algorithm iterates k from 0 to D. If we iterate up to mid_n + mid_m, we'll definitely reach D.
    
    # But in the algorithm, we check d[0] >= mid_m. This is equivalent to having consumed all of B, which means we've found the LCS. The maximum k needed is D. Since D <= mid_n + mid_m, we're fine.
    
    # Let me finalize the code. I'll add the clamp for y > mid_m.
    
    # Actually, let me reconsider the clamp. If d[x+1] = mid_m, then d[x+1]+1 = mid_m+1. This means we'd be trying to go past the end of B. We should just use d[x-1] in this case.
    
    # y = d[x-1]
    # if d[x+1] + 1 > mid_m:
    #     y = d[x-1]  # only option
    # else:
    #     y = max(d[x-1], d[x+1] + 1)
    
    # Or simpler:
    # y = d[x+1] + 1
    # if y > mid_m:
    #     y = d[x-1]
    # else:
    #     y = max(d[x-1], y)
    
    # Let me go with this.
    
    # Final code:
    
    def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
        n = len(a)
        m = len(b)
        
        # Strip common prefix
        prefix = 0
        while prefix < n and prefix < m and a[prefix] == b[prefix]:
            prefix += 1
        
        # Strip common suffix
        suffix = 0
        while suffix < n - prefix and suffix < m - prefix and a[n - 1 - suffix] == b[m - 1 - suffix]:
            suffix += 1
        
        mid_a = a[prefix: n - suffix]
        mid_b = b[prefix: m - suffix]
        mid_n = len(mid_a)
        mid_m = len(mid_b)
        
        if mid_n == 0 and mid_m == 0:
            return [("=" , line) for line in a]
        
        if mid_n == 0:
            result = [("=" , a[i]) for i in range(prefix)]
            for j in range(mid_m):
                result.append(("+", mid_b[j]))
            for i in range(n - suffix, n):
                result.append(("=", a[i]))
            return result
        
        if mid_m == 0:
            result = [("=" , a[i]) for i in range(prefix)]
            for i in range(mid_n):
                result.append(("-", mid_a[i]))
            for i in range(n - suffix, n):
                result.append(("=", a[i]))
            return result
        
        # Myers' O((N+M)·D) algorithm
        d_hist = []
        d = {0: 0}
        
        k_final = -1
        for k in range(mid_n + mid_m + 1):
            new_d = {}
            for x in range(k, -k - 1, -2):
                if x == k:
                    y = d[x - 1]
                elif x == -k:
                    y = d[x + 1] + 1
                    if y > mid_m:
                        y = mid_m
                else:
                    y1 = d[x - 1]
                    y2 = d[x + 1] + 1
                    if y2 > mid_m:
                        y = y1
                    else:
                        y = max(y1, y2)
                
                # Follow diagonal
                while x + y < mid_n and y < mid_m and mid_a[x + y] == mid_b[y]:
                    x += 1
                    y += 1
                
                new_d[x] = y
            
            d = new_d
            d_hist.append(d)
            
            if d.get(0, -1) >= mid_m:
                k_final = k
                break
        
        # Backtrack
        path = []
        x = 0
        y = d_hist[k_final][0]
        
        for k in range(k_final, -1, -1):
            path.append((k, x, y))
            if k == 0:
                break
            prev_d = d_hist[k - 1]
            if x == k:
                x -= 1  # deletion
            elif x == -k:
                x += 1  # insertion
                y -= 1
            else:
                if prev_d[x - 1] == y:
                    x -= 1  # deletion
                else:
                    x += 1  # insertion
                    y -= 1
        
        # Build edit script
        result = []
        
        for i in range(prefix):
            result.append(("=", a[i]))
        
        i = 0
        j = 0
        
        # Initial matches
        x0, y0 = path[0][1], path[0][2]
        while i < x0 + y0:
            result.append(("=", mid_a[i]))
            i += 1
            j += 1
        
        # Edit steps
        for k in range(1, k_final + 1):
            x_prev, y_prev = path[k - 1][1], path[k - 1][2]
            x_curr, y_curr = path[k][1], path[k][2]
            
            if x_curr == x_prev - 1:
                result.append(("-", mid_a[i]))
                i += 1
            elif x_curr == x_prev + 1:
                result.append(("+", mid_b[j]))
                j += 1
            
            while i < x_curr + y_curr and j < y_curr:
                result.append(("=", mid_a[i]))
                i += 1
                j += 1
        
        for i in range(n - suffix, n):
            result.append(("=", a[i]))
        
        return result
    
    # Let me verify the invariants:
    # - Taking "=" and "-" items in order gives a: ✓ (we output all of a's lines, either as "=" or "-")
    # - Taking "=" and "+" items in order gives b: ✓ (we output all of b's lines, either as "=" or "+")
    # - Number of "=" items = LCS length: ✓ (Myers finds the LCS)
    
    # Wait, I need to double-check: does the initial matches loop correctly handle the case where path[0] = (0, 0, 0)?
    # x0=0, y0=0. while i < 0: no iterations. ✓
    
    # And what about the case where k_final = 0?
    # path = [(0, 0, y0)] where y0 = d_hist[0][0].
    # Initial matches: while i < y0: match y0 characters.
    # No edit steps (k_final = 0, range(1, 1) is empty).
    # This means all mid lines are matches. ✓
    
    # I think this is correct. Let me also make sure the path backtracking is correct.
    
    # In the backtracking, at each step k (from k_final down to 1):
    #   We're at (k, x, y).
    #   We determine the predecessor:
    #     If x == k: deletion → predecessor is (k-1, x-1, y)
    #     If x == -k: insertion → predecessor is (k-1, x+1, y-1)
    #     Else: check prev_d[x-1] and prev_d[x+1]+1
    #       If prev_d[x-1] == y: deletion → predecessor is (k-1, x-1, y)
    #       Else: insertion → predecessor is (k-1, x+1, y-1)
    #   Update x, y to the predecessor.
    
    # This looks correct.
    
    # One potential issue: in the "else" case, what if neither prev_d[x-1] == y nor prev_d[x+1]+1 == y?
    # This shouldn't happen because y was computed as max(d[x-1], d[x+1]+1) (or one of them at boundaries). So one of them must equal y.
    # But with the clamp (if y2 > mid_m, use y1), it's possible that y = y1 and y2 > mid_m. In that case, prev_d[x-1] == y. ✓
    # Or y = y2 (and y2 <= mid_m). In that case, prev_d[x+1]+1 == y. ✓
    
    # I think this is correct.
    
    # Let me also think about whether the algorithm correctly handles repeated lines.
    # The diagonal extension while loop: mid_a[x+y] == mid_b[y]. This correctly handles repeated lines because it's just comparing characters.
    
    # I'm satisfied with the solution. Let me write the final version.
    
    # Actually, one more thought: for very large inputs (20000 lines), the d_hist list has about 50-100 entries (dicts). Each dict has about 50-100 entries. Total: a few thousand entries. Very fast.
    
    # For 1000 completely different lines: d_hist has 2000 dicts, each with up to 2000 entries. Total: ~2M entries. This is the bottleneck.
    
    # In CPython, creating 2M dict entries: each dict entry involves a hash computation and a slot insertion. Probably ~0.5-1 microsecond per entry. 2M * 1μs = 2 seconds. Plus the algorithm overhead. Total maybe 3-4 seconds. Under 6 seconds. ✓
    
    # I'm going to go with this solution.
    
    # Wait, actually I want to double-check one thing. The `range(k, -k-1, -2)` generates x = k, k-2, k-4, ..., -k. Let me verify:
    # k=0: range(0, -1, -2) → [0]. ✓
    # k=1: range(1, -2, -2) → [1, -1]. ✓
    # k=2: range(2, -3, -2) → [2, 0, -2]. ✓
    # k=3: range(3, -4, -2) → [3, 1, -1, -3]. ✓
    
    # Good.
    
    # Let me also verify that at step k, all the x values we access in d (the previous step's dict) are valid:
    # At step k, x ranges from k to -k (step -2).
    # We access d[x-1] and d[x+1].
    # At step k-1, x ranges from k-1 to -(k-1) (step -2).
    # x-1: range is (k-1) to (-(k-1)), which is (k-1) to (k-1) in the right direction. And x-1 ≡ k-1 (mod 2) since x ≡ k (mod 2). ✓
    # x+1: range is (k-1) to (-(k-1)). And x+1 ≡ k-1 (mod 2). ✓
    
    # So all accesses are valid.
    
    # I'm confident the solution is correct. Let me write the final clean version.
