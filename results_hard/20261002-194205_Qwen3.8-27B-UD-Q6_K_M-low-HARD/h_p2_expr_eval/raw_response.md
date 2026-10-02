```python
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expression()
    if parser.pos != len(parser.tokens):
        raise ValueError(f"Trailing token: {parser.tokens[parser.pos][1]!r}")
    return result


def _tokenize(s: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
        elif c.isdigit() or (c == '.' and i + 1 < n and s[i + 1].isdigit()):
            j = i
            if c.isdigit():
                while j < n and s[j].isdigit():
                    j += 1
                if j < n and s[j] == '.':
                    j += 1
                    while j < n and s[j].isdigit():
                        j += 1
            else:
                j += 1
                while j < n and s[j].isdigit():
                    j += 1
            tokens.append(('NUMBER', s[i:j]))
            i = j
        elif c.isalpha() or c == '_':
            j = i
            while j < n and (s[j].isalnum() or s[j] == '_'):
                j += 1
            tokens.append(('IDENT', s[i:j]))
            i = j
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unexpected character: {c!r}")
    return tokens


class _Parser:
    _FUNCTIONS = frozenset({'abs', 'min', 'max'})

    def __init__(self, tokens: list[tuple[str, str]], variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def _peek(self) -> tuple[str, str]:
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return (None, None)

    def _consume(self) -> tuple[str, str]:
        token = self._peek()
        self.pos += 1
        return token

    def parse_expression(self) -> Fraction:
        result = self.parse_term()
        while self._peek()[0] in ('+', '-'):
            op = self._consume()[0]
            right = self.parse_term()
            if op == '+':
                result += right
            else:
                result -= right
        return result

    def parse_term(self) -> Fraction:
        result = self.parse_unary()
        while self._peek()[0] in ('*', '/'):
            op = self._consume()[0]
            right = self.parse_unary()
            if op == '*':
                result *= right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result /= right
        return result

    def parse_unary(self) -> Fraction:
        negations = 0
        while self._peek()[0] in ('+', '-'):
            if self._peek()[0] == '-':
                negations += 1
            self._consume()
        result = self.parse_power()
        if negations % 2:
            result = -result
        return result

    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        if self._peek()[0] == '^':
            self._consume()
            exponent = self.parse_unary()
            if exponent != int(exponent):
                raise ValueError("Exponent must be an integer")
            exp = int(exponent)
            if base == 0 and exp < 0:
                raise ZeroDivisionError("0 cannot be raised to a negative power")
            return base ** exp
        return base

    def parse_primary(self) -> Fraction:
        token_type, token_value = self._peek()

        if token_type == 'NUMBER':
            self._consume()
            return Fraction(token_value)

        if token_type == 'IDENT':
            self._consume()
            name = token_value
            next_type = self._peek()[0]

            if name in self._FUNCTIONS and next_type == '(':
                args = self._parse_function_args()
                return self._call_function(name, args)
            if name in self.variables:
                return Fraction(self.variables[name])
            if name in self._FUNCTIONS:
                raise ValueError(f"Function '{name}' requires parentheses")
            raise NameError(f"Unknown variable: {name!r}")

        if token_type == '(':
            self._consume()
            result = self.parse_expression()
            if self._peek()[0] != ')':
                raise ValueError("Expected ')'")
            self._consume()
            return result

        raise ValueError(f"Unexpected token: {token_value!r}")

    def _parse_function_args(self) -> list[Fraction]:
        self._consume()  # consume '('
        args: list[Fraction] = []
        if self._peek()[0] == ')':
            self._consume()
            return args
        args.append(self.parse_expression())
        while self._peek()[0] == ',':
            self._consume()
            args.append(self.parse_expression())
        if self._peek()[0] != ')':
            raise ValueError("Expected ')' in function call")
        self._consume()
        return args

    def _call_function(self, name: str, args: list[Fraction]) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError(f"abs() takes exactly 1 argument, got {len(args)}")
            return abs(args[0])
        if name == 'min':
            if len(args) < 1:
                raise ValueError("min() takes at least 1 argument")
            return min(args)
        if name == 'max':
            if len(args) < 1:
                raise ValueError("max() takes at least 1 argument")
            return max(args)
        raise ValueError(f"Unknown function: {name!r}")
```