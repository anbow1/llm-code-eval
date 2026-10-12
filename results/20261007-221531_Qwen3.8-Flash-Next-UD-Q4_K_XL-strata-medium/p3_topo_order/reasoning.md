The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think through the requirements:

1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering - this means at each step, we pick the smallest available node
4. Duplicate edges may appear - need to handle in-degree counting correctly
5. If cycle exists (including self-loop), raise ValueError
6. Must handle n = 200,000 with 400,000 edges efficiently

For lexicographically smallest topological order, the classic approach is Kahn's algorithm with a min-heap (priority queue) instead of a regular queue. At each step, we pick the node with the smallest index that has in-degree 0.

Key considerations:
- Duplicate edges: If there are duplicate edges (a, b), we need to make sure we don't count them multiple times for in-degree, OR we need to handle them in the adjacency list. Actually, the simplest approach is to count in-degree including duplicates, and also add duplicates to the adjacency list. When we process node `a`, we decrement in-degree of `b` for each occurrence. This naturally handles duplicates.

Wait, let me think again. If we have edges [(0,1), (0,1)], then in-degree of 1 is 2. When we process 0, we decrement in-degree of 1 twice, bringing it to 0. This works correctly.

Alternative: deduplicate edges. But with 400,000 edges, deduplication might be expensive. Actually, the counting approach handles duplicates naturally.

- Self-loop: edge (a, a) means a must come before a, which is a cycle. With the counting approach, in-degree of a starts at 1 (from the self-loop), and when we try to process a, its in-degree is never 0 (unless it's decremented by itself, but it can't be since it's never added to the heap). Actually wait - if a has a self-loop, its in-degree is at least 1, and no other node can reduce it (only a can reduce it via the self-loop edge, but a can't be processed until its in-degree is 0). So the cycle detection at the end (output length < n) will catch it.

Actually, let me reconsider. With a self-loop (a, a):
- in_degree[a] includes this self-loop
- adj[a] includes a (from the self-loop)
- a's in-degree is at least 1, so it won't be added to the heap initially (unless it also has other in-degree 0... no, the self-loop makes it at least 1)
- So a never gets into the heap, and at the end, len(result) < n, we raise ValueError. Correct.

For efficiency with n=200,000 and 400,000 edges:
- Use adjacency list (list of lists)
- Use heapq for the min-heap
- O((n + m) log n) which should be fine

Let me write the code:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degree array
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes of in-degree 0
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

This should work. Let me verify:
- Duplicate edges: handled naturally (both in-degree and adjacency list count duplicates)
- Self-loop: caught by the cycle check at the end
- Lexicographically smallest: guaranteed by using min-heap (always pick smallest available node)
- Performance: O((n + m) log n) with heapq, should handle 200k nodes and 400k edges easily

One optimization: for the initial heap construction, since we're iterating 0..n-1 in order, the list is already sorted, so heapify is O(n) but also the list is already a valid heap. Actually, `heapq.heapify` on an already sorted list is O(n) since it's already a valid heap. So that's fine.

This looks correct and efficient. Let me finalize.
