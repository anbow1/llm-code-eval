The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think about this carefully.

Key requirements:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle detection (including self-loops) → raise ValueError
6. Performance: n=200,000 with 400,000 edges in ~1 second

For lexicographically smallest topological order, I need to use a min-heap (priority queue) instead of a regular queue for Kahn's algorithm. At each step, pick the smallest node that has no incoming edges remaining.

Algorithm:
1. Build adjacency list and in-degree count
2. Initialize a min-heap with all nodes that have in-degree 0
3. Repeatedly extract the minimum from the heap, add to result, and decrease in-degree of neighbors
4. If neighbors reach in-degree 0, push them to heap
5. If result length < n, there's a cycle → raise ValueError

For performance with n=200,000 and 400,000 edges:
- Use heapq for the priority queue
- Use lists for adjacency and in-degree arrays
- Handle duplicate edges: this is tricky. If there are duplicate edges (a,b) appearing multiple times, the in-degree of b would be incremented multiple times, but when we process a's neighbors, we'd decrement multiple times. As long as we're consistent, it should work. But we need to be careful about self-loops: (a,a) means in-degree of a increases, and when we process a, we'd decrement in-degree of a. But a is already in the result, so we shouldn't process it again. Wait, actually with duplicate edges, if (a,b) appears k times, in-degree of b is incremented k times, and when we process a, we decrement k times. That's consistent.

Self-loop: (a,a) → in-degree of a is at least 1, so a won't be in the initial heap (unless other in-degree 0 nodes push it down... no, it can never reach 0 because processing a would require a to already be processed). So a self-loop will be detected as a cycle since a never gets processed.

Wait, let me reconsider. If there's a self-loop (a,a), then in_degree[a] >= 1. For a to be added to the heap, in_degree[a] must be 0. It starts at >= 1. The only way to decrease it is to process node a itself. But a can't be processed until in_degree[a] == 0. So a is never processed, and the cycle detection (len(result) < n) catches it.

For performance:
- heapq with up to 200,000 elements: each operation is O(log n), total O(n log n)
- 400,000 edges: adjacency list traversal is O(E)
- Total: O((n + E) log n) which should be fine for the given constraints

Let me also think about whether to use a set for edges to deduplicate. The problem says "Duplicate edges may appear." With duplicate edges:
- If (a,b) appears twice, in_degree[b] += 2, and when processing a, we do in_degree[b] -= 1 twice (once for each edge in adjacency list). This is consistent and correct.
- We don't need to deduplicate, but it might be slightly more efficient to deduplicate to reduce heap operations... actually no, we only push to heap when in_degree reaches 0, so even with duplicates, we only push once. The extra decrements just keep in_degree above 0 until the last one.

Actually wait - we need to be careful. If (a,b) appears 3 times, then in_degree[b] starts at 3 (from this edge). When we process a, we go through a's adjacency list and find b three times. Each time we decrement in_degree[b]. After 3 decrements, if in_degree[b] reaches 0, we push b. But what if there's another edge (c,b)? Then in_degree[b] = 4. Processing a gives 3 decrements → in_degree[b] = 1. Processing c gives 1 more → in_degree[b] = 0. Correct.

So duplicates are handled naturally without explicit deduplication. Good.

Let me write the code:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap for lexicographically smallest
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
    
    if len(result) < n:
        raise ValueError("Graph contains a cycle")
    
    return result
```

This should be efficient enough. Let me check:
- Building adj and in_degree: O(E)
- heapify: O(n)
- Main loop: O(n) pops + O(E) neighbor iterations + O(n) pushes = O((n+E) log n)
- For n=200,000, E=400,000: about 600,000 heap operations * log(200000) ≈ 600000 * 17 ≈ 10M operations. Should be fine in ~1 second in Python.

Actually, Python might be a bit slow for 400,000 edges. Let me think if there's any optimization...

Using `heapq` directly should be fine. The adjacency list as a list of lists is efficient. No need for sets or anything fancy.

One potential optimization: using `heapq.heappush` and `heapq.heappop` directly rather than `heapreplace` etc.

I think this solution is clean and efficient. Let me finalize it.
