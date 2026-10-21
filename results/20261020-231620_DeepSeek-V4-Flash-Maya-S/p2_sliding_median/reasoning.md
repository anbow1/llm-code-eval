We need answer code single block. Need implement sliding median efficient stdlib. Need consider n 200k k 1000 well under 2 sec Python. Need balanced structure? Standard library only. Use sorted list? insertion O(k), n*k = 200M maybe too slow. Need efficient.

Options use Fenwick tree coordinate compression over values, maintain counts, find kth. Sliding window values arbitrary floats. Compress sorted unique values. Fenwick O(log m) per add/remove, kth O(log m). For medians need lower/upper. n=200k, m<=200k, ~ (n additions + n removals + windows * kth) maybe 600k*18 ~10.8M operations plus Python overhead, okay <2 sec maybe ~1 sec or 2. Need optimize.

Need return floats. For k odd median value at (k//2 +1) 1-indexed. For even need k/2 and k/2+1.

Can compute using Fenwick counts. Coordinate compression: sorted(set(nums)), map value to index. For each element need index. Building dict. We update count in window. For each right:
- add index
- if window size==k, compute medians
- remove old index.
Could optimize by initialize first k and compute then slide.

Function code:

def sliding_median(nums,k):
 if k<1 or k>len(nums): raise ValueError
 vals=sorted(set(nums))
 m=len(vals)
 pos={v:i+1 for i,v in enumerate(vals)}
 tree=[0]*(m+1)
 def add(i,delta):
   while i<=m: tree[i]+=delta; i += i&-i
 def kth(k):
   idx=0
   bit=1 << (m.bit_length()-1) maybe highest power of two <= m. Actually highest power of two >= m can start 1<< (m.bit_length()-1) and adjust. while bit: nxt=idx+bit; if nxt<=m and tree[nxt]<k: idx=nxt;k-=tree[nxt]; bit>>=1; return vals[idx] # since idx is count of positions before target; target index 1-based = idx+1, vals[idx]. Let's test.

Fenwick kth standard:
idx=0
bitmask=highest power of two <= m
while bitmask:
 t=idx+bitmask
 if t<=m and tree[t]<k:
    idx=t; k-=tree[t]
 bitmask >>=1
return idx+1 (1-based) => vals[idx] because zero-based idx (idx as number before). Actually if return 1-based index idx+1, values index zero-based = (idx+1)-1=idx. Yes vals[idx]. Good.

Could inline for performance? Nested functions have overhead but okay. We can implement loops.

Need efficient enough. Could use two heaps with lazy deletion and sorted? For sliding window median, heaps with lazy deletion can O(n log n), but balancing two heaps with arbitrary deletions tricky because deletion from median side affects rebalance lazy. Fenwick simpler.

Potential performance: n=200k k=1000, per window compute kth up to 2, ~200k*2*bits. Add n, remove n. ~4*200k*18=14.4M loops; Python maybe 1.5s? Need under 2 "well under". Could optimize with block decomposition? Let's estimate. Fenwick loops in Python 14M with simple operations ~1s? Actually function call add each n with while loop ~18 iterations each, ~7.2M for two per element includes n add + n remove = 400k*18=7.2M. kth 200k windows * for k=1000 mostly 2 (even) =400k*18=7.2M. total 14.4M plus dict, maybe 1.2 sec. Fine.

But for k=1, only median 200k, add/removal; okay.

Could optimize by precompute indices for nums using list comprehension [pos[x] for x in nums]. Also values array.

Possible issue floating NaN? set and sorted with nan weird. Probably ignore.

Returning median for odd: vals[idx] float? nums type list[float], vals elements floats (could ints but type). Need return floats. Median of two middle values mean of two floats. For odd return maybe value as float? input float but if int? Function annotation list[float], but user may pass ints. "Return floats" probably all results float. For odd return float(vals[idx]); for even (a+b)/2.0. If vals are ints, (a+b)/2 yields float, but odd should cast.

Potential duplicate values. Window counts.

Implementation with Fenwick.

Let's formulate:

def sliding_median(nums: list[float], k: int) -> list[float]:
    n=len(nums)
    if k<1 or k>n: raise ValueError(...)
    vals=sorted(set(nums))
    m=len(vals)
    index={v: i+1 for i, v in enumerate(vals)}
    # Could map nums to indices list
    idxs=[index[x] for x in nums]
    tree=[0]*(m+1)
    top=1 << (m.bit_length()-1)  # if m>=1; k valid ensures n>=1 so vals nonempty
    def kth(kk):
        idx=0
        bit=top
        while bit:
            nxt=idx+bit
            if nxt<=m and tree[nxt] < kk:
                idx=nxt
                kk -= tree[nxt]
            bit >>=1
        return vals[idx]  # as above? Wait return vals[idx] where idx is count before target? Let's check with simple.
    # add first k-1? 
    for p in range(k-1): add idx...
    res=[]
    half=k//2
    for r in range(k-1,n):
        add(idxs[r],1)
        if k % 2:
            med = vals[kth(half+1)] # need kth returns? Let's test.
        else:
            a=...
        # Need remove nums[r-k+1] if r-k+1>=0. For windows, after computing remove left? If remove before next iteration, keep window size k. Do after compute if r-k+1>=0 (always r>=k-1). Remove left idxs[r-k+1].
    But initial loop add k-1. Then in each r add one => window size k. compute. remove left. For r at k-1, left=0 removed after compute. Then next add r=k => window elements 1..k plus current? Wait after compute at r=k-1, remove idxs[0], tree has 1..k-1 counts (k-1 elements). Next r=k add idxs[k], tree elements 1..k-1 + k = k elements (window 1..k). good.

But careful kth function returns what? Let's manually:
tree counts values [a,b,c]. m=3. kth(1). top=2. idx=0 bit=2; nxt=2; tree[2] maybe count of first 2? Fenwick structure tree[2] sum 0..1. if tree[2]<1? no if count >=1. bit=1; nxt=1; if tree[1]<1? if a count >0 tree[1]=1 not <; idx remains0; return vals[0] correct.
kth(2), if each count 1. tree[2]=2. kk=2. bit=2: tree[2] <2 false. bit=1: nxt=1, tree[1]=1 <2 true: idx=1, kk=1. bit=0. return vals[1] correct.
kth(3): bit=2 tree[2]=2<3 true idx=2, kk=1; bit=1 nxt=3 tree[3]? Fenwick tree[3] = a? Actually tree components: update 1 and 3? For counts all 1: tree[1]=1 tree[2]=2 tree[3]=1? update3 adds tree[3]=1. Fenwick query. At bit=2 idx=2 kk=1. bit=1 nxt=3; if nxt<=3 and tree[3] < kk? tree[3]=1 <1 false. return vals[2] correct. Good.

But note in kth, when tree[nxt] < kk, kk -= tree[nxt]. Standard uses if tree[next] < k, then k -= tree[next]; idx=next. Yes.

We need add function. Could inline add loops for initial and each iteration to avoid function overhead? Simplicity okay. But performance maybe optimize with local variables. Nested function add called ~400k. Fine.

Potential top calculation: m bit_length. For m=1, 1 << (1-1)=1. Good. top highest power of two <= m. m.bit_length()-1 shift gives highest power <= m? For m=5 bit_length=3, 1<<2=4. yes. For m=8 bit_length=4, 1<<3=8. Good.

Now result med:
if k & 1:
   med = kth(k//2 +1)
   res.append(float(med))
else:
   a = kth(k//2)
   b = kth(k//2+1)
   res.append((a+b)/2.0)
We know a,b order. If a,b maybe ints, /2.0 float. Good.

Need remove after compute:
left = r - k + 1
# remove idxs[left]
i=idxs[left]
while i<=m:
    tree[i]-=1
    i += i&-i
For r from k-1 to n-1, left index. Since after compute remove idxs[r-k+1]. Fine.

But initial add first k-1. Could instead initialize window first k and compute then slide. Current works.

Potential optimize initial add loops in one function add. Use add = local. Fine.

Could there be k=n, initial add n-1, add last, compute, remove left. good.

k=1: initial range(0) none, for r=0 add idx0, compute median, remove left=0, etc.

Memory: idxs list 200k.

Need consider floats hash equality for -0.0 and 0.0? set treats equal, okay. NaN issue: NaN not equal itself, set may include multiple? Sorted with nan unpredictable. Probably not needed. Could mention no.

Need output only code block. The prompt says "Reply with a single ```python code block containing complete solution. No tests..." So final should be code block.

Can improve performance: nested kth uses vals, tree, top, m from closure; local variables might be cell access slower. Bind local inside function? Could define kth with default args? e.g. def kth(kk, tree=tree, vals=vals, top=top, m=m): but m changes? m fixed. Top. closure access maybe okay. For speed, define in function with defaults. Similarly add. Or inline. We can implement optimized version.

Let's estimate "well under 2 seconds". Fenwick kth called up to 400k times. It loops over bit_length ~18, but with if. Closure variable access to m, tree, vals. Could be ~0.5-1s. add function called 400k loops 18 =7M. Python nested call overhead 0.2s. Fine.

Could optimize by using block decomposition (sqrt) O(sqrt m) per update and kth? Updates O(1) + block count, kth O(sqrt). For n=200k, sqrt 447, worse. Fenwick best.

Could use sortedcontainers not stdlib unavailable.

Alternative use two heaps with lazy removal for each window. Rebalancing and lazy deletions tricky but possible with O(n log n). But Fenwick coordinate compression robust. Need ensure duplicates and lazy not needed.

Let's consider memory of set(nums): 200k.

Potential speed: sorted(set(nums)) plus dict. fine.

Could optimize mapping values: index = {v:i+1...}; idxs = [index[x] for x in nums]. For floats that are same hash.

Let's write final clean code.

Potential issue: if nums empty and k? k<1 or k>len(nums). If len=0 and k=0, k<1 true raise. If k>0 raise. So after validation, n>=1. Good.

Error message? Any. Raise ValueError("k must be between 1 and len(nums)").

Let's final code with helper functions.

Need "complete solution" likely only function. Include only function. Maybe no imports.

Let's write:

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    values = sorted(set(nums))
    m = len(values)
    rank = {v: i + 1 for i, v in enumerate(values)}
    ranks = [rank[x] for x in nums]

    tree = [0] * (m + 1)
    highest = 1 << (m.bit_length() - 1)

    def add(i: int, delta: int) -> None:
        while i <= m:
            tree[i] += delta
            i += i & -i

    def kth(order: int) -> float:
        idx = 0
        bit = highest
        while bit:
            nxt = idx + bit
            if nxt <= m and tree[nxt] < order:
                idx = nxt
                order -= tree[nxt]
            bit >>= 1
        return values[idx]

Note kth return values[idx]; type maybe float.

    for i in range(k - 1):
        add(ranks[i], 1)

    res = []
    half = k // 2
    if k & 1:
      # odd
      for r in range(k-1,n):
        add(ranks[r],1)
        res.append(float(kth(half+1)))
        left = r-k+1
        add(ranks[left],-1)
    else:
      for r...
        add ranks[r]
        a = kth(half)
        b = kth(half+1)
        res.append((a+b)*0.5)
        add left -1
    return res

Could reduce branch in loop by unified. Branch outside helps performance.

Need ensure for even kth called before remove. kth returns values based counts. half for k=2 is1: kth(1), kth(2). okay. For k=4 half=2: kth(2), kth(3). okay.

Return float for odd: float(kth(...)). kth may return float already. For even (a+b)/2.0 yields float. If a and b maybe large ints? float? Input float. Cast result to float? (a+b) *0.5 float. Good.

One subtlety: If a,b are float NaN, etc. ignore.

We could optimize `remove` with inline to reduce function? add ranks left -1. That's function call.

Potential issue due to helper add captured `m` and `tree`, but assignments tree[i] modify list not bind. okay.

Could improve speed by binding local `tree_local=tree`, `values_local=values` inside kth default? Not necessary but maybe.

Let's measure mentally. 400k add function calls, each ~ up to 18 loops but average maybe? Fenwick update loop count log(m) but depends rank; average around 9? Actually update increments lowbit, stops at m. For m=200k, average maybe 9-10. Removal same. kth 18. Total ~ (400k*10=4M)+(400k*18=7.2M)=11M. okay.

Actually kth for even called 2 per window. n=200k k=1000 => 199001 windows *2=398k. Odd half. Fine.

Let's final with code block only. But maybe user expects import? Only standard lib. No imports needed.

Let's ensure no extra text after code block.