```python
import re
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}

    # --- Tokenizer ---
    tokens: list[tuple[str, str]] = []
    i, n = 0, len(expr)
    while i < n:
        if expr[i].isspace():
            i += 1
            continue
        if expr[i].isdigit() or expr[i] == '.':
            m = re.match(r'[0-9]+\.?[0-9]*|\.[0-9]+', expr[i:])
            if not m:
                raise ValueError("invalid number")
            tokens.append(('NUM', m.group()))
            i += m.end()
        elif expr[i].isalpha() or expr[i] == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_]*', expr[i:])
            tokens.append(('ID', m.group()))
            i += m.end()
        elif expr[i] in '+-*/^(),':
            tokens.append((expr[i], expr[i]))
            i += 1
        else:
            raise ValueError(f"unknown character: {expr[i]!r}")

    if not tokens:
        raise ValueError("empty expression")

    # --- Parser ---
    pos = 0

    def peek():
        if pos < len(tokens):
            return tokens[pos]
        return None

    def advance():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def expect(kind: str):
        if peek() is None or peek()[0] != kind:
            raise ValueError(f"expected {kind!r}")
        advance()

    def parse_expr():
        left = parse_term()
        while peek() and peek()[0] in ('+', '-'):
            op = advance()[0]
            right = parse_term()
            left = left + right if op == '+' else left - right
        return left

    def parse_term():
        left = parse_unary()
        while peek() and peek()[0] in ('*', '/'):
            op = advance()[0]
            right = parse_unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left

    def parse_unary():
        if peek() and peek()[0] in ('+', '-'):
            op = advance()[0]
            val = parse_unary()
            return -val if op == '-' else val
        return parse_power()

    def parse_power():
        base = parse_atom()
        if peek() and peek()[0] == '^':
            advance()
            exp = parse_unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("zero to a negative power")
            return base ** exp_int
        return base

    def parse_atom():
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        if tok[0] == 'NUM':
            advance()
            return Fraction(tok[1])
        if tok[0] == 'ID':
            advance()
            name = tok[1]
            is_func_name = name in ('abs', 'min', 'max')
            followed_by_paren = peek() is not None and peek()[0] == '('
            if is_func_name:
                if not followed_by_paren:
                    raise ValueError(f"function {name!r} requires parentheses")
                expect('(')
                args = [parse_expr()]
                while peek() and peek()[0] == ',':
                    advance()
                    args.append(parse_expr())
                expect(')')
                if name == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs takes exactly 1 argument")
                    return abs(args[0])
                if len(args) < 1:
                    raise ValueError(f"{name} requires at least 1 argument")
                return min(args) if name == 'min' else max(args)
            if followed_by_paren:
                raise ValueError(f"unknown function: {name!r}")
            if name in variables:
                val = variables[name]
                if isinstance(val, int):
                    return Fraction(val)
                if isinstance(val, Fraction):
                    return val
                raise ValueError(f"invalid variable value for {name!r}")
            raise NameError(f"unknown variable: {name!r}")
        if tok[0] == '(':
            advance()
            result = parse_expr()
            expect(')')
            return result
        raise ValueError(f"unexpected token: {tok[1]!r}")

    result = parse_expr()
    if pos < len(tokens):
        raise ValueError("trailing tokens after expression")
    return result
```