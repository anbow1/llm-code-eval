We need answer with single python code block. Need think through algorithm. User asks topo_order(n, edges) lexicographically smallest valid ordering. Nodes 0..n-1. edge a before b. duplicates. Cycle including self-loop raise ValueError. n up to 200k edges 400k ~1s. Standard library only Python 3.11+. Need output just code block.

Need produce efficient algorithm. Lexicographically smallest topological order: Kahn's algorithm using min-heap of zero in-degree nodes. Duplicate edges: if not dedup, in-degree increments multiple times, then when processing a decrements multiple times, net okay? Self-loop: a->a increments indegree and adjacency self; indegree won't become zero so cycle detected. Duplicate edges: indegree count includes duplicates and adjacency contains duplicates, when processing a we decrement for each duplicate, so indegree of b returns correctly eventually. No issue except memory/time: 400k duplicates fine. Need handle 200k nodes 400k edges. Build adj as list of lists length n, indegree list zeros. For each edge, append to adj[a], indegree[b] +=1. Then heap of all i with indegree==0. Use heapq. Pop min, append to result, for b in adj[u]: indegree[b]-=1; if indegree[b]==0 push b. At end if len(result) != n raise ValueError.

But careful: lexicographically smallest among valid orderings. Is Kahn with min heap always gives lexicographically smallest? Yes for DAG, greedily choosing smallest available node yields lexicographically smallest topological sort. Need ensure no hidden issue due duplicate edges? no.

Potential optimization: If n=200000 edges=400000, Python list of lists and heap OK. But we can optimize adjacency representation? list of lists append maybe OK within ~1s? Probably. Need maybe avoid recursion. Use sys? no import? Need import heapq. Function only. Could include typing? No necessary but signature given. Need Python 3.11. Should not include tests/examples. Could include from heapq import heappush, heappop.

Could consider cycle detection with duplicate edges: Suppose duplicate edges a->b and a->b. indegree[b]=2. adj[a]=[b,b]. Process a: decrement twice to 0 push once because after second decrement indegree becomes 0. Correct. If other predecessor c, indegree becomes etc. Good.

Self-loop: indegree self not zero unless? If node also has incoming from processed? e.g. 0 self-loop and no other. indegree[0]=1 not in heap -> result len < n -> ValueError. If self-loop plus other incoming? Still not become zero because self-loop edge from 0 never processed. Raise.

Need maybe detect self-loop early to raise? Not necessary but may speed? If a==b can early set? But with duplicates no issue. Early ValueError may avoid work but need validate all? If cycle detected early maybe okay. But if we raise early on self-loop, it's a valid cycle. Could improve. But if we early raise while building, no need finish building. But the input edges list already exists. OK. However early raising on self-loop might skip building; no problem. But not necessary. Could include if a == b: raise ValueError? But if the function should not raise until full? It can raise as soon as knows invalid; fine. But if we raise during edge processing, no need process rest. Acceptable? Usually yes. But if edges contain a self-loop definitely cycle. However if invalid input edges with out of range? Not specified. Could ignore.

Potential issue: If we early raise on self-loop, and a==b but there's also? cycle. Fine. But if duplicates? no. We can avoid special-case to keep simple. But if self-loop causes indegree of node positive, heap not include; after processing all, raise ValueError. That is fine. But if n=200k all self-loops? 400k edges, adj huge, still process building, result empty, raise. Fine.

Need maybe memory concerns: list of lists for 200k: 200k empty lists ~11MB? Actually list object 56 bytes => ~11.2MB plus edges 400k ints refs ~3.2MB plus int objects? Indices are ints from tuple; append references to existing int objects? Edges tuple has int objects, adjacency stores references to those int objects, indegree list ints small but updates create new ints. For 400k maybe memory okay maybe ~80MB. Could improve using adjacency as arrays? Not needed. But for 1 sec, Python might struggle but likely okay. Could optimize adjacency by precomputing out-degree and CSR arrays? But standard library. Need robust performance. Let's consider constraints: 200k nodes, 400k edges, Python within about a second. Standard Kahn with list of lists and heap may pass. But we need careful about lexicographically smallest. Building list of lists of appends: 400k appends OK. Heap: up to 200k push/pop O(n log n) ~ 200k*18 ~3.6m heap operations? Actually each node push pop. heapq in Python maybe 0.2-0.5s. Edge processing 400k ~0.1-0.2s. Build maybe 0.2. Probably around 1s. But if using heapq with tuple? not. Good.

Could use `heap = [i for i in range(n) if indegree[i] == 0]; heapify(heap)` rather than push each. Use `heapq.heapify`. Then pop. Use local bindings for speed. Need avoid heappush import overhead? fine.

Possible optimization for zero indegree nodes: if heap initial huge, heapify O(n). Good.

Could also use `array`? not necessary.

Need maybe handle n=0. Return [] no error. If edges list nonempty invalid? nodes none? But edges (a,b) with a,b maybe out-of-range? Not specified. Could let IndexError. Maybe if n=0 and edges empty ok. If n=0 with edges invalid maybe IndexError. Fine.

Need maybe avoid recursion.

Let's think about lexicographic proof? Not needed in code. Only code.

Could there be a more subtle issue: Kahn min-heap yields lexicographically smallest topological ordering under the standard definition where all zero indegree are available. This is correct if graph is acyclic. But what if duplicates cause indegree negative? With correct counts no. But if duplicate edges and a appears before b; each edge is separate constraint but duplicate redundant. Counting duplicates and decrementing duplicates works. If duplicates appear with different predecessors? no.

