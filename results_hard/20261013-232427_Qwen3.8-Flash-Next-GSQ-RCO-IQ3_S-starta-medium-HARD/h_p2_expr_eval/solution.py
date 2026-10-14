import builtins
import re
from fractions import Fraction


_FUNCTION_NAMES = frozenset({"abs", "min", "max"})

_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
    |(?P<number>\d+(?:\.\d*)?|\.\d+)
    |(?P<name>[A-Za-z_][A-Za-z0-9_]*)
    |(?P<op>[-+*/^(),])
    """,
    re.VERBOSE | re.ASCII,
)


def _tokenize(expr: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    n = len(expr)

    while pos < n:
        m = _TOKEN_RE.match(expr, pos)
        if m is None:
            raise ValueError("invalid character")

        pos = m.end()

        if m.group("ws") is not None:
            continue
        if m.group("number") is not None:
            tokens.append(("number", m.group("number")))
        elif m.group("name") is not None:
            tokens.append(("name", m.group("name")))
        else:
            tokens.append(("op", m.group("op")))

    if not tokens:
        raise ValueError("empty expression")
    return tokens


def _decimal_to_fraction(text: str) -> Fraction:
    if "." not in text:
        return Fraction(int(text), 1)

    whole, frac = text.split(".", 1)
    whole_value = int(whole) if whole else 0

    if not frac:
        return Fraction(whole_value, 1)

    denominator = 10 ** len(frac)
    frac_value = int(frac)
    return Fraction(whole_value * denominator + frac_value, denominator)


def _coerce_value(value: object) -> Fraction:
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value, 1)
    return Fraction(value)


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]], variables: dict | None) -> None:
        self._tokens = tokens
        self._pos = 0
        self._variables = variables if variables is not None else {}

    def _peek(self) -> tuple[str, str | None]:
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return ("EOF", None)

    def _accept(self, token_type: str, token_text: str | None = None) -> bool:
        tok = self._peek()
        if tok[0] == token_type and (token_text is None or tok[1] == token_text):
            self._pos += 1
            return True
        return False

    def parse(self) -> tuple:
        node = self._parse_addsub()
        if self._peek()[0] != "EOF":
            raise ValueError("trailing tokens")
        return node

    def _parse_addsub(self) -> tuple:
        left = self._parse_muldiv()

        while True:
            if self._accept("op", "+"):
                right = self._parse_muldiv()
                left = ("add", left, right)
            elif self._accept("op", "-"):
                right = self._parse_muldiv()
                left = ("sub", left, right)
            else:
                break

        return left

    def _parse_muldiv(self) -> tuple:
        left = self._parse_signed_power()

        while True:
            if self._accept("op", "*"):
                right = self._parse_signed_power()
                left = ("mul", left, right)
            elif self._accept("op", "/"):
                right = self._parse_signed_power()
                left = ("div", left, right)
            else:
                break

        return left

    def _parse_signed_power(self) -> tuple:
        negative = False

        while True:
            token_type, token_text = self._peek()
            if token_type == "op" and token_text in ("+", "-"):
                self._pos += 1
                if token_text == "-":
                    negative = not negative
                continue
            break

        node = self._parse_power()
        if negative:
            node = ("neg", node)
        return node

    def _consume_prefix_signs(self) -> bool:
        negative = False

        while True:
            token_type, token_text = self._peek()
            if token_type == "op" and token_text in ("+", "-"):
                self._pos += 1
                if token_text == "-":
                    negative = not negative
                continue
            break

        return negative

    def _parse_power(self) -> tuple:
        segments = [self._parse_primary()]
        signs = [False]

        while self._accept("op", "^"):
            negative = self._consume_prefix_signs()
            primary = self._parse_primary()
            segments.append(primary)
            signs.append(negative)

        current = segments[-1]
        if signs[-1]:
            current = ("neg", current)

        for i in range(len(segments) - 2, -1, -1):
            current = ("pow", segments[i], current)
            if signs[i]:
                current = ("neg", current)

        return current

    def _parse_primary(self) -> tuple:
        token_type, token_text = self._peek()

        if token_type == "number":
            self._pos += 1
            return ("num", token_text)

        if token_type == "name":
            self._pos += 1
            return self._resolve_name(token_text)

        if token_type == "op" and token_text == "(":
            self._pos += 1
            node = self._parse_addsub()
            if not self._accept("op", ")"):
                raise ValueError("missing ')'")
            return node

        raise ValueError("invalid expression")

    def _resolve_name(self, name: str) -> tuple:
        if name in _FUNCTION_NAMES:
            if self._accept("op", "("):
                args = self._parse_args()

                if name == "abs":
                    if len(args) != 1:
                        raise ValueError("abs() requires exactly one argument")
                else:
                    if not args:
                        raise ValueError("min()/max() require at least one argument")

                return ("call", name, args)

            if name in self._variables:
                return ("var", name)

            raise ValueError("unknown function")

        if self._peek()[0] == "op" and self._peek()[1] == "(":
            raise ValueError("unknown function")

        return ("var", name)

    def _parse_args(self) -> list[tuple]:
        args: list[tuple] = []

        if self._accept("op", ")"):
            return args

        while True:
            args.append(self._parse_addsub())
            if self._accept("op", ","):
                continue
            break

        if not self._accept("op", ")"):
            raise ValueError("missing ')'")

        return args


def _evaluate_ast(ast: tuple, variables: dict) -> Fraction:
    pending = [(False, ast)]
    value_stack: list[Fraction] = []

    while pending:
        visited, node = pending.pop()

        if not visited:
            kind = node[0]

            if kind == "num":
                value_stack.append(_decimal_to_fraction(node[1]))
                continue

            if kind == "var":
                name = node[1]
                try:
                    value = variables[name]
                except KeyError:
                    raise NameError(f"unknown name: {name}") from None
                value_stack.append(_coerce_value(value))
                continue

            pending.append((True, node))

            if kind in ("add", "sub", "mul", "div", "pow"):
                pending.append((False, node[2]))
                pending.append((False, node[1]))
            elif kind == "neg":
                pending.append((False, node[1]))
            elif kind == "call":
                for arg in reversed(node[2]):
                    pending.append((False, arg))
            else:
                raise ValueError("internal parse error")

        else:
            kind = node[0]

            if kind == "add":
                right = value_stack.pop()
                left = value_stack.pop()
                value_stack.append(left + right)

            elif kind == "sub":
                right = value_stack.pop()
                left = value_stack.pop()
                value_stack.append(left - right)

            elif kind == "mul":
                right = value_stack.pop()
                left = value_stack.pop()
                value_stack.append(left * right)

            elif kind == "div":
                right = value_stack.pop()
                left = value_stack.pop()
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                value_stack.append(left / right)

            elif kind == "pow":
                exponent = value_stack.pop()
                base = value_stack.pop()

                if exponent.denominator != 1:
                    raise ValueError("exponent must be an integer")

                exp = exponent.numerator

                if base == 0:
                    if exp < 0:
                        raise ZeroDivisionError("0 raised to a negative power")
                    if exp == 0:
                        value_stack.append(Fraction(1, 1))
                    else:
                        value_stack.append(Fraction(0, 1))
                    continue

                if base == 1:
                    value_stack.append(Fraction(1, 1))
                    continue

                if base == -1:
                    value_stack.append(Fraction(1 if exp % 2 == 0 else -1, 1))
                    continue

                value_stack.append(pow(base, exp))

            elif kind == "neg":
                value_stack.append(-value_stack.pop())

            elif kind == "call":
                call_name = node[1]
                args = [value_stack.pop() for _ in range(len(node[2]))]
                args.reverse()

                if call_name == "abs":
                    if len(args) != 1:
                        raise ValueError("abs() requires exactly one argument")
                    value_stack.append(builtins.abs(args[0]))
                elif call_name == "min":
                    if not args:
                        raise ValueError("min() requires at least one argument")
                    value_stack.append(builtins.min(args))
                elif call_name == "max":
                    if not args:
                        raise ValueError("max() requires at least one argument")
                    value_stack.append(builtins.max(args))
                else:
                    raise ValueError("unknown function")

            else:
                raise ValueError("internal parse error")

    if len(value_stack) != 1:
        raise ValueError("internal parse error")
    return value_stack[0]


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    ast = parser.parse()
    return _evaluate_ast(ast, variables if variables is not None else {})
