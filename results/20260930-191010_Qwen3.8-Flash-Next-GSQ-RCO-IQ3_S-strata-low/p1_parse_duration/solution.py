def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    for ch in s:
        if not ch.isdigit() and ch not in 'dhms' and ch != ' ':
            raise ValueError(f"invalid character: {ch!r}")

    s = s.replace(' ', '')
    if not s:
        raise ValueError("empty or blank string")

    order_map = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    total = 0
    i = 0
    prev_order = -1

    while i < len(s):
        if not s[i].isdigit():
            raise ValueError("missing number before unit")

        num_str = ''
        while i < len(s) and s[i].isdigit():
            num_str += s[i]
            i += 1

        if i >= len(s):
            raise ValueError("number without unit")

        unit = s[i]
        i += 1

        if unit not in order_map:
            raise ValueError(f"unknown unit: {unit!r}")

        if order_map[unit] <= prev_order:
            raise ValueError("wrong order or repeated unit")
        prev_order = order_map[unit]

        total += int(num_str) * unit_seconds[unit]

    return total
