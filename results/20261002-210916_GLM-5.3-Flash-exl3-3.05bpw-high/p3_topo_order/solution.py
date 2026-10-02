import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    seen_edges: set[tuple[int, int]] = set()
    for a, b in edges:
        if (a, b) in seen_edges:
            continue
        seen_edges.add((a, b))
        adj[a].append(b)
        indeg[b] += 1

    heap: list[int] = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)
    order: list[int] = []

    while heap:
        u = heapq.heappop(heap)
        order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
