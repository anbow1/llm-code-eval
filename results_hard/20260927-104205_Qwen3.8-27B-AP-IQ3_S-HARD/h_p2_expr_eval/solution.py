from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables)
    return parser.parse()


def _tokenize(expr: str) -> list:
    tokens = []
    i = 0
    n = len(expr)
    while i < n:
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit() or (c == '.' and i + 1 < n and expr[i + 1].isdigit()):
            start = i
            if c == '.':
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
            tokens.append(('NUMBER', expr[start:i]))
        elif c.isalpha() or c == '_':
            start = i
            while i < n and (expr[i].isalnum() or expr[i] == '_'):
                i += 1
            tokens.append(('IDENT', expr[start:i]))
        elif c in '+-*/^(),':
            tokens.append((c, c))
            i += 1
        else:
            raise ValueError(f"Unknown character: {c!r}")
    return tokens


class _Parser:
    _FUNC_NAMES = frozenset(('abs', 'min', 'max'))

    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def consume(self):
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")
        self.pos += 1
        return tok

    def parse(self) -> Fraction:
        result = self._additive()
        if self.pos != len(self.tokens):
            raise ValueError("Trailing tokens")
        return result

    def _additive(self) -> Fraction:
        result = self._multiplicative()
        while self.peek() is not None and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            rhs = self._multiplicative()
            result = result + rhs if op == '+' else result - rhs
        return result

    def _multiplicative(self) -> Fraction:
        result = self._unary()
        while self.peek() is not None and self.peek()[0] in ('*', '/'):
            op = self.consume()[0]
            rhs = self._unary()
            if op == '*':
                result = result * rhs
            else:
                if rhs == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / rhs
        return result

    def _unary(self) -> Fraction:
        if self.peek() is not None and self.peek()[0] in ('+', '-'):
            op = self.consume()[0]
            operand = self._unary()
            return operand if op == '+' else -operand
        return self._power()

    def _power(self) -> Fraction:
        base = self._atom()
        if self.peek() is not None and self.peek()[0] == '^':
            self.consume()
            exponent = self._unary()
            if exponent.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = exponent.numerator
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base

    def _atom(self) -> Fraction:
        tok = self.peek()
        if tok is None:
            raise ValueError("Unexpected end of expression")

        if tok[0] == 'NUMBER':
            self.consume()
            return Fraction(tok[1])

        if tok[0] == 'IDENT':
            name = tok[1]
            self.consume()
            if self.peek() is not None and self.peek()[0] == '(':
                return self._function_call(name)
            if name in self._FUNC_NAMES and name not in self.variables:
                raise ValueError(f"Function '{name}' requires a call with parentheses")
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(self.variables[name])

        if tok[0] == '(':
            self.consume()
            result = self._additive()
            if self.peek() is None or self.peek()[0] != ')':
                raise ValueError("Missing closing parenthesis")
            self.consume()
            return result

        raise ValueError(f"Unexpected token: {tok[0]}")

    def _function_call(self, name: str) -> Fraction:
        if name not in self._FUNC_NAMES:
            raise ValueError(f"Unknown function: {name}")

        self.consume()  # '('

        args: list[Fraction] = []
        if self.peek() is not None and self.peek()[0] != ')':
            args.append(self._additive())
            while self.peek() is not None and self.peek()[0] == ',':
                self.consume()
                args.append(self._additive())

        if self.peek() is None or self.peek()[0] != ')':
            raise ValueError("Missing closing parenthesis")
        self.consume()  # ')'

        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs requires exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min requires at least 1 argument")
            return min(args)
        else:
            if len(args) < 1:
                raise ValueError("max requires at least 1 argument")
            return max(args)
