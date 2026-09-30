```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indegree = [0] * n

    for u, v in edges:
        adj[u].append(v)
        indegree[v] += 1

    heap = [i for i in range(n) if indegree[i] == 0]
    heapq.heapify(heap)

    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        u = heappop(heap)
        result.append(u)

        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                heappush(heap, v)

    if len(result) != n:
        raise ValueError("Graph contains a cycle")

    return result
```