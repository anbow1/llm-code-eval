```python
def to_pln(amount, currency):
    """Convert amount to PLN. Raises ValueError for an unknown currency."""
    rates = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
    if currency not in rates:
        raise ValueError("unknown currency: %r" % (currency,))
    return amount * rates[currency]


def parse_line(raw):
    """Parse one CSV-like line 'order_id;customer;amount;currency;status'.

    Returns (order_id, customer, amount_pln, status) for a valid line,
    None for a blank or comment line, raises ValueError for an invalid line.
    """
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("expected 5 fields")
    order_id, customer, amount, currency, status = parts
    if not order_id or not customer:
        raise ValueError("missing order_id or customer")
    try:
        value = float(amount.replace(",", "."))
    except ValueError:
        raise ValueError("bad amount: %r" % (amount,))
    if value < 0:
        raise ValueError("negative amount")
    amount_pln = to_pln(value, currency)
    if status not in ("paid", "refunded"):
        raise ValueError("bad status: %r" % (status,))
    return order_id, customer, amount_pln, status


def summarize(records):
    """Build the totals dict from (customer, signed_amount_pln) pairs."""
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
    rejected = []
    records = []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _, customer, amount_pln, status = parsed
        sign = 1 if status == "paid" else -1
        records.append((customer, sign * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```