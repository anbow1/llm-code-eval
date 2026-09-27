We need answer user with Python code only in final. Must implement diff_lines returning shortest edit script minimal LCS via Myers O((N+M)D). Need careful, standard lib only. Need code block only. Let's analyze algorithm.

We need function diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
- returns edit script: ("=", line) for common subsequence, ("-", line) for only in a, ("+", line) for only in b.
- Order such that filtering =/- yields a, =/+ yields b. This is essentially interleaving deletions, insertions, equals in sequence of edit operations aligned with input lines.
- Need maximize #equals = LCS length. Minimal edit (LCS). Lines repeat.
- Performance: 20k lines with ~50 differences, under 2 sec; completely different 1k under 6 sec. Standard Myers with linear-space? Myers O(NM) memory if DP? O((N+M)D) time but memory can be O(D) for one wave? Need backtrack to produce script. For 20k D~50, full DP table 400M impossible. Need memory-efficient Myers (linear space) or Hirschberg? Myers algorithm can compute LCS length with O(D) memory but only gives length? To output script, need recursive divide-and-conquer using Myers' shortest path in grid with O(NM)? Let's think.

Myers' diff algorithm (as in diffutils) O(ND) time, O(D) space for edit script? It uses forward and backward searches and recursively splits. The classic algorithm from Myers 1986 "An O(ND) Difference Algorithm" computes edit script in O(ND) time and O(N+M) space? There is linear-space version via divide-and-conquer: find a diagonal k where shortest path crosses, split. Need implement efficient.

Alternative: Since D small for 20k 50, can use bit-parallel LCS? Python ints bitset algorithm for LCS O(ceil(M/word) * N) maybe. For M=1000, N=1000, bitset operations ~1000 big int ops, trivial. For 20k and 20k? But D small, M maybe 20k. Bitset O(N*M/word) = 20k * (20k/word ~313 64-bit? Python big ints) = 6.26M word ops in C? Could be okay? But if 20k x 20k bitset: each operation on 20k-bit int, 20k iterations, ~20k * 313 = 6.26M 30-bit limbs maybe, perhaps under seconds? But worst two different lists 1000 under 6 sec easy. Need guarantee? Bitset algorithm can produce LCS length and maybe backtrack to produce script. It is O(N * (M/word) + LCS backtrack). To produce script, need DP table? Could store bitmasks per row? For M=20k, storing 20k bitsets of 20k bits ~50 MB? Actually 20k*2.5KB = 50MB per bitset? Wait 20k bits = 2.5 KB, * 20k = 50 MB. Acceptable? Python int overhead ~2.5KB + overhead, 20k => 50MB maybe okay. But if M,N 20k, memory 50MB maybe okay? If we need bitset table for backtracking could be 50MB (plus). But time? For 20k x 20k with many differences? Performance spec only 20k with 50 diff, but could worst? They ask Myers hint. Need robust.

Bit-parallel LCS algorithm (Allison-Dix?) computes row bitsets. To reconstruct, can store row masks and backtrack by checking membership. For LCS length up to min(N,M). But reconstruction with bitsets: If we have for each i row mask S_i representing DP frontier? Let's derive.

Standard bitset LCS:
Let M = len(B). For each char/line in A, update bitset S:
x = S | B_mask[char]
y = (S << 1) | 1
S = x & ~(x - y) maybe (depending). At row i, S has bits set where dp[i][j] > dp[i][j-1]? Actually bitset represents columns where LCS length increases from previous column? Let's recall.
From Hyyrö algorithm: For string A length n, B length m, precompute M[c] bitset with bit j if B[j] == c.
S = 0
for i in 1..n:
    x = S | M[A[i]]
    y = (S << 1) | 1
    S = x & ~(x - y)
At end popcount(S) = LCS length.
The bit j (0-index) is set iff LCS(A[:i], B[:j+1]) > LCS(A[:i], B[:j])? Let's verify. It marks positions in B where diagonal? For reconstruction, can use saved S_i for each i, and also S_{i-1} maybe. We need output edit script (LCS alignment). Given row i, to decide whether A[i-1] matches B[j-1] and is included. Standard backtracking using row bitsets:
For i from n down to 1:
  if i < n? We have S_i and S_{i-1}. Need find j such that A[i-1] == B[j-1] and LCS(A[:i-1], B[:j-1]) = LCS(A[:i], B[:j]) - 1 and LCS(A[:i-1], B[:j]) = LCS(A[:i-1], B[:j-1])? Hmm.
Could reconstruct by computing dp matrix values implicitly from bitsets? Need method.
S_i bitset: bits where dp_i[j] > dp_i[j-1]. Also relation to previous row: dp_i[j] = dp_{i-1}[j] + [bit?]? Let's derive.
If we have S_i for each i, dp_i[0]=0, and dp_i[j] = sum_{k=0}^{j-1} bit k of S_i? Is that true? The bitset S_i marks columns where dp increases. Since dp values are nondecreasing by at most 1 per column. Starting dp_i[0]=0. Yes dp_i[j] = popcount(S_i & ((1<<j)-1))? Because each set bit increases by 1. For row i. Thus dp_i[j] = number of set bits in S_i bits 0..j-1 (assuming bit index 0 corresponds B[0]).
Similarly dp_{i-1}[j].
To backtrack, for i = n..1:
 Need decide if a[i-1] used (match with some b[j-1]). If used, we move diagonally: j_prev = j-1, i_prev = i-1. Condition for A[i-1] == B[j-1] and dp_i[j] = dp_{i-1}[j-1] + 1, plus dp_i[j-1] = dp_{i-1}[j-1], dp_{i-1}[j] = dp_{i-1}[j-1]? For optimal path? We need choose some valid j at current frontier.
At each step, current (i,j) with known dp_i[j] = remaining LCS length? Starting i=n,j=m. We want path backward to (0,0). At (i,j), options: if i>0 and j>0 and a[i-1]==b[j-1] and dp_i[j] == dp_{i-1}[j-1]+1, we can take match. Else if i>0 and dp_i[j] == dp_{i-1}[j], move up (delete a). Else if j>0 and dp_i[j] == dp_i[j-1], move left (insert b). This standard DP backtracking.
Given row bitsets, can compute dp values. But doing popcount each step O(LCS * M/word) too slow maybe (20k*313). But D small? In worst LCS ~20k, steps ~20k, each computing several popcounts on big ints up to 20k bits -> 20k*313*? maybe 6M limbs, okay maybe. But finding match j may require search.
Alternative: Use S_i to find candidate j. For current (i,j), if we want match a[i-1] to some b position < j. We can find the largest j < current_j such that a[i-1] == b[j-1] and bit j-1 set in S_i? Let's derive.
If a[i-1] matches b[j-1] and is used, then dp_i[j] = dp_{i-1}[j-1]+1, and bit j-1 in S_i is set? Since dp_i[j] > dp_i[j-1]. If used match at j, dp_i[j] increases by 1 at column j, so bit j-1 set. Also dp_{i-1}[j] = dp_{i-1}[j-1] (no increase in previous row at j). Condition dp_i[j] == dp_{i-1}[j-1]+1. How check via bits?
Maybe choose the rightmost set bit in S_i among positions <= j-1 that correspond to a[i-1] and where previous row has no increase at that position? Let's test.
From properties: dp_i[j] = dp_{i-1}[j] + 1 iff bit j-1 in S_i is set? Not exactly; if bit set, dp_i[j]=dp_i[j-1]+1. But dp_i[j] could be dp_{i-1}[j]+? DP recurrence: dp_i[j] = max(dp_{i-1}[j], dp_i[j-1], dp_{i-1}[j-1]+match). If bit j-1 set, dp_i[j] = dp_i[j-1]+1 = dp_{i-1}[j] maybe? Let's examine.
Maybe bit j-1 set iff dp_i[j] = dp_{i-1}[j] + 1? Let's test with A='A', B='A'. S_1 bits? M['A']=1. x=1, y=1, S=1 & ~(1-1)=1. bit0 set. dp_1[1]=1, dp_0[1]=0, so dp_i[j]=dp_{i-1}[j]+1. Also dp_i[j-1]=0.
A='AB', B='BA'. Row1 for A: S bits? B='BA'. M[A]=2 (bit1). S0=0; x=2,y=1,S=2 & ~(2-1=1)=2 & ~1 =2. bit1 set. dp row1: [0,0,1]. bit0? no, bit1 yes. dp_i[j]=dp_{i-1}[j]+1 only at j=2? dp_1[2]=1, dp_0[2]=0 yes. Row2 for B: M[B]=1; x=S|1=3; y=(2<<1)|1=5; x-y=-2? unsigned? x - y negative; ~ negative? Python infinite. Need mask? x & ~(x-y) = 3 & ~(-2) = 3 & ...111010? ~-2 = 1? Wait ~(-2)=1. 3&1=1. S=1. dp row2: [0,1,1]. bit0 set; dp_i[1]=1, dp_prev[1]=0 yes. Good.
A='A', B='AA'. S row1: M[A]=3; x=3,y=1, x-y=2, ~2=...1101? 3&~2=1. S=1. bits: bit0 set, bit1 not. dp: [0,1,1]. dp_i[1]=dp_prev[1]+1 yes, dp_i[2]=1 not +1. Good.
Maybe bit set iff dp_i[j] = dp_{i-1}[j]+1? Let's prove: S bits where vertical difference? In bitset algorithm, S = x & ~(x - y), with x = S_prev | M, y = (S_prev <<1)|1. The resulting S bits are where dp_i[j] = dp_{i-1}[j] + 1. I think yes (called bit vector for row i). If so, dp_i[j] - dp_{i-1}[j] = bit j-1 of S_i. And dp_i[j] = dp_i[0] + prefix popcount of S_i bits up to j-1? Since dp_i[0]=0 and difference with previous column? Wait if bit j-1 set iff dp_i[j] > dp_i[j-1]? But vertical difference? Let's test row1 A='A', B='AA': bit0 set, bit1 not. dp row [0,1,1]. vertical diff row1 vs row0 [0,1,1] same as horizontal increments [bit0=1, bit1=0]. So both coincide? In general DP row is nondecreasing by 0/1. Vertical diff from previous row also nondecreasing? Maybe row difference equals row increments. Actually dp_i[j] is prefix sum of S_i bits and also dp_{i-1}[j] + prefix? Need relation S_i = S_{i-1} shifted? Let's test with A='AB', B='ACB'. Compute manually:
Row0 [0,0,0,0]
Row1 A: B='A C B'; dp [0,1,1,1]; S1 bits [1,0,0]
Row2 B: dp [0,1,1,2]; S2 bits [1,0,1]? dp row increments [1,0,1]. Vertical diff row2-row1 [1,0,1]. same.
Seems row increments = vertical difference? DP property: dp_i[j]-dp_i[j-1] = dp_{i-1}[j]-dp_{i-1}[j-1] unless match? Wait if match, dp_i[j]=dp_{i-1}[j-1]+1 may be either. In examples same. Let's prove? The bitset S_i stores bits where row i increases horizontally. But due to monotonicity, horizontal increments equal vertical differences? Counterexample A='A', B='B'. row1 [0,0]; S=0. vertical diff [0,0]. ok. A='BA', B='AB'. Row1 B: [0,0,1], bits [0,1]; row2 A: [0,1,1], bits [1,0]; vertical diff row2-row1 [1,1,0]? row1 [0,0,1], row2 [0,1,1]: diff [0,1,0]. Wait horizontal bits row2 [1,0]. Not same! Let's compute bitset algorithm: B string indices 0 A,1 B. M['B']=2. Row1 S=2 (bit1). M['A']=1. S_prev=2. x=3, y=5, x-y=-2, ~(-2)=1, S=1 (bit0). Bits [1,0]. Row DP actual: A='BA', B='AB'. dp row2: j0=0, j1 (A) match ->1, j2 (B) max(dp1[2]=1, dp2[1]=1, match? no) ->1. So [0,1,1], increments [1,0]. vertical diff row2-row1 [0,1,0] at j1 diff1, j2 diff0. Not equal. So bit not vertical diff; bit is horizontal increment.

Thus dp_i[j]=prefix popcount of S_i bits up to j-1. Good. dp_{i-1}[j] from S_{i-1}. We can reconstruct with prefix counts.

