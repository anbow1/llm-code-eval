import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_FUNCTIONS = ('abs', 'min', 'max')
_OPS = frozenset('+-*/^()')


def _number(text: str) -> Fraction:
    # Handle trailing-dot forms like "7." without ever going through float.
    if text.endswith('.'):
        return Fraction(int(text[:-1]))
    return Fraction(text)


def _tokenize(s: str):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        m = _NUM_RE.match(s, i)
        if m:
            tokens.append(('num', _number(m.group(0))))
            i = m.end()
            continue
        m = _NAME_RE.match(s, i)
        if m:
            tokens.append(('name', m.group(0)))
            i = m.end()
            continue
        if s[i] in _OPS:
            tokens.append(('op', s[i]))
            i += 1
            continue
        raise ValueError(f"unexpected character {s[i]!r}")
    return tokens


class _Parser:
    def __init__(self, tokens, variables: dict):
        self._tokens = tokens
        self._pos = 0
        self._variables = variables

    def _peek(self):
        if self._pos < len(self._tokens):
            return self._tokens[self._pos]
        return None

    def _advance(self):
        tok = self._peek()
        self._pos += 1
        return tok

    def parse(self) -> Fraction:
        value = self._expr()
        if self._pos != len(self._tokens):
            raise ValueError("unexpected trailing tokens")
        return value

    def _expr(self) -> Fraction:
        value = self._term()
        while self._peek() in (('op', '+'), ('op', '-')):
            op = self._advance()
            rhs = self._term()
            value = value + rhs if op == ('op', '+') else value - rhs
        return value

    def _term(self) -> Fraction:
        value = self._unary()
        while self._peek() in (('op', '*'), ('op', '/')):
            op = self._advance()
            rhs = self._unary()
            if op == ('op', '*'):
                value = value * rhs
            else:
                value = value / rhs
        return value

    def _unary(self) -> Fraction:
        tok = self._peek()
        if tok == ('op', '+'):
            self._advance()
            return self._unary()
        if tok == ('op', '-'):
            self._advance()
            return -self._unary()
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self._peek() == ('op', '^'):
            self._advance()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must evaluate to an integer")
            return base ** int(exponent)
        return base

    def _atom(self) -> Fraction:
        tok = self._advance()
        if tok is None:
            raise ValueError("unexpected end of input")
        kind, text = tok
        if kind == 'num':
            return text
        if kind == 'name':
            if self._peek() == ('op', '('):
                self._advance()
                args = self._args()
                return self._call(text, args)
            if text in _FUNCTIONS and text not in self._variables:
                raise ValueError(f"function '{text}' used without parentheses")
            return self._lookup(text)
        if tok == ('op', '('):
            value = self._expr()
            if self._advance() != ('op', ')'):
                raise ValueError("expected ')'")
            return value
        raise ValueError(f"unexpected token {text!r}")

    def _args(self):
        args = [self._expr()]
        while self._peek() == ('op', ','):
            self._advance()
            args.append(self._expr())
        if self._advance() != ('op', ')'):
            raise ValueError("expected ')'")
        return args

    def _call(self, name: str, args) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if not args:
                raise ValueError("min() requires at least 1 argument")
            return min(args)
        if name == 'max':
            if not args:
                raise ValueError("max() requires at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function '{name}'")

    def _lookup(self, name: str) -> Fraction:
        try:
            value = self._variables[name]
        except KeyError:
            raise NameError(f"undefined variable '{name}'") from None
        return Fraction(value)


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    return _Parser(tokens, variables or {}).parse()
