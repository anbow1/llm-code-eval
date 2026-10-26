import unittest
from cart import line_total, shipping_fee, cart_total


class CartTest(unittest.TestCase):
    def test_line_total_plain(self):
        self.assertEqual(line_total(10.0, 3), 30.0)

    def test_line_total_discount(self):
        self.assertEqual(line_total(100.0, 2, 0.25), 150.0)

    def test_negative_qty(self):
        with self.assertRaises(ValueError):
            line_total(5.0, -1)

    def test_free_shipping_threshold(self):
        self.assertEqual(shipping_fee(200.0), 0.0)
        self.assertEqual(shipping_fee(199.99), 14.99)

    def test_cart_total(self):
        self.assertEqual(cart_total([{"price": 50.0, "qty": 2}, {"price": 40.0, "qty": 1, "discount": 0.5}]), 134.99)


if __name__ == "__main__":
    unittest.main()
