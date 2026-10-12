Implement helpers. parse_line returns (order_id, customer, amount_pln, status) for valid, None for blank/comment, raises ValueError for invalid. to_pln raises ValueError. summarize builds dict from (customer, signed) pairs — but also needs total. "builds the result dict from a list of (customer, signed_amount_pln) pairs" — result dict includes total, by_customer, rejected. So summarize(records, rejected?) — spec says from a list of pairs. But result includes rejected. Probably summarize(records, rejected). Let's do summarize(records, rejected=()). Keep signature as specified: summarize(records) — maybe records includes rejected? Better: make summarize(records, rejected). The instruction is slightly ambiguous; I'll add rejected parameter with default. But "uses the helpers" — process_orders at most 15 lines.

Write:

```python
def process_orders(lines):
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        parsed = parse_line(raw)
        if parsed is None:
            continue
        order_id, customer, amount, status = parsed
        try:
            value = to_pln(amount, ...)
        except ValueError:
            rejected.append(n)
            continue
```

Wait, currency must be passed too. parse_line returns (order_id, customer, amount_pln, status) — but amount_pln is converted to PLN already? Then currency handling is inside parse_line? But to_pln is a separate helper raising ValueError for unknown currency. Then parse_line likely returns amount in original currency? Spec: parse_line returns (order_id, customer, amount_pln, status). Hmm, "amount_pln" implies converted. But then to_pln's ValueError for unknown currency would be raised... inside parse_line? That contradicts.

Alternative: parse_line returns (order_id, customer, amount, status) and process_orders calls to_pln(amount, currency)? But parse_line's tuple has 4 elements with amount_pln... Perhaps parse_line returns (order_id, customer, amount, currency, status)? No — spec says 4-tuple.

Option: parse_line returns (order_id, customer, amount, status) where amount is raw float, and... but currency then lost. Hmm.

Maybe parse_line returns amount_pln converted, and inside parse_line it calls to_pln, so unknown currency raises ValueError from parse_line. That satisfies "raises ValueError for an invalid line" — unknown currency is invalid. Then process_orders catches ValueError for rejection. That's consistent! parse_line validates: split, 5 parts, float parse, non-negative, customer/order_id non-empty, currency conversion via to_pln, status in paid/refunded... but status must map to sign. Spec: parse_line returns (order_id, customer, amount_pln, status). So sign determined in process_orders. Then process_orders:

```python
def process_orders(lines):
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
        order_id, customer, amount, status = parsed
        sign = 1 if status == "paid" else -1
        records.append((customer, sign * amount))
        ...
```

Wait but status validity: if parse_line doesn't validate status, invalid status would... "paid" -> sign 1, "refunded" -> -1, else rejected. But then parse_line must not reject invalid status, yet it returns status. So process_orders checks status:

```python
        if status == "paid":
            signed = amount
        elif status == "refunded":
            signed = -amount
        else:
            rejected.append(n)
            continue
        records.append((customer, signed))
    return summarize(records, rejected)
```

summarize(records, rejected): builds result dict. Spec says summarize(records) — I'll make rejected a second parameter. Or maybe make summarize(records) and rejected appended? Could do summarize(records) computing total and by_customer, then merge rejected. But rejected must be in result. I'll add optional param rejected=(). That's fine.

Count process_orders lines: needs ≤15 lines. Count:

```
def process_orders(lines):
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
        _order, customer, amount, status = parsed
        if status == "paid":
            signed = amount
        elif status == "refunded":
            signed = -amount
        else:
            rejected.append(n)
            continue
        records.append((customer, signed))
    return summarize(records, rejected)
```

That's 19 lines including def and blank lines. "at most 15 lines" — probably counting statement lines. Let me compress:

```python
def process_orders(lines):
    records, rejected = [], []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _, customer, amount, status = parsed
        signed = amount if status == "paid" else -amount
        if status in ("paid", "refunded"):
            records.append((customer, signed))
        else:
            rejected.append(n)
    return summarize(records, rejected)
```

Count lines: 1 def + 15 lines = fits within 15 body lines? Body: records line, for, try, parsed, except, append, continue, if parsed, continue, _, signed, if status, append, else, append, return = 16 body lines. Hmm. Compress more:

```python
def process_orders(lines):
    records, rejected = [], []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        _, customer, amount, status = parsed
        if status not in ("paid", "refunded"):
            rejected.append(n)
        else:
            records.append((customer, amount if status == "paid" else -amount))
    return summarize(records, rejected)
```

Body lines: 15? Count: 1 records, 2 for, 3 try, 4 parsed, 5 except, 6 rejected.append, 7 continue, 8 if parsed, 9 continue, 10 _, 11 if status not, 12 rejected.append, 13 else, 14 records.append, 15 return. 15 lines. 

parse_line:

```python
def parse_line(raw):
    line = raw.strip()
    if not line or line.startswith("#"):
        return None
    parts = [p.strip() for p in line.split(";")]
    if len(parts) != 5:
        raise ValueError("wrong field count")
    order_id, customer, amount, currency, status = parts
    try:
        value = float(amount.replace(",", "."))
    except ValueError:
        raise ValueError("bad amount") from None
    if value < 0 or not customer or not order_id:
        raise ValueError("bad order")
    value = to_pln(value, currency)
    return order_id, customer, value, status
```

to_pln:

```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}

def to_pln(amount, currency):
    if currency not in RATES:
        raise ValueError("unknown currency")
    return amount * RATES[currency]
```

Note: original code for PLN: value unchanged (pass). amount * 1.0 fine.

summarize:

```python
def summarize(records, rejected=()):
    total = 0.0
    by_customer = {}
    for customer, signed in records:
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": list(rejected)}
```

Behaviour check: original: EUR conversion before status check; rejected order — original appends for currency unknown before status check; parse_line raises ValueError on unknown currency — still rejected. Order of checks: original: len!=5 -> reject; float fail -> reject; value<0 or empty -> reject; unknown currency -> reject; bad status -> reject. Same order preserved. Blank/comment skipped. Rounding same.

One subtlety: original for PLN keeps float value; amount*1.0 same.

Docstrings preserved.