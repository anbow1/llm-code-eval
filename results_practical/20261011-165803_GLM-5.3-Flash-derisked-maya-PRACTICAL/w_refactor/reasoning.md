I need to refactor into helpers: parse_line(raw) -> (order_id, customer, amount_pln, status) | None | raises ValueError. to_pln(amount, currency) raises ValueError for unknown currency. summarize(records) builds dict from (customer, signed_amount_pln) pairs.

But process_orders must keep same behavior including tracking rejected line numbers. So the main loop: strip, skip blank/comment via parse_line returning None; catch ValueError to reject. Note: original rejects lines with wrong field count, bad float, negative, empty customer/order_id, unknown currency, bad status — all must raise ValueError from parse_line. Currency conversion happens in to_pln which raises ValueError for unknown currency — parse_line must call to_pln so unknown currency raises.

parse_line(raw): raw already stripped? The main function strips. parse_line receives raw — should handle stripping inside? Main function can strip or parse_line strips. To keep parse_line useful, let it strip. If blank/comment -> None. Split, validate.

parse_line returns amount already converted to PLN? "returns a tuple (order_id, customer, amount_pln, status)". Yes, amount_pln — so parse_line calls to_pln.

summarize(records): pairs of (customer, signed_amount_pln) — build total and by_customer, return the result dict. But rejected is separate. summarize returns {"total_pln": ..., "by_customer": ...}. Then process_orders adds rejected.

Main function:

```python
def process_orders(lines):
    rejected = []
    records = []
    for n, raw in enumerate(lines, 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        order_id, customer, amount_pln, status = parsed
        sign = 1 if status == "paid" else -1
        records.append((customer, sign * amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```

Wait — parse_line returns valid status only ("paid"/"refunded")? It raises ValueError otherwise. But blank/comment returns None — main checks before calling or after? Blank/comment check inside parse_line returns None; main can check stripped line before, or call parse_line and check None. Simpler: strip in main, check blank/comment, then call parse_line. But parse_line should still handle per spec — it can strip too; harmless.

Actually to keep main short: strip inside parse_line, return None for blank/comment, main handles None case.

Status sign: parse_line guarantees status is paid or refunded, so sign computed in main. Alternatively parse_line could return signed amount, but spec says returns amount_pln and status. So sign in main.

Edge: status check must happen after currency check in original order? Original order: field count, float, negative/customer/order_id, currency, status. If a line has unknown currency AND bad status, original rejects due to currency — parse_line: all validations raise ValueError anyway, and rejection is same either way (line number appended once). Order doesn't matter for outcome. But ValueError message — not tested presumably.

However: careful — negative check: original checks value < 0 before currency conversion. Same result.

parse_line:

```python
def parse_line(raw):
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
        raise ValueError("bad amount")
    if value < 0:
        raise ValueError("negative amount")
    amount_pln = to_pln(value, currency)
    if status not in ("paid", "refunded"):
        raise ValueError("bad status")
    return order_id, customer, amount_pln, status
```

to_pln:

```python
def to_pln(amount, currency):
    rates = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}
    if currency not in rates:
        raise ValueError(f"unknown currency: {currency}")
    return amount * rates[currency]
```

Note: original multiplies EUR by 4.27 and USD by 3.94, PLN as is (pass). amount * 1.0 is fine.

summarize:

```python
def summarize(records):
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}}
```

process_orders line count: ~14 lines. Count lines of body: rejected=[], records=[], for loop line, try, except, if None, append record — let's count:

```
def process_orders(lines):
    """docstring"""
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

Body lines excluding def and docstring: 14. OK, ≤15.

One subtlety: original strips raw before checking. parse_line strips too, fine.