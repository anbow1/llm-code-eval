```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"(?P<num>\d+\.\d*|\.\d+|\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<sym>[+\-*/^(),])"
)

# name -> required arity (None means 1 or more, comma separated)
_FUNCTIONS = {"abs": 1, "min": None, "max": None}


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    names = {} if variables is None else variables
    value, pos = _parse_expr(tokens, 0, names)
    if pos != len(tokens):
        raise ValueError("unexpected extra input after expression")
    return value


def _tokenize(expr: str) -> list:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = []
    pos = 0
    while pos < len(expr):
        if expr[pos].isspace():
            pos += 1
            continue
        match = _TOKEN_RE.match(expr, pos)
        if match is None:
            raise ValueError(
                f"unexpected character at position {pos}: {expr[pos]!r}"
            )
        tokens.append((match.lastgroup, match.group()))
        pos = match.end()
    return tokens


def _peek(tokens: list, pos: int):
    if pos < len(tokens):
        return tokens[pos]
    return (None, None)


def _parse_expr(tokens: list, pos: int, names: dict):
    value, pos = _parse_term(tokens, pos, names)
    while True:
        kind, text = _peek(tokens, pos)
        if kind == "sym" and text in ("+", "-"):
            pos += 1
            rhs, pos = _parse_term(tokens, pos, names)
            value = value + rhs if text == "+" else value - rhs
        else:
            return value, pos


def _parse_term(tokens: list, pos: int, names: dict):
    value, pos = _parse_unary(tokens, pos, names)
    while True:
        kind, text = _peek(tokens, pos)
        if kind == "sym" and text in ("*", "/"):
            pos += 1
            rhs, pos = _parse_unary(tokens, pos, names)
            if text == "*":
                value = value * rhs
            else:
                value = value / rhs
        else:
            return value, pos


def _parse_unary(tokens: list, pos: int, names: dict):
    minus_count = 0
    while True:
        kind, text = _peek(tokens, pos)
        if kind == "sym" and text in ("+", "-"):
            if text == "-":
                minus_count += 1
            pos += 1
        else:
            break
    value, pos = _parse_power(tokens, pos, names)
    if minus_count % 2:
        value = -value
    return value, pos


def _parse_power(tokens: list, pos: int, names: dict):
    base, pos = _parse_atom(tokens, pos, names)
    kind, text = _peek(tokens, pos)
    if kind == "sym" and text == "^":
        pos += 1
        exponent, pos = _parse_unary(tokens, pos, names)
        if exponent.denominator != 1:
            raise ValueError("exponent must be an integer")
        # Fraction(0) ** negative int raises ZeroDivisionError
        base = base ** int(exponent)
    return base, pos


def _parse_atom(tokens: list, pos: int, names: dict):
    kind, text = _peek(tokens, pos)
    if kind == "num":
        return Fraction(text), pos + 1
    if kind == "sym" and text == "(":
        pos += 1
        value, pos = _parse_unary(tokens, pos, names)
        kind, text = _peek(tokens, pos)
        if not (kind == "sym" and text == ")"):
            raise ValueError("expected ')' to match '('")
        return value, pos + 1
    if kind == "name":
        pos += 1
        next_kind, next_text = _peek(tokens, pos)
        if next_kind == "sym" and next_text == "(":
            if text in _FUNCTIONS:
                return _parse_call(tokens, pos, names, text)
            raise ValueError(f"unknown function: {text!r}")
        if text in _FUNCTIONS:
            raise ValueError(
                f"function {text!r} must be called with parentheses"
            )
        if text not in names:
            raise NameError(f"unknown variable: {text!r}")
        return Fraction(names[text]), pos
    raise ValueError("expected a number, variable, function call, or '('")


def _parse_call(tokens: list, pos: int, names: dict, name: str):
    pos += 1  # skip '('
    args = []
    value, pos = _parse_unary(tokens, pos, names)
    args.append(value)
    while True:
        kind, text = _peek(tokens, pos)
        if kind == "sym" and text == ",":
            pos += 1
            value, pos = _parse_unary(tokens, pos, names)
            args.append(value)
        else:
            break
    kind, text = _peek(tokens, pos)
    if not (kind == "sym" and text == ")"):
        raise ValueError(f"expected ')' to close the call to {name!r}")
    pos += 1
    required = _FUNCTIONS[name]
    if required is not None:
        if len(args) != required:
            raise ValueError(
                f"{name}() takes exactly {required} argument, "
                f"got {len(args)}"
            )
    elif not args:
        raise ValueError(f"{name}() requires at least 1 argument")
    if name == "abs":
        return abs(args[0]), pos
    return (min if name == "min" else max)(args), pos
```