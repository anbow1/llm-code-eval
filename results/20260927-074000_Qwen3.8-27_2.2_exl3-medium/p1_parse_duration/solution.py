import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("empty or blank string")

    # Remove all space characters (the only valid separator)
    compact = s.replace(" ", "")

    # Extract all <digits><unit> tokens
    matches = re.findall(r"(\d+)([dhms])", compact)

    # Ensure the entire compact string is fully accounted for
    reconstructed = "".join(f"{n}{u}" for n, u in matches)
    if reconstructed != compact:
        raise ValueError(f"invalid duration string: {s}")

    # Validate unit ordering (d < h < m < s) and no repeats
    total = 0
    prev_index = -1
    unit_order = {"d": 0, "h": 1, "m": 2, "s": 3}
    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}

    for num, unit in matches:
        idx = unit_order[unit]
        if idx <= prev_index:
            raise ValueError(f"wrong order or repeated unit: {unit}")
        prev_index = idx
        total += int(num) * unit_seconds[unit]

    return total
