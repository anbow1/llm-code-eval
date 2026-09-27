Let me think about this problem carefully.

We need to find the lexicographically smallest topological ordering of a directed graph with n nodes and m edges.

Key constraints:
- n can be 200,000 and edges can be 400,000 - so O((n+m) log n) should be fine
- Lexicographically smallest valid ordering
- Handle duplicates
- Detect cycles (including self-loops) → raise ValueError

Approach:
1. Build adjacency list
2. Use Kahn's algorithm (BFS-based topological sort) but with a priority queue (min-heap) instead of a regular queue. By always picking the smallest available node, we get the lexicographically smallest topological ordering.

Steps:
1. Compute in-degrees
2. Initialize min-heap with all nodes having in-degree 0
3. Repeatedly extract the smallest node, add to result, decrease in-degree of neighbors, and push neighbors with in-degree 0
4. If result length < n, there's a cycle → raise ValueError

For performance with n=200_000 and m=400_000:
- We need to handle duplicate edges. Duplicate edges will increase in-degree multiple times, and when we process a node, we'll decrement in-degree for each duplicate. This should be fine - it just means we do extra work but the algorithm is still correct.
- Actually, wait. If there are duplicate edges, say (a, b) appears twice, then in_degree[b] gets incremented twice. When we process a, we decrement in_degree[b] twice. This is correct - b will only become available when all its prerequisites (counting duplicates) are satisfied.

Actually, let me reconsider. If (a, b) appears twice, the in-degree of b is 2 from this edge alone. When we process a, we iterate over its adjacency list which contains b twice, so we decrement in_degree[b] twice. This is correct.

For performance:
- Using a heap for the priority queue
- Building adjacency list as a list of lists
- The heap operations will be O(n log n) total for inserts and removes
- The edge processing is O(m)

Let me think about whether we need to deduplicate edges. If we have 400,000 edges and n=200,000, and there could be many duplicates, we might want to deduplicate to save memory and time. But actually, the problem says "duplicate edges may appear" - it doesn't say we need to handle them specially beyond not breaking. The algorithm works correctly with duplicates as I described above.

Actually, for performance, let's think: with 400,000 edges, even with duplicates, we just iterate through them. The heap will have at most n elements at any time. So the total complexity is O((n + m) log n) which should be fine for n=200k, m=400k.

Let me also handle self-loops: if (a, a) is an edge, then in_degree[a] is incremented, and when we try to process a, we'd decrement it. But a would never reach in-degree 0 unless there are other edges... actually a self-loop means a depends on itself, which is a cycle. Let me think...

If (a, a) exists:
- in_degree[a] gets +1
- a will never have in_degree 0 (unless it also has -1 from somewhere, which doesn't make sense)
- So a will never be extracted from the heap
- At the end, len(result) < n, so we detect the cycle

That works correctly.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and compute in-degrees
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes having in-degree 0
    heap = []
    for i in range(n):
        if in_degree[i] == 0:
            heapq.heappush(heap, i)
    
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
- Building adj and in_degree: O(m)
- Initial heap construction: O(n)
- Main loop: O(n log n + m) - each node is pushed and popped once from the heap (O(log n) each), and each edge is processed once
- Total: O((n + m) log n) which for n=200k, m=400k should be well within a second.

Actually, I can optimize the initial heap construction using heapq.heapify instead of pushing one by one:

```python
import heapq

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

This is cleaner and more efficient. Let me go with this.