Cycle detection: If cycle, result len < n. Need raise ValueError. If graph has self-loop but also zero indegree? self-loop indegree >0 so not. Good.

Could there be overflow? no.

Should type annotations? `def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:` Include imports.

Potential issue with `list[tuple[int, int]]` in Python 3.9+ okay. Standard library only. Could include `import heapq`. That's standard.

Need only single code block no explanation. Ensure no tests, no example usage, no input/printing.

Potential improvements: If duplicate edges cause performance issues if many duplicates (400k) still fine. But if duplicates huge could be dedup? Not needed. Could dedup per a by using set? That adds overhead and memory. Duplicates allowed but no need.

Need maybe implement with `adj = [[] for _ in range(n)]`. For each `a,b` in edges: `adj[a].append(b); indegree[b] += 1`. Local vars for speed:

```
from heapq import heapify, heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a,b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i,d in enumerate(indeg) if d == 0]
    heapify(heap)
    order = []
    append = order.append
    pop = heappop
    push = heappush
    while heap:
        u = pop(heap)
        append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)
    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

This is straightforward. But consider duplicate edges: if `d==0` multiple times? Could push same vertex twice? Example indeg[v]=2 due two edges from u. adj[u]=[v,v]. loop first d=1 no push; second d=0 push once. If indeg[v]=1 due duplicate? duplicate edge would make indeg[v]=2 not 1. If duplicate edge but we somehow early reduce? no. If two edges u->v and one edge v already indeg 2. okay. If self-loop duplicate: not processed. If a node has duplicate from same u and also another predecessor? indeg total. Only push when final decrement reaches 0, one time. Good.

Could there be negative indegree due to duplicate edge and a not processed? no.

Could heap contain duplicates from multiple edges? As argued no if indeg exactly number edges. But if indeg[v] becomes zero then additional edges from same u would decrement negative and no push? Wait with duplicates from same u count included, so the last duplicate will set to 0 exactly. If there are edges from processed u and also edges from unprocessed? indeg won't hit zero until all. Good.

Potential bug: If there is a cycle and a node in cycle has indegree from outside. It may become zero? For a node in cycle, self/cycle incoming edges from cycle not processed, so after outside edges processed indeg >0, not pushed. Good. If cycle includes node with no incoming from cycle? impossible cycle each node has incoming from previous. Good.

Alternative: Use sorted list and bisect? heap better.

Need maybe use `heapq` module only? fine.

Potential performance: `for i, d in enumerate(indeg) if d == 0` okay. Local `range_n`? no.

Could micro-optimize by using `heap = [i for i in range(n) if indeg[i] == 0]` faster than enumerate? likely similar. Use range indexing might be faster? Not sure. But fine.

Need maybe consider memory for order list 200k ints references okay.

Could maybe early cycle detection via if n ==0? if len(order)!=n raise. If edges invalid negative indexes might silently use from end? e.g. a=-1 would use last node. Not specified. Could add validation? It would slow. Not required.

But if `n` large and edges list tuple ints: iteration unpacking. okay.

Need ensure no `sys` etc. Only import heapq. Is that allowed? yes.

But user wants `Reply with a single ```python code block containing the complete solution.` So final should be only code block. No prose. Need not include `from typing import ...` because built-in list generic in 3.11.

Potential concern: Python's topological sort using Kahn min heap is O((n+m) log n) due heap; for 200k okay. Could lexicographically smallest be generated faster? Maybe use sorted zero indegree list? Not simpler. Heap ok.

But let's think if there is a more efficient algorithm for lexicographically smallest topological order: We can precompute reverse graph? Not necessary. Kahn with heap standard.

Could there be a counterexample to greedy smallest available? Suppose nodes 0 has no outgoing constraints? choosing smallest is lexicographically smallest. General proof: any lexicographically smallest must start with smallest zero indegree node, else it chooses a larger while smaller is available; can swap? Need not. Good.

Now potential hidden issue: Duplicate edges can cause a node to be pushed twice if indeg is not deduped and there are multiple edges from same u? Let's test: indeg[v]=2 from u twice. When processing u: first d=1, second d=0 push. Not twice. If indeg[v]=1 and adjacency has two entries? That can't happen unless edge count mismatch. But if user mutates edges after? no.

If there are parallel edges from different processed nodes? indeg total. It reaches zero at last one, push once. Good.

Could self-loop plus duplicate cause negative? no.

Maybe we can dedup to reduce time if many duplicates? But building set of adjacency may blow memory/time. Not needed. Duplicates are at most 400k. But if there are 400k duplicate edges between same pair, Kahn processes 400k decrements, okay. It still O(m). Could be okay within 1s? 400k loops. yes.

Let's think about strict 1s on Python for n=200k edges=400k. Some online judges tight. We can optimize further.

Potential optimized representation: CSR with forward-star arrays can reduce memory overhead but building might be similar. Use arrays from `array`? Standard library. Could use `list` of ints for adjacency flattened. But for Kahn need iterate outgoing edges for each node. CSR: compute out_degree, offsets, flat to. But edges list is iterable; to build CSR need two passes over edges: first count degrees, second fill. Edges could be a generator? Type list so list. But function input edges is list, can iterate twice? Yes. But if list large, two passes overhead. But memory less? Could be faster? Maybe list of lists is simpler and C-level append is fast. Heap operations dominate? Need not overcomplicate.

