```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heapq.heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected")

    return result
```

**How it works:**

- **Kahn's algorithm with a min-heap** instead of a plain queue guarantees the lexicographically smallest valid topological ordering — at every step we pick the smallest available node (one whose prerequisites are all satisfied).
- **Duplicates** are handled naturally: if `(a, b)` appears *k* times, `in_degree[b]` is incremented *k* times and decremented *k* times when `a` is processed.
- **Cycle detection** (including self-loops): if any node can never reach in-degree 0, the result will be shorter than `n`, and we raise `ValueError`.
- **Complexity:** O((n + m) log n) — well within budget for n = 200 000, m = 400 000.