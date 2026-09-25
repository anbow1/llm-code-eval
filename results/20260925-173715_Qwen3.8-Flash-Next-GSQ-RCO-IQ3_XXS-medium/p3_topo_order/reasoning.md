We need answer with single python code block only. Need solve topo_order lexicographically smallest with n up to 200k edges 400k, standard library only. Need efficient. Need produce complete function. Need think about details.

Problem: topological sort lexicographically smallest valid ordering. Nodes 0..n-1. Edge (a,b): a before b. Duplicate edges. Cycle including self-loop raise ValueError. Need efficient O((n+m) log n?) For lexicographically smallest, use min-heap of nodes with indegree 0. But duplicate edges may cause indegree counts incorrect unless dedupe or handle carefully. We can dedupe edges? 400k edges, okay using set of pairs but memory maybe fine: 400k tuples overhead maybe okay but Python maybe slower. Better count indegrees while ignoring duplicates? If duplicate edge (a,b) counted twice, indegree too high and never zero -> false cycle or fail. Need avoid duplicate effects. Options:
- Use dictionary adjacency sets: adj = [set() for _ in range(n)] and add b to set. Indegrees increment only if not already present. For 400k edges, sets overhead but okay maybe. But performance? 200k nodes, 400k edges. Creating 200k empty sets expensive but possible. Could be ~tens MB. Alternative use sorted edges and dedupe? Input list can be copied sorted lexicographically then iterate. Edges 400k sorting O(m log m) maybe okay under second? Python sort 400k tuples maybe ~0.2s? Could be okay. Then dedupe consecutive edges and build adjacency arrays. This may be memory efficient and fast. Need lexicographically smallest topological order. Could use adjacency lists built from deduped sorted edges? If edges sorted by source then target, then adjacency lists already sorted. For Kahn heap, adjacency order doesn't matter for heap. But building using arrays more efficient.

Potential approaches:
1. Kahn with heap: indegree array, adjacency list. Deduplicate duplicates via set? Need efficient.
2. DFS with heap? Kahn min-heap standard. If graph acyclic, yields lexicographically smallest because at each step choose smallest available node. Yes.

Need raise ValueError for cycle if len(order) < n. Self-loop: indegree includes self; Kahn will not include; len order < n raise. Duplicate edges: handle.

Performance: n=200k, m=400k. Need about 1s. Python. Heap operations: each node push/pop log n ~18, 200k* maybe okay ~0.1-0.2? Actually heapq 400k? 200k pushes/pops. Adj loops 400k. Dedupe sorting 400k. Could be under 1s but maybe borderline. Need optimize.

Alternative avoid heap? Lexicographically smallest topological ordering can be computed by repeatedly selecting min zero indegree. Min-heap needed. For 200k, okay.

Dedup edges: Input edges list of tuple ints. Duplicate may appear. If use sort edges = sorted(edges) (tuple sort by a,b). Then loop, skip if same as prev. Build adjacency using adjacency arrays? Need store outgoing nodes. Could do list of lists adj = [[] for _ in range(n)] and append b. 200k lists overhead but okay. Appending 400k. Or more efficient: use CSR arrays: first count outdegrees and indegrees from deduped edges, then prefix sums and flat adjacency. But more complex. List of lists may be okay memory: 200k empty lists ~11MB, outer ~1.6MB, elements ints maybe already in edges? Append ints from tuple. 400k ints references ~3.2MB plus list overallocation. Edges list input exists; if we sort in-place maybe edges list remains. Could build adjacency from sorted edges, then edges list can be freed? Function receives edges list; cannot modify? Could sort copy? We can do edges.sort() to mutate input? Maybe okay? Usually don't mutate? Could do edges_sorted = sorted(edges). But memory duplicates. Could in-place sort if allowed? Safer not mutate? Function might be tested with original? Probably okay but if they reuse input no. Could use edges = sorted(edges). Memory 400k tuples ~22MB + input list? If input passed, original remains, copy list refs ~3.2MB + tuples already? sorted returns list of same tuple objects, no new tuples. Good.

But if we then build adj lists referencing ints from tuples, no new ints. Fine.

Could dedupe with previous tuple variables.

Pseudo:
def topo_order(n, edges):
    edges.sort() # maybe mutates. If we want non-mutating: edges = sorted(edges)
    indeg = [0]*n
    adj = [[] for _ in range(n)]
    prev_a = prev_b = None? Use sentinel.
    for a,b in edges:
        if (a,b)==(prev_a, prev_b): continue
        prev_a=a; prev_b=b
        adj[a].append(b)
        indeg[b]+=1
    heap = [i for i,d in enumerate(indeg) if d==0]
    heapq.heapify(heap)
    order=[]; append=order.append; pop=heapq.heappop; push=heapq.heappush
    while heap:
       v=pop(heap); append(v)
       for w in adj[v]:
          d=indeg[w]-1; indeg[w]=d
          if d==0: push(heap,w)
    if len(order)!=n: raise ValueError
    return order

Need validate node ranges? Not specified. Nodes 0..n-1. Could ignore invalid? If invalid, index error. Maybe raise ValueError? Could assume valid. For robustness, if a or b outside range raise ValueError? But not needed, may slow. Self-loop: indeg[a] +=1; if only self-loop no zero? If self-loop with other incoming? It won't become zero due self, cycle detected.

But lexicographically smallest proof: min heap.

Potential issue: If using sorted edges and adj lists sorted, Kahn min-heap output lexicographically smallest. Yes.

Need think about duplicates: sorted dedupe works. But memory/time sorting 400k tuples maybe okay. Could avoid sorting with per-node sets? Sorting might be simpler and faster than 200k sets. But edges sort O(m log m). 400k log2 ~7.6M comparisons in C? Python compares tuples C? Tuple comparison Python-level but optimized C? It is okay maybe ~0.1-0.2? Actually sorting 400k tuples in Python maybe 0.15-0.3 seconds. Kahn maybe 0.2-0.5. Should be okay. But need 1s. Might pass.

Can optimize dedupe without storing sorted edges? Maybe use set: seen=set(); for edge in edges: if edge not in seen: add; adj... This is O(m) but hash set memory and overhead maybe okay 400k. Building 400k set tuples maybe okay maybe faster? Hashing tuple overhead maybe comparable. Sorting in C might be faster. Set avoids O(m log m) but memory high (set entries). For 400k, set of tuples maybe ~40MB. Sorting uses list sorted (same tuples) no set. Good.

But adjacency list of 200k empty lists: many nodes maybe no edges. Could optimize using outdegree counts and flat arrays to reduce overhead. But perhaps unnecessary. Let's evaluate performance: 200k empty lists allocation is maybe 0.03s? Actually 200k list objects maybe ~12MB, allocation time maybe 0.05-0.1s. Good.

Could also not build adjacency if need only Kahn? Need adjacency for outgoing. Alternative process edges sorted and maintain adjacency flat; but okay.

Potential issue: duplicate edges may be not adjacent if sorted; okay. If edge order has duplicates but sorted removes.

Need ensure cycle detection includes cycles where no zero indegree? Kahn. If duplicate self-loop dedupe count one. If duplicate edge self-loop multiple times? Dedupe avoids overcount but self-loop still indegree +1, cycle.

Could there be invalid edges? Not specified. If edge outside 0..n-1, perhaps raise ValueError? Could add check in loop: if a<0 or a>=n or b<0 or b>=n: raise ValueError. That adds overhead 400k checks. Acceptable maybe. But tests likely valid. Should we include? It could help but overhead. Problem says nodes 0..n-1, so assume. Could avoid.

Need only standard library. Use heapq.

Can we avoid sorting input mutating? Maybe we can use edges.sort() in-place, since function can mutate? If input list is important, maybe not. But no input constraints. Safer: use edges = sorted(edges). But if m=400k, sorted copy adds list refs memory. If use edges.sort(), faster and less memory. In code, we can do edges.sort() to mutate; might be acceptable. Some graders may pass edges and check after? Usually not. But mutating arguments could be disliked. Could do if isinstance... no.

Need lexicographically smallest ordering. With Kahn min-heap. Need maybe if graph has isolated nodes, they enter heap initially and min selected. Good.

Consider alternative: DFS topological sorting lexicographically? Not. Kahn min-heap correct.

Potential bottleneck: heapq with push/pop per node. 200k log n okay. But if many edges, decrement indegrees. Fine.

Could implement faster using sorted list + binary? No.

Could use integer priority queue? no.

Memory: edges sorted list references tuples from input? If input list already tuples. If edges.sort() no new. adjacency stores b ints references. indeg list ints; as indeg updated, ints new. okay.

Need produce final code block only. Let's think if there is a faster dedupe technique using sorted edges and local variables.

Function:
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    edges.sort()
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    prev_a = -1
    prev_b = -1  # but valid edges may have -1? Nodes nonnegative so sentinel okay. If invalid -1? assume no. Or use first flag.
    # If n=0? edges should empty. Return [].
    first = True
    for a, b in edges:
        if first:
            prev_a = a; prev_b = b; first = False
        else:
            if a == prev_a and b == prev_b:
                continue
            prev_a = a; prev_b = b
        adj[a].append(b)
        indeg[b] += 1
    heap = [i for i, d in enumerate(indeg) if d == 0]
    heapq.heapify(heap)
    order = []
    heappop = heapq.heappop
    heappush = heapq.heappush
    append = order.append
    while heap:
        v = heappop(heap)
        append(v)
        for w in adj[v]:
            dw = indeg[w] - 1
            indeg[w] = dw
            if dw == 0:
                heappush(heap, w)
    if len(order) != n:
        raise ValueError("cycle detected")
    return order

But if n=0 and edges empty: adj=[], indeg=[], heap=[], order=[]; len=0 return. Good. If n=0 with edges invalid? IndexError. Not concern.

Can optimize local variables in loop: adj_local=adj; indeg_local=indeg. Use range? Good.

Could use prev_a = prev_b = None and compare? For speed use sentinel -1 because valid non-negative. But if n=0 no edges. If invalid negative edge ( -1, ...) sentinel collision causing skip? assume valid. Or use flag to be safe. Speed maybe no issue. But sentinel robust for all nonnegative. If edges may include -1 invalid? no. Could use object? no.

Maybe use a set to dedupe if edges not sorted? We sort, but mutation maybe. Let's consider cycle detection for duplicate self-loop: sorted dedupe. If self-loop edge repeated, only one indeg increment. If indeg remains >=1 no topological include. Good.

