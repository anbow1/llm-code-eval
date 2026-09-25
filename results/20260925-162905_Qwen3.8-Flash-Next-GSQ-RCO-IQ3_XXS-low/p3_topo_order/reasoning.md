We need answer with single Python code block only. Need design topo_order lexicographically smallest using heapq min-heap of zero indegree nodes. Duplicate edges: need handle duplicates without breaking indegree? If duplicate edges counted multiple times in indegree and decrement multiple times when node processed, it works for DAG but might allow decrement after duplicate? Need careful: if duplicate edge a->b appears twice, indegree[b]+=2; when processing a, for each duplicate indegree[b]-=2, so OK. But self-loop indegree self increments and never decremented? Actually if self-loop, indegree node never zero if only self-loop, cycle detected if heap empties before all nodes. If self-loop plus indegree from processed? e.g self-loop 0->0 and 1->0: indegree[0]=2; process 1 decrements one, still 1; not zero -> cycle. Good.
Need lexicographically smallest valid ordering. Use min-heap. Complexity O((n+E)log n). For n=200k E=400k okay maybe Python ~0.5-1 sec? Need optimize adjacency list and heap.
Could use list of lists; duplicate edges stored. For adjacency maybe arrays? E=400k, list of lists fine. For memory and speed use list of lists append. Use heapq.
Potential optimization: If n=200k, log n ~18, 400k edge relaxations, heap push/pop n ~200k. Fine.
Alternative lexicographically smallest with Kahn using heap. Duplicate edges okay. If want faster duplicate removal? Could use set adjacency but slower memory maybe. Keep duplicates.
But issue: duplicate edges may cause indegree counts duplicated and adjacency list duplicate; when node processed, decrement for each duplicate. Fine.
Cycle including self-loop: after heap empty, if len(result) != n raise ValueError. If cycle disconnected no nodes? all nodes processed if no cycle. Good.
Need no printing/input. Function only maybe imports. Could include from typing? Not necessary. Use `def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:` with import heapq maybe at top.
Need consider invalid edge out of range? Not specified. Could ignore? If edges contain out of range, might IndexError. Should we handle? Problem nodes 0..n-1, assume valid. Could validate? Would slow. Not needed. But self-loop detected. If n=0 returns []. If edges empty returns list(range(n)) because heap all zeros -> min order.
Potential lexicographic guarantee: Kahn with min-heap of current sources yields lexicographically smallest topological order. Yes.
Need optimize for 1 sec: Use local bindings. Maybe build indegree as [0]*n, adj=[[] for _ in range(n)]. For each edges append. Then heapify list of all zero indegree? Instead of pushing all, create `heap = [i for i,d in enumerate(indegree) if d==0]`; heapq.heapify(heap). Then pop/push.
Potential duplicate edges memory: 400k tuples list from input? Edges argument already list. adjacency append ints. Good.
Could use `append = ...` but need per node. Not necessary. But maybe for speed:
```
import heapq

def topo_order(...):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u,v in edges:
        adj[u].append(v)
        indeg[v] += 1
    heap = [i for i,d in enumerate(indeg) if d == 0]
    heapq.heapify(heap)
    result=[]
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)
    if len(result) != n:
        raise ValueError
    return result
```
Need think about self-loop duplicate: If self-loop indeg[v]=1; heap not include, result len<n raise. If self-loop plus other incoming from processed: after processing incoming decrements but self-loop remains, not zero, raise. Good.
Potential issue if duplicate edges and cycle? If cycle 0->1 twice and 1->0: indeg 0:2,1:2 no heap -> raise. Good.
Could there be cycle but still some zero indegree nodes processed, then heap empty, result < n raise. Good.

Need output only code block. The user requested no tests, no example, no input/printing. We can provide code only. Ensure no extra text. Since final must contain single python code block. OK.

Could there be requirement about lexicographically smallest among all valid orderings, including disconnected nodes. Min-heap initial all zeros, yes. Proof not needed. But final just code.

Potential improvement: If many duplicate edges, indegree can be high but within int. OK.

