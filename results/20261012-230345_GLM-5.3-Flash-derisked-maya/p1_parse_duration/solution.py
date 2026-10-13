import re


def parse_duration(s: str) -> int:
    if not s or not s.strip():
        raise ValueError("empty or blank duration string")

    unit_index = {"d": 0, "h": 1, "m": 2, "s": 3}
    unit_seconds = (86400, 3600, 60, 1)

    total = 0
    prev_index = -1

    for token in s.split():
        parts = re.findall(r"(\d+)([dhms])", token)
        # Reconstruct the token to reject decimals, signs, unknown units,
        # missing numbers, numbers without units, and stray characters.
        if "".join(number + unit for number, unit in parts) != token:
            raise ValueError(f"invalid duration part: {token!r}")

        for number, unit in parts:
            index = unit_index[unit]
            # Enforce order d < h < m < s and each unit at most once.
            if index <= prev_index:
                raise ValueError(f"units out of order or repeated: {token!r}")
            prev_index = index
            total += int(number) * unit_seconds[index]

    return total
