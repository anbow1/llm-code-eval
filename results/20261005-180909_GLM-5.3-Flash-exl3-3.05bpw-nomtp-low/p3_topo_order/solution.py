import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        if a == b:
            raise ValueError("cycle detected")
        adj[a].append(b)
        indeg[b] += 1

    heap = [v for v in range(n) if indeg[v] == 0]
    heapq.heapify(heap)
    result: list[int] = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                heapq.heappush(heap, v)

    if len(result) != n:
        raise ValueError("cycle detected")
    return result
