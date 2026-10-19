import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"""
    (?P<NUMBER>\d+(?:\.\d*)?|\.\d+)
  | (?P<NAME>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<OP>[+\-*/^])
  | (?P<LPAREN>\()
  | (?P<RPAREN>\))
  | (?P<COMMA>,)
    """,
    re.VERBOSE,
)

_FUNCTIONS = {"abs", "min", "max"}


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(s, i)
        if m is None:
            raise ValueError(f"invalid character {s[i]!r} at position {i}")
        tokens.append((m.lastgroup, m.group()))
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self) -> tuple[str, str] | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def advance(self) -> tuple[str, str]:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, kind: str, text: str) -> None:
        tok = self.peek()
        if tok is None:
            raise ValueError(f"unexpected end of input, expected {text!r}")
        if tok[0] != kind or tok[1] != text:
            raise ValueError(f"expected {text!r}, got {tok[1]!r}")
        self.pos += 1

    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty expression")
        result = self.parse_expr()
        if self.pos != len(self.tokens):
            raise ValueError(f"unexpected trailing token {self.tokens[self.pos][1]!r}")
        return result

    def parse_expr(self) -> Fraction:
        value = self.parse_term()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "OP" and tok[1] in ("+", "-"):
                self.pos += 1
                rhs = self.parse_term()
                if tok[1] == "+":
                    value = value + rhs
                else:
                    value = value - rhs
            else:
                return value

    def parse_term(self) -> Fraction:
        value = self.parse_unary()
        while True:
            tok = self.peek()
            if tok is not None and tok[0] == "OP" and tok[1] in ("*", "/"):
                self.pos += 1
                rhs = self.parse_unary()
                if tok[1] == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def parse_unary(self) -> Fraction:
        tok = self.peek()
        if tok is not None and tok[0] == "OP" and tok[1] in ("+", "-"):
            self.pos += 1
            value = self.parse_unary()
            return value if tok[1] == "+" else -value
        return self.parse_power()

    def parse_power(self) -> Fraction:
        base = self.parse_atom()
        tok = self.peek()
        if tok is not None and tok[0] == "OP" and tok[1] == "^":
            self.pos += 1
            exponent = self.parse_unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            exp = int(exponent)
            if exp < 0 and base == 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** exp
        return base

    def parse_atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("unexpected end of input, expected a value")
        kind, text = tok

        if kind == "NUMBER":
            self.pos += 1
            return Fraction(text)

        if kind == "NAME":
            self.pos += 1
            nxt = self.peek()
            if text in _FUNCTIONS:
                if nxt is None or nxt != ("LPAREN", "("):
                    raise ValueError(f"function {text!r} must be followed by '('")
                self.pos += 1
                args = [self.parse_expr()]
                while True:
                    tok = self.peek()
                    if tok == ("COMMA", ","):
                        self.pos += 1
                        args.append(self.parse_expr())
                    else:
                        break
                self.expect("RPAREN", ")")
                if text == "abs":
                    if len(args) != 1:
                        raise ValueError("abs() takes exactly 1 argument")
                    return abs(args[0])
                if len(args) < 1:
                    raise ValueError(f"{text}() takes at least 1 argument")
                return min(args) if text == "min" else max(args)
            # plain variable
            if text not in self.variables:
                raise NameError(f"unknown variable {text!r}")
            return Fraction(self.variables[text])

        if kind == "LPAREN":
            self.pos += 1
            value = self.parse_expr()
            self.expect("RPAREN", ")")
            return value

        raise ValueError(f"unexpected token {text!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
