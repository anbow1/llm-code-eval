--- turn 1 ---
Let me start by exploring the repository.

--- turn 3 ---
Bugs: discount fraction used as /100 erroneously. shipping threshold should be >= 200.

Check cart_total test: 50*2=100, 40*1*0.5=20 -> subtotal 120 -> shipping 14.99 -> 134.99. Good.