import heapq
from collections import defaultdict


def sliding_median(nums: list[float], k: int) -> list[float]:
    if k < 1 or k > len(nums):
        raise ValueError("k must be between 1 and len(nums)")

    n = len(nums)
    # lo: max-heap (stored negated) for the lower half
    # hi: min-heap for the upper half
    lo: list[float] = []
    hi: list[float] = []
    delayed: dict[float, int] = defaultdict(int)

    def clean_top(heap: list[float], negate: bool) -> None:
        """Remove lazily-deleted elements from the top of a heap."""
        while heap:
            top = -heap[0] if negate else heap[0]
            if delayed[top] > 0:
                delayed[top] -= 1
                heapq.heappop(heap)
            else:
                break

    # --- Initialize with first k elements ---
    for i in range(k):
        num = nums[i]
        if not lo or num <= -lo[0]:
            heapq.heappush(lo, -num)
        else:
            heapq.heappush(hi, num)

    # Balance sizes: len(lo) = (k+1)//2, len(hi) = k//2
    target_lo = (k + 1) // 2
    while len(lo) > target_lo:
        val = -heapq.heappop(lo)
        heapq.heappush(hi, val)
    while len(hi) > k // 2:
        val = heapq.heappop(hi)
        heapq.heappush(lo, -val)

    def get_median() -> float:
        clean_top(lo, True)
        clean_top(hi, False)
        if k % 2 == 1:
            return float(-lo[0])
        return (-lo[0] + hi[0]) / 2.0

    result: list[float] = [get_median()]

    # --- Slide the window ---
    for i in range(k, n):
        outgoing = nums[i - k]
        incoming = nums[i]

        # Determine which logical heap the outgoing element belonged to,
        # and set balance: positive means "need to move elements from hi to lo".
        if outgoing <= -lo[0]:
            balance = 1  # lo lost an effective element, compensate
        else:
            balance = -1  # hi lost an effective element

        delayed[outgoing] += 1

        # Insert incoming into the appropriate heap
        if incoming <= -lo[0]:
            heapq.heappush(lo, -incoming)
            balance -= 1  # lo gained an element, reduce needed compensation
        else:
            heapq.heappush(hi, incoming)

        # Rebalance: move elements to restore correct effective sizes
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
