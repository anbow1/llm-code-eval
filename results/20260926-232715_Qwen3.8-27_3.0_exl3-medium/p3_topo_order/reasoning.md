Let me think about this problem carefully.

We need to find the lexicographically smallest topological ordering of a directed graph with n nodes (0 to n-1) and edges (a, b) meaning a must come before b.

For lexicographically smallest topological order, we need to use a priority queue (min-heap) instead of a regular queue in Kahn's algorithm. At each step, we pick the node with the smallest index among all nodes with in-degree 0.

Key considerations:
1. n can be up to 200,000
2. edges can be up to 400,000
3. Need to handle duplicates
4. Need to detect cycles (including self-loops)
5. Must be fast (~1 second)

Algorithm:
1. Build adjacency list and in-degree array
2. Use a min-heap (heapq) to always pick the smallest available node
3. Process nodes, reducing in-degrees of neighbors
4. If we can't process all n nodes, there's a cycle → raise ValueError

For performance with 200k nodes and 400k edges:
- Use list of lists for adjacency
- Use heapq for the priority queue
- Need to handle duplicate edges (deduplicate them or just let them affect in-degree correctly)

Wait, duplicate edges: if edge (a, b) appears twice, does it mean a must come before b (just a constraint), or does it mean the in-degree should be 2? 

The problem says "An edge (a, b) means a must come before b." So duplicate edges are just redundant constraints. We should deduplicate them.

Actually, let me reconsider. If we don't deduplicate, and edge (a,b) appears twice, then in-degree of b would be 2, and when we process a, we'd decrement it twice. This would still work correctly for topological ordering - b's in-degree would reach 0 after a is processed (assuming no other incoming edges). So duplicates don't actually break the algorithm if we're consistent.

Wait, let me think again. If edge (a,b) appears twice:
- in_degree[b] = 2 (from this edge alone)
- When we process a, we iterate over neighbors of a. If we stored both duplicates in the adjacency list, we'd decrement in_degree[b] twice, bringing it to 0.
- This is correct! b becomes available after a is processed.

So actually, we don't need to deduplicate. Duplicates just mean we process the same edge twice, which is wasteful but correct.

But for performance with 400k edges, duplicates might make it slower. Let me think... 400k edges is manageable even with duplicates. The heap operations are O(log n) and we do O(n + E) of them. With n=200k and E=400k, that's about 600k * log(200k) ≈ 600k * 18 ≈ 10.8M operations. Should be fine in a second.

Actually, let me reconsider the deduplication. If we don't deduplicate:
- Building adjacency list: O(E) = O(400k)
- Processing: O((n + E) * log(n)) 

This should be fine.

Let me also consider self-loops: edge (a, a) means a must come before a, which is a cycle. We should detect this.

Actually, with the algorithm:
- If (a, a) is an edge, in_degree[a] gets incremented by 1
- a can never have in_degree 0 (unless it was 0 before, but now it's 1)
- So a never gets added to the heap
- At the end, we'd have processed fewer than n nodes → cycle detected

Wait, but what if a has in_degree 1 from the self-loop and no other incoming edges? Then in_degree[a] = 1, and a is never in the heap. We'd process all other nodes but not a. At the end, len(result) < n → cycle. Good.

What if a has in_degree 0 initially and then we add (a,a)? in_degree[a] becomes 1. a is never in the heap. Same detection.

Let me code this up:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
    
    # Build adjacency list and in-degree
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap for lexicographically smallest
    heap = []
    for i in range(n):
        if in_degree[i] == 0:
            heapq.heappush(heap, i)
    
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

Wait, for performance with 200k nodes and 400k edges, this should be fine. Let me think about potential bottlenecks:
- Building adj list: O(E) - fine
- Initial heap building: O(n) with list + heapify, or O(n log n) with individual pushes. Let me use heapify for the initial build.

Actually, for the initial heap, I can do:
```python
heap = [i for i in range(n) if in_degree[i] == 0]
heapq.heapify(heap)
```

This is O(n) instead of O(n log n).

Let me also think about whether we need to handle the case where n=0. The problem says nodes are 0..n-1, so if n=0, there are no nodes. Return empty list.

Let me also consider: what if there are edges referencing nodes outside 0..n-1? The problem doesn't mention this, so I'll assume edges are valid.

Let me finalize:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
    
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
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
        raise ValueError("Cycle detected")
    
    return result
```

This should work. Let me verify the complexity:
- Building adj and in_degree: O(E)
- Initial heapify: O(n)
- Main loop: each node is pushed and popped once from heap: O(n log n). Each edge is processed once: O(E). Total: O((n + E) log n)

For n=200k, E=400k: O(600k * 18) ≈ 10.8M operations. Should be well under a second in Python.

Actually, I realize that with duplicates, the adjacency list might have more entries than E unique edges. But since E is bounded at 400k total (including duplicates), this is fine.

I think this solution is correct and efficient. Let me write the final version.
