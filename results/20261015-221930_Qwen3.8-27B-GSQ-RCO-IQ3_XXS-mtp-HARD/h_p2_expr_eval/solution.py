from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")

    pos = 0
    vars_dict = variables if variables is not None else {}

    def parse_expression() -> Fraction:
        nonlocal pos
        left = parse_term()
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            op = tokens[pos][0]
            pos += 1
            right = parse_term()
            left = left + right if op == '+' else left - right
        return left

    def parse_term() -> Fraction:
        nonlocal pos
        left = parse_factor()
        while pos < len(tokens) and tokens[pos][0] in ('*', '/'):
            op = tokens[pos][0]
            pos += 1
            right = parse_factor()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left

    def parse_factor() -> Fraction:
        nonlocal pos
        sign = 1
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            if tokens[pos][0] == '-':
                sign *= -1
            pos += 1
        value = parse_power()
        return sign * value

    def parse_power() -> Fraction:
        nonlocal pos
        base = parse_primary()
        if pos < len(tokens) and tokens[pos][0] == '^':
            pos += 1
            exponent = parse_factor()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp
        return base

    def parse_primary() -> Fraction:
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("Unexpected end of expression")
        kind, value = tokens[pos]

        if kind == 'NUMBER':
            pos += 1
            return Fraction(value)

        if kind == 'IDENT':
            if value in ('abs', 'min', 'max'):
                return parse_func_call(value)
            if value not in vars_dict:
                raise NameError(f"Unknown variable: {value}")
            pos += 1
            return Fraction(vars_dict[value])

        if kind == '(':
            pos += 1
            val = parse_expression()
            if pos >= len(tokens) or tokens[pos][0] != ')':
                raise ValueError("Expected ')'")
            pos += 1
            return val

        raise ValueError(f"Unexpected token: {kind}")

    def parse_func_call(name: str) -> Fraction:
        nonlocal pos
        pos += 1  # consume function name
        if pos >= len(tokens) or tokens[pos][0] != '(':
            raise ValueError(f"Expected '(' after {name}")
        pos += 1  # consume '('

        args: list[Fraction] = []
        if pos < len(tokens) and tokens[pos][0] == ')':
            pass  # zero arguments
        else:
            args.append(parse_expression())
            while pos < len(tokens) and tokens[pos][0] == ',':
                pos += 1
                args.append(parse_expression())

        if pos >= len(tokens) or tokens[pos][0] != ')':
            raise ValueError(f"Expected ')' after {name} call")
        pos += 1

        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() requires exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name}")

    result = parse_expression()
    if pos != len(tokens):
        raise ValueError("Trailing tokens in expression")
    return result


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if c.isdigit():
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            else:
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            tokens.append(('NUMBER', expr[start:i]))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens
