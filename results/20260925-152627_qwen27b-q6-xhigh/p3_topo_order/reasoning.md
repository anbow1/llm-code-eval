We need answer user: write Python code only, complete solution in python block. Need design function topo_order(n, edges) returns lexicographically smallest valid ordering, duplicates ok, cycle ValueError, performance n=200k m=400k about a second. Need use stdlib only Python 3.11+.

Need produce code block. Need think carefully.

Problem: Kahn with min-heap to get lexicographically smallest topological order? For DAG, lexicographically smallest sequence among all topological orderings can be obtained by repeatedly choosing the smallest available node (zero indegree) using min-heap. That's standard. Need efficient for 200k, 400k. Python heap operations okay. Need avoid memory blow? duplicates edges: need indegree count and adjacency. Duplicates increment indegree and adjacency multiple times? If duplicates, if we push duplicate neighbors, indegree decremented multiple times, eventually correct if indegree also multiple. But duplicate edges can cause more memory/time (400k edges still okay). We can deduplicate? For performance and correctness, duplicates can be processed as separate counts. But if there are many duplicates maybe m=400k, still fine. Adjacency list of lists: 200k empty lists overhead maybe ~11MB; edges 400k ints ~11MB plus lists overhead maybe okay. But we can optimize using arrays? Let's consider 1 sec constraint. Python heap O((n+m)log n). 600k log 200k ~ 10M operations, okay maybe ~1s? Need efficient.

Potential pitfalls: lexicographically smallest topological ordering? Kahn with min available node yields lexicographically smallest for topological order (proof by exchange). Yes.

Need raise ValueError for cycle including self-loop. Self-loop: edge (a,a) indegree[a] >0, never available -> cycle detected if result length < n. But if self-loop and node not processed? Yes result length < n. If n=0? Nodes 0..-1 empty. Edges? should maybe return [] if n=0; if edges non-empty invalid? Nodes are 0..n-1; edges maybe contain invalid? Spec doesn't mention, we can assume valid. But if n=0 and edges empty, heap empty, result empty.

Performance: We need parse edges list of tuples. Could build adjacency as list of lists and indegree as list of int. For each (a,b): indegree[b]+=1; adj[a].append(b). Duplicates included. Then heapify initial zero indegree nodes. Then while heap: pop u; append; for v in adj[u]: indegree[v]-=1; if zero push. At end if len(result)!=n raise ValueError. Return result.

Can we improve memory/time by sorting edges? Alternative: group by source using counting sort / arrays to avoid 200k lists? For 400k edges, list of lists okay. But 200k empty lists overhead maybe ~11 MB; within memory? Not specified. Time to allocate 200k lists maybe 0.01-0.02s. Fine.

But maybe lexicographically smallest with duplicate edges: If duplicate edge a->b, indegree[b] counts duplicates. When processing a, adjacency has b twice, decrement twice, possibly to zero after both, push once if check after each. Need be careful: if indegree[v] becomes 0 after first duplicate? Suppose two duplicates from same a and no other incoming: indegree 2. Process first ->1 not push. second ->0 push. Fine. If duplicates from different processed nodes: e.g. a->b twice, c->b once. indegree 3. Processing a twice reduces to 1; c reduces to 0 push. Fine. If after one decrement indegree becomes 0, we push; but if there is another duplicate from same node later in adjacency? That would imply indegree before decrement was 0? impossible if duplicates counted and total remaining includes that later duplicate. But what if due to negative? Not possible if indegree counts all incoming edges and each edge processed exactly once. When processing u, for each outgoing edge v, decrement. v cannot become 0 until all incoming edges processed, including all duplicates from u. If there are remaining duplicates from u after indegree reaches 0, that would mean total incoming counted less than edges; impossible. So okay.

Could deduplicate to reduce heap? Dedup might be expensive. We can ignore.

Need consider performance of `heapq.heapify` on initial zero indegree list. Could use heap = [i for i,d in enumerate(indegree) if d==0]; heapq.heapify(heap). For all nodes zero indegree, heapify O(n). Good.

Potential optimization: local variables for speed: `heappop = heapq.heappop`, `heappush = heapq.heappush`, `append = result.append`, `adj_local = adj`, `indeg = indegree`. But in loop need assign? We can do. Use `while heap: u=heappop(heap); append(u); for v in adj_local[u]: d = indeg[v]-1; indeg[v]=d; if d == 0: heappush(heap, v)`. Good.

But for 400k, function local binding okay.

Alternative more efficient for lexicographic smallest: Use DSU or bucket? Since nodes 0..n-1, available nodes are zero indegree. Need smallest. Could maintain boolean zero and scan pointer? But when new nodes become zero with smaller than current? Actually Kahn chooses min heap. Could use segment tree or Fenwick? Heap fine. But 1 sec? Let's estimate Python: build list of 200k lists, iterate 400k, heap operations. Worst-case topological order with all edges from low to high, initial heap [0] only? Each step push next node, one pop push: 200k heap ops log small? Actually heap size mostly 1, cheap. Worst-case heap size large: edges from 0 to all others? initial heap [0,1,2,...]? Let's design: edges 0->i for all i>0. initial zero indegree only 0 (if indegrees all 1 for others). pop 0, push 199999 nodes. Then heap pops all in order. heapify not needed, push 199999 nodes one by one O(n log n) if we push each. But we can optimize: when a node has many outgoing, and many become zero, pushing individually expensive. However m=400k, n=200k, pushing all nodes once total O(n log n). 200k log ~ 3.6M, okay. But if edges 0->i for i 1..199999, m=199999, push 199999. okay.

Can we do better using `heapq.heapify` on batch? During processing a node, many neighbors may become zero. We can collect newly zero nodes in a list, then heapify? But merging with existing heap? If we extend heap and heapify entire heap each time, bad. Could if batch large, use `heap.extend(batch); heapq.heapify(heap)`? Heapify O(size), maybe beneficial if size big, but repeated could be O(n^2) in worst-case? Not safe. Individual push total O(n log n), fine.

Could use min-heap but for lex smallest there's a nuance: If we have zero indegree nodes, choose smallest. Yes.

Potential issue with duplicate edges and self-loop: If self-loop (a,a), indegree[a] increments, adj[a] append a. If a also has incoming from processed? Self-loop means a cannot be zero before processed, so not in heap. If no other incoming? indegree=1, not zero. Cycle. If other incoming and self-loop, after other processed indegree remains 1 due self-loop; never push. result short. Raise.

Need think if invalid edge values? Not required. But if edge has a or b outside 0..n-1, code may IndexError. Fine.

Could use array module for indegree? list int fine. Python ints overhead but 200k ~ 5.6MB. adjacency list of lists: each edge int reference in inner list. For 400k, ~3.2MB references plus int objects? Ints are existing? Node ints from tuples are Python objects; when append b, reference to int object from tuple? If b > 256, each tuple contains int object, appending stores reference; after function edges list still holds ints. But no new int. Memory okay.

But if input edges is list of tuples of ints, those ints exist. If we don't store edges after function? Edges passed, memory external. We store adjacency references. Good.

Could optimize by using arrays of lists? Not needed.

But the performance "about a second" maybe tight. Need craft fastest stdlib implementation. Let's consider advanced optimizations.

Option 1: Use `array('i')`? Adjacency list of arrays? Overhead more. List of lists is fast.

Can sort edges by source and use flat adjacency arrays to reduce list overhead and improve iteration? For 400k, maybe faster? Build `head` offsets: count outdegree, prefix sum, fill flat array. But Python list of ints for flat 400k plus offset 200k. Building with two passes over edges. Iteration using slices? `for v in adj[start[u]:end[u]]` creates slice (bad) or index loop (slow). Could use `itertools.islice`? slower. List of lists iteration is fast.

Could group edges by source via dictionary? no.

Could use `defaultdict(list)`? More overhead.

Maybe use `adj = [[] for _ in range(n)]` is okay. For speed, local `adj_append`? We can't easily bind each list's append. Loop:
```
adj = [[] for _ in range(n)]
indeg = [0]*n
for a,b in edges:
    adj[a].append(b)
    indeg[b] += 1
```
This is okay for 400k. Could optimize by sorting edges by a and building? no.

Alternative: deduplicate edges using set? m 400k, set memory/time bigger; not needed.

Potential lexicographically smallest with heap: Suppose available {1,2}, choose 1; might block 0? 0 not available. Standard.

Need ensure if cycle but some nodes process, raise ValueError not return partial.

Edge duplicates: If duplicate self-loop, indegree 2, still cycle.

Could add early detection for n==0: return [] (if edges? if invalid not). But general code works: adj=[], indeg=[], heap=[], while skip, result=[], len 0 == n return.

Need output only code block. Could include imports inside function or top-level. User asks write function. We can include `import heapq` at top. Complete solution. No tests, no example, no print, no input.

Need maybe type hints. `def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:`

Need think about Python 3.11+ standard library. Could use `from heapq import heappop, heappush, heapify`.

Can we implement a faster min-heap with `heapq`? Yes.

But let's analyze the lexicographically smallest property. The greedy min-heap algorithm yields lexicographically smallest topological ordering among all? Let's prove to self: At first position, any valid topological order must start with a source (zero indegree). To minimize lexicographically choose smallest source. After choosing it, recursively choose smallest source in remaining graph. This yields lex min. Yes.

Performance edge cases:
- If n=200k, m=0: adj 200k lists, indeg 200k zeros, heapify all nodes. Then pop 200k. Heap operations on 200k sorted initial heap: Actually heap after heapify of sorted list [0..n-1] is already heap? A sorted list is a valid min-heap? For heap property parent <= children, sorted ascending yes. `heapify` O(n) but maybe linear. Popping 200k from heap of size decreasing, O(n log n). 200k log 200k ~ 3.6M sift steps. In Python maybe 0.3s? plus list alloc. Okay.

Worst-case for heap operations: n=200k, m=400k. Each node pushed once, popped once: 400k heap ops. log up to 18. ~7M comparisons. Should be okay ~1s? Python heapq implemented in Python, each op loops. 400k*log ~ maybe 0.5-1s. Plus building. Could be close but okay.

Can we reduce heap ops in m=0 case by detecting no edges? If no edges, lex smallest is [0..n-1]. We can if not edges: return list(range(n)). But edges may contain duplicates? If empty. This speeds m=0. But if edges nonempty, need process.

Can we detect if all nodes zero? no.

Could use specialized when edges form total order? Not needed.

Could use `result = [0]*n` and fill by index instead of append? Append is fast. But for final cycle check maybe `out = []`. If preallocate and pos, maybe faster? Let's consider:
```
order = []
append = order.append
...
if len(order) != n: raise ValueError
return order
```
Append okay. Prealloc:
```
order = [0]*n
pos=0
...
order[pos]=u; pos+=1
...
if pos != n: raise ValueError
return order
```
Avoid append method? Both fine. Prealloc might be slightly faster and memory same. Use local `order[pos] = u`; `pos +=1`. But `pos` local update. At end if pos != n. Return order. This avoids dynamic resizing. Let's use prealloc for speed. Need if n=0, order=[] pos=0.

Loop:
```
order = [0] * n
pos = 0
while heap:
    u = heappop(heap)
    order[pos] = u; pos += 1
    for v in adj[u]:
        d = indeg[v] - 1
        indeg[v] = d
        if d == 0:
            heappush(heap, v)
if pos != n: raise ValueError
return order
```

Need ensure `pos` assigned inside loop; Python local. Good.

Can we avoid checking `if pos != n` by `len(order)`? prealloc len always n. Use pos.

Can we avoid heap if graph is already sorted? Not necessary.

Potential micro-optimizations:
- `indeg = [0] * n`
- `adj = [[] for _ in range(n)]`
- `for a, b in edges:`; maybe unpacking overhead. Could use `for e in edges: a=e[0]; b=e[1]`? Unpacking likely fine.
- Use `adj[a].append(b)`: attribute lookup each time. Could not easily optimize. But 400k only.
- For indeg increment: `indeg[b] += 1` involves list get/set. okay.

Alternative build adjacency using `list.append` local? Could do:
```
for a,b in edges:
    adj[a].append(b)
    indeg[b] += 1
```
Fine.

Could use `array('I')` for indeg to reduce memory but slower? list faster.

Could deduplicate self-loop? If self-loop, immediate ValueError? Since self-loop is cycle. We can early detect: if a == b: raise ValueError. But spec says if cycle raise. Early self-loop detection can save. But if edges list contains self-loop, can raise immediately while building. Is that okay? Yes self-loop is cycle. But if there is self-loop, no valid ordering. Raise. It may avoid processing. But if we raise during building before considering invalid? okay. However, if we early raise on self-loop, duplicate? fine. But if we want consistent with cycle detection after? no issue. But early self-loop detection in loop: `if a == b: raise ValueError`. That branch for every edge may slow; m 400k, branch cheap. But not necessary. It also changes behavior if there is self-loop and maybe invalid n? irrelevant. Could include? It might be beneficial for self-loop test. But the cycle detection at end would also raise. Branch overhead minimal. But if no self-loops, branch predictable. We can include? It may be seen as unnecessary. If a==b, indeg[a]++ and adj[a].append(a); final pos<n. But if n=0 and edge self-loop invalid index? Not valid input. I'd maybe not include to keep simple. But "including a self-loop" suggests ensure self-loop detected. Final detection does. But early can be clear.

