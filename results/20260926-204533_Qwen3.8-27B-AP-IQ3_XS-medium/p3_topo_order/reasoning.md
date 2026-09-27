Let me analyze this problem:

1. Topological sort of a directed graph with n nodes (0..n-1)
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges possible
5. Cycle detection (including self-loops) → raise ValueError
6. Must handle n=200_000 with 400_000 edges in ~1 second

For lexicographically smallest topological ordering, I need to use a min-heap (priority queue) instead of a regular queue. At each step, I pick the node with smallest in-degree-0 value.

Algorithm:
1. Build adjacency list
2. Compute in-degrees (but handle duplicate edges - if same edge appears multiple times, in-degree should only count once? Wait, no. Let me re-read. "Duplicate edges may appear." This means the same (a,b) pair might appear multiple times in the edges list. For topological sort, duplicates don't change the result but affect in-degree counting.

Wait, actually if I count in-degree by just incrementing for each edge, duplicates will inflate the in-degree. But that's actually fine - as long as I decrement the same number of times. When I process node a, I iterate over all its outgoing edges (including duplicates), and decrement b's in-degree for each. So if (a,b) appears twice, b's in-degree is 2 higher, but when I process a, I decrement it twice. So it works out correctly.

Actually wait - let me think more carefully. If I store duplicates in the adjacency list, then when I process node a, I'll see b twice and decrement b's in-degree twice. That's correct because b's in-degree was incremented twice. So duplicates are handled naturally.

However, for performance with 400_000 edges, storing duplicates is fine.

Let me think about the approach:
- Use a min-heap (heapq) for the lexicographically smallest selection
- Use an array for in-degrees
- Use a list of lists for adjacency

For performance with n=200_000 and edges=400_000:
- Building adjacency list: O(E)
- Initial heap insertion: O(n log n)
- Processing: O((n + E) log n)

This should be well within 1 second in Python.

Let me code this:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Check for self-loops (these create cycles)
    # Actually, a self-loop means a node has an edge to itself, which creates a cycle.
    # But our algorithm will handle it: if a has in-degree > 0 due to self-loop, 
    # it will never be processed unless the cycle is broken, which it can't be.
    # So the cycle detection is: if we can't process all n nodes, there's a cycle.
    
    heap = []
    for i in range(n):
        if in_degree[i] == 0:
            heapq.heappush(heap, i)
    
    result = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                heapq.heappush(heap, v)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

Wait, let me think about performance. With n=200_000 and E=400_000:
- Building adj: 400_000 iterations - fine
- Initial heap: 200_000 pushes worst case - O(n log n)
- Main loop: 200_000 pops + 400_000 decrements + up to 200_000 pushes

Total heap operations: ~400_000 pops/pushes, each O(log n). Should be fine.

Actually, let me think about whether duplicates could cause issues. If edge (a,b) appears 1000 times, then in_degree[b] is incremented 1000 times, and when we process a, we decrement it 1000 times. That's correct behavior. The node b won't be added to the heap until all 1000 decrements are done (i.e., in_degree reaches 0). This is correct.

The only concern is memory: adj list will have 400_000 entries total. That's fine.

Let me also consider: what if n=0? Then edges should be empty, and we return []. The code handles this naturally.

What about self-loops? If edge (a,a) exists, in_degree[a] is incremented by 1. Node a can only be added to heap when in_degree[a] == 0, but since a depends on itself, it will never reach 0 (unless processed already, but it can't be processed because it's not in the heap). So the result will have length < n, and we'll raise ValueError. Good.

I think this solution is correct and efficient. Let me finalize it.
