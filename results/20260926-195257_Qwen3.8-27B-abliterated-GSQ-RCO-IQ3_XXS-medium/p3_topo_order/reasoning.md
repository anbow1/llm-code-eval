The user wants a topological sort function that:
1. Takes n nodes (0..n-1) and a list of edges (a, b) meaning a before b
2. Returns lexicographically smallest valid ordering
3. Handles duplicate edges
4. Raises ValueError on cycles (including self-loops)
5. Must be performant: n=200,000, edges=400,000 in ~1 second

For lexicographically smallest topological order, I should use a min-heap (priority queue) instead of a regular queue.

For performance with 200k nodes and 400k edges:
- Use adjacency list
- Use a heap (heapq) for the min-queue
- Handle duplicates: I can either deduplicate edges or just handle them naturally (duplicate edges just increment in-degree twice, but when processing, we decrement twice). Actually, the cleanest way is to deduplicate. But with 400k edges, deduplication via set could be O(E) which is fine.

Wait, let me think about performance. 400k edges, 200k nodes. Using a heap:
- Building adjacency: O(E)
- Computing in-degrees: O(E)
- Heap operations: O(E log V) in the worst case, but with 200k nodes and 400k edges, that's 400k * log(200k) ≈ 400k * 18 ≈ 7.2M operations. That should be fine in Python for ~1 second.

Actually, let me think about whether I need to deduplicate. If I don't deduplicate, duplicate edges will cause the in-degree to be incremented multiple times, and when I process node 'a', I'll decrement the in-degree of 'b' multiple times. That's actually correct behavior - it's just doing extra work. But it's O(E) where E includes duplicates.

Actually, the issue is: if I have duplicate edges (a,b) appearing twice, the in-degree of b gets incremented twice. When I process a, I decrement b's in-degree twice. That's correct. So I don't strictly need to deduplicate for correctness. But for performance, it's fine either way.

Let me think about self-loops: if a == b, that's a cycle. I can detect this during edge processing or during the topological sort (a node with in-degree > 0 that never reaches 0).

Actually, the simplest approach:
1. Build adjacency list and in-degree array
2. Push all nodes with in-degree 0 into a min-heap
3. Pop the smallest, add to result, for each neighbor, decrement in-degree, push if 0
4. If result length != n, raise ValueError

For self-loops: (a, a) means a must come before a, which is a cycle. In the in-degree approach, a's in-degree will include itself, so it will never reach 0 (unless all other in-edges are processed first, but then the self-edge keeps it at 1). Wait, no. If a has a self-loop, its in-degree is at least 1. When we process a... wait, we can't process a until its in-degree is 0. But the self-loop means a depends on itself. So a's in-degree will be at least 1 from the self-loop, and it will never be decremented (because we never process a to decrement its own in-degree). So a will never enter the heap. Correct - it will be caught as a cycle.

Wait, actually let me re-examine. If a has a self-loop (a,a), then in_degree[a] >= 1. a won't be pushed to the heap initially (unless in_degree[a] is 0, but it's at least 1). a can only have its in_degree decremented when some predecessor is processed. The self-loop means a is its own predecessor. But a is never processed (since it's never in the heap), so the self-loop's contribution to in_degree[a] is never decremented. So a stays at in_degree >= 1 forever. Correct.

For performance, I'll use:
- List of lists for adjacency
- Array for in-degrees
- heapq for the priority queue
- List for the result

Let me code this up:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1
    
    # Min-heap of nodes with in-degree 0
    heap = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)
    
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

Wait, but for performance with 400k edges, using a list of lists for adjacency should be fine. The heap operations are the bottleneck. Let me think...

Actually, for 200k nodes, we start with potentially many nodes in the heap. heapify is O(n). Each heappop and heappush is O(log n). We have at most n heappops and n heappushes (each node enters the heap at most once). So total heap operations: O(n log n) for pushes and pops, plus O(E) for iterating edges. Total: O((n + E) log n) which for 200k + 400k = 600k * log(200k) ≈ 600k * 18 ≈ 10.8M. That should be well under 1 second in Python.

One concern: duplicate edges. If there are 400k edges but many are duplicates, the adjacency list will have duplicates. This means when we process a node, we'll iterate over duplicate neighbors. But it's still O(E) total across all nodes. So it's fine.

Actually wait - if there are duplicate edges, we increment in_deg multiple times and decrement multiple times. That's correct. For example, if (a,b) appears twice, in_deg[b] is incremented twice, and when we process a, we decrement in_deg[b] twice. Net effect is the same as one edge. Correct.

Let me also consider: should I deduplicate for performance? With 400k edges, even if all are unique, it's fine. If many are duplicates, the adjacency list is larger than necessary but still O(E). I think it's fine without deduplication.

Let me also make sure I'm not using collections.defaultdict (slightly slower than list of lists). I'll stick with list of lists.

This solution looks correct and performant. Let me finalize it.
