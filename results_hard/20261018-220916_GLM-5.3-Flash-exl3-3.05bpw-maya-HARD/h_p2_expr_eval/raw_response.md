```python
import re
from fractions import Fraction

_TOKEN_RE = re.compile(
    r'(\d+\.\d*|\.\d+|\d+)'          # number: "12", "3.5", ".5", "7."
    r'|([A-Za-z_][A-Za-z0-9_]*)'     # identifier / function name
    r'|([-+*/^(),])'                 # operators and punctuation
)
_WS_RE = re.compile(r'\s+')

_FUNCTIONS = ('abs', 'min', 'max')


def _tokenize(s):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        m = _WS_RE.match(s, i)
        if m:
            i = m.end()
            continue
        m = _TOKEN_RE.match(s, i)
        if not m:
            raise ValueError(f"unexpected character {s[i]!r} at position {i}")
        if m.group(1) is not None:
            whole, _, frac = m.group(1).partition('.')
            value = Fraction(int(whole) if whole else 0)
            if frac:
                value += Fraction(int(frac), 10 ** len(frac))
            tokens.append(('num', value))
        elif m.group(2) is not None:
            tokens.append(('name', m.group(2)))
        else:
            tokens.append(('op', m.group(3)))
        i = m.end()
    return tokens


class _Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def _peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def _next(self):
        tok = self._peek()
        if tok is None:
            raise ValueError("unexpected end of input")
        self.pos += 1
        return tok

    def _expect(self, op):
        tok = self._next()
        if tok != ('op', op):
            raise ValueError(f"expected {op!r}, got {tok[1]!r}")

    def parse(self):
        node = self._expr()
        if self.pos != len(self.tokens):
            raise ValueError(f"unexpected trailing token {self.tokens[self.pos][1]!r}")
        return node

    def _expr(self):
        node = self._term()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                self.pos += 1
                node = ('bin', tok[1], node, self._term())
            else:
                return node

    def _term(self):
        node = self._factor()
        while True:
            tok = self._peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('*', '/'):
                self.pos += 1
                node = ('bin', tok[1], node, self._factor())
            else:
                return node

    def _factor(self):
        negate = False
        while True:
            tok = self._peek()
            if tok == ('op', '+'):
                self.pos += 1
            elif tok == ('op', '-'):
                self.pos += 1
                negate = not negate
            else:
                break
        node = self._power()
        return ('neg', node) if negate else node

    def _power(self):
        node = self._atom()
        if self._peek() == ('op', '^'):
            self.pos += 1
            node = ('pow', node, self._factor())
        return node

    def _atom(self):
        tok = self._next()
        if tok == ('op', '('):
            node = self._expr()
            self._expect(')')
            return node
        kind, val = tok
        if kind == 'num':
            return ('num', val)
        if kind == 'name':
            if self._peek() == ('op', '('):
                self.pos += 1
                args = []
                if self._peek() != ('op', ')'):
                    args.append(self._expr())
                    while self._peek() == ('op', ','):
                        self.pos += 1
                        args.append(self._expr())
                self._expect(')')
                if val == 'abs':
                    if len(args) != 1:
                        raise ValueError("abs() takes exactly one argument")
                elif val in ('min', 'max'):
                    if not args:
                        raise ValueError(f"{val}() takes at least one argument")
                else:
                    raise ValueError(f"unknown function {val!r}")
                return ('call', val, args)
            return ('var', val)
        raise ValueError(f"unexpected token {val!r}")


def _eval(node, variables):
    tag = node[0]
    if tag == 'num':
        return node[1]
    if tag == 'var':
        name = node[1]
        if variables is None or name not in variables:
            raise NameError(f"name {name!r} is not defined")
        value = variables[name]
        return value if isinstance(value, Fraction) else Fraction(value)
    if tag == 'neg':
        return -_eval(node[1], variables)
    if tag == 'bin':
        op, left, right = node[1], node[2], node[3]
        a = _eval(left, variables)
        b = _eval(right, variables)
        if op == '+':
            return a + b
        if op == '-':
            return a - b
        if op == '*':
            return a * b
        if b == 0:
            raise ZeroDivisionError("division by zero")
        return a / b
    if tag == 'pow':
        base = _eval(node[1], variables)
        exp = _eval(node[2], variables)
        if exp.denominator != 1:
            raise ValueError("exponent must evaluate to an integer")
        e = exp.numerator
        if base == 0 and e < 0:
            raise ZeroDivisionError("zero raised to a negative power")
        return base ** e
    if tag == 'call':
        fname, args = node[1], node[2]
        vals = [_eval(a, variables) for a in args]
        if fname == 'abs':
            return abs(vals[0])
        if fname == 'min':
            return min(vals)
        return max(vals)
    raise ValueError("invalid expression")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    tokens = _tokenize(expr)
    ast = _Parser(tokens).parse()
    return _eval(ast, variables)
```