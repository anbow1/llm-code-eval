```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg: list[int] = [0] * n

    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references node outside 0..{n - 1}")
        if a == b:
            raise ValueError("cycle detected: self-loop")
        adj[a].append(b)
        indeg[b] += 1

    heap: list[int] = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order: list[int] = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```