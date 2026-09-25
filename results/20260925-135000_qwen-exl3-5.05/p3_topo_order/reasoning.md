We need answer user wants code only single python code block. Need think through solution. Need provide function topo_order. Need standard library only. n up to 200k edges 400k about second. Need lexicographically smallest valid ordering. Duplicates possible. Cycle raise ValueError.

Need design efficient. Lexicographically smallest topological order with nodes labels 0..n-1. Standard Kahn with min-heap of zero indegree nodes. But duplicate edges may inflate indegree; need deduplicate or handle carefully. Edges 400k, duplicates can be many. If we just increment indegree for every duplicate, then decrement multiple times as duplicates processed. For duplicate edge a->b repeated k times, indegree[b] += k, adjacency[a] contains b k times; when processing a, decrement k times, effectively same. That works for cycles? If cycle with duplicate, still cycle. But memory okay 400k. However lexicographically smallest? Duplicates don't matter. We can store adjacency list of lists and append duplicates. indegree counts duplicates. That works but if 400k okay. But if many duplicates maybe 400k total edges, okay. But we can deduplicate maybe using sets per node? Too heavy. But duplicates could cause indegree count > number unique predecessors, and if cycle? Example self-loop duplicate a->a indegree[a]+=k; a never zero; cycle. Good. Example duplicate a->b: indegree b=k, when a processed, adjacency has b k times; indegree decremented k times, zero. Good. Potential issue if b also has other incoming edge from c; total indegree counts duplicates plus unique. Works. So no need dedup. Complexity O((n+m) log n) with heap. n=200k m=400k, log n okay maybe about 0.5-1s in Python? Need optimized. Using heapq. Building adjacency list as list of lists. For n=200k list of empty lists overhead okay. 400k appends. indegree as list of int.

Lexicographically smallest: Kahn picking smallest available node at each step yields lexicographically smallest topological order? Yes for total order labels. Proof greedy. Use heap.

Need raise ValueError if cycle. After process count != n.

Could optimize: since labels 0..n-1, lexicographically smallest can be obtained by DSU union-find to skip processed? For each node maintain next candidate? There is algorithm using heap O(m log n) acceptable. But requirement about a second. Python heap with 200k operations okay. Build overhead. Need maybe avoid tuple unpack overhead? Fine. But perhaps duplicate edges 400k. heapq push/pop 200k, 200k log. Should be okay.

Potential problem: Kahn with duplicates may cause heap push when indegree becomes zero only once. If duplicate edges, decrement multiple times; ensure push when indegree becomes 0. Good.

But if there are self-loops with indegree zero? self-loop adds indegree, no.

Need consider edges with nodes out of range? Not specified. We can assume valid. If not, could IndexError. Fine.

Could implement using arrays? list okay. Need only function. No imports? Need import heapq. Standard library. Type hints. Python 3.11+.

Potential memory/performance: For m=400k, adjacency = [[] for _ in range(n)] creates 200k list objects ~11MB, okay. Edge tuple list input also exists. Could build adjacency via head/next arrays to reduce overhead? Need maybe faster? Let's analyze performance constraints. 200k nodes, 400k edges. List of lists fine. Using heapq. Could use heap list initial zero indegree nodes: heap = [i for i, deg in enumerate(indeg) if deg == 0]; heapq.heapify(heap). This is O(n). Then while heap: node = heappop. For neighbor in adj[node]: deg = indeg[neighbor]-1; indeg[neighbor]=deg; if deg==0 heappush. result append.

Can we optimize by avoiding heap for initial zero nodes? Need lexicographically smallest: all zero nodes; use heap. Initial list already sorted, heapify O(n) or maybe it's already heap? A sorted list is a valid min-heap (since parent <= children for heap property? For array sorted ascending, yes for any parent index i children at 2i+1,2i+2 are later indices greater, so valid). Could avoid heapify by heap = zero_nodes; heapq.heapify unnecessary if zero_nodes built sorted. But after pushes need heappush. Could use heap = [i for i ...]; no heapify. But after processing, if no pushes? Fine. If initial sorted list, heap property holds. But after pop and push, heapq.heappop assumes heap; sorted list valid. But is it guaranteed? Python's heap property: for all i, heap[i] <= heap[2*i+1] and heap[2*i+2]. A sorted list ascending satisfies. So skip heapify. But careful if zero_nodes built by comprehension from enumerate sorted i, sorted. Good. Saves O(n) minor. Could mention not in code. But if using heapq.heappop on sorted list okay.

