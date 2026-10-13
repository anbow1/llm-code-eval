import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n < 0:
        raise ValueError("n must be non-negative")

    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    seen: set[tuple[int, int]] = set()

    for a, b in edges:
        if not (0 <= a < n and 0 <= b < n):
            raise ValueError(f"edge ({a}, {b}) references invalid node")
        if (a, b) in seen:
            continue
        seen.add((a, b))
        adj[a].append(b)
        indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)

    order: list[int] = []
    append = order.append
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        v = heappop(heap)
        append(v)
        for w in adj[v]:
            indeg[w] -= 1
            if indeg[w] == 0:
                heappush(heap, w)

    if len(order) != n:
        remaining = [v for v in range(n) if indeg[v] > 0]
        if any(a == b for a, b in seen if a == b):
            raise ValueError("graph contains a self-loop")
        raise ValueError("graph contains a cycle")
    return order
