import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must satisfy 1 <= k <= len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    if k == 2:
        return [(float(nums[i]) + float(nums[i + 1])) / 2.0 for i in range(n - 1)]

    if k == n:
        arr = sorted(nums)
        mid = k // 2
        if k & 1:
            return [float(arr[mid])]
        return [(float(arr[mid - 1]) + float(arr[mid])) / 2.0]

    lower: list[float] = []  # max-heap via negative values, lower half
    upper: list[float] = []  # min-heap, upper half
    delayed: dict[float, int] = {}

    lower_size = 0
    upper_size = 0

    heappush = heapq.heappush
    heappop = heapq.heappop

    def prune_lower() -> None:
        while lower:
            x = -lower[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(lower)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def prune_upper() -> None:
        while upper:
            x = upper[0]
            cnt = delayed.get(x)
            if cnt is None:
                break
            heappop(upper)
            if cnt == 1:
                del delayed[x]
            else:
                delayed[x] = cnt - 1

    def balance() -> None:
        nonlocal lower_size, upper_size

        while lower_size > upper_size + 1:
            moved = -heappop(lower)
            lower_size -= 1
            heappush(upper, moved)
            upper_size += 1
            prune_lower()

        while lower_size < upper_size:
            moved = heappop(upper)
            upper_size -= 1
            heappush(lower, -moved)
            lower_size += 1
            prune_upper()

    def add(num: float) -> None:
        nonlocal lower_size, upper_size

        if not lower or num <= -lower[0]:
            heappush(lower, -num)
            lower_size += 1
        else:
            heappush(upper, num)
            upper_size += 1

        balance()

    def remove(num: float) -> None:
        nonlocal lower_size, upper_size

        delayed[num] = delayed.get(num, 0) + 1

        max_lower = -lower[0]
        if num <= max_lower:
            lower_size -= 1
        else:
            upper_size -= 1

        if num == max_lower:
            prune_lower()
        elif upper and num == upper[0]:
            prune_upper()

        balance()

    for i in range(k):
        add(nums[i])

    result: list[float] = []
    append = result.append
    odd = k & 1

    for i in range(k - 1, n - 1):
        if odd:
            append(float(-lower[0]))
        else:
            append((-lower[0] + upper[0]) / 2.0)

        remove(nums[i - k + 1])
        add(nums[i + 1])

    if odd:
        append(float(-lower[0]))
    else:
        append((-lower[0] + upper[0]) / 2.0)

    return result