Could there be a self-loop on a node that is otherwise isolated. indeg=1, not in heap, pos<n raise. Good.

Need think about duplicate edges causing indegree to become zero and push node multiple times? We argued no if counts consistent. But let's test a scenario with parallel edges and multiple sources: edges [(0,1),(0,1),(2,1)]. indeg[1]=3. heap [0,2]. pop0: adj[0]=[1,1], d:2,1. no push. pop2: d:0 push1. Good. If heap [0] only, pop0: d 2,1 no push. Then heap empty, pos=1<n cycle? Actually DAG? 1 has indeg from 0 only duplicates, after processing 0 indeg should be 0. Wait with two duplicates indeg=2. Processing 0 twice: first d=1, second d=0 push. Good. So push after second.

What if adjacency list for u has v multiple times and indeg[v] initially 1 due to bug duplicate not counted? But we count each edge. okay.

Potential issue: If node v becomes zero and is pushed, but later in same adjacency list of u there is another edge to v? impossible as above. But if there is a self-loop? u==v, and indeg[u] includes self-loop. u is only processed if indeg zero before processing, impossible if self-loop counted. So self-loop not in adjacency of processed node? If node has self-loop plus incoming, not processed. If no incoming but self-loop, not processed. So we never process edge from self-loop. Good.

Cycle detection: For any cycle, at least one node in cycle has indegree >0 from cycle, none zero unless cycle nodes have external? In a directed cycle, each node in cycle has indegree at least 1 from predecessor in cycle. Even if some have external incoming, still no zero? Actually a node in cycle could have indegree from cycle plus external; cannot be zero. So none in cycle can become zero until a cycle node processed, impossible. Thus Kahn leaves cycle nodes unprocessed. Good.

Need think about lexicographically smallest if graph has disconnected components. Heap handles.

Now, could there be a more efficient algorithm using `heapreplace`? no.

Need maybe use `sys.setrecursionlimit`? no recursion.

Potential memory/time with `edges` large: If `edges` is generator? Type list, but if iterable, our one-pass works. If generator, cannot know m, but fine. If list, fine. If edges is not list but iterable of tuples, works. Type hint list.

Need ensure no global imports? okay.

Let's consider if there are duplicate edges and we want lexicographically smallest ordering. Duplicates don't change constraints. Our indegree counting duplicates yields same zero times as unique? Yes, because all duplicate edges from same or different sources processed at same times; indegree becomes zero after last incoming edge processed, same as unique. If duplicate edges from source u to v, they are processed when u processed, so zero time same. Good.

Now performance nuance: `heapq.heappush` for each newly zero node. In worst-case when processing node with many outgoing edges, we push many nodes. If those nodes are contiguous? Could optimize by collecting and using `heapq.heappush`? There is no batch. Could use `heap.extend(new_nodes); heapq.heapify(heap)` if new_nodes large relative to heap. But not necessary and may hurt.

Could use a binary heap implemented with `list` and local variables? `heapq` is Python but optimized? It's pure Python. Could implement custom sift down/pop maybe not faster. Use heapq.

Could use `heapq.merge`? no.

Alternative: Since nodes are 0..n-1, and we always need smallest available, we can use a bitset / sorted set with O(1) find min? For n=200k, a boolean array plus a Fenwick tree to find first available in O(log n) similar. But heap simpler. Could use `sortedcontainers` not stdlib.

Could use a bucket pointer if available nodes only increase? But nodes become available arbitrarily; we need smallest zero indegree not yet output. We can maintain `available` boolean and a min-heap. Alternative maintain a bitset with `int` bits: set bit when available, find least set bit via `(bits & -bits).bit_length()-1`, clear bit. Python big integers of 200k bits (~25KB) operations? Setting/clearing bits: `bits |= 1 << v` creates big int O(size) maybe O(n/word) for large shift? For v up to 200k, `1<<v` big int size proportional v, setting bit maybe O(limbs) ~ up to 3125 limbs, for 200k pushes -> 600M limb ops? Too slow. Could use bytearray bitset and scan? Need find smallest set bit; scanning from last found? Available nodes can be lower than last? We process in increasing order? Actually output order is not necessarily monotonic? Topological lex smallest output is nondecreasing? Let's examine: Nodes chosen are smallest available. Could output order be nondecreasing? Not necessarily: If node 0 available, output 0. Then maybe node 5 becomes available, output 5. Could node 3 become available later? Node 3 might not have been available earlier due to incoming from 0? If 3 <5, after output 5, can 3 become available? Example edges 0->3, 1->5? Initially 0,1,2,4? If 2 and4 available, lex outputs 0,1,2,3,4,5 monotonic. But can we output 5 then later 3? For 3 to become available after 5, 3 must depend on some node >5? But then 5 output before 3 possible if 5 available and 3 not. Example n=6, edges 0->3, 5? Let's try: initial available 0,5. output 0, then 3 becomes available, but 3<5 so output 3 before 5. To output 5 before 3, 3 must not be available until after a node >5 processed. But if initial available includes 5 and some >5, and 3 depends on 6, then output 5 before 6, then later 3 after 6: sequence ...,5,6,3, which is decreasing. Is that valid? Edges: 6->3. Initial available: 0,5,6 (and others). Lex choose 0, then maybe 1,2? Need 3 not avail until 6. Available {5,6}. choose 5, then 6, then 3. Output 5,6,3 decreasing. So output not monotonic. Thus simple pointer not enough.

Could maintain min-heap.

Potential improvement: Because nodes labeled 0..n-1, and we need lex smallest, one can use priority queue. fine.

Now let's think about exact code style. Must reply with a single ```python code block containing complete solution. No tests, no example usage, no input(), no printing. So final just code.

Could include docstring? It's code, okay. But no prose outside. Docstring not printing. Fine. But maybe keep concise.

Need ensure function only, import. Use `import heapq` or `from heapq import ...`. If from import, global names. Maybe top-level:
```
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i, d in enumerate(indeg) if d == 0]
    heapq.heapify(heap)
    order = [0] * n
    pos = 0
    heappop = heapq.heappop
    heappush = heapq.heappush
    while heap:
        u = heappop(heap)
        order[pos] = u
        pos += 1
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                heappush(heap, v)
    if pos != n:
        raise ValueError("graph contains a cycle")
    return order
```

Will this be fast enough? Let's micro-optimizations:
- The list comprehension for heap uses enumerate; okay. For n=200k, 200k iterations.
- In while, `adj[u]` list lookup. Good.
- Could bind `indeg_local = indeg`, `adj_local = adj`, `heap_push = heappush`. Already local variables in function. Python local access fast.
- Could use `for v in adj[u]:` local `indeg` and `heappush` local. Good.
- Could avoid `heapq` attribute lookup by `from heapq import heapify, heappop, heappush` at top; then function local? If imported top-level, they are globals, access global slower than local. We can bind inside function: `heappush = heappush`? If from import, inside function: `heapq.heapify` attribute global; can bind to local. Or `from heapq import heapify, heappop, heappush` and inside use them (globals) maybe okay; but for speed bind local: `hp = heapify; pp = heappop; push = heappush`? Not necessary but can.

Maybe:
```
from heapq import heapify, heappop, heappush

def topo_order(...):
    ...
    heapify(heap)
    pop = heappop
    push = heappush
    ...
```
Global to local once. Fine.

Potential early special cases:
- If n == 0: return []? But if edges non-empty, invalid; but assume valid. If we return [] without checking edges, maybe hide invalid? Spec nodes 0..n-1; edges likely valid. Could not special-case. But for performance if n=0 edges empty, current code returns [] after heap empty. If edges non-empty and n=0, `adj[a]` IndexError. okay.
- If not edges: return list(range(n)). This avoids building adj? We can check at start: `if not edges: return list(range(n))`. But if edges is a generator, `not edges` false? For generator, truth value True? Actually generator truthy, cannot iterate twice. If type list, fine. But to support iterable, don't use truthiness? Could do `if edges is None`? Not needed. If edges is list, `if not edges` works. But if edges is generator, `not edges` is False (generators are always truthy), then for loop consumes. Fine. But if edges is an iterable with no elements but not empty? e.g. list-like? okay. `not edges` for custom iterable might not mean empty; but type hint list. We can include. However if edges is a list, checking not edges and returning range is faster for m=0. But building `list(range(n))` anyway. Need still detect cycle? no edges no cycle. Good.
But if edges is a list of self-loops? not empty.

Could check `if n == 0: return []` before edges? If edges empty, list(range(0)) okay. If edges non-empty invalid. No need.

Special case if edges empty: The code would allocate 200k empty lists and heapify/pops, which is slower. Returning range directly is much faster. But the worst-case with m=0 maybe expected. Include `if not edges: return list(range(n))`. However if edges is a generator, `not edges` false, but then we process. If edges is a list, good. If edges is a tuple? good. If edges is an iterator, truthy even if empty, but then for loop consumes and works; no early return for empty iterator. Accept. But type list.

Potential issue: `if not edges` on a list of edges is O(1). Good.

But if edges contains only duplicate self-loop? We don't early detect. okay.

Could special case if len(edges)==0? `not edges` enough.

Now, maybe there is a subtle performance issue with duplicate edges: If many duplicates (400k duplicates of same edge), adjacency list for a has 400k entries, indeg[b]=400k. When processing a, loop 400k, d decrements from 400k to 0, push once at end. That's 400k iterations okay. But if duplicates of many edges, total m 400k. Fine.

Could deduplicate to reduce indegree loops? If 400k duplicates of same edge, dedup would reduce to 1 and faster. But dedup requires set of 400k or sort, maybe not worth. But worst-case all duplicate same edge: our code 400k loop, still okay. 400k iterations trivial.

Could there be multiple edges causing indegree large; int increments okay.

Now, let's consider if lexicographically smallest topological order can be obtained by min-heap with indegree counts including duplicates. Yes.

Let's think about raising ValueError message. Any message okay. Could just `raise ValueError`. But message fine. No printing.

Need maybe handle negative n? If n negative, `[0]*n` gives []? Actually [0]*-1 -> []; range(n) empty. Then if edges empty return []? For negative invalid. Not required. If n negative and edges non-empty, adj = [[] for _ in range(n)] -> []; then adj[a] error. Fine.

Potential issue with type hint `list[tuple[int, int]]` requires Python 3.9+, okay 3.11.

Now, maybe the problem expects lex smallest *by node labels*, not stable? yes.

Let's test mentally:
- n=3 edges [(1,2)] -> indeg [0,0,1], heap [0,1]. pop0 order[0]=0 no out. pop1 order[1]=1, push2. pop2. [0,1,2]. Lex valid: sources 0,1 choose 0 then 1 then2. Good.
- n=3 edges [(0,2),(1,2)] -> heap [0,1]; pop0 indeg2=1; pop1 indeg2=0 push2; [0,1,2].
- n=4 edges [(2,0),(3,1)] -> heap [2,3]; pop2 push0 heap [0,3]; pop0; pop3 push1; pop1 => [2,3,0,1]. Is that lex smallest? Initial sources {2,3}, must start 2 (smallest), then sources {0,3}, choose 0? Wait after pop2, 0 becomes source, available {0,3}. Lex choose 0, then 3, then 1 => [2,0,3,1]? But is [2,0,3,1] valid? Edges 2->0, 3->1. Yes. Why did I pop3 before 0? heap after pop2: initial heap [2,3], pop2 -> heap [3], push0 -> heap [0,3]. heappop returns 0. So order [2,0,3,1]. Good. My mental earlier wrong. Lex smallest starts 2, then 0. Good.

Need ensure heap initial [2,3] heapified? [2,3] already. pop2 returns 2.

Now, consider cycle: n=2 edges [(0,1),(1,0)] indeg [1,1], heap [], pos0 raise.

Self-loop: n=1 edge [(0,0)], indeg[1], heap [] raise.

Now, performance in worst-case all nodes zero indegree: If we use `if not edges: return list(range(n))`, skip heap. Good. If edges nonempty but many zero, still heap. Could there be a faster way to handle nodes with no incoming/outgoing? Not needed.

Could use `heap = [i for i, d in enumerate(indeg) if d == 0]`; if all zero and edges nonempty? impossible if edges nonempty then some indeg >0. But could edges all self-loops, heap empty. okay.

