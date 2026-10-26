All 5 tests pass. Two bugs fixed in `cart.py`:

1. **`line_total` discount handling** — `discount` is documented as a fraction (0.25 = 25% off), but the code divided it by 100. Changed to `price * qty * (1 - discount)`.
2. **`shipping_fee` boundary** — the docstring says free shipping at 200 or more, but the comparison was `subtotal > 200`, charging shipping for exactly 200. Changed to `subtotal >= 200`.