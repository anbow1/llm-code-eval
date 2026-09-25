```python
def parse_duration(s: str) -> int:
    text = s.strip()
    if not text:
        raise ValueError("invalid duration")

    units = {
        "d": (86400, 0),
        "h": (3600, 1),
        "m": (60, 2),
        "s": (1, 3),
    }

    total = 0
    last_rank = -1
    i = 0
    n = len(text)
    first_part = True

    while i < n:
        if not first_part:
            while i < n and text[i] == " ":
                i += 1
            if i >= n:
                break
        else:
            first_part = False

        start = i
        while i < n and "0" <= text[i] <= "9":
            i += 1

        if start == i:
            raise ValueError("invalid duration")
        if i >= n:
            raise ValueError("invalid duration")

        unit = text[i]
        info = units.get(unit)
        if info is None:
            raise ValueError("invalid duration")

        seconds, rank = info
        if rank <= last_rank:
            raise ValueError("invalid duration")

        i += 1

        number = 0
        for j in range(start, i - 1):
            number = number * 10 + (ord(text[j]) - 48)

        total += number * seconds
        last_rank = rank

    return total
```