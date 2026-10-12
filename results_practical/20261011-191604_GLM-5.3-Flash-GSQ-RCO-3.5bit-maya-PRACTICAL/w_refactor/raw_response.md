```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}


def parse_line(raw):
    """Parse one raw line into (order_id, customer, amount_pln, status).

    Returns None for blank or comment lines; raises ValueError for an
    invalid line (wrong field count, bad/negative amount, empty
    order_id/customer, or unknown currency).
    """
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("expected 5 fields")
    order_id, customer, amount, currency, status = parts
    try:
        value = float(amount.replace(",", "."))
    except ValueError:
        raise ValueError("invalid amount")
    if value < 0 or not customer or not order_id:
        raise ValueError("invalid order")
    return (order_id, customer, to_pln(value, currency), status)


def to_pln(amount, currency):
    """Convert an amount to PLN; raise ValueError for unknown currencies."""
    if currency not in RATES:
        raise ValueError("unknown currency: %s" % currency)
    return amount * RATES[currency]


def summarize(records):
    """Build the summary dict from (customer, signed_amount_pln) pairs."""
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}}


def process_orders(lines):
    """lines: CSV-like strings 'order_id;customer;amount;currency;status'.

    Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}.
    Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.
    Only status 'paid' counts; 'refunded' subtracts the amount; anything else is rejected.
    Blank lines and lines starting with '#' are skipped (not rejected). Line numbers start at 1.
    """
    signs = {"paid": 1, "refunded": -1}
    records, rejected = [], []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
            if parsed is None:
                continue
        except ValueError:
            rejected.append(n)
            continue
        _, customer, amount_pln, status = parsed
        if status in signs:
            records.append((customer, signs[status] * amount_pln))
        else:
            rejected.append(n)
    result = summarize(records)
    result["rejected"] = rejected
    return result
```