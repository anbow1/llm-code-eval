```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_deg: list[int] = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1

    # Start with all nodes that have in-degree 0
    heap = [i for i in range(n) if in_deg[i] == 0]
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
        raise ValueError("cycle detected")

    return result
```

**Key design points:**

- **Lexicographically smallest order**: Kahn's algorithm with a min-heap guarantees that at every step the smallest available (in-degree 0) node is chosen, which yields the lexicographically smallest valid topological ordering.

- **Duplicate edges**: Handled naturally. Each duplicate `(a, b)` adds one to `in_deg[b]` and one entry to `adj[a]`. When `a` is processed, each duplicate decrements `in_deg[b]` exactly once, so the net effect is zero — no special deduplication needed.

- **Cycle detection**: If a cycle exists (including self-loops), some nodes will never reach in-degree 0, so `len(result) < n` and we raise `ValueError`.

- **Performance**: O((n + m) log n) time. For n = 200 000 and m = 400 000, the ~200 k heap push/pop operations (each O(log n) ≈ 18) and O(m) adjacency traversal comfortably fit within one second in CPython.