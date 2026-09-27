We need to write a topological sort that returns the lexicographically smallest valid ordering. Nodes are 0..n-1. Edge (a,b) means a before b. Need to handle duplicate edges, detect cycles (including self-loop), and be efficient for n=200_000, edges=400_000.

For lexicographically smallest topological order, we use a min-heap (priority queue) approach:
1. Compute in-degrees for each node.
2. Use a min-heap to always pick the smallest available node.
3. When we pick a node, decrement in-degrees of its neighbors. If a neighbor's in-degree becomes 0, add it to the heap.

For cycle detection: if we can't process all n nodes (i.e., the heap becomes empty before we've processed all nodes), there's a cycle.

For performance with 200k nodes and 400k edges:
- Use adjacency list representation.
- Use a heap (min-heap) for selecting the smallest available node.
- Avoid duplicate edges: we can use a set of edges or just process them (duplicates just mean we decrement in-degree multiple times, which is wrong). Actually, if we have duplicate edges, we need to handle them properly.

Wait, if there are duplicate edges (a,b) appearing multiple times, we should only count the edge once for in-degree purposes. Otherwise, if we count it twice, the in-degree would be too high and we'd never process node b.

So we need to deduplicate edges. With 400k edges, we can use a set to deduplicate.

Actually, let me think about this more carefully. If we have duplicate edges, we should treat them as a single edge. So:
- Build a set of unique edges
- Build adjacency list from unique edges
- Compute in-degrees from unique edges

For self-loops: if a == b, that's a cycle. We should detect this.

Let me think about the approach:
1. Create a set of edges to deduplicate.
2. Check for self-loops (a == b) - these are cycles.
3. Build adjacency list and in-degree array.
4. Use min-heap for lexicographically smallest ordering.
5. If we can't process all nodes, raise ValueError.

Performance considerations:
- 200k nodes, 400k edges. Using a set for deduplication is O(E) which is fine.
- Adjacency list with lists is fine.
- Heap operations: O(E log V) which should be fast enough.

Let me code this:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    edge_set = set(edges)
    
    # Check for self-loops
    for a, b in edge_set:
        if a == b:
            raise ValueError("Cycle detected")
    
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edge_set:
        adj[a].append(b)
        in_deg[b] += 1
    
    # Initialize heap with nodes that have in-degree 0
    heap = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)
    
    result = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                heapq.heappush(heap, neighbor)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

Wait, let me reconsider the performance. 400k edges, creating a set of 400k tuples - that's fine. Building adjacency list from the set - fine. The heap operations should be O(E log V) which for 400k edges and 200k nodes should be well under a second.

Actually, let me think about whether the set approach is memory efficient. 400k tuples in a set - that's fine for Python.

Let me also consider: what if n=0? Then we return an empty list. The heap would be empty, result would be empty, len(result) == 0 == n, so we return [].

What about isolated nodes (no edges)? They'd have in-degree 0 and be in the heap initially. Good.

I think this solution is correct and efficient. Let me finalize it.
