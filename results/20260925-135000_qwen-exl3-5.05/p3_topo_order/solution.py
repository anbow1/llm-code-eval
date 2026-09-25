from heapq import heapify, heappop, heappush


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    heap = [i for i, d in enumerate(indeg) if d == 0]
    heapify(heap)

    order = [0] * n
    pos = 0

    while heap:
        u = heappop(heap)
        order[pos] = u
        pos += 1

        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                heappush(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")

    return order
