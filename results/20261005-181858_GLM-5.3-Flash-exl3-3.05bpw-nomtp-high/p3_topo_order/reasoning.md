Lexicographically smallest topo order → Kahn's algorithm with heapq. Duplicate edges: need careful indegree counting — dedupe edges or decrement indegree properly. If we store adjacency as sets or dedupe via seen set, indegree counts correctly. For self-loop, node depends on itself → cycle detected (heap empties before processing all nodes). Actually self-loop: indegree includes itself, never removed → leftover nodes → ValueError. Good.

Implementation: dedupe edges with a set, build adjacency lists, indegree array, heapq. Use heappush/heappop.

Performance: 200k nodes, 400k edges — fine.