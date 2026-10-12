The user wants a topological sort that:
1. Returns lexicographically smallest ordering
2. Handles duplicate edges
3. Detects cycles (including self-loops) and raises ValueError
4. Must be efficient: n=200k, 400k edges in ~1 second

For lexicographically smallest topological order, I need to use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue. This way, at each step, we pick the smallest available node.

For handling duplicate edges: I need to be careful. If there are duplicate edges, the in-degree would be inflated. I need to deduplicate edges. One approach: use a set to track unique edges, or deduplicate adjacency lists.

Wait, let me think more carefully. If we have duplicate edges (a, b) appearing twice, and we count in-degree naively, we'd count b's in-degree as 2 from a. But when we process a, we'd decrement b's in-degree twice, so it would still work correctly! Let me verify:

- Edge (a, b) appears twice in the list
- In-degree of b = 2 (both edges contribute)
- Adjacency list of a contains b twice
- When we process a, we visit b twice, decrementing in-degree twice
- Net effect: in-degree goes from 2 to 0, which is correct

So duplicate edges actually cancel out naturally with Kahn's algorithm! The in-degree is incremented once per edge occurrence, and decremented once per edge occurrence. So we don't actually need to deduplicate.

Wait, but there's a subtle issue. What if we have edges (a, b) and (a, b) - two copies. The in-degree of b is 2. Adjacency list of a has b appearing twice. When a is processed, we go through adjacency list of a, find b twice, decrement in-degree of b twice. So b's in-degree goes from 2 to 0. That's correct.

But what about performance? If there are many duplicate edges, the adjacency list will be larger than necessary, but the problem says 400k edges total, so it should be fine.

Actually wait - let me reconsider. The problem says "duplicate edges may appear." The total is 400k edges. So duplicates are already counted in the 400k. The algorithm should handle them naturally.

For the min-heap approach:
- Use heapq for the priority queue
- Build adjacency list and in-degree array
- Push all nodes with in-degree 0 into the heap
- Repeatedly pop the smallest, add to result, decrement neighbors' in-degrees, push any that reach 0

For performance with n=200k and 400k edges:
- heapq operations are O(log n) each
- Total operations: O((n + m) log n) which should be well within 1 second for these sizes

Let me also consider self-loops: if (a, a) is an edge, then a has a self-loop, which means it can never have in-degree 0 (it depends on itself). This will naturally be caught by the algorithm - after processing all nodes with in-degree 0, if we haven't processed all n nodes, there's a cycle. But actually, a self-loop means the in-degree of a is at least 1, and when we "process" a, we'd need to decrement a's in-degree, but a can never be processed because it's never in the heap. So the result will have fewer than n elements, and we raise ValueError.

Let me write the solution:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_deg = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1
    
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
        raise ValueError("cycle detected")
    
    return result
```

This should be clean and efficient. Let me double-check edge cases:
- n=0: returns empty list, no edges, works fine
- n=1, no edges: returns [0]
- Self-loop (0,0): in_deg[0] = 1, heap is empty, result is empty, len != 1, raises ValueError ✓
- Multiple components: all components get merged via the heap, and we pick the smallest available node globally ✓

Performance: Building the graph is O(n + m). Heapify is O(n). Each push/pop is O(log n). Total heap operations: at most n pushes + n pops = O(n log n). Iterating over adjacency lists is O(m). Total: O(n log n + m). For n=200k, m=400k, this is about 200k * 18 + 400k ≈ 4M operations. Should be well under 1 second in Python... actually Python might be tight. Let me think if there's a way to optimize.

For Python, the main bottleneck would be the heap operations. With n=200k, we have up to 200k push and 200k pop operations, each O(log 200k) ≈ O(18). The adjacency list iteration is O(m) = O(400k). The list construction is O(n + m). This should run in about 0.5-1 second in CPython. Should be fine.

One optimization: using `heapq.heapify` instead of pushing one by one is already done. The rest is standard.

I think this solution is correct and efficient enough.
