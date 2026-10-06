```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg: list[int] = [0] * n
    seen: set[tuple[int, int]] = set()

    for a, b in edges:
        if (a, b) not in seen:
            seen.add((a, b))
            adj[a].append(b)
            indeg[b] += 1

    heap: list[int] = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)

    heappop = heapq.heappop
    heappush = heapq.heappush
    result: list[int] = []
    result_append = result.append

    while heap:
        u = heappop(heap)
        result_append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)

    if len(result) < n:
        raise ValueError("cycle detected")

    return result
```