import heapq


def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    # Deduplicate edges to handle duplicates correctly
    unique_edges = set(edges)

    # Build adjacency list and in-degree array
    adj: list[list[int]] = [[] for _ in range(n)]
    in_degree: list[int] = [0] * n

    for a, b in unique_edges:
        adj[a].append(b)
        in_degree[b] += 1

    # Min-heap of available nodes (in-degree 0)
    heap: list[int] = [i for i in range(n) if in_degree[i] == 0]
    heapq.heapify(heap)

    result: list[int] = []
    while heap:
        node = heapq.heappop(heap)
        result.append(node)
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                heapq.heappush(heap, neighbor)

    if len(result) != n:
        raise ValueError("Cycle detected in the graph")

    return result
