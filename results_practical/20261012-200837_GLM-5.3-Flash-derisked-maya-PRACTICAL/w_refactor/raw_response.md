```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}


def to_pln(amount, currency):
    """Convert an amount to PLN; raise ValueError for an unknown currency."""
    if currency not in RATES:
        raise ValueError("unknown currency: {!r}".format(currency))
    return amount * RATES[currency]


def parse_line(raw):
    """Parse one raw line.

    Returns (order_id, customer, amount_pln, status) for a valid line,
    None for a blank or comment line, and raises ValueError for an
    invalid line.
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
        raise ValueError("bad amount: {!r}".format(amount)) from None
    if value < 0 or not customer or not order_id:
        raise ValueError("invalid order data")
    value = to_pln(value, currency)
    return order_id, customer, value, status


def summarize(records, rejected=()):
    """Build the result dict from (customer, signed_amount_pln) pairs."""
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": list(rejected)}


def process_orders(lines):
    """lines: CSV-like strings 'order_id;customer;amount;currency;status'.

    Returns a dict: {"total_pln": float, "by_customer": {name: float}, "rejected": [line numbers]}.
    Amounts in EUR are converted at 4.27, USD at 3.94, PLN as is; other currencies are rejected.
    Only status 'paid' counts; 'refunded' subtracts the amount; anything else is rejected.
    Blank lines and lines starting with '#' are skipped (not rejected). Line numbers start at 1.
    """
    records, rejected = [], []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _order_id, customer, amount, status = parsed
        if status not in ("paid", "refunded"):
            rejected.append(n)
        else:
            records.append((customer, amount if status == "paid" else -amount))
    return summarize(records, rejected)
```