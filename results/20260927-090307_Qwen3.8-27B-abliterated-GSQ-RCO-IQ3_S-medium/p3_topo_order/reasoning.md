Let me analyze this problem:

1. We need to perform topological sort on a directed graph
2. Return lexicographically smallest valid ordering
3. Handle duplicate edges
4. Detect cycles (including self-loops)
5. Must be efficient for n=200,000 nodes and m=400,000 edges

For lexicographically smallest topological order, I should use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue. This ensures that at each step, we pick the smallest available node.

Algorithm:
1. Build adjacency list and in-degree array
2. Handle duplicate edges - we can either use a set or just handle duplicates (if we use a set for edges, it costs extra memory but ensures correctness). Actually, for duplicates, if we add the same edge twice, the in-degree will be incremented twice and the adjacency list will have duplicates. When we process the edge, we'll decrement in-degree twice. This works correctly with Kahn's algorithm. So duplicates are naturally handled.

Wait, let me reconsider. If edge (a,b) appears twice:
- adj[a] = [b, b]
- in_degree[b] = 2
When we process a: we decrement in_degree[b] twice (to 0), and we'd push b to the heap twice? No, we only push when in_degree becomes 0. So we decrement to 1 (not pushed), then to 0 (pushed). This works fine.

Actually wait - we push to the heap when in_degree becomes 0. If in_degree goes from 2 to 1, we don't push. Then from 1 to 0, we push. So duplicates are handled correctly without needing a set.

For cycle detection: if the number of nodes in the result is less than n, there's a cycle.

For efficiency with n=200,000 and m=400,000:
- Using a heap-based Kahn's algorithm: O((n+m) log n) which should be fast enough
- Using list for adjacency and array for in-degrees

Let me write this:

```python
import heapq
from collections import deque

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Build adjacency list and in-degree array
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap of nodes with in_degree 0
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

Wait, for n=200,000, the initial list comprehension and heapify should be fine. The heap operations are O(log n) each, and we do n of them, plus m edge traversals. Total: O((n+m) log n). For n=200k, m=400k, that's about 600k * 18 ≈ 10.8M operations. Should be fine in about a second.

Let me also consider: self-loop (a, a) means in_degree[a] includes itself. If a has no other incoming edges, in_degree[a] = 1, so it never gets added to the heap. This correctly detects the cycle.

Duplicate edges: as analyzed, they work correctly without special handling.

Let me also consider memory: adj list with 200k lists and 400k total entries - fine. in_degree array of 200k ints - fine.

I think this solution is correct and efficient. Let me finalize it.
