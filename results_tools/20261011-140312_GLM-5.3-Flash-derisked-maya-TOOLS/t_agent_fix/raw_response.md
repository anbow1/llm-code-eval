All 5 tests pass. Two bugs were fixed in `cart.py`:

1. **Discount scaling in `line_total`** — the discount was multiplied by 100 (`1 - discount / 100`), but the docstring and tests specify a fraction (e.g. `0.25` = 25% off). Changed to `1 - discount`, so `line_total(100.0, 2, 0.25)` now correctly returns `150.0`.

2. **Off-by-one in `shipping_fee`** — the free-shipping check used `subtotal > 200`, excluding exactly 200 PLN. Since shipping is free "for orders of 200 PLN or more", it's now `subtotal >= 200`, which also makes `cart_total` return the expected `134.99` (subtotal 120.00 + 14.99 shipping).