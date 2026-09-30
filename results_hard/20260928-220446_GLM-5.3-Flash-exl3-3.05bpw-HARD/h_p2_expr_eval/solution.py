import re
from fractions import Fraction

_TOKEN_RE = re.compile(r"""
    \s*(
        \d+\.\d* | \.\d+ | \d+
      | [A-Za-z_][A-Za-z0-9_]*
      | \*\* | [\^+\-*/(),]
    )
""", re.VERBOSE)

def _tokenize(s):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        m = _TOKEN_RE.match(s, i)
        if not m:
            if s[i].isspace():
                i += 1
                continue
            raise ValueError(f"unexpected character: {s[i]!r}")
        tokens.append(m.group(1))
        i = m.end()
    if not tokens:
        raise ValueError("empty input")
    return tokens


class _Parser:
    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables or {}

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def next(self):
        tok = self.peek()
        self.pos += 1
        return tok

    def expect(self, tok):
        if self.peek() != tok:
            raise ValueError(f"expected {tok!r}")
        return self.next()

    def parse(self):
        result = self.expr()
        if self.pos != len(self.tokens):
            raise ValueError("unexpected trailing tokens")
        return result

    def expr(self):
        left = self.term()
        while self.peek() in ('+', '-'):
            op = self.next()
            right = self.term()
            left = left + right if op == '+' else left - right
        return left

    def term(self):
        left = self.unary()
        while self.peek() in ('*', '/'):
            op = self.next()
            right = self.unary()
            if op == '*':
                left = left * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                left = left / right
        return left

    def unary(self):
        tok = self.peek()
        if tok == '+':
            self.next()
            return self.unary()
        if tok == '-':
            self.next()
            return -self.unary()
        return self.power()

    def power(self):
        base = self.atom()
        if self.peek() == '^':
            self.next()
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent
        if self.peek() == '**':
            self.next()
            exponent = self.unary()
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            return base ** exponent
        return base

    def atom(self):
        tok = self.next()
        if tok is None:
            raise ValueError("unexpected end of input")
        if tok == '(':
            inner = self.expr()
            self.expect(')')
            return inner
        if re.fullmatch(r'\d+\.\d*|\.\d+|\d+', tok):
            try:
                return Fraction(tok)
            except (ValueError, ZeroDivisionError):
                raise ValueError(f"invalid number: {tok}")
        if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', tok):
            if self.peek() == '(':
                return self.call(tok)
            if tok not in self.variables:
                raise NameError(f"unknown variable: {tok}")
            val = self.variables[tok]
            return val if isinstance(val, Fraction) else Fraction(val)
        raise ValueError(f"unexpected token: {tok}")

    def call(self, name):
        self.next()  # consume '('
        args = [self.expr()]
        while self.peek() == ',':
            self.next()
            args.append(self.expr())
        self.expect(')')
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        raise ValueError(f"unknown function: {name}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    return _Parser(tokens, variables).parse()
