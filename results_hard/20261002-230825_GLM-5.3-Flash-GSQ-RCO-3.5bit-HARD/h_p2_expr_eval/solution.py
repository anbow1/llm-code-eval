import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"""
      (?P<NUMBER> \d+\.\d* | \.\d+ | \d+ )
    | (?P<NAME>   [A-Za-z_][A-Za-z0-9_]* )
    | (?P<OP>     [+\-*/^(),] )
    | (?P<WS>     \s+ )
    """,
    re.VERBOSE,
)


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens = []
    pos = 0
    n = len(s)
    while pos < n:
        m = _TOKEN_RE.match(s, pos)
        if m is None:
            raise ValueError(f"unexpected character at position {pos}: {s[pos]!r}")
        pos = m.end()
        kind = m.lastgroup
        if kind != "WS":
            tokens.append((kind, m.group()))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables if variables is not None else {}

    def _peek(self) -> tuple[str, str] | None:
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _advance(self) -> tuple[str, str]:
        tok = self._tokens[self._pos]
        self._pos += 1
        return tok

    def _expect(self, text: str) -> None:
        tok = self._peek()
        if tok is None or tok[1] != text:
            found = "end of input" if tok is None else repr(tok[1])
            raise ValueError(f"expected {text!r}, got {found}")
        self._pos += 1

    def parse(self) -> Fraction:
        if not self._tokens:
            raise ValueError("empty input")
        value = self._expr()
        if self._pos != len(self._tokens):
            raise ValueError(f"unexpected trailing token {self._tokens[self._pos][1]!r}")
        return value

    def _expr(self) -> Fraction:
        value = self._term()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == "OP" and tok[1] in ("+", "-"):
                self._pos += 1
                rhs = self._term()
                value = value + rhs if tok[1] == "+" else value - rhs
            else:
                return value

    def _term(self) -> Fraction:
        value = self._unary()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == "OP" and tok[1] in ("*", "/"):
                self._pos += 1
                rhs = self._unary()
                if tok[1] == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def _unary(self) -> Fraction:
        tok = self._peek()
        if tok is not None and tok[0] == "OP" and tok[1] in ("+", "-"):
            self._pos += 1
            value = self._unary()
            return -value if tok[1] == "-" else value
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        tok = self._peek()
        if tok is not None and tok[0] == "OP" and tok[1] == "^":
            self._pos += 1
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError(f"exponent must be an integer, got {exponent}")
            exp_int = int(exponent)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp_int
        return base

    def _atom(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, text = tok
        if kind == "NUMBER":
            self._pos += 1
            return Fraction(text)
        if kind == "NAME":
            self._pos += 1
            nxt = self._peek()
            if nxt is not None and nxt[0] == "OP" and nxt[1] == "(":
                self._pos += 1
                args = [self._expr()]
                while True:
                    peek = self._peek()
                    if peek is not None and peek[0] == "OP" and peek[1] == ",":
                        self._pos += 1
                        args.append(self._expr())
                    else:
                        break
                self._expect(")")
                return self._call(text, args)
            if text not in self._variables:
                raise NameError(f"unknown variable {text!r}")
            return Fraction(self._variables[text])
        if kind == "OP" and text == "(":
            self._pos += 1
            value = self._expr()
            self._expect(")")
            return value
        raise ValueError(f"unexpected token {text!r}")

    def _call(self, name: str, args: list[Fraction]) -> Fraction:
        if name == "abs":
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument ({len(args)} given)")
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
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
