import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+\.\d*|\.\d+|\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCTIONS = ('abs', 'min', 'max')


def _make_number(text: str) -> Fraction:
    if '.' in text:
        whole, frac = text.split('.')
        digits_after = len(frac)
        numerator = int(whole or '0') * (10 ** digits_after) + int(frac or '0')
        return Fraction(numerator, 10 ** digits_after)
    return Fraction(int(text))


def _tokenize(source: str):
    tokens = []
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch.isspace():
            i += 1
            continue
        if ch.isdigit() or ch == '.':
            m = _NUM_RE.match(source, i)
            if m is None:
                raise ValueError(f"invalid character {ch!r} at position {i}")
            tokens.append(('num', m.group()))
            i = m.end()
        elif ch.isalpha() or ch == '_':
            m = _NAME_RE.match(source, i)
            tokens.append(('name', m.group()))
            i = m.end()
        elif ch in '+-*/^(),':
            tokens.append(('op', ch))
            i += 1
        else:
            raise ValueError(f"invalid character {ch!r} at position {i}")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables

    # -- token helpers ------------------------------------------------
    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _advance(self):
        tok = self._tokens[self._pos]
        self._pos += 1
        return tok

    def _match_op(self, *ops):
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] in ops:
            self._advance()
            return tok[1]
        return None

    def _expect_op(self, op):
        if self._match_op(op) is None:
            raise ValueError(f"expected {op!r}")

    # -- grammar ------------------------------------------------------
    def parse(self) -> Fraction:
        value = self._expr()
        if self._pos != len(self._tokens):
            raise ValueError("unexpected trailing tokens")
        return value

    def _expr(self) -> Fraction:
        value = self._term()
        while True:
            op = self._match_op('+', '-')
            if op is None:
                return value
            rhs = self._term()
            value = value + rhs if op == '+' else value - rhs

    def _term(self) -> Fraction:
        value = self._unary()
        while True:
            op = self._match_op('*', '/')
            if op is None:
                return value
            rhs = self._unary()
            if op == '*':
                value = value * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / rhs

    def _unary(self) -> Fraction:
        op = self._match_op('+', '-')
        if op is not None:
            operand = self._unary()
            return -operand if op == '-' else operand
        return self._power()

    def _power(self) -> Fraction:
        base = self._primary()
        if self._match_op('^'):
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent.numerator
        return base

    def _primary(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        kind, value = tok

        if kind == 'num':
            self._advance()
            return _make_number(value)

        if kind == 'name':
            self._advance()
            if self._peek() == ('op', '('):
                self._advance()
                args = [self._expr()]
                while self._match_op(','):
                    args.append(self._expr())
                self._expect_op(')')
                return self._call(value, args)
            if value in _FUNCTIONS:
                raise ValueError(f"function {value!r} requires a call")
            if value not in self._variables:
                raise NameError(f"unknown variable {value!r}")
            return Fraction(self._variables[value])

        if kind == 'op' and value == '(':
            self._advance()
            inner = self._expr()
            self._expect_op(')')
            return inner

        raise ValueError(f"unexpected token {value!r}")

    def _call(self, name: str, args) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function {name!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    return _Parser(tokens, variables if variables is not None else {}).parse()
