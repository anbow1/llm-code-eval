import fractions
from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    if variables is None:
        variables = {}
    tokens = _tokenize(expr)
    parser = _Parser(tokens, variables)
    result = parser.parse_expr()
    if parser.pos < len(parser.tokens):
        raise ValueError("Trailing tokens")
    return result


def _tokenize(s: str):
    tokens = []
    i = 0
    n = len(s)
    while i < n:
        if s[i].isspace():
            i += 1
            continue
        if s[i].isdigit() or s[i] == '.':
            start = i
            if s[i] == '.':
                i += 1
                if i >= n or not s[i].isdigit():
                    raise ValueError("Invalid number")
                while i < n and s[i].isdigit():
                    i += 1
            else:
                while i < n and s[i].isdigit():
                    i += 1
                if i < n and s[i] == '.':
                    i += 1
                    while i < n and s[i].isdigit():
                        i += 1
            try:
                tokens.append(('NUM', Fraction(s[start:i])))
            except (ValueError, ZeroDivisionError):
                raise ValueError("Invalid number")
        elif s[i].isalpha() or s[i] == '_':
            start = i
            while i < n and (s[i].isalnum() or s[i] == '_'):
                i += 1
            tokens.append(('IDENT', s[start:i]))
        elif s[i] in '+-*/^':
            tokens.append(('OP', s[i]))
            i += 1
        elif s[i] == '(':
            tokens.append(('LPAREN', '('))
            i += 1
        elif s[i] == ')':
            tokens.append(('RPAREN', ')'))
            i += 1
        elif s[i] == ',':
            tokens.append(('COMMA', ','))
            i += 1
        else:
            raise ValueError(f"Unknown character: {s[i]!r}")
    return tokens


class _Parser:
    FUNCTIONS = frozenset({'abs', 'min', 'max'})

    def __init__(self, tokens, variables):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def peek(self):
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def consume(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def parse_expr(self):
        result = self.parse_term()
        while True:
            t = self.peek()
            if t is None or t[0] != 'OP' or t[1] not in '+-':
                break
            op = self.consume()[1]
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result

    def parse_term(self):
        result = self.parse_factor()
        while True:
            t = self.peek()
            if t is None or t[0] != 'OP' or t[1] not in '*/':
                break
            op = self.consume()[1]
            right = self.parse_factor()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result

    def parse_factor(self):
        t = self.peek()
        if t is not None and t[0] == 'OP' and t[1] in '+-':
            op = self.consume()[1]
            val = self.parse_factor()
            if op == '-':
                return -val
            return val
        return self.parse_power()

    def parse_power(self):
        base = self.parse_atom()
        t = self.peek()
        if t is not None and t[0] == 'OP' and t[1] == '^':
            self.consume()
            exp = self.parse_factor()
            if exp.denominator != 1:
                raise ValueError("Exponent must be an integer")
            exp_int = int(exp)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base

    def parse_atom(self):
        t = self.peek()
        if t is None:
            raise ValueError("Unexpected end of expression")
        if t[0] == 'NUM':
            self.consume()
            return t[1]
        if t[0] == 'IDENT':
            name = t[1]
            if name in self.FUNCTIONS:
                return self._call_function(name)
            self.consume()
            if name not in self.variables:
                raise NameError(f"Unknown variable: {name}")
            return Fraction(self.variables[name])
        if t[0] == 'LPAREN':
            self.consume()
            result = self.parse_expr()
            if self.peek() is None or self.peek()[0] != 'RPAREN':
                raise ValueError("Expected ')'")
            self.consume()
            return result
        raise ValueError(f"Unexpected token: {t}")

    def _call_function(self, name):
        self.consume()
        if self.peek() is None or self.peek()[0] != 'LPAREN':
            raise ValueError(f"Function '{name}' must be followed by '('")
        self.consume()
        args = [self.parse_expr()]
        while self.peek() is not None and self.peek()[0] == 'COMMA':
            self.consume()
            args.append(self.parse_expr())
        if self.peek() is None or self.peek()[0] != 'RPAREN':
            raise ValueError("Expected ')'")
        self.consume()
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs() expects exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min() expects at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max() expects at least 1 argument")
            return max(args)
