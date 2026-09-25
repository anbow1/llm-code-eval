from heapq import heapify, heappush, heappop


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    if k == 1:
        return [float(x) for x in nums]

    if k == n:
        arr = sorted(nums)
        mid = k // 2
        if k & 1:
            return [float(arr[mid])]
        return [(float(arr[mid - 1]) + float(arr[mid])) * 0.5]

    target_low = (k + 1) // 2

    arr = sorted(nums[:k])
    low = [-x for x in arr[:target_low]]   # max-heap via negated values
    high = arr[target_low:]                # min-heap

    heapify(low)
    heapify(high)

    low_size = target_low
    remove_low = {}
    remove_high = {}

    res = [0.0] * (n - k + 1)
    odd = k & 1

    if odd:
        res[0] = float(-low[0])
    else:
        res[0] = (float(-low[0]) + float(high[0])) * 0.5

    hp = heappush
    hpop = heappop

    def clean_low(_low=low, _rem=remove_low, _pop=hpop):
        while _low:
            v = -_low[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_low)
            else:
                break

    def clean_high(_high=high, _rem=remove_high, _pop=hpop):
        while _high:
            v = _high[0]
            c = _rem.get(v)
            if c:
                if c == 1:
                    del _rem[v]
                else:
                    _rem[v] = c - 1
                _pop(_high)
            else:
                break

    for i in range(k, n):
        out = nums[i - k]

        clean_low()
        clean_high()

        if low:
            low_max = -low[0]
            if out <= low_max:
                remove_low[out] = remove_low.get(out, 0) + 1
                low_size -= 1
            else:
                remove_high[out] = remove_high.get(out, 0) + 1
        else:
            remove_high[out] = remove_high.get(out, 0) + 1

        clean_low()
        clean_high()

        x = nums[i]
        if low and x <= -low[0]:
            hp(low, -x)
            low_size += 1
        else:
            hp(high, x)

        while low_size > target_low:
            clean_low()
            v = -hpop(low)
            hp(high, v)
            low_size -= 1

        while low_size < target_low:
            clean_high()
            v = hpop(high)
            hp(low, -v)
            low_size += 1

        clean_low()
        clean_high()

        idx = i - k
        if odd:
            res[idx] = float(-low[0])
        else:
            res[idx] = (float(-low[0]) + float(high[0])) * 0.5

    return res
