def normalize_sku(raw: str) -> str:
    """Canonical SKU: upper-case, with all whitespace (spaces, tabs, newlines) removed; dashes are kept.
    ' ab-12 x ' -> 'AB-12X'."""
    return "".join(raw.split()).upper()


def find_product(catalog: dict, raw_sku: str):
    """Look a product up by any spelling of its SKU; catalog keys are canonical SKUs. None if missing."""
    if not isinstance(raw_sku, str):
        return None
    return catalog.get(normalize_sku(raw_sku))