But to be safe for 1 sec, maybe optimize memory and speed with list of lists. Python list of lists append is C fast. Heap operations in Python loops 400k. Good.

Potential micro-optimizations:
- Use `import heapq` and local functions.
- Avoid attribute lookup: `heappop = heapq.heappop`, `heappush = heapq.heappush`, `heapify = heapq.heapify`.
- Avoid `append = order.append`.
- Use local indeg, adj.
- For initial heap, using `heap = [i for i in range(n) if indeg[i] == 0]`.
- For edge build, local `adj_a = adj[a]`? Not needed.

Could implement using `heapq.heappushpop`? no.

Potential improvement: If no initial heap and n>0, raise early? If no zero indegree node, cycle. But with cycle and some zero nodes? process those and raise later. Could if not heap: raise ValueError. But need if n=0. If n>0 and heap empty -> cycle (assuming all nodes must have indegree >0, finite graph => cycle). Could raise before building? after build. This saves processing if no zero. But if there is a cycle plus DAG components, there may be zero nodes outside, process them then raise. Can't know. But if heap empty, no node can start => cycle; raise. Add:
```
if not heap and n:
    raise ValueError(...)
```
But if n=0 return []. Not necessary.

Could validate `a==b` early to raise: But if self-loop plus maybe other nodes? It is cycle. Could raise during build. But early raising means no need heap. Might save. However checking each edge adds branch; for 400k negligible. But self-loop rare. Branch could slow? Not much. But code simpler without. If self-loop present, algorithm still builds all, then no result for that component. Could be 400k self-loops all nodes, heap empty, raise. Fine. If n=200k edges all self-loops, building 200k adjacency, indeg all 1, heap empty, raise. Could early `if a==b: raise ValueError` before append to avoid building, but still loop until self-loop. If first edge self-loop raise fast. If none, branch overhead. Could include? It is correct. But if self-loop appears with invalid a out of range? IndexError? Not relevant. Maybe not include to avoid partial build? Both correct.

Could there be cycle that includes self-loop but node also zero indegree if self-loop not counted? We count. good.

Potential issue: If input edges has duplicate and self-loop, early raise? no.

Need decide final code. Maybe simple is best.

But let's consider if lexicographically smallest topological sort can be obtained with min-heap when duplicate edges not deduped. Yes. However, if duplicate edges cause indegree count to be more than number of unique predecessors. When a predecessor u is processed, we decrement all duplicate edges at same time. But could the node become zero after processing one duplicate edge if indeg count was incorrect due to other duplicate from unprocessed? Let's simulate: unique predecessors u and c. duplicates u->v twice, c->v once. indeg=3. Process u: two entries => after first 2, after second 1. Process c => 0 push. Good. If process c first => 2 then u => 0. Good. No premature.

What if a node has duplicate self-loop? never processed.

Cycle detection after processing all possible nodes. If cycle exists but also nodes outside, order length < n.

Potential hidden requirement: "An edge (a, b) means a must come before b." If duplicates. "Return lexicographically smallest valid ordering." For disconnected graph. min heap chooses smallest available. good.

Now final answer should only code block. Ensure no comments? Comments okay but not needed. Could include docstring? Maybe not. Complete solution includes import. Use `def topo_order...`.

Let's craft final:

```
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)

    order = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        u = heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

Maybe use `indeg_v = indeg[v] - 1` to avoid double index? Could be slightly faster? Actually `indeg[v] -= 1` does get/set twice? Python bytecode duplicates? For list item augmented assignment gets, subtract, sets. Then if indeg[v] == 0 gets again. Better:
```
d = indeg[v] - 1
indeg[v] = d
if d == 0: push
```
This avoids second list access. Include. Also local `append = order.append`. Use `heappush` local. Good.

```
    order = []
    append_order = order.append
...
        append_order(u)
