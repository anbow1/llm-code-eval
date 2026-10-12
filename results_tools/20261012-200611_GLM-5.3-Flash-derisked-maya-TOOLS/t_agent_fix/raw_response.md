All 5 tests pass. Summary of the fixes in `cart.py`:

1. **`line_total` — discount scaling bug**: the code computed `price * qty * (1 - discount / 100)`, treating the discount as a percentage, while the docstring (and tests) define it as a fraction. Fixed to `price * qty * (1 - discount)`, so e.g. `line_total(100.0, 2, 0.25)` now correctly returns `150.0`.

2. **`shipping_fee` — off-by-one at the free-shipping threshold**: the code used `subtotal > 200` (strictly greater), charging shipping for orders of exactly 200 PLN. Per the docstring ("200 PLN or more"), it's now `subtotal >= 200`.

`cart_total` needed no changes — both bugs it depended on are fixed, and the expected total (120.00 subtotal + 14.99 shipping = 134.99) now works.