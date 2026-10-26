"""Shopping cart maths."""


def line_total(price, qty, discount=0.0):
    """Price of one cart line. discount is a fraction: 0.1 means 10% off."""
    if qty < 0:
        raise ValueError("qty must be >= 0")
    return round(price * qty * (1 - discount), 2)


def shipping_fee(subtotal):
    """Shipping is free for orders of 200 PLN or more, otherwise 14.99."""
    return 0.0 if subtotal >= 200 else 14.99


def cart_total(items):
    """items: list of dicts with price, qty and optional discount. Returns subtotal + shipping."""
    subtotal = round(sum(line_total(i["price"], i["qty"], i.get("discount", 0.0)) for i in items), 2)
    return round(subtotal + shipping_fee(subtotal), 2)
