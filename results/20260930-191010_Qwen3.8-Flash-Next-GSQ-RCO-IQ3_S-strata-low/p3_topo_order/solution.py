import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    indeg = [0] * n
    adj = [[] for _ in range(n)]

    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    heapq.heapify(heap)

    order = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        u = heappop(heap)
        order.append(u)

        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heappush(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")

    return order
