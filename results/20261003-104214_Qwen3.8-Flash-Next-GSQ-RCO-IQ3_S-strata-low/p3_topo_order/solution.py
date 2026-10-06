from heapq import heappush, heappop


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    # Collected in increasing node order, which is already a valid min-heap.
    heap = [i for i, deg in enumerate(indeg) if deg == 0]

    order = []
    append_order = order.append
    push = heappush
    pop = heappop

    while heap:
        u = pop(heap)
        append_order(u)

        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if len(order) != n:
        raise ValueError("cycle detected")

    return order
