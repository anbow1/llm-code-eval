import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree: list[int] = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap: list[int] = []
    for i in range(n):
        if in_degree[i] == 0:
            heapq.heappush(heap, i)

    result: list[int] = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                heapq.heappush(heap, v)

    if len(result) != n:
        raise ValueError("Cycle detected in graph")

    return result