But duplicates: adjacency has duplicate edges; indegree counts duplicates. When processing adjacency, if neighbor indegree becomes zero, push. If duplicate edges cause indegree to go negative? Suppose indegree counts duplicates exactly; decrement for each duplicate. Could indegree become zero before processing all duplicates from same node? Example indegree[b]=2, two duplicates from a. Loop first deg=1 no push, second deg=0 push. Good. If indegree also includes edge from a processed? If there are parallel edges and b already zero? Not possible. If input invalid? no.

What about multiple edges from different nodes. okay.

Can we deduplicate more efficiently? If many duplicate edges and indegree counts duplicates, algorithm still O(m). Good. If there are duplicate edges causing indegree > unique count, when cycle? Example cycle a->b, b->a plus duplicate a->b? indegree b from a twice, a from b once. zero none, cycle detected. Good.

Cycle detection: if len(result) != n raise ValueError. Note if duplicate self-loop on isolated node indegree nonzero, result length n-1? Actually self-loop node never zero; other zero processed; result length n-1; raise. Good.

Potential performance of ValueError with large cycle? Kahn still processes all zero nodes; if graph cyclic, may not process cycle. Could detect self-loop during build? Not necessary. But if self-loop duplicates, indegree positive. Fine.

Need ensure lexicographically smallest with duplicates. Let's prove mentally: at each position, choose smallest node that can be placed without violating constraints, i.e., all predecessors already output. Any valid ordering must choose some available node; choosing smallest available is safe because moving smaller available to front and shifting others? Standard.

Alternative algorithm: Use DSU and set of zero indegree maybe O(n+m α(n)). But heap simpler. Need possibly meet about a second. Let's estimate. Python 3.11: build 400k edges maybe 0.1s? adjacency list append maybe 0.1-0.2. Heap pop/push 200k ~0.1? Edge iteration 400k ~0.05. Total maybe <1s. But heap operations with Python function calls maybe 0.2-0.4. Okay.

But if initial zero_nodes not heapified, is heappop on sorted list safe after some operations? Yes if initially valid heap. But when we push with heappush, valid. However if we skip heapify, but zero_nodes sorted ascending. Good. But to be robust maybe heapify is safer. But skip for speed. Need ensure heapq functions work if list empty. yes.

Could use local variable bindings for speed:
from heapq import heappop, heappush

def topo_order(...):
    adj = [[] for _ in range(n)]
    indeg = [0]*n
    for a,b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i,d in enumerate(indeg) if d == 0]
    # no heapify because sorted
    res = []
    res_append = res.append
    adj_local = adj
    indeg_local = indeg
    heappop_local = heappop
    heappush_local = heappush
    while heap:
        u = heappop_local(heap)
        res_append(u)
        for v in adj_local[u]:
            d = indeg_local[v] - 1
            indeg_local[v] = d
            if d == 0:
                heappush_local(heap, v)
    if len(res) != n:
        raise ValueError("cycle detected")
    return res

Need consider edges list may be huge tuple unpack. Could use for a,b in edges. Fine.

Potential issue if heap not heapified and initial sorted list but heapq.heappop implementation may swap last with first and sift down. Works for valid heap. Sorted list valid. Good. But maybe if n=0: heap=[], res=[], len==0 return []. n=0 nodes 0..-1. Should return [] no error. If edges? Not specified. If edges nonempty with n=0 IndexError.

Now question: "Write topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]." It expects function only. Need single python code block. No tests. Include import. Maybe not printing. Could include docstring? okay. But they said no tests, no example usage, no input(), no printing. Docstring fine but not necessary.

Need ensure type hints: edges list[tuple[int,int]] requires builtins. Good.

Now, is lexicographically smallest always obtained by min-heap with duplicates indegree counting? Yes.

Potential tricky case: If there are duplicate edges and a node becomes zero due to decrement from a predecessor but there are remaining duplicate edges from already processed predecessors? Wait if duplicate edges from same predecessor, they all processed in one loop. If there are duplicate edges from multiple predecessors, a node's indegree includes duplicates. Suppose b has edges a->b twice, c->b once. indegree=3. If a processed first: loop two decrement: indegree 1, c still pending, no push. Later c: zero push. Good. If c processed first: indegree 2, no push; a later two decrements -> zero push. Good.