Potential optimization for building adjacency: If n large and edges small, list of 200k lists still okay. But if n=200k, m=400k, okay. If n=200k, m=0, early return avoids. If n=200k, m small, allocate 200k lists maybe 0.02s. okay.

Could use `adj = [[] for _ in range(n)]` vs `adj = [None]*n` and create on demand? For iteration, need handle None. This can save memory and time for sparse? But building list of 200k lists not too bad. However if n=200k and m=400k, most nodes have outgoing? Average 2. Could create 200k lists. On-demand might reduce memory but add branch in build and process. For speed, prealloc lists likely faster. But 200k list objects allocation maybe maybe 0.02-0.05 sec. Fine.

But memory limit unknown. 200k empty lists: each list 56 bytes => 11.2 MB. References in outer list 1.6 MB. indeg list 1.6 MB refs + ints? zeros shared? [0]*n references same 0 int, but increments create ints for nonzero. adjacency edges references 3.2 MB plus inner list overallocation maybe. Total maybe <50 MB. Fine.

Could use `array('i')` for indeg to reduce memory but list faster.

Now, maybe "about a second" means strict; need optimize further. Let's benchmark mentally: Python 3.11, 400k heap ops? Actually each node pushed once popped once => 400k heap operations. But `heappush`/`heappop` on average heap size maybe up to n. Each op ~ log2(size) ~18 comparisons/swaps. 400k*18 = 7.2M. Python heapq functions are Python loops with list accesses, maybe ~100 ns? No, more like 100-200 ns per operation? Actually Python loop iteration ~50 ns? No, ~50-100 ns in C? Python bytecode ~50 ns? Modern Python ~50 ns? Let's approximate: heapq heappop 200k maybe 0.15s? Not sure. 400k heap ops maybe 0.5-1s. Building 400k edges maybe 0.1s. Could pass.

But if time limit 1 sec, need be careful. Can we reduce heap operations? We can choose lex smallest using a different data structure with O(n + m + n log n?) Maybe we can do O(n + m + n) using a radix-like? Let's explore possible more efficient algorithms.

We need repeatedly extract min from a dynamic set of available nodes, insert new nodes. Since node labels are bounded 0..n-1, can use a Fenwick tree (BIT) to find min available in O(log n), similar. Heap is probably faster. Could use a min-heap.

Can we exploit that insertions happen in topological order and labels? There is an algorithm using union-find "next available"? Maintain available boolean and a DSU to find next available? But we need minimum available, not just next from a pointer, because available set can get lower values inserted after higher values popped? As noted, output can decrease when a lower node becomes available due to a higher node processed. Example output 2,0... After popping 2, inserted 0 lower than current pointer? If pointer started at 0? Initially 0 not available. DSU next available from 0 could find 2. After output 2, 0 becomes available; need find 0, lower than previous. DSU next pointer can't go backward. But maybe we can maintain intervals of unavailable? A bitset with word-level operations could find first set bit faster: Use `bytearray` or `array('Q')` bitset. Set/clear O(1), find first set by scanning words from 0 each time? That could be O(n^2/word) if many pops and no low bits. But we can optimize with a heap of nonempty words? That's similar to two-level bucket: bitset words (64 bits) and a heap of word indices. To find min: while word_bits[word]==0 pop; then find least set bit in word via `bit_length`? For word, `x & -x`. Set bit O(1). This yields O(n + m + number_word_changes log(n/64)). Could be faster than heap of nodes? Let's analyze.

Two-level bitset:
- `words = [0] * ((n+63)//64)`, bitset available.
- `heap = []` of word indices that have nonzero bits? When setting a bit, if word was 0, push word index. When clearing bits, if word becomes 0, don't need remove from heap immediately; when extracting, pop until word nonzero (lazy deletion).
- To get min available: `w = heap[0]` after popping empty; `x = words[w]`; `low = x & -x`; `b = low.bit_length()-1`; node = w*64 + b; clear low: `words[w] = x ^ low`; if becomes 0? not needed immediate; next time lazy. Return node.
- When node becomes available: `w = v >> 6; bit = 1 << (v & 63); if words[w] == 0: heappush(heap, w); words[w] |= bit`.
This uses heap of words (size <= n/64 ~3125) instead of nodes (200k). Heap operations O(log 3125 ~12) but far fewer? Each set may push word if zero; each pop may pop empty words. Number word pushes <= number of times a word transitions 0->nonzero. Could be up to number of nodes? A word can become zero and later nonzero multiple times? Yes, if all nodes in a 64-label word processed, then later new nodes with same labels? Nodes are processed once, availability set only gains when node first available, then loses when processed. A node becomes available once and processed once. For a given 64-word, bits can turn on multiple times over time, and word can become zero, then later another node in same word turns on. How many transitions? At most number of nodes in that word? Could be 200k transitions worst-case if nodes in same 64 range become available alternately? But there are only 64 nodes per word, each bit turns on once. Word can become zero and nonzero at most 64 times? Actually if 64 bits in word, each bit set once, cleared once. Word nonzero intervals: number of 0->1 transitions <= number of set operations in that word = 64. Across all words <= n. So word pushes <= n. But heap of words size <=3125, log smaller. However each node still does bit operations and maybe branch. Could be faster? Maybe not, because Python big int? Here words are Python int up to 64 bits, operations cheap. `heap` size small, heappush/pop fewer? But each node set checks `if words[w] == 0: push`. That's 200k. Extraction: 200k min finds, each does `while not words[w]: heappop`, then bit ops. If word remains nonzero for many bits, no heap pop until word empty. Number of heap pops <= pushes <= n but likely much less. In all-zero edges case, initial available all nodes. We need initialize: set all bits and push all words? Could instead build initial words full and heap of word indices. Then extraction no heap pushes. But building bitset maybe O(n/word). We can special-case no edges. For general, heap of nodes is simpler.

Would two-level bitset yield lexicographically smallest? Yes, extract min.

Performance comparison: Node heap: 200k pushes (each node when becomes zero) and 200k pops, each log up to 18, but heap list size up to 200k. Word heap: up to maybe 200k word pushes? Wait if nodes in same word become available one by one, word initially 0, first push. Subsequent bits set while nonzero no push. When word zero again, next bit push. So pushes <= number of words that ever become nonzero plus re-zero events. In worst-case for a word with 64 nodes, if each node becomes available, processed, then next becomes available, word transitions 64 times => 64 pushes for that word. Across n words, pushes <= n. So still up to 200k pushes, but heap size max 3125, log 12. Pops: each push eventually popped; also lazy empty pops? A word index is pushed only when word was zero; when its bits cleared to zero, it may remain in heap? Actually if we don't push when word already nonzero, there is one heap entry representing current nonzero interval. When word becomes zero, that heap entry remains; later when setting a bit and words[w]==0, we push another entry. When extracting, we pop stale entries until current nonzero. Number stale pops equals previous pushes. Total heap ops <= 2*pushes + maybe. Up to 400k heap ops on size <=3125, log 12. Node heap 400k ops size up to 200k, log 18. Word heap maybe faster but more complex and bit ops overhead. Also initial zero indegree nodes: need set bits. Could use node heap simpler.

Could optimize node heap by using `heapq.heapify` for initial, and `heappush` for new. Good.

Could use `heapq.heappop` and `heappush` C? Wait `heapq` has C accelerator `_heapq`? In CPython, `heapq` functions are implemented in C if available? Let's recall: `heapq.py` imports from `_heapq` *? In Python 3, `heapq` uses C implementations for heappush/heappop/heapify? I think `_heapq` provides C speedups, and `heapq.py` imports them: `from _heapq import *`. Yes, heappush/heappop are C. That is fast. Good. So node heap likely fast.

Could use `heapq.heappush` C, but if we bind local, calls C. Great.

Now, consider using `heapq.heappop` in while. Good.

Potential bug with `if not edges` if edges is a generator: If generator empty, `not edges` false, so process. fine. If edges is a list, good. If edges is a numpy? no.

Should we use `edges_len = len(edges)`? no.

Maybe we should not special-case empty edges because if edges is an iterable with `__len__` but not list, `not edges` may raise? No, bool uses __len__ or __bool__, generally okay. But if it's a custom iterator, bool true. Fine.

Could early return if n == 1? If edges empty, range. If edges nonempty self-loop? Need cycle. General works.

Now, let's think if there is any issue with lexicographically smallest when duplicate edges: Suppose edges [(0,2),(0,1),(1,2)]. indeg 1=1,2=2. heap [0]. pop0: process adj [2,1] in input order. For v=2: indeg 1; v=1: indeg0 push1. pop1: v=2 indeg0 push2. order [0,1,2]. Valid. If adjacency order different, doesn't matter because push only when zero. But what if v=2 becomes zero before v=1? In above, if adj [1,2], push1, then indeg2 maybe still 1 until pop1. okay. If multiple neighbors become zero during same node processing, we push them in adjacency order. Does push order affect heap? No, heap orders by value. If two neighbors become zero, both pushed; next pop min.

Could there be a case where a node becomes zero due to processing u, but there are multiple incoming edges from u (duplicates) and it becomes zero before all duplicates processed? We argued impossible if indeg counts duplicates. Let's formalize: Let k be number of incoming edges to v not yet processed at start of processing u. Among them, r are edges from u. indeg[v] = k. During processing u, we decrement for each of r edges. After t<r, indeg = k - t. Since k includes r, k - t >= r - t >0. So not zero until t=r. Good.

Now, possible integer overflow? Python no.

Now, should we include `__slots__`? no.

Let's consider if edges list is very large and we build adj, then after function returns, adj/indeg freed. okay.

Now, maybe problem wants "lexicographically smallest valid ordering" not necessarily shortest? All valid orderings length n. okay.

Could there be multiple edges with a==b and also other cycle? raise ValueError.

Now, final code likely accepted. But let's think if there is a hidden requirement: "Must handle n = 200_000 with 400_000 edges in about a second." This might be a benchmark; Python with list of lists and heap may pass. But to be safe, maybe we can write a more optimized implementation. Let's explore potential further optimizations and alternatives to ensure 1 second.

Potential bottleneck: Building 200k empty lists and appending 400k. Could use a flat adjacency with sorted edges to improve cache? But Python list of lists iteration is fast. Let's compare building flat:
```
outdeg = [0]*n
for a,b in edges: outdeg[a]+=1
start = [0]*(n+1); prefix...
adj = [0]*m
pos = start[:] 
for a,b in edges: adj[pos[a]]=b; pos[a]+=1
```
Then processing: for idx in range(start[u], start[u+1]): v=adj[idx]. This uses Python index loop, maybe slower than `for v in adj_list[u]`. Also two passes over edges. Not better.

Could use `array('I')` flat and memoryview? iteration in Python still slow.

List of lists is good.

Potential bottleneck: heap of nodes with 200k size. C heapq fast. Good.

Potential bottleneck: `indeg[v] = d` and list lookup. 400k, fine.

Could use `indeg[v] -= 1; if indeg[v] == 0:` maybe two list accesses. Our d local one get, one set. Good.

Could use `if not d:` instead of `d == 0`; maybe faster? `if d == 0` okay. `if not d` maybe slightly. Use `if d == 0:` clear.

Could bind `adj_u = adj[u]`? `for v in adj[u]:` does one lookup. Fine.

Could use `order_append` vs prealloc. Prealloc assignment maybe faster? Let's think: `order[pos] = u` involves bounds check? Append involves method call (C) and maybe resize. Prealloc likely faster. Use prealloc.

Could avoid heapify if heap already sorted? The list comprehension `[i for i,d in enumerate(indeg) if d==0]` is sorted ascending. A sorted list is a valid heap, so `heapify` is unnecessary! Is that true? Heap property: for all i, heap[i] <= heap[2i+1], heap[2i+2]. If list is sorted ascending, parent index smaller value than children (since parent index < child index, sorted => value <=). Yes. So initial heap is already a heap. We can skip `heapify(heap)`! That saves O(n) (but C heapify fast). However, is list comprehension sorted by node label? Yes enumerate in increasing i, condition. So heap is ascending. Thus a valid min-heap. We can omit heapify. But after we pop/push, heap maintained. Initial no heapify needed. This is a nice optimization. Need be certain: Python heapq assumes heap property but doesn't check. A sorted ascending list satisfies. So `heap = [i for i, d in enumerate(indeg) if d == 0]` is a heap. We can skip `heapify`. But wait, if list is sorted ascending, for 0-based heap, parent index p < child index c, so list[p] < list[c]. Good. So min at 0. `heappop` will work. Yes. Skipping heapify saves time and import. But if we later `heappush`, it expects heap property; initial okay. Good.

Could we also avoid heapify by using `heap = [i for i in range(n) if indeg[i]==0]`; same. Use `enumerate` maybe faster? Let's consider: `for i, d in enumerate(indeg): if d == 0: append`. List comprehension in C-ish? It executes Python bytecode but optimized. `range(n)` indexing maybe slower. Use enumerate.

