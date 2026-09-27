The user wants a topological sort that returns the lexicographically smallest valid ordering. Let me think through this:

1. **Algorithm**: Kahn's algorithm with a min-heap (priority queue) to get lexicographically smallest order.
2. **Constraints**: n up to 200,000, edges up to 400,000. Need O((n + e) log n) which should be fine for ~1 second.
3. **Edge cases**: 
   - Duplicate edges: need to handle by using a set or by being careful with in-degree counting.
   - Cycles: if we can't process all nodes, raise ValueError.
   - Self-loops: (a, a) means a must come before a, which is a cycle.

**Approach**:
- Build adjacency list and in-degree array.
- Use a min-heap (heapq) to always pick the smallest available node.
- For duplicate edges: I can use a set to deduplicate, or I can just add them multiple times but then I need to be careful. Actually, if I add duplicate edges, the in-degree will be inflated and when I process the node, I'll decrement multiple times. That's actually fine - if I add edge (a,b) twice, in_degree[b] = 2, and when I process a, I decrement in_degree[b] twice. So it works correctly without deduplication.

Wait, let me reconsider. If I have edge (a,b) appearing twice:
- in_degree[b] = 2
- adjacency[a] = [b, b]
- When I process a, I iterate over adjacency[a], see b twice, decrement in_degree[b] twice → in_degree[b] becomes 0.

That's correct! So I don't need to deduplicate.

**Implementation**:
```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Initialize heap with all nodes with in_degree 0
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

This should be efficient:
- Building adjacency: O(e)
- Heap operations: O((n + e) log n)
- For n=200,000 and e=400,000: about 600,000 * log(200,000) ≈ 600,000 * 18 ≈ 10.8 million operations. Should be well within 1 second in Python.

Let me verify the lexicographically smallest property: by always picking the smallest available node from the heap, we ensure the result is lexicographically smallest. This is a well-known property of Kahn's algorithm with a priority queue.

Self-loops: if (a, a) is an edge, then in_degree[a] >= 1, and a can never be added to the heap (since its in-degree never reaches 0 unless... wait, it would need to be processed to decrement its own in-degree, but it can't be processed because its in-degree is > 0). So it will be detected as a cycle. Correct.

I think this solution is clean and correct. Let me finalize it.
