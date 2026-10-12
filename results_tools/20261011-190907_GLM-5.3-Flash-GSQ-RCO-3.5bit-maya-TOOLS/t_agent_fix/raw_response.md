All 5 tests pass now. I fixed two bugs in `cart.py`:

1. **`line_total` discount handling**: the code treated the discount as a percentage (`discount / 100`), but it's actually a fraction (0.25 = 25% off). Changed to `price * qty * (1 - discount)`.
2. **`shipping_fee` threshold**: used `subtotal > 200`, but free shipping applies to orders of 200 PLN *or more*, so it's now `subtotal >= 200` (test confirms `shipping_fee(200.0) == 0.0`).