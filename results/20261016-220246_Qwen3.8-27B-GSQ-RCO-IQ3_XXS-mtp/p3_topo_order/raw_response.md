```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges (duplicates represent the same constraint)
    unique_edges = set(edges)

    # Build adjacency list and in-degree array
    adj: list[list[int]] = [[] for _ in range(n)]
    in_deg: list[int] = [0] * n

    for a, b in unique_edges:
        adj[a].append(b)
        in_deg[b] += 1

    # Min-heap initialized with all zero in-degree nodes
    heap: list[int] = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                heapq.heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected")

    return result
```