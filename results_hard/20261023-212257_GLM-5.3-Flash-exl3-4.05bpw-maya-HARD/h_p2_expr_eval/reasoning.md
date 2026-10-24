Write a recursive descent parser.

Tokens: numbers, names, operators, parens, comma.

Grammar:
expr := term (('+'|'-') term)*
term := factor (('*'|'/') factor)*
factor := ('+'|'-')* power
power := atom ('^' factor)?  — right-assoc, unary sign allowed after ^. Careful: -2^2 = -4 means unary minus binds looser than ^. And 2^-1 allowed: after ^, allow unary signs then exponent which is... the exponent could be another power chain? "2^-1" -> exponent = -1. "2^3^2" = 2^(3^2). So after ^, parse unary sign then power (right-assoc)? Let's define:

power := unary_base? Actually:

factor := sign* power_expr
power_expr := atom ('^' signed_factor_right)?

For right side after ^: allow signs then another power_expr: exponent := sign* power_expr? But -2^2: parse factor: '-' then power_expr: 2^2 = 4, negate → -4. Good. 2^-1: atom 2, ^, then right side = sign(-) power_expr(1) = -1 → 2^-1 = 1/2. And 2^-3^2: right side = - 3^2 = -9, so 2^-9. Reasonable.

But careful: power_expr := atom ('^' exponent) where exponent := sign* power_expr. Actually simpler:

def power():
    base = atom()
    if peek '^':
        consume
        exp = signed_power()  # signs then power
        ...

where signed_power = unary handling. Hmm, but unary at factor level: factor := ('+'|'-') factor | power. power := atom ('^' exponent) where exponent := ('+'|'-') exponent | power? That makes 2^-1 fine and right-assoc fine: 2^3^2: exponent of first = power(3^2)? exponent := sign* power — power parses 3 then ^ then exponent(2). Yes.

But -2^2: factor sees '-', so factor := '-' factor → factor parses power: 2^2=4 → -4. Good.

Atom: number, name, function call, parenthesized expr.

Function call: name followed by '(' — parse args. Unknown function → ValueError. abs exactly 1 arg, min/max ≥1. Wrong arg count → ValueError.

Also name not followed by '(' is a variable.

Exponent must be integer Fraction → check exp.denominator == 1 else ValueError. 0^negative → ZeroDivisionError. Negative base with integer exponent fine: Fraction ** int works.

Number parsing: digits with optional dot: "12", "3.5", ".5", "7.". "1..2" → tokenize "1." then "." → "." is invalid char → error? Tokenizer: regex r'\d+\.\d*|\.\d+|\d+' — "1..2" → matches "1." then next ".", no match → error. Good. Use Fraction(token). Note Fraction("7.") — is that valid? Fraction("7.") works? Fraction accepts "7." I believe: Fraction("3.5") yes; Fraction("7.") — the Fraction parser regex: `\d+\.\d*` yes I think it's supported. Actually Fraction's _RATIONAL_FORMAT includes `\d+\.\d*`. Yes, "7." works. ".5" works.

Tokenizer with regex scanning, skip whitespace, error on unknown char. Tokens as tuples.

Implement tokenizer producing list of (kind, value).

Also "1)" trailing token error: after parsing expr, must be at end. "(1" unexpected end. "2 3" — expr parses 2, then next token NUMBER → not end → ValueError. "abs 3" — atom name "abs" not followed by '(' → treated as variable → variables lookup fails → NameError. Hmm but spec says "abs 3" → ValueError. Unknown name → NameError per spec. But "abs 3" — abs is a function name used without parens; should that be NameError or ValueError? Spec lists "abs 3" under syntax errors → ValueError. So if name is a known function name but not followed by '(', raise ValueError. Otherwise variable lookup → NameError if not in variables.

Trailing tokens after expr → ValueError.

Division: a / b with b zero → ZeroDivisionError; Fraction division raises ZeroDivisionError naturally, but check explicitly anyway.

Write code.