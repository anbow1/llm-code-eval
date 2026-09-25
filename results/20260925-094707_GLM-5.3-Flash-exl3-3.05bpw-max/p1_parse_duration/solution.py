def parse_duration(s: str) -> int:
    """Convert a duration string to a total number of seconds.

    Grammar (after any leading/trailing whitespace is removed):

        duration := part (spaces part)*
        part     := number unit
        number   := one or more decimal digits
        unit     := 'd' | 'h' | 'm' | 's'
        spaces   := '' (parts written together) or one or more spaces

    * No space may appear inside a part (between the number and its unit).
    * Units are lowercase, each may be used at most once, and they must
      occur in the fixed order d, h, m, s (any subset is allowed).
    * No normalisation is performed ("90m" is accepted and equals 5400).
    * Anything else (empty/blank string, unknown or uppercase unit, wrong
      order, repeated unit, missing number, number without unit, decimals,
      signs, other separators, ...) raises ValueError.
    """
    if not isinstance(s, str):
        raise ValueError(f"duration must be a string, got {type(s).__name__}")

    text = s.strip()
    if not text:
        raise ValueError("duration string is empty or blank")

    unit_seconds = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    unit_rank = {"d": 0, "h": 1, "m": 2, "s": 3}

    total = 0
    highest_rank = -1  # rank of the most recent unit; -1 means none seen yet
    i = 0
    n = len(text)

    while i < n:
        part_start = i

        # A part begins with one or more ASCII decimal digits.
        while i < n and "0" <= text[i] <= "9":
            i += 1
        if i == part_start:
            raise ValueError(
                f"expected a number at position {part_start}, "
                f"found {text[part_start]!r}"
            )
        digits = text[part_start:i]

        # The unit letter must immediately follow the digits (no space).
        if i == n:
            raise ValueError(f"missing unit after number {digits!r}")
        unit = text[i]
        if unit not in unit_seconds:
            raise ValueError(f"invalid unit {unit!r} after number {digits!r}")

        rank = unit_rank[unit]
        if rank <= highest_rank:
            raise ValueError(f"unit {unit!r} is out of order or repeated")
        highest_rank = rank

        # Convert manually so arbitrarily long digit strings cannot hit
        # Python's int-string conversion limit.
        value = 0
        for ch in digits:
            value = value * 10 + (ord(ch) - 48)

        total += value * unit_seconds[unit]
        i += 1  # move past the unit character

        # A separator of zero or more spaces may precede the next part.
        while i < n and text[i] == " ":
            i += 1

    return total
