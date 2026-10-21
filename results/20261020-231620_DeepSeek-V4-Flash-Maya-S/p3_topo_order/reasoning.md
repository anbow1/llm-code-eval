We need answer with code block only. Need write function. Need lexicographically smallest topological order. Need efficient n=200k edges 400k. Python stdlib. Use heapq min-heap of zero indegree. Duplicate edges may appear: Must count duplicates appropriately so indegree decrement duplicates. If duplicate edges, adjacency list includes duplicates; indegree counts duplicates; popping a decrements all duplicates. That works; duplicate doesn't create false cycle? Suppose edge (a,b) twice. indegree b =2. pop a decrements twice. Fine. Self-loop cycles. Need detect cycle if heap ends before n, raise ValueError.

Performance: n 200k, edges 400k, heapq operations O(n log n) maybe okay. Could optimize adjacency as list of lists. Build indegree list. Append for each edge. This handles duplicates natural. For 400k fine. With n=200k, heap operations perhaps ~ okay around second maybe Python okay. Need maybe avoid memory? list of lists 200k okay, 400k ints okay. We can use standard.

Potential issue lexicographically smallest means compare sequences lexicographically. Greedy min zero indegree via min-heap works for DAG: always choose smallest available. Yes.

Return list ints.

Need no tests no printing. Single code block.

Could include from heapq import heappush, heappop. Type hints. Python 3.11+. Define function. Could optimize locals. Need raise ValueError if len(order) != n. In cases duplicate edge with zero? Edge nodes maybe assumed within range? Not specified. We can assume valid node range? Could if not, maybe IndexError. Fine.

We need consider self-loop: indegree a increments, adjacency a->a. a not zero until pop? if only self-loop and indegree 1, never zero. If other incoming? Eventually a maybe? self-loop ensures after all incoming removed, indegree due to self remains >=1 so never pops. Cycle detected. Fine.

Need maybe if n=0? Returns [] and len==n, no error. Good.

Could use list append local. Code:

from heapq import heapify, heappush, heappop

def topo_order(n: int, edges: list[tuple[int,int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a,b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i in range(n) if indeg[i]==0]
    heapify(heap)
    result=[]
    append=result.append
    push=heappush
    pop=heappop
    while heap:
        u=pop(heap)
        append(u)
        for v in adj[u]:
            indeg[v]-=1
            if indeg[v]==0:
                push(heap,v)
    if len(result)!=n:
        raise ValueError("cycle detected")
    return result

This is fine. Could optimize duplicate edges by dedup? Duplicates may appear; counting duplicates as separate works but for performance if same edges many? max 400k. Fine. But duplicate edges don't cause incorrect? Let's verify: a->b twice. indegree b=2. If pop a, dec twice, push b. Fine. If multiple predecessors, each duplicate dec. Count reaches 0 exactly after all edge instances processed. Good.

Potential issue if edges include b out of range -> IndexError but not concern.

Need only code block. Final with code.