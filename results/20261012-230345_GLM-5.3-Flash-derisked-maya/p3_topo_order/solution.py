import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    seen = [[False] * n for _ in range(n)]  # replaced below for memory efficiency

    # For large n, a set of pairs is better than an n x n matrix.
    # Deduplicate edges to avoid inflated indegrees/adjacency lists.
    edge_set = set()
    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references nodes outside 0..{n-1}")
        if (a, b) not in edge_set:
            edge_set.add((a, b))
            adj[a].append(b)
            indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order = []
    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(order) != n:
        raise ValueError("graph contains a cycle")

    return order
