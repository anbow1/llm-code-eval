import fractions


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens: list = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        if ch in '+-*/^(),':
            tokens.append(ch)
            i += 1
        elif ch.isdigit() or ch == '.':
            start = i
            dot_count = 0
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                if expr[i] == '.':
                    dot_count += 1
                    if dot_count > 1:
                        raise ValueError("Invalid number format")
                i += 1
            s = expr[start:i]
            if s == '.':
                raise ValueError("Invalid number format")
            tokens.append(('NUM', s))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        else:
            raise ValueError(f"Unexpected character: {ch!r}")

    if not tokens:
        raise ValueError("Empty expression")

    # --- Recursive-descent parser ---
    pos = 0

    def peek():
        if pos < len(tokens):
            return tokens[pos]
        return None

    def consume():
        nonlocal pos
        t = tokens[pos]
        pos += 1
        return t

    def expect(tok):
        nonlocal pos
        if pos >= len(tokens) or tokens[pos] != tok:
            raise ValueError(f"Expected {tok!r}")
        pos += 1

    def parse_expr():
        result = parse_term()
        while peek() in ('+', '-'):
            op = consume()
            right = parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result

    def parse_term():
        result = parse_unary_power()
        while peek() in ('*', '/'):
            op = consume()
            right = parse_unary_power()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result

    def parse_unary_power():
        t = peek()
        if t == '-' or t == '+':
            consume()
            operand = parse_unary_power()
            return -operand if t == '-' else operand
        return parse_power()

    def parse_power():
        base = parse_atom()
        if peek() == '^':
            consume()
            exp = parse_unary_power()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("Zero to negative power")
            return base ** exp_int
        return base

    def parse_atom():
        t = peek()
        if t is None:
            raise ValueError("Unexpected end of expression")
        if isinstance(t, tuple) and t[0] == 'NUM':
            consume()
            return fractions.Fraction(t[1])
        if isinstance(t, tuple) and t[0] == 'IDENT':
            name = consume()[1]
            if peek() == '(':
                consume()
                args = []
                if peek() != ')':
                    args.append(parse_expr())
                    while peek() == ',':
                        consume()
                        args.append(parse_expr())
                expect(')')
                return _call_function(name, args)
            # It's a variable
            if name not in variables:
                raise NameError(f"Unknown variable: {name!r}")
            val = variables[name]
            if isinstance(val, fractions.Fraction):
                return val
            return fractions.Fraction(val)
        if t == '(':
            consume()
            result = parse_expr()
            expect(')')
            return result
        raise ValueError(f"Unexpected token: {t!r}")

    def _call_function(name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() expects exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() expects at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() expects at least 1 argument")
            return max(args)
        else:
            raise ValueError(f"Unknown function: {name!r}")

    result = parse_expr()

    if pos < len(tokens):
        raise ValueError("Trailing tokens")

    return result
