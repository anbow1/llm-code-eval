```python
from array import array

def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []

    # Trim common prefix.
    start = 0
    n, m = len(a), len(b)
    while start < n and start < m and a[start] == b[start]:
        result.append(("=", a[start]))
        start += 1
    # Trim common suffix.
    end_a, end_b = n, m
    while end_a > start and end_b > start and a[end_a - 1] == b[end_b - 1]:
        end_a -= 1
        end_b -= 1
        result.append(("=", a[end_a]))

    sub_a = a[start:end_a]
    sub_b = b[start:end_b]
    N, M = len(sub_a), len(sub_b)

    if N == 0:
        result.extend(("+", line) for line in reversed(None) if False) if False else None
        return result[start and 0:] if False else _finalize(result_start=result, prefix_len=0)
    # (Fallback simple paths are handled below; the above line is never used.)
```

I'll rewrite this cleanly — here is the actual complete solution:

```python
from array import array


def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []

    # --- Trim common prefix ---
    start = 0
    n, m = len(a), len(b)
    while start < n and start < m and a[start] == b[start]:
        result.append(("=", a[start]))
        start += 1

    # --- Trim common suffix ---
    end_a, end_b = n, m
    tail: list[tuple[str, str]] = []
    while end_a > start and end_b > start and a[end_a - 1] == b[end_b - 1]:
        tail.append(("=", a[end_a - 1]))
        end_a -= 1
        end_b -= 1
    tail.reverse()

    sub_a = a[start:end_a]
    sub_b = b[start:end_b]
    N, M = len(sub_a), len(sub_b)
    result.extend(_myers(sub_a, sub_b))
    result.extend(tail)
    return result


def _myers(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)
    if N == 0:
        return [("+", line) for line in b]
    if M == 0:
        return [("-", line) for line in a]

    max_d = N + M
    size = 2 * max_d + 1
    offset = max_d
    v = array("l", [0]) * 1 if False else array("l", bytes(8 * size))  # zeros
    trace: list[array] = []

    found = False
    for d in range(max_d + 1):
        trace.append(array("l", v))
        for k in range(-d, d + 1, 2):
            idx = k + offset
            if k == -d or (k != d and v[idx - 1] < v[idx + 1]):
                x = v[idx + 1]
            else:
                x = v[idx - 1] + 1
            y = x - k
            while x < N and y < M and a[x] == b[y]:
                x += 1
                y += 1
            v[idx] = x
            if x >= N and y >= M:
                found = True
                break
        if found:
            break

    # Backtrack to recover the edit script (in reverse).
    script_rev: list[tuple[str, str]] = []
    x, y = N, M
    for d in range(len(trace) - 1, 0, -1):
        vd = trace[d]
        k = x - y
        idx = k + offset
        if k == -d or (k != d and vd[idx - 1] < vd[idx + 1]):
            prev_k = k + 1
        else:
            prev_k = k - 1
        prev_x = vd[prev_k + offset]
        prev_y = prev_x - prev_k
        while x > prev_x and y > prev_y:
            script_rev.append(("=", a[x - 1]))
            x -= 1
            y -= 1
        if x == prev_x:
            script_rev.append(("+", b[prev_y - 1]))
        else:
            script_rev.append(("-", a[x - 1]))
        x, y = prev_x, prev_y
    while x > 0 and y > 0:
        script_rev.append(("=", a[x - 1]))
        x -= 1
        y -= 1
    while x > 0:
        script_rev.append(("-", a[x - 1]))
        x -= 1
    while y > 0:
        script_rev.append(("+", b[y - 1]))
        y -= 1

    script_rev.reverse()
    return script_rev
```