I need to implement a sliding window median that's efficient for n=200,000 with k=1,000.

The naive approach (sorting each window) would be O(n * k log k) which is too slow.

A good approach is to use two heaps (max-heap for lower half, min-heap for upper half) with lazy deletion. This gives O(n log k) time complexity.

The idea:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- The max-heap should have size >= min-heap size (or size == min-heap size when k is even)
- Actually, let me think more carefully:
  - max_heap (lower half): stores the smaller elements, top is the largest of the lower half
  - min_heap (upper half): stores the larger elements, top is the smallest of the upper half
  - We want: len(max_heap) == len(min_heap) when k is even, len(max_heap) == len(min_heap) + 1 when k is odd

For lazy deletion:
- We keep a dictionary counting elements that have been "deleted" but are still in the heaps
- When we peek or pop, we first clean up the top of the heap by removing lazily-deleted elements
- When a new element comes in and an old one leaves, we add the new element to the appropriate heap and mark the old one for lazy deletion
- Then we rebalance the heaps

Let me think about this more carefully:

1. For each new element, add it to the appropriate heap.
2. For each element leaving the window, mark it for lazy deletion.
3. Rebalance so that the sizes are correct.
4. Clean up tops (remove lazily-deleted elements from the tops).
5. Compute median.

The lazy deletion dictionary maps values to their count of pending deletions.

Let me code this up:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("Invalid k")
    
    # max_heap for lower half (negated for max-heap behavior)
    # min_heap for upper half
    max_heap = []  # lower half, stored as negatives
    min_heap = []  # upper half
    delayed = defaultdict(int)  # lazy deletion counts
    
    def clean(heap, sign):
        # Remove lazily deleted elements from top
        while heap:
            top = -heap[0] if sign == -1 else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    # Initialize with first k elements
    for i in range(k):
        num = nums[i]
        if not max_heap or num <= -max_heap[0]:
            heapq.heappush(max_heap, -num)
        else:
            heapq.heappush(min_heap, num)
    
    # Balance: max_heap should have size == (k+1)//2, min_heap should have size == k//2
    target_max = (k + 1) // 2
    target_min = k // 2
    
    while len(max_heap) > target_max:
        val = -heapq.heappop(max_heap)
        heapq.heappush(min_heap, val)
    while len(min_heap) > target_min:
        val = heapq.heappop(min_heap)
        heapq.heappush(max_heap, -val)
    
    def get_median():
        clean(max_heap, -1)
        clean(min_heap, 1)
        if k % 2 == 1:
            return float(-max_heap[0])
        else:
            return (-max_heap[0] + min_heap[0]) / 2.0
    
    result = [get_median()]
    
    # Slide the window
    for i in range(k, len(nums)):
        # Remove nums[i - k], add nums[i]
        outgoing = nums[i - k]
        incoming = nums[i]
        
        # Mark outgoing for deletion
        delayed[outgoing] += 1
        
        # Determine which heap the outgoing was in (for balancing)
        if outgoing <= -max_heap[0]:
            # It was in max_heap
            balance_max = len(max_heap) - 1
        else:
            # It was in min_heap
            balance_min = len(min_heap) - 1
        
        # Actually, let me use a different approach for balancing:
        # After adding incoming and marking outgoing for deletion,
        # we need to rebalance based on the "effective" sizes.
        
        # Add incoming
        if incoming <= -max_heap[0]:
            heapq.heappush(max_heap, -incoming)
        else:
            heapq.heappush(min_heap, incoming)
        
        # Rebalance
        # Effective size of max_heap = len(max_heap) - delayed count of elements in it
        # This is tricky... Let me use a different approach.
        
        # Actually, the standard approach is:
        # After adding and marking, adjust balance counter
        
        # Hmm, let me reconsider. The standard lazy deletion approach for sliding window median:
        
        # Track balance: how many extra elements are in max_heap vs min_heap beyond the target.
        # But this gets complicated with lazy deletion.
        
        # Alternative cleaner approach: just rebalance based on physical heap sizes minus delayed counts.
        
        # Actually, let me just do it differently. After insertion and lazy marking:
        # 1. Clean tops
        # 2. Check if max_heap has too many effective elements
        #    effective_max = len(max_heap) - (number of delayed elements that are in max_heap)
        #    This is hard to track exactly...
        
        # Let me use the approach where we track balance explicitly.
        
        # Actually, the cleanest approach I know is:
        # - Keep a balance counter that tracks len(max_heap) - target_max
        # - When outgoing is <= top of max_heap, it was in max_heap, so decrement balance
        # - When incoming goes to max_heap, increment balance
        # - When balance > 0, move elements from max_heap to min_heap
        # - When balance < 0, move elements from min_heap to max_heap
        
        # But with lazy deletion, we need to be careful. Let me just use the approach where
        # after each operation, we rebalance by looking at the effective sizes.
        
        # You know what, let me just implement it with the "balance" approach more carefully.
        
        pass
    
    return result
