The user wants a topological sort function that:
1. Takes `n` (number of nodes 0..n-1) and `edges` (list of tuples)
2. Returns the lexicographically smallest valid ordering
3. Handles duplicate edges
4. Raises ValueError on cycles (including self-loops)
5. Must be efficient for n=200_000, edges=400_000

For lexicographically smallest topological order, I need to use a min-heap (priority queue) instead of a regular queue.

Algorithm:
1. Build adjacency list and in-degree count
2. Use a min-heap (heapq) with nodes that have in-degree 0
3. Pop the smallest node, add to result, decrease in-degree of neighbors
4. If any neighbor's in-degree becomes 0, add to heap
5. If result length < n, there's a cycle → raise ValueError

For handling duplicates: I can use a set for edges, or just track in-degrees properly. Since duplicate edges just mean the same edge appears multiple times, I should deduplicate them. Using a set would be O(E) memory but handles it cleanly. Alternatively, I can just use a set of edges for deduplication.

Wait, with 400,000 edges, a set of 400,000 tuples is fine memory-wise.

For self-loops: (a, a) means a must come before a, which is a cycle. I can detect this either through the in-degree (self-loop adds 1 to in-degree but also adds a to its own adjacency, so when processing... actually no, a self-loop means in-degree of a gets incremented but a is never removed from its own adjacency list in a way that helps). Actually, let me think: if edge (a,a) exists, then in_degree[a] gets +1, and a is in adj[a]. So when we process a (if it's in the heap), we'd decrement in_degree[a] again... but a is already being processed. Actually no - if there's a self-loop, in_degree[a] starts at >= 1 (from the self-loop), so a won't be in the initial heap. Unless a has no other incoming edges... wait, if a has a self-loop, in_degree[a] >= 1, so a can never have in-degree 0 initially (unless there are no edges at all, but the self-loop itself gives in-degree 1). So a self-loop will be caught by the cycle detection (result length < n).

Let me think about the approach:

1. Deduplicate edges using a set
2. Build adjacency list and in-degrees
3. Use heapq (min-heap) for lexicographic order
4. Standard Kahn's algorithm with min-heap

For efficiency with 200k nodes and 400k edges:
- Use list of lists for adjacency
- Use heapq for the priority queue
- O((n + m) log n) which is well within a second

Let me write this:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap for lexicographically smallest order
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
- Duplicate edges: handled by set deduplication
- Self-loop: (a,a) → in_degree[a] >= 1, so a won't start in heap, and it'll never reach in-degree 0 → cycle detected
- Lexicographically smallest: min-heap ensures we always pick the smallest available node
- Performance: O((n+m) log n) with n=200k, m=400k → about 600k * log(200k) ≈ 600k * 18 ≈ 10.8M operations, well within a second.

One concern: using a set of 400k tuples for deduplication. That's fine memory-wise.

Actually, I can avoid the set by using a different approach - just track which edges I've seen. But a set of 400k tuples is perfectly fine.

Let me also consider: what if there are edges with nodes outside 0..n-1? The problem says nodes are 0..n-1, so I'll assume edges are valid.

This looks good. Let me finalize.
