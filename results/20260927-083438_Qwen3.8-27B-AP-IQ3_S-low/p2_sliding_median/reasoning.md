The problem asks for a sliding window median. Let me think about the efficiency constraints:
- n = 200,000, k = 1,000
- Need to finish in well under 2 seconds

The naive approach (sorting each window) would be O(n * k * log(k)) = 200,000 * 1,000 * log(1,000) ≈ 2 * 10^9 operations. That's too slow.

A better approach is to use two heaps (max-heap for the lower half, min-heap for the upper half) to maintain the median in O(log k) per insertion/deletion, giving O(n log k) total.

With two heaps:
- Maintain a max-heap (lower half) and a min-heap (upper half)
- The max-heap stores the lower half, the min-heap stores the upper half
- We need to handle deletions (elements leaving the window) using lazy deletion

Let me think about the two-heap approach:

1. `lower` = max-heap (store negatives for Python's heapq) - contains the smaller half
2. `upper` = min-heap - contains the larger half
3. We maintain invariant: len(lower) == len(upper) or len(lower) == len(upper) + 1 (for odd k)
   Actually for the median calculation:
   - If k is odd: median is the max of lower (top of max-heap)
   - If k is even: median is (max of lower + min of upper) / 2

Wait, let me reconsider the invariants. We want:
- All elements in lower <= all elements in upper
- |len(lower) - len(upper)| <= 1
- For odd k: len(lower) = len(upper) + 1, median = lower[0]
- For even k: len(lower) = len(upper), median = (lower[0] + upper[0]) / 2

Actually, let me be more careful. With k elements total:
- If k is odd: lower has (k+1)//2 elements, upper has k//2 elements. Median = max(lower)
- If k is even: lower has k//2 elements, upper has k//2 elements. Median = (max(lower) + min(upper)) / 2

For deletion, I'll use lazy deletion with a `delayed` counter (dict mapping value to count of pending deletions).

Algorithm:
1. Initialize with first k elements
2. For each subsequent window:
   a. Remove the element that leaves (nums[i-k])
   b. Add the new element (nums[i])
   c. Rebalance
   d. Compute median

Let me implement this carefully:

```python
import heapq
from collections import defaultdict

def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")
    
    # lower: max-heap (negated values), upper: min-heap
    lower = []  # max-heap (store negatives)
    upper = []  # min-heap
    delayed = defaultdict(int)  # lazy deletion
    lower_size = 0  # actual size of lower (including delayed)
    upper_size = 0  # actual size of upper (including delayed)
    
    def sift_lower():
        while lower and delayed[-lower[0]] > 0:
            delayed[-lower[0]] -= 1
            heapq.heappop(lower)
            lower_size -= 1
    
    def sift_upper():
        while upper and delayed[upper[0]] > 0:
            delayed[upper[0]] -= 1
            heapq.heappop(upper)
            upper_size -= 1
    
    def balance():
        # Maintain: lower_size == upper_size (even k) or lower_size == upper_size + 1 (odd k)
        # Actually, let's maintain: lower_size >= upper_size and lower_size - upper_size <= 1
        while lower_size > upper_size + 1:
            val = -heapq.heappop(lower)
            lower_size -= 1
            heapq.heappush(upper, val)
            upper_size += 1
        while upper_size > lower_size:
            val = heapq.heappop(upper)
            upper_size -= 1
            heapq.heappush(lower, -val)
            lower_size += 1
    
    def add(x):
        if lower and x <= -lower[0]:
            heapq.heappush(lower, -x)
            lower_size += 1
        else:
            heapq.heappush(upper, x)
            upper_size += 1
        balance()
    
    def remove(x):
        if lower and x <= -lower[0]:
            lower_size -= 1
            delayed[x] += 1
            sift_lower()
        else:
            upper_size -= 1
            delayed[x] += 1
            sift_upper()
        balance()
    
    def get_median():
        if k % 2 == 1:
            return float(-lower[0])
        else:
            return (-lower[0] + upper[0]) / 2.0
    
    # Initialize
    for i in range(k):
        add(nums[i])
    
    result = [get_median()]
    
    for i in range(k, n):
        remove(nums[i - k])
        add(nums[i])
        result.append(get_median())
    
    return result
```

Wait, let me verify the sizes. After adding k elements:
- For odd k (e.g., k=3): lower_size should be 2, upper_size should be 1. balance() ensures lower_size > upper_size by at most 1, and lower_size >= upper_size.
- For even k (e.g., k=4): lower_size should be 2, upper_size should be 2.

The balance function:
- While lower_size > upper_size + 1: move from lower to upper
- While upper_size > lower_size: move from upper to lower

This gives us: lower_size is either equal to upper_size or upper_size + 1. That's correct.

For odd k: total = k (odd), so lower_size = upper_size + 1, meaning lower_size = (k+1)/2, upper_size = (k-1)/2. Median = max(lower) = -lower[0]. Correct.

For even k: total = k (even), so lower_size = upper_size = k/2. Median = (max(lower) + min(upper)) / 2. Correct.

Let me trace through a small example:
nums = [1, 3, 5, 2, 4], k = 3

Window [1, 3, 5]:
- add(1): lower=[-1], lower_size=1, upper_size=0. balance: 1 > 0+1? No. 0 > 1? No. OK.
- add(3): 3 > -(-1)=1, so upper=[3], upper_size=1. balance: 1 > 1+1? No. 1 > 1? No. OK.
- add(5): 5 > 1, so upper=[3,5], upper_size=2. balance: 1 > 2+1? No. 2 > 1? Yes. Move 3 to lower. lower=[-3,-1], lower_size=2, upper=[5], upper_size=1. balance again: 2 > 1+1? No. 1 > 2? No. OK.
- get_median: k=3 odd, return -lower[0] = 3. Correct (median of [1,3,5] is 3).

Window [3, 5, 2]:
- remove(1): 1 <= -lower[0]=3, so lower_size=1, delayed[1]=1. sift_lower: top is -3, 3 is not in delayed. OK. balance: 1 > 1+1? No. 1 > 2? No. OK.
- add(2): 2 <= -lower[0]=3, so push to lower. lower=[-3,-1,-2] (heap), lower_size=2. Wait, lower was [-3,-1] after sift (actually sift didn't pop anything since 3 wasn't delayed). lower_size was 1, now 2. balance: 2 > 1+1? No. 1 > 2? No. OK.
- get_median: k=3 odd, return -lower[0] = 3. Median of [3,5,2] sorted is [2,3,5], median=3. Correct!

Window [5, 2, 4]:
- remove(3): 3 <= -lower[0]=3, so lower_size=1, delayed[3]=1. sift_lower: top is -3, delayed[3]=1, so pop it. lower_size=0. Now lower=[-1,-2] (heap: [-2,-1]). sift_lower: top is -2, 2 not in delayed. OK. balance: 0 > 1+1? No. 1 > 0? Yes. Move from upper to lower. upper was [5], pop 5, upper_size=0. Push -5 to lower. lower=[-5,-1,-2], lower_size=1. balance: 1 > 0+1? No. 0 > 1? No. OK.
- add(4): 4 > -lower[0]=5? No, 4 <= 5. Push to lower. lower=[-5,-1,-2,-4], lower_size=2. balance: 2 > 0+1? Yes. Pop -5, lower_size=1. Push 5 to upper, upper=[5], upper_size=1. balance: 1 > 1+1? No. 1 > 1? No. OK.
- get_median: k=3 odd, return -lower[0]. lower is now a max-heap with [-5, -1, -4]... wait let me re-check.

Actually wait. After remove(3):
- lower was [-3, -1, -2] (heap representation where the max is at index 0, so -3 means 3 is the max)
- Wait, I'm confusing myself. Let me re-think.

In Python, heapq is a min-heap. So if I store -x, the smallest -x corresponds to the largest x. So -lower[0] gives the max of the lower half.

After initialization with [1, 3, 5]:
- lower stores negative values: after adding 1, 3, 5 and balancing:
  - lower = [-3, -1] (meaning values 3 and 1, max is 3)
  - upper = [5]
  - lower_size = 2, upper_size = 1

Remove 1:
- 1 <= -lower[0] = 3? Yes. lower_size becomes 1. delayed[1] = 1.
- sift_lower: top of lower is -3, value 3. delayed[3] = 0. Stop.
- balance: lower_size=1, upper_size=1. 1 > 1+1? No. 1 > 1? No. OK.

Add 2:
- 2 <= -lower[0] = 3? Yes. Push -2 to lower. lower = [-3, -1, -2] (heap: min is -3, so max value is 3). lower_size = 2.
- balance: 2 > 1+1? No. 1 > 2? No. OK.
- get_median: -lower[0] = 3. Correct!

Remove 3:
- 3 <= -lower[0] = 3? Yes. lower_size becomes 1. delayed[3] = 1.
- sift_lower: top is -3, value 3. delayed[3] = 1. Pop it. lower_size = 0. Now lower = [-2, -1] (heap: min is -2, so max value is 2). Check top: -2, value 2. delayed[2] = 0. Stop.
- balance: lower_size=0, upper_size=1. 0 > 1+1? No. 1 > 0? Yes. Pop from upper: 5. upper_size=0. Push -5 to lower. lower = [-5, -1, -2] wait...

Actually let me be more careful. lower was [-2, -1] after popping -3. Then we push -5. The heap becomes [-5, -1, -2]. lower_size = 1. upper_size = 0.
- balance: 1 > 0+1? No. 0 > 1? No. OK.

Add 4:
- 4 <= -lower[0] = 5? Yes. Push -4 to lower. lower = [-5, -1, -2, -4]. lower_size = 2.
- balance: 2 > 0+1? Yes. Pop -5 (value 5). lower_size = 1. Push 5 to upper. upper = [5]. upper_size = 1.
- balance: 1 > 1+1? No. 1 > 1? No. OK.
- get_median: -lower[0]. lower is now [-4, -1, -2] (after popping -5). -lower[0] = 4.
- Median of [5, 2, 4] sorted = [2, 4, 5], median = 4. Correct!

Great, the algorithm works.

Now let me think about the time complexity. Each add and remove is O(log k) amortized (the sift operations are amortized O(1) since each element is only sifted once). So total is O(n log k) which for n=200,000 and k=1,000 is about 200,000 * 10 = 2,000,000 operations. That should be well under 2 seconds.

Let me also make sure the edge cases are handled:
- k = 1: median is just the element itself
- k = n: only one window

Let me finalize the code.
