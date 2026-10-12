I need to write a tokenizer and recursive-descent parser.

Grammar:
- expr := unary ( ('+'|'-') unary )*
- unary := ('+'|'-')* power
- power := primary ('^' unary)? — right-assoc, exponent sign allowed after ^. Actually power binds tighter than unary minus: -2^2 = -4. So unary := ('+'|'-') unary | power. And power := primary ('^' unary)? so that 2^-1 works and 2^3^2 works (unary → power → 3^2).

primary := number | name | '(' expr ')' | func '(' args ')'.

Tokens: NUMBER, NAME, ops, lparen, rparen, comma.

Number regex: \d+\.\d* | \.\d+ | \d+ — use Fraction(string). Fraction("3.5"), Fraction(".5"), Fraction("7.")? Does Fraction("7.") work? Fraction accepts strings like "7."? Fraction's regex: `(?P<num>\d*)(?:\.(?P<decimal>\d*))?`... Fraction accepts "1." ? Let me recall: Fraction("3.") — I believe Fraction accepts "3." since regex allows decimal part empty. Fraction string parser: RATIONAL_FORMAT = r"""\A\s*(?P<sign>[-+]?)(?=\d|\.\d)(?P<num>\d*)(?:(?:/(?P<denom>\d+))?|(?:\.(?P<decimal>\d*))?(?:E(?P<exp>[-+]?\d+))?)\s*\Z""" — requires (?=\d|\.\d) lookahead, so "3." → num="3", decimal="" → ok. ".5" → num="", decimal="5" ok. So Fraction handles all three forms. Good. "1..2" fails at tokenizer (regex won't match "1." then ".." unknown char → error).

Tokenizer regex: NUMBER: \d+\.\d*|\.\d+|\d+ (order matters), NAME, whitespace skip, else error.

Parse function calls: NAME followed by '(' → function call. abs requires exactly 1 arg, min/max ≥1.

Power: exponent must be integer Fraction → ValueError. 0 ^ negative → ZeroDivisionError. Note Fraction ** negative int works but raises ZeroDivisionError for 0? 0**-1 raises ZeroDivisionError in Python for ints/Fractions. Fraction(0)**Fraction(-1) → raises ZeroDivisionError. Actually Fraction.__pow__ with negative exponent: raises ZeroDivisionError if numerator is 0. Fine, but I'll check explicitly to be safe: if base == 0 and exp < 0: raise ZeroDivisionError.

Also exponent integer check: exp.denominator == 1 else ValueError.

Variables: values are int or Fraction; convert with Fraction(value). Unknown → NameError.

Precedence: ^ binds tighter than * / — so power is inside term. Term := unary (('+'|'-') unary)* ... wait order: expr := term (('+'|'-') term)*, term := unary (('*'|'/') unary)*, unary := sign* power, power := primary ('^' unary)?.

Check -2^2: unary sees '-', recurses unary → power: primary 2, '^', unary → 2 → 2^2=4, negate → -4. ✓

2^3^2: power: primary 2, '^', unary → power → 3 ^ (unary→power→2) → 9 → 2^9. ✓

2^-1: '^' then unary → '-' → power → 1 → -1... wait unary applies sign after power: unary → '-' unary → power → 1, so -1 exponent → 1/2. ✓

Implement parser with index. Write code.