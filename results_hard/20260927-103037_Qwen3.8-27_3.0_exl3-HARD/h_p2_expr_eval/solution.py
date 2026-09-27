from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")

    pos = [0]

    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def consume():
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        pos[0] += 1
        return tok

    def parse_expr():
        left = parse_term()
        while peek() is not None and peek()[0] in ('+', '-'):
            op = consume()[0]
            right = parse_term()
            if op == '+':
                left = left + right
            else:
                left = left - right
        return left

    def parse_term():
        left = parse_unary()
        while peek() is not None and peek()[0] in ('*', '/'):
            op = consume()[0]
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                left = left / right
        return left

    def parse_unary():
        if peek() is not None and peek()[0] in ('+', '-'):
            op = consume()[0]
            val = parse_unary()
            if op == '-':
                return -val
            return val
        return parse_power()

    def parse_power():
        base = parse_primary()
        if peek() is not None and peek()[0] == '^':
            consume()
            exponent = parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            if exp_int == 0:
                return Fraction(1)
            return base ** exp_int
        return base

    def parse_primary():
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUM':
            consume()
            return Fraction(tok[1])

        if tok[0] == 'NAME':
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                if pos[0] + 1 < len(tokens) and tokens[pos[0] + 1][0] == '(':
                    consume()  # name
                    consume()  # '('
                    args = [parse_expr()]
                    while peek() is not None and peek()[0] == ',':
                        consume()
                        args.append(parse_expr())
                    if peek() is None or peek()[0] != ')':
                        raise ValueError("Expected ')' after function arguments")
                    consume()  # ')'
                    if name == 'abs':
                        if len(args) != 1:
                            raise ValueError("abs takes exactly 1 argument")
                        return abs(args[0])
                    elif name == 'min':
                        if len(args) < 1:
                            raise ValueError("min takes at least 1 argument")
                        return min(args)
                    else:  # max
                        if len(args) < 1:
                            raise ValueError("max takes at least 1 argument")
                        return max(args)
                else:
                    raise ValueError(f"Function '{name}' must be followed by '('")
            else:
                consume()
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return Fraction(val)

        if tok[0] == '(':
            consume()
            val = parse_expr()
            if peek() is None or peek()[0] != ')':
                raise ValueError("Expected ')'")
            consume()
            return val

        raise ValueError(f"Unexpected token: {tok[0]}")

    result = parse_expr()

    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")

    return result


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        if s[i].isdigit():
            j = i
            while j < n and s[j].isdigit():
                j += 1
            if j < n and s[j] == '.':
                j += 1
                while j < n and s[j].isdigit():
                    j += 1
            tokens.append(('NUM', s[i:j]))
            i = j
        elif s[i] == '.':
            if i + 1 < n and s[i + 1].isdigit():
                j = i + 1
                while j < n and s[j].isdigit():
                    j += 1
                tokens.append(('NUM', s[i:j]))
                i = j
            else:
                raise ValueError(f"Unexpected character '.' at position {i}")
        elif s[i].isalpha() or s[i] == '_':
            j = i
            while j < n and (s[j].isalnum() or s[j] == '_'):
                j += 1
            tokens.append(('NAME', s[i:j]))
            i = j
        elif s[i] in '+-*/^()':
            tokens.append((s[i], s[i]))
            i += 1
        else:
            raise ValueError(f"Unexpected character '{s[i]}' at position {i}")
    return tokens
