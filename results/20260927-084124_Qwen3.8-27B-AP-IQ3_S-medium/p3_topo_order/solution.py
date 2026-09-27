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
    heappush = heapq.heappush
    heappop = heapq.heappop

    while heap:
        node = heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_deg[neighbor] -= 1
            if in_deg[neighbor] == 0:
                heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected in graph")

    return result
