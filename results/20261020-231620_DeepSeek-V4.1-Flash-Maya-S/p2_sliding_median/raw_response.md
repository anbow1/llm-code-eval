```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    values = sorted(set(nums))
    m = len(values)
    rank = {v: i + 1 for i, v in enumerate(values)}
    ranks = [rank[x] for x in nums]

    tree = [0] * (m + 1)
    highest = 1 << (m.bit_length() - 1)

    def add(i: int, delta: int) -> None:
        while i <= m:
            tree[i] += delta
            i += i & -i

    def kth(order: int) -> float:
        idx = 0
        bit = highest
        while bit:
            nxt = idx + bit
            if nxt <= m and tree[nxt] < order:
                idx = nxt
                order -= tree[nxt]
            bit >>= 1
        return values[idx]

    for i in range(k - 1):
        add(ranks[i], 1)

    result: list[float] = []
    half = k // 2

    if k & 1:
        for right in range(k - 1, n):
            add(ranks[right], 1)
            result.append(float(kth(half + 1)))
            add(ranks[right - k + 1], -1)
    else:
        for right in range(k - 1, n):
            add(ranks[right], 1)
            left_mid = kth(half)
            right_mid = kth(half + 1)
            result.append((left_mid + right_mid) / 2.0)
            add(ranks[right - k + 1], -1)

    return result
```