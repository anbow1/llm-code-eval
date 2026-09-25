We need a topological sort returning the lexicographically smallest valid ordering. The standard approach: Kahn's algorithm with a min-heap (priority queue) instead of a queue. That gives O((V + E) log V).

With n = 200,000 and 400,000 edges, heapq with 200k nodes and 400k edges is fine in Python — roughly a few million heap operations at most, should be about a second or less.

Edge cases:
- Duplicate edges: must be careful — if we increment in-degree multiple times for the same duplicate edge, we need the corresponding decrements (i.e., adjacency list stores duplicates too, and each occurrence decrements its target once). That works fine: duplicates in adjacency list mean in-degree counted multiple times, and when processing node a, we decrement for each copy. That's consistent. Alternatively deduplicate. Either works; keeping duplicates is simplest and consistent.

- Self-loop (a, a): in-degree of a includes itself, so a never reaches in-degree 0, heap exhausts early, and we detect cycle by comparing processed count to n. Raise ValueError.

- Cycle detection: if len(result) != n after processing, raise ValueError.

Lexicographically smallest: use heapq of available zero-in-degree nodes; each step pop smallest, append, then decrement its neighbors, pushing newly zero nodes.

Performance considerations:
- adjacency: build as list of lists; for 400k edges, appending is fine.
- Use heapq.heappush/heappop.
- Avoid function call overhead inside loops where possible.

Let me write:

```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1
    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)
    result = []
    push = heapq.heappush
    pop = heapq.heappop
    append = result.append
    while heap:
        v = pop(heap)
        append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                push(heap, w)
    if len(result) != n:
        raise ValueError("graph contains a cycle")
    return result
```

Wait — edges validation: nodes assumed 0..n-1. Should we validate? The problem says nodes are 0..n-1, so inputs are within range. We could optionally guard but not necessary. I might add minimal validation... The spec doesn't require it; keep it simple but maybe raising IndexError naturally on out-of-range is fine. Actually `adj[a]` with a >= n raises IndexError; with negative a, it wraps (negative indexing) — that would be a bug silently. But spec says nodes are 0..n-1, so we don't need to handle. I'll skip validation to keep performance.

Duplicate edges: handled correctly as discussed — indeg counts duplicates and adj processes each duplicate, so node b's indegree reaches 0 exactly when all copies of all incoming edges processed. Correct.

