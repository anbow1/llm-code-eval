The user wants a topological sort function that returns the lexicographically smallest ordering. Let me think about this carefully.

Key requirements:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Handle duplicate edges
5. Detect cycles (including self-loops) and raise ValueError
6. Must handle n = 200,000 with 400,000 edges in about a second

For lexicographically smallest topological order, I need to use Kahn's algorithm with a min-heap (priority queue) instead of a regular queue. At each step, pick the smallest available node.

Algorithm:
1. Build adjacency list and in-degree array
2. Handle duplicate edges - we need to track them. Since we're counting in-degrees, duplicate edges would inflate the in-degree. We need to deduplicate edges.
3. Initialize min-heap with all nodes of in-degree 0
4. Repeatedly pop smallest node, add to result, decrease in-degree of neighbors, push newly zero-in-degree nodes to heap
5. If result length < n, there's a cycle → raise ValueError

For performance with n=200,000 and 400,000 edges:
- Use heapq for the min-heap
- For duplicate edges: I need to deduplicate. The simplest way is to use a set of edges or a set of neighbors per node. But with 400,000 edges, using a set per node could work. Actually, let me think... if I just count in-degrees with duplicates, the algorithm would still work correctly if I also process duplicates. Wait no - if I have edge (a,b) appearing twice, then in-degree of b is 2, but when I process a, I should decrement by 2. 

Actually, the cleanest approach: deduplicate edges. Build adjacency lists as sets, then convert to sorted lists (or just use them). Count in-degrees based on unique edges.

Wait, for performance with 200k nodes and 400k edges, using sets per node might be fine. Let me think about memory. 200,000 sets with average 2 edges each - that's fine.

Actually, a simpler approach: use a set of (a, b) tuples to deduplicate, then build adjacency lists from the deduplicated set. Or use adjacency lists as sets.

Let me think about the most efficient approach:
- Build adj as list of sets: `adj = [set() for _ in range(n)]`
- Build indeg as list of ints: `indeg = [0] * n`
- For each edge (a, b): if b not in adj[a], add it and increment indeg[b]
- This handles duplicates naturally

Actually, using sets might be slow due to hashing. Alternative: sort edges and deduplicate, or just use a set of edges.

For 400k edges, using a set of tuples should be fine. Let me use:
```python
seen = set()
adj = [[] for _ in range(n)]
indeg = [0] * n
for a, b in edges:
    if (a, b) not in seen:
        seen.add((a, b))
        adj[a].append(b)
        indeg[b] += 1
```

Or alternatively, use set per adjacency list:
```python
adj = [set() for _ in range(n)]
for a, b in edges:
    adj[a].add(b)
indeg = [0] * n
for a in range(n):
    for b in adj[a]:
        indeg[b] += 1
# Convert to sorted lists for determinism? No, we're using heap so order doesn't matter
```

Wait, with sets, iteration order isn't guaranteed but since we're using a heap for the topological sort, the order of adjacency doesn't matter for correctness. But converting sets to lists adds overhead.

Let me go with the set-of-edges approach for deduplication, then build adjacency lists. For performance, the set of tuples approach should work fine for 400k edges.

Actually, let me reconsider. The set-of-edges approach with `seen` set:
- Memory: 400k tuples in a set, plus adjacency lists
- Time: O(E) to process edges

The per-node set approach:
- Memory: 200k set objects (overhead) + actual edges
- Time: O(E) to process edges

Both should work. Let me go with the per-node set approach since it's cleaner:

```python
adj = [set() for _ in range(n)]
for a, b in edges:
    adj[a].add(b)
```

Then build indeg:
```python
indeg = [0] * n
for a in range(n):
    for b in adj[a]:
        indeg[b] += 1
```

Then Kahn's with heap:
```python
heap = [i for i in range(n) if indeg[i] == 0]
heapq.heapify(heap)
result = []
while heap:
    node = heapq.heappop(heap)
    result.append(node)
    for neighbor in adj[node]:
        indeg[neighbor] -= 1
        if indeg[neighbor] == 0:
            heapq.heappush(heap, neighbor)

if len(result) != n:
    raise ValueError("cycle detected")
return result
```

Self-loops: edge (a, a) means indeg[a] gets incremented by 1, and adj[a] contains a. When we process a, we decrement indeg[a] by 1. But a can never be in the heap initially (since indeg[a] >= 1), and it can never reach 0 because processing it requires it to already be processed. So it will never be added to the heap, and result length < n → cycle detected. 

Wait, let me trace through a self-loop: edge (2, 2).
- adj[2] = {2}, indeg[2] = 1
- Node 2 never has indeg 0, so never enters heap
- Result doesn't contain 2, so len(result) < n → ValueError. Correct!

