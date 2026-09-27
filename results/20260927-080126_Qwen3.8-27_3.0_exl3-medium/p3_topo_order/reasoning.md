Let me think about this problem carefully.

We need to find the lexicographically smallest topological ordering of a directed graph with n nodes (0 to n-1) and given edges.

Key requirements:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Handle duplicate edges
5. Detect cycles (including self-loops) → raise ValueError
6. Must handle n=200,000 with 400,000 edges in about a second

For lexicographically smallest topological ordering, the standard approach is:
- Use Kahn's algorithm (BFS-based topological sort)
- Instead of using a queue (FIFO), use a min-heap (priority queue) so we always pick the smallest available node first.

Algorithm:
1. Build adjacency list and in-degree array
2. Handle duplicate edges (we can just let them exist but we need to handle in-degree correctly - actually if we just add to adjacency list and increment in-degree for each edge, duplicates will cause in-degree to be overcounted. We need to handle this.)

Wait, let me reconsider. If there are duplicate edges, we need to be careful. If edge (a,b) appears twice, then in-degree of b should be 1, not 2. And when we process a, we should only decrement b's in-degree once.

Options:
- Use a set for edges to deduplicate
- Or use a set for adjacency lists

For n=200,000 and 400,000 edges, using a set of edges would be fine memory-wise.

Actually, let me think again. If I use a set of edges, then I can build the adjacency list without duplicates. Let me do:
1. Deduplicate edges using a set
2. Build adjacency list and in-degree array
3. Use a min-heap (heapq) for Kahn's algorithm

Wait, but 400,000 edges as a set of tuples... that's fine.

Let me think about the self-loop case: if (a, a) is an edge, that's a cycle, so we raise ValueError.

Algorithm:
1. Deduplicate edges: `unique_edges = set(edges)`
2. Check for self-loops: if any (a, a) in unique_edges, raise ValueError
3. Build adjacency list: for each (a, b), add b to adj[a]
4. Compute in-degrees
5. Initialize min-heap with all nodes that have in-degree 0
6. While heap is not empty:
   - Pop smallest node
   - Add to result
   - For each neighbor, decrement in-degree
   - If in-degree becomes 0, push to heap
7. If len(result) != n, there's a cycle → raise ValueError

Let me think about performance:
- n = 200,000, edges = 400,000
- Deduplication: O(E) with set
- Building adjacency: O(E)
- Kahn's with heap: O((V + E) log V) = O(600,000 * log(200,000)) ≈ O(600,000 * 18) ≈ 10.8M operations
- This should be well within 1 second in Python... actually maybe tight. Let me think.

Actually, heapq operations are O(log n), and we do at most n push and n pop operations, plus E neighbor decrements. So total is O((n + E) log n) for the heap operations plus O(E) for neighbor processing.

200,000 * log(200,000) ≈ 200,000 * 18 = 3.6M for heap ops
400,000 for neighbor processing

This should be fine in Python within a second.

Let me also consider: using `array` or just lists. Lists should be fine.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Check for self-loops
    for a, b in unique_edges:
        if a == b:
            raise ValueError("Cycle detected")
    
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize min-heap with nodes having in-degree 0
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

Wait, I should also validate that nodes are in range 0..n-1? The problem says "Nodes are 0..n-1" so I'll assume inputs are valid.

Let me also think about whether the self-loop check is redundant with the cycle detection at the end. A self-loop would mean in_degree[a] >= 1, so a would never reach in_degree 0, and it would be caught by the final check. But it's cleaner to check explicitly. Actually, the final check would catch it too. But let me keep the explicit check for clarity and to match the requirement "including a self-loop".

Actually, I realize the self-loop check can be done more efficiently - just check if any edge has a == b. Let me keep it simple.

One more thought: the problem says "Duplicate edges may appear." So we need to handle them. Using a set handles this.

Let me also consider: what if n = 0? Then edges should be empty and we return []. Let me make sure that works. If n=0, adj is empty, in_degree is empty, heap is empty, result is [], len(result) == 0 == n, so we return []. Good.

I think this solution is correct and efficient. Let me finalize it.