Could there be push when indegree becomes zero but still duplicate edge from same u unprocessed later in same adjacency list after indegree zero? Example indegree includes only one edge? If duplicates, zero only after last decrement. If there are other edges from same u? all in adjacency. If adjacency has duplicates but indegree from duplicates? zero after last. If due to some negative? no.

Need maybe validate edges count? no.

Could use `raise ValueError` without message? Message okay.

Now, performance: `len(res) != n` O(1). Good.

Potential memory: adjacency list of lists with duplicates. If edges list contains tuples, input memory already. Output list. Good.

Now, could there be a more efficient way to avoid duplicate causing indegree count not representing unique prerequisites for cycle detection? It works. But maybe with duplicate edge a->b where a=b self-loop, indegree a +=1; if there is also incoming from a? no. If self-loop plus zero indegree? impossible.

Potential issue: If edges contain (a,b) repeated many times, indegree might become large (<=400k) fits int.

Now final: single code block. Need not include comments maybe. Should we include `import heapq`? Yes.

Need think if heap initialized as sorted list without heapify might be considered unsafe if zero_nodes comprehension returns sorted yes. But if Python's heapq.heappop assumes heap invariant. sorted list satisfies. But if we don't import heapify, okay. However maybe some maintainability: use `heapq.heapify(heap)` to be safe. But performance maybe not matter. But requirement about a second; heapify O(n) trivial. Could skip with comment? If comment says sorted. I can write robust but optimized: `heap = [i for i, d in enumerate(indeg) if d == 0]` no heapify. Is there any chance that zero_nodes not a valid heap because labels sorted but duplicates? No duplicates in nodes. Sorted ascending. Good.

But if using PyPy? heapq still. Valid.

Maybe there is a corner with lexicographically smallest: Using Kahn min-heap works if all edges directed and constraints. Let's try examples: n=3 edges (2,0), (2,1). zero indegree initially [2]? Wait indeg: 0,1 have indeg1, 2 indeg0 -> heap [2], order [2,0,1]. Valid and lex smallest. If edges (1,0), (2,0). zero [1,2] -> pop1, indeg0? 0 indeg 2->1 not zero; heap [2]; pop2, 0 zero -> [1,2,0]. Valid lex smallest? possible orders: 1,2,0 only since 0 after both; 2,1,0 is larger lex because first 2 >1. Good.

If edges (0,2), (1,2). zero [0,1], pop0 -> [0], indeg2 1; heap [1]; pop1 -> 2 zero -> [0,1,2]. lex smallest. Good.

What if choosing smallest available could block? In DAG, available nodes have no unprocessed predecessors; placing one cannot make another unavailable; only can make more available. Safe.

Now, possible cycle with zero indegree nodes? Kahn will process all acyclic parts; if cycle exists, len< n. Good.

Need perhaps avoid recursion. done.

Could implement adjacency as arrays with `list` and `array`? no.

Let's consider input edges list can be very large; iterating tuple unpack maybe overhead. Could optimize by local `for a, b in edges:`. okay.

Could we preallocate adjacency using arrays? Not needed.

Could we count indegree duplicates but dedup adjacency using sorting edges? For lexicographically smallest and speed maybe sort edges by source and dedup? Sorting 400k O(m log m) slower. No.

Potential hidden issue: Duplicate edges may cause a node to be pushed multiple times if indegree goes to zero, then more decrements make negative and zero again? Could that happen if indegree miscounted due to duplicate edges and a node processed multiple times? Node processed once. Indegree decremented exactly once per incoming edge. If indegree count equals number of incoming edges. It reaches zero on last incoming edge processed. There are no additional incoming edges to process after last, unless there are incoming edges from a node that is processed after it reaches zero? That would mean its indegree count didn't include that edge. But count includes all edges. So no. Unless there are negative indegrees due to initial indegree not counting all edges, not.

Could a node be pushed initially if indegree zero but has incoming duplicate self-loop? indegree not zero.

What about invalid duplicate edge count with integer? no.

Now, maybe the test expects ValueError for any cycle including self-loop. Good.

Let's consider using min-heap but initial sorted not heapified. Some might argue if heap list sorted, heappop okay. But to avoid any possible concern, use `heapq.heapify(heap)`. O(n) and negligible. But they mention about a second; heapify 200k is tiny. But skip can be okay. I'd use heapify for clarity? The final code can include comment: already sorted, but use heapify? Hmm.

