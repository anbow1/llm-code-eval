```python
import re
from fractions import Fraction

_NUM_RE = re.compile(r'\d+(?:\.\d*)?|\.\d+')
_NAME_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_SYNTAX_CHARS = frozenset('+-*/^(),')
_FUNCTIONS = frozenset(('abs', 'min', 'max'))


def _number_text(text: str) -> Fraction:
    # "7." is a valid number; Fraction rejects nothing here, but strip the
    # trailing dot defensively so conversion is always exact and safe.
    if text.endswith('.'):
        return Fraction(text[:-1])
    return Fraction(text)


def _tokenize(source: str):
    tokens = []
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch.isspace():
            i += 1
            continue
        m = _NUM_RE.match(source, i)
        if m:
            tokens.append(('num', _number_text(m.group(0))))
            i = m.end()
            continue
        m = _NAME_RE.match(source, i)
        if m:
            tokens.append(('name', m.group(0)))
            i = m.end()
            continue
        if ch in _SYNTAX_CHARS:
            tokens.append(('op', ch))
            i += 1
            continue
        raise ValueError(f"unexpected character {ch!r}")
    return tokens


class _Parser:
    __slots__ = ('_tokens', '_pos', '_vars')

    def __init__(self, tokens, variables):
        self._tokens = tokens
        self._pos = 0
        self._vars = variables

    def _peek(self):
        return self._tokens[self._pos] if self._pos < len(self._tokens) else None

    def _advance(self):
        token = self._peek()
        self._pos += 1
        return token

    def _expect(self, char):
        token = self._advance()
        if token != ('op', char):
            raise ValueError(f"expected {char!r}")

    def _at_op(self, *chars):
        token = self._peek()
        return token is not None and token[0] == 'op' and token[1] in chars

    def parse(self) -> Fraction:
        value = self._parse_additive()
        if self._peek() is not None:
            raise ValueError("unexpected trailing tokens")
        return value

    def _parse_additive(self) -> Fraction:
        value = self._parse_multiplicative()
        while self._at_op('+', '-'):
            operator = self._advance()[1]
            right = self._parse_multiplicative()
            value = value + right if operator == '+' else value - right
        return value

    def _parse_multiplicative(self) -> Fraction:
        value = self._parse_unary()
        while self._at_op('*', '/'):
            operator = self._advance()[1]
            right = self._parse_unary()
            if operator == '*':
                value = value * right
            else:
                if right == 0:
                    raise ZeroDivisionError("division by zero")
                value = value / right
        return value

    def _parse_unary(self) -> Fraction:
        if self._at_op('+', '-'):
            operator = self._advance()[1]
            value = self._parse_unary()
            return value if operator == '+' else -value
        return self._parse_power()

    def _parse_power(self) -> Fraction:
        base = self._parse_primary()
        if self._at_op('^'):
            self._advance()
            exponent = self._parse_unary()  # right-assoc; sign allowed (2^-1)
            if exponent.denominator != 1:
                raise ValueError("exponent must be an integer")
            if base == 0 and exponent < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exponent.numerator
        return base

    def _parse_primary(self) -> Fraction:
        token = self._advance()
        if token is None:
            raise ValueError("unexpected end of expression")
        kind, value = token
        if kind == 'num':
            return value
        if kind == 'op':
            if value == '(':
                inner = self._parse_additive()
                self._expect(')')
                return inner
            raise ValueError(f"unexpected token {value!r}")
        # Identifier: function call or variable.
        if value in _FUNCTIONS:
            if self._peek() != ('op', '('):
                raise ValueError(f"function {value!r} requires parentheses")
            self._advance()
            args = [self._parse_additive()]
            while self._at_op(','):
                self._advance()
                args.append(self._parse_additive())
            self._expect(')')
            if value == 'abs':
                if len(args) != 1:
                    raise ValueError("abs() takes exactly 1 argument")
                return abs(args[0])
            if len(args) < 1:
                raise ValueError(f"{value}() takes at least 1 argument")
            return min(args) if value == 'min' else max(args)
        if value not in self._vars:
            raise NameError(f"name '{value}' is not defined")
        variable_value = self._vars[value]
        if isinstance(variable_value, Fraction):
            return variable_value
        if isinstance(variable_value, int) and not isinstance(variable_value, bool):
            return Fraction(variable_value)
        raise ValueError(f"unsupported value for variable {value!r}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if not isinstance(expr, str):
        raise ValueError("expression must be a string")
    variables = variables or {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("empty expression")
    return _Parser(tokens, variables).parse()
```