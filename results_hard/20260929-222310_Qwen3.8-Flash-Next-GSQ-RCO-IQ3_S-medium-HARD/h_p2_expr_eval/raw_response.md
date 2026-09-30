```python
import fractions


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens: list = []
    i = 0
    n = len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        if expr[i] in '+-*/^(),':
            tokens.append(expr[i])
            i += 1
            continue
        if expr[i].isdigit() or expr[i] == '.':
            start = i
            has_dot = False
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                if expr[i] == '.':
                    if has_dot:
                        raise ValueError("Invalid number")
                    has_dot = True
                i += 1
            num_str = expr[start:i]
            if num_str == '.':
                raise ValueError("Invalid number")
            tokens.append(('NUM', num_str))
            continue
        if expr[i].isalpha() or expr[i] == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
            continue
        raise ValueError(f"Unknown character: {expr[i]}")

    if not tokens:
        raise ValueError("Empty expression")

    # --- Parser (recursive descent) ---
    pos = [0]

    def peek():
        if pos[0] < len(tokens):
            return tokens[pos[0]]
        return None

    def advance():
        tok = tokens[pos[0]]
        pos[0] += 1
        return tok

    def expect(op):
        if peek() != op:
            raise ValueError(f"Expected '{op}', got {peek()!r}")
        advance()

    def parse_expr():
        left = parse_term()
        while peek() in ('+', '-'):
            op = advance()
            right = parse_term()
            left = left + right if op == '+' else left - right
        return left

    def parse_term():
        left = parse_unary()
        while peek() in ('*', '/'):
            op = advance()
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                left = left / right
        return left

    def parse_unary():
        signs = []
        while peek() in ('+', '-'):
            signs.append(advance())
        result = parse_power()
        for s in reversed(signs):
            if s == '-':
                result = -result
        return result

    def parse_power():
        base = parse_atom()
        if peek() == '^':
            advance()
            exp = parse_unary_pow()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            result = base ** exp_int
            return fractions.Fraction(result)
        return base

    def parse_unary_pow():
        signs = []
        while peek() in ('+', '-'):
            signs.append(advance())
        result = parse_power()
        for s in reversed(signs):
            if s == '-':
                result = -result
        return result

    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        # Parenthesized expression
        if tok == '(':
            advance()
            result = parse_expr()
            expect(')')
            return result

        # Unexpected operator token
        if isinstance(tok, str):
            raise ValueError(f"Unexpected token: {tok!r}")

        # Number
        if tok[0] == 'NUM':
            advance()
            return fractions.Fraction(tok[1])

        # Name: function call or variable
        if tok[0] == 'NAME':
            name = tok[1]
            advance()
            if name in ('abs', 'min', 'max'):
                expect('(')
                args = [parse_expr()]
                while peek() == ',':
                    advance()
                    args.append(parse_expr())
                expect(')')
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
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                return fractions.Fraction(variables[name])

        raise ValueError(f"Unexpected token: {tok!r}")

    # --- Run ---
    result = parse_expr()
    if pos[0] != len(tokens):
        raise ValueError("Trailing tokens")
    return fractions.Fraction(result)
```