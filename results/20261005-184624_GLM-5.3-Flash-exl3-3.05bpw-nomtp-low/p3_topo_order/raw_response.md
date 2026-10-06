```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    seen = set()
    for a, b in edges:
        if (a, b) not in seen:
            seen.add((a, b))
            adj[a].append(b)
            indeg[b] += 1
    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)
    order = []
    while heap:
        v = heapq.heappop(heap)
        order.append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                heapq.heappush(heap, w)
    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```