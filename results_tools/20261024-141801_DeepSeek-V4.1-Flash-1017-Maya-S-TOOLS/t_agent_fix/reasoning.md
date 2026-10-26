--- turn 3 ---
Two bugs:

1. `line_total`: discount is documented as a fraction (0.1 = 10% off), but code divides by 100. Fix: `(1 - discount)`.

2. `shipping_fee`: free for orders of 200 PLN or more → `subtotal >= 200`.

Let's verify cart_total test: items: 50*2 = 100, 40*1*(1-0.5)=20 → subtotal 120 → shipping 14.99 → 134.99. Correct.

--- turn 4 ---
Wait, the subtotal of the cart test: 50*2 = 100, 40*1*0.5=20 → 120. Shipping 14.99 → 134.99. Good.

Run tests.