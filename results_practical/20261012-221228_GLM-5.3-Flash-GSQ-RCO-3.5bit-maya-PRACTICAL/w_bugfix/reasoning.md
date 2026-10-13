business_days_between: loop should be while current < end (end excluded). Also if end <= start → 0, loop handles that.

add_business_days: must also skip holidays: check `current not in holidays`.