Let me analyze this problem:

1. We need topological sort of a DAG with n nodes (0 to n-1)
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Handle duplicate edges
5. Detect cycles (including self-loops)
6. Must be efficient for n=200_000, edges=400_000

For lexicographically smallest topological ordering, we use a min-heap (priority queue) instead of a simple queue. At each step, we pick the smallest available node (one with in-degree 0).

For efficiency with n=200_000 and 400_000 edges:
- Use a heap for the available nodes
- Use adjacency list for edges
- Handle duplicate edges by tracking them or using a set (but sets might be slow for 400k edges... actually 400k is fine)
- Actually, for duplicate edges, we can just use a list and decrement in-degree for each edge. Wait, no - if there are duplicate edges, we need to handle them properly. If edge (a,b) appears twice, we should only count it once for in-degree purposes. Otherwise when we process a, we'd decrement b's in-degree by 2 instead of 1.

Wait, let me think again. If we store all edges (including duplicates) in the adjacency list, and compute in-degree by counting all edges (including duplicates), then when we process node a, we decrement in-degree of b for each edge from a to b. This works correctly even with duplicates! Because if (a,b) appears twice, in-degree of b is incremented by 2, and when we process a, we decrement by 2. So b's in-degree goes from 2 to 0. That's correct.

So we don't need to deduplicate. We just:
1. Build adjacency list with all edges
2. Compute in-degrees (counting duplicates)
3. Use a min-heap for nodes with in-degree 0
4. Process: pop smallest, add to result, for each neighbor decrement in-degree, if it becomes 0 push to heap

For cycle detection: if the result has fewer than n elements, there's a cycle.

For self-loops: a self-loop (a, a) means a depends on itself, which is a cycle. With the above approach, in-degree of a is incremented by 1, and when we try to process a (if it ever gets in-degree 0), we'd decrement it... but it starts at 1 (from the self-loop) so it won't be 0 unless there are other incoming edges that get processed. Actually, a self-loop means a will never reach in-degree 0 (unless we handle it specially). Wait:

If a has a self-loop, in-degree[a] includes 1 from the self-loop. When a is processed, we look at its neighbors, which include a itself, and we'd decrement in-degree[a]. But a is already processed at that point... Hmm, actually in the algorithm, we pop a from the heap (meaning in-degree[a] == 0), then for each neighbor of a, we decrement. If a is its own neighbor, we'd decrement in-degree[a] to -1, but a is already processed. The issue is that with a self-loop, in-degree[a] starts at 1, so a would never be pushed to the heap (since we only push when in-degree becomes 0). So a would never be processed, and the result would have n-1 elements, triggering the cycle detection. 

Wait, but what if a has in-degree 2 (one from self-loop, one from another node c)? Then when c is processed, in-degree[a] becomes 1, not 0. So a never enters the heap. Correct - this detects the cycle.

What if a only has a self-loop and no other incoming edges? in-degree[a] = 1. It's never 0, so never pushed. Result has n-1 elements. Cycle detected. Correct.

For performance with n=200_000, edges=400_000:
- Adjacency list as list of lists: O(n + E)
- Heap operations: O(E log n) which is 400_000 * log(200_000) ≈ 400_000 * 18 = 7.2M operations. Should be fine in ~1 second.
- Python's heapq is efficient enough.

Let me think about memory: 400_000 edges stored in adjacency list. Each is a Python int. Should be fine.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1
    
    # Min-heap with nodes that have in-degree 0
    heap = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)
    
    result = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                heapq.heappush(heap, v)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

Wait, for performance with 400_000 edges, using a list of lists for adj should be fine. The heap operations will be the bottleneck but 400_000 * log(200_000) should be manageable.

Let me think about whether there are any edge cases:
- n = 0: no nodes, return empty list. The heap is empty, result is empty, len(result) == n == 0. Correct.
- n = 1, no edges: heap = [0], pop it, result = [0]. Correct.
- Self-loop: (0, 0) with n=1. in_deg[0] = 1. heap is empty. result is empty. len(result) != 1. Raise ValueError. Correct.
- Duplicate edges: (0,1) twice, n=2. in_deg[1] = 2. adj[0] = [1, 1]. heap = [0]. Pop 0, result = [0]. Process adj[0]: in_deg[1] = 2-1 = 1, then 1-1 = 0. Push 1. Pop 1. result = [0, 1]. Correct.

I think this solution is correct and efficient. Let me finalize it.

Actually, for maximum performance, I could use local variable references to avoid attribute lookups. Let me optimize slightly:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1
    
    heap = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)
    
    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush
    
    while heap:
        u = heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                heappush(heap, v)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

This should be efficient enough. The main loop does O(E) total work on the adjacency lists plus O((n+E) log n) for heap operations. For n=200k, E=400k, this should complete well within a second in Python.
