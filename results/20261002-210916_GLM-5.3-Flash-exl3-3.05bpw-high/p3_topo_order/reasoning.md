Use Kahn's algorithm with heapq for lexicographically smallest order. Handle duplicate edges via set. Detect cycles when output length < n. Self-loops also produce cycle detection naturally.

Implementation: use deduplicated adjacency lists as arrays of lists. For 400k edges, fine.