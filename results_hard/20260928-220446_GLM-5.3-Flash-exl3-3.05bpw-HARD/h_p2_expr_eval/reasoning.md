Write recursive descent parser. Exponent: right-assoc, unary minus binds looser than ^ on left, but allowed after ^. Precedence: unary +/- higher than * but lower than ^. Structure:

expr := term (('+'|'-') term)*
term := unary (('*'|'/') unary)*
unary := ('+'|'-') unary | power
power := atom ('^' unary)?   # right side allows unary sign; exponent must be integer
atom := number | name | func | '(' expr ')'

Wait "-2^2 = -4": unary parses '-' then unary -> power -> 2^2... but that would negate the result 4 -> -4. Yes correct. And "2^-1": power's right side is unary, allowing sign. Good.

Careful: exponent integer check, but power returns Fraction; for unary minus inside exponent fine.

Check integer-ness: fraction.denominator == 1.

Numbers: Fraction("7.") fine, ".5" fine, "1..2" -> Fraction fails -> ValueError. Tokenize numbers: digits with optional single dot. Use regex scanning in tokenizer. But "1.5.3"? Tokenizer: match `\d+\.?\d*|\.\d+`... "1.5.3" would tokenize "1.5" then ".3"? Better: try Fraction(token) but tokens split. Let regex number = \d+\.\d*|\.\d+|\d+. Then "1.5.3" -> after number "1.5", next char "." -> next token ".3"? "1.5.3": \d+\.\d* matches "1.5"? \d+ then \. then \d* matches "5"; then next ".3" matches \.\d+ -> gives tokens 1.5, .3 adjacent -> syntax error "expected operator". Fine, ValueError raised either way.

Name followed by "(" = function call; abs wrong arg count -> ValueError; min/max at least 1.

Implement tokenizer producing tokens list, then parse with index.