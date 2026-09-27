We need to write a topological sort that returns the lexicographically smallest valid ordering. This is a classic problem where we use a min-heap (priority queue) instead of a regular queue.

Approach:
1. Build adjacency list and in-degree count
2. Use a min-heap to always pick the smallest available node
3. If no nodes are available but we haven't processed all nodes, there's a cycle → raise ValueError

For n=200,000 and 400,000 edges, we need efficient implementation:
- Use lists for adjacency (list of lists)
- Use heapq for the priority queue
- Handle duplicate edges (they just add multiple in-degrees, or we can just add the edge multiple times - actually duplicate edges just mean the same constraint, so we need to count in-degree correctly)

Wait, duplicate edges: if (a, b) appears twice, then b's in-degree should be 2 (not 1). When we process a, we decrement b's in-degree by 2. So we just add edges to the adjacency list multiple times, and count in-degree by counting all occurrences.

Actually, let me think again. If edge (a,b) appears twice, then in_degree[b] += 2. When we process a, we go through its adjacency list and for each edge (a, b), we decrement in_degree[b] by 1. So if there are two edges from a to b, we decrement twice. That's correct.

Let me write this:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap of nodes with in_degree == 0
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

This should be efficient:
- Building adjacency: O(E)
- Heap operations: O(E log V) for the heap operations
- Total: O(E log V) which for 400,000 edges and 200,000 nodes should be well within a second.

Let me verify: 400,000 * log(200,000) ≈ 400,000 * 18 ≈ 7,200,000 operations. That's fine.

Self-loop: if a == b, then in_degree[a] gets incremented, and when we try to process a, we'd need a to be in the heap with in_degree 0, but it has in_degree 1 (from the self-loop). So it'll never be popped, and we'll detect the cycle. Good.

Let me also make sure we don't need `from collections import defaultdict` - we're using plain lists, so no need.
