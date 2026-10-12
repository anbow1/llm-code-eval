```python
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


def _tokenize(text: str) -> list[str]:
    tokens: list[str] = []
    pos = 0
    n = len(text)
    while pos < n:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ValueError(f"unexpected character {text[pos]!r} at position {pos}")
        kind = m.lastgroup
        if kind != "ws":
            tokens.append(m.group())
        pos = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens: list[str], variables: dict[str, object]) -> None:
        self._tokens = tokens
        self._variables = variables
        self._pos = 0

    def _peek(self) -> str | None:
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _next(self) -> str | None:
        tok = self._peek()
        if tok is not None:
            self._pos += 1
        return tok

    def _expect(self, tok: str) -> None:
        if self._next() != tok:
            raise ValueError(f"expected {tok!r}")

    def parse(self) -> Fraction:
        value = self._expression()
        if self._peek() is not None:
            raise ValueError(f"unexpected trailing token {self._peek()!r}")
        return value

    def _expression(self) -> Fraction:
        value = self._term()
        while True:
            tok = self._peek()
            if tok == "+":
                self._next()
                value += self._term()
            elif tok == "-":
                self._next()
                value -= self._term()
            else:
                return value

    def _term(self) -> Fraction:
        value = self._unary()
        while True:
            tok = self._peek()
            if tok == "*":
                self._next()
                value *= self._unary()
            elif tok == "/":
                self._next()
                divisor = self._unary()
                if divisor == 0:
                    raise ZeroDivisionError("division by zero")
                value /= divisor
            else:
                return value

    def _unary(self) -> Fraction:
        tok = self._peek()
        if tok == "+":
            self._next()
            return self._unary()
        if tok == "-":
            self._next()
            return -self._unary()
        return self._power()

    def _power(self) -> Fraction:
        base = self._primary()
        if self._peek() == "^":
            self._next()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = int(exponent)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** exp_int
        return base

    def _primary(self) -> Fraction:
        tok = self._next()
        if tok is None:
            raise ValueError("unexpected end of input")
        if tok == "(":
            value = self._expression()
            self._expect(")")
            return value
        if _NUM_TOKEN.match(tok):
            return Fraction(tok)
        if _NAME_TOKEN.match(tok):
            if self._peek() == "(":
                self._next()
                args = [self._expression()]
                while self._peek() == ",":
                    self._next()
                    args.append(self._expression())
                self._expect(")")
                return self._call_function(tok, args)
            if tok not in self._variables:
                raise NameError(f"unknown variable {tok!r}")
            raw = self._variables[tok]
            if isinstance(raw, Fraction):
                return raw
            return Fraction(raw)
        raise ValueError(f"unexpected token {tok!r}")

    def _call_function(self, name: str, args: list[Fraction]) -> Fraction:
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


_NUM_TOKEN = re.compile(r"\d+\.\d+|\d+\.|\.\d+|\d+\Z")
_NAME_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_]*\Z")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, variables if variables is not None else {})
    return parser.parse()
```