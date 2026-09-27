Let me think about this problem:

1. We need topological ordering with lexicographically smallest result
2. Nodes are 0..n-1
3. Edge (a, b) means a before b
4. Duplicate edges may appear
5. Cycle detection (including self-loops)
6. Must handle n=200_000 with 400_000 edges efficiently

For lexicographically smallest topological order, we use a min-heap (priority queue) instead of a regular queue. At each step, we pick the smallest node with in-degree 0.

For performance with n=200_000 and 400_000 edges:
- We need efficient data structures
- Python's `heapq` should work fine for this size
- We need to be careful about memory and speed

Let me think about the approach:
1. Build adjacency list and in-degree array
2. Use a min-heap of nodes with in-degree 0
3. Pop smallest, add to result, decrement in-degrees of neighbors
4. If a neighbor's in-degree becomes 0, push it
5. If result length < n, there's a cycle

For duplicate edges: We need to handle them. If we have duplicate edges (a,b), the in-degree of b will be incremented twice, but it will be decremented twice when we process a. So duplicates naturally work correctly with the in-degree approach.

Wait, but we need to be careful. If we have duplicate edges, when we process node `a`, we'll iterate over all its outgoing edges (including duplicates) and decrement in-degree of `b` each time. So if there are 2 edges (a,b), in-degree of b is 2, and when we process a, we decrement it by 2, bringing it to 0. That's correct.

Actually, let me reconsider. If we store the adjacency list with duplicates, then when processing node a, we'll see b twice and decrement in-degree[b] twice. That's correct behavior.

For performance:
- Using lists for adjacency list
- Using heapq for the priority queue
- Using a regular list for in-degrees

Let me think about the self-loop case: if a==b, that's a cycle. The in-degree approach will handle this: node a has an edge to itself, so in-degree[a] >= 1, meaning it can never reach 0 (unless it was already 0 and the self-loop makes it 1... wait no).

Actually with a self-loop (a,a): in-degree[a] gets incremented by 1. When we process a (if it ever gets in-degree 0), we'd try to decrement in-degree[a]. But if a has a self-loop, in-degree[a] starts at 1 (or more), so it won't be in the heap initially unless it has no other incoming edges.

Wait, let me think more carefully. If node a has only a self-loop (a,a), then in-degree[a] = 1. It won't be in the heap. So it'll be detected as a cycle at the end (result length < n). Good.

If node a has edges (x,a) and (a,a), then in-degree[a] = 2. After processing x, in-degree[a] becomes 1. Still not 0. So it stays undetected until the end. Good.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes having in-degree 0
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

This should work. Let me verify the complexity:
- Building adjacency list: O(E)
- Heapify: O(n)
- Main loop: each node is pushed and popped once (O(n log n)), and each edge is processed once (O(E)). Total: O((n + E) log n)

For n=200_000 and E=400_000: (200000 + 400000) * log(200000) ≈ 600000 * 18 ≈ 10.8 million operations. That should be well within a second in Python.

Actually, wait. Let me reconsider the performance. In Python, 10 million heap operations might be tight. Let me think...

Actually, the heap operations are: n pushes and n pops (for the initial nodes) plus E decrements. The total heap operations are at most n pushes (initial heapify counts as O(n) but let's say n pushes) + E pushes (when neighbors reach 0) + n pops. So at most n + E pushes + n pops = 200000 + 400000 + 200000 = 800000 heap operations. Each is O(log n) ≈ O(18). That's about 14.4 million basic operations. Should be fine in Python within a second.

Let me also consider: the adjacency list building with 400_000 edges - appending to lists is O(1) amortized. Total O(E). Fine.

I think this solution is correct and efficient. Let me finalize it.
