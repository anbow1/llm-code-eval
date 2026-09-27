Let me think about this problem carefully.

We need to find the lexicographically smallest topological ordering of a graph with n nodes (0 to n-1) and edges (a, b) meaning a must come before b.

For lexicographically smallest topological ordering, we use a priority queue (min-heap) variant of Kahn's algorithm:
1. Compute in-degrees for all nodes
2. Add all nodes with in-degree 0 to a min-heap
3. Repeatedly extract the smallest node from the heap, add it to the result, and reduce in-degrees of its neighbors
4. If we can't process all n nodes, there's a cycle

Let me think about the implementation:

- n can be up to 200,000
- edges can be up to 400,000
- Need to handle duplicate edges (so we need to deduplicate or handle them properly)
- Need to detect cycles including self-loops

For performance:
- Use adjacency list representation
- Use a heap (min-heap) for the priority queue
- Deduplicate edges to avoid counting in-degrees multiple times

Wait, actually for duplicate edges: if edge (a, b) appears twice, we should only count it once for in-degree purposes. Otherwise, when we process node a, we'd decrement b's in-degree twice, which would be wrong.

So I need to deduplicate edges. I can use a set of edges, or sort and unique them.

Actually, let me think more carefully. If I have duplicate edges, and I store them in the adjacency list, then when I process node a, I'll decrement b's in-degree for each duplicate. But I also incremented b's in-degree for each duplicate. So it should still work correctly! Let me verify:

- In-degree of b: incremented once per edge from a to b. If there are 2 duplicates, in-degree is incremented by 2.
- When processing a: we iterate over all edges from a to b (2 of them), decrementing b's in-degree by 2.

So it actually works correctly even with duplicates in the adjacency list! The in-degree count matches the number of times we decrement.

Wait, but that's inefficient. With 400,000 edges, if many are duplicates, we'd do extra work. But 400,000 is manageable.

Actually, let me reconsider. The problem says "Duplicate edges may appear." This means we need to handle them. The simplest approach:
- Option 1: Use a set to deduplicate edges first, then build adjacency list
- Option 2: Just use the edges as-is in the adjacency list and count in-degrees accordingly

Option 2 works correctly (as I showed above) and is simpler. The only concern is performance - but 400,000 edges is fine.

Let me go with Option 2 for simplicity, but actually Option 1 might be better for performance since it reduces the number of edges to process. Let me use a set.

Actually, for 400,000 edges, using a set is fine. Let me use:
```python
unique_edges = set(edges)
```

Then build adjacency list from unique_edges.

Algorithm:
1. Deduplicate edges
2. Build adjacency list and in-degree array
3. Initialize min-heap with all nodes having in-degree 0
4. Process: pop smallest, add to result, for each neighbor decrement in-degree, if 0 add to heap
5. If result length < n, raise ValueError (cycle detected)

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes having in-degree 0
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

Let me verify this handles all cases:
- Self-loop: edge (a, a) means a must come before a, which is impossible. In-degree of a would be 1 (from itself), and when we try to process a, we'd decrement its own in-degree, but a won't be in the heap initially (in-degree > 0). So it stays in the graph and we detect the cycle. ✓
- Duplicate edges: handled by set. ✓
- n = 0: empty list, heap is empty, result is empty, len(result) == 0 == n. ✓
- Large input: 200,000 nodes, 400,000 edges. The set operation is O(E), building adjacency is O(E), heap operations are O(V log V + E log V). Should be fast enough. ✓

Wait, for n=0, we should return []. Let me check: unique_edges would be empty, adj would be [], in_degree would be [], heap would be [], result would be [], len(result) == 0 == n. ✓

Let me also think about whether the set approach could be slow for 400,000 edges. Creating a set of 400,000 tuples should be fast in Python. Yes, this should be fine.

One more thought: the problem says "Must handle n = 200_000 with 400_000 edges in about a second." The heap operations: we have at most 200,000 pushes and 200,000 pops, each O(log 200,000) ≈ O(18). So total heap ops are about 400,000 * 18 ≈ 7.2 million operations. In Python, this should be well under a second.

The adjacency list iteration: 400,000 edges total to iterate through. Fine.

I think this solution is correct and efficient. Let me finalize it.
