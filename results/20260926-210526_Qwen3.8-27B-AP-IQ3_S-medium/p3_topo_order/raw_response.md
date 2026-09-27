```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []

    adj: list[list[int]] = [[] for _ in range(n)]
    indegree = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indegree[b] += 1

    heap: list[int] = [i for i in range(n) if indegree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    result_append = result.append
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result_append(node)
        for neighbor in adj[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected in graph")

    return result
```