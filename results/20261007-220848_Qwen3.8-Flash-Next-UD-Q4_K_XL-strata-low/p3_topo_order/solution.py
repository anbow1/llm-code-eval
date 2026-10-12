import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_deg: list[int] = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1

    # Start with all nodes that have in-degree 0
    heap = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for nb in adj[node]:
            in_deg[nb] -= 1
            if in_deg[nb] == 0:
                heapq.heappush(heap, nb)

    if len(result) != n:
        raise ValueError("cycle detected")

    return result
