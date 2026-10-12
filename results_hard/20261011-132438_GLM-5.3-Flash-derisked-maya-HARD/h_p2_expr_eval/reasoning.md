Need a tokenizer + recursive descent parser. Numbers: Fraction("3.5"), Fraction("7."), Fraction(".5")? Fraction accepts "7." and ".5"? Fraction("7.") works? Let me recall: Fraction's string regex allows optional digits before/after dot? The regex: `\d*/\d*` no — for decimal: `(?P<num>\d*)(?P>... )` Actually Fraction("7.") works? Python's Fraction regex: `r'\A\s*(?P<num>.*?)\s*/\s*(?P<denom>.*?)\s*\Z'` fallback to decimal regex `(?P<sign>[-+]?)(?=\d|\.\d)(?P<int>\d*)(?P<decimal>\.?)(?P<frac>\d*)...` I think "7." works and ".5" works. Fraction(".5") -> 1/2, yes. Fraction("7.") -> 7, yes. But "1..2" should fail — Fraction("1..2") would raise ValueError; but tokenizer should catch that anyway.

Also Fraction accepts "1e3"? We don't want exponent notation. Better tokenize numbers with our own regex and construct Fraction from string; Fraction constructor with string validates. But "1e2" — our regex wouldn't match e, so "e" would be... it's a letter, could be start of variable name. "1e2" would tokenize as "1" then "e2" — that's "2 3" style: two consecutive atoms → syntax error via parser? "1e2": tokens NUM(1), NAME(e2) → after primary 1, next token NAME, not an operator → trailing tokens → ValueError. Good.

Tokenizer regex: NUMBER = r'\d+\.\d*|\.\d+|\d+' (dot alone not allowed). NAME = [A-Za-z_]\w*. OPS. Skip whitespace. Unknown char → ValueError.

Grammar:
expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-')* unary | power
power := primary ('^' unary)?  — wait power: atom ^ unary (right-assoc, and exponent may have unary sign). Precedence: unary minus binds looser than ^: -2^2 = -(2^2). So unary := sign* power? Actually:

unary := ('+'|'-') unary | postfix_power? Let's define:
unary := ('+'|'-')* power
power := atom ('^' unary)?   # exponent can include unary: 2^-1
atom := NUMBER | NAME | FUNC '(' args ')' | '(' expr ')'

Check: 2^3^2: atom(2) '^' unary → unary→power: atom(3) '^' unary(2). Right-assoc. Good. -2^2: unary '-' → unary → power: 2^2 → -4. Good. 2^-1: atom 2 '^' unary: sign '-', then power atom 1 → 1/2. Good.

Power exponent: evaluate exponent, must be integer-valued Fraction (denominator 1); else ValueError. 0^negative → ZeroDivisionError. Compute with Fraction ** int.

Functions: NAME followed by '(': abs needs exactly 1 arg; min/max ≥1. Unknown function → ValueError. NAME not followed by '(' is a variable.

Implement tokenizer producing list of (kind, value). Parser with index.

Write code.