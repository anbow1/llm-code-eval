All 5 tests pass. Summary of fixes in `cart.py`:

1. **`line_total` discount bug**: the code multiplied by `(1 - discount / 100)`, treating the discount as a percentage, while the docstring and tests define it as a fraction. Changed to `(1 - discount)`, so e.g. `line_total(100.0, 2, 0.25)` correctly returns `150.0`.
2. **`shipping_fee` off-by-one at threshold**: free shipping is specified for orders of 200 PLN *or more*, but the check was `subtotal > 200`. Changed to `>=`, so `shipping_fee(200.0)` now returns `0.0`.