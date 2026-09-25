```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be >= 1 and <= len(nums)")

    # Coordinate compression
    sorted_unique = sorted(set(nums))
    m = len(sorted_unique)
    val_to_idx = {v: i + 1 for i, v in enumerate(sorted_unique)}  # 1-based for BIT

    # Fenwick Tree (Binary Indexed Tree)
    tree = [0] * (m + 1)

    def bit_update(i: int, delta: int) -> None:
        while i <= m:
            tree[i] += delta
            i += i & (-i)

    def bit_kth(k_val: int) -> int:
        """Find smallest index i (1-based) such that prefix_sum(i) >= k_val."""
        pos = 0
        bit = 1 << (m.bit_length() - 1)
        while bit:
            nxt = pos + bit
            if nxt <= m and tree[nxt] < k_val:
                pos = nxt
                k_val -= tree[nxt]
            bit >>= 1
        return pos + 1

    # Initialize with first window
    for i in range(k):
        bit_update(val_to_idx[nums[i]], 1)

    result: list[float] = []
    half = k // 2

    for start in range(n - k + 1):
        if k % 2 == 1:
            idx = bit_kth(half + 1)
            result.append(float(sorted_unique[idx - 1]))
        else:
            idx1 = bit_kth(half)
            idx2 = bit_kth(half + 1)
            result.append((sorted_unique[idx1 - 1] + sorted_unique[idx2 - 1]) / 2.0)

        # Slide the window
        if start + k < n:
            bit_update(val_to_idx[nums[start]], -1)
            bit_update(val_to_idx[nums[start + k]], 1)

    return result
```