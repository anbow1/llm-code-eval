from bisect import bisect_left, insort_left
from heapq import heappush, heappop


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    odd = k & 1
    half = k // 2

    # For the common benchmark case (small k), a sorted list is fastest.
    if k <= 1024:
        window = nums[:k]
        window.sort()

        res = [0.0] * (n - k + 1)
        if odd:
            res[0] = float(window[half])
        else:
            res[0] = (window[half - 1] + window[half]) * 0.5

        out_idx = 1
        for i in range(k, n):
            old = nums[i - k]
            del window[bisect_left(window, old)]
            insort_left(window, nums[i])

            if odd:
                res[out_idx] = float(window[half])
            else:
                res[out_idx] = (window[half - 1] + window[half]) * 0.5
            out_idx += 1

        return res

    # General efficient path: two lazy heaps.
    target = (k + 1) // 2

    first = nums[:k]
    first.sort()

    lo = [-first[i] for i in range(target - 1, -1, -1)]  # max-heap via negatives
    hi = first[target:]                                   # min-heap
    del first

    sl = target
    sh = k - target

    delayed_lo = {}
    delayed_hi = {}
    get_lo = delayed_lo.get
    get_hi = delayed_hi.get

    push = heappush
    pop = heappop

    res = [0.0] * (n - k + 1)

    if odd:
        res[0] = float(-lo[0])
    else:
        res[0] = (-lo[0] + hi[0]) * 0.5

    out_idx = 1
    arr = nums

    for i in range(k, n):
        top = -lo[0]

        new = arr[i]
        if new <= top:
            push(lo, -new)
            sl += 1
        else:
            push(hi, new)
            sh += 1

        old = arr[i - k]
        if old <= top:
            sl -= 1
            delayed_lo[old] = get_lo(old, 0) + 1
        else:
            sh -= 1
            delayed_hi[old] = get_hi(old, 0) + 1

        if sl > target:
            while lo:
                val = -lo[0]
                cnt = get_lo(val)
                if cnt:
                    pop(lo)
                    if cnt == 1:
                        del delayed_lo[val]
                    else:
                        delayed_lo[val] = cnt - 1
                else:
                    break

            val = -pop(lo)
            sl -= 1
            push(hi, val)
            sh += 1

        elif sl < target:
            while hi:
                val = hi[0]
                cnt = get_hi(val)
                if cnt:
                    pop(hi)
                    if cnt == 1:
                        del delayed_hi[val]
                    else:
                        delayed_hi[val] = cnt - 1
                else:
                    break

            val = pop(hi)
            sh -= 1
            push(lo, -val)
            sl += 1

        while lo:
            val = -lo[0]
            cnt = get_lo(val)
            if cnt:
                pop(lo)
                if cnt == 1:
                    del delayed_lo[val]
                else:
                    delayed_lo[val] = cnt - 1
            else:
                break

        while hi:
            val = hi[0]
            cnt = get_hi(val)
            if cnt:
                pop(hi)
                if cnt == 1:
                    del delayed_hi[val]
                else:
                    delayed_hi[val] = cnt - 1
            else:
                break

        if odd:
            res[out_idx] = float(-lo[0])
        else:
            res[out_idx] = (-lo[0] + hi[0]) * 0.5

        out_idx += 1

    return res