If all indeg zero and edges empty, early return. If edges nonempty, heap maybe not all. Still sorted.

Can we skip heapify in code? Yes. But readers may expect heapify; skipping is safe but maybe less obvious. Could include comment? Code only, comments okay. But final can include comment.

If we skip heapify, need not import heapify. Just heappop, heappush.

Could initial heap be not a heap if duplicate? No, list of nodes sorted. Good.

Now, another optimization: Use `heap = [i for i, d in enumerate(indeg) if not d]`.

Now, can we avoid heap entirely for nodes with no edges? If edges not empty but many isolated nodes. They are in initial heap sorted. We pop them with heap ops. Could output them more directly? For lex order, isolated nodes should be interleaved with available nodes. Since they are initial sources, and their labels fixed. Heap handles. Could we process initial sources in order while inserting new sources? Need data structure. Heap fine.

Potential optimization: If initial heap contains all nodes except some, and heap size large, heap ops. okay.

Could use `heapq.heapify` not needed but if we use `heap = [i for i in range(n) if indeg[i] == 0]`, it's sorted. Good.

Now, let's think about using `edges` empty special case. If we skip, code with no heapify will allocate and heap ops. For m=0, n=200k, heap = list(range(n)) via comprehension (fast), while loop 200k heappops. C heappop on 200k maybe 0.1-0.2s? Maybe okay but special return faster. Include.

But `if not edges` assumes edges is a sequence. If edges is a list, good. If edges is a tuple, good. If edges is a generator, truthy even empty; no early return, but then we build adj. For empty generator, adj allocated, heap list range, while loop. Could be slower but type says list.

Could instead check `if n == 0: return []` and maybe not check edges. no.

Potential issue with `if not edges` if edges is a large list: bool checks length, O(1). good.

Now, could early detect cycle by outdegree/indegree? no.

Now, let's explore the two-level bitset alternative in more detail to see if it could be significantly faster and maybe worth implementing. Since labels bounded, we can maintain available bits in 64-bit words and a heap of word indices. But initial zero indegree nodes: we need set bits for all zero indegree. Could build words efficiently:
```
words = [0]*w
for i,d in enumerate(indeg):
  if d==0: words[i>>6] |= 1 << (i&63)
heap = [i for i,x in enumerate(words) if x]
# heap sorted? word indices ascending, sorted => valid heap. skip heapify.
```
Processing:
```
while heap:
  w = heap[0]
  x = words[w]
  # Because heap may contain stale zero words. But we only push a word when words[w]==0. There can be stale entries for old intervals. Need loop:
  while heap:
     w = heap[0]
     x = words[w]
     if x: break
     heappop(heap)
  if not heap: break
  low = x & -x
  b = low.bit_length()-1
  u = (w<<6)+b
  # clear bit
  x ^= low
  words[w] = x
  # if x == 0? no need; stale will be popped when at top. But if x==0 and there are other heap entries for same word? There can be multiple stale entries for same word? Suppose word nonzero, heap has one entry (pushed when zero->nonzero). Bits cleared to zero. Word later set again: words[w]==0 so push another entry. Now heap has two entries for same word, one stale? Actually after first interval ended, the original entry remains. When second interval starts, words[w] was zero, push new entry. Now there are two entries; the old and new have same value. If word is nonzero, both are not stale; heap contains duplicates. When extracting, pop one, process bits. If word later zero, both entries become stale. This can lead to duplicate entries and more heap ops. But still bounded by pushes. Could avoid duplicates by keeping a boolean `in_heap`? Not necessary maybe. But duplicates could increase heap size beyond words? At most pushes <= n. Heap size <= n but log maybe larger if many duplicates. But likely smaller than node heap? Could be similar.
```
Set bit:
```
w = v >> 6
mask = 1 << (v & 63)
if words[w] == 0:
   heappush(heap, w)
words[w] |= mask
```
But if there are stale duplicate entries for w and words[w]==0, we push; duplicates accumulate.

Need clear bit: `words[w] = x & ~low` maybe. `x ^ low` since low set. Good.

Min extraction cost: For each node, compute low.bit_length (C fast). Node heap heappop cost C loop ~ log n comparisons in C? Wait `_heapq` heappop is C but comparisons of Python ints. Bitset uses Python loop for stale pops plus bit ops. Which is faster? Hard to say. Node heap C heappop likely quite optimized. Bitset adds complexity and risk.

Could use a custom bucket queue: Since node labels 0..n-1, maintain `available` boolean and a heap of nodes. That's what we have.

Could use `heapq` with `heapreplace`? no.

Another algorithm: Use a min-heap but initial heap sorted. Good.

Let's consider if C `_heapq` is used. In Python 3.11, `heapq` module functions are built-in? Looking: `heapq.py` starts `from _heapq import *`? I think yes. If so, heappop/push are C. Great.

Now, potential issue: If we skip heapify, but then use `heappop` from `_heapq` on a sorted list, works. Yes.

Let's test mentally with heap [2,3,5]. heap property: 2<=3,5; 3<=5? child of 1? indices: 1 child 3, ok. heappop returns 2, replaces root with 5, sift down: compare 5 with 3 -> swap, root 3. okay.

Now, could initial zero indegree list not sorted if we build differently? We'll build sorted.

Now, code with no heapify:
```
from heapq import heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i, d in enumerate(indeg) if d == 0]
    order = [0] * n
    pos = 0
    pop = heappop
    push = heappush
    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)
    if pos != n:
        raise ValueError("cycle detected")
    return order
```

But `if not edges` for a list of edges with self-loop? no.

Potential problem: If edges is a list, but empty, return list(range(n)). If n=200k, list(range(n)) memory/time okay. If edges is an iterator, `not edges` false, okay. But if edges is a list, good.

Could `if not edges` hide a cycle in empty edges? no.

Now, if edges is not empty but all edges are duplicates of invalid? no.

Potential issue with early return if edges is a list but contains no edges? fine. If edges is a list of length 0 but n negative? list(range(-1)) -> [] okay.

Now, let's think about if there are edges but n=0: `adj = [[] for _ in range(0)]`, `indeg=[]`, for a,b in edges: adj[a] IndexError if edges nonempty. If edges empty early return [] (range(0)). okay.

Now, do we need to deduplicate edges to avoid indegree zero push multiple? No.

Now, one subtle correctness issue: The greedy min-heap algorithm with *indegree counts including duplicate edges* yields the same availability as unique edges. But if there are duplicate edges from a node u to v, and v becomes zero after processing u, it is pushed. But what if there are multiple edges from u to v and v also has an edge from a node w that is processed later? Then indegree won't become zero during u; it will become zero after w. Good.

Now, cycle detection with duplicates: If a cycle has duplicate edges, still unprocessed. Good.

Now, let's consider memory of `order = [0]*n`: If cycle, we allocated. okay.

Could use `result = []` and append to avoid prealloc if cycle? Prealloc faster. Fine.

Now, maybe Python's `heapq` C functions are not guaranteed to be available? Standard CPython yes. If pure Python, still okay. But if pure Python, 400k heap ops maybe slower. Could we implement a faster custom heap using `list` and manual sifting? Pure Python manual would be slower than heapq pure? heapq pure is optimized with local variables? Maybe. Use heapq.

Now, let's think about possible TLE due to initial heap as sorted list but no heapify. Suppose we push many nodes; heappush maintains heap. Good.

Now, could there be a case where initial heap sorted but not a *binary heap* according to Python's 0-based heap because parent index less than child but values sorted ascending; yes valid. Good.

Now, could we further optimize by not using heap when there are no cycles and graph is a chain? Heap size small. okay.

Potential issue: The function must return lexicographically smallest valid ordering. If there are multiple edges, duplicate constraints don't matter. Good.

Now, let's maybe include a docstring explaining. The final answer should be a single code block. Docstring okay. But no example usage. Fine.

Could there be a requirement to not use `list[tuple[int, int]]` because from __future__? Python 3.11 supports.

Now, let's consider if we should validate n type? no.

Now, maybe use `raise ValueError` without message to avoid unicode? no.

Now, think about hidden test: n=200_000, edges=400_000 random DAG. Our algorithm O((n+m)log n). Random DAG initial indegrees many, heap maybe moderate. Should pass.

But "about a second" maybe they expect optimized topological sort with heap? 400k edges, 200k nodes, Python 1 sec is tight but possible on modern CPU. Let's try to optimize further by reducing heap operations when many nodes become available at once.

Can we batch pushes using `heapq.heappush` vs `heap.extend` + `heapify`? Suppose processing a node with many outgoing edges, many new zero nodes. We could collect `new = []` in adjacency loop, then if new: if len(new) > len(heap) * something: `heap.extend(new); heapq.heapify(heap)` else `for v in new: push(heap,v)`. But heapify entire heap each time could be expensive. However, if a single node has 400k outgoing edges, new size 400k, heap size maybe 1. Pushing 400k individually O(n log n) with log increasing to 19. Heapify 400k O(n) would be much faster. But can a node have 400k outgoing edges to 400k distinct nodes? n=200k, m=400k, max distinct outgoing 199999. If node 0 has edges to all other 199999 nodes, initial heap [0] maybe plus some? Processing 0: 199999 new zero nodes. Individual pushes: 200k log 200k ~ 3.6M C operations; heapify 200k ~ 200k C operations? Much faster. Could such worst-case appear. We can improve with batch strategy safely?

Idea: In processing a node, collect newly zero nodes in a list `new`. After loop, if `new`: choose to merge into heap efficiently. Options:
1. `for v in new: push(heap, v)`.
2. `heap.extend(new); heapq.heapify(heap)`.
Heapify entire heap O(H+K). If done once with large K, good. If done repeatedly with small K, bad if H large (O(H) each). Need threshold. We can use if `K > len(heap)` maybe heapify; else individual pushes. But even if K > H, heapify O(H+K) vs pushes O(K log(H+K)). For H small, K large, heapify better. For H large, K slightly larger, heapify maybe better? Suppose H=100k, K=100k. Pushes ~100k*18=1.8M; heapify 200k linear ~200k, better. Heapify likely better when K is not tiny. But if K=1 and H=100k, push ~18 vs heapify 100k, push. So threshold like if K * log2(H+K) > H+K. Hard.

But heapify is C and linear, very fast. Individual push C but log. We can adopt: after collecting `new`, if `len(new) > 1` maybe? Let's evaluate. If K=2, H=100k: pushes 2*18=36 operations, heapify 100k, push better. If K=100, H=100k: pushes 1800, heapify 100k, push better. If K=1000, pushes 18k, heapify 101k, push maybe better. If K=10000, pushes 180k, heapify 110k, heapify better. Threshold around K > H/log(H) ~ 100k/17=5880. But constants: C heapify linear maybe very fast, push per log C loop. Maybe threshold K > H//10? Not critical.

However, collecting `new` list for every node adds overhead. We can only collect if we want. For most nodes outdegree small. If we always create `new=[]` per processed node, 200k list allocations, bad. Could collect conditionally? We don't know how many new until loop. We can push individually as we go, but then can't batch. Or we can have a reusable list `new = []`, append new nodes, clear after. But if we push individually for small, no list? We can always append to `new` (reuse) for all new nodes, then decide. Appending to a Python list 200k total, okay. But we also need to clear. If we use a single list `new = []`, for each processed node: `new.clear()`? But if we use it in loop and then maybe heapify/extend, need be careful. Could do:
```
new = []
while heap:
  u=pop(heap)
  ...
  new.clear()
  for v in adj[u]:
    d=...
    if d==0: new.append(v)
  if new:
     if len(new) > threshold: heap.extend(new); heapify(heap)
     else: for v in new: push(heap,v)
```
But `new.clear()` each iteration (200k) and append for each new node total 200k. The `new` list remains allocated; after a large batch, `new` may retain large capacity, memory maybe up to max batch (200k) ~1.6MB, okay. But `new.clear()` O(1) (decref items). It may not release capacity. Good. This adds an extra append to `new` for each newly zero node, plus either push loop or extend. For individual push path, we add overhead of `new.append` and then iterate `new` to push, compared to pushing directly. That overhead could slow typical cases. We can instead push directly unless outdegree large? We can know outdegree = len(adj[u]). If outdegree is large, collect; else push direct. But a node with large outdegree may have few new zero nodes. Could still okay.

Maybe simpler: Always push direct. 400k pushes? Actually each node pushed once, 200k. Not 400k. 200k heappush, 200k heappop. 200k pushes direct is okay. Batch optimization may be overkill.

But worst-case star: 199999 pushes in one adjacency. Direct pushes 200k log ~ maybe 0.1-0.2s? C heappush 200k into growing heap. Could be ~0.1? Maybe okay. Heapify could save but not necessary.