Backtracking standard:
Start i=n, j=m.
while i>0 or j>0:
 if i>0 and j>0 and a[i-1]==b[j-1] and dp_i[j] == dp_{i-1}[j-1] + 1:
    match: append ('=', a[i-1]), i-=1, j-=1
 elif i>0 and dp_i[j] == dp_{i-1}[j]:
    delete: append ('-', a[i-1]); i-=1
 elif j>0 and dp_i[j] == dp_i[j-1]:
    insert: append ('+', b[j-1]); j-=1
 else? (shouldn't)

Need efficient. Computing dp_i[j] requires popcount of S_i masked to j bits. Could be expensive if done many times. We can optimize by using bitsets to find candidates.

But storing all rows S_i for i=1..n as Python ints. For n=20k, m=20k, 20k ints of 20k bits. Memory ~ n*m/8 = 50MB plus overhead ~ maybe 60MB. Acceptable? Might be high but okay. But for two completely different 1k, table small. For performance 20k x 20k with D=50, bitset loop n=20k, each big int op on 20k bits ~ maybe 0.1-0.5s? Actually Python big int operations on 20k bits = ~334 30-bit limbs. 20k iterations * (x|, shift, subtract, invert, and, popcount maybe not each loop) ~ 20k*5*334 limb ops in C ~ 33M limb ops, could be maybe <1s. Storing rows each int copy: 20k * 2.5KB = 50MB memory copy, okay. But if m large and n=20k, maybe 50MB. If both 20k? spec only two lists of 20k differ 50, m ~20k. Okay.

But bitset algorithm complexity O(n * m/word) not O((n+m)D); for 20k with D=50 fine? m=20k, n=20k => 6M word ops, likely under 2s? Python overhead 20k loop, each big int op in C; maybe 0.1-0.3s? Let's estimate: Python big int bitwise on 20k bits maybe ~1 microsecond? Actually 20k bits = 2500 bytes; bitwise allocation 2.5KB each op, 4 ops => 10KB allocated per iteration *20k = 200MB memory traffic, maybe 0.1-0.5s. Popcount at end maybe. Storing rows appends int object (copy) 50MB. Should be okay. But worst completely different 1000: trivial. The performance hint Myers, but bitset may pass? Need ensure minimal LCS for repeated lines. Yes bitset LCS gives LCS length and can reconstruct minimal.

However, bitset reconstruction using stored rows could be heavy if we compute popcounts many times. We can do better using bit operations to find decisions in O(operations per line) maybe. Need design robust and efficient.

Option 1: Store DP rows as bitsets, backtrack using a helper popcount masked. Number of steps = len(script) = n+m-LCS = up to 40000 for 20k diff 50? Actually if D=50 edits, script length ~40050. Steps ~40k. Each step if we do several masked popcounts on 20k-bit ints (334 limbs) => 40k*~1500 limb ops? 60M limb ops maybe okay? But Python big int & mask and bit_count each time allocate 2.5KB. 40k*maybe 5 = 200k big int ops, could be several seconds maybe too high. Need optimize.

We can reconstruct using more direct bitset search to reduce. There are known reconstruction algorithms using saved bitsets. Let's explore.

Given row bitsets S_i for i=0..n (S_0=0). dp_i(j) = popcount(S_i & ((1<<j)-1)). We need path. At current (i,j), we can find if a match at row i and column j is possible. If a[i-1] can match some b[k] with k<j, and S_i has bit k set, and S_{i-1} has no bit k? Wait condition dp_i[j] == dp_{i-1}[j-1]+1. Since dp_i[j] = prefix_i(j). dp_{i-1}[j-1] = prefix_{i-1}(j-1). If there is a set bit at k (0-index for column k+1) in S_i among bits < j, and no set bits in S_{i-1} in range? Let's derive candidate.

DP recurrence: A[i-1] matches B[k] and is in LCS ending at i,j if dp_i[j] = dp_{i-1}[k]+1 (where column k+1) and no better. Also we need j can be any column >= k+1 with dp_i[j] = dp_i[k+1] (after match no more increase). Standard backtracking chooses j maybe the largest column where a[i-1] can be the last match? At current (i,j) with dp_i[j]=L. We need find a match (i,k+1) such that dp_i[k+1]=dp_i[j] and dp_{i-1}[k]=dp_i[j]-1 and k<j. Usually choose the rightmost possible match to keep j minimal? We can find largest k < j where a[i-1]==b[k] and bit k in S_i set, and additionally prefix_i(k+1)=L (i.e., no set bits in S_i after k up to j-1) and prefix_{i-1}(k)=L-1 (no set bits in S_{i-1} after k up to k-1? Wait prefix_{i-1}(k) uses bits 0..k-1, not bit k). More simply: dp_i[j] = L. We want a match at column c (0-index) with c+1 <= j. Conditions:
- a[i-1] == b[c]
- dp_i[c+1] = L (the match reaches current L)
- dp_{i-1}[c] = L-1 (previous value before match)
- Also dp_i[j] = L and dp_i[j-1] maybe L if j>c+1.
Since dp_i[c+1] is prefix of S_i up to c. If bit c in S_i is set and no set bits in S_i from c+1 to j-1, then dp_i[j]=dp_i[c+1]. Also dp_{i-1}[c] = prefix of S_{i-1} up to c-1. We need that equals L-1. If dp_i[c+1] = L and bit c set, then dp_i[c] = L-1 (since bit c set increases at c). dp_i[c] equals? We need dp_{i-1}[c] = L-1. Could be checked by bit c of S_{i-1}? Not enough.

Alternative standard method: To find match for row i given current j, compute candidate bitset C = S_i & M[a[i-1]] & ((1<<j)-1). Need choose highest set bit? Then adjust j? But must ensure path consistency. If we always choose highest set bit in S_i & M[a[i-1]] below current j, then move to (i-1, c+1), and output insertions for b[c+1..j-1]? But need ensure dp_i[j] = dp_i[c+1], else we might choose match that doesn't reach current L and skip equals? Let's test.
At current (i,j), L = dp_i[j]. S_i has exactly L set bits total? Actually popcount(S_i) = dp_i[m] for full row, but for prefix j maybe <=L. The set bits in S_i below j are exactly columns where row increases, count = L. If we choose a set bit c in S_i below j that corresponds to a[i-1], does dp_i[c+1]=L? Not necessarily; if there are set bits after c below j, then dp_i[c+1] < L. Choosing it would mean we haven't consumed all increases in row i before j. But if we then at (i-1,c+1) with dp_{i-1}[c+1] maybe? The remaining script length? We need maintain invariant dp_i[j] equals remaining LCS. If move to (i-1,c+1), we require dp_{i-1}[c+1] = L-1? Actually after taking match at c, remaining LCS length should be L-1, and new current (i-1, c+1) must have dp_{i-1}[c+1] = L-1. Is that guaranteed if c is a set bit in S_i & M? Not always? Let's test A='BA', B='AB'. Saved rows: S1 for B = bit1; S2 for A = bit0. Start i=2,j=2,L=1. S2 & M['A'] (bit0) below j => c=0. Choose c=0. Move to i=1,j=1. dp_1[1]=0 = L-1 yes. Good.
Another example where row has multiple set bits and current j includes all; choosing highest set bit maybe safe? Suppose A='ABC', B='XABY'. LCS length 2. Row for C? Let's construct. Start at i=3 (C), j=4. S3? Row3 dp [0,0,0,0,0]? C not in B? Wait B X A B Y, C not, LCS length2. S3 same as row2? Row2 A,B vs XAB: dp [0,0,1,2,2], bits [0,1,1,0]? Let's compute: row1 A: [0,1,1,1,1] bits [1,0,0,0]; row2 B: [0,1,2,2,2]? B string indices: X(0),A(1),B(2),Y(3). Row2 B: j0 0, j1 X 0? Actually A='AB' first char A? Let's index A chars: row1 A: [0,1,1,1,1] bits [1,0,0,0]. row2 B: B at col3: [0,1,2,2,2] bits [1,1,0,0]. row3 C: [0,1,2,2,2] bits [1,1,0,0]. Start i=3,j=4,L=2. S3 & M['C']=0 => no match. Then if i>0 and dp_i[j]==dp_{i-1}[j] (2==2) delete C. Good.
Then i=2,j=4,L=2. S2 & M['B'] (bit2) below j => c=2. Move to i=1,j=3. dp_1[3]=1. Good.
Then i=1,j=3,L=1. S1 & M['A'] (bit1) below j => c=1. Move i=0,j=2, dp_0[2]=0. Good. Output inserts for skipped b? At i=2,j=4 choose c=2, we skip b[3] (Y) insertion. Then i=1,j=3 choose c=1 skip b[2]? Wait after match at c=2 (B at index2), new j=c+1=3, current b prefix length 3 (X,A,B). Then row1 choose c=1 (A at index1), new j=2. Then at i=0,j=2 insert b[1],b[0] reversed? If backtracking append matches/inserts/deletes in reverse. We'll reverse at end. Need output operations in forward order. If backtracking:
(3,4) C delete append '-'
(2,4) choose c=2 match append '=', then we need insert b[3] before match? In reverse, we append '+ Y' then '='? Standard backtracking: if choose match at c < j-1, we should output insertions for columns c+1..j-1 in reverse before match? Let's define reverse list.
At (i,j), if match at c (0-index, c+1 column), then operations from (i-1,c+1) to (i,j) are: for t from j-1 down to c+1: insert b[t] (because in forward, insertions occur before the match? Let's see forward sequence from (i-1,c+1) to (i,j): We need consume a[i-1] and b[c+1..j-1]. DP path could be: from (i-1,c+1), insert b[c+1],...,b[j-1], then match a[i-1] with b[c]. Wait match uses b[c], so column after match is c+1. Actually coordinate j is prefix length after processing. If match a[i-1] with b[c], from (i-1,c) to (i,c+1) diagonal. If current state is (i,j), path may go left from (i,j) to (i,c+1) via insertions of b[c+1..j-1], then diagonal to (i-1,c), then continue. So reverse: if we are at (i,j) and decide diagonal at c, then in reverse order: first output left moves (inserts) for b[j-1], b[j-2],...,b[c+1], then output diagonal '=', then set i-1, c. Yes.
If delete: from (i,j) to (i-1,j) reverse append '-' then set i-1,j. If insert: from (i,j) to (i,j-1) reverse append '+' then set j-1.
Then reverse final list.

Now, is choosing highest set bit in S_i & M[a[i-1]] below j always valid? Need ensure dp_{i-1}[c+1] = L-1 and dp_i[c+1]=L. The highest set bit in S_i below j: let c = max set bit in S_i below j. Then no set bits in S_i from c+1 to j-1, so dp_i[j] = dp_i[c+1] = L. Since bit c set, dp_i[c]=L-1. But we need dp_{i-1}[c] = L-1 (for diagonal from (i-1,c) to (i,c+1)). Is dp_{i-1}[c] always L-1? Not necessarily. Example? Let's find.
We need a case where S_i has set bit at c matching a[i-1] but previous row value at c is less than L-1, so diagonal not allowed; then dp_i[c+1] increase came from horizontal (insertion) not match? But bit c set means row i increases at column c. If a[i-1] matches b[c], increase could be from match or from previous row? DP: dp_i[c+1] = max(dp_{i-1}[c+1], dp_i[c], dp_{i-1}[c]+match). If bit c set, dp_i[c+1] = dp_i[c]+1. It could equal dp_{i-1}[c+1] (vertical) or dp_i[c]+1. For diagonal, need dp_{i-1}[c] = dp_i[c+1]-1 = L-1. Could be dp_{i-1}[c] < L-1. Then match not actually used? Let's search.
A='AB', B='BA'. S2 (A='AB'? Actually row2 for B? Wait rows: a1=A, a2=B. B='BA'. S1 bit1, S2 bit0. Start i=2,j=2,L=1. S2 & M[a2='B'] (bit0) => c=0. dp_1[0]=0=L-1 ok.
Need row i where a[i-1] appears in S_i at a bit not actually matching due to previous row mismatch. Consider A='ABC', B='BAC'. LCS 2 (BC or AC). Rows:
B string: B A C.
Row1 A: dp [0,0,1,1], S1 bit1 (A at col1).
Row2 B: dp [0,1,1,1]? Actually A='AB': j B ->1, j A ->1, j C ->1. S2 bit0.
Row3 C: dp [0,1,1,2], S3 bit0? row increments [1,0,1]? dp [0,1,1,2] bits [1,0,1]. S3 = bits 0 and 2. M['C']=bit2. Start i=3,j=3,L=2. Highest set bit in S3 & M[C] => c=2. dp_2[2]=1 = L-1, ok.
What about choose highest set bit in S_i but maybe a earlier set bit not matching? We choose matching. Could previous row value be lower? Let's attempt theoretical. If c is highest set bit in S_i below j, L=dp_i[j]=dp_i[c+1]. Since c is set, dp_i[c]=L-1. DP recurrence: dp_i[c+1] = max(dp_{i-1}[c+1], dp_i[c], match+dp_{i-1}[c]). It equals dp_i[c]+1. If dp_{i-1}[c] <= L-2, then match <= L-1, dp_i[c]=L-1, dp_{i-1}[c+1] could be L? Actually dp_{i-1}[c+1] <=? Row i-1 prefix at c+1. Could be L? If dp_{i-1}[c+1]=L, then dp_i[c+1]=L (not increase), contradict bit set? Wait bit set means dp_i[c+1]=dp_i[c]+1=L. If dp_{i-1}[c+1]=L, max L, okay bit set? dp_i[c] could be L-1, dp_i[c+1]=L, bit set yes, increase came from previous row (vertical) not match. In that case match at c not needed; diagonal from previous row at c would have dp_{i-1}[c] maybe L-1? If dp_{i-1}[c+1]=L and row i-1 bit c set? Then dp_{i-1}[c]=L-1. If not, dp_{i-1}[c] < L-1 and dp_{i-1}[c+1]=L due to some earlier? impossible since prefix increase only at bit c if value jumps from <L-1 to L? Increase by at most 1, so if dp_{i-1}[c+1]=L and dp_{i-1}[c] <=L-2 impossible (increase >1). So dp_{i-1}[c] >= L-1. Thus dp_{i-1}[c]=L-1. So diagonal allowed. Good! More generally row values increase by at most 1, so if dp_i[c+1]=L and dp_i[c]=L-1, and dp_{i-1}[c+1] <=? Could be L, then dp_{i-1}[c] = L-1 because to reach L at c+1 from c with at most 1. If dp_{i-1}[c+1] < L, then match must supply L, so dp_{i-1}[c]=L-1. Thus condition holds. So choosing highest set bit in S_i below j that matches a[i-1] seems valid. Also need ensure a match exists; if none, we can delete row i? If S_i & M[a[i-1]] below j has no set bits, then a[i-1] cannot be last match in an LCS for prefix (i,j); we should delete a[i-1] if dp_i[j]==dp_{i-1}[j]. Is that always? If no match candidate, either dp_i[j] == dp_{i-1}[j] (delete) or dp_i[j] < dp_{i-1}[j]? DP monotone dp_i[j] >=? Actually adding a row cannot decrease LCS, so dp_i[j] >= dp_{i-1}[j]. If no candidate, must have dp_i[j] == dp_{i-1}[j], so delete. Good.
But what if candidate exists but dp_i[j] == dp_i[j-1] and we might prefer insertion? In backtracking, standard priority can be match > delete > insert or any valid. Choosing match if possible yields minimal. If candidate exists, moving diagonal is valid. If no candidate, we need decide delete or insert. We could use dp comparisons. But perhaps simpler: if no candidate, if i>0 and dp_i[j] == dp_{i-1}[j] delete, else insert. Need efficient compute dp_i[j] and dp_{i-1}[j] only when no candidate. Could also use bitset to decide without full popcount: If no candidate, we know dp_i[j] = L. We need know if dp_{i-1}[j] == L or L+? Since dp_i[j]>=dp_{i-1}[j]. If dp_i[j] > dp_{i-1}[j], then current row increased due to some a? But if no candidate for a[i-1], increase must be due to earlier? Wait if dp_i[j] > dp_{i-1}[j], then row i has more LCS with prefix j than row i-1. The extra must involve a[i-1]? If a[i-1] not used as last match below j? Could involve a[i-1] matched earlier and then more matches later? But if a[i-1] is used, its match bit would be in S_i & M below j. If none, a[i-1] not used, so dp_i[j] should equal dp_{i-1}[j]. So no candidate implies equal. So delete. We may not need dp compare.
What if candidate exists but we might need insert first before match? The diagonal algorithm with highest set bit automatically handles insertions for skipped columns after c. Good.
What if candidate exists but there are also insertions before c? They will be handled in next states. Good.
Thus reconstruction can be:
Precompute M: dict line -> int bitmask with bits for positions in b. If duplicates, OR bits.
Compute row bitsets rows: list of ints length n+1? We need S_i for i=0..n for reconstruction. Could store rows[0]=0, for each a line compute S append.
But for 20k x 20k storing all rows maybe 50MB. Fine. But Python int bit_length maybe m. Need mask to limit shift? y = (S << 1) | 1 can grow beyond m bits. x = S | M[a] limited m bits. x - y negative if y > x? In Python infinite two's complement; ~(...) may produce negative? Need mask to m bits? Standard algorithm uses unsigned with enough bits. We can mask S to (1<<m)-1 after update? Let's test formula with Python negative. x - y can be negative; ~(x-y) positive? In Python, bitwise not of negative yields negative? Example x=3,y=5,x-y=-2, ~(-2)=1. Then x & 1 =1 correct. But if x-y more negative, ~ gives positive? e.g. -3 ~ = 2. It works like infinite two's complement. However S may have bits beyond m due to y shift. We should mask final S with full_mask to keep only m bits. Standard: S = x & ~(x - y) & full_mask? But if x has only m bits, x & anything already only m bits. Because x = S | M, S masked m bits, M m bits. So S result only m bits. No need mask final. x - y can be negative; x & ~(x-y) okay? Let's test with x=0,y=1 => x-y=-1, ~(-1)=0, S=0. Good. x=1,y=1 =>0. x=2,y=1=>1, ~1=-2, 2&-2=2. Good. But Python's ~ negative: ~(-2)=1 as above. Should be okay.
Need handle m=0 or n=0. If b empty, no matches, all deletions. If a empty, all insertions. Bitset with full_mask = (1<<m)-1; if m=0, masks 0. Loop? For each a line, M.get(line,0)=0, x=0,y=(0<<1)|1=1, S=0. rows append 0. Reconstruction with j=0: while i>0 delete. Good. But if m=0, candidate masks none.

Performance: Precompute M for b: dict mapping line to int. For each position j, M[line] |= 1<<j. If 20k lines, building big ints with OR and shift maybe O(m^2/word)? If doing `mask |= 1 << j` for each j, for 20k maybe each shift creates big int of size j, OR with existing; total O(m^2/word) ~ 20k^2/8? 50MB? Actually 20k shifts of increasing size, sum sizes ~ m^2/16 bytes = 25MB? Wait 20k*average 1250 bytes=25MB allocated, fine. But if repeated lines, OR repeatedly. Could optimize by building list of masks? For 20k, okay. But for worst 20k unique, dictionary 20k keys, each int 2.5KB? If each line unique with one bit, int size proportional to highest bit? Python int for bit at high position has size ~ high bit/30 limbs, so for line at position 19999, int ~ 2.5KB. If 20k unique each one bit at increasing positions, total memory huge: sum j/30*4 ~ (20k^2)/(60)*4 ≈ 26.7 MB? Let's calculate: Python int limb 30 bits 4 bytes. Bit at position p uses p/30 limbs. Sum p=0..19999 p/30*4 ≈ (4/30)*20000*19999/2 ≈ 26.6 MB plus dict overhead. Acceptable. But if lines duplicate, masks combine. However storing row bitsets 50MB. Total maybe 80-100MB. Okay maybe. But can we avoid storing M for all positions? Need M for reconstruction too. We can store dict. Could be high but okay. If memory limit unknown maybe 512MB.

But bitset loop with rows: storing all rows as list of Python ints. If n=20k, each row maybe not full m bits? In D small, row bitsets have ~LCS bits set? Python int size determined by highest set bit, not popcount. Rows may have highest bit near m-1 if last common line near end, so each int size ~ up to 2.5KB. 50MB. Fine.

Could we implement Myers instead to be safer with hint? Let's consider Myers linear-space divide and conquer. More complex but memory low, time O((N+M)D). For D=50, 20k -> very fast. For D=1000 (completely different) -> (2000*1000)=2M operations? Actually D=1000, N=M=1000, O(ND?) Myers O((N+M)D) ~2M, okay. But implementation of shortest edit script with Myers? Need handle repeated lines. Could use standard forward/backward Myers to find middle snake and recursively build script. We need be correct. Might be more in line with hint and memory. But bitset simpler and likely passes performance. However performance requirement: two completely different lists of 1000 lines under 6s: bitset 1000x1000 trivial. 20k with 50 diff under 2s: bitset 20kx20k ~ maybe under 2s but uncertain in Python. Need evaluate mental. 20k iterations, each: x = S | m; y = (S << 1) | 1; S = x & ~(x - y); rows.append(S). Big int size maybe up to 20k bits. 20k*4 big int ops = 80k ops on 2.5KB => 200MB memory processed. Python C loops over 334 limbs per op, 80k*334=26.7M limb operations. 26M C limb ops likely <0.1-0.5s. Python loop overhead 20k ~0.001s. Storing rows appends copies? When S computed, new int allocated; append stores. 20k allocations of 2.5KB = 50MB. Should be okay under 2s. Reconstruction: steps ~40050. For each step, compute candidate = rows[i] & mask_line & ((1<<j)-1)? Need avoid constructing (1<<j)-1 big int each step? That would be expensive 40k * 2.5KB = 100MB maybe okay, but constructing 1<<j for varying j could be costly. We can optimize by precomputing? Maybe use bit_length and shifts.
Need reconstruction efficient. Let's design robust bitset backtracking.

Simpler backtracking with candidate search:
M: dict line->mask.
rows: list length n+1.
i=n, j=m
script_rev=[]
while i>0 or j>0:
    if i>0 and j>0:
        # Need mask for columns < j: (1 << j) - 1
        # candidate = rows[i] & M.get(a[i-1],0) & low_mask(j)
        # To find highest set bit: c = candidate.bit_length() - 1
        if candidate:
            # insertions for b[j-1] down to b[c+1]
            for t in range(j-1, c, -1): script_rev.append(('+', b[t]))
            script_rev.append(('=', a[i-1]))
            i -= 1; j = c  # Wait diagonal from (i-1,c) to (i,c+1). If c is 0-index of b matched, column after previous prefix is c. Current new j should be c, not c+1? Let's define coordinates prefix lengths. Start (i,j) where i prefix a[0:i], b[0:j]. A match at b[c] (0-index) uses new row i and column c+1. Diagonal goes from (i-1,c) to (i,c+1). If at (i,j), we choose match at c < j. Need path: left from (i,j) to (i,c+1) (insert b[c+1..j-1]), diagonal to (i-1,c). So new state (i-1, c). Yes j = c, not c+1. In earlier I said c+1 incorrectly. Let's adjust.
Example A='B', B='AB' start i=1,j=2, match at c=0. New state (0,0). Insertions b[1] before match? Forward: insert b[1], match b[0]. Reverse: append '+B[1]', '=', state (0,0). Good. If we had set j=c+1=1, then we would insert b[1]? Wait new j should be prefix length after processing b[0]? After diagonal, column = c+1? Let's re-evaluate coordinate convention.
State (i,j): processed first i of a, first j of b. Diagonal match a[i-1] with b[j-1] goes from (i-1,j-1) to (i,j). If we choose match at c where c is index in b, then diagonal goes from (i-1,c) to (i,c+1). So current state before diagonal should be (i,c+1), not (i,j) unless j=c+1. We move left (insertions) from (i,j) to (i,c+1). Then diagonal to (i-1,c). So new state after all is (i-1,c). Yes j_new = c. Because after diagonal, processed b prefix length c (not c+1?) Wait diagonal from (i-1,c) to (i,c+1) processes b[c]. End column c+1. If we are at end (i,j), and we unwind backwards: left moves end at (i,c+1); diagonal backwards goes to (i-1,c). So new state is (i-1,c). Thus j = c. Good. But note after diagonal forward, column is c+1, but when continuing before match, we are at (i-1,c). Yes.
            i -= 1; j = c
        elif i>0:
            # delete a[i-1]
            script_rev.append(('-', a[i-1])); i -= 1
        else:
            script_rev.append(('+', b[j-1])); j -= 1
    else:
        if i>0: delete; else insert.
Finally reverse script_rev.

But need ensure candidate highest set bit below j. Low_mask = (1 << j) - 1. If j large, constructing each loop maybe heavy. Can avoid mask if candidate = rows[i] & M.get(a[i-1],0); then we need highest set bit < j. If candidate has bits >= j, we need ignore. We can do:
mask_line = masks.get(a[i-1], 0)
cand = rows[i] & mask_line
# Clear bits >= j: if cand.bit_length() > j: cand &= (1<<j)-1
# But if cand has high bits, bit_length > j. However we only care highest bit < j. Could compute c = cand.bit_length()-1; if c >= j: need mask. Since rows[i] has bits only up to m; j decreases. We can do:
cand = rows[i] & masks.get(a[i-1], 0)
c = cand.bit_length() - 1
if c >= j:
    cand &= (1 << j) - 1
    c = cand.bit_length() - 1
if c >= 0: match
This constructs mask only if there are bits beyond current j. How often? As j decreases, maybe many. But still okay. Could also maintain low_mask variable? j changes non-monotonically? j only decreases. We can maintain `low_mask = (1 << m) - 1` initially and update when j decreases? If j decreases by many, can set low_mask = (1 << j) - 1. But if j changes via match to c (could be smaller than previous j-1), and via insert j-1. We can update low_mask each iteration: low_mask = (1 << j) - 1. That constructs big int each step (40k * 2.5KB = 100MB) okay maybe. But can optimize: Since j only decreases, we can keep low_mask and when j changes, if new_j < bit_length, low_mask >>= (old_j - new_j)? Actually low_mask for new j = (1<<new_j)-1. If we had old low_mask for old j, we can do low_mask = (1 << new_j) - 1 or low_mask & ((1 << new_j)-1). Could maintain using shift: low_mask >>= (old_j - new_j) because old low_mask = 2^old_j -1; shifting right by delta yields 2^(old_j-delta)-1 = new low_mask. Nice! j monotonically decreases (insert decreases by1, match sets to c < j; delete leaves j). So low_mask can be updated by `low_mask >>= (old_j - j)` after j changes. Initially low_mask = (1<<m)-1 (if m>0 else 0). Then candidate = rows[i] & mask_line & low_mask. This avoids constructing (1<<j)-1 each step. Need ensure when j becomes 0, low_mask=0. If old_j - new_j maybe 0. Good.

But rows[i] & mask_line & low_mask: mask_line may have bits beyond low_mask; low_mask clears. candidate.bit_length()-1 gives highest set bit < j. Good.

Now, is it always valid to choose highest set bit in candidate? Need revisit with coordinate j = prefix length, low_mask bits 0..j-1. Candidate bits correspond to columns where row i increases and a[i-1]==b[c]. Choose highest c. We need ensure diagonal valid. We argued yes. Need prove and maybe handle case candidate exists but choosing highest could violate earlier insertions? Let's test with examples and maybe brute force mentally. We can also design fallback: after choosing c, verify dp_{i-1}[c] == L-1? But computing dp maybe costly. Could choose candidate and then maybe if invalid? Let's prove more rigorously.

Let R_i = S_i. Let f_i(j) = popcount(R_i & ((1<<j)-1)) = dp_i[j]. For current i,j, L=f_i(j). Let c be maximum index < j such that bit c in R_i and a[i-1]=b[c]. Need show f_{i-1}(c) = L-1 and f_i(c+1)=L. Since c is max set bit in R_i below j? Wait c is max set bit in R_i & M, not necessarily max set bit in R_i below j. There could be set bits in R_i after c (but not matching a[i-1]) below j. Then f_i(c+1) may be < L. But if we choose c not max in R_i, then f_i(c+1) < L, meaning there are further increases in row i at columns > c. If we move to (i-1,c), remaining LCS length f_{i-1}(c) maybe? Could be less than L-1; then we cannot have taken match at c as last match for current L. But there might be insertions after c and then more equals from row i? Wait row i is current row; after consuming a[i-1] (if matched at c), we cannot have more equals in row i because row i corresponds to a[i-1] only. But row i bitset can have multiple set bits, meaning dp_i increases multiple times across B. Can that happen? A single character a[i-1] can increase LCS at most once as we scan B? LCS with one extra character can increase by at most 1 total. Therefore popcount(R_i) - popcount(R_{i-1})? Actually f_i(m) - f_{i-1}(m) is 0 or 1. But R_i itself can have multiple set bits, e.g., row2 B='AB', B='XAB' had bits [1,1], popcount 2, row1 popcount 1, difference 1. Row i can have multiple set bits because earlier matches from previous rows persist. The bits in R_i are cumulative increases from all previous a's, not just a[i-1]. So choosing a bit c where a[i-1] matches doesn't necessarily mean this is the only new increase. There may be other set bits after c from earlier a's. If we choose c not the highest set bit overall, f_i(c+1) may be less than L. But maybe for a match involving a[i-1], c must be the highest set bit in R_i below j? Not necessarily; a[i-1] could be earlier than a previous row's matches? Example: a = ['X', 'A'], b = ['A', 'X']? Row1 X: bits [0,1]? A? Let's find where a[i-1] match bit not highest.
A rows: a1='A', a2='B'? b='B A'? Row2 B (a2) bit0, row1 A bit1. Row2 bits? A='AB', B='BA'. We computed row2 S2 bit0 only (not cumulative? row1 had bit1, row2 bit0; popcount row2=1, row1=1). So a2 match at c=0 is highest in R2 below j=2? yes.
Could row2 have bits [1,1] and a2 matches at c=0 while bit1 from previous row? Example a1='A', a2='B', b='A B'? Row1 bits [1,0]; row2 bits [1,1]; a2='B' matches at c=1, highest. If a2 matches earlier c=0? b='B A'? a1='A', a2='B', b='B A'. Row1 A bit1; row2 B? compute S1=bit1. S2: M[B]=bit0, x=bit0|bit1=3, y=(2<<1)|1=5, x-y=-2, ~(-2)=1, S=1 (bit0). So only bit0, previous bit1 dropped. Because optimal row2 chooses B over A? LCS length 1. So a2 bit0 highest.
What about row i having multiple bits and current a[i-1] matches a lower bit while higher bits are from previous rows? Is that possible? Suppose a_i line appears earlier in b, and previous rows have matches after it. But if a_i line can match earlier, the DP may choose earlier or later depending. Row bitset marks columns where dp_i increases. If previous rows have a match at column d > c, and a_i matches at c, row i could have bits c and d? But total LCS length may increase by 1 if a_i can extend previous sequence before d? Let's construct: previous rows LCS with B prefix includes matches after c. Adding a[i-1] that matches at c cannot extend previous sequence that occurs after c (order), so it may not increase total LCS; row i bits might still include previous bits after c if dp_i doesn't change there? But row bitset is row increments, not vertical difference. If previous row had bit d, row i may retain bit d if dp_i increases at d due to previous row. Example row2 in 'AB' vs 'XAB' had bits 0 and 1; a2='B' matched at 1, previous row bit0 retained. a2 not lower.
Can a_i match lower while previous bits higher? Suppose a1='B', a2='A', b='B A'? Row1 B bit0; row2 A: M[A]=bit1, S1=1, x=3,y=3? y=(1<<1)|1=3, x=3, x-y=0, ~0=-1, S=3? bits 0 and1. popcount2? But LCS of 'BA' and 'BA' is 2, row2 bits [1,1]. a2='A' matches at 1 (highest). If b='A B' with a1='B', a2='A': Row1 B bit1; row2 A: M[A]=bit0, S1=2, x=3, y=5, x-y=-2, S=1 (bit0). a2 matches lower and previous bit dropped. Row bits only lower.
Maybe property: If a[i-1] can be part of optimal LCS for prefix j, its match position is the highest set bit in R_i below j that matches a[i-1], and also no set bits of R_i after it? Not necessarily no set bits after it if they are from previous rows and still included. But if there are set bits after c, then f_i(c+1)<L. If we take match at c and move to (i-1,c), the remaining LCS length f_{i-1}(c) might be f_i(c) (since row i before c equals previous row? If a[i-1] not yet matched, f_i(c)=f_{i-1}(c)? Usually for columns before any match of a[i-1], row i equals row i-1. If c is a bit in R_i & M, maybe row i before c equals previous row. Then f_{i-1}(c)=f_i(c). If f_i(c+1)=f_i(c)+1. If there are later bits, L > f_i(c+1). Then f_{i-1}(c)=f_i(c) < L-1, so diagonal not enough. But can c be chosen if later bits exist? Maybe the valid match for a[i-1] would be at the highest set bit in R_i below j that is in M[a[i-1]], but if later bits exist, that c might not be valid; perhaps no match for a[i-1] in current optimal path, and we should delete a[i-1]? But row i may have later bits from previous rows, so a[i-1] not used. Candidate exists lower but invalid. If we choose it, we'd produce non-optimal? Let's find concrete counterexample.
Need row i bits: bit c for a_i, and bit d>c from previous row. That means f_i(d+1) > f_i(c+1). a_i matches c but not used in optimal for prefix j; row i equals previous row at d? Let's try brute mentally small.
Let a = [X, A] (i=2 a_i=A). b has A at c=0 and some B at d=1 that previous row X matched? Need previous row X match at d=1. b='A X'? previous row X at d=1. a1='X', a2='A', b='A X'. LCS length 2? A sequence X then A? Order a: X then A; b: A then X. LCS length 1. Row1 X: bits [0,1]? b A,X: dp [0,0,1], S1 bit1. Row2 A: M[A]=bit0. S1=2. x=3, y=5, S=1 (bit0). Previous bit dropped. Not coexist.
Try b='X A' with a1='X', a2='A': Row1 X bit0; Row2 A bit? M[A]=bit1. S1=1, x=3, y=3, S=3 bits 0,1. a2 A at bit1 highest. Good.
Need a_i matches earlier c but previous later d retained. For previous later d retained, row i must not drop it. That happens if row i can achieve LCS length at d using previous row's matches, and a_i doesn't interfere. But if a_i matches earlier c, row i might choose to include it instead, dropping later d if same length? In examples it dropped. Could both be retained if total LCS length increases by 1? Then row i bits could include earlier new bit and later old bits, total popcount previous+1. For a_i to match earlier c and still keep later old bit, sequence would be a_i (at c) then previous row matches after d. But a_i is current row (last a), order in a: a_i comes after previous rows, so it cannot precede previous row matches in sequence. Wait row index order: a_i is after previous rows. In LCS, if a_i is matched at c, it must come after all previous row matches. So previous row matches must be before c, not after. Thus later bits (d>c) cannot be from previous rows if a_i used. But row bitset cumulative bits could include previous matches before c, not after. So if c is a match for a_i, valid bits after c should not exist (for optimal path using a_i). If bits after c exist, a_i not used. Candidate lower invalid. If we choose highest set bit in R_i & M[a_i], could there be invalid lower candidate while valid candidate none? We need know if candidate lower exists but invalid, and algorithm would incorrectly match.
Could there be a lower matching bit c in R_i but no valid match for a_i, while there are higher nonmatching bits? Example row i bits: bit d (from previous), bit c (from a_i?) but a_i not used? Why would R_i have bit c if a_i not used? R_i bits are row increments, which can be due to previous row vertical increases, not necessarily a_i. The bit c could be set because previous row had a vertical increase at c, even if a_i doesn't match b[c]? Wait S_i bits can be set at positions where row i increases, which could be due to previous row's dp_{i-1}[c+1] > dp_{i-1}[c] (vertical). It does not require a_i==b[c]. Our candidate filters by a_i==b[c], but bit c could be set for vertical reason and also a_i matches by coincidence. If a_i not used, candidate may exist.
Let's construct: previous row has bit c (increase), a_i also matches b[c], but a_i not used; current row bit c set due to previous row. Higher bits from previous row also. Example a1='A', a2='B'? previous row a1='A' bit c where b[c]='A'. current a2='B' also equals b[c]? impossible line equal both unless same string. Lines can repeat: a1='X', a2='X', b has X at c and other stuff. Previous row bit c, current row maybe bit c and maybe later bits.
Take a = ['X','X'], b = ['X','Y','X']. LCS length 2? We can match both Xs. Rows:
Row1 X: b bits at 0,2. dp [0,1,1,2], S1 bits 0,2? Let's compute: M[X]=101b (5). S1 =? x=5,y=1,S=5&~4? x-y=4, ~4=...1011, 5&~4=1? Wait algorithm maybe S1 bit0 only? Let's manually row1: one X, dp [0,1,1,2] increments at j=1 (bit0) and j=3 (bit2). But a single row can LCS with one char increase at most 1, but dp row1 has length 1? Wait dp[1][j] is LCS of A prefix length 1 ('X') with B prefix. It can be at most 1, not 2. I made error: For one A char, dp cannot be 2. Correct dp row1: [0,1,1,1], S1 bit0 only. Because one A can match only one B. Right. So row1 bit0.
Row2 X: dp [0,1,1,2], S2 bits 0,2? Compute algorithm: S1=1, M=5, x=5, y=3, x-y=2, ~2=...1101, 5&~2=5 (bits0,2). Yes row2 bits 0 and2. a2 matches at bits0 and2. Highest c=2 valid (match second X). Good.
If current j=2 (prefix X,Y), L=1. low_mask bits 0,1. candidate bits in row2 & M & low_mask: bit0 only (bit2 >=j). c=0. Is that valid? State i=2,j=2. LCS length L=1. a2 X can match first X, and previous row value f1(0)=0. But optimal for prefix j=2 could match a2 at c=0 (delete a1?) Yes sequence: delete a1, insert Y? Actually a=['X','X'], b prefix ['X','Y'], LCS length1. We can match a2 with b0 and delete a1, or match a1 with b0 and delete a2. Both minimal. Algorithm chooses match a2 at c=0 (highest candidate below j). New state (i=1,j=0). Then delete a1. Forward: delete a1, match a2 b0, insert Y. Valid. Good.
What if candidate lower invalid? Try a=['X','Y'], b=['X','Y','X']? row1 X bit0? row2 Y bit1? no lower.
Need scenario: current row bit c set due to previous row vertical, a_i matches c, higher bits from previous row, and a_i not used. But if a_i matches c, using it could potentially yield same length? Maybe algorithm can choose it and still produce a valid LCS (not necessarily the same as original DP path) if conditions hold. If f_{i-1}(c) = L-1, valid. If f_{i-1}(c) < L-1, invalid. Could that happen while bit c set and higher bits exist? Let's search systematically by reasoning or maybe we can implement a safer backtrack with DP value checks but optimized.

Alternative: Use standard DP backtracking with stored rows and compute dp values efficiently by maintaining current L? We can avoid full popcount. At state (i,j), L = dp_i[j]. If candidate exists, maybe choose highest candidate and assume valid. To be safe, we can verify f_{i-1}(c) == L-1 using bit operations only when candidate exists? But verification may need popcount. Could perhaps use bitsets to check without full popcount by comparing prefix counts? We can maintain L? Let's explore.

We know L = dp_i[j] from current state. Initially L = popcount(rows[n]) = LCS length. When we move:
- match at c: new L' = L - 1 (if valid). New state (i-1,c). Should hold f_{i-1}(c)=L-1.
- delete: new state (i-1,j), L' = L (if dp_i[j]==dp_{i-1}[j]).
- insert: new state (i,j-1), L' = L (if dp_i[j]==dp_i[j-1]).
If we maintain L, we don't need compute dp_i[j] often. Need decide branch. For match candidate c, we need ensure valid. Could check using row bitsets and L.
Conditions for match at c:
- c < j, a[i-1]==b[c], bit c in rows[i] (row i increases at c+1) maybe? Actually diagonal from (i-1,c) to (i,c+1) requires f_i(c+1) = f_{i-1}(c)+1 = L? and f_i(j)=L. Since c chosen as highest candidate below j? If there are row i bits after c, f_i(c+1) may be <L. But we can check if rows[i] has no set bits in (c, j) (i.e., row i prefix count from c+1 to j-1 zero). That is `(rows[i] & ((1 << (j-1) - (1 << (c+1)) + 1?))`? More simply, since c is highest candidate but not necessarily highest row bit, check `(rows[i] & (low_mask >> (c+1))) == 0`? low_mask bits <j. We need bits from c+1 to j-1 zero. `rows[i] & ((low_mask >> (c+1)) << (c+1))`? Or `(rows[i] & (low_mask ^ ((1 << (c+1)) - 1))) == 0`. But constructing mask maybe. However if c is highest bit in candidate, not row. We can choose c = highest set bit in rows[i] & M. To ensure no row bits after c below j, we can test `rows[i] & (low_mask >> (c+1)) == 0` after shifting? Actually `low_mask >> (c+1)` has 1s for columns >= c+1 up to j-1 shifted down. `rows[i] >> (c+1) & low_mask >>?` Better: `rows[i] & ((1 << j) - (1 << (c+1)))` but low_mask available: `rows[i] & (low_mask ^ ((1 << (c+1)) - 1))`. Need mask for (1<<(c+1))-1 maybe can get by `low_mask & ~((1 << (c+1))-1)`, still construct.
But if c is highest set bit in rows[i] below j, then no row bits after c. We could instead choose c = highest set bit in rows[i] below j that also matches? If there is row bit after c, then c not highest row bit. Could there be a valid match at a lower row bit? No, if row bits after c, f_i(c+1)<L, so match cannot reach current L. Thus valid match must be at the highest set bit of rows[i] below j if a_i matches that bit. If the highest row bit below j doesn't match a_i, then a_i cannot be used as last match (because last match in row i must be at highest row bit? Let's think: For current prefix j, f_i(j)=L is determined by the highest set bit h in rows[i] below j; f_i(j)=f_i(h+1). The last increase in row i is at h. If a_i is used in an optimal alignment for (i,j), it must be the match causing that last increase? Not necessarily; a_i could be used earlier, and later increases from previous rows? But as argued, a_i is last a, so if used, it must occur after all previous a matches, so it must be the last increase in row i? The row i DP includes all a[0:i]; the final character a[i-1] if used in LCS ending at row i must be the last matched character in that LCS (by row order), hence corresponds to the last increase in row i (highest set bit). Yes! Thus a_i is used iff the highest set bit h in rows[i] below j matches a[i-1]. If not, a_i not used. This is a key insight. So reconstruction can simply:
At state (i,j), L = f_i(j). Let h = highest set bit in rows[i] below j (i.e., rows[i] & low_mask bit_length-1). If h >= 0 and a[i-1] == b[h] (or bit h in mask_line), then a_i is used; match at h. Else delete a_i (since not used). But what about insertions? If h < j-1, after match we insert b[h+1..j-1]. If h == -1 (no set bits in row i below j), then L=0; we can delete a_i? If i>0 and L=0, f_i(j)=0=f_{i-1}(j) maybe, delete a_i, and also eventually insert b? Wait if L=0 and j>0, we need insert all remaining b. Standard backtracking: if i>0 and f_i[j]==f_{i-1}[j] delete; else insert. With L=0, both maybe. If we delete all a's first, then insert b's, valid. But if j>0 and i>0, deleting a_i while L=0 is valid if f_{i-1}[j]=0. Is that always if row i has no set bits below j? f_i(j)=0. f_{i-1}[j] could be >0? Since adding row cannot decrease, f_i(j) >= f_{i-1}[j], so f_{i-1}[j]=0. yes. So delete.
If h matches, match. If h doesn't match, delete. What about pure insert when i=0? Then insert.
This avoids candidate lower and dp comparisons. Is it always valid? Let's test examples.
A='BA', B='AB'. rows: S1 bit1, S2 bit0. Start i=2,j=2, high row bit h=0, a2='B', b[0]='B' match. Insert b[1] reverse? h=0,j=2 => insert b[1], '=', state (1,0). i=1,j=0: low_mask 0, h=-1, i>0 delete a1='A'. Reverse script: delete A, +B? Let's simulate reverse append: start (2,2): insert b[1]='A' (since b='AB', index1 A), '=', state (1,0). Then delete a1='A'. script_rev = [('+','A'), ('=','B'), ('-','A')]. Reverse => [('-','A'), ('=','B'), ('+','A')]. Forward: delete A, match B with b0, insert A. a = B A? Wait original a='BA': a0='B', a1='A'. Our indices: i=2 a[1]='A'? Actually a list ['B','A'] if A='BA'. But we used a2='B'? Let's set a='BA': a[0]='B', a[1]='A'. Rows: row1 'B', row2 'A'. S1 for B vs 'AB' bit1, S2 for A bit0. Start i=2 (a[1]='A'), j=2, h=0, b[0]='A' match a[1]='A'. Insert b[1]='B'. state i=1,j=0. Delete a[0]='B'. Reverse: +B, =A, -B => forward -B, =A, +B. Valid LCS A. Good.
If a='AB', b='BA': rows row1 A bit1, row2 B bit0. Start i=2 a[1]='B', h=0, b[0]='B' match, insert b[1]='A', state i=1,j=0, delete a[0]='A'. Forward -A, =B, +A. Valid.

Example a=['X','X'], b=['X','Y','X']. rows S1 bit0, S2 bits0,2. Start i=2,j=3, h=2 (highest row bit), a[1]='X', b[2]='X' match, state (1,2), no insert (h=j-1). i=1,j=2, low_mask bits 0,1, h=0, a[0]='X', b[0]='X' match, state (0,1). i=0,j=1 insert b[1]='Y'. Reverse: =,=,+Y => forward =X, +Y, =X. Valid.
If we had state i=2,j=2 (prefix X,Y), h=0, a[1] X match b0, insert b1 Y, state i=1,j=0, delete a0 X. Valid.

What if h matches a_i but there are earlier row bits from previous rows; match at h valid? Need f_{i-1}(h) = L-1. Since h is highest row bit below j, f_i(j)=f_i(h+1)=L. bit h set => f_i(h)=L-1. For columns before or at h, does f_i = f_{i-1}? Not necessarily if a_i has earlier matches? But a_i is last character; before its match at h, row i should equal row i-1 (since a_i cannot be used before h in the chosen alignment). However DP row i might have earlier increases due to a_i matching earlier? If a_i also matches earlier, row i could have set bits earlier, but f_i(h) = L-1. Need f_{i-1}(h)=L-1. Could row i have increased earlier due to a_i, making f_i(h)>f_{i-1}(h)? Then f_i(h+1)=L, f_i(h)=L-1, so if f_i(h)>f_{i-1}(h), then f_{i-1}(h)<L-1, invalid. Can that happen if h is highest row bit and a_i matches h? Example a_i appears earlier and later; row i might have bits at earlier c and h. f_i(h)=L-1, f_{i-1}(h) could be L-2? Let's construct.
a = ['X','X'], b=['X','Y','X'] row2 bits 0 and2, h=2. f_i(2)=popcount bits <2 = bit0 =>1. f_{i-1}(2)=row1 bits <2 = bit0 =>1. Equal. Good.
Could f_i(h) > f_{i-1}(h)? That would mean a_i used before h in DP as well, increasing count before h. But row i can only increase total by at most 1 over row i-1 across all columns. If it also increases at h, total difference maybe 1, so earlier f_i could be > f_{i-1} and later catch up? Example row i bits earlier c and h, row i-1 bits h only? Then f_i(h) includes c (1), row i-1(h) maybe 0? Let's try create: previous row can match at h only (a_{i-1}=b[h]), current a_i matches earlier c and h. If current uses c, maybe drop h? But DP may choose max. Need small.
Let a1='Y', a2='X'. b=['X','Y']? Row1 Y bit1; Row2 X: M[X]=bit0. S1=2. x=3,y=5,S=1 (bit0). h=0, row i bit earlier, previous f1(0)=0, f_i(0)=0 ok.
Need row i-1 bit at h, row i bits c and h. a1 matches h, a2 matches c and h. b maybe [a2, something, a1]. a1='Y', a2='X', b=['X','Y']. Row1 Y bit1. Row2 X as above only bit0, h dropped. Because LCS length remains1, cannot keep both.
If total LCS increases by 1, row i can keep previous h and add c? But a2 is after a1, cannot match before a1 and still include a1 after, because order a2 after a1; sequence X then Y possible if b X then Y. Then a1 Y at h=1, a2 X at c=0 cannot both because a2 after a1 in a but c before h in b; order would be Y (a1) then X (a2) impossible. So DP won't include both. If b X ... Y with a order Y then X, LCS maybe 1. So row i won't have both if order conflicts.
If a2 matches later h, previous a1 matches earlier, row i can have bits earlier (previous) and h (current). That's valid and f_{i-1}(h)=f_i(h) (previous bits before h). Example a=['A','B'], b=['A','B'] rows S1 bit0, S2 bits0,1; h=1, f_i(1)=1, f_prev(1)=1.
Thus if h matches a_i, f_prev(h)=L-1. Good.
Thus reconstruction can be:
- rows list S_i.
- masks dict for b lines.
- i=n, j=m, low_mask=(1<<m)-1, rev=[]
while i>0 or j>0:
    if i>0:
        # find highest set bit in rows[i] below j
        r = rows[i] & low_mask
        if r:
            h = r.bit_length() - 1
            # if a[i-1] matches b[h]
            # Instead of b[h] string compare maybe use masks: masks.get(a[i-1],0) & (1<<h)
            # But b[h] comparison O(1) strings maybe fine. Use masks to avoid indexing? h could be large; b[h] okay.
            if a[i-1] == b[h]:  # or (masks.get(a[i-1],0) >> h) &1
                # insert b[h+1..j-1] reverse
                for t in range(j-1, h, -1): rev.append(('+', b[t]))
                rev.append(('=', a[i-1]))
                i -= 1
                old_j = j
                j = h  # new state column h (prefix length h) because diagonal end before? Wait if h is index of b matched, new j = h (as above). low_mask >>= old_j - j (if j smaller)
            else:
                # delete a[i-1]
                rev.append(('-', a[i-1]))
                i -= 1
                # j unchanged, low_mask unchanged
        else:
            # L=0? delete a[i-1]?
            rev.append(('-', a[i-1]))
            i -= 1
    else:
        rev.append(('+', b[j-1])); j -= 1
        # update low_mask if i=0? We can update low_mask when j changes.
Need update low_mask every time j decreases. In match branch j = h (< old j). In insert branch j -= 1. Delete branch unchanged. We can update after branch:
old_j = j before? Simpler maintain `low_mask` and at end of loop if new_j != old_j: low_mask >>= (old_j - new_j). Need store old_j. But in match branch we also use low_mask for r before update. Let's structure:
low_mask = (1 << m) - 1
while i>0 or j>0:
    old_j = j
    if i>0:
        r = rows[i] & low_mask
        if r:
            h = r.bit_length() - 1
            if a[i-1] == b[h]:
                for t in range(j-1, h, -1): ...
                rev.append(('=', a[i-1]))
                i -= 1
                j = h
            else:
                rev.append(('-', a[i-1]))
                i -= 1
                # j unchanged
        else:
            rev.append(('-', a[i-1]))
            i -= 1
    else:
        rev.append(('+', b[j-1]))
        j -= 1
    if j != old_j:
        low_mask >>= (old_j - j)
rev.reverse()
return rev

Need ensure when j=0, low_mask=0. If old_j - j >0, shifting low_mask right. If low_mask initially (1<<m)-1. Example m=0, low_mask=0; shifting okay? 0>>x=0. But if m=0, while i>0: r=0 delete all; j=0; low_mask 0. Good.
Potential bug: In match branch, new j = h, where h is index of matched b. If h=0, new j=0. If h could be equal old_j? r bits below j, highest h <= j-1. So new_j <= old_j-1, low_mask shift at least1. Good.
Insert branch: j decreases by1, low_mask >>=1. Good.
Delete branch: j unchanged.
Now, is `if a[i-1] == b[h]` enough? What if b has repeated lines and h is a position where line equals a[i-1]. Yes. We don't need masks in backtrack except maybe for speed. String equality okay 40k. But for h, b[h] exists. Good.
But wait: The highest set bit in rows[i] below j may correspond to a line equal to a[i-1] but not necessarily the match used? We argued yes if equal. If equal, valid. If not equal, delete. What if h matches but there are insertions before h? Those will be handled in previous states. Good.

Let's test with a case where no LCS (different). rows all 0? For no common lines, S_i remains 0? If some lines? If no common, yes rows[i]=0. Backtrack: i=n,j=m. r=0 => delete a[n-1]. Continue until i=0. Then insert all b. Script minimal (n+m). Good.
Case a empty: loop i=0,j=m inserts all. rows length 1 [0]. Good.
Case b empty: m=0 low_mask=0. rows all 0. loop deletes all. Good.

Need verify rows computation and reconstruction produce exactly a and b.
Let's test with duplicates: a=['A','A','A'], b=['A','A'].
Rows:
M[A]=bits0,1 =3.
S0=0
row1: x=3,y=1,S=1 (bit0)
row2: x=1|3=3,y=(1<<1)|1=3,S=3? x-y=0, ~0=-1, S=3 (bits0,1)
row3: x=3|3=3,y=(3<<1)|1=7, x-y=-4, ~(-4)=3, S=3. rows: 0,1,3,3.
Backtrack i=3,j=2 low=3. r=3, h=1, a2='A'=b1 match. no insert (h=j-1). state i=2,j=1 low>>=1 ->1. r=1 h=0 a1='A'=b0 match. state i=1,j=0 low>>=1 ->0. i=1,j=0 r=0 delete a0. rev: =A (second), =A (first), -A. Reverse: -A, =A, =A. Forward: delete first A, match second with b0, match third with b1. Good.
Case a=['A','A'], b=['A','A','A'].
Rows: row1 S=1? M bits0,1,2=7; row1 S=1; row2 S=3 (bits0,1). Backtrack i=2,j=3 low=7, r=3 h=1, a1 A b1 match, insert b2, state i=1,j=1 low>>=2? old=3 new=1 shift2: low 7>>2=1. r=1 h=0 a0 A b0 match, state i=0,j=0. rev: +A, =A, =A. Reverse: =A, =A, +A. Good.

Need ensure rows[i] & low_mask highest bit h can be found efficiently. `r.bit_length() - 1` if r !=0. Python bit_length O(1) based on size? It checks top limb, fast.
Rows storage: rows = [0]; append S for each a. But for memory, if n large and m large, list of ints. Could we reduce memory by not storing rows for lines that don't affect? But not necessary. However if m=20k,n=20k, rows 50MB. If both 100k? spec not. Standard library only.

But performance for building masks: dict of line to int. For m=20k, repeated lines maybe mask big. Building with `masks[line] = masks.get(line, 0) | (1 << j)`. For 20k, each `1 << j` big int of size j. Could be okay. Could optimize by building masks from right to left? If we process b from left to right, bit j. Alternative process from right to left with bit 1 shifting left: mask = 0; for line in reversed(b): mask <<= 1; if line in? But need per line mask. We can do:
masks = {}
for j in range(m-1, -1, -1):
    line = b[j]
    masks[line] = masks.get(line, 0) | (1 << j)
Still same.
Could build using list of positions then OR? Not needed.

But rows computation uses `masks.get(a_line, 0)` each row. If a_line not in b, 0.
Potential issue: Python's big int formula with `~(x - y)` may produce S with bits beyond m? We said x limited to m bits, result x & ... limited. But `x - y` can be negative, `~` positive/negative, but `x &` limited to x bits. Good. However if `x - y` negative with infinite ones, `~` gives positive with finite? Let's test more: x=0,y=1 => x-y=-1, ~(-1)=0. x=1,y=3 => -2, ~(-2)=1. x=2,y=3 => -1, ~(-1)=0. x=3,y=5 => -2, ~(-2)=1. Works. But is formula correct without masking y to m+1 bits? Standard uses `S = (S << 1) | 1` may have bit m set. x only m bits. x-y negative if y high. The result x & ~(x-y) should be correct modulo 2^m? Let's verify with known examples. For B length m, we should ensure S never has bit m. Since x doesn't, result doesn't. Good.
But need consider subtraction under unsigned m+1 bits? Python infinite two's complement may differ when x-y negative. The formula is derived modulo 2^m? Actually standard bit-parallel LCS uses unsigned arithmetic where subtraction underflows modulo 2^m (or enough bits). In Python, `x - y` negative; `~(x - y)` equals `-(x-y)-1`. For modulo, we want `x & (-(x-y) & mask?)`? Let's examine. Standard: `S = x & ~(x - y)` where all operations on fixed-width words (e.g., m bits). In two's complement fixed width, `~(x - y)` is the bitwise complement of (x-y mod 2^w). In Python infinite, `~(x-y)` is not the same as fixed-width complement if x-y negative? Let's test fixed width w=m. Suppose x=1 (01), y=3 (11) in w=2: x-y mod4 = 2 (10), ~ = 01, x&01=1. Python: x-y=-2, ~(-2)=1 (infinite ...01), x&1=1. Good. Suppose x=0,y=1,w=2: x-y mod4=3, ~=0, result0. Python -1 ~ =0. Good. Suppose x=2 (10), y=5 (101) w=3: mod8 x-y=5 (101), ~=010, x&010=0? Python -3 ~ =2, x&2=2? Wait compute: x=2,y=5, Python x-y=-3, ~(-3)=2 (binary ...0010), x&2=2. Fixed width w=3: x-y mod8 = (2-5) mod8 =5 (101), ~ =010 (2), x&2=2. Same. So Python works as infinite two's complement equivalent to fixed width for bits below w? For bits below w, `~(x-y)` equals `((x-y) mod 2^w)` complement? Python `~z = -z-1`. For negative z = -d, ~z = d-1. If x-y = -d, d = y-x. Mod 2^w = 2^w - d. Complement = d-1. Python gives d-1. This has bits below w same as fixed complement. For positive x-y, same. Thus okay. We don't need mask.

But need ensure y = (S << 1) | 1; S may have m bits, y may have m+1 bits. In fixed width w=m? Standard uses w=m maybe y truncated? Let's recall algorithm:
S = 0
for i in 1..n:
  x = S | M[a[i]]
  y = (S << 1) | 1
  S = x & ~(x - y)
Here S is bit vector of length m. The shift left can produce bit m, but x has no bit m. Subtraction modulo? In fixed word size maybe at least m bits; if bit m in y, underflow affects lower bits. Python with infinite handles as above. Example m=1, B='A', a='A': S=0, x=1, y=1, S=1. ok. Next if a='A' again: S=1, x=1, y=3, x-y=-2, ~(-2)=1, S=1. ok.
If m=2, B='AA', row1 S=1. row2 S: x=3, y=3, S=3? Wait one more A with B length2 should LCS length1? Actually A prefix length2 vs B length2 'AA' LCS 2. row2 S should bits 0,1 =3. Formula: S_prev=1, M=3, x=3, y=3, x-y=0, ~0=-1, S=3. good.
If row3 S=3, x=3,y=7, x-y=-4, ~(-4)=3, S=3. ok.

Now, minimal edit script: Our reconstruction uses rows and highest bit rule. Need prove it outputs shortest. It follows DP path. We can include no proof in final, just code. But ensure no off-by-one.

Let's test a more complex case manually.
a = ['a','b','c','b','a']
b = ['a','x','b','y','c','b','z']
LCS maybe a b c b a? Actually b has a,b,c,b; a sequence a b c b a? b order a x b y c b z: can match a (0), b (2), c(4), b(5), cannot a after. LCS length4 (a b c b) or a b b? Let's use algorithm.
Hard manual. But path should be valid.

Potential issue with highest set bit rule and insertions: Suppose h matches a_i but h < j-1. We output insertions b[h+1..j-1]. But what if some of those b lines also could be matched to earlier a's in alternative optimal? We choose one valid path. Since h is highest row bit, f_i(j)=f_i(h+1). Thus columns h+1..j-1 do not increase row i LCS, so they are not used in this optimal path for prefix i,j; they must be inserted. Good.
What if h does not match a_i, we delete a_i. But could we instead insert b[j-1] and keep i? Standard DP if no match at highest row bit. Since a_i not used in some optimal path for (i,j) (the path corresponding to highest row bit? If highest row bit doesn't match a_i, a_i not used in that path). Deleting a_i is valid if f_{i-1}[j] = L. Is that guaranteed? Adding unused row should not change LCS, so yes f_i(j)=f_{i-1}(j). Let's verify with row bits: If highest row bit h below j does not match a_i, row i's final LCS value L could still be greater than previous row if a_i used earlier? But if a_i used, the last increase should match a_i, so highest row bit would match a_i. Therefore if not, a_i not used, f_{i-1}=f_i. Good.
What if rows[i] & low_mask = 0 (L=0), h=-1. a_i not used, delete. Good.

Need ensure when i>0 and j=0, low_mask=0, r=0, delete a_i. Then after i=0 insert none. Good.
When i>0 and j>0 but rows[i] & low_mask=0, delete all a then insert b. Good.

Now performance of reconstruction insert loops: Total insertions = len(b) - LCS, at most 20k. For each match with h far from j, we loop over insertions in reverse. Total loops over all insertions once. Deletions once. Matches once. So O(n+m). Good.
But note in match branch we loop `for t in range(j-1, h, -1)` and append. If many insertions contiguous, loop cost O(#insertions). Fine.
Memory for script: list of up to n+m tuples, 40k, okay.

Potential memory/time issue: rows list stores int for each i. But we also store masks dict with big ints. Could combine masks and rows? For reconstruction, we only need rows and b strings. We don't need masks after rows computed? We use string equality b[h], no masks. So masks only needed for rows computation. We can delete masks before backtrack to free memory? In function, can `masks = None` or `del masks` before reconstruction. But rows computation uses masks. We can do `del masks` after rows built to reduce peak? Peak includes both. Could maybe avoid storing masks big ints by computing column masks from b on the fly? Not easily. But can delete.
Also we could choose shorter string for M dimension to reduce memory/time? Bitset algorithm complexity O(n * m/word). We can choose to bitset over b (shorter) maybe. The function takes a,b; we can swap to make b shorter? But reconstruction expects rows for a length n and bits for b length m. Time O(n*m/word). If swap, output edit script must still correspond to a and b. We can choose orientation with shorter list as bitset columns to improve performance/memory. But the edit script order? We can compute LCS with rows over a' and b' swapped, then reconstruct operations with signs adjusted. If we swap, rows correspond to new A (maybe original b) and new B (original a). The backtrack will produce script for newA,newB with '=' from both, '-' only newA, '+' only newB. Then map to original: newA '-' -> original '+'? Let's define. If we set work_a = a, work_b = b for simplicity. But performance can be improved by ensuring bitset length (columns) is min(len(a), len(b))? Bitset operations cost O(len(rows) * len(cols)/word). If len(a) huge 20k, len(b) huge 20k same. If one is small, choosing smaller as columns helps. But rows length is other. We can choose work_b as the shorter list to minimize bit length, and work_a as longer. But output mapping. Let's consider.
If we swap: work_a = b (original), work_b = a (original). The algorithm returns script for work_a vs work_b: items ('=',line), ('-', work_a line), ('+', work_b line). To convert to original a vs b:
- '=' same.
- '-' from work_a (original b) should be '+' in original (line only in b).
- '+' from work_b (original a) should be '-' in original (line only in a).
But order? The edit script order for work_a/work_b filters to work_a and work_b. Swapping and swapping signs should produce valid script for original? If original a corresponds to work_b, original b to work_a. The sequence operations with signs swapped: filtering =/- gives original a? Let's check. Work script order S. For work_a: =/- in order = work_a. For work_b: =/+ in order = work_b. If we swap signs: '-' items (original deletions from work_b) and '=' items in same order yield work_b (original a). '+' items (from work_a) and '=' yield work_a (original b). So yes.
Thus we can choose orientation: if len(b) <= len(a) maybe keep; else swap to make work_b shorter? Bitset cost O(len(work_a)*len(work_b)/word). Rows length = len(work_a), bit length = len(work_b). Memory rows = len(work_a)*len(work_b)/8. We want product maybe similar, but bit length affects big int size; rows length affects number of stored ints. Product same if swap? Rows memory = n*m/8 regardless, but Python int overhead per row: if m small, each int small; if n small, few ints. Big int operation cost per row = m/word; total n*m/word same. However Python loop overhead proportional n. If one list much longer, choosing longer as rows? Actually if n=200k, m=10, product same but loop 200k vs 10 if swapped. But spec 20k. We can choose work_a longer? Loop overhead maybe not huge. To minimize big int size (bit length), choose work_b shorter. Then rows count = longer. If original a shorter, we may swap so work_b = a (shorter), work_a = b (longer). Loop over longer but big ints small. Good.
But reconstruction insert loops total original n+m. Fine.
Need be careful with mapping and maybe reversed? We can implement a helper that computes script for work_a, work_b, then if swapped map signs. But maybe simpler: always compute with bitset over original b. Performance spec 20k both, no issue. But to be safe, add swap optimization. It adds complexity but manageable.

If we swap, rows length could be longer (e.g., original b 20k, a 10 -> work_a=20k, work_b=10). Rows 20k small ints. Good. If original a 20k, b 20k same. If original a 1000,b 20000, choose work_b=1000 (shorter), work_a=20000. Good.
Could also choose orientation based on `len(a) <= len(b)`? We want bit length m = min(len(a), len(b)). Let swapped = len(b) > len(a)? If len(b) > len(a), set work_a=b, work_b=a, swapped=True. Else work_a=a, work_b=b. Then m = len(work_b) <= n = len(work_a).
But if len(a)=len(b), no swap. If one empty? If len(b)>len(a) and a empty, work_a=b, work_b=a empty; m=0,n=len(b). Rows all 0; backtrack deletes work_a lines, then no insert; map swapped: '-' from work_a (original b) -> '+' original, gives all insertions. Good. If b empty, no swap (len(b)=0 <= len(a)), work_a=a, work_b=b; deletes a. Good.

Need map script efficiently. If swapped:
return [('=',x) if op=='=' else ('+',x) if op=='-' else ('-',x) for op,x in script]
But this allocates new list. Could integrate sign during backtrack? Maybe easier to backtrack directly to original signs based on swapped. But helper can return and map. Script length up to 40k, okay.
However if swapped, the backtrack's insertions loops use work_b lines (original a) as insertions ('+' in work script). Mapping will turn them into '-'. Good.
Let's test with simple swap: original a=['X'], b=['Y','X'] (len b > a). work_a=b=['Y','X'], work_b=a=['X'], swapped=True. Work script: delete Y? Let's compute rows work_a vs work_b: work_b 'X'. work_a row1 Y S=0; row2 X S=1. Backtrack i=2,j=1: h=0 match a[1]='X', state i=1,j=0; delete work_a[0]='Y'. rev: =X, -Y; reverse: -Y, =X. Work script for b vs a: delete Y, match X. Map: '-' (work_a original b) -> '+Y'; '='. Result: +Y, =X. Original a X, b Y X. Valid: insert Y, match X. Good.
Original a=['X','Y'], b=['X'] (len b <= a, no swap). Work a original, b original. rows row1 X S=1, row2 Y S=1. Backtrack i=2,j=1: rows[2]&1=1 h=0, a[1]='Y' != b[0]='X' delete Y; i=1,j=1; h=0 match X. rev: -Y, =X; reverse: =X, -Y. Valid.

Potential issue with swap and repeated lines: mapping signs preserves order. Good.

Now, is bitset LCS always minimal with repeated lines? Yes.

Alternative Myers: Could be expected. But final code with bitset likely accepted if performance. Need consider Python version 3.11+; int.bit_count available. We don't need bit_count except maybe initial LCS length? Not needed. But could use bit_count for something? No.

Let's test reconstruction with swap and low_mask update carefully.
Pseudo:
def diff_lines(a, b):
    if len(b) <= len(a):
        wa, wb = a, b; swapped=False
    else:
        wa, wb = b, a; swapped=True
    n = len(wa); m = len(wb)
    # build masks for wb
    masks = {}
    # If m large, maybe build using for j, line in enumerate(wb):
    for j, line in enumerate(wb):
        masks[line] = masks.get(line, 0) | (1 << j)
    rows = [0]
    S = 0
    get = masks.get
    for line in wa:
        x = S | get(line, 0)
        y = (S << 1) | 1
        S = x & ~(x - y)
        rows.append(S)
    # free masks
    # backtrack
    rev = []
    i = n; j = m
    low_mask = (1 << m) - 1 if m else 0
    # local variables for speed
    wa_list = wa; wb_list = wb; rows_list = rows
    while i > 0 or j > 0:
        old_j = j
        if i > 0:
            r = rows_list[i] & low_mask
            if r:
                h = r.bit_length() - 1
                if wa_list[i-1] == wb_list[h]:
                    # append insertions from j-1 down to h+1
                    for t in range(j-1, h, -1):
                        rev.append(('+', wb_list[t]))
                    rev.append(('=', wa_list[i-1]))
                    i -= 1
                    j = h
                else:
                    rev.append(('-', wa_list[i-1]))
                    i -= 1
            else:
                rev.append(('-', wa_list[i-1]))
                i -= 1
        else:
            rev.append(('+', wb_list[j-1]))
            j -= 1
        if j != old_j:
            low_mask >>= (old_j - j)
    rev.reverse()
    if not swapped:
        return rev
    # map
    return [ (op, line) if op == '=' else (op, line) ... ]

Mapping: for op,line in rev:
 if op == '-': ('+', line)
 elif op == '+': ('-', line)
 else ('=', line)
Could use list comprehension with conditional.
But note in swapped case, work_a is original b, work_b original a. Work '-' means delete from work_a => original b line only => should be '+' in original. Work '+' means insert from work_b => original a line only => '-'. Good.

Can we avoid mapping copy by building rev directly with original signs? If swapped, in backtrack when appending '-' from wa, original sign '+', when appending '+' from wb, original sign '-'. For '=' same. Then no map. But low_mask and rows computed on work. We can define sign_del = '+' if swapped else '-', sign_ins = '-' if swapped else '+'. Then in backtrack:
rev.append((sign_del, wa[i-1]))
rev.append((sign_ins, wb[t]))
This saves copy. Let's do that. But be careful: The returned script must have '-' for lines only in a (original), '+' for lines only in b. If swapped, work_del (wa) is original b, so sign should '+'. work_ins (wb) is original a, sign '-'. Good. If not swapped, sign_del='-', sign_ins='+'.
Then final rev already original signs. No mapping.
But during reconstruction, the invariant for work script uses '-' for wa and '+' for wb. We can use these signs in rev. Good.

Potential issue: The order of operations with sign swap still valid? Yes.

Now, we need think about if choosing work_a longer and work_b shorter affects the "highest set bit" reconstruction with signs? It's for work lists, okay.

Let's test with a case where work_a longer and work_b shorter, but original a shorter. Original a=['A','B'], b=['B','A','C'] len b 3 >2, swapped: wa=b, wb=a. Work script for b vs a. Let's compute mentally to ensure signs.
Original a A B, b B A C. LCS length1 (A or B). A minimal edit could: -A? Let's see one script: +B? If keep B: insert B? Original: a [A,B], b [B,A,C]. Script: -A, =B, +A? But b order B A C: To get a, delete B? Let's find LCS A: keep A: b insert B before A, delete B after A, insert C: +B, =A, -B, +C. LCS B: -A, =B, +A, +C. Both length5. Our algorithm choose?
Work_a=b [B,A,C], work_b=a [A,B]. Build rows for wa vs wb:
wb masks: A bit0, B bit1 (3)
wa row1 B: S? M[B]=2, S=0 => S=2? Formula x=2,y=1,S=2 (bit1). LCS of 'B' with 'A B' is1, row bits [0,1]? dp [0,0,1], bit1 yes.
row2 A: S_prev=2, M[A]=1, x=3,y=5,S=1 (bit0).
row3 C: S_prev=1, M[C]=0, x=1,y=3, x-y=-2, ~(-2)=1, S=1.
rows: 0,2,1,1.
Backtrack i=3 (C), j=2, low=3. r=1 h=0, wa[2]='C' != wb[0]='A' delete C (work '-' => original '+C'). i=2,j=2.
r=rows2=1 h=0, wa[1]='A' == wb[0]='A' match. Insertions for t=j-1=1 down to h+1=1: wb[1]='B' with sign_ins (original '-')? Work '+' => original '-'. Append ('-','B'), then ('=','A'). state i=1,j=0. i=1,j=0 delete wa[0]='B' sign_del original '+B'. rev: +C, -B, =A, +B. Reverse: +B, =A, -B, +C. Original script: +B, =A, -B, +C. Valid LCS A. Good.

Now, check if `wa_list[i-1] == wb_list[h]` might be expensive for large strings? Lines are strings, equality O(len(line)). But total comparisons: one per delete/match step up to n+m (40k). If lines long, could be costly. Could use masks to test bit h in O(big int shift?) Maybe not better. We can precompute masks and use `(masks.get(wa[i-1], 0) & (1 << h))` but that constructs 1<<h each time or shift. Could use `masks.get(wa[i-1], 0) >> h & 1`; shifting a big int by h creates new int of size m-h, maybe heavy. String equality likely cheaper if lines short; if lines long and repeated, maybe dict hashing? But lines are list elements, comparing adjacent? In worst, long lines could make 40k comparisons heavy. However diff_lines lines likely hashable strings; equality may early fail. We can use masks to avoid string comparison? We need masks anyway. We can keep masks for reconstruction and test bit using `(masks.get(wa[i-1], 0) >> h) & 1`. But shifting big int each step could be expensive. Alternatively, since h is highest set bit in rows[i] below j, and rows[i] bit h is set. If wa line equals wb[h], then masks[wa_line] has bit h. We can test `masks.get(wa[i-1], 0) & bit_h` where bit_h = 1 << h. Constructing 1<<h each step maybe big int of size h. But h decreases? Could maintain? Not trivial. String equality probably okay. But to be safe with long repeated strings, maybe use an integer ID mapping for lines to avoid long equality? We can intern lines to IDs. But then bit masks by ID. Let's consider.

We can map each unique line in wa/wb to integer IDs to speed comparisons and mask building. But Python dict of strings to ints; equality still hash. We can create `intern` dict for work lists. However original lines are strings; we need output original strings. We can keep work lists of original strings and maybe parallel IDs.
For mask building, we can use IDs: `line_id = intern.setdefault(line, len(intern))` but setdefault with line. Then masks list by ID. For rows computation, for each wa line get ID. For backtrack, need compare wa[i-1] and wb[h]; if we have IDs for wa rows and wb positions, compare ints. We can build `wa_ids` and `wb_ids` lists. But building IDs for 20k lines okay. It also speeds mask building: masks by ID list.
However if we choose work lists, we can create ID mapping for union of wa and wb. But memory: IDs lists of ints length n+m. Fine.
Implementation complexity moderate. Is it necessary? String equality 40k, probably fine. But for performance with 20k, string equality maybe negligible. The big int operations dominate. Simpler code without IDs is acceptable. But maybe using masks dict with big ints and string get in rows loop: `masks.get(line, 0)` hashes line each row (20k) and each b building (20k). Hashing strings maybe okay. If lines long, hashing expensive but Python caches hash? Strings hash cached after first? I think str hash is cached in object. If same line repeated, hash computed once. Different long lines, hashing 20k long strings maybe okay.
We can avoid storing masks big ints if using ID list? Actually masks list of ints by ID, but still big ints. Could reduce dict overhead. But code longer.
Given final answer should be robust, maybe implement ID interning for speed and to avoid repeated string comparisons? Let's evaluate.

Option simple:
masks = {}
for j,line in enumerate(wb): masks[line] = masks.get(line,0) | (1<<j)
rows...
backtrack compare strings.
This is clean. The performance spec: 20k lines, 50 diff. String operations likely fine.
Memory: masks dict big ints. If 20k unique, each mask int with one bit at high position: total ~27MB as estimated. Rows 50MB. Script ~40k tuples maybe 3MB. Total ~80MB. OK.
Time building masks: for each j, `1 << j` big int and OR. 20k unique => each mask int small? Actually each dict value initially `1<<j`, for unique lines, no OR accumulation beyond one bit. Sum sizes 27MB allocated. Fine.
Rows: each S int may have up to LCS bits, but size up to highest common position. In D small, maybe high. 50MB. Peak maybe 80-100MB. Good.

But there is a subtle memory issue: rows list stores S int for each row. In the loop, `S = x & ~(x - y)` creates new int; previous S referenced in rows. Good. But `x` and `y` temporary. Fine.

Can we reduce rows memory by storing only rows needed for backtrack? Need all. Could store array of Python ints.

Now, verify the "highest set bit" reconstruction with a formal invariant to ensure no hidden bug. Let's formalize:
Let A=wa, B=wb. For i in 0..n, R_i bitset. For j in 0..m, define F(i,j)=popcount(R_i & ((1<<j)-1)). Standard result F(i,j)=LCS(A[:i],B[:j]). For current (i,j) with F(i,j)=L, and state reachable by our algorithm such that the remaining optimal script length? Initially true. If i>0:
Let h = max {k<j | bit k set in R_i} (or -1). Then F(i,j)=F(i,h+1)=L (if h>=0), and bits >h below j zero. If h>=0 and A[i-1]==B[h], then F(i,h)=L-1. Need F(i-1,h)=L-1. We need prove. Since F(i,h)=F(i-1,h) + delta where delta is 0 or 1? Adding one row can increase by at most 1 for any prefix. If A[i-1] can match B[h] and bit h set, but could F(i,h)>F(i-1,h)? If A[i-1] matched earlier, F(i,h) could be F(i-1,h)+1. Then F(i,h+1)=L = F(i,h)+1 = F(i-1,h)+2, impossible because F(i,h+1)-F(i-1,h+1) <=1? Wait F(i,h+1) and F(i-1,h+1) differ by at most 1. If F(i,h)=F(i-1,h)+1, then F(i,h+1)=F(i,h)+1=F(i-1,h)+2. But F(i-1,h+1) >= F(i-1,h), and difference F(i,h+1)-F(i-1,h+1) <=1 would imply F(i-1,h+1) >= F(i,h+1)-1 = F(i-1,h)+1, possible. Not impossible. Example? Row i bits earlier and h, previous row bits? Could F(i,h)>F(i-1,h) and F(i,h+1)=F(i-1,h+1)+1? That would mean current row increased earlier and later? But total difference at h+1 maybe 1. Let's search for counterexample to h match validity.
We need A[i-1] matches B[h], h highest set bit in R_i below j. Could F(i-1,h) < L-1? Since L=F(i,h+1). If F(i,h)=L-1. If F(i-1,h) < L-1, then current row increased before or at h. If it increased before h, there is a set bit c<h in R_i. That bit could be due to A[i-1] matching earlier or previous row. But A[i-1] is last row; if it increased before h, that would mean it's used before h, conflicting with using at h. DP could have row bits earlier from previous row, not current. If F(i,h)>F(i-1,h), the increase before h must be due to A[i-1] (since previous row didn't). Then A[i-1] has a match before h. But can it also have match at h and row bit h set? That would be two increases due to same character? A single character can increase LCS by at most 1 total, so F(i,h+1)-F(i-1,h+1) <=1. If F(i,h)>F(i-1,h), then F(i,h+1)-F(i-1,h+1) <=? It could still be 1 if previous row also increased at h. Example previous row bits h, current row bits earlier c and h, total current popcount maybe previous+1? If previous row has bit h (increase at h), current has bits c and h, popcount current = previous+1 (if previous only h). Then F(i,h)=1 (c), F(i-1,h)=0, F(i,h+1)=2, F(i-1,h+1)=1. Difference1. This scenario possible? It would mean A[i-1] can match earlier c and also h? But if previous row's match at h, and current row matches earlier c, sequence previous row before current row: previous match at h occurs before current match in A order? Wait previous row is A[i-2] (before A[i-1]). Its match at h (column h) would occur before current A[i-1] in A order. For both to be in LCS, B order must have h before c? But c<h, so previous at h after current at c in B, order conflict (A: prev before curr, B: h after c). Cannot both. But DP row bitsets are not necessarily actual simultaneous matches? They represent some optimal sequence; if previous row has bit h, that means there is an optimal sequence for A[:i-1] ending at h. Current row bits c and h would imply an optimal sequence for A[:i] with two matches: one at c and one at h. The one at c could be previous row? No previous row bit c? If previous row only h, then c must be current A[i-1] (since current row new). Then sequence would be current at c then previous at h? But A order previous before current, B order c before h, so order would be previous (h) then current (c) invalid. DP wouldn't count both. Thus such row bitsets likely impossible. Let's test with actual strings to see if row i can have extra earlier bit and keep previous later bit. We tried and it dropped. The DP algorithm enforces order, so F(i,h)=F(i-1,h) if h is a new match for current row. So valid.
Thus reconstruction works.

But I want to be absolutely sure. Could implement a fallback verification using DP values computed from rows for candidate h, and if invalid, delete? But if our rule wrong, fallback might save. We can compute F(i-1,h) efficiently? We have L = F(i,j) maybe not stored. We can maintain L in backtrack. If match h, valid if F(i-1,h) == L-1 and F(i,h+1)==L (the latter true if h highest row bit below j). We can choose h as highest row bit below j, not just candidate. Then F(i,h+1)=L. Need check F(i-1,h)==L-1. We can compute prefix popcount of rows[i-1] masked to h bits: `rows[i-1] & ((1<<h)-1)` bit_count. But doing for every match could be costly. However matches <= LCS <= 20k; each bit_count on up to h bits (2.5KB) => 50MB extra, maybe okay. But we can avoid if rule proven. Yet adding verification could handle edge cases and ensure correctness, at some time cost. Need decide.

If we maintain L, we can also use it to decide delete vs insert maybe. But our rule uses h. Verification:
When r nonzero, h = highest row bit. If wa[i-1] == wb[h]:
   # optional: if h > 0 and (rows[i-1] & ((1<<h)-1)).bit_count() != L-1: then cannot match, delete? But if rule wrong, this would detect.
But constructing `(1<<h)-1` each match expensive. Could use low_mask shifted: low_mask currently bits < old_j. Since h < old_j. We need mask_h = (1<<h)-1. We can get from low_mask? low_mask = 2^old_j -1. To get lower h bits, `low_mask >> (old_j - h)`? If old_j - h = d, low_mask >> d = 2^h -1. Yes! Because low_mask has ones 0..old_j-1; shifting right d leaves ones 0..h-1. Great. So `mask_h = low_mask >> (old_j - h)`. But note low_mask variable before update. Then `prev_count = (rows[i-1] & mask_h).bit_count()`. If prev_count == L-1, match valid. If not, delete. Need maintain L. Initially L = rows[n].bit_count() (or rows[n] & full_mask, but rows[n] only m bits). When match: L -=1. Delete: L unchanged. Insert: L unchanged. But if we use delete when h doesn't match, L unchanged. If r=0, L should be 0? If r=0, F(i,j)=0, so L=0. Delete unchanged. If i=0 insert L unchanged (0). Good.
Verification cost: for each match (<=LCS) do bit_count on rows[i-1] & mask_h. mask_h is a shifted version of low_mask (new big int of size h bits). Shift creates big int. bit_count another. Matches up to 20k, size 2.5KB => 50MB, okay. But if LCS 20k, extra time maybe okay. However if D small, LCS ~20k, 20k bit_counts. Each bit_count over 20k bits (334 limbs) => 6.7M limb ops, similar to rows computation. Could still be under 2s maybe. But maybe unnecessary. If we include verification, we need ensure L initial. But if our rule is correct, verification always true. It may protect against off-by-one? But if verification false due to bug, deleting when h matches might still produce minimal? Maybe not. But it could produce a valid path? If h matches but invalid, deleting row i might be valid if F(i-1,j)=L. Is that true if invalid? Maybe not. Could lead to inconsistency. But if rule correct, no issue.

Could use L to simplify when r=0: if L=0 delete; else? But r=0 means F(i,j)=0, so L should be 0. We can trust.

Let's test rule with all examples. I think it's a known reconstruction method: To backtrack bit-parallel LCS, store S_i. At step i, let k be highest set bit in S_i below current j. If A[i-1] == B[k], output match at k and insertions after; else output deletion. This is likely correct. It uses property that the last match in row i is at highest set bit.

Let's search memory: There is algorithm to output LCS from bit-vector: For i from n down to 1, while ... Use `S_i` and `S_{i-1}`? Maybe standard: If `(S_i & M[a_i])` has bit at position equal to highest set bit of S_i, match; else delete. Yes.

Now, what about insertions when i=0? We insert all remaining wb. Good.

Let's consider if we should output operations in a particular minimal edit script. The problem only requires shortest and filters. Any minimal okay.

Potential issue: The number of "=" items equals LCS length. Our script does that. Good.

Now, performance of bitset rows with swap: If we choose work_b shorter, m maybe 0. `low_mask = (1 << m) - 1` for m large 20k okay. If m=0, 1<<0=1, -1=0. Good.

Edge cases:
- a=[], b=[] -> swapped? len(b)=0<=0 false? work_a=a=[], work_b=b=[], n=0,m=0, masks={}, rows=[0], backtrack loop none, rev=[], return [].
- a=[], b=['x','y'] -> len(b)>len(a), swapped True, wa=b, wb=a=[], n=2,m=0. masks={}, rows [0,0,0]. sign_del='+' (wa original b), sign_ins='-' (unused). backtrack i=2,j=0: r=0 delete wa[1] -> '+y', i=1; delete wa[0] -> '+x'; rev reversed -> +x,+y. Original a empty, b x y. Good.
- a=['x','y'], b=[] -> no swap, sign_del='-', delete all: rev +? loop i=2: delete y, delete x, rev reversed -> -x,-y. Good.

Now, one subtlety: In bitset row computation, if work_b length m is large and lines repeated, masks dict values can become big ints with multiple bits. The row S also big. Python's `x & ~(x - y)` uses `~` on possibly negative big int. If x-y negative large, `~` positive. Fine. But if x-y positive, `~` negative with infinite ones; `x & negative` works. Good.

Let's test row formula with a case where S has high bits and x-y positive:
B='ABC', M['A']=1. S0=0 -> S=1.
Row2 B: S=1, M['B']=2, x=3, y=3, x-y=0, ~0=-1, S=3.
Row3 C: S=3, M['C']=4, x=7, y=7, S=7.
Works.
Case where x-y positive not zero: S=1, M=4 (C) for A prefix? B='ABC', row? Suppose S=1, line C: x=5, y=3, x-y=2, ~2=-3 (bits ...1101), x&-3 =5 & ...1101 =5? But expected row for 'AC' vs 'ABC': LCS length1? A='AC', B='ABC' LCS2 actually row for C after A: dp [0,1,1,2], bits 0,2 =5. Good.

Now, could there be issue with using `rows[i] & low_mask` where low_mask updated by shifting right. Suppose old_j=5, low_mask=31. Match to h=2, new_j=2, shift by3 => low_mask=3 (bits0,1). Correct. Insert j-1: shift1. Delete no shift. Since j only decreases, low_mask always correct. What if match to h=old_j-1, shift1, low_mask bits < old_j-1. Correct new_j=old_j-1. Good.

Now, we need ensure `j = h` not `j = h + 1`. We reasoned new state (i-1,h). Let's double-check with low_mask update and future. Example a='A', b='BA' (m=2). rows: S row1? B='BA', M[A]=bit1. S=2 (bit1). Backtrack i=1,j=2, low=3, r=2, h=1, match. Insertions range(j-1=1,h=1) none. Append '=', state i=0,j=1. low shift old2-new1 =>1. i=0,j=1 insert b[0]='B'. rev: =A, +B; reverse: +B, =A. Valid. If we had set j=h+1=2, no progress? old_j=2, new_j=2, low unchanged, i=0, then insert b[1] then b[0]? Actually would output =A,+A,+B? Wrong. So j=h correct.
Example match at h=0,j=2: a='B', b='AB'. rows S? M[B]=bit0, S=1. Backtrack r=1 h=0, insert t=1: b[1]='A', '=', state i=0,j=0, low shift2 ->0. rev: +A, =B; reverse: =B,+A? Wait forward should match b0 B, insert b1 A. Reverse list [ +A, =B ]; reversed [ =B, +A ]. Good.
If we had j=h+1=1, then i=0,j=1 insert b0? would output? wrong.

Now, in match branch, we append insertions for t from j-1 down to h+1. For h=0,j=2, t=1 only, correct (b[1] after match). For h=1,j=3, insert b[2],b[1]? Wait matched b[1], columns after match: b[2] only (since prefix length j=3, matched index1, after indices 2). Range(j-1=2, h=1) -> t=2 only. Good. If matched index0 and j=3, after indices1,2. Range(2,0) -> 2,1. Good.

Deletion branch: append '-' wa[i-1]. No j change. Insert branch when i=0: append '+' wb[j-1], j--. The order of insertions relative to matches in reverse: Suppose state i=0,j=2, insert b[1], then b[0]. rev append +b1, +b0; reversed +b0,+b1. Forward insert in order. Good.

Now, could there be a case where i>0, j>0, r nonzero, h matches, but we should instead insert b[j-1] before matching? Our method inserts all b after h in reverse. Since h highest row bit, b[h+1..j-1] cannot be matched in row i. But could b[j-1] be matched in previous row i-1, and we should move left (insert in work) then delete/match previous? Work insert means line only in wb (original maybe deletion). In standard DP, at (i,j), if dp_i[j]==dp_i[j-1], you can move left (insert b[j-1]). If h < j-1, dp_i[j]==dp_i[j-1] (since no row bits after h), so moving left is valid. We do all such left moves until j=h+1, then diagonal. Good.
If h doesn't match, we delete. But could also move left? If h doesn't match, F(i,j)=L, highest row bit h not matching current row. Does F(i,j-1) equal L? Since h < j-1? If h = j-1 (highest bit at last column) but doesn't match current row, then F(i,j-1)=L-1, so cannot move left (would lose L). But can move up (delete) if F(i-1,j)=L. We argue yes. If h < j-1, F(i,j-1)=L, could move left instead of delete. Our algorithm deletes current row first. Is that always valid? Need check. If h doesn't match current row, F(i-1,j)=L. So delete valid. If also left valid, any order okay. Deleting first may produce different script but minimal. Example? a=['A','B'], b=['B','A']. rows? Row1 A bit1, row2 B bit0. Start i=2,j=2, h=0 matches current row B, so not this.
Need h not match current row. Example a=['A','C'], b=['B','A','C']? Row1 A bit1, Row2 C bit2? h=2 matches current C. Not.
Find h not match: current row not used. a=['X','Y'], b=['X','A','Y']? Row1 X bit0, Row2 Y bit2 (matches). Used.
Current row not used if no beneficial match: a=['X','Z'], b=['X','Y','Z']? Row2 Z used bit2. If current row line not in b after previous: a=['A','B'], b=['A','C','B']? Row2 B used bit2.
If current row not used, maybe because its only occurrence is before previous row's match and would conflict. a=['B','A'], b=['A','B'] (we saw current A used? row2 A bit0 used, previous B bit1 dropped; current used). Current not used example: a=['A','B'], b=['B','A']? current B used bit0. Hmm.
Maybe current row always used if it appears in b? Not if duplicates order? a=['A','A','B'], b=['A','B','A']? Current B used? Let's find a_i not used: a=['A','B','C'], b=['A','B','X'] current C not in b, r? rows row3 same as row2 bits0,1; j=3, h=1 (B) not C -> delete C. Good. h=1 < j-1=2, left also valid. We delete C, fine.
If current row appears but not used due to order: a=['A','B'], b=['B','A','A']? Row1 A bit1 or 2? Let's compute B='B A A', row1 A: M bits1,2 (6), S? x=6,y=1,S=6&~5? x-y=5, ~5=...1010, 6&~5 =2? bit1. row1 dp [0,0,1,1], bit1. Row2 B: M bit0, S_prev=2, x=3,y=5,S=1 (bit0). Current B used bit0. So used.
Maybe if a_i appears only before previous match: a=['A','B'], b=['A','B'] current B used. If a_i appears before previous but also previous could match later? a=['B','A'], b=['A','B'] current A used bit0, previous B dropped. Used.
Could current row not used if it appears but using it would reduce length? LCS length with prefix j maybe same as previous; if current appears at a position that allows same length but not last? If it appears, often can be last at some position and maintain length. But if all its occurrences are before necessary previous matches and using it would drop length, maybe not used. Example a=['A','B','A'], b=['A','B','B']? current A at pos0 only. Previous row AB vs b prefix has LCS2 (A,B). Adding current A cannot increase (L remains2). Current not used. rows: B='A B B'. Row1 A bit0. Row2 B: M bit1,2 (6), S_prev=1, x=7, y=3, x-y=4, ~4=...1011, S=3? bits0,1. Row3 A: M bit0, S_prev=3, x=3, y=7, x-y=-4, ~(-4)=3, S=3. rows3 bits0,1. Start i=3,j=3, low=7, r=3, h=1 (highest row bit), a[2]='A', b[1]='B' not match -> delete A. Valid. h=1 < j-1=2; left move would insert b[2] maybe. Delete first valid? F(i-1,3)=2 = L. Yes.
Script: a A B A, b A B B. Minimal: =A,=B,+B,-A. Our backtrack: i=3 delete A; i=2,j=3 h=1 match B? rows2 bits0,1 h=1 a[1]='B'=b[1], insert b[2] '+B', '=', state i=1,j=1; i=1 h=0 match A; rev: -A, +B, =B, =A; reverse: =A,=B,+B,-A. Good.
If we had inserted b[2] before deleting A: +B,-A,=B,=A also valid. Our order okay.

Now, what if h not match but h = j-1 (last column), left not valid. Delete must be valid. Example current row not in last column but row highest bit at last column from previous row. a=['A','B','C'], b=['A','B','X'] current C not in b, rows3 bits0,1? highest h=1 not j-1=2. Need h=j-1 not match: previous row has match at last column, current not used. a=['A','B','C'], b=['X','A','B']? Row1 A bit1, row2 B bit2, row3 C not in b rows3 bits1,2? highest h=2 (B) not C, j=3 h=2=j-1. Delete C valid. F(prev,3)=2. Good.

Thus algorithm okay.

Now, one more performance consideration: If len(b) <= len(a) no swap; m could be 20k, n 20k. If len(b) > len(a), swap makes m shorter. But rows list length n maybe up to 20k. Good. If both 20k, m=20k. If one 1000, other 20000, m=1000, n=20000; rows 20k ints of 1000 bits (125 bytes) => 2.5MB, much better. Time 20k*1000/word ~0.3M limb ops. Good.

But if original a shorter, swapped=True, sign_del='+', sign_ins='-'. Need rows computed for work_a (longer). In backtrack, `wa_list[i-1] == wb_list[h]` compares longer list line to shorter list line. Good.

Now, can we further optimize mask building by using ID to avoid dict with big ints? Let's decide final code style. Since final answer only code, should be clear. Could include comments? Fine. The user asked write function; code block only. We can include helper nested? Single function.

Potential issue: The bitset algorithm with swap and rows memory: If work_b is shorter but work_a longer, the LCS length can be at most m. rows[i] ints size m bits. Good.

Let's think about Myers alternative in case bitset time for 20k x 20k maybe too high in Python? Let's estimate more accurately. Python big int bitwise operations on 20k bits (2500 bytes). Each operation allocates result 2500 bytes and loops over 334 30-bit digits. 20k iterations * (OR, shift, subtract, invert, and) = maybe 5 operations. 100k big int ops * 2500 bytes = 250MB memory allocated, plus subtract/invert. 250MB memory allocation could take ~0.1s? Python allocator maybe 1s. 334 digits * 100k = 33M digit operations in C, very fast (<0.1s?). Actually Python big int bitwise has loop in C over digits, maybe 33M simple operations ~0.03s? With allocation maybe 0.2s. Rows append 20k ints. Reconstruction 40k steps; for each step `rows[i] & low_mask` (big int op 2500 bytes) and maybe bit_length. 40k*2500=100MB. Insertion/deletion appends. Total maybe under 1s. Good.
If m=20k but n=20k and D=50, rows[i] may often have high bit near 20k? Yes. But operations still.
If two completely different 1000: trivial.
Thus bitset passes.

But the problem hint explicitly Myers. Will a bitset solution be accepted? It's standard library, minimal. Performance spec maybe chosen for Myers but bitset likely okay. However, there is a worst-case performance not specified: two completely different lists of 1000 under 6s. Bitset 1000x1000 trivial. If hidden tests include 20k completely different? Spec says two 20k differ in about 50 places under 2s; completely different 1k under 6s. They might not test 20k completely different. Bitset for 20k completely different: rows all? If no common, S remains 0? Actually if no common lines, S=0 each row, big int ops small (0). Fast. If many differences but some common, LCS maybe large, rows big. 20k x 20k random lines with maybe some repeats? If random unique no common, fast. If random with repeats causing LCS maybe small? Could be okay. If two 20k lists with high similarity (LCS ~20k), bitset operations full size 20k, 20k iterations, still okay maybe under 2s? It is 20k^2/word ~6.25M word ops, likely okay. Myers would be O((N+M)D) if D small; if D large (e.g., 10000) bitset still 6M word ops. Good.

But Python big int bitset LCS time for 20k x 20k with full size: 20k loops, each operations on 20k-bit ints. Let's approximate with actual Python: 20k-bit int bitwise maybe ~0.5 microsecond per operation? 5*20k=100k ops *0.5us=50ms? Maybe allocation bigger. Could be 0.2-0.5s. Reconstruction with bit_count not used. Should pass 2s.

Now, one possible issue: The bitset algorithm computes LCS but not necessarily minimal edit script? LCS length minimal. Our script minimal. Good.

Let's consider if rows[i] & low_mask highest bit rule requires `rows[i]` to be the bitset after processing i lines, but our rows list includes row for i. Good.

Let's maybe include an optional verification with L to be safe but avoid time? Could include a debug assert? No, asserts could cost and fail if rule edge. Don't include.

But I want to be 100% certain of reconstruction rule. Let's try to prove and maybe test mentally with random small by enumerating? Can't run, but can reason. The bitset `S_i` has property: For each i, the set bits in `S_i` are exactly the columns j where `dp[i][j] = dp[i-1][j] + 1`? We found counterexample A='BA',B='AB' where S2 bit0, vertical diff row2-row1 at j=1 (column1) is 1, at j=2 diff0. Bits [1,0]. Vertical diff [0,1,0]? Not same. So not vertical.
Another property: `S_i` marks positions where `dp[i][j] > dp[i][j-1]` (horizontal increments). Yes. Then F(i,j)=prefix popcount. The highest set bit below j gives the column of the last increase in row i. The corresponding matched character in some optimal LCS for A[:i],B[:j] is A[i-1]? Is it always A[i-1]? The last increase in row i could be due to previous row vertical, not A[i-1]. Example A='BA', B='AB' row2 S2 bit0; horizontal increment at column1 due to row2? DP row2 [0,1,1], increment at j=1 from 0 to1. This is due to A[1]='A' matching B[0]='A'? Yes. Previous row row1 [0,0,1], at column1 row1 value0, row2 value1, vertical diff1. It is due to current row. If horizontal increment at j is not due to current row, then dp[i][j]=dp[i-1][j] and dp[i][j-1]=dp[i-1][j]? But row i increment could be inherited from previous row? Example row2 in A='AB',B='XAB' bits 0 and1. Highest bit1 due to current B; bit0 inherited? Row1 bit0 due to A. Row2 horizontal increments at bit0 and bit1. Highest bit1 due current. The lower bit0 inherited. So the highest set bit is always due to current row if current row increases LCS for that prefix; if current row doesn't increase, highest set bit may be inherited and not match current row. If inherited, current row not used, delete. If current row used, the last increase must be due to current row and should match A[i-1]. Thus rule.
Could there be a row where highest set bit is inherited but also A[i-1] matches that b[h] by coincidence, so rule matches even though current row not used? If A[i-1] matches b[h], then current row could be used at h with same length? Even if the particular DP path inherited, there exists an optimal path using current row at h because match condition and F(i-1,h)=L-1 likely. So valid.
Thus okay.

Let's think about lines can repeat; bit masks with OR handle. The bitset algorithm is for sequences of characters; repeated lines okay.

Now, code details:
- Function signature `def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:`.
- Use local variables for speed.
- Potential recursion? No.
- No input/print/tests.

Let's write code cleanly:
```python
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Choose the shorter sequence as the bit-vector columns.
    if len(b) <= len(a):
        wa, wb = a, b
        swapped = False
    else:
        wa, wb = b, a
        swapped = True
    n = len(wa)
    m = len(wb)
    masks = {}
    for j, line in enumerate(wb):
        masks[line] = masks.get(line, 0) | (1 << j)
    rows = [0] * (n + 1)  # maybe preallocate for speed
    s = 0
    get_mask = masks.get
    for i, line in enumerate(wa, 1):
        x = s | get_mask(line, 0)
        y = (s << 1) | 1
        s = x & ~(x - y)
        rows[i] = s
    # free masks? 
    # del masks
    del masks
    rev = []
    append = rev.append
    sign_minus = '-' if not swapped else '+'  # for wa deletions (lines only in wa)
    sign_plus = '+' if not swapped else '-'   # for wb insertions
    i = n
    j = m
    low_mask = (1 << m) - 1
    wa_local = wa
    wb_local = wb
    rows_local = rows
    while i > 0 or j > 0:
        old_j = j
        if i > 0:
            r = rows_local[i] & low_mask
            if r:
                h = r.bit_length() - 1
                if wa_local[i - 1] == wb_local[h]:
                    for t in range(j - 1, h, -1):
                        append((sign_plus, wb_local[t]))
                    append(('=', wa_local[i - 1]))
                    i -= 1
                    j = h
                else:
                    append((sign_minus, wa_local[i - 1]))
                    i -= 1
            else:
                append((sign_minus, wa_local[i - 1]))
                i -= 1
        else:
            append((sign_plus, wb_local[j - 1]))
            j -= 1
        if j != old_j:
            low_mask >>= old_j - j
    rev.reverse()
    return rev
```

Check sign naming: `sign_minus` for wa deletions in work script. If not swapped, work wa=original a, delete => '-' correct. If swapped, work wa=original b, delete => '+' correct. `sign_plus` for work insertions from wb. If not swapped, work wb=original b, insert => '+' correct. If swapped, work wb=original a, insert => '-' correct. Good.
But variable names sign_minus/sign_plus maybe confusing; okay.

Potential bug: Preallocating rows = [0]*(n+1) stores same int 0 references, okay ints immutable. Then assign rows[i]=s. Good.
`low_mask = (1 << m) - 1` if m=0 =>0. Shifting right by 0 okay. If m large 20k, 1<<m okay.
When `j != old_j`, `old_j - j` positive. In match, j=h could be 0; shift by old_j. In insert, shift1. Good.
But note in match branch, we use `low_mask` to compute r before updating. Then after appending insertions, update j and low_mask. The insertions loop uses `j` old value; we haven't changed j yet. Good.
In delete branch, j unchanged, low_mask unchanged. In i=0 insert branch, j-- and low_mask shift. But if i=0, rows not used. Good.

Now, one subtle bug: If swapped, `wa` and `wb` are references to original lists. `sign_plus` is for `wb` insertions. In match branch, we append insertions from `wb` with sign_plus. In i=0 branch, append insertions from `wb` with sign_plus. Good. Deletions from `wa` with sign_minus. '=' uses `wa[i-1]`. Since '=' lines exist in both, using wa line okay. If swapped, wa is original b, but '=' line same string as wb h. Good.

Now, do we need to handle non-string lines? Type says list[str]. Fine.

Let's test with a simple case using code mentally:
a=['a'], b=['a']
len b<=a no swap, n=1,m=1,masks{'a':1}, rows[1]=1, rev loop i=1,j=1 low=1 r=1 h=0 equal, no insert, append =a, i0,j0, low>>=1 ->0, reverse =a. good.
a=['a'], b=['b']
m=1 masks{'b':1}, rows[1]=0 (x=0,y=1,s=0). loop i1,j1 r=0 delete sign_minus '-' a, i0. insert sign_plus b, j0. rev [-a,+b] reversed +b,-a? Wait loop order: i>0 r=0 append -a, i=0. low unchanged (j=1). while i=0,j=1: append +b, j=0, low>>=1. rev = [('-','a'),('+','b')]. reverse => [('+','b'),('-','a')]. Is that a valid script? a=[a], b=[b]. Forward: insert b, delete a. Filtering =/-: -a gives a; =/+: +b gives b. Minimal. Order insert before delete is okay. Some diff outputs delete then insert, both minimal. Problem doesn't require specific order. Good.
But is taking = and - in order exactly a? Script +b, -a: =/- items: -a -> a. =/+ items: +b -> b. Good.
For two completely different, our script inserts all b first (in forward) then deletes all a? Let's see a=['a','b'], b=['c','d']. rows all 0. Backtrack deletes b,a (reverse order) then inserts d,c. rev: -b,-a,+d,+c; reverse: +c,+d,-a,-b. Forward: insert c,d then delete a,b. Valid. It's minimal. Some might prefer delete then insert, but allowed.

Check constraint: "Taking the '=' and '-' items in order must give exactly a; taking the '=' and '+' items in order must give exactly b." It doesn't require operations correspond to a particular diff algorithm; any interleaving okay. Insert all b then delete all a works for no overlap.

Now, potential issue with LCS length and script length: Our script for no overlap length n+m, minimal. Good.

Let's test a case where a and b share but our order may put insertions before deletions. a=['a'], b=['b','a'] -> no swap? len b 2 >1 swap True (wa=b, wb=a). Work rows: wa [b,a], wb [a]. rows: row1 b 0, row2 a 1. Backtrack i2,j1: h0 match a, state i1,j0; delete wa0 b with sign_minus (swapped => '+b'); rev: =a, +b; reverse: +b, =a. Original: insert b, match a. Good. If no swap? Not possible because b longer. If a longer a=['a','c'], b=['b','a'] len equal no swap. rows: a row1? wb b,a: a mask bit1. row1 c? Wait wa=a original ['a','c']? Actually no swap wa=a ['a','c'], wb=b ['b','a']. rows row1 a: S bit1; row2 c: S bit1. Backtrack i2 (c), j2, low3, r=2 h1, c != wb[1]=a delete c (sign_minus '-c'); i1,j2. r=2 h1, a==a match, insert wb[1]? h=1,j=2 none? Wait matched index1 (a at b[1]), state i0,j1. Insert wb[0]=b sign_plus '+b'. rev: -c, =a, +b; reverse: +b, =a, -c. Forward: insert b, match a, delete c. Valid. Could also delete c first; both okay.

Now, check if script is "shortest edit script" usually edit script minimal number of operations (insertions+deletions). Yes.

Potential hidden requirement: The script should be "shortest" in number of items, not necessarily minimal insertions/deletions? Same. Our items = n+m-2*LCS, minimal.

Now, let's consider alternative: Use Myers O((N+M)D) maybe expected to handle 20k 50 diff in under 2s. Bitset does O(NM/word) but with 20k^2/word ~6.25M word ops. Under 2s likely. But if Python big ints use 30-bit limbs, 20k bits ~667 30-bit? Wait 20k/30=667, not 334 (I earlier used 64-bit). Python uses 30-bit digits on 64-bit builds. 20k bits /30 = 667 digits. 5 ops*20k*667=66.7M digit ops. Still okay maybe ~0.1-0.3s? Python digit operations in C, 67M maybe 0.5s. Memory: 20k bits = 2500 bytes, digits 667*4=2668 bytes plus overhead. Rows 20k*~2.7KB=54MB. Good.
If m=20k and n=20k, rows 54MB. masks unique one-bit ints total sum digits: sum j/30*4 ≈ (4/30)*200M? Wait 20k*19999/2=199,990,000; /30*4=26.66MB. Peak ~81MB. Fine.
But if lines repeated, masks one big int with many bits 2.5KB, much less.

Could there be a memory limit of 64MB? Then 80MB might exceed. Myers would be lower. Do we need to worry? Competitive programming maybe memory 256MB. Problem statement doesn't specify. To be safer, could implement Myers linear-space to reduce memory. But complexity higher. Let's evaluate if we should implement Myers instead. The hint explicitly Myers, performance 20k 50 diff under 2s, 1k completely different under 6s. They may expect O((N+M)D) time and memory maybe O(D) or O(N+M). Bitset O(NM/word) memory might be accepted but if memory limit tight, maybe not. We can perhaps implement Myers divide-and-conquer to be more aligned and memory efficient. Let's explore implementing Myers correctly. It might be more complex but doable. Need final code reliable. Let's consider.

Myers O(ND) difference algorithm for edit script:
Given two sequences A length n, B length m. We can compute shortest edit script (with equal/delete/insert) using Myers algorithm. The classic algorithm finds a middle snake via forward and backward searches, splits recursively. Complexity O((N+M)D), space O(D) per recursion plus output. For n=m=20k,D=50, very fast. For n=m=1000,D=1000, O(1M) maybe fast. Implementation in Python with lists/arrays.

Need produce script with equals. Myers typically computes edit operations (insert/delete) with middle snake equals. We can output equal lines in snake.

Let's recall algorithm from Myers (1986) and diffutils. For shortest edit script (insert/delete), we can use forward and backward search in grid. State: x = i - k? Usually diagonal k = x - y, where x is rows consumed (A index), y cols (B index). Forward search from (0,0), backward from (n,m). A snake is a maximal run of matches (equals) along diagonal. The algorithm finds a diagonal k where forward and backward paths intersect, and the meeting point. Then split.

Pseudo (from gist):
def myers_diff(a,b):
    n=len(a); m=len(b)
    max_d = n+m
    # use arrays vf, vb of length 2*max_d+1 initialized -1
    # forward: for d in 0..max_d:
    #   for k in range(-d, d+1, 2):
    #      x = max(vf[k-1], vf[k+1]-1?) Actually compute best x on diagonal k.
    #      if k == -d: y = x - k? Let's derive.
Standard Myers for edit distance (only insert/delete):
Forward V[k] = furthest x reached on diagonal k after d edit operations (snakes). Start V[1]=0 (k=0). For each d:
  for k in range(-d, d+1, 2):
    if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]; y = x - k
    else: x = V[k-1]+1; y = x - k
    while x < n and y < m and A[x]==B[y]: x++; y++
    V[k] = x
    if k in backward V? check overlap.
Backward from end similar on reversed sequences.
But to output script, recursive middle snake:
Function diff(a,b):
 if not a or not b: output all inserts/deletes
 if a[0]==b[0]: maybe? Myers can skip common prefix/suffix to reduce.
 Use forward/backward to find middle snake:
   forward arrays, backward arrays. For d from 0..:
     compute forward row, backward row, check if they meet.
   Meeting condition: for some diagonal k, forward V[k] and backward V[k] (furthest x from start and from end?) overlap. Need careful.
Backward search: diagonal k = x - y? From end, maybe use k = x - y as well but with reversed sequences. Backward V[k] stores the smallest x reached on diagonal k going backward? Overlap if forward_x >= backward_x on same diagonal? Let's derive.

Alternative implement Hunt-Szymanski? No, Myers hint.

Maybe easier: Use bitset but reduce memory by storing rows only for every block and recompute? Like Hirschberg divide-and-conquer with bitset? Could be complex.

Given time, bitset simpler and likely passes. But let's not dismiss Myers; if we can implement correctly, it's more robust for memory and matches hint. Let's explore in depth.

Myers edit script algorithm (O(ND), linear space) from "A linear-space variant of the difference algorithm". It recursively finds a middle snake.
Definitions:
Grid from (0,0) to (n,m). Edges: down (delete A) x+1, right (insert B) y+1, diagonal match (equal) x+1,y+1 cost 0? Myers counts edit ops (insert/delete) and snakes.
A path with D edits has D+1 snakes.
Forward search: after D edits, set of possible positions (x,y) with x-y=k. For each diagonal k, keep furthest x (max x) reached.
Backward search: from (n,m) backwards, after D reverse edits, for each diagonal k, keep furthest x? Backward path in reverse grid from (n,m) to (0,0). Could use same arrays but with reversed sequences and coordinates from start? Maybe easier: Run Myers on reversed sequences to get backward V in original coordinates.

The classic middle-snake algorithm (from Myers paper):
Given start (x0,y0), end (x1,y1). If x0==x1 and y1==y1? empty.
Let n = x1-x0, m = y1-y0.
Run forward from (x0,y0) and backward from (x1,y1) in this subproblem.
For D=0,1,...:
  Compute forward V_f for D edits.
  Compute backward V_b for D edits (from end).
  Check if there exists diagonal k such that V_f[k] >= V_b[k] (in coordinates relative to start? Need consistent). If yes, a middle snake lies on diagonal k. The snake is from (max(V_f[k], V_b[k]?), ...)?
Actually forward V_f[k] is furthest x from start on diagonal k after D edits. Backward V_b[k] maybe furthest x from start reachable from end with D edits? If we store backward as furthest x from start that can reach end with D edits? Then overlap if V_f[k] >= V_b[k]. The middle snake starts at (x, x-k) where x = V_f[k] (or V_b?) and extends matches until x >= V_b[k]? Let's find exact.

Alternative: Use known implementation from `difflib`? No. There is a simple Myers diff implementation in Python (e.g., from "myers diff" package). Let's recall code:
```
def myers_diff(a, b):
    n, m = len(a), len(b)
    max_d = n + m
    vf = [-1]*(2*max_d+1)
    vb = [-1]*(2*max_d+1)
    # offset = max_d
    vf[offset] = 0
    vb[offset + n - m] = n  # ???
    for d in range(max_d+1):
       # forward
       for k in range(-d, d+1, 2):
          if k == -d or (k != d and vf[offset+k-1] < vf[offset+k+1]):
             x = vf[offset+k+1]
          else:
             x = vf[offset+k-1]+1
          y = x - k
          while x < n and y < m and a[x]==b[y]: x+=1; y+=1
          vf[offset+k] = x
       # backward
       for k in range(-(d+1), d, 2)? ...
       # check intersection
       for k in range(-d-1, d+2, 2)?
```
Hmm.

Maybe implement a non-recursive algorithm that directly outputs script using forward V and backward V at minimal D? There is an algorithm to find shortest edit script by recording all V arrays for each d? That would be O(ND) memory maybe D* (2D) ~ D^2? For D=1000, 1M ints okay; for D=20000? 400M not. But spec D small/large 1000. Could store V per d to reconstruct? For 20k D=50, 50 arrays small. For 1000 D=1000, 1000 arrays of length 2001 ~2M ints, memory ~16MB if array('i') maybe okay. But time? Could be okay. But hidden maybe D=20000 (20k no overlap) then max_d=20000? For 1k completely different D=1000. For 20k completely different, D=20000? But spec doesn't require 20k completely different. If we store all V for D up to n+m=40000, arrays 40000*40001 impossible. But no overlap bitset fast. Myers with D=40000 would be O((N+M)D)=1.6B impossible. But bitset would be fast if no overlap? Actually no overlap D=40000, Myers terrible. Spec only 1k completely different (D=1000) under 6s. Myers O(1M) okay. But if hidden 20k completely different, Myers too slow. Bitset handles. So bitset more robust for large D.

Could combine: Use bitset for large D? But bitset memory. Maybe use Myers when D small? Need know D. Could compute LCS length via bitset? Then choose? Too complex.

Maybe implement bitset but store rows in `array` of 64-bit? Python standard library array could store big ints? Not for 20k bits. Could store rows as bytes? We could store each row bitset as `bytes` to reduce memory? But bitwise operations on bytes not as fast; need convert to int for backtrack. Not necessary.

Let's stick with bitset. It's elegant and likely passes. Need ensure no `difflib`. Good.

But the problem hint says Myers O((N+M)D). If a judge measures 20k with 50 diff, bitset O(20k*20k/word) ~6M word ops, okay. If Python big int 30-bit digits, 6.6M? Wait 20k bits /30 = 667 digits. n=20k => 13.34M digit ops per operation type. 5 types =>66.7M. C 66M digit ops maybe ~0.1-0.3s. plus memory. Fine. Under 2s.

Let's consider worst-case 20k lines all same. Bitset rows: S quickly becomes full mask? For B all same length20k, M all bits set (2^m-1). Row1 S=1, row2 S=3, ... row i S=(1<<i)-1 until i=m, then full. Big int size grows gradually. Total digit ops sum over i of i/30 ~ m^2/(60) for first 20k? 6.6M digits? Actually sum sizes ~ (20k^2)/(60) digits? 400M/60=6.7M digits, times ops. Similar. Rows store ints of increasing size total memory 50MB. Good.

Now, one potential bug with all same: rows[i] for i>m remains full mask. Backtrack: n=m=20k. i=20k,j=20k low full. r=full h=19999, match, j=19999, low shift1. Repeat 20k matches. In each match, `for t in range(j-1,h,-1)` empty. Loop 20k. Fast. If n>m, e.g., a 20k all same, b 10k all same (no swap? len b <= a, m=10k,n=20k). rows full after 10k. Backtrack: i=20k,j=10k. For first 10k rows? It will match 10k times, then i=10k,j=0, delete remaining 10k. Script length 30k. Good. Time rows 20k*10k/word smaller.

Now, could low_mask shifting right over many iterations be O(1)? Shifting a big int by 1 creates a new big int of size m-1 bits each insert/match. If we do 20k matches, each shift by1 allocates and copies ~2.5KB => 50MB, okay. In match all same, 20k shifts of decreasing size => total copy ~25MB. Good.
But in cases with many insertions, shifting by1 each insert. Total copy O(m^2/word)? If m=20k and all insertions? i=0 then insert 20k, low_mask shifts by1 each, total copy ~25MB. Good. If mixed, total j decreases from m to0, each step shift by delta; total copied size sum over new low_mask sizes? If shift by1 m times, sum sizes ~m^2/2 bits? 20k*2.5KB average 1.25KB=25MB. Fine.

Could optimize low_mask update by not maintaining if we only need when j changes; but okay.

Now, maybe we can avoid low_mask and use `rows[i] & ((1 << j) - 1)` with precomputed masks? Maintaining low_mask good.

Potential issue: `low_mask >>= old_j - j` when `old_j - j` can be large (e.g., match to h=0 from j=20000). Shifting a 20k-bit int right by 20000 yields 0, but operation may need to process all digits? Python right shift by large amount likely O(size of result) maybe 0, but might still check? It probably allocates new int of size (old size - shift). If shift >= size, result 0 fast. Good.

Now, if j changes by large delta, low_mask shift by delta. In match, we also loop over insertions for t from j-1 down to h+1; if delta large, loop large. Total insertions. Good.

Let's think about correctness of using highest set bit in `rows[i] & low_mask` instead of also considering `i>0` and `j>0`. If j=0, low_mask=0, r=0, delete. If i=0, insert. Good.

Now, one more subtle point: The rows bitset algorithm assumes B length m bits; if m is very large, `(1 << m) - 1` creates full mask. We only need low_mask initial; masks dict values are built with `1<<j`. For m=20k, okay. For m=0, low_mask=0. Good.

Could we skip building masks if m=0? The loop `for j,line in enumerate(wb)` none, masks empty. rows all 0. Fine.

Could we skip rows storage if n=0? rows=[0]*(1). backtrack insert all. Fine.

Now, final code should be in a single ```python block. No tests. Could include docstring/comments. The instruction: "Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing." So final only code block.

Before final, let's consider if the bitset algorithm with Python's `~` and negative numbers could produce `S` with bits set beyond m due to `x & ~(x-y)`? Since x has no bits beyond m, result no bits beyond m. Good. But if x=0 and x-y negative, ~ negative maybe 0? For x=0,y>0, x-y=-y, ~(-y)=y-1 positive. 0 & (y-1)=0. Good.

Now, what about Python's memory of rows preallocated list of zeros: `[0] * (n + 1)` uses references to same int 0. Then assign. Fine.

Potential micro-optimization: In rows loop, `get_mask = masks.get`; `for i, line in enumerate(wa, 1): ...` okay. Could local `rows_local = rows` no need.

Backtrack micro-optimization: In match branch, `wa_local[i - 1] == wb_local[h]` string comparison. If h large, okay. But if lines are long and many comparisons, could be heavy. We can use masks to test equality at h without constructing bit. Maybe use `masks` if we keep it. We deleted masks. Could keep masks and use `(get_mask(wa_local[i-1], 0) >> h) & 1`. But shifting big int each match maybe heavy. String equality might be cheaper for short lines. For long lines, Python string equality compares length first; if lengths differ, O(1). If same long lines, hash? Equality may compare full content if same length. But if they are equal, it may compare all bytes. 20k matches * long line length could be heavy. Could use IDs to avoid. Let's consider adding interning without too much complexity.

ID interning approach:
- For work lists wa, wb, create `id_map = {}`, `next_id = 0`, `wa_ids = []`, `wb_ids = []`.
But we need output original lines, so keep wa, wb lists.
Function to get id:
```
def _get_id(line):
    nonlocal next_id # if nested, or use dict setdefault
```
Simpler:
```
ids = {}
def get_id(line):
    id_ = ids.get(line)
    if id_ is None:
        id_ = len(ids)
        ids[line] = id_
    return id_
```
But `ids.get(line)` returns None if id 0? Use `if id_ is None`, but if line maps to None impossible. Or use `setdefault` but may hash twice.
```
for line in wa + wb: ...
```
But creating wa+wb copies list. Do separately.
Then masks as list length num_ids, each int. But we need masks while building; number of unique IDs known after interning. We can interning first, then masks = [0]*len(ids). Then fill masks by wb_ids: for j,id in enumerate(wb_ids): masks[id] |= 1<<j.
Rows loop: for id in wa_ids: x = s | masks[id].
Backtrack compare IDs: `if wa_ids[i-1] == wb_ids[h]:`.
This avoids string equality and masks dict big ints? masks list of big ints length unique. If unique 20k, same big ints total memory as dict values, but list overhead less; plus ID mapping dict mapping strings to ints (keys are same string objects, values small ints) maybe additional memory but not huge. wa_ids, wb_ids lists of ints (20k each) ~160KB? Python ints 28 bytes each -> 1.1MB each. IDs dict maybe 20k entries ~1MB. Acceptable. It also speeds rows loop (no hash each row, just list indexing). It may be worth.
But code longer. Also if we delete IDs dict after rows? Need IDs for backtrack compare. Keep wa_ids, wb_ids, maybe not ids dict. Can `del ids` after building to free string->id dict? But strings still referenced in wa/wb. IDs small. Could delete ids to save memory. But if we need output original lines, keep wa/wb. We can delete ids after wa_ids/wb_ids built. Masks list needed for rows; after rows, can delete masks. Then backtrack only uses wa/wb and ids lists. Good.
Memory: masks list unique big ints (same as dict values). IDs dict maybe peak; delete before rows? Need masks filled. We can build IDs and masks, then delete ids, then rows. Good.

But interning itself requires hashing strings. Fine. It also allows masks list indexing faster.
Let's design with IDs:
```
def diff_lines(a,b):
    if len(b) <= len(a):
       wa, wb = a, b; swapped=False
    else: ...
    # interning
    id_map = {}
    wa_ids = [0]*len(wa); wb_ids=[0]*len(wb)
    # To avoid function call overhead, loop:
    next_id = 0
    for i, line in enumerate(wa):
        id_ = id_map.get(line)
        if id_ is None:
            id_ = next_id; next_id += 1; id_map[line] = id_
        wa_ids[i] = id_
    for j, line in enumerate(wb):
        id_ = id_map.get(line)
        if id_ is None:
            id_ = next_id; next_id += 1; id_map[line] = id_
        wb_ids[j] = id_
    masks = [0] * next_id
    for j, id_ in enumerate(wb_ids):
        masks[id_] |= 1 << j
    # del id_map
    rows = [0]*(len(wa)+1)
    s=0
    for i, id_ in enumerate(wa_ids,1):
        x = s | masks[id_]
        y = (s << 1) | 1
        s = x & ~(x - y)
        rows[i]=s
    del masks
    # backtrack compare wa_ids[i-1] == wb_ids[h]
```
Potential issue: `id_map.get(line)` returns None if id is None, but IDs are ints starting 0, so okay. However if line itself is None? Type str, no. If a line maps to id 0, get returns 0 not None. Good.
But using `None` sentinel: if a line's ID could be None? no.
Could use `if id_ is None:` but if line not found and `id_map.get(line, -1)`? Simpler with sentinel object? `id_ = id_map.get(line, -1); if id_ == -1:` but ID could be -1? no if start 0. Use -1.
```
id_ = id_map.get(line, -1)
if id_ < 0: ...
```
Good.
This interning adds two passes over wa/wb. For 20k, negligible. It also creates IDs lists. Then masks fill.
Memory peak: id_map (string->int), wa_ids/wb_ids, masks, rows. Could delete id_map before rows to reduce peak? Need masks filled; after masks, `del id_map`. Then rows. Good.
Could also delete wa_ids? Need for backtrack. Keep.
Could delete wb_ids? Need. Keep.
Could delete original a/b? They are wa/wb references. Keep.
If swapped, wa/wb references original lists; no copy.

Is interning worth code? It ensures speed and avoids long string equality. I think final code can be a bit longer but still clear. The problem only asks function; okay.

However, using `id_map.get(line, -1)` with strings: if line not found, returns -1. But if a line is actually mapped to -1 impossible. Good.

Potential micro-optimization: Build `id_map` using `setdefault`? The above loops fine.

Now, rows loop with `masks[id_]` list indexing. Good.
Backtrack compare IDs: `if wa_ids[i - 1] == wb_ids[h]:`. This is fast. Output '=' line uses `wa_local[i-1]`. Insertions use `wb_local[t]`. Good.

Could we delete `wa_ids` after backtrack? Not needed.

Now, if m=0, wb_ids empty, next_id maybe from wa only. masks list length next_id (maybe >0). Fill none. Rows loop uses masks[id_] which is 0 for all. Good. low_mask=0. Backtrack deletes wa. If swapped (original a empty), sign_plus '+' for wa (original b) deletions. Good.
If n=0, wa_ids empty, next_id from wb. rows length1. Backtrack inserts wb. sign_plus (if swapped? If n=0 and swapped? That means original a longer? Let's see swapped True when len(b)>len(a). If n=work_a=original b >0, m=work_b=original a=0. Backtrack i>0,j=0 deletes wa (original b) with sign_minus='+'; no inserts. Good. If no swap and n=0 (a empty, b empty? or b<=a but a empty only b empty) okay.

Now, if next_id=0 (both empty), masks=[]. rows loop none. Backtrack none. Good.

One possible issue: The ID map uses string objects as keys. If the same content appears in a and b but different objects, dict finds equal. Good.

Now, let's consider if we can further reduce memory by not storing `wa_ids` and `wb_ids` as Python lists of ints (which are objects) but using `array('I')`? Standard library array. But not necessary. Lists of ints 20k each small.

Now, time for interning: For 20k unique long strings, id_map stores references to same string objects; hashing each string once. Rows loop no hashing. Good.

Potential issue: In ID interning, using `id_map.get(line, -1)` and then if id_ < 0, assign. If line is very long, hash computed once and cached. Good.

Now, let's revisit Myers vs bitset. If memory limit 64MB, our with IDs maybe: rows 54MB, masks 27MB, ID lists 1.1MB, id_map maybe deleted before rows? Peak during masks: id_map ~? 20k entries dict maybe 1MB + int values 0.5MB + strings already in lists. masks 27MB. Then delete id_map, rows allocate 54MB. Peak rows + masks =81MB. If memory limit 64MB, fail. Could reduce masks memory by not keeping masks while rows? Need masks for rows only; after rows computed, delete masks. But peak includes both because rows allocated while masks exists. Could compute rows and then delete masks; peak rows+masks. Could we free masks gradually? Not really. Could use dict masks with one-bit ints total 27MB; similar. Could avoid storing full masks by computing row updates from b positions? Maybe for each line, need mask of positions. Could store masks as list of int; same. Could compute rows using a different algorithm (Myers) to lower memory. But maybe memory limit >128MB.

Could reduce rows memory by storing rows as `bytes` of bitset? For backtrack, need row bitsets. We could store each row as `int` but maybe compress? Since D small, rows differ little? Not easy. Or use Myers. Hmm.

Let's think if bitset rows memory 54MB plus masks 27MB is acceptable. Python int overhead: For 20k-bit full int, size = 24 + 4*ceil(bits/30) = 24 + 4*667 = 2692 bytes. 20k rows = 53.8MB. Masks unique one-bit: sum sizes = sum_{j=0}^{19999} (24+4*ceil(j/30)) ≈ 20k*24 + 4/30*19999*20000/2 = 0.48MB + 26.66MB = 27.1MB. Total 80.9MB. Plus list rows: 20k*8=0.16MB. wa_ids/wb_ids: each list 0.16MB + ints. IDs are small ints? Python caches small ints up to 256 only; IDs up to 20k, each int object 28 bytes, but list stores references to int objects. When we create IDs, each ID int object is stored in id_map and wa_ids/wb_ids. The same int object for a given ID? Python ints are immutable; when we assign `id_ = next_id`, that int object is stored in id_map and list. For each unique ID, one int object in id_map value, and list entries reference that same object? Actually when `id_` variable gets int, list stores reference. For later same ID, `id_map.get` returns the same int object. So unique int objects ~next_id (20k*28=0.56MB). Lists references 0.16MB each. id_map dict ~1MB. Strings themselves in input lists not counted? They exist. Script list 40k tuples: each tuple 56 bytes + references, plus op strings interned? Op strings reused? We create tuples with op string literals; Python may intern? String literals in code are constants, reused. Line references to existing strings. 40k*56=2.24MB + list 0.32MB. Total maybe 85MB. Plus Python interpreter overhead. If memory limit 128MB, okay. If 64, not.

Can we reduce masks peak by using the same rows memory? We could compute rows after building masks, but maybe build masks as dict of positions? Alternative: Use line IDs and for each ID store list of bit positions; then in rows loop, we need mask int. Could compute mask on the fly for each ID once and store in dict; same. Could avoid storing all masks by sorting unique lines and building rows? No, rows loop needs mask for each wa line in order. Could precompute masks in a `bytes` object? The big int mask for each unique line is a bitset. Total bits for all masks = unique * m? If each unique has one bit, total bits = unique*m? Actually one-bit int size proportional to position, not m. If we stored as Python int, 27MB. If stored as `bytearray` of length m/8 for each unique, unique*m/8 = 20k*2500=50MB, worse. If stored as sparse lists of positions, total positions = m (20k) if unique, very small! For rows loop, we need bitwise OR of S with mask. Could we update bitset using sparse positions? For each line, mask may have multiple positions. We could represent masks as list of bit positions, and update S by setting bits? The bit-parallel formula requires bitwise operations with mask, not just OR? `x = S | mask`. If mask sparse, we could OR bits individually, but formula also uses x-y etc. Could maybe compute `x` by starting from S and setting bits at positions; if many positions for a line, cost. In worst all same line, mask has 20k bits; setting individually per row would be 20k*20k. But for all same, we could use full mask. Sparse not robust.

Could store masks as Python ints but free them before rows? No, need during rows. Could compute rows in two passes: For each unique line, we could compute contributions? Not linear.

Maybe use Myers to avoid memory. Let's see if we can implement Myers linear-space correctly. It may be worth to satisfy hint and memory. But time complexity for no overlap 20k could be bad. However spec no 20k no overlap. But bitset handles all. Could combine: Use Myers when D small? Need know D. Could estimate D from LCS length via bitset? That requires rows memory. Could compute LCS length with Myers O((N+M)D) without full script? Still need D unknown; for no overlap 20k D=40000, too slow. Bitset can compute length fast but memory rows? For length only, bitset doesn't need store rows, just S, memory low. We could compute LCS length with bitset (no rows) quickly. Then D = n + m - 2*L. If D is small (say < 10000), use Myers divide-and-conquer to output script with low memory. If D large, maybe use bitset with rows? But to output script with bitset we need rows; we could recompute rows and store, memory high only when D large. For D large, rows memory high but Myers would be slow. This hybrid could be robust. But complexity high.

Maybe implement bitset rows only; simpler. The problem likely doesn't impose memory 64MB. Python solutions with 80MB may be okay. The performance hints time, not memory. Standard library only. I think bitset acceptable.

Let's still explore Myers in case we can implement a simpler full DP with `array('i')` for 1000x1000? For 20k x20k impossible. But D small; could use Myers. Hmm.

A linear-space Myers implementation:
We can use an iterative recursive function that finds middle snake. Let's derive thoroughly; maybe implement if confident.

Myers O(ND) with middle snake:
For subproblem A[off_x:off_x+n], B[off_y:off_y+m]. We need find a point where forward and backward shortest paths meet.
Define forward search from (x0,y0) to end, with D edits. We can store V array indexed by diagonal k = x - y. For each k, V[k] = max x such that there is a path from start to (x, x-k) with D edits and a snake ending at x (after extending matches). The path uses D insert/delete operations, then a snake.
Backward search from end (x1,y1) backwards. We can store VB[k] = min x such that there is a path from (x, x-k) to end with D edits and a snake starting at x? Or run forward on reversed sequences and transform.
Let's use reversed sequences for backward. For subproblem A' = reverse(A), B' = reverse(B), lengths n,m. A forward search on reversed from (0,0) corresponds to backward search on original from end. If reversed coordinates (xr, yr), original coordinates (x,y) = (x1 - xr, y1 - yr). Diagonal k_orig = x - y = (x1 - xr) - (y1 - yr) = (x1-y1) - (xr - yr) = k1 - k_rev, where k1 = x1-y1. A path with D edits in reversed corresponds to D edits original. The furthest x in original backward? Suppose reversed V_rev[k_rev] = furthest xr reached from original end backwards (i.e., in reversed from start). Original x = x1 - xr. To check intersection with forward original V_f[k_orig] (furthest x from start), on diagonal k_orig. In reversed diagonal k_rev = k1 - k_orig. Backward path can reach original x = x1 - V_rev[k_rev] (since V_rev is max xr, so original min x? Wait furthest xr backwards means we moved far from end toward start, so original x is small. The set of original x on diagonal reachable from end with D edits is maybe x <= x1 - V_rev? Let's be precise.
In original backward, after D edits from end, we are at some position (x,y) and then extend a snake backwards? Myers forward on reversed: starting at original end (x1,y1), in reversed coordinates (0,0). After D edits in reversed, reach (xr, yr), then extend snake in reversed (matches original) to furthest xr (in reversed) along diagonal. In original, this corresponds to a snake from (x1 - xr_initial, ...) backwards to (x1 - xr_furthest, ...). The boundary of backward reachable region is the smallest original x (furthest from end) on diagonal, which is x_b = x1 - V_rev[k_rev]. Because V_rev max xr gives min original x.
Intersection on diagonal k_orig: forward reachable x up to V_f[k_orig] (max x from start). Backward reachable x down to V_b[k_orig] = x1 - V_rev[k_rev] (min x from end). If V_f[k] >= V_b[k], the intervals [?, V_f] and [V_b, ?] overlap; there is a middle snake on diagonal k between x=V_f? Actually forward path ends at x_f = V_f[k] (after snake). Backward path begins at x_b = V_b[k] (before snake). If x_f >= x_b, the snake overlaps. The middle snake can start at x = x_f? Let's see. Forward path from start to (x_f, y_f) includes a snake ending at x_f. Backward path from (x_b,y_b) to end includes a snake starting at x_b. If x_f >= x_b, then the segment from x_b to x_f on diagonal k is all matches? Not necessarily, but Myers middle snake is from (max(x_f,x_b)?). Standard: If V_f[k] >= V_b[k], the middle snake is from (V_f[k], V_f[k]-k) backwards? Hmm.
Let's look up known pseudocode (from memory):
```
def middle_snake(a,b):
    n,m = len(a), len(b)
    vf = [0]*(2*n+m+?)
    vb = [0]*...
    offset = n
    vf[offset] = 0
    vb[offset + n - m] = n
    for d in range(0, n+m):
        for k in range(-d, d+1, 2):
            if k == -d or (k != d and vf[offset+k-1] < vf[offset+k+1]):
                x = vf[offset+k+1]
            else:
                x = vf[offset+k-1]+1
            y = x - k
            while x < n and y < m and a[x]==b[y]: x+=1; y+=1
            vf[offset+k] = x
        for k in range(-(d+1), d, 2): # backward
            if k == -(d+1) or (k != d and vb[offset+k-1] <= vb[offset+k+1]): # ?
                x = vb[offset+k+1]-1
            else:
                x = vb[offset+k-1]
            y = x - k
            while x > 0 and y > 0 and a[x-1]==b[y-1]: x-=1; y-=1
            vb[offset+k] = x
            if vf[offset+k] >= vb[offset+k]: return x, ...
```
This seems plausible. Backward V stores the smallest x (leftmost) reached from end after D edits and snake backwards. Start vb[offset + n - m] = n (diagonal k = n-m at end). For each d, k ranges -(d+1) to d step 2 (parity d+1). Compute x for backward:
For diagonal k, to extend by one edit: either from k+1 with delete? Need formula.
Forward formula (max x): for k in -d..d step2:
 if k == -d or (k != d and V[k-1] < V[k+1]): x = V[k+1]; y=x-k
 else: x = V[k-1]+1; y=x-k
Then extend matches, set V[k]=x.
Backward formula (min x) for d edits from end, k in -(d+1)..d step2:
 if k == -(d+1) or (k != d and V[k-1] <= V[k+1]): x = V[k+1]-1; y=x-k
 else: x = V[k-1]; y=x-k
Then while x>0 and y>0 and A[x-1]==B[y-1]: x-=1; y-=1
 set V[k]=x.
Intersection: after computing both for some d? Need total edits D = 2d or 2d+1? The loop d maybe represents total D? In above, forward d edits, backward d+1 edits? Check initial: forward d=0, backward maybe d=0? Many implementations use for D in range(max_d): forward with D, backward with D, check. Let's define clearly.
Let forward search after `d` edits (insert/delete operations) compute V_f for diagonals -d..d parity d.
Backward search after `d` edits compute V_b for diagonals -(d+1)..d? Why? If total D can be 2d or 2d+1. In middle snake algorithm, for a given D, forward uses floor(D/2)? Maybe easier: Run both with same d and check. Starting backward V for d=0 should be end diagonal k1=n-m with x=n. Its index parity? k1 may have any parity. The k range for backward d edits from end should be k1 mod? If we store absolute k, range should be k1 - d .. k1 + d step 2. Using offset and relative? The pseudocode with `vb[offset + n - m] = n` and range `-(d+1) to d` assumes end diagonal k1 maybe not 0? Wait if offset = n, index offset + k. Initial k = n-m. Range for d=0 maybe should include k=n-m only, but pseudocode range -(1) to 0 includes k=-1,0, not necessarily. So that pseudocode assumes we shift coordinates so end diagonal is 0? Maybe they transform to a subproblem where start/end diagonals? Hmm.

Better to implement a known simpler algorithm: Use Myers to compute edit script by dynamic programming on the fly with "fringe"? Or use `diff` algorithm from Myers that outputs script by recursively finding middle snake using forward and backward with arrays sized 2*max_d+1, but coordinates relative to subproblem start/end and diagonal k = x - y. The initial forward diagonal 0 at start; initial backward diagonal n-m at end. The arrays index k+offset where offset = max_d (or n). The k ranges for forward d: -d..d. For backward d: (n-m)-d .. (n-m)+d. The pseudocode with range -(d+1)..d maybe for a transformed problem where end diagonal 0? Let's derive our own.

Forward:
V_f[k] for k in [k_start - d, k_start + d], k_start=0, parity k ≡ d mod 2. Value max x.
Initialize d=0: V_f[0]=0.
Update from d-1 to d:
for k in [-(d), d] step2:
  if k == -d or (k != d and V_f[k-1] < V_f[k+1]): x = V_f[k+1]; y=x-k
  else: x = V_f[k-1]+1; y=x-k
  extend matches; V_f[k]=x.

Backward:
We want V_b[k] = min x such that there is a path from (x, x-k) to end with d edits and a snake? For d=0, V_b[k_end]=n where k_end=n-m. For d>0, update from d-1 to d:
for k in [k_end - d, k_end + d] step2 (parity k ≡ k_end + d? Since moving one edit changes diagonal by ±1, after d edits parity k = k_end + d mod 2). We can compute min x.
At diagonal k, a backward path with d edits can come from diagonal k-1 (original? Let's derive). In forward, to reach diagonal k after d edits, previous diagonal was k+1 with an insert (right) (x unchanged) or k-1 with a delete (down) (x+1). For backward (from end to start), after d edits, position diagonal k. The previous (closer to end) diagonal before the last edit was:
- If last edit was insert (right) in forward, backward last edit is left? From (x,y) to end. Let's use symmetry. Backward update for min x: For diagonal k at distance d from end, the next position toward end (distance d-1) could be diagonal k+1 or k-1.
If we move forward from (x,y) to (x, y+1) (insert B), diagonal changes k -> k-1 (x same). Thus backward from a point on diagonal k-1? Hmm.
Let's derive formulas analogous to forward but on reversed sequences. Easier: Use reversed sequences for backward and transform.

Let subproblem A length n, B length m, start (0,0), end (n,m). Let k_end = n-m.
Backward search on reversed A_rev, B_rev of same lengths n,m. Start_rev (0,0) corresponds original end. End_rev (n,m) corresponds original start. Run forward algorithm on reversed with same D. It produces V_rev[k_rev] = max xr (reversed x) reached from original end with d edits and snake. Original coordinates for a point in reversed (xr, yr): x = n - xr, y = m - yr. Diagonal original k = x - y = n - m - (xr - yr) = k_end - k_rev.
For a given original diagonal k, reversed diagonal k_rev = k_end - k.
The backward reachable original x values from end with d edits and a snake: In reversed, V_rev[k_rev] is max xr after snake. Original x = n - xr. Since V_rev is max xr, this gives minimum original x on that diagonal reached (furthest from end). Let V_b[k] = n - V_rev[k_end - k]. This is min x.
Now we can compute backward by actually running forward on reversed sequences. That might be simpler but requires accessing reversed sequences and separate V_rev array. Complexity same. For intersection, on original diagonal k, forward max x = V_f[k], backward min x = V_b[k]. If V_f[k] >= V_b[k], they overlap. The middle snake is on diagonal k from x = V_f[k]? Let's determine split point.
Forward path reaches (x_f, y_f) where x_f = V_f[k], and this is the end of a snake (matches) starting at some x_start_f. Backward path reaches (x_b, y_b) where x_b = V_b[k], and this is the start (in original) of a snake going to end. If x_f >= x_b, then the interval [x_b, x_f] on diagonal k is covered by both? The middle snake can be taken from (x_b, y_b) to (x_f, y_f), but we need ensure all those cells match. Since forward snake ends at x_f and backward snake starts at x_b. If x_f >= x_b, do we know cells between x_b and x_f match? The forward snake extends matches backwards from x_f until it stops; backward snake extends matches forwards from x_b. If they overlap, the overlapping segment is all matches. We can output equals from x = x_b to x_f -1? Actually coordinates x are prefix lengths. A diagonal step from x to x+1 consumes A[x] and B[x-k]. If x_b <= x_f, the segment from x_b to x_f-1 (inclusive) should be matches. The middle snake could be from x = x_b to x = x_f (end). But the split for recursion: left subproblem from start to beginning of snake (x_b, y_b), right subproblem from end of snake (x_f, y_f) to end. The equals are A[x_b:x_f] == B[y_b:y_f]. Need choose x_b = V_b[k], x_f = V_f[k]? If x_f > x_b, yes. If equal, snake length 1? If x_f == x_b, maybe a single match? Actually if V_f == V_b, the point is where forward snake ended and backward snake started; there may be a snake of length? The forward path includes a snake ending at x_f; backward includes a snake starting at x_b. If equal, they meet at a point that could be in the middle of a snake. We can take the snake around it. Standard algorithm takes the middle snake as the maximal matching run on diagonal k that includes the intersection. It may extend beyond V_f and V_b? V_f is after extending forward snake as far as possible; V_b is after extending backward snake as far as possible. If V_f >= V_b, the maximal snake on that diagonal containing the overlap extends from min_start? Actually forward snake starts at some x_f0 < V_f; backward snake ends at some x_b1 > V_b. The overlap segment [V_b, V_f] is all matches? I think yes. The maximal middle snake can be from x = V_b to x = V_f? But what about matches before V_b in backward snake? V_b is the start (leftmost) of backward snake after extension, so before V_b not matched. V_f is end (rightmost) of forward snake after extension, so after V_f not matched. Thus [V_b, V_f] is exactly the maximal snake? If V_f >= V_b, yes. So split left end (x_b=V_b), right end (x_f=V_f). If V_f < V_b, no overlap.
Then recursive calls: left subproblem from (x0,y0) to (x_b,y_b); right from (x_f,y_f) to (x1,y1). The middle equals are A[x_b:x_f]. But careful: If x_f == x_b, equals empty? But can they overlap with zero-length snake? Myers snakes can be zero length? Edit script may have no equals at a split. If V_f == V_b, the overlap is a point, not an edge. The snake length could be zero (x_f==x_b) or one? Coordinates are prefix lengths; a diagonal match edge from x to x+1. If V_f == V_b, forward ended at x, backward started at x. There is no edge guaranteed. But the shortest path may pass through point x with no match. Then middle snake length 0. Recursion left to x, right from x. That's okay. However, can V_f == V_b happen for minimal D? Yes. We can handle equals empty.
But if there is a match at x (A[x-1]==B[y-1]), forward or backward snake would have extended, so maybe V_f > V_b. Not important.

Now, to output script recursively, we need a function `diff_range(x0, y0, x1, y1)` returns script for A[x0:x1], B[y0:y1] in forward order. If empty ranges, output deletions/insertions. Find middle snake (x_mid_start, x_mid_end) on diagonal k. Then left = diff_range(x0,y0, x_mid_start, y_mid_start), middle equals = A[x_mid_start:x_mid_end] (if x_mid_end > x_mid_start), right = diff_range(x_mid_end, y_mid_end, x1,y1). Concatenate. This yields minimal script if middle snake found correctly.

We need efficient implementation without excessive recursion overhead. Recursion depth D maybe up to 1000 or 50; okay. But if D large (no overlap 1000), recursion depth 1000 maybe near Python recursion limit 1000; could be okay but set recursion? We can implement iterative stack to avoid. But for bitset we avoid. If we implement Myers, need handle large D maybe recursion depth 20000 -> stack overflow. Could set recursionlimit but memory. However spec no 20k no overlap. But safer to iterative? Maybe not.

Let's test middle snake algorithm with small examples.
Example A='A', B='A' n=m=1,k_end=0.
Forward d=0: V_f[0]=0, extend match to x=1. So V_f[0]=1.
Backward d=0: reversed same. V_rev[0]=0, extend reversed match to xr=1. Original V_b[0]=n - 1 =0. Intersection k=0: V_f=1 >= V_b=0. Middle snake x_b=0,x_f=1. Equals A[0:1]. Left empty, right empty. Good.
Example A='A', B='B' no match. k_end=0. Forward d=0: V_f[0]=0 (no match). Backward d=0: V_b[0]=1. No overlap (0<1). d=1:
Forward diagonals -1,1.
k=-1: from k+1=0? formula: x=V_f[0]=0, y=x-k=1. extend none. V_f[-1]=0.
k=1: x=V_f[0]+1=1,y=0. V_f[1]=1.
Backward reversed no match. V_rev d=1:
k_rev=-1? Original k = k_end - k_rev = -k_rev.
Compute reversed forward:
V_rev[0]=0 initially? For d=1:
k_rev=-1: x=V_rev[0]=0, yr=1, no match, V_rev[-1]=0. Original k=1, V_b[1]=n - 0 =1.
k_rev=1: x=V_rev[0]+1=1, yr=0, V_rev[1]=1. Original k=-1, V_b[-1]=n -1=0.
Check intersection:
k=-1: V_f[-1]=0, V_b[-1]=0 => overlap. x_b=0,x_f=0 zero snake. Left A[0:0],B[0:0]; right A[0:1],B[0:1]? Wait x_f=0,y_f=x-k=1? For k=-1, y=x-k=1. So point (0,1). Left empty, right from (0,1) to (1,1): delete A. Script -A. But B[0] insertion? Right subproblem A[0:1], B[1:1]? y0=1,y1=m=1, B empty, output delete A. But B[0] was consumed by backward path? The backward path from (0,1) to end (1,1) includes insert? Actually point (0,1) to (1,1) in original is delete A, but B[0] already inserted? Wait coordinate (0,1) means B[0] processed. The backward path from end to (0,1) must include an insertion of B[0]? Let's see original no match A='A',B='B'. Minimal script can be +B,-A or -A,+B. Our middle snake point (0,1). Left start (0,0) to (0,1): should output insert B[0]. Right (0,1) to (1,1): delete A[0]. So left subproblem not empty: x0=0,y0=0 to x_mid_start=0,y_mid_start=1. I mistakenly said left empty because x range empty but y range not. diff_range handles. It will output +B. Right outputs -A. Concatenate +B,-A. Good.
So recursion must use both x and y midpoints: y_mid_start = x_b - k, y_mid_end = x_f - k.
For k=-1, x_b=0 -> y=1; x_f=0 -> y=1. Left B[0:1] insert; right A[0:1] delete. Good.

Example A='A',B='BA' n=1,m=2,k_end=-1. LCS A at B[1]. Forward d=0: V_f[0]=0 (start diagonal0, A[0]!=B[0] 'B'), V_f[0]=0. Backward d=0 on reversed A='A', B_rev='AB' (original end). Reversed first chars A vs A match, V_rev[0]=1. Original k_end=-1. V_b[k=-1]=n - V_rev[0]=0. Intersection? Need k range backward d=0 only k=-1. Forward d=0 only k=0. No same k. d=1:
Forward k=-1,1.
k=-1: x=V_f[0]=0,y=1, A[0]==B[1] 'A' extend to x=1,y=2. V_f[-1]=1.
k=1: x=V_f[0]+1=1,y=0. V_f[1]=1.
Backward reversed d=1: reversed A='A',B_rev='AB'. V_rev[0]=0 initially? Wait after d=0 we had V_rev[0]=1 (snake extended). For d=1, use previous V_rev[0]=1.
k_rev? Original k = k_end - k_rev = -1 - k_rev.
Forward d=1 on reversed diagonals -1,1.
k_rev=-1: x=V_rev[0]=1, yr=x-k_rev=2. V_rev[-1]=1 (cannot extend further). Original k = -1 - (-1)=0. V_b[0]=n -1=0.
k_rev=1: x=V_rev[0]+1? V_rev[0]=1 -> x=2? But n=1, forward algorithm should clamp? Let's recall formula: if k == d (1) use V[k-1]+1 = V[0]+1 =2, y=x-k=1. But x cannot exceed n? The forward algorithm usually doesn't explicitly clamp x to n? It can exceed n? In Myers, V[k] is furthest x, can be up to n. If x = n+1, y=1, maybe invalid? Actually for k=d, the path uses a delete (down) from previous diagonal; x = V[k-1]+1. If V[0]=1 (already at n), adding delete would x=2 > n. But such path may be invalid because x cannot exceed n. In forward algorithm, do we need to ensure x <= n? The V array values can be capped at n. In standard algorithm, when computing x, it may exceed n? For k=d, if V[k-1]=n, x=n+1, y=n+1-k maybe? But grid boundary; should clamp to n? Let's check standard: V[k] = max x, but cannot exceed n. However the update formula with `x = V[k-1] + 1` might exceed n only if previous x already n; but if previous x=n, a path with d-1 edits already reached end x, no need extra edit? It could still be considered but x capped at n. Many implementations do not cap, but while extension won't run if x<n false, and V[k]=x maybe n+1, causing issues. They often initialize V with 0 and allow values up to n; the formula for k=d uses V[k-1]+1, which can be n+1 if V[k-1]=n. But is V[k-1] can be n before end? Yes if LCS reached end. Then a path with extra edits can still be at end x=n, not n+1. Should cap: if x > n: x = n? But then y = x - k might not correspond to valid point? If x=n, y=n-k may be >m? For k=1,n=1,m=2, x=1,y=0 valid. If cap to n=1, okay. Standard algorithms often don't cap because V[k-1] cannot be n for k-1 parity if not at end? It can, as here V[0]=1=n after snake. But k=1 d=1, path with one delete from (1,0)? To reach diagonal1 at distance1, previous diagonal0 point x=1,y=1? Wait V[0]=1 corresponds point (1,1)? For original forward A='A',B='BA', after d=0, V_f[0]=0 (no match). For reversed, V_rev[0]=1 (point (1,1) in reversed? n=1,m=2, k=0, x=1,y=1; yes valid). For k_rev=1, x=V[0]+1=2, y=1. But x=2 beyond n; the corresponding original k = -1 - 1 = -2, maybe outside grid? Original k range from -m to n = -2 to1. k=-2 valid (all inserts). x original = n - V_rev[1]. If V_rev[1]=2, x_orig=-1 invalid. Need cap reversed x at n. So standard forward should cap x at n? Let's see typical code: `while x < n and y < m and a[x]==b[y]: x+=1; y+=1; V[k]=x`. They don't cap initial x. But for k=d, x=V[k-1]+1 can be n+1. However if V[k-1]=n, then y for k-1 = n-(k-1). If k-1 <= n? Then a delete down would x=n+1,y=n+1-k. This is outside grid if x>n. But such a path is dominated by staying at n? The furthest x on diagonal k cannot exceed n, so should set x = n if V[k-1]+1 > n. Similarly x cannot be negative. Many implementations use arrays and don't cap because they restrict k range so y valid? For k=d, y = V[k-1]+1 - d. If V[k-1]=n, y = n+1-d. Could be <=m. x invalid. They might still store n+1, but intersection could misbehave. To be safe, cap x to n in forward update. Also ensure y between 0 and m; formula should if x in [0,n] and k in [k-d,k+d] within grid. Cap to n and maybe max(0). But if x capped, y = x - k may not equal previous y+? It's okay as the furthest x on that diagonal within grid is n (if reachable). Need also ensure x >=0. For forward, x from V[k+1] could be -? V nonnegative. For k negative large, y=x-k may exceed m? But grid diagonal k range should keep y in [0,m]. If x capped, maybe. We'll implement capping: after computing x, if x > n: x = n; if x < 0: x=0; then y = x - k; while x<n and y<m and ...; Also need y >=0? If y<0, cannot extend; but point invalid? The diagonal k with x such that y<0 is outside grid; but k range may include. For forward start, k=-d, x=V[d]=0? y=d, if d<=m valid; if d>m? max D up to n+m, but k=-d could be < -m, y=d>m? Actually grid y=x-k. If x=0,y=d; if d>m, outside. But D beyond m? Forward can have more inserts than m; x=0,y should cap at m? The diagonal k < -m corresponds y>m at x=0 invalid. Standard algorithm k range from -d to d but also constrained by grid: k >= -m, k <= n. We should only consider valid diagonals within [-m, n]. In subproblem, k range [y0-x0?]. For whole problem, k in [-m,n]. In recursion subproblem, local n,m; k in [-(m), n]. The search D may exceed dimensions; need clamp.
This is getting complex. Bitset avoids.

Given complexity and potential bugs, bitset is safer. The problem hint is not mandatory. I'll stick with bitset.

But let's ensure bitset code with IDs doesn't have memory/time issues. Good.

Could we further reduce masks memory by building rows while building masks? If we process b from left to right, masks grow. Rows need final masks. Could process a rows in chunks? No.

Maybe we can choose to bitset over the sequence with fewer unique lines? Mask memory depends on unique lines and their positions. If one list has many unique, the other many? We choose shorter length as columns; masks size determined by unique lines in work_b (columns) and positions. If work_b shorter but many unique, masks total size sum positions ~ m^2/60? If m=10k, ~13MB. Rows memory n*m/8. Good. If both 20k, 50+27.

Now, let's consider if using `id_map.get(line, -1)` with line as str and ID -1 sentinel could fail if a line's ID is -1? no. But if `line` is such that `id_map.get` returns None because key maps to None? We never map to None. Good.

Code with IDs:
```
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    if len(b) <= len(a):
        wa, wb = a, b
        swapped = False
    else:
        wa, wb = b, a
        swapped = True

    id_map = {}
    wa_ids = [0] * len(wa)
    for i, line in enumerate(wa):
        id_ = id_map.get(line, -1)
        if id_ == -1:
            id_ = len(id_map)
            id_map[line] = id_
        wa_ids[i] = id_
    m = len(wb)
    wb_ids = [0] * m
    for j, line in enumerate(wb):
        id_ = id_map.get(line, -1)
        if id_ == -1:
            id_ = len(id_map)
            id_map[line] = id_
        wb_ids[j] = id_
    num_ids = len(id_map)
    masks = [0] * num_ids
    for j, id_ in enumerate(wb_ids):
        masks[id_] |= 1 << j
    del id_map

    n = len(wa)
    rows = [0] * (n + 1)
    s = 0
    for i, id_ in enumerate(wa_ids, 1):
        x = s | masks[id_]
        y = (s << 1) | 1
        s = x & ~(x - y)
        rows[i] = s
    del masks

    rev = []
    append = rev.append
    sign_del = '+' if swapped else '-'
    sign_ins = '-' if swapped else '+'
    i = n
    j = m
    low_mask = (1 << m) - 1
    # local
    wa_ids_local = wa_ids
    wb_ids_local = wb_ids
    wa_local = wa
    wb_local = wb
    rows_local = rows
    while i > 0 or j > 0:
        old_j = j
        if i > 0:
            r = rows_local[i] & low_mask
            if r:
                h = r.bit_length() - 1
                if wa_ids_local[i - 1] == wb_ids_local[h]:
                    for t in range(j - 1, h, -1):
                        append((sign_ins, wb_local[t]))
                    append(('=', wa_local[i - 1]))
                    i -= 1
                    j = h
                else:
                    append((sign_del, wa_local[i - 1]))
                    i -= 1
            else:
                append((sign_del, wa_local[i - 1]))
                i -= 1
        else:
            append((sign_ins, wb_local[j - 1]))
            j -= 1
        if j != old_j:
            low_mask >>= old_j - j
    rev.reverse()
    return rev
```

Check sign names: `sign_del` for deletions from wa. If swapped, wa=original b, so delete wa => '+' in original. Yes. `sign_ins` for insertions of wb. If swapped, wb=original a, insert wb => '-' in original. Yes.
In match branch, we append insertions from wb with sign_ins. If swapped, these are original deletions (a lines) that occur before the '='? Example earlier gave valid. Good.

Now, is the script order after swapping signs still such that = and sign_del (original '-') give original a? In swapped, sign_del='+' not used for original deletions; original deletions are sign_ins='-'. Filtering = and '-' items: In work script, '=' and work insertions ('+' from wb) in order give wb (original a). We map work insertions to '-'. Their order relative to '=' remains. So =/- original gives original a. Good. Filtering =/+ original: work deletions mapped to '+' in order with '=' give work_a (original b). Good.

Now, consider if `wa` and `wb` are the original lists; if swapped, `wa` is b, `wb` is a. The sign variables produce original signs. Good.

Potential issue: If we delete `id_map`, but `wa_ids` and `wb_ids` contain int objects that may be the same as values in id_map. Deleting id_map doesn't delete int objects because lists reference them. Good.

Potential issue: `len(id_map)` used to create new ID; after first line ID0, len 1. Good. But if a line maps to -1? no.

Potential issue: If a line is empty string, hash works. ID sentinel -1 okay.

Now, let's test with a case using IDs and low_mask.
a=['a','b'], b=['b','a'] no swap? len equal. IDs: a0,a1,b1? wb b0 id1, b1 id0. masks: id1 bit0, id0 bit1. rows: i1 id0 mask bit1 => S=2; i2 id1 mask bit0 => S? S=2, x=3,y=5,S=1. Backtrack i2,j2 low3 r=1 h0 wb_ids[0]=1 equals wa_ids[1]=1 match, insert none? j=2,h=0? Wait h=0, j=2, insert t=1 wb[1]='a' sign_ins '+'? But original no swap, sign_ins='+'. This would insert 'a' before matching 'b'? Let's simulate: wa=a ['a','b'], wb=b ['b','a']. rows[2] S=1 bit0. h=0, wa_ids[1]=1 (b), wb_ids[0]=1 (b), match b at wb[0]. Insertions t from 1 to1: wb[1]='a' sign_ins '+'. append +a, =b. state i=1,j=0. Delete wa[0]='a' sign_del '-'. rev: +a,=b,-a; reverse: -a,=b,+a. Forward: delete a, match b with b[0], insert a. Valid. The insertion of wb[1] after match in forward? Script -a,=b,+a: yes. Good.

Now, test a=['a','a','b'], b=['a','b','a'] (LCS 2 maybe a,b or a,a). No swap? len3 both. IDs a0,b1. masks b: a bit0,2 (5), b bit1 (2). rows:
i1 a: S? x=5,y=1,S=1 (bit0)
i2 a: S=3? x=5|1=5,y=3,S=5? Wait S_prev=1, x=5, y=3, x-y=2, ~2=-3, 5&-3=5? Bits0,2. But row2 (two a's) vs b [a,b,a] LCS2? It can match first a at b0 and second a at b2, so S bits0,2 yes.
i3 b: S_prev=5, mask b=2, x=7, y=11, x-y=-4, ~(-4)=3, S=3? bits0,1. LCS length2 (a,b). rows3 bits0,1.
Backtrack i3,j3 low7 r=3 h1, wa_ids[2]=b, wb_ids[1]=b match, insert none? j=3,h=1 => t=2 wb[2]='a' sign_ins '+'. append +a,=b. state i2,j1 low shift2 =>1. r=rows2&1=1 h0, wa_ids[1]=a, wb_ids[0]=a match, state i1,j0. i1,j0 delete wa[0]=a. rev: +a,=b,-a; reverse: -a,=b,+a. But a length3, b length3: script -a,=a? Wait reverse: [ -a (wa[0]), =b (wa[2]), +a (wb[2]) ] missing one '=' a? Let's re-evaluate: After match at i2,j1 (a at wb0), state i=1,j=0. Then i=1,j=0 delete wa[0] 'a'. Rev list: (in order appended)
1) match i3: append +wb[2]='a', append =wa[2]='b'
2) match i2: no insert, append =wa[1]='a'
3) delete i1: append -wa[0]='a'
rev = [+a, =b, =a, -a]. Reverse = [-a, =a, =b, +a]. I missed =a. Forward: delete first a, match second a with b0, match b with b1, insert a. Valid LCS a,b. Good.

Now, test if there are insertions before a match in forward. a=['b','a'], b=['a','b','a']? LCS 2 (a,a or b,a?). Our algorithm likely. Good.

Now, consider a line repeated and masks with IDs: For wb_ids, if same line at positions, mask OR bits. Good.

Now, could the bitset row algorithm with IDs and masks list fail if `num_ids` is large and masks list contains 0 for IDs not in wb. Good.

Potential performance issue: `masks[id_] |= 1 << j` for j up to m-1. If wb has repeated line, OR many times. For all same line m=20k, each OR with increasing 1<<j and existing full-ish mask. Total operations sum sizes ~25MB? Actually OR full mask of size j each time, 20k*avg1.25KB=25MB, okay. But `1 << j` each time. Good.

Now, if m=20k and all same, rows: S grows to full. rows memory 50MB. masks one int full 2.5KB, not 27MB. Good.

Now, if all unique, masks total 27MB; rows maybe? If all unique no common, rows all 0 (small int 0) not 50MB! Wait if no common, S remains 0, rows list references int 0 (same object) for all rows, memory small. If some common but unique? A line can match only if same string; if all unique and no common, rows small. If there are common lines but unique within each list? Common lines imply duplicates across lists; masks for common lines one-bit. Rows may have bits for matches. If LCS small, rows ints maybe small high bits? Could still. Worst memory rows full if high similarity, masks small if repeated. So peak maybe less than worst unique+full? Could there be both many unique common lines (each line common once) and LCS high? If lists are permutations of same 20k unique lines, LCS maybe 20k if same order? If same order, masks unique one-bit 27MB, rows full 50MB, peak 77MB. If different order, LCS smaller maybe rows not full. So worst ~80MB.

Now, if memory concern, we could avoid storing masks for unique one-bit lines as big ints by using a dict of line -> list of positions? But rows need mask. For unique common lines in same order, masks one-bit big ints 27MB. Could we compute rows using positions directly for unique one-bit? The bitset update with mask one bit can be done maybe with specialized? Not worth.

Now, let's consider if `rows` could be stored as `array('Q')` for m <= 64? We could optimize small m: if m <= 64, store rows in list of int anyway. Not needed.

Now, final answer should not include explanation. But maybe code with comments okay. The instruction says single code block. We can include comments. No printing.

Let's think about hidden tests checking exact script? They likely check properties, not exact. Our script may not be the "standard" minimal diff but valid. Need ensure number of "=" maximal. Yes.

One subtle property: "Taking the '=' and '-' items in order must give exactly a; taking the '=' and '+' items in order must give exactly b." For our swapped sign mapping, does the order of '=' and '-' items (original) give exactly original a? Let's prove with an example where work script order has work insertions and deletions interleaved. Work script S has operations with types: =, D (wa deletion), I (wb insertion). Filtering =,D gives wa; =,I gives wb. Original signs: D' = '+' (from wa), I' = '-' (from wb). Original a = wb. Filtering =, original '-' (I) in S order gives wb = a. Original b = wa. Filtering =, original '+' (D) in S order gives wa = b. Good.

Now, what about lines can repeat; filtering just sequence of line strings. Good.

Potential issue: In match branch, we append `('=', wa_local[i - 1])`. If swapped, wa is original b, but the line is equal to wb[h] (original a). So '=' line same. Good.

Now, let's consider if we can simplify by not interning to reduce code length. The final code with interning is longer but robust. The problem likely values performance. I'll include interning.

Could there be a bug with ID sentinel -1 if a line's ID is -1 due to `len(id_map)` when len is -1? no.

Now, let's consider if Python's recursion? none.

Potential issue: `low_mask >>= old_j - j` when `old_j - j` is very large and low_mask is 0; okay. But if `j` becomes negative? h is bit_length-1 of r nonzero, so h>=0. Insert j-- when j>0. So j nonnegative. old_j - j positive. Good.

Now, let's think about if `rows_local[i] & low_mask` could be nonzero when `i>0` but `L` (LCS length for current state) is 0? No, nonzero means prefix count >0. Good.

Now, one more correctness proof of backtrack using IDs: It relies on rows[i] being the bitset after processing i lines of wa. We precompute rows for all i. In backtrack, when we delete a line (i--), rows[i] corresponds to new i. When we match (i--, j=h), rows[i] new. Insertions don't change i. Good.

Now, could there be a case where `wa_ids[i-1] == wb_ids[h]` but h is not actually a match because the line appears in wb at h but the bitset row's highest bit h is set due to previous rows, and current row not used, but matching it would reduce LCS? We argued if line equal, matching is valid. Let's try to find a counterexample by brute mental small sequences where highest row bit h line equals current a but F(i-1,h) < L-1. Use small A,B and compute rows. Let's enumerate a few:
A length2, B length2 or3.
We can compute row bitsets and check.
A=[a,b]. Row1 S1 marks LCS of a. Row2 S2. Highest bit h in S2 below j. If A[1]=B[h], need F1(h)=L-1.
Let's find S2 bits where highest bit line equals B[h] but F1(h)<L-1. For L = F2(j). Since h highest bit, L=F2(h+1). F2(h)=L-1. Need F1(h)<L-1. That means F2(h)>F1(h), so row2 increased before h. That would require A[1] match before h. But then A[1] order after A[0]; if it matches before h, and highest bit h also maybe from A[0]? Wait if F2(h)>F1(h), the increase before h is due to A[1] (since A[0] row is F1). But A[1] is last in A, cannot match before A[0]'s match in B if A[0] match after? It could match before h and F2(h) > F1(h), while highest bit h from A[0]? But A[0] is before A[1]; if A[0] matches at h > c (A[1] before), order A: A[0] before A[1], B: h after c, conflict. So cannot both. Thus F2(h)=F1(h). So valid.
For longer, same order argument. Good.

Now, what if line repeats and A[i-1] equals B[h], but the highest bit h is set due to previous rows, and current row also could match h but not needed. Matching it may replace previous row's match at h with current row, still valid if F1(h)=L-1. If previous row's match at h was part of LCS, F1(h)=L-1. If not, maybe F1(h)<L-1 but current row can match h and previous row's matches before h total L-1? Then valid. If F1(h)<L-1, not enough previous matches before h; current row cannot supply two. So invalid. But if line equals, could row bits indicate valid? likely F1(h)=L-1.

Okay.

Now, let's consider if we should use `rows[i].bit_count()` anywhere? No.

Now, final code with type hints. Could include `from __future__`? No need. Standard library only; no imports needed. Actually we don't use any imports. Good.

Now, let's think about Python 3.11 performance of `list[tuple[str, str]]` type hint okay. No imports for typing.

Now, final output should be:
```python
def diff_lines(...):
    ...
```
No extra text.

Before final, let's maybe consider a more memory-efficient bitset reconstruction without storing all rows? Could store rows in a list of `int` but if memory issue. Not now.

Potential issue: If `wa` or `wb` is very large (e.g., 200k), `low_mask = (1 << m) - 1` for m=100k maybe 12.5KB, rows maybe. Spec 20k. Fine.

Potential issue: The bitset formula with Python's `~` can produce negative `s`? `s = x & ~(x-y)`. Since x nonnegative, result nonnegative. Good.

Potential issue: In rows loop, if `masks[id_]` is 0 and s maybe 0, y=1, x-y negative, s=0. Good.

Now, let's test a case with m=0 and IDs:
a=['x'], b=[] => len b<=a no swap, wa=a,wb=[], id_map from wa {x:0}, wa_ids[0]=0, wb_ids[], masks=[0]. rows length2: i1 id0 x=0,y=1,s=0 rows[1]=0. low_mask=0. loop i1,j0 r=0 delete sign_del '-' x. i0. return -x. Good.
a=[], b=['x'] => swapped (len b > len a): wa=b,wb=a. id_map from wa {x:0}, wa_ids[0]=0, wb_ids[], masks=[0]. rows [0,0]. sign_del='+', sign_ins='-'. loop i1,j0 delete wa[0] => +x. return +x. Good.

Now, if both lists contain same line but swapped orientation, sign mapping okay.

Let's test with a simple swap where work_b shorter and has repeated lines. Original a=['x','y','x'], b=['x','x'] (len b2 <3 no swap actually). Work a original, b shorter. rows m2.
IDs x0,y1. masks x bits0,1=3,y0.
row1 x: S=1
row2 y: S=1? x=1,y=3,s=1
row3 x: S=3? S=1,x=3,y=3,s=3
backtrack i3,j2 low3 r3 h1, wa_ids[2]=x, wb_ids[1]=x match, state i2,j1 low1. r=rows2&1=1 h0, wa_ids[1]=y != wb_ids0 x => delete y. i1,j1. r=rows1&1=1 h0 match x. state i0,j0. rev: =x (i3), -y, =x; reverse: =x,-y,=x. Original a x y x, b x x. Script match first x, delete y, match second x with b1. Valid. Good.

Now, let's consider if our script can have adjacent operations that could be combined? It only uses single-line operations; adjacent same sign okay. Shortest doesn't require maximal runs. Good.

Now, potential hidden test: They might check that the number of items is `len(a)+len(b)-2*LCS`. Our script length: Each loop iteration appends either one deletion, one match plus some insertions, or one insertion. The number of operations = (n - matches) + (m - matches) = n+m-2matches. matches = LCS. Good.

Now, one more performance tweak: In backtrack, `for t in range(j - 1, h, -1): append((sign_ins, wb_local[t]))` creates a tuple for each insertion. Necessary. Could use list extend with zip? Not needed.
For many insertions (e.g., 20k), loop okay. Could optimize by `rev.extend((sign_ins, wb_local[t]) for t in range(...))` but generator overhead worse. Loop fine.

Now, potential issue with `rev.reverse()` in place; returns None. Good.

Now, let's think if using `id_map` with `len(id_map)` for new ID while iterating can be affected by previous IDs? no.

Now, could we avoid interning if `len(wa)+len(wb)` small? Not necessary.

Now, final code: Should we include a docstring? It might be okay. But instruction no tests/example. Docstring okay. Could keep concise.

Let's write final code with comments maybe:
```
def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    # Use the shorter list as the bit-vector axis.
    ...
```
No external imports.

Double-check sign variable names in final: Maybe use `del_sign` and `ins_sign` for work. But to avoid confusion:
```
    work_del_sign = '+' if swapped else '-'
    work_ins_sign = '-' if swapped else '+'
```
Then append `(work_del_sign, wa_local[i-1])`, `(work_ins_sign, wb_local[t])`. Good.

Now, potential bug: If swapped, work_ins_sign='-' for wb (original a). In match branch, insertions from wb before the '=' in forward? The work script insertions are wb lines (original a) that are not matched. In original, they are deletions. Their position relative to '=': Work forward order after reversing. In match branch reverse we append work insertions before '=', so in forward they appear after? Let's check order carefully. We build `rev` in reverse order of forward script. In match branch at state (i,j), forward segment from new state (i-1,h) to old state (i,j) is:
- From (i-1,h) to (i-1, h+1 ... j-1)? Wait work insertions (right moves) occur before diagonal? Let's derive forward path for a match at h with old j>h:
Starting at (i-1,h) (after previous state). To reach (i,j), one possible path: insert wb[h] (right) to (i-1,h+1), insert ... wb[j-1] to (i-1,j), then match wa[i-1] with wb[h]? Wait diagonal match requires being at (i-1,h) to (i,h+1), not after insertions. If we insert first, we are at (i-1,j), cannot match at h. The correct forward path: match diagonal from (i-1,h) to (i,h+1), then insert wb[h+1..j-1] to (i,j). So forward order: '=', then insertions. In reverse order: insertions (in reverse), then '='. Our branch appends insertions t=j-1..h+1, then '=', to `rev`. Thus forward reversed gives '=' then insertions. Good. Earlier I sometimes thought insertions before match; correct is match then insertions after. Does this affect validity? The DP path from (i-1,h) to (i,j) indeed match then inserts. In standard backtracking, if moving left from (i,j) to (i,h+1) then diagonal to (i-1,h), reverse order left moves then diagonal. That corresponds forward diagonal then left moves. Yes. So match then insertions. Good.
In earlier examples, script -a,=b,+a had match then insert. Good.
Now, if we instead needed insertions before match (e.g., match a later line after inserting earlier b?), The DP path can choose different split. Our path is valid.

Let's verify with a case where b has extra line before a match: a=['B'], b=['A','B']. rows S bit1? Wait B at index1. Backtrack i=1,j=2, r=2 h=1, match at h=1, insertions none (h=j-1), state i0,j1, insert b0. rev: =B, +A; reverse: +A, =B. Forward insert A then match B. Here match after insertion, not before. Wait our match branch for h=1,j=2 no insertions, state j=1, then i=0 inserts b0. Forward after reverse: +A, =B. The match at h=1 occurred after insertion b0. But in the segment for match branch, there were no insertions after match; the insertion before match came from previous state (i=0? Actually new state i=0,j=1, then insert b0 before match in forward? Let's see full forward: start (0,0) -> insert b0 to (0,1) -> match to (1,2). In our recursive decomposition: left subproblem (i=0,j=1) outputs +A, middle '='. So insertions can be before match if they belong to left subproblem (previous state). In match branch, insertions after match are those between h+1 and j-1. Good.

Thus algorithm constructs path correctly.

Now, check state transition j=h: After match, new state (i-1,h). In forward, before match, state (i-1,h). Good. Insertions before match are generated by earlier recursion. Insertions after match generated by match branch. Good.

Now, if h=0,j=2, match branch append insertion wb[1] before '=' in rev, forward match then insertion. State new j=0. Previous subproblem none. Forward: match wb0, insert wb1. Example a='B', b='B','A'? Wait b=['B','A'], a='B'. rows S bit0? M B bit0, S=1. h=0,j=2, insert wb[1]='A' after match. rev: +A, =B; reverse =B,+A. Forward match B, insert A. Valid. Good.

Now, if there are insertions both before and after a match, they are split across left and match branch. Good.

Now, let's consider if we should output equal lines in forward order. `rev.reverse()` ensures. Good.

Now, potential issue: In backtrack, when `r` nonzero and `wa_ids[i-1] == wb_ids[h]`, we assume match. But what if `h` is not the highest row bit below j? It is by bit_length of r, where r = rows[i] & low_mask. Yes. If rows[i] has bits beyond low_mask (columns >=j), ignored. Good.

Now, what if `rows[i]` has a bit set at h but `wb_ids[h]` equals current ID, but there is also a higher row bit h2 > h within low_mask that does not equal current ID. Then h is not highest row bit overall. Our r = rows[i] & low_mask, so h2 would be in r even if ID not equal? Wait r includes all bits in rows[i], not filtered by ID. We compute h = r.bit_length()-1, then check if current ID equals wb_ids[h]. If h is higher nonmatching bit, we delete. We do NOT filter r by current ID. Good. So h is highest row bit overall. If it doesn't match, delete. If it matches, match. This is correct. I earlier considered candidate filtered by ID; but final code uses r all bits. Good. Need ensure code does that. Yes: `r = rows_local[i] & low_mask`, `h = r.bit_length()-1`, `if wa_ids... == wb_ids[h]`. No mask_line filter. Good.

This is important. If we had filtered by ID, we might choose lower invalid. We don't.

Now, let's test with previous example A='A',B='XAB' where current row maybe? A rows: row1 A bit0? B X A B: row1 A bit1? Let's compute with highest rule.
A=['A','B'], B=['X','A','B']. rows: row1 A: M A bit1, S=2 (bit1). row2 B: M B bit2, S? S=2, x=6, y=5, x-y=1, ~1=-2, S=6? bits1,2? But expected row2 dp [0,0,1,2], increments bits1,2. Yes. Start i2,j3 low7 r=6 h2, current B matches wb[2]=B, match. state i1,j2 low shift1? old3 new2 => low3? Wait new j=h=2, low_mask >>=1 => 3 (bits0,1). i1,j2 r=rows1&3=2 h1, current A matches wb[1]=A, match. state i0,j1 insert wb0 X. Forward: +X, =A, =B. Valid.
If current row not used: A=['A','C'], B=['X','A','B']. rows row1 bit1, row2 C mask0: S stays? S=2, x=2,y=5,x-y=-3,~(-3)=2,S=2. Start i2,j3 r=2 h1, current C != wb[1]=A delete C. state i1,j3. r=2 h1 match A, state i0,j2? Wait h=1, old j=3, insert wb[2]=B after match? Match branch: insert t=2 B, =A, state i0,j1. Then insert wb0 X. rev: +B,=A,+X; reverse: +X,=A,+B. Forward insert X, match A, insert B. Valid.

Now, consider current row not used but highest row bit at last column nonmatching, e.g., A=['A','C'], B=['A','B']. rows row1 bit0, row2 C S? S=1,x=1,y=3,x-y=-2,~(-2)=1,S=1. Start i2,j2 r=1 h0, C != A delete C; i1,j2 r=1 h0 match A, state i0,j0? h=0,j=2 -> insert wb[1]=B after match? Match branch: t=1 B, =A, state i0,j0. rev: +B,=A; reverse =A,+B. But we deleted C first? Rev order: delete C appended first, then +B,=A. rev = [-C, +B, =A]; reverse = [ =A, +B, -C]. Forward =A,+B,-C. Valid. Good.

Now, what if current row not used and there are insertions before and after; delete order may place deletion after some insertions in forward? In above, forward =A,+B,-C (deletion after inserts). Valid. Minimal.

Now, one possible issue: The problem might expect a "shortest edit script" where equal lines are in the same relative order, but insertions/deletions can be any. Our script satisfies.

Now, let's consider if there is any requirement that the script itself is minimal in terms of number of items but also perhaps lexicographically? No.

Now, final code should not use `difflib`. It doesn't.

Let's maybe include a fallback for small lists using simple DP? Not needed.

Now, I want to ensure the bitset row computation with IDs and masks list doesn't exceed recursion or memory. Good.

Let's think about possible integer overflow? Python no.

Now, could `1 << j` for j large be slow? j up to 20k, fine.

Now, if `m` is very large (e.g., 100000), `low_mask = (1 << m) - 1` and masks building might be heavy but spec not.

Now, let's consider if the algorithm can be further optimized by trimming common prefix/suffix of wa/wb before bitset. This could reduce n,m and rows memory, especially 20k with 50 diff: trimming prefix/suffix could reduce to small middle if differences in middle? If lists differ in about 50 places but share prefix/suffix, trimming could drastically improve. But our bitset already okay. However, trimming common prefix and suffix can reduce memory and time, and script can prepend/append equals. It might be beneficial and simple. Let's consider adding it.

If wa and wb have common prefix of length p, we can prepend p '=' operations and work on wa[p:], wb[p:]. Common suffix length s, work on wa[:n-s], wb[:m-s], then append s '=' operations. This reduces n,m and rows. Need preserve order. For 20k with 50 diff, if differences scattered, prefix/suffix maybe small; if one block middle, could reduce. It also helps if one list is a substring. It doesn't affect minimal LCS (LCS includes prefix/suffix? For common prefix/suffix, any LCS must include them? The longest common subsequence can include common prefix and suffix independently; yes trimming common prefix and suffix is safe for producing some minimal script: prepend/append equals for shared prefix/suffix. Need ensure if prefix and suffix overlap? Compute p up to min, then s up to remaining. This is standard.

Implementing trim:
```
p=0
max_p = min(len(wa), len(wb))
while p < max_p and wa[p] == wb[p]: p += 1
s=0
max_s = min(len(wa)-p, len(wb)-p)
while s < max_s and wa[len(wa)-1-s] == wb[len(wb)-1-s]: s += 1
prefix_script = [('=', wa[i]) for i in range(p)]
suffix_script = [('=', wa[i]) for i in range(len(wa)-s, len(wa))]
# work on wa_mid = wa[p:len(wa)-s], wb_mid = wb[p:len(wb)-s]
# final = prefix + mid_script + suffix
```
But if we use slice, creates new lists. Could avoid slices by offsets in bitset? Bitset needs lists/IDs. We can set `wa_mid = wa[p:n-s]`, `wb_mid = wb[p:m-s]`; copies of references, small. For 20k, okay. Prefix/suffix script list of tuples. If p+s large, mid small, memory reduced. But if no common prefix/suffix, copies duplicate lists (20k each) extra memory ~320KB references, okay. But we already have wa/wb original; slices create new lists. Could avoid by using original lists and offsets for rows/backtrack? Bitset masks need wb_mid positions; IDs interning over mid only. Slicing simplifies. Memory extra small compared to rows.
Trimming can also reduce m bit length, rows memory. For 20k with 50 differences, if they are in middle but share prefix/suffix large, huge improvement. If differences scattered, p/s small. Worth adding.

But need be careful with swapped orientation and signs. Trimming should be done on work lists before computing mid script. The prefix/suffix equals are same in both work lists; in original signs '='. We can build prefix/suffix as list of tuples. The final script = prefix + mid_script + suffix. Does order and filtering hold? Yes, equals at start and end. The mid script for middle lists. The full script minimal because common prefix/suffix are forced? Actually, are they forced? For LCS, you can always include common prefix and suffix in some LCS of the whole if they don't overlap. The longest common subsequence length = p + LCS(mid) + s. Yes, because prefix before all mid, suffix after all mid. Any LCS can include them; minimal edit script length reduced by 2(p+s). Prepending/appending equals yields a minimal script. Good.

This trimming also helps no overlap? If no common prefix/suffix, none.

Need adjust ID interning to use mid lists only, not full wa/wb. That reduces masks for trimmed prefix/suffix lines (maybe many) and rows. Good.

Implementation with trim:
```
    if len(b) <= len(a): wa,wb=a,b; swapped=False
    else: wa,wb=b,a; swapped=True
    n0=len(wa); m0=len(wb)
    p=0
    while p < n0 and p < m0 and wa[p] == wb[p]: p += 1
    s=0
    while s < n0-p and s < m0-p and wa[n0-1-s] == wb[m0-1-s]: s += 1
    prefix = [('=', wa[i]) for i in range(p)]
    suffix = [('=', wa[i]) for i in range(n0-s, n0)]
    wa_mid = wa[p:n0-s]
    wb_mid = wb[p:m0-s]
    # compute mid script on wa_mid, wb_mid with same swapped signs
    mid = _diff_mid(wa_mid, wb_mid, swapped)
    return prefix + mid + suffix
```
But `_diff_mid` needs signs based on swapped. We can implement inline to avoid nested function? Could define nested helper or just set `wa, wb = wa_mid, wb_mid` and after backtrack build final list by `return prefix + rev + suffix`. But prefix/suffix lists could be large (20k) and concatenation copies. That's okay (40k). To save memory, we could `prefix.extend(rev); prefix.extend(suffix); return prefix` if prefix list. But if p=0, prefix empty. We can do:
```
    result = prefix
    result.extend(mid_rev)
    result.extend(suffix)
    return result
```
Need mid_rev list. `rev` built then reversed. Could instead build final in `rev`? We need reverse mid. We can after backtrack `rev.reverse()`, then combine.
Memory: prefix + mid + suffix creates new list if using `+`. Use extend to reuse prefix list (or result). If p large, prefix list already large. Good.

Trimming with IDs: We should interning only mid. If mid empty, we can skip rows and backtrack. Then mid script empty. Return prefix+suffix.
If `wa_mid` or `wb_mid` empty, bitset handles, but we can shortcut to output all deletions/insertions? The general loop handles. But if one empty, rows small. Could shortcut for speed:
- If not wa_mid: mid script all insertions from wb_mid with sign_ins (work insertions). In reverse? Forward should insert in order. Our backtrack with n=0 would produce insertions in forward order after reverse. We can just `mid = [(sign_ins, line) for line in wb_mid]`? Wait work insertions sign_ins. If n=0, forward script is all insertions wb_mid in order. Yes.
- If not wb_mid: mid all deletions wa_mid in order with sign_del.
But the general backtrack does this. Shortcut could save rows. Let's include simple shortcuts after trimming:
```
    n = len(wa_mid); m = len(wb_mid)
    sign_del = '+' if swapped else '-'
    sign_ins = '-' if swapped else '+'
    if n == 0:
        mid = [(sign_ins, line) for line in wb_mid]
    elif m == 0:
        mid = [(sign_del, line) for line in wa_mid]
    else:
        compute bitset and backtrack
```
But if n=0 and m large, sign_ins for work insertions. If swapped, sign_ins='-' original deletions from original a (work wb), correct. If no swap, sign_ins='+' original insertions from b. Good.
If m=0, deletions from work wa. Good.
This avoids interning/masks for empty mid.

However, if we slice wa_mid/wb_mid, and then maybe n or m zero. Good.

Should we trim before or after choosing shorter? Trim works on work lists. If we swapped, common prefix/suffix of work lists same as original (just order of lists swapped). p/s same counts. Prefix equals lines from wa (which may be original b) but '=' so okay. Suffix from wa. Good.

Now, if p+s equals min lengths, mid empty; prefix/suffix may cover one list but not the other? Example wa shorter and all its lines match prefix of wb, p=n, s=0, mid wa empty, wb_mid suffix of wb. prefix length n, mid all insertions wb_mid. Good. Suffix maybe none. If both prefix and suffix trimmed, ensure they don't overlap: p computed first, s limited to n-p,m-p. Good.

Potential issue: Trimming common prefix and suffix independently may remove overlapping parts if sequences fully match? Example wa=['A'], wb=['A']. p=1, s limit 0, mid empty, prefix ['=A'], suffix []. Good. If wa=['A','B'], wb=['A','B'], p=2. Good. If wa=['A','B','C'], wb=['A','C'], p=1, s=1 (wa[-1]=C,wb[-1]=C), mid wa=['B'], wb=[]. Script =A, -B, =C. LCS length2. Valid. p+s=2 not overlap (p=1, s=1, n=3). Good. If wa=['A'], wb=['A','A'], p=1, s=0 (remaining n-p=0), mid wb ['A'], prefix =A, mid +A. Good.

Trimming string comparisons could be O(p+s) which is at most 20k, fine. If lines long, comparisons maybe. But bitset would also. Could use IDs? Not needed.

Now, if we trim, the rows memory for 20k with 50 diff could be much less if prefix/suffix large. Good.

But slicing wa_mid = wa[p:n0-s] creates a new list of references. If p+s small, extra memory small. If p+s large, mid small. Good.

Could avoid suffix list copy by building suffix as `([('=', wa[i]) for i in range(n0-s, n0)])` but list needed. Fine.

Now, if p or s large, prefix/suffix list of tuples memory maybe 20k*56=1.1MB each. Fine.

Now, with trimming, we should compute signs before shortcuts. The bitset backtrack uses `wa` and `wb` as mid lists. Let's restructure function:
```
def diff_lines(a,b):
    if len(b) <= len(a):
        wa, wb = a, b
        swapped = False
    else:
        wa, wb = b, a
        swapped = True
    sign_del = '+' if swapped else '-'
    sign_ins = '-' if swapped else '+'
    n0 = len(wa); m0 = len(wb)
    p = 0
    lim = min(n0,m0)
    while p < lim and wa[p] == wb[p]: p += 1
    s = 0
    lim = min(n0-p, m0-p)
    while s < lim and wa[n0-1-s] == wb[m0-1-s]: s += 1
    prefix = [('=', wa[i]) for i in range(p)]
    suffix = [('=', wa[i]) for i in range(n0-s, n0)]
    wa = wa[p:n0-s]
    wb = wb[p:m0-s]
    n = len(wa); m = len(wb)
    if n == 0:
        mid = [(sign_ins, line) for line in wb]
    elif m == 0:
        mid = [(sign_del, line) for line in wa]
    else:
        # interning/masks/rows/backtrack -> mid
    if prefix:
        prefix.extend(mid); prefix.extend(suffix); return prefix
    # else maybe mid.extend(prefix)? prefix empty
    # To avoid if, can do result = prefix; result.extend(mid); result.extend(suffix); return result
```
If prefix empty, `result=[]` and extend mid/suffix. Good. We can always `result = prefix` (which is a list), extend mid, suffix, return result. If mid is large, prefix maybe empty; result initially empty, extend mid copies references. If mid itself is a list, copying mid into result duplicates list memory. We could instead if prefix empty, use mid as result and extend suffix? But if we return mid directly, it's okay if we don't modify later. We can do:
```
    if prefix:
        prefix.extend(mid)
        prefix.extend(suffix)
        return prefix
    if suffix:
        mid.extend(suffix)
        return mid
    return mid
```
But if we need to modify mid (e.g., backtrack rev reversed) after? We can build mid list final. For shortcuts, mid list. For bitset, mid = rev reversed. We can reuse. This avoids extra copy. However, if prefix nonempty, `prefix.extend(mid)` copies elements; prefix final size = total. Memory peak