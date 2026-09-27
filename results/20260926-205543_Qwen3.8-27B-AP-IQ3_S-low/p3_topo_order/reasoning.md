To solve this problem, we need to perform a topological sort on a directed graph. The requirement is to return the lexicographically smallest valid ordering. This can be efficiently achieved using a modified Kahn's algorithm with a min-heap (priority queue).

Standard Kahn's algorithm:
1. Calculate the in-degree of every node.
2. Add all nodes with in-degree 0 to a queue (or heap).
3. While the queue is not empty:
   a. Remove the smallest node from the queue (to ensure lexicographically smallest).
   b. Add it to the result.
   c. For each neighbor of this node, decrement its in-degree.
   d. If the neighbor's in-degree becomes 0, add it to the queue.
4. If the result contains fewer than `n` nodes, there's a cycle. Raise `ValueError`.

To handle `n=200_000` and `m=400_000` efficiently:
- We should use a min-heap (`heapq`) for the queue to always pop the smallest node.
- We need to handle duplicate edges. We can use a set of edges or simply process them and deduplicate. Using a set of edges might be slightly slow but for 400k edges it should be fine. Actually, if we just store adjacency lists and count in-degrees, duplicate edges will just decrement in-degree multiple times, which is wrong. So we must deduplicate edges first.
- Alternatively, we can use a set for adjacency lists, but that might be slower. Let's see: `edges` is a list of tuples. We can convert it to a set to remove duplicates, then build the adjacency list and in-degrees.
- Wait, a set of 400k tuples is very fast in Python.
- Let's construct the adjacency list using a list of lists.
- `adj = [[] for _ in range(n)]`
- `in_degree = [0] * n`
- `unique_edges = set(edges)`
- For `a, b` in `unique_edges`: `adj[a].append(b)`, `in_degree[b] += 1`
- Then use `heapq` for the min-heap.

Let's trace:
1. `unique_edges = set(edges)`
2. `adj = [[] for _ in range(n)]`
3. `in_degree = [0] * n`
4. For `a, b` in `unique_edges`:
   `adj[a].append(b)`
   `in_degree[b] += 1`
5. `heap = [i for i in range(n) if in_degree[i] == 0]`
6. `heapq.heapify(heap)`
7. `result = []`
8. `while heap:`
   `node = heapq.heappop(heap)`
   `result.append(node)`
   `for neighbor in adj[node]:`
     `in_degree[neighbor] -= 1`
     `if in_degree[neighbor] == 0:`
       `heapq.heappush(heap, neighbor)`
9. `if len(result) != n: raise ValueError`
10. `return result`