```

Let me restart with a cleaner implementation. The standard approach used in LeetCode solutions:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError(...)
    
    lo = []  # max-heap (lower half), negate values
    hi = []  # min-heap (upper half)
    delayed = defaultdict(int)
    balance = 0  # len(lo) - len(hi) effectively (tracking the difference)
    # Actually balance tracks how many more elements should be in lo than currently are
    
    # Hmm, let me think about this differently.
    # 
    # The invariant:
    # - len(lo) should be ceil(k/2)
    # - len(hi) should be floor(k/2)
    # - All elements in lo <= all elements in hi
    #
    # With lazy deletion, physical sizes may be larger than effective sizes.
    # We use `balance` to track: how many elements need to be moved from hi to lo (if positive)
    # or from lo to hi (if negative).
    #
    # When we "remove" an element:
    #   If it was in lo (i.e., <= -lo[0]), then lo effectively loses one, so we need balance += 1
    #   If it was in hi, then hi effectively loses one, so we need balance -= 1
    # When we "add" an element:
    #   If it goes to lo, balance -= 1 (lo has one too many... wait no)
    #   If it goes to hi, balance += 1 (hi has one too many... wait)
    #
    # Let me define balance differently:
    # balance = (target len of lo) - (effective len of lo)
    # If balance > 0, we need to move elements from hi to lo.
    # If balance < 0, we need to move elements from lo to hi.
    
    # Actually, I think the cleanest approach is:
    # balance = (number of elements that need to move from hi to lo)
    # 
    # When removing from lo: we need more in lo -> balance += 1
    # When removing from hi: we need more in hi, so fewer from hi to lo -> balance -= 1
    # When adding to lo: lo already has enough -> balance -= 1
    # When adding to hi: we need to compensate -> balance += 1
    
    # Then rebalance:
    # while balance > 0: move top of hi to lo, balance -= 1
    # while balance < 0: move top of lo to hi, balance += 1
    
    # After rebalancing, clean tops.
```