...
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)
```

Could local `push = heapq.heappush`, `pop = heapq.heappop`. Good.

Should we pre-bind `indeg_local = indeg`? Not necessary. But local variables already.

Could avoid initial heapify if n=0? range(0) empty, heapify empty ok. len(order)==0 return []. Good.

Could if not heap and n: raise? Not needed. But if no heap, while skip, raise at end. Good.

Let's think if there is a way to make lexicographically smallest without heap by using priority queue of zero indegree. Correct.

Now maybe there is a requirement "must handle n=200_000 with 400_000 edges in about a second." Could the judge expect not to use `heapq` because O(n log n) too slow? For 200k log 200k okay. But Python might be borderline. There might be algorithm O(n+m) for lexicographically smallest topological order? Let's investigate. For lexicographically smallest topological sort, Kahn with min-priority queue is standard O((n+m) log n). Could there be O(n+m) using special data structures? For integers 0..n-1, one can maintain a bitset of available nodes and find min with DSU successor to pop minimum in near-O(α(n))? But duplicates/cycles. Need standard library maybe. Or use `heapq`. For n=200k, log factor not too bad. But if "about a second" maybe C++? Python with heap likely maybe around 1s? Let's estimate: 200k heap pop/push, each heappop/push does ~18 comparisons of ints in Python, ~3.6m operations; plus 400k loop. Could be ~1.5s maybe. Need optimize perhaps.

Can we achieve O(n+m) for lexicographically smallest using bucket/DSU? Since nodes are labeled 0..n-1. We need repeatedly extract smallest available node. We can maintain boolean available and a DSU "next available" structure to find smallest available >= x? But when a node becomes available, insert it. DSU next typically for deletions, not insertions. Could maintain sorted set? Not in stdlib. Could use buckets/linked list? Since keys are integer range, we could maintain doubly linked list of available nodes sorted? Insert arbitrary x in O(1) if we know predecessor/successor among available. Need find predecessor/successor. Could use bitset with `int` bit operations? n=200k fits in Python int bitset. Maintain bitmask of available zero-indegree nodes. Extract lowest set bit: `u = (mask & -mask).bit_length()-1`; clear bit. When node becomes available: `mask |= 1 << v`. This gives lexicographically smallest available because lowest set bit is smallest. Complexity O(n + m + bit operations on big ints). But setting/clearing bits with Python big ints of 200k bits: each operation on big int copies up to size proportional to bit length of integer (up to 200k bits ~25KB). n operations 200k * 25KB = 5GB memory processed, maybe slow but maybe C-level bit ops fast? Could be borderline but maybe okay? Need evaluate. Bitset approach is not standard but pure stdlib. Could be fast because bit operations in C. However `mask & -mask` on 200k-bit int for each node maybe O(n/word) = 200k/30 ~6667 digits? Actually Python int limbs 30 bits, 200k bits ~6667 limbs. Each bit op over entire length? `x & -x` requires unary neg over length and and over length. Doing 200k times => 1.3 billion limb ops, maybe too slow. But maybe `mask & -mask` optimized? no. `mask.bit_length()` only top bit not low. To find lowest set bit faster? Could use `lowbit = mask & -mask`; bit_length lowbit maybe small? It still computes mask & -mask full length. Could maintain chunks (list of 64-bit ints) to find first nonzero chunk and bit. That might be O(number of chunks) to find first non-zero if many empty? Could maintain heap of non-empty chunks? Then complexity maybe lower. But overkill.

Alternatively, because nodes are 0..n-1 and lexicographically smallest, one can use Kahn with a simple pointer if availability is monotonic? Are zero indegree nodes inserted in arbitrary order, not monotonic. Need priority queue. Could use bucket queue if insertion keys can be any integer; but need min. Could use a min-heap of integer; heapq is optimized.

Could use `heapq.heapify` and pop. That's likely best. But maybe we can reduce heap operations by using `heapreplace`? For each popped node, we might push new nodes. We need push after processing. Not possible heapreplace unless number new equals 1? Not.

Can we use a sorted container implemented as linked list with union-find for successor among all not-yet-output? Let's think: We need at each step choose smallest node among currently available (zero indegree). Available nodes are a subset of remaining nodes. We could maintain for each node whether available, and a global `next_avail` linked list sorted. Insertion of new available node into sorted linked list requires finding its place. Could we find place by starting from current smallest pointer? Since we always pop the minimum available, the current popped `u` is less than next minimum. When processing edges from u, new nodes becoming available may have labels >? Could be any, including less than some but greater than current popped? They must not have been available before. Could be smaller than nodes not processed? Since they depend on u, and u is current smallest available, the new node could be smaller than other already available nodes, but must be >? Could be any label >0 maybe. But because we always pop smallest available, any node smaller than current u was either already output or not available. New node from u could have label < current heap minimum but > u? Since u popped, current available set excludes nodes < u (output or not available). Could new available node be less than some existing available? yes, if it was blocked by u and u is small, v could be 1. Existing heap may have node 100. We need insert 1 as next smallest. If we maintain current output order index p, we can maybe insert near p. Need efficient successor. Could use DSU over not output? Let's explore.

Lexicographically smallest can also be generated by repeatedly scanning labels from 0 upward checking availability? A naive: maintain pointer i, find smallest available by scanning from previous popped+1? But availability of a smaller label not yet scanned? Suppose we popped 0. Next new available 1, okay. If a node 2 becomes available after processing 5? Could it become available after we've already passed 2? For it to become available when processing 5, it had indegree >0 before. Could it have label 2 < 5. Then at earlier steps, 2 was not available. Could it become available later after 5. But if we had scanned and passed 2, need to reconsider it. So simple pointer no.

Could process in reverse? Lexicographically smallest forward equivalent to choosing max? Not.

Could use bucket queue with doubly linked list per residue? Not.

Maybe heap is acceptable. Need not overoptimize.

But maybe if n=200k and edges=400k, heap of all zero indegree nodes initially can have 200k nodes (no edges). heapify O(n), then 200k pops. Each pop of heap with many items: `heappop` on min-heap of all remaining sorted? If initial heap is range 0..n-1, heapify produces heap; popping 200k times O(n log n) but heap implementation is fairly optimized. For n=200k, 200k heappop on heap containing decreasing size; total comparisons ~n log n ~3.6m, okay. Could be ~0.1s? heapq in Python maybe 0.2-0.3. Actually 200k heappop of ints ~0.1? Let's estimate: 1M heapq heappop maybe ~0.15s? Could be okay. 3.6m maybe ~0.3. Building adj 400k ~0.1. Total under 1.

Need consider duplicates edge build using tuple unpacking: if edges is list of tuples, fine. If generator? type says list. If generator, two passes not but we one pass. Good.

Potential memory: adj list of lists: If all edges from one node, that list has 400k references. okay. If 400k edges across 200k nodes, many small lists overhead. 200k lists overhead ~11MB, references 3.2MB, indeg list 1.6MB refs plus ints updated? `indeg` list initially references same 0 int; updates create unique int objects for nodes with indegree maybe up to 200k int objects (28 bytes ~5.6MB). Heap list 1.6MB. order 1.6MB. Edges input list exists with tuples: maybe already memory but function gets it. Total maybe ~40MB plus input. okay.

Could reduce memory by using `array('i')` for indegree? But updating array maybe slower? Not needed.

Could use `list` of `array` for adjacency? no.

Potential issue: Python recursion no.

Now final. But let's see if there is any nuance with "lexicographically smallest valid ordering" and duplicate edges: In graph with duplicate edges, constraints identical. Counting duplicates doesn't affect availability. Good.

Could there be invalid self-loop but if node is in heap? A self-loop increments indegree, so node not heap. If node has self-loop and also indegree from a processed predecessor, after predecessor processed indegree still 1 due self-loop. not.

Cycle detection with duplicate edge between a,b but no cycle? len(order)=n, no raise. Good.

Need ensure `ValueError` raised, not other.

Let's think of an example where Kahn min-heap fails due to "lexicographically smallest valid ordering" among all valid total orders, yes greedy works because at first position choose smallest node that can appear first (zero indegree). For second position, choose smallest among zero indegree after first. This is matroid-like. Good.

Potential edge if graph not connected: heap contains zero indegree in all components; choose min. good.

Now, perhaps they expect to raise ValueError if duplicate edges? No, duplicate edges may appear, should ignore. Our algorithm handles. But duplicate edges may cause indeg of a node to be high; if one predecessor appears, multiple decrements. okay.

Could deduplicate edges in O(m log m) not needed.

Need final exactly code. No markdown explanation. Use code fence. Ensure no extra text. Good.

Let's consider if we should include `from heapq import heapify, heappop, heappush` to avoid attribute lookups in code? Use direct imported functions. E.g.:

```
from heapq import heapify, heappop, heappush

