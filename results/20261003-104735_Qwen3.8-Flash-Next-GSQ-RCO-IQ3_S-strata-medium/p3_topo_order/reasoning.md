The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think about the approach:

1. Build adjacency list and in-degree count
2. Use Kahn's algorithm with a min-heap (to get lexicographically smallest)
3. Handle duplicates (don't count them multiple times for in-degree)
4. Detect cycles (if result length < n, there's a cycle)

Key considerations:
- Duplicate edges: I need to deduplicate edges before processing, otherwise in-degree counts will be inflated and the algorithm will break.
- Self-loops: An edge (a, a) means a node depends on itself, which is a cycle.
- Performance: n = 200,000 with 400,000 edges in about a second. Python's `heapq` should handle this fine.
- Lexicographically smallest: Use a min-heap instead of a regular queue for Kahn's algorithm.

Let me write the implementation:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges to handle duplicates
    adj = [set() for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        if a == b:
            raise ValueError("cycle detected")
        if b not in adj[a]:
            adj[a].add(b)
            in_degree[b] += 1
    
    # Use min-heap for lexicographically smallest order
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
        raise ValueError("cycle detected")
    
    return result
```

Wait, using sets for adjacency might be slow for 200k nodes and 400k edges. Let me think about this more carefully.

Actually, using a set for deduplication during edge processing is fine. The sets will only contain actual neighbors. For 400k edges, the total set entries are at most 400k. The `if b not in adj[a]` check is O(1) amortized for sets.

Actually, let me reconsider. Using `set()` for adjacency lists might have overhead. An alternative is to use a set of edges for deduplication:

```python
seen = set()
adj = [[] for _ in range(n)]
in_degree = [0] * n

for a, b in edges:
    if a == b:
        raise ValueError("cycle detected")
    if (a, b) not in seen:
        seen.add((a, b))
        adj[a].append(b)
        in_degree[b] += 1
```

This avoids creating n empty sets (which for 200k is fine, but still). Actually, using a global set of edges might be slower due to hashing tuples. Let me use the per-node set approach but convert to list after building.

Actually for performance with 200k nodes, creating 200k empty sets might be slightly slow. Let me use defaultdict or just handle it differently.

Let me think about the most performant approach:
- Use `list` for adjacency, but track duplicates with a set of edges or per-node sets.
- Actually, for 400k edges, a global set of tuples is fine.

Let me go with a practical approach:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    seen = set()
    
    for a, b in edges:
        if a == b:
            raise ValueError("cycle detected")
        edge = (a, b)
        if edge not in seen:
            seen.add(edge)
            adj[a].append(b)
            in_degree[b] += 1
    
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)
    
    result = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for nb in adj[node]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                heapq.heappush(heap, nb)
    
    if len(result) != n:
        raise ValueError("cycle detected")
    
    return result
```

This should be efficient enough. The heap operations are O(log n) per node, and total edges processed is at most 400k. For 200k nodes, this should run in about a second in Python.

Actually, I can optimize further by iterating through the adjacency list in sorted order... no, the heap already handles the lexicographic ordering. The order in which we add neighbors to the heap doesn't matter because the heap will sort them.

Let me also consider: should I sort the adjacency lists? No, it's not necessary. The heap ensures lexicographic order regardless of the order neighbors are added to the heap.

Let me finalize this solution.
