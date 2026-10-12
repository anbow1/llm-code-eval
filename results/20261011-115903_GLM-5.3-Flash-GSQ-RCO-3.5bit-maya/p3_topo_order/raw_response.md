```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references invalid node")
        if a == b:
            raise ValueError("self-loop detected: cycle exists")
        adj[a].append(b)
        indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
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
        raise ValueError("cycle detected: no valid topological ordering")
    return order
```

**Notes on the approach:**

- **Algorithm:** Kahn's algorithm, but instead of a plain FIFO queue, a min-heap is used for the set of nodes with in-degree 0. Popping the smallest available node at each step greedily yields the lexicographically smallest valid ordering.
- **Cycle detection:** If a cycle exists, nodes in it never reach in-degree 0, so `len(order) != n` — we raise `ValueError` in that case. Self-loops are caught explicitly up front.
- **Duplicate edges:** Handled naturally — duplicates simply increment the in-degree of the target multiple times, and each duplicate edge decrements it once when the source is processed, so the in-degree bookkeeping stays consistent.
- **Complexity:** O((V + E) log V), roughly `200_000 + 400_000` heap operations of size up to ~200_000 — comfortably within ~1 second. Memory is O(V + E).
- One micro-optimization: rather than removing edges from lists, we decrement in-degrees in place, which keeps the loop cache-friendly and allocation-free.