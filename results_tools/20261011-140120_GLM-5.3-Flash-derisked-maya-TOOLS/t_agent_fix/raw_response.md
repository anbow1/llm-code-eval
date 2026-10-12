All 5 tests pass. Two bugs fixed in `cart.py`:

1. **`line_total`**: discount was applied as a percentage (`1 - discount / 100`), but it's specified as a fraction (e.g. 0.25 = 25% off). Changed to `1 - discount`.
2. **`shipping_fee`**: the free-shipping threshold used strict `>`, so orders of exactly 200 PLN were charged shipping. Changed to `>=` to match the "200 or more" rule.