Self-loop: edge (a,a) increments indeg[a]; when a would be processed... a never gets indeg 0 (it decrements only when a is popped, but a can only be popped if indeg 0 first — actually if indeg[a] becomes 0 via other edges and then a is popped, decrementing indeg[a] again makes it negative, and a is already in result. Hmm, careful: if a has a self-loop plus other incoming edges. indeg[a] = 1 (self) + k others. Others get processed, indeg[a] becomes 1, never 0, so a never pushed. Fine. But what if a has no other incoming edges and self-loop only: indeg[a]=1, never 0. Fine. What if somehow a is popped, then self-loop decrements indeg[a] to -1? That can't happen because a is only popped when indeg[a]==0, and the self-loop contributes 1 to indeg that only gets decremented when a itself is popped — so indeg[a] >= 1 until a is popped, contradiction. So a with self-loop never enters the heap. Good — cycle detected by count mismatch.

Performance: 200k nodes, 400k edges. Building adjacency with list comprehensions and appends: ~400k appends, fine. Heapify O(n). Main loop: each edge iteration does an indeg decrement and possibly a push. Total heap operations ~ 200k pops + up to 400k... actually pushes ≤ number of edges (≤ 400k). Each log n ≈ 18. Total maybe ~ 10-20 million basic ops... Actually let's count: 400k edge relaxations (cheap), plus pushes ≤ 400k * log ≈ 7M, pops 200k * log ≈ 3.6M. Python does roughly 10-30M simple ops/sec... heapq is C-implemented, so heappush is fast (~ maybe 0.5µs each). 600k heap ops * ~1µs = 0.6s? Hmm, heapq in CPython is C-accelerated (_heapq), so heappush is quite fast — around 100-300ns for small heaps? For a heap of 200k ints, sift depth ~18, still fast. Realistically this runs well under a second for 400k edges. Standard.

One micro-optimization: reading edges — `for a, b in edges` is fine.

Another subtle point: could use indeg checks to skip duplicates of zero-indegree pushes — not needed.

Also note: to make lexicographically smallest correct, greedy min-heap Kahn is the standard proven approach. Yes: among all available nodes (in-degree 0 whose predecessors all emitted), picking smallest at each step yields lexicographically smallest topological order. That's correct.

Alternative approach for lexicographic smallest: reverse graph DFS with sort — but heap Kahn is fine.

Edge case n=0: heap empty, result empty, len==0==n, return []. Fine.

Memory: adjacency lists for 400k edges — fine.

One more optimization: instead of list of lists with append, we could use counting sort / CSR representation for speed: compute out-degrees, build index arrays, fill targets. That's faster in Python for large inputs. Let's consider implementing CSR to handle the perf requirement robustly (~1 second):

CSR approach:
```python
def topo_order(n, edges):
    m = len(edges)
    # out-degree per node
    outdeg = [0]*(n)
    indeg = [0]*(n)
    for a, b in edges:
        outdeg[a] += 1
        indeg[b] += 1
    # prefix sums
    start = [0]*(n+1)
    s = 0
    for v in range(n):
        start[v] = s
        s += outdeg[v]
    start[n] = s
    # fill
    pos = start[:]  # copy... but start has n+1 entries; need per-node fill pointer
```

Hmm, CSR building involves ~400k + 200k operations each stage — comparable to just using lists of lists. The list-of-lists approach with append is actually quite fast in CPython. Both are similar. For 400k edges both take maybe 0.1–0.2s to build. Heap ops dominate slightly.

Actually, a cleaner hybrid: build adjacency as list of lists (simple), heapify the initial zero-indegree list.

But there's a subtle performance issue: iterating `for w in adj[v]` where adj[v] is a list — fine.

Alternatively, dedupe edges? Not necessary; duplicates count consistently.

I could also consider that with duplicates, indeg[b] increments multiple times and each duplicate edge triggers one decrement — consistent. Good.

Let me also handle invalid node indices gracefully? The spec doesn't ask. I'll optionally raise ValueError for out-of-range to be safe? That adds a check per edge (400k checks) — cheap-ish but adds time. The spec says nodes are 0..n-1, so I'll trust input but maybe add a minimal guard since silent negative-index wrap would corrupt results. Hmm. Negative a would write into adj[a] via negative index and indeg[b]+=1 with negative b index — producing wrong output silently rather than error. Given robustness, a cheap validation: check `if not (0 <= a < n and 0 <= b < n): raise ValueError(...)`. That's ~400k checks — maybe 0.05–0.1s. Acceptable. But the spec says nodes are guaranteed 0..n-1. Including validation is defensive; I think it's reasonable to include but it slows by a bit. Hmm, "Must handle n=200_000 with 400_000 edges in about a second" — a few extra checks won't break that.

I'll include validation but make it lightweight. Actually, I could skip it to keep it fast and simple. Let me think about what a good answer looks like: correctness + performance + cycle detection. Validation of bounds is a nice touch; I'll include it since correctness matters and negative indices are a silent-corruption hazard. But it does add overhead in the hot loop. 

Alternative: validate outside the loop using min/max? `min(a for a,b in edges)` etc. — that's extra passes. Or during the main loop, out-of-range node would cause IndexError on indeg[w] anyway if w >= n (indeg list index error) — but negative would wrap. I'll do inline check: two comparisons per edge.

Actually, let me do it simply:

```python
for a, b in edges:
    if not (0 <= a < n and 0 <= b < n):
        raise ValueError(f"edge ({a}, {b}) references a node outside 0..{n-1}")
    adj[a].append(b)
    indeg[b] += 1
```

Hmm, chained comparison `0 <= a < n and 0 <= b < n` — fine.

Actually, I reconsider: the problem statement defines the contract: nodes are 0..n-1. Defensive checks for contract violations are optional. I'll include them lightly — I think it's fine and shows care about the silent negative-index bug. But maybe keep the hot loop lean... The check is per edge, not per heap op, so ~400k checks ≈ negligible (tens of ms).

Let me also think about the heap: pushing ints, dedupe not needed since a node pushed exactly once (when its indeg hits 0, and indeg only decreases past each value once... wait, could indeg[w] hit 0 twice? indeg[w] decrements once per incoming edge occurrence; it hits 0 exactly once — after all copies decremented, further decrements don't happen because decrements only occur while iterating the popped node's adjacency, each occurrence once total. Yes, each edge occurrence processed exactly once, so each node's indeg reaches 0 at most once → pushed at most once. Good.

Now finalize code with docstrings and comments.

```python
import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    """Return the lexicographically smallest topological order of a DAG.

    Nodes are 0..n-1; an edge (a, b) requires a before b.
    Duplicate edges are allowed. Raises ValueError on cycles (incl. self-loops).
    """
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        if not (0 <= a < n) or not (0 <= b < n):
            raise ValueError(f"invalid edge ({a}, {b}): nodes must be in 0..{n - 1}")
        adj[a].append(b)
        indeg[b] += 1

    heap = [v for v in range(n) if not indeg[v]]
    heapq.heapify(heap)

    heappush = heapq.heappush
    heappop = heapq.heappop
    order: list[int] = []
    append = order.append

    while heap:
        v = heappop(heap)
        append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if not indeg[w]:
                heappush(heap, w)

    if len(order) != n:
        raise ValueError("graph contains a cycle; no topological ordering exists")

    return order
```

Check `not indeg[v]` — indeg values are non-negative ints; `not indeg[v]` true iff 0. Good.

`if not indeg[w]` after decrement — careful: indeg could go negative? No, as argued each occurrence decremented once, and indeg counted each occurrence once, so it lands exactly at 0, never negative. Unless duplicates counted... consistent. Good.

Self-loop: (a,a): adj[a] contains a, indeg[a] += 1. a never reaches 0 before being popped. Correct.

Cycle detection via count. Good.

Should I also handle n=0 with edges nonempty? Then any edge would be invalid → ValueError. With check, yes raises. Without check, adj[a] IndexError (only if a>=0... n=0, edges empty impossible if valid). With validation it's ValueError. Fine.

Performance micro-notes: `heapq.heapify` on list comprehension — good. The main loop: for 400k edges, inner body ~ two ops. Fine.

One more consideration: for the lexicographically smallest property — yes, min-heap Kahn.

Potential alternative for speed: using indeg decrement without attribute lookups — already localized.

I think this is good. Add type hints, docstring. Return type list[int].

Also note Python 3.11+ — fine.

Final answer as single python code block. No tests/no examples. Comments minimal.