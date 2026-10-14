import heapq
from heapq import heapify, heappop, heappush

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapify(heap)

    result = []
    while heap:
        u = heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                heappush(heap, v)

    if len(result) < n:
        raise ValueError("cycle detected")

    return result
