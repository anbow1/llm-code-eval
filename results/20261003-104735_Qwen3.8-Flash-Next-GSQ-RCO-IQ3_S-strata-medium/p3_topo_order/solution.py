import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree: list[int] = [0] * n
    seen: set[tuple[int, int]] = set()

    for a, b in edges:
        if a == b:
            raise ValueError("cycle detected")
        edge = (a, b)
        if edge not in seen:
            seen.add(edge)
            adj[a].append(b)
            in_degree[b] += 1

    heap: list[int] = [i for i in range(n) if in_degree[i] == 0]
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
        raise ValueError("cycle detected")

    return result
