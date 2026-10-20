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
        # Number: digits optionally followed by . and more digits, or . followed by digits
        if expr[i].isdigit() or (expr[i] == '.' and i + 1 < n and expr[i + 1].isdigit()):
            j = i
            while j < n and expr[j].isdigit():
                j += 1
            if j < n and expr[j] == '.':
                j += 1
                while j < n and expr[j].isdigit():
                    j += 1
            tokens.append(('NUM', expr[i:j]))
            i = j
            continue
        # Identifier
        if expr[i].isalpha() or expr[i] == '_':
            j = i
            while j < n and (expr[j].isalnum() or expr[j] == '_'):
                j += 1
            tokens.append(('IDENT', expr[i:j]))
            i = j
            continue
        # Single-char tokens
        if expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
            continue
        raise ValueError(f"Unknown character: {expr[i]!r}")

    if not tokens:
        raise ValueError("Empty expression")

    # --- Parser (recursive descent) ---
    pos = [0]

    def peek() -> tuple[str, str] | None:
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def consume(expected: str | None = None) -> tuple[str, str]:
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        if expected is not None and tok[0] != expected:
            raise ValueError(f"Expected {expected!r}, got {tok[0]!r}")
        pos[0] += 1
        return tok

    def parse_expr() -> Fraction:
        val = parse_term()
        while peek() and peek()[0] in ('+', '-'):
            op = consume()[0]
            right = parse_term()
            val = val + right if op == '+' else val - right
        return val

    def parse_term() -> Fraction:
        val = parse_factor()
        while peek() and peek()[0] in ('*', '/'):
            op = consume()[0]
            right = parse_factor()
            if op == '*':
                val = val * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                val = val / right
        return val

    def parse_factor() -> Fraction:
        # Unary + / - (repeating)
        if peek() and peek()[0] in ('+', '-'):
            op = consume()[0]
            val = parse_factor()
            return val if op == '+' else -val
        return parse_power()

    def parse_power() -> Fraction:
        base = parse_primary()
        if peek() and peek()[0] == '^':
            consume()  # '^'
            exp = parse_factor()  # right-associative; exponent may carry unary sign
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("Zero to negative power")
            return base ** exp_int
        return base

    def parse_primary() -> Fraction:
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        # Number literal
        if tok[0] == 'NUM':
            consume()
            return Fraction(tok[1])

        # Identifier: function call or variable
        if tok[0] == 'IDENT':
            name = consume()[1]
            if peek() and peek()[0] == '(':
                consume()  # '('
                args: list[Fraction] = []
                if peek() and peek()[0] != ')':
                    args.append(parse_expr())
                    while peek() and peek()[0] == ',':
                        consume()  # ','
                        args.append(parse_expr())
                if not peek() or peek()[0] != ')':
                    raise ValueError("Expected ')'")
                consume()  # ')'
                return _call_function(name, args)
            # Must be a variable (unless it's a known function used without parens)
            if name in ('abs', 'min', 'max'):
                raise ValueError(f"Unknown character: '{name}' is a function and requires parentheses")
            if name not in variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(variables[name])

        # Parenthesized expression
        if tok[0] == '(':
            consume()  # '('
            val = parse_expr()
            if not peek() or peek()[0] != ')':
                raise ValueError("Expected ')'")
            consume()  # ')'
            return val

        raise ValueError(f"Unexpected token: {tok[0]!r}")

    def _call_function(name: str, args: list[Fraction]) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"Unknown function: {name}")

    result = parse_expr()
    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")
    return result
