def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines, etc.) removed; dashes are kept.
    ' ab-12\tx ' -> 'AB-12X'."""
    return "".join(raw.split()).upper()
