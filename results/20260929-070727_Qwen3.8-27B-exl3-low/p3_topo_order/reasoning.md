Let me think through this problem:

1. We need topological sort with lexicographically smallest ordering
2. Nodes are 0..n-1
3. Edge (a, b) means a comes before b
4. Duplicate edges possible
5. Cycle detection (including self-loops)
6. Must be efficient for n=200,000 and edges=400,000

For lexicographically smallest topological ordering, we use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue.

Key considerations:
- Use a min-heap (heapq) to always pick the smallest available node
- Need to handle duplicate edges - we can use a set of edges or just count in-degrees properly
- For performance with 200k nodes and 400k edges, we need efficient data structures

Approach:
1. Build adjacency list and in-degree array
2. Use a min-heap initialized with all nodes having in-degree 0
3. Repeatedly pop the smallest node, add to result, decrement in-degrees of neighbors
4. If a neighbor's in-degree becomes 0, push it to the heap
5. If result length != n, there's a cycle

For handling duplicate edges:
- If we just use a list of edges and count in-degrees, duplicate edges will cause issues because we'd decrement in-degree multiple times for the same edge.
- Solution: use a set of edges to deduplicate, or use a set for adjacency lists.

Wait, but using a set for 400k edges might be slow. Let me think...

Actually, the simplest approach: use a set of edges to deduplicate first, then build the adjacency list and in-degrees. With 400k edges, a set of 400k tuples should be fine performance-wise.

Alternatively, we could use a list of sets for adjacency, but that might use more memory.

Let me go with:
1. Deduplicate edges using a set
2. Build adjacency list (list of lists) and in-degree array
3. Use heapq for the min-heap

For n=200,000 and 400,000 edges, this should be well within a second in Python.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap initialized with all zero in-degree nodes
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
- Self-loop: (a, a) would be in unique_edges, adj[a] contains a, in_degree[a] is incremented. When we process a (if it ever gets in_degree 0), we'd decrement in_degree[a] but it was already decremented... wait no. If a has a self-loop, in_degree[a] starts at 1 (at least), so it won't be in the initial heap unless it has no other incoming edges. If it has only the self-loop, in_degree[a] = 1, so it's never added to the heap, and result will be shorter than n. Good.

- Duplicate edges: handled by the set.

- Performance: set of 400k tuples is fine. Building adjacency list is O(E). Heap operations are O(E log V) which for 400k edges and 200k nodes is about 400k * 18 ≈ 7.2M operations. Should be fine.

This looks correct and efficient.
