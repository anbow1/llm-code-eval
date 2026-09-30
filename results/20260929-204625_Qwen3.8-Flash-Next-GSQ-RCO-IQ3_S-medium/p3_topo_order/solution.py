import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_deg: list[int] = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_deg[b] += 1

    heap: list[int] = [i for i in range(n) if in_deg[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                heapq.heappush(heap, v)

    if len(result) < n:
        raise ValueError("cycle detected")

    return result
