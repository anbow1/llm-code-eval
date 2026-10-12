```python
import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"""
    (?P<NUMBER>\d+\.\d*|\.\d+|\d+)
    |(?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
    |(?P<OP>[+\-*/^(),])
    |(?P<WS>\s+)
    |(?P<OTHER>.)
    """,
    re.VERBOSE,
)


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    for match in _TOKEN_RE.finditer(expr):
        kind = match.lastgroup
        text = match.group()
        if kind == "WS":
            continue
        if kind == "OTHER":
            raise ValueError(f"Unexpected character {text!r}")
        tokens.append((kind, text))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    # --- token helpers -------------------------------------------------
    def _peek(self) -> tuple[str, str] | None:
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _next(self) -> tuple[str, str] | None:
        tok = self._peek()
        if tok is not None:
            self.pos += 1
        return tok

    def _match_op(self, *ops: str) -> str | None:
        tok = self._peek()
        if tok is not None and tok[0] == "OP" and tok[1] in ops:
            self.pos += 1
            return tok[1]
        return None

    def _expect_op(self, op: str) -> None:
        if self._match_op(op) is None:
            raise ValueError(f"Expected {op!r}")

    # --- grammar -------------------------------------------------------
    def parse_expression(self) -> Fraction:
        if self._peek() is None:
            raise ValueError("Empty expression")
        value = self._parse_additive()
        if self._peek() is not None:
            raise ValueError("Unexpected trailing tokens")
        return value

    def _parse_additive(self) -> Fraction:
        value = self._parse_multiplicative()
        while True:
            op = self._match_op("+", "-")
            if op is None:
                return value
            rhs = self._parse_multiplicative()
            if op == "+":
                value = value + rhs
            else:
                value = value - rhs

    def _parse_multiplicative(self) -> Fraction:
        value = self._parse_unary()
        while True:
            op = self._match_op("*", "/")
            if op is None:
                return value
            rhs = self._parse_unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                value = value / rhs

    def _parse_unary(self) -> Fraction:
        op = self._match_op("+", "-")
        if op is not None:
            value = self._parse_unary()
            return -value if op == "-" else value
        return self._parse_power()

    def _parse_power(self) -> Fraction:
        base = self._parse_atom()
        if self._match_op("^") is not None:
            exponent = self._parse_unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = exponent.numerator
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp
        return base

    def _parse_atom(self) -> Fraction:
        tok = self._next()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        kind, text = tok

        if kind == "NUMBER":
            return Fraction(text)

        if kind == "NAME":
            nxt = self._peek()
            if nxt is not None and nxt[0] == "OP" and nxt[1] == "(":
                self.pos += 1
                args = self._parse_arguments()
                return _call_function(text, args)
            if text not in self.variables:
                raise NameError(f"Unknown variable {text!r}")
            value = self.variables[text]
            return value if isinstance(value, Fraction) else Fraction(value)

        if tok == ("OP", "("):
            value = self._parse_additive()
            self._expect_op(")")
            return value

        raise ValueError(f"Unexpected token {text!r}")

    def _parse_arguments(self) -> list[Fraction]:
        args: list[Fraction] = []
        if self._match_op(")") is not None:
            return args
        args.append(self._parse_additive())
        while self._match_op(",") is not None:
            args.append(self._parse_additive())
        self._expect_op(")")
        return args


def _call_function(name: str, args: list[Fraction]) -> Fraction:
    if name == "abs":
        if len(args) != 1:
            raise ValueError("abs() takes exactly 1 argument")
        return abs(args[0])
    if name in ("min", "max"):
        if len(args) < 1:
            raise ValueError(f"{name}() takes at least 1 argument")
        return (min if name == "min" else max)(args)  # type: ignore[operator]
    raise ValueError(f"Unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    parser = _Parser(_tokenize(expr), variables)
    return parser.parse_expression()
```