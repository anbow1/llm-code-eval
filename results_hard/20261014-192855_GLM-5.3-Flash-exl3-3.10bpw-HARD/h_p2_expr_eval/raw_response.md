```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r"""
    (?P<number>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<op>[+\-*/^(),])
    """,
    re.VERBOSE,
)

_FUNCTIONS = ("abs", "min", "max")


def _tokenize(source):
    tokens = []
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch.isspace():
            i += 1
            continue
        m = _TOKEN_RE.match(source, i)
        if m is None:
            raise ValueError(f"unexpected character {ch!r}")
        kind = m.lastgroup
        if kind == "number":
            # Fraction(string) gives an exact decimal conversion.
            tokens.append(("num", Fraction(m.group())))
        else:
            tokens.append((kind, m.group()))
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = {} if variables is None else variables

    # -- token helpers -------------------------------------------------

    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return (None, None)

    def _advance(self):
        tok = self._peek()
        self._pos += 1
        return tok

    def _at_op(self, *ops):
        kind, val = self._peek()
        return kind == "op" and val in ops

    def _expect_op(self, op):
        if not self._at_op(op):
            raise ValueError(f"expected {op!r}")
        self._advance()

    # -- entry point ---------------------------------------------------

    def parse(self):
        value = self._expr()
        if self._pos != len(self._tokens):
            kind, val = self._peek()
            raise ValueError(f"unexpected trailing token {val!r}")
        return value

    # -- grammar -------------------------------------------------------

    def _expr(self):
        value = self._term()
        while self._at_op("+", "-"):
            op = self._advance()[1]
            rhs = self._term()
            if op == "+":
                value += rhs
            else:
                value -= rhs
        return value

    def _term(self):
        value = self._unary()
        while self._at_op("*", "/"):
            op = self._advance()[1]
            rhs = self._unary()
            if op == "*":
                value *= rhs
            else:
                value /= rhs  # raises ZeroDivisionError on rhs == 0
        return value

    def _unary(self):
        if self._at_op("+", "-"):
            op = self._advance()[1]
            value = self._unary()
            return value if op == "+" else -value
        return self._power()

    def _power(self):
        base = self._atom()
        if self._at_op("^"):
            self._advance()
            # Right-associative; unary sign allowed on the exponent side.
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent
        return base

    def _atom(self):
        kind, val = self._peek()
        if kind == "num":
            self._advance()
            return val
        if kind == "name":
            self._advance()
            if self._at_op("("):
                # A name followed by '(' is a function call.
                self._advance()
                args = [self._expr()]
                while self._at_op(","):
                    self._advance()
                    args.append(self._expr())
                self._expect_op(")")
                return self._call_function(val, args)
            if val in _FUNCTIONS:
                raise ValueError(f"function {val!r} used without a call")
            if val in self._variables:
                return Fraction(self._variables[val])
            raise NameError(val)
        if kind == "op" and val == "(":
            self._advance()
            value = self._expr()
            self._expect_op(")")
            return value
        raise ValueError("expected expression")

    @staticmethod
    def _call_function(name, args):
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(*args)
        if name == "max":
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(*args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr, variables=None):
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    return parser.parse()
```