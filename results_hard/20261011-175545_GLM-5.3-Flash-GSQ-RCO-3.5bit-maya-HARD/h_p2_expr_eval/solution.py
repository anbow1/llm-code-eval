import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"""
      (?P<ws>\s+)
    | (?P<num>\d+\.\d+|\d+\.|\.\d+|\d+)
    | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
    | (?P<op>[+\-*/^(),])
    """,
    re.VERBOSE,
)

_FUNCTIONS = ("abs", "min", "max")


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    while pos < len(s):
        m = _TOKEN_RE.match(s, pos)
        if m is None:
            raise ValueError(f"unexpected character {s[pos]!r}")
        pos = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        tokens.append((kind, m.group()))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None) -> None:
        self._tokens = tokens
        self._i = 0
        self._variables = variables if variables is not None else {}

    def parse(self) -> Fraction:
        value = self._parse_expr()
        if self._i != len(self._tokens):
            raise ValueError(f"unexpected token {self._tokens[self._i][1]!r}")
        return value

    def _peek(self) -> tuple[str, str] | None:
        if self._i < len(self._tokens):
            return self._tokens[self._i]
        return None

    def _match_op(self, *ops: str) -> str | None:
        tok = self._peek()
        if tok is not None and tok[0] == "op" and tok[1] in ops:
            self._i += 1
            return tok[1]
        return None

    def _expect_op(self, op: str) -> None:
        if self._match_op(op) is None:
            tok = self._peek()
            got = tok[1] if tok is not None else "end of input"
            raise ValueError(f"expected {op!r}, got {got!r}")

    def _parse_expr(self) -> Fraction:
        value = self._parse_term()
        while True:
            op = self._match_op("+", "-")
            if op is None:
                return value
            rhs = self._parse_term()
            if op == "+":
                value = value + rhs
            else:
                value = value - rhs

    def _parse_term(self) -> Fraction:
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
                    raise ZeroDivisionError("division by zero")
                value = value / rhs

    def _parse_unary(self) -> Fraction:
        op = self._match_op("+", "-")
        if op is not None:
            value = self._parse_unary()
            return value if op == "+" else -value
        return self._parse_power()

    def _parse_power(self) -> Fraction:
        base = self._parse_primary()
        if self._match_op("^") is not None:
            exponent = self._parse_unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** int(exponent)
        return base

    def _parse_primary(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, text = tok
        if kind == "num":
            self._i += 1
            return Fraction(text)
        if kind == "name":
            self._i += 1
            nxt = self._peek()
            if nxt is not None and nxt[0] == "op" and nxt[1] == "(":
                self._i += 1
                return self._parse_call(text)
            if text in _FUNCTIONS:
                raise ValueError(f"function {text!r} must be called with parentheses")
            if text not in self._variables:
                raise NameError(f"unknown variable {text!r}")
            value = self._variables[text]
            return value if isinstance(value, Fraction) else Fraction(value)
        if kind == "op" and text == "(":
            self._i += 1
            value = self._parse_expr()
            self._expect_op(")")
            return value
        raise ValueError(f"unexpected token {text!r}")

    def _parse_call(self, name: str) -> Fraction:
        args = [self._parse_expr()]
        while self._match_op(",") is not None:
            args.append(self._parse_expr())
        self._expect_op(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        if name == "max":
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    return parser.parse()
