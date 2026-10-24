import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"\s*(?:"
    r"(?P<num>\d+\.\d*|\.\d+|\d+)"
    r"|(?P<name>[A-Za-z_][A-Za-z0-9_]*)"
    r"|(?P<op>[-+*/^(),])"
    r")"
)

_FUNCTION_NAMES = {"abs", "min", "max"}


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    length = len(expr)
    while pos < length:
        match = _TOKEN_RE.match(expr, pos)
        if match is None:
            if expr[pos:].strip() == "":
                break
            raise ValueError(f"invalid character at position {pos}")
        pos = match.end()
        if match.group("num") is not None:
            tokens.append(("num", match.group("num")))
        elif match.group("name") is not None:
            tokens.append(("name", match.group("name")))
        else:
            tokens.append(("op", match.group("op")))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict) -> None:
        self._tokens = tokens
        self._variables = variables
        self._pos = 0

    def _peek(self) -> tuple[str | None, str | None]:
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return (None, None)

    def _advance(self) -> None:
        self._pos += 1

    def _expect_op(self, op: str) -> None:
        kind, text = self._peek()
        if kind == "op" and text == op:
            self._advance()
        else:
            raise ValueError(f"expected '{op}'")

    def parse_expression(self) -> Fraction:
        value = self.parse_term()
        while True:
            kind, text = self._peek()
            if kind == "op" and text in ("+", "-"):
                self._advance()
                rhs = self.parse_term()
                value = value + rhs if text == "+" else value - rhs
            else:
                return value

    def parse_term(self) -> Fraction:
        value = self.parse_factor()
        while True:
            kind, text = self._peek()
            if kind == "op" and text in ("*", "/"):
                self._advance()
                rhs = self.parse_factor()
                if text == "*":
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def parse_factor(self) -> Fraction:
        kind, text = self._peek()
        if kind == "op" and text in ("+", "-"):
            self._advance()
            value = self.parse_factor()
            return value if text == "+" else -value
        return self.parse_power()

    def parse_power(self) -> Fraction:
        base = self.parse_atom()
        kind, text = self._peek()
        if kind == "op" and text == "^":
            self._advance()
            exponent = self.parse_factor()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** exp
        return base

    def parse_atom(self) -> Fraction:
        kind, text = self._peek()
        if kind == "num":
            self._advance()
            return Fraction(text)
        if kind == "name":
            self._advance()
            next_kind, next_text = self._peek()
            if next_kind == "op" and next_text == "(":
                return self._parse_call(text)
            if text in _FUNCTION_NAMES:
                raise ValueError(f"function '{text}' requires parentheses")
            if text not in self._variables:
                raise NameError(f"unknown variable '{text}'")
            return Fraction(self._variables[text])
        if kind == "op" and text == "(":
            self._advance()
            value = self.parse_expression()
            self._expect_op(")")
            return value
        raise ValueError("unexpected token")


    def _parse_call(self, name: str) -> Fraction:
        self._expect_op("(")
        args: list[Fraction] = [self.parse_expression()]
        while True:
            kind, text = self._peek()
            if kind == "op" and text == ",":
                self._advance()
                args.append(self.parse_expression())
            else:
                break
        self._expect_op(")")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if len(args) < 1:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == "max":
            if len(args) < 1:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function '{name}'")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    parser = _Parser(tokens, {} if variables is None else variables)
    result = parser.parse_expression()
    if parser._pos != len(tokens):
        raise ValueError("trailing tokens")
    return result
