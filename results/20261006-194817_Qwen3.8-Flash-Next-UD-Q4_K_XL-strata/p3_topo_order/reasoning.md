The user wants a topological sort function that returns the lexicographically smallest valid ordering. Let me think through the requirements:

1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. Cycle detection (including self-loops) → raise ValueError
6. Must handle n=200_000 with 400_000 edges efficiently (~1 second)

For lexicographically smallest topological order, I need Kahn's algorithm with a min-heap (priority queue) instead of a regular queue.

Algorithm:
1. Build adjacency list and in-degree count (deduplicate edges)
2. Use a min-heap for nodes with in-degree 0
3. Process nodes from the heap greedily (smallest first)
4. If output has fewer than n nodes → cycle exists → raise ValueError

For performance with n=200_000 and 400_000 edges:
- Use heapq for the priority queue
- Build adjacency list as list of lists
- Deduplicate edges using a set or by sorting - actually, for deduplication, I can use a set of edges to avoid counting duplicates in in-degree

Wait, for deduplication: if edge (a, b) appears multiple times, I should only count it once for the in-degree. Otherwise the in-degree would be inflated and the node would never reach 0.

Approach for deduplication: Use a set to track seen edges, or build adjacency as a set per node, or sort and deduplicate.

For 400_000 edges, using a set of tuples for deduplication is fine. Or I could build adjacency lists as sets then convert to lists.

Actually, let me think about performance:
- 200,000 nodes, 400,000 edges
- Using a set for edge deduplication: 400,000 insertions into a set - fine
- Adjacency list: list of lists, 200,000 lists
- heapq operations: up to 200,000 push/pop operations - O(n log n) - fine

Let me think about the most efficient way:

Option 1: Use a set to deduplicate edges before building the graph.
```python
seen = set()
for a, b in edges:
    if (a, b) not in seen:
        seen.add((a, b))
        # add to adjacency
```

Option 2: Build adjacency as a list of sets, then convert.
```python
adj = [set() for _ in range(n)]
indeg = [0] * n
for a, b in edges:
    if b not in adj[a]:
        adj[a].add(b)
        indeg[b] += 1
```

Option 2 avoids the extra set but checking `b not in adj[a]` is O(1) for sets. However, converting sets to lists at the end costs O(E). Actually we don't need to convert - we can iterate over sets directly.

Wait, but for self-loops (a == b), we need to detect them as cycles. A self-loop means a node depends on itself, so its in-degree can never reach 0, and it won't be in the output. The cycle check (len(result) < n) will catch this.

Actually, let me reconsider. If we have edge (a, a), then indeg[a] gets incremented, and when processing a, we'd try to decrement indeg[a], but a can only be processed if its in-degree is 0. But a's in-degree is at least 1 (from the self-loop), so a is never added to the heap. The cycle detection (output length < n) catches this.

But wait - what if a has other edges making it eligible? No, the self-loop adds to in-degree, so it still needs to process itself first, which is impossible. The cycle check handles it.

Let me also consider: should I check for self-loops explicitly? The Kahn's algorithm cycle detection handles it naturally, so no need.

For performance, let me go with:
- adj = [[] for _ in range(n)]
- Use a set for deduplication during edge processing
- Or use the set-per-node approach

Actually, the simplest efficient approach:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [set() for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        if b not in adj[a]:
            adj[a].add(b)
            indeg[b] += 1
    
    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)
    
    result = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)
    
    if len(result) < n:
        raise ValueError("cycle detected")
    
    return result
```

Hmm, but iterating over a set is not ordered. Does that matter? No, because we're adding to a heap, so the order doesn't matter for correctness. The heap ensures we always pick the smallest available node.

Wait, but converting sets to lists might be slightly faster for iteration. Let me think... for 400_000 edges total, iterating over sets vs lists shouldn't make a huge difference. The set overhead is the `in` check during construction.

Actually, for maximum performance, let me try a different approach: sort edges and deduplicate.

```python
edges_sorted = sorted(set(edges))
```

Then build the adjacency list from the deduplicated sorted edges. This is O(E log E) for the set construction + sort, which for 400_000 edges is fine.

Actually, `set(edges)` for 400_000 tuples is O(E), then we don't even need to sort. We just iterate over the set.

Let me benchmark mentally:
- set(edges): creates 400_000 tuple set lookups - fast
- Building adj from set: 400_000 iterations - fast
- Heap operations: 200_000 * log(200_000) ≈ 200_000 * 18 ≈ 3.6M operations - fast

I think the set-per-node approach might have high memory overhead (200_000 set objects). Let me go with a global set for deduplication instead.

```python
def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    seen = set()
    for a, b in edges:
        if (a, b) not in seen:
            seen.add((a, b))
            adj[a].append(b)
            indeg[b] += 1
    
    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)
    
    result = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)
    
    if len(result) < n:
        raise ValueError("cycle detected")
    
    return result
```

This should be efficient. Let me also consider using `heapq` functions directly for speed:

```python
import heapq

heappop = heapq.heappop
heappush = heapq.heappush
```

This avoids attribute lookup in the hot loop.

Let me also think about whether there's an issue with the self-loop case. If edge (a, a) exists:
- It gets added to adj[a] and indeg[a] += 1
- Node a's in-degree is at least 1
- a never gets added to the heap (unless it has in-degree 0 from other... wait no, it has in-degree at least 1)
- So a is never processed
- len(result) < n → ValueError raised ✓

What about a cycle a→b→a?
- indeg[a] = 1 (from b→a), indeg[b] = 1 (from a→b)
- Neither gets added to heap
- Neither gets processed
- len(result) < n → ValueError raised ✓

Looks correct. Let me finalize.