Performance considerations:
- n = 200,000, E = 400,000
- Creating 200k sets: might be slow. Alternative: use defaultdict or just list of lists with dedup.

Actually, for performance, creating 200,000 set objects might be costly. Let me use a different approach:

Option 1: Sort edges, deduplicate, then build adjacency lists.
```python
edges.sort()  # or use a set
```

Option 2: Use a single set for dedup, then build lists.
```python
seen = set()
adj = [[] for _ in range(n)]
indeg = [0] * n
for a, b in edges:
    key = a * n + b  # if n is known, but n could be large... 200k * 200k = 40 billion, fits in int
    if key not in seen:
        seen.add(key)
        adj[a].append(b)
        indeg[b] += 1
```

Using integer keys instead of tuples for the set might be faster. a * n + b where n is the number of nodes. Since a < n and b < n, a*n + b is unique for each (a,b) pair.

Actually, n could be up to 200,000, so a*n + b could be up to 4*10^10 which fits in Python int fine.

Let me benchmark mentally: 400k set operations with integer keys should be fast.

Actually, for 400k edges, even using tuple sets should be fine in Python within a second. Let me not over-optimize and go with the cleaner set-of-tuples approach, or the per-node set approach.

Hmm, let me think about what's fastest:
1. `seen = set()` with tuple keys: 400k set add/check operations on tuples
2. Per-node sets: 200k set object creation + 400k set add operations
3. Sorting edges: O(E log E) = 400k * 19 ≈ 7.6M comparisons, then dedup in O(E)
4. Integer key set: 400k set add/check on integers (faster hashing than tuples)

I think option 4 (integer keys) or option 1 are both fine. Let me go with option 1 for clarity, but actually let me use the per-node set approach since it's the most Pythonic and handles dedup naturally.

Wait, actually for 200k nodes, creating 200k empty sets is expensive. Let me use `[None] * n` and only create sets when needed.

```python
adj = [None] * n
for a, b in edges:
    if adj[a] is None:
        adj[a] = set()
    adj[a].add(b)
```

Then when iterating:
```python
for neighbor in (adj[node] or ()):
```

Hmm, this is getting complex. Let me just use the tuple set approach which is cleanest:

```python
import heapq

def topo_order(n, edges):
    seen = set()
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        if (a, b) not in seen:
            seen.add((a, b))
            adj[a].append(b)
            indeg[b] += 1
    
    heap = [i for i in range(n) if indeg[i] == 0]
    heapq.heapify(heap)
    result = []
    
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for nb in adj[node]:
            indeg[nb] -= 1
            if indeg[nb] == 0:
                heapq.heappush(heap, nb)
    
    if len(result) < n:
        raise ValueError("cycle detected")
    return result
```

This should work. Let me check performance:
- Building adj and indeg: O(E) with set operations
- heapify: O(n) worst case but typically O(k) where k is number of zero-indegree nodes
- Main loop: O((n + E) log n) for heap operations
- For n=200k, E=400k: about 600k * 18 ≈ 10.8M operations for the heap. In Python this might be tight for 1 second.

Actually, Python's heapq is implemented in Python (with optional C acceleration in CPython). For 200k elements, each push/pop is O(log n) ≈ 18 operations. Total: 200k pops + up to 400k pushes = 600k * 18 = 10.8M basic operations. In CPython this could take a few seconds...

To speed up, I could avoid the heap overhead for the common case. But the requirement says lexicographically smallest, so we need the heap.

Actually, in CPython, `heapq` has C implementations (`_heapq`). So 600k operations on a heap of size up to 200k should be manageable. The C implementation of heappush/heappop is quite fast.

Let me also consider: instead of checking `(a, b) not in seen`, I could use a set of encoded integers for faster hashing:
```python
key = a * n + b  # unique since 0 <= a, b < n
```

This avoids tuple creation and hashing. Let me use this for performance.

Wait, actually a*n + b: if n = 200000, max key = 199999 * 200000 + 199999 ≈ 4 * 10^10. This is fine for Python integers.

Let me finalize the solution. I'll also add a fast path: if there are no edges, return range(n).

One more thought: self-loops. Edge (a, a): when we add it, indeg[a] increases, and adj[a] contains a. Node a can never be in the heap (its indegree is at least 1 from the self-loop, and even after processing all predecessors, the self-loop still contributes). Wait, no - if we process node a... but we can't process a because its indegree is never 0 (the self-loop ensures indeg[a] >= 1 forever). So a never enters the heap, never gets processed, and len(result) < n. Correct.

Let me write the final solution.
