The user wants a topological sort that returns the lexicographically smallest valid ordering. Let me think through this:

1. **Algorithm**: Kahn's algorithm with a min-heap (priority queue) to get lexicographically smallest ordering.
2. **Constraints**: 
   - n up to 200,000 nodes
   - edges up to 400,000
   - Must run in about a second
   - Handle duplicate edges
   - Detect cycles (including self-loops)
   - Raise ValueError on cycle

**Approach**:
- Build adjacency list and in-degree array
- Use a min-heap (heapq) to always pick the smallest available node
- Process nodes, decrement in-degrees of neighbors
- If we can't process all n nodes, there's a cycle → raise ValueError

**Handling duplicates**: If we use a set for edges, we avoid double-decrementing in-degrees. But with 400,000 edges, using a set of tuples should be fine. Alternatively, we can just add all edges to the adjacency list and track in-degrees accordingly — but then duplicate edges would cause in-degree to be incremented multiple times, and when we process the source node, we'd decrement multiple times. That's actually fine as long as we're consistent.

Wait, let me reconsider. If edge (a, b) appears twice:
- in_degree[b] gets incremented twice
- When we process a, we decrement in_degree[b] twice
- So it works out correctly

So we don't need to deduplicate. Just build the adjacency list with all edges (including duplicates) and track in-degrees accordingly.

**Complexity**: O((n + m) log n) where m is number of edges. With n=200k and m=400k, that's about 600k * log(200k) ≈ 600k * 18 ≈ 10.8M operations. Should be well within a second in Python... actually Python might be tight. Let me think about optimization.

Actually, with heapq, each push/pop is O(log n). We have n pushes and n pops, plus for each edge we do a push if in-degree becomes 0. So total heap operations are O(n + m) pushes and O(n) pops. Each is O(log n). Total: O((n + m) log n).

For n=200k, m=400k: (600k) * 18 ≈ 10.8M heap operations. In Python, heapq operations are fast (C implementation internally? No, heapq is pure Python but uses list operations). Each heapq.heappush and heapq.heappop is O(log n) comparisons. With 200k elements, log2(200k) ≈ 18. So about 10.8M * 18 ≈ 194M basic operations... that might be tight in Python.

Wait, let me recalculate. We have at most n heappops (200k) and at most n + m heappushes (600k). Each heap operation is O(log n) ≈ 18 steps. So total: (200k + 600k) * 18 ≈ 10.8M steps. Each step is a comparison and a swap in a list. In CPython, this should be fast enough.

Actually, let me reconsider. The heap size is at most n (200k). log2(200k) ≈ 18. Number of heap operations: n pops + (n + m) pushes = 200k + 600k = 800k operations. Each is O(log n) = O(18). Total: 800k * 18 = 14.4M basic operations. In Python, each basic operation (comparison, list access, swap) takes maybe 50-100ns. So 14.4M * 75ns ≈ 1ms. That's well within a second.

Let me also consider the adjacency list construction. With 400k edges, building the list is O(m) which is fast.

Let me write the code:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap for lexicographically smallest
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)
    
    result = []
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

This should work. Let me verify:
- Self-loop: edge (a, a) → in_degree[a] += 1, adj[a] contains a. When we try to process a, in_degree[a] is 1 (assuming no other incoming edges), so a never gets added to heap. Cycle detected. ✓
- Duplicate edges: (a, b) twice → in_degree[b] = 2, adj[a] = [b, b]. When processing a, in_degree[b] goes to 0, pushed once. ✓
- n=0: empty list, heap is empty, result is empty. ✓

This looks correct and efficient.
