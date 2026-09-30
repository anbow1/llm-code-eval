import fractions
import re

Fraction = fractions.Fraction

_NUMBER_RE = re.compile(r"(?:[0-9]+\.[0-9]*|\.[0-9]+|[0-9]+)")
_NAME_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
_PUNCT_CHARS = frozenset("+-*/^(),")
_FUNCTION_NAMES = frozenset({"abs", "min", "max"})


def _tokenize(text: str) -> list[tuple[str, str | None]]:
    tokens: list[tuple[str, str | None]] = []
    i = 0
    n = len(text)

    while i < n:
        c = text[i]

        if c.isspace():
            i += 1
            continue

        m = _NUMBER_RE.match(text, i)
        if m:
            tokens.append(("number", m.group()))
            i = m.end()
            continue

        m = _NAME_RE.match(text, i)
        if m:
            tokens.append(("name", m.group()))
            i = m.end()
            continue

        if c in _PUNCT_CHARS:
            tokens.append(("op", c))
            i += 1
            continue

        raise ValueError(f"invalid character {c!r}")

    tokens.append(("eof", None))
    return tokens


def _number_to_fraction(text: str) -> Fraction:
    if not text or text == "." or text.count(".") > 1:
        raise ValueError("invalid number")

    if "." not in text:
        return Fraction(int(text))

    integer_part, fractional_part = text.split(".", 1)

    if not integer_part:
        integer_part = "0"

    if not fractional_part:
        return Fraction(int(integer_part))

    numerator = int(integer_part + fractional_part)
    denominator = 10 ** len(fractional_part)
    return Fraction(numerator, denominator)


class _Parser:
    def __init__(self, tokens: list[tuple[str, str | None]]) -> None:
        self.tokens = tokens
        self.pos = 0

    def _peek(self) -> tuple[str, str | None]:
        return self.tokens[self.pos]

    def _advance(self) -> tuple[str, str | None]:
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def _at(self, kind: str, value: str | None = None) -> bool:
        token = self._peek()
        return token[0] == kind and (value is None or token[1] == value)

    def parse(self):
        node = self.parse_expression()
        if not self._at("eof"):
            raise ValueError("unexpected trailing tokens")
        return node

    def _consume_unary_signs(self) -> bool:
        negate = False

        while True:
            if self._at("op", "+"):
                self._advance()
            elif self._at("op", "-"):
                self._advance()
                negate = not negate
            else:
                break

        return negate

    def parse_expression(self):
        node = self.parse_term()

        while self._at("op", "+") or self._at("op", "-"):
            op = self._advance()[1]
            rhs = self.parse_term()
            node = ("binary", op, node, rhs)

        return node

    def parse_term(self):
        node = self.parse_unary()

        while self._at("op", "*") or self._at("op", "/"):
            op = self._advance()[1]
            rhs = self.parse_unary()
            node = ("binary", op, node, rhs)

        return node

    def parse_unary(self):
        negate = self._consume_unary_signs()
        operand = self.parse_power()

        if negate:
            operand = ("unary", "-", operand)

        return operand

    def parse_power(self):
        base = self.parse_primary()
        operands: list[tuple[bool, object]] = []

        while self._at("op", "^"):
            self._advance()
            negate = self._consume_unary_signs()
            operand = self.parse_primary()
            operands.append((negate, operand))

        if not operands:
            return base

        node = operands[-1][1]
        if operands[-1][0]:
            node = ("unary", "-", node)

        for negate, operand in reversed(operands[:-1]):
            node = ("power", operand, node)
            if negate:
                node = ("unary", "-", node)

        return ("power", base, node)

    def _parse_function_args(self) -> list[object]:
        self._advance()  # '('

        args: list[object] = []

        if self._at("op", ")"):
            self._advance()
            return args

        while True:
            args.append(self.parse_expression())

            if self._at("op", ","):
                self._advance()
            else:
                break

        if not self._at("op", ")"):
            raise ValueError("missing closing parenthesis in function call")

        self._advance()
        return args

    def parse_primary(self):
        kind, value = self._peek()

        if kind == "number":
            self._advance()
            return ("num", _number_to_fraction(value))

        if kind == "name":
            self._advance()

            if self._at("op", "("):
                if value in _FUNCTION_NAMES:
                    args = self._parse_function_args()
                    return ("call", value, args)

                raise ValueError(f"unknown function {value!r}")

            return ("var", value, value in _FUNCTION_NAMES)

        if kind == "op" and value == "(":
            self._advance()
            node = self.parse_expression()

            if not self._at("op", ")"):
                raise ValueError("missing closing parenthesis")

            self._advance()
            return node

        raise ValueError(f"unexpected token {value!r}")


def _to_fraction(value: object) -> Fraction:
    if isinstance(value, Fraction):
        return value
    return Fraction(value)


def _apply_power(base: Fraction, exponent: Fraction) -> Fraction:
    if exponent.denominator != 1:
        raise ValueError("exponent must be an integer")

    exp = int(exponent)

    if base == 0 and exp < 0:
        raise ZeroDivisionError("0 cannot be raised to a negative power")

    return base ** exp


def _evaluate(node: object, variables: dict) -> Fraction:
    kind = node[0]

    if kind == "num":
        return node[1]

    if kind == "var":
        _, name, is_function_name = node

        if name in variables:
            return _to_fraction(variables[name])

        if is_function_name:
            raise ValueError(f"function {name!r} requires parentheses")

        raise NameError(f"unknown variable {name!r}")

    if kind == "unary":
        _, _, operand = node
        value = _evaluate(operand, variables)
        return -value

    if kind == "binary":
        _, op, left_node, right_node = node

        left = _evaluate(left_node, variables)
        right = _evaluate(right_node, variables)

        if op == "+":
            return left + right
        if op == "-":
            return left - right
        if op == "*":
            return left * right

        if right == 0:
            raise ZeroDivisionError("division by zero")
        return left / right

    if kind == "power":
        base = _evaluate(node[1], variables)
        exponent = _evaluate(node[2], variables)
        return _apply_power(base, exponent)

    if kind == "call":
        _, name, args = node

        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() requires exactly one argument")
            return abs(_evaluate(args[0], variables))

        if name == "min":
            if not args:
                raise ValueError("min() requires at least one argument")

            best = _evaluate(args[0], variables)
            for arg in args[1:]:
                value = _evaluate(arg, variables)
                if value < best:
                    best = value
            return best

        if name == "max":
            if not args:
                raise ValueError("max() requires at least one argument")

            best = _evaluate(args[0], variables)
            for arg in args[1:]:
                value = _evaluate(arg, variables)
                if value > best:
                    best = value
            return best

        raise ValueError(f"unknown function {name!r}")

    raise ValueError("invalid expression")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    token_stream = _tokenize(expr)
    ast = _Parser(token_stream).parse()
    return _evaluate(ast, {} if variables is None else variables)
