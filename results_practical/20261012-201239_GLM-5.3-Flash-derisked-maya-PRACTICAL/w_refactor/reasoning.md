I need to refactor. parse_line returns tuple (order_id, customer, amount_pln, status) for valid line — but wait, currency conversion happens in to_pln. So parse_line returns amount in... "amount_pln" — so parse_line must call to_pln? The spec: parse_line returns (order_id, customer, amount_pln, status). to_pln raises ValueError for unknown currency. So parse_line parses and calls to_pln. Invalid line raises ValueError. Then process_orders catches ValueError to reject.

Note: rounding behavior must be preserved. Original: value converted then multiplied, no per-record rounding; sums accumulated then rounded at end. signed amount = sign * value_pln. That's fine.

Also note original checks: value < 0 → rejected. Order of checks matters for which lines are rejected? Only line numbers matter, not reason, so any ValueError → reject. But careful: original checks negative/customer/order_id before currency. Since any failure results in rejection, order doesn't matter for the rejected list.

parse_line(raw): strip, blank/# → None. Split, must be 5 parts else ValueError. Parse float with comma replacement; ValueError propagates (float raises ValueError already). value < 0 or missing customer/order_id → raise ValueError. status must be paid/refunded else raise ValueError? Then process_orders computes sign. Hmm, but sign determination needs status. parse_line returns status; process_orders maps status to sign. But invalid status must raise ValueError in parse_line (since to_pln handles currency, and status check... who raises? If status invalid, parse_line should raise ValueError to keep line rejected). Yes, validate status in parse_line.

Also currency validation via to_pln inside parse_line. Order: parse_line calls to_pln(amount, currency).

Careful: to_pln converts positive amount; sign applied after.

Edge: original checks negative value before currency conversion — but rejection either way, fine.

process_orders:

```python
def process_orders(lines):
    total = 0.0
    by_customer = {}
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            parsed = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if parsed is None:
            continue
        order_id, customer, amount_pln, status = parsed
        sign = 1 if status == "paid" else -1
        signed = sign * amount_pln
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": rejected}
```

That's ~16 lines? Count: def, docstring optional. Lines: total=..., by_customer=..., rejected=..., for, try, parsed, except... Let me count without docstring: assignments 3, for 1, try 1, parse 1, except 1, append 1, continue 1, if None 1, continue 1, unpack 1, sign 1, signed 1, total+= 1, by_customer 1, return 3. = 19 lines. Too long. Need ≤15 lines. Hmm, "short function (at most 15 lines)".

Compress: combine rejected/continue in except: `except ValueError: rejected.append(n); continue` — one line? Can do `except ValueError: rejected.append(n); continue` on one line with semicolons — valid Python? `except ValueError: rejected.append(n); continue` — yes, simple statements separated by semicolons work in the except clause body.

Alternative: use a helper for accumulation. Or:

```python
def process_orders(lines):
    total = 0.0
    by_customer = {}
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            order_id, customer, amount_pln, status = parse_line(raw) or (*None,)
        ...
```

Hmm, parse_line returns None for skip; can't unpack None. Maybe have parse_line return None and process_orders:

```python
def process_orders(lines):
    total = 0.0
    by_customer = {}
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            record = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if record is None:
            continue
        _, customer, amount_pln, status = record
        signed = amount_pln if status == "paid" else -amount_pln
        total += signed
        by_customer[customer] = by_customer.get(customer, 0.0) + signed
    return {"total_pln": round(total, 2),
            "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())},
            "rejected": rejected}
```

Count lines: 1 def, 2 total, 3 by_customer, 4 rejected, 5 for, 6 try, 7 record=, 8 except:, 9 append;continue (one line), 10 if record is None:, 11 continue, 12 unpack, 13 signed, 14 total+=, 15 by_customer, 16 return dict — could put dict on one line? It's long but one line: `return {"total_pln": round(total, 2), "by_customer": {k: round(v, 2) for k, v in sorted(by_customer.items())}, "rejected": rejected}` — 16 lines. Hmm.

Alternatively move accumulation into summarize? summarize builds result dict from list of (customer, signed_amount_pln) pairs. But we also need total and rejected. summarize could compute total from pairs, by_customer; rejected handled in process_orders. But then process_orders needs to build pairs list — memory but fine.

Option: process_orders collects records list and rejected, then... but it must also know which lines skipped. Let me restructure:

```python
def process_orders(lines):
    records = []
    rejected = []
    for n, raw in enumerate(lines, 1):
        try:
            record = parse_line(raw)
        except ValueError:
            rejected.append(n)
            continue
        if record is None:
            continue
        _, customer, amount_pln, status = record
        records.append((customer, amount_pln if status == "paid" else -amount_pln))
    result = summarize(records)
    result["rejected"] = rejected
    return result
```

Count: def(1), records(2), rejected(3), for(4), try(5), record(6), except(7), append;continue(8), if(9), continue(10), unpack(11), append(12), result(13), result["rejected"](14), return(15). 15 lines. 

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
    if not customer or not order_id or status not in ("paid", "refunded"):
        raise ValueError("invalid field")
    try:
        value = float(amount.replace(",", "."))
    except ValueError:
        raise ValueError("bad amount")
    if value < 0:
        raise ValueError("negative amount")
    return order_id, customer, to_pln(value, currency), status
```

Wait — float("") raises ValueError already, so try/except optional, but keep for clarity. Actually `float(amount.replace(",", "."))` raises ValueError for empty — good, propagates. But original catches and rejects — process_orders catches ValueError, fine. But `raise ValueError("bad amount")` inside except — could just let it propagate; keep simple: remove try/except and let float's ValueError propagate. But wait, could float raise something else? No. Simplify.

to_pln:

```python
RATES = {"EUR": 4.27, "USD": 3.94, "PLN": 1.0}

def to_pln(amount, currency):
    try:
        return amount * RATES[currency]
    except KeyError:
        raise ValueError(f"unknown currency: {currency}")
```

Hmm, original docstring: PLN "as is" — 1.0 rate equivalent for positive amounts. Fine.

But wait: original checks value < 0 before currency; if value negative and unknown currency — either way rejected. Fine.

Also original: PLN pass — no conversion. rate 1.0 same.

One subtlety: original raises nothing; parse_line must not reject blank/comment — handled.

Also note original catches ValueError from float, then checks negative, then currency, then status. All produce rejection; my ordering within parse_line doesn't affect rejected line numbers.

Edge: line with 5 parts but empty amount: float("") → ValueError → rejected. Good.

Write module with docstrings.