The user asked only code. We can include import, function. If include comment okay. They want standard library. I'd produce:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    heapq.heapify(heap)
    heap_pop = heapq.heappop
    heap_push = heapq.heappush

    order = []
    append = order.append

    while heap:
        u = heap_pop(heap)
        append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                heap_push(heap, v)

    if len(order) != n:
        raise ValueError("graph contains a cycle")
    return order
```

Could optimize with skip heapify:

```
    heap = [i for i, d in enumerate(indeg) if d == 0]
    # already a valid heap
```

But if we set heap_pop = heapq.heappop, initial list valid. I'd maybe include `heapq.heapify(heap)` for safety. The performance impact: heapify 200k ~0.005s. okay.

Could there be memory issue if `adj = [[] for _ in range(n)]` for n=200000 fine.

Now, but the requirement "Return the lexicographically smallest valid ordering." Kahn with heap over indegree zero nodes yields lexicographically smallest *among all topological sorts*? Need be absolutely sure. In a DAG, the set of nodes that can appear first are exactly sources (indegree zero). The lexicographically smallest sequence must begin with smallest source. Then recursively remove it and pick smallest source in remaining graph. This is exactly algorithm. Yes.

Now, maybe if edges have duplicates, sources are nodes with no incoming edges unique. But indegree with duplicates: if duplicates incoming, indegree >0; if no incoming unique, indegree 0. Duplicates don't change zero status except positive remains positive. Good.

Could self-loop: indegree >0. If graph all nodes self-loop? heap empty, order empty, raise. Good.

Now final only code block. Need no explanation. Ensure no `input` `print`. Good.

Double-check Python version 3.11: list[tuple[int,int]] okay. Need from __future__? no in 3.11.

Potential issue: The environment may run mypy? not relevant.

Potential alternative using `heapq.heappush` only when d == 0. If graph has cycle, some indegrees remain positive. Good.

Let's think about performance with many zero nodes and adjacency empty. heapify and pop each O(log n). For n=200k, okay. Could optimize if graph is complete no edges? Need lex order 0..n-1. Heap pops 200k O(n log n). But we could detect no edges? Or use specialized? Requirement about second. 200k pops log ~18, 3.6M comparisons, okay. But maybe 200k heap pops in Python ~0.05-0.1s? Actually heapq in Python is Python code, 200k*18 ~3.6M Python-level operations, maybe 0.3s. Fine. But we can optimize to avoid heap overhead when heap is sorted and no pushes? There's algorithm using disjoint set? Maybe not needed. But if they expect 1s, Python with heapq 200k should pass.

Could implement faster lexicographically smallest topological sort using a DSU "next unprocessed" array and a boolean ready? Let's explore if need. There is an O(n+m) algorithm? Since labels ordered, we can maintain available nodes in a disjoint-set successor structure to find smallest available node without heap, but updates can make new nodes available out of order. We need dynamic set insert and extract-min. Heap is typical. Alternative bucket/segment tree. Heap okay.

Can optimize Kahn to use sorted initial nodes and `heapq.heappop` but pushes maybe fewer. Good.

Could use `heap = [i for i, d in enumerate(indeg) if d == 0]` and then if len(heap)==n and no edges? return list(range(n))? But edges may no edges only. Could detect total indegree zero? We already compute indeg. If all nodes zero, return list(range(n)). This avoids heap for empty edges. But need know no incoming; if indeg all zero, graph has no edges? Actually if n=0? If indeg all zero, no incoming to any node, so no edges at all (since every edge gives incoming). So return list(range(n)). Could add after indeg: if not any(indeg): return list(range(n)). But `any(indeg)` O(n) extra; we can track edge_count or max_indeg? During build set `has_incoming = True` for any edge. But self-loop still incoming. If no edges, return range. Not necessary. But can save if no edges. Yet adds branch. Could maintain `any_incoming = False` if b maybe? If edge invalid? no.

Could initialize heap as list of zero indegree nodes and `heapq.heapify`. If all nodes zero, heap sorted, pop each. O(n log n). If n=200k and m=0, about 0.2s. Fine. But if time strict, can optimize. But code complexity minimal.

Maybe use `order = []` preallocate? Not needed.

Need consider if edges list is iterator? Type says list. Fine.

Potential hidden requirement: duplicate edges may appear, must handle; counting duplicates works but cycle detection? Let's test a subtle duplicate effect: Suppose edges: (0,1), (0,1), (1,0). indeg[0]=1, indeg[1]=2. zero none? heap empty? indeg[0]=1 (from 1), indeg[1]=2 (from 0). No zero. cycle raise. good.

Suppose cycle not all nodes: 0->1,1->2,2->1 plus edge 0->3. indeg:0=0,1=2,2=1,3=1. heap [0]. pop0 dec1 to1, dec3 to0 push3. pop3. order [0,3], len2<4 raise. good.

Suppose duplicate edge to node in cycle: still raise.

Could there be a cycle but all nodes in cycle have indegree zero due to duplicates negative? no.

Now, final should only include code block. Need ensure not mention analysis. Done.

But before final, perhaps consider if the function should handle nodes 0..n-1 only. If edges contain invalid, IndexError. Accept.

Now, any issue with `heapq.heapify(heap)` after list sorted? no. Could use `heap = [i for i, d in enumerate(indeg) if d == 0]` then no heapify. Which final? Let's decide. For code clarity, use heapify. But if they require about a second, maybe skip heapify. I can skip heapify and add comment. But comments maybe unnecessary. If skip, correctness of heappop on sorted list is subtle; if someone changes zero_nodes generation not sorted, bug. But in this function it's sorted. I'd use heapify to be safe. Performance likely fine. Let's estimate: 200k heapify is linear but still Python loops. Maybe 0.02s. No issue.

Potential optimization: use `heapq.heappush` and `heappop` local. Good.

Could also localize `adj_u = adj[u]` not needed.

Potential optimization: Use `order = [0]*n` and fill index to avoid append reallocation. Append is fine. Prealloc maybe faster? Could do:
```
order = []
append = order.append
```
Prealloc:
```
order = [0]*n
pos=0
...
order[pos]=u; pos+=1
...
if pos != n: raise
return order
```
This avoids dynamic list growth and len call. For n=200k, minor. Could use for speed. But if cycle, order length n with some zeros unfilled; return not. Use pos. This also avoids appending. Let's consider code:
```
    order = [0] * n
    pos = 0
    while heap:
        u = heappop(heap)
        order[pos] = u
        pos += 1
        for v in adj[u]: ...
    if pos != n: raise ValueError
    return order
