Let me think about this problem carefully.

We need to implement topological sort that returns the lexicographically smallest valid ordering.

Key requirements:
1. Nodes 0..n-1
2. Edge (a, b) means a comes before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle detection (including self-loop) → raise ValueError
6. Must handle n=200_000 with 400_000 edges in about a second

For lexicographically smallest topological ordering, we use a min-heap (priority queue) instead of a regular queue. At each step, we pick the smallest available node (indegree 0).

Algorithm:
1. Build adjacency list and compute in-degrees
2. Use a min-heap for nodes with indegree 0
3. Process nodes, decrement indegrees of neighbors
4. If we can't process all n nodes, there's a cycle → raise ValueError

For performance with n=200_000 and 400_000 edges:
- Use lists for adjacency
- Use a heap for the priority queue
- Be careful about duplicate edges - they shouldn't cause issues if we just add to adjacency list (multiple edges from a to b just mean we decrement indegree[b] multiple times when processing a). Wait, actually that's a problem. If we have duplicate edges, the indegree would be inflated.

Let me think about this more carefully. If there are duplicate edges, say (1,2) appears twice:
- indegree[2] would be 2
- When we process node 1, we'd decrement indegree[2] by 2 (once for each duplicate)
- So it would still work correctly! Because the duplicate edge added to indegree gets subtracted when we process the source.

Wait, but that's only if we store duplicates in the adjacency list. Let me reconsider.

Option 1: Store duplicates in adjacency list. indegree[2] = 2 (from two (1,2) edges). When processing 1, we iterate over adj[1] which has [2, 2], so we decrement indegree[2] twice. This works correctly.

Option 2: Deduplicate. This adds complexity. Let's go with Option 1 since it's simpler and the total number of edges is bounded at 400_000.

Actually wait - if we store duplicates, the total work is O(E) where E is the total number of edges including duplicates. With 400_000 edges, that's fine.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
    
    # Build adjacency list and in-degrees
    adj = [[] for _ in range(n)]
    indegree = [0] * n
    
    for a, b in edges:
        if a == b:
            raise ValueError("Cycle detected: self-loop")
        adj[a].append(b)
        indegree[b] += 1
    
    # Min-heap of available nodes (indegree 0)
    heap = []
    for i in range(n):
        if indegree[i] == 0:
            heapq.heappush(heap, i)
    
    result = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                heapq.heappush(heap, neighbor)
    
    if len(result) != n:
        raise ValueError("Cycle detected")
    
    return result
```

Wait, about self-loops: if a == b, then indegree[b] increases by 1 and adj[a] (which is adj[b]) contains b. So when we process b, we'd try to decrement indegree[b] but b was never in the heap (since its indegree was 1). So it would be caught by the cycle detection at the end. But we could also raise early. Let me just let the general cycle detection handle it - it's simpler and the problem says "including a self-loop".

Actually, let me not special-case self-loops. The general algorithm will detect them:
- If a == b, then indegree[b] gets incremented, and adj[a] contains b.
- b will never have indegree 0 (at least this self-loop keeps it at 1), so it's never pushed to the heap.
- At the end, len(result) < n, so we raise ValueError.

This is correct. Let me remove the special case.

For performance with 200k nodes and 400k edges:
- Building adjacency list: O(n + E)
- Heap operations: O(E log n) worst case
- Total: O((n + E) log n) which for 200k and 400k should be well within a second in Python... actually might be tight.

Let me think about optimizations:
- Using list of lists for adjacency is fine
- heapq is efficient
- The main bottleneck might be Python's overhead, but 400k edges should be manageable

Actually, one concern: with duplicate edges, if (1,2) appears 400_000 times, adj[1] would be a list of 400_000 2's. Processing that would take time but is O(E) total which is fine.

Let me also consider: should I use `sys.setrecursionlimit`? No, this is iterative.

I think the solution is clean and efficient. Let me finalize it.

Actually, one more thought: for n=0, should I return an empty list? The problem says nodes are 0..n-1, so if n=0, there are no nodes. Returning [] makes sense.

Let me also make sure the edge case of no edges works: all nodes have indegree 0, all get pushed to heap, we pop them in order 0, 1, 2, ..., n-1. Correct.

I'll go with this solution.
