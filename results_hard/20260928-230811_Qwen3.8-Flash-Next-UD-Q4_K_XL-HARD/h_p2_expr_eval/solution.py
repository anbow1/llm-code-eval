import fractions
from enum import Enum, auto
from dataclasses import dataclass


class _T(Enum):
    NUMBER = auto()
    NAME = auto()
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    CARET = auto()
    LPAREN = auto()
    RPAREN = auto()
    COMMA = auto()
    EOF = auto()


@dataclass
class _Token:
    type: _T
    value: str
    pos: int


def _tokenize(expr: str) -> list[_Token]:
    tokens: list[_Token] = []
    i = 0
    n = len(expr)
    while i < n:
        ch = expr[i]
        if ch in ' \t\n\r':
            i += 1
        elif ch.isdigit() or ch == '.':
            start = i
            if ch == '.':
                if i + 1 >= n or not expr[i + 1].isdigit():
                    raise ValueError(f"Unexpected '.' at position {i}")
                i += 1
                while i < n and expr[i].isdigit():
                    i += 1
            else:
                while i < n and expr[i].isdigit():
                    i += 1
                if i < n and expr[i] == '.':
                    i += 1
                    while i < n and expr[i].isdigit():
                        i += 1
            tokens.append(_Token(_T.NUMBER, expr[start:i], start))
        elif ch.isalpha() or ch == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(_Token(_T.NAME, expr[start:i], start))
        elif ch == '+':
            tokens.append(_Token(_T.PLUS, '+', i)); i += 1
        elif ch == '-':
            tokens.append(_Token(_T.MINUS, '-', i)); i += 1
        elif ch == '*':
            tokens.append(_Token(_T.STAR, '*', i)); i += 1
        elif ch == '/':
            tokens.append(_Token(_T.SLASH, '/', i)); i += 1
        elif ch == '^':
            tokens.append(_Token(_T.CARET, '^', i)); i += 1
        elif ch == '(':
            tokens.append(_Token(_T.LPAREN, '(', i)); i += 1
        elif ch == ')':
            tokens.append(_Token(_T.RPAREN, ')', i)); i += 1
        elif ch == ',':
            tokens.append(_Token(_T.COMMA, ',', i)); i += 1
        else:
            raise ValueError(f"Unexpected character '{ch}' at position {i}")
    tokens.append(_Token(_T.EOF, '', i))
    return tokens


_FUNCTIONS = frozenset(('abs', 'min', 'max'))


class _Parser:
    def __init__(self, tokens: list[_Token], variables: dict | None) -> None:
        self._tokens = tokens
        self._pos = 0
        self._vars = variables if variables is not None else {}

    def _cur(self) -> _Token:
        return self._tokens[self._pos]

    def _advance(self) -> _Token:
        tok = self._tokens[self._pos]
        self._pos += 1
        return tok

    def _expect(self, ttype: _T) -> _Token:
        tok = self._cur()
        if tok.type != ttype:
            raise ValueError(f"Expected {ttype.name}, got '{tok.value}' at position {tok.pos}")
        self._pos += 1
        return tok

    # expr: term (('+' | '-') term)*
    def _expr(self) -> fractions.Fraction:
        result = self._term()
        while self._cur().type in (_T.PLUS, _T.MINUS):
            op = self._advance()
            rhs = self._term()
            result = result + rhs if op.type == _T.PLUS else result - rhs
        return result

    # term: unary (('*' | '/') unary)*
    def _term(self) -> fractions.Fraction:
        result = self._unary()
        while self._cur().type in (_T.STAR, _T.SLASH):
            op = self._advance()
            rhs = self._unary()
            if op.type == _T.STAR:
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("division by zero")
                result = result / rhs
        return result

    # unary: ('+' | '-') unary | power
    def _unary(self) -> fractions.Fraction:
        if self._cur().type == _T.PLUS:
            self._pos += 1
            return self._unary()
        if self._cur().type == _T.MINUS:
            self._pos += 1
            return -self._unary()
        return self._power()

    # power: atom ('^' unary)?
    def _power(self) -> fractions.Fraction:
        base = self._atom()
        if self._cur().type == _T.CARET:
            self._pos += 1
            exp = self._unary()
            if exp.denominator != 1:
                raise ValueError("exponent must be an integer")
            exp_int = exp.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("zero to a negative power")
            return base ** exp_int
        return base

    # atom: NUMBER | NAME | NAME '(' args ')' | '(' expr ')'
    def _atom(self) -> fractions.Fraction:
        tok = self._cur()
        if tok.type == _T.NUMBER:
            self._pos += 1
            return fractions.Fraction(tok.value)
        if tok.type == _T.NAME:
            self._pos += 1
            name = tok.value
            if name in _FUNCTIONS:
                if self._cur().type != _T.LPAREN:
                    raise ValueError(f"'{name}' must be followed by '('")
                return self._func_call(name)
            if self._cur().type == _T.LPAREN:
                raise ValueError(f"unknown function '{name}'")
            if name not in self._vars:
                raise NameError(f"unknown name '{name}'")
            val = self._vars[name]
            if isinstance(val, int):
                return fractions.Fraction(val)
            return val
        if tok.type == _T.LPAREN:
            self._pos += 1
            result = self._expr()
            self._expect(_T.RPAREN)
            return result
        raise ValueError(f"unexpected token '{tok.value}' at position {tok.pos}")

    def _func_call(self, name: str) -> fractions.Fraction:
        self._expect(_T.LPAREN)
        args: list[fractions.Fraction] = []
        if self._cur().type != _T.RPAREN:
            args.append(self._expr())
            while self._cur().type == _T.COMMA:
                self._pos += 1
                args.append(self._expr())
        self._expect(_T.RPAREN)
        if name == 'abs':
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument, got {len(args)}")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        # max
        if len(args) < 1:
            raise ValueError("max() takes at least 1 argument")
        return max(args)

    def parse(self) -> fractions.Fraction:
        if self._cur().type == _T.EOF:
            raise ValueError("empty expression")
        result = self._expr()
        if self._cur().type != _T.EOF:
            tok = self._cur()
            raise ValueError(f"unexpected token '{tok.value}' at position {tok.pos}")
        return result


def evaluate(expr: str, variables: dict | None = None) -> fractions.Fraction:
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    return parser.parse()