def topo_order(...):
   ...
   heapify(heap)
...
   u = heappop(heap)
...
   heappush(heap, v)
```
Since imported names are local/global. In function, global name lookup slightly slower; local assign inside:
```
    pop = heappop
    push = heappush
```
Better. Or `from heapq import heappush, heappop, heapify` and local assign. Good.

Maybe use `heapq.heapify(heap)` once. local `heapify = heapq.heapify`. fine.

Full:
```
from heapq import heappush, heappop, heapify

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i in range(n) if indeg[i] == 0]
    heapify(heap)

    order = []
    push = heappush
    pop = heappop
    append = order.append

    while heap:
        u = pop(heap)
        append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")

    return order
```

This code uses global names in comprehension? `indeg` local. Good.

One micro-optimization: list comprehension for initial heap uses `if indeg[i] == 0`. Could use `heap = [i for i, d in enumerate(indeg) if d == 0]`. Which faster? enumerate avoids indexing. Use that. It creates tuple? enumerate yields tuple unpack? In comprehension: `for i, d in enumerate(indeg)` unpacks. Indexing also. Maybe enumerate faster? Hard. Use enumerate for clarity and no list index lookup. Fine.

```
heap = [i for i, d in enumerate(indeg) if d == 0]
```

Then `d` variable shadows later but okay. Use `deg`. Good.

Could we skip heapify if heap already in increasing order? The list comprehension over increasing i yields sorted increasing. For a min-heap, a sorted ascending list is a valid heap? Check heap invariant: parent <= children. For sorted ascending array, yes because parent index < child index, values ascending, so parent <= child. So no need to heapify! If we collect nodes in increasing order, the list is already a valid min-heap. Because for any i, parent (i-1)//2 < i, so value parent <= value child due sorted ascending. Yes. That can save O(n) heapify. But careful: If all initial zero indegree nodes are collected sorted ascending. The resulting list is ascending. This is a valid heap. We can skip `heapify`. Nice optimization. But if we later push, heap operations maintain heap. If initial list ascending valid heap. Let's verify with duplicates? no. So we can avoid heapify import? Not need. But if initial heap length 0/1 okay. So we can remove heapify. This is a good optimization. However some may consider relying on sorted list as heap is okay. `heapq` functions expect heap invariant; sorted ascending satisfies. Good. Could mention? final no explanation. But code can omit heapify. Need ensure if we later push smaller than current heap? But popped first always heap min. Initially min is first element because list sorted. After first pop, heap remains heap. If during processing we push nodes that might be smaller than remaining heap elements? heappush maintains. Good. If initial sorted list valid. Good.

But after processing first popped node (which is smallest initial zero indegree), we may push new nodes with labels smaller than some existing heap nodes but larger than popped. heappush handles. Good.

So code:
```
heap = [i for i, deg in enumerate(indeg) if deg == 0]
# no heapify needed because list is increasing and thus a valid min-heap
```
Need be cautious: Is a sorted ascending list always a heap? For array representation: For any child index j>parent i, since list sorted ascending, arr[i] <= arr[j]. True. So yes.

This saves a bit. Could there be a node inserted into initial heap not sorted because enumerate over indeg is sorted by index. yes.

If initial list is descending? no.

This is a neat trick but perhaps surprising. But final code can include comment? Might be okay. User only code. Could include comment if needed. Maybe no comment to avoid suspicion? Could include:
```
    # The comprehension is in increasing node order, so it already satisfies heap invariants.
