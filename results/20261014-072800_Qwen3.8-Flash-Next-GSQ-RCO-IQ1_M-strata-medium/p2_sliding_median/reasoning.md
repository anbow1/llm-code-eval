We need to implement sliding_median efficiently. n up to 200k, k up to 1000. Need O(n log k) or better.

Classic approach: maintain two heaps (max-heap for lower half, min-heap for upper half) with lazy deletion, or use sorted list with bisect. For k=1000, using `bisect` on a sorted list of k elements: each step we do a binary search (O(log k)) and insert/delete (O(k) due to list shifting). That's O(n*k) = 200k * 1000 = 200M operations... too slow maybe. Actually Python list insert/delete is memmove of pointers which is fast C code. 200M pointer moves... might be borderline. Let's think: 200k windows, each step remove one element and insert one. Removing from middle of 1000-element list requires shifting ~500 pointers. 200k * 500 * 8 bytes = 800MB of memmove. Might take ~1-2s? Risky.

Better: use two heaps with lazy deletion. This is O(n log k). Let me implement the classic "find median from data stream" adapted for sliding window.

Standard solution: two heaps + delayed removal dict + balance counter.

Let me implement carefully.

max_heap (lower half): store negatives for max-heap.
min_heap (upper half): store values.

We need to know sizes "effectively" and prune on top when top is to-be-removed.

Algorithm:
- `small`: max-heap (store -val) for lower half.
- `large`: min-heap for upper half.
- `small_size` = logical number of elements in small.
- `large_size` = logical number in large.
- `delayed` = dict counting elements to be removed (need to remove from whichever heap contains them).
- `balance = small_size - large_size`.
- prune top of a heap: while heap top matches a delayed element, pop and decrement delayed count.
- to_median: if small_size == large_size -> (-small[0] + large[0]) / 2. If small_size > large_size -> -small[0].
- make_balance: if balance > 0, move top from small to large (small_size-=1, large_size+=1, balance-=2). If balance <0 move top from large to small. But need to prune top before moving and after moving prune.

Add(num): if num <= -small[0], add to small: heappush(small, -num), small_size+=1, balance+=1. Else add to large similarly. But handle empty heaps.

Remove(num): if num <= -small[0]: small_size-=1, balance-=1. else large_size-=1, balance+=1. Then delayed[num]+=1. If num == top of that heap, prune that heap.

Then make_balance.

Need careful handling of empty heaps. For k windows, we always have k elements so both may be empty when k=1? For k=1, small_size could be 1, large empty. median = small top. Need make_balance to handle moving from empty.

Standard LeetCode 480 solution.

Let me write it.

Prune(heap): while heap and heap[0] in delayed: d = heap[0]; heappop; delayed[d]-=1; if 0 del. But small stores negatives; delayed stores actual values. Handle small separately: prune small with negative top.

Let me code:

```
def sliding_median(nums, k):
    if k < 1 or k > len(nums):
        raise ValueError(...)
    import heapq
    small = []  # maxheap negatives
    large = []  # minheap
    delayed = {}
    small_size = 0
    large_size = 0

    def prune_small():
        while small and -small[0] in delayed:
            x = -heap.heappop(small)
            delayed[x] -= 1
            if delayed[x] == 0: del delayed[x]
            nonlocal small_size? No, prune only removes already-counted? Actually small_size already decremented when remove was called. prune just physically removes.

    def prune_large(): ...

    def make_balance():
        nonlocal ...
```

Need nonlocal declarations in nested functions. Let me just use a class or list to hold counters.

Let me implement with nonlocal.

make_balance:
```
if small_size < large_size:
    v = heappop(large); heappush(small, -v); large_size-=1; small_size+=1; balance+=2
    prune_large()
elif small_size > large_size:
    v = -heappop(small); heappush(large, v); small_size-=1; large_size+=1; balance-=2
    prune_small()
```

Wait I'm mixing balance and sizes. Let me just use sizes; balance computed as difference.

