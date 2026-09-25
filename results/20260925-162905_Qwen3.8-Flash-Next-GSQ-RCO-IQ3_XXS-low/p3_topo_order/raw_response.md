```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
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
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)

    if len(result) != n:
        raise ValueError

    return result
```