Let me write the full solution properly:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    
    # lo: max-heap (store negatives) for lower half, size = (k+1)//2
    # hi: min-heap for upper half, size = k//2
    lo = []
    hi = []
    delayed = defaultdict(int)
    
    def clean_top(heap, is_min):
        # is_min: True for min-heap (hi), False for max-heap (lo, stored negated)
        while heap:
            if is_min:
                top = heap[0]
            else:
                top = -heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    def rebalance(balance):
        # balance > 0: move from hi to lo
        # balance < 0: move from lo to hi
        while balance > 0:
            clean_top(hi, True)
            val = heapq.heappop(hi)
            heapq.heappush(lo, -val)
            balance -= 1
        while balance < 0:
            clean_top(lo, False)
            val = -heapq.heappop(lo)
            heapq.heappush(hi, val)
            balance += 1
        return balance
    
    # Initialize
    for i in range(k):
        num = nums[i]
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
        else:
            heapq.heappush(hi, num)
    
    # Balance initial
    balance = 0
    # Need len(lo) = (k+1)//2, len(hi) = k//2
    # Physically, before lazy deletion, these are correct since we haven't delayed anything yet
    target_lo = (k + 1) // 2
    while len(lo) > target_lo:
        val = -heapq.heappop(lo)
        heapq.heappush(hi, val)
    while len(hi) > k // 2:
        val = heapq.heappop(hi)
        heapq.heappush(lo, -val)
    
    def get_median():
        clean_top(lo, False)
        clean_top(hi, True)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        outgoing = nums[i - k]
        incoming = nums[i]
        
        # Mark outgoing as delayed
        delayed[outgoing] += 1
        
        # Determine which heap outgoing belonged to
        # and adjust balance accordingly
        if outgoing <= -lo[0]:
            # It was in lo
            balance = 1  # need one more in lo (move from hi to lo)
        else:
            # It was in hi
            balance = -1  # need one less in lo (move from lo to hi)
        
        # Add incoming
        if incoming <= -lo[0]:
            heapq.heappush(lo, -incoming)
            balance -= 1
        else:
            heapq.heappush(hi, incoming)
            balance += 1
        
        # Wait, let me reconsider the balance logic.
        # 
        # After removing outgoing (lazy):
        #   If it was in lo: effective lo has one fewer -> need to compensate -> balance = +1 (move hi->lo)
        #   If it was in hi: effective hi has one fewer -> need to compensate -> balance = -1 (move lo->hi)
        #
        # After adding incoming:
        #   If it goes to lo: effective lo has one more -> balance -= 1
        #   If it goes to hi: effective hi has one more -> balance += 1
        #   Wait, if it goes to hi, that's correct... we want balance to account for needed moves.
        
        # Hmm, I think I have the signs confused. Let me reconsider.
        # 
        # balance = amount we need to move from hi to lo (positive) or lo to hi (negative)
        #
        # Removing from lo: lo is now short by 1, so we need to move 1 from hi to lo -> balance += 1
        # Removing from hi: hi is now short by 1, so we need to move 1 from lo to hi -> balance -= 1
        # Adding to lo: lo now has an extra 1 -> balance -= 1
        # Adding to hi: hi now has an extra 1 -> balance += 1
        #
        # Net balance after both operations:
        # If outgoing was in lo AND incoming goes to lo: balance = +1 - 1 = 0 (net change 0) ✓
        # If outgoing was in lo AND incoming goes to hi: balance = +1 + 1 = 2 (need to move 2 from hi to lo)
        #   That seems wrong... Let me think again.
        #
        # Actually wait. If outgoing was in lo, effective lo decreased by 1. If incoming goes to hi, 
        # effective hi increased by 1. So lo is short by 1 and hi has 1 too many. 
        # We need to move 1 from hi to lo. So balance should be +1.
        # With my formula: +1 (from removing lo) + 1 (from adding to hi) = +2. That's wrong.
        #
        # Let me re-derive:
        # Before any operation: len(lo) = target_lo, len(hi) = target_hi. balance = 0.
        # After removing outgoing (it was in lo): effective len(lo) = target_lo - 1. We need to add 1 to lo.
        #   So we need to move 1 from hi to lo: balance should become +1.
        # After adding incoming to hi: effective len(hi) = target_hi + 1. But we just need to move 1 from hi to lo anyway.
        #   So balance stays at +1? No...
        #   After removing from lo: lo has target_lo - 1 elements. We need target_lo. Need 1 from hi.
        #   After adding to hi: hi has target_hi + 1 elements. We need target_hi. Need to remove 1 from hi.
        #   So we need to move 1 from hi to lo. balance = +1. 
        #   With formula: +1 (removing from lo) + 1 (adding to hi) = +2. WRONG.
        #
        # Hmm, let me think about this differently. Let me define balance as:
        # balance = (target_lo - actual_effective_lo) 
        # So if lo is short, balance > 0 and we need to move from hi to lo.
        #
        # Removing from lo: actual_effective_lo decreases by 1, so balance increases by 1. ✓
        # Adding to lo: actual_effective_lo increases by 1, so balance decreases by 1. ✓
        # Removing from hi: actual_effective_hi decreases by 1. Since total should be k, and 
        #   total = actual_lo + actual_hi, if actual_hi decreases, actual_lo must increase...
        #   No wait, we're tracking physical heap sizes + delayed, not actual.
        #
        # OK I think the issue is that when we add to hi, it doesn't affect lo's effective size.
        # When we remove from hi, it doesn't affect lo's effective size either.
        # So balance should only be affected by operations that touch lo.
        #
        # Let me re-define:
        # balance = how many elements to move from hi to lo (if positive) or lo to hi (if negative)
        # to restore the invariant.
        #
        # The invariant: effective_len(lo) = target_lo, effective_len(hi) = target_hi.
        # 
        # Operation: remove outgoing.
        #   If outgoing was in lo: effective_len(lo) goes down by 1. Need to fix: move 1 hi->lo. balance += 1.
        #   If outgoing was in hi: effective_len(hi) goes down by 1. Need to fix: move 1 lo->hi. balance -= 1.
        #
        # Operation: add incoming.
        #   If goes to lo: effective_len(lo) goes up by 1. Too many in lo. balance -= 1.
        #   If goes to hi: effective_len(hi) goes up by 1. Too many in hi. balance += 1.
        #
        # Case: outgoing in lo, incoming to hi:
        #   balance = +1 + 1 = +2? 
        #   But we need: lo is short by 1 (from removal), and hi has 1 extra (from addition). 
        #   We need to move 1 from hi to lo. balance should be +1, not +2.
        #
        # Hmm wait. After removing from lo: lo_short by 1. After adding to hi: hi has extra 1.
        # To fix: move 1 from hi to lo. That fixes both problems. So balance = +1.
        # With my formula: +1 + 1 = +2. That's double-counting.
        #
        # I think the issue is: when outgoing was in hi, removing it means hi is short by 1.
        # When incoming goes to hi, hi goes up by 1. These cancel! Net effect on hi: 0.
        # And lo is unaffected. So balance should be 0.
        # With formula: -1 + 1 = 0. ✓!
        #
        # When outgoing in lo, incoming to lo:
        #   lo loses 1 then gains 1: net 0. balance = +1 - 1 = 0. ✓
        #
        # When outgoing in lo, incoming to hi:
        #   lo loses 1 (need +1 to fix), hi gains 1 (need +1 to fix). 
        #   Wait, but moving 1 from hi to lo fixes BOTH. So balance = +1.
        #   Formula: +1 + 1 = +2. WRONG.
        #
        # Hmm, I think my formula is wrong. Let me reconsider.
        # 
        # Actually I think the correct definition is:
        # balance only tracks the imbalance in lo.
        # If lo needs N more elements, balance = N (positive means move hi->lo).
        # If lo has N extra elements, balance = -N (negative means move lo->hi).
        #
        # Removing from lo: lo needs 1 more -> balance += 1
        # Adding to lo: lo has 1 extra -> balance -= 1
        # Removing from hi: doesn't affect lo -> balance unchanged
        # Adding to hi: doesn't affect lo -> balance unchanged
        #
        # Wait but that can't be right either. If I remove from hi and add to lo:
        #   lo gets 1 extra -> balance -= 1. We need to move 1 lo->hi. 
        #   But hi lost 1 and gained 1... no, hi lost 1 and lo gained 1.
        #   Total elements: -1 + 1 = 0 change. Good.
        #   lo has target_lo + 1 elements, hi has target_hi - 1 elements.
        #   We need to move 1 from lo to hi. balance = -1. ✓
        #
        # If I remove from lo and add to hi:
        #   lo has target_lo - 1, hi has target_hi + 1.
        #   Need to move 1 from hi to lo. balance = +1.
        #   Formula: +1 (removing from lo) + 0 (adding to hi doesn't affect lo) = +1. ✓!
        #
        # OK so the correct formula is:
        # balance += 1 if removing from lo
        # balance -= 1 if removing from hi
        # balance -= 1 if adding to lo
        # balance += 1 if adding to hi
        #
        # Wait, "removing from hi: balance -= 1"? Let me check:
        # Remove from hi: hi has target_hi - 1, lo has target_lo.
        # We need to move 1 from lo to hi. balance = -1.
        # Formula: -1 (removing from hi). ✓
        #
        # Add to hi: hi has target_hi + 1, lo has target_lo.
        # We need to move 1 from hi to lo. balance = +1.
        # Formula: +1 (adding to hi). ✓
        #
        # OK so my original formula was correct! Let me recheck the case that seemed wrong:
        # Remove from lo (+1) AND add to hi (+1): balance = +2.
        # After these ops: lo has target_lo - 1, hi has target_hi + 1.
        # We need to move 1 from hi to lo. That's balance = +1, not +2.
        #
        # Contradiction! Let me think again...
        #
        # Oh wait, I think the issue is that "adding to hi" when hi already has an extra (from the removal of lo's element going into the picture)... 
        # No, the operations are separate. Let me track step by step:
        #
        # Initial: len(lo) = target_lo, len(hi) = target_hi. balance = 0.
        # Step 1: Remove outgoing from lo (lazy). Now effective len(lo) = target_lo - 1.
        #   To fix: need 1 from hi to lo. balance = +1.
        # Step 2: Add incoming to hi. Now effective len(hi) = target_hi + 1.
        #   To fix: need to move 1 from hi to lo. This is the same fix! balance should still be +1.
        #   But my formula says balance += 1, making it +2. WRONG.
        #
        # So adding to hi should NOT change balance? Let me think...
        # If hi has target_hi + 1, that's bad. But we already needed to move 1 from hi to lo to fix lo.
        # Moving 1 from hi to lo fixes both problems. So the balance shouldn't increase.
        #
        # Hmm, I think the issue is that "adding to hi" in the context where we're ALSO removing from lo
        # creates a combined effect that my formula double-counts.
        #
        # Let me think about it as a net effect on the sizes:
        # Net change to len(lo): -1 (removal) + 0 (add to hi) = -1. Need +1 fix. balance = +1. ✓
        # Net change to len(hi): 0 (remove from lo) + 1 (add to hi) = +1. Need -1 fix (move to lo). 
        #   But this is the SAME fix as the lo problem. So it's already accounted for.
        #
        # I think the correct approach is to only track changes to ONE heap (say lo):
        # balance += 1 if outgoing was in lo (lo lost one)
        # balance -= 1 if incoming goes to lo (lo gained one)
        # And NOT track changes to hi, because the total is constant.
        #
        # Let me verify all cases:
        # Remove from lo, add to lo: +1 - 1 = 0. ✓ (no net change to lo)
        # Remove from lo, add to hi: +1 + 0 = +1. ✓ (lo lost 1, need to get 1 from hi)
        # Remove from hi, add to lo: 0 - 1 = -1. ✓ (lo gained 1, need to move to hi)
        # Remove from hi, add to hi: 0 + 0 = 0. ✓ (no net change to lo, and hi net 0)
        #
        # Yes! This is correct. We only track the net effect on lo.
        # balance = (number of elements removed from lo) - (number of elements added to lo)
        # If balance > 0: lo is short, move from hi to lo.
        # If balance < 0: lo has extra, move from lo to hi.

