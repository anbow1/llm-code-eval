import re


def parse_duration(s: str) -> int:
    s = s.strip()
    if not s:
        raise ValueError("Empty or blank string")

    unit_values = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    units_order = ['d', 'h', 'm', 's']

    tokens = re.findall(r'\d+[dhms]', s)

    # Ensure the string is composed only of tokens and spaces
    remainder = re.sub(r'\d+[dhms]', '', s)
    if re.search(r'[^ ]', remainder):
        raise ValueError("Invalid characters or separator in string")

    seen = set()
    last_idx = -1
    total = 0

    for token in tokens:
        unit = token[-1]
        num = int(token[:-1])

        if unit in seen:
            raise ValueError(f"Repeated unit: {unit}")

        curr_idx = units_order.index(unit)
        if curr_idx <= last_idx:
            raise ValueError("Units appear in wrong order")

        seen.add(unit)
        last_idx = curr_idx
        total += num * unit_values[unit]

    return total
