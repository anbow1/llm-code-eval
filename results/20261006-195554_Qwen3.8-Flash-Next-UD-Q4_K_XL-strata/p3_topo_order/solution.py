import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1

    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    heappop = heapq.heappop
    heappush = heapq.heappush

    while heap:
        node = heappop(heap)
        result.append(node)
        for nxt in adj[node]:
            in_degree[nxt] -= 1
            if in_degree[nxt] == 0:
                heappush(heap, nxt)

    if len(result) != n:
        raise ValueError("graph contains a cycle")

    return result