OK so the correct approach:
- balance += 1 if outgoing was in lo
- balance -= 1 if incoming goes to lo
- No adjustment for outgoing from hi or incoming to hi
- Rebalance: while balance > 0, move top of hi to lo; while balance < 0, move top of lo to hi.

But wait, there's a subtlety. How do we determine if outgoing was in lo or hi? We compare it to the top of lo. If outgoing <= -lo[0], it was in lo. Otherwise it was in hi. But with lazy deletion, the top might not be accurate yet...

Actually, this comparison works because:
- If outgoing <= -lo[0] (top of max-heap for lower half), then it must have been in the lower half (lo).
- If outgoing > -lo[0], then it must have been in the upper half (hi).

But we need to clean_top first before comparing! Otherwise lo[0] might be a lazily-deleted element.

Hmm, but that's a chicken-and-egg problem. Let me think...

Actually, I think we should clean tops BEFORE the comparison. But cleaning requires knowing the delayed set, which we're about to update...

Let me look at how the standard solution handles this. In the LeetCode 480 solution:

1. First, determine if num (outgoing) should be removed from lo or hi by comparing to lo[0].
2. Add to delayed.
3. Adjust balance.
4. Insert new element.
5. Rebalance.
6. Clean tops.

The key insight is that we compare BEFORE cleaning. But since we're comparing the actual value to lo[0], and lo[0] is the largest in the lower half (before any lazy cleanup), this should still work because:
- If outgoing was in lo, it's <= all elements that were in lo, and lo[0] is the max of lo. So outgoing <= lo[0]. ✓
- If outgoing was in hi, it's > all elements in lo, so outgoing > lo[0]. ✓

