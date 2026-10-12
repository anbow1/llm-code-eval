```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}


def to_pln(amount, currency):
    """Convert an amount in the given currency to PLN.

    Raises ValueError for an unknown currency.
    """
    try:
        rate = RATES[currency]
    except KeyError:
        raise ValueError("unknown currency: %s" % currency)
    return amount * rate


def parse_line(raw):
    """Parse one raw line.

    Returns (order_id, customer, amount_pln, status) for a valid line,
    None for a blank or comment line, and raises ValueError for an
    invalid line (wrong field count, bad amount, negative amount,
    empty order_id/customer, or unknown currency).
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
        raise ValueError("invalid order data")
    return order_id, customer, to_pln(value, currency), status


def summarize(records):
    """Build the result dict from (customer, signed_amount_pln) pairs."""
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
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _order_id, customer, amount_pln, status = parsed
        if status == "paid":
            sign = 1
        elif status == "refunded":
            sign = -1
        else:
            rejected.append(n)
            continue
        records.append((customer, sign * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```