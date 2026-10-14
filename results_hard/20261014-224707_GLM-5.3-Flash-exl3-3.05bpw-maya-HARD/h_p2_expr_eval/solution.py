from fractions import Fraction

_FUNCTIONS = {"abs", "min", "max"}


def _tokenize(text: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i, n = 0, len(text)
    while i < n:
        c = text[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or c == ".":
            j = i
            seen_dot = False
            while j < n and (text[j].isdigit() or (text[j] == "." and not seen_dot)):
                if text[j] == ".":
                    seen_dot = True
                j += 1
            literal = text[i:j]
            if literal == ".":
                raise ValueError(f"invalid number: {literal!r}")
            tokens.append(("num", literal))
            i = j
        elif c.isalpha() or c == "_":
            j = i
            while j < n and (text[j].isalnum() or text[j] == "_"):
                j += 1
            tokens.append(("name", text[i:j]))
            i = j
        elif c in "+-*/^(),":
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"unexpected character: {c!r}")
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict[str, Fraction]) -> None:
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def _peek_kind(self) -> str | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos][0]
        return None

    def _peek_text(self) -> str | None:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos][1]
        return None

    def _advance(self) -> tuple[str, str]:
        if self.pos >= len(self.tokens):
            raise ValueError("unexpected end of input")
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _expect(self, kind: str) -> tuple[str, str]:
        if self._peek_kind() != kind:
            raise ValueError(f"expected {kind!r}")
        return self._advance()

    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty input")
        value = self._expression()
        if self.pos != len(self.tokens):
            raise ValueError(f"unexpected token: {self._peek_text()!r}")
        return value

    def _expression(self) -> Fraction:
        value = self._term()
        while self._peek_kind() in ("+", "-"):
            op = self._advance()[0]
            rhs = self._term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def _term(self) -> Fraction:
        value = self._unary()
        while self._peek_kind() in ("*", "/"):
            op = self._advance()[0]
            rhs = self._unary()
            if op == "*":
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs
        return value

    def _unary(self) -> Fraction:
        sign = 1
        while self._peek_kind() in ("+", "-"):
            if self._advance()[0] == "-":
                sign = -sign
        value = self._power()
        return value if sign == 1 else -value

    def _power(self) -> Fraction:
        base = self._primary()
        if self._peek_kind() == "^":
            self._advance()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** int(exponent)
        return base

    def _primary(self) -> Fraction:
        kind = self._peek_kind()
        if kind == "num":
            return Fraction(self._advance()[1])
        if kind == "name":
            name = self._advance()[1]
            if self._peek_kind() == "(":
                if name not in _FUNCTIONS:
                    raise ValueError(f"unknown function: {name!r}")
                return self._call(name)
            if name in _FUNCTIONS:
                raise ValueError(f"function {name!r} requires parentheses")
            if name not in self.variables:
                raise NameError(f"unknown variable: {name!r}")
            return Fraction(self.variables[name])
        if kind == "(":
            self._advance()
            value = self._expression()
            self._expect(")")
            return value
        raise ValueError(f"unexpected token: {self._peek_text()!r}")

    def _call(self, name: str) -> Fraction:
        self._expect("(")
        args = [self._expression()]
        while self._peek_kind() == ",":
            self._advance()
            args.append(self._expression())
        self._expect(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument ({len(args)} given)")
            return abs(args[0])
        if len(args) < 1:
            raise ValueError(f"{name}() requires at least 1 argument")
        return min(args) if name == "min" else max(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    vars: dict[str, Fraction] = {}
    if variables:
        for key, value in variables.items():
            vars[key] = Fraction(value)
    return _Parser(tokens, vars).parse()