```
This is slightly faster and fixed memory. But if graph acyclic, returns exactly n. If n=0, order=[], pos=0, return. Good.

Need if cycle: some positions remain zero; but raise. Good.

Could prealloc help with lexicographic? no.

Maybe use local `indeg_v = indeg[v]`? code:
```
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)
```
This accesses indeg twice. Current `d = indeg[v] - 1; indeg[v] = d; if d == 0` one access? Actually `indeg[v]` get, then set. Good. Could `indeg_v = indeg[v] - 1` etc. Fine.

Potential issue: using preallocated order and pos means if invalid n negative? range negative -> [] but nodes 0..n-1 weird. Not specified. If n<0, [0]*n => [] maybe. But nodes negative invalid. Could not handle. Could if n < 0 raise ValueError? Not needed. But maybe robust: if n < 0: raise ValueError. Not required. Could add but extra. If n negative, edges likely empty, function returns []? That might be weird. But nodes 0..n-1 invalid. I'd not add unless spec. Could add `if n < 0: raise ValueError` but not necessary. If tests include n=0 only. If n negative maybe expect? No.

Could there be node labels > n-1? IndexError. Good.

Now, one more thought: Counting duplicate edges in indegree can cause very large indegree values and decrements; if duplicates count is large, a node in a cycle might not become zero even if unique prerequisites processed? But if unique prerequisites processed, all duplicate edges from them processed too, so indegree decremented for all duplicates. If there are edges from nodes in cycle not processed, indegree remains. Good.

Now, what if there are duplicate edges and a node becomes zero due to processing some edges from u, but later in same adjacency list there is another edge to same v that was not counted? It was counted. Zero only after all counted incoming edges processed. If adjacency contains duplicates after zero? impossible if counted. Unless indegree initially undercounted due to overflow? no.

Now, possible memory optimization: `adj = [[] for _ in range(n)]`; with 400k edges, many lists. Could be okay. If strict memory maybe 256MB? Let's estimate: 200k empty lists ~56 bytes each = 11.2MB. Outer list pointers 1.6MB. Edges input list 400k tuples? If input already, ~400k*56=22.4MB plus list 3.2. Adj entries pointers 400k*8=3.2 plus per list overallocation maybe. indeg ints: 200k ints initially same 0 object references? list pointers 1.6MB; as increments create ints for nonzero maybe up to nodes 200k*28=5.6. order list 1.6 plus ints? Stores existing small ints? Node ints created from heap? heap list contains ints from enumerate; ints objects maybe existing? enumerate creates ints? For >256 new ints; heap stores them. But they are also used in order; references. Heap may hold up to n ints. 200k*28=5.6 + list 1.6. Total maybe 60MB. Fine.

If input edges huge but okay.

Now, maybe they expect no imports besides typing? Need import heapq. okay.

Let's think if lexicographically smallest with Kahn heap over *nodes* but duplicate edges may require deduplication for lexicographic? No.

Could there be multiple edges causing indegree count large, and a node initially with indegree 0 but also outgoing to itself? Self-loop gives indegree >0. If edge out of range? no.

Let's consider alternative: Tarjan cycle detection + lex sort? no.

Now final. Ensure single code block. No extra text. Use `from heapq import heappop, heappush` maybe. Then function. Need not include `__all__`. Good.

Potential style: The type hint uses `list[tuple[int, int]]`; if no `from __future__` on Python 3.11 okay.

Let's produce final code:

```python
from heapq import heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    # The comprehension is already sorted, but heapify keeps the code obvious.
    heappush? Actually heapify not imported. Could import heapify too. Use `heapq.heapify` or import.
