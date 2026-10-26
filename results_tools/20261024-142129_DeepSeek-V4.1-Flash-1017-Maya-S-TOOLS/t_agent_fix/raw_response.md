All 5 tests pass now. Two bugs fixed in `cart.py`:

1. **`line_total`**: the discount was being divided by 100 even though it's already a fraction (0.25 = 25%), so it now uses `(1 - discount)`.
2. **`shipping_fee`**: the free-shipping threshold used `>` instead of `>=`, so orders of exactly 200 weren't free.