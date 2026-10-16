Let me think about this problem:

1. We need to perform topological sorting of a directed graph
2. Nodes are 0 to n-1
3. Edge (a, b) means a must come before b
4. We need lexicographically smallest valid ordering
5. Duplicate edges may exist
6. Cycle detection (including self-loops) -> raise ValueError
7. Performance: n=200,000, edges=400,000 in about a second

For lexicographically smallest topological order, we should use a min-heap (priority queue) instead of a regular queue in Kahn's algorithm.

Algorithm:
1. Build adjacency list and in-degree array
2. Handle duplicate edges (use a set or just add duplicates - duplicates will increase in-degree which is wrong). Actually, duplicates should be handled by only counting unique edges. Let me think... if we have duplicate edges, they represent the same constraint. So we should deduplicate. But with 400,000 edges, using a set for deduplication is fine.

Wait, actually if we just add all edges (including duplicates) to the adjacency list, the in-degree will be incremented multiple times for the same edge. When we process a node, we'll decrement in-degree multiple times. That would be incorrect because we'd be removing the same edge multiple times. So we need to deduplicate.

Actually wait - if we use a set for edges, we can deduplicate. But with 400,000 edges, a set of tuples is fine memory-wise.

Let me think about performance:
- n = 200,000, edges = 400,000
- Building adjacency list: O(E)
- Using a heap for Kahn's algorithm: O(E log V) where log V ≈ 18
- 400,000 * 18 ≈ 7,200,000 operations - should be fast enough in Python

For deduplication: I'll use a set to track edges we've seen.

Actually, let me reconsider. If I just use a set of edges first, then build the graph, that's O(E) for the set and O(E) for building the graph. That should be fine.

Let me code this:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_deg[b] += 1
    
    # Min-heap for lexicographically smallest
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

Wait, let me think about self-loops. If there's a self-loop (a, a), then in_deg[a] gets incremented by 1, and a can never reach in_deg 0 (unless it was already 0 and then... no, if a has a self-loop, in_deg[a] >= 1, and when processing a's neighbors, we'd decrement in_deg[a] by 1, but a itself needs to be processed first to process its neighbors... wait no.

Actually with a self-loop (a, a): adj[a] contains a, and in_deg[a] is at least 1. So a can't be in the initial heap (unless it has other edges making it 0... no, in_deg[a] >= 1 from the self-loop). So a never gets added to the heap, and result will have length < n, so we raise ValueError. Good.

Let me think about performance more carefully. With n=200,000 and 400,000 unique edges:
- Set of 400,000 tuples: fine
- Adjacency list: 200,000 lists, total 400,000 entries: fine
- Heap operations: up to 400,000 pushes and 200,000 pops, each O(log 200,000) ≈ O(18): fine

This should run well within a second in Python.

Actually, let me reconsider the deduplication. Instead of creating a set first, I could use a set to track seen edges during iteration. But creating the set upfront is cleaner and probably similar in performance.

One more thought: what if n=0? Then edges should be empty, and we return []. That's handled naturally.

What if there are edges referencing nodes outside 0..n-1? The problem states nodes are 0..n-1, so I'll assume valid input.

Let me finalize the solution.
