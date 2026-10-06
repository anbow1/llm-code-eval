import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    """
    Returns the lexicographically smallest topological ordering of nodes 0..n-1
    given precedence edges (a, b) meaning a must precede b.

    Uses Kahn's algorithm with a min-heap so that, among all valid orderings,
    the lexicographically smallest one is produced. Duplicate edges are
    collapsed for efficiency. Raises ValueError on cycles (incl. self-loops).

    Complexity: O((V + E) log V), fast enough for n=200_000, E=400_000.
    """
    adj: list[set[int]] = [set() for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        if b not in adj[a]:
            adj[a].add(b)
            indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order: list[int] = []
    append = order.append
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        u = heappop(heap)
        append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)

    if len(order) != n:
        raise ValueError("graph contains a cycle")

    return order
