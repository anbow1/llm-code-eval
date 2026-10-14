The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think about this carefully.

Key requirements:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear - need to handle these
5. Cycle (including self-loop) → ValueError
6. Must handle n = 200,000 with 400,000 edges in about a second

For lexicographically smallest topological order, the standard approach is Kahn's algorithm but using a min-heap instead of a queue. This way, at each step we pick the smallest available node.

Let me think about the implementation:

1. Build adjacency list and in-degree counts.
2. Handle duplicate edges: when processing a duplicate edge (a, b), it would increment in_degree[b] multiple times, and when we "remove" edge (a, b), we decrement in_degree[b] multiple times. So duplicates are actually handled correctly by Kahn's algorithm as long as we consistently add/remove the same number. Wait, actually if there are duplicate edges, in_degree[b] gets incremented twice, and when a is processed, we decrement twice. So it works correctly! The duplicates cancel out.

Actually wait - if we have duplicate edges, the adjacency list would have duplicate entries. When we process node a, we iterate over its adjacency list and decrement in_degree for each occurrence of b. So if (a,b) appears twice, in_degree[b] was incremented twice and decremented twice. That's correct. So duplicates are handled naturally by Kahn's algorithm.

3. Use heapq to always extract the minimum node.

4. Self-loops: edge (a, a) means a must come before a, which is a cycle. In Kahn's algorithm, in_degree[a] would be incremented by the self-loop, so a would never have in_degree 0 unless there are other edges making it 0... wait no. If a has a self-loop, in_degree[a] >= 1, so a will never be added to the heap. Eventually heap becomes empty but we haven't processed all nodes, so we detect a cycle. Actually, we need to check: if after processing, the count of processed nodes < n, there's a cycle.

Wait, but what about self-loops specifically? Edge (a, a) increments in_degree[a] by 1. Node a can never be in the initial heap (unless it had in_degree 0 before, but the self-loop makes it at least 1). So a will never be processed. The algorithm will detect this as a cycle when count < n. Good.

Let me code this up:

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
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                heapq.heappush(heap, v)
    
    if len(result) != n:
        raise ValueError("cycle detected")
    
    return result
```

Time complexity: O((n + m) log n) where m is number of edges. For n = 200,000 and m = 400,000, this should be well under a second in Python. The heap operations are O(log n) each, and we have at most n heap pushes/pops plus m decrements. Total heap operations: O(n + m) at most, each O(log n). So O((n+m) log n) ≈ 600,000 * 18 ≈ 10.8 million operations. Should be fine.

Actually, let me reconsider. The inner loop iterates over all edges once total (each edge is traversed exactly once when its source is popped from the heap). The heap push/pop is O(log n). We push at most n nodes to the heap. So total heap operations are O(n) pushes and O(n) pops, each O(log n). The edge traversal is O(m). Total: O(n log n + m). For n=200k, m=400k, that's about 200k*18 + 400k = 4 million operations. Very fast.

The `heapify` call on initial elements is O(n).

This should easily handle the constraints. Let me also make sure the import is inside or outside. The problem says standard library only. heapq is standard library. I'll put the import at the top level or inside the function. Let me put it at module level since it's a clean solution.

Actually, the user said "Reply with a single ```python code block containing the complete solution." Let me just put the import at the top.

Let me double-check: self-loops. Edge (a, a): adj[a].append(a), in_degree[a] += 1. Node a can never have in_degree 0 (unless there are other... no, in_degree can only go up). So a is never pushed to heap. Eventually heap empties, len(result) < n, we raise ValueError. Correct.

One edge case: n = 0. Then edges should be empty (no nodes). adj = [], in_degree = [], heap = [], result = [], len(result) == 0 == n. Return []. That's correct.

What about n = 1, no edges? adj = [[]], in_degree = [0], heap = [0], result = [0]. Correct.

What about n = 1, edge (0, 0)? adj = [[0]], in_degree = [1], heap = [], result = [], len(result) = 0 != 1, raise ValueError. Correct.

The solution looks correct and efficient. Let me finalize it.