Let's estimate C heapq performance: heappush 200k random ints into heap maybe 0.05-0.1s? Actually Python C function still does Python int comparisons. Could be 0.1. Total maybe <1s.

But to be safe, maybe implement batch with threshold without too much overhead? Let's design efficient batch that only collects when `len(adj[u])` is large (e.g., > 64). For small adjacency, push direct. For large, collect new nodes in a list and decide. This avoids per-node new list for small. But a star with outdegree 200k uses batch. A node with outdegree 400k duplicates to same neighbor: large, collect one new node (at end) maybe batch not needed but okay.

Pseudo:
```
pop = heappop; push = heappush; hpush = push; hextend=heap.extend; hheapify=heapify
BATCH_THRESHOLD = 64? 
while heap:
  u=pop(heap)
  order[pos]=u; pos+=1
  outs = adj[u]
  if len(outs) > 64:
      new = []
      for v in outs:
          d=indeg[v]-1; indeg[v]=d
          if d==0: new.append(v)
      if new:
          # If many new, heapify; else push direct
          if len(new) > len(heap) // 8? maybe
              heap.extend(new); heapify(heap)
          else:
              for v in new: push(heap,v)
  else:
      for v in outs:
          d=...; if d==0: push(heap,v)
```
But `len(outs)` for each processed node O(1). Branch. For large, `new=[]` allocation per large node. Number of large nodes limited by m/65 ~ 6153. okay.

Threshold for heapify: We can use `if len(new) > len(heap) + 1?` Let's derive. heapify O(H+K) C linear. push K times O(K log(H+K)) C. For H=0, K=1: push 1 (log1?) heappush on empty just sets. heapify 1. Similar. For K=2, H=0: push 2 (second log2), heapify 2 linear; heapify maybe faster. But small. We could just always heapify when using batch? If large node has outdegree >64 but new size could be 1. heapify on heap maybe H large, bad. Example: H=100k, node outdegree 1000 duplicates to already? new=1; heapify 100k bad. So need threshold based on new size and H.

Maybe `if len(new) * 8 > len(heap) + len(new): heapify else push`? For H=100k, K=1: 8>100001 false. K=10000: 80000>110000 false, push maybe 180k vs heapify110k; threshold too low. `if K > H // 4` maybe: H=100k, K=25k -> heapify. Push 450k, heapify125k. Good. For H=0, K=1 -> 1 > 0 true heapify. okay. For H=1000, K=300 -> heapify? 300 >250 true. Push ~300*10=3000, heapify1300, okay. For H=1000, K=100 -> push ~1000, heapify1100, similar. Good. Use `if len(new) * 4 > len(heap): heapify else push`. But if H=0, true. Could be okay. However, heapify after `heap.extend(new)` will include unsorted `new` and existing heap. `heapq.heapify` O(total). Good.

But adding this complexity may introduce bugs. Simpler is better for interview? The problem emphasizes performance; a straightforward min-heap likely accepted. But "about a second" may require some optimization. Let's think if straightforward passes in Python 3.11 on 200k/400k. I believe yes. Let's approximate more concretely: CPython 3.11, C heappop/heappush. 200k heappops from 200k heap: maybe 0.12s? 200k heappush: maybe 0.15s. Building adjacency 400k: 0.05s. List allocations 0.02. Total <0.5s. If pure Python heapq, maybe 2s. But CPython has C. On online judges, CPython `_heapq` available. Good.

Could there be no C accelerator in some environments? Usually yes. But if not, maybe TLE. We can't guarantee. Could implement using `heapq` (which uses C if available). Fine.

Now, maybe using `list` of lists and heap is the expected solution. Let's not overcomplicate.

But we can include the safe initial sorted heap no heapify and empty edges special case. That's enough.

Let's consider if `if not edges` can be wrong if edges is a list of tuples but empty? no. If edges is a generator, no early return, but okay. If edges is a list but contains `()`? no.

Could there be a case with no cycles but `pos != n` due to a node with indegree from a cycle? All nodes in cycle or downstream of cycle? If a node depends on cycle, it also never zero. pos<n. Raise. Good.

Now, maybe they expect ValueError for any cycle, not just if cannot output all. Good.

Now, let's test some small cases manually with code logic:
1. n=3 edges=[(2,1),(1,0)] indeg [1,1,0], adj[2]=[1], adj[1]=[0]. heap=[2]. pop2: d indeg1=0 push1. heap [1]. pop1: indeg0=0 push0. heap [0]. pop0. order [2,1,0]. Valid lex? Only source 2 initially. yes.
2. n=4 edges=[(0,3),(1,2)] indeg [0,0,1,1], heap [0,1]. pop0 push3 => heap [1,3]. pop1 push2 => heap [2,3]. pop2, pop3 => [0,1,2,3]. Valid? Initial sources 0,1 choose 0; sources 1,3 choose1; sources2,3 choose2; then3. yes.
3. n=4 edges=[(3,1),(2,0)] indeg [1,1,0,0], heap [2,3]. pop2 push0 => heap [0,3]. pop0 => heap [3]. pop3 push1 => heap [1]. pop1 => [2,0,3,1]. Valid lex? initial sources {2,3}, choose2; sources {0,3}, choose0; then3; then1. yes.

Now, if graph has cycle plus acyclic parts: n=4 edges [(0,1),(1,0),(2,3)] indeg [1,1,0,1], heap [2]. pop2 push3? indeg3 becomes0 push3. pop3. pos2<4 raise. Good.

Now, possible issue: In cycle detection, if there is a cycle but all nodes in cycle have indegree zero due to duplicate edge cancellation? No indegrees only positive, no cancellation. Good.

Now, let's think about if edge list contains multiple edges and a self-loop. For self-loop, node not processed. Good.

Now, final code with import. Need maybe avoid `if not edges` for type hint list but if edges is a large list, bool check okay. If edges is a list and empty, return list(range(n)). But if edges is a list of zero-length? no.

Could use `if n == 0: return []` before edges? If edges empty, return [] anyway. If edges nonempty, should error? Not specified. If n=0 and edges empty, `if not edges` returns []. Good.

Now, one subtle performance issue: `adj = [[] for _ in range(n)]` for n=200k and edges small but nonempty. If edges small, we still allocate many lists. Could use dictionary of lists for sparse to reduce allocation, but then processing needs `for v in adj.get(u, ())`. That might be slower. For n=200k, allocation okay. But if n=200k and m=1, early not edges false, allocate 200k lists ~0.02s. okay.

Could use `adj = [None] * n` and on append create list:
```
if adj[a] is None: adj[a]=[b]
else: adj[a].append(b)
```
Processing: `outs = adj[u]; if outs: for v in outs`. This saves empty list allocations but adds branch in build and process. For m=400k, many nodes have outgoing, maybe most lists created. Branch overhead 400k. Prealloc likely faster. Memory okay. Keep prealloc.

Now, maybe we can use `indeg = [0] * n`; when incrementing, zeros are shared small int 0, but after increment creates new int. okay.

Now, let's consider if we should delete `adj` or `indeg` before returning? Not needed.

Now, final answer should not include analysis. Just code block.

But before final, let's think if there is any alternative interpretation: "An edge (a, b) means a must come before b." Return lexicographically smallest valid ordering. This is standard. Duplicate edges may appear. If cycle raise. Performance.

Could there be a requirement to handle n=200_000 with 400_000 edges in about a second *including Python startup*? They likely mean function runtime. Our code okay.

Now, let's think about using `sys.setrecursionlimit` no.

Now, maybe there is a hidden issue with `if not edges`: If edges is a list, fine. But if edges is an iterator, and it's empty, we won't return early and will allocate. If it's a generator, bool(generator) is True, so `not edges` false. Good. But if edges is a custom iterable with `__len__` returning 0, bool false, we return early without consuming; okay. If it has `__bool__` false but not empty? unlikely. Type list.

Now, should we use `edges` length to preallocate adjacency? no.

Now, let's maybe include comments to explain sorted initial heap no heapify. But final code can be concise. Comments do not hurt.

Potential issue: Skipping `heapify` is subtle; if future maintainer modifies list comprehension order, could break. But we control. Could include `# The list is already sorted, hence a valid heap.` comment.

Now, let's consider if Python's `heapq.heappop` on a list that is sorted ascending but not necessarily a heap after many pushes/pops? We only start sorted and maintain with heapq. Good.

Now, let's think about possible use of `heapq.heapreplace` to combine pop and push? In loop, after processing u, we might push many. Not.

Now, maybe we can speed up by using `order_append` instead of prealloc? Let's micro-benchmark mentally: Prealloc assignment `order[pos] = u` uses STORE_SUBSCR, which is somewhat expensive; append is a C method call, also expensive. Which faster? `list.append` is a method call (C) but vectorcall optimized; `STORE_SUBSCR` does bounds and set. I think append might be faster. But prealloc avoids list resize. For 200k, difference negligible. Prealloc also gives final pos. Could use `append = order.append` and `if len(order) != n`. That is simpler. But prealloc ensures no dynamic resize and maybe faster? Let's check: In Python, `append` is usually very fast, but method lookup if bound local. `append(u)` calls C function, handles list append. `order[pos]=u` does Python bytecode STORE_SUBSCR, which includes list store. I suspect append is faster. But prealloc list of zeros already allocated; append will grow from 0 to n, may reallocate a few times (amortized). 200k reallocations log2 ~18, negligible. Use append for simplicity? But we need cycle check: `if len(order) != n`. `len` O(1). Could be okay. Which is more performant? Let's think of typical Python topological sort: `order.append(u)` is common. Prealloc may be slightly faster because no method call? Actually `append` C call with vectorcall might be similar. `STORE_SUBSCR` maybe slower due to type checks. I can approximate: `list.append` in Python is optimized but still a function call; `lst.append = ...; append(u)` is a C call. `lst[pos]=u` is a bytecode that calls C list_ass_subscr. Both C. Hard.

Prealloc also requires `pos` increment. Append maintains length. Use append? For cycle, if cycle, order partial. Fine. For no edges early return, not used. I'd lean append for clarity. But prealloc can be faster for large n? Let's maybe use append with bound method:
```
order = []
append = order.append
while heap:
  u=pop(heap)
  append(u)
  ...
if len(order) != n: raise
```
`len(order)` each? only once. This avoids `pos` local. Method call vs store. I think append is fine. But prealloc avoids storing zeros initially? It allocates and fills zeros. Append allocates dynamically. For 200k, prealloc [0]*n is fast C. Then assignment. Either.

Maybe prealloc assignment is faster because no function call. Let's use prealloc to be safe for performance. It also returns a list of exactly n if no cycle. In cycle, returns? We raise, list discarded.

Now, could prealloc [0]*n for n=200k cost 0.001s. okay.

Now, let's consider if `pos` local variable updated 200k times; append also updates length internally. Similar.

Now, maybe use `order = [0] * n` and at end `return order[:pos]`? No, if no cycle pos=n. If cycle raise. Good.

Now, one optimization: If after building, len(heap) == 0 and n != 0, immediate raise? This can detect all-indegree cycle (including self-loops) before order allocation? But order allocation cheap. Could do:
```
if not heap:
    raise ValueError
```
But if n=0, heap empty and no cycle. So `if n and not heap: raise`. This avoids order allocation and loop for obvious cycle. But if n>0 and no initial sources, definitely cycle. Could include. However, if there is a cycle but some initial sources, need process. This early check maybe helpful for self-loop only n=1: heap empty raise. But final check does. It avoids order [0] and while. negligible.

Could include `if not heap and n: raise ValueError`? But if n>0 and all indegrees >0, cycle. Yes. But what if there are invalid edges? no. It might raise before considering nodes? correct. But if there is a self-loop and other incoming? all indeg >0, cycle. Good.

But careful: A DAG with n>0 always has at least one source (zero indegree). So if heap empty, cycle. Good.

Could also early check if pos reaches n? no.

Now, if we early return empty edges, we don't check for negative n? okay.

Now, let's think about if there are nodes with negative labels? no.

Now, code with early heap empty:
```
    heap = [i for i, d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError("graph contains a cycle")
    order = [0] * n
    pos = 0
    ...
```
If n=0, heap empty, skip raise, order [], pos0, while skip, pos==n return. Good. But if edges empty and n=0, early return. okay.

Does early raise on no initial sources ever false positive with self-loop? Self-loop is cycle, correct.

Now, maybe if n>0 and heap empty due to all indegrees positive but there is no cycle? In a finite directed graph, if every node indegree >0, there is a cycle (following incoming edges backwards must repeat). Yes.

Now, could use this to avoid processing cycle with no sources. Good.

