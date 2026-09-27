The user wants a topological sort that returns the lexicographically smallest valid ordering. Let me think through this:

1. **Algorithm**: Kahn's algorithm with a min-heap (priority queue) to get lexicographically smallest order.
2. **Constraints**: n up to 200,000, edges up to 400,000. Need O((n + e) log n) which should be fine for ~1 second.
3. **Edge cases**: 
   - Duplicate edges (need to handle - can use a set or just count them, but with Kahn's algorithm, if we use in-degree counting, duplicates would increment in-degree multiple times, which is wrong. So we need to deduplicate edges or use a set of edges.)
   - Self-loops (a, a) - this is a cycle, should raise ValueError
   - Cycles - if we can't process all nodes, raise ValueError

Let me think about the implementation:

1. Build adjacency list and in-degree array
2. Use a min-heap (heapq) starting with all nodes with in-degree 0
3. Pop the smallest, add to result, decrement in-degrees of neighbors
4. If result length < n, there's a cycle → raise ValueError

For duplicate edges: I should use a set to deduplicate, or use a set for the adjacency list. But with 400,000 edges, using a set of tuples should be fine.

Actually, let me think more carefully. If I use a set for edges, I can deduplicate. Then build the adjacency list from the deduplicated edges.

Wait, for self-loops: if (a, a) is in edges, that's a cycle. I can detect this during edge processing or it will naturally be caught by the cycle detection (node a will have in-degree >= 1 and never reach 0).

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges and detect self-loops
    adj = [set() for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        if a == b:
            raise ValueError("Cycle detected (self-loop)")
        if b not in adj[a]:
            adj[a].add(b)
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

Wait, using `set` for adjacency might be slow for 400,000 edges. Let me think... Actually, `set` operations are O(1) average, so building the sets should be fine. The total work is O(e) for building and O((n + e) log n) for the heap operations.

Actually, for 200,000 nodes and 400,000 edges, creating 200,000 sets might be a bit slow. Let me use a list and a set for deduplication instead.

Actually, let me reconsider. 200,000 empty sets... that's probably fine in Python. Each set is small. The total memory should be manageable.

Alternatively, I could use a set of tuples for deduplication:

```python
def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    seen = set()
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        if a == b:
            raise ValueError("Cycle detected (self-loop)")
        if (a, b) not in seen:
            seen.add((a, b))
            adj[a].append(b)
            in_degree[b] += 1
    
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

This should work. The `seen` set handles deduplication. Self-loops are caught immediately. Cycles are caught at the end.

For performance: 
- Building: O(e) for the seen set operations
- Heap: O((n + e) log n)
- Total: O((n + e) log n) which for n=200k, e=400k is about 600k * 18 ≈ 10.8M operations. Should be well under a second.

Let me finalize this.
