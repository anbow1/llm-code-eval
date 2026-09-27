```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
    if not edges:
        return list(range(n))

    unique_edges = set(edges)
    adj = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected")

    return result
```