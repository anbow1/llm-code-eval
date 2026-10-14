from fractions import Fraction
import re

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_]\w*')
_OPS = '+-*/^(),'
_FUNCS = {'abs': (1, 1), 'min': (1, None), 'max': (1, None)}


def _tokenize(s: str):
    tokens = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        m = _NUM_RE.match(s, i)
        if m:
            text = m.group()
            i = m.end()
            if text.startswith('.'):
                text = '0' + text
            if text.endswith('.'):
                text += '0'
            tokens.append(('num', Fraction(text)))
            continue
        m = _NAME_RE.match(s, i)
        if m:
            tokens.append(('name', m.group()))
            i = m.end()
            continue
        if c in _OPS:
            tokens.append(('op', c))
            i += 1
            continue
        raise ValueError(f"invalid character {c!r} in expression")
    return tokens


def _eval_expr(s: str, variables: dict) -> Fraction:
    tokens = _tokenize(s)
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else None

    def advance():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def expect_op(sym: str):
        tok = peek()
        if tok is None or tok != ('op', sym):
            raise ValueError(f"expected {sym!r}")
        advance()

    def expr() -> Fraction:
        value = term()
        while True:
            tok = peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
                advance()
                rhs = term()
                if tok[1] == '+':
                    value = value + rhs
                else:
                    value = value - rhs
            else:
                return value

    def term() -> Fraction:
        value = unary()
        while True:
            tok = peek()
            if tok is not None and tok[0] == 'op' and tok[1] in ('*', '/'):
                advance()
                rhs = unary()
                if tok[1] == '*':
                    value = value * rhs
                else:
                    if rhs == 0:
                        raise ZeroDivisionError("division by zero")
                    value = value / rhs
            else:
                return value

    def unary() -> Fraction:
        tok = peek()
        if tok is not None and tok[0] == 'op' and tok[1] in ('+', '-'):
            advance()
            if tok[1] == '+':
                return unary()
            return -unary()
        return power()

    def power() -> Fraction:
        base = atom()
        tok = peek()
        if tok is not None and tok == ('op', '^'):
            advance()
            exp = unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            e = exp.numerator
            if base == 0 and e < 0:
                raise ZeroDivisionError("zero raised to a negative power")
            if e >= 0:
                return base ** e
            return Fraction(1) / (base ** (-e))
        return base

    def atom() -> Fraction:
        tok = peek()
        if tok is None:
            raise ValueError("unexpected end of expression")
        kind, val = tok
        if kind == 'num':
            advance()
            return val
        if kind == 'op' and val == '(':
            advance()
            value = expr()
            expect_op(')')
            return value
        if kind == 'name':
            return name_or_call(val)
        raise ValueError(f"unexpected token {val!r}")

    def name_or_call(name: str) -> Fraction:
        nonlocal pos
        if name in _FUNCS:
            tok = peek()
            if tok is None or tok != ('op', '('):
                raise ValueError(f"function {name!r} requires parentheses")
            advance()
            args = []
            tok = peek()
            if tok is not None and tok == ('op', ')'):
                advance()
            else:
                args.append(expr())
                while True:
                    tok = peek()
                    if tok is not None and tok == ('op', ','):
                        advance()
                        args.append(expr())
                    else:
                        break
                expect_op(')')
            low, high = _FUNCS[name]
            if len(args) < low or (high is not None and len(args) > high):
                raise ValueError(f"wrong number of arguments for {name!r}")
            if name == 'abs':
                return abs(args[0])
            return min(args) if name == 'min' else max(args)
        if name not in variables:
            raise NameError(f"unknown variable {name!r}")
        v = variables[name]
        if isinstance(v, bool) or isinstance(v, int):
            return Fraction(v)
        if isinstance(v, Fraction):
            return v
        raise TypeError(f"variable {name!r} must be an int or Fraction")

    result = expr()
    if pos != len(tokens):
        raise ValueError(f"unexpected trailing token {tokens[pos][1]!r}")
    return result


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    return _eval_expr(expr, variables)
