```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCTIONS = frozenset(('abs', 'min', 'max'))


def _tokenize(source: str):
    tokens = []
    i, n = 0, len(source)
    while i < n:
        ch = source[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isdigit() or ch == '.':
            m = _NUM_RE.match(source, i)
            if m is None:
                raise ValueError(
                    f"invalid number at position {i}: {source[i:]!r}")
            tokens.append(('num', Fraction(m.group())))
            i = m.end()
            continue
        m = _NAME_RE.match(source, i)
        if m is not None:
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if ch in '+-*/^(),':
            tokens.append((ch, None))
            i += 1
            continue
        raise ValueError(f"unexpected character {ch!r} at position {i}")
    tokens.append(('end', None))
    return tokens


class _Parser:
    __slots__ = ('_tokens', '_pos', '_variables')

    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables if variables is not None else {}

    def _peek(self):
        return self._tokens[self._pos]

    def _advance(self):
        token = self._tokens[self._pos]
        self._pos += 1
        return token

    def _expect(self, kind):
        token = self._advance()
        if token[0] != kind:
            raise ValueError(f"expected {kind!r} but found {token[0]!r}")

    def parse(self):
        value = self._expr()
        if self._peek()[0] != 'end':
            raise ValueError("unexpected trailing tokens")
        return value

    def _expr(self):
        value = self._term()
        while self._peek()[0] in ('+', '-'):
            op = self._advance()[0]
            rhs = self._term()
            value = value + rhs if op == '+' else value - rhs
        return value

    def _term(self):
        value = self._unary()
        while self._peek()[0] in ('*', '/'):
            op = self._advance()[0]
            rhs = self._unary()
            if op == '*':
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs
        return value

    def _unary(self):
        negate = False
        while self._peek()[0] in ('+', '-'):
            op = self._advance()[0]
            if op == '-':
                negate = not negate
        value = self._power()
        return -value if negate else value

    def _power(self):
        base = self._atom()
        if self._peek()[0] == '^':
            self._advance()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            return base ** exponent.numerator
        return base

    def _atom(self):
        kind, value = self._peek()
        if kind == 'num':
            self._advance()
            return value
        if kind == 'name':
            self._advance()
            name = value
            if self._peek()[0] == '(':
                self._advance()
                args = [self._expr()]
                while self._peek()[0] == ',':
                    self._advance()
                    args.append(self._expr())
                self._expect(')')
                return self._call(name, args)
            if name in _FUNCTIONS:
                raise ValueError(
                    f"function {name!r} used without a call")
            return self._lookup(name)
        if kind == '(':
            self._advance()
            value = self._expr()
            self._expect(')')
            return value
        raise ValueError(f"unexpected token {kind!r}")

    def _call(self, name, args):
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly one argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() requires at least one argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max() requires at least one argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")

    def _lookup(self, name):
        if name not in self._variables:
            raise NameError(f"unknown variable {name!r}")
        value = self._variables[name]
        if isinstance(value, int):
            return Fraction(value)
        if isinstance(value, Fraction):
            return value
        raise ValueError(
            f"invalid value for variable {name!r}: {value!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
```