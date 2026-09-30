from fractions import Fraction


def evaluate(expr: str, variables: dict | None = None) -> Fraction:
    tokens = _tokenize(expr)
    if not tokens:
        raise ValueError("Empty expression")
    parser = _Parser(tokens, variables or {})
    result = parser.parse_expression()
    if not parser.at_end():
        raise ValueError("Trailing tokens")
    return result


def _tokenize(expr: str) -> list:
    tokens = []
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
            num_str = expr[start:i]
            if not _valid_number(num_str):
                raise ValueError(f"Invalid number: {num_str}")
            tokens.append(('NUMBER', num_str))
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


def _valid_number(s: str) -> bool:
    if '.' in s:
        parts = s.split('.')
        if len(parts) != 2:
            return False
        if not parts[0] and not parts[1]:
            return False
        return all(c.isdigit() for c in parts[0]) and all(c.isdigit() for c in parts[1])
    return len(s) > 0 and all(c.isdigit() for c in s)


class _Parser:
    def __init__(self, tokens: list, variables: dict):
        self.tokens = tokens
        self.pos = 0
        self.variables = variables

    def at_end(self) -> bool:
        return self.pos >= len(self.tokens)

    def peek(self):
        if self.at_end():
            return None
        return self.tokens[self.pos]

    def advance(self):
        token = self.tokens[self.pos]
        self.pos += 1
        return token

    def expect(self, expected_type: str):
        token = self.peek()
        if token is None or token[0] != expected_type:
            raise ValueError(f"Expected {expected_type}")
        return self.advance()

    def parse_expression(self) -> Fraction:
        result = self.parse_term()
        while self.peek() is not None and self.peek()[0] in ('+', '-'):
            op = self.advance()[0]
            right = self.parse_term()
            if op == '+':
                result = result + right
            else:
                result = result - right
        return result

    def parse_term(self) -> Fraction:
        result = self.parse_unary()
        while self.peek() is not None and self.peek()[0] in ('*', '/'):
            op = self.advance()[0]
            right = self.parse_unary()
            if op == '*':
                result = result * right
            else:
                if right == 0:
                    raise ZeroDivisionError("Division by zero")
                result = result / right
        return result

    def parse_unary(self) -> Fraction:
        sign = 1
        while self.peek() is not None and self.peek()[0] in ('+', '-'):
            if self.peek()[0] == '-':
                sign *= -1
            self.advance()
        result = self.parse_power()
        if sign == -1:
            result = -result
        return result

    def parse_power(self) -> Fraction:
        base = self.parse_primary()
        if self.peek() is not None and self.peek()[0] == '^':
            self.advance()
            exponent = self.parse_unary()
            if exponent != int(exponent):
                raise ValueError("Exponent must be an integer")
            exp_int = int(exponent)
            if base == 0 and exp_int < 0:
                raise ZeroDivisionError("0 to a negative power")
            return base ** exp_int
        return base

    def parse_primary(self) -> Fraction:
        token = self.peek()
        if token is None:
            raise ValueError("Unexpected end of expression")

        if token[0] == 'NUMBER':
            self.advance()
            return Fraction(token[1])

        if token[0] == 'IDENT':
            name = token[1]
            self.advance()
            if self.peek() is not None and self.peek()[0] == '(':
                if name not in ('abs', 'min', 'max'):
                    raise ValueError(f"Unknown function: {name}")
                self.advance()
                args = self.parse_args()
                self.expect(')')
                return self._call_function(name, args)
            else:
                if name in ('abs', 'min', 'max'):
                    raise ValueError(f"Syntax error: {name} must be followed by '('")
                if name not in self.variables:
                    raise NameError(f"Unknown variable: {name}")
                return Fraction(self.variables[name])

        if token[0] == '(':
            self.advance()
            result = self.parse_expression()
            self.expect(')')
            return result

        raise ValueError(f"Unexpected token: {token[0]}")

    def parse_args(self) -> list:
        args = []
        if self.peek() is not None and self.peek()[0] == ')':
            return args
        args.append(self.parse_expression())
        while self.peek() is not None and self.peek()[0] == ',':
            self.advance()
            args.append(self.parse_expression())
        return args

    def _call_function(self, name: str, args: list) -> Fraction:
        if name == 'abs':
            if len(args) != 1:
                raise ValueError("abs takes exactly 1 argument")
            return abs(args[0])
        elif name == 'min':
            if len(args) < 1:
                raise ValueError("min takes at least 1 argument")
            return min(args)
        elif name == 'max':
            if len(args) < 1:
                raise ValueError("max takes at least 1 argument")
            return max(args)
        raise ValueError(f"Unknown function: {name}")
