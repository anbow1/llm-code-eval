import heapq


def sliding_median(nums: list[float], k: int) -> list[float]:
    n = len(nums)
    if k < 1 or k > n:
        raise ValueError("k must be between 1 and len(nums)")

    max_lower = []  # max-heap stored as a min-heap of negatives
    min_upper = []  # min-heap

    lower_size = 0
    upper_size = 0

    lower_delayed = {}
    upper_delayed = {}
    ld_get = lower_delayed.get
    ud_get = upper_delayed.get

    hp_push = heapq.heappush
    hp_pop = heapq.heappop
    hp_heapify = heapq.heapify

    rebuild_threshold = max(4 * k, 64)

    def clean_lower(max_lower=max_lower, lower_delayed=lower_delayed, ld_get=ld_get, hp_pop=hp_pop):
        while max_lower:
            v = -max_lower[0]
            c = ld_get(v, 0)
            if c:
                hp_pop(max_lower)
                lower_delayed[v] = c - 1
            else:
                break

    def clean_upper(min_upper=min_upper, upper_delayed=upper_delayed, ud_get=ud_get, hp_pop=hp_pop):
        while min_upper:
            v = min_upper[0]
            c = ud_get(v, 0)
            if c:
                hp_pop(min_upper)
                upper_delayed[v] = c - 1
            else:
                break

    out = [0.0] * (n - k + 1)
    out_idx = 0

    for i, x in enumerate(nums):
        # Add x to the appropriate heap.
        if lower_size:
            clean_lower()
            if x <= -max_lower[0]:
                hp_push(max_lower, -x)
                lower_size += 1
            else:
                hp_push(min_upper, x)
                upper_size += 1
        else:
            hp_push(max_lower, -x)
            lower_size += 1

        # Rebalance after insertion.
        if lower_size < upper_size:
            clean_upper()
            v = hp_pop(min_upper)
            upper_size -= 1
            hp_push(max_lower, -v)
            lower_size += 1
        elif lower_size > upper_size + 1:
            clean_lower()
            v = -hp_pop(max_lower)
            lower_size -= 1
            hp_push(min_upper, v)
            upper_size += 1

        # Remove the element leaving the window.
        if i >= k:
            y = nums[i - k]
            if lower_size:
                clean_lower()
                if y <= -max_lower[0]:
                    lower_size -= 1
                    lower_delayed[y] = ld_get(y, 0) + 1
                else:
                    upper_size -= 1
                    upper_delayed[y] = ud_get(y, 0) + 1
            else:
                upper_size -= 1
                upper_delayed[y] = ud_get(y, 0) + 1

            # If too many stale entries have accumulated, rebuild cleanly.
            if len(max_lower) + len(min_upper) > rebuild_threshold:
                window = nums[i - k + 1:i + 1]
                window.sort()
                lower_len = (k + 1) // 2

                max_lower[:] = [-v for v in window[:lower_len]]
                hp_heapify(max_lower)

                min_upper[:] = window[lower_len:]
                hp_heapify(min_upper)

                lower_delayed.clear()
                upper_delayed.clear()

                lower_size = lower_len
                upper_size = k - lower_len
            else:
                # Rebalance after deletion.
                if lower_size < upper_size:
                    clean_upper()
                    v = hp_pop(min_upper)
                    upper_size -= 1
                    hp_push(max_lower, -v)
                    lower_size += 1
                elif lower_size > upper_size + 1:
                    clean_lower()
                    v = -hp_pop(max_lower)
                    lower_size -= 1
                    hp_push(min_upper, v)
                    upper_size += 1

        # Emit median for the current window.
        if i >= k - 1:
            clean_lower()
            if lower_size == upper_size:
                clean_upper()
                out[out_idx] = (-max_lower[0] + min_upper[0]) / 2.0
            else:
                out[out_idx] = float(-max_lower[0])
            out_idx += 1

    return out
