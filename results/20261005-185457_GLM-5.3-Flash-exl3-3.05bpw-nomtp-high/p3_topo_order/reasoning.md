Lexicographically smallest topological order: Kahn's algorithm with a heap. Duplicate edges could inflate indegrees if not deduplicated — but duplicates with Kahn's: if we don't dedupe, indegree of b increments per duplicate edge, and decrementing happens per duplicate edge processed... wait, each edge from a decrements once when a is processed. If duplicates exist, indegree of b counts duplicates, and each duplicate edge from a triggers a decrement when a is popped. Since a is popped once, all its outgoing edges decrement b once each. So duplicates are fine actually — indegree and decrements both count duplicates. Wait, decrement happens when a is popped, once per edge in a's adjacency list. Adjacency list contains duplicates, so decrements match. So standard Kahn with heap works without dedup. But dedup with sets saves memory/time for huge duplicates; use sets to be safe.

Complexity O((n+e) log n) fine.

Edge case: duplicate edges in adjacency — using set per node. For 400k edges, fine.

Self-loop: edge (a,a) → cycle detected. With Kahn, indegree of a incremented and decremented when a popped — but a can never be popped since indegree never reaches 0 (decrement happens only on pop). Heap: pop min node with indegree 0. a's indegree ≥ 1 due to self-loop, so never popped → cycle detected at end. Good.

Implementation:

```python
import heapq

def topo_order(n, edges):
    adj = [set() for _ in range(n)]  # sets for dedup
    indeg = [0]*n
    for a, b in edges:
        if b not in adj[a]:
            adj[a].add(b)
            indeg[b] += 1
    heap = [i for i in range(n) if indeg[i]==0]
    heapq.heapify(heap)
    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)
    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

Use sets; adjacency as list of sets. Fine for memory. Done.