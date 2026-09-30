```python
"""Exact rational-expression evaluator (standard library only)."""

import re
from fractions import Fraction

__all__ = ["evaluate"]


_TOKEN_RE = re.compile(
    r"""
    (?P<ws>\s+)
  | (?P<num>\d+\.\d*|\.\d+|\d+)
  | (?P<name>[A-Za-z_][A-Za-z0-9_]*)
  | (?P<punct>[+\-*/^(),])
    """,
    re.VERBOSE,
)


def _tokenize(text: str):
    """Return a list of (kind, value) tokens; kind is 'num', 'name', or the
    literal punctuation character itself.  Whitespace is skipped."""
    tokens = []
    pos, end = 0, len(text)
    while pos < end:
        m = _TOKEN_RE.match(text, pos)
        if m is None:
            raise ValueError(
                f"unexpected character {text[pos]!r} at position {pos}"
            )
        pos = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        if kind == "num":
            tokens.append(("num", Fraction(m.group())))
        elif kind == "name":
            tokens.append(("name", m.group()))
        else:
            tok = m.group()
            tokens.append((tok, tok))
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.vars = {} if variables is None else variables

    # ------------------------------------------------------------------
    # token helpers
    # ------------------------------------------------------------------
    def _peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _kind(self):
        tok = self._peek()
        return tok[0] if tok is not None else None

    def _advance(self):
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        self.pos += 1
        return tok

    def _expect(self, kind):
        tok = self._peek()
        if tok is None or tok[0] != kind:
            raise ValueError(f"expected {kind!r}")
        self.pos += 1

    # ------------------------------------------------------------------
    # grammar
    # ------------------------------------------------------------------
    def parse(self) -> Fraction:
        if not self.tokens:
            raise ValueError("empty expression")
        value = self._additive()
        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")
        return value

    def _additive(self) -> Fraction:
        value = self._multiplicative()
        while True:
            kind = self._kind()
            if kind == "+":
                self.pos += 1
                value = value + self._multiplicative()
            elif kind == "-":
                self.pos += 1
                value = value - self._multiplicative()
            else:
                return value

    def _multiplicative(self) -> Fraction:
        value = self._unary()
        while True:
            kind = self._kind()
            if kind == "*":
                self.pos += 1
                value = value * self._unary()
            elif kind == "/":
                self.pos += 1
                value = value / self._unary()
            else:
                return value

    def _unary(self) -> Fraction:
        kind = self._kind()
        if kind == "+":
            self.pos += 1
            return self._unary()
        if kind == "-":
            self.pos += 1
            return -self._unary()
        return self._power()

    def _power(self) -> Fraction:
        base = self._primary()
        if self._kind() == "^":
            self.pos += 1
            exponent = self._unary()  # right-associative; allows 2^-1 etc.
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exponent
        return base

    def _primary(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        kind, val = tok

        if kind == "num":
            self.pos += 1
            return val

        if kind == "(":
            self.pos += 1
            value = self._additive()
            self._expect(")")
            return value

        if kind == "name":
            self.pos += 1
            if self._kind() == "(":
                self.pos += 1
                args = self._argument_list()
                return self._call(val, args)
            if val not in self.vars:
                raise NameError(f"unknown variable {val!r}")
            return Fraction(self.vars[val])

        raise ValueError(f"unexpected token {val!r}")

    def _argument_list(self):
        args = []
        if self._kind() == ")":
            self.pos += 1
            return args
        args.append(self._additive())
        while self._kind() == ",":
            self.pos += 1
            args.append(self._additive())
        self._expect(")")
        return args

    @staticmethod
    def _call(name: str, args) -> Fraction:
        if name == "abs":
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == "min":
            if not args:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == "max":
            if not args:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    """Evaluate *expr* exactly, returning a Fraction."""
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
```