Now, let's think about if we should deduplicate edges to reduce indegree and adjacency for performance. Suppose 400k edges all duplicates of same edge. Our algorithm builds adjacency list of 400k, indeg 400k, then process 400k decrements. Dedup would reduce to 1, much faster. But dedup using a set of edges would cost 400k inserts, maybe similar. Could we dedup more cheaply per source? For each source, use set of neighbors? That would reduce duplicate processing but memory/time for sets. m=400k, set overhead large. Not necessary. But if benchmark includes many duplicates, our 400k loop still fine. 400k iterations is small.

Now, maybe there is a hidden worst-case: n=200_000, m=400_000, all edges are duplicates of 200_000 edges? Still 400k loop. fine.

Now, let's consider using `array` for adjacency to reduce memory but slower. no.

Now, potential bug with `if not edges` if edges is a list and we return `list(range(n))`, but what if there are self-loop edges? not empty. okay.

Now, let's maybe write final code with imports and function. Ensure no trailing spaces? fine.

But before final, let's consider if lexicographically smallest ordering can be found by sorting sources initially and using heap. Yes.

Now, let's think about proof if needed? Final only code, no explanation. But code comments okay.

Now, maybe the user expects just the function, not import? "Write `topo_order(...)`" Standard library import allowed. Include import.

Now, let's consider if using `list[tuple[int, int]]` in runtime type hint requires `from __future__` for Python <3.9, but 3.11 okay.

Now, possible issue: The type hint `edges: list[tuple[int, int]]` will be evaluated at function definition; `list` and `tuple` builtins support. okay.

Now, let's think about if we should use `__name__ == '__main__'`? no.

Now, final code:
```
from heapq import heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError("graph contains a cycle")

    order = [0] * n
    pos = 0
    pop = heappop
    push = heappush

    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")
    return order
```

Is `if not edges` safe if edges is a list of 0 length but n huge; returns list(range(n)). Good.

But if edges is a list and not empty, but n=0? adj=[], indeg=[], for a,b in edges: adj[a] IndexError. If input invalid, okay. Could guard `if n == 0: return []` before edges? But if n=0 and edges nonempty, maybe should raise ValueError? Spec nodes 0..n-1, edges likely valid. If we add `if n == 0: return []`, it would ignore invalid edges. Better not. But if n=0 and edges empty, early return. If n=0 and edges nonempty, IndexError. Not required.

Could add validation for edge endpoints? That would add overhead and not required.

Now, consider if `edges` is a tuple of tuples, `if not edges` works. If `edges` is a generator, `if not edges` false. But then `for a,b in edges` consumes. Good. However, if generator empty, we allocate adj and heap and process. But type list.

Now, one subtle issue: `if not edges` for a list of edges is okay, but if edges is a *list* with a custom `__bool__`? no.

Now, should we use `if len(edges) == 0` instead? That would require len, and for generator no len. `not edges` fine.

Now, maybe there is a case where edges is an empty list but n is huge, returning list(range(n)) is lex smallest. Good.

Now, let's think if initial heap sorted property holds when `heap` is a list comprehension over enumerate. Yes.

Could we skip `if n and not heap` because while and final check enough? It's okay. But if n>0 and heap empty, order allocated and pos0, final raise. Early raise maybe clearer. Include? It adds a branch. Fine.

Now, what if n=0 and heap empty but edges nonempty? `if n and not heap` false, while skip, pos0==n return [] ignoring edges? But if edges nonempty and n=0, we would have errored in build due to adj[a] before. So no.

Now, potential performance issue: The early `if not edges` means for empty edges we don't import? import already. okay.

Now, let's consider using `sys.stdin`? no.

Now, maybe problem wants "No tests, no example usage, no input(), no printing." Our code has no prints. Good.

Now, let's think if we need to include `# type: ignore`? no.

Now, potential hidden test: `topo_order(3, [(0,1),(0,1)])` should return [0,1,2]. Our indeg[1]=2, adj[0]=[1,1]. heap [0,2]? indeg [0,2,0], heap [0,2]. pop0: first d=1, second d=0 push1. heap [1,2]. pop1, pop2 => [0,1,2]. Good.

`topo_order(3, [(2,1),(2,0),(0,1)])`: indeg [1,2,0], heap [2]. pop2: v=1 d1; v=0 d0 push0. heap [0]. pop0: v=1 d0 push1. heap [1]. [2,0,1]. Valid? Edge 2->0,2->1,0->1. Sources {2}; then {0}; then {1}. yes.

Now, cycle with source: n=3 edges [(0,1),(1,2),(2,1)] indeg [0,2,1], heap [0]. pop0 -> indeg1=1. heap empty, pos1<3 raise. Good.

Now, let's think about if there are edges from a node to itself and also it is source? impossible because self-loop gives indegree. Good.

Now, could duplicate edges cause indegree to become zero and push node, then later in same adjacency another edge to same node due to duplicate from same node but indegree counted? impossible. Good.

