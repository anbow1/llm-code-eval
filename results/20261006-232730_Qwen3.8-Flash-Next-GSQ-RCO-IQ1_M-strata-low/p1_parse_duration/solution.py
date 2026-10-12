def parse_duration(s: str) -> int:
    text = s.strip()
    if not text:
        raise ValueError("Empty duration string")

    unit_order = {'d': 0, 'h': 1, 'm': 2, 's': 3}
    unit_seconds = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}

    total = 0
    prev_unit = -1
    i = 0
    n = len(text)

    while i < n:
        if text[i] == ' ':
            i += 1
            continue

        if text[i] < '0' or text[i] > '9':
            raise ValueError("Invalid duration string")

        value = 0
        while i < n and '0' <= text[i] <= '9':
            value = value * 10 + (ord(text[i]) - ord('0'))
            i += 1

        if i >= n:
            raise ValueError("Invalid duration string")

        unit = text[i]
        if unit not in unit_order:
            raise ValueError("Invalid unit in duration string")

        idx = unit_order[unit]
        if idx <= prev_unit:
            raise ValueError("Invalid unit order or repeated unit")

        total += value * unit_seconds[unit]
        prev_unit = idx
        i += 1

    return total
