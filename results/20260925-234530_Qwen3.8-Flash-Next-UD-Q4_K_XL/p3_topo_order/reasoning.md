The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think about the approach:

1. **Lexicographically smallest topological order**: This requires using a min-heap (priority queue) instead of a regular queue in Kahn's algorithm. Instead of using a FIFO queue for nodes with in-degree 0, we use a min-heap so we always pick the smallest numbered node first.

2. **Handling duplicate edges**: If there are duplicate edges (a, b) appearing multiple times, we need to be careful about in-degree counting. If we count duplicates in in-degree, then when we process node a, we'd decrement in-degree of b multiple times, which is wrong. So we should deduplicate edges when computing in-degrees, or use a set of adjacency lists.

   Actually, let me think more carefully. If edge (a, b) appears twice, and we build adjacency list with both, then in_degree[b] = 2 for that single predecessor. When we process a, we'd iterate over its adjacency list and decrement in_degree[b] twice, making it go from 2 to 0, which is correct in terms of the algorithm - it just means b becomes ready after processing a. So actually duplicates in the adjacency list would work correctly with Kahn's algorithm because:
   - in_degree[b] gets incremented for each duplicate edge
   - when a is processed, in_degree[b] gets decremented for each duplicate edge
   - Net effect is the same as having one edge

   Wait, but what about self-loops? If (a, a) appears, in_degree[a] gets incremented, and when a is processed (if it ever is), in_degree[a] gets decremented. But a can never be processed because its in-degree is at least 1 (from the self-loop). So it will never enter the queue. The cycle detection (checking if len(result) < n) will catch this.

   Actually wait - if there's a self-loop (a, a), then in_degree[a] >= 1, so a never enters the initial queue. If a has other predecessors too, it definitely won't enter. If a's only "predecessor" is itself via self-loop, it won't enter. So the result will have fewer than n elements, and we raise ValueError. Good.

   For duplicate edges: if (a,b) appears 3 times, in_degree[b] += 3, and adj[a] has b three times. When a is processed, we decrement in_degree[b] three times. This is correct - it's equivalent to having one edge. So we don't strictly need to deduplicate.

   But for performance, having duplicates in the adjacency list means more iterations. With 400,000 edges total, even with duplicates, it should be fine. Let me not deduplicate for simplicity, since 400K edges is manageable.

   Actually wait - what if there are duplicate edges that cause issues? Let's say we have edges [(0,1), (0,1)]. in_degree[1] = 2. adj[0] = [1, 1]. When we process 0, we do in_degree[1] -= 1 twice, going from 2 to 0. That's correct. So duplicates are handled naturally.

3. **Cycle detection**: If after the algorithm, len(result) < n, there's a cycle.

4. **Performance for n=200,000, edges=400,000**: 
   - Using heapq for the min-heap: O((n + m) log n) which should be fine.
   - Using adjacency list (list of lists) for O(1) access.
   - Avoid using sets for adjacency if possible (list of lists is faster for iteration).

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap for lexicographically smallest order
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

Let me verify:
- n=200,000, m=400,000: heapify is O(n), each push/pop is O(log n). Total operations: n pushes + n pops for the heap, plus m edge traversals. So O(n + m + n log n) ≈ 200K + 400K + 200K * 18 ≈ ~4 million operations. Should be well under a second in Python... actually Python might be slower. Let me think about optimizations.

- For Python, heapq operations are O(log n) in C (the heapq module uses C implementation). The main bottleneck would be the loop over edges. 400K iterations in Python should be fine (< 1 second).

- One potential issue: if there are many duplicate edges, the adjacency list gets large but we still only do m iterations total (one per edge entry in adjacency list). So it's bounded by the number of edges passed in.

I think this solution is clean and efficient. Let me also handle the edge case where n=0 (should return empty list).

Let me also make sure self-loops are caught: if (a, a) is in edges, in_degree[a] gets incremented. If a has no other incoming edges, in_degree[a] >= 1, so it won't be in the initial heap. It will never be processed. Result length < n → ValueError. Correct.

What about (a, a) where a is also in the heap? That can't happen because in_degree[a] would be at least 1 from the self-loop.

The solution looks correct and efficient. Let me finalize it.
