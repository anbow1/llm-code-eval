We need to write a topological sort that returns the lexicographically smallest valid ordering.

Key requirements:
1. Nodes 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle (including self-loop) → raise ValueError
6. Handle n=200,000 with 400,000 edges in about a second

For lexicographically smallest topological order, we use a min-heap (priority queue) instead of a regular queue. At each step, we pick the smallest available node (in-degree 0).

Algorithm:
1. Build adjacency list and in-degree array
2. Use a min-heap for nodes with in-degree 0
3. Pop the smallest node, add to result, decrement in-degrees of neighbors
4. If a node's in-degree becomes 0, push it into the heap
5. If we can't process all n nodes, there's a cycle → raise ValueError

For performance with 200k nodes and 400k edges:
- Use lists for adjacency (not sets)
- Handle duplicate edges: we can either use a set per node to deduplicate, or just process duplicates (in-degree will be incremented multiple times, and we decrement multiple times). Actually, if we have duplicate edges, the in-degree count will be higher, but that's fine as long as we consistently increment and decrement. Wait, no - if there are duplicate edges, we'd increment in-degree multiple times and decrement multiple times. That's actually fine because the net effect is the same. But it's wasteful. For 400k edges, even with duplicates, processing them all is fine.

Actually, let me think about this more carefully. If we have duplicate edges (a, b) appearing twice, we'd add b to a's adjacency list twice, and increment b's in-degree twice. When we process a, we'd decrement b's in-degree twice. This is correct behavior - the in-degree just needs to reach 0.

But for performance, with 400k edges, just processing them all is fine. No need to deduplicate.

Let me write the solution:

```python
import heapq

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

This should be efficient. The heap operations are O(log n) each, and we do them O(n + E) times total. For 200k nodes and 400k edges, this should run well within a second.

Let me verify:
- Self-loop: edge (a, a) → in_degree[a] += 1, adj[a].append(a). When we try to process a, it has in-degree 1, so it never gets into the heap. Result will have fewer than n elements → ValueError. ✓
- Cycle: similar, nodes in cycle never reach in-degree 0. ✓
- Lexicographically smallest: by always picking the smallest available node from the min-heap. ✓
- Duplicate edges: in-degree is incremented multiple times, decremented multiple times. Net effect is correct. ✓

This looks good. Let me finalize.
