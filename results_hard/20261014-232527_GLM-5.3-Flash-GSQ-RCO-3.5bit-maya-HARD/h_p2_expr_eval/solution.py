import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"""\s*(?:
        (?P<num>\d+\.\d*|\.\d+|\d+)
      | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
      | (?P<op>[+\-*/^(),])
    )""",
    re.VERBOSE,
)

_FUNCTIONS = {"abs", "min", "max"}


def _tokenize(expr: str):
    tokens = []
    pos = 0
    n = len(expr)
    while pos < n:
        m = _TOKEN_RE.match(expr, pos)
        if m is None:
            raise ValueError(f"invalid character at position {pos}: {expr[pos:]!r}")
        if m.group("num") is not None:
            tokens.append(("num", Fraction(m.group("num"))))
        elif m.group("name") is not None:
            tokens.append(("name", m.group("name")))
        else:
            tokens.append(("op", m.group("op")))
        pos = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.i = 0
        self.variables = variables

    def _peek_op(self, *ops):
        if self.i < len(self.tokens):
            kind, value = self.tokens[self.i]
            if kind == "op" and value in ops:
                return value
        return None

    def _expect_op(self, op):
        if self._peek_op(op) is None:
            raise ValueError(f"expected {op!r}")
        self.i += 1

    def parse(self):
        result = self._parse_add()
        if self.i != len(self.tokens):
            raise ValueError(f"unexpected token: {self.tokens[self.i]!r}")
        return result

    def _parse_add(self):
        result = self._parse_mul()
        while True:
            op = self._peek_op("+", "-")
            if op is None:
                return result
            self.i += 1
            rhs = self._parse_mul()
            if op == "+":
                result = result + rhs
            else:
                result = result - rhs

    def _parse_mul(self):
        result = self._parse_unary()
        while True:
            op = self._peek_op("*", "/")
            if op is None:
                return result
            self.i += 1
            rhs = self._parse_unary()
            if op == "*":
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                result = result / rhs

    def _parse_unary(self):
        op = self._peek_op("+", "-")
        if op is not None:
            self.i += 1
            value = self._parse_unary()
            return value if op == "+" else -value
        return self._parse_power()

    def _parse_power(self):
        base = self._parse_primary()
        if self._peek_op("^") is not None:
            self.i += 1
            exponent = self._parse_signed_power()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            exponent = int(exponent)
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            return base ** exponent
        return base

    def _parse_signed_power(self):
        sign = 1
        while True:
            op = self._peek_op("+", "-")
            if op is None:
                break
            self.i += 1
            if op == "-":
                sign = -sign
        return sign * self._parse_power()

    def _parse_primary(self):
        if self.i >= len(self.tokens):
            raise ValueError("unexpected end of expression")
        kind, value = self.tokens[self.i]
        if kind == "num":
            self.i += 1
            return value
        if kind == "name":
            self.i += 1
            if self._peek_op("(") is not None:
                self.i += 1
                args = self._parse_args()
                self._expect_op(")")
                return self._call_function(value, args)
            if value not in self.variables:
                raise NameError(f"unknown variable: {value!r}")
            raw = self.variables[value]
            if isinstance(raw, Fraction):
                return raw
            if isinstance(raw, int):
                return Fraction(raw)
            raise ValueError(f"invalid value for variable {value!r}: {raw!r}")
        if kind == "op" and value == "(":
            self.i += 1
            result = self._parse_add()
            self._expect_op(")")
            return result
        raise ValueError(f"unexpected token: {(kind, value)!r}")

    def _parse_args(self):
        args = [self._parse_add()]
        while self._peek_op(",") is not None:
            self.i += 1
            args.append(self._parse_add())
        return args

    def _call_function(self, name, args):
        if name not in _FUNCTIONS:
            raise ValueError(f"unknown function: {name!r}")
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if len(args) < 1:
            raise ValueError(f"{name}() takes at least 1 argument")
        return min(args) if name == "min" else max(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables if variables is not None else {})
    return parser.parse()
