--- turn 1 ---
Let me start by exploring the repository.

--- turn 3 ---
Bugs:
1. line_total: discount is fraction, so should be `(1 - discount)` not `(1 - discount / 100)`.
2. shipping_fee: free for >= 200, but uses `> 200`.
3. cart_total: last test: 50*2=100, 40*1*0.5=20 => subtotal 120, +14.99 = 134.99. That works. Check with fixes.

Fix both.