Need consider memory: adj list of lists overhead maybe ~ (n lists 56 bytes = 11MB plus ints 28 bytes each? Python int refs; append int objects? Edges input tuples hold ints. For 400k, ~ maybe 30MB. Fine. For 1 sec? Maybe okay.

Can optimize by sorting edges? No. Min-heap is O(E log V). For 400k edges and 200k nodes, heap operations ~ maybe 600k. Python maybe <1 sec? It might be okay. Could implement faster using `heapq.heappush` local. Good.

But there is nuance: Lexicographically smallest topological ordering can also be obtained with DFS reversed postorder with sorted? Kahn heap is standard. Need be certain: Greedy choosing smallest available source yields lexicographically smallest topological sort. Yes, if any valid order starts with some available node, choosing min available yields lexicographically smaller prefix, remaining can be completed. OK.

Potential edge: if `edges` is generator not list? Signature list, can iterate once.

Need no example usage. Code:
```
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    ...
```

Could add type annotations? fine.

Potential Python 3.11 `list[tuple[int,int]]`.

Need maybe guard n negative? Not specified. Could if n < 0: return []? Not needed. Could raise? no.

Could include `__slots__`? no.

Let's think about performance more. n=200_000, E=400_000. Using heap operations for each push/pop n, each push for edges when indegree zero. Number pushes <=n. Pops n. heapify O(n). For each edge decrement and potential push. ~1M operations plus append. Should be OK.

Maybe duplicate edges can cause indegree[v] not become zero until all duplicates processed. But if duplicate from a to v and a processed, each decrement. Fine.

Could self-loop be detected early? Not necessary.

What if edge (a,b) with a==b and also a is initially zero? No self-loop means indegree at least 1, so not zero. If multiple incoming and self-loop, as above. If self-loop plus self-loop duplicate indegree 2. OK.

Maybe cycle with duplicate edges and negative? OK.

Potential issue: For lexicographically smallest, when multiple available nodes, push them as soon as indegree zero. Using min-heap. Good.

Could use `heapq.heapify` and `heapq.heappush` local variables for speed:
```
from heapq import heappush, heappop, heapify
...
    heapify(heap)
    pop=heappop; push=heappush; adj_local=adj; indeg_local=indeg
```
Maybe code cleaner. Need include no print. Could do:
```
import heapq

def topo_order(...):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1

    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)
    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush
    while heap:
        u = heappop(heap)
        result.append(u)
        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                heappush(heap, v)
    if len(result) != n:
        raise ValueError("graph contains a cycle")
    return result
```
This is fine.

Need final code block only. Done.

Double-check if raising ValueError with message OK? Yes. Problem says raise ValueError; message allowed. Maybe no message to minimize? fine.

Potential hidden tests: duplicate edges; self-loop; cycle; disconnected; lexicographic.

Let's test mentally:
n=3 edges [(0,2),(1,2)]. indeg [0,0,2]. heap [0,1]. pop0 -> indeg2=1; heap[1]; pop1 -> indeg2=0 push2; pop2 -> [0,1,2]. lexicographically smallest? 0<1 yes. If edges [(1,0),(1,2)] -> zero [1], pop1 -> zero 0,2; heap [0,2]; pop0 then2 => [1,0,2]. Valid, lex smallest? Any valid must 1 first (source), then 0 before2? edge 1->0,1->2 no order between 0,2 so 0 then2. Good.

If graph cycle 0<->1 plus source 2: indeg 0:1,1:1,2:0. pop2; no decrement to cycle? if edges 2->0? indeg zero: maybe 2->0,0->1,1->0: indeg0=2,1=1,2=0. pop2, indeg0=1. heap empty, result 1 <3 raise.

If cycle includes processed source due to outgoing? Cycle means at least one node in cycle has indegree from within cycle not decremented because cycle nodes not processed. OK.

Need possibly ensure edges duplicates don't cause invalid negative indegree if same edge processed after v already zero? Suppose duplicate edges? If edge u->v duplicate, indeg[v] increment twice. When process u, decrements twice; if v had zero before processing? But if indeg[v] >0 and only incoming duplicate from u, after first decrement d=1, second d=0 push. OK. If there are duplicate incoming from multiple predecessors? OK. If due to cycle? If v pushed once when indeg zero after last incoming processed. Subsequent duplicate edge from a later? Wait Kahn: indeg[v] counts all unprocessed incoming edges. A node is pushed only when all incoming edges from processed nodes counted, i.e. indeg reaches zero. Could there be incoming edge from a node processed after v is already processed? That would mean edge from predecessor to v but predecessor wasn't processed before v? Invalid if edge direction predecessor must come before v; if predecessor not processed, indeg not zero. Thus cannot. Duplicate edges from same u are processed in one loop. OK.

Potential memory of `result` list. OK.

Now final with code only. Ensure no extra explanation. Use `ValueError()` maybe. final.
