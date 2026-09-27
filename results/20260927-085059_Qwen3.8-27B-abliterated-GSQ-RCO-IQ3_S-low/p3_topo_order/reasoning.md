The user wants a topological sort that returns the lexicographically smallest valid ordering.

Key requirements:
1. Nodes are 0..n-1
2. Edge (a, b) means a must come before b
3. Return lexicographically smallest valid ordering
4. Duplicate edges may appear
5. If cycle (including self-loop), raise ValueError
6. Must handle n=200_000 with 400_000 edges in about a second

For lexicographically smallest topological order, we use a min-heap (priority queue) instead of a regular queue in Kahn's algorithm. At each step, we pick the node with the smallest index among all nodes with in-degree 0.

For performance with n=200_000 and 400_000 edges:
- Use adjacency list
- Use a heap for the priority queue
- Need to handle duplicate edges carefully - if there are duplicate edges, we need to make sure we only decrement the in-degree once per unique edge. Wait, actually if we process the edge list and add each edge to the adjacency list and increment in-degree, duplicate edges would cause the in-degree to be incremented multiple times. So when we process node a and look at its neighbors, we'd decrement the neighbor's in-degree for each duplicate edge. That should still work correctly - if there are 2 edges from a to b, then b's in-degree is incremented by 2, and when we process a, we decrement it by 2 (once for each edge in the adjacency list). So it still works.

Actually wait, let me think again. If we have duplicate edges (a, b) appearing twice, then:
- in_degree[b] gets incremented by 2
- adj[a] contains b twice
- When we process a, we iterate over adj[a], see b twice, and decrement in_degree[b] by 2

So the net effect is the same as if the edge appeared only once. This is correct.

However, for performance, we might want to use a set to deduplicate edges first. But with 400_000 edges, using a set of tuples should be fine.

Actually, let me think about whether we even need to deduplicate. If we don't deduplicate:
- We store 400_000 edges in the adjacency list
- We do 400_000 in-degree increments
- We do 400_000 in-degree decrements

This should still be fast enough. Let me think about memory and time.

For the heap approach:
- Initialize heap with all nodes with in-degree 0: O(n)
- Each node is pushed and popped from the heap at most once: O(n log n)
- Processing edges: O(E)
- Total: O((n + E) log n) which for n=200k, E=400k should be well under a second.

For cycle detection: if the number of nodes processed is less than n, there's a cycle.

Let me write the solution:

```python
import heapq
from collections import defaultdict

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1
    
    # Min-heap of nodes with in-degree 0
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
- Building adj and in_degree: O(E)
- Heapify: O(n)
- Each node is pushed once and popped once: O(n log n)
- Each edge is processed once: O(E)
- Total: O((n + E) log n) worst case, but typically much faster since each edge only causes a push if in-degree becomes 0.

Actually the total work in the while loop is:
- n pops from heap: O(n log n)
- For each pop, iterate over adj[node]: total O(E)
- For each neighbor, push if in-degree becomes 0: at most n pushes total: O(n log n)

So total is O((n + E) log n) in the worst case for heap operations, plus O(n + E) for the rest.

For n=200k, E=400k: roughly 600k * log(200k) ≈ 600k * 18 ≈ 10.8M operations. Should be well under a second in Python.

One thing to consider: using a list of lists for adj with 400k entries should be fine memory-wise.

Let me also consider: should I deduplicate edges? If there are many duplicate edges, it could waste time. But the problem says 400k edges total, so even without deduplication, it's manageable.

Actually, I realize there could be a subtle issue with self-loops. If (a, a) is an edge, then in_degree[a] gets incremented, and when we process a (if its in-degree ever becomes 0), we'd decrement it. But if a has a self-loop, its in-degree starts at 1 (at minimum), so it won't be 0 initially unless there are other edges that cancel it out (which can't happen since in-degrees only go up from edges). So a node with a self-loop will never have in-degree 0 (assuming no other edges remove it), and it will never be processed, leading to a cycle detection. Good.

Wait, actually in-degree only increases, it doesn't decrease except when we process the source node. So if a has a self-loop, in_degree[a] >= 1. For a to be processed, in_degree[a] must reach 0. The self-loop means when we process a, we'd decrement in_degree[a] by 1. But a can only be processed after its in-degree reaches 0, which requires all incoming edges to be "resolved". The self-loop is an incoming edge from a to itself, so a's in-degree includes the self-loop. This means a's in-degree will never reach 0 (because processing a would be needed to reduce the self-loop's contribution, but a can't be processed until its in-degree is 0). So self-loops are correctly detected as cycles. 

The solution looks correct and efficient. Let me finalize it.