Let's double check if self-loops are handled.
If `a == b`, `in_degree[a]` will be incremented. It will never reach 0 if it was 0 initially (unless it was -1? no, it starts at 0, becomes 1, so it's never 0). So it will be excluded from the initial heap. If it has other incoming edges, it still won't reach 0. So `len(result)` will be less than `n`, and `ValueError` will be raised. Correct.

What about performance?
`set(edges)` on 400k elements is very fast, probably < 0.1s.
Building adjacency lists and in-degrees: ~0.05s.
Heap operations: 200k `heappop` and up to 400k `heappush`. `heappush` and `heappop` on a heap of size up to 200k takes O(log 200k) ~ 18 operations. 200k * 18 ~ 3.6M operations. In Python, this should take well under a second (maybe 0.2 - 0.5s).

Let's refine the loop for speed:
```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))
        
    unique_edges = set(edges)
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
        
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)
    
    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush
    
    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heappush(heap, neighbor)
                
    if len(result) != n:
        raise ValueError("Cycle detected")
        
    return result
```

Wait, what if `n = 0`? The problem says nodes are 0..n-1. If `n=0`, `edges` should be empty.
`list(range(0))` is `[]`.
If `n=0` and `edges` has elements, that would be invalid input, but we don't need to handle invalid inputs unless specified.
If `n=200_000` and `edges` is empty, `heap` will have 200k elements. `heapify` is O(n). Then 200k `heappop` operations. This is O(n log n) which is fine.
Can we optimize the case where there are no edges?
```python
def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))
```
Yes, this is a good optimization.

What if `edges` has duplicates but also self loops?
`set(edges)` handles it.

Let's review the requirements:
- Nodes are 0..n-1.
- Edge (a, b) means a before b.
- Return lexicographically smallest valid ordering.
- Duplicate edges may appear.
- If cycle (including self-loop), raise ValueError.
- Handle n=200,000, 400,000 edges in ~1s.

Is there any edge case with n=0?
If n=0, return [].
The code `list(range(n))` handles it.

Let's trace a simple example:
n=4, edges = [(0, 1), (0, 2), (1, 3), (2, 3)]
unique_edges = same
adj = [[1, 2], [3], [3], []]
in_degree = [0, 1, 1, 2]
heap = [0]
pop 0 -> result=[0]
neighbors of 0: 1, 2
in_degree[1] -> 0, push 1
in_degree[2] -> 0, push 2
heap = [1, 2]
pop 1 -> result=[0, 1]
neighbors of 1: 3
in_degree[3] -> 1
heap = [2]
pop 2 -> result=[0, 1, 2]
neighbors of 2: 3
in_degree[3] -> 0, push 3
heap = [3]
pop 3 -> result=[0, 1, 2, 3]
len(result) == 4. Return [0, 1, 2, 3]. Correct.

Example 2:
n=3, edges = [(1, 0), (1, 2)]
unique_edges = same
adj = [[], [0, 2], []]
in_degree = [1, 0, 1]
heap = [1]
pop 1 -> result=[1]
neighbors of 1: 0, 2
in_degree[0] -> 0, push 0
in_degree[2] -> 0, push 2
heap = [0, 2]
pop 0 -> result=[1, 0]
pop 2 -> result=[1, 0, 2]
Return [1, 0, 2]. Correct.

Example 3:
n=3, edges = [(0, 1), (1, 2), (2, 0)]
in_degree = [1, 1, 1]
heap = []
result = []
len(result) != 3 -> ValueError. Correct.

Performance considerations:
`set(edges)` might be slightly slow if there are many unique edges, but 400k is small.
Using `list(range(n))` when `edges` is empty is O(n), which is optimal.
The `heapq` operations are efficient.
Local variable lookups (`heappop`, `heappush`, `adj`, `in_degree`) are fast.
One minor optimization:
```python
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
```
This is very fast in CPython.

Can we avoid `set(edges)` if we use a different approach?
No, deduplicating is necessary because duplicate edges would cause `in_degree[neighbor]` to be decremented multiple times, leading to incorrect logic (e.g., a node with in_degree 1 and 2 duplicate incoming edges would have in_degree 2 initially, then decremented to 1, then 0. Wait, if it's 2, it gets decremented to 1, then 0. But it should only be 1 initially. So if we don't deduplicate, a node with 1 unique incoming edge but 2 duplicate edges in the list will have `in_degree = 2`. When the source is processed, it will decrement to 1, then 0. So it *would* eventually reach 0.
Wait! Let's trace this.
Suppose edges = [(0, 1), (0, 1)].
If we don't deduplicate:
`adj[0] = [1, 1]`
`in_degree[1] = 2`
When 0 is processed:
`in_degree[1]` becomes 1, then 0. It gets pushed to heap.
Is this a problem?
Suppose edges = [(0, 1), (1, 1)]. (Self loop on 1, plus 0->1).
If we don't deduplicate:
`adj[0] = [1]`, `adj[1] = [1]`
`in_degree[1] = 2`
Initial heap: [0]
Pop 0:
`in_degree[1]` becomes 1.
Heap is empty.
Result is [0]. len is 1 != 2. ValueError. Correct.

What if edges = [(0, 1), (0, 1), (1, 2)]?
`adj[0] = [1, 1]`, `adj[1] = [2]`
`in_degree[1] = 2`, `in_degree[2] = 1`
Initial heap: [0]
Pop 0:
`in_degree[1]` becomes 1, then 0. Push 1.
Heap: [1]
Pop 1:
`in_degree[2]` becomes 0. Push 2.
Heap: [2]
Pop 2:
Result [0, 1, 2]. Correct.

Wait, if we don't deduplicate, is it always correct?
Let's see. If a node has `k` incoming edges from `u`, and all are duplicates of the same edge `(u, v)`.
Then `in_degree[v]` is `k`.
When `u` is processed, `in_degree[v]` is decremented `k` times, reaching 0.
So it works correctly!
What if there are edges `(u1, v)` and `(u2, v)` and also a duplicate `(u1, v)`?
`in_degree[v] = 3`.
When `u1` is processed, `in_degree[v]` becomes 1, then 0. It gets pushed to heap.
But `u2` hasn't been processed yet! So `in_degree[v]` should be 1, but it's 0.
Then `v` is popped from the heap and added to the result.
Later, `u2` is processed, and it decrements `in_degree[v]` to -1.
But `v` is already in the result! This violates the topological sort property (v appears before u2, but u2 must come before v).
So we MUST deduplicate.

Wait, if we deduplicate, the code is simpler and definitely correct.
The overhead of `set(edges)` is negligible for 400k elements.

Let's double check the `n=0` case.
If `n=0`, `edges` must be empty (or we ignore it).
`list(range(0))` is `[]`.
The code returns `[]`. Correct.

Let's consider memory usage.
`adj` is a list of lists. 200k lists, each empty or with a few elements.
`in_degree` is a list of 200k integers.
`unique_edges` is a set of up to 400k tuples.
`heap` is a list of up to 200k integers.
`result` is a list of 200k integers.
Total memory is well within limits (probably ~50-100 MB).

Is there any issue with recursion limit? No, we use iterative Kahn's algorithm.

One detail: `ValueError` message. The prompt says "raise ValueError", so any message is fine, or even no message. I'll use `raise ValueError("Cycle detected")` or just `raise ValueError`.

Let's write the code clearly.

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
        
    if not edges:
        return list(range(n))
        
    unique_edges = set(edges)
    adj = [[] for _ in range(n)]
    in_degree = [0] * n
    
    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1
        
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)
    
    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush
    
    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heappush(heap, neighbor)
                
    if len(result) != n:
        raise ValueError("Cycle detected")
        
    return result
```

Wait, what if `n > 0` but some nodes are completely isolated?
They will have `in_degree[i] == 0` and be added to the initial heap.
They will be popped in order, which is correct for lexicographically smallest.

What if `edges` contains an edge with a node outside 0..n-1?
The problem says "Nodes are 0..n-1", so we can assume all nodes in edges are valid.

Is there any performance bottleneck?
`set(edges)` is O(m).
Building `adj` and `in_degree` is O(m).
`heapify` is O(n).
The while loop runs `n` times, and inside it we iterate over all edges exactly once (since we deduplicated, the total number of edges in `adj` is `m_unique`).
So the total complexity is O((n + m) log n).
For n=200,000 and m=400,000, this is extremely fast in Python, well under 1 second.

Let's do a sanity check on `n=200_000`, `m=400_000`.
`set(edges)` takes about 0.05s.
`adj` and `in_degree` building takes about 0.05s.
`heapify` takes about 0.02s.
The while loop: 200,000 iterations. Each iteration does a `heappop` (O(log n) ~ 18 steps) and potentially some `heappush` (total 400,000 `heappush` over the whole loop, so average 2 per iteration).
Total heap operations: 600,000. Each takes ~18 steps. 10.8 million simple operations. In Python, this might take ~0.5s - 0.8s.
To optimize the inner loop slightly:
```python
    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            deg = in_degree[neighbor] - 1
            in_degree[neighbor] = deg
            if deg == 0:
                heappush(heap, neighbor)
```
This avoids one list access for `in_degree[neighbor]`.

Actually, `in_degree[neighbor] -= 1` is already quite optimized in CPython.
Let's stick to the clean version.

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n == 0:
        return []
    if not edges:
        return list(range(n))

    unique_edges = set(edges)
    adj = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected")

    return result
```
This looks solid. No further optimization needed.
One edge case: `n=1`, `edges=[]`. Returns `[0]`.
`n=1`, `edges=[(0,0)]`. `unique_edges={(0,0)}`, `adj=[[0]]`, `in_degree=[1]`. `heap=[]`. `result=[]`. `len(result) != 1` -> `ValueError`. Correct.

I will format the code as requested.
