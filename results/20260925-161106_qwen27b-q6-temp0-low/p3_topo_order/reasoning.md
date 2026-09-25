Let me think through this problem:

1. We need topological sort that returns the lexicographically smallest valid ordering.
2. Nodes are 0..n-1, edges (a, b) mean a must come before b.
3. Handle duplicate edges.
4. Detect cycles (including self-loops).
5. Must be efficient for n=200,000 and edges=400,000.

For lexicographically smallest topological order, I should use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue.

Algorithm:
1. Build adjacency list and in-degree array.
2. Use a min-heap (heapq) to always pick the smallest available node.
3. Process nodes, reducing in-degrees of neighbors.
4. If processed count < n, there's a cycle → raise ValueError.

For performance with n=200,000 and 400,000 edges:
- Using heapq (min-heap) is O((V + E) log V) which should be fine.
- Need to handle duplicate edges - I should use a set or just deduplicate. Actually, using a set of edges would work but for 400,000 edges, using a set is fine. Alternatively, I can use a list of sets for adjacency to avoid duplicate in-degree decrements.

Wait, let me think about this more carefully. If I have duplicate edges, and I just add them all to the adjacency list, then when I process node a, I'll decrement in-degree of b multiple times. That would be wrong.

So I need to deduplicate edges. Options:
1. Use a set of tuples for edges, then build adjacency list from unique edges.
2. Use a list of sets for adjacency.

Option 1: Create a set of edges, then build adjacency list. This uses O(E) space for the set plus O(E) for the adjacency list. For 400,000 edges, this should be fine.

Option 2: Use list of sets. Same memory, slightly different performance characteristics.

Let me go with option 1 for clarity: deduplicate edges using a set, then build adjacency list.

Actually, for 400,000 edges, a set of tuples is fine. Let me write the solution:

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
    
    # Min-heap of available nodes
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

Let me verify:
- Self-loop: (a, a) would mean a must come before a. in_degree[a] would be incremented, and adj[a] would contain a. When we process a (if it ever gets to 0 in-degree), we'd decrement its own in-degree... but wait, if there's a self-loop, in_degree[a] starts at 1 (from the self-loop), so it can never reach 0 unless there's no self-loop. So it would never be added to the heap, and we'd detect the cycle. Good.

- Duplicate edges: handled by the set.

- Lexicographically smallest: using min-heap ensures we always pick the smallest available node.

- Performance: O((V + E) log V) with the heap. For V=200,000 and E=400,000, this is about 600,000 * 18 ≈ 10.8 million operations, which should be well under a second in Python... hmm, actually Python might be a bit slow. Let me think about whether there's a way to speed it up.

Actually, for Python with 200K nodes and 400K edges, the heapq operations should be fine. The main bottleneck would be the set of edges (400K tuples) and the heap operations. This should be around 0.5-1 second in CPython, which is acceptable.

Let me also consider: could I use `sys.stdin` or any I/O? No, the problem says no input() and no printing.

I think this solution is correct and efficient. Let me finalize it.