But subtle: Duplicate edges in Kahn: If we don't dedupe adjacency, decrement indeg twice for same edge, and indeg may become negative? Example duplicate a->b twice, indeg[b]=2, adjacency has two b; pop a, decrement to 1, then 0, push b. Actually duplicate edges counted twice and processed twice; okay it works? Wait duplicate edges in graph do not create cycle but Kahn can handle if indegree count equals number of duplicates and adjacency has duplicates, as long as duplicates are consistent. If duplicate edges counted twice and adjacency has duplicate, then when a popped, decrement twice, b indeg reaches expected. So duplicates might not need dedupe if counted consistently. But if there is a duplicate edge a->b and a already processed? Yes both decrements happen. It would work. Problem: If we build adjacency by appending duplicates and indeg increment for every edge, Kahn still okay? It models multigraph; topological order valid for underlying graph. Lexicographically same. Duplicate edges add extra adjacency loops but not wrong. Self-loop duplicate: indeg increment multiple, adjacency multiple; self-loop prevents pop. Cycle detection okay. Then no need dedupe at all! Wait Kahn for directed multigraph: indegree counts edges, adjacency contains each edge. Each edge processed once when tail popped. If there are parallel edges, node b indegree reduced once per edge; if all predecessors popped, indegree zero. Duplicate edges do not make impossible. So duplicates okay if we increment and append. Then why problem mentions duplicate edges? Maybe to require not treating duplicate as cycle? But if you just sort and unique? Hmm Kahn with duplicates works. Let's test: edge (0,1),(0,1). indeg[1]=2, adj[0]=[1,1]. pop 0: decrement to1, decrement to0 push. Good. If there is also 2->1, etc. Good. If cycle: 0<->1 with duplicates still len order<n. Self-loop duplicate indeg>0. So duplicates are naturally handled. Then no need dedupe. But potential issue: If duplicate edges cause indegree to never become zero if we only process unique adjacency? So consistent duplicates okay. We can just not sort/dedupe. But for lexicographically smallest? adjacency order doesn't matter. Kahn with duplicates still yields lexicographically smallest? Let's reason: Available nodes are nodes with indeg==0. Parallel edges do not affect indeg==0 beyond correct count. It still works. Complexity O(n + m) including duplicates, no sorting! That is faster. But wait if there are duplicate edges and we append duplicates, m=400k fine. If many duplicate edges, more loops but max 400k. No need sort. Is there any subtle problem with lexicographic order due to duplicate edges? No, heap choices same. So simplest: build adj and indeg from all edges as is. Duplicate edges okay. Is that always correct for topological sort? Yes for multigraph.

But some Kahn implementations assume indegree is number of distinct predecessors? If duplicates counted, when processing outgoing duplicate edges, decrements multiple times; it's consistent. If duplicate edge (a,b) and a not reachable? no. It works because each edge contributes one indegree. Topological constraints: a before b; multiple constraints same. Counting each edge and removing each edge when a processed removes all constraints from a to b. If b has another predecessor c, indeg won't hit zero until both c edges processed. If c and a both popped. Good.

So no need dedupe at all. The problem mentions duplicate edges likely to warn about dedupe if using indegree set; but with multigraph it's fine. But if they expect duplicate edges do not affect order; our approach okay. However, memory for adjacency duplicate edges okay 400k. No sorting, faster. Need cycle detection: if len order != n. Good.

But wait: If duplicate edges appear, but we don't dedupe, could it produce negative indegree if adjacency has duplicate but indegree not counted? We count both. Good. If self-loop duplicate: indeg self multiple. It won't pop; if node has indegree only self loops, cycle. If self-loop plus predecessor: after predecessor edges processed, indeg still positive from self loops; cycle. Good.

So simplest implementation: no sort, no dedupe. O(n+m+heap). Should handle n=200k m=400k within time. Need maybe optimize building adjacency. edges list of tuples. We can just loop. For speed, local variables.

Potential performance issue: list of lists and append for each edge. 400k append okay. Heapify list of zeros. If graph dense? edges 400k. okay.

But could duplicate edges make indeg large; ints okay.

Potential subtle bug: If there are multiple edges from already popped node? no.

Let's prove Kahn with multigraph yields lexicographically smallest: At any step, nodes with zero indegree in remaining multigraph are exactly nodes whose all predecessors (with all edge multiplicities) have been removed. Same as underlying. Choosing min yields lexicographically smallest by exchange argument. Good.

So we can avoid sorting and deduping. But user specifically "Duplicate edges may appear" perhaps expect handling. Multigraph Kahn handles; but if they think duplicate edges could make false cycle if using naive? no. Need maybe mention not in code. Code simple.

However, there is a potential issue: If duplicate edges cause indegree count and adjacency duplicates, cycle detection still okay. But if there is duplicate edge in cycle? okay. If graph acyclic, all edges processed, len order = n. If graph has cycle but also duplicate edges from outside? Kahn stops with non-empty heap? Actually cycle nodes indegree >0 from within; len order<n. Good.

Need consider memory and speed for n=200k edges=400k. list of lists 200k empty lists plus append. Could use adjacency as list of lists. Fine. But maybe to be faster, use out-edge linked arrays? Let's benchmark mentally. Kahn loop: while heap pop 200k; for each adjacency entry 400k; heapq operations. Could be ~0.5 sec. Good.

