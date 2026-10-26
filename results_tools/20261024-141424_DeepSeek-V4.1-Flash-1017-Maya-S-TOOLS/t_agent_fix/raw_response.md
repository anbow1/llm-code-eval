All 5 tests pass. Two bugs fixed in `cart.py`:

1. **`line_total`** — the discount is documented as a fraction (0.1 = 10% off), but it was divided by 100 again, so discounts were essentially ignored. Now it multiplies by `(1 - discount)`.
2. **`shipping_fee`** — free shipping was applied only for subtotals *strictly greater* than 200, contradicting the "200 PLN or more" rule. Changed to `>= 200`.