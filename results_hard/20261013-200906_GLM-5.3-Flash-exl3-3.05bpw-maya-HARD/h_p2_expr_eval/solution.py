import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+\.\d*|\.\d+|\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')

# name -> (min_args, max_args or None for unbounded)
_FUNCTIONS = {
    'abs': (1, 1),
    'min': (1, None),
    'max': (1, None),
}


def _tokenize(expr):
    tokens = []
    i, n = 0, len(expr)
    while i < n:
        ch = expr[i]
        if ch.isspace():
            i += 1
            continue
        m = _NUM_RE.match(expr, i)
        if m:
            tokens.append(('num', m.group()))
            i = m.end()
            continue
        m = _NAME_RE.match(expr, i)
        if m:
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if ch in '+-*/^(),':
            tokens.append(('op', ch))
            i += 1
            continue
        raise ValueError(f"unexpected character {ch!r} at position {i}")
    return tokens


def _to_fraction(value):
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value)
    raise TypeError("variable values must be int or Fraction")


class _Parser:
    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables

    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _advance(self):
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        self._pos += 1
        return tok

    def _expect_op(self, op):
        tok = self._peek()
        if tok is None or tok[0] != 'op' or tok[1] != op:
            found = 'end of input' if tok is None else repr(tok[1])
            raise ValueError(f"expected {op!r}, found {found}")
        self._pos += 1

    def parse(self):
        value = self._parse_expr()
        if self._pos != len(self._tokens):
            raise ValueError(
                f"unexpected trailing token {self._tokens[self._pos][1]!r}"
            )
        return value

    def _parse_expr(self):
        value = self._parse_term()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                rhs = self._parse_term()
                value = value + rhs if tok[1] == '+' else value - rhs
            else:
                return value

    def _parse_term(self):
        value = self._parse_unary()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('*', '/'):
                self._pos += 1
                rhs = self._parse_unary()
                if tok[1] == '*':
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def _parse_unary(self):
        sign = 1
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                if tok[1] == '-':
                    sign = -sign
            else:
                break
        value = self._parse_power()
        return value if sign == 1 else -value

    def _parse_power(self):
        base = self._parse_atom()
        tok = self._peek()
        if tok is not None and tok[0] == 'op' and tok[1] == '^':
            self._pos += 1
            exponent = self._parse_signed_exponent()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            return base ** exponent.numerator
        return base

    def _parse_signed_exponent(self):
        sign = 1
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self._pos += 1
                if tok[1] == '-':
                    sign = -sign
            else:
                break
        value = self._parse_power()
        return value if sign == 1 else -value

    def _parse_atom(self):
        kind, text = self._advance()
        if kind == 'num':
            return Fraction(text)
        if kind == 'op' and text == '(':
            value = self._parse_expr()
            self._expect_op(')')
            return value
        if kind == 'name':
            nxt = self._peek()
            if nxt is not None and nxt[0] == 'op' and nxt[1] == '(':
                return self._parse_call(text)
            if text in _FUNCTIONS:
                raise ValueError(
                    f"function {text!r} must be called with parentheses"
                )
            if text in self._variables:
                return _to_fraction(self._variables[text])
            raise NameError(f"unknown variable {text!r}")
        raise ValueError(f"unexpected token {text!r}")

    def _parse_call(self, name):
        if name not in _FUNCTIONS:
            raise ValueError(f"unknown function {name!r}")
        self._expect_op('(')
        args = [self._parse_expr()]
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] == ',':
                self._pos += 1
                args.append(self._parse_expr())
            else:
                break
        self._expect_op(')')
        lo, hi = _FUNCTIONS[name]
        if len(args) < lo or (hi is not None and len(args) > hi):
            raise ValueError(f"wrong number of arguments for {name!r}")
        if name == 'abs':
            return abs(args[0])
        return min(args) if name == 'min' else max(args)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables if variables is not None else {})
    return parser.parse()
