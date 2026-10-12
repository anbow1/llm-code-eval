--- turn 1 ---
Let me look at the repo.

--- turn 3 ---
Test expects discount 0.25 = 25% off. So discount fraction: 0.1 means 10% off. Fix: price * qty * (1 - discount). Shipping: subtotal >= 200 free, so use >=.