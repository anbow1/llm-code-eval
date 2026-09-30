import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    # low: max-heap using (-value, index)
    # high: min-heap using (value, index)
    low = []
    high = []

    # side[index]:
    # 0 = removed / not active
    # 1 = active in low
    # 2 = active in high
    side = bytearray(n)

    low_count = 0
    high_count = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_low() -> None:
        while low and side[low[0][1]] == 0:
            heappop(low)

    def prune_high() -> None:
        while high and side[high[0][1]] == 0:
            heappop(high)

    def add(idx: int, value: float) -> None:
        nonlocal low_count, high_count

        if low_count == 0:
            if high_count == 0:
                heappush(low, (-value, idx))
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, (value, idx))
                side[idx] = 2
                high_count += 1
        else:
            prune_low()
            if value <= -low[0][0]:
                heappush(low, (-value, idx))
                side[idx] = 1
                low_count += 1
            else:
                heappush(high, (value, idx))
                side[idx] = 2
                high_count += 1

        while low_count > high_count + 1:
            prune_low()
            neg_val, moved = heappop(low)
            side[moved] = 2
            heappush(high, (-neg_val, moved))
            low_count -= 1
            high_count += 1

        while high_count > low_count:
            prune_high()
            val, moved = heappop(high)
            side[moved] = 1
            heappush(low, (-val, moved))
            high_count -= 1
            low_count += 1

    def remove(idx: int) -> None:
        nonlocal low_count, high_count

        s = side[idx]
        if s == 1:
            low_count -= 1
        elif s == 2:
            high_count -= 1

        side[idx] = 0

    def median() -> float:
        if k & 1:
            prune_low()
            return float(-low[0][0])

        prune_low()
        prune_high()

        left = -low[0][0]
        right = high[0][0]
        return left / 2.0 + right / 2.0

    result: list[float] = []

    for i in range(k):
        add(i, nums[i])

    result.append(median())

    for i in range(n - k):
        remove(i)
        add(i + k, nums[i + k])
        result.append(median())

    return result