```
Not prohibited. But concise.

Could we also avoid pushing nodes if they will be processed immediately? no.

Could use `order = [0]*n` and fill index to avoid append overhead and len. Might be faster:
```
order = [] append is fine. Could preallocate list of size n and assign:
order = [0]*n
idx=0
...
order[idx] = u; idx +=1
if idx != n raise.
```
Prealloc avoids append method call and dynamic growth. But append is optimized. Prealloc maybe faster? For 200k, minor. Could implement:
```
    order = []
    append = order.append
```
Fine. Prealloc with idx maybe simpler? Need if cycle then output incomplete. At end len order? If prealloc, count. Use count.

```
    order = []
    append = order.append
```
Good.

Potential optimization: `for v in adj[u]:` local `adj_u = adj[u]`? Not necessary.

Could delete edges? no.

Could early detect cycle if `n > 0 and not heap`: This can save raising only at end but same. Maybe:
```
if n and not heap:
    raise ValueError("cycle detected")
```
But if n=0 no. If heap empty and n>0, definitely cycle. This avoids while loop trivial. But we already while no loop and raise after. Same. No matter.

Could we skip storing `adj` for nodes with no outgoing by using dict? But list indexing O(1) faster. list of lists fine.

Let's think about a subtle issue with no heapify: After building initial sorted heap, if `heappop` uses the list as heap. For sorted ascending, yes. Example [0,1,2,3] valid. Pop 0: replaces with 3, sifts down: compare 3 with children 1,2, swap 1 => [1,3,2,0]? Actually heap after pop is [1,3,2]. valid. Good.

Could we skip initial heap creation by using a deque and only heap when need? no.

Potential bug: If initial heap sorted ascending, and we then push a value smaller than some elements but maybe not less than root? `heappush` uses root as min. Since root is smallest initial zero indegree node. New node cannot be smaller than root because root already popped; any node with label smaller than root was not in heap and not available. Could become available? Suppose root is 0, no smaller. If root is 5 because nodes 0-4 have indegree >0 due cycle or dependencies. Could processing 5 make node 3 available? Node 3 smaller than root but not available before. Is that possible? Node 3 depends on 5 (edge 5->3). But edge direction a before b; if 5 must come before 3, then 3 cannot be available until 5 processed. So yes node 3 smaller than current root 5 can become available after processing 5. Since 5 was smallest available, root was 5. New node 3 < some remaining heap elements (maybe 6) and < popped? It's >5? Wait edge 5->3 means 5 before 3, but label 3 < 5. That's allowed. So after processing 5, node 3 becomes available and should be chosen before 6. `heappush` will insert 3 into heap; but root after popping 5 might be 6 (if no other). Inserting 3 makes heap root 3. Valid. Good.

Initial sorted list valid but we didn't heapify. Good.

Potential cycle detection: if new node v < popped? Can a topological edge go to smaller label? Yes labels independent. Our algorithm handles.

Now, maybe there is a way to avoid heap if graph is large but initial zero nodes sorted and later pushes often larger? But not.

Let's consider using `heapq.merge`? no.

Could there be problem if initial list is sorted ascending and length huge; `heappop` assumes heap property but list sorted is a heap. good.

Need decide if to include the no-heapify comment. Could be useful for future reader but not necessary. Since final answer expected code, comments okay. But might be judged? No.

Let's think of potential judge that compares output exactly? They call function. Comments not affect.

Could they require `ValueError` on cycle but not string? Any message okay.

Potential invalid edges: if edge references node >= n, IndexError. Not specified. If negative, may wrap. Could raise ValueError? Not necessary.

Let's ensure code is Python 3.11: `list[tuple[int,int]]` valid. `from heapq import heappush, heappop`.

Need final only code block. Good.

But before final, let's think if there is a hidden trap: Lexicographically smallest topological order with Kahn using min-heap of nodes with indegree 0. Some sources require using `sorted` each iteration or heap. Yes. But duplicates? fine.

Now, could there be a graph with a cycle but still len(order)==n due to duplicate edges causing negative indeg and push? Let's try cycle 0->1,1->0. indeg [1,1]. adj[0]=[1], adj[1]=[0]. heap empty, len0. raise.

Cycle 0->1,1->2,2->0 plus outside -2? no negative. len < n.

Cycle with duplicate causing negative? Consider edge 0->1 duplicate but also indeg manually? no.

What if there are duplicate edges and we decrement indeg below zero because we process a node that appears as predecessor but its edges were not counted due to invalid out-of-range negative? If edge a negative, adjacency for a appended b, indeg[b] count. Negative node maybe processed if its index n-1? Actually negative used as index in list. If a=-1, append to adj[-1] (last node). Later if last node processed, decrements. It might correspond to node n-1 incorrectly. But invalid not considered.

Now consider self-loop plus duplicate causing push? No.

Need maybe ensure if cycle but len(order)==n because node in cycle has zero indegree due to an external negative edge? no.

Could there be hidden requirement to remove duplicate edges to preserve lexicographically smallest? Duplicates don't change constraints. Our counts are duplicate but process duplicates at same time, no premature. Good. If duplicates appear between same pair but one of duplicates considered separate, still okay.

Let's examine if processing duplicates at once from a single `u` could cause a node to be considered available while another duplicate edge from same `u` is still in `adj[u]` not processed? The topological constraint is u before v, not edge instances. Once u processed, all edges from u are satisfied. It's okay to push when indeg reaches 0 during the loop, before the loop finishes? Suppose indeg[v] has exactly two incoming edges: one from u processed now, one from some unprocessed w? Then after processing one duplicate from u? Wait indeg includes duplicates. If indeg[v]=1? no if one from u and one from w => 2. After processing first duplicate from u maybe indeg=1 not zero. If there are two duplicates from u and no other, after first d=1, after second d=0 push. So only after all processed from u. Good. If indeg includes duplicate from u but also from w and due to order of adjacency we process u's duplicate first, not zero until w processed later. Good.

Could pushing happen before we've iterated all edges from u if indeg reaches 0 early but there are more edges from u to v? That would imply indeg didn't count those more edges, impossible. So no.

Potential issue if there are multiple edges from same u to v, and indeg[v] is set to number of unique predecessors? If we dedup indeg but keep duplicate adj, negative. We don't dedup. Good.

Could use `sys.setrecursionlimit` no.

Now, maybe we can further optimize with a custom integer heap using sorted initial and no push? If new available nodes are always larger than current? Not necessarily. If labels represent constraints? No.

Could implement using `bisect.insort`? O(n). no.

Could use `heapq` with tuples? no, ints.

Let's consider if skipping `heapify` is safe if initial list is empty or one. yes.

Potential issue with `heapq.heappop` on a sorted list that is valid heap but not "heapified"? valid. Good.

Need final answer perhaps with no comments due "single code block". Comments inside okay. Let's decide final code with no heapify, no comments maybe:

```
from heapq import heappush, heappop

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, deg in enumerate(indeg) if deg == 0]

    order = []
    append = order.append
    push = heappush
    pop = heappop

    while heap:
        u = pop(heap)
        append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

