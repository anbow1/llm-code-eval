import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n <= 0:
        return []
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n

    # Parallel edges are handled consistently:
    # each edge instance increments indegree and is decremented once.
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    # Built in increasing node order, so this sorted list is already a valid min-heap.
    heap = [i for i, d in enumerate(indeg) if d == 0]
    if not heap:
        raise ValueError("cycle detected")

    heappop = heapq.heappop
    heappush = heapq.heappush

    order = []
    append = order.append
    adj_local = adj
    indeg_local = indeg

    while heap:
        v = heappop(heap)
        append(v)

        for w in adj_local[v]:
            new_indeg = indeg_local[w] - 1
            indeg_local[w] = new_indeg
            if new_indeg == 0:
                heappush(heap, w)

    if len(order) != n:
        raise ValueError("cycle detected")

    return order
