def diff_lines(a: list[str], b: list[str]) -> list[tuple[str, str]]:
    N, M = len(a), len(b)

    if N == 0 and M == 0:
        return []
    if N == 0:
        return [("+", s) for s in b]
    if M == 0:
        return [("-", s) for s in a]

    # --- Myers' O((N+M)*D) edit distance ---
    def myers_distance() -> int:
        if a == b:
            return 0
        max_d = N + M
        offset = max_d
        V = [0] * (2 * max_d + 1)
        V[offset] = 0
        i, j = 0, 0
        while i < N and j < M and a[i] == b[j]:
            i += 1
            j += 1
        V[offset] = i
        if i >= N and j >= M:
            return 0
        for d in range(1, max_d + 1):
            for k in range(-d, d + 1, 2):
                idx = offset + k
                if k == -d:
                    V[idx] = V[offset + k + 1]
                elif k == d:
                    V[idx] = V[offset + k - 1] + 1
                else:
                    from_del = V[offset + k - 1] + 1
                    from_ins = V[offset + k + 1]
                    V[idx] = from_del if from_del >= from_ins else from_ins
                iv = V[idx]
                jv = iv - k
                while iv < N and jv < M and a[iv] == b[jv]:
                    iv += 1
                    jv += 1
                V[idx] = iv
            if d >= abs(N - M) and V[offset + (N - M)] >= N:
                return d
        return max_d

    D = myers_distance()
    if D == 0:
        return [("=", s) for s in a]

    # --- Forward Myers on subproblem a[i0:i1] vs b[j0:j1], d edits ---
    def forward(d: int, i0: int, j0: int, i1: int, j1: int) -> tuple[list[int], int]:
        k_start = i0 - j0
        off = d - k_start
        size = 2 * d + 1
        V = [0] * size
        V[off + k_start] = i0
        iv, jv = i0, j0
        while iv < i1 and jv < j1 and a[iv] == b[jv]:
            iv += 1
            jv += 1
        V[off + k_start] = iv
        for dc in range(1, d + 1):
            k_lo = k_start - dc
            k_hi = k_start + dc
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_lo:
                    V[idx] = V[off + k + 1]
                elif k == k_hi:
                    V[idx] = V[off + k - 1] + 1
                else:
                    from_del = V[off + k - 1] + 1
                    from_ins = V[off + k + 1]
                    V[idx] = from_del if from_del >= from_ins else from_ins
                iv = V[idx]
                jv = iv - k
                while iv < i1 and jv < j1 and a[iv] == b[jv]:
                    iv += 1
                    jv += 1
                V[idx] = iv
        return V, off

    # --- Backward Myers on subproblem a[i0:i1] vs b[j0:j1], d edits ---
    def backward(d: int, i0: int, j0: int, i1: int, j1: int) -> tuple[list[int], int]:
        k_start = i1 - j1
        off = d - k_start
        size = 2 * d + 1
        V = [0] * size
        V[off + k_start] = i1
        iv, jv = i1, j1
        while iv > i0 and jv > j0 and a[iv - 1] == b[jv - 1]:
            iv -= 1
            jv -= 1
        V[off + k_start] = iv
        for dc in range(1, d + 1):
            k_lo = k_start - dc
            k_hi = k_start + dc
            for k in range(k_lo, k_hi + 1, 2):
                idx = off + k
                if k == k_hi:
                    V[idx] = V[off + k - 1]
                elif k == k_lo:
                    V[idx] = V[off + k + 1] - 1
                else:
                    from_bdel = V[off + k + 1] - 1
                    from_bins = V[off + k - 1]
                    V[idx] = from_bdel if from_bdel <= from_bins else from_bins
                iv = V[idx]
                jv = iv - k
                while iv > i0 and jv > j0 and a[iv - 1] == b[jv - 1]:
                    iv -= 1
                    jv -= 1
                V[idx] = iv
        return V, off

    # --- Divide-and-conquer edit script ---
    def find_script(i0: int, j0: int, i1: int, j1: int, d: int) -> list[tuple[str, str]]:
        if d == 0:
            return [("=", a[i]) for i in range(i0, i1)]
        if i1 == i0:
            return [("+", b[j]) for j in range(j0, j1)]
        if j1 == j0:
            return [("-", a[i]) for i in range(i0, i1)]

        if d == 1:
            snake: list[tuple[str, str]] = []
            is_, js_ = i0, j0
            while is_ < i1 and js_ < j1 and a[is_] == b[js_]:
                snake.append(("=", a[is_]))
                is_ += 1
                js_ += 1
            if is_ == i1:
                snake += [("+", b[j]) for j in range(js_, j1)]
                return snake
            if js_ == j1:
                snake += [("-", a[i]) for i in range(is_, i1)]
                return snake
            # a[is_] != b[js_], exactly one edit needed
            if a[is_ + 1: i1] == b[js_: j1]:
                snake.append(("-", a[is_]))
                snake += [("=", a[i]) for i in range(is_ + 1, i1)]
            else:
                snake.append(("+", b[js_]))
                snake += [("=", a[i]) for i in range(is_, i1)]
            return snake

        # d >= 2
        df = d // 2
        db = d - df

        Vf, off_f = forward(df, i0, j0, i1, j1)
        Vb, off_b = backward(db, i0, j0, i1, j1)

        ksf = i0 - j0
        ksb = i1 - j1
        k_min = max(ksf - df, ksb - db)
        k_max = min(ksf + df, ksb + db)
        parity = (ksf + df) % 2
        if k_min % 2 != parity:
            k_min += 1

        i_mid = j_mid = None
        for k in range(k_min, k_max + 1, 2):
            idx_f = off_f + k
            idx_b = off_b + k
            if 0 <= idx_f < 2 * df + 1 and 0 <= idx_b < 2 * db + 1:
                if Vf[idx_f] >= Vb[idx_b]:
                    i_mid = Vf[idx_f]
                    j_mid = i_mid - k
                    break

        if i_mid is None:
            i_mid = i0
            j_mid = j0

        left = find_script(i0, j0, i_mid, j_mid, df)
        right = find_script(i_mid, j_mid, i1, j1, db)
        return left + right

    return find_script(0, 0, N, M, D)