But if no edges, heapify 200k ints and pop 200k: heapq pop on already heapified? list [0,1,...] already heap? For 0..n-1 is min-heap (because parent <= children? array [0,1,2,...] satisfies heap property? Yes, heapify still O(n). Pop returns 0,1,...? Heap pop from sorted list maintains sorted-ish? It will do sift; maybe okay. If no edges, could simply return list(range(n))? But not necessary. We can optimize: if not edges: return list(range(n))? But if self-loop invalid? no edges. Could add quick path? Maybe not. But for performance, if m=0, sorting not issue. With heap, 200k pops maybe ~0.05 sec? Actually heappop 200k ~0.1. Could optimize by if not edges and n: return list(range(n)) to avoid heap. But if edges list has duplicate? no. We can add if not edges: return list(range(n)). But if edges is list empty, okay. If edges nonempty but all cycles? no. Could also if n==0 return []

Need maybe preallocate heap: [i for i in range(n) if indeg[i]==0]. If all zero, list(range(n)) already heap? Is list(range(n)) a valid heap? Let's check heap invariant: for index i, children 2i+1, 2i+2 have larger indices, so yes. heapify unnecessary if all zero. Could check if no edges? If edges empty, all zero. If edges nonempty but still all zero impossible if edges valid and n>0 because edge gives indeg>0. So no edges. So optional quick return list(range(n)) if not edges.

Potential issue: If edges list is a generator? Signature list[tuple]. okay.

Could implement with out_adj = [[] for _ in range(n)]. If n large and edges small, many empty lists. Alternative use dict mapping a to list to avoid 200k empty lists. But Kahn needs indeg array for all nodes; outgoing for nodes without edges not needed. Using dict may save memory if sparse but overhead per edge dict lookups. For 200k nodes, list of lists okay. But if memory constrained? Maybe use adjacency as dictionary of lists? Need push nodes with zero indegree; no outgoing needed for nodes not in dict. Loop: out_adj.get(v). But dict lookup per node. For n=200k, m=400k, list of lists fine.

Could use arrays of vectors? Python list of lists easiest.

Potential issue: Cycle detection with duplicate edges: If cycle nodes have zero indegree? impossible in directed cycle because each has incoming from cycle. Self-loop gives incoming. Good.

Need maybe use iterative Kahn with heap. Standard.

But wait: For lexicographically smallest topological order, using min-heap of nodes with indegree 0 is correct only if all edge constraints are satisfied. But Kahn with duplicate edges works. However, there is known nuance: Kahn's algorithm with min-heap gives lexicographically smallest topological ordering among all topological sorts of the DAG. Yes.

Let's test examples:
n=3 edges [(1,0)] indeg[0]=1, heap [1,2], pop 1, decrement 0 -> heap [0,2], pop 0, then 2 => [1,2,0]. Is lexicographically smallest? Valid orders: 1 before 0, 2 anywhere. Smallest: [1,2,0] vs [1,0,2]. Compare index 1: 2<0? no 0<2, actually [1,0,2] is lex smaller. Wait our algorithm: initial zero indegree nodes: 1,2. Min is 1. After pop 1, available 0,2. Min is 0, then 2. So output [1,0,2]. I mistakenly. Good.

Another: n=3 edges [(2,0)] initial [1,2], pop 1 first (min) because 1 unconstrained. output [1,2,0]. Is that lex smallest? Valid: 2 before 0. Orders: [1,2,0] (first 1), [2,1,0] (first 2), [2,0,1]? first 2. Smallest first element 1. Good.

If initial zero nodes [2,0]? min 0. Good.

Need think about invalid cycle detection if graph has duplicate edges and no edges? okay.

Now, possible hidden tests expect duplicates don't cause cycle. Our multigraph handles.

But let's explore if duplicate edges in multigraph Kahn could ever push a node before some predecessor due to duplicate edges? Example edges: (0,1) twice, (2,1). indeg[1]=3. zero nodes 0,2. pop 0: decrement 1 twice to 1, not push. pop 2: decrement to0 push. Good. If duplicate edge from 0 but 0 not popped? no.

If duplicate edges from two nodes? okay.

Potential issue if input has edge (a,b) with a==b self-loop. indeg[a]++. adjacency[a].append(a). If a also zero indegree from others? It won't be zero because self-loop indeg >0. cycle. If a has self-loop but also incoming from others processed, indeg after others decremented remains self-loop count >0. no push. Good. If duplicate self-loop, count multiple. Good.

What if graph has n=1 edge [(0,0),(0,0)] duplicate self-loop. len order 0 -> ValueError. Good.

Now, can we improve heap initialization without heapify? We need list of zero indegree. We can build heap by append to list then heapify. Could also append in natural order and heapify. If list constructed by enumerate indeg in increasing order, is it a valid heap? Let's check a list of indices in increasing order is heap? For any parent i, children have larger indices? Not necessarily: list [1,3,2]? If zeros are e.g. [1,2,4]? Need check property: parent value <= children values because values are selected indices sorted ascending by scan. If we append zero nodes in increasing order, resulting list is sorted ascending. Any sorted list is a valid heap: parent at index i <= children at 2i+1? Since children indices in list are later positions but values sorted ascending, child values >= parent? For a sorted list, positions later have >= values; children positions > parent position (heap tree array order: children index > parent index), so values children >= parent. Yes. So zero_nodes list constructed by iterating range(n) in increasing order is already sorted, and sorted list is a min-heap. We can avoid heapify if we are sure sorted. But heapq heapify is O(n) and may not be costly. But if all zero or many, we can skip heapify. However, if we append in increasing order, list is sorted. heapq.heappush will assume valid heap. We can skip heapify for speed? Need ensure sorted list of zeros is heap. Yes. If list empty or one element. Could do if zero_nodes: heap = zero_nodes else []; no heapify. But heapq functions may not require heapify if already heap. Since sorted list is heap. That saves O(n) heapify but not major. But need careful: If we skip heapify, list sorted ascending is a valid heap (min-heap). For sorted list [0,1,2,3,4,5,6], heap property: 0 children 1,2; 1 children 3,4; etc. Yes. If zeros are subset but still sorted ascending: e.g., [1,2,4,5,7]. Parent 1 children 2,4; 2 children5,7? indices: list positions: [1(pos1),2(pos2),4(pos3),5(pos4),7(pos5)] parent pos4=5 no children; parent pos2=2 children pos5=7 and pos6? okay. Values later >= earlier, so heap property holds. So skip heapify safe. But maybe heapq internals expect arbitrary list? It uses siftup/siftup? heappush assumes heap property; sorted list satisfies. Good.

But if we use initial heap list from sorted range, we can omit heapify. However, if list is empty, okay. Could include:
heap = [i for i in range(n) if indeg[i] == 0]
# heap is already a valid heap because constructed in increasing order.
# no heapq.heapify(heap)
But if we later call heappush, okay. This may be nice. But if someone passes invalid edge causing negative? not.

Potential issue: In Kahn, after processing nodes, heap remains a heap if we use heappush. If initial heap is sorted (heap), okay. Need verify if initial heap is sorted after list comprehension: range(n) ascending, if condition true append current i; thus non-decreasing. Yes.

Now, could we avoid heapq entirely by using a sorted list of zero indegree nodes and pointer? Since new zero nodes are discovered when edges removed; need insert new nodes in order. We can maintain min-heap. Could use bucket? Node ids integer 0..n-1. We can maintain a boolean available and scan pointer? For lexicographically smallest, after removing node, some new nodes become available with id maybe smaller than current pointer? Actually if scanning from 0 upward, once node processed, pointer moves; new available nodes could be smaller than future pointer? Example: initial zero nodes [2], process 2, then node 1 becomes zero, which is <2. But pointer currently at 2? If scanning pointer from 0, we initially skip 1 because indeg>0. After 2 processed, 1 becomes available but pointer can't go backwards if naive. Could maintain heap. Another technique: DFS with priority? no. Heap needed.

Could implement faster custom heap using array and inline? heapq in Python okay.

Could use list heap with `heap = ...; heapq.heapify` or not. For speed, skip heapify. Need import heapq.

Potential issue: For n=200000 all zero nodes, initial heap list sorted; heappop on sorted list? Let's simulate: heappop returns 0, moves last to root and sifts down. Last is 199999. Root 199999, children 1,2. Sifts down swapping with 1, etc. It will restore sorted? After popping 0 from sorted list, remaining list becomes? Python heappop implementation: pop root, replace with last, sift down. For sorted list, this produces a valid heap but not sorted. Next pop returns 1? Let's test mentally: initial [0,1,2,3,4,5,6]. pop -> [6,1,2,3,4,5] sift: 6>1 swap -> [1,6,2,3,4,5]; 6>4? index1 children index3=3,index4=4 -> swap with 4? Actually heap compare children smallest: 6>3? Wait children of index1 are 3 and 4, values 3,4. 6>3 swap -> [1,3,2,6,4,5]. Now 6 children none? At index3 children 5,6 none. Result [1,3,2,6,4,5]. Next pop returns 1. Replace with last 5, sift: 5>2? swap? [2,3,5,6,4]. Next pop returns 2. Yes order 0,1,2. Good.

Performance of heappop for 200k sorted initial: each pop does O(log n) but maybe more swaps than needed. Fine. Could optimize no edges case return list(range(n)).

Now, building adjacency: We can preallocate adj = [[] for _ in range(n)]. For speed, maybe use `adj = [None] * n` and create list on demand. But then loop for v: out = adj[v]; if out is not None: for w in out... This saves memory for empty lists? [None]*n list 1.6MB plus None refs, and create lists only for nodes with outdegree >0. For n=200k,m=400k, many nodes may have no outgoing; could save many empty list objects (~11MB). But loop has `if out is not None` each popped. Which is okay. However, building: lst = adj[a]; if lst is None: adj[a]=[b]; else: lst.append(b). Branch per edge. With list of lists, adj[a].append(b) no branch but 200k empty lists allocation. Which is faster? Maybe list of lists faster. Memory okay. But if n=200k and m small, list of lists overhead maybe significant but okay. Standard library constraints not memory specified. Could use `adj = [[] for _ in range(n)]`. For 200k, 200k list objects maybe memory ~12MB, acceptable. In coding challenge, memory maybe 256MB. edges 400k tuples ~22MB, adjacency ~ maybe 40MB total, okay. If using None, memory lower but branch overhead. Let's consider optimizing for speed and memory.

Option: Build adjacency as list of lists but only for nodes with outgoing via dict? Could be slower.

Option: CSR with two passes: count outdegrees and indegrees, allocate flat adj list of length m? But duplicates m known. First pass count outdegree for edges; second pass fill flat arrays. Need edges list; if mutate maybe. This avoids many empty lists and overallocation. Could be faster? Let's explore. For n=200k,m=400k, two passes over edges. Use out_deg = [0]*n, indeg=[0]*n. Loop edges: out_deg[a]+=1; indeg[b]+=1. Prefix start array length n+1. out_start = [0]*(n+1); cumulative. Then cur = out_start[:] maybe; flat = [0]*m. Loop edges again: pos=cur[a]; flat[pos]=b; cur[a]+=1. Kahn: for pos in range(out_start[v], out_start[v+1]): w=flat[pos]. This avoids adj list-of-lists and append overhead, but two passes and prefix. Could be faster for large m? It uses memory: out_deg 1.6MB? Actually list ints ~7MB each? Python int objects. `array('i')` maybe standard library could reduce memory but access slower? List of ints okay. Flat list length m references to ints. It duplicates ints from edges? When assigning b from tuple, reference. out_deg increments creates ints. Maybe memory okay. But two passes plus prefix may be slower than one pass list-of-lists. Also need m=len(edges) includes duplicates. Could use list-of-lists.

Maybe best: Use `adj = [[] for _ in range(n)]` and one pass. Good.

But maybe duplicate edges: if many duplicates, adjacency lists have duplicate entries causing repeated decrement. Good. However, if duplicates extremely many (400k all same), indeg large, adjacency list large. Processing tail decrements 400k times. It may push b only after all duplicates. This still O(m). Could dedupe reduce work but requires sorting/hash. For worst-case 400k duplicates, dedupe reduces adjacency to 1, but sorting cost maybe. Not needed due limit. But if duplicates huge? 400k only. Fine.

Could optimize duplicate handling while one pass using sets? no.

Potential issue: With duplicates, indeg values can exceed actual distinct predecessor count. If there are duplicate edges from same predecessor, node b won't be available until all duplicate edges from that predecessor are decremented. Since all decremented at same time when predecessor popped, okay. If predecessor is in heap multiple times? Node is popped once because only pushed once. We process its adjacency duplicates in one for loop. Good.

Potential issue: If adjacency has duplicate b, and indeg[b] becomes zero after first of duplicates due to miscount? If indeg count equals duplicate count, it only zero after all. Good.

Now, consider lexicographically smallest with duplicate edges: Suppose duplicate edges create additional artificial constraints? No. They don't change availability timing beyond same predecessor. Since all duplicates from same predecessor are removed when predecessor popped, no effect.

Let's think of a graph with parallel edges and other nodes: (0,1)x2, (2,1)x1. Initial zero 0,2. If min 0 first, then 1 indeg after 0 decrements from 3 to1, not avail; pop2 then avail. If min 2 first, then indeg 3->2 after2? Actually indeg 3 includes 2 duplicates from 0, one from2. pop2 decrements one to2; pop0 decrements two to0. Output order if initial heap min? 0 vs2 =>0 first. Valid orders require 0 before1,2 before1. Lex smallest: 0,2,1? Compare 0,1,2 invalid because 2 before1? Wait 2 before1, so [0,1,2] invalid. [0,2,1]. Good. If initial zero nodes [2,3]? etc.

Now, maybe lexicographically smallest topological order of DAG can be computed by reverse graph with max-heap? Actually min-heap on sources works. Good.

Need maybe include docstring? Not necessary but okay. The user requests code only? Reply with single ```python code block. Can include docstring. No tests or print.

Let's consider using `heapq` and no heapify. Need import `import heapq`. Could local `heappush = heapq.heappush`, `heappop = heapq.heappop`. Good.

Function with type hints. Use `list[int]` works py3.11. `tuple[int,int]`.

Potential hidden requirement: "Must handle n=200_000 with 400_000 edges in about a second." Python list-of-lists maybe pass. Need maybe micro-optimize.

Let's profile mentally: 400k edge loop: unpack tuple, adj[a].append(b), indeg[b] += 1. 400k * maybe 0.05s? Actually Python 400k iterations ~0.04-0.1s. Heap: 200k heappop ~ each O(log n) ~18 comparisons, 3.6M; Python comparisons int fast but function overhead. maybe 0.3-0.6s. Edge loop decrement 400k ~0.05. Total maybe <1. Good.

Could improve heap operations by using `heapq.heappop` local. Good.

Could skip heapify: initial heap list sorted. Good.

Could if m=0 return list(range(n)). But need handle edges empty. This speeds no-edge case. Also if n==0 return [] immediately. Good.

Could if len(edges) == 0: return list(range(n)). But if n large and edges empty, return directly. If edges list contains invalid self loops? m>0. okay.

Could detect immediate self-loop while building: if a == b: maybe self loop invalid; but there could still be topological sort if node? self-loop always invalid. We could raise ValueError early? But if a==b, cycle. Could raise after building or during. If raise early, no need process rest. But must validate? Could do if a == b: raise ValueError. But then duplicate self-loop? immediate. However, early raise might skip if edge invalid? okay. But if graph has self-loop, cycle. Raising during build avoids Kahn. But if there are edges after? no need. It may be faster. But if self-loop edge appears but also invalid? fine. But if input has self-loop, we can raise. But if we raise early, function may have mutated? no if not sorting. Good. But careful: If self-loop edge is duplicate? still cycle. Good. Could add in loop:
if a == b:
    raise ValueError("cycle")
But this check costs for all edges. Might not be worth; Kahn detects. Also self-loop could be with node outside? no. If self-loop, indeg increment and no push. Cycle detection after. Check might speed if self-loop early. Not necessary.

Could also check len(order) != n at end. Good.

Potential issue: Duplicate edges could cause indeg[b] to become negative if a is processed multiple times? Node only pushed once? Could a node be pushed multiple times? We push when indeg[w] becomes exactly 0. Could duplicate edges make indeg go from 1 to 0 on first decrement, then second duplicate decrement makes -1 and not push? Wait if indeg count and adjacency duplicates consistent, but if indeg[b] reaches 0 before processing all duplicate edges from same predecessor? Let's analyze: indeg[b] = count of all incoming edge instances. For a given predecessor a with k duplicate edges to b, indeg includes k. When a popped, we iterate k times, decrement. Suppose indeg[b] before processing a is k (no other unprocessed predecessors). First decrement: k-1, ..., kth: 0. It only reaches 0 on last duplicate. Good. If indeg[b] before processing a is less than k? Cannot because includes all k. Unless duplicate edges counted but indeg overwritten? no. So no negative unless there are duplicate edges in adjacency not counted. We count.

But what if there are duplicate edges and node b also has incoming from a but a appears multiple times in heap? Node a is pushed when indeg[a]==0. Could a be pushed again? In Kahn, a pushed exactly once when indeg becomes 0. But what if a has self-loop? indeg never zero. If duplicate edges from b to a? When b popped, decrement a maybe from 2 to1 then 0 push once. Not again. Good.

Potential issue: If an edge list has duplicate (a,b) and indeg[b] becomes 0 after some decrements from other predecessors, but we haven't processed a yet? impossible because indeg includes a's duplicates. Good.

Thus no need dedupe.

Now, lexicographic proof maybe not in final, but code only. Could include comments? okay.

Let's think if there is any case where Kahn with min-heap fails for lexicographically smallest due to duplicate edge multiplicities? Consider multigraph where a has two edges to b, c has one edge to b. If a and c initial zero. Min-heap chooses min(a,c). If a > c, choose c first, indeg b decreases but not zero; then a. Could choosing a first yield lexicographically smaller? Suppose a=0,c=1,b=2. Duplicate 0->2, 1->2. Initial heap [0,1]; choose 0; b indeg after 2 duplicates from 1? indeg b=3, after0 decremented2 to1; choose1; then2. Output [0,1,2]. If choose1 first invalid lex? 0<1 so lex smaller anyway. If a=1,c=0 but 1 smaller? no. Suppose node numbers: 2 (a) and 1 (c). initial heap [1,2], choose1; after c, a still available; choose2. Output [1,2,b]. If choose2 first output [2,1,b], lex bigger. So min heap okay.

Now, what if duplicate edges mean a's multiple constraints delay b; but choosing smaller predecessor first may not maximize? Kahn greedy is proven.

Could there be a faster lex topological sort using `heapq` but with reverse edges? no.

Potential issue: If input `edges` is huge, `len(edges)` O(1). Good.

Let's consider using arrays from `array` module for indeg? Python list of ints might be faster. `array('i')` memory lower but increment access slower? Stick list.

Potential issue: For n=200k, indeg list of zeros has references to same 0 object; increments produce new ints. Fine.

Potential issue: `adj = [[] for _ in range(n)]` for n huge maybe memory but okay. Could use `adj = [list() for _ in range(n)]`? Same. Use multiplication? `adj = [[]] * n` would alias lists, bad. Need comprehension.

Could use `adj = [None] * n` to save memory and maybe faster due less allocation? Let's compare.

List-of-lists version:
```
adj = [[] for _ in range(n)]
...
adj[a].append(b)
```
This is very simple and fast (C append). Allocates 200k empty lists upfront. In Kahn:
```
for w in adj[v]:
```
Direct.

None version:
```
adj = [None] * n
...
row = adj[a]
if row is None:
    adj[a] = [b]
else:
    row.append(b)
...
row = adj[v]
if row is not None:
    for w in row: ...
```
Branches per edge, per node. Might be slower but memory lower. Which is more likely to pass time? Time likely more important. 200k empty lists not too bad. Use list-of-lists.

Could preallocate adjacency arrays for out-degree? If m known, we could use `adj = [None]*n`, count outdegree first then allocate exact lists? Two passes. Not needed.

Could use `adj = [[] for _ in range(n)]` then extend? no.

Potential hidden constraints: n=200_000, m=400_000, memory maybe 64MB? Python overhead might exceed. If memory low, list-of-lists + input edges + tuple could exceed 64. But problem asks Python? Usually memory larger. Need maybe design memory-efficient? Let's estimate:
- edges list of 400k tuples: each tuple 56 bytes? plus ints (small cached? node ids up to 200k not cached, but ints in tuples are existing from input? Each edge tuple contains two int objects. If input created, ints exist. 800k ints *28=22.4MB; tuples 400k*56=22.4; list refs 3.2 => 48MB. adj: 200k lists empty 56=11.2; outer refs 1.6; adjacency references to same b ints in lists: each appended reference 8*400k=3.2 plus list overallocation maybe 4-8; indeg: list refs 1.6 + int objects? initial zeros shared, after increments for nodes with incoming up to 200k int objects 5.6; heap: up to 200k ints refs 1.6 (ints maybe from range? list comprehension creates new int objects? range yields ints, list stores them, for >256 new ints? Actually range iteration creates new PyLong objects? It may create each int; heap list 200k ints 5.6MB + refs 1.6. order list 200k refs to same int objects? We append v from heap (existing ints). refs 1.6. Total maybe 80MB+. Could be okay for 256MB.

If we can avoid duplicating int objects in heap? List of ints from range creates PyLongs; but those nodes not otherwise stored? Node IDs may be int objects from edges only for nodes appearing. For all nodes, heap/order store ints. Could use `array('i')` for order/heap? heapq works on arrays? heapq expects list with comparable elements; array supports sequence but not mutable? It is mutable, but heapq functions expect list? It uses `heapq` C? `_heapq` may require PyList? Actually heapq module in Python maybe uses lists; could work with list-like? `heappush` does `heap.append`, array has append; item assignment works. It might accept array. But type of array elements are C ints converted to PyLong on access. Could save memory but maybe slower. Standard. But likely not needed.

Could reduce input edge memory by not relying on edges list? We process edges directly from list; input remains. Can't free unless reassign edges=None? In function, `edges` reference. We could after building adjacency set `edges = None` to allow GC? But function scope, maybe not needed. If input list large and adjacency references b ints, edge tuples still hold ints; adjacency holds b int references, so ints not freed. Tuples could be freed if edges list freed. We can do `edges = None` after build, but caller still holds? If caller passes variable, local rebinding doesn't remove caller reference. But in CPython, if caller's list ref still, not freed. If function argument is only reference? The caller may have passed a list variable; they hold. Could not know. If they pass temporary `topo_order(n, [ ... ])`, local edges only reference; setting edges=None after build frees list before Kahn, reducing peak? Peak after build still includes edges until freed; but if we free before heap, peak memory lower during Kahn. We can include `edges = None` after building. But if caller holds, no effect. Could use `del edges`. Might be okay. But if we need len for quick path? no. Use `edges = []`? Not necessary.

Could avoid input edges memory by accepting iterable? Signature list. No.

Potential optimization: Sort/dedupe could remove duplicate edges from adjacency and indegree, but input still. Not needed.

Now, think about cycle detection performance: If cycle, Kahn processes nodes reachable without cycle. Could early stop if heap empty before order len n? Loop exits then raise. Good. If large cycle no zero nodes, heap empty quick. If some nodes processed then heap empty, raise. Good.

Could check `if not heap` initially and n>0? If all nodes indegree >0, cycle? In directed graph with all nodes indegree>0, there is a cycle. We can raise before building heap? Need build indeg first. After building, if all zero indegree none and n>0, cycle. Could raise. But Kahn would do same. Maybe no.

Could detect if m==0 and return range. Good.

Potential issue with `if not edges: return list(range(n))` if edges is not list but iterator? Signature list. okay. If edges empty but n negative? Not.

Need maybe validate `n`? Not. If n negative, range error. assume.

Let's verify initial heap sorted property if we skip heapify. Suppose indeg zeros at [5,1]? But comprehension range(n) yields [1,5] sorted. Yes. It is a heap. However, if we don't heapify, but then call `heappush` in Kahn: heapq assumes heap invariant. It holds. Good. But some readers might expect heapify. Could still include `heapq.heapify(heap)` for clarity. Performance: heapify O(n) but okay. For initial sorted list, heapify does O(n) check; maybe not expensive. But for speed, skip. Is skipping safe enough? I'd like to avoid subtle potential with non-standard? Python's `heapq` requires heap, and sorted list is valid heap. I can comment: `# Constructing in increasing order yields a valid min-heap.` That is good. But if someone later changes? fine.

Need ensure `heappop` on list of ints returns int. Good.

Potential alternative: If initial heap is sorted, `heappop` order is ascending initially but not necessarily always? Yes. Could skip heapify but then if no pushes (DAG where each node has incoming from previous? initial heap maybe small), after pop/push, heap invariant maintained by heappush. Good.

Let's test initial heap sorted with non-contiguous: heap=[1,2,4,5,7] valid? Check heap property:
index0=1 children index1=2,index2=4 ok
index1=2 children index3=5,index4=7 ok
index2=4 no children? children 5,6 out. Valid.
Another: [2,3,5,7,9]? ok.
Sorted list is always heap because array positions in heap tree are increasing; for any child index > parent index, value child >= value parent due sorted by index. Good.

Potential issue: if zero_nodes list is sorted but not strictly? duplicate nodes? no.

Now, let's consider if Kahn's algorithm with duplicate edges might produce order that violates topological constraints if duplicate edges from node to node cause indeg negative? no.

Could there be cycle if duplicate edges create "false" cycle? No, parallel edges are not cycles (unless self-loop). A multigraph with parallel edges is acyclic if underlying directed graph acyclic. Kahn with multiplicities will still process all nodes. Good.

Now, maybe they expect lexicographically smallest among permutations of node numbers. Min-heap yes. But there is another algorithm using DFS with min-heap on outgoing? Not.

Let's consider if topological order with min-heap of indegree zero is lexicographically smallest even with duplicate edges counted. Suppose a DAG where node 0 is constrained by node 2? Actually if node 0 has indegree from 2, cannot appear until 2. Lex smallest tries to put as small as possible early. Kahn does. Proof: At first position, any valid order must choose one of current zero indegree nodes. If a valid order doesn't choose min zero node x, choose another y. Since x is zero and not y, can we swap x before y? Need ensure moving x earlier doesn't violate because x has no predecessors; y is also zero. x can be placed before y and rest unchanged? If y's successors? If x is before y? If x and y independent? Both zero, no edges between them? Could be edge x->y? If y is zero, edge x->y would make y indegree>0 initially. So no x->y. Could be y->x? x zero forbids. So independent. Swap maintains validity. Thus choose min. Repeat. Good.

Now, code. Need no printing. Maybe include:
```
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n <= 0:
        return []
    if not edges:
        return list(range(n))
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1
    # edges no longer needed?
    # edges = None
    heap = [i for i, d in enumerate(indeg) if d == 0]
    if not heap:
        raise ValueError("cycle detected")
    # heap already valid because built in increasing order
    order = []
    append = order.append
    heappop = heapq.heappop
    heappush = heapq.heappush
    indeg_local = indeg
    adj_local = adj
    while heap:
        v = heappop(heap)
        append(v)
        for w in adj_local[v]:
            nw = indeg_local[w] - 1
            indeg_local[w] = nw
            if nw == 0:
                heappush(heap, w)
    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

Potential: `if not heap: raise ValueError` initially. If n=0 handled. If n>0 and no zero indegree, cycle (in finite directed graph, every node indeg >0 implies cycle). Correct. Could skip because loop then raise at end. This early raise avoids building heap? heap already built. okay. But what if heap empty due n=0? handled. Good.

But is "no zero indegree" always cycle if there are duplicate edges? Yes, finite directed multigraph with every vertex indegree>0 has directed cycle (walk backwards). Good. If there are invalid edges to outside? no.

Potential performance: building heap with enumerate(indeg) loops n=200k. okay.

Could optimize if `not edges` but n maybe 200k and edges empty. Good.

Now, subtle bug with skipping heapify: `heap = [i for i, d in enumerate(indeg) if d == 0]` is sorted. If we early `if not heap` okay. But what if later we reassign `heap` to something not heap? no. Use heapq.heappop. Good.

Potential bug if `n` large and `edges` empty, returns range list. Is that lexicographically smallest? Yes. If n=0 returns [].

Potential hidden test: edges may contain tuples with node IDs as strings? no.

Potential hidden test: duplicate edges but with cycle? okay.

Now, let's think about if Kahn with duplicate edges can fail to detect cycle if duplicate self-loop? no. If duplicate cycle: nodes A,B with edges A->B x2, B->A x2. indeg A=2,B=2, no heap, raise. If there is external zero node X processed, then no, cycle. okay.

Now, maybe lexicographically smallest topological sort can require considering all zero indegree nodes at each step, but if duplicate edges count multiple, a node may become zero only after multiple decrements from same popped node. It is processed within same iteration. It will be pushed during that for loop. If the popped node's adjacency list has many duplicates to w, and w becomes zero at last duplicate. Then after for loop, heap contains w. It may have id smaller than some nodes already in heap? It will be pushed and heap property. It can be popped next. Good. If w id smaller than nodes in heap, heap handles.

Potential micro-optimization: In edge loop, local variables: `adj_local = adj`, `indeg_local = indeg`. But not needed. Could:
```
for a,b in edges:
    adj[a].append(b)
    indeg[b] += 1
```
Global lookup adj/indeg local in function. Good.

Could avoid attribute lookup for append: `adj[a].append(b)` does method lookup each time. Could maybe use `adj[a].append` no faster. For each edge, method lookup overhead. But okay. Could use list of lists and `append = list.append` not possible for dynamic list. `adj[a].append(b)` is okay. If m=400k fine.

Could use `adj = [None] * n` and `adj[a] = [b]` for first edge maybe method lookup less? Branch. Not.

Could store outgoing edges in dictionary keyed by a with list; for each edge `lst = adj.get(a); if lst is None: adj[a]=[b] else: lst.append(b)`. Dict overhead high.

Could sort edges by source and group build adjacency arrays? More code. Not needed.

But let's consider time limit "about a second" in Python. Some platforms Python slower; 400k edges and 200k nodes maybe okay but need careful. Could optimize further using in-degree counts and adjacency in CSR with one pass? Let's benchmark mentally more concretely.

Kahn with heap: 200k heappop. `heapq.heappop` is Python function with C implementation? In CPython, heapq is C extension `_heapq` for core operations, so very fast. 200k pops O(log n) maybe 0.1-0.2s. Edge loop maybe 0.08. Building adjacency list comprehension 0.02. Should pass.

Could there be a need to dedupe for lexicographically smallest? Wait, if duplicate edges counted, node indegree could be >0 due duplicates from a predecessor that is already popped? No duplicates processed when popped. Good.

Let's test a tricky duplicate scenario manually:
n=4 edges: (0,2),(0,2),(1,2),(2,3)
indeg:2=3,3=1. heap [0,1]. pop0: indeg2 2 then1; pop1: indeg2 0 push2; pop2 push3; order [0,1,2,3]. Valid. Lex smallest? Initial zero [0,1]; choose0. Good. If edge duplicates from 1 and 1 smaller? okay.

Now, if edges list has duplicates but also invalid node outside range, IndexError. Could raise ValueError if node out of range. Should we include validation? It might affect performance if included. Problem says nodes 0..n-1, so no. But robust code maybe:
```
for a,b in edges:
    if a < 0 or a >= n or b < 0 or b >= n: raise ValueError
```
This costs 400k checks, maybe okay but extra. If hidden tests invalid? Usually not. If they expect ValueError only for cycles. Invalid edges maybe unspecified. Adding validation might cause false ValueError for negative? no if invalid. But no need. Could avoid to maintain speed. If they test invalid edge expecting ValueError? Not specified. Hmm. A self-loop is cycle. Out-of-range maybe should raise? It says nodes are 0..n-1, so invalid input not considered. Avoid.

Potential hidden: n=0 but edges empty. Return []. If edges nonempty invalid. no.

Now, one more nuance: Lexicographically smallest topological ordering for DAG can be obtained by Kahn with min-heap only if when a node is removed, all its outgoing edges are removed. In Kahn, yes. If there are duplicate edges, and we process all duplicates, yes. If duplicates not processed (dedup adjacency but indeg counted) would fail; we don't.

Could duplicates be so many that indeg[b] goes negative after processing? We concluded no. Let's prove: For each edge e=(u,v), indeg[v] initialized +1. It is decremented exactly when u is popped. In a successful topological order, every u is popped once. Thus all incoming edge instances to v are decremented. It reaches 0 exactly after last incoming edge instance from last popped predecessor. It never goes negative if no node popped before all incoming edges accounted? Actually indeg[v] can become zero only when count remaining incoming edges is zero. Each decrement corresponds to one edge from popped node. Number of decrements before node popped equals number of incoming edges from popped nodes. At any point, indeg = number of incoming edges from unpopped nodes. This is nonnegative. Good.

Now, if graph has cycle but some cycle nodes indegree becomes 0 because edges from cycle popped? In cycle, at least one incoming from unpopped cycle, so indeg >0. Good.

Now, should we include `heapq.heapify(heap)` just to be safe? If initial sorted list is heap, not needed. But if I skip and someone reading might question. Could include `# heap is already in valid heap order`. If include heapify, extra time O(n) but still okay. For 200k, heapify maybe 0.005s? Actually C? Could be. But if all zero nodes, heapify checks list already heap and returns? C heapify may still do some operations. Not huge. But to maximize speed, skip. However, there is a subtle issue: A sorted list is a valid heap, but `heapq.heappop` documentation assumes heap invariant; sorted list satisfies. Fine.

Let's think if using list comprehension with enumerate indeg yields sorted but if nodes ids are not increasing? Node ids are indices. Yes.

Potential optimization: Build heap as `heap = [i for i in range(n) if indeg[i] == 0]`. Access by index maybe faster than enumerate? `enumerate(indeg)` avoids indexing. Which faster? enumerate list is fast. Good.

Could build heap using list and not list comprehension? no.

Could store indeg as `array('i', [0])*n`? No.

Potential issue: `edges` could be a list of lists not tuples? `for a,b in edges` works. type hint. okay.

Potential hidden test: `edges` may be large generator? type list. no.

Potential hidden test: duplicate edges with a==b but also node has zero indegree from others? cycle. Our Kahn after building: indeg self. If self-loop node id smaller than zero nodes? It won't be in heap. Suppose node 0 self-loop, node1 zero. heap [1], pop1, no effect. order len 1 !=2 raise. Good.

Now, let's consider if graph acyclic but some node has incoming duplicate edges from two predecessors, one predecessor not in heap due cycle? no.

Now, maybe lexicographically smallest topological order could be computed by sorting nodes initially? Min-heap. okay.

Let's decide final code. Need only code block. Could include comments minimal. Need no example usage. Let's produce robust, optimized.

Potential further optimization: If cycle detected before all nodes processed, maybe raise as soon as heap empty inside loop? We can do:
```
while heap:
   ...
if len(order) != n: raise
```
If heap empty but order length n, success. If heap empty and order length <n, cycle. Good. Early if initial heap empty and n>0 raises. But if graph has cycle but some nodes processed, heap becomes empty after loop. Good. Could in while after pop if no heap and len(order)<n? not needed.

Potential issue with `if not heap: raise` after initial heap build: If n>0 and no zero indegree, cycle. But what if edges empty? already returned. Good. If graph has isolated nodes but some cycle? There will be zero nodes for isolated/cyclic? cycle nodes no, isolated yes. heap not empty. It processes isolated, then heap empty with cycle leftover. Raises at end. Good.

Could avoid building adjacency for nodes with no edges by `adj = [[] for _ in range(n)]`. Good.

Let's think about memory freeing: After building heap, we don't need edges. Could add `edges = None` to allow local reference release. But not necessary. Could do `del edges` after edge loop? If we do, no harm. But if we need edges length? no. However, if caller passed edges, deleting local doesn't free caller list. If edges was a temporary list argument, deleting local after processing can free before Kahn. Example `topo_order(n, edge_list)` where edge_list variable still exists in caller, no. If function call with literal, the list exists as argument only in callee; `del edges` frees after building. Good. Could include `edges = None`? `del edges` maybe. But if we `del edges`, type checker? no. Not needed but okay. It might be weird to delete argument. But okay.

Potential issue: `if not edges:` if edges is a list, fine. If edges is huge but first element? no. If edges is an iterator, `if not edges` would raise TypeError? Signature list. no.

Could handle n negative: `if n == 0: return []`? If negative, `range(n)` empty, but adj comprehension empty; edges may invalid. Not.

Maybe add validation `if n < 0: raise ValueError`? Not needed.

Now, test with some cases mentally:
- n=2 edges [] -> return [0,1]
- n=2 edges [(0,1)] -> indeg[1]=1, heap [0], pop0 push1, order [0,1]
- n=2 edges [(1,0)] -> heap [1], pop1 push0 -> [1,0]
- n=2 edges [(0,0)] -> adj[0]=[0], indeg0=1, indeg1=0, heap [1], pop1, order len1 !=2 raise.
- n=2 edges [(0,1),(0,1)] -> indeg1=2, heap[0], pop0: w1 indeg1 1 then 0 push. order [0,1]
- n=3 edges [(2,1),(2,0)] -> heap [2] (0,1 indeg1). pop2: decrement1->0 push1, decrement0->0 push0, heap [0,1], pop0, pop1 => [2,0,1]. Is lex smallest? Valid: 2 before both. Orders: [2,0,1], [2,1,0]. Min [2,0,1]. Good.
- n=4 edges [(3,1),(3,2),(0,3)] -> indeg:1=1,2=1,3=1,0=0. heap [0], pop0 push3; pop3 decrement 2,1 => heap [1,2]; pop1,pop2 => [0,3,1,2]. Valid? 0 before3,3 before1,2. Lex smallest: first must 0, then 3, then 1. Good.

Now, potential issue: The order list appends `v` which is an int object from heap. If initial heap list created from indices, these ints maybe new objects. order references same. okay.

Could return order; if we appended ints from heap that later mutated? ints immutable. okay.

Potential hidden: Need lexicographically smallest ordering of all n nodes, not just connected. Kahn min-heap includes isolated nodes; chooses smallest available. Good.

Now, let's think about if using multigraph duplicates may alter lexicographic order in weird way due to multiple edges causing a node's indegree to be >0 longer if its predecessor has multiple edges? But predecessor processed at a single time and all duplicates decrement in same loop. There's no delay relative to processing predecessor. It just may be pushed later in the adjacency iteration. Suppose predecessor p has outgoing edges to x and duplicates to y. Adjacency order maybe original edges order. If p's adjacency list has duplicates to y interleaved with x. Does order of pushing children within same iteration affect heap? At end of iteration, all children with indeg zero are in heap. Heap order independent of push order (assuming heap property). Good. If y becomes zero before x? If x also becomes zero, both in heap. Lexicographically next will be min of them. If adjacency order affects heap temporarily? After pushes, heap invariant. It doesn't affect final pop order except if duplicates make indeg not zero until last duplicate; but all within same iteration. Good.

Potential performance issue: If adjacency list has many duplicate edges to same w, we decrement indeg and check each time. Could optimize by deduplicating outgoing edges per node after sorting? Not necessary. But worst-case 400k duplicates from 0 to 1: we will decrement 400k times, indeg check each. okay. If time limit 1s, okay. If Python slower, maybe 400k loop plus 200k heap okay. Could dedupe using `adj[a].append` only if last appended not same? If edges input order arbitrary. Could use per-node last_seen? not. If all duplicates, still append 400k and decrement 400k. Deduping could reduce if using set or sorting. But sorting 400k might be similar. If time limit strict, maybe dedupe could reduce but adds overhead. Need choose likely faster. For random edges, multigraph loop 400k. Sorting 400k plus loop 400k, slower. Use no dedupe.

But let's consider if duplicate edges could cause Kahn to not terminate within about a second if duplicate self-loop cycle with 400k duplicates? It builds adj 400k, heap maybe empty raise. okay.

Could use in-place edges list and not keep adjacency duplicate? No.

Now, maybe topological lexicographically smallest can be solved with DFS post-order and heap? Kahn is correct.

Let's think if problem might expect to reject self-loop only but also duplicate edges? We handle. Good.

Potential issue: If duplicate edges are considered as a single edge and if you don't dedupe, lexicographic order still same. Good.

Potential hidden test: n=200000, edges list is empty. Our quick return list(range(n)) avoids heap. Good.

Potential hidden test: n=200000, edges all point from high to low making heap operations more pushes? Example chain 1->0,2->1,...? Initial zero high node n-1, pop, push n-2, etc. Heap size small; good. If many zero nodes and cycle? okay.

Potential hidden test: Many edges causing node become zero multiple times? Not possible if count consistent. Could a node be pushed once, but indeg goes negative? no.

Now, let's examine if using `if nw == 0` not `<=` prevents push if negative. If bug causes negative, cycle detection might fail? But no negative. Could use `if nw == 0` correct.

Potential hidden test with duplicate edges but adjacency duplicate count not equal indeg due to integer overflow? Python no.

Potential hidden: Edges list may contain `(a,b)` where a,b are bool? bool int. okay.

Now, let's consider if `heap` built sorted but not heapified; after pushing nodes with ids maybe less than existing root? heappush ensures. Good.

Let's maybe include `heapq.heapify(heap)` anyway to avoid any doubt. Time overhead minimal. But if initial heap sorted, heapify still O(n). If n=200k, C implementation of heapify might be very fast but maybe still ~1-2ms. Not concern. Simpler correctness for readers. But performance? We can skip with comment. The user requested handle 1s; optimizing is good. I'll skip heapify but ensure comment. Is there any chance sorted list is not considered a heap because min-heap property not about sorted array but parent at i <= children at 2i+1? It holds for sorted array. Good. If someone changes heap construction to list comprehension over `enumerate(indeg)`, sorted. okay.

Potential issue if initial heap list is sorted but contains large ints; heap property holds. Good.

Now, should we use `while heap:` with `heappop` local. If heap empty and order len != n, raise. Good.

Could include `if len(order) < n: raise ValueError` else return. Use `len(order) != n`. Since order cannot >n if valid; if invalid edges negative indeg could push duplicates? no. Use !=.

Potential issue with `if not heap: raise ValueError("cycle detected")` initial. Suppose n=1 edges=[] returned; if n=1 edges=[(0,0)] heap empty raise. Good. Suppose n=2 edges=[(0,1),(1,1)] heap? indeg0=0, indeg1=2, heap [0]. Not empty. pop0 decrement1 to1. heap empty, order len1 !=2 raise. Good.

Could optimize initial heap if all indeg zero: `if indeg.count(0) == n`? Not needed; `if not edges` returns. If edges nonempty but invalid zero? If edge with a outside? no.

Now, final answer should be a single Python code block, no explanation. Ensure no example usage or tests. Could include only function and import.

Let's think if type hints require `from __future__`? Python 3.11 supports built-in generics. okay.

Potential hidden environment uses PyPy? heapq C extension? In PyPy, heapq might be Python but okay. List-of-lists maybe. Skipping heapify with sorted list? PyPy heapq heappush expects list; okay. Performance maybe different. Sorting not used. Good.

Could implement custom heap using `heapq` from standard. okay.

Now, let's revisit duplicate edges: Suppose duplicate edges but with different order in adjacency. Could indeg[b] become zero and push b while processing a's adjacency, and then later in same adjacency list there is another duplicate edge from a to b, making indeg -1. Is that possible if indeg[b] count equals duplicate count? We said no, but let's test with k duplicates and other incoming edges. Let indeg[b]=k. During a adjacency, first decrement k-1,... kth 0. push on kth. no further duplicate after kth? There are k duplicates total in adjacency. If duplicates not contiguous? Suppose adjacency list for a contains [b, x, b]. indeg[b]=2 (only two edges). Processing first b: indeg 1. Process x maybe not. Process second b: indeg 0 push. no third. Good. If there are other incoming edges from already popped predecessors? indeg before processing a counts only unprocessed incoming edges. If all duplicates from a and all other predecessors processed, indeg=k. If some other predecessor also unprocessed, indeg > k. So won't reach 0 before all a duplicates processed. Good. If some duplicate edges from a are processed but indeg reaches 0 before all a duplicates? That would mean indeg before a < k, impossible because all a duplicates unprocessed. Good. So safe.

What if duplicate edges from a to b but a is pushed multiple times? It isn't. Good.

Could there be edge from a to b where a and b same self-loop. indeg[a] includes self. If a also has zero indegree from others? self prevents zero. If self-loop edge is in adjacency of a but a never popped. no decrements. cycle. Good.

Now, maybe cycle detection can be made faster by counting processed nodes rather than len(order). `processed = 0` increment each pop. Slightly faster than len each? len(order) at end O(1). okay.

Potential micro-opt: Use `order = [0] * n` and fill index to avoid append overhead and int list? Maybe faster? Append amortized C, okay. Prealloc:
```
order = [0]*n
count=0
while heap:
   v=heappop(heap); order[count]=v; count +=1
...
if count != n: raise
return order
```
This avoids dynamic append and len. Could be faster and memory same. It returns list with exactly n ints. But if cycle, we still have list length n with zeros partly; no issue. It also avoids append method local. Might be faster for n=200k. Let's consider. Append is optimized C but method call each node. Assignment also Python bytecode. Similar. Prealloc may avoid list resize. Append list has over-allocation; 200k appends okay. Prealloc creates list of n zeros (ref to same int) upfront. Append list starts empty and grows; could be faster? Maybe append is very fast. Prealloc assignment needs maintain count. Could use `order_append` simpler. But if memory? Append list of n ints refs; prealloc same. I'd keep append for clarity. Could use prealloc to avoid `append` attribute lookup. We already local append. Good.

Could preallocate order and fill:
```
order = [0] * n
idx = 0
while heap:
    v = heappop(heap)
    order[idx] = v
    idx += 1
...
if idx != n: raise ValueError
return order
```
This ensures returned list length n even on cycle before raise? Raise. It may be faster. But if cycle, order contains zeros for remaining; irrelevant. It does allocate full list before knowing cycle; append would allocate up to processed nodes only. For n=200k, negligible. If cycle early with many cycle nodes, prealloc still allocates full n; append saves memory maybe. But time okay. Which is faster? Append uses C list append; assignment uses list assignment and count. Method append call maybe similar. Local `order_append(v)` vs `order[idx] = v; idx +=1`. Append probably optimized. Keep append.

Potential micro-opt: Use `for v in heap:`? No, heap dynamic.

Potential micro-opt: Use `while heap: v = heappop(heap); ...;` okay.

Potential micro-opt: In edge loop, avoid unpacking? `for edge in edges: a=edge[0]; b=edge[1]` maybe slower. Unpack okay.

Potential micro-opt: If m large, `adj = [[] for _ in range(n)]` list comprehension with n. okay.

Now, let's consider if using duplicates without dedupe could cause time issues for worst-case duplicate edges in Kahn because a node with 400k outgoing duplicates to b: for loop 400k, okay. If there are 400k duplicates to many nodes? max 400k. okay.

Could there be many isolated nodes (n=200k, m=400k edges among 1000 nodes). Heap contains 199000 isolated + others. Popping isolated first. If isolated nodes are 0..199999 maybe output lex smallest with isolated first. Good.

Now, maybe lexicographically smallest topological order with min-heap chooses isolated small nodes early, even if processing them doesn't enable others. Correct because lex order prioritizes small. Example node 0 isolated, node1 ->2. Output [0,1,2] vs [1,2,0]. [0,1,2] smaller. Good.

Now, let's think about possible issue with initial heap sorted skip heapify if `heap` built by `enumerate(indeg)` but if `indeg` has zero entries out of index order? enumerate yields in index order. okay.

Could there be a cycle but initial heap empty? raise before Kahn. Good. If no edges returned earlier, no cycle. If edges exist but all nodes have indegree >0, cycle. True for finite directed graph where every vertex indegree >=1. But wait multigraph with every vertex indegree >0 must have a cycle? Yes by following incoming edges backwards from any node, finite nodes => repeat -> directed cycle. Good.

Now, what about a DAG with a source node but it has indegree due to duplicate edge from itself? Self-loop => not DAG. no.

Potential issue: `edges` list could be extremely large but n=0. `if n <= 0: return []` would ignore edges even if nonempty; okay because nodes none? If invalid edges with n=0, maybe ValueError? Not specified. Returning [] maybe acceptable? Could if n=0 edges should be empty. If edges nonempty, node IDs invalid. Not concern.

Let's maybe not return for n<0; `n <= 0` returns [] for negative. If n negative, maybe range? Not relevant.

Now, maybe problem wants raise ValueError for cycle including self-loop. We include. For duplicate self-loop, raise. Good.

Potential hidden tests check exact exception type `ValueError`. We raise ValueError.

Could the graph be not acyclic but Kahn produces len(order)=n due to duplicate indegrees becoming negative? We proved no. Let's test a graph with cycle but duplicate edges from outside to cycle maybe indeg counts negative? Suppose cycle 0->1,1->0. Duplicate edges 2->0,2->1. indeg0=2 (1 self? actually cycle incoming from1 and2: indeg0=2? edge1->0 and2->0), indeg1=2 (0->1,2->1). node2 zero. pop2 decrements both to1. cycle indeg remain1. no. good.

What if duplicate edge in cycle counted but adjacency processed when cycle node popped? They never pop. good.

Now, maybe if graph has cycle but one cycle node also has duplicate outgoing edge to outside causing outside indeg negative? Outside maybe processed? Cycle nodes not popped, so outside incoming from cycle not decremented, so outside cannot pop. good.

Now, let's consider alternative algorithm using DFS with recursion? Not for n=200k (recursion limit). Kahn iterative.

Potential hidden: Need stable lexicographic ordering considering node labels numeric. yes.

Now, code final. Could include comments for duplicate edges: "Parallel edges are handled naturally by counting each edge and decrementing for each adjacency entry." Good. Comments okay.

Let's produce final:
```python
import heapq

def topo_order(n: int, edges: list[tuple[int, int]]) -> list[int]:
    if n <= 0:
        return []
    if not edges:
        return list(range(n))

    adj = [[] for _ in range(n)]
    indeg = [0] * n

    for a, b in edges:
        adj[a].append(b)
        indeg[b] += 1

    # Free the input list reference if it is only held here.
    # del edges? maybe no. Could include edges = None.
    heap = [i for i, d in enumerate(indeg) if d == 0]
    if not heap:
        raise ValueError("cycle detected")

    heappop = heapq.heappop
    heappush = heapq.heappush
    order = []
    append = order.append
    adj_local = adj
    indeg_local = indeg

    while heap:
        v = heappop(heap)
        append(v)
        for w in adj_local[v]:
            nw = indeg_local[w] - 1
            indeg_local[w] = nw
            if nw == 0:
                heappush(heap, w)

    if len(order) != n:
        raise ValueError("cycle detected")
    return order
```

But note: Initial heap built in increasing order, but we do not call heapify. Is that okay with `heappop`? Yes. But if heap list built with comprehension, Python list is sorted but is it a heap? Yes. But if I add `if not heap` no heapify. Could some static checker think missing heapify? It's okay. To be extra safe and not sacrifice much, call `heapq.heapify(heap)`. But then initial heap if empty? okay. If we skip heapify, we rely on sorted property. The user only wants code; correctness okay. Maybe include a comment: `# The comprehension yields a sorted list, which is already a valid min-heap.` Then no heapify.

Potential risk: If n large and zero_nodes list sorted but not heap due to heap shape? Let's formally prove sorted array is heap: For min-heap in array representation, heap invariant: for every parent p < c (value) at index i, A[i] <= A[2i+1], A[2i+2]. If A sorted nondecreasing and child indices > parent index, then A[child] >= A[parent]. So yes.

Could there be initial heap list sorted but not strictly due to same node? no duplicate nodes. okay.

Now, maybe `edges` is empty but contains no edges but graph has self-loop? impossible. Return range.

Potential issue with `if not edges:` if edges is a custom sequence with expensive truth? list. okay.

Potential issue: If `edges` is a list of tuples and very large, `if not edges` okay. If `edges` is `None`? Signature not. no.

Let's think about if cycle but initial heap not empty and Kahn processes some nodes then heap empty. `while heap` stops. raise. Good.

Potential hidden: Need preserve original edges? We don't mutate. Good.

Could reduce memory by `del edges` before heap. If we want:
```
    del edges
```
after edge loop. Does this free input if only local? Yes. If caller holds, no. Could include. But if `edges` is used in `if not edges` and then loop, after loop safe. In Python, deleting local variable no harm. But if function is optimized? okay. Could do `edges = None`. `del edges` might make debugging harder but fine. It may allow GC of temporary argument list. I'll include maybe `edges = None`? If we set to None, local reference to list replaced; caller unaffected. If argument was only reference, list refcount decreases. Good. `del edges` similar. Not necessary. Could avoid because deleting parameter may be considered mutating local, but okay. No effect on function correctness. Maybe not include to keep simple.

Now, consider if adjacency list of lists with duplicate edges: For each edge, `adj[a].append(b)` stores b as int object from tuple. If tuple is freed, int objects still referenced in adjacency. Good. For node ids in heap/order, separate int objects. okay.

Potential issue: For very large n, `list(range(n))` returns list of int objects. If edges empty, return. If n=200k okay. If n=200k and edges nonempty but many zero nodes, heap/order create many int objects. okay.

Could avoid heap for no edges but if edges empty, returns list(range(n)). If edges not empty but graph has all nodes zero indegree impossible because any edge increments target. If invalid edge with a,b outside? no. If b not in range maybe error. okay.

Now, perhaps lexicographically smallest topological order can also be obtained by repeatedly choosing smallest zero indegree, but if there are duplicate edges, a node might be considered indegree zero incorrectly if duplicates counted but adjacency duplicates not all processed? no.

Let's think about using indegree decrement with duplicate edges could push node multiple times if indeg goes negative? We check `== 0`. Suppose due to some duplicate adjacency but indeg miscount? no. If indeg becomes 0 and then later another duplicate from same node? We argued cannot if counts consistent. But if indeg count includes duplicate but adjacency list includes extra duplicates due to same edge? consistent. okay.

Potential scenario: Multiple edges from same predecessor but one of them appears after node was already pushed by other predecessor? Example indeg b = 3: two from a, one from c. a popped before c? If a popped, decrements two to1, not push. c popped, decrements to0 push. Good. If c popped first, decrements to2; a decrements to0. Good. If a popped and c already popped, indeg before a=2, push on second. good. No push before all unprocessed incoming processed. Good.

Now, maybe cycle detection with len(order) can be O(1) but if cycle and order length less than n, raise. Good.

Could maybe return `order` if no cycle; if cycle after processing some nodes, `order` contains partial. Raise. Good.

Now, think if problem's "lexicographically smallest valid ordering" means among all topological sorts as sequences of node labels, yes.

Now, final code block. Need ensure no extra text outside? The instruction: Reply with a single ```python code block containing the complete solution. No tests, no example usage, no input(), no printing. So final should only code block. Good.

Double-check no syntax issues. Type hint `list[tuple[int, int]]` requires `tuple` builtin. okay. `heapq` imported.

Let's perhaps include `__all__`? no.

Potential improvement: Since no heapify, if initial heap list is sorted but if it's empty? `not heap` raises. If heap is valid. Good. If there are zero nodes but sorted list [3,5] valid. okay.

Would `heapq.heappop` on a sorted list without heapify possibly be less efficient because it assumes heap but sorted is heap. okay.

Could some linters complain heapify missing? not relevant.

Maybe if we skip heapify but then use `heappush`, the heap property after heappush works only if initial heap property. okay.

Now, let's consider if there are many edges and we don't dedupe, but topological order with multigraph duplicates: If duplicate edge (a,b) appears many times, and a's adjacency list has many duplicates, in Kahn, when processing a, it may push b only after last duplicate. Suppose b has smaller id than some existing heap nodes. It gets pushed at end of for loop. If b's id is smaller than nodes already in heap, heappush places it. But could b have been available after first duplicate (if indeg miscount)? no. It is available only after last duplicate. But all duplicates are processed before next pop. The fact that b was "available" conceptually after a is popped, even before iterating all duplicates? In actual algorithm, node should be available after all edges from processed nodes are removed. Since we are iterating a's edges within the same pop iteration, we could conceptually push b after the entire adjacency list processed. We do. If b id small, it will be considered next. Good. If adjacency order has b duplicates at end, b not pushed until end of loop, but no pops occur during adjacency iteration, so timing same. Good.

Now, if adjacency list huge and b becomes zero early but there are remaining edges from a to b that would make indeg negative? impossible. Good.

Potential memory optimization: If edges empty, `list(range(n))` returns lex smallest. If n=200k, fine. If edges nonempty but all cycle and heap empty, we still built adj and indeg. Could detect cycles early? no.

Could early raise self-loop while building to avoid adjacency memory? If self-loop appears, we can raise. But then if invalid out-of-range? no. Self-loop check `if a == b: raise ValueError`. That adds branch per edge but could speed cycle cases. Not needed. Could include to explicitly handle self-loop? Kahn handles. Branch might slow common case. Avoid.

Now, let's evaluate if no dedupe and duplicates could cause indeg for target node to be larger than number of edges from unpopped predecessors if some predecessor appears multiple times in heap? Node not multiple. okay.

Potential hidden: Edges may include duplicate `(a,b)` but with a or b not int? no.

Now, final. But maybe the problem specifically says "Duplicate edges may appear" because they expect deduping to avoid multiple indegree increments if adjacency deduped? But we handle by consistent count. Good.

Let's think if Kahn with multigraph and min-heap can violate lexicographically smallest if duplicate edges are treated as requiring multiple identical predecessor pops? Since predecessor popped once, no. If algorithm erroneously required predecessor to appear multiple times, it would not push nodes until multiple appearances. But each node appears once. okay.

Now, perhaps use `heapq.heapify(heap)` to be safe in code review. The overhead is negligible and it avoids any skepticism. Let's decide. If I include heapify, code simpler to trust. Performance maybe still okay. For 200k zeros, heapify C maybe fast but if all zeros and edges empty we early return. If edges nonempty, initial heap size <= n-1. heapify O(size). Could be 200k if many isolated nodes and some cycle edges. But edges nonempty could have 199999 zero nodes and one cycle self-loop? E.g., n=200k, edges [(199999,199999)]. Initial heap size 199999. heapify 200k maybe a bit. If skip, saves. But if heapify C, maybe 10ms. Not issue. I'd skip but comment. It's safe. However, some `heapq` implementations (pure Python fallback) may expect heapify? It only uses `_siftdown` on push/pop; assumes invariant. Sorted list valid. okay.

Could there be a subtle issue: A sorted list is a valid min-heap but after some elements are popped, the remaining list may not be sorted. But heap invariant maintained by heappop. Good.

Now, maybe initial heap constructed by list comprehension is sorted but if n=0? early return. okay.

Let's also think about cycle detection in graph with duplicate edges and isolated nodes: Suppose initial heap contains isolated nodes. If cycle has no zero nodes, after processing isolated heap empty raise. Good.

Potential issue with `raise ValueError("cycle detected")` initial if no heap. Suppose n>0 and edges list contains only edges with target outside range? indeg index error. no.

Now, maybe need to handle large recursion? no.

Let's consider if using `indeg_local = indeg` and `adj_local = adj` not necessary but helps. Good.

Potential issue if `edges` has a lot of duplicates and target node indegree becomes zero then pushed, but node is already in order? Could a node be pushed after popped? In Kahn, once node popped, its indeg is zero. Could later another predecessor pop and decrement its indeg negative and push again? If node already popped, all its predecessors must have been popped already before it became zero. In topological order, a node is popped only when all incoming edges from unpopped nodes processed. Could there be an incoming edge from a node popped later? No, because then indeg would not have been zero. With duplicate edges and counts consistent, safe. But let's test with cycle? Node in cycle not popped. For acyclic, if node popped, all incoming predecessors popped. So no future decrements. Therefore no re-push. Good. If bug due to negative indeg, `nw == 0` from 1 to0 for already popped node? Could happen if indeg was 1 due to future predecessor, then node popped incorrectly? Not possible. Good.

Now, maybe we should guard `if nw < 0`? Not needed.

Potential hidden: `edges` may include self-loop duplicate; we raise at end. Good.

Now, let's think about topological sort in presence of parallel edges and lexicographic smallest with min-heap. There is a known variant for lex smallest topological order: use Kahn with priority queue of vertices with zero indegree. yes.

Now, final answer with code block. Ensure no extra newline outside? okay.

Let's maybe include `# Parallel edges are okay: each edge instance increments and decrements indegree.` as comment. Good.

Double-check function returns list of ints. yes.

Potential if graph has cycle but len(order)==n due to negative indeg and duplicate pushes? Let's try to find a counterexample with inconsistent duplicate? But we are consistent. However, what if duplicate edge (a,b) appears, indeg[b] increments 2. adjacency[a] has two. But what if a appears twice in order? Kahn prevents because node pushed only when indeg becomes 0. Could a be pushed twice? Suppose indeg[a] initially 1 from c. c has two duplicate edges to a. indeg[a]=2. c popped decrements to1 then0 push a once. Good. If c has 1 edge but adjacency has two? consistent only if indeg two. no. If node has negative indeg from cycle? not.

Potential if graph has multi-edge from b to b self-loop twice. indeg[b]=2. If b also has incoming from a (acyclic otherwise). indeg[b]=3. pop a decrements one to2. b never zero. cycle. Good.

Now, one more performance idea: Use `heap = [i for i in range(n) if indeg[i] == 0]` rather than enumerate? Let's compare. `enumerate(indeg)` avoids list index and tuple unpack? It yields index and value. It may be faster. Good.

Potential micro: `for a, b in edges:` where edges list of tuples. okay.

Potential micro: Use `append = heapq.heappush`? We need heappush and heappop. okay.

Could use `heapq.heappush(heap, w)` directly but local faster.

Potential micro: In Kahn, `for w in adj_local[v]:` if adj_local[v] empty, okay. `adj_local` lookup each pop. Good.

Potential micro: `indeg_w = indeg_local[w]`? We do direct. Good.

Potential micro: `nw = indeg_local[w] - 1; if not nw:` instead of `==0` maybe faster? Since negative possible? If negative bug; but if acyclic, zero check. `if nw == 0` clear. Could use `if not nw` slightly faster. But if indeg becomes -1 due to duplicate bug, would push negative? no. Use ==0. Could use `if nw < 0` for safety? no.

Potential issue: In Python, bool? `nw` int. okay.

Now, if graph has cycle but some nodes processed, at end len(order)!=n. raise. If graph has invalid node ID causing IndexError, not ValueError. Not specified. Could add checks only if a==b? no. If invalid hidden tests, maybe they expect ValueError? But nodes defined 0..n-1. Avoid.

Let's decide whether to `del edges` after building. If we don't, no issue. Could include `edges = None` after loop to reduce peak memory if temporary. But assigning None might cost negligible. Could do:
```
    # The edge list is no longer needed.
    edges = None
```
But if `edges` type annotated list, assigning None not type. It's okay but not necessary. Could confuse. Skip.

Now, final answer. Wait, developer says "Ensure you finish all private analysis in thinker. Now final only code. Good.

But let's think further: Is Kahn with min-heap truly lexicographically smallest if we treat parallel edges as multiple constraints? There's no difference. Good.

Alternative for lex smallest: Need use `heapq` but if initial heap sorted skip heapify. okay.

Could there be a problem with lexicographic order when a node becomes zero during processing of a small node's adjacency, and a larger node is already in heap. We push small node, then pop next small. Good. If the newly available node is smaller than some nodes in heap, heap handles. Good.

Now, let's test some random examples with duplicates in head:
- n=5 edges [(4,0),(4,0),(2,1),(1,0)] indeg0=3,1=1,4=0? Node3 isolated. heap [2,3,4]? Actually indeg:0=3,1=1,2=0,3=0,4=0 => [2,3,4]. Min 2 -> push1. heap [1,3,4]. Min1 -> decrement0 to2. heap[3,4]. Min3. pop4 -> decrements0 twice to0 push0. output [2,1,3,4,0]. Is lex smallest? Valid constraints:2<1<0,4<0,3 isolated. Need first: min zero initial [2,3,4]. 2<3<4, so first 2. Then zero [1,3,4], choose1. Then [3,4], choose3. Then4 then0. good.

Now, if duplicate edges from 2 to 1 twice and 1->0: indeg1=2. pop2 decrements twice push1. output [2,1,0]. okay.

Now, if initial zero nodes [0,2], edge 0->2? But if 0->2, indeg2>0, so 2 not initial zero. okay.

Now, maybe graph can have nodes with indegree zero but outgoing to smaller node already in heap? If edge from smaller to larger, larger indegree not zero. If edge from larger to smaller, smaller indegree not zero. So no edge between two initial zero nodes. Thus choosing min zero safe.

Now, maybe a node can become zero while processing a node, but there are still unprocessed edges from another node currently in heap with larger id. If new node smaller than some heap nodes, should it be chosen before them? Kahn with heap yes. Is that valid? Suppose current heap has larger node y that was available earlier. New node x became available after popping current min p. Could a valid order have chosen y before x? If x < y, lex order would prefer x if x available after p. But is x independent of y? Could there be edge x -> y? If x available now and y already in heap, y's indegree zero means no edge x->y? Wait if edge x->y, y indegree would not be zero before x popped, unless x already popped. x not popped. So no. Edge y->x? If y->x, x indegree would not be zero after y not popped. So no. They are independent. Thus choose x next lex. Heap does. Good.

Now, let's consider memory of adjacency lists: Since we don't dedupe, `adj[a].append(b)` for duplicate edges. If many edges share same a, list overallocates. okay.

Could use `edges.sort()` to group and then build adjacency as slices? Not needed.

Potential if m=400000, n=200000, graph is a long chain: edges (i-1,i). Heap size 1, pops n, decrements n-1. Fast. If graph is complete? m only 400k sparse. okay.

Now, if graph has many nodes with outdegree zero, Kahn heap pops many isolated. okay.

Potential hidden performance: Many nodes become zero due to one popped node, push many into heap. heap operations O(k log n). k edges 400k. okay.

Could optimize by not using heap for nodes that are pushed in sorted order? Not easy. Maybe use `heapq.merge`? no.

Now, final code with skip heapify. Let's ensure comment not too verbose. Fine.

One more thing: In initial heap, if it's sorted, `heapq.heappop` returns smallest. But if we skip heapify, `heapq` pure Python implementation's `heappush` uses `_siftdown(heap, 0, len(heap)-1)` after append. It assumes heap invariant for indices < pos. okay.

Now, if initial heap size is 1, valid. Good.

Let's final.
