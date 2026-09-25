import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    """Return the lexicographically smallest topological ordering of the nodes.

    Nodes are 0..n-1. An edge (a, b) means a must appear before b.
    Duplicate edges are allowed.

    Raises ValueError if the graph contains a cycle (including a self-loop),
    or if an edge references a node outside 0..n-1.
    """
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        if not (0 <= a < n) or not (0 <= b < n):
            raise ValueError(f"invalid edge ({a}, {b}): nodes must be in 0..{n - 1}")
        adj[a].append(b)
        indeg[b] += 1

    # Kahn's algorithm with a min-heap: always emit the smallest currently
    # available node, which yields the lexicographically smallest order.
    heap = [v for v in range(n) if not indeg[v]]
    heapq.heapify(heap)

    heappush = heapq.heappush
    heappop = heapq.heappop
    append = order_append = (order := []).append

    while heap:
        v = heappop(heap)
        append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if not indeg[w]:
                heappush(heap, w)

    if len(order) != n:
        raise ValueError("graph contains a cycle: no topological ordering exists")

    return order
