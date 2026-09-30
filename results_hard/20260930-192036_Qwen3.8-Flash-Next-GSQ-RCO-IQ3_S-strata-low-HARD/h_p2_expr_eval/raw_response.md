```python
import fractions


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens: list[str | tuple[str, str]] = []
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch in ' \t\n\r':
            i += 1
            continue
        if ch in '+-*/^(),':
            tokens.append(ch)
            i += 1
        elif ch.isdigit() or (ch == '.' and i + 1 < len(expr) and expr[i + 1].isdigit()):
            start = i
            while i < len(expr) and expr[i].isdigit():
                i += 1
            if i < len(expr) and expr[i] == '.':
                i += 1
                while i < len(expr) and expr[i].isdigit():
                    i += 1
            tokens.append(('NUM', expr[start:i]))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < len(expr) and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        else:
            raise ValueError(f"Unknown character: {ch!r}")

    if not tokens:
        raise ValueError("Empty expression")

    # --- Parser ---
    pos = 0

    def current() -> str | tuple[str, str] | None:
        return tokens[pos] if pos < len(tokens) else None

    def consume() -> str | tuple[str, str]:
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def expect(op: str) -> None:
        if current() != op:
            raise ValueError(f"Expected {op!r}")
        consume()

    def parse_expr() -> fractions.Fraction:
        result = parse_term()
        while current() in ('+', '-'):
            op = consume()
            right = parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result

    def parse_term() -> fractions.Fraction:
        result = parse_unary()
        while current() in ('*', '/'):
            op = consume()
            right = parse_unary()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result

    def parse_unary() -> fractions.Fraction:
        if current() == '+':
            consume()
            return +parse_unary()
        if current() == '-':
            consume()
            return -parse_unary()
        return parse_power()

    def parse_power() -> fractions.Fraction:
        base = parse_atom()
        if current() == '^':
            consume()
            exp = parse_unary()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            return base ** exp.numerator
        return base

    def parse_atom() -> fractions.Fraction:
        tok = current()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if isinstance(tok, tuple) and tok[0] == 'NUM':
            consume()
            s = tok[1]
            if s.endswith('.'):
                s = s[:-1]
            if s == '':
                return fractions.Fraction(0)
            return fractions.Fraction(s)

        if isinstance(tok, tuple) and tok[0] == 'NAME':
            name = tok[1]
            consume()
            if name == 'abs':
                expect('(')
                arg = parse_expr()
                expect(')')
                return abs(arg)
            elif name == 'min':
                expect('(')
                args = [parse_expr()]
                while current() == ',':
                    consume()
                    args.append(parse_expr())
                expect(')')
                return min(args)
            elif name == 'max':
                expect('(')
                args = [parse_expr()]
                while current() == ',':
                    consume()
                    args.append(parse_expr())
                expect(')')
                return max(args)
            else:
                if name not in variables:
                    raise NameError(f"Unknown variable: {name}")
                return fractions.Fraction(variables[name])

        if tok == '(':
            consume()
            result = parse_expr()
            expect(')')
            return result

        raise ValueError(f"Unexpected token: {tok!r}")

    # --- Main ---
    result = parse_expr()
    if pos < len(tokens):
        raise ValueError("Trailing tokens")
    return result
```