```

Need import heapify. `from heapq import heapify, heappop, heappush`.

Use prealloc:
```
    order = [0] * n
    pos = 0
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

If we skip heapify, no import heapify. But maybe include `heapify`.

Potential bug: If `n` large and `edges` contains many edges to same node, indeg increments; but indeg list stores Python ints. okay.

Let's test mentally with n=3 edges [(1,0),(2,0),(0,1)] cycle? 0->1->0 and 2->0. indeg [1,1,0]. heap [2]. pop2, dec0 to0 push0. pop0, dec1 to0 push1. pop1. order [2,0,1]. Valid? Edges: 1 before0, 2 before0, 0 before1. Cycle? 0->1 and 1->0 yes cycle! Wait edges: (1,0) means 1 before 0; (0,1) means 0 before1, cycle. But indeg computed: indeg[0] from 1 =1; indeg[1] from 0=1; indeg[2]=0. We popped 2, dec0 ->0, push0. But indeg[0] becomes 0 despite edge 1->0? Because indeg[0] counted only from 1, and processing 2 decremented edge 2->0, but indeg[0] was 1 not 2! Ah! We have edges (1,0), (2,0), (0,1). indeg[0] should be 2 (from 1 and 2). I computed indeg [2,1,0]? Let's recalc: (1,0): indeg0=1; (2,0): indeg0=2; (0,1): indeg1=1. So heap [2]. pop2 dec0 to1 not push. heap empty pos1 !=3 raise. Good. No bug.

Test with duplicate: n=2 edges [(0,1),(0,1)]. indeg [0,2]. heap [0]. pop0: v1 d=1; v1 d=0 push1. pop1. order [0,1]. good.

Now, if heap initial sorted and we skip heapify, sorted list valid. But if using heapify, safe. Include heapify? It adds import. I'd include for clarity. But if want max speed, skip. Which is more likely accepted? Both. Let's maybe skip heapify but comment? Hmm. The requirement is performance, code can be optimized. Use sorted list as heap:

```
    heap = [i for i, d in enumerate(indeg) if d == 0]
    # This list is already sorted, hence it satisfies the heap invariant.
```

But if `heappop` called on list with property; yes. Some reviewers may not know. To avoid subtle, heapify. Time negligible. Use heapify.

But if use heapify, we need `from heapq import heapify, heappop, heappush`. Good.

Potential micro-opt: if not heap: raise early? If no zero indegree and n>0, cycle. But if n=0, return. Could:
```
if not heap:
    if n: raise ValueError
    return []
```
But Kahn loop handles and raises after no pops if n>0. It would not process, pos=0 != n raise. Good.

