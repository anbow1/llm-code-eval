

```python
from fractions import Fraction


def _tokenize(expr: str) -> list:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or c == '.':
            start = i
            while i < n and (expr[i].isdigit() or expr[i] == '.'):
                i += 1
            s = expr[start:i]
            if not any(ch.isdigit() for ch in s):
                raise ValueError("Invalid number literal")
            if s.count('.') > 1:
                raise ValueError("Invalid number literal")
            tokens.append(('NUM', s))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('NAME', expr[start:i]))
        elif c in '+-*/^':
            tokens.append(('OP', c))
            i += 1
        elif c == '(':
            tokens.append(('LPAREN', c))
            i += 1
        elif c == ')':
            tokens.append(('RPAREN', c))
            i += 1
        elif c == ',':
            tokens.append(('COMMA', c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens


class _Parser:
    def __init__(self, tokens: list, variables: dict | None):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables if variables is not None else {}

    def _peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse(self) -> Fraction:
        result = self._additive()
        if self.pos < len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def _additive(self) -> Fraction:
        result = self._multiplicative()
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('+', '-'):
            op = self._consume()[1]
            rhs = self._multiplicative()
            result = result + rhs if op == '+' else result - rhs
        return result

    def _multiplicative(self) -> Fraction:
        result = self._unary()
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('*', '/'):
            op = self._consume()[1]
            rhs = self._unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result

    def _unary(self) -> Fraction:
        neg = False
        while self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] in ('+', '-'):
            op = self._consume()[1]
            if op == '-':
                neg = not neg
        return -self._power() if neg else self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self._peek() is not None and self._peek()[0] == 'OP' and self._peek()[1] == '^':
            self._consume()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 raised to a negative power")
            return base ** exp
        return base

    def _atom(self) -> Fraction:
        tok = self._peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUM':
            self._consume()
            return Fraction(tok[1])

        if tok[0] == 'NAME':
            self._consume()
            name = tok[1]
            if name in ('abs', 'min', 'max'):
                return self._function(name)
            if name in self.variables:
                return Fraction(self.variables[name])
            raise NameError(f"Unknown variable: {name}")

        if tok[0] == 'LPAREN':
            self._consume()
            result = self._additive()
            if self._peek() is None or self._peek()[0] != 'RPAREN':
                raise ValueError("Expected ')'")
            self._consume()
            return result

        raise ValueError(f"Unexpected token: {tok[1]!r}")

    def _function(self, name: str) -> Fraction:
        if self._peek() is None or self._peek()[0] != 'LPAREN':
            raise ValueError(f"Expected '(' after {name}")
        self._consume()

        args = [self._additive()]
        while self._peek() is not None and self._peek()[0] == 'COMMA':
            self._consume()
            args.append(self._additive())

        if self._peek() is None or self._peek()[0] != 'RPAREN':
            raise ValueError("Expected ')'")
        self._consume()

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
        raise ValueError(f"Unknown function: {name}")


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    return _Parser(tokens, variables).parse()
```