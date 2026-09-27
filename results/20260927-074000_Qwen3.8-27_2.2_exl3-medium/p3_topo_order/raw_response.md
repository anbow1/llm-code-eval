

```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []

    # Deduplicate edges and check for self-loops
    edge_set = set(edges)
    for a, b in edge_set:
        if a == b:
            raise ValueError("Cycle detected: self-loop")

    # Build adjacency list and in-degree array
    adj: list[list[int]] = [[] for _ in range(n)]
    in_deg: list[int] = [0] * n

    for a, b in edge_set:
        adj[a].append(b)
        in_deg[b] += 1

    # Min-heap for lexicographically smallest topological order
    heap: list[int] = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for nb in adj[node]:
            in_deg[nb] -= 1
            if in_deg[nb] == 0:
                heapq.heappush(heap, nb)

    if len(result) != n:
        raise ValueError("Cycle detected")

    return result
```