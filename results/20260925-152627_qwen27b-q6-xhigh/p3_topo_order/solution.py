from heapq import heappop, heappush


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    # Zero-indegree nodes are collected in increasing order, so this list is
    # already a valid min-heap.
    heap = [i for i, d in enumerate(indeg) if d == 0]

    if n and not heap:
        raise ValueError("graph contains a cycle")

    order = [0] * n
    pos = 0

    pop = heappop
    push = heappush

    while heap:
        u = pop(heap)
        order[pos] = u
        pos += 1

        for v in adj[u]:
            d = indeg[v] - 1
            indeg[v] = d
            if d == 0:
                push(heap, v)

    if pos != n:
        raise ValueError("graph contains a cycle")

    return order
