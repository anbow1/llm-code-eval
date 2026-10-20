```python
def parse_duration(s: str) -> int:
    text = s.strip()
    if not text:
        raise ValueError("empty duration")

    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    unit_order = {"d": 0, "h": 1, "m": 2, "s": 3}

    i = 0
    n = len(text)
    total = 0
    last_order = -1

    while i < n:
        if not ("0" <= text[i] <= "9"):
            raise ValueError("expected a number")

        number = 0
        while i < n and "0" <= text[i] <= "9":
            number = number * 10 + (ord(text[i]) - ord("0"))
            i += 1

        if i >= n:
            raise ValueError("missing unit")

        unit = text[i]
        if unit not in unit_seconds:
            raise ValueError("unknown unit")

        order = unit_order[unit]
        if order <= last_order:
            raise ValueError("units must appear once in d, h, m, s order")
        last_order = order

        total += number * unit_seconds[unit]
        i += 1

        if i < n and text[i] == " ":
            while i < n and text[i] == " ":
                i += 1
            if i >= n:
                break

    return total
```