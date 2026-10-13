Need Kahn's algorithm with a min-heap for lexicographically smallest order. Handle duplicates with adjacency sets or dedupe edges. Use heapq.

For performance with 400k edges and duplicates, dedupe edges first using sets for adjacency to avoid repeated decrements. Using sets per node is fine. Or use adjacency lists with dedupe via set of edges — 400k edges, set of tuples fine.

Implementation:

```python
import heapq

def topo_order(n, edges):
    adj = [[] for _ in range(n)]
    indeg = [0]*n
    seen_edges = set()
    for a,b in edges:
        if not (0<=a<n and 0<=b<n):
            raise ValueError(...)
        if (a,b) in seen_edges: continue
        seen_edges.add((a,b))
        adj[a].append(b)
        indeg[b]+=1
        if a==b: raise ValueError  # self-loop; or let Kahn catch it
    heap = [v for v in range(n) if indeg[v]==0]
    heapq.heapify(heap)
    order=[]
    while heap:
        v=heapq.heappop(heap)
        order.append(v)
        for w in adj[v]:
            indeg[w]-=1
            if indeg[w]==0:
                heapq.heappush(heap,w)
    if len(order)!=n:
        raise ValueError("cycle")
    return order
```

Self-loop: indeg never reaches 0, caught by length check anyway. Fine.

Edge validation: a==b self loop — cycle check catches it. Maybe raise explicitly not needed.

Performance: fine.