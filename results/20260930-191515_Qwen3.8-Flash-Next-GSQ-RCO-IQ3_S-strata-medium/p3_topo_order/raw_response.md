```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []

    # Deduplicate edges and build adjacency list + in-degree counts.
    # Use integer keys (a*n+b) for faster set membership than tuple hashing.
    seen: set[int] = set()
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg: list[int] = [0] * n

    for a, b in edges:
        key = a * n + b
        if key not in seen:
            seen.add(key)
            adj[a].append(b)
            indeg[b] += 1

    # Kahn's algorithm with a min-heap to guarantee lexicographically smallest order.
    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result.append(node)
        for nb in adj[node]:
            indeg[nb] -= 1
            if indeg[nb] == 0:
                heappush(heap, nb)

    if len(result) != n:
        raise ValueError("cycle detected")

    return result
```