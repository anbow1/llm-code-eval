The user wants a topological sort function that returns the lexicographically smallest ordering. Let me think about the requirements:

1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. If there's a cycle (including self-loop), raise ValueError
6. Must handle n = 200,000 with 400,000 edges in about a second

For lexicographically smallest topological order, I need to use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue. At each step, pick the smallest-numbered node with in-degree 0.

Key considerations:
- Duplicate edges: I need to handle this carefully. If I just count in-degrees naively, duplicate edges would inflate the in-degree count. I should either deduplicate edges or handle the counting properly.
- Self-loop: (a, a) means a must come before itself → cycle → raise ValueError.
- Performance: n=200k, 400k edges. Using heapq for the priority queue. Adjacency list with lists.

For duplicate edges: If edge (a, b) appears multiple times, I should only count it once for in-degree purposes. I can use a set for edges, or I can build the adjacency list and in-degree carefully.

Wait, let me think more carefully. If edge (a, b) appears twice, and I count in-degree of b as 2 from a, then when I process a, I decrement in-degree of b twice, bringing it back to the correct count. Actually, that works! If (a,b) appears k times, in-degree of b gets +k, and when processing a, we decrement k times. So the net effect is correct.

But wait - the adjacency list would have (a,b) k times, so when processing a, we iterate over all k copies and decrement in-degree k times. This is correct but wasteful. For performance with 400k edges, this should still be fine since 400k is not huge.

Actually, let me reconsider. With duplicates, if (a,b) appears 3 times:
- in_degree[b] += 3 (when building)
- adjacency[a] has b three times
- When processing a: for each b in adjacency[a], decrement in_degree[b] by 1, three times total
- Net effect: in_degree[b] reduced by 3, which cancels the +3. Correct.

So duplicates are handled naturally without deduplication. But it's wasteful in memory/time if there are many duplicates. Given 400k edges total, even with some duplicates, it should be fine for 1 second.

Actually wait - the problem says "400,000 edges" - if many are duplicates, the actual unique edges might be fewer. But worst case with 400k total entries, processing is O(400k log 200k) for the heap operations plus O(400k) for edge processing. That should be well within 1 second.

Let me also handle self-loops: if a == b in any edge, that's a cycle. Actually, if I just let the algorithm run, a self-loop (a,a) means in_degree[a] gets +1, and adjacency[a] has 'a' in it. But a can never have in_degree 0 (it has at least 1 from itself), so it will never be added to the heap. Eventually the heap becomes empty before all nodes are processed → cycle detected. So self-loops are handled naturally by the cycle detection.

Actually, let me verify: if node 0 has a self-loop (0,0):
- in_degree[0] = 1
- adjacency[0] = [0]
- Initially, no node has in_degree 0 (assuming node 0 is the only node)
- Heap is empty, we processed 0 nodes, but n=1, so cycle → raise ValueError. Correct!

For the implementation:
1. Build adjacency list and in-degree array
2. Initialize min-heap with all nodes having in-degree 0
3. While heap is not empty:
   - Pop smallest node
   - Add to result
   - For each neighbor, decrement in-degree; if 0, push to heap
4. If result length != n, raise ValueError (cycle detected)

For performance:
- Use list for adjacency list (append)
- Use heapq for priority queue
- Use list for in-degree (array of ints)

Let me write this:

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

This should work. Let me think about edge cases:
- n=0: heap is empty, result is empty, len(result)==0==n, return []. Good.
- No edges: all nodes have in_degree 0, heap contains all, popped in order 0,1,2,... Good (lexicographically smallest).
- Cycle: result won't have all n nodes, raise ValueError. Good.
- Self-loop: in_degree of that node is at least 1 from itself, never reaches 0, not in heap, eventually len(result) < n. Good.
- Duplicate edges: handled naturally as discussed. Good.

Performance: Building adj and in_degree is O(E). heapify is O(V). Each node pushed/popped once from heap: O(V log V). Each edge processed once: O(E). Total: O(V log V + E). For V=200k, E=400k: 200k * 18 + 400k ≈ 4M operations. Should be well under 1 second in Python.

Wait, actually in Python, list operations and heapq operations have overhead. Let me think if there's anything to optimize...

Actually 200k * log2(200k) ≈ 200k * 17.6 ≈ 3.5M for heap operations, plus 400k edge traversals. In Python this should run in about 0.5-1 seconds. Should be fine.

One optimization: instead of `heapq.heappush` in the loop, I could potentially batch, but that's complex and probably not needed.

I think this solution is good. Let me finalize it.