Is it okay that heap is sorted but `heapq.heappop` might assume list is heap; it does not call `is_heap`. Good. If someone modifies? no.

Should we include `heapify` to be safer and clearer? The requirement performance; heapify O(n) negligible. But no-heapify maybe clever. If code reviewer worries, but no explanation. Since correctness of sorted list as heap is subtle but valid. Could include a comment:
```
    # Sorted by node id, already a valid min-heap.
```
This clarifies. It's inside code. Fine.

But maybe some static analyzers? no.

Potential problem: If `n` is not int but numpy? no.

Let's think about using `array` or `bytearray` for indeg? `indeg[v] -=1` on list fast. ok.

Now maybe we can make faster by processing edges in CSR to avoid list-of-lists overhead. Let's evaluate if necessary. For 400k edges, list-of-lists OK. But Python might be under 1s? Let's approximate. On modern CPU, 400k append + 200k heap pop/push could be ~0.2-0.4s. On slower judge maybe 1.5s. Could optimize adjacency as forward star using arrays of lists? Let's explore alternative O(n+m) with heap but lower overhead: Use adjacency as linked lists arrays:
- `to = []`, `head = [-1]*n`, `next = []`.
- For edge a,b: `to.append(b); next.append(head[a]); head[a] = len(to)-1`. This appends to flat lists; memory: to and nxt 400k ints each => more memory but iteration via while index maybe slower due Python while and list index. List of lists iteration is C-level for list iteration, faster. So list-of-lists better.

Could use `adj = [[] for _ in range(n)]` and extend? Append good.

Potential memory/time improvement: sort edges by source? no.

Could avoid storing edges list input? Function gets list; no.

Could detect cycle early with topological count. no.

Let's think if lexicographically smallest could be done by `heapq` but initial heap sorted no heapify. Good.

Potential problem with duplicate edges and cycle detection: If graph has a cycle but also a node in cycle with indegree only from outside (duplicate) after processing outside, indegree becomes 1 from cycle; not pushed. good. If cycle includes duplicate edges from node to itself, never processed. good.

Let's consider if `edges` may be empty, n positive. adj empty, indeg zeros, heap range n sorted. while pops in increasing order. returns [0..n-1], lexicographically smallest. Good. This is fastest for no edges: 200k heappop sorted. Could we optimize by if no edges return list(range(n))? But edges might empty. Could check `if not edges: return list(range(n))`? That avoids heap for empty edges. But if n=200k, `list(range(n))` faster. But checking `not edges` O(1) if list. Could add. However if edges list is empty but n positive, no cycles. Good. If edges empty but invalid? fine. But if edges is a generator with len? type list. Could include `if not edges: return list(range(n))` to improve. But if edges is a list-like with truthiness, okay. If edges is empty, skip adj building? Need still return. But if edges empty, no cycle. Good. But if n=0, return []. We can include:
```
    if not edges:
        return list(range(n))
```
Before building adjacency. But if n invalid? no. This is a micro-optimization and avoids heap. Is there any case edges empty but n negative? list(range(n)) empty for negative; but n nodes 0..n-1, negative invalid. Could if n<0 raise? Not specified. Could ignore. If n negative and edges empty, returns [] not error. Not important. Could if n <0: raise ValueError? Not specified. Don't add.

But if edges is not empty but no constraints due invalid? no.

Could we optimize for graph with all zero indegree after building: if len(heap)==n return list(range(n)) without heap operations. Indeed after building, if all indegrees zero (edges may contain duplicates? If edges nonempty then indegrees not all zero unless invalid negative? If edges nonempty, some indeg positive. But if edges list empty only). If there are edges with a,b but somehow all indeg zero impossible (unless negative wrap weird). Not.

Could if `n <=0: return []`? If n=0 return. If negative? maybe []. Not.

Potential problem: If there is a cycle, Kahn may push many nodes then raise. Good.