Now, maybe there is a more subtle lexicographic issue: Choosing smallest source greedily yields lexicographically smallest *topological order* but only if we consider all topological orders. Yes. Formal exchange: At any step, the first element must be a source in remaining graph. If our choice x is smallest source, any other valid order has first y > x (since x must be somewhere, but can't be after y if x source? Wait if x is source, can an order start with y > x and place x later? Yes, x can be later. To be lex smaller, we should start with x. After removing x, the remainder must be a topological order of remaining graph; greedy recursively gives lex smallest. Good.

Now, let's consider if there are multiple edges and a node becomes available but is not the smallest; heap ensures.

Now, possible memory optimization: After processing u, we could set `adj[u] = None` to free inner list? Not necessary, but could reduce memory during function? The list remains referenced. For large adjacency, freeing as we go might help memory but adds assignment. Not needed.

Now, if we want to be extra performant, we can avoid storing outgoing edges for nodes with no outgoing? Prealloc does.

Now, let's think about if the judge uses PyPy. PyPy's heapq maybe pure Python? PyPy has built-in? It may be optimized. List of lists okay. `if not edges` okay. PyPy performance maybe different; heap ops could be slower but 200k okay. PyPy int list memory? okay.

Now, maybe we can implement a faster topological lex order using `heapq` but with `heapq.heappush` local. Good.

Now, let's revisit batch heapify optimization. Is it worth adding? It complicates and may introduce threshold bugs. The problem says about a second; straightforward likely enough. But to maximize chance, we can add a *simple* optimization: when a node has many newly available nodes, use `heapq.heapify`. However, need import heapify. Could be safe with threshold. Let's evaluate if it can only help or could hurt. If we always push direct, correct. If batch with threshold, correct if we merge all new nodes. Need ensure no duplicate pushes? New nodes collected and either extended+heapify or pushed. Existing heap unchanged. Good.

Implementation with per-node new list only for large outdegree:
```
from heapq import heappop, heappush, heapify
...
BATCH = 128
while heap:
    u = pop(heap)
    order[pos]=u; pos+=1
    outs = adj[u]
    if len(outs) > BATCH:
        new = []
        for v in outs:
            d = indeg[v]-1; indeg[v]=d
            if d == 0: new.append(v)
        if new:
            # if len(new) * 8 > len(heap) + len(new)? maybe
            if len(new) * 8 > len(heap):
                heap.extend(new)
                heapify(heap)
            else:
                for v in new: push(heap, v)
    else:
        for v in outs: ... push direct
```
But note: `heap` length changes if we heapify/extend; okay. For small, direct.

Potential issue: `new` list allocated for every node with outdegree >128. In a graph with many nodes outdegree 200 (m=400k, n=200k average 2, so at most 2000 such nodes). Fine. If outdegree threshold 64, at most 6250. fine.

Threshold for heapify: We need use current `len(heap)` before adding new. If `len(new) * 8 > len(heap)` maybe. For H=0, K=1 => 8>0 heapify. For H=100000, K=1 => 8>100000 false. K=13000 => 104000>100000 true. Push cost ~13000*18=234k, heapify 113k. Good. For H=100000, K=1000 =>8000>100000 false, push 18k vs heapify101k. good. Constants maybe. Could use factor 16 to heapify less. Factor 8 okay. But `heapify` C linear maybe much faster than push per log, so factor could be larger? If heapify 100k costs maybe similar to 200k comparisons? Push 13k*18=234k comparisons. heapify 113k comparisons? It uses sift down linear. Factor 8 reasonable.

But adding `len(outs)` and branch for every node. `len` O(1). For most small, direct. Overhead small. Could improve star case. But is star case a realistic worst-case for direct pushes? Direct pushes 200k heappush; C heappush 200k maybe okay. Batch may save time but code longer. The user wants complete solution, not necessarily ultra optimized. But performance requirement may value.

Could we do an even simpler batch: Collect all newly zero nodes across the entire while? No, because after each pop we need next min; but we could process one node at a time. Batch per node okay.

But if we collect `new` and use `heapify`, we need to import heapify. Initial heap sorted no heapify. Good.

Potential bug: If `heap` is sorted and we do `heap.extend(new); heapify(heap)`, fine. If `new` contains nodes that are already in heap? A node becomes zero once, so not already in heap. Good.

Potential bug with duplicate edges: new list will include v only once because only when d==0 after last incoming. Good.

Potential bug with `len(outs) > BATCH` but many outgoing edges to already processed? Not possible, edges from u to v where v may have been processed earlier? In a DAG, can there be edge u->v where v processed earlier? If v processed earlier, then u must have been before v due to edge, contradiction. In a cycle, u might not process. So all outgoing neighbors not processed yet (unless cycle? if edge to processed node would imply cycle and u not processed? In a graph with cycle, some processed nodes in acyclic part; could there be edge from a later processed node to an earlier processed node? That would be a cycle? Example edges 0->1, 2->1, no. If v processed earlier, all its prerequisites processed. If u has edge to v, u is a prerequisite of v, so u must have been processed before v. Contradiction. So no. In cycle, some nodes unprocessed. fine.

Now, would batch direct path with `new` list and threshold ever be slower than direct push for large outdegree but small new? Example H=100k, node outdegree 1000 duplicates to one node already indegree high? new maybe 0 or 1. We allocate new, append maybe 0/1, then if new and K*8 > H false, iterate new push. Overhead: len check, new list alloc, append, len(new), compare, loop. Direct push would just one push. But such large outdegree nodes limited. Overhead maybe okay.

Could set BATCH higher, e.g., 1024, to only batch very large stars. 400k edges / 1024 = 390 nodes. Star 200k outdegree triggers. Good. For outdegree 1000, direct. Use BATCH = 128 or 256. Simpler maybe not batch at all.

Given the instruction "expert Python developer" and performance, a clean efficient solution is expected. Overcomplicating may be seen as unnecessary. But final code can be straightforward with two micro-opts (empty edges, no heapify). I think that's enough.

Let's think about if no heapify is acceptable to a reader. It is correct. But if they expect `heapify`, skipping might be surprising. We can include `heapify` to be safe; O(n) C linear is small. But performance about 1 sec; skipping heapify saves maybe 0.005s. Not critical. Including heapify makes code conventional and less risky if list not sorted? But we know sorted. However, if we later use batch `heap.extend(new); heapify`, need heapify. If no batch, no heapify. Could include `heapify` for clarity. The initial sorted heap property is a minor optimization but maybe not necessary. Which is better for final answer? A conventional solution with `heapify` is immediately recognizable. The performance difference is tiny (heapify 200k C ~ maybe 0.01s). The "about a second" not that tight. Use heapify for clarity? But we can also skip and comment. The final answer code only, comments can explain. I'd maybe keep `heapify` to avoid any doubt about heap invariant. But the sorted list is a valid heap; no doubt for experts. Yet if `heap` is empty, heapify fine.

If we import `heapify`, code:
```
from heapq import heapify, heappop, heappush
...
heapify(heap)
```
This is standard. The performance cost is minimal. For n=200k, C heapify linear ~ maybe 0.005-0.01s. Fine. Use conventional.

But if we have `if not edges` early, heapify not called for m=0. For m>0, n=200k, heap size maybe up to n. Cost okay.

Now, let's consider if using `heapify` on sorted list is wasted but safe. I'd include for readability. The prompt asks expert, performance. We can skip with comment. Hmm.

Maybe final code with no heapify and comment is elegant:
```
    # The zero-indegree nodes are in increasing order, so the list is already a heap.
    heap = [i for i, d in enumerate(indeg) if d == 0]
```
No import heapify. This reduces import and call. I think it's safe. But if a reviewer runs a test where `heap` list is not sorted? It's constructed sorted. Good.

Let's decide: Use no heapify for micro performance and mention comment. The final code is still correct. The user likely won't care. But "about a second" maybe every bit. Use no heapify.

Now, let's think about if `heapq.heappop` requires the list to be a heap in its specific sense. Sorted ascending is a heap. Yes.

Now, could there be a case where initial heap list is sorted ascending but contains duplicates? Nodes unique, no.

Now, maybe use `heap = [i for i in range(n) if indeg[i] == 0]`; indexing maybe slower than enumerate. Use enumerate.

Now, let's consider if `indeg` values can be negative due to duplicate processing? No.

Now, final code can include a docstring:
```
def topo_order(...):
    """Return lexicographically smallest topological order."""
```
No printing. Fine. But maybe they want just function. Docstring okay.

Now, let's think about if there is a possibility of recursion? no.

Now, maybe we should use `raise ValueError("...")` with message. Good.

Now, let's consider if the environment uses `python -OO`, docstring removed, no matter.

Now, let's maybe include type hints for local? no.

Now, one more performance idea: Use `for a, b in edges:` but if edges is a list of tuples, unpacking each. Could use `for e in edges: a=e[0]; b=e[1]` maybe slower. Unpacking is good.

Now, could use `adj_a = adj[a]; adj_a.append(b)` to avoid attribute lookup? It still does. Maybe:
```
for a, b in edges:
    adj[a].append(b)
    indeg[b] += 1
```
Fine.

Now, perhaps we can build indegree first, then adjacency, to improve cache? Need both. Could do two passes over edges: first indeg, then adjacency. That doubles edge iteration (800k) but allows `adj = [None]*n`? Not better. One pass good.

Now, let's think about if duplicate edges can be ignored for indegree by using `indeg[b] += 1` per duplicate. correct.

Now, potential hidden test with n=200_000, edges=400_000 all random but cycle. Our algorithm processes until stuck, maybe processes many nodes. If cycle at end, processes 199999 nodes, then raise. okay.

Now, maybe they want to raise ValueError *as soon as cycle detected*? Not necessarily. Our detection at end or early no source. Good.

Could we detect cycle earlier during Kahn when heap empty before pos==n: we currently let while end then check. If heap empty, while ends. Same.

Now, let's consider if we can free adjacency of processed nodes to reduce memory peak? The peak is after building. Processing doesn't increase much. no.

Now, final answer. But before final, let's maybe run through a mental performance benchmark: n=200k, m=400k star from 0 to all others plus duplicate? edges length 400k maybe 0->i for i 1..200k (duplicates). indeg: 0 zero, others maybe 2. heap [0]. pop0, loop 400k, indeg becomes zero for each node after last duplicate? If duplicates arbitrary order: For each node with 2 duplicates, d from 2 to1 to0 push at second. There will be 199999 pushes in one loop. Direct heappush 199999 into heap. Then pop 199999. Total 400k heap ops. If using batch heapify, could reduce pushes to heapify 200k + pops 200k. But pops still 200k log? Wait after heapify, heap size 200k, popping 200k O(n log n). Can't avoid. Direct pushes O(n log n) plus pops O(n log n) => 2n log n. Batch heapify reduces to n log n pops + n heapify. Could halve time. In star case, direct maybe 200k pushes + 200k pops. 400k heap ops. Batch 200k pops + heapify 200k. Since heapify linear C, faster. If time limit 1s, star case might be close. Maybe batch optimization is worthwhile.

Can we avoid pop O(n log n) in star case? After processing 0, available nodes are all remaining. Lex smallest is just sorted order. If we could detect that heap contains all remaining nodes? Not generally. But in star, after heapify, we could output sorted remaining if no more edges? But we don't know. Could if adj all empty for remaining? Not worth.

Batch optimization could improve worst-case pushes. Let's consider implementing a safe batch with minimal overhead. It may make solution more performant for high fan-out. But adds complexity. The prompt's performance spec may include such cases. Let's design a clean batch approach that doesn't hurt typical too much.

Alternative: Instead of pushing each new node individually, we can collect all new nodes for the current u in a list `new` *always*, but avoid extra overhead by using a preallocated list? Hmm.

We can use a single `new` list and direct push for small outdegree? To collect, we need branch. Maybe threshold on `len(adj[u])`.

Let's set `FANOUT_THRESHOLD = 128` or `256`. For outdegree > threshold, collect. For star, collect. For typical average 2, direct.

Within large outdegree, choose merge method. We can use a rule: if `len(new) > len(heap)` then `heap.extend(new); heapify(heap)` else push each. But as discussed, heapify can be better even if new < heap by factor. But simple rule `if len(new) > len(heap)` is easy. In star: H initially maybe 1? After pop0, H=0? Actually initial heap [0] (if only 0 source). After pop, H=0, K=199999, K>H, heapify. Good. If H=100k, K=90k, K>H? false (90k<100k), but heapify likely better. Use `if len(new) * 8 > len(heap)` to capture. But if H=0, true. Let's use `if len(new) * 4 > len(heap): heapify else push`. Factor 4 conservative. For H=100k, K=25k -> heapify. Good. For H=100k, K=10k -> push (180k comparisons vs heapify110k; maybe heapify better but okay). Factor 8 maybe better. Let's use 8? If factor too high, heapify when H=100k, K=13k; likely okay. If H=1000, K=130; heapify 1130 vs push 130*10=1300; similar. Fine. Use 8.

But note `len(heap)` changes if we push directly? In branch we decide before. Good.

Implementation details:
```
from heapq import heappop, heappush, heapify
...
BATCH_THRESHOLD = 128
while heap:
    u = pop(heap)
    order[pos] = u; pos += 1
    outs = adj[u]
    if len(outs) > BATCH_THRESHOLD:
        new = []
        append_new = new.append
        for v in outs:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                append_new(v)
        if new:
            if len(new) * 8 > len(heap):
                heap.extend(new)
                heapify(heap)
            else:
                for v in new:
                    push(heap, v)
    else:
        for v in outs:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)
```
This allocates `new` for large outdegree. `append_new` local. Good.

But there is a subtle issue: If we use `heap.extend(new); heapify(heap)`, and `new` is a list that will be reused? We don't reuse in this version; it's local per large node. It can be garbage. If large node count up to 6250, allocations okay. For star, new size 200k, memory extra 1.6MB, okay. But after heapify, `new` still holds references until next iteration; can `new` be cleared? It goes out of scope at next loop? Actually `new` variable reassigned next large node, previous list freed. okay.

Could use `heap.extend(new)` then `heapify(heap)`. `heap` now contains existing heap plus new unsorted. heapify correct.

Potential issue: The initial heap is not heapified if we skip; but if we use heapify in batch, we can also skip initial heapify. The heap before batch is valid. After batch heapify, valid. Good.

Now, does batch change lex order? It only inserts all nodes that became zero during processing u. Their relative order doesn't matter because heap will order by value. If we heapify, same set. Good.

Now, overhead for large outdegree: We collect `new` and maybe heapify. For a node with outdegree 129 but only one new, H large, new*8 > H false, then loop push one. Overhead: new list, one append, branch, loop. Slight. But number such nodes limited. Could set threshold 512 to reduce overhead. Star 200k triggers. Use 512. m=400k, at most 781 large nodes. Good. If fan-out 1000 and H large, collect. Fine. Use 256 or 512. Let's choose 128? Not critical. Simpler maybe no batch. Hmm.

Adding batch may be seen as over-engineered but still clear. The final answer length longer. The prompt says write code, no tests. It's okay.

But is there any risk that `heapify` after `heap.extend(new)` is *slower* than direct pushes for cases where threshold triggers but K not huge? We can choose threshold factor to minimize. If K*8 > H, heapify. For H small, K maybe small. Example H=0, K=1 -> heapify list of 1 (fast). H=10, K=2 -> 16>10 heapify 12 vs push 2*4=8; similar. H=100, K=13 ->104>100 heapify113 vs push13*7=91; similar. Factor 8 okay. Could use 16 to be conservative: H=100, K=7 ->112>100 heapify107 vs push49; maybe push better. Use 16? Star H=0 K=200k true. H=100k K=62.5k true. Push 1.1M vs heapify162k; good. Factor 16 reduces heapify when K just over H/16. For H=100k, K=6k, push ~108k, heapify106k similar. Factor 16 maybe safe. Use 16. But if heapify linear C much faster than push, factor 16 still okay. Let's use 16? Simpler rule: `if len(new) > len(heap): heapify else push` is simplest and safe. Star works. If H=100k, K=90k, push 1.6M vs heapify190k, push slower but still maybe okay? 1.6M C comparisons maybe 0.1s? Could be. Factor 16 improves. Let's use `if len(new) * 16 > len(heap):` for a balance.

But adding this means we import heapify. Initial heap sorted no heapify. If we don't heapify initially, and first large node batch uses heapify, fine. If no batch, no heapify. Good.

Would the batch code with `len(outs) > BATCH_THRESHOLD` miss a node with small outdegree but many new nodes? Number of new nodes <= outdegree. If outdegree small, K small, direct push fine.

Now, potential memory: `new` list for star 200k, plus heap 200k, plus adj 200k. Extra 1.6MB, okay.

Could we avoid `new` list by using `heap.extend` directly and heapify if `len(outs) > BATCH_THRESHOLD` and maybe many new? But we only want to extend nodes that become zero, not all outs. Could append to heap directly and track count? If we append new nodes to heap while still looping, then later if we decide to heapify, okay; if we decide to not heapify, the heap is invalid until we push? We can't push directly if we might heapify? Actually we could always `heap.append(v)` for new nodes (not maintaining heap), and after loop if we choose heapify, done; if we choose not, we would need to heapify too because heap appended without heap property. Unless we used heappush direct. So need collect separately or always heapify when appending. Always heapify after every large node may be bad if H large and K small. So collect.

Could collect in a list and if K > 0. Good.

Now, is there a risk that `new` contains nodes in arbitrary order and if we push direct, we push in that order; heap order independent. Good.

Now, let's think if the batch optimization could be simplified by always using `new` list and at end `heap.extend(new); heapify(heap)` for *all* nodes? That would heapify after each processed node, O(n^2) worst-case. No.

Now, maybe we can use `heapq.merge`? no.

Given the final answer desired oververbosity 9 but user explicitly says single code block. We must only output code block. No explanation. Code can have comments.

Now, let's decide final implementation. I want to be correct and performant. A straightforward solution is likely enough. But adding batch is not too complex and can only help in high fan-out, with minor overhead. However, complexity increases chance of a subtle bug. Let's scrutinize batch code.

Full batch version:
```
from heapq import heapify, heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError("graph contains a cycle")

    order = [0] * n
    pos = 0
    pop = heappop
    push = heappush
    hpush = push
    hify = heapify
    batch_threshold = 512

    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1
        outs = adj[u]
        if len(outs) > batch_threshold:
            new = []
            append = new.append
            for v in outs:
                d = indeg[v] - 1
                indeg[v] = d
                if d == 0:
                    append(v)
            if new:
                if len(new) * 16 > len(heap):
                    heap.extend(new)
                    hify(heap)
                else:
                    for v in new:
                        push(heap, v)
        else:
            for v in outs:
                d = indeg[v] - 1
                indeg[v] = d
                if d == 0:
                    push(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")
    return order
```

Potential issue: `append = new.append` shadows outer? no.

Potential issue: `len(heap)` in branch after popping u. If we use `heap.extend(new); heapify(heap)`, and `new` is large, good. But if `heap` is empty and `new` large, `len(new)*16 > 0` true, heapify. Good.

Potential issue: If `new` is large but `heap` contains stale? Node heap no stale. Good.

Potential issue: If a node has outdegree > threshold but many outgoing edges to the same neighbor, `new` may be small. We still allocate and loop. okay.

Potential issue: The `batch_threshold` branch means for outdegree 513 and H=100k, K=1, we allocate new, append 1, then `1*16 > 100000` false, push direct. Overhead small. Number such nodes at most 781.

Potential issue: If outdegree just above threshold and K=0, no push. Overhead.

Could `len(outs)` be expensive for a list? O(1). Good.

Now, does this batch version maintain lexicographic order when there are multiple new nodes and existing heap? Yes, heapify or pushes result in heap containing all. Next pop min.

Now, one subtle performance issue: In large outdegree path, we do not push new nodes until after processing all outgoing edges. That's correct; availability only after all incoming edges from u and previously processed nodes. But if u has multiple edges to v, v may become zero only after all duplicates; we append once. Good. If v becomes zero earlier due to some edges? We argued no. But what if v has an edge from u and also from a node w that is in heap but not processed yet. indeg[v] includes w, so not zero. Good.

Now, could delaying pushes within the same u affect the processing of another node? We are still processing u; no other node is popped until u's adjacency loop finishes. All nodes that become zero due to u should be available after u is fully processed. So collecting and adding after loop is fine. Direct push inside loop also fine because no pop occurs until loop ends. But if we push inside loop, heap may have new nodes while still processing u, but no pop until after loop, so no difference. Collecting after loop is okay.

Now, potential issue with self-loop in large outdegree path: If u has self-loop, u cannot be in heap, so not processed. If due to bug it is, indeg[u] would be decremented and maybe zero, pushing u again? But self-loop means indeg[u] at least 1, and u processed only if indeg zero, impossible. Good.

Now, if graph has cycle but some nodes processed, batch still correct.

Now, is `if n and not heap` early raise okay with batch? yes.

Now, if edges is empty, early return. If edges nonempty but no cycle, heap not empty. If cycle with no source, early raise. If cycle with sources, process.

Now, could early return `if not edges` be problematic with batch because if edges is an empty *generator*, bool true, no early return, then `for a,b in edges` does nothing, heap all nodes, process. That would be slower but correct. Type list.

Now, should we include `batch_threshold` as a local constant? yes.

Now, is the batch optimization worth the extra code in final? The user asked for code, no explanation. A more complex code might be less maintainable. But performance spec. I can include comments to clarify. However, the final code with batch is longer but still fine.

Let's consider if the batch threshold could cause *more* time in a worst-case where many nodes have outdegree 513 and H large, K small. At most 400k/513 ~780 nodes. Overhead 780 list allocations and loops, negligible.

In a worst-case where many nodes have outdegree 513 and K ~513, H maybe 100k. For each, new*16=8208 <100k, so push direct 513 pushes. Direct path would also push 513 pushes, but we added new list overhead. 780*513=400k new appends plus 400k pushes. Overhead maybe 0.02s. okay.

In a case where H small and many nodes have outdegree 513, K~513, new*16 > H likely, heapify each time. Heap size maybe grows. Suppose H=0, process node1 K=513, heapify 513, pop 513 nodes (their adj maybe empty). Then next large node? If graph has 781 large nodes each with 513 outgoing to new nodes, and no edges between groups? But each large node must be available initially or after? If all large nodes are sources, initial heap has 781 nodes. Process first: H=780, K=513, 8208>780 -> heapify 1293. Then pop 513 (small outdegree) etc. Then next large node maybe already in heap? Actually large nodes all initial; after first, heap has 780 large + 513 leaves. Pop min; if leaves have smaller labels than remaining large, it may pop leaves before next large. Eventually pop next large, H includes 780 large + many leaves, maybe large H. For subsequent large nodes, K=513, H maybe thousands/tens thousands. new*16 may be < H, so push direct. If H small early, heapify a few times. Fine.

Could repeated heapify cause O(k*H) if H remains moderate and K just over H/16? Example H=1000, K=63 (63*16=1008) heapify 1063. If this happens many times, H maybe ~1000 each time, 63 heapifies *1000=63k, okay. If H=100k, K=6250 to trigger, each heapify 106k. Number of such large K events limited by total new nodes 200k/6250=32, total 3.4M, okay. Direct pushes would be 32*6250*17=3.4M. Similar. Good.

Thus batch safe.

But maybe the simple solution is expected; batch code might be considered too much but no one will penalize if correct. The final answer should be complete. I can choose simpler to reduce risk. Let's weigh risk: Batch code has more lines, but I've reasoned correct. Simpler code less risk of typo. The performance of simple likely passes. The prompt says "Must handle ... in about a second." A simple C-heap implementation should pass. I think simple is enough. But if the environment has pure Python heapq, simple might be closer to 1s? Batch could help by reducing heap pushes in fan-out, but pops remain. Pure Python heappop 200k log maybe 1s alone. Batch can't reduce pops. Could a different algorithm reduce pops? No, need output n nodes. But if many nodes available, could output them in sorted order without heap pops if we detect all remaining nodes are available and have no outgoing edges? Hard.

Maybe we can optimize the all-available case: During processing, if heap contains all unprocessed nodes? Not know. But if no more edges from unprocessed? We could track remaining outgoing edges? Not worth.

If pure Python heapq, 200k pops from 200k heap might be ~1s? Could TLE. But CPython has C.

Could use a bitset to output all available nodes in sorted order when heap is large? For a word, we can extract all set bits in order without heap pops? If we maintain bitset, maybe faster. But complex.

Let's consider a fully custom two-level bucket that may be faster than heap in pure Python? But C heap likely faster.

Given standard library, `heapq` C is best.

Now, let's think about if we can avoid heap pops for initial zero nodes by merging with generated nodes using a k-way? No.

Now, final code simple vs batch. The user likely expects a concise algorithm. I can include simple with micro-opts. The final answer oververbosity 9 doesn't matter due user constraint. I'd output simple code to be safe and clear. But the performance spec maybe wants "about a second"; simple with C heap and no heapify and empty early should be fine.

Let's maybe include the batch optimization but keep code clear. It demonstrates expertise. However, the problem statement does not ask for optimizations beyond performance; a clean min-heap solution is standard. Over-optimization could be viewed as unnecessary but acceptable. The final code should not have tests. Comments okay.

I need decide final. Let's maybe produce simple code but with one additional optimization: batch large fan-out? Hmm.

If I produce batch, I need ensure no import heapify if not used? Use. Let's test batch code mentally for a case with initial heap sorted and no heapify. Suppose initial heap [0,1,2]. We pop 0. If outdegree large and new [3,4], H len after pop =2 (1,2). 2*16=32>2, heap.extend [1,2,3,4], heapify -> [1,2,3,4]. Good. If no heapify initial, [0,1,2] valid. After pop 0, heappop maintains heap [1,2]. Good.

If outdegree small, push direct: heap [1,2], push3 -> [1,3,2], push4 -> [1,3,2,4] valid. Good.

Now, if we skip initial heapify, but use `heapq.heappop` on [0,1,2] valid. Good.

Now, one subtle bug: The initial heap list is sorted, but if we use `heap = [i for i, d in enumerate(indeg) if d == 0]`, and then `if n and not heap` raise. If heap not empty, no heapify. If we later in batch do `heap.extend(new); heapify(heap)`, okay. If no batch, we never call heapify, but heap remains valid due to heappop/push. Good.

Now, if we include batch, we need `heapify` import. The code is longer but still within single block.

Let's think about if `heapify` on `heap` after `heap.extend(new)` where `heap` was a valid heap and `new` unsorted. `heapify` sorts entire list. Good.

Now, could `heap.extend(new)` invalidate `new`? no.

Now, if `new` is empty, no merge. Good.

Now, if `len(new) * 16 > len(heap)` and `heap` is large, `heap.extend(new)` then `heapify`. If `new` is huge, memory double temporarily. okay.

Now, maybe we can set `batch_threshold = 64` to catch more. But 512 okay. If a node has 500 outgoing and K=500, H=0, direct pushes 500 log small; okay. If many such nodes, total m 400k, direct pushes 400k? Actually each node pushed once, total 200k. Direct fine. Batch not necessary for 500. Use 1024 to reduce overhead. Star 200k triggers. Let's use 1024. At most 390 large nodes. Good. But a node with 1000 outgoing and H=0, direct pushes 1000 log ~10k, okay. No batch. Fine. The main benefit for very large fan-out. Use 1024.

But if a node has 1000 outgoing to all new and H=0, direct 1000 pushes maybe fine. So threshold 1024 safe.

Now, if m=400k and n=200k, max outdegree 199999. Batch triggers.

Now, do we need to consider that `len(outs)` for a list of duplicates can be 400k, new size maybe 1. We batch path overhead. okay.

Now, let's think about if there is a cycle and a node with large outdegree in acyclic part processed; batch okay.

Now, perhaps we can simplify batch by always using `new` for `len(outs) > 1`? No.

Now, final code with batch might be:
```
from heapq import heapify, heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError("graph contains a cycle")

    order = [0] * n
    pos = 0
    pop = heappop
    push = heappush
    hify = heapify
    batch = 1024

    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1
        outs = adj[u]
        if len(outs) > batch:
            new = []
            new_append = new.append
            for v in outs:
                d = indeg[v] - 1
                indeg[v] = d
                if d == 0:
                    new_append(v)
            if new:
                if len(new) * 16 > len(heap):
                    heap.extend(new)
                    hify(heap)
                else:
                    for v in new:
                        push(heap, v)
        else:
            for v in outs:
                d = indeg[v] - 1
                indeg[v] = d
                if d == 0:
                    push(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")
    return order
```

This is correct. But is the early `if not edges` with a list okay? yes.

Could there be a graph with no edges but n=200k and edges is a generator empty; no early return, then `adj` allocated, heap list 200k, while 200k pops. If the judge passes a generator despite type hint, performance maybe worse but still maybe okay. If we want to handle empty iterable efficiently, we could not use `not edges` but maybe consume? Can't know empty without consuming. Could use `edges_iter = iter(edges)`? But type list. Keep.

Now, one more optimization: If after building, the number of edges processed is 0? We already early. If edges is a list and empty, return. If edges is a list but all edges are self-loops? build, heap maybe empty, early raise. Good.

Now, let's consider if we should use `sys.setswitchinterval`? no.

Now, maybe the lexicographically smallest ordering can be produced by sorting the initial sources and using a *min-heap*, but if we use batch heapify, the heap may contain nodes that are not available? We only add nodes when d==0 after processing all incoming edges from u. But what about incoming edges from nodes not processed yet? indeg >0. Good.

Now, let's think about if there are parallel edges from u to v and from v to u (cycle). u might be source? If v has incoming from u, u indeg from v, neither source. If u also no other? heap empty. early raise. If there are other sources, cycle nodes never process. Good.

Now, could a node be pushed to heap twice due to a bug in batch? Suppose v becomes zero during processing u, appended to new. Later in same outs, another edge to v? As argued impossible because indeg would not have been zero before processing last edge. But with batch, we check d==0 for each edge. If there are two duplicate edges, first d=1, second d=0 append once. If there are three, first 2, second1, third0 append once. Good. If there is an edge to v from u and another edge to v from u but due to integer? no. If v becomes zero, later edge would make d=-1, not append. But could that happen if indeg counted fewer edges than adjacency? We count each edge. no.

Now, if v becomes zero and appended, and later in same outs another edge to v due to duplicate not counted? no.

Now, if v becomes zero during processing u, but v is also in `heap` already? Could v be already available before processing u? If indeg[v] >0 due to u, no. If indeg[v] was 0, then edge u->v would make indeg at least 1, contradiction. So not in heap. Good.

Now, if v is a self-loop and u=v, not processed. Good.

Now, let's think about possible use of `__slots__` no.

Now, final answer must be a single ```python code block. We can include only code. Good.

Should we include `from __future__ import annotations`? no.

Now, let's maybe choose the simpler version to avoid overengineering. The prompt likely from an coding challenge; they will run tests. Batch code passes tests if correct. Simpler code also. Which is less likely to have hidden bug? Simpler. Performance likely okay. I'd go with simpler but include no heapify? If no batch, no heapify. Let's decide final simple:
```
from heapq import heappop, heappush

def topo_order(...):
    if not edges:
        return list(range(n))
    adj = [[] for _ in range(n)]
    indeg = [0]*n
    for a,b in edges:
        adj[a].append(b)
        indeg[b]+=1
    heap = [i for i,d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError(...)
    order=[0]*n
    pos=0
    pop=heappop; push=heappush
    while heap:
       u=pop(heap)
       order[pos]=u; pos+=1
       for v in adj[u]:
          d=indeg[v]-1; indeg[v]=d
          if d==0: push(heap,v)
    if pos != n: raise ValueError
    return order
```

This is clean. The star worst-case does 200k pushes + 200k pops. C heapq should handle. If not, batch could help. But I think okay. The problem explicitly says about a second; maybe they expect C heap and no heapify. Good.

Let's estimate star with simple: Build 400k edges (if duplicates) or 200k. If 400k duplicates, processing loop 400k decrements, 200k pushes. Then 200k pops. 400k heap ops. C heappush/pop 400k maybe ~0.2-0.4s. 400k edge loop ~0.1s. Total <1. If pure Python heapq, 400k*log ~ maybe 2s. But CPython C. If judge uses PyPy, heapq pure? PyPy's heapq may be pure Python but JIT can optimize. 400k log maybe okay ~0.5-1s. Fine.

Now, if n=200k, m=400k random DAG, heap ops 400k, edge loop 400k. okay.

I will output simple version. But maybe include `heapify`? No, skip for performance. Need ensure sorted heap comment. Let's include a short comment.

Final code:
```
from heapq import heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    # The zero-indegree nodes are collected in increasing order, which is a valid heap.
    heap = [i for i, d in enumerate(indeg) if d == 0]
    if n and not heap:
        raise ValueError("graph contains a cycle")

    order = [0] * n
    pos = 0
    pop = heappop
    push = heappush

    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")
    return order
```

Is `if not edges` safe if edges is a list but empty? yes. If edges is a list of edges and n=0? empty return []. If edges nonempty, build error. okay.

One potential issue: If `edges` is a list and empty, but n is huge, `list(range(n))` returns lex smallest. Good.

Another potential issue: If `edges` is a list and not empty, but all edges are duplicates and cycle? final check.

Now, could there be a graph with n>0, no initial zero indegree, but no cycle if there is a node with negative indegree? no.

Now, final answer only code block. Ensure no extra text. Done.
