from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or (c == '.' and i + 1 < n and expr[i + 1].isdigit()):
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
            tokens.append(('NAME', expr[start:i]))
        elif c in '+-*/^(),':
            tokens.append(('OP', c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")

    if not tokens:
        raise ValueError("Empty expression")

    # --- Recursive Descent Parser ---
    pos = 0

    def peek():
        nonlocal pos
        if pos < len(tokens):
            return tokens[pos]
        return None

    def consume():
        nonlocal pos
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        pos += 1
        return tok

    def parse_expression() -> Fraction:
        result = parse_term()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('+', '-'):
            op = consume()[1]
            right = parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result

    def parse_term() -> Fraction:
        result = parse_unary()
        while peek() and peek()[0] == 'OP' and peek()[1] in ('*', '/'):
            op = consume()[1]
            right = parse_unary()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result /= right
        return result

    def parse_unary() -> Fraction:
        tok = peek()
        if tok and tok[0] == 'OP' and tok[1] in ('+', '-'):
            consume()
            val = parse_unary()
            return -val if tok[1] == '-' else val
        return parse_power()

    def parse_power() -> Fraction:
        base = parse_primary()
        tok = peek()
        if tok and tok[0] == 'OP' and tok[1] == '^':
            consume()
            exp = parse_unary()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp
        return base

    def parse_primary() -> Fraction:
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUMBER':
            consume()
            return Fraction(tok[1])

        if tok[0] == 'NAME':
            name = tok[1]
            consume()
            if peek() and peek() == ('OP', '('):
                # Function call
                consume()  # (
                args = []
                if not (peek() and peek() == ('OP', ')')):
                    args.append(parse_expression())
                    while peek() and peek() == ('OP', ','):
                        consume()  # ,
                        args.append(parse_expression())
                if not (peek() and peek() == ('OP', ')')):
                    raise ValueError("Expected ')'")
                consume()  # )

                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs takes exactly 1 argument")
                    return abs(args[0])
                elif name == 'min':
                    if len(args) < 1:
                        raise ValueError("min takes at least 1 argument")
                    return min(args)
                elif name == 'max':
                    if len(args) < 1:
                        raise ValueError("max takes at least 1 argument")
                    return max(args)
                else:
                    raise ValueError(f"Unknown function: {name}")
            else:
                # Variable lookup
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                return Fraction(variables[name])

        if tok[0] == 'OP' and tok[1] == '(':
            consume()  # (
            result = parse_expression()
            if not (peek() and peek() == ('OP', ')')):
                raise ValueError("Expected ')'")
            consume()  # )
            return result

        raise ValueError(f"Unexpected token: {tok}")

    result = parse_expression()
    if pos < len(tokens):
        raise ValueError("Unexpected token after expression")
    return result
