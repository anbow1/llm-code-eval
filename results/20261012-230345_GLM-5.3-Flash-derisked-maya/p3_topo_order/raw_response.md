```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    seen = [[False] * n for _ in range(n)]  # replaced below for memory efficiency

    # For large n, a set of pairs is better than an n x n matrix.
    # Deduplicate edges to avoid inflated indegrees/adjacency lists.
    edge_set = set()
    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references nodes outside 0..{n-1}")
        if (a, b) not in edge_set:
            edge_set.add((a, b))
            adj[a].append(b)
            indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(order) != n:
        raise ValueError("graph contains a cycle")

    return order
```

Wait — the deduplication via a set of 400k pairs is fine, but I left a stray unused `seen` line. Here is the clean version:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    edge_set = set()
    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references nodes outside 0..{n-1}")
        if (a, b) not in edge_set:
            edge_set.add((a, b))
            adj[a].append(b)
            indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(order) != n:
        raise ValueError("graph contains a cycle")

    return order
```

**How it works:**

1. **Deduplication:** duplicate edges are filtered via a set, so `indeg` counts and adjacency lists aren't inflated by repeats.
2. **Kahn's algorithm with a min-heap:** instead of a plain queue, nodes with in-degree 0 are kept in a heap. Always popping the smallest available node guarantees the *lexicographically smallest* topological order among all greedy choices.
3. **Self-loops / cycles:** a self-loop `(a, a)` gives node `a` an in-degree that never reaches 0, so it's never emitted. Any cycle leaves nodes unprocessed, detected by `len(order) != n`.
4. **Complexity:** O(E + V log V) — for n = 200,000 and 400,000 edges this runs well under a second since each edge is relaxed once and each node is pushed/popped from the heap at most once.