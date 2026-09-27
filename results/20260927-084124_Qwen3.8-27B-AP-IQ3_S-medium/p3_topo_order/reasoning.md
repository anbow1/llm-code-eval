Let me analyze this problem:

1. We need topological sort of a directed graph with nodes 0..n-1
2. We need lexicographically smallest valid ordering
3. Duplicate edges may appear
4. Cycles (including self-loops) should raise ValueError
5. Must be efficient for n=200,000 and edges=400,000

For lexicographically smallest topological sort, we use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue.

Algorithm:
1. Build adjacency list and in-degree array
2. Deduplicate edges (or handle duplicates - actually duplicates just mean we need to be careful with in-degree counting, but since we're just doing topological sort, duplicate edges just mean we increment in-degree multiple times for the same edge... wait, no. If we have duplicate edges (a,b) appearing twice, we'd increment in-degree of b by 2, but when we process a, we'd decrement it by 2 (since we iterate over adjacency list). So actually duplicates are handled naturally if we add them to the adjacency list. But to be efficient with 400,000 edges, we should probably deduplicate or at least handle it properly.

Actually wait - let me reconsider. If we have duplicate edges, and we add both to the adjacency list, then when we process node `a`, we'll decrement `b`'s in-degree twice. That's correct behavior since we incremented it twice. So duplicates are handled naturally.

But for efficiency with 200K nodes and 400K edges, we should use efficient data structures.

Let me think about the approach:

1. Build adjacency list: `adj[a].append(b)` for each edge
2. Compute in-degrees
3. Use a min-heap (heapq) for the available nodes
4. Process: pop smallest, append to result, for each neighbor decrement in-degree, if 0 push to heap
5. If result length < n, there's a cycle

For efficiency with 200K nodes and 400K edges:
- Using list of lists for adjacency
- Using heapq for the min-heap
- This should be O((n + e) log n) which is fine

Let me think about whether we need to deduplicate. With 400K edges, storing them as-is should be fine. The adjacency list approach handles duplicates correctly.

Wait, but what about self-loops? A self-loop (a, a) means a depends on itself, which is a cycle. In the in-degree approach, a self-loop would increment in-degree of a by 1, and since a can never have its in-degree reduced to 0 (it depends on itself), it will never be processed. This correctly detects the cycle.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1
    
    heap = []
    for i in range(n):
        if in_deg[i] == 0:
            heapq.heappush(heap, i)
    
    result = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                heapq.heappush(heap, neighbor)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

This should work. Let me verify:
- n=200K, edges=400K: Building adj list is O(e), computing in-degrees is O(e), heap operations are O((n+e) log n). Total: O((n+e) log n) which for 200K + 400K = 600K elements with log(200K) ≈ 18, that's about 10.8M operations. Should be well within a second in Python... actually Python might be a bit slow. Let me think if there's a way to optimize.

Actually for Python with 200K nodes and 400K edges, the heap operations dominate. Each edge causes one decrement and potentially one push. The heap has at most n elements. 400K * log(200K) ≈ 400K * 18 = 7.2M heap operations. In Python, heapq operations are fast (they're in C), so this should be fine.

Let me also consider: do we need to handle the case where n=0? If n=0, return empty list. The code handles that naturally since there are no nodes to process.

What about nodes with no edges? They start with in-degree 0 and get pushed to the heap.

I think this solution is correct and efficient. Let me finalize it.
