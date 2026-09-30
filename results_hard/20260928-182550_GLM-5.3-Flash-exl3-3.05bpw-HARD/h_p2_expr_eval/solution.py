import re
from fractions import Fraction


_TOKEN_RE = re.compile(
    r"(?P<ws>\s+)"
    r"|(?P<num>\d+(?:\.\d*)?|\.\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<sym>[+\-*/^(),])"
)

_FUNCTIONS = {"abs", "min", "max"}


def _make_number(text: str) -> Fraction:
    # Exact conversion; never goes through float.
    if "." in text:
        whole_part, frac_part = text.split(".")
        whole = int(whole_part) if whole_part else 0
        if frac_part:
            return Fraction(whole) + Fraction(int(frac_part), 10 ** len(frac_part))
        return Fraction(whole)
    return Fraction(int(text))


def _tokenize(source: str):
    tokens = []
    pos = 0
    length = len(source)
    while pos < length:
        match = _TOKEN_RE.match(source, pos)
        if match is None:
            raise ValueError(f"unexpected character {source[pos]!r} at position {pos}")
        kind = match.lastgroup
        if kind == "num":
            tokens.append(("num", match.group("num")))
        elif kind == "name":
            tokens.append(("name", match.group("name")))
        elif kind == "sym":
            tokens.append(("sym", match.group("sym")))
        pos = match.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def _peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _next(self):
        token = self._peek()
        if token is None:
            raise ValueError("unexpected end of input")
        self.pos += 1
        return token

    def _expect(self, symbol: str):
        token = self._peek()
        if token != ("sym", symbol):
            raise ValueError(f"expected {symbol!r}")
        self.pos += 1

    def parse(self) -> Fraction:
        result = self._expr()
        if self._peek() is not None:
            raise ValueError("unexpected trailing tokens")
        return result

    def _expr(self) -> Fraction:
        value = self._term()
        while True:
            token = self._peek()
            if token == ("sym", "+"):
                self.pos += 1
                value = value + self._term()
            elif token == ("sym", "-"):
                self.pos += 1
                value = value - self._term()
            else:
                return value

    def _term(self) -> Fraction:
        value = self._unary()
        while True:
            token = self._peek()
            if token == ("sym", "*"):
                self.pos += 1
                value = value * self._unary()
            elif token == ("sym", "/"):
                self.pos += 1
                divisor = self._unary()
                if divisor == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / divisor
            else:
                return value

    def _unary(self) -> Fraction:
        token = self._peek()
        if token == ("sym", "+"):
            self.pos += 1
            return self._unary()
        if token == ("sym", "-"):
            self.pos += 1
            return -self._unary()
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self._peek() == ("sym", "^"):
            self.pos += 1
            exponent = self._unary()  # right-associative; allows signs after ^
            if not isinstance(exponent, Fraction) or exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** int(exponent)
        return base

    def _atom(self) -> Fraction:
        kind, value = self._next()
        if kind == "num":
            return _make_number(value)
        if kind == "sym" and value == "(":
            inner = self._expr()
            self._expect(")")
            return inner
        if kind == "name":
            nxt = self._peek()
            if nxt == ("sym", "("):
                self.pos += 1
                return self._call(value)
            if value in _FUNCTIONS:
                raise ValueError(f"function {value!r} must be called with parentheses")
            if value not in self.variables:
                raise NameError(f"name {value!r} is not defined")
            variable_value = self.variables[value]
            return variable_value if isinstance(variable_value, Fraction) else Fraction(variable_value)
        raise ValueError(f"unexpected token {value!r}")

    def _call(self, name: str) -> Fraction:
        if name not in _FUNCTIONS:
            raise ValueError(f"unknown function {name!r}")
        arguments = [self._expr()]
        while self._peek() == ("sym", ","):
            self.pos += 1
            arguments.append(self._expr())
        self._expect(")")
        if name == "abs":
            if len(arguments) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(arguments[0])
        if not arguments:
            raise ValueError(f"{name}() takes at least 1 argument")
        return min(arguments) if name == "min" else max(arguments)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables if variables is not None else {})
    return parser.parse()