Wait, but what if lo[0] itself is a lazily-deleted element? Then comparing against it might give wrong results.

Actually, I think the standard approach works because we maintain the invariant that lo[0] is NOT lazily deleted (we clean before using it for median). And for the comparison with outgoing: if outgoing equals lo[0], it was in lo. If outgoing > lo[0], it was in hi. This is correct as long as lo[0] represents the actual boundary.

Hmm, but what if there are duplicates? If outgoing == lo[0], it could have been in either heap (if there are duplicates at the boundary). But since the invariant is all elements in lo <= all elements in hi, if outgoing == lo[0] and also == hi[0], it could be in either. In that case, either choice of balance adjustment would be compensated by the rebalancing step.

Actually, I think the standard approach just uses <= for determining lo membership, and it works because the rebalancing step will fix any incorrect assignment. Let me just implement it and trust the algorithm.

Let me write the final implementation:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")
    
    n = len(nums)
    lo = []  # max-heap (negated), lower half
    hi = []  # min-heap, upper half
    delayed = defaultdict(int)
    
    def clean_top(heap, is_max):
        while heap:
            top = -heap[0] if is_max else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break
    
    # Initialize with first k elements
    for i in range(k):
        num = nums[i]
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
        else:
            heapq.heappush(hi, num)
    
    # Balance initial (no lazy deletions yet, just fix sizes)
    target_lo = (k + 1) // 2
    while len(lo) > target_lo:
        val = -heapq.heappop(lo)
        heapq.heappush(hi, val)
    while len(hi) > k // 2:
        val = heapq.heappop(hi)
        heapq.heappush(lo, -val)
    
    def get_median():
        clean_top(lo, True)
        clean_top(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        else:
            return (-lo[0] + hi[0]) / 2.0
    
    result = [get_median()]
    
    for i in range(k, n):
        outgoing = nums[i - k]
        incoming = nums[i]
        
        # Determine which heap outgoing belongs to and adjust balance
        clean_top(lo, True)
        if outgoing <= -lo[0]:
            # outgoing was in lo
            balance = 1  # need to move 1 from hi to lo
        else:
            # outgoing was in hi
            balance = -1  # need to move 1 from lo to hi
        
        delayed[outgoing] += 1
        
        # Add incoming
        clean_top(lo, True)
        if incoming <= -lo[0]:
            heapq.heappush(lo, -incoming)
            balance -= 1
        else:
            heapq.heappush(hi, incoming)
            # No balance change
        
        # Rebalance
        while balance > 0:
            clean_top(hi, False)
            val = heapq.heappop(hi)
            heapq.heappush(lo, -val)
            balance -= 1
        while balance < 0:
            clean_top(lo, True)
            val = -heapq.heappop(lo)
            heapq.heappush(hi, val)
            balance += 1
        
        result.append(get_median())
    
    return result
```

Wait, I have a problem with the `clean_top` function parameter. Let me rename:
- For `lo` (max-heap, stored negated): `is_max=True` means we negate the top to get the actual value.
- For `hi` (min-heap): `is_max=False` means we use the top directly.

Let me fix the parameter naming:

```python
def clean_top(heap, negate):
    # negate=True: heap stores negated values (max-heap simulation)
    # negate=False: heap stores actual values (min-heap)
    while heap:
        top = -heap[0] if negate else heap[0]
        if delayed[top] > 0:
            delayed[top] -= 1
            heapq.heappop(heap)
        else:
            break
```

Let me also think about edge cases:
- k == 1: median is just the element itself.
- k == n: just one window.

Let me also think about whether the initial balancing could cause issues. Since there are no lazy deletions initially, the physical sizes equal effective sizes. We just need to make sure sizes are correct.

Actually, I realize there might be an issue with the initial balancing when we use `while len(lo) > target_lo`. This should work fine since there's no lazy deletion yet.

Let me also think about potential issues with floating point and the `delayed` dictionary. Since we're using float keys, there could be issues if two values that are very close but not exactly equal. But since we're using the exact values from the input as keys, this should be fine.

One more concern: the `clean_top` in the rebalancing step. When we move elements between heaps, we need to make sure we're moving actual (non-deleted) elements. The `clean_top` before popping handles this.

I think this implementation is correct. Let me also consider the time complexity: each element is inserted and removed from heaps O(1) times, and each lazy deletion is processed O(1) times. So overall O(n log k). For n=200,000 and k=1,000, that's about 200,000 * 10 = 2,000,000 operations, which should easily finish in under 2 seconds.

Let me finalize the code and make sure it's clean and correct.

Actually, I want to double-check one thing. In the rebalancing loop:
```
while balance > 0:
    clean_top(hi, False)
    val = heapq.heappop(hi)
    heapq.heappush(lo, -val)
    balance -= 1
```

After cleaning hi's top, we pop it. But what if hi is empty after cleaning? This shouldn't happen if our balance calculation is correct, because we're only asking to move elements that actually exist. But to be safe, we could add a check. Actually, if balance is computed correctly, hi should always have enough effective elements. I'll trust the algorithm.

Let me also make sure I handle the edge case where lo might be empty when we try to compare. In the main loop, after initialization, lo should never be empty (since target_lo >= 1 for k >= 1). But let me be safe.

Actually for k=1: target_lo = 1, target_hi = 0. After initialization, lo has 1 element, hi is empty. In the loop, outgoing was in lo (since hi is empty, anything <= lo[0]). Balance = 1. Then we add incoming to lo (since it's always <= lo[0]... wait, no. incoming could be > lo[0]).

Hmm, for k=1:
- lo has 1 element, hi is empty.
- outgoing = nums[i-1] is in lo (only element).
- balance = 1 (need to move from hi to lo, but hi is empty!).
- incoming: if incoming <= lo[0], goes to lo, balance = 0. If incoming > lo[0], goes to hi, balance stays 1.
  - If balance = 1 and hi is empty: rebalancing tries to pop from empty hi. Problem!

Wait, let me re-trace for k=1:
- After init: lo = [-nums[0]], hi = [].
- i=1: outgoing = nums[0], incoming = nums[1].
  - clean_top(lo): lo[0] = -nums[0], actual top = nums[0]. Not delayed. OK.
  - outgoing (nums[0]) <= nums[0]: True. So balance = 1.
  - delayed[nums[0]] = 1.
  - clean_top(lo): top = nums[0], delayed[nums[0]] = 1 > 0, so we pop it! Now lo is empty!
  - Then we try to compare incoming <= -lo[0]... lo is empty! Error!

So we need to handle this case. After marking outgoing as delayed, we should NOT clean_top before inserting incoming. Let me restructure:

The issue is that I'm calling `clean_top(lo, True)` before comparing with incoming. But at that point, lo's top might be the element we just marked as delayed.

The correct order should be:
1. Determine which heap outgoing was in (using current lo[0] before any cleanup).
2. Mark outgoing as delayed.
3. Insert incoming into appropriate heap (using current lo[0]).
4. Rebalance (which includes cleaning).
5. Get median (which includes cleaning).

So I should NOT call clean_top before the comparison. The comparison with lo[0] is valid because:
- Before this iteration, the invariant holds: all non-delayed elements in lo <= all non-delayed elements in hi.
- lo[0] is the max of the physical lo heap. It might be a delayed element, but...

Actually, this is the tricky part. If lo[0] is a delayed element, comparing against it might give wrong results.

Hmm, let me look at how the standard solution handles this. In the LeetCode 480 solutions I've seen:

```python
# Remove num (outgoing)
if num < -lo[0]:  # or <=
    lo.remove(num)  # conceptual, done via delayed
    balance = -1  # or some convention
else:
    hi.remove(num)
    balance = 1
delayed[num] += 1

# Add new element
if -lo[0] > num:  # incoming < -lo[0]
    heapq.heappush(lo, -num)
    balance += 1
else:
    heapq.heappush(hi, num)
    balance -= 1

# Rebalance...
```

I see, they compare without cleaning first. The argument is: since we maintain the invariant that lo[0] is never lazily deleted at the point of comparison (we clean it in the get_median step), this works.

Wait, but in my trace above, after marking outgoing as delayed, if we then compare incoming with lo[0] which IS the delayed outgoing... that's a problem.

Let me look at the order more carefully in standard solutions. I think the key is:

The comparison `outgoing <= lo[0]` happens BEFORE we add to delayed. At this point, lo[0] is clean (because we cleaned it in the previous get_median call). So the comparison is valid.

Then we add to delayed.

Then for the incoming insertion, we compare `incoming <= lo[0]`. But now lo[0] might be the just-delayed outgoing! 

Hmm, but actually, even if lo[0] is a delayed element, the comparison still works in a certain sense:
- If outgoing was in lo (which is what we determined), then lo[0] >= outgoing (since lo is a max-heap of the lower half).
- Any element that was in lo satisfies the property that it should go to lo (it's <= the "boundary").
- If incoming <= lo[0], and lo[0] was actually the outgoing that we just marked as delayed... then incoming <= outgoing. Since outgoing was in lo, and the boundary is roughly at lo[0], putting incoming in lo is still correct.
- If incoming > lo[0], then it should go to hi. This is also correct.

Actually, I think the issue is more subtle. Let me think about it with a concrete example:
- lo = [-5, -3, -1] (top is 5), hi = [6, 7, 8] (top is 6). k=6.
- outgoing = 5 (in lo). Mark delayed[5] = 1.
- Now lo's top is -5 which represents 5, which is delayed.
- incoming = 4. Compare: 4 <= 5 (lo[0] = -(-5) = 5)? Yes. So 4 goes to lo. This is correct! 4 should be in the lower half.
- incoming = 5.5. Compare: 5.5 <= 5? No. Goes to hi. Correct!
- incoming = 6. Compare: 6 <= 5? No. Goes to hi. Correct!

What about:
- lo = [-5, -3, -1] (top is 5), hi = [6, 7, 8] (top is 6). k=6.
- outgoing = 6 (in hi). balance = -1 (need to move from lo to hi).
- incoming = 5.5. Compare: 5.5 <= 5? No. Goes to hi. balance = -1 (unchanged).
- Rebalance: move 5 from lo to hi. Now lo = [-3, -1], hi = [5, 6, 7, 8]. But hi top is 5 which was moved.
- Wait, but the actual top of hi should be the minimum. After moving 5 to hi, hi = [5, 6, 7, 8]. Top is 5. That's correct.

OK so the comparison with lo[0] (even if it's a delayed element) seems to work for the purpose of deciding where to insert. The key insight is:
- lo[0] represents the "boundary" between lower and upper halves.
- Even if lo[0] is delayed, it still represents the correct boundary (since it was the largest element in the lower half before being removed).
- Elements <= this boundary belong in the lower half, elements > belong in the upper half.

Wait, that's not quite right either. If lo[0] is delayed and there's no other element at that value, then the true boundary is the next element in lo. But since we're just using it as a comparison threshold for insertion, and we'll rebalance afterwards, it should still work out.

Actually, I think there could be a subtle issue. Consider:
- lo = [-5, -3, -1], hi = [6, 7, 8]. k = 6.
- outgoing = 5 (in lo). delayed[5] += 1. balance = 1.
- incoming = 4. Compare 4 <= 5? Yes. Push to lo. lo = [-5, -4, -3, -1]. balance = 0.
- Rebalance: balance = 0, nothing to do.
- get_median: clean_top(lo): top is -5, delayed[5] = 1, pop it. Now lo = [-4, -3, -1]. Clean again: top is -4, not delayed. OK.
- clean_top(hi): top is 6, not delayed. OK.
- Median: (-(-4) + 6) / 2 = (4 + 6) / 2 = 5. 
- Actual window: [4, 6, 7, 8] plus whatever else is in lo. Wait, lo has [-4, -3, -1] = {4, 3, 1}, hi has {6, 7, 8}. Window is {1, 3, 4, 6, 7, 8}. Sorted: 1, 3, 4, 6, 7, 8. Median = (4+6)/2 = 5. ✓

OK, so the algorithm works even with delayed elements at the top, because we clean during get_median.

But there's one more concern: what if lo becomes completely empty after cleaning in get_median, and then on the next iteration we try to compare incoming with lo[0]?

Let me think... if k >= 2, then after initialization, lo has at least 1 element. In each iteration, we remove one and add one. The effective size of lo stays the same (or is rebalanced to the same). So physically, lo should never become empty (we always have at least the elements that haven't been popped yet).

Actually, with lazy deletion, lo might physically have elements that are all delayed. But we never pop them until we need to. And we always add new elements before cleaning. So lo should always have at least one physical element when we try to access lo[0] for comparison.

Hmm, but what if lo has exactly one element, which is delayed, and we haven't cleaned it yet? Then lo[0] is the delayed element. We compare incoming with it. This should still work as argued above. And then in get_median, we clean and find the next valid element (which might come from the rebalancing step that moved elements from hi to lo).

I think the algorithm is correct. Let me also handle the edge case k=1 more carefully:
- k=1: target_lo = 1, target_hi = 0.
- Init: push nums[0] to lo. lo = [-nums[0]], hi = [].
- get_median: clean lo (nothing delayed), return float(-lo[0]) = float(nums[0]). ✓
- i=1: outgoing = nums[0], incoming = nums[1].
  - Compare outgoing with lo[0]: nums[0] <= nums[0]? Yes. balance = 1.
  - delayed[nums[0]] = 1.
  - Compare incoming with lo[0] = -nums[0] (actual value nums[0]). 
    - If nums[1] <= nums[0]: push to lo. lo = [-nums[0], -nums[1]]. balance = 0.
    - If nums[1] > nums[0]: push to hi. hi = [nums[1]]. balance = 1.
  - If balance = 1: need to move from hi to lo. clean_top(hi): nums[1] not delayed. Pop nums[1], push to lo. balance = 0.
  - get_median: clean lo. top is -max(nums[0], nums[1]). If nums[0] is delayed (delayed[nums[0]] = 1), pop it. Now top is -nums[1]. Not delayed. Return float(nums[1]). ✓
  - If balance = 0 (nums[1] <= nums[0]): get_median: clean lo. top is -max(nums[0], nums[1]) = -nums[0]. delayed[nums[0]] = 1, pop. Now top is -nums[1]. Return float(nums[1]). ✓

Great, k=1 works.

Now let me also think about potential issues with float comparisons. Since we're using `<=` and `>` with floats, and the values come from the input directly (no computation), exact comparison should work fine (same float value). The `delayed` dict uses exact float keys, which matches the values we inserted.

One potential issue: if the input has NaN values. But I'll assume valid numeric input.

I'm fairly confident the solution is correct. Let me write the final version.

Actually, one more thought: I should be careful about the `clean_top` function modifying the `delayed` dict. When we pop a delayed element, we decrement `delayed[top]`. But what if `delayed[top]` is used for a different element with the same value? That's fine - the count correctly tracks how many copies are pending deletion.

Also, I should note that `defaultdict(int)` returns 0 for missing keys, which is what we want.

Let me write the final clean version:
