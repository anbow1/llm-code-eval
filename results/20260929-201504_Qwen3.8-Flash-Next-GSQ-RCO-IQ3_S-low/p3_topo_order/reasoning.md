We need answer with Python code block only. Need design topo_order lexicographically smallest for DAG with n up to 200k, edges 400k. Use heap of zero indegree nodes. Duplicate edges: if not handled, indegree increments duplicates, adjacency duplicates; when processing duplicates, decrement indegree multiple times but node only pushed when reaches zero. Is that okay? Yes, if duplicate edges from processed a to b, indegree counts duplicates, processed decrements duplicates, eventually zero after all duplicates. It won't push early. Need raise ValueError if cycle. Self-loop: indegree >0 and never processed -> if len(order)!=n raise ValueError. Performance: use heapq, adjacency list list of lists. For n=200k, 400k okay. Could use list comprehension [[] for _ in range(n)]. Duplicate edges okay but may cause extra memory/time but 400k fine. Lexicographically smallest: use min-heap. Initialize heap with all indeg==0. Pop min. For each neighbor decrement; if zero push. At end if len < n ValueError. Need careful performance: heap operations O((n+E)log n) maybe okay 200k/400k around maybe seconds. Could be okay. Could we optimize? Use heapq. Need no input/printing.

Potential alternative for lexicographically smallest topological order using heap. Yes.

Need code only. Include typing? from typing? Standard. Use heapq.

Need maybe handle invalid edges? Not specified. We assume valid 0..n-1. Could ignore? If nodes outside range, IndexError or ValueError? We could validate for robustness maybe overhead not needed. Self-loop a==b: indegree increment, cycle detected.

But duplicate edges: If duplicate edges, the topological ordering with duplicates counted is fine. But potential issue: multiple edges can cause indegree of b to be decremented multiple times when a popped. If b already zero? Suppose duplicate edges processed all at once, indegree counts duplicates. If indegree was exactly duplicate count, first dec -> nonzero, last -> zero push. Good. If also other predecessors, eventually.

What about cycles with duplicated edge not forming cycle? no.

Need output exactly one code block. Need final only code.

Could improve memory: adjacency as array of lists. For n=200k list overhead okay. edges 400k ints okay.

Potential performance: heap initialization with all zero indegrees using heapq.heapify. Use local variables for speed:
```
def topo_order(n, edges):
    adj=[[] for _ in range(n)]
    indeg=[0]*n
    for u,v in edges:
       adj[u].append(v); indeg[v]+=1
    heap=[i for i,d in enumerate(indeg) if d==0]
    heapq.heapify(heap)
    result=[]
    heappop=heapq.heappop; heappush=heapq.heappush
    while heap:
       u=heappop(heap)
       result.append(u)
       for v in adj[u]:
          indeg[v]-=1
          if indeg[v]==0: heappush(heap,v)
    if len(result)!=n: raise ValueError
    return result
```
Need ensure no print.

Could use collections.deque? For lex smallest need heap. If n large, maybe heap okay. But is it guaranteed lexicographically smallest among topological sorts? Kahn with min heap yields lexicographically smallest: yes.

Potential edge case n=0: returns [], no ValueError.

Potential cycle detection when there are duplicate self-loops and others? len!=n catches. But if cycle nodes have indegree zero? No cycle nodes can't all have indegree zero, but some could be in heap and processed, cycle remains not processed -> len != n. Good.

Need mention no example. final code.

Double-check: duplicate edges can cause indegree negative? If invalid edge? Suppose edge appears duplicate, all processed exactly duplicate. No negative. If cycle, some indegree >0. If len != n raise. If disconnected? ok.

Could memory be improved by deduplicating edges? Not needed. However duplicate edges many (400k) and n=200k, heap operations fine.

Potential hidden tests: n=1, edges [(0,0)] -> adj[0]=[0], indeg[0]=1, heap empty, result empty, len !=1 raise. ok.

Need maybe if n not int? irrelevant.

Let's produce final with imports.
