We need to write a topological sort that returns the lexicographically smallest valid ordering.

Key points:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle (including self-loop) → raise ValueError
6. Must handle n=200,000 with 400,000 edges in about a second

For lexicographically smallest topological order, we use a min-heap (priority queue) based Kahn's algorithm:
- Compute in-degrees
- Start with all nodes that have in-degree 0
- Use a min-heap to always pick the smallest available node
- Process nodes, decrement in-degrees of neighbors
- If at any point the heap is empty but we haven't processed all nodes, there's a cycle

For performance with 200k nodes and 400k edges:
- Use adjacency list
- Use a heap (heapq) for the priority queue
- Handle duplicate edges carefully - if we have duplicate edges, we need to count them in in-degree but when we process, we should decrement properly. Actually, duplicate edges just mean the in-degree is higher. When we process node a, for each edge (a, b), we decrement b's in-degree. If there are duplicate edges, we just decrement multiple times. But that's fine.

Wait, actually with duplicate edges, if we have two edges (a, b), then b's in-degree is incremented by 2. When we process a, we decrement b's in-degree by 2 (once for each edge). That's correct.

Let me think about performance:
- Building adjacency list: O(E)
- Computing in-degrees: O(E)
- Processing with heap: O((V + E) log V)
- For 200k nodes and 400k edges, this should be fast enough.

Let me code this up:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes that have in-degree 0
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
- Self-loop: (a, a) → in_degree[a] increases by 1, but a will never reach in-degree 0, so it won't be added to the heap. Result will have fewer than n elements → ValueError. ✓
- Cycle: similar, nodes in the cycle never get in-degree 0. ✓
- Lexicographically smallest: by always picking the smallest available node from the min-heap. ✓
- Duplicate edges: in_degree is incremented multiple times, and decremented multiple times when processing. ✓
- Performance: O((V+E) log V) which for 200k + 400k is manageable. ✓

This looks good. Let me finalize.
