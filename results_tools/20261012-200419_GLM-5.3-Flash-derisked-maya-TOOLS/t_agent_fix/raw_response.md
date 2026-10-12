All 5 tests pass. Two bugs fixed in `cart.py`:

1. **Discount applied as a percent instead of a fraction** — `line_total` multiplied by `(1 - discount / 100)`, but the discount is a fraction (e.g. `0.25` = 25% off). Changed it to `(1 - discount)`.
2. **Off-by-one in the free-shipping threshold** — `shipping_fee` used `subtotal > 200`, so an order of exactly 200 PLN was charged shipping. Changed to `subtotal >= 200` per the docstring ("200 PLN or more").