make_balance ensures small_size == large_size (even) or small_size == large_size+1 (odd). Actually we want: if total even, small_size == large_size; if odd, small_size == large_size+1. So condition: while small_size < large_size move large->small; while small_size > large_size+1 move small->large.

But careful: after add/remove we adjust sizes. Let's just do single moves since we only change by 1.

Let me carefully reconstruct from known LeetCode 480 solution structure:

```
small_size, large_size = 0,0
balance = 0

def add(num):
    if large_size == 0 or num <= -small[0]:
        heappush(small,-num); small_size+=1; balance+=1
    else:
        heappush(large,num); large_size+=1; balance-=1
    make_balance()

def remove(num):
    if num <= -small[0]:
        small_size-=1; balance-=1
    else:
        large_size-=1; balance+=1
    delayed[num]+=1
    if num == -small[0]:
        prune_small()
    if num == large[0]:
        prune_large()
    make_balance()

def make_balance():
    if balance > 0:  # small has one too many -> move top of small to large
        move small top to large; small_size-=1; large_size+=1; balance-=2; prune_small()
    elif balance < 0: # large has one too many -> move top large to small
        move large top to small; small_size+=1; large_size-=1; balance+=2; prune_large()
```

Hmm, but balance target should be 0 or 1? In LC solution, balance represents small_size - large_size, and median is found from tops. They target balance 0? Actually they use balance such that it's 0 or 1. Let me look.

In LC 480 official: `balance` = size of small - size of large. make_balance: if balance>0 move small->large (balance becomes balance-2). Wait that would make negative... Actually they then check `if balance < 0` move large->small. The loop ensures balance becomes 0 or 1? Hmm. Let me think: after add one element, balance changed by ±1, so before balance was 0 or 1, after it's -1,0,1,2. make_balance: if balance>0 (i.e., 1 or 2)... moving one from small to large: balance -=2 -> -1 or 0. Hmm then negative. Then check balance<0 move back. This seems to converge to 0? Actually maybe they target balance=0 or 1. I recall they do:

```
def rebalance():
    if balance > 1:  # ? 
```

Let me check memory: Actually I think target is balance == 0 or 1. So condition: if balance > 1 move small->large; if balance < 0 move large->small. Let me verify: initial state before ops balance is 0 or 1. After add: balance ∈ {-1,0,1,2}. If balance==2 (>1) move small->large ->0. If balance==1 (ok). If balance==0 ok. If balance==-1 (<0) move large->small ->1. After remove: balance ∈ {-2,-1,0,1}. If balance==1 ok; 0 ok; -1 (<0) move large->small ->1; -2 (<0) move ->0. Good. And median: if small_size > large_size -> small top else mean.

Yes target balance ∈ {0,1}. Good.

Edge: small might be empty when k=1? If k=1, we want small_size=1 large_size=0. add first num: large_size==0 so push to small, balance=1 ok. Good. Remove: num <= -small[0] true, small_size=0 balance=0, delayed... then add new etc.

But when small empty and large_size==0 initial, add goes to small, fine. But what if after remove small becomes empty but large not? make_balance balance<0 will move from large to small, fine (large not empty because balance<0 means large_size>small_size). Good.

But make_balance prune order: When moving top from small to large, we must prune small first? Actually we already pruned top when remove matched. Let's just ensure prune before moving: in make_balance, before popping call prune_small/prune_large.

Also in add comparison `num <= -small[0]` if small empty? large_size==0 check covers. But after remove small could be empty while large non-empty? Then add: large_size!=0, small empty -> can't compare -small[0]. But can that happen with valid window? If small empty then small_size=0, and balance small_size-large_size negative means there's imbalance; but we always make_balance after every op, ensuring balance>=0, so small_size >= large_size, and if large_size>0 then small_size>=1. So small non-empty when large non-empty. Good.

Now implement full. Need nonlocal for small_size, large_size, balance.

Let me also prune before moving in make_balance.

Write code.
