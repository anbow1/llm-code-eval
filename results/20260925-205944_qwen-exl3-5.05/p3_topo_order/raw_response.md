

```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges to avoid inflating in-degrees
    unique_edges = set(edges)

    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1

    # Seed the min-heap with all zero in-degree nodes
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result.append(node)
        for nb in adj[node]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                heappush(heap, nb)

    if len(result) != n:
        raise ValueError("cycle detected")

    return result
```