We need to write a topological sort that returns the lexicographically smallest valid ordering.

Key requirements:
1. Nodes 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Handle duplicate edges
5. Raise ValueError on cycles (including self-loops)
6. Must handle n=200,000 with 400,000 edges in about a second

For lexicographically smallest topological sort, we use a min-heap (priority queue) instead of a regular queue. We always pick the smallest available node first.

Algorithm:
1. Build adjacency list and in-degree count
2. Use a min-heap (heapq) to process nodes with in-degree 0
3. When we pick a node, decrement in-degree of its neighbors; if a neighbor's in-degree becomes 0, push it to the heap
4. If we can't process all n nodes, there's a cycle → raise ValueError

For performance with 200,000 nodes and 400,000 edges:
- Use heapq for the priority queue
- Use a list of lists for adjacency
- Deduplicate edges? Actually, duplicate edges just mean we'd increment in-degree multiple times. We should handle this properly. If we have duplicate edges, we should only count each edge once for in-degree purposes. But actually, if we just count them, the in-degree would be inflated. Wait, no - if we have duplicate edges (a,b) appearing twice, the in-degree of b would be 2 instead of 1. But when we process a, we'd decrement b's in-degree by 2, so it would still work correctly. Actually, let me think again...

If edge (a,b) appears twice:
- in_degree[b] = 2
- When we process a, we decrement in_degree[b] by 2 (once for each edge in adjacency[a])
- So in_degree[b] becomes 0, which is correct.

So duplicates are handled naturally if we just add each edge to the adjacency list. The in-degree counts each occurrence, and we decrement for each occurrence. This works correctly.

Let me write the solution:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Use min-heap for lexicographically smallest ordering
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
- Heap operations: O(E log V) worst case, but in practice for 200k nodes and 400k edges, this should be well within a second.

Actually, let me think about whether the heapq approach is fast enough. 400,000 edges means at most 400,000 heap pushes/pops. Each is O(log n) where n is at most 200,000. So total is about 400,000 * log(200,000) ≈ 400,000 * 18 ≈ 7.2 million operations. Python can handle this in well under a second.

Let me finalize the solution.