Potential micro-opt: If m=0, heap list all nodes, heapify no-op but O(n), pops O(n log n). Could simply return list(range(n)) if `not edges`? Since if edges empty, lex order is 0..n-1. This is O(n) and faster. Could add:
```
    if not edges:
        return list(range(n))
```
But if edges is list, bool O(1). This handles no edges. But if edges nonempty but all invalid? no. If edges nonempty but indeg all zero impossible unless edge to invalid? no. Could also detect `if not any(indeg): return list(range(n))`, but extra O(n). Bool edges is good. However if edges is an iterator not list, bool consumes? Type list. okay. But if edges empty, no need adjacency/indeg? Could check at start:
```
if n == 0: return []
if not edges: return list(range(n))
```
This saves memory for no edges. But if edges is list huge, bool fine. Need not.

Could add `if n == 0: return []` before adjacency? If n=0 and edges empty. If edges nonempty, should IndexError maybe; if return [] would ignore invalid edges. Spec maybe n=0 no edges. Could not special-case n=0 unless edges empty. Simpler not.

Potential issue with `not edges` if edges is a generator? Type list. okay. If user passes generator, bool(generator) always True, but then `for a,b in edges` works. But type list. Not concern.

Would adding `if not edges: return list(range(n))` be considered extra? Fine. But if edges list is nonempty with duplicate self-loop and n=0? bool true, then IndexError. okay.

Could there be edges list empty but n huge 200k; returning list(range(n)) good. If we don't, heapify and pops maybe still okay. But optimization nice.

Need still cycle detection if edges nonempty. okay.

Maybe maintain total edges? Not needed.

Potential faster if edges empty: yes.

Let's think about lexicographically smallest with Kahn heap if there are isolated nodes. They are in heap initially sorted; pops in increasing order interleaved with newly available nodes. Example n=4 edges (2,0). indeg [1,0,0,0]. heap [1,2,3]. pop1 (smallest source), then heap [2,3], pop2 makes 0 available push0, heap [0,3], pop0, then3 => [1,2,0,3]. Is that lex smallest? Sources initially 1,2,3; must choose 1 first. After 1, sources 2,3; choose 2, then 0 becomes source and 0<3, choose 0. Valid. Good. What if choosing 2 before 1? lex larger. Good.

Now, could a newly available node be smaller than some already in heap; heap handles. Good.

Now, cycle detection with duplicate edges but no cycle: works.

Could there be integer labels small interned; order list stores references. Good.

Now, final code with optional no edges optimization:

```
from heapq import heapify, heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a,b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i,d in enumerate(indeg) if d == 0]
    heapify(heap)
    order = [0]*n
    pos=0
    while heap:
       ...
    if pos != n: raise ValueError
    return order
```

Is `if not edges` safe if edges is a list but contains all edges that are duplicate? no, if nonempty not. If edges list empty. Good.

But if edges is empty and n negative, list(range(n)) returns []? range(-1) empty. Fine. If n huge memory for list anyway. Good.

Could the no-edges optimization change behavior if edges is empty but invalid nodes? none. Good.

Could there be a cycle with no edges? no.

Should we avoid `not edges` because if edges is a custom sequence? type list. okay.

Potential performance: If edges nonempty but very small, building adjacency okay. Could optimize using adjacency list only for nodes with outgoing. Fine.

Alternative memory-efficient: Build outgoing as list of lists. okay.

Now, one more potential hidden requirement: "Duplicate edges may appear." If duplicates cause indegree count > actual, but when cycle detection counts length, duplicate edges can cause a DAG to appear cyclic? Let's test if duplicates from processed nodes all decremented. No. But what if duplicate edges from a node in a cycle to an acyclic node cause indegree of acyclic node remain positive until cycle processed, so not output; length<n. If cycle exists, we raise anyway. If graph has cycle and duplicate edges in cycle, raise. If graph acyclic, no cycle, all nodes eventually processed. Good.

Now, maybe if edges list contains duplicate edges, indegree count can be large, and the condition `if d == 0` can be true multiple times if indegree goes 0 then negative? No. But if indegree initially 0 and adjacency has duplicate self-loop? indegree not 0. If edge list has duplicate edge where b invalid? no.

Could there be duplicate edges and multiple predecessors where node indegree reaches zero after a duplicate, then another duplicate later in adjacency from same predecessor, making negative and then not push again? Wait, if indegree count includes duplicates, zero after the last incoming edge. But within adjacency list of a single predecessor, duplicates are processed consecutively if appended in input order? They could be interleaved with other neighbors. Suppose b has two incoming edges: one from u (duplicate) and one from c. indegree b=3. Processing u before c: adj[u] has b,b,... Loop first d=2, second d=1, no zero. Later c d=0 push. Good. Processing c before u: d=2, later u first d=1, second d=0 push. Good. It cannot become zero before last incoming edge processed. Good.