Could we include `if len(heap) == n: return list(range(n))` after building, if all zero. But building nonempty cannot produce all zero. Unless duplicate edges with a,b negative? not.

Now, let's think if early `if not edges` could be considered wrong if edges is a generator? Signature list, but someone may pass iterable. `not edges` on generator is False even if it yields nothing, then iterates. That's fine. But if edges is a custom sequence that can't be bool? no. Could skip to avoid potential issues. Not necessary.

Could we early self-loop raise? If we do, we need not handle self-loop cycle later. It's correct. But if we check `if a == b: raise ValueError` while building, then if input has self-loop but n=0 and a=-1? Hmm. Not. It may speed but branch. It also means if self-loop edge occurs after many edges, raises before building full adj; fine. But if self-loop appears, cycle no matter what. Could include? It adds an `if` per edge; 400k branch maybe slight slow. Not worth. Algorithm detects cycles anyway.

Could optimize by using `for e in edges: adj[e[0]].append(e[1]); indeg[e[1]] +=1` maybe unpack faster? Unpacking tuple is fine.

Now final answer maybe include no `heapify` but comment. Let's ensure no syntax issues:

```
from heapq import heappush, heappop

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, deg in enumerate(indeg) if deg == 0]
    # The list is sorted ascending, which is already a valid min-heap.

    order = []
    append = order.append
    push = heappush
    pop = heappop

    while heap:
        u = pop(heap)
        append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

Should we worry that using a sorted list as heap but then pushing new nodes may violate initial sorted property? That's okay; heap invariant is maintained by heappop/push. If we never heapify, after pop it maintains. Good.

Let's verify with a small example: n=3 edges [(2,1)] indeg [0,1,0] heap [0,2] sorted. pop 0; process none. pop 2; process 1 -> push 1. heap currently [1]? Wait after pop 2 from heap [0,2], heappop returns 0? Let's step: heap [0,2], pop returns 0, heap [2]. Then process 0 none. pop returns 2, heap []. process 2: v=1 d=0 push -> heap [1]. pop 1. order [0,2,1]. Is this lexicographically smallest? Constraints 2 before 1. Valid orders: 0,2,1; 2,0,1. Lexicographically smallest [0,2,1]. yes. New node 1 less than already popped? less than 2 but >0. heappush after heap empty works. Good.

Example n=4 edges [(2,1),(0,3)] indeg [0,1,0,1]. heap [0,2]. pop 0, process 3 push -> heap [2,3] (after heappush? heap [3] then heappush? Actually after pop 0, heap [2]; push 3 => [2,3]). pop 2, process 1 => push 1 => heap [1,3]. pop 1, pop 3. order [0,2,1,3]. Is lexicographically smallest? Constraints 0<3,2<1. At start available 0,2. choose 0. Then available 2. choose 2. Then available 1,3. choose 1. yes. New node 1 < 3 after 2; heappush works.

Could a new node be smaller than root after push? yes heappush maintains.

Now, if initial heap is sorted and we call `heappop` first time, does `heappop` require that if heap is empty? It handles. If initial heap sorted, yes. Good.

Potential issue: Python's `heapq` functions sometimes use `_heapify_max`? no.

Now, could we avoid initial heap creation if all nodes positive indegree? We still create empty. Then cycle raise. Could detect cycle by `if not heap and n: raise ValueError` before processing. But we already build. Fine. Could skip while and raise. Same.

Now, if n=200k and edges has self-loop, our code will build and then process zero nodes maybe many; if there are no zero nodes, len order 0. Could take time but still okay. If many self-loops plus other DAG, still okay. Early self-loop could avoid but not needed.

Let's think about if cycle detection should raise immediately if `indeg[a] == 0`? no.

Now final answer. Ensure no `typing` import. Use built-in generics. Good.

Double-check PEP: `list[tuple[int, int]]` only Python 3.9+. Good.

Now, final should not mention analysis. Only code block.

Potential alternative: If we want to be safest for readability, include `heapify` even though initial sorted. The performance difference small. Maybe a judge or human may not realize sorted list as heap; but it's correct. Could include comment. I think include comment to justify.

Let's consider if `heapq.heappop` on a sorted list that is a valid heap but with duplicate values? node ids unique, no duplicates. Good.

Potential issue: If there are duplicate initial nodes? enumerate yields unique. no.

Could `order.append` local variable conflict with `append`? no.

Now, if graph contains invalid node negative, `indeg[b]` where b negative wraps. Could cause len(order)==n despite constraints? Not required.

Let's consider if we should set `adj = [None] * n` and replace None with list to reduce memory for isolated nodes? Could be faster? Maybe:
```
adj = [[] for _ in range(n)]
```
All lists. For memory, okay. If n=200k, 200k lists. Could use `adj = [None]*n`, and for each edge:
```
lst = adj[a]
if lst is None: adj[a] = [b]
else: lst.append(b)
```
This saves memory if many nodes no outgoing but adds branch per edge. Not worth. But maybe memory constraints? Not specified. list-of-lists likely acceptable. But 200k empty lists memory ~11MB; okay.

Could use `defaultdict(list)` for adjacency to save empty lists but dict overhead for outgoing nodes. If 200k nodes with outgoing maybe worse. And list lookup on dict slower. Not.

Could use arrays for CSR to reduce memory, but no.

Now, final code. Need ensure the code block begins ```python and ends ```. Good.

Let's final.
