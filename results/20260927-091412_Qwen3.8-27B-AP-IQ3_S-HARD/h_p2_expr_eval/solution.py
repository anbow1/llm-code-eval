from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        if expr[i].isdigit() or (expr[i] == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if expr[i] == '.':
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(('NUM', expr[start:i]))
            continue
        if expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('ID', expr[start:i]))
            continue
        if expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
            continue
        raise ValueError(f"Unknown character: {expr[i]!r}")

    if not tokens:
        raise ValueError("Empty expression")

    pos = 0

    # --- Parser (recursive descent) ---

    def parse_expr() -> Fraction:
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
        left = parse_unary()
        while pos < len(tokens) and tokens[pos][0] in ('*', '/'):
            op = tokens[pos][0]
            pos += 1
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                left = left / right
        return left

    def parse_unary() -> Fraction:
        nonlocal pos
        signs = 0
        while pos < len(tokens) and tokens[pos][0] in ('+', '-'):
            if tokens[pos][0] == '-':
                signs += 1
            pos += 1
        value = parse_power()
        if signs % 2 == 1:
            value = -value
        return value

    def parse_power() -> Fraction:
        nonlocal pos
        base = parse_atom()
        if pos < len(tokens) and tokens[pos][0] == '^':
            pos += 1
            exponent = parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            if exp_int < 0:
                return Fraction(1) / (base ** (-exp_int))
            return base ** exp_int
        return base

    def parse_atom() -> Fraction:
        nonlocal pos
        if pos >= len(tokens):
            raise ValueError("Unexpected end of expression")

        tok_type, tok_val = tokens[pos]

        if tok_type == 'NUM':
            pos += 1
            return Fraction(tok_val)

        if tok_type == 'ID':
            name = tok_val
            pos += 1
            if pos < len(tokens) and tokens[pos][0] == '(':
                # Function call
                if name not in ('abs', 'min', 'max'):
                    raise ValueError(f"Unknown function: {name!r}")
                pos += 1  # consume '('
                args: list[Fraction] = []
                if pos < len(tokens) and tokens[pos][0] != ')':
                    args.append(parse_expr())
                    while pos < len(tokens) and tokens[pos][0] == ',':
                        pos += 1
                        args.append(parse_expr())
                if pos >= len(tokens) or tokens[pos][0] != ')':
                    raise ValueError("Expected ')'")
                pos += 1  # consume ')'

                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs requires exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min requires at least 1 argument")
                    return min(args)
                else:  # max
                    if len(args) < 1:
                        raise ValueError("max requires at least 1 argument")
                    return max(args)
            else:
                # Variable (or function name used without parentheses)
                if name in ('abs', 'min', 'max'):
                    raise ValueError(f"{name} is a function, expected '('")
                if name not in variables:
                    raise NameError(f"Unknown variable: {name!r}")
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                return val  # already a Fraction

        if tok_type == '(':
            pos += 1
            val = parse_expr()
            if pos >= len(tokens) or tokens[pos][0] != ')':
                raise ValueError("Expected ')'")
            pos += 1
            return val

        raise ValueError(f"Unexpected token: {tok_val!r}")

    result = parse_expr()
    if pos != len(tokens):
        raise ValueError("Trailing tokens")
    return result
