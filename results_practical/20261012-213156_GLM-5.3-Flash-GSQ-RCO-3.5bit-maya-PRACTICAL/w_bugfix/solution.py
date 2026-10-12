from datetime import date, timedelta


def business_days_between(start: date, end: date, holidays=()) -> int:
    """Number of business days (Mon-Fri, not in holidays) from start to end.

    start is included, end is excluded. If end <= start the result is 0.
    """
    days = 0
    current = start
    while current < end:
        if current.weekday() < 5 and current not in holidays:
            days += 1
        current += timedelta(days=1)
    return days


def add_business_days(start: date, n: int, holidays=()) -> date:
    """The date n business days after start (n >= 0). Weekends and holidays are skipped."""
    current = start
    while n > 0:
        current += timedelta(days=1)
        if current.weekday() < 5 and current not in holidays:
            n -= 1
    return current
