The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think through the requirements:

1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle detection (including self-loops) → raise ValueError
6. Must handle n=200,000 with 400,000 edges in ~1 second

For lexicographically smallest topological order, I need to use a min-heap (priority queue) instead of a regular queue in Kahn's algorithm.

Algorithm (Kahn's with min-heap):
1. Build adjacency list and in-degree count
2. Handle duplicate edges - need to be careful. If there are duplicate edges (a,b), they should only count once for in-degree. Actually, wait - if there are duplicate edges, do they count as multiple in-degree? No, for topological sort, a duplicate edge (a,b) appearing twice doesn't change the constraint. So I need to deduplicate edges.

Actually, let me reconsider. If edge (a,b) appears twice, it means a must come before b (twice, but the constraint is the same). So for in-degree counting, I should only count unique edges. Otherwise, the in-degree would be inflated and we'd never reduce it to zero.

So I need to deduplicate edges. I can use a set of tuples, or I can use sets for adjacency lists.

For performance with n=200,000 and 400,000 edges:
- Using sets for adjacency lists to handle duplicates
- Using heapq for the min-heap
- This should be O((V+E) log V) which for 200K nodes and 400K edges is manageable

Let me think about the implementation:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list with deduplication
    adj = [set() for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        if b not in adj[a]:  # deduplicate
            adj[a].add(b)
            in_degree[b] += 1
    
    # Initialize min-heap with all nodes of in-degree 0
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
        raise ValueError("cycle detected")
    
    return result
```

Wait, for performance, using sets for adjacency lists might be slow for 400K edges. Let me think...

Actually, with 400K edges and potentially many duplicates, using sets should be fine. The overhead of set operations is O(1) amortized.

But wait - creating 200,000 sets might have overhead. Let me think of alternatives.

Alternative: sort the edges first and deduplicate, then build adjacency lists as lists.

```python
def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = sorted(set(edges))
    
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
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
        raise ValueError("cycle detected")
    
    return result
```

Hmm, `set(edges)` on 400K tuples should be fast. And sorting 400K tuples is O(E log E) which is fine.

Actually, for self-loops: if a == b, then adding edge (a, a) means in_degree[a] increases by 1, and adj[a] contains a. When we process a, we decrement in_degree[a], but since a was in the heap (or will be), this creates a cycle. Actually, let's trace: if a==b, then in_degree[a] >= 1, so a won't be in the initial heap. And no other node will reduce in_degree[a] (unless there's another edge pointing to a). So a will never be processed, and len(result) < n, triggering the ValueError. Good.

Let me also consider: using `sorted(set(edges))` - is this efficient enough? For 400K edges, creating a set and sorting should take well under a second in Python.

Actually, for maximum performance, I could avoid the set/sort and just use a different deduplication strategy. But set(edges) should be fine for 400K elements.

Let me also consider: for the heap operations, with 200K nodes, each heappush/heappop is O(log n) ≈ 18 operations. Total heap operations are O(n log n) ≈ 3.6M operations. This should be fine.

I think the solution is good. Let me also consider whether to use `import heapq` at the top or inside the function. I'll put it at the top.

One more thought: for very large inputs, the `set(edges)` call creates a set of tuples. This should be memory-efficient enough for 400K tuples.

Let me finalize the solution.
