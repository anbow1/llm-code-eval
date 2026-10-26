All 5 tests pass. Two bugs fixed in `cart.py`:

1. **`line_total`** — the discount was divided by 100 (`discount / 100`), but the docstring/API says discount is already a fraction (0.25 = 25% off). Now uses `(1 - discount)` directly.
2. **`shipping_fee`** — used `subtotal > 200`, which charged shipping on exactly 200.00. Changed to `>= 200` to match the documented "free for orders of 200 PLN or more".