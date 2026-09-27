We need to write a topological sort that returns the lexicographically smallest valid ordering. The approach:

1. Build adjacency list and in-degree array.
2. Use a min-heap (priority queue) to always pick the smallest available node.
3. Kahn's algorithm with a heap instead of a queue.

For n=200,000 and 400,000 edges, we need efficient implementation.

Let me think about the algorithm:
- Build adjacency list: for each edge (a, b), add b to adj[a], increment in_degree[b].
- Use a min-heap for nodes with in_degree 0.
- Pop the smallest node, add to result, decrement in_degree of neighbors.
- If a neighbor's in_degree becomes 0, push it to the heap.
- If we can't process all n nodes, there's a cycle → raise ValueError.

For duplicates: if we have duplicate edges, we need to handle them. If edge (a,b) appears twice, we should only count it once for in-degree. But wait - if we just build the adjacency list with duplicates, the in-degree would be incremented twice. Then when we process a, we'd decrement twice. That's actually fine - it's like having multiple edges. The in-degree would be 2, and when we process a, we'd decrement it twice (since b appears twice in adj[a]). So duplicates are naturally handled.

Actually wait - let me reconsider. If edge (a,b) appears twice:
- adj[a] = [b, b]
- in_degree[b] = 2
- When we process a, we iterate over adj[a], see b twice, decrement in_degree[b] twice.
- This is correct behavior.

So duplicates are naturally handled without special treatment.

For self-loops: edge (a, a) means a must come before a, which is a cycle. With the algorithm:
- adj[a] includes a
- in_degree[a] is incremented by 1
- a is never added to the heap (in_degree stays 1)
- We'll detect that we couldn't process all nodes → cycle → ValueError.

Performance considerations for n=200,000, edges=400,000:
- Use list of lists for adjacency
- Use heapq for the min-heap
- Use array for in_degree

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

This should be efficient. Let me verify:
- Building adj: O(E)
- Heapify: O(n)
- Main loop: each node popped once (O(n log n)), each edge processed once (O(E)), each neighbor potentially pushed (O(E log n))
- Total: O((n + E) log n) which for 200k nodes and 400k edges is fine.

Actually, let me think about whether we need to be more careful. 400,000 edges, 200,000 nodes. The heap operations: we push at most E nodes total (each edge can cause at most one push), and pop n nodes. So total heap operations are O(E + n) = O(600,000), each O(log n) ≈ O(log 200000) ≈ 18. So about 10 million operations. Should be well under a second in Python.

Let me also consider: do we need to handle the case where n=0? If n=0, edges should be empty, and we return [].

Let me also think about edge cases:
- n=1, no edges: return [0]
- n=1, self-loop (0,0): in_degree[0]=1, heap is empty, result is empty, len(result) != 1 → ValueError. Good.

I think this solution is correct and efficient. Let me finalize it.
