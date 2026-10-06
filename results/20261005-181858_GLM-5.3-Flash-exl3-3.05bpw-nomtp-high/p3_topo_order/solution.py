import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj: list[list[int]] = [[] for _ in range(n)]
    indegree = [0] * n
    seen: set[tuple[int, int]] = set()

    for a, b in edges:
        if (a, b) in seen:
            continue
        seen.add((a, b))
        adj[a].append(b)
        indegree[b] += 1

    heap = [v for v in range(n) if indegree[v] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        u = heapq.heappop(heap)
        result.append(u)
        for v in adj[u]:
            indegree[v] -= 1
            if indegree[v] == 0:
                heapq.heappush(heap, v)

    if len(result) != n:
        raise ValueError("graph contains a cycle")
    return result
