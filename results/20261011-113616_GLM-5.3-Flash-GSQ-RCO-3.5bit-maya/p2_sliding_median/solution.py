import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    """Return the median of every contiguous window of size k.

    For even k, the median is the mean of the two middle values.
    Raises ValueError if k < 1 or k > len(nums).

    Uses a dual-heap (max-heap for the lower half, min-heap for the upper
    half) with lazy deletion, giving O(n log k) time overall.
    """
    n = len(nums)
    if not 1 <= k <= n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    heappush = heapq.heappush
    heappop = heapq.heappop

    small = []  # max-heap (values negated): lower half of window
    large = []  # min-heap: upper half of window
    delayed = {}  # pending deletions: value -> count
    small_size = 0  # logical (non-deleted) sizes
    large_size = 0
    result = []
    append = result.append

    def prune(heap: list, is_small: bool) -> None:
        """Pop delayed (stale) elements off the top of the heap."""
        nonlocal small_size, large_size
        while heap:
            top = heap[0]
            if is_small:
                top = -top
            cnt = delayed.get(top, 0)
            if cnt:
                if cnt == 1:
                    del delayed[top]
                else:
                    delayed[top] = cnt - 1
                heappop(heap)
                if is_small:
                    small_size -= 1
                else:
                    large_size -= 1
            else:
                break

    def balance() -> None:
        """Rebalance so small_size == large_size or small_size == large_size + 1."""
        nonlocal small_size, large_size
        if small_size > large_size + 1:
            heappush(large, -heappop(small))
            small_size -= 1
            large_size += 1
            prune(small, True)
        elif small_size < large_size:
            heappush(small, -heappop(large))
            large_size -= 1
            small_size += 1
            prune(large, False)

    def insert(num: float) -> None:
        nonlocal small_size, large_size
        if not small or num <= -small[0]:
            heappush(small, -num)
            small_size += 1
        else:
            heappush(large, num)
            large_size += 1
        balance()

    def erase(num: float) -> None:
        """Lazily delete num from the heaps."""
        nonlocal small_size, large_size
        delayed[num] = delayed.get(num, 0) + 1
        if num <= -small[0]:
            small_size -= 1
            if num == -small[0]:
                prune(small, True)
        else:
            large_size -= 1
            if num == large[0]:
                prune(large, False)
        balance()

    def median() -> float:
        if k & 1:
            return float(-small[0])
        return (-small[0] + large[0]) / 2.0

    # Build the first window.
    for i in range(k):
        insert(nums[i])
    append(median())

    # Slide the window.
    for i in range(k, n):
        erase(nums[i - k])
        insert(nums[i])
        append(median())

    return result
