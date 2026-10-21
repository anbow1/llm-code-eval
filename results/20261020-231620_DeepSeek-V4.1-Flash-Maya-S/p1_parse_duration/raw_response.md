```python
def parse_duration(s: str) -> int:
    if not isinstance(s, str):
        raise ValueError("duration must be a string")

    text = s.strip()
    if not text:
        raise ValueError("empty duration")

    seconds = {
        "d": 86400,
        "h": 3600,
        "m": 60,
        "s": 1,
    }
    order = {
        "d": 0,
        "h": 1,
        "m": 2,
        "s": 3,
    }

    total = 0
    last_rank = -1
    i = 0
    n = len(text)

    while i < n:
        number_start = i
        while i < n and "0" <= text[i] <= "9":
            i += 1

        if number_start == i:
            raise ValueError("missing number")

        number_text = text[number_start:i]

        if i >= n or text[i] not in seconds:
            raise ValueError("missing or invalid unit")

        unit = text[i]
        i += 1

        rank = order[unit]
        if rank <= last_rank:
            raise ValueError("units must appear in order d, h, m, s at most once")

        total += int(number_text) * seconds[unit]
        last_rank = rank

        if i < n and text[i] == " ":
            while i < n and text[i] == " ":
                i += 1
            if i >= n:
                raise ValueError("unexpected trailing spaces")

    return total
```