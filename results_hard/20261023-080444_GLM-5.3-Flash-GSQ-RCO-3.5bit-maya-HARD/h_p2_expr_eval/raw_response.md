```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"\s+"                                    # whitespace (skipped)
    r"|(?P<num>\d+(?:\.\d*)?|\.\d+)"          # 12, 3.5, .5, 7.
    r"|(?P<ident>[A-Za-z_][A-Za-z0-9_]*)"     # identifiers
    r"|(?P<op>[+\-*/^()])"                    # operators / parentheses
    r"|(?P<comma>,)"                          # argument separator
)


def _tokenize(text: str):
    tokens = []
    pos = 0
    length = len(text)
    while pos < length:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ValueError(
                f"invalid character {text[pos]!r} at position {pos}"
            )
        pos = m.end()
        kind = m.lastgroup
        if kind == "num":
            tokens.append(("num", m.group("num")))
        elif kind == "ident":
            tokens.append(("ident", m.group("ident")))
        elif kind == "op":
            tokens.append(("op", m.group("op")))
        elif kind == "comma":
            tokens.append(("op", ","))
        # whitespace: no token
    return tokens


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")

    vars_map = {} if variables is None else variables

    idx = 0

    def peek():
        if idx < len(tokens):
            return tokens[idx]
        return (None, None)

    def advance():
        nonlocal idx
        idx += 1

    def expect_op(op: str) -> None:
        kind, val = peek()
        if kind == "op" and val == op:
            advance()
            return
        raise ValueError(f"expected {op!r}")

    # expr := term (('+' | '-') term)*
    def parse_expr() -> Fraction:
        value = parse_term()
        while True:
            kind, val = peek()
            if kind == "op" and val in ("+", "-"):
                advance()
                rhs = parse_term()
                value = value + rhs if val == "+" else value - rhs
            else:
                return value

    # term := unary (('*' | '/') unary)*
    def parse_term() -> Fraction:
        value = parse_unary()
        while True:
            kind, val = peek()
            if kind == "op" and val in ("*", "/"):
                advance()
                rhs = parse_unary()
                if val == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    # unary := ('+' | '-') unary | power
    def parse_unary() -> Fraction:
        kind, val = peek()
        if kind == "op" and val in ("+", "-"):
            advance()
            operand = parse_unary()
            return operand if val == "+" else -operand
        return parse_power()

    # power := primary ('^' unary)?   (right-associative via unary on the RHS)
    def parse_power() -> Fraction:
        base = parse_primary()
        kind, val = peek()
        if kind == "op" and val == "^":
            advance()
            exponent = parse_unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** int(exponent)
        return base

    def parse_primary() -> Fraction:
        nonlocal idx
        kind, val = peek()
        if kind == "num":
            advance()
            return Fraction(val)
        if kind == "ident":
            advance()
            k2, v2 = peek()
            if k2 == "op" and v2 == "(":
                advance()
                return _parse_call(val)
            if val not in vars_map:
                raise NameError(f"unknown variable {val!r}")
            return Fraction(vars_map[val])
        if kind == "op" and val == "(":
            advance()
            value = parse_expr()
            expect_op(")")
            return value
        raise ValueError("unexpected token")

    def _parse_call(name: str) -> Fraction:
        args = [parse_expr()]
        while True:
            kind, val = peek()
            if kind == "op" and val == ",":
                advance()
                args.append(parse_expr())
            elif kind == "op" and val == ")":
                advance()
                break
            else:
                raise ValueError("malformed function call")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if not args:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == "max":
            if not args:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")

    result = parse_expr()
    if idx != len(tokens):
        raise ValueError("unexpected trailing tokens")
    return result
```