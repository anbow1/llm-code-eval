Let me analyze this problem:

1. We need topological sort that returns the lexicographically smallest valid ordering.
2. Nodes are 0 to n-1.
3. Edge (a, b) means a must come before b.
4. Duplicate edges may appear (so we need to handle that - either deduplicate or handle multiple counts).
5. Cycle detection (including self-loops) → raise ValueError.
6. Performance: n=200,000, edges=400,000 in about a second.

For lexicographically smallest topological sort:
- Use Kahn's algorithm (BFS-based) but with a min-heap (priority queue) instead of a regular queue.
- At each step, pick the smallest available node (in-degree 0).

For performance considerations:
- With n=200,000 and edges=400,000, using a heap is O((n + e) log n) which should be fine.
- We need to handle duplicate edges. If we have duplicate edges (a,b), we need to decrement in-degree only once when we process a, OR we need to track them properly. Actually, the cleanest way is to use a set of edges to deduplicate, but that might be memory expensive for 400,000 edges. Alternatively, we can just process them all - if we have two edges (a,b), then in_degree[b] gets incremented twice, and when we process a, we decrement it twice. That works correctly! So we don't need to deduplicate.

Wait, let me reconsider. If we have duplicate edges (a,b) appearing twice, then:
- in_degree[b] = 2 (from the two edges)
- When we process a, we iterate over all edges from a, and for each edge (a,b), we decrement in_degree[b]. So in_degree[b] goes from 2 to 0 after processing a. That's correct.

So we can just store all edges (including duplicates) in adjacency list. This is simpler and works correctly.

Algorithm:
1. Build adjacency list and in-degree array.
2. Push all nodes with in-degree 0 into a min-heap.
3. While heap is not empty:
   - Pop the smallest node.
   - Add to result.
   - For each neighbor, decrement in-degree. If it becomes 0, push to heap.
4. If result length < n, there's a cycle → raise ValueError.
5. Return result.

For self-loops: (a, a) means a must come before a, which is a cycle. With in-degree counting, in_degree[a] would be at least 1, so a can never reach in-degree 0 (unless all other in-edges are removed first, but the self-loop keeps it at least 1). Wait, actually if there's a self-loop (a,a), in_degree[a] gets incremented by 1. When we try to process a's outgoing edges, we'd decrement in_degree[a]... but wait, we only process outgoing edges when a is popped from the heap. If a has a self-loop, in_degree[a] >= 1 always (from the self-loop), so a can never be in the heap initially. Unless there are other nodes that point to a and get processed first, but the self-loop means in_degree[a] can never reach 0. So it correctly detects the cycle.

Actually wait - let me trace through more carefully. If we have edge (a, a):
- in_degree[a] += 1 (from the self-loop)
- adj[a].append(a)
- Initially, a's in-degree is at least 1, so a won't be in the heap.
- a can never be popped (its in-degree can never reach 0 because the self-loop edge is in its own adjacency list, and we only decrement in-degree when we process a node).
- So at the end, result will be shorter than n → ValueError. ✓

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap of nodes with in-degree 0
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

Performance analysis:
- Building adj list: O(E)
- Heapify: O(V)
- Each node is pushed and popped at most once: O(V log V)
- Each edge is processed once: O(E)
- Total: O((V + E) log V)

For V=200,000 and E=400,000:
- 600,000 * log(200,000) ≈ 600,000 * 18 ≈ 10,800,000 operations

This should be well within 1 second in Python.

Let me also consider: could there be memory issues with 400,000 edges in the adjacency list? 400,000 integers in lists should be fine.

One optimization: instead of `heap = [i for i in range(n) if in_degree[i] == 0]` followed by `heapq.heapify(heap)`, we could just use the list comprehension and heapify. This is already what I have.

I think this solution is correct and performant. Let me finalize it.
