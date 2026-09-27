import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree: list[int] = [0] * n

    for a, b in edges:
        adj[a].append(b)
        in_degree[b] += 1

    # Min-heap over all source nodes (in-degree 0)
    heap = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for nb in adj[node]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                heapq.heappush(heap, nb)

    if len(result) != n:
        raise ValueError("Graph contains a cycle")

    return result
