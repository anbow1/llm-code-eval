Let me think through this problem carefully.

I need to implement a topological sort that returns the lexicographically smallest valid ordering. This is a classic problem that requires:

1. Kahn's algorithm with a min-heap (priority queue) instead of a queue, to ensure lexicographic ordering.
2. Handle n up to 200,000 and edges up to 400,000, so it needs to be efficient.

Key considerations:
- Duplicate edges: I need to handle these. If I just increment in-degree for each edge, duplicate edges would increment in-degree multiple times. So I need to either deduplicate edges first, or handle it differently.
- Self-loops: A self-loop (a, a) means a must come before a, which is a cycle.
- Cycle detection: If the topological sort doesn't include all nodes, there's a cycle.

For performance with n=200,000 and edges=400,000:
- Using a set of edges to deduplicate would take O(E) memory but work.
- Actually, with duplicates, if I use a list of sets for adjacency, I can deduplicate there. But that might be slower than just using a set of tuples.
- Alternative: use a list of sets for neighbors, and track in-degrees based on unique edges.

Wait, let me reconsider. With 400,000 edges and 200,000 nodes, a set of tuples would be fine memory-wise. But actually, the simplest approach:

1. Create a set from edges to deduplicate: `unique_edges = set(edges)`
2. Build adjacency list and in-degrees from unique_edges
3. Use a min-heap (heapq) for Kahn's algorithm

Actually, for 400,000 edges, building a set of tuples is O(E) which is fine. Let me think about the time complexity:
- Building the set: O(E)
- Building adjacency: O(E)
- Heap operations: O((V+E) log V)

With V=200,000 and E=400,000, this should be well within 1 second in Python... actually heapq with 200,000 elements and 400,000 operations should be fine.

Let me code this:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges
    unique_edges = set(edges)
    
    # Build adjacency list and in-degrees
    adj = defaultdict(list)
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap with all nodes that have in-degree 0
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

Wait, this should work. Let me verify the complexity:
- `set(edges)`: O(E) time, O(E) space
- Building adj: O(E)
- Heap operations: each node is pushed and popped once, so O(V log V) for the heap ops, plus for each edge we do a potential push, so O(E log V) total for the main loop.

With V=200,000 and E=400,000:
- Heap operations: ~600,000 * log(200,000) ≈ 600,000 * 18 ≈ 10.8 million operations

This should be fast enough in Python for about a second.

Actually, I can avoid using `defaultdict` and just use a regular list of lists since we know the range:

```python
adj = [[] for _ in range(n)]
```

This is slightly more efficient.

Let me also consider: do I even need to deduplicate? If I don't deduplicate, duplicate edges would cause in_degree to be incremented multiple times, and then when processing, the neighbor's in_degree would be decremented multiple times. So it would still work correctly! The only issue is memory. But with 400,000 edges, storing them all in a list is fine.

Wait, actually if I don't deduplicate, the algorithm still works correctly. Duplicate edges (a,b) appearing k times means:
- in_degree[b] is incremented k times
- When a is processed, in_degree[b] is decremented k times
- Net effect: same as one edge

So I don't need to deduplicate for correctness. But I do need to handle it for the cycle detection - actually no, self-loops would still be detected because in_degree[a] would be >= 1 and a would never reach 0.

Actually wait, for self-loops: if (a, a) is an edge, then in_degree[a] >= 1, and a can never be added to the heap (unless another path also gives it in-degree that gets resolved). Actually no - if a has a self-loop, its in_degree includes 1 from the self-loop, so it can't reach 0 until it's processed, but it can't be processed until its in_degree is 0. So it stays in the cycle. Good.

So I don't need to deduplicate for correctness. But for performance, deduplicating reduces the number of adjacency entries. With 400,000 edges and potentially many duplicates, deduplication could help.

Let me just deduplicate to be safe and potentially faster:

Actually, for the performance constraint, let me think about whether deduplication helps. If there are no duplicates (worst case for dedup), the set construction costs O(E) extra time. If there are many duplicates, the set construction still costs O(E) but the subsequent processing is faster.

I think the safest approach for performance is to just use the set deduplication since it's O(E) and the subsequent processing on unique edges is at most O(E) anyway.

Let me finalize my solution. I'll use a list of lists for adjacency (pre-allocated) and a set for deduplication.

Actually, I realize I should double-check: with `heapq`, the lexicographically smallest ordering is guaranteed because at each step we pick the smallest available node. Yes, this is correct.

Let me write the final clean version.
