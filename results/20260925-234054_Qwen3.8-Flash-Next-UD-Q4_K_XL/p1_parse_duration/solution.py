def parse_duration(s: str) -> int:
    units = {
        "d": (0, 86400),
        "h": (1, 3600),
        "m": (2, 60),
        "s": (3, 1),
    }

    text = s.strip()
    if not text:
        raise ValueError("duration string is empty or blank")

    total = 0
    last_order = -1
    i = 0
    n = len(text)

    while i < n:
        if not ("0" <= text[i] <= "9"):
            raise ValueError("expected a number")

        number_start = i
        while i < n and ("0" <= text[i] <= "9"):
            i += 1

        if i >= n:
            raise ValueError("expected a unit")

        unit = text[i]
        if unit not in units:
            raise ValueError("unknown unit")

        order, seconds_per_unit = units[unit]
        if order <= last_order:
            raise ValueError("units must be in d, h, m, s order and used at most once")

        total += int(text[number_start:i]) * seconds_per_unit
        last_order = order
        i += 1

        while i < n and text[i] == " ":
            i += 1

    return total