What if indegree count is duplicate but adjacency has duplicate not from same source? all incoming edges counted. Good.

Now, maybe using duplicates indegree means if there are 400k duplicate edges from processed source to v, indegree decrement loop 400k, push once. O(m). fine.

Could we deduplicate on the fly to reduce loop? Not needed.

Potential issue: For lexicographically smallest, if duplicate edges cause node to remain not zero until all duplicates processed; but since all duplicates processed at same time as its predecessor, no difference. Good.

Now, let's consider a graph with no cycle but due to duplicate edges, indegree of node in cycle? no.

Now, maybe they expect raise ValueError for self-loop even if node can be ordered? Self-loop means a before a impossible. Kahn indegree positive, if other incoming from acyclic nodes processed, still self-loop indegree remains at least 1, never zero. If self-loop node has no other incoming? indegree 1, not initial. If it has self-loop and also incoming from zero? After processing those, indegree remains 1. Raise. Good.

Now, final answer should be code only. Need maybe include type ignore? no.

Double-check PEP 604? Not needed.

Potential test: `topo_order(0, [])` -> [] due not edges returns list(range(0)) -> []. Good.

`topo_order(1, [(0,0)])` -> edges nonempty, adj[0]=[0], indeg[0]=1, heap=[], order [0], pos0 !=1 raise. Good.

`topo_order(2, [(0,1),(0,1),(1,0)])` -> indeg [1,2], heap empty, raise. Good.

`topo_order(3, [(0,1),(0,1),(1,2),(1,2)])` -> indeg [0,2,2], heap [0], pop0 decrements 1 twice ->0 push1, pop1 decrements 2 twice ->0 push2, pop2. order [0,1,2]. Good.

`topo_order(4, [(3,0),(3,1),(3,2)])` -> indeg [1,1,1,0], heap [3], pop3 push0,1,2, heap [0,1,2], pop0,1,2 -> [3,0,1,2]. Valid, lex smallest? first must 3. good.

Now, maybe there is an O(n+m) lexicographically smallest algorithm using BFS-like with sorted set. But heap okay.

Could there be memory issue due to `heapify` after no edges? If edges empty returns before adj. Good.

Now, maybe we can optimize initial heap to avoid heapify if edges nonempty: The list of zero indegree nodes sorted. Could skip `heapify` and remove import. But if we use no edges optimization, initial heap may still be all nodes if edges nonempty but all edges self? no zero maybe. If some zero, sorted. Skip heapify saves O(n). But heapify is linear; heappop will anyway. Not needed. But to maximize speed, skip heapify and comment.

Let's evaluate if heapify could be considered unnecessary but safe. With n=200k, 400k edges, total operations: heapify 200k ~ maybe 0.01; fine. Use heapify.

Potential micro-opt: after heapify, `heap_pop = heappop` local. We imported heappop. Good.

Could localize `adj_local = adj`, `indeg_local = indeg`? In function local variables already fast. But attribute? no.

Could localize `order_set = order.__setitem__`? Not necessary.

Potential bug: `if not edges` if edges is list of numpy? no.

Now, what if edges is nonempty but n=0: `adj = [[] for _ in range(0)]`, for a,b in edges -> IndexError. Good (invalid). If we special-case n==0 return [] before edges, might hide invalid. Don't.

Now, final code:

```python
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
    heapify(heap)

    order = [0] * n
    pos = 0

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

Check if `not edges` optimization with edges as list: If edges empty but n maybe 200k, returns range list. Good. If edges is None? type list, not. If edges is iterator, bool true; not consume. okay.

Could there be edges nonempty but no incoming? impossible if valid edges; every edge increments indeg[b]. So if nonempty, heap size < n maybe.

Now, if graph has cycle and also many acyclic nodes, `order` preallocated with zeros. If `pos != n`, raise. If `pos==n`, graph processed all nodes. Could there be processed all nodes but cycle due to duplicates? No, Kahn property. But consider self-loop counted twice and processed? self-loop node never zero, so pos<n. Good.

Potential issue: If graph has cycle but all nodes in cycle also have indegree zero due to negative indegree from duplicates? no.

Now, final only code block. Ensure no extra. final.
