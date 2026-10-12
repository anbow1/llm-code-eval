Topological sort with Kahn's algorithm using a heap for lexicographically smallest order. Detect cycles when processed count < n.

Use heapq, adjacency lists as list of lists. For duplicates, they're fine—Kahn handles them naturally; indegree counts duplicates correctly since each duplicate edge increments indegree and decrements once.