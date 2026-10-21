from heapq import heapify, heappush, heappop


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    adj = [[] for _ in range(n)]
    indegree = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indegree[b] += 1

    heap = [i for i in range(n) if indegree[i] == 0]
    heapify(heap)

    result = []
    push = heappush
    pop = heappop
    append = result.append

    while heap:
        node = pop(heap)
        append(node)

        for nxt in adj[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                push(heap, nxt)

    if len(result) != n:
        raise ValueError("graph contains a cycle")

    return result
