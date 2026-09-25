```python
def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    values = sorted(set(nums))
    m = len(values)

    rank = {v: i + 1 for i, v in enumerate(values)}
    ids = [rank[x] for x in nums]

    bit = [0] * (m + 1)

    for i in range(k):
        bit[ids[i]] += 1

    for i in range(1, m + 1):
        j = i + (i & -i)
        if j <= m:
            bit[j] += bit[i]

    top_step = 1 << (m.bit_length() - 1)

    def kth(target, bit=bit, m=m, values=values, top_step=top_step):
        idx = 0
        step = top_step
        while step:
            nxt = idx + step
            if nxt <= m and bit[nxt] < target:
                idx = nxt
                target -= bit[nxt]
            step >>= 1
        return values[idx]

    result = []
    append = result.append

    bit_ = bit
    ids_ = ids
    m_ = m
    kth_ = kth
    float_ = float

    slides = n - k
    remove_pos = 0
    add_pos = k

    if k & 1:
        target = (k + 1) >> 1
        append(float_(kth_(target)))

        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i

            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i

            remove_pos += 1
            add_pos += 1
            append(float_(kth_(target)))
    else:
        target1 = k >> 1
        target2 = target1 + 1
        append(float_((kth_(target1) + kth_(target2)) * 0.5))

        for _ in range(slides):
            i = ids_[remove_pos]
            while i <= m_:
                bit_[i] -= 1
                i += i & -i

            i = ids_[add_pos]
            while i <= m_:
                bit_[i] += 1
                i += i & -i

            remove_pos += 1
            add_pos += 1
            append(float_((kth_(target1) + kth_(target2)) * 0.5))

    return result
```